import {
  ExamPaperPurpose,
  ExamPaperSource,
  ExamPaperStatus,
  ExamSyllabusCategory,
  Prisma,
  TestDifficulty,
  TestQuestionType,
} from '@prisma/client';
import { prisma } from './prisma.js';
import { getInstitutionFilterMeta } from './students.js';
import { extractTextFromPdfs, truncateSourceText } from './pdfText.js';
import { generateQuestionsFromText } from './geminiQuestions.js';
import { scanTestPaperWithOcr } from './geminiOcr.js';
import { gradeExam } from './examScoring.js';

export const QUESTION_TYPES = ['Multiple Choice', 'True/False', 'Short Answer'] as const;
export const DIFFICULTIES = ['Easy', 'Medium', 'Hard'] as const;

const TYPE_UI_TO_DB: Record<string, TestQuestionType> = {
  'Multiple Choice': TestQuestionType.MULTIPLE_CHOICE,
  'True/False': TestQuestionType.TRUE_FALSE,
  'Short Answer': TestQuestionType.SHORT_ANSWER,
};

const TYPE_DB_TO_UI: Record<TestQuestionType, string> = {
  MULTIPLE_CHOICE: 'Multiple Choice',
  TRUE_FALSE: 'True/False',
  SHORT_ANSWER: 'Short Answer',
};

const DIFF_UI_TO_DB: Record<string, TestDifficulty> = {
  Easy: TestDifficulty.EASY,
  Medium: TestDifficulty.MEDIUM,
  Hard: TestDifficulty.HARD,
};

const DIFF_DB_TO_UI: Record<TestDifficulty, string> = {
  EASY: 'Easy',
  MEDIUM: 'Medium',
  HARD: 'Hard',
};

const PURPOSE_LABELS: Record<ExamPaperPurpose, string> = {
  CLASS_TEST: 'Class Test',
  UNIT_TEST: 'Unit Test',
  MID_TERM: 'Mid Term',
  ANNUAL_EXAM: 'Annual Exam',
  ENTRANCE_TEST: 'Institute Entrance Test',
  PRACTICE: 'Practice Paper',
};

const SOURCE_LABELS: Record<ExamPaperSource, string> = {
  AI_PDF: 'AI from PDF',
  OCR: 'OCR Scan',
  MANUAL: 'Manual',
  SYLLABUS: 'From Syllabus',
};

const STATUS_LABELS: Record<ExamPaperStatus, string> = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
};

export type QuestionInput = {
  type: string;
  difficulty: string;
  questionText: string;
  options?: string[];
  correctAnswer?: string;
  marks?: number;
};

function parsePurpose(raw?: string): ExamPaperPurpose | undefined {
  if (!raw || raw === 'all') return undefined;
  if (Object.values(ExamPaperPurpose).includes(raw as ExamPaperPurpose)) {
    return raw as ExamPaperPurpose;
  }
  return undefined;
}

async function nextRecordId(institutionId: string) {
  const count = await prisma.examQuestionPaper.count({ where: { institutionId } });
  return `EQP-${String(1000 + count + 1)}`;
}

function serializeQuestion(q: {
  id: string;
  sortOrder: number;
  type: TestQuestionType;
  difficulty: TestDifficulty;
  questionText: string;
  options: unknown;
  correctAnswer: string | null;
  marks: number;
  autoGradable: boolean;
}) {
  return {
    id: q.id,
    sortOrder: q.sortOrder,
    type: TYPE_DB_TO_UI[q.type],
    typeKey: q.type,
    difficulty: DIFF_DB_TO_UI[q.difficulty],
    difficultyKey: q.difficulty,
    questionText: q.questionText,
    options: Array.isArray(q.options) ? q.options.map(String) : [],
    correctAnswer: q.correctAnswer || '',
    marks: q.marks,
    autoGradable: q.autoGradable,
  };
}

function serializePaper(
  paper: {
    id: string;
    recordId: string;
    academicYear: string;
    className: string;
    sectionName: string;
    subjectName: string;
    title: string;
    purpose: ExamPaperPurpose;
    source: ExamPaperSource;
    status: ExamPaperStatus;
    durationMinutes: number;
    numQuestions: number;
    questionType: string;
    difficulty: string;
    passMarksPercent: number;
    isDigitalExam: boolean;
    sourceFilesMeta: unknown;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    questions?: Parameters<typeof serializeQuestion>[0][];
    _count?: { questions: number; attempts: number };
  },
  includeQuestions = false,
) {
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
    sourceLabel: SOURCE_LABELS[paper.source],
    status: paper.status,
    statusLabel: STATUS_LABELS[paper.status],
    durationMinutes: paper.durationMinutes,
    numQuestions: paper.numQuestions,
    questionType: paper.questionType,
    difficulty: paper.difficulty,
    passMarksPercent: paper.passMarksPercent,
    isDigitalExam: paper.isDigitalExam,
    sourceFilesMeta: paper.sourceFilesMeta,
    createdBy: paper.createdBy,
    questionCount: paper._count?.questions ?? paper.questions?.length ?? paper.numQuestions,
    attemptCount: paper._count?.attempts ?? 0,
    createdAt: paper.createdAt.toISOString(),
    updatedAt: paper.updatedAt.toISOString(),
    ...(includeQuestions && paper.questions
      ? { questions: paper.questions.map(serializeQuestion) }
      : {}),
  };
}

export async function getQuestionBankMeta(institutionId: string) {
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
    questionTypes: [...QUESTION_TYPES],
    difficulties: [...DIFFICULTIES],
    purposes: Object.entries(PURPOSE_LABELS).map(([id, label]) => ({ id, label })),
    sources: Object.entries(SOURCE_LABELS).map(([id, label]) => ({ id, label })),
  };
}

export async function listQuestionPapers(
  institutionId: string,
  opts: {
    academicYear?: string;
    className?: string;
    sectionName?: string;
    subjectName?: string;
    purpose?: string;
    status?: string;
  },
) {
  const academicYear = opts.academicYear || '2025-26';
  const purpose = parsePurpose(opts.purpose);
  const status = opts.status && Object.values(ExamPaperStatus).includes(opts.status as ExamPaperStatus)
    ? (opts.status as ExamPaperStatus)
    : undefined;

  const papers = await prisma.examQuestionPaper.findMany({
    where: {
      institutionId,
      academicYear,
      ...(opts.className ? { className: opts.className } : {}),
      ...(opts.sectionName ? { sectionName: opts.sectionName } : {}),
      ...(opts.subjectName ? { subjectName: opts.subjectName } : {}),
      ...(purpose ? { purpose } : {}),
      ...(status ? { status } : {}),
    },
    orderBy: [{ updatedAt: 'desc' }],
    include: { _count: { select: { questions: true, attempts: true } } },
  });

  const totalQuestions = await prisma.examQuestionPaperQuestion.count({
    where: { paper: { institutionId, academicYear } },
  });

  const byPurpose = await prisma.examQuestionPaper.groupBy({
    by: ['purpose'],
    where: { institutionId, academicYear },
    _count: { _all: true },
  });

  return {
    academicYear,
    summary: {
      totalPapers: papers.length,
      totalQuestions,
      published: papers.filter((p) => p.status === ExamPaperStatus.PUBLISHED).length,
      digitalExams: papers.filter((p) => p.isDigitalExam).length,
      byPurpose: Object.fromEntries(
        byPurpose.map((r) => [r.purpose, { count: r._count._all, label: PURPOSE_LABELS[r.purpose] }]),
      ),
    },
    papers: papers.map((p) => serializePaper(p)),
  };
}

export async function getQuestionPaper(institutionId: string, id: string) {
  const paper = await prisma.examQuestionPaper.findFirst({
    where: { institutionId, id },
    include: { questions: { orderBy: { sortOrder: 'asc' } }, _count: { select: { attempts: true } } },
  });
  if (!paper) throw new Error('Question paper not found');
  return serializePaper({ ...paper, _count: { questions: paper.questions.length, attempts: paper._count.attempts } }, true);
}

export async function generatePaperFromPdf(
  files: { fileName: string; mimeType?: string; fileData: string }[],
  params: { numQuestions: number; questionType: string; difficulty: string; title?: string },
) {
  const { combinedText, fileMeta } = await extractTextFromPdfs(files);
  const sourceText = truncateSourceText(combinedText);
  const questions = await generateQuestionsFromText({
    sourceText,
    numQuestions: params.numQuestions,
    questionType: params.questionType,
    difficulty: params.difficulty,
    title: params.title,
  });
  const suggestedTitle =
    params.title?.trim() ||
    `Question Paper — ${fileMeta.map((f) => f.fileName.replace(/\.pdf$/i, '')).join(', ')}`.slice(0, 120);
  return { suggestedTitle, fileMeta, questions };
}

export async function scanPaperWithOcr(
  files: { fileName: string; mimeType?: string; fileData: string }[],
  params: { questionType: string; difficulty: string; title?: string },
) {
  const result = await scanTestPaperWithOcr(
    files,
    params.questionType,
    params.difficulty,
    params.title,
  );
  return {
    suggestedTitle: params.title?.trim() || result.suggestedTitle,
    rawOcrText: result.rawOcrText,
    previewFiles: result.previewFiles,
    fileMeta: result.fileMeta,
    questions: result.questions,
  };
}

export async function generatePaperFromSyllabus(
  institutionId: string,
  params: {
    academicYear: string;
    className: string;
    sectionName?: string;
    subjectName: string;
    purpose: ExamPaperPurpose;
    numQuestions: number;
    questionType: string;
    difficulty: string;
    title?: string;
  },
) {
  const syllabi = await prisma.examSubjectSyllabus.findMany({
    where: {
      institutionId,
      academicYear: params.academicYear,
      className: params.className,
      ...(params.sectionName ? { sectionName: params.sectionName } : {}),
      subjectName: params.subjectName,
    },
    orderBy: [{ sortOrder: 'asc' }],
  });

  const purposeToCategory: Partial<Record<ExamPaperPurpose, ExamSyllabusCategory>> = {
    CLASS_TEST: ExamSyllabusCategory.CLASS_TEST_SERIES,
    UNIT_TEST: ExamSyllabusCategory.UNIT_TEST,
    MID_TERM: ExamSyllabusCategory.MID_TERM,
    ANNUAL_EXAM: ExamSyllabusCategory.ANNUAL_EXAM,
  };
  const match = syllabi.find((s) => s.category === purposeToCategory[params.purpose]) || syllabi[0];

  let sourceText = '';
  if (match) {
    const topics = Array.isArray(match.topics) ? match.topics : [];
    sourceText = topics
      .map((item) => {
        const t = item as { unitNumber?: number; chapterTitle?: string; topics?: string[] };
        const unit = t.unitNumber ? `Unit ${t.unitNumber}` : '';
        const chapter = t.chapterTitle || '';
        const items = Array.isArray(t.topics) ? t.topics.join('; ') : '';
        return `${unit} ${chapter}: ${items}`;
      })
      .join('\n');
    sourceText = `${match.title}\n${match.unitsCovered}\n${sourceText}`;
  }

  if (!sourceText.trim()) {
    const chapters = await prisma.academicSyllabusChapter.findMany({
      where: {
        institutionId,
        academicYear: params.academicYear,
        className: params.className,
        subjectName: params.subjectName,
      },
      orderBy: [{ unitNumber: 'asc' }],
      take: 6,
    });
    sourceText = chapters.map((c) => `Unit ${c.unitNumber}: ${c.chapterTitle}`).join('\n');
  }

  if (!sourceText.trim()) {
    throw new Error('No syllabus found for this class and subject. Add syllabus in Subjects & Syllabus first.');
  }

  const questions = await generateQuestionsFromText({
    sourceText,
    numQuestions: params.numQuestions,
    questionType: params.questionType,
    difficulty: params.difficulty,
    title: params.title,
  });

  const suggestedTitle =
    params.title?.trim() ||
    `${params.className} ${params.subjectName} — ${PURPOSE_LABELS[params.purpose]}`;

  return { suggestedTitle, sourceText: sourceText.slice(0, 500), questions };
}

export async function createQuestionPaper(
  institutionId: string,
  data: {
    academicYear: string;
    className: string;
    sectionName?: string;
    subjectName: string;
    title: string;
    purpose: ExamPaperPurpose;
    source: ExamPaperSource;
    durationMinutes?: number;
    questionType?: string;
    difficulty?: string;
    passMarksPercent?: number;
    isDigitalExam?: boolean;
    sourceFilesMeta?: unknown[];
    status?: ExamPaperStatus;
    questions: QuestionInput[];
    createdBy?: string;
  },
) {
  const recordId = await nextRecordId(institutionId);
  const paper = await prisma.examQuestionPaper.create({
    data: {
      institutionId,
      recordId,
      academicYear: data.academicYear,
      className: data.className,
      sectionName: data.sectionName || '',
      subjectName: data.subjectName,
      title: data.title.trim(),
      purpose: data.purpose,
      source: data.source,
      status: data.status || ExamPaperStatus.DRAFT,
      durationMinutes: data.durationMinutes ?? 60,
      numQuestions: data.questions.length,
      questionType: data.questionType || 'Multiple Choice',
      difficulty: data.difficulty || 'Medium',
      passMarksPercent: data.passMarksPercent ?? 33,
      isDigitalExam: data.isDigitalExam ?? true,
      sourceFilesMeta: (data.sourceFilesMeta || []) as Prisma.InputJsonValue,
      createdBy: data.createdBy || 'Teacher',
      questions: {
        create: data.questions.map((q, i) => ({
          sortOrder: i,
          type: TYPE_UI_TO_DB[q.type] || TestQuestionType.MULTIPLE_CHOICE,
          difficulty: DIFF_UI_TO_DB[q.difficulty] || TestDifficulty.MEDIUM,
          questionText: q.questionText.trim(),
          options: q.options || [],
          correctAnswer: q.correctAnswer || null,
          marks: q.marks ?? 1,
          autoGradable: true,
        })),
      },
    },
    include: { questions: { orderBy: { sortOrder: 'asc' } } },
  });
  return serializePaper(paper, true);
}

export async function updateQuestionPaper(
  institutionId: string,
  id: string,
  data: Partial<{
    title: string;
    purpose: ExamPaperPurpose;
    durationMinutes: number;
    passMarksPercent: number;
    isDigitalExam: boolean;
    status: ExamPaperStatus;
    questions: QuestionInput[];
  }>,
) {
  const existing = await prisma.examQuestionPaper.findFirst({ where: { institutionId, id } });
  if (!existing) throw new Error('Question paper not found');

  if (data.questions) {
    await prisma.examQuestionPaperQuestion.deleteMany({ where: { paperId: existing.id } });
    await prisma.examQuestionPaperQuestion.createMany({
      data: data.questions.map((q, i) => ({
        paperId: existing.id,
        sortOrder: i,
        type: TYPE_UI_TO_DB[q.type] || TestQuestionType.MULTIPLE_CHOICE,
        difficulty: DIFF_UI_TO_DB[q.difficulty] || TestDifficulty.MEDIUM,
        questionText: q.questionText.trim(),
        options: (q.options || []) as Prisma.InputJsonValue,
        correctAnswer: q.correctAnswer || null,
        marks: q.marks ?? 1,
        autoGradable: true,
      })),
    });
  }

  const paper = await prisma.examQuestionPaper.update({
    where: { id: existing.id },
    data: {
      ...(data.title !== undefined ? { title: data.title.trim() } : {}),
      ...(data.purpose !== undefined ? { purpose: data.purpose } : {}),
      ...(data.durationMinutes !== undefined ? { durationMinutes: data.durationMinutes } : {}),
      ...(data.passMarksPercent !== undefined ? { passMarksPercent: data.passMarksPercent } : {}),
      ...(data.isDigitalExam !== undefined ? { isDigitalExam: data.isDigitalExam } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.questions ? { numQuestions: data.questions.length } : {}),
    },
    include: { questions: { orderBy: { sortOrder: 'asc' } } },
  });
  return serializePaper(paper, true);
}

export async function deleteQuestionPaper(institutionId: string, id: string) {
  const existing = await prisma.examQuestionPaper.findFirst({ where: { institutionId, id } });
  if (!existing) throw new Error('Question paper not found');
  await prisma.examQuestionPaper.delete({ where: { id: existing.id } });
  return { deleted: true };
}

export async function startDigitalExamAttempt(
  institutionId: string,
  paperId: string,
  candidate: { candidateName: string; candidateRef?: string; studentId?: string },
) {
  const paper = await prisma.examQuestionPaper.findFirst({
    where: { institutionId, id: paperId, isDigitalExam: true },
    include: { questions: { orderBy: { sortOrder: 'asc' } } },
  });
  if (!paper) throw new Error('Digital exam paper not found');
  if (!paper.questions.length) throw new Error('Paper has no questions');

  const attempt = await prisma.examDigitalExamAttempt.create({
    data: {
      institutionId,
      paperId: paper.id,
      studentId: candidate.studentId || null,
      candidateName: candidate.candidateName,
      candidateRef: candidate.candidateRef || '',
    },
  });

  return {
    attemptId: attempt.id,
    paper: serializePaper(paper),
    questions: paper.questions.map((q) => ({
      id: q.id,
      sortOrder: q.sortOrder,
      type: TYPE_DB_TO_UI[q.type],
      questionText: q.questionText,
      options: Array.isArray(q.options) ? q.options.map(String) : [],
    })),
    durationMinutes: paper.durationMinutes,
    passMarksPercent: paper.passMarksPercent,
    startedAt: attempt.startedAt.toISOString(),
  };
}

export async function submitDigitalExamAttempt(
  institutionId: string,
  attemptId: string,
  answers: Record<string, string>,
) {
  const attempt = await prisma.examDigitalExamAttempt.findFirst({
    where: { institutionId, id: attemptId },
    include: {
      paper: { include: { questions: { orderBy: { sortOrder: 'asc' } } } },
    },
  });
  if (!attempt) throw new Error('Exam attempt not found');
  if (attempt.submittedAt) throw new Error('Exam already submitted');

  const grade = gradeExam(
    attempt.paper.questions.map((q) => ({
      id: q.id,
      sortOrder: q.sortOrder,
      type: q.type,
      questionText: q.questionText,
      options: q.options,
      correctAnswer: q.correctAnswer,
    })),
    answers,
    attempt.paper.passMarksPercent,
  );

  const updated = await prisma.examDigitalExamAttempt.update({
    where: { id: attempt.id },
    data: {
      answers: answers as Prisma.InputJsonValue,
      submittedAt: new Date(),
      score: grade.rawScore,
      maxScore: grade.maxScore,
      percentScore: grade.percent,
      passed: grade.passed,
      resultBreakdown: grade.breakdown as Prisma.InputJsonValue,
      autoScored: true,
    },
  });

  return {
    attemptId: updated.id,
    candidateName: attempt.candidateName,
    paperTitle: attempt.paper.title,
    score: grade.percent,
    rawScore: grade.rawScore,
    maxScore: grade.maxScore,
    passed: grade.passed,
    passMarksRequired: grade.passMarksRequired,
    correctCount: grade.correctCount,
    partialCount: grade.partialCount,
    wrongCount: grade.wrongCount,
    unansweredCount: grade.unansweredCount,
    breakdown: grade.breakdown,
    submittedAt: updated.submittedAt?.toISOString(),
    message: grade.passed
      ? `Passed with ${grade.percent}% (required ${grade.passMarksRequired}%)`
      : `Scored ${grade.percent}% — pass marks ${grade.passMarksRequired}%`,
  };
}

export async function listDigitalExamAttempts(institutionId: string, paperId: string) {
  const attempts = await prisma.examDigitalExamAttempt.findMany({
    where: { institutionId, paperId },
    orderBy: [{ submittedAt: 'desc' }, { startedAt: 'desc' }],
    take: 50,
  });
  return attempts.map((a) => ({
    id: a.id,
    candidateName: a.candidateName,
    candidateRef: a.candidateRef,
    startedAt: a.startedAt.toISOString(),
    submittedAt: a.submittedAt?.toISOString() || null,
    score: a.percentScore,
    passed: a.passed,
    autoScored: a.autoScored,
  }));
}

const DEMO_QUESTIONS: QuestionInput[] = [
  {
    type: 'Multiple Choice',
    difficulty: 'Easy',
    questionText: 'What is the value of 15% of 200?',
    options: ['20', '25', '30', '35'],
    correctAnswer: '30',
  },
  {
    type: 'Multiple Choice',
    difficulty: 'Medium',
    questionText: 'Which gas is most abundant in the Earth\'s atmosphere?',
    options: ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Hydrogen'],
    correctAnswer: 'Nitrogen',
  },
  {
    type: 'True/False',
    difficulty: 'Easy',
    questionText: 'The sum of angles in a triangle is 180 degrees.',
    options: ['True', 'False'],
    correctAnswer: 'True',
  },
  {
    type: 'Multiple Choice',
    difficulty: 'Medium',
    questionText: 'Who wrote "Romeo and Juliet"?',
    options: ['Charles Dickens', 'William Shakespeare', 'Jane Austen', 'Mark Twain'],
    correctAnswer: 'William Shakespeare',
  },
  {
    type: 'Short Answer',
    difficulty: 'Hard',
    questionText: 'Define photosynthesis in one sentence.',
    options: [],
    correctAnswer: 'Process by which green plants convert light energy into chemical energy',
  },
];

export async function seedQuestionBankDemo(institutionId: string, academicYear = '2025-26', createdBy = 'System') {
  const existing = await prisma.examQuestionPaper.count({ where: { institutionId, academicYear } });
  if (existing > 0) return { seeded: false, papers: existing };

  const combos = [
    { className: 'Class 8', sectionName: 'A', subjectName: 'Mathematics', purpose: ExamPaperPurpose.UNIT_TEST },
    { className: 'Class 8', sectionName: 'A', subjectName: 'Science', purpose: ExamPaperPurpose.CLASS_TEST },
    { className: 'Class 9', sectionName: 'A', subjectName: 'Mathematics', purpose: ExamPaperPurpose.MID_TERM },
    { className: 'Class 10', sectionName: 'A', subjectName: 'English', purpose: ExamPaperPurpose.ANNUAL_EXAM },
    { className: 'Class 6', sectionName: 'A', subjectName: 'Mathematics', purpose: ExamPaperPurpose.ENTRANCE_TEST },
  ];

  let created = 0;
  for (const combo of combos) {
    await createQuestionPaper(institutionId, {
      academicYear,
      className: combo.className,
      sectionName: combo.sectionName,
      subjectName: combo.subjectName,
      title: `${combo.className} ${combo.subjectName} — ${PURPOSE_LABELS[combo.purpose]}`,
      purpose: combo.purpose,
      source: ExamPaperSource.MANUAL,
      status: ExamPaperStatus.PUBLISHED,
      durationMinutes: combo.purpose === ExamPaperPurpose.ENTRANCE_TEST ? 90 : 60,
      passMarksPercent: combo.purpose === ExamPaperPurpose.ENTRANCE_TEST ? 40 : 33,
      isDigitalExam: true,
      questions: DEMO_QUESTIONS,
      createdBy,
    });
    created++;
  }

  return { seeded: true, papers: created };
}
