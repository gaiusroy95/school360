import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { MobileAppRole, ParentRelationship } from '@prisma/client';
import { assertStudentAccess, type MobileAuthUser } from '../lib/mobileAuth.js';

export const MOBILE_TOKEN_TYPE = 'mobile' as const;

export type MobileTokenPayload = {
  type: typeof MOBILE_TOKEN_TYPE;
  accountId: string;
  institutionId: string;
  role: MobileAppRole;
  displayName: string;
  mustResetPassword: boolean;
  admissionNumber?: string;
  employeeCode?: string;
  studentId?: string;
  studentIds: string[];
  parentKey?: string;
  parentRelationship?: ParentRelationship;
  teacherProfileId?: string;
  staffProfileId?: string;
};

declare global {
  namespace Express {
    interface Request {
      mobileUser?: MobileAuthUser;
    }
  }
}

function jwtSecret() {
  const secret = process.env.MOBILE_JWT_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set');
  return secret;
}

export function signMobileToken(user: MobileAuthUser): string {
  const expiresIn = process.env.MOBILE_JWT_EXPIRES_IN || process.env.JWT_EXPIRES_IN || '30d';
  const payload: MobileTokenPayload = {
    type: MOBILE_TOKEN_TYPE,
    accountId: user.accountId,
    institutionId: user.institutionId,
    role: user.role,
    displayName: user.displayName,
    mustResetPassword: user.mustResetPassword,
    admissionNumber: user.admissionNumber,
    employeeCode: user.employeeCode,
    studentId: user.studentId,
    studentIds: user.studentIds,
    parentKey: user.parentKey,
    parentRelationship: user.parentRelationship,
    teacherProfileId: user.teacherProfileId,
    staffProfileId: user.staffProfileId,
  };
  return jwt.sign(payload, jwtSecret(), { expiresIn } as jwt.SignOptions);
}

export function tokenToMobileUser(payload: MobileTokenPayload): MobileAuthUser {
  return {
    accountId: payload.accountId,
    institutionId: payload.institutionId,
    role: payload.role,
    displayName: payload.displayName,
    mustResetPassword: payload.mustResetPassword,
    admissionNumber: payload.admissionNumber,
    employeeCode: payload.employeeCode,
    studentId: payload.studentId,
    studentIds: payload.studentIds ?? [],
    activeStudentId: payload.studentId ?? payload.studentIds?.[0],
    parentKey: payload.parentKey,
    parentRelationship: payload.parentRelationship,
    teacherProfileId: payload.teacherProfileId,
    staffProfileId: payload.staffProfileId,
  };
}

export function requireMobileAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const token = header.slice(7);
    const decoded = jwt.verify(token, jwtSecret()) as MobileTokenPayload;
    if (decoded.type !== MOBILE_TOKEN_TYPE) {
      return res.status(401).json({ error: 'Invalid mobile token' });
    }
    req.mobileUser = tokenToMobileUser(decoded);
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/** Block protected resources until the user changes their default password. */
export function requirePasswordChanged(req: Request, res: Response, next: NextFunction) {
  if (req.mobileUser?.mustResetPassword) {
    return res.status(403).json({
      error: 'Password reset required',
      code: 'PASSWORD_RESET_REQUIRED',
    });
  }
  return next();
}

export function requireMobileRoles(...roles: MobileAppRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.mobileUser || !roles.includes(req.mobileUser.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    return next();
  };
}

/** Ensures query/body studentId is accessible to student/parent accounts. */
export function requireStudentScope(paramName = 'studentId') {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.mobileUser) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const fromQuery = typeof req.query[paramName] === 'string' ? req.query[paramName] : undefined;
    const fromBody =
      req.body && typeof req.body === 'object' && paramName in req.body
        ? String((req.body as Record<string, unknown>)[paramName])
        : undefined;
    const studentId = fromQuery || fromBody || req.mobileUser.activeStudentId;

    if (!studentId) {
      return res.status(400).json({ error: `${paramName} is required` });
    }

    try {
      assertStudentAccess(req.mobileUser, studentId);
    } catch (e) {
      return res.status(403).json({ error: e instanceof Error ? e.message : 'Forbidden' });
    }

    (req as Request & { scopedStudentId?: string }).scopedStudentId = studentId;
    return next();
  };
}
