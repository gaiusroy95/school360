import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { getDefaultInstitutionId } from '../lib/institution.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { getInstitutionFilterMeta } from '../lib/students.js';
import {
  buildReportData,
  generateStudentReport,
  getReportsDashboard,
  parseReportStatus,
  parseReportType,
  REPORT_TYPE_UI,
  seedDefaultReports,
  serializeReport,
} from '../lib/studentReports.js';

export const studentReportsRouter = Router();
studentReportsRouter.use(requireAuth);

studentReportsRouter.get(
  '/meta',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const filters = await getInstitutionFilterMeta(institutionId);
    const summary = await getReportsDashboard(institutionId);
    return res.json({
      summary,
      reportTypes: Object.entries(REPORT_TYPE_UI).map(([value, label]) => ({ value, label })),
      defaultAcademicYear: filters.defaultAcademicYear,
    });
  }),
);

studentReportsRouter.post(
  '/seed',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const schema = z.object({ academicYear: z.string().optional() });
    const parsed = schema.safeParse(req.body || {});
    const filters = await getInstitutionFilterMeta(institutionId);
    const year = parsed.data?.academicYear || filters.defaultAcademicYear;
    const created = await seedDefaultReports(institutionId, year);
    return res.json({ created });
  }),
);

studentReportsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      q: z.string().optional(),
      status: z.string().optional(),
      reportType: z.string().optional(),
      className: z.string().optional(),
      sectionName: z.string().optional(),
      academicYear: z.string().optional(),
    });
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    const status = parseReportStatus(parsed.data.status);
    const reportType = parseReportType(parsed.data.reportType);

    const rows = await prisma.studentReport.findMany({
      where: {
        institutionId,
        ...(status ? { status } : {}),
        ...(reportType ? { reportType } : {}),
        ...(parsed.data.className ? { className: parsed.data.className } : {}),
        ...(parsed.data.sectionName ? { sectionName: parsed.data.sectionName } : {}),
        ...(parsed.data.academicYear ? { academicYear: parsed.data.academicYear } : {}),
        ...(parsed.data.q
          ? {
              OR: [
                { recordId: { contains: parsed.data.q, mode: 'insensitive' } },
                { name: { contains: parsed.data.q, mode: 'insensitive' } },
                { period: { contains: parsed.data.q, mode: 'insensitive' } },
                { className: { contains: parsed.data.q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { generatedAt: 'desc' },
      take: 500,
    });

    return res.json({ reports: rows.map(serializeReport) });
  }),
);

studentReportsRouter.post(
  '/generate',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      reportType: z.string().min(1),
      academicYear: z.string().optional().default('2025-26'),
      className: z.string().optional().default(''),
      sectionName: z.string().optional().default(''),
      customName: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const reportType = parseReportType(parsed.data.reportType);
    if (!reportType) return res.status(400).json({ error: 'Invalid report type' });

    const institutionId = await getDefaultInstitutionId();
    const row = await generateStudentReport({
      institutionId,
      reportType,
      academicYear: parsed.data.academicYear,
      className: parsed.data.className || undefined,
      sectionName: parsed.data.sectionName || undefined,
      customName: parsed.data.customName,
    });

    return res.status(201).json({ report: serializeReport(row) });
  }),
);

studentReportsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const row = await prisma.studentReport.findFirst({
      where: { id: req.params.id, institutionId },
    });
    if (!row) return res.status(404).json({ error: 'Report not found' });
    return res.json({ report: serializeReport(row) });
  }),
);

studentReportsRouter.patch(
  '/:id/status',
  asyncHandler(async (req, res) => {
    const schema = z.object({ status: z.string().min(1) });
    const parsed = schema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const status = parseReportStatus(parsed.data.status);
    if (!status) return res.status(400).json({ error: 'Invalid status' });

    const institutionId = await getDefaultInstitutionId();
    const existing = await prisma.studentReport.findFirst({
      where: { id: req.params.id, institutionId },
    });
    if (!existing) return res.status(404).json({ error: 'Report not found' });

    const row = await prisma.studentReport.update({
      where: { id: existing.id },
      data: { status },
    });

    return res.json({ report: serializeReport(row) });
  }),
);

studentReportsRouter.post(
  '/:id/refresh',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const existing = await prisma.studentReport.findFirst({
      where: { id: req.params.id, institutionId },
    });
    if (!existing) return res.status(404).json({ error: 'Report not found' });

    const data = await buildReportData({
      institutionId,
      reportType: existing.reportType,
      academicYear: existing.academicYear,
      className: existing.className || undefined,
      sectionName: existing.sectionName || undefined,
    });

    const row = await prisma.studentReport.update({
      where: { id: existing.id },
      data: { data: data as object, generatedAt: new Date() },
    });

    return res.json({ report: serializeReport(row) });
  }),
);
