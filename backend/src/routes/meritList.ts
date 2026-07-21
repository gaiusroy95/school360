import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { getDefaultInstitutionId } from '../lib/institution.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import {
  getInstitutionPassMarks,
  getPassMarksForTest,
} from '../lib/admissionTestSettings.js';

export const meritListRouter = Router();
meritListRouter.use(requireAuth);

meritListRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      testId: z.string().optional(),
      classApplied: z.string().optional(),
      result: z.enum(['all', 'passed', 'failed', 'pending']).optional().default('all'),
      q: z.string().optional(),
    });
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    const defaultPassMarks = await getInstitutionPassMarks(institutionId);

    const attempts = await prisma.entranceExamAttempt.findMany({
      where: {
        credential: {
          publication: {
            institutionId,
            ...(parsed.data.testId ? { testId: parsed.data.testId } : {}),
          },
          application: {
            ...(parsed.data.classApplied ? { classApplied: parsed.data.classApplied } : {}),
            ...(parsed.data.q
              ? {
                  OR: [
                    { studentName: { contains: parsed.data.q, mode: 'insensitive' } },
                    { applicationId: { contains: parsed.data.q, mode: 'insensitive' } },
                    { email: { contains: parsed.data.q, mode: 'insensitive' } },
                  ],
                }
              : {}),
          },
        },
      },
      include: {
        credential: {
          include: {
            publication: { include: { test: { select: { id: true, title: true, passMarksPercent: true } } } },
            application: {
              select: {
                id: true,
                applicationId: true,
                studentName: true,
                classApplied: true,
                email: true,
                mobile: true,
                status: true,
                entranceTestScore: true,
              },
            },
          },
        },
      },
      orderBy: [{ percentScore: 'desc' }, { submittedAt: 'desc' }],
    });

    const passMarksCache = new Map<string, number>();

    async function resolvePassMarks(testId: string, testPass: number | null): Promise<number> {
      if (testPass != null) return testPass;
      if (passMarksCache.has(testId)) return passMarksCache.get(testId)!;
      const pm = await getPassMarksForTest(testId, institutionId);
      passMarksCache.set(testId, pm);
      return pm;
    }

    const entries = await Promise.all(
      attempts.map(async (attempt) => {
        const app = attempt.credential.application;
        const test = attempt.credential.publication.test;
        const passMarks = await resolvePassMarks(test.id, test.passMarksPercent);
        const submitted = !!attempt.submittedAt;
        const percent = attempt.percentScore ?? attempt.credential.application.entranceTestScore ?? null;
        const passed = submitted
          ? (attempt.passed ?? (percent != null ? percent >= passMarks : false))
          : null;

        return {
          attemptId: attempt.id,
          applicationDbId: app.id,
          applicationId: app.applicationId,
          studentName: app.studentName,
          classApplied: app.classApplied,
          email: app.email,
          mobile: app.mobile,
          applicationStatus: app.status,
          testId: test.id,
          testTitle: test.title,
          scorePercent: percent,
          rawScore: attempt.score,
          maxScore: attempt.maxScore,
          passMarksRequired: passMarks,
          passed,
          submitted,
          submittedAt: attempt.submittedAt?.toISOString() ?? null,
          correctCount: Array.isArray(attempt.resultBreakdown)
            ? (attempt.resultBreakdown as { status?: string }[]).filter((b) => b.status === 'correct').length
            : null,
          partialCount: Array.isArray(attempt.resultBreakdown)
            ? (attempt.resultBreakdown as { status?: string }[]).filter((b) => b.status === 'partial').length
            : null,
          wrongCount: Array.isArray(attempt.resultBreakdown)
            ? (attempt.resultBreakdown as { status?: string }[]).filter((b) => b.status === 'wrong').length
            : null,
        };
      }),
    );

    const filtered = entries.filter((e) => {
      if (parsed.data.result === 'passed') return e.submitted && e.passed === true;
      if (parsed.data.result === 'failed') return e.submitted && e.passed === false;
      if (parsed.data.result === 'pending') return !e.submitted;
      return true;
    });

    const ranked = filtered
      .sort((a, b) => {
        if (a.submitted !== b.submitted) return a.submitted ? -1 : 1;
        return (b.scorePercent ?? -1) - (a.scorePercent ?? -1);
      })
      .map((e, i) => ({ ...e, rank: e.submitted ? i + 1 : null }));

    const submittedEntries = ranked.filter((e) => e.submitted);
    const passedCount = submittedEntries.filter((e) => e.passed).length;
    const failedCount = submittedEntries.filter((e) => e.passed === false).length;

    const tests = await prisma.admissionTest.findMany({
      where: { institutionId, status: 'PUBLISHED' },
      select: { id: true, title: true, passMarksPercent: true },
      orderBy: { updatedAt: 'desc' },
    });

    const classes = [
      ...new Set(entries.map((e) => e.classApplied).filter(Boolean)),
    ].sort();

    return res.json({
      defaultPassMarksPercent: defaultPassMarks,
      summary: {
        totalAssigned: ranked.length,
        submitted: submittedEntries.length,
        pending: ranked.filter((e) => !e.submitted).length,
        passed: passedCount,
        failed: failedCount,
        passRate:
          submittedEntries.length > 0
            ? Math.round((passedCount / submittedEntries.length) * 100)
            : 0,
      },
      tests: tests.map((t) => ({
        id: t.id,
        title: t.title,
        passMarksPercent: t.passMarksPercent ?? defaultPassMarks,
      })),
      classes,
      entries: ranked,
    });
  }),
);
