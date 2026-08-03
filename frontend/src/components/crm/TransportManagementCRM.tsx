import { lazy, Suspense, type ReactNode } from 'react';
import { SubModuleView } from './shared/SubModuleView';

const TransportDashboardView = lazy(() =>
  import('./transport/TransportDashboardView').then((m) => ({ default: m.TransportDashboardView })),
);
const RouteVehicleMasterView = lazy(() =>
  import('./transport/RouteVehicleMasterView').then((m) => ({ default: m.RouteVehicleMasterView })),
);
const RoutePlanningView = lazy(() =>
  import('./transport/RoutePlanningView').then((m) => ({ default: m.RoutePlanningView })),
);
const LiveVehicleTrackingView = lazy(() =>
  import('./transport/LiveVehicleTrackingView').then((m) => ({ default: m.LiveVehicleTrackingView })),
);
const StudentTransportationView = lazy(() =>
  import('./transport/StudentTransportationView').then((m) => ({ default: m.StudentTransportationView })),
);
const DriverAttendantView = lazy(() =>
  import('./transport/DriverAttendantView').then((m) => ({ default: m.DriverAttendantView })),
);
const TripManagementView = lazy(() =>
  import('./transport/TripManagementView').then((m) => ({ default: m.TripManagementView })),
);
const StopsGeoFencingView = lazy(() =>
  import('./transport/StopsGeoFencingView').then((m) => ({ default: m.StopsGeoFencingView })),
);
const TransportAttendanceView = lazy(() =>
  import('./transport/TransportAttendanceView').then((m) => ({ default: m.TransportAttendanceView })),
);
const TransportFeesView = lazy(() =>
  import('./transport/TransportFeesView').then((m) => ({ default: m.TransportFeesView })),
);
const MaintenanceServiceView = lazy(() =>
  import('./transport/MaintenanceServiceView').then((m) => ({ default: m.MaintenanceServiceView })),
);
const FuelManagementView = lazy(() =>
  import('./transport/FuelManagementView').then((m) => ({ default: m.FuelManagementView })),
);
const SafetyAlertsView = lazy(() =>
  import('./transport/SafetyAlertsView').then((m) => ({ default: m.SafetyAlertsView })),
);
const TransportReportsAnalyticsView = lazy(() =>
  import('./transport/TransportReportsAnalyticsView').then((m) => ({ default: m.TransportReportsAnalyticsView })),
);

function wrap(node: ReactNode) {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[30vh] text-sm text-slate-400">Loading page…</div>}>
      {node}
    </Suspense>
  );
}

export function TransportManagementCRM({
  currentView = 'Transport Dashboard',
  onNavigate,
}: {
  currentView?: string;
  onNavigate?: (view: string) => void;
}) {
  if (currentView === 'Transport Dashboard' || !currentView) {
    return wrap(<TransportDashboardView onNavigate={onNavigate} />);
  }
  if (currentView === 'Route & Vehicle Master') {
    return wrap(<RouteVehicleMasterView />);
  }
  if (currentView === 'Route Planning') {
    return wrap(<RoutePlanningView />);
  }
  if (currentView === 'Live Vehicle Tracking') {
    return wrap(<LiveVehicleTrackingView />);
  }
  if (currentView === 'Student Transportation') {
    return wrap(<StudentTransportationView />);
  }
  if (currentView === 'Driver & Attendant') {
    return wrap(<DriverAttendantView />);
  }
  if (currentView === 'Trip Management') {
    return wrap(<TripManagementView />);
  }
  if (currentView === 'Stops & Geo Fencing') {
    return wrap(<StopsGeoFencingView />);
  }
  if (currentView === 'Transport Attendance') {
    return wrap(<TransportAttendanceView />);
  }
  if (currentView === 'Transport Fees') {
    return wrap(<TransportFeesView />);
  }
  if (currentView === 'Maintenance & Service') {
    return wrap(<MaintenanceServiceView />);
  }
  if (currentView === 'Fuel Management') {
    return wrap(<FuelManagementView />);
  }
  if (currentView === 'Safety & Alerts') {
    return wrap(<SafetyAlertsView />);
  }
  if (currentView === 'Reports & Analytics') {
    return wrap(<TransportReportsAnalyticsView />);
  }
  if (currentView) {
    return <SubModuleView module="Transport Management" title={currentView} />;
  }
  return wrap(<TransportDashboardView onNavigate={onNavigate} />);
}
