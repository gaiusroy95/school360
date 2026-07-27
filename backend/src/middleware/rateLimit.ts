import type { Request, Response, NextFunction } from 'express';
import { getDefaultInstitutionId } from '../lib/institution.js';
import { getRuntimeState } from '../lib/coreSystemsSettings.js';

type WindowEntry = { count: number; windowStart: number };

const windows = new Map<string, WindowEntry>();

function clientKey(req: Request) {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.ip || 'unknown';
  const userId = req.user?.userId ?? 'anon';
  return `${ip}:${userId}`;
}

export async function apiRateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.path.startsWith('/api/') || req.path.startsWith('/api/auth/login')) {
    return next();
  }

  try {
    const institutionId = await getDefaultInstitutionId();
    const runtime = getRuntimeState(institutionId);
    const limit = runtime?.maxApiRequestsPerMinute ?? 120;
    const key = clientKey(req);
    const now = Date.now();
    const windowMs = 60_000;

    let entry = windows.get(key);
    if (!entry || now - entry.windowStart >= windowMs) {
      entry = { count: 0, windowStart: now };
    }

    entry.count += 1;
    windows.set(key, entry);

    if (entry.count > limit) {
      return res.status(429).json({
        error: `Rate limit exceeded (${limit} requests per minute)`,
        retryAfterSeconds: Math.ceil((entry.windowStart + windowMs - now) / 1000),
      });
    }

    return next();
  } catch {
    return next();
  }
}
