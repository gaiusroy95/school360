import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { getDefaultInstitutionId } from '../lib/institution.js';
import {
  applyAutomatedPatch,
  checkSystemUpdates,
  createB2bApiKey,
  createWebhookSubscription,
  downloadUpdatePackage,
  getDeploymentProgress,
  getIntegrationsApiUpdatesOverview,
  listB2bApiKeys,
  revokeB2bApiKey,
  saveEmailGatewayConfig,
  saveSmsGatewayConfig,
  testEmailGatewayConfig,
  testSmsGatewayConfig,
  testWebhookDelivery,
} from '../lib/integrationsApiUpdatesE2E.js';

export const settingsIntegrationsApiUpdatesRouter = Router();
settingsIntegrationsApiUpdatesRouter.use(requireAuth);

function actor(req: { user?: { userId: string; email: string } }) {
  return { userId: req.user?.userId, userEmail: req.user?.email ?? 'unknown' };
}

settingsIntegrationsApiUpdatesRouter.get(
  '/overview',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await getIntegrationsApiUpdatesOverview(institutionId));
  }),
);

settingsIntegrationsApiUpdatesRouter.post(
  '/gateways/email/test',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await testEmailGatewayConfig(institutionId, req.body, actor(req).userEmail));
  }),
);

settingsIntegrationsApiUpdatesRouter.put(
  '/gateways/email',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await saveEmailGatewayConfig(institutionId, req.body, actor(req).userEmail));
  }),
);

settingsIntegrationsApiUpdatesRouter.post(
  '/gateways/sms/test',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await testSmsGatewayConfig(institutionId, req.body, actor(req).userEmail));
  }),
);

settingsIntegrationsApiUpdatesRouter.put(
  '/gateways/sms',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await saveSmsGatewayConfig(institutionId, req.body, actor(req).userEmail));
  }),
);

settingsIntegrationsApiUpdatesRouter.get(
  '/api-keys',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await listB2bApiKeys(institutionId));
  }),
);

settingsIntegrationsApiUpdatesRouter.post(
  '/api-keys',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await createB2bApiKey(institutionId, req.body, actor(req)));
  }),
);

settingsIntegrationsApiUpdatesRouter.delete(
  '/api-keys/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await revokeB2bApiKey(institutionId, req.params.id, actor(req)));
  }),
);

settingsIntegrationsApiUpdatesRouter.post(
  '/webhooks',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await createWebhookSubscription(institutionId, req.body, actor(req)));
  }),
);

settingsIntegrationsApiUpdatesRouter.post(
  '/webhooks/:id/test',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await testWebhookDelivery(institutionId, req.params.id, actor(req).userEmail));
  }),
);

settingsIntegrationsApiUpdatesRouter.get(
  '/updates/check',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await checkSystemUpdates(institutionId, actor(_req)));
  }),
);

settingsIntegrationsApiUpdatesRouter.post(
  '/updates/download',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await downloadUpdatePackage(institutionId, req.body, actor(req)));
  }),
);

settingsIntegrationsApiUpdatesRouter.post(
  '/updates/apply',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await applyAutomatedPatch(institutionId, req.body, actor(req)));
  }),
);

settingsIntegrationsApiUpdatesRouter.get(
  '/updates/progress',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json({ progress: getDeploymentProgress(institutionId) });
  }),
);
