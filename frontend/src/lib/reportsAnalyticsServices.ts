import { api } from './api';

function qs(params?: Record<string, string | undefined>) {
  if (!params) return '';
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== '') sp.set(k, v);
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export type RaKpi = {
  title: string;
  value: string;
  subtitle: string;
  subtitleColor: string;
  iconType: string;
  color: string;
  bg: string;
  sparkColor: string;
};

export type RaDashboard = {
  academicYear: string;
  period: string;
  periods: string[];
  academicYears: string[];
  refreshedAt: string;
  kpis: RaKpi[];
  attendanceTrend: { day: string; attendance: number }[];
  attendanceSummary: {
    present: number;
    absent: number;
    onLeave: number;
    late: number;
    presentPct: number;
    absentPct: number;
    leavePct: number;
    latePct: number;
  };
  examPerformance: { name: string; value: number; percent: string; color: string }[];
  examPassPct: number;
  totalExamStudents: number;
  feeTrend: { month: string; collection: number }[];
  feeSummary: {
    totalCollected: string;
    totalDue: string;
    collectionPct: number;
    rawCollected: number;
    rawDue: number;
  };
  studentStrength: { name: string; value: number; percent: string; color: string }[];
  academicPerformance: { class: string; total: number; avg: number; highest: number; lowest: number; pass: number }[];
  topPerformers: { name: string; class: string; percent: string; rank: number }[];
  alerts: { text: string; count: string; iconType: string; color: string; bg: string }[];
  quickReports: { label: string; category: string; reportCount: number }[];
  categories: { label: string; key: string; reportCount: number }[];
  recentRuns: { id: string; category: string; reportName: string; sourceModule: string; rowCount: number; time: string }[];
  dataInsights: { text: string; iconType: string; bg: string }[];
  analyticsTools: { title: string; desc: string; iconType: string; bg: string }[];
  moduleMap: { label: string; key: string; reportCount: number }[];
};

export type RaReportItem = {
  key: string;
  name: string;
  description: string;
  sourceModule: string;
  sourceTab?: string;
  locked?: boolean;
};

export type RaReportGroup = {
  id: string;
  label: string;
  reports: RaReportItem[];
};

export type RaCategoryMeta = {
  category: string;
  academicYear: string;
  academicYears: string[];
  classes: string[];
  sections: string[];
  catalog: RaReportGroup[];
  reportCount: number;
  totalRuns: number;
  recentRuns: {
    id: string;
    reportKey: string;
    reportName: string;
    sourceModule: string;
    rowCount: number;
    performedBy: string;
    time: string;
    createdAt: string;
  }[];
  defaultFilters: {
    dateFrom: string;
    dateTo: string;
    academicYear: string;
  };
};

export type RaReportPreview = {
  category: string;
  sourceModule: string;
  sourceTab: string;
  generatedAt: string;
  reportKey: string;
  reportName: string;
  columns: string[];
  rows: Record<string, unknown>[];
  summary: Record<string, unknown>;
  rowCount: number;
};

export type RaCustomReport = {
  id: string;
  name: string;
  description: string;
  modules: unknown;
  columns: unknown;
  filters: unknown;
  status: string;
  createdBy: string;
  academicYear: string;
  lastRunAt: string | null;
  updatedAt: string;
};

export type RaCategoryKey =
  | 'student'
  | 'academic'
  | 'attendance'
  | 'examination'
  | 'finance'
  | 'hr'
  | 'library'
  | 'transport'
  | 'hostel'
  | 'inventory'
  | 'custom';

export const VIEW_TO_CATEGORY: Record<string, RaCategoryKey | null> = {
  'Reports Dashboard': null,
  'Student Reports': 'student',
  'Academic Reports': 'academic',
  'Attendance Reports': 'attendance',
  'Examination Reports': 'examination',
  'Finance Reports': 'finance',
  'HR Reports': 'hr',
  'Library Reports': 'library',
  'Transport Reports': 'transport',
  'Hostel Reports': 'hostel',
  'Inventory Reports': 'inventory',
  'Custom Reports': 'custom',
};

export async function fetchReportsDashboard(
  academicYear?: string,
  period?: string,
  seed = false,
) {
  return api<RaDashboard>(
    `/api/reports-analytics/dashboard${qs({ academicYear, period, seed: seed ? '1' : undefined })}`,
  );
}

export async function fetchCategoryMeta(category: RaCategoryKey, academicYear?: string) {
  return api<RaCategoryMeta>(`/api/reports-analytics/categories/${category}${qs({ academicYear })}`);
}

export async function generateCategoryReport(
  category: RaCategoryKey,
  reportKey: string,
  filters: Record<string, string | undefined> = {},
) {
  return api<RaReportPreview>(`/api/reports-analytics/categories/${category}/generate`, {
    method: 'POST',
    body: JSON.stringify({ reportKey, ...filters }),
  });
}

export async function exportCategoryReport(
  category: RaCategoryKey,
  reportKey: string,
  format: string,
  filters: Record<string, string | undefined> = {},
) {
  return api<{ content: string; fileName: string; mimeType: string }>(
    `/api/reports-analytics/categories/${category}/export`,
    { method: 'POST', body: JSON.stringify({ reportKey, format, ...filters }) },
  );
}

export async function fetchCustomReports() {
  return api<{ reports: RaCustomReport[] }>('/api/reports-analytics/custom');
}

export async function createCustomReport(body: {
  name: string;
  description?: string;
  modules?: string[];
  columns?: string[];
  academicYear?: string;
}) {
  return api<{ report: RaCustomReport }>('/api/reports-analytics/custom', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function deleteCustomReport(id: string) {
  return api<{ deleted: boolean }>(`/api/reports-analytics/custom/${id}`, { method: 'DELETE' });
}

export async function seedReportsAnalytics(academicYear?: string) {
  return api<{ seeded: boolean; message?: string }>('/api/reports-analytics/seed', {
    method: 'POST',
    body: JSON.stringify({ academicYear }),
  });
}
