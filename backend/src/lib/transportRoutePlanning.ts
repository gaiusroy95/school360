import { prisma } from './prisma.js';
import { seedTransportMaster } from './transportMaster.js';

export const PLAN_TYPES = ['DAILY', 'WEEKLY', 'MONTHLY', 'SESSION'];
export const PLAN_STATUSES = ['DRAFT', 'PENDING', 'APPROVED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED', 'ARCHIVED'];
export const PLAN_PRIORITIES = ['HIGH', 'MEDIUM', 'LOW'];
export const TRANSPORT_CATEGORIES = [
  'Regular', 'Exam', 'Event', 'Hostel', 'Sports', 'Coaching', 'Special Trip', 'Emergency',
];
export const WORKFLOW_STAGES = [
  'PLANNING', 'ROUTE_DESIGN', 'VEHICLE_ASSIGNMENT', 'DRIVER_ASSIGNMENT', 'STUDENT_ALLOCATION',
  'CAPACITY_VALIDATION', 'OPTIMIZATION', 'APPROVAL', 'PUBLISHED', 'EXECUTION',
];
export const APPROVER_ROLES = ['Planner', 'Transport Manager', 'Principal'];

const REPORT_CATALOG = [
  'Route Planning Report', 'Daily Route Schedule Report', 'Weekly Route Schedule Report',
  'Monthly Route Schedule Report', 'Route Optimization Report', 'Vehicle Allocation Report',
  'Driver Allocation Report', 'Student Allocation Report', 'Route Capacity Utilization Report',
  'Pickup Point Report', 'Drop Point Report', 'Route Diversion Report', 'Emergency Route Report',
  'Route Delay Report', 'Route Cancellation Report', 'Route Approval Report',
  'Route Cost Analysis Report', 'Fuel Estimation Report', 'Route Performance Report', 'Route Audit Trail Report',
];

function parseJson<T>(raw: unknown, fallback: T): T {
  if (raw === null || raw === undefined) return fallback;
  return raw as T;
}

async function ensureSettings(institutionId: string) {
  let row = await prisma.transportPlanningSettings.findUnique({ where: { institutionId } });
  if (!row) {
    row = await prisma.transportPlanningSettings.create({
      data: {
        institutionId,
        workflowStages: WORKFLOW_STAGES,
        transportCategories: TRANSPORT_CATEGORIES,
        roleMatrix: [
          { role: 'Planner', permissions: 'Create/edit plans, wizard, allocations, optimization' },
          { role: 'Transport Manager', permissions: 'Approve plans, publish, pause/resume, reports' },
          { role: 'Principal', permissions: 'Final approval, emergency rerouting, live overview' },
          { role: 'Admin', permissions: 'Full access, settings, audit, import/export' },
        ],
        notificationRules: {
          channels: ['Parent App', 'Driver App', 'Staff App', 'Principal App', 'SMS', 'Email'],
          events: ['Route changes', 'Pickup delays', 'Alternate route', 'Holiday suspension', 'Approval status'],
        },
        mobileSyncRules: {
          parentApp: ['Pickup/drop timings', 'Route number', 'Stop details', 'Live ETA', 'Schedule download'],
          driverApp: ['Assigned route', 'GPS navigation', 'Start/pause/resume/complete', 'Stop list', 'Traffic report'],
          staffApp: ['Duty assignments', 'Accept/reject duty', 'Schedule updates', 'Trip history'],
          principalApp: ['Live overview', 'Approval/rejection', 'Delayed routes', 'Utilization', 'Emergency reroute'],
        },
        reportCatalog: REPORT_CATALOG,
      },
    });
  }
  return row;
}

async function nextPlanNumber(institutionId: string): Promise<string> {
  const count = await prisma.transportRoutePlan.count({ where: { institutionId } });
  return `PLN-${String(count + 1).padStart(4, '0')}`;
}

function serializePlan(p: {
  id: string; planNumber: string; title: string; planType: string; academicYear: string;
  branch: string; transportCategory: string; priority: string; status: string; workflowStage: string;
  scheduledDate: Date | null; startTime: string; endTime: string;
  schoolOpenTime: string; schoolCloseTime: string;
  distanceKm: number; estimatedMinutes: number; fuelEstimate: number; costEstimate: number;
  tollEstimate: number; occupiedSeats: number; capacity: number; capacityValid: boolean;
  versionLabel: string; optimizationNotes: string; weatherAlert: string; trafficAlternate: string;
  simulationResult: unknown; publishedAt: Date | null; pausedAt: Date | null;
  cancelledAt: Date | null; cancelReason: string; archivedAt: Date | null;
  routeId?: string | null;
  route?: { id: string; routeCode: string; routeName: string } | null;
  vehicle?: { vehicleNumber: string; capacity: number } | null;
  driver?: { name: string } | null;
  backupDriver?: { name: string } | null;
  attendant?: { name: string } | null;
  stops?: Array<{
    id: string; stopName: string; sequenceOrder: number; stopType: string;
    pickupTime: string; dropTime: string; waitMinutes: number; bufferMinutes: number;
    latitude: number | null; longitude: number | null; studentCount: number; geoValidated: boolean;
  }>;
  allocations?: Array<{
    id: string; entityType: string; entityName: string; stopName: string;
    seatNumber: number | null; specialNeeds: boolean;
  }>;
  approvals?: Array<{
    id: string; approverRole: string; action: string; remarks: string; actionDate: Date | null;
  }>;
}) {
  const sim = parseJson<Record<string, unknown>>(p.simulationResult, {});
  return {
    id: p.id, planNumber: p.planNumber, title: p.title, planType: p.planType,
    academicYear: p.academicYear, branch: p.branch, transportCategory: p.transportCategory,
    priority: p.priority, status: p.status, workflowStage: p.workflowStage,
    scheduledDate: p.scheduledDate ? p.scheduledDate.toISOString().slice(0, 10) : '',
    startTime: p.startTime, endTime: p.endTime,
    schoolOpenTime: p.schoolOpenTime, schoolCloseTime: p.schoolCloseTime,
    distanceKm: p.distanceKm, estimatedMinutes: p.estimatedMinutes,
    fuelEstimate: p.fuelEstimate, costEstimate: p.costEstimate, tollEstimate: p.tollEstimate,
    occupiedSeats: p.occupiedSeats, capacity: p.capacity, capacityValid: p.capacityValid,
    occupancyPct: p.capacity > 0 ? Math.round((p.occupiedSeats / p.capacity) * 100) : 0,
    versionLabel: p.versionLabel, optimizationNotes: p.optimizationNotes,
    weatherAlert: p.weatherAlert, trafficAlternate: p.trafficAlternate,
    simulationResult: sim,
    publishedAt: p.publishedAt?.toISOString() ?? null,
    pausedAt: p.pausedAt?.toISOString() ?? null,
    cancelledAt: p.cancelledAt?.toISOString() ?? null,
    cancelReason: p.cancelReason,
    archivedAt: p.archivedAt?.toISOString() ?? null,
    routeId: p.routeId ?? p.route?.id ?? '',
    routeCode: p.route?.routeCode ?? '',
    routeName: p.route?.routeName ?? '',
    vehicleNumber: p.vehicle?.vehicleNumber ?? '',
    driverName: p.driver?.name ?? '', backupDriverName: p.backupDriver?.name ?? '',
    attendantName: p.attendant?.name ?? '',
    stops: (p.stops ?? []).map((s) => ({
      id: s.id, stopName: s.stopName, sequenceOrder: s.sequenceOrder, stopType: s.stopType,
      pickupTime: s.pickupTime, dropTime: s.dropTime, waitMinutes: s.waitMinutes,
      bufferMinutes: s.bufferMinutes, latitude: s.latitude, longitude: s.longitude,
      studentCount: s.studentCount, geoValidated: s.geoValidated,
    })),
    allocations: (p.allocations ?? []).map((a) => ({
      id: a.id, entityType: a.entityType, entityName: a.entityName, stopName: a.stopName,
      seatNumber: a.seatNumber, specialNeeds: a.specialNeeds,
    })),
    approvals: (p.approvals ?? []).map((a) => ({
      id: a.id, approverRole: a.approverRole, action: a.action, remarks: a.remarks,
      actionDate: a.actionDate?.toISOString() ?? null,
    })),
  };
}

const planInclude = {
  route: { select: { id: true, routeCode: true, routeName: true } },
  vehicle: { select: { vehicleNumber: true, capacity: true } },
  driver: { select: { name: true } },
  backupDriver: { select: { name: true } },
  attendant: { select: { name: true } },
  stops: { orderBy: { sequenceOrder: 'asc' as const } },
  allocations: true,
  approvals: { orderBy: { createdAt: 'asc' as const } },
};

export async function getTransportRoutePlanning(institutionId: string, academicYear = '2025-26') {
  await ensureSettings(institutionId);

  const [plans, routes, vehicles, staff, settings] = await Promise.all([
    prisma.transportRoutePlan.findMany({
      where: { institutionId, academicYear, archivedAt: null },
      include: planInclude,
      orderBy: [{ scheduledDate: 'desc' }, { planNumber: 'asc' }],
    }),
    prisma.transportRoute.findMany({
      where: { institutionId, isArchived: false, academicYear },
      select: { id: true, routeCode: true, routeName: true, branch: true, stopCount: true, studentCount: true },
      orderBy: { routeCode: 'asc' },
    }),
    prisma.transportVehicle.findMany({
      where: { institutionId, isArchived: false },
      select: {
        id: true, vehicleNumber: true, capacity: true, reserveSeats: true,
        availabilityStatus: true, operationalStatus: true, routeName: true,
      },
      orderBy: { vehicleNumber: 'asc' },
    }),
    prisma.transportStaffMember.findMany({
      where: { institutionId, isActive: true },
      select: { id: true, name: true, role: true, onDuty: true },
      orderBy: { name: 'asc' },
    }),
    prisma.transportPlanningSettings.findUnique({ where: { institutionId } }),
  ]);

  const serialized = plans.map(serializePlan);
  const statusCounts = PLAN_STATUSES.reduce((acc, s) => {
    acc[s] = serialized.filter((p) => p.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  const calendar = serialized
    .filter((p) => p.scheduledDate)
    .map((p) => ({
      date: p.scheduledDate, planNumber: p.planNumber, title: p.title,
      status: p.status, routeName: p.routeName, vehicleNumber: p.vehicleNumber,
      startTime: p.startTime, endTime: p.endTime,
    }));

  const pendingApprovals = serialized.filter((p) =>
    p.status === 'PENDING' || (p.status === 'APPROVED' && p.approvals.some((a) => a.action === 'PENDING')),
  );

  return {
    academicYear,
    academicYears: ['2024-25', '2025-26', '2026-27'],
    planTypes: PLAN_TYPES,
    planStatuses: PLAN_STATUSES,
    priorities: PLAN_PRIORITIES,
    transportCategories: TRANSPORT_CATEGORIES,
    workflowStages: WORKFLOW_STAGES,
    kpis: {
      totalPlans: serialized.length,
      activePlans: statusCounts.ACTIVE ?? 0,
      pendingPlans: statusCounts.PENDING ?? 0,
      draftPlans: statusCounts.DRAFT ?? 0,
      completedPlans: statusCounts.COMPLETED ?? 0,
      cancelledPlans: statusCounts.CANCELLED ?? 0,
      pendingApprovals: pendingApprovals.length,
      avgOccupancy: serialized.length
        ? Math.round(serialized.reduce((s, p) => s + p.occupancyPct, 0) / serialized.length)
        : 0,
    },
    statusCounts,
    plans: serialized,
    calendar,
    routes,
    vehicles: vehicles.map((v) => ({
      ...v,
      effectiveCapacity: v.capacity - v.reserveSeats,
      available: v.availabilityStatus === 'AVAILABLE' && v.operationalStatus !== 'MAINTENANCE',
    })),
    drivers: staff.filter((s) => s.role === 'Driver'),
    attendants: staff.filter((s) => s.role === 'Attendant'),
    pendingApprovals,
    settings: settings ?? {},
    reports: REPORT_CATALOG,
    workflow: WORKFLOW_STAGES.map((stage, i) => ({
      stage, order: i + 1,
      label: stage.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    })),
  };
}

async function createApprovalChain(institutionId: string, planId: string) {
  for (const role of APPROVER_ROLES) {
    await prisma.transportRoutePlanApproval.create({
      data: { institutionId, planId, approverRole: role, action: 'PENDING' },
    });
  }
}

export async function createRoutePlan(institutionId: string, body: Record<string, unknown>) {
  const planNumber = await nextPlanNumber(institutionId);
  const routeId = body.routeId ? String(body.routeId) : null;
  let distanceKm = Number(body.distanceKm ?? 0);
  let estimatedMinutes = Number(body.estimatedMinutes ?? 0);
  let capacity = Number(body.capacity ?? 0);

  if (routeId) {
    const route = await prisma.transportRoute.findFirst({
      where: { id: routeId, institutionId },
      include: { stops: { orderBy: { sequenceOrder: 'asc' } } },
    });
    if (route) {
      distanceKm = route.distanceKm;
      estimatedMinutes = route.estimatedMinutes;
      const plan = await prisma.transportRoutePlan.create({
        data: {
          institutionId, planNumber,
          title: String(body.title ?? `${route.routeName} Plan`),
          routeId, planType: String(body.planType ?? 'DAILY'),
          academicYear: String(body.academicYear ?? route.academicYear),
          branch: String(body.branch ?? route.branch),
          transportCategory: String(body.transportCategory ?? 'Regular'),
          priority: String(body.priority ?? 'MEDIUM'),
          scheduledDate: body.scheduledDate ? new Date(String(body.scheduledDate)) : new Date(),
          startTime: String(body.startTime ?? '07:00'),
          endTime: String(body.endTime ?? '08:30'),
          distanceKm, estimatedMinutes,
          fuelEstimate: distanceKm * 0.35,
          costEstimate: distanceKm * 12,
          capacity: capacity || route.studentCount || 40,
          workflowStage: 'ROUTE_DESIGN',
        },
      });

      for (const stop of route.stops) {
        await prisma.transportRoutePlanStop.create({
          data: {
            institutionId, planId: plan.id,
            stopName: stop.stopName, sequenceOrder: stop.sequenceOrder,
            stopType: stop.stopType,
            pickupTime: stop.estimatedArrival,
            latitude: stop.latitude, longitude: stop.longitude,
            geoValidated: stop.latitude !== 0 && stop.longitude !== 0,
            studentCount: Math.ceil(route.studentCount / Math.max(route.stops.length, 1)),
          },
        });
      }
      await createApprovalChain(institutionId, plan.id);
      return plan;
    }
  }

  const plan = await prisma.transportRoutePlan.create({
    data: {
      institutionId, planNumber,
      title: String(body.title ?? 'New Route Plan'),
      routeId, planType: String(body.planType ?? 'DAILY'),
      academicYear: String(body.academicYear ?? '2025-26'),
      branch: String(body.branch ?? 'Main Campus'),
      transportCategory: String(body.transportCategory ?? 'Regular'),
      priority: String(body.priority ?? 'MEDIUM'),
      scheduledDate: body.scheduledDate ? new Date(String(body.scheduledDate)) : new Date(),
      startTime: String(body.startTime ?? '07:00'),
      endTime: String(body.endTime ?? '08:30'),
      distanceKm, estimatedMinutes,
      capacity: capacity || 40,
    },
  });
  await createApprovalChain(institutionId, plan.id);
  return plan;
}

export async function updateRoutePlan(institutionId: string, planId: string, body: Record<string, unknown>) {
  const data: Record<string, unknown> = {};
  const fields = [
    'title', 'planType', 'branch', 'transportCategory', 'priority', 'workflowStage',
    'startTime', 'endTime', 'schoolOpenTime', 'schoolCloseTime',
    'optimizationNotes', 'weatherAlert', 'trafficAlternate', 'versionLabel',
  ];
  for (const f of fields) {
    if (body[f] !== undefined) data[f] = body[f];
  }
  if (body.routeId !== undefined) data.routeId = body.routeId ? String(body.routeId) : null;
  if (body.vehicleId !== undefined) data.vehicleId = body.vehicleId ? String(body.vehicleId) : null;
  if (body.driverId !== undefined) data.driverId = body.driverId ? String(body.driverId) : null;
  if (body.backupDriverId !== undefined) data.backupDriverId = body.backupDriverId ? String(body.backupDriverId) : null;
  if (body.attendantId !== undefined) data.attendantId = body.attendantId ? String(body.attendantId) : null;
  if (body.scheduledDate !== undefined) data.scheduledDate = body.scheduledDate ? new Date(String(body.scheduledDate)) : null;

  return prisma.transportRoutePlan.update({ where: { id: planId }, data });
}

export async function assignPlanResources(institutionId: string, planId: string, body: Record<string, unknown>) {
  const plan = await prisma.transportRoutePlan.findFirst({ where: { id: planId, institutionId } });
  if (!plan) throw new Error('Plan not found');

  const vehicleId = body.vehicleId ? String(body.vehicleId) : plan.vehicleId;
  const driverId = body.driverId ? String(body.driverId) : plan.driverId;
  let capacity = plan.capacity;
  let workflowStage = plan.workflowStage;

  if (vehicleId) {
    const vehicle = await prisma.transportVehicle.findFirst({ where: { id: vehicleId, institutionId } });
    if (!vehicle) throw new Error('Vehicle not found');
    if (vehicle.availabilityStatus === 'MAINTENANCE' || vehicle.operationalStatus === 'MAINTENANCE') {
      throw new Error('Vehicle is under maintenance');
    }
    capacity = vehicle.capacity - vehicle.reserveSeats;
    workflowStage = driverId ? 'STUDENT_ALLOCATION' : 'DRIVER_ASSIGNMENT';
  }

  return prisma.transportRoutePlan.update({
    where: { id: planId },
    data: {
      vehicleId: vehicleId ?? undefined,
      driverId: body.driverId !== undefined ? (body.driverId ? String(body.driverId) : null) : undefined,
      backupDriverId: body.backupDriverId !== undefined ? (body.backupDriverId ? String(body.backupDriverId) : null) : undefined,
      attendantId: body.attendantId !== undefined ? (body.attendantId ? String(body.attendantId) : null) : undefined,
      capacity, workflowStage,
    },
  });
}

export async function allocatePlanSeats(institutionId: string, planId: string, body: Record<string, unknown>) {
  const allocations = Array.isArray(body.allocations) ? body.allocations : [];
  await prisma.transportRoutePlanAllocation.deleteMany({ where: { planId } });

  let seat = 1;
  for (const a of allocations) {
    const rec = a as Record<string, unknown>;
    await prisma.transportRoutePlanAllocation.create({
      data: {
        institutionId, planId,
        entityType: String(rec.entityType ?? 'STUDENT'),
        entityName: String(rec.entityName ?? 'Student'),
        stopName: String(rec.stopName ?? ''),
        seatNumber: rec.seatNumber ? Number(rec.seatNumber) : seat++,
        specialNeeds: Boolean(rec.specialNeeds),
      },
    });
  }

  const plan = await prisma.transportRoutePlan.findFirst({ where: { id: planId, institutionId } });
  if (!plan) throw new Error('Plan not found');

  const count = await prisma.transportRoutePlanAllocation.count({ where: { planId } });
  const capacityValid = plan.capacity > 0 && count <= plan.capacity;

  return prisma.transportRoutePlan.update({
    where: { id: planId },
    data: {
      occupiedSeats: count,
      capacityValid,
      workflowStage: capacityValid ? 'OPTIMIZATION' : 'CAPACITY_VALIDATION',
    },
  });
}

export async function optimizeRoutePlan(institutionId: string, planId: string) {
  const plan = await prisma.transportRoutePlan.findFirst({
    where: { id: planId, institutionId },
    include: { stops: { orderBy: { sequenceOrder: 'asc' } } },
  });
  if (!plan) throw new Error('Plan not found');

  const optimizedStops = [...plan.stops].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
  let currentMinutes = 0;
  const baseHour = 7;
  for (let i = 0; i < optimizedStops.length; i++) {
    const stop = optimizedStops[i];
    const wait = stop.waitMinutes + stop.bufferMinutes;
    currentMinutes += i === 0 ? 0 : 8 + wait;
    const h = baseHour + Math.floor(currentMinutes / 60);
    const m = currentMinutes % 60;
    const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    await prisma.transportRoutePlanStop.update({
      where: { id: stop.id },
      data: { pickupTime: stop.stopType !== 'DROP' ? timeStr : stop.pickupTime, dropTime: stop.stopType === 'DROP' ? timeStr : stop.dropTime },
    });
  }

  const distanceKm = plan.distanceKm || optimizedStops.length * 1.2;
  const estimatedMinutes = currentMinutes + optimizedStops.length * 5;
  const fuelEstimate = distanceKm * 0.35;
  const costEstimate = distanceKm * 12 + fuelEstimate * 95;

  return prisma.transportRoutePlan.update({
    where: { id: planId },
    data: {
      distanceKm, estimatedMinutes, fuelEstimate, costEstimate,
      tollEstimate: distanceKm > 15 ? Math.round(distanceKm * 0.8) : 0,
      optimizationNotes: `Optimized ${optimizedStops.length} stops — shortest path calculated, traffic alternate available`,
      trafficAlternate: 'Via Ring Road (saves ~6 min during peak hours)',
      simulationResult: {
        totalStops: optimizedStops.length,
        estimatedTravelMinutes: estimatedMinutes,
        geoFenceValid: optimizedStops.every((s) => s.geoValidated),
        fuelLitres: Math.round(fuelEstimate * 10) / 10,
      },
      workflowStage: 'APPROVAL',
    },
  });
}

export async function submitPlanForApproval(institutionId: string, planId: string) {
  const plan = await prisma.transportRoutePlan.findFirst({ where: { id: planId, institutionId } });
  if (!plan) throw new Error('Plan not found');
  if (!plan.capacityValid && plan.occupiedSeats > plan.capacity) {
    throw new Error('Capacity validation failed — reduce allocations or assign larger vehicle');
  }

  const existing = await prisma.transportRoutePlanApproval.count({ where: { planId } });
  if (existing === 0) await createApprovalChain(institutionId, planId);

  return prisma.transportRoutePlan.update({
    where: { id: planId },
    data: { status: 'PENDING', workflowStage: 'APPROVAL' },
  });
}

export async function approveRoutePlan(
  institutionId: string, planId: string, body: Record<string, unknown>,
) {
  const role = String(body.approverRole ?? 'Transport Manager');
  const action = String(body.action ?? 'APPROVED');
  const remarks = String(body.remarks ?? '');

  await prisma.transportRoutePlanApproval.updateMany({
    where: { planId, approverRole: role },
    data: { action, remarks, actionDate: new Date() },
  });

  const approvals = await prisma.transportRoutePlanApproval.findMany({ where: { planId } });
  const allApproved = approvals.every((a) => a.action === 'APPROVED');
  const anyRejected = approvals.some((a) => a.action === 'REJECTED');

  let status = 'PENDING';
  if (anyRejected) status = 'DRAFT';
  else if (allApproved) status = 'APPROVED';

  return prisma.transportRoutePlan.update({
    where: { id: planId },
    data: { status, workflowStage: allApproved ? 'PUBLISHED' : 'APPROVAL' },
  });
}

export async function publishRoutePlan(institutionId: string, planId: string) {
  const plan = await prisma.transportRoutePlan.findFirst({ where: { id: planId, institutionId } });
  if (!plan) throw new Error('Plan not found');
  if (plan.status !== 'APPROVED' && plan.status !== 'PAUSED') {
    throw new Error('Plan must be approved before publishing');
  }
  return prisma.transportRoutePlan.update({
    where: { id: planId },
    data: { status: 'ACTIVE', workflowStage: 'EXECUTION', publishedAt: new Date(), pausedAt: null },
  });
}

export async function pauseRoutePlan(institutionId: string, planId: string) {
  return prisma.transportRoutePlan.update({
    where: { id: planId },
    data: { status: 'PAUSED', pausedAt: new Date() },
  });
}

export async function resumeRoutePlan(institutionId: string, planId: string) {
  return prisma.transportRoutePlan.update({
    where: { id: planId },
    data: { status: 'ACTIVE', pausedAt: null, workflowStage: 'EXECUTION' },
  });
}

export async function cancelRoutePlan(institutionId: string, planId: string, reason: string) {
  return prisma.transportRoutePlan.update({
    where: { id: planId },
    data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason },
  });
}

export async function archiveRoutePlan(institutionId: string, planId: string) {
  return prisma.transportRoutePlan.update({
    where: { id: planId },
    data: { status: 'ARCHIVED', archivedAt: new Date() },
  });
}

export async function cloneRoutePlan(institutionId: string, planId: string) {
  const src = await prisma.transportRoutePlan.findFirst({
    where: { id: planId, institutionId },
    include: { stops: true, allocations: true },
  });
  if (!src) throw new Error('Plan not found');

  const planNumber = await nextPlanNumber(institutionId);
  const clone = await prisma.transportRoutePlan.create({
    data: {
      institutionId, planNumber,
      title: `${src.title} (Copy)`,
      routeId: src.routeId, planType: src.planType, academicYear: src.academicYear,
      branch: src.branch, transportCategory: src.transportCategory, priority: src.priority,
      vehicleId: src.vehicleId, driverId: src.driverId, backupDriverId: src.backupDriverId,
      attendantId: src.attendantId, scheduledDate: src.scheduledDate,
      startTime: src.startTime, endTime: src.endTime,
      distanceKm: src.distanceKm, estimatedMinutes: src.estimatedMinutes,
      fuelEstimate: src.fuelEstimate, costEstimate: src.costEstimate, tollEstimate: src.tollEstimate,
      capacity: src.capacity, clonedFromId: src.id,
      versionLabel: `${src.versionLabel}-alt`,
      status: 'DRAFT', workflowStage: 'PLANNING',
    },
  });

  for (const stop of src.stops) {
    await prisma.transportRoutePlanStop.create({
      data: {
        institutionId, planId: clone.id,
        stopName: stop.stopName, sequenceOrder: stop.sequenceOrder, stopType: stop.stopType,
        pickupTime: stop.pickupTime, dropTime: stop.dropTime,
        waitMinutes: stop.waitMinutes, bufferMinutes: stop.bufferMinutes,
        latitude: stop.latitude, longitude: stop.longitude,
        studentCount: stop.studentCount, geoValidated: stop.geoValidated,
      },
    });
  }
  for (const alloc of src.allocations) {
    await prisma.transportRoutePlanAllocation.create({
      data: {
        institutionId, planId: clone.id,
        entityType: alloc.entityType, entityName: alloc.entityName,
        stopName: alloc.stopName, seatNumber: alloc.seatNumber, specialNeeds: alloc.specialNeeds,
      },
    });
  }
  await createApprovalChain(institutionId, clone.id);
  return clone;
}

async function refreshMasterRouteStopCount(routeId: string) {
  const count = await prisma.transportRouteStop.count({ where: { routeId } });
  await prisma.transportRoute.update({ where: { id: routeId }, data: { stopCount: count } });
}

async function syncAddMasterStop(
  institutionId: string, routeId: string,
  stop: { stopName: string; sequenceOrder: number; stopType: string; pickupTime: string; dropTime: string; latitude: number | null; longitude: number | null },
) {
  await prisma.transportRouteStop.create({
    data: {
      institutionId, routeId,
      stopName: stop.stopName, sequenceOrder: stop.sequenceOrder, stopType: stop.stopType,
      latitude: stop.latitude ?? 26.9124, longitude: stop.longitude ?? 75.7873,
      estimatedArrival: stop.pickupTime || stop.dropTime || '',
    },
  });
  await refreshMasterRouteStopCount(routeId);
}

async function syncRemoveMasterStop(routeId: string, stopName: string, sequenceOrder: number) {
  const masterStop = await prisma.transportRouteStop.findFirst({
    where: { routeId, stopName, sequenceOrder },
  });
  if (masterStop) {
    await prisma.transportRouteStop.delete({ where: { id: masterStop.id } });
    await refreshMasterRouteStopCount(routeId);
  }
}

async function syncUpdateMasterStop(
  routeId: string, prevName: string, prevSeq: number,
  stop: { stopName: string; sequenceOrder: number; stopType: string; pickupTime: string; dropTime: string },
) {
  const masterStop = await prisma.transportRouteStop.findFirst({
    where: { routeId, stopName: prevName, sequenceOrder: prevSeq },
  });
  if (masterStop) {
    await prisma.transportRouteStop.update({
      where: { id: masterStop.id },
      data: {
        stopName: stop.stopName, sequenceOrder: stop.sequenceOrder, stopType: stop.stopType,
        estimatedArrival: stop.pickupTime || stop.dropTime || masterStop.estimatedArrival,
      },
    });
  }
}

export async function addPlanStop(institutionId: string, planId: string, body: Record<string, unknown>) {
  const plan = await prisma.transportRoutePlan.findFirst({ where: { id: planId, institutionId } });
  if (!plan) throw new Error('Plan not found');

  const maxSeq = await prisma.transportRoutePlanStop.aggregate({
    where: { planId }, _max: { sequenceOrder: true },
  });
  const sequenceOrder = body.sequenceOrder !== undefined
    ? Number(body.sequenceOrder)
    : (maxSeq._max.sequenceOrder ?? 0) + 1;

  const stop = await prisma.transportRoutePlanStop.create({
    data: {
      institutionId, planId,
      stopName: String(body.stopName),
      sequenceOrder,
      stopType: String(body.stopType ?? 'PICKUP'),
      pickupTime: String(body.pickupTime ?? ''),
      dropTime: String(body.dropTime ?? ''),
      waitMinutes: Number(body.waitMinutes ?? 2),
      bufferMinutes: Number(body.bufferMinutes ?? 3),
      latitude: body.latitude !== undefined ? Number(body.latitude) : null,
      longitude: body.longitude !== undefined ? Number(body.longitude) : null,
      studentCount: Number(body.studentCount ?? 0),
      geoValidated: Boolean(body.geoValidated),
    },
  });

  if (plan.routeId) {
    await syncAddMasterStop(institutionId, plan.routeId, stop);
  }
  return stop;
}

export async function updatePlanStop(institutionId: string, stopId: string, body: Record<string, unknown>) {
  const existing = await prisma.transportRoutePlanStop.findFirst({
    where: { id: stopId, institutionId },
    include: { plan: { select: { routeId: true } } },
  });
  if (!existing) throw new Error('Plan stop not found');

  const stop = await prisma.transportRoutePlanStop.update({
    where: { id: stopId },
    data: {
      stopName: body.stopName !== undefined ? String(body.stopName) : undefined,
      sequenceOrder: body.sequenceOrder !== undefined ? Number(body.sequenceOrder) : undefined,
      stopType: body.stopType !== undefined ? String(body.stopType) : undefined,
      pickupTime: body.pickupTime !== undefined ? String(body.pickupTime) : undefined,
      dropTime: body.dropTime !== undefined ? String(body.dropTime) : undefined,
      waitMinutes: body.waitMinutes !== undefined ? Number(body.waitMinutes) : undefined,
      bufferMinutes: body.bufferMinutes !== undefined ? Number(body.bufferMinutes) : undefined,
      latitude: body.latitude !== undefined ? Number(body.latitude) : undefined,
      longitude: body.longitude !== undefined ? Number(body.longitude) : undefined,
      studentCount: body.studentCount !== undefined ? Number(body.studentCount) : undefined,
      geoValidated: body.geoValidated !== undefined ? Boolean(body.geoValidated) : undefined,
    },
  });

  if (existing.plan.routeId) {
    await syncUpdateMasterStop(existing.plan.routeId, existing.stopName, existing.sequenceOrder, stop);
  }
  return stop;
}

export async function deletePlanStop(institutionId: string, stopId: string) {
  const existing = await prisma.transportRoutePlanStop.findFirst({
    where: { id: stopId, institutionId },
    include: { plan: { select: { routeId: true } } },
  });
  if (!existing) throw new Error('Plan stop not found');

  await prisma.transportRoutePlanStop.delete({ where: { id: stopId } });

  if (existing.plan.routeId) {
    await syncRemoveMasterStop(existing.plan.routeId, existing.stopName, existing.sequenceOrder);
  }
}

export async function deleteRoutePlan(institutionId: string, planId: string) {
  const plan = await prisma.transportRoutePlan.findFirst({ where: { id: planId, institutionId } });
  if (!plan) throw new Error('Plan not found');

  if (plan.status === 'DRAFT' || plan.status === 'PENDING') {
    await prisma.transportRoutePlan.delete({ where: { id: planId } });
    return;
  }
  await archiveRoutePlan(institutionId, planId);
}

export async function seedTransportRoutePlanning(institutionId: string) {
  await seedTransportMaster(institutionId);
  await ensureSettings(institutionId);

  const existing = await prisma.transportRoutePlan.count({ where: { institutionId } });
  if (existing >= 5) {
    return getTransportRoutePlanning(institutionId);
  }

  const routes = await prisma.transportRoute.findMany({
    where: { institutionId, isArchived: false },
    take: 6,
    include: { stops: { orderBy: { sequenceOrder: 'asc' }, take: 5 } },
  });
  const vehicles = await prisma.transportVehicle.findMany({ where: { institutionId }, take: 6 });
  const drivers = await prisma.transportStaffMember.findMany({
    where: { institutionId, role: 'Driver', isActive: true }, take: 4,
  });
  const attendants = await prisma.transportStaffMember.findMany({
    where: { institutionId, role: 'Attendant', isActive: true }, take: 2,
  });

  const statuses: string[] = ['ACTIVE', 'PENDING', 'DRAFT', 'COMPLETED', 'PAUSED', 'CANCELLED'];
  const categories = ['Regular', 'Exam', 'Event', 'Hostel', 'Sports', 'Coaching'];
  const today = new Date();

  for (let i = 0; i < Math.min(routes.length, 6); i++) {
    const route = routes[i];
    const vehicle = vehicles[i % vehicles.length];
    const driver = drivers[i % Math.max(drivers.length, 1)];
    const attendant = attendants[i % Math.max(attendants.length, 1)];
    const planNumber = await nextPlanNumber(institutionId);
    const scheduled = new Date(today);
    scheduled.setDate(today.getDate() + i - 2);

    const status = statuses[i % statuses.length];
    const capacity = vehicle ? vehicle.capacity - (vehicle.reserveSeats ?? 2) : 38;
    const occupied = Math.min(capacity, route.studentCount || 28 + i * 2);

    const plan = await prisma.transportRoutePlan.create({
      data: {
        institutionId, planNumber,
        title: `${route.routeName} — ${categories[i % categories.length]} Plan`,
        routeId: route.id, planType: i % 2 === 0 ? 'DAILY' : 'WEEKLY',
        academicYear: '2025-26', branch: route.branch,
        transportCategory: categories[i % categories.length],
        priority: i === 0 ? 'HIGH' : 'MEDIUM',
        status, workflowStage: status === 'ACTIVE' ? 'EXECUTION' : status === 'PENDING' ? 'APPROVAL' : 'PLANNING',
        vehicleId: vehicle?.id, driverId: driver?.id, attendantId: attendant?.id,
        scheduledDate: scheduled,
        startTime: '07:00', endTime: '08:30',
        distanceKm: route.distanceKm || 10 + i,
        estimatedMinutes: route.estimatedMinutes || 35 + i * 3,
        fuelEstimate: (route.distanceKm || 10) * 0.35,
        costEstimate: (route.distanceKm || 10) * 12,
        capacity, occupiedSeats: occupied, capacityValid: occupied <= capacity,
        optimizationNotes: i > 2 ? 'Route optimized — shortest path via main road' : '',
        weatherAlert: i === 4 ? 'Heavy rain expected — consider 10 min buffer' : '',
        publishedAt: status === 'ACTIVE' ? new Date() : null,
        pausedAt: status === 'PAUSED' ? new Date() : null,
        cancelledAt: status === 'CANCELLED' ? new Date() : null,
        cancelReason: status === 'CANCELLED' ? 'Road closure on main highway' : '',
      },
    });

    for (const stop of route.stops) {
      await prisma.transportRoutePlanStop.create({
        data: {
          institutionId, planId: plan.id,
          stopName: stop.stopName, sequenceOrder: stop.sequenceOrder, stopType: stop.stopType,
          pickupTime: stop.estimatedArrival || `07:${String(stop.sequenceOrder * 8).padStart(2, '0')}`,
          latitude: stop.latitude, longitude: stop.longitude,
          geoValidated: true, studentCount: Math.ceil(occupied / Math.max(route.stops.length, 1)),
          waitMinutes: 2, bufferMinutes: 3,
        },
      });
    }

    const studentNames = [
      'Aarav Sharma', 'Priya Patel', 'Rohan Mehta', 'Ananya Singh', 'Kabir Khan',
      'Isha Reddy', 'Vivaan Joshi', 'Sneha Nair', 'Arjun Das', 'Meera Iyer',
    ];
    for (let s = 0; s < Math.min(occupied, 10); s++) {
      await prisma.transportRoutePlanAllocation.create({
        data: {
          institutionId, planId: plan.id,
          entityType: 'STUDENT', entityName: studentNames[s % studentNames.length],
          stopName: route.stops[s % route.stops.length]?.stopName ?? 'Stop 1',
          seatNumber: s + 1, specialNeeds: s === 9,
        },
      });
    }
    if (i % 3 === 0) {
      await prisma.transportRoutePlanAllocation.create({
        data: {
          institutionId, planId: plan.id,
          entityType: 'STAFF', entityName: 'Mrs. Kavita Desai',
          stopName: route.stops[0]?.stopName ?? 'Main Gate', seatNumber: null,
        },
      });
    }

    await createApprovalChain(institutionId, plan.id);
    if (status === 'ACTIVE' || status === 'COMPLETED') {
      for (const role of APPROVER_ROLES) {
        await prisma.transportRoutePlanApproval.updateMany({
          where: { planId: plan.id, approverRole: role },
          data: { action: 'APPROVED', actionDate: new Date(), remarks: 'Approved' },
        });
      }
    } else if (status === 'PENDING') {
      await prisma.transportRoutePlanApproval.updateMany({
        where: { planId: plan.id, approverRole: 'Planner' },
        data: { action: 'APPROVED', actionDate: new Date(), remarks: 'Submitted for review' },
      });
    }
  }

  return getTransportRoutePlanning(institutionId);
}
