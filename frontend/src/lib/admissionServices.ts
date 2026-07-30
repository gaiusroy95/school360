import { api } from './api';

export type EnquiryStatus = 'New' | 'In Process' | 'Follow Up' | 'Converted' | 'Not Interested';

export interface Enquiry {
  id?: string;
  enquiryId: string;
  enquiryDate: string;
  enquirerName: string;
  mobile: string;
  email: string;
  classInterested: string;
  source: string;
  status: EnquiryStatus;
  assignedTo: string;
  nextFollowUp: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Activity {
  id?: string;
  enquiryId: string;
  enquiryName?: string;
  type: 'System' | 'Call' | 'Email' | 'Status Change' | 'Visit';
  description: string;
  timestamp: string;
  performedBy: string;
}

export type FollowUpMode =
  | 'Phone'
  | 'Email'
  | 'Video Call'
  | 'Google Meet'
  | 'Campus Visit'
  | 'In-person Counselling';

export interface FollowUpTask {
  id?: string;
  enquiryId: string;
  enquiryDbId?: string;
  enquiryName?: string;
  title: string;
  mode?: FollowUpMode | string;
  modeKey?: string;
  subject?: string;
  discussionNotes?: string;
  assignedTo: string;
  dueDate: string;
  dueTime?: string;
  scheduledAt?: string;
  status: 'Pending' | 'Completed' | string;
  meetingLink?: string;
  calendarEventId?: string;
  calendarSyncStatus?: string;
  syncGoogleCalendar?: boolean;
  notifyEmail?: boolean;
  notifyWhatsApp?: boolean;
  notificationLog?: {
    email?: { sent: boolean; at?: string; error?: string };
    whatsapp?: { sent: boolean; at?: string; error?: string };
    calendar?: { synced: boolean; at?: string; error?: string; stub?: boolean };
  };
  createdAt?: string;
  updatedAt?: string;
}

export type FollowUpTaskMeta = {
  modes: FollowUpMode[];
  modeKeys: string[];
  enquiries: Array<{
    id: string;
    enquiryId: string;
    enquirerName: string;
    assignedTo: string;
    classInterested: string;
    email?: string;
    mobile?: string;
  }>;
  counselors: string[];
};

export type EnquiryInput = {
  enquirerName: string;
  mobile: string;
  email?: string;
  classInterested?: string;
  source?: string;
  status?: EnquiryStatus | string;
  assignedTo?: string;
  nextFollowUp?: string;
  notes?: string;
  enquiryDate?: string;
  enquiryId?: string;
};

export type EnquiryAnalytics = {
  kpis: {
    total: number;
    new: number;
    inProcess: number;
    followUp: number;
    converted: number;
    notInterested: number;
    conversionRate: number;
  };
  overview: { date: string; value: number }[];
  bySource: { name: string; value: number }[];
  byClass: { name: string; value: number }[];
  funnel: { name: string; value: number }[];
  topSources: { name: string; val: number; pct: number }[];
  conversionTrend: { date: string; enquiries: number; applications: number; admissions: number }[];
};

export type EnquiryMeta = {
  classes: string[];
  sources: string[];
  statuses: string[];
  counselors?: string[];
  classesFromSetup?: boolean;
};

export async function fetchEnquiries(params?: {
  status?: string;
  source?: string;
  classInterested?: string;
  q?: string;
}) {
  const q = new URLSearchParams();
  if (params?.status) q.set('status', params.status);
  if (params?.source) q.set('source', params.source);
  if (params?.classInterested) q.set('classInterested', params.classInterested);
  if (params?.q) q.set('q', params.q);
  const qs = q.toString();
  return api<{ enquiries: Enquiry[] }>(`/api/enquiries${qs ? `?${qs}` : ''}`);
}

export async function fetchEnquiryMeta() {
  return api<EnquiryMeta>('/api/enquiries/meta');
}

export async function fetchEnquiryAnalytics() {
  return api<EnquiryAnalytics>('/api/enquiries/analytics');
}

export async function fetchEnquiryActivities(limit = 50) {
  return api<{ activities: Activity[] }>(`/api/enquiries/activities?limit=${limit}`);
}

export async function fetchFollowUpTasks(status?: string, mode?: string) {
  const q = new URLSearchParams();
  if (status) q.set('status', status);
  if (mode) q.set('mode', mode);
  const qs = q.toString();
  return api<{ tasks: FollowUpTask[] }>(`/api/enquiries/tasks${qs ? `?${qs}` : ''}`);
}

export async function fetchFollowUpTaskMeta() {
  return api<FollowUpTaskMeta>('/api/enquiries/tasks/meta');
}

export async function updateFollowUpTask(
  taskId: string,
  payload: Partial<{
    title: string;
    mode: string;
    subject: string;
    discussionNotes: string | null;
    dueDate: string;
    dueTime: string | null;
    assignedTo: string;
    status: 'Pending' | 'Completed';
    syncGoogleCalendar: boolean;
    notifyEmail: boolean;
    notifyWhatsApp: boolean;
  }>,
) {
  return api<{ task: FollowUpTask }>(`/api/enquiries/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function addEnquiry(enquiryData: Partial<Enquiry> | EnquiryInput) {
  return api<{ enquiry: Enquiry }>('/api/enquiries', {
    method: 'POST',
    body: JSON.stringify(enquiryData),
  });
}

export async function updateEnquiry(id: string, enquiryData: Partial<EnquiryInput>) {
  return api<{ enquiry: Enquiry }>(`/api/enquiries/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(enquiryData),
  });
}

export async function updateEnquiryStatus(
  id: string,
  newStatus: EnquiryStatus,
  nextFollowUp?: string,
  userId?: string,
) {
  return api<{ enquiry: Enquiry }>(`/api/enquiries/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({
      status: newStatus,
      nextFollowUp,
      performedBy: userId,
    }),
  });
}

export async function deleteEnquiry(id: string) {
  return api<{ ok: boolean }>(`/api/enquiries/${id}`, { method: 'DELETE' });
}

export async function logActivity(
  enquiryDbId: string,
  activityData: { type?: string; description: string; performedBy?: string },
) {
  return api<{ activity: Activity }>(`/api/enquiries/${enquiryDbId}/activities`, {
    method: 'POST',
    body: JSON.stringify(activityData),
  });
}

export async function addFollowUpTask(
  enquiryDbId: string,
  taskData: {
    title?: string;
    dueDate: string;
    dueTime?: string;
    mode?: string;
    subject?: string;
    discussionNotes?: string;
    assignedTo?: string;
    syncGoogleCalendar?: boolean;
    notifyEmail?: boolean;
    notifyWhatsApp?: boolean;
  },
) {
  return api<{ task: FollowUpTask }>(`/api/enquiries/${enquiryDbId}/tasks`, {
    method: 'POST',
    body: JSON.stringify(taskData),
  });
}

export async function syncFollowUpCalendar(taskId: string) {
  return api<{ task: FollowUpTask; sync: Record<string, unknown> }>(
    `/api/enquiries/tasks/${taskId}/sync-calendar`,
    { method: 'POST' },
  );
}

export async function importEnquiries(rows: EnquiryInput[], replaceAll = false) {
  return api<{ message: string; created: number; skipped: number; enquiries: Enquiry[] }>(
    '/api/enquiries/import',
    {
      method: 'POST',
      body: JSON.stringify({ rows, replaceAll }),
    },
  );
}

/** Compatibility wrappers used by older UI subscriptions */
export const subscribeToEnquiries = (callback: (data: Enquiry[]) => void) => {
  let cancelled = false;
  void fetchEnquiries()
    .then((res) => {
      if (!cancelled) callback(res.enquiries);
    })
    .catch(() => {
      if (!cancelled) callback([]);
    });
  return () => {
    cancelled = true;
  };
};

export const subscribeToAllActivities = (callback: (data: Activity[]) => void) => {
  let cancelled = false;
  void fetchEnquiryActivities()
    .then((res) => {
      if (!cancelled) callback(res.activities);
    })
    .catch(() => {
      if (!cancelled) callback([]);
    });
  return () => {
    cancelled = true;
  };
};

export const subscribeToAllTasks = (callback: (data: FollowUpTask[]) => void) => {
  let cancelled = false;
  void fetchFollowUpTasks()
    .then((res) => {
      if (!cancelled) callback(res.tasks);
    })
    .catch(() => {
      if (!cancelled) callback([]);
    });
  return () => {
    cancelled = true;
  };
};
