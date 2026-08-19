import * as XLSX from 'xlsx';

export type CandidateUploadRow = {
  fullName: string;
  email?: string;
  mobile?: string;
  qualification?: string;
  experienceYears?: number;
  currentEmployer?: string;
  expectedSalary?: number;
  noticePeriod?: string;
  subjectExpertise?: string;
  source?: string;
};

const HEADERS = [
  'fullName',
  'email',
  'mobile',
  'qualification',
  'experienceYears',
  'currentEmployer',
  'expectedSalary',
  'noticePeriod',
  'subjectExpertise',
  'source',
] as const;

function cell(row: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    if (row[key] != null && String(row[key]).trim() !== '') return String(row[key]).trim();
    const found = Object.entries(row).find(
      ([k]) => k.toLowerCase().replace(/[\s_]+/g, '') === key.toLowerCase().replace(/[\s_]+/g, ''),
    );
    if (found && found[1] != null && String(found[1]).trim() !== '') return String(found[1]).trim();
  }
  return '';
}

function num(row: Record<string, unknown>, ...keys: string[]) {
  const raw = cell(row, ...keys);
  if (!raw) return undefined;
  const n = Number(String(raw).replace(/,/g, ''));
  return Number.isFinite(n) ? n : undefined;
}

export function downloadCandidateTemplate(filename = 'Candidates_Bulk_Upload_Template.xlsx') {
  const samples: CandidateUploadRow[] = [
    {
      fullName: 'Priya Sharma',
      email: 'priya.sharma@email.com',
      mobile: '9876543210',
      qualification: 'M.Sc Mathematics, B.Ed',
      experienceYears: 5,
      currentEmployer: 'ABC School',
      expectedSalary: 45000,
      noticePeriod: '30 days',
      subjectExpertise: 'Mathematics',
      source: 'Excel Upload',
    },
    {
      fullName: 'Rahul Verma',
      email: 'rahul.verma@email.com',
      mobile: '9876543211',
      qualification: 'M.Sc Physics, B.Ed',
      experienceYears: 3,
      expectedSalary: 40000,
      noticePeriod: '15 days',
      subjectExpertise: 'Physics',
      source: 'Referral',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(samples, { header: [...HEADERS] });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Candidates');
  XLSX.writeFile(wb, filename);
}

export async function parseCandidateUploadFile(file: File): Promise<CandidateUploadRow[]> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

  return rows
    .map((row) => ({
      fullName: cell(row, 'fullName', 'name', 'candidateName', 'full_name'),
      email: cell(row, 'email', 'emailId', 'email_id'),
      mobile: cell(row, 'mobile', 'phone', 'contact'),
      qualification: cell(row, 'qualification', 'qualifications', 'degree'),
      experienceYears: num(row, 'experienceYears', 'experience', 'exp'),
      currentEmployer: cell(row, 'currentEmployer', 'employer', 'current_employer'),
      expectedSalary: num(row, 'expectedSalary', 'expectedCtc', 'ctc'),
      noticePeriod: cell(row, 'noticePeriod', 'notice'),
      subjectExpertise: cell(row, 'subjectExpertise', 'subject'),
      source: cell(row, 'source') || 'Excel Upload',
    }))
    .filter((r) => r.fullName.trim().length > 0);
}
