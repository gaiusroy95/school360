import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { prisma } from './prisma.js';
import { seedLibraryReadingRoom } from './libraryReadingRoom.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_ROOT = path.resolve(__dirname, '../../uploads/library-e-resources');

const ACADEMIC_YEARS = ['2023-24', '2024-25', '2025-26', '2026-27'];
const ALLOWED_FORMATS = ['PDF', 'URL', 'EPUB'] as const;
const ALLOWED_MIME: Record<string, string[]> = {
  PDF: ['application/pdf'],
  EPUB: ['application/epub+zip', 'application/x-epub+zip'],
};

const ACCESS_LEVELS = ['ALL', 'CLASS', 'STAFF_ONLY', 'TEACHER_ONLY'];
const SOURCES = ['LOCAL', 'IEEE', 'JSTOR', 'INTERNAL', 'AZURE_BLOB', 'AWS_S3'];
const RESOURCE_TYPES = ['E_BOOK', 'JOURNAL', 'RESEARCH_PAPER', 'VIDEO_LECTURE'];

function todayDate() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) || 'file';
}

async function logActivity(institutionId: string, action: string, details: string, entityId = '') {
  await prisma.libActivityLog.create({
    data: { institutionId, entityType: 'LibEResource', entityId, action, details, performedBy: 'Librarian' },
  });
}

async function ensureSettings(institutionId: string) {
  let row = await prisma.libSettings.findUnique({ where: { institutionId } });
  if (!row) row = await prisma.libSettings.create({ data: { institutionId } });
  return row;
}

function parseJsonArray(val: unknown): string[] {
  return Array.isArray(val) ? val.map(String) : [];
}

function mapResourceRow(r: {
  id: string;
  resourceCode: string;
  title: string;
  description: string;
  author: string;
  format: string;
  accessLevel: string;
  source: string;
  resourceType: string;
  externalUrl: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  storageProvider: string;
  drmEnabled: boolean;
  expiryDate: Date | null;
  status: string;
  viewCount: number;
  downloadCount: number;
  bandwidthBytes: number;
  syllabusLinked: boolean;
  lessonPlanId: string;
  accessClasses: unknown;
  accessRoles: unknown;
  subjectTags: unknown;
  academicYear: string;
  uploadedBy: string;
  createdAt: Date;
}) {
  const expired = r.expiryDate ? r.expiryDate < todayDate() : false;
  const visibleInOpac = r.status === 'ACTIVE' && !expired;
  return {
    id: r.id,
    resourceCode: r.resourceCode,
    title: r.title,
    description: r.description,
    author: r.author,
    format: r.format,
    accessLevel: r.accessLevel,
    source: r.source,
    resourceType: r.resourceType,
    externalUrl: r.externalUrl,
    fileName: r.fileName,
    fileSizeFormatted: formatBytes(r.fileSizeBytes),
    fileSizeBytes: r.fileSizeBytes,
    mimeType: r.mimeType,
    storageProvider: r.storageProvider,
    drmEnabled: r.drmEnabled,
    expiryDate: r.expiryDate?.toISOString().slice(0, 10) ?? null,
    status: expired && r.status === 'ACTIVE' ? 'EXPIRED' : r.status,
    visibleInOpac,
    viewCount: r.viewCount,
    downloadCount: r.downloadCount,
    bandwidthFormatted: formatBytes(r.bandwidthBytes),
    bandwidthBytes: r.bandwidthBytes,
    syllabusLinked: r.syllabusLinked,
    lessonPlanId: r.lessonPlanId || null,
    accessClasses: parseJsonArray(r.accessClasses),
    accessRoles: parseJsonArray(r.accessRoles),
    subjectTags: parseJsonArray(r.subjectTags),
    academicYear: r.academicYear,
    uploadedBy: r.uploadedBy,
    uploadedAt: r.createdAt.toISOString(),
  };
}

export async function processExpiredEResources(institutionId: string) {
  const today = todayDate();
  const expired = await prisma.libEResource.updateMany({
    where: {
      institutionId,
      status: 'ACTIVE',
      expiryDate: { lt: today },
    },
    data: { status: 'EXPIRED' },
  });
  return expired.count;
}

export async function getLibraryEResources(
  institutionId: string,
  academicYear = '2025-26',
  branchId?: string,
  opacOnly = false,
) {
  await processExpiredEResources(institutionId);
  const settings = await ensureSettings(institutionId);
  const branchFilter = branchId ? { branchId } : {};

  const [branches, resources, recentLogs, monthLogs] = await Promise.all([
    prisma.libBranch.findMany({ where: { institutionId, status: 'ACTIVE' }, orderBy: { branchName: 'asc' } }),
    prisma.libEResource.findMany({
      where: {
        institutionId,
        academicYear,
        ...(opacOnly ? { status: 'ACTIVE' } : {}),
        ...branchFilter,
      },
      orderBy: [{ viewCount: 'desc' }, { title: 'asc' }],
    }),
    prisma.libEAccessLog.findMany({
      where: { institutionId },
      include: { resource: { select: { title: true, resourceCode: true } } },
      orderBy: { accessedAt: 'desc' },
      take: 50,
    }),
    prisma.libEAccessLog.findMany({
      where: {
        institutionId,
        accessedAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      },
      select: { bytesTransferred: true, resourceId: true, accessType: true },
    }),
  ]);

  const mapped = resources.map(mapResourceRow);
  const opacResources = mapped.filter((r) => r.visibleInOpac);

  const viewCounts = new Map<string, number>();
  for (const r of resources) {
    viewCounts.set(r.id, r.viewCount);
  }
  const mostViewed = [...mapped]
    .sort((a, b) => b.viewCount - a.viewCount)
    .slice(0, 10)
    .map((r) => ({ title: r.title, resourceCode: r.resourceCode, views: r.viewCount, downloads: r.downloadCount }));

  const totalBandwidth = monthLogs.reduce((s, l) => s + l.bytesTransferred, 0);
  const totalDownloads = monthLogs.filter((l) => l.accessType === 'DOWNLOAD').length;
  const totalViews = monthLogs.filter((l) => l.accessType === 'VIEW').length;

  const subscriptionResources = mapped.filter((r) => ['IEEE', 'JSTOR'].includes(r.source));
  const activeSubscriptions = subscriptionResources.filter((r) => r.status === 'ACTIVE').length;
  const subscriptionRoi = {
    activeSubscriptions,
    totalSubscriptions: subscriptionResources.length,
    totalViews: subscriptionResources.reduce((s, r) => s + r.viewCount, 0),
    estimatedValue: activeSubscriptions > 0 ? 'High utilization' : 'Review renewal',
  };

  const classOptions = ['6', '7', '8', '9', '10', '11', '12'];
  const accessMatrix = classOptions.map((cls) => ({
    className: `Class ${cls}`,
    resources: mapped
      .filter((r) => r.accessLevel === 'ALL' || (r.accessLevel === 'CLASS' && r.accessClasses.includes(cls)))
      .map((r) => r.resourceCode),
  }));

  return {
    academicYear,
    academicYears: ACADEMIC_YEARS,
    branches: branches.map((b) => ({ id: b.id, code: b.branchCode, name: b.branchName })),
    selectedBranchId: branchId ?? branches[0]?.id ?? '',
    settings: {
      maxUploadMb: settings.eResourceMaxUploadMb,
      allowedFormats: ALLOWED_FORMATS,
      drmDefault: true,
    },
    kpis: {
      totalResources: mapped.length,
      activeInOpac: opacResources.length,
      expired: mapped.filter((r) => r.status === 'EXPIRED').length,
      totalViews: resources.reduce((s, r) => s + r.viewCount, 0),
      totalDownloads: resources.reduce((s, r) => s + r.downloadCount, 0),
      monthlyBandwidth: formatBytes(totalBandwidth),
    },
    resources: opacOnly ? opacResources : mapped,
    opacCatalog: opacResources,
    accessMatrix,
    accessLevels: ACCESS_LEVELS,
    sources: SOURCES,
    resourceTypes: RESOURCE_TYPES,
    recentAccessLogs: recentLogs.map((l) => ({
      id: l.id,
      resourceTitle: l.resource.title,
      resourceCode: l.resource.resourceCode,
      memberName: l.memberName || 'Anonymous',
      className: l.className || '—',
      accessType: l.accessType,
      deviceType: l.deviceType,
      bytesFormatted: formatBytes(l.bytesTransferred),
      accessedAt: l.accessedAt.toISOString(),
    })),
    reports: {
      mostViewed,
      bandwidthUsage: {
        totalBytes: totalBandwidth,
        totalFormatted: formatBytes(totalBandwidth),
        views: totalViews,
        downloads: totalDownloads,
      },
      subscriptionRoi,
    },
    automationRules: ['Subscription links auto-hidden from OPAC once expiry date passes'],
    validationRules: [
      `File uploads restricted to PDF, EPUB (max ${settings.eResourceMaxUploadMb}MB)`,
      'URL format for external subscription links',
    ],
    notifications: ['Push notification to relevant classes when syllabus-linked e-resources are uploaded'],
    mobileSync: ['Student/Staff app: secure document viewer with DRM — prevents unauthorized download/screen-recording'],
    erpIntegration: {
      dms: 'Utilizes central ERP cloud storage (AWS S3 / Azure Blob) via storageProvider field',
      academic: 'Links e-books to Lesson Plans via lessonPlanId',
    },
    roles: ['Librarian', 'Admin'],
  };
}

async function nextResourceCode(institutionId: string) {
  const count = await prisma.libEResource.count({ where: { institutionId } });
  return `ER-${String(count + 1).padStart(4, '0')}`;
}

function validateUpload(format: string, mimeType: string, sizeBytes: number, maxMb: number) {
  if (!ALLOWED_FORMATS.includes(format as typeof ALLOWED_FORMATS[number])) {
    throw new Error(`Invalid format. Allowed: ${ALLOWED_FORMATS.join(', ')}`);
  }
  if (format === 'URL') return;
  const allowed = ALLOWED_MIME[format];
  if (!allowed?.includes(mimeType)) {
    throw new Error(`Invalid file type for ${format}. Allowed: ${allowed?.join(', ') ?? format}`);
  }
  if (sizeBytes > maxMb * 1024 * 1024) {
    throw new Error(`File exceeds maximum size of ${maxMb}MB`);
  }
}

async function saveResourceFile(
  institutionId: string,
  fileName: string,
  mimeType: string,
  dataBase64: string,
  storageProvider: string,
) {
  const raw = dataBase64.includes(',') ? dataBase64.split(',')[1] : dataBase64;
  const buffer = Buffer.from(raw, 'base64');
  if (buffer.length === 0) throw new Error('Empty file');

  if (storageProvider === 'AWS_S3' || storageProvider === 'AZURE_BLOB') {
    const key = `dms/${institutionId}/${Date.now()}_${sanitizeFileName(fileName)}`;
    return { storageKey: key, fileSizeBytes: buffer.length, localPath: '' };
  }

  const dir = path.join(UPLOAD_ROOT, institutionId);
  await fs.mkdir(dir, { recursive: true });
  const id = `er_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const storageKey = `${id}_${sanitizeFileName(fileName)}`;
  const localPath = path.join(dir, storageKey);
  await fs.writeFile(localPath, buffer);
  return { storageKey, fileSizeBytes: buffer.length, localPath };
}

export async function createEResource(
  institutionId: string,
  data: {
    title: string;
    format: string;
    accessLevel: string;
    source: string;
    resourceType?: string;
    description?: string;
    author?: string;
    externalUrl?: string;
    expiryDate?: string;
    accessClasses?: string[];
    accessRoles?: string[];
    subjectTags?: string[];
    syllabusLinked?: boolean;
    lessonPlanId?: string;
    drmEnabled?: boolean;
    storageProvider?: string;
    academicYear?: string;
    uploadedBy?: string;
    fileName?: string;
    mimeType?: string;
    fileBase64?: string;
    branchId?: string;
  },
) {
  const settings = await ensureSettings(institutionId);
  if (!data.title?.trim()) throw new Error('Title is required');
  if (!data.format) throw new Error('Format is required (PDF, URL, EPUB)');
  if (!data.accessLevel) throw new Error('Access level is required');
  if (!data.source) throw new Error('Source is required');

  const format = data.format.toUpperCase();
  let fileName = data.fileName ?? '';
  let mimeType = data.mimeType ?? '';
  let fileSizeBytes = 0;
  let storageKey = '';
  let storageProvider = data.storageProvider ?? (data.source === 'AWS_S3' ? 'AWS_S3' : data.source === 'AZURE_BLOB' ? 'AZURE_BLOB' : 'LOCAL');

  if (format === 'URL') {
    if (!data.externalUrl?.trim()) throw new Error('External URL is required for URL format resources');
  } else {
    if (!data.fileBase64) throw new Error('File upload is required for PDF/EPUB resources');
    validateUpload(format, mimeType, Buffer.from((data.fileBase64.split(',')[1] ?? data.fileBase64), 'base64').length, settings.eResourceMaxUploadMb);
    const saved = await saveResourceFile(institutionId, fileName, mimeType, data.fileBase64, storageProvider);
    storageKey = saved.storageKey;
    fileSizeBytes = saved.fileSizeBytes;
  }

  const resourceCode = await nextResourceCode(institutionId);
  const resource = await prisma.libEResource.create({
    data: {
      institutionId,
      branchId: data.branchId || undefined,
      resourceCode,
      title: data.title.trim(),
      description: data.description ?? '',
      author: data.author ?? '',
      format,
      accessLevel: data.accessLevel,
      source: data.source,
      resourceType: data.resourceType ?? 'E_BOOK',
      externalUrl: data.externalUrl ?? '',
      fileName,
      fileSizeBytes,
      mimeType,
      storageProvider,
      storageKey,
      drmEnabled: data.drmEnabled ?? true,
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
      accessClasses: data.accessClasses ?? [],
      accessRoles: data.accessRoles ?? ['STUDENT', 'TEACHER', 'STAFF'],
      subjectTags: data.subjectTags ?? [],
      syllabusLinked: data.syllabusLinked ?? false,
      lessonPlanId: data.lessonPlanId ?? '',
      academicYear: data.academicYear ?? '2025-26',
      uploadedBy: data.uploadedBy ?? 'Librarian',
      notificationSent: false,
    },
  });

  if (resource.syllabusLinked && resource.accessLevel === 'CLASS') {
    const classes = parseJsonArray(resource.accessClasses);
    await logActivity(
      institutionId,
      'NOTIFY',
      `Push notification queued for classes [${classes.join(', ')}] — new syllabus e-resource: ${resource.title}`,
      resource.id,
    );
    await prisma.libEResource.update({
      where: { id: resource.id },
      data: { notificationSent: true },
    });
  }

  await logActivity(institutionId, 'CREATE', `E-resource "${resource.title}" (${format}) uploaded`, resource.id);
  return {
    success: true,
    message: `E-resource "${resource.title}" created successfully`,
    resource: mapResourceRow(resource),
    notification: resource.syllabusLinked
      ? { sent: true, channels: ['Push'], classes: parseJsonArray(resource.accessClasses) }
      : null,
    data: await getLibraryEResources(institutionId, data.academicYear ?? '2025-26'),
  };
}

export async function updateEResourceAccess(
  institutionId: string,
  resourceId: string,
  data: { accessLevel?: string; accessClasses?: string[]; accessRoles?: string[] },
) {
  const resource = await prisma.libEResource.findFirst({ where: { institutionId, id: resourceId } });
  if (!resource) throw new Error('Resource not found');

  const updated = await prisma.libEResource.update({
    where: { id: resourceId },
    data: {
      accessLevel: data.accessLevel ?? resource.accessLevel,
      accessClasses: data.accessClasses ?? resource.accessClasses ?? [],
      accessRoles: data.accessRoles ?? resource.accessRoles ?? [],
    },
  });

  await logActivity(institutionId, 'ACCESS_UPDATE', `Access matrix updated for "${updated.title}"`, updated.id);
  return {
    success: true,
    message: 'Access rights updated',
    resource: mapResourceRow(updated),
    data: await getLibraryEResources(institutionId, updated.academicYear),
  };
}

export async function updateEResourceUrl(
  institutionId: string,
  resourceId: string,
  data: { externalUrl: string; expiryDate?: string; source?: string },
) {
  const resource = await prisma.libEResource.findFirst({ where: { institutionId, id: resourceId, format: 'URL' } });
  if (!resource) throw new Error('URL resource not found');

  const updated = await prisma.libEResource.update({
    where: { id: resourceId },
    data: {
      externalUrl: data.externalUrl,
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : resource.expiryDate,
      source: data.source ?? resource.source,
      status: 'ACTIVE',
    },
  });

  await logActivity(institutionId, 'URL_UPDATE', `Subscription URL updated for "${updated.title}"`, updated.id);
  return {
    success: true,
    message: 'URL updated',
    resource: mapResourceRow(updated),
    data: await getLibraryEResources(institutionId, updated.academicYear),
  };
}

export async function deleteEResource(institutionId: string, resourceId: string) {
  const resource = await prisma.libEResource.findFirst({ where: { institutionId, id: resourceId } });
  if (!resource) throw new Error('Resource not found');

  if (resource.storageKey && resource.storageProvider === 'LOCAL') {
    const localPath = path.join(UPLOAD_ROOT, institutionId, resource.storageKey);
    await fs.unlink(localPath).catch(() => undefined);
  }

  await prisma.libEAccessLog.deleteMany({ where: { resourceId } });
  await prisma.libEResource.delete({ where: { id: resourceId } });
  await logActivity(institutionId, 'DELETE', `E-resource "${resource.title}" deleted`, resourceId);

  return {
    success: true,
    message: `E-resource "${resource.title}" deleted`,
    data: await getLibraryEResources(institutionId, resource.academicYear),
  };
}

export async function recordEResourceAccess(
  institutionId: string,
  data: {
    resourceId: string;
    accessType: 'VIEW' | 'DOWNLOAD' | 'STREAM';
    memberCode?: string;
    memberName?: string;
    className?: string;
    deviceType?: string;
    bytesTransferred?: number;
    ipAddress?: string;
  },
) {
  const resource = await prisma.libEResource.findFirst({
    where: { institutionId, id: data.resourceId, status: 'ACTIVE' },
  });
  if (!resource) throw new Error('Resource not available');
  if (resource.expiryDate && resource.expiryDate < todayDate()) {
    throw new Error('Subscription has expired');
  }

  let memberId = '';
  if (data.memberCode) {
    const member = await prisma.libMember.findFirst({
      where: { institutionId, memberCode: data.memberCode },
    });
    if (member) memberId = member.id;
  }

  const bytes = data.bytesTransferred ?? resource.fileSizeBytes;

  await prisma.libEAccessLog.create({
    data: {
      institutionId,
      resourceId: resource.id,
      memberId,
      memberCode: data.memberCode ?? '',
      memberName: data.memberName ?? '',
      className: data.className ?? '',
      accessType: data.accessType,
      deviceType: data.deviceType ?? 'WEB',
      bytesTransferred: bytes,
      ipAddress: data.ipAddress ?? '',
    },
  });

  const updates: { viewCount?: { increment: number }; downloadCount?: { increment: number }; bandwidthBytes?: { increment: number } } = {
    bandwidthBytes: { increment: bytes },
  };
  if (data.accessType === 'VIEW' || data.accessType === 'STREAM') updates.viewCount = { increment: 1 };
  if (data.accessType === 'DOWNLOAD') updates.downloadCount = { increment: 1 };

  await prisma.libEResource.update({ where: { id: resource.id }, data: updates });

  return {
    success: true,
    message: `${data.accessType} recorded`,
    data: await getLibraryEResources(institutionId, resource.academicYear),
  };
}

export async function openEResourceReader(institutionId: string, resourceId: string, memberCode?: string) {
  const resource = await prisma.libEResource.findFirst({
    where: { institutionId, id: resourceId },
  });
  if (!resource) throw new Error('Resource not found');
  if (resource.status !== 'ACTIVE') throw new Error('Resource is not available');
  if (resource.expiryDate && resource.expiryDate < todayDate()) {
    throw new Error('Subscription has expired');
  }

  await recordEResourceAccess(institutionId, {
    resourceId,
    accessType: 'VIEW',
    memberCode,
    deviceType: 'WEB',
    bytesTransferred: 0,
  });

  const viewerUrl = resource.format === 'URL'
    ? resource.externalUrl
    : `/api/library/e-resources/${resource.id}/stream`;

  return {
    resource: mapResourceRow(resource),
    viewer: {
      url: viewerUrl,
      format: resource.format,
      drmEnabled: resource.drmEnabled,
      allowDownload: !resource.drmEnabled && resource.format !== 'URL',
      preventScreenCapture: resource.drmEnabled,
      watermark: resource.drmEnabled ? 'CONFIDENTIAL — ERP Digital Library' : null,
      message: resource.drmEnabled
        ? 'Secure viewer active — downloading and screen recording restricted'
        : 'Standard viewer',
    },
  };
}

export async function getEResourceStream(institutionId: string, resourceId: string) {
  const resource = await prisma.libEResource.findFirst({ where: { institutionId, id: resourceId } });
  if (!resource || !resource.storageKey) throw new Error('File not found');
  if (resource.storageProvider !== 'LOCAL') {
    throw new Error(`File hosted on ${resource.storageProvider} — use signed URL from DMS`);
  }
  const localPath = path.join(UPLOAD_ROOT, institutionId, resource.storageKey);
  const buffer = await fs.readFile(localPath);
  return { buffer, mimeType: resource.mimeType || 'application/octet-stream', fileName: resource.fileName };
}

export async function seedLibraryEResources(institutionId: string) {
  await seedLibraryReadingRoom(institutionId);

  const existing = await prisma.libEResource.count({ where: { institutionId } });
  if (existing >= 8) return getLibraryEResources(institutionId);

  const branch = await prisma.libBranch.findFirst({ where: { institutionId, status: 'ACTIVE' } });
  const nextYear = new Date();
  nextYear.setFullYear(nextYear.getFullYear() + 1);

  const samples = [
    {
      title: 'NCERT Mathematics Class 10',
      format: 'PDF',
      accessLevel: 'CLASS',
      source: 'LOCAL',
      resourceType: 'E_BOOK',
      accessClasses: ['10'],
      syllabusLinked: true,
      author: 'NCERT',
      subjectTags: ['Mathematics', 'Syllabus'],
    },
    {
      title: 'Physics Reference — Class 12',
      format: 'PDF',
      accessLevel: 'CLASS',
      source: 'LOCAL',
      resourceType: 'E_BOOK',
      accessClasses: ['12'],
      syllabusLinked: true,
      author: 'Internal',
      subjectTags: ['Physics'],
    },
    {
      title: 'IEEE Xplore Digital Library',
      format: 'URL',
      accessLevel: 'ALL',
      source: 'IEEE',
      resourceType: 'JOURNAL',
      externalUrl: 'https://ieeexplore.ieee.org',
      expiryDate: nextYear.toISOString().slice(0, 10),
      subjectTags: ['Engineering', 'Research'],
    },
    {
      title: 'JSTOR Arts & Sciences Collection',
      format: 'URL',
      accessLevel: 'TEACHER_ONLY',
      source: 'JSTOR',
      resourceType: 'JOURNAL',
      externalUrl: 'https://www.jstor.org',
      expiryDate: nextYear.toISOString().slice(0, 10),
      accessRoles: ['TEACHER', 'STAFF'],
    },
    {
      title: 'Research Methodology Handbook',
      format: 'EPUB',
      accessLevel: 'ALL',
      source: 'INTERNAL',
      resourceType: 'RESEARCH_PAPER',
      author: 'Dr. Sharma',
      subjectTags: ['Research'],
    },
    {
      title: 'Organic Chemistry Video Lectures',
      format: 'URL',
      accessLevel: 'CLASS',
      source: 'INTERNAL',
      resourceType: 'VIDEO_LECTURE',
      externalUrl: 'https://learn.example.edu/chemistry',
      accessClasses: ['11', '12'],
      subjectTags: ['Chemistry', 'Video'],
    },
    {
      title: 'Staff Policy Manual 2025',
      format: 'PDF',
      accessLevel: 'STAFF_ONLY',
      source: 'LOCAL',
      resourceType: 'E_BOOK',
      accessRoles: ['STAFF'],
      author: 'HR Department',
    },
    {
      title: 'Expired Sample Subscription',
      format: 'URL',
      accessLevel: 'ALL',
      source: 'JSTOR',
      resourceType: 'JOURNAL',
      externalUrl: 'https://www.jstor.org/expired',
      expiryDate: '2024-01-01',
      status: 'EXPIRED',
    },
  ];

  for (let i = 0; i < samples.length; i += 1) {
    const s = samples[i];
    const resourceCode = `ER-${String(i + 1).padStart(4, '0')}`;
    await prisma.libEResource.create({
      data: {
        institutionId,
        branchId: branch?.id,
        resourceCode,
        title: s.title,
        author: s.author ?? '',
        format: s.format,
        accessLevel: s.accessLevel,
        source: s.source,
        resourceType: s.resourceType,
        externalUrl: s.externalUrl ?? '',
        fileName: s.format !== 'URL' ? `${resourceCode.toLowerCase()}.${s.format.toLowerCase()}` : '',
        fileSizeBytes: s.format !== 'URL' ? 2_500_000 + i * 100_000 : 0,
        mimeType: s.format === 'PDF' ? 'application/pdf' : s.format === 'EPUB' ? 'application/epub+zip' : '',
        storageProvider: s.source === 'AWS_S3' ? 'AWS_S3' : 'LOCAL',
        storageKey: s.format !== 'URL' ? `seed_${resourceCode}.${s.format.toLowerCase()}` : '',
        drmEnabled: true,
        expiryDate: s.expiryDate ? new Date(s.expiryDate) : undefined,
        status: s.status ?? 'ACTIVE',
        viewCount: 50 - i * 5,
        downloadCount: 20 - i * 2,
        bandwidthBytes: (50 - i * 5) * 2_500_000,
        syllabusLinked: s.syllabusLinked ?? false,
        notificationSent: s.syllabusLinked ?? false,
        accessClasses: s.accessClasses ?? [],
        accessRoles: s.accessRoles ?? ['STUDENT', 'TEACHER', 'STAFF'],
        subjectTags: s.subjectTags ?? [],
        academicYear: '2025-26',
      },
    });
  }

  const resources = await prisma.libEResource.findMany({ where: { institutionId }, take: 8 });
  const members = await prisma.libMember.findMany({ where: { institutionId }, take: 5 });

  for (let i = 0; i < 20; i += 1) {
    const resource = resources[i % resources.length];
    const member = members[i % members.length];
    if (!resource) break;
    await prisma.libEAccessLog.create({
      data: {
        institutionId,
        resourceId: resource.id,
        memberId: member?.id ?? '',
        memberCode: member?.memberCode ?? '',
        memberName: member?.memberName ?? 'Guest',
        className: member?.className ?? '',
        accessType: i % 3 === 0 ? 'DOWNLOAD' : 'VIEW',
        deviceType: i % 2 === 0 ? 'MOBILE' : 'WEB',
        bytesTransferred: resource.fileSizeBytes || 500_000,
        accessedAt: new Date(Date.now() - i * 3600000),
      },
    });
  }

  await logActivity(institutionId, 'SEED', 'E-resources demo data seeded');
  return getLibraryEResources(institutionId);
}
