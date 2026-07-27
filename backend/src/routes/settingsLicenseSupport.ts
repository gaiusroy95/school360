import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { getDefaultInstitutionId } from '../lib/institution.js';
import {
  activateLicenseKey,
  createSupportTicket,
  getLicenseSupportOverview,
  runSystemHealthCheck,
  scheduleMaintenanceWindow,
  updateSupportTicket,
  validateLicenseKey,
} from '../lib/licenseSupportE2E.js';

export const settingsLicenseSupportRouter = Router();
settingsLicenseSupportRouter.use(requireAuth);

function actor(req: { user?: { userId: string; email: string } }) {
  return { userId: req.user?.userId, userEmail: req.user?.email ?? 'unknown' };
}

settingsLicenseSupportRouter.get(
  '/overview',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await getLicenseSupportOverview(institutionId));
  }),
);

settingsLicenseSupportRouter.post(
  '/license/activate',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await activateLicenseKey(institutionId, req.body, actor(req)));
  }),
);

settingsLicenseSupportRouter.post(
  '/license/validate',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await validateLicenseKey(institutionId, actor(_req)));
  }),
);

settingsLicenseSupportRouter.post(
  '/tickets',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.status(201).json(await createSupportTicket(institutionId, req.body, actor(req)));
  }),
);

settingsLicenseSupportRouter.patch(
  '/tickets/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await updateSupportTicket(institutionId, req.params.id, req.body, actor(req)));
  }),
);

settingsLicenseSupportRouter.post(
  '/health-check',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await runSystemHealthCheck(institutionId, actor(_req)));
  }),
);

settingsLicenseSupportRouter.put(
  '/maintenance',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await scheduleMaintenanceWindow(institutionId, req.body, actor(req)));
  }),
);
