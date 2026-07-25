import { prisma } from './prisma.js';
import type { Prisma } from '@prisma/client';
import { seedTransportDriverAttendant } from './transportDriverAttendant.js';

export const TRIP_STATUSES = ['SCHEDULED', 'RUNNING', 'COMPLETED', 'DELAYED', 'CANCELLED', 'PAUSED', 'EMERGENCY'];
export const TRIP_CATEGORIES = [
  'Morning Pickup', 'Afternoon Drop', 'Evening Drop', 'Hostel', 'Coaching',
  'Event', 'Exam', 'Emergency', 'Field Visit',
];
export const TRIP_DIRECTIONS = ['One Way', 'Round Trip', 'Multi-Trip', 'Shuttle Service'];
export const SCHEDULE_TYPES = ['DAILY', 'WEEKLY', 'MONTHLY', 'SESSION'];

const REPORT_CATALOG = [
  'Daily Trip Report', 'Trip Register Report', 'Trip Schedule Report', 'Running Trip Report',
  'Completed Trip Report', 'Cancelled Trip Report', 'Delayed Trip Report', 'Emergency Trip Report',
  'Route Performance Report', 'Vehicle Trip Report', 'Driver Trip Report', 'Student Boarding Report',
  'Student Drop Report', 'Missed Pickup Report', 'Missed Drop Report', 'Trip Attendance Report',
  'GPS Trip Replay Report', 'Trip Cost Analysis Report', 'Fuel Consumption Report', 'Mileage Report',
  'Toll Expense Report', 'Miscellaneous Expense Report', 'Incident Report', 'Breakdown Report',
  'Accident Report', 'Complaint Report', 'Lost & Found Report', 'Vehicle Inspection Report',
  'Trip Reconciliation Report', 'Trip Rating Report', 'Trip Utilization Report',
  'Daily Operations Dashboard', 'Driver Productivity Report', 'Fleet Utilization Report', 'Trip Audit Trail Report',
];

const WORKFLOW = [
  'Trip Scheduled', 'Vehicle Assigned', 'Driver Login', 'Pre-Trip Inspection', 'Trip Approval',
  'Trip Started', 'GPS Tracking', 'Student Boarding', 'Route Monitoring', 'Student Drop',
  'Trip Completed', 'Post Trip Inspection', 'Trip Reconciliation', 'Reports & Analytics',
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
  return hrs < 24 ? `${hrs} hr ago` : 'Yesterday';
}

async function ensureSettings(institutionId: string) {
  let row = await prisma.transportTripSettings.findUnique({ where: { institutionId } });
  if (!row) {
    row = await prisma.transportTripSettings.create({
      data: {
        institutionId,
        delayThresholdMin: 10,
        roleMatrix: [
          { role: 'Admin', permissions: 'Full trip scheduling, execution, reconciliation, settings' },
          { role: 'Transport Manager', permissions: 'Schedule trips, approve, monitor, replace vehicle/driver' },
          { role: 'Principal', permissions: 'Approve exceptional trips, view KPIs, safety monitoring' },
          { role: 'Driver', permissions: 'Start/pause/complete trip, checklist, expenses, incidents' },
        ],
        notificationRules: {
          channels: ['Push', 'SMS', 'WhatsApp', 'Email', 'In-App'],
          events: ['Trip started', 'Boarding', 'Drop', 'Delay', 'Emergency SOS', 'Trip completed'],
        },
        mobileSyncRules: {
          parentApp: ['Trip start notification', 'Live bus', 'ETA', 'Boarding/drop confirmation', 'Delay alerts', 'Trip history', 'Rate service'],
          driverApp: ['View trips', 'Vehicle checklist', 'Start/pause/end', 'Fuel & expenses', 'Incidents', 'SOS', 'Trip history'],
          staffApp: ['Assigned trips', 'Verify boarding/drop', 'Record absent', 'Incident reports', 'Stop sequence'],
          transportManagerApp: ['Monitor running trips', 'Track delays', 'GPS', 'Replace vehicle/driver', 'Approve emergency'],
          principalApp: ['Live trips', 'Delayed buses', 'Student safety', 'Emergency alerts', 'Daily summary', 'KPIs'],
        },
        reportCatalog: REPORT_CATALOG,
      },
    });
  }
  return row;
}

async function audit(institutionId: string, entityType: string, action: string, details = '', entityId = '') {
  await prisma.transportTripAuditLog.create({
    data: { institutionId, entityType, entityId, action, details, performedBy: 'Transport Manager' },
  });
}

async function nextTripNumber(institutionId: string): Promise<string> {
  const count = await prisma.transportTrip.count({ where: { institutionId } });
  return `TRP-${String(count + 1).padStart(5, '0')}`;
}

function serializeTrip(t: {
  id: string; tripNumber: string; busLabel: string; routeCode: string; routeName: string;
  driverName: string; tripType: string; tripCategory: string; tripDirection: string;
  scheduleType: string; academicYear: string; branch: string; status: string; workflowStage: string;
  plannedDeparture: string; plannedArrival: string;
  actualDeparture: Date | null; actualArrival: Date | null;
  startedAt: Date | null; pausedAt: Date | null; completedAt: Date | null;
  stopsCompleted: number; stopsTotal: number;
  studentsPicked: number; studentsTotal: number; studentsBoarded: number; studentsDropped: number;
  odometerStart: number; odometerEnd: number; fuelConsumption: number;
  distanceKm: number; mileageKm: number; delayMinutes: number;
  tripCost: number; tollExpense: number; parkingExpense: number; miscExpense: number;
  driverHealthDeclared: boolean; routeValidated: boolean; approvalStatus: string;
  tripNotes: string; reconciliationNotes: string; rating: number | null;
  tripDate: Date;
  vehicle?: { vehicleNumber: string } | null;
  attendant?: { name: string } | null;
  stops?: Array<{ id: string; stopName: string; sequenceOrder: number; plannedTime: string; status: string; studentsBoarded: number }>;
  expenses?: Array<{ expenseType: string; amount: number }>;
  incidents?: Array<{ incidentType: string; severity: string; description: string }>;
}) {
  const progressPct = t.stopsTotal > 0 ? Math.round((t.stopsCompleted / t.stopsTotal) * 100) : 0;
  const totalExpense = t.tollExpense + t.parkingExpense + t.miscExpense;
  return {
    id: t.id, tripNumber: t.tripNumber, busLabel: t.busLabel,
    routeCode: t.routeCode, routeName: t.routeName, driverName: t.driverName,
    vehicleNumber: t.vehicle?.vehicleNumber ?? t.busLabel,
    attendantName: t.attendant?.name ?? '',
    tripType: t.tripType, tripCategory: t.tripCategory, tripDirection: t.tripDirection,
    scheduleType: t.scheduleType, academicYear: t.academicYear, branch: t.branch,
    status: t.status, workflowStage: t.workflowStage,
    plannedDeparture: t.plannedDeparture, plannedArrival: t.plannedArrival,
    actualDeparture: t.actualDeparture?.toISOString() ?? null,
    actualArrival: t.actualArrival?.toISOString() ?? null,
    startedAt: t.startedAt?.toISOString() ?? null,
    pausedAt: t.pausedAt?.toISOString() ?? null,
    completedAt: t.completedAt?.toISOString() ?? null,
    stopsCompleted: t.stopsCompleted, stopsTotal: t.stopsTotal, progressPct,
    studentsPicked: t.studentsPicked, studentsTotal: t.studentsTotal,
    studentsBoarded: t.studentsBoarded, studentsDropped: t.studentsDropped,
    odometerStart: t.odometerStart, odometerEnd: t.odometerEnd,
    fuelConsumption: t.fuelConsumption, distanceKm: t.distanceKm, mileageKm: t.mileageKm,
    delayMinutes: t.delayMinutes, isDelayed: t.delayMinutes > 10,
    tripCost: t.tripCost, tollExpense: t.tollExpense, parkingExpense: t.parkingExpense,
    miscExpense: t.miscExpense, totalExpense,
    driverHealthDeclared: t.driverHealthDeclared, routeValidated: t.routeValidated,
    approvalStatus: t.approvalStatus, tripNotes: t.tripNotes,
    reconciliationNotes: t.reconciliationNotes, rating: t.rating,
    tripDate: t.tripDate.toISOString().slice(0, 10),
    stops: (t.stops ?? []).map((s) => ({
      id: s.id, stopName: s.stopName, sequenceOrder: s.sequenceOrder,
      plannedTime: s.plannedTime, status: s.status, studentsBoarded: s.studentsBoarded,
    })),
    expenses: t.expenses ?? [],
    incidents: t.incidents ?? [],
  };
}

const tripInclude = {
  vehicle: { select: { vehicleNumber: true } },
  attendant: { select: { name: true } },
  stops: { orderBy: { sequenceOrder: 'asc' as const } },
  expenses: true,
  incidents: true,
};

export async function getTransportTripManagement(institutionId: string, academicYear = '2025-26') {
  await ensureSettings(institutionId);
  const tripDate = todayDate();

  const [trips, routes, vehicles, drivers, auditLogs, settings] = await Promise.all([
    prisma.transportTrip.findMany({
      where: { institutionId, academicYear, archivedAt: null },
      include: tripInclude,
      orderBy: [{ tripDate: 'desc' }, { plannedDeparture: 'asc' }],
      take: 50,
    }),
    prisma.transportRoute.findMany({
      where: { institutionId, isArchived: false },
      select: { id: true, routeCode: true, routeName: true, stopCount: true },
      take: 20,
    }),
    prisma.transportVehicle.findMany({
      where: { institutionId, isActive: true },
      select: { id: true, vehicleNumber: true, routeName: true },
      take: 20,
    }),
    prisma.transportStaffMember.findMany({
      where: { institutionId, isActive: true, role: { in: ['Driver', 'DRIVER', 'Attendant'] } },
      select: { id: true, name: true, role: true, employeeCode: true },
      take: 30,
    }),
    prisma.transportTripAuditLog.findMany({
      where: { institutionId }, orderBy: { createdAt: 'desc' }, take: 20,
    }),
    prisma.transportTripSettings.findUnique({ where: { institutionId } }),
  ]);

  const serialized = trips.map(serializeTrip);
  const statusCounts = TRIP_STATUSES.reduce((acc, s) => {
    acc[s] = serialized.filter((t) => t.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  const todayTrips = serialized.filter((t) => t.tripDate === tripDate.toISOString().slice(0, 10));
  const runningTrips = serialized.filter((t) => t.status === 'RUNNING' || t.status === 'PAUSED');

  return {
    academicYear,
    academicYears: ['2024-25', '2025-26', '2026-27'],
    tripStatuses: TRIP_STATUSES,
    tripCategories: TRIP_CATEGORIES,
    tripDirections: TRIP_DIRECTIONS,
    scheduleTypes: SCHEDULE_TYPES,
    workflow: WORKFLOW,
    kpis: {
      totalTrips: serialized.length,
      scheduled: statusCounts.SCHEDULED ?? 0,
      running: statusCounts.RUNNING ?? 0,
      completed: statusCounts.COMPLETED ?? 0,
      delayed: statusCounts.DELAYED ?? 0,
      cancelled: statusCounts.CANCELLED ?? 0,
      emergency: statusCounts.EMERGENCY ?? 0,
      todayTrips: todayTrips.length,
      avgDelay: serialized.length
        ? Math.round(serialized.reduce((s, t) => s + t.delayMinutes, 0) / serialized.length) : 0,
      totalMileage: Math.round(serialized.reduce((s, t) => s + t.mileageKm, 0)),
      totalCost: Math.round(serialized.reduce((s, t) => s + t.tripCost + t.totalExpense, 0)),
      studentsTransported: serialized.reduce((s, t) => s + t.studentsBoarded, 0),
    },
    statusCounts,
    trips: serialized,
    runningTrips,
    todayTrips,
    routes,
    vehicles,
    drivers,
    auditLogs: auditLogs.map((l) => ({
      id: l.id, entityType: l.entityType, action: l.action, details: l.details,
      performedBy: l.performedBy, relativeTime: relativeTime(l.createdAt),
    })),
    settings: settings ?? {},
    reports: REPORT_CATALOG,
  };
}

export async function scheduleTransportTrip(institutionId: string, body: Record<string, unknown>) {
  const tripNumber = await nextTripNumber(institutionId);
  const routeId = body.routeId ? String(body.routeId) : null;
  let routeCode = String(body.routeCode ?? '');
  let routeName = String(body.routeName ?? '');
  let stopsTotal = Number(body.stopsTotal ?? 0);
  let studentsTotal = Number(body.studentsTotal ?? 0);

  if (routeId) {
    const route = await prisma.transportRoute.findFirst({
      where: { id: routeId, institutionId },
      include: { stops: { orderBy: { sequenceOrder: 'asc' } } },
    });
    if (route) {
      routeCode = route.routeCode;
      routeName = route.routeName;
      stopsTotal = route.stopCount || route.stops.length;
      studentsTotal = route.studentCount;
    }
  }

  const vehicle = body.vehicleId
    ? await prisma.transportVehicle.findFirst({ where: { id: String(body.vehicleId), institutionId } })
    : null;
  const driver = body.driverId
    ? await prisma.transportStaffMember.findFirst({ where: { id: String(body.driverId), institutionId } })
    : null;

  const trip = await prisma.transportTrip.create({
    data: {
      institutionId, tripNumber,
      busLabel: vehicle?.vehicleNumber ?? String(body.busLabel ?? 'Bus 01'),
      routeCode, routeName,
      driverName: driver?.name ?? String(body.driverName ?? ''),
      tripType: String(body.tripType ?? 'MORNING'),
      tripCategory: String(body.tripCategory ?? 'Morning Pickup'),
      tripDirection: String(body.tripDirection ?? 'Round Trip'),
      scheduleType: String(body.scheduleType ?? 'DAILY'),
      academicYear: String(body.academicYear ?? '2025-26'),
      branch: String(body.branch ?? 'Main Campus'),
      status: 'SCHEDULED', workflowStage: 'SCHEDULED',
      routeId, vehicleId: body.vehicleId ? String(body.vehicleId) : null,
      driverId: body.driverId ? String(body.driverId) : null,
      attendantId: body.attendantId ? String(body.attendantId) : null,
      plannedDeparture: String(body.plannedDeparture ?? '07:00'),
      plannedArrival: String(body.plannedArrival ?? '08:30'),
      stopsTotal, studentsTotal,
      tripDate: body.tripDate ? new Date(String(body.tripDate)) : todayDate(),
      distanceKm: Number(body.distanceKm ?? 12),
    },
  });

  if (routeId) {
    const route = await prisma.transportRoute.findFirst({
      where: { id: routeId },
      include: { stops: { orderBy: { sequenceOrder: 'asc' } } },
    });
    if (route) {
      for (const stop of route.stops) {
        await prisma.transportTripStop.create({
          data: {
            institutionId, tripId: trip.id,
            stopName: stop.stopName, sequenceOrder: stop.sequenceOrder,
            plannedTime: stop.estimatedArrival || `07:${String(stop.sequenceOrder * 8).padStart(2, '0')}`,
          },
        });
      }
    }
  }

  await audit(institutionId, 'TRIP', 'Trip scheduled', tripNumber, trip.id);
  return trip;
}

export async function approveTransportTrip(institutionId: string, tripId: string) {
  return prisma.transportTrip.update({
    where: { id: tripId },
    data: { approvalStatus: 'APPROVED', workflowStage: 'APPROVAL', routeValidated: true },
  });
}

export async function startTransportTrip(institutionId: string, tripId: string, body: Record<string, unknown>) {
  const now = new Date();
  const trip = await prisma.transportTrip.update({
    where: { id: tripId },
    data: {
      status: 'RUNNING', workflowStage: 'EXECUTION',
      startedAt: now, actualDeparture: now,
      driverHealthDeclared: Boolean(body.healthDeclared ?? true),
      odometerStart: Number(body.odometerStart ?? 0),
      fuelLevelStart: body.fuelLevel ? Number(body.fuelLevel) : null,
      preTripChecklist: (body.checklist ?? {
        tyres: true, brakes: true, lights: true, horn: true, emergencyKit: true,
      }) as Prisma.InputJsonValue,
    },
  });
  await audit(institutionId, 'TRIP', 'Trip started', trip.tripNumber, tripId);
  return trip;
}

export async function pauseTransportTrip(institutionId: string, tripId: string) {
  return prisma.transportTrip.update({
    where: { id: tripId },
    data: { status: 'PAUSED', pausedAt: new Date() },
  });
}

export async function resumeTransportTrip(institutionId: string, tripId: string) {
  return prisma.transportTrip.update({
    where: { id: tripId },
    data: { status: 'RUNNING', pausedAt: null },
  });
}

export async function completeTransportTrip(institutionId: string, tripId: string, body: Record<string, unknown>) {
  const now = new Date();
  const existing = await prisma.transportTrip.findFirst({ where: { id: tripId, institutionId } });
  if (!existing) throw new Error('Trip not found');

  const odometerEnd = Number(body.odometerEnd ?? existing.odometerStart + 15);
  const mileageKm = odometerEnd - existing.odometerStart;
  const fuelConsumption = Number(body.fuelConsumption ?? mileageKm * 0.35);
  const tripCost = fuelConsumption * 95 + Number(body.tollExpense ?? 0) + Number(body.driverAllowance ?? 200);

  const trip = await prisma.transportTrip.update({
    where: { id: tripId },
    data: {
      status: 'COMPLETED', workflowStage: 'RECONCILIATION',
      completedAt: now, actualArrival: now,
      stopsCompleted: existing.stopsTotal,
      studentsBoarded: existing.studentsTotal,
      studentsDropped: existing.studentsTotal,
      studentsPicked: existing.studentsTotal,
      odometerEnd, mileageKm, fuelConsumption, tripCost,
      tollExpense: Number(body.tollExpense ?? 0),
      parkingExpense: Number(body.parkingExpense ?? 0),
      miscExpense: Number(body.miscExpense ?? 0),
      postTripChecklist: (body.checklist ?? { cleaned: true, inspected: true }) as Prisma.InputJsonValue,
      reconciliationNotes: 'Planned vs actual reconciled — within acceptable variance',
      rating: body.rating ? Number(body.rating) : 4.2,
    },
  });
  await audit(institutionId, 'TRIP', 'Trip completed', trip.tripNumber, tripId);
  return trip;
}

export async function cancelTransportTrip(institutionId: string, tripId: string, reason: string) {
  return prisma.transportTrip.update({
    where: { id: tripId },
    data: { status: 'CANCELLED', cancelledAt: new Date(), tripNotes: reason },
  });
}

export async function addTripIncident(institutionId: string, tripId: string, body: Record<string, unknown>) {
  await prisma.transportTripIncident.create({
    data: {
      institutionId, tripId,
      incidentType: String(body.incidentType ?? 'OTHER'),
      severity: String(body.severity ?? 'MEDIUM'),
      description: String(body.description ?? ''),
    },
  });
  if (body.incidentType === 'EMERGENCY' || body.incidentType === 'ACCIDENT') {
    await prisma.transportTrip.update({
      where: { id: tripId },
      data: { status: 'EMERGENCY', workflowStage: 'EMERGENCY' },
    });
  }
  await audit(institutionId, 'INCIDENT', String(body.incidentType ?? 'Incident'), String(body.description ?? ''), tripId);
}

export async function seedTransportTripManagement(institutionId: string) {
  await seedTransportDriverAttendant(institutionId);
  await ensureSettings(institutionId);

  const existing = await prisma.transportTrip.count({
    where: { institutionId, tripNumber: { startsWith: 'TRP-' } },
  });
  if (existing >= 8) return getTransportTripManagement(institutionId);

  const routes = await prisma.transportRoute.findMany({
    where: { institutionId },
    include: { stops: { orderBy: { sequenceOrder: 'asc' }, take: 6 } },
    take: 8,
  });
  const vehicles = await prisma.transportVehicle.findMany({ where: { institutionId, isActive: true }, take: 8 });
  const drivers = await prisma.transportStaffMember.findMany({
    where: { institutionId, role: { in: ['Driver', 'DRIVER'] }, isActive: true }, take: 8,
  });
  const attendants = await prisma.transportStaffMember.findMany({
    where: { institutionId, role: 'Attendant', isActive: true }, take: 4,
  });

  const tripDate = todayDate();
  const yesterday = new Date(tripDate);
  yesterday.setDate(yesterday.getDate() - 1);

  const statuses = ['RUNNING', 'RUNNING', 'SCHEDULED', 'SCHEDULED', 'COMPLETED', 'COMPLETED', 'DELAYED', 'CANCELLED', 'EMERGENCY', 'PAUSED'];
  const categories = ['Morning Pickup', 'Morning Pickup', 'Afternoon Drop', 'Evening Drop', 'Hostel', 'Coaching', 'Exam', 'Event', 'Emergency', 'Morning Pickup'];
  const types = ['MORNING', 'MORNING', 'EVENING', 'EVENING', 'MORNING', 'EVENING', 'MORNING', 'MORNING', 'EMERGENCY', 'MORNING'];

  for (let i = 0; i < 10; i++) {
    const route = routes[i % routes.length];
    const vehicle = vehicles[i % vehicles.length];
    const driver = drivers[i % drivers.length];
    const attendant = attendants[i % attendants.length];
    const status = statuses[i];
    const tripNumber = await nextTripNumber(institutionId);
    const date = i < 6 ? tripDate : yesterday;
    const stopsTotal = route?.stopCount ?? 8;
    const studentsTotal = route?.studentCount ?? 35;
    const completed = status === 'COMPLETED' ? stopsTotal : status === 'RUNNING' ? Math.floor(stopsTotal * 0.6) : 0;
    const delay = status === 'DELAYED' ? 18 : status === 'RUNNING' && i === 0 ? 5 : 0;
    const mileage = completed > 0 ? 8 + i * 1.2 : 0;

    const trip = await prisma.transportTrip.create({
      data: {
        institutionId, tripNumber,
        busLabel: vehicle?.vehicleNumber ?? `Bus ${i + 1}`,
        routeCode: route?.routeCode ?? `R0${i + 1}`,
        routeName: route?.routeName ?? `Route ${i + 1}`,
        driverName: driver?.name ?? 'Driver',
        tripType: types[i], tripCategory: categories[i],
        tripDirection: i % 3 === 0 ? 'One Way' : 'Round Trip',
        scheduleType: i % 2 === 0 ? 'DAILY' : 'WEEKLY',
        academicYear: '2025-26', branch: 'Main Campus',
        status, workflowStage: status === 'COMPLETED' ? 'RECONCILIATION' : status === 'RUNNING' ? 'EXECUTION' : 'SCHEDULED',
        routeId: route?.id, vehicleId: vehicle?.id,
        driverId: driver?.id, attendantId: attendant?.id,
        plannedDeparture: i < 5 ? '07:00' : '15:30',
        plannedArrival: i < 5 ? '08:30' : '16:45',
        actualDeparture: ['RUNNING', 'COMPLETED', 'DELAYED', 'PAUSED', 'EMERGENCY'].includes(status) ? new Date() : null,
        actualArrival: status === 'COMPLETED' ? new Date() : null,
        startedAt: ['RUNNING', 'COMPLETED', 'DELAYED', 'PAUSED', 'EMERGENCY'].includes(status) ? new Date() : null,
        completedAt: status === 'COMPLETED' ? new Date() : null,
        cancelledAt: status === 'CANCELLED' ? new Date() : null,
        pausedAt: status === 'PAUSED' ? new Date() : null,
        stopsCompleted: completed, stopsTotal,
        studentsPicked: status === 'COMPLETED' ? studentsTotal : Math.floor(studentsTotal * 0.6),
        studentsTotal, studentsBoarded: completed > 0 ? Math.floor(studentsTotal * 0.9) : 0,
        studentsDropped: status === 'COMPLETED' ? studentsTotal : 0,
        odometerStart: 10000 + i * 100,
        odometerEnd: status === 'COMPLETED' ? 10000 + i * 100 + mileage : 0,
        fuelLevelStart: 60 + i * 3, fuelConsumption: mileage * 0.35,
        distanceKm: route?.distanceKm ?? 12, mileageKm: mileage,
        delayMinutes: delay,
        tripCost: mileage * 95 + 200, tollExpense: i % 3 === 0 ? 50 : 0,
        parkingExpense: i === 7 ? 30 : 0, miscExpense: 0,
        driverHealthDeclared: status !== 'SCHEDULED',
        routeValidated: true, approvalStatus: status === 'SCHEDULED' ? 'PENDING' : 'APPROVED',
        tripNotes: status === 'CANCELLED' ? 'Cancelled due to vehicle breakdown' : '',
        reconciliationNotes: status === 'COMPLETED' ? 'Reconciled — within 5% variance' : '',
        rating: status === 'COMPLETED' ? 4 + (i % 10) * 0.1 : null,
        tripDate: date,
        preTripChecklist: { tyres: true, brakes: true, lights: true, horn: true, emergencyKit: true },
        postTripChecklist: status === 'COMPLETED' ? { cleaned: true, inspected: true } : {},
      },
    });

    if (route) {
      for (const stop of route.stops) {
        const stopCompleted = stop.sequenceOrder <= completed;
        await prisma.transportTripStop.create({
          data: {
            institutionId, tripId: trip.id,
            stopName: stop.stopName, sequenceOrder: stop.sequenceOrder,
            plannedTime: stop.estimatedArrival || `07:${String(stop.sequenceOrder * 8).padStart(2, '0')}`,
            status: stopCompleted ? 'COMPLETED' : stop.sequenceOrder === completed + 1 ? 'CURRENT' : 'PENDING',
            studentsBoarded: stopCompleted ? Math.ceil(studentsTotal / route.stops.length) : 0,
            actualArrival: stopCompleted ? new Date() : null,
          },
        });
      }
    }

    if (status === 'COMPLETED') {
      await prisma.transportTripExpense.create({
        data: { institutionId, tripId: trip.id, expenseType: 'Fuel', amount: mileage * 0.35 * 95, description: 'Diesel' },
      });
      if (i % 3 === 0) {
        await prisma.transportTripExpense.create({
          data: { institutionId, tripId: trip.id, expenseType: 'Toll', amount: 50, description: 'Highway toll' },
        });
      }
    }

    if (status === 'EMERGENCY') {
      await prisma.transportTripIncident.create({
        data: {
          institutionId, tripId: trip.id, incidentType: 'BREAKDOWN',
          severity: 'HIGH', description: 'Engine overheating — replacement vehicle dispatched',
        },
      });
    }
    if (status === 'DELAYED') {
      await prisma.transportTripIncident.create({
        data: {
          institutionId, tripId: trip.id, incidentType: 'TRAFFIC_DELAY',
          severity: 'MEDIUM', description: 'Heavy traffic at Civil Lines junction',
        },
      });
    }
  }

  await audit(institutionId, 'SYSTEM', 'Demo trip management data seeded');
  return getTransportTripManagement(institutionId);
}
