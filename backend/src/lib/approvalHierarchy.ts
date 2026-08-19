import { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';

export type ApprovalModuleDef = {
  moduleCode: string;
  moduleLabel: string;
  roles: Array<{ roleKey: string; roleLabel: string; sortOrder: number }>;
};

/** Default modules that require approval — managed under HR → Approval Hierarchy. */
export const APPROVAL_MODULE_DEFS: ApprovalModuleDef[] = [
  {
    moduleCode: 'FEE_REFUND',
    moduleLabel: 'Fees & Finance — Refunds',
    roles: [{ roleKey: 'HOD_FINANCE', roleLabel: 'HOD of Finance', sortOrder: 0 }],
  },
  {
    moduleCode: 'FEE_DISCOUNT',
    moduleLabel: 'Fees & Finance — Discounts & Concessions',
    roles: [{ roleKey: 'HOD_FINANCE', roleLabel: 'HOD of Finance', sortOrder: 0 }],
  },
  {
    moduleCode: 'FEE_SETTLEMENT',
    moduleLabel: 'Fees & Finance — Account Settlement',
    roles: [{ roleKey: 'HOD_FINANCE', roleLabel: 'HOD of Finance', sortOrder: 0 }],
  },
  {
    moduleCode: 'FEE_RECONCILIATION',
    moduleLabel: 'Fees & Finance — Payment Reconciliation',
    roles: [
      { roleKey: 'ACCOUNTS_MANAGER', roleLabel: 'Accounts Manager', sortOrder: 0 },
      { roleKey: 'FINANCE_HEAD', roleLabel: 'Finance Head', sortOrder: 1 },
    ],
  },
  {
    moduleCode: 'FEE_SCHOLARSHIP_AWARD',
    moduleLabel: 'Fees & Finance — Scholarship Awards',
    roles: [{ roleKey: 'PRINCIPAL', roleLabel: 'Principal', sortOrder: 0 }],
  },
  {
    moduleCode: 'FEE_TRANSPORT_VENDOR',
    moduleLabel: 'Fees & Finance — Transport Vendor Empanelment',
    roles: [{ roleKey: 'PRINCIPAL', roleLabel: 'Principal', sortOrder: 0 }],
  },
  {
    moduleCode: 'FEE_OTHER_CHARGE',
    moduleLabel: 'Fees & Finance — Other Charges (Principal Approval)',
    roles: [{ roleKey: 'PRINCIPAL', roleLabel: 'Principal / Center Head', sortOrder: 0 }],
  },
  {
    moduleCode: 'FEE_FINE',
    moduleLabel: 'Fees & Finance — Fine / Penalties',
    roles: [{ roleKey: 'HOD_FINANCE', roleLabel: 'HOD of Finance', sortOrder: 0 }],
  },
  {
    moduleCode: 'HR_LEAVE',
    moduleLabel: 'HR — Leave Management',
    roles: [{ roleKey: 'HOD_HR', roleLabel: 'HOD of HR', sortOrder: 0 }],
  },
  {
    moduleCode: 'EXPENSE',
    moduleLabel: 'Fees & Finance — Expense Management',
    roles: [{ roleKey: 'HOD_FINANCE', roleLabel: 'HOD of Finance', sortOrder: 0 }],
  },
];

export const DEPT_HIERARCHY_PREFIX = 'DEPT:';

export const DEFAULT_DEPARTMENT_ROLES: Array<{ roleKey: string; roleLabel: string; sortOrder: number }> = [
  { roleKey: 'DEPT_HEAD', roleLabel: 'Department Head / HOD', sortOrder: 0 },
  { roleKey: 'REPORTING_AUTHORITY', roleLabel: 'Reporting Authority', sortOrder: 1 },
  { roleKey: 'PRINCIPAL', roleLabel: 'Principal / Center Head', sortOrder: 2 },
];

export function departmentHierarchyModuleCode(departmentId: string) {
  return `${DEPT_HIERARCHY_PREFIX}${departmentId}`;
}

export function parseDepartmentId(moduleCode: string) {
  if (!moduleCode.startsWith(DEPT_HIERARCHY_PREFIX)) return '';
  return moduleCode.slice(DEPT_HIERARCHY_PREFIX.length);
}

function slugRoleKey(label: string, sortOrder: number) {
  const slug = label
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 24);
  return slug ? `${slug}_${sortOrder}` : `LEVEL_${sortOrder}`;
}

async function resolveAssignee(institutionId: string, employeeId?: string) {
  const id = String(employeeId || '').trim();
  if (!id) return { employeeId: '', assigneeName: '', assigneeEmail: '' };
  const emp = await prisma.payrollEmployee.findFirst({
    where: { id, institutionId },
    select: { id: true, fullName: true, email: true },
  });
  if (!emp) throw new Error('Employee not found');
  return { employeeId: emp.id, assigneeName: emp.fullName, assigneeEmail: emp.email || '' };
}

async function findPrincipalEmployee(institutionId: string) {
  return prisma.payrollEmployee.findFirst({
    where: {
      institutionId,
      status: 'ACTIVE',
      OR: [
        { designation: { contains: 'Principal', mode: 'insensitive' } },
        { designation: { contains: 'Center Head', mode: 'insensitive' } },
      ],
    },
    select: { id: true, fullName: true, email: true },
    orderBy: { fullName: 'asc' },
  });
}

function serializeMapping(row: {
  id: string;
  moduleCode: string;
  moduleLabel: string;
  roleKey: string;
  roleLabel: string;
  employeeId: string;
  assigneeName: string;
  assigneeEmail: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  const departmentId = parseDepartmentId(row.moduleCode);
  return {
    id: row.id,
    moduleCode: row.moduleCode,
    moduleLabel: row.moduleLabel,
    roleKey: row.roleKey,
    roleLabel: row.roleLabel,
    employeeId: row.employeeId,
    assigneeName: row.assigneeName,
    assigneeEmail: row.assigneeEmail,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    departmentId,
    isDepartmentHierarchy: Boolean(departmentId),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function ensureApprovalHierarchyDefaults(institutionId: string) {
  for (const mod of APPROVAL_MODULE_DEFS) {
    for (const role of mod.roles) {
      await prisma.moduleApprovalMapping.upsert({
        where: {
          institutionId_moduleCode_roleKey: {
            institutionId,
            moduleCode: mod.moduleCode,
            roleKey: role.roleKey,
          },
        },
        create: {
          institutionId,
          moduleCode: mod.moduleCode,
          moduleLabel: mod.moduleLabel,
          roleKey: role.roleKey,
          roleLabel: role.roleLabel,
          sortOrder: role.sortOrder,
        },
        update: {
          moduleLabel: mod.moduleLabel,
          roleLabel: role.roleLabel,
          sortOrder: role.sortOrder,
        },
      });
    }
  }
}

export async function listApprovalHierarchy(institutionId: string) {
  await ensureApprovalHierarchyDefaults(institutionId);
  const rows = await prisma.moduleApprovalMapping.findMany({
    where: { institutionId },
    orderBy: [{ moduleLabel: 'asc' }, { sortOrder: 'asc' }, { roleLabel: 'asc' }],
  });
  return rows.map(serializeMapping);
}

export async function updateApprovalMapping(
  institutionId: string,
  id: string,
  data: {
    employeeId?: string;
    assigneeName?: string;
    assigneeEmail?: string;
    isActive?: boolean;
  },
) {
  const existing = await prisma.moduleApprovalMapping.findFirst({
    where: { id, institutionId },
  });
  if (!existing) throw new Error('Approval mapping not found');

  let assigneeName = data.assigneeName?.trim() ?? existing.assigneeName;
  let assigneeEmail = data.assigneeEmail?.trim() ?? existing.assigneeEmail;
  let employeeId = data.employeeId?.trim() ?? existing.employeeId;

  if (data.employeeId !== undefined) {
    employeeId = data.employeeId.trim();
    if (employeeId) {
      const emp = await prisma.payrollEmployee.findFirst({
        where: { id: employeeId, institutionId },
        select: { id: true, fullName: true, email: true },
      });
      if (!emp) throw new Error('Employee not found');
      assigneeName = emp.fullName;
      assigneeEmail = emp.email || assigneeEmail;
    } else {
      assigneeName = data.assigneeName?.trim() || '';
      assigneeEmail = data.assigneeEmail?.trim() || '';
    }
  }

  const row = await prisma.moduleApprovalMapping.update({
    where: { id },
    data: {
      employeeId,
      assigneeName,
      assigneeEmail,
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    },
  });
  return serializeMapping(row);
}

export type DepartmentHierarchyLevelInput = {
  roleKey?: string;
  roleLabel: string;
  employeeId?: string;
  sortOrder?: number;
};

export async function getDepartmentHierarchyPrefill(institutionId: string, departmentId: string) {
  const dept = await prisma.hrDepartment.findFirst({
    where: { id: departmentId, institutionId, NOT: { status: 'DELETED' } },
  });
  if (!dept) throw new Error('Department not found');

  const moduleCode = departmentHierarchyModuleCode(dept.id);
  const existing = await prisma.moduleApprovalMapping.findMany({
    where: { institutionId, moduleCode },
    orderBy: [{ sortOrder: 'asc' }, { roleLabel: 'asc' }],
  });

  const principal = await findPrincipalEmployee(institutionId);
  const defaults = DEFAULT_DEPARTMENT_ROLES.map((role) => {
    let employeeId = '';
    if (role.roleKey === 'DEPT_HEAD') employeeId = dept.headEmployeeId || '';
    if (role.roleKey === 'REPORTING_AUTHORITY') employeeId = dept.reportsToEmployeeId || '';
    if (role.roleKey === 'PRINCIPAL') employeeId = principal?.id || '';
    return { ...role, employeeId };
  });

  return {
    department: { id: dept.id, code: dept.code, name: dept.name },
    exists: existing.length > 0,
    levels: existing.length
      ? existing.map((row) => ({
          roleKey: row.roleKey,
          roleLabel: row.roleLabel,
          employeeId: row.employeeId,
          sortOrder: row.sortOrder,
        }))
      : defaults,
  };
}

export async function upsertDepartmentApprovalHierarchy(
  institutionId: string,
  data: {
    departmentId: string;
    levels: DepartmentHierarchyLevelInput[];
  },
) {
  const dept = await prisma.hrDepartment.findFirst({
    where: { id: data.departmentId, institutionId, NOT: { status: 'DELETED' } },
  });
  if (!dept) throw new Error('Department not found');

  const levels = (data.levels || [])
    .map((level, index) => ({
      roleLabel: String(level.roleLabel || '').trim(),
      roleKey: String(level.roleKey || '').trim() || slugRoleKey(level.roleLabel || `Level ${index + 1}`, index),
      employeeId: String(level.employeeId || '').trim(),
      sortOrder: Number.isFinite(level.sortOrder) ? Number(level.sortOrder) : index,
    }))
    .filter((level) => level.roleLabel);

  if (!levels.length) throw new Error('Add at least one approval level');

  const seen = new Set<string>();
  for (const level of levels) {
    if (seen.has(level.roleKey)) {
      level.roleKey = slugRoleKey(level.roleLabel, level.sortOrder);
    }
    seen.add(level.roleKey);
  }

  const moduleCode = departmentHierarchyModuleCode(dept.id);
  const moduleLabel = `Department — ${dept.name}`;

  const existing = await prisma.moduleApprovalMapping.findMany({
    where: { institutionId, moduleCode },
    select: { id: true, roleKey: true },
  });
  const keep = new Set(levels.map((l) => l.roleKey));
  const toDelete = existing.filter((row) => !keep.has(row.roleKey));
  if (toDelete.length) {
    await prisma.moduleApprovalMapping.deleteMany({
      where: { institutionId, id: { in: toDelete.map((r) => r.id) } },
    });
  }

  const records = [];
  for (const level of levels) {
    const assignee = await resolveAssignee(institutionId, level.employeeId);
    const row = await prisma.moduleApprovalMapping.upsert({
      where: {
        institutionId_moduleCode_roleKey: {
          institutionId,
          moduleCode,
          roleKey: level.roleKey,
        },
      },
      create: {
        institutionId,
        moduleCode,
        moduleLabel,
        roleKey: level.roleKey,
        roleLabel: level.roleLabel,
        sortOrder: level.sortOrder,
        ...assignee,
      },
      update: {
        moduleLabel,
        roleLabel: level.roleLabel,
        sortOrder: level.sortOrder,
        ...assignee,
      },
    });
    records.push(serializeMapping(row));
  }

  return {
    department: { id: dept.id, code: dept.code, name: dept.name },
    records,
    message: `Approval hierarchy saved for ${dept.name}`,
  };
}

export async function deleteDepartmentApprovalHierarchy(institutionId: string, departmentId: string) {
  const moduleCode = departmentHierarchyModuleCode(departmentId);
  const result = await prisma.moduleApprovalMapping.deleteMany({
    where: { institutionId, moduleCode },
  });
  if (!result.count) throw new Error('No department hierarchy found to delete');
  return { ok: true, deleted: result.count };
}

export async function resolveModuleApprover(
  institutionId: string,
  moduleCode: string,
  roleKey = 'HOD_FINANCE',
) {
  await ensureApprovalHierarchyDefaults(institutionId);
  const row = await prisma.moduleApprovalMapping.findUnique({
    where: {
      institutionId_moduleCode_roleKey: {
        institutionId,
        moduleCode,
        roleKey,
      },
    },
  });
  if (!row || !row.isActive) {
    return {
      roleKey,
      roleLabel: roleKey.replace(/_/g, ' '),
      assigneeName: '',
      assigneeEmail: '',
      employeeId: '',
      mapped: false,
    };
  }
  return {
    roleKey: row.roleKey,
    roleLabel: row.roleLabel,
    assigneeName: row.assigneeName,
    assigneeEmail: row.assigneeEmail,
    employeeId: row.employeeId,
    mapped: Boolean(row.assigneeName || row.assigneeEmail),
  };
}

export type { Prisma };
