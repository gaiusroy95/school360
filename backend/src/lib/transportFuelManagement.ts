import { prisma } from './prisma.js';
import { seedTransportFleetMaintenance } from './transportFleetMaintenance.js';

export const FUEL_TYPES = ['Diesel', 'Petrol', 'CNG', 'Electric'];
export const QUANTITY_UNITS = ['LITRE', 'KG', 'KWH'];
export const REQUEST_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'FILLED'];
export const STATION_TYPES = ['INTERNAL', 'EXTERNAL'];
export const ANOMALY_TYPES = ['THEFT_SUSPECTED', 'LEAKAGE', 'MILEAGE_DROP', 'EXCESS_CONSUMPTION', 'DEVICE_MISMATCH'];
export const PAYMENT_MODES = ['CASH', 'UPI', 'CARD', 'FUEL_CARD', 'CREDIT'];

const REPORT_CATALOG = [
  'Fuel Consumption Report', 'Fuel Efficiency Report', 'Mileage Analysis Report',
  'Fuel Expense Report', 'Fuel Theft Detection Report', 'Station-wise Fuel Report',
  'Vehicle-wise Fuel Report', 'Driver Fuel Accountability Report', 'Fuel Card Usage Report',
  'Daily Fuel Expense Report', 'Monthly Fuel Expense Report', 'CNG Consumption Report',
  'Device vs Manual Reconciliation Report', 'Fuel Approval Report', 'Fuel Anomaly Report',
  'Fuel Analytics Dashboard',
];

const WORKFLOW = [
  'Trip Starts', 'Opening Odometer', 'Fuel Filled', 'Fuel Approval',
  'Trip Completed', 'Closing Odometer', 'Mileage Calculation', 'Fuel Analysis', 'Reports Generated',
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

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function calcMileage(distanceKm: number, fuelQty: number, unit: string) {
  if (fuelQty <= 0) return 0;
  return round2(distanceKm / fuelQty);
}

function calcVariance(expected: number, actual: number) {
  if (expected <= 0) return 0;
  return round2(((actual - expected) / expected) * 100);
}

async function ensureSettings(institutionId: string) {
  let row = await prisma.transportFuelSettings.findUnique({ where: { institutionId } });
  if (!row) {
    row = await prisma.transportFuelSettings.create({
      data: {
        institutionId,
        defaultExpectedMileage: 5.0,
        anomalyThresholdPct: 20,
        cngMileageKmPerKg: 4.0,
        deviceIntegrationEnabled: true,
        autoApproveLimit: 3000,
        roleMatrix: [
          { role: 'Transport Manager', permissions: 'Approve fuel requests, monitor consumption, assign cards, view anomalies' },
          { role: 'Fleet Manager', permissions: 'Fuel stations, cards, entries, mileage logs, device integration' },
          { role: 'Accounts', permissions: 'Approve fuel bills, expense reports, card settlements' },
          { role: 'Driver', permissions: 'Submit fuel requests, record fills, odometer readings' },
          { role: 'Principal', permissions: 'Fuel analytics, expense overview, theft alerts' },
        ],
        notificationRules: {
          channels: ['Push', 'SMS', 'Email', 'In-App'],
          events: ['Fuel request pending', 'Anomaly detected', 'Low mileage alert', 'Card limit exceeded'],
        },
        mobileSyncRules: {
          driverApp: ['Fuel request', 'Fuel fill entry', 'Odometer reading', 'Receipt scan', 'View assigned card'],
          transportManagerApp: ['Approve requests', 'Monitor consumption', 'Anomaly alerts', 'Fleet mileage'],
          accountsApp: ['Approve fuel bills', 'Expense reports', 'Card settlements'],
          principalApp: ['Fuel analytics', 'Cost overview', 'Theft alerts', 'Efficiency trends'],
        },
        deviceIntegrationRules: {
          providers: ['Fuel Mapping Device', 'GPS Odometer', 'CAN Bus Fuel Sensor'],
          syncInterval: '5 min',
          autoReconcile: true,
          fields: ['deviceFuelReading', 'deviceDistanceKm', 'fuelLevelPct'],
        },
        reportCatalog: REPORT_CATALOG,
      },
    });
  }
  return row;
}

async function audit(institutionId: string, entityType: string, action: string, details = '', entityId = '') {
  await prisma.transportFuelAuditLog.create({
    data: { institutionId, entityType, entityId, action, details, performedBy: 'Transport Manager' },
  });
}

async function nextRequestNumber(institutionId: string) {
  const n = await prisma.transportFuelRequest.count({ where: { institutionId } });
  return `FR-${String(n + 1).padStart(5, '0')}`;
}

async function detectAnomaly(
  institutionId: string,
  vehicleId: string,
  expectedMileage: number,
  actualMileage: number,
  thresholdPct: number,
) {
  if (expectedMileage <= 0 || actualMileage <= 0) return null;
  const variance = calcVariance(expectedMileage, actualMileage);
  if (Math.abs(variance) < thresholdPct) return null;

  const isTheft = actualMileage < expectedMileage * (1 - thresholdPct / 100);
  const anomaly = await prisma.transportFuelAnomaly.create({
    data: {
      institutionId, vehicleId,
      anomalyType: isTheft ? 'THEFT_SUSPECTED' : 'EXCESS_CONSUMPTION',
      severity: Math.abs(variance) > 35 ? 'CRITICAL' : 'HIGH',
      description: isTheft
        ? `Mileage dropped ${Math.abs(variance)}% below expected — possible theft or leakage`
        : `Fuel consumption ${Math.abs(variance)}% above expected`,
      expectedValue: expectedMileage,
      actualValue: actualMileage,
      variancePct: variance,
    },
  });
  await audit(institutionId, 'ANOMALY', 'Detected', anomaly.description, anomaly.id);
  return anomaly;
}

export async function getTransportFuelManagement(institutionId: string) {
  await ensureSettings(institutionId);
  const settings = await prisma.transportFuelSettings.findUnique({ where: { institutionId } });
  const threshold = settings?.anomalyThresholdPct ?? 20;

  const [stations, cards, requests, entries, mileageLogs, anomalies, vehicles, drivers, trips, auditLogs] = await Promise.all([
    prisma.transportFuelStation.findMany({ where: { institutionId }, orderBy: { stationName: 'asc' } }),
    prisma.transportFuelCard.findMany({
      where: { institutionId },
      include: { vehicle: { select: { vehicleNumber: true } }, driver: { select: { name: true } } },
      orderBy: { cardNumber: 'asc' },
    }),
    prisma.transportFuelRequest.findMany({
      where: { institutionId },
      include: { vehicle: { select: { vehicleNumber: true } } },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),
    prisma.transportFleetFuelEntry.findMany({
      where: { institutionId },
      include: {
        vehicle: { select: { vehicleNumber: true, fuelType: true } },
        fuelStationRef: { select: { stationName: true } },
        fuelCard: { select: { cardNumber: true } },
      },
      orderBy: { fillDate: 'desc' },
      take: 50,
    }),
    prisma.transportFuelMileageLog.findMany({
      where: { institutionId },
      include: { vehicle: { select: { vehicleNumber: true } }, trip: { select: { tripNumber: true } } },
      orderBy: { logDate: 'desc' },
      take: 30,
    }),
    prisma.transportFuelAnomaly.findMany({
      where: { institutionId },
      include: { vehicle: { select: { vehicleNumber: true } } },
      orderBy: { detectedAt: 'desc' },
      take: 20,
    }),
    prisma.transportVehicle.findMany({
      where: { institutionId, isActive: true, isArchived: false },
      select: { id: true, vehicleNumber: true, fuelType: true, driverName: true },
      orderBy: { vehicleNumber: 'asc' },
    }),
    prisma.transportStaffMember.findMany({
      where: { institutionId, role: 'Driver', isActive: true },
      select: { id: true, name: true, employeeCode: true },
      take: 20,
    }),
    prisma.transportTrip.findMany({
      where: { institutionId, status: { in: ['RUNNING', 'COMPLETED', 'SCHEDULED'] } },
      select: { id: true, tripNumber: true, vehicleId: true, driverName: true, odometerStart: true, odometerEnd: true, mileageKm: true },
      orderBy: { tripDate: 'desc' },
      take: 15,
    }),
    prisma.transportFuelAuditLog.findMany({
      where: { institutionId }, orderBy: { createdAt: 'desc' }, take: 25,
    }),
  ]);

  const totalFuelCost = entries.reduce((s, e) => s + e.amount, 0);
  const totalLitres = entries.filter((e) => e.quantityUnit === 'LITRE').reduce((s, e) => s + e.litres, 0);
  const totalCngKg = entries.filter((e) => e.quantityUnit === 'KG').reduce((s, e) => s + e.litres, 0);
  const totalDistance = mileageLogs.reduce((s, m) => s + m.distanceKm, 0);
  const avgMileage = totalLitres > 0 ? round2(totalDistance / totalLitres) : 0;
  const anomalyCount = anomalies.filter((a) => a.status === 'OPEN').length;
  const pendingRequests = requests.filter((r) => r.status === 'PENDING').length;
  const monthlyCost = entries
    .filter((e) => e.fillDate >= new Date(todayDate().getFullYear(), todayDate().getMonth(), 1))
    .reduce((s, e) => s + e.amount, 0);

  const vehicleMileage = vehicles.map((v) => {
    const vEntries = entries.filter((e) => e.vehicleId === v.id);
    const vLogs = mileageLogs.filter((m) => m.vehicleId === v.id);
    const dist = vLogs.reduce((s, m) => s + m.distanceKm, 0);
    const fuel = vEntries.reduce((s, e) => s + e.litres, 0);
    const actual = fuel > 0 ? round2(dist / fuel) : 0;
    const expected = settings?.defaultExpectedMileage ?? 5;
    return {
      id: v.id, vehicleNumber: v.vehicleNumber, fuelType: v.fuelType,
      driverName: v.driverName, expectedMileage: expected, actualMileage: actual,
      variancePct: calcVariance(expected, actual),
      fillCount: vEntries.length, status: Math.abs(calcVariance(expected, actual)) > threshold ? 'ATTENTION' : 'NORMAL',
    };
  });

  return {
    fuelTypes: FUEL_TYPES,
    quantityUnits: QUANTITY_UNITS,
    requestStatuses: REQUEST_STATUSES,
    stationTypes: STATION_TYPES,
    anomalyTypes: ANOMALY_TYPES,
    paymentModes: PAYMENT_MODES,
    workflow: WORKFLOW,
    kpis: {
      totalFuelCost, totalLitres, totalCngKg, totalDistance,
      avgMileage, avgCostPerLitre: totalLitres > 0 ? round2(totalFuelCost / totalLitres) : 0,
      monthlyExpense: monthlyCost,
      pendingRequests, openAnomalies: anomalyCount,
      activeCards: cards.filter((c) => c.status === 'ACTIVE').length,
      activeStations: stations.filter((s) => s.status === 'ACTIVE').length,
      deviceConnected: stations.filter((s) => s.deviceStatus === 'CONNECTED').length,
      fillEntries: entries.length,
    },
    stations: stations.map((s) => ({
      id: s.id, stationCode: s.stationCode, stationName: s.stationName,
      stationType: s.stationType, address: s.address, contactPerson: s.contactPerson,
      mobile: s.mobile, fuelTypes: s.fuelTypes, deviceIntegrationId: s.deviceIntegrationId,
      deviceStatus: s.deviceStatus, status: s.status,
    })),
    cards: cards.map((c) => ({
      id: c.id, cardNumber: c.cardNumber, cardProvider: c.cardProvider,
      vehicleNumber: c.vehicle?.vehicleNumber ?? '', driverName: c.driver?.name ?? c.assignedTo,
      creditLimit: c.creditLimit, balanceUsed: c.balanceUsed,
      balanceRemaining: round2(c.creditLimit - c.balanceUsed),
      expiryDate: c.expiryDate?.toISOString().slice(0, 10) ?? '', status: c.status,
    })),
    requests: requests.map((r) => ({
      id: r.id, requestNumber: r.requestNumber, vehicleNumber: r.vehicle.vehicleNumber,
      driverName: r.driverName, requestedLitres: r.requestedLitres, requestedAmount: r.requestedAmount,
      fuelType: r.fuelType, purpose: r.purpose, status: r.status,
      approvedBy: r.approvedBy, approvedAt: r.approvedAt?.toISOString() ?? '',
      relativeTime: relativeTime(r.createdAt),
    })),
    fillEntries: entries.map((e) => ({
      id: e.id, vehicleNumber: e.vehicle.vehicleNumber, fillDate: e.fillDate.toISOString().slice(0, 10),
      fillTime: e.fillTime || e.fillDate.toISOString().slice(11, 16),
      litres: e.litres, amount: e.amount, fuelType: e.fuelType, quantityUnit: e.quantityUnit,
      odometerReading: e.odometerReading, openingOdometer: e.openingOdometer, closingOdometer: e.closingOdometer,
      distanceKm: e.distanceKm, fuelStation: e.fuelStationRef?.stationName ?? e.fuelStation,
      cardNumber: e.fuelCard?.cardNumber ?? '', paymentMode: e.paymentMode,
      mileageKm: e.mileageKm || e.actualMileage, expectedMileage: e.expectedMileage, actualMileage: e.actualMileage,
      driverName: e.driverName, approvalStatus: e.approvalStatus,
      deviceFuelReading: e.deviceFuelReading, deviceDistanceKm: e.deviceDistanceKm,
      anomalyFlag: e.anomalyFlag, anomalyReason: e.anomalyReason, entrySource: e.entrySource,
      costPerLitre: e.costPerLitre,
    })),
    mileageLogs: mileageLogs.map((m) => ({
      id: m.id, vehicleNumber: m.vehicle.vehicleNumber, tripNumber: m.trip?.tripNumber ?? '',
      driverName: m.driverName, logDate: m.logDate.toISOString().slice(0, 10),
      openingOdometer: m.openingOdometer, closingOdometer: m.closingOdometer,
      distanceKm: m.distanceKm, fuelConsumed: m.fuelConsumed, fuelType: m.fuelType, quantityUnit: m.quantityUnit,
      expectedMileage: m.expectedMileage, actualMileage: m.actualMileage, variancePct: m.variancePct,
      deviceDistanceKm: m.deviceDistanceKm, deviceFuelUsed: m.deviceFuelUsed, status: m.status,
    })),
    anomalies: anomalies.map((a) => ({
      id: a.id, vehicleNumber: a.vehicle.vehicleNumber, anomalyType: a.anomalyType,
      severity: a.severity, description: a.description,
      expectedValue: a.expectedValue, actualValue: a.actualValue, variancePct: a.variancePct,
      status: a.status, detectedAt: a.detectedAt.toISOString().slice(0, 10),
      relativeTime: relativeTime(a.detectedAt),
    })),
    vehicleMileage,
    vehicles,
    drivers,
    trips,
    auditLogs: auditLogs.map((a) => ({
      id: a.id, entityType: a.entityType, action: a.action, details: a.details,
      performedBy: a.performedBy, relativeTime: relativeTime(a.createdAt),
    })),
    settings,
    reports: REPORT_CATALOG,
  };
}

export async function createFuelStation(institutionId: string, body: Record<string, unknown>) {
  const station = await prisma.transportFuelStation.create({
    data: {
      institutionId,
      stationCode: String(body.stationCode ?? `STN-${Date.now()}`),
      stationName: String(body.stationName),
      stationType: String(body.stationType ?? 'EXTERNAL'),
      address: String(body.address ?? ''),
      contactPerson: String(body.contactPerson ?? ''),
      mobile: String(body.mobile ?? ''),
      fuelTypes: body.fuelTypes ?? ['Diesel', 'Petrol'],
      deviceIntegrationId: String(body.deviceIntegrationId ?? ''),
      deviceStatus: body.deviceIntegrationId ? 'CONNECTED' : 'DISCONNECTED',
    },
  });
  await audit(institutionId, 'STATION', 'Created', station.stationName, station.id);
  return station;
}

export async function assignFuelCard(institutionId: string, body: Record<string, unknown>) {
  const card = await prisma.transportFuelCard.create({
    data: {
      institutionId,
      cardNumber: String(body.cardNumber),
      cardProvider: String(body.cardProvider ?? 'HPCL'),
      vehicleId: body.vehicleId ? String(body.vehicleId) : null,
      driverId: body.driverId ? String(body.driverId) : null,
      assignedTo: String(body.assignedTo ?? ''),
      creditLimit: Number(body.creditLimit ?? 10000),
      expiryDate: body.expiryDate ? new Date(String(body.expiryDate)) : null,
    },
  });
  await audit(institutionId, 'FUEL_CARD', 'Assigned', card.cardNumber, card.id);
  return card;
}

export async function createFuelRequest(institutionId: string, body: Record<string, unknown>) {
  const reqNum = await nextRequestNumber(institutionId);
  const amount = Number(body.requestedAmount ?? 0);
  const settings = await ensureSettings(institutionId);
  const autoApprove = amount > 0 && amount <= settings.autoApproveLimit;

  const request = await prisma.transportFuelRequest.create({
    data: {
      institutionId, requestNumber: reqNum,
      vehicleId: String(body.vehicleId),
      driverId: body.driverId ? String(body.driverId) : null,
      driverName: String(body.driverName ?? ''),
      tripId: body.tripId ? String(body.tripId) : null,
      fuelCardId: body.fuelCardId ? String(body.fuelCardId) : null,
      requestedLitres: Number(body.requestedLitres ?? 0),
      requestedAmount: amount,
      fuelType: String(body.fuelType ?? 'Diesel'),
      purpose: String(body.purpose ?? ''),
      status: autoApprove ? 'APPROVED' : 'PENDING',
      approvedBy: autoApprove ? 'Auto-Approved' : '',
      approvedAt: autoApprove ? new Date() : null,
    },
  });
  await audit(institutionId, 'FUEL_REQUEST', autoApprove ? 'Auto-Approved' : 'Created', reqNum, request.id);
  return request;
}

export async function approveFuelRequest(institutionId: string, requestId: string, approved: boolean, reason = '') {
  const req = await prisma.transportFuelRequest.findFirst({ where: { id: requestId, institutionId } });
  if (!req) throw new Error('Fuel request not found');

  await prisma.transportFuelRequest.update({
    where: { id: requestId },
    data: {
      status: approved ? 'APPROVED' : 'REJECTED',
      approvedBy: 'Transport Manager',
      approvedAt: new Date(),
      rejectionReason: approved ? '' : reason,
    },
  });
  await audit(institutionId, 'FUEL_REQUEST', approved ? 'Approved' : 'Rejected', req.requestNumber, requestId);
}

export async function recordFuelFill(institutionId: string, body: Record<string, unknown>) {
  const settings = await ensureSettings(institutionId);
  const litres = Number(body.litres ?? body.quantity ?? 0);
  const amount = Number(body.amount ?? 0);
  const openingOdo = Number(body.openingOdometer ?? 0);
  const closingOdo = Number(body.closingOdometer ?? body.odometerReading ?? 0);
  const distanceKm = closingOdo > openingOdo ? closingOdo - openingOdo : Number(body.distanceKm ?? 0);
  const unit = String(body.quantityUnit ?? 'LITRE');
  const expectedMileage = Number(body.expectedMileage ?? settings.defaultExpectedMileage);
  const actualMileage = calcMileage(distanceKm, litres, unit);
  const deviceFuel = body.deviceFuelReading != null ? Number(body.deviceFuelReading) : null;
  const deviceDist = body.deviceDistanceKm != null ? Number(body.deviceDistanceKm) : null;

  let anomalyFlag = false;
  let anomalyReason = '';
  if (actualMileage > 0 && expectedMileage > 0) {
    const variance = Math.abs(calcVariance(expectedMileage, actualMileage));
    if (variance >= settings.anomalyThresholdPct) {
      anomalyFlag = true;
      anomalyReason = actualMileage < expectedMileage
        ? `Mileage ${variance}% below expected — possible theft/leakage`
        : `Consumption ${variance}% above expected`;
    }
  }
  if (deviceFuel != null && litres > 0 && Math.abs(deviceFuel - litres) / litres > 0.15) {
    anomalyFlag = true;
    anomalyReason = 'Device fuel reading mismatch with manual entry';
  }

  const approvalStatus = amount <= settings.autoApproveLimit ? 'APPROVED' : 'PENDING';

  const entry = await prisma.transportFleetFuelEntry.create({
    data: {
      institutionId,
      vehicleId: String(body.vehicleId),
      fillTime: String(body.fillTime ?? new Date().toTimeString().slice(0, 5)),
      litres, amount,
      odometerReading: closingOdo,
      openingOdometer: openingOdo,
      closingOdometer: closingOdo,
      distanceKm,
      fuelStationId: body.fuelStationId ? String(body.fuelStationId) : null,
      fuelStation: String(body.fuelStation ?? ''),
      fuelCardId: body.fuelCardId ? String(body.fuelCardId) : null,
      fuelRequestId: body.fuelRequestId ? String(body.fuelRequestId) : null,
      tripId: body.tripId ? String(body.tripId) : null,
      driverId: String(body.driverId ?? ''),
      driverName: String(body.driverName ?? ''),
      fuelType: String(body.fuelType ?? 'Diesel'),
      quantityUnit: unit,
      paymentMode: String(body.paymentMode ?? 'CASH'),
      mileageKm: actualMileage,
      expectedMileage,
      actualMileage,
      costPerLitre: litres > 0 ? round2(amount / litres) : 0,
      approvalStatus,
      deviceFuelReading: deviceFuel,
      deviceDistanceKm: deviceDist,
      anomalyFlag,
      anomalyReason,
      entrySource: String(body.entrySource ?? (deviceFuel != null ? 'DEVICE' : 'MANUAL')),
      receiptRef: String(body.receiptRef ?? ''),
    },
  });

  if (body.fuelRequestId) {
    await prisma.transportFuelRequest.update({
      where: { id: String(body.fuelRequestId) },
      data: { status: 'FILLED' },
    });
  }
  if (body.fuelCardId && amount > 0) {
    await prisma.transportFuelCard.update({
      where: { id: String(body.fuelCardId) },
      data: { balanceUsed: { increment: amount } },
    });
  }

  if (distanceKm > 0 && litres > 0) {
    await prisma.transportFuelMileageLog.create({
      data: {
        institutionId,
        vehicleId: String(body.vehicleId),
        tripId: body.tripId ? String(body.tripId) : null,
        driverName: String(body.driverName ?? ''),
        logDate: todayDate(),
        openingOdometer: openingOdo,
        closingOdometer: closingOdo,
        distanceKm,
        fuelConsumed: litres,
        fuelType: String(body.fuelType ?? 'Diesel'),
        quantityUnit: unit,
        expectedMileage,
        actualMileage,
        variancePct: calcVariance(expectedMileage, actualMileage),
        deviceDistanceKm: deviceDist,
        deviceFuelUsed: deviceFuel,
      },
    });
  }

  if (anomalyFlag) {
    await detectAnomaly(institutionId, String(body.vehicleId), expectedMileage, actualMileage, settings.anomalyThresholdPct);
  }

  await audit(institutionId, 'FUEL_FILL', 'Recorded', `${litres}${unit === 'KG' ? 'kg' : 'L'} — ₹${amount}`, entry.id);
  return entry;
}

export async function recordMileageLog(institutionId: string, body: Record<string, unknown>) {
  const settings = await ensureSettings(institutionId);
  const opening = Number(body.openingOdometer ?? 0);
  const closing = Number(body.closingOdometer ?? 0);
  const distance = closing > opening ? closing - opening : 0;
  const fuel = Number(body.fuelConsumed ?? 0);
  const expected = Number(body.expectedMileage ?? settings.defaultExpectedMileage);
  const actual = calcMileage(distance, fuel, String(body.quantityUnit ?? 'LITRE'));

  const log = await prisma.transportFuelMileageLog.create({
    data: {
      institutionId,
      vehicleId: String(body.vehicleId),
      tripId: body.tripId ? String(body.tripId) : null,
      driverName: String(body.driverName ?? ''),
      logDate: body.logDate ? new Date(String(body.logDate)) : todayDate(),
      openingOdometer: opening,
      closingOdometer: closing,
      distanceKm: distance,
      fuelConsumed: fuel,
      fuelType: String(body.fuelType ?? 'Diesel'),
      quantityUnit: String(body.quantityUnit ?? 'LITRE'),
      expectedMileage: expected,
      actualMileage: actual,
      variancePct: calcVariance(expected, actual),
      deviceDistanceKm: body.deviceDistanceKm != null ? Number(body.deviceDistanceKm) : null,
      deviceFuelUsed: body.deviceFuelUsed != null ? Number(body.deviceFuelUsed) : null,
    },
  });

  if (actual > 0 && Math.abs(calcVariance(expected, actual)) >= settings.anomalyThresholdPct) {
    await detectAnomaly(institutionId, String(body.vehicleId), expected, actual, settings.anomalyThresholdPct);
  }

  await audit(institutionId, 'MILEAGE', 'Logged', `${distance}km / ${fuel}L`, log.id);
  return log;
}

export async function resolveFuelAnomaly(institutionId: string, anomalyId: string) {
  await prisma.transportFuelAnomaly.update({
    where: { id: anomalyId },
    data: { status: 'RESOLVED', resolvedBy: 'Transport Manager', resolvedAt: new Date() },
  });
  await audit(institutionId, 'ANOMALY', 'Resolved', anomalyId, anomalyId);
}

export async function syncDeviceReading(institutionId: string, body: Record<string, unknown>) {
  const station = await prisma.transportFuelStation.findFirst({
    where: { institutionId, deviceIntegrationId: String(body.deviceId ?? '') },
  });
  if (!station) throw new Error('Device not mapped to any fuel station');

  await prisma.transportFuelStation.update({
    where: { id: station.id },
    data: { deviceStatus: 'CONNECTED' },
  });

  return recordFuelFill(institutionId, {
    ...body,
    fuelStationId: station.id,
    fuelStation: station.stationName,
    entrySource: 'DEVICE',
  });
}

export async function seedTransportFuelManagement(institutionId: string) {
  await seedTransportFleetMaintenance(institutionId);
  await ensureSettings(institutionId);

  const existing = await prisma.transportFuelStation.count({ where: { institutionId } });
  if (existing >= 2) return getTransportFuelManagement(institutionId);

  const vehicles = await prisma.transportVehicle.findMany({
    where: { institutionId, isActive: true }, take: 6,
  });
  const drivers = await prisma.transportStaffMember.findMany({
    where: { institutionId, role: 'Driver', isActive: true }, take: 4,
  });

  const stationDefs = [
    { code: 'STN-INT', name: 'Campus Fuel Depot', type: 'INTERNAL', device: 'FMD-CAMPUS-01' },
    { code: 'STN-HP', name: 'HP Petrol Pump — Main Road', type: 'EXTERNAL', device: '' },
    { code: 'STN-IOCL', name: 'IOCL CNG Station', type: 'EXTERNAL', device: 'FMD-CNG-02' },
  ];
  const stations = [];
  for (const s of stationDefs) {
    stations.push(await prisma.transportFuelStation.create({
      data: {
        institutionId, stationCode: s.code, stationName: s.name, stationType: s.type,
        address: 'Near Main Gate', contactPerson: 'Station Manager', mobile: '9876500001',
        fuelTypes: s.name.includes('CNG') ? ['CNG'] : ['Diesel', 'Petrol'],
        deviceIntegrationId: s.device,
        deviceStatus: s.device ? 'CONNECTED' : 'DISCONNECTED',
      },
    }));
  }

  const cardDefs = [
    { num: 'HP-4521-8901', provider: 'HPCL', limit: 15000 },
    { num: 'BP-7834-1205', provider: 'BPCL', limit: 12000 },
    { num: 'IO-9912-3344', provider: 'IOCL', limit: 20000 },
  ];
  const cards = [];
  for (let i = 0; i < cardDefs.length; i++) {
    const c = cardDefs[i];
    cards.push(await prisma.transportFuelCard.create({
      data: {
        institutionId, cardNumber: c.num, cardProvider: c.provider,
        vehicleId: vehicles[i]?.id ?? null,
        driverId: drivers[i]?.id ?? null,
        assignedTo: drivers[i]?.name ?? '',
        creditLimit: c.limit, balanceUsed: 2500 + i * 800,
        expiryDate: new Date(Date.now() + 365 * 86400000),
      },
    }));
  }

  const today = todayDate();
  const statuses = ['PENDING', 'APPROVED', 'APPROVED', 'FILLED', 'REJECTED'];

  for (let i = 0; i < Math.min(vehicles.length, 5); i++) {
    const v = vehicles[i];
    const reqNum = await nextRequestNumber(institutionId);
    const litres = 40 + i * 8;
    const amount = litres * (98 + i);

    await prisma.transportFuelRequest.create({
      data: {
        institutionId, requestNumber: reqNum, vehicleId: v.id,
        driverId: drivers[i % drivers.length]?.id ?? null,
        driverName: v.driverName || drivers[i % drivers.length]?.name || 'Driver',
        requestedLitres: litres, requestedAmount: amount,
        fuelType: v.fuelType || 'Diesel',
        purpose: `Trip fuel for ${v.vehicleNumber}`,
        status: statuses[i % statuses.length],
        approvedBy: i < 3 ? 'Transport Manager' : '',
        approvedAt: i < 3 ? new Date() : null,
      },
    });

    const openingOdo = 24000 + i * 2500;
    const closingOdo = openingOdo + 180 + i * 20;
    const distance = closingOdo - openingOdo;
    const expected = 5.0;
    const actual = round2(distance / litres);
    const isAnomaly = i === 4;

    await prisma.transportFleetFuelEntry.create({
      data: {
        institutionId, vehicleId: v.id,
        fillDate: new Date(today.getTime() - i * 86400000),
        fillTime: `${7 + i}:30`,
        litres, amount,
        odometerReading: closingOdo,
        openingOdometer: openingOdo,
        closingOdometer: closingOdo,
        distanceKm: distance,
        fuelStationId: stations[i % 2].id,
        fuelStation: stations[i % 2].stationName,
        fuelCardId: cards[i % cards.length].id,
        driverName: v.driverName,
        fuelType: v.fuelType || 'Diesel',
        quantityUnit: v.fuelType === 'CNG' ? 'KG' : 'LITRE',
        paymentMode: i % 2 === 0 ? 'FUEL_CARD' : 'UPI',
        mileageKm: actual, expectedMileage: expected, actualMileage: actual,
        costPerLitre: round2(amount / litres),
        approvalStatus: 'APPROVED',
        deviceFuelReading: litres + (isAnomaly ? -8 : 0),
        deviceDistanceKm: distance,
        anomalyFlag: isAnomaly,
        anomalyReason: isAnomaly ? 'Mileage 28% below expected — possible theft' : '',
        entrySource: i % 3 === 0 ? 'DEVICE' : 'MANUAL',
      },
    });

    await prisma.transportFuelMileageLog.create({
      data: {
        institutionId, vehicleId: v.id,
        driverName: v.driverName,
        logDate: new Date(today.getTime() - i * 86400000),
        openingOdometer: openingOdo, closingOdometer: closingOdo,
        distanceKm: distance, fuelConsumed: litres,
        fuelType: v.fuelType || 'Diesel',
        quantityUnit: v.fuelType === 'CNG' ? 'KG' : 'LITRE',
        expectedMileage: expected, actualMileage: actual,
        variancePct: calcVariance(expected, actual),
        deviceDistanceKm: distance,
        deviceFuelUsed: litres,
      },
    });

    if (isAnomaly) {
      await prisma.transportFuelAnomaly.create({
        data: {
          institutionId, vehicleId: v.id,
          anomalyType: 'THEFT_SUSPECTED', severity: 'HIGH',
          description: `Vehicle ${v.vehicleNumber}: mileage dropped 28% below fleet average`,
          expectedValue: expected, actualValue: actual,
          variancePct: calcVariance(expected, actual),
        },
      });
    }
  }

  await audit(institutionId, 'SYSTEM', 'Seed Demo', 'Fuel management demo data loaded');
  return getTransportFuelManagement(institutionId);
}
