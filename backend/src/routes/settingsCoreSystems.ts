import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { getDefaultInstitutionId } from '../lib/institution.js';
import {
  bootstrapCoreSystems,
  deleteSystemLocation,
  executeSystemUpdate,
  getCacheSettings,
  getCoreSystemsOverview,
  getMaintenanceConfig,
  getPerformanceSettings,
  getSystemLimits,
  listDbOptimizationRuns,
  listSettingsAuditLog,
  listSystemLocations,
  listSystemUpdates,
  runDatabaseOptimization,
  updateCacheSettings,
  updateMaintenanceConfig,
  updatePerformanceSettings,
  updateSystemLimits,
  upsertSystemLocation,
} from '../lib/coreSystemsSettings.js';
import { getGlobalConfig, updateGlobalConfig, syncGlobalEnvironmentFromSetup } from '../lib/globalEnvironmentSettings.js';
import { getSecurityPolicyRuntime } from '../lib/securityAuditCompliance.js';
import {
  flushSystemCache,
  getServerMetrics,
  listDbProcesses,
  reloadWorkers,
  terminateDbProcess,
} from '../lib/systemOperationsE2E.js';

export const settingsCoreSystemsRouter = Router();
settingsCoreSystemsRouter.use(requireAuth);

function actor(req: { user?: { userId: string; email: string; role: string } }) {
  return {
    userId: req.user?.userId,
    userEmail: req.user?.email,
    role: req.user?.role as 'SUPER_ADMIN' | 'ADMIN' | 'STAFF' | undefined,
  };
}

settingsCoreSystemsRouter.get(
  '/overview',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await bootstrapCoreSystems(institutionId);
    return res.json(await getCoreSystemsOverview(institutionId));
  }),
);

settingsCoreSystemsRouter.get(
  '/locations',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await listSystemLocations(institutionId));
  }),
);

settingsCoreSystemsRouter.post(
  '/locations',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.status(201).json(await upsertSystemLocation(institutionId, req.body, actor(req)));
  }),
);

settingsCoreSystemsRouter.delete(
  '/locations/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await deleteSystemLocation(institutionId, req.params.id, actor(req)));
  }),
);

settingsCoreSystemsRouter.get(
  '/maintenance',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await getMaintenanceConfig(institutionId));
  }),
);

settingsCoreSystemsRouter.put(
  '/maintenance',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await updateMaintenanceConfig(institutionId, req.body, actor(req)));
  }),
);

settingsCoreSystemsRouter.get(
  '/limits',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await getSystemLimits(institutionId));
  }),
);

settingsCoreSystemsRouter.put(
  '/limits',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await updateSystemLimits(institutionId, req.body, actor(req)));
  }),
);

settingsCoreSystemsRouter.get(
  '/cache',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await getCacheSettings(institutionId));
  }),
);

settingsCoreSystemsRouter.put(
  '/cache',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await updateCacheSettings(institutionId, req.body, actor(req)));
  }),
);

settingsCoreSystemsRouter.get(
  '/performance',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await getPerformanceSettings(institutionId));
  }),
);

settingsCoreSystemsRouter.put(
  '/performance',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await updatePerformanceSettings(institutionId, req.body, actor(req)));
  }),
);

settingsCoreSystemsRouter.get(
  '/updates',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await listSystemUpdates(institutionId));
  }),
);

settingsCoreSystemsRouter.post(
  '/updates/execute',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await executeSystemUpdate(institutionId, req.body, actor(req)));
  }),
);

settingsCoreSystemsRouter.get(
  '/db-optimization',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await listDbOptimizationRuns(institutionId));
  }),
);

settingsCoreSystemsRouter.post(
  '/db-optimization/run',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await runDatabaseOptimization(institutionId, actor(req)));
  }),
);

settingsCoreSystemsRouter.get(
  '/audit-log',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    return res.json(await listSettingsAuditLog(institutionId, category));
  }),
);

settingsCoreSystemsRouter.get(
  '/global-config',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await getGlobalConfig(institutionId));
  }),
);

settingsCoreSystemsRouter.put(
  '/global-config',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await updateGlobalConfig(institutionId, req.body));
  }),
);

settingsCoreSystemsRouter.post(
  '/global-config/sync-from-setup',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await syncGlobalEnvironmentFromSetup(institutionId));
  }),
);

settingsCoreSystemsRouter.get(
  '/security-policy-runtime',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const policy = await getSecurityPolicyRuntime(institutionId);
    const limits = await getSystemLimits(institutionId);
    return res.json({
      ...policy,
      maxApiRequestsPerMinute: limits.maxApiRequestsPerMinute,
    });
  }),
);

settingsCoreSystemsRouter.get(
  '/db/processes',
  asyncHandler(async (_req, res) => {
    return res.json(await listDbProcesses());
  }),
);

settingsCoreSystemsRouter.post(
  '/db/processes/:pid/kill',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const pid = Number(req.params.pid);
    return res.json(await terminateDbProcess(institutionId, pid, actor(req)));
  }),
);

settingsCoreSystemsRouter.get(
  '/server/metrics',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(getServerMetrics(institutionId));
  }),
);

settingsCoreSystemsRouter.post(
  '/microservices/flush-cache',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await flushSystemCache(institutionId, actor(req)));
  }),
);

settingsCoreSystemsRouter.post(
  '/microservices/reload-workers',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await reloadWorkers(institutionId, actor(req)));
  }),
);
