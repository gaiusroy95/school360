import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai';

export type GeneratedQuestion = {
  type: string;
  difficulty: string;
  questionText: string;
  options: string[];
  correctAnswer: string;
};

export function getGeminiApiKey(): string {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    throw new Error(
      'GEMINI_API_KEY is not configured on the server. Add it to backend/.env and restart the API.',
    );
  }
  return key;
}

function geminiModelCandidates(): string[] {
  const preferred = process.env.GEMINI_MODEL?.trim();
  const defaults = ['gemini-2.0-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-flash'];
  return [...new Set([preferred, ...defaults].filter(Boolean))] as string[];
}

function isRetryableModelError(message: string): boolean {
  const msg = message.toLowerCase();
  return (
    msg.includes('not found') ||
    msg.includes('404') ||
    msg.includes('is not supported') ||
    msg.includes('model') && msg.includes('invalid')
  );
}

function formatGeminiError(err: unknown): Error {
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes('API key not valid') || message.includes('API_KEY_INVALID')) {
    return new Error(
      'GEMINI_API_KEY is invalid. Add a valid Google AI API key to backend/.env and restart the server.',
    );
  }
  if (message.includes('API key') && message.includes('missing')) {
    return new Error(
      'GEMINI_API_KEY is not configured on the server. Add it to backend/.env and restart the API.',
    );
  }
  return err instanceof Error ? err : new Error(message);
}

export async function runGeminiJsonRequest(
  temperature: number,
  request: (model: GenerativeModel) => Promise<string>,
): Promise<string> {
  const genAI = new GoogleGenerativeAI(getGeminiApiKey());
  let lastError: Error | null = null;

  for (const modelName of geminiModelCandidates()) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature,
          responseMimeType: 'application/json',
        },
      });
      const responseText = await request(model);
      if (!responseText.trim()) throw new Error('AI returned an empty response');
      return responseText;
    } catch (err) {
      lastError = formatGeminiError(err);
      if (isRetryableModelError(lastError.message)) continue;
      throw lastError;
    }
  }

  throw lastError || new Error('No compatible Gemini model available. Check GEMINI_MODEL in backend/.env');
}

export function parseJsonFromModel(text: string): unknown {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fence ? fence[1].trim() : trimmed;
  return JSON.parse(raw);
}

export async function generateQuestionsFromText(params: {
  sourceText: string;
  numQuestions: number;
  questionType: string;
  difficulty: string;
  title?: string;
}): Promise<GeneratedQuestion[]> {
  const { sourceText, numQuestions, questionType, difficulty, title } = params;

  const prompt = `You are an expert school admission test question writer.

Read the following study material extracted from textbook PDFs. Create exactly ${numQuestions} questions based STRICTLY on this material. Do not invent facts not present in the text.

Test title hint: ${title || 'Admission Test'}
Question type for ALL questions: ${questionType}
Difficulty level for ALL questions: ${difficulty}

Rules:
- For "Multiple Choice": provide exactly 4 options as strings, one correctAnswer matching one option exactly.
- For "True/False": options must be ["True", "False"], correctAnswer is "True" or "False".
- For "Short Answer": options must be an empty array [], correctAnswer is a concise model answer.
- questionText must be clear and grammatically correct.
- Vary topics across the uploaded chapters.

Return JSON only in this shape:
{
  "questions": [
    {
      "type": "${questionType}",
      "difficulty": "${difficulty}",
      "questionText": "...",
      "options": ["..."],
      "correctAnswer": "..."
    }
  ]
}

SOURCE MATERIAL:
${sourceText}`;

  const responseText = await runGeminiJsonRequest(0.4, async (model) => {
    const result = await model.generateContent(prompt);
    return result.response.text();
  });

  let parsed: { questions?: GeneratedQuestion[] };
  try {
    parsed = parseJsonFromModel(responseText) as { questions?: GeneratedQuestion[] };
  } catch {
    throw new Error('AI returned invalid JSON. Please try again.');
  }

  const questions = (parsed.questions || []).filter((q) => q.questionText?.trim());
  if (questions.length === 0) {
    throw new Error('AI did not generate any questions. Try fewer questions or a different PDF.');
  }

  return questions.slice(0, numQuestions).map((q) => ({
    type: questionType,
    difficulty: difficulty,
    questionText: String(q.questionText).trim(),
    options: Array.isArray(q.options) ? q.options.map(String) : [],
    correctAnswer: String(q.correctAnswer || '').trim(),
  }));
}
