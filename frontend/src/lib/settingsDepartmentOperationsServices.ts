import { api } from './api';

export type DepartmentOpsOverview = {
  stats: {
    departments: number;
    heads: number;
    staff: number;
    locations: number;
    budgets: number;
    importantDates: number;
    holidays: number;
    academicCalendar: number;
    eventCalendar: number;
    examSchedules: number;
    customEvents: number;
    comprehensiveEvents: number;
  };
  departments: Array<Record<string, unknown>>;
  heads: Array<Record<string, unknown>>;
  staff: Array<Record<string, unknown>>;
  locations: Array<Record<string, unknown>>;
  budgets: Array<Record<string, unknown>>;
  importantDates: Array<Record<string, unknown>>;
  holidays: Array<Record<string, unknown>>;
  academicCalendar: Array<Record<string, unknown>>;
  eventCalendar: Array<Record<string, unknown>>;
  examSchedules: Array<Record<string, unknown>>;
  customEvents: Array<Record<string, unknown>>;
  comprehensiveCalendar: Array<{
    id: string;
    title: string;
    category: string;
    date: string;
    endDate?: string;
    description?: string;
    fromHolidayMaster?: boolean;
  }>;
};

export async function fetchDepartmentOpsOverview() {
  return api<DepartmentOpsOverview>(`/api/settings/department-operations/overview`);
}

export async function syncDepartmentOps() {
  return api<{ message: string; synced?: boolean }>(`/api/settings/department-operations/sync`, { method: 'POST' });
}

export function holidayCalendarExportUrl(audience = 'ALL') {
  return `/api/settings/department-operations/holiday-calendar/export?audience=${encodeURIComponent(audience)}`;
}
