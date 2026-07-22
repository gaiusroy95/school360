import {
  AttendanceSessionMode,
  AttendanceStatus,
  LeaveApplicationStatus,
  Prisma,
  StudentStatus,
} from '@prisma/client';
import { prisma } from './prisma.js';
import { formatClassSection, getInstitutionFilterMeta } from './students.js';
import { resolveTeacherPeriodRange, type TeacherPeriod } from './teacherAttendance.js';

export type StudentPeriod = TeacherPeriod;

export const STUDENT_ATTENDANCE_SECTIONS = [
  { id: 'PRESENT', key: 'present', title: 'Present', color: '#10b981' },
  { id: 'ABSENT', key: 'absent', title: 'Absent', color: '#ef4444' },
  { id: 'LATE', key: 'late', title: 'Late', color: '#f59e0b' },
  { id: 'ON_LEAVE', key: 'onLeave', title: 'On Leave', color: '#8b5cf6' },
  { id: 'HALF_DAY', key: 'halfDay', title: 'Half Day', color: '#6366f1' },
] as const;

const STUDENT_STATUS_SHORT: Record<AttendanceStatus, string> = {
  PRESENT: 'P',
  ABSENT: 'A',
  LATE: 'L',
  ON_LEAVE: 'OL',
  HALF_DAY: 'HD',
};

const STATUS_UI: Record<AttendanceStatus, string> = {
  PRESENT: 'Present',
  ABSENT: 'Absent',
  LATE: 'Late',
  ON_LEAVE: 'On Leave',
  HALF_DAY: 'Half Day',
};

function parseDateOnly(value?: string | Date): Date {
  if (value instanceof Date) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  }
  const raw = String(value || '').trim();
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function formatDateIso(d: Date) {
  return d.toISOString().slice(0, 10);
}

function startOfMonth(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function endOfMonth(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
}

function isWeekend(d: Date) {
  const day = d.getUTCDay();
  return day === 0 || day === 6;
}

async function nextAttendanceRecordId(institutionId: string, prefix: string) {
  const count = await prisma.attendanceSession.count({ where: { institutionId } });
  return `${prefix}-${String(1000 + count + 1)}`;
}

async function nextLeaveRecordId(institutionId: string) {
  const count = await prisma.studentLeaveApplication.count({ where: { institutionId } });
  return `LV-${String(1000 + count + 1)}`;
}

function studentWhere(
  institutionId: string,
  academicYear: string,
  opts?: { sectionName?: string; className?: string },
): Prisma.StudentWhereInput {
  const where: Prisma.StudentWhereInput = {
    institutionId,
    academicYear,
    status: StudentStatus.ACTIVE,
  };
  if (opts?.sectionName) where.sectionName = opts.sectionName;
  if (opts?.className) where.className = opts.className;
  return where;
}

function timeBucket(checkInTime: string): 'before8' | '8to830' | '830to9' | 'after9' | 'none' {
  if (!checkInTime) return 'none';
  const m = checkInTime.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return 'none';
  const mins = Number(m[1]) * 60 + Number(m[2]);
  if (mins < 8 * 60) return 'before8';
  if (mins < 8 * 60 + 30) return '8to830';
  if (mins < 9 * 60) return '830to9';
  return 'after9';
}

function pct(n: number, total: number) {
  if (!total) return 0;
  return Math.round((n / total) * 1000) / 10;
}

export async function getAttendanceMeta(institutionId: string) {
  const filters = await getInstitutionFilterMeta(institutionId);
  const classOptions = await prisma.student.findMany({
    where: { institutionId, status: StudentStatus.ACTIVE },
    select: { className: true, sectionName: true },
    distinct: ['className', 'sectionName'],
    orderBy: [{ className: 'asc' }, { sectionName: 'asc' }],
  });
  const classGroups = classOptions.map((r) => ({
    className: r.className,
    sectionName: r.sectionName,
    label: formatClassSection(r.className, r.sectionName),
  }));
  const sections = [
    ...new Set(Object.values(filters.sectionsByClass).flat()),
  ].sort();
  return {
    defaultAcademicYear: filters.defaultAcademicYear,
    academicYears: filters.academicYears,
    sections,
    classes: filters.classes,
    classGroups,
    terms: ['Term 1', 'Term 2'],
  };
}

export async function getStudentAttendanceDashboard(
  institutionId: string,
  opts: { academicYear?: string; sectionName?: string; date?: string },
) {
  const academicYear = opts.academicYear || '2025-26';
  const today = parseDateOnly(opts.date);
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);

  const studentFilter = studentWhere(institutionId, academicYear, {
    sectionName: opts.sectionName || undefined,
  });
  const totalStudents = await prisma.student.count({ where: studentFilter });

  const todaySessions = await prisma.attendanceSession.findMany({
    where: {
      institutionId,
      academicYear,
      sessionDate: today,
      mode: AttendanceSessionMode.CLASS,
      ...(opts.sectionName ? { sectionName: opts.sectionName } : {}),
    },
    include: { records: true },
  });

  const todayRecords = todaySessions.flatMap((s) => s.records);
  const presentToday = todayRecords.filter((r) => r.status === AttendanceStatus.PRESENT).length;
  const absentToday = todayRecords.filter((r) => r.status === AttendanceStatus.ABSENT).length;
  const lateToday = todayRecords.filter((r) => r.status === AttendanceStatus.LATE).length;
  const onLeaveToday = todayRecords.filter((r) => r.status === AttendanceStatus.ON_LEAVE).length;
  const markedToday = todayRecords.length;

  const monthSessions = await prisma.attendanceSession.findMany({
    where: {
      institutionId,
      academicYear,
      sessionDate: { gte: monthStart, lte: monthEnd },
      mode: AttendanceSessionMode.CLASS,
      ...(opts.sectionName ? { sectionName: opts.sectionName } : {}),
    },
    include: { records: true },
  });

  const monthRecords = monthSessions.flatMap((s) => s.records);
  const monthPresent = monthRecords.filter((r) =>
    r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.LATE,
  ).length;
  const monthAbsent = monthRecords.filter((r) => r.status === AttendanceStatus.ABSENT).length;
  const monthLate = monthRecords.filter((r) => r.status === AttendanceStatus.LATE).length;
  const monthOnLeave = monthRecords.filter((r) => r.status === AttendanceStatus.ON_LEAVE).length;
  const monthTotalMarks = monthRecords.length;
  const avgAttendance = monthTotalMarks
    ? pct(monthPresent, monthTotalMarks)
    : (markedToday ? pct(presentToday + lateToday, markedToday) : 0);

  const holidays = await prisma.holiday.findMany({
    where: { institutionId, date: { gte: monthStart, lte: monthEnd } },
  });
  const holidayDates = new Set(holidays.map((h) => formatDateIso(h.date)));

  let workingDays = 0;
  let weekendDays = 0;
  const cursor = new Date(monthStart);
  while (cursor <= monthEnd) {
    if (isWeekend(cursor)) weekendDays += 1;
    else if (!holidayDates.has(formatDateIso(cursor))) workingDays += 1;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  const daysCompleted = Math.min(
    workingDays,
    [...new Set(monthSessions.map((s) => formatDateIso(s.sessionDate)))].length,
  );

  const trend: { date: string; present: number; absent: number; late: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const iso = formatDateIso(d);
    const daySessions = monthSessions.filter((s) => formatDateIso(s.sessionDate) === iso);
    const recs = daySessions.flatMap((s) => s.records);
    const total = recs.length || 1;
    trend.push({
      date: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      present: pct(recs.filter((r) => r.status === AttendanceStatus.PRESENT).length, total),
      absent: pct(recs.filter((r) => r.status === AttendanceStatus.ABSENT).length, total),
      late: pct(recs.filter((r) => r.status === AttendanceStatus.LATE).length, total),
    });
  }

  const classMap = new Map<string, { present: number; absent: number; late: number; leave: number; total: number }>();
  for (const session of todaySessions) {
    const key = formatClassSection(session.className, session.sectionName);
    if (!classMap.has(key)) classMap.set(key, { present: 0, absent: 0, late: 0, leave: 0, total: 0 });
    const row = classMap.get(key)!;
    for (const rec of session.records) {
      row.total += 1;
      if (rec.status === AttendanceStatus.PRESENT) row.present += 1;
      if (rec.status === AttendanceStatus.ABSENT) row.absent += 1;
      if (rec.status === AttendanceStatus.LATE) row.late += 1;
      if (rec.status === AttendanceStatus.ON_LEAVE) row.leave += 1;
    }
  }
  const todayByClass = [...classMap.entries()].map(([className, v]) => ({
    className,
    present: v.present,
    absent: v.absent,
    late: v.late,
    leave: v.leave,
    percent: pct(v.present + v.late, v.total),
  })).sort((a, b) => a.className.localeCompare(b.className));

  const classMonthMap = new Map<string, { present: number; total: number }>();
  for (const session of monthSessions) {
    const key = session.className;
    if (!classMonthMap.has(key)) classMonthMap.set(key, { present: 0, total: 0 });
    const row = classMonthMap.get(key)!;
    for (const rec of session.records) {
      row.total += 1;
      if (rec.status === AttendanceStatus.PRESENT || rec.status === AttendanceStatus.LATE) row.present += 1;
    }
  }
  const classProgress = [...classMonthMap.entries()]
    .map(([name, v]) => ({ name, percent: pct(v.present, v.total) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const timeBuckets = { before8: 0, '8to830': 0, '830to9': 0, after9: 0 };
  for (const rec of todayRecords.filter((r) =>
    r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.LATE,
  )) {
    const b = timeBucket(rec.checkInTime);
    if (b !== 'none') timeBuckets[b] += 1;
  }

  const leaveApps = await prisma.studentLeaveApplication.findMany({
    where: {
      institutionId,
      academicYear,
      createdAt: { gte: monthStart, lte: new Date(monthEnd.getTime() + 86400000) },
    },
  });

  const topStudents = await getTopStudentsByAttendance(institutionId, academicYear, opts.sectionName, 5);

  const atRiskStudents = await countAtRiskStudents(institutionId, academicYear, opts.sectionName);

  const prevMonthEnd = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 0));
  const prevMonthStart = startOfMonth(prevMonthEnd);
  const prevSessions = await prisma.attendanceSession.findMany({
    where: {
      institutionId,
      academicYear,
      sessionDate: { gte: prevMonthStart, lte: prevMonthEnd },
      mode: AttendanceSessionMode.CLASS,
    },
    include: { records: true },
  });
  const prevRecs = prevSessions.flatMap((s) => s.records);
  const prevPresent = prevRecs.filter((r) =>
    r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.LATE,
  ).length;
  const prevAvg = prevRecs.length ? pct(prevPresent, prevRecs.length) : avgAttendance;
  const improvement = Math.round((avgAttendance - prevAvg) * 10) / 10;

  const bestClass = classProgress.reduce(
    (best, cur) => (cur.percent > (best?.percent || 0) ? cur : best),
    classProgress[0] || null,
  );
  const lowestClass = classProgress.reduce(
    (low, cur) => (cur.percent < (low?.percent ?? 101) ? cur : low),
    classProgress[0] || null,
  );

  const alerts = buildAlerts({
    atRiskStudents,
    absentToday,
    lateToday,
    onLeaveToday,
    consecutiveAbsent: await countConsecutiveAbsent(institutionId, academicYear, 3),
  });

  return {
    filters: { academicYear, sectionName: opts.sectionName || null, date: formatDateIso(today) },
    generatedAt: new Date().toISOString(),
    kpis: {
      totalStudents,
      presentToday,
      absentToday,
      lateToday,
      onLeaveToday,
      averageAttendance: avgAttendance,
      presentPercent: pct(presentToday, totalStudents),
      absentPercent: pct(absentToday, totalStudents),
      latePercent: pct(lateToday, totalStudents),
      onLeavePercent: pct(onLeaveToday, totalStudents),
      improvement,
      studentGrowthPercent: 8.5,
    },
    overview: {
      present: monthPresent || presentToday,
      absent: monthAbsent || absentToday,
      late: monthLate || lateToday,
      onLeave: monthOnLeave || onLeaveToday,
      overallPercent: avgAttendance,
      totalStudents,
    },
    realTime: {
      totalStudents,
      present: presentToday,
      absent: absentToday,
      late: lateToday,
      onLeave: onLeaveToday,
      presentPercent: pct(presentToday, totalStudents),
      absentPercent: pct(absentToday, totalStudents),
      latePercent: pct(lateToday, totalStudents),
      onLeavePercent: pct(onLeaveToday, totalStudents),
      lastUpdated: new Date().toISOString(),
    },
    trend,
    todayByClass,
    classProgress,
    monthSummary: {
      workingDays,
      daysCompleted,
      holidays: holidays.length,
      attendanceTaken: daysCompleted,
      bestClass: bestClass ? `${bestClass.name} (${bestClass.percent}%)` : '—',
      lowestClass: lowestClass ? `${lowestClass.name} (${lowestClass.percent}%)` : '—',
      improvement,
      atRiskStudents,
    },
    dayType: {
      workingDays: avgAttendance,
      holidays: holidays.length ? Math.round((holidays.length / (workingDays + holidays.length + weekendDays)) * 1000) / 10 : 0.8,
      weekend: weekendDays ? Math.round((weekendDays / (workingDays + holidays.length + weekendDays)) * 1000) / 10 : 6.6,
    },
    timeBuckets,
    leaveOverview: {
      total: leaveApps.length,
      approved: leaveApps.filter((l) => l.status === LeaveApplicationStatus.APPROVED).length,
      pending: leaveApps.filter((l) => l.status === LeaveApplicationStatus.PENDING).length,
      rejected: leaveApps.filter((l) => l.status === LeaveApplicationStatus.REJECTED).length,
    },
    topStudents,
    alerts,
  };
}

function buildAlerts(input: {
  atRiskStudents: number;
  absentToday: number;
  lateToday: number;
  onLeaveToday: number;
  consecutiveAbsent: number;
}) {
  const alerts = [];
  if (input.atRiskStudents > 0) {
    alerts.push({
      type: 'high_absenteeism',
      title: 'High Absenteeism',
      description: `${input.atRiskStudents} students have < 75% attendance`,
      time: 'Just now',
    });
  }
  if (input.consecutiveAbsent > 0) {
    alerts.push({
      type: 'continuous_absent',
      title: 'Continuous Absent',
      description: `${input.consecutiveAbsent} students absent for 3+ consecutive days`,
      time: '25 min ago',
    });
  }
  if (input.lateToday > 0) {
    alerts.push({
      type: 'late',
      title: 'Late Coming Alert',
      description: `${input.lateToday} students came late today`,
      time: '35 min ago',
    });
  }
  if (input.onLeaveToday > 0) {
    alerts.push({
      type: 'on_leave',
      title: 'On Leave',
      description: `${input.onLeaveToday} students on leave today`,
      time: '1 hr ago',
    });
  }
  return alerts;
}

async function countAtRiskStudents(
  institutionId: string,
  academicYear: string,
  sectionName?: string,
) {
  const students = await prisma.student.findMany({
    where: studentWhere(institutionId, academicYear, { sectionName }),
    select: { id: true },
  });
  let count = 0;
  for (const s of students) {
    const pctVal = await getStudentAttendancePercent(institutionId, s.id, academicYear);
    if (pctVal > 0 && pctVal < 75) count += 1;
  }
  return count;
}

async function countConsecutiveAbsent(
  institutionId: string,
  academicYear: string,
  minDays: number,
) {
  const students = await prisma.student.findMany({
    where: studentWhere(institutionId, academicYear),
    select: { id: true },
  });
  let count = 0;
  const today = parseDateOnly();
  for (const s of students) {
    let streak = 0;
    for (let i = 0; i < minDays; i++) {
      const d = new Date(today);
      d.setUTCDate(d.getUTCDate() - i);
      const rec = await prisma.attendanceRecord.findFirst({
        where: {
          studentId: s.id,
          status: AttendanceStatus.ABSENT,
          session: { institutionId, academicYear, sessionDate: d },
        },
      });
      if (rec) streak += 1;
      else break;
    }
    if (streak >= minDays) count += 1;
  }
  return count;
}

async function getStudentAttendancePercent(
  institutionId: string,
  studentId: string,
  academicYear: string,
) {
  const records = await prisma.attendanceRecord.findMany({
    where: {
      studentId,
      session: { institutionId, academicYear, mode: AttendanceSessionMode.CLASS },
    },
  });
  if (!records.length) return 0;
  const present = records.filter((r) =>
    r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.LATE,
  ).length;
  return pct(present, records.length);
}

async function getTopStudentsByAttendance(
  institutionId: string,
  academicYear: string,
  sectionName: string | undefined,
  limit: number,
) {
  const students = await prisma.student.findMany({
    where: studentWhere(institutionId, academicYear, { sectionName }),
    select: { id: true, firstName: true, lastName: true, className: true, sectionName: true },
  });
  const scored: { name: string; class: string; percent: number }[] = [];
  for (const s of students) {
    const p = await getStudentAttendancePercent(institutionId, s.id, academicYear);
    if (p > 0) {
      scored.push({
        name: `${s.firstName} ${s.lastName}`.trim(),
        class: formatClassSection(s.className, s.sectionName),
        percent: p,
      });
    }
  }
  return scored.sort((a, b) => b.percent - a.percent).slice(0, limit);
}

export type DrilldownType =
  | 'total'
  | 'present'
  | 'absent'
  | 'late'
  | 'onLeave'
  | 'average'
  | 'atRisk';

export async function getAttendanceDrilldown(
  institutionId: string,
  type: DrilldownType,
  opts: { academicYear?: string; sectionName?: string; date?: string },
) {
  const academicYear = opts.academicYear || '2025-26';
  const today = parseDateOnly(opts.date);

  if (type === 'total') {
    const students = await prisma.student.findMany({
      where: studentWhere(institutionId, academicYear, { sectionName: opts.sectionName }),
      orderBy: [{ className: 'asc' }, { firstName: 'asc' }],
    });
    return {
      type,
      title: 'All Students',
      columns: [
        { key: 'admissionNumber', label: 'Admission No.' },
        { key: 'name', label: 'Student Name' },
        { key: 'classGroup', label: 'Class' },
        { key: 'mobile', label: 'Mobile' },
        { key: 'attendancePercent', label: 'Attendance %' },
      ],
      rows: await Promise.all(students.map(async (s) => ({
        admissionNumber: s.admissionNumber,
        name: `${s.firstName} ${s.lastName}`.trim(),
        classGroup: formatClassSection(s.className, s.sectionName),
        mobile: s.mobile,
        attendancePercent: await getStudentAttendancePercent(institutionId, s.id, academicYear),
      }))),
    };
  }

  if (type === 'average' || type === 'atRisk') {
    const students = await prisma.student.findMany({
      where: studentWhere(institutionId, academicYear, { sectionName: opts.sectionName }),
      orderBy: [{ className: 'asc' }, { firstName: 'asc' }],
    });
    const rows = [];
    for (const s of students) {
      const attendancePercent = await getStudentAttendancePercent(institutionId, s.id, academicYear);
      if (type === 'atRisk' && (attendancePercent === 0 || attendancePercent >= 75)) continue;
      if (type === 'average' && attendancePercent === 0) continue;
      rows.push({
        admissionNumber: s.admissionNumber,
        name: `${s.firstName} ${s.lastName}`.trim(),
        classGroup: formatClassSection(s.className, s.sectionName),
        attendancePercent,
        status: attendancePercent < 75 ? 'At Risk' : 'Good',
      });
    }
    return {
      type,
      title: type === 'atRisk' ? 'At Risk Students (< 75%)' : 'Student Attendance Summary',
      columns: [
        { key: 'admissionNumber', label: 'Admission No.' },
        { key: 'name', label: 'Student Name' },
        { key: 'classGroup', label: 'Class' },
        { key: 'attendancePercent', label: 'Attendance %' },
        { key: 'status', label: 'Status' },
      ],
      rows: rows.sort((a, b) => a.attendancePercent - b.attendancePercent),
    };
  }

  const statusMap: Record<string, AttendanceStatus> = {
    present: AttendanceStatus.PRESENT,
    absent: AttendanceStatus.ABSENT,
    late: AttendanceStatus.LATE,
    onLeave: AttendanceStatus.ON_LEAVE,
  };
  const status = statusMap[type];
  const records = await prisma.attendanceRecord.findMany({
    where: {
      status,
      session: {
        institutionId,
        academicYear,
        sessionDate: today,
        mode: AttendanceSessionMode.CLASS,
        ...(opts.sectionName ? { sectionName: opts.sectionName } : {}),
      },
    },
    include: { student: true, session: true },
    orderBy: { student: { firstName: 'asc' } },
  });

  return {
    type,
    title: `${STATUS_UI[status]} Today`,
    columns: [
      { key: 'admissionNumber', label: 'Admission No.' },
      { key: 'name', label: 'Student Name' },
      { key: 'classGroup', label: 'Class' },
      { key: 'status', label: 'Status' },
      { key: 'checkInTime', label: 'Check-in' },
      { key: 'absentReason', label: 'Reason / Remarks' },
    ],
    rows: records.map((r) => ({
      admissionNumber: r.student.admissionNumber,
      name: `${r.student.firstName} ${r.student.lastName}`.trim(),
      classGroup: formatClassSection(r.student.className, r.student.sectionName),
      status: STATUS_UI[r.status],
      checkInTime: r.checkInTime || '—',
      absentReason: r.absentReason || r.remarks || '—',
    })),
  };
}

export async function getAttendanceRoster(
  institutionId: string,
  opts: {
    academicYear?: string;
    className: string;
    sectionName?: string;
    date?: string;
    mode?: AttendanceSessionMode;
    subjectName?: string;
    activityName?: string;
  },
) {
  const academicYear = opts.academicYear || '2025-26';
  const sessionDate = parseDateOnly(opts.date);
  const mode = opts.mode || AttendanceSessionMode.CLASS;
  const sectionName = opts.sectionName || '';

  const students = await prisma.student.findMany({
    where: {
      institutionId,
      academicYear,
      status: StudentStatus.ACTIVE,
      className: opts.className,
      sectionName,
    },
    orderBy: [{ rollNumber: 'asc' }, { firstName: 'asc' }],
  });

  const session = await prisma.attendanceSession.findFirst({
    where: {
      institutionId,
      sessionDate,
      className: opts.className,
      sectionName,
      mode,
      subjectName: opts.subjectName || '',
      activityName: opts.activityName || '',
    },
    include: { records: true },
  });

  const recordMap = new Map((session?.records || []).map((r) => [r.studentId, r]));

  return {
    session: session
      ? {
          id: session.id,
          recordId: session.recordId,
          sessionDate: formatDateIso(session.sessionDate),
          markedBy: session.markedBy,
          source: session.source,
        }
      : null,
    students: students.map((s) => {
      const rec = recordMap.get(s.id);
      return {
        studentId: s.id,
        admissionNumber: s.admissionNumber,
        rollNumber: s.rollNumber,
        name: `${s.firstName} ${s.lastName}`.trim(),
        classGroup: formatClassSection(s.className, s.sectionName),
        status: rec?.status || null,
        checkInTime: rec?.checkInTime || '',
        absentReason: rec?.absentReason || '',
        remarks: rec?.remarks || '',
      };
    }),
  };
}

export async function markAttendanceSession(
  institutionId: string,
  input: {
    academicYear?: string;
    sessionDate: string;
    className: string;
    sectionName?: string;
    mode?: AttendanceSessionMode;
    subjectName?: string;
    activityName?: string;
    markedBy?: string;
    source?: string;
    records: {
      studentId: string;
      status: AttendanceStatus;
      checkInTime?: string;
      absentReason?: string;
      remarks?: string;
      lateMinutes?: number;
    }[];
  },
) {
  const academicYear = input.academicYear || '2025-26';
  const sessionDate = parseDateOnly(input.sessionDate);
  const sectionName = input.sectionName || '';
  const mode = input.mode || AttendanceSessionMode.CLASS;
  const subjectName = input.subjectName || '';
  const activityName = input.activityName || '';

  let session = await prisma.attendanceSession.findFirst({
    where: {
      institutionId,
      sessionDate,
      className: input.className,
      sectionName,
      mode,
      subjectName,
      activityName,
    },
  });

  if (!session) {
    session = await prisma.attendanceSession.create({
      data: {
        institutionId,
        recordId: await nextAttendanceRecordId(institutionId, 'ATT'),
        academicYear,
        sessionDate,
        className: input.className,
        sectionName,
        mode,
        subjectName,
        activityName,
        markedBy: input.markedBy || 'Admin',
        source: input.source || 'MANUAL',
      },
    });
  }

  for (const rec of input.records) {
    await prisma.attendanceRecord.upsert({
      where: {
        sessionId_studentId: { sessionId: session.id, studentId: rec.studentId },
      },
      create: {
        sessionId: session.id,
        studentId: rec.studentId,
        status: rec.status,
        checkInTime: rec.checkInTime || '',
        absentReason: rec.absentReason || '',
        remarks: rec.remarks || '',
        lateMinutes: rec.lateMinutes || 0,
      },
      update: {
        status: rec.status,
        checkInTime: rec.checkInTime || '',
        absentReason: rec.absentReason || '',
        remarks: rec.remarks || '',
        lateMinutes: rec.lateMinutes || 0,
      },
    });

    if (formatDateIso(sessionDate) === formatDateIso(new Date())) {
      const student = await prisma.student.findUnique({ where: { id: rec.studentId } });
      if (student) {
        const customFields = (student.customFields || {}) as Record<string, unknown>;
        const profile = (customFields.profile || {}) as Record<string, unknown>;
        const statusLabel = STATUS_UI[rec.status];
        await prisma.student.update({
          where: { id: rec.studentId },
          data: {
            customFields: {
              ...customFields,
              profile: { ...profile, attendanceToday: statusLabel },
            },
          },
        });
      }
    }
  }

  return { sessionId: session.id, recordId: session.recordId, marked: input.records.length };
}

export async function seedAttendanceDemo(institutionId: string, academicYear = '2025-26') {
  const students = await prisma.student.findMany({
    where: { institutionId, academicYear, status: StudentStatus.ACTIVE },
  });
  if (!students.length) return { sessions: 0, records: 0, leaves: 0 };

  const byClass = new Map<string, typeof students>();
  for (const s of students) {
    const key = `${s.className}::${s.sectionName}`;
    if (!byClass.has(key)) byClass.set(key, []);
    byClass.get(key)!.push(s);
  }

  const reasons = ['Fever', 'Family function', 'Medical appointment', 'Travel', 'Personal'];
  let sessionCount = 0;
  let recordCount = 0;
  const today = parseDateOnly();

  for (let dayOffset = 29; dayOffset >= 0; dayOffset--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - dayOffset);
    if (isWeekend(d)) continue;

    for (const [, classStudents] of byClass) {
      const sample = classStudents[0];
      const session = await prisma.attendanceSession.upsert({
        where: {
          institutionId_sessionDate_className_sectionName_mode_subjectName_activityName: {
            institutionId,
            sessionDate: d,
            className: sample.className,
            sectionName: sample.sectionName,
            mode: AttendanceSessionMode.CLASS,
            subjectName: '',
            activityName: '',
          },
        },
        create: {
          institutionId,
          recordId: await nextAttendanceRecordId(institutionId, 'ATT'),
          academicYear,
          sessionDate: d,
          className: sample.className,
          sectionName: sample.sectionName,
          markedBy: 'System Seed',
          source: 'MANUAL',
        },
        update: {},
      });
      sessionCount += 1;

      for (const student of classStudents) {
        const roll = Math.random();
        let status: AttendanceStatus = AttendanceStatus.PRESENT;
        let checkInTime = '08:15';
        let checkOutTime = '15:35';
        let absentReason = '';
        if (roll < 0.06) {
          status = AttendanceStatus.ABSENT;
          checkInTime = '';
          checkOutTime = '';
          absentReason = reasons[Math.floor(Math.random() * reasons.length)];
        } else if (roll < 0.075) {
          status = AttendanceStatus.LATE;
          checkInTime = '08:45';
          checkOutTime = '15:35';
        } else if (roll < 0.085) {
          status = AttendanceStatus.ON_LEAVE;
          checkInTime = '';
          checkOutTime = '';
        } else if (roll < 0.095) {
          checkInTime = '08:10';
          checkOutTime = '14:30';
        } else if (roll < 0.10) {
          checkInTime = '08:50';
          checkOutTime = '14:45';
        }

        const lateMinutes = status === AttendanceStatus.LATE ? 30 : (checkInTime === '08:50' ? 35 : 0);
        const earlyExitMinutes = checkOutTime === '14:30' ? 30 : (checkOutTime === '14:45' ? 15 : 0);

        await prisma.attendanceRecord.upsert({
          where: { sessionId_studentId: { sessionId: session.id, studentId: student.id } },
          create: {
            sessionId: session.id,
            studentId: student.id,
            status,
            checkInTime,
            checkOutTime,
            absentReason,
            lateMinutes,
            earlyExitMinutes,
          },
          update: { status, checkInTime, checkOutTime, absentReason, lateMinutes, earlyExitMinutes },
        });
        recordCount += 1;
      }
    }
  }

  let leaveCount = 0;
  const leaveStudents = students.slice(0, Math.min(15, students.length));
  for (const s of leaveStudents) {
    const from = new Date(today);
    from.setUTCDate(from.getUTCDate() - Math.floor(Math.random() * 10));
    const to = new Date(from);
    to.setUTCDate(to.getUTCDate() + Math.floor(Math.random() * 3));
    const statuses = [
      LeaveApplicationStatus.APPROVED,
      LeaveApplicationStatus.PENDING,
      LeaveApplicationStatus.REJECTED,
    ];
    await prisma.studentLeaveApplication.upsert({
      where: { institutionId_recordId: { institutionId, recordId: `LV-SEED-${s.id.slice(-6)}` } },
      create: {
        institutionId,
        recordId: `LV-SEED-${s.id.slice(-6)}`,
        studentId: s.id,
        academicYear,
        fromDate: from,
        toDate: to,
        reason: reasons[Math.floor(Math.random() * reasons.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)],
      },
      update: {},
    });
    leaveCount += 1;
  }

  return { sessions: sessionCount, records: recordCount, leaves: leaveCount };
}

function listWorkingDatesInRange(from: Date, to: Date) {
  const dates: Date[] = [];
  const cur = new Date(from);
  while (cur <= to) {
    if (!isWeekend(cur)) dates.push(new Date(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}

export async function getStudentAttendanceReport(
  institutionId: string,
  opts: {
    academicYear?: string;
    period?: StudentPeriod;
    year?: number;
    month?: number;
    quarter?: number;
    half?: 1 | 2;
    sectionName?: string;
    className?: string;
  },
) {
  const academicYear = opts.academicYear || '2025-26';
  const period = opts.period || 'monthly';
  const range = resolveTeacherPeriodRange({
    academicYear,
    period,
    year: opts.year,
    month: opts.month,
    quarter: opts.quarter,
    half: opts.half,
  });
  const workingDates = listWorkingDatesInRange(range.from, range.to);

  const students = await prisma.student.findMany({
    where: studentWhere(institutionId, academicYear, {
      sectionName: opts.sectionName,
      className: opts.className,
    }),
    orderBy: [{ className: 'asc' }, { sectionName: 'asc' }, { firstName: 'asc' }],
  });

  const sessions = await prisma.attendanceSession.findMany({
    where: {
      institutionId,
      academicYear,
      sessionDate: { gte: range.from, lte: range.to },
      mode: AttendanceSessionMode.CLASS,
      ...(opts.sectionName ? { sectionName: opts.sectionName } : {}),
      ...(opts.className ? { className: opts.className } : {}),
    },
    include: { records: true },
  });

  const recordLookup = new Map<string, {
    status: AttendanceStatus;
    checkInTime: string;
    absentReason: string;
    remarks: string;
  }>();
  for (const session of sessions) {
    const iso = formatDateIso(session.sessionDate);
    for (const rec of session.records) {
      recordLookup.set(`${rec.studentId}::${iso}`, {
        status: rec.status,
        checkInTime: rec.checkInTime,
        absentReason: rec.absentReason,
        remarks: rec.remarks,
      });
    }
  }

  const dateColumns = workingDates.map((d) => ({
    date: formatDateIso(d),
    label: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
  }));

  const rows = students.map((s) => {
    const daily: Record<string, string> = {};
    let daysPresent = 0;
    let daysAbsent = 0;
    let daysLate = 0;
    let daysOnLeave = 0;
    let daysHalfDay = 0;

    for (const d of workingDates) {
      const iso = formatDateIso(d);
      const rec = recordLookup.get(`${s.id}::${iso}`);
      daily[iso] = rec ? STUDENT_STATUS_SHORT[rec.status] : '—';
      if (rec?.status === AttendanceStatus.PRESENT) daysPresent += 1;
      if (rec?.status === AttendanceStatus.ABSENT) daysAbsent += 1;
      if (rec?.status === AttendanceStatus.LATE) daysLate += 1;
      if (rec?.status === AttendanceStatus.ON_LEAVE) daysOnLeave += 1;
      if (rec?.status === AttendanceStatus.HALF_DAY) daysHalfDay += 1;
    }

    const daysMarked = daysPresent + daysAbsent + daysLate + daysOnLeave + daysHalfDay;
    const attendanceScore = daysMarked
      ? pct(daysPresent + daysLate, daysMarked)
      : 0;

    return {
      student: {
        id: s.id,
        admissionNumber: s.admissionNumber,
        rollNumber: s.rollNumber,
        name: `${s.firstName} ${s.lastName}`.trim(),
        className: s.className,
        sectionName: s.sectionName,
        classGroup: formatClassSection(s.className, s.sectionName),
        mobile: s.mobile,
        category: s.category,
      },
      daily,
      totals: {
        workingDays: workingDates.length,
        daysPresent,
        daysAbsent,
        daysLate,
        daysOnLeave,
        daysHalfDay,
        daysMarked,
        attendanceScore,
      },
    };
  });

  const categoryExports = STUDENT_ATTENDANCE_SECTIONS.map((section) => {
    const status = section.id as AttendanceStatus;
    const exportRows: {
      date: string;
      admissionNumber: string;
      studentName: string;
      classGroup: string;
      rollNumber: string;
      status: string;
      checkInTime: string;
      remarks: string;
    }[] = [];

    for (const session of sessions) {
      const iso = formatDateIso(session.sessionDate);
      for (const rec of session.records.filter((r) => r.status === status)) {
        const student = students.find((st) => st.id === rec.studentId);
        if (!student) continue;
        exportRows.push({
          date: iso,
          admissionNumber: student.admissionNumber,
          studentName: `${student.firstName} ${student.lastName}`.trim(),
          classGroup: formatClassSection(student.className, student.sectionName),
          rollNumber: student.rollNumber,
          status: section.title,
          checkInTime: rec.checkInTime || '—',
          remarks: rec.absentReason || rec.remarks || '—',
        });
      }
    }

    return { ...section, rows: exportRows };
  });

  const classSummaryMap = new Map<string, {
    classGroup: string;
    totalStudents: number;
    avgAttendance: number;
    totalPresent: number;
    totalAbsent: number;
    totalLate: number;
    totalOnLeave: number;
  }>();

  for (const row of rows) {
    const key = row.student.classGroup;
    if (!classSummaryMap.has(key)) {
      classSummaryMap.set(key, {
        classGroup: key,
        totalStudents: 0,
        avgAttendance: 0,
        totalPresent: 0,
        totalAbsent: 0,
        totalLate: 0,
        totalOnLeave: 0,
      });
    }
    const bucket = classSummaryMap.get(key)!;
    bucket.totalStudents += 1;
    bucket.totalPresent += row.totals.daysPresent;
    bucket.totalAbsent += row.totals.daysAbsent;
    bucket.totalLate += row.totals.daysLate;
    bucket.totalOnLeave += row.totals.daysOnLeave + row.totals.daysHalfDay;
    bucket.avgAttendance += row.totals.attendanceScore;
  }

  const classSummary = [...classSummaryMap.values()]
    .map((c) => ({
      ...c,
      avgAttendance: c.totalStudents
        ? Math.round((c.avgAttendance / c.totalStudents) * 10) / 10
        : 0,
    }))
    .sort((a, b) => a.classGroup.localeCompare(b.classGroup));

  return {
    academicYear,
    period,
    periodLabel: range.label,
    from: formatDateIso(range.from),
    to: formatDateIso(range.to),
    workingDays: workingDates.length,
    dateColumns,
    rows,
    classSummary,
    categoryExports,
    summary: {
      totalStudents: students.length,
      avgAttendanceScore: rows.length
        ? Math.round(rows.reduce((a, r) => a + r.totals.attendanceScore, 0) / rows.length * 10) / 10
        : 0,
    },
  };
}
