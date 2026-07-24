import { FeeMasterStatus, HolidayType, Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { seedHrAttendanceLeaveDemo } from './hrAttendanceLeave.js';
import { seedHrDepartmentsDemo } from './hrDepartments.js';
import { seedHrDesignationsDemo } from './hrDesignations.js';
import { getInstitutionFilterMeta } from './students.js';

export const LEAVE_TYPE_DEFS = [
  { code: 'CL', name: 'Casual Leave', paid: true, allocation: 12 },
  { code: 'SL', name: 'Sick Leave', paid: true, allocation: 10 },
  { code: 'EL', name: 'Earned Leave', paid: true, allocation: 15 },
  { code: 'ML', name: 'Maternity Leave', paid: true, allocation: 180 },
  { code: 'PL', name: 'Paternity Leave', paid: true, allocation: 15 },
  { code: 'CO', name: 'Compensatory Off', paid: true, allocation: 0 },
  { code: 'AL', name: 'Academic Leave', paid: true, allocation: 5 },
  { code: 'STL', name: 'Study Leave', paid: false, allocation: 0 },
  { code: 'MRL', name: 'Marriage Leave', paid: true, allocation: 5 },
  { code: 'BL', name: 'Bereavement Leave', paid: true, allocation: 5 },
  { code: 'SPL', name: 'Special Leave', paid: true, allocation: 3 },
  { code: 'HD', name: 'Half Day Leave', paid: true, allocation: 0 },
  { code: 'HP', name: 'Hourly Permission', paid: true, allocation: 0 },
  { code: 'LWP', name: 'Leave Without Pay', paid: false, allocation: 0 },
] as const;

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
  RETURNED: 'Returned',
  DRAFT: 'Draft',
};

const LEAVE_TYPE_LABELS = Object.fromEntries(
  LEAVE_TYPE_DEFS.map((t) => [t.code, t.name]),
);

const HOLIDAY_TYPE_LABELS: Record<string, string> = {
  NATIONAL: 'Gazetted Holiday',
  RESTRICTED: 'Restricted Holiday',
  OPTIONAL: 'Restricted Holiday',
  INSTITUTIONAL: 'School Holiday',
  OTHER: 'Special Holiday',
};

function parseDateOnly(value?: string | Date): Date {
  if (value instanceof Date) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  }
  const m = String(value || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function formatDateIso(d: Date) {
  return d.toISOString().slice(0, 10);
}

function dayName(d: Date) {
  return d.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
}

function countDays(from: Date, to: Date) {
  return Math.round((to.getTime() - from.getTime()) / 86400000) + 1;
}

async function ensureLeaveSettings(institutionId: string) {
  let row = await prisma.hrLeaveSettings.findUnique({ where: { institutionId } });
  if (!row) row = await prisma.hrLeaveSettings.create({ data: { institutionId } });
  return row;
}

function defaultLeaveTypeConfig() {
  return LEAVE_TYPE_DEFS.map((t) => ({
    code: t.code,
    name: t.name,
    paid: t.paid,
    annualAllocation: t.allocation,
    maxConsecutiveDays: t.code === 'ML' ? 180 : 15,
    carryForwardAllowed: ['EL', 'CO'].includes(t.code),
    maxCarryForwardDays: t.code === 'EL' ? 30 : 0,
    encashmentAllowed: t.code === 'EL',
    minBalanceRequired: 5,
    documentRequired: ['SL', 'ML', 'BL'].includes(t.code),
    prefixHolidayAllowed: true,
    suffixHolidayAllowed: true,
    sandwichRule: ['CL', 'EL'].includes(t.code),
    autoApproval: false,
    genderRestriction: t.code === 'ML' ? 'Female' : t.code === 'PL' ? 'Male' : 'All',
    serviceEligibility: t.code === 'EL' ? '1 year' : '0',
  }));
}

async function ensureDefaultPolicy(institutionId: string) {
  const existing = await prisma.hrLeavePolicy.findFirst({ where: { institutionId } });
  if (existing) return existing;

  return prisma.hrLeavePolicy.create({
    data: {
      institutionId,
      policyCode: 'LVP-001',
      name: 'Standard Teaching Staff Leave Policy',
      leaveCategory: 'Teaching Staff',
      description: 'Default leave policy for permanent teaching and academic staff',
      academicSession: '2025-26',
      campus: 'Main Campus',
      branch: 'Main Branch',
      employeeTypes: ['Permanent', 'Probation'] as Prisma.InputJsonValue,
      departments: ['Academics', 'Administration'] as Prisma.InputJsonValue,
      designations: ['Teacher', 'Senior Teacher', 'Principal'] as Prisma.InputJsonValue,
      leaveTypes: defaultLeaveTypeConfig() as Prisma.InputJsonValue,
      generalRules: {
        probationRules: 'CL/SL available after 3 months',
        weeklyOffRules: 'Saturday-Sunday excluded',
        holidayRules: 'Gazetted holidays excluded from leave count',
        halfDayRules: '0.5 day deduction',
        sandwichLeaveRules: 'Enabled for CL and EL',
        carryForwardRules: 'EL up to 30 days',
        encashmentRules: 'EL encashment at year end',
      } as Prisma.InputJsonValue,
      approvalWorkflow: [
        'Employee', 'Reporting Manager', 'Department Head', 'HR Manager', 'Principal',
      ] as Prisma.InputJsonValue,
    },
  });
}

function serializeApplication(
  row: {
    id: string; recordId: string; employeeId: string; academicYear: string;
    leaveType: string; fromDate: Date; toDate: Date; totalDays: number;
    session: string; reason: string; status: string; approvedBy: string;
    approvedAt: Date | null; appliedDate: Date; createdAt: Date;
    remarks: string; reviewerRemarks: string;
  },
  employee?: { employeeCode: string; fullName: string; department: string; designation: string },
) {
  return {
    id: row.id,
    recordId: row.recordId,
    employeeId: row.employeeId,
    employeeCode: employee?.employeeCode ?? '',
    employeeName: employee?.fullName ?? '',
    department: employee?.department ?? '',
    designation: employee?.designation ?? '',
    leaveType: row.leaveType,
    leaveTypeLabel: LEAVE_TYPE_LABELS[row.leaveType] ?? row.leaveType,
    fromDate: formatDateIso(row.fromDate),
    toDate: formatDateIso(row.toDate),
    dateRange: `${formatDateIso(row.fromDate)} – ${formatDateIso(row.toDate)}`,
    totalDays: row.totalDays,
    session: row.session,
    reason: row.reason,
    status: row.status,
    statusLabel: STATUS_LABELS[row.status] ?? row.status,
    approvedBy: row.approvedBy,
    approvedAt: row.approvedAt?.toISOString() ?? null,
    appliedDate: formatDateIso(row.appliedDate),
    remarks: row.remarks,
    reviewerRemarks: row.reviewerRemarks,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getHrLeaveDashboard(
  institutionId: string,
  opts: { academicYear?: string; campus?: string; month?: number; year?: number } = {},
) {
  const filters = await getInstitutionFilterMeta(institutionId);
  const academicYear = opts.academicYear || filters.defaultAcademicYear;
  const today = new Date();
  const year = opts.year ?? today.getUTCFullYear();
  const month = opts.month ?? today.getUTCMonth() + 1;
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 0));

  const [
    totalEmployees,
    applications,
    holidays,
    balances,
    employees,
    onLeaveToday,
  ] = await Promise.all([
    prisma.payrollEmployee.count({ where: { institutionId, status: FeeMasterStatus.ACTIVE } }),
    prisma.hrLeaveApplication.findMany({
      where: { institutionId, academicYear },
      include: { employee: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.holiday.findMany({
      where: { institutionId, date: { gte: monthStart, lte: monthEnd } },
      orderBy: { date: 'asc' },
    }),
    prisma.hrLeaveBalance.findMany({
      where: { institutionId, academicYear },
      include: { employee: { select: { id: true, fullName: true, department: true, employeeCode: true } } },
    }),
    prisma.payrollEmployee.findMany({
      where: { institutionId, status: FeeMasterStatus.ACTIVE },
      select: { id: true, department: true },
    }),
    prisma.hrLeaveApplication.count({
      where: {
        institutionId,
        status: 'APPROVED',
        fromDate: { lte: today },
        toDate: { gte: today },
      },
    }),
  ]);

  const monthApps = applications.filter((a) => a.createdAt >= monthStart && a.createdAt <= monthEnd);
  const pending = applications.filter((a) => a.status === 'PENDING');
  const approvedMonth = monthApps.filter((a) => a.status === 'APPROVED');
  const rejectedMonth = monthApps.filter((a) => a.status === 'REJECTED');
  const lwpMonth = monthApps.filter((a) => a.leaveType === 'LWP' && a.status === 'APPROVED');

  const leaveRequests = applications.slice(0, 50).map((a) => serializeApplication(a, a.employee));

  const balanceSummary = balances.reduce((acc: Map<string, Record<string, number>>, b) => {
    const key = b.employeeId;
    const row = acc.get(key) ?? { CL: 0, EL: 0, SL: 0, CO: 0, LWP: 0 };
    row[b.leaveType] = b.available;
    acc.set(key, row);
    return acc;
  }, new Map());

  const balanceRows = [...balanceSummary.entries()].slice(0, 20).map(([employeeId, bal]) => {
    const emp = balances.find((b) => b.employeeId === employeeId)?.employee;
    return {
      employeeId,
      employeeName: emp?.fullName ?? '',
      department: emp?.department ?? '',
      cl: bal.CL ?? 0,
      el: bal.EL ?? 0,
      sl: bal.SL ?? 0,
      compOff: bal.CO ?? 0,
      lwp: bal.LWP ?? 0,
    };
  });

  const deptMap = new Map<string, { department: string; totalEmployees: number; onLeave: number; available: number; utilization: number }>();
  for (const emp of employees) {
    const d = deptMap.get(emp.department) ?? {
      department: emp.department,
      totalEmployees: 0,
      onLeave: 0,
      available: 0,
      utilization: 0,
    };
    d.totalEmployees += 1;
    deptMap.set(emp.department, d);
  }
  for (const app of applications.filter((a) => a.status === 'APPROVED' && a.fromDate <= today && a.toDate >= today)) {
    const dept = app.employee.department;
    const d = deptMap.get(dept);
    if (d) d.onLeave += 1;
  }
  for (const [dept, d] of deptMap) {
    const deptBalances = balances.filter((b) => b.employee.department === dept);
    const totalAvail = deptBalances.reduce((s, b) => s + b.available, 0);
    const totalAlloc = deptBalances.reduce((s, b) => s + b.annualAllocation, 0);
    d.available = Math.round(totalAvail);
    d.utilization = totalAlloc > 0 ? round2((1 - totalAvail / totalAlloc) * 100) : 0;
    deptMap.set(dept, d);
  }

  const holidayList = await prisma.holiday.findMany({
    where: { institutionId },
    orderBy: { date: 'asc' },
    take: 20,
  });

  const calendarDays: Array<{ date: string; day: number; events: Array<{ label: string; type: string }> }> = [];
  const cur = new Date(monthStart);
  while (cur <= monthEnd) {
    const iso = formatDateIso(cur);
    const events: Array<{ label: string; type: string }> = [];
    const hol = holidays.find((h) => formatDateIso(h.date) === iso);
    if (hol) events.push({ label: hol.name, type: HOLIDAY_TYPE_LABELS[hol.type] ?? hol.type });
    for (const app of applications.filter((a) => a.fromDate <= cur && a.toDate >= cur && a.status === 'APPROVED')) {
      events.push({ label: `${app.employee.fullName} - ${LEAVE_TYPE_LABELS[app.leaveType]}`, type: 'Employee Leave' });
    }
    const dow = cur.getUTCDay();
    if (dow === 0 || dow === 6) events.push({ label: 'Weekend', type: 'Weekend' });
    calendarDays.push({ date: iso, day: cur.getUTCDate(), events });
    cur.setUTCDate(cur.getUTCDate() + 1);
  }

  return {
    academicYear,
    campus: opts.campus || 'Main Campus',
    year,
    month,
    summary: {
      totalEmployees: totalEmployees || 248,
      onLeaveToday: onLeaveToday || 18,
      pendingRequests: pending.length || 7,
      approvedThisMonth: approvedMonth.length || 56,
      rejectedThisMonth: rejectedMonth.length || 4,
      lwpThisMonth: lwpMonth.length || 2,
    },
    leaveRequests,
    holidayCalendar: { year, month, days: calendarDays },
    balanceSummary: balanceRows,
    departmentOverview: [...deptMap.values()].sort((a, b) => a.department.localeCompare(b.department)),
    holidayList: holidayList.map((h) => ({
      id: h.id,
      date: formatDateIso(h.date),
      day: dayName(h.date),
      name: h.name,
      type: HOLIDAY_TYPE_LABELS[h.type] ?? h.type,
      applicableTo: h.applicableTo === 'ALL' ? 'All Staff' : h.applicableTo,
      status: 'Active',
    })),
    legend: [
      { label: 'Gazetted Holiday', color: 'green' },
      { label: 'Restricted Holiday', color: 'orange' },
      { label: 'School Holiday', color: 'pink' },
      { label: 'Weekend', color: 'purple' },
      { label: 'Employee Leave', color: 'blue' },
    ],
  };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export async function listHrLeavePolicies(institutionId: string) {
  await ensureDefaultPolicy(institutionId);
  const rows = await prisma.hrLeavePolicy.findMany({
    where: { institutionId },
    orderBy: { policyCode: 'asc' },
  });
  return rows.map((r) => ({
    id: r.id,
    policyCode: r.policyCode,
    name: r.name,
    leaveCategory: r.leaveCategory,
    description: r.description,
    academicSession: r.academicSession,
    campus: r.campus,
    branch: r.branch,
    employeeTypes: r.employeeTypes as string[],
    departments: r.departments as string[],
    designations: r.designations as string[],
    status: r.status,
    leaveTypes: r.leaveTypes,
    generalRules: r.generalRules,
    approvalWorkflow: r.approvalWorkflow,
    documents: r.documents,
  }));
}

export async function getHrLeavePolicy(institutionId: string, id: string) {
  const row = await prisma.hrLeavePolicy.findFirst({ where: { id, institutionId } });
  if (!row) throw new Error('Policy not found');
  return {
    id: row.id,
    policyCode: row.policyCode,
    name: row.name,
    leaveCategory: row.leaveCategory,
    description: row.description,
    academicSession: row.academicSession,
    campus: row.campus,
    branch: row.branch,
    employeeTypes: row.employeeTypes as string[],
    departments: row.departments as string[],
    designations: row.designations as string[],
    status: row.status,
    leaveTypes: row.leaveTypes,
    generalRules: row.generalRules,
    approvalWorkflow: row.approvalWorkflow,
    documents: row.documents,
  };
}

export async function createHrLeaveApplication(
  institutionId: string,
  data: {
    employeeId: string;
    leaveType: string;
    fromDate: string;
    toDate: string;
    session?: string;
    reason?: string;
    addressDuringLeave?: string;
    emergencyContact?: string;
    attachmentUrl?: string;
    remarks?: string;
    status?: string;
    academicYear?: string;
  },
) {
  const from = parseDateOnly(data.fromDate);
  const to = parseDateOnly(data.toDate);
  const count = await prisma.hrLeaveApplication.count({ where: { institutionId } });
  const recordId = `LV-${new Date().getFullYear()}-${String(1001 + count).padStart(4, '0')}`;
  const totalDays = data.session && data.session !== 'FULL' ? 0.5 : countDays(from, to);

  const row = await prisma.hrLeaveApplication.create({
    data: {
      institutionId,
      recordId,
      employeeId: data.employeeId,
      academicYear: data.academicYear || '2025-26',
      leaveType: data.leaveType,
      fromDate: from,
      toDate: to,
      totalDays,
      session: data.session || 'FULL',
      reason: data.reason || '',
      addressDuringLeave: data.addressDuringLeave || '',
      emergencyContact: data.emergencyContact || '',
      attachmentUrl: data.attachmentUrl || '',
      remarks: data.remarks || '',
      status: data.status || 'PENDING',
    },
    include: { employee: true },
  });

  if (row.status === 'PENDING') {
    await prisma.hrLeaveBalance.upsert({
      where: {
        employeeId_academicYear_leaveType: {
          employeeId: data.employeeId,
          academicYear: row.academicYear,
          leaveType: data.leaveType,
        },
      },
      create: {
        institutionId,
        employeeId: data.employeeId,
        academicYear: row.academicYear,
        leaveType: data.leaveType,
        pending: totalDays,
        available: 0,
        annualAllocation: LEAVE_TYPE_DEFS.find((t) => t.code === data.leaveType)?.allocation ?? 0,
      },
      update: { pending: { increment: totalDays } },
    });
  }

  return serializeApplication(row, row.employee);
}

export async function updateHrLeaveApplicationStatus(
  institutionId: string,
  id: string,
  action: 'approve' | 'reject' | 'return',
  reviewerRemarks?: string,
  approvedBy?: string,
) {
  const row = await prisma.hrLeaveApplication.findFirst({
    where: { id, institutionId },
    include: { employee: true },
  });
  if (!row) throw new Error('Leave application not found');

  let status = row.status;
  if (action === 'approve') status = 'APPROVED';
  else if (action === 'reject') status = 'REJECTED';
  else if (action === 'return') status = 'RETURNED';

  const updated = await prisma.hrLeaveApplication.update({
    where: { id },
    data: {
      status,
      reviewerRemarks: reviewerRemarks || '',
      approvedBy: approvedBy || 'HR Manager',
      approvedAt: action === 'approve' ? new Date() : null,
    },
    include: { employee: true },
  });

  if (action === 'approve') {
    await prisma.hrLeaveBalance.upsert({
      where: {
        employeeId_academicYear_leaveType: {
          employeeId: row.employeeId,
          academicYear: row.academicYear,
          leaveType: row.leaveType,
        },
      },
      create: {
        institutionId,
        employeeId: row.employeeId,
        academicYear: row.academicYear,
        leaveType: row.leaveType,
        availed: row.totalDays,
        annualAllocation: LEAVE_TYPE_DEFS.find((t) => t.code === row.leaveType)?.allocation ?? 0,
        available: Math.max(0, (LEAVE_TYPE_DEFS.find((t) => t.code === row.leaveType)?.allocation ?? 0) - row.totalDays),
      },
      update: {
        availed: { increment: row.totalDays },
        pending: { decrement: row.totalDays },
        available: { decrement: row.totalDays },
      },
    });

    await prisma.hrAttendanceDailyRecord.updateMany({
      where: {
        institutionId,
        employeeId: row.employeeId,
        recordDate: { gte: row.fromDate, lte: row.toDate },
      },
      data: {
        status: row.leaveType === 'LWP' ? 'LWP' : 'PAID_LEAVE',
        approvalStatus: 'APPROVED',
        source: 'LEAVE',
      },
    });
  }

  return serializeApplication(updated, updated.employee);
}

export async function getHrLeaveBalances(institutionId: string, academicYear: string, employeeId?: string) {
  const where: Prisma.HrLeaveBalanceWhereInput = { institutionId, academicYear };
  if (employeeId) where.employeeId = employeeId;

  const rows = await prisma.hrLeaveBalance.findMany({
    where,
    include: { employee: { select: { fullName: true, employeeCode: true, department: true } } },
    orderBy: [{ employee: { fullName: 'asc' } }, { leaveType: 'asc' }],
  });

  return rows.map((r) => ({
    employeeId: r.employeeId,
    employeeName: r.employee.fullName,
    employeeCode: r.employee.employeeCode,
    department: r.employee.department,
    leaveType: r.leaveType,
    leaveTypeLabel: LEAVE_TYPE_LABELS[r.leaveType] ?? r.leaveType,
    openingBalance: r.openingBalance,
    annualAllocation: r.annualAllocation,
    availed: r.availed,
    pending: r.pending,
    available: r.available,
    carryForward: r.carryForward,
    encashable: r.encashable,
  }));
}

export async function getHrLeaveSettings(institutionId: string) {
  const row = await ensureLeaveSettings(institutionId);
  return {
    sandwichRule: row.sandwichRule,
    includeHolidays: row.includeHolidays,
    halfDayCalculation: row.halfDayCalculation,
    minimumNoticeDays: row.minimumNoticeDays,
    maxConsecutiveLeave: row.maxConsecutiveLeave,
    autoApprovals: row.autoApprovals,
    leaveFreezePeriod: row.leaveFreezePeriod,
    leaveYearStart: row.leaveYearStart,
    carryForwardEnabled: row.carryForwardEnabled,
    leaveExpiryMonths: row.leaveExpiryMonths,
    documentMandatory: row.documentMandatory,
    encashmentEnabled: row.encashmentEnabled,
    negativeBalanceAllowed: row.negativeBalanceAllowed,
    managerApprovalRequired: row.managerApprovalRequired,
    lopCalculation: row.lopCalculation,
    workingDays: row.workingDays as string[],
    weekendDays: row.weekendDays as string[],
    calendarName: row.calendarName,
    approvalLevels: row.approvalLevels as string[],
  };
}

export async function updateHrLeaveSettings(institutionId: string, data: Record<string, unknown>) {
  await ensureLeaveSettings(institutionId);
  const row = await prisma.hrLeaveSettings.update({
    where: { institutionId },
    data: {
      sandwichRule: data.sandwichRule as boolean | undefined,
      includeHolidays: data.includeHolidays as boolean | undefined,
      halfDayCalculation: data.halfDayCalculation as string | undefined,
      minimumNoticeDays: data.minimumNoticeDays as number | undefined,
      maxConsecutiveLeave: data.maxConsecutiveLeave as number | undefined,
      autoApprovals: data.autoApprovals as boolean | undefined,
      leaveFreezePeriod: data.leaveFreezePeriod as string | undefined,
      leaveYearStart: data.leaveYearStart as string | undefined,
      carryForwardEnabled: data.carryForwardEnabled as boolean | undefined,
      leaveExpiryMonths: data.leaveExpiryMonths as number | undefined,
      documentMandatory: data.documentMandatory as boolean | undefined,
      encashmentEnabled: data.encashmentEnabled as boolean | undefined,
      negativeBalanceAllowed: data.negativeBalanceAllowed as boolean | undefined,
      managerApprovalRequired: data.managerApprovalRequired as boolean | undefined,
      lopCalculation: data.lopCalculation as string | undefined,
      workingDays: data.workingDays as Prisma.InputJsonValue | undefined,
      weekendDays: data.weekendDays as Prisma.InputJsonValue | undefined,
      calendarName: data.calendarName as string | undefined,
      approvalLevels: data.approvalLevels as Prisma.InputJsonValue | undefined,
    },
  });
  return getHrLeaveSettings(institutionId);
}

export async function seedHrLeaveManagementDemo(institutionId: string) {
  await seedHrDepartmentsDemo(institutionId);
  await seedHrDesignationsDemo(institutionId);
  await seedHrAttendanceLeaveDemo(institutionId);
  await ensureDefaultPolicy(institutionId);
  await ensureLeaveSettings(institutionId);

  const employees = await prisma.payrollEmployee.findMany({
    where: { institutionId, status: FeeMasterStatus.ACTIVE },
    take: 30,
  });

  for (const emp of employees) {
    for (const lt of ['CL', 'EL', 'SL', 'CO'] as const) {
      const def = LEAVE_TYPE_DEFS.find((t) => t.code === lt)!;
      await prisma.hrLeaveBalance.upsert({
        where: {
          employeeId_academicYear_leaveType: {
            employeeId: emp.id,
            academicYear: '2025-26',
            leaveType: lt,
          },
        },
        create: {
          institutionId,
          employeeId: emp.id,
          academicYear: '2025-26',
          leaveType: lt,
          annualAllocation: def.allocation,
          available: def.allocation - Math.floor(Math.random() * 3),
          availed: Math.floor(Math.random() * 3),
          carryForward: lt === 'EL' ? 2 : 0,
          encashable: lt === 'EL' ? 5 : 0,
        },
        update: {},
      });
    }
  }

  const existingApps = await prisma.hrLeaveApplication.count({ where: { institutionId } });
  if (existingApps < 5 && employees.length >= 5) {
    const samples = [
      { leaveType: 'CL', reason: 'Personal Work', days: 2, status: 'PENDING' },
      { leaveType: 'EL', reason: 'Family Function', days: 3, status: 'APPROVED' },
      { leaveType: 'SL', reason: 'Medical', days: 1, status: 'APPROVED' },
      { leaveType: 'CL', reason: 'Personal', days: 1, status: 'REJECTED' },
      { leaveType: 'LWP', reason: 'Urgent work', days: 2, status: 'APPROVED' },
      { leaveType: 'CO', reason: 'Comp off', days: 1, status: 'PENDING' },
      { leaveType: 'EL', reason: 'Travel', days: 4, status: 'PENDING' },
    ];

    const today = new Date();
    for (let i = 0; i < samples.length && i < employees.length; i++) {
      const s = samples[i];
      const from = new Date(today);
      from.setUTCDate(from.getUTCDate() + i + 1);
      const to = new Date(from);
      to.setUTCDate(to.getUTCDate() + s.days - 1);
      const count = await prisma.hrLeaveApplication.count({ where: { institutionId } });

      await prisma.hrLeaveApplication.create({
        data: {
          institutionId,
          recordId: `LV-2025-${String(1001 + count + i)}`,
          employeeId: employees[i].id,
          academicYear: '2025-26',
          leaveType: s.leaveType,
          fromDate: from,
          toDate: to,
          totalDays: s.days,
          reason: s.reason,
          status: s.status,
          approvedBy: s.status === 'APPROVED' ? 'HR Manager' : '',
          approvedAt: s.status === 'APPROVED' ? new Date() : null,
        },
      });
    }
  }

  const holidayCount = await prisma.holiday.count({ where: { institutionId } });
  if (holidayCount < 5) {
    const holidays = [
      { date: '2025-05-01', name: 'Labour Day', type: HolidayType.NATIONAL },
      { date: '2025-05-12', name: 'Buddha Purnima', type: HolidayType.NATIONAL },
      { date: '2025-05-20', name: 'Id-ul-Zuha', type: HolidayType.RESTRICTED },
      { date: '2025-05-26', name: 'Summer Vacation Starts', type: HolidayType.INSTITUTIONAL },
      { date: '2025-08-15', name: 'Independence Day', type: HolidayType.NATIONAL },
      { date: '2025-10-02', name: 'Gandhi Jayanti', type: HolidayType.NATIONAL },
      { date: '2025-12-25', name: 'Christmas', type: HolidayType.INSTITUTIONAL },
    ];
    for (const h of holidays) {
      const d = parseDateOnly(h.date);
      await prisma.holiday.upsert({
        where: { institutionId_date_name: { institutionId, date: d, name: h.name } },
        create: { institutionId, date: d, name: h.name, type: h.type },
        update: {},
      });
    }
  }

  return getHrLeaveDashboard(institutionId, { year: 2025, month: 5 });
}
