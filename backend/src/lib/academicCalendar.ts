import type {
  AcademicCalendarEvent,
  AcademicBoardCalendarUpload,
  AcademicEventType,
  AcademicCalendarUploadStatus,
} from '@prisma/client';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from './prisma.js';
import { extractTextFromPdfBase64 } from './pdfText.js';
import { getGeminiApiKey, parseJsonFromModel } from './geminiQuestions.js';
import { nextAcademicRecordId, EVENT_TYPE_UI } from './academicManagement.js';

export const BOARD_OPTIONS = ['CBSE', 'ICSE', 'State Board', 'IB', 'Cambridge', 'NIOS', 'Other'] as const;

export type OcrCalendarEvent = {
  title: string;
  eventDate: string;
  endDate?: string | null;
  eventType: AcademicEventType;
  description?: string;
};

const CALENDAR_OCR_PROMPT = (boardName: string, academicYear: string) => `
You are an expert at reading academic school calendars from education boards.

Extract ALL dated events from this ${boardName} academic calendar for academic year ${academicYear}.
Include: holidays, vacations, exam dates, PTM dates, term starts/ends, festivals, activities, board exams, result days.

For each event return:
- title: short event name
- eventDate: ISO date YYYY-MM-DD (use ${academicYear.split('-')[0] || '2025'} as year when only month/day given)
- endDate: ISO date if multi-day event, else null
- eventType: one of HOLIDAY, EXAM, PTM, ACTIVITY, OTHER
- description: brief note if any

Return JSON only:
{
  "boardName": "${boardName}",
  "academicYear": "${academicYear}",
  "rawText": "full transcription of calendar text",
  "events": [
    { "title": "...", "eventDate": "2025-04-01", "endDate": null, "eventType": "HOLIDAY", "description": "" }
  ]
}
`;

function normalizeEventType(val: unknown): AcademicEventType {
  const s = String(val || 'OTHER').toUpperCase();
  if (['HOLIDAY', 'EXAM', 'PTM', 'ACTIVITY', 'OTHER'].includes(s)) return s as AcademicEventType;
  if (s.includes('HOLIDAY') || s.includes('VACATION')) return 'HOLIDAY';
  if (s.includes('EXAM') || s.includes('TEST')) return 'EXAM';
  if (s.includes('PTM') || s.includes('PARENT')) return 'PTM';
  if (s.includes('ACTIVITY') || s.includes('SPORTS') || s.includes('EVENT')) return 'ACTIVITY';
  return 'OTHER';
}

function normalizeOcrEvents(items: unknown[]): OcrCalendarEvent[] {
  const out: OcrCalendarEvent[] = [];
  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const title = String(o.title || '').trim();
    const eventDate = String(o.eventDate || '').trim();
    if (!title || !eventDate || Number.isNaN(new Date(eventDate).getTime())) continue;
    out.push({
      title,
      eventDate: eventDate.slice(0, 10),
      endDate: o.endDate ? String(o.endDate).slice(0, 10) : null,
      eventType: normalizeEventType(o.eventType),
      description: String(o.description || '').trim(),
    });
  }
  return out;
}

async function ocrCalendarWithGemini(
  mimeType: string,
  base64Data: string,
  boardName: string,
  academicYear: string,
): Promise<{ rawText: string; events: OcrCalendarEvent[] }> {
  const genAI = new GoogleGenerativeAI(getGeminiApiKey());
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
  });

  const result = await model.generateContent([
    { inlineData: { mimeType, data: base64Data } },
    { text: CALENDAR_OCR_PROMPT(boardName, academicYear) },
  ]);

  const text = result.response.text();
  if (!text) throw new Error('OCR returned empty response');

  const parsed = parseJsonFromModel(text) as { rawText?: string; events?: unknown[] };
  const events = normalizeOcrEvents(parsed.events || []);
  if (events.length === 0) throw new Error('No calendar events could be extracted. Try a clearer PDF.');

  return { rawText: String(parsed.rawText || '').trim(), events };
}

async function ocrCalendarFromText(
  text: string,
  boardName: string,
  academicYear: string,
): Promise<{ rawText: string; events: OcrCalendarEvent[] }> {
  const genAI = new GoogleGenerativeAI(getGeminiApiKey());
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
  });

  const result = await model.generateContent(
    `${CALENDAR_OCR_PROMPT(boardName, academicYear)}\n\nEXTRACTED PDF TEXT:\n${text.slice(0, 100_000)}`,
  );
  const responseText = result.response.text();
  if (!responseText) throw new Error('OCR returned empty response');

  const parsed = parseJsonFromModel(responseText) as { rawText?: string; events?: unknown[] };
  const events = normalizeOcrEvents(parsed.events || []);
  if (events.length === 0) throw new Error('No calendar events found in PDF text.');

  return { rawText: String(parsed.rawText || text).trim(), events };
}

export async function scanBoardCalendarPdf(
  boardName: string,
  academicYear: string,
  fileName: string,
  fileData: string,
  mimeType = 'application/pdf',
) {
  const raw = fileData.includes(',') ? fileData.split(',')[1] : fileData;
  const buf = Buffer.from(raw, 'base64');

  let ocrResult: { rawText: string; events: OcrCalendarEvent[] };

  if (mimeType.includes('pdf')) {
    try {
      const { text } = await extractTextFromPdfBase64(raw);
      if (text.length > 50) {
        ocrResult = await ocrCalendarFromText(text, boardName, academicYear);
      } else {
        ocrResult = await ocrCalendarWithGemini('application/pdf', raw, boardName, academicYear);
      }
    } catch {
      ocrResult = await ocrCalendarWithGemini('application/pdf', raw, boardName, academicYear);
    }
  } else if (mimeType.startsWith('image/')) {
    ocrResult = await ocrCalendarWithGemini(mimeType, raw, boardName, academicYear);
  } else {
    throw new Error('Unsupported file type. Upload PDF or image (JPG/PNG).');
  }

  return {
    boardName,
    academicYear,
    fileName,
    fileSizeBytes: buf.length,
    mimeType,
    ocrRawText: ocrResult.rawText,
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
    : normalizeOcrEvents((upload.previewEvents as unknown[]) || []);

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
