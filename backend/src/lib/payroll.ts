import {
  FeeMasterStatus,
  PayrollEmploymentType,
  PayrollSlipStatus,
  Prisma,
} from '@prisma/client';
import { prisma } from './prisma.js';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export type StatutoryRates = {
  epfEmployeePercent: number;
  epfEmployerPercent: number;
  epfWageCeiling: number;
  esicEmployeePercent: number;
  esicEmployerPercent: number;
  esicWageCeiling: number;
  professionalTaxAmount: number;
};

export type EarningsInput = {
  basicSalary?: number;
  hra?: number;
  da?: number;
  specialAllowance?: number;
  conveyanceAllowance?: number;
  otherAllowances?: number;
  tds?: number;
  otherDeductions?: number;
  professionalTax?: number | null;
  overrideEpfEmployee?: number | null;
  overrideEpfEmployer?: number | null;
  overrideEsicEmployee?: number | null;
  overrideEsicEmployer?: number | null;
};

function serializeStatutory(row: {
  id: string;
  institutionId: string;
  epfEmployeePercent: number;
  epfEmployerPercent: number;
  epfWageCeiling: number;
  esicEmployeePercent: number;
  esicEmployerPercent: number;
  esicWageCeiling: number;
  professionalTaxAmount: number;
  remarks: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    institutionId: row.institutionId,
    epfEmployeePercent: row.epfEmployeePercent,
    epfEmployerPercent: row.epfEmployerPercent,
    epfWageCeiling: row.epfWageCeiling,
    esicEmployeePercent: row.esicEmployeePercent,
    esicEmployerPercent: row.esicEmployerPercent,
    esicWageCeiling: row.esicWageCeiling,
    professionalTaxAmount: row.professionalTaxAmount,
    remarks: row.remarks,
    updatedBy: row.updatedBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function serializeEmployee(row: {
  id: string;
  employeeCode: string;
  fullName: string;
  employmentType: PayrollEmploymentType;
  department: string;
  designation: string;
  mobile: string;
  email: string;
  joinDate: Date | null;
  bankAccount: string;
  bankIfsc: string;
  panNumber: string;
  uanNumber: string;
  pfNumber: string;
  esicNumber: string;
  epfApplicable: boolean;
  esicApplicable: boolean;
  status: FeeMasterStatus;
  remarks: string;
  createdAt: Date;
  updatedAt: Date;
  salaryStructures?: Array<{ id: string; netSalary: number; grossSalary: number; status: FeeMasterStatus }>;
}) {
  const activeStructure = row.salaryStructures?.find((s) => s.status === FeeMasterStatus.ACTIVE);
  return {
    id: row.id,
    employeeCode: row.employeeCode,
    fullName: row.fullName,
    employmentType: row.employmentType,
    department: row.department,
    designation: row.designation,
    mobile: row.mobile,
    email: row.email,
    joinDate: row.joinDate ? row.joinDate.toISOString().slice(0, 10) : null,
    bankAccount: row.bankAccount,
    bankIfsc: row.bankIfsc,
    panNumber: row.panNumber,
    uanNumber: row.uanNumber,
    pfNumber: row.pfNumber,
    esicNumber: row.esicNumber,
    epfApplicable: row.epfApplicable,
    esicApplicable: row.esicApplicable,
    status: row.status,
    remarks: row.remarks,
    activeGross: activeStructure?.grossSalary ?? 0,
    activeNet: activeStructure?.netSalary ?? 0,
    hasActiveStructure: Boolean(activeStructure),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function serializeStructure(row: {
  id: string;
  structureCode: string;
  employeeId: string;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  basicSalary: number;
  hra: number;
  da: number;
  specialAllowance: number;
  conveyanceAllowance: number;
  otherAllowances: number;
  grossSalary: number;
  pfWages: number;
  epfEmployee: number;
  epfEmployer: number;
  esicEmployee: number;
  esicEmployer: number;
  professionalTax: number;
  tds: number;
  otherDeductions: number;
  totalDeductions: number;
  netSalary: number;
  status: FeeMasterStatus;
  remarks: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  employee?: {
    employeeCode: string;
    fullName: string;
    department: string;
    designation: string;
    employmentType: PayrollEmploymentType;
  };
}) {
  return {
    id: row.id,
    structureCode: row.structureCode,
    employeeId: row.employeeId,
    employeeCode: row.employee?.employeeCode ?? '',
    employeeName: row.employee?.fullName ?? '',
    department: row.employee?.department ?? '',
    designation: row.employee?.designation ?? '',
    employmentType: row.employee?.employmentType ?? 'TEACHING',
    effectiveFrom: row.effectiveFrom.toISOString().slice(0, 10),
    effectiveTo: row.effectiveTo ? row.effectiveTo.toISOString().slice(0, 10) : null,
    basicSalary: row.basicSalary,
    hra: row.hra,
    da: row.da,
    specialAllowance: row.specialAllowance,
    conveyanceAllowance: row.conveyanceAllowance,
    otherAllowances: row.otherAllowances,
    grossSalary: row.grossSalary,
    pfWages: row.pfWages,
    epfEmployee: row.epfEmployee,
    epfEmployer: row.epfEmployer,
    esicEmployee: row.esicEmployee,
    esicEmployer: row.esicEmployer,
    professionalTax: row.professionalTax,
    tds: row.tds,
    otherDeductions: row.otherDeductions,
    totalDeductions: row.totalDeductions,
    netSalary: row.netSalary,
    status: row.status,
    remarks: row.remarks,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function serializeSlip(row: {
  id: string;
  slipNumber: string;
  employeeId: string;
  structureId: string | null;
  payPeriod: string;
  payMonth: number;
  payYear: number;
  workingDays: number;
  presentDays: number;
  leaveDays: number;
  basicSalary: number;
  hra: number;
  da: number;
  specialAllowance: number;
  conveyanceAllowance: number;
  otherAllowances: number;
  grossEarnings: number;
  epfEmployee: number;
  epfEmployer: number;
  esicEmployee: number;
  esicEmployer: number;
  professionalTax: number;
  tds: number;
  otherDeductions: number;
  totalDeductions: number;
  netPay: number;
  status: PayrollSlipStatus;
  paidAt: Date | null;
  paidBy: string;
  generatedBy: string;
  remarks: string;
  createdAt: Date;
  updatedAt: Date;
  employee?: {
    employeeCode: string;
    fullName: string;
    department: string;
    designation: string;
    uanNumber: string;
    pfNumber: string;
    esicNumber: string;
    bankAccount: string;
  };
}) {
  return {
    id: row.id,
    slipNumber: row.slipNumber,
    employeeId: row.employeeId,
    structureId: row.structureId,
    employeeCode: row.employee?.employeeCode ?? '',
    employeeName: row.employee?.fullName ?? '',
    department: row.employee?.department ?? '',
    designation: row.employee?.designation ?? '',
    uanNumber: row.employee?.uanNumber ?? '',
    pfNumber: row.employee?.pfNumber ?? '',
    esicNumber: row.employee?.esicNumber ?? '',
    bankAccount: row.employee?.bankAccount ?? '',
    payPeriod: row.payPeriod,
    payPeriodLabel: `${MONTH_NAMES[row.payMonth - 1] ?? row.payMonth} ${row.payYear}`,
    payMonth: row.payMonth,
    payYear: row.payYear,
    workingDays: row.workingDays,
    presentDays: row.presentDays,
    leaveDays: row.leaveDays,
    basicSalary: row.basicSalary,
    hra: row.hra,
    da: row.da,
    specialAllowance: row.specialAllowance,
    conveyanceAllowance: row.conveyanceAllowance,
    otherAllowances: row.otherAllowances,
    grossEarnings: row.grossEarnings,
    epfEmployee: row.epfEmployee,
    epfEmployer: row.epfEmployer,
    esicEmployee: row.esicEmployee,
    esicEmployer: row.esicEmployer,
    professionalTax: row.professionalTax,
    tds: row.tds,
    otherDeductions: row.otherDeductions,
    totalDeductions: row.totalDeductions,
    netPay: row.netPay,
    status: row.status,
    paidAt: row.paidAt ? row.paidAt.toISOString() : null,
    paidBy: row.paidBy,
    generatedBy: row.generatedBy,
    remarks: row.remarks,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function computeSalaryComponents(
  earnings: EarningsInput,
  rates: StatutoryRates,
  opts: { epfApplicable: boolean; esicApplicable: boolean },
) {
  const basicSalary = round2(earnings.basicSalary ?? 0);
  const hra = round2(earnings.hra ?? 0);
  const da = round2(earnings.da ?? 0);
  const specialAllowance = round2(earnings.specialAllowance ?? 0);
  const conveyanceAllowance = round2(earnings.conveyanceAllowance ?? 0);
  const otherAllowances = round2(earnings.otherAllowances ?? 0);
  const grossSalary = round2(
    basicSalary + hra + da + specialAllowance + conveyanceAllowance + otherAllowances,
  );

  const pfWages = round2(Math.min(basicSalary + da, rates.epfWageCeiling));
  let epfEmployee = 0;
  let epfEmployer = 0;
  if (opts.epfApplicable && pfWages > 0) {
    epfEmployee =
      earnings.overrideEpfEmployee != null
        ? round2(earnings.overrideEpfEmployee)
        : round2((pfWages * rates.epfEmployeePercent) / 100);
    epfEmployer =
      earnings.overrideEpfEmployer != null
        ? round2(earnings.overrideEpfEmployer)
        : round2((pfWages * rates.epfEmployerPercent) / 100);
  }

  let esicEmployee = 0;
  let esicEmployer = 0;
  if (opts.esicApplicable && grossSalary > 0 && grossSalary <= rates.esicWageCeiling) {
    esicEmployee =
      earnings.overrideEsicEmployee != null
        ? round2(earnings.overrideEsicEmployee)
        : round2((grossSalary * rates.esicEmployeePercent) / 100);
    esicEmployer =
      earnings.overrideEsicEmployer != null
        ? round2(earnings.overrideEsicEmployer)
        : round2((grossSalary * rates.esicEmployerPercent) / 100);
  }

  const professionalTax =
    earnings.professionalTax != null
      ? round2(earnings.professionalTax)
      : round2(grossSalary > 0 ? rates.professionalTaxAmount : 0);
  const tds = round2(earnings.tds ?? 0);
  const otherDeductions = round2(earnings.otherDeductions ?? 0);
  const totalDeductions = round2(epfEmployee + esicEmployee + professionalTax + tds + otherDeductions);
  const netSalary = round2(grossSalary - totalDeductions);

  return {
    basicSalary,
    hra,
    da,
    specialAllowance,
    conveyanceAllowance,
    otherAllowances,
    grossSalary,
    pfWages,
    epfEmployee,
    epfEmployer,
    esicEmployee,
    esicEmployer,
    professionalTax,
    tds,
    otherDeductions,
    totalDeductions,
    netSalary,
  };
}

export async function getOrCreateStatutoryConfig(institutionId: string) {
  const existing = await prisma.payrollStatutoryConfig.findUnique({ where: { institutionId } });
  if (existing) return serializeStatutory(existing);
  const created = await prisma.payrollStatutoryConfig.create({
    data: { institutionId },
  });
  return serializeStatutory(created);
}

export async function updateStatutoryConfig(
  institutionId: string,
  data: Partial<StatutoryRates> & { remarks?: string },
  updatedBy: string,
) {
  await getOrCreateStatutoryConfig(institutionId);
  const row = await prisma.payrollStatutoryConfig.update({
    where: { institutionId },
    data: {
      epfEmployeePercent: data.epfEmployeePercent,
      epfEmployerPercent: data.epfEmployerPercent,
      epfWageCeiling: data.epfWageCeiling,
      esicEmployeePercent: data.esicEmployeePercent,
      esicEmployerPercent: data.esicEmployerPercent,
      esicWageCeiling: data.esicWageCeiling,
      professionalTaxAmount: data.professionalTaxAmount,
      remarks: data.remarks,
      updatedBy,
    },
  });
  return serializeStatutory(row);
}

async function nextEmployeeCode(institutionId: string) {
  const count = await prisma.payrollEmployee.count({ where: { institutionId } });
  for (let i = 0; i < 100; i++) {
    const code = `EMP${String(count + 1 + i).padStart(4, '0')}`;
    const exists = await prisma.payrollEmployee.findFirst({
      where: { institutionId, employeeCode: code },
    });
    if (!exists) return code;
  }
  return `EMP${Date.now().toString().slice(-6)}`;
}

async function nextStructureCode(institutionId: string) {
  const count = await prisma.payrollSalaryStructure.count({ where: { institutionId } });
  for (let i = 0; i < 100; i++) {
    const code = `SAL${String(count + 1 + i).padStart(4, '0')}`;
    const exists = await prisma.payrollSalaryStructure.findFirst({
      where: { institutionId, structureCode: code },
    });
    if (!exists) return code;
  }
  return `SAL${Date.now().toString().slice(-6)}`;
}

async function nextSlipNumber(institutionId: string, payYear: number, payMonth: number) {
  const prefix = `PS${payYear}${String(payMonth).padStart(2, '0')}`;
  const count = await prisma.payrollSlip.count({
    where: { institutionId, payYear, payMonth },
  });
  return `${prefix}-${String(count + 1).padStart(4, '0')}`;
}

export async function listPayrollEmployees(
  institutionId: string,
  filters?: { status?: FeeMasterStatus; employmentType?: PayrollEmploymentType; q?: string },
) {
  const where: Prisma.PayrollEmployeeWhereInput = { institutionId };
  if (filters?.status) where.status = filters.status;
  if (filters?.employmentType) where.employmentType = filters.employmentType;
  if (filters?.q?.trim()) {
    const q = filters.q.trim();
    where.OR = [
      { fullName: { contains: q, mode: 'insensitive' } },
      { employeeCode: { contains: q, mode: 'insensitive' } },
      { department: { contains: q, mode: 'insensitive' } },
      { designation: { contains: q, mode: 'insensitive' } },
    ];
  }
  const rows = await prisma.payrollEmployee.findMany({
    where,
    include: {
      salaryStructures: {
        where: { status: FeeMasterStatus.ACTIVE },
        select: { id: true, netSalary: true, grossSalary: true, status: true },
        take: 1,
      },
    },
    orderBy: [{ fullName: 'asc' }],
  });
  return rows.map(serializeEmployee);
}

export async function createPayrollEmployee(
  institutionId: string,
  data: {
    employeeCode?: string;
    fullName: string;
    employmentType?: PayrollEmploymentType;
    department?: string;
    designation?: string;
    mobile?: string;
    email?: string;
    joinDate?: string;
    bankAccount?: string;
    bankIfsc?: string;
    panNumber?: string;
    uanNumber?: string;
    pfNumber?: string;
    esicNumber?: string;
    epfApplicable?: boolean;
    esicApplicable?: boolean;
    remarks?: string;
  },
) {
  const fullName = data.fullName?.trim();
  if (!fullName) throw new Error('Employee name is required');
  const employeeCode = data.employeeCode?.trim() || (await nextEmployeeCode(institutionId));
  const exists = await prisma.payrollEmployee.findFirst({
    where: { institutionId, employeeCode },
  });
  if (exists) throw new Error(`Employee code ${employeeCode} already exists`);

  const row = await prisma.payrollEmployee.create({
    data: {
      institutionId,
      employeeCode,
      fullName,
      employmentType: data.employmentType ?? PayrollEmploymentType.TEACHING,
      department: data.department?.trim() || 'General',
      designation: data.designation?.trim() || 'Staff',
      mobile: data.mobile ?? '',
      email: data.email ?? '',
      joinDate: data.joinDate ? new Date(data.joinDate) : null,
      bankAccount: data.bankAccount ?? '',
      bankIfsc: data.bankIfsc ?? '',
      panNumber: data.panNumber ?? '',
      uanNumber: data.uanNumber ?? '',
      pfNumber: data.pfNumber ?? '',
      esicNumber: data.esicNumber ?? '',
      epfApplicable: data.epfApplicable ?? true,
      esicApplicable: data.esicApplicable ?? true,
      remarks: data.remarks ?? '',
      status: FeeMasterStatus.ACTIVE,
    },
    include: {
      salaryStructures: {
        where: { status: FeeMasterStatus.ACTIVE },
        select: { id: true, netSalary: true, grossSalary: true, status: true },
        take: 1,
      },
    },
  });
  return serializeEmployee(row);
}

export async function updatePayrollEmployee(
  institutionId: string,
  id: string,
  data: Partial<{
    fullName: string;
    employmentType: PayrollEmploymentType;
    department: string;
    designation: string;
    mobile: string;
    email: string;
    joinDate: string | null;
    bankAccount: string;
    bankIfsc: string;
    panNumber: string;
    uanNumber: string;
    pfNumber: string;
    esicNumber: string;
    epfApplicable: boolean;
    esicApplicable: boolean;
    status: FeeMasterStatus;
    remarks: string;
  }>,
) {
  const existing = await prisma.payrollEmployee.findFirst({ where: { id, institutionId } });
  if (!existing) throw new Error('Employee not found');

  const row = await prisma.payrollEmployee.update({
    where: { id },
    data: {
      fullName: data.fullName?.trim(),
      employmentType: data.employmentType,
      department: data.department?.trim(),
      designation: data.designation?.trim(),
      mobile: data.mobile,
      email: data.email,
      joinDate:
        data.joinDate === null ? null : data.joinDate ? new Date(data.joinDate) : undefined,
      bankAccount: data.bankAccount,
      bankIfsc: data.bankIfsc,
      panNumber: data.panNumber,
      uanNumber: data.uanNumber,
      pfNumber: data.pfNumber,
      esicNumber: data.esicNumber,
      epfApplicable: data.epfApplicable,
      esicApplicable: data.esicApplicable,
      status: data.status,
      remarks: data.remarks,
    },
    include: {
      salaryStructures: {
        where: { status: FeeMasterStatus.ACTIVE },
        select: { id: true, netSalary: true, grossSalary: true, status: true },
        take: 1,
      },
    },
  });
  return serializeEmployee(row);
}

export async function listSalaryStructures(
  institutionId: string,
  filters?: { employeeId?: string; status?: FeeMasterStatus },
) {
  const where: Prisma.PayrollSalaryStructureWhereInput = { institutionId };
  if (filters?.employeeId) where.employeeId = filters.employeeId;
  if (filters?.status) where.status = filters.status;
  const rows = await prisma.payrollSalaryStructure.findMany({
    where,
    include: {
      employee: {
        select: {
          employeeCode: true,
          fullName: true,
          department: true,
          designation: true,
          employmentType: true,
        },
      },
    },
    orderBy: [{ effectiveFrom: 'desc' }, { createdAt: 'desc' }],
  });
  return rows.map(serializeStructure);
}

export async function createSalaryStructure(
  institutionId: string,
  data: {
    employeeId: string;
    structureCode?: string;
    effectiveFrom: string;
    effectiveTo?: string;
    basicSalary?: number;
    hra?: number;
    da?: number;
    specialAllowance?: number;
    conveyanceAllowance?: number;
    otherAllowances?: number;
    tds?: number;
    otherDeductions?: number;
    professionalTax?: number | null;
    overrideEpfEmployee?: number | null;
    overrideEpfEmployer?: number | null;
    overrideEsicEmployee?: number | null;
    overrideEsicEmployer?: number | null;
    remarks?: string;
    deactivatePrevious?: boolean;
  },
  createdBy: string,
) {
  const employee = await prisma.payrollEmployee.findFirst({
    where: { id: data.employeeId, institutionId },
  });
  if (!employee) throw new Error('Employee not found');
  if (!data.effectiveFrom) throw new Error('Effective from date is required');

  const rates = await getOrCreateStatutoryConfig(institutionId);
  const computed = computeSalaryComponents(data, rates, {
    epfApplicable: employee.epfApplicable,
    esicApplicable: employee.esicApplicable,
  });
  if (computed.grossSalary <= 0) throw new Error('Gross salary must be greater than zero');

  const structureCode = data.structureCode?.trim() || (await nextStructureCode(institutionId));

  if (data.deactivatePrevious !== false) {
    await prisma.payrollSalaryStructure.updateMany({
      where: { institutionId, employeeId: employee.id, status: FeeMasterStatus.ACTIVE },
      data: { status: FeeMasterStatus.INACTIVE, effectiveTo: new Date(data.effectiveFrom) },
    });
  }

  const row = await prisma.payrollSalaryStructure.create({
    data: {
      institutionId,
      employeeId: employee.id,
      structureCode,
      effectiveFrom: new Date(data.effectiveFrom),
      effectiveTo: data.effectiveTo ? new Date(data.effectiveTo) : null,
      ...computed,
      status: FeeMasterStatus.ACTIVE,
      remarks: data.remarks ?? '',
      createdBy,
    },
    include: {
      employee: {
        select: {
          employeeCode: true,
          fullName: true,
          department: true,
          designation: true,
          employmentType: true,
        },
      },
    },
  });
  return serializeStructure(row);
}

export async function previewSalaryStructure(
  institutionId: string,
  data: EarningsInput & { employeeId?: string; epfApplicable?: boolean; esicApplicable?: boolean },
) {
  const rates = await getOrCreateStatutoryConfig(institutionId);
  let epfApplicable = data.epfApplicable ?? true;
  let esicApplicable = data.esicApplicable ?? true;
  if (data.employeeId) {
    const employee = await prisma.payrollEmployee.findFirst({
      where: { id: data.employeeId, institutionId },
    });
    if (employee) {
      epfApplicable = employee.epfApplicable;
      esicApplicable = employee.esicApplicable;
    }
  }
  return computeSalaryComponents(data, rates, { epfApplicable, esicApplicable });
}

export async function listPayrollSlips(
  institutionId: string,
  filters?: { payPeriod?: string; status?: PayrollSlipStatus; employeeId?: string },
) {
  const where: Prisma.PayrollSlipWhereInput = { institutionId };
  if (filters?.payPeriod) where.payPeriod = filters.payPeriod;
  if (filters?.status) where.status = filters.status;
  if (filters?.employeeId) where.employeeId = filters.employeeId;
  const rows = await prisma.payrollSlip.findMany({
    where,
    include: {
      employee: {
        select: {
          employeeCode: true,
          fullName: true,
          department: true,
          designation: true,
          uanNumber: true,
          pfNumber: true,
          esicNumber: true,
          bankAccount: true,
        },
      },
    },
    orderBy: [{ payYear: 'desc' }, { payMonth: 'desc' }, { slipNumber: 'asc' }],
  });
  return rows.map(serializeSlip);
}

export async function getPayrollSlip(institutionId: string, id: string) {
  const row = await prisma.payrollSlip.findFirst({
    where: { id, institutionId },
    include: {
      employee: {
        select: {
          employeeCode: true,
          fullName: true,
          department: true,
          designation: true,
          uanNumber: true,
          pfNumber: true,
          esicNumber: true,
          bankAccount: true,
        },
      },
    },
  });
  if (!row) throw new Error('Payroll slip not found');
  return serializeSlip(row);
}

function parsePayPeriod(payPeriod: string): { payPeriod: string; payYear: number; payMonth: number } {
  const m = payPeriod.match(/^(\d{4})-(\d{2})$/);
  if (!m) throw new Error('Pay period must be in YYYY-MM format');
  const payYear = Number(m[1]);
  const payMonth = Number(m[2]);
  if (payMonth < 1 || payMonth > 12) throw new Error('Invalid pay month');
  return { payPeriod, payYear, payMonth };
}

function prorate(amount: number, presentDays: number, workingDays: number) {
  if (workingDays <= 0) return 0;
  return round2((amount * presentDays) / workingDays);
}

export async function generatePayrollSlips(
  institutionId: string,
  data: {
    payPeriod: string;
    employeeIds?: string[];
    workingDays?: number;
    presentDays?: number;
  },
  generatedBy: string,
) {
  const { payPeriod, payYear, payMonth } = parsePayPeriod(data.payPeriod);
  const workingDays = data.workingDays ?? 30;
  const presentDays = data.presentDays ?? workingDays;

  const empWhere: Prisma.PayrollEmployeeWhereInput = {
    institutionId,
    status: FeeMasterStatus.ACTIVE,
  };
  if (data.employeeIds?.length) empWhere.id = { in: data.employeeIds };

  const employees = await prisma.payrollEmployee.findMany({
    where: empWhere,
    include: {
      salaryStructures: {
        where: { status: FeeMasterStatus.ACTIVE },
        orderBy: { effectiveFrom: 'desc' },
        take: 1,
      },
    },
  });

  const created: ReturnType<typeof serializeSlip>[] = [];
  const skipped: Array<{ employeeCode: string; reason: string }> = [];

  for (const emp of employees) {
    const structure = emp.salaryStructures[0];
    if (!structure) {
      skipped.push({ employeeCode: emp.employeeCode, reason: 'No active salary structure' });
      continue;
    }

    const existing = await prisma.payrollSlip.findFirst({
      where: { institutionId, employeeId: emp.id, payPeriod },
    });
    if (existing && existing.status !== PayrollSlipStatus.CANCELLED) {
      skipped.push({ employeeCode: emp.employeeCode, reason: `Slip already exists (${existing.slipNumber})` });
      continue;
    }

    const basicSalary = prorate(structure.basicSalary, presentDays, workingDays);
    const hra = prorate(structure.hra, presentDays, workingDays);
    const da = prorate(structure.da, presentDays, workingDays);
    const specialAllowance = prorate(structure.specialAllowance, presentDays, workingDays);
    const conveyanceAllowance = prorate(structure.conveyanceAllowance, presentDays, workingDays);
    const otherAllowances = prorate(structure.otherAllowances, presentDays, workingDays);
    const grossEarnings = round2(
      basicSalary + hra + da + specialAllowance + conveyanceAllowance + otherAllowances,
    );
    const epfEmployee = prorate(structure.epfEmployee, presentDays, workingDays);
    const epfEmployer = prorate(structure.epfEmployer, presentDays, workingDays);
    const esicEmployee = prorate(structure.esicEmployee, presentDays, workingDays);
    const esicEmployer = prorate(structure.esicEmployer, presentDays, workingDays);
    const professionalTax = structure.professionalTax;
    const tds = prorate(structure.tds, presentDays, workingDays);
    const otherDeductions = prorate(structure.otherDeductions, presentDays, workingDays);
    const totalDeductions = round2(
      epfEmployee + esicEmployee + professionalTax + tds + otherDeductions,
    );
    const netPay = round2(grossEarnings - totalDeductions);
    const slipNumber = await nextSlipNumber(institutionId, payYear, payMonth);

    if (existing?.status === PayrollSlipStatus.CANCELLED) {
      const row = await prisma.payrollSlip.update({
        where: { id: existing.id },
        data: {
          structureId: structure.id,
          slipNumber,
          workingDays,
          presentDays,
          leaveDays: round2(Math.max(0, workingDays - presentDays)),
          basicSalary,
          hra,
          da,
          specialAllowance,
          conveyanceAllowance,
          otherAllowances,
          grossEarnings,
          epfEmployee,
          epfEmployer,
          esicEmployee,
          esicEmployer,
          professionalTax,
          tds,
          otherDeductions,
          totalDeductions,
          netPay,
          status: PayrollSlipStatus.GENERATED,
          generatedBy,
          paidAt: null,
          paidBy: '',
        },
        include: {
          employee: {
            select: {
              employeeCode: true,
              fullName: true,
              department: true,
              designation: true,
              uanNumber: true,
              pfNumber: true,
              esicNumber: true,
              bankAccount: true,
            },
          },
        },
      });
      created.push(serializeSlip(row));
      continue;
    }

    const row = await prisma.payrollSlip.create({
      data: {
        institutionId,
        employeeId: emp.id,
        structureId: structure.id,
        slipNumber,
        payPeriod,
        payMonth,
        payYear,
        workingDays,
        presentDays,
        leaveDays: round2(Math.max(0, workingDays - presentDays)),
        basicSalary,
        hra,
        da,
        specialAllowance,
        conveyanceAllowance,
        otherAllowances,
        grossEarnings,
        epfEmployee,
        epfEmployer,
        esicEmployee,
        esicEmployer,
        professionalTax,
        tds,
        otherDeductions,
        totalDeductions,
        netPay,
        status: PayrollSlipStatus.GENERATED,
        generatedBy,
      },
      include: {
        employee: {
          select: {
            employeeCode: true,
            fullName: true,
            department: true,
            designation: true,
            uanNumber: true,
            pfNumber: true,
            esicNumber: true,
            bankAccount: true,
          },
        },
      },
    });
    created.push(serializeSlip(row));
  }

  return { created: created.length, skipped, records: created };
}

export async function markPayrollSlipPaid(
  institutionId: string,
  id: string,
  paidBy: string,
) {
  const existing = await prisma.payrollSlip.findFirst({ where: { id, institutionId } });
  if (!existing) throw new Error('Payroll slip not found');
  if (existing.status === PayrollSlipStatus.CANCELLED) {
    throw new Error('Cancelled slips cannot be marked paid');
  }
  if (existing.status === PayrollSlipStatus.PAID) {
    throw new Error('Slip is already marked as paid');
  }
  const row = await prisma.payrollSlip.update({
    where: { id },
    data: {
      status: PayrollSlipStatus.PAID,
      paidAt: new Date(),
      paidBy,
    },
    include: {
      employee: {
        select: {
          employeeCode: true,
          fullName: true,
          department: true,
          designation: true,
          uanNumber: true,
          pfNumber: true,
          esicNumber: true,
          bankAccount: true,
        },
      },
    },
  });
  return serializeSlip(row);
}

export async function cancelPayrollSlip(institutionId: string, id: string) {
  const existing = await prisma.payrollSlip.findFirst({ where: { id, institutionId } });
  if (!existing) throw new Error('Payroll slip not found');
  if (existing.status === PayrollSlipStatus.PAID) {
    throw new Error('Paid slips cannot be cancelled');
  }
  const row = await prisma.payrollSlip.update({
    where: { id },
    data: { status: PayrollSlipStatus.CANCELLED },
    include: {
      employee: {
        select: {
          employeeCode: true,
          fullName: true,
          department: true,
          designation: true,
          uanNumber: true,
          pfNumber: true,
          esicNumber: true,
          bankAccount: true,
        },
      },
    },
  });
  return serializeSlip(row);
}

export async function getPayrollSummary(institutionId: string, payPeriod?: string) {
  const [employeeCount, structureCount, config] = await Promise.all([
    prisma.payrollEmployee.count({ where: { institutionId, status: FeeMasterStatus.ACTIVE } }),
    prisma.payrollSalaryStructure.count({
      where: { institutionId, status: FeeMasterStatus.ACTIVE },
    }),
    getOrCreateStatutoryConfig(institutionId),
  ]);

  const slipWhere: Prisma.PayrollSlipWhereInput = {
    institutionId,
    status: { in: [PayrollSlipStatus.GENERATED, PayrollSlipStatus.PAID] },
  };
  if (payPeriod) slipWhere.payPeriod = payPeriod;

  const slips = await prisma.payrollSlip.findMany({
    where: slipWhere,
    select: {
      grossEarnings: true,
      netPay: true,
      epfEmployee: true,
      epfEmployer: true,
      esicEmployee: true,
      esicEmployer: true,
      totalDeductions: true,
      status: true,
      payPeriod: true,
    },
  });

  const totals = slips.reduce(
    (acc, s) => {
      acc.gross += s.grossEarnings;
      acc.net += s.netPay;
      acc.epfEmployee += s.epfEmployee;
      acc.epfEmployer += s.epfEmployer;
      acc.esicEmployee += s.esicEmployee;
      acc.esicEmployer += s.esicEmployer;
      acc.deductions += s.totalDeductions;
      if (s.status === PayrollSlipStatus.PAID) acc.paidCount += 1;
      else acc.generatedCount += 1;
      return acc;
    },
    {
      gross: 0,
      net: 0,
      epfEmployee: 0,
      epfEmployer: 0,
      esicEmployee: 0,
      esicEmployer: 0,
      deductions: 0,
      paidCount: 0,
      generatedCount: 0,
    },
  );

  return {
    payPeriod: payPeriod || null,
    employeeCount,
    structureCount,
    slipCount: slips.length,
    generatedCount: totals.generatedCount,
    paidCount: totals.paidCount,
    totalGross: round2(totals.gross),
    totalNet: round2(totals.net),
    totalDeductions: round2(totals.deductions),
    totalEpfEmployee: round2(totals.epfEmployee),
    totalEpfEmployer: round2(totals.epfEmployer),
    totalEpf: round2(totals.epfEmployee + totals.epfEmployer),
    totalEsicEmployee: round2(totals.esicEmployee),
    totalEsicEmployer: round2(totals.esicEmployer),
    totalEsic: round2(totals.esicEmployee + totals.esicEmployer),
    statutory: config,
  };
}

export async function getStatutoryReport(institutionId: string, payPeriod: string) {
  parsePayPeriod(payPeriod);
  const slips = await prisma.payrollSlip.findMany({
    where: {
      institutionId,
      payPeriod,
      status: { in: [PayrollSlipStatus.GENERATED, PayrollSlipStatus.PAID] },
    },
    include: {
      employee: {
        select: {
          employeeCode: true,
          fullName: true,
          uanNumber: true,
          pfNumber: true,
          esicNumber: true,
          department: true,
        },
      },
    },
    orderBy: { slipNumber: 'asc' },
  });

  const rows = slips.map((s) => ({
    slipNumber: s.slipNumber,
    employeeCode: s.employee.employeeCode,
    employeeName: s.employee.fullName,
    department: s.employee.department,
    uanNumber: s.employee.uanNumber,
    pfNumber: s.employee.pfNumber,
    esicNumber: s.employee.esicNumber,
    grossEarnings: s.grossEarnings,
    epfEmployee: s.epfEmployee,
    epfEmployer: s.epfEmployer,
    esicEmployee: s.esicEmployee,
    esicEmployer: s.esicEmployer,
    professionalTax: s.professionalTax,
    netPay: s.netPay,
    status: s.status,
  }));

  const totals = rows.reduce(
    (acc, r) => {
      acc.epfEmployee += r.epfEmployee;
      acc.epfEmployer += r.epfEmployer;
      acc.esicEmployee += r.esicEmployee;
      acc.esicEmployer += r.esicEmployer;
      acc.professionalTax += r.professionalTax;
      acc.gross += r.grossEarnings;
      return acc;
    },
    {
      epfEmployee: 0,
      epfEmployer: 0,
      esicEmployee: 0,
      esicEmployer: 0,
      professionalTax: 0,
      gross: 0,
    },
  );

  return {
    payPeriod,
    rows,
    totals: {
      epfEmployee: round2(totals.epfEmployee),
      epfEmployer: round2(totals.epfEmployer),
      epfTotal: round2(totals.epfEmployee + totals.epfEmployer),
      esicEmployee: round2(totals.esicEmployee),
      esicEmployer: round2(totals.esicEmployer),
      esicTotal: round2(totals.esicEmployee + totals.esicEmployer),
      professionalTax: round2(totals.professionalTax),
      gross: round2(totals.gross),
    },
  };
}
