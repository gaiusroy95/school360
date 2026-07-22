import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { getDefaultInstitutionId } from '../lib/institution.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { serializeStudent } from '../lib/students.js';
import {
  getBulkImportDashboard,
  parseBulkImportStatus,
  runBulkImportBatch,
  serializeBulkImport,
  serializeBulkImportRow,
} from '../lib/studentBulkImports.js';

export const studentBulkImportsRouter = Router();
studentBulkImportsRouter.use(requireAuth);

const importRowSchema = z.record(z.unknown());

studentBulkImportsRouter.get(
  '/meta',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const summary = await getBulkImportDashboard(institutionId);
    return res.json({ summary });
  }),
);

studentBulkImportsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      q: z.string().optional(),
      status: z.string().optional(),
      className: z.string().optional(),
      sectionName: z.string().optional(),
      academicYear: z.string().optional(),
    });
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    const status = parseBulkImportStatus(parsed.data.status);

    const rows = await prisma.studentBulkImport.findMany({
      where: {
        institutionId,
        ...(status ? { status } : {}),
        ...(parsed.data.className ? { className: parsed.data.className } : {}),
        ...(parsed.data.sectionName ? { sectionName: parsed.data.sectionName } : {}),
        ...(parsed.data.academicYear ? { academicYear: parsed.data.academicYear } : {}),
        ...(parsed.data.q
          ? {
              OR: [
                { recordId: { contains: parsed.data.q, mode: 'insensitive' } },
                { fileName: { contains: parsed.data.q, mode: 'insensitive' } },
                { details: { contains: parsed.data.q, mode: 'insensitive' } },
                { className: { contains: parsed.data.q, mode: 'insensitive' } },
                { sectionName: { contains: parsed.data.q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { updatedAt: 'desc' },
      take: 500,
    });

    return res.json({ batches: rows.map(serializeBulkImport) });
  }),
);

studentBulkImportsRouter.get(
  '/export',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      className: z.string().optional(),
      sectionName: z.string().optional(),
      academicYear: z.string().optional(),
    });
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();

    const [batches, students] = await Promise.all([
      prisma.studentBulkImport.findMany({
        where: {
          institutionId,
          ...(parsed.data.className ? { className: parsed.data.className } : {}),
          ...(parsed.data.sectionName ? { sectionName: parsed.data.sectionName } : {}),
        },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.student.findMany({
        where: {
          institutionId,
          ...(parsed.data.className ? { className: parsed.data.className } : {}),
          ...(parsed.data.sectionName ? { sectionName: parsed.data.sectionName } : {}),
          ...(parsed.data.academicYear ? { academicYear: parsed.data.academicYear } : {}),
        },
        orderBy: [{ className: 'asc' }, { sectionName: 'asc' }, { rollNumber: 'asc' }],
        take: 5000,
      }),
    ]);

    return res.json({
      batches: batches.map(serializeBulkImport),
      students: students.map(serializeStudent),
    });
  }),
);

studentBulkImportsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const batch = await prisma.studentBulkImport.findFirst({
      where: { id: req.params.id, institutionId },
      include: {
        rows: { orderBy: { rowNumber: 'asc' } },
      },
    });
    if (!batch) return res.status(404).json({ error: 'Import batch not found' });

    return res.json({
      batch: serializeBulkImport(batch),
      rows: batch.rows.map(serializeBulkImportRow),
    });
  }),
);

studentBulkImportsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      fileName: z.string().optional().default(''),
      className: z.string().optional().default(''),
      sectionName: z.string().optional().default(''),
      academicYear: z.string().optional().default('2025-26'),
      updateExisting: z.boolean().optional().default(true),
      rows: z.array(importRowSchema).min(1),
    });
    const parsed = schema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    const result = await runBulkImportBatch({
      institutionId,
      fileName: parsed.data.fileName,
      className: parsed.data.className,
      sectionName: parsed.data.sectionName,
      academicYear: parsed.data.academicYear,
      updateExisting: parsed.data.updateExisting,
      rows: parsed.data.rows,
    });

    return res.status(201).json({
      batch: serializeBulkImport(result.batch),
      created: result.created,
      updated: result.updated,
      errors: result.errors,
    });
  }),
);

studentBulkImportsRouter.patch(
  '/:id/status',
  asyncHandler(async (req, res) => {
    const schema = z.object({ status: z.string().min(1) });
    const parsed = schema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const status = parseBulkImportStatus(parsed.data.status);
    if (!status) return res.status(400).json({ error: 'Invalid status' });

    const institutionId = await getDefaultInstitutionId();
    const existing = await prisma.studentBulkImport.findFirst({
      where: { id: req.params.id, institutionId },
    });
    if (!existing) return res.status(404).json({ error: 'Import batch not found' });

    const batch = await prisma.studentBulkImport.update({
      where: { id: existing.id },
      data: { status },
    });

    return res.json({ batch: serializeBulkImport(batch) });
  }),
);
