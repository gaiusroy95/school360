import { Router } from 'express';
import { z } from 'zod';
import { AdmissionRecordStatus } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { getDefaultInstitutionId } from '../lib/institution.js';
import { requireAuth } from '../middleware/auth.js';
import { requireApprover } from '../middleware/roles.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import {
  ensureAdmissionRecordForApprovedApp,
  generateAdmissionNumber,
  serializeAdmissionRecord,
  syncAdmissionRecordsForInstitution,
} from '../lib/admissionRecords.js';
import { createStudentFromAdmissionRecord } from '../lib/students.js';

export const admissionsRouter = Router();
admissionsRouter.use(requireAuth);

const DEFAULT_YEAR = '2025-26';

admissionsRouter.get(
  '/meta',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await syncAdmissionRecordsForInstitution(institutionId);

    const [pending, confirmed, totalApproved] = await Promise.all([
      prisma.admissionRecord.count({
        where: { institutionId, status: AdmissionRecordStatus.PENDING_CONFIRMATION },
      }),
      prisma.admissionRecord.count({
        where: { institutionId, status: AdmissionRecordStatus.CONFIRMED },
      }),
      prisma.application.count({
        where: { institutionId, status: 'APPROVED' },
      }),
    ]);

    const years = await prisma.admissionRecord.findMany({
      where: { institutionId },
      select: { academicYear: true },
      distinct: ['academicYear'],
      orderBy: { academicYear: 'desc' },
    });

    const classes = await prisma.admissionRecord.findMany({
      where: { institutionId },
      select: { className: true },
      distinct: ['className'],
      orderBy: { className: 'asc' },
    });

    return res.json({
      defaultAcademicYear: DEFAULT_YEAR,
      academicYears: [...new Set([DEFAULT_YEAR, ...years.map((y) => y.academicYear)])],
      classes: classes.map((c) => c.className).filter(Boolean),
      summary: {
        principalApproved: totalApproved,
        pendingConfirmation: pending,
        confirmedAdmissions: confirmed,
      },
    });
  }),
);

admissionsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      academicYear: z.string().optional().default(DEFAULT_YEAR),
      status: z
        .enum(['all', 'Pending Confirmation', 'Confirmed', 'PENDING_CONFIRMATION', 'CONFIRMED'])
        .optional()
        .default('all'),
      className: z.string().optional(),
      q: z.string().optional(),
    });
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    await syncAdmissionRecordsForInstitution(institutionId);

    const statusFilter =
      parsed.data.status === 'Pending Confirmation' ||
      parsed.data.status === 'PENDING_CONFIRMATION'
        ? AdmissionRecordStatus.PENDING_CONFIRMATION
        : parsed.data.status === 'Confirmed' || parsed.data.status === 'CONFIRMED'
          ? AdmissionRecordStatus.CONFIRMED
          : undefined;

    const records = await prisma.admissionRecord.findMany({
      where: {
        institutionId,
        academicYear: parsed.data.academicYear,
        ...(parsed.data.className ? { className: parsed.data.className } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(parsed.data.q
          ? {
              OR: [
                { admissionNumber: { contains: parsed.data.q, mode: 'insensitive' } },
                { application: { studentName: { contains: parsed.data.q, mode: 'insensitive' } } },
                { application: { applicationId: { contains: parsed.data.q, mode: 'insensitive' } } },
                { className: { contains: parsed.data.q, mode: 'insensitive' } },
                { sectionName: { contains: parsed.data.q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        application: {
          select: {
            id: true,
            applicationId: true,
            studentName: true,
            classApplied: true,
            fatherName: true,
            motherName: true,
            mobile: true,
            email: true,
            entranceTestScore: true,
            reviewedBy: true,
            reviewedAt: true,
            approvalRemarks: true,
            status: true,
          },
        },
      },
      orderBy: [
        { status: 'asc' },
        { principalApprovedAt: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    const appIds = records.map((r) => r.applicationId);
    const seats = await prisma.seatAllocation.findMany({
      where: { applicationId: { in: appIds } },
    });
    const seatByApp = new Map(seats.map((s) => [s.applicationId, s]));

    const admissions = records.map((r) =>
      serializeAdmissionRecord(r, seatByApp.get(r.applicationId) || null),
    );

    const pending = admissions.filter((a) => a.statusKey === 'PENDING_CONFIRMATION').length;
    const confirmed = admissions.filter((a) => a.statusKey === 'CONFIRMED').length;

    return res.json({
      academicYear: parsed.data.academicYear,
      summary: { total: admissions.length, pending, confirmed },
      admissions,
    });
  }),
);

admissionsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const record = await prisma.admissionRecord.findFirst({
      where: { id: req.params.id, institutionId },
      include: {
        application: {
          select: {
            id: true,
            applicationId: true,
            studentName: true,
            classApplied: true,
            fatherName: true,
            motherName: true,
            mobile: true,
            email: true,
            entranceTestScore: true,
            reviewedBy: true,
            reviewedAt: true,
            approvalRemarks: true,
            status: true,
            dateOfBirth: true,
            address: true,
          },
        },
      },
    });
    if (!record) return res.status(404).json({ error: 'Admission record not found' });

    const seat = await prisma.seatAllocation.findUnique({
      where: { applicationId: record.applicationId },
    });

    return res.json({
      admission: serializeAdmissionRecord(record, seat),
    });
  }),
);

admissionsRouter.post(
  '/:id/confirm',
  requireApprover,
  asyncHandler(async (req, res) => {
    const schema = z.object({
      notes: z.string().optional(),
      className: z.string().optional(),
      sectionName: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    const record = await prisma.admissionRecord.findFirst({
      where: { id: req.params.id, institutionId },
      include: { application: true },
    });
    if (!record) return res.status(404).json({ error: 'Admission record not found' });
    if (record.status === AdmissionRecordStatus.CONFIRMED) {
      return res.status(400).json({ error: 'Admission is already confirmed' });
    }
    if (record.application.status !== 'APPROVED') {
      return res.status(400).json({
        error: 'Application must be principal-approved before confirming admission',
      });
    }

    const admissionNumber = await generateAdmissionNumber(institutionId);
    const confirmedBy = req.user?.email || 'Principal';

    const updated = await prisma.admissionRecord.update({
      where: { id: record.id },
      data: {
        status: AdmissionRecordStatus.CONFIRMED,
        admissionNumber,
        confirmedAt: new Date(),
        confirmedBy,
        className: parsed.data.className?.trim() || record.className,
        sectionName: parsed.data.sectionName?.trim() ?? record.sectionName,
        notes: parsed.data.notes?.trim() || record.notes,
      },
      include: {
        application: {
          select: {
            id: true,
            applicationId: true,
            studentName: true,
            classApplied: true,
            fatherName: true,
            motherName: true,
            mobile: true,
            email: true,
            entranceTestScore: true,
            reviewedBy: true,
            reviewedAt: true,
            approvalRemarks: true,
            status: true,
          },
        },
      },
    });

    const seat = await prisma.seatAllocation.findUnique({
      where: { applicationId: updated.applicationId },
    });

    await createStudentFromAdmissionRecord(updated.id, institutionId);

    return res.json({
      admission: serializeAdmissionRecord(updated, seat),
      message: `Admission confirmed. Admission number: ${admissionNumber}`,
    });
  }),
);

admissionsRouter.post(
  '/confirm-bulk',
  requireApprover,
  asyncHandler(async (req, res) => {
    const schema = z.object({
      academicYear: z.string().optional().default(DEFAULT_YEAR),
      onlyWithSeats: z.boolean().optional().default(true),
    });
    const parsed = schema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    await syncAdmissionRecordsForInstitution(institutionId);

    const pending = await prisma.admissionRecord.findMany({
      where: {
        institutionId,
        academicYear: parsed.data.academicYear,
        status: AdmissionRecordStatus.PENDING_CONFIRMATION,
      },
      include: { application: true },
    });

    const confirmedBy = req.user?.email || 'Principal';
    let confirmed = 0;
    const results: string[] = [];

    for (const record of pending) {
      if (record.application.status !== 'APPROVED') continue;

      if (parsed.data.onlyWithSeats) {
        const seat = await prisma.seatAllocation.findUnique({
          where: { applicationId: record.applicationId },
        });
        if (!seat || seat.status !== 'ALLOCATED') continue;
      }

      const admissionNumber = await generateAdmissionNumber(institutionId);
      await prisma.admissionRecord.update({
        where: { id: record.id },
        data: {
          status: AdmissionRecordStatus.CONFIRMED,
          admissionNumber,
          confirmedAt: new Date(),
          confirmedBy,
        },
      });
      confirmed += 1;
      results.push(admissionNumber);
    }

    return res.json({
      confirmed,
      admissionNumbers: results,
      message:
        confirmed > 0
          ? `Confirmed ${confirmed} admission(s) with generated admission numbers.`
          : 'No pending principal-approved admissions with allocated seats were found.',
    });
  }),
);

admissionsRouter.post(
  '/sync',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const created = await syncAdmissionRecordsForInstitution(institutionId);
    return res.json({
      created,
      message:
        created > 0
          ? `Created ${created} admission record(s) from principal-approved applications.`
          : 'All principal-approved applications already have admission records.',
    });
  }),
);
