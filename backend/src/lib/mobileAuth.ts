import bcrypt from 'bcryptjs';
import type { MobileAccount, MobileAppRole, ParentRelationship, Student } from '@prisma/client';
import { prisma } from './prisma.js';
import { getDefaultInstitutionId } from './institution.js';
import { makeParentKey, normalizeMobileDigits } from './mobileUtils.js';

export type MobileAuthUser = {
  accountId: string;
  institutionId: string;
  role: MobileAppRole;
  displayName: string;
  mustResetPassword: boolean;
  admissionNumber?: string;
  employeeCode?: string;
  studentId?: string;
  studentIds: string[];
  activeStudentId?: string;
  parentKey?: string;
  parentRelationship?: ParentRelationship;
  teacherProfileId?: string;
  staffProfileId?: string;
};

export function serializeMobileUser(account: MobileAccount): MobileAuthUser {
  const studentIds = Array.isArray(account.studentIds)
    ? (account.studentIds as string[])
    : [];

  return {
    accountId: account.id,
    institutionId: account.institutionId,
    role: account.role,
    displayName: account.displayName,
    mustResetPassword: account.mustResetPassword,
    admissionNumber: account.admissionNumber || undefined,
    employeeCode: account.employeeCode || undefined,
    studentId: account.studentId ?? undefined,
    studentIds,
    activeStudentId: account.studentId ?? studentIds[0],
    parentKey: account.parentKey || undefined,
    parentRelationship: account.parentRelationship ?? undefined,
    teacherProfileId: account.teacherProfileId ?? undefined,
    staffProfileId: account.staffProfileId ?? undefined,
  };
}

function mobilesMatch(a: string, b: string) {
  const na = normalizeMobileDigits(a);
  const nb = normalizeMobileDigits(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  // Allow match on last 10 digits (India)
  if (na.length >= 10 && nb.length >= 10 && na.slice(-10) === nb.slice(-10)) return true;
  return false;
}

function studentDisplayName(s: Pick<Student, 'firstName' | 'lastName'>) {
  return [s.firstName, s.lastName].filter(Boolean).join(' ').trim();
}

async function verifyPassword(password: string, account: MobileAccount | null, defaultMobile: string) {
  if (account) {
    return bcrypt.compare(password, account.passwordHash);
  }
  return mobilesMatch(password, defaultMobile);
}

async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

function inferTeacherMobileRole(designation: string, department: string): MobileAppRole {
  const text = `${designation} ${department}`.toLowerCase();
  if (text.includes('principal') || text.includes('headmaster') || text.includes('head master')) {
    return 'PRINCIPAL';
  }
  return 'TEACHER';
}

function inferStaffMobileRole(designation: string, department: string): MobileAppRole {
  const text = `${designation} ${department}`.toLowerCase();
  if (text.includes('transport') || text.includes('driver') || text.includes('conductor')) {
    return 'TRANSPORT';
  }
  return 'TRANSPORT';
}

async function findParentChildren(
  institutionId: string,
  relationship: ParentRelationship,
  mobile: string,
) {
  const students = await prisma.student.findMany({
    where: { institutionId, status: 'ACTIVE' },
    orderBy: { admissionNumber: 'asc' },
  });

  const children = students.filter((s) => {
    const m =
      relationship === 'FATHER'
        ? s.fatherMobile
        : relationship === 'MOTHER'
          ? s.motherMobile
          : '';
    return mobilesMatch(m, mobile);
  });

  const anchor = children[0];
  const parentName =
    relationship === 'FATHER' ? anchor?.fatherName ?? '' : anchor?.motherName ?? '';
  const parentKey = makeParentKey(relationship, mobile, parentName);

  return { parentKey, children, studentIds: children.map((c) => c.id) };
}

async function upsertStudentAccount(params: {
  institutionId: string;
  student: Student;
  registeredMobile: string;
  password: string;
  existing: MobileAccount | null;
}) {
  const { institutionId, student, registeredMobile, password, existing } = params;
  const passwordHash = existing
    ? existing.passwordHash
    : await hashPassword(password);

  const mustReset = existing ? existing.mustResetPassword : true;

  return prisma.mobileAccount.upsert({
    where: {
      institutionId_role_admissionNumber_registeredMobile: {
        institutionId,
        role: 'STUDENT',
        admissionNumber: student.admissionNumber,
        registeredMobile: normalizeMobileDigits(registeredMobile),
      },
    },
    create: {
      institutionId,
      role: 'STUDENT',
      admissionNumber: student.admissionNumber,
      registeredMobile: normalizeMobileDigits(registeredMobile),
      passwordHash,
      mustResetPassword: mustReset,
      displayName: studentDisplayName(student),
      studentId: student.id,
      studentIds: [student.id],
    },
    update: {
      displayName: studentDisplayName(student),
      studentId: student.id,
      studentIds: [student.id],
      lastLoginAt: new Date(),
      isActive: true,
    },
  });
}

async function upsertParentAccount(params: {
  institutionId: string;
  anchorStudent: Student;
  relationship: ParentRelationship;
  registeredMobile: string;
  password: string;
  existing: MobileAccount | null;
  parentKey: string;
  studentIds: string[];
  displayName: string;
}) {
  const {
    institutionId,
    anchorStudent,
    relationship,
    registeredMobile,
    password,
    existing,
    parentKey,
    studentIds,
    displayName,
  } = params;

  const passwordHash = existing
    ? existing.passwordHash
    : await hashPassword(password);

  const mustReset = existing ? existing.mustResetPassword : true;

  return prisma.mobileAccount.upsert({
    where: {
      institutionId_role_admissionNumber_registeredMobile: {
        institutionId,
        role: 'PARENT',
        admissionNumber: anchorStudent.admissionNumber,
        registeredMobile: normalizeMobileDigits(registeredMobile),
      },
    },
    create: {
      institutionId,
      role: 'PARENT',
      admissionNumber: anchorStudent.admissionNumber,
      registeredMobile: normalizeMobileDigits(registeredMobile),
      passwordHash,
      mustResetPassword: mustReset,
      displayName,
      parentKey,
      parentRelationship: relationship,
      studentIds,
    },
    update: {
      displayName,
      parentKey,
      parentRelationship: relationship,
      studentIds,
      lastLoginAt: new Date(),
      isActive: true,
    },
  });
}

async function upsertStaffAccount(params: {
  institutionId: string;
  role: MobileAppRole;
  employeeCode: string;
  registeredMobile: string;
  password: string;
  displayName: string;
  teacherProfileId?: string;
  staffProfileId?: string;
  existing: MobileAccount | null;
}) {
  const {
    institutionId,
    role,
    employeeCode,
    registeredMobile,
    password,
    displayName,
    teacherProfileId,
    staffProfileId,
    existing,
  } = params;

  const passwordHash = existing
    ? existing.passwordHash
    : await hashPassword(password);

  const mustReset = existing ? existing.mustResetPassword : true;

  return prisma.mobileAccount.upsert({
    where: {
      institutionId_role_employeeCode_registeredMobile: {
        institutionId,
        role,
        employeeCode,
        registeredMobile: normalizeMobileDigits(registeredMobile),
      },
    },
    create: {
      institutionId,
      role,
      employeeCode,
      registeredMobile: normalizeMobileDigits(registeredMobile),
      passwordHash,
      mustResetPassword: mustReset,
      displayName,
      teacherProfileId: teacherProfileId ?? null,
      staffProfileId: staffProfileId ?? null,
      studentIds: [],
    },
    update: {
      displayName,
      teacherProfileId: teacherProfileId ?? null,
      staffProfileId: staffProfileId ?? null,
      lastLoginAt: new Date(),
      isActive: true,
    },
  });
}

export async function loginStudentParent(opts: {
  layer: 'student' | 'parent';
  admissionNumber: string;
  registeredMobile: string;
  password: string;
  institutionId?: string;
  otpVerified?: boolean;
  dryRun?: boolean;
}) {
  const institutionId = opts.institutionId ?? (await getDefaultInstitutionId());
  const admissionNumber = opts.admissionNumber.trim();
  const registeredMobile = opts.registeredMobile.trim();

  const student = await prisma.student.findFirst({
    where: { institutionId, admissionNumber, status: 'ACTIVE' },
  });
  if (!student) {
    throw new Error('Invalid admission number or credentials');
  }

  const role: MobileAppRole = opts.layer === 'parent' ? 'PARENT' : 'STUDENT';

  if (opts.layer === 'student') {
    if (!mobilesMatch(registeredMobile, student.mobile)) {
      throw new Error('Registered mobile does not match school records');
    }

    const existing = await prisma.mobileAccount.findUnique({
      where: {
        institutionId_role_admissionNumber_registeredMobile: {
          institutionId,
          role: 'STUDENT',
          admissionNumber,
          registeredMobile: normalizeMobileDigits(registeredMobile),
        },
      },
    });

    const ok =
      opts.otpVerified || (await verifyPassword(opts.password, existing, student.mobile));
    if (!ok) throw new Error('Invalid admission number or credentials');

    if (opts.dryRun) return serializeMobileUser(
      existing ?? {
        id: 'dry-run',
        institutionId,
        role: 'STUDENT',
        admissionNumber,
        employeeCode: '',
        registeredMobile: normalizeMobileDigits(registeredMobile),
        passwordHash: '',
        mustResetPassword: true,
        displayName: studentDisplayName(student),
        studentId: student.id,
        parentKey: '',
        parentRelationship: null,
        teacherProfileId: null,
        staffProfileId: null,
        studentIds: [student.id],
        isActive: true,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as MobileAccount,
    );

    const account = await upsertStudentAccount({
      institutionId,
      student,
      registeredMobile,
      password: opts.password,
      existing,
    });

    return serializeMobileUser(account);
  }

  // Parent layer
  let relationship: ParentRelationship | null = null;
  if (mobilesMatch(registeredMobile, student.fatherMobile)) {
    relationship = 'FATHER';
  } else if (mobilesMatch(registeredMobile, student.motherMobile)) {
    relationship = 'MOTHER';
  } else {
    throw new Error('Registered mobile does not match parent records for this student');
  }

  const { parentKey, children, studentIds } = await findParentChildren(
    institutionId,
    relationship,
    registeredMobile,
  );

  const parentName =
    relationship === 'FATHER'
      ? student.fatherName.trim() || 'Parent'
      : student.motherName.trim() || 'Parent';

  const existing = await prisma.mobileAccount.findUnique({
    where: {
      institutionId_role_admissionNumber_registeredMobile: {
        institutionId,
        role: 'PARENT',
        admissionNumber,
        registeredMobile: normalizeMobileDigits(registeredMobile),
      },
    },
  });

  const ok =
    opts.otpVerified ||
    (await verifyPassword(
      opts.password,
      existing,
      relationship === 'FATHER' ? student.fatherMobile : student.motherMobile,
    ));
  if (!ok) throw new Error('Invalid admission number or credentials');

  if (opts.dryRun) {
    return serializeMobileUser(
      existing ?? {
        id: 'dry-run',
        institutionId,
        role: 'PARENT',
        admissionNumber,
        employeeCode: '',
        registeredMobile: normalizeMobileDigits(registeredMobile),
        passwordHash: '',
        mustResetPassword: true,
        displayName: parentName,
        studentId: studentIds[0] ?? null,
        parentKey,
        parentRelationship: relationship,
        teacherProfileId: null,
        staffProfileId: null,
        studentIds,
        isActive: true,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as MobileAccount,
    );
  }

  const account = await upsertParentAccount({
    institutionId,
    anchorStudent: student,
    relationship,
    registeredMobile,
    password: opts.password,
    existing,
    parentKey,
    studentIds,
    displayName: parentName,
  });

  return serializeMobileUser(account);
}

export async function loginStaff(opts: {
  employeeCode: string;
  registeredMobile: string;
  password: string;
  institutionId?: string;
  otpVerified?: boolean;
  dryRun?: boolean;
}) {
  const institutionId = opts.institutionId ?? (await getDefaultInstitutionId());
  const employeeCode = opts.employeeCode.trim();
  const registeredMobile = opts.registeredMobile.trim();

  const teacher = await prisma.teacherAttendanceProfile.findFirst({
    where: {
      institutionId,
      employeeCode,
      isActive: true,
    },
  });

  if (teacher && mobilesMatch(registeredMobile, teacher.mobile)) {
    const role = inferTeacherMobileRole(teacher.designation, teacher.department);

    const existing = await prisma.mobileAccount.findUnique({
      where: {
        institutionId_role_employeeCode_registeredMobile: {
          institutionId,
          role,
          employeeCode,
          registeredMobile: normalizeMobileDigits(registeredMobile),
        },
      },
    });

    const ok = opts.otpVerified || (await verifyPassword(opts.password, existing, teacher.mobile));
    if (!ok) throw new Error('Invalid employee code or credentials');

    if (opts.dryRun) {
      return serializeMobileUser(
        existing ?? {
          id: 'dry-run',
          institutionId,
          role,
          admissionNumber: '',
          employeeCode,
          registeredMobile: normalizeMobileDigits(registeredMobile),
          passwordHash: '',
          mustResetPassword: true,
          displayName: teacher.teacherName,
          studentId: null,
          parentKey: '',
          parentRelationship: null,
          teacherProfileId: teacher.id,
          staffProfileId: null,
          studentIds: [],
          isActive: true,
          lastLoginAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as MobileAccount,
      );
    }

    const account = await upsertStaffAccount({
      institutionId,
      role,
      employeeCode,
      registeredMobile,
      password: opts.password,
      displayName: teacher.teacherName,
      teacherProfileId: teacher.id,
      existing,
    });

    return serializeMobileUser(account);
  }

  const staff = await prisma.staffAttendanceProfile.findFirst({
    where: {
      institutionId,
      employeeCode,
      isActive: true,
    },
  });

  if (!staff || !mobilesMatch(registeredMobile, staff.mobile)) {
    throw new Error('Invalid employee code or credentials');
  }

  const role = inferStaffMobileRole(staff.designation, staff.department);

  const existing = await prisma.mobileAccount.findUnique({
    where: {
      institutionId_role_employeeCode_registeredMobile: {
        institutionId,
        role,
        employeeCode,
        registeredMobile: normalizeMobileDigits(registeredMobile),
      },
    },
  });

  const ok = opts.otpVerified || (await verifyPassword(opts.password, existing, staff.mobile));
  if (!ok) throw new Error('Invalid employee code or credentials');

  if (opts.dryRun) {
    return serializeMobileUser(
      existing ?? {
        id: 'dry-run',
        institutionId,
        role,
        admissionNumber: '',
        employeeCode,
        registeredMobile: normalizeMobileDigits(registeredMobile),
        passwordHash: '',
        mustResetPassword: true,
        displayName: staff.staffName,
        studentId: null,
        parentKey: '',
        parentRelationship: null,
        teacherProfileId: null,
        staffProfileId: staff.id,
        studentIds: [],
        isActive: true,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as MobileAccount,
    );
  }

  const account = await upsertStaffAccount({
    institutionId,
    role,
    employeeCode,
    registeredMobile,
    password: opts.password,
    displayName: staff.staffName,
    staffProfileId: staff.id,
    existing,
  });

  return serializeMobileUser(account);
}

export async function changeMobilePassword(accountId: string, currentPassword: string, newPassword: string) {
  const account = await prisma.mobileAccount.findUnique({ where: { id: accountId } });
  if (!account) throw new Error('Account not found');

  const ok = await bcrypt.compare(currentPassword, account.passwordHash);
  if (!ok) throw new Error('Current password is incorrect');

  if (newPassword.length < 8) {
    throw new Error('New password must be at least 8 characters');
  }

  const passwordHash = await hashPassword(newPassword);
  const updated = await prisma.mobileAccount.update({
    where: { id: accountId },
    data: { passwordHash, mustResetPassword: false },
  });

  return serializeMobileUser(updated);
}

export async function getMobileAccountById(accountId: string) {
  const account = await prisma.mobileAccount.findUnique({ where: { id: accountId } });
  if (!account || !account.isActive) return null;
  return serializeMobileUser(account);
}

export function assertStudentAccess(user: MobileAuthUser, studentId: string) {
  if (user.role === 'STUDENT') {
    if (user.studentId !== studentId) {
      throw new Error('Access denied for this student');
    }
    return;
  }
  if (user.role === 'PARENT') {
    if (!user.studentIds.includes(studentId)) {
      throw new Error('Access denied for this student');
    }
    return;
  }
  throw new Error('Access denied');
}
