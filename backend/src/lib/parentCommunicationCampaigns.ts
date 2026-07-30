import {
  ParentCommunicationCampaignStatus,
  ParentCommunicationChannel,
  ParentCommunicationDeliveryMode,
  ParentCommunicationRecurrence,
  ParentRelationship,
} from '@prisma/client';
import { prisma } from './prisma.js';
import { bulkSendAndRecordCommunications } from './parentCommunications.js';

export type AudienceBatch = {
  className?: string;
  sectionName?: string;
  academicYear?: string;
  parentRelationship?: ParentRelationship;
};

export const CAMPAIGN_STATUS_UI: Record<ParentCommunicationCampaignStatus, string> = {
  DRAFT: 'Draft',
  SCHEDULED: 'Scheduled',
  ACTIVE: 'Active (Recurring)',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export const RECURRENCE_UI: Record<ParentCommunicationRecurrence, string> = {
  NONE: 'One-time',
  WEEKLY: 'Weekly',
  MONTHLY: 'Monthly',
  DAY_15: 'Every 15th of month',
};

function readAudienceBatches(raw: unknown): AudienceBatch[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((b) => b && typeof b === 'object') as AudienceBatch[];
}

export function serializeCampaign(row: {
  id: string;
  campaignCode: string;
  channel: ParentCommunicationChannel;
  subject: string;
  body: string;
  category: string;
  audienceBatches: unknown;
  deliveryMode: ParentCommunicationDeliveryMode;
  scheduledAt: Date | null;
  recurrenceType: ParentCommunicationRecurrence;
  nextRunAt: Date | null;
  lastRunAt: Date | null;
  status: ParentCommunicationCampaignStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  const batches = readAudienceBatches(row.audienceBatches);
  return {
    id: row.id,
    campaignCode: row.campaignCode,
    channel: row.channel,
    subject: row.subject,
    body: row.body,
    category: row.category,
    audienceBatches: batches,
    audienceBatchCount: batches.length,
    deliveryMode: row.deliveryMode,
    scheduledAt: row.scheduledAt?.toISOString() ?? null,
    recurrenceType: row.recurrenceType,
    recurrenceLabel: RECURRENCE_UI[row.recurrenceType],
    nextRunAt: row.nextRunAt?.toISOString() ?? null,
    lastRunAt: row.lastRunAt?.toISOString() ?? null,
    status: row.status,
    statusLabel: CAMPAIGN_STATUS_UI[row.status],
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function nextCampaignCode(institutionId: string) {
  const count = await prisma.parentCommunicationCampaign.count({ where: { institutionId } });
  return `PCAMP-${String(1000 + count + 1)}`;
}

export function computeNextRunAt(from: Date, recurrence: ParentCommunicationRecurrence): Date | null {
  if (recurrence === 'NONE') return null;

  const next = new Date(from.getTime());

  if (recurrence === 'WEEKLY') {
    next.setDate(next.getDate() + 7);
    return next;
  }

  if (recurrence === 'MONTHLY') {
    const day = from.getDate();
    next.setMonth(next.getMonth() + 1);
    const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
    next.setDate(Math.min(day, lastDay));
    return next;
  }

  if (recurrence === 'DAY_15') {
    const candidate = new Date(from.getTime());
    candidate.setHours(from.getHours(), from.getMinutes(), 0, 0);
    if (from.getDate() < 15) {
      candidate.setDate(15);
      return candidate;
    }
    candidate.setMonth(candidate.getMonth() + 1);
    candidate.setDate(15);
    return candidate;
  }

  return null;
}

function normalizeBatches(batches: AudienceBatch[]): AudienceBatch[] {
  if (batches.length === 0) return [{}];
  return batches.map((b) => ({
    className: b.className?.trim() || undefined,
    sectionName: b.sectionName?.trim() || undefined,
    academicYear: b.academicYear?.trim() || undefined,
    parentRelationship: b.parentRelationship,
  }));
}

export async function executeCampaign(institutionId: string, campaignId: string) {
  const campaign = await prisma.parentCommunicationCampaign.findFirst({
    where: { institutionId, id: campaignId },
  });
  if (!campaign) throw new Error('Campaign not found');

  const batches = normalizeBatches(readAudienceBatches(campaign.audienceBatches));
  let totalCount = 0;
  const allRecords = [];

  for (const batch of batches) {
    const result = await bulkSendAndRecordCommunications(institutionId, {
      channel: campaign.channel,
      subject: campaign.subject,
      body: campaign.body,
      category: campaign.category,
      className: batch.className,
      sectionName: batch.sectionName,
      academicYear: batch.academicYear,
      parentRelationship: batch.parentRelationship,
      campaignCode: campaign.campaignCode,
    });
    totalCount += result.count;
    allRecords.push(...result.records);
  }

  const now = new Date();
  const nextRunAt = computeNextRunAt(now, campaign.recurrenceType);
  const isRecurring = campaign.recurrenceType !== 'NONE';

  await prisma.parentCommunicationCampaign.update({
    where: { id: campaign.id },
    data: {
      lastRunAt: now,
      nextRunAt: isRecurring ? nextRunAt : null,
      status: isRecurring && nextRunAt ? 'ACTIVE' : 'COMPLETED',
      deliveryMode: isRecurring ? 'RECURRING' : campaign.deliveryMode === 'RECURRING' ? 'RECURRING' : 'SEND_NOW',
    },
  });

  return {
    campaignCode: campaign.campaignCode,
    sentAt: now.toISOString(),
    count: totalCount,
    records: allRecords,
    nextRunAt: nextRunAt?.toISOString() ?? null,
  };
}

export type CreateCampaignInput = {
  action: 'draft' | 'send_now' | 'scheduled';
  channel: ParentCommunicationChannel;
  subject: string;
  body: string;
  category?: string;
  audienceBatches: AudienceBatch[];
  scheduledAt?: Date;
  recurrenceType?: ParentCommunicationRecurrence;
  createdBy?: string;
};

export async function createCommunicationCampaign(institutionId: string, input: CreateCampaignInput) {
  const batches = normalizeBatches(input.audienceBatches);
  const recurrence = input.recurrenceType ?? 'NONE';
  const campaignCode = await nextCampaignCode(institutionId);

  let deliveryMode: ParentCommunicationDeliveryMode = 'DRAFT';
  let status: ParentCommunicationCampaignStatus = 'DRAFT';
  let scheduledAt: Date | null = null;
  let nextRunAt: Date | null = null;

  if (input.action === 'draft') {
    deliveryMode = 'DRAFT';
    status = 'DRAFT';
  } else if (input.action === 'scheduled') {
    if (!input.scheduledAt) throw new Error('Scheduled date and time are required');
    scheduledAt = input.scheduledAt;
    nextRunAt = input.scheduledAt;
    if (recurrence === 'NONE') {
      deliveryMode = 'SCHEDULED';
      status = 'SCHEDULED';
    } else {
      deliveryMode = 'RECURRING';
      status = 'SCHEDULED';
    }
  } else {
    deliveryMode = recurrence === 'NONE' ? 'SEND_NOW' : 'RECURRING';
    status = recurrence === 'NONE' ? 'DRAFT' : 'ACTIVE';
  }

  const row = await prisma.parentCommunicationCampaign.create({
    data: {
      institutionId,
      campaignCode,
      channel: input.channel,
      subject: input.subject,
      body: input.body,
      category: input.category ?? 'general',
      audienceBatches: batches as object[],
      deliveryMode,
      scheduledAt,
      recurrenceType: recurrence,
      nextRunAt: input.action === 'send_now' && recurrence !== 'NONE' ? new Date() : nextRunAt,
      status,
      createdBy: input.createdBy ?? '',
    },
  });

  if (input.action === 'send_now') {
    const result = await executeCampaign(institutionId, row.id);
    const updated = await prisma.parentCommunicationCampaign.findUniqueOrThrow({ where: { id: row.id } });
    return { campaign: serializeCampaign(updated), execution: result };
  }

  return { campaign: serializeCampaign(row), execution: null };
}

export async function listCommunicationCampaigns(
  institutionId: string,
  params?: { status?: ParentCommunicationCampaignStatus },
) {
  const rows = await prisma.parentCommunicationCampaign.findMany({
    where: {
      institutionId,
      ...(params?.status ? { status: params.status } : {}),
    },
    orderBy: { updatedAt: 'desc' },
    take: 200,
  });
  return rows.map(serializeCampaign);
}

export async function sendCampaignNow(institutionId: string, campaignId: string) {
  const campaign = await prisma.parentCommunicationCampaign.findFirst({
    where: { institutionId, id: campaignId },
  });
  if (!campaign) throw new Error('Campaign not found');
  if (campaign.status === 'CANCELLED' || campaign.status === 'COMPLETED') {
    throw new Error('Campaign cannot be sent in its current status');
  }

  const result = await executeCampaign(institutionId, campaignId);
  const updated = await prisma.parentCommunicationCampaign.findUniqueOrThrow({ where: { id: campaignId } });
  return { campaign: serializeCampaign(updated), execution: result };
}

export async function cancelCommunicationCampaign(institutionId: string, campaignId: string) {
  const campaign = await prisma.parentCommunicationCampaign.findFirst({
    where: { institutionId, id: campaignId },
  });
  if (!campaign) throw new Error('Campaign not found');

  const updated = await prisma.parentCommunicationCampaign.update({
    where: { id: campaignId },
    data: { status: 'CANCELLED', nextRunAt: null },
  });
  return serializeCampaign(updated);
}

export async function processDueCommunicationCampaigns(institutionId?: string) {
  const now = new Date();
  const due = await prisma.parentCommunicationCampaign.findMany({
    where: {
      ...(institutionId ? { institutionId } : {}),
      status: { in: ['SCHEDULED', 'ACTIVE'] },
      nextRunAt: { lte: now },
    },
    orderBy: { nextRunAt: 'asc' },
    take: 50,
  });

  const results = [];
  for (const campaign of due) {
    try {
      const execution = await executeCampaign(campaign.institutionId, campaign.id);
      results.push({ ...execution, campaignId: campaign.id, ok: true });
    } catch (err) {
      results.push({
        campaignId: campaign.id,
        campaignCode: campaign.campaignCode,
        ok: false,
        error: err instanceof Error ? err.message : 'Execution failed',
      });
    }
  }
  return results;
}

export async function getCampaignDashboard(institutionId: string) {
  const [drafts, scheduled, active] = await Promise.all([
    prisma.parentCommunicationCampaign.count({ where: { institutionId, status: 'DRAFT' } }),
    prisma.parentCommunicationCampaign.count({ where: { institutionId, status: 'SCHEDULED' } }),
    prisma.parentCommunicationCampaign.count({ where: { institutionId, status: 'ACTIVE' } }),
  ]);
  return { drafts, scheduled, active };
}
