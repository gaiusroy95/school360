import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import {
  ApplicationStatus,
  PublicationVisibility,
  TestQuestionType,
} from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireExamSession, signExamToken } from '../middleware/examAuth.js';
import { gradeExam, type ExamGradeResult } from '../lib/examScoring.js';
import { getPassMarksForTest } from '../lib/admissionTestSettings.js';

export const entranceExamRouter = Router();

const TYPE_DB_TO_UI: Record<TestQuestionType, string> = {
  MULTIPLE_CHOICE: 'Multiple Choice',
  TRUE_FALSE: 'True/False',
  SHORT_ANSWER: 'Short Answer',
};

const VIS_DB_TO_UI: Record<PublicationVisibility, string> = {
  WEB: 'Website',
  APP: 'Mobile App',
  BOTH: 'Website & Mobile App',
};

function serializeGradeResult(grade: ExamGradeResult, testTitle: string, studentName: string) {
  return {
    testTitle,
    studentName,
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
    message: grade.passed
      ? `Congratulations! You passed with ${grade.percent}% (required: ${grade.passMarksRequired}%).`
      : `You scored ${grade.percent}%. Pass marks required: ${grade.passMarksRequired}%.`,
  };
}

function buildResultFromAttempt(
  attempt: {
    score: number | null;
    maxScore: number | null;
    percentScore: number | null;
    passed: boolean | null;
    resultBreakdown: unknown;
    submittedAt: Date | null;
  },
  testTitle: string,
  studentName: string,
  passMarksRequired: number,
) {
  const breakdown = Array.isArray(attempt.resultBreakdown) ? attempt.resultBreakdown : [];
  const percent = attempt.percentScore ?? 0;
  const passed = attempt.passed ?? percent >= passMarksRequired;
  return {
    testTitle,
    studentName,
    score: percent,
    rawScore: attempt.score ?? 0,
    maxScore: attempt.maxScore ?? breakdown.length,
    passed,
    passMarksRequired,
    correctCount: breakdown.filter((b: { status?: string }) => b.status === 'correct').length,
    partialCount: breakdown.filter((b: { status?: string }) => b.status === 'partial').length,
    wrongCount: breakdown.filter((b: { status?: string }) => b.status === 'wrong').length,
    unansweredCount: breakdown.filter((b: { status?: string }) => b.status === 'unanswered').length,
    breakdown,
    submittedAt: attempt.submittedAt?.toISOString() ?? null,
    message: passed
      ? `Congratulations! You passed with ${percent}% (required: ${passMarksRequired}%).`
      : `You scored ${percent}%. Pass marks required: ${passMarksRequired}%.`,
  };
}

entranceExamRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      tokenNumber: z.string().min(4),
      pin: z.string().min(4),
      channel: z.enum(['WEB', 'APP']).optional().default('WEB'),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const credential = await prisma.entranceExamCredential.findUnique({
      where: { tokenNumber: parsed.data.tokenNumber.trim().toUpperCase() },
      include: {
        publication: {
          include: {
            test: { include: { questions: { orderBy: { sortOrder: 'asc' } } } },
          },
        },
        application: true,
        attempt: true,
      },
    });

    if (!credential) return res.status(401).json({ error: 'Invalid token or PIN' });

    const pinOk = await bcrypt.compare(parsed.data.pin, credential.pinHash);
    if (!pinOk) return res.status(401).json({ error: 'Invalid token or PIN' });

    const pub = credential.publication;
    const now = new Date();
    if (pub.scheduledAt.getTime() > now.getTime()) {
      return res.status(403).json({
        error: `Exam opens on ${pub.scheduledAt.toISOString()}`,
      });
    }
    if (credential.expiresAt && credential.expiresAt.getTime() < now.getTime()) {
      return res.status(403).json({ error: 'Exam credentials have expired' });
    }

    const vis = pub.visibleOn;
    if (parsed.data.channel === 'WEB' && vis === PublicationVisibility.APP) {
      return res.status(403).json({ error: 'This exam is only available on the Mobile App' });
    }
    if (parsed.data.channel === 'APP' && vis === PublicationVisibility.WEB) {
      return res.status(403).json({ error: 'This exam is only available on the Website' });
    }

    const passMarks = await getPassMarksForTest(pub.testId, pub.institutionId);

    if (credential.attempt?.submittedAt) {
      return res.json({
        alreadySubmitted: true,
        result: buildResultFromAttempt(
          credential.attempt,
          pub.test.title,
          credential.application.studentName,
          passMarks,
        ),
      });
    }

    let attempt = credential.attempt;
    if (!attempt) {
      attempt = await prisma.entranceExamAttempt.create({
        data: { credentialId: credential.id },
      });
    }

    const sessionToken = signExamToken({
      credentialId: credential.id,
      attemptId: attempt.id,
      testId: pub.testId,
    });

    return res.json({
      sessionToken,
      studentName: credential.application.studentName,
      applicationId: credential.application.applicationId,
      testTitle: pub.test.title,
      durationMinutes: pub.durationMinutes,
      questionCount: pub.test.questions.length,
      scheduledAt: pub.scheduledAt.toISOString(),
      visibleOn: VIS_DB_TO_UI[pub.visibleOn],
      startedAt: attempt.startedAt.toISOString(),
      passMarksRequired: passMarks,
      alreadySubmitted: false,
    });
  }),
);

entranceExamRouter.get(
  '/result',
  requireExamSession,
  asyncHandler(async (req, res) => {
    const attempt = await prisma.entranceExamAttempt.findUnique({
      where: { id: req.examSession!.attemptId },
      include: {
        credential: {
          include: {
            publication: { include: { test: true } },
            application: true,
          },
        },
      },
    });
    if (!attempt?.submittedAt) {
      return res.status(404).json({ error: 'Result not available yet' });
    }

    const pub = attempt.credential.publication;
    const passMarks = await getPassMarksForTest(pub.testId, pub.institutionId);

    return res.json({
      result: buildResultFromAttempt(
        attempt,
        pub.test.title,
        attempt.credential.application.studentName,
        passMarks,
      ),
    });
  }),
);

entranceExamRouter.get(
  '/exam',
  requireExamSession,
  asyncHandler(async (req, res) => {
    const attempt = await prisma.entranceExamAttempt.findUnique({
      where: { id: req.examSession!.attemptId },
      include: {
        credential: {
          include: {
            publication: {
              include: {
                test: { include: { questions: { orderBy: { sortOrder: 'asc' } } } },
              },
            },
            application: true,
          },
        },
      },
    });
    if (!attempt) return res.status(404).json({ error: 'Attempt not found' });
    if (attempt.submittedAt) return res.status(403).json({ error: 'Exam already submitted' });

    const pub = attempt.credential.publication;
    const deadline = new Date(attempt.startedAt.getTime() + pub.durationMinutes * 60_000);
    if (Date.now() > deadline.getTime()) {
      return res.status(403).json({ error: 'Time limit exceeded', expired: true });
    }

    const passMarks = await getPassMarksForTest(pub.testId, pub.institutionId);

    return res.json({
      testTitle: pub.test.title,
      durationMinutes: pub.durationMinutes,
      startedAt: attempt.startedAt.toISOString(),
      deadlineAt: deadline.toISOString(),
      studentName: attempt.credential.application.studentName,
      passMarksRequired: passMarks,
      questions: pub.test.questions.map((q) => ({
        id: q.id,
        sortOrder: q.sortOrder,
        type: TYPE_DB_TO_UI[q.type],
        questionText: q.questionText,
        options: Array.isArray(q.options) ? q.options : [],
      })),
      answers: (attempt.answers as Record<string, string>) || {},
    });
  }),
);

entranceExamRouter.patch(
  '/answers',
  requireExamSession,
  asyncHandler(async (req, res) => {
    const schema = z.object({
      answers: z.record(z.string()),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const attempt = await prisma.entranceExamAttempt.findUnique({
      where: { id: req.examSession!.attemptId },
      include: { credential: { include: { publication: true } } },
    });
    if (!attempt || attempt.submittedAt) {
      return res.status(403).json({ error: 'Cannot update answers' });
    }

    const deadline = new Date(
      attempt.startedAt.getTime() + attempt.credential.publication.durationMinutes * 60_000,
    );
    if (Date.now() > deadline.getTime()) {
      return res.status(403).json({ error: 'Time limit exceeded' });
    }

    const updated = await prisma.entranceExamAttempt.update({
      where: { id: attempt.id },
      data: { answers: parsed.data.answers },
    });

    return res.json({ answers: updated.answers });
  }),
);

entranceExamRouter.post(
  '/submit',
  requireExamSession,
  asyncHandler(async (req, res) => {
    const schema = z.object({
      answers: z.record(z.string()),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const attempt = await prisma.entranceExamAttempt.findUnique({
      where: { id: req.examSession!.attemptId },
      include: {
        credential: {
          include: {
            publication: {
              include: { test: { include: { questions: { orderBy: { sortOrder: 'asc' } } } } },
            },
            application: true,
          },
        },
      },
    });
    if (!attempt) return res.status(404).json({ error: 'Attempt not found' });
    if (attempt.submittedAt) return res.status(403).json({ error: 'Already submitted' });

    const pub = attempt.credential.publication;
    const questions = pub.test.questions;
    const passMarks = await getPassMarksForTest(pub.testId, pub.institutionId);
    const grade = gradeExam(questions, parsed.data.answers, passMarks);

    await prisma.$transaction([
      prisma.entranceExamAttempt.update({
        where: { id: attempt.id },
        data: {
          answers: parsed.data.answers,
          submittedAt: new Date(),
          score: grade.rawScore,
          maxScore: grade.maxScore,
          percentScore: grade.percent,
          passed: grade.passed,
          resultBreakdown: grade.breakdown,
        },
      }),
      prisma.application.update({
        where: { id: attempt.credential.applicationId },
        data: {
          entranceTestScore: grade.percent,
          entranceTestMax: 100,
          status:
            attempt.credential.application.status === ApplicationStatus.PENDING_VERIFICATION
              ? ApplicationStatus.VERIFIED
              : attempt.credential.application.status,
        },
      }),
    ]);

    const result = serializeGradeResult(
      grade,
      pub.test.title,
      attempt.credential.application.studentName,
    );

    return res.json({
      submitted: true,
      ...result,
    });
  }),
);
