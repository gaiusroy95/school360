import { Router } from 'express';
import { z } from 'zod';
import { CategoryAssignmentStatus, CategoryType, Prisma, StudentCategoryStatus } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { getDefaultInstitutionId } from '../lib/institution.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import {
  generateAssignmentRecordId,
  getCategoryDashboard,
  parseAssignmentStatus,
  parseCategoryGroup,
  parseCategoryStatus,
  parseCategoryType,
  seedDefaultCategories,
  serializeAssignment,
  serializeCategory,
} from '../lib/studentCategories.js';

export const studentCategoriesRouter = Router();
studentCategoriesRouter.use(requireAuth);

const categorySchema = z.object({
  categoryGroup: z.string().min(1),
  name: z.string().min(1),
  shortCode: z.string().min(1).max(12),
  categoryType: z.string().optional().default('INTERNAL'),
  description: z.string().optional().default(''),
  status: z.string().optional().default('ACTIVE'),
  displayOrder: z.number().int().optional().default(0),
  colorCode: z.string().optional().default('#6366f1'),
  icon: z.string().optional().default(''),
});

const assignmentSchema = z.object({
  studentId: z.string().min(1),
  categoryId: z.string().min(1),
  details: z.string().optional().default(''),
  status: z.string().optional().default('ACTIVE'),
});

studentCategoriesRouter.get(
  '/meta',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const summary = await getCategoryDashboard(institutionId);
    const groups = await prisma.studentCategory.groupBy({
      by: ['categoryGroup'],
      where: { institutionId },
      _count: { _all: true },
    });
    return res.json({
      summary,
      groupCounts: groups.map((g) => ({ group: g.categoryGroup, count: g._count._all })),
    });
  }),
);

studentCategoriesRouter.post(
  '/seed',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const created = await seedDefaultCategories(institutionId);
    return res.json({ created, message: `Seeded ${created} categories` });
  }),
);

studentCategoriesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      q: z.string().optional(),
      categoryGroup: z.string().optional(),
      status: z.string().optional(),
      categoryType: z.string().optional(),
    });
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    const group = parseCategoryGroup(parsed.data.categoryGroup);
    const status = parseCategoryStatus(parsed.data.status);
    const categoryType = parseCategoryType(parsed.data.categoryType);

    const rows = await prisma.studentCategory.findMany({
      where: {
        institutionId,
        ...(group ? { categoryGroup: group } : {}),
        ...(status ? { status } : {}),
        ...(categoryType ? { categoryType } : {}),
        ...(parsed.data.q
          ? {
              OR: [
                { name: { contains: parsed.data.q, mode: 'insensitive' } },
                { shortCode: { contains: parsed.data.q, mode: 'insensitive' } },
                { description: { contains: parsed.data.q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ categoryGroup: 'asc' }, { displayOrder: 'asc' }, { name: 'asc' }],
    });

    return res.json({ categories: rows.map(serializeCategory) });
  }),
);

studentCategoriesRouter.get(
  '/assignments',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      q: z.string().optional(),
      categoryGroup: z.string().optional(),
      status: z.string().optional(),
      className: z.string().optional(),
    });
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    const group = parseCategoryGroup(parsed.data.categoryGroup);
    const status = parseAssignmentStatus(parsed.data.status);

    const rows = await prisma.studentCategoryAssignment.findMany({
      where: {
        institutionId,
        ...(status ? { status } : {}),
        ...(parsed.data.className ? { student: { className: parsed.data.className } } : {}),
        ...(group ? { category: { categoryGroup: group } } : {}),
        ...(parsed.data.q
          ? {
              OR: [
                { recordId: { contains: parsed.data.q, mode: 'insensitive' } },
                { details: { contains: parsed.data.q, mode: 'insensitive' } },
                { student: { firstName: { contains: parsed.data.q, mode: 'insensitive' } } },
                { student: { lastName: { contains: parsed.data.q, mode: 'insensitive' } } },
                { category: { name: { contains: parsed.data.q, mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
      include: {
        student: { select: { firstName: true, lastName: true, className: true, sectionName: true, admissionNumber: true } },
        category: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 500,
    });

    return res.json({ assignments: rows.map(serializeAssignment) });
  }),
);

studentCategoriesRouter.get(
  '/export',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const [categories, assignments] = await Promise.all([
      prisma.studentCategory.findMany({ where: { institutionId }, orderBy: [{ categoryGroup: 'asc' }, { displayOrder: 'asc' }] }),
      prisma.studentCategoryAssignment.findMany({
        where: { institutionId },
        include: {
          student: { select: { firstName: true, lastName: true, admissionNumber: true, className: true, sectionName: true } },
          category: true,
        },
      }),
    ]);
    return res.json({
      categories: categories.map(serializeCategory),
      assignments: assignments.map(serializeAssignment),
    });
  }),
);

studentCategoriesRouter.post(
  '/import',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      categories: z.array(categorySchema).optional().default([]),
      assignments: z
        .array(
          z.object({
            admissionNumber: z.string().optional(),
            studentId: z.string().optional(),
            categoryShortCode: z.string().optional(),
            categoryId: z.string().optional(),
            categoryGroup: z.string().optional(),
            details: z.string().optional(),
            status: z.string().optional(),
          }),
        )
        .optional()
        .default([]),
    });
    const parsed = schema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    let categoriesCreated = 0;
    let assignmentsCreated = 0;
    const errors: { row: number; message: string }[] = [];

    for (const row of parsed.data.categories) {
      const group = parseCategoryGroup(row.categoryGroup);
      if (!group) continue;
      try {
        await prisma.studentCategory.upsert({
          where: {
            institutionId_categoryGroup_shortCode: {
              institutionId,
              categoryGroup: group,
              shortCode: row.shortCode.trim().toUpperCase(),
            },
          },
          create: {
            institutionId,
            categoryGroup: group,
            name: row.name.trim(),
            shortCode: row.shortCode.trim().toUpperCase(),
            categoryType: (parseCategoryType(row.categoryType) || CategoryType.INTERNAL) as CategoryType,
            description: row.description || '',
            status: (parseCategoryStatus(row.status) || StudentCategoryStatus.ACTIVE) as StudentCategoryStatus,
            displayOrder: row.displayOrder ?? 0,
            colorCode: row.colorCode || '#6366f1',
            icon: row.icon || '',
          },
          update: {
            name: row.name.trim(),
            categoryType: (parseCategoryType(row.categoryType) || CategoryType.INTERNAL) as CategoryType,
            description: row.description || '',
            status: (parseCategoryStatus(row.status) || StudentCategoryStatus.ACTIVE) as StudentCategoryStatus,
            displayOrder: row.displayOrder ?? 0,
            colorCode: row.colorCode || '#6366f1',
            icon: row.icon || '',
          },
        });
        categoriesCreated += 1;
      } catch (e) {
        errors.push({ row: categoriesCreated, message: e instanceof Error ? e.message : 'Category import failed' });
      }
    }

    for (let i = 0; i < parsed.data.assignments.length; i++) {
      const row = parsed.data.assignments[i];
      try {
        const student = row.studentId
          ? await prisma.student.findFirst({ where: { id: row.studentId, institutionId } })
          : await prisma.student.findFirst({
              where: { institutionId, admissionNumber: row.admissionNumber?.trim() || '' },
            });
        if (!student) {
          errors.push({ row: i + 1, message: 'Student not found' });
          continue;
        }

        let category = row.categoryId
          ? await prisma.studentCategory.findFirst({ where: { id: row.categoryId, institutionId } })
          : null;
        if (!category && row.categoryShortCode) {
          const group = parseCategoryGroup(row.categoryGroup);
          category = await prisma.studentCategory.findFirst({
            where: {
              institutionId,
              shortCode: row.categoryShortCode.trim().toUpperCase(),
              ...(group ? { categoryGroup: group } : {}),
            },
          });
        }
        if (!category) {
          errors.push({ row: i + 1, message: 'Category not found' });
          continue;
        }

        const recordId = await generateAssignmentRecordId(institutionId);
        await prisma.studentCategoryAssignment.upsert({
          where: { studentId_categoryId: { studentId: student.id, categoryId: category.id } },
          create: {
            institutionId,
            studentId: student.id,
            categoryId: category.id,
            recordId,
            details: row.details || `${category.name} assignment`,
            status: (parseAssignmentStatus(row.status) || CategoryAssignmentStatus.ACTIVE) as CategoryAssignmentStatus,
          },
          update: {
            details: row.details || undefined,
            status: row.status ? (parseAssignmentStatus(row.status) as CategoryAssignmentStatus) : undefined,
          },
        });
        assignmentsCreated += 1;
      } catch (e) {
        errors.push({ row: i + 1, message: e instanceof Error ? e.message : 'Assignment import failed' });
      }
    }

    return res.json({ categoriesCreated, assignmentsCreated, errors });
  }),
);

studentCategoriesRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = categorySchema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    const group = parseCategoryGroup(parsed.data.categoryGroup);
    if (!group) return res.status(400).json({ error: 'Invalid category group' });

    const row = await prisma.studentCategory.create({
      data: {
        institutionId,
        categoryGroup: group,
        name: parsed.data.name.trim(),
        shortCode: parsed.data.shortCode.trim().toUpperCase(),
        categoryType: (parseCategoryType(parsed.data.categoryType) || CategoryType.INTERNAL) as CategoryType,
        description: parsed.data.description || '',
        status: (parseCategoryStatus(parsed.data.status) || StudentCategoryStatus.ACTIVE) as StudentCategoryStatus,
        displayOrder: parsed.data.displayOrder ?? 0,
        colorCode: parsed.data.colorCode || '#6366f1',
        icon: parsed.data.icon || '',
      },
    });

    return res.status(201).json({ category: serializeCategory(row) });
  }),
);

studentCategoriesRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const parsed = categorySchema.partial().safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    const existing = await prisma.studentCategory.findFirst({
      where: { id: req.params.id, institutionId },
    });
    if (!existing) return res.status(404).json({ error: 'Category not found' });

    const group = parsed.data.categoryGroup ? parseCategoryGroup(parsed.data.categoryGroup) : undefined;

    const row = await prisma.studentCategory.update({
      where: { id: existing.id },
      data: {
        ...(group ? { categoryGroup: group } : {}),
        ...(parsed.data.name !== undefined ? { name: parsed.data.name.trim() } : {}),
        ...(parsed.data.shortCode !== undefined ? { shortCode: parsed.data.shortCode.trim().toUpperCase() } : {}),
        ...(parsed.data.categoryType !== undefined
          ? { categoryType: parseCategoryType(parsed.data.categoryType) as CategoryType }
          : {}),
        ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
        ...(parsed.data.status !== undefined
          ? { status: parseCategoryStatus(parsed.data.status) as StudentCategoryStatus }
          : {}),
        ...(parsed.data.displayOrder !== undefined ? { displayOrder: parsed.data.displayOrder } : {}),
        ...(parsed.data.colorCode !== undefined ? { colorCode: parsed.data.colorCode } : {}),
        ...(parsed.data.icon !== undefined ? { icon: parsed.data.icon } : {}),
      },
    });

    return res.json({ category: serializeCategory(row) });
  }),
);

studentCategoriesRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const existing = await prisma.studentCategory.findFirst({
      where: { id: req.params.id, institutionId },
    });
    if (!existing) return res.status(404).json({ error: 'Category not found' });

    await prisma.studentCategory.delete({ where: { id: existing.id } });
    return res.json({ ok: true });
  }),
);

studentCategoriesRouter.post(
  '/assignments',
  asyncHandler(async (req, res) => {
    const parsed = assignmentSchema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    const [student, category] = await Promise.all([
      prisma.student.findFirst({ where: { id: parsed.data.studentId, institutionId } }),
      prisma.studentCategory.findFirst({ where: { id: parsed.data.categoryId, institutionId } }),
    ]);
    if (!student) return res.status(404).json({ error: 'Student not found' });
    if (!category) return res.status(404).json({ error: 'Category not found' });

    const recordId = await generateAssignmentRecordId(institutionId);
    const row = await prisma.studentCategoryAssignment.create({
      data: {
        institutionId,
        studentId: student.id,
        categoryId: category.id,
        recordId,
        details: parsed.data.details || `${category.name} — ${student.firstName}`,
        status: (parseAssignmentStatus(parsed.data.status) || CategoryAssignmentStatus.ACTIVE) as CategoryAssignmentStatus,
      },
      include: {
        student: { select: { firstName: true, lastName: true, className: true, sectionName: true, admissionNumber: true } },
        category: true,
      },
    });

    return res.status(201).json({ assignment: serializeAssignment(row) });
  }),
);

studentCategoriesRouter.patch(
  '/assignments/:id',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      details: z.string().optional(),
      status: z.string().optional(),
      categoryId: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    const existing = await prisma.studentCategoryAssignment.findFirst({
      where: { id: req.params.id, institutionId },
    });
    if (!existing) return res.status(404).json({ error: 'Assignment not found' });

    const row = await prisma.studentCategoryAssignment.update({
      where: { id: existing.id },
      data: {
        ...(parsed.data.details !== undefined ? { details: parsed.data.details } : {}),
        ...(parsed.data.status !== undefined
          ? { status: parseAssignmentStatus(parsed.data.status) as CategoryAssignmentStatus }
          : {}),
        ...(parsed.data.categoryId !== undefined ? { categoryId: parsed.data.categoryId } : {}),
      },
      include: {
        student: { select: { firstName: true, lastName: true, className: true, sectionName: true, admissionNumber: true } },
        category: true,
      },
    });

    return res.json({ assignment: serializeAssignment(row) });
  }),
);

studentCategoriesRouter.delete(
  '/assignments/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const existing = await prisma.studentCategoryAssignment.findFirst({
      where: { id: req.params.id, institutionId },
    });
    if (!existing) return res.status(404).json({ error: 'Assignment not found' });

    await prisma.studentCategoryAssignment.delete({ where: { id: existing.id } });
    return res.json({ ok: true });
  }),
);
