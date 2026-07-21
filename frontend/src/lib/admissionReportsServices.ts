import { api } from './api';

export type ReportSheetKey =
  | 'summary'
  | 'consolidatedNewAdmissions'
  | 'enquiries'
  | 'applications'
  | 'followUps'
  | 'counselling'
  | 'meritList'
  | 'seatAllocation'
  | 'admissions'
  | 'feeCollection';

export type AdmissionReportSummary = {
  institutionName: string;
  academicYear: string;
  dateFrom: string;
  dateTo: string;
  generatedAt: string;
  enquiries: number;
  applications: number;
  followUps: number;
  counsellingSessions: number;
  meritEntries: number;
  seatAllocations: number;
  admissionsTotal: number;
  admissionsConfirmed: number;
  feeReceipts: number;
  totalFeeCollected: number;
  currency: string;
};

export type AdmissionReportData = {
  summary: AdmissionReportSummary;
  sheets: Record<ReportSheetKey, Record<string, unknown>[]>;
};

export async function fetchAdmissionReportsMeta() {
  return api<{
    defaultAcademicYear: string;
    academicYears: string[];
    reportSheets: Array<{ key: ReportSheetKey; label: string }>;
  }>('/api/admission-reports/meta');
}

export async function fetchAdmissionReports(params?: {
  academicYear?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const q = new URLSearchParams();
  if (params?.academicYear) q.set('academicYear', params.academicYear);
  if (params?.dateFrom) q.set('dateFrom', params.dateFrom);
  if (params?.dateTo) q.set('dateTo', params.dateTo);
  const qs = q.toString();
  return api<AdmissionReportData>(`/api/admission-reports${qs ? `?${qs}` : ''}`);
}
