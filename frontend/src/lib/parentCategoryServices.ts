import { api } from './api';

export type ParentSegmentId = 'champions' | 'silent_trusters' | 'anxious_intense' | 'disconnected';

export type EngagementPlan = {
  goal: string;
  platformActions: string[];
  studentImpact: string;
};

export type SegmentDefinition = {
  id: ParentSegmentId;
  name: string;
  dataProfile: string;
  reality: string;
  color: string;
  count: number;
  percent: number;
  engagementPlan: EngagementPlan;
};

export type ParentSegmentParent = {
  parentKey: string;
  name: string;
  relationship: string;
  mobile: string;
  students: { studentId: string; name: string; class: string }[];
  status: string;
  pesScore: number;
  childPerformanceScore: number;
  segmentId: ParentSegmentId;
  segmentName: string;
  flags: string[];
  pesComponents: {
    attendance: number;
    readRate: number;
    proactiveMessages: number;
    feedback: number;
    appLoginBonus: number;
  };
};

export type ParentCategoryAnalytics = {
  summary: {
    totalParentCategories: number;
    activeOpen: number;
    pending: number;
    thisMonth: number;
    segmented: number;
  };
  segments: SegmentDefinition[];
  parents: ParentSegmentParent[];
  total: number;
};

export async function fetchParentCategoryAnalytics(params?: {
  segment?: ParentSegmentId;
  academicYear?: string;
  q?: string;
}) {
  const q = new URLSearchParams();
  if (params?.segment) q.set('segment', params.segment);
  if (params?.academicYear) q.set('academicYear', params.academicYear);
  if (params?.q) q.set('q', params.q);
  const qs = q.toString();
  return api<ParentCategoryAnalytics>(`/api/parent-categories/analytics${qs ? `?${qs}` : ''}`);
}
