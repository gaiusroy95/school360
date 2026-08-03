import {
  formatGeminiError,
  generateQuestionsFromText as generateQuestionsGemini,
  getGeminiApiKey,
  parseJsonFromModel,
  runGeminiJsonRequest,
  type GeneratedQuestion,
} from './geminiQuestions.js';

export type { GeneratedQuestion };

const QUESTION_PROMPT = (params: {
  sourceText: string;
  numQuestions: number;
  questionType: string;
  difficulty: string;
  title?: string;
}) => `You are an expert school examination question paper writer.

Read the following study material. Create exactly ${params.numQuestions} questions based STRICTLY on this material. Do not invent facts not present in the text.

Test title hint: ${params.title || 'Question Paper'}
Question type for ALL questions: ${params.questionType}
Difficulty level for ALL questions: ${params.difficulty}

Rules:
- For "Multiple Choice": provide exactly 4 options as strings, one correctAnswer matching one option exactly.
- For "True/False": options must be ["True", "False"], correctAnswer is "True" or "False".
- For "Short Answer": options must be an empty array [], correctAnswer is a concise model answer.
- questionText must be clear and grammatically correct.
- Vary topics across the material.

Return JSON only in this shape:
{
  "questions": [
    {
      "type": "${params.questionType}",
      "difficulty": "${params.difficulty}",
      "questionText": "...",
      "options": ["..."],
      "correctAnswer": "..."
    }
  ]
}

SOURCE MATERIAL:
${params.sourceText}`;

function normalizeQuestions(
  items: GeneratedQuestion[],
  questionType: string,
  difficulty: string,
  numQuestions: number,
): GeneratedQuestion[] {
  const questions = (items || [])
    .filter((q) => q.questionText?.trim())
    .map((q) => ({
      type: questionType,
      difficulty,
      questionText: String(q.questionText).trim(),
      options: Array.isArray(q.options) ? q.options.map(String) : [],
      correctAnswer: String(q.correctAnswer || '').trim(),
    }));
  if (!questions.length) {
    throw new Error('AI did not generate any questions. Try fewer questions or different source material.');
  }
  return questions.slice(0, numQuestions);
}

function hasGemini() {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

function hasOpenAI() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

function hasGroq() {
  return Boolean(process.env.GROQ_API_KEY?.trim());
}

async function generateWithOpenAI(params: {
  sourceText: string;
  numQuestions: number;
  questionType: string;
  difficulty: string;
  title?: string;
}): Promise<GeneratedQuestion[]> {
  const key = process.env.OPENAI_API_KEY!.trim();
  const model = process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini';
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You generate school exam questions. Reply with valid JSON only.' },
        { role: 'user', content: QUESTION_PROMPT(params) },
      ],
    }),
  });
  const data = await res.json().catch(() => ({})) as {
    error?: { message?: string };
    choices?: { message?: { content?: string } }[];
  };
  if (!res.ok) {
    throw new Error(data.error?.message || `OpenAI request failed (${res.status})`);
  }
  const text = data.choices?.[0]?.message?.content || '';
  const parsed = parseJsonFromModel(text) as { questions?: GeneratedQuestion[] };
  return normalizeQuestions(parsed.questions || [], params.questionType, params.difficulty, params.numQuestions);
}

async function generateWithGroq(params: {
  sourceText: string;
  numQuestions: number;
  questionType: string;
  difficulty: string;
  title?: string;
}): Promise<GeneratedQuestion[]> {
  const key = process.env.GROQ_API_KEY!.trim();
  const model = process.env.GROQ_MODEL?.trim() || 'llama-3.3-70b-versatile';
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You generate school exam questions. Reply with valid JSON only.' },
        { role: 'user', content: QUESTION_PROMPT(params) },
      ],
    }),
  });
  const data = await res.json().catch(() => ({})) as {
    error?: { message?: string };
    choices?: { message?: { content?: string } }[];
  };
  if (!res.ok) {
    throw new Error(data.error?.message || `Groq request failed (${res.status})`);
  }
  const text = data.choices?.[0]?.message?.content || '';
  const parsed = parseJsonFromModel(text) as { questions?: GeneratedQuestion[] };
  return normalizeQuestions(parsed.questions || [], params.questionType, params.difficulty, params.numQuestions);
}

/**
 * Free-tier priority: Gemini → OpenAI (gpt-4o-mini) → Groq (Llama).
 * Used by AI-from-PDF and From-Syllabus paper creation.
 */
export async function generateQuestionsFromText(params: {
  sourceText: string;
  numQuestions: number;
  questionType: string;
  difficulty: string;
  title?: string;
}): Promise<GeneratedQuestion[]> {
  const errors: string[] = [];

  if (hasGemini()) {
    try {
      return await generateQuestionsGemini(params);
    } catch (err) {
      errors.push(`Gemini: ${err instanceof Error ? err.message : String(err)}`);
    }
  } else {
    errors.push('Gemini: GEMINI_API_KEY not configured');
  }

  if (hasOpenAI()) {
    try {
      return await generateWithOpenAI(params);
    } catch (err) {
      errors.push(`OpenAI: ${err instanceof Error ? err.message : String(err)}`);
    }
  } else {
    errors.push('OpenAI: OPENAI_API_KEY not configured');
  }

  if (hasGroq()) {
    try {
      return await generateWithGroq(params);
    } catch (err) {
      errors.push(`Groq: ${err instanceof Error ? err.message : String(err)}`);
    }
  } else {
    errors.push('Groq: GROQ_API_KEY not configured');
  }

  throw new Error(
    `All free AI providers failed for question generation.\n${errors.join('\n')}\nConfigure GEMINI_API_KEY (preferred), OPENAI_API_KEY, or GROQ_API_KEY in backend/.env.`,
  );
}

export async function generateQuestionsFromVision(params: {
  mimeType: string;
  base64Data: string;
  numQuestions: number;
  questionType: string;
  difficulty: string;
  title?: string;
}): Promise<GeneratedQuestion[]> {
  const prompt = `You are an expert school examination question paper writer.

Read the uploaded PDF/image study material carefully. Create exactly ${params.numQuestions} questions based STRICTLY on the visible content.

Title hint: ${params.title || 'Question Paper'}
Question type for ALL questions: ${params.questionType}
Difficulty: ${params.difficulty}

Rules:
- Multiple Choice: 4 options, correctAnswer matches one option
- True/False: options ["True","False"]
- Short Answer: options []

Return JSON only:
{ "questions": [ { "type": "...", "difficulty": "...", "questionText": "...", "options": [], "correctAnswer": "..." } ] }`;

  const errors: string[] = [];
  const raw = params.base64Data.includes(',') ? params.base64Data.split(',')[1] : params.base64Data;

  if (hasGemini()) {
    try {
      getGeminiApiKey();
      const responseText = await runGeminiJsonRequest(0.3, async (model) => {
        const result = await model.generateContent([
          { inlineData: { mimeType: params.mimeType, data: raw } },
          { text: prompt },
        ]);
        return result.response.text();
      });
      const parsed = parseJsonFromModel(responseText) as { questions?: GeneratedQuestion[] };
      return normalizeQuestions(parsed.questions || [], params.questionType, params.difficulty, params.numQuestions);
    } catch (err) {
      errors.push(`Gemini vision: ${formatGeminiError(err).message}`);
    }
  }

  if (hasOpenAI()) {
    try {
      const key = process.env.OPENAI_API_KEY!.trim();
      const model = process.env.OPENAI_VISION_MODEL?.trim() || process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini';
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          temperature: 0.3,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: `data:${params.mimeType};base64,${raw}` } },
              ],
            },
          ],
        }),
      });
      const data = await res.json().catch(() => ({})) as {
        error?: { message?: string };
        choices?: { message?: { content?: string } }[];
      };
      if (!res.ok) throw new Error(data.error?.message || `OpenAI vision failed (${res.status})`);
      const parsed = parseJsonFromModel(data.choices?.[0]?.message?.content || '') as { questions?: GeneratedQuestion[] };
      return normalizeQuestions(parsed.questions || [], params.questionType, params.difficulty, params.numQuestions);
    } catch (err) {
      errors.push(`OpenAI vision: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  throw new Error(
    `Could not generate questions from document vision.\n${errors.join('\n') || 'No vision-capable free AI key configured (Gemini or OpenAI).'}`,
  );
}

export function listConfiguredAiProviders() {
  return {
    gemini: hasGemini(),
    openai: hasOpenAI(),
    groq: hasGroq(),
    priority: ['gemini', 'openai', 'groq'] as const,
  };
}
