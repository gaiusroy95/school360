import { prisma } from './prisma.js';
import type { Prisma } from '@prisma/client';
import { seedTransportMaster } from './transportMaster.js';
import { triggerTransportEmergency } from './transport.js';

export const VEHICLE_STATUSES = ['RUNNING', 'IDLE', 'PARKED', 'OFFLINE', 'COMPLETED', 'EMERGENCY', 'PAUSED'];
export const GPS_SOURCES = ['DEVICE', 'MOBILE_GPS'];
export const GPS_HEALTH = ['ONLINE', 'WEAK', 'OFFLINE'];
export const ALERT_TYPES = [
  'SPEED_VIOLATION', 'ROUTE_DEVIATION', 'UNAUTHORIZED_STOP', 'IDLE_VEHICLE', 'LONG_HALT',
  'TRAFFIC_DELAY', 'SOS', 'BREAKDOWN', 'ACCIDENT', 'GPS_OFFLINE', 'GEOFENCE_ENTRY',
  'GEOFENCE_EXIT', 'WRONG_ROUTE', 'BUS_STARTED', 'BUS_DELAYED', 'STUDENT_BOARDED', 'STUDENT_DROPPED',
];

const REPORT_CATALOG = [
  'Live Vehicle Status Report', 'GPS Tracking Report', 'Vehicle Movement Report',
  'Trip Completion Report', 'Trip Replay Report', 'Vehicle Speed Report', 'Speed Violation Report',
  'Route Deviation Report', 'Unauthorized Stop Report', 'Idle Vehicle Report', 'Geofence Activity Report',
  'GPS Device Health Report', 'Driver Trip Performance Report', 'Student Boarding Report',
  'Student Drop Report', 'Vehicle Delay Report', 'ETA Accuracy Report', 'Emergency Alert Report',
  'Breakdown Report', 'Incident Report', 'Daily Trip Summary Report', 'Monthly Vehicle Tracking Report',
  'Vehicle Utilization Report', 'Driver GPS Activity Report', 'Live Tracking Audit Log',
  'Parent Notification Report', 'GPS Connectivity Report', 'Route Completion Analysis Report',
  'Fleet Performance Dashboard Report',
];

const WORKFLOW = [
  'Vehicle Assigned', 'Driver Login', 'GPS Activated', 'Trip Started', 'Live Tracking',
  'Student Boarding', 'Stop-wise Monitoring', 'ETA Updates', 'Trip Completed',
  'Trip History Saved', 'Reports Generated',
];

function todayDate() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function relativeTime(d: Date): string {
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs} hr ago`;
}

function latLngToMapPct(lat: number, lng: number) {
  const baseLat = 26.9124;
  const baseLng = 75.7873;
  const topPct = Math.max(5, Math.min(95, 50 - (lat - baseLat) * 8000));
  const leftPct = Math.max(5, Math.min(95, 50 + (lng - baseLng) * 8000));
  return { topPct, leftPct };
}

function headingLabel(heading: number) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(heading / 45) % 8];
}

async function ensureSettings(institutionId: string) {
  let row = await prisma.transportLiveTrackingSettings.findUnique({ where: { institutionId } });
  if (!row) {
    row = await prisma.transportLiveTrackingSettings.create({
      data: {
        institutionId,
        refreshIntervalSec: 10,
        speedLimitKmh: 60,
        idleThresholdMin: 10,
        longHaltMin: 15,
        roleMatrix: [
          { role: 'Admin', permissions: 'Full live tracking, SOS, geofencing, audit, settings' },
          { role: 'Transport Manager', permissions: 'Monitor fleet, alerts, trip control, reports' },
          { role: 'Principal', permissions: 'Live overview, violations, emergency approval' },
          { role: 'Parent', permissions: 'View assigned bus, ETA, notifications' },
          { role: 'Driver', permissions: 'Start/pause/resume/end trip, SOS, manual GPS' },
        ],
        notificationRules: {
          channels: ['Push Notification', 'SMS', 'WhatsApp', 'Email', 'In-App Notification'],
          events: [
            'Bus Started', 'Bus Delayed', 'Bus Reached Stop', 'Student Boarded', 'Student Dropped',
            'Route Changed', 'Emergency SOS', 'Breakdown', 'Speed Violation', 'GPS Offline',
          ],
        },
        mobileSyncRules: {
          parentApp: [
            'Live bus location', 'Track on map', 'Driver & attendant details', 'Live ETA',
            'Bus started/near pickup/boarded/dropped notifications', 'Delay & emergency alerts', 'Trip history',
          ],
          driverApp: [
            'Secure login', 'Start/pause/resume/end trip', 'GPS navigation', 'Stop sequence',
            'Mark completed stops', 'SOS & breakdown report', 'Route change sync',
          ],
          staffApp: ['Transport duty', 'Monitor progress', 'Verify boarding', 'Report incidents'],
          principalApp: [
            'All active vehicles', 'Delayed routes', 'Speed violations', 'Emergency alerts',
            'Route deviations', 'Boarding status', 'Daily summary', 'GPS device health',
          ],
        },
        reportCatalog: REPORT_CATALOG,
      },
    });
  }
  return row;
}

async function audit(institutionId: string, entityType: string, action: string, details = '', entityId = '') {
  await prisma.transportTrackingAuditLog.create({
    data: { institutionId, entityType, entityId, action, details, performedBy: 'Transport Admin' },
  });
}

function serializeTrip(t: {
  id: string; tripNumber: string; status: string; gpsSource: string; branch: string;
  startedAt: Date | null; pausedAt: Date | null; endedAt: Date | null;
  currentStopIndex: number; completedStops: number; totalStops: number;
  distanceCoveredKm: number; remainingDistanceKm: number; totalDistanceKm: number;
  currentSpeedKmh: number; avgSpeedKmh: number; heading: number;
  latitude: number; longitude: number; etaNextStop: string; delayMinutes: number;
  fuelLevelPct: number | null; engineOn: boolean; ignitionOn: boolean;
  gpsSignalHealth: string; driverAuthenticated: boolean;
  studentsBoarded: number; studentsTotal: number; tripDate: Date;
  vehicle: { id: string; vehicleNumber: string; routeName: string; routeCode: string; driverName: string; attendantName: string; speedLimitKmh: number };
  route?: { routeName: string; routeCode: string } | null;
  driver?: { name: string; mobile: string } | null;
  events?: Array<{ id: string; eventType: string; stopName: string; createdAt: Date; metadata: unknown }>;
}) {
  const mapPos = latLngToMapPct(t.latitude, t.longitude);
  const progressPct = t.totalStops > 0 ? Math.round((t.completedStops / t.totalStops) * 100) : 0;
  return {
    id: t.id, tripNumber: t.tripNumber, status: t.status, gpsSource: t.gpsSource, branch: t.branch,
    vehicleId: t.vehicle.id, vehicleNumber: t.vehicle.vehicleNumber,
    routeName: t.route?.routeName ?? t.vehicle.routeName,
    routeCode: t.route?.routeCode ?? t.vehicle.routeCode,
    driverName: t.driver?.name ?? t.vehicle.driverName,
    driverMobile: t.driver?.mobile ?? '',
    attendantName: t.vehicle.attendantName,
    startedAt: t.startedAt?.toISOString() ?? null,
    pausedAt: t.pausedAt?.toISOString() ?? null,
    endedAt: t.endedAt?.toISOString() ?? null,
    currentStopIndex: t.currentStopIndex, completedStops: t.completedStops, totalStops: t.totalStops,
    progressPct, routeProgress: { completed: t.completedStops, current: t.currentStopIndex + 1, remaining: Math.max(0, t.totalStops - t.completedStops - 1) },
    distanceCoveredKm: t.distanceCoveredKm, remainingDistanceKm: t.remainingDistanceKm,
    totalDistanceKm: t.totalDistanceKm,
    currentSpeedKmh: t.currentSpeedKmh, avgSpeedKmh: t.avgSpeedKmh,
    heading: t.heading, direction: headingLabel(t.heading),
    latitude: t.latitude, longitude: t.longitude,
    mapTopPct: mapPos.topPct, mapLeftPct: mapPos.leftPct,
    etaNextStop: t.etaNextStop, delayMinutes: t.delayMinutes,
    fuelLevelPct: t.fuelLevelPct, engineOn: t.engineOn, ignitionOn: t.ignitionOn,
    gpsSignalHealth: t.gpsSignalHealth, driverAuthenticated: t.driverAuthenticated,
    studentsBoarded: t.studentsBoarded, studentsTotal: t.studentsTotal,
    speedLimitKmh: t.vehicle.speedLimitKmh,
    speedViolation: t.currentSpeedKmh > t.vehicle.speedLimitKmh,
    tripDate: t.tripDate.toISOString().slice(0, 10),
    timeline: (t.events ?? []).map((e) => ({
      id: e.id, eventType: e.eventType, stopName: e.stopName,
      time: e.createdAt.toISOString(), relativeTime: relativeTime(e.createdAt),
      metadata: e.metadata,
    })),
  };
}

const tripInclude = {
  vehicle: {
    select: {
      id: true, vehicleNumber: true, routeName: true, routeCode: true,
      driverName: true, attendantName: true, speedLimitKmh: true,
    },
  },
  route: { select: { routeName: true, routeCode: true } },
  driver: { select: { name: true, mobile: true } },
  events: { orderBy: { createdAt: 'desc' as const }, take: 20 },
};

export async function getTransportLiveTracking(institutionId: string) {
  await ensureSettings(institutionId);
  const tripDate = todayDate();

  const [trips, vehicles, geofences, alerts, auditLogs, settings, gpsDevices, incidents] = await Promise.all([
    prisma.transportLiveTrip.findMany({
      where: { institutionId, tripDate },
      include: tripInclude,
      orderBy: { tripNumber: 'asc' },
    }),
    prisma.transportVehicle.findMany({
      where: { institutionId, isActive: true },
      include: { gpsDevice: true, locations: { orderBy: { recordedAt: 'desc' }, take: 1 } },
      orderBy: { vehicleNumber: 'asc' },
    }),
    prisma.transportGeofence.findMany({ where: { institutionId, isActive: true } }),
    prisma.transportTrackingAlert.findMany({
      where: { institutionId },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: { vehicle: { select: { vehicleNumber: true } } },
    }),
    prisma.transportTrackingAuditLog.findMany({
      where: { institutionId },
      orderBy: { createdAt: 'desc' },
      take: 25,
    }),
    prisma.transportLiveTrackingSettings.findUnique({ where: { institutionId } }),
    prisma.transportGpsDevice.findMany({ where: { institutionId } }),
    prisma.transportIncident.findMany({
      where: { institutionId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { vehicle: true },
    }),
  ]);

  const serializedTrips = trips.map(serializeTrip);
  const activeTrips = serializedTrips.filter((t) => ['RUNNING', 'PAUSED', 'EMERGENCY'].includes(t.status));
  const statusCounts = VEHICLE_STATUSES.reduce((acc, s) => {
    acc[s] = serializedTrips.filter((t) => t.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  const mapVehicles = serializedTrips
    .filter((t) => t.status !== 'COMPLETED' && t.status !== 'OFFLINE')
    .map((t) => ({
      id: t.id, vehicleNumber: t.vehicleNumber, routeName: t.routeName,
      status: t.status, topPct: t.mapTopPct, leftPct: t.mapLeftPct,
      speedKmh: t.currentSpeedKmh, direction: t.direction,
      color: t.status === 'EMERGENCY' ? '#ef4444'
        : t.status === 'RUNNING' ? '#22c55e'
          : t.status === 'PAUSED' ? '#f59e0b' : '#64748b',
    }));

  const gpsOnline = gpsDevices.filter((g) => g.connectivityStatus === 'ONLINE').length;

  return {
    isLive: true,
    refreshIntervalSec: settings?.refreshIntervalSec ?? 10,
    workflow: WORKFLOW,
    kpis: {
      activeVehicles: activeTrips.length,
      totalTracked: serializedTrips.length,
      running: statusCounts.RUNNING ?? 0,
      delayed: serializedTrips.filter((t) => t.delayMinutes > 5).length,
      emergencies: statusCounts.EMERGENCY ?? 0,
      speedViolations: serializedTrips.filter((t) => t.speedViolation).length,
      gpsOnline, gpsTotal: gpsDevices.length,
      unacknowledgedAlerts: alerts.filter((a) => !a.acknowledged).length,
      avgSpeed: activeTrips.length
        ? Math.round(activeTrips.reduce((s, t) => s + t.avgSpeedKmh, 0) / activeTrips.length)
        : 0,
    },
    statusCounts,
    trips: serializedTrips,
    activeTrips,
    map: {
      provider: 'OpenStreetMap',
      center: { lat: 26.9124, lng: 75.7873 },
      zoom: 13,
      vehicles: mapVehicles,
      geofences: geofences.map((g) => ({
        id: g.id, name: g.name, fenceType: g.fenceType,
        latitude: g.latitude, longitude: g.longitude, radiusMeters: g.radiusMeters,
        ...latLngToMapPct(g.latitude, g.longitude),
      })),
      osmTileUrl: 'https://www.openstreetmap.org/export/embed.html?bbox=75.75%2C26.88%2C75.82%2C26.94&layer=mapnik',
    },
    vehicles: vehicles.map((v) => {
      const latest = v.locations[0];
      const activeTrip = serializedTrips.find((t) => t.vehicleId === v.id);
      return {
        id: v.id, vehicleNumber: v.vehicleNumber, routeName: v.routeName,
        driverName: v.driverName, operationalStatus: v.operationalStatus,
        liveTrackingEnabled: v.liveTrackingEnabled, mobileGpsEnabled: v.mobileGpsEnabled,
        gpsSource: activeTrip?.gpsSource ?? (v.gpsDevice ? 'DEVICE' : 'MOBILE_GPS'),
        gpsStatus: v.gpsDevice?.connectivityStatus ?? 'N/A',
        gpsBattery: v.gpsDevice?.batteryLevel ?? null,
        tripStatus: activeTrip?.status ?? 'OFFLINE',
        latestLocation: latest ? {
          latitude: latest.latitude, longitude: latest.longitude,
          speedKmh: latest.speedKmh, recordedAt: latest.recordedAt.toISOString(),
        } : activeTrip ? { latitude: activeTrip.latitude, longitude: activeTrip.longitude } : null,
      };
    }),
    geofences,
    alerts: alerts.map((a) => ({
      id: a.id, alertType: a.alertType, severity: a.severity, message: a.message,
      acknowledged: a.acknowledged, vehicleNumber: a.vehicle.vehicleNumber,
      createdAt: a.createdAt.toISOString(), relativeTime: relativeTime(a.createdAt),
    })),
    incidents: incidents.map((i) => ({
      id: i.id, type: i.incidentType, description: i.description,
      vehicleNumber: i.vehicle.vehicleNumber, createdAt: i.createdAt.toISOString(),
      relativeTime: relativeTime(i.createdAt),
    })),
    auditLogs: auditLogs.map((l) => ({
      id: l.id, entityType: l.entityType, action: l.action, details: l.details,
      performedBy: l.performedBy, createdAt: l.createdAt.toISOString(),
      relativeTime: relativeTime(l.createdAt),
    })),
    settings: settings ?? {},
    reports: REPORT_CATALOG,
    notificationChannels: ['Push Notification', 'SMS', 'WhatsApp', 'Email', 'In-App Notification'],
  };
}

async function nextTripNumber(institutionId: string): Promise<string> {
  const count = await prisma.transportLiveTrip.count({ where: { institutionId } });
  return `TRIP-${String(count + 1).padStart(5, '0')}`;
}

async function addEvent(
  institutionId: string, tripId: string, eventType: string,
  stopName = '', lat?: number, lng?: number, metadata: Record<string, string> = {},
) {
  await prisma.transportLiveTripEvent.create({
    data: {
      institutionId, tripId, eventType, stopName,
      latitude: lat, longitude: lng, metadata: metadata as Prisma.InputJsonValue,
    },
  });
}

export async function startLiveTrip(institutionId: string, tripId: string) {
  const trip = await prisma.transportLiveTrip.findFirst({ where: { id: tripId, institutionId } });
  if (!trip) throw new Error('Trip not found');
  const updated = await prisma.transportLiveTrip.update({
    where: { id: tripId },
    data: {
      status: 'RUNNING', startedAt: new Date(), pausedAt: null,
      driverAuthenticated: true, engineOn: true, ignitionOn: true,
    },
  });
  await addEvent(institutionId, tripId, 'TRIP_STARTED', '', trip.latitude, trip.longitude);
  await audit(institutionId, 'TRIP', 'Trip started', trip.tripNumber, tripId);
  return updated;
}

export async function pauseLiveTrip(institutionId: string, tripId: string) {
  const updated = await prisma.transportLiveTrip.update({
    where: { id: tripId },
    data: { status: 'PAUSED', pausedAt: new Date() },
  });
  await addEvent(institutionId, tripId, 'TRIP_PAUSED');
  return updated;
}

export async function resumeLiveTrip(institutionId: string, tripId: string) {
  const updated = await prisma.transportLiveTrip.update({
    where: { id: tripId },
    data: { status: 'RUNNING', pausedAt: null },
  });
  await addEvent(institutionId, tripId, 'TRIP_RESUMED');
  return updated;
}

export async function endLiveTrip(institutionId: string, tripId: string) {
  const trip = await prisma.transportLiveTrip.findFirst({ where: { id: tripId, institutionId } });
  if (!trip) throw new Error('Trip not found');
  const updated = await prisma.transportLiveTrip.update({
    where: { id: tripId },
    data: {
      status: 'COMPLETED', endedAt: new Date(),
      completedStops: trip.totalStops, remainingDistanceKm: 0,
      engineOn: false, ignitionOn: false,
    },
  });
  await addEvent(institutionId, tripId, 'TRIP_COMPLETED');
  await audit(institutionId, 'TRIP', 'Trip completed', trip.tripNumber, tripId);
  return updated;
}

export async function triggerLiveSos(institutionId: string, tripId: string, message: string) {
  const trip = await prisma.transportLiveTrip.findFirst({
    where: { id: tripId, institutionId },
    include: { vehicle: true },
  });
  if (!trip) throw new Error('Trip not found');

  await prisma.transportLiveTrip.update({
    where: { id: tripId },
    data: { status: 'EMERGENCY' },
  });
  await prisma.transportTrackingAlert.create({
    data: {
      institutionId, vehicleId: trip.vehicleId, tripId,
      alertType: 'SOS', severity: 'CRITICAL',
      message: message || 'Emergency SOS triggered by driver',
    },
  });
  await addEvent(institutionId, tripId, 'SOS', '', trip.latitude, trip.longitude, { message });
  await triggerTransportEmergency(institutionId, '', trip.vehicleId, message, trip.latitude, trip.longitude);
  await audit(institutionId, 'ALERT', 'SOS triggered', message, tripId);
  return trip;
}

export async function acknowledgeAlert(institutionId: string, alertId: string) {
  return prisma.transportTrackingAlert.update({
    where: { id: alertId },
    data: { acknowledged: true },
  });
}

export async function updateTrackingSettings(institutionId: string, body: Record<string, unknown>) {
  await ensureSettings(institutionId);
  const data: Record<string, unknown> = {};
  if (body.refreshIntervalSec !== undefined) data.refreshIntervalSec = Number(body.refreshIntervalSec);
  if (body.speedLimitKmh !== undefined) data.speedLimitKmh = Number(body.speedLimitKmh);
  if (body.idleThresholdMin !== undefined) data.idleThresholdMin = Number(body.idleThresholdMin);
  return prisma.transportLiveTrackingSettings.update({ where: { institutionId }, data });
}

export async function seedTransportLiveTracking(institutionId: string) {
  await seedTransportMaster(institutionId);
  await ensureSettings(institutionId);

  const existing = await prisma.transportLiveTrip.count({ where: { institutionId } });
  if (existing >= 5) return getTransportLiveTracking(institutionId);

  const tripDate = todayDate();
  const vehicles = await prisma.transportVehicle.findMany({
    where: { institutionId, isActive: true },
    include: { gpsDevice: true },
    take: 12,
  });
  const routes = await prisma.transportRoute.findMany({ where: { institutionId }, take: 12 });
  const drivers = await prisma.transportStaffMember.findMany({
    where: { institutionId, role: { in: ['Driver', 'DRIVER'] }, isActive: true }, take: 12,
  });

  const geofenceSeed = [
    { name: 'Main Campus', fenceType: 'SCHOOL', lat: 26.9124, lng: 75.7873, radius: 200 },
    { name: 'Transport Depot', fenceType: 'DEPOT', lat: 26.9180, lng: 75.7800, radius: 150 },
    { name: 'Shyam Nagar Stop', fenceType: 'STOP', lat: 26.9050, lng: 75.7920, radius: 80 },
    { name: 'Vaishali Nagar Stop', fenceType: 'STOP', lat: 26.9200, lng: 75.7750, radius: 80 },
    { name: 'Restricted Zone — Highway', fenceType: 'RESTRICTED', lat: 26.9300, lng: 75.8000, radius: 300 },
  ];
  for (const g of geofenceSeed) {
    const exists = await prisma.transportGeofence.findFirst({
      where: { institutionId, name: g.name },
    });
    if (!exists) {
      await prisma.transportGeofence.create({
        data: {
          institutionId, name: g.name, fenceType: g.fenceType,
          latitude: g.lat, longitude: g.lng, radiusMeters: g.radius,
        },
      });
    }
  }

  const statuses = ['RUNNING', 'RUNNING', 'RUNNING', 'RUNNING', 'PAUSED', 'IDLE', 'RUNNING', 'COMPLETED', 'RUNNING', 'EMERGENCY'];
  const now = Date.now();

  for (let i = 0; i < Math.min(vehicles.length, 10); i++) {
    const vehicle = vehicles[i];
    const route = routes[i % routes.length];
    const driver = drivers[i % Math.max(drivers.length, 1)];
    const status = statuses[i % statuses.length];
    const tripNumber = await nextTripNumber(institutionId);
    const totalStops = route?.stopCount ?? 8;
    const completed = status === 'COMPLETED' ? totalStops : Math.floor(totalStops * (0.2 + i * 0.07));
    const lat = 26.9124 + (i * 0.004) - 0.01;
    const lng = 75.7873 + (i * 0.003) - 0.005;
    const distanceTotal = route?.distanceKm ?? 12;
    const distanceCovered = distanceTotal * (completed / totalStops);
    const speed = status === 'RUNNING' ? 25 + (i % 5) * 8 : status === 'PAUSED' ? 0 : 15;
    const gpsSource = vehicle.gpsDevice ? 'DEVICE' : 'MOBILE_GPS';

    const trip = await prisma.transportLiveTrip.create({
      data: {
        institutionId, tripNumber, vehicleId: vehicle.id,
        routeId: route?.id, driverId: driver?.id, tripDate, status, gpsSource,
        startedAt: status !== 'IDLE' ? new Date(now - (60 + i * 10) * 60000) : null,
        pausedAt: status === 'PAUSED' ? new Date(now - 5 * 60000) : null,
        endedAt: status === 'COMPLETED' ? new Date(now - 30 * 60000) : null,
        currentStopIndex: completed, completedStops: completed, totalStops,
        distanceCoveredKm: distanceCovered, remainingDistanceKm: distanceTotal - distanceCovered,
        totalDistanceKm: distanceTotal,
        currentSpeedKmh: speed, avgSpeedKmh: speed * 0.85, heading: (i * 45) % 360,
        latitude: lat, longitude: lng,
        etaNextStop: `07:${String(30 + i * 5).padStart(2, '0')}`,
        delayMinutes: i % 4 === 0 ? 8 : i % 5 === 0 ? 0 : 2,
        fuelLevelPct: 40 + (i % 6) * 10,
        engineOn: status !== 'COMPLETED' && status !== 'IDLE',
        ignitionOn: status !== 'COMPLETED' && status !== 'IDLE',
        gpsSignalHealth: i === 9 ? 'WEAK' : i === 7 ? 'OFFLINE' : 'ONLINE',
        driverAuthenticated: status !== 'IDLE',
        studentsBoarded: Math.floor((vehicle.studentCount || 30) * (completed / totalStops)),
        studentsTotal: vehicle.studentCount || 30,
      },
    });

    await prisma.vehicleLocation.create({
      data: {
        institutionId, vehicleId: vehicle.id,
        latitude: lat, longitude: lng, speedKmh: speed, heading: (i * 45) % 360,
        recordedAt: new Date(now - (i % 3) * 60000),
      },
    });

    const eventTypes = [
      { type: 'TRIP_STARTED', stop: '', mins: 60 + i * 10 },
      { type: 'STOP_ARRIVAL', stop: 'Stop 1', mins: 50 + i * 8 },
      { type: 'STUDENT_BOARDED', stop: 'Stop 1', mins: 49 + i * 8 },
      { type: 'STOP_DEPARTURE', stop: 'Stop 1', mins: 47 + i * 8 },
      { type: 'STOP_ARRIVAL', stop: 'Stop 2', mins: 40 + i * 7 },
      { type: 'STUDENT_BOARDED', stop: 'Stop 2', mins: 39 + i * 7 },
    ];
    for (const ev of eventTypes) {
      if (status === 'IDLE' && ev.type === 'TRIP_STARTED') continue;
      await prisma.transportLiveTripEvent.create({
        data: {
          institutionId, tripId: trip.id, eventType: ev.type, stopName: ev.stop,
          latitude: lat, longitude: lng,
          createdAt: new Date(now - ev.mins * 60000),
        },
      });
    }

    if (speed > vehicle.speedLimitKmh) {
      await prisma.transportTrackingAlert.create({
        data: {
          institutionId, vehicleId: vehicle.id, tripId: trip.id,
          alertType: 'SPEED_VIOLATION', severity: 'HIGH',
          message: `${vehicle.vehicleNumber} exceeded speed limit (${Math.round(speed)} km/h)`,
        },
      });
    }
    if (i % 4 === 0 && status === 'RUNNING') {
      await prisma.transportTrackingAlert.create({
        data: {
          institutionId, vehicleId: vehicle.id, tripId: trip.id,
          alertType: 'TRAFFIC_DELAY', severity: 'MEDIUM',
          message: `${vehicle.vehicleNumber} — ETA delayed by ${8} minutes due to traffic`,
        },
      });
    }
    if (status === 'EMERGENCY') {
      await prisma.transportTrackingAlert.create({
        data: {
          institutionId, vehicleId: vehicle.id, tripId: trip.id,
          alertType: 'SOS', severity: 'CRITICAL',
          message: `Emergency SOS from ${vehicle.vehicleNumber} — assistance required`,
        },
      });
    }
    if (i === 3) {
      await prisma.transportTrackingAlert.create({
        data: {
          institutionId, vehicleId: vehicle.id, tripId: trip.id,
          alertType: 'ROUTE_DEVIATION', severity: 'HIGH',
          message: `${vehicle.vehicleNumber} deviated from planned route`,
        },
      });
    }
  }

  await audit(institutionId, 'SYSTEM', 'Demo live tracking data seeded');
  return getTransportLiveTracking(institutionId);
}
