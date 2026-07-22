import { api } from './api';

export type MeetingRecord = {
  id: string;
  recordId: string;
  studentId: string;
  className: string;
  sectionName: string;
  classGroup: string;
  studentName: string;
  fatherName: string;
  meetingTitle: string;
  venue: string;
  batchId: string;
  scheduledAt: string;
  conductedAt: string | null;
  discussionNotes: string;
  photoUrls: string[];
  attendees: string;
  status: string;
  statusLabel: string;
};

export type PtmNotificationSummary = {
  parentsPush: number;
  studentsPush: number;
  staffPush: number;
  total: number;
};

export async function fetchParentMeetingsMeta() {
  return api<{ summary: { total: number; scheduled: number; completed: number } }>('/api/parent-meetings/meta');
}

export async function fetchParentMeetings(params?: {
  className?: string;
  sectionName?: string;
  studentId?: string;
  batchId?: string;
  status?: string;
}) {
  const q = new URLSearchParams();
  if (params?.className) q.set('className', params.className);
  if (params?.sectionName) q.set('sectionName', params.sectionName);
  if (params?.studentId) q.set('studentId', params.studentId);
  if (params?.batchId) q.set('batchId', params.batchId);
  if (params?.status) q.set('status', params.status);
  const qs = q.toString();
  return api<{ records: MeetingRecord[] }>(`/api/parent-meetings${qs ? `?${qs}` : ''}`);
}

export async function createParentMeeting(payload: {
  studentId: string;
  scheduledAt: string;
  meetingTitle?: string;
  venue?: string;
  discussionNotes?: string;
  attendees?: string;
  status?: string;
  conductedAt?: string;
  notifyParents?: boolean;
  notifyStaff?: boolean;
  notifyStudents?: boolean;
}) {
  return api<{ record: MeetingRecord; notifications: PtmNotificationSummary }>(
    '/api/parent-meetings',
    { method: 'POST', body: JSON.stringify(payload) },
  );
}

export async function bulkScheduleParentMeetings(payload: {
  className: string;
  sectionName?: string;
  scheduledAt: string;
  meetingTitle?: string;
  venue?: string;
  discussionNotes?: string;
  notifyParents?: boolean;
  notifyStaff?: boolean;
  notifyStudents?: boolean;
}) {
  return api<{
    batchId: string;
    count: number;
    records: MeetingRecord[];
    notifications: PtmNotificationSummary;
  }>('/api/parent-meetings/bulk-schedule', { method: 'POST', body: JSON.stringify(payload) });
}

export async function uploadMeetingPhotos(id: string, photos: string[]) {
  return api<{ record: MeetingRecord }>(`/api/parent-meetings/${id}/photos`, { method: 'POST', body: JSON.stringify({ photos }) });
}
