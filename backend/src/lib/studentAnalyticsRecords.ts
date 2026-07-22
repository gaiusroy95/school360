import { Student, StudentAnalyticsStatus, StudentStatus } from '@prisma/client';
import { prisma } from './prisma.js';
import { formatClassSection } from './students.js';

export const ANALYTICS_STATUS_UI: Record<StudentAnalyticsStatus, string> = {
  DRAFT: 'Draft',
  PENDING: 'Pending',
  OPEN: 'Open',
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  APPROVED: 'Approved',
  PAID: 'Paid',
  DUE: 'Due',
};

export type StudentScores = {
  growthScore: number;
  academicPerformance: number;
  attendanceScore: number;
  behaviourScore: number;
  disciplineScore: number;
  healthScore: number;
  physicalFitnessScore: number;
  skillDevelopmentScore: number;
  parentEngagementScore: number;
  teacherFeedbackScore: number;
  aiRiskScore: number;
};

export type StudentRiskFlags = {
  dropoutRisk: boolean;
  lowPerformanceRisk: boolean;
  feeDefaultRisk: boolean;
};

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function stableHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function studentFullName(s: Pick<Student, 'firstName' | 'lastName'>) {
  return [s.firstName, s.lastName].filter(Boolean).join(' ').trim();
}

export function parseAnalyticsStatus(input?: string): StudentAnalyticsStatus | undefined {
  if (!input) return undefined;
  const upper = input.toUpperCase().replace(/\s+/g, '_') as StudentAnalyticsStatus;
  if (Object.values(StudentAnalyticsStatus).includes(upper)) return upper;
  return undefined;
}

export function computeStudentScores(
  student: Student,
  opts?: { talentCategoryCount?: number; feeDueAmount?: number },
): { scores: StudentScores; riskFlags: StudentRiskFlags } {
  const custom = (student.customFields || {}) as Record<string, unknown>;
  const profile = (custom.profile || {}) as Record<string, unknown>;
  const analytics = (custom.analytics || {}) as Record<string, unknown>;

  const attendanceToday = String(profile.attendanceToday || 'Present');
  const attendanceScore =
    typeof analytics.attendanceScore === 'number'
      ? clamp(analytics.attendanceScore)
      : attendanceToday === 'Present'
        ? clamp(88 + stableHash(student.id) % 10)
        : attendanceToday === 'On Leave'
          ? 62
          : 35;

  const academicPerformance =
    typeof analytics.academicPerformance === 'number'
      ? clamp(analytics.academicPerformance)
      : student.entranceScore != null
        ? clamp(student.entranceScore)
        : clamp(65 + (stableHash(student.admissionNumber) % 25));

  const behaviourScore =
    typeof analytics.behaviourScore === 'number'
      ? clamp(analytics.behaviourScore)
      : clamp(78 + (stableHash(`${student.id}-beh`) % 18));

  const disciplineScore =
    typeof analytics.disciplineScore === 'number'
      ? clamp(analytics.disciplineScore)
      : clamp(82 + (stableHash(`${student.id}-dis`) % 15));

  const docs = (student.documents || {}) as Record<string, unknown>;
  const hasMedical = !!(docs.medical_record || docs['Medical Record']);
  const healthScore =
    typeof analytics.healthScore === 'number'
      ? clamp(analytics.healthScore)
      : clamp((hasMedical ? 85 : 72) + (student.bloodGroup ? 5 : 0));

  const physicalFitnessScore =
    typeof analytics.physicalFitnessScore === 'number'
      ? clamp(analytics.physicalFitnessScore)
      : clamp(70 + (stableHash(`${student.id}-fit`) % 25));

  const talentBonus = Math.min(15, (opts?.talentCategoryCount || 0) * 5);
  const skillDevelopmentScore =
    typeof analytics.skillDevelopmentScore === 'number'
      ? clamp(analytics.skillDevelopmentScore)
      : clamp(68 + talentBonus + (stableHash(`${student.id}-skill`) % 12));

  const parentContacts = [student.fatherMobile, student.motherMobile, student.mobile].filter((m) => m?.trim()).length;
  const parentEngagementScore =
    typeof analytics.parentEngagementScore === 'number'
      ? clamp(analytics.parentEngagementScore)
      : clamp(55 + parentContacts * 12 + (stableHash(`${student.id}-par`) % 10));

  const teacherFeedbackScore =
    typeof analytics.teacherFeedbackScore === 'number'
      ? clamp(analytics.teacherFeedbackScore)
      : clamp(
          academicPerformance * 0.35 +
            behaviourScore * 0.25 +
            attendanceScore * 0.25 +
            disciplineScore * 0.15,
        );

  const feeDueAmount =
    typeof opts?.feeDueAmount === 'number'
      ? opts.feeDueAmount
      : typeof profile.feeDueAmount === 'number'
        ? profile.feeDueAmount
        : 0;

  const dropoutRisk =
    student.status === StudentStatus.INACTIVE ||
    student.status === StudentStatus.TRANSFERRED ||
    attendanceScore < 50;
  const lowPerformanceRisk = academicPerformance < 55;
  const feeDefaultRisk = feeDueAmount > 0;

  let riskPoints = 0;
  if (dropoutRisk) riskPoints += 40;
  if (lowPerformanceRisk) riskPoints += 30;
  if (feeDefaultRisk) riskPoints += 25;
  if (attendanceScore < 60) riskPoints += 10;

  const aiRiskScore = clamp(riskPoints);

  const growthScore = clamp(
    academicPerformance * 0.2 +
      attendanceScore * 0.15 +
      behaviourScore * 0.1 +
      disciplineScore * 0.1 +
      healthScore * 0.1 +
      physicalFitnessScore * 0.1 +
      skillDevelopmentScore * 0.1 +
      parentEngagementScore * 0.075 +
      teacherFeedbackScore * 0.075 -
      aiRiskScore * 0.15,
  );

  return {
    scores: {
      growthScore,
      academicPerformance,
      attendanceScore,
      behaviourScore,
      disciplineScore,
      healthScore,
      physicalFitnessScore,
      skillDevelopmentScore,
      parentEngagementScore,
      teacherFeedbackScore,
      aiRiskScore,
    },
    riskFlags: { dropoutRisk, lowPerformanceRisk, feeDefaultRisk },
  };
}

export function deriveAnalyticsStatus(
  scores: StudentScores,
  riskFlags: StudentRiskFlags,
  studentStatus: StudentStatus,
): StudentAnalyticsStatus {
  if (riskFlags.feeDefaultRisk) return StudentAnalyticsStatus.DUE;
  if (riskFlags.dropoutRisk || scores.aiRiskScore >= 60) return StudentAnalyticsStatus.PENDING;
  if (riskFlags.lowPerformanceRisk) return StudentAnalyticsStatus.OPEN;
  if (studentStatus === StudentStatus.INACTIVE) return StudentAnalyticsStatus.DRAFT;
  if (scores.growthScore >= 85) return StudentAnalyticsStatus.COMPLETED;
  if (scores.growthScore >= 75) return StudentAnalyticsStatus.ACTIVE;
  if (scores.growthScore >= 65) return StudentAnalyticsStatus.APPROVED;
  return StudentAnalyticsStatus.PAID;
}

export async function generateAnalyticsRecordId(institutionId: string): Promise<string> {
  const count = await prisma.studentAnalyticsRecord.count({ where: { institutionId } });
  for (let i = 0; i < 50; i++) {
    const candidate = `STU-${String(9500 + count + i + 1)}`;
    const taken = await prisma.studentAnalyticsRecord.findFirst({
      where: { institutionId, recordId: candidate },
    });
    if (!taken) return candidate;
  }
  return `STU-${Date.now().toString().slice(-6)}`;
}

export function serializeAnalyticsRecord(row: {
  id: string;
  recordId: string;
  studentId: string;
  name: string;
  className: string;
  sectionName: string;
  academicYear: string;
  status: StudentAnalyticsStatus;
  scores: unknown;
  riskFlags: unknown;
  computedAt: Date;
  updatedAt: Date;
  createdAt: Date;
}) {
  const scores = (row.scores || {}) as StudentScores;
  return {
    id: row.id,
    recordId: row.recordId,
    studentId: row.studentId,
    name: row.name,
    className: row.className,
    sectionName: row.sectionName,
    classGroup: formatClassSection(row.className, row.sectionName),
    academicYear: row.academicYear,
    status: row.status,
    statusLabel: ANALYTICS_STATUS_UI[row.status],
    scores,
    riskFlags: (row.riskFlags || {}) as StudentRiskFlags,
    growthScore: scores.growthScore ?? 0,
    aiRiskScore: scores.aiRiskScore ?? 0,
    computedAt: row.computedAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getAnalyticsDashboard(institutionId: string) {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [total, activeOpen, pending, thisMonth] = await Promise.all([
    prisma.studentAnalyticsRecord.count({ where: { institutionId } }),
    prisma.studentAnalyticsRecord.count({
      where: {
        institutionId,
        status: {
          in: [StudentAnalyticsStatus.ACTIVE, StudentAnalyticsStatus.OPEN, StudentAnalyticsStatus.COMPLETED],
        },
      },
    }),
    prisma.studentAnalyticsRecord.count({
      where: { institutionId, status: StudentAnalyticsStatus.PENDING },
    }),
    prisma.studentAnalyticsRecord.count({
      where: { institutionId, computedAt: { gte: startOfMonth } },
    }),
  ]);

  return { total, activeOpen, pending, thisMonth };
}

export async function getAggregateScores(institutionId: string, academicYear?: string) {
  const rows = await prisma.studentAnalyticsRecord.findMany({
    where: {
      institutionId,
      ...(academicYear ? { academicYear } : {}),
    },
    select: { scores: true },
  });

  if (rows.length === 0) {
    return {
      growthScore: 0,
      academicPerformance: 0,
      attendanceScore: 0,
      behaviourScore: 0,
      disciplineScore: 0,
      healthScore: 0,
      physicalFitnessScore: 0,
      skillDevelopmentScore: 0,
      parentEngagementScore: 0,
      teacherFeedbackScore: 0,
      aiRiskScore: 0,
      studentCount: 0,
    };
  }

  const keys: (keyof StudentScores)[] = [
    'growthScore',
    'academicPerformance',
    'attendanceScore',
    'behaviourScore',
    'disciplineScore',
    'healthScore',
    'physicalFitnessScore',
    'skillDevelopmentScore',
    'parentEngagementScore',
    'teacherFeedbackScore',
    'aiRiskScore',
  ];

  const totals = Object.fromEntries(keys.map((k) => [k, 0])) as Record<keyof StudentScores, number>;
  for (const row of rows) {
    const s = (row.scores || {}) as StudentScores;
    for (const k of keys) totals[k] += s[k] ?? 0;
  }

  const n = rows.length;
  const avg = Object.fromEntries(keys.map((k) => [k, clamp(totals[k] / n)])) as StudentScores;
  return { ...avg, studentCount: n };
}

async function talentCountByStudent(studentIds: string[]) {
  if (studentIds.length === 0) return new Map<string, number>();
  const assignments = await prisma.studentCategoryAssignment.findMany({
    where: {
      studentId: { in: studentIds },
      category: { categoryGroup: 'TALENT' },
    },
    select: { studentId: true },
  });
  const map = new Map<string, number>();
  for (const a of assignments) {
    map.set(a.studentId, (map.get(a.studentId) || 0) + 1);
  }
  return map;
}

export async function syncStudentAnalytics(
  institutionId: string,
  academicYear: string,
  opts?: { className?: string; sectionName?: string; studentId?: string },
) {
  const students = await prisma.student.findMany({
    where: {
      institutionId,
      academicYear,
      ...(opts?.studentId ? { id: opts.studentId } : {}),
      ...(opts?.className ? { className: opts.className } : {}),
      ...(opts?.sectionName ? { sectionName: opts.sectionName } : {}),
    },
  });

  const talentMap = await talentCountByStudent(students.map((s) => s.id));
  let created = 0;
  let updated = 0;

  for (const student of students) {
    const custom = (student.customFields || {}) as Record<string, unknown>;
    const profile = (custom.profile || {}) as Record<string, unknown>;
    const feeDueAmount = typeof profile.feeDueAmount === 'number' ? profile.feeDueAmount : 0;

    const { scores, riskFlags } = computeStudentScores(student, {
      talentCategoryCount: talentMap.get(student.id) || 0,
      feeDueAmount,
    });
    const status = deriveAnalyticsStatus(scores, riskFlags, student.status);
    const name = studentFullName(student);

    const existing = await prisma.studentAnalyticsRecord.findUnique({
      where: { studentId_academicYear: { studentId: student.id, academicYear } },
    });

    if (existing) {
      await prisma.studentAnalyticsRecord.update({
        where: { id: existing.id },
        data: {
          name,
          className: student.className,
          sectionName: student.sectionName,
          status,
          scores: scores as object,
          riskFlags: riskFlags as object,
          computedAt: new Date(),
        },
      });
      updated += 1;
    } else {
      const recordId = await generateAnalyticsRecordId(institutionId);
      await prisma.studentAnalyticsRecord.create({
        data: {
          institutionId,
          studentId: student.id,
          recordId,
          name,
          className: student.className,
          sectionName: student.sectionName,
          academicYear,
          status,
          scores: scores as object,
          riskFlags: riskFlags as object,
        },
      });
      created += 1;
    }
  }

  return { created, updated, total: students.length };
}
