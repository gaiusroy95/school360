import { FeeMasterStatus } from '@prisma/client';
import { prisma } from './prisma.js';
import { getExitDashboard } from './hrExitManagement.js';
import { getEdomsDashboard } from './hrEdoms.js';
import { getRecruitmentDashboard } from './hrRecruitment.js';
import { getTrainingDashboard } from './hrTrainingDevelopment.js';
import { getPerformanceAppraisalDashboard } from './hrPerformanceAppraisal.js';

export type HrReportItem = { key: string; label: string };
export type HrReportSection = { title: string; reports: HrReportItem[] };
export type HrReportCategory = {
  id: string;
  title: string;
  borderColor: string;
  colSpan?: number;
  footer?: string;
  sections: HrReportSection[];
};

export const HR_REPORT_CATALOG: HrReportCategory[] = [
  {
    id: 'attendance',
    title: 'Attendance Reports',
    borderColor: 'border-slate-400',
    colSpan: 2,
    sections: [
      {
        title: 'Employee Reports',
        reports: [
          { key: 'daily-attendance', label: 'Daily Attendance' },
          { key: 'monthly-attendance', label: 'Monthly Attendance' },
          { key: 'attendance-register', label: 'Attendance Register' },
          { key: 'individual-attendance-card', label: 'Individual Attendance Card' },
          { key: 'attendance-summary', label: 'Attendance Summary' },
          { key: 'late-coming', label: 'Late Coming Report' },
          { key: 'early-exit', label: 'Early Exit Report' },
          { key: 'missing-punch', label: 'Missing Punch Report' },
          { key: 'overtime-attendance', label: 'Overtime Report' },
          { key: 'shift-attendance', label: 'Shift Report' },
          { key: 'attendance-correction', label: 'Attendance Correction Report' },
          { key: 'outdoor-duty', label: 'Outdoor Duty Report' },
          { key: 'work-from-home', label: 'Work From Home Report' },
        ],
      },
      {
        title: 'Department Reports',
        reports: [
          { key: 'department-attendance', label: 'Department Attendance' },
          { key: 'campus-attendance', label: 'Campus Attendance' },
          { key: 'branch-attendance', label: 'Branch Attendance' },
          { key: 'designation-attendance', label: 'Designation Attendance' },
          { key: 'employee-type-attendance', label: 'Employee Type Attendance' },
        ],
      },
      {
        title: 'Payroll Reports',
        reports: [
          { key: 'salary-days', label: 'Salary Days Report' },
          { key: 'lwp-report', label: 'LWP (Leave Without Pay) Report' },
          { key: 'overtime-payroll', label: 'Overtime Payroll Report' },
          { key: 'attendance-deduction', label: 'Attendance Deduction Report' },
          { key: 'attendance-incentive', label: 'Attendance Incentive Report' },
        ],
      },
      {
        title: 'Leave & Attendance Report',
        reports: [
          { key: 'total-late-marks', label: 'Total Late Marks' },
          { key: 'total-early-exits', label: 'Total Early Exits' },
          { key: 'salary-deduction-attendance', label: 'Salary Deduction' },
        ],
      },
    ],
  },
  {
    id: 'recruitment',
    title: 'Recruitment Reports',
    borderColor: 'border-red-500',
    sections: [
      {
        title: 'Recruitment',
        reports: [
          { key: 'manpower-planning', label: 'Manpower Planning Report' },
          { key: 'vacancy-status', label: 'Vacancy Status Report' },
          { key: 'candidate-pipeline', label: 'Candidate Pipeline Report' },
          { key: 'source-effectiveness', label: 'Source Effectiveness Report' },
          { key: 'interview-performance', label: 'Interview Performance Report' },
          { key: 'time-to-fill', label: 'Time to Fill Report' },
          { key: 'recruitment-cost', label: 'Recruitment Cost Report' },
          { key: 'offer-acceptance', label: 'Offer Acceptance Report' },
          { key: 'joining-report', label: 'Joining Report' },
          { key: 'probation-status-recruitment', label: 'Probation Status Report' },
          { key: 'confirmation-recruitment', label: 'Confirmation Report' },
          { key: 'recruiter-performance', label: 'Recruiter Performance Report' },
        ],
      },
    ],
  },
  {
    id: 'performance',
    title: 'Performance Reports',
    borderColor: 'border-slate-900',
    sections: [
      {
        title: 'Performance Appraisal',
        reports: [
          { key: 'quarterly-appraisal', label: 'Quarterly Appraisal Report' },
          { key: 'annual-performance', label: 'Annual Performance Report' },
          { key: 'kpi-achievement', label: 'KPI Achievement Report' },
          { key: 'competency-assessment', label: 'Competency Assessment Report' },
          { key: 'promotion-recommendation', label: 'Promotion Recommendation Report' },
          { key: 'increment-recommendation', label: 'Increment Recommendation Report' },
          { key: 'pay-grade-movement', label: 'Pay Grade Movement Report' },
          { key: 'training-needs-analysis', label: 'Training Needs Analysis' },
          { key: 'performance-history', label: 'Performance History Report' },
          { key: 'department-comparison', label: 'Department Comparison Report' },
          { key: 'bell-curve', label: 'Bell Curve Distribution Report' },
          { key: 'performance-vs-attendance', label: 'Performance vs Attendance Report' },
          { key: 'performance-vs-results', label: 'Performance vs Student Results Report' },
          { key: 'career-progression', label: 'Employee Career Progression Report' },
        ],
      },
    ],
  },
  {
    id: 'training',
    title: 'Training Reports',
    borderColor: 'border-slate-300',
    sections: [
      {
        title: 'Training & Development',
        reports: [
          { key: 'training-calendar', label: 'Training Calendar' },
          { key: 'training-attendance', label: 'Training Attendance' },
          { key: 'employee-training-history', label: 'Employee Training History' },
          { key: 'department-training-matrix', label: 'Department Training Matrix' },
          { key: 'competency-gap', label: 'Competency Gap Report' },
          { key: 'training-need-analysis', label: 'Training Need Analysis' },
          { key: 'assessment-result', label: 'Assessment Result' },
          { key: 'certificate-register', label: 'Certificate Register' },
          { key: 'trainer-performance', label: 'Trainer Performance' },
          { key: 'training-budget', label: 'Training Budget Report' },
          { key: 'training-roi', label: 'Training ROI Report' },
          { key: 'learning-progress', label: 'Learning Progress Report' },
          { key: 'mandatory-compliance', label: 'Mandatory Compliance Report' },
          { key: 'expired-certification', label: 'Expired Certification Report' },
        ],
      },
    ],
  },
  {
    id: 'leave',
    title: 'Leave Reports',
    borderColor: 'border-slate-300',
    footer: 'Export — Excel, PDF, CSV',
    sections: [
      {
        title: 'Leave Management',
        reports: [
          { key: 'employee-leave-register', label: 'Employee Leave Register' },
          { key: 'department-leave', label: 'Department Leave Report' },
          { key: 'leave-balance', label: 'Leave Balance Report' },
          { key: 'leave-liability', label: 'Leave Liability Report' },
          { key: 'leave-encashment', label: 'Leave Encashment Report' },
          { key: 'leave-history', label: 'Leave History' },
          { key: 'monthly-leave-summary', label: 'Monthly Leave Summary' },
          { key: 'yearly-leave-summary', label: 'Yearly Leave Summary' },
          { key: 'leave-trend', label: 'Leave Trend Analysis' },
          { key: 'absentee-report', label: 'Absentee Report' },
        ],
      },
    ],
  },
  {
    id: 'resignation',
    title: 'Resignation Reports',
    borderColor: 'border-slate-400',
    sections: [
      {
        title: 'Exit Management',
        reports: [
          { key: 'pending-resignations', label: 'Pending Resignations' },
          { key: 'notice-period-tracker', label: 'Notice Period Tracker' },
          { key: 'clearance-status', label: 'Clearance Status' },
          { key: 'asset-recovery', label: 'Asset Recovery Report' },
          { key: 'full-final', label: 'Full & Final Report' },
          { key: 'exit-interview-summary', label: 'Exit Interview Summary' },
          { key: 'attrition', label: 'Attrition Report' },
          { key: 'department-attrition', label: 'Department-wise Attrition' },
          { key: 'avg-notice-period', label: 'Average Notice Period' },
          { key: 'recovery-report', label: 'Recovery Report' },
          { key: 'rehire-eligibility', label: 'Rehire Eligibility Report' },
          { key: 'exit-compliance', label: 'Exit Compliance Report' },
        ],
      },
    ],
  },
  {
    id: 'shift',
    title: 'Shift Reports',
    borderColor: 'border-slate-400',
    sections: [
      {
        title: 'Shift Management',
        reports: [
          { key: 'shift-master', label: 'Shift Master Report' },
          { key: 'employee-shift', label: 'Employee Shift Report' },
          { key: 'department-shift', label: 'Department Shift Report' },
          { key: 'attendance-by-shift', label: 'Attendance by Shift' },
          { key: 'late-entry-shift', label: 'Late Entry Report' },
          { key: 'shift-change', label: 'Shift Change Report' },
          { key: 'overtime-shift', label: 'Overtime Report' },
          { key: 'holiday-duty', label: 'Holiday Duty Report' },
          { key: 'weekend-duty', label: 'Weekend Duty Report' },
          { key: 'substitute-teacher', label: 'Substitute Teacher Report' },
          { key: 'gps-attendance', label: 'GPS Attendance Report' },
          { key: 'payroll-shift', label: 'Payroll Shift Report' },
          { key: 'exam-duty', label: 'Exam Duty Report' },
          { key: 'event-duty', label: 'Event Duty Report' },
          { key: 'monthly-shift-calendar', label: 'Monthly Shift Calendar' },
        ],
      },
    ],
  },
  {
    id: 'payroll',
    title: 'Payroll Reports',
    borderColor: 'border-amber-500',
    sections: [
      {
        title: 'Payroll',
        reports: [
          { key: 'payroll-summary', label: 'Payroll Summary' },
          { key: 'salary-register', label: 'Salary Register' },
          { key: 'payslip-reports', label: 'Payslip Reports' },
          { key: 'earnings-reports', label: 'Earnings Reports' },
          { key: 'deduction-reports', label: 'Deduction Reports' },
          { key: 'bank-transfer', label: 'Bank Transfer Reports' },
          { key: 'tax-reports', label: 'Tax Reports' },
          { key: 'pf-esi', label: 'PF & ESI Reports' },
          { key: 'leave-attendance-payroll', label: 'Leave & Attendance Reports' },
          { key: 'increment-reports', label: 'Increment Reports' },
          { key: 'bonus-incentive', label: 'Bonus & Incentive Reports' },
          { key: 'loan-reports', label: 'Loan Reports' },
          { key: 'cost-center', label: 'Cost Center Reports' },
          { key: 'department-payroll', label: 'Department Reports' },
          { key: 'salary-history', label: 'Employee Salary History' },
          { key: 'compliance-reports', label: 'Compliance Reports' },
        ],
      },
    ],
  },
  {
    id: 'onboarding',
    title: 'Onboarding Reports',
    borderColor: 'border-amber-800',
    sections: [
      {
        title: 'Documents & Onboarding',
        reports: [
          { key: 'joining-status', label: 'Joining Status Report' },
          { key: 'pending-documents', label: 'Pending Documents Report' },
          { key: 'verification-status', label: 'Verification Status Report' },
          { key: 'document-register', label: 'Employee Document Register' },
          { key: 'expiring-documents', label: 'Expiring Documents Report' },
          { key: 'missing-documents', label: 'Missing Documents Report' },
          { key: 'asset-allocation-onboarding', label: 'Asset Allocation Report' },
          { key: 'induction-completion', label: 'Induction Completion Report' },
          { key: 'probation-status-onboarding', label: 'Probation Status Report' },
          { key: 'employee-master-creation', label: 'Employee Master Creation Report' },
          { key: 'joining-checklist', label: 'Joining Checklist Completion Report' },
          { key: 'digital-signature', label: 'Digital Signature Report' },
        ],
      },
    ],
  },
];

function allReportKeys(): Map<string, { label: string; category: string }> {
  const map = new Map<string, { label: string; category: string }>();
  for (const cat of HR_REPORT_CATALOG) {
    for (const sec of cat.sections) {
      for (const r of sec.reports) {
        map.set(r.key, { label: r.label, category: cat.title });
      }
    }
  }
  return map;
}

const REPORT_LOOKUP = allReportKeys();

function formatDate(d: Date | null | undefined): string {
  if (!d) return '';
  return d.toISOString().slice(0, 10);
}

export async function getHrReportsMeta(institutionId: string) {
  const [employeeCount, resignationCount, onboardingCount, leaveApps, paySlips] = await Promise.all([
    prisma.payrollEmployee.count({ where: { institutionId, status: FeeMasterStatus.ACTIVE } }),
    prisma.hrExitResignation.count({ where: { institutionId } }),
    prisma.hrEdomsOnboarding.count({ where: { institutionId } }),
    prisma.hrLeaveApplication.count({ where: { institutionId } }),
    prisma.payrollSlip.count({ where: { institutionId } }),
  ]);

  const totalReports = [...REPORT_LOOKUP.keys()].length;

  return {
    catalog: HR_REPORT_CATALOG,
    summary: {
      totalReportTypes: totalReports,
      activeEmployees: employeeCount,
      resignationCases: resignationCount,
      onboardingCases: onboardingCount,
      leaveApplications: leaveApps,
      payrollSlips: paySlips,
      generatedAt: new Date().toISOString(),
    },
    exportFormats: ['Excel', 'PDF', 'CSV'],
  };
}

export type HrReportPayload = {
  key: string;
  label: string;
  category: string;
  generatedAt: string;
  filters: Record<string, string>;
  summary: Record<string, string | number>;
  columns: string[];
  rows: Record<string, unknown>[];
};

async function buildEmployeeRows(institutionId: string) {
  const employees = await prisma.payrollEmployee.findMany({
    where: { institutionId },
    orderBy: { fullName: 'asc' },
    take: 200,
  });
  return employees.map((e) => ({
    employeeCode: e.employeeCode,
    name: e.fullName,
    department: e.department,
    designation: e.designation,
    status: e.status,
    joinDate: formatDate(e.joinDate),
  }));
}

async function buildAttendanceRows(institutionId: string) {
  const records = await prisma.hrAttendanceDailyRecord.findMany({
    where: { institutionId },
    include: { employee: { select: { fullName: true, employeeCode: true, department: true } } },
    orderBy: { recordDate: 'desc' },
    take: 200,
  });
  return records.map((r) => ({
    date: formatDate(r.recordDate),
    employeeCode: r.employee?.employeeCode ?? '',
    name: r.employee?.fullName ?? '',
    department: r.employee?.department ?? '',
    status: r.status,
    checkIn: r.inTime,
    checkOut: r.outTime,
    lateMinutes: r.lateMinutes,
    overtimeMinutes: r.overtimeHours,
  }));
}

async function buildLeaveRows(institutionId: string) {
  const apps = await prisma.hrLeaveApplication.findMany({
    where: { institutionId },
    include: { employee: { select: { fullName: true, employeeCode: true, department: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  return apps.map((a) => ({
    employeeCode: a.employee?.employeeCode ?? '',
    name: a.employee?.fullName ?? '',
    department: a.employee?.department ?? '',
    leaveType: a.leaveType,
    fromDate: formatDate(a.fromDate),
    toDate: formatDate(a.toDate),
    days: a.totalDays,
    status: a.status,
  }));
}

async function buildPayrollRows(institutionId: string) {
  const slips = await prisma.payrollSlip.findMany({
    where: { institutionId },
    include: { employee: { select: { fullName: true, employeeCode: true, department: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  return slips.map((s) => ({
    payPeriod: s.payPeriod,
    employeeCode: s.employee?.employeeCode ?? '',
    name: s.employee?.fullName ?? '',
    department: s.employee?.department ?? '',
    grossPay: s.grossEarnings,
    deductions: s.totalDeductions,
    netPay: s.netPay,
    status: s.status,
  }));
}

export async function generateHrReport(
  institutionId: string,
  reportKey: string,
  filters: { academicYear?: string; dateFrom?: string; dateTo?: string; department?: string } = {},
): Promise<HrReportPayload> {
  const meta = REPORT_LOOKUP.get(reportKey);
  if (!meta) throw new Error(`Unknown report: ${reportKey}`);

  const generatedAt = new Date().toISOString();
  const base = {
    key: reportKey,
    label: meta.label,
    category: meta.category,
    generatedAt,
    filters: {
      academicYear: filters.academicYear ?? '2025-26',
      dateFrom: filters.dateFrom ?? '',
      dateTo: filters.dateTo ?? '',
      department: filters.department ?? 'All',
    },
  };

  // Attendance family
  if (reportKey.includes('attendance') || reportKey.includes('late') || reportKey.includes('early')
    || reportKey.includes('punch') || reportKey.includes('overtime') || reportKey.includes('outdoor')
    || reportKey.includes('work-from-home') || reportKey.includes('salary-days') || reportKey.includes('lwp')) {
    const rows = await buildAttendanceRows(institutionId);
    const present = rows.filter((r) => r.status === 'PRESENT').length;
    return {
      ...base,
      summary: { totalRecords: rows.length, present, absent: rows.length - present },
      columns: ['date', 'employeeCode', 'name', 'department', 'status', 'checkIn', 'checkOut', 'lateMinutes'],
      rows,
    };
  }

  // Leave family
  if (reportKey.includes('leave') || reportKey === 'absentee-report' || reportKey === 'lwp-report') {
    const rows = await buildLeaveRows(institutionId);
    const approved = rows.filter((r) => r.status === 'APPROVED').length;
    return {
      ...base,
      summary: { totalApplications: rows.length, approved, pending: rows.length - approved },
      columns: ['employeeCode', 'name', 'department', 'leaveType', 'fromDate', 'toDate', 'days', 'status'],
      rows,
    };
  }

  // Payroll family
  if (reportKey.includes('payroll') || reportKey.includes('salary') || reportKey.includes('payslip')
    || reportKey.includes('earnings') || reportKey.includes('deduction') || reportKey.includes('bank')
    || reportKey.includes('tax') || reportKey.includes('pf') || reportKey.includes('increment')
    || reportKey.includes('bonus') || reportKey.includes('loan') || reportKey.includes('cost-center')
    || reportKey.includes('compliance')) {
    const rows = await buildPayrollRows(institutionId);
    const totalNet = rows.reduce((s, r) => s + Number(r.netPay ?? 0), 0);
    return {
      ...base,
      summary: { totalSlips: rows.length, totalNetPay: Math.round(totalNet) },
      columns: ['payPeriod', 'employeeCode', 'name', 'department', 'grossPay', 'deductions', 'netPay', 'status'],
      rows,
    };
  }

  // Recruitment
  if (['manpower-planning', 'vacancy-status', 'candidate-pipeline', 'source-effectiveness',
    'interview-performance', 'time-to-fill', 'recruitment-cost', 'offer-acceptance', 'joining-report',
    'probation-status-recruitment', 'confirmation-recruitment', 'recruiter-performance'].includes(reportKey)) {
    const dash = await getRecruitmentDashboard(institutionId, filters.academicYear);
    const rows = (dash.requisitions ?? []).map((r: Record<string, unknown>) => ({
      requisitionNo: r.requisitionNumber, department: r.department, designation: r.designation,
      vacancies: r.vacancies, filled: 0, status: r.status, pipeline: r.workflowStage,
    }));
    return {
      ...base,
      summary: {
        openVacancies: dash.kpis?.openVacancies ?? 0,
        activeCandidates: dash.kpis?.activeCandidates ?? 0,
        pendingRequisitions: dash.kpis?.pendingRequisitions ?? 0,
      },
      columns: ['requisitionNo', 'department', 'designation', 'vacancies', 'filled', 'status', 'pipeline'],
      rows,
    };
  }

  // Performance
  if (reportKey.includes('appraisal') || reportKey.includes('performance') || reportKey.includes('kpi')
    || reportKey.includes('competency') || reportKey.includes('promotion') || reportKey.includes('increment')
    || reportKey.includes('pay-grade') || reportKey.includes('bell-curve') || reportKey.includes('career')) {
    const dash = await getPerformanceAppraisalDashboard(institutionId);
    const rows = (dash.appraisals ?? []).map((a: Record<string, unknown>) => ({
      employee: a.employeeName, department: a.department, cycle: a.cycleName,
      rating: a.overallScore, status: a.status, stage: a.workflowStage,
    }));
    return {
      ...base,
      summary: {
        totalAppraisals: dash.kpis?.evaluations ?? rows.length,
        completed: dash.kpis?.completed ?? 0,
        avgRating: dash.kpis?.avgScore ?? 0,
      },
      columns: ['employee', 'department', 'cycle', 'rating', 'status', 'stage'],
      rows,
    };
  }

  // Training
  if (reportKey.includes('training') || reportKey.includes('competency') || reportKey.includes('certificate')
    || reportKey.includes('trainer') || reportKey.includes('learning') || reportKey.includes('mandatory')
    || reportKey.includes('expired-certification')) {
    const dash = await getTrainingDashboard(institutionId);
    const rows = (dash.batches ?? []).map((b: Record<string, unknown>) => ({
      batchCode: b.batchCode, course: b.courseName, trainer: b.trainerName,
      startDate: b.sessionDate, endDate: b.sessionDate, nominations: b.nominationsCount, status: b.status,
    }));
    return {
      ...base,
      summary: {
        totalTrainings: dash.kpis?.totalTrainings ?? 0,
        totalParticipants: dash.kpis?.totalParticipants ?? 0,
        certificatesIssued: dash.kpis?.certificationRate ?? 0,
      },
      columns: ['batchCode', 'course', 'trainer', 'startDate', 'endDate', 'nominations', 'status'],
      rows,
    };
  }

  // Resignation / Exit
  if (reportKey.includes('resignation') || reportKey.includes('notice') || reportKey.includes('clearance')
    || reportKey.includes('attrition') || reportKey.includes('exit') || reportKey.includes('rehire')
    || reportKey.includes('recovery') || reportKey.includes('full-final') || reportKey.includes('asset-recovery')) {
    const dash = await getExitDashboard(institutionId);
    const rows = dash.resignations.map((r) => ({
      caseNumber: r.caseNumber, employee: r.employeeName, department: r.department,
      type: r.resignationType, status: r.status, lwd: r.requestedLastWorkingDay,
      clearance: `${r.clearanceDone}/${r.clearanceTotal}`, fnf: r.fnfStatus,
    }));
    return {
      ...base,
      summary: {
        totalCases: dash.kpis.totalCases,
        pendingApprovals: dash.kpis.pendingApprovals,
        completedExits: dash.kpis.completedExits,
        attritionRate: `${dash.kpis.attritionRate}%`,
      },
      columns: ['caseNumber', 'employee', 'department', 'type', 'status', 'lwd', 'clearance', 'fnf'],
      rows,
    };
  }

  // Onboarding / EDOMS
  if (reportKey.includes('joining') || reportKey.includes('document') || reportKey.includes('verification')
    || reportKey.includes('induction') || reportKey.includes('probation') || reportKey.includes('onboarding')
    || reportKey.includes('digital-signature') || reportKey.includes('asset-allocation')) {
    const dash = await getEdomsDashboard(institutionId);
    const rows = dash.onboardings.map((o) => ({
      caseNumber: o.caseNumber, candidate: o.candidateName, department: o.department,
      docs: `${o.verifiedCount}/${o.documentsCount}`, checklist: `${o.checklistDone}/${o.checklistTotal}`,
      stage: o.workflowStage, status: o.status,
    }));
    return {
      ...base,
      summary: {
        activeOnboarding: dash.kpis.activeOnboarding,
        pendingVerification: dash.kpis.pendingVerification,
        confirmed: dash.kpis.confirmedEmployees,
      },
      columns: ['caseNumber', 'candidate', 'department', 'docs', 'checklist', 'stage', 'status'],
      rows,
    };
  }

  // Shift reports
  if (reportKey.includes('shift') || reportKey.includes('substitute') || reportKey.includes('duty')
    || reportKey.includes('gps')) {
    const shifts = await prisma.hrShift.findMany({ where: { institutionId }, take: 50 });
    const assignments = await prisma.hrEmployeeShiftAssignment.findMany({
      where: { institutionId },
      include: { employee: { select: { fullName: true, employeeCode: true, department: true } } },
      take: 200,
    });
    const rows = assignments.map((a) => ({
      employeeCode: a.employee?.employeeCode ?? '',
      name: a.employee?.fullName ?? '',
      department: a.employee?.department ?? '',
      shiftId: a.shiftId,
      effectiveFrom: formatDate(a.effectiveDate),
      status: a.status,
    }));
    return {
      ...base,
      summary: { shiftMasters: shifts.length, assignments: rows.length },
      columns: ['employeeCode', 'name', 'department', 'shiftId', 'effectiveFrom', 'status'],
      rows,
    };
  }

  // Default: employee directory
  const rows = await buildEmployeeRows(institutionId);
  return {
    ...base,
    summary: { totalEmployees: rows.length },
    columns: ['employeeCode', 'name', 'department', 'designation', 'status', 'joinDate'],
    rows,
  };
}
