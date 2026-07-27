import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { getDefaultInstitutionId } from '../lib/institution.js';
import {
  allocateDocumentNumber,
  bootstrapDocumentIdentity,
  getDocumentIdentityOverview,
  syncDocumentIdentityFromSetup,
} from '../lib/documentIdentityCustomFields.js';

export const settingsDocumentIdentityRouter = Router();
settingsDocumentIdentityRouter.use(requireAuth);

settingsDocumentIdentityRouter.get(
  '/overview',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await bootstrapDocumentIdentity(institutionId);
    return res.json(await getDocumentIdentityOverview(institutionId));
  }),
);

settingsDocumentIdentityRouter.post(
  '/sync',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await syncDocumentIdentityFromSetup(institutionId, req.user?.email ?? 'system');
    return res.json({ message: 'Document, identity & custom fields synced from Institution Setup', ...result });
  }),
);

settingsDocumentIdentityRouter.post(
  '/allocate-document-number',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const number = await allocateDocumentNumber(institutionId);
    return res.json({ documentNumber: number });
  }),
);
