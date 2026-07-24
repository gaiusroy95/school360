import { FeeMasterStatus, Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { seedHrDepartmentsDemo } from './hrDepartments.js';
import { seedHrDesignationsDemo } from './hrDesignations.js';

const ATTENDANCE_STATUSES = [
  'PRESENT', 'ABSENT', 'HALF_DAY', 'PAID_LEAVE', 'LWP', 'HOLIDAY', 'WEEKLY_OFF',
  'COMP_OFF', 'WFH', 'OUTDOOR_DUTY', 'OFFICIAL_TOUR', 'TRAINING', 'LATE',
  'EARLY_EXIT', 'MISSING_PUNCH', 'FIELD_DUTY', 'ON_LEAVE',
] as const;

const STATUS_LABELS: Record<string, string> = {
  PRESENT: 'Present',
  ABSENT: 'Absent',
  HALF_DAY: 'Half Day',
  PAID_LEAVE: 'Paid Leave',
  LWP: 'Leave Without Pay (LWP)',
  HOLIDAY: 'Holiday',
  WEEKLY_OFF: 'Weekly Off',
  COMP_OFF: 'Compensatory Off',
  WFH: 'Work From Home',
  OUTDOOR_DUTY: 'Outdoor Duty',
  OFFICIAL_TOUR: 'Official Tour',
  TRAINING: 'Training',
  LATE: 'Late',
  EARLY_EXIT: 'Early Exit',
  MISSING_PUNCH: 'Missing Punch',
  FIELD_DUTY: 'Field Duty',
  ON_LEAVE: 'On Leave',
};

const WORKFLOW_STEPS = [
  'OPEN',
  'PENDING_MANAGER',
  'PENDING_DEPT_HEAD',
  'PENDING_HR',
  'PENDING_FINANCE',
  'PAYROLL_LOCKED',
] as const;

const CORRECTION_WORKFLOW = [
  'PENDING_MANAGER',
  'PENDING_HR',
  'APPROVED',
  'REJECTED',
] as const;

const BIOMETRIC_VENDORS = ['eSSL', 'Matrix', 'ZKTeco', 'Realtime', 'Mantra', 'Suprema'];
const BIOMETRIC_MODES = ['Face Recognition', 'RFID', 'QR Code', 'NFC', 'Mobile GPS Attendance'];

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

function countWorkingDaysInMonth(year: number, month: number) {
  const from = new Date(Date.UTC(year, month - 1, 1));
  const to = new Date(Date.UTC(year, month, 0));
  let count = 0;
  const cur = new Date(from);
  while (cur <= to) {
    if (!isWeekend(cur)) count += 1;
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return count;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

async function ensureSettings(institutionId: string) {
  let settings = await prisma.hrAttendanceSettings.findUnique({ where: { institutionId } });
  if (!settings) {
    settings = await prisma.hrAttendanceSettings.create({ data: { institutionId } });
  }
  return settings;
}

async function ensureShifts(institutionId: string) {
  const count = await prisma.hrShift.count({ where: { institutionId } });
  if (count > 0) return prisma.hrShift.findMany({ where: { institutionId }, orderBy: { code: 'asc' } });

  const defaults = [
    { code: 'GEN', name: 'General Shift', startTime: '09:00', endTime: '17:00', breakMinutes: 60, graceMinutes: 15, weeklyOff: ['Sunday'], isNightShift: false, isFlexible: false },
    { code: 'MOR', name: 'Morning Shift', startTime: '07:00', endTime: '15:00', breakMinutes: 45, graceMinutes: 10, weeklyOff: ['Sunday'], isNightShift: false, isFlexible: false },
    { code: 'EVE', name: 'Evening Shift', startTime: '14:00', endTime: '22:00', breakMinutes: 45, graceMinutes: 10, weeklyOff: ['Sunday'], isNightShift: false, isFlexible: false },
    { code: 'NGT', name: 'Night Shift', startTime: '22:00', endTime: '06:00', breakMinutes: 30, graceMinutes: 10, weeklyOff: ['Sunday'], isNightShift: true, isFlexible: false },
    { code: 'FLX', name: 'Flexible Shift', startTime: '09:00', endTime: '18:00', breakMinutes: 60, graceMinutes: 30, weeklyOff: ['Sunday'], isNightShift: false, isFlexible: true },
  ];

  for (const s of defaults) {
    await prisma.hrShift.create({
      data: {
        institutionId,
        code: s.code,
        name: s.name,
        startTime: s.startTime,
        endTime: s.endTime,
        breakMinutes: s.breakMinutes,
        graceMinutes: s.graceMinutes,
        weeklyOff: s.weeklyOff as Prisma.InputJsonValue,
        isNightShift: s.isNightShift,
        isFlexible: s.isFlexible,
      },
    });
  }
  return prisma.hrShift.findMany({ where: { institutionId }, orderBy: { code: 'asc' } });
}

function serializeShift(row: {
  id: string; code: string; name: string; startTime: string; endTime: string;
  breakMinutes: number; graceMinutes: number; weeklyOff: unknown;
  isNightShift: boolean; isFlexible: boolean; status: string;
}) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    startTime: row.startTime,
    endTime: row.endTime,
    breakMinutes: row.breakMinutes,
    graceMinutes: row.graceMinutes,
    weeklyOff: Array.isArray(row.weeklyOff) ? (row.weeklyOff as string[]) : ['Sunday'],
    isNightShift: row.isNightShift,
    isFlexible: row.isFlexible,
    status: row.status,
    statusLabel: row.status === 'ACTIVE' ? 'Active' : row.status,
  };
}

function serializeSettings(row: Awaited<ReturnType<typeof ensureSettings>>) {
  return {
    id: row.id,
    officeStartTime: row.officeStartTime,
    officeEndTime: row.officeEndTime,
    graceMinutes: row.graceMinutes,
    monthlyAllowedLate: row.monthlyAllowedLate,
    halfDayRule: row.halfDayRule,
    lateRule: row.lateRule,
    earlyExitRule: row.earlyExitRule,
    missingPunchRule: row.missingPunchRule,
    nightShiftRule: row.nightShiftRule,
    overtimeRule: row.overtimeRule,
    holidayRule: row.holidayRule,
    weeklyOffRule: row.weeklyOffRule,
    payrollCutoffDate: row.payrollCutoffDate,
    attendanceLockDate: row.attendanceLockDate,
    biometricSyncMinutes: row.biometricSyncMinutes,
    mapApprovedLeave: row.mapApprovedLeave,
    mapPublicHoliday: row.mapPublicHoliday,
    mapRestrictedHoliday: row.mapRestrictedHoliday,
    mapWeeklyOff: row.mapWeeklyOff,
    mapSchoolHoliday: row.mapSchoolHoliday,
    mapVacation: row.mapVacation,
    autoLwpRules: row.autoLwpRules,
    deductionRules: row.deductionRules,
  };
}

function serializeDailyRecord(
  row: {
    id: string; employeeId: string; recordDate: Date; shiftCode: string;
    inTime: string; outTime: string; workingHours: number; status: string;
    overtimeHours: number; lateMinutes: number; earlyExitMinutes: number;
    isMissingPunch: boolean; remarks: string; approvalStatus: string; source: string;
  },
  employee?: { employeeCode: string; fullName: string; department: string; designation: string; employmentType: string },
) {
  return {
    id: row.id,
    employeeId: row.employeeId,
    employeeCode: employee?.employeeCode ?? '',
    employeeName: employee?.fullName ?? '',
    department: employee?.department ?? '',
    designation: employee?.designation ?? '',
    employmentType: employee?.employmentType ?? '',
    recordDate: formatDateIso(row.recordDate),
    shiftCode: row.shiftCode,
    inTime: row.inTime,
    outTime: row.outTime,
    workingHours: row.workingHours,
    status: row.status,
    statusLabel: STATUS_LABELS[row.status] ?? row.status,
    overtimeHours: row.overtimeHours,
    lateMinutes: row.lateMinutes,
    earlyExitMinutes: row.earlyExitMinutes,
    isMissingPunch: row.isMissingPunch,
    remarks: row.remarks,
    approvalStatus: row.approvalStatus,
    source: row.source,
  };
}

export async function getHrAttendanceMeta(institutionId: string) {
  const [settings, shifts, employees, departments, designations] = await Promise.all([
    ensureSettings(institutionId),
    ensureShifts(institutionId),
    prisma.payrollEmployee.findMany({
      where: { institutionId, status: FeeMasterStatus.ACTIVE },
      select: { id: true, employeeCode: true, fullName: true, department: true, designation: true, employmentType: true },
      orderBy: { fullName: 'asc' },
    }),
    prisma.payrollEmployee.findMany({
      where: { institutionId, status: FeeMasterStatus.ACTIVE },
      select: { department: true },
      distinct: ['department'],
    }),
    prisma.payrollEmployee.findMany({
      where: { institutionId, status: FeeMasterStatus.ACTIVE },
      select: { designation: true },
      distinct: ['designation'],
    }),
  ]);

  return {
    statuses: ATTENDANCE_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] ?? s })),
    shifts: shifts.map(serializeShift),
    settings: serializeSettings(settings),
    employees: employees.map((e) => ({
      id: e.id,
      employeeCode: e.employeeCode,
      fullName: e.fullName,
      department: e.department,
      designation: e.designation,
      employmentType: e.employmentType,
      label: `${e.fullName} (${e.employeeCode})`,
    })),
    departments: departments.map((d) => d.department).sort(),
    designations: designations.map((d) => d.designation).sort(),
    campuses: ['Main Campus', 'North Campus', 'South Campus', 'Junior Wing'],
    branches: ['Main Branch', 'City Branch', 'Suburban Branch'],
    biometricVendors: BIOMETRIC_VENDORS,
    biometricModes: BIOMETRIC_MODES,
    workflowSteps: WORKFLOW_STEPS,
    correctionWorkflow: CORRECTION_WORKFLOW,
  };
}

export async function getHrAttendanceDashboard(institutionId: string, dateStr?: string) {
  const date = parseDateOnly(dateStr);
  const start = date;
  const end = new Date(date);
  end.setUTCHours(23, 59, 59, 999);

  const employees = await prisma.payrollEmployee.findMany({
    where: { institutionId, status: FeeMasterStatus.ACTIVE },
    select: { id: true },
  });
  const totalEmployees = employees.length;

  const records = await prisma.hrAttendanceDailyRecord.findMany({
    where: { institutionId, recordDate: date },
  });

  const countByStatus = (statuses: string[]) =>
    records.filter((r) => statuses.includes(r.status)).length;

  const pendingApproval = records.filter((r) => r.approvalStatus === 'SUBMITTED').length;
  const overtimeEmployees = records.filter((r) => r.overtimeHours > 0).length;
  const missingPunch = records.filter((r) => r.isMissingPunch || r.status === 'MISSING_PUNCH').length;
  const lateArrivals = records.filter((r) => r.lateMinutes > 0 || r.status === 'LATE').length;
  const earlyDepartures = records.filter((r) => r.earlyExitMinutes > 0 || r.status === 'EARLY_EXIT').length;

  const markedIds = new Set(records.map((r) => r.employeeId));
  const present = countByStatus(['PRESENT', 'LATE', 'WFH', 'OUTDOOR_DUTY', 'FIELD_DUTY', 'TRAINING']);
  const onLeave = countByStatus(['PAID_LEAVE', 'ON_LEAVE']);
  const absentMarked = countByStatus(['ABSENT', 'LWP']);
  const unmarkedAbsent = Math.max(0, totalEmployees - markedIds.size - onLeave - countByStatus(['HOLIDAY', 'WEEKLY_OFF']));

  return {
    date: formatDateIso(date),
    summary: {
      totalEmployees,
      present,
      absent: absentMarked + unmarkedAbsent,
      onLeave,
      halfDay: countByStatus(['HALF_DAY']),
      lateArrivals,
      earlyDepartures,
      workFromHome: countByStatus(['WFH']),
      fieldDuty: countByStatus(['FIELD_DUTY']),
      outdoorDuty: countByStatus(['OUTDOOR_DUTY']),
      onTraining: countByStatus(['TRAINING']),
      holiday: countByStatus(['HOLIDAY']),
      weeklyOff: countByStatus(['WEEKLY_OFF']),
      missingPunch,
      overtimeEmployees,
      pendingApproval,
    },
    payrollFormula: [
      'Gross Salary',
      'Working Days',
      'Present Days',
      'Leave Balance',
      'LWP Deduction',
      'Late Deduction',
      'Half Day Deduction',
      'Overtime Addition',
      'Night Shift Allowance',
      'Attendance Incentive',
      'Final Payable Salary',
    ],
    payrollMappingFields: [
      'Present Days', 'Absent Days', 'Paid Leave', 'Leave Without Pay (LWP)',
      'Overtime Hours', 'Late Marks', 'Early Exits', 'Half Days',
      'Working Days', 'Holidays', 'Weekly Off', 'Night Shift Allowance', 'Attendance Incentives',
    ],
    approvalWorkflow: ['Employee', 'Reporting Manager', 'Department Head', 'HR', 'Finance', 'Payroll Locked'],
    correctionWorkflow: ['Employee', 'Reporting Manager', 'HR', 'Approved'],
  };
}

type DailyFilters = {
  date?: string;
  campus?: string;
  branch?: string;
  department?: string;
  designation?: string;
  shift?: string;
  employmentType?: string;
  employeeId?: string;
  q?: string;
};

export async function getHrDailyAttendance(institutionId: string, filters: DailyFilters = {}) {
  const date = parseDateOnly(filters.date);
  const whereEmp: Prisma.PayrollEmployeeWhereInput = {
    institutionId,
    status: FeeMasterStatus.ACTIVE,
  };
  if (filters.department) whereEmp.department = filters.department;
  if (filters.designation) whereEmp.designation = filters.designation;
  if (filters.employmentType) whereEmp.employmentType = filters.employmentType as never;
  if (filters.employeeId) whereEmp.id = filters.employeeId;
  if (filters.q?.trim()) {
    const term = filters.q.trim();
    whereEmp.OR = [
      { fullName: { contains: term, mode: 'insensitive' } },
      { employeeCode: { contains: term, mode: 'insensitive' } },
    ];
  }

  const [employees, records, periodLock] = await Promise.all([
    prisma.payrollEmployee.findMany({
      where: whereEmp,
      orderBy: [{ department: 'asc' }, { fullName: 'asc' }],
    }),
    prisma.hrAttendanceDailyRecord.findMany({
      where: { institutionId, recordDate: date },
    }),
    prisma.hrAttendancePeriodLock.findUnique({
      where: {
        institutionId_year_month: {
          institutionId,
          year: date.getUTCFullYear(),
          month: date.getUTCMonth() + 1,
        },
      },
    }),
  ]);

  const recordMap = new Map(records.map((r) => [r.employeeId, r]));
  const grid = employees.map((emp) => {
    const rec = recordMap.get(emp.id);
    if (rec) return serializeDailyRecord(rec, emp);
    return {
      id: '',
      employeeId: emp.id,
      employeeCode: emp.employeeCode,
      employeeName: emp.fullName,
      department: emp.department,
      designation: emp.designation,
      employmentType: emp.employmentType,
      recordDate: formatDateIso(date),
      shiftCode: filters.shift || 'GEN',
      inTime: '',
      outTime: '',
      workingHours: 0,
      status: isWeekend(date) ? 'WEEKLY_OFF' : 'ABSENT',
      statusLabel: isWeekend(date) ? STATUS_LABELS.WEEKLY_OFF : STATUS_LABELS.ABSENT,
      overtimeHours: 0,
      lateMinutes: 0,
      earlyExitMinutes: 0,
      isMissingPunch: false,
      remarks: '',
      approvalStatus: 'DRAFT',
      source: 'MANUAL',
    };
  });

  const filtered = filters.shift
    ? grid.filter((g) => g.shiftCode === filters.shift || !g.id)
    : grid;

  return {
    date: formatDateIso(date),
    records: filtered,
    periodLock: periodLock
      ? { workflowStatus: periodLock.workflowStatus, lockedAt: periodLock.lockedAt?.toISOString() ?? null }
      : { workflowStatus: 'OPEN', lockedAt: null },
    isLocked: periodLock?.workflowStatus === 'PAYROLL_LOCKED',
  };
}

export async function saveHrDailyAttendance(
  institutionId: string,
  dateStr: string,
  rows: Array<{
    employeeId: string;
    shiftCode?: string;
    inTime?: string;
    outTime?: string;
    workingHours?: number;
    status?: string;
    overtimeHours?: number;
    lateMinutes?: number;
    earlyExitMinutes?: number;
    isMissingPunch?: boolean;
    remarks?: string;
  }>,
) {
  const date = parseDateOnly(dateStr);
  const periodLock = await prisma.hrAttendancePeriodLock.findUnique({
    where: {
      institutionId_year_month: {
        institutionId,
        year: date.getUTCFullYear(),
        month: date.getUTCMonth() + 1,
      },
    },
  });
  if (periodLock?.workflowStatus === 'PAYROLL_LOCKED') {
    throw new Error('Attendance is locked for payroll. Cannot modify records.');
  }

  for (const row of rows) {
    await prisma.hrAttendanceDailyRecord.upsert({
      where: { employeeId_recordDate: { employeeId: row.employeeId, recordDate: date } },
      create: {
        institutionId,
        employeeId: row.employeeId,
        recordDate: date,
        shiftCode: row.shiftCode || 'GEN',
        inTime: row.inTime || '',
        outTime: row.outTime || '',
        workingHours: row.workingHours ?? 0,
        status: row.status || 'PRESENT',
        overtimeHours: row.overtimeHours ?? 0,
        lateMinutes: row.lateMinutes ?? 0,
        earlyExitMinutes: row.earlyExitMinutes ?? 0,
        isMissingPunch: row.isMissingPunch ?? false,
        remarks: row.remarks || '',
        approvalStatus: 'DRAFT',
        source: 'MANUAL',
      },
      update: {
        shiftCode: row.shiftCode,
        inTime: row.inTime,
        outTime: row.outTime,
        workingHours: row.workingHours,
        status: row.status,
        overtimeHours: row.overtimeHours,
        lateMinutes: row.lateMinutes,
        earlyExitMinutes: row.earlyExitMinutes,
        isMissingPunch: row.isMissingPunch,
        remarks: row.remarks,
      },
    });
  }

  return getHrDailyAttendance(institutionId, { date: dateStr });
}

export async function submitHrDailyAttendance(institutionId: string, dateStr: string) {
  const date = parseDateOnly(dateStr);
  await prisma.hrAttendanceDailyRecord.updateMany({
    where: { institutionId, recordDate: date, approvalStatus: 'DRAFT' },
    data: { approvalStatus: 'SUBMITTED' },
  });
  return getHrDailyAttendance(institutionId, { date: dateStr });
}

export async function approveHrDailyAttendance(institutionId: string, dateStr: string) {
  const date = parseDateOnly(dateStr);
  await prisma.hrAttendanceDailyRecord.updateMany({
    where: { institutionId, recordDate: date, approvalStatus: 'SUBMITTED' },
    data: { approvalStatus: 'APPROVED' },
  });
  return getHrDailyAttendance(institutionId, { date: dateStr });
}

export async function getHrMonthlyRegister(institutionId: string, year: number, month: number) {
  const from = new Date(Date.UTC(year, month - 1, 1));
  const to = new Date(Date.UTC(year, month, 0));
  const workingDays = countWorkingDaysInMonth(year, month);

  const employees = await prisma.payrollEmployee.findMany({
    where: { institutionId, status: FeeMasterStatus.ACTIVE },
    orderBy: [{ department: 'asc' }, { fullName: 'asc' }],
  });

  const records = await prisma.hrAttendanceDailyRecord.findMany({
    where: { institutionId, recordDate: { gte: from, lte: to } },
  });

  const byEmployee = new Map<string, typeof records>();
  for (const r of records) {
    const list = byEmployee.get(r.employeeId) ?? [];
    list.push(r);
    byEmployee.set(r.employeeId, list);
  }

  const rows = employees.map((emp) => {
    const recs = byEmployee.get(emp.id) ?? [];
    const present = recs.filter((r) => ['PRESENT', 'LATE', 'WFH', 'OUTDOOR_DUTY', 'FIELD_DUTY'].includes(r.status)).length;
    const leave = recs.filter((r) => ['PAID_LEAVE', 'ON_LEAVE', 'COMP_OFF'].includes(r.status)).length;
    const lwp = recs.filter((r) => r.status === 'LWP').length;
    const otHours = round2(recs.reduce((s, r) => s + r.overtimeHours, 0));
    const late = recs.filter((r) => r.lateMinutes > 0 || r.status === 'LATE').length;
    const salaryDays = round2(present + leave + recs.filter((r) => r.status === 'HALF_DAY').length * 0.5);

    return {
      employeeId: emp.id,
      employeeCode: emp.employeeCode,
      employeeName: emp.fullName,
      department: emp.department,
      workingDays,
      present,
      leave,
      lwp,
      otHours,
      late,
      salaryDays,
    };
  });

  return { year, month, workingDays, rows };
}

export async function getHrEmployeeAttendanceCard(
  institutionId: string,
  employeeId: string,
  year: number,
  month: number,
) {
  const from = new Date(Date.UTC(year, month - 1, 1));
  const to = new Date(Date.UTC(year, month, 0));

  const [employee, records] = await Promise.all([
    prisma.payrollEmployee.findFirst({ where: { id: employeeId, institutionId } }),
    prisma.hrAttendanceDailyRecord.findMany({
      where: { institutionId, employeeId, recordDate: { gte: from, lte: to } },
      orderBy: { recordDate: 'asc' },
    }),
  ]);
  if (!employee) throw new Error('Employee not found');

  const calendar: Array<{
    date: string;
    status: string;
    statusLabel: string;
    inTime: string;
    outTime: string;
    workingHours: number;
    overtimeHours: number;
    lateMinutes: number;
  }> = [];

  const cur = new Date(from);
  const recMap = new Map(records.map((r) => [formatDateIso(r.recordDate), r]));
  while (cur <= to) {
    const iso = formatDateIso(cur);
    const rec = recMap.get(iso);
    calendar.push({
      date: iso,
      status: rec?.status ?? (isWeekend(cur) ? 'WEEKLY_OFF' : 'ABSENT'),
      statusLabel: STATUS_LABELS[rec?.status ?? (isWeekend(cur) ? 'WEEKLY_OFF' : 'ABSENT')] ?? '—',
      inTime: rec?.inTime ?? '',
      outTime: rec?.outTime ?? '',
      workingHours: rec?.workingHours ?? 0,
      overtimeHours: rec?.overtimeHours ?? 0,
      lateMinutes: rec?.lateMinutes ?? 0,
    });
    cur.setUTCDate(cur.getUTCDate() + 1);
  }

  const present = records.filter((r) => ['PRESENT', 'LATE', 'WFH'].includes(r.status)).length;
  const leave = records.filter((r) => ['PAID_LEAVE', 'ON_LEAVE'].includes(r.status)).length;
  const holidays = records.filter((r) => r.status === 'HOLIDAY').length;
  const weeklyOff = records.filter((r) => r.status === 'WEEKLY_OFF').length;
  const lateMarks = records.filter((r) => r.lateMinutes > 0).length;
  const totalHours = round2(records.reduce((s, r) => s + r.workingHours, 0));
  const totalOt = round2(records.reduce((s, r) => s + r.overtimeHours, 0));

  return {
    employee: {
      id: employee.id,
      employeeCode: employee.employeeCode,
      fullName: employee.fullName,
      department: employee.department,
      designation: employee.designation,
    },
    year,
    month,
    summary: { present, leave, holidays, weeklyOff, lateMarks, totalHours, totalOt },
    calendar,
    punchDetails: records.map((r) => serializeDailyRecord(r, employee)),
  };
}

export async function calculateHrPayrollAttendance(
  institutionId: string,
  employeeId: string,
  year: number,
  month: number,
) {
  const workingDays = countWorkingDaysInMonth(year, month);
  const from = new Date(Date.UTC(year, month - 1, 1));
  const to = new Date(Date.UTC(year, month, 0));

  const [employee, records, structure] = await Promise.all([
    prisma.payrollEmployee.findFirst({
      where: { id: employeeId, institutionId },
      include: {
        salaryStructures: { where: { status: FeeMasterStatus.ACTIVE }, take: 1 },
      },
    }),
    prisma.hrAttendanceDailyRecord.findMany({
      where: { institutionId, employeeId, recordDate: { gte: from, lte: to } },
    }),
    prisma.hrAttendanceSettings.findUnique({ where: { institutionId } }),
  ]);
  if (!employee) throw new Error('Employee not found');

  const grossSalary = employee.salaryStructures[0]?.grossSalary ?? 45000;
  const presentDays = records.filter((r) => ['PRESENT', 'LATE', 'WFH', 'OUTDOOR_DUTY'].includes(r.status)).length;
  const paidLeave = records.filter((r) => ['PAID_LEAVE', 'ON_LEAVE', 'COMP_OFF'].includes(r.status)).length;
  const lwpDays = records.filter((r) => r.status === 'LWP').length;
  const halfDays = records.filter((r) => r.status === 'HALF_DAY').length;
  const lateMarks = records.filter((r) => r.lateMinutes > 0 || r.status === 'LATE').length;
  const otHours = round2(records.reduce((s, r) => s + r.overtimeHours, 0));
  const nightShiftDays = records.filter((r) => r.shiftCode === 'NGT').length;
  const holidays = records.filter((r) => r.status === 'HOLIDAY').length;
  const weeklyOff = records.filter((r) => r.status === 'WEEKLY_OFF').length;

  const dailyRate = grossSalary / workingDays;
  const leaveBalance = Math.max(0, 12 - paidLeave);
  const lwpDeduction = round2(lwpDays * dailyRate);
  const lateDeduction = round2(Math.max(0, lateMarks - (structure?.monthlyAllowedLate ?? 3)) * (dailyRate * 0.1));
  const halfDayDeduction = round2(halfDays * dailyRate * 0.5);
  const hourlyRate = grossSalary / (workingDays * 8);
  const overtimeAddition = round2(otHours * hourlyRate * 1.5);
  const nightShiftAllowance = round2(nightShiftDays * (grossSalary * 0.1) / workingDays);
  const attendanceIncentive = presentDays >= workingDays - 2 ? round2(grossSalary * 0.02) : 0;
  const finalPayable = round2(
    grossSalary - lwpDeduction - lateDeduction - halfDayDeduction + overtimeAddition + nightShiftAllowance + attendanceIncentive,
  );

  return {
    employee: { id: employee.id, employeeCode: employee.employeeCode, fullName: employee.fullName },
    year,
    month,
    formula: [
      { step: 'Gross Salary', value: grossSalary, type: 'base' },
      { step: 'Working Days', value: workingDays, type: 'info' },
      { step: 'Present Days', value: presentDays, type: 'info' },
      { step: 'Leave Balance', value: leaveBalance, type: 'info' },
      { step: 'LWP Deduction', value: -lwpDeduction, type: 'deduction' },
      { step: 'Late Deduction', value: -lateDeduction, type: 'deduction' },
      { step: 'Half Day Deduction', value: -halfDayDeduction, type: 'deduction' },
      { step: 'Overtime Addition', value: overtimeAddition, type: 'addition' },
      { step: 'Night Shift Allowance', value: nightShiftAllowance, type: 'addition' },
      { step: 'Attendance Incentive', value: attendanceIncentive, type: 'addition' },
      { step: 'Final Payable Salary', value: finalPayable, type: 'final' },
    ],
    payrollMapping: {
      presentDays,
      absentDays: records.filter((r) => r.status === 'ABSENT').length,
      paidLeave,
      lwpDays,
      overtimeHours: otHours,
      lateMarks,
      earlyExits: records.filter((r) => r.earlyExitMinutes > 0).length,
      halfDays,
      workingDays,
      holidays,
      weeklyOff,
      nightShiftAllowance,
      attendanceIncentives: attendanceIncentive,
    },
  };
}

export async function listHrAttendanceCorrections(institutionId: string) {
  const rows = await prisma.hrAttendanceCorrection.findMany({
    where: { institutionId },
    include: { employee: { select: { employeeCode: true, fullName: true, department: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return rows.map((r) => ({
    id: r.id,
    employeeId: r.employeeId,
    employeeCode: r.employee.employeeCode,
    employeeName: r.employee.fullName,
    department: r.employee.department,
    attendanceDate: formatDateIso(r.attendanceDate),
    originalInTime: r.originalInTime,
    originalOutTime: r.originalOutTime,
    correctedInTime: r.correctedInTime,
    correctedOutTime: r.correctedOutTime,
    reason: r.reason,
    attachmentUrl: r.attachmentUrl,
    workflowStatus: r.workflowStatus,
    workflowLabel: r.workflowStatus.replace(/_/g, ' '),
    managerRemarks: r.managerRemarks,
    hrRemarks: r.hrRemarks,
    approvedAt: r.approvedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function createHrAttendanceCorrection(
  institutionId: string,
  data: {
    employeeId: string;
    attendanceDate: string;
    originalInTime?: string;
    originalOutTime?: string;
    correctedInTime?: string;
    correctedOutTime?: string;
    reason: string;
    attachmentUrl?: string;
  },
) {
  const date = parseDateOnly(data.attendanceDate);
  const existing = await prisma.hrAttendanceDailyRecord.findUnique({
    where: { employeeId_recordDate: { employeeId: data.employeeId, recordDate: date } },
  });

  const row = await prisma.hrAttendanceCorrection.create({
    data: {
      institutionId,
      employeeId: data.employeeId,
      attendanceDate: date,
      originalInTime: data.originalInTime || existing?.inTime || '',
      originalOutTime: data.originalOutTime || existing?.outTime || '',
      correctedInTime: data.correctedInTime || '',
      correctedOutTime: data.correctedOutTime || '',
      reason: data.reason,
      attachmentUrl: data.attachmentUrl || '',
      workflowStatus: 'PENDING_MANAGER',
    },
  });

  return { id: row.id, message: 'Correction request submitted' };
}

export async function advanceHrCorrectionWorkflow(
  institutionId: string,
  id: string,
  action: 'approve' | 'reject',
  remarks?: string,
) {
  const row = await prisma.hrAttendanceCorrection.findFirst({ where: { id, institutionId } });
  if (!row) throw new Error('Correction not found');

  let nextStatus = row.workflowStatus;
  if (action === 'reject') {
    nextStatus = 'REJECTED';
  } else if (row.workflowStatus === 'PENDING_MANAGER') {
    nextStatus = 'PENDING_HR';
  } else if (row.workflowStatus === 'PENDING_HR') {
    nextStatus = 'APPROVED';
    await prisma.hrAttendanceDailyRecord.upsert({
      where: {
        employeeId_recordDate: { employeeId: row.employeeId, recordDate: row.attendanceDate },
      },
      create: {
        institutionId,
        employeeId: row.employeeId,
        recordDate: row.attendanceDate,
        inTime: row.correctedInTime,
        outTime: row.correctedOutTime,
        status: 'PRESENT',
        source: 'CORRECTION',
        approvalStatus: 'APPROVED',
      },
      update: {
        inTime: row.correctedInTime,
        outTime: row.correctedOutTime,
        status: 'PRESENT',
        source: 'CORRECTION',
      },
    });
  }

  await prisma.hrAttendanceCorrection.update({
    where: { id },
    data: {
      workflowStatus: nextStatus,
      managerRemarks: row.workflowStatus === 'PENDING_MANAGER' ? (remarks || '') : row.managerRemarks,
      hrRemarks: row.workflowStatus === 'PENDING_HR' ? (remarks || '') : row.hrRemarks,
      approvedAt: nextStatus === 'APPROVED' ? new Date() : row.approvedAt,
    },
  });

  return { workflowStatus: nextStatus };
}

export async function getHrAttendancePeriodLock(institutionId: string, year: number, month: number) {
  let lock = await prisma.hrAttendancePeriodLock.findUnique({
    where: { institutionId_year_month: { institutionId, year, month } },
  });
  if (!lock) {
    lock = await prisma.hrAttendancePeriodLock.create({
      data: { institutionId, year, month, workingDays: countWorkingDaysInMonth(year, month) },
    });
  }
  return {
    year,
    month,
    workflowStatus: lock.workflowStatus,
    workingDays: lock.workingDays,
    lockedAt: lock.lockedAt?.toISOString() ?? null,
    workflowSteps: WORKFLOW_STEPS,
  };
}

export async function advanceHrAttendancePeriodWorkflow(
  institutionId: string,
  year: number,
  month: number,
) {
  const lock = await getHrAttendancePeriodLock(institutionId, year, month);
  const idx = WORKFLOW_STEPS.indexOf(lock.workflowStatus as (typeof WORKFLOW_STEPS)[number]);
  const next = WORKFLOW_STEPS[Math.min(idx + 1, WORKFLOW_STEPS.length - 1)];

  await prisma.hrAttendancePeriodLock.update({
    where: { institutionId_year_month: { institutionId, year, month } },
    data: {
      workflowStatus: next,
      lockedAt: next === 'PAYROLL_LOCKED' ? new Date() : undefined,
      lockedBy: next === 'PAYROLL_LOCKED' ? 'HR System' : '',
    },
  });

  return getHrAttendancePeriodLock(institutionId, year, month);
}

export async function updateHrAttendanceSettings(
  institutionId: string,
  data: Partial<ReturnType<typeof serializeSettings>>,
) {
  await ensureSettings(institutionId);
  const row = await prisma.hrAttendanceSettings.update({
    where: { institutionId },
    data: {
      officeStartTime: data.officeStartTime,
      officeEndTime: data.officeEndTime,
      graceMinutes: data.graceMinutes,
      monthlyAllowedLate: data.monthlyAllowedLate,
      halfDayRule: data.halfDayRule,
      lateRule: data.lateRule,
      earlyExitRule: data.earlyExitRule,
      missingPunchRule: data.missingPunchRule,
      nightShiftRule: data.nightShiftRule,
      overtimeRule: data.overtimeRule,
      holidayRule: data.holidayRule,
      weeklyOffRule: data.weeklyOffRule,
      payrollCutoffDate: data.payrollCutoffDate,
      attendanceLockDate: data.attendanceLockDate,
      biometricSyncMinutes: data.biometricSyncMinutes,
      mapApprovedLeave: data.mapApprovedLeave,
      mapPublicHoliday: data.mapPublicHoliday,
      mapRestrictedHoliday: data.mapRestrictedHoliday,
      mapWeeklyOff: data.mapWeeklyOff,
      mapSchoolHoliday: data.mapSchoolHoliday,
      mapVacation: data.mapVacation,
    },
  });
  return serializeSettings(row);
}

export async function getHrBiometricDevicesSummary(institutionId: string) {
  const devices = await prisma.biometricDevice.findMany({
    where: { institutionId },
    orderBy: { name: 'asc' },
  });

  return {
    supportedVendors: BIOMETRIC_VENDORS,
    supportedModes: BIOMETRIC_MODES,
    devices: devices.map((d, i) => ({
      id: d.id,
      deviceName: d.name,
      deviceId: d.recordId,
      campus: d.location || 'Main Campus',
      branch: 'Main Branch',
      ipAddress: `192.168.1.${100 + i}`,
      vendor: BIOMETRIC_VENDORS[i % BIOMETRIC_VENDORS.length],
      deviceType: d.deviceType,
      syncStatus: d.lastSyncAt ? 'Synced' : 'Pending',
      lastSyncTime: d.lastSyncAt?.toISOString() ?? null,
      status: d.status,
    })),
    functions: ['Manual Sync', 'Auto Sync', 'Sync History', 'Device Logs', 'Error Logs'],
  };
}

const STATUS_POOL = ['PRESENT', 'PRESENT', 'PRESENT', 'LATE', 'WFH', 'PAID_LEAVE', 'HALF_DAY', 'ABSENT', 'OUTDOOR_DUTY', 'TRAINING'] as const;

export async function seedHrAttendanceLeaveDemo(institutionId: string) {
  await seedHrDepartmentsDemo(institutionId);
  await seedHrDesignationsDemo(institutionId);
  await ensureSettings(institutionId);
  const shifts = await ensureShifts(institutionId);

  const employees = await prisma.payrollEmployee.findMany({
    where: { institutionId, status: FeeMasterStatus.ACTIVE },
  });
  if (!employees.length) return { message: 'No employees to seed attendance' };

  const today = new Date();
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth() + 1;
  const from = new Date(Date.UTC(year, month - 1, 1));
  const to = parseDateOnly(today);

  await prisma.hrAttendanceDailyRecord.deleteMany({
    where: { institutionId, recordDate: { gte: from, lte: to } },
  });

  const shiftCodes = shifts.map((s) => s.code);
  let dayIdx = 0;
  const cur = new Date(from);
  while (cur <= to) {
    if (!isWeekend(cur)) {
      for (let i = 0; i < employees.length; i++) {
        const emp = employees[i];
        const status = STATUS_POOL[(dayIdx + i) % STATUS_POOL.length];
        const isLate = status === 'LATE';
        const isPresent = ['PRESENT', 'LATE', 'WFH', 'OUTDOOR_DUTY', 'TRAINING'].includes(status);
        await prisma.hrAttendanceDailyRecord.create({
          data: {
            institutionId,
            employeeId: emp.id,
            recordDate: new Date(cur),
            shiftCode: shiftCodes[i % shiftCodes.length],
            inTime: isPresent ? (isLate ? '09:25 AM' : '08:55 AM') : '',
            outTime: isPresent ? '05:05 PM' : '',
            workingHours: isPresent ? (status === 'HALF_DAY' ? 4 : 8) : 0,
            status,
            overtimeHours: i % 7 === 0 && isPresent ? 1.5 : 0,
            lateMinutes: isLate ? 25 : 0,
            earlyExitMinutes: i % 11 === 0 && isPresent ? 20 : 0,
            isMissingPunch: i % 13 === 0 && isPresent,
            approvalStatus: dayIdx < 20 ? 'APPROVED' : 'DRAFT',
            source: i % 3 === 0 ? 'BIOMETRIC' : 'MANUAL',
          },
        });
      }
    } else {
      for (const emp of employees) {
        await prisma.hrAttendanceDailyRecord.create({
          data: {
            institutionId,
            employeeId: emp.id,
            recordDate: new Date(cur),
            shiftCode: 'GEN',
            status: 'WEEKLY_OFF',
            approvalStatus: 'APPROVED',
            source: 'AUTO',
          },
        });
      }
    }
    dayIdx += 1;
    cur.setUTCDate(cur.getUTCDate() + 1);
  }

  const correctionCount = await prisma.hrAttendanceCorrection.count({ where: { institutionId } });
  if (correctionCount === 0 && employees[0]) {
    await prisma.hrAttendanceCorrection.create({
      data: {
        institutionId,
        employeeId: employees[0].id,
        attendanceDate: to,
        originalInTime: '09:30 AM',
        originalOutTime: '05:00 PM',
        correctedInTime: '09:00 AM',
        correctedOutTime: '05:30 PM',
        reason: 'Biometric device was offline during morning punch',
        workflowStatus: 'PENDING_MANAGER',
      },
    });
  }

  await prisma.hrAttendancePeriodLock.upsert({
    where: { institutionId_year_month: { institutionId, year, month } },
    create: { institutionId, year, month, workingDays: countWorkingDaysInMonth(year, month), workflowStatus: 'OPEN' },
    update: { workingDays: countWorkingDaysInMonth(year, month) },
  });

  return { message: 'Attendance demo data seeded', employees: employees.length };
}
