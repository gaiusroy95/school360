import { FeeMasterStatus, Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { seedEmployeeDirectoryDemo } from './employeeDirectory.js';
import { createSalaryStructure } from './payroll.js';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export type SalaryStructureComponent = {
  id: string;
  componentName: string;
  formula: string;
  percentage: number;
  fixedAmount: number;
  pfApplicable: boolean;
  esiApplicable: boolean;
  gratuity: boolean;
  taxable: boolean;
  displayOrder: number;
  status: string;
};

function parseComponents(raw: unknown): SalaryStructureComponent[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, index) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      return {
        id: typeof row.id === 'string' ? row.id : `cmp-${index + 1}`,
        componentName: typeof row.componentName === 'string' ? row.componentName : '',
        formula: typeof row.formula === 'string' ? row.formula : '',
        percentage: Number(row.percentage) || 0,
        fixedAmount: Number(row.fixedAmount) || 0,
        pfApplicable: Boolean(row.pfApplicable),
        esiApplicable: Boolean(row.esiApplicable),
        gratuity: Boolean(row.gratuity),
        taxable: row.taxable !== false,
        displayOrder: Number(row.displayOrder) || index + 1,
        status: typeof row.status === 'string' ? row.status : 'ACTIVE',
      } satisfies SalaryStructureComponent;
    })
    .filter((c): c is SalaryStructureComponent => Boolean(c?.componentName));
}

function componentAmount(comp: SalaryStructureComponent, basicBase: number): number {
  if (comp.status === 'INACTIVE') return 0;
  if (comp.fixedAmount > 0) return round2(comp.fixedAmount);
  if (comp.percentage > 0) {
    const base = comp.formula.toUpperCase().includes('CTC')
      ? basicBase
      : basicBase;
    return round2((base * comp.percentage) / 100);
  }
  return 0;
}

function findBasicBase(earnings: SalaryStructureComponent[]): number {
  const basic = earnings.find((e) => /basic/i.test(e.componentName));
  if (basic) return componentAmount(basic, 0) || basic.fixedAmount;
  const first = earnings.find((e) => e.status !== 'INACTIVE');
  return first ? componentAmount(first, 0) : 0;
}

export function computeTemplateSummary(
  earnings: SalaryStructureComponent[],
  deductions: SalaryStructureComponent[],
  employerContributions: SalaryStructureComponent[],
) {
  const basicBase = findBasicBase(earnings) || 25000;
  const earningRows = earnings
    .filter((e) => e.status !== 'INACTIVE')
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((e) => ({
      ...e,
      amount: e.fixedAmount > 0 ? round2(e.fixedAmount) : round2((basicBase * e.percentage) / 100 || e.fixedAmount),
    }));
  const totalEarnings = round2(earningRows.reduce((s, e) => s + e.amount, 0));

  const deductionRows = deductions
    .filter((d) => d.status !== 'INACTIVE')
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((d) => ({
      ...d,
      amount:
        d.fixedAmount > 0
          ? round2(d.fixedAmount)
          : round2((totalEarnings * d.percentage) / 100 || d.fixedAmount),
    }));
  const totalDeductions = round2(deductionRows.reduce((s, d) => s + d.amount, 0));

  const employerRows = employerContributions
    .filter((e) => e.status !== 'INACTIVE')
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((e) => ({
      ...e,
      amount:
        e.fixedAmount > 0
          ? round2(e.fixedAmount)
          : round2((basicBase * e.percentage) / 100 || e.fixedAmount),
    }));
  const employerContribution = round2(employerRows.reduce((s, e) => s + e.amount, 0));

  const netSalary = round2(totalEarnings - totalDeductions);
  const ctc = round2(totalEarnings + employerContribution);

  return {
    totalEarnings,
    totalDeductions,
    employerContribution,
    ctc,
    netSalary,
    preview: { earnings: earningRows, deductions: deductionRows, employerContributions: employerRows },
  };
}

function serializeTemplate(row: {
  id: string;
  structureCode: string;
  name: string;
  description: string;
  payGrade: string;
  payFrequency: string;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  currency: string;
  status: string;
  earnings: unknown;
  deductions: unknown;
  employerContributions: unknown;
  totalEarnings: number;
  totalDeductions: number;
  employerContribution: number;
  ctc: number;
  netSalary: number;
  createdAt: Date;
  updatedAt: Date;
  _count?: { assignments: number };
}) {
  return {
    id: row.id,
    structureCode: row.structureCode,
    name: row.name,
    description: row.description,
    payGrade: row.payGrade,
    payFrequency: row.payFrequency,
    effectiveFrom: row.effectiveFrom.toISOString().slice(0, 10),
    effectiveTo: row.effectiveTo ? row.effectiveTo.toISOString().slice(0, 10) : null,
    currency: row.currency,
    status: row.status,
    earnings: parseComponents(row.earnings),
    deductions: parseComponents(row.deductions),
    employerContributions: parseComponents(row.employerContributions),
    totalEarnings: row.totalEarnings,
    totalDeductions: row.totalDeductions,
    employerContribution: row.employerContribution,
    ctc: row.ctc,
    netSalary: row.netSalary,
    assignmentCount: row._count?.assignments ?? 0,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function serializeAssignment(row: {
  id: string;
  templateId: string;
  employeeId: string;
  effectiveDate: Date;
  annualCtc: number;
  monthlySalary: number;
  payFrequency: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  employee?: { employeeCode: string; fullName: string; department: string; designation: string };
  template?: { structureCode: string; name: string };
}) {
  return {
    id: row.id,
    templateId: row.templateId,
    employeeId: row.employeeId,
    effectiveDate: row.effectiveDate.toISOString().slice(0, 10),
    annualCtc: row.annualCtc,
    monthlySalary: row.monthlySalary,
    payFrequency: row.payFrequency,
    status: row.status,
    employeeCode: row.employee?.employeeCode ?? '',
    employeeName: row.employee?.fullName ?? '',
    department: row.employee?.department ?? '',
    designation: row.employee?.designation ?? '',
    structureCode: row.template?.structureCode ?? '',
    structureName: row.template?.name ?? '',
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function nextStructureCode(institutionId: string) {
  const count = await prisma.hrSalaryStructureTemplate.count({ where: { institutionId } });
  return `SST${String(count + 1).padStart(4, '0')}`;
}

function normalizeComponents(input: unknown): SalaryStructureComponent[] {
  return parseComponents(input).map((c, i) => ({
    ...c,
    id: c.id || `cmp-${Date.now()}-${i}`,
    displayOrder: c.displayOrder || i + 1,
  }));
}

export async function listHrSalaryStructureTemplates(
  institutionId: string,
  filters?: { q?: string; status?: string },
) {
  const where: Prisma.HrSalaryStructureTemplateWhereInput = { institutionId };
  if (filters?.status) where.status = filters.status;
  if (filters?.q?.trim()) {
    const q = filters.q.trim();
    where.OR = [
      { structureCode: { contains: q, mode: 'insensitive' } },
      { name: { contains: q, mode: 'insensitive' } },
      { payGrade: { contains: q, mode: 'insensitive' } },
    ];
  }
  const rows = await prisma.hrSalaryStructureTemplate.findMany({
    where,
    include: { _count: { select: { assignments: true } } },
    orderBy: [{ status: 'asc' }, { name: 'asc' }],
  });
  return rows.map(serializeTemplate);
}

export async function getHrSalaryStructureTemplate(institutionId: string, id: string) {
  const row = await prisma.hrSalaryStructureTemplate.findFirst({
    where: { institutionId, id },
    include: { _count: { select: { assignments: true } } },
  });
  if (!row) throw new Error('Salary structure template not found');
  return serializeTemplate(row);
}

export async function createHrSalaryStructureTemplate(
  institutionId: string,
  data: {
    structureCode?: string;
    name: string;
    description?: string;
    payGrade?: string;
    payFrequency?: string;
    effectiveFrom: string;
    effectiveTo?: string | null;
    currency?: string;
    status?: string;
    earnings?: unknown;
    deductions?: unknown;
    employerContributions?: unknown;
  },
) {
  const earnings = normalizeComponents(data.earnings ?? []);
  const deductions = normalizeComponents(data.deductions ?? []);
  const employerContributions = normalizeComponents(data.employerContributions ?? []);
  const summary = computeTemplateSummary(earnings, deductions, employerContributions);

  const structureCode = data.structureCode?.trim() || (await nextStructureCode(institutionId));
  const existing = await prisma.hrSalaryStructureTemplate.findFirst({
    where: { institutionId, structureCode },
  });
  if (existing) throw new Error('Structure code already exists');

  const row = await prisma.hrSalaryStructureTemplate.create({
    data: {
      institutionId,
      structureCode,
      name: data.name.trim(),
      description: data.description ?? '',
      payGrade: data.payGrade ?? '',
      payFrequency: data.payFrequency ?? 'MONTHLY',
      effectiveFrom: new Date(data.effectiveFrom),
      effectiveTo: data.effectiveTo ? new Date(data.effectiveTo) : null,
      currency: data.currency ?? 'INR',
      status: data.status ?? 'ACTIVE',
      earnings: earnings as unknown as Prisma.InputJsonValue,
      deductions: deductions as unknown as Prisma.InputJsonValue,
      employerContributions: employerContributions as unknown as Prisma.InputJsonValue,
      ...summary,
    },
    include: { _count: { select: { assignments: true } } },
  });
  return serializeTemplate(row);
}

export async function updateHrSalaryStructureTemplate(
  institutionId: string,
  id: string,
  data: Partial<{
    structureCode: string;
    name: string;
    description: string;
    payGrade: string;
    payFrequency: string;
    effectiveFrom: string;
    effectiveTo: string | null;
    currency: string;
    status: string;
    earnings: unknown;
    deductions: unknown;
    employerContributions: unknown;
  }>,
) {
  const existing = await prisma.hrSalaryStructureTemplate.findFirst({
    where: { institutionId, id },
  });
  if (!existing) throw new Error('Salary structure template not found');

  if (data.structureCode && data.structureCode !== existing.structureCode) {
    const dup = await prisma.hrSalaryStructureTemplate.findFirst({
      where: { institutionId, structureCode: data.structureCode, NOT: { id } },
    });
    if (dup) throw new Error('Structure code already exists');
  }

  const earnings = data.earnings !== undefined ? normalizeComponents(data.earnings) : parseComponents(existing.earnings);
  const deductions =
    data.deductions !== undefined ? normalizeComponents(data.deductions) : parseComponents(existing.deductions);
  const employerContributions =
    data.employerContributions !== undefined
      ? normalizeComponents(data.employerContributions)
      : parseComponents(existing.employerContributions);
  const summary = computeTemplateSummary(earnings, deductions, employerContributions);

  const row = await prisma.hrSalaryStructureTemplate.update({
    where: { id },
    data: {
      structureCode: data.structureCode?.trim() || existing.structureCode,
      name: data.name?.trim() || existing.name,
      description: data.description ?? existing.description,
      payGrade: data.payGrade ?? existing.payGrade,
      payFrequency: data.payFrequency ?? existing.payFrequency,
      effectiveFrom: data.effectiveFrom ? new Date(data.effectiveFrom) : existing.effectiveFrom,
      effectiveTo:
        data.effectiveTo !== undefined
          ? data.effectiveTo
            ? new Date(data.effectiveTo)
            : null
          : existing.effectiveTo,
      currency: data.currency ?? existing.currency,
      status: data.status ?? existing.status,
      earnings: earnings as unknown as Prisma.InputJsonValue,
      deductions: deductions as unknown as Prisma.InputJsonValue,
      employerContributions: employerContributions as unknown as Prisma.InputJsonValue,
      ...summary,
    },
    include: { _count: { select: { assignments: true } } },
  });
  return serializeTemplate(row);
}

export async function cloneHrSalaryStructureTemplate(institutionId: string, id: string, name?: string) {
  const source = await getHrSalaryStructureTemplate(institutionId, id);
  const structureCode = await nextStructureCode(institutionId);
  return createHrSalaryStructureTemplate(institutionId, {
    structureCode,
    name: name?.trim() || `${source.name} (Copy)`,
    description: source.description,
    payGrade: source.payGrade,
    payFrequency: source.payFrequency,
    effectiveFrom: source.effectiveFrom,
    effectiveTo: source.effectiveTo,
    currency: source.currency,
    status: 'DRAFT',
    earnings: source.earnings,
    deductions: source.deductions,
    employerContributions: source.employerContributions,
  });
}

export async function previewHrSalaryStructure(data: {
  earnings?: unknown;
  deductions?: unknown;
  employerContributions?: unknown;
}) {
  const earnings = normalizeComponents(data.earnings ?? []);
  const deductions = normalizeComponents(data.deductions ?? []);
  const employerContributions = normalizeComponents(data.employerContributions ?? []);
  return computeTemplateSummary(earnings, deductions, employerContributions);
}

export async function listHrSalaryStructureAssignments(
  institutionId: string,
  filters?: { templateId?: string; employeeId?: string },
) {
  const where: Prisma.HrSalaryStructureAssignmentWhereInput = { institutionId };
  if (filters?.templateId) where.templateId = filters.templateId;
  if (filters?.employeeId) where.employeeId = filters.employeeId;
  const rows = await prisma.hrSalaryStructureAssignment.findMany({
    where,
    include: {
      employee: { select: { employeeCode: true, fullName: true, department: true, designation: true } },
      template: { select: { structureCode: true, name: true } },
    },
    orderBy: [{ effectiveDate: 'desc' }],
  });
  return rows.map(serializeAssignment);
}

function mapEarningsToPayroll(earnings: SalaryStructureComponent[]) {
  const find = (pattern: RegExp) =>
    earnings.find((e) => pattern.test(e.componentName) && e.status !== 'INACTIVE');
  const amt = (c?: SalaryStructureComponent) => (c ? componentAmount(c, 0) || c.fixedAmount : 0);
  const basic = find(/basic/i);
  const hra = find(/hra|house rent/i);
  const da = find(/\bda\b|dearness/i);
  const special = find(/special/i);
  const conveyance = find(/conveyance|transport/i);
  const other = earnings.filter(
    (e) =>
      e.status !== 'INACTIVE' &&
      e !== basic &&
      e !== hra &&
      e !== da &&
      e !== special &&
      e !== conveyance,
  );
  const otherSum = round2(other.reduce((s, e) => s + (componentAmount(e, amt(basic)) || e.fixedAmount), 0));
  return {
    basicSalary: amt(basic),
    hra: amt(hra),
    da: amt(da),
    specialAllowance: amt(special),
    conveyanceAllowance: amt(conveyance),
    otherAllowances: otherSum,
    tds: amt(find(/tds|tax/i)),
    otherDeductions: 0,
  };
}

export async function assignHrSalaryStructure(
  institutionId: string,
  data: {
    templateId: string;
    employeeId: string;
    effectiveDate: string;
    annualCtc?: number;
    monthlySalary?: number;
    payFrequency?: string;
    syncPayrollStructure?: boolean;
  },
  createdBy = 'system',
) {
  const template = await prisma.hrSalaryStructureTemplate.findFirst({
    where: { institutionId, id: data.templateId },
  });
  if (!template) throw new Error('Salary structure template not found');

  const employee = await prisma.payrollEmployee.findFirst({
    where: { institutionId, id: data.employeeId },
  });
  if (!employee) throw new Error('Employee not found');

  const monthlySalary = data.monthlySalary ?? template.netSalary;
  const annualCtc = data.annualCtc ?? round2(template.ctc * 12);

  await prisma.hrSalaryStructureAssignment.updateMany({
    where: { institutionId, employeeId: data.employeeId, status: 'ACTIVE' },
    data: { status: 'INACTIVE' },
  });

  const row = await prisma.hrSalaryStructureAssignment.create({
    data: {
      institutionId,
      templateId: data.templateId,
      employeeId: data.employeeId,
      effectiveDate: new Date(data.effectiveDate),
      annualCtc,
      monthlySalary,
      payFrequency: data.payFrequency ?? template.payFrequency,
      status: 'ACTIVE',
    },
    include: {
      employee: { select: { employeeCode: true, fullName: true, department: true, designation: true } },
      template: { select: { structureCode: true, name: true } },
    },
  });

  if (data.syncPayrollStructure !== false) {
    const earnings = parseComponents(template.earnings);
    const deductions = parseComponents(template.deductions);
    const mapped = mapEarningsToPayroll(earnings);
    const tds = deductions.find((d) => /tds|tax/i.test(d.componentName));
    const otherDed = deductions
      .filter((d) => d.status !== 'INACTIVE' && !/tds|tax|pf|epf|esi|esic|professional/i.test(d.componentName))
      .reduce((s, d) => s + (d.fixedAmount || 0), 0);
    try {
      await createSalaryStructure(
        institutionId,
        {
          employeeId: data.employeeId,
          effectiveFrom: data.effectiveDate,
          ...mapped,
          tds: tds ? tds.fixedAmount : mapped.tds,
          otherDeductions: otherDed,
          structureCode: `${template.structureCode}-${employee.employeeCode}`,
        },
        createdBy,
      );
    } catch {
      // payroll structure sync is best-effort
    }
  }

  return serializeAssignment(row);
}

export async function listSalaryStructureEmployeeOptions(institutionId: string) {
  const rows = await prisma.payrollEmployee.findMany({
    where: { institutionId, status: FeeMasterStatus.ACTIVE },
    select: { id: true, employeeCode: true, fullName: true, department: true, designation: true },
    orderBy: { fullName: 'asc' },
    take: 500,
  });
  return rows.map((e) => ({
    id: e.id,
    employeeCode: e.employeeCode,
    fullName: e.fullName,
    department: e.department,
    designation: e.designation,
    label: `${e.fullName} (${e.employeeCode})`,
  }));
}

function defaultTeachingComponents(): {
  earnings: SalaryStructureComponent[];
  deductions: SalaryStructureComponent[];
  employerContributions: SalaryStructureComponent[];
} {
  const mk = (
    name: string,
    fixed: number,
    opts: Partial<SalaryStructureComponent> = {},
  ): SalaryStructureComponent => ({
    id: `cmp-${name.replace(/\s/g, '-').toLowerCase()}`,
    componentName: name,
    formula: opts.formula ?? (fixed ? 'FIXED' : ''),
    percentage: opts.percentage ?? 0,
    fixedAmount: fixed,
    pfApplicable: opts.pfApplicable ?? false,
    esiApplicable: opts.esiApplicable ?? false,
    gratuity: opts.gratuity ?? false,
    taxable: opts.taxable !== false,
    displayOrder: opts.displayOrder ?? 1,
    status: 'ACTIVE',
  });

  return {
    earnings: [
      mk('Basic Salary', 25000, { pfApplicable: true, esiApplicable: true, displayOrder: 1 }),
      mk('HRA', 0, { percentage: 40, formula: '% of Basic', displayOrder: 2 }),
      mk('DA', 0, { percentage: 10, formula: '% of Basic', displayOrder: 3 }),
      mk('Special Allowance', 8000, { displayOrder: 4 }),
      mk('Conveyance Allowance', 1600, { displayOrder: 5 }),
    ],
    deductions: [
      mk('PF (Employee)', 0, { percentage: 12, formula: '% of Basic', pfApplicable: true, displayOrder: 1 }),
      mk('ESI (Employee)', 0, { percentage: 0.75, formula: '% of Gross', esiApplicable: true, displayOrder: 2 }),
      mk('Professional Tax', 200, { displayOrder: 3 }),
      mk('TDS', 1500, { displayOrder: 4 }),
    ],
    employerContributions: [
      mk('PF (Employer)', 0, { percentage: 12, formula: '% of Basic', pfApplicable: true, displayOrder: 1 }),
      mk('ESI (Employer)', 0, { percentage: 3.25, formula: '% of Gross', esiApplicable: true, displayOrder: 2 }),
      mk('Gratuity Provision', 0, { percentage: 4.81, formula: '% of Basic', gratuity: true, displayOrder: 3 }),
    ],
  };
}

export async function seedHrSalaryStructureDemo(institutionId: string) {
  const employeeCount = await prisma.payrollEmployee.count({ where: { institutionId } });
  if (employeeCount === 0) await seedEmployeeDirectoryDemo(institutionId);

  const existing = await prisma.hrSalaryStructureTemplate.count({ where: { institutionId } });
  if (existing > 0) {
    const templates = await listHrSalaryStructureTemplates(institutionId);
    const assignments = await listHrSalaryStructureAssignments(institutionId);
    const employees = await listSalaryStructureEmployeeOptions(institutionId);
    return { templates, assignments, employees };
  }

  const today = new Date();
  const effectiveFrom = `${today.getFullYear()}-04-01`;

  const templates = [];
  const defs = [
    { code: 'SST0001', name: 'Teaching Staff Structure', payGrade: 'Grade T1', ...defaultTeachingComponents() },
    {
      code: 'SST0002',
      name: 'Administrative Staff Structure',
      payGrade: 'Grade A1',
      ...defaultTeachingComponents(),
      earnings: defaultTeachingComponents().earnings.map((e) =>
        e.componentName === 'Basic Salary' ? { ...e, fixedAmount: 18000 } : e,
      ),
    },
    {
      code: 'SST0003',
      name: 'HR Executive Structure',
      payGrade: 'Grade H1',
      ...defaultTeachingComponents(),
      earnings: defaultTeachingComponents().earnings.map((e) =>
        e.componentName === 'Basic Salary' ? { ...e, fixedAmount: 22000 } : e,
      ),
    },
  ];

  for (const def of defs) {
    const summary = computeTemplateSummary(def.earnings, def.deductions, def.employerContributions);
    const row = await prisma.hrSalaryStructureTemplate.create({
      data: {
        institutionId,
        structureCode: def.code,
        name: def.name,
        description: `Standard ${def.name.toLowerCase()} for monthly payroll`,
        payGrade: def.payGrade,
        payFrequency: 'MONTHLY',
        effectiveFrom: new Date(effectiveFrom),
        currency: 'INR',
        status: 'ACTIVE',
        earnings: def.earnings as unknown as Prisma.InputJsonValue,
        deductions: def.deductions as unknown as Prisma.InputJsonValue,
        employerContributions: def.employerContributions as unknown as Prisma.InputJsonValue,
        ...summary,
      },
      include: { _count: { select: { assignments: true } } },
    });
    templates.push(serializeTemplate(row));
  }

  const employees = await prisma.payrollEmployee.findMany({
    where: { institutionId, status: FeeMasterStatus.ACTIVE },
    take: 5,
    orderBy: { fullName: 'asc' },
  });

  const assignments = [];
  for (let i = 0; i < employees.length; i++) {
    const template = templates[i % templates.length];
    try {
      const assignment = await assignHrSalaryStructure(institutionId, {
        templateId: template.id,
        employeeId: employees[i].id,
        effectiveDate: effectiveFrom,
        annualCtc: round2(template.ctc * 12),
        monthlySalary: template.netSalary,
        payFrequency: 'MONTHLY',
        syncPayrollStructure: i < 3,
      });
      assignments.push(assignment);
    } catch {
      // skip failed assignments
    }
  }

  const employeeOptions = await listSalaryStructureEmployeeOptions(institutionId);
  return { templates, assignments, employees: employeeOptions };
}
