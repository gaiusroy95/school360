import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { getDefaultInstitutionId } from '../lib/institution.js';
import {
  bootstrapDataModulesUi,
  getDataModulesUiOverview,
  getImportLogDetail,
  importEmployeesBatch,
  importParentsBatch,
  syncDataModulesUiFromSetup,
} from '../lib/dataManagementModulesUi.js';

export const settingsDataModulesUiRouter = Router();
settingsDataModulesUiRouter.use(requireAuth);

settingsDataModulesUiRouter.get(
  '/overview',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await bootstrapDataModulesUi(institutionId);
    return res.json(await getDataModulesUiOverview(institutionId));
  }),
);

settingsDataModulesUiRouter.post(
  '/sync',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await syncDataModulesUiFromSetup(institutionId, req.user?.email ?? 'system');
    return res.json({ message: 'Data management, modules & UI synced from Institution Setup', ...result });
  }),
);

settingsDataModulesUiRouter.post(
  '/import/employees',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      rows: z.array(z.record(z.string())),
      fileName: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    const result = await importEmployeesBatch(
      institutionId,
      parsed.data.rows,
      req.user?.email ?? 'system',
      parsed.data.fileName,
    );
    return res.json(result);
  }),
);

settingsDataModulesUiRouter.post(
  '/import/parents',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      rows: z.array(z.record(z.string())),
      fileName: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    const result = await importParentsBatch(
      institutionId,
      parsed.data.rows,
      req.user?.email ?? 'system',
      parsed.data.fileName,
    );
    return res.json(result);
  }),
);

settingsDataModulesUiRouter.get(
  '/import-history/:logId',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const log = await getImportLogDetail(institutionId, req.params.logId);
    if (!log) return res.status(404).json({ error: 'Import log not found' });
    return res.json(log);
  }),
);
