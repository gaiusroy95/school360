import * as XLSX from 'xlsx';
import type { TimetableSlot } from './academicServices';

export type TimetableUploadRow = {
  className: string;
  sectionName: string;
  dayOfWeek: number;
  period: number;
  periodLabel?: string;
  periodType?: string;
  startTime?: string;
  endTime?: string;
  subjectName: string;
  teacherName?: string;
  room?: string;
  notes?: string;
};

const HEADERS = [
  'className', 'sectionName', 'dayOfWeek', 'period', 'periodLabel',
  'periodType', 'startTime', 'endTime', 'subjectName', 'teacherName', 'room', 'notes',
];

/** Convert Excel serial / Date / AM-PM / fraction string into HH:mm. */
export function parseExcelTime(val: unknown, fallback = '08:00'): string {
  if (val == null || val === '') return fallback;

  if (val instanceof Date && !Number.isNaN(val.getTime())) {
    return `${String(val.getHours()).padStart(2, '0')}:${String(val.getMinutes()).padStart(2, '0')}`;
  }

  if (typeof val === 'number' && Number.isFinite(val)) {
    // Prefer SheetJS date-code when available (handles full datetime serials)
    try {
      const parsed = XLSX.SSF.parse_date_code(val);
      if (parsed) {
        return `${String(parsed.H).padStart(2, '0')}:${String(parsed.M).padStart(2, '0')}`;
      }
    } catch {
      /* fall through */
    }
    let fraction = val;
    if (val >= 1) fraction = val % 1;
    if (fraction < 0) return fallback;
    const totalMinutes = Math.round(fraction * 24 * 60) % (24 * 60);
    const hh = Math.floor(totalMinutes / 60);
    const mm = totalMinutes % 60;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }

  const s = String(val).trim();
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(s)) {
    const [h, m] = s.split(':');
    return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
  }

  const ampm = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i);
  if (ampm) {
    let h = Number(ampm[1]);
    const m = ampm[2];
    const ap = ampm[3].toUpperCase();
    if (ap === 'PM' && h < 12) h += 12;
    if (ap === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${m}`;
  }

  // Excel fraction saved as string e.g. "0.437499999999994"
  if (/^\d*\.\d+$/.test(s)) {
    const n = Number(s);
    if (Number.isFinite(n) && n >= 0 && n < 2) return parseExcelTime(n, fallback);
  }

  return fallback;
}

function cell(row: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    if (row[key] != null && String(row[key]).trim() !== '') return row[key];
    const found = Object.entries(row).find(
      ([k]) => k.toLowerCase().replace(/[\s_]+/g, '') === key.toLowerCase().replace(/[\s_]+/g, ''),
    );
    if (found && found[1] != null && String(found[1]).trim() !== '') return found[1];
  }
  return undefined;
}

export function downloadTimetableTemplate(filename = 'Timetable_Upload_Template.xlsx') {
  const sample: TimetableUploadRow[] = [
    {
      className: '10',
      sectionName: 'A',
      dayOfWeek: 1,
      period: 1,
      periodLabel: 'P1',
      periodType: 'THEORY',
      startTime: '08:00',
      endTime: '08:40',
      subjectName: 'Mathematics',
      teacherName: 'Mr. Sharma',
      room: 'Room 101',
      notes: '',
    },
    {
      className: '10',
      sectionName: 'A',
      dayOfWeek: 1,
      period: 2,
      periodLabel: 'P2',
      periodType: 'LAB',
      startTime: '08:50',
      endTime: '09:30',
      subjectName: 'Physics',
      teacherName: 'Ms. Patel',
      room: 'Lab 2',
      notes: '',
    },
  ];
  const ws = XLSX.utils.json_to_sheet(sample, { header: HEADERS });
  ws['!cols'] = HEADERS.map((h) => ({ wch: Math.max(12, h.length + 2) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Timetable');

  const guide = XLSX.utils.aoa_to_sheet([
    ['Field', 'Required', 'Notes'],
    ['className', 'Yes', 'Class'],
    ['sectionName', 'Yes', 'Section'],
    ['dayOfWeek', 'Yes', '1=Mon … 7=Sun'],
    ['period', 'Yes', 'Period number'],
    ['periodLabel', 'No', 'e.g. P1'],
    ['periodType', 'No', 'THEORY | PRACTICAL | LAB | SPORTS | EVENT'],
    ['startTime', 'No', 'HH:mm (Excel time cells are auto-converted)'],
    ['endTime', 'No', 'HH:mm (Excel time cells are auto-converted)'],
    ['subjectName', 'Yes', 'Subject'],
    ['teacherName', 'No', 'Teacher'],
    ['room', 'No', 'Room / venue'],
    ['notes', 'No', 'Notes'],
  ]);
  XLSX.utils.book_append_sheet(wb, guide, 'Field Guide');
  XLSX.writeFile(wb, filename);
}

export function exportTimetableExcel(records: TimetableSlot[], filename = 'Timetable_Export.xlsx') {
  const rows = records.map((r) => ({
    className: r.className,
    sectionName: r.sectionName,
    dayOfWeek: r.dayOfWeek,
    period: r.period,
    periodLabel: r.periodLabel,
    periodType: r.periodType,
    startTime: parseExcelTime(r.startTime, r.startTime || '08:00'),
    endTime: parseExcelTime(r.endTime, r.endTime || '08:40'),
    subjectName: r.subjectName,
    teacherName: r.teacherName,
    room: r.room,
    effectiveFrom: r.effectiveFrom?.slice(0, 10) || '',
    effectiveTo: r.effectiveTo?.slice(0, 10) || '',
    versionLabel: r.versionLabel,
    published: r.isPublished ? 'Yes' : 'No',
    notes: r.notes,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Timetable');
  XLSX.writeFile(wb, filename);
}

function normalizePeriodType(val: unknown): string {
  const s = String(val || 'THEORY').toUpperCase().trim();
  if (['THEORY', 'PRACTICAL', 'LAB', 'SPORTS', 'EVENT'].includes(s)) return s;
  if (s.includes('PRACT')) return 'PRACTICAL';
  if (s.includes('LAB')) return 'LAB';
  if (s.includes('SPORT')) return 'SPORTS';
  if (s.includes('EVENT')) return 'EVENT';
  return 'THEORY';
}

export function parseTimetableUploadFile(file: File): Promise<TimetableUploadRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const wb = XLSX.read(data, { type: 'binary', cellDates: true });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { raw: true });
        const rows: TimetableUploadRow[] = raw
          .map((row) => {
            const period = Number(cell(row, 'period', 'Period') ?? 1);
            return {
              className: String(cell(row, 'className', 'Class') ?? '').trim(),
              sectionName: String(cell(row, 'sectionName', 'Section') ?? '').trim(),
              dayOfWeek: Number(cell(row, 'dayOfWeek', 'Day', 'day') ?? 1),
              period: Number.isFinite(period) ? period : 1,
              periodLabel: String(cell(row, 'periodLabel', 'PeriodLabel') ?? '').trim() || `P${period}`,
              periodType: normalizePeriodType(cell(row, 'periodType', 'PeriodType', 'type')),
              startTime: parseExcelTime(cell(row, 'startTime', 'StartTime', 'Start Time'), '08:00'),
              endTime: parseExcelTime(cell(row, 'endTime', 'EndTime', 'End Time'), '08:40'),
              subjectName: String(cell(row, 'subjectName', 'Subject') ?? '').trim(),
              teacherName: String(cell(row, 'teacherName', 'Teacher') ?? '').trim() || undefined,
              room: String(cell(row, 'room', 'Room') ?? '').trim() || undefined,
              notes: String(cell(row, 'notes', 'Notes') ?? '').trim() || undefined,
            };
          })
          .filter((r) => r.className && r.sectionName && r.subjectName);
        resolve(rows);
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Failed to parse timetable Excel'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsBinaryString(file);
  });
}
