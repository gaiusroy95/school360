import type {
  AcademicClassTest,
  AcademicClassTestScore,
  AcademicLessonPlan,
  BloomsTaxonomyLevel,
  ClassTestScoreBucket,
} from '@prisma/client';
import { prisma } from './prisma.js';
import { formatClassSection } from './students.js';
import { nextAcademicRecordId } from './academicManagement.js';

export const BLOOMS_LABELS: Record<BloomsTaxonomyLevel, string> = {
  REMEMBER: 'Remember',
  UNDERSTAND: 'Understand',
  APPLY: 'Apply',
  ANALYZE: 'Analyze',
  EVALUATE: 'Evaluate',
  CREATE: 'Create',
};

export const BUCKET_LABELS: Record<ClassTestScoreBucket, string> = {
  EXCELLENT: '80% – 100%',
  GOOD: '60% – 79.99%',
  AVERAGE: '36% – 59.99%',
  BELOW: 'Below 36%',
};

export function scoreToBucket(percentage: number): ClassTestScoreBucket {
  if (percentage >= 80) return 'EXCELLENT';
  if (percentage >= 60) return 'GOOD';
  if (percentage >= 36) return 'AVERAGE';
  return 'BELOW';
}

export type ResultBuckets = {
  excellent: number;
  good: number;
  average: number;
  below: number;
  total: number;
  avgPercentage: number;
};

export function computeResultBuckets(scores: { percentage: number; bucket: ClassTestScoreBucket }[]): ResultBuckets {
  const buckets = { excellent: 0, good: 0, average: 0, below: 0 };
  for (const s of scores) {
    if (s.bucket === 'EXCELLENT') buckets.excellent += 1;
    else if (s.bucket === 'GOOD') buckets.good += 1;
    else if (s.bucket === 'AVERAGE') buckets.average += 1;
    else buckets.below += 1;
  }
  const total = scores.length;
  const avgPercentage = total
    ? Math.round((scores.reduce((sum, s) => sum + s.percentage, 0) / total) * 100) / 100
    : 0;
  return { ...buckets, total, avgPercentage };
}

export function serializeClassTest(
  row: AcademicClassTest,
  scores?: AcademicClassTestScore[],
) {
  const bucketData = computeResultBuckets(scores || []);
  return {
    id: row.id,
    recordId: row.recordId,
    lessonPlanId: row.lessonPlanId,
    academicYear: row.academicYear,
    term: row.term,
    className: row.className,
    sectionName: row.sectionName,
    classGroup: formatClassSection(row.className, row.sectionName),
    subjectName: row.subjectName,
    teacherName: row.teacherName,
    title: row.title,
    maxMarks: row.maxMarks,
    conductedDate: row.conductedDate?.toISOString() ?? null,
    status: row.status,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    isPublished: Boolean(row.publishedAt),
    resultBuckets: bucketData,
    resultSummary: {
      excellent: { label: BUCKET_LABELS.EXCELLENT, count: bucketData.excellent },
      good: { label: BUCKET_LABELS.GOOD, count: bucketData.good },
      average: { label: BUCKET_LABELS.AVERAGE, count: bucketData.average },
      below: { label: BUCKET_LABELS.BELOW, count: bucketData.below },
    },
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function serializeClassTestScore(row: AcademicClassTestScore & { student?: { firstName: string; lastName: string; admissionNumber: string } }) {
  return {
    id: row.id,
    studentId: row.studentId,
    studentName: row.student ? [row.student.firstName, row.student.lastName].filter(Boolean).join(' ') : '',
    admissionNumber: row.student?.admissionNumber || '',
    marksObtained: row.marksObtained,
    maxMarks: row.maxMarks,
    percentage: row.percentage,
    bucket: row.bucket,
    bucketLabel: BUCKET_LABELS[row.bucket],
  };
}

export function serializeLessonPlanExtended(
  row: AcademicLessonPlan,
  classTest?: ReturnType<typeof serializeClassTest> | null,
) {
  return {
    id: row.id,
    recordId: row.recordId,
    academicYear: row.academicYear,
    term: row.term,
    className: row.className,
    sectionName: row.sectionName,
    classGroup: formatClassSection(row.className, row.sectionName),
    subjectName: row.subjectName,
    department: row.department,
    title: row.title,
    teacherName: row.teacherName,
    objective: row.objective,
    teachingMethod: row.teachingMethod,
    propsUsed: row.propsUsed,
    bloomsLevel: row.bloomsLevel,
    bloomsLevelLabel: BLOOMS_LABELS[row.bloomsLevel],
    resultMeasurement: row.resultMeasurement,
    syllabusChapterId: row.syllabusChapterId,
    plannedDate: row.plannedDate?.toISOString() ?? null,
    status: row.status,
    completionPercent: row.completionPercent,
    sharedAt: row.sharedAt?.toISOString() ?? null,
    notes: row.notes,
    resources: Array.isArray(row.resources) ? row.resources : [],
    classTest: classTest ?? null,
    hasClassTest: Boolean(classTest),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getLessonPlanWithResults(institutionId: string, lessonPlanId: string) {
  const plan = await prisma.academicLessonPlan.findFirst({
    where: { institutionId, id: lessonPlanId },
  });
  if (!plan) return null;

  const test = await prisma.academicClassTest.findFirst({
    where: { institutionId, lessonPlanId },
    include: { scores: { include: { student: { select: { firstName: true, lastName: true, admissionNumber: true } } } } },
  });

  const serializedTest = test ? serializeClassTest(test, test.scores) : null;
  return {
    ...serializeLessonPlanExtended(plan, serializedTest),
    scores: test?.scores.map(serializeClassTestScore) || [],
  };
}

export async function createClassTestForLessonPlan(
  institutionId: string,
  lessonPlanId: string,
  data?: { title?: string; maxMarks?: number; conductedDate?: string },
) {
  const plan = await prisma.academicLessonPlan.findFirst({ where: { institutionId, id: lessonPlanId } });
  if (!plan) throw new Error('Lesson plan not found');

  const existing = await prisma.academicClassTest.findFirst({ where: { institutionId, lessonPlanId } });
  if (existing) return serializeClassTest(existing, []);

  const recordId = await nextAcademicRecordId(institutionId, 'classTest');
  const row = await prisma.academicClassTest.create({
    data: {
      institutionId,
      recordId,
      lessonPlanId,
      academicYear: plan.academicYear,
      term: plan.term,
      className: plan.className,
      sectionName: plan.sectionName,
      subjectName: plan.subjectName,
      teacherName: plan.teacherName,
      title: data?.title || `Class Test — ${plan.subjectName}: ${plan.title}`,
      maxMarks: data?.maxMarks ?? 100,
      conductedDate: data?.conductedDate ? new Date(data.conductedDate) : null,
      status: 'Scheduled',
    },
  });

  await prisma.academicCceRecord.create({
    data: {
      institutionId,
      recordId: await nextAcademicRecordId(institutionId, 'cce'),
      academicYear: plan.academicYear,
      term: plan.term,
      className: plan.className,
      sectionName: plan.sectionName,
      cceType: 'UNIT_TEST',
      title: row.title,
      subjectName: plan.subjectName,
      conductedDate: row.conductedDate,
      maxMarks: row.maxMarks,
      status: 'Scheduled',
    },
  });

  return serializeClassTest(row, []);
}

export async function submitClassTestScores(
  institutionId: string,
  classTestId: string,
  scores: { studentId: string; marksObtained: number }[],
) {
  const test = await prisma.academicClassTest.findFirst({
    where: { institutionId, id: classTestId },
    include: { lessonPlan: true },
  });
  if (!test) throw new Error('Class test not found');

  let upserted = 0;
  for (const s of scores) {
    const percentage = Math.round((s.marksObtained / test.maxMarks) * 10000) / 100;
    const bucket = scoreToBucket(percentage);
    await prisma.academicClassTestScore.upsert({
      where: { classTestId_studentId: { classTestId, studentId: s.studentId } },
      create: {
        institutionId,
        classTestId,
        studentId: s.studentId,
        marksObtained: s.marksObtained,
        maxMarks: test.maxMarks,
        percentage,
        bucket,
      },
      update: {
        marksObtained: s.marksObtained,
        maxMarks: test.maxMarks,
        percentage,
        bucket,
      },
    });
    upserted += 1;

    await syncStudentAnalyticsFromClassTest(institutionId, s.studentId, test.lessonPlan.academicYear, percentage);
  }

  const allScores = await prisma.academicClassTestScore.findMany({ where: { classTestId } });
  const buckets = computeResultBuckets(allScores);

  await prisma.academicClassTest.update({
    where: { id: classTestId },
    data: {
      status: 'Conducted',
      conductedDate: test.conductedDate || new Date(),
      publishedAt: new Date(),
    },
  });

  await prisma.academicCceRecord.updateMany({
    where: {
      institutionId,
      academicYear: test.academicYear,
      className: test.className,
      sectionName: test.sectionName,
      subjectName: test.subjectName,
      title: test.title,
    },
    data: {
      status: 'Conducted',
      evaluatedCount: allScores.length,
      conductedDate: new Date(),
    },
  });

  return { upserted, buckets, publishedAt: new Date().toISOString() };
}

async function syncStudentAnalyticsFromClassTest(
  institutionId: string,
  studentId: string,
  academicYear: string,
  latestPercentage: number,
) {
  const record = await prisma.studentAnalyticsRecord.findFirst({
    where: { institutionId, studentId, academicYear },
  });
  if (!record) return;

  const scores = (record.scores || {}) as Record<string, number>;
  const allStudentScores = await prisma.academicClassTestScore.findMany({
    where: { institutionId, studentId, classTest: { academicYear } },
  });
  const avgClassTest =
    allStudentScores.length
      ? allStudentScores.reduce((s, r) => s + r.percentage, 0) / allStudentScores.length
      : latestPercentage;

  const academicPerformance = Math.round(avgClassTest * 100) / 100;
  const updatedScores = {
    ...scores,
    academicPerformance,
    classTestAvg: academicPerformance,
    lastClassTestScore: latestPercentage,
    lessonPlanPerformance: academicPerformance,
  };

  await prisma.studentAnalyticsRecord.update({
    where: { id: record.id },
    data: {
      scores: updatedScores,
      computedAt: new Date(),
    },
  });

  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (student) {
    const custom = (student.customFields || {}) as Record<string, unknown>;
    const analytics = (custom.analytics || {}) as Record<string, unknown>;
    await prisma.student.update({
      where: { id: studentId },
      data: {
        customFields: {
          ...custom,
          analytics: {
            ...analytics,
            academicPerformance,
            classTestAvg: academicPerformance,
            lastClassTestScore: latestPercentage,
          },
        },
      },
    });
  }
}

export async function listClassTests(
  institutionId: string,
  opts: { academicYear?: string; className?: string; sectionName?: string; status?: string },
) {
  const rows = await prisma.academicClassTest.findMany({
    where: {
      institutionId,
      ...(opts.academicYear ? { academicYear: opts.academicYear } : {}),
      ...(opts.className ? { className: opts.className } : {}),
      ...(opts.sectionName ? { sectionName: opts.sectionName } : {}),
      ...(opts.status ? { status: opts.status } : {}),
    },
    include: { scores: true, lessonPlan: { select: { title: true, objective: true, bloomsLevel: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((r) => ({
    ...serializeClassTest(r, r.scores),
    lessonPlanTitle: r.lessonPlan.title,
    lessonObjective: r.lessonPlan.objective,
    bloomsLevel: r.lessonPlan.bloomsLevel,
  }));
}

export async function getMobileLessonAnalytics(
  institutionId: string,
  opts: { studentId: string; academicYear?: string },
) {
  const student = await prisma.student.findFirst({
    where: { institutionId, id: opts.studentId },
    select: { id: true, firstName: true, lastName: true, className: true, sectionName: true, academicYear: true },
  });
  if (!student) throw new Error('Student not found');

  const year = opts.academicYear || student.academicYear;
  const scores = await prisma.academicClassTestScore.findMany({
    where: {
      institutionId,
      studentId: student.id,
      classTest: { academicYear: year, publishedAt: { not: null } },
    },
    include: {
      classTest: {
        include: { lessonPlan: { select: { title: true, subjectName: true, objective: true, bloomsLevel: true } } },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  const analytics = await prisma.studentAnalyticsRecord.findFirst({
    where: { institutionId, studentId: student.id, academicYear: year },
  });
  const analyticsScores = (analytics?.scores || {}) as Record<string, number>;

  const bySubject = new Map<string, { scores: number[]; tests: typeof scores }>();
  for (const s of scores) {
    const subj = s.classTest.subjectName;
    const cur = bySubject.get(subj) || { scores: [], tests: [] };
    cur.scores.push(s.percentage);
    cur.tests.push(s);
    bySubject.set(subj, cur);
  }

  const subjectPerformance = [...bySubject.entries()].map(([subjectName, data]) => ({
    subjectName,
    avgScore: Math.round((data.scores.reduce((a, b) => a + b, 0) / data.scores.length) * 100) / 100,
    testCount: data.tests.length,
    latestBucket: data.tests[0]?.bucket,
    latestBucketLabel: data.tests[0] ? BUCKET_LABELS[data.tests[0].bucket] : null,
  }));

  const overallBuckets = computeResultBuckets(scores);

  return {
    studentId: student.id,
    studentName: [student.firstName, student.lastName].filter(Boolean).join(' '),
    className: student.className,
    sectionName: student.sectionName,
    classGroup: formatClassSection(student.className, student.sectionName),
    academicYear: year,
    academicPerformance: analyticsScores.academicPerformance ?? overallBuckets.avgPercentage,
    classTestAvg: analyticsScores.classTestAvg ?? overallBuckets.avgPercentage,
    overallBuckets: {
      excellent: { label: BUCKET_LABELS.EXCELLENT, count: overallBuckets.excellent },
      good: { label: BUCKET_LABELS.GOOD, count: overallBuckets.good },
      average: { label: BUCKET_LABELS.AVERAGE, count: overallBuckets.average },
      below: { label: BUCKET_LABELS.BELOW, count: overallBuckets.below },
    },
    subjectPerformance,
    recentTests: scores.slice(0, 10).map((s) => ({
      id: s.classTest.id,
      title: s.classTest.title,
      subjectName: s.classTest.subjectName,
      lessonTitle: s.classTest.lessonPlan.title,
      lessonObjective: s.classTest.lessonPlan.objective,
      bloomsLevel: s.classTest.lessonPlan.bloomsLevel,
      marksObtained: s.marksObtained,
      maxMarks: s.maxMarks,
      percentage: s.percentage,
      bucket: s.bucket,
      bucketLabel: BUCKET_LABELS[s.bucket],
      conductedDate: s.classTest.conductedDate?.toISOString() ?? null,
    })),
    lastUpdated: analytics?.computedAt?.toISOString() ?? new Date().toISOString(),
  };
}
