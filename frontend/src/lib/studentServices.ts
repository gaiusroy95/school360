import { api } from './api';

export type Student = {
  id: string;
  admissionNumber: string;
  rollNumber: string;
  rfidTag: string;
  firstName: string;
  lastName: string;
  fullName: string;
  name: string;
  dateOfBirth: string;
  dob: string;
  age: number | null;
  gender: string;
  genderKey: string;
  bloodGroup: string;
  aadhaarNumber: string;
  religion: string;
  nationality: string;
  category: string;
  placeOfBirth: string;
  address: string;
  mobile: string;
  email: string;
  photoUrl: string;
  className: string;
  sectionName: string;
  classSection: string;
  class: string;
  academicYear: string;
  house: string;
  fatherName: string;
  fatherMobile: string;
  motherName: string;
  motherMobile: string;
  father: string;
  mother: string;
  status: string;
  statusKey: string;
  enrolledAt: string;
  leftAt: string;
  leftReason: string;
  documents: Record<string, unknown>;
  customFields: Record<string, unknown>;
  entranceScore: number | null;
  admissionRecordId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type StudentFilters = {
  academicYears: string[];
  classes: string[];
  sectionsByClass: Record<string, string[]>;
  houses: string[];
  categories: string[];
  genders: string[];
  statuses: string[];
  defaultAcademicYear: string;
};

export type StudentSummary = {
  total: number;
  active: number;
  inactive: number;
  passout: number;
  transferred: number;
  male: number;
  female: number;
  newAdmissions: number;
  averageAttendance: number;
};

export type StudentAnalytics = {
  summary: StudentSummary;
  classStats: { name: string; value: number; percent: string; color: string }[];
  genderStats: { name: string; value: number; percent: string; color: string }[];
  documents: { name: string; uploaded: number; total: number }[];
  topPerformers: { rank: number; name: string; class: string; percentage: string; score: number | null }[];
  attendance: { average: number; present: number; absent: number; onLeave: number };
};

export type StudentInput = {
  firstName: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: string;
  bloodGroup?: string;
  aadhaarNumber?: string;
  religion?: string;
  nationality?: string;
  category?: string;
  placeOfBirth?: string;
  address?: string;
  mobile?: string;
  email?: string;
  className: string;
  sectionName?: string;
  academicYear?: string;
  house?: string;
  rollNumber?: string;
  rfidTag?: string;
  fatherName?: string;
  fatherMobile?: string;
  motherName?: string;
  motherMobile?: string;
  status?: string;
  admissionNumber?: string;
  entranceScore?: number;
  documents?: Record<string, unknown>;
  customFields?: Record<string, unknown>;
};

export const STUDENT_PROFILE_ID_KEY = 'studentManagement.profileStudentId';

export async function fetchStudentsMeta() {
  return api<{ filters: StudentFilters; summary: StudentSummary }>('/api/students/meta');
}

export async function fetchStudents(params?: {
  academicYear?: string;
  className?: string;
  sectionName?: string;
  house?: string;
  gender?: string;
  status?: string;
  category?: string;
  q?: string;
  page?: number;
  pageSize?: number;
  viewAll?: boolean;
}) {
  const q = new URLSearchParams();
  if (params?.academicYear) q.set('academicYear', params.academicYear);
  if (params?.className) q.set('className', params.className);
  if (params?.sectionName) q.set('sectionName', params.sectionName);
  if (params?.house) q.set('house', params.house);
  if (params?.gender && params.gender !== 'All') q.set('gender', params.gender);
  if (params?.status && params.status !== 'All') q.set('status', params.status);
  if (params?.category && params.category !== 'All Categories') q.set('category', params.category);
  if (params?.q) q.set('q', params.q);
  if (params?.page) q.set('page', String(params.page));
  if (params?.pageSize) q.set('pageSize', String(params.pageSize));
  if (params?.viewAll) q.set('viewAll', 'true');
  const qs = q.toString();
  return api<{
    students: Student[];
    pagination: { page: number; pageSize: number; total: number; totalPages: number };
    tabCounts: { all: number; active: number; inactive: number; passout: number; transferred: number };
    institutionTotal: number;
  }>(`/api/students${qs ? `?${qs}` : ''}`);
}

export async function fetchStudentAnalytics(academicYear?: string) {
  const q = academicYear ? `?academicYear=${encodeURIComponent(academicYear)}` : '';
  return api<StudentAnalytics>(`/api/students/analytics${q}`);
}

export type StudentProfileMeta = {
  feeDueAmount: number;
  feePaidTotal: number;
  attendanceToday: string;
  idCardTemplate: string;
  admissionForm: Record<string, unknown>;
};

export async function fetchStudent(id: string) {
  return api<{
    student: Student;
    activities: { title: string; time: string; type: string }[];
    alerts: { icon: string; title: string; desc: string; time: string; color: string }[];
    profile: StudentProfileMeta;
  }>(`/api/students/${id}`);
}

export async function createStudent(payload: StudentInput) {
  return api<{ student: Student }>('/api/students', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateStudent(id: string, payload: Partial<StudentInput>) {
  return api<{ student: Student }>(`/api/students/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function importStudents(rows: Record<string, unknown>[], options?: {
  academicYear?: string;
  updateExisting?: boolean;
}) {
  return api<{
    created: number;
    updated: number;
    errors: { row: number; message: string }[];
    total: number;
  }>('/api/students/import', {
    method: 'POST',
    body: JSON.stringify({
      rows,
      academicYear: options?.academicYear,
      updateExisting: options?.updateExisting ?? false,
    }),
  });
}

export async function syncStudentsFromAdmissions() {
  return api<{ created: number; message: string }>('/api/students/sync-from-admissions', {
    method: 'POST',
  });
}

export async function exportStudentsData(params?: {
  academicYear?: string;
  className?: string;
  sectionName?: string;
  status?: string;
}) {
  const q = new URLSearchParams();
  if (params?.academicYear) q.set('academicYear', params.academicYear);
  if (params?.className) q.set('className', params.className);
  if (params?.sectionName) q.set('sectionName', params.sectionName);
  if (params?.status) q.set('status', params.status);
  const qs = q.toString();
  return api<{ students: Student[] }>(`/api/students/export/data${qs ? `?${qs}` : ''}`);
}

export function setProfileStudentId(id: string) {
  sessionStorage.setItem(STUDENT_PROFILE_ID_KEY, id);
}

export function getProfileStudentId(): string | null {
  return sessionStorage.getItem(STUDENT_PROFILE_ID_KEY);
}
