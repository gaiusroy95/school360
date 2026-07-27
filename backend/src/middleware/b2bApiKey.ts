import type { Request, Response, NextFunction } from 'express';
import { validateB2bApiKey } from '../lib/integrationsApiUpdatesE2E.js';

export type B2bApiClient = {
  institutionId: string;
  keyId: string;
  scopes: string[];
};

declare global {
  namespace Express {
    interface Request {
      b2bClient?: B2bApiClient;
    }
  }
}

function extractApiKey(req: Request): string {
  const headerKey = req.headers['x-api-key'];
  if (typeof headerKey === 'string' && headerKey.trim()) return headerKey.trim();
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) return auth.slice(7).trim();
  return '';
}

function hasScope(scopes: string[], required: string) {
  return scopes.includes('*') || scopes.includes(required);
}

export function requireB2bApiKey(requiredScope?: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const rawKey = extractApiKey(req);
    if (!rawKey) {
      return res.status(401).json({ error: 'API key required (X-API-Key or Bearer token)' });
    }

    try {
      const client = await validateB2bApiKey(rawKey);
      if (!client) {
        return res.status(401).json({ error: 'Invalid or expired API key' });
      }
      if (requiredScope && !hasScope(client.scopes, requiredScope)) {
        return res.status(403).json({ error: `Missing required scope: ${requiredScope}` });
      }
      req.b2bClient = {
        institutionId: client.institutionId,
        keyId: client.keyId,
        scopes: client.scopes,
      };
      return next();
    } catch {
      return res.status(401).json({ error: 'API key validation failed' });
    }
  };
}
