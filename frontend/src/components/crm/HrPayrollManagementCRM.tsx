import { lazy, Suspense, type ReactNode } from 'react';
import { SubModuleView } from './shared/SubModuleView';

const PayrollCalendarView = lazy(() =>
  import('./hr/PayrollCalendarView').then((m) => ({ default: m.PayrollCalendarView })),
);
const EmployeeDashboardView = lazy(() =>
  import('./hr/EmployeeDashboardView').then((m) => ({ default: m.EmployeeDashboardView })),
);
const EmployeesDirectoryView = lazy(() =>
  import('./hr/EmployeesDirectoryView').then((m) => ({ default: m.EmployeesDirectoryView })),
);
const DepartmentsView = lazy(() =>
  import('./hr/DepartmentsView').then((m) => ({ default: m.DepartmentsView })),
);
const DesignationsView = lazy(() =>
  import('./hr/DesignationsView').then((m) => ({ default: m.DesignationsView })),
);
const ApprovalHierarchyView = lazy(() =>
  import('./hr/ApprovalHierarchyView').then((m) => ({ default: m.ApprovalHierarchyView })),
);
const AttendanceLeaveView = lazy(() =>
  import('./hr/AttendanceLeaveView').then((m) => ({ default: m.AttendanceLeaveView })),
);
const LeaveManagementView = lazy(() =>
  import('./hr/LeaveManagementView').then((m) => ({ default: m.LeaveManagementView })),
);
const PayrollManagementView = lazy(() =>
  import('./hr/PayrollManagementView').then((m) => ({ default: m.PayrollManagementView })),
);
const SalaryStructureView = lazy(() =>
  import('./hr/SalaryStructureView').then((m) => ({ default: m.SalaryStructureView })),
);
const AllowancesDeductionsView = lazy(() =>
  import('./hr/AllowancesDeductionsView').then((m) => ({ default: m.AllowancesDeductionsView })),
);
const AttendancePolicyView = lazy(() =>
  import('./hr/AttendancePolicyView').then((m) => ({ default: m.AttendancePolicyView })),
);
const ShiftManagementView = lazy(() =>
  import('./hr/ShiftManagementView').then((m) => ({ default: m.ShiftManagementView })),
);
const PerformanceAppraisalView = lazy(() =>
  import('./hr/PerformanceAppraisalView').then((m) => ({ default: m.PerformanceAppraisalView })),
);
const RecruitmentView = lazy(() =>
  import('./hr/RecruitmentView').then((m) => ({ default: m.RecruitmentView })),
);
const TrainingDevelopmentView = lazy(() =>
  import('./hr/TrainingDevelopmentView').then((m) => ({ default: m.TrainingDevelopmentView })),
);
const DocumentsView = lazy(() =>
  import('./hr/DocumentsView').then((m) => ({ default: m.DocumentsView })),
);
const ResignationExitView = lazy(() =>
  import('./hr/ResignationExitView').then((m) => ({ default: m.ResignationExitView })),
);
const HrReportsView = lazy(() =>
  import('./hr/HrReportsView').then((m) => ({ default: m.HrReportsView })),
);

const PAYROLL_CALENDAR_VIEWS = new Set<string>();

function wrap(node: ReactNode) {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[30vh] text-sm text-slate-400">Loading page…</div>}>
      {node}
    </Suspense>
  );
}

export function HrPayrollManagementCRM({
  currentView = 'Employee Dashboard',
  onNavigate,
}: {
  currentView?: string;
  onNavigate?: (view: string) => void;
}) {
  if (currentView && PAYROLL_CALENDAR_VIEWS.has(currentView)) {
    return wrap(<PayrollCalendarView title={currentView} />);
  }
  if (currentView === 'Employees Directory') {
    return wrap(<EmployeesDirectoryView onNavigate={onNavigate} />);
  }
  if (currentView === 'Departments') {
    return wrap(<DepartmentsView onNavigate={onNavigate} />);
  }
  if (currentView === 'Designations') {
    return wrap(<DesignationsView />);
  }
  if (currentView === 'Approval Hierarchy') {
    return wrap(<ApprovalHierarchyView />);
  }
  if (currentView === 'Attendance & Leave') {
    return wrap(<AttendanceLeaveView />);
  }
  if (currentView === 'Leave Management') {
    return wrap(<LeaveManagementView />);
  }
  if (currentView === 'Payroll Management') {
    return wrap(<PayrollManagementView onNavigate={onNavigate} />);
  }
  if (currentView === 'Salary Structure') {
    return wrap(<SalaryStructureView />);
  }
  if (currentView === 'Allowances & Deductions') {
    return wrap(<AllowancesDeductionsView />);
  }
  if (currentView === 'Attendance Policy') {
    return wrap(<AttendancePolicyView />);
  }
  if (currentView === 'Shift Management') {
    return wrap(<ShiftManagementView />);
  }
  if (currentView === 'Performance Appraisal') {
    return wrap(<PerformanceAppraisalView />);
  }
  if (currentView === 'Recruitment') {
    return wrap(<RecruitmentView />);
  }
  if (currentView === 'Training & Development') {
    return wrap(<TrainingDevelopmentView />);
  }
  if (currentView === 'Documents') {
    return wrap(<DocumentsView />);
  }
  if (currentView === 'Resignation / Exit') {
    return wrap(<ResignationExitView />);
  }
  if (currentView === 'Reports') {
    return wrap(<HrReportsView />);
  }
  if (currentView && currentView !== 'Employee Dashboard') {
    return <SubModuleView module="HR & Payroll Management" title={currentView} />;
  }
  return wrap(<EmployeeDashboardView onNavigate={onNavigate} />);
}
