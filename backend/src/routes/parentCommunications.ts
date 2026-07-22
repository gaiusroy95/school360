import { Router } from 'express';
import { z } from 'zod';
import { ParentCommunicationChannel, ParentCommunicationDirection, ParentCommunicationStatus, ParentRelationship } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { getDefaultInstitutionId } from '../lib/institution.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import {
  bulkSendAndRecordCommunications,
  enrichCommunicationRecords,
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
    const mobile = typeof req.query.mobile === 'string' ? req.query.mobile : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status.toUpperCase() : undefined;
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const studentId = typeof req.query.studentId === 'string' ? req.query.studentId : undefined;
    const channel = typeof req.query.channel === 'string' ? req.query.channel.toUpperCase() : undefined;

    const rows = await prisma.parentCommunication.findMany({
      where: {
        institutionId,
        ...(studentId ? { studentId } : {}),
        ...(category ? { category } : {}),
        ...(channel && Object.values(ParentCommunicationChannel).includes(channel as ParentCommunicationChannel)
          ? { channel: channel as ParentCommunicationChannel }
          : {}),
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
      orderBy: { sentAt: 'desc' },
      take: 1000,
    });

    let records = await enrichCommunicationRecords(institutionId, rows);
    if (mobile) {
      const needle = mobile.replace(/\D/g, '');
      records = records.filter((r) => r.parentMobile.replace(/\D/g, '').includes(needle));
    }
    if (q) {
      const lower = q.toLowerCase();
      records = records.filter(
        (r) =>
          r.subject.toLowerCase().includes(lower) ||
          r.body.toLowerCase().includes(lower) ||
          r.parentName.toLowerCase().includes(lower) ||
          r.parentMobile.includes(q) ||
          r.studentName.toLowerCase().includes(lower),
      );
    }

    return res.json({ records });
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
    const [record] = await enrichCommunicationRecords(institutionId, [row]);
    return res.json({ record });
  }),
);

parentCommunicationsRouter.post(
  '/bulk-send',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      channel: z.enum(['SMS', 'EMAIL', 'APP', 'CALL', 'NOTICE', 'WHATSAPP']),
      subject: z.string().min(1),
      body: z.string().min(1),
      category: z.string().optional(),
      className: z.string().optional(),
      sectionName: z.string().optional(),
      academicYear: z.string().optional(),
      parentRelationship: z.enum(['FATHER', 'MOTHER', 'GUARDIAN']).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    const result = await bulkSendAndRecordCommunications(institutionId, {
      channel: parsed.data.channel as ParentCommunicationChannel,
      subject: parsed.data.subject,
      body: parsed.data.body,
      category: parsed.data.category,
      className: parsed.data.className,
      sectionName: parsed.data.sectionName,
      academicYear: parsed.data.academicYear,
      parentRelationship: parsed.data.parentRelationship as ParentRelationship | undefined,
    });
    return res.status(201).json(result);
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
        sentAt: parsed.data.sentAt ? new Date(parsed.data.sentAt) : new Date(),
        readAt: parsed.data.readAt ? new Date(parsed.data.readAt) : null,
        status: (parsed.data.status as ParentCommunicationStatus) || 'SENT',
        isImportant: parsed.data.isImportant ?? false,
        category: parsed.data.category || 'general',
        academicData: { ...(parsed.data.academicData || {}), autoRecorded: true } as object,
        teacherFeedback: parsed.data.teacherFeedback || '',
      },
    });
    const [record] = await enrichCommunicationRecords(institutionId, [row]);
    return res.status(201).json({ record });
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
