import * as XLSX from 'xlsx';
import type { Student } from './studentServices';

const HEADERS = [
  'Admission No.',
  'Roll No.',
  'First Name',
  'Last Name',
  'Date of Birth',
  'Gender',
  'Blood Group',
  'Aadhaar Number',
  'Category',
  'Class',
  'Section',
  'Academic Year',
  'House',
  'Mobile',
  'Email',
  'Address',
  'Father Name',
  'Father Mobile',
  'Mother Name',
  'Mother Mobile',
  'Status',
  'Entrance Score',
] as const;

function cell(v: unknown): string {
  if (v == null) return '';
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  if (typeof v === 'number' && Number.isFinite(v)) {
    if (v > 20000 && v < 80000) {
      const utc = Math.round((v - 25569) * 86400 * 1000);
      return new Date(utc).toISOString().slice(0, 10);
    }
    return String(v);
  }
  return String(v).replace(/^\uFEFF/, '').trim();
}

function normalizeHeader(h: string) {
  return h.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

export function downloadStudentTemplate(existing: Student[] = []) {
  const wb = XLSX.utils.book_new();
  const sample =
    existing.length > 0
      ? existing.map((s) => [
          s.admissionNumber,
          s.rollNumber,
          s.firstName,
          s.lastName,
          s.dateOfBirth,
          s.gender,
          s.bloodGroup,
          s.aadhaarNumber,
          s.category,
          s.className,
          s.sectionName,
          s.academicYear,
          s.house,
          s.mobile,
          s.email,
          s.address,
          s.fatherName,
          s.fatherMobile,
          s.motherName,
          s.motherMobile,
          s.status,
          s.entranceScore ?? '',
        ])
      : [
          [
            '',
            '01',
            'Aarav',
            'Sharma',
            '2013-04-12',
            'Male',
            'B+',
            '',
            'General',
            'Class 6',
            'A',
            '2025-26',
            'Blue',
            '9876543210',
            'aarav@example.com',
            '123 Green Park, Jaipur',
            'Rajesh Sharma',
            '9876543211',
            'Neha Sharma',
            '9876543212',
            'Active',
            '95.4',
          ],
        ];

  const ws = XLSX.utils.aoa_to_sheet([[...HEADERS], ...sample]);
  ws['!cols'] = HEADERS.map(() => ({ wch: 16 }));
  XLSX.utils.book_append_sheet(wb, ws, 'Students');

  const guide = [
    ['Field', 'Notes'],
    ['Admission No.', 'Optional. Auto-generated if blank.'],
    ['First Name', 'Required (or use Student Name column).'],
    ['Class', 'Required. Match Institution Setup → Classes & Sections.'],
    ['Date of Birth', 'YYYY-MM-DD or DD/MM/YYYY'],
    ['Status', 'Active, Inactive, Passout, Transferred'],
    ['Gender', 'Male, Female, Other'],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(guide), 'Instructions');
  XLSX.writeFile(
    wb,
    existing.length ? 'Students_Export.xlsx' : 'Students_Import_Template.xlsx',
  );
}

export function parseStudentWorkbook(file: ArrayBuffer): Record<string, unknown>[] {
  const wb = XLSX.read(new Uint8Array(file), { type: 'array', cellDates: true });
  const sheetName =
    wb.SheetNames.find((n) => normalizeHeader(n) === 'students') ||
    wb.SheetNames.find((n) => normalizeHeader(n) !== 'instructions') ||
    wb.SheetNames[0];
  if (!sheetName) return [];

  const matrix = XLSX.utils.sheet_to_json<(string | number | Date | null)[]>(wb.Sheets[sheetName], {
    header: 1,
    defval: '',
    raw: true,
    blankrows: false,
  }) as (string | number | Date | null)[][];

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
    admissionNumber: idx(['admission no', 'admission number', 'admission no.']),
    rollNumber: idx(['roll no', 'roll number', 'roll no.']),
    firstName: idx(['first name']),
    lastName: idx(['last name']),
    fullName: idx(['student name', 'name', 'full name']),
    dateOfBirth: idx(['date of birth', 'dob']),
    gender: idx(['gender']),
    bloodGroup: idx(['blood group']),
    aadhaarNumber: idx(['aadhaar', 'aadhaar number']),
    category: idx(['category']),
    className: idx(['class', 'class name', 'class grade']),
    sectionName: idx(['section', 'section name']),
    academicYear: idx(['academic year', 'session']),
    house: idx(['house']),
    mobile: idx(['mobile', 'phone']),
    email: idx(['email']),
    address: idx(['address']),
    fatherName: idx(['father name', 'father']),
    fatherMobile: idx(['father mobile', 'father phone']),
    motherName: idx(['mother name', 'mother']),
    motherMobile: idx(['mother mobile', 'mother phone']),
    status: idx(['status']),
    entranceScore: idx(['entrance score', 'percentage', 'marks']),
  };

  const rows: Record<string, unknown>[] = [];
  for (let r = 1; r < nonEmpty.length; r++) {
    const row = nonEmpty[r] || [];
    const get = (i: number) => (i >= 0 ? cell(row[i]) : '');

    const fullName = get(col.fullName);
    const firstName = get(col.firstName) || fullName.split(/\s+/)[0] || '';
    const lastName =
      get(col.lastName) || fullName.split(/\s+/).slice(1).join(' ') || '';

    if (!firstName && !fullName) continue;

    rows.push({
      admissionNumber: get(col.admissionNumber),
      firstName: firstName || fullName,
      lastName,
      fullName: fullName || [firstName, lastName].filter(Boolean).join(' '),
      dateOfBirth: get(col.dateOfBirth),
      gender: get(col.gender),
      bloodGroup: get(col.bloodGroup),
      aadhaarNumber: get(col.aadhaarNumber),
      category: get(col.category),
      className: get(col.className),
      sectionName: get(col.sectionName),
      academicYear: get(col.academicYear),
      house: get(col.house),
      rollNumber: get(col.rollNumber),
      mobile: get(col.mobile),
      email: get(col.email),
      address: get(col.address),
      fatherName: get(col.fatherName),
      fatherMobile: get(col.fatherMobile),
      motherName: get(col.motherName),
      motherMobile: get(col.motherMobile),
      status: get(col.status),
      entranceScore: get(col.entranceScore),
    });
  }
  return rows;
}

export function exportStudentsToExcel(students: Student[], filename = 'Students_Export.xlsx') {
  downloadStudentTemplate(students);
  void filename;
}
