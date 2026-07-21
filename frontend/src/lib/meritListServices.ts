import { api } from './api';

export type MeritListEntry = {
  rank: number | null;
  attemptId: string;
  applicationDbId: string;
  applicationId: string;
  studentName: string;
  classApplied: string;
  email: string;
  mobile: string;
  applicationStatus: string;
  testId: string;
  testTitle: string;
  scorePercent: number | null;
  rawScore: number | null;
  maxScore: number | null;
  passMarksRequired: number;
  passed: boolean | null;
  submitted: boolean;
  submittedAt: string | null;
  correctCount: number | null;
  partialCount: number | null;
  wrongCount: number | null;
};

export type MeritListResponse = {
  defaultPassMarksPercent: number;
  summary: {
    totalAssigned: number;
    submitted: number;
    pending: number;
    passed: number;
    failed: number;
    passRate: number;
  };
  tests: { id: string; title: string; passMarksPercent: number }[];
  classes: string[];
  entries: MeritListEntry[];
};

export async function fetchMeritList(params?: {
  testId?: string;
  classApplied?: string;
  result?: 'all' | 'passed' | 'failed' | 'pending';
  q?: string;
}) {
  const q = new URLSearchParams();
  if (params?.testId) q.set('testId', params.testId);
  if (params?.classApplied) q.set('classApplied', params.classApplied);
  if (params?.result && params.result !== 'all') q.set('result', params.result);
  if (params?.q) q.set('q', params.q);
  const qs = q.toString();
  return api<MeritListResponse>(`/api/merit-list${qs ? `?${qs}` : ''}`);
}
