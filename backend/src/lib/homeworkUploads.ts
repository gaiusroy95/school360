import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomBytes } from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const HOMEWORK_UPLOAD_ROOT = path.resolve(__dirname, '../../uploads/homework');
const MAX_BYTES = Number(process.env.HOMEWORK_UPLOAD_MAX_BYTES || 25 * 1024 * 1024);

const ALLOWED: Record<string, { ext: string; type: 'pdf' | 'image' | 'video' }> = {
  'application/pdf': { ext: 'pdf', type: 'pdf' },
  'image/jpeg': { ext: 'jpg', type: 'image' },
  'image/jpg': { ext: 'jpg', type: 'image' },
  'image/png': { ext: 'png', type: 'image' },
  'image/webp': { ext: 'webp', type: 'image' },
  'video/mp4': { ext: 'mp4', type: 'video' },
  'video/webm': { ext: 'webm', type: 'video' },
  'video/quicktime': { ext: 'mov', type: 'video' },
};

export type HomeworkAttachment = {
  id: string;
  type: 'pdf' | 'image' | 'video' | 'link';
  title: string;
  url: string;
  fileName?: string;
  mimeType?: string;
};

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) || 'file';
}

export function attachmentTypeFromMime(mimeType: string): 'pdf' | 'image' | 'video' | null {
  return ALLOWED[mimeType]?.type ?? null;
}

export function isYouTubeUrl(url: string) {
  try {
    const u = new URL(url);
    return /(^|\.)youtube\.com$/i.test(u.hostname) || /(^|\.)youtu\.be$/i.test(u.hostname);
  } catch {
    return false;
  }
}

export function normalizeHomeworkAttachments(raw: unknown): HomeworkAttachment[] {
  if (!Array.isArray(raw)) return [];
  const out: HomeworkAttachment[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const url = String(row.url || '').trim();
    if (!url) continue;
    const id = String(row.id || `att_${randomBytes(4).toString('hex')}`);
    const fileName = row.fileName ? String(row.fileName) : undefined;
    const mimeType = row.mimeType ? String(row.mimeType) : undefined;
    let type = String(row.type || '').toLowerCase() as HomeworkAttachment['type'];
    if (!['pdf', 'image', 'video', 'link'].includes(type)) {
      if (isYouTubeUrl(url) || mimeType?.startsWith('video/')) type = 'video';
      else if (mimeType === 'application/pdf' || url.toLowerCase().endsWith('.pdf')) type = 'pdf';
      else if (mimeType?.startsWith('image/')) type = 'image';
      else type = 'link';
    }
    const title = String(row.title || fileName || (type === 'link' || type === 'video' ? 'Video link' : 'Attachment'));
    out.push({ id, type, title, url, fileName, mimeType });
  }
  return out;
}

export async function saveHomeworkUpload(
  institutionId: string,
  opts: { fileName: string; mimeType: string; dataBase64: string; title?: string },
): Promise<HomeworkAttachment> {
  const meta = ALLOWED[opts.mimeType];
  if (!meta) {
    throw new Error('Only PDF, JPG, PNG, and video (MP4/WebM/MOV) files are allowed');
  }

  const buffer = Buffer.from(opts.dataBase64, 'base64');
  if (buffer.length === 0) throw new Error('Empty file');
  if (buffer.length > MAX_BYTES) {
    throw new Error(`File exceeds maximum size of ${Math.round(MAX_BYTES / (1024 * 1024))}MB`);
  }

  const dir = path.join(HOMEWORK_UPLOAD_ROOT, institutionId);
  await fs.mkdir(dir, { recursive: true });

  const id = `hw_${Date.now()}_${randomBytes(4).toString('hex')}`;
  const safeName = sanitizeFileName(opts.fileName || `file.${meta.ext}`);
  const storageName = `${id}_${safeName}`;
  await fs.writeFile(path.join(dir, storageName), buffer);

  return {
    id,
    type: meta.type,
    title: opts.title || safeName,
    url: `/api/academic/homework/files/${institutionId}/${storageName}`,
    fileName: safeName,
    mimeType: opts.mimeType,
  };
}

export async function resolveHomeworkFile(institutionId: string, storageName: string) {
  const safe = path.basename(storageName);
  const full = path.join(HOMEWORK_UPLOAD_ROOT, institutionId, safe);
  const root = path.join(HOMEWORK_UPLOAD_ROOT, institutionId);
  if (!full.startsWith(root)) throw new Error('Invalid path');
  await fs.access(full);
  return full;
}
