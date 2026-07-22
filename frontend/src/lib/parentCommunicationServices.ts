import { api } from './api';

export type CommunicationRecord = {
  id: string;
  recordId: string;
  studentId: string;
  parentRelationship: string;
  channel: string;
  channelLabel: string;
  subject: string;
  body: string;
  plannedAt: string | null;
  sentAt: string | null;
  status: string;
  statusLabel: string;
  isImportant: boolean;
  category: string;
  academicData: Record<string, unknown>;
  teacherFeedback: string;
};

export async function fetchParentCommunicationsMeta() {
  return api<{ summary: { total: number; sent: number; planned: number; important: number } }>('/api/parent-communications/meta');
}

export async function fetchParentCommunications(params?: { q?: string; status?: string; category?: string; studentId?: string }) {
  const q = new URLSearchParams();
  if (params?.q) q.set('q', params.q);
  if (params?.status) q.set('status', params.status);
  if (params?.category) q.set('category', params.category);
  if (params?.studentId) q.set('studentId', params.studentId);
  const qs = q.toString();
  return api<{ records: CommunicationRecord[] }>(`/api/parent-communications${qs ? `?${qs}` : ''}`);
}

export async function createParentCommunication(payload: {
  studentId: string;
  parentRelationship: string;
  channel: string;
  subject?: string;
  body?: string;
  plannedAt?: string;
  sentAt?: string;
  status?: string;
  isImportant?: boolean;
  category?: string;
  academicData?: Record<string, unknown>;
  teacherFeedback?: string;
}) {
  return api<{ record: CommunicationRecord }>('/api/parent-communications', { method: 'POST', body: JSON.stringify(payload) });
}
