import { ExamTypeFilter, StudentStatus } from '@prisma/client';
import { prisma } from './prisma.js';
import { getInstitutionFilterMeta } from './students.js';

export type ExamTypeParam = 'UNIT_TEST' | 'MID_TERM' | 'HALF_YEARLY' | 'PRE_FINAL' | 'FINAL_EXAMINATION' | 'all';

const EXAM_TYPE_LABELS: Record<ExamTypeFilter, string> = {
  UNIT_TEST: 'Unit Test',
  MID_TERM: 'Mid Term Examination',
  HALF_YEARLY: 'Half Yearly Examination',
  PRE_FINAL: 'Pre Final Examination',
  FINAL_EXAMINATION: 'Final Examination',
};

function formatDateDisplay(d: Date) {
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function parseExamType(raw?: string): ExamTypeFilter | undefined {
  if (!raw || raw === 'all') return undefined;
  const map: Record<string, ExamTypeFilter> = {
    UNIT_TEST: ExamTypeFilter.UNIT_TEST,
    'Unit Test': ExamTypeFilter.UNIT_TEST,
    MID_TERM: ExamTypeFilter.MID_TERM,
    'Mid Term Examination': ExamTypeFilter.MID_TERM,
    HALF_YEARLY: ExamTypeFilter.HALF_YEARLY,
    'Half Yearly Examination': ExamTypeFilter.HALF_YEARLY,
    PRE_FINAL: ExamTypeFilter.PRE_FINAL,
    'Pre Final Examination': ExamTypeFilter.PRE_FINAL,
    FINAL_EXAMINATION: ExamTypeFilter.FINAL_EXAMINATION,
    'Final Examination': ExamTypeFilter.FINAL_EXAMINATION,
  };
  return map[raw];
}

async function nextRecordId(institutionId: string, prefix: string) {
  const count = await prisma.examSchedule.count({ where: { institutionId } });
  return `${prefix}-${String(1000 + count + 1)}`;
}

export async function getExamDashboardMeta(institutionId: string) {
  const filters = await getInstitutionFilterMeta(institutionId);
  return {
    defaultAcademicYear: filters.defaultAcademicYear,
    academicYears: filters.academicYears,
    examTypes: Object.entries(EXAM_TYPE_LABELS).map(([id, label]) => ({ id, label })),
    classes: filters.classes,
  };
}

export async function getExamDashboard(
  institutionId: string,
  opts: { academicYear?: string; examType?: string },
) {
  const academicYear = opts.academicYear || '2025-26';
  const examType = parseExamType(opts.examType) || ExamTypeFilter.FINAL_EXAMINATION;

  const [
    stats,
    schedules,
    alerts,
    marksEntry,
    questionSubjects,
    topPerformers,
    performanceTrend,
    studentCount,
    classTestCount,
  ] = await Promise.all([
    prisma.examDashboardStats.findUnique({
      where: { institutionId_academicYear_examType: { institutionId, academicYear, examType } },
    }),
    prisma.examSchedule.findMany({
      where: { institutionId, academicYear, ...(opts.examType && opts.examType !== 'all' ? { examType } : {}) },
      orderBy: [{ sortOrder: 'asc' }, { startDate: 'asc' }],
    }),
    prisma.examAlert.findMany({
      where: { institutionId, academicYear },
      orderBy: [{ sortOrder: 'asc' }],
      take: 10,
    }),
    prisma.examMarksEntryProgress.findMany({
      where: { institutionId, academicYear, examType },
      orderBy: [{ sortOrder: 'asc' }],
    }),
    prisma.examQuestionSubjectStat.findMany({
      where: { institutionId, academicYear },
      orderBy: [{ sortOrder: 'asc' }],
    }),
    prisma.examTopPerformer.findMany({
      where: { institutionId, academicYear, examType },
      orderBy: [{ rank: 'asc' }],
      take: 10,
    }),
    prisma.examPerformanceTrend.findMany({
      where: { institutionId, academicYear },
      orderBy: [{ sortOrder: 'asc' }],
    }),
    prisma.student.count({ where: { institutionId, academicYear, status: StudentStatus.ACTIVE } }),
    prisma.academicClassTest.count({ where: { institutionId, academicYear } }),
  ]);

  const todayExam = schedules.find((s) => s.isToday) || null;
  const workflowSchedule = schedules.find((s) => s.examType === examType) || schedules[0];

  const kpis = {
    upcomingExams: stats?.upcomingExams ?? schedules.filter((s) => s.startDate >= new Date()).length,
    nextExamName: stats?.nextExamName || schedules[0]?.name || '—',
    nextExamDate: stats?.nextExamDate || (schedules[0] ? formatDateDisplay(schedules[0].startDate) : '—'),
    studentsRegistered: stats?.studentsRegistered || studentCount,
    examsConducted: stats?.examsConducted ?? schedules.filter((s) => s.conductPercent > 0).length,
    papersCreated: stats?.papersCreated || classTestCount * 3 || 0,
    resultsDeclared: stats?.resultsDeclared ?? schedules.filter((s) => s.publishPercent === 100).length,
    averagePassPercent: stats?.averagePassPercent ?? 92.6,
  };

  return {
    academicYear,
    examType,
    examTypeLabel: EXAM_TYPE_LABELS[examType],
    generatedAt: new Date().toISOString(),
    kpis,
    examSchedule: schedules.map((s) => ({
      id: s.id,
      name: s.name,
      classRange: s.classRange,
      startDate: formatDateDisplay(s.startDate),
      endDate: formatDateDisplay(s.endDate),
      subjectCount: s.subjectCount,
      studentCount: s.studentCount,
      examType: s.examType,
      examTypeLabel: EXAM_TYPE_LABELS[s.examType],
    })),
    workflow: workflowSchedule
      ? {
          steps: [
            { label: 'Plan Exam', desc: 'Create Exam, Set Schedule', percent: workflowSchedule.plannedPercent, color: 'green' },
            { label: 'Prepare', desc: 'Syllabus, Paper, Question Bank', percent: workflowSchedule.preparationPercent, color: 'blue' },
            { label: 'Conduct', desc: 'Seating, Invigilation, Exams', percent: workflowSchedule.conductPercent, color: 'orange' },
            { label: 'Evaluate', desc: 'Marks Entry, Evaluation', percent: workflowSchedule.evaluationPercent, color: 'purple' },
            { label: 'Publish', desc: 'Results, Report Cards', percent: workflowSchedule.publishPercent, color: 'slate' },
          ],
          currentStatus: [
            { label: 'Planned', percent: workflowSchedule.plannedPercent },
            { label: 'Preparation', percent: workflowSchedule.preparationPercent },
            { label: 'Conduct', percent: workflowSchedule.conductPercent },
            { label: 'Evaluation', percent: workflowSchedule.evaluationPercent },
            { label: 'Publish', percent: workflowSchedule.publishPercent },
          ],
        }
      : null,
    questionBank: {
      total: stats?.questionTotal ?? 0,
      subjective: stats?.questionSubjective ?? 0,
      objective: stats?.questionObjective ?? 0,
      withSolution: stats?.questionWithSolution ?? 0,
      subjectDistribution: questionSubjects.map((q) => ({
        name: q.subjectName,
        value: q.percentage,
        count: q.questionCount.toLocaleString('en-IN'),
        color: q.color,
      })),
    },
    todayExam: todayExam
      ? {
          title: todayExam.name,
          classGroup: todayExam.todaySection ? `${todayExam.classRange} - ${todayExam.todaySection}` : todayExam.classRange,
          date: formatDateDisplay(todayExam.startDate),
          startTime: todayExam.todayStartTime,
          endTime: todayExam.todayEndTime,
          subject: todayExam.todaySubject,
          totalStudents: todayExam.todayPresent + todayExam.todayAbsent,
          present: todayExam.todayPresent,
          absent: todayExam.todayAbsent,
        }
      : null,
    alerts: alerts.map((a) => ({
      id: a.id,
      type: a.alertType,
      title: a.title,
      description: a.description,
      date: a.alertDate ? formatDateDisplay(a.alertDate) : '',
    })),
    resultSummary: stats
      ? {
          appeared: stats.resultAppeared,
          pass: stats.resultPass,
          fail: stats.resultFail,
          passPercent: stats.resultAppeared ? Math.round((stats.resultPass / stats.resultAppeared) * 1000) / 10 : 0,
          failPercent: stats.resultAppeared ? Math.round((stats.resultFail / stats.resultAppeared) * 1000) / 10 : 0,
          highest: stats.resultHighest,
          average: stats.resultAverage,
        }
      : null,
    topPerformers: topPerformers.map((t) => ({
      rank: t.rank,
      name: t.studentName,
      classGroup: t.classGroup,
      percent: `${t.percentage}%`,
    })),
    performanceTrend: performanceTrend.map((p) => ({
      term: p.termLabel,
      average: p.averagePercent,
      pass: p.passPercent,
    })),
    marksEntryStatus: marksEntry.map((m) => {
      const pending = m.totalStudents - m.marksEntered;
      const progress = m.totalStudents ? Math.round((m.marksEntered / m.totalStudents) * 100) : 0;
      return {
        className: m.className,
        total: m.totalStudents,
        entered: m.marksEntered,
        pending,
        progress,
      };
    }),
    examAnalytics: stats
      ? {
          passPercent: stats.analyticsPassPercent,
          passDelta: stats.analyticsPassDelta,
          average: stats.analyticsAverage,
          averageDelta: stats.analyticsAverageDelta,
          improvement: stats.analyticsImprovement,
        }
      : null,
    revaluation: stats
      ? {
          received: stats.revaluationReceived,
          underReview: stats.revaluationUnderReview,
          approved: stats.revaluationApproved,
          rejected: stats.revaluationRejected,
        }
      : null,
    reportCards: stats
      ? {
          generated: stats.reportCardsGenerated,
          published: stats.reportCardsPublished,
          shared: stats.reportCardsShared,
          pending: stats.reportCardsPending,
        }
      : null,
  };
}

export async function seedExamDashboardDemo(institutionId: string, academicYear = '2025-26') {
  const existing = await prisma.examSchedule.count({ where: { institutionId } });
  if (existing > 0) {
    return { seeded: false, schedules: existing };
  }

  const studentCount = await prisma.student.count({
    where: { institutionId, academicYear, status: StudentStatus.ACTIVE },
  });
  const registered = studentCount || 5248;

  const schedules = [
    { recordId: 'EXM-1001', examType: ExamTypeFilter.UNIT_TEST, name: 'Unit Test - 1', classRange: 'Class 6 - 10', start: '2025-05-20', end: '2025-05-24', subjects: 8, students: 1248, planned: 100, prep: 80, conduct: 40, eval: 25, publish: 0, isToday: true, todaySubject: 'Science', todaySection: '8 - A', todayStart: '10:00 AM', todayEnd: '12:00 PM', todayPresent: 41, todayAbsent: 1, sort: 1 },
    { recordId: 'EXM-1002', examType: ExamTypeFilter.MID_TERM, name: 'Mid Term Examination', classRange: 'Class 6 - 12', start: '2025-06-15', end: '2025-06-25', subjects: 10, students: registered, planned: 100, prep: 60, conduct: 0, eval: 0, publish: 0, sort: 2 },
    { recordId: 'EXM-1003', examType: ExamTypeFilter.HALF_YEARLY, name: 'Half Yearly Examination', classRange: 'Class 6 - 12', start: '2025-09-15', end: '2025-09-25', subjects: 10, students: registered, planned: 100, prep: 20, conduct: 0, eval: 0, publish: 0, sort: 3 },
    { recordId: 'EXM-1004', examType: ExamTypeFilter.PRE_FINAL, name: 'Pre Final Examination', classRange: 'Class 9 - 12', start: '2025-11-10', end: '2025-11-20', subjects: 8, students: 2156, planned: 100, prep: 0, conduct: 0, eval: 0, publish: 0, sort: 4 },
    { recordId: 'EXM-1005', examType: ExamTypeFilter.FINAL_EXAMINATION, name: 'Final Examination', classRange: 'Class 6 - 12', start: '2026-03-10', end: '2026-03-25', subjects: 10, students: registered, planned: 100, prep: 80, conduct: 40, eval: 25, publish: 0, sort: 5 },
  ];

  for (const s of schedules) {
    await prisma.examSchedule.create({
      data: {
        institutionId,
        recordId: s.recordId,
        academicYear,
        examType: s.examType,
        name: s.name,
        classRange: s.classRange,
        startDate: new Date(s.start),
        endDate: new Date(s.end),
        subjectCount: s.subjects,
        studentCount: s.students,
        plannedPercent: s.planned,
        preparationPercent: s.prep,
        conductPercent: s.conduct,
        evaluationPercent: s.eval,
        publishPercent: s.publish,
        isToday: s.isToday || false,
        todaySubject: s.todaySubject || '',
        todaySection: s.todaySection || '',
        todayStartTime: s.todayStart || '',
        todayEndTime: s.todayEnd || '',
        todayPresent: s.todayPresent || 0,
        todayAbsent: s.todayAbsent || 0,
        sortOrder: s.sort,
      },
    });
  }

  const alerts = [
    { title: 'Unit Test - Science starts in 3 days', description: '20 May 2025', type: 'URGENT', date: '2025-05-20', sort: 1 },
    { title: 'Upload question papers for Mid Term', description: '10 Jun 2025', type: 'WARNING', date: '2025-06-10', sort: 2 },
    { title: 'Marks entry pending for Unit Test - 1', description: '5 classes', type: 'INFO', sort: 3 },
    { title: 'Revaluation requests pending', description: '12 requests', type: 'INFO', sort: 4 },
  ];
  for (const a of alerts) {
    await prisma.examAlert.create({
      data: {
        institutionId,
        academicYear,
        alertType: a.type,
        title: a.title,
        description: a.description,
        alertDate: a.date ? new Date(a.date) : null,
        sortOrder: a.sort,
      },
    });
  }

  const marksClasses = [
    { className: 'Class 6', total: 512, entered: 510, sort: 1 },
    { className: 'Class 7', total: 498, entered: 492, sort: 2 },
    { className: 'Class 8', total: 526, entered: 500, sort: 3 },
    { className: 'Class 9', total: 498, entered: 420, sort: 4 },
    { className: 'Class 10', total: 512, entered: 430, sort: 5 },
    { className: 'Class 11', total: 512, entered: 380, sort: 6 },
    { className: 'Class 12', total: 498, entered: 310, sort: 7 },
  ];
  for (const m of marksClasses) {
    await prisma.examMarksEntryProgress.create({
      data: {
        institutionId,
        academicYear,
        examType: ExamTypeFilter.FINAL_EXAMINATION,
        className: m.className,
        totalStudents: m.total,
        marksEntered: m.entered,
        sortOrder: m.sort,
      },
    });
  }

  const questionSubjects = [
    { subjectName: 'Mathematics', questionCount: 3518, percentage: 28, color: '#3b82f6', sort: 1 },
    { subjectName: 'Science', questionCount: 3015, percentage: 24, color: '#10b981', sort: 2 },
    { subjectName: 'English', questionCount: 2261, percentage: 18, color: '#f59e0b', sort: 3 },
    { subjectName: 'Social Science', questionCount: 2010, percentage: 16, color: '#ef4444', sort: 4 },
    { subjectName: 'Hindi', questionCount: 1005, percentage: 8, color: '#8b5cf6', sort: 5 },
    { subjectName: 'Others', questionCount: 759, percentage: 6, color: '#64748b', sort: 6 },
  ];
  for (const q of questionSubjects) {
    await prisma.examQuestionSubjectStat.create({
      data: { institutionId, academicYear, ...q },
    });
  }

  const performers = [
    { rank: 1, studentName: 'Aarav Sharma', classGroup: 'Class 10 - A', percentage: 98.6 },
    { rank: 2, studentName: 'Myra Singh', classGroup: 'Class 10 - B', percentage: 97.8 },
    { rank: 3, studentName: 'Vihaan Patel', classGroup: 'Class 10 - A', percentage: 97.2 },
  ];
  for (const [i, p] of performers.entries()) {
    await prisma.examTopPerformer.create({
      data: { institutionId, academicYear, examType: ExamTypeFilter.FINAL_EXAMINATION, ...p, sortOrder: i + 1 },
    });
  }

  const trends = [
    { termLabel: 'Unit Test - 1', averagePercent: 75, passPercent: 88, sort: 1 },
    { termLabel: 'Mid Term', averagePercent: 78, passPercent: 90, sort: 2 },
    { termLabel: 'Half Yearly', averagePercent: 76, passPercent: 89, sort: 3 },
    { termLabel: 'Pre Final', averagePercent: 82, passPercent: 94, sort: 4 },
  ];
  for (const t of trends) {
    await prisma.examPerformanceTrend.create({ data: { institutionId, academicYear, ...t } });
  }

  for (const examType of Object.values(ExamTypeFilter)) {
    await prisma.examDashboardStats.upsert({
      where: { institutionId_academicYear_examType: { institutionId, academicYear, examType } },
      create: {
        institutionId,
        academicYear,
        examType,
        upcomingExams: 8,
        nextExamName: 'Unit Test - Science',
        nextExamDate: '20 May 2025',
        studentsRegistered: registered,
        examsConducted: 12,
        papersCreated: 36,
        resultsDeclared: 7,
        averagePassPercent: 92.6,
        questionTotal: 12568,
        questionSubjective: 4125,
        questionObjective: 7856,
        questionWithSolution: 9245,
        resultAppeared: registered,
        resultPass: Math.round(registered * 0.926),
        resultFail: Math.round(registered * 0.074),
        resultHighest: 98.6,
        resultAverage: 78.4,
        analyticsPassPercent: 92.6,
        analyticsPassDelta: 4.2,
        analyticsAverage: 78.4,
        analyticsAverageDelta: 3.6,
        analyticsImprovement: 5.8,
        revaluationReceived: 96,
        revaluationUnderReview: 28,
        revaluationApproved: 42,
        revaluationRejected: 26,
        reportCardsGenerated: 4618,
        reportCardsPublished: 4102,
        reportCardsShared: 3985,
        reportCardsPending: 1146,
      },
      update: {},
    });
  }

  return { seeded: true, schedules: schedules.length, studentsRegistered: registered };
}
