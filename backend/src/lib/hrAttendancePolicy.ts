import { FeeMasterStatus, HolidayType, Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import {
  getHrLeaveSettings,
  LEAVE_TYPE_DEFS,
  listHrLeavePolicies,
  seedHrLeaveManagementDemo,
  updateHrLeaveSettings,
} from './hrLeaveManagement.js';

export const POLICY_LEAVE_TYPES = [
  { code: 'CL', name: 'Casual Leave (CL)' },
  { code: 'SL', name: 'Sick Leave (SL)' },
  { code: 'EL', name: 'Earned Leave (EL)' },
  { code: 'ML', name: 'Maternity Leave' },
  { code: 'PL', name: 'Paternity Leave' },
  { code: 'LWP', name: 'Leave Without Pay (LWP)' },
  { code: 'CO', name: 'Compensatory Off' },
  { code: 'SPL', name: 'Special Leave' },
  { code: 'BL', name: 'Bereavement Leave' },
  { code: 'MRL', name: 'Marriage Leave' },
  { code: 'STL', name: 'Study Leave' },
] as const;

const HOLIDAY_TYPE_MAP: Record<string, string> = {
  NATIONAL: 'Gazetted Holidays',
  RESTRICTED: 'Restricted Holidays',
  OPTIONAL: 'Restricted Holidays',
  INSTITUTIONAL: 'Branch Holidays',
  OTHER: 'Branch Holidays',
};

function parseJsonArray<T>(raw: unknown): T[] {
  if (!Array.isArray(raw)) return [];
  return raw as T[];
}

function parseApplicableTo(raw: unknown) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { employeeTypes: [], departments: [], designations: [], campuses: [], branches: [] };
  }
  const o = raw as Record<string, unknown>;
  return {
    employeeTypes: parseJsonArray<string>(o.employeeTypes),
    departments: parseJsonArray<string>(o.departments),
    designations: parseJsonArray<string>(o.designations),
    campuses: parseJsonArray<string>(o.campuses),
    branches: parseJsonArray<string>(o.branches),
  };
}

function serializePolicy(row: {
  id: string;
  policyCode: string;
  name: string;
  leaveCategory: string;
  description: string;
  academicSession: string;
  campus: string;
  branch: string;
  employeeTypes: unknown;
  departments: unknown;
  designations: unknown;
  status: string;
  effectiveFrom: Date | null;
  applicableTo: unknown;
  leaveTypes: unknown;
  generalRules: unknown;
  approvalWorkflow: unknown;
  createdAt: Date;
  updatedAt: Date;
  _count?: { assignments: number };
}) {
  const applicable = parseApplicableTo(row.applicableTo);
  return {
    id: row.id,
    policyCode: row.policyCode,
    name: row.name,
    leaveCategory: row.leaveCategory,
    description: row.description,
    academicSession: row.academicSession,
    campus: row.campus,
    branch: row.branch,
    employeeTypes: parseJsonArray<string>(row.employeeTypes),
    departments: parseJsonArray<string>(row.departments),
    designations: parseJsonArray<string>(row.designations),
    status: row.status,
    effectiveFrom: row.effectiveFrom ? row.effectiveFrom.toISOString().slice(0, 10) : null,
    applicableTo: applicable,
    leaveTypes: parseJsonArray<Record<string, unknown>>(row.leaveTypes),
    generalRules: row.generalRules,
    approvalWorkflow: parseJsonArray<string>(row.approvalWorkflow),
    assignmentCount: row._count?.assignments ?? 0,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function serializeAssignment(row: {
  id: string;
  policyId: string;
  employeeId: string;
  effectiveDate: Date;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  employee?: { employeeCode: string; fullName: string; department: string };
  policy?: { policyCode: string; name: string };
}) {
  return {
    id: row.id,
    policyId: row.policyId,
    employeeId: row.employeeId,
    employeeCode: row.employee?.employeeCode ?? '',
    employeeName: row.employee?.fullName ?? '',
    department: row.employee?.department ?? '',
    policyCode: row.policy?.policyCode ?? '',
    policyName: row.policy?.name ?? '',
    effectiveDate: row.effectiveDate.toISOString().slice(0, 10),
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function ensureAttendanceSettings(institutionId: string) {
  let row = await prisma.hrLeaveSettings.findUnique({ where: { institutionId } });
  if (!row) {
    row = await prisma.hrLeaveSettings.create({ data: { institutionId } });
  }
  return row;
}

export async function getAttendancePolicyDashboard(institutionId: string, academicYear = '2025-26') {
  await listHrLeavePolicies(institutionId);
  const settingsRow = await ensureAttendanceSettings(institutionId);

  const [policies, assignments, holidays, employees, attendanceSettings] = await Promise.all([
    prisma.hrLeavePolicy.findMany({
      where: { institutionId },
      include: { _count: { select: { assignments: true } } },
      orderBy: { policyCode: 'asc' },
    }),
    prisma.hrLeavePolicyAssignment.findMany({
      where: { institutionId },
      include: {
        employee: { select: { employeeCode: true, fullName: true, department: true } },
        policy: { select: { policyCode: true, name: true } },
      },
      orderBy: [{ effectiveDate: 'desc' }],
    }),
    prisma.holiday.findMany({
      where: { institutionId },
      orderBy: { date: 'asc' },
      take: 200,
    }),
    prisma.payrollEmployee.findMany({
      where: { institutionId, status: FeeMasterStatus.ACTIVE },
      select: { id: true, employeeCode: true, fullName: true, department: true, designation: true },
      orderBy: { fullName: 'asc' },
      take: 500,
    }),
    prisma.hrAttendanceSettings.findUnique({ where: { institutionId } }),
  ]);

  const activePolicy = policies.find((p) => p.status === 'ACTIVE') ?? policies[0];

  const holidayGroups = {
    gazetted: holidays.filter((h) => h.type === HolidayType.NATIONAL),
    restricted: holidays.filter((h) => h.type === HolidayType.RESTRICTED || h.type === HolidayType.OPTIONAL),
    branch: holidays.filter((h) => h.type === HolidayType.INSTITUTIONAL || h.type === HolidayType.OTHER),
  };

  const settings = {
    sandwichRule: settingsRow.sandwichRule,
    includeHolidays: settingsRow.includeHolidays,
    halfDayCalculation: settingsRow.halfDayCalculation,
    minimumNoticeDays: settingsRow.minimumNoticeDays,
    maxConsecutiveLeave: settingsRow.maxConsecutiveLeave,
    autoApprovals: settingsRow.autoApprovals,
    leaveFreezePeriod: settingsRow.leaveFreezePeriod,
    leaveYearStart: settingsRow.leaveYearStart,
    carryForwardEnabled: settingsRow.carryForwardEnabled,
    leaveExpiryMonths: settingsRow.leaveExpiryMonths,
    documentMandatory: settingsRow.documentMandatory,
    encashmentEnabled: settingsRow.encashmentEnabled,
    negativeBalanceAllowed: settingsRow.negativeBalanceAllowed,
    managerApprovalRequired: settingsRow.managerApprovalRequired,
    lopCalculation: settingsRow.lopCalculation,
    workingDays: parseJsonArray<string>(settingsRow.workingDays),
    weekendDays: parseJsonArray<string>(settingsRow.weekendDays),
    calendarName: settingsRow.calendarName,
    approvalLevels: parseJsonArray<string>(settingsRow.approvalLevels),
  };

  const leaveTypes = activePolicy
    ? parseJsonArray<Record<string, unknown>>(activePolicy.leaveTypes).filter((lt) =>
        POLICY_LEAVE_TYPES.some((p) => p.code === lt.code),
      )
    : POLICY_LEAVE_TYPES.map((t) => {
        const def = LEAVE_TYPE_DEFS.find((d) => d.code === t.code);
        return {
          code: t.code,
          name: t.name,
          paid: def?.paid ?? true,
          annualAllocation: def?.allocation ?? 0,
          enabled: true,
        };
      });

  return {
    purpose: 'Payroll leave calculations',
    policies: policies.map(serializePolicy),
    activePolicyId: activePolicy?.id ?? null,
    selectedPolicy: activePolicy ? serializePolicy(activePolicy) : null,
    calendar: {
      calendarName: settings.calendarName,
      workingDays: settings.workingDays,
      weekendDays: settings.weekendDays,
      weeklyOffRule: attendanceSettings?.weeklyOffRule ?? 'Saturday & Sunday',
      holidayRule: attendanceSettings?.holidayRule ?? 'Auto-mark from institution holiday master',
      gazettedHolidays: holidayGroups.gazetted.map((h) => ({
        id: h.id,
        date: h.date.toISOString().slice(0, 10),
        name: h.name,
        type: HOLIDAY_TYPE_MAP[h.type] ?? h.type,
      })),
      restrictedHolidays: holidayGroups.restricted.map((h) => ({
        id: h.id,
        date: h.date.toISOString().slice(0, 10),
        name: h.name,
        type: HOLIDAY_TYPE_MAP[h.type] ?? h.type,
      })),
      branchHolidays: holidayGroups.branch.map((h) => ({
        id: h.id,
        date: h.date.toISOString().slice(0, 10),
        name: h.name,
        type: HOLIDAY_TYPE_MAP[h.type] ?? h.type,
      })),
      totalHolidays: holidays.length,
    },
    leaveTypes,
    leaveTypeCatalog: POLICY_LEAVE_TYPES,
    rules: {
      carryForward: settings.carryForwardEnabled,
      encashment: settings.encashmentEnabled,
      negativeBalance: settings.negativeBalanceAllowed,
      autoApproval: settings.autoApprovals,
      managerApproval: settings.managerApprovalRequired,
      lopCalculation: settings.lopCalculation,
      sandwichRule: settings.sandwichRule,
      halfDayCalculation: settings.halfDayCalculation,
      maxConsecutiveLeave: settings.maxConsecutiveLeave,
      minimumNoticeDays: settings.minimumNoticeDays,
      leaveYearStart: settings.leaveYearStart,
      approvalLevels: settings.approvalLevels,
    },
    settings,
    assignments: assignments.map(serializeAssignment),
    employees,
    academicYear,
  };
}

export async function updateAttendancePolicy(
  institutionId: string,
  data: {
    policyId?: string;
    policy?: Partial<{
      name: string;
      description: string;
      effectiveFrom: string | null;
      applicableTo: Record<string, unknown>;
      leaveTypes: unknown[];
      status: string;
      academicSession: string;
      campus: string;
      branch: string;
      employeeTypes: string[];
      departments: string[];
      designations: string[];
    }>;
    settings?: Record<string, unknown>;
    rules?: Record<string, unknown>;
    calendar?: Partial<{
      calendarName: string;
      workingDays: string[];
      weekendDays: string[];
    }>;
  },
) {
  if (data.policyId && data.policy) {
    const existing = await prisma.hrLeavePolicy.findFirst({
      where: { institutionId, id: data.policyId },
    });
    if (!existing) throw new Error('Policy not found');

    await prisma.hrLeavePolicy.update({
      where: { id: data.policyId },
      data: {
        name: data.policy.name ?? existing.name,
        description: data.policy.description ?? existing.description,
        effectiveFrom: data.policy.effectiveFrom
          ? new Date(data.policy.effectiveFrom)
          : data.policy.effectiveFrom === null
            ? null
            : existing.effectiveFrom,
        applicableTo:
          data.policy.applicableTo !== undefined
            ? (data.policy.applicableTo as Prisma.InputJsonValue)
            : (existing.applicableTo as Prisma.InputJsonValue),
        leaveTypes:
          data.policy.leaveTypes !== undefined
            ? (data.policy.leaveTypes as Prisma.InputJsonValue)
            : (existing.leaveTypes as Prisma.InputJsonValue),
        status: data.policy.status ?? existing.status,
        academicSession: data.policy.academicSession ?? existing.academicSession,
        campus: data.policy.campus ?? existing.campus,
        branch: data.policy.branch ?? existing.branch,
        employeeTypes:
          data.policy.employeeTypes !== undefined
            ? (data.policy.employeeTypes as Prisma.InputJsonValue)
            : (existing.employeeTypes as Prisma.InputJsonValue),
        departments:
          data.policy.departments !== undefined
            ? (data.policy.departments as Prisma.InputJsonValue)
            : (existing.departments as Prisma.InputJsonValue),
        designations:
          data.policy.designations !== undefined
            ? (data.policy.designations as Prisma.InputJsonValue)
            : (existing.designations as Prisma.InputJsonValue),
      },
    });
  }

  const settingsPatch: Record<string, unknown> = { ...(data.settings ?? {}), ...(data.rules ?? {}) };
  if (data.calendar) {
    if (data.calendar.calendarName) settingsPatch.calendarName = data.calendar.calendarName;
    if (data.calendar.workingDays) settingsPatch.workingDays = data.calendar.workingDays;
    if (data.calendar.weekendDays) settingsPatch.weekendDays = data.calendar.weekendDays;
  }

  if (Object.keys(settingsPatch).length > 0) {
    await ensureAttendanceSettings(institutionId);
    await prisma.hrLeaveSettings.update({
      where: { institutionId },
      data: {
        sandwichRule: settingsPatch.sandwichRule as boolean | undefined,
        includeHolidays: settingsPatch.includeHolidays as boolean | undefined,
        halfDayCalculation: settingsPatch.halfDayCalculation as string | undefined,
        minimumNoticeDays: settingsPatch.minimumNoticeDays as number | undefined,
        maxConsecutiveLeave: settingsPatch.maxConsecutiveLeave as number | undefined,
        autoApprovals: (settingsPatch.autoApprovals ?? settingsPatch.autoApproval) as boolean | undefined,
        leaveFreezePeriod: settingsPatch.leaveFreezePeriod as string | undefined,
        leaveYearStart: settingsPatch.leaveYearStart as string | undefined,
        carryForwardEnabled: (settingsPatch.carryForwardEnabled ?? settingsPatch.carryForward) as boolean | undefined,
        leaveExpiryMonths: settingsPatch.leaveExpiryMonths as number | undefined,
        documentMandatory: settingsPatch.documentMandatory as boolean | undefined,
        encashmentEnabled: (settingsPatch.encashmentEnabled ?? settingsPatch.encashment) as boolean | undefined,
        negativeBalanceAllowed: (settingsPatch.negativeBalanceAllowed ?? settingsPatch.negativeBalance) as boolean | undefined,
        managerApprovalRequired: (settingsPatch.managerApprovalRequired ?? settingsPatch.managerApproval) as boolean | undefined,
        lopCalculation: settingsPatch.lopCalculation as string | undefined,
        workingDays: settingsPatch.workingDays as Prisma.InputJsonValue | undefined,
        weekendDays: settingsPatch.weekendDays as Prisma.InputJsonValue | undefined,
        calendarName: settingsPatch.calendarName as string | undefined,
        approvalLevels: settingsPatch.approvalLevels as Prisma.InputJsonValue | undefined,
      },
    });
  }

  return getAttendancePolicyDashboard(institutionId);
}

export async function assignLeavePolicy(
  institutionId: string,
  data: { policyId: string; employeeId: string; effectiveDate: string },
) {
  const policy = await prisma.hrLeavePolicy.findFirst({
    where: { institutionId, id: data.policyId },
  });
  if (!policy) throw new Error('Policy not found');

  const employee = await prisma.payrollEmployee.findFirst({
    where: { institutionId, id: data.employeeId },
  });
  if (!employee) throw new Error('Employee not found');

  await prisma.hrLeavePolicyAssignment.updateMany({
    where: { institutionId, employeeId: data.employeeId, status: 'ACTIVE' },
    data: { status: 'INACTIVE' },
  });

  const row = await prisma.hrLeavePolicyAssignment.create({
    data: {
      institutionId,
      policyId: data.policyId,
      employeeId: data.employeeId,
      effectiveDate: new Date(data.effectiveDate),
      status: 'ACTIVE',
    },
    include: {
      employee: { select: { employeeCode: true, fullName: true, department: true } },
      policy: { select: { policyCode: true, name: true } },
    },
  });

  return serializeAssignment(row);
}

export async function removeLeavePolicyAssignment(institutionId: string, id: string) {
  const row = await prisma.hrLeavePolicyAssignment.findFirst({ where: { institutionId, id } });
  if (!row) throw new Error('Assignment not found');
  await prisma.hrLeavePolicyAssignment.delete({ where: { id } });
  return { ok: true };
}

export async function seedAttendancePolicyDemo(institutionId: string) {
  await seedHrLeaveManagementDemo(institutionId);

  const policy = await prisma.hrLeavePolicy.findFirst({ where: { institutionId } });
  if (!policy) return getAttendancePolicyDashboard(institutionId);

  await prisma.hrLeavePolicy.update({
    where: { id: policy.id },
    data: {
      effectiveFrom: new Date('2025-04-01'),
      applicableTo: {
        employeeTypes: ['Permanent', 'Probation'],
        departments: ['Academics', 'Administration', 'Finance'],
        designations: ['Teacher', 'Senior Teacher', 'Accountant'],
        campuses: ['Main Campus'],
        branches: ['Main Branch'],
      } as Prisma.InputJsonValue,
    },
  });

  const employees = await prisma.payrollEmployee.findMany({
    where: { institutionId, status: FeeMasterStatus.ACTIVE },
    take: 12,
    orderBy: { fullName: 'asc' },
  });

  const existingAssignments = await prisma.hrLeavePolicyAssignment.count({ where: { institutionId } });
  if (existingAssignments === 0) {
    for (const emp of employees) {
      await prisma.hrLeavePolicyAssignment.create({
        data: {
          institutionId,
          policyId: policy.id,
          employeeId: emp.id,
          effectiveDate: new Date('2025-04-01'),
          status: 'ACTIVE',
        },
      });
    }
  }

  await ensureAttendanceSettings(institutionId);
  await prisma.hrLeaveSettings.update({
    where: { institutionId },
    data: {
      calendarName: 'Academic Calendar 2025-26',
      workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as Prisma.InputJsonValue,
      weekendDays: ['Sunday'] as Prisma.InputJsonValue,
      encashmentEnabled: true,
      negativeBalanceAllowed: false,
      managerApprovalRequired: true,
      lopCalculation: 'Per day salary ÷ working days in month × LOP days',
      carryForwardEnabled: true,
      autoApprovals: false,
    },
  });

  return getAttendancePolicyDashboard(institutionId);
}

// Re-export for routes that need policy list
export { listHrLeavePolicies, getHrLeaveSettings, updateHrLeaveSettings };
