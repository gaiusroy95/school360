import { StudentReportType, StudentStatus } from '@prisma/client';
import { prisma } from './prisma.js';
import { getInstitutionFilterMeta, getStudentAnalytics } from './students.js';
import { REPORT_TYPE_UI, generateStudentReport } from './studentReports.js';
import { ACADEMIC_REPORT_CATALOG, generateAcademicReport } from './academicReports.js';
import { getAllAttendanceReports } from './attendanceReports.js';
import { FINANCIAL_REPORT_CATALOG, generateFinancialReport } from './financialReports.js';
import { getFeeDashboard } from './feeDashboard.js';
import { HR_REPORT_CATALOG, generateHrReport } from './hrReports.js';
import { generateLibraryReport } from './libraryReportsAnalytics.js';
import { HOSTEL_REPORT_CATALOG, generateHostelReport } from './hostelReportsAnalytics.js';
import { generateInventoryReport } from './inventoryReportsAnalytics.js';
import { getTransportReportsAnalytics } from './transportReportsAnalytics.js';

const ACADEMIC_YEARS = ['2023-24', '2024-25', '2025-26', '2026-27'];

export type RaCategoryKey =
  | 'student'
  | 'academic'
  | 'attendance'
  | 'examination'
  | 'finance'
  | 'hr'
  | 'library'
  | 'transport'
  | 'hostel'
  | 'inventory'
  | 'custom';

export const VIEW_TO_CATEGORY: Record<string, RaCategoryKey | null> = {
  'Reports Dashboard': null,
  'Student Reports': 'student',
  'Academic Reports': 'academic',
  'Attendance Reports': 'attendance',
  'Examination Reports': 'examination',
  'Finance Reports': 'finance',
  'HR Reports': 'hr',
  'Library Reports': 'library',
  'Transport Reports': 'transport',
  'Hostel Reports': 'hostel',
  'Inventory Reports': 'inventory',
  'Custom Reports': 'custom',
};

export type RaReportItem = {
  key: string;
  name: string;
  description: string;
  sourceModule: string;
  sourceTab?: string;
  locked?: boolean;
};

export type RaReportGroup = {
  id: string;
  label: string;
  reports: RaReportItem[];
};

const ATTENDANCE_REPORT_CATALOG: RaReportGroup[] = [
  {
    id: 'student',
    label: 'Student Attendance',
    reports: [
      { key: 'student-attendance', name: 'Student Attendance Report', description: 'Class-wise student attendance with present/absent/leave breakdown', sourceModule: 'Attendance Management', sourceTab: 'Student Attendance' },
      { key: 'class-wise-attendance', name: 'Class-wise Attendance Summary', description: 'Aggregated attendance % by class and section', sourceModule: 'Attendance Management', sourceTab: 'Student Attendance' },
      { key: 'low-attendance-alert', name: 'Low Attendance Alert Report', description: 'Students below 75% attendance threshold', sourceModule: 'Attendance Management', sourceTab: 'Student Attendance' },
      { key: 'monthly-register', name: 'Monthly Attendance Register', description: 'Day-wise attendance register for audit', sourceModule: 'Attendance Management', sourceTab: 'Student Attendance' },
    ],
  },
  {
    id: 'staff',
    label: 'Teacher & Staff Attendance',
    reports: [
      { key: 'teacher-attendance', name: 'Teacher Attendance Report', description: 'Teacher daily/monthly attendance summary', sourceModule: 'Attendance Management', sourceTab: 'Teacher Attendance' },
      { key: 'staff-attendance', name: 'Staff Attendance Report', description: 'Non-teaching staff attendance register', sourceModule: 'Attendance Management', sourceTab: 'Staff Attendance' },
      { key: 'combined-summary', name: 'Combined Attendance Summary', description: 'Students, teachers & staff attendance KPIs', sourceModule: 'Attendance Management' },
    ],
  },
];

const EXAMINATION_REPORT_CATALOG: RaReportGroup[] = [
  {
    id: 'results',
    label: 'Examination Results',
    reports: [
      { key: 'result-analysis', name: 'Exam Result Analysis', description: 'Overall pass/fail and grade distribution from published results', sourceModule: 'Examination Management', sourceTab: 'Result Processing' },
      { key: 'class-performance', name: 'Class Performance Report', description: 'Class-wise average marks, highest, lowest & pass %', sourceModule: 'Examination Management', sourceTab: 'Result Processing' },
      { key: 'subject-performance', name: 'Subject-wise Performance', description: 'Subject averages and failure rates across classes', sourceModule: 'Examination Management', sourceTab: 'Result Processing' },
      { key: 'pass-fail-analysis', name: 'Pass / Fail Analysis', description: 'Students grouped by performance bands', sourceModule: 'Examination Management' },
      { key: 'merit-list', name: 'Merit List Report', description: 'Top rankers by class and overall', sourceModule: 'Examination Management', sourceTab: 'Merit List' },
    ],
  },
  {
    id: 'report-cards',
    label: 'Report Cards',
    reports: [
      { key: 'report-card-status', name: 'Report Card Generation Status', description: 'Batch-wise report card readiness and publish status', sourceModule: 'Examination Management', sourceTab: 'Report Cards' },
      { key: 'board-upload-register', name: 'Board Upload Register', description: 'Board exam mark sheet upload tracking', sourceModule: 'Examination Management', sourceTab: 'Report Cards' },
    ],
  },
];

const TRANSPORT_REPORT_GROUPS: RaReportGroup[] = [
  { id: 'executive', label: 'Executive MIS', reports: ['Executive MIS Report', 'Daily Transport Summary', 'Weekly MIS Report', 'Monthly MIS Report'].map((name, i) => ({ key: `transport-exec-${i}`, name, description: `${name} — synced from Transport Management`, sourceModule: 'Transport Management', sourceTab: 'Reports & Analytics' })) },
  { id: 'operational', label: 'Operational', reports: ['Fleet Utilization Report', 'Route Performance Report', 'Student Transport Report', 'Trip Summary Report'].map((name, i) => ({ key: `transport-ops-${i}`, name, description: `${name} — live fleet & route data`, sourceModule: 'Transport Management', sourceTab: 'Reports & Analytics' })) },
  { id: 'financial', label: 'Financial', reports: ['Revenue Report', 'Fuel Cost Report', 'Outstanding Report', 'Collection Efficiency Report'].map((name, i) => ({ key: `transport-fin-${i}`, name, description: `${name} — transport fee & expense analytics`, sourceModule: 'Transport Management', sourceTab: 'Transport Fees' })) },
];

const LIBRARY_REPORT_GROUPS: RaReportGroup[] = [
  {
    id: 'operational',
    label: 'Operational Registers',
    reports: [
      { key: 'issue_return_register', name: 'Issue/Return Register', description: 'Circulation register for accreditation audits', sourceModule: 'Library Management', sourceTab: 'Reports & Analytics' },
      { key: 'accession_register', name: 'Accession Register', description: 'Book accession & copy register', sourceModule: 'Library Management' },
      { key: 'fine_ledger', name: 'Fine Ledger', description: 'Fine levies, payments & outstanding', sourceModule: 'Library Management', sourceTab: 'Fine Management' },
      { key: 'weekly_defaulters', name: 'Weekly Defaulters List', description: 'Overdue books — scheduled to Principal', sourceModule: 'Library Management' },
    ],
  },
  {
    id: 'analytical',
    label: 'Analytical Reports',
    reports: [
      { key: 'title_copy_ratio', name: 'Title vs. Copy Ratio', description: 'Collection depth analysis', sourceModule: 'Library Management' },
      { key: 'procurement_analysis', name: 'Procurement Analysis', description: 'Acquisitions, vendors & spend', sourceModule: 'Library Management' },
      { key: 'subject_utilization', name: 'Subject-wise Utilization', description: 'Issues by subject/category', sourceModule: 'Library Management' },
      { key: 'dashboard_summary', name: 'Library Dashboard Summary', description: 'KPI data powering library dashboard charts', sourceModule: 'Library Management', sourceTab: 'Library Dashboard' },
    ],
  },
  {
    id: 'exception',
    label: 'Exception & Audit',
    reports: [
      { key: 'lost_books', name: 'Lost Books Report', description: 'Missing / written-off titles', sourceModule: 'Library Management' },
      { key: 'waived_fines_audit', name: 'Waived Fines Audit', description: 'Fine waivers with approver trail', sourceModule: 'Library Management' },
      { key: 'gate_bypass_logs', name: 'Gate Bypass Logs', description: 'Manual gate overrides & security exceptions', sourceModule: 'Library Management' },
    ],
  },
];

const INVENTORY_REPORT_GROUPS: RaReportGroup[] = [
  {
    id: 'operational',
    label: 'Operational Registers',
    reports: [
      { key: 'stock_ledger', name: 'Stock Ledger', description: 'Chronological transaction history per item', sourceModule: 'Inventory Management', sourceTab: 'Reports & Analytics' },
      { key: 'department_consumption', name: 'Department Consumption', description: 'Resource utilization by department', sourceModule: 'Inventory Management' },
      { key: 'dead_slow_moving', name: 'Dead / Slow Moving Stock', description: 'Items with zero movement in 180 days', sourceModule: 'Inventory Management' },
      { key: 'batch_expiry', name: 'Batch Expiry Report', description: 'Expired and nearing-expiry batches', sourceModule: 'Inventory Management' },
    ],
  },
  {
    id: 'financial',
    label: 'Financial & Compliance',
    reports: [
      { key: 'inventory_valuation', name: 'Inventory Valuation', description: 'Total stock value by store and category', sourceModule: 'Inventory Management', locked: true },
      { key: 'vendor_bills', name: 'Vendor Bills Summary', description: 'AP invoices and payment pipeline', sourceModule: 'Inventory Management', sourceTab: 'Vendor Bills', locked: true },
    ],
  },
];

function groupHrReports(): RaReportGroup[] {
  return HR_REPORT_CATALOG.map((cat) => ({
    id: cat.id,
    label: cat.title,
    reports: cat.sections.flatMap((s) =>
      s.reports.map((r) => ({
        key: r.key,
        name: r.label,
        description: s.title,
        sourceModule: 'HR Management',
        sourceTab: cat.title,
      })),
    ),
  }));
}

export function getCategoryCatalog(category: RaCategoryKey): RaReportGroup[] {
  switch (category) {
    case 'student':
      return [
        {
          id: 'student-mgmt',
          label: 'Student Management Reports',
          reports: Object.entries(REPORT_TYPE_UI).map(([key, name]) => ({
            key: key.toLowerCase(),
            name,
            description: `Synced from Student Management → Reports`,
            sourceModule: 'Student Management',
            sourceTab: 'Student Reports',
          })),
        },
        {
          id: 'student-analytics',
          label: 'Student Analytics',
          reports: [
            { key: 'strength-analysis', name: 'Student Strength Analysis', description: 'Class & gender-wise enrollment breakdown', sourceModule: 'Student Management', sourceTab: 'Student Analytics' },
            { key: 'document-compliance', name: 'Document Compliance Report', description: 'Uploaded documents vs required checklist', sourceModule: 'Student Management', sourceTab: 'Student Documents' },
            { key: 'category-wise', name: 'Category-wise Student Report', description: 'Students by admission category & quota', sourceModule: 'Student Management' },
          ],
        },
      ];
    case 'academic':
      return [
        {
          id: 'academic-mgmt',
          label: 'Academic Management Reports',
          reports: ACADEMIC_REPORT_CATALOG.map((r) => ({
            key: r.id,
            name: r.title,
            description: r.description,
            sourceModule: 'Academic Management',
            sourceTab: r.tab,
          })),
        },
      ];
    case 'attendance':
      return ATTENDANCE_REPORT_CATALOG;
    case 'examination':
      return EXAMINATION_REPORT_CATALOG;
    case 'finance':
      return [
        {
          id: 'fee-finance',
          label: 'Fee & Finance Reports',
          reports: FINANCIAL_REPORT_CATALOG.map((r) => ({
            key: r.id,
            name: r.title,
            description: r.description,
            sourceModule: 'Fee & Finance Management',
            sourceTab: r.tab,
          })),
        },
      ];
    case 'hr':
      return groupHrReports();
    case 'library':
      return LIBRARY_REPORT_GROUPS;
    case 'transport':
      return TRANSPORT_REPORT_GROUPS;
    case 'hostel':
      return [
        {
          id: 'statutory',
          label: HOSTEL_REPORT_CATALOG.statutory.label,
          reports: HOSTEL_REPORT_CATALOG.statutory.reports.map((r) => ({
            key: r.id,
            name: r.name,
            description: r.description,
            sourceModule: 'Hostel Management',
            sourceTab: 'Reports & Analytics',
          })),
        },
      ];
    case 'inventory':
      return INVENTORY_REPORT_GROUPS;
    case 'custom':
      return [];
    default:
      return [];
  }
}

function findReportMeta(category: RaCategoryKey, reportKey: string): RaReportItem | undefined {
  for (const group of getCategoryCatalog(category)) {
    const found = group.reports.find((r) => r.key === reportKey);
    if (found) return found;
  }
  return undefined;
}

function todayDate() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function formatInr(n: number) {
  if (n >= 1_00_00_000) return `₹ ${(n / 1_00_00_000).toFixed(2)} Cr`;
  if (n >= 1_00_000) return `₹ ${(n / 1_00_000).toFixed(2)} L`;
  return `₹ ${Math.round(n).toLocaleString('en-IN')}`;
}

function formatPctChange(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? '↑ New' : '—';
  const change = ((current - previous) / previous) * 100;
  const arrow = change >= 0 ? '↑' : '↓';
  return `${arrow} ${Math.abs(change).toFixed(2)}% vs last month`;
}

function pct(num: number, den: number) {
  if (den <= 0) return 0;
  return Math.round((num / den) * 1000) / 10;
}

function relativeTime(d: Date) {
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function escapeCsv(v: unknown) {
  return `"${String(v ?? '').replace(/"/g, '""')}"`;
}

async function logRaActivity(institutionId: string, action: string, details: string, performedBy = 'Reports Manager') {
  await prisma.raActivityLog.create({
    data: { institutionId, action, details, performedBy },
  });
}

async function auditRun(
  institutionId: string,
  category: string,
  reportKey: string,
  reportName: string,
  sourceModule: string,
  filters: Record<string, unknown>,
  rowCount: number,
  exportFormat = '',
  performedBy = 'Reports Manager',
  academicYear = '2025-26',
) {
  await prisma.raReportRun.create({
    data: {
      institutionId,
      category,
      reportKey,
      reportName,
      sourceModule,
      filters: filters as object,
      rowCount,
      exportFormat,
      performedBy,
      academicYear,
    },
  });
}

export type RaFilters = {
  academicYear?: string;
  term?: string;
  className?: string;
  sectionName?: string;
  dateFrom?: string;
  dateTo?: string;
  department?: string;
  period?: string;
};

function parseStudentReportType(key: string): StudentReportType | null {
  const upper = key.toUpperCase().replace(/-/g, '_') as StudentReportType;
  return Object.values(StudentReportType).includes(upper) ? upper : null;
}

export async function generateExaminationReport(
  institutionId: string,
  reportKey: string,
  filters: RaFilters = {},
) {
  const academicYear = filters.academicYear ?? '2025-26';
  const results = await prisma.examStudentResult.findMany({
    where: { institutionId, batch: { academicYear } },
    include: { student: { select: { className: true, sectionName: true } }, batch: { select: { examinationName: true, className: true } } },
    take: 2000,
    orderBy: { percentage: 'desc' },
  });

  const total = results.length;
  const passed = results.filter((r) => r.percentage >= 33).length;
  const passPct = pct(passed, total);

  if (reportKey === 'report-card-status') {
    const byStatus = await prisma.examStudentResult.groupBy({
      by: ['reportCardStatus'],
      where: { institutionId },
      _count: { _all: true },
    });
    const rows = byStatus.map((s) => ({
      status: s.reportCardStatus,
      count: s._count._all,
    }));
    return {
      reportKey,
      reportName: 'Report Card Generation Status',
      columns: ['status', 'count'],
      rows,
      summary: { total },
      rowCount: rows.length,
    };
  }

  if (reportKey === 'merit-list') {
    const rows = results.slice(0, 50).map((r, i) => ({
      rank: i + 1,
      studentName: r.studentName,
      admissionNumber: r.admissionNumber,
      className: r.student?.className ?? r.batch.className,
      percentage: r.percentage,
      grade: r.grade,
    }));
    return {
      reportKey,
      reportName: 'Merit List Report',
      columns: ['rank', 'studentName', 'admissionNumber', 'className', 'percentage', 'grade'],
      rows,
      summary: { totalStudents: total },
      rowCount: rows.length,
    };
  }

  if (reportKey === 'class-performance') {
    const byClass = new Map<string, { total: number; sum: number; passed: number; highest: number; lowest: number }>();
    for (const r of results) {
      const cls = r.student?.className || r.batch.className || 'Unknown';
      if (!byClass.has(cls)) byClass.set(cls, { total: 0, sum: 0, passed: 0, highest: 0, lowest: 100 });
      const entry = byClass.get(cls)!;
      entry.total += 1;
      entry.sum += r.percentage;
      if (r.percentage >= 33) entry.passed += 1;
      entry.highest = Math.max(entry.highest, r.percentage);
      entry.lowest = Math.min(entry.lowest, r.percentage);
    }
    const rows = [...byClass.entries()].map(([className, v]) => ({
      className,
      total: v.total,
      avg: Math.round((v.sum / v.total) * 100) / 100,
      highest: v.highest,
      lowest: v.lowest,
      passPct: pct(v.passed, v.total),
    }));
    return {
      reportKey,
      reportName: 'Class Performance Report',
      columns: ['className', 'total', 'avg', 'highest', 'lowest', 'passPct'],
      rows,
      summary: { classes: rows.length },
      rowCount: rows.length,
    };
  }

  const bands = [
    { name: 'Distinction (75%+)', min: 75, max: 100, color: '#16a34a' },
    { name: 'First Division (60-74%)', min: 60, max: 74.99, color: '#2563eb' },
    { name: 'Second Division (40-59%)', min: 40, max: 59.99, color: '#9333ea' },
    { name: 'Pass (33-39%)', min: 33, max: 39.99, color: '#eab308' },
    { name: 'Fail (Below 33%)', min: 0, max: 32.99, color: '#dc2626' },
  ];
  const bandRows = bands.map((b) => {
    const count = results.filter((r) => r.percentage >= b.min && r.percentage <= b.max).length;
    return { name: b.name, value: count, percent: `${pct(count, total)}%`, color: b.color };
  });

  return {
    reportKey,
    reportName: reportKey === 'pass-fail-analysis' ? 'Pass / Fail Analysis' : 'Exam Result Analysis',
    columns: ['name', 'value', 'percent'],
    rows: bandRows,
    summary: { totalStudents: total, passPercentage: passPct },
    rowCount: bandRows.length,
  };
}

export async function generateAttendanceCategoryReport(
  institutionId: string,
  reportKey: string,
  filters: RaFilters = {},
) {
  const data = await getAllAttendanceReports(institutionId, {
    academicYear: filters.academicYear,
    className: filters.className,
    sectionName: filters.sectionName,
    period: (filters.period as 'monthly' | 'quarterly' | 'half_yearly' | 'yearly') || 'monthly',
  });

  if (reportKey === 'teacher-attendance') {
    const rows = (data.teachers.rows ?? []) as Record<string, unknown>[];
    return {
      reportKey,
      reportName: 'Teacher Attendance Report',
      columns: rows[0] ? Object.keys(rows[0]) : ['name', 'department', 'present', 'absent', 'attendancePercent'],
      rows,
      summary: data.teachers.summary as Record<string, unknown>,
      rowCount: rows.length,
    };
  }

  if (reportKey === 'staff-attendance') {
    const rows = (data.staff.rows ?? []) as Record<string, unknown>[];
    return {
      reportKey,
      reportName: 'Staff Attendance Report',
      columns: rows[0] ? Object.keys(rows[0]) : ['name', 'department', 'present', 'absent'],
      rows,
      summary: data.staff.summary as Record<string, unknown>,
      rowCount: rows.length,
    };
  }

  if (reportKey === 'combined-summary') {
    return {
      reportKey,
      reportName: 'Combined Attendance Summary',
      columns: ['metric', 'value'],
      rows: [
        { metric: 'Total Students', value: data.summary.totalStudents },
        { metric: 'Student Avg Attendance %', value: data.summary.studentAvgAttendance },
        { metric: 'Total Teachers', value: data.summary.totalTeachers },
        { metric: 'Teacher Avg Attendance %', value: data.summary.teacherAvgAttendance },
        { metric: 'Total Staff', value: data.summary.totalStaff },
        { metric: 'Staff Avg Attendance %', value: data.summary.staffAvgAttendance },
      ],
      summary: data.summary as Record<string, unknown>,
      rowCount: 6,
    };
  }

  const studentRows = (data.students.rows ?? []) as Array<Record<string, unknown> & { attendancePercent?: number }>;
  let rows = studentRows;
  if (reportKey === 'low-attendance-alert') {
    rows = studentRows.filter((r) => (r.attendancePercent ?? 100) < 75);
  }

  return {
    reportKey,
    reportName: findReportMeta('attendance', reportKey)?.name ?? 'Student Attendance Report',
    columns: studentRows[0] ? Object.keys(studentRows[0]) : ['studentName', 'className', 'present', 'absent', 'attendancePercent'],
    rows,
    summary: data.students.summary as Record<string, unknown>,
    rowCount: rows.length,
  };
}

export async function generateTransportCategoryReport(
  institutionId: string,
  reportKey: string,
  filters: RaFilters = {},
) {
  const analytics = await getTransportReportsAnalytics(institutionId, filters.academicYear ?? '2025-26');
  const meta = findReportMeta('transport', reportKey);
  const rows: Record<string, unknown>[] = [];
  const exec = analytics.kpis.executive;
  const fin = analytics.kpis.financial;

  if (reportKey.includes('route') || meta?.name.includes('Route')) {
    for (const r of analytics.routeProfitability ?? analytics.dashboards.route ?? []) {
      rows.push(r as Record<string, unknown>);
    }
  } else if (reportKey.includes('fuel') || meta?.name.includes('Fuel')) {
    rows.push({
      fuelCost: fin.totalFuelCost,
      maintenanceCost: fin.totalMaintenanceCost,
      totalExpenses: fin.totalExpenses,
    });
  } else {
    rows.push({
      totalVehicles: exec.totalVehicles,
      activeVehicles: exec.activeVehicles,
      enrollments: exec.totalStudents,
      revenue: exec.revenue,
      outstanding: exec.outstanding,
      fleetUtilization: analytics.kpis.operational.fleetUtilization,
    });
  }

  return {
    reportKey,
    reportName: meta?.name ?? 'Transport Report',
    columns: rows[0] ? Object.keys(rows[0]) : ['metric', 'value'],
    rows,
    summary: exec as unknown as Record<string, unknown>,
    rowCount: rows.length,
  };
}

export async function generateStudentAnalyticsReport(
  institutionId: string,
  reportKey: string,
  filters: RaFilters = {},
) {
  const academicYear = filters.academicYear ?? '2025-26';
  const analytics = await getStudentAnalytics(institutionId, academicYear);

  if (reportKey === 'strength-analysis') {
    return {
      reportKey,
      reportName: 'Student Strength Analysis',
      columns: ['name', 'value', 'percent'],
      rows: analytics.classStats,
      summary: { total: analytics.summary.total, active: analytics.summary.active },
      rowCount: analytics.classStats.length,
    };
  }

  if (reportKey === 'document-compliance') {
    return {
      reportKey,
      reportName: 'Document Compliance Report',
      columns: ['name', 'uploaded', 'total'],
      rows: analytics.documents,
      summary: { totalStudents: analytics.summary.total },
      rowCount: analytics.documents.length,
    };
  }

  return {
    reportKey,
    reportName: 'Category-wise Student Report',
    columns: ['name', 'value', 'percent'],
    rows: analytics.genderStats,
    summary: { male: analytics.summary.male, female: analytics.summary.female },
    rowCount: analytics.genderStats.length,
  };
}

export async function generateCategoryReport(
  institutionId: string,
  category: RaCategoryKey,
  reportKey: string,
  filters: RaFilters = {},
  performedBy = 'Reports Manager',
) {
  const meta = findReportMeta(category, reportKey);
  if (!meta && category !== 'custom') throw new Error(`Unknown report: ${reportKey}`);

  let payload: {
    reportKey: string;
    reportName: string;
    columns: string[];
    rows: Record<string, unknown>[];
    summary: Record<string, unknown>;
    rowCount: number;
  };

  switch (category) {
    case 'student': {
      const studentType = parseStudentReportType(reportKey);
      if (studentType) {
        const row = await generateStudentReport({
          institutionId,
          reportType: studentType,
          academicYear: filters.academicYear ?? '2025-26',
          className: filters.className,
          sectionName: filters.sectionName,
        });
        const data = (row.data ?? {}) as { rows?: Record<string, unknown>[]; columns?: string[]; summary?: Record<string, unknown> };
        payload = {
          reportKey,
          reportName: meta!.name,
          columns: data.columns ?? (data.rows?.[0] ? Object.keys(data.rows[0]) : []),
          rows: data.rows ?? [],
          summary: (data.summary as Record<string, unknown>) ?? {},
          rowCount: data.rows?.length ?? 0,
        };
      } else {
        payload = await generateStudentAnalyticsReport(institutionId, reportKey, filters);
      }
      break;
    }
    case 'academic': {
      const report = await generateAcademicReport(institutionId, reportKey as Parameters<typeof generateAcademicReport>[1], {
        academicYear: filters.academicYear,
        term: filters.term,
        className: filters.className,
        sectionName: filters.sectionName,
      });
      payload = {
        reportKey,
        reportName: report.reportTitle,
        columns: report.columns.map((c) => c.key),
        rows: report.rows,
        summary: report.summary,
        rowCount: report.rows.length,
      };
      break;
    }
    case 'attendance':
      payload = await generateAttendanceCategoryReport(institutionId, reportKey, filters);
      break;
    case 'examination':
      payload = await generateExaminationReport(institutionId, reportKey, filters);
      break;
    case 'finance': {
      const report = await generateFinancialReport(institutionId, reportKey as Parameters<typeof generateFinancialReport>[1], {
        academicYear: filters.academicYear,
      });
      payload = {
        reportKey,
        reportName: report.reportTitle,
        columns: report.columns.map((c) => c.key),
        rows: report.rows,
        summary: report.summary,
        rowCount: report.rows.length,
      };
      break;
    }
    case 'hr': {
      const report = await generateHrReport(institutionId, reportKey, filters);
      payload = {
        reportKey,
        reportName: report.label,
        columns: report.columns,
        rows: report.rows as Record<string, unknown>[],
        summary: report.summary as Record<string, unknown>,
        rowCount: report.rows.length,
      };
      break;
    }
    case 'library': {
      const report = await generateLibraryReport(institutionId, reportKey, {
        academicYear: filters.academicYear,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
      });
      payload = {
        reportKey,
        reportName: meta!.name,
        columns: report.columns,
        rows: report.rows as Record<string, unknown>[],
        summary: report.summary as Record<string, unknown>,
        rowCount: report.rows.length,
      };
      break;
    }
    case 'transport':
      payload = await generateTransportCategoryReport(institutionId, reportKey, filters);
      break;
    case 'hostel': {
      const report = await generateHostelReport(institutionId, reportKey, {
        academicYear: filters.academicYear,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
      });
      payload = {
        reportKey,
        reportName: meta!.name,
        columns: report.columns,
        rows: report.rows as Record<string, unknown>[],
        summary: report.summary as Record<string, unknown>,
        rowCount: report.rows.length,
      };
      break;
    }
    case 'inventory': {
      const report = await generateInventoryReport(institutionId, reportKey, {
        academicYear: filters.academicYear,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
      });
      payload = {
        reportKey,
        reportName: meta!.name,
        columns: report.columns,
        rows: report.rows as Record<string, unknown>[],
        summary: report.summary as Record<string, unknown>,
        rowCount: report.rows.length,
      };
      break;
    }
    default:
      throw new Error('Unsupported category');
  }

  await auditRun(
    institutionId,
    category,
    reportKey,
    payload.reportName,
    meta?.sourceModule ?? 'Reports Hub',
    filters as Record<string, unknown>,
    payload.rowCount,
    '',
    performedBy,
    filters.academicYear ?? '2025-26',
  );

  return {
    category,
    sourceModule: meta?.sourceModule ?? '',
    sourceTab: meta?.sourceTab ?? '',
    generatedAt: new Date().toISOString(),
    ...payload,
  };
}

export function exportReportCsv(payload: {
  reportName: string;
  columns: string[];
  rows: Record<string, unknown>[];
}) {
  const header = payload.columns.map(escapeCsv).join(',');
  const body = payload.rows.map((row) => payload.columns.map((c) => escapeCsv(row[c])).join(',')).join('\n');
  const content = `${header}\n${body}`;
  const safeName = payload.reportName.replace(/[^a-z0-9]+/gi, '_').toLowerCase();
  return {
    content,
    fileName: `${safeName}_${new Date().toISOString().slice(0, 10)}.csv`,
    mimeType: 'text/csv',
  };
}

export async function getCategoryMeta(institutionId: string, category: RaCategoryKey, academicYear?: string) {
  const filters = await getInstitutionFilterMeta(institutionId);
  const year = academicYear ?? filters.defaultAcademicYear;
  const catalog = getCategoryCatalog(category);

  const [recentRuns, totalReports] = await Promise.all([
    prisma.raReportRun.findMany({
      where: { institutionId, category },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.raReportRun.count({ where: { institutionId, category } }),
  ]);

  const reportCount = catalog.reduce((s, g) => s + g.reports.length, 0);
  const allSections = Object.values(filters.sectionsByClass ?? {}).flat();

  return {
    category,
    academicYear: year,
    academicYears: filters.academicYears.length ? filters.academicYears : ACADEMIC_YEARS,
    classes: filters.classes,
    sections: allSections,
    catalog,
    reportCount,
    totalRuns: totalReports,
    recentRuns: recentRuns.map((r) => ({
      id: r.id,
      reportKey: r.reportKey,
      reportName: r.reportName,
      sourceModule: r.sourceModule,
      rowCount: r.rowCount,
      performedBy: r.performedBy,
      time: relativeTime(r.createdAt),
      createdAt: r.createdAt.toISOString(),
    })),
    defaultFilters: {
      dateFrom: new Date(todayDate().getFullYear(), todayDate().getMonth(), 1).toISOString().slice(0, 10),
      dateTo: todayDate().toISOString().slice(0, 10),
      academicYear: year,
    },
  };
}

export async function getReportsAnalyticsDashboard(
  institutionId: string,
  opts: { academicYear?: string; period?: string } = {},
) {
  const filters = await getInstitutionFilterMeta(institutionId);
  const academicYear = opts.academicYear ?? filters.defaultAcademicYear;
  const period = opts.period ?? 'month';

  const [
    studentAnalytics,
    feeDashboard,
    attendanceAll,
    teacherCount,
    examResults,
    libOverdue,
    feeDues30,
    recentRuns,
    customCount,
  ] = await Promise.all([
    getStudentAnalytics(institutionId, academicYear),
    getFeeDashboard(institutionId, { academicYear, overviewPeriod: 'month' }),
    getAllAttendanceReports(institutionId, { academicYear, period: 'monthly' }),
    prisma.payrollEmployee.count({ where: { institutionId, status: 'ACTIVE' } }),
    prisma.examStudentResult.findMany({
      where: { institutionId, batch: { academicYear } },
      select: { percentage: true, studentName: true, student: { select: { className: true, sectionName: true } } },
      take: 5000,
    }),
    prisma.libIssue.count({ where: { institutionId, status: 'OVERDUE' } }),
    prisma.feeDue.count({
      where: {
        institutionId,
        academicYear,
        status: { in: ['PENDING', 'OVERDUE'] },
        dueDate: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.raReportRun.findMany({
      where: { institutionId },
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
    prisma.raCustomReport.count({ where: { institutionId } }),
  ]);

  const totalStudents = studentAnalytics.summary.active;
  const prevStudents = Math.max(1, totalStudents - studentAnalytics.summary.newAdmissions);
  const attendanceAvg = attendanceAll.summary.studentAvgAttendance ?? 0;
  const examPassed = examResults.filter((r) => r.percentage >= 33).length;
  const examPassPct = pct(examPassed, examResults.length || 1);
  const feeCollected = feeDashboard.kpis?.totalCollection ?? 0;
  const feeDue = feeDashboard.kpis?.pendingAmount ?? 0;
  const collectionPct = feeDashboard.kpis?.collectionPct ?? pct(feeCollected, feeCollected + feeDue);
  const performanceIndex = Math.round((attendanceAvg * 0.3 + examPassPct * 0.35 + collectionPct * 0.35) * 10) / 10;

  const examBands = [
    { name: 'Distinction (75%+)', min: 75, max: 100, color: '#16a34a' },
    { name: 'First Division (60-74%)', min: 60, max: 74.99, color: '#2563eb' },
    { name: 'Second Division (40-59%)', min: 40, max: 59.99, color: '#9333ea' },
    { name: 'Pass (33-39%)', min: 33, max: 39.99, color: '#eab308' },
    { name: 'Fail (Below 33%)', min: 0, max: 32.99, color: '#dc2626' },
  ];
  const examPerformance = examBands.map((b) => {
    const value = examResults.filter((r) => r.percentage >= b.min && r.percentage <= b.max).length;
    return { name: b.name, value, percent: `${pct(value, examResults.length)}%`, color: b.color };
  });

  const studentRows = (attendanceAll.students.rows ?? []) as Array<{ totals?: { present?: number; absent?: number; onLeave?: number; late?: number } }>;
  let present = 0;
  let absent = 0;
  let onLeave = 0;
  let late = 0;
  for (const row of studentRows) {
    present += row.totals?.present ?? 0;
    absent += row.totals?.absent ?? 0;
    onLeave += row.totals?.onLeave ?? 0;
    late += row.totals?.late ?? 0;
  }
  const attendanceTotal = present + absent + onLeave || totalStudents || 1;

  const attendanceTrend = (feeDashboard.collectionTrend ?? []).slice(-7).map((p: { label?: string; month?: string; attendance?: number; collection?: number }, i: number) => ({
    day: p.label ?? p.month ?? `W${i + 1}`,
    attendance: attendanceAvg || 75 + (i % 5),
  }));

  if (attendanceTrend.length === 0) {
    for (let i = 0; i < 7; i++) {
      attendanceTrend.push({ day: `Day ${i + 1}`, attendance: Math.min(100, attendanceAvg + (i - 3)) });
    }
  }

  const feeTrend = (feeDashboard.collectionTrend ?? []).slice(-6).map((p: { month?: string; collection?: number }) => ({
    month: p.month ?? '',
    collection: Math.round(((p.collection ?? 0) / 100) * 100) / 100,
  }));

  const classPerformanceMap = new Map<string, { total: number; sum: number; passed: number; highest: number; lowest: number }>();
  for (const r of examResults) {
    const cls = r.student?.className || 'Unknown';
    if (!classPerformanceMap.has(cls)) classPerformanceMap.set(cls, { total: 0, sum: 0, passed: 0, highest: 0, lowest: 100 });
    const e = classPerformanceMap.get(cls)!;
    e.total += 1;
    e.sum += r.percentage;
    if (r.percentage >= 33) e.passed += 1;
    e.highest = Math.max(e.highest, r.percentage);
    e.lowest = Math.min(e.lowest, r.percentage);
  }
  const academicPerformance = [...classPerformanceMap.entries()]
    .slice(0, 8)
    .map(([cls, v]) => ({
      class: cls,
      total: v.total,
      avg: Math.round((v.sum / v.total) * 100) / 100,
      highest: v.highest,
      lowest: v.lowest,
      pass: pct(v.passed, v.total),
    }));

  const topPerformers = [...examResults]
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 5)
    .map((r, i) => ({
      name: r.studentName,
      class: r.student ? `${r.student.className}-${r.student.sectionName}` : '—',
      percent: `${r.percentage.toFixed(2)}%`,
      rank: i + 1,
    }));

  const lowAttendance = studentRows.filter((r) => ((r as { attendancePercent?: number }).attendancePercent ?? 100) < 75).length;
  const categories = Object.entries(VIEW_TO_CATEGORY)
    .filter(([, v]) => v !== null)
    .map(([label, key]) => ({
      label,
      key,
      reportCount: getCategoryCatalog(key!).reduce((s, g) => s + g.reports.length, 0),
    }));

  await prisma.raAnalyticsSnapshot.upsert({
    where: {
      institutionId_snapshotKey_period_academicYear: {
        institutionId,
        snapshotKey: 'dashboard',
        period,
        academicYear,
      },
    },
    create: {
      institutionId,
      snapshotKey: 'dashboard',
      period,
      academicYear,
      data: { attendanceAvg, examPassPct, feeCollected, collectionPct },
    },
    update: {
      data: { attendanceAvg, examPassPct, feeCollected, collectionPct },
      refreshedAt: new Date(),
    },
  });

  return {
    academicYear,
    period,
    periods: ['week', 'month', 'quarter', 'year'],
    academicYears: filters.academicYears.length ? filters.academicYears : ACADEMIC_YEARS,
    refreshedAt: new Date().toISOString(),
    kpis: [
      { title: 'Total Students', value: totalStudents.toLocaleString('en-IN'), subtitle: formatPctChange(totalStudents, prevStudents), subtitleColor: 'text-green-600', iconType: 'users', color: 'text-blue-600', bg: 'bg-blue-100', sparkColor: '#2563eb' },
      { title: 'Total Teachers', value: teacherCount.toLocaleString('en-IN'), subtitle: 'Active payroll staff', subtitleColor: 'text-green-600', iconType: 'users', color: 'text-green-600', bg: 'bg-green-100', sparkColor: '#16a34a' },
      { title: 'Attendance Average', value: `${attendanceAvg}%`, subtitle: attendanceAvg >= 90 ? 'Above target' : 'Needs attention', subtitleColor: attendanceAvg >= 90 ? 'text-green-600' : 'text-amber-600', iconType: 'clipboard', color: 'text-purple-600', bg: 'bg-purple-100', sparkColor: '#9333ea' },
      { title: 'Exam Pass Percentage', value: `${examPassPct}%`, subtitle: `${examPassed} of ${examResults.length} students`, subtitleColor: 'text-green-600', iconType: 'file', color: 'text-orange-600', bg: 'bg-orange-100', sparkColor: '#ea580c' },
      { title: 'Fee Collection', value: formatInr(feeCollected), subtitle: `${collectionPct}% collected`, subtitleColor: 'text-green-600', iconType: 'rupee', color: 'text-teal-600', bg: 'bg-teal-100', sparkColor: '#0d9488' },
      { title: 'Overall Performance Index', value: `${performanceIndex} / 100`, subtitle: performanceIndex >= 80 ? 'Very Good' : performanceIndex >= 60 ? 'Good' : 'Needs Improvement', subtitleColor: performanceIndex >= 80 ? 'text-green-600' : 'text-amber-600', iconType: 'activity', color: 'text-red-600', bg: 'bg-red-100', sparkColor: '' },
    ],
    attendanceTrend,
    attendanceSummary: {
      present,
      absent,
      onLeave,
      late,
      presentPct: pct(present, attendanceTotal),
      absentPct: pct(absent, attendanceTotal),
      leavePct: pct(onLeave, attendanceTotal),
      latePct: pct(late, attendanceTotal),
    },
    examPerformance,
    examPassPct,
    totalExamStudents: examResults.length,
    feeTrend,
    feeSummary: {
      totalCollected: formatInr(feeCollected),
      totalDue: formatInr(feeDue),
      collectionPct,
      rawCollected: feeCollected,
      rawDue: feeDue,
    },
    studentStrength: studentAnalytics.classStats.slice(0, 6),
    academicPerformance,
    topPerformers,
    alerts: [
      { text: 'Attendance below 75%', count: `${lowAttendance} Students`, iconType: 'alert', color: 'text-red-500', bg: 'bg-red-50' },
      { text: 'Fee pending more than 30 days', count: `${feeDues30} Dues`, iconType: 'alert', color: 'text-amber-500', bg: 'bg-amber-50' },
      { text: 'Exam scores below 40%', count: `${examResults.filter((r) => r.percentage < 40).length} Students`, iconType: 'target', color: 'text-green-500', bg: 'bg-green-50' },
      { text: 'Library books overdue', count: `${libOverdue} Issues`, iconType: 'book', color: 'text-green-500', bg: 'bg-green-50' },
      { text: 'Custom reports configured', count: `${customCount} Reports`, iconType: 'calendar', color: 'text-purple-500', bg: 'bg-purple-50' },
    ],
    quickReports: categories.slice(0, 8).map((c) => ({
      label: c.label.replace(' Reports', ' Report'),
      category: c.key,
      reportCount: c.reportCount,
    })),
    categories,
    recentRuns: recentRuns.map((r) => ({
      id: r.id,
      category: r.category,
      reportName: r.reportName,
      sourceModule: r.sourceModule,
      rowCount: r.rowCount,
      time: relativeTime(r.createdAt),
    })),
    dataInsights: [
      { text: `Active student enrollment: ${totalStudents.toLocaleString('en-IN')} across ${studentAnalytics.classStats.length} classes.`, iconType: 'users', bg: 'bg-blue-50' },
      { text: attendanceAvg >= 90 ? `Attendance is strong at ${attendanceAvg}% institution average.` : `Attendance at ${attendanceAvg}% — review low-attendance classes.`, iconType: 'target', bg: 'bg-green-50' },
      { text: `Fee collection at ${collectionPct}% — ${formatInr(feeDue)} outstanding.`, iconType: 'file', bg: 'bg-red-50' },
      { text: `Exam pass rate ${examPassPct}% from ${examResults.length} published results.`, iconType: 'activity', bg: 'bg-amber-50' },
    ],
    analyticsTools: [
      { title: 'Comparative Analysis', desc: 'Compare performance between classes, sections, or time periods.', iconType: 'bar', bg: 'bg-blue-50' },
      { title: 'Export & Share', desc: 'Export reports in PDF, Excel, CSV & share.', iconType: 'download', bg: 'bg-green-50' },
      { title: 'Trend Analysis', desc: 'Identify trends & patterns over time.', iconType: 'trend', bg: 'bg-amber-50' },
      { title: 'Module Report Sync', desc: 'All module reports mapped to central hub tabs.', iconType: 'target', bg: 'bg-red-50' },
      { title: 'Drill-Down Reports', desc: 'Go deep into data for detailed insights.', iconType: 'search', bg: 'bg-purple-50' },
      { title: 'Data Visualization', desc: 'Interactive charts & graphs for better insights.', iconType: 'pie', bg: 'bg-indigo-50' },
    ],
    moduleMap: categories,
  };
}

export async function listCustomReports(institutionId: string) {
  const rows = await prisma.raCustomReport.findMany({
    where: { institutionId },
    orderBy: { updatedAt: 'desc' },
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    modules: r.modules,
    columns: r.columns,
    filters: r.filters,
    status: r.status,
    createdBy: r.createdBy,
    academicYear: r.academicYear,
    lastRunAt: r.lastRunAt?.toISOString() ?? null,
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function createCustomReport(
  institutionId: string,
  body: {
    name: string;
    description?: string;
    modules?: string[];
    columns?: string[];
    filters?: Record<string, unknown>;
    academicYear?: string;
    createdBy?: string;
  },
) {
  const row = await prisma.raCustomReport.create({
    data: {
      institutionId,
      name: body.name,
      description: body.description ?? '',
      modules: body.modules ?? [],
      columns: body.columns ?? [],
      filters: (body.filters ?? {}) as object,
      academicYear: body.academicYear ?? '2025-26',
      createdBy: body.createdBy ?? 'Admin',
      status: 'ACTIVE',
    },
  });
  await logRaActivity(institutionId, 'CUSTOM_REPORT_CREATED', `Created custom report: ${row.name}`);
  return row;
}

export async function deleteCustomReport(institutionId: string, id: string) {
  const existing = await prisma.raCustomReport.findFirst({ where: { id, institutionId } });
  if (!existing) throw new Error('Custom report not found');
  await prisma.raCustomReport.delete({ where: { id } });
  await logRaActivity(institutionId, 'CUSTOM_REPORT_DELETED', `Deleted: ${existing.name}`);
  return { deleted: true };
}

export async function seedReportsAnalytics(institutionId: string, academicYear = '2025-26') {
  const existing = await prisma.raCustomReport.count({ where: { institutionId } });
  if (existing > 0) return { seeded: false, message: 'Already seeded' };

  await createCustomReport(institutionId, {
    name: 'Monthly Institution Summary',
    description: 'Cross-module KPI rollup — students, attendance, fees & exams',
    modules: ['student', 'attendance', 'finance', 'examination'],
    columns: ['module', 'kpi', 'value'],
    academicYear,
    createdBy: 'System',
  });

  await createCustomReport(institutionId, {
    name: 'Class-wise Performance Dashboard',
    description: 'Academic + examination performance by class',
    modules: ['academic', 'examination'],
    columns: ['className', 'avgMarks', 'passPct', 'attendance'],
    academicYear,
    createdBy: 'System',
  });

  await logRaActivity(institutionId, 'SEED', 'Reports & Analytics hub initialized with sample custom reports');
  return { seeded: true };
}

export function getAllCategoriesOverview() {
  return Object.entries(VIEW_TO_CATEGORY)
    .filter(([, v]) => v !== null)
    .map(([viewLabel, category]) => ({
      viewLabel,
      category,
      groups: getCategoryCatalog(category!),
      reportCount: getCategoryCatalog(category!).reduce((s, g) => s + g.reports.length, 0),
    }));
}
