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
  teacherName?: string;
  className?: string;
  sectionName?: string;
  academicYear?: string;
  rosterTaskId?: string;
  mobilePublished?: boolean;
};

export type EngagementHierarchyMeta = {
  academicYear: string;
  teachers: {
    teacherName: string;
    assignments: { className: string; sectionName: string; classGroup: string }[];
  }[];
  classes: string[];
  sectionsByClass: Record<string, string[]>;
};

export async function fetchParentEngagementsMeta() {
  return api<{ summary: { total: number; planned: number; completed: number; missed: number } }>('/api/parent-engagements/meta');
}

export async function fetchParentEngagementHierarchy(academicYear?: string) {
  const q = academicYear ? `?academicYear=${encodeURIComponent(academicYear)}` : '';
  return api<EngagementHierarchyMeta>(`/api/parent-engagements/hierarchy-meta${q}`);
}

export async function fetchParentEngagements(params?: {
  studentId?: string;
  parentKey?: string;
  teacherName?: string;
  className?: string;
  sectionName?: string;
  academicYear?: string;
  status?: string;
  from?: string;
  to?: string;
}) {
  const q = new URLSearchParams();
  if (params?.studentId) q.set('studentId', params.studentId);
  if (params?.parentKey) q.set('parentKey', params.parentKey);
  if (params?.teacherName) q.set('teacherName', params.teacherName);
  if (params?.className) q.set('className', params.className);
  if (params?.sectionName) q.set('sectionName', params.sectionName);
  if (params?.academicYear) q.set('academicYear', params.academicYear);
  if (params?.status) q.set('status', params.status);
  if (params?.from) q.set('from', params.from);
  if (params?.to) q.set('to', params.to);
  const qs = q.toString();
  return api<{ records: EngagementRecord[] }>(`/api/parent-engagements${qs ? `?${qs}` : ''}`);
}

type EngagementPayload = {
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
  teacherName?: string;
  className?: string;
  sectionName?: string;
  academicYear?: string;
  publishToMobile?: boolean;
};

export async function createParentEngagement(payload: EngagementPayload) {
  return api<{ record: EngagementRecord }>('/api/parent-engagements', { method: 'POST', body: JSON.stringify(payload) });
}

export async function createParentEngagementsBatch(engagements: EngagementPayload[]) {
  return api<{ records: EngagementRecord[] }>('/api/parent-engagements/batch', {
    method: 'POST',
    body: JSON.stringify({ engagements }),
  });
}

export async function updateParentEngagement(id: string, payload: Partial<{
  title: string;
  description: string;
  engagementType: string;
  plannedAt: string;
  completedAt: string | null;
  actionsTaken: string;
  outcome: string;
  studentFeedbackNotes: string;
  status: string;
}>) {
  return api<{ record: EngagementRecord }>(`/api/parent-engagements/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
}
