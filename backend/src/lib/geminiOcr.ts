import { GoogleGenerativeAI } from '@google/generative-ai';
import { extractTextFromPdfBase64 } from './pdfText.js';
import {
  getGeminiApiKey,
  parseJsonFromModel,
  type GeneratedQuestion,
} from './geminiQuestions.js';

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

async function ocrWithVision(
  mimeType: string,
  base64Data: string,
  questionType: string,
  difficulty: string,
): Promise<{ title: string; rawText: string; questions: GeneratedQuestion[] }> {
  const genAI = new GoogleGenerativeAI(getGeminiApiKey());
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json',
    },
  });

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType,
        data: base64Data,
      },
    },
    { text: OCR_JSON_PROMPT(questionType, difficulty) },
  ]);

  const responseText = result.response.text();
  if (!responseText) throw new Error('OCR returned an empty response');

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
}

async function ocrFromPlainText(
  text: string,
  questionType: string,
  difficulty: string,
): Promise<{ title: string; rawText: string; questions: GeneratedQuestion[] }> {
  const genAI = new GoogleGenerativeAI(getGeminiApiKey());
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json',
    },
  });

  const result = await model.generateContent(
    `${OCR_JSON_PROMPT(questionType, difficulty)}\n\nEXTRACTED TEXT FROM PDF:\n${text.slice(0, 100_000)}`,
  );
  const responseText = result.response.text();
  if (!responseText) throw new Error('OCR returned an empty response');

  const parsed = parseJsonFromModel(responseText) as {
    title?: string;
    rawText?: string;
    questions?: GeneratedQuestion[];
  };
  const questions = normalizeQuestions(parsed.questions || [], questionType, difficulty);
  if (questions.length === 0) {
    throw new Error('No questions could be extracted from PDF text.');
  }

  return {
    title: String(parsed.title || '').trim(),
    rawText: String(parsed.rawText || text).trim(),
    questions,
  };
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
        if (text.length > 80) {
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
        const res = await ocrWithVision(mimeType, raw, questionType, difficulty);
        if (!detectedTitle && res.title) detectedTitle = res.title;
        combinedRaw += (combinedRaw ? '\n\n' : '') + res.rawText;
        allQuestions.push(...res.questions);
      }
    } else if (isImageMime(mimeType)) {
      fileMeta.push({ fileName: file.fileName, mimeType, kind: 'image' });
      const res = await ocrWithVision(mimeType, raw, questionType, difficulty);
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
