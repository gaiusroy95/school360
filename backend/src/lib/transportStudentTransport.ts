import { prisma } from './prisma.js';
import { seedTransportLiveTracking } from './transportLiveTracking.js';

export const TRANSPORT_STATUSES = ['PENDING', 'ACTIVE', 'SUSPENDED', 'CANCELLED', 'COMPLETED', 'WAITING_LIST'];
export const STUDENT_CATEGORIES = ['Day Scholar', 'Hostel', 'Staff Child', 'Scholarship', 'Special Category'];
export const WORKFLOW_STAGES = [
  'APPLICATION', 'VERIFICATION', 'SEAT_CHECK', 'ROUTE_ALLOCATION', 'VEHICLE_ASSIGNMENT',
  'FEE_VERIFICATION', 'APPROVAL', 'CARD_GENERATED', 'ACTIVE',
];
export const REQUEST_TYPES = [
  'ROUTE_CHANGE', 'STOP_CHANGE', 'SUSPENSION', 'CANCELLATION', 'REACTIVATION',
  'TEMPORARY', 'LOST_CARD',
];

const REPORT_CATALOG = [
  'Student Transport Register', 'Student Route Allocation Report', 'Pickup Point Report',
  'Drop Point Report', 'Vehicle Occupancy Report', 'Seat Allocation Report', 'Waiting List Report',
  'Boarding Attendance Report', 'Drop Attendance Report', 'Student Boarding Exception Report',
  'Missed Pickup Report', 'Missed Drop Report', 'Guardian Pickup Verification Report',
  'Transport Application Report', 'Route Change Request Report', 'Stop Change Request Report',
  'Temporary Transport Request Report', 'Transport Suspension Report', 'Transport Cancellation Report',
  'Student Transport History Report', 'Medical Alert Report', 'Special Assistance Student Report',
  'RFID/QR Scan Report', 'Digital Transport Pass Report', 'Parent Notification Report',
  'Student Transport Fee Status Report', 'Transport Attendance Report', 'Student-wise Transport Analytics',
  'Branch-wise Transport Report', 'Transport Audit Trail Report',
];

const WORKFLOW = [
  'Parent Applies for Transport', 'Transport Office Verification', 'Seat Availability Check',
  'Route Allocation', 'Vehicle Assignment', 'Accounts Fee Verification', 'Approval',
  'Student Transport Card Generated', 'Parent Mobile Notification',
  'Daily Boarding & Drop Tracking', 'Attendance & Fee Synchronization',
];

const DEMO_STUDENTS = [
  { name: 'Aarav Sharma', cls: '5', sec: 'A', adm: 'ADM-2024-001' },
  { name: 'Priya Patel', cls: '5', sec: 'A', adm: 'ADM-2024-002' },
  { name: 'Rohan Mehta', cls: '6', sec: 'B', adm: 'ADM-2024-003' },
  { name: 'Ananya Singh', cls: '7', sec: 'A', adm: 'ADM-2024-004' },
  { name: 'Kabir Khan', cls: '8', sec: 'C', adm: 'ADM-2024-005' },
  { name: 'Isha Reddy', cls: '4', sec: 'B', adm: 'ADM-2024-006' },
  { name: 'Vivaan Joshi', cls: '9', sec: 'A', adm: 'ADM-2024-007' },
  { name: 'Sneha Nair', cls: '10', sec: 'B', adm: 'ADM-2024-008' },
  { name: 'Arjun Das', cls: '3', sec: 'A', adm: 'ADM-2024-009' },
  { name: 'Meera Iyer', cls: '2', sec: 'C', adm: 'ADM-2024-010' },
  { name: 'Dev Kapoor', cls: '11', sec: 'A', adm: 'ADM-2024-011' },
  { name: 'Kavya Gupta', cls: '12', sec: 'B', adm: 'ADM-2024-012' },
  { name: 'Rahul Verma', cls: '1', sec: 'A', adm: 'ADM-2024-013' },
  { name: 'Nisha Agarwal', cls: '6', sec: 'C', adm: 'ADM-2024-014' },
  { name: 'Aditya Rao', cls: '8', sec: 'B', adm: 'ADM-2024-015' },
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
  if (hrs < 24) return `${hrs} hr ago`;
  return 'Yesterday';
}

async function ensureSettings(institutionId: string) {
  let row = await prisma.transportStudentSettings.findUnique({ where: { institutionId } });
  if (!row) {
    row = await prisma.transportStudentSettings.create({
      data: {
        institutionId,
        suspendOnFeeDue: true,
        autoPromoteSession: true,
        roleMatrix: [
          { role: 'Admin', permissions: 'Full access — registration, allocation, bulk import, settings' },
          { role: 'Transport Manager', permissions: 'Route/vehicle/seat allocation, approvals, reports' },
          { role: 'Principal', permissions: 'Approve exceptional requests, view analytics' },
          { role: 'Accounts', permissions: 'Fee verification, suspension on due' },
          { role: 'Parent', permissions: 'Apply, track status, view route/ETA, requests' },
          { role: 'Driver', permissions: 'View students, verify boarding/drop, scan QR/RFID' },
        ],
        notificationRules: {
          channels: ['Push', 'SMS', 'WhatsApp', 'Email', 'In-App'],
          events: ['Boarding', 'Drop', 'Delay', 'Emergency', 'Route Change', 'Fee Due'],
        },
        mobileSyncRules: {
          parentApp: [
            'Apply for transport', 'Track application', 'View route & bus', 'Pickup/drop timings',
            'Live ETA', 'Boarding/drop notifications', 'Route/stop change requests', 'Pay fees', 'Digital pass',
          ],
          studentApp: ['Transport schedule', 'Route & seat', 'Driver/vehicle details', 'Digital pass', 'Boarding history'],
          driverApp: ['Allocated students', 'Pickup sequence', 'QR/RFID scan', 'Student photos', 'Medical alerts', 'Report absent'],
          staffApp: ['Monitor students', 'Verify boarding', 'Record incidents', 'Transport attendance'],
          principalApp: ['Monitor transported students', 'Occupancy', 'Boarding/drop stats', 'Fee status', 'Safety monitoring'],
        },
        reportCatalog: REPORT_CATALOG,
      },
    });
  }
  return row;
}

async function audit(institutionId: string, entityType: string, action: string, details = '', entityId = '') {
  await prisma.transportStudentAuditLog.create({
    data: { institutionId, entityType, entityId, action, details, performedBy: 'Transport Office' },
  });
}

async function nextApplicationNumber(institutionId: string): Promise<string> {
  const count = await prisma.transportStudentEnrollment.count({ where: { institutionId } });
  return `TRN-${String(count + 1).padStart(5, '0')}`;
}

function serializeEnrollment(e: {
  id: string; applicationNumber: string; studentName: string; admissionNumber: string;
  className: string; sectionName: string; academicYear: string; branch: string;
  category: string; status: string; workflowStage: string;
  pickupAddress: string; dropAddress: string;
  pickupLatitude: number | null; pickupLongitude: number | null;
  dropLatitude: number | null; dropLongitude: number | null;
  pickupStopName: string; dropStopName: string;
  seatNumber: number | null; reservedSeat: boolean;
  effectiveDate: Date | null; endDate: Date | null;
  pickupTime: string; dropTime: string;
  feeStatus: string; feeDueAmount: number;
  specialAssistance: boolean; medicalAlerts: unknown;
  transportCardId: string; qrCode: string; rfidTag: string;
  geoValidated: boolean; siblingGroupId: string; photoUrl: string;
  route?: { routeCode: string; routeName: string } | null;
  vehicle?: { vehicleNumber: string; capacity: number } | null;
  driver?: { name: string; mobile: string } | null;
  attendant?: { name: string } | null;
  guardians?: Array<{ id: string; name: string; relation: string; mobile: string; otpEnabled: boolean }>;
  requests?: Array<{ id: string; requestType: string; status: string; reason: string; requestedAt: Date }>;
  boardingLogs?: Array<{ logDate: Date; boardingStatus: string; dropStatus: string; boardingMethod: string }>;
}) {
  const medical = Array.isArray(e.medicalAlerts) ? e.medicalAlerts as string[] : [];
  const todayLog = e.boardingLogs?.[0];
  return {
    id: e.id, applicationNumber: e.applicationNumber, studentName: e.studentName,
    admissionNumber: e.admissionNumber, className: e.className, sectionName: e.sectionName,
    academicYear: e.academicYear, branch: e.branch, category: e.category,
    status: e.status, workflowStage: e.workflowStage,
    pickupAddress: e.pickupAddress, dropAddress: e.dropAddress,
    pickupLatitude: e.pickupLatitude, pickupLongitude: e.pickupLongitude,
    dropLatitude: e.dropLatitude, dropLongitude: e.dropLongitude,
    pickupStopName: e.pickupStopName, dropStopName: e.dropStopName,
    routeCode: e.route?.routeCode ?? '', routeName: e.route?.routeName ?? '',
    vehicleNumber: e.vehicle?.vehicleNumber ?? '',
    driverName: e.driver?.name ?? '', driverMobile: e.driver?.mobile ?? '',
    attendantName: e.attendant?.name ?? '',
    seatNumber: e.seatNumber, reservedSeat: e.reservedSeat,
    effectiveDate: e.effectiveDate?.toISOString().slice(0, 10) ?? '',
    endDate: e.endDate?.toISOString().slice(0, 10) ?? '',
    pickupTime: e.pickupTime, dropTime: e.dropTime,
    feeStatus: e.feeStatus, feeDueAmount: e.feeDueAmount,
    specialAssistance: e.specialAssistance, medicalAlerts: medical,
    transportCardId: e.transportCardId, qrCode: e.qrCode, rfidTag: e.rfidTag,
    geoValidated: e.geoValidated, siblingGroupId: e.siblingGroupId, photoUrl: e.photoUrl,
    guardians: e.guardians ?? [],
    pendingRequests: (e.requests ?? []).filter((r) => r.status === 'PENDING').length,
    todayBoarding: todayLog?.boardingStatus ?? 'NOT_BOARDED',
    todayDrop: todayLog?.dropStatus ?? '',
    boardingMethod: todayLog?.boardingMethod ?? '',
  };
}

const enrollmentInclude = {
  route: { select: { routeCode: true, routeName: true } },
  vehicle: { select: { vehicleNumber: true, capacity: true } },
  driver: { select: { name: true, mobile: true } },
  attendant: { select: { name: true } },
  guardians: true,
  requests: { orderBy: { requestedAt: 'desc' as const }, take: 5 },
  boardingLogs: { where: { logDate: todayDate() }, take: 1 },
};

export async function getTransportStudentTransport(institutionId: string, academicYear = '2025-26') {
  await ensureSettings(institutionId);
  const tripDate = todayDate();

  const [enrollments, routes, vehicles, settings, auditLogs, requests, boardingToday] = await Promise.all([
    prisma.transportStudentEnrollment.findMany({
      where: { institutionId, academicYear },
      include: enrollmentInclude,
      orderBy: [{ status: 'asc' }, { studentName: 'asc' }],
    }),
    prisma.transportRoute.findMany({
      where: { institutionId, isArchived: false, academicYear },
      select: { id: true, routeCode: true, routeName: true, studentCount: true, stopCount: true },
    }),
    prisma.transportVehicle.findMany({
      where: { institutionId, isActive: true },
      select: { id: true, vehicleNumber: true, capacity: true, reserveSeats: true, studentCount: true, routeName: true },
    }),
    prisma.transportStudentSettings.findUnique({ where: { institutionId } }),
    prisma.transportStudentAuditLog.findMany({
      where: { institutionId }, orderBy: { createdAt: 'desc' }, take: 20,
    }),
    prisma.transportStudentRequest.findMany({
      where: { institutionId, status: 'PENDING' },
      include: { enrollment: { select: { studentName: true, applicationNumber: true } } },
      orderBy: { requestedAt: 'desc' },
      take: 15,
    }),
    prisma.transportStudentBoardingLog.findMany({
      where: { institutionId, logDate: tripDate },
      include: { enrollment: { select: { studentName: true, className: true, route: { select: { routeName: true } } } } },
    }),
  ]);

  const serialized = enrollments.map(serializeEnrollment);
  const statusCounts = TRANSPORT_STATUSES.reduce((acc, s) => {
    acc[s] = serialized.filter((e) => e.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  const activeCount = statusCounts.ACTIVE ?? 0;
  const pendingApps = statusCounts.PENDING ?? 0;
  const waitingList = statusCounts.WAITING_LIST ?? 0;
  const totalSeats = vehicles.reduce((s, v) => s + (v.capacity - v.reserveSeats), 0);
  const occupiedSeats = serialized.filter((e) => e.status === 'ACTIVE' && e.seatNumber).length;
  const boardedToday = boardingToday.filter((b) => b.boardingStatus === 'PRESENT').length;
  const droppedToday = boardingToday.filter((b) => b.dropStatus === 'DROPPED').length;

  const vehicleOccupancy = vehicles.map((v) => {
    const assigned = serialized.filter((e) => e.vehicleNumber === v.vehicleNumber && e.status === 'ACTIVE').length;
    const cap = v.capacity - v.reserveSeats;
    return {
      vehicleNumber: v.vehicleNumber, routeName: v.routeName,
      assigned, capacity: cap, occupancyPct: cap > 0 ? Math.round((assigned / cap) * 100) : 0,
    };
  });

  return {
    academicYear,
    academicYears: ['2024-25', '2025-26', '2026-27'],
    transportStatuses: TRANSPORT_STATUSES,
    studentCategories: STUDENT_CATEGORIES,
    workflowStages: WORKFLOW_STAGES,
    requestTypes: REQUEST_TYPES,
    workflow: WORKFLOW,
    kpis: {
      totalEnrolled: serialized.length,
      activeStudents: activeCount,
      pendingApplications: pendingApps,
      waitingList,
      pendingRequests: requests.length,
      boardedToday,
      droppedToday,
      absentToday: activeCount - boardedToday,
      seatOccupancy: totalSeats > 0 ? Math.round((occupiedSeats / totalSeats) * 100) : 0,
      feeDueCount: serialized.filter((e) => e.feeStatus === 'DUE' || e.feeDueAmount > 0).length,
      specialAssistance: serialized.filter((e) => e.specialAssistance).length,
    },
    statusCounts,
    enrollments: serialized,
    pendingRequests: requests.map((r) => ({
      id: r.id, requestType: r.requestType, status: r.status, reason: r.reason,
      studentName: r.enrollment.studentName, applicationNumber: r.enrollment.applicationNumber,
      requestedAt: r.requestedAt.toISOString(), relativeTime: relativeTime(r.requestedAt),
    })),
    waitingListStudents: serialized.filter((e) => e.status === 'WAITING_LIST'),
    boardingToday: boardingToday.map((b) => ({
      id: b.id, studentName: b.enrollment.studentName, className: b.enrollment.className,
      routeName: b.enrollment.route?.routeName ?? '',
      boardingStatus: b.boardingStatus, dropStatus: b.dropStatus, boardingMethod: b.boardingMethod,
      boardedAt: b.boardedAt?.toISOString() ?? null, droppedAt: b.droppedAt?.toISOString() ?? null,
    })),
    vehicleOccupancy,
    routes,
    vehicles,
    auditLogs: auditLogs.map((l) => ({
      id: l.id, entityType: l.entityType, action: l.action, details: l.details,
      performedBy: l.performedBy, createdAt: l.createdAt.toISOString(),
      relativeTime: relativeTime(l.createdAt),
    })),
    settings: settings ?? {},
    reports: REPORT_CATALOG,
  };
}

export async function createStudentTransportApplication(institutionId: string, body: Record<string, unknown>) {
  const applicationNumber = await nextApplicationNumber(institutionId);
  const enrollment = await prisma.transportStudentEnrollment.create({
    data: {
      institutionId, applicationNumber,
      studentName: String(body.studentName ?? 'Student'),
      admissionNumber: String(body.admissionNumber ?? ''),
      className: String(body.className ?? ''),
      sectionName: String(body.sectionName ?? ''),
      academicYear: String(body.academicYear ?? '2025-26'),
      branch: String(body.branch ?? 'Main Campus'),
      category: String(body.category ?? 'Day Scholar'),
      pickupAddress: String(body.pickupAddress ?? ''),
      dropAddress: String(body.dropAddress ?? ''),
      pickupLatitude: body.pickupLatitude ? Number(body.pickupLatitude) : null,
      pickupLongitude: body.pickupLongitude ? Number(body.pickupLongitude) : null,
      status: 'PENDING', workflowStage: 'APPLICATION',
    },
  });

  if (body.guardianName) {
    await prisma.transportStudentGuardian.create({
      data: {
        institutionId, enrollmentId: enrollment.id,
        name: String(body.guardianName), mobile: String(body.guardianMobile ?? ''),
        relation: String(body.guardianRelation ?? 'Parent'),
      },
    });
  }

  await audit(institutionId, 'ENROLLMENT', 'Application created', applicationNumber, enrollment.id);
  return enrollment;
}

export async function allocateStudentTransport(
  institutionId: string, enrollmentId: string, body: Record<string, unknown>,
) {
  const routeId = body.routeId ? String(body.routeId) : null;
  const vehicleId = body.vehicleId ? String(body.vehicleId) : null;
  let seatNumber = body.seatNumber ? Number(body.seatNumber) : null;
  let capacityValid = true;

  if (vehicleId) {
    const vehicle = await prisma.transportVehicle.findFirst({ where: { id: vehicleId, institutionId } });
    if (vehicle) {
      const cap = vehicle.capacity - vehicle.reserveSeats;
      const occupied = await prisma.transportStudentEnrollment.count({
        where: { institutionId, vehicleId, status: 'ACTIVE' },
      });
      if (!seatNumber) seatNumber = occupied + 1;
      if (occupied >= cap) {
        await prisma.transportStudentEnrollment.update({
          where: { id: enrollmentId },
          data: { status: 'WAITING_LIST', workflowStage: 'SEAT_CHECK' },
        });
        throw new Error('Vehicle at capacity — student added to waiting list');
      }
      capacityValid = (occupied + 1) <= cap;
    }
  }

  const driver = vehicleId ? await prisma.transportStaffMember.findFirst({
    where: { institutionId, role: { in: ['Driver', 'DRIVER'] }, isActive: true },
  }) : null;

  const route = routeId ? await prisma.transportRoute.findFirst({
    where: { id: routeId, institutionId },
    include: { stops: { orderBy: { sequenceOrder: 'asc' }, take: 1 } },
  }) : null;

  return prisma.transportStudentEnrollment.update({
    where: { id: enrollmentId },
    data: {
      routeId, vehicleId,
      driverId: body.driverId ? String(body.driverId) : driver?.id,
      attendantId: body.attendantId ? String(body.attendantId) : undefined,
      seatNumber, geoValidated: true,
      pickupStopName: String(body.pickupStopName ?? route?.stops[0]?.stopName ?? ''),
      dropStopName: String(body.dropStopName ?? 'Main Campus'),
      pickupTime: String(body.pickupTime ?? '07:15'),
      dropTime: String(body.dropTime ?? '15:45'),
      workflowStage: capacityValid ? 'VEHICLE_ASSIGNMENT' : 'SEAT_CHECK',
      effectiveDate: body.effectiveDate ? new Date(String(body.effectiveDate)) : new Date(),
    },
  });
}

export async function approveStudentTransport(institutionId: string, enrollmentId: string) {
  const cardId = `TC-${Date.now().toString(36).toUpperCase()}`;
  const qr = `QR-${enrollmentId.slice(-8).toUpperCase()}`;
  const rfid = `RFID-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;

  const updated = await prisma.transportStudentEnrollment.update({
    where: { id: enrollmentId },
    data: {
      status: 'ACTIVE', workflowStage: 'ACTIVE',
      transportCardId: cardId, qrCode: qr, rfidTag: rfid,
      feeStatus: 'PAID',
    },
  });
  await audit(institutionId, 'ENROLLMENT', 'Transport approved & card generated', cardId, enrollmentId);
  return updated;
}

export async function recordStudentBoarding(
  institutionId: string, enrollmentId: string, body: Record<string, unknown>,
) {
  const logDate = todayDate();
  const method = String(body.method ?? 'QR');
  const isDrop = body.action === 'DROP';

  const existing = await prisma.transportStudentBoardingLog.findUnique({
    where: { enrollmentId_logDate: { enrollmentId, logDate } },
  });

  if (isDrop) {
    if (existing) {
      return prisma.transportStudentBoardingLog.update({
        where: { id: existing.id },
        data: { dropStatus: 'DROPPED', droppedAt: new Date() },
      });
    }
    return prisma.transportStudentBoardingLog.create({
      data: {
        institutionId, enrollmentId, logDate,
        boardingStatus: 'PRESENT', dropStatus: 'DROPPED',
        boardingMethod: method, droppedAt: new Date(),
      },
    });
  }

  if (existing) {
    return prisma.transportStudentBoardingLog.update({
      where: { id: existing.id },
      data: { boardingStatus: 'PRESENT', boardingMethod: method, boardedAt: new Date() },
    });
  }
  return prisma.transportStudentBoardingLog.create({
    data: {
      institutionId, enrollmentId, logDate,
      boardingStatus: 'PRESENT', boardingMethod: method, boardedAt: new Date(),
    },
  });
}

export async function createTransportRequest(
  institutionId: string, enrollmentId: string, body: Record<string, unknown>,
) {
  return prisma.transportStudentRequest.create({
    data: {
      institutionId, enrollmentId,
      requestType: String(body.requestType ?? 'ROUTE_CHANGE'),
      reason: String(body.reason ?? ''),
      status: 'PENDING',
    },
  });
}

export async function resolveTransportRequest(
  institutionId: string, requestId: string, body: Record<string, unknown>,
) {
  const action = String(body.action ?? 'APPROVED');
  const req = await prisma.transportStudentRequest.update({
    where: { id: requestId },
    data: { status: action, resolvedAt: new Date() },
    include: { enrollment: true },
  });

  if (action === 'APPROVED' && req.requestType === 'SUSPENSION') {
    await prisma.transportStudentEnrollment.update({
      where: { id: req.enrollmentId },
      data: { status: 'SUSPENDED' },
    });
  }
  if (action === 'APPROVED' && req.requestType === 'CANCELLATION') {
    await prisma.transportStudentEnrollment.update({
      where: { id: req.enrollmentId },
      data: { status: 'CANCELLED', endDate: todayDate() },
    });
  }
  if (action === 'APPROVED' && req.requestType === 'REACTIVATION') {
    await prisma.transportStudentEnrollment.update({
      where: { id: req.enrollmentId },
      data: { status: 'ACTIVE' },
    });
  }

  await audit(institutionId, 'REQUEST', `Request ${action}`, req.requestType, requestId);
  return req;
}

export async function seedTransportStudentTransport(institutionId: string) {
  await seedTransportLiveTracking(institutionId);
  await ensureSettings(institutionId);

  const existing = await prisma.transportStudentEnrollment.count({ where: { institutionId } });
  if (existing >= 10) return getTransportStudentTransport(institutionId);

  const routes = await prisma.transportRoute.findMany({
    where: { institutionId, isArchived: false },
    include: { stops: { orderBy: { sequenceOrder: 'asc' }, take: 3 } },
    take: 8,
  });
  const vehicles = await prisma.transportVehicle.findMany({ where: { institutionId, isActive: true }, take: 8 });
  const drivers = await prisma.transportStaffMember.findMany({
    where: { institutionId, role: { in: ['Driver', 'DRIVER'] }, isActive: true }, take: 4,
  });
  const attendants = await prisma.transportStaffMember.findMany({
    where: { institutionId, role: 'Attendant', isActive: true }, take: 2,
  });
  const dbStudents = await prisma.student.findMany({
    where: { institutionId, status: 'ACTIVE' }, take: 15,
  });

  const statuses = ['ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'PENDING', 'PENDING', 'WAITING_LIST', 'SUSPENDED', 'ACTIVE', 'ACTIVE', 'CANCELLED', 'ACTIVE', 'ACTIVE'];
  const categories = ['Day Scholar', 'Day Scholar', 'Hostel', 'Staff Child', 'Scholarship', 'Day Scholar', 'Day Scholar', 'Special Category', 'Day Scholar', 'Day Scholar', 'Hostel', 'Day Scholar', 'Day Scholar', 'Day Scholar', 'Staff Child'];
  const tripDate = todayDate();

  for (let i = 0; i < 15; i++) {
    const ds = DEMO_STUDENTS[i];
    const dbStu = dbStudents[i];
    const route = routes[i % routes.length];
    const vehicle = vehicles[i % vehicles.length];
    const driver = drivers[i % Math.max(drivers.length, 1)];
    const attendant = attendants[i % Math.max(attendants.length, 1)];
    const status = statuses[i];
    const applicationNumber = await nextApplicationNumber(institutionId);
    const isActive = status === 'ACTIVE' || status === 'SUSPENDED';

    const enrollment = await prisma.transportStudentEnrollment.create({
      data: {
        institutionId,
        studentId: dbStu?.id,
        applicationNumber,
        studentName: dbStu ? `${dbStu.firstName} ${dbStu.lastName}`.trim() : ds.name,
        admissionNumber: dbStu?.admissionNumber ?? ds.adm,
        className: dbStu?.className ?? ds.cls,
        sectionName: dbStu?.sectionName ?? ds.sec,
        academicYear: '2025-26', branch: 'Main Campus',
        category: categories[i], status,
        workflowStage: isActive ? 'ACTIVE' : status === 'PENDING' ? 'VERIFICATION' : status === 'WAITING_LIST' ? 'SEAT_CHECK' : 'APPLICATION',
        pickupAddress: `${ds.name.split(' ')[1] ?? 'Nagar'}, Jaipur`,
        dropAddress: 'Main Campus, Jaipur',
        pickupLatitude: 26.91 + (i * 0.003), pickupLongitude: 75.78 + (i * 0.002),
        dropLatitude: 26.9124, dropLongitude: 75.7873,
        pickupStopName: route?.stops[0]?.stopName ?? `Stop ${i + 1}`,
        dropStopName: 'School Main Gate',
        routeId: isActive || status === 'WAITING_LIST' ? route?.id : null,
        vehicleId: isActive ? vehicle?.id : null,
        driverId: isActive ? driver?.id : null,
        attendantId: isActive ? attendant?.id : null,
        seatNumber: isActive ? i + 1 : null,
        effectiveDate: isActive ? new Date('2025-04-01') : null,
        pickupTime: `07:${String(10 + i).padStart(2, '0')}`,
        dropTime: '15:45',
        feeStatus: i % 5 === 0 ? 'DUE' : 'PAID',
        feeDueAmount: i % 5 === 0 ? 3500 : 0,
        specialAssistance: i === 9,
        medicalAlerts: i === 4 ? ['Nut allergy — EpiPen in bag'] : i === 9 ? ['Wheelchair access required'] : [],
        transportCardId: isActive ? `TC-2025-${String(i + 1).padStart(4, '0')}` : '',
        qrCode: isActive ? `QR-STU-${String(i + 1).padStart(4, '0')}` : '',
        rfidTag: isActive ? `RFID-${1000 + i}` : '',
        geoValidated: isActive || status === 'WAITING_LIST',
        siblingGroupId: i < 2 ? 'SIB-001' : '',
      },
    });

    await prisma.transportStudentGuardian.create({
      data: {
        institutionId, enrollmentId: enrollment.id,
        name: `Mr. ${ds.name.split(' ')[1] ?? 'Guardian'}`, relation: 'Father',
        mobile: `98${String(7000000000 + i).slice(0, 10)}`, otpEnabled: ds.cls === '1' || ds.cls === '2',
      },
    });

    if (isActive && i < 10) {
      const boarded = i !== 7;
      await prisma.transportStudentBoardingLog.create({
        data: {
          institutionId, enrollmentId: enrollment.id, logDate: tripDate,
          boardingStatus: boarded ? 'PRESENT' : 'ABSENT',
          dropStatus: boarded && i < 8 ? 'DROPPED' : '',
          boardingMethod: boarded ? (i % 3 === 0 ? 'RFID' : i % 3 === 1 ? 'QR' : 'MANUAL') : '',
          boardedAt: boarded ? new Date() : null,
          droppedAt: boarded && i < 8 ? new Date() : null,
        },
      });
    }

    if (i === 6) {
      await prisma.transportStudentRequest.create({
        data: { institutionId, enrollmentId: enrollment.id, requestType: 'ROUTE_CHANGE', reason: 'Family relocated to Vaishali Nagar', status: 'PENDING' },
      });
    }
    if (i === 7) {
      await prisma.transportStudentRequest.create({
        data: { institutionId, enrollmentId: enrollment.id, requestType: 'STOP_CHANGE', reason: 'New pickup point near metro station', status: 'PENDING' },
      });
    }
    if (i === 12) {
      await prisma.transportStudentRequest.create({
        data: { institutionId, enrollmentId: enrollment.id, requestType: 'CANCELLATION', reason: 'Family shifting city', status: 'APPROVED', resolvedAt: new Date() },
      });
    }
  }

  await audit(institutionId, 'SYSTEM', 'Demo student transport data seeded');
  return getTransportStudentTransport(institutionId);
}
