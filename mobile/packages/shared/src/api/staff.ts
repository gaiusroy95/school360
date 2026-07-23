import { api, mobileAuth, mobileApp, uploadFileUrl } from './client';
import type {
  AttendanceRosterStudent,
  StaffDashboard,
  StaffEvaluation,
  StaffLeaveItem,
  StaffTask,
  TransportVehicle,
} from '../types/staff';
import type { NotificationsResponse } from '../types/api';

function qs(params: Record<string, string | undefined>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) q.set(k, v);
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}

export const mobileStaff = {
  login: (body: { employeeCode: string; registeredMobile: string; password: string }) =>
    mobileAuth.login({ ...body, app: 'staff' }),

  dashboard: () => api<StaffDashboard>('/api/mobile/staff/dashboard'),

  attendanceMeta: () => api<{ classGroups: { className: string; sectionName: string; label: string }[] }>(
    '/api/mobile/staff/attendance/meta',
  ),

  attendanceRoster: (params: { className: string; sectionName?: string; date?: string }) =>
    api<{ students: AttendanceRosterStudent[]; session: { id: string } | null }>(
      `/api/mobile/staff/attendance/roster${qs(params)}`,
    ),

  markAttendance: (body: {
    className: string;
    sectionName?: string;
    sessionDate?: string;
    records: { studentId: string; status: string; absentReason?: string }[];
  }) =>
    api<{ sessionId: string; marked: number }>('/api/mobile/staff/attendance/mark', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  createHomework: (body: Record<string, unknown>) =>
    api<{ record: Record<string, unknown> }>('/api/mobile/staff/homework', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  tasks: (status?: string) =>
    api<{ tasks: StaffTask[]; pending: number; overdue: number }>(
      `/api/mobile/staff/tasks${qs({ status })}`,
    ),

  updateTask: (id: string, body: Record<string, unknown>) =>
    api<{ task: StaffTask }>(`/api/mobile/staff/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  schedule: (date?: string) =>
    api<Record<string, unknown>>(`/api/mobile/staff/schedule${qs({ date })}`),

  leave: () => api<{ items: StaffLeaveItem[] }>('/api/mobile/staff/leave'),

  submitLeave: (body: { leaveType: string; fromDate: string; toDate: string; reason: string }) =>
    api<{ application: StaffLeaveItem }>('/api/mobile/staff/leave', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  selfAttendance: (body?: { latitude?: number; longitude?: number; remarks?: string }) =>
    api<{ ok: boolean; status: string }>('/api/mobile/staff/self-attendance', {
      method: 'POST',
      body: JSON.stringify(body ?? {}),
    }),

  evaluations: () => api<{ records: StaffEvaluation[]; total: number }>('/api/mobile/staff/evaluations'),

  updateEvaluation: (id: string, body: Record<string, unknown>) =>
    api<{ record: StaffEvaluation }>(`/api/mobile/staff/evaluations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  coScholastic: () => api<Record<string, unknown>>('/api/mobile/staff/co-scholastic'),

  marksEntry: () => api<Record<string, unknown>>('/api/mobile/staff/marks-entry'),

  saveMarksDraft: (sheetId: string, entries: Record<string, unknown>[]) =>
    api<Record<string, unknown>>(`/api/mobile/staff/marks-entry/sheets/${sheetId}/draft`, {
      method: 'POST',
      body: JSON.stringify({ entries }),
    }),

  papers: () => api<{ papers: Record<string, unknown>[] }>('/api/mobile/staff/papers'),

  publishPaper: (paperId: string) =>
    api<Record<string, unknown>>(`/api/mobile/staff/papers/${paperId}/publish`, { method: 'POST' }),

  pendingLeaveApprovals: () =>
    api<{ items: StaffLeaveItem[]; summary: Record<string, number> }>('/api/mobile/staff/approvals/leave'),

  approveLeave: (id: string, body: { category: string; remarks?: string }) =>
    api<Record<string, unknown>>(`/api/mobile/staff/approvals/leave/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  rejectLeave: (id: string, body: { category: string; remarks?: string }) =>
    api<Record<string, unknown>>(`/api/mobile/staff/approvals/leave/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  transportVehicles: () => api<{ vehicles: TransportVehicle[] }>('/api/mobile/transport/vehicles'),

  transportLocation: (body: {
    vehicleId: string;
    latitude: number;
    longitude: number;
    speedKmh?: number;
    heading?: number;
  }) =>
    api<Record<string, unknown>>('/api/mobile/transport/location', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  transportEmergency: (body: {
    vehicleId: string;
    description?: string;
    latitude?: number;
    longitude?: number;
  }) =>
    api<Record<string, unknown>>('/api/mobile/transport/emergency', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  notifications: (unreadOnly?: boolean) => mobileApp.notifications(unreadOnly),

  markNotificationRead: (id: string) => mobileApp.markNotificationRead(id),

  markAllNotificationsRead: () => mobileApp.markAllNotificationsRead(),

  upload: (body: {
    fileName: string;
    mimeType: string;
    dataBase64: string;
  }) => mobileApp.upload(body),
};

export { mobileAuth, mobileApp, uploadFileUrl };
