import { Router } from 'express';
import { z } from 'zod';
import { ParentEngagementStatus, ParentRelationship } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { getDefaultInstitutionId } from '../lib/institution.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import {
  enrichEngagementRecords,
  getEngagementDashboard,
  getEngagementHierarchyMeta,
  nextEngagementRecordId,
  publishEngagementToMobile,
  resolveStudentIdsForParentKey,
  serializeEngagement,
  type EngagementHierarchyContext,
} from '../lib/parentEngagements.js';

export const parentEngagementsRouter = Router();
parentEngagementsRouter.use(requireAuth);

const engagementBodySchema = z.object({
  studentId: z.string(),
  parentRelationship: z.enum(['FATHER', 'MOTHER', 'GUARDIAN']),
  title: z.string().min(1),
  description: z.string().optional(),
  engagementType: z.string().optional(),
  plannedAt: z.string(),
  actionsTaken: z.string().optional(),
  outcome: z.string().optional(),
  studentFeedbackNotes: z.string().optional(),
  status: z.enum(['PLANNED', 'COMPLETED', 'MISSED', 'CANCELLED']).optional(),
  completedAt: z.string().optional(),
  teacherName: z.string().optional(),
  className: z.string().optional(),
  sectionName: z.string().optional(),
  academicYear: z.string().optional(),
  publishToMobile: z.boolean().optional(),
});

function hierarchyFromBody(data: z.infer<typeof engagementBodySchema>): EngagementHierarchyContext {
  return {
    teacherName: data.teacherName?.trim() || '',
    className: data.className?.trim() || '',
    sectionName: data.sectionName?.trim() || '',
    academicYear: data.academicYear?.trim() || '2025-26',
  };
}

async function finalizeEngagementCreate(
  institutionId: string,
  row: { id: string; title: string; description: string; plannedAt: Date },
  data: z.infer<typeof engagementBodySchema>,
) {
  const hierarchy = hierarchyFromBody(data);
  let rosterTaskId = '';
  if (data.publishToMobile !== false && hierarchy.teacherName) {
    rosterTaskId = await publishEngagementToMobile(institutionId, row, hierarchy);
    if (rosterTaskId) {
      await prisma.parentEngagementEvent.update({
        where: { id: row.id },
        data: { rosterTaskId },
      });
    }
  }
  return rosterTaskId;
}

function engagementCreateData(
  institutionId: string,
  recordId: string,
  data: z.infer<typeof engagementBodySchema>,
) {
  const hierarchy = hierarchyFromBody(data);
  return {
    institutionId,
    recordId,
    studentId: data.studentId,
    parentRelationship: data.parentRelationship as ParentRelationship,
    title: data.title,
    description: data.description || '',
    engagementType: data.engagementType || 'General',
    plannedAt: new Date(data.plannedAt),
    completedAt: data.completedAt ? new Date(data.completedAt) : null,
    actionsTaken: data.actionsTaken || '',
    outcome: data.outcome || '',
    studentFeedbackNotes: data.studentFeedbackNotes || '',
    status: (data.status as ParentEngagementStatus) || 'PLANNED',
    teacherName: hierarchy.teacherName,
    className: hierarchy.className,
    sectionName: hierarchy.sectionName,
    academicYear: hierarchy.academicYear,
  };
}

parentEngagementsRouter.get(
  '/hierarchy-meta',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear =
      typeof req.query.academicYear === 'string' ? req.query.academicYear : '2025-26';
    return res.json(await getEngagementHierarchyMeta(institutionId, academicYear));
  }),
);

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
    const parentKey = typeof req.query.parentKey === 'string' ? req.query.parentKey : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status.toUpperCase() : undefined;
    const teacherName = typeof req.query.teacherName === 'string' ? req.query.teacherName : undefined;
    const className = typeof req.query.className === 'string' ? req.query.className : undefined;
    const sectionName = typeof req.query.sectionName === 'string' ? req.query.sectionName : undefined;
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
    const from = typeof req.query.from === 'string' ? new Date(req.query.from) : undefined;
    const to = typeof req.query.to === 'string' ? new Date(req.query.to) : undefined;

    let studentIds: string[] | undefined;
    if (parentKey) {
      studentIds = await resolveStudentIdsForParentKey(institutionId, parentKey);
      if (studentIds.length === 0) return res.json({ records: [] });
    }

    const rows = await prisma.parentEngagementEvent.findMany({
      where: {
        institutionId,
        ...(studentId ? { studentId } : {}),
        ...(studentIds ? { studentId: { in: studentIds } } : {}),
        ...(teacherName ? { teacherName: { contains: teacherName, mode: 'insensitive' } } : {}),
        ...(className ? { className } : {}),
        ...(sectionName ? { sectionName } : {}),
        ...(academicYear ? { academicYear } : {}),
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
    const records = await enrichEngagementRecords(institutionId, rows);
    return res.json({ records });
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
    const [record] = await enrichEngagementRecords(institutionId, [row]);
    return res.json({ record });
  }),
);

parentEngagementsRouter.post(
  '/batch',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      engagements: z.array(engagementBodySchema).min(1),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    const records = [];
    for (const item of parsed.data.engagements) {
      const recordId = await nextEngagementRecordId(institutionId);
      const row = await prisma.parentEngagementEvent.create({
        data: engagementCreateData(institutionId, recordId, item),
      });
      await finalizeEngagementCreate(institutionId, row, item);
      const fresh = await prisma.parentEngagementEvent.findUnique({ where: { id: row.id } });
      if (fresh) records.push(fresh);
    }
    const enriched = await enrichEngagementRecords(institutionId, records);
    return res.status(201).json({ records: enriched });
  }),
);

parentEngagementsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = engagementBodySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    const recordId = await nextEngagementRecordId(institutionId);
    const row = await prisma.parentEngagementEvent.create({
      data: engagementCreateData(institutionId, recordId, parsed.data),
    });
    await finalizeEngagementCreate(institutionId, row, parsed.data);
    const fresh = await prisma.parentEngagementEvent.findUnique({ where: { id: row.id } });
    const [record] = await enrichEngagementRecords(institutionId, [fresh || row]);
    return res.status(201).json({ record });
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
      actionsTaken: z.string().optional(),
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
        ...(parsed.data.actionsTaken !== undefined ? { actionsTaken: parsed.data.actionsTaken } : {}),
        ...(parsed.data.outcome !== undefined ? { outcome: parsed.data.outcome } : {}),
        ...(parsed.data.studentFeedbackNotes !== undefined
          ? { studentFeedbackNotes: parsed.data.studentFeedbackNotes }
          : {}),
        ...(parsed.data.status !== undefined ? { status: parsed.data.status as ParentEngagementStatus } : {}),
      },
    });
    const [record] = await enrichEngagementRecords(institutionId, [row]);
    return res.json({ record });
  }),
);
