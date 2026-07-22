import * as XLSX from 'xlsx';
import type { StudentReport } from './studentReportServices';

function labelize(key: string) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

function formatCell(value: unknown): string | number | boolean {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return value as string | number | boolean;
}

function sheetFromObjects(rows: Record<string, unknown>[], sheetName: string) {
  if (rows.length === 0) {
    return { name: sheetName.slice(0, 31), data: [['No data available']] };
  }
  const columns = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const data = [
    columns.map(labelize),
    ...rows.map((row) => columns.map((col) => formatCell(row[col]))),
  ];
  return { name: sheetName.slice(0, 31), data };
}

function sheetFromKeyValues(obj: Record<string, unknown>, sheetName: string) {
  const entries = Object.entries(obj);
  if (entries.length === 0) {
    return { name: sheetName.slice(0, 31), data: [['No data available']] };
  }
  return {
    name: sheetName.slice(0, 31),
    data: [['Metric', 'Value'], ...entries.map(([k, v]) => [labelize(k), formatCell(v)])],
  };
}

/** Flatten class breakdown entries that contain nested student arrays */
function flattenClassBreakdown(classBreakdown: Record<string, unknown>[]) {
  const flatStudents: Record<string, unknown>[] = [];
  for (const item of classBreakdown) {
    const nested = item.students;
    if (Array.isArray(nested)) {
      for (const s of nested) {
        if (s && typeof s === 'object') {
          flatStudents.push({
            className: item.className ?? '',
            ...(s as Record<string, unknown>),
          });
        }
      }
    }
  }
  return flatStudents;
}

export function downloadStudentReportExcel(report: StudentReport) {
  const data = report.data || {};
  const summary = (data.summary || {}) as Record<string, unknown>;
  const rows = (data.rows || []) as Record<string, unknown>[];
  const toppers = (data.toppers || []) as Record<string, unknown>[];
  const classBreakdown = (data.classBreakdown || data.classResults || data.classStats || []) as Record<string, unknown>[];

  const wb = XLSX.utils.book_new();

  const infoSheet = XLSX.utils.aoa_to_sheet([
    ['Report ID', report.recordId],
    ['Report Name', report.name],
    ['Report Type', report.reportTypeLabel],
    ['Period', report.period],
    ['Class / Group', report.classGroup],
    ['Academic Year', report.academicYear],
    ['Status', report.statusLabel],
    ['Generated At', new Date(report.generatedAt).toLocaleString('en-IN')],
    ['Total Student Rows', rows.length],
  ]);
  XLSX.utils.book_append_sheet(wb, infoSheet, 'Report Info');

  if (Object.keys(summary).length > 0) {
    const s = sheetFromKeyValues(summary, 'Summary');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s.data), s.name);
  }

  if (classBreakdown.length > 0) {
    const breakdownRows = classBreakdown.map((row) => {
      const copy = { ...row };
      delete copy.students;
      return copy;
    });
    const s = sheetFromObjects(breakdownRows, 'Class Breakdown');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s.data), s.name);

    const nested = flattenClassBreakdown(classBreakdown);
    if (nested.length > 0) {
      const ns = sheetFromObjects(nested, 'Class Students');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ns.data), ns.name);
    }
  }

  if (toppers.length > 0) {
    const s = sheetFromObjects(toppers, 'Toppers');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s.data), s.name);
  }

  if (rows.length > 0) {
    const s = sheetFromObjects(rows, 'All Students');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s.data), s.name);
  }

  const safeId = report.recordId.replace(/[^a-zA-Z0-9_-]+/g, '_');
  const safeName = report.name.replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 40);
  XLSX.writeFile(wb, `${safeId}_${safeName}.xlsx`);
}

export function countReportStudentRows(report: StudentReport): number {
  const data = report.data || {};
  const rows = (data.rows || []) as unknown[];
  const toppers = (data.toppers || []) as unknown[];
  const classBreakdown = (data.classBreakdown || []) as Record<string, unknown>[];
  const nested = flattenClassBreakdown(classBreakdown);
  return Math.max(rows.length, toppers.length, nested.length);
}
