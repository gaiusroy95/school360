import { Router } from 'express';
import { z } from 'zod';
import { ParentMeetingStatus } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { getDefaultInstitutionId } from '../lib/institution.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { getMeetingDashboard, nextMeetingRecordId, serializeMeeting } from '../lib/parentMeetings.js';
import { studentFullNameLocal } from '../lib/parentSeedHelpers.js';

export const parentMeetingsRouter = Router();
parentMeetingsRouter.use(requireAuth);

parentMeetingsRouter.get(
  '/meta',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const summary = await getMeetingDashboard(institutionId);
    return res.json({ summary });
  }),
);

parentMeetingsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const className = typeof req.query.className === 'string' ? req.query.className : undefined;
    const sectionName = typeof req.query.sectionName === 'string' ? req.query.sectionName : undefined;
    const studentId = typeof req.query.studentId === 'string' ? req.query.studentId : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status.toUpperCase() : undefined;

    const rows = await prisma.parentMeeting.findMany({
      where: {
        institutionId,
        ...(className ? { className } : {}),
        ...(sectionName ? { sectionName } : {}),
        ...(studentId ? { studentId } : {}),
        ...(status && Object.values(ParentMeetingStatus).includes(status as ParentMeetingStatus)
          ? { status: status as ParentMeetingStatus }
          : {}),
      },
      orderBy: { scheduledAt: 'desc' },
      take: 500,
    });
    return res.json({ records: rows.map(serializeMeeting) });
  }),
);

parentMeetingsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const row = await prisma.parentMeeting.findFirst({
      where: { institutionId, id: req.params.id },
    });
    if (!row) return res.status(404).json({ error: 'Not found' });
    return res.json({ record: serializeMeeting(row) });
  }),
);

parentMeetingsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      studentId: z.string(),
      scheduledAt: z.string(),
      discussionNotes: z.string().optional(),
      attendees: z.string().optional(),
      status: z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED', 'MISSED']).optional(),
      conductedAt: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    const student = await prisma.student.findFirst({ where: { institutionId, id: parsed.data.studentId } });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const recordId = await nextMeetingRecordId(institutionId);
    const row = await prisma.parentMeeting.create({
      data: {
        institutionId,
        recordId,
        studentId: student.id,
        className: student.className,
        sectionName: student.sectionName,
        studentName: studentFullNameLocal(student),
        fatherName: student.fatherName,
        scheduledAt: new Date(parsed.data.scheduledAt),
        conductedAt: parsed.data.conductedAt ? new Date(parsed.data.conductedAt) : null,
        discussionNotes: parsed.data.discussionNotes || '',
        attendees: parsed.data.attendees || student.fatherName,
        status: (parsed.data.status as ParentMeetingStatus) || 'SCHEDULED',
        photoUrls: [],
      },
    });
    return res.status(201).json({ record: serializeMeeting(row) });
  }),
);

parentMeetingsRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const existing = await prisma.parentMeeting.findFirst({
      where: { institutionId, id: req.params.id },
    });
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const schema = z.object({
      scheduledAt: z.string().optional(),
      conductedAt: z.string().nullable().optional(),
      discussionNotes: z.string().optional(),
      attendees: z.string().optional(),
      status: z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED', 'MISSED']).optional(),
      photoUrls: z.array(z.string()).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const row = await prisma.parentMeeting.update({
      where: { id: existing.id },
      data: {
        ...(parsed.data.scheduledAt !== undefined ? { scheduledAt: new Date(parsed.data.scheduledAt) } : {}),
        ...(parsed.data.conductedAt !== undefined
          ? { conductedAt: parsed.data.conductedAt ? new Date(parsed.data.conductedAt) : null }
          : {}),
        ...(parsed.data.discussionNotes !== undefined ? { discussionNotes: parsed.data.discussionNotes } : {}),
        ...(parsed.data.attendees !== undefined ? { attendees: parsed.data.attendees } : {}),
        ...(parsed.data.status !== undefined ? { status: parsed.data.status as ParentMeetingStatus } : {}),
        ...(parsed.data.photoUrls !== undefined ? { photoUrls: parsed.data.photoUrls } : {}),
      },
    });
    return res.json({ record: serializeMeeting(row) });
  }),
);

parentMeetingsRouter.post(
  '/:id/photos',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const existing = await prisma.parentMeeting.findFirst({
      where: { institutionId, id: req.params.id },
    });
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const schema = z.object({ photos: z.array(z.string()).min(1) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const current = Array.isArray(existing.photoUrls) ? (existing.photoUrls as string[]) : [];
    const row = await prisma.parentMeeting.update({
      where: { id: existing.id },
      data: { photoUrls: [...current, ...parsed.data.photos] },
    });
    return res.json({ record: serializeMeeting(row) });
  }),
);
