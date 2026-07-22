import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { getDefaultInstitutionId } from '../lib/institution.js';
import {
  createExamCalendarSession,
  getExamScheduleCalendar,
  getExamScheduleMeta,
  seedExamScheduleCalendarDemo,
} from '../lib/examSchedule.js';
import { getExamDashboard, getExamDashboardMeta, seedExamDashboardDemo } from '../lib/examDashboard.js';
import { ExamCalendarEventType, ExamPaperPurpose, ExamPaperSource, ExamPaperStatus, ExamSyllabusCategory, ExamTypeFilter } from '@prisma/client';
import { z } from 'zod';
import {
  createExamSubjectSyllabus,
  getExamSyllabusMeta,
  getExamSyllabusOverview,
  seedExamSyllabusDemo,
  updateExamSubjectSyllabus,
} from '../lib/examSyllabus.js';
import {
  createQuestionPaper,
  deleteQuestionPaper,
  DIFFICULTIES,
  generatePaperFromPdf,
  generatePaperFromSyllabus,
  getQuestionBankMeta,
  getQuestionPaper,
  listDigitalExamAttempts,
  listQuestionPapers,
  QUESTION_TYPES,
  scanPaperWithOcr,
  seedQuestionBankDemo,
  startDigitalExamAttempt,
  submitDigitalExamAttempt,
  updateQuestionPaper,
} from '../lib/examQuestionBank.js';
import {
  getPaperManagementDetail,
  getPaperManagementMeta,
  getMobilePublishedPapers,
  listPapersForManagement,
  publishPaperToMobile,
  seedPaperManagementDemo,
  unpublishPaperFromMobile,
} from '../lib/examPaperManagement.js';
import {
  completeExam,
  createSeatingPlan,
  finalizeSeatingPlan,
  getSeatingMeta,
  getSeatingPlan,
  issueExamCall,
  listSeatingPlans,
  seedSeatingDemo,
  startExam,
  updateAssignmentRoom,
} from '../lib/examSeating.js';
import {
  completeInvigilation,
  createInvigilationPlan,
  getInvigilationMeta,
  getInvigilationPlan,
  getMobileInvigilationDuties,
  listInvigilationPlans,
  publishInvigilationToMobile,
  rotateInvigilationPlan,
  runDailyInvigilationRotation,
  seedInvigilationDemo,
  startInvigilation,
  updateInvigilationDuty,
} from '../lib/examInvigilation.js';
import {
  bulkUploadSubjectTeacherAssignments,
  createSubjectTeacherAssignment,
  getMarkingSheet,
  getMarksEntryMeta,
  getMobileMarkingForTeacher,
  getSubjectTeacherAssignment,
  listSubjectTeacherAssignments,
  saveMarkingDraft,
  seedMarksEntryDemo,
  submitMarkingSheet,
  updateSubjectTeacherAssignment,
} from '../lib/examMarksEntry.js';
import {
  approveMarks,
  compileClassResults,
  getAuditTrail,
  getMobilePublishedResult,
  getResultBatch,
  getResultProcessingMeta,
  listPendingApprovals,
  listResultBatches,
  publishAllCompiledResults,
  publishResults,
  reopenMarks,
  returnToTeacher,
  runScheduledResultPublications,
  scheduleResultPublication,
  seedResultProcessingDemo,
  compileBatchById,
} from '../lib/examResultProcessing.js';
import {
  generateAllReportCards,
  generateReportCards,
  getBoardMarksheetFile,
  getClassReportCardStatuses,
  getReportCardAsset,
  getReportCardConfig,
  getReportCardPreviewData,
  getReportCardsMeta,
  listBoardMarksheetUploads,
  markReportCardsShared,
  seedReportCardsDemo,
  updateReportCardConfig,
  uploadBoardMarksheet,
  uploadReportCardAsset,
  validateClassMarksReadiness,
} from '../lib/examReportCards.js';
import {
  completeRevaluationReview,
  createBackPaperExam,
  createRevaluationRequest,
  enterBackPaperMarks,
  getEligibleStudentsForRevaluation,
  getFailedStudentsForBackPaper,
  getRevaluationMeta,
  listBackPaperExams,
  listRevaluationRequests,
  publishBackPaperResult,
  publishRevaluationResult,
  recordRevaluationFeePayment,
  seedRevaluationDemo,
  startRevaluationReview,
  updateRevaluationConfig,
} from '../lib/examRevaluation.js';
import {
  getGradePromotionMeta,
  listEligiblePassedStudents,
  listPromotionBatches,
  promoteStudents,
  seedGradePromotionDemo,
} from '../lib/examGradePromotion.js';
import {
  generateAllCertificates,
  generateCertificates,
  getCertificatePreview,
  getCertificatesMeta,
  getMobileCertificateByToken,
  getMobileCertificatesForTeacher,
  issueCertificates,
  listCertificates,
  recordCertificateFromMobile,
  seedCertificatesDemo,
} from '../lib/examCertificates.js';
import {
  getExamAnalytics,
  getExamAnalyticsMeta,
  seedExamAnalyticsDemo,
} from '../lib/examAnalytics.js';
import { ExamMarksColumnKey } from '@prisma/client';
import { PublicationVisibility } from '@prisma/client';

const fileSchema = z.object({
  fileName: z.string().min(1),
  mimeType: z.string().optional(),
  fileData: z.string().min(1),
});

const questionInputSchema = z.object({
  type: z.string(),
  difficulty: z.string(),
  questionText: z.string().min(1),
  options: z.array(z.string()).optional(),
  correctAnswer: z.string().optional(),
  marks: z.number().optional(),
});

export const examinationRouter = Router();
examinationRouter.use(requireAuth);

examinationRouter.get(
  '/dashboard/meta',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await getExamDashboardMeta(institutionId));
  }),
);

examinationRouter.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
    const examType = typeof req.query.examType === 'string' ? req.query.examType : undefined;
    return res.json(await getExamDashboard(institutionId, { academicYear, examType }));
  }),
);

examinationRouter.post(
  '/dashboard/seed',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.body?.academicYear === 'string' ? req.body.academicYear : '2025-26';
    return res.json(await seedExamDashboardDemo(institutionId, academicYear));
  }),
);

examinationRouter.get(
  '/schedule/meta',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await getExamScheduleMeta(institutionId));
  }),
);

examinationRouter.get(
  '/schedule/calendar',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
    const year = typeof req.query.year === 'string' ? Number(req.query.year) : undefined;
    const month = typeof req.query.month === 'string' ? Number(req.query.month) : undefined;
    const className = typeof req.query.className === 'string' ? req.query.className : undefined;
    const sectionName = typeof req.query.sectionName === 'string' ? req.query.sectionName : undefined;
    const examType = typeof req.query.examType === 'string' ? req.query.examType : undefined;
    const eventType = typeof req.query.eventType === 'string' ? req.query.eventType : undefined;
    const includeClassTests = req.query.includeClassTests !== 'false';
    return res.json(
      await getExamScheduleCalendar(institutionId, {
        academicYear,
        year,
        month,
        className,
        sectionName,
        examType,
        eventType,
        includeClassTests,
      }),
    );
  }),
);

examinationRouter.post(
  '/schedule/seed',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.body?.academicYear === 'string' ? req.body.academicYear : '2025-26';
    return res.json(await seedExamScheduleCalendarDemo(institutionId, academicYear));
  }),
);

examinationRouter.post(
  '/schedule/sessions',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const body = req.body ?? {};
    const eventType = body.eventType === 'CLASS_TEST' ? ExamCalendarEventType.CLASS_TEST : ExamCalendarEventType.EXAM;
    const examType = typeof body.examType === 'string' && Object.values(ExamTypeFilter).includes(body.examType)
      ? (body.examType as ExamTypeFilter)
      : undefined;
    if (!body.academicYear || !body.seriesName || !body.className || !body.sectionName || !body.subjectName || !body.examDate) {
      return res.status(400).json({ error: 'academicYear, seriesName, className, sectionName, subjectName, and examDate are required' });
    }
    return res.status(201).json(
      await createExamCalendarSession(institutionId, {
        academicYear: body.academicYear,
        eventType,
        examType,
        scheduleId: typeof body.scheduleId === 'string' ? body.scheduleId : undefined,
        seriesName: body.seriesName,
        className: body.className,
        sectionName: body.sectionName,
        subjectName: body.subjectName,
        examDate: body.examDate,
        startTime: body.startTime,
        endTime: body.endTime,
        status: body.status,
      }),
    );
  }),
);

examinationRouter.get(
  '/syllabus/meta',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await getExamSyllabusMeta(institutionId));
  }),
);

examinationRouter.get(
  '/syllabus',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
    const className = typeof req.query.className === 'string' ? req.query.className : undefined;
    const sectionName = typeof req.query.sectionName === 'string' ? req.query.sectionName : undefined;
    const subjectName = typeof req.query.subjectName === 'string' ? req.query.subjectName : undefined;
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    return res.json(
      await getExamSyllabusOverview(institutionId, {
        academicYear,
        className,
        sectionName,
        subjectName,
        category,
      }),
    );
  }),
);

examinationRouter.post(
  '/syllabus/seed',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.body?.academicYear === 'string' ? req.body.academicYear : '2025-26';
    return res.json(await seedExamSyllabusDemo(institutionId, academicYear));
  }),
);

examinationRouter.post(
  '/syllabus',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const body = req.body ?? {};
    const category = Object.values(ExamSyllabusCategory).includes(body.category)
      ? (body.category as ExamSyllabusCategory)
      : ExamSyllabusCategory.UNIT_TEST;
    if (!body.academicYear || !body.className || !body.subjectName || !body.title) {
      return res.status(400).json({ error: 'academicYear, className, subjectName, and title are required' });
    }
    const record = await createExamSubjectSyllabus(institutionId, {
      academicYear: body.academicYear,
      category,
      className: body.className,
      sectionName: body.sectionName,
      subjectName: body.subjectName,
      title: body.title,
      unitsCovered: body.unitsCovered,
      topics: body.topics,
      maxMarks: body.maxMarks,
      weightagePercent: body.weightagePercent,
      durationMinutes: body.durationMinutes,
      plannedMonth: body.plannedMonth,
      status: body.status,
      notes: body.notes,
    });
    return res.status(201).json({ record });
  }),
);

examinationRouter.patch(
  '/syllabus/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const body = req.body ?? {};
    const record = await updateExamSubjectSyllabus(institutionId, req.params.id, {
      title: body.title,
      unitsCovered: body.unitsCovered,
      topics: body.topics,
      maxMarks: body.maxMarks,
      weightagePercent: body.weightagePercent,
      durationMinutes: body.durationMinutes,
      plannedMonth: body.plannedMonth,
      status: body.status,
      notes: body.notes,
    });
    return res.json({ record });
  }),
);

examinationRouter.get(
  '/question-bank/meta',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await getQuestionBankMeta(institutionId));
  }),
);

examinationRouter.get(
  '/question-bank/papers',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(
      await listQuestionPapers(institutionId, {
        academicYear: typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined,
        className: typeof req.query.className === 'string' ? req.query.className : undefined,
        sectionName: typeof req.query.sectionName === 'string' ? req.query.sectionName : undefined,
        subjectName: typeof req.query.subjectName === 'string' ? req.query.subjectName : undefined,
        purpose: typeof req.query.purpose === 'string' ? req.query.purpose : undefined,
        status: typeof req.query.status === 'string' ? req.query.status : undefined,
      }),
    );
  }),
);

examinationRouter.get(
  '/question-bank/papers/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json({ paper: await getQuestionPaper(institutionId, req.params.id) });
  }),
);

examinationRouter.post(
  '/question-bank/seed',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.body?.academicYear === 'string' ? req.body.academicYear : '2025-26';
    return res.json(await seedQuestionBankDemo(institutionId, academicYear, req.user?.email || 'Teacher'));
  }),
);

examinationRouter.post(
  '/question-bank/generate-from-pdf',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      title: z.string().optional(),
      files: z.array(fileSchema).min(1).max(10),
      numQuestions: z.number().int().min(1).max(100),
      questionType: z.enum(QUESTION_TYPES),
      difficulty: z.enum(DIFFICULTIES),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    return res.json(await generatePaperFromPdf(parsed.data.files, parsed.data));
  }),
);

examinationRouter.post(
  '/question-bank/scan-ocr',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      title: z.string().optional(),
      files: z.array(fileSchema).min(1).max(10),
      questionType: z.enum(QUESTION_TYPES).optional().default('Multiple Choice'),
      difficulty: z.enum(DIFFICULTIES).optional().default('Medium'),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    return res.json(await scanPaperWithOcr(parsed.data.files, parsed.data));
  }),
);

examinationRouter.post(
  '/question-bank/generate-from-syllabus',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const schema = z.object({
      academicYear: z.string().min(1),
      className: z.string().min(1),
      sectionName: z.string().optional(),
      subjectName: z.string().min(1),
      purpose: z.nativeEnum(ExamPaperPurpose),
      numQuestions: z.number().int().min(1).max(100),
      questionType: z.enum(QUESTION_TYPES),
      difficulty: z.enum(DIFFICULTIES),
      title: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    return res.json(await generatePaperFromSyllabus(institutionId, parsed.data));
  }),
);

examinationRouter.post(
  '/question-bank/papers',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const schema = z.object({
      academicYear: z.string().min(1),
      className: z.string().min(1),
      sectionName: z.string().optional(),
      subjectName: z.string().min(1),
      title: z.string().min(1),
      purpose: z.nativeEnum(ExamPaperPurpose),
      source: z.nativeEnum(ExamPaperSource).optional(),
      durationMinutes: z.number().int().min(5).max(480).optional(),
      questionType: z.enum(QUESTION_TYPES).optional(),
      difficulty: z.enum(DIFFICULTIES).optional(),
      passMarksPercent: z.number().int().min(0).max(100).optional(),
      isDigitalExam: z.boolean().optional(),
      sourceFilesMeta: z.array(z.unknown()).optional(),
      status: z.nativeEnum(ExamPaperStatus).optional(),
      questions: z.array(questionInputSchema).min(1),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const paper = await createQuestionPaper(institutionId, {
      ...parsed.data,
      source: parsed.data.source || ExamPaperSource.MANUAL,
      createdBy: req.user?.email || 'Teacher',
    });
    return res.status(201).json({ paper });
  }),
);

examinationRouter.put(
  '/question-bank/papers/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const schema = z.object({
      title: z.string().min(1).optional(),
      purpose: z.nativeEnum(ExamPaperPurpose).optional(),
      durationMinutes: z.number().int().min(5).max(480).optional(),
      passMarksPercent: z.number().int().min(0).max(100).optional(),
      isDigitalExam: z.boolean().optional(),
      status: z.nativeEnum(ExamPaperStatus).optional(),
      questions: z.array(questionInputSchema).min(1).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const paper = await updateQuestionPaper(institutionId, req.params.id, parsed.data);
    return res.json({ paper });
  }),
);

examinationRouter.delete(
  '/question-bank/papers/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await deleteQuestionPaper(institutionId, req.params.id));
  }),
);

examinationRouter.post(
  '/question-bank/papers/:id/digital-exam/start',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const schema = z.object({
      candidateName: z.string().min(1),
      candidateRef: z.string().optional(),
      studentId: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    return res.status(201).json(
      await startDigitalExamAttempt(institutionId, req.params.id, parsed.data),
    );
  }),
);

examinationRouter.post(
  '/question-bank/digital-exam/:attemptId/submit',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const schema = z.object({ answers: z.record(z.string()) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    return res.json(
      await submitDigitalExamAttempt(institutionId, req.params.attemptId, parsed.data.answers),
    );
  }),
);

examinationRouter.get(
  '/question-bank/papers/:id/attempts',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json({ attempts: await listDigitalExamAttempts(institutionId, req.params.id) });
  }),
);

examinationRouter.get(
  '/paper-management/meta',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await getPaperManagementMeta(institutionId));
  }),
);

examinationRouter.get(
  '/paper-management/papers',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(
      await listPapersForManagement(institutionId, {
        academicYear: typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined,
        className: typeof req.query.className === 'string' ? req.query.className : undefined,
        sectionName: typeof req.query.sectionName === 'string' ? req.query.sectionName : undefined,
        subjectName: typeof req.query.subjectName === 'string' ? req.query.subjectName : undefined,
        purpose: typeof req.query.purpose === 'string' ? req.query.purpose : undefined,
        mobileStatus: typeof req.query.mobileStatus === 'string' ? req.query.mobileStatus : undefined,
      }),
    );
  }),
);

examinationRouter.get(
  '/paper-management/papers/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await getPaperManagementDetail(institutionId, req.params.id));
  }),
);

examinationRouter.post(
  '/paper-management/seed',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.body?.academicYear === 'string' ? req.body.academicYear : '2025-26';
    return res.json(await seedPaperManagementDemo(institutionId, academicYear));
  }),
);

examinationRouter.post(
  '/paper-management/papers/:id/publish-mobile',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const body = req.body ?? {};
    const visibleOn = body.visibleOn === 'APP'
      ? PublicationVisibility.APP
      : PublicationVisibility.BOTH;
    return res.json(
      await publishPaperToMobile(institutionId, req.params.id, {
        visibleOn,
        publishedBy: req.user?.email || 'Admin',
      }),
    );
  }),
);

examinationRouter.post(
  '/paper-management/papers/:id/unpublish-mobile',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await unpublishPaperFromMobile(institutionId, req.params.id));
  }),
);

examinationRouter.get(
  '/mobile/papers',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json({
      papers: await getMobilePublishedPapers(institutionId, {
        academicYear: typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined,
        className: typeof req.query.className === 'string' ? req.query.className : undefined,
        sectionName: typeof req.query.sectionName === 'string' ? req.query.sectionName : undefined,
      }),
    });
  }),
);

examinationRouter.get(
  '/seating/meta',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await getSeatingMeta(institutionId));
  }),
);

examinationRouter.get(
  '/seating/plans',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
    return res.json(await listSeatingPlans(institutionId, academicYear));
  }),
);

examinationRouter.get(
  '/seating/plans/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await getSeatingPlan(institutionId, req.params.id));
  }),
);

examinationRouter.post(
  '/seating/seed',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.body?.academicYear === 'string' ? req.body.academicYear : '2025-26';
    return res.json(await seedSeatingDemo(institutionId, academicYear));
  }),
);

examinationRouter.post(
  '/seating/plans',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const schema = z.object({
      academicYear: z.string().min(1),
      title: z.string().min(1),
      examDate: z.string().min(1),
      seriesPrefix: z.string().optional(),
      rooms: z.array(z.object({
        roomNumber: z.string().min(1),
        buildingName: z.string().optional(),
        capacity: z.number().int().min(1),
        invigilatorName: z.string().optional(),
      })).min(1),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    return res.status(201).json(
      await createSeatingPlan(institutionId, {
        ...parsed.data,
        createdBy: req.user?.email || 'Exam Admin',
      }),
    );
  }),
);

examinationRouter.post(
  '/seating/plans/:id/finalize',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await finalizeSeatingPlan(institutionId, req.params.id));
  }),
);

examinationRouter.post(
  '/seating/plans/:id/issue-exam-call',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await issueExamCall(institutionId, req.params.id, req.user?.email || 'Exam Admin'));
  }),
);

examinationRouter.post(
  '/seating/plans/:id/start-exam',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await startExam(institutionId, req.params.id));
  }),
);

examinationRouter.post(
  '/seating/plans/:id/complete',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await completeExam(institutionId, req.params.id));
  }),
);

examinationRouter.patch(
  '/seating/plans/:planId/assignments/:assignmentId/room',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const newRoomId = typeof req.body?.roomId === 'string' ? req.body.roomId : '';
    if (!newRoomId) return res.status(400).json({ error: 'roomId is required' });
    return res.json(
      await updateAssignmentRoom(institutionId, req.params.planId, req.params.assignmentId, newRoomId),
    );
  }),
);

examinationRouter.get(
  '/invigilation/meta',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await getInvigilationMeta(institutionId));
  }),
);

examinationRouter.get(
  '/invigilation/plans',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
    return res.json(await listInvigilationPlans(institutionId, academicYear));
  }),
);

examinationRouter.get(
  '/invigilation/plans/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await getInvigilationPlan(institutionId, req.params.id));
  }),
);

examinationRouter.post(
  '/invigilation/seed',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.body?.academicYear === 'string' ? req.body.academicYear : '2025-26';
    return res.json(await seedInvigilationDemo(institutionId, academicYear));
  }),
);

examinationRouter.post(
  '/invigilation/plans',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const schema = z.object({
      academicYear: z.string().min(1),
      title: z.string().min(1),
      examDate: z.string().min(1),
      seatingPlanId: z.string().optional(),
      teamSize: z.number().int().min(1).max(4).optional(),
      autoRotateEnabled: z.boolean().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    return res.status(201).json(
      await createInvigilationPlan(institutionId, {
        ...parsed.data,
        createdBy: req.user?.email || 'Exam Admin',
      }),
    );
  }),
);

examinationRouter.post(
  '/invigilation/plans/:id/rotate',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await rotateInvigilationPlan(institutionId, req.params.id));
  }),
);

examinationRouter.post(
  '/invigilation/plans/:id/publish-mobile',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await publishInvigilationToMobile(institutionId, req.params.id));
  }),
);

examinationRouter.post(
  '/invigilation/plans/:id/start',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await startInvigilation(institutionId, req.params.id));
  }),
);

examinationRouter.post(
  '/invigilation/plans/:id/complete',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await completeInvigilation(institutionId, req.params.id));
  }),
);

examinationRouter.patch(
  '/invigilation/plans/:planId/duties/:dutyId',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const schema = z.object({
      role: z.enum(['PRIMARY', 'CO_INVIGILATOR', 'FLOOR_SUPERVISOR', 'RELIEF']).optional(),
      roomNumber: z.string().optional(),
      buildingName: z.string().optional(),
      status: z.enum(['ASSIGNED', 'PRESENT', 'ABSENT', 'REPLACED']).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    return res.json(
      await updateInvigilationDuty(institutionId, req.params.planId, req.params.dutyId, parsed.data),
    );
  }),
);

examinationRouter.post(
  '/invigilation/cron/rotate',
  asyncHandler(async (req, res) => {
    const secret = process.env.CRON_SECRET;
    if (secret && req.headers['x-cron-secret'] !== secret) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const institutionId = await getDefaultInstitutionId();
    const dateStr = typeof req.body?.date === 'string' ? req.body.date : undefined;
    const targetDate = dateStr ? new Date(`${dateStr}T00:00:00.000Z`) : undefined;
    return res.json(await runDailyInvigilationRotation(institutionId, targetDate));
  }),
);

examinationRouter.get(
  '/mobile/invigilation',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(
      await getMobileInvigilationDuties(institutionId, {
        date: typeof req.query.date === 'string' ? req.query.date : undefined,
        teacherName: typeof req.query.teacherName === 'string' ? req.query.teacherName : undefined,
        staffName: typeof req.query.staffName === 'string' ? req.query.staffName : undefined,
      }),
    );
  }),
);

examinationRouter.get(
  '/marks-entry/meta',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await getMarksEntryMeta(institutionId));
  }),
);

examinationRouter.get(
  '/marks-entry/assignments',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
    return res.json(await listSubjectTeacherAssignments(institutionId, academicYear));
  }),
);

examinationRouter.get(
  '/marks-entry/assignments/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await getSubjectTeacherAssignment(institutionId, req.params.id));
  }),
);

examinationRouter.post(
  '/marks-entry/seed',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.body?.academicYear === 'string' ? req.body.academicYear : '2025-26';
    return res.json(await seedMarksEntryDemo(institutionId, academicYear));
  }),
);

examinationRouter.post(
  '/marks-entry/assignments',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const schema = z.object({
      academicYear: z.string().min(1),
      className: z.string().min(1),
      sectionName: z.string().min(1),
      subjectName: z.string().min(1),
      teacherName: z.string().min(1),
      teacherEmail: z.string().optional(),
      teacherPhone: z.string().optional(),
      examinationName: z.string().optional(),
      assignedColumns: z.array(z.nativeEnum(ExamMarksColumnKey)).min(1),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    return res.status(201).json(
      await createSubjectTeacherAssignment(institutionId, {
        ...parsed.data,
        createdBy: req.user?.email || 'Admin',
      }),
    );
  }),
);

examinationRouter.patch(
  '/marks-entry/assignments/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const schema = z.object({
      teacherName: z.string().optional(),
      teacherEmail: z.string().optional(),
      teacherPhone: z.string().optional(),
      examinationName: z.string().optional(),
      assignedColumns: z.array(z.nativeEnum(ExamMarksColumnKey)).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    return res.json(await updateSubjectTeacherAssignment(institutionId, req.params.id, parsed.data));
  }),
);

examinationRouter.post(
  '/marks-entry/assignments/bulk-upload',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const schema = z.object({
      rows: z.array(z.object({
        academicYear: z.string().default('2025-26'),
        className: z.string().min(1),
        sectionName: z.string().min(1),
        subjectName: z.string().min(1),
        teacherName: z.string().min(1),
        teacherEmail: z.string().optional(),
        teacherPhone: z.string().optional(),
        examinationName: z.string().optional(),
        assignedColumns: z.string().min(1),
      })).min(1),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    return res.json(
      await bulkUploadSubjectTeacherAssignments(institutionId, parsed.data.rows, req.user?.email || 'Admin'),
    );
  }),
);

examinationRouter.get(
  '/marks-entry/sheets/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await getMarkingSheet(institutionId, req.params.id));
  }),
);

examinationRouter.post(
  '/marks-entry/sheets/:id/draft',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const schema = z.object({
      entries: z.array(z.object({
        studentId: z.string().min(1),
        columnKey: z.nativeEnum(ExamMarksColumnKey),
        marksObtained: z.number().nullable().optional(),
        isAbsent: z.boolean().optional(),
        graceMarks: z.number().optional(),
        remarks: z.string().optional(),
        grade: z.string().optional(),
        examinerObservations: z.string().optional(),
      })),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    return res.json(await saveMarkingDraft(institutionId, req.params.id, parsed.data.entries));
  }),
);

examinationRouter.post(
  '/marks-entry/sheets/:id/submit',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(
      await submitMarkingSheet(institutionId, req.params.id, req.user?.email || 'Examiner'),
    );
  }),
);

examinationRouter.get(
  '/mobile/marks-entry',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const teacherName = typeof req.query.teacherName === 'string' ? req.query.teacherName : '';
    if (!teacherName) return res.status(400).json({ error: 'teacherName is required' });
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
    return res.json(await getMobileMarkingForTeacher(institutionId, teacherName, academicYear));
  }),
);

examinationRouter.get(
  '/result-processing/meta',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await getResultProcessingMeta(institutionId));
  }),
);

examinationRouter.get(
  '/result-processing/approvals',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
    return res.json(await listPendingApprovals(institutionId, academicYear));
  }),
);

examinationRouter.post(
  '/result-processing/seed',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.body?.academicYear === 'string' ? req.body.academicYear : '2025-26';
    return res.json(await seedResultProcessingDemo(institutionId, academicYear));
  }),
);

examinationRouter.post(
  '/result-processing/sheets/:id/approve',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const remarks = typeof req.body?.remarks === 'string' ? req.body.remarks : undefined;
    return res.json(await approveMarks(institutionId, req.params.id, req.user?.email || 'Principal', remarks));
  }),
);

examinationRouter.post(
  '/result-processing/sheets/:id/return',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const reason = typeof req.body?.reason === 'string' ? req.body.reason : '';
    if (!reason.trim()) return res.status(400).json({ error: 'reason is required' });
    return res.json(await returnToTeacher(institutionId, req.params.id, req.user?.email || 'Principal', reason));
  }),
);

examinationRouter.post(
  '/result-processing/sheets/:id/reopen',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const reason = typeof req.body?.reason === 'string' ? req.body.reason : '';
    if (!reason.trim()) return res.status(400).json({ error: 'reason is required' });
    return res.json(await reopenMarks(institutionId, req.params.id, req.user?.email || 'Principal', reason));
  }),
);

examinationRouter.get(
  '/result-processing/batches',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
    return res.json(await listResultBatches(institutionId, academicYear));
  }),
);

examinationRouter.get(
  '/result-processing/batches/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await getResultBatch(institutionId, req.params.id));
  }),
);

examinationRouter.post(
  '/result-processing/batches/:id/compile',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await compileBatchById(institutionId, req.params.id));
  }),
);

examinationRouter.post(
  '/result-processing/batches/:id/schedule',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const scheduledAt = typeof req.body?.scheduledAt === 'string' ? req.body.scheduledAt : '';
    if (!scheduledAt) return res.status(400).json({ error: 'scheduledAt is required' });
    return res.json(await scheduleResultPublication(institutionId, req.params.id, scheduledAt, req.user?.email || 'Admin'));
  }),
);

examinationRouter.post(
  '/result-processing/batches/:id/publish',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await publishResults(institutionId, req.params.id, req.user?.email || 'Admin'));
  }),
);

examinationRouter.post(
  '/result-processing/publish-all',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.body?.academicYear === 'string' ? req.body.academicYear : '2025-26';
    return res.json(await publishAllCompiledResults(institutionId, academicYear, req.user?.email || 'Admin'));
  }),
);

examinationRouter.post(
  '/result-processing/cron/publish',
  asyncHandler(async (req, res) => {
    const secret = process.env.CRON_SECRET;
    if (secret && req.headers['x-cron-secret'] !== secret) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const institutionId = await getDefaultInstitutionId();
    return res.json(await runScheduledResultPublications(institutionId));
  }),
);

examinationRouter.get(
  '/result-processing/audit',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await getAuditTrail(institutionId, {
      limit: typeof req.query.limit === 'string' ? Number(req.query.limit) : undefined,
      entityType: typeof req.query.entityType === 'string' ? req.query.entityType : undefined,
    }));
  }),
);

examinationRouter.get(
  '/mobile/results/:token',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await getMobilePublishedResult(institutionId, req.params.token));
  }),
);

examinationRouter.get(
  '/report-cards/meta',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await getReportCardsMeta(institutionId));
  }),
);

examinationRouter.get(
  '/report-cards/status',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
    return res.json(await getClassReportCardStatuses(institutionId, academicYear));
  }),
);

examinationRouter.get(
  '/report-cards/readiness',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : '2025-26';
    const className = typeof req.query.className === 'string' ? req.query.className : '';
    const sectionName = typeof req.query.sectionName === 'string' ? req.query.sectionName : '';
    const examinationName = typeof req.query.examinationName === 'string' ? req.query.examinationName : undefined;
    if (!className || !sectionName) return res.status(400).json({ error: 'className and sectionName are required' });
    return res.json(await validateClassMarksReadiness(institutionId, academicYear, className, sectionName, examinationName));
  }),
);

examinationRouter.get(
  '/report-cards/config',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
    return res.json(await getReportCardConfig(institutionId, academicYear));
  }),
);

examinationRouter.put(
  '/report-cards/config',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.body?.academicYear === 'string' ? req.body.academicYear : '2025-26';
    return res.json(await updateReportCardConfig(institutionId, academicYear, {
      schoolName: typeof req.body?.schoolName === 'string' ? req.body.schoolName : undefined,
      schoolAddress: typeof req.body?.schoolAddress === 'string' ? req.body.schoolAddress : undefined,
      principalName: typeof req.body?.principalName === 'string' ? req.body.principalName : undefined,
      footerNote: typeof req.body?.footerNote === 'string' ? req.body.footerNote : undefined,
      boardExamNotice: typeof req.body?.boardExamNotice === 'string' ? req.body.boardExamNotice : undefined,
    }));
  }),
);

examinationRouter.post(
  '/report-cards/assets/:assetType',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const assetType = req.params.assetType as 'principalSignature' | 'schoolSeal' | 'classTeacherSignature' | 'headerLogo';
    const valid = ['principalSignature', 'schoolSeal', 'classTeacherSignature', 'headerLogo'];
    if (!valid.includes(assetType)) return res.status(400).json({ error: 'Invalid asset type' });
    const parsed = fileSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'fileData and fileName are required' });
    const academicYear = typeof req.body?.academicYear === 'string' ? req.body.academicYear : '2025-26';
    return res.json(await uploadReportCardAsset(
      institutionId, academicYear, assetType, parsed.data.fileData, req.user?.email || 'Admin',
    ));
  }),
);

examinationRouter.get(
  '/report-cards/assets/:assetType',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const assetType = req.params.assetType as 'principalSignature' | 'schoolSeal' | 'classTeacherSignature' | 'headerLogo';
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : '2025-26';
    return res.json(await getReportCardAsset(institutionId, academicYear, assetType));
  }),
);

examinationRouter.post(
  '/report-cards/batches/:id/generate',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await generateReportCards(institutionId, req.params.id, req.user?.email || 'Admin'));
  }),
);

examinationRouter.post(
  '/report-cards/generate-all',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.body?.academicYear === 'string' ? req.body.academicYear : '2025-26';
    return res.json(await generateAllReportCards(institutionId, academicYear, req.user?.email || 'Admin'));
  }),
);

examinationRouter.get(
  '/report-cards/results/:id/preview',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await getReportCardPreviewData(institutionId, req.params.id));
  }),
);

examinationRouter.post(
  '/report-cards/batches/:id/share',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await markReportCardsShared(institutionId, req.params.id, req.user?.email || 'Admin'));
  }),
);

examinationRouter.get(
  '/report-cards/board-uploads',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : '2025-26';
    const className = typeof req.query.className === 'string' ? req.query.className : undefined;
    const sectionName = typeof req.query.sectionName === 'string' ? req.query.sectionName : undefined;
    return res.json(await listBoardMarksheetUploads(institutionId, academicYear, className, sectionName));
  }),
);

examinationRouter.post(
  '/report-cards/board-uploads',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const parsed = fileSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'fileData and fileName are required' });
    const studentId = typeof req.body?.studentId === 'string' ? req.body.studentId : '';
    const academicYear = typeof req.body?.academicYear === 'string' ? req.body.academicYear : '2025-26';
    const examinationName = typeof req.body?.examinationName === 'string' ? req.body.examinationName : 'Board Examination';
    const className = typeof req.body?.className === 'string' ? req.body.className : '';
    const sectionName = typeof req.body?.sectionName === 'string' ? req.body.sectionName : '';
    if (!studentId || !className || !sectionName) {
      return res.status(400).json({ error: 'studentId, className, and sectionName are required' });
    }
    return res.json(await uploadBoardMarksheet(institutionId, {
      studentId,
      academicYear,
      examinationName,
      className,
      sectionName,
      fileName: parsed.data.fileName,
      mimeType: parsed.data.mimeType || 'application/pdf',
      fileData: parsed.data.fileData,
    }, req.user?.email || 'Admin'));
  }),
);

examinationRouter.get(
  '/report-cards/board-uploads/:id/file',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await getBoardMarksheetFile(institutionId, req.params.id));
  }),
);

examinationRouter.post(
  '/report-cards/seed',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.body?.academicYear === 'string' ? req.body.academicYear : '2025-26';
    return res.json(await seedReportCardsDemo(institutionId, academicYear));
  }),
);

examinationRouter.get(
  '/revaluation/meta',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await getRevaluationMeta(institutionId));
  }),
);

examinationRouter.get(
  '/revaluation/requests',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await listRevaluationRequests(institutionId, {
      academicYear: typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined,
      status: typeof req.query.status === 'string' ? req.query.status : undefined,
      requestType: typeof req.query.requestType === 'string' ? req.query.requestType : undefined,
    }));
  }),
);

examinationRouter.get(
  '/revaluation/eligible',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : '2025-26';
    return res.json(await getEligibleStudentsForRevaluation(
      institutionId,
      academicYear,
      typeof req.query.className === 'string' ? req.query.className : undefined,
      typeof req.query.sectionName === 'string' ? req.query.sectionName : undefined,
    ));
  }),
);

examinationRouter.post(
  '/revaluation/requests',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const studentResultId = typeof req.body?.studentResultId === 'string' ? req.body.studentResultId : '';
    const subjectName = typeof req.body?.subjectName === 'string' ? req.body.subjectName : '';
    const requestType = req.body?.requestType === 'RECHECK' ? 'RECHECK' : 'REVALUATION';
    if (!studentResultId || !subjectName) {
      return res.status(400).json({ error: 'studentResultId and subjectName are required' });
    }
    return res.json(await createRevaluationRequest(
      institutionId,
      { studentResultId, subjectName, requestType, remarks: req.body?.remarks },
      req.user?.email || 'Admin',
    ));
  }),
);

examinationRouter.post(
  '/revaluation/requests/:id/pay-fee',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const feeReceiptNumber = typeof req.body?.feeReceiptNumber === 'string' ? req.body.feeReceiptNumber : '';
    const feePaymentMode = typeof req.body?.feePaymentMode === 'string' ? req.body.feePaymentMode : 'CASH';
    if (!feeReceiptNumber.trim()) return res.status(400).json({ error: 'feeReceiptNumber is required' });
    return res.json(await recordRevaluationFeePayment(
      institutionId, req.params.id, { feeReceiptNumber, feePaymentMode }, req.user?.email || 'Admin',
    ));
  }),
);

examinationRouter.post(
  '/revaluation/requests/:id/start-review',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await startRevaluationReview(institutionId, req.params.id, req.user?.email || 'Admin'));
  }),
);

examinationRouter.post(
  '/revaluation/requests/:id/complete',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const revisedMarks = Number(req.body?.revisedMarks);
    if (Number.isNaN(revisedMarks)) return res.status(400).json({ error: 'revisedMarks is required' });
    return res.json(await completeRevaluationReview(
      institutionId,
      req.params.id,
      {
        revisedMarks,
        revisedMaxMarks: req.body?.revisedMaxMarks ? Number(req.body.revisedMaxMarks) : undefined,
        approved: req.body?.approved !== false,
        rejectionReason: typeof req.body?.rejectionReason === 'string' ? req.body.rejectionReason : undefined,
      },
      req.user?.email || 'Admin',
    ));
  }),
);

examinationRouter.post(
  '/revaluation/requests/:id/publish',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await publishRevaluationResult(institutionId, req.params.id, req.user?.email || 'Admin'));
  }),
);

examinationRouter.put(
  '/revaluation/config',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.body?.academicYear === 'string' ? req.body.academicYear : '2025-26';
    return res.json(await updateRevaluationConfig(institutionId, academicYear, {
      revaluationFee: req.body?.revaluationFee !== undefined ? Number(req.body.revaluationFee) : undefined,
      recheckFee: req.body?.recheckFee !== undefined ? Number(req.body.recheckFee) : undefined,
      gracePeriodDays: req.body?.gracePeriodDays !== undefined ? Number(req.body.gracePeriodDays) : undefined,
      passingPercent: req.body?.passingPercent !== undefined ? Number(req.body.passingPercent) : undefined,
    }));
  }),
);

examinationRouter.get(
  '/revaluation/back-papers',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await listBackPaperExams(institutionId, {
      academicYear: typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined,
      status: typeof req.query.status === 'string' ? req.query.status : undefined,
    }));
  }),
);

examinationRouter.get(
  '/revaluation/back-papers/failed-students',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : '2025-26';
    return res.json(await getFailedStudentsForBackPaper(
      institutionId,
      academicYear,
      typeof req.query.className === 'string' ? req.query.className : undefined,
      typeof req.query.sectionName === 'string' ? req.query.sectionName : undefined,
    ));
  }),
);

examinationRouter.post(
  '/revaluation/back-papers',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const studentResultId = typeof req.body?.studentResultId === 'string' ? req.body.studentResultId : '';
    const subjectName = typeof req.body?.subjectName === 'string' ? req.body.subjectName : '';
    if (!studentResultId || !subjectName) {
      return res.status(400).json({ error: 'studentResultId and subjectName are required' });
    }
    return res.json(await createBackPaperExam(
      institutionId,
      { studentResultId, subjectName, examDate: req.body?.examDate, remarks: req.body?.remarks },
      req.user?.email || 'Admin',
    ));
  }),
);

examinationRouter.post(
  '/revaluation/back-papers/:id/marks',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const newMarks = Number(req.body?.newMarks);
    if (Number.isNaN(newMarks)) return res.status(400).json({ error: 'newMarks is required' });
    return res.json(await enterBackPaperMarks(
      institutionId,
      req.params.id,
      { newMarks, newMaxMarks: req.body?.newMaxMarks ? Number(req.body.newMaxMarks) : undefined },
      req.user?.email || 'Admin',
    ));
  }),
);

examinationRouter.post(
  '/revaluation/back-papers/:id/publish',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await publishBackPaperResult(institutionId, req.params.id, req.user?.email || 'Admin'));
  }),
);

examinationRouter.post(
  '/revaluation/seed',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.body?.academicYear === 'string' ? req.body.academicYear : '2025-26';
    return res.json(await seedRevaluationDemo(institutionId, academicYear));
  }),
);

examinationRouter.get(
  '/grade-promotion/meta',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await getGradePromotionMeta(institutionId));
  }),
);

examinationRouter.get(
  '/grade-promotion/eligible',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await listEligiblePassedStudents(institutionId, {
      academicYear: typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined,
      className: typeof req.query.className === 'string' ? req.query.className : undefined,
      sectionName: typeof req.query.sectionName === 'string' ? req.query.sectionName : undefined,
    }));
  }),
);

examinationRouter.post(
  '/grade-promotion/promote',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const studentIds = Array.isArray(req.body?.studentIds) ? req.body.studentIds as string[] : [];
    const fromAcademicYear = typeof req.body?.fromAcademicYear === 'string' ? req.body.fromAcademicYear : '';
    const toAcademicYear = typeof req.body?.toAcademicYear === 'string' ? req.body.toAcademicYear : '';
    const fromClassName = typeof req.body?.fromClassName === 'string' ? req.body.fromClassName : '';
    const fromSectionName = typeof req.body?.fromSectionName === 'string' ? req.body.fromSectionName : '';
    if (!studentIds.length || !fromAcademicYear || !toAcademicYear || !fromClassName) {
      return res.status(400).json({ error: 'studentIds, fromAcademicYear, toAcademicYear, and fromClassName are required' });
    }
    return res.json(await promoteStudents(
      institutionId,
      {
        studentIds,
        fromAcademicYear,
        toAcademicYear,
        fromClassName,
        fromSectionName,
        toClassName: typeof req.body?.toClassName === 'string' ? req.body.toClassName : undefined,
        toSectionName: typeof req.body?.toSectionName === 'string' ? req.body.toSectionName : undefined,
        remarks: typeof req.body?.remarks === 'string' ? req.body.remarks : undefined,
      },
      req.user?.email || 'Admin',
    ));
  }),
);

examinationRouter.get(
  '/grade-promotion/batches',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
    return res.json(await listPromotionBatches(institutionId, academicYear));
  }),
);

examinationRouter.post(
  '/grade-promotion/seed',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.body?.academicYear === 'string' ? req.body.academicYear : '2025-26';
    return res.json(await seedGradePromotionDemo(institutionId, academicYear));
  }),
);

examinationRouter.get(
  '/certificates/meta',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await getCertificatesMeta(institutionId));
  }),
);

examinationRouter.get(
  '/certificates',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await listCertificates(institutionId, {
      academicYear: typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined,
      className: typeof req.query.className === 'string' ? req.query.className : undefined,
      sectionName: typeof req.query.sectionName === 'string' ? req.query.sectionName : undefined,
      category: typeof req.query.category === 'string' ? req.query.category : undefined,
      status: typeof req.query.status === 'string' ? req.query.status : undefined,
    }));
  }),
);

examinationRouter.post(
  '/certificates/generate',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const certificateIds = Array.isArray(req.body?.certificateIds) ? req.body.certificateIds as string[] : [];
    return res.json(await generateCertificates(institutionId, certificateIds, req.user?.email || 'Admin'));
  }),
);

examinationRouter.post(
  '/certificates/generate-all',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.body?.academicYear === 'string' ? req.body.academicYear : '2025-26';
    return res.json(await generateAllCertificates(
      institutionId,
      academicYear,
      {
        className: typeof req.body?.className === 'string' ? req.body.className : undefined,
        sectionName: typeof req.body?.sectionName === 'string' ? req.body.sectionName : undefined,
        category: typeof req.body?.category === 'string' ? req.body.category : undefined,
      },
      req.user?.email || 'Admin',
    ));
  }),
);

examinationRouter.post(
  '/certificates/issue',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const certificateIds = Array.isArray(req.body?.certificateIds) ? req.body.certificateIds as string[] : [];
    return res.json(await issueCertificates(institutionId, certificateIds, req.user?.email || 'Admin'));
  }),
);

examinationRouter.post(
  '/certificates/mobile/record',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const teacherName = typeof req.body?.teacherName === 'string' ? req.body.teacherName : '';
    const studentId = typeof req.body?.studentId === 'string' ? req.body.studentId : '';
    const category = typeof req.body?.category === 'string' ? req.body.category : '';
    const activityTitle = typeof req.body?.activityTitle === 'string' ? req.body.activityTitle : '';
    if (!teacherName || !studentId || !category || !activityTitle) {
      return res.status(400).json({ error: 'teacherName, studentId, category, and activityTitle are required' });
    }
    return res.json(await recordCertificateFromMobile(institutionId, {
      teacherName,
      studentId,
      category,
      activityTitle,
      activityId: typeof req.body?.activityId === 'string' ? req.body.activityId : undefined,
      subCategory: typeof req.body?.subCategory === 'string' ? req.body.subCategory : undefined,
      academicYear: typeof req.body?.academicYear === 'string' ? req.body.academicYear : undefined,
      term: typeof req.body?.term === 'string' ? req.body.term : undefined,
      performanceScore: req.body?.performanceScore !== undefined ? Number(req.body.performanceScore) : undefined,
      performanceGrade: typeof req.body?.performanceGrade === 'string' ? req.body.performanceGrade : undefined,
      performanceBand: typeof req.body?.performanceBand === 'string' ? req.body.performanceBand : undefined,
      remarks: typeof req.body?.remarks === 'string' ? req.body.remarks : undefined,
    }));
  }),
);

examinationRouter.get(
  '/certificates/mobile/teacher',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const teacherName = typeof req.query.teacherName === 'string' ? req.query.teacherName : '';
    if (!teacherName) return res.status(400).json({ error: 'teacherName is required' });
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
    return res.json(await getMobileCertificatesForTeacher(institutionId, teacherName, academicYear));
  }),
);

examinationRouter.get(
  '/certificates/:id/preview',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await getCertificatePreview(institutionId, req.params.id));
  }),
);

examinationRouter.get(
  '/mobile/certificates/:token',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await getMobileCertificateByToken(institutionId, req.params.token));
  }),
);

examinationRouter.post(
  '/certificates/seed',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.body?.academicYear === 'string' ? req.body.academicYear : '2025-26';
    return res.json(await seedCertificatesDemo(institutionId, academicYear));
  }),
);

examinationRouter.get(
  '/analytics/meta',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await getExamAnalyticsMeta(institutionId));
  }),
);

examinationRouter.get(
  '/analytics',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await getExamAnalytics(institutionId, {
      academicYear: typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined,
      examType: typeof req.query.examType === 'string' ? req.query.examType : undefined,
      className: typeof req.query.className === 'string' ? req.query.className : undefined,
      sectionName: typeof req.query.sectionName === 'string' ? req.query.sectionName : undefined,
    }));
  }),
);

examinationRouter.post(
  '/analytics/seed',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.body?.academicYear === 'string' ? req.body.academicYear : '2025-26';
    return res.json(await seedExamAnalyticsDemo(institutionId, academicYear));
  }),
);
