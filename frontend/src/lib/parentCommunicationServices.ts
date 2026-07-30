import { api } from './api';

export type CommunicationRecord = {
  id: string;
  recordId: string;
  studentId: string;
  studentName: string;
  classGroup: string;
  parentName: string;
  parentMobile: string;
  parentKey: string;
  campaignId: string;
  parentRelationship: string;
  channel: string;
  channelLabel: string;
  direction: string;
  directionLabel: string;
  subject: string;
  body: string;
  plannedAt: string | null;
  sentAt: string | null;
  readAt: string | null;
  status: string;
  statusLabel: string;
  isImportant: boolean;
  category: string;
  academicData: Record<string, unknown>;
  teacherFeedback: string;
  createdAt: string;
};

export type AudienceBatch = {
  className?: string;
  sectionName?: string;
  academicYear?: string;
  parentRelationship?: string;
};

export type CommunicationCampaign = {
  id: string;
  campaignCode: string;
  channel: string;
  subject: string;
  body: string;
  category: string;
  audienceBatches: AudienceBatch[];
  audienceBatchCount: number;
  deliveryMode: string;
  scheduledAt: string | null;
  recurrenceType: string;
  recurrenceLabel: string;
  nextRunAt: string | null;
  lastRunAt: string | null;
  status: string;
  statusLabel: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export async function fetchParentCommunicationsMeta() {
  return api<{
    summary: { total: number; sent: number; planned: number; important: number };
    campaigns: { drafts: number; scheduled: number; active: number };
  }>('/api/parent-communications/meta');
}

export async function fetchParentCommunications(params?: {
  q?: string;
  mobile?: string;
  status?: string;
  category?: string;
  channel?: string;
  studentId?: string;
}) {
  const q = new URLSearchParams();
  if (params?.q) q.set('q', params.q);
  if (params?.mobile) q.set('mobile', params.mobile);
  if (params?.status) q.set('status', params.status);
  if (params?.category) q.set('category', params.category);
  if (params?.channel) q.set('channel', params.channel);
  if (params?.studentId) q.set('studentId', params.studentId);
  const qs = q.toString();
  return api<{ records: CommunicationRecord[] }>(`/api/parent-communications${qs ? `?${qs}` : ''}`);
}

export async function fetchParentCommunication(id: string) {
  return api<{ record: CommunicationRecord }>(`/api/parent-communications/${id}`);
}

export async function fetchParentCommunicationCampaigns(status?: string) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  return api<{ campaigns: CommunicationCampaign[] }>(`/api/parent-communications/campaigns${qs}`);
}

export async function createParentCommunicationCampaign(payload: {
  action: 'draft' | 'send_now' | 'scheduled';
  channel: string;
  subject: string;
  body: string;
  category?: string;
  audienceBatches: AudienceBatch[];
  scheduledAt?: string;
  recurrenceType?: 'NONE' | 'WEEKLY' | 'MONTHLY' | 'DAY_15';
}) {
  return api<{
    campaign: CommunicationCampaign;
    execution: { campaignCode: string; sentAt: string; count: number } | null;
  }>('/api/parent-communications/campaigns', { method: 'POST', body: JSON.stringify(payload) });
}

export async function sendParentCommunicationCampaignNow(id: string) {
  return api<{
    campaign: CommunicationCampaign;
    execution: { campaignCode: string; sentAt: string; count: number };
  }>(`/api/parent-communications/campaigns/${id}/send`, { method: 'POST' });
}

export async function cancelParentCommunicationCampaign(id: string) {
  return api<{ campaign: CommunicationCampaign }>(`/api/parent-communications/campaigns/${id}/cancel`, {
    method: 'POST',
  });
}

/** @deprecated Use createParentCommunicationCampaign with action send_now */
export async function bulkSendParentCommunications(payload: {
  channel: string;
  subject: string;
  body: string;
  category?: string;
  className?: string;
  sectionName?: string;
  academicYear?: string;
  parentRelationship?: string;
}) {
  return api<{
    campaignId: string;
    sentAt: string;
    count: number;
    records: CommunicationRecord[];
  }>('/api/parent-communications/bulk-send', { method: 'POST', body: JSON.stringify(payload) });
}
