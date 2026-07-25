import { SubModuleView } from './shared/SubModuleView';
import { TransportDashboardView } from './transport/TransportDashboardView';
import { RouteVehicleMasterView } from './transport/RouteVehicleMasterView';
import { RoutePlanningView } from './transport/RoutePlanningView';
import { LiveVehicleTrackingView } from './transport/LiveVehicleTrackingView';
import { StudentTransportationView } from './transport/StudentTransportationView';
import { DriverAttendantView } from './transport/DriverAttendantView';
import { TripManagementView } from './transport/TripManagementView';
import { StopsGeoFencingView } from './transport/StopsGeoFencingView';
import { TransportAttendanceView } from './transport/TransportAttendanceView';
import { TransportFeesView } from './transport/TransportFeesView';
import { MaintenanceServiceView } from './transport/MaintenanceServiceView';
import { FuelManagementView } from './transport/FuelManagementView';
import { SafetyAlertsView } from './transport/SafetyAlertsView';
import { TransportReportsAnalyticsView } from './transport/TransportReportsAnalyticsView';

export function TransportManagementCRM({
  currentView = 'Transport Dashboard',
  onNavigate,
}: {
  currentView?: string;
  onNavigate?: (view: string) => void;
}) {
  if (currentView === 'Transport Dashboard' || !currentView) {
    return <TransportDashboardView onNavigate={onNavigate} />;
  }
  if (currentView === 'Route & Vehicle Master') {
    return <RouteVehicleMasterView />;
  }
  if (currentView === 'Route Planning') {
    return <RoutePlanningView />;
  }
  if (currentView === 'Live Vehicle Tracking') {
    return <LiveVehicleTrackingView />;
  }
  if (currentView === 'Student Transportation') {
    return <StudentTransportationView />;
  }
  if (currentView === 'Driver & Attendant') {
    return <DriverAttendantView />;
  }
  if (currentView === 'Trip Management') {
    return <TripManagementView />;
  }
  if (currentView === 'Stops & Geo Fencing') {
    return <StopsGeoFencingView />;
  }
  if (currentView === 'Transport Attendance') {
    return <TransportAttendanceView />;
  }
  if (currentView === 'Transport Fees') {
    return <TransportFeesView />;
  }
  if (currentView === 'Maintenance & Service') {
    return <MaintenanceServiceView />;
  }
  if (currentView === 'Fuel Management') {
    return <FuelManagementView />;
  }
  if (currentView === 'Safety & Alerts') {
    return <SafetyAlertsView />;
  }
  if (currentView === 'Reports & Analytics') {
    return <TransportReportsAnalyticsView />;
  }
  if (currentView) {
    return <SubModuleView module="Transport Management" title={currentView} />;
  }
  return <TransportDashboardView onNavigate={onNavigate} />;
}
