import * as XLSX from 'xlsx';

export type EmployeeDirectoryUploadRow = {
  employeeCode?: string;
  fullName: string;
  employmentType?: string;
  department?: string;
  designation?: string;
  classGroup?: string;
  mobile?: string;
  email?: string;
  joinDate?: string;
  gender?: string;
  dateOfBirth?: string;
  reportingTo?: string;
  workLocation?: string;
  subject?: string;
  bankAccount?: string;
  bankIfsc?: string;
  panNumber?: string;
  uanNumber?: string;
  pfNumber?: string;
  esicNumber?: string;
  bankName?: string;
  paymentMode?: string;
  basicSalary?: number;
  hra?: number;
  da?: number;
  specialAllowance?: number;
  conveyanceAllowance?: number;
  otherAllowances?: number;
  epfEmployee?: number;
  professionalTax?: number;
  otherDeductions?: number;
  structureCode?: string;
  effectiveFrom?: string;
};

const HEADERS = [
  'employeeCode',
  'fullName',
  'employmentType',
  'department',
  'designation',
  'classGroup',
  'mobile',
  'email',
  'joinDate',
  'gender',
  'dateOfBirth',
  'reportingTo',
  'workLocation',
  'subject',
  'bankAccount',
  'bankIfsc',
  'panNumber',
  'uanNumber',
  'pfNumber',
  'esicNumber',
  'bankName',
  'paymentMode',
  'basicSalary',
  'hra',
  'da',
  'specialAllowance',
  'conveyanceAllowance',
  'otherAllowances',
  'epfEmployee',
  'professionalTax',
  'otherDeductions',
  'structureCode',
  'effectiveFrom',
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

export function downloadEmployeeDirectoryTemplate(filename = 'Employee_Staff_Bulk_Upload_Template.xlsx') {
  const samples: EmployeeDirectoryUploadRow[] = [
    {
      employeeCode: 'EMP-1001',
      fullName: 'Rahul Sharma',
      employmentType: 'TEACHING',
      department: 'Academics',
      designation: 'PGT - Mathematics',
      classGroup: 'Class 11-A',
      mobile: '9876543210',
      email: 'rahul.sharma@school.edu',
      joinDate: '2020-07-01',
      gender: 'Male',
      dateOfBirth: '1988-04-12',
      reportingTo: 'Principal',
      workLocation: 'Main Campus',
      subject: 'Mathematics',
      bankAccount: '123456789012',
      bankIfsc: 'HDFC0001234',
      panNumber: 'ABCDE1234F',
      uanNumber: '100123456789',
      pfNumber: 'DL/EPF/1001',
      esicNumber: '',
      bankName: 'HDFC Bank',
      paymentMode: 'Bank Transfer',
      basicSalary: 38000,
      hra: 12000,
      da: 3500,
      specialAllowance: 3000,
      conveyanceAllowance: 2000,
      otherAllowances: 0,
      epfEmployee: 4560,
      professionalTax: 200,
      otherDeductions: 0,
      structureCode: 'SS-EMP-1001',
      effectiveFrom: '2020-07-01',
    },
    {
      employeeCode: 'EMP-1002',
      fullName: 'Priya Patel',
      employmentType: 'NON_TEACHING',
      department: 'Administration',
      designation: 'Office Assistant',
      classGroup: '',
      mobile: '9876501234',
      email: 'priya.patel@school.edu',
      joinDate: '2022-04-01',
      gender: 'Female',
      dateOfBirth: '1992-08-20',
      reportingTo: 'Admin Officer',
      workLocation: 'Main Campus',
      subject: '',
      bankAccount: '998877665544',
      bankIfsc: 'SBIN0000456',
      panNumber: 'FGHIJ5678K',
      uanNumber: '',
      pfNumber: '',
      esicNumber: 'ESIC9988',
      bankName: 'SBI',
      paymentMode: 'Bank Transfer',
      basicSalary: 22000,
      hra: 6000,
      da: 2000,
      specialAllowance: 1000,
      conveyanceAllowance: 1500,
      otherAllowances: 500,
      epfEmployee: 2640,
      professionalTax: 200,
      otherDeductions: 0,
      structureCode: 'SS-EMP-1002',
      effectiveFrom: '2022-04-01',
    },
  ];

  const sheet = XLSX.utils.json_to_sheet(samples, { header: [...HEADERS] });
  sheet['!cols'] = HEADERS.map((h) => ({ wch: Math.max(14, h.length + 2) }));
  const notes = XLSX.utils.aoa_to_sheet([
    ['Employees Directory — Bulk Upload Instructions'],
    [''],
    ['1. Fill one row per employee / staff member.'],
    ['2. fullName is required. employeeCode is recommended (used for upsert / update).'],
    ['3. employmentType: TEACHING | NON_TEACHING | ADMIN | SUPPORT'],
    ['4. Salary columns (basicSalary, hra, da, …) create/update that staff’s salary structure.'],
    ['5. If gross/net are omitted, they are calculated from earnings − deductions.'],
    ['6. Existing employeeCode rows are updated; new codes are created.'],
    ['7. Delete sample rows before uploading your real data.'],
    [''],
    ['Columns'],
    ...HEADERS.map((h) => [h]),
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, 'Employees');
  XLSX.utils.book_append_sheet(wb, notes, 'Instructions');
  XLSX.writeFile(wb, filename);
}

export async function parseEmployeeDirectoryUploadFile(file: File): Promise<EmployeeDirectoryUploadRow[]> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheetName = wb.SheetNames.find((n) => n.toLowerCase().includes('employee')) || wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  if (!sheet) throw new Error('No worksheet found in Excel file');
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

  const out: EmployeeDirectoryUploadRow[] = [];
  for (const row of rows) {
    const fullName = cell(row, 'fullName', 'name', 'employeeName', 'staffName');
    if (!fullName) continue;
    if (/^full\s*name$/i.test(fullName)) continue;

    out.push({
      employeeCode: cell(row, 'employeeCode', 'empCode', 'code', 'staffCode') || undefined,
      fullName,
      employmentType: cell(row, 'employmentType', 'type') || undefined,
      department: cell(row, 'department', 'dept') || undefined,
      designation: cell(row, 'designation', 'role', 'position') || undefined,
      classGroup: cell(row, 'classGroup', 'class', 'section') || undefined,
      mobile: cell(row, 'mobile', 'phone', 'mobileNumber') || undefined,
      email: cell(row, 'email', 'emailId') || undefined,
      joinDate: excelDateToIso(cell(row, 'joinDate', 'dateOfJoining', 'doj') || undefined) || undefined,
      gender: cell(row, 'gender') || undefined,
      dateOfBirth: excelDateToIso(cell(row, 'dateOfBirth', 'dob') || undefined) || undefined,
      reportingTo: cell(row, 'reportingTo', 'manager') || undefined,
      workLocation: cell(row, 'workLocation', 'location', 'campus') || undefined,
      subject: cell(row, 'subject', 'subjectSpecialization') || undefined,
      bankAccount: cell(row, 'bankAccount', 'accountNumber', 'bankAccountNumber') || undefined,
      bankIfsc: cell(row, 'bankIfsc', 'ifsc') || undefined,
      panNumber: cell(row, 'panNumber', 'pan') || undefined,
      uanNumber: cell(row, 'uanNumber', 'uan') || undefined,
      pfNumber: cell(row, 'pfNumber', 'pf') || undefined,
      esicNumber: cell(row, 'esicNumber', 'esic') || undefined,
      bankName: cell(row, 'bankName') || undefined,
      paymentMode: cell(row, 'paymentMode') || undefined,
      basicSalary: num(row, 'basicSalary', 'basic'),
      hra: num(row, 'hra'),
      da: num(row, 'da'),
      specialAllowance: num(row, 'specialAllowance'),
      conveyanceAllowance: num(row, 'conveyanceAllowance', 'conveyance'),
      otherAllowances: num(row, 'otherAllowances', 'otherAllowance'),
      epfEmployee: num(row, 'epfEmployee', 'epf', 'pfDeduction'),
      professionalTax: num(row, 'professionalTax', 'pt'),
      otherDeductions: num(row, 'otherDeductions'),
      structureCode: cell(row, 'structureCode', 'salaryStructureCode') || undefined,
      effectiveFrom: excelDateToIso(cell(row, 'effectiveFrom', 'salaryEffectiveFrom') || undefined) || undefined,
    });
  }

  if (!out.length) throw new Error('No valid employee rows found. Ensure fullName is filled.');
  return out;
}
