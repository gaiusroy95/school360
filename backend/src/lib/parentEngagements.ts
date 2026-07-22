import { ParentEngagementStatus, ParentRelationship } from '@prisma/client';
import { prisma } from './prisma.js';

export const ENGAGEMENT_STATUS_UI: Record<ParentEngagementStatus, string> = {
  PLANNED: 'Planned',
  COMPLETED: 'Completed',
  MISSED: 'Missed',
  CANCELLED: 'Cancelled',
};

export function serializeEngagement(row: {
  id: string;
  recordId: string;
  studentId: string;
  parentRelationship: ParentRelationship;
  title: string;
  description: string;
  engagementType: string;
  plannedAt: Date;
  completedAt: Date | null;
  outcome: string;
  studentFeedbackNotes: string;
  status: ParentEngagementStatus;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    recordId: row.recordId,
    studentId: row.studentId,
    parentRelationship: row.parentRelationship,
    relationshipLabel: row.parentRelationship === 'FATHER' ? 'Father' : row.parentRelationship === 'MOTHER' ? 'Mother' : 'Guardian',
    title: row.title,
    description: row.description,
    engagementType: row.engagementType,
    plannedAt: row.plannedAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
    outcome: row.outcome,
    studentFeedbackNotes: row.studentFeedbackNotes,
    status: row.status,
    statusLabel: ENGAGEMENT_STATUS_UI[row.status],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function nextEngagementRecordId(institutionId: string) {
  const count = await prisma.parentEngagementEvent.count({ where: { institutionId } });
  return `ENG-${String(2000 + count + 1)}`;
}

export async function getEngagementDashboard(institutionId: string) {
  const [total, planned, completed, missed] = await Promise.all([
    prisma.parentEngagementEvent.count({ where: { institutionId } }),
    prisma.parentEngagementEvent.count({ where: { institutionId, status: 'PLANNED' } }),
    prisma.parentEngagementEvent.count({ where: { institutionId, status: 'COMPLETED' } }),
    prisma.parentEngagementEvent.count({ where: { institutionId, status: 'MISSED' } }),
  ]);
  return { total, planned, completed, missed };
}
