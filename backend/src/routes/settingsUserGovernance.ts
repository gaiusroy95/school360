import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requirePermission } from '../middleware/governancePermissions.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { getDefaultInstitutionId } from '../lib/institution.js';
import {
  activateGovernanceUser,
  createGovernanceRole,
  createGovernanceUser,
  getRolePermissionMatrix,
  getUserGovernanceOverview,
  getUserRoleAssignments,
  listGovernancePermissions,
  listGovernanceRoles,
  listGovernanceUsers,
  saveRolePermissionMatrix,
  saveUserRoleAssignments,
  suspendGovernanceUser,
  setUserAccountStatus,
  updateGovernancePermission,
  updateGovernanceRole,
  updateGovernanceUser,
} from '../lib/userGovernanceAccess.js';

export const settingsUserGovernanceRouter = Router();
settingsUserGovernanceRouter.use(requireAuth);

function actor(req: { user?: { userId: string; email: string }; ip?: string; headers?: Record<string, string | string[] | undefined> }) {
  const forwarded = req.headers?.['x-forwarded-for'];
  const ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.ip;
  return {
    userId: req.user?.userId,
    userEmail: req.user?.email ?? 'unknown',
    ipAddress: ip,
  };
}

settingsUserGovernanceRouter.get(
  '/overview',
  requirePermission('user_governance', 'read'),
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await getUserGovernanceOverview(institutionId));
  }),
);

settingsUserGovernanceRouter.get(
  '/users',
  requirePermission('user_governance', 'read'),
  asyncHandler(async (req, res) => {
    const users = await listGovernanceUsers({
      status: typeof req.query.status === 'string' ? req.query.status as 'ACTIVE' | 'LOCKED' | 'INACTIVE' | 'PENDING' : undefined,
      userType: typeof req.query.userType === 'string' ? req.query.userType as 'STAFF' | 'STUDENT' | 'PARENT' | 'ADMIN' : undefined,
    });
    return res.json({ users });
  }),
);

settingsUserGovernanceRouter.post(
  '/users',
  requirePermission('user_governance', 'create'),
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await createGovernanceUser(institutionId, req.body, actor(req));
    return res.status(201).json(result);
  }),
);

settingsUserGovernanceRouter.patch(
  '/users/:id',
  requirePermission('user_governance', 'update'),
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const user = await updateGovernanceUser(institutionId, req.params.id, req.body, actor(req));
    return res.json({ user });
  }),
);

settingsUserGovernanceRouter.post(
  '/users/:id/suspend',
  requirePermission('user_governance', 'update'),
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const user = await suspendGovernanceUser(institutionId, req.params.id, actor(req), req.body?.reason);
    return res.json({ user, message: 'User account suspended' });
  }),
);

settingsUserGovernanceRouter.post(
  '/users/:id/lock',
  requirePermission('user_governance', 'update'),
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const user = await setUserAccountStatus(institutionId, req.params.id, 'LOCKED', actor(req), req.body?.reason);
    return res.json({ user, message: 'User account locked' });
  }),
);

settingsUserGovernanceRouter.post(
  '/users/:id/deactivate',
  requirePermission('user_governance', 'update'),
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const user = await setUserAccountStatus(institutionId, req.params.id, 'INACTIVE', actor(req), req.body?.reason);
    return res.json({ user, message: 'User account deactivated' });
  }),
);

settingsUserGovernanceRouter.post(
  '/users/:id/activate',
  requirePermission('user_governance', 'update'),
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    if (req.body?.token) {
      const user = await activateGovernanceUser(req.params.id, String(req.body.token));
      return res.json({ user, message: 'User activated' });
    }
    const user = await setUserAccountStatus(institutionId, req.params.id, 'ACTIVE', actor(req));
    return res.json({ user, message: 'User activated by administrator' });
  }),
);

settingsUserGovernanceRouter.get(
  '/roles',
  requirePermission('user_governance', 'read'),
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json({ roles: await listGovernanceRoles(institutionId) });
  }),
);

settingsUserGovernanceRouter.post(
  '/roles',
  requirePermission('user_governance', 'create'),
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const role = await createGovernanceRole(institutionId, req.body, actor(req));
    return res.status(201).json({ role, message: 'Role created and authorization cache refreshed' });
  }),
);

settingsUserGovernanceRouter.patch(
  '/roles/:id',
  requirePermission('user_governance', 'update'),
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const role = await updateGovernanceRole(institutionId, req.params.id, req.body, actor(req));
    return res.json({ role, message: 'Role updated; affected sessions invalidated' });
  }),
);

settingsUserGovernanceRouter.get(
  '/permissions',
  requirePermission('user_governance', 'read'),
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const permissions = await listGovernancePermissions(
      institutionId,
      typeof req.query.featureArea === 'string' ? req.query.featureArea : undefined,
    );
    return res.json({ permissions });
  }),
);

settingsUserGovernanceRouter.patch(
  '/permissions/:id',
  requirePermission('user_governance', 'update'),
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const permission = await updateGovernancePermission(institutionId, req.params.id, req.body, actor(req));
    return res.json({ permission, message: 'Permission updated; route guards will enforce on next request' });
  }),
);

settingsUserGovernanceRouter.get(
  '/role-permissions/:roleId',
  requirePermission('user_governance', 'read'),
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await getRolePermissionMatrix(institutionId, req.params.roleId));
  }),
);

settingsUserGovernanceRouter.put(
  '/role-permissions/:roleId',
  requirePermission('user_governance', 'update'),
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const permissionIds = Array.isArray(req.body?.permissionIds) ? req.body.permissionIds.map(String) : [];
    const matrix = await saveRolePermissionMatrix(institutionId, req.params.roleId, permissionIds, actor(req));
    return res.json({ matrix, message: 'Role permissions saved; user sessions invalidated' });
  }),
);

settingsUserGovernanceRouter.get(
  '/user-roles/:userId',
  requirePermission('user_governance', 'read'),
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await getUserRoleAssignments(institutionId, req.params.userId));
  }),
);

settingsUserGovernanceRouter.put(
  '/user-roles/:userId',
  requirePermission('user_governance', 'update'),
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const roleIds = Array.isArray(req.body?.roleIds) ? req.body.roleIds.map(String) : [];
    const result = await saveUserRoleAssignments(institutionId, req.params.userId, {
      roleIds,
      scope: req.body?.scope,
      scopeRef: req.body?.scopeRef,
    }, actor(req));
    return res.json({ ...result, message: 'User roles assigned; authorization context will reload on next request' });
  }),
);
