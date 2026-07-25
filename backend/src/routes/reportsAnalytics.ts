import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { getDefaultInstitutionId } from '../lib/institution.js';
import {
  VIEW_TO_CATEGORY,
  createCustomReport,
  deleteCustomReport,
  exportReportCsv,
  generateCategoryReport,
  getAllCategoriesOverview,
  getCategoryMeta,
  getReportsAnalyticsDashboard,
  listCustomReports,
  seedReportsAnalytics,
  type RaCategoryKey,
} from '../lib/reportsAnalyticsManagement.js';

export const reportsAnalyticsRouter = Router();
reportsAnalyticsRouter.use(requireAuth);

reportsAnalyticsRouter.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await getReportsAnalyticsDashboard(institutionId, {
      academicYear: req.query.academicYear ? String(req.query.academicYear) : undefined,
      period: req.query.period ? String(req.query.period) : undefined,
    });
    return res.json(data);
  }),
);

reportsAnalyticsRouter.get(
  '/categories',
  asyncHandler(async (_req, res) => {
    return res.json({ categories: getAllCategoriesOverview() });
  }),
);

reportsAnalyticsRouter.get(
  '/categories/:category',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const category = String(req.params.category) as RaCategoryKey;
    const data = await getCategoryMeta(
      institutionId,
      category,
      req.query.academicYear ? String(req.query.academicYear) : undefined,
    );
    return res.json(data);
  }),
);

reportsAnalyticsRouter.post(
  '/categories/:category/generate',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      reportKey: z.string().min(1),
      academicYear: z.string().optional(),
      term: z.string().optional(),
      className: z.string().optional(),
      sectionName: z.string().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      department: z.string().optional(),
      period: z.string().optional(),
      performedBy: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    const category = String(req.params.category) as RaCategoryKey;
    const { reportKey, performedBy, ...filters } = parsed.data;
    const report = await generateCategoryReport(institutionId, category, reportKey, filters, performedBy);
    return res.json(report);
  }),
);

reportsAnalyticsRouter.post(
  '/categories/:category/export',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      reportKey: z.string().min(1),
      format: z.string().optional().default('csv'),
      academicYear: z.string().optional(),
      term: z.string().optional(),
      className: z.string().optional(),
      sectionName: z.string().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      department: z.string().optional(),
      period: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    const category = String(req.params.category) as RaCategoryKey;
    const { reportKey, format, ...filters } = parsed.data;
    const report = await generateCategoryReport(institutionId, category, reportKey, filters);
    if (format !== 'csv') {
      return res.status(400).json({ error: 'Only CSV export is supported currently' });
    }
    const exported = exportReportCsv(report);
    return res.json(exported);
  }),
);

reportsAnalyticsRouter.get(
  '/custom',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const reports = await listCustomReports(institutionId);
    return res.json({ reports });
  }),
);

reportsAnalyticsRouter.post(
  '/custom',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      modules: z.array(z.string()).optional(),
      columns: z.array(z.string()).optional(),
      filters: z.record(z.unknown()).optional(),
      academicYear: z.string().optional(),
      createdBy: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    const report = await createCustomReport(institutionId, parsed.data);
    return res.status(201).json({ report });
  }),
);

reportsAnalyticsRouter.delete(
  '/custom/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await deleteCustomReport(institutionId, String(req.params.id));
    return res.json(result);
  }),
);

reportsAnalyticsRouter.get(
  '/view-map',
  asyncHandler(async (_req, res) => {
    return res.json({ viewMap: VIEW_TO_CATEGORY });
  }),
);

reportsAnalyticsRouter.post(
  '/seed',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = req.body?.academicYear ? String(req.body.academicYear) : '2025-26';
    const result = await seedReportsAnalytics(institutionId, academicYear);
    return res.json(result);
  }),
);
