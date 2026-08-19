import { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';

function slugCode(name: string) {
  const compact = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '')
    .slice(0, 8);
  return compact || 'DEPT';
}

function parseReportingRef(raw?: string | null) {
  const value = String(raw || '').trim();
  if (!value) return { code: '', name: '' };
  const paren = value.match(/\(([^)]+)\)\s*$/);
  if (paren?.[1]) {
    return { code: paren[1].trim(), name: value.replace(/\s*\([^)]+\)\s*$/, '').trim() };
  }
  if (/^EMP[-_]?\w+/i.test(value)) return { code: value, name: '' };
  return { code: '', name: value };
}

export async function resolveEmployeeRef(institutionId: string, ref: string | null | undefined) {
  const raw = String(ref || '').trim();
  if (!raw) return null;
  const parsed = parseReportingRef(raw);

  const byId = await prisma.payrollEmployee.findFirst({
    where: { institutionId, id: raw },
    select: { id: true, employeeCode: true, fullName: true, designation: true, department: true },
  });
  if (byId) return byId;

  const code = parsed.code || raw;
  const byCode = await prisma.payrollEmployee.findFirst({
    where: { institutionId, employeeCode: { equals: code, mode: 'insensitive' } },
    select: { id: true, employeeCode: true, fullName: true, designation: true, department: true },
  });
  if (byCode) return byCode;

  if (parsed.name) {
    const byName = await prisma.payrollEmployee.findFirst({
      where: { institutionId, fullName: { equals: parsed.name, mode: 'insensitive' } },
      select: { id: true, employeeCode: true, fullName: true, designation: true, department: true },
    });
    if (byName) return byName;
  }

  return null;
}

export async function findHrDepartmentByLabel(institutionId: string, label: string) {
  const term = label.trim();
  if (!term) return null;
  const upper = term.toUpperCase();
  const aliases = new Set([term, upper]);
  const lower = term.toLowerCase();
  if (lower === 'admin' || lower === 'administration') {
    aliases.add('Admin');
    aliases.add('Administration');
  }
  if (lower === 'hr' || lower === 'human resources') {
    aliases.add('HR');
    aliases.add('Human Resources');
  }
  return prisma.hrDepartment.findFirst({
    where: {
      institutionId,
      NOT: { status: 'DELETED' },
      OR: [
        { name: { equals: term, mode: 'insensitive' } },
        { code: { equals: upper, mode: 'insensitive' } },
        ...[...aliases].map((a) => ({ name: { equals: a, mode: 'insensitive' as const } })),
      ],
    },
  });
}

export async function ensureHrDepartmentForLabel(institutionId: string, label: string) {
  const name = label.trim();
  if (!name || /^general$/i.test(name) || /^unassigned$/i.test(name)) return null;

  const existing = await findHrDepartmentByLabel(institutionId, name);
  if (existing) return existing;

  let code = slugCode(name);
  const codeTaken = await prisma.hrDepartment.findFirst({ where: { institutionId, code } });
  if (codeTaken) {
    code = `${code}${Math.floor(Math.random() * 90 + 10)}`.slice(0, 10);
  }

  return prisma.hrDepartment.create({
    data: {
      institutionId,
      code,
      name,
      campus: 'Main Campus',
      status: 'ACTIVE',
      shortDescription: `Synced from employee records (${name})`,
    },
  });
}

function looksLikeHead(designation: string) {
  return /\b(hod|head|principal|director|vice[-\s]?principal)\b/i.test(designation || '');
}

/** Map one employee onto an HR department + fill hierarchy when empty. */
export async function syncEmployeeToDepartment(
  institutionId: string,
  employee: {
    id: string;
    department?: string | null;
    designation?: string | null;
    profileReportingTo?: string | null;
  },
) {
  const deptLabel = String(employee.department || '').trim();
  const dept = await ensureHrDepartmentForLabel(institutionId, deptLabel);
  if (!dept) return { departmentId: null as string | null, normalizedName: deptLabel };

  const patch: Prisma.HrDepartmentUpdateInput = {};
  if (looksLikeHead(employee.designation || '') && !dept.headEmployeeId) {
    patch.headEmployeeId = employee.id;
  }

  const manager = await resolveEmployeeRef(institutionId, employee.profileReportingTo);
  if (manager && !dept.reportsToEmployeeId) {
    patch.reportsToEmployeeId = manager.id;
  }

  if (Object.keys(patch).length) {
    await prisma.hrDepartment.update({ where: { id: dept.id }, data: patch });
  }

  if (dept.name !== deptLabel && deptLabel) {
    await prisma.payrollEmployee.update({
      where: { id: employee.id },
      data: { department: dept.name },
    });
  }

  return { departmentId: dept.id, normalizedName: dept.name };
}

export async function syncAllEmployeesToDepartments(institutionId: string) {
  const employees = await prisma.payrollEmployee.findMany({
    where: { institutionId },
    select: { id: true, department: true, designation: true, profileData: true },
  });

  let mapped = 0;
  const departments = new Set<string>();
  for (const emp of employees) {
    const profile = emp.profileData && typeof emp.profileData === 'object' && !Array.isArray(emp.profileData)
      ? (emp.profileData as { reportingTo?: string })
      : {};
    const result = await syncEmployeeToDepartment(institutionId, {
      id: emp.id,
      department: emp.department,
      designation: emp.designation,
      profileReportingTo: profile.reportingTo,
    });
    if (result.departmentId) {
      mapped += 1;
      departments.add(result.departmentId);
    }
  }

  return { mapped, departments: departments.size, employees: employees.length };
}

export async function assignEmployeesToDepartment(
  institutionId: string,
  departmentId: string,
  employeeIds: string[],
) {
  const dept = await prisma.hrDepartment.findFirst({
    where: { id: departmentId, institutionId, NOT: { status: 'DELETED' } },
  });
  if (!dept) throw new Error('Department not found');
  if (!employeeIds.length) return { assigned: 0 };

  const result = await prisma.payrollEmployee.updateMany({
    where: { institutionId, id: { in: employeeIds } },
    data: { department: dept.name },
  });

  const employees = await prisma.payrollEmployee.findMany({
    where: { institutionId, id: { in: employeeIds } },
    select: { id: true, designation: true, profileData: true, department: true },
  });
  for (const emp of employees) {
    const profile = emp.profileData && typeof emp.profileData === 'object' && !Array.isArray(emp.profileData)
      ? (emp.profileData as { reportingTo?: string })
      : {};
    await syncEmployeeToDepartment(institutionId, {
      id: emp.id,
      department: dept.name,
      designation: emp.designation,
      profileReportingTo: profile.reportingTo,
    });
  }

  return { assigned: result.count };
}

export async function unassignEmployeesFromDepartment(
  institutionId: string,
  departmentId: string,
  employeeIds: string[],
) {
  const dept = await prisma.hrDepartment.findFirst({
    where: { id: departmentId, institutionId },
  });
  if (!dept) throw new Error('Department not found');
  if (!employeeIds.length) return { unassigned: 0 };

  const result = await prisma.payrollEmployee.updateMany({
    where: {
      institutionId,
      id: { in: employeeIds },
      department: { equals: dept.name, mode: 'insensitive' },
    },
    data: { department: 'Unassigned' },
  });

  const remainingHead = employeeIds.includes(dept.headEmployeeId);
  const remainingReports = employeeIds.includes(dept.reportsToEmployeeId);
  if (remainingHead || remainingReports) {
    await prisma.hrDepartment.update({
      where: { id: dept.id },
      data: {
        ...(remainingHead ? { headEmployeeId: '' } : {}),
        ...(remainingReports ? { reportsToEmployeeId: '' } : {}),
      },
    });
  }

  return { unassigned: result.count };
}

export function departmentMatchFilter(dept: { name: string; code: string }): Prisma.PayrollEmployeeWhereInput {
  return {
    OR: [
      { department: { equals: dept.name, mode: 'insensitive' } },
      { department: { equals: dept.code, mode: 'insensitive' } },
    ],
  };
}
