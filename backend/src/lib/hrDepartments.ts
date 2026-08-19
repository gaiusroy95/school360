import { FeeMasterStatus, LeaveApplicationStatus, Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { seedEmployeeDirectoryDemo } from './employeeDirectory.js';
import {
  departmentMatchFilter,
  resolveEmployeeRef,
  syncAllEmployeesToDepartments,
} from './employeeDepartmentSync.js';

export type DeptSettings = {
  leavePolicy?: string;
  workingHours?: string;
  overtimePolicy?: string;
  holidayCalendar?: string;
  approvalAuthority?: string;
  documentAccess?: string;
  budgetControl?: string;
};

export type StructureNode = {
  id: string;
  label: string;
  children?: StructureNode[];
};

function parseJsonArray<T>(raw: unknown): T[] {
  if (!Array.isArray(raw)) return [];
  return raw as T[];
}

function parseSettings(raw: unknown): DeptSettings {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return raw as DeptSettings;
}

async function employeeBrief(institutionId: string, employeeId: string) {
  if (!employeeId) return null;
  const emp = await resolveEmployeeRef(institutionId, employeeId);
  return emp
    ? {
        id: emp.id,
        employeeCode: emp.employeeCode,
        fullName: emp.fullName,
        designation: emp.designation,
        label: `${emp.fullName} (${emp.employeeCode})`,
      }
    : null;
}

function serializeDepartment(row: {
  id: string;
  code: string;
  name: string;
  parentId: string | null;
  headEmployeeId: string;
  reportsToEmployeeId: string;
  shortDescription: string;
  detailedDescription: string;
  campus: string;
  status: string;
  budgetAllocation: number;
  costCenter: string;
  email: string;
  phone: string;
  workingDays: unknown;
  logoUrl: string;
  notes: string;
  functions: unknown;
  structureTree: unknown;
  settings: unknown;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    parentId: row.parentId,
    headEmployeeId: row.headEmployeeId,
    reportsToEmployeeId: row.reportsToEmployeeId,
    shortDescription: row.shortDescription,
    detailedDescription: row.detailedDescription,
    campus: row.campus,
    status: row.status,
    budgetAllocation: row.budgetAllocation,
    costCenter: row.costCenter,
    email: row.email,
    phone: row.phone,
    workingDays: parseJsonArray<string>(row.workingDays),
    logoUrl: row.logoUrl,
    notes: row.notes,
    functions: parseJsonArray<string>(row.functions),
    structureTree: parseJsonArray<StructureNode>(row.structureTree),
    settings: parseSettings(row.settings),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function employeeOnLeaveToday(institutionId: string, employeeIds: string[]) {
  if (!employeeIds.length) return new Set<string>();
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

  const staffProfiles = await prisma.staffAttendanceProfile.findMany({
    where: { institutionId, employeeCode: { in: employeeIds } },
    select: { id: true, employeeCode: true },
  });
  const profileIds = staffProfiles.map((p) => p.id);
  if (!profileIds.length) return new Set<string>();

  const leaves = await prisma.staffLeaveApplication.findMany({
    where: {
      institutionId,
      staffProfileId: { in: profileIds },
      status: LeaveApplicationStatus.APPROVED,
      fromDate: { lte: end },
      toDate: { gte: start },
    },
    select: { staffProfileId: true },
  });
  const onLeaveProfileIds = new Set(leaves.map((l) => l.staffProfileId));
  const codes = new Set<string>();
  for (const p of staffProfiles) {
    if (onLeaveProfileIds.has(p.id)) codes.add(p.employeeCode);
  }
  return codes;
}

export async function listHrDepartments(
  institutionId: string,
  q?: string,
  opts?: { includeDeleted?: boolean },
) {
  const where: Prisma.HrDepartmentWhereInput = { institutionId };
  if (!opts?.includeDeleted) {
    where.NOT = { status: 'DELETED' };
  }
  if (q?.trim()) {
    const term = q.trim();
    where.OR = [
      { name: { contains: term, mode: 'insensitive' } },
      { code: { contains: term, mode: 'insensitive' } },
    ];
  }
  const rows = await prisma.hrDepartment.findMany({
    where,
    orderBy: [{ name: 'asc' }],
  });
  return rows.map(serializeDepartment);
}

export async function getHrDepartment(institutionId: string, id: string) {
  const row = await prisma.hrDepartment.findFirst({ where: { id, institutionId } });
  if (!row) throw new Error('Department not found');
  if (row.status === 'DELETED') throw new Error('Department was deleted');

  const dept = serializeDepartment(row);
  const parent = row.parentId
    ? await prisma.hrDepartment.findFirst({ where: { id: row.parentId, institutionId } })
    : null;
  const children = await prisma.hrDepartment.findMany({
    where: { institutionId, parentId: row.id, NOT: { status: 'DELETED' } },
    orderBy: { name: 'asc' },
  });

  let headId = dept.headEmployeeId;
  let reportsToId = dept.reportsToEmployeeId;
  if (!headId) {
    const hod = await prisma.payrollEmployee.findFirst({
      where: {
        institutionId,
        AND: [
          departmentMatchFilter({ name: dept.name, code: dept.code }),
          {
            OR: [
              { designation: { contains: 'Head', mode: 'insensitive' } },
              { designation: { contains: 'HOD', mode: 'insensitive' } },
              { designation: { contains: 'Principal', mode: 'insensitive' } },
            ],
          },
        ],
      },
      select: { id: true },
    });
    if (hod) headId = hod.id;
  }
  if (!reportsToId && parent?.headEmployeeId) {
    reportsToId = parent.headEmployeeId;
  }

  const [head, reportsTo, employees, parents] = await Promise.all([
    employeeBrief(institutionId, headId),
    employeeBrief(institutionId, reportsToId),
    listDepartmentEmployees(institutionId, dept.name, undefined, dept.code),
    listHrDepartments(institutionId),
  ]);

  if (
    (headId && headId !== row.headEmployeeId) ||
    (reportsToId && reportsToId !== row.reportsToEmployeeId)
  ) {
    await prisma.hrDepartment.update({
      where: { id: row.id },
      data: {
        ...(headId && headId !== row.headEmployeeId ? { headEmployeeId: headId } : {}),
        ...(reportsToId && reportsToId !== row.reportsToEmployeeId ? { reportsToEmployeeId: reportsToId } : {}),
      },
    });
  }

  const liveTree = [
    ...(parent
      ? [{ id: parent.id, label: `${parent.name} (${parent.code})`, children: [] as { id: string; label: string }[] }]
      : []),
    {
      id: row.id,
      label: `${dept.name} (${dept.code})`,
      children: children.map((c) => ({ id: c.id, label: `${c.name} (${c.code})` })),
    },
  ];
  const structureTree = parent || children.length ? liveTree : (dept.structureTree.length ? dept.structureTree : liveTree);

  return {
    ...dept,
    headEmployeeId: headId,
    reportsToEmployeeId: reportsToId,
    head,
    reportsTo,
    employees,
    parent: parent ? { id: parent.id, name: parent.name, code: parent.code } : null,
    structureTree,
    parentOptions: parents.filter((p: { id: string }) => p.id !== id).map((p) => ({ id: p.id, name: p.name, code: p.code })),
  };
}

export async function listDepartmentEmployees(
  institutionId: string,
  departmentName: string,
  filters?: { q?: string; status?: string; designation?: string },
  departmentCode?: string,
) {
  const where: Prisma.PayrollEmployeeWhereInput = {
    institutionId,
    ...departmentMatchFilter({ name: departmentName, code: departmentCode || departmentName }),
  };
  if (filters?.designation) {
    where.designation = { contains: filters.designation, mode: 'insensitive' };
  }
  if (filters?.q?.trim()) {
    const term = filters.q.trim();
    where.AND = [
      {
        OR: [
          { fullName: { contains: term, mode: 'insensitive' } },
          { employeeCode: { contains: term, mode: 'insensitive' } },
          { designation: { contains: term, mode: 'insensitive' } },
        ],
      },
    ];
  }

  const rows = await prisma.payrollEmployee.findMany({
    where,
    orderBy: [{ fullName: 'asc' }],
  });

  const onLeaveCodes = await employeeOnLeaveToday(
    institutionId,
    rows.map((r) => r.employeeCode),
  );

  let results = rows.map((r) => {
    const onLeave = onLeaveCodes.has(r.employeeCode);
    const status = onLeave ? 'ON_LEAVE' : r.status;
    return {
      id: r.id,
      employeeCode: r.employeeCode,
      fullName: r.fullName,
      designation: r.designation,
      mobile: r.mobile,
      email: r.email,
      status,
      statusLabel:
        onLeave ? 'On Leave' : r.status === FeeMasterStatus.ACTIVE ? 'Active' : r.status.replace(/_/g, ' '),
    };
  });

  if (filters?.status === 'ON_LEAVE') results = results.filter((r) => r.status === 'ON_LEAVE');
  if (filters?.status === 'ACTIVE') results = results.filter((r) => r.status === FeeMasterStatus.ACTIVE);

  return results.map((r, idx) => ({ ...r, index: idx + 1 }));
}

export async function createHrDepartment(
  institutionId: string,
  data: {
    code: string;
    name: string;
    parentId?: string | null;
    headEmployeeId?: string;
    reportsToEmployeeId?: string;
    shortDescription?: string;
    detailedDescription?: string;
    campus?: string;
    status?: string;
    budgetAllocation?: number;
    costCenter?: string;
    email?: string;
    phone?: string;
    workingDays?: string[];
    logoUrl?: string;
    notes?: string;
    functions?: string[];
    structureTree?: StructureNode[];
    settings?: DeptSettings;
  },
) {
  const code = data.code.trim().toUpperCase();
  const name = data.name.trim();
  if (!code || !name) throw new Error('Department code and name are required');

  const exists = await prisma.hrDepartment.findFirst({ where: { institutionId, code } });
  if (exists) throw new Error(`Department code ${code} already exists`);

  const row = await prisma.hrDepartment.create({
    data: {
      institutionId,
      code,
      name,
      parentId: data.parentId || null,
      headEmployeeId: data.headEmployeeId || '',
      reportsToEmployeeId: data.reportsToEmployeeId || '',
      shortDescription: data.shortDescription || '',
      detailedDescription: data.detailedDescription || '',
      campus: data.campus || 'Main Campus',
      status: data.status || 'ACTIVE',
      budgetAllocation: data.budgetAllocation ?? 0,
      costCenter: data.costCenter || '',
      email: data.email || '',
      phone: data.phone || '',
      workingDays: (data.workingDays || []) as Prisma.InputJsonValue,
      logoUrl: data.logoUrl || '',
      notes: data.notes || '',
      functions: (data.functions || []) as Prisma.InputJsonValue,
      structureTree: (data.structureTree || []) as Prisma.InputJsonValue,
      settings: (data.settings || {}) as Prisma.InputJsonValue,
    },
  });

  return getHrDepartment(institutionId, row.id);
}

export async function updateHrDepartment(
  institutionId: string,
  id: string,
  data: Partial<{
    code: string;
    name: string;
    parentId: string | null;
    headEmployeeId: string;
    reportsToEmployeeId: string;
    shortDescription: string;
    detailedDescription: string;
    campus: string;
    status: string;
    budgetAllocation: number;
    costCenter: string;
    email: string;
    phone: string;
    workingDays: string[];
    logoUrl: string;
    notes: string;
    functions: string[];
    structureTree: StructureNode[];
    settings: DeptSettings;
  }>,
) {
  const existing = await prisma.hrDepartment.findFirst({ where: { id, institutionId } });
  if (!existing) throw new Error('Department not found');

  if (data.code && data.code.trim().toUpperCase() !== existing.code) {
    const dup = await prisma.hrDepartment.findFirst({
      where: { institutionId, code: data.code.trim().toUpperCase(), NOT: { id } },
    });
    if (dup) throw new Error(`Department code ${data.code} already exists`);
  }

  await prisma.hrDepartment.update({
    where: { id },
    data: {
      code: data.code?.trim().toUpperCase(),
      name: data.name?.trim(),
      parentId: data.parentId === undefined ? undefined : data.parentId,
      headEmployeeId: data.headEmployeeId,
      reportsToEmployeeId: data.reportsToEmployeeId,
      shortDescription: data.shortDescription,
      detailedDescription: data.detailedDescription,
      campus: data.campus,
      status: data.status,
      budgetAllocation: data.budgetAllocation,
      costCenter: data.costCenter,
      email: data.email,
      phone: data.phone,
      workingDays: data.workingDays as Prisma.InputJsonValue | undefined,
      logoUrl: data.logoUrl,
      notes: data.notes,
      functions: data.functions as Prisma.InputJsonValue | undefined,
      structureTree: data.structureTree as Prisma.InputJsonValue | undefined,
      settings: data.settings as Prisma.InputJsonValue | undefined,
    },
  });

  if (data.name && data.name !== existing.name) {
    await prisma.payrollEmployee.updateMany({
      where: { institutionId, department: existing.name },
      data: { department: data.name },
    });
  }

  const nextHead = data.headEmployeeId ?? existing.headEmployeeId;
  if (nextHead) {
    const name = data.name?.trim() || existing.name;
    await prisma.payrollEmployee.updateMany({
      where: { institutionId, id: nextHead },
      data: { department: name },
    });
  }

  return getHrDepartment(institutionId, id);
}

/** Soft-delete department so it no longer appears in the directory (and sync will not resurrect it as ACTIVE). */
export async function deleteHrDepartment(institutionId: string, id: string) {
  const existing = await prisma.hrDepartment.findFirst({ where: { id, institutionId } });
  if (!existing) throw new Error('Department not found');
  if (existing.status === 'DELETED') {
    return { id, code: existing.code, message: 'Department already deleted' };
  }

  const childCount = await prisma.hrDepartment.count({
    where: { institutionId, parentId: id, NOT: { status: 'DELETED' } },
  });
  if (childCount > 0) {
    throw new Error('Cannot delete department with active child departments. Reassign or delete children first.');
  }

  await prisma.hrDepartment.update({
    where: { id },
    data: { status: 'DELETED', parentId: null },
  });

  // Clear parent links pointing at this department
  await prisma.hrDepartment.updateMany({
    where: { institutionId, parentId: id },
    data: { parentId: null },
  });

  // Deactivate ops mirror
  await prisma.opsDepartment.updateMany({
    where: {
      institutionId,
      OR: [{ hrDepartmentId: id }, { departmentCode: existing.code }],
    },
    data: { isActive: false },
  });

  // Remove from Institution Setup → Departments Setup records so sync does not keep it
  const institution = await prisma.institution.findUnique({
    where: { id: institutionId },
    include: { setup: true },
  });
  const setup = institution?.setup;
  if (setup?.departmentsSetup && typeof setup.departmentsSetup === 'object') {
    const tile = setup.departmentsSetup as { records?: Array<Record<string, unknown>>; sections?: unknown };
    const records = Array.isArray(tile.records) ? tile.records : [];
    const nextRecords = records.filter((row) => {
      const code = String(row.departmentCode || row.code || '').trim().toUpperCase();
      const name = String(row.departmentName || row.name || '').trim().toLowerCase();
      if (code && code === existing.code.toUpperCase()) return false;
      if (name && name === existing.name.trim().toLowerCase()) return false;
      return true;
    });
    if (nextRecords.length !== records.length) {
      await prisma.institutionSetup.update({
        where: { institutionId },
        data: {
          departmentsSetup: {
            ...tile,
            records: nextRecords,
          } as Prisma.InputJsonValue,
        },
      });
    }
  }

  return {
    id,
    code: existing.code,
    message: `Department ${existing.name} (${existing.code}) deleted`,
  };
}

export async function listDepartmentEmployeeOptions(institutionId: string) {
  const rows = await prisma.payrollEmployee.findMany({
    where: { institutionId, status: FeeMasterStatus.ACTIVE },
    select: { id: true, employeeCode: true, fullName: true, designation: true, department: true },
    orderBy: [{ fullName: 'asc' }],
  });
  return rows.map((r) => ({
    id: r.id,
    employeeCode: r.employeeCode,
    fullName: r.fullName,
    designation: r.designation,
    department: r.department,
    label: `${r.fullName} (${r.employeeCode})`,
  }));
}

const DEFAULT_FUNCTIONS = [
  'Curriculum planning and implementation',
  'Lesson planning and academic delivery',
  'Student assessment and evaluation',
  'Parent communication and engagement',
  'Staff development and mentoring',
  'Examination coordination',
  'Co-curricular activities management',
];

const DEFAULT_STRUCTURE: StructureNode[] = [
  {
    id: 'academics',
    label: 'Academics',
    children: [
      { id: 'teaching', label: 'Teaching Staff' },
      { id: 'exam', label: 'Exam Cell' },
      { id: 'library', label: 'Library' },
      { id: 'lab', label: 'Science Lab' },
      { id: 'sports', label: 'Sports & PE' },
      { id: 'arts', label: 'Arts & Music' },
    ],
  },
];

const DEFAULT_SETTINGS: DeptSettings = {
  leavePolicy: 'Applied',
  workingHours: '09:00 AM - 05:00 PM',
  overtimePolicy: 'Not Applicable',
  holidayCalendar: 'Academic Calendar',
  approvalAuthority: '2 Level Approval',
  documentAccess: 'All Access',
  budgetControl: 'Enabled',
};

export async function seedHrDepartmentsDemo(institutionId: string) {
  const existing = await prisma.hrDepartment.findFirst({
    where: { institutionId, code: 'ACD001' },
  });

  await seedEmployeeDirectoryDemo(institutionId);

  const employees = await prisma.payrollEmployee.findMany({
    where: { institutionId },
    orderBy: { fullName: 'asc' },
  });

  for (const e of employees) {
    if (e.employeeCode === 'EMP2025007') {
      await prisma.payrollEmployee.update({
        where: { id: e.id },
        data: { department: 'Academics', designation: 'Senior Teacher' },
      });
    }
  }

  let principal = await prisma.payrollEmployee.findFirst({
    where: { institutionId, employeeCode: 'EMP1001' },
  });
  if (!principal) {
    principal = await prisma.payrollEmployee.create({
      data: {
        institutionId,
        employeeCode: 'EMP1001',
        fullName: 'Dr. Amit Verma',
        employmentType: 'ADMIN',
        department: 'Administration',
        designation: 'Principal',
        mobile: '+91 98765 11111',
        email: 'principal@school.edu',
        joinDate: new Date('2015-04-01'),
        status: FeeMasterStatus.ACTIVE,
      },
    });
  }
  const reportsToId = principal.id;

  let headNeha = await prisma.payrollEmployee.findFirst({
    where: { institutionId, employeeCode: 'EMP1005' },
  });
  if (!headNeha) {
    headNeha = await prisma.payrollEmployee.create({
      data: {
        institutionId,
        employeeCode: 'EMP1005',
        fullName: 'Dr. Neha Verma',
        employmentType: 'TEACHING',
        department: 'Academics',
        designation: 'Vice Principal - Academics',
        mobile: '+91 98765 22222',
        email: 'neha.verma@school.edu',
        joinDate: new Date('2018-06-01'),
        status: FeeMasterStatus.ACTIVE,
      },
    });
  } else {
    headNeha = await prisma.payrollEmployee.update({
      where: { id: headNeha.id },
      data: {
        department: 'Academics',
        designation: 'Vice Principal - Academics',
        fullName: 'Dr. Neha Verma',
      },
    });
  }
  const headId = headNeha.id;

  const teacherNames = [
    ['EMP1006', 'Mrs. Anjali Verma', 'Teacher', 'Class 7-A'],
    ['EMP1007', 'Mr. Vikram Singh', 'Lab Assistant', 'Science Lab'],
    ['EMP1008', 'Ms. Meena Kumari', 'Librarian', 'Library'],
    ['EMP1009', 'Mr. Rohit Sharma', 'Accountant', 'Finance'],
    ['EMP1010', 'Mrs. Sunita Rani', 'Peon', 'Support'],
    ['EMP1011', 'Mr. Rajesh Kumar', 'TGT English', 'Class 8-B'],
    ['EMP1012', 'Ms. Priya Sharma', 'TGT Science', 'Class 9-A'],
    ['EMP1013', 'Mr. Sanjay Gupta', 'PGT Physics', 'Class 12-A'],
    ['EMP1014', 'Mrs. Kavita Singh', 'TGT Hindi', 'Class 6-C'],
    ['EMP1015', 'Mr. Arun Patel', 'Sports Coach', 'Sports'],
    ['EMP1016', 'Ms. Deepa Joshi', 'Music Teacher', 'Arts'],
  ];

  for (const [code, name, desig, group] of teacherNames) {
    const exists = await prisma.payrollEmployee.findFirst({ where: { institutionId, employeeCode: code } });
    if (exists) {
      await prisma.payrollEmployee.update({
        where: { id: exists.id },
        data: { department: 'Academics', designation: desig, classGroup: group },
      });
      continue;
    }
    await prisma.payrollEmployee.create({
      data: {
        institutionId,
        employeeCode: code,
        fullName: name,
        employmentType: 'TEACHING',
        department: 'Academics',
        designation: desig,
        classGroup: group,
        mobile: '+91 98765 00000',
        email: `${code.toLowerCase()}@school.edu`,
        joinDate: new Date('2019-07-01'),
        status: FeeMasterStatus.ACTIVE,
      },
    });
  }

  if (existing) {
    await prisma.hrDepartment.update({
      where: { id: existing.id },
      data: {
        headEmployeeId: headId,
        reportsToEmployeeId: reportsToId,
        functions: DEFAULT_FUNCTIONS as Prisma.InputJsonValue,
        structureTree: DEFAULT_STRUCTURE as Prisma.InputJsonValue,
        settings: DEFAULT_SETTINGS as Prisma.InputJsonValue,
      },
    });
    return getHrDepartment(institutionId, existing.id);
  }

  const dept = await prisma.hrDepartment.create({
    data: {
      institutionId,
      code: 'ACD001',
      name: 'Academics',
      headEmployeeId: headId,
      reportsToEmployeeId: reportsToId,
      shortDescription: 'Academic operations, teaching & learning',
      detailedDescription:
        'The Academics department oversees curriculum delivery, teaching staff, examinations, and student academic outcomes across all grades.',
      campus: 'Main Campus',
      status: 'ACTIVE',
      budgetAllocation: 2500000,
      costCenter: 'CC-ACD-001',
      email: 'academics@school.edu',
      phone: '+91 11 2345 6789',
      workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as Prisma.InputJsonValue,
      functions: DEFAULT_FUNCTIONS as Prisma.InputJsonValue,
      structureTree: DEFAULT_STRUCTURE as Prisma.InputJsonValue,
      settings: DEFAULT_SETTINGS as Prisma.InputJsonValue,
      notes: 'Primary academic department for the institution.',
    },
  });

  return getHrDepartment(institutionId, dept.id);
}

export { syncAllEmployeesToDepartments };
