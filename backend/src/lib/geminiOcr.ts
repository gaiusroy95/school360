import { GoogleGenerativeAI } from '@google/generative-ai';
import { extractTextFromPdfBase64 } from './pdfText.js';
import {
  getGeminiApiKey,
  parseJsonFromModel,
  runGeminiJsonRequest,
  type GeneratedQuestion,
} from './geminiQuestions.js';
import { isAiProviderHealthy, markAiProviderUnhealthy } from './aiProviderHealth.js';

const IMAGE_MIMES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']);

function normalizeMime(mime: string, fileName: string): string {
  const m = (mime || '').toLowerCase();
  if (m) return m;
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.pdf')) return 'application/pdf';
  return 'application/octet-stream';
}

function isImageMime(mime: string) {
  return IMAGE_MIMES.has(mime.toLowerCase()) || mime.startsWith('image/');
}

function normalizeQuestions(
  items: GeneratedQuestion[],
  questionType: string,
  difficulty: string,
): GeneratedQuestion[] {
  return items
    .filter((q) => q.questionText?.trim())
    .map((q) => ({
      type: questionType,
      difficulty,
      questionText: String(q.questionText).trim(),
      options: Array.isArray(q.options) ? q.options.map(String) : [],
      correctAnswer: String(q.correctAnswer || '').trim(),
    }));
}

const OCR_JSON_PROMPT = (questionType: string, difficulty: string) => `
You are an expert OCR and test-paper digitization specialist.

Carefully read the uploaded scanned test paper (image or PDF). Extract EVERY question exactly as written on the paper.
Do not invent new questions. Fix only obvious OCR spacing issues in questionText.

Default question type: ${questionType}
Default difficulty: ${difficulty}

For each question detected:
- "Multiple Choice": include all options visible (a,b,c,d or 1,2,3,4) in options array; set correctAnswer if marked on paper, else best guess or empty string.
- "True/False": options ["True", "False"]
- "Short Answer": options [] and correctAnswer if an answer key is visible, else empty string

Return JSON only:
{
  "title": "suggested test title from paper header if visible",
  "rawText": "full plain text transcription of the paper",
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
`;

function formatGeminiError(err: unknown): Error {
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes('API key not valid') || message.includes('API_KEY_INVALID')) {
    markAiProviderUnhealthy('gemini', message);
    return new Error(
      'GEMINI_API_KEY is invalid. Add a valid Google AI API key to backend/.env and restart the server.',
    );
  }
  return err instanceof Error ? err : new Error(message);
}

async function runGeminiVisionJsonRequest(
  mimeType: string,
  base64Data: string,
  prompt: string,
): Promise<string> {
  if (!(await isAiProviderHealthy('gemini'))) {
    throw new Error('Gemini unavailable or GEMINI_API_KEY invalid/missing');
  }
  const genAI = new GoogleGenerativeAI(getGeminiApiKey());
  const preferred = process.env.GEMINI_MODEL?.trim();
  const models = [...new Set([
    preferred,
    'gemini-2.0-flash',
    'gemini-2.5-flash',
    'gemini-2.0-flash-lite',
    'gemini-flash-latest',
    'gemini-1.5-flash-latest',
    'gemini-1.5-flash',
  ].filter((m): m is string => Boolean(m)))];
  let lastError: Error | null = null;

  for (const modelName of models) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      });
      const result = await model.generateContent([
        { inlineData: { mimeType, data: base64Data } },
        { text: prompt },
      ]);
      const text = result.response.text();
      if (!text?.trim()) throw new Error('OCR returned an empty response');
      return text;
    } catch (err) {
      lastError = formatGeminiError(err);
      const msg = lastError.message.toLowerCase();
      if (msg.includes('api key') || msg.includes('invalid')) throw lastError;
      if (msg.includes('not found') || msg.includes('404') || msg.includes('is not supported')) continue;
      throw lastError;
    }
  }

  throw lastError || new Error('No compatible Gemini vision model available');
}

async function ocrWithOpenAIVision(
  mimeType: string,
  base64Data: string,
  questionType: string,
  difficulty: string,
  fileName = 'scan.pdf',
): Promise<{ title: string; rawText: string; questions: GeneratedQuestion[] }> {
  if (!(await isAiProviderHealthy('openai'))) {
    throw new Error('OPENAI_API_KEY not configured or unhealthy');
  }
  const key = process.env.OPENAI_API_KEY!.trim();
  const model = process.env.OPENAI_VISION_MODEL?.trim() || process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini';
  const raw = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
  const isPdf = mimeType.toLowerCase().includes('pdf') || fileName.toLowerCase().endsWith('.pdf');
  const userContent: Array<Record<string, unknown>> = [
    { type: 'text', text: OCR_JSON_PROMPT(questionType, difficulty) },
  ];
  if (isPdf) {
    userContent.push({
      type: 'file',
      file: {
        filename: fileName.endsWith('.pdf') ? fileName : 'scan.pdf',
        file_data: `data:application/pdf;base64,${raw}`,
      },
    });
  } else {
    userContent.push({
      type: 'image_url',
      image_url: { url: `data:${mimeType};base64,${raw}` },
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
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: userContent }],
    }),
  });
  const data = await res.json().catch(() => ({})) as {
    error?: { message?: string };
    choices?: { message?: { content?: string } }[];
  };
  if (!res.ok) {
    const msg = data.error?.message || `OpenAI OCR failed (${res.status})`;
    if (/api key|invalid|unauthorized|401/i.test(msg)) markAiProviderUnhealthy('openai', msg);
    throw new Error(msg);
  }
  const parsed = parseJsonFromModel(data.choices?.[0]?.message?.content || '') as {
    title?: string;
    rawText?: string;
    questions?: GeneratedQuestion[];
  };
  const questions = normalizeQuestions(parsed.questions || [], questionType, difficulty);
  if (!questions.length) throw new Error('No questions extracted via OpenAI vision');
  return {
    title: String(parsed.title || '').trim(),
    rawText: String(parsed.rawText || '').trim(),
    questions,
  };
}

async function ocrWithVision(
  mimeType: string,
  base64Data: string,
  questionType: string,
  difficulty: string,
  fileName = 'scan.pdf',
): Promise<{ title: string; rawText: string; questions: GeneratedQuestion[] }> {
  const errors: string[] = [];
  try {
    const responseText = await runGeminiVisionJsonRequest(
      mimeType,
      base64Data,
      OCR_JSON_PROMPT(questionType, difficulty),
    );
    let parsed: {
      title?: string;
      rawText?: string;
      questions?: GeneratedQuestion[];
    };
    try {
      parsed = parseJsonFromModel(responseText) as typeof parsed;
    } catch {
      throw new Error('OCR returned invalid JSON. Try a clearer scan or photo.');
    }
    const questions = normalizeQuestions(parsed.questions || [], questionType, difficulty);
    if (questions.length === 0) {
      throw new Error('No questions could be extracted. Ensure the scan is clear and text is readable.');
    }
    return {
      title: String(parsed.title || '').trim(),
      rawText: String(parsed.rawText || '').trim(),
      questions,
    };
  } catch (err) {
    errors.push(`Gemini: ${err instanceof Error ? err.message : String(err)}`);
  }

  try {
    return await ocrWithOpenAIVision(mimeType, base64Data, questionType, difficulty, fileName);
  } catch (err) {
    errors.push(`OpenAI: ${err instanceof Error ? err.message : String(err)}`);
  }

  throw new Error(
    `OCR failed with free AI providers.\n${errors.join('\n')}\nTip: upload a clear JPG/PNG of the paper, or set a valid GEMINI_API_KEY for PDF OCR.`,
  );
}

async function ocrFromPlainText(
  text: string,
  questionType: string,
  difficulty: string,
): Promise<{ title: string; rawText: string; questions: GeneratedQuestion[] }> {
  const prompt = `${OCR_JSON_PROMPT(questionType, difficulty)}\n\nEXTRACTED TEXT FROM PDF:\n${text.slice(0, 100_000)}`;
  const errors: string[] = [];

  if (await isAiProviderHealthy('gemini')) {
    try {
      const responseText = await runGeminiJsonRequest(0.1, async (model) => {
        const result = await model.generateContent(prompt);
        return result.response.text();
      });
      const parsed = parseJsonFromModel(responseText) as {
        title?: string;
        rawText?: string;
        questions?: GeneratedQuestion[];
      };
      const questions = normalizeQuestions(parsed.questions || [], questionType, difficulty);
      if (questions.length === 0) throw new Error('No questions could be extracted from PDF text.');
      return {
        title: String(parsed.title || '').trim(),
        rawText: String(parsed.rawText || text).trim(),
        questions,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/api key|invalid/i.test(msg)) markAiProviderUnhealthy('gemini', msg);
      errors.push(`Gemini: ${msg}`);
    }
  } else {
    errors.push('Gemini: unavailable or GEMINI_API_KEY invalid/missing');
  }

  if (await isAiProviderHealthy('openai')) {
    try {
      const openAiKey = process.env.OPENAI_API_KEY!.trim();
      const model = process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini';
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openAiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          temperature: 0.1,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: 'Extract exam questions from text. Reply with valid JSON only.' },
            { role: 'user', content: prompt },
          ],
        }),
      });
      const data = await res.json().catch(() => ({})) as {
        error?: { message?: string };
        choices?: { message?: { content?: string } }[];
      };
      if (!res.ok) throw new Error(data.error?.message || `OpenAI failed (${res.status})`);
      const parsed = parseJsonFromModel(data.choices?.[0]?.message?.content || '') as {
        title?: string;
        rawText?: string;
        questions?: GeneratedQuestion[];
      };
      const questions = normalizeQuestions(parsed.questions || [], questionType, difficulty);
      if (!questions.length) throw new Error('No questions extracted');
      return {
        title: String(parsed.title || '').trim(),
        rawText: String(parsed.rawText || text).trim(),
        questions,
      };
    } catch (err) {
      errors.push(`OpenAI: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  throw new Error(`OCR text parsing failed.\n${errors.join('\n')}`);
}

export type OcrFileInput = {
  fileName: string;
  mimeType?: string;
  fileData: string;
};

export type OcrScanResult = {
  suggestedTitle: string;
  rawOcrText: string;
  questions: GeneratedQuestion[];
  previewFiles: { fileName: string; mimeType: string; dataUrl: string }[];
  fileMeta: { fileName: string; mimeType: string; kind: 'image' | 'pdf' }[];
};

export async function scanTestPaperWithOcr(
  files: OcrFileInput[],
  questionType: string,
  difficulty: string,
  titleHint?: string,
): Promise<OcrScanResult> {
  const previewFiles: OcrScanResult['previewFiles'] = [];
  const fileMeta: OcrScanResult['fileMeta'] = [];
  const allQuestions: GeneratedQuestion[] = [];
  let combinedRaw = '';
  let detectedTitle = titleHint?.trim() || '';

  for (const file of files) {
    const raw = file.fileData.includes(',') ? file.fileData.split(',')[1] : file.fileData;
    const mimeType = normalizeMime(file.mimeType || '', file.fileName);
    previewFiles.push({
      fileName: file.fileName,
      mimeType,
      dataUrl: `data:${mimeType};base64,${raw}`,
    });

    if (mimeType.includes('pdf')) {
      fileMeta.push({ fileName: file.fileName, mimeType, kind: 'pdf' });
      let usedTextLayer = false;
      try {
        const { text } = await extractTextFromPdfBase64(raw);
        if (text.length > 40) {
          usedTextLayer = true;
          const res = await ocrFromPlainText(text, questionType, difficulty);
          if (!detectedTitle && res.title) detectedTitle = res.title;
          combinedRaw += (combinedRaw ? '\n\n' : '') + res.rawText;
          allQuestions.push(...res.questions);
        }
      } catch {
        /* fall through to vision OCR */
      }
      if (!usedTextLayer) {
        const res = await ocrWithVision(mimeType, raw, questionType, difficulty, file.fileName);
        if (!detectedTitle && res.title) detectedTitle = res.title;
        combinedRaw += (combinedRaw ? '\n\n' : '') + res.rawText;
        allQuestions.push(...res.questions);
      }
    } else if (isImageMime(mimeType)) {
      fileMeta.push({ fileName: file.fileName, mimeType, kind: 'image' });
      const res = await ocrWithVision(mimeType, raw, questionType, difficulty, file.fileName);
      if (!detectedTitle && res.title) detectedTitle = res.title;
      combinedRaw += (combinedRaw ? '\n\n' : '') + res.rawText;
      allQuestions.push(...res.questions);
    } else {
      throw new Error(`Unsupported file type: ${file.fileName}. Use JPG, PNG, or PDF.`);
    }
  }

  const questions = allQuestions.map((q, i) => ({ ...q, questionText: q.questionText || `Question ${i + 1}` }));

  const suggestedTitle =
    detectedTitle ||
    `Scanned Test — ${files.map((f) => f.fileName.replace(/\.[^.]+$/, '')).join(', ')}`.slice(0, 120);

  return {
    suggestedTitle,
    rawOcrText: combinedRaw,
    questions,
    previewFiles,
    fileMeta,
  };
}
