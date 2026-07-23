import * as XLSX from 'xlsx';
import type { FinancialReportPayload, FinancialReportsPack } from './feeFinanceServices';

function formatCell(value: unknown): string | number | boolean {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return value as string | number | boolean;
}

function labelize(key: string) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

function safeSheetName(name: string, used: Set<string>) {
  let base = name.replace(/[\\/?*[\]:]/g, ' ').trim().slice(0, 31) || 'Sheet';
  let candidate = base;
  let i = 2;
  while (used.has(candidate)) {
    const suffix = ` (${i})`;
    candidate = `${base.slice(0, Math.max(1, 31 - suffix.length))}${suffix}`;
    i += 1;
  }
  used.add(candidate);
  return candidate;
}

function appendReportSheets(wb: XLSX.WorkBook, report: FinancialReportPayload, usedNames: Set<string>) {
  const infoName = safeSheetName(`${report.tab} Info`.slice(0, 31), usedNames);
  const infoSheet = XLSX.utils.aoa_to_sheet([
    ['Report', report.reportTitle],
    ['Tab', report.tab],
    ['Type', report.reportType],
    ['Academic Year', report.academicYear],
    ['Financial Year', report.financialYear],
    ['Pay Period', report.payPeriod || '—'],
    ['Generated At', new Date(report.generatedAt).toLocaleString('en-IN')],
    ['Total Rows', report.rows.length],
  ]);
  XLSX.utils.book_append_sheet(wb, infoSheet, infoName);

  const summaryEntries = Object.entries(report.summary || {});
  if (summaryEntries.length > 0) {
    const summaryName = safeSheetName(`${report.tab} Summary`.slice(0, 31), usedNames);
    const summaryData = [
      ['Metric', 'Value'],
      ...summaryEntries.map(([k, v]) => [labelize(k), formatCell(v)]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryData), summaryName);
  }

  const dataName = safeSheetName(report.tab.slice(0, 31) || report.reportType, usedNames);
  if (report.rows.length === 0) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['No data available']]), dataName);
    return;
  }

  const columns = report.columns?.length
    ? report.columns
    : [...new Set(report.rows.flatMap((r) => Object.keys(r)))].map((key) => ({ key, label: labelize(key) }));

  const data = [
    columns.map((c) => c.label),
    ...report.rows.map((row) => columns.map((c) => formatCell(row[c.key]))),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), dataName);
}

export function downloadFinancialReportExcel(report: FinancialReportPayload) {
  const wb = XLSX.utils.book_new();
  const used = new Set<string>();
  appendReportSheets(wb, report, used);
  const safeType = report.reportType.replace(/[^a-zA-Z0-9_-]+/g, '_');
  const year = report.academicYear.replace(/[^a-zA-Z0-9_-]+/g, '_');
  XLSX.writeFile(wb, `Financial_${safeType}_${year}.xlsx`);
}

export function downloadAllFinancialReportsExcel(pack: FinancialReportsPack) {
  const wb = XLSX.utils.book_new();
  const used = new Set<string>();

  const indexName = safeSheetName('All Reports Index', used);
  const indexData = [
    ['Academic Year', pack.academicYear],
    ['Financial Year', pack.financialYear],
    ['Pay Period', pack.payPeriod || '—'],
    ['Generated At', new Date(pack.generatedAt).toLocaleString('en-IN')],
    ['Report Count', pack.reportCount],
    [],
    ['#', 'Tab', 'Report', 'Rows'],
    ...pack.reports.map((r, i) => [i + 1, r.tab, r.reportTitle, r.rows.length]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(indexData), indexName);

  for (const report of pack.reports) {
    appendReportSheets(wb, report, used);
  }

  const year = pack.academicYear.replace(/[^a-zA-Z0-9_-]+/g, '_');
  XLSX.writeFile(wb, `Financial_All_Reports_${year}.xlsx`);
}
