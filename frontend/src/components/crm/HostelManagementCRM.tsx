import { SubModuleView } from './shared/SubModuleView';
import { HostelDashboardView } from './hostel/HostelDashboardView';
import { RoomsAllotmentView } from './hostel/RoomsAllotmentView';
import { HostelStudentsView } from './hostel/HostelStudentsView';
import { VisitorManagementView } from './hostel/VisitorManagementView';
import { MessManagementView } from './hostel/MessManagementView';
import { LeaveManagementView } from './hostel/LeaveManagementView';
import { HostelGatePassView } from './hostel/HostelGatePassView';
import { ComplaintsFeedbackView } from './hostel/ComplaintsFeedbackView';
import { MaintenanceView } from './hostel/MaintenanceView';
import { InventoryView } from './hostel/InventoryView';
import { LaundryManagementView } from './hostel/LaundryManagementView';
import { DisciplineIncidentsView } from './hostel/DisciplineIncidentsView';
import { HostelReportsAnalyticsView } from './hostel/HostelReportsAnalyticsView';

export function HostelManagementCRM({
  currentView = 'Hostel Dashboard',
  onNavigate,
}: {
  currentView?: string;
  onNavigate?: (view: string) => void;
}) {
  if (currentView === 'Hostel Dashboard' || !currentView) {
    return <HostelDashboardView onNavigate={onNavigate} />;
  }
  if (currentView === 'Rooms & Allotment') {
    return <RoomsAllotmentView />;
  }
  if (currentView === 'Students') {
    return <HostelStudentsView />;
  }
  if (currentView === 'Visitor Management') {
    return <VisitorManagementView />;
  }
  if (currentView === 'Mess Management') {
    return <MessManagementView />;
  }
  if (currentView === 'Leave Management') {
    return <LeaveManagementView />;
  }
  if (currentView === 'Gate Pass') {
    return <HostelGatePassView />;
  }
  if (currentView === 'Complaints / Feedback') {
    return <ComplaintsFeedbackView />;
  }
  if (currentView === 'Maintenance') {
    return <MaintenanceView />;
  }
  if (currentView === 'Inventory') {
    return <InventoryView />;
  }
  if (currentView === 'Laundry Management') {
    return <LaundryManagementView />;
  }
  if (currentView === 'Discipline & Incidents') {
    return <DisciplineIncidentsView />;
  }
  if (currentView === 'Reports & Analytics') {
    return <HostelReportsAnalyticsView />;
  }
  if (currentView) {
    return <SubModuleView module="Hostel Management" title={currentView} />;
  }
  return <HostelDashboardView onNavigate={onNavigate} />;
}
