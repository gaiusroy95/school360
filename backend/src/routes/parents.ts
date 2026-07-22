import { Router } from 'express';
import { z } from 'zod';
import { ParentRelationship } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { getDefaultInstitutionId } from '../lib/institution.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { getInstitutionFilterMeta } from '../lib/students.js';
import {
  deriveParentContacts,
  getParentDashboard,
  getParentDetail,
  loadStudentsForParents,
  parseParentKey,
  serializeParentListItem,
} from '../lib/parents.js';
import { monthlyEngagementTrend, scoreParents } from '../lib/parentEngagementScore.js';
import { getCommunicationTopicBreakdown } from '../lib/parentCommunications.js';
import { seedParentCategories } from '../lib/parentCategories.js';
import {
  seedParentDemoData,
} from '../lib/parentSeed.js';

export const parentsRouter = Router();
parentsRouter.use(requireAuth);

parentsRouter.get(
  '/meta',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const filters = await getInstitutionFilterMeta(institutionId);
    const academicYear =
      typeof req.query.academicYear === 'string' ? req.query.academicYear : filters.defaultAcademicYear;

    const [summary, students, comms, engagements, meetings, topics] = await Promise.all([
      getParentDashboard(institutionId, academicYear),
      loadStudentsForParents(institutionId, { academicYear }),
      prisma.parentCommunication.findMany({ where: { institutionId }, take: 500 }),
      prisma.parentEngagementEvent.findMany({ where: { institutionId }, take: 500 }),
      prisma.parentMeeting.findMany({ where: { institutionId }, take: 500 }),
      getCommunicationTopicBreakdown(institutionId),
    ]);

    const parents = deriveParentContacts(students);
    const scores = await scoreParents(institutionId, parents);
    let laggingCount = 0;
    let exceptionalCount = 0;
    for (const s of scores.values()) {
      if (s.tier === 'lagging') laggingCount += 1;
      if (s.tier === 'exceptional') exceptionalCount += 1;
    }

    return res.json({
      summary: { ...summary, laggingCount, exceptionalCount },
      filters,
      defaultAcademicYear: filters.defaultAcademicYear,
      engagementTrend: monthlyEngagementTrend(comms, engagements, meetings),
      topicBreakdown: topics,
    });
  }),
);

parentsRouter.post(
  '/seed',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const categories = await seedParentCategories(institutionId);
    const demo = await seedParentDemoData(institutionId);
    return res.json({ categories, ...demo });
  }),
);

parentsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      q: z.string().optional(),
      className: z.string().optional(),
      sectionName: z.string().optional(),
      academicYear: z.string().optional(),
      relationship: z.string().optional(),
      status: z.string().optional(),
      engagement: z.enum(['lagging', 'exceptional', 'all']).optional(),
      categoryId: z.string().optional(),
    });
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    const students = await loadStudentsForParents(institutionId, {
      q: parsed.data.q,
      className: parsed.data.className,
      sectionName: parsed.data.sectionName,
      academicYear: parsed.data.academicYear,
    });

    let parents = deriveParentContacts(students);

    if (parsed.data.relationship) {
      const rel = parsed.data.relationship.toUpperCase() as ParentRelationship;
      parents = parents.filter((p) => p.relationship === rel);
    }
    if (parsed.data.status === 'Active') parents = parents.filter((p) => p.status === 'Active');
    if (parsed.data.status === 'Inactive') parents = parents.filter((p) => p.status === 'Inactive');

    if (parsed.data.categoryId) {
      const assignments = await prisma.parentCategoryAssignment.findMany({
        where: { institutionId, categoryId: parsed.data.categoryId },
      });
      const keys = new Set(assignments.map((a) => a.parentKey));
      parents = parents.filter((p) => keys.has(p.parentKey));
    }

    const scores = await scoreParents(institutionId, parents);

    if (parsed.data.engagement === 'lagging') {
      parents = parents.filter((p) => scores.get(p.parentKey)?.tier === 'lagging');
    } else if (parsed.data.engagement === 'exceptional') {
      parents = parents.filter((p) => scores.get(p.parentKey)?.tier === 'exceptional');
    }

    const lastComms = await prisma.parentCommunication.findMany({
      where: { institutionId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const records = parents.map((p) => {
      const sc = scores.get(p.parentKey);
      const studentIds = new Set(p.children.map((c) => c.studentId));
      const last = lastComms.find((c) => studentIds.has(c.studentId));
      const lastComm = last
        ? new Date(last.sentAt || last.plannedAt || last.createdAt).toLocaleDateString('en-IN')
        : '—';
      return serializeParentListItem(p, {
        lastComm,
        engagementScore: sc?.score,
        engagementTier: sc?.tier,
      });
    });

    return res.json({ parents: records, total: records.length });
  }),
);

parentsRouter.get(
  '/:parentKey',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const parentKey = decodeURIComponent(req.params.parentKey);
    if (!parseParentKey(parentKey)) return res.status(400).json({ error: 'Invalid parent key' });

    const detail = await getParentDetail(institutionId, parentKey);
    if (!detail) return res.status(404).json({ error: 'Parent not found' });

    const students = await loadStudentsForParents(institutionId);
    const parent = deriveParentContacts(students).find((p) => p.parentKey === parentKey);
    const engagementScore = parent ? (await scoreParents(institutionId, [parent])).get(parentKey) : null;

    return res.json({ ...detail, engagementScore });
  }),
);
