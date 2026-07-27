import type { Request, Response, NextFunction } from 'express';
import { getDefaultInstitutionId } from '../lib/institution.js';
import { userHasPermission } from '../lib/userGovernanceAccess.js';

export function requirePermission(featureArea: string, action: 'create' | 'read' | 'update' | 'delete' | 'export' | 'manage' = 'read') {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user?.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (req.user.role === 'SUPER_ADMIN' || req.user.role === 'ADMIN') {
      return next();
    }
    try {
      const institutionId = await getDefaultInstitutionId();
      const allowed = await userHasPermission(req.user.userId, institutionId, featureArea, action);
      if (!allowed) {
        return res.status(403).json({ error: 'Insufficient permissions for this action' });
      }
      return next();
    } catch (e) {
      return res.status(500).json({ error: e instanceof Error ? e.message : 'Permission check failed' });
    }
  };
}
