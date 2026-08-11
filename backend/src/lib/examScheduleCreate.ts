import {
  AcademicEventType,
  ExamCalendarEventType,
  ExamMarksColumnKey,
  ExamSchedulePaperSource,
  ExamPaperPurpose,
  ExamPaperSource,
  ExamPaperStatus,
  ExamSessionMode,
  ExamTypeFilter,
  PublicationVisibility,
  Prisma,
} from '@prisma/client';
import { randomBytes } from 'crypto';
import { prisma } from './prisma.js';
import { nextAcademicRecordId } from './academicManagement.js';
import { createQuestionPaper } from './examQuestionBank.js';
import {
  createSubjectTeacherAssignment,
  MARKS_COLUMNS,
  saveMarkingDraft,
} from './examMarksEntry.js';

const EXAM_TYPE_TO_PURPOSE: Record<ExamTypeFilter, ExamPaperPurpose> = {
  UNIT_TEST: ExamPaperPurpose.UNIT_TEST,
  MID_TERM: ExamPaperPurpose.MID_TERM,
  HALF_YEARLY: ExamPaperPurpose.MID_TERM,
  PRE_FINAL: ExamPaperPurpose.ANNUAL_EXAM,
  FINAL_EXAMINATION: ExamPaperPurpose.ANNUAL_EXAM,
};

let paperSourceEnumHealPromise: Promise<void> | null = null;

/** Align DB enum name with Prisma (`ExamSchedulePaperSource`) when older installs used `ExamPaperPickSource`. */
async function ensureExamPaperSourceEnumAligned() {
  if (!paperSourceEnumHealPromise) {
    paperSourceEnumHealPromise = (async () => {
      await prisma.$executeRawUnsafe(`
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ExamPaperPickSource')
     AND NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ExamSchedulePaperSource') THEN
    ALTER TYPE "ExamPaperPickSource" RENAME TO "ExamSchedulePaperSource";
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ExamSchedulePaperSource') THEN
    CREATE TYPE "ExamSchedulePaperSource" AS ENUM ('QUESTION_BANK', 'PAPER_UPLOAD', 'NONE');
  END IF;

  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ExamPaperPickSource')
     AND EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ExamSchedulePaperSource') THEN
    IF EXISTS (
      SELECT 1
      FROM pg_attribute a
      JOIN pg_class c ON c.oid = a.attrelid
      JOIN pg_type t ON t.oid = a.atttypid
      WHERE c.relname = 'ExamCalendarSession'
        AND a.attname = 'paperSource'
        AND NOT a.attisdropped
        AND t.typname = 'ExamPaperPickSource'
    ) THEN
      ALTER TABLE "ExamCalendarSession" ALTER COLUMN "paperSource" DROP DEFAULT;
      ALTER TABLE "ExamCalendarSession"
        ALTER COLUMN "paperSource" TYPE "ExamSchedulePaperSource"
        USING ("paperSource"::text::"ExamSchedulePaperSource");
      ALTER TABLE "ExamCalendarSession"
        ALTER COLUMN "paperSource" SET DEFAULT 'NONE'::"ExamSchedulePaperSource";
    END IF;
    BEGIN
      DROP TYPE "ExamPaperPickSource";
    EXCEPTION
      WHEN dependent_objects_still_exist THEN NULL;
      WHEN undefined_object THEN NULL;
    END;
  END IF;
END $$;
`);
    })().catch((err) => {
      paperSourceEnumHealPromise = null;
      throw err;
    });
  }
  await paperSourceEnumHealPromise;
}


const EXAM_TYPE_TO_COLUMN: Record<ExamTypeFilter, ExamMarksColumnKey> = {
  UNIT_TEST: ExamMarksColumnKey.UNIT_1,
  MID_TERM: ExamMarksColumnKey.UNIT_2,
  HALF_YEARLY: ExamMarksColumnKey.HALF_YEARLY,
  PRE_FINAL: ExamMarksColumnKey.YEARLY,
  FINAL_EXAMINATION: ExamMarksColumnKey.YEARLY,
};

function makeExamLinkToken() {
  return `ex_${randomBytes(16).toString('hex')}`;
}

function examLinkUrl(token: string) {
  const base = (process.env.PUBLIC_APP_URL || process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  return `${base}/exam/${token}`;
}

function columnMax(key: ExamMarksColumnKey) {
  return MARKS_COLUMNS.find((c) => c.key === key)?.maxMarks ?? 100;
}

async function nextCalendarRecordId(institutionId: string) {
  const count = await prisma.examCalendarSession.count({ where: { institutionId } });
  return `ECS-${String(1000 + count + 1)}`;
}

export type CreateScheduledExamInput = {
  academicYear: string;
  examMode: 'DIGITAL' | 'MANUAL';
  examType: ExamTypeFilter;
  seriesName: string;
  className: string;
  sectionName: string;
  subjectName: string;
  examDate: string;
  startTime?: string;
  endTime?: string;
  scheduleId?: string;
  maxMarks?: number;
  notes?: string;
  syncToAcademicCalendar?: boolean;
  /** Digital: when the exam link goes live */
  publishAt?: string;
  paperSource?: 'QUESTION_BANK' | 'PAPER_UPLOAD' | 'NONE';
  questionPaperId?: string;
  /** Optional file meta for uploaded paper (PDF/image) */
  uploadedPaperMeta?: { fileName: string; mimeType?: string; fileData?: string; sizeBytes?: number }[];
  /** Create a new paper from uploaded questions (optional alongside upload) */
  newPaperQuestions?: {
    type: string;
    difficulty: string;
    questionText: string;
    options?: string[];
    correctAnswer?: string;
    marks?: number;
  }[];
  newPaperTitle?: string;
  teacherName?: string;
  createMarksAssignment?: boolean;
};

function serializeSession(row: {
  id: string;
  recordId: string;
  academicYear: string;
  eventType: ExamCalendarEventType;
  examType: ExamTypeFilter | null;
  seriesName: string;
  className: string;
  sectionName: string;
  subjectName: string;
  examDate: Date;
  startTime: string;
  endTime: string;
  status: string;
  examMode: ExamSessionMode;
  paperSource: ExamSchedulePaperSource;
  questionPaperId: string | null;
  marksAssignmentId: string | null;
  marksColumnKey: ExamMarksColumnKey | null;
  maxMarks: number;
  publishAt: Date | null;
  examLinkToken: string | null;
  linkPublishedAt: Date | null;
  academicCalendarEventId: string | null;
  resultsCapturedAt: Date | null;
  notes: string;
  questionPaper?: { id: string; title: string; numQuestions: number; status: ExamPaperStatus } | null;
}) {
  const token = row.examLinkToken;
  return {
    id: row.id,
    recordId: row.recordId,
    academicYear: row.academicYear,
    eventType: row.eventType,
    examType: row.examType,
    seriesName: row.seriesName,
    className: row.className,
    sectionName: row.sectionName,
    subjectName: row.subjectName,
    examDate: row.examDate.toISOString().slice(0, 10),
    startTime: row.startTime,
    endTime: row.endTime,
    status: row.status,
    examMode: row.examMode,
    paperSource: row.paperSource,
    questionPaperId: row.questionPaperId,
    questionPaperTitle: row.questionPaper?.title || null,
    questionCount: row.questionPaper?.numQuestions ?? null,
    marksAssignmentId: row.marksAssignmentId,
    marksColumnKey: row.marksColumnKey,
    maxMarks: row.maxMarks,
    publishAt: row.publishAt?.toISOString() || null,
    examLinkToken: token,
    examLink: token ? examLinkUrl(token) : null,
    linkPublishedAt: row.linkPublishedAt?.toISOString() || null,
    isLinkLive: Boolean(row.linkPublishedAt || (row.publishAt && row.publishAt.getTime() <= Date.now())),
    academicCalendarEventId: row.academicCalendarEventId,
    resultsCapturedAt: row.resultsCapturedAt?.toISOString() || null,
    notes: row.notes,
  };
}

export async function getExamScheduleCreateMeta(institutionId: string, academicYear?: string) {
  const year = academicYear || '2025-26';
  const [subjects, allocations, papers, schedules, teachers] = await Promise.all([
    prisma.academicSubject.findMany({
      where: { institutionId, isActive: true },
      orderBy: { subjectName: 'asc' },
      select: { subjectName: true },
    }),
    prisma.academicSubjectAllocation.findMany({
      where: { institutionId },
      select: { className: true, subject: { select: { subjectName: true } } },
      take: 500,
    }),
    prisma.examQuestionPaper.findMany({
      where: { institutionId, academicYear: year },
      orderBy: [{ updatedAt: 'desc' }],
      select: {
        id: true,
        title: true,
        className: true,
        sectionName: true,
        subjectName: true,
        purpose: true,
        status: true,
        numQuestions: true,
        isDigitalExam: true,
        durationMinutes: true,
        mobilePublishedAt: true,
      },
      take: 200,
    }),
    prisma.examSchedule.findMany({
      where: { institutionId, academicYear: year },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true, examType: true },
    }),
    prisma.teacherAttendanceProfile.findMany({
      where: { institutionId },
      orderBy: { teacherName: 'asc' },
      select: { teacherName: true, email: true },
      take: 100,
    }).catch(() => []),
  ]);

  return {
    academicYear: year,
    subjects: [...new Set(subjects.map((s) => s.subjectName))].sort(),
    subjectsByClass: allocations.reduce<Record<string, string[]>>((acc, s) => {
      const list = acc[s.className] || [];
      const name = s.subject.subjectName;
      if (!list.includes(name)) list.push(name);
      acc[s.className] = list;
      return acc;
    }, {}),
    papers: papers.map((p) => ({
      id: p.id,
      title: p.title,
      className: p.className,
      sectionName: p.sectionName,
      subjectName: p.subjectName,
      purpose: p.purpose,
      status: p.status,
      numQuestions: p.numQuestions,
      isDigitalExam: p.isDigitalExam,
      durationMinutes: p.durationMinutes,
      publishedToMobile: Boolean(p.mobilePublishedAt),
    })),
    examSeries: schedules,
    teachers: teachers.map((t) => ({ name: t.teacherName, email: t.email || '' })),
    marksColumns: MARKS_COLUMNS,
    examModes: [
      { id: 'DIGITAL', label: 'Digital Exam', description: 'Publish exam link at a set date/time; auto-score into Marks Entry' },
      { id: 'MANUAL', label: 'Manual Exam', description: 'Schedule pen-paper / hall exam; record results manually in Marks Entry' },
    ],
  };
}

export async function createScheduledExam(institutionId: string, input: CreateScheduledExamInput) {
  if (!input.academicYear || !input.className || !input.sectionName || !input.subjectName || !input.examDate || !input.seriesName) {
    throw new Error('academicYear, seriesName, className, sectionName, subjectName, and examDate are required');
  }

  // Heal legacy DB enum name mismatch before insert (ExamPaperPickSource vs ExamSchedulePaperSource).
  await ensureExamPaperSourceEnumAligned();

  const examMode = input.examMode === 'DIGITAL' ? ExamSessionMode.DIGITAL : ExamSessionMode.MANUAL;
  const examType = input.examType;
  const marksColumn = EXAM_TYPE_TO_COLUMN[examType] || ExamMarksColumnKey.UNIT_1;
  const maxMarks = input.maxMarks || columnMax(marksColumn);
  let paperSource: ExamSchedulePaperSource = ExamSchedulePaperSource.NONE;
  let questionPaperId: string | null = input.questionPaperId || null;
  const uploadedMeta = input.uploadedPaperMeta || [];

  if (input.paperSource === 'QUESTION_BANK' || questionPaperId) {
    paperSource = ExamSchedulePaperSource.QUESTION_BANK;
  }
  if (input.paperSource === 'PAPER_UPLOAD' || uploadedMeta.length > 0) {
    paperSource = ExamSchedulePaperSource.PAPER_UPLOAD;
  }

  // Create paper from uploaded questions if provided
  if (!questionPaperId && (input.newPaperQuestions?.length || uploadedMeta.length)) {
    if (examMode === ExamSessionMode.DIGITAL && !(input.newPaperQuestions?.length)) {
      throw new Error('Digital exams require questions — select a paper from the Question Bank or provide questions with the upload');
    }
    const paper = await createQuestionPaper(institutionId, {
      academicYear: input.academicYear,
      className: input.className,
      sectionName: input.sectionName,
      subjectName: input.subjectName,
      title: input.newPaperTitle?.trim() || `${input.seriesName} — ${input.subjectName}`,
      purpose: EXAM_TYPE_TO_PURPOSE[examType],
      source: uploadedMeta.length ? ExamPaperSource.OCR : ExamPaperSource.MANUAL,
      status: ExamPaperStatus.PUBLISHED,
      isDigitalExam: examMode === ExamSessionMode.DIGITAL,
      sourceFilesMeta: uploadedMeta.map((f) => ({
        fileName: f.fileName,
        mimeType: f.mimeType || 'application/pdf',
        sizeBytes: f.sizeBytes || (f.fileData ? Math.round(f.fileData.length * 0.75) : 0),
      })),
      questions: input.newPaperQuestions || [],
      createdBy: 'Exam Schedule',
    });
    questionPaperId = paper.id;
    if (uploadedMeta.length) paperSource = ExamSchedulePaperSource.PAPER_UPLOAD;
  }

  if (examMode === ExamSessionMode.DIGITAL) {
    if (!questionPaperId) {
      throw new Error('Digital exams require a question paper from Question Bank / Paper Management or an uploaded paper with questions');
    }
    const paper = await prisma.examQuestionPaper.findFirst({
      where: { institutionId, id: questionPaperId },
      include: { _count: { select: { questions: true } } },
    });
    if (!paper) throw new Error('Selected question paper not found');
    if (paper._count.questions < 1) throw new Error('Selected paper has no questions');
    await prisma.examQuestionPaper.update({
      where: { id: paper.id },
      data: {
        isDigitalExam: true,
        status: ExamPaperStatus.PUBLISHED,
        scheduledPublishAt: input.publishAt ? new Date(input.publishAt) : null,
      },
    });
  }

  let marksAssignmentId: string | null = null;
  const shouldCreateMarks = input.createMarksAssignment !== false;
  if (shouldCreateMarks) {
    const teacherName = (input.teacherName || 'Subject Teacher').trim();
    try {
      const assignment = await createSubjectTeacherAssignment(institutionId, {
        academicYear: input.academicYear,
        className: input.className,
        sectionName: input.sectionName,
        subjectName: input.subjectName,
        teacherName,
        assignedColumns: [marksColumn],
        examinationName: input.seriesName,
        createdBy: 'Exam Schedule',
      });
      marksAssignmentId = assignment.assignment.id;
    } catch (err) {
      // Reuse existing assignment for same class/section/subject/teacher
      const existing = await prisma.examSubjectTeacherAssignment.findFirst({
        where: {
          institutionId,
          academicYear: input.academicYear,
          className: input.className,
          sectionName: input.sectionName,
          subjectName: input.subjectName,
        },
        include: { markingSheets: { select: { id: true } } },
      });
      if (!existing) throw err;
      marksAssignmentId = existing.id;
      if (!existing.assignedColumns.includes(marksColumn)) {
        await prisma.examSubjectTeacherAssignment.update({
          where: { id: existing.id },
          data: { assignedColumns: [...existing.assignedColumns, marksColumn] },
        });
      }
    }
  }

  const publishAt = input.publishAt ? new Date(input.publishAt) : null;
  const token = examMode === ExamSessionMode.DIGITAL ? makeExamLinkToken() : null;
  const publishNow = Boolean(token && publishAt && publishAt.getTime() <= Date.now());

  const recordId = await nextCalendarRecordId(institutionId);
  const session = await prisma.examCalendarSession.create({
    data: {
      institutionId,
      recordId,
      academicYear: input.academicYear,
      eventType: ExamCalendarEventType.EXAM,
      examType,
      scheduleId: input.scheduleId || null,
      seriesName: input.seriesName.trim(),
      className: input.className.trim(),
      sectionName: input.sectionName.trim(),
      subjectName: input.subjectName.trim(),
      examDate: new Date(input.examDate),
      startTime: input.startTime || '09:00 AM',
      endTime: input.endTime || '12:00 PM',
      status: 'Scheduled',
      examMode,
      paperSource,
      questionPaperId,
      marksAssignmentId,
      marksColumnKey: marksColumn,
      maxMarks,
      publishAt,
      examLinkToken: token,
      linkPublishedAt: publishNow ? new Date() : null,
      uploadedPaperMeta: uploadedMeta.map((f) => ({
        fileName: f.fileName,
        mimeType: f.mimeType || 'application/pdf',
        sizeBytes: f.sizeBytes || 0,
      })) as Prisma.InputJsonValue,
      notes: input.notes || '',
    },
    include: {
      questionPaper: { select: { id: true, title: true, numQuestions: true, status: true } },
    },
  });

  if (publishNow && questionPaperId) {
    await prisma.examQuestionPaper.update({
      where: { id: questionPaperId },
      data: {
        mobilePublishedAt: new Date(),
        mobilePublishedBy: 'Exam Schedule',
        mobileVisibleOn: PublicationVisibility.BOTH,
      },
    });
  }

  let academicCalendarEventId: string | null = null;
  if (input.syncToAcademicCalendar !== false) {
    academicCalendarEventId = await syncSessionToAcademicCalendar(institutionId, session.id);
  }

  const refreshed = await prisma.examCalendarSession.findUniqueOrThrow({
    where: { id: session.id },
    include: { questionPaper: { select: { id: true, title: true, numQuestions: true, status: true } } },
  });

  return {
    session: serializeSession({ ...refreshed, academicCalendarEventId: academicCalendarEventId || refreshed.academicCalendarEventId }),
    message:
      examMode === ExamSessionMode.DIGITAL
        ? `Digital exam scheduled. Link will go live at ${publishAt ? publishAt.toISOString() : 'the defined publish time'}.`
        : 'Manual exam scheduled. Record results in Marks Entry when conducted.',
  };
}

export async function syncSessionToAcademicCalendar(institutionId: string, sessionId: string) {
  const session = await prisma.examCalendarSession.findFirst({ where: { institutionId, id: sessionId } });
  if (!session) throw new Error('Exam session not found');

  const title = `${session.seriesName}: ${session.subjectName} (${session.className}-${session.sectionName})`;
  const description = [
    `${session.examMode === ExamSessionMode.DIGITAL ? 'Digital' : 'Manual'} exam`,
    session.startTime && session.endTime ? `${session.startTime} – ${session.endTime}` : '',
    session.examLinkToken ? `Exam link token: ${session.examLinkToken}` : '',
  ].filter(Boolean).join(' · ');

  if (session.academicCalendarEventId) {
    await prisma.academicCalendarEvent.update({
      where: { id: session.academicCalendarEventId },
      data: {
        title,
        eventType: AcademicEventType.EXAM,
        eventDate: session.examDate,
        description,
      },
    });
    return session.academicCalendarEventId;
  }

  const recordId = await nextAcademicRecordId(institutionId, 'calendar');
  const event = await prisma.academicCalendarEvent.create({
    data: {
      institutionId,
      recordId,
      academicYear: session.academicYear,
      title,
      eventType: AcademicEventType.EXAM,
      eventDate: session.examDate,
      description,
      eventSource: 'MANUAL',
      sharedToParents: true,
    },
  });

  await prisma.examCalendarSession.update({
    where: { id: session.id },
    data: { academicCalendarEventId: event.id },
  });

  return event.id;
}

export async function syncExamScheduleToAcademicCalendar(
  institutionId: string,
  opts: { academicYear: string; month?: number; year?: number },
) {
  const where: Prisma.ExamCalendarSessionWhereInput = {
    institutionId,
    academicYear: opts.academicYear,
    eventType: ExamCalendarEventType.EXAM,
    academicCalendarEventId: null,
  };

  if (opts.year && opts.month) {
    const start = new Date(Date.UTC(opts.year, opts.month - 1, 1));
    const end = new Date(Date.UTC(opts.year, opts.month, 0));
    where.examDate = { gte: start, lte: end };
  }

  const sessions = await prisma.examCalendarSession.findMany({ where, orderBy: { examDate: 'asc' } });
  let synced = 0;
  for (const s of sessions) {
    await syncSessionToAcademicCalendar(institutionId, s.id);
    synced += 1;
  }

  return {
    synced,
    message: synced
      ? `Synced ${synced} exam session(s) to Academic Calendar`
      : 'All exam sessions are already synced with Academic Calendar',
  };
}

export async function publishDueDigitalExams(institutionId: string) {
  const now = new Date();
  const due = await prisma.examCalendarSession.findMany({
    where: {
      institutionId,
      examMode: ExamSessionMode.DIGITAL,
      publishAt: { lte: now },
      linkPublishedAt: null,
      examLinkToken: { not: null },
    },
  });

  let published = 0;
  for (const s of due) {
    await prisma.examCalendarSession.update({
      where: { id: s.id },
      data: { linkPublishedAt: now, status: 'In Progress' },
    });
    if (s.questionPaperId) {
      await prisma.examQuestionPaper.update({
        where: { id: s.questionPaperId },
        data: {
          mobilePublishedAt: now,
          mobilePublishedBy: 'Exam Schedule Scheduler',
          mobileVisibleOn: PublicationVisibility.BOTH,
          status: ExamPaperStatus.PUBLISHED,
        },
      });
    }
    published += 1;
  }

  return { published };
}

export async function getExamByLinkToken(token: string) {
  const session = await prisma.examCalendarSession.findFirst({
    where: { examLinkToken: token, examMode: ExamSessionMode.DIGITAL },
    include: {
      questionPaper: {
        include: { questions: { orderBy: { sortOrder: 'asc' } } },
      },
    },
  });
  if (!session) throw new Error('Exam link not found');

  const now = Date.now();
  const publishAt = session.publishAt?.getTime() ?? 0;
  const live = Boolean(session.linkPublishedAt) || (publishAt > 0 && publishAt <= now);

  if (!live) {
    return {
      live: false,
      publishAt: session.publishAt?.toISOString() || null,
      seriesName: session.seriesName,
      subjectName: session.subjectName,
      className: session.className,
      sectionName: session.sectionName,
      examDate: session.examDate.toISOString().slice(0, 10),
      message: 'This exam is scheduled but not yet published. Please check back at the publish time.',
    };
  }

  // Auto-mark published if due
  if (!session.linkPublishedAt && live) {
    await prisma.examCalendarSession.update({
      where: { id: session.id },
      data: { linkPublishedAt: new Date(), status: 'In Progress' },
    });
  }

  const paper = session.questionPaper;
  if (!paper) throw new Error('Exam paper missing');

  return {
    live: true,
    sessionId: session.id,
    paperId: paper.id,
    seriesName: session.seriesName,
    subjectName: session.subjectName,
    className: session.className,
    sectionName: session.sectionName,
    examDate: session.examDate.toISOString().slice(0, 10),
    startTime: session.startTime,
    endTime: session.endTime,
    durationMinutes: paper.durationMinutes,
    passMarksPercent: paper.passMarksPercent,
    title: paper.title,
    questionCount: paper.questions.length,
  };
}

export async function captureDigitalResultsToMarks(institutionId: string, sessionId: string) {
  const session = await prisma.examCalendarSession.findFirst({
    where: { institutionId, id: sessionId },
  });
  if (!session) throw new Error('Exam session not found');
  if (!session.questionPaperId) throw new Error('Session has no linked question paper');
  if (!session.marksAssignmentId || !session.marksColumnKey) {
    throw new Error('Session has no marks assignment — create Marks Entry assignment first');
  }

  const sheet = await prisma.examMarkingSheet.findUnique({
    where: { assignmentId: session.marksAssignmentId },
  });
  if (!sheet) throw new Error('Marking sheet not found for this assignment');

  const attempts = await prisma.examDigitalExamAttempt.findMany({
    where: {
      institutionId,
      paperId: session.questionPaperId,
      submittedAt: { not: null },
      studentId: { not: null },
      percentScore: { not: null },
    },
    orderBy: { submittedAt: 'desc' },
  });

  // Keep latest attempt per student
  const byStudent = new Map<string, (typeof attempts)[0]>();
  for (const a of attempts) {
    if (!a.studentId) continue;
    if (!byStudent.has(a.studentId)) byStudent.set(a.studentId, a);
  }

  const colMax = columnMax(session.marksColumnKey);
  const entries = [...byStudent.values()].map((a) => ({
    studentId: a.studentId!,
    columnKey: session.marksColumnKey!,
    marksObtained: Math.round(((a.percentScore || 0) / 100) * colMax * 100) / 100,
    remarks: `Auto-captured from digital exam (${a.percentScore}%)`,
    examinerObservations: 'Digital exam auto-score',
  }));

  const result = entries.length
    ? await saveMarkingDraft(institutionId, sheet.id, entries)
    : { updated: 0, message: 'No submitted digital attempts with student IDs to capture' };

  await prisma.examCalendarSession.update({
    where: { id: session.id },
    data: { resultsCapturedAt: new Date(), status: 'Conducted' },
  });

  return {
    captured: result.updated,
    attemptCount: byStudent.size,
    sheetId: sheet.id,
    message: `Captured ${result.updated} student mark(s) into Marks Entry (${session.marksColumnKey}). Continue in Result Processing after approval.`,
  };
}

/** Called after a digital attempt is submitted — best-effort auto-capture for linked sessions. */
export async function autoCaptureAttemptToMarks(institutionId: string, paperId: string, attemptId: string) {
  const attempt = await prisma.examDigitalExamAttempt.findFirst({
    where: { institutionId, id: attemptId, paperId },
  });
  if (!attempt?.studentId || attempt.percentScore == null) return { captured: false };

  const sessions = await prisma.examCalendarSession.findMany({
    where: {
      institutionId,
      questionPaperId: paperId,
      examMode: ExamSessionMode.DIGITAL,
      marksAssignmentId: { not: null },
      marksColumnKey: { not: null },
    },
  });

  for (const session of sessions) {
    if (!session.marksAssignmentId || !session.marksColumnKey) continue;
    const sheet = await prisma.examMarkingSheet.findUnique({
      where: { assignmentId: session.marksAssignmentId },
    });
    if (!sheet) continue;
    const colMax = columnMax(session.marksColumnKey);
    await saveMarkingDraft(institutionId, sheet.id, [{
      studentId: attempt.studentId,
      columnKey: session.marksColumnKey,
      marksObtained: Math.round((attempt.percentScore / 100) * colMax * 100) / 100,
      remarks: `Auto-captured from digital exam (${attempt.percentScore}%)`,
      examinerObservations: 'Digital exam auto-score',
    }]);
  }

  return { captured: true };
}

export async function listScheduledExamSessions(
  institutionId: string,
  opts: { academicYear?: string; className?: string; sectionName?: string },
) {
  const academicYear = opts.academicYear || '2025-26';
  const rows = await prisma.examCalendarSession.findMany({
    where: {
      institutionId,
      academicYear,
      ...(opts.className ? { className: opts.className } : {}),
      ...(opts.sectionName ? { sectionName: opts.sectionName } : {}),
    },
    orderBy: [{ examDate: 'asc' }, { startTime: 'asc' }],
    include: {
      questionPaper: { select: { id: true, title: true, numQuestions: true, status: true } },
    },
    take: 300,
  });
  return { academicYear, sessions: rows.map(serializeSession) };
}
