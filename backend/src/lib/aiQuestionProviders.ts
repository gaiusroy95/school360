import {
  formatGeminiError,
  generateQuestionsFromText as generateQuestionsGemini,
  getGeminiApiKey,
  parseJsonFromModel,
  runGeminiJsonRequest,
  type GeneratedQuestion,
} from './geminiQuestions.js';
import {
  isAiProviderHealthy,
  listAiProviderStatus,
  listConfiguredAiProvidersSync,
  markAiProviderUnhealthy,
} from './aiProviderHealth.js';

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

function noteProviderFailure(id: 'gemini' | 'openai' | 'groq', err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  if (
    lower.includes('api key') ||
    lower.includes('invalid') ||
    lower.includes('unauthorized') ||
    lower.includes('401') ||
    lower.includes('authentication')
  ) {
    markAiProviderUnhealthy(id, msg);
  }
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

  if (await isAiProviderHealthy('gemini')) {
    try {
      return await generateQuestionsGemini(params);
    } catch (err) {
      noteProviderFailure('gemini', err);
      errors.push(`Gemini: ${err instanceof Error ? err.message : String(err)}`);
    }
  } else {
    errors.push('Gemini: unavailable or GEMINI_API_KEY invalid/missing');
  }

  if (await isAiProviderHealthy('openai')) {
    try {
      return await generateWithOpenAI(params);
    } catch (err) {
      noteProviderFailure('openai', err);
      errors.push(`OpenAI: ${err instanceof Error ? err.message : String(err)}`);
    }
  } else {
    errors.push('OpenAI: unavailable or OPENAI_API_KEY invalid/missing');
  }

  if (await isAiProviderHealthy('groq')) {
    try {
      return await generateWithGroq(params);
    } catch (err) {
      noteProviderFailure('groq', err);
      errors.push(`Groq: ${err instanceof Error ? err.message : String(err)}`);
    }
  } else {
    errors.push('Groq: unavailable or GROQ_API_KEY invalid/missing');
  }

  throw new Error(
    `All free AI providers failed for question generation.\n${errors.join('\n')}\nFix GEMINI_API_KEY (preferred), or ensure OPENAI_API_KEY / GROQ_API_KEY are valid in backend/.env, then restart the API.`,
  );
}

export async function generateQuestionsFromVision(params: {
  mimeType: string;
  base64Data: string;
  numQuestions: number;
  questionType: string;
  difficulty: string;
  title?: string;
  fileName?: string;
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
  const mime = (params.mimeType || 'application/octet-stream').toLowerCase();
  const isPdf = mime.includes('pdf') || (params.fileName || '').toLowerCase().endsWith('.pdf');

  if (await isAiProviderHealthy('gemini')) {
    try {
      getGeminiApiKey();
      const responseText = await runGeminiJsonRequest(0.3, async (model) => {
        const result = await model.generateContent([
          { inlineData: { mimeType: isPdf ? 'application/pdf' : mime, data: raw } },
          { text: prompt },
        ]);
        return result.response.text();
      });
      const parsed = parseJsonFromModel(responseText) as { questions?: GeneratedQuestion[] };
      return normalizeQuestions(parsed.questions || [], params.questionType, params.difficulty, params.numQuestions);
    } catch (err) {
      noteProviderFailure('gemini', err);
      errors.push(`Gemini vision: ${formatGeminiError(err).message}`);
    }
  }

  if (await isAiProviderHealthy('openai')) {
    try {
      const key = process.env.OPENAI_API_KEY!.trim();
      const model = process.env.OPENAI_VISION_MODEL?.trim() || process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini';
      const userContent: Array<Record<string, unknown>> = [{ type: 'text', text: prompt }];
      if (isPdf) {
        userContent.push({
          type: 'file',
          file: {
            filename: params.fileName || 'material.pdf',
            file_data: `data:application/pdf;base64,${raw}`,
          },
        });
      } else {
        userContent.push({
          type: 'image_url',
          image_url: { url: `data:${mime};base64,${raw}` },
        });
      }
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
          messages: [{ role: 'user', content: userContent }],
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
      noteProviderFailure('openai', err);
      errors.push(`OpenAI vision: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  throw new Error(
    `Could not generate questions from document vision.\n${errors.join('\n') || 'No vision-capable AI key healthy (Gemini or OpenAI).'}\nTip: upload JPG/PNG scans, or fix GEMINI_API_KEY for PDF vision.`,
  );
}

export async function listConfiguredAiProviders() {
  try {
    return await listAiProviderStatus(false);
  } catch {
    return listConfiguredAiProvidersSync();
  }
}
