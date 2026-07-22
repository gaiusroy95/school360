import { Router } from 'express';
import { z } from 'zod';
import { ParentConsentTemplateStatus, ParentRelationship } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { getDefaultInstitutionId } from '../lib/institution.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import {
  nextConsentTemplateRecordId,
  serializeConsentResponse,
  serializeConsentTemplate,
} from '../lib/parentConsents.js';

export const parentConsentsRouter = Router();
parentConsentsRouter.use(requireAuth);

parentConsentsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const templates = await prisma.parentConsentTemplate.findMany({
      where: { institutionId },
      include: { _count: { select: { responses: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ templates: templates.map(serializeConsentTemplate) });
  }),
);

parentConsentsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      category: z.string().optional(),
      formFields: z.array(z.unknown()).optional(),
      academicYear: z.string().optional(),
      validUntil: z.string().optional(),
      status: z.enum(['DRAFT', 'ACTIVE', 'CLOSED']).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    const recordId = await nextConsentTemplateRecordId(institutionId);
    const row = await prisma.parentConsentTemplate.create({
      data: {
        institutionId,
        recordId,
        title: parsed.data.title,
        description: parsed.data.description || '',
        category: parsed.data.category || 'General',
        formFields: (parsed.data.formFields || []) as object,
        academicYear: parsed.data.academicYear || '2025-26',
        validUntil: parsed.data.validUntil ? new Date(parsed.data.validUntil) : null,
        status: (parsed.data.status as ParentConsentTemplateStatus) || 'DRAFT',
      },
    });
    return res.status(201).json({ template: serializeConsentTemplate(row) });
  }),
);

parentConsentsRouter.post(
  '/:templateId/share',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      studentIds: z.array(z.string()).min(1),
      parentRelationship: z.enum(['FATHER', 'MOTHER', 'GUARDIAN']).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    const template = await prisma.parentConsentTemplate.findFirst({
      where: { institutionId, id: req.params.templateId },
    });
    if (!template) return res.status(404).json({ error: 'Template not found' });

    const rel = (parsed.data.parentRelationship as ParentRelationship) || 'FATHER';
    let created = 0;
    for (const studentId of parsed.data.studentIds) {
      const exists = await prisma.parentConsentResponse.findUnique({
        where: { templateId_studentId_parentRelationship: { templateId: template.id, studentId, parentRelationship: rel } },
      });
      if (!exists) {
        await prisma.parentConsentResponse.create({
          data: { institutionId, templateId: template.id, studentId, parentRelationship: rel, status: 'PENDING' },
        });
        created += 1;
      }
    }

    if (template.status === 'DRAFT') {
      await prisma.parentConsentTemplate.update({
        where: { id: template.id },
        data: { status: 'ACTIVE' },
      });
    }

    return res.json({ created, message: 'Shared to parent app — awaiting parent approval' });
  }),
);

parentConsentsRouter.get(
  '/:templateId/responses',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const rows = await prisma.parentConsentResponse.findMany({
      where: { institutionId, templateId: req.params.templateId },
      orderBy: { sharedAt: 'desc' },
    });
    return res.json({ responses: rows.map(serializeConsentResponse) });
  }),
);
