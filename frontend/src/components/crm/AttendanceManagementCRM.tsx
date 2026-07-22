import { SubModuleView } from './shared/SubModuleView';
import { StudentAttendanceDashboardView } from './AttendanceManagement/StudentAttendanceDashboardView';
import { TeacherAttendanceView } from './AttendanceManagement/TeacherAttendanceView';
import { StaffAttendanceView } from './AttendanceManagement/StaffAttendanceView';
import { AttendanceByDateView } from './AttendanceManagement/AttendanceByDateView';
import { DailySummaryView } from './AttendanceManagement/DailySummaryView';
import { AttendanceReportView } from './AttendanceManagement/AttendanceReportView';
import { LeaveManagementView } from './AttendanceManagement/LeaveManagementView';
import { HolidayCalendarView } from './AttendanceManagement/HolidayCalendarView';
import { GatePassView } from './AttendanceManagement/GatePassView';
import { LateEarlyExitView } from './AttendanceManagement/LateEarlyExitView';
import { BiometricDevicesView } from './AttendanceManagement/BiometricDevicesView';

type Props = {
  currentView?: string;
  onNavigate?: (view: string) => void;
};

export function AttendanceManagementCRM({ currentView = 'Student Attendance', onNavigate }: Props) {
  switch (currentView) {
    case 'Student Attendance':
      return <StudentAttendanceDashboardView onNavigate={onNavigate} />;
    case 'Teacher Attendance':
      return <TeacherAttendanceView />;
    case 'Staff Attendance':
      return <StaffAttendanceView />;
    case 'Attendance By Date':
      return <AttendanceByDateView />;
    case 'Daily Summary':
      return <DailySummaryView />;
    case 'Attendance Report':
      return <AttendanceReportView />;
    case 'Leave Management':
      return <LeaveManagementView />;
    case 'Holiday Calendar':
      return <HolidayCalendarView />;
    case 'Gate Pass':
      return <GatePassView />;
    case 'Late Coming / Early Exit':
      return <LateEarlyExitView />;
    case 'Biometric Devices':
      return <BiometricDevicesView />;
    default:
      return <SubModuleView module="Attendance Management" title={currentView} />;
  }
}
