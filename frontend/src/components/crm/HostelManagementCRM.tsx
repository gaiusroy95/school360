import { lazy, Suspense, type ReactNode } from 'react';
import { SubModuleView } from './shared/SubModuleView';

const HostelDashboardView = lazy(() =>
  import('./hostel/HostelDashboardView').then((m) => ({ default: m.HostelDashboardView })),
);
const RoomsAllotmentView = lazy(() =>
  import('./hostel/RoomsAllotmentView').then((m) => ({ default: m.RoomsAllotmentView })),
);
const HostelStudentsView = lazy(() =>
  import('./hostel/HostelStudentsView').then((m) => ({ default: m.HostelStudentsView })),
);
const VisitorManagementView = lazy(() =>
  import('./hostel/VisitorManagementView').then((m) => ({ default: m.VisitorManagementView })),
);
const MessManagementView = lazy(() =>
  import('./hostel/MessManagementView').then((m) => ({ default: m.MessManagementView })),
);
const LeaveManagementView = lazy(() =>
  import('./hostel/LeaveManagementView').then((m) => ({ default: m.LeaveManagementView })),
);
const HostelGatePassView = lazy(() =>
  import('./hostel/HostelGatePassView').then((m) => ({ default: m.HostelGatePassView })),
);
const ComplaintsFeedbackView = lazy(() =>
  import('./hostel/ComplaintsFeedbackView').then((m) => ({ default: m.ComplaintsFeedbackView })),
);
const MaintenanceView = lazy(() =>
  import('./hostel/MaintenanceView').then((m) => ({ default: m.MaintenanceView })),
);
const InventoryView = lazy(() =>
  import('./hostel/InventoryView').then((m) => ({ default: m.InventoryView })),
);
const LaundryManagementView = lazy(() =>
  import('./hostel/LaundryManagementView').then((m) => ({ default: m.LaundryManagementView })),
);
const DisciplineIncidentsView = lazy(() =>
  import('./hostel/DisciplineIncidentsView').then((m) => ({ default: m.DisciplineIncidentsView })),
);
const HostelReportsAnalyticsView = lazy(() =>
  import('./hostel/HostelReportsAnalyticsView').then((m) => ({ default: m.HostelReportsAnalyticsView })),
);
const WardensStaffView = lazy(() =>
  import('./hostel/WardensStaffView').then((m) => ({ default: m.WardensStaffView })),
);

function wrap(node: ReactNode) {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[30vh] text-sm text-slate-400">Loading page…</div>}>
      {node}
    </Suspense>
  );
}

export function HostelManagementCRM({
  currentView = 'Hostel Dashboard',
  onNavigate,
}: {
  currentView?: string;
  onNavigate?: (view: string) => void;
}) {
  if (currentView === 'Hostel Dashboard' || !currentView) {
    return wrap(<HostelDashboardView onNavigate={onNavigate} />);
  }
  if (currentView === 'Rooms & Allotment') {
    return wrap(<RoomsAllotmentView />);
  }
  if (currentView === 'Students') {
    return wrap(<HostelStudentsView />);
  }
  if (currentView === 'Wardens / Staff') {
    return wrap(<WardensStaffView />);
  }
  if (currentView === 'Visitor Management') {
    return wrap(<VisitorManagementView />);
  }
  if (currentView === 'Mess Management') {
    return wrap(<MessManagementView />);
  }
  if (currentView === 'Leave Management') {
    return wrap(<LeaveManagementView />);
  }
  if (currentView === 'Gate Pass') {
    return wrap(<HostelGatePassView />);
  }
  if (currentView === 'Complaints / Feedback') {
    return wrap(<ComplaintsFeedbackView />);
  }
  if (currentView === 'Maintenance') {
    return wrap(<MaintenanceView />);
  }
  if (currentView === 'Inventory') {
    return wrap(<InventoryView />);
  }
  if (currentView === 'Laundry Management') {
    return wrap(<LaundryManagementView />);
  }
  if (currentView === 'Discipline & Incidents') {
    return wrap(<DisciplineIncidentsView />);
  }
  if (currentView === 'Reports & Analytics') {
    return wrap(<HostelReportsAnalyticsView />);
  }
  if (currentView) {
    return <SubModuleView module="Hostel Management" title={currentView} />;
  }
  return wrap(<HostelDashboardView onNavigate={onNavigate} />);
}
