import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import {
  ExamMarksColumnKey,
  ExamPaperPurpose,
  ExamPaperStatus,
  Prisma,
  PublicationVisibility,
  StudentStatus,
} from '@prisma/client';
import { prisma } from './prisma.js';
import { getInstitutionFilterMeta } from './students.js';
import { getQuestionPaper, startDigitalExamAttempt, submitDigitalExamAttempt } from './examQuestionBank.js';
import { createSubjectTeacherAssignment, saveMarkingDraft, MARKS_COLUMNS } from './examMarksEntry.js';

const PURPOSE_LABELS: Record<ExamPaperPurpose, string> = {
  CLASS_TEST: 'Class Test',
  UNIT_TEST: 'Unit Test',
  MID_TERM: 'Mid Term',
  ANNUAL_EXAM: 'Annual Exam',
  ENTRANCE_TEST: 'Institute Entrance Test',
  PRACTICE: 'Practice Paper',
};

const PURPOSE_TO_COLUMN: Partial<Record<ExamPaperPurpose, ExamMarksColumnKey>> = {
  CLASS_TEST: ExamMarksColumnKey.UNIT_1,
  UNIT_TEST: ExamMarksColumnKey.UNIT_1,
  MID_TERM: ExamMarksColumnKey.UNIT_2,
  ANNUAL_EXAM: ExamMarksColumnKey.YEARLY,
  ENTRANCE_TEST: ExamMarksColumnKey.YEARLY,
  PRACTICE: ExamMarksColumnKey.UNIT_3,
};

const VIS_DB_TO_UI: Record<PublicationVisibility, string> = {
  WEB: 'Website',
  APP: 'Mobile App',
  BOTH: 'Student & Parent App',
};

function parsePurpose(raw?: string): ExamPaperPurpose | undefined {
  if (!raw || raw === 'all') return undefined;
  if (Object.values(ExamPaperPurpose).includes(raw as ExamPaperPurpose)) {
    return raw as ExamPaperPurpose;
  }
  return undefined;
}

function parseMobileFilter(raw?: string): 'all' | 'published' | 'pending' {
  if (raw === 'published' || raw === 'pending') return raw;
  return 'all';
}

function paperLinkUrl(token: string) {
  const base = (process.env.PUBLIC_APP_URL || process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  return `${base}/paper-exam/${token}`;
}

function makeLinkToken() {
  return `pp_${randomBytes(16).toString('hex')}`;
}

function makePassword(length = 6) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  const bytes = randomBytes(length);
  for (let i = 0; i < length; i++) out += alphabet[bytes[i]! % alphabet.length];
  return out;
}

function serializeManagementPaper(paper: {
  id: string;
  recordId: string;
  academicYear: string;
  className: string;
  sectionName: string;
  subjectName: string;
  title: string;
  purpose: ExamPaperPurpose;
  source: string;
  status: ExamPaperStatus;
  durationMinutes: number;
  numQuestions: number;
  questionType: string;
  difficulty: string;
  passMarksPercent: number;
  isDigitalExam: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  mobilePublishedAt: Date | null;
  mobilePublishedBy: string;
  mobileVisibleOn: PublicationVisibility | null;
  linkToken?: string | null;
  linkPublishedAt?: Date | null;
  linkPublishedBy?: string;
  _count: { questions: number; attempts: number; studentAccess?: number };
}) {
  const isMobilePublished = Boolean(paper.mobilePublishedAt);
  const isLinkPublished = Boolean(paper.linkPublishedAt && paper.linkToken);
  return {
    id: paper.id,
    recordId: paper.recordId,
    academicYear: paper.academicYear,
    className: paper.className,
    sectionName: paper.sectionName,
    classGroup: paper.sectionName ? `${paper.className} — ${paper.sectionName}` : paper.className,
    subjectName: paper.subjectName,
    title: paper.title,
    purpose: paper.purpose,
    purposeLabel: PURPOSE_LABELS[paper.purpose],
    source: paper.source,
    status: paper.status,
    statusLabel: paper.status === ExamPaperStatus.PUBLISHED ? 'Published' : 'Draft',
    durationMinutes: paper.durationMinutes,
    questionCount: paper._count.questions,
    attemptCount: paper._count.attempts,
    questionType: paper.questionType,
    difficulty: paper.difficulty,
    passMarksPercent: paper.passMarksPercent,
    isDigitalExam: paper.isDigitalExam,
    createdBy: paper.createdBy,
    createdAt: paper.createdAt.toISOString(),
    updatedAt: paper.updatedAt.toISOString(),
    isMobilePublished,
    mobilePublishedAt: paper.mobilePublishedAt?.toISOString() ?? null,
    mobilePublishedBy: paper.mobilePublishedBy,
    mobileVisibleOn: paper.mobileVisibleOn ? VIS_DB_TO_UI[paper.mobileVisibleOn] : null,
    mobileVisibleOnKey: paper.mobileVisibleOn,
    canPublishToMobile: paper._count.questions > 0,
    isLinkPublished,
    linkPublishedAt: paper.linkPublishedAt?.toISOString() ?? null,
    linkPublishedBy: paper.linkPublishedBy || '',
    examLink: isLinkPublished && paper.linkToken ? paperLinkUrl(paper.linkToken) : null,
    credentialCount: paper._count.studentAccess ?? 0,
    canPublish: paper._count.questions > 0,
  };
}

export async function getPaperManagementMeta(institutionId: string) {
  const filters = await getInstitutionFilterMeta(institutionId);
  const subjects = await prisma.academicSubject.findMany({
    where: { institutionId, isActive: true },
    select: { subjectName: true },
    orderBy: [{ subjectName: 'asc' }],
  });
  return {
    defaultAcademicYear: filters.defaultAcademicYear,
    academicYears: filters.academicYears,
    classes: filters.classes,
    sectionsByClass: filters.sectionsByClass,
    subjects: [...new Set(subjects.map((s) => s.subjectName))].sort(),
    purposes: Object.entries(PURPOSE_LABELS).map(([id, label]) => ({ id, label })),
    visibilityOptions: [
      { id: 'APP', label: 'Student Mobile App' },
      { id: 'BOTH', label: 'Student & Parent Mobile App' },
    ],
    publishChannels: [
      { id: 'PDF', label: 'PDF (Print for Manual Exam)', description: 'Download printable question paper PDF' },
      { id: 'LINK', label: 'Link (User ID & Password)', description: 'Unique credentials per student for on-screen digital test' },
      { id: 'MOBILE', label: 'Student Mobile App', description: 'No extra login — appears in app Tests section' },
    ],
  };
}

export async function listPapersForManagement(
  institutionId: string,
  opts: {
    academicYear?: string;
    className?: string;
    sectionName?: string;
    subjectName?: string;
    purpose?: string;
    mobileStatus?: string;
  },
) {
  const academicYear = opts.academicYear || '2025-26';
  const purpose = parsePurpose(opts.purpose);
  const mobileFilter = parseMobileFilter(opts.mobileStatus);

  const where: Prisma.ExamQuestionPaperWhereInput = {
    institutionId,
    academicYear,
    ...(opts.className ? { className: opts.className } : {}),
    ...(opts.sectionName ? { sectionName: opts.sectionName } : {}),
    ...(opts.subjectName ? { subjectName: opts.subjectName } : {}),
    ...(purpose ? { purpose } : {}),
    ...(mobileFilter === 'published' ? { mobilePublishedAt: { not: null } } : {}),
    ...(mobileFilter === 'pending' ? { mobilePublishedAt: null } : {}),
  };

  const papers = await prisma.examQuestionPaper.findMany({
    where,
    orderBy: [{ className: 'asc' }, { sectionName: 'asc' }, { updatedAt: 'desc' }],
    include: { _count: { select: { questions: true, attempts: true, studentAccess: true } } },
  });

  const serialized = papers.map(serializeManagementPaper);
  const mobilePublished = serialized.filter((p) => p.isMobilePublished).length;
  const linkPublished = serialized.filter((p) => p.isLinkPublished).length;

  return {
    academicYear,
    summary: {
      totalPapers: serialized.length,
      mobilePublished,
      mobilePending: serialized.length - mobilePublished,
      linkPublished,
      digitalExams: serialized.filter((p) => p.isDigitalExam).length,
      totalQuestions: serialized.reduce((sum, p) => sum + p.questionCount, 0),
    },
    papers: serialized,
  };
}

export async function getPaperPrintPayload(institutionId: string, paperId: string) {
  const paper = await getQuestionPaper(institutionId, paperId);
  return {
    paper: {
      id: paper.id,
      title: paper.title,
      className: paper.className,
      sectionName: paper.sectionName,
      classGroup: paper.classGroup,
      subjectName: paper.subjectName,
      purposeLabel: paper.purposeLabel,
      durationMinutes: paper.durationMinutes,
      passMarksPercent: paper.passMarksPercent,
      academicYear: paper.academicYear,
      questionType: paper.questionType,
      difficulty: paper.difficulty,
      questions: (paper.questions || []).map((q: {
        sortOrder: number;
        questionText: string;
        options?: string[];
        type?: string;
        marks?: number;
      }, i: number) => ({
        number: q.sortOrder + 1 || i + 1,
        questionText: q.questionText,
        options: q.options || [],
        type: q.type,
        marks: q.marks ?? 1,
      })),
    },
  };
}

export async function publishPaperToMobile(
  institutionId: string,
  paperId: string,
  opts: { visibleOn?: PublicationVisibility; publishedBy?: string },
) {
  const paper = await prisma.examQuestionPaper.findFirst({
    where: { institutionId, id: paperId },
    include: { _count: { select: { questions: true, attempts: true, studentAccess: true } } },
  });
  if (!paper) throw new Error('Question paper not found');
  if (paper._count.questions === 0) throw new Error('Cannot publish a paper with no questions');

  const visibleOn = opts.visibleOn || PublicationVisibility.APP;
  const now = new Date();

  const updated = await prisma.examQuestionPaper.update({
    where: { id: paper.id },
    data: {
      status: ExamPaperStatus.PUBLISHED,
      isDigitalExam: true,
      mobilePublishedAt: now,
      mobilePublishedBy: opts.publishedBy || 'Admin',
      mobileVisibleOn: visibleOn,
    },
    include: { _count: { select: { questions: true, attempts: true, studentAccess: true } } },
  });

  const studentCount = await prisma.student.count({
    where: {
      institutionId,
      academicYear: updated.academicYear,
      className: updated.className,
      ...(updated.sectionName ? { sectionName: updated.sectionName } : {}),
      status: StudentStatus.ACTIVE,
    },
  });

  return {
    paper: serializeManagementPaper(updated),
    channel: 'MOBILE' as const,
    message: `Published "${updated.title}" to Student Mobile App (Tests section) for ${updated.className}${updated.sectionName ? ` — ${updated.sectionName}` : ''}. No extra exam login required.`,
    publishedAt: now.toISOString(),
    targetAudience: VIS_DB_TO_UI[visibleOn],
    studentCount,
  };
}

export async function unpublishPaperFromMobile(institutionId: string, paperId: string) {
  const paper = await prisma.examQuestionPaper.findFirst({
    where: { institutionId, id: paperId },
    include: { _count: { select: { questions: true, attempts: true, studentAccess: true } } },
  });
  if (!paper) throw new Error('Question paper not found');

  const updated = await prisma.examQuestionPaper.update({
    where: { id: paper.id },
    data: {
      mobilePublishedAt: null,
      mobilePublishedBy: '',
      mobileVisibleOn: null,
    },
    include: { _count: { select: { questions: true, attempts: true, studentAccess: true } } },
  });

  return {
    paper: serializeManagementPaper(updated),
    message: `Removed "${updated.title}" from mobile apps`,
  };
}

export async function publishPaperAsLink(
  institutionId: string,
  paperId: string,
  opts: { publishedBy?: string } = {},
) {
  const paper = await prisma.examQuestionPaper.findFirst({
    where: { institutionId, id: paperId },
    include: { _count: { select: { questions: true } } },
  });
  if (!paper) throw new Error('Question paper not found');
  if (paper._count.questions === 0) throw new Error('Cannot publish a paper with no questions');

  const students = await prisma.student.findMany({
    where: {
      institutionId,
      academicYear: paper.academicYear,
      className: paper.className,
      ...(paper.sectionName ? { sectionName: paper.sectionName } : {}),
      status: StudentStatus.ACTIVE,
    },
    orderBy: [{ admissionNumber: 'asc' }],
  });
  if (!students.length) {
    throw new Error(`No active students found for ${paper.className}${paper.sectionName ? ` — ${paper.sectionName}` : ''}`);
  }

  const linkToken = paper.linkToken || makeLinkToken();
  const now = new Date();
  const credentials: { studentId: string; studentName: string; userId: string; password: string }[] = [];

  for (const student of students) {
    const userId = (student.admissionNumber || student.rollNumber || student.id).trim();
    const password = makePassword(6);
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.examPaperStudentAccess.upsert({
      where: { paperId_studentId: { paperId: paper.id, studentId: student.id } },
      create: {
        institutionId,
        paperId: paper.id,
        studentId: student.id,
        userId,
        passwordPlain: password,
        passwordHash,
      },
      update: {
        userId,
        passwordPlain: password,
        passwordHash,
      },
    });
    credentials.push({
      studentId: student.id,
      studentName: [student.firstName, student.lastName].filter(Boolean).join(' '),
      userId,
      password,
    });
  }

  const updated = await prisma.examQuestionPaper.update({
    where: { id: paper.id },
    data: {
      status: ExamPaperStatus.PUBLISHED,
      isDigitalExam: true,
      linkToken,
      linkPublishedAt: now,
      linkPublishedBy: opts.publishedBy || 'Admin',
    },
    include: { _count: { select: { questions: true, attempts: true, studentAccess: true } } },
  });

  // Ensure marks assignment exists for result sync
  await ensureMarksAssignmentForPaper(institutionId, updated);

  return {
    paper: serializeManagementPaper(updated),
    channel: 'LINK' as const,
    examLink: paperLinkUrl(linkToken),
    credentials,
    studentCount: credentials.length,
    message: `Link published for ${credentials.length} student(s). Share the exam link and User ID / Password sheet.`,
  };
}

export async function listPaperLinkCredentials(institutionId: string, paperId: string) {
  const paper = await prisma.examQuestionPaper.findFirst({
    where: { institutionId, id: paperId },
  });
  if (!paper) throw new Error('Question paper not found');
  if (!paper.linkToken || !paper.linkPublishedAt) {
    throw new Error('Paper link is not published yet');
  }

  const rows = await prisma.examPaperStudentAccess.findMany({
    where: { institutionId, paperId },
    include: { student: { select: { firstName: true, lastName: true, rollNumber: true, admissionNumber: true } } },
    orderBy: [{ userId: 'asc' }],
  });

  return {
    paperId: paper.id,
    title: paper.title,
    classGroup: paper.sectionName ? `${paper.className} — ${paper.sectionName}` : paper.className,
    examLink: paperLinkUrl(paper.linkToken),
    credentials: rows.map((r) => ({
      studentId: r.studentId,
      studentName: [r.student.firstName, r.student.lastName].filter(Boolean).join(' '),
      admissionNumber: r.student.admissionNumber,
      rollNumber: r.student.rollNumber,
      userId: r.userId,
      password: r.passwordPlain,
      lastLoginAt: r.lastLoginAt?.toISOString() || null,
    })),
  };
}

export async function unpublishPaperLink(institutionId: string, paperId: string) {
  const paper = await prisma.examQuestionPaper.findFirst({
    where: { institutionId, id: paperId },
    include: { _count: { select: { questions: true, attempts: true, studentAccess: true } } },
  });
  if (!paper) throw new Error('Question paper not found');

  await prisma.examPaperStudentAccess.deleteMany({ where: { paperId: paper.id } });
  const updated = await prisma.examQuestionPaper.update({
    where: { id: paper.id },
    data: { linkToken: null, linkPublishedAt: null, linkPublishedBy: '' },
    include: { _count: { select: { questions: true, attempts: true, studentAccess: true } } },
  });

  return { paper: serializeManagementPaper(updated), message: `Exam link unpublished for "${updated.title}"` };
}

export async function getPaperExamByToken(token: string) {
  const paper = await prisma.examQuestionPaper.findFirst({
    where: { linkToken: token, linkPublishedAt: { not: null } },
    select: {
      id: true,
      title: true,
      className: true,
      sectionName: true,
      subjectName: true,
      durationMinutes: true,
      passMarksPercent: true,
      numQuestions: true,
      academicYear: true,
      purpose: true,
    },
  });
  if (!paper) throw new Error('Exam link not found or not published');
  return {
    live: true,
    paperId: paper.id,
    title: paper.title,
    className: paper.className,
    sectionName: paper.sectionName,
    subjectName: paper.subjectName,
    durationMinutes: paper.durationMinutes,
    passMarksPercent: paper.passMarksPercent,
    questionCount: paper.numQuestions,
    purposeLabel: PURPOSE_LABELS[paper.purpose],
    message: 'Enter your User ID and Password to start the digital exam.',
  };
}

export async function loginPaperExamLink(
  token: string,
  creds: { userId: string; password: string },
) {
  const paper = await prisma.examQuestionPaper.findFirst({
    where: { linkToken: token, linkPublishedAt: { not: null } },
  });
  if (!paper) throw new Error('Exam link not found or not published');

  const access = await prisma.examPaperStudentAccess.findFirst({
    where: { paperId: paper.id, userId: creds.userId.trim() },
    include: { student: true },
  });
  if (!access) throw new Error('Invalid User ID or Password');
  const ok = await bcrypt.compare(creds.password, access.passwordHash);
  if (!ok) throw new Error('Invalid User ID or Password');

  await prisma.examPaperStudentAccess.update({
    where: { id: access.id },
    data: { lastLoginAt: new Date() },
  });

  const studentName = [access.student.firstName, access.student.lastName].filter(Boolean).join(' ');
  const started = await startDigitalExamAttempt(paper.institutionId, paper.id, {
    candidateName: studentName || access.userId,
    candidateRef: access.userId,
    studentId: access.studentId,
  });

  await prisma.examPaperStudentAccess.update({
    where: { id: access.id },
    data: { attemptId: started.attemptId },
  });

  return {
    ...started,
    studentId: access.studentId,
    userId: access.userId,
    studentName,
  };
}

export async function submitPaperExamLink(
  token: string,
  body: { attemptId: string; answers: Record<string, string> },
) {
  const paper = await prisma.examQuestionPaper.findFirst({
    where: { linkToken: token, linkPublishedAt: { not: null } },
  });
  if (!paper) throw new Error('Exam link not found');

  const result = await submitDigitalExamAttempt(paper.institutionId, body.attemptId, body.answers || {});

  // Extra: sync into Marks Entry for this paper's class/subject
  try {
    await capturePaperAttemptToMarks(paper.institutionId, paper.id, body.attemptId);
  } catch {
    // best-effort
  }

  return result;
}

async function ensureMarksAssignmentForPaper(
  institutionId: string,
  paper: { academicYear: string; className: string; sectionName: string; subjectName: string; purpose: ExamPaperPurpose; title: string },
) {
  const column = PURPOSE_TO_COLUMN[paper.purpose] || ExamMarksColumnKey.UNIT_1;
  const existing = await prisma.examSubjectTeacherAssignment.findFirst({
    where: {
      institutionId,
      academicYear: paper.academicYear,
      className: paper.className,
      sectionName: paper.sectionName || '',
      subjectName: paper.subjectName,
    },
  });
  if (existing) {
    if (!existing.assignedColumns.includes(column)) {
      await prisma.examSubjectTeacherAssignment.update({
        where: { id: existing.id },
        data: { assignedColumns: [...existing.assignedColumns, column] },
      });
    }
    return existing.id;
  }
  try {
    const created = await createSubjectTeacherAssignment(institutionId, {
      academicYear: paper.academicYear,
      className: paper.className,
      sectionName: paper.sectionName || '',
      subjectName: paper.subjectName,
      teacherName: 'Subject Teacher',
      assignedColumns: [column],
      examinationName: paper.title,
      createdBy: 'Paper Management',
    });
    return created.assignment.id;
  } catch {
    return null;
  }
}

export async function capturePaperAttemptToMarks(institutionId: string, paperId: string, attemptId: string) {
  const attempt = await prisma.examDigitalExamAttempt.findFirst({
    where: { institutionId, id: attemptId, paperId },
  });
  if (!attempt?.studentId || attempt.percentScore == null) return { captured: false };

  const paper = await prisma.examQuestionPaper.findFirst({ where: { institutionId, id: paperId } });
  if (!paper) return { captured: false };

  const assignmentId = await ensureMarksAssignmentForPaper(institutionId, paper);
  if (!assignmentId) return { captured: false };

  const sheet = await prisma.examMarkingSheet.findUnique({ where: { assignmentId } });
  if (!sheet) return { captured: false };

  const column = PURPOSE_TO_COLUMN[paper.purpose] || ExamMarksColumnKey.UNIT_1;
  const colMax = MARKS_COLUMNS.find((c) => c.key === column)?.maxMarks ?? 100;
  await saveMarkingDraft(institutionId, sheet.id, [{
    studentId: attempt.studentId,
    columnKey: column,
    marksObtained: Math.round((attempt.percentScore / 100) * colMax * 100) / 100,
    remarks: `Digital exam auto-score (${attempt.percentScore}%)`,
    examinerObservations: 'Paper Management digital result sync',
  }]);

  return { captured: true, sheetId: sheet.id, columnKey: column };
}

export async function getMobilePublishedPapers(
  institutionId: string,
  opts: { academicYear?: string; className?: string; sectionName?: string },
) {
  const academicYear = opts.academicYear || '2025-26';
  const papers = await prisma.examQuestionPaper.findMany({
    where: {
      institutionId,
      academicYear,
      mobilePublishedAt: { not: null },
      ...(opts.className ? { className: opts.className } : {}),
      ...(opts.sectionName ? { sectionName: opts.sectionName } : {}),
    },
    orderBy: [{ mobilePublishedAt: 'desc' }],
    include: {
      questions: { orderBy: { sortOrder: 'asc' }, select: { id: true, sortOrder: true, type: true, questionText: true, options: true } },
    },
  });

  return papers.map((p) => ({
    id: p.id,
    title: p.title,
    className: p.className,
    sectionName: p.sectionName,
    subjectName: p.subjectName,
    purpose: p.purpose,
    purposeLabel: PURPOSE_LABELS[p.purpose],
    durationMinutes: p.durationMinutes,
    passMarksPercent: p.passMarksPercent,
    isDigitalExam: p.isDigitalExam,
    questionCount: p.questions.length,
    mobilePublishedAt: p.mobilePublishedAt?.toISOString(),
    mobileVisibleOn: p.mobileVisibleOn ? VIS_DB_TO_UI[p.mobileVisibleOn] : null,
    questions: p.questions.map((q) => ({
      id: q.id,
      sortOrder: q.sortOrder,
      type: q.type,
      questionText: q.questionText,
      options: Array.isArray(q.options) ? q.options.map(String) : [],
    })),
  }));
}

export async function startMobilePaperAttempt(
  institutionId: string,
  paperId: string,
  student: { studentId: string; candidateName: string; candidateRef?: string },
) {
  const paper = await prisma.examQuestionPaper.findFirst({
    where: { institutionId, id: paperId, mobilePublishedAt: { not: null } },
  });
  if (!paper) throw new Error('Test not available on mobile');
  const started = await startDigitalExamAttempt(institutionId, paperId, {
    candidateName: student.candidateName,
    candidateRef: student.candidateRef,
    studentId: student.studentId,
  });
  return started;
}

export async function submitMobilePaperAttempt(
  institutionId: string,
  paperId: string,
  attemptId: string,
  answers: Record<string, string>,
) {
  const paper = await prisma.examQuestionPaper.findFirst({
    where: { institutionId, id: paperId, mobilePublishedAt: { not: null } },
  });
  if (!paper) throw new Error('Test not available');
  const result = await submitDigitalExamAttempt(institutionId, attemptId, answers);
  try {
    await capturePaperAttemptToMarks(institutionId, paperId, attemptId);
  } catch {
    // best-effort
  }
  return result;
}

export async function getPaperManagementDetail(institutionId: string, paperId: string) {
  const paper = await getQuestionPaper(institutionId, paperId);
  const attempts = await prisma.examDigitalExamAttempt.findMany({
    where: { institutionId, paperId },
    orderBy: [{ submittedAt: 'desc' }],
    take: 10,
  });
  return {
    paper,
    attempts: attempts.map((a) => ({
      id: a.id,
      candidateName: a.candidateName,
      score: a.percentScore,
      passed: a.passed,
      submittedAt: a.submittedAt?.toISOString() ?? null,
      autoScored: a.autoScored,
    })),
  };
}

export async function seedPaperManagementDemo(institutionId: string, academicYear = '2025-26') {
  const { seedQuestionBankDemo } = await import('./examQuestionBank.js');
  await seedQuestionBankDemo(institutionId, academicYear);

  const papers = await prisma.examQuestionPaper.findMany({
    where: { institutionId, academicYear },
    orderBy: [{ createdAt: 'asc' }],
    take: 2,
  });

  const now = new Date();
  for (const paper of papers) {
    await prisma.examQuestionPaper.update({
      where: { id: paper.id },
      data: {
        status: ExamPaperStatus.PUBLISHED,
        mobilePublishedAt: now,
        mobilePublishedBy: 'System',
        mobileVisibleOn: PublicationVisibility.APP,
      },
    });
  }

  return { seeded: true, mobilePublished: papers.length };
}
