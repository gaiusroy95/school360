import { TransportIncidentType } from '@prisma/client';
import { prisma } from './prisma.js';
import { notifyStaffPush } from './notifications.js';

function parseTimeToMinutes(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function istMinutesNow() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  return hour * 60 + minute;
}

export async function getOrCreateTrackingConfig(institutionId: string) {
  return prisma.transportTrackingConfig.upsert({
    where: { institutionId },
    create: { institutionId },
    update: {},
  });
}

export function isWithinTrackingWindow(config: { trackingStart: string; trackingEnd: string }) {
  const now = istMinutesNow();
  const start = parseTimeToMinutes(config.trackingStart);
  const end = parseTimeToMinutes(config.trackingEnd);
  return now >= start && now <= end;
}

export async function recordVehicleLocation(
  institutionId: string,
  staffProfileId: string,
  input: {
    vehicleId: string;
    latitude: number;
    longitude: number;
    speedKmh?: number;
    heading?: number;
  },
) {
  const config = await getOrCreateTrackingConfig(institutionId);
  if (!isWithinTrackingWindow(config)) {
    throw new Error('Vehicle tracking is only allowed during configured duty hours');
  }

  const vehicle = await prisma.transportVehicle.findFirst({
    where: { id: input.vehicleId, institutionId, isActive: true },
  });
  if (!vehicle) throw new Error('Vehicle not found');

  const location = await prisma.vehicleLocation.create({
    data: {
      institutionId,
      vehicleId: input.vehicleId,
      staffProfileId,
      latitude: input.latitude,
      longitude: input.longitude,
      speedKmh: input.speedKmh ?? 0,
      heading: input.heading ?? 0,
    },
  });

  const recent = await prisma.vehicleLocation.findMany({
    where: { vehicleId: input.vehicleId },
    orderBy: { recordedAt: 'desc' },
    take: 2,
  });

  if (recent.length === 2) {
    const [cur, prev] = recent;
    const dist = haversineMeters(prev.latitude, prev.longitude, cur.latitude, cur.longitude);
    const dtSec = (cur.recordedAt.getTime() - prev.recordedAt.getTime()) / 1000;
    if (dtSec > 0 && dtSec < 120 && dist < config.collisionRadiusMeters) {
      await reportTransportIncident(institutionId, staffProfileId, {
        vehicleId: input.vehicleId,
        incidentType: 'COLLISION',
        description: `Possible collision/deviation detected within ${Math.round(dist)}m`,
        latitude: input.latitude,
        longitude: input.longitude,
      });
    }
  }

  return location;
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export async function reportTransportIncident(
  institutionId: string,
  staffProfileId: string,
  input: {
    vehicleId: string;
    incidentType: TransportIncidentType;
    description: string;
    latitude?: number;
    longitude?: number;
  },
) {
  const incident = await prisma.transportIncident.create({
    data: {
      institutionId,
      vehicleId: input.vehicleId,
      staffProfileId,
      incidentType: input.incidentType,
      description: input.description,
      latitude: input.latitude ?? 0,
      longitude: input.longitude ?? 0,
    },
    include: { vehicle: true },
  });

  if (input.incidentType === 'EMERGENCY' || input.incidentType === 'COLLISION') {
    await notifyStaffPush(
      institutionId,
      `Transport ${input.incidentType}`,
      `${incident.vehicle.vehicleNumber} (${incident.vehicle.routeName}): ${input.description}`,
      'transport_incident',
    );
  }

  return incident;
}

export async function getVehicleLiveStatus(institutionId: string, vehicleId: string) {
  const vehicle = await prisma.transportVehicle.findFirst({
    where: { id: vehicleId, institutionId },
  });
  if (!vehicle) throw new Error('Vehicle not found');

  const latest = await prisma.vehicleLocation.findFirst({
    where: { vehicleId },
    orderBy: { recordedAt: 'desc' },
  });

  return {
    vehicle,
    latestLocation: latest
      ? {
          latitude: latest.latitude,
          longitude: latest.longitude,
          speedKmh: latest.speedKmh,
          heading: latest.heading,
          recordedAt: latest.recordedAt.toISOString(),
        }
      : null,
  };
}

export async function listActiveVehicles(institutionId: string) {
  const vehicles = await prisma.transportVehicle.findMany({
    where: { institutionId, isActive: true },
    orderBy: { vehicleNumber: 'asc' },
  });

  const withLatest = await Promise.all(
    vehicles.map(async (v) => {
      const latest = await prisma.vehicleLocation.findFirst({
        where: { vehicleId: v.id },
        orderBy: { recordedAt: 'desc' },
      });
      return {
        id: v.id,
        vehicleNumber: v.vehicleNumber,
        routeName: v.routeName,
        driverName: v.driverName,
        latestLocation: latest
          ? {
              latitude: latest.latitude,
              longitude: latest.longitude,
              recordedAt: latest.recordedAt.toISOString(),
            }
          : null,
      };
    }),
  );

  return withLatest;
}

export async function triggerTransportEmergency(
  institutionId: string,
  staffProfileId: string,
  vehicleId: string,
  description: string,
  latitude?: number,
  longitude?: number,
) {
  return reportTransportIncident(institutionId, staffProfileId, {
    vehicleId,
    incidentType: 'EMERGENCY',
    description: description || 'Emergency assistance requested by transport staff',
    latitude,
    longitude,
  });
}
