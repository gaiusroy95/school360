import * as XLSX from 'xlsx';

export type HomeworkUploadRow = {
  assignedDate?: string;
  className: string;
  sectionName: string;
  subjectName: string;
  teacherName?: string;
  title: string;
  description?: string;
  dueDate?: string;
  totalStudents?: number;
  youtubeUrl?: string;
};

const HEADERS = [
  'assignedDate',
  'className',
  'sectionName',
  'subjectName',
  'teacherName',
  'title',
  'description',
  'dueDate',
  'totalStudents',
  'youtubeUrl',
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

export function downloadHomeworkTemplate(filename = 'Homework_Bulk_Assignment_Template.xlsx') {
  const sample: HomeworkUploadRow[] = [
    {
      assignedDate: '2026-08-11',
      className: '1',
      sectionName: 'A',
      subjectName: 'Hindi',
      teacherName: 'Angaan',
      title: 'Hindi-rules',
      description: 'Complete workbook exercises 1–10',
      dueDate: '2026-08-13',
      totalStudents: 35,
      youtubeUrl: '',
    },
    {
      assignedDate: '2026-08-11',
      className: '6',
      sectionName: 'A',
      subjectName: 'Mathematics',
      teacherName: 'Mr. Sharma',
      title: 'Integers practice',
      description: 'Solve worksheet on integers',
      dueDate: '2026-08-14',
      totalStudents: 40,
      youtubeUrl: '',
    },
  ];

  const wb = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(sample, { header: [...HEADERS] });
  XLSX.utils.book_append_sheet(wb, sheet, 'Homework');

  const guide = XLSX.utils.aoa_to_sheet([
    ['Field', 'Required', 'Notes'],
    ['assignedDate', 'No', 'YYYY-MM-DD or dd-mm-yyyy (defaults to dashboard date if blank)'],
    ['className', 'Yes', 'Must match Teacher / Subject Allocation'],
    ['sectionName', 'Yes', 'Must match allocated section'],
    ['subjectName', 'Yes', 'Must match allocated subject'],
    ['teacherName', 'No', 'Auto-filled from allocation if blank; must match if provided'],
    ['title', 'Yes', 'Homework title shown on dashboard & mobile'],
    ['description', 'No', 'Assignment details / instructions'],
    ['dueDate', 'No', 'YYYY-MM-DD or dd-mm-yyyy'],
    ['totalStudents', 'No', 'Defaults to active students in class-section'],
    ['youtubeUrl', 'No', 'Optional video / supporting link'],
    ['', '', 'Tip: Allocate teachers first. Duplicate title+date+class+section+subject updates existing row.'],
  ]);
  XLSX.utils.book_append_sheet(wb, guide, 'Field Guide');
  XLSX.writeFile(wb, filename);
}

export function parseHomeworkUploadFile(file: File): Promise<HomeworkUploadRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const wb = XLSX.read(data, { type: 'binary' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
        const rows: HomeworkUploadRow[] = raw
          .map((row) => {
            const totalRaw = cell(row, 'totalStudents', 'Total Students', 'Students');
            return {
              assignedDate:
                excelDateToIso(
                  row.assignedDate ?? row['Assigned Date'] ?? row.Date ?? row.date,
                ) || undefined,
              className: cell(row, 'className', 'Class', 'Class Name'),
              sectionName: cell(row, 'sectionName', 'Section', 'Section Name'),
              subjectName: cell(row, 'subjectName', 'Subject', 'Subject Name'),
              teacherName: cell(row, 'teacherName', 'Teacher', 'Teacher Name') || undefined,
              title: cell(row, 'title', 'Homework Title', 'Title', 'Assignment Title'),
              description:
                cell(row, 'description', 'Description', 'Details', 'Instructions') || undefined,
              dueDate:
                excelDateToIso(row.dueDate ?? row['Due Date'] ?? row.Deadline) || undefined,
              totalStudents: totalRaw ? Number(totalRaw) : undefined,
              youtubeUrl: cell(row, 'youtubeUrl', 'YouTube', 'Video URL', 'Link') || undefined,
            };
          })
          .filter((r) => r.className && r.sectionName && r.subjectName && r.title);
        resolve(rows);
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Failed to parse homework Excel'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsBinaryString(file);
  });
}
