import { FeeMasterStatus, Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { seedHrAttendanceLeaveDemo } from './hrAttendanceLeave.js';

export const SHIFT_TYPES = [
  'MORNING', 'REGULAR', 'EVENING', 'NIGHT', 'HOSTEL', 'TRANSPORT', 'SECURITY',
  'LABORATORY', 'LIBRARY', 'ADMINISTRATIVE', 'WEEKEND', 'HOLIDAY', 'FLEXIBLE',
  'SPLIT', 'REMOTE', 'EXAM_DUTY', 'EVENT',
] as const;

export const SHIFT_TYPE_LABELS: Record<string, string> = {
  MORNING: 'Morning Shift',
  REGULAR: 'Regular Shift',
  EVENING: 'Evening Shift',
  NIGHT: 'Night Shift',
  HOSTEL: 'Hostel Shift',
  TRANSPORT: 'Transport Shift',
  SECURITY: 'Security Shift',
  LABORATORY: 'Laboratory Shift',
  LIBRARY: 'Library Shift',
  ADMINISTRATIVE: 'Administrative Shift',
  WEEKEND: 'Weekend Shift',
  HOLIDAY: 'Holiday Shift',
  FLEXIBLE: 'Flexible Shift',
  SPLIT: 'Split Shift',
  REMOTE: 'Remote Shift',
  EXAM_DUTY: 'Exam Duty Shift',
  EVENT: 'Event Shift',
};

export const DEPARTMENTS = [
  'Teaching', 'Administration', 'Accounts', 'Reception', 'HR', 'Transport',
  'Security', 'Library', 'Laboratory', 'Sports', 'Hostel', 'IT', 'Maintenance',
];

export const TIME_SLOTS = ['Morning', 'Afternoon', 'Evening', 'Night', 'Holiday', 'Weekly Off'] as const;
export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function parseJsonArray<T>(raw: unknown): T[] {
  if (!Array.isArray(raw)) return [];
  return raw as T[];
}

function serializeShift(row: {
  id: string; code: string; name: string; shiftType: string; description: string;
  startTime: string; endTime: string; breakStart: string; breakEnd: string;
  breakMinutes: number; totalHours: number; graceMinutes: number;
  lateMarkRule: string; earlyExitRule: string; overtimeEligible: boolean;
  halfDayRule: string; attendanceRule: string; payrollRule: string;
  applicableDepartments: unknown; weeklyOff: unknown;
  isNightShift: boolean; isFlexible: boolean; status: string;
}) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    shiftType: row.shiftType,
    shiftTypeLabel: SHIFT_TYPE_LABELS[row.shiftType] ?? row.shiftType,
    description: row.description,
    startTime: row.startTime,
    endTime: row.endTime,
    breakStart: row.breakStart,
    breakEnd: row.breakEnd,
    breakMinutes: row.breakMinutes,
    totalHours: row.totalHours,
    graceMinutes: row.graceMinutes,
    lateMarkRule: row.lateMarkRule,
    earlyExitRule: row.earlyExitRule,
    overtimeEligible: row.overtimeEligible,
    halfDayRule: row.halfDayRule,
    attendanceRule: row.attendanceRule,
    payrollRule: row.payrollRule,
    applicableDepartments: parseJsonArray<string>(row.applicableDepartments),
    weeklyOff: parseJsonArray<string>(row.weeklyOff),
    isNightShift: row.isNightShift,
    isFlexible: row.isFlexible,
    status: row.status,
  };
}

async function ensureModuleSettings(institutionId: string) {
  let row = await prisma.hrShiftModuleSettings.findUnique({ where: { institutionId } });
  if (!row) row = await prisma.hrShiftModuleSettings.create({ data: { institutionId } });
  return row;
}

async function ensureWorkingHours(institutionId: string) {
  let row = await prisma.hrInstitutionWorkingHours.findUnique({ where: { institutionId } });
  if (!row) row = await prisma.hrInstitutionWorkingHours.create({ data: { institutionId } });
  return row;
}

async function ensureShiftsExtended(institutionId: string) {
  const count = await prisma.hrShift.count({ where: { institutionId } });
  if (count > 0) {
    return prisma.hrShift.findMany({ where: { institutionId }, orderBy: { code: 'asc' } });
  }

  const defaults = [
    { code: 'MOR', name: 'Morning Shift', shiftType: 'MORNING', startTime: '07:00', endTime: '14:00', totalHours: 7, isNightShift: false, isFlexible: false, departments: ['Teaching'] },
    { code: 'REG', name: 'Regular Shift', shiftType: 'REGULAR', startTime: '09:00', endTime: '17:00', totalHours: 8, isNightShift: false, isFlexible: false, departments: ['Teaching', 'Administration'] },
    { code: 'EVE', name: 'Evening Shift', shiftType: 'EVENING', startTime: '14:00', endTime: '22:00', totalHours: 8, isNightShift: false, isFlexible: false, departments: ['Teaching'] },
    { code: 'NGT', name: 'Night Shift', shiftType: 'NIGHT', startTime: '22:00', endTime: '06:00', totalHours: 8, isNightShift: true, isFlexible: false, departments: ['Security', 'Hostel'] },
    { code: 'HST', name: 'Hostel Shift', shiftType: 'HOSTEL', startTime: '08:00', endTime: '20:00', totalHours: 12, isNightShift: false, isFlexible: false, departments: ['Hostel'] },
    { code: 'TRN', name: 'Transport Shift', shiftType: 'TRANSPORT', startTime: '06:30', endTime: '18:30', totalHours: 12, isNightShift: false, isFlexible: false, departments: ['Transport'] },
    { code: 'SEC', name: 'Security Shift', shiftType: 'SECURITY', startTime: '08:00', endTime: '20:00', totalHours: 12, isNightShift: false, isFlexible: false, departments: ['Security'] },
    { code: 'LAB', name: 'Laboratory Shift', shiftType: 'LABORATORY', startTime: '09:00', endTime: '16:00', totalHours: 7, isNightShift: false, isFlexible: false, departments: ['Laboratory'] },
    { code: 'LIB', name: 'Library Shift', shiftType: 'LIBRARY', startTime: '08:00', endTime: '16:00', totalHours: 8, isNightShift: false, isFlexible: false, departments: ['Library'] },
    { code: 'ADM', name: 'Administrative Shift', shiftType: 'ADMINISTRATIVE', startTime: '09:00', endTime: '18:00', totalHours: 8, isNightShift: false, isFlexible: false, departments: ['Administration', 'Accounts', 'HR'] },
    { code: 'WKD', name: 'Weekend Shift', shiftType: 'WEEKEND', startTime: '09:00', endTime: '14:00', totalHours: 5, isNightShift: false, isFlexible: false, departments: ['Teaching'] },
    { code: 'FLX', name: 'Flexible Shift', shiftType: 'FLEXIBLE', startTime: '09:00', endTime: '18:00', totalHours: 8, isNightShift: false, isFlexible: true, departments: ['IT', 'Administration'] },
    { code: 'EXM', name: 'Exam Duty Shift', shiftType: 'EXAM_DUTY', startTime: '08:00', endTime: '17:00', totalHours: 9, isNightShift: false, isFlexible: false, departments: ['Teaching'] },
    { code: 'EVT', name: 'Event Shift', shiftType: 'EVENT', startTime: '10:00', endTime: '22:00', totalHours: 12, isNightShift: false, isFlexible: false, departments: ['Teaching', 'Sports'] },
  ];

  for (const s of defaults) {
    await prisma.hrShift.create({
      data: {
        institutionId,
        code: s.code,
        name: s.name,
        shiftType: s.shiftType,
        startTime: s.startTime,
        endTime: s.endTime,
        totalHours: s.totalHours,
        breakMinutes: 60,
        graceMinutes: 15,
        applicableDepartments: s.departments as Prisma.InputJsonValue,
        weeklyOff: ['Sunday'] as Prisma.InputJsonValue,
        isNightShift: s.isNightShift,
        isFlexible: s.isFlexible,
        breakStart: '13:00',
        breakEnd: '13:45',
      },
    });
  }
  return prisma.hrShift.findMany({ where: { institutionId }, orderBy: { code: 'asc' } });
}

function weekStartDate(d = new Date()) {
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() + diff);
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

export async function getShiftManagementDashboard(institutionId: string) {
  const shifts = await ensureShiftsExtended(institutionId);
  await ensureWorkingHours(institutionId);
  const settings = await ensureModuleSettings(institutionId);

  const [
    workingHours,
    deptMappings,
    assignments,
    changeRequests,
    substitutes,
    overtime,
    duties,
    planner,
    employees,
    attendanceToday,
  ] = await Promise.all([
    prisma.hrInstitutionWorkingHours.findUnique({ where: { institutionId } }),
    prisma.hrDepartmentShiftMapping.findMany({
      where: { institutionId },
      include: { shift: { select: { code: true, name: true, shiftType: true } } },
    }),
    prisma.hrEmployeeShiftAssignment.findMany({
      where: { institutionId, status: 'ACTIVE' },
      include: {
        employee: { select: { employeeCode: true, fullName: true, department: true, designation: true, employmentType: true } },
        shift: { select: { code: true, name: true, shiftType: true, startTime: true, endTime: true } },
      },
      orderBy: { effectiveDate: 'desc' },
    }),
    prisma.hrShiftChangeRequest.findMany({
      where: { institutionId },
      include: { employee: { select: { employeeCode: true, fullName: true, department: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.hrShiftSubstitute.findMany({
      where: { institutionId },
      include: {
        absentEmployee: { select: { fullName: true, employeeCode: true } },
        substituteEmployee: { select: { fullName: true, employeeCode: true } },
      },
      orderBy: { dutyDate: 'desc' },
      take: 30,
    }),
    prisma.hrShiftOvertimeRecord.findMany({
      where: { institutionId },
      include: { employee: { select: { fullName: true, employeeCode: true, department: true } } },
      orderBy: { otDate: 'desc' },
      take: 30,
    }),
    prisma.hrShiftDutyAssignment.findMany({
      where: { institutionId },
      include: { employee: { select: { fullName: true, employeeCode: true, department: true } } },
      orderBy: { dutyDate: 'desc' },
      take: 50,
    }),
    prisma.hrWeeklyShiftPlanner.findMany({
      where: { institutionId, weekStart: weekStartDate() },
      include: { shift: { select: { code: true, name: true } } },
    }),
    prisma.payrollEmployee.findMany({
      where: { institutionId, status: FeeMasterStatus.ACTIVE },
      select: { id: true, employeeCode: true, fullName: true, department: true, designation: true, employmentType: true },
      orderBy: { fullName: 'asc' },
      take: 500,
    }),
    prisma.hrAttendanceDailyRecord.findMany({
      where: {
        institutionId,
        recordDate: new Date(new Date().toISOString().slice(0, 10)),
      },
      select: { status: true, shiftCode: true, lateMinutes: true, overtimeHours: true },
    }),
  ]);

  const shiftWise = {
    morning: assignments.filter((a) => a.shift.shiftType === 'MORNING' || a.shift.code === 'MOR').length,
    evening: assignments.filter((a) => a.shift.shiftType === 'EVENING').length,
    night: assignments.filter((a) => a.shift.shiftType === 'NIGHT').length,
    total: assignments.length,
  };

  const present = attendanceToday.filter((r) => r.status === 'PRESENT' || r.status === 'LATE').length;
  const late = attendanceToday.filter((r) => r.status === 'LATE' || r.lateMinutes > 0).length;
  const otHours = overtime.filter((o) => o.status === 'APPROVED').reduce((s, o) => s + o.hours, 0)
    + attendanceToday.reduce((s, r) => s + r.overtimeHours, 0);

  const kpis = {
    totalEmployees: employees.length,
    shiftWiseEmployees: shiftWise,
    lateArrivalPct: present > 0 ? Math.round((late / present) * 100) : 0,
    overtimeHours: Math.round(otHours * 10) / 10,
    holidayDuty: duties.filter((d) => d.dutyType === 'HOLIDAY').length,
    substituteClasses: substitutes.length,
    attendancePct: employees.length > 0 ? Math.round((present / employees.length) * 100) : 0,
    shiftUtilization: shifts.length > 0 ? Math.round((shiftWise.total / (employees.length || 1)) * 100) : 0,
    pendingChangeRequests: changeRequests.filter((r) => r.status === 'PENDING').length,
    pendingOvertime: overtime.filter((o) => o.status === 'PENDING').length,
  };

  const wh = workingHours!;
  return {
    kpis,
    workingHours: {
      academicYear: wh.academicYear,
      branch: wh.branch,
      institutionType: wh.institutionType,
      workingDays: parseJsonArray<string>(wh.workingDays),
      weeklyOff: parseJsonArray<string>(wh.weeklyOff),
      workingHoursStart: wh.workingHoursStart,
      workingHoursEnd: wh.workingHoursEnd,
      breakDuration: wh.breakDuration,
      prayerAssembly: wh.prayerAssembly,
      lunchBreak: wh.lunchBreak,
      teaBreak: wh.teaBreak,
      earlyClosing: wh.earlyClosing,
      halfDayRules: wh.halfDayRules,
    },
    shifts: shifts.map(serializeShift),
    shiftTypes: SHIFT_TYPES.map((v) => ({ value: v, label: SHIFT_TYPE_LABELS[v] })),
    departments: DEPARTMENTS,
    departmentMappings: deptMappings.map((m) => ({
      id: m.id,
      department: m.department,
      branch: m.branch,
      status: m.status,
      shiftId: m.shiftId,
      shiftCode: m.shift.code,
      shiftName: m.shift.name,
      shiftType: m.shift.shiftType,
    })),
    assignments: assignments.map((a) => ({
      id: a.id,
      employeeId: a.employeeId,
      employeeCode: a.employee.employeeCode,
      employeeName: a.employee.fullName,
      department: a.employee.department,
      designation: a.employee.designation,
      employmentType: a.employmentType || a.employee.employmentType,
      shiftId: a.shiftId,
      shiftCode: a.shift.code,
      shiftName: a.shift.name,
      shiftType: a.shift.shiftType,
      startTime: a.shift.startTime,
      endTime: a.shift.endTime,
      effectiveDate: a.effectiveDate.toISOString().slice(0, 10),
      workingDays: parseJsonArray<string>(a.workingDays),
      weeklyOff: parseJsonArray<string>(a.weeklyOff),
      attendanceRule: a.attendanceRule,
      payrollRule: a.payrollRule,
      remarks: a.remarks,
      branch: a.branch,
      status: a.status,
    })),
    changeRequests: changeRequests.map((r) => ({
      id: r.id,
      employeeId: r.employeeId,
      employeeName: r.employee.fullName,
      employeeCode: r.employee.employeeCode,
      department: r.employee.department,
      currentShiftCode: r.currentShiftCode,
      requestedShiftId: r.requestedShiftId,
      reasonCategory: r.reasonCategory,
      reason: r.reason,
      effectiveDate: r.effectiveDate.toISOString().slice(0, 10),
      status: r.status,
      workflowLevel: r.workflowLevel,
    })),
    substitutes: substitutes.map((s) => ({
      id: s.id,
      absentEmployeeName: s.absentEmployee.fullName,
      absentEmployeeCode: s.absentEmployee.employeeCode,
      substituteEmployeeName: s.substituteEmployee.fullName,
      substituteEmployeeCode: s.substituteEmployee.employeeCode,
      dutyDate: s.dutyDate.toISOString().slice(0, 10),
      shiftCode: s.shiftCode,
      classInfo: s.classInfo,
      subject: s.subject,
      status: s.status,
    })),
    overtime: overtime.map((o) => ({
      id: o.id,
      employeeName: o.employee.fullName,
      employeeCode: o.employee.employeeCode,
      department: o.employee.department,
      otDate: o.otDate.toISOString().slice(0, 10),
      hours: o.hours,
      otType: o.otType,
      reason: o.reason,
      status: o.status,
    })),
    duties: duties.map((d) => ({
      id: d.id,
      dutyType: d.dutyType,
      employeeName: d.employee.fullName,
      employeeCode: d.employee.employeeCode,
      department: d.employee.department,
      shiftCode: d.shiftCode,
      dutyDate: d.dutyDate.toISOString().slice(0, 10),
      reportingTime: d.reportingTime,
      completionTime: d.completionTime,
      compensation: d.compensation,
      location: d.location,
      gpsEnabled: d.gpsEnabled,
      status: d.status,
      details: d.details,
    })),
    planner: {
      weekStart: weekStartDate().toISOString().slice(0, 10),
      days: DAYS,
      timeSlots: [...TIME_SLOTS],
      entries: planner.map((p) => ({
        id: p.id,
        dayOfWeek: p.dayOfWeek,
        timeSlot: p.timeSlot,
        shiftId: p.shiftId,
        shiftCode: p.shift?.code ?? '',
        shiftName: p.shift?.name ?? p.label,
        department: p.department,
        entryType: p.entryType,
        colorCode: p.colorCode,
        label: p.label,
      })),
      colorLegend: [
        { code: 'green', label: 'Working' },
        { code: 'blue', label: 'Holiday' },
        { code: 'orange', label: 'Overtime' },
        { code: 'red', label: 'Absent' },
        { code: 'grey', label: 'Weekly Off' },
      ],
    },
    timetable: {
      syncEnabled: settings.timetableSyncEnabled,
      integrations: ['Subject Allocation', 'Class Timetable', 'Lecture Timing', 'Practical/Lab', 'Sports', 'Exam Schedule', 'Coaching Batch'],
      lastSync: new Date().toISOString(),
      autoUpdate: true,
    },
    settings: {
      rotationEnabled: settings.rotationEnabled,
      flexibleShiftEnabled: settings.flexibleShiftEnabled,
      gpsAttendanceEnabled: settings.gpsAttendanceEnabled,
      timetableSyncEnabled: settings.timetableSyncEnabled,
      maxWeeklyHours: settings.maxWeeklyHours,
      minRestBetweenShifts: settings.minRestBetweenShifts,
      overtimeLimitHours: settings.overtimeLimitHours,
      notificationChannels: parseJsonArray<string>(settings.notificationChannels),
      attendanceRules: settings.attendanceRules,
      flexiblePolicies: settings.flexiblePolicies,
      rotationTemplates: settings.rotationTemplates,
      dutyMasters: settings.dutyMasters,
      allowanceMasters: settings.allowanceMasters,
    },
    employees,
    workflows: {
      shiftChange: ['Employee', 'Reporting Manager', 'HR', 'Approved'],
      substitute: ['Absent Teacher', 'Principal', 'Available List', 'Assign', 'Notify', 'Update Attendance & Payroll'],
      overtime: ['Employee', 'Manager', 'HR', 'Payroll'],
      flexible: ['Employee', 'Manager', 'HR', 'Approved'],
    },
    roles: [
      { role: 'Super Admin', responsibilities: 'Configure shifts, rules, institution-wide settings' },
      { role: 'HR Administrator', responsibilities: 'Create shifts, assign employees, approve changes' },
      { role: 'Principal/Director', responsibilities: 'Approve policy exceptions, monitor compliance' },
      { role: 'Department Head', responsibilities: 'Allocate shifts, approve substitutions and overtime' },
      { role: 'Reporting Manager', responsibilities: 'Approve shift changes, monitor attendance' },
      { role: 'Payroll Executive', responsibilities: 'Review shift-based earnings and deductions' },
    ],
  };
}

export async function createHrShift(institutionId: string, data: Record<string, unknown>) {
  const code = String(data.code || '').trim() || `SHF${Date.now().toString().slice(-4)}`;
  const row = await prisma.hrShift.create({
    data: {
      institutionId,
      code,
      name: String(data.name || 'New Shift'),
      shiftType: String(data.shiftType || 'REGULAR'),
      description: String(data.description || ''),
      startTime: String(data.startTime || '09:00'),
      endTime: String(data.endTime || '17:00'),
      breakStart: String(data.breakStart || ''),
      breakEnd: String(data.breakEnd || ''),
      breakMinutes: Number(data.breakMinutes) || 60,
      totalHours: Number(data.totalHours) || 8,
      graceMinutes: Number(data.graceMinutes) || 15,
      lateMarkRule: String(data.lateMarkRule || ''),
      earlyExitRule: String(data.earlyExitRule || ''),
      overtimeEligible: data.overtimeEligible !== false,
      halfDayRule: String(data.halfDayRule || ''),
      attendanceRule: String(data.attendanceRule || ''),
      payrollRule: String(data.payrollRule || ''),
      applicableDepartments: (data.applicableDepartments ?? []) as Prisma.InputJsonValue,
      weeklyOff: (data.weeklyOff ?? ['Sunday']) as Prisma.InputJsonValue,
      isNightShift: Boolean(data.isNightShift),
      isFlexible: Boolean(data.isFlexible),
      status: String(data.status || 'ACTIVE'),
    },
  });
  return serializeShift(row);
}

export async function updateHrShift(institutionId: string, id: string, data: Record<string, unknown>) {
  const existing = await prisma.hrShift.findFirst({ where: { institutionId, id } });
  if (!existing) throw new Error('Shift not found');
  const row = await prisma.hrShift.update({
    where: { id },
    data: {
      name: data.name !== undefined ? String(data.name) : existing.name,
      shiftType: data.shiftType !== undefined ? String(data.shiftType) : existing.shiftType,
      description: data.description !== undefined ? String(data.description) : existing.description,
      startTime: data.startTime !== undefined ? String(data.startTime) : existing.startTime,
      endTime: data.endTime !== undefined ? String(data.endTime) : existing.endTime,
      breakStart: data.breakStart !== undefined ? String(data.breakStart) : existing.breakStart,
      breakEnd: data.breakEnd !== undefined ? String(data.breakEnd) : existing.breakEnd,
      breakMinutes: data.breakMinutes !== undefined ? Number(data.breakMinutes) : existing.breakMinutes,
      totalHours: data.totalHours !== undefined ? Number(data.totalHours) : existing.totalHours,
      graceMinutes: data.graceMinutes !== undefined ? Number(data.graceMinutes) : existing.graceMinutes,
      lateMarkRule: data.lateMarkRule !== undefined ? String(data.lateMarkRule) : existing.lateMarkRule,
      earlyExitRule: data.earlyExitRule !== undefined ? String(data.earlyExitRule) : existing.earlyExitRule,
      overtimeEligible: data.overtimeEligible !== undefined ? Boolean(data.overtimeEligible) : existing.overtimeEligible,
      halfDayRule: data.halfDayRule !== undefined ? String(data.halfDayRule) : existing.halfDayRule,
      attendanceRule: data.attendanceRule !== undefined ? String(data.attendanceRule) : existing.attendanceRule,
      payrollRule: data.payrollRule !== undefined ? String(data.payrollRule) : existing.payrollRule,
      applicableDepartments:
        data.applicableDepartments !== undefined
          ? (data.applicableDepartments as Prisma.InputJsonValue)
          : (existing.applicableDepartments as Prisma.InputJsonValue),
      weeklyOff:
        data.weeklyOff !== undefined
          ? (data.weeklyOff as Prisma.InputJsonValue)
          : (existing.weeklyOff as Prisma.InputJsonValue),
      isNightShift: data.isNightShift !== undefined ? Boolean(data.isNightShift) : existing.isNightShift,
      isFlexible: data.isFlexible !== undefined ? Boolean(data.isFlexible) : existing.isFlexible,
      status: data.status !== undefined ? String(data.status) : existing.status,
    },
  });
  return serializeShift(row);
}

export async function updateInstitutionWorkingHours(institutionId: string, data: Record<string, unknown>) {
  await ensureWorkingHours(institutionId);
  const row = await prisma.hrInstitutionWorkingHours.update({
    where: { institutionId },
    data: {
      academicYear: data.academicYear as string | undefined,
      branch: data.branch as string | undefined,
      institutionType: data.institutionType as string | undefined,
      workingDays: data.workingDays as Prisma.InputJsonValue | undefined,
      weeklyOff: data.weeklyOff as Prisma.InputJsonValue | undefined,
      workingHoursStart: data.workingHoursStart as string | undefined,
      workingHoursEnd: data.workingHoursEnd as string | undefined,
      breakDuration: data.breakDuration as number | undefined,
      prayerAssembly: data.prayerAssembly as string | undefined,
      lunchBreak: data.lunchBreak as string | undefined,
      teaBreak: data.teaBreak as string | undefined,
      earlyClosing: data.earlyClosing as string | undefined,
      halfDayRules: data.halfDayRules as string | undefined,
    },
  });
  return row;
}

export async function assignEmployeeShift(institutionId: string, data: {
  employeeId: string; shiftId: string; effectiveDate: string;
  employmentType?: string; branch?: string; workingDays?: string[];
  weeklyOff?: string[]; attendanceRule?: string; payrollRule?: string; remarks?: string;
}) {
  await prisma.hrEmployeeShiftAssignment.updateMany({
    where: { institutionId, employeeId: data.employeeId, status: 'ACTIVE' },
    data: { status: 'INACTIVE' },
  });
  const row = await prisma.hrEmployeeShiftAssignment.create({
    data: {
      institutionId,
      employeeId: data.employeeId,
      shiftId: data.shiftId,
      effectiveDate: new Date(data.effectiveDate),
      employmentType: data.employmentType ?? 'PERMANENT',
      branch: data.branch ?? 'Main Branch',
      workingDays: (data.workingDays ?? []) as Prisma.InputJsonValue,
      weeklyOff: (data.weeklyOff ?? ['Sunday']) as Prisma.InputJsonValue,
      attendanceRule: data.attendanceRule ?? '',
      payrollRule: data.payrollRule ?? '',
      remarks: data.remarks ?? '',
      status: 'ACTIVE',
    },
    include: {
      employee: { select: { employeeCode: true, fullName: true, department: true } },
      shift: { select: { code: true, name: true } },
    },
  });
  return row;
}

export async function mapDepartmentShift(institutionId: string, data: { department: string; shiftId: string; branch?: string }) {
  const existing = await prisma.hrDepartmentShiftMapping.findFirst({
    where: { institutionId, department: data.department, branch: data.branch ?? 'Main Branch' },
  });
  if (existing) {
    return prisma.hrDepartmentShiftMapping.update({
      where: { id: existing.id },
      data: { shiftId: data.shiftId, status: 'ACTIVE' },
      include: { shift: { select: { code: true, name: true } } },
    });
  }
  return prisma.hrDepartmentShiftMapping.create({
    data: {
      institutionId,
      department: data.department,
      shiftId: data.shiftId,
      branch: data.branch ?? 'Main Branch',
    },
    include: { shift: { select: { code: true, name: true } } },
  });
}

export async function createShiftChangeRequest(institutionId: string, data: {
  employeeId: string; requestedShiftId: string; currentShiftCode?: string;
  reasonCategory?: string; reason?: string; effectiveDate: string;
}) {
  return prisma.hrShiftChangeRequest.create({
    data: {
      institutionId,
      employeeId: data.employeeId,
      requestedShiftId: data.requestedShiftId,
      currentShiftCode: data.currentShiftCode ?? '',
      reasonCategory: data.reasonCategory ?? 'Personal',
      reason: data.reason ?? '',
      effectiveDate: new Date(data.effectiveDate),
      status: 'PENDING',
    },
    include: { employee: { select: { fullName: true, employeeCode: true } } },
  });
}

export async function advanceShiftChangeRequest(
  institutionId: string,
  id: string,
  action: 'approve' | 'reject',
  approvedBy?: string,
) {
  const row = await prisma.hrShiftChangeRequest.findFirst({ where: { institutionId, id } });
  if (!row) throw new Error('Request not found');
  const status = action === 'approve' ? 'APPROVED' : 'REJECTED';
  const updated = await prisma.hrShiftChangeRequest.update({
    where: { id },
    data: { status, approvedBy: approvedBy ?? 'HR Manager', workflowLevel: 'HR' },
  });
  if (action === 'approve' && row.requestedShiftId) {
    await assignEmployeeShift(institutionId, {
      employeeId: row.employeeId,
      shiftId: row.requestedShiftId,
      effectiveDate: row.effectiveDate.toISOString().slice(0, 10),
    });
  }
  return updated;
}

export async function assignSubstitute(institutionId: string, data: {
  absentEmployeeId: string; substituteEmployeeId: string; dutyDate: string;
  shiftCode?: string; classInfo?: string; subject?: string;
}) {
  return prisma.hrShiftSubstitute.create({
    data: {
      institutionId,
      absentEmployeeId: data.absentEmployeeId,
      substituteEmployeeId: data.substituteEmployeeId,
      dutyDate: new Date(data.dutyDate),
      shiftCode: data.shiftCode ?? '',
      classInfo: data.classInfo ?? '',
      subject: data.subject ?? '',
      status: 'ASSIGNED',
      notifiedAt: new Date(),
    },
  });
}

export async function createOvertimeRecord(institutionId: string, data: {
  employeeId: string; otDate: string; hours: number; otType?: string; reason?: string;
}) {
  return prisma.hrShiftOvertimeRecord.create({
    data: {
      institutionId,
      employeeId: data.employeeId,
      otDate: new Date(data.otDate),
      hours: data.hours,
      otType: data.otType ?? 'EXTRA_HOURS',
      reason: data.reason ?? '',
      status: 'PENDING',
    },
  });
}

export async function advanceOvertimeWorkflow(institutionId: string, id: string, action: 'approve' | 'reject', approvedBy?: string) {
  const row = await prisma.hrShiftOvertimeRecord.findFirst({ where: { institutionId, id } });
  if (!row) throw new Error('Overtime record not found');
  return prisma.hrShiftOvertimeRecord.update({
    where: { id },
    data: {
      status: action === 'approve' ? 'APPROVED' : 'REJECTED',
      approvedBy: approvedBy ?? 'HR Manager',
    },
  });
}

export async function assignDuty(institutionId: string, data: {
  dutyType: string; employeeId: string; dutyDate: string;
  shiftCode?: string; reportingTime?: string; completionTime?: string;
  compensation?: string; location?: string; gpsEnabled?: boolean; details?: Record<string, unknown>;
}) {
  return prisma.hrShiftDutyAssignment.create({
    data: {
      institutionId,
      dutyType: data.dutyType,
      employeeId: data.employeeId,
      dutyDate: new Date(data.dutyDate),
      shiftCode: data.shiftCode ?? '',
      reportingTime: data.reportingTime ?? '',
      completionTime: data.completionTime ?? '',
      compensation: data.compensation ?? 'OT',
      location: data.location ?? '',
      gpsEnabled: data.gpsEnabled ?? false,
      details: (data.details ?? {}) as Prisma.InputJsonValue,
    },
  });
}

export async function updateShiftModuleSettings(institutionId: string, data: Record<string, unknown>) {
  await ensureModuleSettings(institutionId);
  return prisma.hrShiftModuleSettings.update({
    where: { institutionId },
    data: {
      rotationEnabled: data.rotationEnabled as boolean | undefined,
      flexibleShiftEnabled: data.flexibleShiftEnabled as boolean | undefined,
      gpsAttendanceEnabled: data.gpsAttendanceEnabled as boolean | undefined,
      timetableSyncEnabled: data.timetableSyncEnabled as boolean | undefined,
      maxWeeklyHours: data.maxWeeklyHours as number | undefined,
      minRestBetweenShifts: data.minRestBetweenShifts as number | undefined,
      overtimeLimitHours: data.overtimeLimitHours as number | undefined,
      notificationChannels: data.notificationChannels as Prisma.InputJsonValue | undefined,
      attendanceRules: data.attendanceRules as Prisma.InputJsonValue | undefined,
      flexiblePolicies: data.flexiblePolicies as Prisma.InputJsonValue | undefined,
      rotationTemplates: data.rotationTemplates as Prisma.InputJsonValue | undefined,
    },
  });
}

async function ensurePlannerGrid(institutionId: string, shifts: { id: string; code: string; name: string; shiftType: string }[]) {
  const ws = weekStartDate();
  const existing = await prisma.hrWeeklyShiftPlanner.count({ where: { institutionId, weekStart: ws } });
  if (existing > 0) return;

  const slotShiftMap: Record<string, string> = {
    Morning: 'MORNING',
    Afternoon: 'REGULAR',
    Evening: 'EVENING',
    Night: 'NIGHT',
  };

  for (const day of DAYS) {
    for (const slot of ['Morning', 'Afternoon', 'Evening', 'Night'] as const) {
      const isWeekend = day === 'Sunday';
      const shift = shifts.find((s) => s.shiftType === slotShiftMap[slot]);
      await prisma.hrWeeklyShiftPlanner.create({
        data: {
          institutionId,
          weekStart: ws,
          dayOfWeek: day,
          timeSlot: slot,
          shiftId: isWeekend ? null : shift?.id ?? null,
          department: 'Teaching',
          entryType: isWeekend ? 'WEEKLY_OFF' : 'WORKING',
          colorCode: isWeekend ? 'grey' : 'green',
          label: isWeekend ? 'Weekly Off' : shift?.name ?? slot,
        },
      });
    }
  }
}

export async function seedShiftManagementDemo(institutionId: string) {
  await seedHrAttendanceLeaveDemo(institutionId);
  const shifts = await ensureShiftsExtended(institutionId);
  await ensureWorkingHours(institutionId);
  await ensureModuleSettings(institutionId);
  await ensurePlannerGrid(institutionId, shifts);

  const employees = await prisma.payrollEmployee.findMany({
    where: { institutionId, status: FeeMasterStatus.ACTIVE },
    take: 20,
  });

  for (const dept of DEPARTMENTS.slice(0, 8)) {
    const shift = shifts.find((s) => parseJsonArray<string>(s.applicableDepartments).includes(dept)) ?? shifts[0];
    await mapDepartmentShift(institutionId, { department: dept, shiftId: shift.id });
  }

  const existingAssign = await prisma.hrEmployeeShiftAssignment.count({ where: { institutionId } });
  if (existingAssign === 0) {
    for (let i = 0; i < employees.length; i++) {
      const shift = shifts[i % shifts.length];
      await assignEmployeeShift(institutionId, {
        employeeId: employees[i].id,
        shiftId: shift.id,
        effectiveDate: '2025-04-01',
        employmentType: employees[i].employmentType,
      });
    }
  }

  if ((await prisma.hrShiftChangeRequest.count({ where: { institutionId } })) === 0 && employees.length >= 2) {
    await createShiftChangeRequest(institutionId, {
      employeeId: employees[0].id,
      requestedShiftId: shifts[1].id,
      currentShiftCode: shifts[0].code,
      reasonCategory: 'Medical',
      reason: 'Medical appointment',
      effectiveDate: new Date().toISOString().slice(0, 10),
    });
  }

  if ((await prisma.hrShiftSubstitute.count({ where: { institutionId } })) === 0 && employees.length >= 3) {
    await assignSubstitute(institutionId, {
      absentEmployeeId: employees[0].id,
      substituteEmployeeId: employees[2].id,
      dutyDate: new Date().toISOString().slice(0, 10),
      shiftCode: 'REG',
      classInfo: 'Class 10-A',
      subject: 'Mathematics',
    });
  }

  if ((await prisma.hrShiftOvertimeRecord.count({ where: { institutionId } })) === 0) {
    await createOvertimeRecord(institutionId, {
      employeeId: employees[0]?.id ?? '',
      otDate: new Date().toISOString().slice(0, 10),
      hours: 2,
      otType: 'EXTRA_CLASSES',
      reason: 'Extra coaching class',
    });
  }

  for (const dutyType of ['WEEKEND', 'HOLIDAY', 'EXAM', 'EVENT', 'GPS']) {
    if (employees[0]) {
      await assignDuty(institutionId, {
        dutyType,
        employeeId: employees[0].id,
        dutyDate: new Date().toISOString().slice(0, 10),
        shiftCode: dutyType === 'EXAM' ? 'EXM' : 'REG',
        reportingTime: '08:00',
        completionTime: '17:00',
        compensation: dutyType === 'WEEKEND' ? 'Comp Off' : 'OT',
        gpsEnabled: dutyType === 'GPS',
        location: dutyType === 'GPS' ? 'Admission Campus' : '',
      });
    }
  }

  return getShiftManagementDashboard(institutionId);
}
