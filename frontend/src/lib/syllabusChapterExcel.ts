import * as XLSX from 'xlsx';

export type SyllabusChapterUploadRow = {
  className: string;
  sectionName: string;
  subjectName: string;
  chapterTitle: string;
  unitNumber?: number;
  boardTopicCode?: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
  revisionDeadline?: string;
  completionPercent?: number;
};

const HEADERS = [
  'className',
  'sectionName',
  'subjectName',
  'chapterTitle',
  'unitNumber',
  'boardTopicCode',
  'plannedStartDate',
  'plannedEndDate',
  'revisionDeadline',
  'completionPercent',
] as const;

function cell(row: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    if (row[key] != null && String(row[key]).trim() !== '') return String(row[key]).trim();
    const found = Object.entries(row).find(
      ([k]) => k.toLowerCase().replace(/[\s_]+/g, '') === key.toLowerCase().replace(/[\s_]+/g, ''),
    );
    if (found && String(found[1]).trim() !== '') return String(found[1]).trim();
  }
  return '';
}

function excelDateToIso(val: unknown) {
  if (val == null || val === '') return '';
  if (typeof val === 'number' && Number.isFinite(val)) {
    const parsed = XLSX.SSF.parse_date_code(val);
    if (parsed) {
      const mm = String(parsed.m).padStart(2, '0');
      const dd = String(parsed.d).padStart(2, '0');
      return `${parsed.y}-${mm}-${dd}`;
    }
  }
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const dmy = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmy) {
    const dd = dmy[1].padStart(2, '0');
    const mm = dmy[2].padStart(2, '0');
    return `${dmy[3]}-${mm}-${dd}`;
  }
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return s;
}

export function downloadSyllabusChapterTemplate(filename = 'Syllabus_Chapter_Bulk_Template.xlsx') {
  const sample: SyllabusChapterUploadRow[] = [
    {
      className: '6',
      sectionName: 'A',
      subjectName: 'Mathematics',
      chapterTitle: 'Integers',
      unitNumber: 1,
      boardTopicCode: 'MATH-6-01',
      plannedStartDate: '2025-04-01',
      plannedEndDate: '2025-04-30',
      revisionDeadline: '2025-05-10',
      completionPercent: 0,
    },
    {
      className: '6',
      sectionName: 'A',
      subjectName: 'Mathematics',
      chapterTitle: 'Fractions',
      unitNumber: 2,
      boardTopicCode: 'MATH-6-02',
      plannedStartDate: '2025-05-01',
      plannedEndDate: '2025-05-31',
      revisionDeadline: '2025-06-10',
      completionPercent: 0,
    },
    {
      className: '1',
      sectionName: 'A',
      subjectName: 'Hindi',
      chapterTitle: 'वर्णमाला',
      unitNumber: 1,
      boardTopicCode: 'HIN-1-01',
      plannedStartDate: '2025-04-01',
      plannedEndDate: '2025-04-20',
      revisionDeadline: '2025-04-30',
      completionPercent: 0,
    },
  ];

  const wb = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(sample, { header: [...HEADERS] });
  XLSX.utils.book_append_sheet(wb, sheet, 'Syllabus Chapters');

  const guide = XLSX.utils.aoa_to_sheet([
    ['Field', 'Required', 'Notes'],
    ['className', 'Yes', 'Must match Subject Management / Teacher Allocation class'],
    ['sectionName', 'Yes', 'Must match allocated section'],
    ['subjectName', 'Yes', 'Must match allocated subject for that class-section'],
    ['chapterTitle', 'Yes', 'Chapter / unit title'],
    ['unitNumber', 'No', 'Integer order (default 1; used with title for upsert)'],
    ['boardTopicCode', 'No', 'Board / framework topic code'],
    ['plannedStartDate', 'No', 'YYYY-MM-DD or dd-mm-yyyy'],
    ['plannedEndDate', 'No', 'YYYY-MM-DD or dd-mm-yyyy'],
    ['revisionDeadline', 'No', 'YYYY-MM-DD or dd-mm-yyyy'],
    ['completionPercent', 'No', '0–100 (default 0)'],
    ['', '', 'Tip: Create teacher/subject allocations first, then bulk-upload chapters.'],
  ]);
  XLSX.utils.book_append_sheet(wb, guide, 'Field Guide');
  XLSX.writeFile(wb, filename);
}

export function parseSyllabusChapterUploadFile(file: File): Promise<SyllabusChapterUploadRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const wb = XLSX.read(data, { type: 'binary' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
        const rows: SyllabusChapterUploadRow[] = raw
          .map((row) => {
            const unitRaw = cell(row, 'unitNumber', 'Unit Number', 'Unit');
            const pctRaw = cell(row, 'completionPercent', 'Completion', 'Progress');
            return {
              className: cell(row, 'className', 'Class', 'Class Name'),
              sectionName: cell(row, 'sectionName', 'Section', 'Section Name'),
              subjectName: cell(row, 'subjectName', 'Subject', 'Subject Name'),
              chapterTitle: cell(row, 'chapterTitle', 'Chapter Title', 'Chapter', 'Title'),
              unitNumber: unitRaw ? Number(unitRaw) : undefined,
              boardTopicCode: cell(row, 'boardTopicCode', 'Board Topic Code', 'Board Code', 'Topic Code') || undefined,
              plannedStartDate:
                excelDateToIso(row.plannedStartDate ?? row['Planned Start'] ?? row['Start Date']) || undefined,
              plannedEndDate:
                excelDateToIso(row.plannedEndDate ?? row['Planned End'] ?? row['End Date']) || undefined,
              revisionDeadline:
                excelDateToIso(row.revisionDeadline ?? row['Revision Deadline'] ?? row['Revision Due']) || undefined,
              completionPercent: pctRaw ? Number(pctRaw) : undefined,
            };
          })
          .filter((r) => r.className && r.sectionName && r.subjectName && r.chapterTitle);
        resolve(rows);
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Failed to parse syllabus chapter Excel'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsBinaryString(file);
  });
}
