import { Router } from 'express';
import { z } from 'zod';
import { getDefaultInstitutionId } from '../lib/institution.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { buildMeritListEntries } from '../lib/meritListBuilder.js';
import {
  fetchManualEntryMeta,
  submitManualEntranceTestEntry,
} from '../lib/manualEntranceTest.js';

export const meritListRouter = Router();
meritListRouter.use(requireAuth);

meritListRouter.get(
  '/manual-entry/meta',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const meta = await fetchManualEntryMeta(institutionId);
    return res.json(meta);
  }),
);

meritListRouter.post(
  '/manual-entry',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      applicationDbId: z.string().min(1),
      teacherName: z.string().min(1),
      classApplied: z.string().optional().default(''),
      subjects: z
        .array(
          z.object({
            name: z.string().min(1),
            maxMarks: z.number().positive(),
            obtainedMarks: z.number().min(0),
          }),
        )
        .min(1)
        .max(6),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    const recordedBy = req.user?.email || 'Admin';
    const result = await submitManualEntranceTestEntry(institutionId, {
      ...parsed.data,
      recordedBy,
    });

    return res.json({
      ok: true,
      percentScore: result.percentScore,
      meritBadge: result.meritBadge,
      passed: result.passed,
      totalMaxMarks: result.totalMaxMarks,
      totalObtained: result.totalObtained,
      subjects: result.subjects,
    });
  }),
);

meritListRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      testId: z.string().optional(),
      classApplied: z.string().optional(),
      academicSession: z.string().optional(),
      result: z.enum(['all', 'passed', 'failed', 'pending']).optional().default('all'),
      q: z.string().optional(),
    });
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    const payload = await buildMeritListEntries({
      institutionId,
      testId: parsed.data.testId,
      classApplied: parsed.data.classApplied,
      academicSession: parsed.data.academicSession,
      result: parsed.data.result,
      q: parsed.data.q,
    });

    return res.json(payload);
  }),
);
