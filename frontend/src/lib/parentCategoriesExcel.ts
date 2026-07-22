import * as XLSX from 'xlsx';
import type { ParentSegmentParent, SegmentDefinition } from './parentCategoryServices';

export function downloadParentSegmentsExcel(
  segments: SegmentDefinition[],
  parents: ParentSegmentParent[],
  filename = 'Parent_Categories_Analytics.xlsx',
) {
  const wb = XLSX.utils.book_new();

  const matrixHeaders = ['Category', 'Data Profile', 'The Reality', 'Count', 'Share %'];
  const matrixRows = segments.map((s) => [s.name, s.dataProfile, s.reality, s.count, `${s.percent}%`]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([matrixHeaders, ...matrixRows]), 'Segment Matrix');

  const parentHeaders = [
    'Rank (lowest child perf first)', 'Parent Name', 'Segment', 'PES Score', 'Child Performance', 'Relationship', 'Mobile',
    'Students', 'Status', 'Attendance (A)', 'Read Rate (R)', 'Proactive (M)', 'Feedback (F)', 'Flags',
  ];
  const parentRows = parents.map((p, i) => [
    i + 1,
    p.name,
    p.segmentName,
    p.pesScore,
    p.childPerformanceScore,
    p.relationship,
    p.mobile,
    p.students.map((s) => `${s.name} (${s.class})`).join('; '),
    p.status,
    p.pesComponents.attendance,
    p.pesComponents.readRate,
    p.pesComponents.proactiveMessages,
    p.pesComponents.feedback,
    p.flags.join('; '),
  ]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([parentHeaders, ...parentRows]), 'Parents by Segment');

  XLSX.writeFile(wb, filename);
}

export async function parseParentSegmentsImport(file: File): Promise<{ parentKey: string; segmentId: string }[]> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheet = wb.Sheets['Parents by Segment'] || wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 }) as string[][];
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => String(h).toLowerCase());
  const keyIdx = headers.findIndex((h) => h.includes('parent key'));
  const segIdx = headers.findIndex((h) => h.includes('segment'));
  if (keyIdx < 0) return [];
  return rows.slice(1).filter((r) => r[keyIdx]).map((r) => ({
    parentKey: String(r[keyIdx]),
    segmentId: segIdx >= 0 ? String(r[segIdx]) : '',
  }));
}
