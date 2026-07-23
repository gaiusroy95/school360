import { Router } from 'express';
import { z } from 'zod';
import {
  AcademicCceType,
  AcademicEventType,
  AcademicHomeworkStatus,
  AcademicLessonPlanStatus,
  AcademicPeriodType,
  BloomsTaxonomyLevel,
  AcademicWorkloadLevel,
} from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { getDefaultInstitutionId } from '../lib/institution.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import {
  getAcademicDashboard,
  nextAcademicRecordId,
  serializeClassSection,
  serializeHomework,
  serializeLessonPlan,
  serializeSubject,
  syncClassSectionsFromInstitutionSetup,
} from '../lib/academicManagement.js';
import { seedAcademicDemoData } from '../lib/academicSeed.js';
import { clearInstitutionDemoData } from '../lib/clearDemoData.js';
import { syncTeacherProfilesFromAcademic } from '../lib/teacherAttendance.js';
import { getInstitutionFilterMeta } from '../lib/students.js';
import {
  bulkAssignElectives,
  detectTimetableConflicts,
  getCurriculumAnalytics,
  getOrCreateCurriculum,
  getTeacherWorkloadSummary,
  serializeCurriculum,
  serializeSyllabusChapter,
} from '../lib/curriculumHub.js';
import {
  bulkUpsertTimetableSlots,
  createTimetableSlotRecord,
  getDailySchedule,
  listTimetableSlots,
  publishTimetable,
  updateTimetableSlotRecord,
} from '../lib/timetable.js';
import {
  createClassTestForLessonPlan,
  getLessonPlanWithResults,
  getMobileLessonAnalytics,
  listClassTests,
  submitClassTestScores,
} from '../lib/lessonPlanning.js';
import {
  getHomeworkDashboard,
  getHomeworkDetail,
  getMobileHomeworkForStudent,
} from '../lib/homework.js';
import {
  confirmCalendarUpload,
  createCalendarUploadAndScan,
  getMobileAcademicCalendar,
  listCalendarUploads,
  publishAcademicCalendar,
  serializeCalendarEvent,
} from '../lib/academicCalendar.js';
import {
  createRosterTask,
  getMobileTeacherTasks,
  getTeacherRosterDashboard,
  publishTeacherRosterTasks,
  ROSTER_TASK_TYPES,
  syncAllocationsToRoster,
  updateMobileTeacherTask,
  updateRosterTask,
} from '../lib/teacherRoster.js';
import {
  ACADEMIC_REPORT_CATALOG,
  generateAcademicReport,
  generateAllAcademicReports,
  reportToCsv,
  type AcademicReportType,
} from '../lib/academicReports.js';
import {
  addTeacherToSubject,
  bulkSetSyllabusRevisionDeadlines,
  createSubjectWithTeachers,
  getSubjectManagementDashboard,
  updateSubjectOffering,
} from '../lib/subjectManagement.js';
import {
  CO_SCHOLASTIC_CATEGORIES,
  createCoScholasticActivity,
  getCoScholasticDashboard,
  getCoScholasticDetail,
  getMobileCoScholasticForParent,
  getMobileCoScholasticForStudent,
  getMobileCoScholasticForTeacher,
  publishCoScholasticActivities,
  recordCoScholasticPerformances,
  submitParentCoScholasticFeedback,
  updateCoScholasticActivity,
} from '../lib/coScholastic.js';
import {
  bulkGenerateEvaluations,
  createTeacherEvaluation,
  getMobileTeacherEvaluations,
  getTeacherEvaluationDashboard,
  listTeacherDevCycles,
  listTeacherEvaluations,
  publishTeacherDevCyclesToCalendar,
  publishTeacherEvaluations,
  syncEvaluationFeedback,
  updateTeacherEvaluation,
  upsertTeacherDevCycle,
} from '../lib/teacherEvaluation.js';

export const academicRouter = Router();
academicRouter.use(requireAuth);

const yearTermSchema = z.object({
  academicYear: z.string().optional(),
  term: z.string().optional(),
  className: z.string().optional(),
  sectionName: z.string().optional(),
});

academicRouter.get(
  '/meta',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const filters = await getInstitutionFilterMeta(institutionId);
    return res.json({
      defaultAcademicYear: filters.defaultAcademicYear,
      academicYears: filters.academicYears,
      classes: filters.classes,
      sectionsByClass: filters.sectionsByClass,
      terms: ['Term 1', 'Term 2'],
    });
  }),
);

academicRouter.post(
  '/seed',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const year = typeof req.body?.academicYear === 'string' ? req.body.academicYear : '2025-26';
    const result = await seedAcademicDemoData(institutionId, year);
    return res.json(result);
  }),
);

academicRouter.post(
  '/clear-demo',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const year = typeof req.body?.academicYear === 'string' ? req.body.academicYear : '2025-26';
    const confirm = req.body?.confirm === true;
    if (!confirm) {
      return res.status(400).json({
        error: 'Confirmation required',
        message: 'Send { "confirm": true, "academicYear": "2025-26" } to clear demo data',
      });
    }
    return res.json(await clearInstitutionDemoData(institutionId, year));
  }),
);

academicRouter.post(
  '/sync-classes',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const year = typeof req.body?.academicYear === 'string' ? req.body.academicYear : '2025-26';
    const result = await syncClassSectionsFromInstitutionSetup(institutionId, year);
    return res.json(result);
  }),
);

academicRouter.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const parsed = yearTermSchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    const filters = await getInstitutionFilterMeta(institutionId);
    const data = await getAcademicDashboard(institutionId, {
      academicYear: parsed.data.academicYear || filters.defaultAcademicYear,
      term: parsed.data.term,
      className: parsed.data.className,
      sectionName: parsed.data.sectionName,
    });
    return res.json(data);
  }),
);

// ─── Class & Sections ───────────────────────────────────────────────────────

academicRouter.get(
  '/class-sections',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
    const rows = await prisma.academicClassSection.findMany({
      where: { institutionId, ...(academicYear ? { academicYear } : {}) },
      orderBy: [{ className: 'asc' }, { sectionName: 'asc' }],
    });
    return res.json({ records: rows.map(serializeClassSection) });
  }),
);

academicRouter.post(
  '/class-sections',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      academicYear: z.string().default('2025-26'),
      className: z.string().min(1),
      sectionName: z.string().min(1),
      capacity: z.number().optional(),
      room: z.string().optional(),
      classTeacher: z.string().optional(),
      classTeacherPhone: z.string().optional(),
      classTeacherEmail: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    const recordId = await nextAcademicRecordId(institutionId, 'classSection');
    const row = await prisma.academicClassSection.create({
      data: { institutionId, recordId, ...parsed.data, capacity: parsed.data.capacity ?? 40 },
    });
    return res.status(201).json({ record: serializeClassSection(row) });
  }),
);

academicRouter.patch(
  '/class-sections/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const existing = await prisma.academicClassSection.findFirst({ where: { institutionId, id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const row = await prisma.academicClassSection.update({
      where: { id: existing.id },
      data: req.body,
    });
    return res.json({ record: serializeClassSection(row) });
  }),
);

academicRouter.delete(
  '/class-sections/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const existing = await prisma.academicClassSection.findFirst({ where: { institutionId, id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Not found' });
    await prisma.academicClassSection.delete({ where: { id: existing.id } });
    return res.json({ ok: true });
  }),
);

// ─── Subjects ─────────────────────────────────────────────────────────────────

academicRouter.get(
  '/subjects',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
    if (req.query.dashboard === 'true' && academicYear) {
      const dashboard = await getSubjectManagementDashboard(institutionId, academicYear);
      return res.json(dashboard);
    }
    const rows = await prisma.academicSubject.findMany({
      where: { institutionId },
      orderBy: { subjectName: 'asc' },
    });
    return res.json({ records: rows.map(serializeSubject) });
  }),
);

academicRouter.get(
  '/subjects/management',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : '2025-26';
    const dashboard = await getSubjectManagementDashboard(institutionId, academicYear);
    return res.json(dashboard);
  }),
);

academicRouter.post(
  '/subjects',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      subjectName: z.string().min(1),
      subjectCode: z.string().optional(),
      subjectType: z.string().optional(),
      subjectGroup: z.string().optional(),
      isElective: z.boolean().optional(),
      academicYear: z.string().optional(),
      teachers: z.array(z.object({
        teacherName: z.string().min(1),
        teacherEmail: z.string().optional(),
        teacherPhone: z.string().optional(),
        className: z.string().min(1),
        sectionName: z.string().min(1),
        courseStartDate: z.string().optional(),
        courseCompletionDeadline: z.string().optional(),
        revisionDeadline: z.string().optional(),
      })).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();

    if (parsed.data.teachers && parsed.data.teachers.length > 0) {
      const result = await createSubjectWithTeachers(institutionId, parsed.data);
      await syncTeacherProfilesFromAcademic(institutionId, parsed.data.academicYear || '2025-26');
      return res.status(201).json(result);
    }

    const { teachers, academicYear, ...subjectData } = parsed.data;
    const recordId = await nextAcademicRecordId(institutionId, 'subject');
    const row = await prisma.academicSubject.create({
      data: { institutionId, recordId, ...subjectData },
    });
    return res.status(201).json({ record: serializeSubject(row) });
  }),
);

academicRouter.delete(
  '/subjects/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const existing = await prisma.academicSubject.findFirst({ where: { institutionId, id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Not found' });
    await prisma.academicSubject.delete({ where: { id: existing.id } });
    return res.json({ ok: true });
  }),
);

// ─── Syllabus ─────────────────────────────────────────────────────────────────

academicRouter.get(
  '/syllabus',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
    const className = typeof req.query.className === 'string' ? req.query.className : undefined;
    const sectionName = typeof req.query.sectionName === 'string' ? req.query.sectionName : undefined;
    const rows = await prisma.academicSyllabusChapter.findMany({
      where: {
        institutionId,
        ...(academicYear ? { academicYear } : {}),
        ...(className ? { className } : {}),
        ...(sectionName ? { sectionName } : {}),
      },
      orderBy: [{ className: 'asc' }, { sectionName: 'asc' }, { subjectName: 'asc' }, { unitNumber: 'asc' }],
    });
    return res.json({ records: rows.map(serializeSyllabusChapter) });
  }),
);

academicRouter.post(
  '/syllabus',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      academicYear: z.string().default('2025-26'),
      term: z.string().default('Term 1'),
      className: z.string().min(1),
      sectionName: z.string().optional(),
      subjectName: z.string().min(1),
      chapterTitle: z.string().min(1),
      unitNumber: z.number().optional(),
      boardTopicCode: z.string().optional(),
      plannedStartDate: z.string().optional(),
      plannedEndDate: z.string().optional(),
      revisionDeadline: z.string().optional(),
      completionPercent: z.number().min(0).max(100).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    const recordId = await nextAcademicRecordId(institutionId, 'syllabus');
    const row = await prisma.academicSyllabusChapter.create({
      data: {
        institutionId,
        recordId,
        academicYear: parsed.data.academicYear,
        term: parsed.data.term,
        className: parsed.data.className,
        sectionName: parsed.data.sectionName || '',
        subjectName: parsed.data.subjectName,
        chapterTitle: parsed.data.chapterTitle,
        unitNumber: parsed.data.unitNumber ?? 1,
        boardTopicCode: parsed.data.boardTopicCode || '',
        plannedStartDate: parsed.data.plannedStartDate ? new Date(parsed.data.plannedStartDate) : null,
        plannedEndDate: parsed.data.plannedEndDate ? new Date(parsed.data.plannedEndDate) : null,
        revisionDeadline: parsed.data.revisionDeadline ? new Date(parsed.data.revisionDeadline) : null,
        completionPercent: parsed.data.completionPercent ?? 0,
      },
    });
    return res.status(201).json({ record: serializeSyllabusChapter(row) });
  }),
);

academicRouter.patch(
  '/syllabus/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const existing = await prisma.academicSyllabusChapter.findFirst({ where: { institutionId, id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const body = req.body as Record<string, unknown>;
    const data: Record<string, unknown> = { ...body };
    if (body.plannedStartDate) data.plannedStartDate = new Date(String(body.plannedStartDate));
    if (body.plannedEndDate) data.plannedEndDate = new Date(String(body.plannedEndDate));
    if (body.revisionDeadline) data.revisionDeadline = new Date(String(body.revisionDeadline));
    const row = await prisma.academicSyllabusChapter.update({ where: { id: existing.id }, data });
    return res.json({ record: serializeSyllabusChapter(row) });
  }),
);

// ─── Timetable ────────────────────────────────────────────────────────────────

const timetableSlotSchema = z.object({
  academicYear: z.string().default('2025-26'),
  term: z.string().default('Term 1'),
  className: z.string().min(1),
  sectionName: z.string().min(1),
  dayOfWeek: z.number().min(1).max(7),
  period: z.number().min(1),
  periodLabel: z.string().optional(),
  periodType: z.enum(['THEORY', 'PRACTICAL', 'LAB', 'SPORTS', 'EVENT']).optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  subjectName: z.string().min(1),
  teacherName: z.string().optional(),
  room: z.string().optional(),
  effectiveFrom: z.string().optional().nullable(),
  effectiveTo: z.string().optional().nullable(),
  versionLabel: z.string().optional(),
  notes: z.string().optional(),
});

academicRouter.get(
  '/timetable',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
    const term = typeof req.query.term === 'string' ? req.query.term : undefined;
    const className = typeof req.query.className === 'string' ? req.query.className : undefined;
    const sectionName = typeof req.query.sectionName === 'string' ? req.query.sectionName : undefined;
    const teacherName = typeof req.query.teacherName === 'string' ? req.query.teacherName : undefined;
    const dayOfWeek = typeof req.query.dayOfWeek === 'string' ? Number(req.query.dayOfWeek) : undefined;
    const effectiveDate = typeof req.query.effectiveDate === 'string' ? req.query.effectiveDate : undefined;
    const periodType = typeof req.query.periodType === 'string' ? req.query.periodType as AcademicPeriodType : undefined;

    const records = await listTimetableSlots(institutionId, {
      academicYear,
      term,
      className,
      sectionName,
      teacherName,
      dayOfWeek: dayOfWeek && !Number.isNaN(dayOfWeek) ? dayOfWeek : undefined,
      effectiveDate,
      periodType,
    });
    return res.json({ records });
  }),
);

academicRouter.post(
  '/timetable',
  asyncHandler(async (req, res) => {
    const parsed = timetableSlotSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    const record = await createTimetableSlotRecord(institutionId, parsed.data);
    return res.status(201).json({ record });
  }),
);

academicRouter.patch(
  '/timetable/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const parsed = timetableSlotSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const record = await updateTimetableSlotRecord(institutionId, req.params.id, parsed.data);
    if (!record) return res.status(404).json({ error: 'Not found' });
    return res.json({ record });
  }),
);

academicRouter.delete(
  '/timetable/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const existing = await prisma.academicTimetableSlot.findFirst({ where: { institutionId, id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Not found' });
    await prisma.academicTimetableSlot.delete({ where: { id: existing.id } });
    return res.json({ ok: true });
  }),
);

academicRouter.post(
  '/timetable/bulk',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      academicYear: z.string(),
      term: z.string().optional(),
      className: z.string().optional(),
      sectionName: z.string().optional(),
      effectiveFrom: z.string().optional().nullable(),
      effectiveTo: z.string().optional().nullable(),
      versionLabel: z.string().optional(),
      replaceExisting: z.boolean().optional(),
      slots: z.array(timetableSlotSchema),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    const result = await bulkUpsertTimetableSlots(institutionId, parsed.data);
    return res.json(result);
  }),
);

academicRouter.post(
  '/timetable/publish',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      academicYear: z.string(),
      className: z.string().optional(),
      sectionName: z.string().optional(),
      term: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    const result = await publishTimetable(institutionId, parsed.data);
    return res.json(result);
  }),
);

academicRouter.get(
  '/timetable/schedule/daily',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const filters = await getInstitutionFilterMeta(institutionId);
    const date = typeof req.query.date === 'string' ? req.query.date : new Date().toISOString().slice(0, 10);
    const audience = typeof req.query.audience === 'string' ? req.query.audience : 'teacher';
    if (!['teacher', 'parent', 'principal'].includes(audience)) {
      return res.status(400).json({ error: 'Invalid audience' });
    }
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : filters.defaultAcademicYear;
    const teacherName = typeof req.query.teacherName === 'string' ? req.query.teacherName : undefined;
    const studentId = typeof req.query.studentId === 'string' ? req.query.studentId : undefined;
    const className = typeof req.query.className === 'string' ? req.query.className : undefined;
    const sectionName = typeof req.query.sectionName === 'string' ? req.query.sectionName : undefined;
    const publishedOnly = req.query.publishedOnly !== 'false';

    try {
      const schedule = await getDailySchedule(institutionId, {
        date,
        academicYear,
        audience: audience as 'teacher' | 'parent' | 'principal',
        teacherName,
        studentId,
        className,
        sectionName,
        publishedOnly: audience === 'principal' ? publishedOnly : true,
      });
      return res.json(schedule);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load schedule';
      return res.status(400).json({ error: message });
    }
  }),
);

academicRouter.get(
  '/timetable/conflicts',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : '2025-26';
    const effectiveDate = typeof req.query.effectiveDate === 'string' ? req.query.effectiveDate : undefined;
    const slots = await prisma.academicTimetableSlot.findMany({
      where: {
        institutionId,
        academicYear,
        ...(effectiveDate
          ? {
              AND: [
                { OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: new Date(effectiveDate) } }] },
                { OR: [{ effectiveTo: null }, { effectiveTo: { gte: new Date(effectiveDate) } }] },
              ],
            }
          : {}),
      },
    });
    const conflicts = detectTimetableConflicts(slots);
    return res.json({ conflicts, slotCount: slots.length });
  }),
);

// ─── Lesson Plans ─────────────────────────────────────────────────────────────

const lessonPlanSchema = z.object({
  academicYear: z.string().default('2025-26'),
  term: z.string().default('Term 1'),
  className: z.string().min(1),
  sectionName: z.string().min(1),
  subjectName: z.string().min(1),
  department: z.string().optional(),
  title: z.string().min(1),
  teacherName: z.string().optional(),
  objective: z.string().optional(),
  teachingMethod: z.string().optional(),
  propsUsed: z.string().optional(),
  bloomsLevel: z.enum(['REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE', 'CREATE']).optional(),
  resultMeasurement: z.string().optional(),
  syllabusChapterId: z.string().optional(),
  plannedDate: z.string().optional(),
  notes: z.string().optional(),
  resources: z.array(z.object({
    type: z.enum(['pdf', 'link', 'video', 'other']),
    title: z.string(),
    url: z.string(),
  })).optional(),
  share: z.boolean().optional(),
  createClassTest: z.boolean().optional(),
});

academicRouter.get(
  '/lesson-plans',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
    const className = typeof req.query.className === 'string' ? req.query.className : undefined;
    const sectionName = typeof req.query.sectionName === 'string' ? req.query.sectionName : undefined;
    const rows = await prisma.academicLessonPlan.findMany({
      where: {
        institutionId,
        ...(academicYear ? { academicYear } : {}),
        ...(className ? { className } : {}),
        ...(sectionName ? { sectionName } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: { classTests: { include: { scores: true } } },
    });
    return res.json({
      records: rows.map((r) => ({
        ...serializeLessonPlan(r),
        hasClassTest: r.classTests.length > 0,
        classTestId: r.classTests[0]?.id ?? null,
        resultBuckets: r.classTests[0]
          ? {
              excellent: r.classTests[0].scores.filter((s) => s.bucket === 'EXCELLENT').length,
              good: r.classTests[0].scores.filter((s) => s.bucket === 'GOOD').length,
              average: r.classTests[0].scores.filter((s) => s.bucket === 'AVERAGE').length,
              below: r.classTests[0].scores.filter((s) => s.bucket === 'BELOW').length,
            }
          : null,
      })),
    });
  }),
);

academicRouter.get(
  '/lesson-plans/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const record = await getLessonPlanWithResults(institutionId, req.params.id);
    if (!record) return res.status(404).json({ error: 'Not found' });
    return res.json({ record });
  }),
);

academicRouter.post(
  '/lesson-plans',
  asyncHandler(async (req, res) => {
    const parsed = lessonPlanSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    const recordId = await nextAcademicRecordId(institutionId, 'lessonPlan');
    const row = await prisma.academicLessonPlan.create({
      data: {
        institutionId,
        recordId,
        academicYear: parsed.data.academicYear,
        term: parsed.data.term,
        className: parsed.data.className,
        sectionName: parsed.data.sectionName,
        subjectName: parsed.data.subjectName,
        department: parsed.data.department || 'General',
        title: parsed.data.title,
        teacherName: parsed.data.teacherName || '',
        objective: parsed.data.objective || '',
        teachingMethod: parsed.data.teachingMethod || '',
        propsUsed: parsed.data.propsUsed || '',
        bloomsLevel: (parsed.data.bloomsLevel as BloomsTaxonomyLevel) || 'UNDERSTAND',
        resultMeasurement: parsed.data.resultMeasurement || '',
        syllabusChapterId: parsed.data.syllabusChapterId || null,
        plannedDate: parsed.data.plannedDate ? new Date(parsed.data.plannedDate) : null,
        notes: parsed.data.notes || '',
        resources: (parsed.data.resources || []) as object,
        status: parsed.data.share ? 'IN_PROGRESS' : 'DRAFT',
        sharedAt: parsed.data.share ? new Date() : null,
      },
    });
    if (parsed.data.createClassTest) {
      await createClassTestForLessonPlan(institutionId, row.id);
    }
    return res.status(201).json({ record: serializeLessonPlan(row) });
  }),
);

academicRouter.patch(
  '/lesson-plans/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const existing = await prisma.academicLessonPlan.findFirst({ where: { institutionId, id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const parsed = lessonPlanSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const data = parsed.data;
    const row = await prisma.academicLessonPlan.update({
      where: { id: existing.id },
      data: {
        ...(data.academicYear !== undefined ? { academicYear: data.academicYear } : {}),
        ...(data.term !== undefined ? { term: data.term } : {}),
        ...(data.className !== undefined ? { className: data.className } : {}),
        ...(data.sectionName !== undefined ? { sectionName: data.sectionName } : {}),
        ...(data.subjectName !== undefined ? { subjectName: data.subjectName } : {}),
        ...(data.department !== undefined ? { department: data.department } : {}),
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.teacherName !== undefined ? { teacherName: data.teacherName } : {}),
        ...(data.objective !== undefined ? { objective: data.objective } : {}),
        ...(data.teachingMethod !== undefined ? { teachingMethod: data.teachingMethod } : {}),
        ...(data.propsUsed !== undefined ? { propsUsed: data.propsUsed } : {}),
        ...(data.bloomsLevel !== undefined ? { bloomsLevel: data.bloomsLevel as BloomsTaxonomyLevel } : {}),
        ...(data.resultMeasurement !== undefined ? { resultMeasurement: data.resultMeasurement } : {}),
        ...(data.syllabusChapterId !== undefined ? { syllabusChapterId: data.syllabusChapterId || null } : {}),
        ...(data.plannedDate !== undefined ? { plannedDate: data.plannedDate ? new Date(data.plannedDate) : null } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
        ...(data.resources !== undefined ? { resources: data.resources as object } : {}),
        ...(data.share ? { sharedAt: new Date(), status: 'IN_PROGRESS' as const } : {}),
        ...((req.body as { status?: string }).status === 'COMPLETED' ? { completionPercent: 100, status: 'COMPLETED' as const } : {}),
      },
    });
    return res.json({ record: serializeLessonPlan(row) });
  }),
);

academicRouter.post(
  '/lesson-plans/:id/class-test',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const schema = z.object({ title: z.string().optional(), maxMarks: z.number().optional(), conductedDate: z.string().optional() });
    const parsed = schema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    try {
      const record = await createClassTestForLessonPlan(institutionId, req.params.id, parsed.data);
      return res.status(201).json({ record });
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to create class test' });
    }
  }),
);

// ─── Class Tests (Examination Management sync) ─────────────────────────────────

academicRouter.get(
  '/class-tests',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
    const className = typeof req.query.className === 'string' ? req.query.className : undefined;
    const sectionName = typeof req.query.sectionName === 'string' ? req.query.sectionName : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const records = await listClassTests(institutionId, { academicYear, className, sectionName, status });
    return res.json({ records });
  }),
);

academicRouter.get(
  '/class-tests/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const test = await prisma.academicClassTest.findFirst({
      where: { institutionId, id: req.params.id },
      include: {
        scores: { include: { student: { select: { firstName: true, lastName: true, admissionNumber: true } } } },
        lessonPlan: true,
      },
    });
    if (!test) return res.status(404).json({ error: 'Not found' });
    const { serializeClassTest, serializeClassTestScore } = await import('../lib/lessonPlanning.js');
    return res.json({
      record: serializeClassTest(test, test.scores),
      scores: test.scores.map(serializeClassTestScore),
      lessonPlan: test.lessonPlan,
    });
  }),
);

academicRouter.post(
  '/class-tests/:id/scores',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const schema = z.object({
      scores: z.array(z.object({ studentId: z.string(), marksObtained: z.number().min(0) })).min(1),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    try {
      const result = await submitClassTestScores(institutionId, req.params.id, parsed.data.scores);
      return res.json(result);
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to submit scores' });
    }
  }),
);

academicRouter.get(
  '/analytics/mobile/lesson-performance',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const studentId = typeof req.query.studentId === 'string' ? req.query.studentId : undefined;
    if (!studentId) return res.status(400).json({ error: 'studentId is required' });
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
    try {
      const analytics = await getMobileLessonAnalytics(institutionId, { studentId, academicYear });
      return res.json(analytics);
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to load analytics' });
    }
  }),
);

// ─── Homework ─────────────────────────────────────────────────────────────────

academicRouter.get(
  '/homework/dashboard',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const filters = await getInstitutionFilterMeta(institutionId);
    const date = typeof req.query.date === 'string' ? req.query.date : new Date().toISOString().slice(0, 10);
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : filters.defaultAcademicYear;
    const className = typeof req.query.className === 'string' ? req.query.className : undefined;
    const sectionName = typeof req.query.sectionName === 'string' ? req.query.sectionName : undefined;
    const teacherName = typeof req.query.teacherName === 'string' ? req.query.teacherName : undefined;
    const dashboard = await getHomeworkDashboard(institutionId, { date, academicYear, className, sectionName, teacherName });
    return res.json(dashboard);
  }),
);

academicRouter.get(
  '/homework/mobile',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const studentId = typeof req.query.studentId === 'string' ? req.query.studentId : undefined;
    if (!studentId) return res.status(400).json({ error: 'studentId is required' });
    const date = typeof req.query.date === 'string' ? req.query.date : undefined;
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
    try {
      const data = await getMobileHomeworkForStudent(institutionId, { studentId, date, academicYear });
      return res.json(data);
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to load homework' });
    }
  }),
);

academicRouter.get(
  '/homework',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
    const className = typeof req.query.className === 'string' ? req.query.className : undefined;
    const sectionName = typeof req.query.sectionName === 'string' ? req.query.sectionName : undefined;
    const date = typeof req.query.date === 'string' ? req.query.date : undefined;
    const where: Record<string, unknown> = { institutionId, ...(academicYear ? { academicYear } : {}), ...(className ? { className } : {}), ...(sectionName ? { sectionName } : {}) };
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      where.assignedDate = { gte: start, lte: end };
    }
    const rows = await prisma.academicHomework.findMany({
      where,
      orderBy: { assignedDate: 'desc' },
    });
    return res.json({ records: rows.map(serializeHomework) });
  }),
);

academicRouter.get(
  '/homework/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const record = await getHomeworkDetail(institutionId, req.params.id);
    if (!record) return res.status(404).json({ error: 'Not found' });
    return res.json({ record });
  }),
);

academicRouter.post(
  '/homework',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      academicYear: z.string().default('2025-26'),
      term: z.string().default('Term 1'),
      className: z.string().min(1),
      sectionName: z.string().min(1),
      subjectName: z.string().min(1),
      teacherName: z.string().optional(),
      title: z.string().min(1),
      description: z.string().optional(),
      assignedDate: z.string().optional(),
      dueDate: z.string().optional(),
      totalStudents: z.number().optional(),
      share: z.boolean().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    const recordId = await nextAcademicRecordId(institutionId, 'homework');
    const now = new Date();
    const row = await prisma.academicHomework.create({
      data: {
        institutionId,
        recordId,
        academicYear: parsed.data.academicYear,
        term: parsed.data.term,
        className: parsed.data.className,
        sectionName: parsed.data.sectionName,
        subjectName: parsed.data.subjectName,
        teacherName: parsed.data.teacherName || '',
        title: parsed.data.title,
        description: parsed.data.description || '',
        assignedDate: parsed.data.assignedDate ? new Date(parsed.data.assignedDate) : now,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
        totalStudents: parsed.data.totalStudents ?? 0,
        sharedAt: parsed.data.share ? now : null,
        publishedAt: parsed.data.share ? now : null,
        status: 'ASSIGNED',
      },
    });
    return res.status(201).json({ record: serializeHomework(row) });
  }),
);

academicRouter.patch(
  '/homework/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const existing = await prisma.academicHomework.findFirst({ where: { institutionId, id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const body = req.body as Record<string, unknown>;
    const data: Record<string, unknown> = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.description !== undefined) data.description = body.description;
    if (body.teacherName !== undefined) data.teacherName = body.teacherName;
    if (body.status !== undefined) data.status = body.status;
    if (body.submittedCount !== undefined) data.submittedCount = body.submittedCount;
    if (body.totalStudents !== undefined) data.totalStudents = body.totalStudents;
    if (body.dueDate) data.dueDate = new Date(String(body.dueDate));
    if (body.share || body.sharedAt) {
      data.sharedAt = new Date();
      data.publishedAt = new Date();
    }
    const row = await prisma.academicHomework.update({ where: { id: existing.id }, data });
    return res.json({ record: serializeHomework(row) });
  }),
);

// ─── Calendar ─────────────────────────────────────────────────────────────────

academicRouter.get(
  '/calendar',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
    const boardName = typeof req.query.boardName === 'string' ? req.query.boardName : undefined;
    const rows = await prisma.academicCalendarEvent.findMany({
      where: {
        institutionId,
        ...(academicYear ? { academicYear } : {}),
        ...(boardName ? { boardName } : {}),
      },
      orderBy: { eventDate: 'asc' },
    });
    return res.json({ records: rows.map(serializeCalendarEvent) });
  }),
);

academicRouter.get(
  '/calendar/uploads',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
    const uploads = await listCalendarUploads(institutionId, academicYear);
    return res.json({ uploads });
  }),
);

academicRouter.post(
  '/calendar/upload-ocr',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      boardName: z.string().min(1),
      academicYear: z.string().default('2025-26'),
      fileName: z.string().min(1),
      fileData: z.string().min(1),
      mimeType: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    try {
      const result = await createCalendarUploadAndScan(institutionId, parsed.data);
      return res.status(201).json(result);
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'OCR scan failed' });
    }
  }),
);

academicRouter.post(
  '/calendar/uploads/:id/confirm',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const schema = z.object({
      replaceExisting: z.boolean().optional(),
      events: z.array(z.object({
        title: z.string(),
        eventDate: z.string(),
        endDate: z.string().optional().nullable(),
        eventType: z.enum(['HOLIDAY', 'EXAM', 'PTM', 'ACTIVITY', 'OTHER']),
        description: z.string().optional(),
      })).optional(),
    });
    const parsed = schema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    try {
      const result = await confirmCalendarUpload(institutionId, req.params.id, parsed.data);
      return res.json(result);
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Import failed' });
    }
  }),
);

academicRouter.post(
  '/calendar/publish',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      academicYear: z.string(),
      boardName: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    const result = await publishAcademicCalendar(institutionId, parsed.data);
    return res.json(result);
  }),
);

academicRouter.get(
  '/calendar/mobile',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const filters = await getInstitutionFilterMeta(institutionId);
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : filters.defaultAcademicYear;
    const boardName = typeof req.query.boardName === 'string' ? req.query.boardName : undefined;
    const month = typeof req.query.month === 'string' ? req.query.month : undefined;
    const audience = typeof req.query.audience === 'string' ? req.query.audience : 'all';
    const data = await getMobileAcademicCalendar(institutionId, { academicYear, boardName, month, audience });
    return res.json(data);
  }),
);

academicRouter.post(
  '/calendar',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      academicYear: z.string().default('2025-26'),
      term: z.string().default('Term 1'),
      boardName: z.string().optional(),
      title: z.string().min(1),
      eventType: z.enum(['HOLIDAY', 'EXAM', 'PTM', 'ACTIVITY', 'OTHER']).optional(),
      eventDate: z.string(),
      endDate: z.string().optional(),
      description: z.string().optional(),
      sharedToParents: z.boolean().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    const recordId = await nextAcademicRecordId(institutionId, 'calendar');
    const row = await prisma.academicCalendarEvent.create({
      data: {
        institutionId,
        recordId,
        academicYear: parsed.data.academicYear,
        term: parsed.data.term,
        boardName: parsed.data.boardName || '',
        title: parsed.data.title,
        eventType: (parsed.data.eventType as AcademicEventType) || 'OTHER',
        eventDate: new Date(parsed.data.eventDate),
        endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
        description: parsed.data.description || '',
        sharedToParents: parsed.data.sharedToParents ?? false,
        eventSource: 'MANUAL',
      },
    });
    return res.status(201).json({ record: serializeCalendarEvent(row) });
  }),
);

academicRouter.patch(
  '/calendar/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const existing = await prisma.academicCalendarEvent.findFirst({ where: { institutionId, id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const body = req.body as Record<string, unknown>;
    const row = await prisma.academicCalendarEvent.update({
      where: { id: existing.id },
      data: {
        ...(body.title !== undefined ? { title: String(body.title) } : {}),
        ...(body.description !== undefined ? { description: String(body.description) } : {}),
        ...(body.eventType !== undefined ? { eventType: body.eventType as AcademicEventType } : {}),
        ...(body.eventDate ? { eventDate: new Date(String(body.eventDate)) } : {}),
        ...(body.endDate !== undefined ? { endDate: body.endDate ? new Date(String(body.endDate)) : null } : {}),
        ...(body.sharedToParents !== undefined ? { sharedToParents: Boolean(body.sharedToParents) } : {}),
        ...(body.publish ? { publishedAt: new Date(), sharedToParents: true } : {}),
      },
    });
    return res.json({ record: serializeCalendarEvent(row) });
  }),
);

academicRouter.delete(
  '/calendar/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const existing = await prisma.academicCalendarEvent.findFirst({ where: { institutionId, id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Not found' });
    await prisma.academicCalendarEvent.delete({ where: { id: existing.id } });
    return res.json({ ok: true });
  }),
);

// ─── Teacher Continuous Evaluation ────────────────────────────────────────────

academicRouter.get(
  '/teacher-evaluation/dashboard',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : '2025-26';
    const devCycleId = typeof req.query.devCycleId === 'string' ? req.query.devCycleId : undefined;
    const dashboard = await getTeacherEvaluationDashboard(institutionId, academicYear, devCycleId);
    return res.json(dashboard);
  }),
);

academicRouter.get(
  '/teacher-evaluation/cycles',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : '2025-26';
    const cycles = await listTeacherDevCycles(institutionId, academicYear);
    return res.json({ cycles });
  }),
);

academicRouter.post(
  '/teacher-evaluation/cycles',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      id: z.string().optional(),
      academicYear: z.string().default('2025-26'),
      cycleNumber: z.number().int().min(1).max(5),
      title: z.string().min(1),
      startDate: z.string(),
      endDate: z.string(),
      evaluationDueDate: z.string(),
      description: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    const cycle = await upsertTeacherDevCycle(institutionId, parsed.data);
    return res.status(201).json({ cycle });
  }),
);

academicRouter.post(
  '/teacher-evaluation/cycles/publish-calendar',
  asyncHandler(async (req, res) => {
    const schema = z.object({ academicYear: z.string().default('2025-26') });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    const result = await publishTeacherDevCyclesToCalendar(institutionId, parsed.data.academicYear);
    return res.json(result);
  }),
);

academicRouter.get(
  '/teacher-evaluation',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
    const devCycleId = typeof req.query.devCycleId === 'string' ? req.query.devCycleId : undefined;
    const teacherName = typeof req.query.teacherName === 'string' ? req.query.teacherName : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const records = await listTeacherEvaluations(institutionId, { academicYear, devCycleId, teacherName, status });
    return res.json({ records });
  }),
);

academicRouter.post(
  '/teacher-evaluation/bulk-generate',
  asyncHandler(async (req, res) => {
    const schema = z.object({ devCycleId: z.string().min(1) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    const result = await bulkGenerateEvaluations(institutionId, parsed.data.devCycleId);
    return res.json(result);
  }),
);

academicRouter.post(
  '/teacher-evaluation',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      devCycleId: z.string().min(1),
      teacherName: z.string().min(1),
      department: z.string().optional(),
      className: z.string().optional(),
      sectionName: z.string().optional(),
      subjectName: z.string().optional(),
      taskActionScore: z.number().min(0).max(100).optional(),
      taskActionNotes: z.string().optional(),
      taskActionEvidence: z.string().optional(),
      improvementPlanScore: z.number().min(0).max(100).optional(),
      improvementPlanNotes: z.string().optional(),
      improvementPlanDetails: z.string().optional(),
      parentEngagementScore: z.number().min(0).max(100).optional(),
      parentEngagementNotes: z.string().optional(),
      parentEngagementCount: z.number().optional(),
      parentFeedbackScore: z.number().min(0).max(100).optional(),
      parentFeedbackNotes: z.string().optional(),
      parentFeedbackCount: z.number().optional(),
      studentFeedbackScore: z.number().min(0).max(100).optional(),
      studentFeedbackNotes: z.string().optional(),
      studentFeedbackCount: z.number().optional(),
      status: z.enum(['DRAFT', 'IN_REVIEW', 'COMPLETED', 'PUBLISHED']).optional(),
      evaluatedBy: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    const record = await createTeacherEvaluation(institutionId, parsed.data);
    return res.status(201).json({ record });
  }),
);

academicRouter.post(
  '/teacher-evaluation/publish',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      academicYear: z.string().default('2025-26'),
      devCycleId: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    const result = await publishTeacherEvaluations(institutionId, parsed.data);
    return res.json(result);
  }),
);

academicRouter.get(
  '/teacher-evaluation/mobile',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const teacherName = typeof req.query.teacherName === 'string' ? req.query.teacherName : '';
    if (!teacherName) return res.status(400).json({ error: 'teacherName is required' });
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
    const records = await getMobileTeacherEvaluations(institutionId, teacherName, academicYear);
    return res.json({ records, total: records.length });
  }),
);

academicRouter.patch(
  '/teacher-evaluation/:id',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      teacherName: z.string().optional(),
      department: z.string().optional(),
      className: z.string().optional(),
      sectionName: z.string().optional(),
      subjectName: z.string().optional(),
      taskActionScore: z.number().min(0).max(100).optional(),
      taskActionNotes: z.string().optional(),
      taskActionEvidence: z.string().optional(),
      improvementPlanScore: z.number().min(0).max(100).optional(),
      improvementPlanNotes: z.string().optional(),
      improvementPlanDetails: z.string().optional(),
      parentEngagementScore: z.number().min(0).max(100).optional(),
      parentEngagementNotes: z.string().optional(),
      parentEngagementCount: z.number().optional(),
      parentFeedbackScore: z.number().min(0).max(100).optional(),
      parentFeedbackNotes: z.string().optional(),
      parentFeedbackCount: z.number().optional(),
      studentFeedbackScore: z.number().min(0).max(100).optional(),
      studentFeedbackNotes: z.string().optional(),
      studentFeedbackCount: z.number().optional(),
      status: z.enum(['DRAFT', 'IN_REVIEW', 'COMPLETED', 'PUBLISHED']).optional(),
      evaluatedBy: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    const record = await updateTeacherEvaluation(institutionId, req.params.id, parsed.data);
    return res.json({ record });
  }),
);

academicRouter.post(
  '/teacher-evaluation/:id/sync-feedback',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const record = await syncEvaluationFeedback(institutionId, req.params.id);
    return res.json({ record });
  }),
);

// ─── CCE ──────────────────────────────────────────────────────────────────────

academicRouter.get(
  '/cce',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
    const rows = await prisma.academicCceRecord.findMany({
      where: { institutionId, ...(academicYear ? { academicYear } : {}) },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ records: rows });
  }),
);

academicRouter.post(
  '/cce',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      academicYear: z.string().default('2025-26'),
      term: z.string().default('Term 1'),
      className: z.string().min(1),
      sectionName: z.string().optional(),
      cceType: z.enum(['UNIT_TEST', 'ASSIGNMENT', 'PROJECT', 'ACTIVITY']),
      title: z.string().min(1),
      subjectName: z.string().optional(),
      conductedDate: z.string().optional(),
      maxMarks: z.number().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    const recordId = await nextAcademicRecordId(institutionId, 'cce');
    const row = await prisma.academicCceRecord.create({
      data: {
        institutionId,
        recordId,
        academicYear: parsed.data.academicYear,
        term: parsed.data.term,
        className: parsed.data.className,
        sectionName: parsed.data.sectionName || '',
        cceType: parsed.data.cceType as AcademicCceType,
        title: parsed.data.title,
        subjectName: parsed.data.subjectName || '',
        conductedDate: parsed.data.conductedDate ? new Date(parsed.data.conductedDate) : new Date(),
        maxMarks: parsed.data.maxMarks ?? 100,
      },
    });
    return res.status(201).json({ record: row });
  }),
);

// ─── Co-Scholastic ────────────────────────────────────────────────────────────

academicRouter.get(
  '/co-scholastic/categories',
  asyncHandler(async (_req, res) => {
    return res.json({ categories: CO_SCHOLASTIC_CATEGORIES });
  }),
);

academicRouter.get(
  '/co-scholastic/dashboard',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : '2025-26';
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const dashboard = await getCoScholasticDashboard(institutionId, { academicYear, category, status });
    return res.json(dashboard);
  }),
);

academicRouter.get(
  '/co-scholastic',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : '2025-26';
    const dashboard = await getCoScholasticDashboard(institutionId, { academicYear });
    return res.json({ records: dashboard.activities });
  }),
);

academicRouter.post(
  '/co-scholastic/publish',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      academicYear: z.string().default('2025-26'),
      activityIds: z.array(z.string()).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    const result = await publishCoScholasticActivities(institutionId, parsed.data);
    return res.json(result);
  }),
);

academicRouter.get(
  '/co-scholastic/mobile/teacher',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const teacherName = typeof req.query.teacherName === 'string' ? req.query.teacherName : '';
    if (!teacherName) return res.status(400).json({ error: 'teacherName is required' });
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
    const records = await getMobileCoScholasticForTeacher(institutionId, teacherName, academicYear);
    return res.json({ records, total: records.length });
  }),
);

academicRouter.get(
  '/co-scholastic/mobile/student',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const studentId = typeof req.query.studentId === 'string' ? req.query.studentId : '';
    if (!studentId) return res.status(400).json({ error: 'studentId is required' });
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
    const records = await getMobileCoScholasticForStudent(institutionId, studentId, academicYear);
    return res.json({ records, total: records.length });
  }),
);

academicRouter.get(
  '/co-scholastic/mobile/parent',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const studentId = typeof req.query.studentId === 'string' ? req.query.studentId : '';
    if (!studentId) return res.status(400).json({ error: 'studentId is required' });
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
    const records = await getMobileCoScholasticForParent(institutionId, studentId, academicYear);
    return res.json({ records, total: records.length });
  }),
);

academicRouter.get(
  '/co-scholastic/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const detail = await getCoScholasticDetail(institutionId, req.params.id);
    return res.json(detail);
  }),
);

academicRouter.post(
  '/co-scholastic',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      academicYear: z.string().default('2025-26'),
      term: z.string().default('Term 1'),
      title: z.string().min(1),
      category: z.string().min(1),
      subCategory: z.string().optional(),
      activityType: z.string().optional(),
      className: z.string().optional(),
      sectionName: z.string().optional(),
      teacherName: z.string().optional(),
      coTeacherName: z.string().optional(),
      activityDate: z.string(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      venue: z.string().optional(),
      description: z.string().optional(),
      measurementCriteria: z.string().optional(),
      maxScore: z.number().optional(),
      status: z.enum(['PLANNED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    const record = await createCoScholasticActivity(institutionId, parsed.data);
    return res.status(201).json({ record });
  }),
);

academicRouter.patch(
  '/co-scholastic/:id',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      title: z.string().optional(),
      term: z.string().optional(),
      category: z.string().optional(),
      subCategory: z.string().optional(),
      activityType: z.string().optional(),
      className: z.string().optional(),
      sectionName: z.string().optional(),
      teacherName: z.string().optional(),
      coTeacherName: z.string().optional(),
      activityDate: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      venue: z.string().optional(),
      description: z.string().optional(),
      measurementCriteria: z.string().optional(),
      maxScore: z.number().optional(),
      status: z.enum(['PLANNED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    const record = await updateCoScholasticActivity(institutionId, req.params.id, parsed.data);
    return res.json({ record });
  }),
);

academicRouter.post(
  '/co-scholastic/:id/performances',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      recordedBy: z.string().min(1),
      performances: z.array(z.object({
        studentId: z.string().min(1),
        studentName: z.string().optional(),
        className: z.string().optional(),
        sectionName: z.string().optional(),
        performanceScore: z.number().min(0),
        remarks: z.string().optional(),
      })).min(1),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    const result = await recordCoScholasticPerformances(institutionId, req.params.id, parsed.data);
    return res.json(result);
  }),
);

academicRouter.post(
  '/co-scholastic/:id/feedback',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      studentId: z.string().min(1),
      parentName: z.string().optional(),
      parentRelationship: z.string().optional(),
      rating: z.number().min(1).max(5),
      message: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    const feedback = await submitParentCoScholasticFeedback(institutionId, req.params.id, parsed.data);
    return res.status(201).json({ feedback });
  }),
);

// ─── Teacher Allocation ───────────────────────────────────────────────────────

academicRouter.get(
  '/teacher-allocations',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
    const rows = await prisma.academicTeacherAllocation.findMany({
      where: { institutionId, ...(academicYear ? { academicYear } : {}) },
      orderBy: { teacherName: 'asc' },
    });
    return res.json({ records: rows });
  }),
);

academicRouter.post(
  '/teacher-allocations',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      academicYear: z.string().default('2025-26'),
      teacherName: z.string().min(1),
      department: z.string().optional(),
      className: z.string().min(1),
      sectionName: z.string().optional(),
      subjectName: z.string().min(1),
      periodsPerWeek: z.number().optional(),
      workloadLevel: z.enum(['FULL', 'MEDIUM', 'LOW']).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    const recordId = await nextAcademicRecordId(institutionId, 'teacher');
    const row = await prisma.academicTeacherAllocation.create({
      data: {
        institutionId,
        recordId,
        academicYear: parsed.data.academicYear,
        teacherName: parsed.data.teacherName,
        department: parsed.data.department || 'General',
        className: parsed.data.className,
        sectionName: parsed.data.sectionName || '',
        subjectName: parsed.data.subjectName,
        periodsPerWeek: parsed.data.periodsPerWeek ?? 0,
        workloadLevel: (parsed.data.workloadLevel as AcademicWorkloadLevel) || 'MEDIUM',
      },
    });
    await syncTeacherProfilesFromAcademic(institutionId, parsed.data.academicYear);
    return res.status(201).json({ record: row });
  }),
);

// ─── Teacher Roster Planner ─────────────────────────────────────────────────────

academicRouter.get(
  '/teacher-roster/dashboard',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : '2025-26';
    const teacherName = typeof req.query.teacherName === 'string' ? req.query.teacherName : undefined;
    const taskType = typeof req.query.taskType === 'string' ? req.query.taskType : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const dashboard = await getTeacherRosterDashboard(institutionId, { academicYear, teacherName, taskType, status });
    return res.json(dashboard);
  }),
);

academicRouter.get(
  '/teacher-roster/task-types',
  asyncHandler(async (_req, res) => {
    return res.json({ taskTypes: ROSTER_TASK_TYPES });
  }),
);

academicRouter.post(
  '/teacher-roster/tasks',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      academicYear: z.string().default('2025-26'),
      term: z.string().default('Term 1'),
      teacherName: z.string().min(1),
      department: z.string().optional(),
      taskType: z.enum(['CLASS_SUBJECT', 'TASK', 'ACTIVITY', 'EVENT', 'PARENT_ENGAGEMENT', 'OTHER']),
      title: z.string().min(1),
      description: z.string().optional(),
      className: z.string().optional(),
      sectionName: z.string().optional(),
      subjectName: z.string().optional(),
      linkedEntityId: z.string().optional(),
      startDate: z.string().optional(),
      dueDate: z.string().optional(),
      endDate: z.string().optional(),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
      status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
      feedbackRequired: z.boolean().optional(),
      assignedBy: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    const task = await createRosterTask(institutionId, parsed.data);
    await syncTeacherProfilesFromAcademic(institutionId, parsed.data.academicYear);
    return res.status(201).json({ task });
  }),
);

academicRouter.patch(
  '/teacher-roster/tasks/:id',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      teacherName: z.string().optional(),
      department: z.string().optional(),
      taskType: z.enum(['CLASS_SUBJECT', 'TASK', 'ACTIVITY', 'EVENT', 'PARENT_ENGAGEMENT', 'OTHER']).optional(),
      title: z.string().optional(),
      description: z.string().optional(),
      className: z.string().optional(),
      sectionName: z.string().optional(),
      subjectName: z.string().optional(),
      startDate: z.string().optional(),
      dueDate: z.string().optional(),
      endDate: z.string().optional(),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
      status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
      feedbackRequired: z.boolean().optional(),
      feedbackNotes: z.string().optional(),
      parentFeedbackRating: z.number().min(0).max(5).optional(),
      feedbackRecorded: z.boolean().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    const task = await updateRosterTask(institutionId, req.params.id, parsed.data);
    return res.json({ task });
  }),
);

academicRouter.post(
  '/teacher-roster/sync-allocations',
  asyncHandler(async (req, res) => {
    const schema = z.object({ academicYear: z.string().default('2025-26') });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    const result = await syncAllocationsToRoster(institutionId, parsed.data.academicYear);
    return res.json(result);
  }),
);

academicRouter.post(
  '/teacher-roster/publish',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      academicYear: z.string().default('2025-26'),
      taskIds: z.array(z.string()).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    const result = await publishTeacherRosterTasks(institutionId, parsed.data);
    return res.json(result);
  }),
);

academicRouter.get(
  '/teacher-roster/mobile/tasks',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const teacherName = typeof req.query.teacherName === 'string' ? req.query.teacherName : '';
    if (!teacherName) return res.status(400).json({ error: 'teacherName is required' });
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const data = await getMobileTeacherTasks(institutionId, teacherName, { academicYear, status });
    return res.json(data);
  }),
);

academicRouter.patch(
  '/teacher-roster/mobile/tasks/:id',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      teacherName: z.string().min(1),
      status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
      feedbackNotes: z.string().optional(),
      parentFeedbackRating: z.number().min(0).max(5).optional(),
      feedbackRecorded: z.boolean().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    const { teacherName, ...data } = parsed.data;
    const task = await updateMobileTeacherTask(institutionId, req.params.id, teacherName, data);
    return res.json({ task });
  }),
);

// ─── Subject Allocations ──────────────────────────────────────────────────────

academicRouter.get(
  '/subject-allocations',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
    const rows = await prisma.academicSubjectAllocation.findMany({
      where: { institutionId, ...(academicYear ? { academicYear } : {}) },
      include: { subject: true },
    });
    return res.json({ records: rows });
  }),
);

academicRouter.post(
  '/subject-allocations',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      academicYear: z.string().default('2025-26'),
      subjectId: z.string().min(1),
      className: z.string().min(1),
      sectionName: z.string().min(1),
      teacherName: z.string().default(''),
      teacherEmail: z.string().optional(),
      teacherPhone: z.string().optional(),
      courseStartDate: z.string().optional(),
      courseCompletionDeadline: z.string().optional(),
      revisionDeadline: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    const offering = await addTeacherToSubject(institutionId, parsed.data.subjectId, parsed.data);
    return res.status(201).json({ record: offering });
  }),
);

academicRouter.patch(
  '/subject-allocations/:id',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      teacherName: z.string().optional(),
      teacherEmail: z.string().optional(),
      teacherPhone: z.string().optional(),
      className: z.string().optional(),
      sectionName: z.string().optional(),
      courseStartDate: z.string().optional(),
      courseCompletionDeadline: z.string().optional(),
      revisionDeadline: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    const record = await updateSubjectOffering(institutionId, req.params.id, parsed.data);
    return res.json({ record });
  }),
);

academicRouter.post(
  '/syllabus/bulk-revision-deadlines',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      chapterIds: z.array(z.string()).min(1),
      revisionDeadline: z.string().min(1),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    const result = await bulkSetSyllabusRevisionDeadlines(
      institutionId,
      parsed.data.chapterIds,
      parsed.data.revisionDeadline,
    );
    return res.json(result);
  }),
);

// ─── Curriculum Hub (Phases A–D) ─────────────────────────────────────────────

academicRouter.get(
  '/curriculum/framework',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const filters = await getInstitutionFilterMeta(institutionId);
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : filters.defaultAcademicYear;
    const data = await getOrCreateCurriculum(institutionId, academicYear);
    return res.json(data);
  }),
);

academicRouter.put(
  '/curriculum/framework',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      academicYear: z.string(),
      boardName: z.string().optional(),
      boardCode: z.string().optional(),
      standardAlignment: z.string().optional(),
      termSystem: z.string().optional(),
      terms: z.union([z.string(), z.array(z.string())]).optional(),
      gradingSystem: z.string().optional(),
      maxMarks: z.number().optional(),
      passMarks: z.number().optional(),
      weightageEnabled: z.boolean().optional(),
      assessmentWeightage: z.record(z.number()).optional(),
      complianceNotes: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    const termsStr = Array.isArray(parsed.data.terms) ? parsed.data.terms.join(', ') : parsed.data.terms;

    const existing = await prisma.academicCurriculum.findFirst({
      where: { institutionId, academicYear: parsed.data.academicYear },
    });

    const row = existing
      ? await prisma.academicCurriculum.update({
          where: { id: existing.id },
          data: {
            ...(parsed.data.boardName !== undefined ? { boardName: parsed.data.boardName } : {}),
            ...(parsed.data.boardCode !== undefined ? { boardCode: parsed.data.boardCode } : {}),
            ...(parsed.data.standardAlignment !== undefined ? { standardAlignment: parsed.data.standardAlignment } : {}),
            ...(parsed.data.termSystem !== undefined ? { termSystem: parsed.data.termSystem } : {}),
            ...(termsStr !== undefined ? { terms: termsStr } : {}),
            ...(parsed.data.gradingSystem !== undefined ? { gradingSystem: parsed.data.gradingSystem } : {}),
            ...(parsed.data.maxMarks !== undefined ? { maxMarks: parsed.data.maxMarks } : {}),
            ...(parsed.data.passMarks !== undefined ? { passMarks: parsed.data.passMarks } : {}),
            ...(parsed.data.weightageEnabled !== undefined ? { weightageEnabled: parsed.data.weightageEnabled } : {}),
            ...(parsed.data.assessmentWeightage !== undefined ? { assessmentWeightage: parsed.data.assessmentWeightage as object } : {}),
            ...(parsed.data.complianceNotes !== undefined ? { complianceNotes: parsed.data.complianceNotes } : {}),
          },
        })
      : await prisma.academicCurriculum.create({
          data: {
            institutionId,
            recordId: `CUR-${Date.now().toString().slice(-6)}`,
            academicYear: parsed.data.academicYear,
            boardName: parsed.data.boardName || 'CBSE',
            boardCode: parsed.data.boardCode || '',
            standardAlignment: parsed.data.standardAlignment || '',
            termSystem: parsed.data.termSystem || 'Terms',
            terms: termsStr || 'Term 1, Term 2',
            gradingSystem: parsed.data.gradingSystem || 'Percentage',
            maxMarks: parsed.data.maxMarks ?? 100,
            passMarks: parsed.data.passMarks ?? 33,
            weightageEnabled: parsed.data.weightageEnabled ?? false,
            assessmentWeightage: (parsed.data.assessmentWeightage || {}) as object,
            complianceNotes: parsed.data.complianceNotes || '',
          },
        });

    return res.json({ curriculum: serializeCurriculum(row) });
  }),
);

academicRouter.get(
  '/curriculum/analytics',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const filters = await getInstitutionFilterMeta(institutionId);
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : filters.defaultAcademicYear;
    const term = typeof req.query.term === 'string' ? req.query.term : undefined;
    const className = typeof req.query.className === 'string' ? req.query.className : undefined;
    const sectionName = typeof req.query.sectionName === 'string' ? req.query.sectionName : undefined;
    const analytics = await getCurriculumAnalytics(institutionId, { academicYear, term, className, sectionName });
    return res.json(analytics);
  }),
);

academicRouter.get(
  '/curriculum/teacher-workload',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const filters = await getInstitutionFilterMeta(institutionId);
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : filters.defaultAcademicYear;
    const teachers = await getTeacherWorkloadSummary(institutionId, academicYear);
    return res.json({ teachers });
  }),
);

academicRouter.get(
  '/electives',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
    const className = typeof req.query.className === 'string' ? req.query.className : undefined;
    const sectionName = typeof req.query.sectionName === 'string' ? req.query.sectionName : undefined;
    const rows = await prisma.studentSubjectElective.findMany({
      where: {
        institutionId,
        ...(academicYear ? { academicYear } : {}),
        ...(className ? { className } : {}),
        ...(sectionName ? { sectionName } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ records: rows });
  }),
);

academicRouter.post(
  '/electives/bulk',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      academicYear: z.string(),
      subjectId: z.string(),
      className: z.string(),
      sectionName: z.string().optional(),
      studentIds: z.array(z.string()).min(1),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    const result = await bulkAssignElectives(institutionId, {
      ...parsed.data,
      sectionName: parsed.data.sectionName || '',
    });
    return res.json(result);
  }),
);

// ─── Reports ──────────────────────────────────────────────────────────────────

academicRouter.get(
  '/reports/meta',
  asyncHandler(async (_req, res) => {
    return res.json({ reports: ACADEMIC_REPORT_CATALOG });
  }),
);

academicRouter.get(
  '/reports/all',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const filters = await getInstitutionFilterMeta(institutionId);
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : filters.defaultAcademicYear;
    const term = typeof req.query.term === 'string' ? req.query.term : 'Term 1';
    const data = await generateAllAcademicReports(institutionId, { academicYear, term });
    return res.json(data);
  }),
);

academicRouter.get(
  '/reports/summary',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const filters = await getInstitutionFilterMeta(institutionId);
    const year = typeof req.query.academicYear === 'string' ? req.query.academicYear : filters.defaultAcademicYear;
    const term = typeof req.query.term === 'string' ? req.query.term : 'Term 1';
    const overview = await generateAcademicReport(institutionId, 'overview', { academicYear: year, term });
    return res.json({
      academicYear: year,
      term,
      generatedAt: overview.generatedAt,
      kpis: overview.summary.kpis,
      insights: overview.summary.insights,
      syllabusProgress: overview.rows.filter((r) => String(r.metric).startsWith('Syllabus')),
      studentPerformanceTrend: overview.rows.filter((r) => String(r.metric).startsWith('Performance')),
    });
  }),
);

academicRouter.get(
  '/reports/:type',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const filters = await getInstitutionFilterMeta(institutionId);
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : filters.defaultAcademicYear;
    const term = typeof req.query.term === 'string' ? req.query.term : 'Term 1';
    const className = typeof req.query.className === 'string' ? req.query.className : undefined;
    const sectionName = typeof req.query.sectionName === 'string' ? req.query.sectionName : undefined;
    const format = typeof req.query.format === 'string' ? req.query.format : 'json';

    const reportType = req.params.type as AcademicReportType;
    const valid = ACADEMIC_REPORT_CATALOG.some((r) => r.id === reportType);
    if (!valid) return res.status(404).json({ error: 'Report type not found' });

    const report = await generateAcademicReport(institutionId, reportType, {
      academicYear, term, className, sectionName,
    });

    if (format === 'csv') {
      const csv = reportToCsv(report);
      const safeName = reportType.replace(/-/g, '_');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="Academic_${safeName}_${academicYear}.csv"`);
      return res.send('\uFEFF' + csv);
    }

    return res.json(report);
  }),
);
