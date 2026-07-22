import { api } from './api';

export type FeedbackRecord = {
  id: string;
  recordId: string;
  studentId: string;
  parentRelationship: string;
  parentName: string;
  rating: number;
  category: string;
  message: string;
  submittedAt: string;
};

export async function fetchParentFeedbackMeta() {
  return api<{ summary: { total: number; averageRating: number } }>('/api/parent-feedback/meta');
}

export async function fetchParentFeedback(studentId?: string) {
  const q = studentId ? `?studentId=${encodeURIComponent(studentId)}` : '';
  return api<{ records: FeedbackRecord[] }>(`/api/parent-feedback${q}`);
}

export async function createParentFeedback(payload: {
  studentId: string;
  parentRelationship: string;
  parentName?: string;
  rating: number;
  category?: string;
  message: string;
}) {
  return api<{ record: FeedbackRecord }>('/api/parent-feedback', { method: 'POST', body: JSON.stringify(payload) });
}
