import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { UserRole } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { getDefaultInstitutionId } from '../lib/institution.js';
import { userHasPermission } from '../lib/userGovernanceAccess.js';
import { checkIpAccessAllowed, getSessionTimeoutMinutes } from '../lib/securityAuditCompliance.js';
import { checkFirewallBlocked } from '../lib/securityBackupAuditE2E.js';

export type AuthUser = {
  userId: string;
  email: string;
  role: UserRole;
  sessionId?: string;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function signToken(payload: AuthUser, expiresIn?: string | number): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set');
  const exp = expiresIn ?? process.env.JWT_EXPIRES_IN ?? '7d';
  return jwt.sign(payload, secret, { expiresIn: exp } as jwt.SignOptions);
}

export type MfaPendingPayload = {
  userId: string;
  email: string;
  purpose: 'mfa_verify' | 'mfa_setup';
};

export function signMfaPendingToken(payload: MfaPendingPayload): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set');
  return jwt.sign({ ...payload, type: 'mfa_pending' }, secret, { expiresIn: '10m' });
}

export function verifyMfaPendingToken(token: string): MfaPendingPayload {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set');
  const decoded = jwt.verify(token, secret) as MfaPendingPayload & { type?: string };
  if (decoded.type !== 'mfa_pending') throw new Error('Invalid MFA token');
  return { userId: decoded.userId, email: decoded.email, purpose: decoded.purpose };
}

const ROUTE_FEATURES: Array<[string, string]> = [
  ['/api/students', 'students'],
  ['/api/student-', 'students'],
  ['/api/admissions', 'admissions'],
  ['/api/admission-', 'admissions'],
  ['/api/academic', 'academic'],
  ['/api/attendance', 'academic'],
  ['/api/examination', 'examination'],
  ['/api/fee-finance', 'fees'],
  ['/api/fee-collection', 'fees'],
  ['/api/hr', 'hr'],
  ['/api/transport', 'transport'],
  ['/api/reports-analytics', 'reports'],
  ['/api/settings', 'settings'],
];

function resolveFeatureArea(path: string): string | null {
  for (const [prefix, feature] of ROUTE_FEATURES) {
    if (path.startsWith(prefix)) return feature;
  }
  return null;
}

function actionFromMethod(method: string): 'create' | 'read' | 'update' | 'delete' | 'export' {
  if (method === 'GET' || method === 'HEAD') return 'read';
  if (method === 'POST') return 'create';
  if (method === 'PUT' || method === 'PATCH') return 'update';
  if (method === 'DELETE') return 'delete';
  return 'read';
}

async function assertActiveSession(user: AuthUser) {
  if (!user.sessionId) return;
  const institutionId = await getDefaultInstitutionId();
  const timeoutMinutes = await getSessionTimeoutMinutes(institutionId);
  const session = await prisma.securityLoginSession.findUnique({ where: { id: user.sessionId } });
  if (!session || session.status !== 'ACTIVE' || session.userId !== user.userId) {
    throw new Error('SESSION_INVALID');
  }
  const idleMs = Date.now() - session.lastActivityAt.getTime();
  if (idleMs > timeoutMinutes * 60_000) {
    await prisma.securityLoginSession.update({
      where: { id: user.sessionId },
      data: { status: 'EXPIRED' },
    });
    throw new Error('SESSION_INVALID');
  }
  await prisma.securityLoginSession.update({
    where: { id: user.sessionId },
    data: { lastActivityAt: new Date() },
  });
}

function clientIpFromRequest(req: Request) {
  const forwarded = req.headers['x-forwarded-for'];
  return typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.ip;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET is not set');
    const token = header.slice(7);
    const decoded = jwt.verify(token, secret) as AuthUser;
    try {
      await assertActiveSession(decoded);
    } catch (e) {
      if (e instanceof Error && e.message === 'SESSION_INVALID') {
        return res.status(401).json({ error: 'Session expired or revoked. Please login again.' });
      }
      throw e;
    }
    req.user = decoded;

    const institutionId = await getDefaultInstitutionId();
    const clientIp = clientIpFromRequest(req);
    const firewall = await checkFirewallBlocked(institutionId, clientIp);
    if (firewall.blocked) {
      return res.status(403).json({ error: firewall.message ?? 'Blocked by firewall' });
    }
    const ipCheck = await checkIpAccessAllowed(institutionId, clientIp);
    if (!ipCheck.allowed) {
      return res.status(403).json({ error: ipCheck.message ?? 'IP not allowed' });
    }

    if (decoded.role !== 'SUPER_ADMIN' && decoded.role !== 'ADMIN') {
      const feature = resolveFeatureArea(req.originalUrl.split('?')[0]);
      if (feature && !req.originalUrl.startsWith('/api/auth')) {
        const institutionId = await getDefaultInstitutionId();
        const action = actionFromMethod(req.method);
        const allowed = await userHasPermission(decoded.userId, institutionId, feature, action);
        if (!allowed) {
          return res.status(403).json({ error: 'Insufficient permissions for this module' });
        }
      }
    }

    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
