import type { Request, Response, NextFunction } from 'express';
import type { UserRole } from '@prisma/client';

const APPROVER_ROLES: UserRole[] = ['SUPER_ADMIN', 'ADMIN'];

export function canApproveApplications(role?: UserRole) {
  return !!role && APPROVER_ROLES.includes(role);
}

export function requireApprover(req: Request, res: Response, next: NextFunction) {
  if (!canApproveApplications(req.user?.role)) {
    return res.status(403).json({ error: 'Only administrators can approve or reject applications' });
  }
  return next();
}
