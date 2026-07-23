import { TeacherAttendanceStatus } from '@prisma/client';
import { prisma } from './prisma.js';
import { getInstitutionFilterMeta } from './students.js';

export const TEACHER_ATTENDANCE_SECTIONS = [
  { id: 'PRESENT', key: 'present', title: 'Present', color: '#10b981' },
  { id: 'PLANNED_LEAVE_ABSENT', key: 'plannedLeaveAbsent', title: 'Planned Leave – Absent', color: '#3b82f6' },
  { id: 'MEDICAL_LEAVE_ABSENT', key: 'medicalLeaveAbsent', title: 'Medical Leave – Absent', color: '#8b5cf6' },
  { id: 'UNPLANNED_ABSENT', key: 'unplannedAbsent', title: 'Unplanned – Absent', color: '#f59e0b' },
  { id: 'UNPLANNED_NOT_INTIMATED', key: 'unplannedNotIntimated', title: 'Unplanned – Not Intimated', color: '#ef4444' },
] as const;

export type TeacherPeriod = 'monthly' | 'quarterly' | 'half_yearly' | 'yearly';

const STATUS_SHORT: Record<TeacherAttendanceStatus, string> = {
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

export function resolveTeacherPeriodRange(opts: {
  academicYear: string;
  period: TeacherPeriod;
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

async function nextTeacherRecordId(institutionId: string) {
  const count = await prisma.teacherAttendanceProfile.count({ where: { institutionId } });
  return `TCH-${String(1000 + count + 1)}`;
}

function makeEmployeeCode(teacherName: string, taken: Set<string>) {
  const base = teacherName.split(/\s+/).filter(Boolean)[0]?.slice(0, 3).toUpperCase() || 'TCH';
  let code = `TCH-${base}`;
  let n = 1;
  while (taken.has(code)) {
    code = `TCH-${base}${n}`;
    n += 1;
  }
  taken.add(code);
  return code;
}

type TeacherCandidate = { department: string; email: string; phone: string; source: string };

async function collectTeacherCandidates(
  institutionId: string,
  academicYear: string,
): Promise<Map<string, TeacherCandidate>> {
  const map = new Map<string, TeacherCandidate>();

  const add = (name: string, meta: Partial<TeacherCandidate> & { source: string }) => {
    const teacherName = name.trim();
    if (!teacherName) return;
    const existing = map.get(teacherName) || {
      department: 'General',
      email: '',
      phone: '',
      source: meta.source,
    };
    map.set(teacherName, {
      department: meta.department || existing.department,
      email: meta.email || existing.email,
      phone: meta.phone || existing.phone,
      source: existing.source || meta.source,
    });
  };

  const setup = await prisma.institutionSetup.findUnique({ where: { institutionId } });
  const classesTile = (setup?.classesSections || {}) as {
    records?: Record<string, string>[];
    sections?: Record<string, Record<string, string>>;
    teacherPool?: string;
  };
  const teacherPool =
    classesTile.sections?.['Class Teacher Assign']?.teacherPool ||
    classesTile.teacherPool ||
    '';
  if (teacherPool) {
    for (const line of teacherPool.split(/\n/).map((l) => l.trim()).filter(Boolean)) {
      if (line.includes('|')) {
        const [name, department, phone, email] = line.split('|').map((p) => p.trim());
        if (name) add(name, { department: department || 'Teaching Staff', phone, email, source: 'Institution setup' });
      } else {
        for (const part of line.split(/[,;]/)) {
          const name = part.trim();
          if (name) add(name, { department: 'Teaching Staff', source: 'Institution setup' });
        }
      }
    }
  }
  for (const row of classesTile.records || []) {
    const name = row.classTeacher?.trim() || row['Class Teacher']?.trim() || '';
    if (name) {
      add(name, {
        department: 'Class Teacher',
        phone: row.classTeacherPhone?.trim() || row['Class Teacher Phone']?.trim() || '',
        email: row.classTeacherEmail?.trim() || row['Class Teacher Email']?.trim() || '',
        source: 'Class teacher assign',
      });
    }
  }

  const classSections = await prisma.academicClassSection.findMany({
    where: { institutionId, academicYear },
    select: { classTeacher: true, classTeacherPhone: true, classTeacherEmail: true },
  });
  for (const cs of classSections) {
    if (cs.classTeacher) {
      add(cs.classTeacher, {
        department: 'Class Teacher',
        phone: cs.classTeacherPhone,
        email: cs.classTeacherEmail,
        source: 'Academic class section',
      });
    }
  }

  const [allocations, subjects, roster, examAssignments] = await Promise.all([
    prisma.academicTeacherAllocation.findMany({
      where: { institutionId, academicYear },
      select: { teacherName: true, department: true },
    }),
    prisma.academicSubjectAllocation.findMany({
      where: { institutionId, academicYear },
      select: { teacherName: true, teacherEmail: true, teacherPhone: true },
    }),
    prisma.academicTeacherRosterTask.findMany({
      where: { institutionId, academicYear },
      select: { teacherName: true, department: true },
    }),
    prisma.examSubjectTeacherAssignment.findMany({
      where: { institutionId, academicYear },
      select: { teacherName: true, teacherEmail: true, teacherPhone: true },
    }),
  ]);

  for (const a of allocations) {
    if (a.teacherName) add(a.teacherName, { department: a.department || 'General', source: 'Teacher allocation' });
  }
  for (const s of subjects) {
    if (s.teacherName) {
      add(s.teacherName, {
        email: s.teacherEmail,
        phone: s.teacherPhone,
        source: 'Subject management',
      });
    }
  }
  for (const r of roster) {
    if (r.teacherName) add(r.teacherName, { department: r.department || 'General', source: 'Teacher roster' });
  }
  for (const e of examAssignments) {
    if (e.teacherName) {
      add(e.teacherName, {
        email: e.teacherEmail,
        phone: e.teacherPhone,
        source: 'Exam marks entry',
      });
    }
  }

  return map;
}

async function upsertTeacherCandidates(
  institutionId: string,
  academicYear: string,
  candidates: Map<string, TeacherCandidate>,
) {
  const existingProfiles = await prisma.teacherAttendanceProfile.findMany({
    where: { institutionId, academicYear },
  });
  const takenCodes = new Set(existingProfiles.map((p) => p.employeeCode).filter(Boolean));
  let created = 0;
  let updated = 0;

  for (const [teacherName, meta] of candidates) {
    const existing = existingProfiles.find((p) => p.teacherName === teacherName);
    if (existing) {
      const needsUpdate =
        (meta.email && !existing.email) ||
        (meta.phone && !existing.mobile) ||
        (meta.department && existing.department === 'General' && meta.department !== 'General');
      if (needsUpdate) {
        await prisma.teacherAttendanceProfile.update({
          where: { id: existing.id },
          data: {
            email: existing.email || meta.email,
            mobile: existing.mobile || meta.phone,
            department: existing.department === 'General' ? meta.department : existing.department,
          },
        });
        updated += 1;
      }
      continue;
    }
    await prisma.teacherAttendanceProfile.create({
      data: {
        institutionId,
        recordId: await nextTeacherRecordId(institutionId),
        academicYear,
        teacherName,
        employeeCode: makeEmployeeCode(teacherName, takenCodes),
        department: meta.department,
        email: meta.email,
        mobile: meta.phone,
        designation: 'Teacher',
      },
    });
    created += 1;
  }

  return { synced: candidates.size, created, updated };
}

function serializeTeacherProfile(row: {
  id: string;
  recordId: string;
  teacherName: string;
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
    teacherName: row.teacherName,
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
  status: TeacherAttendanceStatus;
  teacherRemarks: string;
  checkInTime: string;
  source: string;
  markedAt: Date | null;
  teacherProfile: {
    id: string;
    recordId: string;
    teacherName: string;
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
    statusLabel: TEACHER_ATTENDANCE_SECTIONS.find((s) => s.id === row.status)?.title || row.status,
    statusShort: STATUS_SHORT[row.status],
    teacherRemarks: row.teacherRemarks,
    checkInTime: row.checkInTime,
    source: row.source,
    markedAt: row.markedAt?.toISOString() ?? null,
    teacher: serializeTeacherProfile(row.teacherProfile),
  };
}

export async function syncTeacherProfilesFromAcademic(institutionId: string, academicYear = '2025-26') {
  const candidates = await collectTeacherCandidates(institutionId, academicYear);
  const result = await upsertTeacherCandidates(institutionId, academicYear, candidates);
  return {
    ...result,
    message: result.created > 0
      ? `Registered ${result.created} new teacher(s) from academic & institution data`
      : result.updated > 0
        ? `Updated ${result.updated} teacher profile(s)`
        : candidates.size > 0
          ? `${candidates.size} teacher(s) already registered`
          : 'No teachers found — add teachers in Institution Setup, Subject Management, or Register Teacher below',
  };
}

export async function listTeacherProfiles(institutionId: string, academicYear = '2025-26') {
  const teachers = await prisma.teacherAttendanceProfile.findMany({
    where: { institutionId, academicYear, isActive: true },
    orderBy: [{ teacherName: 'asc' }],
  });
  return {
    academicYear,
    teachers: teachers.map(serializeTeacherProfile),
    total: teachers.length,
  };
}

export async function registerTeacherProfile(
  institutionId: string,
  data: {
    academicYear?: string;
    teacherName: string;
    department?: string;
    mobile?: string;
    email?: string;
    employeeCode?: string;
    designation?: string;
  },
) {
  const academicYear = data.academicYear || '2025-26';
  const teacherName = data.teacherName.trim();
  if (!teacherName) throw new Error('Teacher name is required');

  const existing = await prisma.teacherAttendanceProfile.findFirst({
    where: { institutionId, academicYear, teacherName },
  });
  if (existing) {
    return {
      teacher: serializeTeacherProfile(existing),
      created: false,
      message: `${teacherName} is already registered`,
    };
  }

  const taken = new Set(
    (await prisma.teacherAttendanceProfile.findMany({
      where: { institutionId },
      select: { employeeCode: true },
    })).map((p) => p.employeeCode).filter(Boolean),
  );

  const teacher = await prisma.teacherAttendanceProfile.create({
    data: {
      institutionId,
      recordId: await nextTeacherRecordId(institutionId),
      academicYear,
      teacherName,
      employeeCode: data.employeeCode?.trim() || makeEmployeeCode(teacherName, taken),
      department: data.department?.trim() || 'General',
      mobile: data.mobile?.trim() || '',
      email: data.email?.trim() || '',
      designation: data.designation?.trim() || 'Teacher',
    },
  });

  return {
    teacher: serializeTeacherProfile(teacher),
    created: true,
    message: `${teacherName} registered successfully (Employee code: ${teacher.employeeCode})`,
  };
}

export async function getTeacherAttendanceMeta(institutionId: string) {
  const filters = await getInstitutionFilterMeta(institutionId);
  const teacherCount = await prisma.teacherAttendanceProfile.count({
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
    sections: TEACHER_ATTENDANCE_SECTIONS,
    teacherCount,
    captureSource: 'MOBILE_APP',
    captureNote: 'Attendance and leave are captured from the teacher mobile app only.',
  };
}

export async function getTeacherAttendanceCalendar(
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

  const records = await prisma.teacherAttendanceDailyRecord.findMany({
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
    if (r.status === TeacherAttendanceStatus.PRESENT) bucket.present += 1;
    if (r.status === TeacherAttendanceStatus.PLANNED_LEAVE_ABSENT) bucket.plannedLeaveAbsent += 1;
    if (r.status === TeacherAttendanceStatus.MEDICAL_LEAVE_ABSENT) bucket.medicalLeaveAbsent += 1;
    if (r.status === TeacherAttendanceStatus.UNPLANNED_ABSENT) bucket.unplannedAbsent += 1;
    if (r.status === TeacherAttendanceStatus.UNPLANNED_NOT_INTIMATED) bucket.unplannedNotIntimated += 1;
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

  const totalTeachers = await prisma.teacherAttendanceProfile.count({
    where: { institutionId, academicYear, isActive: true },
  });

  return {
    academicYear,
    year,
    month,
    monthLabel: from.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
    totalTeachers,
    days,
    holidays: holidays.map((h) => ({ date: formatDateIso(h.date), name: h.name })),
  };
}

export async function getTeacherAttendanceDayDetail(
  institutionId: string,
  opts: { academicYear?: string; date: string },
) {
  const academicYear = opts.academicYear || '2025-26';
  const recordDate = parseDateOnly(opts.date);

  const teachers = await prisma.teacherAttendanceProfile.findMany({
    where: { institutionId, academicYear, isActive: true },
    orderBy: [{ department: 'asc' }, { teacherName: 'asc' }],
  });

  const records = await prisma.teacherAttendanceDailyRecord.findMany({
    where: { institutionId, academicYear, recordDate },
    include: { teacherProfile: true },
  });
  const recordMap = new Map(records.map((r) => [r.teacherProfileId, r]));

  const sections = TEACHER_ATTENDANCE_SECTIONS.map((section) => {
    const status = section.id as TeacherAttendanceStatus;
    const rows = teachers
      .map((t) => {
        const rec = recordMap.get(t.id);
        if (rec?.status !== status) return null;
        return serializeDailyRecord({ ...rec, teacherProfile: t });
      })
      .filter(Boolean);
    return {
      ...section,
      count: rows.length,
      teachers: rows,
    };
  });

  const unmarked = teachers
    .filter((t) => !recordMap.has(t.id))
    .map((t) => serializeTeacherProfile(t));

  return {
    academicYear,
    date: formatDateIso(recordDate),
    dateLabel: recordDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    totalTeachers: teachers.length,
    markedCount: records.length,
    unmarkedCount: unmarked.length,
    sections,
    unmarkedTeachers: unmarked,
    summary: {
      present: sections.find((s) => s.id === 'PRESENT')?.count || 0,
      plannedLeaveAbsent: sections.find((s) => s.id === 'PLANNED_LEAVE_ABSENT')?.count || 0,
      medicalLeaveAbsent: sections.find((s) => s.id === 'MEDICAL_LEAVE_ABSENT')?.count || 0,
      unplannedAbsent: sections.find((s) => s.id === 'UNPLANNED_ABSENT')?.count || 0,
      unplannedNotIntimated: sections.find((s) => s.id === 'UNPLANNED_NOT_INTIMATED')?.count || 0,
    },
  };
}

function countLeaveUsed(status: TeacherAttendanceStatus) {
  if (status === TeacherAttendanceStatus.PLANNED_LEAVE_ABSENT) return { planned: 1, medical: 0, unplanned: 0, notIntimated: 0 };
  if (status === TeacherAttendanceStatus.MEDICAL_LEAVE_ABSENT) return { planned: 0, medical: 1, unplanned: 0, notIntimated: 0 };
  if (status === TeacherAttendanceStatus.UNPLANNED_ABSENT) return { planned: 0, medical: 0, unplanned: 1, notIntimated: 0 };
  if (status === TeacherAttendanceStatus.UNPLANNED_NOT_INTIMATED) return { planned: 0, medical: 0, unplanned: 0, notIntimated: 1 };
  return { planned: 0, medical: 0, unplanned: 0, notIntimated: 0 };
}

export async function getTeacherAttendanceReport(
  institutionId: string,
  opts: {
    academicYear?: string;
    period?: TeacherPeriod;
    year?: number;
    month?: number;
    quarter?: number;
    half?: 1 | 2;
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
  const workingDates = listDatesInRange(range.from, range.to);

  const teachers = await prisma.teacherAttendanceProfile.findMany({
    where: { institutionId, academicYear, isActive: true },
    include: { leaveGrants: { where: { academicYear } } },
    orderBy: [{ department: 'asc' }, { teacherName: 'asc' }],
  });

  const records = await prisma.teacherAttendanceDailyRecord.findMany({
    where: {
      institutionId,
      academicYear,
      recordDate: { gte: range.from, lte: range.to },
    },
  });

  const recordLookup = new Map<string, TeacherAttendanceStatus>();
  for (const r of records) {
    recordLookup.set(`${r.teacherProfileId}::${formatDateIso(r.recordDate)}`, r.status);
  }

  const dateColumns = workingDates.map((d) => ({
    date: formatDateIso(d),
    label: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
  }));

  const rows = teachers.map((t) => {
    const daily: Record<string, string> = {};
    let totalPresent = 0;
    let totalPlannedLeave = 0;
    let totalMedicalLeave = 0;
    let totalUnplannedAbsent = 0;
    let totalNotIntimated = 0;

    for (const d of workingDates) {
      const iso = formatDateIso(d);
      const status = recordLookup.get(`${t.id}::${iso}`);
      daily[iso] = status ? STATUS_SHORT[status] : '—';
      if (status === TeacherAttendanceStatus.PRESENT) totalPresent += 1;
      const leave = status ? countLeaveUsed(status) : { planned: 0, medical: 0, unplanned: 0, notIntimated: 0 };
      totalPlannedLeave += leave.planned;
      totalMedicalLeave += leave.medical;
      totalUnplannedAbsent += leave.unplanned;
      totalNotIntimated += leave.notIntimated;
    }

    const grants = Object.fromEntries(t.leaveGrants.map((g) => [g.leaveType, g.daysGranted]));
    const totalLeaveUsed = totalPlannedLeave + totalMedicalLeave + totalUnplannedAbsent + totalNotIntimated;
    const totalLeaveGranted = (grants.PLANNED || 0) + (grants.MEDICAL || 0) + (grants.CASUAL || 0);

    return {
      teacher: serializeTeacherProfile(t),
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

  const categoryExports = TEACHER_ATTENDANCE_SECTIONS.map((section) => {
    const status = section.id as TeacherAttendanceStatus;
    const teachersInCategory = records
      .filter((r) => r.status === status)
      .map((r) => {
        const teacher = teachers.find((t) => t.id === r.teacherProfileId);
        return {
          date: formatDateIso(r.recordDate),
          teacherName: teacher?.teacherName || '',
          employeeCode: teacher?.employeeCode || '',
          department: teacher?.department || '',
          status: section.title,
          teacherRemarks: r.teacherRemarks,
          checkInTime: r.checkInTime,
        };
      });
    return { ...section, rows: teachersInCategory };
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
      totalTeachers: teachers.length,
      avgAttendanceScore: rows.length
        ? Math.round(rows.reduce((a, r) => a + r.totals.attendanceScore, 0) / rows.length * 10) / 10
        : 0,
    },
  };
}

export async function seedTeacherAttendanceDemo(institutionId: string, academicYear = '2025-26') {
  await syncTeacherProfilesFromAcademic(institutionId, academicYear);

  let teachers = await prisma.teacherAttendanceProfile.findMany({
    where: { institutionId, academicYear, isActive: true },
  });

  if (!teachers.length) {
    const demoNames = [
      { name: 'Rajesh Kumar', dept: 'Mathematics' },
      { name: 'Priya Sharma', dept: 'Science' },
      { name: 'Amit Patel', dept: 'English' },
      { name: 'Sneha Reddy', dept: 'Social Studies' },
      { name: 'Vikram Singh', dept: 'Hindi' },
      { name: 'Anita Desai', dept: 'Computer Science' },
      { name: 'Mohammed Ali', dept: 'Physical Education' },
      { name: 'Kavita Nair', dept: 'Arts' },
    ];
    for (const t of demoNames) {
      await prisma.teacherAttendanceProfile.create({
        data: {
          institutionId,
          recordId: await nextTeacherRecordId(institutionId),
          academicYear,
          teacherName: t.name,
          department: t.dept,
          employeeCode: `EMP-${t.name.split(' ')[0].slice(0, 3).toUpperCase()}`,
          designation: 'Teacher',
        },
      });
    }
    teachers = await prisma.teacherAttendanceProfile.findMany({
      where: { institutionId, academicYear, isActive: true },
    });
  }

  for (const t of teachers) {
    await prisma.teacherLeaveGrant.upsert({
      where: {
        teacherProfileId_academicYear_leaveType: {
          teacherProfileId: t.id,
          academicYear,
          leaveType: 'PLANNED',
        },
      },
      create: { institutionId, teacherProfileId: t.id, academicYear, leaveType: 'PLANNED', daysGranted: 12 },
      update: {},
    });
    await prisma.teacherLeaveGrant.upsert({
      where: {
        teacherProfileId_academicYear_leaveType: {
          teacherProfileId: t.id,
          academicYear,
          leaveType: 'MEDICAL',
        },
      },
      create: { institutionId, teacherProfileId: t.id, academicYear, leaveType: 'MEDICAL', daysGranted: 10 },
      update: {},
    });
    await prisma.teacherLeaveGrant.upsert({
      where: {
        teacherProfileId_academicYear_leaveType: {
          teacherProfileId: t.id,
          academicYear,
          leaveType: 'CASUAL',
        },
      },
      create: { institutionId, teacherProfileId: t.id, academicYear, leaveType: 'CASUAL', daysGranted: 5 },
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

    for (const teacher of teachers) {
      const roll = Math.random();
      let status: TeacherAttendanceStatus = TeacherAttendanceStatus.PRESENT;
      let teacherRemarks = '';
      let checkInTime = '08:10';
      let checkOutTime = '16:05';
      let lateMinutes = 0;
      let earlyExitMinutes = 0;

      if (roll < 0.04) {
        status = TeacherAttendanceStatus.PLANNED_LEAVE_ABSENT;
        checkInTime = '';
        checkOutTime = '';
      } else if (roll < 0.07) {
        status = TeacherAttendanceStatus.MEDICAL_LEAVE_ABSENT;
        checkInTime = '';
        checkOutTime = '';
        teacherRemarks = 'Medical certificate submitted via app';
      } else if (roll < 0.1) {
        status = TeacherAttendanceStatus.UNPLANNED_ABSENT;
        checkInTime = '';
        checkOutTime = '';
        teacherRemarks = remarks[Math.floor(Math.random() * 3)];
      } else if (roll < 0.12) {
        status = TeacherAttendanceStatus.UNPLANNED_NOT_INTIMATED;
        checkInTime = '';
        checkOutTime = '';
      } else if (roll < 0.15) {
        checkInTime = '08:45';
        checkOutTime = '16:05';
        lateMinutes = 15;
      } else if (roll < 0.17) {
        checkInTime = '08:15';
        checkOutTime = '15:00';
        earlyExitMinutes = 30;
      }

      await prisma.teacherAttendanceDailyRecord.upsert({
        where: {
          teacherProfileId_recordDate: { teacherProfileId: teacher.id, recordDate: d },
        },
        create: {
          institutionId,
          teacherProfileId: teacher.id,
          academicYear,
          recordDate: d,
          status,
          teacherRemarks,
          checkInTime,
          checkOutTime,
          lateMinutes,
          earlyExitMinutes,
          source: 'MOBILE',
          markedAt: new Date(d.getTime() + 8 * 3600000),
        },
        update: { status, teacherRemarks, checkInTime, checkOutTime, lateMinutes, earlyExitMinutes, source: 'MOBILE' },
      });
      recordCount += 1;
    }
  }

  return { teachers: teachers.length, records: recordCount };
}
