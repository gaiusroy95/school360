import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth.js';
import { institutionRouter } from './routes/institution.js';
import { holidaysRouter } from './routes/holidays.js';
import { enquiriesRouter } from './routes/enquiries.js';
import { applicationsRouter } from './routes/applications.js';
import { counsellingRouter } from './routes/counselling.js';
import { admissionTestsRouter } from './routes/admissionTests.js';
import { entranceExamRouter } from './routes/entranceExam.js';
import { meritListRouter } from './routes/meritList.js';
import { seatAllocationRouter } from './routes/seatAllocation.js';
import { admissionsRouter } from './routes/admissions.js';
import { feeCollectionRouter } from './routes/feeCollection.js';
import { feeFinanceRouter } from './routes/feeFinance.js';
import { admissionReportsRouter } from './routes/admissionReports.js';
import { studentsRouter } from './routes/students.js';
import { studentCategoriesRouter } from './routes/studentCategories.js';
import { studentBulkImportsRouter } from './routes/studentBulkImports.js';
import { dataMigrationRouter } from './routes/dataMigration.js';
import { studentReportsRouter } from './routes/studentReports.js';
import { studentAnalyticsRouter } from './routes/studentAnalytics.js';
import { parentsRouter } from './routes/parents.js';
import { parentEngagementsRouter } from './routes/parentEngagements.js';
import { parentCommunicationsRouter } from './routes/parentCommunications.js';
import { parentFeedbackRouter } from './routes/parentFeedback.js';
import { parentMeetingsRouter } from './routes/parentMeetings.js';
import { parentConsentsRouter } from './routes/parentConsents.js';
import { parentCategoriesRouter } from './routes/parentCategories.js';
import { academicRouter } from './routes/academic.js';
import { attendanceRouter } from './routes/attendance.js';
import { examinationRouter } from './routes/examination.js';
import { hrRouter } from './routes/hr.js';
import { transportRouter } from './routes/transport.js';
import { libraryRouter } from './routes/library.js';
import { hostelRouter } from './routes/hostel.js';
import { inventoryRouter } from './routes/inventory.js';
import { communicationRouter, communicationPublicRouter } from './routes/communication.js';
import { websiteCmsRouter } from './routes/websiteCms.js';
import { reportsAnalyticsRouter } from './routes/reportsAnalytics.js';
import { systemRouter } from './routes/system.js';
import { settingsCoreSystemsRouter } from './routes/settingsCoreSystems.js';
import { settingsSecurityAuditRouter } from './routes/settingsSecurityAudit.js';
import { settingsUserGovernanceRouter } from './routes/settingsUserGovernance.js';
import { settingsIntegrationsNotificationRouter } from './routes/settingsIntegrationsNotification.js';
import { settingsDocumentIdentityRouter } from './routes/settingsDocumentIdentity.js';
import { settingsDepartmentOperationsRouter } from './routes/settingsDepartmentOperations.js';
import { settingsDataModulesUiRouter } from './routes/settingsDataModulesUi.js';
import { settingsAdminDashboardRouter } from './routes/settingsAdminDashboard.js';
import { settingsIntegrationsApiUpdatesRouter } from './routes/settingsIntegrationsApiUpdates.js';
import { b2bExternalRouter } from './routes/b2bExternal.js';
import { settingsLicenseSupportRouter } from './routes/settingsLicenseSupport.js';
import { dashboardRouter } from './routes/dashboard.js';
import { bootstrapLicenseSupport } from './lib/licenseSupportE2E.js';
import { mobileRouter } from './routes/mobile.js';
import { connectDatabase } from './lib/prisma.js';
import { bootstrapCoreSystems } from './lib/coreSystemsSettings.js';
import { bootstrapSecurityAudit } from './lib/securityAuditCompliance.js';
import { bootstrapUserGovernance } from './lib/userGovernanceAccess.js';
import { bootstrapIntegrationsNotification } from './lib/integrationsApisNotification.js';
import { bootstrapDocumentIdentity } from './lib/documentIdentityCustomFields.js';
import { bootstrapDepartmentOps } from './lib/departmentOperationsManagement.js';
import { bootstrapDataModulesUi } from './lib/dataManagementModulesUi.js';
import { bootstrapGlobalEnvironment } from './lib/globalEnvironmentSettings.js';
import { bootstrapBrandingAssets } from './lib/branding.js';
import { getDefaultInstitutionId } from './lib/institution.js';
import { maintenanceMiddleware } from './middleware/maintenance.js';
import { apiRateLimitMiddleware } from './middleware/rateLimit.js';
import { startInvigilationScheduler } from './lib/examInvigilationScheduler.js';
import { startMobileReminderScheduler } from './lib/mobileReminderScheduler.js';
import { startBackupScheduler } from './lib/backupScheduler.js';
import { startParentCommunicationScheduler } from './lib/parentCommunicationScheduler.js';
import { startWebhookDeliveryWorker } from './lib/webhookDeliveryWorker.js';
import { handleRazorpayWebhook } from './lib/mobileFees.js';
import { asyncHandler } from './lib/asyncHandler.js';

const app = express();
const port = Number(process.env.PORT || 4000);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser clients (no Origin) and configured frontends
      if (!origin || frontendOrigins.includes(origin) || frontendOrigins.includes('*')) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  }),
);

app.post(
  '/api/mobile/webhooks/razorpay',
  express.raw({ type: 'application/json' }),
  asyncHandler(async (req, res) => {
    const signature = req.headers['x-razorpay-signature'];
    if (typeof signature !== 'string') {
      return res.status(400).json({ error: 'Missing Razorpay signature' });
    }

    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : String(req.body ?? '');
    try {
      const result = await handleRazorpayWebhook(rawBody, signature);
      return res.json(result);
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Webhook handling failed' });
    }
  }),
);

app.use('/api/mobile', express.json({ limit: '30mb' }), mobileRouter);
// Academic calendar OCR and other base64 uploads need a higher ceiling than the default 100kb
app.use(express.json({ limit: '30mb' }));

app.use(maintenanceMiddleware);
app.use(apiRateLimitMiddleware);

app.use(express.static(path.join(__dirname, '../public')));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: '360schoolerp-backend' });
});

app.use('/api/auth', authRouter);
app.use('/api/institution', institutionRouter);
app.use('/api/holidays', holidaysRouter);
app.use('/api/enquiries', enquiriesRouter);
app.use('/api/applications', applicationsRouter);
app.use('/api/counselling', counsellingRouter);
app.use('/api/admission-tests', admissionTestsRouter);
app.use('/api/entrance-exam', entranceExamRouter);
app.use('/api/merit-list', meritListRouter);
app.use('/api/seat-allocation', seatAllocationRouter);
app.use('/api/admissions', admissionsRouter);
app.use('/api/fee-collection', feeCollectionRouter);
app.use('/api/fee-finance', feeFinanceRouter);
app.use('/api/admission-reports', admissionReportsRouter);
app.use('/api/students', studentsRouter);
app.use('/api/student-categories', studentCategoriesRouter);
app.use('/api/student-bulk-imports', studentBulkImportsRouter);
app.use('/api/data-migration', dataMigrationRouter);
app.use('/api/student-reports', studentReportsRouter);
app.use('/api/student-analytics', studentAnalyticsRouter);
app.use('/api/parents', parentsRouter);
app.use('/api/parent-engagements', parentEngagementsRouter);
app.use('/api/parent-communications', parentCommunicationsRouter);
app.use('/api/parent-feedback', parentFeedbackRouter);
app.use('/api/parent-meetings', parentMeetingsRouter);
app.use('/api/parent-consents', parentConsentsRouter);
app.use('/api/parent-categories', parentCategoriesRouter);
app.use('/api/academic', academicRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/examination', examinationRouter);
app.use('/api/hr', hrRouter);
app.use('/api/transport', transportRouter);
app.use('/api/library', libraryRouter);
app.use('/api/hostel', hostelRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/communication', communicationPublicRouter);
app.use('/api/communication', communicationRouter);
app.use('/api/website-cms', websiteCmsRouter);
app.use('/api/reports-analytics', reportsAnalyticsRouter);
app.use('/api/system', systemRouter);
app.use('/api/settings/core-systems', settingsCoreSystemsRouter);
app.use('/api/settings/security-audit', settingsSecurityAuditRouter);
app.use('/api/settings/user-governance', settingsUserGovernanceRouter);
app.use('/api/settings/integrations-notifications', settingsIntegrationsNotificationRouter);
app.use('/api/settings/document-identity', settingsDocumentIdentityRouter);
app.use('/api/settings/department-operations', settingsDepartmentOperationsRouter);
app.use('/api/settings/data-modules-ui', settingsDataModulesUiRouter);
app.use('/api/settings/admin-dashboard', settingsAdminDashboardRouter);
app.use('/api/settings/integrations-api-updates', settingsIntegrationsApiUpdatesRouter);
app.use('/api/v1', b2bExternalRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/settings/license-support', settingsLicenseSupportRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);

  const anyErr = err as { type?: string; status?: number; statusCode?: number; limit?: number; message?: string };
  const message = err instanceof Error ? err.message : (typeof anyErr?.message === 'string' ? anyErr.message : 'Internal server error');

  // Body-parser / express.json payload limit (PDF OCR as base64)
  if (
    anyErr?.type === 'entity.too.large'
    || anyErr?.status === 413
    || anyErr?.statusCode === 413
    || message.toLowerCase().includes('request entity too large')
  ) {
    return res.status(413).json({
      error: 'Uploaded file is too large. Please upload a PDF/image under 20 MB (govt circular / board calendar).',
    });
  }

  const isDb =
    message.includes("Can't reach database server") ||
    message.includes('PrismaClientInitializationError');
  return res.status(isDb ? 503 : 500).json({
    error: isDb ? 'Database temporarily unavailable. Please retry in a few seconds.' : message,
  });
});

async function start() {
  try {
    await connectDatabase();
    await bootstrapCoreSystems();
    try {
      const institutionId = await getDefaultInstitutionId();
      await bootstrapSecurityAudit(institutionId);
      await bootstrapUserGovernance(institutionId);
      await bootstrapIntegrationsNotification(institutionId);
      await bootstrapDocumentIdentity(institutionId);
      await bootstrapDepartmentOps(institutionId);
      await bootstrapDataModulesUi(institutionId);
      await bootstrapGlobalEnvironment(institutionId);
      await bootstrapBrandingAssets(institutionId);
      await bootstrapLicenseSupport(institutionId);
    } catch (e) {
      console.warn('Security/governance bootstrap skipped:', e);
    }
  } catch {
    console.warn('Starting API without confirmed database connection — Neon may still be waking up.');
  }

  app.listen(port, () => {
    console.log(`API listening on http://localhost:${port}`);
    startInvigilationScheduler();
    startMobileReminderScheduler();
    startBackupScheduler();
    startParentCommunicationScheduler();
    startWebhookDeliveryWorker();
  });
}

void start();
