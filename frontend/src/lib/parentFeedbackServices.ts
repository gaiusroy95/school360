import { api } from './api';

export type FeedbackRecord = {
  id: string;
  recordId: string;
  studentId: string;
  studentName: string;
  classGroup: string;
  parentKey: string;
  parentRelationship: string;
  relationshipLabel: string;
  parentName: string;
  parentMobile: string;
  source: string;
  sourceLabel: string;
  rating: number;
  category: string;
  message: string;
  submittedAt: string;
};

export async function fetchParentFeedbackMeta() {
  return api<{ summary: { total: number; averageRating: number } }>('/api/parent-feedback/meta');
}

export async function fetchParentFeedback(params?: {
  q?: string;
  studentId?: string;
  className?: string;
  sectionName?: string;
  category?: string;
}) {
  const q = new URLSearchParams();
  if (params?.q) q.set('q', params.q);
  if (params?.studentId) q.set('studentId', params.studentId);
  if (params?.className) q.set('className', params.className);
  if (params?.sectionName) q.set('sectionName', params.sectionName);
  if (params?.category) q.set('category', params.category);
  const qs = q.toString();
  return api<{ records: FeedbackRecord[] }>(`/api/parent-feedback${qs ? `?${qs}` : ''}`);
}

export async function submitMobileParentFeedback(payload: {
  studentId: string;
  parentRelationship: string;
  parentMobile?: string;
  parentName?: string;
  rating: number;
  category?: string;
  message: string;
}) {
  return api<{ record: FeedbackRecord }>('/api/parent-feedback/mobile', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
