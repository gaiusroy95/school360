import { prisma } from './prisma.js';
import type { Prisma } from '@prisma/client';
import { seedTransportTripManagement } from './transportTripManagement.js';

export const STOP_TYPES = ['PICKUP', 'DROP', 'BOTH', 'SCHOOL', 'CHECKPOINT', 'WAYPOINT'];
export const STOP_STATUSES = ['ACTIVE', 'INACTIVE', 'PENDING_VALIDATION'];
export const GEO_SOURCES = ['MANUAL', 'EXCEL', 'GOOGLE_MAPS'];
export const GEOFENCE_TYPES = ['STOP', 'SCHOOL', 'DEPOT', 'CHECKPOINT', 'HAZARD', 'RESTRICTED'];
export const GEOFENCE_SHAPES = ['CIRCLE', 'POLYGON'];

const REPORT_CATALOG = [
  'Stop Registry Report', 'Geo-Tagged Stops Report', 'Unvalidated Stops Report',
  'Route Stop Mapping Report', 'Geofence Coverage Report', 'Excel Import Log Report',
  'Google Maps Import Report', 'Stop Utilization Report', 'Missed Geofence Report',
  'Geofence Alert Report', 'Stop Distance Matrix Report', 'Branch Stop Summary',
];

const WORKFLOW = [
  'Create / Import Stops', 'Geo Tag Mapping', 'Validate Coordinates', 'Assign to Route',
  'Configure Geofence', 'Link to Live Tracking', 'Monitor Alerts', 'Reports & Analytics',
];

function latLngToMapPct(lat: number, lng: number, baseLat = 26.9124, baseLng = 75.7873) {
  const topPct = Math.max(5, Math.min(95, 50 - (lat - baseLat) * 8000));
  const leftPct = Math.max(5, Math.min(95, 50 + (lng - baseLng) * 8000));
  return { topPct, leftPct };
}

function isValidCoord(lat: number, lng: number) {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 && !(lat === 0 && lng === 0);
}

function parseGoogleMapsCoords(input: string): { lat: number; lng: number; url: string } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const atMatch = trimmed.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (atMatch) {
    return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]), url: trimmed };
  }

  const qMatch = trimmed.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (qMatch) {
    return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]), url: trimmed };
  }

  const pairMatch = trimmed.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
  if (pairMatch) {
    return { lat: parseFloat(pairMatch[1]), lng: parseFloat(pairMatch[2]), url: '' };
  }

  return null;
}

async function ensureSettings(institutionId: string) {
  let row = await prisma.transportStopsGeoSettings.findUnique({ where: { institutionId } });
  if (!row) {
    row = await prisma.transportStopsGeoSettings.create({
      data: {
        institutionId,
        defaultRadiusM: 150,
        mapCenterLat: 26.9124,
        mapCenterLng: 75.7873,
        mapZoom: 13,
        roleMatrix: [
          { role: 'Admin', permissions: 'Full stop registry, geofencing, Excel/Google import, settings' },
          { role: 'Transport Manager', permissions: 'Create/edit stops, import, geofence config, route mapping' },
          { role: 'Principal', permissions: 'View stops map, geofence coverage, safety zones' },
          { role: 'Driver', permissions: 'View assigned stop sequence on mobile app' },
        ],
        importRules: {
          excelColumns: ['Stop Code', 'Stop Name', 'Stop Type', 'Latitude', 'Longitude', 'Landmark', 'Address', 'City', 'Pincode', 'Route Code', 'Sequence', 'Geofence Radius (m)', 'Notes'],
          googleMapsFormats: ['Google Maps URL (@lat,lng)', 'lat,lng pairs', 'Place name with coordinates'],
          validation: ['Latitude -90 to 90', 'Longitude -180 to 180', 'Duplicate stop codes rejected', 'Auto-geofence on import optional'],
        },
        mobileSyncRules: {
          parentApp: ['View stop on map', 'ETA to stop', 'Boarding/drop geofence alerts'],
          driverApp: ['Stop sequence', 'Navigate to stop', 'Geofence arrival confirmation'],
          staffApp: ['Verify boarding at geofenced stop', 'Record absent at stop'],
          transportManagerApp: ['Edit stop geo tags', 'Monitor geofence breaches', 'Import stops'],
        },
        reportCatalog: REPORT_CATALOG,
      },
    });
  }
  return row;
}

async function audit(institutionId: string, entityType: string, action: string, details = '', entityId = '') {
  await prisma.transportStopsGeoAuditLog.create({
    data: { institutionId, entityType, entityId, action, details, performedBy: 'Transport Manager' },
  });
}

async function nextStopCode(institutionId: string): Promise<string> {
  const count = await prisma.transportStopMaster.count({ where: { institutionId } });
  return `STP-${String(count + 1).padStart(4, '0')}`;
}

function serializeStop(s: {
  id: string; stopCode: string; stopName: string; stopType: string;
  latitude: number; longitude: number; landmark: string; address: string;
  city: string; pincode: string; branch: string; academicYear: string;
  routeId: string | null; sequenceOrder: number | null;
  geoTagSource: string; geoValidated: boolean; geofenceRadiusMeters: number;
  studentCount: number; status: string; googlePlaceId: string; googleMapsUrl: string;
  notes: string; importBatchId: string; isActive: boolean;
  route?: { routeCode: string; routeName: string } | null;
  geofences?: Array<{ id: string; name: string; fenceType: string; radiusMeters: number; isActive: boolean }>;
}, mapCenter = { lat: 26.9124, lng: 75.7873 }) {
  const mapPos = latLngToMapPct(s.latitude, s.longitude, mapCenter.lat, mapCenter.lng);
  return {
    id: s.id, stopCode: s.stopCode, stopName: s.stopName, stopType: s.stopType,
    latitude: s.latitude, longitude: s.longitude,
    landmark: s.landmark, address: s.address, city: s.city, pincode: s.pincode,
    branch: s.branch, academicYear: s.academicYear,
    routeId: s.routeId, routeCode: s.route?.routeCode ?? '', routeName: s.route?.routeName ?? '',
    sequenceOrder: s.sequenceOrder,
    geoTagSource: s.geoTagSource, geoValidated: s.geoValidated,
    geofenceRadiusMeters: s.geofenceRadiusMeters, studentCount: s.studentCount,
    status: s.status, googlePlaceId: s.googlePlaceId, googleMapsUrl: s.googleMapsUrl,
    notes: s.notes, importBatchId: s.importBatchId, isActive: s.isActive,
    hasGeofence: (s.geofences ?? []).some((g) => g.isActive),
    geofenceCount: (s.geofences ?? []).filter((g) => g.isActive).length,
    ...mapPos,
    coordLabel: `${s.latitude.toFixed(5)}, ${s.longitude.toFixed(5)}`,
  };
}

function serializeGeofence(g: {
  id: string; name: string; fenceType: string; geofenceShape: string;
  latitude: number; longitude: number; radiusMeters: number;
  branch: string; description: string; alertOnEnter: boolean; alertOnExit: boolean;
  isActive: boolean; stopMasterId: string | null;
  stopMaster?: { stopCode: string; stopName: string } | null;
}, mapCenter = { lat: 26.9124, lng: 75.7873 }) {
  return {
    id: g.id, name: g.name, fenceType: g.fenceType, geofenceShape: g.geofenceShape,
    latitude: g.latitude, longitude: g.longitude, radiusMeters: g.radiusMeters,
    branch: g.branch, description: g.description,
    alertOnEnter: g.alertOnEnter, alertOnExit: g.alertOnExit, isActive: g.isActive,
    stopMasterId: g.stopMasterId,
    stopCode: g.stopMaster?.stopCode ?? '', stopName: g.stopMaster?.stopName ?? '',
    ...latLngToMapPct(g.latitude, g.longitude, mapCenter.lat, mapCenter.lng),
  };
}

const stopInclude = {
  route: { select: { routeCode: true, routeName: true } },
  geofences: { where: { isActive: true }, select: { id: true, name: true, fenceType: true, radiusMeters: true, isActive: true } },
};

export async function getTransportStopsGeoFencing(institutionId: string, academicYear = '2025-26') {
  const settings = await ensureSettings(institutionId);
  const mapCenter = { lat: settings.mapCenterLat, lng: settings.mapCenterLng };

  const [stops, geofences, routes, importLogs, auditLogs] = await Promise.all([
    prisma.transportStopMaster.findMany({
      where: { institutionId, isActive: true, academicYear },
      include: stopInclude,
      orderBy: [{ routeId: 'asc' }, { sequenceOrder: 'asc' }, { stopName: 'asc' }],
    }),
    prisma.transportGeofence.findMany({
      where: { institutionId },
      include: { stopMaster: { select: { stopCode: true, stopName: true } } },
      orderBy: { name: 'asc' },
    }),
    prisma.transportRoute.findMany({
      where: { institutionId, isArchived: false, academicYear },
      select: { id: true, routeCode: true, routeName: true, stopCount: true, routeColor: true },
      orderBy: { routeCode: 'asc' },
    }),
    prisma.transportStopImportLog.findMany({
      where: { institutionId }, orderBy: { createdAt: 'desc' }, take: 15,
    }),
    prisma.transportStopsGeoAuditLog.findMany({
      where: { institutionId }, orderBy: { createdAt: 'desc' }, take: 25,
    }),
  ]);

  const serializedStops = stops.map((s) => serializeStop(s, mapCenter));
  const serializedGeofences = geofences.map((g) => serializeGeofence(g, mapCenter));
  const validated = serializedStops.filter((s) => s.geoValidated).length;
  const withGeofence = serializedStops.filter((s) => s.hasGeofence).length;
  const unmapped = serializedStops.filter((s) => !s.routeId).length;

  return {
    academicYear,
    academicYears: ['2024-25', '2025-26', '2026-27'],
    stopTypes: STOP_TYPES,
    stopStatuses: STOP_STATUSES,
    geoSources: GEO_SOURCES,
    geofenceTypes: GEOFENCE_TYPES,
    geofenceShapes: GEOFENCE_SHAPES,
    workflow: WORKFLOW,
    kpis: {
      totalStops: serializedStops.length,
      geoValidated: validated,
      pendingValidation: serializedStops.length - validated,
      withGeofence,
      withoutGeofence: serializedStops.length - withGeofence,
      totalGeofences: serializedGeofences.filter((g) => g.isActive).length,
      routeMapped: serializedStops.filter((s) => s.routeId).length,
      unmappedRoutes: unmapped,
      excelImports: importLogs.filter((l) => l.sourceType === 'EXCEL').length,
      googleImports: importLogs.filter((l) => l.sourceType === 'GOOGLE_MAPS').length,
    },
    stops: serializedStops,
    geofences: serializedGeofences,
    routes,
    importLogs: importLogs.map((l) => ({
      id: l.id, sourceType: l.sourceType, fileName: l.fileName,
      totalRows: l.totalRows, successCount: l.successCount, errorCount: l.errorCount,
      status: l.status, importedBy: l.importedBy,
      createdAt: l.createdAt.toISOString(),
      relativeTime: relativeTime(l.createdAt),
    })),
    auditLogs: auditLogs.map((a) => ({
      id: a.id, entityType: a.entityType, entityId: a.entityId,
      action: a.action, details: a.details, performedBy: a.performedBy,
      createdAt: a.createdAt.toISOString(),
      relativeTime: relativeTime(a.createdAt),
    })),
    map: {
      provider: 'OpenStreetMap / Google Maps',
      center: mapCenter,
      zoom: settings.mapZoom,
      stops: serializedStops.filter((s) => isValidCoord(s.latitude, s.longitude)),
      geofences: serializedGeofences.filter((g) => g.isActive),
      osmTileUrl: `https://www.openstreetmap.org/export/embed.html?bbox=${mapCenter.lng - 0.04}%2C${mapCenter.lat - 0.03}%2C${mapCenter.lng + 0.04}%2C${mapCenter.lat + 0.03}&layer=mapnik`,
      googleMapsSearchUrl: `https://www.google.com/maps/search/?api=1&query=${mapCenter.lat},${mapCenter.lng}`,
    },
    settings,
    reports: REPORT_CATALOG,
    excelTemplate: {
      columns: ['Stop Code', 'Stop Name', 'Stop Type', 'Latitude', 'Longitude', 'Landmark', 'Address', 'City', 'Pincode', 'Route Code', 'Sequence', 'Geofence Radius (m)', 'Notes'],
      sampleRow: ['STP-0001', 'City Center', 'PICKUP', '26.9124', '75.7873', 'Near Metro', 'Main Road', 'Jaipur', '302001', 'R01', '1', '150', 'Morning pickup point'],
    },
  };
}

function relativeTime(d: Date): string {
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  return hrs < 24 ? `${hrs} hr ago` : 'Yesterday';
}

export async function createStopMaster(institutionId: string, body: Record<string, unknown>) {
  await ensureSettings(institutionId);
  const stopCode = String(body.stopCode ?? '').trim() || await nextStopCode(institutionId);
  const lat = Number(body.latitude ?? 0);
  const lng = Number(body.longitude ?? 0);
  const validated = isValidCoord(lat, lng);

  const stop = await prisma.transportStopMaster.create({
    data: {
      institutionId,
      stopCode,
      stopName: String(body.stopName ?? 'New Stop'),
      stopType: String(body.stopType ?? 'PICKUP'),
      latitude: lat, longitude: lng,
      landmark: String(body.landmark ?? ''),
      address: String(body.address ?? ''),
      city: String(body.city ?? ''),
      pincode: String(body.pincode ?? ''),
      branch: String(body.branch ?? 'Main Campus'),
      academicYear: String(body.academicYear ?? '2025-26'),
      routeId: body.routeId ? String(body.routeId) : null,
      sequenceOrder: body.sequenceOrder != null ? Number(body.sequenceOrder) : null,
      geoTagSource: String(body.geoTagSource ?? 'MANUAL'),
      geoValidated: validated,
      geofenceRadiusMeters: Number(body.geofenceRadiusMeters ?? 150),
      studentCount: Number(body.studentCount ?? 0),
      status: validated ? 'ACTIVE' : 'PENDING_VALIDATION',
      googleMapsUrl: String(body.googleMapsUrl ?? ''),
      notes: String(body.notes ?? ''),
    },
    include: stopInclude,
  });

  if (body.createGeofence !== false && validated) {
    await prisma.transportGeofence.create({
      data: {
        institutionId,
        stopMasterId: stop.id,
        name: `${stop.stopName} Zone`,
        fenceType: 'STOP',
        latitude: lat, longitude: lng,
        radiusMeters: stop.geofenceRadiusMeters,
        branch: stop.branch,
        description: `Auto geofence for ${stop.stopCode}`,
      },
    });
  }

  await audit(institutionId, 'STOP', 'Created', `${stop.stopCode} — ${stop.stopName}`, stop.id);
  return stop;
}

export async function updateStopMaster(institutionId: string, stopId: string, body: Record<string, unknown>) {
  const lat = body.latitude != null ? Number(body.latitude) : undefined;
  const lng = body.longitude != null ? Number(body.longitude) : undefined;
  const validated = lat != null && lng != null ? isValidCoord(lat, lng) : undefined;

  const stop = await prisma.transportStopMaster.update({
    where: { id: stopId, institutionId },
    data: {
      stopName: body.stopName != null ? String(body.stopName) : undefined,
      stopType: body.stopType != null ? String(body.stopType) : undefined,
      latitude: lat, longitude: lng,
      landmark: body.landmark != null ? String(body.landmark) : undefined,
      address: body.address != null ? String(body.address) : undefined,
      city: body.city != null ? String(body.city) : undefined,
      pincode: body.pincode != null ? String(body.pincode) : undefined,
      routeId: body.routeId !== undefined ? (body.routeId ? String(body.routeId) : null) : undefined,
      sequenceOrder: body.sequenceOrder != null ? Number(body.sequenceOrder) : undefined,
      geoValidated: validated,
      status: validated === true ? 'ACTIVE' : validated === false ? 'PENDING_VALIDATION' : undefined,
      geofenceRadiusMeters: body.geofenceRadiusMeters != null ? Number(body.geofenceRadiusMeters) : undefined,
      googleMapsUrl: body.googleMapsUrl != null ? String(body.googleMapsUrl) : undefined,
      notes: body.notes != null ? String(body.notes) : undefined,
    },
    include: stopInclude,
  });

  await audit(institutionId, 'STOP', 'Updated', `${stop.stopCode}`, stop.id);
  return stop;
}

export async function validateStopGeo(institutionId: string, stopId: string) {
  const stop = await prisma.transportStopMaster.findFirst({ where: { id: stopId, institutionId } });
  if (!stop) throw new Error('Stop not found');
  if (!isValidCoord(stop.latitude, stop.longitude)) throw new Error('Invalid coordinates');

  await prisma.transportStopMaster.update({
    where: { id: stopId },
    data: { geoValidated: true, status: 'ACTIVE' },
  });
  await audit(institutionId, 'STOP', 'Geo Validated', stop.stopCode, stopId);
}

export async function linkStopToRoute(institutionId: string, stopId: string, routeId: string, sequenceOrder?: number) {
  const stop = await prisma.transportStopMaster.update({
    where: { id: stopId, institutionId },
    data: { routeId, sequenceOrder: sequenceOrder ?? undefined },
    include: stopInclude,
  });

  const routeStop = await prisma.transportRouteStop.findFirst({
    where: { routeId, stopName: stop.stopName },
  });
  if (!routeStop) {
    const maxSeq = await prisma.transportRouteStop.aggregate({
      where: { routeId }, _max: { sequenceOrder: true },
    });
    await prisma.transportRouteStop.create({
      data: {
        institutionId, routeId,
        stopName: stop.stopName,
        stopType: stop.stopType === 'DROP' ? 'DROP' : 'PICKUP',
        sequenceOrder: sequenceOrder ?? (maxSeq._max.sequenceOrder ?? 0) + 1,
        latitude: stop.latitude, longitude: stop.longitude,
        landmark: stop.landmark,
      },
    });
    await prisma.transportRoute.update({
      where: { id: routeId },
      data: { stopCount: { increment: 1 } },
    });
  }

  await audit(institutionId, 'STOP', 'Route Linked', `${stop.stopCode} → route`, stopId);
  return stop;
}

export async function createGeofence(institutionId: string, body: Record<string, unknown>) {
  const settings = await ensureSettings(institutionId);
  const geofence = await prisma.transportGeofence.create({
    data: {
      institutionId,
      stopMasterId: body.stopMasterId ? String(body.stopMasterId) : null,
      name: String(body.name ?? 'Geofence'),
      fenceType: String(body.fenceType ?? 'STOP'),
      geofenceShape: String(body.geofenceShape ?? 'CIRCLE'),
      latitude: Number(body.latitude ?? settings.mapCenterLat),
      longitude: Number(body.longitude ?? settings.mapCenterLng),
      radiusMeters: Number(body.radiusMeters ?? settings.defaultRadiusM),
      branch: String(body.branch ?? 'Main Campus'),
      description: String(body.description ?? ''),
      alertOnEnter: body.alertOnEnter !== false,
      alertOnExit: Boolean(body.alertOnExit),
      polygonPath: (body.polygonPath ?? []) as Prisma.InputJsonValue,
    },
    include: { stopMaster: { select: { stopCode: true, stopName: true } } },
  });
  await audit(institutionId, 'GEOFENCE', 'Created', geofence.name, geofence.id);
  return geofence;
}

export async function updateGeofence(institutionId: string, geofenceId: string, body: Record<string, unknown>) {
  const geofence = await prisma.transportGeofence.update({
    where: { id: geofenceId, institutionId },
    data: {
      name: body.name != null ? String(body.name) : undefined,
      fenceType: body.fenceType != null ? String(body.fenceType) : undefined,
      radiusMeters: body.radiusMeters != null ? Number(body.radiusMeters) : undefined,
      alertOnEnter: body.alertOnEnter != null ? Boolean(body.alertOnEnter) : undefined,
      alertOnExit: body.alertOnExit != null ? Boolean(body.alertOnExit) : undefined,
      isActive: body.isActive != null ? Boolean(body.isActive) : undefined,
      description: body.description != null ? String(body.description) : undefined,
    },
    include: { stopMaster: { select: { stopCode: true, stopName: true } } },
  });
  await audit(institutionId, 'GEOFENCE', 'Updated', geofence.name, geofenceId);
  return geofence;
}

type ImportRow = {
  stopCode?: string; stopName: string; stopType?: string;
  latitude: number; longitude: number; landmark?: string; address?: string;
  city?: string; pincode?: string; routeCode?: string; sequence?: number;
  geofenceRadiusMeters?: number; notes?: string; googleMapsUrl?: string;
};

export async function importStopsFromRows(
  institutionId: string,
  rows: ImportRow[],
  sourceType: 'EXCEL' | 'GOOGLE_MAPS',
  fileName = '',
) {
  await ensureSettings(institutionId);
  const batchId = `IMP-${Date.now()}`;
  const errors: string[] = [];
  let successCount = 0;

  const routes = await prisma.transportRoute.findMany({
    where: { institutionId, isArchived: false },
    select: { id: true, routeCode: true },
  });
  const routeByCode = new Map(routes.map((r) => [r.routeCode.toUpperCase(), r.id]));

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      if (!row.stopName?.trim()) throw new Error('Stop name required');
      if (!isValidCoord(row.latitude, row.longitude)) throw new Error('Invalid coordinates');

      let stopCode = row.stopCode?.trim() || await nextStopCode(institutionId);
      const existing = await prisma.transportStopMaster.findFirst({
        where: { institutionId, stopCode },
      });
      if (existing) stopCode = await nextStopCode(institutionId);

      const routeId = row.routeCode ? routeByCode.get(row.routeCode.toUpperCase()) ?? null : null;

      const stop = await prisma.transportStopMaster.create({
        data: {
          institutionId,
          stopCode,
          stopName: row.stopName.trim(),
          stopType: row.stopType?.toUpperCase() || 'PICKUP',
          latitude: row.latitude,
          longitude: row.longitude,
          landmark: row.landmark ?? '',
          address: row.address ?? '',
          city: row.city ?? '',
          pincode: row.pincode ?? '',
          routeId,
          sequenceOrder: row.sequence ?? null,
          geoTagSource: sourceType,
          geoValidated: true,
          geofenceRadiusMeters: row.geofenceRadiusMeters ?? 150,
          status: 'ACTIVE',
          googleMapsUrl: row.googleMapsUrl ?? '',
          notes: row.notes ?? '',
          importBatchId: batchId,
        },
      });

      await prisma.transportGeofence.create({
        data: {
          institutionId,
          stopMasterId: stop.id,
          name: `${stop.stopName} Zone`,
          fenceType: 'STOP',
          latitude: stop.latitude,
          longitude: stop.longitude,
          radiusMeters: stop.geofenceRadiusMeters,
          description: `Imported via ${sourceType}`,
        },
      });

      if (routeId) {
        const maxSeq = await prisma.transportRouteStop.aggregate({
          where: { routeId }, _max: { sequenceOrder: true },
        });
        await prisma.transportRouteStop.create({
          data: {
            institutionId, routeId,
            stopName: stop.stopName,
            stopType: stop.stopType === 'DROP' ? 'DROP' : 'PICKUP',
            sequenceOrder: row.sequence ?? (maxSeq._max.sequenceOrder ?? 0) + 1,
            latitude: stop.latitude, longitude: stop.longitude,
            landmark: stop.landmark,
          },
        });
        await prisma.transportRoute.update({
          where: { id: routeId },
          data: { stopCount: { increment: 1 } },
        });
      }

      successCount++;
    } catch (e) {
      errors.push(`Row ${i + 1} (${row.stopName || 'unnamed'}): ${e instanceof Error ? e.message : 'Failed'}`);
    }
  }

  const status = errors.length === 0 ? 'COMPLETED' : successCount > 0 ? 'PARTIAL' : 'FAILED';
  await prisma.transportStopImportLog.create({
    data: {
      institutionId,
      sourceType,
      fileName: fileName || `${sourceType} import`,
      totalRows: rows.length,
      successCount,
      errorCount: errors.length,
      status,
      errors: errors as Prisma.InputJsonValue,
    },
  });

  await audit(institutionId, 'IMPORT', sourceType, `${successCount}/${rows.length} stops imported`, batchId);
  return { successCount, errorCount: errors.length, errors, status };
}

export async function importFromGoogleMapsPaste(institutionId: string, lines: string[], fileName = 'Google Maps paste') {
  const rows: ImportRow[] = [];
  const errors: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split('|').map((p) => p.trim());
    const coordInput = parts.length > 1 ? parts[1] : parts[0];
    const name = parts.length > 1 ? parts[0] : `Stop ${rows.length + 1}`;

    const parsed = parseGoogleMapsCoords(coordInput);
    if (!parsed) {
      errors.push(`Line ${i + 1}: Could not parse coordinates from "${line}"`);
      continue;
    }

    rows.push({
      stopName: name,
      latitude: parsed.lat,
      longitude: parsed.lng,
      googleMapsUrl: parsed.url,
      geoTagSource: 'GOOGLE_MAPS',
    } as ImportRow);
  }

  if (rows.length === 0) {
    return { successCount: 0, errorCount: errors.length || 1, errors: errors.length ? errors : ['No valid lines found'], status: 'FAILED' };
  }

  const result = await importStopsFromRows(institutionId, rows, 'GOOGLE_MAPS', fileName);
  return { ...result, errors: [...errors, ...result.errors] };
}

export async function seedTransportStopsGeoFencing(institutionId: string) {
  await seedTransportTripManagement(institutionId);
  await ensureSettings(institutionId);

  const existing = await prisma.transportStopMaster.count({ where: { institutionId } });
  if (existing >= 12) return getTransportStopsGeoFencing(institutionId);

  const routes = await prisma.transportRoute.findMany({
    where: { institutionId, isArchived: false },
    include: { stops: { orderBy: { sequenceOrder: 'asc' } } },
    take: 6,
  });

  const baseLat = 26.9124;
  const baseLng = 75.7873;
  let seq = 0;

  for (const route of routes) {
    for (const rs of route.stops) {
      seq++;
      const stopCode = `STP-${String(seq).padStart(4, '0')}`;
      const exists = await prisma.transportStopMaster.findFirst({
        where: { institutionId, stopCode },
      });
      if (exists) continue;

      const lat = rs.latitude || baseLat + (seq * 0.002);
      const lng = rs.longitude || baseLng + (seq * 0.003);

      const stop = await prisma.transportStopMaster.create({
        data: {
          institutionId,
          stopCode,
          stopName: rs.stopName,
          stopType: rs.stopType,
          latitude: lat,
          longitude: lng,
          landmark: rs.landmark || `Near ${rs.stopName}`,
          address: `${rs.stopName}, Jaipur`,
          city: 'Jaipur',
          pincode: '302001',
          branch: route.branch,
          academicYear: route.academicYear,
          routeId: route.id,
          sequenceOrder: rs.sequenceOrder,
          geoTagSource: seq % 3 === 0 ? 'EXCEL' : seq % 3 === 1 ? 'GOOGLE_MAPS' : 'MANUAL',
          geoValidated: seq % 5 !== 0,
          geofenceRadiusMeters: 120 + (seq % 4) * 30,
          studentCount: 5 + (seq % 8) * 3,
          status: seq % 5 === 0 ? 'PENDING_VALIDATION' : 'ACTIVE',
          googleMapsUrl: `https://www.google.com/maps?q=${lat},${lng}`,
          notes: seq % 4 === 0 ? 'High traffic during morning peak' : '',
        },
      });

      const gfExists = await prisma.transportGeofence.findFirst({
        where: { institutionId, stopMasterId: stop.id },
      });
      if (!gfExists) {
        await prisma.transportGeofence.create({
          data: {
            institutionId,
            stopMasterId: stop.id,
            name: `${stop.stopName} Zone`,
            fenceType: rs.stopType === 'DROP' ? 'CHECKPOINT' : 'STOP',
            latitude: lat,
            longitude: lng,
            radiusMeters: stop.geofenceRadiusMeters,
            branch: route.branch,
            description: `Geofence for ${route.routeCode}`,
            alertOnEnter: true,
            alertOnExit: rs.stopType === 'DROP',
          },
        });
      }
    }
  }

  const schoolGf = await prisma.transportGeofence.findFirst({
    where: { institutionId, fenceType: 'SCHOOL' },
  });
  if (!schoolGf) {
    await prisma.transportGeofence.create({
      data: {
        institutionId,
        name: 'Main Campus School Zone',
        fenceType: 'SCHOOL',
        geofenceShape: 'CIRCLE',
        latitude: baseLat,
        longitude: baseLng,
        radiusMeters: 300,
        branch: 'Main Campus',
        description: 'School arrival/departure geofence',
        alertOnEnter: true,
        alertOnExit: true,
      },
    });
  }

  const depotGf = await prisma.transportGeofence.findFirst({
    where: { institutionId, fenceType: 'DEPOT' },
  });
  if (!depotGf) {
    await prisma.transportGeofence.create({
      data: {
        institutionId,
        name: 'Transport Depot',
        fenceType: 'DEPOT',
        latitude: baseLat - 0.01,
        longitude: baseLng - 0.015,
        radiusMeters: 200,
        description: 'Vehicle depot geofence',
      },
    });
  }

  await prisma.transportStopImportLog.create({
    data: {
      institutionId,
      sourceType: 'EXCEL',
      fileName: 'Demo_Stops_Import.xlsx',
      totalRows: 8,
      successCount: 8,
      errorCount: 0,
      status: 'COMPLETED',
      errors: [],
    },
  });

  await audit(institutionId, 'SYSTEM', 'Seed Demo', 'Stops & geo fencing demo data loaded');
  return getTransportStopsGeoFencing(institutionId);
}
