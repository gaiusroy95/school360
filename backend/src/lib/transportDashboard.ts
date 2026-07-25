import { TransportIncidentType } from '@prisma/client';
import { prisma } from './prisma.js';
import { getOrCreateTrackingConfig } from './transport.js';

const ROUTES = [
  { code: 'R01', name: 'Route 01 - Shyam Nagar', stops: 12, students: 186 },
  { code: 'R02', name: 'Route 02 - Vaishali Nagar', stops: 11, students: 178 },
  { code: 'R03', name: 'Route 03 - Mansarovar', stops: 10, students: 165 },
  { code: 'R04', name: 'Route 04 - Jagatpura', stops: 10, students: 142 },
  { code: 'R05', name: 'Route 05 - Pratap Nagar', stops: 8, students: 128 },
  { code: 'R06', name: 'Route 06 - Malviya Nagar', stops: 11, students: 110 },
  { code: 'R07', name: 'Route 07 - C-Scheme', stops: 9, students: 98 },
  { code: 'R08', name: 'Route 08 - Tonk Road', stops: 6, students: 86 },
];

const DRIVERS = [
  'Ramesh Kumar', 'Sunil Mehta', 'Imran Khan', 'Mohan Singh', 'Rajesh Yadav',
  'Vikram Singh', 'Anil Sharma', 'Deepak Verma', 'Suresh Patel', 'Karan Mehta',
];

function todayDate() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function formatInr(amount: number) {
  return `₹ ${amount.toLocaleString('en-IN')}`;
}

function relativeTime(d: Date): string {
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return 'Yesterday';
}

function incidentColor(type: TransportIncidentType): string {
  if (type === 'EMERGENCY' || type === 'COLLISION') return 'red';
  if (type === 'DELAY' || type === 'BREAKDOWN') return 'amber';
  return 'green';
}

export async function getTransportDashboard(institutionId: string, academicYear = '2025-26') {
  await getOrCreateTrackingConfig(institutionId);

  const [
    vehicles, routes, trips, staff, activities, maintenance, attendance, incidents,
    studentCount,
  ] = await Promise.all([
    prisma.transportVehicle.findMany({ where: { institutionId, isActive: true }, orderBy: { vehicleNumber: 'asc' } }),
    prisma.transportRoute.findMany({ where: { institutionId, isActive: true }, orderBy: { studentCount: 'desc' } }),
    prisma.transportTrip.findMany({
      where: { institutionId, tripDate: todayDate() },
      orderBy: { busLabel: 'asc' },
    }),
    prisma.transportStaffMember.findMany({ where: { institutionId, isActive: true } }),
    prisma.transportActivityLog.findMany({
      where: { institutionId },
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
    prisma.transportMaintenanceSchedule.findMany({
      where: { institutionId },
      orderBy: { dueInDays: 'asc' },
      take: 5,
    }),
    prisma.transportAttendanceDaily.findFirst({
      where: { institutionId, recordDate: todayDate() },
    }),
    prisma.transportIncident.findMany({
      where: { institutionId },
      orderBy: { createdAt: 'desc' },
      take: 6,
      include: { vehicle: true },
    }),
    prisma.student.count({ where: { institutionId, status: 'ACTIVE' } }),
  ]);

  const totalBuses = vehicles.length;
  const onTrip = vehicles.filter((v) => v.operationalStatus === 'ON_TRIP').length;
  const inCampus = vehicles.filter((v) => v.operationalStatus === 'IN_CAMPUS').length;
  const underMaintenance = vehicles.filter((v) => v.operationalStatus === 'MAINTENANCE').length;
  const transportStudents = routes.reduce((s, r) => s + r.studentCount, 0) || vehicles.reduce((s, v) => s + v.studentCount, 0);
  const activeRoutes = routes.length;

  const healthCounts = {
    EXCELLENT: vehicles.filter((v) => v.healthStatus === 'EXCELLENT').length,
    GOOD: vehicles.filter((v) => v.healthStatus === 'GOOD').length,
    UNDER_SERVICE: vehicles.filter((v) => v.healthStatus === 'UNDER_SERVICE').length,
    DUE_FOR_SERVICE: vehicles.filter((v) => v.healthStatus === 'DUE_FOR_SERVICE').length,
  };

  const drivers = staff.filter((s) => s.role === 'DRIVER');
  const attendants = staff.filter((s) => s.role === 'ATTENDANT');

  const totalDues = 4872000;
  const collected = 4458600;
  const pending = totalDues - collected;
  const collectedPct = Math.round((collected / totalDues) * 1000) / 10;
  const pendingPct = Math.round((pending / totalDues) * 1000) / 10;

  const ridership = (routes.length ? routes : ROUTES.map((r) => ({
    routeCode: r.code, routeName: r.name, studentCount: r.students,
  }))).slice(0, 8).map((r, i) => ({
    route: r.routeCode,
    students: r.studentCount,
    color: i % 2 === 0 ? '#3b82f6' : '#f59e0b',
  }));

  const att = attendance ?? {
    picked: 1795, pendingPick: 28, dropped: 1742, pendingDrop: 40, attendancePct: 96.8,
  };

  return {
    academicYear,
    academicYears: ['2023-24', '2024-25', '2025-26', '2026-27'],
    routeFilterOptions: ['All Routes', ...routes.map((r) => r.routeName)],
    kpis: {
      totalBuses: { value: totalBuses, subtitle: '2 New this year', trendUp: true },
      activeRoutes: { value: activeRoutes, subtitle: `${transportStudents || 2456} Students` },
      studentsUsingTransport: {
        value: transportStudents || 1842,
        subtitle: `${studentCount > 0 ? Math.round(((transportStudents || 1842) / studentCount) * 100) : 33}% of Total Students`,
      },
      onTripNow: { value: `${onTrip} Buses`, subtitle: 'Running', statusColor: 'green' },
      inCampus: { value: `${inCampus} Buses`, subtitle: 'Idle', statusColor: 'blue' },
      underMaintenance: { value: `${underMaintenance} Bus${underMaintenance === 1 ? '' : 'es'}`, subtitle: 'In Service', statusColor: 'red' },
    },
    liveTracking: {
      isLive: onTrip > 0,
      vehicles: vehicles.filter((v) => v.operationalStatus === 'ON_TRIP').map((v) => ({
        busLabel: v.vehicleNumber,
        routeName: v.routeName,
        topPct: v.mapTopPct,
        leftPct: v.mapLeftPct,
        color: v.vehicleNumber.includes('07') ? 'green' : v.vehicleNumber.includes('12') ? 'amber'
          : v.vehicleNumber.includes('18') ? 'purple' : 'red',
      })),
      gpsNote: 'GPS data from devices or Driver Mobile App syncs here for auto-tracking during school hours.',
    },
    recentUpdates: activities.map((a) => ({
      time: relativeTime(a.createdAt),
      title: a.vehicleLabel,
      desc: a.message,
      color: a.color,
    })),
    ridership,
    attendance: {
      pct: att.attendancePct,
      stats: [
        { name: 'Picked', value: att.picked, color: '#10b981' },
        { name: 'Pending Pick', value: att.pendingPick, color: '#f59e0b' },
        { name: 'Dropped', value: att.dropped, color: '#10b981' },
        { name: 'Pending Drop', value: att.pendingDrop, color: '#f59e0b' },
      ],
    },
    trips: trips.map((t) => ({
      busNo: t.busLabel,
      route: t.routeName,
      driver: t.driverName,
      stops: `${t.stopsCompleted}/${t.stopsTotal}`,
      students: `${t.studentsPicked}/${t.studentsTotal}`,
      status: t.status,
      tripType: t.tripType,
    })),
    vehicleHealth: {
      total: totalBuses,
      segments: [
        { name: 'Excellent', value: healthCounts.EXCELLENT, color: '#10b981' },
        { name: 'Good', value: healthCounts.GOOD, color: '#3b82f6' },
        { name: 'Under Service', value: healthCounts.UNDER_SERVICE, color: '#f59e0b' },
        { name: 'Due for Service', value: healthCounts.DUE_FOR_SERVICE, color: '#ef4444' },
      ],
      nextServiceDue: maintenance.map((m) => ({
        busLabel: m.busLabel,
        dueInDays: m.dueInDays,
      })),
    },
    safetyAlerts: incidents.map((i) => ({
      time: i.createdAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      title: `${i.vehicle.vehicleNumber} - ${i.incidentType.replace(/_/g, ' ')}`,
      desc: i.description,
      color: incidentColor(i.incidentType),
    })),
    feesSummary: {
      totalDues: formatInr(totalDues),
      collected: formatInr(collected),
      collectedPct,
      pending: formatInr(pending),
      pendingPct,
      raw: { totalDues, collected, pending },
    },
    topRoutes: (routes.length ? routes : ROUTES.map((r) => ({
      routeCode: r.code, routeName: r.name, studentCount: r.students,
    }))).slice(0, 5).map((r, i, arr) => ({
      name: r.routeName,
      students: r.studentCount,
      percentage: arr[0] ? Math.round((r.studentCount / arr[0].studentCount) * 100) : 100,
      rank: i + 1,
    })),
    staff: {
      total: staff.length,
      drivers: { total: drivers.length, onDuty: drivers.filter((d) => d.onDuty).length },
      attendants: { total: attendants.length, onDuty: attendants.filter((d) => d.onDuty).length },
    },
    quickActions: [
      { label: 'Add New Route', target: 'Route & Vehicle Master' },
      { label: 'Assign Students', target: 'Student Transportation' },
      { label: 'Track Vehicles (Live)', target: 'Live Vehicle Tracking' },
      { label: 'Mark Transport Attendance', target: 'Transport Attendance' },
      { label: 'Raise Service Request', target: 'Maintenance & Service' },
      { label: 'Generate Transport Report', target: 'Reports & Analytics' },
      { label: 'Send Parent Notification', target: 'Communication Management' },
      { label: 'Settings', target: 'Settings Management' },
    ],
    navigationTargets: {
      allTrips: 'Trip Management',
      allUpdates: 'Live Vehicle Tracking',
      allAlerts: 'Safety & Alerts',
      allRoutes: 'Route & Vehicle Master',
      feeReport: 'Transport Fees',
      maintenance: 'Maintenance & Service',
      staffDirectory: 'Driver & Attendant',
    },
  };
}

export async function seedTransportDashboard(institutionId: string) {
  await getOrCreateTrackingConfig(institutionId);

  const existing = await prisma.transportVehicle.count({ where: { institutionId } });
  if (existing >= 20) return getTransportDashboard(institutionId);

  await prisma.transportRoute.deleteMany({ where: { institutionId } });
  await prisma.transportVehicle.deleteMany({ where: { institutionId } });
  await prisma.transportTrip.deleteMany({ where: { institutionId } });
  await prisma.transportStaffMember.deleteMany({ where: { institutionId } });
  await prisma.transportActivityLog.deleteMany({ where: { institutionId } });
  await prisma.transportMaintenanceSchedule.deleteMany({ where: { institutionId } });
  await prisma.transportAttendanceDaily.deleteMany({ where: { institutionId } });

  for (const r of ROUTES) {
    await prisma.transportRoute.create({
      data: {
        institutionId, routeCode: r.code, routeName: r.name,
        stopCount: r.stops, studentCount: r.students,
      },
    });
  }

  const mapPositions = [
    { top: 30, left: 30 }, { top: 25, left: 75 }, { top: 75, left: 25 }, { top: 80, left: 75 },
    { top: 15, left: 50 }, { top: 50, left: 15 }, { top: 50, left: 85 }, { top: 40, left: 40 },
  ];

  for (let i = 0; i < 24; i++) {
    const route = ROUTES[i % ROUTES.length];
    const busNum = String(i + 1).padStart(2, '0');
    const isOnTrip = i < 20;
    const isMaintenance = i === 23;
    await prisma.transportVehicle.create({
      data: {
        institutionId,
        recordId: `BUS-${busNum}`,
        vehicleNumber: `Bus ${busNum}`,
        routeName: route.name,
        routeCode: route.code,
        driverName: DRIVERS[i % DRIVERS.length],
        driverMobile: `98${String(10000000 + i).slice(0, 8)}`,
        operationalStatus: isMaintenance ? 'MAINTENANCE' : isOnTrip ? 'ON_TRIP' : 'IN_CAMPUS',
        healthStatus: i < 18 ? 'EXCELLENT' : i < 22 ? 'GOOD' : i === 22 ? 'DUE_FOR_SERVICE' : 'UNDER_SERVICE',
        studentCount: route.students,
        stopCount: route.stops,
        maintenanceDueDays: i === 13 ? 3 : i === 18 ? 5 : i === 2 ? 7 : null,
        mapTopPct: mapPositions[i % mapPositions.length].top,
        mapLeftPct: mapPositions[i % mapPositions.length].left,
      },
    });
  }

  const tripRows = [
    { bus: 'Bus 07', route: 'Route 01', driver: 'Ramesh Kumar', stops: [12, 12], students: [186, 186] },
    { bus: 'Bus 12', route: 'Route 03', driver: 'Sunil Mehta', stops: [10, 10], students: [165, 165] },
    { bus: 'Bus 18', route: 'Route 05', driver: 'Imran Khan', stops: [8, 8], students: [128, 128] },
    { bus: 'Bus 21', route: 'Route 08', driver: 'Mohan Singh', stops: [6, 6], students: [86, 86] },
    { bus: 'Bus 09', route: 'Route 06', driver: 'Rajesh Yadav', stops: [11, 11], students: [110, 110] },
  ];

  const tripDate = todayDate();
  for (const t of tripRows) {
    for (const tripType of ['MORNING', 'EVENING']) {
      await prisma.transportTrip.create({
        data: {
          institutionId, busLabel: t.bus, routeCode: t.route.replace('Route ', 'R'),
          routeName: t.route, driverName: t.driver,
          tripType, stopsCompleted: t.stops[0], stopsTotal: t.stops[1],
          studentsPicked: t.students[0], studentsTotal: t.students[1],
          status: 'On Time', tripDate,
        },
      });
    }
  }

  for (let i = 0; i < 18; i++) {
    await prisma.transportStaffMember.create({
      data: {
        institutionId, name: DRIVERS[i % DRIVERS.length], role: 'DRIVER',
        mobile: `98${String(20000000 + i).slice(0, 8)}`, onDuty: i < 16,
      },
    });
  }
  for (let i = 0; i < 8; i++) {
    await prisma.transportStaffMember.create({
      data: {
        institutionId, name: `Attendant ${i + 1}`, role: 'ATTENDANT',
        mobile: `98${String(30000000 + i).slice(0, 8)}`, onDuty: i < 7,
      },
    });
  }

  const now = Date.now();
  const activitySeed = [
    { bus: 'Bus 07', msg: 'Reached Shyam Nagar Stop', color: 'green', mins: 5 },
    { bus: 'Bus 12', msg: 'Picked 3 Students', color: 'amber', mins: 12 },
    { bus: 'Bus 18', msg: 'On the way to School', color: 'blue', mins: 18 },
    { bus: 'Bus 21', msg: 'Left last stop', color: 'red', mins: 22 },
  ];
  for (const a of activitySeed) {
    await prisma.transportActivityLog.create({
      data: {
        institutionId, vehicleLabel: a.bus, message: a.msg, color: a.color,
        createdAt: new Date(now - a.mins * 60000),
      },
    });
  }

  for (const m of [
    { bus: 'Bus 14', days: 3 }, { bus: 'Bus 19', days: 5 }, { bus: 'Bus 03', days: 7 },
  ]) {
    await prisma.transportMaintenanceSchedule.create({
      data: { institutionId, busLabel: m.bus, dueInDays: m.days },
    });
  }

  await prisma.transportAttendanceDaily.upsert({
    where: { institutionId_recordDate: { institutionId, recordDate: tripDate } },
    create: {
      institutionId, recordDate: tripDate,
      picked: 1795, pendingPick: 28, dropped: 1742, pendingDrop: 40, attendancePct: 96.8,
    },
    update: { picked: 1795, pendingPick: 28, dropped: 1742, pendingDrop: 40, attendancePct: 96.8 },
  });

  const vehicles = await prisma.transportVehicle.findMany({ where: { institutionId }, take: 4 });
  const incidentSeed: Array<{ type: TransportIncidentType; desc: string; mins: number }> = [
    { type: 'DELAY', desc: 'Traffic congestion at Civil Lines', mins: 45 },
    { type: 'OTHER', desc: 'All students dropped safely', mins: 55 },
    { type: 'DELAY', desc: 'Taking alternate route due to road work', mins: 70 },
    { type: 'EMERGENCY', desc: 'Student assistance provided — resolved', mins: 1440 },
  ];
  for (let i = 0; i < incidentSeed.length && vehicles[i]; i++) {
    await prisma.transportIncident.create({
      data: {
        institutionId,
        vehicleId: vehicles[i % vehicles.length].id,
        incidentType: incidentSeed[i].type,
        description: incidentSeed[i].desc,
        createdAt: new Date(now - incidentSeed[i].mins * 60000),
        resolvedAt: incidentSeed[i].type === 'EMERGENCY' ? new Date() : null,
      },
    });
  }

  return getTransportDashboard(institutionId);
}
