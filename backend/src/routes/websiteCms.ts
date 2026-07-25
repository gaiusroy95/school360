import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { getDefaultInstitutionId } from '../lib/institution.js';
import {
  createCmsModuleItem,
  getCmsDashboard,
  getCmsModuleList,
  parsePeriod,
  seedCmsManagement,
  updateCmsModuleItem,
} from '../lib/cmsManagement.js';

export const websiteCmsRouter = Router();
websiteCmsRouter.use(requireAuth);

websiteCmsRouter.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    if (req.query.seed === '1') await seedCmsManagement(institutionId);
    const period = parsePeriod(req.query.period ? String(req.query.period) : undefined);
    const data = await getCmsDashboard(institutionId, period);
    return res.json(data);
  }),
);

websiteCmsRouter.get(
  '/modules/:module',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await getCmsModuleList(institutionId, String(req.params.module));
    return res.json(data);
  }),
);

websiteCmsRouter.post(
  '/modules/:module',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await createCmsModuleItem(
      institutionId,
      String(req.params.module),
      req.body as Record<string, unknown>,
    );
    return res.status(201).json(result);
  }),
);

websiteCmsRouter.put(
  '/modules/:module/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await updateCmsModuleItem(
      institutionId,
      String(req.params.module),
      String(req.params.id),
      req.body as Record<string, unknown>,
    );
    return res.json(result);
  }),
);
