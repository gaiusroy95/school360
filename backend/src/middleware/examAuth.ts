import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export type ExamSession = {
  type: 'ENTRANCE_EXAM';
  credentialId: string;
  attemptId: string;
  testId: string;
};

declare global {
  namespace Express {
    interface Request {
      examSession?: ExamSession;
    }
  }
}

export function signExamToken(payload: Omit<ExamSession, 'type'>): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set');
  return jwt.sign({ ...payload, type: 'ENTRANCE_EXAM' as const }, secret, {
    expiresIn: '6h',
  });
}

export function requireExamSession(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET is not set');
    const decoded = jwt.verify(header.slice(7), secret) as ExamSession;
    if (decoded.type !== 'ENTRANCE_EXAM') {
      return res.status(401).json({ error: 'Invalid exam session' });
    }
    req.examSession = decoded;
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired exam session' });
  }
}
