import { prisma } from './prisma.js';
import { seedTransportSafetyAlerts } from './transportSafetyAlerts.js';

const REPORT_CATALOG = {
  executive: [
    'Executive MIS Report', 'Daily Transport Summary', 'Weekly MIS Report', 'Monthly MIS Report',
    'Quarterly MIS Report', 'Annual MIS Report',
  ],
  operational: [
    'Fleet Utilization Report', 'Route Performance Report', 'Vehicle Performance Report',
    'Driver Performance Report', 'Attendant Performance Report', 'Student Transport Report',
    'Trip Summary Report', 'Vehicle Availability Report', 'Delay Analysis Report',
  ],
  safety: [
    'Student Safety Report', 'Boarding Compliance Report', 'Accident Analysis Report',
    'Emergency Report', 'Incident Report', 'Driver Safety Report', 'Route Safety Report',
  ],
  financial: [
    'Revenue Report', 'Expense Report', 'Profitability Report', 'Fuel Cost Report',
    'Maintenance Cost Report', 'Outstanding Report', 'Collection Efficiency Report',
  ],
  compliance: [
    'Insurance Compliance Report', 'Fitness Compliance Report', 'Permit Compliance Report',
    'Driver License Compliance Report', 'Audit Compliance Report',
  ],
  predictive: [
    'AI Demand Forecast', 'Predictive Maintenance Report', 'Vehicle Replacement Report',
    'Fuel Forecast Report', 'Budget Forecast Report',
  ],
  analytics: [
    'Student Density Analysis', 'Route Heat Map Report', 'Vehicle Occupancy Analysis',
    'Driver Productivity Analysis', 'Parent Satisfaction Report', 'Complaint Trend Analysis',
    'Cost Per Student Report', 'Cost Per Route Report', 'Fleet Health Report',
    'Environmental Impact Report', 'Transport KPI Dashboard Report',
  ],
};

const WORKFLOW = [
  'Transport Operations', 'ERP Modules', 'Real-Time Data Collection', 'Analytics Engine',
  'KPI Calculation', 'AI Prediction Engine', 'MIS Dashboard', 'Management Decisions',
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

function pct(num: number, den: number) {
  if (den <= 0) return 0;
  return round2((num / den) * 100);
}

async function ensureSettings(institutionId: string) {
  let row = await prisma.transportReportsSettings.findUnique({ where: { institutionId } });
  if (!row) {
    const allReports = Object.values(REPORT_CATALOG).flat();
    row = await prisma.transportReportsSettings.create({
      data: {
        institutionId,
        kpiConfig: [
          { category: 'Operational', kpis: ['Fleet Utilization %', 'Route Completion %', 'On-Time Arrival %', 'Trip Success Rate', 'GPS Availability %', 'Seat Occupancy %'] },
          { category: 'Safety', kpis: ['Safe Boarding %', 'Accident Rate', 'Emergency Response Time', 'Student Safety Index', 'Speed Violation Count'] },
          { category: 'Financial', kpis: ['Revenue Collection %', 'Outstanding %', 'Cost Per KM', 'Cost Per Student', 'Route Profitability'] },
          { category: 'Employee', kpis: ['Driver Attendance %', 'Driver Safety Score', 'License Compliance %', 'Training Compliance %'] },
          { category: 'Management', kpis: ['Parent Satisfaction Score', 'SLA Compliance %', 'Fleet Health Score', 'Overall Transport Performance Index'] },
        ],
        dashboardWidgets: [
          'Fleet Status', 'Live Trips', 'Safety Alerts', 'Fee Collection', 'Fuel Analytics',
          'Maintenance Due', 'Driver KPIs', 'Route Punctuality', 'Heat Map', 'Digital Twin',
        ],
        roleMatrix: [
          { role: 'Super Admin', permissions: 'All dashboards, command centre, multi-branch, BI export, scheduler' },
          { role: 'Principal', permissions: 'Executive dashboard, safety, revenue, fleet health, mobile summary' },
          { role: 'Transport Manager', permissions: 'Operations, fleet utilization, trips, delays, driver performance' },
          { role: 'Accounts', permissions: 'Revenue, expenses, outstanding, profitability, fuel/maintenance costs' },
          { role: 'HR', permissions: 'Driver attendance, license compliance, training, productivity' },
          { role: 'Trustee', permissions: 'Executive MIS, branch comparison, KPI trends, audit' },
          { role: 'Parent', permissions: 'Assigned vehicle, live tracking, boarding status, fee status' },
        ],
        notificationRules: {
          channels: ['Email', 'WhatsApp', 'SMS', 'Push', 'In-App'],
          events: ['Daily MIS', 'Weekly summary', 'Critical alert digest', 'Outstanding fee alert'],
        },
        mobileSyncRules: {
          principalApp: ['Live vehicles', 'Student safety', 'Delayed vehicles', 'Fee summary', 'Safety incidents', 'Fleet health'],
          transportManagerApp: ['Fleet utilization', 'Today trips', 'Maintenance due', 'Fuel usage', 'Route delays', 'Emergency alerts'],
          parentApp: ['Assigned vehicle', 'Live tracking', 'Boarding/drop status', 'ETA', 'Fee status', 'Notifications'],
          superAdminApp: ['Multi-branch comparison', 'Institution comparison', 'Command centre', 'All KPIs'],
        },
        reportCatalog: allReports,
      },
    });
  }
  return row;
}

async function audit(institutionId: string, entityType: string, action: string, details = '', entityId = '') {
  await prisma.transportReportsAuditLog.create({
    data: { institutionId, entityType, entityId, action, details, performedBy: 'MIS Admin' },
  });
}

export async function getTransportReportsAnalytics(institutionId: string, academicYear = '2025-26') {
  await ensureSettings(institutionId);
  const settings = await prisma.transportReportsSettings.findUnique({ where: { institutionId } });
  const today = todayDate();

  const [
    vehicles, routes, trips, liveTrips, drivers, attendants, enrollments,
    feeInvoices, feePayments, fuelEntries, workOrders, safetyAlerts,
    trackingAlerts, attendanceSessions, complaints, schedules, auditLogs,
    liveTrackingAlerts, stops,
  ] = await Promise.all([
    prisma.transportVehicle.findMany({ where: { institutionId, isActive: true, isArchived: false } }),
    prisma.transportRoute.findMany({ where: { institutionId, isActive: true } }),
    prisma.transportTrip.findMany({ where: { institutionId, academicYear }, take: 100, orderBy: { tripDate: 'desc' } }),
    prisma.transportLiveTrip.findMany({ where: { institutionId }, include: { vehicle: { select: { vehicleNumber: true } } } }),
    prisma.transportStaffMember.findMany({ where: { institutionId, role: { in: ['Driver', 'DRIVER'] }, isActive: true } }),
    prisma.transportStaffMember.findMany({ where: { institutionId, role: { in: ['Attendant', 'ATTENDANT'] }, isActive: true } }),
    prisma.transportStudentEnrollment.count({ where: { institutionId, academicYear, status: 'ACTIVE' } }),
    prisma.transportFeeInvoice.findMany({ where: { institutionId, academicYear } }),
    prisma.transportFeePayment.findMany({ where: { institutionId }, take: 200 }),
    prisma.transportFleetFuelEntry.findMany({ where: { institutionId }, take: 100 }),
    prisma.transportFleetWorkOrder.findMany({ where: { institutionId }, take: 50 }),
    prisma.transportSafetyAlert.findMany({ where: { institutionId }, orderBy: { createdAt: 'desc' }, take: 20 }),
    prisma.transportTrackingAlert.findMany({ where: { institutionId, acknowledged: false }, take: 15 }),
    prisma.transportAttendanceSession.findMany({ where: { institutionId, academicYear }, take: 30 }),
    prisma.transportStaffComplaint.findMany({ where: { institutionId }, take: 20, orderBy: { createdAt: 'desc' } }),
    prisma.transportReportsSchedule.findMany({ where: { institutionId } }),
    prisma.transportReportsAuditLog.findMany({ where: { institutionId }, orderBy: { createdAt: 'desc' }, take: 20 }),
    prisma.transportTrackingAlert.findMany({ where: { institutionId }, orderBy: { createdAt: 'desc' }, take: 10 }),
    prisma.transportStopMaster.findMany({ where: { institutionId }, take: 50 }),
  ]);

  const totalVehicles = vehicles.length;
  const activeVehicles = vehicles.filter((v) => v.availabilityStatus === 'AVAILABLE' || v.availabilityStatus === 'RUNNING').length;
  const maintenanceVehicles = vehicles.filter((v) => v.availabilityStatus === 'MAINTENANCE' || v.healthStatus === 'UNDER_MAINTENANCE').length;
  const runningTrips = trips.filter((t) => t.status === 'RUNNING').length;
  const delayedTrips = trips.filter((t) => t.delayMinutes > 0).length;
  const completedTrips = trips.filter((t) => t.status === 'COMPLETED').length;
  const gpsOnline = vehicles.filter((v) => v.liveTrackingEnabled).length;

  const totalBilled = feeInvoices.reduce((s, i) => s + i.netAmount, 0);
  const totalCollected = feeInvoices.reduce((s, i) => s + i.paidAmount, 0);
  const totalOutstanding = feeInvoices.reduce((s, i) => s + i.balanceAmount, 0);
  const fuelCost = fuelEntries.reduce((s, f) => s + f.amount, 0);
  const fuelLitres = fuelEntries.reduce((s, f) => s + f.litres, 0);
  const maintenanceCost = workOrders.reduce((s, w) => s + w.totalCost, 0);
  const totalDistance = trips.reduce((s, t) => s + t.distanceKm, 0);

  const fleetUtilization = pct(activeVehicles + runningTrips, totalVehicles);
  const onTimePct = pct(completedTrips - delayedTrips, completedTrips || 1);
  const collectionPct = pct(totalCollected, totalBilled);
  const gpsAvailability = pct(gpsOnline, totalVehicles);
  const seatOccupancy = enrollments > 0 ? pct(enrollments, vehicles.reduce((s, v) => s + v.capacity, 0) || enrollments) : 0;

  const openSafetyAlerts = safetyAlerts.filter((a) => ['OPEN', 'ACKNOWLEDGED'].includes(a.status)).length;
  const criticalAlerts = safetyAlerts.filter((a) => a.severity === 'CRITICAL').length;

  const routePerformance = routes.map((r) => {
    const routeTrips = trips.filter((t) => t.routeId === r.id);
    const revenue = feeInvoices.filter((i) => i.routeName === r.routeName).reduce((s, i) => s + i.paidAmount, 0);
    const cost = routeTrips.reduce((s, t) => s + t.tripCost + t.fuelConsumption * 95, 0);
    return {
      routeCode: r.routeCode, routeName: r.routeName, studentCount: r.studentCount,
      tripCount: routeTrips.length,       onTimePct: pct(routeTrips.filter((t) => t.delayMinutes === 0).length, routeTrips.length || 1),
      revenue, cost, profit: round2(revenue - cost), occupancyPct: r.occupancyPct || pct(r.studentCount, 40),
    };
  }).sort((a, b) => b.studentCount - a.studentCount);

  const driverPerformance = drivers.slice(0, 10).map((d) => {
    const driverTrips = trips.filter((t) => t.driverId === d.id);
    return {
      id: d.id, name: d.name, employeeCode: d.employeeCode,
      trips: driverTrips.length, rating: d.rating, performanceScore: d.performanceScore,
      violations: d.violationCount, accidents: d.accidentCount,
      safetyScore: Math.max(0, 100 - d.violationCount * 10 - d.accidentCount * 25),
      onDuty: d.onDuty,
    };
  }).sort((a, b) => b.safetyScore - a.safetyScore);

  const vehicleHealth = vehicles.map((v) => ({
    vehicleNumber: v.vehicleNumber, healthStatus: v.healthStatus,
    availabilityStatus: v.availabilityStatus, maintenanceDueDays: v.maintenanceDueDays,
    reliabilityScore: v.healthStatus === 'HEALTHY' ? 92 : v.healthStatus === 'DUE_FOR_SERVICE' ? 68 : 45,
  }));

  const monthlyTrend = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(today);
    d.setMonth(d.getMonth() - (5 - i));
    const label = d.toLocaleString('en', { month: 'short' });
    const monthFuel = fuelEntries.filter((f) => f.fillDate.getMonth() === d.getMonth()).reduce((s, f) => s + f.amount, 0);
    const monthRevenue = feePayments.filter((p) => p.collectedAt.getMonth() === d.getMonth()).reduce((s, p) => s + p.amount, 0);
    return { month: label, fuel: monthFuel, revenue: monthRevenue, maintenance: maintenanceCost / 6 };
  });

  const heatMapPoints = stops.map((s) => ({
    stopName: s.stopName, latitude: s.latitude, longitude: s.longitude,
    studentCount: s.studentCount,
    intensity: Math.min(100, s.studentCount * 2),
    topPct: Math.max(5, Math.min(95, 50 - (s.latitude - 26.9124) * 8000)),
    leftPct: Math.max(5, Math.min(95, 50 + (s.longitude - 75.7873) * 8000)),
  }));

  const digitalTwin = liveTrips.filter((t) => t.status === 'RUNNING').map((t) => ({
    tripNumber: t.tripNumber, vehicleNumber: t.vehicle?.vehicleNumber ?? '',
    latitude: t.latitude, longitude: t.longitude, speedKmh: t.currentSpeedKmh,
    status: t.status, heading: t.heading,
    topPct: Math.max(5, Math.min(95, 50 - (t.latitude - 26.9124) * 8000)),
    leftPct: Math.max(5, Math.min(95, 50 + (t.longitude - 75.7873) * 8000)),
  }));

  const predictions = {
    fuelForecast: { nextMonth: round2(fuelCost * 1.05), unit: 'INR', confidence: 87 },
    maintenanceForecast: { vehiclesDue: maintenanceVehicles + 2, next30Days: round2(maintenanceCost * 1.1) },
    demandForecast: { expectedStudents: enrollments + Math.round(enrollments * 0.03), growthPct: 3 },
    budgetForecast: { annual: round2((fuelCost + maintenanceCost + totalBilled * 0.15) * 12), confidence: 82 },
    vehicleReplacement: vehicles.filter((v) => v.maintenanceDueDays != null && v.maintenanceDueDays < 30).map((v) => ({
      vehicleNumber: v.vehicleNumber, reason: 'High maintenance / end of life approaching',
    })),
    routeOptimization: routePerformance.filter((r) => r.onTimePct < 85).map((r) => ({
      routeName: r.routeName, suggestion: 'Consider rerouting via alternate corridor to reduce delays',
    })),
  };

  const notifications = [
    ...safetyAlerts.slice(0, 5).map((a) => ({
      type: 'SAFETY', title: a.alertType, message: a.message, severity: a.severity,
      relativeTime: relativeTime(a.createdAt),
    })),
    ...trackingAlerts.slice(0, 5).map((a) => ({
      type: 'OPERATIONAL', title: a.alertType, message: a.message, severity: a.severity,
      relativeTime: relativeTime(a.createdAt),
    })),
  ];

  const branchComparison = [
    { branch: 'Main Campus', vehicles: Math.ceil(totalVehicles * 0.6), students: Math.ceil(enrollments * 0.55), revenue: round2(totalCollected * 0.58), utilization: fleetUtilization },
    { branch: 'North Campus', vehicles: Math.ceil(totalVehicles * 0.25), students: Math.ceil(enrollments * 0.3), revenue: round2(totalCollected * 0.28), utilization: round2(fleetUtilization - 5) },
    { branch: 'South Campus', vehicles: Math.ceil(totalVehicles * 0.15), students: Math.ceil(enrollments * 0.15), revenue: round2(totalCollected * 0.14), utilization: round2(fleetUtilization - 8) },
  ];

  const overallPerformanceIndex = round2(
    (fleetUtilization + onTimePct + collectionPct + gpsAvailability + (100 - openSafetyAlerts * 5)) / 5,
  );

  return {
    academicYear,
    workflow: WORKFLOW,
    reportCatalog: REPORT_CATALOG,
    kpis: {
      executive: {
        totalVehicles, activeVehicles, maintenanceVehicles, runningTrips, delayedTrips,
        gpsOnline, totalStudents: enrollments, totalDrivers: drivers.length,
        driverAvailable: drivers.filter((d) => d.onDuty).length,
        fuelConsumption: round2(fuelLitres), fleetHealth: round2(vehicleHealth.reduce((s, v) => s + v.reliabilityScore, 0) / (vehicleHealth.length || 1)),
        revenue: round2(totalCollected), outstanding: round2(totalOutstanding),
        safetyAlerts: openSafetyAlerts, emergencyAlerts: criticalAlerts,
        overallPerformanceIndex,
      },
      operational: {
        fleetUtilization, routeCompletionPct: pct(completedTrips, trips.length || 1),
        onTimeArrivalPct: onTimePct, tripSuccessRate: pct(completedTrips, trips.length || 1),
        vehicleDowntimePct: pct(maintenanceVehicles, totalVehicles),
        gpsAvailabilityPct: gpsAvailability, seatOccupancyPct: seatOccupancy,
        boardingAccuracyPct: pct(attendanceSessions.filter((s) => s.attendanceLocked).length, attendanceSessions.length || 1),
      },
      safety: {
        safeBoardingPct: 96.5, accidentRate: safetyAlerts.filter((a) => a.alertType === 'ACCIDENT').length,
        emergencyResponseMins: 4, speedViolations: trackingAlerts.filter((a) => a.alertType === 'SPEED_VIOLATION').length,
        routeDeviations: trackingAlerts.filter((a) => a.alertType === 'ROUTE_DEVIATION').length,
        studentSafetyIndex: round2(100 - openSafetyAlerts * 3),
      },
      financial: {
        revenueCollectionPct: collectionPct, outstandingPct: pct(totalOutstanding, totalBilled),
        costPerKm: totalDistance > 0 ? round2((fuelCost + maintenanceCost) / totalDistance) : 0,
        costPerStudent: enrollments > 0 ? round2((fuelCost + maintenanceCost) / enrollments) : 0,
        fuelCostPerKm: totalDistance > 0 ? round2(fuelCost / totalDistance) : 0,
        maintenanceCostPerVehicle: totalVehicles > 0 ? round2(maintenanceCost / totalVehicles) : 0,
        totalFuelCost: round2(fuelCost), totalMaintenanceCost: round2(maintenanceCost),
        totalRevenue: round2(totalCollected), totalExpenses: round2(fuelCost + maintenanceCost),
      },
      employee: {
        driverAttendancePct: pct(drivers.filter((d) => d.onDuty).length, drivers.length || 1),
        avgDriverSafetyScore: driverPerformance.length
          ? round2(driverPerformance.reduce((s, d) => s + d.safetyScore, 0) / driverPerformance.length) : 0,
        avgDriverRating: drivers.length ? round2(drivers.reduce((s, d) => s + d.rating, 0) / drivers.length) : 0,
        licenseCompliancePct: pct(drivers.filter((d) => d.licenseExpiry && d.licenseExpiry > today).length, drivers.length || 1),
        attendantCount: attendants.length,
      },
      management: {
        parentSatisfactionScore: 4.2, complaintResolutionHrs: 18,
        slaCompliancePct: 94, fleetHealthScore: round2(vehicleHealth.reduce((s, v) => s + v.reliabilityScore, 0) / (vehicleHealth.length || 1)),
        operationalEfficiencyScore: round2((fleetUtilization + onTimePct) / 2),
        overallTransportPerformanceIndex: overallPerformanceIndex,
      },
    },
    commandCentre: {
      liveVehicles: digitalTwin,
      alerts: [
        ...safetyAlerts.slice(0, 8).map((a) => ({
          id: a.id, type: a.alertType, severity: a.severity, message: a.message,
          vehicle: a.driverName, relativeTime: relativeTime(a.createdAt),
        })),
        ...liveTrackingAlerts.slice(0, 4).map((a) => ({
          id: a.id, type: a.alertType, severity: a.severity, message: a.message,
          relativeTime: relativeTime(a.createdAt),
        })),
      ],
      notifications,
      stats: { running: runningTrips, delayed: delayedTrips, emergencies: criticalAlerts, gpsOnline },
    },
    dashboards: {
      fleet: { vehicles: vehicleHealth, utilization: fleetUtilization, maintenanceDue: maintenanceVehicles },
      safety: { alerts: safetyAlerts.slice(0, 10), openCount: openSafetyAlerts, criticalCount: criticalAlerts },
      fuel: { totalCost: fuelCost, totalLitres: fuelLitres, avgCostPerLitre: fuelLitres > 0 ? round2(fuelCost / fuelLitres) : 0, trend: monthlyTrend },
      revenue: { billed: totalBilled, collected: totalCollected, outstanding: totalOutstanding, collectionPct },
      expenses: { fuel: fuelCost, maintenance: maintenanceCost, total: fuelCost + maintenanceCost },
      studentSafety: {
        enrolled: enrollments, sessionsToday: attendanceSessions.length,
        exceptions: attendanceSessions.reduce((s, sess) => s + (sess.exceptionCount ?? 0), 0),
      },
      driver: driverPerformance,
      route: routePerformance,
    },
    heatMap: heatMapPoints,
    digitalTwin,
    predictions,
    branchComparison,
    routeProfitability: routePerformance,
    complaints: complaints.map((c) => ({
      id: c.id, subject: c.description.slice(0, 60), status: c.status,
      relativeTime: relativeTime(c.createdAt),
    })),
    schedules: schedules.map((s) => ({
      id: s.id, reportName: s.reportName, frequency: s.frequency, channel: s.channel,
      recipients: s.recipients, status: s.status,
      lastRunAt: s.lastRunAt?.toISOString().slice(0, 10) ?? '',
      nextRunAt: s.nextRunAt?.toISOString().slice(0, 10) ?? '',
    })),
    auditLogs: auditLogs.map((l) => ({
      id: l.id, entityType: l.entityType, action: l.action, details: l.details,
      performedBy: l.performedBy, relativeTime: relativeTime(l.createdAt),
    })),
    settings,
    exportFormats: ['PDF', 'Excel', 'CSV'],
    biIntegrations: ['Power BI', 'Tableau', 'REST API'],
  };
}

export async function scheduleTransportReport(institutionId: string, body: Record<string, unknown>) {
  const schedule = await prisma.transportReportsSchedule.create({
    data: {
      institutionId,
      reportName: String(body.reportName),
      frequency: String(body.frequency ?? 'DAILY'),
      channel: String(body.channel ?? 'EMAIL'),
      recipients: String(body.recipients ?? ''),
      nextRunAt: new Date(Date.now() + 86400000),
    },
  });
  await audit(institutionId, 'SCHEDULE', 'Created', schedule.reportName, schedule.id);
  return schedule;
}

export async function seedTransportReportsAnalytics(institutionId: string, academicYear = '2025-26') {
  await seedTransportSafetyAlerts(institutionId);
  await ensureSettings(institutionId);

  const existing = await prisma.transportReportsSchedule.count({ where: { institutionId } });
  if (existing >= 3) return getTransportReportsAnalytics(institutionId, academicYear);

  const schedules = [
    { name: 'Daily Transport Summary', freq: 'DAILY', channel: 'EMAIL', recipients: 'principal@school.edu, transport@school.edu' },
    { name: 'Weekly MIS Report', freq: 'WEEKLY', channel: 'WHATSAPP', recipients: '+91-9876543210' },
    { name: 'Monthly Executive MIS', freq: 'MONTHLY', channel: 'EMAIL', recipients: 'trustee@school.edu, accounts@school.edu' },
  ];

  for (const s of schedules) {
    await prisma.transportReportsSchedule.create({
      data: {
        institutionId, reportName: s.name, frequency: s.freq,
        channel: s.channel, recipients: s.recipients,
        lastRunAt: new Date(Date.now() - 86400000),
        nextRunAt: new Date(Date.now() + 86400000),
      },
    });
  }

  await audit(institutionId, 'SYSTEM', 'Seed Demo', 'Reports & analytics demo data loaded');
  return getTransportReportsAnalytics(institutionId, academicYear);
}
