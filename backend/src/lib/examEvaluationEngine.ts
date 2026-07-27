import { prisma } from './prisma.js';
import type { Prisma } from '@prisma/client';
import { getDefaultAcademicYear } from './academicSetupSync.js';

type SetupSections = Record<string, Record<string, unknown>>;

type GradeBand = { minPercent: number; maxPercent: number; grade: string; gpa: number };

const DEFAULT_10_POINT_MATRIX: GradeBand[] = [
  { minPercent: 90, maxPercent: 100, grade: 'A+', gpa: 10 },
  { minPercent: 80, maxPercent: 89.99, grade: 'A', gpa: 9 },
  { minPercent: 70, maxPercent: 79.99, grade: 'B+', gpa: 8 },
  { minPercent: 60, maxPercent: 69.99, grade: 'B', gpa: 7 },
  { minPercent: 50, maxPercent: 59.99, grade: 'C', gpa: 6 },
  { minPercent: 36, maxPercent: 49.99, grade: 'D', gpa: 5 },
  { minPercent: 0, maxPercent: 35.99, grade: 'F', gpa: 0 },
];

const DEFAULT_4_POINT_MATRIX: GradeBand[] = [
  { minPercent: 93, maxPercent: 100, grade: 'A', gpa: 4 },
  { minPercent: 90, maxPercent: 92.99, grade: 'A-', gpa: 3.7 },
  { minPercent: 87, maxPercent: 89.99, grade: 'B+', gpa: 3.3 },
  { minPercent: 83, maxPercent: 86.99, grade: 'B', gpa: 3 },
  { minPercent: 80, maxPercent: 82.99, grade: 'B-', gpa: 2.7 },
  { minPercent: 77, maxPercent: 79.99, grade: 'C+', gpa: 2.3 },
  { minPercent: 73, maxPercent: 76.99, grade: 'C', gpa: 2 },
  { minPercent: 70, maxPercent: 72.99, grade: 'C-', gpa: 1.7 },
  { minPercent: 67, maxPercent: 69.99, grade: 'D+', gpa: 1.3 },
  { minPercent: 63, maxPercent: 66.99, grade: 'D', gpa: 1 },
  { minPercent: 60, maxPercent: 62.99, grade: 'D-', gpa: 0.7 },
  { minPercent: 0, maxPercent: 59.99, grade: 'F', gpa: 0 },
];

const DEFAULT_COMPONENT_WEIGHTAGES: Record<string, number> = {
  UNIT_1: 15,
  UNIT_2: 15,
  UNIT_3: 15,
  HALF_YEARLY: 25,
  YEARLY: 30,
};

function readSetupSections(tile: unknown): SetupSections {
  if (!tile || typeof tile !== 'object') return {};
  return (tile as { sections?: SetupSections }).sections || {};
}

function readField(sections: SetupSections, sectionKeys: string | string[], key: string, fallback = '') {
  const keys = Array.isArray(sectionKeys) ? sectionKeys : [sectionKeys];
  for (const sectionKey of keys) {
    const val = sections[sectionKey]?.[key];
    if (val != null && String(val) !== '') return String(val);
  }
  return fallback;
}

function parseJsonObject(raw: string, fallback: Record<string, unknown> = {}) {
  if (!raw.trim()) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed && !Array.isArray(parsed) ? parsed as Record<string, unknown> : fallback;
  } catch {
    return fallback;
  }
}

function parseJsonArray(raw: string) {
  if (!raw.trim()) return [] as string[];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {
    // comma-separated fallback
  }
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

export function validateComponentWeightages(weightages: Record<string, number>, enabled: boolean) {
  if (!enabled) return { valid: true, sum: 0, errors: [] as string[] };
  const sum = Object.values(weightages).reduce((a, b) => a + b, 0);
  const errors: string[] = [];
  if (Math.abs(sum - 100) > 0.01) {
    errors.push(`Component weightages must sum to 100 (current sum: ${sum})`);
  }
  for (const [key, val] of Object.entries(weightages)) {
    if (val < 0 || val > 100) errors.push(`${key}: weightage must be between 0 and 100`);
  }
  return { valid: errors.length === 0, sum, errors };
}

export function parseExamPeriodsText(text: string) {
  const periods: {
    periodName: string;
    startDate: Date;
    endDate: Date;
  }[] = [];

  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const colonMatch = trimmed.match(/^(.+?):\s*(\d{4}-\d{2}-\d{2})\s*(?:to|-)\s*(\d{4}-\d{2}-\d{2})/i);
    if (colonMatch) {
      periods.push({
        periodName: colonMatch[1].trim(),
        startDate: new Date(colonMatch[2]),
        endDate: new Date(colonMatch[3]),
      });
      continue;
    }

    const pipeMatch = trimmed.match(/^(.+?)\s*[|]\s*(\d{4}-\d{2}-\d{2})\s*[|]\s*(\d{4}-\d{2}-\d{2})/);
    if (pipeMatch) {
      periods.push({
        periodName: pipeMatch[1].trim(),
        startDate: new Date(pipeMatch[2]),
        endDate: new Date(pipeMatch[3]),
      });
    }
  }

  return periods;
}

export function loadEvaluationSetupFromInstitution(setup: {
  gradeMarksSetup?: unknown;
  sessionTermSetup?: unknown;
} | null) {
  const grading = readSetupSections(setup?.gradeMarksSetup);
  const session = readSetupSections(setup?.sessionTermSetup);

  const weightageEnabled = readField(grading, ['Marks Configuration', 'marksConfiguration'], 'weightageEnabled') === 'Yes';
  const componentWeightagesRaw = readField(grading, ['Marks Configuration', 'marksConfiguration'], 'componentWeightages');
  const componentWeightages = componentWeightagesRaw
    ? parseJsonObject(componentWeightagesRaw, DEFAULT_COMPONENT_WEIGHTAGES as Record<string, unknown>)
    : { ...DEFAULT_COMPONENT_WEIGHTAGES };

  const weightages = Object.fromEntries(
    Object.entries(componentWeightages).map(([k, v]) => [k, Number(v) || 0]),
  );
  const weightageValidation = validateComponentWeightages(weightages, weightageEnabled);

  return {
    marksConfig: {
      maxMarks: Number(readField(grading, ['Marks Configuration', 'marksConfiguration'], 'maxMarks', '100')) || 100,
      graceMarks: Number(readField(grading, ['Marks Configuration', 'marksConfiguration'], 'graceMarks', '0')) || 0,
      weightageEnabled,
      componentWeightages: weightages,
      weightageSumValid: weightageValidation.valid,
      rulesLocked: weightageValidation.valid,
    },
    gradingRule: {
      passMarks: Number(readField(grading, ['Pass / Fail Criteria', 'passFail'], 'passMarks', '33')) || 33,
      passGrade: readField(grading, ['Pass / Fail Criteria', 'passFail'], 'passGrade', 'D'),
      aggregatedPassPercent: Number(readField(grading, ['Pass / Fail Criteria', 'passFail'], 'aggregatedPassPercent', '33')) || 33,
      minComponentPassPercent: Number(readField(grading, ['Pass / Fail Criteria', 'passFail'], 'minComponentPass', '33')) || 33,
      componentRules: parseJsonObject(readField(grading, ['Pass / Fail Criteria', 'passFail'], 'componentRules')),
      rulesActive: true,
    },
    gpaScale: {
      scaleType: readField(grading, ['GPA / CGPA Settings', 'gpaCgpa'], 'scale', '10 Point'),
      formulaNotes: readField(grading, ['GPA / CGPA Settings', 'gpaCgpa'], 'formulaNotes'),
      gradeMatrix: parseJsonObject(readField(grading, ['GPA / CGPA Settings', 'gpaCgpa'], 'gradeMatrix')),
      creditWeighting: parseJsonObject(readField(grading, ['GPA / CGPA Settings', 'gpaCgpa'], 'creditWeighting')),
    },
    rankConfig: {
      rankMethod: readField(grading, ['Rank Configuration', 'rankConfiguration'], 'rankMethod', 'Percentage'),
      tieRule: readField(grading, ['Rank Configuration', 'rankConfiguration'], 'tieRule', 'Same Rank'),
      rankScope: readField(grading, ['Rank Configuration', 'rankConfiguration'], 'rankScope', 'Section'),
      exemptedSubjects: parseJsonArray(readField(grading, ['Rank Configuration', 'rankConfiguration'], 'exemptedSubjects')),
    },
    examPeriodsText: readField(session, ['Examination Periods', 'examinationPeriods'], 'examPeriods'),
    marksEntryDeadline: readField(session, ['Examination Periods', 'examinationPeriods'], 'marksEntryDeadline'),
    registrationCutoff: readField(session, ['Examination Periods', 'examinationPeriods'], 'registrationCutoff'),
  };
}

function resolveGradeMatrix(scaleType: string, rawMatrix: unknown): GradeBand[] {
  if (Array.isArray(rawMatrix) && rawMatrix.length > 0) {
    return rawMatrix.map((row) => {
      const r = row as Record<string, unknown>;
      return {
        minPercent: Number(r.minPercent ?? r.min ?? 0),
        maxPercent: Number(r.maxPercent ?? r.max ?? 100),
        grade: String(r.grade ?? 'F'),
        gpa: Number(r.gpa ?? 0),
      };
    });
  }
  return scaleType.toLowerCase().includes('4') ? DEFAULT_4_POINT_MATRIX : DEFAULT_10_POINT_MATRIX;
}

export function computeGradeFromScale(percent: number, matrix: GradeBand[]) {
  const band = matrix.find((b) => percent >= b.minPercent && percent <= b.maxPercent)
    || matrix.find((b) => percent >= b.minPercent)
    || matrix[matrix.length - 1];
  return band?.grade || 'F';
}

export function computeGpaFromScale(percent: number, matrix: GradeBand[]) {
  const band = matrix.find((b) => percent >= b.minPercent && percent <= b.maxPercent)
    || matrix.find((b) => percent >= b.minPercent)
    || matrix[matrix.length - 1];
  return band?.gpa ?? 0;
}

export function determinePassStatus(
  percent: number,
  subjectScores: { subjectName: string; obtained: number; max: number }[],
  gradingRule: { aggregatedPassPercent: number; minComponentPassPercent: number },
  exemptedSubjects: string[] = [],
) {
  const exemptSet = new Set(exemptedSubjects.map((s) => s.toLowerCase()));
  const relevant = subjectScores.filter((s) => !exemptSet.has(s.subjectName.toLowerCase()));
  const aggregatedPass = percent >= gradingRule.aggregatedPassPercent;
  const componentFails = relevant.filter((s) => {
    const pct = s.max > 0 ? (s.obtained / s.max) * 100 : 0;
    return pct < gradingRule.minComponentPassPercent;
  });
  return {
    passed: aggregatedPass && componentFails.length === 0,
    aggregatedPass,
    failedComponents: componentFails.map((s) => s.subjectName),
  };
}

export type RankableResult = {
  studentId: string;
  percentage: number;
  totalObtained: number;
  totalMax: number;
  gpa: number;
  subjectScores: { subjectName: string; obtained: number; max: number }[];
};

export function assignRanks<T extends RankableResult>(
  results: T[],
  rankConfig: { rankMethod: string; tieRule: string },
): (T & { rank: number })[] {
  const sorted = [...results].sort((a, b) => {
    if (rankConfig.rankMethod === 'CGPA' || rankConfig.rankMethod === 'GPA') {
      return b.gpa - a.gpa || b.percentage - a.percentage;
    }
    if (rankConfig.rankMethod === 'Total Marks') {
      return b.totalObtained - a.totalObtained || b.percentage - a.percentage;
    }
    return b.percentage - a.percentage || b.totalObtained - a.totalObtained;
  });

  const ranked: (T & { rank: number })[] = [];
  let currentRank = 1;

  for (let i = 0; i < sorted.length; i++) {
    const curr = sorted[i];
    if (i > 0) {
      const prev = sorted[i - 1];
      const tied = rankConfig.rankMethod === 'Total Marks'
        ? curr.totalObtained === prev.totalObtained
        : (rankConfig.rankMethod === 'CGPA' || rankConfig.rankMethod === 'GPA')
          ? curr.gpa === prev.gpa
          : curr.percentage === prev.percentage;

      if (!tied) {
        if (rankConfig.tieRule === 'Skip Next') currentRank = i + 1;
        else currentRank = i + 1;
      } else if (rankConfig.tieRule === 'Break By Subject') {
        const tieBreak = compareByTopSubject(curr, prev);
        if (tieBreak !== 0) currentRank = i + 1;
      }
    }

    const rank = rankConfig.tieRule === 'Same Rank' && i > 0 && isTied(sorted[i - 1], curr, rankConfig)
      ? ranked[i - 1].rank
      : currentRank;

    ranked.push({ ...curr, rank });
  }

  return ranked;
}

function isTied(a: RankableResult, b: RankableResult, rankConfig: { rankMethod: string }) {
  if (rankConfig.rankMethod === 'Total Marks') return a.totalObtained === b.totalObtained;
  if (rankConfig.rankMethod === 'CGPA' || rankConfig.rankMethod === 'GPA') return a.gpa === b.gpa;
  return a.percentage === b.percentage;
}

function compareByTopSubject(a: RankableResult, b: RankableResult) {
  const topA = [...a.subjectScores].sort((x, y) => (y.obtained / (y.max || 1)) - (x.obtained / (x.max || 1)))[0];
  const topB = [...b.subjectScores].sort((x, y) => (y.obtained / (y.max || 1)) - (x.obtained / (x.max || 1)))[0];
  const pctA = topA && topA.max > 0 ? topA.obtained / topA.max : 0;
  const pctB = topB && topB.max > 0 ? topB.obtained / topB.max : 0;
  return pctA - pctB;
}

async function upsertExamConfiguration(institutionId: string, academicYear: string, data: ReturnType<typeof loadEvaluationSetupFromInstitution>['marksConfig']) {
  const payload = {
    maxMarks: data.maxMarks,
    graceMarks: data.graceMarks,
    weightageEnabled: data.weightageEnabled,
    componentWeightages: data.componentWeightages as Prisma.InputJsonValue,
    weightageSumValid: data.weightageSumValid,
    rulesLocked: data.rulesLocked,
  };
  return prisma.examConfiguration.upsert({
    where: { institutionId_academicYear: { institutionId, academicYear } },
    create: { institutionId, academicYear, ...payload },
    update: payload,
  });
}

async function upsertGradingRule(institutionId: string, academicYear: string, data: ReturnType<typeof loadEvaluationSetupFromInstitution>['gradingRule']) {
  const payload = {
    passMarks: data.passMarks,
    passGrade: data.passGrade,
    aggregatedPassPercent: data.aggregatedPassPercent,
    minComponentPassPercent: data.minComponentPassPercent,
    componentRules: data.componentRules as Prisma.InputJsonValue,
    rulesActive: data.rulesActive,
  };
  return prisma.examGradingRule.upsert({
    where: { institutionId_academicYear: { institutionId, academicYear } },
    create: { institutionId, academicYear, ...payload },
    update: payload,
  });
}

async function upsertGpaScale(institutionId: string, academicYear: string, data: ReturnType<typeof loadEvaluationSetupFromInstitution>['gpaScale']) {
  const matrix = resolveGradeMatrix(data.scaleType, data.gradeMatrix);
  return prisma.examGpaScale.upsert({
    where: { institutionId_academicYear: { institutionId, academicYear } },
    create: {
      institutionId,
      academicYear,
      scaleType: data.scaleType,
      formulaNotes: data.formulaNotes,
      gradeMatrix: matrix as Prisma.InputJsonValue,
      creditWeighting: data.creditWeighting as Prisma.InputJsonValue,
    },
    update: {
      scaleType: data.scaleType,
      formulaNotes: data.formulaNotes,
      gradeMatrix: matrix as Prisma.InputJsonValue,
      creditWeighting: data.creditWeighting as Prisma.InputJsonValue,
    },
  });
}

async function upsertRankConfig(institutionId: string, academicYear: string, data: ReturnType<typeof loadEvaluationSetupFromInstitution>['rankConfig']) {
  return prisma.examRankConfig.upsert({
    where: { institutionId_academicYear: { institutionId, academicYear } },
    create: {
      institutionId,
      academicYear,
      rankMethod: data.rankMethod,
      tieRule: data.tieRule,
      rankScope: data.rankScope,
      exemptedSubjects: data.exemptedSubjects,
    },
    update: {
      rankMethod: data.rankMethod,
      tieRule: data.tieRule,
      rankScope: data.rankScope,
      exemptedSubjects: data.exemptedSubjects,
    },
  });
}

async function syncExamPeriods(
  institutionId: string,
  academicYear: string,
  setup: ReturnType<typeof loadEvaluationSetupFromInstitution>,
) {
  const parsed = parseExamPeriodsText(setup.examPeriodsText);
  let created = 0;
  let updated = 0;
  const conflicts: string[] = [];

  for (let i = 0; i < parsed.length; i++) {
    for (let j = i + 1; j < parsed.length; j++) {
      const a = parsed[i];
      const b = parsed[j];
      if (a.startDate <= b.endDate && b.startDate <= a.endDate) {
        conflicts.push(`Overlap: ${a.periodName} and ${b.periodName}`);
      }
    }
  }

  const globalDeadline = setup.marksEntryDeadline ? new Date(setup.marksEntryDeadline) : null;
  const globalCutoff = setup.registrationCutoff ? new Date(setup.registrationCutoff) : null;

  for (const period of parsed) {
    const existing = await prisma.examPeriod.findFirst({
      where: { institutionId, academicYear, periodName: period.periodName },
    });
    const payload = {
      startDate: period.startDate,
      endDate: period.endDate,
      registrationCutoff: globalCutoff,
      marksEntryDeadline: globalDeadline || period.endDate,
      isPublished: true,
      conflictNotes: conflicts.join('; '),
    };
    if (existing) {
      await prisma.examPeriod.update({ where: { id: existing.id }, data: payload });
      updated += 1;
    } else {
      await prisma.examPeriod.create({
        data: { institutionId, academicYear, periodName: period.periodName, ...payload },
      });
      created += 1;
    }
  }

  return { created, updated, conflicts, periods: parsed.length };
}

export async function syncEvaluationEngineFromSetup(institutionId: string, academicYear?: string) {
  const year = academicYear || (await getDefaultAcademicYear(institutionId));
  const setup = await prisma.institutionSetup.findUnique({ where: { institutionId } });
  const loaded = loadEvaluationSetupFromInstitution(setup);

  const weightageValidation = validateComponentWeightages(
    loaded.marksConfig.componentWeightages,
    loaded.marksConfig.weightageEnabled,
  );

  const marksConfig = await upsertExamConfiguration(institutionId, year, {
    ...loaded.marksConfig,
    weightageSumValid: weightageValidation.valid,
    rulesLocked: weightageValidation.valid,
  });

  const gradingRule = await upsertGradingRule(institutionId, year, loaded.gradingRule);
  const gpaScale = await upsertGpaScale(institutionId, year, loaded.gpaScale);
  const rankConfig = await upsertRankConfig(institutionId, year, loaded.rankConfig);
  const examPeriods = await syncExamPeriods(institutionId, year, loaded);

  await prisma.examResultAuditLog.create({
    data: {
      institutionId,
      entityType: 'EVALUATION_ENGINE',
      entityId: marksConfig.id,
      action: 'SYNC_FROM_SETUP',
      actor: 'system',
      details: `Synced evaluation engine for ${year}. Weightage valid: ${weightageValidation.valid}`,
    },
  });

  return {
    academicYear: year,
    marksConfig,
    gradingRule,
    gpaScale,
    rankConfig,
    examPeriods,
    weightageValidation,
  };
}

export async function getEvaluationEngine(institutionId: string, academicYear?: string) {
  const year = academicYear || (await getDefaultAcademicYear(institutionId));
  let [marksConfig, gradingRule, gpaScale, rankConfig, examPeriods] = await Promise.all([
    prisma.examConfiguration.findUnique({ where: { institutionId_academicYear: { institutionId, academicYear: year } } }),
    prisma.examGradingRule.findUnique({ where: { institutionId_academicYear: { institutionId, academicYear: year } } }),
    prisma.examGpaScale.findUnique({ where: { institutionId_academicYear: { institutionId, academicYear: year } } }),
    prisma.examRankConfig.findUnique({ where: { institutionId_academicYear: { institutionId, academicYear: year } } }),
    prisma.examPeriod.findMany({ where: { institutionId, academicYear: year }, orderBy: { startDate: 'asc' } }),
  ]);

  if (!marksConfig) {
    await syncEvaluationEngineFromSetup(institutionId, year);
    [marksConfig, gradingRule, gpaScale, rankConfig, examPeriods] = await Promise.all([
      prisma.examConfiguration.findUnique({ where: { institutionId_academicYear: { institutionId, academicYear: year } } }),
      prisma.examGradingRule.findUnique({ where: { institutionId_academicYear: { institutionId, academicYear: year } } }),
      prisma.examGpaScale.findUnique({ where: { institutionId_academicYear: { institutionId, academicYear: year } } }),
      prisma.examRankConfig.findUnique({ where: { institutionId_academicYear: { institutionId, academicYear: year } } }),
      prisma.examPeriod.findMany({ where: { institutionId, academicYear: year }, orderBy: { startDate: 'asc' } }),
    ]);
  }

  const matrix = resolveGradeMatrix(gpaScale?.scaleType || '10 Point', gpaScale?.gradeMatrix);

  return {
    academicYear: year,
    marksConfig,
    gradingRule,
    gpaScale: gpaScale ? { ...gpaScale, resolvedMatrix: matrix } : null,
    rankConfig,
    examPeriods,
    computeGrade: (pct: number) => computeGradeFromScale(pct, matrix),
    computeGpa: (pct: number) => computeGpaFromScale(pct, matrix),
  };
}

export async function assertMarksEntryAllowed(
  institutionId: string,
  academicYear: string,
  examinationName?: string,
) {
  const periods = await prisma.examPeriod.findMany({
    where: { institutionId, academicYear, isPublished: true },
    orderBy: { marksEntryDeadline: 'asc' },
  });

  const now = new Date();
  const matching = examinationName
    ? periods.filter((p) => p.periodName.toLowerCase().includes(examinationName.toLowerCase()))
    : periods;

  const active = matching.length > 0 ? matching : periods;
  for (const period of active) {
    if (period.marksEntryDeadline && now > period.marksEntryDeadline) {
      throw new Error(
        `Marks entry locked — deadline for "${period.periodName}" was ${period.marksEntryDeadline.toLocaleDateString()}`,
      );
    }
  }
}

export async function onExamEvaluationTileSaved(institutionId: string, tileKey: string) {
  if (tileKey === 'gradeMarksSetup' || tileKey === 'sessionTermSetup') {
    return { evaluationEngine: await syncEvaluationEngineFromSetup(institutionId) };
  }
  return null;
}
