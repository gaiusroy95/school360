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
