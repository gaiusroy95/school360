import { ParentCommunicationChannel, ParentCommunicationDirection, ParentCommunicationStatus, ParentRelationship } from '@prisma/client';
import { prisma } from './prisma.js';

export const CHANNEL_UI: Record<ParentCommunicationChannel, string> = {
  SMS: 'SMS',
  EMAIL: 'Email',
  APP: 'App',
  CALL: 'Call',
  NOTICE: 'Notice',
  WHATSAPP: 'WhatsApp',
};

export const COMM_STATUS_UI: Record<ParentCommunicationStatus, string> = {
  PLANNED: 'Planned',
  SENT: 'Sent',
  DELIVERED: 'Delivered',
  READ: 'Read',
  FAILED: 'Failed',
};

export function serializeCommunication(row: {
  id: string;
  recordId: string;
  studentId: string;
  parentRelationship: ParentRelationship;
  channel: ParentCommunicationChannel;
  direction?: ParentCommunicationDirection;
  subject: string;
  body: string;
  plannedAt: Date | null;
  sentAt: Date | null;
  readAt?: Date | null;
  responseTimeMinutes?: number | null;
  status: ParentCommunicationStatus;
  isImportant: boolean;
  category: string;
  academicData: unknown;
  teacherFeedback: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    recordId: row.recordId,
    studentId: row.studentId,
    parentRelationship: row.parentRelationship,
    channel: row.channel,
    channelLabel: CHANNEL_UI[row.channel],
    direction: row.direction ?? 'OUTBOUND',
    directionLabel: row.direction === 'INBOUND' ? 'Inbound' : 'Outbound',
    subject: row.subject,
    body: row.body,
    plannedAt: row.plannedAt?.toISOString() ?? null,
    sentAt: row.sentAt?.toISOString() ?? null,
    readAt: row.readAt?.toISOString() ?? null,
    responseTimeMinutes: row.responseTimeMinutes ?? null,
    status: row.status,
    statusLabel: COMM_STATUS_UI[row.status],
    isImportant: row.isImportant,
    category: row.category,
    academicData: row.academicData,
    teacherFeedback: row.teacherFeedback,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function nextCommunicationRecordId(institutionId: string) {
  const count = await prisma.parentCommunication.count({ where: { institutionId } });
  return `COM-${String(3000 + count + 1)}`;
}

export async function getCommunicationDashboard(institutionId: string) {
  const [total, sent, planned, important] = await Promise.all([
    prisma.parentCommunication.count({ where: { institutionId } }),
    prisma.parentCommunication.count({ where: { institutionId, status: { in: ['SENT', 'DELIVERED', 'READ'] } } }),
    prisma.parentCommunication.count({ where: { institutionId, status: 'PLANNED' } }),
    prisma.parentCommunication.count({ where: { institutionId, isImportant: true } }),
  ]);
  return { total, sent, planned, important };
}

export async function getCommunicationTopicBreakdown(institutionId: string) {
  const rows = await prisma.parentCommunication.groupBy({
    by: ['category'],
    where: { institutionId },
    _count: { id: true },
  });
  const total = rows.reduce((s, r) => s + r._count.id, 0) || 1;
  return rows.map((r) => ({
    name: r.category,
    count: r._count.id,
    percent: Math.round((r._count.id / total) * 100),
  }));
}
