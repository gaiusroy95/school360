import * as XLSX from 'xlsx';
import type { FeedbackRecord } from './parentFeedbackServices';

export function downloadParentFeedbackExcel(records: FeedbackRecord[], filename = 'Parent_Feedback_By_Child.xlsx') {
  const headers = [
    'Record ID',
    'Submitted Date',
    'Submitted Time',
    'Source',
    'Parent Name',
    'Registered Mobile',
    'Relationship',
    'Child Name',
    'Class / Section',
    'Rating',
    'Category',
    'Feedback Message',
  ];

  const rows = records.map((r) => {
    const dt = new Date(r.submittedAt);
    return [
      r.recordId,
      dt.toLocaleDateString('en-IN'),
      dt.toLocaleTimeString('en-IN'),
      r.sourceLabel,
      r.parentName,
      r.parentMobile,
      r.relationshipLabel,
      r.studentName,
      r.classGroup,
      r.rating,
      r.category,
      r.message,
    ];
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([headers, ...rows]), 'Feedback by Child');
  XLSX.writeFile(wb, filename);
}
