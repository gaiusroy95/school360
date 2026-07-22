import { Router } from 'express';
import { z } from 'zod';
import { ParentRelationship } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { getDefaultInstitutionId } from '../lib/institution.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { getFeedbackDashboard, nextFeedbackRecordId, serializeFeedback } from '../lib/parentFeedback.js';

export const parentFeedbackRouter = Router();
parentFeedbackRouter.use(requireAuth);

parentFeedbackRouter.get(
  '/meta',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const summary = await getFeedbackDashboard(institutionId);
    return res.json({ summary });
  }),
);

parentFeedbackRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const studentId = typeof req.query.studentId === 'string' ? req.query.studentId : undefined;
    const rows = await prisma.parentFeedback.findMany({
      where: { institutionId, ...(studentId ? { studentId } : {}) },
      orderBy: { submittedAt: 'desc' },
      take: 500,
    });
    return res.json({ records: rows.map(serializeFeedback) });
  }),
);

parentFeedbackRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      studentId: z.string(),
      parentRelationship: z.enum(['FATHER', 'MOTHER', 'GUARDIAN']),
      parentName: z.string().optional(),
      rating: z.number().min(1).max(5),
      category: z.string().optional(),
      message: z.string().min(1),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    const recordId = await nextFeedbackRecordId(institutionId);
    const row = await prisma.parentFeedback.create({
      data: {
        institutionId,
        recordId,
        studentId: parsed.data.studentId,
        parentRelationship: parsed.data.parentRelationship as ParentRelationship,
        parentName: parsed.data.parentName || '',
        rating: parsed.data.rating,
        category: parsed.data.category || 'General',
        message: parsed.data.message,
      },
    });
    return res.status(201).json({ record: serializeFeedback(row) });
  }),
);
