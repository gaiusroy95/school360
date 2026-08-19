import { prisma } from './prisma.js';
import { seedTransportDashboard } from './transportDashboard.js';

export const ROUTE_TYPES = ['Morning', 'Evening', 'Two-way', 'One-way', 'Special Route', 'Exam Route', 'Event Route'];
export const ROUTE_STATUSES = ['ACTIVE', 'INACTIVE', 'UNDER_MAINTENANCE', 'SEASONAL'];
export const VEHICLE_TYPES = ['Bus', 'Van', 'Mini Bus', 'Car', 'Electric Vehicle', 'Contract Vehicle'];
export const AVAILABILITY_STATUSES = ['AVAILABLE', 'ON_TRIP', 'BREAKDOWN', 'MAINTENANCE', 'RESERVED'];
export const GPS_VENDORS = ['TrackPro', 'FleetSync', 'GeoTrack', 'SafeRide', 'NavTrack'];
export const STOP_TYPES = ['PICKUP', 'DROP', 'BOTH'];
export const STAFF_ROLES = ['Driver', 'Attendant'];

async function refreshRouteStopCount(routeId: string) {
  const count = await prisma.transportRouteStop.count({ where: { routeId } });
  await prisma.transportRoute.update({ where: { id: routeId }, data: { stopCount: count } });
}

async function nextStaffCode(institutionId: string, role: string): Promise<string> {
  const prefix = role === 'Attendant' ? 'ATT' : 'DRV';
  const count = await prisma.transportStaffMember.count({ where: { institutionId, role } });
  return `${prefix}-${String(count + 1).padStart(4, '0')}`;
}

function parseJson<T>(raw: unknown, fallback: T): T {
  if (raw === null || raw === undefined) return fallback;
  return raw as T;
}

async function ensureSettings(institutionId: string) {
  let row = await prisma.transportMasterSettings.findUnique({ where: { institutionId } });
  if (!row) {
    row = await prisma.transportMasterSettings.create({
      data: {
        institutionId,
        roleMatrix: [
          { role: 'Super Admin', permissions: 'Full access — routes, vehicles, GPS, bulk import/export, settings' },
          { role: 'Transport Manager', permissions: 'Create/edit routes, vehicles, assignments, documents' },
          { role: 'Principal', permissions: 'View fleet, live tracking, reports, approve route changes' },
          { role: 'Branch Admin', permissions: 'Manage branch routes and vehicles' },
        ],
        notificationRules: {
          channels: ['Parent App', 'Staff App', 'Principal App', 'SMS', 'Email'],
          events: ['Route change', 'Vehicle replacement', 'GPS offline', 'Document expiry', 'Route suspension'],
        },
        mobileSyncRules: {
          parentApp: ['Route & vehicle', 'Driver & attendant', 'Live tracking', 'ETA', 'Alerts'],
          staffApp: ['Duty assignment', 'Trip start/pause/end', 'Mobile GPS', 'Breakdown report'],
          principalApp: ['Fleet monitor', 'Delayed routes', 'Emergency alerts', 'Utilization'],
        },
      },
    });
  }
  return row;
}

async function audit(
  institutionId: string, entityType: string, entityId: string, entityLabel: string,
  action: string, prev = '', curr = '', reason = '',
) {
  await prisma.transportMasterAuditLog.create({
    data: {
      institutionId, entityType, entityId, entityLabel, action,
      performedBy: 'Transport Manager', reason, previousValue: prev, currentValue: curr,
    },
  });
}

async function nextRouteCode(institutionId: string): Promise<string> {
  const settings = await ensureSettings(institutionId);
  const count = await prisma.transportRoute.count({ where: { institutionId } });
  const num = String(count + 1).padStart(2, '0');
  return settings.autoRouteCode ? `${settings.routeCodePrefix}${num}` : `R${num}`;
}

function serializeRoute(r: {
  id: string; routeCode: string; routeName: string; description: string; routeType: string;
  branch: string; academicYear: string; distanceKm: number; estimatedMinutes: number;
  durationMinutes: number; routeColor: string; status: string; stopCount: number;
  studentCount: number; occupancyPct: number; isActive: boolean; isArchived: boolean;
  versionLabel: string; stops?: Array<{
    id: string; stopType: string; stopName: string; sequenceOrder: number;
    latitude: number; longitude: number; landmark: string; estimatedArrival: string;
  }>;
}) {
  return {
    id: r.id, routeCode: r.routeCode, routeName: r.routeName, description: r.description,
    routeType: r.routeType, branch: r.branch, academicYear: r.academicYear,
    distanceKm: r.distanceKm, estimatedMinutes: r.estimatedMinutes, durationMinutes: r.durationMinutes,
    routeColor: r.routeColor, status: r.status, stopCount: r.stopCount, studentCount: r.studentCount,
    occupancyPct: r.occupancyPct, isActive: r.isActive, isArchived: r.isArchived,
    versionLabel: r.versionLabel,
    stops: (r.stops ?? []).map((s) => ({
      id: s.id, stopType: s.stopType, stopName: s.stopName, sequenceOrder: s.sequenceOrder,
      latitude: s.latitude, longitude: s.longitude, landmark: s.landmark,
      estimatedArrival: s.estimatedArrival,
    })),
  };
}

function serializeVehicle(v: {
  id: string; vehicleNumber: string; registrationNumber: string; routeName: string; routeCode: string;
  driverName: string; driverMobile: string; attendantName: string; vehicleType: string;
  capacity: number; reserveSeats: number; vehicleCategory: string; make: string; model: string;
  manufactureYear: number; fuelType: string; operationalStatus: string; availabilityStatus: string;
  healthStatus: string; shiftType: string; liveTrackingEnabled: boolean; mobileGpsEnabled: boolean;
  speedLimitKmh: number; studentCount: number; isActive: boolean; isArchived: boolean;
  compliance: unknown; documents: unknown; gpsDeviceId: string | null;
  gpsDevice?: { deviceId: string; connectivityStatus: string; batteryLevel: number } | null;
}) {
  const compliance = parseJson<Record<string, unknown>>(v.compliance, {});
  const docs = parseJson<unknown[]>(v.documents, []);
  return {
    id: v.id, vehicleNumber: v.vehicleNumber, registrationNumber: v.registrationNumber,
    routeName: v.routeName, routeCode: v.routeCode, driverName: v.driverName,
    driverMobile: v.driverMobile, attendantName: v.attendantName, vehicleType: v.vehicleType,
    capacity: v.capacity, reserveSeats: v.reserveSeats, effectiveCapacity: v.capacity - v.reserveSeats,
    vehicleCategory: v.vehicleCategory, make: v.make, model: v.model, manufactureYear: v.manufactureYear,
    fuelType: v.fuelType, operationalStatus: v.operationalStatus, availabilityStatus: v.availabilityStatus,
    healthStatus: v.healthStatus, shiftType: v.shiftType, liveTrackingEnabled: v.liveTrackingEnabled,
    mobileGpsEnabled: v.mobileGpsEnabled, speedLimitKmh: v.speedLimitKmh, studentCount: v.studentCount,
    isActive: v.isActive, isArchived: v.isArchived, compliance, documentsCount: docs.length,
    gpsDeviceId: v.gpsDevice?.deviceId ?? '', gpsStatus: v.gpsDevice?.connectivityStatus ?? 'N/A',
    gpsBattery: v.gpsDevice?.batteryLevel ?? 0,
  };
}

export async function getTransportMaster(institutionId: string, academicYear = '2025-26') {
  await ensureSettings(institutionId);

  const [routes, vehicles, gpsDevices, staff, auditLogs, settings] = await Promise.all([
    prisma.transportRoute.findMany({
      where: { institutionId, isArchived: false },
      include: { stops: { orderBy: { sequenceOrder: 'asc' } } },
      orderBy: { routeCode: 'asc' },
    }),
    prisma.transportVehicle.findMany({
      where: { institutionId, isArchived: false },
      include: { gpsDevice: true },
      orderBy: { vehicleNumber: 'asc' },
    }),
    prisma.transportGpsDevice.findMany({ where: { institutionId }, orderBy: { deviceId: 'asc' } }),
    prisma.transportStaffMember.findMany({
      where: { institutionId, isActive: true },
      include: { assignedRoute: true, assignedVehicle: true },
      orderBy: { name: 'asc' },
    }),
    prisma.transportMasterAuditLog.findMany({
      where: { institutionId }, orderBy: { createdAt: 'desc' }, take: 30,
    }),
    prisma.transportMasterSettings.findUnique({ where: { institutionId } }),
  ]);

  const yearRoutes = routes.filter((r) => r.academicYear === academicYear || !academicYear);
  const gpsOnline = gpsDevices.filter((g) => g.connectivityStatus === 'ONLINE').length;
  const onTrip = vehicles.filter((v) => v.availabilityStatus === 'ON_TRIP').length;
  const inMaintenance = vehicles.filter((v) => v.availabilityStatus === 'MAINTENANCE').length;
  const avgOccupancy = yearRoutes.length > 0
    ? Math.round(yearRoutes.reduce((s, r) => s + r.occupancyPct, 0) / yearRoutes.length) : 0;

  const allStops = routes.flatMap((r) => r.stops.map((s) => ({
    ...s, routeCode: r.routeCode, routeName: r.routeName,
  })));

  return {
    academicYear,
    academicYears: ['2023-24', '2024-25', '2025-26', '2026-27'],
    routeTypes: ROUTE_TYPES,
    routeStatuses: ROUTE_STATUSES,
    vehicleTypes: VEHICLE_TYPES,
    availabilityStatuses: AVAILABILITY_STATUSES,
    gpsVendors: GPS_VENDORS,
    stopTypes: STOP_TYPES,
    staffRoles: STAFF_ROLES,
    kpis: {
      totalRoutes: yearRoutes.filter((r) => r.status === 'ACTIVE').length,
      activeVehicles: vehicles.filter((v) => v.isActive && v.availabilityStatus !== 'MAINTENANCE').length,
      gpsOnline,
      gpsTotal: gpsDevices.length,
      routesRunning: onTrip,
      vehiclesInMaintenance: inMaintenance,
      routeOccupancy: avgOccupancy,
    },
    routes: yearRoutes.map(serializeRoute),
    vehicles: vehicles.map(serializeVehicle),
    gpsDevices: gpsDevices.map((g) => {
      const linked = vehicles.find((v) => v.gpsDeviceId === g.id);
      return {
        id: g.id, deviceId: g.deviceId, simNumber: g.simNumber, imei: g.imei,
        vendor: g.vendor, connectivityStatus: g.connectivityStatus, batteryLevel: g.batteryLevel,
        liveTrackingEnabled: g.liveTrackingEnabled, status: g.status,
        linkedVehicleId: linked?.id ?? '',
        linkedVehicle: linked?.vehicleNumber ?? '—',
        linkedRoute: linked?.routeName ?? '—',
        linkedRouteCode: linked?.routeCode ?? '—',
      };
    }),
    staff: staff.map((s) => ({
      id: s.id, employeeCode: s.employeeCode, name: s.name, role: s.role, mobile: s.mobile,
      email: s.email, onDuty: s.onDuty, staffStatus: s.staffStatus,
      assignedRouteId: s.assignedRouteId ?? '',
      assignedVehicleId: s.assignedVehicleId ?? '',
      routeCode: s.assignedRoute?.routeCode ?? '',
      routeName: s.assignedRoute?.routeName ?? '',
      vehicleNumber: s.assignedVehicle?.vehicleNumber ?? '',
      licenseNumber: s.licenseNumber,
    })),
    stops: allStops.map((s) => ({
      id: s.id, routeId: s.routeId, routeCode: s.routeCode, routeName: s.routeName,
      stopType: s.stopType, stopName: s.stopName, sequenceOrder: s.sequenceOrder,
      latitude: s.latitude, longitude: s.longitude, landmark: s.landmark,
      estimatedArrival: s.estimatedArrival,
    })),
    auditLogs: auditLogs.map((a) => ({
      id: a.id, entityType: a.entityType, entityLabel: a.entityLabel, action: a.action,
      performedBy: a.performedBy, reason: a.reason, createdAt: a.createdAt.toISOString(),
    })),
    settings: {
      routeCodePrefix: settings?.routeCodePrefix ?? 'R',
      autoRouteCode: settings?.autoRouteCode ?? true,
      roleMatrix: parseJson(settings?.roleMatrix, []),
      notificationRules: parseJson(settings?.notificationRules, {}),
      mobileSyncRules: parseJson(settings?.mobileSyncRules, {}),
    },
    reports: [
      'Route Register', 'Vehicle Register', 'Route Mapping Report', 'Vehicle Utilization Report',
      'GPS Device Report', 'Vehicle Document Expiry Report', 'Route Change Log', 'Fleet Summary Report',
    ],
    mobileSync: [
      'Instant sync to Parent App — route, vehicle, driver, ETA, alerts',
      'Staff App — duty assignment, trip control, mobile GPS, breakdown reporting',
      'Principal App — fleet monitor, delays, emergencies, utilization analytics',
    ],
  };
}

export async function createTransportRoute(institutionId: string, body: Record<string, unknown>) {
  const routeCode = body.routeCode ? String(body.routeCode) : await nextRouteCode(institutionId);
  const estimated = Number(body.estimatedMinutes ?? 45);
  const row = await prisma.transportRoute.create({
    data: {
      institutionId,
      routeCode,
      routeName: String(body.routeName),
      description: String(body.description ?? ''),
      routeType: String(body.routeType ?? 'Two-way'),
      branch: String(body.branch ?? 'Main Campus'),
      academicYear: String(body.academicYear ?? '2025-26'),
      distanceKm: Number(body.distanceKm ?? 12),
      estimatedMinutes: estimated,
      durationMinutes: estimated,
      routeColor: String(body.routeColor ?? '#3b82f6'),
      status: 'ACTIVE',
    },
    include: { stops: true },
  });
  await audit(institutionId, 'ROUTE', row.id, row.routeName, 'Created route');
  return row;
}

export async function cloneTransportRoute(institutionId: string, routeId: string) {
  const src = await prisma.transportRoute.findFirst({
    where: { id: routeId, institutionId },
    include: { stops: true },
  });
  if (!src) throw new Error('Route not found');
  const routeCode = await nextRouteCode(institutionId);
  const clone = await prisma.transportRoute.create({
    data: {
      institutionId, routeCode,
      routeName: `${src.routeName} (Copy)`,
      description: src.description, routeType: src.routeType, branch: src.branch,
      academicYear: src.academicYear, distanceKm: src.distanceKm,
      estimatedMinutes: src.estimatedMinutes, durationMinutes: src.durationMinutes,
      routeColor: src.routeColor, status: 'INACTIVE', clonedFromId: src.id,
      versionLabel: 'Alternate', stopCount: src.stopCount, studentCount: 0,
    },
  });
  for (const stop of src.stops) {
    await prisma.transportRouteStop.create({
      data: {
        institutionId, routeId: clone.id, stopType: stop.stopType, stopName: stop.stopName,
        sequenceOrder: stop.sequenceOrder, latitude: stop.latitude, longitude: stop.longitude,
        landmark: stop.landmark, estimatedArrival: stop.estimatedArrival,
      },
    });
  }
  await audit(institutionId, 'ROUTE', clone.id, clone.routeName, 'Cloned route', src.routeCode, routeCode);
  return clone;
}

export async function archiveTransportRoute(institutionId: string, routeId: string) {
  await prisma.transportRoute.update({
    where: { id: routeId },
    data: { isArchived: true, isActive: false, status: 'INACTIVE' },
  });
  await audit(institutionId, 'ROUTE', routeId, routeId, 'Archived route');
}

export async function createTransportVehicle(institutionId: string, body: Record<string, unknown>) {
  const count = await prisma.transportVehicle.count({ where: { institutionId } });
  const recordId = `VEH-${String(count + 1).padStart(3, '0')}`;
  const row = await prisma.transportVehicle.create({
    data: {
      institutionId,
      recordId,
      vehicleNumber: String(body.vehicleNumber ?? `Bus ${String(count + 1).padStart(2, '0')}`),
      registrationNumber: String(body.registrationNumber ?? `RJ-14-AB-${1000 + count}`),
      vehicleType: String(body.vehicleType ?? 'Bus'),
      capacity: Number(body.capacity ?? 40),
      make: String(body.make ?? 'Tata'),
      model: String(body.model ?? 'Starbus'),
      routeName: String(body.routeName ?? ''),
      routeCode: String(body.routeCode ?? ''),
      driverName: String(body.driverName ?? ''),
      driverMobile: String(body.driverMobile ?? ''),
    },
    include: { gpsDevice: true },
  });
  await audit(institutionId, 'VEHICLE', row.id, row.vehicleNumber, 'Created vehicle');
  return row;
}

export async function assignVehicleRoute(institutionId: string, vehicleId: string, routeId: string) {
  const route = await prisma.transportRoute.findFirst({ where: { id: routeId, institutionId } });
  if (!route) throw new Error('Route not found');
  const vehicle = await prisma.transportVehicle.update({
    where: { id: vehicleId },
    data: {
      routeCode: route.routeCode, routeName: route.routeName,
      assignedRouteIds: [routeId],
    },
    include: { gpsDevice: true },
  });
  await audit(institutionId, 'VEHICLE', vehicleId, vehicle.vehicleNumber, 'Assigned route', '', route.routeName);
  return vehicle;
}

export async function toggleLiveTracking(institutionId: string, vehicleId: string, enabled: boolean) {
  return prisma.transportVehicle.update({
    where: { id: vehicleId },
    data: { liveTrackingEnabled: enabled },
  });
}

export async function createGpsDevice(institutionId: string, body: Record<string, unknown>) {
  const count = await prisma.transportGpsDevice.count({ where: { institutionId } });
  const deviceId = body.deviceId ? String(body.deviceId) : `GPS-${1000 + count}`;
  const row = await prisma.transportGpsDevice.create({
    data: {
      institutionId, deviceId,
      simNumber: String(body.simNumber ?? ''),
      imei: String(body.imei ?? ''),
      vendor: String(body.vendor ?? 'TrackPro'),
      connectivityStatus: 'ONLINE',
      batteryLevel: 100,
      liveTrackingEnabled: true,
      status: 'ACTIVE',
    },
  });
  await audit(institutionId, 'GPS', row.id, deviceId, 'Created GPS device');
  return row;
}

export async function updateGpsDevice(institutionId: string, id: string, body: Record<string, unknown>) {
  const row = await prisma.transportGpsDevice.update({
    where: { id },
    data: {
      simNumber: body.simNumber !== undefined ? String(body.simNumber) : undefined,
      imei: body.imei !== undefined ? String(body.imei) : undefined,
      vendor: body.vendor !== undefined ? String(body.vendor) : undefined,
      connectivityStatus: body.connectivityStatus !== undefined ? String(body.connectivityStatus) : undefined,
      status: body.status !== undefined ? String(body.status) : undefined,
    },
  });
  await audit(institutionId, 'GPS', id, row.deviceId, 'Updated GPS device');
  return row;
}

export async function linkGpsToVehicle(institutionId: string, gpsDeviceId: string, vehicleId: string) {
  const device = await prisma.transportGpsDevice.findFirst({ where: { id: gpsDeviceId, institutionId } });
  const vehicle = await prisma.transportVehicle.findFirst({ where: { id: vehicleId, institutionId } });
  if (!device || !vehicle) throw new Error('GPS device or vehicle not found');

  await prisma.transportVehicle.updateMany({
    where: { institutionId, gpsDeviceId },
    data: { gpsDeviceId: null },
  });
  await prisma.transportVehicle.update({
    where: { id: vehicleId },
    data: { gpsDeviceId, liveTrackingEnabled: true },
  });
  await audit(institutionId, 'GPS', gpsDeviceId, device.deviceId, 'Mapped to vehicle', '', vehicle.vehicleNumber);
  return device;
}

export async function toggleGpsDeviceTracking(institutionId: string, id: string, enabled: boolean) {
  const row = await prisma.transportGpsDevice.update({
    where: { id },
    data: { liveTrackingEnabled: enabled },
  });
  await audit(institutionId, 'GPS', id, row.deviceId, enabled ? 'Live tracking enabled' : 'Live tracking paused');
  return row;
}

export async function addRouteStop(institutionId: string, routeId: string, body: Record<string, unknown>) {
  const route = await prisma.transportRoute.findFirst({ where: { id: routeId, institutionId } });
  if (!route) throw new Error('Route not found');

  const maxSeq = await prisma.transportRouteStop.aggregate({
    where: { routeId },
    _max: { sequenceOrder: true },
  });
  const sequenceOrder = body.sequenceOrder !== undefined
    ? Number(body.sequenceOrder)
    : (maxSeq._max.sequenceOrder ?? 0) + 1;

  const row = await prisma.transportRouteStop.create({
    data: {
      institutionId, routeId,
      stopType: String(body.stopType ?? 'PICKUP'),
      stopName: String(body.stopName),
      sequenceOrder,
      latitude: Number(body.latitude ?? 26.9124),
      longitude: Number(body.longitude ?? 75.7873),
      landmark: String(body.landmark ?? ''),
      estimatedArrival: String(body.estimatedArrival ?? ''),
    },
  });
  await refreshRouteStopCount(routeId);
  await audit(institutionId, 'STOP', row.id, row.stopName, 'Added route stop', '', route.routeName);
  return row;
}

export async function updateRouteStop(institutionId: string, stopId: string, body: Record<string, unknown>) {
  const existing = await prisma.transportRouteStop.findFirst({ where: { id: stopId, institutionId } });
  if (!existing) throw new Error('Stop not found');

  const row = await prisma.transportRouteStop.update({
    where: { id: stopId },
    data: {
      stopType: body.stopType !== undefined ? String(body.stopType) : undefined,
      stopName: body.stopName !== undefined ? String(body.stopName) : undefined,
      sequenceOrder: body.sequenceOrder !== undefined ? Number(body.sequenceOrder) : undefined,
      latitude: body.latitude !== undefined ? Number(body.latitude) : undefined,
      longitude: body.longitude !== undefined ? Number(body.longitude) : undefined,
      landmark: body.landmark !== undefined ? String(body.landmark) : undefined,
      estimatedArrival: body.estimatedArrival !== undefined ? String(body.estimatedArrival) : undefined,
    },
  });
  await audit(institutionId, 'STOP', stopId, row.stopName, 'Updated route stop');
  return row;
}

export async function deleteRouteStop(institutionId: string, stopId: string) {
  const existing = await prisma.transportRouteStop.findFirst({ where: { id: stopId, institutionId } });
  if (!existing) throw new Error('Stop not found');
  await prisma.transportRouteStop.delete({ where: { id: stopId } });
  await refreshRouteStopCount(existing.routeId);
  await audit(institutionId, 'STOP', stopId, existing.stopName, 'Deleted route stop');
}

export async function createMasterStaff(institutionId: string, body: Record<string, unknown>) {
  const role = String(body.role ?? 'Driver');
  const employeeCode = await nextStaffCode(institutionId, role);
  const row = await prisma.transportStaffMember.create({
    data: {
      institutionId, employeeCode,
      name: String(body.name),
      role,
      mobile: String(body.mobile ?? ''),
      email: String(body.email ?? ''),
      employmentType: String(body.employmentType ?? 'Permanent'),
      licenseNumber: String(body.licenseNumber ?? ''),
      licenseCategory: String(body.licenseCategory ?? ''),
      yearsExperience: Number(body.yearsExperience ?? 0),
      workflowStage: 'ACTIVE',
      staffStatus: 'ACTIVE',
    },
  });
  await audit(institutionId, 'STAFF', row.id, row.name, `Registered ${role}`);
  return row;
}

export async function updateMasterStaff(institutionId: string, id: string, body: Record<string, unknown>) {
  const row = await prisma.transportStaffMember.update({
    where: { id },
    data: {
      name: body.name !== undefined ? String(body.name) : undefined,
      mobile: body.mobile !== undefined ? String(body.mobile) : undefined,
      email: body.email !== undefined ? String(body.email) : undefined,
      role: body.role !== undefined ? String(body.role) : undefined,
      licenseNumber: body.licenseNumber !== undefined ? String(body.licenseNumber) : undefined,
      licenseCategory: body.licenseCategory !== undefined ? String(body.licenseCategory) : undefined,
      onDuty: body.onDuty !== undefined ? Boolean(body.onDuty) : undefined,
      yearsExperience: body.yearsExperience !== undefined ? Number(body.yearsExperience) : undefined,
    },
  });
  await audit(institutionId, 'STAFF', id, row.name, 'Updated staff');
  return row;
}

export async function deleteMasterStaff(institutionId: string, id: string) {
  const row = await prisma.transportStaffMember.update({
    where: { id },
    data: { isActive: false, onDuty: false, staffStatus: 'TERMINATED' },
  });
  await audit(institutionId, 'STAFF', id, row.name, 'Removed staff');
  return row;
}

export async function assignMasterStaffToVehicle(institutionId: string, staffId: string, body: Record<string, unknown>) {
  const staff = await prisma.transportStaffMember.findFirst({
    where: { id: staffId, institutionId },
    include: { assignedVehicle: true },
  });
  if (!staff) throw new Error('Staff not found');

  const vehicleId = String(body.vehicleId ?? '');
  const routeId = body.routeId ? String(body.routeId) : undefined;
  const vehicle = vehicleId
    ? await prisma.transportVehicle.findFirst({ where: { id: vehicleId, institutionId } })
    : null;

  let resolvedRouteId = routeId ?? staff.assignedRouteId ?? null;
  if (!resolvedRouteId && vehicle?.routeCode) {
    const route = await prisma.transportRoute.findFirst({
      where: { institutionId, routeCode: vehicle.routeCode },
    });
    resolvedRouteId = route?.id ?? null;
  }

  await prisma.transportStaffMember.update({
    where: { id: staffId },
    data: {
      assignedVehicleId: vehicleId || null,
      assignedRouteId: resolvedRouteId,
      workflowStage: 'ROUTE_ASSIGNMENT',
      onDuty: true,
    },
  });

  if (vehicle) {
    const vehicleData: Record<string, string> = {};
    if (staff.role === 'Driver') {
      vehicleData.driverName = staff.name;
      vehicleData.driverMobile = staff.mobile;
    } else if (staff.role === 'Attendant') {
      vehicleData.attendantName = staff.name;
    }
    if (Object.keys(vehicleData).length > 0) {
      await prisma.transportVehicle.update({ where: { id: vehicleId }, data: vehicleData });
    }
  }

  await audit(institutionId, 'STAFF', staffId, staff.name, 'Assigned to vehicle', '', vehicle?.vehicleNumber ?? '');
  return staff;
}

export async function seedTransportMaster(institutionId: string) {
  await seedTransportDashboard(institutionId);
  await ensureSettings(institutionId);

  const routes = await prisma.transportRoute.findMany({ where: { institutionId } });
  const colors = ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#64748b'];
  const types = ['Two-way', 'Morning', 'Evening', 'Two-way', 'One-way', 'Two-way', 'Morning', 'Evening'];

  for (let i = 0; i < routes.length; i++) {
    const r = routes[i];
    const estimated = 30 + (r.stopCount * 3);
    await prisma.transportRoute.update({
      where: { id: r.id },
      data: {
        description: `School transport route covering ${r.routeName}`,
        routeType: types[i % types.length],
        branch: 'Main Campus',
        academicYear: '2025-26',
        distanceKm: 8 + i * 1.5,
        estimatedMinutes: estimated,
        durationMinutes: estimated,
        routeColor: colors[i % colors.length],
        status: 'ACTIVE',
        occupancyPct: Math.min(95, 60 + i * 4),
      },
    });

    const existingStops = await prisma.transportRouteStop.count({ where: { routeId: r.id } });
    if (existingStops === 0) {
      for (let s = 1; s <= Math.max(3, Math.min(r.stopCount, 6)); s++) {
        await prisma.transportRouteStop.create({
          data: {
            institutionId, routeId: r.id,
            stopType: s <= 3 ? 'PICKUP' : 'DROP',
            stopName: `Stop ${s} — ${r.routeName.split(' - ')[1] ?? 'Area'}`,
            sequenceOrder: s,
            latitude: 26.9 + (i * 0.01) + (s * 0.002),
            longitude: 75.7 + (i * 0.01) + (s * 0.002),
            landmark: `Near Landmark ${s}`,
            estimatedArrival: `${6 + Math.floor(s / 2)}:${String((s * 7) % 60).padStart(2, '0')} AM`,
          },
        });
      }
    }
  }

  const gpsVendors = ['TrackPro', 'FleetSync', 'GeoTrack', 'SafeRide'];
  for (let i = 0; i < 12; i++) {
    const deviceId = `GPS-${String(1000 + i)}`;
    const exists = await prisma.transportGpsDevice.findFirst({ where: { institutionId, deviceId } });
    if (!exists) {
      await prisma.transportGpsDevice.create({
        data: {
          institutionId, deviceId,
          simNumber: `98${String(7000000000 + i).slice(0, 10)}`,
          imei: `359${String(100000000000 + i)}`,
          vendor: gpsVendors[i % gpsVendors.length],
          connectivityStatus: i < 10 ? 'ONLINE' : i === 10 ? 'OFFLINE' : 'LOW_BATTERY',
          batteryLevel: i === 11 ? 15 : 70 + (i % 30),
        },
      });
    }
  }

  const devices = await prisma.transportGpsDevice.findMany({ where: { institutionId }, take: 20 });
  const vehicles = await prisma.transportVehicle.findMany({ where: { institutionId }, take: 20 });
  for (let i = 0; i < vehicles.length && i < devices.length; i++) {
    await prisma.transportVehicle.update({
      where: { id: vehicles[i].id },
      data: {
        gpsDeviceId: devices[i].id,
        registrationNumber: vehicles[i].registrationNumber || `RJ-14-${String(1000 + i)}`,
        vehicleType: i < 18 ? 'Bus' : i === 18 ? 'Van' : 'Mini Bus',
        capacity: i < 18 ? 40 : 20,
        vehicleCategory: i % 3 === 0 ? 'AC Owned' : 'Non-AC Owned',
        make: ['Tata', 'Ashok Leyland', 'Eicher'][i % 3],
        model: ['Starbus', 'Viking', 'Skyline'][i % 3],
        compliance: {
          insurance: { policy: `INS-${2000 + i}`, insurer: 'ICICI Lombard', validTill: '2026-12-31' },
          fitness: { validTill: '2026-06-30' },
          pollution: { validTill: '2026-03-31' },
          permit: { type: 'State', validTill: '2027-01-15' },
        },
        documents: ['RC', 'Insurance', 'Fitness', 'PUC', 'Permit'],
        availabilityStatus: vehicles[i].operationalStatus === 'ON_TRIP' ? 'ON_TRIP'
          : vehicles[i].operationalStatus === 'MAINTENANCE' ? 'MAINTENANCE' : 'AVAILABLE',
      },
    });
  }

  await audit(institutionId, 'SYSTEM', institutionId, 'Transport Master', 'Demo data seeded');
  return getTransportMaster(institutionId);
}
