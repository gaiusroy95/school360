import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { AccountStatus, GovernanceUserType, Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { logActionHistory, logDataChange, logUserActivity } from './securityAuditCompliance.js';
import { fireUserCreatedWebhook } from './integrationsApiUpdatesE2E.js';

type AuditActor = { userId?: string; userEmail?: string; ipAddress?: string };

const permissionCache = new Map<string, { permissions: Set<string>; cachedAt: number }>();
const CACHE_TTL_MS = 60_000;

const DEFAULT_ROLES = [
  { code: 'REGISTRAR', label: 'Registrar', level: 3, description: 'Admissions and student records' },
  { code: 'ACCOUNTANT', label: 'Accountant', level: 3, description: 'Fee and finance operations' },
  { code: 'HOD', label: 'Head of Department', level: 4, description: 'Academic department leadership' },
  { code: 'TEACHER', label: 'Teacher', level: 2, description: 'Classroom and academic delivery' },
  { code: 'PARENT_PORTAL', label: 'Parent Portal User', level: 1, description: 'Parent self-service access' },
  { code: 'STUDENT_PORTAL', label: 'Student Portal User', level: 1, description: 'Student self-service access' },
];

const FEATURE_AREAS = [
  { area: 'students', label: 'Student Management', apiRoute: '/api/students', menuPath: 'Student Management' },
  { area: 'admissions', label: 'Admissions', apiRoute: '/api/admissions', menuPath: 'Admissions' },
  { area: 'academic', label: 'Academic Management', apiRoute: '/api/academic', menuPath: 'Academic Management' },
  { area: 'examination', label: 'Examination', apiRoute: '/api/examination', menuPath: 'Examination Management' },
  { area: 'fees', label: 'Fees & Finance', apiRoute: '/api/fee-finance', menuPath: 'Fees & Finance' },
  { area: 'transport', label: 'Transport', apiRoute: '/api/transport', menuPath: 'Transport Management' },
  { area: 'hr', label: 'HR Management', apiRoute: '/api/hr', menuPath: 'HR Management' },
  { area: 'settings', label: 'Settings', apiRoute: '/api/settings', menuPath: 'Settings Management' },
  { area: 'reports', label: 'Reports & Analytics', apiRoute: '/api/reports-analytics', menuPath: 'Reports & Analytics' },
  { area: 'user_governance', label: 'User Governance', apiRoute: '/api/settings/user-governance', menuPath: 'User & Role Settings' },
];

function slugCode(label: string) {
  return label.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 32) || 'ROLE';
}

function generateTempPassword() {
  return `Tmp${randomBytes(4).toString('hex')}!9`;
}

function generateActivationToken() {
  return randomBytes(24).toString('hex');
}

async function dispatchActivationEmail(
  institutionId: string,
  email: string,
  displayName: string,
  activationToken: string,
  tempPassword: string,
) {
  const gateway = await prisma.commEmailSmtpGateway.findFirst({
    where: { institutionId, status: 'ACTIVE' },
    orderBy: { priority: 'asc' },
  });
  const bodyPlain = [
    `Hello ${displayName},`,
    '',
    'Your School ERP account has been created.',
    `Temporary password: ${tempPassword}`,
    `Activation token: ${activationToken}`,
    '',
    'Please activate your account and change your password on first login.',
  ].join('\n');

  if (!gateway) return false;

  await prisma.commEmailQueueItem.create({
    data: {
      institutionId,
      toEmail: email,
      subject: 'School ERP — Account Activation Invite',
      bodyHtml: `<p>${bodyPlain.replace(/\n/g, '<br>')}</p>`,
      bodyPlain,
      status: 'QUEUED',
      gatewayId: gateway.id,
      trackingId: randomBytes(16).toString('hex'),
      sourceModule: 'User Governance',
    },
  });
  return true;
}

async function expandRoleIdsWithAncestors(roleIds: string[]): Promise<string[]> {
  const all = new Set(roleIds);
  let queue = [...roleIds];
  while (queue.length) {
    const roles = await prisma.governanceRole.findMany({
      where: { id: { in: queue } },
      select: { parentRoleId: true },
    });
    queue = [];
    for (const r of roles) {
      if (r.parentRoleId && !all.has(r.parentRoleId)) {
        all.add(r.parentRoleId);
        queue.push(r.parentRoleId);
      }
    }
  }
  return [...all];
}

function cacheKey(userId: string, institutionId: string) {
  return `${institutionId}:${userId}`;
}

export function invalidateUserPermissionCache(userId?: string, institutionId?: string) {
  if (userId && institutionId) {
    permissionCache.delete(cacheKey(userId, institutionId));
    return;
  }
  permissionCache.clear();
}

async function invalidateSessionsForRole(institutionId: string, roleId: string) {
  const assignments = await prisma.userRoleAssignment.findMany({
    where: { institutionId, roleId, isActive: true },
    select: { userId: true },
  });
  const userIds = assignments.map((a) => a.userId);
  if (!userIds.length) return;
  await prisma.securityLoginSession.updateMany({
    where: { institutionId, userId: { in: userIds }, status: 'ACTIVE' },
    data: { status: 'FORCED_LOGOUT', logoutAt: new Date() },
  });
  for (const uid of userIds) {
    invalidateUserPermissionCache(uid, institutionId);
  }
}

export async function bootstrapUserGovernance(institutionId: string) {
  const existingRoles = await prisma.governanceRole.count({ where: { institutionId } });
  if (existingRoles > 0) return { bootstrapped: false };

  const roles = await Promise.all(
    DEFAULT_ROLES.map((r) =>
      prisma.governanceRole.create({
        data: {
          institutionId,
          roleCode: r.code,
          roleLabel: r.label,
          description: r.description,
          level: r.level,
          isSystem: true,
        },
      }),
    ),
  );

  const permissions = [];
  for (const feature of FEATURE_AREAS) {
    const perm = await prisma.governancePermission.create({
      data: {
        institutionId,
        featureArea: feature.area,
        permissionCode: `${feature.area}.manage`,
        label: feature.label,
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canDelete: feature.area !== 'reports',
        canExport: true,
        apiRoute: feature.apiRoute,
        menuPath: feature.menuPath,
      },
    });
    permissions.push(perm);
  }

  const adminRole = roles.find((r) => r.roleCode === 'REGISTRAR');
  const teacherRole = roles.find((r) => r.roleCode === 'TEACHER');
  const accountantRole = roles.find((r) => r.roleCode === 'ACCOUNTANT');

  if (adminRole) {
    for (const perm of permissions) {
      await prisma.rolePermission.create({
        data: { institutionId, roleId: adminRole.id, permissionId: perm.id, grantedBy: 'system' },
      });
    }
  }

  if (accountantRole) {
    const feePerm = permissions.find((p) => p.featureArea === 'fees');
    const reportsPerm = permissions.find((p) => p.featureArea === 'reports');
    for (const perm of [feePerm, reportsPerm].filter(Boolean)) {
      await prisma.rolePermission.create({
        data: {
          institutionId,
          roleId: accountantRole.id,
          permissionId: perm!.id,
          grantedBy: 'system',
        },
      });
    }
  }

  if (teacherRole) {
    for (const area of ['academic', 'examination', 'students']) {
      const perm = permissions.find((p) => p.featureArea === area);
      if (perm) {
        await prisma.rolePermission.create({
          data: {
            institutionId,
            roleId: teacherRole.id,
            permissionId: perm.id,
            grantedBy: 'system',
          },
        });
      }
    }
  }

  return { bootstrapped: true, roles: roles.length, permissions: permissions.length };
}

export async function getUserGovernanceOverview(institutionId: string) {
  await bootstrapUserGovernance(institutionId);

  const [users, roles, permissions, assignments, rolePermissionCount] = await Promise.all([
    prisma.user.count(),
    prisma.governanceRole.count({ where: { institutionId, isActive: true } }),
    prisma.governancePermission.count({ where: { institutionId, isActive: true } }),
    prisma.userRoleAssignment.count({ where: { institutionId, isActive: true } }),
    prisma.rolePermission.count({ where: { institutionId } }),
  ]);

  const activeUsers = await prisma.user.count({ where: { accountStatus: 'ACTIVE' } });
  const lockedUsers = await prisma.user.count({ where: { accountStatus: 'LOCKED' } });
  const pendingUsers = await prisma.user.count({ where: { accountStatus: 'PENDING' } });

  return {
    stats: { users, activeUsers, lockedUsers, pendingUsers, roles, permissions, assignments, rolePermissionCount },
    featureAreas: FEATURE_AREAS.map((f) => f.area),
  };
}

export async function listGovernanceUsers(filters: { status?: AccountStatus; userType?: GovernanceUserType } = {}) {
  const where: Prisma.UserWhereInput = {};
  if (filters.status) where.accountStatus = filters.status;
  if (filters.userType) where.userType = filters.userType;

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
      accountStatus: true,
      userType: true,
      phone: true,
      activationSentAt: true,
      lastLoginAt: true,
      createdAt: true,
      roleAssignments: {
        where: { isActive: true },
        include: { role: { select: { id: true, roleCode: true, roleLabel: true } } },
      },
    },
  });
  return users;
}

export async function createGovernanceUser(
  institutionId: string,
  payload: {
    email: string;
    displayName: string;
    userType: GovernanceUserType;
    phone?: string;
    systemRole?: 'ADMIN' | 'STAFF' | 'SUPER_ADMIN';
  },
  actor: AuditActor & { userEmail: string },
) {
  const existing = await prisma.user.findUnique({ where: { email: payload.email } });
  if (existing) throw new Error('Email already registered');

  const tempPassword = generateTempPassword();
  const activationToken = generateActivationToken();
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  const user = await prisma.user.create({
    data: {
      email: payload.email,
      displayName: payload.displayName,
      passwordHash,
      userType: payload.userType,
      phone: payload.phone ?? '',
      role: payload.systemRole ?? 'STAFF',
      accountStatus: 'PENDING',
      activationToken,
      activationSentAt: new Date(),
    },
    select: {
      id: true,
      email: true,
      displayName: true,
      userType: true,
      accountStatus: true,
      activationSentAt: true,
    },
  });

  await logDataChange(institutionId, {
    userId: actor.userId ?? '',
    userEmail: actor.userEmail,
    tableName: 'User',
    entityId: user.id,
    operation: 'CREATE',
    afterData: { email: user.email, userType: user.userType, accountStatus: user.accountStatus },
    ipAddress: actor.ipAddress,
  });

  await logUserActivity(institutionId, {
    userId: actor.userId ?? '',
    userEmail: actor.userEmail,
    action: 'USER_CREATED',
    module: 'User Governance',
    entityType: 'User',
    entityId: user.id,
    details: `Activation email dispatched to ${user.email}`,
    ipAddress: actor.ipAddress,
  });

  const emailQueued = await dispatchActivationEmail(
    institutionId,
    user.email,
    payload.displayName,
    activationToken,
    tempPassword,
  );

  void fireUserCreatedWebhook(institutionId, {
    id: user.id,
    email: user.email,
    name: user.displayName,
  }).catch(() => undefined);

  return {
    user,
    tempPassword,
    activationToken,
    activationEmailDispatched: emailQueued,
    message: emailQueued
      ? `User created. Activation email queued for ${user.email}`
      : `User created. Configure SMTP gateway to send activation email to ${user.email}`,
  };
}

export async function updateGovernanceUser(
  institutionId: string,
  userId: string,
  payload: Partial<{
    displayName: string;
    phone: string;
    userType: GovernanceUserType;
    accountStatus: AccountStatus;
    systemRole: 'ADMIN' | 'STAFF' | 'SUPER_ADMIN';
  }>,
  actor: AuditActor & { userEmail: string },
) {
  const before = await prisma.user.findUnique({ where: { id: userId } });
  if (!before) throw new Error('User not found');

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      displayName: payload.displayName,
      phone: payload.phone,
      userType: payload.userType,
      accountStatus: payload.accountStatus,
      role: payload.systemRole,
    },
    select: {
      id: true,
      email: true,
      displayName: true,
      userType: true,
      accountStatus: true,
      role: true,
      phone: true,
    },
  });

  await logDataChange(institutionId, {
    userId: actor.userId ?? '',
    userEmail: actor.userEmail,
    tableName: 'User',
    entityId: userId,
    operation: 'UPDATE',
    beforeData: { displayName: before.displayName, accountStatus: before.accountStatus, userType: before.userType },
    afterData: user,
    ipAddress: actor.ipAddress,
  });

  invalidateUserPermissionCache(userId, institutionId);
  return user;
}

export async function setUserAccountStatus(
  institutionId: string,
  userId: string,
  status: AccountStatus,
  actor: AuditActor & { userEmail: string },
  reason = '',
) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { accountStatus: status },
    select: { id: true, email: true, accountStatus: true },
  });

  await logActionHistory(institutionId, {
    userId: actor.userId ?? '',
    userEmail: actor.userEmail,
    actionCategory: 'ROLE_CHANGE',
    action: `User account ${status.toLowerCase()}`,
    details: `${user.email}${reason ? `: ${reason}` : ''}`,
    ipAddress: actor.ipAddress,
  });

  if (status === 'LOCKED' || status === 'INACTIVE') {
    await prisma.securityLoginSession.updateMany({
      where: { institutionId, userId, status: 'ACTIVE' },
      data: { status: 'FORCED_LOGOUT', logoutAt: new Date() },
    });
  }

  invalidateUserPermissionCache(userId, institutionId);
  return user;
}

export async function activateGovernanceUser(userId: string, token: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.activationToken !== token) throw new Error('Invalid activation token');
  return prisma.user.update({
    where: { id: userId },
    data: { accountStatus: 'ACTIVE', activationToken: '' },
    select: { id: true, email: true, accountStatus: true },
  });
}

export async function listGovernanceRoles(institutionId: string) {
  return prisma.governanceRole.findMany({
    where: { institutionId },
    orderBy: [{ level: 'desc' }, { roleLabel: 'asc' }],
    include: {
      _count: { select: { permissions: true, userAssignments: true } },
    },
  });
}

export async function createGovernanceRole(
  institutionId: string,
  payload: { roleLabel: string; description?: string; level?: number; parentRoleId?: string },
  actor: AuditActor & { userEmail: string },
) {
  const roleCode = slugCode(payload.roleLabel);
  const role = await prisma.governanceRole.create({
    data: {
      institutionId,
      roleCode,
      roleLabel: payload.roleLabel,
      description: payload.description ?? '',
      level: payload.level ?? 1,
      parentRoleId: payload.parentRoleId || null,
    },
  });

  if (payload.parentRoleId) {
    const parentMappings = await prisma.rolePermission.findMany({
      where: { institutionId, roleId: payload.parentRoleId },
    });
    if (parentMappings.length) {
      await prisma.rolePermission.createMany({
        data: parentMappings.map((m) => ({
          institutionId,
          roleId: role.id,
          permissionId: m.permissionId,
          grantedBy: 'inheritance',
        })),
        skipDuplicates: true,
      });
    }
  }

  invalidateUserPermissionCache();
  await logUserActivity(institutionId, {
    userId: actor.userId ?? '',
    userEmail: actor.userEmail,
    action: 'ROLE_CREATED',
    module: 'User Governance',
    entityType: 'GovernanceRole',
    entityId: role.id,
    details: role.roleLabel,
    ipAddress: actor.ipAddress,
  });

  return role;
}

export async function updateGovernanceRole(
  institutionId: string,
  roleId: string,
  payload: Partial<{ roleLabel: string; description: string; level: number; isActive: boolean; parentRoleId: string | null }>,
  actor: AuditActor & { userEmail: string },
) {
  const role = await prisma.governanceRole.update({
    where: { id: roleId },
    data: payload,
  });

  invalidateUserPermissionCache();
  await invalidateSessionsForRole(institutionId, roleId);

  await logUserActivity(institutionId, {
    userId: actor.userId ?? '',
    userEmail: actor.userEmail,
    action: 'ROLE_UPDATED',
    module: 'User Governance',
    entityId: roleId,
    details: role.roleLabel,
    ipAddress: actor.ipAddress,
  });

  return role;
}

export async function listGovernancePermissions(institutionId: string, featureArea?: string) {
  const where: Prisma.GovernancePermissionWhereInput = { institutionId };
  if (featureArea) where.featureArea = featureArea;
  return prisma.governancePermission.findMany({ where, orderBy: [{ featureArea: 'asc' }, { label: 'asc' }] });
}

export async function updateGovernancePermission(
  institutionId: string,
  permissionId: string,
  payload: Partial<{
    canCreate: boolean;
    canRead: boolean;
    canUpdate: boolean;
    canDelete: boolean;
    canExport: boolean;
    isActive: boolean;
  }>,
  actor: AuditActor & { userEmail: string },
) {
  const permission = await prisma.governancePermission.update({
    where: { id: permissionId },
    data: payload,
  });

  invalidateUserPermissionCache();

  await logActionHistory(institutionId, {
    userId: actor.userId ?? '',
    userEmail: actor.userEmail,
    actionCategory: 'POLICY_UPDATE',
    action: 'Permission updated',
    details: `${permission.permissionCode}: C=${permission.canCreate} R=${permission.canRead} U=${permission.canUpdate} D=${permission.canDelete} X=${permission.canExport}`,
    ipAddress: actor.ipAddress,
  });

  return permission;
}

export async function getRolePermissionMatrix(institutionId: string, roleId: string) {
  const [role, permissions, mappings] = await Promise.all([
    prisma.governanceRole.findUnique({ where: { id: roleId } }),
    prisma.governancePermission.findMany({ where: { institutionId, isActive: true } }),
    prisma.rolePermission.findMany({ where: { institutionId, roleId } }),
  ]);
  if (!role) throw new Error('Role not found');

  const mappedIds = new Set(mappings.map((m) => m.permissionId));
  return {
    role,
    permissions: permissions.map((p) => ({
      ...p,
      granted: mappedIds.has(p.id),
    })),
  };
}

export async function saveRolePermissionMatrix(
  institutionId: string,
  roleId: string,
  permissionIds: string[],
  actor: AuditActor & { userEmail: string },
) {
  await prisma.rolePermission.deleteMany({ where: { institutionId, roleId } });
  if (permissionIds.length) {
    await prisma.rolePermission.createMany({
      data: permissionIds.map((permissionId) => ({
        institutionId,
        roleId,
        permissionId,
        grantedBy: actor.userEmail,
      })),
    });
  }

  await invalidateSessionsForRole(institutionId, roleId);
  invalidateUserPermissionCache();

  await logActionHistory(institutionId, {
    userId: actor.userId ?? '',
    userEmail: actor.userEmail,
    actionCategory: 'POLICY_UPDATE',
    action: 'Role permissions mapping updated',
    details: `Role ${roleId}: ${permissionIds.length} permission(s)`,
    ipAddress: actor.ipAddress,
    severity: 'CRITICAL',
  });

  return getRolePermissionMatrix(institutionId, roleId);
}

export async function getUserRoleAssignments(institutionId: string, userId: string) {
  const [user, roles, assignments] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, displayName: true, userType: true },
    }),
    prisma.governanceRole.findMany({ where: { institutionId, isActive: true } }),
    prisma.userRoleAssignment.findMany({
      where: { institutionId, userId },
      include: { role: true },
    }),
  ]);
  if (!user) throw new Error('User not found');

  const assignedRoleIds = new Set(assignments.filter((a) => a.isActive).map((a) => a.roleId));
  return {
    user,
    roles: roles.map((r) => ({ ...r, assigned: assignedRoleIds.has(r.id) })),
    assignments,
  };
}

export async function saveUserRoleAssignments(
  institutionId: string,
  userId: string,
  payload: { roleIds: string[]; scope?: string; scopeRef?: string },
  actor: AuditActor & { userEmail: string },
) {
  const scope = payload.scope ?? 'INSTITUTION';
  const scopeRef = payload.scopeRef ?? '';

  await prisma.userRoleAssignment.updateMany({
    where: { institutionId, userId, scope, scopeRef },
    data: { isActive: false },
  });

  for (const roleId of payload.roleIds) {
    await prisma.userRoleAssignment.upsert({
      where: {
        userId_roleId_scope_scopeRef: { userId, roleId, scope, scopeRef },
      },
      create: {
        institutionId,
        userId,
        roleId,
        scope,
        scopeRef,
        assignedBy: actor.userEmail,
        isActive: true,
      },
      update: {
        isActive: true,
        assignedBy: actor.userEmail,
        assignedAt: new Date(),
      },
    });
  }

  invalidateUserPermissionCache(userId, institutionId);
  await prisma.securityLoginSession.updateMany({
    where: { institutionId, userId, status: 'ACTIVE' },
    data: { status: 'FORCED_LOGOUT', logoutAt: new Date() },
  });

  await logActionHistory(institutionId, {
    userId: actor.userId ?? '',
    userEmail: actor.userEmail,
    actionCategory: 'ROLE_CHANGE',
    action: 'User role assignment updated',
    entityType: 'User',
    entityId: userId,
    details: `Roles: ${payload.roleIds.join(', ')} scope=${scope}`,
    ipAddress: actor.ipAddress,
    severity: 'CRITICAL',
  });

  return getUserRoleAssignments(institutionId, userId);
}

export async function resolveUserPermissions(userId: string, institutionId: string) {
  const key = cacheKey(userId, institutionId);
  const cached = permissionCache.get(key);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.permissions;
  }

  const assignments = await prisma.userRoleAssignment.findMany({
    where: { institutionId, userId, isActive: true },
    select: { roleId: true },
  });
  const directRoleIds = assignments.map((a) => a.roleId);
  const roleIds = await expandRoleIdsWithAncestors(directRoleIds);
  if (!roleIds.length) {
    const empty = new Set<string>();
    permissionCache.set(key, { permissions: empty, cachedAt: Date.now() });
    return empty;
  }

  const mappings = await prisma.rolePermission.findMany({
    where: { institutionId, roleId: { in: roleIds } },
    include: { permission: true },
  });

  const permissions = new Set<string>();
  for (const m of mappings) {
    const p = m.permission;
    if (!p.isActive) continue;
    if (p.canCreate) permissions.add(`${p.featureArea}:create`);
    if (p.canRead) permissions.add(`${p.featureArea}:read`);
    if (p.canUpdate) permissions.add(`${p.featureArea}:update`);
    if (p.canDelete) permissions.add(`${p.featureArea}:delete`);
    if (p.canExport) permissions.add(`${p.featureArea}:export`);
    permissions.add(`${p.featureArea}:manage`);
  }

  permissionCache.set(key, { permissions, cachedAt: Date.now() });
  return permissions;
}

export async function userHasPermission(
  userId: string,
  institutionId: string,
  featureArea: string,
  action: 'create' | 'read' | 'update' | 'delete' | 'export' | 'manage',
) {
  const perms = await resolveUserPermissions(userId, institutionId);
  return perms.has(`${featureArea}:${action}`) || perms.has(`${featureArea}:manage`);
}

export async function suspendGovernanceUser(
  institutionId: string,
  userId: string,
  actor: AuditActor & { userEmail: string },
  reason = '',
) {
  return setUserAccountStatus(institutionId, userId, 'LOCKED', actor, reason);
}

export async function assertAccountCanLogin(user: { accountStatus: AccountStatus }) {
  if (user.accountStatus === 'LOCKED') {
    throw new Error('Account is locked. Contact your administrator.');
  }
  if (user.accountStatus === 'INACTIVE') {
    throw new Error('Account is deactivated.');
  }
  if (user.accountStatus === 'PENDING') {
    throw new Error('Account pending activation. Check your email for the activation link.');
  }
}
