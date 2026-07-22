import {
  AcademicCceType,
  AcademicEventType,
  AcademicHomeworkStatus,
  AcademicLessonPlanStatus,
  AcademicWorkloadLevel,
} from '@prisma/client';
import { prisma } from './prisma.js';
import { formatClassSection } from './students.js';
import { isSlotActiveOnDate } from './timetable.js';

const PREFIX = {
  classSection: 'ACS',
  subject: 'SUB',
  allocation: 'SAL',
  syllabus: 'SYL',
  timetable: 'TT',
  lessonPlan: 'LP',
  homework: 'HW',
  calendar: 'ACE',
  boardCalendar: 'BCU',
  cce: 'CCE',
  classTest: 'CT',
  coScholastic: 'CSA',
  coScholasticPerf: 'CSP',
  coScholasticFeedback: 'CSF',
  teacher: 'TAL',
  teacherRoster: 'TRT',
  teacherDevCycle: 'TDC',
  teacherEval: 'TEV',
} as const;

async function nextRecordId(institutionId: string, prefix: string, model: { count: (args: object) => Promise<number> }) {
  const count = await model.count({ where: { institutionId } });
  for (let i = 0; i < 50; i++) {
    const candidate = `${prefix}-${String(1000 + count + i + 1)}`;
    return candidate;
  }
  return `${prefix}-${Date.now().toString().slice(-6)}`;
}

export async function nextAcademicRecordId(
  institutionId: string,
  kind: keyof typeof PREFIX,
): Promise<string> {
  const prefix = PREFIX[kind];
  const counters: Record<keyof typeof PREFIX, { count: (args: object) => Promise<number> }> = {
    classSection: prisma.academicClassSection,
    subject: prisma.academicSubject,
    allocation: prisma.academicSubjectAllocation,
    syllabus: prisma.academicSyllabusChapter,
    timetable: prisma.academicTimetableSlot,
    lessonPlan: prisma.academicLessonPlan,
    homework: prisma.academicHomework,
    calendar: prisma.academicCalendarEvent,
    boardCalendar: prisma.academicBoardCalendarUpload,
    cce: prisma.academicCceRecord,
    classTest: prisma.academicClassTest,
    coScholastic: prisma.academicCoScholasticActivity,
    coScholasticPerf: prisma.academicCoScholasticPerformance,
    coScholasticFeedback: prisma.academicCoScholasticFeedback,
    teacher: prisma.academicTeacherAllocation,
    teacherRoster: prisma.academicTeacherRosterTask,
    teacherDevCycle: prisma.academicTeacherDevCycle,
    teacherEval: prisma.academicTeacherEvaluation,
  };
  return nextRecordId(institutionId, prefix, counters[kind]);
}

export const LESSON_PLAN_STATUS_UI: Record<AcademicLessonPlanStatus, string> = {
  DRAFT: 'Draft',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  PENDING: 'Pending',
};

export const HOMEWORK_STATUS_UI: Record<AcademicHomeworkStatus, string> = {
  ASSIGNED: 'Assigned',
  SUBMITTED: 'Submitted',
  PENDING: 'Pending',
  OVERDUE: 'Overdue',
};

export const CCE_TYPE_UI: Record<AcademicCceType, string> = {
  UNIT_TEST: 'Unit Test',
  ASSIGNMENT: 'Assignment',
  PROJECT: 'Project',
  ACTIVITY: 'Activity',
};

export const EVENT_TYPE_UI: Record<AcademicEventType, string> = {
  HOLIDAY: 'Holiday',
  EXAM: 'Exam',
  PTM: 'PTM',
  ACTIVITY: 'Activity',
  OTHER: 'Other',
};

export const WORKLOAD_UI: Record<AcademicWorkloadLevel, string> = {
  FULL: 'Full Load',
  MEDIUM: 'Medium Load',
  LOW: 'Low Load',
};

export function serializeClassSection(row: {
  id: string;
  recordId: string;
  academicYear: string;
  className: string;
  sectionName: string;
  capacity: number;
  room: string;
  classTeacher: string;
  classTeacherPhone: string;
  classTeacherEmail: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    recordId: row.recordId,
    academicYear: row.academicYear,
    className: row.className,
    sectionName: row.sectionName,
    classGroup: formatClassSection(row.className, row.sectionName),
    capacity: row.capacity,
    room: row.room,
    classTeacher: row.classTeacher,
    classTeacherPhone: row.classTeacherPhone,
    classTeacherEmail: row.classTeacherEmail,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function serializeSubject(row: {
  id: string;
  recordId: string;
  subjectName: string;
  subjectCode: string;
  subjectType: string;
  subjectGroup: string;
  isElective: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    recordId: row.recordId,
    subjectName: row.subjectName,
    subjectCode: row.subjectCode,
    subjectType: row.subjectType,
    subjectGroup: row.subjectGroup,
    isElective: row.isElective,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function serializeLessonPlan(row: {
  id: string;
  recordId: string;
  academicYear: string;
  term: string;
  className: string;
  sectionName: string;
  subjectName: string;
  department: string;
  title: string;
  teacherName: string;
  objective?: string;
  teachingMethod?: string;
  propsUsed?: string;
  bloomsLevel?: string;
  resultMeasurement?: string;
  syllabusChapterId?: string | null;
  plannedDate: Date | null;
  status: AcademicLessonPlanStatus;
  completionPercent: number;
  sharedAt: Date | null;
  notes: string;
  resources?: unknown;
  createdAt: Date;
  updatedAt: Date;
}) {
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
    objective: row.objective || '',
    teachingMethod: row.teachingMethod || '',
    propsUsed: row.propsUsed || '',
    bloomsLevel: row.bloomsLevel || 'UNDERSTAND',
    resultMeasurement: row.resultMeasurement || '',
    syllabusChapterId: row.syllabusChapterId ?? null,
    plannedDate: row.plannedDate?.toISOString() ?? null,
    status: row.status,
    statusLabel: LESSON_PLAN_STATUS_UI[row.status],
    completionPercent: row.completionPercent,
    sharedAt: row.sharedAt?.toISOString() ?? null,
    notes: row.notes,
    resources: Array.isArray(row.resources) ? row.resources : [],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function serializeHomework(row: {
  id: string;
  recordId: string;
  academicYear: string;
  term: string;
  className: string;
  sectionName: string;
  subjectName: string;
  teacherName?: string;
  title: string;
  description: string;
  assignedDate: Date;
  dueDate: Date | null;
  status: AcademicHomeworkStatus;
  totalStudents: number;
  submittedCount: number;
  sharedAt: Date | null;
  publishedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  const submissionRate =
    row.totalStudents > 0 ? Math.round((row.submittedCount / row.totalStudents) * 100) : 0;
  return {
    id: row.id,
    recordId: row.recordId,
    academicYear: row.academicYear,
    term: row.term,
    className: row.className,
    sectionName: row.sectionName,
    classGroup: formatClassSection(row.className, row.sectionName),
    subjectName: row.subjectName,
    teacherName: row.teacherName || '',
    title: row.title,
    description: row.description,
    assignedDate: row.assignedDate.toISOString(),
    dueDate: row.dueDate?.toISOString() ?? null,
    status: row.status,
    statusLabel: HOMEWORK_STATUS_UI[row.status],
    totalStudents: row.totalStudents,
    submittedCount: row.submittedCount,
    submissionRate,
    sharedAt: row.sharedAt?.toISOString() ?? null,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    isPublished: Boolean(row.publishedAt || row.sharedAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function syncClassSectionsFromInstitutionSetup(institutionId: string, academicYear: string) {
  const setup = await prisma.institutionSetup.findUnique({ where: { institutionId } });
  const tile = (setup?.classesSections || {}) as { records?: Record<string, string>[] };
  const records = tile.records || [];
  let created = 0;
  for (const r of records) {
    const className = r.className?.trim();
    const sectionName = r.sectionName?.trim();
    if (!className || !sectionName) continue;
    const exists = await prisma.academicClassSection.findFirst({
      where: { institutionId, academicYear, className, sectionName },
    });
    if (exists) continue;
    const recordId = await nextAcademicRecordId(institutionId, 'classSection');
    await prisma.academicClassSection.create({
      data: {
        institutionId,
        recordId,
        academicYear,
        className,
        sectionName,
        capacity: Number(r.capacity) || 40,
        room: r.room || '',
        classTeacher: r.classTeacher || '',
        classTeacherPhone: r.classTeacherPhone || '',
        classTeacherEmail: r.classTeacherEmail || '',
      },
    });
    created += 1;
  }
  return { created };
}

export async function getAcademicDashboard(
  institutionId: string,
  opts: { academicYear?: string; term?: string; className?: string; sectionName?: string } = {},
) {
  const year = opts.academicYear || '2025-26';
  const term = opts.term || 'Term 1';
  const whereClass = opts.className ? { className: opts.className } : {};
  const whereSection = opts.sectionName ? { sectionName: opts.sectionName } : {};

  const [
    classSections,
    subjects,
    lessonPlans,
    homework,
    cceRecords,
    calendarEvents,
    coScholastic,
    teacherAllocations,
    syllabusChapters,
    timetableSlots,
    studentCount,
    analyticsRows,
  ] = await Promise.all([
    prisma.academicClassSection.count({ where: { institutionId, academicYear: year, isActive: true } }),
    prisma.academicSubject.count({ where: { institutionId, isActive: true } }),
    prisma.academicLessonPlan.findMany({
      where: { institutionId, academicYear: year, term, ...whereClass, ...whereSection },
    }),
    prisma.academicHomework.findMany({
      where: { institutionId, academicYear: year, term, ...whereClass, ...whereSection },
    }),
    prisma.academicCceRecord.findMany({
      where: { institutionId, academicYear: year, term, ...whereClass, ...whereSection },
    }),
    prisma.academicCalendarEvent.findMany({
      where: { institutionId, academicYear: year, term },
      orderBy: { eventDate: 'asc' },
      take: 20,
    }),
    prisma.academicCoScholasticActivity.findMany({
      where: { institutionId, academicYear: year },
      orderBy: { activityDate: 'asc' },
      take: 10,
    }),
    prisma.academicTeacherAllocation.findMany({ where: { institutionId, academicYear: year } }),
    prisma.academicSyllabusChapter.findMany({
      where: { institutionId, academicYear: year, term, ...whereClass },
    }),
    prisma.academicTimetableSlot.findMany({
      where: { institutionId, academicYear: year, ...whereClass, ...whereSection },
      orderBy: [{ period: 'asc' }],
    }),
    prisma.student.count({
      where: {
        institutionId,
        academicYear: year,
        ...(opts.className ? { className: opts.className } : {}),
        ...(opts.sectionName ? { sectionName: opts.sectionName } : {}),
      },
    }),
    prisma.studentAnalyticsRecord.findMany({
      where: {
        institutionId,
        academicYear: year,
        ...(opts.className ? { className: opts.className } : {}),
        ...(opts.sectionName ? { sectionName: opts.sectionName } : {}),
      },
      select: { className: true, scores: true },
    }),
  ]);

  const uniqueTeachers = new Set(teacherAllocations.map((t) => t.teacherName).filter(Boolean));
  const teacherCount = uniqueTeachers.size || new Set(timetableSlots.map((t) => t.teacherName).filter(Boolean)).size;

  const completedPlans = lessonPlans.filter((p) => p.status === 'COMPLETED').length;
  const inProgressPlans = lessonPlans.filter((p) => p.status === 'IN_PROGRESS').length;
  const pendingPlans = lessonPlans.filter((p) => p.status === 'PENDING' || p.status === 'DRAFT').length;
  const totalPlans = lessonPlans.length || 1;
  const lessonPlanCompletionPercent = Math.round((completedPlans / totalPlans) * 100);

  const deptMap = new Map<string, { total: number; completed: number }>();
  for (const p of lessonPlans) {
    const dept = p.department || 'General';
    const cur = deptMap.get(dept) || { total: 0, completed: 0 };
    cur.total += 1;
    if (p.status === 'COMPLETED') cur.completed += 1;
    deptMap.set(dept, cur);
  }
  const completionByDepartment = [...deptMap.entries()].map(([name, v]) => ({
    name,
    value: v.total ? Math.round((v.completed / v.total) * 100) : 0,
  }));

  const hwAssigned = homework.length;
  const hwSubmitted = homework.filter((h) => h.status === 'SUBMITTED').length;
  const hwPending = homework.filter((h) => h.status === 'PENDING' || h.status === 'ASSIGNED').length;
  const hwOverdue = homework.filter((h) => h.status === 'OVERDUE').length;
  const hwTotalSubmissions = homework.reduce((s, h) => s + h.totalStudents, 0);
  const hwSubmittedCount = homework.reduce((s, h) => s + h.submittedCount, 0);

  const classSyllabus = new Map<string, number[]>();
  for (const ch of syllabusChapters) {
    const list = classSyllabus.get(ch.className) || [];
    list.push(ch.completionPercent);
    classSyllabus.set(ch.className, list);
  }
  const syllabusProgress = [...classSyllabus.entries()].map(([className, percents]) => ({
    className,
    percent: percents.length ? Math.round(percents.reduce((a, b) => a + b, 0) / percents.length) : 0,
  }));

  const classPerf = new Map<string, number[]>();
  for (const row of analyticsRows) {
    const scores = (row.scores || {}) as { academicPerformance?: number };
    const score = scores.academicPerformance ?? 0;
    const list = classPerf.get(row.className) || [];
    list.push(score);
    classPerf.set(row.className, list);
  }
  const studentPerformanceTrend = [...classPerf.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }))
    .map(([name, scores]) => ({
      name,
      value: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
    }));

  const workloadCounts = { FULL: 0, MEDIUM: 0, LOW: 0 };
  const teacherWorkloadMap = new Map<string, AcademicWorkloadLevel>();
  for (const t of teacherAllocations) {
    teacherWorkloadMap.set(t.teacherName, t.workloadLevel);
  }
  for (const level of teacherWorkloadMap.values()) workloadCounts[level] += 1;
  const totalWlTeachers = teacherWorkloadMap.size || 1;
  const teacherWorkload = [
    { name: 'Full Load', value: workloadCounts.FULL, color: '#3b82f6', percent: `${Math.round((workloadCounts.FULL / totalWlTeachers) * 100)}%` },
    { name: 'Medium Load', value: workloadCounts.MEDIUM, color: '#f59e0b', percent: `${Math.round((workloadCounts.MEDIUM / totalWlTeachers) * 100)}%` },
    { name: 'Low Load', value: workloadCounts.LOW, color: '#8b5cf6', percent: `${Math.round((workloadCounts.LOW / totalWlTeachers) * 100)}%` },
  ];

  const cceByType = {
    UNIT_TEST: cceRecords.filter((c) => c.cceType === 'UNIT_TEST').length,
    ASSIGNMENT: cceRecords.filter((c) => c.cceType === 'ASSIGNMENT').length,
    PROJECT: cceRecords.filter((c) => c.cceType === 'PROJECT').length,
    ACTIVITY: cceRecords.filter((c) => c.cceType === 'ACTIVITY').length,
  };

  const todayDow = new Date().getDay() || 7;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todaySchedule = timetableSlots
    .filter((s) => s.dayOfWeek === todayDow && isSlotActiveOnDate(s, today))
    .sort((a, b) => a.period - b.period)
    .slice(0, 12)
    .map((s) => ({
      period: s.periodLabel,
      time: `${s.startTime} - ${s.endTime}`,
      subject: s.subjectName,
      class: formatClassSection(s.className, s.sectionName),
      teacher: s.teacherName,
      periodType: s.periodType,
      room: s.room,
    }));

  const subjectMonthly = new Map<string, number[]>();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May'];
  for (const m of months) subjectMonthly.set(m, []);
  for (const row of analyticsRows) {
    const scores = (row.scores || {}) as { academicPerformance?: number };
    const idx = analyticsRows.indexOf(row) % months.length;
    const month = months[idx];
    const list = subjectMonthly.get(month) || [];
    list.push(scores.academicPerformance ?? 70);
    subjectMonthly.set(month, list);
  }
  const subjectPerformance = months.map((name) => {
    const vals = subjectMonthly.get(name) || [70];
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    return { name, Math: Math.round(avg - 5), Science: Math.round(avg), English: Math.round(avg + 3), Social: Math.round(avg - 8) };
  });

  const overallAvg =
    studentPerformanceTrend.length > 0
      ? Math.round(studentPerformanceTrend.reduce((s, r) => s + r.value, 0) / studentPerformanceTrend.length * 10) / 10
      : 0;

  const insights: string[] = [];
  const lowClass = studentPerformanceTrend.find((c) => c.value < 75);
  if (lowClass) insights.push(`${lowClass.name} needs extra focus (avg ${lowClass.value}%)`);
  if (hwOverdue > 0) insights.push(`${hwOverdue} homework assignment(s) are overdue`);
  if (pendingPlans > 0) insights.push(`${pendingPlans} lesson plan(s) still pending completion`);
  if (insights.length === 0) insights.push('Academic operations are on track for this term');

  return {
    filters: { academicYear: year, term, className: opts.className, sectionName: opts.sectionName },
    kpis: {
      classes: classSections,
      subjects,
      teachers: teacherCount,
      lessonPlans: lessonPlans.length,
      homeworkAssigned: hwAssigned,
      assessmentsConducted: cceByType.UNIT_TEST + cceByType.ASSIGNMENT,
      students: studentCount,
    },
    lessonPlanCompletion: {
      percent: lessonPlanCompletionPercent,
      completed: completedPlans,
      inProgress: inProgressPlans,
      pending: pendingPlans,
      byDepartment: completionByDepartment,
    },
    homework: {
      assigned: hwAssigned,
      submitted: hwSubmitted,
      pending: hwPending,
      overdue: hwOverdue,
      totalSubmissions: hwTotalSubmissions,
      submittedCount: hwSubmittedCount,
      submissionRate: hwTotalSubmissions ? Math.round((hwSubmittedCount / hwTotalSubmissions) * 100) : 0,
    },
    cce: cceByType,
    syllabusProgress,
    subjectPerformance,
    studentPerformanceTrend,
    overallAvg,
    teacherWorkload,
    todaySchedule,
    keyActivities: calendarEvents.slice(0, 8).map((e) => ({
      title: e.title,
      date: e.eventDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      type: EVENT_TYPE_UI[e.eventType],
    })),
    calendarEvents: calendarEvents.map((e) => ({
      id: e.id,
      title: e.title,
      eventType: e.eventType,
      eventTypeLabel: EVENT_TYPE_UI[e.eventType],
      eventDate: e.eventDate.toISOString(),
      sharedToParents: e.sharedToParents,
    })),
    coScholastic: coScholastic.map((a) => ({
      id: a.id,
      title: a.title,
      activityDate: a.activityDate.toISOString(),
      venue: a.venue,
      status: a.status,
    })),
    insights,
  };
}
