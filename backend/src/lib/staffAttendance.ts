import { StaffAttendanceStatus } from '@prisma/client';
import { prisma } from './prisma.js';
import { getInstitutionFilterMeta } from './students.js';

export const STAFF_ATTENDANCE_SECTIONS = [
  { id: 'PRESENT', key: 'present', title: 'Present', color: '#10b981' },
  { id: 'PLANNED_LEAVE_ABSENT', key: 'plannedLeaveAbsent', title: 'Planned Leave – Absent', color: '#3b82f6' },
  { id: 'MEDICAL_LEAVE_ABSENT', key: 'medicalLeaveAbsent', title: 'Medical Leave – Absent', color: '#8b5cf6' },
  { id: 'UNPLANNED_ABSENT', key: 'unplannedAbsent', title: 'Unplanned – Absent', color: '#f59e0b' },
  { id: 'UNPLANNED_NOT_INTIMATED', key: 'unplannedNotIntimated', title: 'Unplanned – Not Intimated', color: '#ef4444' },
] as const;

export type StaffPeriod = 'monthly' | 'quarterly' | 'half_yearly' | 'yearly';

const STATUS_SHORT: Record<StaffAttendanceStatus, string> = {
  PRESENT: 'P',
  PLANNED_LEAVE_ABSENT: 'PL',
  MEDICAL_LEAVE_ABSENT: 'ML',
  UNPLANNED_ABSENT: 'UA',
  UNPLANNED_NOT_INTIMATED: 'NI',
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

function isWeekend(d: Date) {
  const day = d.getUTCDay();
  return day === 0 || day === 6;
}

function academicYearBounds(academicYear: string) {
  const parts = academicYear.split('-').map((p) => p.trim());
  const startYear = parts[0].length === 2 ? 2000 + Number(parts[0]) : Number(parts[0]);
  const endYear = parts[1]?.length === 2 ? 2000 + Number(parts[1]) : startYear + 1;
  return {
    start: new Date(Date.UTC(startYear, 3, 1)),
    end: new Date(Date.UTC(endYear, 2, 31)),
  };
}

export function resolveStaffPeriodRange(opts: {
  academicYear: string;
  period: StaffPeriod;
  year?: number;
  month?: number;
  quarter?: number;
  half?: 1 | 2;
}) {
  const { start: ayStart, end: ayEnd } = academicYearBounds(opts.academicYear);
  const period = opts.period || 'monthly';

  if (period === 'yearly') {
    return { from: ayStart, to: ayEnd, label: `Academic Year ${opts.academicYear}` };
  }

  if (period === 'half_yearly') {
    const half = opts.half === 2 ? 2 : 1;
    if (half === 1) {
      return {
        from: new Date(Date.UTC(ayStart.getUTCFullYear(), 3, 1)),
        to: new Date(Date.UTC(ayStart.getUTCFullYear(), 8, 30)),
        label: `Half Year 1 (Apr–Sep) ${opts.academicYear}`,
      };
    }
    return {
      from: new Date(Date.UTC(ayStart.getUTCFullYear(), 9, 1)),
      to: ayEnd,
      label: `Half Year 2 (Oct–Mar) ${opts.academicYear}`,
    };
  }

  if (period === 'quarterly') {
    const q = opts.quarter && opts.quarter >= 1 && opts.quarter <= 4 ? opts.quarter : 1;
    const qStarts = [
      new Date(Date.UTC(ayStart.getUTCFullYear(), 3, 1)),
      new Date(Date.UTC(ayStart.getUTCFullYear(), 6, 1)),
      new Date(Date.UTC(ayStart.getUTCFullYear(), 9, 1)),
      new Date(Date.UTC(ayEnd.getUTCFullYear(), 0, 1)),
    ];
    const qEnds = [
      new Date(Date.UTC(ayStart.getUTCFullYear(), 5, 30)),
      new Date(Date.UTC(ayStart.getUTCFullYear(), 8, 30)),
      new Date(Date.UTC(ayStart.getUTCFullYear(), 11, 31)),
      ayEnd,
    ];
    return { from: qStarts[q - 1], to: qEnds[q - 1], label: `Quarter ${q} ${opts.academicYear}` };
  }

  const year = opts.year || new Date().getUTCFullYear();
  const month = opts.month && opts.month >= 1 && opts.month <= 12 ? opts.month : new Date().getUTCMonth() + 1;
  const from = new Date(Date.UTC(year, month - 1, 1));
  const to = new Date(Date.UTC(year, month, 0));
  const clampedFrom = from < ayStart ? ayStart : from;
  const clampedTo = to > ayEnd ? ayEnd : to;
  return {
    from: clampedFrom,
    to: clampedTo,
    label: from.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
  };
}

function listDatesInRange(from: Date, to: Date) {
  const dates: Date[] = [];
  const cur = new Date(from);
  while (cur <= to) {
    if (!isWeekend(cur)) dates.push(new Date(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}

async function nextStaffRecordId(institutionId: string) {
  const count = await prisma.staffAttendanceProfile.count({ where: { institutionId } });
  return `STF-${String(1000 + count + 1)}`;
}

function serializeStaffProfile(row: {
  id: string;
  recordId: string;
  staffName: string;
  employeeCode: string;
  department: string;
  designation: string;
  mobile: string;
  email: string;
  academicYear: string;
}) {
  return {
    id: row.id,
    recordId: row.recordId,
    staffName: row.staffName,
    employeeCode: row.employeeCode,
    department: row.department,
    designation: row.designation,
    mobile: row.mobile,
    email: row.email,
    academicYear: row.academicYear,
  };
}

function serializeDailyRecord(row: {
  id: string;
  recordDate: Date;
  status: StaffAttendanceStatus;
  staffRemarks: string;
  checkInTime: string;
  source: string;
  markedAt: Date | null;
  staffProfile: {
    id: string;
    recordId: string;
    staffName: string;
    employeeCode: string;
    department: string;
    designation: string;
    mobile: string;
    email: string;
    academicYear: string;
  };
}) {
  return {
    id: row.id,
    recordDate: formatDateIso(row.recordDate),
    status: row.status,
    statusLabel: STAFF_ATTENDANCE_SECTIONS.find((s) => s.id === row.status)?.title || row.status,
    statusShort: STATUS_SHORT[row.status],
    staffRemarks: row.staffRemarks,
    checkInTime: row.checkInTime,
    source: row.source,
    markedAt: row.markedAt?.toISOString() ?? null,
    staff: serializeStaffProfile(row.staffProfile),
  };
}

export async function syncStaffProfilesFromInstitution(institutionId: string, academicYear = '2025-26') {
  const setup = await prisma.institutionSetup.findUnique({ where: { institutionId } });
  const departments = (setup?.departmentsSetup || {}) as {
    records?: Array<Record<string, string>>;
  };
  const map = new Map<string, { department: string; email: string; phone: string; designation: string }>();
  for (const row of departments.records || []) {
    const name =
      row.staffName?.trim() ||
      row.name?.trim() ||
      row.employeeName?.trim() ||
      row['Staff Name']?.trim() ||
      '';
    if (!name) continue;
    const dept =
      row.department?.trim() ||
      row.departmentName?.trim() ||
      row['Department']?.trim() ||
      'General';
    map.set(name, {
      department: dept,
      email: row.email?.trim() || '',
      phone: row.mobile?.trim() || row.phone?.trim() || '',
      designation: row.designation?.trim() || row.role?.trim() || 'Staff',
    });
  }

  let created = 0;
  for (const [staffName, meta] of map) {
    const existing = await prisma.staffAttendanceProfile.findFirst({
      where: { institutionId, academicYear, staffName },
    });
    if (existing) continue;
    await prisma.staffAttendanceProfile.create({
      data: {
        institutionId,
        recordId: await nextStaffRecordId(institutionId),
        academicYear,
        staffName,
        department: meta.department,
        email: meta.email,
        mobile: meta.phone,
        designation: meta.designation,
      },
    });
    created += 1;
  }
  return { synced: map.size, created };
}

export async function getStaffAttendanceMeta(institutionId: string) {
  const filters = await getInstitutionFilterMeta(institutionId);
  const staffCount = await prisma.staffAttendanceProfile.count({
    where: { institutionId, isActive: true },
  });
  return {
    defaultAcademicYear: filters.defaultAcademicYear,
    academicYears: filters.academicYears,
    periods: [
      { id: 'monthly', label: 'Monthly' },
      { id: 'quarterly', label: 'Quarterly' },
      { id: 'half_yearly', label: 'Half Yearly' },
      { id: 'yearly', label: 'Yearly' },
    ],
    sections: STAFF_ATTENDANCE_SECTIONS,
    staffCount,
    captureSource: 'MOBILE_APP',
    captureNote: 'Attendance and leave are captured from the staff mobile app only.',
  };
}

export async function getStaffAttendanceCalendar(
  institutionId: string,
  opts: { academicYear?: string; year?: number; month?: number },
) {
  const academicYear = opts.academicYear || '2025-26';
  const year = opts.year || new Date().getUTCFullYear();
  const month = opts.month || new Date().getUTCMonth() + 1;
  const from = new Date(Date.UTC(year, month - 1, 1));
  const to = new Date(Date.UTC(year, month, 0));

  const holidays = await prisma.holiday.findMany({
    where: { institutionId, date: { gte: from, lte: to } },
  });
  const holidaySet = new Set(holidays.map((h) => formatDateIso(h.date)));

  const records = await prisma.staffAttendanceDailyRecord.findMany({
    where: { institutionId, academicYear, recordDate: { gte: from, lte: to } },
    select: { recordDate: true, status: true },
  });

  const byDate = new Map<string, Record<string, number>>();
  for (const r of records) {
    const iso = formatDateIso(r.recordDate);
    if (!byDate.has(iso)) {
      byDate.set(iso, {
        present: 0,
        plannedLeaveAbsent: 0,
        medicalLeaveAbsent: 0,
        unplannedAbsent: 0,
        unplannedNotIntimated: 0,
        total: 0,
      });
    }
    const bucket = byDate.get(iso)!;
    bucket.total += 1;
    if (r.status === StaffAttendanceStatus.PRESENT) bucket.present += 1;
    if (r.status === StaffAttendanceStatus.PLANNED_LEAVE_ABSENT) bucket.plannedLeaveAbsent += 1;
    if (r.status === StaffAttendanceStatus.MEDICAL_LEAVE_ABSENT) bucket.medicalLeaveAbsent += 1;
    if (r.status === StaffAttendanceStatus.UNPLANNED_ABSENT) bucket.unplannedAbsent += 1;
    if (r.status === StaffAttendanceStatus.UNPLANNED_NOT_INTIMATED) bucket.unplannedNotIntimated += 1;
  }

  const days: {
    date: string;
    day: number;
    isWeekend: boolean;
    isHoliday: boolean;
    counts: Record<string, number>;
    hasData: boolean;
  }[] = [];

  const cur = new Date(from);
  while (cur <= to) {
    const iso = formatDateIso(cur);
    const counts = byDate.get(iso) || {
      present: 0,
      plannedLeaveAbsent: 0,
      medicalLeaveAbsent: 0,
      unplannedAbsent: 0,
      unplannedNotIntimated: 0,
      total: 0,
    };
    days.push({
      date: iso,
      day: cur.getUTCDate(),
      isWeekend: isWeekend(cur),
      isHoliday: holidaySet.has(iso),
      counts,
      hasData: counts.total > 0,
    });
    cur.setUTCDate(cur.getUTCDate() + 1);
  }

  const totalStaff = await prisma.staffAttendanceProfile.count({
    where: { institutionId, academicYear, isActive: true },
  });

  return {
    academicYear,
    year,
    month,
    monthLabel: from.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
    totalStaff,
    days,
    holidays: holidays.map((h) => ({ date: formatDateIso(h.date), name: h.name })),
  };
}

export async function getStaffAttendanceDayDetail(
  institutionId: string,
  opts: { academicYear?: string; date: string },
) {
  const academicYear = opts.academicYear || '2025-26';
  const recordDate = parseDateOnly(opts.date);

  const staffList = await prisma.staffAttendanceProfile.findMany({
    where: { institutionId, academicYear, isActive: true },
    orderBy: [{ department: 'asc' }, { staffName: 'asc' }],
  });

  const records = await prisma.staffAttendanceDailyRecord.findMany({
    where: { institutionId, academicYear, recordDate },
    include: { staffProfile: true },
  });
  const recordMap = new Map(records.map((r) => [r.staffProfileId, r]));

  const sections = STAFF_ATTENDANCE_SECTIONS.map((section) => {
    const status = section.id as StaffAttendanceStatus;
    const rows = staffList
      .map((s) => {
        const rec = recordMap.get(s.id);
        if (rec?.status !== status) return null;
        return serializeDailyRecord({ ...rec, staffProfile: s });
      })
      .filter(Boolean);
    return {
      ...section,
      count: rows.length,
      staff: rows,
    };
  });

  const unmarked = staffList
    .filter((s) => !recordMap.has(s.id))
    .map((s) => serializeStaffProfile(s));

  return {
    academicYear,
    date: formatDateIso(recordDate),
    dateLabel: recordDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    totalStaff: staffList.length,
    markedCount: records.length,
    unmarkedCount: unmarked.length,
    sections,
    unmarkedStaff: unmarked,
    summary: {
      present: sections.find((s) => s.id === 'PRESENT')?.count || 0,
      plannedLeaveAbsent: sections.find((s) => s.id === 'PLANNED_LEAVE_ABSENT')?.count || 0,
      medicalLeaveAbsent: sections.find((s) => s.id === 'MEDICAL_LEAVE_ABSENT')?.count || 0,
      unplannedAbsent: sections.find((s) => s.id === 'UNPLANNED_ABSENT')?.count || 0,
      unplannedNotIntimated: sections.find((s) => s.id === 'UNPLANNED_NOT_INTIMATED')?.count || 0,
    },
  };
}

function countLeaveUsed(status: StaffAttendanceStatus) {
  if (status === StaffAttendanceStatus.PLANNED_LEAVE_ABSENT) return { planned: 1, medical: 0, unplanned: 0, notIntimated: 0 };
  if (status === StaffAttendanceStatus.MEDICAL_LEAVE_ABSENT) return { planned: 0, medical: 1, unplanned: 0, notIntimated: 0 };
  if (status === StaffAttendanceStatus.UNPLANNED_ABSENT) return { planned: 0, medical: 0, unplanned: 1, notIntimated: 0 };
  if (status === StaffAttendanceStatus.UNPLANNED_NOT_INTIMATED) return { planned: 0, medical: 0, unplanned: 0, notIntimated: 1 };
  return { planned: 0, medical: 0, unplanned: 0, notIntimated: 0 };
}

export async function getStaffAttendanceReport(
  institutionId: string,
  opts: {
    academicYear?: string;
    period?: StaffPeriod;
    year?: number;
    month?: number;
    quarter?: number;
    half?: 1 | 2;
  },
) {
  const academicYear = opts.academicYear || '2025-26';
  const period = opts.period || 'monthly';
  const range = resolveStaffPeriodRange({
    academicYear,
    period,
    year: opts.year,
    month: opts.month,
    quarter: opts.quarter,
    half: opts.half,
  });
  const workingDates = listDatesInRange(range.from, range.to);

  const staffList = await prisma.staffAttendanceProfile.findMany({
    where: { institutionId, academicYear, isActive: true },
    include: { leaveGrants: { where: { academicYear } } },
    orderBy: [{ department: 'asc' }, { staffName: 'asc' }],
  });

  const records = await prisma.staffAttendanceDailyRecord.findMany({
    where: {
      institutionId,
      academicYear,
      recordDate: { gte: range.from, lte: range.to },
    },
  });

  const recordLookup = new Map<string, StaffAttendanceStatus>();
  for (const r of records) {
    recordLookup.set(`${r.staffProfileId}::${formatDateIso(r.recordDate)}`, r.status);
  }

  const dateColumns = workingDates.map((d) => ({
    date: formatDateIso(d),
    label: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
  }));

  const rows = staffList.map((s) => {
    const daily: Record<string, string> = {};
    let totalPresent = 0;
    let totalPlannedLeave = 0;
    let totalMedicalLeave = 0;
    let totalUnplannedAbsent = 0;
    let totalNotIntimated = 0;

    for (const d of workingDates) {
      const iso = formatDateIso(d);
      const status = recordLookup.get(`${s.id}::${iso}`);
      daily[iso] = status ? STATUS_SHORT[status] : '—';
      if (status === StaffAttendanceStatus.PRESENT) totalPresent += 1;
      const leave = status ? countLeaveUsed(status) : { planned: 0, medical: 0, unplanned: 0, notIntimated: 0 };
      totalPlannedLeave += leave.planned;
      totalMedicalLeave += leave.medical;
      totalUnplannedAbsent += leave.unplanned;
      totalNotIntimated += leave.notIntimated;
    }

    const grants = Object.fromEntries(s.leaveGrants.map((g) => [g.leaveType, g.daysGranted]));
    const totalLeaveUsed = totalPlannedLeave + totalMedicalLeave + totalUnplannedAbsent + totalNotIntimated;
    const totalLeaveGranted = (grants.PLANNED || 0) + (grants.MEDICAL || 0) + (grants.CASUAL || 0);

    return {
      staff: serializeStaffProfile(s),
      daily,
      totals: {
        workingDays: workingDates.length,
        daysPresent: totalPresent,
        daysPlannedLeave: totalPlannedLeave,
        daysMedicalLeave: totalMedicalLeave,
        daysUnplannedAbsent: totalUnplannedAbsent,
        daysNotIntimated: totalNotIntimated,
        totalLeaveUsed,
        attendanceScore: workingDates.length
          ? Math.round((totalPresent / workingDates.length) * 1000) / 10
          : 0,
      },
      leaveGrants: {
        planned: grants.PLANNED || 12,
        medical: grants.MEDICAL || 10,
        casual: grants.CASUAL || 5,
        totalGranted: totalLeaveGranted || 27,
        totalUsed: totalLeaveUsed,
        balance: Math.max(0, (totalLeaveGranted || 27) - totalLeaveUsed),
      },
    };
  });

  const categoryExports = STAFF_ATTENDANCE_SECTIONS.map((section) => {
    const status = section.id as StaffAttendanceStatus;
    const staffInCategory = records
      .filter((r) => r.status === status)
      .map((r) => {
        const member = staffList.find((t) => t.id === r.staffProfileId);
        return {
          date: formatDateIso(r.recordDate),
          staffName: member?.staffName || '',
          employeeCode: member?.employeeCode || '',
          department: member?.department || '',
          status: section.title,
          staffRemarks: r.staffRemarks,
          checkInTime: r.checkInTime,
        };
      });
    return { ...section, rows: staffInCategory };
  });

  return {
    academicYear,
    period,
    periodLabel: range.label,
    from: formatDateIso(range.from),
    to: formatDateIso(range.to),
    workingDays: workingDates.length,
    dateColumns,
    rows,
    categoryExports,
    summary: {
      totalStaff: staffList.length,
      avgAttendanceScore: rows.length
        ? Math.round(rows.reduce((a, r) => a + r.totals.attendanceScore, 0) / rows.length * 10) / 10
        : 0,
    },
  };
}

export async function seedStaffAttendanceDemo(institutionId: string, academicYear = '2025-26') {
  await syncStaffProfilesFromInstitution(institutionId, academicYear);

  let staffList = await prisma.staffAttendanceProfile.findMany({
    where: { institutionId, academicYear, isActive: true },
  });

  if (!staffList.length) {
    const demoNames = [
      { name: 'Ramesh Iyer', dept: 'Administration', designation: 'Office Manager' },
      { name: 'Lakshmi Menon', dept: 'Accounts', designation: 'Accountant' },
      { name: 'Suresh Gupta', dept: 'Library', designation: 'Librarian' },
      { name: 'Deepa Joshi', dept: 'Transport', designation: 'Transport Coordinator' },
      { name: 'Arun Nambiar', dept: 'Security', designation: 'Security Head' },
      { name: 'Meena Kulkarni', dept: 'Housekeeping', designation: 'Supervisor' },
      { name: 'Joseph Thomas', dept: 'IT Support', designation: 'System Admin' },
      { name: 'Pooja Verma', dept: 'Reception', designation: 'Front Desk' },
      { name: 'Harish Rao', dept: 'Maintenance', designation: 'Facility Manager' },
      { name: 'Sunita Das', dept: 'Canteen', designation: 'Canteen In-charge' },
    ];
    for (const s of demoNames) {
      await prisma.staffAttendanceProfile.create({
        data: {
          institutionId,
          recordId: await nextStaffRecordId(institutionId),
          academicYear,
          staffName: s.name,
          department: s.dept,
          designation: s.designation,
          employeeCode: `STF-${s.name.split(' ')[0].slice(0, 3).toUpperCase()}`,
        },
      });
    }
    staffList = await prisma.staffAttendanceProfile.findMany({
      where: { institutionId, academicYear, isActive: true },
    });
  }

  for (const s of staffList) {
    await prisma.staffLeaveGrant.upsert({
      where: {
        staffProfileId_academicYear_leaveType: {
          staffProfileId: s.id,
          academicYear,
          leaveType: 'PLANNED',
        },
      },
      create: { institutionId, staffProfileId: s.id, academicYear, leaveType: 'PLANNED', daysGranted: 12 },
      update: {},
    });
    await prisma.staffLeaveGrant.upsert({
      where: {
        staffProfileId_academicYear_leaveType: {
          staffProfileId: s.id,
          academicYear,
          leaveType: 'MEDICAL',
        },
      },
      create: { institutionId, staffProfileId: s.id, academicYear, leaveType: 'MEDICAL', daysGranted: 10 },
      update: {},
    });
    await prisma.staffLeaveGrant.upsert({
      where: {
        staffProfileId_academicYear_leaveType: {
          staffProfileId: s.id,
          academicYear,
          leaveType: 'CASUAL',
        },
      },
      create: { institutionId, staffProfileId: s.id, academicYear, leaveType: 'CASUAL', daysGranted: 5 },
      update: {},
    });
  }

  const remarks = [
    'Family emergency — informed via app',
    'Personal work — submitted leave request',
    'Not feeling well',
    'Transport delay',
    'No intimation received',
  ];

  const today = parseDateOnly();
  let recordCount = 0;

  for (let dayOffset = 59; dayOffset >= 0; dayOffset--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - dayOffset);
    if (isWeekend(d)) continue;

    for (const member of staffList) {
      const roll = Math.random();
      let status: StaffAttendanceStatus = StaffAttendanceStatus.PRESENT;
      let staffRemarks = '';
      let checkInTime = '08:10';
      let checkOutTime = '16:05';
      let lateMinutes = 0;
      let earlyExitMinutes = 0;

      if (roll < 0.04) {
        status = StaffAttendanceStatus.PLANNED_LEAVE_ABSENT;
        checkInTime = '';
        checkOutTime = '';
      } else if (roll < 0.07) {
        status = StaffAttendanceStatus.MEDICAL_LEAVE_ABSENT;
        checkInTime = '';
        checkOutTime = '';
        staffRemarks = 'Medical certificate submitted via app';
      } else if (roll < 0.1) {
        status = StaffAttendanceStatus.UNPLANNED_ABSENT;
        checkInTime = '';
        checkOutTime = '';
        staffRemarks = remarks[Math.floor(Math.random() * 3)];
      } else if (roll < 0.12) {
        status = StaffAttendanceStatus.UNPLANNED_NOT_INTIMATED;
        checkInTime = '';
        checkOutTime = '';
      } else if (roll < 0.15) {
        checkInTime = '08:50';
        checkOutTime = '16:05';
        lateMinutes = 20;
      } else if (roll < 0.17) {
        checkInTime = '08:20';
        checkOutTime = '15:10';
        earlyExitMinutes = 20;
      }

      await prisma.staffAttendanceDailyRecord.upsert({
        where: {
          staffProfileId_recordDate: { staffProfileId: member.id, recordDate: d },
        },
        create: {
          institutionId,
          staffProfileId: member.id,
          academicYear,
          recordDate: d,
          status,
          staffRemarks,
          checkInTime,
          checkOutTime,
          lateMinutes,
          earlyExitMinutes,
          source: 'MOBILE',
          markedAt: new Date(d.getTime() + 8 * 3600000),
        },
        update: { status, staffRemarks, checkInTime, checkOutTime, lateMinutes, earlyExitMinutes, source: 'MOBILE' },
      });
      recordCount += 1;
    }
  }

  return { staff: staffList.length, records: recordCount };
}
