import * as XLSX from 'xlsx';
import type { AdmissionReportData, ReportSheetKey } from './admissionReportsServices';

const SHEET_CONFIG: Record<
  ReportSheetKey,
  { title: string; columns: Array<{ key: string; header: string }> }
> = {
  summary: {
    title: 'Summary',
    columns: [
      { key: 'institutionName', header: 'Institution' },
      { key: 'academicYear', header: 'Academic Year' },
      { key: 'dateFrom', header: 'Date From' },
      { key: 'dateTo', header: 'Date To' },
      { key: 'generatedAt', header: 'Generated At' },
      { key: 'enquiries', header: 'Enquiries' },
      { key: 'applications', header: 'Applications' },
      { key: 'followUps', header: 'Follow Ups' },
      { key: 'counsellingSessions', header: 'Counselling Sessions' },
      { key: 'meritEntries', header: 'Merit List Entries' },
      { key: 'seatAllocations', header: 'Seat Allocations' },
      { key: 'admissionsTotal', header: 'Admissions (Total)' },
      { key: 'admissionsConfirmed', header: 'Admissions (Confirmed)' },
      { key: 'feeReceipts', header: 'Fee Receipts' },
      { key: 'totalFeeCollected', header: 'Total Fee Collected' },
      { key: 'currency', header: 'Currency' },
    ],
  },
  consolidatedNewAdmissions: {
    title: 'Consolidated New Admissions',
    columns: [
      { key: 'admissionNumber', header: 'Admission No.' },
      { key: 'studentName', header: 'Student Name' },
      { key: 'fatherName', header: 'Father Name' },
      { key: 'motherName', header: 'Mother Name' },
      { key: 'mobile', header: 'Mobile' },
      { key: 'email', header: 'Email' },
      { key: 'className', header: 'Class' },
      { key: 'sectionName', header: 'Section' },
      { key: 'academicYear', header: 'Academic Year' },
      { key: 'admissionStatus', header: 'Admission Status' },
      { key: 'applicationId', header: 'Application ID' },
      { key: 'applicationStatus', header: 'Application Status' },
      { key: 'enquiryId', header: 'Enquiry ID' },
      { key: 'enquirySource', header: 'Enquiry Source' },
      { key: 'entranceTestTitle', header: 'Entrance Test' },
      { key: 'entranceScorePercent', header: 'Entrance Score %' },
      { key: 'meritRank', header: 'Merit Rank' },
      { key: 'seatStatus', header: 'Seat Status' },
      { key: 'principalApprovedAt', header: 'Principal Approved' },
      { key: 'confirmedAt', header: 'Confirmed At' },
      { key: 'feeReceiptCount', header: 'Fee Receipts' },
      { key: 'totalFeeCollected', header: 'Total Fee Collected' },
      { key: 'lastReceiptNumber', header: 'Last Receipt No.' },
      { key: 'lastPaymentMode', header: 'Last Payment Mode' },
      { key: 'lastFeeCollectedAt', header: 'Last Fee Collected At' },
    ],
  },
  enquiries: {
    title: 'Enquiries',
    columns: [
      { key: 'enquiryId', header: 'Enquiry ID' },
      { key: 'enquiryDate', header: 'Enquiry Date' },
      { key: 'enquirerName', header: 'Enquirer Name' },
      { key: 'mobile', header: 'Mobile' },
      { key: 'email', header: 'Email' },
      { key: 'classInterested', header: 'Class Interested' },
      { key: 'source', header: 'Source' },
      { key: 'status', header: 'Status' },
      { key: 'assignedTo', header: 'Assigned To' },
      { key: 'nextFollowUp', header: 'Next Follow Up' },
      { key: 'lastContactedAt', header: 'Last Contacted' },
      { key: 'notes', header: 'Notes' },
    ],
  },
  applications: {
    title: 'Applications',
    columns: [
      { key: 'applicationId', header: 'Application ID' },
      { key: 'submittedAt', header: 'Submitted At' },
      { key: 'studentName', header: 'Student Name' },
      { key: 'fatherName', header: 'Father Name' },
      { key: 'motherName', header: 'Mother Name' },
      { key: 'classApplied', header: 'Class Applied' },
      { key: 'mobile', header: 'Mobile' },
      { key: 'email', header: 'Email' },
      { key: 'status', header: 'Status' },
      { key: 'enquiryId', header: 'Enquiry ID' },
      { key: 'submittedBy', header: 'Submitted By' },
      { key: 'entranceTestScore', header: 'Entrance Score' },
      { key: 'reviewedBy', header: 'Reviewed By' },
      { key: 'reviewedAt', header: 'Reviewed At' },
    ],
  },
  followUps: {
    title: 'Follow Ups',
    columns: [
      { key: 'enquiryId', header: 'Enquiry ID' },
      { key: 'enquirerName', header: 'Enquirer Name' },
      { key: 'mobile', header: 'Mobile' },
      { key: 'title', header: 'Task Title' },
      { key: 'mode', header: 'Mode' },
      { key: 'subject', header: 'Subject' },
      { key: 'assignedTo', header: 'Assigned To' },
      { key: 'dueDate', header: 'Due Date' },
      { key: 'status', header: 'Status' },
      { key: 'discussionNotes', header: 'Discussion Notes' },
    ],
  },
  counselling: {
    title: 'Counselling',
    columns: [
      { key: 'enquiryId', header: 'Enquiry ID' },
      { key: 'enquirerName', header: 'Enquirer Name' },
      { key: 'mobile', header: 'Mobile' },
      { key: 'interactionType', header: 'Interaction Type' },
      { key: 'sentiment', header: 'Sentiment' },
      { key: 'engagement', header: 'Engagement' },
      { key: 'riskFactor', header: 'Risk Factor' },
      { key: 'riskDetails', header: 'Risk Details' },
      { key: 'remarks', header: 'Remarks' },
      { key: 'actionIntent', header: 'Action Intent' },
      { key: 'counselorName', header: 'Counselor' },
      { key: 'nextFollowUp', header: 'Next Follow Up' },
      { key: 'createdAt', header: 'Logged At' },
    ],
  },
  meritList: {
    title: 'Merit List',
    columns: [
      { key: 'rank', header: 'Rank' },
      { key: 'applicationId', header: 'Application ID' },
      { key: 'studentName', header: 'Student Name' },
      { key: 'classApplied', header: 'Class' },
      { key: 'mobile', header: 'Mobile' },
      { key: 'email', header: 'Email' },
      { key: 'testTitle', header: 'Test' },
      { key: 'scorePercent', header: 'Score %' },
      { key: 'rawScore', header: 'Raw Score' },
      { key: 'maxScore', header: 'Max Score' },
      { key: 'passed', header: 'Passed' },
      { key: 'submittedAt', header: 'Submitted At' },
    ],
  },
  seatAllocation: {
    title: 'Seat Allocation',
    columns: [
      { key: 'applicationId', header: 'Application ID' },
      { key: 'studentName', header: 'Student Name' },
      { key: 'className', header: 'Class' },
      { key: 'sectionName', header: 'Section' },
      { key: 'meritRank', header: 'Merit Rank' },
      { key: 'classMeritRank', header: 'Class Merit Rank' },
      { key: 'entranceScore', header: 'Entrance Score' },
      { key: 'status', header: 'Status' },
      { key: 'academicYear', header: 'Academic Year' },
      { key: 'allocatedAt', header: 'Allocated At' },
      { key: 'allocatedBy', header: 'Allocated By' },
    ],
  },
  admissions: {
    title: 'Admissions',
    columns: [
      { key: 'admissionNumber', header: 'Admission No.' },
      { key: 'applicationId', header: 'Application ID' },
      { key: 'studentName', header: 'Student Name' },
      { key: 'fatherName', header: 'Father Name' },
      { key: 'mobile', header: 'Mobile' },
      { key: 'email', header: 'Email' },
      { key: 'className', header: 'Class' },
      { key: 'sectionName', header: 'Section' },
      { key: 'academicYear', header: 'Academic Year' },
      { key: 'status', header: 'Status' },
      { key: 'enquiryId', header: 'Enquiry ID' },
      { key: 'enquirySource', header: 'Source' },
      { key: 'principalApprovedAt', header: 'Principal Approved' },
      { key: 'confirmedAt', header: 'Confirmed At' },
      { key: 'confirmedBy', header: 'Confirmed By' },
      { key: 'feeReceiptCount', header: 'Fee Receipts' },
      { key: 'totalFeeCollected', header: 'Total Fee Collected' },
    ],
  },
  feeCollection: {
    title: 'Fee Collection',
    columns: [
      { key: 'receiptNumber', header: 'Receipt No.' },
      { key: 'studentName', header: 'Student Name' },
      { key: 'admissionNumber', header: 'Admission No.' },
      { key: 'className', header: 'Class' },
      { key: 'sectionName', header: 'Section' },
      { key: 'academicYear', header: 'Academic Year' },
      { key: 'paymentMode', header: 'Payment Mode' },
      { key: 'amountPaid', header: 'Amount Paid' },
      { key: 'feeBreakdown', header: 'Fee Breakdown' },
      { key: 'remarks', header: 'Remarks' },
      { key: 'collectedBy', header: 'Collected By' },
      { key: 'collectedAt', header: 'Collected At' },
    ],
  },
};

function rowsToAoA(
  rows: Record<string, unknown>[],
  columns: Array<{ key: string; header: string }>,
): (string | number)[][] {
  const headerRow = columns.map((c) => c.header);
  const dataRows = rows.map((row) =>
    columns.map((c) => {
      const v = row[c.key];
      if (v == null) return '';
      if (typeof v === 'number') return v;
      return String(v);
    }),
  );
  return [headerRow, ...dataRows];
}

export function downloadAdmissionReportsExcel(
  data: AdmissionReportData,
  academicYear: string,
) {
  const wb = XLSX.utils.book_new();
  const sheetOrder: ReportSheetKey[] = [
    'summary',
    'consolidatedNewAdmissions',
    'enquiries',
    'applications',
    'followUps',
    'counselling',
    'meritList',
    'seatAllocation',
    'admissions',
    'feeCollection',
  ];

  for (const key of sheetOrder) {
    const config = SHEET_CONFIG[key];
    const rows = data.sheets[key] || [];
    const aoa = rowsToAoA(rows, config.columns);
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const colWidths = config.columns.map((c) => ({
      wch: Math.min(40, Math.max(c.header.length + 2, 14)),
    }));
    ws['!cols'] = colWidths;
    XLSX.utils.book_append_sheet(wb, ws, config.title.slice(0, 31));
  }

  const safeYear = academicYear.replace(/[^\w-]+/g, '_');
  const dateStamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Admission_CRM_Reports_${safeYear}_${dateStamp}.xlsx`);
}

export { SHEET_CONFIG };
