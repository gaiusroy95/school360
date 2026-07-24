import { FeeMasterStatus, Prisma } from '@prisma/client';
import { prisma } from './prisma.js';

export type DesignationFilters = {
  q?: string;
  department?: string;
  designationType?: string;
  status?: string;
  page?: number;
  pageSize?: number;
};

export type DesignationRow = {
  id: string;
  name: string;
  department: string;
  designationType: string;
  totalPositions: number;
  filledPositions: number;
  vacantPositions: number;
  utilizationPct: number;
  status: string;
  statusLabel: string;
};

export type DepartmentSummaryRow = {
  department: string;
  totalPositions: number;
  filled: number;
  vacant: number;
};

export type DesignationsDashboard = {
  summary: {
    totalDesignations: number;
    totalPositions: number;
    filledPositions: number;
    vacantPositions: number;
    departmentCoverage: number;
    utilizationRate: number;
  };
  departmentSummary: DepartmentSummaryRow[];
  records: DesignationRow[];
  total: number;
  page: number;
  pageSize: number;
  filterOptions: {
    departments: string[];
    designationTypes: string[];
  };
};

function statusLabel(status: string) {
  return status === 'ACTIVE' ? 'Active' : status.replace(/_/g, ' ');
}

function utilizationPct(filled: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((filled / total) * 10000) / 100;
}

async function employeeFillCounts(institutionId: string) {
  const rows = await prisma.payrollEmployee.groupBy({
    by: ['designation', 'department'],
    where: { institutionId, status: FeeMasterStatus.ACTIVE },
    _count: { _all: true },
  });
  const map = new Map<string, number>();
  for (const row of rows) {
    const key = `${row.department.toLowerCase()}::${row.designation.toLowerCase()}`;
    map.set(key, row._count._all);
  }
  return map;
}

function serializeRow(
  row: {
    id: string;
    name: string;
    department: string;
    designationType: string;
    totalPositions: number;
    filledPositions: number;
    status: string;
  },
  employeeCounts: Map<string, number>,
): DesignationRow {
  const key = `${row.department.toLowerCase()}::${row.name.toLowerCase()}`;
  const empFilled = employeeCounts.get(key) ?? 0;
  const filled = Math.max(row.filledPositions, empFilled);
  const vacant = Math.max(0, row.totalPositions - filled);
  return {
    id: row.id,
    name: row.name,
    department: row.department,
    designationType: row.designationType,
    totalPositions: row.totalPositions,
    filledPositions: filled,
    vacantPositions: vacant,
    utilizationPct: utilizationPct(filled, row.totalPositions),
    status: row.status,
    statusLabel: statusLabel(row.status),
  };
}

export async function getDesignationsDashboard(
  institutionId: string,
  filters: DesignationFilters = {},
): Promise<DesignationsDashboard> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 20));

  const where: Prisma.HrDesignationWhereInput = { institutionId };
  if (filters.status) where.status = filters.status;
  if (filters.department) where.department = filters.department;
  if (filters.designationType) where.designationType = filters.designationType;
  if (filters.q?.trim()) {
    const term = filters.q.trim();
    where.OR = [
      { name: { contains: term, mode: 'insensitive' } },
      { department: { contains: term, mode: 'insensitive' } },
      { designationType: { contains: term, mode: 'insensitive' } },
    ];
  }

  const [allRows, pagedRows, departments, types, employeeCounts] = await Promise.all([
    prisma.hrDesignation.findMany({ where: { institutionId, status: 'ACTIVE' } }),
    prisma.hrDesignation.findMany({
      where,
      orderBy: [{ department: 'asc' }, { name: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.hrDesignation.findMany({
      where: { institutionId },
      select: { department: true },
      distinct: ['department'],
      orderBy: { department: 'asc' },
    }),
    prisma.hrDesignation.findMany({
      where: { institutionId },
      select: { designationType: true },
      distinct: ['designationType'],
      orderBy: { designationType: 'asc' },
    }),
    employeeFillCounts(institutionId),
  ]);

  const allSerialized = allRows.map((r) => serializeRow(r, employeeCounts));
  const totalPositions = allSerialized.reduce((s, r) => s + r.totalPositions, 0);
  const filledPositions = allSerialized.reduce((s, r) => s + r.filledPositions, 0);
  const vacantPositions = allSerialized.reduce((s, r) => s + r.vacantPositions, 0);

  const deptMap = new Map<string, DepartmentSummaryRow>();
  for (const row of allSerialized) {
    const existing = deptMap.get(row.department) ?? {
      department: row.department,
      totalPositions: 0,
      filled: 0,
      vacant: 0,
    };
    existing.totalPositions += row.totalPositions;
    existing.filled += row.filledPositions;
    existing.vacant += row.vacantPositions;
    deptMap.set(row.department, existing);
  }

  const departmentSummary = [...deptMap.values()].sort((a, b) => a.department.localeCompare(b.department));
  const total = await prisma.hrDesignation.count({ where });

  return {
    summary: {
      totalDesignations: allRows.length,
      totalPositions,
      filledPositions,
      vacantPositions,
      departmentCoverage: departmentSummary.length,
      utilizationRate: utilizationPct(filledPositions, totalPositions),
    },
    departmentSummary,
    records: pagedRows.map((r) => serializeRow(r, employeeCounts)),
    total,
    page,
    pageSize,
    filterOptions: {
      departments: departments.map((d) => d.department),
      designationTypes: types.map((t) => t.designationType),
    },
  };
}

export async function createHrDesignation(
  institutionId: string,
  data: {
    name: string;
    department: string;
    designationType?: string;
    totalPositions?: number;
    filledPositions?: number;
    status?: string;
  },
) {
  const name = data.name.trim();
  const department = data.department.trim();
  if (!name || !department) throw new Error('Designation name and department are required');

  const exists = await prisma.hrDesignation.findFirst({
    where: { institutionId, name, department },
  });
  if (exists) throw new Error(`Designation "${name}" already exists in ${department}`);

  const row = await prisma.hrDesignation.create({
    data: {
      institutionId,
      name,
      department,
      designationType: data.designationType || 'Teaching',
      totalPositions: data.totalPositions ?? 1,
      filledPositions: data.filledPositions ?? 0,
      status: data.status || 'ACTIVE',
    },
  });

  const employeeCounts = await employeeFillCounts(institutionId);
  return serializeRow(row, employeeCounts);
}

export async function updateHrDesignation(
  institutionId: string,
  id: string,
  data: Partial<{
    name: string;
    department: string;
    designationType: string;
    totalPositions: number;
    filledPositions: number;
    status: string;
  }>,
) {
  const existing = await prisma.hrDesignation.findFirst({ where: { id, institutionId } });
  if (!existing) throw new Error('Designation not found');

  const row = await prisma.hrDesignation.update({
    where: { id },
    data: {
      name: data.name?.trim(),
      department: data.department?.trim(),
      designationType: data.designationType,
      totalPositions: data.totalPositions,
      filledPositions: data.filledPositions,
      status: data.status,
    },
  });

  const employeeCounts = await employeeFillCounts(institutionId);
  return serializeRow(row, employeeCounts);
}

export async function deleteHrDesignation(institutionId: string, id: string) {
  const existing = await prisma.hrDesignation.findFirst({ where: { id, institutionId } });
  if (!existing) throw new Error('Designation not found');
  await prisma.hrDesignation.delete({ where: { id } });
  return { ok: true };
}

type SeedRow = [string, string, string, number, number];

const SEED_DESIGNATIONS: SeedRow[] = [
  ['Principal', 'Administration', 'Management', 1, 1],
  ['Vice Principal', 'Academics', 'Management', 2, 2],
  ['Academic Coordinator', 'Academics', 'Management', 3, 3],
  ['Senior Teacher', 'Academics', 'Teaching', 12, 10],
  ['Teacher', 'Academics', 'Teaching', 24, 20],
  ['Subject Teacher', 'Academics', 'Teaching', 18, 16],
  ['PGT Physics', 'Academics', 'Teaching', 4, 3],
  ['PGT Chemistry', 'Academics', 'Teaching', 4, 4],
  ['PGT Mathematics', 'Academics', 'Teaching', 4, 4],
  ['TGT English', 'Academics', 'Teaching', 6, 5],
  ['TGT Hindi', 'Academics', 'Teaching', 6, 5],
  ['TGT Science', 'Academics', 'Teaching', 6, 5],
  ['PRT Teacher', 'Academics', 'Teaching', 8, 7],
  ['Lab Assistant', 'Science Lab', 'Support Staff', 4, 3],
  ['Librarian', 'Library', 'Support Staff', 2, 2],
  ['Library Assistant', 'Library', 'Support Staff', 2, 1],
  ['Examination Controller', 'Examination', 'Management', 1, 1],
  ['Exam Cell Coordinator', 'Examination', 'Support Staff', 2, 2],
  ['Administrator', 'Administration', 'Management', 2, 2],
  ['Office Manager', 'Administration', 'Support Staff', 2, 2],
  ['Registrar', 'Administration', 'Management', 1, 1],
  ['Front Office Executive', 'Administration', 'Support Staff', 4, 4],
  ['HR Manager', 'HR', 'Management', 1, 1],
  ['HR Executive', 'HR', 'Support Staff', 2, 2],
  ['Finance Manager', 'Finance & Accounts', 'Finance', 1, 1],
  ['Accountant', 'Finance & Accounts', 'Finance', 4, 4],
  ['Cashier', 'Finance & Accounts', 'Finance', 2, 2],
  ['Accounts Assistant', 'Finance & Accounts', 'Finance', 2, 1],
  ['IT Manager', 'IT', 'IT', 1, 1],
  ['System Administrator', 'IT', 'IT', 2, 2],
  ['Web Developer', 'IT', 'IT', 2, 1],
  ['Data Entry Operator', 'IT', 'Non Teaching', 3, 3],
  ['Counselor', 'Counselling', 'Support Staff', 2, 2],
  ['Sports Coach', 'Sports', 'Support Staff', 3, 2],
  ['Music Teacher', 'Arts & Music', 'Teaching', 2, 2],
  ['Art Teacher', 'Arts & Music', 'Teaching', 2, 1],
  ['Hostel Warden', 'Hostel', 'Support Staff', 2, 2],
  ['Hostel Supervisor', 'Hostel', 'Support Staff', 3, 2],
  ['Transport Manager', 'Transport', 'Management', 1, 1],
  ['Driver', 'Transport', 'Non Teaching', 6, 5],
  ['Security Guard', 'Security', 'Non Teaching', 8, 7],
  ['Receptionist', 'Administration', 'Non Teaching', 2, 2],
  ['Clerk', 'Administration', 'Non Teaching', 4, 3],
  ['Peon', 'Administration', 'Non Teaching', 4, 4],
  ['Store Keeper', 'Store', 'Support Staff', 2, 2],
  ['Maintenance Supervisor', 'Maintenance', 'Support Staff', 2, 1],
  ['Electrician', 'Maintenance', 'Non Teaching', 2, 2],
  ['Nurse', 'Medical', 'Support Staff', 2, 1],
];

export async function seedHrDesignationsDemo(institutionId: string) {
  const existing = await prisma.hrDesignation.count({ where: { institutionId } });
  if (existing >= 40) {
    return getDesignationsDashboard(institutionId);
  }

  await prisma.hrDesignation.deleteMany({ where: { institutionId } });

  for (const [name, department, designationType, totalPositions, filledPositions] of SEED_DESIGNATIONS) {
    await prisma.hrDesignation.create({
      data: {
        institutionId,
        name,
        department,
        designationType,
        totalPositions,
        filledPositions,
        status: 'ACTIVE',
      },
    });
  }

  return getDesignationsDashboard(institutionId);
}

export const REFERENCE_DESIGNATIONS: Record<string, string[]> = {
  Management: [
    'Chairman',
    'Director',
    'Principal',
    'Vice Principal',
    'Dean',
    'Head of Department',
    'Academic Coordinator',
  ],
  'Academics (Teaching)': [
    'Professor',
    'Associate Professor',
    'Assistant Professor',
    'Senior Teacher',
    'Teacher',
    'Subject Teacher',
    'PGT',
    'TGT',
    'PRT',
  ],
  Administration: [
    'Administrator',
    'Office Manager',
    'Registrar',
    'Front Office Executive',
    'Personal Assistant',
    'Receptionist',
  ],
  'Finance & Accounts': [
    'Finance Manager',
    'Chief Accountant',
    'Accountant',
    'Accounts Assistant',
    'Cashier',
    'Billing Executive',
  ],
  'Support Staff': [
    'Librarian',
    'Lab Assistant',
    'Counselor',
    'Sports Coach',
    'Hostel Warden',
    'Store Keeper',
  ],
  'IT Department': [
    'IT Manager',
    'System Administrator',
    'Network Engineer',
    'Web Developer',
    'Data Entry Operator',
    'Technical Support',
  ],
  'Non Teaching': [
    'Clerk',
    'Receptionist',
    'Security Guard',
    'Peon',
    'Driver',
    'Electrician',
  ],
  'Other Departments': [
    'Driver',
    'Hostel Warden',
    'Sports Coach',
    'Transport Manager',
    'Maintenance Supervisor',
    'Nurse',
  ],
};
