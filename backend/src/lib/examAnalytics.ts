import {
  ExamMarkingSheetStatus,
  ExamTypeFilter,
  StudentStatus,
} from '@prisma/client';
import { prisma } from './prisma.js';
import { getInstitutionFilterMeta } from './students.js';
import { getExamDashboard, getExamDashboardMeta, seedExamDashboardDemo } from './examDashboard.js';
import { seedMarksEntryDemo } from './examMarksEntry.js';
import { seedResultProcessingDemo } from './examResultProcessing.js';

const EXAM_TYPE_LABELS: Record<ExamTypeFilter, string> = {
  UNIT_TEST: 'Unit Test',
  MID_TERM: 'Mid Term Examination',
  HALF_YEARLY: 'Half Yearly Examination',
  PRE_FINAL: 'Pre Final Examination',
  FINAL_EXAMINATION: 'Final Examination',
};

const GRADE_ORDER = ['A+', 'A', 'B+', 'B', 'C', 'D', 'F'];

function parseExamType(raw?: string): ExamTypeFilter {
  if (!raw || raw === 'all') return ExamTypeFilter.FINAL_EXAMINATION;
  const map: Record<string, ExamTypeFilter> = {
    UNIT_TEST: ExamTypeFilter.UNIT_TEST,
    MID_TERM: ExamTypeFilter.MID_TERM,
    HALF_YEARLY: ExamTypeFilter.HALF_YEARLY,
    PRE_FINAL: ExamTypeFilter.PRE_FINAL,
    FINAL_EXAMINATION: ExamTypeFilter.FINAL_EXAMINATION,
  };
  return map[raw] || ExamTypeFilter.FINAL_EXAMINATION;
}

type SubjectScore = { subjectName?: string; subject?: string; obtained?: number; max?: number; percentage?: number };

function parseSubjectScores(raw: unknown): SubjectScore[] {
  if (!Array.isArray(raw)) return [];
  return raw as SubjectScore[];
}

async function computeTeacherWorkAnalytics(institutionId: string, academicYear: string) {
  const assignments = await prisma.examSubjectTeacherAssignment.findMany({
    where: { institutionId, academicYear },
    orderBy: [{ teacherName: 'asc' }, { className: 'asc' }],
    include: {
      markingSheets: {
        include: {
          cells: { select: { marksObtained: true, isAbsent: true } },
        },
      },
    },
  });

  const workItems = assignments.map((a) => {
    const sheet = a.markingSheets[0];
    const totalCells = sheet?.cells.length ?? 0;
    const filledCells = sheet?.cells.filter((c) => c.marksObtained !== null || c.isAbsent).length ?? 0;
    const progress = totalCells ? Math.round((filledCells / totalCells) * 100) : 0;
    const status = sheet?.status ?? ExamMarkingSheetStatus.DRAFT;
    const completeStatuses: ExamMarkingSheetStatus[] = [
      ExamMarkingSheetStatus.SUBMITTED,
      ExamMarkingSheetStatus.APPROVED,
      ExamMarkingSheetStatus.LOCKED,
    ];
    const isComplete = completeStatuses.includes(status);
    const isPending = !isComplete && (status === ExamMarkingSheetStatus.DRAFT || progress < 100);
    const isReturned = status === ExamMarkingSheetStatus.RETURNED;

    return {
      assignmentId: a.id,
      recordId: a.recordId,
      teacherName: a.teacherName,
      teacherEmail: a.teacherEmail,
      teacherPhone: a.teacherPhone,
      className: a.className,
      sectionName: a.sectionName,
      classGroup: a.sectionName ? `${a.className} — ${a.sectionName}` : a.className,
      subjectName: a.subjectName,
      examinationName: a.examinationName,
      studentCount: a.studentCount,
      assignedColumns: a.assignedColumns,
      sheetId: sheet?.id ?? null,
      sheetStatus: status,
      marksEntered: filledCells,
      marksTotal: totalCells,
      progress,
      isPending,
      isComplete,
      isReturned,
      submittedAt: sheet?.submittedAt?.toISOString() ?? null,
    };
  });

  const teacherMap = new Map<string, {
    teacherName: string;
    teacherEmail: string;
    teacherPhone: string;
    totalAssignments: number;
    pendingAssignments: number;
    completedAssignments: number;
    returnedAssignments: number;
    overallProgress: number;
    subjects: string[];
    classGroups: string[];
  }>();

  for (const item of workItems) {
    const existing = teacherMap.get(item.teacherName) || {
      teacherName: item.teacherName,
      teacherEmail: item.teacherEmail,
      teacherPhone: item.teacherPhone,
      totalAssignments: 0,
      pendingAssignments: 0,
      completedAssignments: 0,
      returnedAssignments: 0,
      overallProgress: 0,
      subjects: [],
      classGroups: [],
    };
    existing.totalAssignments += 1;
    if (item.isPending) existing.pendingAssignments += 1;
    if (item.isComplete) existing.completedAssignments += 1;
    if (item.isReturned) existing.returnedAssignments += 1;
    if (!existing.subjects.includes(item.subjectName)) existing.subjects.push(item.subjectName);
    if (!existing.classGroups.includes(item.classGroup)) existing.classGroups.push(item.classGroup);
    teacherMap.set(item.teacherName, existing);
  }

  const teacherSummaries = [...teacherMap.values()].map((t) => {
    const items = workItems.filter((w) => w.teacherName === t.teacherName);
    const avgProgress = items.length
      ? Math.round(items.reduce((s, i) => s + i.progress, 0) / items.length)
      : 0;
    return { ...t, overallProgress: avgProgress };
  });

  const assignedTeachers = teacherSummaries.sort((a, b) => a.teacherName.localeCompare(b.teacherName));
  const pendingTeachers = assignedTeachers.filter((t) => t.pendingAssignments > 0);
  const completedTeachers = assignedTeachers.filter((t) => t.pendingAssignments === 0 && t.totalAssignments > 0);

  return {
    summary: {
      totalAssignments: workItems.length,
      pendingAssignments: workItems.filter((w) => w.isPending).length,
      completedAssignments: workItems.filter((w) => w.isComplete).length,
      returnedAssignments: workItems.filter((w) => w.isReturned).length,
      assignedTeachers: assignedTeachers.length,
      pendingTeachers: pendingTeachers.length,
      completedTeachers: completedTeachers.length,
    },
    workItems,
    assignedTeachers,
    pendingTeachers,
    completedTeachers,
  };
}

async function computeMarksAnalytics(institutionId: string, academicYear: string) {
  const batches = await prisma.examResultBatch.findMany({
    where: { institutionId, academicYear },
    orderBy: [{ className: 'asc' }, { sectionName: 'asc' }],
    include: {
      studentResults: {
        select: {
          studentName: true,
          admissionNumber: true,
          percentage: true,
          grade: true,
          rank: true,
          totalObtained: true,
          totalMax: true,
          subjectScores: true,
        },
      },
    },
  });

  const classAnalytics = batches.map((b) => ({
    className: b.className,
    sectionName: b.sectionName,
    classGroup: b.sectionName ? `${b.className} — ${b.sectionName}` : b.className,
    examinationName: b.examinationName,
    status: b.status,
    totalStudents: b.totalStudents,
    averagePercent: Math.round(b.averagePercent * 10) / 10,
    passPercent: Math.round(b.passPercent * 10) / 10,
    passCount: b.studentResults.filter((r) => r.percentage >= 36).length,
    failCount: b.studentResults.filter((r) => r.percentage < 36).length,
  }));

  const subjectMap = new Map<string, { totalObtained: number; totalMax: number; count: number }>();
  const gradeMap = new Map<string, number>();
  const allResults: {
    studentName: string;
    admissionNumber: string;
    percentage: number;
    grade: string;
    rank: number;
    classGroup: string;
  }[] = [];

  for (const batch of batches) {
    for (const result of batch.studentResults) {
      allResults.push({
        studentName: result.studentName,
        admissionNumber: result.admissionNumber,
        percentage: result.percentage,
        grade: result.grade,
        rank: result.rank,
        classGroup: batch.sectionName ? `${batch.className} — ${batch.sectionName}` : batch.className,
      });

      const grade = result.grade || 'F';
      gradeMap.set(grade, (gradeMap.get(grade) || 0) + 1);

      for (const sub of parseSubjectScores(result.subjectScores)) {
        const name = sub.subjectName || sub.subject || 'Unknown';
        const obtained = sub.obtained ?? 0;
        const max = sub.max ?? 0;
        const existing = subjectMap.get(name) || { totalObtained: 0, totalMax: 0, count: 0 };
        existing.totalObtained += obtained;
        existing.totalMax += max;
        existing.count += 1;
        subjectMap.set(name, existing);
      }
    }
  }

  const subjectAnalytics = [...subjectMap.entries()]
    .map(([subjectName, data]) => ({
      subjectName,
      averagePercent: data.totalMax
        ? Math.round((data.totalObtained / data.totalMax) * 1000) / 10
        : 0,
      studentCount: data.count,
    }))
    .sort((a, b) => b.averagePercent - a.averagePercent);

  const gradeDistribution = GRADE_ORDER
    .filter((g) => gradeMap.has(g))
    .map((grade) => ({
      grade,
      count: gradeMap.get(grade) || 0,
      percentage: allResults.length
        ? Math.round(((gradeMap.get(grade) || 0) / allResults.length) * 1000) / 10
        : 0,
    }));

  const extraGrades = [...gradeMap.keys()].filter((g) => !GRADE_ORDER.includes(g));
  for (const grade of extraGrades) {
    gradeDistribution.push({
      grade,
      count: gradeMap.get(grade) || 0,
      percentage: allResults.length
        ? Math.round(((gradeMap.get(grade) || 0) / allResults.length) * 1000) / 10
        : 0,
    });
  }

  const sorted = [...allResults].sort((a, b) => b.percentage - a.percentage);
  const topPerformers = sorted.slice(0, 10).map((r, i) => ({
    rank: i + 1,
    name: r.studentName,
    admissionNumber: r.admissionNumber,
    classGroup: r.classGroup,
    percentage: Math.round(r.percentage * 10) / 10,
    grade: r.grade,
  }));

  const bottomPerformers = sorted
    .filter((r) => r.percentage < 50)
    .slice(-10)
    .reverse()
    .map((r, i) => ({
      rank: i + 1,
      name: r.studentName,
      admissionNumber: r.admissionNumber,
      classGroup: r.classGroup,
      percentage: Math.round(r.percentage * 10) / 10,
      grade: r.grade,
    }));

  const overallAverage = allResults.length
    ? Math.round((allResults.reduce((s, r) => s + r.percentage, 0) / allResults.length) * 10) / 10
    : 0;
  const overallPass = allResults.length
    ? Math.round((allResults.filter((r) => r.percentage >= 36).length / allResults.length) * 1000) / 10
    : 0;

  return {
    hasLiveData: allResults.length > 0,
    overall: {
      totalStudents: allResults.length,
      averagePercent: overallAverage,
      passPercent: overallPass,
      failPercent: allResults.length ? Math.round((100 - overallPass) * 10) / 10 : 0,
      highest: sorted[0]?.percentage ?? 0,
      lowest: sorted[sorted.length - 1]?.percentage ?? 0,
    },
    classAnalytics,
    subjectAnalytics,
    gradeDistribution,
    topPerformers,
    bottomPerformers,
  };
}

export async function getExamAnalyticsMeta(institutionId: string) {
  const [dashboardMeta, filters] = await Promise.all([
    getExamDashboardMeta(institutionId),
    getInstitutionFilterMeta(institutionId),
  ]);
  return {
    ...dashboardMeta,
    sectionsByClass: filters.sectionsByClass,
    examTypeLabels: EXAM_TYPE_LABELS,
  };
}

export async function getExamAnalytics(
  institutionId: string,
  opts: { academicYear?: string; examType?: string; className?: string; sectionName?: string },
) {
  const academicYear = opts.academicYear || '2025-26';
  const examType = parseExamType(opts.examType);

  const [dashboard, teacherWork, marksAnalytics, revaluationCounts, studentCount] = await Promise.all([
    getExamDashboard(institutionId, { academicYear, examType: opts.examType }),
    computeTeacherWorkAnalytics(institutionId, academicYear),
    computeMarksAnalytics(institutionId, academicYear),
    prisma.examRevaluationRequest.groupBy({
      by: ['status'],
      where: { institutionId, academicYear },
      _count: { _all: true },
    }),
    prisma.student.count({ where: { institutionId, academicYear, status: StudentStatus.ACTIVE } }),
  ]);

  const revaluation = {
    received: revaluationCounts.reduce((s, r) => s + r._count._all, 0),
    underReview: revaluationCounts.find((r) => r.status === 'UNDER_REVIEW')?._count._all ?? 0,
    approved: revaluationCounts.find((r) => r.status === 'APPROVED')?._count._all ?? 0,
    rejected: revaluationCounts.find((r) => r.status === 'REJECTED')?._count._all ?? 0,
    pending: (revaluationCounts.find((r) => r.status === 'RECEIVED')?._count._all ?? 0)
      + (revaluationCounts.find((r) => r.status === 'FEE_PENDING')?._count._all ?? 0),
  };

  let filteredClassAnalytics = marksAnalytics.classAnalytics;
  let filteredWorkItems = teacherWork.workItems;
  if (opts.className) {
    filteredClassAnalytics = filteredClassAnalytics.filter((c) => c.className === opts.className);
    filteredWorkItems = filteredWorkItems.filter((w) => w.className === opts.className);
  }
  if (opts.sectionName) {
    filteredClassAnalytics = filteredClassAnalytics.filter((c) => c.sectionName === opts.sectionName);
    filteredWorkItems = filteredWorkItems.filter((w) => w.sectionName === opts.sectionName);
  }

  const overview = {
    studentsRegistered: studentCount,
    examsConducted: dashboard.kpis.examsConducted,
    resultsDeclared: dashboard.kpis.resultsDeclared,
    averagePassPercent: marksAnalytics.hasLiveData
      ? marksAnalytics.overall.passPercent
      : dashboard.kpis.averagePassPercent,
    averagePercent: marksAnalytics.hasLiveData
      ? marksAnalytics.overall.averagePercent
      : dashboard.resultSummary?.average ?? dashboard.examAnalytics?.average ?? 0,
    totalStudentsWithResults: marksAnalytics.overall.totalStudents,
    highestPercent: marksAnalytics.overall.highest || dashboard.resultSummary?.highest || 0,
  };

  return {
    academicYear,
    examType,
    examTypeLabel: EXAM_TYPE_LABELS[examType],
    generatedAt: new Date().toISOString(),
    overview,
    resultSummary: marksAnalytics.hasLiveData
      ? {
          appeared: marksAnalytics.overall.totalStudents,
          pass: Math.round(marksAnalytics.overall.totalStudents * marksAnalytics.overall.passPercent / 100),
          fail: marksAnalytics.overall.totalStudents - Math.round(marksAnalytics.overall.totalStudents * marksAnalytics.overall.passPercent / 100),
          passPercent: marksAnalytics.overall.passPercent,
          failPercent: marksAnalytics.overall.failPercent,
          highest: marksAnalytics.overall.highest,
          average: marksAnalytics.overall.averagePercent,
        }
      : dashboard.resultSummary,
    examAnalytics: dashboard.examAnalytics,
    performanceTrend: dashboard.performanceTrend,
    marksEntryStatus: dashboard.marksEntryStatus,
    classAnalytics: filteredClassAnalytics,
    subjectAnalytics: marksAnalytics.subjectAnalytics,
    gradeDistribution: marksAnalytics.gradeDistribution,
    topPerformers: marksAnalytics.topPerformers.length
      ? marksAnalytics.topPerformers
      : dashboard.topPerformers.map((t) => ({
          rank: t.rank,
          name: t.name,
          admissionNumber: '',
          classGroup: t.classGroup,
          percentage: parseFloat(t.percent.replace('%', '')),
          grade: '',
        })),
    bottomPerformers: marksAnalytics.bottomPerformers,
    teacherWork: {
      summary: teacherWork.summary,
      assignedTeachers: teacherWork.assignedTeachers,
      pendingTeachers: teacherWork.pendingTeachers,
      completedTeachers: teacherWork.completedTeachers,
      workItems: filteredWorkItems,
    },
    revaluation: dashboard.revaluation || revaluation,
    reportCards: dashboard.reportCards,
    questionBank: dashboard.questionBank,
  };
}

export async function seedExamAnalyticsDemo(institutionId: string, academicYear = '2025-26') {
  await seedExamDashboardDemo(institutionId, academicYear);
  await seedMarksEntryDemo(institutionId, academicYear);
  await seedResultProcessingDemo(institutionId, academicYear);
  return { seeded: true, message: 'Exam analytics demo data seeded' };
}
