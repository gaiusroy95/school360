import { Router } from 'express';
import { z } from 'zod';
import { ParentCategoryStatus, ParentRelationship } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { getDefaultInstitutionId } from '../lib/institution.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { seedParentCategories, serializeCategory } from '../lib/parentCategories.js';
import { getParentCategoryAnalytics, PARENT_SEGMENTS, type ParentSegmentId } from '../lib/parentSegmentation.js';
import { enrichParentPESDemoData } from '../lib/parentSeed.js';

export const parentCategoriesRouter = Router();
parentCategoriesRouter.use(requireAuth);

parentCategoriesRouter.get(
  '/analytics',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const segment = typeof req.query.segment === 'string' ? req.query.segment as ParentSegmentId : undefined;
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    const validSegments = PARENT_SEGMENTS.map((s) => s.id);
    if (segment && !validSegments.includes(segment)) {
      return res.status(400).json({ error: 'Invalid segment' });
    }
    await enrichParentPESDemoData(institutionId);
    const data = await getParentCategoryAnalytics(institutionId, { segment, academicYear, q });
    return res.json(data);
  }),
);

parentCategoriesRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const rows = await prisma.parentCategory.findMany({
      where: { institutionId },
      include: { _count: { select: { assignments: true } } },
      orderBy: { displayOrder: 'asc' },
    });
    return res.json({ categories: rows.map(serializeCategory) });
  }),
);

parentCategoriesRouter.post(
  '/seed',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const created = await seedParentCategories(institutionId);
    return res.json({ created });
  }),
);

parentCategoriesRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      categoryGroup: z.string().optional(),
      colorCode: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    const row = await prisma.parentCategory.create({
      data: {
        institutionId,
        name: parsed.data.name,
        description: parsed.data.description || '',
        categoryGroup: parsed.data.categoryGroup || 'General',
        colorCode: parsed.data.colorCode || '#6366f1',
      },
    });
    return res.status(201).json({ category: serializeCategory(row) });
  }),
);

parentCategoriesRouter.post(
  '/assignments',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      parentKey: z.string(),
      studentId: z.string(),
      relationship: z.enum(['FATHER', 'MOTHER', 'GUARDIAN']),
      categoryId: z.string(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    const row = await prisma.parentCategoryAssignment.upsert({
      where: {
        parentKey_categoryId: {
          parentKey: parsed.data.parentKey,
          categoryId: parsed.data.categoryId,
        },
      },
      create: {
        institutionId,
        parentKey: parsed.data.parentKey,
        studentId: parsed.data.studentId,
        relationship: parsed.data.relationship as ParentRelationship,
        categoryId: parsed.data.categoryId,
      },
      update: {},
    });
    return res.json({ assignment: row });
  }),
);

parentCategoriesRouter.get(
  '/assignments',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const parentKey = typeof req.query.parentKey === 'string' ? req.query.parentKey : undefined;
    const rows = await prisma.parentCategoryAssignment.findMany({
      where: { institutionId, ...(parentKey ? { parentKey } : {}) },
      include: { category: true },
    });
    return res.json({ assignments: rows });
  }),
);

parentCategoriesRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const existing = await prisma.parentCategory.findFirst({
      where: { institutionId, id: req.params.id },
    });
    if (!existing) return res.status(404).json({ error: 'Not found' });
    await prisma.parentCategory.delete({ where: { id: existing.id } });
    return res.json({ ok: true });
  }),
);
