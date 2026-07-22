import { Router } from 'express';
import { z } from 'zod';
import { ParentCommunicationChannel, ParentCommunicationDirection, ParentCommunicationStatus, ParentRelationship } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { getDefaultInstitutionId } from '../lib/institution.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import {
  getCommunicationDashboard,
  nextCommunicationRecordId,
  serializeCommunication,
} from '../lib/parentCommunications.js';

export const parentCommunicationsRouter = Router();
parentCommunicationsRouter.use(requireAuth);

parentCommunicationsRouter.get(
  '/meta',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const summary = await getCommunicationDashboard(institutionId);
    return res.json({ summary });
  }),
);

parentCommunicationsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status.toUpperCase() : undefined;
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const studentId = typeof req.query.studentId === 'string' ? req.query.studentId : undefined;

    const rows = await prisma.parentCommunication.findMany({
      where: {
        institutionId,
        ...(studentId ? { studentId } : {}),
        ...(category ? { category } : {}),
        ...(status && Object.values(ParentCommunicationStatus).includes(status as ParentCommunicationStatus)
          ? { status: status as ParentCommunicationStatus }
          : {}),
        ...(q
          ? {
              OR: [
                { subject: { contains: q, mode: 'insensitive' } },
                { body: { contains: q, mode: 'insensitive' } },
                { recordId: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    return res.json({ records: rows.map(serializeCommunication) });
  }),
);

parentCommunicationsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const row = await prisma.parentCommunication.findFirst({
      where: { institutionId, id: req.params.id },
    });
    if (!row) return res.status(404).json({ error: 'Not found' });
    return res.json({ record: serializeCommunication(row) });
  }),
);

parentCommunicationsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      studentId: z.string(),
      parentRelationship: z.enum(['FATHER', 'MOTHER', 'GUARDIAN']),
      channel: z.enum(['SMS', 'EMAIL', 'APP', 'CALL', 'NOTICE', 'WHATSAPP']),
      direction: z.enum(['INBOUND', 'OUTBOUND']).optional(),
      subject: z.string().optional(),
      body: z.string().optional(),
      plannedAt: z.string().optional(),
      sentAt: z.string().optional(),
      readAt: z.string().optional(),
      status: z.enum(['PLANNED', 'SENT', 'DELIVERED', 'READ', 'FAILED']).optional(),
      isImportant: z.boolean().optional(),
      category: z.string().optional(),
      academicData: z.record(z.unknown()).optional(),
      teacherFeedback: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    const recordId = await nextCommunicationRecordId(institutionId);
    const row = await prisma.parentCommunication.create({
      data: {
        institutionId,
        recordId,
        studentId: parsed.data.studentId,
        parentRelationship: parsed.data.parentRelationship as ParentRelationship,
        channel: parsed.data.channel as ParentCommunicationChannel,
        direction: (parsed.data.direction as ParentCommunicationDirection) || 'OUTBOUND',
        subject: parsed.data.subject || '',
        body: parsed.data.body || '',
        plannedAt: parsed.data.plannedAt ? new Date(parsed.data.plannedAt) : null,
        sentAt: parsed.data.sentAt ? new Date(parsed.data.sentAt) : null,
        readAt: parsed.data.readAt ? new Date(parsed.data.readAt) : null,
        status: (parsed.data.status as ParentCommunicationStatus) || 'PLANNED',
        isImportant: parsed.data.isImportant ?? false,
        category: parsed.data.category || 'general',
        academicData: (parsed.data.academicData || {}) as object,
        teacherFeedback: parsed.data.teacherFeedback || '',
      },
    });
    return res.status(201).json({ record: serializeCommunication(row) });
  }),
);

parentCommunicationsRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const existing = await prisma.parentCommunication.findFirst({
      where: { institutionId, id: req.params.id },
    });
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const schema = z.object({
      subject: z.string().optional(),
      body: z.string().optional(),
      plannedAt: z.string().nullable().optional(),
      sentAt: z.string().nullable().optional(),
      status: z.enum(['PLANNED', 'SENT', 'DELIVERED', 'READ', 'FAILED']).optional(),
      isImportant: z.boolean().optional(),
      category: z.string().optional(),
      academicData: z.record(z.unknown()).optional(),
      teacherFeedback: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const row = await prisma.parentCommunication.update({
      where: { id: existing.id },
      data: {
        ...(parsed.data.subject !== undefined ? { subject: parsed.data.subject } : {}),
        ...(parsed.data.body !== undefined ? { body: parsed.data.body } : {}),
        ...(parsed.data.plannedAt !== undefined
          ? { plannedAt: parsed.data.plannedAt ? new Date(parsed.data.plannedAt) : null }
          : {}),
        ...(parsed.data.sentAt !== undefined
          ? { sentAt: parsed.data.sentAt ? new Date(parsed.data.sentAt) : null }
          : {}),
        ...(parsed.data.status !== undefined ? { status: parsed.data.status as ParentCommunicationStatus } : {}),
        ...(parsed.data.isImportant !== undefined ? { isImportant: parsed.data.isImportant } : {}),
        ...(parsed.data.category !== undefined ? { category: parsed.data.category } : {}),
        ...(parsed.data.academicData !== undefined ? { academicData: parsed.data.academicData as object } : {}),
        ...(parsed.data.teacherFeedback !== undefined ? { teacherFeedback: parsed.data.teacherFeedback } : {}),
      },
    });
    return res.json({ record: serializeCommunication(row) });
  }),
);
