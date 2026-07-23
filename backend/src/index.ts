import 'dotenv/config';
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
import { admissionReportsRouter } from './routes/admissionReports.js';
import { studentsRouter } from './routes/students.js';
import { studentCategoriesRouter } from './routes/studentCategories.js';
import { studentBulkImportsRouter } from './routes/studentBulkImports.js';
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
import { mobileRouter } from './routes/mobile.js';
import { connectDatabase } from './lib/prisma.js';
import { startInvigilationScheduler } from './lib/examInvigilationScheduler.js';
import { startMobileReminderScheduler } from './lib/mobileReminderScheduler.js';
import { handleRazorpayWebhook } from './lib/mobileFees.js';
import { asyncHandler } from './lib/asyncHandler.js';

const app = express();
const port = Number(process.env.PORT || 4000);
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

app.use('/api/mobile', express.json({ limit: '15mb' }), mobileRouter);
app.use(express.json({ limit: '5mb' }));

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
app.use('/api/admission-reports', admissionReportsRouter);
app.use('/api/students', studentsRouter);
app.use('/api/student-categories', studentCategoriesRouter);
app.use('/api/student-bulk-imports', studentBulkImportsRouter);
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

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  const message = err instanceof Error ? err.message : 'Internal server error';
  const isDb =
    message.includes("Can't reach database server") ||
    message.includes('PrismaClientInitializationError');
  res.status(isDb ? 503 : 500).json({
    error: isDb ? 'Database temporarily unavailable. Please retry in a few seconds.' : 'Internal server error',
  });
});

async function start() {
  try {
    await connectDatabase();
  } catch {
    console.warn('Starting API without confirmed database connection — Neon may still be waking up.');
  }

  app.listen(port, () => {
    console.log(`API listening on http://localhost:${port}`);
    startInvigilationScheduler();
    startMobileReminderScheduler();
  });
}

void start();
