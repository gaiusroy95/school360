import { api } from './api';

export type GovernanceOverview = {
  stats: {
    users: number;
    activeUsers: number;
    lockedUsers: number;
    pendingUsers: number;
    roles: number;
    permissions: number;
    assignments: number;
    rolePermissionCount: number;
  };
  featureAreas: string[];
};

export type GovernanceUser = {
  id: string;
  email: string;
  displayName: string;
  role: string;
  accountStatus: string;
  userType: string;
  phone: string;
  activationSentAt: string | null;
  lastLoginAt: string | null;
  roleAssignments: Array<{ role: { id: string; roleCode: string; roleLabel: string } }>;
};

export type GovernanceRole = {
  id: string;
  roleCode: string;
  roleLabel: string;
  description: string;
  level: number;
  isSystem: boolean;
  isActive: boolean;
  _count: { permissions: number; userAssignments: number };
};

export type GovernancePermission = {
  id: string;
  featureArea: string;
  permissionCode: string;
  label: string;
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canExport: boolean;
  apiRoute: string;
  menuPath: string;
  granted?: boolean;
};

export async function fetchGovernanceOverview() {
  return api<GovernanceOverview>(`/api/settings/user-governance/overview`);
}

export async function fetchGovernanceUsers() {
  return api<{ users: GovernanceUser[] }>(`/api/settings/user-governance/users`);
}

export async function createGovernanceUser(payload: {
  email: string;
  displayName: string;
  userType: string;
  phone?: string;
}) {
  return api<{ user: GovernanceUser; tempPassword: string; message: string }>(
    `/api/settings/user-governance/users`,
    { method: 'POST', body: JSON.stringify(payload) },
  );
}

export async function updateGovernanceUser(id: string, payload: Record<string, unknown>) {
  return api<{ user: GovernanceUser }>(`/api/settings/user-governance/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function lockGovernanceUser(id: string, reason?: string) {
  return api(`/api/settings/user-governance/users/${id}/lock`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function deactivateGovernanceUser(id: string, reason?: string) {
  return api(`/api/settings/user-governance/users/${id}/deactivate`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function activateGovernanceUser(id: string) {
  return api(`/api/settings/user-governance/users/${id}/activate`, { method: 'POST' });
}

export async function fetchGovernanceRoles() {
  return api<{ roles: GovernanceRole[] }>(`/api/settings/user-governance/roles`);
}

export async function createGovernanceRole(payload: { roleLabel: string; description?: string; level?: number }) {
  return api<{ role: GovernanceRole; message: string }>(`/api/settings/user-governance/roles`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchGovernancePermissions(featureArea?: string) {
  const suffix = featureArea ? `?featureArea=${encodeURIComponent(featureArea)}` : '';
  return api<{ permissions: GovernancePermission[] }>(`/api/settings/user-governance/permissions${suffix}`);
}

export async function updateGovernancePermission(id: string, payload: Record<string, boolean>) {
  return api(`/api/settings/user-governance/permissions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function fetchRolePermissionMatrix(roleId: string) {
  return api<{ role: GovernanceRole; permissions: GovernancePermission[] }>(
    `/api/settings/user-governance/role-permissions/${roleId}`,
  );
}

export async function saveRolePermissionMatrix(roleId: string, permissionIds: string[]) {
  return api(`/api/settings/user-governance/role-permissions/${roleId}`, {
    method: 'PUT',
    body: JSON.stringify({ permissionIds }),
  });
}

export async function fetchUserRoleAssignments(userId: string) {
  return api<{
    user: { id: string; email: string; displayName: string };
    roles: Array<GovernanceRole & { assigned: boolean }>;
  }>(`/api/settings/user-governance/user-roles/${userId}`);
}

export async function saveUserRoleAssignments(userId: string, roleIds: string[], scope?: string) {
  return api(`/api/settings/user-governance/user-roles/${userId}`, {
    method: 'PUT',
    body: JSON.stringify({ roleIds, scope }),
  });
}
