import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import {
  AdmissionTestSource,
  AdmissionTestStatus,
  ApplicationStatus,
  Prisma,
  PublicationDestination,
  PublicationVisibility,
  TestDifficulty,
  TestQuestionType,
} from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { getDefaultInstitutionId } from '../lib/institution.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { extractTextFromPdfs, truncateSourceText } from '../lib/pdfText.js';
import { generateQuestionsFromText } from '../lib/geminiQuestions.js';
import { scanTestPaperWithOcr } from '../lib/geminiOcr.js';
import {
  ensureAdmissionTestSettings,
  getInstitutionPassMarks,
} from '../lib/admissionTestSettings.js';

export const admissionTestsRouter = Router();
admissionTestsRouter.use(requireAuth);

export const QUESTION_TYPES = ['Multiple Choice', 'True/False', 'Short Answer'] as const;
export const DIFFICULTIES = ['Easy', 'Medium', 'Hard'] as const;

const TYPE_UI_TO_DB: Record<string, TestQuestionType> = {
  'Multiple Choice': TestQuestionType.MULTIPLE_CHOICE,
  'True/False': TestQuestionType.TRUE_FALSE,
  'Short Answer': TestQuestionType.SHORT_ANSWER,
  MULTIPLE_CHOICE: TestQuestionType.MULTIPLE_CHOICE,
  TRUE_FALSE: TestQuestionType.TRUE_FALSE,
  SHORT_ANSWER: TestQuestionType.SHORT_ANSWER,
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
  EASY: TestDifficulty.EASY,
  MEDIUM: TestDifficulty.MEDIUM,
  HARD: TestDifficulty.HARD,
};

const DIFF_DB_TO_UI: Record<TestDifficulty, string> = {
  EASY: 'Easy',
  MEDIUM: 'Medium',
  HARD: 'Hard',
};

const STATUS_DB_TO_UI: Record<AdmissionTestStatus, string> = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
};

const DEST_DB_TO_UI: Record<PublicationDestination, string> = {
  ENTRANCE_EXAM_PORTAL: 'Entrance Exam Portal',
};

const VIS_DB_TO_UI: Record<PublicationVisibility, string> = {
  WEB: 'Website',
  APP: 'Mobile App',
  BOTH: 'Website & Mobile App',
};

async function generateUniqueToken(): Promise<string> {
  const year = new Date().getFullYear();
  for (let i = 0; i < 30; i++) {
    const num = Math.floor(1000 + Math.random() * 9000);
    const tokenNumber = `ENT-${year}-${num}`;
    const exists = await prisma.entranceExamCredential.findUnique({ where: { tokenNumber } });
    if (!exists) return tokenNumber;
  }
  throw new Error('Could not generate unique exam token');
}

function generatePin(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function serializePublication(pub: {
  id: string;
  destination: PublicationDestination;
  scheduledAt: Date;
  durationMinutes: number;
  visibleOn: PublicationVisibility;
  publishedAt: Date;
  publishedBy: string;
  credentials?: {
    id: string;
    tokenNumber: string;
    pinPlain: string;
    application: { applicationId: string; studentName: string; email: string; mobile: string };
    attempt: { submittedAt: Date | null; score: number | null; percentScore?: number | null; passed?: boolean | null } | null;
  }[];
}) {
  return {
    id: pub.id,
    destination: DEST_DB_TO_UI[pub.destination],
    destinationKey: pub.destination,
    scheduledAt: pub.scheduledAt.toISOString(),
    durationMinutes: pub.durationMinutes,
    visibleOn: VIS_DB_TO_UI[pub.visibleOn],
    visibleOnKey: pub.visibleOn,
    publishedAt: pub.publishedAt.toISOString(),
    publishedBy: pub.publishedBy,
    credentials: (pub.credentials || []).map((c) => ({
      id: c.id,
      tokenNumber: c.tokenNumber,
      pin: c.pinPlain,
      applicationId: c.application.applicationId,
      studentName: c.application.studentName,
      email: c.application.email,
      mobile: c.application.mobile,
      submitted: !!c.attempt?.submittedAt,
      score: c.attempt?.percentScore ?? c.attempt?.score ?? null,
      passed: c.attempt?.passed ?? null,
    })),
  };
}

const fileSchema = z.object({
  fileName: z.string().min(1),
  mimeType: z.string().optional(),
  fileData: z.string().min(10),
});

const questionInputSchema = z.object({
  type: z.string().min(1),
  difficulty: z.string().min(1),
  questionText: z.string().min(1),
  options: z.array(z.string()).optional().default([]),
  correctAnswer: z.string().optional().default(''),
});

function serializeQuestion(q: {
  id: string;
  sortOrder: number;
  type: TestQuestionType;
  difficulty: TestDifficulty;
  questionText: string;
  options: unknown;
  correctAnswer: string | null;
}) {
  return {
    id: q.id,
    sortOrder: q.sortOrder,
    type: TYPE_DB_TO_UI[q.type],
    typeKey: q.type,
    difficulty: DIFF_DB_TO_UI[q.difficulty],
    difficultyKey: q.difficulty,
    questionText: q.questionText,
    options: Array.isArray(q.options) ? q.options : [],
    correctAnswer: q.correctAnswer || '',
  };
}

function serializeTestSummary(t: {
  id: string;
  title: string;
  status: AdmissionTestStatus;
  source: AdmissionTestSource;
  durationMinutes: number;
  numQuestions: number;
  questionType: string;
  difficulty: string;
  sourceFilesMeta: unknown;
  createdBy: string;
  passMarksPercent?: number | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: { questions: number };
  questions?: {
    id: string;
    sortOrder: number;
    type: TestQuestionType;
    difficulty: TestDifficulty;
    questionText: string;
    options: unknown;
    correctAnswer: string | null;
  }[];
  publication?: { publishedAt: Date } | null;
}) {
  return {
    id: t.id,
    title: t.title,
    status: STATUS_DB_TO_UI[t.status],
    statusKey: t.status,
    source: t.source,
    durationMinutes: t.durationMinutes,
    numQuestions: t.numQuestions,
    questionType: t.questionType,
    difficulty: t.difficulty,
    sourceFilesMeta: t.sourceFilesMeta,
    createdBy: t.createdBy,
    passMarksPercent: t.passMarksPercent ?? null,
    questionCount: t._count?.questions ?? t.questions?.length ?? 0,
    publishedAt: t.publication?.publishedAt ? t.publication.publishedAt.toISOString() : '',
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

function serializeTest(
  t: {
    id: string;
    title: string;
    status: AdmissionTestStatus;
    source: AdmissionTestSource;
    durationMinutes: number;
    numQuestions: number;
    questionType: string;
    difficulty: string;
    sourceFilesMeta: unknown;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    questions?: {
      id: string;
      sortOrder: number;
      type: TestQuestionType;
      difficulty: TestDifficulty;
      questionText: string;
      options: unknown;
      correctAnswer: string | null;
    }[];
  },
  includeQuestions = false,
) {
  const base = serializeTestSummary(t);
  return {
    ...base,
    ...(includeQuestions && t.questions
      ? { questions: t.questions.map(serializeQuestion) }
      : {}),
  };
}

admissionTestsRouter.get('/meta', (_req, res) => {
  return res.json({
    questionTypes: QUESTION_TYPES,
    difficulties: DIFFICULTIES,
    statuses: Object.values(STATUS_DB_TO_UI),
  });
});

admissionTestsRouter.get(
  '/settings',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const settings = await ensureAdmissionTestSettings(institutionId);
    return res.json({
      settings: {
        passMarksPercent: settings.passMarksPercent,
        updatedAt: settings.updatedAt.toISOString(),
      },
    });
  }),
);

admissionTestsRouter.patch(
  '/settings',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      passMarksPercent: z.number().int().min(0).max(100),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    const settings = await prisma.admissionTestSettings.upsert({
      where: { institutionId },
      create: {
        institutionId,
        passMarksPercent: parsed.data.passMarksPercent,
      },
      update: {
        passMarksPercent: parsed.data.passMarksPercent,
      },
    });

    return res.json({
      settings: {
        passMarksPercent: settings.passMarksPercent,
        updatedAt: settings.updatedAt.toISOString(),
      },
    });
  }),
);

admissionTestsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const tests = await prisma.admissionTest.findMany({
      where: { institutionId },
      include: {
        _count: { select: { questions: true } },
        publication: { select: { publishedAt: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return res.json({
      tests: tests.map((t) => serializeTestSummary(t)),
    });
  }),
);

admissionTestsRouter.get(
  '/:id/publication',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const test = await prisma.admissionTest.findFirst({
      where: { id: req.params.id, institutionId },
      include: {
        publication: {
          include: {
            credentials: {
              include: {
                application: {
                  select: {
                    applicationId: true,
                    studentName: true,
                    email: true,
                    mobile: true,
                  },
                },
                attempt: { select: { submittedAt: true, score: true, percentScore: true, passed: true } },
              },
            },
          },
        },
      },
    });
    if (!test) return res.status(404).json({ error: 'Test not found' });
    if (!test.publication) return res.json({ publication: null });
    return res.json({ publication: serializePublication(test.publication) });
  }),
);

admissionTestsRouter.post(
  '/:id/publish',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      destination: z.enum(['Entrance Exam Portal', 'ENTRANCE_EXAM_PORTAL']).optional(),
      scheduledAt: z.string().min(4),
      durationMinutes: z.number().int().min(5).max(480),
      visibleOn: z.enum(['Website', 'Mobile App', 'Website & Mobile App', 'WEB', 'APP', 'BOTH']),
      applicationIds: z.array(z.string()).min(1),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    const test = await prisma.admissionTest.findFirst({
      where: { id: req.params.id, institutionId },
      include: { questions: true, publication: true },
    });
    if (!test) return res.status(404).json({ error: 'Test not found' });
    if (test.questions.length === 0) {
      return res.status(400).json({ error: 'Test must have at least one question before publishing' });
    }
    if (test.publication) {
      return res.status(409).json({ error: 'Test is already published' });
    }

    const scheduledAt = new Date(parsed.data.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) {
      return res.status(400).json({ error: 'Invalid scheduled date' });
    }

    const visMap: Record<string, PublicationVisibility> = {
      Website: PublicationVisibility.WEB,
      'Mobile App': PublicationVisibility.APP,
      'Website & Mobile App': PublicationVisibility.BOTH,
      WEB: PublicationVisibility.WEB,
      APP: PublicationVisibility.APP,
      BOTH: PublicationVisibility.BOTH,
    };
    const visibleOn = visMap[parsed.data.visibleOn] || PublicationVisibility.BOTH;

    const applications = await prisma.application.findMany({
      where: {
        id: { in: parsed.data.applicationIds },
        institutionId,
        status: { notIn: [ApplicationStatus.REJECTED, ApplicationStatus.APPROVED] },
      },
    });
    if (applications.length === 0) {
      return res.status(400).json({ error: 'No valid applicants selected' });
    }

    const publishedBy = req.user?.email || 'Admin';
    const expiresAt = new Date(scheduledAt.getTime() + parsed.data.durationMinutes * 60_000 + 7 * 86400000);

    const credentialsData = await Promise.all(
      applications.map(async (app) => {
        const pin = generatePin();
        const pinHash = await bcrypt.hash(pin, 10);
        const tokenNumber = await generateUniqueToken();
        return {
          applicationId: app.id,
          tokenNumber,
          pinHash,
          pinPlain: pin,
          expiresAt,
          deliveredAt: new Date(),
        };
      }),
    );

    const publication = await prisma.$transaction(async (tx) => {
      const pub = await tx.testPublication.create({
        data: {
          testId: test.id,
          institutionId,
          destination: PublicationDestination.ENTRANCE_EXAM_PORTAL,
          scheduledAt,
          durationMinutes: parsed.data.durationMinutes,
          visibleOn,
          publishedBy,
          credentials: { create: credentialsData },
        },
        include: {
          credentials: {
            include: {
              application: {
                select: { applicationId: true, studentName: true, email: true, mobile: true },
              },
              attempt: { select: { submittedAt: true, score: true, percentScore: true, passed: true } },
            },
          },
        },
      });
      await tx.admissionTest.update({
        where: { id: test.id },
        data: {
          status: AdmissionTestStatus.PUBLISHED,
          durationMinutes: parsed.data.durationMinutes,
        },
      });
      return pub;
    });

    const portalUrl = `${process.env.FRONTEND_URL?.split(',')[0] || 'http://localhost:3000'}/entrance-exam`;

    return res.status(201).json({
      publication: serializePublication(publication),
      portalUrl,
      message: `Test published to Entrance Exam Portal. ${credentialsData.length} credential(s) generated.`,
    });
  }),
);

admissionTestsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const test = await prisma.admissionTest.findFirst({
      where: { id: req.params.id, institutionId },
      include: { questions: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!test) return res.status(404).json({ error: 'Test not found' });
    return res.json({ test: serializeTest(test, true) });
  }),
);

admissionTestsRouter.post(
  '/generate-from-pdf',
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

    const totalSize = parsed.data.files.reduce((n, f) => n + f.fileData.length, 0);
    if (totalSize > 15_000_000) {
      return res.status(400).json({ error: 'Total upload size too large (max ~10MB)' });
    }

    const { combinedText, fileMeta } = await extractTextFromPdfs(parsed.data.files);
    const sourceText = truncateSourceText(combinedText);

    const questions = await generateQuestionsFromText({
      sourceText,
      numQuestions: parsed.data.numQuestions,
      questionType: parsed.data.questionType,
      difficulty: parsed.data.difficulty,
      title: parsed.data.title,
    });

    const suggestedTitle =
      parsed.data.title?.trim() ||
      `Admission Test — ${fileMeta.map((f) => f.fileName.replace(/\.pdf$/i, '')).join(', ')}`.slice(
        0,
        120,
      );

    return res.json({
      suggestedTitle,
      fileMeta,
      questions: questions.map((q, i) => ({
        sortOrder: i,
        type: q.type,
        difficulty: q.difficulty,
        questionText: q.questionText,
        options: q.options,
        correctAnswer: q.correctAnswer,
      })),
    });
  }),
);

admissionTestsRouter.post(
  '/scan-ocr',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      title: z.string().optional(),
      files: z.array(fileSchema).min(1).max(10),
      questionType: z.enum(QUESTION_TYPES).optional().default('Multiple Choice'),
      difficulty: z.enum(DIFFICULTIES).optional().default('Medium'),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const totalSize = parsed.data.files.reduce((n, f) => n + f.fileData.length, 0);
    if (totalSize > 15_000_000) {
      return res.status(400).json({ error: 'Total upload size too large (max ~10MB)' });
    }

    const result = await scanTestPaperWithOcr(
      parsed.data.files,
      parsed.data.questionType,
      parsed.data.difficulty,
      parsed.data.title,
    );

    return res.json({
      suggestedTitle: parsed.data.title?.trim() || result.suggestedTitle,
      rawOcrText: result.rawOcrText,
      previewFiles: result.previewFiles,
      fileMeta: result.fileMeta,
      questions: result.questions.map((q, i) => ({
        sortOrder: i,
        type: q.type,
        difficulty: q.difficulty,
        questionText: q.questionText,
        options: q.options,
        correctAnswer: q.correctAnswer,
      })),
    });
  }),
);

admissionTestsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      title: z.string().min(1),
      durationMinutes: z.number().int().min(5).max(480).optional(),
      numQuestions: z.number().int().min(1).max(100).optional(),
      questionType: z.enum(QUESTION_TYPES).optional(),
      difficulty: z.enum(DIFFICULTIES).optional(),
      sourceFilesMeta: z.array(z.unknown()).optional(),
      source: z.enum(['PDF', 'OCR', 'SYLLABUS', 'MANUAL']).optional(),
      passMarksPercent: z.number().int().min(0).max(100).optional().nullable(),
      questions: z.array(questionInputSchema).min(1),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    const createdBy = req.user?.email || 'Teacher';

    const sourceMap: Record<string, AdmissionTestSource> = {
      PDF: AdmissionTestSource.PDF,
      OCR: AdmissionTestSource.OCR,
      SYLLABUS: AdmissionTestSource.SYLLABUS,
      MANUAL: AdmissionTestSource.MANUAL,
    };
    const source = sourceMap[parsed.data.source || 'PDF'] || AdmissionTestSource.PDF;

    const test = await prisma.admissionTest.create({
      data: {
        institutionId,
        title: parsed.data.title.trim(),
        status: AdmissionTestStatus.DRAFT,
        source,
        durationMinutes: parsed.data.durationMinutes ?? 60,
        numQuestions: parsed.data.numQuestions ?? parsed.data.questions.length,
        questionType: parsed.data.questionType ?? 'Multiple Choice',
        difficulty: parsed.data.difficulty ?? 'Medium',
        sourceFilesMeta: (parsed.data.sourceFilesMeta || []) as Prisma.InputJsonValue,
        passMarksPercent: parsed.data.passMarksPercent ?? null,
        createdBy,
        questions: {
          create: parsed.data.questions.map((q, i) => ({
            sortOrder: i,
            type: TYPE_UI_TO_DB[q.type] || TestQuestionType.MULTIPLE_CHOICE,
            difficulty: DIFF_UI_TO_DB[q.difficulty] || TestDifficulty.MEDIUM,
            questionText: q.questionText.trim(),
            options: q.options || [],
            correctAnswer: q.correctAnswer || null,
          })),
        },
      },
      include: { questions: { orderBy: { sortOrder: 'asc' } } },
    });

    return res.status(201).json({ test: serializeTest(test, true) });
  }),
);

admissionTestsRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      title: z.string().min(1).optional(),
      durationMinutes: z.number().int().min(5).max(480).optional(),
      numQuestions: z.number().int().min(1).max(100).optional(),
      questionType: z.enum(QUESTION_TYPES).optional(),
      difficulty: z.enum(DIFFICULTIES).optional(),
      passMarksPercent: z.number().int().min(0).max(100).optional().nullable(),
      questions: z.array(questionInputSchema).min(1).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    const existing = await prisma.admissionTest.findFirst({
      where: { id: req.params.id, institutionId },
    });
    if (!existing) return res.status(404).json({ error: 'Test not found' });
    if (existing.status === AdmissionTestStatus.PUBLISHED) {
      return res.status(400).json({ error: 'Published tests cannot be edited in Phase 1' });
    }

    if (parsed.data.questions) {
      await prisma.testQuestion.deleteMany({ where: { testId: existing.id } });
      await prisma.testQuestion.createMany({
        data: parsed.data.questions.map((q, i) => ({
          testId: existing.id,
          sortOrder: i,
          type: TYPE_UI_TO_DB[q.type] || TestQuestionType.MULTIPLE_CHOICE,
          difficulty: DIFF_UI_TO_DB[q.difficulty] || TestDifficulty.MEDIUM,
          questionText: q.questionText.trim(),
          options: q.options || [],
          correctAnswer: q.correctAnswer || null,
        })),
      });
    }

    const test = await prisma.admissionTest.update({
      where: { id: existing.id },
      data: {
        ...(parsed.data.title !== undefined ? { title: parsed.data.title.trim() } : {}),
        ...(parsed.data.durationMinutes !== undefined
          ? { durationMinutes: parsed.data.durationMinutes }
          : {}),
        ...(parsed.data.numQuestions !== undefined ? { numQuestions: parsed.data.numQuestions } : {}),
        ...(parsed.data.questionType !== undefined ? { questionType: parsed.data.questionType } : {}),
        ...(parsed.data.difficulty !== undefined ? { difficulty: parsed.data.difficulty } : {}),
        ...(parsed.data.passMarksPercent !== undefined
          ? { passMarksPercent: parsed.data.passMarksPercent }
          : {}),
      },
      include: { questions: { orderBy: { sortOrder: 'asc' } } },
    });

    return res.json({ test: serializeTest(test, true) });
  }),
);

admissionTestsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const existing = await prisma.admissionTest.findFirst({
      where: { id: req.params.id, institutionId },
    });
    if (!existing) return res.status(404).json({ error: 'Test not found' });
    if (existing.status === AdmissionTestStatus.PUBLISHED) {
      return res.status(400).json({ error: 'Published tests cannot be deleted in Phase 1' });
    }
    await prisma.admissionTest.delete({ where: { id: existing.id } });
    return res.json({ ok: true });
  }),
);
