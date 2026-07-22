import { api } from './api';

export type StudentReportSummary = {
  total: number;
  activeOpen: number;
  pending: number;
  thisMonth: number;
};

export type StudentReport = {
  id: string;
  recordId: string;
  reportType: string;
  reportTypeLabel: string;
  name: string;
  period: string;
  className: string;
  sectionName: string;
  classGroup: string;
  academicYear: string;
  status: string;
  statusLabel: string;
  config: unknown;
  data: Record<string, unknown>;
  generatedAt: string;
  updatedAt: string;
  createdAt: string;
};

export type ReportTypeOption = { value: string; label: string };

export const STUDENT_REPORT_STATUSES = [
  'DRAFT', 'PENDING', 'OPEN', 'ACTIVE', 'COMPLETED', 'APPROVED', 'PAID', 'DUE',
];

export async function fetchStudentReportsMeta() {
  return api<{
    summary: StudentReportSummary;
    reportTypes: ReportTypeOption[];
    defaultAcademicYear: string;
  }>('/api/student-reports/meta');
}

export async function seedStudentReports(academicYear?: string) {
  return api<{ created: number }>('/api/student-reports/seed', {
    method: 'POST',
    body: JSON.stringify({ academicYear }),
  });
}

export async function fetchStudentReports(params?: {
  q?: string;
  status?: string;
  reportType?: string;
  className?: string;
  sectionName?: string;
  academicYear?: string;
}) {
  const q = new URLSearchParams();
  if (params?.q) q.set('q', params.q);
  if (params?.status) q.set('status', params.status);
  if (params?.reportType) q.set('reportType', params.reportType);
  if (params?.className) q.set('className', params.className);
  if (params?.sectionName) q.set('sectionName', params.sectionName);
  if (params?.academicYear) q.set('academicYear', params.academicYear);
  const qs = q.toString();
  return api<{ reports: StudentReport[] }>(`/api/student-reports${qs ? `?${qs}` : ''}`);
}

export async function fetchStudentReport(id: string) {
  return api<{ report: StudentReport }>(`/api/student-reports/${id}`);
}

export async function generateStudentReport(payload: {
  reportType: string;
  academicYear?: string;
  className?: string;
  sectionName?: string;
  customName?: string;
}) {
  return api<{ report: StudentReport }>('/api/student-reports/generate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function refreshStudentReport(id: string) {
  return api<{ report: StudentReport }>(`/api/student-reports/${id}/refresh`, {
    method: 'POST',
  });
}
