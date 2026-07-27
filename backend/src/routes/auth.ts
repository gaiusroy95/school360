import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, signMfaPendingToken, signToken, verifyMfaPendingToken } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { getDefaultInstitutionId } from '../lib/institution.js';
import { checkLoginAllowed, getSessionTimeoutMinutes, recordLoginEvent, checkIpAccessAllowed } from '../lib/securityAuditCompliance.js';
import { assertAccountCanLogin } from '../lib/userGovernanceAccess.js';
import {
  beginMfaSetup,
  checkFirewallBlocked,
  confirmMfaSetup,
  getMfaEnrollmentStatus,
  getMfaPolicy,
  userRequiresMfa,
  verifyMfaCode,
} from '../lib/securityBackupAuditE2E.js';
import { fireUserCreatedWebhook } from '../lib/integrationsApiUpdatesE2E.js';

export const authRouter = Router();

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(2).optional(),
});

authRouter.post('/register', asyncHandler(async (req, res) => {
  const parsed = credentialsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { email, password, displayName } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      displayName: displayName || email.split('@')[0],
      role: 'ADMIN',
    },
  });

  try {
    const institutionId = await getDefaultInstitutionId();
    void fireUserCreatedWebhook(institutionId, {
      id: user.id,
      email: user.email,
      name: user.displayName,
    }).catch(() => undefined);
  } catch {
    // institution may not be ready during bootstrap registration
  }

  const token = signToken({ userId: user.id, email: user.email, role: user.role });
  return res.status(201).json({
    token,
    user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role },
  });
}));

authRouter.post('/login', asyncHandler(async (req, res) => {
  const parsed = credentialsSchema.pick({ email: true, password: true }).safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { email, password } = parsed.data;
  const institutionId = await getDefaultInstitutionId();
  const forwarded = req.headers['x-forwarded-for'];
  const ipAddress = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.ip;
  const userAgent = String(req.headers['user-agent'] || '');

  const lockCheck = await checkLoginAllowed(institutionId, email);
  if (!lockCheck.allowed) {
    return res.status(429).json({ error: lockCheck.message });
  }

  const ipCheck = await checkIpAccessAllowed(institutionId, ipAddress);
  if (!ipCheck.allowed) {
    return res.status(403).json({ error: ipCheck.message ?? 'IP not allowed' });
  }

  const firewall = await checkFirewallBlocked(institutionId, ipAddress);
  if (firewall.blocked) {
    return res.status(403).json({ error: firewall.message ?? 'Blocked by firewall' });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    await recordLoginEvent(institutionId, {
      userEmail: email,
      eventType: 'FAILED',
      ipAddress,
      userAgent,
      failureReason: 'Unknown email',
    });
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    await recordLoginEvent(institutionId, {
      userId: user.id,
      userEmail: email,
      eventType: 'FAILED',
      ipAddress,
      userAgent,
      failureReason: 'Invalid password',
    });
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  try {
    await assertAccountCanLogin(user);
  } catch (e) {
    return res.status(403).json({ error: e instanceof Error ? e.message : 'Account cannot login' });
  }

  const mfaPolicy = await getMfaPolicy(institutionId);
  if (userRequiresMfa(user.role, mfaPolicy)) {
    const enrollment = await getMfaEnrollmentStatus(user.id);
    const purpose = enrollment.enrolled ? 'mfa_verify' : 'mfa_setup';
    const mfaToken = signMfaPendingToken({ userId: user.id, email: user.email, purpose });
    return res.status(403).json({
      error: 'MFA required',
      mfaRequired: true,
      mfaSetupRequired: !enrollment.enrolled,
      mfaToken,
    });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const sessionId = await recordLoginEvent(institutionId, {
    userId: user.id,
    userEmail: user.email,
    eventType: 'LOGIN',
    ipAddress,
    userAgent,
    userRole: user.role,
  });

  const sessionTimeoutMinutes = await getSessionTimeoutMinutes(institutionId);
  const token = signToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    sessionId: sessionId ?? undefined,
  }, `${sessionTimeoutMinutes}m`);
  return res.json({
    token,
    user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role },
  });
}));

authRouter.post('/mfa/setup', asyncHandler(async (req, res) => {
  const mfaToken = String(req.body?.mfaToken ?? '');
  const pending = verifyMfaPendingToken(mfaToken);
  if (pending.purpose !== 'mfa_setup') {
    return res.status(400).json({ error: 'Invalid MFA setup token' });
  }
  const setup = await beginMfaSetup(pending.userId, pending.email);
  return res.json({
    message: 'Scan the OTP URI in your authenticator app, then confirm with a code',
    otpauthUrl: setup.otpauthUrl,
    secret: setup.secret,
  });
}));

authRouter.post('/mfa/confirm-setup', asyncHandler(async (req, res) => {
  const mfaToken = String(req.body?.mfaToken ?? '');
  const code = String(req.body?.code ?? '');
  const pending = verifyMfaPendingToken(mfaToken);
  await confirmMfaSetup(pending.userId, code);
  return res.json({ message: 'MFA enrolled. Verify to complete login.' });
}));

authRouter.post('/mfa/verify', asyncHandler(async (req, res) => {
  const mfaToken = String(req.body?.mfaToken ?? '');
  const code = String(req.body?.code ?? '');
  const pending = verifyMfaPendingToken(mfaToken);
  await verifyMfaCode(pending.userId, code);

  const user = await prisma.user.findUnique({ where: { id: pending.userId } });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const institutionId = await getDefaultInstitutionId();
  const forwarded = req.headers['x-forwarded-for'];
  const ipAddress = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.ip;
  const userAgent = String(req.headers['user-agent'] || '');

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const sessionId = await recordLoginEvent(institutionId, {
    userId: user.id,
    userEmail: user.email,
    eventType: 'LOGIN',
    ipAddress,
    userAgent,
    userRole: user.role,
  });

  const sessionTimeoutMinutes = await getSessionTimeoutMinutes(institutionId);
  const token = signToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    sessionId: sessionId ?? undefined,
  }, `${sessionTimeoutMinutes}m`);

  return res.json({
    token,
    user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role },
  });
}));

authRouter.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { id: true, email: true, displayName: true, role: true, createdAt: true },
  });
  if (!user) return res.status(404).json({ error: 'User not found' });
  return res.json({ user });
}));
