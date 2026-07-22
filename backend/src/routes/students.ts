import { Router } from 'express';
import { z } from 'zod';
import { Prisma, StudentGender, StudentStatus } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { getDefaultInstitutionId } from '../lib/institution.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import {
  DEFAULT_YEAR,
  buildStudentProfileBundle,
  createStudentFromAdmissionRecord,
  generateStudentAdmissionNumber,
  getInstitutionFilterMeta,
  getStudentAnalytics,
  parseStudentGender,
  parseStudentStatus,
  serializeStudent,
  splitFullName,
  syncStudentsFromConfirmedAdmissions,
} from '../lib/students.js';

export const studentsRouter = Router();
studentsRouter.use(requireAuth);

const createSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  bloodGroup: z.string().optional(),
  aadhaarNumber: z.string().optional(),
  religion: z.string().optional(),
  nationality: z.string().optional().default('Indian'),
  category: z.string().optional().default('General'),
  placeOfBirth: z.string().optional(),
  address: z.string().optional(),
  mobile: z.string().optional(),
  email: z.string().optional(),
  className: z.string().min(1),
  sectionName: z.string().optional(),
  academicYear: z.string().optional(),
  house: z.string().optional(),
  rollNumber: z.string().optional(),
  rfidTag: z.string().optional(),
  fatherName: z.string().optional(),
  fatherMobile: z.string().optional(),
  motherName: z.string().optional(),
  motherMobile: z.string().optional(),
  status: z.string().optional(),
  admissionNumber: z.string().optional(),
  entranceScore: z.number().optional(),
  documents: z.record(z.unknown()).optional(),
  customFields: z.record(z.unknown()).optional(),
});

const updateSchema = createSchema.partial();

const importRowSchema = z.object({
  admissionNumber: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  fullName: z.string().optional(),
  studentName: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  bloodGroup: z.string().optional(),
  aadhaarNumber: z.string().optional(),
  religion: z.string().optional(),
  nationality: z.string().optional(),
  category: z.string().optional(),
  address: z.string().optional(),
  mobile: z.string().optional(),
  email: z.string().optional(),
  className: z.string().optional(),
  class: z.string().optional(),
  sectionName: z.string().optional(),
  section: z.string().optional(),
  academicYear: z.string().optional(),
  house: z.string().optional(),
  rollNumber: z.string().optional(),
  rollNo: z.string().optional(),
  rfidTag: z.string().optional(),
  fatherName: z.string().optional(),
  fatherMobile: z.string().optional(),
  motherName: z.string().optional(),
  motherMobile: z.string().optional(),
  status: z.string().optional(),
  entranceScore: z.union([z.number(), z.string()]).optional(),
});

function parseDateInput(v?: string): Date | undefined {
  if (!v?.trim()) return undefined;
  const d = new Date(v.trim());
  if (!Number.isNaN(d.getTime())) return d;
  const m = v.trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (m) {
    const parsed = new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1])));
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return undefined;
}

studentsRouter.get(
  '/meta',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await syncStudentsFromConfirmedAdmissions(institutionId);
    const filters = await getInstitutionFilterMeta(institutionId);
    const analytics = await getStudentAnalytics(institutionId, filters.defaultAcademicYear);
    return res.json({ filters, summary: analytics.summary });
  }),
);

studentsRouter.get(
  '/analytics',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      academicYear: z.string().optional().default(DEFAULT_YEAR),
    });
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    const analytics = await getStudentAnalytics(institutionId, parsed.data.academicYear);
    return res.json(analytics);
  }),
);

studentsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      academicYear: z.string().optional(),
      className: z.string().optional(),
      sectionName: z.string().optional(),
      house: z.string().optional(),
      gender: z.string().optional(),
      status: z.string().optional(),
      category: z.string().optional(),
      q: z.string().optional(),
      page: z.coerce.number().int().min(1).optional().default(1),
      pageSize: z.coerce.number().int().min(1).max(500).optional().default(50),
      viewAll: z.enum(['true', 'false']).optional(),
    });
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    await syncStudentsFromConfirmedAdmissions(institutionId);

    const statusFilter = parseStudentStatus(parsed.data.status);
    const genderFilter = parseStudentGender(parsed.data.gender);

    const where = {
      institutionId,
      ...(parsed.data.academicYear ? { academicYear: parsed.data.academicYear } : {}),
      ...(parsed.data.className ? { className: parsed.data.className } : {}),
      ...(parsed.data.sectionName ? { sectionName: parsed.data.sectionName } : {}),
      ...(parsed.data.house ? { house: parsed.data.house } : {}),
      ...(parsed.data.category ? { category: parsed.data.category } : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(genderFilter ? { gender: genderFilter } : {}),
      ...(parsed.data.q
        ? {
            OR: [
              { firstName: { contains: parsed.data.q, mode: 'insensitive' as const } },
              { lastName: { contains: parsed.data.q, mode: 'insensitive' as const } },
              { admissionNumber: { contains: parsed.data.q, mode: 'insensitive' as const } },
              { rollNumber: { contains: parsed.data.q, mode: 'insensitive' as const } },
              { mobile: { contains: parsed.data.q, mode: 'insensitive' as const } },
              { fatherName: { contains: parsed.data.q, mode: 'insensitive' as const } },
              { className: { contains: parsed.data.q, mode: 'insensitive' as const } },
              { sectionName: { contains: parsed.data.q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [total, active, inactive, passout, transferred, totalAll] = await Promise.all([
      prisma.student.count({ where }),
      prisma.student.count({
        where: { ...where, status: StudentStatus.ACTIVE },
      }),
      prisma.student.count({
        where: { ...where, status: StudentStatus.INACTIVE },
      }),
      prisma.student.count({
        where: { ...where, status: StudentStatus.PASSOUT },
      }),
      prisma.student.count({
        where: { ...where, status: StudentStatus.TRANSFERRED },
      }),
      prisma.student.count({ where: { institutionId } }),
    ]);

    const page = parsed.data.page;
    const pageSize = parsed.data.viewAll === 'true' ? Math.min(total, 5000) : parsed.data.pageSize;
    const skip = (page - 1) * pageSize;

    const rows = await prisma.student.findMany({
      where,
      orderBy: [{ className: 'asc' }, { sectionName: 'asc' }, { rollNumber: 'asc' }, { firstName: 'asc' }],
      skip,
      take: pageSize,
    });

    return res.json({
      students: rows.map(serializeStudent),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
      tabCounts: {
        all: total,
        active,
        inactive,
        passout,
        transferred,
      },
      institutionTotal: totalAll,
    });
  }),
);

studentsRouter.get(
  '/export/data',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      academicYear: z.string().optional(),
      className: z.string().optional(),
      sectionName: z.string().optional(),
      status: z.string().optional(),
    });
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    const statusFilter = parseStudentStatus(parsed.data.status);

    const rows = await prisma.student.findMany({
      where: {
        institutionId,
        ...(parsed.data.academicYear ? { academicYear: parsed.data.academicYear } : {}),
        ...(parsed.data.className ? { className: parsed.data.className } : {}),
        ...(parsed.data.sectionName ? { sectionName: parsed.data.sectionName } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
      },
      orderBy: [{ className: 'asc' }, { sectionName: 'asc' }, { rollNumber: 'asc' }],
    });

    return res.json({ students: rows.map(serializeStudent) });
  }),
);

studentsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const student = await prisma.student.findFirst({
      where: { id: req.params.id, institutionId },
    });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const feeReceipts = await prisma.feeReceipt.findMany({
      where: {
        institutionId,
        OR: [
          { admissionNumber: student.admissionNumber },
          ...(student.admissionRecordId ? [{ admissionRecordId: student.admissionRecordId }] : []),
        ],
      },
      orderBy: { collectedAt: 'desc' },
      take: 10,
      select: { amountPaid: true, collectedAt: true, feeBreakdown: true },
    });

    const bundle = buildStudentProfileBundle(student, feeReceipts);

    return res.json({
      student: serializeStudent(student),
      activities: bundle.activities,
      alerts: bundle.alerts,
      profile: bundle.profile,
    });
  }),
);

studentsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    const admissionNumber =
      parsed.data.admissionNumber?.trim() ||
      (await generateStudentAdmissionNumber(institutionId));

    const dup = await prisma.student.findFirst({
      where: { institutionId, admissionNumber },
    });
    if (dup) return res.status(400).json({ error: 'Admission number already exists' });

    const gender = parseStudentGender(parsed.data.gender) || StudentGender.OTHER;
    const status = parseStudentStatus(parsed.data.status) || StudentStatus.ACTIVE;

    const student = await prisma.student.create({
      data: {
        institutionId,
        admissionNumber,
        firstName: parsed.data.firstName.trim(),
        lastName: parsed.data.lastName?.trim() || '',
        dateOfBirth: parseDateInput(parsed.data.dateOfBirth),
        gender,
        bloodGroup: parsed.data.bloodGroup?.trim() || '',
        aadhaarNumber: parsed.data.aadhaarNumber?.trim() || '',
        religion: parsed.data.religion?.trim() || '',
        nationality: parsed.data.nationality?.trim() || 'Indian',
        category: parsed.data.category?.trim() || 'General',
        placeOfBirth: parsed.data.placeOfBirth?.trim() || '',
        address: parsed.data.address?.trim() || '',
        mobile: parsed.data.mobile?.trim() || '',
        email: parsed.data.email?.trim() || '',
        className: parsed.data.className.trim(),
        sectionName: parsed.data.sectionName?.trim() || '',
        academicYear: parsed.data.academicYear?.trim() || DEFAULT_YEAR,
        house: parsed.data.house?.trim() || '',
        rollNumber: parsed.data.rollNumber?.trim() || '',
        rfidTag: parsed.data.rfidTag?.trim() || '',
        fatherName: parsed.data.fatherName?.trim() || '',
        fatherMobile: parsed.data.fatherMobile?.trim() || '',
        motherName: parsed.data.motherName?.trim() || '',
        motherMobile: parsed.data.motherMobile?.trim() || '',
        status,
        entranceScore: parsed.data.entranceScore,
        documents: (parsed.data.documents || {}) as Prisma.InputJsonValue,
        customFields: (parsed.data.customFields || {}) as Prisma.InputJsonValue,
      },
    });

    return res.status(201).json({ student: serializeStudent(student) });
  }),
);

studentsRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const parsed = updateSchema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    const existing = await prisma.student.findFirst({
      where: { id: req.params.id, institutionId },
    });
    if (!existing) return res.status(404).json({ error: 'Student not found' });

    const gender = parsed.data.gender ? parseStudentGender(parsed.data.gender) : undefined;
    const status = parsed.data.status ? parseStudentStatus(parsed.data.status) : undefined;

    const student = await prisma.student.update({
      where: { id: existing.id },
      data: {
        ...(parsed.data.firstName !== undefined ? { firstName: parsed.data.firstName.trim() } : {}),
        ...(parsed.data.lastName !== undefined ? { lastName: parsed.data.lastName?.trim() || '' } : {}),
        ...(parsed.data.dateOfBirth !== undefined
          ? { dateOfBirth: parseDateInput(parsed.data.dateOfBirth) }
          : {}),
        ...(gender !== undefined ? { gender } : {}),
        ...(parsed.data.bloodGroup !== undefined ? { bloodGroup: parsed.data.bloodGroup.trim() } : {}),
        ...(parsed.data.aadhaarNumber !== undefined
          ? { aadhaarNumber: parsed.data.aadhaarNumber.trim() }
          : {}),
        ...(parsed.data.religion !== undefined ? { religion: parsed.data.religion.trim() } : {}),
        ...(parsed.data.nationality !== undefined
          ? { nationality: parsed.data.nationality.trim() }
          : {}),
        ...(parsed.data.category !== undefined ? { category: parsed.data.category.trim() } : {}),
        ...(parsed.data.placeOfBirth !== undefined
          ? { placeOfBirth: parsed.data.placeOfBirth.trim() }
          : {}),
        ...(parsed.data.address !== undefined ? { address: parsed.data.address.trim() } : {}),
        ...(parsed.data.mobile !== undefined ? { mobile: parsed.data.mobile.trim() } : {}),
        ...(parsed.data.email !== undefined ? { email: parsed.data.email.trim() } : {}),
        ...(parsed.data.className !== undefined ? { className: parsed.data.className.trim() } : {}),
        ...(parsed.data.sectionName !== undefined
          ? { sectionName: parsed.data.sectionName.trim() }
          : {}),
        ...(parsed.data.academicYear !== undefined
          ? { academicYear: parsed.data.academicYear.trim() }
          : {}),
        ...(parsed.data.house !== undefined ? { house: parsed.data.house.trim() } : {}),
        ...(parsed.data.rollNumber !== undefined
          ? { rollNumber: parsed.data.rollNumber.trim() }
          : {}),
        ...(parsed.data.rfidTag !== undefined ? { rfidTag: parsed.data.rfidTag.trim() } : {}),
        ...(parsed.data.fatherName !== undefined
          ? { fatherName: parsed.data.fatherName.trim() }
          : {}),
        ...(parsed.data.fatherMobile !== undefined
          ? { fatherMobile: parsed.data.fatherMobile.trim() }
          : {}),
        ...(parsed.data.motherName !== undefined
          ? { motherName: parsed.data.motherName.trim() }
          : {}),
        ...(parsed.data.motherMobile !== undefined
          ? { motherMobile: parsed.data.motherMobile.trim() }
          : {}),
        ...(status !== undefined ? { status } : {}),
        ...(parsed.data.entranceScore !== undefined
          ? { entranceScore: parsed.data.entranceScore }
          : {}),
        ...(parsed.data.documents !== undefined
          ? { documents: parsed.data.documents as Prisma.InputJsonValue }
          : {}),
        ...(parsed.data.customFields !== undefined
          ? { customFields: parsed.data.customFields as Prisma.InputJsonValue }
          : {}),
      },
    });

    return res.json({ student: serializeStudent(student) });
  }),
);

studentsRouter.post(
  '/from-admission/:admissionRecordId',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const student = await createStudentFromAdmissionRecord(req.params.admissionRecordId, institutionId);
    if (!student) {
      return res.status(400).json({
        error: 'Could not create student — admission must be confirmed with an admission number',
      });
    }
    return res.json({ student: serializeStudent(student) });
  }),
);

studentsRouter.post(
  '/sync-from-admissions',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const created = await syncStudentsFromConfirmedAdmissions(institutionId);
    return res.json({
      created,
      message:
        created > 0
          ? `Promoted ${created} confirmed admission(s) to student roster.`
          : 'All confirmed admissions are already in the student roster.',
    });
  }),
);

studentsRouter.post(
  '/import',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      rows: z.array(importRowSchema).min(1),
      academicYear: z.string().optional(),
      updateExisting: z.boolean().optional().default(false),
    });
    const parsed = schema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    const year = parsed.data.academicYear?.trim() || DEFAULT_YEAR;
    let created = 0;
    let updated = 0;
    const errors: { row: number; message: string }[] = [];

    for (let i = 0; i < parsed.data.rows.length; i++) {
      const row = parsed.data.rows[i];
      try {
        const full =
          row.fullName?.trim() ||
          row.studentName?.trim() ||
          [row.firstName, row.lastName].filter(Boolean).join(' ').trim();
        if (!full && !row.firstName?.trim()) {
          errors.push({ row: i + 2, message: 'Student name is required' });
          continue;
        }
        const { firstName, lastName } = row.firstName?.trim()
          ? { firstName: row.firstName.trim(), lastName: row.lastName?.trim() || '' }
          : splitFullName(full || '');

        const className = row.className?.trim() || row.class?.trim() || '';
        if (!className) {
          errors.push({ row: i + 2, message: 'Class is required' });
          continue;
        }

        const admissionNumber =
          row.admissionNumber?.trim() || (await generateStudentAdmissionNumber(institutionId));

        const data = {
          firstName,
          lastName,
          dateOfBirth: parseDateInput(row.dateOfBirth),
          gender: parseStudentGender(row.gender) || StudentGender.OTHER,
          bloodGroup: row.bloodGroup?.trim() || '',
          aadhaarNumber: row.aadhaarNumber?.trim() || '',
          religion: row.religion?.trim() || '',
          nationality: row.nationality?.trim() || 'Indian',
          category: row.category?.trim() || 'General',
          address: row.address?.trim() || '',
          mobile: row.mobile?.trim() || '',
          email: row.email?.trim() || '',
          className,
          sectionName: row.sectionName?.trim() || row.section?.trim() || '',
          academicYear: row.academicYear?.trim() || year,
          house: row.house?.trim() || '',
          rollNumber: row.rollNumber?.trim() || row.rollNo?.trim() || '',
          rfidTag: row.rfidTag?.trim() || '',
          fatherName: row.fatherName?.trim() || '',
          fatherMobile: row.fatherMobile?.trim() || '',
          motherName: row.motherName?.trim() || '',
          motherMobile: row.motherMobile?.trim() || '',
          status: parseStudentStatus(row.status) || StudentStatus.ACTIVE,
          entranceScore:
            row.entranceScore != null && row.entranceScore !== ''
              ? Number(row.entranceScore)
              : undefined,
        };

        const existing = await prisma.student.findFirst({
          where: { institutionId, admissionNumber },
        });

        if (existing) {
          if (parsed.data.updateExisting) {
            await prisma.student.update({ where: { id: existing.id }, data });
            updated += 1;
          } else {
            errors.push({ row: i + 2, message: `Admission number ${admissionNumber} already exists` });
          }
        } else {
          await prisma.student.create({
            data: { institutionId, admissionNumber, ...data },
          });
          created += 1;
        }
      } catch (e) {
        errors.push({
          row: i + 2,
          message: e instanceof Error ? e.message : 'Import failed',
        });
      }
    }

    return res.json({ created, updated, errors, total: parsed.data.rows.length });
  }),
);
