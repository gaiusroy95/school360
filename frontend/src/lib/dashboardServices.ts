import { api } from './api';

export type DashboardKpi = {
  title: string;
  value: string;
  trend: string;
  trendType: 'up' | 'down' | 'neutral';
  highlight?: boolean;
  highlightVal?: boolean;
};

export type MainDashboardData = {
  institutionName: string;
  academicYear: string;
  academicYears: string[];
  generatedAt: string;
  kpis: DashboardKpi[];
  feesChart: {
    total: number;
    formattedTotal: string;
    items: { name: string; value: number; color: string; percentage: string }[];
  };
  attendanceTrend: { day: string; percentage: number }[];
  alerts: { id: string; icon: string; color: string; title: string; desc: string }[];
  admission: {
    academicYear: string;
    inquiries: number;
    applications: number;
    admitted: number;
    conversionRate: number;
  };
  topClasses: { name: string; score: number; color: string }[];
  staffAttendance: {
    total: number;
    present: number;
    absent: number;
    onLeave: number;
    chart: { name: string; value: number; color: string }[];
  };
};

export async function fetchDashboardMeta() {
  return api<{
    institutionName: string;
    defaultAcademicYear: string;
    academicYears: string[];
  }>('/api/dashboard/meta');
}

export async function fetchMainDashboard(academicYear?: string) {
  const qs = academicYear ? `?academicYear=${encodeURIComponent(academicYear)}` : '';
  return api<MainDashboardData>(`/api/dashboard${qs}`);
}
