import * as XLSX from 'xlsx';

export type SubjectTeacherUploadRow = {
  subjectName: string;
  subjectCode?: string;
  subjectType?: string;
  subjectGroup?: string;
  teacherName: string;
  teacherEmail?: string;
  teacherPhone?: string;
  className: string;
  sectionName: string;
  courseStartDate?: string;
  courseCompletionDeadline?: string;
  revisionDeadline?: string;
};

const HEADERS = [
  'subjectName',
  'subjectCode',
  'subjectType',
  'subjectGroup',
  'teacherName',
  'teacherEmail',
  'teacherPhone',
  'className',
  'sectionName',
  'courseStartDate',
  'courseCompletionDeadline',
  'revisionDeadline',
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

export function downloadSubjectTeacherTemplate(filename = 'Subject_Teacher_Mapping_Template.xlsx') {
  const sample: SubjectTeacherUploadRow[] = [
    {
      subjectName: 'Mathematics',
      subjectCode: 'MATH',
      subjectType: 'Core',
      subjectGroup: 'General',
      teacherName: 'Mr. Sharma',
      teacherEmail: '',
      teacherPhone: '',
      className: '6',
      sectionName: 'A',
      courseStartDate: '2025-04-01',
      courseCompletionDeadline: '2026-02-28',
      revisionDeadline: '2026-03-15',
    },
    {
      subjectName: 'Science',
      subjectCode: 'SCI',
      subjectType: 'Compulsory',
      subjectGroup: 'General',
      teacherName: 'Ms. Patel',
      teacherEmail: '',
      teacherPhone: '',
      className: '7',
      sectionName: 'B',
      courseStartDate: '2025-04-01',
      courseCompletionDeadline: '2026-02-28',
      revisionDeadline: '2026-03-15',
    },
    {
      subjectName: 'Computer Science',
      subjectCode: 'CS',
      subjectType: 'Elective',
      subjectGroup: 'STEM',
      teacherName: 'Mr. Sharma',
      teacherEmail: '',
      teacherPhone: '',
      className: '9',
      sectionName: 'A',
      courseStartDate: '2025-04-01',
      courseCompletionDeadline: '2026-02-28',
      revisionDeadline: '2026-03-10',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sample, { header: [...HEADERS] });
  ws['!cols'] = HEADERS.map((h) => ({ wch: Math.max(16, h.length + 2) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Teacher Subject Map');

  const guide = XLSX.utils.aoa_to_sheet([
    ['Field', 'Required', 'Notes'],
    ['subjectName', 'Yes', 'Subject name'],
    ['subjectCode', 'No', 'Unique code (created if subject is new)'],
    ['subjectType', 'No', 'Core | Elective | Compulsory (default Core)'],
    ['subjectGroup', 'No', 'e.g. General, STEM'],
    ['teacherName', 'Yes', 'Must match HR teaching staff name for email/phone auto-fill'],
    ['teacherEmail', 'No', 'Auto-filled from HR if blank'],
    ['teacherPhone', 'No', 'Auto-filled from HR if blank'],
    ['className', 'Yes', 'Class name / number'],
    ['sectionName', 'Yes', 'Section'],
    ['courseStartDate', 'No', 'YYYY-MM-DD or dd-mm-yyyy'],
    ['courseCompletionDeadline', 'No', 'YYYY-MM-DD or dd-mm-yyyy'],
    ['revisionDeadline', 'No', 'YYYY-MM-DD or dd-mm-yyyy'],
  ]);
  XLSX.utils.book_append_sheet(wb, guide, 'Field Guide');
  XLSX.writeFile(wb, filename);
}

export function parseSubjectTeacherUploadFile(file: File): Promise<SubjectTeacherUploadRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const wb = XLSX.read(data, { type: 'binary' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
        const rows: SubjectTeacherUploadRow[] = raw
          .map((row) => ({
            subjectName: cell(row, 'subjectName', 'Subject Name', 'Subject'),
            subjectCode: cell(row, 'subjectCode', 'Subject Code', 'Code') || undefined,
            subjectType: cell(row, 'subjectType', 'Type', 'Subject Type') || undefined,
            subjectGroup: cell(row, 'subjectGroup', 'Group', 'Subject Group') || undefined,
            teacherName: cell(row, 'teacherName', 'Teacher Name', 'Teacher'),
            teacherEmail: cell(row, 'teacherEmail', 'Teacher Email', 'Email') || undefined,
            teacherPhone: cell(row, 'teacherPhone', 'Teacher Phone', 'Phone', 'Mobile') || undefined,
            className: cell(row, 'className', 'Class', 'Class Name'),
            sectionName: cell(row, 'sectionName', 'Section', 'Section Name'),
            courseStartDate:
              excelDateToIso(row.courseStartDate ?? row['Course Start'] ?? row['Course Start Date']) || undefined,
            courseCompletionDeadline:
              excelDateToIso(
                row.courseCompletionDeadline ?? row['Course Completion Deadline'] ?? row['Completion Deadline'],
              ) || undefined,
            revisionDeadline:
              excelDateToIso(row.revisionDeadline ?? row['Revision Deadline'] ?? row['Revision Due']) || undefined,
          }))
          .filter((r) => r.subjectName && r.teacherName && r.className && r.sectionName);
        resolve(rows);
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Failed to parse subject–teacher Excel'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsBinaryString(file);
  });
}
