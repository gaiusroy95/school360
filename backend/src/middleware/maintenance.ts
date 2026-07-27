import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { UserRole } from '@prisma/client';
import { getDefaultInstitutionId } from '../lib/institution.js';
import { isMaintenanceActive } from '../lib/coreSystemsSettings.js';
import type { AuthUser } from './auth.js';

const EXEMPT_PATHS = ['/health', '/api/auth/login', '/api/auth/register', '/api/settings/core-systems'];

export async function maintenanceMiddleware(req: Request, res: Response, next: NextFunction) {
  if (EXEMPT_PATHS.some((p) => req.path.startsWith(p))) {
    return next();
  }

  let role: UserRole | undefined;
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      const secret = process.env.JWT_SECRET;
      if (secret) {
        const decoded = jwt.verify(header.slice(7), secret) as AuthUser;
        role = decoded.role;
      }
    } catch {
      // Invalid token — treat as non-admin for maintenance gate
    }
  }

  try {
    const institutionId = await getDefaultInstitutionId();
    if (isMaintenanceActive(institutionId, role)) {
      res.setHeader('X-Maintenance-Mode', 'true');
      return res.status(503).json({
        error: 'Maintenance mode',
        message: 'System is under maintenance. Please try again later.',
      });
    }
  } catch {
    // Allow during cold start
  }

  return next();
}
