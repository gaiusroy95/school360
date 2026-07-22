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
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Timetable');
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
    startTime: r.startTime,
    endTime: r.endTime,
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
        const wb = XLSX.read(data, { type: 'binary' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
        const rows: TimetableUploadRow[] = raw
          .map((row) => ({
            className: String(row.className || row.Class || '').trim(),
            sectionName: String(row.sectionName || row.Section || '').trim(),
            dayOfWeek: Number(row.dayOfWeek ?? row.Day ?? row.day ?? 1),
            period: Number(row.period ?? row.Period ?? 1),
            periodLabel: String(row.periodLabel || row.PeriodLabel || '').trim() || undefined,
            periodType: normalizePeriodType(row.periodType || row.PeriodType || row.type),
            startTime: String(row.startTime || row.StartTime || '08:00').trim(),
            endTime: String(row.endTime || row.EndTime || '08:40').trim(),
            subjectName: String(row.subjectName || row.Subject || '').trim(),
            teacherName: String(row.teacherName || row.Teacher || '').trim() || undefined,
            room: String(row.room || row.Room || '').trim() || undefined,
            notes: String(row.notes || row.Notes || '').trim() || undefined,
          }))
          .filter((r) => r.className && r.sectionName && r.subjectName);
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsBinaryString(file);
  });
}
