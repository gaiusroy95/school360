import { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';

export const COMPONENT_TYPES = ['EARNING', 'DEDUCTION', 'EMPLOYER_CONTRIBUTION'] as const;
export const CALCULATION_TYPES = [
  'FIXED',
  'PERCENTAGE',
  'BASIC_PERCENT',
  'CTC_PERCENT',
  'ATTENDANCE_BASED',
  'SHIFT_BASED',
  'WORKING_DAYS',
  'PERFORMANCE_BASED',
  'CUSTOM_FORMULA',
] as const;

export const CALCULATION_TYPE_LABELS: Record<string, string> = {
  FIXED: 'Fixed',
  PERCENTAGE: 'Percentage',
  BASIC_PERCENT: 'Basic %',
  CTC_PERCENT: 'CTC %',
  ATTENDANCE_BASED: 'Attendance Based',
  SHIFT_BASED: 'Shift Based',
  WORKING_DAYS: 'Working Days',
  PERFORMANCE_BASED: 'Performance Based',
  CUSTOM_FORMULA: 'Custom Formula',
};

export type AdvancedSettings = {
  minAmount?: number;
  maxAmount?: number;
  roundTo?: number;
  includeInGross?: boolean;
  includeInNet?: boolean;
  proRata?: boolean;
  attendanceMultiplier?: number;
  shiftMultiplier?: number;
  performanceWeight?: number;
  remarks?: string;
};

function parseAdvanced(raw: unknown): AdvancedSettings {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return raw as AdvancedSettings;
}

function formulaLabel(calculationType: string, percentage: number, fixedAmount: number, formula: string): string {
  if (formula.trim()) return formula;
  switch (calculationType) {
    case 'FIXED':
      return `Fixed ₹${fixedAmount}`;
    case 'PERCENTAGE':
      return `${percentage}% of Gross`;
    case 'BASIC_PERCENT':
      return `${percentage}% of Basic`;
    case 'CTC_PERCENT':
      return `${percentage}% of CTC`;
    case 'ATTENDANCE_BASED':
      return 'Attendance Based';
    case 'SHIFT_BASED':
      return 'Shift Based';
    case 'WORKING_DAYS':
      return 'Working Days Pro-rata';
    case 'PERFORMANCE_BASED':
      return 'Performance Based';
    case 'CUSTOM_FORMULA':
      return formula || 'Custom Formula';
    default:
      return formula || calculationType;
  }
}

function serializeGroup(row: {
  id: string;
  code: string;
  name: string;
  description: string;
  status: string;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
  _count?: { components: number };
}) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    status: row.status,
    displayOrder: row.displayOrder,
    componentCount: row._count?.components ?? 0,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function serializeComponent(row: {
  id: string;
  groupId: string | null;
  code: string;
  name: string;
  componentType: string;
  calculationType: string;
  formula: string;
  percentage: number;
  fixedAmount: number;
  taxable: boolean;
  taxability: string;
  pfApplicable: boolean;
  esiApplicable: boolean;
  gratuity: boolean;
  displayOrder: number;
  status: string;
  description: string;
  advancedSettings: unknown;
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
  group?: { code: string; name: string } | null;
}) {
  return {
    id: row.id,
    groupId: row.groupId,
    groupCode: row.group?.code ?? '',
    groupName: row.group?.name ?? '',
    code: row.code,
    name: row.name,
    componentType: row.componentType,
    calculationType: row.calculationType,
    calculationTypeLabel: CALCULATION_TYPE_LABELS[row.calculationType] ?? row.calculationType,
    formula: row.formula,
    formulaDisplay: formulaLabel(row.calculationType, row.percentage, row.fixedAmount, row.formula),
    percentage: row.percentage,
    fixedAmount: row.fixedAmount,
    taxable: row.taxable,
    taxability: row.taxability,
    pfApplicable: row.pfApplicable,
    esiApplicable: row.esiApplicable,
    gratuity: row.gratuity,
    displayOrder: row.displayOrder,
    status: row.status,
    description: row.description,
    advancedSettings: parseAdvanced(row.advancedSettings),
    createdBy: row.createdBy,
    updatedBy: row.updatedBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function serializeMapping(row: {
  id: string;
  componentId: string;
  templateId: string | null;
  payGrade: string;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  priority: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  component?: { code: string; name: string; componentType: string };
  template?: { structureCode: string; name: string } | null;
}) {
  return {
    id: row.id,
    componentId: row.componentId,
    componentCode: row.component?.code ?? '',
    componentName: row.component?.name ?? '',
    componentType: row.component?.componentType ?? '',
    templateId: row.templateId,
    structureCode: row.template?.structureCode ?? '',
    structureName: row.template?.name ?? '',
    payGrade: row.payGrade,
    effectiveFrom: row.effectiveFrom.toISOString().slice(0, 10),
    effectiveTo: row.effectiveTo ? row.effectiveTo.toISOString().slice(0, 10) : null,
    priority: row.priority,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function serializeHistory(row: {
  id: string;
  componentId: string;
  action: string;
  changedBy: string;
  snapshot: unknown;
  remarks: string;
  createdAt: Date;
  component?: { code: string; name: string };
}) {
  return {
    id: row.id,
    componentId: row.componentId,
    componentCode: row.component?.code ?? '',
    componentName: row.component?.name ?? '',
    action: row.action,
    changedBy: row.changedBy,
    snapshot: row.snapshot,
    remarks: row.remarks,
    createdAt: row.createdAt.toISOString(),
  };
}

async function recordHistory(
  institutionId: string,
  componentId: string,
  action: string,
  snapshot: unknown,
  changedBy: string,
  remarks = '',
) {
  await prisma.hrSalaryComponentHistory.create({
    data: {
      institutionId,
      componentId,
      action,
      changedBy,
      snapshot: snapshot as Prisma.InputJsonValue,
      remarks,
    },
  });
}

async function nextComponentCode(institutionId: string, prefix: string) {
  const count = await prisma.hrSalaryComponent.count({ where: { institutionId, code: { startsWith: prefix } } });
  return `${prefix}${String(count + 1).padStart(3, '0')}`;
}

async function nextGroupCode(institutionId: string) {
  const count = await prisma.hrSalaryComponentGroup.count({ where: { institutionId } });
  return `GRP${String(count + 1).padStart(3, '0')}`;
}

export async function getAllowancesDeductionsDashboard(
  institutionId: string,
  filters?: {
    componentType?: string;
    groupId?: string;
    calculationType?: string;
    taxability?: string;
    status?: string;
    q?: string;
  },
) {
  const where: Prisma.HrSalaryComponentWhereInput = { institutionId };
  if (filters?.componentType) where.componentType = filters.componentType;
  if (filters?.groupId) where.groupId = filters.groupId;
  if (filters?.calculationType) where.calculationType = filters.calculationType;
  if (filters?.taxability) where.taxability = filters.taxability;
  if (filters?.status) where.status = filters.status;
  if (filters?.q?.trim()) {
    const q = filters.q.trim();
    where.OR = [
      { code: { contains: q, mode: 'insensitive' } },
      { name: { contains: q, mode: 'insensitive' } },
      { formula: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [groups, components, mappings, history, templates, summary] = await Promise.all([
    prisma.hrSalaryComponentGroup.findMany({
      where: { institutionId },
      include: { _count: { select: { components: true } } },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    }),
    prisma.hrSalaryComponent.findMany({
      where,
      include: { group: { select: { code: true, name: true } } },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    }),
    prisma.hrSalaryComponentMapping.findMany({
      where: { institutionId },
      include: {
        component: { select: { code: true, name: true, componentType: true } },
        template: { select: { structureCode: true, name: true } },
      },
      orderBy: [{ priority: 'asc' }, { effectiveFrom: 'desc' }],
    }),
    prisma.hrSalaryComponentHistory.findMany({
      where: { institutionId },
      include: { component: { select: { code: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.hrSalaryStructureTemplate.findMany({
      where: { institutionId, status: 'ACTIVE' },
      select: { id: true, structureCode: true, name: true, payGrade: true },
      orderBy: { name: 'asc' },
    }),
    prisma.hrSalaryComponent.groupBy({
      by: ['componentType', 'status'],
      where: { institutionId },
      _count: { id: true },
    }),
  ]);

  const typeCounts = { EARNING: 0, DEDUCTION: 0, EMPLOYER_CONTRIBUTION: 0 };
  const activeCounts = { EARNING: 0, DEDUCTION: 0, EMPLOYER_CONTRIBUTION: 0 };
  for (const row of summary) {
    const t = row.componentType as keyof typeof typeCounts;
    if (t in typeCounts) {
      typeCounts[t] += row._count.id;
      if (row.status === 'ACTIVE') activeCounts[t] += row._count.id;
    }
  }

  return {
    groups: groups.map(serializeGroup),
    components: components.map(serializeComponent),
    mappings: mappings.map(serializeMapping),
    history: history.map(serializeHistory),
    templates,
    summary: {
      totalGroups: groups.length,
      totalComponents: components.length,
      totalMappings: mappings.length,
      earnings: typeCounts.EARNING,
      deductions: typeCounts.DEDUCTION,
      employerContributions: typeCounts.EMPLOYER_CONTRIBUTION,
      activeEarnings: activeCounts.EARNING,
      activeDeductions: activeCounts.DEDUCTION,
      activeEmployer: activeCounts.EMPLOYER_CONTRIBUTION,
    },
    calculationTypes: CALCULATION_TYPES.map((v) => ({ value: v, label: CALCULATION_TYPE_LABELS[v] })),
  };
}

export async function getHrSalaryComponent(institutionId: string, id: string) {
  const row = await prisma.hrSalaryComponent.findFirst({
    where: { institutionId, id },
    include: { group: { select: { code: true, name: true } } },
  });
  if (!row) throw new Error('Component not found');
  const history = await prisma.hrSalaryComponentHistory.findMany({
    where: { componentId: id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  return {
    component: serializeComponent(row),
    history: history.map((h) => serializeHistory({ ...h, component: { code: row.code, name: row.name } })),
  };
}

export async function createHrSalaryComponentGroup(
  institutionId: string,
  data: { code?: string; name: string; description?: string; status?: string; displayOrder?: number },
) {
  const code = data.code?.trim() || (await nextGroupCode(institutionId));
  const existing = await prisma.hrSalaryComponentGroup.findFirst({ where: { institutionId, code } });
  if (existing) throw new Error('Group code already exists');
  const row = await prisma.hrSalaryComponentGroup.create({
    data: {
      institutionId,
      code,
      name: data.name.trim(),
      description: data.description ?? '',
      status: data.status ?? 'ACTIVE',
      displayOrder: data.displayOrder ?? 0,
    },
    include: { _count: { select: { components: true } } },
  });
  return serializeGroup(row);
}

export async function updateHrSalaryComponentGroup(
  institutionId: string,
  id: string,
  data: Partial<{ code: string; name: string; description: string; status: string; displayOrder: number }>,
) {
  const existing = await prisma.hrSalaryComponentGroup.findFirst({ where: { institutionId, id } });
  if (!existing) throw new Error('Group not found');
  const row = await prisma.hrSalaryComponentGroup.update({
    where: { id },
    data: {
      code: data.code?.trim() || existing.code,
      name: data.name?.trim() || existing.name,
      description: data.description ?? existing.description,
      status: data.status ?? existing.status,
      displayOrder: data.displayOrder ?? existing.displayOrder,
    },
    include: { _count: { select: { components: true } } },
  });
  return serializeGroup(row);
}

export async function deleteHrSalaryComponentGroup(institutionId: string, id: string) {
  const existing = await prisma.hrSalaryComponentGroup.findFirst({
    where: { institutionId, id },
    include: { _count: { select: { components: true } } },
  });
  if (!existing) throw new Error('Group not found');
  if (existing._count.components > 0) throw new Error('Cannot delete group with assigned components');
  await prisma.hrSalaryComponentGroup.delete({ where: { id } });
  return { ok: true };
}

export async function createHrSalaryComponent(
  institutionId: string,
  data: {
    code?: string;
    name: string;
    componentType: string;
    groupId?: string | null;
    calculationType?: string;
    formula?: string;
    percentage?: number;
    fixedAmount?: number;
    taxable?: boolean;
    taxability?: string;
    pfApplicable?: boolean;
    esiApplicable?: boolean;
    gratuity?: boolean;
    displayOrder?: number;
    status?: string;
    description?: string;
    advancedSettings?: AdvancedSettings;
  },
  createdBy = 'hr-admin',
) {
  const prefix =
    data.componentType === 'EARNING' ? 'ERN' : data.componentType === 'DEDUCTION' ? 'DED' : 'EMP';
  const code = data.code?.trim() || (await nextComponentCode(institutionId, prefix));
  const existing = await prisma.hrSalaryComponent.findFirst({ where: { institutionId, code } });
  if (existing) throw new Error('Component code already exists');

  const row = await prisma.hrSalaryComponent.create({
    data: {
      institutionId,
      groupId: data.groupId || null,
      code,
      name: data.name.trim(),
      componentType: data.componentType,
      calculationType: data.calculationType ?? 'FIXED',
      formula: data.formula ?? '',
      percentage: data.percentage ?? 0,
      fixedAmount: data.fixedAmount ?? 0,
      taxable: data.taxable !== false,
      taxability: data.taxability ?? 'TAXABLE',
      pfApplicable: data.pfApplicable ?? false,
      esiApplicable: data.esiApplicable ?? false,
      gratuity: data.gratuity ?? false,
      displayOrder: data.displayOrder ?? 0,
      status: data.status ?? 'ACTIVE',
      description: data.description ?? '',
      advancedSettings: (data.advancedSettings ?? {}) as Prisma.InputJsonValue,
      createdBy,
      updatedBy: createdBy,
    },
    include: { group: { select: { code: true, name: true } } },
  });

  await recordHistory(institutionId, row.id, 'CREATE', serializeComponent(row), createdBy, 'Component created');
  return serializeComponent(row);
}

export async function updateHrSalaryComponent(
  institutionId: string,
  id: string,
  data: Partial<{
    code: string;
    name: string;
    componentType: string;
    groupId: string | null;
    calculationType: string;
    formula: string;
    percentage: number;
    fixedAmount: number;
    taxable: boolean;
    taxability: string;
    pfApplicable: boolean;
    esiApplicable: boolean;
    gratuity: boolean;
    displayOrder: number;
    status: string;
    description: string;
    advancedSettings: AdvancedSettings;
  }>,
  updatedBy = 'hr-admin',
) {
  const existing = await prisma.hrSalaryComponent.findFirst({
    where: { institutionId, id },
    include: { group: { select: { code: true, name: true } } },
  });
  if (!existing) throw new Error('Component not found');

  if (data.code && data.code !== existing.code) {
    const dup = await prisma.hrSalaryComponent.findFirst({
      where: { institutionId, code: data.code, NOT: { id } },
    });
    if (dup) throw new Error('Component code already exists');
  }

  const before = serializeComponent(existing);
  const row = await prisma.hrSalaryComponent.update({
    where: { id },
    data: {
      code: data.code?.trim() || existing.code,
      name: data.name?.trim() || existing.name,
      componentType: data.componentType ?? existing.componentType,
      groupId: data.groupId !== undefined ? data.groupId : existing.groupId,
      calculationType: data.calculationType ?? existing.calculationType,
      formula: data.formula ?? existing.formula,
      percentage: data.percentage ?? existing.percentage,
      fixedAmount: data.fixedAmount ?? existing.fixedAmount,
      taxable: data.taxable ?? existing.taxable,
      taxability: data.taxability ?? existing.taxability,
      pfApplicable: data.pfApplicable ?? existing.pfApplicable,
      esiApplicable: data.esiApplicable ?? existing.esiApplicable,
      gratuity: data.gratuity ?? existing.gratuity,
      displayOrder: data.displayOrder ?? existing.displayOrder,
      status: data.status ?? existing.status,
      description: data.description ?? existing.description,
      advancedSettings:
        data.advancedSettings !== undefined
          ? (data.advancedSettings as Prisma.InputJsonValue)
          : (existing.advancedSettings as Prisma.InputJsonValue),
      updatedBy,
    },
    include: { group: { select: { code: true, name: true } } },
  });

  const after = serializeComponent(row);
  await recordHistory(institutionId, id, 'UPDATE', { before, after }, updatedBy, 'Component updated');
  return after;
}

export async function deleteHrSalaryComponent(institutionId: string, id: string, deletedBy = 'hr-admin') {
  const existing = await prisma.hrSalaryComponent.findFirst({
    where: { institutionId, id },
    include: { group: { select: { code: true, name: true } } },
  });
  if (!existing) throw new Error('Component not found');
  await recordHistory(
    institutionId,
    id,
    'DELETE',
    serializeComponent(existing),
    deletedBy,
    'Component deleted',
  );
  await prisma.hrSalaryComponentMapping.deleteMany({ where: { componentId: id } });
  await prisma.hrSalaryComponent.delete({ where: { id } });
  return { ok: true };
}

export async function createHrSalaryComponentMapping(
  institutionId: string,
  data: {
    componentId: string;
    templateId?: string | null;
    payGrade?: string;
    effectiveFrom: string;
    effectiveTo?: string | null;
    priority?: number;
    status?: string;
  },
) {
  const component = await prisma.hrSalaryComponent.findFirst({
    where: { institutionId, id: data.componentId },
  });
  if (!component) throw new Error('Component not found');

  if (data.templateId) {
    const template = await prisma.hrSalaryStructureTemplate.findFirst({
      where: { institutionId, id: data.templateId },
    });
    if (!template) throw new Error('Salary structure template not found');
  }

  const row = await prisma.hrSalaryComponentMapping.create({
    data: {
      institutionId,
      componentId: data.componentId,
      templateId: data.templateId || null,
      payGrade: data.payGrade ?? '',
      effectiveFrom: new Date(data.effectiveFrom),
      effectiveTo: data.effectiveTo ? new Date(data.effectiveTo) : null,
      priority: data.priority ?? 0,
      status: data.status ?? 'ACTIVE',
    },
    include: {
      component: { select: { code: true, name: true, componentType: true } },
      template: { select: { structureCode: true, name: true } },
    },
  });
  return serializeMapping(row);
}

export async function deleteHrSalaryComponentMapping(institutionId: string, id: string) {
  const existing = await prisma.hrSalaryComponentMapping.findFirst({ where: { institutionId, id } });
  if (!existing) throw new Error('Mapping not found');
  await prisma.hrSalaryComponentMapping.delete({ where: { id } });
  return { ok: true };
}

export function previewComponentFormula(data: {
  calculationType: string;
  percentage?: number;
  fixedAmount?: number;
  formula?: string;
  advancedSettings?: AdvancedSettings;
  basicSalary?: number;
  grossSalary?: number;
  ctc?: number;
  attendanceDays?: number;
  workingDays?: number;
}) {
  const basic = data.basicSalary ?? 25000;
  const gross = data.grossSalary ?? 45000;
  const ctc = data.ctc ?? 55000;
  const attendanceDays = data.attendanceDays ?? 26;
  const workingDays = data.workingDays ?? 30;
  const pct = data.percentage ?? 0;
  const fixed = data.fixedAmount ?? 0;
  const adv = data.advancedSettings ?? {};

  let amount = 0;
  let explanation = '';

  switch (data.calculationType) {
    case 'FIXED':
      amount = fixed;
      explanation = `Fixed amount ₹${fixed}`;
      break;
    case 'PERCENTAGE':
      amount = (gross * pct) / 100;
      explanation = `${pct}% of Gross (₹${gross})`;
      break;
    case 'BASIC_PERCENT':
      amount = (basic * pct) / 100;
      explanation = `${pct}% of Basic (₹${basic})`;
      break;
    case 'CTC_PERCENT':
      amount = (ctc * pct) / 100;
      explanation = `${pct}% of CTC (₹${ctc})`;
      break;
    case 'ATTENDANCE_BASED': {
      const mult = adv.attendanceMultiplier ?? 1;
      amount = (fixed * attendanceDays * mult) / workingDays;
      explanation = `₹${fixed} × ${attendanceDays}/${workingDays} days`;
      break;
    }
    case 'SHIFT_BASED': {
      const mult = adv.shiftMultiplier ?? 1.1;
      amount = fixed * mult;
      explanation = `₹${fixed} × shift multiplier ${mult}`;
      break;
    }
    case 'WORKING_DAYS':
      amount = (fixed * attendanceDays) / workingDays;
      explanation = `Pro-rata ₹${fixed} for ${attendanceDays}/${workingDays} working days`;
      break;
    case 'PERFORMANCE_BASED': {
      const weight = adv.performanceWeight ?? 1;
      amount = fixed * weight;
      explanation = `₹${fixed} × performance weight ${weight}`;
      break;
    }
    case 'CUSTOM_FORMULA':
      amount = fixed;
      explanation = data.formula || 'Custom formula — enter test values manually';
      break;
    default:
      amount = fixed;
      explanation = data.formula || data.calculationType;
  }

  if (adv.minAmount != null) amount = Math.max(amount, adv.minAmount);
  if (adv.maxAmount != null) amount = Math.min(amount, adv.maxAmount);
  if (adv.roundTo != null && adv.roundTo > 0) {
    amount = Math.round(amount / adv.roundTo) * adv.roundTo;
  } else {
    amount = Math.round(amount * 100) / 100;
  }

  return { amount, explanation, inputs: { basic, gross, ctc, attendanceDays, workingDays } };
}

export async function seedHrAllowancesDeductionsDemo(institutionId: string) {
  const existing = await prisma.hrSalaryComponent.count({ where: { institutionId } });
  if (existing > 0) {
    return getAllowancesDeductionsDashboard(institutionId);
  }

  const groupDefs = [
    { code: 'GRP001', name: 'Basic Pay', description: 'Core salary components', displayOrder: 1 },
    { code: 'GRP002', name: 'Allowances', description: 'Housing, transport and other allowances', displayOrder: 2 },
    { code: 'GRP003', name: 'Statutory', description: 'PF, ESI and statutory deductions', displayOrder: 3 },
    { code: 'GRP004', name: 'Reimbursements', description: 'Reimbursable expense components', displayOrder: 4 },
    { code: 'GRP005', name: 'Employer Statutory', description: 'Employer-side statutory contributions', displayOrder: 5 },
  ];

  const groups: Record<string, string> = {};
  for (const g of groupDefs) {
    const row = await prisma.hrSalaryComponentGroup.create({
      data: { institutionId, ...g },
    });
    groups[g.code] = row.id;
  }

  const componentDefs: Array<{
    code: string;
    name: string;
    componentType: string;
    groupCode: string;
    calculationType: string;
    percentage: number;
    fixedAmount: number;
    formula: string;
    taxable: boolean;
    taxability: string;
    pfApplicable: boolean;
    esiApplicable: boolean;
    gratuity: boolean;
    displayOrder: number;
    description: string;
    advancedSettings?: AdvancedSettings;
  }> = [
    { code: 'ERN001', name: 'Basic Salary', componentType: 'EARNING', groupCode: 'GRP001', calculationType: 'FIXED', percentage: 0, fixedAmount: 25000, formula: 'Fixed monthly basic', taxable: true, taxability: 'TAXABLE', pfApplicable: true, esiApplicable: true, gratuity: true, displayOrder: 1, description: 'Core basic pay component' },
    { code: 'ERN002', name: 'HRA', componentType: 'EARNING', groupCode: 'GRP002', calculationType: 'BASIC_PERCENT', percentage: 40, fixedAmount: 0, formula: '40% of Basic', taxable: true, taxability: 'PARTIALLY_TAXABLE', pfApplicable: false, esiApplicable: false, gratuity: false, displayOrder: 2, description: 'House Rent Allowance' },
    { code: 'ERN003', name: 'DA', componentType: 'EARNING', groupCode: 'GRP002', calculationType: 'BASIC_PERCENT', percentage: 10, fixedAmount: 0, formula: '10% of Basic', taxable: true, taxability: 'TAXABLE', pfApplicable: true, esiApplicable: true, gratuity: false, displayOrder: 3, description: 'Dearness Allowance' },
    { code: 'ERN004', name: 'Special Allowance', componentType: 'EARNING', groupCode: 'GRP002', calculationType: 'FIXED', percentage: 0, fixedAmount: 8000, formula: 'Fixed', taxable: true, taxability: 'TAXABLE', pfApplicable: false, esiApplicable: true, gratuity: false, displayOrder: 4, description: 'Flexible special allowance' },
    { code: 'ERN005', name: 'Conveyance Allowance', componentType: 'EARNING', groupCode: 'GRP002', calculationType: 'FIXED', percentage: 0, fixedAmount: 1600, formula: 'Fixed', taxable: false, taxability: 'NON_TAXABLE', pfApplicable: false, esiApplicable: false, gratuity: false, displayOrder: 5, description: 'Transport reimbursement' },
    { code: 'ERN006', name: 'Medical Allowance', componentType: 'EARNING', groupCode: 'GRP004', calculationType: 'FIXED', percentage: 0, fixedAmount: 1250, formula: 'Fixed', taxable: false, taxability: 'NON_TAXABLE', pfApplicable: false, esiApplicable: false, gratuity: false, displayOrder: 6, description: 'Medical reimbursement' },
    { code: 'ERN007', name: 'Attendance Bonus', componentType: 'EARNING', groupCode: 'GRP002', calculationType: 'ATTENDANCE_BASED', percentage: 0, fixedAmount: 2000, formula: 'Based on attendance', taxable: true, taxability: 'TAXABLE', pfApplicable: false, esiApplicable: false, gratuity: false, displayOrder: 7, description: 'Bonus for full attendance', advancedSettings: { attendanceMultiplier: 1, proRata: true } },
    { code: 'DED001', name: 'PF (Employee)', componentType: 'DEDUCTION', groupCode: 'GRP003', calculationType: 'BASIC_PERCENT', percentage: 12, fixedAmount: 0, formula: '12% of Basic', taxable: false, taxability: 'NON_TAXABLE', pfApplicable: true, esiApplicable: false, gratuity: false, displayOrder: 1, description: 'Employee PF contribution' },
    { code: 'DED002', name: 'ESI (Employee)', componentType: 'DEDUCTION', groupCode: 'GRP003', calculationType: 'PERCENTAGE', percentage: 0.75, fixedAmount: 0, formula: '0.75% of Gross', taxable: false, taxability: 'NON_TAXABLE', pfApplicable: false, esiApplicable: true, gratuity: false, displayOrder: 2, description: 'Employee ESI contribution' },
    { code: 'DED003', name: 'Professional Tax', componentType: 'DEDUCTION', groupCode: 'GRP003', calculationType: 'FIXED', percentage: 0, fixedAmount: 200, formula: 'Fixed', taxable: false, taxability: 'NON_TAXABLE', pfApplicable: false, esiApplicable: false, gratuity: false, displayOrder: 3, description: 'State professional tax' },
    { code: 'DED004', name: 'TDS', componentType: 'DEDUCTION', groupCode: 'GRP003', calculationType: 'CUSTOM_FORMULA', percentage: 0, fixedAmount: 1500, formula: 'As per IT slab', taxable: false, taxability: 'NON_TAXABLE', pfApplicable: false, esiApplicable: false, gratuity: false, displayOrder: 4, description: 'Income tax deduction' },
    { code: 'DED005', name: 'LWP Deduction', componentType: 'DEDUCTION', groupCode: 'GRP003', calculationType: 'WORKING_DAYS', percentage: 0, fixedAmount: 0, formula: 'Per day salary × LWP days', taxable: false, taxability: 'NON_TAXABLE', pfApplicable: false, esiApplicable: false, gratuity: false, displayOrder: 5, description: 'Leave without pay deduction', advancedSettings: { proRata: true } },
    { code: 'DED006', name: 'Late Coming Deduction', componentType: 'DEDUCTION', groupCode: 'GRP003', calculationType: 'SHIFT_BASED', percentage: 0, fixedAmount: 500, formula: 'Per late instance', taxable: false, taxability: 'NON_TAXABLE', pfApplicable: false, esiApplicable: false, gratuity: false, displayOrder: 6, description: 'Deduction for late attendance', advancedSettings: { shiftMultiplier: 1 } },
    { code: 'EMP001', name: 'PF (Employer)', componentType: 'EMPLOYER_CONTRIBUTION', groupCode: 'GRP005', calculationType: 'BASIC_PERCENT', percentage: 12, fixedAmount: 0, formula: '12% of Basic', taxable: false, taxability: 'NON_TAXABLE', pfApplicable: true, esiApplicable: false, gratuity: false, displayOrder: 1, description: 'Employer PF contribution' },
    { code: 'EMP002', name: 'ESI (Employer)', componentType: 'EMPLOYER_CONTRIBUTION', groupCode: 'GRP005', calculationType: 'PERCENTAGE', percentage: 3.25, fixedAmount: 0, formula: '3.25% of Gross', taxable: false, taxability: 'NON_TAXABLE', pfApplicable: false, esiApplicable: true, gratuity: false, displayOrder: 2, description: 'Employer ESI contribution' },
    { code: 'EMP003', name: 'Gratuity Provision', componentType: 'EMPLOYER_CONTRIBUTION', groupCode: 'GRP005', calculationType: 'BASIC_PERCENT', percentage: 4.81, fixedAmount: 0, formula: '4.81% of Basic', taxable: false, taxability: 'NON_TAXABLE', pfApplicable: false, esiApplicable: false, gratuity: true, displayOrder: 3, description: 'Gratuity accrual provision' },
  ];

  const createdComponents: string[] = [];
  for (const c of componentDefs) {
    const row = await prisma.hrSalaryComponent.create({
      data: {
        institutionId,
        groupId: groups[c.groupCode],
        code: c.code,
        name: c.name,
        componentType: c.componentType,
        calculationType: c.calculationType,
        formula: c.formula,
        percentage: c.percentage,
        fixedAmount: c.fixedAmount,
        taxable: c.taxable,
        taxability: c.taxability,
        pfApplicable: c.pfApplicable,
        esiApplicable: c.esiApplicable,
        gratuity: c.gratuity,
        displayOrder: c.displayOrder,
        status: 'ACTIVE',
        description: c.description,
        advancedSettings: (c.advancedSettings ?? {}) as Prisma.InputJsonValue,
        createdBy: 'system',
        updatedBy: 'system',
      },
    });
    createdComponents.push(row.id);
    await recordHistory(institutionId, row.id, 'CREATE', { code: c.code, name: c.name }, 'system', 'Demo seed');
  }

  const templates = await prisma.hrSalaryStructureTemplate.findMany({
    where: { institutionId },
    take: 3,
  });
  const today = new Date();
  const effectiveFrom = new Date(today.getFullYear(), 3, 1);

  for (let i = 0; i < Math.min(templates.length, createdComponents.length); i++) {
    await prisma.hrSalaryComponentMapping.create({
      data: {
        institutionId,
        componentId: createdComponents[i],
        templateId: templates[i % templates.length].id,
        payGrade: templates[i % templates.length].payGrade,
        effectiveFrom,
        priority: i + 1,
        status: 'ACTIVE',
      },
    });
  }

  return getAllowancesDeductionsDashboard(institutionId);
}
