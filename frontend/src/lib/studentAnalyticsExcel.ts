import * as XLSX from 'xlsx';
import type { StudentAnalyticsRecord } from './studentAnalyticsRecordServices';
import { AREA_SCORE_KEYS, AREA_SCORE_LABELS } from './studentAnalyticsCategories';

function analyticsRow(r: StudentAnalyticsRecord) {
  return [
    r.recordId,
    r.name,
    r.classGroup,
    r.academicYear,
    r.statusLabel,
    r.scores.growthScore,
    r.scores.aiRiskScore,
    ...AREA_SCORE_KEYS.map((k) => r.scores[k]),
    r.riskFlags.dropoutRisk ? 'Yes' : 'No',
    r.riskFlags.lowPerformanceRisk ? 'Yes' : 'No',
    r.riskFlags.feeDefaultRisk ? 'Yes' : 'No',
    new Date(r.computedAt).toLocaleString('en-IN'),
  ];
}

const ANALYTICS_HEADERS = [
  'Record ID', 'Student Name', 'Class / Group', 'Academic Year', 'Status',
  'Growth Score', 'AI Risk Score',
  ...AREA_SCORE_KEYS.map((k) => AREA_SCORE_LABELS[k]),
  'Dropout Risk', 'Low Performance', 'Fee Default', 'Computed At',
];

function writeCategoryWorkbook(records: StudentAnalyticsRecord[], sheetName: string, filename: string) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([ANALYTICS_HEADERS, ...records.map(analyticsRow)]),
    sheetName.slice(0, 31),
  );
  XLSX.writeFile(wb, filename);
}

export function downloadRedCategoryExcel(records: StudentAnalyticsRecord[]) {
  writeCategoryWorkbook(
    records,
    'Red Category',
    `Student_Analytics_Red_Category_${new Date().toISOString().slice(0, 10)}.xlsx`,
  );
}

export function downloadExceptionalExcel(records: StudentAnalyticsRecord[]) {
  writeCategoryWorkbook(
    records,
    'Exceptional',
    `Student_Analytics_Exceptional_${new Date().toISOString().slice(0, 10)}.xlsx`,
  );
}

export function downloadStudentAnalyticsRecordExcel(
  record: StudentAnalyticsRecord,
  student: {
    admissionNumber: string;
    rollNumber: string;
    mobile: string;
    fatherName: string;
    motherName: string;
    status: string;
    entranceScore: number | null;
  },
) {
  const wb = XLSX.utils.book_new();

  const info = XLSX.utils.aoa_to_sheet([
    ['Record ID', record.recordId],
    ['Student Name', record.name],
    ['Class / Group', record.classGroup],
    ['Academic Year', record.academicYear],
    ['Admission No.', student.admissionNumber],
    ['Roll No.', student.rollNumber],
    ['Status', student.status],
    ['Mobile', student.mobile],
    ['Father', student.fatherName],
    ['Mother', student.motherName],
    ['Entrance Score', student.entranceScore ?? ''],
    ['Computed At', new Date(record.computedAt).toLocaleString('en-IN')],
  ]);
  XLSX.utils.book_append_sheet(wb, info, 'Student Info');

  const scores = Object.entries(record.scores).map(([key, value]) => [
    key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()),
    value,
  ]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Score', 'Value'], ...scores]), 'Scores');

  const flags = Object.entries(record.riskFlags).map(([key, value]) => [
    key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()),
    value ? 'Flagged' : 'Clear',
  ]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Risk Flag', 'Status'], ...flags]), 'Risk Flags');

  const safeId = record.recordId.replace(/[^a-zA-Z0-9_-]+/g, '_');
  XLSX.writeFile(wb, `${safeId}_Analytics.xlsx`);
}

export function downloadStudentAnalyticsListExcel(records: StudentAnalyticsRecord[]) {
  writeCategoryWorkbook(
    records,
    'All Analytics',
    `Student_Analytics_All_${new Date().toISOString().slice(0, 10)}.xlsx`,
  );
}
