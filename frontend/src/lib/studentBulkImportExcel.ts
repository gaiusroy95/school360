import * as XLSX from 'xlsx';
import type { BulkImportBatch } from './studentBulkImportServices';
import type { Student } from './studentServices';

const STUDENT_HEADERS = [
  'Admission No.', 'Roll No.', 'First Name', 'Last Name', 'Date of Birth', 'Gender',
  'Blood Group', 'Aadhaar Number', 'Category', 'Class', 'Section', 'Academic Year',
  'House', 'Mobile', 'Email', 'Address', 'Father Name', 'Father Mobile', 'Mother Name', 'Mother Mobile', 'Status', 'Entrance Score',
];

export function downloadBulkImportExport(batches: BulkImportBatch[], students: Student[]) {
  const wb = XLSX.utils.book_new();

  const batchSheet = XLSX.utils.aoa_to_sheet([
    ['Record ID', 'File Name', 'Class / Group', 'Academic Year', 'Total Rows', 'Created', 'Updated', 'Errors', 'Status', 'Updated'],
    ...batches.map((b) => [
      b.recordId,
      b.fileName,
      b.classGroup,
      b.academicYear,
      b.totalRows,
      b.createdCount,
      b.updatedCount,
      b.errorCount,
      b.statusLabel,
      new Date(b.updatedAt).toLocaleDateString('en-IN'),
    ]),
  ]);
  XLSX.utils.book_append_sheet(wb, batchSheet, 'Import History');

  const studentSheet = XLSX.utils.aoa_to_sheet([
    STUDENT_HEADERS,
    ...students.map((s) => [
      s.admissionNumber, s.rollNumber, s.firstName, s.lastName, s.dateOfBirth, s.gender,
      s.bloodGroup, s.aadhaarNumber, s.category, s.className, s.sectionName, s.academicYear,
      s.house, s.mobile, s.email, s.address, s.fatherName, s.fatherMobile, s.motherName, s.motherMobile, s.status, s.entranceScore ?? '',
    ]),
  ]);
  XLSX.utils.book_append_sheet(wb, studentSheet, 'Students');

  XLSX.writeFile(wb, `Bulk_Import_Export_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export { downloadStudentTemplate as downloadBulkImportTemplate } from './studentExcel';
