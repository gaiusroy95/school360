import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { getDefaultInstitutionId } from '../lib/institution.js';
import {
  getCalendarPublishMeta,
  getMergedCalendarEvents,
  getPublishedCalendarForApp,
  publishInstitutionCalendar,
} from '../lib/institutionCalendar.js';
import { onInstitutionSetupTileSaved } from '../lib/academicSetupSync.js';
import { onExamEvaluationTileSaved } from '../lib/examEvaluationEngine.js';
import { onFeeFinancialTileSaved } from '../lib/feeFinancialOperations.js';
import { onSecurityAuditTileSaved } from '../lib/securityAuditCompliance.js';
import { onIntegrationsNotificationTileSaved } from '../lib/integrationsApisNotification.js';
import { onDocumentIdentityTileSaved } from '../lib/documentIdentityCustomFields.js';
import { onDepartmentOpsTileSaved } from '../lib/departmentOperationsManagement.js';
import { onDataModulesUiTileSaved } from '../lib/dataManagementModulesUi.js';
import { onGlobalEnvironmentTileSaved } from '../lib/globalEnvironmentSettings.js';

export const institutionRouter = Router();

institutionRouter.use(requireAuth);

const TILE_KEYS = [
  'basicInformation',
  'academicSetup',
  'classesSections',
  'subjectsSetup',
  'departmentsSetup',
  'sessionTermSetup',
  'gradeMarksSetup',
  'feeGroupSetup',
  'documentSetup',
  'idCardNumbering',
  'calendarSetup',
  'customFieldsSetup',
  'notificationSetup',
  'otherPreferences',
  'integrationSetup',
  'backupRecovery',
  'securitySettings',
  'dataImportExport',
  'modulesUiSetup',
] as const;

type TileKey = (typeof TILE_KEYS)[number];

async function getOrCreateDefaultInstitution() {
  let institution = await prisma.institution.findFirst({
    include: { setup: true },
    orderBy: { createdAt: 'asc' },
  });

  if (!institution) {
    institution = await prisma.institution.create({
      data: {
        name: 'Greenwood International School',
        setup: { create: {} },
      },
      include: { setup: true },
    });
  } else if (!institution.setup) {
    await prisma.institutionSetup.create({ data: { institutionId: institution.id } });
    institution = await prisma.institution.findUniqueOrThrow({
      where: { id: institution.id },
      include: { setup: true },
    });
  }

  return institution;
}

institutionRouter.get('/', async (_req, res) => {
  const institution = await getOrCreateDefaultInstitution();
  return res.json({ institution });
});

institutionRouter.get('/setup', async (_req, res) => {
  const institution = await getOrCreateDefaultInstitution();
  return res.json({ setup: institution.setup });
});

institutionRouter.patch('/setup/:tileKey', async (req, res) => {
  const tileKey = req.params.tileKey as TileKey;
  if (!TILE_KEYS.includes(tileKey)) {
    return res.status(400).json({ error: `Invalid tile key. Allowed: ${TILE_KEYS.join(', ')}` });
  }

  const bodySchema = z.object({ data: z.record(z.any()) });
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const institution = await getOrCreateDefaultInstitution();
  const setup = await prisma.institutionSetup.update({
    where: { institutionId: institution.id },
    data: { [tileKey]: parsed.data.data },
  });

  const sync = await onInstitutionSetupTileSaved(institution.id, tileKey);
  const examSync = await onExamEvaluationTileSaved(institution.id, tileKey);

  const feeSync = await onFeeFinancialTileSaved(institution.id, tileKey);

  const securitySync = await onSecurityAuditTileSaved(institution.id, tileKey);

  const integrationsSync = await onIntegrationsNotificationTileSaved(institution.id, tileKey);

  const documentIdentitySync = await onDocumentIdentityTileSaved(institution.id, tileKey);

  const departmentOpsSync = await onDepartmentOpsTileSaved(institution.id, tileKey);

  const dataModulesUiSync = await onDataModulesUiTileSaved(institution.id, tileKey);

  const globalEnvironmentSync = await onGlobalEnvironmentTileSaved(institution.id, tileKey);

  return res.json({ setup, tileKey, sync, examSync, feeSync, securitySync, integrationsSync, documentIdentitySync, departmentOpsSync, dataModulesUiSync, globalEnvironmentSync });
});

/** Express Setup Engine: apply multiple tiles from parsed Excel payload in one request */
institutionRouter.post('/setup/express', async (req, res) => {
  const schema = z.object({
    tiles: z.record(z.record(z.any())),
    meta: z.record(z.any()).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const updates: Record<string, unknown> = {
    expressSetupCompletedAt: new Date(),
    lastExpressImportMeta: parsed.data.meta ?? {},
  };

  for (const [key, value] of Object.entries(parsed.data.tiles)) {
    if (TILE_KEYS.includes(key as TileKey)) {
      updates[key] = value;
    }
  }

  const institution = await getOrCreateDefaultInstitution();
  const setup = await prisma.institutionSetup.update({
    where: { institutionId: institution.id },
    data: updates,
  });

  const syncResults: Record<string, unknown> = {};
  const examSyncResults: Record<string, unknown> = {};
  const feeSyncResults: Record<string, unknown> = {};
  const securitySyncResults: Record<string, unknown> = {};
  const integrationsSyncResults: Record<string, unknown> = {};
  const documentIdentitySyncResults: Record<string, unknown> = {};
  const departmentOpsSyncResults: Record<string, unknown> = {};
  const dataModulesUiSyncResults: Record<string, unknown> = {};
  const globalEnvironmentSyncResults: Record<string, unknown> = {};
  for (const key of Object.keys(parsed.data.tiles)) {
    if (TILE_KEYS.includes(key as TileKey)) {
      const result = await onInstitutionSetupTileSaved(institution.id, key);
      if (result) syncResults[key] = result;
      const examResult = await onExamEvaluationTileSaved(institution.id, key);
      if (examResult) examSyncResults[key] = examResult;
      const feeResult = await onFeeFinancialTileSaved(institution.id, key);
      if (feeResult) feeSyncResults[key] = feeResult;
      const securityResult = await onSecurityAuditTileSaved(institution.id, key);
      if (securityResult) securitySyncResults[key] = securityResult;
      const integrationsResult = await onIntegrationsNotificationTileSaved(institution.id, key);
      if (integrationsResult) integrationsSyncResults[key] = integrationsResult;
      const documentIdentityResult = await onDocumentIdentityTileSaved(institution.id, key);
      if (documentIdentityResult) documentIdentitySyncResults[key] = documentIdentityResult;
      const departmentOpsResult = await onDepartmentOpsTileSaved(institution.id, key);
      if (departmentOpsResult) departmentOpsSyncResults[key] = departmentOpsResult;
      const dataModulesUiResult = await onDataModulesUiTileSaved(institution.id, key);
      if (dataModulesUiResult) dataModulesUiSyncResults[key] = dataModulesUiResult;
      const globalEnvironmentResult = await onGlobalEnvironmentTileSaved(institution.id, key);
      if (globalEnvironmentResult) globalEnvironmentSyncResults[key] = globalEnvironmentResult;
    }
  }

  return res.json({ setup, message: 'Express setup applied successfully', sync: syncResults, examSync: examSyncResults, feeSync: feeSyncResults, securitySync: securitySyncResults, integrationsSync: integrationsSyncResults, documentIdentitySync: documentIdentitySyncResults, departmentOpsSync: departmentOpsSyncResults, dataModulesUiSync: dataModulesUiSyncResults, globalEnvironmentSync: globalEnvironmentSyncResults });
});

const TEST_MEDIUMS = ['WhatsApp', 'SMS', 'Email', 'Push', 'Voice'] as const;

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isPhone(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 15;
}

institutionRouter.post('/notifications/test', async (req, res) => {
  const schema = z.object({
    recipient: z.string().min(3),
    medium: z.enum(TEST_MEDIUMS),
    message: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { recipient, medium } = parsed.data;
  const trimmed = recipient.trim();

  if (medium === 'Email' && !isEmail(trimmed)) {
    return res.status(400).json({ error: 'Enter a valid email address for Email test.' });
  }
  if (['WhatsApp', 'SMS', 'Voice'].includes(medium) && !isPhone(trimmed) && !isEmail(trimmed)) {
    return res.status(400).json({ error: 'Enter a valid phone number for this medium.' });
  }

  const institution = await getOrCreateDefaultInstitution();
  const setup = (institution.setup?.notificationSetup || {}) as {
    sections?: Record<string, Record<string, string>>;
  };
  const templatesRaw = setup.sections?.['Notification Templates']?.templates;
  let sampleBody =
    parsed.data.message ||
    `This is a test ${medium} notification from ${institution.name}. Your notification setup is working correctly.`;

  if (templatesRaw) {
    try {
      const templates = JSON.parse(templatesRaw) as Array<{
        medium?: string;
        messageBody?: string;
        active?: string;
      }>;
      const match = templates.find(
        (t) => t.medium === medium && (t.active || 'Yes') !== 'No' && t.messageBody?.trim(),
      );
      if (match?.messageBody) {
        sampleBody = match.messageBody.replace(/\{\{institutionName\}\}/g, institution.name);
      }
    } catch {
      /* use default sample */
    }
  }

  // MVP: queue/log only — integrate SMS/email/WhatsApp providers in production
  console.info('[notification-test]', {
    institution: institution.name,
    medium,
    recipient: trimmed,
    preview: sampleBody.slice(0, 120),
    sentBy: req.user?.email,
  });

  return res.json({
    message: `Test ${medium} message queued for ${trimmed}. (Delivery simulated — connect your ${medium} provider in Integration Setup.)`,
    medium,
    recipient: trimmed,
  });
});

institutionRouter.get('/calendar', async (req, res) => {
  const institutionId = await getDefaultInstitutionId();
  const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
  const [events, meta] = await Promise.all([
    getMergedCalendarEvents(institutionId, year),
    getCalendarPublishMeta(institutionId),
  ]);
  return res.json({ year, events, ...meta });
});

institutionRouter.post('/calendar/publish', async (req, res) => {
  const schema = z.object({
    staffApp: z.boolean().default(true),
    studentApp: z.boolean().default(true),
    parentApp: z.boolean().default(true),
    year: z.number().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const institutionId = await getDefaultInstitutionId();
  const result = await publishInstitutionCalendar(institutionId, {
    ...parsed.data,
    publishedBy: req.user?.email || 'Admin',
  });

  return res.json({
    message: `Comprehensive calendar published to selected apps (${result.eventCount} events).`,
    publish: result.publish,
    eventCount: result.eventCount,
  });
});

/** Published calendar feed for Staff / Student / Parent apps */
institutionRouter.get('/calendar/published', async (req, res) => {
  const app = String(req.query.app || 'student').toLowerCase();
  if (!['staff', 'student', 'parent'].includes(app)) {
    return res.status(400).json({ error: 'app must be staff, student, or parent' });
  }
  const institutionId = await getDefaultInstitutionId();
  const data = await getPublishedCalendarForApp(
    institutionId,
    app as 'staff' | 'student' | 'parent',
  );
  return res.json(data);
});
