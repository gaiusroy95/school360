import { computeStudentScores, type StudentScores } from './studentAnalyticsRecords.js';
import { formatClassSection } from './students.js';
import { prisma } from './prisma.js';

export const DEFAULT_STUDY_THRESHOLD = 55;
export const DEFAULT_BEHAVIOR_THRESHOLD = 60;

export type ImprovementPlanCandidate = {
  studentId: string;
  fullName: string;
  classGroup: string;
  studyScore: number;
  behaviorScore: number;
  studyIssue: boolean;
  behaviorIssue: boolean;
  flags: ('S' | 'B')[];
};

function studentFullName(s: { firstName: string; lastName: string }) {
  return [s.firstName, s.lastName].filter(Boolean).join(' ').trim();
}

function resolveScores(
  analyticsScores: Partial<StudentScores> | undefined,
  computed: StudentScores,
): { studyScore: number; behaviorScore: number } {
  return {
    studyScore: analyticsScores?.academicPerformance ?? computed.academicPerformance,
    behaviorScore: analyticsScores?.behaviourScore ?? computed.behaviourScore,
  };
}

export function isImprovementPlanCategory(category: string) {
  return category.toLowerCase().includes('improvement');
}

export async function getImprovementPlanCandidates(
  institutionId: string,
  opts: {
    academicYear?: string;
    studyThreshold?: number;
    behaviorThreshold?: number;
  } = {},
): Promise<ImprovementPlanCandidate[]> {
  const studyThreshold = opts.studyThreshold ?? DEFAULT_STUDY_THRESHOLD;
  const behaviorThreshold = opts.behaviorThreshold ?? DEFAULT_BEHAVIOR_THRESHOLD;

  const students = await prisma.student.findMany({
    where: {
      institutionId,
      ...(opts.academicYear ? { academicYear: opts.academicYear } : {}),
    },
    orderBy: [{ className: 'asc' }, { sectionName: 'asc' }, { firstName: 'asc' }],
  });

  if (students.length === 0) return [];

  const studentIds = students.map((s) => s.id);
  const analyticsRows = await prisma.studentAnalyticsRecord.findMany({
    where: {
      institutionId,
      studentId: { in: studentIds },
      ...(opts.academicYear ? { academicYear: opts.academicYear } : {}),
    },
    orderBy: { computedAt: 'desc' },
  });

  const analyticsByStudent = new Map<string, Partial<StudentScores>>();
  for (const row of analyticsRows) {
    if (!analyticsByStudent.has(row.studentId)) {
      analyticsByStudent.set(row.studentId, (row.scores || {}) as Partial<StudentScores>);
    }
  }

  const candidates: ImprovementPlanCandidate[] = [];

  for (const student of students) {
    const { scores } = computeStudentScores(student);
    const { studyScore, behaviorScore } = resolveScores(analyticsByStudent.get(student.id), scores);
    const studyIssue = studyScore < studyThreshold;
    const behaviorIssue = behaviorScore < behaviorThreshold;

    if (!studyIssue && !behaviorIssue) continue;

    const flags: ('S' | 'B')[] = [];
    if (studyIssue) flags.push('S');
    if (behaviorIssue) flags.push('B');

    candidates.push({
      studentId: student.id,
      fullName: studentFullName(student),
      classGroup: formatClassSection(student.className, student.sectionName),
      studyScore,
      behaviorScore,
      studyIssue,
      behaviorIssue,
      flags,
    });
  }

  return candidates.sort((a, b) => {
    const aMin = Math.min(a.studyScore, a.behaviorScore);
    const bMin = Math.min(b.studyScore, b.behaviorScore);
    return aMin - bMin;
  });
}
