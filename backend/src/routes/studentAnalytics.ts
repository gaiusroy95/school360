import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { getDefaultInstitutionId } from '../lib/institution.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { getInstitutionFilterMeta } from '../lib/students.js';
import {
  getAggregateScores,
  getAnalyticsDashboard,
  parseAnalyticsStatus,
  serializeAnalyticsRecord,
  syncStudentAnalytics,
} from '../lib/studentAnalyticsRecords.js';

export const studentAnalyticsRouter = Router();
studentAnalyticsRouter.use(requireAuth);

studentAnalyticsRouter.get(
  '/meta',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const filters = await getInstitutionFilterMeta(institutionId);
    const academicYear =
      typeof req.query.academicYear === 'string' ? req.query.academicYear : filters.defaultAcademicYear;
    const [summary, aggregates] = await Promise.all([
      getAnalyticsDashboard(institutionId),
      getAggregateScores(institutionId, academicYear),
    ]);
    return res.json({
      summary,
      aggregates,
      defaultAcademicYear: filters.defaultAcademicYear,
      scoreLabels: [
        { key: 'growthScore', label: 'Student Growth Score (Overall)' },
        { key: 'academicPerformance', label: 'Academic Performance Index' },
        { key: 'attendanceScore', label: 'Attendance Score' },
        { key: 'behaviourScore', label: 'Behaviour Score' },
        { key: 'disciplineScore', label: 'Discipline Score' },
        { key: 'healthScore', label: 'Health Score' },
        { key: 'physicalFitnessScore', label: 'Physical Fitness Score' },
        { key: 'skillDevelopmentScore', label: 'Skill Development Score' },
        { key: 'parentEngagementScore', label: 'Parent Engagement Score' },
        { key: 'teacherFeedbackScore', label: 'Teacher Feedback Score' },
        { key: 'aiRiskScore', label: 'AI Risk Score' },
      ],
    });
  }),
);

studentAnalyticsRouter.post(
  '/sync',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      academicYear: z.string().optional(),
      className: z.string().optional(),
      sectionName: z.string().optional(),
      studentId: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    const filters = await getInstitutionFilterMeta(institutionId);
    const year = parsed.data.academicYear || filters.defaultAcademicYear;
    const result = await syncStudentAnalytics(institutionId, year, {
      className: parsed.data.className,
      sectionName: parsed.data.sectionName,
      studentId: parsed.data.studentId,
    });
    return res.json(result);
  }),
);

studentAnalyticsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      q: z.string().optional(),
      status: z.string().optional(),
      className: z.string().optional(),
      sectionName: z.string().optional(),
      academicYear: z.string().optional(),
    });
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    const status = parseAnalyticsStatus(parsed.data.status);

    const rows = await prisma.studentAnalyticsRecord.findMany({
      where: {
        institutionId,
        ...(status ? { status } : {}),
        ...(parsed.data.className ? { className: parsed.data.className } : {}),
        ...(parsed.data.sectionName ? { sectionName: parsed.data.sectionName } : {}),
        ...(parsed.data.academicYear ? { academicYear: parsed.data.academicYear } : {}),
        ...(parsed.data.q
          ? {
              OR: [
                { recordId: { contains: parsed.data.q, mode: 'insensitive' } },
                { name: { contains: parsed.data.q, mode: 'insensitive' } },
                { className: { contains: parsed.data.q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { computedAt: 'desc' },
      take: 500,
    });

    return res.json({ records: rows.map(serializeAnalyticsRecord) });
  }),
);

studentAnalyticsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const row = await prisma.studentAnalyticsRecord.findFirst({
      where: { id: req.params.id, institutionId },
      include: {
        student: {
          select: {
            admissionNumber: true,
            rollNumber: true,
            mobile: true,
            fatherName: true,
            motherName: true,
            status: true,
            entranceScore: true,
          },
        },
      },
    });
    if (!row) return res.status(404).json({ error: 'Analytics record not found' });
    return res.json({
      record: serializeAnalyticsRecord(row),
      student: row.student,
    });
  }),
);

studentAnalyticsRouter.post(
  '/:id/refresh',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const existing = await prisma.studentAnalyticsRecord.findFirst({
      where: { id: req.params.id, institutionId },
    });
    if (!existing) return res.status(404).json({ error: 'Analytics record not found' });

    await syncStudentAnalytics(institutionId, existing.academicYear, {
      studentId: existing.studentId,
    });

    const row = await prisma.studentAnalyticsRecord.findFirst({
      where: { id: existing.id, institutionId },
      include: {
        student: {
          select: {
            admissionNumber: true,
            rollNumber: true,
            mobile: true,
            fatherName: true,
            motherName: true,
            status: true,
            entranceScore: true,
          },
        },
      },
    });

    return res.json({
      record: serializeAnalyticsRecord(row!),
      student: row!.student,
    });
  }),
);

studentAnalyticsRouter.patch(
  '/:id/status',
  asyncHandler(async (req, res) => {
    const schema = z.object({ status: z.string().min(1) });
    const parsed = schema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const status = parseAnalyticsStatus(parsed.data.status);
    if (!status) return res.status(400).json({ error: 'Invalid status' });

    const institutionId = await getDefaultInstitutionId();
    const existing = await prisma.studentAnalyticsRecord.findFirst({
      where: { id: req.params.id, institutionId },
    });
    if (!existing) return res.status(404).json({ error: 'Analytics record not found' });

    const row = await prisma.studentAnalyticsRecord.update({
      where: { id: existing.id },
      data: { status },
    });

    return res.json({ record: serializeAnalyticsRecord(row) });
  }),
);
