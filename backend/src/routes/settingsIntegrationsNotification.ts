import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { getDefaultInstitutionId } from '../lib/institution.js';
import {
  bootstrapIntegrationsNotification,
  getIntegrationsNotificationOverview,
  syncIntegrationsNotificationFromSetup,
  testEmailGateway,
  testOutgoingWebhook,
  testSmsGateway,
} from '../lib/integrationsApisNotification.js';

export const settingsIntegrationsNotificationRouter = Router();
settingsIntegrationsNotificationRouter.use(requireAuth);

function actor(req: { user?: { userId: string; email: string } }) {
  return { userEmail: req.user?.email ?? 'unknown' };
}

settingsIntegrationsNotificationRouter.get(
  '/overview',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await bootstrapIntegrationsNotification(institutionId);
    return res.json(await getIntegrationsNotificationOverview(institutionId));
  }),
);

settingsIntegrationsNotificationRouter.post(
  '/sync',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await syncIntegrationsNotificationFromSetup(institutionId, actor(req).userEmail);
    return res.json({ message: 'Integrations & notifications synced from Institution Setup', ...result });
  }),
);

settingsIntegrationsNotificationRouter.post(
  '/test/sms',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const mobile = String(req.body?.mobile || '');
    if (!mobile) return res.status(400).json({ error: 'mobile is required' });
    return res.json(await testSmsGateway(institutionId, mobile, actor(req).userEmail));
  }),
);

settingsIntegrationsNotificationRouter.post(
  '/test/email',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const email = String(req.body?.email || '');
    if (!email) return res.status(400).json({ error: 'email is required' });
    return res.json(await testEmailGateway(institutionId, email, actor(req).userEmail));
  }),
);

settingsIntegrationsNotificationRouter.post(
  '/test/webhook/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await testOutgoingWebhook(institutionId, req.params.id, actor(req).userEmail));
  }),
);
