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
  scheduledAt: string;
  conductedAt: string | null;
  discussionNotes: string;
  photoUrls: string[];
  attendees: string;
  status: string;
  statusLabel: string;
};

export async function fetchParentMeetingsMeta() {
  return api<{ summary: { total: number; scheduled: number; completed: number } }>('/api/parent-meetings/meta');
}

export async function fetchParentMeetings(params?: { className?: string; sectionName?: string; studentId?: string; status?: string }) {
  const q = new URLSearchParams();
  if (params?.className) q.set('className', params.className);
  if (params?.sectionName) q.set('sectionName', params.sectionName);
  if (params?.studentId) q.set('studentId', params.studentId);
  if (params?.status) q.set('status', params.status);
  const qs = q.toString();
  return api<{ records: MeetingRecord[] }>(`/api/parent-meetings${qs ? `?${qs}` : ''}`);
}

export async function createParentMeeting(payload: {
  studentId: string;
  scheduledAt: string;
  discussionNotes?: string;
  attendees?: string;
  status?: string;
  conductedAt?: string;
}) {
  return api<{ record: MeetingRecord }>('/api/parent-meetings', { method: 'POST', body: JSON.stringify(payload) });
}

export async function uploadMeetingPhotos(id: string, photos: string[]) {
  return api<{ record: MeetingRecord }>(`/api/parent-meetings/${id}/photos`, { method: 'POST', body: JSON.stringify({ photos }) });
}
