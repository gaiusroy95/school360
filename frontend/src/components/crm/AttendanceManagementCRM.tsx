import { lazy, Suspense, type ReactNode } from 'react';
import { SubModuleView } from './shared/SubModuleView';

const StudentAttendanceDashboardView = lazy(() =>
  import('./AttendanceManagement/StudentAttendanceDashboardView').then((m) => ({ default: m.StudentAttendanceDashboardView })),
);
const TeacherAttendanceView = lazy(() =>
  import('./AttendanceManagement/TeacherAttendanceView').then((m) => ({ default: m.TeacherAttendanceView })),
);
const StaffAttendanceView = lazy(() =>
  import('./AttendanceManagement/StaffAttendanceView').then((m) => ({ default: m.StaffAttendanceView })),
);
const AttendanceByDateView = lazy(() =>
  import('./AttendanceManagement/AttendanceByDateView').then((m) => ({ default: m.AttendanceByDateView })),
);
const DailySummaryView = lazy(() =>
  import('./AttendanceManagement/DailySummaryView').then((m) => ({ default: m.DailySummaryView })),
);
const AttendanceReportView = lazy(() =>
  import('./AttendanceManagement/AttendanceReportView').then((m) => ({ default: m.AttendanceReportView })),
);
const LeaveManagementView = lazy(() =>
  import('./AttendanceManagement/LeaveManagementView').then((m) => ({ default: m.LeaveManagementView })),
);
const HolidayCalendarView = lazy(() =>
  import('./AttendanceManagement/HolidayCalendarView').then((m) => ({ default: m.HolidayCalendarView })),
);
const GatePassView = lazy(() =>
  import('./AttendanceManagement/GatePassView').then((m) => ({ default: m.GatePassView })),
);
const LateEarlyExitView = lazy(() =>
  import('./AttendanceManagement/LateEarlyExitView').then((m) => ({ default: m.LateEarlyExitView })),
);
const BiometricDevicesView = lazy(() =>
  import('./AttendanceManagement/BiometricDevicesView').then((m) => ({ default: m.BiometricDevicesView })),
);

type Props = {
  currentView?: string;
  onNavigate?: (view: string) => void;
};

function wrap(node: ReactNode) {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[30vh] text-sm text-slate-400">Loading page…</div>}>
      {node}
    </Suspense>
  );
}

export function AttendanceManagementCRM({ currentView = 'Student Attendance', onNavigate }: Props) {
  switch (currentView) {
    case 'Student Attendance':
      return wrap(<StudentAttendanceDashboardView onNavigate={onNavigate} />);
    case 'Teacher Attendance':
      return wrap(<TeacherAttendanceView />);
    case 'Staff Attendance':
      return wrap(<StaffAttendanceView />);
    case 'Attendance By Date':
      return wrap(<AttendanceByDateView />);
    case 'Daily Summary':
      return wrap(<DailySummaryView />);
    case 'Attendance Report':
      return wrap(<AttendanceReportView />);
    case 'Leave Management':
      return wrap(<LeaveManagementView />);
    case 'Holiday Calendar':
      return wrap(<HolidayCalendarView />);
    case 'Gate Pass':
      return wrap(<GatePassView />);
    case 'Late Coming / Early Exit':
      return wrap(<LateEarlyExitView />);
    case 'Biometric Devices':
      return wrap(<BiometricDevicesView />);
    default:
      return <SubModuleView module="Attendance Management" title={currentView} />;
  }
}
