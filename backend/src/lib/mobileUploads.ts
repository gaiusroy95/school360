import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { prisma } from './prisma.js';
import { assertStudentAccess, type MobileAuthUser } from './mobileAuth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_ROOT = path.resolve(__dirname, '../../uploads/mobile');

const MAX_UPLOAD_BYTES = Number(process.env.MOBILE_UPLOAD_MAX_BYTES || 10 * 1024 * 1024);

const ALLOWED_MIME_PREFIXES = ['image/', 'video/', 'application/pdf', 'application/msword', 'text/'];

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) || 'file';
}

function isAllowedMime(mime: string) {
  if (!mime) return false;
  return ALLOWED_MIME_PREFIXES.some((p) => mime.startsWith(p));
}

export async function saveMobileUpload(
  user: MobileAuthUser,
  opts: {
    fileName: string;
    mimeType: string;
    dataBase64: string;
    studentId?: string;
  },
) {
  if (opts.studentId) {
    assertStudentAccess(user, opts.studentId);
  }

  if (!isAllowedMime(opts.mimeType)) {
    throw new Error('File type not allowed');
  }

  const buffer = Buffer.from(opts.dataBase64, 'base64');
  if (buffer.length === 0) throw new Error('Empty file');
  if (buffer.length > MAX_UPLOAD_BYTES) {
    throw new Error(`File exceeds maximum size of ${MAX_UPLOAD_BYTES} bytes`);
  }

  const dir = path.join(UPLOAD_ROOT, user.institutionId);
  await fs.mkdir(dir, { recursive: true });

  const safeName = sanitizeFileName(opts.fileName);
  const id = `upl_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const storagePath = path.join(dir, `${id}_${safeName}`);

  await fs.writeFile(storagePath, buffer);

  const row = await prisma.mobileUpload.create({
    data: {
      institutionId: user.institutionId,
      accountId: user.accountId,
      studentId: opts.studentId ?? '',
      fileName: safeName,
      mimeType: opts.mimeType,
      sizeBytes: buffer.length,
      storagePath,
    },
  });

  return {
    id: row.id,
    fileName: row.fileName,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    url: `/api/mobile/uploads/${row.id}/file`,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getMobileUploadFile(user: MobileAuthUser, uploadId: string) {
  const row = await prisma.mobileUpload.findFirst({
    where: { id: uploadId, institutionId: user.institutionId },
  });
  if (!row) throw new Error('Upload not found');

  if (row.accountId !== user.accountId && row.studentId) {
    assertStudentAccess(user, row.studentId);
  } else if (row.accountId !== user.accountId) {
    throw new Error('Access denied');
  }

  const data = await fs.readFile(row.storagePath);
  return { row, data };
}

export async function listMobileUploads(user: MobileAuthUser, studentId?: string) {
  if (studentId) assertStudentAccess(user, studentId);

  const rows = await prisma.mobileUpload.findMany({
    where: {
      institutionId: user.institutionId,
      accountId: user.accountId,
      ...(studentId ? { studentId } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return rows.map((r) => ({
    id: r.id,
    fileName: r.fileName,
    mimeType: r.mimeType,
    sizeBytes: r.sizeBytes,
    studentId: r.studentId || null,
    url: `/api/mobile/uploads/${r.id}/file`,
    createdAt: r.createdAt.toISOString(),
  }));
}
