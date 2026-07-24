import { SubModuleView } from './shared/SubModuleView';
import { PayrollCalendarView } from './hr/PayrollCalendarView';
import { EmployeeDashboardView } from './hr/EmployeeDashboardView';
import { EmployeesDirectoryView } from './hr/EmployeesDirectoryView';
import { DepartmentsView } from './hr/DepartmentsView';
import { DesignationsView } from './hr/DesignationsView';
import { AttendanceLeaveView } from './hr/AttendanceLeaveView';
import { LeaveManagementView } from './hr/LeaveManagementView';
import { PayrollManagementView } from './hr/PayrollManagementView';
import { SalaryStructureView } from './hr/SalaryStructureView';
import { AllowancesDeductionsView } from './hr/AllowancesDeductionsView';
import { AttendancePolicyView } from './hr/AttendancePolicyView';
import { ShiftManagementView } from './hr/ShiftManagementView';
import { PerformanceAppraisalView } from './hr/PerformanceAppraisalView';
import { RecruitmentView } from './hr/RecruitmentView';
import { TrainingDevelopmentView } from './hr/TrainingDevelopmentView';
import { DocumentsView } from './hr/DocumentsView';
import { ResignationExitView } from './hr/ResignationExitView';
import { HrReportsView } from './hr/HrReportsView';

const PAYROLL_CALENDAR_VIEWS = new Set<string>();

export function HrPayrollManagementCRM({
  currentView = 'Employee Dashboard',
  onNavigate,
}: {
  currentView?: string;
  onNavigate?: (view: string) => void;
}) {
  if (currentView && PAYROLL_CALENDAR_VIEWS.has(currentView)) {
    return <PayrollCalendarView title={currentView} />;
  }
  if (currentView === 'Employees Directory') {
    return <EmployeesDirectoryView onNavigate={onNavigate} />;
  }
  if (currentView === 'Departments') {
    return <DepartmentsView onNavigate={onNavigate} />;
  }
  if (currentView === 'Designations') {
    return <DesignationsView />;
  }
  if (currentView === 'Attendance & Leave') {
    return <AttendanceLeaveView />;
  }
  if (currentView === 'Leave Management') {
    return <LeaveManagementView />;
  }
  if (currentView === 'Payroll Management') {
    return <PayrollManagementView onNavigate={onNavigate} />;
  }
  if (currentView === 'Salary Structure') {
    return <SalaryStructureView />;
  }
  if (currentView === 'Allowances & Deductions') {
    return <AllowancesDeductionsView />;
  }
  if (currentView === 'Attendance Policy') {
    return <AttendancePolicyView />;
  }
  if (currentView === 'Shift Management') {
    return <ShiftManagementView />;
  }
  if (currentView === 'Performance Appraisal') {
    return <PerformanceAppraisalView />;
  }
  if (currentView === 'Recruitment') {
    return <RecruitmentView />;
  }
  if (currentView === 'Training & Development') {
    return <TrainingDevelopmentView />;
  }
  if (currentView === 'Documents') {
    return <DocumentsView />;
  }
  if (currentView === 'Resignation / Exit') {
    return <ResignationExitView />;
  }
  if (currentView === 'Reports') {
    return <HrReportsView />;
  }
  if (currentView && currentView !== 'Employee Dashboard') {
    return <SubModuleView module="HR & Payroll Management" title={currentView} />;
  }
  return <EmployeeDashboardView onNavigate={onNavigate} />;
}
