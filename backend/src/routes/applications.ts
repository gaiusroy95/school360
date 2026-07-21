import { Router } from 'express';
import { z } from 'zod';
import {
  ApplicationDocumentType,
  ApplicationStatus,
  EnquiryActivityType,
  EnquiryStatus,
  Prisma,
} from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { getDefaultInstitutionId } from '../lib/institution.js';
import { requireAuth } from '../middleware/auth.js';
import { requireApprover } from '../middleware/roles.js';
import { ensureAdmissionRecordForApprovedApp } from '../lib/admissionRecords.js';
import {
  isKnownDocumentType,
  parseApplicationFormDocuments,
} from '../lib/applicationDocuments.js';

export const applicationsRouter = Router();
applicationsRouter.use(requireAuth);

const STATUS_UI_TO_DB: Record<string, ApplicationStatus> = {
  'Pending Verification': ApplicationStatus.PENDING_VERIFICATION,
  Verified: ApplicationStatus.VERIFIED,
  Approved: ApplicationStatus.APPROVED,
  Rejected: ApplicationStatus.REJECTED,
  PENDING_VERIFICATION: ApplicationStatus.PENDING_VERIFICATION,
  VERIFIED: ApplicationStatus.VERIFIED,
  APPROVED: ApplicationStatus.APPROVED,
  REJECTED: ApplicationStatus.REJECTED,
};

const STATUS_DB_TO_UI: Record<ApplicationStatus, string> = {
  PENDING_VERIFICATION: 'Pending Verification',
  VERIFIED: 'Verified',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

const DOC_TYPE_UI_TO_DB: Record<string, ApplicationDocumentType> = {
  'Birth Certificate': ApplicationDocumentType.BIRTH_CERTIFICATE,
  'Previous Marksheet': ApplicationDocumentType.PREVIOUS_MARKSHEET,
  'Address Proof': ApplicationDocumentType.ADDRESS_PROOF,
  Other: ApplicationDocumentType.OTHER,
  BIRTH_CERTIFICATE: ApplicationDocumentType.BIRTH_CERTIFICATE,
  PREVIOUS_MARKSHEET: ApplicationDocumentType.PREVIOUS_MARKSHEET,
  ADDRESS_PROOF: ApplicationDocumentType.ADDRESS_PROOF,
  OTHER: ApplicationDocumentType.OTHER,
};

const DOC_TYPE_DB_TO_UI: Record<ApplicationDocumentType, string> = {
  BIRTH_CERTIFICATE: 'Birth Certificate',
  PREVIOUS_MARKSHEET: 'Previous Marksheet',
  ADDRESS_PROOF: 'Address Proof',
  OTHER: 'Other',
};

const COMPARISON_FIELDS = [
  { key: 'studentName', label: 'Student Name', formKey: 'studentName' as const },
  { key: 'dateOfBirth', label: 'Date of Birth', formKey: 'dateOfBirth' as const },
  { key: 'fatherName', label: "Father's Name", formKey: 'fatherName' as const },
  { key: 'placeOfBirth', label: 'Place of Birth', formKey: 'placeOfBirth' as const },
] as const;

function toStatus(value?: string | null): ApplicationStatus {
  if (!value) return ApplicationStatus.PENDING_VERIFICATION;
  return STATUS_UI_TO_DB[value] || ApplicationStatus.PENDING_VERIFICATION;
}

function toDocType(value?: string | null): ApplicationDocumentType {
  if (!value) return ApplicationDocumentType.OTHER;
  return DOC_TYPE_UI_TO_DB[value] || ApplicationDocumentType.OTHER;
}

function parseOptionalDate(value?: string | Date | null): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const raw = String(value).trim();
  if (!raw) return null;
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDate(d: Date | null | undefined): string {
  if (!d) return '';
  return d.toISOString().slice(0, 10);
}

function normalizeCompare(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function buildVerification(app: {
  studentName: string;
  dateOfBirth: Date | null;
  fatherName: string;
  placeOfBirth: string;
  documents: Array<{ extractedFields: unknown }>;
}) {
  const formValues: Record<string, string> = {
    studentName: app.studentName,
    dateOfBirth: formatDate(app.dateOfBirth),
    fatherName: app.fatherName,
    placeOfBirth: app.placeOfBirth,
  };

  const mergedExtracted: Record<string, string> = {};
  for (const doc of app.documents) {
    const fields = (doc.extractedFields || {}) as Record<string, string>;
    for (const [k, v] of Object.entries(fields)) {
      if (v) mergedExtracted[k] = String(v);
    }
  }

  const fields = COMPARISON_FIELDS.map((f) => {
    const formValue = formValues[f.formKey] || '';
    const documentValue = mergedExtracted[f.key] || '';
    const match =
      !documentValue || !formValue
        ? documentValue === formValue
        : normalizeCompare(documentValue) === normalizeCompare(formValue);
    return {
      key: f.key,
      label: f.label,
      formValue,
      documentValue,
      match,
    };
  });

  const comparable = fields.filter((f) => f.formValue && f.documentValue);
  const matched = comparable.filter((f) => f.match).length;
  const verificationScore =
    comparable.length > 0 ? Math.round((matched / comparable.length) * 100) : 0;

  return { fields, verificationScore, mismatches: fields.filter((f) => !f.match && f.documentValue) };
}

function serializeDocument(d: {
  id: string;
  type: ApplicationDocumentType;
  fileName: string;
  mimeType: string;
  extractedFields: unknown;
  uploadedAt: Date;
  uploadedBy: string;
}) {
  const extracted = (d.extractedFields || {}) as Record<string, string>;
  const customLabel = extracted.documentLabel?.trim();
  const typeLabel =
    d.type === ApplicationDocumentType.OTHER && customLabel
      ? customLabel
      : DOC_TYPE_DB_TO_UI[d.type];
  return {
    id: d.id,
    type: typeLabel,
    fileName: d.fileName,
    mimeType: d.mimeType,
    extractedFields: extracted,
    uploadedAt: d.uploadedAt.toISOString(),
    uploadedBy: d.uploadedBy,
  };
}

function serializeApplication(
  app: {
    id: string;
    applicationId: string;
    enquiryId: string | null;
    submittedAt: Date;
    submittedBy: string;
    studentName: string;
    dateOfBirth: Date | null;
    fatherName: string;
    motherName: string;
    placeOfBirth: string;
    classApplied: string;
    mobile: string;
    email: string;
    address: string;
    entranceTestScore: number | null;
    entranceTestMax: number | null;
    status: ApplicationStatus;
    reviewedBy: string | null;
    reviewedAt: Date | null;
    approvalRemarks: string | null;
    rejectionRemarks: string | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
    enquiry?: { enquiryId: string; enquirerName: string } | null;
    documents: Array<{
      id: string;
      type: ApplicationDocumentType;
      fileName: string;
      mimeType: string;
      extractedFields: unknown;
      uploadedAt: Date;
      uploadedBy: string;
    }>;
  },
  includeFileData = false,
) {
  const verification = buildVerification(app);
  return {
    id: app.id,
    applicationId: app.applicationId,
    enquiryId: app.enquiryId,
    enquiryCode: app.enquiry?.enquiryId || '',
    enquiryName: app.enquiry?.enquirerName || '',
    submittedAt: app.submittedAt.toISOString(),
    submittedBy: app.submittedBy,
    studentName: app.studentName,
    dateOfBirth: formatDate(app.dateOfBirth),
    fatherName: app.fatherName,
    motherName: app.motherName,
    placeOfBirth: app.placeOfBirth,
    classApplied: app.classApplied,
    mobile: app.mobile,
    email: app.email,
    address: app.address,
    entranceTestScore: app.entranceTestScore,
    entranceTestMax: app.entranceTestMax ?? 100,
    status: STATUS_DB_TO_UI[app.status],
    reviewedBy: app.reviewedBy || '',
    reviewedAt: app.reviewedAt ? app.reviewedAt.toISOString() : '',
    approvalRemarks: app.approvalRemarks || '',
    rejectionRemarks: app.rejectionRemarks || '',
    notes: app.notes || '',
    verificationScore: verification.verificationScore,
    verificationFields: verification.fields,
    mismatches: verification.mismatches,
    documents: app.documents.map((d) => serializeDocument(d)),
    createdAt: app.createdAt.toISOString(),
    updatedAt: app.updatedAt.toISOString(),
    ...(includeFileData ? {} : {}),
  };
}

async function nextApplicationCode(institutionId: string) {
  const count = await prisma.application.count({ where: { institutionId } });
  return `APP${String(10000 + count + 1).padStart(5, '0')}`;
}

async function logEnquiryActivity(enquiryId: string, description: string, performedBy: string) {
  await prisma.enquiryActivity.create({
    data: {
      enquiryId,
      type: EnquiryActivityType.SYSTEM,
      description,
      performedBy,
    },
  });
}

const applicationBodySchema = z.object({
  enquiryId: z.string().optional().nullable(),
  studentName: z.string().min(1),
  dateOfBirth: z.string().optional().nullable(),
  fatherName: z.string().optional().nullable(),
  motherName: z.string().optional().nullable(),
  placeOfBirth: z.string().optional().nullable(),
  classApplied: z.string().optional().nullable(),
  mobile: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  entranceTestScore: z.number().optional().nullable(),
  entranceTestMax: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
  submittedBy: z.string().optional().nullable(),
});

const documentBodySchema = z.object({
  type: z.string(),
  fileName: z.string().min(1),
  mimeType: z.string().optional().nullable(),
  fileData: z.string().min(1),
  extractedFields: z.record(z.string()).optional().nullable(),
});

applicationsRouter.get('/meta', async (_req, res) => {
  const institutionId = await getDefaultInstitutionId();
  const institution = await prisma.institution.findUnique({
    where: { id: institutionId },
    include: { setup: true },
  });
  const applicationDocuments = parseApplicationFormDocuments(institution?.setup?.documentSetup);
  return res.json({
    statuses: Object.values(STATUS_DB_TO_UI),
    documentTypes: applicationDocuments.map((d) => d.name),
    applicationDocuments,
    comparisonFields: COMPARISON_FIELDS.map((f) => ({ key: f.key, label: f.label })),
  });
});

applicationsRouter.get('/', async (req, res) => {
  const institutionId = await getDefaultInstitutionId();
  const status = req.query.status ? String(req.query.status) : undefined;
  const q = req.query.q ? String(req.query.q).trim() : undefined;

  const where: Prisma.ApplicationWhereInput = { institutionId };
  if (status && status !== 'All') where.status = toStatus(status);
  if (q) {
    where.OR = [
      { studentName: { contains: q, mode: 'insensitive' } },
      { applicationId: { contains: q, mode: 'insensitive' } },
      { fatherName: { contains: q, mode: 'insensitive' } },
      { classApplied: { contains: q, mode: 'insensitive' } },
    ];
  }

  const applications = await prisma.application.findMany({
    where,
    orderBy: { submittedAt: 'desc' },
    include: {
      enquiry: { select: { enquiryId: true, enquirerName: true } },
      documents: { select: { id: true, type: true, fileName: true, mimeType: true, extractedFields: true, uploadedAt: true, uploadedBy: true } },
    },
  });

  return res.json({
    applications: applications.map((a) => serializeApplication(a)),
    total: applications.length,
  });
});

applicationsRouter.get('/:id', async (req, res) => {
  const institutionId = await getDefaultInstitutionId();
  const app = await prisma.application.findFirst({
    where: { id: req.params.id, institutionId },
    include: {
      enquiry: { select: { enquiryId: true, enquirerName: true } },
      documents: true,
    },
  });
  if (!app) return res.status(404).json({ error: 'Application not found' });
  return res.json({ application: serializeApplication(app) });
});

applicationsRouter.get('/:id/documents/:docId/file', async (req, res) => {
  const institutionId = await getDefaultInstitutionId();
  const app = await prisma.application.findFirst({
    where: { id: req.params.id, institutionId },
    select: { id: true },
  });
  if (!app) return res.status(404).json({ error: 'Application not found' });

  const doc = await prisma.applicationDocument.findFirst({
    where: { id: req.params.docId, applicationId: app.id },
  });
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  const buf = Buffer.from(doc.fileData, 'base64');
  res.setHeader('Content-Type', doc.mimeType);
  res.setHeader('Content-Disposition', `inline; filename="${doc.fileName}"`);
  return res.send(buf);
});

applicationsRouter.post('/', async (req, res) => {
  const parsed = applicationBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const institutionId = await getDefaultInstitutionId();
  const data = parsed.data;
  const performer = data.submittedBy || req.user?.email || 'Counselor';

  let enquiry = null;
  if (data.enquiryId) {
    enquiry = await prisma.enquiry.findFirst({
      where: { id: data.enquiryId, institutionId },
    });
    if (!enquiry) return res.status(400).json({ error: 'Linked enquiry not found' });
  }

  const applicationId = await nextApplicationCode(institutionId);
  const created = await prisma.application.create({
    data: {
      institutionId,
      enquiryId: enquiry?.id,
      applicationId,
      submittedBy: performer,
      studentName: data.studentName,
      dateOfBirth: parseOptionalDate(data.dateOfBirth),
      fatherName: data.fatherName || '',
      motherName: data.motherName || '',
      placeOfBirth: data.placeOfBirth || '',
      classApplied: data.classApplied || enquiry?.classInterested || '',
      mobile: data.mobile || enquiry?.mobile || '',
      email: data.email || enquiry?.email || '',
      address: data.address || '',
      entranceTestScore: data.entranceTestScore ?? null,
      entranceTestMax: data.entranceTestMax ?? 100,
      notes: data.notes || '',
      status: ApplicationStatus.PENDING_VERIFICATION,
    },
    include: {
      enquiry: { select: { enquiryId: true, enquirerName: true } },
      documents: true,
    },
  });

  if (enquiry) {
    await prisma.enquiry.update({
      where: { id: enquiry.id },
      data: { status: EnquiryStatus.FOLLOW_UP },
    });
    await logEnquiryActivity(
      enquiry.id,
      `Application ${applicationId} submitted for ${data.studentName}`,
      performer,
    );
  }

  return res.status(201).json({ application: serializeApplication(created) });
});

applicationsRouter.post('/from-enquiry/:enquiryId', async (req, res) => {
  const institutionId = await getDefaultInstitutionId();
  const enquiry = await prisma.enquiry.findFirst({
    where: { id: req.params.enquiryId, institutionId },
  });
  if (!enquiry) return res.status(404).json({ error: 'Enquiry not found' });

  const existing = await prisma.application.findFirst({
    where: {
      enquiryId: enquiry.id,
      status: { not: ApplicationStatus.REJECTED },
    },
  });
  if (existing) {
    return res.status(409).json({
      error: 'An active application already exists for this enquiry',
      application: serializeApplication({
        ...existing,
        enquiry: { enquiryId: enquiry.enquiryId, enquirerName: enquiry.enquirerName },
        documents: [],
      }),
    });
  }

  const notes = req.body?.notes ? String(req.body.notes) : '';
  const performer = req.body?.submittedBy || req.user?.email || 'Counselor';
  const applicationId = await nextApplicationCode(institutionId);
  const body = req.body || {};

  const created = await prisma.application.create({
    data: {
      institutionId,
      enquiryId: enquiry.id,
      applicationId,
      submittedBy: performer,
      studentName: body.studentName ? String(body.studentName) : enquiry.enquirerName,
      dateOfBirth: parseOptionalDate(body.dateOfBirth),
      fatherName: body.fatherName ? String(body.fatherName) : '',
      motherName: body.motherName ? String(body.motherName) : '',
      placeOfBirth: body.placeOfBirth ? String(body.placeOfBirth) : '',
      classApplied: body.classApplied ? String(body.classApplied) : enquiry.classInterested,
      mobile: body.mobile ? String(body.mobile) : enquiry.mobile,
      email: body.email ? String(body.email) : enquiry.email,
      address: body.address ? String(body.address) : '',
      notes,
      status: ApplicationStatus.PENDING_VERIFICATION,
    },
    include: {
      enquiry: { select: { enquiryId: true, enquirerName: true } },
      documents: true,
    },
  });

  await prisma.enquiry.update({
    where: { id: enquiry.id },
    data: { status: EnquiryStatus.FOLLOW_UP },
  });
  await logEnquiryActivity(
    enquiry.id,
    notes || `Application ${applicationId} created from enquiry ${enquiry.enquiryId}`,
    performer,
  );

  return res.status(201).json({ application: serializeApplication(created) });
});

applicationsRouter.patch('/:id', async (req, res) => {
  const parsed = applicationBodySchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const institutionId = await getDefaultInstitutionId();
  const existing = await prisma.application.findFirst({
    where: { id: req.params.id, institutionId },
  });
  if (!existing) return res.status(404).json({ error: 'Application not found' });
  if (existing.status === ApplicationStatus.APPROVED || existing.status === ApplicationStatus.REJECTED) {
    return res.status(400).json({ error: 'Cannot edit a finalized application' });
  }

  const data = parsed.data;
  const updated = await prisma.application.update({
    where: { id: existing.id },
    data: {
      studentName: data.studentName,
      dateOfBirth: data.dateOfBirth !== undefined ? parseOptionalDate(data.dateOfBirth) : undefined,
      fatherName: data.fatherName ?? undefined,
      motherName: data.motherName ?? undefined,
      placeOfBirth: data.placeOfBirth ?? undefined,
      classApplied: data.classApplied ?? undefined,
      mobile: data.mobile ?? undefined,
      email: data.email ?? undefined,
      address: data.address ?? undefined,
      entranceTestScore: data.entranceTestScore ?? undefined,
      entranceTestMax: data.entranceTestMax ?? undefined,
      notes: data.notes ?? undefined,
    },
    include: {
      enquiry: { select: { enquiryId: true, enquirerName: true } },
      documents: { select: { id: true, type: true, fileName: true, mimeType: true, extractedFields: true, uploadedAt: true, uploadedBy: true } },
    },
  });

  return res.json({ application: serializeApplication(updated) });
});

applicationsRouter.post('/:id/documents', async (req, res) => {
  const parsed = documentBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const institutionId = await getDefaultInstitutionId();
  const app = await prisma.application.findFirst({
    where: { id: req.params.id, institutionId },
  });
  if (!app) return res.status(404).json({ error: 'Application not found' });
  if (app.status === ApplicationStatus.APPROVED || app.status === ApplicationStatus.REJECTED) {
    return res.status(400).json({ error: 'Cannot upload documents to a finalized application' });
  }

  const data = parsed.data;
  const raw = data.fileData.includes(',') ? data.fileData.split(',')[1] : data.fileData;
  if (raw.length > 4_000_000) {
    return res.status(400).json({ error: 'File too large (max ~3MB)' });
  }
  const buf = Buffer.from(raw, 'base64');
  const mime = data.mimeType || 'application/octet-stream';
  if (mime.includes('pdf') || data.fileName.toLowerCase().endsWith('.pdf')) {
    if (!buf.subarray(0, 5).toString('utf8').startsWith('%PDF-')) {
      return res.status(400).json({ error: 'Invalid PDF file. Please upload a real PDF document.' });
    }
  }

  const doc = await prisma.applicationDocument.create({
    data: {
      applicationId: app.id,
      type: toDocType(data.type),
      fileName: data.fileName,
      mimeType: data.mimeType || 'application/octet-stream',
      fileData: raw,
      extractedFields: {
        ...(data.extractedFields || {}),
        ...(!isKnownDocumentType(data.type) && toDocType(data.type) === ApplicationDocumentType.OTHER
          ? { documentLabel: data.type.trim() }
          : {}),
      },
      uploadedBy: req.user?.email || 'Counselor',
    },
  });

  return res.status(201).json({ document: serializeDocument(doc) });
});

applicationsRouter.patch('/:id/documents/:docId', async (req, res) => {
  const institutionId = await getDefaultInstitutionId();
  const app = await prisma.application.findFirst({
    where: { id: req.params.id, institutionId },
  });
  if (!app) return res.status(404).json({ error: 'Application not found' });

  const extractedFields = req.body?.extractedFields as Record<string, string> | undefined;
  if (!extractedFields) {
    return res.status(400).json({ error: 'extractedFields is required' });
  }

  const doc = await prisma.applicationDocument.update({
    where: { id: req.params.docId, applicationId: app.id },
    data: { extractedFields },
  });

  const full = await prisma.application.findFirst({
    where: { id: app.id },
    include: {
      enquiry: { select: { enquiryId: true, enquirerName: true } },
      documents: { select: { id: true, type: true, fileName: true, mimeType: true, extractedFields: true, uploadedAt: true, uploadedBy: true } },
    },
  });

  return res.json({
    document: serializeDocument(doc),
    application: full ? serializeApplication(full) : null,
  });
});

applicationsRouter.delete('/:id/documents/:docId', async (req, res) => {
  const institutionId = await getDefaultInstitutionId();
  const app = await prisma.application.findFirst({
    where: { id: req.params.id, institutionId },
  });
  if (!app) return res.status(404).json({ error: 'Application not found' });
  if (app.status === ApplicationStatus.APPROVED || app.status === ApplicationStatus.REJECTED) {
    return res.status(400).json({ error: 'Cannot delete documents from a finalized application' });
  }

  const doc = await prisma.applicationDocument.findFirst({
    where: { id: req.params.docId, applicationId: app.id },
  });
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  await prisma.applicationDocument.delete({ where: { id: doc.id } });

  const full = await prisma.application.findFirst({
    where: { id: app.id },
    include: {
      enquiry: { select: { enquiryId: true, enquirerName: true } },
      documents: { select: { id: true, type: true, fileName: true, mimeType: true, extractedFields: true, uploadedAt: true, uploadedBy: true } },
    },
  });

  return res.json({ ok: true, application: full ? serializeApplication(full) : null });
});

applicationsRouter.patch('/:id/verify', async (req, res) => {
  const institutionId = await getDefaultInstitutionId();
  const app = await prisma.application.findFirst({
    where: { id: req.params.id, institutionId },
    include: { documents: true },
  });
  if (!app) return res.status(404).json({ error: 'Application not found' });
  if (app.status !== ApplicationStatus.PENDING_VERIFICATION) {
    return res.status(400).json({ error: 'Only pending applications can be verified' });
  }

  const updated = await prisma.application.update({
    where: { id: app.id },
    data: { status: ApplicationStatus.VERIFIED },
    include: {
      enquiry: { select: { enquiryId: true, enquirerName: true } },
      documents: { select: { id: true, type: true, fileName: true, mimeType: true, extractedFields: true, uploadedAt: true, uploadedBy: true } },
    },
  });

  if (app.enquiryId) {
    await logEnquiryActivity(
      app.enquiryId,
      `Application ${app.applicationId} marked as verified`,
      req.user?.email || 'Reviewer',
    );
  }

  return res.json({ application: serializeApplication(updated) });
});

applicationsRouter.patch('/:id/approve', requireApprover, async (req, res) => {
  const remarks = req.body?.remarks ? String(req.body.remarks) : '';
  const institutionId = await getDefaultInstitutionId();
  const app = await prisma.application.findFirst({
    where: { id: req.params.id, institutionId },
    include: { documents: true },
  });
  if (!app) return res.status(404).json({ error: 'Application not found' });
  if (app.status === ApplicationStatus.APPROVED || app.status === ApplicationStatus.REJECTED) {
    return res.status(400).json({ error: 'Application is already finalized' });
  }
  if (app.entranceTestScore == null) {
    return res.status(400).json({
      error: 'Entrance test score is required before approving admission',
    });
  }

  const reviewer = req.user?.email || 'Principal';
  const updated = await prisma.application.update({
    where: { id: app.id },
    data: {
      status: ApplicationStatus.APPROVED,
      reviewedBy: reviewer,
      reviewedAt: new Date(),
      approvalRemarks: remarks,
      rejectionRemarks: null,
    },
    include: {
      enquiry: { select: { enquiryId: true, enquirerName: true } },
      documents: { select: { id: true, type: true, fileName: true, mimeType: true, extractedFields: true, uploadedAt: true, uploadedBy: true } },
    },
  });

  if (app.enquiryId) {
    await prisma.enquiry.update({
      where: { id: app.enquiryId },
      data: { status: EnquiryStatus.CONVERTED },
    });
    await logEnquiryActivity(
      app.enquiryId,
      `Application ${app.applicationId} approved for admission (score: ${app.entranceTestScore})`,
      reviewer,
    );
  }

  await ensureAdmissionRecordForApprovedApp(updated.id, institutionId);

  return res.json({ application: serializeApplication(updated) });
});

applicationsRouter.patch('/:id/reject', requireApprover, async (req, res) => {
  const remarks = req.body?.remarks ? String(req.body.remarks).trim() : '';
  if (!remarks) {
    return res.status(400).json({ error: 'Rejection remarks are required' });
  }

  const institutionId = await getDefaultInstitutionId();
  const app = await prisma.application.findFirst({
    where: { id: req.params.id, institutionId },
  });
  if (!app) return res.status(404).json({ error: 'Application not found' });
  if (app.status === ApplicationStatus.APPROVED || app.status === ApplicationStatus.REJECTED) {
    return res.status(400).json({ error: 'Application is already finalized' });
  }

  const reviewer = req.user?.email || 'Principal';
  const updated = await prisma.application.update({
    where: { id: app.id },
    data: {
      status: ApplicationStatus.REJECTED,
      reviewedBy: reviewer,
      reviewedAt: new Date(),
      rejectionRemarks: remarks,
      approvalRemarks: null,
    },
    include: {
      enquiry: { select: { enquiryId: true, enquirerName: true } },
      documents: { select: { id: true, type: true, fileName: true, mimeType: true, extractedFields: true, uploadedAt: true, uploadedBy: true } },
    },
  });

  if (app.enquiryId) {
    await logEnquiryActivity(
      app.enquiryId,
      `Application ${app.applicationId} rejected: ${remarks}`,
      reviewer,
    );
  }

  return res.json({ application: serializeApplication(updated) });
});
