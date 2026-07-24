import { api } from './api';

export type HrDashboard = {
  academicYear: string;
  payPeriod: string;
  payPeriodLabel: string;
  asOf: string;
  kpis: {
    totalEmployees: number;
    newThisMonth: number;
    presentToday: number;
    presentPct: number;
    onLeaveToday: number;
    leavePct: number;
    absentToday: number;
    absentPct: number;
    totalDepartments: number;
    payrollGross: number;
    payrollDeductions: number;
    payrollNet: number;
  };
  employeeOverview: Array<{ name: string; value: number; color: string; percent: string }>;
  employeeStatusTrend: Array<{ day: string; present: number; leave: number; absent: number }>;
  departmentDistribution: Array<{ name: string; value: number; color: string; percent: string }>;
  leaveSummary: {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
    rows: Array<{ type: string; total: number; approved: number; pending: number; rejected: number }>;
  };
  payrollSummary: {
    gross: number;
    deductions: number;
    net: number;
    components: Array<{ name: string; amount: number }>;
    netVsDeductions: Array<{ name: string; value: number; color: string }>;
  };
  birthdays: Array<{ name: string; designation: string; date: string; avatar: string }>;
  workAnniversaries: Array<{ name: string; designation: string; date: string; avatar: string }>;
  topEarners: Array<{ name: string; designation: string; amount: number; avatar: string }>;
  onLeaveToday: Array<{ name: string; designation: string; type: string; avatar: string }>;
  recruitmentPipeline: Array<{ name: string; count: number }>;
  performanceData: Array<{
    dept: string;
    excellent: number;
    good: number;
    average: number;
    needsImp: number;
  }>;
  employeeDocuments: Array<{ name: string; count: number; total: number }>;
  hrAnalytics: {
    attendancePct: number;
    leavePct: number;
    overtimePct: number;
    attritionPct: number;
    avgExperienceYears: number;
    employeeSatisfaction: number;
  };
  links: Record<string, string>;
};

function qs(params?: Record<string, string | undefined>) {
  if (!params) return '';
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) q.set(k, v);
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}

export async function fetchHrDashboard(academicYear?: string) {
  return api<HrDashboard>(`/api/hr/dashboard${qs({ academicYear })}`);
}

export function formatInr(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export type EmployeeDirectoryRow = {
  id: string;
  recordId: string;
  name: string;
  classGroup: string;
  details: string;
  updated: string;
  status: string;
};

export type EmployeeDirectoryDetail = {
  id: string;
  recordId: string;
  employeeCode: string;
  fullName: string;
  status: string;
  employmentType: string;
  employmentTypeLabel: string;
  department: string;
  designation: string;
  classGroup: string;
  mobile: string;
  email: string;
  joinDate: string | null;
  joinDateDisplay: string;
  bankAccount: string;
  bankIfsc: string;
  panNumber: string;
  uanNumber: string;
  pfNumber: string;
  esicNumber: string;
  epfApplicable: boolean;
  esicApplicable: boolean;
  remarks: string;
  updatedAt: string;
  updatedDisplay: string;
  profile: Record<string, unknown>;
  salary: {
    basicSalary: number;
    grossSalary: number;
    netSalary: number;
    hra: number;
    da: number;
    specialAllowance: number;
    conveyanceAllowance: number;
    otherAllowances: number;
    totalDeductions: number;
  } | null;
};

export async function listEmployeeDirectory(params?: { q?: string; status?: string; seed?: boolean }) {
  const q = new URLSearchParams();
  if (params?.q) q.set('q', params.q);
  if (params?.status) q.set('status', params.status);
  if (params?.seed) q.set('seed', '1');
  const query = q.toString();
  return api<{ records: EmployeeDirectoryRow[] }>(`/api/hr/employees${query ? `?${query}` : ''}`);
}

export async function fetchEmployeeDirectoryDetail(id: string) {
  return api<{ record: EmployeeDirectoryDetail }>(`/api/hr/employees/${id}`);
}

export async function createEmployeeDirectory(body: Record<string, unknown>) {
  return api<{ record: EmployeeDirectoryDetail }>('/api/hr/employees', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function updateEmployeeDirectory(id: string, body: Record<string, unknown>) {
  return api<{ record: EmployeeDirectoryDetail }>(`/api/hr/employees/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function seedEmployeeDirectoryDemo() {
  return api<{ record: EmployeeDirectoryDetail; message: string }>('/api/hr/employees/seed-demo', {
    method: 'POST',
  });
}

export type HrDepartmentSummary = {
  id: string;
  code: string;
  name: string;
  parentId: string | null;
  campus: string;
  status: string;
  budgetAllocation: number;
  email: string;
  phone: string;
  updatedAt: string;
};

export type HrDepartmentEmployee = {
  index: number;
  id: string;
  employeeCode: string;
  fullName: string;
  designation: string;
  mobile: string;
  email: string;
  status: string;
  statusLabel: string;
};

export type HrDepartmentDetail = HrDepartmentSummary & {
  headEmployeeId: string;
  reportsToEmployeeId: string;
  shortDescription: string;
  detailedDescription: string;
  costCenter: string;
  workingDays: string[];
  logoUrl: string;
  notes: string;
  functions: string[];
  structureTree: Array<{ id: string; label: string; children?: Array<{ id: string; label: string }> }>;
  settings: Record<string, string>;
  head: { id: string; employeeCode: string; fullName: string; designation: string; label: string } | null;
  reportsTo: { id: string; employeeCode: string; fullName: string; designation: string; label: string } | null;
  employees: HrDepartmentEmployee[];
  parentOptions: Array<{ id: string; name: string; code: string }>;
  createdAt: string;
};

export type EmployeeOption = {
  id: string;
  employeeCode: string;
  fullName: string;
  designation: string;
  department: string;
  label: string;
};

export async function listHrDepartments(params?: { q?: string; seed?: boolean }) {
  const q = new URLSearchParams();
  if (params?.q) q.set('q', params.q);
  if (params?.seed) q.set('seed', '1');
  const query = q.toString();
  return api<{ records: HrDepartmentSummary[] }>(`/api/hr/departments${query ? `?${query}` : ''}`);
}

export async function fetchHrDepartment(id: string) {
  return api<{ record: HrDepartmentDetail }>(`/api/hr/departments/${id}`);
}

export async function fetchDepartmentEmployeeOptions() {
  return api<{ records: EmployeeOption[] }>('/api/hr/departments/employee-options');
}

export async function createHrDepartment(body: Record<string, unknown>) {
  return api<{ record: HrDepartmentDetail }>('/api/hr/departments', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function updateHrDepartment(id: string, body: Record<string, unknown>) {
  return api<{ record: HrDepartmentDetail }>(`/api/hr/departments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export type DesignationRow = {
  id: string;
  name: string;
  department: string;
  designationType: string;
  totalPositions: number;
  filledPositions: number;
  vacantPositions: number;
  utilizationPct: number;
  status: string;
  statusLabel: string;
};

export type DepartmentSummaryRow = {
  department: string;
  totalPositions: number;
  filled: number;
  vacant: number;
};

export type DesignationsDashboard = {
  summary: {
    totalDesignations: number;
    totalPositions: number;
    filledPositions: number;
    vacantPositions: number;
    departmentCoverage: number;
    utilizationRate: number;
  };
  departmentSummary: DepartmentSummaryRow[];
  records: DesignationRow[];
  total: number;
  page: number;
  pageSize: number;
  filterOptions: {
    departments: string[];
    designationTypes: string[];
  };
};

export async function fetchDesignationsDashboard(params?: {
  q?: string;
  department?: string;
  designationType?: string;
  status?: string;
  page?: number;
  pageSize?: number;
  seed?: boolean;
}) {
  const q = new URLSearchParams();
  if (params?.q) q.set('q', params.q);
  if (params?.department) q.set('department', params.department);
  if (params?.designationType) q.set('designationType', params.designationType);
  if (params?.status) q.set('status', params.status);
  if (params?.page) q.set('page', String(params.page));
  if (params?.pageSize) q.set('pageSize', String(params.pageSize));
  if (params?.seed) q.set('seed', '1');
  const query = q.toString();
  return api<DesignationsDashboard>(`/api/hr/designations${query ? `?${query}` : ''}`);
}

export async function fetchDesignationReference() {
  return api<{ categories: Record<string, string[]> }>('/api/hr/designations/reference');
}

export async function createHrDesignation(body: {
  name: string;
  department: string;
  designationType?: string;
  totalPositions?: number;
  filledPositions?: number;
  status?: string;
}) {
  return api<{ record: DesignationRow }>('/api/hr/designations', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function updateHrDesignation(
  id: string,
  body: Partial<{
    name: string;
    department: string;
    designationType: string;
    totalPositions: number;
    filledPositions: number;
    status: string;
  }>,
) {
  return api<{ record: DesignationRow }>(`/api/hr/designations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function deleteHrDesignation(id: string) {
  return api<{ ok: boolean }>(`/api/hr/designations/${id}`, { method: 'DELETE' });
}

// ─── Attendance & Leave ──────────────────────────────────────────────────────

export type HrAttendanceMeta = {
  statuses: Array<{ value: string; label: string }>;
  shifts: Array<{ id: string; code: string; name: string; startTime: string; endTime: string; breakMinutes: number; graceMinutes: number; weeklyOff: string[]; isNightShift: boolean; isFlexible: boolean; status: string }>;
  settings: Record<string, unknown>;
  employees: Array<{ id: string; employeeCode: string; fullName: string; department: string; designation: string; employmentType: string; label: string }>;
  departments: string[];
  designations: string[];
  campuses: string[];
  branches: string[];
  biometricVendors: string[];
  biometricModes: string[];
  workflowSteps: string[];
  correctionWorkflow: string[];
};

export type HrDailyAttendanceRow = {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  department: string;
  designation: string;
  employmentType: string;
  recordDate: string;
  shiftCode: string;
  inTime: string;
  outTime: string;
  workingHours: number;
  status: string;
  statusLabel: string;
  overtimeHours: number;
  lateMinutes: number;
  earlyExitMinutes: number;
  isMissingPunch: boolean;
  remarks: string;
  approvalStatus: string;
  source: string;
};

export async function fetchHrAttendanceMeta(seed?: boolean) {
  return api<HrAttendanceMeta>(`/api/hr/attendance/meta${seed ? '?seed=1' : ''}`);
}

export async function fetchHrAttendanceDashboard(date?: string, seed?: boolean) {
  const q = new URLSearchParams();
  if (date) q.set('date', date);
  if (seed) q.set('seed', '1');
  const query = q.toString();
  return api<{
    date: string;
    summary: Record<string, number>;
    payrollFormula: string[];
    payrollMappingFields: string[];
    approvalWorkflow: string[];
    correctionWorkflow: string[];
  }>(`/api/hr/attendance/dashboard${query ? `?${query}` : ''}`);
}

export async function fetchHrDailyAttendance(params?: Record<string, string | undefined>) {
  const q = new URLSearchParams();
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v) q.set(k, v);
    }
  }
  const query = q.toString();
  return api<{ date: string; records: HrDailyAttendanceRow[]; periodLock: { workflowStatus: string; lockedAt: string | null }; isLocked: boolean }>(
    `/api/hr/attendance/daily${query ? `?${query}` : ''}`,
  );
}

export async function saveHrDailyAttendance(date: string, rows: Partial<HrDailyAttendanceRow>[]) {
  return api<{ date: string; records: HrDailyAttendanceRow[] }>('/api/hr/attendance/daily/save', {
    method: 'POST',
    body: JSON.stringify({
      date,
      rows: rows.map((r) => ({
        employeeId: r.employeeId,
        shiftCode: r.shiftCode,
        inTime: r.inTime,
        outTime: r.outTime,
        workingHours: r.workingHours,
        status: r.status,
        overtimeHours: r.overtimeHours,
        lateMinutes: r.lateMinutes,
        earlyExitMinutes: r.earlyExitMinutes,
        isMissingPunch: r.isMissingPunch,
        remarks: r.remarks,
      })),
    }),
  });
}

export async function submitHrDailyAttendance(date: string) {
  return api('/api/hr/attendance/daily/submit', { method: 'POST', body: JSON.stringify({ date }) });
}

export async function approveHrDailyAttendance(date: string) {
  return api('/api/hr/attendance/daily/approve', { method: 'POST', body: JSON.stringify({ date }) });
}

export async function fetchHrMonthlyRegister(year: number, month: number) {
  return api<{ year: number; month: number; workingDays: number; rows: Array<Record<string, unknown>> }>(
    `/api/hr/attendance/monthly-register?year=${year}&month=${month}`,
  );
}

export async function fetchHrEmployeeAttendanceCard(employeeId: string, year: number, month: number) {
  return api(`/api/hr/attendance/employee-card/${employeeId}?year=${year}&month=${month}`);
}

export async function fetchHrPayrollAttendancePreview(employeeId: string, year: number, month: number) {
  return api<{
    employee: { id: string; employeeCode: string; fullName: string };
    formula: Array<{ step: string; value: number; type: string }>;
    payrollMapping: Record<string, number>;
  }>(`/api/hr/attendance/payroll-preview/${employeeId}?year=${year}&month=${month}`);
}

export async function fetchHrAttendanceCorrections() {
  return api<{ records: Array<Record<string, unknown>> }>('/api/hr/attendance/corrections');
}

export async function createHrAttendanceCorrection(body: Record<string, unknown>) {
  return api('/api/hr/attendance/corrections', { method: 'POST', body: JSON.stringify(body) });
}

export async function advanceHrCorrectionWorkflow(id: string, action: 'approve' | 'reject', remarks?: string) {
  return api(`/api/hr/attendance/corrections/${id}/workflow`, {
    method: 'POST',
    body: JSON.stringify({ action, remarks }),
  });
}

export async function fetchHrAttendancePeriodLock(year: number, month: number) {
  return api(`/api/hr/attendance/period-lock?year=${year}&month=${month}`);
}

export async function advanceHrAttendancePeriodLock(year: number, month: number) {
  return api('/api/hr/attendance/period-lock/advance', {
    method: 'POST',
    body: JSON.stringify({ year, month }),
  });
}

export async function fetchHrBiometricSummary() {
  return api<{ supportedVendors: string[]; supportedModes: string[]; devices: Array<Record<string, unknown>>; functions: string[] }>(
    '/api/hr/attendance/biometric',
  );
}

export async function updateHrAttendanceSettings(body: Record<string, unknown>) {
  return api('/api/hr/attendance/settings', { method: 'PATCH', body: JSON.stringify(body) });
}

// ─── Leave Management ────────────────────────────────────────────────────────

export type HrLeaveDashboard = {
  academicYear: string;
  campus: string;
  year: number;
  month: number;
  summary: {
    totalEmployees: number;
    onLeaveToday: number;
    pendingRequests: number;
    approvedThisMonth: number;
    rejectedThisMonth: number;
    lwpThisMonth: number;
  };
  leaveRequests: Array<Record<string, unknown>>;
  holidayCalendar: { year: number; month: number; days: Array<{ date: string; day: number; events: Array<{ label: string; type: string }> }> };
  balanceSummary: Array<{ employeeId: string; employeeName: string; department: string; cl: number; el: number; sl: number; compOff: number; lwp: number }>;
  departmentOverview: Array<{ department: string; totalEmployees: number; onLeave: number; available: number; utilization: number }>;
  holidayList: Array<{ id: string; date: string; day: string; name: string; type: string; applicableTo: string; status: string }>;
  legend: Array<{ label: string; color: string }>;
};

export async function fetchHrLeaveDashboard(params?: {
  academicYear?: string;
  campus?: string;
  year?: number;
  month?: number;
  seed?: boolean;
}) {
  const q = new URLSearchParams();
  if (params?.academicYear) q.set('academicYear', params.academicYear);
  if (params?.campus) q.set('campus', params.campus);
  if (params?.year) q.set('year', String(params.year));
  if (params?.month) q.set('month', String(params.month));
  if (params?.seed) q.set('seed', '1');
  const query = q.toString();
  return api<HrLeaveDashboard>(`/api/hr/leave/dashboard${query ? `?${query}` : ''}`);
}

export async function fetchHrLeavePolicies() {
  return api<{ records: Array<Record<string, unknown>>; leaveTypeDefs: Array<Record<string, unknown>> }>('/api/hr/leave/policies');
}

export async function fetchHrLeavePolicy(id: string) {
  return api<{ record: Record<string, unknown> }>(`/api/hr/leave/policies/${id}`);
}

export async function fetchHrLeaveBalances(academicYear?: string, employeeId?: string) {
  const q = new URLSearchParams();
  if (academicYear) q.set('academicYear', academicYear);
  if (employeeId) q.set('employeeId', employeeId);
  const query = q.toString();
  return api<{ records: Array<Record<string, unknown>> }>(`/api/hr/leave/balances${query ? `?${query}` : ''}`);
}

export async function fetchHrLeaveSettings() {
  return api<{ settings: Record<string, unknown> }>('/api/hr/leave/settings');
}

export async function updateHrLeaveSettings(body: Record<string, unknown>) {
  return api('/api/hr/leave/settings', { method: 'PATCH', body: JSON.stringify(body) });
}

export async function createHrLeaveApplication(body: Record<string, unknown>) {
  return api('/api/hr/leave/applications', { method: 'POST', body: JSON.stringify(body) });
}

export async function advanceHrLeaveWorkflow(id: string, action: 'approve' | 'reject' | 'return', remarks?: string) {
  return api(`/api/hr/leave/applications/${id}/workflow`, {
    method: 'POST',
    body: JSON.stringify({ action, remarks }),
  });
}

// ─── Payroll Management ──────────────────────────────────────────────────────

export type HrPayrollDashboard = {
  academicYear: string;
  branch: string;
  payPeriod: string;
  payPeriodLabel: string;
  month: number;
  year: number;
  summary: {
    totalEmployees: number;
    processed: number;
    pending: number;
    grossSalary: number;
    netSalary: number;
    deductions: number;
  };
  employees: Array<{
    id: string;
    employeeCode: string;
    fullName: string;
    designation: string;
    department: string;
    activeNet: number;
    hasActiveStructure: boolean;
  }>;
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  selectedEmployeeId: string | null;
  selectedEmployee: Record<string, unknown> | null;
  upcomingHolidays: Array<{ id: string; date: string; day: string; name: string; type: string }>;
  payRun: {
    month: number;
    year: number;
    branch: string;
    rows: Array<Record<string, unknown>>;
    summary: Record<string, unknown>;
  };
  payslipGeneration: Record<string, unknown>;
  subModules: string[];
};

export async function fetchHrPayrollDashboard(params?: {
  employeeId?: string;
  payPeriod?: string;
  academicYear?: string;
  branch?: string;
  q?: string;
  page?: number;
  pageSize?: number;
  seed?: boolean;
}) {
  const q = new URLSearchParams();
  if (params?.employeeId) q.set('employeeId', params.employeeId);
  if (params?.payPeriod) q.set('payPeriod', params.payPeriod);
  if (params?.academicYear) q.set('academicYear', params.academicYear);
  if (params?.branch) q.set('branch', params.branch);
  if (params?.q) q.set('q', params.q);
  if (params?.page) q.set('page', String(params.page));
  if (params?.pageSize) q.set('pageSize', String(params.pageSize));
  if (params?.seed) q.set('seed', '1');
  const query = q.toString();
  return api<HrPayrollDashboard>(`/api/hr/payroll/dashboard${query ? `?${query}` : ''}`);
}

export async function generateHrPayRun(payPeriod: string, workingDays?: number, presentDays?: number) {
  return api('/api/hr/payroll/pay-run/generate', {
    method: 'POST',
    body: JSON.stringify({ payPeriod, workingDays, presentDays }),
  });
}

export async function approveHrPayRun(payPeriod: string) {
  return api('/api/hr/payroll/pay-run/approve', {
    method: 'POST',
    body: JSON.stringify({ payPeriod }),
  });
}

export type SalaryStructureComponent = {
  id: string;
  componentName: string;
  formula: string;
  percentage: number;
  fixedAmount: number;
  pfApplicable: boolean;
  esiApplicable: boolean;
  gratuity: boolean;
  taxable: boolean;
  displayOrder: number;
  status: string;
  amount?: number;
};

export type HrSalaryStructureTemplate = {
  id: string;
  structureCode: string;
  name: string;
  description: string;
  payGrade: string;
  payFrequency: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  currency: string;
  status: string;
  earnings: SalaryStructureComponent[];
  deductions: SalaryStructureComponent[];
  employerContributions: SalaryStructureComponent[];
  totalEarnings: number;
  totalDeductions: number;
  employerContribution: number;
  ctc: number;
  netSalary: number;
  assignmentCount: number;
  createdAt: string;
  updatedAt: string;
};

export type HrSalaryStructureAssignment = {
  id: string;
  templateId: string;
  employeeId: string;
  effectiveDate: string;
  annualCtc: number;
  monthlySalary: number;
  payFrequency: string;
  status: string;
  employeeCode: string;
  employeeName: string;
  department: string;
  designation: string;
  structureCode: string;
  structureName: string;
};

export type SalaryStructureEmployeeOption = {
  id: string;
  employeeCode: string;
  fullName: string;
  department: string;
  designation: string;
  label: string;
};

export type SalaryStructurePreview = {
  totalEarnings: number;
  totalDeductions: number;
  employerContribution: number;
  ctc: number;
  netSalary: number;
  preview: {
    earnings: SalaryStructureComponent[];
    deductions: SalaryStructureComponent[];
    employerContributions: SalaryStructureComponent[];
  };
};

export type SalaryStructurePageData = {
  templates: HrSalaryStructureTemplate[];
  assignments: HrSalaryStructureAssignment[];
  employees: SalaryStructureEmployeeOption[];
};

export async function fetchSalaryStructures(params?: {
  q?: string;
  status?: string;
  templateId?: string;
  seed?: boolean;
}) {
  const qs = new URLSearchParams();
  if (params?.q) qs.set('q', params.q);
  if (params?.status) qs.set('status', params.status);
  if (params?.templateId) qs.set('templateId', params.templateId);
  if (params?.seed) qs.set('seed', '1');
  const suffix = qs.toString() ? `?${qs}` : '';
  return api<SalaryStructurePageData>(`/api/hr/salary-structures${suffix}`);
}

export async function fetchSalaryStructureDetail(id: string) {
  return api<{ template: HrSalaryStructureTemplate; assignments: HrSalaryStructureAssignment[] }>(
    `/api/hr/salary-structures/${id}`,
  );
}

export async function createSalaryStructureTemplate(body: Record<string, unknown>) {
  return api<{ template: HrSalaryStructureTemplate }>('/api/hr/salary-structures', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function updateSalaryStructureTemplate(id: string, body: Record<string, unknown>) {
  return api<{ template: HrSalaryStructureTemplate }>(`/api/hr/salary-structures/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function cloneSalaryStructureTemplate(id: string, name?: string) {
  return api<{ template: HrSalaryStructureTemplate }>(`/api/hr/salary-structures/${id}/clone`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export async function previewSalaryStructureTemplate(body: Record<string, unknown>) {
  return api<{ preview: SalaryStructurePreview }>('/api/hr/salary-structures/preview', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function assignSalaryStructure(body: {
  templateId: string;
  employeeId: string;
  effectiveDate: string;
  annualCtc?: number;
  monthlySalary?: number;
  payFrequency?: string;
  syncPayrollStructure?: boolean;
}) {
  return api<{ assignment: HrSalaryStructureAssignment }>('/api/hr/salary-structures/assign', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export type HrSalaryComponentGroup = {
  id: string;
  code: string;
  name: string;
  description: string;
  status: string;
  displayOrder: number;
  componentCount: number;
};

export type HrSalaryComponentRow = {
  id: string;
  groupId: string | null;
  groupCode: string;
  groupName: string;
  code: string;
  name: string;
  componentType: string;
  calculationType: string;
  calculationTypeLabel: string;
  formula: string;
  formulaDisplay: string;
  percentage: number;
  fixedAmount: number;
  taxable: boolean;
  taxability: string;
  pfApplicable: boolean;
  esiApplicable: boolean;
  gratuity: boolean;
  displayOrder: number;
  status: string;
  description: string;
  advancedSettings: Record<string, unknown>;
};

export type HrSalaryComponentMapping = {
  id: string;
  componentId: string;
  componentCode: string;
  componentName: string;
  componentType: string;
  templateId: string | null;
  structureCode: string;
  structureName: string;
  payGrade: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  priority: number;
  status: string;
};

export type HrSalaryComponentHistoryRow = {
  id: string;
  componentId: string;
  componentCode: string;
  componentName: string;
  action: string;
  changedBy: string;
  snapshot: unknown;
  remarks: string;
  createdAt: string;
};

export type AllowancesDeductionsDashboard = {
  groups: HrSalaryComponentGroup[];
  components: HrSalaryComponentRow[];
  mappings: HrSalaryComponentMapping[];
  history: HrSalaryComponentHistoryRow[];
  templates: Array<{ id: string; structureCode: string; name: string; payGrade: string }>;
  summary: {
    totalGroups: number;
    totalComponents: number;
    totalMappings: number;
    earnings: number;
    deductions: number;
    employerContributions: number;
    activeEarnings: number;
    activeDeductions: number;
    activeEmployer: number;
  };
  calculationTypes: Array<{ value: string; label: string }>;
};

export async function fetchAllowancesDeductions(params?: {
  componentType?: string;
  groupId?: string;
  calculationType?: string;
  taxability?: string;
  status?: string;
  q?: string;
  seed?: boolean;
}) {
  const qs = new URLSearchParams();
  if (params?.componentType) qs.set('componentType', params.componentType);
  if (params?.groupId) qs.set('groupId', params.groupId);
  if (params?.calculationType) qs.set('calculationType', params.calculationType);
  if (params?.taxability) qs.set('taxability', params.taxability);
  if (params?.status) qs.set('status', params.status);
  if (params?.q) qs.set('q', params.q);
  if (params?.seed) qs.set('seed', '1');
  const suffix = qs.toString() ? `?${qs}` : '';
  return api<AllowancesDeductionsDashboard>(`/api/hr/allowances-deductions${suffix}`);
}

export async function fetchSalaryComponentDetail(id: string) {
  return api<{ component: HrSalaryComponentRow; history: HrSalaryComponentHistoryRow[] }>(
    `/api/hr/allowances-deductions/components/${id}`,
  );
}

export async function createSalaryComponent(body: Record<string, unknown>) {
  return api<{ component: HrSalaryComponentRow }>('/api/hr/allowances-deductions/components', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function updateSalaryComponent(id: string, body: Record<string, unknown>) {
  return api<{ component: HrSalaryComponentRow }>(`/api/hr/allowances-deductions/components/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function deleteSalaryComponent(id: string) {
  return api<{ ok: boolean }>(`/api/hr/allowances-deductions/components/${id}`, { method: 'DELETE' });
}

export async function createSalaryComponentGroup(body: Record<string, unknown>) {
  return api<{ group: HrSalaryComponentGroup }>('/api/hr/allowances-deductions/groups', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function updateSalaryComponentGroup(id: string, body: Record<string, unknown>) {
  return api<{ group: HrSalaryComponentGroup }>(`/api/hr/allowances-deductions/groups/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function deleteSalaryComponentGroup(id: string) {
  return api<{ ok: boolean }>(`/api/hr/allowances-deductions/groups/${id}`, { method: 'DELETE' });
}

export async function createSalaryComponentMapping(body: Record<string, unknown>) {
  return api<{ mapping: HrSalaryComponentMapping }>('/api/hr/allowances-deductions/mappings', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function deleteSalaryComponentMapping(id: string) {
  return api<{ ok: boolean }>(`/api/hr/allowances-deductions/mappings/${id}`, { method: 'DELETE' });
}

export async function previewComponentFormula(body: Record<string, unknown>) {
  return api<{ preview: { amount: number; explanation: string; inputs: Record<string, number> } }>(
    '/api/hr/allowances-deductions/preview-formula',
    { method: 'POST', body: JSON.stringify(body) },
  );
}

export type AttendancePolicyDashboard = {
  purpose: string;
  policies: Array<{
    id: string;
    policyCode: string;
    name: string;
    description: string;
    effectiveFrom: string | null;
    applicableTo: {
      employeeTypes: string[];
      departments: string[];
      designations: string[];
      campuses: string[];
      branches: string[];
    };
    status: string;
    assignmentCount: number;
  }>;
  activePolicyId: string | null;
  selectedPolicy: AttendancePolicyDashboard['policies'][0] | null;
  calendar: {
    calendarName: string;
    workingDays: string[];
    weekendDays: string[];
    weeklyOffRule: string;
    holidayRule: string;
    gazettedHolidays: Array<{ id: string; date: string; name: string; type: string }>;
    restrictedHolidays: Array<{ id: string; date: string; name: string; type: string }>;
    branchHolidays: Array<{ id: string; date: string; name: string; type: string }>;
    totalHolidays: number;
  };
  leaveTypes: Array<Record<string, unknown>>;
  leaveTypeCatalog: Array<{ code: string; name: string }>;
  rules: {
    carryForward: boolean;
    encashment: boolean;
    negativeBalance: boolean;
    autoApproval: boolean;
    managerApproval: boolean;
    lopCalculation: string;
    sandwichRule: boolean;
    halfDayCalculation: string;
    maxConsecutiveLeave: number;
    minimumNoticeDays: number;
    leaveYearStart: string;
    approvalLevels: string[];
  };
  assignments: Array<{
    id: string;
    employeeId: string;
    employeeCode: string;
    employeeName: string;
    department: string;
    policyId: string;
    policyCode: string;
    policyName: string;
    effectiveDate: string;
    status: string;
  }>;
  employees: Array<{ id: string; employeeCode: string; fullName: string; department: string; designation: string }>;
  academicYear: string;
};

export async function fetchAttendancePolicy(params?: { academicYear?: string; seed?: boolean }) {
  const qs = new URLSearchParams();
  if (params?.academicYear) qs.set('academicYear', params.academicYear);
  if (params?.seed) qs.set('seed', '1');
  const suffix = qs.toString() ? `?${qs}` : '';
  return api<AttendancePolicyDashboard>(`/api/hr/attendance-policy${suffix}`);
}

export async function updateAttendancePolicy(body: Record<string, unknown>) {
  return api<AttendancePolicyDashboard>('/api/hr/attendance-policy', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function assignLeavePolicy(body: { policyId: string; employeeId: string; effectiveDate: string }) {
  return api<{ assignment: AttendancePolicyDashboard['assignments'][0] }>('/api/hr/attendance-policy/assign', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function removeLeavePolicyAssignment(id: string) {
  return api<{ ok: boolean }>(`/api/hr/attendance-policy/assignments/${id}`, { method: 'DELETE' });
}

export type ShiftManagementDashboard = {
  kpis: {
    totalEmployees: number;
    shiftWiseEmployees: { morning: number; evening: number; night: number; total: number };
    lateArrivalPct: number;
    overtimeHours: number;
    holidayDuty: number;
    substituteClasses: number;
    attendancePct: number;
    shiftUtilization: number;
    pendingChangeRequests: number;
    pendingOvertime: number;
  };
  workingHours: Record<string, unknown>;
  shifts: Array<Record<string, unknown>>;
  shiftTypes: Array<{ value: string; label: string }>;
  departments: string[];
  departmentMappings: Array<Record<string, unknown>>;
  assignments: Array<Record<string, unknown>>;
  changeRequests: Array<Record<string, unknown>>;
  substitutes: Array<Record<string, unknown>>;
  overtime: Array<Record<string, unknown>>;
  duties: Array<Record<string, unknown>>;
  planner: {
    weekStart: string;
    days: string[];
    timeSlots: string[];
    entries: Array<Record<string, unknown>>;
    colorLegend: Array<{ code: string; label: string }>;
  };
  timetable: Record<string, unknown>;
  settings: Record<string, unknown>;
  employees: Array<{ id: string; employeeCode: string; fullName: string; department: string; designation: string; employmentType: string }>;
  workflows: Record<string, string[]>;
  roles: Array<{ role: string; responsibilities: string }>;
};

export async function fetchShiftManagement(seed?: boolean) {
  const qs = seed ? '?seed=1' : '';
  return api<ShiftManagementDashboard>(`/api/hr/shift-management${qs}`);
}

export async function createHrShiftMaster(body: Record<string, unknown>) {
  return api('/api/hr/shift-management/shifts', { method: 'POST', body: JSON.stringify(body) });
}

export async function updateHrShiftMaster(id: string, body: Record<string, unknown>) {
  return api(`/api/hr/shift-management/shifts/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export async function updateShiftWorkingHours(body: Record<string, unknown>) {
  return api<ShiftManagementDashboard>('/api/hr/shift-management/working-hours', { method: 'PATCH', body: JSON.stringify(body) });
}

export async function assignEmployeeShift(body: Record<string, unknown>) {
  return api<ShiftManagementDashboard>('/api/hr/shift-management/assignments', { method: 'POST', body: JSON.stringify(body) });
}

export async function mapDepartmentShift(body: Record<string, unknown>) {
  return api<ShiftManagementDashboard>('/api/hr/shift-management/department-mapping', { method: 'POST', body: JSON.stringify(body) });
}

export async function createShiftChangeRequest(body: Record<string, unknown>) {
  return api('/api/hr/shift-management/change-requests', { method: 'POST', body: JSON.stringify(body) });
}

export async function advanceShiftChangeRequest(id: string, action: 'approve' | 'reject') {
  return api<ShiftManagementDashboard>(`/api/hr/shift-management/change-requests/${id}/workflow`, {
    method: 'POST',
    body: JSON.stringify({ action }),
  });
}

export async function assignShiftSubstitute(body: Record<string, unknown>) {
  return api('/api/hr/shift-management/substitutes', { method: 'POST', body: JSON.stringify(body) });
}

export async function createShiftOvertime(body: Record<string, unknown>) {
  return api('/api/hr/shift-management/overtime', { method: 'POST', body: JSON.stringify(body) });
}

export async function advanceShiftOvertime(id: string, action: 'approve' | 'reject') {
  return api<ShiftManagementDashboard>(`/api/hr/shift-management/overtime/${id}/workflow`, {
    method: 'POST',
    body: JSON.stringify({ action }),
  });
}

export async function assignShiftDuty(body: Record<string, unknown>) {
  return api('/api/hr/shift-management/duties', { method: 'POST', body: JSON.stringify(body) });
}

export async function updateShiftSettings(body: Record<string, unknown>) {
  return api<ShiftManagementDashboard>('/api/hr/shift-management/settings', { method: 'PATCH', body: JSON.stringify(body) });
}

export type PerformanceAppraisalRow = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  department: string;
  designation: string;
  academicYear: string;
  quarter: string;
  staffType: string;
  classSubject: string;
  kpiScore: number;
  competencyScore: number;
  attendanceScore: number;
  behaviourScore: number;
  feedbackScore: number;
  innovationScore: number;
  trainingScore: number;
  taskActionScore: number;
  improvementScore: number;
  parentEngScore: number;
  parentFbScore: number;
  studentFbScore: number;
  overallScore: number;
  ratingBand: string;
  outcome: string;
  workflowStage: string;
  status: string;
  publishedToMobile: boolean;
};

export type PerformanceAppraisalDashboard = {
  academicYear: string;
  quarter: string;
  academicYears: string[];
  cycles: Array<{
    id: string; cycleType: string; cycleNumber: number; name: string;
    periodStart: string; periodEnd: string; reviewDueDate: string;
    reviewDueLabel: string; periodLabel: string; status: string;
  }>;
  selectedCycle: { id: string; cycleType: string; name: string; periodLabel: string; reviewDueLabel: string } | null;
  kpis: { teachers: number; evaluations: number; completed: number; avgScore: number; pending: number };
  analytics: {
    departmentPerformance: Array<{ department: string; avgScore: number; count: number }>;
    topPerformers: PerformanceAppraisalRow[];
    pipCount: number;
    promotionReady: number;
    avgAppraisalScore: number;
    hipoCount: number;
  };
  appraisals: PerformanceAppraisalRow[];
  annualReviews: Array<Record<string, unknown>>;
  pips: Array<Record<string, unknown>>;
  developmentPlans: Array<Record<string, unknown>>;
  kpiLibrary: Array<{ id: string; category: string; code: string; name: string; staffType: string; weight: number; status: string }>;
  payGrades: Array<{ id: string; code: string; name: string; level: number; minSalary: number; maxSalary: number; status: string }>;
  settings: Record<string, unknown>;
  employees: Array<{ id: string; employeeCode: string; fullName: string; department: string; designation: string; employmentType: string }>;
  workflowStages: string[];
  kpiCategories: string[];
};

export async function fetchPerformanceAppraisal(opts?: { seed?: boolean; academicYear?: string; quarter?: string }) {
  const params = new URLSearchParams();
  if (opts?.seed) params.set('seed', '1');
  if (opts?.academicYear) params.set('academicYear', opts.academicYear);
  if (opts?.quarter) params.set('quarter', opts.quarter);
  const qs = params.toString() ? `?${params}` : '';
  return api<PerformanceAppraisalDashboard>(`/api/hr/performance-appraisal${qs}`);
}

export async function generatePerformanceAppraisals(body: { academicYear: string; quarter: string }) {
  return api<{ created: number; total: number; data: PerformanceAppraisalDashboard }>(
    '/api/hr/performance-appraisal/generate',
    { method: 'POST', body: JSON.stringify(body) },
  );
}

export async function createHrPerformanceAppraisal(body: Record<string, unknown>) {
  return api('/api/hr/performance-appraisal/appraisals', { method: 'POST', body: JSON.stringify(body) });
}

export async function updateHrPerformanceAppraisal(id: string, body: Record<string, unknown>) {
  return api<{ appraisal: PerformanceAppraisalRow }>(`/api/hr/performance-appraisal/appraisals/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export async function advancePerformanceWorkflow(id: string) {
  return api<{ appraisal: PerformanceAppraisalRow }>(`/api/hr/performance-appraisal/appraisals/${id}/workflow`, { method: 'POST', body: '{}' });
}

export async function publishPerformanceToMobile(body: { ids: string[]; academicYear: string; quarter: string }) {
  return api<PerformanceAppraisalDashboard>('/api/hr/performance-appraisal/publish-mobile', { method: 'POST', body: JSON.stringify(body) });
}

export async function computeHrAnnualReviews(academicYear: string) {
  return api<PerformanceAppraisalDashboard>('/api/hr/performance-appraisal/annual-reviews/compute', {
    method: 'POST',
    body: JSON.stringify({ academicYear }),
  });
}

export async function updatePerformanceAppraisalSettings(body: Record<string, unknown>) {
  return api<PerformanceAppraisalDashboard>('/api/hr/performance-appraisal/settings', { method: 'PATCH', body: JSON.stringify(body) });
}

export async function createHrPerformanceKpi(body: Record<string, unknown>) {
  return api<PerformanceAppraisalDashboard>('/api/hr/performance-appraisal/kpis', { method: 'POST', body: JSON.stringify(body) });
}

export type RecruitmentDashboard = {
  academicYear: string;
  academicYears: string[];
  workflow: Array<{ key: string; label: string }>;
  kpis: {
    openVacancies: number; positionsFilled: number; timeToHireDays: number;
    costPerHire: number; offerAcceptanceRate: number; activeCandidates: number;
    pendingRequisitions: number; interviewsScheduled: number;
    onboardingInProgress: number; probationActive: number;
  };
  pipeline: Array<{ stage: string; label: string; count: number }>;
  manpowerPlans: Array<Record<string, unknown>>;
  requisitions: Array<Record<string, unknown>>;
  postings: Array<Record<string, unknown>>;
  candidates: Array<Record<string, unknown>>;
  applications: Array<Record<string, unknown>>;
  interviews: Array<Record<string, unknown>>;
  offers: Array<Record<string, unknown>>;
  backgroundVerifications: Array<Record<string, unknown>>;
  referenceChecks: Array<Record<string, unknown>>;
  onboardings: Array<Record<string, unknown>>;
  settings: Record<string, unknown>;
  departments: string[];
  employmentTypes: string[];
  hiringReasons: string[];
  roles: Array<{ role: string; permissions: string }>;
};

export async function fetchRecruitment(opts?: { seed?: boolean; academicYear?: string }) {
  const params = new URLSearchParams();
  if (opts?.seed) params.set('seed', '1');
  if (opts?.academicYear) params.set('academicYear', opts.academicYear);
  const qs = params.toString() ? `?${params}` : '';
  return api<RecruitmentDashboard>(`/api/hr/recruitment${qs}`);
}

export async function createManpowerPlan(body: Record<string, unknown>) {
  const r = await api<{ data: RecruitmentDashboard }>('/api/hr/recruitment/manpower-plans', { method: 'POST', body: JSON.stringify(body) });
  return r.data;
}

export async function createJobRequisition(body: Record<string, unknown>) {
  const r = await api<{ data: RecruitmentDashboard }>('/api/hr/recruitment/requisitions', { method: 'POST', body: JSON.stringify(body) });
  return r.data;
}

export async function createJobPosting(requisitionId: string) {
  const r = await api<{ data: RecruitmentDashboard }>('/api/hr/recruitment/postings', {
    method: 'POST', body: JSON.stringify({ requisitionId }),
  });
  return r.data;
}

export async function createEmployeeFromOnboarding(id: string) {
  return api<{ data: RecruitmentDashboard }>(`/api/hr/recruitment/onboarding/${id}/create-employee`, { method: 'POST', body: '{}' });
}

export async function advanceRequisitionWorkflow(id: string, action: 'approve' | 'reject' | 'return' | 'hold') {
  return api<RecruitmentDashboard>(`/api/hr/recruitment/requisitions/${id}/workflow`, {
    method: 'POST', body: JSON.stringify({ action }),
  });
}

export async function publishJobPosting(id: string, channels: string[]) {
  return api<RecruitmentDashboard>(`/api/hr/recruitment/postings/${id}/publish`, {
    method: 'POST', body: JSON.stringify({ channels }),
  });
}

export async function createRecruitmentCandidate(body: Record<string, unknown>) {
  return api<RecruitmentDashboard>('/api/hr/recruitment/candidates', { method: 'POST', body: JSON.stringify(body) });
}

export async function createRecruitmentApplication(body: { candidateId: string; postingId: string }) {
  return api<RecruitmentDashboard>('/api/hr/recruitment/applications', { method: 'POST', body: JSON.stringify(body) });
}

export async function advanceRecruitmentApplication(id: string, action?: string) {
  return api<RecruitmentDashboard>(`/api/hr/recruitment/applications/${id}/advance`, {
    method: 'POST', body: JSON.stringify({ action }),
  });
}

export async function createRecruitmentInterview(body: Record<string, unknown>) {
  return api<RecruitmentDashboard>('/api/hr/recruitment/interviews', { method: 'POST', body: JSON.stringify(body) });
}

export async function createRecruitmentOffer(body: Record<string, unknown>) {
  return api<RecruitmentDashboard>('/api/hr/recruitment/offers', { method: 'POST', body: JSON.stringify(body) });
}

export async function advanceRecruitmentOffer(id: string) {
  return api<RecruitmentDashboard>(`/api/hr/recruitment/offers/${id}/workflow`, { method: 'POST', body: '{}' });
}

export async function acceptRecruitmentOffer(id: string) {
  return api<RecruitmentDashboard>(`/api/hr/recruitment/offers/${id}/accept`, { method: 'POST', body: '{}' });
}

export async function confirmRecruitmentProbation(id: string) {
  return api<RecruitmentDashboard>(`/api/hr/recruitment/onboarding/${id}/confirm`, { method: 'POST', body: '{}' });
}

export async function updateRecruitmentSettings(body: Record<string, unknown>) {
  return api<RecruitmentDashboard>('/api/hr/recruitment/settings', { method: 'PATCH', body: JSON.stringify(body) });
}

export type TrainingDashboard = {
  academicYear: string;
  academicYears: string[];
  workflow: Array<{ step: number; label: string; key: string }>;
  databaseMasters: string[];
  automationRules: Record<string, unknown>;
  kpis: {
    totalTrainings: number; totalParticipants: number; completionRate: number;
    averageScore: number; certificationRate: number; attendancePct: number;
    feedbackRating: number; budgetUtilization: number; trainingHours: number;
    mandatoryCompliancePct: number; upcomingBatches: number;
  };
  categories: Array<{ id: string; code: string; name: string; parentGroup: string; status: string }>;
  categoryGroups: string[];
  courses: Array<Record<string, unknown>>;
  trainers: Array<Record<string, unknown>>;
  venues: Array<Record<string, unknown>>;
  trainingNeeds: Array<Record<string, unknown>>;
  annualPlan: Record<string, unknown> | null;
  batches: Array<Record<string, unknown>>;
  nominations: Array<Record<string, unknown>>;
  assessments: Array<Record<string, unknown>>;
  assignments: Array<Record<string, unknown>>;
  feedbacks: Array<Record<string, unknown>>;
  competencies: Array<Record<string, unknown>>;
  certificates: Array<Record<string, unknown>>;
  budgets: Array<Record<string, unknown>>;
  externalTrainings: Array<Record<string, unknown>>;
  idps: Array<Record<string, unknown>>;
  calendar: Array<Record<string, unknown>>;
  settings: Record<string, unknown>;
  employees: Array<{ id: string; employeeCode: string; fullName: string; department: string; designation: string }>;
  tnaSources: string[];
};

export async function fetchTrainingDashboard(opts?: { seed?: boolean; academicYear?: string }) {
  const params = new URLSearchParams();
  if (opts?.seed) params.set('seed', '1');
  if (opts?.academicYear) params.set('academicYear', opts.academicYear);
  const qs = params.toString() ? `?${params}` : '';
  return api<TrainingDashboard>(`/api/hr/training${qs}`);
}

export async function createTrainingNeed(body: Record<string, unknown>) {
  return api<TrainingDashboard>('/api/hr/training/needs', { method: 'POST', body: JSON.stringify(body) });
}

export async function approveTrainingAnnualPlan(academicYear: string) {
  return api<TrainingDashboard>('/api/hr/training/annual-plan/approve', { method: 'POST', body: JSON.stringify({ academicYear }) });
}

export async function markTrainingAttendance(nominationId: string, method = 'QR') {
  return api<TrainingDashboard>(`/api/hr/training/nominations/${nominationId}/attendance`, {
    method: 'POST', body: JSON.stringify({ method }),
  });
}

export async function completeTrainingAssessment(assessmentId: string, score: number) {
  return api<TrainingDashboard>(`/api/hr/training/assessments/${assessmentId}/complete`, {
    method: 'POST', body: JSON.stringify({ score }),
  });
}

export async function nominateForTraining(batchId: string, employeeId: string) {
  return api<TrainingDashboard>('/api/hr/training/nominations', {
    method: 'POST', body: JSON.stringify({ batchId, employeeId }),
  });
}

export async function updateTrainingSettings(body: Record<string, unknown>) {
  return api<TrainingDashboard>('/api/hr/training/settings', { method: 'PATCH', body: JSON.stringify(body) });
}

export type EdomsDashboard = {
  workflow: Array<{ step: number; label: string; key: string }>;
  verificationWorkflow: Array<{ step: number; label: string }>;
  moduleStructure: string[];
  documentCategories: string[];
  kpis: {
    activeOnboarding: number; confirmedEmployees: number; pendingVerification: number;
    verifiedDocuments: number; totalDocuments: number; expiringSoon: number; checklistCompletion: number;
  };
  onboardings: Array<Record<string, unknown>>;
  documents: Array<Record<string, unknown>>;
  qualifications: Array<Record<string, unknown>>;
  employmentHistory: Array<Record<string, unknown>>;
  verifications: Array<Record<string, unknown>>;
  checklists: Array<Record<string, unknown>>;
  assets: Array<Record<string, unknown>>;
  systemAccesses: Array<Record<string, unknown>>;
  inductions: Array<Record<string, unknown>>;
  probations: Array<Record<string, unknown>>;
  employmentLetters: Array<Record<string, unknown>>;
  expiringDocuments: Array<Record<string, unknown>>;
  auditLogs: Array<Record<string, unknown>>;
  settings: Record<string, unknown>;
  automationRules: string[];
};

export async function fetchEdomsDashboard(seed?: boolean) {
  const qs = seed ? '?seed=1' : '';
  return api<EdomsDashboard>(`/api/hr/edoms${qs}`);
}

export async function activateEdomsPortal(caseId: string) {
  return api<EdomsDashboard>(`/api/hr/edoms/cases/${caseId}/activate-portal`, { method: 'POST', body: '{}' });
}

export async function verifyEdomsDocument(id: string, action: 'verify' | 'reject' | 'correction') {
  return api<EdomsDashboard>(`/api/hr/edoms/documents/${id}/verify`, {
    method: 'POST', body: JSON.stringify({ action }),
  });
}

export async function advanceEdomsWorkflow(caseId: string) {
  return api<EdomsDashboard>(`/api/hr/edoms/cases/${caseId}/advance`, { method: 'POST', body: '{}' });
}

export async function createEdomsEmployee(caseId: string) {
  return api<EdomsDashboard>(`/api/hr/edoms/cases/${caseId}/create-employee`, { method: 'POST', body: '{}' });
}

export async function completeEdomsChecklist(id: string) {
  return api<EdomsDashboard>(`/api/hr/edoms/checklists/${id}/complete`, {
    method: 'POST', body: JSON.stringify({ completedBy: 'HR Executive' }),
  });
}

export async function confirmEdomsProbation(caseId: string) {
  return api<EdomsDashboard>(`/api/hr/edoms/cases/${caseId}/confirm`, { method: 'POST', body: '{}' });
}

// ─── Staff Resignation & Exit Management (SEMS) ─────────────────────────

export type ExitDashboard = {
  workflow: { step: number; label: string; key: string }[];
  approvalWorkflow: { step: number; label: string }[];
  clearanceWorkflow: { step: number; label: string }[];
  moduleStructure: string[];
  resignationTypes: string[];
  kpis: {
    totalCases: number; pendingApprovals: number; approvedResignations: number;
    inNoticePeriod: number; completedExits: number; pendingClearances: number;
    pendingFnf: number; attritionRate: number;
  };
  resignations: Record<string, unknown>[];
  approvals: Record<string, unknown>[];
  retentions: Record<string, unknown>[];
  handovers: Record<string, unknown>[];
  knowledgeTransfers: Record<string, unknown>[];
  clearances: Record<string, unknown>[];
  assetRecoveries: Record<string, unknown>[];
  fnfSettlements: Record<string, unknown>[];
  leaveSettlements: Record<string, unknown>[];
  exitInterviews: Record<string, unknown>[];
  documents: Record<string, unknown>[];
  alumniRecords: Record<string, unknown>[];
  auditLogs: Record<string, unknown>[];
  analytics: {
    departmentAttrition: { department: string; count: number }[];
    resignationTypes: { type: string; count: number }[];
    avgNoticePeriod: number;
  };
  settings: Record<string, unknown>;
  automationRules: string[];
};

export async function fetchExitDashboard(seed?: boolean) {
  const qs = seed ? '?seed=1' : '';
  return api<ExitDashboard>(`/api/hr/exit-management${qs}`);
}

export async function submitExitResignation(caseId: string) {
  return api<ExitDashboard>(`/api/hr/exit-management/cases/${caseId}/submit`, { method: 'POST', body: '{}' });
}

export async function processExitApproval(id: string, action: 'approve' | 'reject' | 'clarify', remarks = '') {
  return api<ExitDashboard>(`/api/hr/exit-management/approvals/${id}/action`, {
    method: 'POST', body: JSON.stringify({ action, remarks }),
  });
}

export async function advanceExitWorkflow(caseId: string) {
  return api<ExitDashboard>(`/api/hr/exit-management/cases/${caseId}/advance`, { method: 'POST', body: '{}' });
}

export async function approveExitClearance(id: string, remarks = '') {
  return api<ExitDashboard>(`/api/hr/exit-management/clearances/${id}/approve`, {
    method: 'POST', body: JSON.stringify({ remarks }),
  });
}

export async function completeExitHandover(id: string) {
  return api<ExitDashboard>(`/api/hr/exit-management/handovers/${id}/complete`, { method: 'POST', body: '{}' });
}

export async function recoverExitAsset(id: string) {
  return api<ExitDashboard>(`/api/hr/exit-management/assets/${id}/recover`, { method: 'POST', body: '{}' });
}

export async function approveExitFnf(caseId: string) {
  return api<ExitDashboard>(`/api/hr/exit-management/cases/${caseId}/approve-fnf`, { method: 'POST', body: '{}' });
}

export async function initiateExitRetention(caseId: string, retentionType: string) {
  return api<ExitDashboard>(`/api/hr/exit-management/cases/${caseId}/retention`, {
    method: 'POST', body: JSON.stringify({ retentionType }),
  });
}

// ─── HR Reports ─────────────────────────────────────────────────────────

export type HrReportCategory = {
  id: string;
  title: string;
  borderColor: string;
  colSpan?: number;
  footer?: string;
  sections: { title: string; reports: { key: string; label: string }[] }[];
};

export type HrReportsMeta = {
  catalog: HrReportCategory[];
  summary: {
    totalReportTypes: number;
    activeEmployees: number;
    resignationCases: number;
    onboardingCases: number;
    leaveApplications: number;
    payrollSlips: number;
    generatedAt: string;
  };
  exportFormats: string[];
};

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

export async function fetchHrReportsMeta() {
  return api<HrReportsMeta>('/api/hr/reports');
}

export async function fetchHrReport(
  key: string,
  filters?: { academicYear?: string; dateFrom?: string; dateTo?: string; department?: string },
) {
  const params = new URLSearchParams();
  if (filters?.academicYear) params.set('academicYear', filters.academicYear);
  if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters?.dateTo) params.set('dateTo', filters.dateTo);
  if (filters?.department) params.set('department', filters.department);
  const qs = params.toString() ? `?${params}` : '';
  return api<HrReportPayload>(`/api/hr/reports/${encodeURIComponent(key)}${qs}`);
}
