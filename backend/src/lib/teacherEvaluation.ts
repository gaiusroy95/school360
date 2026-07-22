import type {
  AcademicTeacherDevCycle,
  AcademicTeacherEvaluation,
  AcademicTeacherEvalStatus,
  AcademicTeacherPerformanceBand,
} from '@prisma/client';
import { prisma } from './prisma.js';
import { formatClassSection } from './students.js';
import { nextAcademicRecordId } from './academicManagement.js';

export const EVAL_DIMENSIONS = [
  { key: 'taskAction', label: 'Action on Assigned Tasks', weight: 0.2 },
  { key: 'improvementPlan', label: 'Class Improvement Plan', weight: 0.2 },
  { key: 'parentEngagement', label: "Parents' Engagements", weight: 0.2 },
  { key: 'parentFeedback', label: 'Parent Feedback on Teaching', weight: 0.2 },
  { key: 'studentFeedback', label: 'Student Feedback (Class 6+)', weight: 0.2 },
] as const;

export const PERFORMANCE_BAND_UI: Record<AcademicTeacherPerformanceBand, string> = {
  EXCELLENT: 'Excellent',
  GOOD: 'Good',
  AVERAGE: 'Average',
  NEEDS_IMPROVEMENT: 'Needs Improvement',
};

export const EVAL_STATUS_UI: Record<AcademicTeacherEvalStatus, string> = {
  DRAFT: 'Draft',
  IN_REVIEW: 'In Review',
  COMPLETED: 'Completed',
  PUBLISHED: 'Published',
};

const BAND_COLORS: Record<AcademicTeacherPerformanceBand, string> = {
  EXCELLENT: '#16a34a',
  GOOD: '#2563eb',
  AVERAGE: '#d97706',
  NEEDS_IMPROVEMENT: '#dc2626',
};

function parseClassNumber(className: string): number | null {
  const s = className.trim().toUpperCase();
  const direct = parseInt(s, 10);
  if (!Number.isNaN(direct)) return direct;
  const match = s.match(/(\d{1,2})/);
  if (match) return parseInt(match[1], 10);
  const roman: Record<string, number> = { VI: 6, VII: 7, VIII: 8, IX: 9, X: 10, XI: 11, XII: 12 };
  for (const [k, v] of Object.entries(roman)) {
    if (s.includes(k)) return v;
  }
  return null;
}

export function computeOverallScore(scores: {
  taskActionScore: number;
  improvementPlanScore: number;
  parentEngagementScore: number;
  parentFeedbackScore: number;
  studentFeedbackScore: number;
}): number {
  const vals = [
    scores.taskActionScore,
    scores.improvementPlanScore,
    scores.parentEngagementScore,
    scores.parentFeedbackScore,
    scores.studentFeedbackScore,
  ];
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  return Math.round(avg * 100) / 100;
}

export function performanceBandFromScore(score: number): AcademicTeacherPerformanceBand {
  if (score >= 85) return 'EXCELLENT';
  if (score >= 70) return 'GOOD';
  if (score >= 55) return 'AVERAGE';
  return 'NEEDS_IMPROVEMENT';
}

function ratingToScore(rating: number): number {
  if (rating <= 0) return 0;
  return Math.min(100, Math.round((rating / 5) * 100));
}

function engagementScore(count: number, completed: number): number {
  if (count === 0) return 0;
  const rate = completed / count;
  return Math.round(rate * 100);
}

export function serializeDevCycle(row: AcademicTeacherDevCycle) {
  return {
    id: row.id,
    recordId: row.recordId,
    academicYear: row.academicYear,
    cycleNumber: row.cycleNumber,
    title: row.title,
    startDate: row.startDate.toISOString(),
    endDate: row.endDate.toISOString(),
    evaluationDueDate: row.evaluationDueDate.toISOString(),
    description: row.description,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    calendarEventId: row.calendarEventId,
    isPublished: !!row.publishedAt,
  };
}

export function serializeEvaluation(row: AcademicTeacherEvaluation & { devCycle?: AcademicTeacherDevCycle | null }) {
  return {
    id: row.id,
    recordId: row.recordId,
    academicYear: row.academicYear,
    devCycleId: row.devCycleId,
    cycleNumber: row.devCycle?.cycleNumber ?? null,
    cycleTitle: row.devCycle?.title ?? '',
    teacherName: row.teacherName,
    department: row.department,
    className: row.className,
    sectionName: row.sectionName,
    subjectName: row.subjectName,
    classGroup: row.className ? formatClassSection(row.className, row.sectionName) : '—',
    taskActionScore: row.taskActionScore,
    taskActionNotes: row.taskActionNotes,
    taskActionEvidence: row.taskActionEvidence,
    improvementPlanScore: row.improvementPlanScore,
    improvementPlanNotes: row.improvementPlanNotes,
    improvementPlanDetails: row.improvementPlanDetails,
    parentEngagementScore: row.parentEngagementScore,
    parentEngagementNotes: row.parentEngagementNotes,
    parentEngagementCount: row.parentEngagementCount,
    parentFeedbackScore: row.parentFeedbackScore,
    parentFeedbackNotes: row.parentFeedbackNotes,
    parentFeedbackCount: row.parentFeedbackCount,
    studentFeedbackScore: row.studentFeedbackScore,
    studentFeedbackNotes: row.studentFeedbackNotes,
    studentFeedbackCount: row.studentFeedbackCount,
    overallScore: row.overallScore,
    performanceBand: row.performanceBand,
    performanceBandLabel: PERFORMANCE_BAND_UI[row.performanceBand],
    performanceBandColor: BAND_COLORS[row.performanceBand],
    status: row.status,
    statusLabel: EVAL_STATUS_UI[row.status],
    evaluatedBy: row.evaluatedBy,
    evaluatedAt: row.evaluatedAt?.toISOString() ?? null,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    isPublished: !!row.publishedAt,
    dimensions: EVAL_DIMENSIONS.map((d) => ({
      key: d.key,
      label: d.label,
      weight: d.weight,
      score: row[`${d.key}Score` as keyof AcademicTeacherEvaluation] as number,
    })),
  };
}

function defaultCycleDates(academicYear: string, cycleNumber: number) {
  const startYear = parseInt(academicYear.split('-')[0] || '2025', 10);
  const slots = [
    { start: [3, 1], end: [5, 31], due: [6, 15] },
    { start: [6, 1], end: [8, 31], due: [9, 15] },
    { start: [9, 1], end: [11, 30], due: [12, 15] },
    { start: [0, 1], end: [1, 28], due: [2, 15] },
    { start: [2, 1], end: [2, 31], due: [3, 15] },
  ];
  const slot = slots[cycleNumber - 1] || slots[0];
  const yearOffset = cycleNumber >= 4 ? 1 : 0;
  const y = startYear + yearOffset;
  const start = new Date(y, slot.start[0], slot.start[1]);
  const end = new Date(y, slot.end[0], slot.end[1], 23, 59, 59);
  const due = new Date(y + (cycleNumber === 5 ? 1 : 0), slot.due[0], slot.due[1]);
  return { start, end, due };
}

export async function ensureTeacherDevCycles(institutionId: string, academicYear: string) {
  const existing = await prisma.academicTeacherDevCycle.count({ where: { institutionId, academicYear } });
  if (existing >= 5) return;

  for (let i = 1; i <= 5; i++) {
    const found = await prisma.academicTeacherDevCycle.findFirst({
      where: { institutionId, academicYear, cycleNumber: i },
    });
    if (found) continue;
    const { start, end, due } = defaultCycleDates(academicYear, i);
    await prisma.academicTeacherDevCycle.create({
      data: {
        institutionId,
        recordId: await nextAcademicRecordId(institutionId, 'teacherDevCycle'),
        academicYear,
        cycleNumber: i,
        title: `Teacher Development Plan — Cycle ${i}`,
        startDate: start,
        endDate: end,
        evaluationDueDate: due,
        description: `Continuous evaluation cycle ${i} of 5 for academic year ${academicYear}.`,
      },
    });
  }
}

export async function listTeacherDevCycles(institutionId: string, academicYear: string) {
  await ensureTeacherDevCycles(institutionId, academicYear);
  const rows = await prisma.academicTeacherDevCycle.findMany({
    where: { institutionId, academicYear },
    orderBy: { cycleNumber: 'asc' },
  });
  return rows.map(serializeDevCycle);
}

export async function upsertTeacherDevCycle(
  institutionId: string,
  data: {
    id?: string;
    academicYear: string;
    cycleNumber: number;
    title: string;
    startDate: string;
    endDate: string;
    evaluationDueDate: string;
    description?: string;
  },
) {
  if (data.id) {
    const row = await prisma.academicTeacherDevCycle.update({
      where: { id: data.id },
      data: {
        title: data.title,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        evaluationDueDate: new Date(data.evaluationDueDate),
        description: data.description || '',
      },
    });
    return serializeDevCycle(row);
  }

  const existing = await prisma.academicTeacherDevCycle.findFirst({
    where: { institutionId, academicYear: data.academicYear, cycleNumber: data.cycleNumber },
  });
  if (existing) {
    const row = await prisma.academicTeacherDevCycle.update({
      where: { id: existing.id },
      data: {
        title: data.title,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        evaluationDueDate: new Date(data.evaluationDueDate),
        description: data.description || '',
      },
    });
    return serializeDevCycle(row);
  }

  const row = await prisma.academicTeacherDevCycle.create({
    data: {
      institutionId,
      recordId: await nextAcademicRecordId(institutionId, 'teacherDevCycle'),
      academicYear: data.academicYear,
      cycleNumber: data.cycleNumber,
      title: data.title,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      evaluationDueDate: new Date(data.evaluationDueDate),
      description: data.description || '',
    },
  });
  return serializeDevCycle(row);
}

async function syncFeedbackForSlot(
  institutionId: string,
  slot: { className: string; sectionName: string },
  cycle: AcademicTeacherDevCycle,
) {
  const students = await prisma.student.findMany({
    where: {
      institutionId,
      className: slot.className,
      sectionName: slot.sectionName,
      status: 'ACTIVE',
    },
    select: { id: true, className: true },
  });
  const studentIds = students.map((s) => s.id);
  if (studentIds.length === 0) {
    return {
      parentEngagementCount: 0,
      parentEngagementScore: 0,
      parentEngagementNotes: 'No students in class.',
      parentFeedbackCount: 0,
      parentFeedbackScore: 0,
      parentFeedbackNotes: '',
      studentFeedbackCount: 0,
      studentFeedbackScore: 0,
      studentFeedbackNotes: '',
    };
  }

  const engagements = await prisma.parentEngagementEvent.findMany({
    where: {
      institutionId,
      studentId: { in: studentIds },
      plannedAt: { gte: cycle.startDate, lte: cycle.endDate },
    },
  });
  const completed = engagements.filter((e) => e.status === 'COMPLETED').length;
  const engagementNotes = engagements
    .filter((e) => e.actionsTaken || e.outcome)
    .slice(0, 3)
    .map((e) => `${e.title}: ${e.actionsTaken || e.outcome}`)
    .join('; ');

  const feedbacks = await prisma.parentFeedback.findMany({
    where: {
      institutionId,
      studentId: { in: studentIds },
      submittedAt: { gte: cycle.startDate, lte: cycle.endDate },
      OR: [
        { category: { contains: 'teach', mode: 'insensitive' } },
        { category: { contains: 'teacher', mode: 'insensitive' } },
        { message: { contains: 'teach', mode: 'insensitive' } },
      ],
    },
  });

  const parentRatings = feedbacks.map((f) => f.rating).filter((r) => r > 0);
  const parentAvg = parentRatings.length
    ? parentRatings.reduce((a, b) => a + b, 0) / parentRatings.length
    : 0;

  const classNum = parseClassNumber(slot.className);
  const seniorStudents = students.filter((s) => {
    const n = parseClassNumber(s.className);
    return n !== null && n >= 6;
  });
  const seniorIds = new Set(seniorStudents.map((s) => s.id));

  const studentFeedbacks = await prisma.parentFeedback.findMany({
    where: {
      institutionId,
      studentId: { in: [...seniorIds] },
      submittedAt: { gte: cycle.startDate, lte: cycle.endDate },
      source: { contains: 'student', mode: 'insensitive' },
    },
  });
  const studentEngNotes = engagements
    .filter((e) => seniorIds.has(e.studentId) && e.studentFeedbackNotes)
    .map((e) => e.studentFeedbackNotes)
    .slice(0, 3);

  const studentRatings = studentFeedbacks.map((f) => f.rating).filter((r) => r > 0);
  const studentAvg = studentRatings.length
    ? studentRatings.reduce((a, b) => a + b, 0) / studentRatings.length
    : 0;

  return {
    parentEngagementCount: engagements.length,
    parentEngagementScore: engagementScore(engagements.length, completed),
    parentEngagementNotes: engagementNotes || `${completed}/${engagements.length} engagements completed in cycle.`,
    parentFeedbackCount: feedbacks.length,
    parentFeedbackScore: ratingToScore(parentAvg),
    parentFeedbackNotes: feedbacks.slice(0, 2).map((f) => f.message).filter(Boolean).join(' | '),
    studentFeedbackCount: studentFeedbacks.length + studentEngNotes.length,
    studentFeedbackScore: ratingToScore(studentAvg),
    studentFeedbackNotes:
      classNum !== null && classNum < 6
        ? 'Student feedback applies to Class 6 and above only.'
        : studentEngNotes.join(' | ') || studentFeedbacks.slice(0, 2).map((f) => f.message).filter(Boolean).join(' | '),
  };
}

export async function syncEvaluationFeedback(institutionId: string, evaluationId: string) {
  const row = await prisma.academicTeacherEvaluation.findFirst({
    where: { id: evaluationId, institutionId },
    include: { devCycle: true },
  });
  if (!row || !row.devCycle) throw new Error('Evaluation not found');

  const synced = await syncFeedbackForSlot(
    institutionId,
    { className: row.className, sectionName: row.sectionName },
    row.devCycle,
  );

  const overallScore = computeOverallScore({
    taskActionScore: row.taskActionScore,
    improvementPlanScore: row.improvementPlanScore,
    parentEngagementScore: synced.parentEngagementScore,
    parentFeedbackScore: synced.parentFeedbackScore,
    studentFeedbackScore: synced.studentFeedbackScore,
  });

  const updated = await prisma.academicTeacherEvaluation.update({
    where: { id: row.id },
    data: {
      ...synced,
      overallScore,
      performanceBand: performanceBandFromScore(overallScore),
    },
    include: { devCycle: true },
  });
  return serializeEvaluation(updated);
}

export async function listTeacherEvaluations(
  institutionId: string,
  opts: { academicYear?: string; devCycleId?: string; teacherName?: string; status?: string },
) {
  const rows = await prisma.academicTeacherEvaluation.findMany({
    where: {
      institutionId,
      ...(opts.academicYear ? { academicYear: opts.academicYear } : {}),
      ...(opts.devCycleId ? { devCycleId: opts.devCycleId } : {}),
      ...(opts.teacherName ? { teacherName: { contains: opts.teacherName, mode: 'insensitive' } } : {}),
      ...(opts.status ? { status: opts.status as AcademicTeacherEvalStatus } : {}),
    },
    include: { devCycle: true },
    orderBy: [{ overallScore: 'desc' }, { teacherName: 'asc' }],
  });
  return rows.map(serializeEvaluation);
}

export async function getTeacherEvaluationDashboard(
  institutionId: string,
  academicYear: string,
  devCycleId?: string,
) {
  await ensureTeacherDevCycles(institutionId, academicYear);
  const cycles = await listTeacherDevCycles(institutionId, academicYear);
  const activeCycleId = devCycleId || cycles.find((c) => !c.isPublished)?.id || cycles[cycles.length - 1]?.id;

  const evaluations = await listTeacherEvaluations(institutionId, {
    academicYear,
    devCycleId: activeCycleId,
  });

  const completed = evaluations.filter((e) => e.status === 'COMPLETED' || e.status === 'PUBLISHED').length;
  const published = evaluations.filter((e) => e.isPublished).length;
  const avgScore = evaluations.length
    ? Math.round((evaluations.reduce((a, e) => a + e.overallScore, 0) / evaluations.length) * 100) / 100
    : 0;

  const bandDist = evaluations.reduce(
    (acc, e) => {
      acc[e.performanceBand] = (acc[e.performanceBand] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const teachers = await prisma.academicTeacherAllocation.findMany({
    where: { institutionId, academicYear },
    select: { teacherName: true, department: true },
    distinct: ['teacherName'],
  });

  return {
    academicYear,
    cycles,
    activeCycleId,
    kpis: {
      totalTeachers: teachers.length,
      evaluationsRecorded: evaluations.length,
      completed,
      published,
      averageScore: avgScore,
      pending: Math.max(0, teachers.length - evaluations.length),
    },
    bandDistribution: Object.entries(bandDist).map(([band, count]) => ({
      band,
      label: PERFORMANCE_BAND_UI[band as AcademicTeacherPerformanceBand] || band,
      count,
    })),
    evaluations,
  };
}

export async function bulkGenerateEvaluations(institutionId: string, devCycleId: string) {
  const cycle = await prisma.academicTeacherDevCycle.findFirst({
    where: { id: devCycleId, institutionId },
  });
  if (!cycle) throw new Error('Development cycle not found');

  const allocations = await prisma.academicTeacherAllocation.findMany({
    where: { institutionId, academicYear: cycle.academicYear },
    orderBy: [{ teacherName: 'asc' }, { className: 'asc' }],
  });

  let created = 0;
  for (const a of allocations) {
    const exists = await prisma.academicTeacherEvaluation.findFirst({
      where: {
        institutionId,
        devCycleId,
        teacherName: a.teacherName,
        className: a.className,
        sectionName: a.sectionName,
        subjectName: a.subjectName,
      },
    });
    if (exists) continue;

    const synced = await syncFeedbackForSlot(
      institutionId,
      { className: a.className, sectionName: a.sectionName },
      cycle,
    );

    await prisma.academicTeacherEvaluation.create({
      data: {
        institutionId,
        recordId: await nextAcademicRecordId(institutionId, 'teacherEval'),
        academicYear: cycle.academicYear,
        devCycleId: cycle.id,
        teacherName: a.teacherName,
        department: a.department,
        className: a.className,
        sectionName: a.sectionName,
        subjectName: a.subjectName,
        ...synced,
        overallScore: computeOverallScore({
          taskActionScore: 0,
          improvementPlanScore: 0,
          parentEngagementScore: synced.parentEngagementScore,
          parentFeedbackScore: synced.parentFeedbackScore,
          studentFeedbackScore: synced.studentFeedbackScore,
        }),
        performanceBand: 'AVERAGE',
        status: 'DRAFT',
      },
    });
    created += 1;
  }

  return { created, total: allocations.length };
}

type EvalInput = {
  devCycleId: string;
  teacherName: string;
  department?: string;
  className?: string;
  sectionName?: string;
  subjectName?: string;
  taskActionScore?: number;
  taskActionNotes?: string;
  taskActionEvidence?: string;
  improvementPlanScore?: number;
  improvementPlanNotes?: string;
  improvementPlanDetails?: string;
  parentEngagementScore?: number;
  parentEngagementNotes?: string;
  parentEngagementCount?: number;
  parentFeedbackScore?: number;
  parentFeedbackNotes?: string;
  parentFeedbackCount?: number;
  studentFeedbackScore?: number;
  studentFeedbackNotes?: string;
  studentFeedbackCount?: number;
  status?: AcademicTeacherEvalStatus;
  evaluatedBy?: string;
};

function buildEvalScores(data: EvalInput) {
  const scores = {
    taskActionScore: data.taskActionScore ?? 0,
    improvementPlanScore: data.improvementPlanScore ?? 0,
    parentEngagementScore: data.parentEngagementScore ?? 0,
    parentFeedbackScore: data.parentFeedbackScore ?? 0,
    studentFeedbackScore: data.studentFeedbackScore ?? 0,
  };
  const overallScore = computeOverallScore(scores);
  return { ...scores, overallScore, performanceBand: performanceBandFromScore(overallScore) };
}

export async function createTeacherEvaluation(institutionId: string, data: EvalInput) {
  const cycle = await prisma.academicTeacherDevCycle.findFirst({
    where: { id: data.devCycleId, institutionId },
  });
  if (!cycle) throw new Error('Development cycle not found');

  const scores = buildEvalScores(data);
  const row = await prisma.academicTeacherEvaluation.create({
    data: {
      institutionId,
      recordId: await nextAcademicRecordId(institutionId, 'teacherEval'),
      academicYear: cycle.academicYear,
      devCycleId: data.devCycleId,
      teacherName: data.teacherName,
      department: data.department || 'General',
      className: data.className || '',
      sectionName: data.sectionName || '',
      subjectName: data.subjectName || '',
      taskActionNotes: data.taskActionNotes || '',
      taskActionEvidence: data.taskActionEvidence || '',
      improvementPlanNotes: data.improvementPlanNotes || '',
      improvementPlanDetails: data.improvementPlanDetails || '',
      parentEngagementNotes: data.parentEngagementNotes || '',
      parentEngagementCount: data.parentEngagementCount ?? 0,
      parentFeedbackNotes: data.parentFeedbackNotes || '',
      parentFeedbackCount: data.parentFeedbackCount ?? 0,
      studentFeedbackNotes: data.studentFeedbackNotes || '',
      studentFeedbackCount: data.studentFeedbackCount ?? 0,
      status: data.status || 'DRAFT',
      evaluatedBy: data.evaluatedBy || '',
      evaluatedAt: data.status === 'COMPLETED' || data.status === 'PUBLISHED' ? new Date() : null,
      ...scores,
    },
    include: { devCycle: true },
  });
  return serializeEvaluation(row);
}

export async function updateTeacherEvaluation(institutionId: string, id: string, data: Partial<EvalInput>) {
  const existing = await prisma.academicTeacherEvaluation.findFirst({ where: { id, institutionId } });
  if (!existing) throw new Error('Evaluation not found');

  const merged = {
    taskActionScore: data.taskActionScore ?? existing.taskActionScore,
    improvementPlanScore: data.improvementPlanScore ?? existing.improvementPlanScore,
    parentEngagementScore: data.parentEngagementScore ?? existing.parentEngagementScore,
    parentFeedbackScore: data.parentFeedbackScore ?? existing.parentFeedbackScore,
    studentFeedbackScore: data.studentFeedbackScore ?? existing.studentFeedbackScore,
  };
  const overallScore = computeOverallScore(merged);

  const row = await prisma.academicTeacherEvaluation.update({
    where: { id },
    data: {
      ...(data.teacherName !== undefined ? { teacherName: data.teacherName } : {}),
      ...(data.department !== undefined ? { department: data.department } : {}),
      ...(data.className !== undefined ? { className: data.className } : {}),
      ...(data.sectionName !== undefined ? { sectionName: data.sectionName } : {}),
      ...(data.subjectName !== undefined ? { subjectName: data.subjectName } : {}),
      ...(data.taskActionScore !== undefined ? { taskActionScore: data.taskActionScore } : {}),
      ...(data.taskActionNotes !== undefined ? { taskActionNotes: data.taskActionNotes } : {}),
      ...(data.taskActionEvidence !== undefined ? { taskActionEvidence: data.taskActionEvidence } : {}),
      ...(data.improvementPlanScore !== undefined ? { improvementPlanScore: data.improvementPlanScore } : {}),
      ...(data.improvementPlanNotes !== undefined ? { improvementPlanNotes: data.improvementPlanNotes } : {}),
      ...(data.improvementPlanDetails !== undefined ? { improvementPlanDetails: data.improvementPlanDetails } : {}),
      ...(data.parentEngagementScore !== undefined ? { parentEngagementScore: data.parentEngagementScore } : {}),
      ...(data.parentEngagementNotes !== undefined ? { parentEngagementNotes: data.parentEngagementNotes } : {}),
      ...(data.parentEngagementCount !== undefined ? { parentEngagementCount: data.parentEngagementCount } : {}),
      ...(data.parentFeedbackScore !== undefined ? { parentFeedbackScore: data.parentFeedbackScore } : {}),
      ...(data.parentFeedbackNotes !== undefined ? { parentFeedbackNotes: data.parentFeedbackNotes } : {}),
      ...(data.parentFeedbackCount !== undefined ? { parentFeedbackCount: data.parentFeedbackCount } : {}),
      ...(data.studentFeedbackScore !== undefined ? { studentFeedbackScore: data.studentFeedbackScore } : {}),
      ...(data.studentFeedbackNotes !== undefined ? { studentFeedbackNotes: data.studentFeedbackNotes } : {}),
      ...(data.studentFeedbackCount !== undefined ? { studentFeedbackCount: data.studentFeedbackCount } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.evaluatedBy !== undefined ? { evaluatedBy: data.evaluatedBy } : {}),
      overallScore,
      performanceBand: performanceBandFromScore(overallScore),
      evaluatedAt:
        data.status === 'COMPLETED' || data.status === 'PUBLISHED'
          ? new Date()
          : existing.evaluatedAt,
    },
    include: { devCycle: true },
  });
  return serializeEvaluation(row);
}

export async function publishTeacherDevCyclesToCalendar(institutionId: string, academicYear: string) {
  const cycles = await prisma.academicTeacherDevCycle.findMany({
    where: { institutionId, academicYear },
    orderBy: { cycleNumber: 'asc' },
  });
  const now = new Date();
  let published = 0;

  for (const cycle of cycles) {
    let calendarEventId = cycle.calendarEventId;
    if (!calendarEventId) {
      const event = await prisma.academicCalendarEvent.create({
        data: {
          institutionId,
          recordId: await nextAcademicRecordId(institutionId, 'calendar'),
          academicYear,
          term: `Cycle ${cycle.cycleNumber}`,
          boardName: 'All Boards',
          title: cycle.title,
          eventType: 'ACTIVITY',
          eventDate: cycle.evaluationDueDate,
          endDate: cycle.endDate,
          description: cycle.description || `Teacher development & continuous evaluation — Cycle ${cycle.cycleNumber}.`,
          sharedToParents: false,
          publishedAt: now,
          eventSource: 'MANUAL',
        },
      });
      calendarEventId = event.id;
    }

    await prisma.academicTeacherDevCycle.update({
      where: { id: cycle.id },
      data: { publishedAt: now, calendarEventId },
    });
    published += 1;
  }

  return { published, publishedAt: now.toISOString() };
}

export async function publishTeacherEvaluations(
  institutionId: string,
  opts: { academicYear: string; devCycleId?: string },
) {
  const now = new Date();
  const result = await prisma.academicTeacherEvaluation.updateMany({
    where: {
      institutionId,
      academicYear: opts.academicYear,
      status: 'COMPLETED',
      publishedAt: null,
      ...(opts.devCycleId ? { devCycleId: opts.devCycleId } : {}),
    },
    data: { publishedAt: now, status: 'PUBLISHED' },
  });
  return { published: result.count, publishedAt: now.toISOString() };
}

export async function getMobileTeacherEvaluations(
  institutionId: string,
  teacherName: string,
  academicYear?: string,
) {
  const rows = await prisma.academicTeacherEvaluation.findMany({
    where: {
      institutionId,
      teacherName: { equals: teacherName, mode: 'insensitive' },
      publishedAt: { not: null },
      ...(academicYear ? { academicYear } : {}),
    },
    include: { devCycle: true },
    orderBy: [{ academicYear: 'desc' }, { createdAt: 'desc' }],
  });
  return rows.map(serializeEvaluation);
}
