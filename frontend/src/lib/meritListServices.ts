import { api } from './api';

export type MeritBadge = 'GOLD' | 'SILVER' | 'BRONZE' | 'NONE';

export type MeritSubjectMark = {
  name: string;
  maxMarks: number;
  obtainedMarks: number;
};

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
  scoreSource: 'digital' | 'manual';
  academicSession: string;
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
  meritBadge: MeritBadge | null;
  teacherName: string | null;
  subjects: MeritSubjectMark[] | null;
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
  sessions: string[];
  classes: string[];
  entries: MeritListEntry[];
};

export type ManualEntryMeta = {
  defaultPassMarksPercent: number;
  defaultMaxMarksPerSubject: number;
  maxSubjects: number;
  subjects: string[];
  classes: string[];
  teachers: string[];
  students: Array<{
    applicationDbId: string;
    applicationId: string;
    studentName: string;
    classApplied: string;
    hasManualEntry: boolean;
    entranceTestScore: number | null;
  }>;
};

export async function fetchMeritList(params?: {
  testId?: string;
  classApplied?: string;
  academicSession?: string;
  result?: 'all' | 'passed' | 'failed' | 'pending';
  q?: string;
}) {
  const q = new URLSearchParams();
  if (params?.testId) q.set('testId', params.testId);
  if (params?.classApplied) q.set('classApplied', params.classApplied);
  if (params?.academicSession) q.set('academicSession', params.academicSession);
  if (params?.result && params.result !== 'all') q.set('result', params.result);
  if (params?.q) q.set('q', params.q);
  const qs = q.toString();
  return api<MeritListResponse>(`/api/merit-list${qs ? `?${qs}` : ''}`);
}

export async function fetchManualEntryMeta() {
  return api<ManualEntryMeta>('/api/merit-list/manual-entry/meta');
}

export async function submitManualEntranceEntry(payload: {
  applicationDbId: string;
  teacherName: string;
  classApplied: string;
  subjects: MeritSubjectMark[];
}) {
  return api<{
    ok: boolean;
    percentScore: number;
    meritBadge: MeritBadge;
    passed: boolean;
    totalMaxMarks: number;
    totalObtained: number;
    subjects: MeritSubjectMark[];
  }>('/api/merit-list/manual-entry', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
