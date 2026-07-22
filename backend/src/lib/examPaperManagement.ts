import { ExamPaperPurpose, ExamPaperStatus, Prisma, PublicationVisibility, StudentStatus } from '@prisma/client';
import { prisma } from './prisma.js';
import { getInstitutionFilterMeta } from './students.js';
import { getQuestionPaper } from './examQuestionBank.js';

const PURPOSE_LABELS: Record<ExamPaperPurpose, string> = {
  CLASS_TEST: 'Class Test',
  UNIT_TEST: 'Unit Test',
  MID_TERM: 'Mid Term',
  ANNUAL_EXAM: 'Annual Exam',
  ENTRANCE_TEST: 'Institute Entrance Test',
  PRACTICE: 'Practice Paper',
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
  _count: { questions: number; attempts: number };
}) {
  const isMobilePublished = Boolean(paper.mobilePublishedAt);
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
    orderBy: [{ mobilePublishedAt: 'desc' }, { updatedAt: 'desc' }],
    include: { _count: { select: { questions: true, attempts: true } } },
  });

  const serialized = papers.map(serializeManagementPaper);
  const mobilePublished = serialized.filter((p) => p.isMobilePublished).length;

  return {
    academicYear,
    summary: {
      totalPapers: serialized.length,
      mobilePublished,
      mobilePending: serialized.length - mobilePublished,
      digitalExams: serialized.filter((p) => p.isDigitalExam).length,
      totalQuestions: serialized.reduce((sum, p) => sum + p.questionCount, 0),
    },
    papers: serialized,
  };
}

export async function publishPaperToMobile(
  institutionId: string,
  paperId: string,
  opts: { visibleOn?: PublicationVisibility; publishedBy?: string },
) {
  const paper = await prisma.examQuestionPaper.findFirst({
    where: { institutionId, id: paperId },
    include: { _count: { select: { questions: true, attempts: true } } },
  });
  if (!paper) throw new Error('Question paper not found');
  if (paper._count.questions === 0) throw new Error('Cannot publish a paper with no questions');

  const visibleOn = opts.visibleOn || PublicationVisibility.BOTH;
  const now = new Date();

  const updated = await prisma.examQuestionPaper.update({
    where: { id: paper.id },
    data: {
      status: ExamPaperStatus.PUBLISHED,
      mobilePublishedAt: now,
      mobilePublishedBy: opts.publishedBy || 'Admin',
      mobileVisibleOn: visibleOn,
    },
    include: { _count: { select: { questions: true, attempts: true } } },
  });

  return {
    paper: serializeManagementPaper(updated),
    message: `Published "${updated.title}" to ${VIS_DB_TO_UI[visibleOn]} for ${updated.className} ${updated.sectionName ? `— ${updated.sectionName}` : ''} · ${updated.subjectName}`,
    publishedAt: now.toISOString(),
    targetAudience: VIS_DB_TO_UI[visibleOn],
    studentCount: await prisma.student.count({
      where: {
        institutionId,
        academicYear: updated.academicYear,
        className: updated.className,
        ...(updated.sectionName ? { sectionName: updated.sectionName } : {}),
        status: StudentStatus.ACTIVE,
      },
    }),
  };
}

export async function unpublishPaperFromMobile(institutionId: string, paperId: string) {
  const paper = await prisma.examQuestionPaper.findFirst({
    where: { institutionId, id: paperId },
    include: { _count: { select: { questions: true, attempts: true } } },
  });
  if (!paper) throw new Error('Question paper not found');

  const updated = await prisma.examQuestionPaper.update({
    where: { id: paper.id },
    data: {
      mobilePublishedAt: null,
      mobilePublishedBy: '',
      mobileVisibleOn: null,
    },
    include: { _count: { select: { questions: true, attempts: true } } },
  });

  return {
    paper: serializeManagementPaper(updated),
    message: `Removed "${updated.title}" from mobile apps`,
  };
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
      questionText: q.questionText,
      options: Array.isArray(q.options) ? q.options.map(String) : [],
    })),
  }));
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
        mobileVisibleOn: PublicationVisibility.BOTH,
      },
    });
  }

  return { seeded: true, mobilePublished: papers.length };
}
