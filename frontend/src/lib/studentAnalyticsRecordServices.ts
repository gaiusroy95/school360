import { api } from './api';

export type StudentAnalyticsSummary = {
  total: number;
  activeOpen: number;
  pending: number;
  thisMonth: number;
};

export type StudentScores = {
  growthScore: number;
  academicPerformance: number;
  attendanceScore: number;
  behaviourScore: number;
  disciplineScore: number;
  healthScore: number;
  physicalFitnessScore: number;
  skillDevelopmentScore: number;
  parentEngagementScore: number;
  teacherFeedbackScore: number;
  aiRiskScore: number;
};

export type StudentRiskFlags = {
  dropoutRisk: boolean;
  lowPerformanceRisk: boolean;
  feeDefaultRisk: boolean;
};

export type StudentAnalyticsRecord = {
  id: string;
  recordId: string;
  studentId: string;
  name: string;
  className: string;
  sectionName: string;
  classGroup: string;
  academicYear: string;
  status: string;
  statusLabel: string;
  scores: StudentScores;
  riskFlags: StudentRiskFlags;
  growthScore: number;
  aiRiskScore: number;
  computedAt: string;
  updatedAt: string;
  createdAt: string;
};

export type ScoreLabel = { key: keyof StudentScores; label: string };

export const STUDENT_ANALYTICS_STATUSES = [
  'DRAFT', 'PENDING', 'OPEN', 'ACTIVE', 'COMPLETED', 'APPROVED', 'PAID', 'DUE',
];

export async function fetchStudentAnalyticsMeta(academicYear?: string) {
  const q = academicYear ? `?academicYear=${encodeURIComponent(academicYear)}` : '';
  return api<{
    summary: StudentAnalyticsSummary;
    aggregates: StudentScores & { studentCount: number };
    defaultAcademicYear: string;
    scoreLabels: ScoreLabel[];
  }>(`/api/student-analytics/meta${q}`);
}

export async function syncStudentAnalytics(payload?: {
  academicYear?: string;
  className?: string;
  sectionName?: string;
}) {
  return api<{ created: number; updated: number; total: number }>('/api/student-analytics/sync', {
    method: 'POST',
    body: JSON.stringify(payload || {}),
  });
}

export async function fetchStudentAnalyticsRecords(params?: {
  q?: string;
  status?: string;
  className?: string;
  sectionName?: string;
  academicYear?: string;
}) {
  const q = new URLSearchParams();
  if (params?.q) q.set('q', params.q);
  if (params?.status) q.set('status', params.status);
  if (params?.className) q.set('className', params.className);
  if (params?.sectionName) q.set('sectionName', params.sectionName);
  if (params?.academicYear) q.set('academicYear', params.academicYear);
  const qs = q.toString();
  return api<{ records: StudentAnalyticsRecord[] }>(`/api/student-analytics${qs ? `?${qs}` : ''}`);
}

export async function fetchStudentAnalyticsRecord(id: string) {
  return api<{
    record: StudentAnalyticsRecord;
    student: {
      admissionNumber: string;
      rollNumber: string;
      mobile: string;
      fatherName: string;
      motherName: string;
      status: string;
      entranceScore: number | null;
    };
  }>(`/api/student-analytics/${id}`);
}

export async function refreshStudentAnalyticsRecord(id: string) {
  return api<{
    record: StudentAnalyticsRecord;
    student: {
      admissionNumber: string;
      rollNumber: string;
      mobile: string;
      fatherName: string;
      motherName: string;
      status: string;
      entranceScore: number | null;
    };
  }>(`/api/student-analytics/${id}/refresh`, { method: 'POST' });
}
