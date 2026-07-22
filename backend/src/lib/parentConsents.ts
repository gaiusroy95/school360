import { ParentConsentResponseStatus, ParentConsentTemplateStatus, ParentRelationship } from '@prisma/client';
import { prisma } from './prisma.js';

export const CONSENT_TEMPLATE_STATUS_UI: Record<ParentConsentTemplateStatus, string> = {
  DRAFT: 'Draft',
  ACTIVE: 'Active',
  CLOSED: 'Closed',
};

export const CONSENT_RESPONSE_STATUS_UI: Record<ParentConsentResponseStatus, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

export function serializeConsentTemplate(row: {
  id: string;
  recordId: string;
  title: string;
  description: string;
  category: string;
  formFields: unknown;
  academicYear: string;
  validUntil: Date | null;
  status: ParentConsentTemplateStatus;
  createdAt: Date;
  updatedAt: Date;
  _count?: { responses: number };
}) {
  return {
    id: row.id,
    recordId: row.recordId,
    title: row.title,
    description: row.description,
    category: row.category,
    formFields: row.formFields,
    academicYear: row.academicYear,
    validUntil: row.validUntil?.toISOString() ?? null,
    status: row.status,
    statusLabel: CONSENT_TEMPLATE_STATUS_UI[row.status],
    responseCount: row._count?.responses ?? 0,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function serializeConsentResponse(row: {
  id: string;
  templateId: string;
  studentId: string;
  parentRelationship: ParentRelationship;
  status: ParentConsentResponseStatus;
  sharedAt: Date;
  remarks: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    templateId: row.templateId,
    studentId: row.studentId,
    parentRelationship: row.parentRelationship,
    status: row.status,
    statusLabel: CONSENT_RESPONSE_STATUS_UI[row.status],
    sharedAt: row.sharedAt.toISOString(),
    remarks: row.remarks,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function nextConsentTemplateRecordId(institutionId: string) {
  const count = await prisma.parentConsentTemplate.count({ where: { institutionId } });
  return `CON-${String(6000 + count + 1)}`;
}
