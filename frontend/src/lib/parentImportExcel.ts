import * as XLSX from 'xlsx';

const HEADERS = [
  'Parent Name',
  'Mobile',
  'Email',
  'Student Admission No.',
  'Student Soft ID',
  'Student SR No',
  'Student Portal NIC Code',
  'Relationship',
] as const;

function cell(v: unknown): string {
  if (v == null) return '';
  return String(v).replace(/^\uFEFF/, '').trim();
}

function normalizeHeader(h: string) {
  return h.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

export function downloadParentImportTemplate() {
  const wb = XLSX.utils.book_new();
  const sample = [
    [
      'Rajesh Sharma',
      '9876543211',
      'rajesh@example.com',
      'ADM2025001',
      'DPS0001',
      'SR-12345',
      'NIC-9876',
      'FATHER',
    ],
    [
      'Neha Sharma',
      '9876543212',
      'neha@example.com',
      '',
      'DPS0001',
      '',
      '',
      'MOTHER',
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet([[...HEADERS], ...sample]);
  ws['!cols'] = HEADERS.map(() => ({ wch: 22 }));
  XLSX.utils.book_append_sheet(wb, ws, 'Parents');

  const guide = [
    ['Field', 'Notes'],
    ['Parent Name', 'Required. Full name of the parent/guardian.'],
    ['Mobile', 'Recommended. Used to identify the parent profile.'],
    ['Email', 'Optional.'],
    ['Student Admission No.', 'Link student by admission number (at least one student identifier required).'],
    ['Student Soft ID', 'Alternate link using ERP Soft ID.'],
    ['Student SR No', 'Alternate link using government SR number.'],
    ['Student Portal NIC Code', 'Alternate link using portal NIC code.'],
    ['Relationship', 'FATHER, MOTHER, or GUARDIAN'],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(guide), 'Instructions');
  XLSX.writeFile(wb, 'Parents_Import_Template.xlsx');
}

export function parseParentWorkbook(file: ArrayBuffer): Record<string, string>[] {
  const wb = XLSX.read(new Uint8Array(file), { type: 'array', cellDates: true });
  const sheetName =
    wb.SheetNames.find((n) => normalizeHeader(n) === 'parents') ||
    wb.SheetNames.find((n) => normalizeHeader(n) !== 'instructions') ||
    wb.SheetNames[0];
  if (!sheetName) return [];

  const matrix = XLSX.utils.sheet_to_json<(string | number | null)[]>(wb.Sheets[sheetName], {
    header: 1,
    defval: '',
    raw: true,
    blankrows: false,
  }) as (string | number | null)[][];

  const nonEmpty = matrix.filter((row) => (row || []).some((c) => cell(c) !== ''));
  if (nonEmpty.length < 2) return [];

  const header = (nonEmpty[0] || []).map((h) => normalizeHeader(cell(h)));
  const idx = (names: string[]) =>
    header.findIndex((h) =>
      names.some(
        (n) =>
          h === normalizeHeader(n) ||
          h.replace(/\s/g, '') === normalizeHeader(n).replace(/\s/g, ''),
      ),
    );

  const col = {
    parentName: idx(['parent name', 'parentname', 'name', 'full name']),
    mobile: idx(['mobile', 'phone', 'parent mobile']),
    email: idx(['email', 'parent email']),
    studentAdmissionNumber: idx([
      'student admission no',
      'student admission number',
      'student admission no.',
      'admission number',
      'studentadmissionnumber',
    ]),
    studentSoftId: idx(['student soft id', 'soft id', 'studentsoftid']),
    studentSrNo: idx(['student sr no', 'student sr no.', 'sr no', 'studentsrno']),
    studentPortalNicCode: idx(['student portal nic code', 'portal nic code', 'studentportalniccode']),
    relationship: idx(['relationship', 'relation']),
  };

  const rows: Record<string, string>[] = [];
  for (let r = 1; r < nonEmpty.length; r++) {
    const row = nonEmpty[r] || [];
    const get = (i: number) => (i >= 0 ? cell(row[i]) : '');

    const parentName = get(col.parentName);
    if (!parentName) continue;

    rows.push({
      parentName,
      mobile: get(col.mobile),
      email: get(col.email),
      studentAdmissionNumber: get(col.studentAdmissionNumber),
      studentSoftId: get(col.studentSoftId),
      studentSrNo: get(col.studentSrNo),
      studentPortalNicCode: get(col.studentPortalNicCode),
      relationship: get(col.relationship) || 'GUARDIAN',
    });
  }

  return rows;
}
