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

export async function fetchParentCommunicationsMeta() {
  return api<{ summary: { total: number; sent: number; planned: number; important: number } }>('/api/parent-communications/meta');
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
