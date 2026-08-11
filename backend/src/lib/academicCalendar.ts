import type {
  AcademicCalendarEvent,
  AcademicBoardCalendarUpload,
  AcademicEventType,
} from '@prisma/client';
import { prisma } from './prisma.js';
import { extractTextFromPdfBase64 } from './pdfText.js';
import {
  formatGeminiError,
  parseJsonFromModel,
  runGeminiJsonRequest,
  runGeminiVisionJsonRequest,
} from './geminiQuestions.js';
import { isAiProviderHealthy, markAiProviderUnhealthy } from './aiProviderHealth.js';
import { nextAcademicRecordId, EVENT_TYPE_UI } from './academicManagement.js';

export const BOARD_OPTIONS = ['CBSE', 'ICSE', 'State Board', 'IB', 'Cambridge', 'NIOS', 'Other'] as const;

export type OcrCalendarEvent = {
  title: string;
  eventDate: string;
  endDate?: string | null;
  eventType: AcademicEventType;
  description?: string;
};

type CalendarOcrResult = { rawText: string; events: OcrCalendarEvent[]; documentSummary?: string };

const CALENDAR_OCR_PROMPT = (boardName: string, academicYear: string) => {
  const { start, end } = academicYearParts(academicYear);
  return `
You are an expert at reading Indian school board academic calendars AND government education circulars / notifications.

Document context: ${boardName} · Academic year ${academicYear} (approx ${start}-04-01 to ${end}-03-31).

Your job:
1. OCR / read the full document (calendar table, circular text, schedules, annexures).
2. Propose concrete academic calendar EVENTS with dates so the school can import them.

Extract ALL dated items, including:
- Holidays, vacations, festivals
- Exam / assessment windows (unit tests, mid-term, board exams, practicals)
- PTM / parent meeting dates
- Term / session start & end
- Admission / registration schedules mentioned
- Teacher training / workshop days
- Result declaration dates
- Any dated directions in a govt circular that affect the school calendar

Rules for dates:
- eventDate / endDate must be ISO YYYY-MM-DD
- If only day+month given, pick the correct year within ${academicYear} (Apr–Dec → ${start}, Jan–Mar → ${end})
- Multi-day ranges → set endDate
- Skip undated generic instructions

eventType must be one of: HOLIDAY, EXAM, PTM, ACTIVITY, OTHER

Return JSON only:
{
  "boardName": "${boardName}",
  "academicYear": "${academicYear}",
  "documentSummary": "1-2 sentence summary of the circular/calendar",
  "rawText": "key transcribed text (abbreviated if long)",
  "events": [
    { "title": "...", "eventDate": "${start}-04-01", "endDate": null, "eventType": "HOLIDAY", "description": "" }
  ]
}
`;
};

function academicYearParts(academicYear: string) {
  const start = Number(academicYear.split('-')[0]) || new Date().getFullYear();
  const endShort = academicYear.split('-')[1];
  const end = endShort ? Number(`${String(start).slice(0, 2)}${endShort}`) : start + 1;
  return { start, end: Number.isFinite(end) ? end : start + 1 };
}

function coerceIsoDate(raw: string, academicYear: string): string | null {
  const s = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s.slice(0, 10));
    return Number.isNaN(d.getTime()) ? null : s.slice(0, 10);
  }

  const { start, end } = academicYearParts(academicYear);
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) {
    let y = parsed.getFullYear();
    const m = parsed.getMonth(); // 0-based
    if (y < start - 1 || y > end + 1) {
      y = m >= 3 ? start : end; // Apr–Dec → start year, Jan–Mar → end year
    }
    const mm = String(parsed.getMonth() + 1).padStart(2, '0');
    const dd = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  }

  const dmY = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (dmY) {
    let y = Number(dmY[3].length === 2 ? `20${dmY[3]}` : dmY[3]);
    const day = Number(dmY[1]);
    const month = Number(dmY[2]);
    if (y < start - 1 || y > end + 1) y = month >= 4 ? start : end;
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  return null;
}

function normalizeEventType(val: unknown): AcademicEventType {
  const s = String(val || 'OTHER').toUpperCase();
  if (['HOLIDAY', 'EXAM', 'PTM', 'ACTIVITY', 'OTHER'].includes(s)) return s as AcademicEventType;
  if (s.includes('HOLIDAY') || s.includes('VACATION') || s.includes('FESTIVAL')) return 'HOLIDAY';
  if (s.includes('EXAM') || s.includes('TEST') || s.includes('ASSESSMENT') || s.includes('RESULT')) return 'EXAM';
  if (s.includes('PTM') || s.includes('PARENT')) return 'PTM';
  if (s.includes('ACTIVITY') || s.includes('SPORTS') || s.includes('EVENT') || s.includes('TRAINING')) return 'ACTIVITY';
  return 'OTHER';
}

function normalizeOcrEvents(items: unknown[], academicYear: string): OcrCalendarEvent[] {
  const out: OcrCalendarEvent[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const title = String(o.title || o.eventName || o.name || '').trim();
    const eventDate = coerceIsoDate(String(o.eventDate || o.date || o.startDate || ''), academicYear);
    if (!title || !eventDate) continue;
    const endRaw = o.endDate || o.toDate || o.end;
    const endDate = endRaw ? coerceIsoDate(String(endRaw), academicYear) : null;
    const key = `${eventDate}|${title.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      title,
      eventDate,
      endDate,
      eventType: normalizeEventType(o.eventType || o.type || o.category),
      description: String(o.description || o.note || o.remarks || '').trim(),
    });
  }
  return out.sort((a, b) => a.eventDate.localeCompare(b.eventDate));
}

function parseCalendarOcrResponse(text: string, academicYear: string, fallbackRaw = ''): CalendarOcrResult {
  const parsed = parseJsonFromModel(text) as {
    rawText?: string;
    events?: unknown[];
    documentSummary?: string;
  };
  const events = normalizeOcrEvents(parsed.events || [], academicYear);
  if (events.length === 0) {
    throw new Error('No dated calendar events could be proposed from this document. Try a clearer PDF/circular.');
  }
  return {
    rawText: String(parsed.rawText || parsed.documentSummary || fallbackRaw || '').trim(),
    events,
    documentSummary: parsed.documentSummary ? String(parsed.documentSummary) : undefined,
  };
}

function noteProviderFailure(id: 'gemini' | 'openai' | 'groq', err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  if (/api key|invalid|unauthorized|401|authentication/i.test(msg)) {
    markAiProviderUnhealthy(id, msg);
  }
}

async function ocrCalendarWithOpenAIText(
  sourceText: string,
  boardName: string,
  academicYear: string,
): Promise<CalendarOcrResult> {
  if (!(await isAiProviderHealthy('openai'))) {
    throw new Error('OPENAI_API_KEY not configured or unhealthy');
  }
  const key = process.env.OPENAI_API_KEY!.trim();
  const model = process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini';
  const prompt = `${CALENDAR_OCR_PROMPT(boardName, academicYear)}\n\nEXTRACTED DOCUMENT TEXT:\n${sourceText.slice(0, 120_000)}`;
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
      messages: [
        { role: 'system', content: 'Extract dated academic calendar events. Reply with valid JSON only.' },
        { role: 'user', content: prompt },
      ],
    }),
  });
  const data = await res.json().catch(() => ({})) as {
    error?: { message?: string };
    choices?: { message?: { content?: string } }[];
  };
  if (!res.ok) {
    const msg = data.error?.message || `OpenAI failed (${res.status})`;
    noteProviderFailure('openai', msg);
    throw new Error(msg);
  }
  return parseCalendarOcrResponse(data.choices?.[0]?.message?.content || '', academicYear, sourceText);
}

async function ocrCalendarWithGroqText(
  sourceText: string,
  boardName: string,
  academicYear: string,
): Promise<CalendarOcrResult> {
  if (!(await isAiProviderHealthy('groq'))) {
    throw new Error('GROQ_API_KEY not configured or unhealthy');
  }
  const key = process.env.GROQ_API_KEY!.trim();
  const model = process.env.GROQ_MODEL?.trim() || 'llama-3.3-70b-versatile';
  const prompt = `${CALENDAR_OCR_PROMPT(boardName, academicYear)}\n\nEXTRACTED DOCUMENT TEXT:\n${sourceText.slice(0, 80_000)}`;
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'Extract dated academic calendar events. Reply with valid JSON only.' },
        { role: 'user', content: prompt },
      ],
    }),
  });
  const data = await res.json().catch(() => ({})) as {
    error?: { message?: string };
    choices?: { message?: { content?: string } }[];
  };
  if (!res.ok) {
    const msg = data.error?.message || `Groq failed (${res.status})`;
    noteProviderFailure('groq', msg);
    throw new Error(msg);
  }
  return parseCalendarOcrResponse(data.choices?.[0]?.message?.content || '', academicYear, sourceText);
}

async function ocrCalendarWithOpenAIVision(
  mimeType: string,
  base64Data: string,
  boardName: string,
  academicYear: string,
  fileName: string,
): Promise<CalendarOcrResult> {
  if (!(await isAiProviderHealthy('openai'))) {
    throw new Error('OPENAI_API_KEY not configured or unhealthy');
  }
  const key = process.env.OPENAI_API_KEY!.trim();
  const model = process.env.OPENAI_VISION_MODEL?.trim() || process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini';
  const raw = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
  const isPdf = mimeType.toLowerCase().includes('pdf') || fileName.toLowerCase().endsWith('.pdf');
  const userContent: Array<Record<string, unknown>> = [
    { type: 'text', text: CALENDAR_OCR_PROMPT(boardName, academicYear) },
  ];
  if (isPdf) {
    userContent.push({
      type: 'file',
      file: {
        filename: fileName.endsWith('.pdf') ? fileName : 'calendar.pdf',
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
    const msg = data.error?.message || `OpenAI vision failed (${res.status})`;
    noteProviderFailure('openai', msg);
    throw new Error(msg);
  }
  return parseCalendarOcrResponse(data.choices?.[0]?.message?.content || '', academicYear);
}

async function ocrCalendarFromText(
  sourceText: string,
  boardName: string,
  academicYear: string,
): Promise<CalendarOcrResult> {
  const errors: string[] = [];
  const prompt = `${CALENDAR_OCR_PROMPT(boardName, academicYear)}\n\nEXTRACTED DOCUMENT TEXT:\n${sourceText.slice(0, 120_000)}`;

  if (await isAiProviderHealthy('gemini')) {
    try {
      const responseText = await runGeminiJsonRequest(0.1, async (model) => {
        const result = await model.generateContent(prompt);
        return result.response.text();
      });
      return parseCalendarOcrResponse(responseText, academicYear, sourceText);
    } catch (err) {
      const formatted = formatGeminiError(err);
      noteProviderFailure('gemini', formatted);
      errors.push(`Gemini: ${formatted.message}`);
    }
  } else {
    errors.push('Gemini: unavailable or GEMINI_API_KEY invalid/missing');
  }

  if (await isAiProviderHealthy('openai')) {
    try {
      return await ocrCalendarWithOpenAIText(sourceText, boardName, academicYear);
    } catch (err) {
      errors.push(`OpenAI: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (await isAiProviderHealthy('groq')) {
    try {
      return await ocrCalendarWithGroqText(sourceText, boardName, academicYear);
    } catch (err) {
      errors.push(`Groq: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  throw new Error(
    `Calendar OCR (text) failed.\n${errors.join('\n')}\nTip: ensure OPENAI_API_KEY or GROQ_API_KEY is valid in backend/.env (Gemini optional), then restart the API.`,
  );
}

async function ocrCalendarWithVision(
  mimeType: string,
  base64Data: string,
  boardName: string,
  academicYear: string,
  fileName: string,
): Promise<CalendarOcrResult> {
  const errors: string[] = [];

  if (await isAiProviderHealthy('gemini')) {
    try {
      const text = await runGeminiVisionJsonRequest(0.1, async (model) => {
        const result = await model.generateContent([
          { inlineData: { mimeType, data: base64Data } },
          { text: CALENDAR_OCR_PROMPT(boardName, academicYear) },
        ]);
        return result.response.text();
      });
      return parseCalendarOcrResponse(text, academicYear);
    } catch (err) {
      const formatted = formatGeminiError(err);
      noteProviderFailure('gemini', formatted);
      errors.push(`Gemini: ${formatted.message}`);
    }
  } else {
    errors.push('Gemini: unavailable or GEMINI_API_KEY invalid/missing');
  }

  if (await isAiProviderHealthy('openai')) {
    try {
      return await ocrCalendarWithOpenAIVision(mimeType, base64Data, boardName, academicYear, fileName);
    } catch (err) {
      errors.push(`OpenAI: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  throw new Error(
    `Calendar OCR (vision) failed.\n${errors.join('\n')}\nTip: upload a clear JPG/PNG, or set a valid OPENAI_API_KEY / GEMINI_API_KEY in backend/.env and restart.`,
  );
}

export async function scanBoardCalendarPdf(
  boardName: string,
  academicYear: string,
  fileName: string,
  fileData: string,
  mimeType = 'application/pdf',
) {
  const raw = fileData.includes(',') ? fileData.split(',')[1] : fileData;
  if (!raw || raw.length < 32) {
    throw new Error('Uploaded file data is empty or corrupted. Please re-select the PDF/circular.');
  }

  // ~20MB binary ≈ ~27MB base64 — keep a hard guard aligned with express 30mb JSON limit
  const approxBytes = Math.floor((raw.length * 3) / 4);
  if (approxBytes > 20 * 1024 * 1024) {
    throw new Error('File is larger than 20 MB. Compress the PDF or upload fewer pages.');
  }

  const buf = Buffer.from(raw, 'base64');
  let ocrResult: CalendarOcrResult;

  if (mimeType.includes('pdf') || fileName.toLowerCase().endsWith('.pdf')) {
    try {
      const { text } = await extractTextFromPdfBase64(raw);
      if (text.length > 80) {
        try {
          ocrResult = await ocrCalendarFromText(text, boardName, academicYear);
        } catch (textErr) {
          // Fallback to vision OCR for scanned/govt circular PDFs with weak text layer
          try {
            ocrResult = await ocrCalendarWithVision('application/pdf', raw, boardName, academicYear, fileName);
          } catch (visionErr) {
            const t = textErr instanceof Error ? textErr.message : String(textErr);
            const v = visionErr instanceof Error ? visionErr.message : String(visionErr);
            throw new Error(`${t}\n\nVision fallback:\n${v}`);
          }
        }
      } else {
        ocrResult = await ocrCalendarWithVision('application/pdf', raw, boardName, academicYear, fileName);
      }
    } catch (firstErr) {
      // If PDF text extraction itself failed, try vision
      if (String(firstErr).includes('Vision fallback') || String(firstErr).includes('Calendar OCR')) {
        throw firstErr instanceof Error ? firstErr : new Error(String(firstErr));
      }
      try {
        ocrResult = await ocrCalendarWithVision('application/pdf', raw, boardName, academicYear, fileName);
      } catch (secondErr) {
        const a = firstErr instanceof Error ? firstErr.message : String(firstErr);
        const b = secondErr instanceof Error ? secondErr.message : String(secondErr);
        throw new Error(`${a}\n\n${b}`);
      }
    }
  } else if (mimeType.startsWith('image/')) {
    ocrResult = await ocrCalendarWithVision(mimeType, raw, boardName, academicYear, fileName);
  } else {
    throw new Error('Unsupported file type. Upload a PDF or image (JPG/PNG) of the board calendar / govt circular.');
  }

  return {
    boardName,
    academicYear,
    fileName,
    fileSizeBytes: buf.length,
    mimeType,
    ocrRawText: ocrResult.documentSummary
      ? `${ocrResult.documentSummary}\n\n${ocrResult.rawText}`.trim()
      : ocrResult.rawText,
    previewEvents: ocrResult.events,
    eventCount: ocrResult.events.length,
  };
}

export function serializeCalendarEvent(row: AcademicCalendarEvent) {
  return {
    id: row.id,
    recordId: row.recordId,
    academicYear: row.academicYear,
    term: row.term,
    boardName: row.boardName,
    title: row.title,
    eventType: row.eventType,
    eventTypeLabel: EVENT_TYPE_UI[row.eventType],
    eventDate: row.eventDate.toISOString(),
    endDate: row.endDate?.toISOString() ?? null,
    description: row.description,
    eventSource: row.eventSource,
    uploadId: row.uploadId,
    sharedToParents: row.sharedToParents,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    isPublished: Boolean(row.publishedAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function serializeCalendarUpload(row: AcademicBoardCalendarUpload) {
  return {
    id: row.id,
    recordId: row.recordId,
    boardName: row.boardName,
    academicYear: row.academicYear,
    fileName: row.fileName,
    mimeType: row.mimeType,
    fileSizeBytes: row.fileSizeBytes,
    status: row.status,
    eventCount: row.eventCount,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    isPublished: Boolean(row.publishedAt),
    errorMessage: row.errorMessage,
    previewEvents: Array.isArray(row.previewEvents) ? row.previewEvents : [],
    ocrRawTextPreview: row.ocrRawText.slice(0, 500),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getAcademicCalendarMeta(institutionId: string) {
  const { getInstitutionFilterMeta } = await import('./students.js');
  const filters = await getInstitutionFilterMeta(institutionId);
  const { listConfiguredAiProviders } = await import('./aiQuestionProviders.js');
  const aiProviders = await listConfiguredAiProviders();
  return {
    defaultAcademicYear: filters.defaultAcademicYear,
    academicYears: filters.academicYears?.length ? filters.academicYears : ['2025-26', '2024-25', '2023-24'],
    boards: [...BOARD_OPTIONS],
    aiProviders,
  };
}

export async function createCalendarUploadAndScan(
  institutionId: string,
  data: { boardName: string; academicYear: string; fileName: string; fileData: string; mimeType?: string },
) {
  const recordId = await nextAcademicRecordId(institutionId, 'boardCalendar');
  const upload = await prisma.academicBoardCalendarUpload.create({
    data: {
      institutionId,
      recordId,
      boardName: data.boardName,
      academicYear: data.academicYear,
      fileName: data.fileName,
      mimeType: data.mimeType || 'application/pdf',
      status: 'PROCESSING',
    },
  });

  try {
    const scan = await scanBoardCalendarPdf(
      data.boardName,
      data.academicYear,
      data.fileName,
      data.fileData,
      data.mimeType,
    );

    const updated = await prisma.academicBoardCalendarUpload.update({
      where: { id: upload.id },
      data: {
        status: 'COMPLETED',
        ocrRawText: scan.ocrRawText,
        previewEvents: scan.previewEvents as object[],
        eventCount: scan.eventCount,
        fileSizeBytes: scan.fileSizeBytes,
      },
    });

    return { upload: serializeCalendarUpload(updated), previewEvents: scan.previewEvents };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'OCR failed';
    await prisma.academicBoardCalendarUpload.update({
      where: { id: upload.id },
      data: { status: 'FAILED', errorMessage: msg },
    });
    throw new Error(msg);
  }
}

export async function confirmCalendarUpload(
  institutionId: string,
  uploadId: string,
  opts?: { replaceExisting?: boolean; events?: OcrCalendarEvent[] },
) {
  const upload = await prisma.academicBoardCalendarUpload.findFirst({
    where: { institutionId, id: uploadId },
  });
  if (!upload) throw new Error('Upload not found');
  if (upload.status === 'FAILED') throw new Error('Upload failed OCR — re-upload the PDF');

  const events = opts?.events?.length
    ? opts.events
    : normalizeOcrEvents((upload.previewEvents as unknown[]) || [], upload.academicYear);

  if (opts?.replaceExisting) {
    await prisma.academicCalendarEvent.deleteMany({
      where: {
        institutionId,
        boardName: upload.boardName,
        academicYear: upload.academicYear,
        eventSource: 'OCR',
      },
    });
  }

  let created = 0;
  for (const ev of events) {
    const recordId = await nextAcademicRecordId(institutionId, 'calendar');
    await prisma.academicCalendarEvent.create({
      data: {
        institutionId,
        recordId,
        academicYear: upload.academicYear,
        boardName: upload.boardName,
        title: ev.title,
        eventType: ev.eventType,
        eventDate: new Date(ev.eventDate),
        endDate: ev.endDate ? new Date(ev.endDate) : null,
        description: ev.description || '',
        eventSource: 'OCR',
        uploadId: upload.id,
        sharedToParents: true,
      },
    });
    created += 1;
  }

  await prisma.academicBoardCalendarUpload.update({
    where: { id: upload.id },
    data: { eventCount: created },
  });

  return { created, uploadId: upload.id };
}

export async function publishAcademicCalendar(
  institutionId: string,
  opts: { academicYear: string; boardName?: string },
) {
  const now = new Date();
  const eventResult = await prisma.academicCalendarEvent.updateMany({
    where: {
      institutionId,
      academicYear: opts.academicYear,
      ...(opts.boardName ? { boardName: opts.boardName } : {}),
    },
    data: { publishedAt: now, sharedToParents: true },
  });

  const uploadResult = await prisma.academicBoardCalendarUpload.updateMany({
    where: {
      institutionId,
      academicYear: opts.academicYear,
      status: 'COMPLETED',
      ...(opts.boardName ? { boardName: opts.boardName } : {}),
    },
    data: { publishedAt: now },
  });

  return { publishedEvents: eventResult.count, publishedUploads: uploadResult.count, publishedAt: now.toISOString() };
}

export async function getMobileAcademicCalendar(
  institutionId: string,
  opts: { academicYear?: string; boardName?: string; month?: string; audience?: string },
) {
  const year = opts.academicYear || '2025-26';
  const where: Record<string, unknown> = {
    institutionId,
    academicYear: year,
    publishedAt: { not: null },
    ...(opts.boardName ? { boardName: opts.boardName } : {}),
  };

  if (opts.month) {
    const [y, m] = opts.month.split('-').map(Number);
    const start = new Date(y, (m || 1) - 1, 1);
    const end = new Date(y, m || 1, 0, 23, 59, 59, 999);
    where.eventDate = { gte: start, lte: end };
  }

  const rows = await prisma.academicCalendarEvent.findMany({
    where,
    orderBy: { eventDate: 'asc' },
  });

  const uploads = await prisma.academicBoardCalendarUpload.findMany({
    where: {
      institutionId,
      academicYear: year,
      publishedAt: { not: null },
      ...(opts.boardName ? { boardName: opts.boardName } : {}),
    },
    orderBy: { createdAt: 'desc' },
  });

  return {
    academicYear: year,
    audience: opts.audience || 'all',
    boards: [...new Set(rows.map((r) => r.boardName).filter(Boolean))],
    events: rows.map(serializeCalendarEvent),
    uploads: uploads.map(serializeCalendarUpload),
    totalEvents: rows.length,
    lastPublished: uploads[0]?.publishedAt?.toISOString() ?? rows[0]?.publishedAt?.toISOString() ?? null,
  };
}

export async function listCalendarUploads(institutionId: string, academicYear?: string) {
  const rows = await prisma.academicBoardCalendarUpload.findMany({
    where: { institutionId, ...(academicYear ? { academicYear } : {}) },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(serializeCalendarUpload);
}
