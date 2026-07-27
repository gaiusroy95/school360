import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireB2bApiKey } from '../middleware/b2bApiKey.js';
import { prisma } from '../lib/prisma.js';

export const b2bExternalRouter = Router();

b2bExternalRouter.get(
  '/users',
  requireB2bApiKey('read:users'),
  asyncHandler(async (req, res) => {
    const institutionId = req.b2bClient!.institutionId;
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        userType: true,
        accountStatus: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return res.json({
      institutionId,
      count: users.length,
      users,
    });
  }),
);

b2bExternalRouter.get(
  '/students',
  requireB2bApiKey('read:students'),
  asyncHandler(async (req, res) => {
    const institutionId = req.b2bClient!.institutionId;
    const students = await prisma.student.findMany({
      where: { institutionId },
      select: {
        id: true,
        admissionNumber: true,
        firstName: true,
        lastName: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return res.json({ institutionId, count: students.length, students });
  }),
);

b2bExternalRouter.get(
  '/health',
  requireB2bApiKey(),
  asyncHandler(async (req, res) => {
    return res.json({
      status: 'ok',
      institutionId: req.b2bClient!.institutionId,
      scopes: req.b2bClient!.scopes,
      at: new Date().toISOString(),
    });
  }),
);
