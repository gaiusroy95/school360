import { Router } from 'express';
import { z } from 'zod';
import { ParentEngagementStatus, ParentRelationship } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { getDefaultInstitutionId } from '../lib/institution.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import {
  getEngagementDashboard,
  nextEngagementRecordId,
  serializeEngagement,
} from '../lib/parentEngagements.js';

export const parentEngagementsRouter = Router();
parentEngagementsRouter.use(requireAuth);

parentEngagementsRouter.get(
  '/meta',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const summary = await getEngagementDashboard(institutionId);
    return res.json({ summary });
  }),
);

parentEngagementsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const studentId = typeof req.query.studentId === 'string' ? req.query.studentId : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status.toUpperCase() : undefined;
    const from = typeof req.query.from === 'string' ? new Date(req.query.from) : undefined;
    const to = typeof req.query.to === 'string' ? new Date(req.query.to) : undefined;

    const rows = await prisma.parentEngagementEvent.findMany({
      where: {
        institutionId,
        ...(studentId ? { studentId } : {}),
        ...(status && Object.values(ParentEngagementStatus).includes(status as ParentEngagementStatus)
          ? { status: status as ParentEngagementStatus }
          : {}),
        ...(from || to
          ? { plannedAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
          : {}),
      },
      orderBy: { plannedAt: 'desc' },
      take: 500,
    });
    return res.json({ records: rows.map(serializeEngagement) });
  }),
);

parentEngagementsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const row = await prisma.parentEngagementEvent.findFirst({
      where: { institutionId, id: req.params.id },
    });
    if (!row) return res.status(404).json({ error: 'Not found' });
    return res.json({ record: serializeEngagement(row) });
  }),
);

parentEngagementsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      studentId: z.string(),
      parentRelationship: z.enum(['FATHER', 'MOTHER', 'GUARDIAN']),
      title: z.string().min(1),
      description: z.string().optional(),
      engagementType: z.string().optional(),
      plannedAt: z.string(),
      outcome: z.string().optional(),
      studentFeedbackNotes: z.string().optional(),
      status: z.enum(['PLANNED', 'COMPLETED', 'MISSED', 'CANCELLED']).optional(),
      completedAt: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    const recordId = await nextEngagementRecordId(institutionId);
    const row = await prisma.parentEngagementEvent.create({
      data: {
        institutionId,
        recordId,
        studentId: parsed.data.studentId,
        parentRelationship: parsed.data.parentRelationship as ParentRelationship,
        title: parsed.data.title,
        description: parsed.data.description || '',
        engagementType: parsed.data.engagementType || 'General',
        plannedAt: new Date(parsed.data.plannedAt),
        completedAt: parsed.data.completedAt ? new Date(parsed.data.completedAt) : null,
        outcome: parsed.data.outcome || '',
        studentFeedbackNotes: parsed.data.studentFeedbackNotes || '',
        status: (parsed.data.status as ParentEngagementStatus) || 'PLANNED',
      },
    });
    return res.status(201).json({ record: serializeEngagement(row) });
  }),
);

parentEngagementsRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const existing = await prisma.parentEngagementEvent.findFirst({
      where: { institutionId, id: req.params.id },
    });
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const schema = z.object({
      title: z.string().optional(),
      description: z.string().optional(),
      engagementType: z.string().optional(),
      plannedAt: z.string().optional(),
      completedAt: z.string().nullable().optional(),
      outcome: z.string().optional(),
      studentFeedbackNotes: z.string().optional(),
      status: z.enum(['PLANNED', 'COMPLETED', 'MISSED', 'CANCELLED']).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const row = await prisma.parentEngagementEvent.update({
      where: { id: existing.id },
      data: {
        ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
        ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
        ...(parsed.data.engagementType !== undefined ? { engagementType: parsed.data.engagementType } : {}),
        ...(parsed.data.plannedAt !== undefined ? { plannedAt: new Date(parsed.data.plannedAt) } : {}),
        ...(parsed.data.completedAt !== undefined
          ? { completedAt: parsed.data.completedAt ? new Date(parsed.data.completedAt) : null }
          : {}),
        ...(parsed.data.outcome !== undefined ? { outcome: parsed.data.outcome } : {}),
        ...(parsed.data.studentFeedbackNotes !== undefined
          ? { studentFeedbackNotes: parsed.data.studentFeedbackNotes }
          : {}),
        ...(parsed.data.status !== undefined ? { status: parsed.data.status as ParentEngagementStatus } : {}),
      },
    });
    return res.json({ record: serializeEngagement(row) });
  }),
);
