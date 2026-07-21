import { api } from './api';

export type AdmissionRecord = {
  id: string;
  admissionNumber: string | null;
  className: string;
  sectionName: string;
  academicYear: string;
  status: string;
  statusKey: string;
  principalApprovedBy: string;
  principalApprovedAt: string;
  confirmedAt: string;
  confirmedBy: string;
  notes: string;
  applicationDbId: string;
  applicationId: string;
  studentName: string;
  classApplied: string;
  fatherName: string;
  motherName: string;
  mobile: string;
  email: string;
  entranceTestScore: number | null;
  approvalRemarks: string;
  seatMeritRank: number | null;
  seatClassRank: number | null;
  seatStatus: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdmissionsMeta = {
  defaultAcademicYear: string;
  academicYears: string[];
  classes: string[];
  summary: {
    principalApproved: number;
    pendingConfirmation: number;
    confirmedAdmissions: number;
  };
};

export async function fetchAdmissionsMeta() {
  return api<AdmissionsMeta>('/api/admissions/meta');
}

export async function fetchAdmissions(params?: {
  academicYear?: string;
  status?: string;
  className?: string;
  q?: string;
}) {
  const q = new URLSearchParams();
  if (params?.academicYear) q.set('academicYear', params.academicYear);
  if (params?.status && params.status !== 'all') q.set('status', params.status);
  if (params?.className) q.set('className', params.className);
  if (params?.q) q.set('q', params.q);
  const qs = q.toString();
  return api<{
    academicYear: string;
    summary: { total: number; pending: number; confirmed: number };
    admissions: AdmissionRecord[];
  }>(`/api/admissions${qs ? `?${qs}` : ''}`);
}

export async function fetchAdmission(id: string) {
  return api<{ admission: AdmissionRecord }>(`/api/admissions/${id}`);
}

export async function confirmAdmission(
  id: string,
  payload?: { notes?: string; className?: string; sectionName?: string },
) {
  return api<{ admission: AdmissionRecord; message: string }>(`/api/admissions/${id}/confirm`, {
    method: 'POST',
    body: JSON.stringify(payload || {}),
  });
}

export async function confirmAdmissionsBulk(academicYear: string, onlyWithSeats = true) {
  return api<{
    confirmed: number;
    admissionNumbers: string[];
    message: string;
  }>('/api/admissions/confirm-bulk', {
    method: 'POST',
    body: JSON.stringify({ academicYear, onlyWithSeats }),
  });
}

export async function syncAdmissionRecords() {
  return api<{ created: number; message: string }>('/api/admissions/sync', {
    method: 'POST',
  });
}
