import type { StudentAnalyticsRecord, StudentScores } from './studentAnalyticsRecordServices';

/** Area scores used for red / exceptional categorization (excludes growth & AI risk). */
export const AREA_SCORE_KEYS = [
  'academicPerformance',
  'attendanceScore',
  'behaviourScore',
  'disciplineScore',
  'healthScore',
  'physicalFitnessScore',
  'skillDevelopmentScore',
  'parentEngagementScore',
  'teacherFeedbackScore',
] as const satisfies readonly (keyof StudentScores)[];

export type AreaScoreKey = (typeof AREA_SCORE_KEYS)[number];

export const AREA_SCORE_LABELS: Record<AreaScoreKey, string> = {
  academicPerformance: 'Academic',
  attendanceScore: 'Attendance',
  behaviourScore: 'Behaviour',
  disciplineScore: 'Discipline',
  healthScore: 'Health',
  physicalFitnessScore: 'Fitness',
  skillDevelopmentScore: 'Skills',
  parentEngagementScore: 'Parent Eng.',
  teacherFeedbackScore: 'Teacher FB',
};

const RED_GROWTH_MAX = 55;
const RED_ATTENDANCE_MAX = 80;
const RED_OTHER_MAX = 80;

const EXCEPTIONAL_MIN = 80;

/** Growth < 55%, attendance < 80%, and every other area score < 80%. */
export function isRedCategoryStudent(record: StudentAnalyticsRecord): boolean {
  const s = record.scores;
  if (s.growthScore >= RED_GROWTH_MAX) return false;
  if (s.attendanceScore >= RED_ATTENDANCE_MAX) return false;
  return AREA_SCORE_KEYS.every((key) => s[key] < RED_OTHER_MAX);
}

/** Growth ≥ 80 and every area score ≥ 80 — top holistic performers. */
export function isExceptionalStudent(record: StudentAnalyticsRecord): boolean {
  const s = record.scores;
  if (s.growthScore < EXCEPTIONAL_MIN) return false;
  return AREA_SCORE_KEYS.every((key) => s[key] >= EXCEPTIONAL_MIN);
}

export function categorizeStudentAnalytics(records: StudentAnalyticsRecord[]) {
  const redCategory = records
    .filter(isRedCategoryStudent)
    .sort((a, b) => a.scores.growthScore - b.scores.growthScore);

  const exceptional = records
    .filter(isExceptionalStudent)
    .sort((a, b) => b.scores.growthScore - a.scores.growthScore);

  return { redCategory, exceptional };
}

export function lowestAreaScore(scores: StudentScores): { key: AreaScoreKey; value: number } {
  let lowest: { key: AreaScoreKey; value: number } = { key: 'academicPerformance', value: scores.academicPerformance };
  for (const key of AREA_SCORE_KEYS) {
    if (scores[key] < lowest.value) lowest = { key, value: scores[key] };
  }
  return lowest;
}
