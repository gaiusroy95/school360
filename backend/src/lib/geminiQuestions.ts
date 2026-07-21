import { GoogleGenerativeAI } from '@google/generative-ai';

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
  const genAI = new GoogleGenerativeAI(getGeminiApiKey());
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    generationConfig: {
      temperature: 0.4,
      responseMimeType: 'application/json',
    },
  });

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

  const result = await model.generateContent(prompt);
  const responseText = result.response.text();
  if (!responseText) throw new Error('AI returned an empty response');

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
