import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { prisma } from './prisma.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_ROOT = path.resolve(__dirname, '../../uploads/institution');
const MAX_BYTES = 2 * 1024 * 1024;

const MIME_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'application/pdf': 'pdf',
};

export const INSTITUTION_LOGO_API_PATH = '/api/institution/branding/logo';

export function isAllowedLogoMime(mimeType: string) {
  return Boolean(MIME_EXT[mimeType]);
}

export async function saveInstitutionLogo(
  institutionId: string,
  opts: { fileName: string; mimeType: string; dataBase64: string },
) {
  const ext = MIME_EXT[opts.mimeType];
  if (!ext) throw new Error('Only PNG, JPG, and PDF files are allowed');

  const buffer = Buffer.from(opts.dataBase64, 'base64');
  if (buffer.length === 0) throw new Error('Empty file');
  if (buffer.length > MAX_BYTES) throw new Error('Logo file must be 2MB or smaller');

  const dir = path.join(UPLOAD_ROOT, institutionId);
  await fs.mkdir(dir, { recursive: true });

  try {
    const files = await fs.readdir(dir);
    for (const file of files) {
      if (file.startsWith('school-logo.')) {
        await fs.unlink(path.join(dir, file));
      }
    }
  } catch {
    /* no prior logo */
  }

  const storageName = `school-logo.${ext}`;
  await fs.writeFile(path.join(dir, storageName), buffer);

  await persistLogoUrlInSetup(institutionId, INSTITUTION_LOGO_API_PATH);

  return {
    logoUrl: INSTITUTION_LOGO_API_PATH,
    fileName: opts.fileName,
    mimeType: opts.mimeType,
    sizeBytes: buffer.length,
  };
}

async function persistLogoUrlInSetup(institutionId: string, logoUrl: string) {
  const setup = await prisma.institutionSetup.findUnique({ where: { institutionId } });
  if (!setup) return;

  const basic = (setup.basicInformation && typeof setup.basicInformation === 'object'
    ? { ...(setup.basicInformation as Record<string, unknown>) }
    : {}) as Record<string, unknown>;

  const sections = {
    ...((basic.sections as Record<string, Record<string, string>> | undefined) ?? {}),
  };

  const logoBranding = { ...(sections['Logo & Branding'] ?? {}) };
  logoBranding.logoUrl = logoUrl;
  sections['Logo & Branding'] = logoBranding;

  await prisma.institutionSetup.update({
    where: { institutionId },
    data: {
      basicInformation: { ...basic, sections } as object,
    },
  });
}

export async function readInstitutionLogo(institutionId: string) {
  const dir = path.join(UPLOAD_ROOT, institutionId);
  try {
    const files = await fs.readdir(dir);
    const match = files.find((f) => f.startsWith('school-logo.'));
    if (!match) return null;
    const buffer = await fs.readFile(path.join(dir, match));
    const ext = match.split('.').pop()?.toLowerCase();
    const mimeType =
      ext === 'pdf' ? 'application/pdf' : ext === 'png' ? 'image/png' : 'image/jpeg';
    return { buffer, mimeType, fileName: match };
  } catch {
    return null;
  }
}

export async function getInstitutionLogoMeta(institutionId: string) {
  const file = await readInstitutionLogo(institutionId);
  if (!file) return { hasLogo: false, logoUrl: null as string | null };
  return {
    hasLogo: true,
    logoUrl: INSTITUTION_LOGO_API_PATH,
    fileName: file.fileName,
    mimeType: file.mimeType,
  };
}
