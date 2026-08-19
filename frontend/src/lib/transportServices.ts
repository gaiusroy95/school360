import { api } from './api';

export type TransportDashboard = {
  academicYear: string;
  academicYears: string[];
  routeFilterOptions: string[];
  kpis: {
    totalBuses: { value: number; subtitle: string; trendUp?: boolean };
    activeRoutes: { value: number; subtitle: string };
    studentsUsingTransport: { value: number; subtitle: string };
    onTripNow: { value: string; subtitle: string; statusColor: string };
    inCampus: { value: string; subtitle: string; statusColor: string };
    underMaintenance: { value: string; subtitle: string; statusColor: string };
  };
  liveTracking: {
    isLive: boolean;
    vehicles: { busLabel: string; routeName: string; topPct: number; leftPct: number; color: string }[];
    gpsNote: string;
  };
  recentUpdates: { time: string; title: string; desc: string; color: string }[];
  ridership: { route: string; students: number; color: string }[];
  attendance: {
    pct: number;
    stats: { name: string; value: number; color: string }[];
  };
  trips: {
    busNo: string; route: string; driver: string; stops: string;
    students: string; status: string; tripType: string;
  }[];
  vehicleHealth: {
    total: number;
    segments: { name: string; value: number; color: string }[];
    nextServiceDue: { busLabel: string; dueInDays: number }[];
  };
  safetyAlerts: { time: string; title: string; desc: string; color: string }[];
  feesSummary: {
    totalDues: string; collected: string; collectedPct: number;
    pending: string; pendingPct: number;
  };
  topRoutes: { name: string; students: number; percentage: number; rank: number }[];
  staff: {
    total: number;
    drivers: { total: number; onDuty: number };
    attendants: { total: number; onDuty: number };
  };
  quickActions: { label: string; target: string }[];
  navigationTargets: Record<string, string>;
};

export async function fetchTransportDashboard(seed?: boolean, academicYear?: string) {
  const params = new URLSearchParams();
  if (seed) params.set('seed', '1');
  if (academicYear) params.set('academicYear', academicYear);
  const qs = params.toString() ? `?${params}` : '';
  return api<TransportDashboard>(`/api/transport/dashboard${qs}`);
}

export type TransportMaster = {
  academicYear: string;
  academicYears: string[];
  routeTypes: string[];
  routeStatuses: string[];
  vehicleTypes: string[];
  availabilityStatuses: string[];
  gpsVendors?: string[];
  stopTypes?: string[];
  staffRoles?: string[];
  kpis: {
    totalRoutes: number; activeVehicles: number; gpsOnline: number; gpsTotal: number;
    routesRunning: number; vehiclesInMaintenance: number; routeOccupancy: number;
  };
  routes: Record<string, unknown>[];
  vehicles: Record<string, unknown>[];
  gpsDevices: Record<string, unknown>[];
  staff: Record<string, unknown>[];
  stops: Record<string, unknown>[];
  auditLogs: Record<string, unknown>[];
  settings: Record<string, unknown>;
  reports: string[];
  mobileSync: string[];
};

export async function fetchTransportMaster(seed?: boolean, academicYear?: string) {
  const params = new URLSearchParams();
  if (seed) params.set('seed', '1');
  if (academicYear) params.set('academicYear', academicYear);
  const qs = params.toString() ? `?${params}` : '';
  return api<TransportMaster>(`/api/transport/master${qs}`);
}

export async function createMasterRoute(body: Record<string, unknown>) {
  return api<TransportMaster>('/api/transport/master/routes', { method: 'POST', body: JSON.stringify(body) });
}

export async function cloneMasterRoute(id: string) {
  return api<TransportMaster>(`/api/transport/master/routes/${id}/clone`, { method: 'POST', body: '{}' });
}

export async function archiveMasterRoute(id: string) {
  return api<TransportMaster>(`/api/transport/master/routes/${id}/archive`, { method: 'POST', body: '{}' });
}

export async function createMasterVehicle(body: Record<string, unknown>) {
  return api<TransportMaster>('/api/transport/master/vehicles', { method: 'POST', body: JSON.stringify(body) });
}

export async function assignMasterVehicleRoute(vehicleId: string, routeId: string) {
  return api<TransportMaster>(`/api/transport/master/vehicles/${vehicleId}/assign-route`, {
    method: 'POST', body: JSON.stringify({ routeId }),
  });
}

export async function toggleMasterVehicleTracking(vehicleId: string, enabled: boolean) {
  return api<TransportMaster>(`/api/transport/master/vehicles/${vehicleId}/toggle-tracking`, {
    method: 'POST', body: JSON.stringify({ enabled }),
  });
}

export async function createMasterGpsDevice(body: Record<string, unknown>) {
  return api<TransportMaster>('/api/transport/master/gps-devices', { method: 'POST', body: JSON.stringify(body) });
}

export async function updateMasterGpsDevice(id: string, body: Record<string, unknown>) {
  return api<TransportMaster>(`/api/transport/master/gps-devices/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export async function linkMasterGpsToVehicle(gpsId: string, vehicleId: string) {
  return api<TransportMaster>(`/api/transport/master/gps-devices/${gpsId}/link-vehicle`, {
    method: 'POST', body: JSON.stringify({ vehicleId }),
  });
}

export async function toggleMasterGpsTracking(gpsId: string, enabled: boolean) {
  return api<TransportMaster>(`/api/transport/master/gps-devices/${gpsId}/toggle-tracking`, {
    method: 'POST', body: JSON.stringify({ enabled }),
  });
}

export async function addMasterRouteStop(routeId: string, body: Record<string, unknown>) {
  return api<TransportMaster>(`/api/transport/master/routes/${routeId}/stops`, { method: 'POST', body: JSON.stringify(body) });
}

export async function updateMasterRouteStop(stopId: string, body: Record<string, unknown>) {
  return api<TransportMaster>(`/api/transport/master/stops/${stopId}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export async function deleteMasterRouteStop(stopId: string) {
  return api<TransportMaster>(`/api/transport/master/stops/${stopId}`, { method: 'DELETE' });
}

export async function createMasterStaff(body: Record<string, unknown>) {
  return api<TransportMaster>('/api/transport/master/staff', { method: 'POST', body: JSON.stringify(body) });
}

export async function updateMasterStaff(id: string, body: Record<string, unknown>) {
  return api<TransportMaster>(`/api/transport/master/staff/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export async function deleteMasterStaff(id: string) {
  return api<TransportMaster>(`/api/transport/master/staff/${id}`, { method: 'DELETE' });
}

export async function assignMasterStaff(id: string, body: Record<string, unknown>) {
  return api<TransportMaster>(`/api/transport/master/staff/${id}/assign`, { method: 'POST', body: JSON.stringify(body) });
}

export async function seedTransportMasterDemo() {
  return api<TransportMaster>('/api/transport/master/seed-demo', { method: 'POST', body: '{}' });
}

export type TransportRoutePlanning = {
  academicYear: string;
  academicYears: string[];
  planTypes: string[];
  planStatuses: string[];
  priorities: string[];
  transportCategories: string[];
  workflowStages: string[];
  kpis: {
    totalPlans: number; activePlans: number; pendingPlans: number; draftPlans: number;
    completedPlans: number; cancelledPlans: number; pendingApprovals: number; avgOccupancy: number;
  };
  statusCounts: Record<string, number>;
  plans: Record<string, unknown>[];
  calendar: Record<string, unknown>[];
  routes: Record<string, unknown>[];
  vehicles: Record<string, unknown>[];
  drivers: Record<string, unknown>[];
  attendants: Record<string, unknown>[];
  pendingApprovals: Record<string, unknown>[];
  settings: Record<string, unknown>;
  reports: string[];
  workflow: { stage: string; order: number; label: string }[];
};

export async function fetchTransportRoutePlanning(seed?: boolean, academicYear?: string) {
  const params = new URLSearchParams();
  if (seed) params.set('seed', '1');
  if (academicYear) params.set('academicYear', academicYear);
  const qs = params.toString() ? `?${params}` : '';
  return api<TransportRoutePlanning>(`/api/transport/planning${qs}`);
}

export async function createRoutePlan(body: Record<string, unknown>) {
  return api<TransportRoutePlanning>('/api/transport/planning/plans', { method: 'POST', body: JSON.stringify(body) });
}

export async function updateRoutePlan(id: string, body: Record<string, unknown>) {
  return api<TransportRoutePlanning>(`/api/transport/planning/plans/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export async function assignPlanResources(id: string, body: Record<string, unknown>) {
  return api<TransportRoutePlanning>(`/api/transport/planning/plans/${id}/assign`, { method: 'POST', body: JSON.stringify(body) });
}

export async function optimizePlanRoute(id: string) {
  return api<TransportRoutePlanning>(`/api/transport/planning/plans/${id}/optimize`, { method: 'POST', body: '{}' });
}

export async function submitPlanApproval(id: string) {
  return api<TransportRoutePlanning>(`/api/transport/planning/plans/${id}/submit`, { method: 'POST', body: '{}' });
}

export async function approvePlan(id: string, body: Record<string, unknown>) {
  return api<TransportRoutePlanning>(`/api/transport/planning/plans/${id}/approve`, { method: 'POST', body: JSON.stringify(body) });
}

export async function publishPlan(id: string) {
  return api<TransportRoutePlanning>(`/api/transport/planning/plans/${id}/publish`, { method: 'POST', body: '{}' });
}

export async function pausePlan(id: string) {
  return api<TransportRoutePlanning>(`/api/transport/planning/plans/${id}/pause`, { method: 'POST', body: '{}' });
}

export async function resumePlan(id: string) {
  return api<TransportRoutePlanning>(`/api/transport/planning/plans/${id}/resume`, { method: 'POST', body: '{}' });
}

export async function cancelPlan(id: string, reason: string) {
  return api<TransportRoutePlanning>(`/api/transport/planning/plans/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) });
}

export async function archivePlan(id: string) {
  return api<TransportRoutePlanning>(`/api/transport/planning/plans/${id}/archive`, { method: 'POST', body: '{}' });
}

export async function clonePlan(id: string) {
  return api<TransportRoutePlanning>(`/api/transport/planning/plans/${id}/clone`, { method: 'POST', body: '{}' });
}

export async function deleteRoutePlan(id: string) {
  return api<TransportRoutePlanning>(`/api/transport/planning/plans/${id}`, { method: 'DELETE' });
}

export async function addPlanStop(planId: string, body: Record<string, unknown>) {
  return api<TransportRoutePlanning>(`/api/transport/planning/plans/${planId}/stops`, { method: 'POST', body: JSON.stringify(body) });
}

export async function updatePlanStop(stopId: string, body: Record<string, unknown>) {
  return api<TransportRoutePlanning>(`/api/transport/planning/plans/stops/${stopId}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export async function deletePlanStop(stopId: string) {
  return api<TransportRoutePlanning>(`/api/transport/planning/plans/stops/${stopId}`, { method: 'DELETE' });
}

export type TransportLiveTracking = {
  isLive: boolean;
  refreshIntervalSec: number;
  workflow: string[];
  kpis: {
    activeVehicles: number; totalTracked: number; running: number; delayed: number;
    emergencies: number; speedViolations: number; gpsOnline: number; gpsTotal: number;
    unacknowledgedAlerts: number; avgSpeed: number;
  };
  statusCounts: Record<string, number>;
  trips: Record<string, unknown>[];
  activeTrips: Record<string, unknown>[];
  map: {
    provider: string;
    center: { lat: number; lng: number };
    zoom: number;
    vehicles: { id: string; vehicleNumber: string; routeName: string; status: string; topPct: number; leftPct: number; speedKmh: number; direction: string; color: string }[];
    geofences: Record<string, unknown>[];
    osmTileUrl: string;
  };
  vehicles: Record<string, unknown>[];
  geofences: Record<string, unknown>[];
  alerts: Record<string, unknown>[];
  incidents: Record<string, unknown>[];
  auditLogs: Record<string, unknown>[];
  settings: Record<string, unknown>;
  reports: string[];
  notificationChannels: string[];
};

export async function fetchTransportLiveTracking(seed?: boolean) {
  const qs = seed ? '?seed=1' : '';
  return api<TransportLiveTracking>(`/api/transport/live-tracking${qs}`);
}

export async function startLiveTrip(id: string) {
  return api<TransportLiveTracking>(`/api/transport/live-tracking/trips/${id}/start`, { method: 'POST', body: '{}' });
}

export async function pauseLiveTrip(id: string) {
  return api<TransportLiveTracking>(`/api/transport/live-tracking/trips/${id}/pause`, { method: 'POST', body: '{}' });
}

export async function resumeLiveTrip(id: string) {
  return api<TransportLiveTracking>(`/api/transport/live-tracking/trips/${id}/resume`, { method: 'POST', body: '{}' });
}

export async function endLiveTrip(id: string) {
  return api<TransportLiveTracking>(`/api/transport/live-tracking/trips/${id}/end`, { method: 'POST', body: '{}' });
}

export async function triggerLiveSos(id: string, message: string) {
  return api<TransportLiveTracking>(`/api/transport/live-tracking/trips/${id}/sos`, { method: 'POST', body: JSON.stringify({ message }) });
}

export async function acknowledgeTrackingAlert(id: string) {
  return api<TransportLiveTracking>(`/api/transport/live-tracking/alerts/${id}/acknowledge`, { method: 'POST', body: '{}' });
}

export type TransportStudentTransport = {
  academicYear: string;
  academicYears: string[];
  transportStatuses: string[];
  studentCategories: string[];
  workflowStages: string[];
  requestTypes: string[];
  workflow: string[];
  kpis: {
    totalEnrolled: number; activeStudents: number; pendingApplications: number;
    waitingList: number; pendingRequests: number; boardedToday: number; droppedToday: number;
    absentToday: number; seatOccupancy: number; feeDueCount: number; specialAssistance: number;
  };
  statusCounts: Record<string, number>;
  enrollments: Record<string, unknown>[];
  pendingRequests: Record<string, unknown>[];
  waitingListStudents: Record<string, unknown>[];
  boardingToday: Record<string, unknown>[];
  vehicleOccupancy: Record<string, unknown>[];
  routes: Record<string, unknown>[];
  routeOptions: {
    id: string; routeCode: string; routeName: string;
    stops: { id: string; stopName: string; stopType: string; sequenceOrder: number; estimatedArrival: string }[];
  }[];
  studentPicker: {
    classes: string[];
    sectionsByClass: Record<string, string[]>;
    students: {
      id: string; name: string; admissionNumber: string;
      className: string; sectionName: string; category: string;
      address: string; guardianName: string; guardianMobile: string; hasTransport: boolean;
    }[];
  };
  vehicles: Record<string, unknown>[];
  auditLogs: Record<string, unknown>[];
  settings: Record<string, unknown>;
  reports: string[];
};

export async function fetchTransportStudentTransport(seed?: boolean, academicYear?: string) {
  const params = new URLSearchParams();
  if (seed) params.set('seed', '1');
  if (academicYear) params.set('academicYear', academicYear);
  const qs = params.toString() ? `?${params}` : '';
  return api<TransportStudentTransport>(`/api/transport/student-transport${qs}`);
}

export async function createStudentTransportApp(body: Record<string, unknown>) {
  return api<TransportStudentTransport>('/api/transport/student-transport/applications', { method: 'POST', body: JSON.stringify(body) });
}

export async function allocateStudentTransport(id: string, body: Record<string, unknown>) {
  return api<TransportStudentTransport>(`/api/transport/student-transport/enrollments/${id}/allocate`, { method: 'POST', body: JSON.stringify(body) });
}

export async function approveStudentTransport(id: string) {
  return api<TransportStudentTransport>(`/api/transport/student-transport/enrollments/${id}/approve`, { method: 'POST', body: '{}' });
}

export async function recordStudentBoarding(id: string, body: Record<string, unknown>) {
  return api<TransportStudentTransport>(`/api/transport/student-transport/enrollments/${id}/boarding`, { method: 'POST', body: JSON.stringify(body) });
}

export async function resolveTransportRequest(id: string, action: string) {
  return api<TransportStudentTransport>(`/api/transport/student-transport/requests/${id}/resolve`, { method: 'POST', body: JSON.stringify({ action }) });
}

export type TransportDriverAttendant = {
  workflow: string[];
  employmentTypes: string[];
  shiftTypes: string[];
  staffStatuses: string[];
  kpis: {
    totalDrivers: number; totalAttendants: number; onDuty: number; onLeave: number;
    licenseExpiring: number; licenseExpired: number; docExpiring: number;
    pendingLeave: number; openComplaints: number; complianceRate: number;
    avgRating: number; presentToday: number;
  };
  staff: Record<string, unknown>[];
  drivers: Record<string, unknown>[];
  attendants: Record<string, unknown>[];
  dutyRoster: Record<string, unknown>[];
  attendanceToday: Record<string, unknown>[];
  pendingLeaves: Record<string, unknown>[];
  openComplaints: Record<string, unknown>[];
  expiringDocuments: Record<string, unknown>[];
  routes: Record<string, unknown>[];
  vehicles: Record<string, unknown>[];
  auditLogs: Record<string, unknown>[];
  settings: Record<string, unknown>;
  reports: string[];
};

export async function fetchTransportDriverAttendant(seed?: boolean) {
  const qs = seed ? '?seed=1' : '';
  return api<TransportDriverAttendant>(`/api/transport/driver-attendant${qs}`);
}

export async function registerTransportStaff(body: Record<string, unknown>) {
  return api<TransportDriverAttendant>('/api/transport/driver-attendant/staff', { method: 'POST', body: JSON.stringify(body) });
}

export async function assignStaffDuty(id: string, body: Record<string, unknown>) {
  return api<TransportDriverAttendant>(`/api/transport/driver-attendant/staff/${id}/assign`, { method: 'POST', body: JSON.stringify(body) });
}

export async function verifyStaffLicense(id: string) {
  return api<TransportDriverAttendant>(`/api/transport/driver-attendant/staff/${id}/verify-license`, { method: 'POST', body: '{}' });
}

export async function recordStaffAttendance(id: string, body: Record<string, unknown>) {
  return api<TransportDriverAttendant>(`/api/transport/driver-attendant/staff/${id}/attendance`, { method: 'POST', body: JSON.stringify(body) });
}

export async function resolveStaffLeave(id: string, action: string) {
  return api<TransportDriverAttendant>(`/api/transport/driver-attendant/leaves/${id}/resolve`, { method: 'POST', body: JSON.stringify({ action }) });
}

export type TransportTripManagement = {
  academicYear: string;
  academicYears: string[];
  tripStatuses: string[];
  tripCategories: string[];
  tripDirections: string[];
  scheduleTypes: string[];
  workflow: string[];
  kpis: {
    totalTrips: number; scheduled: number; running: number; completed: number;
    delayed: number; cancelled: number; emergency: number; todayTrips: number;
    avgDelay: number; totalMileage: number; totalCost: number; studentsTransported: number;
  };
  statusCounts: Record<string, number>;
  trips: Record<string, unknown>[];
  runningTrips: Record<string, unknown>[];
  todayTrips: Record<string, unknown>[];
  routes: Record<string, unknown>[];
  vehicles: Record<string, unknown>[];
  drivers: Record<string, unknown>[];
  auditLogs: Record<string, unknown>[];
  settings: Record<string, unknown>;
  reports: string[];
};

export async function fetchTransportTripManagement(seed?: boolean, academicYear?: string) {
  const params = new URLSearchParams();
  if (seed) params.set('seed', '1');
  if (academicYear) params.set('academicYear', academicYear);
  const qs = params.toString() ? `?${params}` : '';
  return api<TransportTripManagement>(`/api/transport/trips${qs}`);
}

export async function scheduleTrip(body: Record<string, unknown>) {
  return api<TransportTripManagement>('/api/transport/trips', { method: 'POST', body: JSON.stringify(body) });
}

export async function approveTrip(id: string) {
  return api<TransportTripManagement>(`/api/transport/trips/${id}/approve`, { method: 'POST', body: '{}' });
}

export async function startTrip(id: string, body: Record<string, unknown> = {}) {
  return api<TransportTripManagement>(`/api/transport/trips/${id}/start`, { method: 'POST', body: JSON.stringify(body) });
}

export async function pauseTripMgmt(id: string) {
  return api<TransportTripManagement>(`/api/transport/trips/${id}/pause`, { method: 'POST', body: '{}' });
}

export async function resumeTripMgmt(id: string) {
  return api<TransportTripManagement>(`/api/transport/trips/${id}/resume`, { method: 'POST', body: '{}' });
}

export async function completeTrip(id: string, body: Record<string, unknown> = {}) {
  return api<TransportTripManagement>(`/api/transport/trips/${id}/complete`, { method: 'POST', body: JSON.stringify(body) });
}

export async function cancelTrip(id: string, reason: string) {
  return api<TransportTripManagement>(`/api/transport/trips/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) });
}

export async function addTripIncident(id: string, body: Record<string, unknown>) {
  return api<TransportTripManagement>(`/api/transport/trips/${id}/incidents`, { method: 'POST', body: JSON.stringify(body) });
}

export type TransportStopsGeoFencing = {
  academicYear: string;
  academicYears: string[];
  stopTypes: string[];
  stopStatuses: string[];
  geoSources: string[];
  geofenceTypes: string[];
  geofenceShapes: string[];
  workflow: string[];
  kpis: {
    totalStops: number; geoValidated: number; pendingValidation: number;
    withGeofence: number; withoutGeofence: number; totalGeofences: number;
    routeMapped: number; unmappedRoutes: number; excelImports: number; googleImports: number;
  };
  stops: Record<string, unknown>[];
  geofences: Record<string, unknown>[];
  routes: Record<string, unknown>[];
  importLogs: Record<string, unknown>[];
  auditLogs: Record<string, unknown>[];
  map: {
    provider: string;
    center: { lat: number; lng: number };
    zoom: number;
    stops: Record<string, unknown>[];
    geofences: Record<string, unknown>[];
    osmTileUrl: string;
    googleMapsSearchUrl: string;
  };
  settings: Record<string, unknown>;
  reports: string[];
  excelTemplate: { columns: string[]; sampleRow: string[] };
};

export async function fetchTransportStopsGeoFencing(seed?: boolean, academicYear?: string) {
  const params = new URLSearchParams();
  if (seed) params.set('seed', '1');
  if (academicYear) params.set('academicYear', academicYear);
  const qs = params.toString() ? `?${params}` : '';
  return api<TransportStopsGeoFencing>(`/api/transport/stops-geo${qs}`);
}

export async function createTransportStop(body: Record<string, unknown>) {
  return api<TransportStopsGeoFencing>('/api/transport/stops-geo/stops', { method: 'POST', body: JSON.stringify(body) });
}

export async function updateTransportStop(id: string, body: Record<string, unknown>) {
  return api<TransportStopsGeoFencing>(`/api/transport/stops-geo/stops/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export async function validateTransportStopGeo(id: string) {
  return api<TransportStopsGeoFencing>(`/api/transport/stops-geo/stops/${id}/validate`, { method: 'POST', body: '{}' });
}

export async function linkTransportStopRoute(id: string, routeId: string, sequenceOrder?: number) {
  return api<TransportStopsGeoFencing>(`/api/transport/stops-geo/stops/${id}/link-route`, {
    method: 'POST', body: JSON.stringify({ routeId, sequenceOrder }),
  });
}

export async function createTransportGeofence(body: Record<string, unknown>) {
  return api<TransportStopsGeoFencing>('/api/transport/stops-geo/geofences', { method: 'POST', body: JSON.stringify(body) });
}

export async function updateTransportGeofence(id: string, body: Record<string, unknown>) {
  return api<TransportStopsGeoFencing>(`/api/transport/stops-geo/geofences/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export async function importStopsExcel(rows: unknown[], fileName?: string, academicYear?: string) {
  return api<TransportStopsGeoFencing>('/api/transport/stops-geo/import/excel', {
    method: 'POST', body: JSON.stringify({ rows, fileName, academicYear }),
  });
}

export async function importStopsGoogleMaps(text: string, fileName?: string, academicYear?: string) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  return api<TransportStopsGeoFencing>('/api/transport/stops-geo/import/google-maps', {
    method: 'POST', body: JSON.stringify({ lines, fileName, academicYear }),
  });
}

export type TransportAttendance = {
  academicYear: string;
  academicYears: string[];
  attendanceModes: string[];
  safetyStatuses: string[];
  sessionTypes: string[];
  workflow: string[];
  kpis: {
    totalStudents: number; boarded: number; dropped: number; pending: number;
    absent: number; exceptions: number; missedPickup: number; missedDrop: number;
    safeBoarded: number; safeDropped: number; currentOccupancy: number;
    activeSessions: number; pendingCorrections: number; attendancePct: number;
    wrongBusAlerts: number; emergencyCases: number;
  };
  sessions: Record<string, unknown>[];
  activeSessions: Record<string, unknown>[];
  records: Record<string, unknown>[];
  corrections: Record<string, unknown>[];
  recentEvents: Record<string, unknown>[];
  auditLogs: Record<string, unknown>[];
  dailySummary: Record<string, unknown> | null;
  settings: Record<string, unknown>;
  reports: string[];
};

export async function fetchTransportAttendance(seed?: boolean, academicYear?: string) {
  const params = new URLSearchParams();
  if (seed) params.set('seed', '1');
  if (academicYear) params.set('academicYear', academicYear);
  const qs = params.toString() ? `?${params}` : '';
  return api<TransportAttendance>(`/api/transport/attendance${qs}`);
}

export async function scanTransportAttendance(recordId: string, body: Record<string, unknown>) {
  return api<TransportAttendance>(`/api/transport/attendance/records/${recordId}/scan`, {
    method: 'POST', body: JSON.stringify(body),
  });
}

export async function markTransportAttendanceAbsent(recordId: string, reason: string) {
  return api<TransportAttendance>(`/api/transport/attendance/records/${recordId}/absent`, {
    method: 'POST', body: JSON.stringify({ reason }),
  });
}

export async function confirmTransportVehicleEmpty(sessionId: string) {
  return api<TransportAttendance>(`/api/transport/attendance/sessions/${sessionId}/vehicle-empty`, {
    method: 'POST', body: '{}',
  });
}

export async function lockTransportAttendanceSession(sessionId: string) {
  return api<TransportAttendance>(`/api/transport/attendance/sessions/${sessionId}/lock`, {
    method: 'POST', body: '{}',
  });
}

export async function reconcileTransportAttendanceSession(sessionId: string) {
  return api<TransportAttendance>(`/api/transport/attendance/sessions/${sessionId}/reconcile`, {
    method: 'POST', body: '{}',
  });
}

export async function requestTransportAttendanceCorrection(recordId: string, body: Record<string, unknown>) {
  return api<TransportAttendance>(`/api/transport/attendance/records/${recordId}/corrections`, {
    method: 'POST', body: JSON.stringify(body),
  });
}

export async function resolveTransportAttendanceCorrection(correctionId: string, action: string) {
  return api<TransportAttendance>(`/api/transport/attendance/corrections/${correctionId}/resolve`, {
    method: 'POST', body: JSON.stringify({ action }),
  });
}

export type TransportFeeManagement = {
  academicYear: string;
  academicYears: string[];
  pricingTypes: string[];
  billingCycles: string[];
  invoiceStatuses: string[];
  paymentModes: string[];
  workflow: string[];
  kpis: {
    totalBilled: number; totalCollected: number; totalOutstanding: number;
    totalConcessions: number; totalRefunds: number; overdueAccounts: number;
    invoiceCount: number; paidInvoices: number; collectionRate: number;
    structureCount: number; assignedStudents: number; pendingRefunds: number;
    penaltyTotal: number;
  };
  structures: Record<string, unknown>[];
  assignments: Record<string, unknown>[];
  invoices: Record<string, unknown>[];
  payments: Record<string, unknown>[];
  refunds: Record<string, unknown>[];
  penalties: Record<string, unknown>[];
  revisions: Record<string, unknown>[];
  enrollments: Record<string, unknown>[];
  auditLogs: Record<string, unknown>[];
  settings: Record<string, unknown>;
  reports: string[];
};

export async function fetchTransportFeeManagement(seed?: boolean, academicYear?: string) {
  const params = new URLSearchParams();
  if (seed) params.set('seed', '1');
  if (academicYear) params.set('academicYear', academicYear);
  const qs = params.toString() ? `?${params}` : '';
  return api<TransportFeeManagement>(`/api/transport/fees${qs}`);
}

export async function createTransportFeeStructure(body: Record<string, unknown>) {
  return api<TransportFeeManagement>('/api/transport/fees/structures', { method: 'POST', body: JSON.stringify(body) });
}

export async function reviseTransportFeeStructure(id: string, body: Record<string, unknown>) {
  return api<TransportFeeManagement>(`/api/transport/fees/structures/${id}/revise`, { method: 'POST', body: JSON.stringify(body) });
}

export async function assignTransportStudentFee(body: Record<string, unknown>) {
  return api<TransportFeeManagement>('/api/transport/fees/assign', { method: 'POST', body: JSON.stringify(body) });
}

export async function autoAssignTransportFees(academicYear?: string) {
  return api<TransportFeeManagement>('/api/transport/fees/auto-assign', {
    method: 'POST', body: JSON.stringify({ academicYear }),
  });
}

export async function generateTransportFeeInvoices(academicYear?: string, periodLabel?: string) {
  return api<TransportFeeManagement>('/api/transport/fees/generate-invoices', {
    method: 'POST', body: JSON.stringify({ academicYear, periodLabel }),
  });
}

export async function collectTransportFeePayment(invoiceId: string, body: Record<string, unknown>) {
  return api<TransportFeeManagement>(`/api/transport/fees/invoices/${invoiceId}/collect`, {
    method: 'POST', body: JSON.stringify(body),
  });
}

export async function waiveTransportFeePenalty(penaltyId: string, reason: string) {
  return api<TransportFeeManagement>(`/api/transport/fees/penalties/${penaltyId}/waive`, {
    method: 'POST', body: JSON.stringify({ reason }),
  });
}

export async function requestTransportFeeRefund(body: Record<string, unknown>) {
  return api<TransportFeeManagement>('/api/transport/fees/refunds', { method: 'POST', body: JSON.stringify(body) });
}

export async function approveTransportFeeRefund(refundId: string) {
  return api<TransportFeeManagement>(`/api/transport/fees/refunds/${refundId}/approve`, { method: 'POST', body: '{}' });
}

export async function applyTransportLatePenalties() {
  return api<TransportFeeManagement>('/api/transport/fees/apply-penalties', { method: 'POST', body: '{}' });
}

export function formatInr(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

export type TransportFleetMaintenance = {
  healthStatuses: string[];
  availabilityStatuses: string[];
  workOrderStatuses: string[];
  serviceTypes: string[];
  docTypes: string[];
  inspectionTypes: string[];
  workflow: string[];
  kpis: {
    totalVehicles: number; healthy: number; dueForService: number;
    underMaintenance: number; breakdown: number; available: number;
    openWorkOrders: number; complianceExpiring: number;
    totalFuelCost: number; totalFuelLitres: number; avgFuelCostPerLitre: number;
    maintenanceCost: number; sparePartsLow: number; avgHealthScore: number;
  };
  vehicles: Record<string, unknown>[];
  workOrders: Record<string, unknown>[];
  schedules: Record<string, unknown>[];
  compliance: Record<string, unknown>[];
  fuelEntries: Record<string, unknown>[];
  spareParts: Record<string, unknown>[];
  vendors: Record<string, unknown>[];
  inspections: Record<string, unknown>[];
  tyres: Record<string, unknown>[];
  breakdowns: Record<string, unknown>[];
  auditLogs: Record<string, unknown>[];
  settings: Record<string, unknown>;
  reports: string[];
};

export async function fetchTransportFleetMaintenance(seed?: boolean) {
  const params = new URLSearchParams();
  if (seed) params.set('seed', '1');
  const qs = params.toString() ? `?${params}` : '';
  return api<TransportFleetMaintenance>(`/api/transport/fleet-maintenance${qs}`);
}

export async function createFleetWorkOrder(body: Record<string, unknown>) {
  return api<TransportFleetMaintenance>('/api/transport/fleet-maintenance/work-orders', { method: 'POST', body: JSON.stringify(body) });
}

export async function updateFleetWorkOrderStatus(id: string, status: string) {
  return api<TransportFleetMaintenance>(`/api/transport/fleet-maintenance/work-orders/${id}/status`, {
    method: 'POST', body: JSON.stringify({ status }),
  });
}

export async function recordFleetFuelEntry(body: Record<string, unknown>) {
  return api<TransportFleetMaintenance>('/api/transport/fleet-maintenance/fuel', { method: 'POST', body: JSON.stringify(body) });
}

export async function recordFleetInspection(body: Record<string, unknown>) {
  return api<TransportFleetMaintenance>('/api/transport/fleet-maintenance/inspections', { method: 'POST', body: JSON.stringify(body) });
}

export async function registerFleetBreakdown(body: Record<string, unknown>) {
  return api<TransportFleetMaintenance>('/api/transport/fleet-maintenance/breakdowns', { method: 'POST', body: JSON.stringify(body) });
}

export type TransportFuelManagement = {
  fuelTypes: string[];
  quantityUnits: string[];
  requestStatuses: string[];
  stationTypes: string[];
  anomalyTypes: string[];
  paymentModes: string[];
  workflow: string[];
  kpis: {
    totalFuelCost: number; totalLitres: number; totalCngKg: number; totalDistance: number;
    avgMileage: number; avgCostPerLitre: number; monthlyExpense: number;
    pendingRequests: number; openAnomalies: number; activeCards: number;
    activeStations: number; deviceConnected: number; fillEntries: number;
  };
  stations: Record<string, unknown>[];
  cards: Record<string, unknown>[];
  requests: Record<string, unknown>[];
  fillEntries: Record<string, unknown>[];
  mileageLogs: Record<string, unknown>[];
  anomalies: Record<string, unknown>[];
  vehicleMileage: Record<string, unknown>[];
  vehicles: { id: string; vehicleNumber: string; fuelType: string; driverName: string }[];
  drivers: { id: string; name: string; employeeCode: string }[];
  trips: Record<string, unknown>[];
  auditLogs: Record<string, unknown>[];
  settings: Record<string, unknown>;
  reports: string[];
};

export async function fetchTransportFuelManagement(seed?: boolean) {
  const params = new URLSearchParams();
  if (seed) params.set('seed', '1');
  const qs = params.toString() ? `?${params}` : '';
  return api<TransportFuelManagement>(`/api/transport/fuel-management${qs}`);
}

export async function createFuelStation(body: Record<string, unknown>) {
  return api<TransportFuelManagement>('/api/transport/fuel-management/stations', { method: 'POST', body: JSON.stringify(body) });
}

export async function assignFuelCard(body: Record<string, unknown>) {
  return api<TransportFuelManagement>('/api/transport/fuel-management/cards', { method: 'POST', body: JSON.stringify(body) });
}

export async function createFuelRequest(body: Record<string, unknown>) {
  return api<TransportFuelManagement>('/api/transport/fuel-management/requests', { method: 'POST', body: JSON.stringify(body) });
}

export async function approveFuelRequest(id: string, approved: boolean, reason = '') {
  return api<TransportFuelManagement>(`/api/transport/fuel-management/requests/${id}/approve`, {
    method: 'POST', body: JSON.stringify({ approved, reason }),
  });
}

export async function recordFuelFill(body: Record<string, unknown>) {
  return api<TransportFuelManagement>('/api/transport/fuel-management/fills', { method: 'POST', body: JSON.stringify(body) });
}

export async function recordFuelMileageLog(body: Record<string, unknown>) {
  return api<TransportFuelManagement>('/api/transport/fuel-management/mileage', { method: 'POST', body: JSON.stringify(body) });
}

export async function resolveFuelAnomaly(id: string) {
  return api<TransportFuelManagement>(`/api/transport/fuel-management/anomalies/${id}/resolve`, { method: 'POST', body: '{}' });
}

export async function syncFuelDeviceReading(body: Record<string, unknown>) {
  return api<TransportFuelManagement>('/api/transport/fuel-management/device-sync', { method: 'POST', body: JSON.stringify(body) });
}

export type TransportSafetyAlerts = {
  alertTypes: string[];
  alertSources: string[];
  severities: string[];
  statuses: string[];
  reportTypes: string[];
  workflow: string[];
  kpis: {
    totalAlerts: number; openAlerts: number; criticalAlerts: number; unacknowledged: number;
    gpsAutoTriggered: number; mobileReports: number; accidents: number; escalated: number;
    avgResponseMins: number; resolvedToday: number;
  };
  alerts: Record<string, unknown>[];
  reports: Record<string, unknown>[];
  map: { center: { lat: number; lng: number }; incidents: Record<string, unknown>[] };
  vehicles: { id: string; vehicleNumber: string; driverName: string; routeName: string }[];
  trips: Record<string, unknown>[];
  auditLogs: Record<string, unknown>[];
  settings: Record<string, unknown>;
  reports_catalog: string[];
};

export async function fetchTransportSafetyAlerts(seed?: boolean) {
  const params = new URLSearchParams();
  if (seed) params.set('seed', '1');
  const qs = params.toString() ? `?${params}` : '';
  return api<TransportSafetyAlerts>(`/api/transport/safety-alerts${qs}`);
}

export async function triggerGpsAccidentAlert(body: Record<string, unknown>) {
  return api<TransportSafetyAlerts>('/api/transport/safety-alerts/gps-trigger', { method: 'POST', body: JSON.stringify(body) });
}

export async function submitMobileSafetyReport(body: Record<string, unknown>) {
  return api<TransportSafetyAlerts>('/api/transport/safety-alerts/mobile-report', { method: 'POST', body: JSON.stringify(body) });
}

export async function triggerSosAlert(body: Record<string, unknown>) {
  return api<TransportSafetyAlerts>('/api/transport/safety-alerts/sos', { method: 'POST', body: JSON.stringify(body) });
}

export async function acknowledgeSafetyAlert(id: string, acknowledgedBy?: string) {
  return api<TransportSafetyAlerts>(`/api/transport/safety-alerts/${id}/acknowledge`, {
    method: 'POST', body: JSON.stringify({ acknowledgedBy }),
  });
}

export async function escalateSafetyAlert(id: string) {
  return api<TransportSafetyAlerts>(`/api/transport/safety-alerts/${id}/escalate`, { method: 'POST', body: '{}' });
}

export async function resolveSafetyAlert(id: string) {
  return api<TransportSafetyAlerts>(`/api/transport/safety-alerts/${id}/resolve`, { method: 'POST', body: '{}' });
}

export async function reviewSafetyReport(id: string, status = 'VERIFIED') {
  return api<TransportSafetyAlerts>(`/api/transport/safety-alerts/reports/${id}/review`, {
    method: 'POST', body: JSON.stringify({ status }),
  });
}

export type TransportReportsAnalytics = {
  academicYear: string;
  workflow: string[];
  reportCatalog: Record<string, string[]>;
  kpis: {
    executive: Record<string, number>;
    operational: Record<string, number>;
    safety: Record<string, number>;
    financial: Record<string, number>;
    employee: Record<string, number>;
    management: Record<string, number>;
  };
  commandCentre: {
    liveVehicles: Record<string, unknown>[];
    alerts: Record<string, unknown>[];
    notifications: Record<string, unknown>[];
    stats: Record<string, number>;
  };
  dashboards: Record<string, unknown>;
  heatMap: Record<string, unknown>[];
  digitalTwin: Record<string, unknown>[];
  predictions: Record<string, unknown>;
  branchComparison: Record<string, unknown>[];
  routeProfitability: Record<string, unknown>[];
  complaints: Record<string, unknown>[];
  schedules: Record<string, unknown>[];
  auditLogs: Record<string, unknown>[];
  settings: Record<string, unknown>;
  exportFormats: string[];
  biIntegrations: string[];
};

export async function fetchTransportReportsAnalytics(seed?: boolean, academicYear = '2025-26') {
  const params = new URLSearchParams({ academicYear });
  if (seed) params.set('seed', '1');
  return api<TransportReportsAnalytics>(`/api/transport/reports-analytics?${params}`);
}

export async function scheduleTransportReport(body: Record<string, unknown>) {
  return api<TransportReportsAnalytics>('/api/transport/reports-analytics/schedules', { method: 'POST', body: JSON.stringify(body) });
}
