import { Router } from 'express';
import { z } from 'zod';
import { getDefaultInstitutionId } from '../lib/institution.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { buildAdmissionReports, getAdmissionReportMeta } from '../lib/admissionReports.js';

export const admissionReportsRouter = Router();
admissionReportsRouter.use(requireAuth);

admissionReportsRouter.get(
  '/meta',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const meta = await getAdmissionReportMeta(institutionId);
    return res.json(meta);
  }),
);

admissionReportsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      academicYear: z.string().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    });
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    const report = await buildAdmissionReports(institutionId, parsed.data);
    return res.json(report);
  }),
);
