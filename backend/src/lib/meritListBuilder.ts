import type { ApplicationStatus } from '@prisma/client';
import { prisma } from './prisma.js';
import { getInstitutionPassMarks, getPassMarksForTest } from './admissionTestSettings.js';

export type MeritListEntryRow = {
  attemptId: string;
  applicationDbId: string;
  applicationId: string;
  studentName: string;
  classApplied: string;
  email: string;
  mobile: string;
  applicationStatus: string;
  testId: string;
  testTitle: string;
  scoreSource: 'digital' | 'manual';
  academicSession: string;
  scorePercent: number | null;
  rawScore: number | null;
  maxScore: number | null;
  passMarksRequired: number;
  passed: boolean | null;
  submitted: boolean;
  submittedAt: string | null;
  correctCount: number | null;
  partialCount: number | null;
  wrongCount: number | null;
  meritBadge: 'GOLD' | 'SILVER' | 'BRONZE' | 'NONE' | null;
  teacherName: string | null;
  subjects: Array<{ name: string; maxMarks: number; obtainedMarks: number }> | null;
};

export function academicSessionFromDate(value?: Date | string | null): string {
  if (!value) return 'Unassigned';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return 'Unassigned';
  const y = d.getFullYear();
  const m = d.getMonth();
  if (m >= 3) return `${y}-${String(y + 1).slice(-2)}`;
  return `${y - 1}-${String(y).slice(-2)}`;
}

type BuildMeritListOptions = {
  institutionId: string;
  testId?: string;
  classApplied?: string;
  academicSession?: string;
  result?: 'all' | 'passed' | 'failed' | 'pending';
  q?: string;
};

export async function buildMeritListEntries(opts: BuildMeritListOptions) {
  const defaultPassMarks = await getInstitutionPassMarks(opts.institutionId);
  const passMarksCache = new Map<string, number>();

  async function resolvePassMarks(testId: string, testPass: number | null): Promise<number> {
    if (testPass != null) return testPass;
    if (passMarksCache.has(testId)) return passMarksCache.get(testId)!;
    const pm = await getPassMarksForTest(testId, opts.institutionId);
    passMarksCache.set(testId, pm);
    return pm;
  }

  const applicationSearch =
    opts.q && opts.q.trim()
      ? {
          OR: [
            { studentName: { contains: opts.q.trim(), mode: 'insensitive' as const } },
            { applicationId: { contains: opts.q.trim(), mode: 'insensitive' as const } },
            { email: { contains: opts.q.trim(), mode: 'insensitive' as const } },
          ],
        }
      : {};

  const includeDigital = !opts.testId || opts.testId === 'all' || opts.testId !== 'manual';
  const includeManual = !opts.testId || opts.testId === 'all' || opts.testId === 'manual';

  const digitalEntries: MeritListEntryRow[] = [];

  if (includeDigital) {
    const attempts = await prisma.entranceExamAttempt.findMany({
      where: {
        credential: {
          publication: {
            institutionId: opts.institutionId,
            ...(opts.testId && opts.testId !== 'all' && opts.testId !== 'manual'
              ? { testId: opts.testId }
              : {}),
          },
          application: {
            ...(opts.classApplied ? { classApplied: opts.classApplied } : {}),
            ...applicationSearch,
          },
        },
      },
      include: {
        credential: {
          include: {
            publication: {
              include: {
                test: { select: { id: true, title: true, passMarksPercent: true } },
              },
            },
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
                updatedAt: true,
              },
            },
          },
        },
      },
      orderBy: [{ percentScore: 'desc' }, { submittedAt: 'desc' }],
    });

    for (const attempt of attempts) {
      const app = attempt.credential.application;
      const test = attempt.credential.publication.test;
      const passMarks = await resolvePassMarks(test.id, test.passMarksPercent);
      const submitted = !!attempt.submittedAt;
      const percent = attempt.percentScore ?? app.entranceTestScore ?? null;
      const passed = submitted
        ? (attempt.passed ?? (percent != null ? percent >= passMarks : false))
        : null;
      const submittedAt = attempt.submittedAt ?? app.updatedAt;

      digitalEntries.push({
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
        scoreSource: 'digital',
        academicSession: academicSessionFromDate(submittedAt),
        scorePercent: percent,
        rawScore: attempt.score,
        maxScore: attempt.maxScore,
        passMarksRequired: passMarks,
        passed,
        submitted,
        submittedAt: submittedAt.toISOString(),
        correctCount: Array.isArray(attempt.resultBreakdown)
          ? (attempt.resultBreakdown as { status?: string }[]).filter((b) => b.status === 'correct').length
          : null,
        partialCount: Array.isArray(attempt.resultBreakdown)
          ? (attempt.resultBreakdown as { status?: string }[]).filter((b) => b.status === 'partial').length
          : null,
        wrongCount: Array.isArray(attempt.resultBreakdown)
          ? (attempt.resultBreakdown as { status?: string }[]).filter((b) => b.status === 'wrong').length
          : null,
        meritBadge: null,
        teacherName: null,
        subjects: null,
      });
    }
  }

  const manualEntries: MeritListEntryRow[] = [];

  if (includeManual) {
    const detailedManual = await prisma.manualEntranceTestEntry.findMany({
      where: {
        institutionId: opts.institutionId,
        ...(opts.classApplied ? { classApplied: opts.classApplied } : {}),
        application: {
          status: { not: 'REJECTED' as ApplicationStatus },
          ...applicationSearch,
        },
      },
      include: {
        application: {
          select: {
            id: true,
            applicationId: true,
            studentName: true,
            classApplied: true,
            email: true,
            mobile: true,
            status: true,
            updatedAt: true,
          },
        },
      },
      orderBy: [{ percentScore: 'desc' }, { updatedAt: 'desc' }],
    });

    const detailedAppIds = new Set(detailedManual.map((m) => m.applicationId));

    for (const row of detailedManual) {
      const app = row.application;
      const subjects = Array.isArray(row.subjects)
        ? (row.subjects as Array<{ name: string; maxMarks: number; obtainedMarks: number }>)
        : [];
      const passMarks = defaultPassMarks;
      const passed = row.percentScore >= passMarks;

      manualEntries.push({
        attemptId: `manual-detail-${row.id}`,
        applicationDbId: app.id,
        applicationId: app.applicationId,
        studentName: app.studentName,
        classApplied: row.classApplied || app.classApplied,
        email: app.email,
        mobile: app.mobile,
        applicationStatus: app.status,
        testId: 'manual',
        testTitle: 'Manual Entrance Test',
        scoreSource: 'manual',
        academicSession: row.academicSession || academicSessionFromDate(row.updatedAt),
        scorePercent: row.percentScore,
        rawScore: row.totalObtained,
        maxScore: row.totalMaxMarks,
        passMarksRequired: passMarks,
        passed,
        submitted: true,
        submittedAt: row.updatedAt.toISOString(),
        correctCount: null,
        partialCount: null,
        wrongCount: null,
        meritBadge: row.meritBadge,
        teacherName: row.teacherName,
        subjects,
      });
    }

    const manualApps = await prisma.application.findMany({
      where: {
        institutionId: opts.institutionId,
        entranceTestScore: { not: null },
        status: { not: 'REJECTED' as ApplicationStatus },
        id: { notIn: [...detailedAppIds] },
        ...(opts.classApplied ? { classApplied: opts.classApplied } : {}),
        ...applicationSearch,
        entranceCredentials: {
          none: {
            attempt: { submittedAt: { not: null } },
          },
        },
      },
      select: {
        id: true,
        applicationId: true,
        studentName: true,
        classApplied: true,
        email: true,
        mobile: true,
        status: true,
        entranceTestScore: true,
        entranceTestMax: true,
        updatedAt: true,
        submittedAt: true,
      },
      orderBy: [{ entranceTestScore: 'desc' }, { updatedAt: 'desc' }],
    });

    for (const app of manualApps) {
      const percent = app.entranceTestScore ?? null;
      const passMarks = defaultPassMarks;
      const passed = percent != null ? percent >= passMarks : false;
      const recordedAt = app.updatedAt || app.submittedAt;

      manualEntries.push({
        attemptId: `manual-${app.id}`,
        applicationDbId: app.id,
        applicationId: app.applicationId,
        studentName: app.studentName,
        classApplied: app.classApplied,
        email: app.email,
        mobile: app.mobile,
        applicationStatus: app.status,
        testId: 'manual',
        testTitle: 'Manual Merit Entry',
        scoreSource: 'manual',
        academicSession: academicSessionFromDate(recordedAt),
        scorePercent: percent,
        rawScore: percent,
        maxScore: app.entranceTestMax ?? 100,
        passMarksRequired: passMarks,
        passed,
        submitted: true,
        submittedAt: recordedAt.toISOString(),
        correctCount: null,
        partialCount: null,
        wrongCount: null,
        meritBadge: null,
        teacherName: null,
        subjects: null,
      });
    }
  }

  const combined = [...digitalEntries, ...manualEntries];

  const filtered = combined.filter((e) => {
    if (opts.academicSession && opts.academicSession !== 'all' && e.academicSession !== opts.academicSession) {
      return false;
    }
    if (opts.result === 'passed') return e.submitted && e.passed === true;
    if (opts.result === 'failed') return e.submitted && e.passed === false;
    if (opts.result === 'pending') return !e.submitted;
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
    where: { institutionId: opts.institutionId, status: 'PUBLISHED' },
    select: { id: true, title: true, passMarksPercent: true },
    orderBy: { updatedAt: 'desc' },
  });

  const classes = [...new Set(combined.map((e) => e.classApplied).filter(Boolean))].sort();
  const sessions = [...new Set(combined.map((e) => e.academicSession).filter(Boolean))].sort().reverse();

  return {
    defaultPassMarksPercent: defaultPassMarks,
    summary: {
      totalAssigned: ranked.length,
      submitted: submittedEntries.length,
      pending: ranked.filter((e) => !e.submitted).length,
      passed: passedCount,
      failed: failedCount,
      passRate:
        submittedEntries.length > 0 ? Math.round((passedCount / submittedEntries.length) * 100) : 0,
    },
    tests: [
      { id: 'manual', title: 'Manual Entrance Test', passMarksPercent: defaultPassMarks },
      ...tests.map((t) => ({
        id: t.id,
        title: t.title,
        passMarksPercent: t.passMarksPercent ?? defaultPassMarks,
      })),
    ],
    sessions,
    classes,
    entries: ranked,
  };
}

export async function listMeritCandidatesForSeatAllocation(institutionId: string) {
  const defaultPass = await getInstitutionPassMarks(institutionId);
  const passMarksCache = new Map<string, number>();

  type Candidate = {
    applicationId: string;
    studentName: string;
    classApplied: string;
    score: number;
    submittedAt: Date;
  };

  const byApp = new Map<string, Candidate>();

  const attempts = await prisma.entranceExamAttempt.findMany({
    where: {
      submittedAt: { not: null },
      credential: {
        publication: { institutionId },
        application: { status: { not: 'REJECTED' } },
      },
    },
    include: {
      credential: {
        include: {
          publication: {
            include: { test: { select: { id: true, passMarksPercent: true } } },
          },
          application: true,
        },
      },
    },
  });

  for (const attempt of attempts) {
    const app = attempt.credential.application;
    const test = attempt.credential.publication.test;
    let passMarks = passMarksCache.get(test.id);
    if (passMarks == null) {
      passMarks = test.passMarksPercent ?? (await getPassMarksForTest(test.id, institutionId)) ?? defaultPass;
      passMarksCache.set(test.id, passMarks);
    }
    const percent = attempt.percentScore ?? app.entranceTestScore ?? 0;
    const passed = attempt.passed ?? percent >= passMarks;
    if (!passed) continue;

    const existing = byApp.get(app.id);
    if (!existing || percent > existing.score) {
      byApp.set(app.id, {
        applicationId: app.id,
        studentName: app.studentName,
        classApplied: app.classApplied || 'Unspecified',
        score: percent,
        submittedAt: attempt.submittedAt || new Date(),
      });
    }
  }

  const manualDetailed = await prisma.manualEntranceTestEntry.findMany({
    where: {
      institutionId,
      application: { status: { not: 'REJECTED' } },
    },
    include: { application: true },
  });

  for (const row of manualDetailed) {
    const app = row.application;
    if (row.percentScore < defaultPass) continue;
    const existing = byApp.get(app.id);
    if (!existing || row.percentScore > existing.score) {
      byApp.set(app.id, {
        applicationId: app.id,
        studentName: app.studentName,
        classApplied: row.classApplied || app.classApplied || 'Unspecified',
        score: row.percentScore,
        submittedAt: row.updatedAt || app.submittedAt,
      });
    }
  }

  const manualApps = await prisma.application.findMany({
    where: {
      institutionId,
      entranceTestScore: { not: null },
      status: { not: 'REJECTED' },
      id: { notIn: manualDetailed.map((m) => m.applicationId) },
      entranceCredentials: {
        none: {
          attempt: { submittedAt: { not: null } },
        },
      },
    },
  });

  for (const app of manualApps) {
    const percent = app.entranceTestScore ?? 0;
    if (percent < defaultPass) continue;
    const existing = byApp.get(app.id);
    if (!existing || percent > existing.score) {
      byApp.set(app.id, {
        applicationId: app.id,
        studentName: app.studentName,
        classApplied: app.classApplied || 'Unspecified',
        score: percent,
        submittedAt: app.updatedAt || app.submittedAt,
      });
    }
  }

  return [...byApp.values()].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.submittedAt.getTime() - b.submittedAt.getTime();
  });
}
