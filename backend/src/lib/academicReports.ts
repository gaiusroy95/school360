import { prisma } from './prisma.js';
import { formatClassSection } from './students.js';
import { getAcademicDashboard, serializeClassSection, CCE_TYPE_UI, HOMEWORK_STATUS_UI, LESSON_PLAN_STATUS_UI } from './academicManagement.js';
import { serializeSyllabusChapter } from './curriculumHub.js';
import { serializeCalendarEvent } from './academicCalendar.js';
import { serializeCoScholasticActivity, serializeCoScholasticPerformance } from './coScholastic.js';
import { serializeEvaluation } from './teacherEvaluation.js';
import { serializeSubjectOffering } from './subjectManagement.js';
import { serializeRosterTask } from './teacherRoster.js';

export type AcademicReportType =
  | 'overview'
  | 'class-sections'
  | 'curriculum-syllabus'
  | 'timetable'
  | 'lesson-planning'
  | 'homework'
  | 'academic-calendar'
  | 'teacher-evaluation'
  | 'subject-management'
  | 'co-scholastic'
  | 'teacher-roster'
  | 'cce';

export const ACADEMIC_REPORT_CATALOG: {
  id: AcademicReportType;
  tab: string;
  title: string;
  description: string;
}[] = [
  { id: 'overview', tab: 'Academic Dashboard', title: 'Academic Overview Report', description: 'KPIs, syllabus progress, homework, lesson plans & performance trends' },
  { id: 'class-sections', tab: 'Class & Sections', title: 'Class & Sections Report', description: 'All classes, sections, capacity, class teachers & room allocation' },
  { id: 'curriculum-syllabus', tab: 'Curriculum & Syllabus', title: 'Syllabus Coverage Report', description: 'Chapter-wise syllabus progress, schedule status & revision deadlines' },
  { id: 'timetable', tab: 'Timetable', title: 'Timetable Report', description: 'Period-wise schedule by class, subject, teacher & period type' },
  { id: 'lesson-planning', tab: 'Lesson Planning', title: 'Lesson Planning Report', description: 'Lesson plans, pedagogy fields, completion status & class test linkage' },
  { id: 'homework', tab: 'Homework', title: 'Homework Submission Report', description: 'Homework assigned, submission rates, overdue & teacher-wise summary' },
  { id: 'academic-calendar', tab: 'Academic Calendar', title: 'Academic Calendar Report', description: 'Board calendar events, holidays, exams, PTM & activities' },
  { id: 'teacher-evaluation', tab: 'Continuous Evaluation', title: 'Teacher Performance Report', description: 'Teacher continuous evaluation scores across 5 dimensions per cycle' },
  { id: 'subject-management', tab: 'Subject Management', title: 'Subject Progress Report', description: 'Subject offerings, deadlines, ideal vs current progress by class' },
  { id: 'co-scholastic', tab: 'Co-Scholastic Activities', title: 'Co-Scholastic Performance Report', description: 'Activities, student performance bands & parent feedback ratings' },
  { id: 'teacher-roster', tab: 'Teacher Allocation', title: 'Teacher Roster & Task Report', description: 'Teacher allocations, roster tasks, priorities & completion status' },
  { id: 'cce', tab: 'Continuous Evaluation', title: 'CCE Summary Report', description: 'Student CCE records — unit tests, assignments, projects & activities' },
];

export type AcademicReportPayload = {
  reportType: AcademicReportType;
  reportTitle: string;
  tab: string;
  academicYear: string;
  term: string;
  generatedAt: string;
  summary: Record<string, unknown>;
  columns: { key: string; label: string }[];
  rows: Record<string, unknown>[];
};

function col(key: string, label: string) {
  return { key, label };
}

export async function generateAcademicReport(
  institutionId: string,
  reportType: AcademicReportType,
  opts: { academicYear?: string; term?: string; className?: string; sectionName?: string },
): Promise<AcademicReportPayload> {
  const academicYear = opts.academicYear || '2025-26';
  const term = opts.term || 'Term 1';
  const meta = ACADEMIC_REPORT_CATALOG.find((r) => r.id === reportType)!;
  const generatedAt = new Date().toISOString();

  switch (reportType) {
    case 'overview':
      return buildOverviewReport(institutionId, academicYear, term, meta, generatedAt, opts);
    case 'class-sections':
      return buildClassSectionsReport(institutionId, academicYear, meta, generatedAt);
    case 'curriculum-syllabus':
      return buildSyllabusReport(institutionId, academicYear, term, meta, generatedAt, opts);
    case 'timetable':
      return buildTimetableReport(institutionId, academicYear, meta, generatedAt, opts);
    case 'lesson-planning':
      return buildLessonPlanningReport(institutionId, academicYear, term, meta, generatedAt, opts);
    case 'homework':
      return buildHomeworkReport(institutionId, academicYear, term, meta, generatedAt, opts);
    case 'academic-calendar':
      return buildCalendarReport(institutionId, academicYear, meta, generatedAt);
    case 'teacher-evaluation':
      return buildTeacherEvaluationReport(institutionId, academicYear, meta, generatedAt);
    case 'subject-management':
      return buildSubjectManagementReport(institutionId, academicYear, meta, generatedAt);
    case 'co-scholastic':
      return buildCoScholasticReport(institutionId, academicYear, meta, generatedAt);
    case 'teacher-roster':
      return buildTeacherRosterReport(institutionId, academicYear, meta, generatedAt);
    case 'cce':
      return buildCceReport(institutionId, academicYear, term, meta, generatedAt, opts);
    default:
      throw new Error(`Unknown report type: ${reportType}`);
  }
}

async function buildOverviewReport(
  institutionId: string,
  academicYear: string,
  term: string,
  meta: (typeof ACADEMIC_REPORT_CATALOG)[0],
  generatedAt: string,
  opts: { className?: string; sectionName?: string },
): Promise<AcademicReportPayload> {
  const dashboard = await getAcademicDashboard(institutionId, { academicYear, term, ...opts });
  const rows: Record<string, unknown>[] = [
    { metric: 'Total Classes', value: dashboard.kpis.classes },
    { metric: 'Total Subjects', value: dashboard.kpis.subjects },
    { metric: 'Total Teachers', value: dashboard.kpis.teachers },
    { metric: 'Total Students', value: dashboard.kpis.students },
    { metric: 'Lesson Plans', value: dashboard.kpis.lessonPlans },
    { metric: 'Homework Assigned', value: dashboard.kpis.homeworkAssigned },
    { metric: 'Assessments Conducted', value: dashboard.kpis.assessmentsConducted },
    { metric: 'Lesson Plan Completion %', value: dashboard.lessonPlanCompletion.percent },
    { metric: 'Homework Submission Rate %', value: dashboard.homework.submissionRate },
    { metric: 'Overall Avg Performance %', value: dashboard.overallAvg },
    ...dashboard.syllabusProgress.map((s) => ({ metric: `Syllabus ${s.className}`, value: `${s.percent}%` })),
    ...dashboard.studentPerformanceTrend.map((s) => ({ metric: `Performance ${s.name}`, value: `${s.value}%` })),
  ];
  return {
    reportType: meta.id,
    reportTitle: meta.title,
    tab: meta.tab,
    academicYear,
    term,
    generatedAt,
    summary: { kpis: dashboard.kpis, insights: dashboard.insights },
    columns: [col('metric', 'Metric'), col('value', 'Value')],
    rows,
  };
}

async function buildClassSectionsReport(
  institutionId: string,
  academicYear: string,
  meta: (typeof ACADEMIC_REPORT_CATALOG)[0],
  generatedAt: string,
): Promise<AcademicReportPayload> {
  const sections = await prisma.academicClassSection.findMany({
    where: { institutionId, academicYear },
    orderBy: [{ className: 'asc' }, { sectionName: 'asc' }],
  });
  const studentCounts = await prisma.student.groupBy({
    by: ['className', 'sectionName'],
    where: { institutionId, academicYear, status: 'ACTIVE' },
    _count: { id: true },
  });
  const countMap = new Map(studentCounts.map((s) => [`${s.className}|${s.sectionName}`, s._count.id]));

  const rows = sections.map((s) => {
    const ser = serializeClassSection(s);
    return {
      recordId: ser.recordId,
      className: ser.className,
      sectionName: ser.sectionName,
      classGroup: ser.classGroup,
      capacity: ser.capacity,
      enrolled: countMap.get(`${s.className}|${s.sectionName}`) || 0,
      room: ser.room,
      classTeacher: ser.classTeacher,
      classTeacherPhone: ser.classTeacherPhone,
      classTeacherEmail: ser.classTeacherEmail,
      isActive: ser.isActive ? 'Yes' : 'No',
    };
  });

  return {
    reportType: meta.id,
    reportTitle: meta.title,
    tab: meta.tab,
    academicYear,
    term: 'Term 1',
    generatedAt,
    summary: { totalClasses: rows.length, totalEnrolled: rows.reduce((a, r) => a + Number(r.enrolled), 0) },
    columns: [
      col('recordId', 'ID'), col('classGroup', 'Class'), col('capacity', 'Capacity'),
      col('enrolled', 'Enrolled'), col('room', 'Room'), col('classTeacher', 'Class Teacher'),
      col('classTeacherPhone', 'Phone'), col('classTeacherEmail', 'Email'), col('isActive', 'Active'),
    ],
    rows,
  };
}

async function buildSyllabusReport(
  institutionId: string,
  academicYear: string,
  term: string,
  meta: (typeof ACADEMIC_REPORT_CATALOG)[0],
  generatedAt: string,
  opts: { className?: string; sectionName?: string },
): Promise<AcademicReportPayload> {
  const chapters = await prisma.academicSyllabusChapter.findMany({
    where: {
      institutionId,
      academicYear,
      term,
      ...(opts.className ? { className: opts.className } : {}),
      ...(opts.sectionName ? { sectionName: opts.sectionName } : {}),
    },
    orderBy: [{ className: 'asc' }, { subjectName: 'asc' }, { unitNumber: 'asc' }],
  });
  const serialized = chapters.map(serializeSyllabusChapter);
  const rows = serialized.map((c) => ({
    classGroup: c.classGroup,
    subjectName: c.subjectName,
    unitNumber: c.unitNumber,
    chapterTitle: c.chapterTitle,
    boardTopicCode: c.boardTopicCode,
    completionPercent: c.completionPercent,
    scheduleStatus: c.scheduleStatus,
    daysBehind: c.daysBehind,
    plannedStartDate: c.plannedStartDate ? new Date(c.plannedStartDate).toLocaleDateString('en-IN') : '',
    plannedEndDate: c.plannedEndDate ? new Date(c.plannedEndDate).toLocaleDateString('en-IN') : '',
    revisionDeadline: c.revisionDeadline ? new Date(c.revisionDeadline).toLocaleDateString('en-IN') : '',
  }));
  const avgProgress = rows.length
    ? Math.round(rows.reduce((a, r) => a + Number(r.completionPercent), 0) / rows.length)
    : 0;

  return {
    reportType: meta.id,
    reportTitle: meta.title,
    tab: meta.tab,
    academicYear,
    term,
    generatedAt,
    summary: { totalChapters: rows.length, avgProgress, behind: rows.filter((r) => r.scheduleStatus === 'behind').length },
    columns: [
      col('classGroup', 'Class'), col('subjectName', 'Subject'), col('unitNumber', 'Unit'),
      col('chapterTitle', 'Chapter'), col('completionPercent', 'Progress %'),
      col('scheduleStatus', 'Status'), col('daysBehind', 'Days Behind'),
      col('plannedEndDate', 'Planned End'), col('revisionDeadline', 'Revision Due'),
    ],
    rows,
  };
}

async function buildTimetableReport(
  institutionId: string,
  academicYear: string,
  meta: (typeof ACADEMIC_REPORT_CATALOG)[0],
  generatedAt: string,
  opts: { className?: string; sectionName?: string },
): Promise<AcademicReportPayload> {
  const slots = await prisma.academicTimetableSlot.findMany({
    where: {
      institutionId,
      academicYear,
      ...(opts.className ? { className: opts.className } : {}),
      ...(opts.sectionName ? { sectionName: opts.sectionName } : {}),
    },
    orderBy: [{ dayOfWeek: 'asc' }, { period: 'asc' }],
  });
  const dayNames = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const rows = slots.map((s) => ({
    day: dayNames[s.dayOfWeek] || String(s.dayOfWeek),
    period: s.periodLabel,
    time: `${s.startTime} - ${s.endTime}`,
    classGroup: formatClassSection(s.className, s.sectionName),
    subjectName: s.subjectName,
    teacherName: s.teacherName,
    periodType: s.periodType,
    room: s.room,
    term: s.term,
    versionLabel: s.versionLabel,
    published: s.publishedAt ? 'Yes' : 'No',
  }));

  return {
    reportType: meta.id,
    reportTitle: meta.title,
    tab: meta.tab,
    academicYear,
    term: 'All',
    generatedAt,
    summary: { totalSlots: rows.length, teachers: new Set(slots.map((s) => s.teacherName)).size },
    columns: [
      col('day', 'Day'), col('period', 'Period'), col('time', 'Time'), col('classGroup', 'Class'),
      col('subjectName', 'Subject'), col('teacherName', 'Teacher'), col('periodType', 'Type'),
      col('room', 'Room'), col('published', 'Published'),
    ],
    rows,
  };
}

async function buildLessonPlanningReport(
  institutionId: string,
  academicYear: string,
  term: string,
  meta: (typeof ACADEMIC_REPORT_CATALOG)[0],
  generatedAt: string,
  opts: { className?: string; sectionName?: string },
): Promise<AcademicReportPayload> {
  const plans = await prisma.academicLessonPlan.findMany({
    where: {
      institutionId,
      academicYear,
      term,
      ...(opts.className ? { className: opts.className } : {}),
      ...(opts.sectionName ? { sectionName: opts.sectionName } : {}),
    },
    orderBy: [{ teacherName: 'asc' }, { className: 'asc' }],
  });
  const rows = plans.map((p) => ({
    teacherName: p.teacherName,
    department: p.department,
    classGroup: formatClassSection(p.className, p.sectionName),
    subjectName: p.subjectName,
    title: p.title,
    status: LESSON_PLAN_STATUS_UI[p.status],
    completionPercent: p.completionPercent,
    bloomsLevel: p.bloomsLevel,
    teachingMethod: p.teachingMethod,
    plannedDate: p.plannedDate ? p.plannedDate.toLocaleDateString('en-IN') : '',
    shared: p.sharedAt ? 'Yes' : 'No',
  }));

  return {
    reportType: meta.id,
    reportTitle: meta.title,
    tab: meta.tab,
    academicYear,
    term,
    generatedAt,
    summary: {
      total: rows.length,
      completed: plans.filter((p) => p.status === 'COMPLETED').length,
      avgCompletion: rows.length ? Math.round(rows.reduce((a, r) => a + Number(r.completionPercent), 0) / rows.length) : 0,
    },
    columns: [
      col('teacherName', 'Teacher'), col('classGroup', 'Class'), col('subjectName', 'Subject'),
      col('title', 'Lesson Plan'), col('status', 'Status'), col('completionPercent', 'Completion %'),
      col('bloomsLevel', "Bloom's Level"), col('teachingMethod', 'Method'), col('plannedDate', 'Planned Date'),
    ],
    rows,
  };
}

async function buildHomeworkReport(
  institutionId: string,
  academicYear: string,
  term: string,
  meta: (typeof ACADEMIC_REPORT_CATALOG)[0],
  generatedAt: string,
  opts: { className?: string; sectionName?: string },
): Promise<AcademicReportPayload> {
  const homework = await prisma.academicHomework.findMany({
    where: {
      institutionId,
      academicYear,
      term,
      ...(opts.className ? { className: opts.className } : {}),
      ...(opts.sectionName ? { sectionName: opts.sectionName } : {}),
    },
    orderBy: { assignedDate: 'desc' },
  });
  const rows = homework.map((h) => {
    const rate = h.totalStudents > 0 ? Math.round((h.submittedCount / h.totalStudents) * 100) : 0;
    return {
      teacherName: h.teacherName,
      classGroup: formatClassSection(h.className, h.sectionName),
      subjectName: h.subjectName,
      title: h.title,
      assignedDate: h.assignedDate.toLocaleDateString('en-IN'),
      dueDate: h.dueDate ? h.dueDate.toLocaleDateString('en-IN') : '',
      status: HOMEWORK_STATUS_UI[h.status],
      submittedCount: h.submittedCount,
      totalStudents: h.totalStudents,
      submissionRate: `${rate}%`,
      published: h.publishedAt ? 'Yes' : 'No',
    };
  });

  return {
    reportType: meta.id,
    reportTitle: meta.title,
    tab: meta.tab,
    academicYear,
    term,
    generatedAt,
    summary: {
      total: rows.length,
      overdue: homework.filter((h) => h.status === 'OVERDUE').length,
      avgSubmissionRate: rows.length
        ? Math.round(rows.reduce((a, r) => a + parseInt(String(r.submissionRate), 10), 0) / rows.length)
        : 0,
    },
    columns: [
      col('teacherName', 'Teacher'), col('classGroup', 'Class'), col('subjectName', 'Subject'),
      col('title', 'Homework'), col('assignedDate', 'Assigned'), col('dueDate', 'Due'),
      col('status', 'Status'), col('submissionRate', 'Submission Rate'),
      col('submittedCount', 'Submitted'), col('totalStudents', 'Total Students'),
    ],
    rows,
  };
}

async function buildCalendarReport(
  institutionId: string,
  academicYear: string,
  meta: (typeof ACADEMIC_REPORT_CATALOG)[0],
  generatedAt: string,
): Promise<AcademicReportPayload> {
  const events = await prisma.academicCalendarEvent.findMany({
    where: { institutionId, academicYear },
    orderBy: { eventDate: 'asc' },
  });
  const rows = events.map((e) => {
    const ser = serializeCalendarEvent(e);
    return {
      title: ser.title,
      boardName: ser.boardName,
      eventType: ser.eventTypeLabel,
      eventDate: new Date(ser.eventDate).toLocaleDateString('en-IN'),
      endDate: ser.endDate ? new Date(ser.endDate).toLocaleDateString('en-IN') : '',
      term: ser.term,
      sharedToParents: ser.sharedToParents ? 'Yes' : 'No',
      published: ser.isPublished ? 'Yes' : 'No',
      description: ser.description,
    };
  });

  return {
    reportType: meta.id,
    reportTitle: meta.title,
    tab: meta.tab,
    academicYear,
    term: 'All',
    generatedAt,
    summary: { totalEvents: rows.length, published: events.filter((e) => e.publishedAt).length },
    columns: [
      col('title', 'Event'), col('boardName', 'Board'), col('eventType', 'Type'),
      col('eventDate', 'Date'), col('endDate', 'End Date'), col('term', 'Term'),
      col('sharedToParents', 'Shared to Parents'), col('published', 'Published'),
    ],
    rows,
  };
}

async function buildTeacherEvaluationReport(
  institutionId: string,
  academicYear: string,
  meta: (typeof ACADEMIC_REPORT_CATALOG)[0],
  generatedAt: string,
): Promise<AcademicReportPayload> {
  const evals = await prisma.academicTeacherEvaluation.findMany({
    where: { institutionId, academicYear },
    include: { devCycle: true },
    orderBy: [{ overallScore: 'desc' }],
  });
  const rows = evals.map((e) => {
    const ser = serializeEvaluation(e);
    return {
      teacherName: ser.teacherName,
      department: ser.department,
      classGroup: ser.classGroup,
      subjectName: ser.subjectName,
      cycleTitle: ser.cycleTitle,
      taskActionScore: ser.taskActionScore,
      improvementPlanScore: ser.improvementPlanScore,
      parentEngagementScore: ser.parentEngagementScore,
      parentFeedbackScore: ser.parentFeedbackScore,
      studentFeedbackScore: ser.studentFeedbackScore,
      overallScore: ser.overallScore,
      performanceBand: ser.performanceBandLabel,
      status: ser.statusLabel,
      evaluatedBy: ser.evaluatedBy,
    };
  });

  return {
    reportType: meta.id,
    reportTitle: meta.title,
    tab: meta.tab,
    academicYear,
    term: 'All',
    generatedAt,
    summary: {
      totalEvaluations: rows.length,
      avgScore: rows.length ? Math.round(rows.reduce((a, r) => a + Number(r.overallScore), 0) / rows.length * 10) / 10 : 0,
    },
    columns: [
      col('teacherName', 'Teacher'), col('classGroup', 'Class'), col('subjectName', 'Subject'),
      col('cycleTitle', 'Cycle'), col('taskActionScore', 'Task Action'),
      col('improvementPlanScore', 'Improvement Plan'), col('parentEngagementScore', 'Parent Engagement'),
      col('parentFeedbackScore', 'Parent Feedback'), col('studentFeedbackScore', 'Student Feedback'),
      col('overallScore', 'Overall Score'), col('performanceBand', 'Band'), col('status', 'Status'),
    ],
    rows,
  };
}

async function buildSubjectManagementReport(
  institutionId: string,
  academicYear: string,
  meta: (typeof ACADEMIC_REPORT_CATALOG)[0],
  generatedAt: string,
): Promise<AcademicReportPayload> {
  const allocations = await prisma.academicSubjectAllocation.findMany({
    where: { institutionId, academicYear },
    include: { subject: true },
  });
  const chapters = await prisma.academicSyllabusChapter.findMany({ where: { institutionId, academicYear } });
  const chapterKey = (cn: string, sn: string, subj: string) => `${cn}|${sn}|${subj}`;
  const chMap = new Map<string, typeof chapters>();
  for (const ch of chapters) {
    const key = chapterKey(ch.className, ch.sectionName, ch.subjectName);
    const list = chMap.get(key) || [];
    list.push(ch);
    chMap.set(key, list);
  }

  const rows = allocations.map((a) => {
    const subjectName = a.subject?.subjectName || '';
    const key = chapterKey(a.className, a.sectionName, subjectName);
    const chs = chMap.get(key) || [];
    const offering = serializeSubjectOffering(a, chs, subjectName);
    return {
      subjectName: offering.subjectName,
      teacherName: offering.teacherName,
      classGroup: offering.classGroup,
      courseCompletionDeadline: offering.courseCompletionDeadline
        ? new Date(offering.courseCompletionDeadline).toLocaleDateString('en-IN') : '',
      currentProgress: `${offering.currentProgress}%`,
      idealProgress: `${offering.idealProgress}%`,
      progressGap: offering.progressGap,
      progressStatus: offering.progressStatus,
      chapterCount: offering.chapterCount,
    };
  });

  return {
    reportType: meta.id,
    reportTitle: meta.title,
    tab: meta.tab,
    academicYear,
    term: 'All',
    generatedAt,
    summary: { totalOfferings: rows.length, behind: rows.filter((r) => r.progressStatus === 'behind').length },
    columns: [
      col('subjectName', 'Subject'), col('teacherName', 'Teacher'), col('classGroup', 'Class'),
      col('courseCompletionDeadline', 'Completion Deadline'), col('currentProgress', 'Current Progress'),
      col('idealProgress', 'Ideal Progress'), col('progressGap', 'Gap'), col('progressStatus', 'Status'),
    ],
    rows,
  };
}

async function buildCoScholasticReport(
  institutionId: string,
  academicYear: string,
  meta: (typeof ACADEMIC_REPORT_CATALOG)[0],
  generatedAt: string,
): Promise<AcademicReportPayload> {
  const activities = await prisma.academicCoScholasticActivity.findMany({
    where: { institutionId, academicYear },
    include: { performances: true },
    orderBy: { activityDate: 'asc' },
  });

  const rows: Record<string, unknown>[] = [];
  for (const act of activities) {
    const ser = serializeCoScholasticActivity(act);
    if (act.performances.length === 0) {
      rows.push({
        activityTitle: ser.title,
        category: ser.categoryLabel,
        activityType: ser.activityType,
        teacherName: ser.teacherName,
        classGroup: ser.classGroup,
        activityDate: new Date(ser.activityDate).toLocaleDateString('en-IN'),
        status: ser.statusLabel,
        studentName: '—',
        performanceScore: '—',
        performanceGrade: '—',
        performanceBand: '—',
      });
    } else {
      for (const p of act.performances) {
        const perf = serializeCoScholasticPerformance(p);
        rows.push({
          activityTitle: ser.title,
          category: ser.categoryLabel,
          activityType: ser.activityType,
          teacherName: ser.teacherName,
          classGroup: perf.classGroup,
          activityDate: new Date(ser.activityDate).toLocaleDateString('en-IN'),
          status: ser.statusLabel,
          studentName: perf.studentName,
          performanceScore: perf.performanceScore,
          performanceGrade: perf.performanceGrade,
          performanceBand: perf.performanceBandLabel,
        });
      }
    }
  }

  return {
    reportType: meta.id,
    reportTitle: meta.title,
    tab: meta.tab,
    academicYear,
    term: 'All',
    generatedAt,
    summary: { totalActivities: activities.length, performanceRecords: rows.filter((r) => r.studentName !== '—').length },
    columns: [
      col('activityTitle', 'Activity'), col('category', 'Category'), col('activityType', 'Type'),
      col('teacherName', 'Teacher'), col('classGroup', 'Class'), col('activityDate', 'Date'),
      col('studentName', 'Student'), col('performanceScore', 'Score'), col('performanceGrade', 'Grade'),
      col('performanceBand', 'Band'),
    ],
    rows,
  };
}

async function buildTeacherRosterReport(
  institutionId: string,
  academicYear: string,
  meta: (typeof ACADEMIC_REPORT_CATALOG)[0],
  generatedAt: string,
): Promise<AcademicReportPayload> {
  const [tasks, allocations] = await Promise.all([
    prisma.academicTeacherRosterTask.findMany({
      where: { institutionId, academicYear },
      orderBy: [{ teacherName: 'asc' }, { dueDate: 'asc' }],
    }),
    prisma.academicTeacherAllocation.findMany({ where: { institutionId, academicYear } }),
  ]);

  const taskRows = tasks.map((t) => {
    const ser = serializeRosterTask(t);
    return {
      recordType: 'Task',
      teacherName: ser.teacherName,
      taskType: ser.taskTypeLabel,
      title: ser.title,
      classGroup: ser.classGroup,
      subjectName: ser.subjectName,
      dueDate: ser.dueDate ? new Date(ser.dueDate).toLocaleDateString('en-IN') : '',
      priority: ser.priorityLabel,
      status: ser.statusLabel,
      feedbackRecorded: ser.feedbackRecorded ? 'Yes' : 'No',
      published: ser.isPublished ? 'Yes' : 'No',
    };
  });

  const allocRows = allocations.map((a) => ({
    recordType: 'Class Allocation',
    teacherName: a.teacherName,
    taskType: 'Class & Subject',
    title: `${a.subjectName} — ${formatClassSection(a.className, a.sectionName)}`,
    classGroup: formatClassSection(a.className, a.sectionName),
    subjectName: a.subjectName,
    dueDate: '—',
    priority: a.workloadLevel,
    status: 'Active',
    feedbackRecorded: '—',
    published: '—',
  }));

  const rows = [...allocRows, ...taskRows];

  return {
    reportType: meta.id,
    reportTitle: meta.title,
    tab: meta.tab,
    academicYear,
    term: 'All',
    generatedAt,
    summary: {
      teachers: new Set(rows.map((r) => r.teacherName)).size,
      allocations: allocRows.length,
      tasks: taskRows.length,
      overdue: tasks.filter((t) => t.dueDate && new Date() > t.dueDate && t.status !== 'COMPLETED').length,
    },
    columns: [
      col('recordType', 'Record Type'), col('teacherName', 'Teacher'), col('taskType', 'Type'),
      col('title', 'Title'), col('classGroup', 'Class'), col('subjectName', 'Subject'),
      col('dueDate', 'Due Date'), col('priority', 'Priority'), col('status', 'Status'),
    ],
    rows,
  };
}

async function buildCceReport(
  institutionId: string,
  academicYear: string,
  term: string,
  meta: (typeof ACADEMIC_REPORT_CATALOG)[0],
  generatedAt: string,
  opts: { className?: string; sectionName?: string },
): Promise<AcademicReportPayload> {
  const records = await prisma.academicCceRecord.findMany({
    where: {
      institutionId,
      academicYear,
      term,
      ...(opts.className ? { className: opts.className } : {}),
      ...(opts.sectionName ? { sectionName: opts.sectionName } : {}),
    },
    orderBy: [{ className: 'asc' }, { conductedDate: 'desc' }],
  });
  const rows = records.map((r) => ({
    cceType: CCE_TYPE_UI[r.cceType],
    title: r.title,
    classGroup: formatClassSection(r.className, r.sectionName),
    subjectName: r.subjectName,
    conductedDate: r.conductedDate ? r.conductedDate.toLocaleDateString('en-IN') : '',
    maxMarks: r.maxMarks,
    evaluatedCount: r.evaluatedCount,
    status: r.status,
  }));

  return {
    reportType: meta.id,
    reportTitle: meta.title,
    tab: meta.tab,
    academicYear,
    term,
    generatedAt,
    summary: { totalRecords: rows.length, byType: records.reduce((acc, r) => {
      acc[r.cceType] = (acc[r.cceType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) },
    columns: [
      col('cceType', 'CCE Type'), col('title', 'Title'), col('classGroup', 'Class'),
      col('subjectName', 'Subject'), col('conductedDate', 'Conducted'), col('maxMarks', 'Max Marks'),
      col('evaluatedCount', 'Evaluated'), col('status', 'Status'),
    ],
    rows,
  };
}

export async function generateAllAcademicReports(
  institutionId: string,
  opts: { academicYear?: string; term?: string },
) {
  const reports: AcademicReportPayload[] = [];
  for (const item of ACADEMIC_REPORT_CATALOG) {
    reports.push(await generateAcademicReport(institutionId, item.id, opts));
  }
  return {
    academicYear: opts.academicYear || '2025-26',
    term: opts.term || 'Term 1',
    generatedAt: new Date().toISOString(),
    reportCount: reports.length,
    reports,
  };
}

export function reportToCsv(payload: AcademicReportPayload): string {
  const header = payload.columns.map((c) => c.label).join(',');
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const body = payload.rows.map((row) =>
    payload.columns.map((c) => escape(row[c.key])).join(','),
  );
  return [header, ...body].join('\n');
}
