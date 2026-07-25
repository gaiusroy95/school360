import { prisma } from './prisma.js';
import type { Prisma } from '@prisma/client';
import { seedTransportFuelManagement } from './transportFuelManagement.js';

export const ALERT_TYPES = ['ACCIDENT', 'SOS', 'BREAKDOWN', 'SPEED_VIOLATION', 'GEOFENCE', 'MEDICAL', 'STUDENT_SAFETY', 'NEAR_MISS'];
export const ALERT_SOURCES = ['GPS_AUTO', 'MOBILE_APP', 'MANUAL', 'SYSTEM'];
export const ALERT_SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
export const ALERT_STATUSES = ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
export const REPORT_TYPES = ['ACCIDENT', 'NEAR_MISS', 'DAMAGE', 'STUDENT_INJURY', 'ROAD_HAZARD'];

const REPORT_CATALOG = [
  'Accident Alert Report', 'SOS Emergency Report', 'GPS Auto-Trigger Report',
  'Mobile App Incident Report', 'Speed Violation Report', 'Geofence Breach Report',
  'Student Safety Alert Report', 'Escalation Report', 'Response Time Report',
  'Parent Notification Report', 'Police Notification Report', 'Injury Report',
  'Vehicle Damage Report', 'Driver Safety Report', 'Monthly Safety Summary',
  'Safety Compliance Dashboard',
];

const WORKFLOW = [
  'Incident Detected', 'Auto Alert Triggered', 'GPS/Mobile Report Received',
  'Transport Manager Notified', 'Acknowledgement', 'Investigation', 'Resolution', 'Report Closed',
];

function relativeTime(d: Date): string {
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  return hrs < 24 ? `${hrs} hr ago` : 'Yesterday';
}

function latLngToMapPct(lat: number, lng: number) {
  const baseLat = 26.9124;
  const baseLng = 75.7873;
  return {
    topPct: Math.max(5, Math.min(95, 50 - (lat - baseLat) * 8000)),
    leftPct: Math.max(5, Math.min(95, 50 + (lng - baseLng) * 8000)),
  };
}

async function ensureSettings(institutionId: string) {
  let row = await prisma.transportSafetySettings.findUnique({ where: { institutionId } });
  if (!row) {
    row = await prisma.transportSafetySettings.create({
      data: {
        institutionId,
        autoAccidentTrigger: true,
        gpsImpactThresholdG: 3.5,
        speedViolationKmh: 60,
        escalationMinutes: 5,
        autoNotifyParents: true,
        autoNotifyPrincipal: true,
        roleMatrix: [
          { role: 'Transport Manager', permissions: 'Acknowledge alerts, escalate, review reports, notify stakeholders' },
          { role: 'Principal', permissions: 'View critical alerts, approve escalations, safety compliance' },
          { role: 'Driver', permissions: 'SOS button, accident report with photos, odometer & location' },
          { role: 'Attendant', permissions: 'Report incidents, student safety alerts with images' },
          { role: 'Parent', permissions: 'Receive accident/emergency notifications, view bus safety status' },
        ],
        notificationRules: {
          channels: ['Push', 'SMS', 'WhatsApp', 'Email', 'Siren/In-App'],
          events: ['Accident auto-detected', 'SOS pressed', 'Speed violation', 'Geofence breach', 'Mobile report submitted'],
        },
        mobileSyncRules: {
          driverApp: ['SOS button', 'Accident report with camera', 'Auto GPS location', 'Voice note', 'Trip pause on SOS'],
          attendantApp: ['Report student injury', 'Upload damage photos', 'Emergency contact trigger'],
          parentApp: ['Accident notifications', 'Bus emergency alerts', 'Live location during incident'],
          principalApp: ['Critical alert dashboard', 'Escalation approvals', 'Safety compliance view'],
        },
        autoTriggerRules: {
          gpsAccident: { enabled: true, impactThresholdG: 3.5, suddenDecelerationKmh: 40 },
          speedViolation: { enabled: true, limitKmh: 60 },
          geofenceBreach: { enabled: true },
          sosButton: { enabled: true, autoEscalateMinutes: 5 },
        },
        reportCatalog: REPORT_CATALOG,
      },
    });
  }
  return row;
}

async function audit(institutionId: string, entityType: string, action: string, details = '', entityId = '') {
  await prisma.transportSafetyAuditLog.create({
    data: { institutionId, entityType, entityId, action, details, performedBy: 'Safety Officer' },
  });
}

async function nextAlertNumber(institutionId: string) {
  const n = await prisma.transportSafetyAlert.count({ where: { institutionId } });
  return `SA-${String(n + 1).padStart(5, '0')}`;
}

async function nextReportNumber(institutionId: string) {
  const n = await prisma.transportSafetyReport.count({ where: { institutionId } });
  return `SR-${String(n + 1).padStart(5, '0')}`;
}

async function createAutoAlert(
  institutionId: string,
  data: {
    alertType: string; severity: string; source: string; vehicleId?: string; tripId?: string;
    driverName?: string; latitude?: number; longitude?: number; locationLabel?: string;
    message: string; gpsImpactG?: number; speedAtEvent?: number;
  },
) {
  const alertNumber = await nextAlertNumber(institutionId);
  const alert = await prisma.transportSafetyAlert.create({
    data: {
      institutionId, alertNumber,
      alertType: data.alertType,
      severity: data.severity,
      source: data.source,
      vehicleId: data.vehicleId ?? null,
      tripId: data.tripId ?? null,
      driverName: data.driverName ?? '',
      latitude: data.latitude ?? 0,
      longitude: data.longitude ?? 0,
      locationLabel: data.locationLabel ?? '',
      message: data.message,
      autoTriggered: data.source === 'GPS_AUTO' || data.source === 'SYSTEM',
      gpsImpactG: data.gpsImpactG,
      speedAtEvent: data.speedAtEvent,
    },
  });

  if (data.vehicleId && (data.alertType === 'ACCIDENT' || data.alertType === 'SOS')) {
    await prisma.transportIncident.create({
      data: {
        institutionId,
        vehicleId: data.vehicleId,
        incidentType: data.alertType === 'ACCIDENT' ? 'COLLISION' : 'EMERGENCY',
        description: data.message,
        latitude: data.latitude ?? 0,
        longitude: data.longitude ?? 0,
      },
    });
  }

  if (data.vehicleId) {
    await prisma.transportTrackingAlert.create({
      data: {
        institutionId,
        vehicleId: data.vehicleId,
        alertType: data.alertType,
        severity: data.severity,
        message: `[AUTO] ${data.message}`,
      },
    }).catch(() => null);
  }

  await audit(institutionId, 'ALERT', 'Auto-Triggered', data.message, alert.id);
  return alert;
}

function serializeAlert(a: {
  id: string; alertNumber: string; alertType: string; severity: string; source: string;
  driverName: string; latitude: number; longitude: number; locationLabel: string;
  message: string; autoTriggered: boolean; gpsImpactG: number | null; speedAtEvent: number | null;
  status: string; acknowledged: boolean; acknowledgedBy: string; escalated: boolean;
  createdAt: Date; resolvedAt: Date | null;
  vehicle?: { vehicleNumber: string; routeName: string } | null;
  trip?: { tripNumber: string } | null;
  reports?: { id: string; imageUrls: unknown }[];
}) {
  const mapPos = latLngToMapPct(a.latitude, a.longitude);
  const images = (a.reports ?? []).flatMap((r) => (Array.isArray(r.imageUrls) ? r.imageUrls : []) as string[]);
  return {
    id: a.id, alertNumber: a.alertNumber, alertType: a.alertType, severity: a.severity,
    source: a.source, vehicleNumber: a.vehicle?.vehicleNumber ?? '—',
    routeName: a.vehicle?.routeName ?? '', tripNumber: a.trip?.tripNumber ?? '',
    driverName: a.driverName, latitude: a.latitude, longitude: a.longitude,
    locationLabel: a.locationLabel, message: a.message, autoTriggered: a.autoTriggered,
    gpsImpactG: a.gpsImpactG, speedAtEvent: a.speedAtEvent,
    status: a.status, acknowledged: a.acknowledged, acknowledgedBy: a.acknowledgedBy,
    escalated: a.escalated, imageUrls: images,
    relativeTime: relativeTime(a.createdAt),
    createdAt: a.createdAt.toISOString(),
    resolvedAt: a.resolvedAt?.toISOString() ?? '',
    ...mapPos,
  };
}

export async function getTransportSafetyAlerts(institutionId: string) {
  await ensureSettings(institutionId);
  const settings = await prisma.transportSafetySettings.findUnique({ where: { institutionId } });

  const [alerts, reports, auditLogs, vehicles, trips] = await Promise.all([
    prisma.transportSafetyAlert.findMany({
      where: { institutionId },
      include: {
        vehicle: { select: { vehicleNumber: true, routeName: true } },
        trip: { select: { tripNumber: true } },
        reports: { select: { id: true, imageUrls: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.transportSafetyReport.findMany({
      where: { institutionId },
      include: {
        vehicle: { select: { vehicleNumber: true } },
        trip: { select: { tripNumber: true } },
        alert: { select: { alertNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),
    prisma.transportSafetyAuditLog.findMany({
      where: { institutionId }, orderBy: { createdAt: 'desc' }, take: 25,
    }),
    prisma.transportVehicle.findMany({
      where: { institutionId, isActive: true },
      select: { id: true, vehicleNumber: true, driverName: true, routeName: true },
      take: 20,
    }),
    prisma.transportTrip.findMany({
      where: { institutionId, status: { in: ['RUNNING', 'EMERGENCY', 'COMPLETED'] } },
      select: { id: true, tripNumber: true, vehicleId: true, driverName: true, status: true },
      orderBy: { tripDate: 'desc' },
      take: 10,
    }),
  ]);

  const serializedAlerts = alerts.map(serializeAlert);
  const openAlerts = alerts.filter((a) => ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS'].includes(a.status));
  const criticalAlerts = alerts.filter((a) => a.severity === 'CRITICAL' && a.status !== 'RESOLVED' && a.status !== 'CLOSED');
  const gpsAuto = alerts.filter((a) => a.source === 'GPS_AUTO');
  const mobileReports = reports.filter((r) => r.source === 'MOBILE_APP');

  return {
    alertTypes: ALERT_TYPES,
    alertSources: ALERT_SOURCES,
    severities: ALERT_SEVERITIES,
    statuses: ALERT_STATUSES,
    reportTypes: REPORT_TYPES,
    workflow: WORKFLOW,
    kpis: {
      totalAlerts: alerts.length,
      openAlerts: openAlerts.length,
      criticalAlerts: criticalAlerts.length,
      unacknowledged: alerts.filter((a) => !a.acknowledged && a.status === 'OPEN').length,
      gpsAutoTriggered: gpsAuto.length,
      mobileReports: mobileReports.length,
      accidents: alerts.filter((a) => a.alertType === 'ACCIDENT').length,
      escalated: alerts.filter((a) => a.escalated).length,
      avgResponseMins: 4,
      resolvedToday: alerts.filter((a) => a.resolvedAt && a.resolvedAt > new Date(Date.now() - 86400000)).length,
    },
    alerts: serializedAlerts,
    reports: reports.map((r) => ({
      id: r.id, reportNumber: r.reportNumber, reportType: r.reportType, source: r.source,
      vehicleNumber: r.vehicle?.vehicleNumber ?? '—', tripNumber: r.trip?.tripNumber ?? '',
      alertNumber: r.alert?.alertNumber ?? '', reportedBy: r.reportedBy, reporterRole: r.reporterRole,
      description: r.description, latitude: r.latitude, longitude: r.longitude,
      locationLabel: r.locationLabel,
      imageUrls: Array.isArray(r.imageUrls) ? r.imageUrls : [],
      injuryReported: r.injuryReported, policeNotified: r.policeNotified, parentNotified: r.parentNotified,
      studentsInvolved: r.studentsInvolved, status: r.status,
      relativeTime: relativeTime(r.createdAt),
      createdAt: r.createdAt.toISOString(),
      ...latLngToMapPct(r.latitude, r.longitude),
    })),
    map: {
      center: { lat: 26.9124, lng: 75.7873 },
      incidents: serializedAlerts.filter((a) => a.latitude !== 0).map((a) => ({
        id: a.id, alertNumber: a.alertNumber, alertType: a.alertType, severity: a.severity,
        vehicleNumber: a.vehicleNumber, message: a.message,
        latitude: a.latitude, longitude: a.longitude, topPct: a.topPct, leftPct: a.leftPct,
      })),
    },
    vehicles,
    trips,
    auditLogs: auditLogs.map((l) => ({
      id: l.id, entityType: l.entityType, action: l.action, details: l.details,
      performedBy: l.performedBy, relativeTime: relativeTime(l.createdAt),
    })),
    settings,
    reports_catalog: REPORT_CATALOG,
  };
}

export async function triggerGpsAccidentAlert(institutionId: string, body: Record<string, unknown>) {
  const settings = await ensureSettings(institutionId);
  const impactG = Number(body.impactG ?? body.gpsImpactG ?? 0);
  const speed = Number(body.speedAtEvent ?? body.speedKmh ?? 0);

  if (settings.autoAccidentTrigger && impactG < settings.gpsImpactThresholdG) {
    return { triggered: false, reason: `Impact ${impactG}G below threshold ${settings.gpsImpactThresholdG}G` };
  }

  const vehicle = body.vehicleId
    ? await prisma.transportVehicle.findFirst({ where: { id: String(body.vehicleId), institutionId } })
    : await prisma.transportVehicle.findFirst({ where: { institutionId, isActive: true } });

  const alert = await createAutoAlert(institutionId, {
    alertType: 'ACCIDENT',
    severity: impactG >= 5 ? 'CRITICAL' : 'HIGH',
    source: 'GPS_AUTO',
    vehicleId: vehicle?.id,
    tripId: body.tripId ? String(body.tripId) : undefined,
    driverName: vehicle?.driverName ?? '',
    latitude: Number(body.latitude ?? 26.9124),
    longitude: Number(body.longitude ?? 75.7873),
    locationLabel: String(body.locationLabel ?? 'GPS detected location'),
    message: `GPS impact detected: ${impactG}G at ${speed} km/h — possible accident`,
    gpsImpactG: impactG,
    speedAtEvent: speed,
  });

  return { triggered: true, alert };
}

export async function submitMobileSafetyReport(institutionId: string, body: Record<string, unknown>) {
  const reportNumber = await nextReportNumber(institutionId);
  const imageUrls = Array.isArray(body.imageUrls) ? body.imageUrls : [];
  const alertType = String(body.reportType ?? 'ACCIDENT') === 'ACCIDENT' ? 'ACCIDENT' : 'SOS';

  const alert = await createAutoAlert(institutionId, {
    alertType,
    severity: body.injuryReported ? 'CRITICAL' : 'HIGH',
    source: 'MOBILE_APP',
    vehicleId: body.vehicleId ? String(body.vehicleId) : undefined,
    tripId: body.tripId ? String(body.tripId) : undefined,
    driverName: String(body.reportedBy ?? ''),
    latitude: Number(body.latitude ?? 0),
    longitude: Number(body.longitude ?? 0),
    locationLabel: String(body.locationLabel ?? ''),
    message: String(body.description ?? 'Mobile app safety report submitted'),
  });

  const report = await prisma.transportSafetyReport.create({
    data: {
      institutionId, reportNumber,
      reportType: String(body.reportType ?? 'ACCIDENT'),
      source: 'MOBILE_APP',
      vehicleId: body.vehicleId ? String(body.vehicleId) : null,
      tripId: body.tripId ? String(body.tripId) : null,
      alertId: alert.id,
      reportedBy: String(body.reportedBy ?? 'Driver'),
      reporterRole: String(body.reporterRole ?? 'DRIVER'),
      description: String(body.description ?? ''),
      latitude: Number(body.latitude ?? 0),
      longitude: Number(body.longitude ?? 0),
      locationLabel: String(body.locationLabel ?? ''),
      imageUrls: imageUrls as Prisma.InputJsonValue,
      injuryReported: Boolean(body.injuryReported),
      policeNotified: Boolean(body.policeNotified),
      parentNotified: Boolean(body.parentNotified),
      studentsInvolved: Number(body.studentsInvolved ?? 0),
    },
  });

  await audit(institutionId, 'REPORT', 'Mobile Submitted', reportNumber, report.id);
  return report;
}

export async function acknowledgeSafetyAlert(institutionId: string, alertId: string, acknowledgedBy = 'Transport Manager') {
  await prisma.transportSafetyAlert.update({
    where: { id: alertId },
    data: {
      acknowledged: true, acknowledgedBy, acknowledgedAt: new Date(),
      status: 'ACKNOWLEDGED',
    },
  });
  await audit(institutionId, 'ALERT', 'Acknowledged', acknowledgedBy, alertId);
}

export async function escalateSafetyAlert(institutionId: string, alertId: string) {
  const alert = await prisma.transportSafetyAlert.findFirst({ where: { id: alertId, institutionId } });
  if (!alert) throw new Error('Alert not found');

  await prisma.transportSafetyAlert.update({
    where: { id: alertId },
    data: { escalated: true, escalatedAt: new Date(), status: 'IN_PROGRESS', severity: 'CRITICAL' },
  });
  await audit(institutionId, 'ALERT', 'Escalated', alert.alertNumber, alertId);
}

export async function resolveSafetyAlert(institutionId: string, alertId: string) {
  await prisma.transportSafetyAlert.update({
    where: { id: alertId },
    data: { status: 'RESOLVED', resolvedAt: new Date() },
  });
  await audit(institutionId, 'ALERT', 'Resolved', '', alertId);
}

export async function reviewSafetyReport(institutionId: string, reportId: string, status = 'VERIFIED') {
  await prisma.transportSafetyReport.update({
    where: { id: reportId },
    data: { status, reviewedBy: 'Transport Manager', reviewedAt: new Date() },
  });
  await audit(institutionId, 'REPORT', status, reportId, reportId);
}

export async function triggerSosAlert(institutionId: string, body: Record<string, unknown>) {
  const vehicle = body.vehicleId
    ? await prisma.transportVehicle.findFirst({ where: { id: String(body.vehicleId), institutionId } })
    : null;

  return createAutoAlert(institutionId, {
    alertType: 'SOS',
    severity: 'CRITICAL',
    source: String(body.source ?? 'MOBILE_APP'),
    vehicleId: vehicle?.id,
    tripId: body.tripId ? String(body.tripId) : undefined,
    driverName: String(body.driverName ?? vehicle?.driverName ?? ''),
    latitude: Number(body.latitude ?? 0),
    longitude: Number(body.longitude ?? 0),
    locationLabel: String(body.locationLabel ?? ''),
    message: String(body.message ?? 'SOS emergency button pressed'),
  });
}

export async function seedTransportSafetyAlerts(institutionId: string) {
  await seedTransportFuelManagement(institutionId);
  await ensureSettings(institutionId);

  const existing = await prisma.transportSafetyAlert.count({ where: { institutionId } });
  if (existing >= 5) return getTransportSafetyAlerts(institutionId);

  const vehicles = await prisma.transportVehicle.findMany({
    where: { institutionId, isActive: true }, take: 5,
  });
  const trips = await prisma.transportTrip.findMany({
    where: { institutionId }, take: 3,
  });

  const demoImages = [
    'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=400',
    'https://images.unsplash.com/photo-1502872364588-894d2d6ddfab?w=400',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
  ];

  const alertDefs = [
    {
      type: 'ACCIDENT', severity: 'CRITICAL', source: 'GPS_AUTO',
      msg: 'GPS impact 4.8G detected — sudden deceleration on MI Road, Jaipur',
      impactG: 4.8, speed: 42, loc: 'MI Road, Jaipur', lat: 26.915, lng: 75.79,
    },
    {
      type: 'ACCIDENT', severity: 'HIGH', source: 'MOBILE_APP',
      msg: 'Minor collision reported by driver — front bumper damage',
      impactG: null, speed: 25, loc: 'Route R02 Stop 4', lat: 26.908, lng: 75.782,
    },
    {
      type: 'SOS', severity: 'CRITICAL', source: 'MOBILE_APP',
      msg: 'SOS pressed — medical emergency on board',
      impactG: null, speed: 0, loc: 'Tonk Road Junction', lat: 26.905, lng: 75.795,
    },
    {
      type: 'SPEED_VIOLATION', severity: 'MEDIUM', source: 'GPS_AUTO',
      msg: 'Speed 78 km/h exceeded limit of 60 km/h',
      impactG: null, speed: 78, loc: 'Highway NH-48', lat: 26.920, lng: 75.800,
    },
    {
      type: 'STUDENT_SAFETY', severity: 'HIGH', source: 'MOBILE_APP',
      msg: 'Student injury reported during boarding — attendant alert',
      impactG: null, speed: 5, loc: 'School Main Gate', lat: 26.912, lng: 75.787,
    },
    {
      type: 'BREAKDOWN', severity: 'MEDIUM', source: 'GPS_AUTO',
      msg: 'Vehicle stationary 20+ min outside geofence — possible breakdown',
      impactG: null, speed: 0, loc: 'Sanganer Industrial Area', lat: 26.898, lng: 75.775,
    },
  ];

  for (let i = 0; i < alertDefs.length; i++) {
    const def = alertDefs[i];
    const v = vehicles[i % vehicles.length];
    const alertNum = await nextAlertNumber(institutionId);

    const alert = await prisma.transportSafetyAlert.create({
      data: {
        institutionId, alertNumber: alertNum,
        alertType: def.type, severity: def.severity, source: def.source,
        vehicleId: v?.id ?? null,
        tripId: trips[i % trips.length]?.id ?? null,
        driverName: v?.driverName ?? 'Driver',
        latitude: def.lat, longitude: def.lng,
        locationLabel: def.loc,
        message: def.msg,
        autoTriggered: def.source === 'GPS_AUTO',
        gpsImpactG: def.impactG,
        speedAtEvent: def.speed,
        status: i < 2 ? 'OPEN' : i < 4 ? 'ACKNOWLEDGED' : 'RESOLVED',
        acknowledged: i >= 2,
        acknowledgedBy: i >= 2 ? 'Transport Manager' : '',
        acknowledgedAt: i >= 2 ? new Date() : null,
        escalated: i === 0,
        escalatedAt: i === 0 ? new Date() : null,
        resolvedAt: i >= 4 ? new Date() : null,
        createdAt: new Date(Date.now() - i * 3600000),
      },
    });

    if (def.source === 'MOBILE_APP' || def.type === 'ACCIDENT') {
      const reportNum = await nextReportNumber(institutionId);
      await prisma.transportSafetyReport.create({
        data: {
          institutionId, reportNumber: reportNum,
          reportType: def.type === 'STUDENT_SAFETY' ? 'STUDENT_INJURY' : def.type === 'ACCIDENT' ? 'ACCIDENT' : 'NEAR_MISS',
          source: 'MOBILE_APP',
          vehicleId: v?.id ?? null,
          tripId: trips[i % trips.length]?.id ?? null,
          alertId: alert.id,
          reportedBy: v?.driverName ?? 'Driver',
          reporterRole: i === 4 ? 'ATTENDANT' : 'DRIVER',
          description: def.msg,
          latitude: def.lat, longitude: def.lng,
          locationLabel: def.loc,
          imageUrls: [demoImages[i % 3], ...(i === 0 ? [demoImages[1]] : [])],
          injuryReported: i === 0 || i === 4,
          policeNotified: i === 0,
          parentNotified: i <= 2,
          studentsInvolved: i === 4 ? 1 : 0,
          status: i < 2 ? 'SUBMITTED' : 'VERIFIED',
          reviewedBy: i >= 2 ? 'Transport Manager' : '',
          reviewedAt: i >= 2 ? new Date() : null,
          createdAt: new Date(Date.now() - i * 3600000),
        },
      });
    }
  }

  await audit(institutionId, 'SYSTEM', 'Seed Demo', 'Safety & alerts demo data loaded');
  return getTransportSafetyAlerts(institutionId);
}
