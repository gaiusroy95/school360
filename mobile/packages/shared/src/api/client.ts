import type { AuthResponse, MobileUser } from '../types/auth';
import type {
  ConsentItem,
  DashboardResponse,
  FeesResponse,
  HomeworkResponse,
  LeaveApplication,
  LmsResponse,
  NotificationsResponse,
  ProfileResponse,
  ReminderPreferences,
  TestsResponse,
  TimetableResponse,
  MobileUpload,
} from '../types/api';

function resolveApiUrl(): string {
  const raw = (process.env.EXPO_PUBLIC_API_URL || '').trim().replace(/\/+$/, '');
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  return 'http://localhost:4000';
}

export const API_URL = resolveApiUrl();

let memoryToken: string | null = null;

export function getToken(): string | null {
  return memoryToken;
}

export function setToken(token: string | null) {
  memoryToken = token;
}

function qs(params: Record<string, string | undefined | boolean>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const url = `${API_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message =
      (data as { error?: string }).error || res.statusText || 'Request failed';
    throw new Error(typeof message === 'string' ? message : JSON.stringify(message));
  }
  return data as T;
}

export function uploadFileUrl(uploadPath: string) {
  if (uploadPath.startsWith('http')) return uploadPath;
  return `${API_URL}${uploadPath.startsWith('/') ? uploadPath : `/${uploadPath}`}`;
}

export type MobileAuthModes = {
  otpEnabled: boolean;
  otpRequired: boolean;
  passwordAllowed: boolean;
};

export const mobileAuth = {
  modes: () => api<MobileAuthModes>('/api/mobile/auth/modes'),

  login: (body: Record<string, unknown>) =>
    api<AuthResponse>('/api/mobile/auth/login', { method: 'POST', body: JSON.stringify(body) }),

  requestOtp: (body: Record<string, unknown>) =>
    api<{ ok: boolean; expiresInSeconds: number; devOtp?: string }>('/api/mobile/auth/request-otp', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  verifyOtp: (body: Record<string, unknown>) =>
    api<AuthResponse>('/api/mobile/auth/verify-otp', { method: 'POST', body: JSON.stringify(body) }),

  me: () => api<{ user: MobileUser }>('/api/mobile/auth/me'),
  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    api<AuthResponse>('/api/mobile/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};

export const mobileApp = {
  dashboard: (params?: { studentId?: string; date?: string; academicYear?: string }) =>
    api<DashboardResponse>(`/api/mobile/dashboard${qs(params || {})}`),

  homework: (params?: { studentId?: string; date?: string; academicYear?: string }) =>
    api<HomeworkResponse>(`/api/mobile/homework${qs(params || {})}`),

  timetable: (params?: { studentId?: string; date?: string; academicYear?: string }) =>
    api<TimetableResponse>(`/api/mobile/timetable${qs(params || {})}`),

  tests: (params?: { studentId?: string; academicYear?: string }) =>
    api<TestsResponse>(`/api/mobile/tests${qs(params || {})}`),

  lms: (params?: { studentId?: string; academicYear?: string; subjectName?: string }) =>
    api<LmsResponse>(`/api/mobile/lms${qs(params || {})}`),

  profile: (params?: { studentId?: string }) =>
    api<ProfileResponse>(`/api/mobile/profile${qs(params || {})}`),

  fees: (params?: { studentId?: string; academicYear?: string }) =>
    api<FeesResponse>(`/api/mobile/fees${qs(params || {})}`),

  createPaymentOrder: (feeDueId: string) =>
    api<Record<string, unknown>>(`/api/mobile/fees/${feeDueId}/pay`, { method: 'POST' }),

  verifyPayment: (body: {
    orderId: string;
    razorpayPaymentId: string;
    razorpayOrderId: string;
    razorpaySignature: string;
  }) =>
    api<{ ok: boolean }>('/api/mobile/fees/verify-payment', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  consents: (params?: { studentId?: string }) =>
    api<{ studentId: string; consents: ConsentItem[] }>(`/api/mobile/consents${qs(params || {})}`),

  respondConsent: (responseId: string, body: { status: 'APPROVED' | 'REJECTED'; remarks?: string }) =>
    api<{ consent: ConsentItem }>(`/api/mobile/consents/${responseId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  leave: (params?: { studentId?: string }) =>
    api<{ studentId: string; applications: LeaveApplication[] }>(`/api/mobile/leave${qs(params || {})}`),

  submitLeave: (body: {
    studentId?: string;
    leaveType: string;
    fromDate: string;
    toDate: string;
    reason: string;
    attachmentUrl?: string;
    academicYear?: string;
  }) =>
    api<{ application: LeaveApplication }>('/api/mobile/leave', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  reminders: () => api<ReminderPreferences>('/api/mobile/reminders'),

  updateReminders: (preferences: Record<string, unknown>) =>
    api<ReminderPreferences>('/api/mobile/reminders', {
      method: 'PUT',
      body: JSON.stringify({ preferences }),
    }),

  notifications: (unreadOnly?: boolean) =>
    api<NotificationsResponse>(`/api/mobile/notifications${qs({ unreadOnly: unreadOnly ? '1' : undefined })}`),

  markNotificationRead: (id: string) =>
    api<{ ok: boolean }>(`/api/mobile/notifications/${id}/read`, { method: 'PATCH' }),

  markAllNotificationsRead: () =>
    api<{ updated: number }>('/api/mobile/notifications/read-all', { method: 'POST' }),

  upload: (body: {
    fileName: string;
    mimeType: string;
    dataBase64: string;
    studentId?: string;
  }) =>
    api<{ upload: MobileUpload }>('/api/mobile/uploads', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  registerDevice: (body: {
    fcmToken: string;
    platform?: 'IOS' | 'ANDROID' | 'WEB' | 'OTHER';
    deviceName?: string;
    appVersion?: string;
  }) =>
    api<{ device: { id: string } }>('/api/mobile/devices/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};
