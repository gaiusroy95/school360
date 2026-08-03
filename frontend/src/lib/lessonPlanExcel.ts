import * as XLSX from 'xlsx';

export type LessonPlanUploadRow = {
  title: string;
  className: string;
  sectionName: string;
  subjectName: string;
  teacherName?: string;
  objective?: string;
  teachingMethod?: string;
  propsUsed?: string;
  bloomsLevel?: string;
  plannedDate?: string;
  resultMeasurement?: string;
  notes?: string;
  createClassTest: boolean;
  department?: string;
  term?: string;
};

export type ClassTestMarksUploadRow = {
  studentId: string;
  studentName?: string;
  marksObtained: number;
};

const LESSON_HEADERS = [
  'title',
  'className',
  'sectionName',
  'subjectName',
  'teacherName',
  'objective',
  'teachingMethod',
  'propsUsed',
  'bloomsLevel',
  'plannedDate',
  'resultMeasurement',
  'notes',
  'createClassTest',
  'department',
  'term',
] as const;

const MARKS_HEADERS = ['studentId', 'studentName', 'marksObtained'] as const;

const BLOOMS = new Set(['REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE', 'CREATE']);

function cell(row: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    if (row[key] != null && String(row[key]).trim() !== '') return String(row[key]).trim();
    const found = Object.entries(row).find(([k]) => k.toLowerCase().replace(/[\s_]+/g, '') === key.toLowerCase().replace(/[\s_]+/g, ''));
    if (found && String(found[1]).trim() !== '') return String(found[1]).trim();
  }
  return '';
}

function parseYesNo(val: unknown, defaultYes = true) {
  const s = String(val ?? '').trim().toLowerCase();
  if (!s) return defaultYes;
  if (['yes', 'y', 'true', '1'].includes(s)) return true;
  if (['no', 'n', 'false', '0'].includes(s)) return false;
  return defaultYes;
}

function normalizeBlooms(val: unknown) {
  const raw = String(val || 'UNDERSTAND').trim().toUpperCase().replace(/\s+/g, '_');
  if (BLOOMS.has(raw)) return raw;
  const map: Record<string, string> = {
    REMEMBERING: 'REMEMBER',
    UNDERSTANDING: 'UNDERSTAND',
    APPLYING: 'APPLY',
    ANALYSING: 'ANALYZE',
    ANALYZING: 'ANALYZE',
    EVALUATING: 'EVALUATE',
    CREATING: 'CREATE',
  };
  return map[raw] || 'UNDERSTAND';
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
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return s;
}

export function downloadLessonPlanTemplate(filename = 'Lesson_Plan_Upload_Template.xlsx') {
  const sample: LessonPlanUploadRow[] = [
    {
      title: 'Introduction to Fractions',
      className: '6',
      sectionName: 'A',
      subjectName: 'Mathematics',
      teacherName: 'Mr. Sharma',
      objective: 'Students will understand fractions as parts of a whole',
      teachingMethod: 'Demonstration',
      propsUsed: 'Whiteboard, Fraction kits',
      bloomsLevel: 'UNDERSTAND',
      plannedDate: '2025-07-15',
      resultMeasurement: 'Class test and oral questions',
      notes: 'Follow-up worksheet',
      createClassTest: true,
      department: 'General',
      term: 'Term 1',
    },
    {
      title: 'Photosynthesis Basics',
      className: '7',
      sectionName: 'B',
      subjectName: 'Science',
      teacherName: 'Ms. Patel',
      objective: 'Explain the process of photosynthesis',
      teachingMethod: 'Group Discussion',
      propsUsed: 'Chart, Projector',
      bloomsLevel: 'APPLY',
      plannedDate: '2025-07-18',
      resultMeasurement: 'Short written quiz',
      notes: '',
      createClassTest: true,
      department: 'General',
      term: 'Term 1',
    },
  ];

  const rows = sample.map((r) => ({
    ...r,
    createClassTest: r.createClassTest ? 'Yes' : 'No',
  }));

  const ws = XLSX.utils.json_to_sheet(rows, { header: [...LESSON_HEADERS] });
  ws['!cols'] = LESSON_HEADERS.map((h) => ({ wch: Math.max(14, h.length + 2) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Lesson Plans');

  const guide = XLSX.utils.aoa_to_sheet([
    ['Field', 'Required', 'Notes'],
    ['title', 'Yes', 'Lesson title'],
    ['className', 'Yes', 'Class name / number'],
    ['sectionName', 'Yes', 'Section'],
    ['subjectName', 'Yes', 'Subject'],
    ['teacherName', 'No', 'Teacher name'],
    ['objective', 'No', 'Learning objective'],
    ['teachingMethod', 'No', 'e.g. Demonstration, Group Discussion'],
    ['propsUsed', 'No', 'Aids / props'],
    ['bloomsLevel', 'No', 'REMEMBER | UNDERSTAND | APPLY | ANALYZE | EVALUATE | CREATE'],
    ['plannedDate', 'No', 'YYYY-MM-DD'],
    ['resultMeasurement', 'No', 'How success is measured'],
    ['notes', 'No', 'Additional notes'],
    ['createClassTest', 'No', 'Yes / No — auto create linked class test'],
    ['department', 'No', 'Default General'],
    ['term', 'No', 'Default Term 1'],
  ]);
  XLSX.utils.book_append_sheet(wb, guide, 'Field Guide');
  XLSX.writeFile(wb, filename);
}

export function parseLessonPlanUploadFile(file: File): Promise<LessonPlanUploadRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const wb = XLSX.read(data, { type: 'binary' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
        const rows: LessonPlanUploadRow[] = raw
          .map((row) => ({
            title: cell(row, 'title', 'Lesson Title', 'lessonTitle'),
            className: cell(row, 'className', 'Class', 'class'),
            sectionName: cell(row, 'sectionName', 'Section', 'section'),
            subjectName: cell(row, 'subjectName', 'Subject', 'subject'),
            teacherName: cell(row, 'teacherName', 'Teacher', 'teacher') || undefined,
            objective: cell(row, 'objective', 'Learning Objective') || undefined,
            teachingMethod: cell(row, 'teachingMethod', 'Teaching Method') || undefined,
            propsUsed: cell(row, 'propsUsed', 'Props / Aids Used', 'props') || undefined,
            bloomsLevel: normalizeBlooms(cell(row, 'bloomsLevel', "Bloom's", 'blooms')),
            plannedDate: excelDateToIso(row.plannedDate ?? row['Planned Date'] ?? row.date) || undefined,
            resultMeasurement: cell(row, 'resultMeasurement', 'Result Measurement') || undefined,
            notes: cell(row, 'notes', 'Notes') || undefined,
            createClassTest: parseYesNo(row.createClassTest ?? row['Auto Create Class Test'] ?? row.autoCreateClassTest, true),
            department: cell(row, 'department', 'Department') || undefined,
            term: cell(row, 'term', 'Term') || undefined,
          }))
          .filter((r) => r.title && r.className && r.sectionName && r.subjectName);
        resolve(rows);
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Failed to parse lesson plan Excel'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsBinaryString(file);
  });
}

export function downloadClassTestMarksTemplate(
  students: { studentId: string; studentName: string; marksObtained?: number | string }[],
  filename = 'Class_Test_Marks_Template.xlsx',
) {
  const rows = (students.length
    ? students
    : [{ studentId: 'STUDENT_ID', studentName: 'Student Name', marksObtained: '' }]
  ).map((s) => ({
    studentId: s.studentId,
    studentName: s.studentName,
    marksObtained: s.marksObtained ?? '',
  }));
  const ws = XLSX.utils.json_to_sheet(rows, { header: [...MARKS_HEADERS] });
  ws['!cols'] = [{ wch: 28 }, { wch: 24 }, { wch: 14 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Marks');
  XLSX.writeFile(wb, filename);
}

export function parseClassTestMarksUploadFile(file: File): Promise<ClassTestMarksUploadRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const wb = XLSX.read(data, { type: 'binary' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
        const rows: ClassTestMarksUploadRow[] = raw
          .map((row) => {
            const studentId = cell(row, 'studentId', 'Student ID', 'id', 'softId', 'admissionNumber');
            const studentName = cell(row, 'studentName', 'Student Name', 'fullName', 'name') || undefined;
            const marksRaw = cell(row, 'marksObtained', 'Marks', 'marks', 'score');
            const marksObtained = Number(marksRaw);
            return { studentId, studentName, marksObtained };
          })
          .filter((r) => r.studentId && Number.isFinite(r.marksObtained));
        resolve(rows);
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Failed to parse marks Excel'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsBinaryString(file);
  });
}
