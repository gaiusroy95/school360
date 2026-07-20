import { api } from './api';

export type Holiday = {
  id: string;
  institutionId: string;
  date: string;
  name: string;
  type: 'NATIONAL' | 'RESTRICTED' | 'OPTIONAL' | 'INSTITUTIONAL' | 'OTHER';
  applicableTo: 'ALL' | 'STAFF' | 'STUDENTS';
  isPaid: boolean;
  notes?: string | null;
};

export type PayrollCalendar = {
  year: number;
  month: number;
  daysInMonth: number;
  weekends: number;
  holidayCount: number;
  workingDays: number;
  paidHolidays: number;
  holidays: Holiday[];
  calendar: {
    date: string;
    weekday: string;
    kind: 'working' | 'weekend' | 'holiday';
    holidayName?: string;
  }[];
};

export type HolidayInput = {
  date: string;
  name: string;
  type?: string;
  applicableTo?: string;
  isPaid?: boolean;
  notes?: string | null;
};

export async function fetchHolidays(params?: { year?: number; month?: number; audience?: string }) {
  const q = new URLSearchParams();
  if (params?.year) q.set('year', String(params.year));
  if (params?.month) q.set('month', String(params.month));
  if (params?.audience) q.set('audience', params.audience);
  const qs = q.toString();
  return api<{ holidays: Holiday[] }>(`/api/holidays${qs ? `?${qs}` : ''}`);
}

export async function fetchPayrollCalendar(year: number, month: number) {
  return api<PayrollCalendar>(`/api/holidays/payroll-calendar?year=${year}&month=${month}`);
}

export async function createHoliday(data: HolidayInput) {
  return api<{ holiday: Holiday }>('/api/holidays', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateHoliday(id: string, data: HolidayInput) {
  return api<{ holiday: Holiday }>(`/api/holidays/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteHoliday(id: string) {
  return api<{ ok: boolean }>(`/api/holidays/${id}`, { method: 'DELETE' });
}

export async function importHolidays(rows: HolidayInput[], replaceYear?: number) {
  return api<{ message: string; created: number; skipped: number; holidays: Holiday[] }>(
    '/api/holidays/import',
    {
      method: 'POST',
      body: JSON.stringify({ rows, replaceYear }),
    },
  );
}

export function formatHolidayDate(iso: string) {
  return iso.slice(0, 10);
}
