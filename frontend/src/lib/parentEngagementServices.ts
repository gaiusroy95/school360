import { api } from './api';

export type EngagementRecord = {
  id: string;
  recordId: string;
  studentId: string;
  studentName: string;
  classGroup: string;
  parentName: string;
  parentMobile: string;
  parentKey: string;
  parentRelationship: string;
  relationshipLabel: string;
  title: string;
  description: string;
  engagementType: string;
  plannedAt: string;
  completedAt: string | null;
  actionsTaken: string;
  outcome: string;
  studentFeedbackNotes: string;
  status: string;
  statusLabel: string;
};

export async function fetchParentEngagementsMeta() {
  return api<{ summary: { total: number; planned: number; completed: number; missed: number } }>('/api/parent-engagements/meta');
}

export async function fetchParentEngagements(params?: {
  studentId?: string;
  parentKey?: string;
  status?: string;
  from?: string;
  to?: string;
}) {
  const q = new URLSearchParams();
  if (params?.studentId) q.set('studentId', params.studentId);
  if (params?.parentKey) q.set('parentKey', params.parentKey);
  if (params?.status) q.set('status', params.status);
  if (params?.from) q.set('from', params.from);
  if (params?.to) q.set('to', params.to);
  const qs = q.toString();
  return api<{ records: EngagementRecord[] }>(`/api/parent-engagements${qs ? `?${qs}` : ''}`);
}

export async function createParentEngagement(payload: {
  studentId: string;
  parentRelationship: string;
  title: string;
  description?: string;
  engagementType?: string;
  plannedAt: string;
  actionsTaken?: string;
  outcome?: string;
  studentFeedbackNotes?: string;
  status?: string;
  completedAt?: string;
}) {
  return api<{ record: EngagementRecord }>('/api/parent-engagements', { method: 'POST', body: JSON.stringify(payload) });
}

export async function createParentEngagementsBatch(engagements: {
  studentId: string;
  parentRelationship: string;
  title: string;
  description?: string;
  engagementType?: string;
  plannedAt: string;
  status?: string;
}[]) {
  return api<{ records: EngagementRecord[] }>('/api/parent-engagements/batch', {
    method: 'POST',
    body: JSON.stringify({ engagements }),
  });
}

export async function updateParentEngagement(id: string, payload: Partial<{
  title: string;
  description: string;
  plannedAt: string;
  completedAt: string | null;
  actionsTaken: string;
  outcome: string;
  studentFeedbackNotes: string;
  status: string;
}>) {
  return api<{ record: EngagementRecord }>(`/api/parent-engagements/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
}
