import { ExamCalendarEventType, ExamTypeFilter, Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { getInstitutionFilterMeta } from './students.js';

const EXAM_TYPE_LABELS: Record<ExamTypeFilter, string> = {
  UNIT_TEST: 'Unit Test',
  MID_TERM: 'Mid Term Examination',
  HALF_YEARLY: 'Half Yearly Examination',
  PRE_FINAL: 'Pre Final Examination',
  FINAL_EXAMINATION: 'Final Examination',
};

const EVENT_TYPE_LABELS: Record<ExamCalendarEventType, string> = {
  EXAM: 'Examination',
  CLASS_TEST: 'Class Test',
};

function toDateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function formatDateDisplay(d: Date) {
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function monthRange(year: number, month: number) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));
  return { start, end };
}

function parseExamType(raw?: string): ExamTypeFilter | undefined {
  if (!raw || raw === 'all') return undefined;
  if (Object.values(ExamTypeFilter).includes(raw as ExamTypeFilter)) {
    return raw as ExamTypeFilter;
  }
  return undefined;
}

function parseEventType(raw?: string): ExamCalendarEventType | undefined {
  if (!raw || raw === 'all') return undefined;
  if (raw === 'EXAM' || raw === 'CLASS_TEST') return raw;
  return undefined;
}

async function nextCalendarRecordId(institutionId: string) {
  const count = await prisma.examCalendarSession.count({ where: { institutionId } });
  return `ECS-${String(1000 + count + 1)}`;
}

export async function getExamScheduleMeta(institutionId: string) {
  const filters = await getInstitutionFilterMeta(institutionId);
  return {
    defaultAcademicYear: filters.defaultAcademicYear,
    academicYears: filters.academicYears,
    examTypes: Object.entries(EXAM_TYPE_LABELS).map(([id, label]) => ({ id, label })),
    eventTypes: Object.entries(EVENT_TYPE_LABELS).map(([id, label]) => ({ id, label })),
    classes: filters.classes,
    sectionsByClass: filters.sectionsByClass,
  };
}

export type ExamCalendarEvent = {
  id: string;
  eventType: ExamCalendarEventType;
  eventTypeLabel: string;
  examType: string | null;
  examTypeLabel: string | null;
  seriesName: string;
  className: string;
  sectionName: string;
  subjectName: string;
  date: string;
  dateDisplay: string;
  startTime: string;
  endTime: string;
  status: string;
  source: 'calendar' | 'class_test';
};

export async function getExamScheduleCalendar(
  institutionId: string,
  opts: {
    academicYear?: string;
    year?: number;
    month?: number;
    className?: string;
    sectionName?: string;
    examType?: string;
    eventType?: string;
    includeClassTests?: boolean;
  },
) {
  const academicYear = opts.academicYear || '2025-26';
  const now = new Date();
  const year = opts.year ?? now.getFullYear();
  const month = opts.month ?? now.getMonth() + 1;
  const { start, end } = monthRange(year, month);
  const examType = parseExamType(opts.examType);
  const eventType = parseEventType(opts.eventType);
  const includeClassTests = opts.includeClassTests !== false;

  const sessionWhere: Prisma.ExamCalendarSessionWhereInput = {
    institutionId,
    academicYear,
    examDate: { gte: start, lte: end },
    ...(opts.className ? { className: opts.className } : {}),
    ...(opts.sectionName ? { sectionName: opts.sectionName } : {}),
    ...(examType ? { examType } : {}),
    ...(eventType ? { eventType } : {}),
  };

  const [sessions, classTests, schedules] = await Promise.all([
    prisma.examCalendarSession.findMany({
      where: sessionWhere,
      orderBy: [{ examDate: 'asc' }, { sortOrder: 'asc' }, { startTime: 'asc' }],
    }),
    includeClassTests && (!eventType || eventType === ExamCalendarEventType.CLASS_TEST)
      ? prisma.academicClassTest.findMany({
          where: {
            institutionId,
            academicYear,
            conductedDate: { gte: start, lte: end },
            ...(opts.className ? { className: opts.className } : {}),
            ...(opts.sectionName ? { sectionName: opts.sectionName } : {}),
            calendarSessions: { none: {} },
          },
          orderBy: [{ conductedDate: 'asc' }, { className: 'asc' }],
        })
      : Promise.resolve([]),
    prisma.examSchedule.findMany({
      where: { institutionId, academicYear },
      orderBy: [{ sortOrder: 'asc' }],
    }),
  ]);

  const sessionEvents: ExamCalendarEvent[] = sessions.map((s) => ({
    id: s.id,
    eventType: s.eventType,
    eventTypeLabel: EVENT_TYPE_LABELS[s.eventType],
    examType: s.examType,
    examTypeLabel: s.examType ? EXAM_TYPE_LABELS[s.examType] : null,
    seriesName: s.seriesName,
    className: s.className,
    sectionName: s.sectionName,
    subjectName: s.subjectName,
    date: toDateKey(s.examDate),
    dateDisplay: formatDateDisplay(s.examDate),
    startTime: s.startTime,
    endTime: s.endTime,
    status: s.status,
    source: 'calendar' as const,
  }));

  const classTestEvents: ExamCalendarEvent[] = classTests.map((ct) => ({
    id: ct.id,
    eventType: ExamCalendarEventType.CLASS_TEST,
    eventTypeLabel: EVENT_TYPE_LABELS.CLASS_TEST,
    examType: null,
    examTypeLabel: null,
    seriesName: ct.title,
    className: ct.className,
    sectionName: ct.sectionName,
    subjectName: ct.subjectName,
    date: ct.conductedDate ? toDateKey(ct.conductedDate) : '',
    dateDisplay: ct.conductedDate ? formatDateDisplay(ct.conductedDate) : '',
    startTime: '10:00 AM',
    endTime: '11:00 AM',
    status: ct.status,
    source: 'class_test' as const,
  }));

  const events = [...sessionEvents, ...classTestEvents].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.startTime.localeCompare(b.startTime);
  });

  const daysInMonth = end.getUTCDate();
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const calendar: {
    date: string;
    day: number;
    isToday: boolean;
    isCurrentMonth: boolean;
    events: ExamCalendarEvent[];
  }[] = [];

  const todayKey = toDateKey(new Date());
  const eventsByDate = new Map<string, ExamCalendarEvent[]>();
  for (const ev of events) {
    const list = eventsByDate.get(ev.date) || [];
    list.push(ev);
    eventsByDate.set(ev.date, list);
  }

  for (let i = 0; i < firstWeekday; i++) {
    const prevDate = new Date(Date.UTC(year, month - 1, -firstWeekday + i + 1));
    const dateKey = toDateKey(prevDate);
    calendar.push({
      date: dateKey,
      day: prevDate.getUTCDate(),
      isToday: dateKey === todayKey,
      isCurrentMonth: false,
      events: eventsByDate.get(dateKey) || [],
    });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = toDateKey(new Date(Date.UTC(year, month - 1, day)));
    calendar.push({
      date: dateKey,
      day,
      isToday: dateKey === todayKey,
      isCurrentMonth: true,
      events: eventsByDate.get(dateKey) || [],
    });
  }

  while (calendar.length % 7 !== 0) {
    const nextDay = calendar.length - firstWeekday - daysInMonth + 1;
    const nextDate = new Date(Date.UTC(year, month, nextDay));
    const dateKey = toDateKey(nextDate);
    calendar.push({
      date: dateKey,
      day: nextDate.getUTCDate(),
      isToday: dateKey === todayKey,
      isCurrentMonth: false,
      events: eventsByDate.get(dateKey) || [],
    });
  }

  const examCount = events.filter((e) => e.eventType === ExamCalendarEventType.EXAM).length;
  const classTestCount = events.filter((e) => e.eventType === ExamCalendarEventType.CLASS_TEST).length;

  return {
    academicYear,
    year,
    month,
    monthLabel: new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
    calendar,
    events,
    summary: {
      totalEvents: events.length,
      examCount,
      classTestCount,
      examSeries: schedules.map((s) => ({
        id: s.id,
        name: s.name,
        examType: s.examType,
        examTypeLabel: EXAM_TYPE_LABELS[s.examType],
        classRange: s.classRange,
        startDate: formatDateDisplay(s.startDate),
        endDate: formatDateDisplay(s.endDate),
      })),
    },
  };
}

export async function seedExamScheduleCalendarDemo(institutionId: string, academicYear = '2025-26') {
  const existing = await prisma.examCalendarSession.count({ where: { institutionId, academicYear } });
  if (existing > 0) {
    return { seeded: false, sessions: existing };
  }

  await seedExamDashboardIfNeeded(institutionId, academicYear);

  const schedules = await prisma.examSchedule.findMany({
    where: { institutionId, academicYear },
    orderBy: [{ sortOrder: 'asc' }],
  });
  const scheduleByType = new Map(schedules.map((s) => [s.examType, s]));

  const unitTest = scheduleByType.get(ExamTypeFilter.UNIT_TEST);
  const midTerm = scheduleByType.get(ExamTypeFilter.MID_TERM);
  const halfYearly = scheduleByType.get(ExamTypeFilter.HALF_YEARLY);

  const examSessions: {
    recordId: string;
    eventType: ExamCalendarEventType;
    examType?: ExamTypeFilter;
    scheduleId?: string;
    classTestId?: string;
    seriesName: string;
    className: string;
    sectionName: string;
    subjectName: string;
    examDate: string;
    startTime: string;
    endTime: string;
    status: string;
    sort: number;
  }[] = [];

  if (unitTest) {
    const unitDays = [
      { date: '2026-07-14', className: 'Class 8', sectionName: 'A', subjectName: 'Mathematics', start: '09:00 AM', end: '11:00 AM', sort: 1 },
      { date: '2026-07-15', className: 'Class 8', sectionName: 'A', subjectName: 'Science', start: '09:00 AM', end: '11:00 AM', sort: 2 },
      { date: '2026-07-15', className: 'Class 8', sectionName: 'B', subjectName: 'Mathematics', start: '09:00 AM', end: '11:00 AM', sort: 3 },
      { date: '2026-07-16', className: 'Class 9', sectionName: 'A', subjectName: 'English', start: '09:00 AM', end: '11:30 AM', sort: 4 },
      { date: '2026-07-17', className: 'Class 9', sectionName: 'A', subjectName: 'Social Science', start: '09:00 AM', end: '11:30 AM', sort: 5 },
      { date: '2026-07-18', className: 'Class 10', sectionName: 'A', subjectName: 'Mathematics', start: '09:00 AM', end: '12:00 PM', sort: 6 },
      { date: '2026-07-19', className: 'Class 10', sectionName: 'A', subjectName: 'Science', start: '09:00 AM', end: '12:00 PM', sort: 7 },
      { date: '2026-07-21', className: 'Class 8', sectionName: 'A', subjectName: 'Science', start: '10:00 AM', end: '12:00 PM', status: 'In Progress', sort: 8 },
      { date: '2026-07-22', className: 'Class 8', sectionName: 'B', subjectName: 'Science', start: '10:00 AM', end: '12:00 PM', sort: 9 },
      { date: '2026-07-23', className: 'Class 10', sectionName: 'B', subjectName: 'Mathematics', start: '09:00 AM', end: '12:00 PM', sort: 10 },
    ];
    for (const [i, d] of unitDays.entries()) {
      examSessions.push({
        recordId: `ECS-${1001 + i}`,
        eventType: ExamCalendarEventType.EXAM,
        examType: ExamTypeFilter.UNIT_TEST,
        scheduleId: unitTest.id,
        seriesName: unitTest.name,
        className: d.className,
        sectionName: d.sectionName,
        subjectName: d.subjectName,
        examDate: d.date,
        startTime: d.start,
        endTime: d.end,
        status: (d as { status?: string }).status || 'Scheduled',
        sort: d.sort,
      });
    }
  }

  if (midTerm) {
    const midDays = [
      { date: '2026-08-04', className: 'Class 6', sectionName: 'A', subjectName: 'Mathematics', start: '09:00 AM', end: '12:00 PM', sort: 1 },
      { date: '2026-08-05', className: 'Class 6', sectionName: 'A', subjectName: 'Science', start: '09:00 AM', end: '12:00 PM', sort: 2 },
      { date: '2026-08-06', className: 'Class 7', sectionName: 'A', subjectName: 'English', start: '09:00 AM', end: '12:00 PM', sort: 3 },
      { date: '2026-08-07', className: 'Class 7', sectionName: 'B', subjectName: 'Hindi', start: '09:00 AM', end: '12:00 PM', sort: 4 },
    ];
    for (const [i, d] of midDays.entries()) {
      examSessions.push({
        recordId: `ECS-${1101 + i}`,
        eventType: ExamCalendarEventType.EXAM,
        examType: ExamTypeFilter.MID_TERM,
        scheduleId: midTerm.id,
        seriesName: midTerm.name,
        className: d.className,
        sectionName: d.sectionName,
        subjectName: d.subjectName,
        examDate: d.date,
        startTime: d.start,
        endTime: d.end,
        status: 'Scheduled',
        sort: d.sort,
      });
    }
  }

  if (halfYearly) {
    examSessions.push({
      recordId: 'ECS-1201',
      eventType: ExamCalendarEventType.EXAM,
      examType: ExamTypeFilter.HALF_YEARLY,
      scheduleId: halfYearly.id,
      seriesName: halfYearly.name,
      className: 'Class 9',
      sectionName: 'A',
      subjectName: 'Mathematics',
      examDate: '2026-09-16',
      startTime: '09:00 AM',
      endTime: '12:30 PM',
      status: 'Scheduled',
      sort: 1,
    });
  }

  const classTests = await prisma.academicClassTest.findMany({
    where: { institutionId, academicYear },
    orderBy: [{ createdAt: 'asc' }],
    take: 12,
  });

  const classTestDates = [
    '2026-07-08', '2026-07-10', '2026-07-12', '2026-07-14', '2026-07-16',
    '2026-07-20', '2026-07-24', '2026-07-25', '2026-07-28', '2026-07-30',
    '2026-08-02', '2026-08-05',
  ];

  for (const [i, ct] of classTests.entries()) {
    const dateStr = classTestDates[i % classTestDates.length];
    const conductedDate = new Date(dateStr);
    await prisma.academicClassTest.update({
      where: { id: ct.id },
      data: {
        conductedDate: ct.conductedDate || conductedDate,
        status: i < 5 ? 'Conducted' : 'Scheduled',
      },
    });

    examSessions.push({
      recordId: `ECS-CT-${1001 + i}`,
      eventType: ExamCalendarEventType.CLASS_TEST,
      classTestId: ct.id,
      seriesName: `Class Test Series — ${ct.term}`,
      className: ct.className,
      sectionName: ct.sectionName,
      subjectName: ct.subjectName,
      examDate: dateStr,
      startTime: '10:30 AM',
      endTime: '11:30 AM',
      status: i < 5 ? 'Conducted' : 'Scheduled',
      sort: i + 1,
    });
  }

  let created = 0;
  for (const s of examSessions) {
    const data = {
      institutionId,
      recordId: s.recordId,
      academicYear,
      eventType: s.eventType,
      examType: s.examType ?? null,
      scheduleId: s.scheduleId ?? null,
      classTestId: s.classTestId ?? null,
      seriesName: s.seriesName,
      className: s.className,
      sectionName: s.sectionName,
      subjectName: s.subjectName,
      examDate: new Date(s.examDate),
      startTime: s.startTime,
      endTime: s.endTime,
      status: s.status,
      sortOrder: s.sort,
    };
    await prisma.examCalendarSession.create({ data });
    created++;
  }

  return { seeded: true, sessions: created };
}

async function seedExamDashboardIfNeeded(institutionId: string, academicYear: string) {
  const count = await prisma.examSchedule.count({ where: { institutionId } });
  if (count > 0) return;
  const { seedExamDashboardDemo } = await import('./examDashboard.js');
  await seedExamDashboardDemo(institutionId, academicYear);
}

export async function createExamCalendarSession(
  institutionId: string,
  data: {
    academicYear: string;
    eventType: ExamCalendarEventType;
    examType?: ExamTypeFilter;
    scheduleId?: string;
    seriesName: string;
    className: string;
    sectionName: string;
    subjectName: string;
    examDate: string;
    startTime?: string;
    endTime?: string;
    status?: string;
  },
) {
  const recordId = await nextCalendarRecordId(institutionId);
  const row = await prisma.examCalendarSession.create({
    data: {
      institutionId,
      recordId,
      academicYear: data.academicYear,
      eventType: data.eventType,
      examType: data.examType ?? null,
      scheduleId: data.scheduleId ?? null,
      seriesName: data.seriesName,
      className: data.className,
      sectionName: data.sectionName,
      subjectName: data.subjectName,
      examDate: new Date(data.examDate),
      startTime: data.startTime || '',
      endTime: data.endTime || '',
      status: data.status || 'Scheduled',
    },
  });
  return { id: row.id, recordId: row.recordId };
}
