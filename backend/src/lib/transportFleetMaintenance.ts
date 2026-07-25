import { prisma } from './prisma.js';
import type { Prisma } from '@prisma/client';
import { seedTransportFeeManagement } from './transportFeeManagement.js';

export const HEALTH_STATUSES = ['HEALTHY', 'DUE_FOR_SERVICE', 'BREAKDOWN', 'UNDER_MAINTENANCE', 'CONDEMNED'];
export const AVAILABILITY_STATUSES = ['AVAILABLE', 'RUNNING', 'RESERVED', 'BREAKDOWN', 'MAINTENANCE'];
export const WORK_ORDER_STATUSES = ['OPEN', 'IN_PROGRESS', 'QC', 'COMPLETED', 'CANCELLED'];
export const SERVICE_TYPES = ['PREVENTIVE', 'BREAKDOWN', 'AMC', 'OIL_CHANGE', 'TYRE', 'BRAKE', 'AC', 'ELECTRICAL', 'GPS', 'CCTV', 'EMERGENCY'];
export const DOC_TYPES = ['INSURANCE', 'FITNESS', 'PUC', 'RC', 'PERMIT', 'ROAD_TAX', 'WARRANTY'];
export const INSPECTION_TYPES = ['DAILY', 'PRE_TRIP', 'POST_TRIP', 'PRE_SERVICE', 'POST_SERVICE'];

const REPORT_CATALOG = [
  'Fleet Register Report', 'Vehicle Health Report', 'Vehicle Availability Report',
  'Preventive Maintenance Report', 'Maintenance Schedule Report', 'Service History Report',
  'Work Order Report', 'Workshop Performance Report', 'Vehicle Breakdown Report',
  'Accident Register Report', 'Insurance Expiry Report', 'Insurance Claim Report',
  'Fitness Certificate Report', 'Pollution Certificate Report', 'Permit Expiry Report',
  'Road Tax Report', 'RC Expiry Report', 'Warranty Report', 'Tyre Lifecycle Report',
  'Battery Lifecycle Report', 'Spare Parts Consumption Report', 'Spare Parts Inventory Report',
  'Vendor Performance Report', 'Maintenance Cost Report', 'Vehicle Cost Analysis Report',
  'Lubricant Consumption Report', 'Daily Inspection Report', 'Fuel Consumption Report',
  'Fleet Depreciation Report', 'Vehicle Downtime Report', 'Fleet Utilization Report',
  'AMC Compliance Report', 'Fleet KPI Dashboard', 'Audit Trail Report', 'Fleet Analytics Dashboard',
];

const WORKFLOW = [
  'Vehicle Registered', 'Daily Inspection', 'Preventive Maintenance Due', 'Service Work Order',
  'Workshop Assignment', 'Repair & Spare Parts', 'Quality Inspection', 'Vehicle Ready',
  'Trip Allocation', 'Maintenance History Updated',
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

function daysUntil(d: Date | null): number | null {
  if (!d) return null;
  return Math.ceil((d.getTime() - todayDate().getTime()) / 86400000);
}

function computeHealthScore(v: {
  healthStatus: string; availabilityStatus: string;
  maintenanceDueDays: number | null;
  complianceExpiring?: number;
}) {
  let score = 100;
  if (v.healthStatus === 'DUE_FOR_SERVICE') score -= 15;
  if (v.healthStatus === 'BREAKDOWN' || v.healthStatus === 'UNDER_MAINTENANCE') score -= 40;
  if (v.healthStatus === 'CONDEMNED') score = 10;
  if (v.availabilityStatus === 'BREAKDOWN' || v.availabilityStatus === 'MAINTENANCE') score -= 20;
  if (v.maintenanceDueDays != null && v.maintenanceDueDays <= 7) score -= 10;
  if ((v.complianceExpiring ?? 0) > 0) score -= 5 * (v.complianceExpiring ?? 0);
  return Math.max(0, Math.min(100, score));
}

async function ensureSettings(institutionId: string) {
  let row = await prisma.transportFleetSettings.findUnique({ where: { institutionId } });
  if (!row) {
    row = await prisma.transportFleetSettings.create({
      data: {
        institutionId,
        defaultServiceKm: 5000,
        defaultServiceDays: 90,
        reminderDaysBefore: 7,
        roleMatrix: [
          { role: 'Fleet Manager', permissions: 'Full fleet maintenance, work orders, fuel, compliance, vendors' },
          { role: 'Transport Manager', permissions: 'Approve work orders, monitor schedules, assign replacement vehicles' },
          { role: 'Accounts', permissions: 'Approve expenses, fuel bills, vendor payments, insurance claims' },
          { role: 'Principal', permissions: 'Fleet health, compliance, costs, analytics' },
          { role: 'Driver', permissions: 'Daily inspection, fuel entry, defect reports, maintenance requests' },
        ],
        notificationRules: {
          channels: ['Push', 'SMS', 'Email', 'In-App'],
          events: ['Service due', 'Compliance expiry', 'Breakdown', 'Work order assigned', 'Vehicle ready'],
        },
        mobileSyncRules: {
          driverApp: ['Daily inspection', 'Report defects', 'Fuel entry', 'Odometer', 'Accidents', 'Maintenance requests'],
          transportManagerApp: ['Fleet availability', 'Approve work orders', 'Service schedules', 'Fuel tracking', 'Breakdown alerts'],
          accountsApp: ['Approve expenses', 'Fuel bills', 'Vendor payments', 'Insurance claims', 'Depreciation'],
          principalApp: ['Fleet health', 'Unavailable vehicles', 'Maintenance costs', 'Compliance expiry', 'Analytics'],
        },
        reportCatalog: REPORT_CATALOG,
      },
    });
  }
  return row;
}

async function audit(institutionId: string, entityType: string, action: string, details = '', entityId = '') {
  await prisma.transportFleetAuditLog.create({
    data: { institutionId, entityType, entityId, action, details, performedBy: 'Fleet Manager' },
  });
}

async function nextWoNumber(institutionId: string) {
  const n = await prisma.transportFleetWorkOrder.count({ where: { institutionId } });
  return `WO-${String(n + 1).padStart(5, '0')}`;
}

function serializeVehicle(v: {
  id: string; vehicleNumber: string; registrationNumber: string; vehicleType: string;
  make: string; model: string; healthStatus: string; availabilityStatus: string;
  operationalStatus: string; maintenanceDueDays: number | null; fuelType: string;
  capacity: number; routeName: string; driverName: string;
}, complianceExpiring = 0) {
  const healthScore = computeHealthScore({ ...v, complianceExpiring });
  return {
    id: v.id, vehicleNumber: v.vehicleNumber, registrationNumber: v.registrationNumber,
    vehicleType: v.vehicleType, make: v.make, model: v.model,
    healthStatus: v.healthStatus, availabilityStatus: v.availabilityStatus,
    operationalStatus: v.operationalStatus, maintenanceDueDays: v.maintenanceDueDays,
    fuelType: v.fuelType, capacity: v.capacity, routeName: v.routeName,
    driverName: v.driverName, healthScore, reliabilityIndex: healthScore >= 80 ? 'HIGH' : healthScore >= 50 ? 'MEDIUM' : 'LOW',
  };
}

export async function getTransportFleetMaintenance(institutionId: string) {
  await ensureSettings(institutionId);

  const [vehicles, workOrders, schedules, compliance, fuelEntries, spareParts, vendors, inspections, tyres, auditLogs, settings, incidents] = await Promise.all([
    prisma.transportVehicle.findMany({
      where: { institutionId, isActive: true, isArchived: false },
      orderBy: { vehicleNumber: 'asc' },
    }),
    prisma.transportFleetWorkOrder.findMany({
      where: { institutionId },
      include: { vehicle: { select: { vehicleNumber: true } }, vendor: { select: { vendorName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 40,
    }),
    prisma.transportFleetServiceSchedule.findMany({
      where: { institutionId },
      include: { vehicle: { select: { vehicleNumber: true } } },
      orderBy: { nextDueDate: 'asc' },
      take: 30,
    }),
    prisma.transportFleetComplianceDoc.findMany({
      where: { institutionId },
      include: { vehicle: { select: { vehicleNumber: true } } },
      orderBy: { expiryDate: 'asc' },
    }),
    prisma.transportFleetFuelEntry.findMany({
      where: { institutionId },
      include: { vehicle: { select: { vehicleNumber: true } } },
      orderBy: { fillDate: 'desc' },
      take: 40,
    }),
    prisma.transportFleetSparePart.findMany({ where: { institutionId }, orderBy: { partName: 'asc' } }),
    prisma.transportFleetVendor.findMany({ where: { institutionId }, orderBy: { vendorName: 'asc' } }),
    prisma.transportFleetInspection.findMany({
      where: { institutionId },
      include: { vehicle: { select: { vehicleNumber: true } } },
      orderBy: { createdAt: 'desc' },
      take: 25,
    }),
    prisma.transportFleetTyre.findMany({
      where: { institutionId },
      include: { vehicle: { select: { vehicleNumber: true } } },
    }),
    prisma.transportFleetAuditLog.findMany({
      where: { institutionId }, orderBy: { createdAt: 'desc' }, take: 25,
    }),
    prisma.transportFleetSettings.findUnique({ where: { institutionId } }),
    prisma.transportIncident.findMany({
      where: { institutionId },
      include: { vehicle: { select: { vehicleNumber: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  const today = todayDate();
  const expiringDocs = compliance.filter((d) => d.expiryDate && d.expiryDate <= new Date(today.getTime() + 30 * 86400000));
  const complianceByVehicle = new Map<string, number>();
  for (const d of expiringDocs) {
    complianceByVehicle.set(d.vehicleId, (complianceByVehicle.get(d.vehicleId) ?? 0) + 1);
  }

  const serializedVehicles = vehicles.map((v) => serializeVehicle(v, complianceByVehicle.get(v.id) ?? 0));
  const totalFuelCost = fuelEntries.reduce((s, f) => s + f.amount, 0);
  const totalFuelLitres = fuelEntries.reduce((s, f) => s + f.litres, 0);
  const maintenanceCost = workOrders.reduce((s, w) => s + w.totalCost, 0);

  return {
    healthStatuses: HEALTH_STATUSES,
    availabilityStatuses: AVAILABILITY_STATUSES,
    workOrderStatuses: WORK_ORDER_STATUSES,
    serviceTypes: SERVICE_TYPES,
    docTypes: DOC_TYPES,
    inspectionTypes: INSPECTION_TYPES,
    workflow: WORKFLOW,
    kpis: {
      totalVehicles: vehicles.length,
      healthy: serializedVehicles.filter((v) => v.healthStatus === 'HEALTHY' || v.healthStatus === 'EXCELLENT').length,
      dueForService: serializedVehicles.filter((v) => v.healthStatus === 'DUE_FOR_SERVICE' || (v.maintenanceDueDays != null && v.maintenanceDueDays <= 7)).length,
      underMaintenance: serializedVehicles.filter((v) => v.availabilityStatus === 'MAINTENANCE' || v.healthStatus === 'UNDER_MAINTENANCE').length,
      breakdown: serializedVehicles.filter((v) => v.availabilityStatus === 'BREAKDOWN').length,
      available: serializedVehicles.filter((v) => v.availabilityStatus === 'AVAILABLE').length,
      openWorkOrders: workOrders.filter((w) => ['OPEN', 'IN_PROGRESS'].includes(w.status)).length,
      complianceExpiring: expiringDocs.length,
      totalFuelCost, totalFuelLitres,
      avgFuelCostPerLitre: totalFuelLitres > 0 ? Math.round(totalFuelCost / totalFuelLitres * 100) / 100 : 0,
      maintenanceCost,
      sparePartsLow: spareParts.filter((p) => p.quantity <= p.reorderLevel).length,
      avgHealthScore: serializedVehicles.length
        ? Math.round(serializedVehicles.reduce((s, v) => s + v.healthScore, 0) / serializedVehicles.length) : 0,
    },
    vehicles: serializedVehicles,
    workOrders: workOrders.map((w) => ({
      id: w.id, workOrderNumber: w.workOrderNumber, vehicleNumber: w.vehicle.vehicleNumber,
      vendorName: w.vendor?.vendorName ?? 'Internal Workshop',
      serviceType: w.serviceType, workshopType: w.workshopType, priority: w.priority,
      status: w.status, scheduledDate: w.scheduledDate?.toISOString().slice(0, 10) ?? '',
      completedDate: w.completedDate?.toISOString().slice(0, 10) ?? '',
      odometerReading: w.odometerReading, totalCost: w.totalCost,
      labourCost: w.labourCost, partsCost: w.partsCost, vendorCost: w.vendorCost,
      description: w.description, assignedTo: w.assignedTo, qcPassed: w.qcPassed,
    })),
    schedules: schedules.map((s) => ({
      id: s.id, vehicleNumber: s.vehicle.vehicleNumber,
      scheduleType: s.scheduleType, serviceType: s.serviceType,
      intervalValue: s.intervalValue, lastServiceDate: s.lastServiceDate?.toISOString().slice(0, 10) ?? '',
      nextDueDate: s.nextDueDate?.toISOString().slice(0, 10) ?? '',
      nextDueKm: s.nextDueKm, status: s.status,
      daysUntilDue: daysUntil(s.nextDueDate),
    })),
    compliance: compliance.map((d) => ({
      id: d.id, vehicleNumber: d.vehicle.vehicleNumber, docType: d.docType,
      documentNumber: d.documentNumber,
      issueDate: d.issueDate?.toISOString().slice(0, 10) ?? '',
      expiryDate: d.expiryDate?.toISOString().slice(0, 10) ?? '',
      status: d.expiryDate && d.expiryDate < today ? 'EXPIRED' : d.status,
      daysUntilExpiry: daysUntil(d.expiryDate),
      claimStatus: d.claimStatus,
    })),
    fuelEntries: fuelEntries.map((f) => ({
      id: f.id, vehicleNumber: f.vehicle.vehicleNumber,
      fillDate: f.fillDate.toISOString().slice(0, 10),
      litres: f.litres, amount: f.amount, odometerReading: f.odometerReading,
      fuelStation: f.fuelStation, paymentMode: f.paymentMode,
      mileageKm: f.mileageKm, costPerLitre: f.costPerLitre, driverName: f.driverName,
    })),
    spareParts: spareParts.map((p) => ({
      id: p.id, partCode: p.partCode, partName: p.partName, category: p.category,
      quantity: p.quantity, reorderLevel: p.reorderLevel, unitCost: p.unitCost,
      status: p.quantity <= p.reorderLevel ? 'LOW_STOCK' : p.status,
    })),
    vendors: vendors.map((v) => ({
      id: v.id, vendorCode: v.vendorCode, vendorName: v.vendorName,
      vendorType: v.vendorType, contactPerson: v.contactPerson, mobile: v.mobile,
      amcContract: v.amcContract, amcExpiry: v.amcExpiry?.toISOString().slice(0, 10) ?? '',
      rating: v.rating, status: v.status,
    })),
    inspections: inspections.map((i) => ({
      id: i.id, vehicleNumber: i.vehicle.vehicleNumber,
      inspectionType: i.inspectionType, status: i.status,
      odometerReading: i.odometerReading, inspectorName: i.inspectorName,
      defectsFound: i.defectsFound, createdAt: i.createdAt.toISOString(),
      relativeTime: relativeTime(i.createdAt),
    })),
    tyres: tyres.map((t) => ({
      id: t.id, vehicleNumber: t.vehicle.vehicleNumber, tyreNumber: t.tyreNumber,
      position: t.position, brand: t.brand, treadDepthMm: t.treadDepthMm,
      usedKm: t.usedKm, expectedLifeKm: t.expectedLifeKm,
      lifePct: t.expectedLifeKm > 0 ? Math.round((1 - t.usedKm / t.expectedLifeKm) * 100) : 0,
      status: t.status,
    })),
    breakdowns: incidents.map((i) => ({
      id: i.id, vehicleNumber: i.vehicle.vehicleNumber,
      incidentType: i.incidentType, description: i.description,
      resolved: Boolean(i.resolvedAt), createdAt: i.createdAt.toISOString(),
    })),
    auditLogs: auditLogs.map((a) => ({
      id: a.id, entityType: a.entityType, action: a.action, details: a.details,
      performedBy: a.performedBy, relativeTime: relativeTime(a.createdAt),
    })),
    settings,
    reports: REPORT_CATALOG,
  };
}

export async function createWorkOrder(institutionId: string, body: Record<string, unknown>) {
  const woNumber = await nextWoNumber(institutionId);
  const labour = Number(body.labourCost ?? 0);
  const parts = Number(body.partsCost ?? 0);
  const vendor = Number(body.vendorCost ?? 0);

  const wo = await prisma.transportFleetWorkOrder.create({
    data: {
      institutionId, workOrderNumber: woNumber,
      vehicleId: String(body.vehicleId),
      vendorId: body.vendorId ? String(body.vendorId) : null,
      serviceType: String(body.serviceType ?? 'PREVENTIVE'),
      workshopType: String(body.workshopType ?? 'INTERNAL'),
      priority: String(body.priority ?? 'NORMAL'),
      status: 'OPEN',
      scheduledDate: body.scheduledDate ? new Date(String(body.scheduledDate)) : todayDate(),
      odometerReading: Number(body.odometerReading ?? 0),
      labourCost: labour, partsCost: parts, vendorCost: vendor,
      totalCost: labour + parts + vendor,
      description: String(body.description ?? ''),
      assignedTo: String(body.assignedTo ?? ''),
    },
  });

  await prisma.transportVehicle.update({
    where: { id: String(body.vehicleId) },
    data: { availabilityStatus: 'MAINTENANCE', healthStatus: 'UNDER_MAINTENANCE' },
  });

  await audit(institutionId, 'WORK_ORDER', 'Created', woNumber, wo.id);
  return wo;
}

export async function updateWorkOrderStatus(institutionId: string, workOrderId: string, status: string) {
  const wo = await prisma.transportFleetWorkOrder.findFirst({
    where: { id: workOrderId, institutionId },
  });
  if (!wo) throw new Error('Work order not found');

  const data: Prisma.TransportFleetWorkOrderUpdateInput = { status };
  if (status === 'COMPLETED') {
    data.completedDate = todayDate();
    data.qcPassed = true;
    await prisma.transportVehicle.update({
      where: { id: wo.vehicleId },
      data: { availabilityStatus: 'AVAILABLE', healthStatus: 'HEALTHY', maintenanceDueDays: 90 },
    });
  }

  await prisma.transportFleetWorkOrder.update({ where: { id: workOrderId }, data });
  await audit(institutionId, 'WORK_ORDER', status, wo.workOrderNumber, workOrderId);
}

export async function recordFuelEntry(institutionId: string, body: Record<string, unknown>) {
  const litres = Number(body.litres ?? 0);
  const amount = Number(body.amount ?? 0);
  const entry = await prisma.transportFleetFuelEntry.create({
    data: {
      institutionId,
      vehicleId: String(body.vehicleId),
      litres, amount,
      odometerReading: Number(body.odometerReading ?? 0),
      fuelStation: String(body.fuelStation ?? ''),
      paymentMode: String(body.paymentMode ?? 'CASH'),
      mileageKm: Number(body.mileageKm ?? 0),
      costPerLitre: litres > 0 ? Math.round(amount / litres * 100) / 100 : 0,
      driverName: String(body.driverName ?? ''),
      receiptRef: String(body.receiptRef ?? ''),
    },
  });
  await audit(institutionId, 'FUEL', 'Entry Recorded', `${litres}L — ₹${amount}`, entry.id);
  return entry;
}

export async function recordInspection(institutionId: string, body: Record<string, unknown>) {
  const inspection = await prisma.transportFleetInspection.create({
    data: {
      institutionId,
      vehicleId: String(body.vehicleId),
      inspectionType: String(body.inspectionType ?? 'DAILY'),
      checklist: (body.checklist ?? {}) as Prisma.InputJsonValue,
      status: String(body.status ?? 'PASS'),
      odometerReading: Number(body.odometerReading ?? 0),
      inspectorName: String(body.inspectorName ?? 'Driver'),
      defectsFound: String(body.defectsFound ?? ''),
    },
  });

  if (body.status === 'FAIL') {
    await prisma.transportVehicle.update({
      where: { id: String(body.vehicleId) },
      data: { healthStatus: 'DUE_FOR_SERVICE' },
    });
  }
  await audit(institutionId, 'INSPECTION', String(body.inspectionType ?? 'DAILY'), String(body.status ?? 'PASS'), inspection.id);
  return inspection;
}

export async function registerBreakdown(institutionId: string, body: Record<string, unknown>) {
  const vehicleId = String(body.vehicleId);
  await prisma.transportIncident.create({
    data: {
      institutionId, vehicleId,
      incidentType: 'BREAKDOWN',
      description: String(body.description ?? 'Breakdown reported'),
      latitude: Number(body.latitude ?? 0),
      longitude: Number(body.longitude ?? 0),
    },
  });

  await prisma.transportVehicle.update({
    where: { id: vehicleId },
    data: { availabilityStatus: 'BREAKDOWN', healthStatus: 'BREAKDOWN', operationalStatus: 'BREAKDOWN' },
  });

  await createWorkOrder(institutionId, {
    vehicleId, serviceType: 'EMERGENCY', workshopType: 'EXTERNAL',
    priority: 'URGENT', description: String(body.description ?? 'Emergency breakdown repair'),
    vendorId: body.vendorId,
  });

  await audit(institutionId, 'BREAKDOWN', 'Registered', String(body.description ?? ''), vehicleId);
}

export async function seedTransportFleetMaintenance(institutionId: string) {
  await seedTransportFeeManagement(institutionId);
  await ensureSettings(institutionId);

  const existing = await prisma.transportFleetWorkOrder.count({ where: { institutionId } });
  if (existing >= 5) return getTransportFleetMaintenance(institutionId);

  const vehicles = await prisma.transportVehicle.findMany({
    where: { institutionId, isActive: true }, take: 8,
  });

  const vendorDefs = [
    { code: 'VND-INT', name: 'Internal Workshop', type: 'INTERNAL' },
    { code: 'VND-AMC', name: 'Tata Motors AMC', type: 'AMC', amc: true },
    { code: 'VND-EXT', name: 'City Auto Garage', type: 'EXTERNAL' },
  ];
  const vendors = [];
  for (const v of vendorDefs) {
    const row = await prisma.transportFleetVendor.create({
      data: {
        institutionId, vendorCode: v.code, vendorName: v.name, vendorType: v.type,
        contactPerson: 'Service Manager', mobile: '9876543210',
        amcContract: v.amc ?? false,
        amcExpiry: v.amc ? new Date(Date.now() + 180 * 86400000) : null,
        rating: 4.2,
      },
    });
    vendors.push(row);
  }

  const partDefs = [
    { code: 'SP-OIL', name: 'Engine Oil 15W40', cat: 'LUBRICANT', qty: 24, cost: 450 },
    { code: 'SP-BRK', name: 'Brake Pad Set', cat: 'BRAKE', qty: 8, cost: 1200 },
    { code: 'SP-FLT', name: 'Oil Filter', cat: 'FILTER', qty: 3, cost: 280 },
    { code: 'SP-BAT', name: 'Battery 12V', cat: 'ELECTRICAL', qty: 4, cost: 5500 },
  ];
  for (const p of partDefs) {
    await prisma.transportFleetSparePart.create({
      data: {
        institutionId, partCode: p.code, partName: p.name, category: p.cat,
        quantity: p.qty, reorderLevel: 5, unitCost: p.cost,
        status: p.qty <= 5 ? 'LOW_STOCK' : 'IN_STOCK',
      },
    });
  }

  const today = todayDate();
  const statuses = ['OPEN', 'IN_PROGRESS', 'COMPLETED', 'COMPLETED', 'QC'];
  const types = ['PREVENTIVE', 'OIL_CHANGE', 'BRAKE', 'TYRE', 'AC', 'GPS', 'BREAKDOWN', 'AMC'];

  for (let i = 0; i < Math.min(vehicles.length, 8); i++) {
    const v = vehicles[i];
    const woNum = await nextWoNumber(institutionId);
    const status = statuses[i % statuses.length];
    const labour = 1500 + i * 500;
    const parts = 800 + i * 300;

    await prisma.transportFleetWorkOrder.create({
      data: {
        institutionId, workOrderNumber: woNum, vehicleId: v.id,
        vendorId: i % 2 === 0 ? vendors[0].id : vendors[2].id,
        serviceType: types[i], workshopType: i % 3 === 0 ? 'EXTERNAL' : 'INTERNAL',
        priority: i === 6 ? 'URGENT' : 'NORMAL',
        status, scheduledDate: today,
        completedDate: status === 'COMPLETED' ? today : null,
        odometerReading: 25000 + i * 3000,
        labourCost: labour, partsCost: parts, vendorCost: i % 3 === 0 ? 2000 : 0,
        totalCost: labour + parts + (i % 3 === 0 ? 2000 : 0),
        description: `${types[i]} service for ${v.vehicleNumber}`,
        assignedTo: 'Workshop Team', qcPassed: status === 'COMPLETED',
      },
    });

    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + (i % 4 === 0 ? -5 : 15 + i * 5));
    await prisma.transportFleetServiceSchedule.create({
      data: {
        institutionId, vehicleId: v.id,
        scheduleType: i % 2 === 0 ? 'KM' : 'DAYS',
        serviceType: i % 3 === 0 ? 'OIL_CHANGE' : 'GENERAL_SERVICE',
        intervalValue: i % 2 === 0 ? 5000 : 90,
        lastServiceDate: new Date(today.getTime() - 60 * 86400000),
        lastServiceKm: 20000 + i * 2000,
        nextDueDate: dueDate,
        nextDueKm: 25000 + i * 5000,
        status: dueDate < today ? 'OVERDUE' : 'SCHEDULED',
      },
    });

    const docTypes = ['INSURANCE', 'FITNESS', 'PUC', 'RC', 'PERMIT'];
    for (let d = 0; d < docTypes.length; d++) {
      const exp = new Date(today);
      exp.setDate(exp.getDate() + (d === 0 && i === 0 ? -10 : 30 + d * 60 + i * 5));
      await prisma.transportFleetComplianceDoc.create({
        data: {
          institutionId, vehicleId: v.id, docType: docTypes[d],
          documentNumber: `${docTypes[d]}-${v.vehicleNumber}-${d + 1}`,
          issueDate: new Date(today.getTime() - 365 * 86400000),
          expiryDate: exp,
          status: exp < today ? 'EXPIRED' : 'VALID',
        },
      });
    }

    await prisma.transportFleetFuelEntry.create({
      data: {
        institutionId, vehicleId: v.id,
        litres: 45 + i * 5, amount: 4500 + i * 500,
        odometerReading: 24000 + i * 2800,
        fuelStation: 'HP Petrol Pump', paymentMode: i % 2 === 0 ? 'UPI' : 'CASH',
        mileageKm: 4.5 + (i % 3) * 0.3, costPerLitre: 98 + i,
        driverName: v.driverName,
      },
    });

    await prisma.transportFleetInspection.create({
      data: {
        institutionId, vehicleId: v.id,
        inspectionType: i % 2 === 0 ? 'DAILY' : 'PRE_TRIP',
        checklist: { tyres: true, brakes: true, lights: i !== 6, horn: true, fuel: true },
        status: i === 6 ? 'FAIL' : 'PASS',
        odometerReading: 24000 + i * 2800,
        inspectorName: v.driverName || 'Driver',
        defectsFound: i === 6 ? 'Brake pedal soft, headlight dim' : '',
      },
    });

    const positions = ['FRONT_LEFT', 'FRONT_RIGHT', 'REAR_LEFT', 'REAR_RIGHT'];
    for (let t = 0; t < 4; t++) {
      await prisma.transportFleetTyre.create({
        data: {
          institutionId, vehicleId: v.id,
          tyreNumber: `TYR-${v.vehicleNumber}-${t + 1}`,
          position: positions[t], brand: 'MRF', installDate: new Date(today.getTime() - 180 * 86400000),
          treadDepthMm: 6 + t, expectedLifeKm: 40000, usedKm: 15000 + t * 2000,
          status: t === 3 && i === 2 ? 'REPLACE_SOON' : 'ACTIVE',
        },
      });
    }

    await prisma.transportVehicle.update({
      where: { id: v.id },
      data: {
        healthStatus: i === 6 ? 'BREAKDOWN' : i % 4 === 0 ? 'DUE_FOR_SERVICE' : 'HEALTHY',
        availabilityStatus: i === 6 ? 'BREAKDOWN' : i < 2 && status !== 'COMPLETED' ? 'MAINTENANCE' : 'AVAILABLE',
        maintenanceDueDays: i % 4 === 0 ? 5 : 45 + i * 10,
      },
    });
  }

  if (vehicles[6]) {
    await prisma.transportIncident.create({
      data: {
        institutionId, vehicleId: vehicles[6].id,
        incidentType: 'BREAKDOWN',
        description: 'Engine overheating on Route R03 — roadside assistance called',
      },
    });
  }

  await audit(institutionId, 'SYSTEM', 'Seed Demo', 'Fleet maintenance demo data loaded');
  return getTransportFleetMaintenance(institutionId);
}
