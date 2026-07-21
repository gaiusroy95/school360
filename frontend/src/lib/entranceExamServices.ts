import { api } from './api';

const EXAM_TOKEN_KEY = 'entrance_exam_token';

function resolveApiUrl(): string {
  const raw = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  if (import.meta.env.DEV) return 'http://localhost:4000';
  return '';
}

const API_URL = resolveApiUrl();

export function getExamToken(): string | null {
  return sessionStorage.getItem(EXAM_TOKEN_KEY);
}

export function setExamToken(token: string | null) {
  if (token) sessionStorage.setItem(EXAM_TOKEN_KEY, token);
  else sessionStorage.removeItem(EXAM_TOKEN_KEY);
}

async function examApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!API_URL) throw new Error('API URL is not configured');
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  const token = getExamToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  }
  return data as T;
}

export type ExamResultBreakdown = {
  questionId: string;
  sortOrder: number;
  type: string;
  questionText: string;
  givenAnswer: string;
  correctAnswer: string;
  points: number;
  maxPoints: number;
  status: 'correct' | 'partial' | 'wrong' | 'unanswered';
};

export type ExamResult = {
  testTitle: string;
  studentName: string;
  score: number;
  rawScore: number;
  maxScore: number;
  passed: boolean;
  passMarksRequired: number;
  correctCount: number;
  partialCount: number;
  wrongCount: number;
  unansweredCount: number;
  breakdown: ExamResultBreakdown[];
  message: string;
  submittedAt?: string | null;
};

export type ExamLoginActive = {
  alreadySubmitted: false;
  sessionToken: string;
  studentName: string;
  applicationId: string;
  testTitle: string;
  durationMinutes: number;
  questionCount: number;
  scheduledAt: string;
  visibleOn: string;
  startedAt: string;
  passMarksRequired: number;
};

export type ExamLoginSubmitted = {
  alreadySubmitted: true;
  result: ExamResult;
};

export type ExamLoginResponse = ExamLoginActive | ExamLoginSubmitted;

export type ExamQuestion = {
  id: string;
  sortOrder: number;
  type: string;
  questionText: string;
  options: string[];
};

export async function loginEntranceExam(tokenNumber: string, pin: string) {
  return examApi<ExamLoginResponse>('/api/entrance-exam/login', {
    method: 'POST',
    body: JSON.stringify({ tokenNumber: tokenNumber.trim().toUpperCase(), pin, channel: 'WEB' }),
  });
}

export async function fetchEntranceExam() {
  return examApi<{
    testTitle: string;
    durationMinutes: number;
    startedAt: string;
    deadlineAt: string;
    studentName: string;
    passMarksRequired: number;
    questions: ExamQuestion[];
    answers: Record<string, string>;
  }>('/api/entrance-exam/exam');
}

export async function fetchEntranceExamResult() {
  return examApi<{ result: ExamResult }>('/api/entrance-exam/result');
}

export async function saveEntranceExamAnswers(answers: Record<string, string>) {
  return examApi<{ answers: Record<string, string> }>('/api/entrance-exam/answers', {
    method: 'PATCH',
    body: JSON.stringify({ answers }),
  });
}

export async function submitEntranceExam(answers: Record<string, string>) {
  return examApi<ExamResult & { submitted: boolean }>('/api/entrance-exam/submit', {
    method: 'POST',
    body: JSON.stringify({ answers }),
  });
}
