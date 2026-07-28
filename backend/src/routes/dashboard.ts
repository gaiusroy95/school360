import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { getDefaultInstitutionId } from '../lib/institution.js';
import { getMainDashboard, getMainDashboardMeta } from '../lib/mainDashboard.js';

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);

dashboardRouter.get(
  '/meta',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await getMainDashboardMeta(institutionId));
  }),
);

dashboardRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
    return res.json(await getMainDashboard(institutionId, academicYear));
  }),
);
