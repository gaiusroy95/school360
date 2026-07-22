import * as XLSX from 'xlsx';
import type { HolidayInput } from './holidayApi';

export function excelDateToIso(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === 'number') {
    const utc = Math.round((value - 25569) * 86400 * 1000);
    return new Date(utc).toISOString().slice(0, 10);
  }
  const raw = String(value || '').trim();
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return raw;
}

export function parseHolidayWorkbook(file: ArrayBuffer): HolidayInput[] {
  const wb = XLSX.read(file, { type: 'array', cellDates: true });
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

  return matrix
    .map((row) => {
      const keys = Object.keys(row);
      const get = (...names: string[]) => {
        const found = keys.find((k) => names.some((n) => k.trim().toLowerCase() === n.toLowerCase()));
        return found ? row[found] : '';
      };
      return {
        date: excelDateToIso(get('Date', 'Holiday Date')),
        name: String(get('Holiday Name', 'Name', 'Holiday') || '').trim(),
        type: String(get('Type', 'Holiday Type') || 'NATIONAL'),
        applicableTo: String(get('Applicable To', 'Audience') || 'ALL'),
        isPaid: !['no', 'false', '0'].includes(String(get('Is Paid', 'Paid') || 'yes').toLowerCase()),
        notes: String(get('Notes', 'Remark') || '') || null,
      };
    })
    .filter((r) => r.date && r.name);
}

export function downloadHolidayTemplate() {
  const wb = XLSX.utils.book_new();
  const rows = [
    ['Date', 'Holiday Name', 'Type', 'Applicable To', 'Is Paid', 'Notes'],
    ['2026-01-26', 'Republic Day', 'NATIONAL', 'ALL', 'Yes', 'National holiday'],
    ['2026-03-14', 'Holi', 'NATIONAL', 'ALL', 'Yes', ''],
    ['2026-08-15', 'Independence Day', 'NATIONAL', 'ALL', 'Yes', ''],
    ['2026-10-02', 'Gandhi Jayanti', 'NATIONAL', 'ALL', 'Yes', ''],
    ['2026-12-25', 'Christmas', 'NATIONAL', 'ALL', 'Yes', ''],
    ['2026-11-14', 'Staff Training Day', 'INSTITUTIONAL', 'STAFF', 'Yes', 'Paid for staff only'],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Holidays');
  XLSX.writeFile(wb, 'Holiday_List_Template.xlsx');
}

export function exportHolidaysToExcel(
  holidays: { date: string; name: string; type: string; applicableTo: string; isPaid: boolean; notes?: string | null }[],
  filename = 'Holiday_Calendar_Export.xlsx',
) {
  const wb = XLSX.utils.book_new();
  const header = ['Date', 'Holiday Name', 'Type', 'Applicable To', 'Is Paid', 'Notes'];
  const rows = holidays.map((h) => [
    h.date.slice(0, 10),
    h.name,
    h.type,
    h.applicableTo,
    h.isPaid ? 'Yes' : 'No',
    h.notes || '',
  ]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([header, ...rows]), 'Holidays');
  XLSX.writeFile(wb, filename);
}
