import { Router } from 'express';
import { z } from 'zod';
import { ParentRelationship } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { getDefaultInstitutionId } from '../lib/institution.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import {
  enrichFeedbackRecords,
  ensureParentFeedbackDemo,
  getFeedbackDashboard,
  nextFeedbackRecordId,
  resolveStudentIdsForParentSearch,
  serializeFeedback,
  submitMobileParentFeedback,
} from '../lib/parentFeedback.js';

export const parentFeedbackRouter = Router();

parentFeedbackRouter.post(
  '/mobile',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      studentId: z.string(),
      parentRelationship: z.enum(['FATHER', 'MOTHER', 'GUARDIAN']),
      parentMobile: z.string().optional(),
      parentName: z.string().optional(),
      rating: z.number().min(1).max(5),
      category: z.string().optional(),
      message: z.string().min(1),
      source: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    const record = await submitMobileParentFeedback(institutionId, {
      studentId: parsed.data.studentId,
      parentRelationship: parsed.data.parentRelationship as ParentRelationship,
      parentMobile: parsed.data.parentMobile,
      parentName: parsed.data.parentName,
      rating: parsed.data.rating,
      category: parsed.data.category,
      message: parsed.data.message,
      source: parsed.data.source || 'MOBILE',
    });
    return res.status(201).json({ record });
  }),
);

parentFeedbackRouter.use(requireAuth);

parentFeedbackRouter.get(
  '/meta',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await ensureParentFeedbackDemo(institutionId);
    const summary = await getFeedbackDashboard(institutionId);
    return res.json({ summary });
  }),
);

parentFeedbackRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await ensureParentFeedbackDemo(institutionId);

    const studentId = typeof req.query.studentId === 'string' ? req.query.studentId : undefined;
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    const className = typeof req.query.className === 'string' ? req.query.className : undefined;
    const sectionName = typeof req.query.sectionName === 'string' ? req.query.sectionName : undefined;
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;

    let studentIds: string[] | undefined;
    if (q || className || sectionName) {
      studentIds = await resolveStudentIdsForParentSearch(institutionId, { q, className, sectionName });
      if (studentIds.length === 0) return res.json({ records: [] });
    }

    const rows = await prisma.parentFeedback.findMany({
      where: {
        institutionId,
        ...(studentId ? { studentId } : {}),
        ...(studentIds ? { studentId: { in: studentIds } } : {}),
        ...(category ? { category: { equals: category, mode: 'insensitive' } } : {}),
      },
      orderBy: { submittedAt: 'desc' },
      take: 1000,
    });

    let records = await enrichFeedbackRecords(institutionId, rows);
    if (q) {
      const lower = q.toLowerCase();
      const mobileNeedle = q.replace(/\D/g, '');
      records = records.filter(
        (r) =>
          r.parentName.toLowerCase().includes(lower) ||
          r.parentMobile.replace(/\D/g, '').includes(mobileNeedle) ||
          r.studentName.toLowerCase().includes(lower) ||
          r.message.toLowerCase().includes(lower),
      );
    }

    return res.json({ records });
  }),
);

parentFeedbackRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const row = await prisma.parentFeedback.findFirst({
      where: { institutionId, id: req.params.id },
    });
    if (!row) return res.status(404).json({ error: 'Not found' });
    const [record] = await enrichFeedbackRecords(institutionId, [row]);
    return res.json({ record });
  }),
);

parentFeedbackRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      studentId: z.string(),
      parentRelationship: z.enum(['FATHER', 'MOTHER', 'GUARDIAN']),
      parentName: z.string().optional(),
      parentMobile: z.string().optional(),
      rating: z.number().min(1).max(5),
      category: z.string().optional(),
      message: z.string().min(1),
      source: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    const record = await submitMobileParentFeedback(institutionId, {
      studentId: parsed.data.studentId,
      parentRelationship: parsed.data.parentRelationship as ParentRelationship,
      parentName: parsed.data.parentName,
      parentMobile: parsed.data.parentMobile,
      rating: parsed.data.rating,
      category: parsed.data.category,
      message: parsed.data.message,
      source: parsed.data.source || 'ADMIN',
    });
    return res.status(201).json({ record });
  }),
);
