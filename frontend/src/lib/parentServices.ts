import { api } from './api';

export type ParentSummary = {
  total: number;
  activeOpen: number;
  newThisYear: number;
  ptmMeetings: number;
  messagesSent: number;
  satisfactionScore: number;
  laggingCount?: number;
  exceptionalCount?: number;
};

export type ParentListItem = {
  parentKey: string;
  name: string;
  students: { studentId: string; name: string; class: string }[];
  relationship: string;
  mobile: string;
  email: string;
  status: string;
  lastComm: string;
  categoryLabels: string[];
  engagementScore: number | null;
  engagementTier: string | null;
};

export type ParentDetail = {
  parent: ParentListItem;
  profile: { occupation: string; address: string; joinedOn: string; category: string };
  children: {
    studentId: string;
    name: string;
    classGroup: string;
    feePaidTotal?: number;
    feeDueAmount?: number;
    attendanceToday?: string;
  }[];
  fees: { paid: number; due: number; payable: number };
  communications: unknown[];
  engagements: unknown[];
  meetings: unknown[];
  feedbacks: unknown[];
  recentActivities: { title: string; desc: string; time: string; type: string }[];
  engagementScore?: { score: number; tier: string; flags: string[] };
};

export async function fetchParentsMeta(academicYear?: string) {
  const q = academicYear ? `?academicYear=${encodeURIComponent(academicYear)}` : '';
  return api<{
    summary: ParentSummary;
    filters: { classes: string[]; sectionsByClass: Record<string, string[]>; academicYears: string[]; defaultAcademicYear: string };
    defaultAcademicYear: string;
    engagementTrend: { name: string; messages: number; ptm: number; logins: number }[];
    topicBreakdown: { name: string; count: number; percent: number }[];
  }>(`/api/parents/meta${q}`);
}

export async function seedParents() {
  return api<{ categories: number; engagements: number; communications: number }>('/api/parents/seed', { method: 'POST' });
}

export async function fetchParents(params?: {
  q?: string;
  className?: string;
  sectionName?: string;
  academicYear?: string;
  relationship?: string;
  status?: string;
  engagement?: 'lagging' | 'exceptional' | 'all';
  categoryId?: string;
}) {
  const q = new URLSearchParams();
  if (params?.q) q.set('q', params.q);
  if (params?.className) q.set('className', params.className);
  if (params?.sectionName) q.set('sectionName', params.sectionName);
  if (params?.academicYear) q.set('academicYear', params.academicYear);
  if (params?.relationship) q.set('relationship', params.relationship);
  if (params?.status) q.set('status', params.status);
  if (params?.engagement) q.set('engagement', params.engagement);
  if (params?.categoryId) q.set('categoryId', params.categoryId);
  const qs = q.toString();
  return api<{ parents: ParentListItem[]; total: number }>(`/api/parents${qs ? `?${qs}` : ''}`);
}

export async function fetchParentDetail(parentKey: string) {
  return api<ParentDetail>(`/api/parents/${encodeURIComponent(parentKey)}`);
}

export const PARENT_PROFILE_KEY = 'parentProfileKey';

export function setParentProfileKey(key: string) {
  sessionStorage.setItem(PARENT_PROFILE_KEY, key);
}

export function getParentProfileKey() {
  return sessionStorage.getItem(PARENT_PROFILE_KEY);
}
