import {
  AttendanceStatus,
  GatePassStatus,
  StaffAttendanceStatus,
  TeacherAttendanceStatus,
} from '@prisma/client';
import { prisma } from './prisma.js';
import { formatClassSection, getInstitutionFilterMeta } from './students.js';

export type LateEarlyCategory = 'all' | 'students' | 'teachers' | 'staff';
export type LateEarlyTypeFilter = 'all' | 'late' | 'early' | 'both';

export type TimelineConfig = {
  studentSchoolStart: string;
  studentLateAfter: string;
  studentSchoolEnd: string;
  studentEarlyExitBefore: string;
  teacherSchoolStart: string;
  teacherLateAfter: string;
  teacherSchoolEnd: string;
  teacherEarlyExitBefore: string;
  staffSchoolStart: string;
  staffLateAfter: string;
  staffSchoolEnd: string;
  staffEarlyExitBefore: string;
  updatedBy: string;
  updatedAt: string;
};

export type LateEarlyRow = {
  id: string;
  category: 'student' | 'teacher' | 'staff';
  categoryLabel: string;
  personId: string;
  name: string;
  code: string;
  classGroup: string;
  designation: string;
  department: string;
  date: string;
  checkInTime: string;
  checkOutTime: string;
  expectedStart: string;
  expectedEnd: string;
  lateAfter: string;
  earlyExitBefore: string;
  isLateComing: boolean;
  isEarlyExit: boolean;
  lateMinutes: number;
  earlyExitMinutes: number;
  violationType: 'Late Coming' | 'Early Exit' | 'Late & Early Exit' | 'On Time';
  status: string;
  remarks: string;
  source: string;
};

const DEFAULT_TIMELINE = {
  studentSchoolStart: '08:00',
  studentLateAfter: '08:15',
  studentSchoolEnd: '15:30',
  studentEarlyExitBefore: '15:00',
  teacherSchoolStart: '08:00',
  teacherLateAfter: '08:30',
  teacherSchoolEnd: '16:00',
  teacherEarlyExitBefore: '15:30',
  staffSchoolStart: '08:00',
  staffLateAfter: '08:30',
  staffSchoolEnd: '16:00',
  staffEarlyExitBefore: '15:30',
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

export function parseTimeToMinutes(time: string): number | null {
  const raw = String(time || '').trim();
  if (!raw) return null;

  const m24 = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) return Number(m24[1]) * 60 + Number(m24[2]);

  const m12 = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (m12) {
    let h = Number(m12[1]);
    const min = Number(m12[2]);
    const ampm = m12[3].toUpperCase();
    if (ampm === 'PM' && h < 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return h * 60 + min;
  }

  return null;
}

export function formatMinutesAsTime(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

function evaluateLateEarly(opts: {
  checkInTime: string;
  checkOutTime: string;
  lateAfter: string;
  earlyExitBefore: string;
  storedLateMinutes?: number;
  storedEarlyExitMinutes?: number;
  forceLate?: boolean;
}) {
  const checkInMins = parseTimeToMinutes(opts.checkInTime);
  const checkOutMins = parseTimeToMinutes(opts.checkOutTime);
  const lateThreshold = parseTimeToMinutes(opts.lateAfter);
  const earlyThreshold = parseTimeToMinutes(opts.earlyExitBefore);

  let lateMinutes = opts.storedLateMinutes || 0;
  let isLateComing = opts.forceLate || false;

  if (checkInMins != null && lateThreshold != null && checkInMins > lateThreshold) {
    isLateComing = true;
    lateMinutes = Math.max(lateMinutes, checkInMins - lateThreshold);
  }

  let earlyExitMinutes = opts.storedEarlyExitMinutes || 0;
  let isEarlyExit = false;

  if (checkOutMins != null && earlyThreshold != null && checkOutMins < earlyThreshold) {
    isEarlyExit = true;
    earlyExitMinutes = Math.max(earlyExitMinutes, earlyThreshold - checkOutMins);
  }

  let violationType: LateEarlyRow['violationType'] = 'On Time';
  if (isLateComing && isEarlyExit) violationType = 'Late & Early Exit';
  else if (isLateComing) violationType = 'Late Coming';
  else if (isEarlyExit) violationType = 'Early Exit';

  return { isLateComing, isEarlyExit, lateMinutes, earlyExitMinutes, violationType };
}

function serializeTimeline(row: {
  studentSchoolStart: string;
  studentLateAfter: string;
  studentSchoolEnd: string;
  studentEarlyExitBefore: string;
  teacherSchoolStart: string;
  teacherLateAfter: string;
  teacherSchoolEnd: string;
  teacherEarlyExitBefore: string;
  staffSchoolStart: string;
  staffLateAfter: string;
  staffSchoolEnd: string;
  staffEarlyExitBefore: string;
  updatedBy: string;
  updatedAt: Date;
}): TimelineConfig {
  return {
    studentSchoolStart: row.studentSchoolStart,
    studentLateAfter: row.studentLateAfter,
    studentSchoolEnd: row.studentSchoolEnd,
    studentEarlyExitBefore: row.studentEarlyExitBefore,
    teacherSchoolStart: row.teacherSchoolStart,
    teacherLateAfter: row.teacherLateAfter,
    teacherSchoolEnd: row.teacherSchoolEnd,
    teacherEarlyExitBefore: row.teacherEarlyExitBefore,
    staffSchoolStart: row.staffSchoolStart,
    staffLateAfter: row.staffLateAfter,
    staffSchoolEnd: row.staffSchoolEnd,
    staffEarlyExitBefore: row.staffEarlyExitBefore,
    updatedBy: row.updatedBy,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getOrCreateTimelineConfig(institutionId: string) {
  const existing = await prisma.attendanceTimelineConfig.findUnique({ where: { institutionId } });
  if (existing) return serializeTimeline(existing);

  const created = await prisma.attendanceTimelineConfig.create({
    data: { institutionId, ...DEFAULT_TIMELINE },
  });
  return serializeTimeline(created);
}

export async function updateTimelineConfig(
  institutionId: string,
  input: Partial<TimelineConfig> & { updatedBy?: string },
) {
  await getOrCreateTimelineConfig(institutionId);
  const row = await prisma.attendanceTimelineConfig.update({
    where: { institutionId },
    data: {
      ...(input.studentSchoolStart ? { studentSchoolStart: input.studentSchoolStart } : {}),
      ...(input.studentLateAfter ? { studentLateAfter: input.studentLateAfter } : {}),
      ...(input.studentSchoolEnd ? { studentSchoolEnd: input.studentSchoolEnd } : {}),
      ...(input.studentEarlyExitBefore ? { studentEarlyExitBefore: input.studentEarlyExitBefore } : {}),
      ...(input.teacherSchoolStart ? { teacherSchoolStart: input.teacherSchoolStart } : {}),
      ...(input.teacherLateAfter ? { teacherLateAfter: input.teacherLateAfter } : {}),
      ...(input.teacherSchoolEnd ? { teacherSchoolEnd: input.teacherSchoolEnd } : {}),
      ...(input.teacherEarlyExitBefore ? { teacherEarlyExitBefore: input.teacherEarlyExitBefore } : {}),
      ...(input.staffSchoolStart ? { staffSchoolStart: input.staffSchoolStart } : {}),
      ...(input.staffLateAfter ? { staffLateAfter: input.staffLateAfter } : {}),
      ...(input.staffSchoolEnd ? { staffSchoolEnd: input.staffSchoolEnd } : {}),
      ...(input.staffEarlyExitBefore ? { staffEarlyExitBefore: input.staffEarlyExitBefore } : {}),
      updatedBy: input.updatedBy || 'Admin',
    },
  });
  return serializeTimeline(row);
}

export async function getLateEarlyExitMeta(institutionId: string, academicYear?: string) {
  const filters = await getInstitutionFilterMeta(institutionId);
  const timeline = await getOrCreateTimelineConfig(institutionId);
  const year = academicYear || filters.defaultAcademicYear;

  return {
    defaultAcademicYear: year,
    academicYears: filters.academicYears,
    classes: filters.classes,
    timeline,
    categories: [
      { id: 'all', label: 'All' },
      { id: 'students', label: 'Students' },
      { id: 'teachers', label: 'Teachers' },
      { id: 'staff', label: 'Staff' },
    ],
    typeFilters: [
      { id: 'all', label: 'All Records' },
      { id: 'late', label: 'Late Coming Only' },
      { id: 'early', label: 'Early Exit Only' },
      { id: 'both', label: 'Late & Early Exit' },
    ],
    timelineLegend: [
      {
        group: 'Students',
        start: timeline.studentSchoolStart,
        lateAfter: timeline.studentLateAfter,
        end: timeline.studentSchoolEnd,
        earlyBefore: timeline.studentEarlyExitBefore,
      },
      {
        group: 'Teachers',
        start: timeline.teacherSchoolStart,
        lateAfter: timeline.teacherLateAfter,
        end: timeline.teacherSchoolEnd,
        earlyBefore: timeline.teacherEarlyExitBefore,
      },
      {
        group: 'Staff',
        start: timeline.staffSchoolStart,
        lateAfter: timeline.staffLateAfter,
        end: timeline.staffSchoolEnd,
        earlyBefore: timeline.staffEarlyExitBefore,
      },
    ],
  };
}

function matchesTypeFilter(row: LateEarlyRow, type: LateEarlyTypeFilter) {
  if (type === 'all') return true;
  if (type === 'late') return row.isLateComing;
  if (type === 'early') return row.isEarlyExit;
  if (type === 'both') return row.isLateComing && row.isEarlyExit;
  return true;
}

function matchesViolationFilter(row: LateEarlyRow, violationsOnly: boolean) {
  if (!violationsOnly) return true;
  return row.isLateComing || row.isEarlyExit;
}

export async function getLateEarlyExitReport(
  institutionId: string,
  opts: {
    academicYear?: string;
    date?: string;
    category?: LateEarlyCategory;
    type?: LateEarlyTypeFilter;
    className?: string;
    q?: string;
    violationsOnly?: boolean;
  },
) {
  const academicYear = opts.academicYear || '2025-26';
  const date = parseDateOnly(opts.date);
  const dateIso = formatDateIso(date);
  const category = opts.category || 'all';
  const type = opts.type || 'all';
  const timeline = await getOrCreateTimelineConfig(institutionId);
  const rows: LateEarlyRow[] = [];

  if (category === 'all' || category === 'students') {
    const sessions = await prisma.attendanceSession.findMany({
      where: {
        institutionId,
        academicYear,
        sessionDate: date,
        ...(opts.className ? { className: opts.className } : {}),
      },
      include: {
        records: {
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                admissionNumber: true,
                rollNumber: true,
                className: true,
                sectionName: true,
              },
            },
          },
        },
      },
    });

    const gatePasses = await prisma.studentGatePass.findMany({
      where: {
        institutionId,
        academicYear,
        status: { in: [GatePassStatus.ISSUED, GatePassStatus.COMPLETED] },
        createdAt: {
          gte: new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())),
          lte: new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999)),
        },
      },
      select: { studentId: true, exitTime: true, passType: true, reason: true },
    });
    const gatePassByStudent = new Map(gatePasses.map((g) => [g.studentId, g]));

    for (const session of sessions) {
      for (const rec of session.records) {
        if (rec.status === AttendanceStatus.ABSENT || rec.status === AttendanceStatus.ON_LEAVE) continue;

        const gatePass = gatePassByStudent.get(rec.studentId);
        const checkOutTime = rec.checkOutTime || gatePass?.exitTime || '';
        const forceLate = rec.status === AttendanceStatus.LATE;
        const evalResult = evaluateLateEarly({
          checkInTime: rec.checkInTime,
          checkOutTime,
          lateAfter: timeline.studentLateAfter,
          earlyExitBefore: timeline.studentEarlyExitBefore,
          storedLateMinutes: rec.lateMinutes,
          storedEarlyExitMinutes: rec.earlyExitMinutes,
          forceLate,
        });

        const name = `${rec.student.firstName} ${rec.student.lastName}`.trim();
        const row: LateEarlyRow = {
          id: rec.id,
          category: 'student',
          categoryLabel: 'Student',
          personId: rec.student.id,
          name,
          code: rec.student.admissionNumber,
          classGroup: formatClassSection(rec.student.className, rec.student.sectionName),
          designation: rec.student.className,
          department: rec.student.sectionName,
          date: dateIso,
          checkInTime: rec.checkInTime || '—',
          checkOutTime: checkOutTime || '—',
          expectedStart: timeline.studentSchoolStart,
          expectedEnd: timeline.studentSchoolEnd,
          lateAfter: timeline.studentLateAfter,
          earlyExitBefore: timeline.studentEarlyExitBefore,
          ...evalResult,
          status: rec.status,
          remarks: rec.remarks || gatePass?.reason || rec.absentReason,
          source: gatePass ? 'GATE_PASS' : 'ATTENDANCE',
        };

        if (matchesTypeFilter(row, type) && matchesViolationFilter(row, opts.violationsOnly ?? true)) {
          rows.push(row);
        }
      }
    }
  }

  if (category === 'all' || category === 'teachers') {
    const teacherRecords = await prisma.teacherAttendanceDailyRecord.findMany({
      where: {
        institutionId,
        academicYear,
        recordDate: date,
        status: TeacherAttendanceStatus.PRESENT,
      },
      include: {
        teacherProfile: {
          select: {
            id: true,
            teacherName: true,
            employeeCode: true,
            department: true,
            designation: true,
          },
        },
      },
    });

    for (const rec of teacherRecords) {
      const evalResult = evaluateLateEarly({
        checkInTime: rec.checkInTime,
        checkOutTime: rec.checkOutTime,
        lateAfter: timeline.teacherLateAfter,
        earlyExitBefore: timeline.teacherEarlyExitBefore,
        storedLateMinutes: rec.lateMinutes,
        storedEarlyExitMinutes: rec.earlyExitMinutes,
      });

      const row: LateEarlyRow = {
        id: rec.id,
        category: 'teacher',
        categoryLabel: 'Teacher',
        personId: rec.teacherProfile.id,
        name: rec.teacherProfile.teacherName,
        code: rec.teacherProfile.employeeCode,
        classGroup: rec.teacherProfile.department,
        designation: rec.teacherProfile.designation,
        department: rec.teacherProfile.department,
        date: dateIso,
        checkInTime: rec.checkInTime || '—',
        checkOutTime: rec.checkOutTime || '—',
        expectedStart: timeline.teacherSchoolStart,
        expectedEnd: timeline.teacherSchoolEnd,
        lateAfter: timeline.teacherLateAfter,
        earlyExitBefore: timeline.teacherEarlyExitBefore,
        ...evalResult,
        status: rec.status,
        remarks: rec.teacherRemarks,
        source: rec.source,
      };

      if (matchesTypeFilter(row, type) && matchesViolationFilter(row, opts.violationsOnly ?? true)) {
        rows.push(row);
      }
    }
  }

  if (category === 'all' || category === 'staff') {
    const staffRecords = await prisma.staffAttendanceDailyRecord.findMany({
      where: {
        institutionId,
        academicYear,
        recordDate: date,
        status: StaffAttendanceStatus.PRESENT,
      },
      include: {
        staffProfile: {
          select: {
            id: true,
            staffName: true,
            employeeCode: true,
            department: true,
            designation: true,
          },
        },
      },
    });

    for (const rec of staffRecords) {
      const evalResult = evaluateLateEarly({
        checkInTime: rec.checkInTime,
        checkOutTime: rec.checkOutTime,
        lateAfter: timeline.staffLateAfter,
        earlyExitBefore: timeline.staffEarlyExitBefore,
        storedLateMinutes: rec.lateMinutes,
        storedEarlyExitMinutes: rec.earlyExitMinutes,
      });

      const row: LateEarlyRow = {
        id: rec.id,
        category: 'staff',
        categoryLabel: 'Staff',
        personId: rec.staffProfile.id,
        name: rec.staffProfile.staffName,
        code: rec.staffProfile.employeeCode,
        classGroup: rec.staffProfile.department,
        designation: rec.staffProfile.designation,
        department: rec.staffProfile.department,
        date: dateIso,
        checkInTime: rec.checkInTime || '—',
        checkOutTime: rec.checkOutTime || '—',
        expectedStart: timeline.staffSchoolStart,
        expectedEnd: timeline.staffSchoolEnd,
        lateAfter: timeline.staffLateAfter,
        earlyExitBefore: timeline.staffEarlyExitBefore,
        ...evalResult,
        status: rec.status,
        remarks: rec.staffRemarks,
        source: rec.source,
      };

      if (matchesTypeFilter(row, type) && matchesViolationFilter(row, opts.violationsOnly ?? true)) {
        rows.push(row);
      }
    }
  }

  let filtered = rows;
  if (opts.q) {
    const q = opts.q.toLowerCase();
    filtered = rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q) ||
        r.classGroup.toLowerCase().includes(q) ||
        r.designation.toLowerCase().includes(q),
    );
  }

  filtered.sort((a, b) => {
    const lateDiff = Number(b.isLateComing) - Number(a.isLateComing);
    if (lateDiff !== 0) return lateDiff;
    return b.lateMinutes - a.lateMinutes;
  });

  const summary = {
    total: filtered.length,
    students: filtered.filter((r) => r.category === 'student').length,
    teachers: filtered.filter((r) => r.category === 'teacher').length,
    staff: filtered.filter((r) => r.category === 'staff').length,
    lateComing: filtered.filter((r) => r.isLateComing).length,
    earlyExit: filtered.filter((r) => r.isEarlyExit).length,
    both: filtered.filter((r) => r.isLateComing && r.isEarlyExit).length,
    onTime: filtered.filter((r) => !r.isLateComing && !r.isEarlyExit).length,
  };

  return {
    academicYear,
    date: dateIso,
    timeline,
    items: filtered,
    summary,
  };
}

export async function getLateEarlyExitRangeReport(
  institutionId: string,
  opts: {
    academicYear?: string;
    fromDate?: string;
    toDate?: string;
    category?: LateEarlyCategory;
    type?: LateEarlyTypeFilter;
  },
) {
  const from = parseDateOnly(opts.fromDate);
  const to = parseDateOnly(opts.toDate || opts.fromDate);
  const allItems: LateEarlyRow[] = [];

  for (let d = new Date(from); d <= to; d.setUTCDate(d.getUTCDate() + 1)) {
    const dayReport = await getLateEarlyExitReport(institutionId, {
      academicYear: opts.academicYear,
      date: formatDateIso(d),
      category: opts.category,
      type: opts.type,
      violationsOnly: true,
    });
    allItems.push(...dayReport.items);
  }

  const summary = {
    total: allItems.length,
    students: allItems.filter((r) => r.category === 'student').length,
    teachers: allItems.filter((r) => r.category === 'teacher').length,
    staff: allItems.filter((r) => r.category === 'staff').length,
    lateComing: allItems.filter((r) => r.isLateComing).length,
    earlyExit: allItems.filter((r) => r.isEarlyExit).length,
    both: allItems.filter((r) => r.isLateComing && r.isEarlyExit).length,
  };

  return {
    academicYear: opts.academicYear || '2025-26',
    fromDate: formatDateIso(from),
    toDate: formatDateIso(to),
    items: allItems,
    summary,
  };
}

export async function syncLateEarlyMetrics(institutionId: string, date?: string) {
  const targetDate = parseDateOnly(date);
  const timeline = await getOrCreateTimelineConfig(institutionId);
  let updated = 0;

  const sessions = await prisma.attendanceSession.findMany({
    where: { institutionId, sessionDate: targetDate },
    include: { records: true },
  });

  for (const session of sessions) {
    for (const rec of session.records) {
      if (!rec.checkInTime && !rec.checkOutTime) continue;
      const evalResult = evaluateLateEarly({
        checkInTime: rec.checkInTime,
        checkOutTime: rec.checkOutTime,
        lateAfter: timeline.studentLateAfter,
        earlyExitBefore: timeline.studentEarlyExitBefore,
        forceLate: rec.status === AttendanceStatus.LATE,
      });
      await prisma.attendanceRecord.update({
        where: { id: rec.id },
        data: {
          lateMinutes: evalResult.lateMinutes,
          earlyExitMinutes: evalResult.earlyExitMinutes,
        },
      });
      updated += 1;
    }
  }

  const teacherRecords = await prisma.teacherAttendanceDailyRecord.findMany({
    where: { institutionId, recordDate: targetDate, status: TeacherAttendanceStatus.PRESENT },
  });
  for (const rec of teacherRecords) {
    const evalResult = evaluateLateEarly({
      checkInTime: rec.checkInTime,
      checkOutTime: rec.checkOutTime,
      lateAfter: timeline.teacherLateAfter,
      earlyExitBefore: timeline.teacherEarlyExitBefore,
    });
    await prisma.teacherAttendanceDailyRecord.update({
      where: { id: rec.id },
      data: { lateMinutes: evalResult.lateMinutes, earlyExitMinutes: evalResult.earlyExitMinutes },
    });
    updated += 1;
  }

  const staffRecords = await prisma.staffAttendanceDailyRecord.findMany({
    where: { institutionId, recordDate: targetDate, status: StaffAttendanceStatus.PRESENT },
  });
  for (const rec of staffRecords) {
    const evalResult = evaluateLateEarly({
      checkInTime: rec.checkInTime,
      checkOutTime: rec.checkOutTime,
      lateAfter: timeline.staffLateAfter,
      earlyExitBefore: timeline.staffEarlyExitBefore,
    });
    await prisma.staffAttendanceDailyRecord.update({
      where: { id: rec.id },
      data: { lateMinutes: evalResult.lateMinutes, earlyExitMinutes: evalResult.earlyExitMinutes },
    });
    updated += 1;
  }

  return { updated, date: formatDateIso(targetDate) };
}
