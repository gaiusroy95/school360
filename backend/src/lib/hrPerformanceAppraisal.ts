import { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { seedHrAttendanceLeaveDemo } from './hrAttendanceLeave.js';

export const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'] as const;
export const WORKFLOW_STAGES = ['SELF', 'MANAGER', 'HOD', 'PRINCIPAL', 'HR', 'MANAGEMENT', 'FINAL'] as const;

export const KPI_CATEGORIES = [
  'Academic', 'Discipline', 'Attendance', 'Administration',
  'Parent Satisfaction', 'Student Development', 'Innovation',
] as const;

export const DEFAULT_PAY_GRADES = [
  { code: 'PG-01', name: 'Trainee', level: 1, minSalary: 12000, maxSalary: 18000 },
  { code: 'PG-02', name: 'Junior Assistant', level: 2, minSalary: 15000, maxSalary: 22000 },
  { code: 'PG-03', name: 'Assistant', level: 3, minSalary: 18000, maxSalary: 28000 },
  { code: 'PG-04', name: 'Senior Assistant', level: 4, minSalary: 22000, maxSalary: 35000 },
  { code: 'PG-05', name: 'Executive', level: 5, minSalary: 28000, maxSalary: 42000 },
  { code: 'PG-06', name: 'Senior Executive', level: 6, minSalary: 35000, maxSalary: 52000 },
  { code: 'PG-07', name: 'Officer', level: 7, minSalary: 42000, maxSalary: 62000 },
  { code: 'PG-08', name: 'Senior Officer', level: 8, minSalary: 50000, maxSalary: 75000 },
  { code: 'PG-09', name: 'Assistant Manager', level: 9, minSalary: 60000, maxSalary: 90000 },
  { code: 'PG-10', name: 'Deputy Manager', level: 10, minSalary: 75000, maxSalary: 110000 },
  { code: 'PG-11', name: 'Manager', level: 11, minSalary: 90000, maxSalary: 140000 },
  { code: 'PG-12', name: 'Senior Manager', level: 12, minSalary: 110000, maxSalary: 170000 },
  { code: 'PG-13', name: 'AGM', level: 13, minSalary: 140000, maxSalary: 200000 },
  { code: 'PG-14', name: 'DGM', level: 14, minSalary: 170000, maxSalary: 240000 },
  { code: 'PG-15', name: 'General Manager', level: 15, minSalary: 200000, maxSalary: 300000 },
  { code: 'PG-16', name: 'Director', level: 16, minSalary: 250000, maxSalary: 400000 },
  { code: 'PG-17', name: 'Executive Director', level: 17, minSalary: 350000, maxSalary: 550000 },
  { code: 'PG-18', name: 'Principal', level: 18, minSalary: 400000, maxSalary: 700000 },
  { code: 'PG-19', name: 'Group Principal', level: 19, minSalary: 550000, maxSalary: 900000 },
  { code: 'PG-20', name: 'CEO / Trustee', level: 20, minSalary: 800000, maxSalary: 1500000 },
];

const DEFAULT_KPIS = [
  { category: 'Academic', code: 'KPI-RES', name: 'Student Result %', staffType: 'TEACHING', weight: 10 },
  { category: 'Academic', code: 'KPI-PASS', name: 'Subject Pass %', staffType: 'TEACHING', weight: 8 },
  { category: 'Discipline', code: 'KPI-BEH', name: 'Student Behaviour', staffType: 'TEACHING', weight: 6 },
  { category: 'Attendance', code: 'KPI-ATT', name: 'Employee Attendance', staffType: 'ALL', weight: 10 },
  { category: 'Attendance', code: 'KPI-PUN', name: 'Punctuality', staffType: 'ALL', weight: 5 },
  { category: 'Administration', code: 'KPI-ERP', name: 'ERP Usage', staffType: 'ALL', weight: 5 },
  { category: 'Parent Satisfaction', code: 'KPI-PTM', name: 'PTM Feedback', staffType: 'TEACHING', weight: 8 },
  { category: 'Innovation', code: 'KPI-DIG', name: 'Digital Learning', staffType: 'TEACHING', weight: 5 },
  { category: 'Administration', code: 'KPI-DOC', name: 'Documentation', staffType: 'NON_TEACHING', weight: 10 },
  { category: 'Administration', code: 'KPI-PROD', name: 'Productivity', staffType: 'NON_TEACHING', weight: 12 },
];

function parseJson<T>(raw: unknown, fallback: T): T {
  if (raw === null || raw === undefined) return fallback;
  return raw as T;
}

function academicYearStart(academicYear: string): number {
  const m = academicYear.match(/^(\d{4})/);
  return m ? parseInt(m[1], 10) : new Date().getFullYear();
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatDisplayDate(d: Date): string {
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function ratingBandFromScore(score: number): string {
  if (score >= 90) return 'Outstanding';
  if (score >= 80) return 'Exceeds Expectations';
  if (score >= 70) return 'Meets Expectations';
  if (score >= 60) return 'Needs Improvement';
  return 'Unsatisfactory';
}

export function outcomeFromScore(score: number): string {
  if (score >= 90) return 'Promotion Ready';
  if (score >= 80) return 'Good';
  if (score >= 70) return 'Average';
  if (score >= 60) return 'Needs Improvement';
  return 'PIP Required';
}

type Weightage = {
  kpi: number; competency: number; attendance: number; behaviour: number;
  feedback: number; innovation: number; training: number;
};

export function computeWeightedScore(scores: Partial<Weightage & {
  kpiScore: number; competencyScore: number; attendanceScore: number;
  behaviourScore: number; feedbackScore: number; innovationScore: number; trainingScore: number;
}>, weightage: Weightage): number {
  const total =
    (scores.kpiScore ?? 0) * weightage.kpi / 100 +
    (scores.competencyScore ?? 0) * weightage.competency / 100 +
    (scores.attendanceScore ?? 0) * weightage.attendance / 100 +
    (scores.behaviourScore ?? 0) * weightage.behaviour / 100 +
    (scores.feedbackScore ?? 0) * weightage.feedback / 100 +
    (scores.innovationScore ?? 0) * weightage.innovation / 100 +
    (scores.trainingScore ?? 0) * weightage.training / 100;
  return Math.round(total * 100) / 100;
}

export function computeTeachingScore(scores: {
  taskActionScore: number; improvementScore: number; parentEngScore: number;
  parentFbScore: number; studentFbScore: number;
}): number {
  const vals = [scores.taskActionScore, scores.improvementScore, scores.parentEngScore, scores.parentFbScore, scores.studentFbScore];
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
}

async function ensureSettings(institutionId: string) {
  let row = await prisma.hrPerformanceSettings.findUnique({ where: { institutionId } });
  if (!row) {
    row = await prisma.hrPerformanceSettings.create({ data: { institutionId } });
  }
  return row;
}

async function ensurePayGrades(institutionId: string) {
  const count = await prisma.hrPayGrade.count({ where: { institutionId } });
  if (count > 0) return prisma.hrPayGrade.findMany({ where: { institutionId }, orderBy: { level: 'asc' } });
  for (const g of DEFAULT_PAY_GRADES) {
    await prisma.hrPayGrade.create({
      data: { institutionId, ...g, description: `${g.name} pay grade` },
    });
  }
  return prisma.hrPayGrade.findMany({ where: { institutionId }, orderBy: { level: 'asc' } });
}

async function ensureKpis(institutionId: string) {
  const count = await prisma.hrPerformanceKpi.count({ where: { institutionId } });
  if (count > 0) return prisma.hrPerformanceKpi.findMany({ where: { institutionId }, orderBy: { category: 'asc' } });
  for (const k of DEFAULT_KPIS) {
    await prisma.hrPerformanceKpi.create({ data: { institutionId, ...k } });
  }
  return prisma.hrPerformanceKpi.findMany({ where: { institutionId }, orderBy: { category: 'asc' } });
}

export async function ensurePerformanceCycles(institutionId: string, academicYear: string) {
  const existing = await prisma.hrPerformanceCycle.findMany({
    where: { institutionId, academicYear },
    orderBy: { cycleNumber: 'asc' },
  });
  if (existing.length >= 4) return existing;

  const startYear = academicYearStart(academicYear);
  const defs = [
    { cycleType: 'Q1', cycleNumber: 1, name: 'Quarter 1 Appraisal', periodStart: new Date(startYear, 3, 1), periodEnd: new Date(startYear, 5, 30), reviewDueDate: new Date(startYear, 6, 15) },
    { cycleType: 'Q2', cycleNumber: 2, name: 'Quarter 2 Appraisal', periodStart: new Date(startYear, 6, 1), periodEnd: new Date(startYear, 8, 30), reviewDueDate: new Date(startYear, 9, 15) },
    { cycleType: 'Q3', cycleNumber: 3, name: 'Quarter 3 Appraisal', periodStart: new Date(startYear, 9, 1), periodEnd: new Date(startYear, 11, 31), reviewDueDate: new Date(startYear + 1, 0, 15) },
    { cycleType: 'Q4', cycleNumber: 4, name: 'Quarter 4 Appraisal', periodStart: new Date(startYear + 1, 0, 1), periodEnd: new Date(startYear + 1, 2, 31), reviewDueDate: new Date(startYear + 1, 3, 15) },
  ];

  for (const d of defs) {
    await prisma.hrPerformanceCycle.upsert({
      where: { institutionId_academicYear_cycleType: { institutionId, academicYear, cycleType: d.cycleType } },
      create: { institutionId, academicYear, ...d },
      update: {},
    });
  }

  return prisma.hrPerformanceCycle.findMany({
    where: { institutionId, academicYear },
    orderBy: { cycleNumber: 'asc' },
  });
}

function serializeAppraisal(row: {
  id: string; employeeId: string; academicYear: string; quarter: string; staffType: string;
  classSubject: string; kpiScore: number; competencyScore: number; attendanceScore: number;
  behaviourScore: number; feedbackScore: number; innovationScore: number; trainingScore: number;
  taskActionScore: number; improvementScore: number; parentEngScore: number; parentFbScore: number;
  studentFbScore: number; overallScore: number; ratingBand: string; outcome: string;
  workflowStage: string; status: string; publishedToMobile: boolean;
  employee: { fullName: string; employeeCode: string; department: string; designation: string };
}) {
  return {
    id: row.id,
    employeeId: row.employeeId,
    employeeName: row.employee.fullName,
    employeeCode: row.employee.employeeCode,
    department: row.employee.department,
    designation: row.employee.designation,
    academicYear: row.academicYear,
    quarter: row.quarter,
    staffType: row.staffType,
    classSubject: row.classSubject,
    kpiScore: row.kpiScore,
    competencyScore: row.competencyScore,
    attendanceScore: row.attendanceScore,
    behaviourScore: row.behaviourScore,
    feedbackScore: row.feedbackScore,
    innovationScore: row.innovationScore,
    trainingScore: row.trainingScore,
    taskActionScore: row.taskActionScore,
    improvementScore: row.improvementScore,
    parentEngScore: row.parentEngScore,
    parentFbScore: row.parentFbScore,
    studentFbScore: row.studentFbScore,
    overallScore: row.overallScore,
    ratingBand: row.ratingBand,
    outcome: row.outcome,
    workflowStage: row.workflowStage,
    status: row.status,
    publishedToMobile: row.publishedToMobile,
  };
}

export async function getPerformanceAppraisalDashboard(
  institutionId: string,
  opts: { academicYear?: string; quarter?: string } = {},
) {
  const academicYear = opts.academicYear ?? '2025-26';
  const quarter = opts.quarter ?? 'Q1';

  const [settings, cycles, kpis, payGrades, employees] = await Promise.all([
    ensureSettings(institutionId),
    ensurePerformanceCycles(institutionId, academicYear),
    ensureKpis(institutionId),
    ensurePayGrades(institutionId),
    prisma.payrollEmployee.findMany({
      where: { institutionId, status: 'ACTIVE' },
      select: { id: true, employeeCode: true, fullName: true, department: true, designation: true, employmentType: true },
      orderBy: { fullName: 'asc' },
    }),
  ]);

  const selectedCycle = cycles.find((c) => c.cycleType === quarter) ?? cycles[0];

  const appraisals = selectedCycle
    ? await prisma.hrPerformanceAppraisal.findMany({
        where: { institutionId, cycleId: selectedCycle.id },
        include: { employee: { select: { fullName: true, employeeCode: true, department: true, designation: true } } },
        orderBy: { employee: { fullName: 'asc' } },
      })
    : [];

  const serialized = appraisals.map(serializeAppraisal);
  const completed = serialized.filter((a) => a.status === 'COMPLETED' || a.status === 'PUBLISHED');
  const avgScore = completed.length
    ? Math.round((completed.reduce((s, a) => s + a.overallScore, 0) / completed.length) * 10) / 10
    : 0;

  const [annualReviews, pips, edps] = await Promise.all([
    prisma.hrPerformanceAnnualReview.findMany({
      where: { institutionId, academicYear },
      include: { employee: { select: { fullName: true, employeeCode: true, department: true } } },
      orderBy: { annualScore: 'desc' },
    }),
    prisma.hrPerformancePip.findMany({
      where: { institutionId, academicYear, status: 'ACTIVE' },
      include: { employee: { select: { fullName: true, employeeCode: true, department: true } } },
    }),
    prisma.hrEmployeeDevelopmentPlan.findMany({
      where: { institutionId, academicYear },
      include: { employee: { select: { fullName: true, employeeCode: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  ]);

  const deptScores = new Map<string, number[]>();
  for (const a of serialized) {
    const list = deptScores.get(a.department) ?? [];
    list.push(a.overallScore);
    deptScores.set(a.department, list);
  }
  const departmentPerformance = [...deptScores.entries()].map(([dept, scores]) => ({
    department: dept,
    avgScore: Math.round((scores.reduce((s, v) => s + v, 0) / scores.length) * 10) / 10,
    count: scores.length,
  }));

  const weightage = parseJson<Weightage>(settings.weightage, {
    kpi: 35, competency: 25, attendance: 10, behaviour: 10, feedback: 10, innovation: 5, training: 5,
  });

  return {
    academicYear,
    quarter: selectedCycle?.cycleType ?? quarter,
    academicYears: ['2023-24', '2024-25', '2025-26', '2026-27'],
    cycles: cycles.map((c) => ({
      id: c.id,
      cycleType: c.cycleType,
      cycleNumber: c.cycleNumber,
      name: c.name,
      periodStart: formatDate(c.periodStart),
      periodEnd: formatDate(c.periodEnd),
      reviewDueDate: formatDate(c.reviewDueDate),
      reviewDueLabel: formatDisplayDate(c.reviewDueDate),
      periodLabel: `${formatDisplayDate(c.periodStart)} – ${formatDisplayDate(c.periodEnd)}`,
      status: c.status,
    })),
    selectedCycle: selectedCycle ? {
      id: selectedCycle.id,
      cycleType: selectedCycle.cycleType,
      name: selectedCycle.name,
      periodLabel: `${formatDisplayDate(selectedCycle.periodStart)} – ${formatDisplayDate(selectedCycle.periodEnd)}`,
      reviewDueLabel: formatDisplayDate(selectedCycle.reviewDueDate),
    } : null,
    kpis: {
      teachers: employees.length,
      evaluations: serialized.length,
      completed: completed.length,
      avgScore,
      pending: serialized.length - completed.length,
    },
    analytics: {
      departmentPerformance,
      topPerformers: serialized.filter((a) => a.overallScore >= 85).slice(0, 5),
      pipCount: pips.length,
      promotionReady: annualReviews.filter((r) => r.promotionEligible).length,
      avgAppraisalScore: avgScore,
      hipoCount: annualReviews.filter((r) => r.annualScore >= 85).length,
    },
    appraisals: serialized,
    annualReviews: annualReviews.map((r) => ({
      id: r.id,
      employeeId: r.employeeId,
      employeeName: r.employee.fullName,
      employeeCode: r.employee.employeeCode,
      department: r.employee.department,
      q1Score: r.q1Score, q2Score: r.q2Score, q3Score: r.q3Score, q4Score: r.q4Score,
      specialAchievementScore: r.specialAchievementScore,
      leadershipScore: r.leadershipScore,
      annualScore: r.annualScore,
      ratingBand: r.ratingBand,
      promotionEligible: r.promotionEligible,
      incrementPercent: r.incrementPercent,
      recommendedPayGrade: r.recommendedPayGrade,
      workflowStage: r.workflowStage,
      status: r.status,
      salaryRevisionStatus: r.salaryRevisionStatus,
    })),
    pips: pips.map((p) => ({
      id: p.id,
      employeeName: p.employee.fullName,
      employeeCode: p.employee.employeeCode,
      department: p.employee.department,
      startDate: formatDate(p.startDate),
      endDate: formatDate(p.endDate),
      mentorName: p.mentorName,
      completionStatus: p.completionStatus,
      goals: parseJson<unknown[]>(p.goals, []),
      status: p.status,
    })),
    developmentPlans: edps.map((e) => ({
      id: e.id,
      employeeName: e.employee.fullName,
      reviewType: e.reviewType,
      leadershipReadiness: e.leadershipReadiness,
      careerAspirations: e.careerAspirations,
      status: e.status,
    })),
    kpiLibrary: kpis.map((k) => ({
      id: k.id, category: k.category, code: k.code, name: k.name,
      staffType: k.staffType, weight: k.weight, status: k.status,
    })),
    payGrades: payGrades.map((g) => ({
      id: g.id, code: g.code, name: g.name, level: g.level,
      minSalary: g.minSalary, maxSalary: g.maxSalary, status: g.status,
    })),
    settings: {
      weightage,
      ratingScale: parseJson(settings.ratingScale, []),
      annualWeightage: parseJson(settings.annualWeightage, {}),
      promotionMatrix: parseJson(settings.promotionMatrix, []),
      incrementMatrix: parseJson(settings.incrementMatrix, []),
      promotionRules: parseJson(settings.promotionRules, {}),
      approvalMatrix: parseJson(settings.approvalMatrix, []),
      pipThreshold: settings.pipThreshold,
      pipDurationDays: settings.pipDurationDays,
    },
    employees,
    workflowStages: WORKFLOW_STAGES,
    kpiCategories: KPI_CATEGORIES,
  };
}

function isTeachingStaff(department: string, designation: string): boolean {
  const d = `${department} ${designation}`.toLowerCase();
  return d.includes('teach') || d.includes('faculty') || d.includes('principal') && !d.includes('non');
}

export async function generateAppraisalsFromEmployees(
  institutionId: string,
  academicYear: string,
  quarter: string,
) {
  const cycles = await ensurePerformanceCycles(institutionId, academicYear);
  const cycle = cycles.find((c) => c.cycleType === quarter);
  if (!cycle) throw new Error('Invalid quarter cycle');

  const employees = await prisma.payrollEmployee.findMany({
    where: { institutionId, status: 'ACTIVE' },
  });

  let created = 0;
  for (const emp of employees) {
    const exists = await prisma.hrPerformanceAppraisal.findUnique({
      where: { employeeId_cycleId: { employeeId: emp.id, cycleId: cycle.id } },
    });
    if (exists) continue;

    const teaching = isTeachingStaff(emp.department, emp.designation);
    await prisma.hrPerformanceAppraisal.create({
      data: {
        institutionId,
        employeeId: emp.id,
        cycleId: cycle.id,
        academicYear,
        quarter,
        staffType: teaching ? 'TEACHING' : 'NON_TEACHING',
        classSubject: teaching ? `${emp.department} · General` : emp.department,
        status: 'DRAFT',
        workflowStage: 'SELF',
      },
    });
    created += 1;
  }

  return { created, total: employees.length };
}

export async function createPerformanceAppraisal(
  institutionId: string,
  body: {
    employeeId: string; academicYear: string; quarter: string;
    classSubject?: string; staffType?: string;
  },
) {
  const cycles = await ensurePerformanceCycles(institutionId, body.academicYear);
  const cycle = cycles.find((c) => c.cycleType === body.quarter);
  if (!cycle) throw new Error('Invalid quarter');

  const emp = await prisma.payrollEmployee.findFirst({
    where: { id: body.employeeId, institutionId },
  });
  if (!emp) throw new Error('Employee not found');

  const row = await prisma.hrPerformanceAppraisal.upsert({
    where: { employeeId_cycleId: { employeeId: emp.id, cycleId: cycle.id } },
    create: {
      institutionId,
      employeeId: emp.id,
      cycleId: cycle.id,
      academicYear: body.academicYear,
      quarter: body.quarter,
      staffType: body.staffType ?? (isTeachingStaff(emp.department, emp.designation) ? 'TEACHING' : 'NON_TEACHING'),
      classSubject: body.classSubject ?? emp.department,
      status: 'DRAFT',
      workflowStage: 'SELF',
    },
    update: {},
    include: { employee: { select: { fullName: true, employeeCode: true, department: true, designation: true } } },
  });

  return serializeAppraisal(row);
}

export async function updatePerformanceAppraisal(
  institutionId: string,
  id: string,
  body: Record<string, unknown>,
) {
  const settings = await ensureSettings(institutionId);
  const weightage = parseJson<Weightage>(settings.weightage, {
    kpi: 35, competency: 25, attendance: 10, behaviour: 10, feedback: 10, innovation: 5, training: 5,
  });

  const existing = await prisma.hrPerformanceAppraisal.findFirst({
    where: { id, institutionId },
  });
  if (!existing) throw new Error('Appraisal not found');

  const scores = {
    kpiScore: Number(body.kpiScore ?? existing.kpiScore),
    competencyScore: Number(body.competencyScore ?? existing.competencyScore),
    attendanceScore: Number(body.attendanceScore ?? existing.attendanceScore),
    behaviourScore: Number(body.behaviourScore ?? existing.behaviourScore),
    feedbackScore: Number(body.feedbackScore ?? existing.feedbackScore),
    innovationScore: Number(body.innovationScore ?? existing.innovationScore),
    trainingScore: Number(body.trainingScore ?? existing.trainingScore),
    taskActionScore: Number(body.taskActionScore ?? existing.taskActionScore),
    improvementScore: Number(body.improvementScore ?? existing.improvementScore),
    parentEngScore: Number(body.parentEngScore ?? existing.parentEngScore),
    parentFbScore: Number(body.parentFbScore ?? existing.parentFbScore),
    studentFbScore: Number(body.studentFbScore ?? existing.studentFbScore),
  };

  let overallScore = existing.overallScore;
  if (existing.staffType === 'TEACHING') {
    overallScore = computeTeachingScore(scores);
  } else {
    overallScore = computeWeightedScore(scores, weightage);
  }

  const ratingBand = ratingBandFromScore(overallScore);
  const outcome = outcomeFromScore(overallScore);

  const row = await prisma.hrPerformanceAppraisal.update({
    where: { id },
    data: {
      classSubject: body.classSubject !== undefined ? String(body.classSubject) : undefined,
      ...scores,
      overallScore,
      ratingBand,
      outcome,
      selfRemarks: body.selfRemarks !== undefined ? String(body.selfRemarks) : undefined,
      managerRemarks: body.managerRemarks !== undefined ? String(body.managerRemarks) : undefined,
      status: body.status !== undefined ? String(body.status) : undefined,
      workflowStage: body.workflowStage !== undefined ? String(body.workflowStage) : undefined,
    },
    include: { employee: { select: { fullName: true, employeeCode: true, department: true, designation: true } } },
  });

  if (overallScore < settings.pipThreshold) {
    await createPipIfNeeded(institutionId, row.employeeId, row.id, row.academicYear, settings.pipDurationDays);
  }

  return serializeAppraisal(row);
}

async function createPipIfNeeded(
  institutionId: string,
  employeeId: string,
  appraisalId: string,
  academicYear: string,
  durationDays: number,
) {
  const active = await prisma.hrPerformancePip.findFirst({
    where: { institutionId, employeeId, status: 'ACTIVE' },
  });
  if (active) return;

  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + durationDays);

  await prisma.hrPerformancePip.create({
    data: {
      institutionId,
      employeeId,
      appraisalId,
      academicYear,
      startDate: start,
      endDate: end,
      goals: [
        { title: 'Improve KPI achievement to 70%+', target: '70%', dueWeek: 4 },
        { title: 'Complete assigned training modules', target: '100%', dueWeek: 8 },
        { title: 'Weekly mentor review compliance', target: '4/4 weeks', dueWeek: 12 },
      ],
      trainingPlan: [
        { course: 'Classroom Management', mode: 'LMS' },
        { course: 'Professional Communication', mode: 'Workshop' },
      ],
      mentorName: 'Assigned HOD',
      weeklyReviews: [],
      monthlyReviews: [],
    },
  });
}

const STAGE_ORDER = [...WORKFLOW_STAGES];

export async function advanceAppraisalWorkflow(institutionId: string, id: string) {
  const row = await prisma.hrPerformanceAppraisal.findFirst({ where: { id, institutionId } });
  if (!row) throw new Error('Appraisal not found');

  const idx = STAGE_ORDER.indexOf(row.workflowStage as typeof STAGE_ORDER[number]);
  const nextStage = idx < STAGE_ORDER.length - 1 ? STAGE_ORDER[idx + 1] : 'FINAL';
  const status = nextStage === 'FINAL' ? 'COMPLETED' : 'IN_REVIEW';

  const updated = await prisma.hrPerformanceAppraisal.update({
    where: { id },
    data: { workflowStage: nextStage, status },
    include: { employee: { select: { fullName: true, employeeCode: true, department: true, designation: true } } },
  });

  if (status === 'COMPLETED') {
    await generateEdp(institutionId, updated.employeeId, updated.academicYear, 'QUARTERLY');
  }

  return serializeAppraisal(updated);
}

export async function publishAppraisalsToMobile(institutionId: string, ids: string[]) {
  await prisma.hrPerformanceAppraisal.updateMany({
    where: { institutionId, id: { in: ids }, status: 'COMPLETED' },
    data: { publishedToMobile: true, status: 'PUBLISHED' },
  });
  return { published: ids.length };
}

export async function computeAnnualReviews(institutionId: string, academicYear: string) {
  const settings = await ensureSettings(institutionId);
  const annualW = parseJson<Record<string, number>>(settings.annualWeightage, {
    q1: 20, q2: 20, q3: 20, q4: 20, specialAchievement: 10, leadership: 10,
  });
  const promotionMatrix = parseJson<Array<{ minScore: number; outcome: string }>>(settings.promotionMatrix, []);
  const incrementMatrix = parseJson<Array<{ band: string; minPercent: number; maxPercent: number }>>(settings.incrementMatrix, []);

  const employees = await prisma.payrollEmployee.findMany({
    where: { institutionId, status: 'ACTIVE' },
  });

  let processed = 0;
  for (const emp of employees) {
    const quarters = await prisma.hrPerformanceAppraisal.findMany({
      where: { institutionId, employeeId: emp.id, academicYear, status: { in: ['COMPLETED', 'PUBLISHED'] } },
    });
    const qScores: Record<string, number> = {};
    for (const q of QUARTERS) {
      const match = quarters.find((a) => a.quarter === q);
      qScores[q] = match?.overallScore ?? 0;
    }

    const specialAchievement = Math.round((Math.random() * 20 + 70) * 10) / 10;
    const leadership = Math.round((Math.random() * 20 + 65) * 10) / 10;

    const annualScore = Math.round((
      qScores.Q1 * (annualW.q1 ?? 20) / 100 +
      qScores.Q2 * (annualW.q2 ?? 20) / 100 +
      qScores.Q3 * (annualW.q3 ?? 20) / 100 +
      qScores.Q4 * (annualW.q4 ?? 20) / 100 +
      specialAchievement * (annualW.specialAchievement ?? 10) / 100 +
      leadership * (annualW.leadership ?? 10) / 100
    ) * 100) / 100;

    const ratingBand = ratingBandFromScore(annualScore);
    const promo = [...promotionMatrix].sort((a, b) => b.minScore - a.minScore).find((p) => annualScore >= p.minScore);
    const promotionEligible = annualScore >= 90;
    const inc = incrementMatrix.find((i) => i.band.toLowerCase().includes(ratingBand.split(' ')[0].toLowerCase()))
      ?? incrementMatrix.find((i) => i.band === 'Average');
    const incrementPercent = inc ? (inc.minPercent + inc.maxPercent) / 2 : 0;

    await prisma.hrPerformanceAnnualReview.upsert({
      where: { employeeId_academicYear: { employeeId: emp.id, academicYear } },
      create: {
        institutionId,
        employeeId: emp.id,
        academicYear,
        q1Score: qScores.Q1,
        q2Score: qScores.Q2,
        q3Score: qScores.Q3,
        q4Score: qScores.Q4,
        specialAchievementScore: specialAchievement,
        leadershipScore: leadership,
        annualScore,
        ratingBand,
        promotionEligible,
        incrementPercent,
        recommendedPayGrade: promo?.outcome ?? '',
        status: 'IN_REVIEW',
        workflowStage: 'MANAGER',
      },
      update: {
        q1Score: qScores.Q1,
        q2Score: qScores.Q2,
        q3Score: qScores.Q3,
        q4Score: qScores.Q4,
        specialAchievementScore: specialAchievement,
        leadershipScore: leadership,
        annualScore,
        ratingBand,
        promotionEligible,
        incrementPercent,
        recommendedPayGrade: promo?.outcome ?? '',
      },
    });
    processed += 1;
  }

  return { processed };
}

async function generateEdp(
  institutionId: string,
  employeeId: string,
  academicYear: string,
  reviewType: string,
) {
  await prisma.hrEmployeeDevelopmentPlan.create({
    data: {
      institutionId,
      employeeId,
      academicYear,
      reviewType,
      skillGaps: ['Digital pedagogy', 'Data-driven lesson planning'],
      mandatoryTraining: ['ERP Advanced Usage', 'Child Safety Compliance'],
      certifications: ['Google Educator Level 1'],
      careerAspirations: 'Senior Teacher / HOD',
      leadershipReadiness: 'Medium',
      coachingAssignments: [{ mentor: 'Senior Faculty', focus: 'Classroom innovation' }],
      mentoringPlan: { frequency: 'Monthly', duration: '3 months' },
      milestones: [
        { quarter: 'Q1', goal: 'Complete LMS certification' },
        { quarter: 'Q2', goal: 'Lead one interdisciplinary project' },
      ],
    },
  });
}

export async function updatePerformanceSettings(institutionId: string, body: Record<string, unknown>) {
  const data: Prisma.HrPerformanceSettingsUpdateInput = {};
  if (body.weightage !== undefined) data.weightage = body.weightage as Prisma.InputJsonValue;
  if (body.ratingScale !== undefined) data.ratingScale = body.ratingScale as Prisma.InputJsonValue;
  if (body.annualWeightage !== undefined) data.annualWeightage = body.annualWeightage as Prisma.InputJsonValue;
  if (body.promotionMatrix !== undefined) data.promotionMatrix = body.promotionMatrix as Prisma.InputJsonValue;
  if (body.incrementMatrix !== undefined) data.incrementMatrix = body.incrementMatrix as Prisma.InputJsonValue;
  if (body.promotionRules !== undefined) data.promotionRules = body.promotionRules as Prisma.InputJsonValue;
  if (body.approvalMatrix !== undefined) data.approvalMatrix = body.approvalMatrix as Prisma.InputJsonValue;
  if (body.pipThreshold !== undefined) data.pipThreshold = Number(body.pipThreshold);
  if (body.pipDurationDays !== undefined) data.pipDurationDays = Number(body.pipDurationDays);

  const existing = await ensureSettings(institutionId);
  await prisma.hrPerformanceSettings.update({
    where: { id: existing.id },
    data,
  });
}

export async function createPerformanceKpi(institutionId: string, body: Record<string, unknown>) {
  const row = await prisma.hrPerformanceKpi.create({
    data: {
      institutionId,
      category: String(body.category ?? 'Academic'),
      code: String(body.code),
      name: String(body.name),
      description: String(body.description ?? ''),
      staffType: String(body.staffType ?? 'ALL'),
      weight: Number(body.weight ?? 0),
      status: String(body.status ?? 'ACTIVE'),
    },
  });
  return row;
}

export async function seedPerformanceAppraisalDemo(institutionId: string) {
  await seedHrAttendanceLeaveDemo(institutionId);
  const academicYear = '2025-26';
  await ensureSettings(institutionId);
  await ensurePayGrades(institutionId);
  await ensureKpis(institutionId);
  await ensurePerformanceCycles(institutionId, academicYear);
  await generateAppraisalsFromEmployees(institutionId, academicYear, 'Q1');

  const appraisals = await prisma.hrPerformanceAppraisal.findMany({
    where: { institutionId, academicYear, quarter: 'Q1' },
    take: 8,
  });

  for (let i = 0; i < appraisals.length; i++) {
    const a = appraisals[i];
    const base = 65 + Math.random() * 30;
    const teaching = a.staffType === 'TEACHING';
    const scores = teaching
      ? {
          taskActionScore: base + 5,
          improvementScore: base,
          parentEngScore: base - 3,
          parentFbScore: base + 2,
          studentFbScore: base - 1,
          overallScore: 0,
        }
      : {
          kpiScore: base,
          competencyScore: base + 3,
          attendanceScore: base + 8,
          behaviourScore: base + 2,
          feedbackScore: base - 2,
          innovationScore: base,
          trainingScore: base + 5,
          overallScore: 0,
        };

    if (teaching) {
      scores.overallScore = computeTeachingScore(scores as Parameters<typeof computeTeachingScore>[0]);
    } else {
      const settings = await ensureSettings(institutionId);
      const weightage = parseJson<Weightage>(settings.weightage, {
        kpi: 35, competency: 25, attendance: 10, behaviour: 10, feedback: 10, innovation: 5, training: 5,
      });
      scores.overallScore = computeWeightedScore(scores, weightage);
    }

    await prisma.hrPerformanceAppraisal.update({
      where: { id: a.id },
      data: {
        ...scores,
        ratingBand: ratingBandFromScore(scores.overallScore),
        outcome: outcomeFromScore(scores.overallScore),
        status: i < 3 ? 'COMPLETED' : 'IN_REVIEW',
        workflowStage: i < 3 ? 'FINAL' : 'MANAGER',
        classSubject: teaching ? `Class ${6 + i} · Mathematics` : a.classSubject,
      },
    });
  }

  await computeAnnualReviews(institutionId, academicYear);
  return getPerformanceAppraisalDashboard(institutionId, { academicYear, quarter: 'Q1' });
}
