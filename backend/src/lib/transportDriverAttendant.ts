import { prisma } from './prisma.js';
import { seedTransportStudentTransport } from './transportStudentTransport.js';

export const STAFF_ROLES = ['Driver', 'Attendant'];
export const EMPLOYMENT_TYPES = ['Permanent', 'Contract', 'Outsourced', 'Temporary', 'Part-Time'];
export const SHIFT_TYPES = ['MORNING', 'EVENING', 'DOUBLE', 'EVENT'];
export const STAFF_STATUSES = ['ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED'];
export const WORKFLOW_STAGES = [
  'RECRUITMENT', 'HR_VERIFICATION', 'DOCUMENT_UPLOAD', 'MEDICAL_POLICE', 'TRAINING',
  'LICENSE_VERIFICATION', 'VEHICLE_ASSIGNMENT', 'ROUTE_ASSIGNMENT', 'ACTIVE',
];

const REPORT_CATALOG = [
  'Driver Register Report', 'Attendant Register Report', 'Driver License Expiry Report',
  'Driver Badge Expiry Report', 'Medical Certificate Expiry Report', 'Police Verification Report',
  'Driver Attendance Report', 'Attendant Attendance Report', 'Driver Duty Roster Report',
  'Attendant Duty Roster Report', 'Vehicle Assignment Report', 'Driver Route Assignment Report',
  'Driver Performance Report', 'Attendant Performance Report', 'Driver Rating Report',
  'Parent Feedback Report', 'Training Completion Report', 'Certification Validity Report',
  'Leave Report', 'Overtime Report', 'Payroll Report', 'Incentive Report', 'Penalty Report',
  'Complaint Report', 'Grievance Report', 'Accident History Report', 'Traffic Violation Report',
  'Uniform Issue Report', 'Document Expiry Report', 'Driver Replacement Report', 'Shift Swap Report',
  'Mobile Login Activity Report', 'Health Declaration Report', 'Compliance Dashboard Report', 'Audit Trail Report',
];

const WORKFLOW = [
  'Recruitment', 'HR Verification', 'Document Upload', 'Medical & Police Verification',
  'Training Completion', 'Driver License Verification', 'Vehicle Assignment', 'Route Assignment',
  'Daily Attendance', 'Trip Execution', 'Performance Evaluation', 'Payroll Processing',
];

const DRIVER_NAMES = [
  'Ramesh Kumar', 'Sunil Mehta', 'Imran Khan', 'Mohan Singh', 'Rajesh Yadav',
  'Vikram Singh', 'Anil Sharma', 'Deepak Verma', 'Suresh Patel', 'Karan Mehta',
  'Amit Joshi', 'Pradeep Nair', 'Sanjay Reddy', 'Harish Iyer', 'Naveen Das',
];
const ATTENDANT_NAMES = [
  'Sunita Devi', 'Kavita Sharma', 'Meena Patel', 'Pooja Singh', 'Rekha Yadav',
  'Anjali Mehta', 'Lata Verma', 'Geeta Nair', 'Sushma Reddy', 'Usha Iyer',
];

function todayDate() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysUntil(d: Date | null): number | null {
  if (!d) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}

function relativeTime(d: Date): string {
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  return hrs < 24 ? `${hrs} hr ago` : 'Yesterday';
}

async function ensureSettings(institutionId: string) {
  let row = await prisma.transportStaffSettings.findUnique({ where: { institutionId } });
  if (!row) {
    row = await prisma.transportStaffSettings.create({
      data: {
        institutionId,
        maxDrivingHours: 10,
        licenseAlertDays: 30,
        roleMatrix: [
          { role: 'Admin', permissions: 'Full access — registration, documents, roster, settings' },
          { role: 'HR', permissions: 'Onboarding, KYC, leave, payroll sync, grievances' },
          { role: 'Transport Manager', permissions: 'Duty allocation, replacements, performance, complaints' },
          { role: 'Principal', permissions: 'Review compliance, ratings, disciplinary actions' },
          { role: 'Driver', permissions: 'View roster, mark attendance, apply leave, upload documents' },
        ],
        notificationRules: {
          channels: ['Push', 'SMS', 'Email', 'In-App'],
          events: ['License expiry', 'Document expiry', 'Leave approval', 'Training due', 'Complaint filed'],
        },
        mobileSyncRules: {
          driverApp: [
            'Secure login', 'View vehicle & route', 'Student list', 'Start/pause/complete trip',
            'Mark attendance', 'Duty roster', 'Apply leave', 'Shift swap', 'Document renewal upload',
            'License reminders', 'SOS & breakdown', 'View payslips & overtime',
          ],
          attendantApp: [
            'View route & vehicle', 'Student boarding list', 'Verify boarding/drop', 'QR/RFID scan',
            'Report incidents', 'Apply leave', 'Duty schedule', 'Upload documents', 'View salary',
          ],
          hrApp: ['Approve onboarding', 'Verify licenses', 'Monitor attendance', 'Manage replacements', 'Approve leave'],
          principalApp: ['Monitor drivers', 'Training compliance', 'Document expiry', 'Complaints', 'Performance ratings'],
        },
        reportCatalog: REPORT_CATALOG,
      },
    });
  }
  return row;
}

async function audit(institutionId: string, entityType: string, action: string, details = '', entityId = '') {
  await prisma.transportStaffAuditLog.create({
    data: { institutionId, entityType, entityId, action, details, performedBy: 'HR Admin' },
  });
}

async function nextEmployeeCode(institutionId: string, role: string): Promise<string> {
  const prefix = role.toLowerCase().includes('attendant') ? 'ATT' : 'DRV';
  const count = await prisma.transportStaffMember.count({
    where: { institutionId, role: { contains: prefix === 'DRV' ? 'Driver' : 'Attendant', mode: 'insensitive' } },
  });
  return `${prefix}-${String(count + 1).padStart(4, '0')}`;
}

function serializeStaff(s: {
  id: string; employeeCode: string; name: string; role: string; mobile: string; email: string;
  employmentType: string; branch: string; bloodGroup: string;
  licenseNumber: string; licenseCategory: string; licenseExpiry: Date | null;
  badgeNumber: string; medicalFitnessExpiry: Date | null;
  policeVerificationStatus: string; backgroundVerified: boolean;
  shiftType: string; yearsExperience: number; rating: number; performanceScore: number;
  workflowStage: string; staffStatus: string; onDuty: boolean; isActive: boolean;
  accidentCount: number; violationCount: number; uniformIssued: boolean;
  emergencyContact: string; emergencyMobile: string;
  assignedRoute?: { routeCode: string; routeName: string } | null;
  assignedVehicle?: { vehicleNumber: string } | null;
  staffDocuments?: Array<{ documentType: string; expiryDate: Date | null; status: string }>;
  staffTrainings?: Array<{ courseName: string; validTill: Date | null }>;
  leaveRequests?: Array<{ status: string }>;
}) {
  const licenseDays = daysUntil(s.licenseExpiry);
  const medicalDays = daysUntil(s.medicalFitnessExpiry);
  return {
    id: s.id, employeeCode: s.employeeCode, name: s.name, role: s.role,
    mobile: s.mobile, email: s.email, employmentType: s.employmentType, branch: s.branch,
    bloodGroup: s.bloodGroup, licenseNumber: s.licenseNumber, licenseCategory: s.licenseCategory,
    licenseExpiry: s.licenseExpiry?.toISOString().slice(0, 10) ?? '',
    licenseExpiringSoon: licenseDays !== null && licenseDays <= 30 && licenseDays >= 0,
    licenseExpired: licenseDays !== null && licenseDays < 0,
    badgeNumber: s.badgeNumber,
    medicalFitnessExpiry: s.medicalFitnessExpiry?.toISOString().slice(0, 10) ?? '',
    medicalExpiringSoon: medicalDays !== null && medicalDays <= 30 && medicalDays >= 0,
    policeVerificationStatus: s.policeVerificationStatus, backgroundVerified: s.backgroundVerified,
    shiftType: s.shiftType, yearsExperience: s.yearsExperience,
    rating: s.rating, performanceScore: s.performanceScore,
    workflowStage: s.workflowStage, staffStatus: s.staffStatus,
    onDuty: s.onDuty, isActive: s.isActive,
    accidentCount: s.accidentCount, violationCount: s.violationCount,
    uniformIssued: s.uniformIssued,
    emergencyContact: s.emergencyContact, emergencyMobile: s.emergencyMobile,
    routeCode: s.assignedRoute?.routeCode ?? '', routeName: s.assignedRoute?.routeName ?? '',
    vehicleNumber: s.assignedVehicle?.vehicleNumber ?? '',
    documentsCount: s.staffDocuments?.length ?? 0,
    trainingsCount: s.staffTrainings?.length ?? 0,
    pendingLeave: (s.leaveRequests ?? []).filter((l) => l.status === 'PENDING').length,
    complianceOk: s.backgroundVerified && s.policeVerificationStatus === 'VERIFIED'
      && (licenseDays === null || licenseDays > 0) && (medicalDays === null || medicalDays > 0),
  };
}

const staffInclude = {
  assignedRoute: { select: { routeCode: true, routeName: true } },
  assignedVehicle: { select: { vehicleNumber: true } },
  staffDocuments: { take: 10 },
  staffTrainings: { take: 5 },
  leaveRequests: { where: { status: 'PENDING' }, take: 3 },
};

export async function getTransportDriverAttendant(institutionId: string) {
  await ensureSettings(institutionId);
  const tripDate = todayDate();

  const [staff, routes, vehicles, rosters, attendances, leaves, complaints, expiringDocs, auditLogs, settings] = await Promise.all([
    prisma.transportStaffMember.findMany({
      where: { institutionId, isActive: true },
      include: staffInclude,
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    }),
    prisma.transportRoute.findMany({
      where: { institutionId, isArchived: false },
      select: { id: true, routeCode: true, routeName: true },
      take: 20,
    }),
    prisma.transportVehicle.findMany({
      where: { institutionId, isActive: true },
      select: { id: true, vehicleNumber: true, routeName: true },
      take: 20,
    }),
    prisma.transportStaffDutyRoster.findMany({
      where: { institutionId, rosterDate: tripDate },
      include: { staff: { select: { name: true, role: true, employeeCode: true } } },
      orderBy: { shiftType: 'asc' },
    }),
    prisma.transportStaffAttendance.findMany({
      where: { institutionId, attendDate: tripDate },
      include: { staff: { select: { name: true, role: true } } },
    }),
    prisma.transportStaffLeaveRequest.findMany({
      where: { institutionId, status: 'PENDING' },
      include: { staff: { select: { name: true, employeeCode: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.transportStaffComplaint.findMany({
      where: { institutionId, status: 'OPEN' },
      include: { staff: { select: { name: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.transportStaffDocument.findMany({
      where: {
        institutionId,
        expiryDate: { lte: new Date(Date.now() + 30 * 86400000) },
        status: 'VALID',
      },
      include: { staff: { select: { name: true, employeeCode: true } } },
      take: 15,
    }),
    prisma.transportStaffAuditLog.findMany({
      where: { institutionId }, orderBy: { createdAt: 'desc' }, take: 20,
    }),
    prisma.transportStaffSettings.findUnique({ where: { institutionId } }),
  ]);

  const serialized = staff.map(serializeStaff);
  const drivers = serialized.filter((s) => s.role.toLowerCase().includes('driver'));
  const attendants = serialized.filter((s) => s.role.toLowerCase().includes('attendant'));

  return {
    workflow: WORKFLOW,
    employmentTypes: EMPLOYMENT_TYPES,
    shiftTypes: SHIFT_TYPES,
    staffStatuses: STAFF_STATUSES,
    kpis: {
      totalDrivers: drivers.length,
      totalAttendants: attendants.length,
      onDuty: serialized.filter((s) => s.onDuty && s.staffStatus === 'ACTIVE').length,
      onLeave: serialized.filter((s) => s.staffStatus === 'ON_LEAVE').length,
      licenseExpiring: serialized.filter((s) => s.licenseExpiringSoon).length,
      licenseExpired: serialized.filter((s) => s.licenseExpired).length,
      docExpiring: expiringDocs.length,
      pendingLeave: leaves.length,
      openComplaints: complaints.length,
      complianceRate: serialized.length
        ? Math.round((serialized.filter((s) => s.complianceOk).length / serialized.length) * 100) : 0,
      avgRating: drivers.length
        ? Math.round((drivers.reduce((a, d) => a + d.rating, 0) / drivers.length) * 10) / 10 : 0,
      presentToday: attendances.filter((a) => a.status === 'PRESENT').length,
    },
    staff: serialized,
    drivers,
    attendants,
    dutyRoster: rosters.map((r) => ({
      id: r.id, staffName: r.staff.name, employeeCode: r.staff.employeeCode, role: r.staff.role,
      shiftType: r.shiftType, status: r.status, rosterDate: r.rosterDate.toISOString().slice(0, 10),
    })),
    attendanceToday: attendances.map((a) => ({
      id: a.id, staffName: a.staff.name, role: a.staff.role,
      status: a.status, method: a.method, checkIn: a.checkIn, checkOut: a.checkOut,
    })),
    pendingLeaves: leaves.map((l) => ({
      id: l.id, staffName: l.staff.name, employeeCode: l.staff.employeeCode, role: l.staff.role,
      leaveType: l.leaveType, fromDate: l.fromDate.toISOString().slice(0, 10),
      toDate: l.toDate.toISOString().slice(0, 10), reason: l.reason,
    })),
    openComplaints: complaints.map((c) => ({
      id: c.id, staffName: c.staff.name, role: c.staff.role,
      complaintType: c.complaintType, severity: c.severity, description: c.description,
      createdAt: c.createdAt.toISOString(), relativeTime: relativeTime(c.createdAt),
    })),
    expiringDocuments: expiringDocs.map((d) => ({
      id: d.id, staffName: d.staff.name, employeeCode: d.staff.employeeCode,
      documentType: d.documentType, expiryDate: d.expiryDate?.toISOString().slice(0, 10) ?? '',
      daysUntil: daysUntil(d.expiryDate),
    })),
    routes,
    vehicles,
    auditLogs: auditLogs.map((l) => ({
      id: l.id, entityType: l.entityType, action: l.action, details: l.details,
      performedBy: l.performedBy, relativeTime: relativeTime(l.createdAt),
    })),
    settings: settings ?? {},
    reports: REPORT_CATALOG,
  };
}

export async function registerTransportStaff(institutionId: string, body: Record<string, unknown>) {
  const role = String(body.role ?? 'Driver');
  const employeeCode = await nextEmployeeCode(institutionId, role);
  const staff = await prisma.transportStaffMember.create({
    data: {
      institutionId, employeeCode, name: String(body.name ?? 'Staff'),
      role, mobile: String(body.mobile ?? ''),
      email: String(body.email ?? ''),
      employmentType: String(body.employmentType ?? 'Permanent'),
      branch: String(body.branch ?? 'Main Campus'),
      bloodGroup: String(body.bloodGroup ?? ''),
      licenseNumber: String(body.licenseNumber ?? ''),
      licenseCategory: String(body.licenseCategory ?? ''),
      yearsExperience: Number(body.yearsExperience ?? 0),
      workflowStage: 'RECRUITMENT', staffStatus: 'ACTIVE',
    },
  });
  await audit(institutionId, 'STAFF', 'Registered', employeeCode, staff.id);
  return staff;
}

export async function assignStaffDuty(
  institutionId: string, staffId: string, body: Record<string, unknown>,
) {
  const updated = await prisma.transportStaffMember.update({
    where: { id: staffId },
    data: {
      assignedRouteId: body.routeId ? String(body.routeId) : undefined,
      assignedVehicleId: body.vehicleId ? String(body.vehicleId) : undefined,
      shiftType: body.shiftType ? String(body.shiftType) : undefined,
      backupStaffId: body.backupStaffId ? String(body.backupStaffId) : undefined,
      workflowStage: 'ROUTE_ASSIGNMENT',
    },
  });

  if (body.rosterDate) {
    await prisma.transportStaffDutyRoster.create({
      data: {
        institutionId, staffId,
        rosterDate: new Date(String(body.rosterDate)),
        shiftType: String(body.shiftType ?? 'MORNING'),
        routeId: body.routeId ? String(body.routeId) : null,
        vehicleId: body.vehicleId ? String(body.vehicleId) : null,
        status: 'SCHEDULED',
      },
    });
  }

  await audit(institutionId, 'STAFF', 'Duty assigned', staffId);
  return updated;
}

export async function approveStaffLeave(institutionId: string, leaveId: string, action: string) {
  const leave = await prisma.transportStaffLeaveRequest.update({
    where: { id: leaveId },
    data: { status: action },
    include: { staff: true },
  });
  if (action === 'APPROVED') {
    await prisma.transportStaffMember.update({
      where: { id: leave.staffId },
      data: { staffStatus: 'ON_LEAVE', onDuty: false },
    });
  }
  await audit(institutionId, 'LEAVE', `Leave ${action}`, leave.staff.name, leaveId);
  return leave;
}

export async function verifyStaffLicense(institutionId: string, staffId: string) {
  const updated = await prisma.transportStaffMember.update({
    where: { id: staffId },
    data: {
      workflowStage: 'ACTIVE', backgroundVerified: true,
      policeVerificationStatus: 'VERIFIED',
    },
  });
  await audit(institutionId, 'STAFF', 'License verified', staffId);
  return updated;
}

export async function recordStaffAttendance(institutionId: string, staffId: string, body: Record<string, unknown>) {
  const attendDate = todayDate();
  return prisma.transportStaffAttendance.upsert({
    where: { staffId_attendDate: { staffId, attendDate } },
    create: {
      institutionId, staffId, attendDate,
      status: String(body.status ?? 'PRESENT'),
      method: String(body.method ?? 'BIOMETRIC'),
      checkIn: String(body.checkIn ?? new Date().toTimeString().slice(0, 5)),
    },
    update: {
      status: String(body.status ?? 'PRESENT'),
      checkOut: body.checkOut ? String(body.checkOut) : undefined,
    },
  });
}

export async function seedTransportDriverAttendant(institutionId: string) {
  await seedTransportStudentTransport(institutionId);
  await ensureSettings(institutionId);

  const existing = await prisma.transportStaffMember.count({
    where: { institutionId, employeeCode: { not: '' } },
  });
  if (existing >= 20) return getTransportDriverAttendant(institutionId);

  const routes = await prisma.transportRoute.findMany({ where: { institutionId }, take: 10 });
  const vehicles = await prisma.transportVehicle.findMany({ where: { institutionId, isActive: true }, take: 10 });
  const tripDate = todayDate();
  const in30 = new Date(Date.now() + 25 * 86400000);
  const in60 = new Date(Date.now() + 60 * 86400000);
  const expired = new Date(Date.now() - 10 * 86400000);

  for (let i = 0; i < DRIVER_NAMES.length; i++) {
    const code = `DRV-${String(i + 1).padStart(4, '0')}`;
    const exists = await prisma.transportStaffMember.findFirst({ where: { institutionId, employeeCode: code } });
    if (exists) continue;

    const staff = await prisma.transportStaffMember.create({
      data: {
        institutionId, employeeCode: code, name: DRIVER_NAMES[i], role: 'Driver',
        mobile: `98${String(10000000 + i).slice(0, 8)}`,
        email: `driver${i + 1}@school.edu`,
        employmentType: i % 5 === 0 ? 'Contract' : 'Permanent',
        branch: 'Main Campus', bloodGroup: ['B+', 'O+', 'A+', 'AB+'][i % 4],
        aadhaarNumber: `XXXX-XXXX-${1000 + i}`, panNumber: `ABCDE${1000 + i}F`,
        emergencyContact: 'Spouse', emergencyMobile: `98${String(20000000 + i).slice(0, 8)}`,
        licenseNumber: `RJ-${String(2010000000 + i)}`,
        licenseCategory: i < 12 ? 'LMV' : 'HMV',
        licenseExpiry: i === 2 ? expired : i === 5 ? in30 : in60,
        badgeNumber: `BDG-${1000 + i}`,
        medicalFitnessExpiry: i === 8 ? in30 : in60,
        policeVerificationStatus: i < 13 ? 'VERIFIED' : 'PENDING',
        backgroundVerified: i < 13,
        shiftType: i % 3 === 0 ? 'DOUBLE' : i % 2 === 0 ? 'MORNING' : 'EVENING',
        assignedRouteId: routes[i % routes.length]?.id,
        assignedVehicleId: vehicles[i % vehicles.length]?.id,
        yearsExperience: 3 + (i % 12),
        rating: 3.5 + (i % 15) * 0.1,
        performanceScore: 70 + (i % 25),
        workflowStage: i < 13 ? 'ACTIVE' : 'LICENSE_VERIFICATION',
        staffStatus: i === 14 ? 'ON_LEAVE' : 'ACTIVE',
        onDuty: i !== 14 && i < 13,
        accidentCount: i === 3 ? 1 : 0,
        violationCount: i === 7 ? 2 : i === 11 ? 1 : 0,
        uniformIssued: true,
        hrmsEmployeeId: `HRMS-${2000 + i}`,
      },
    });

    for (const doc of [
      { type: 'Driving License', expiry: i === 2 ? expired : in60 },
      { type: 'Medical Certificate', expiry: i === 8 ? in30 : in60 },
      { type: 'Police Verification', expiry: in60 },
    ]) {
      await prisma.transportStaffDocument.create({
        data: {
          institutionId, staffId: staff.id, documentType: doc.type,
          documentNumber: `DOC-${i}-${doc.type.slice(0, 3)}`,
          expiryDate: doc.expiry,
          status: doc.expiry < new Date() ? 'EXPIRED' : 'VALID',
        },
      });
    }

    for (const course of ['Defensive Driving', 'First Aid', 'Child Safety']) {
      await prisma.transportStaffTraining.create({
        data: {
          institutionId, staffId: staff.id, courseName: course,
          completedAt: new Date('2024-06-15'),
          validTill: in60,
          certificateId: `CERT-${i}-${course.slice(0, 3)}`,
        },
      });
    }

    await prisma.transportStaffDutyRoster.create({
      data: {
        institutionId, staffId: staff.id, rosterDate: tripDate,
        shiftType: staff.shiftType === 'DOUBLE' ? 'MORNING' : staff.shiftType,
        routeId: staff.assignedRouteId, vehicleId: staff.assignedVehicleId, status: 'SCHEDULED',
      },
    });

    if (i < 12) {
      await prisma.transportStaffAttendance.create({
        data: {
          institutionId, staffId: staff.id, attendDate: tripDate,
          status: 'PRESENT', method: i % 3 === 0 ? 'BIOMETRIC' : i % 3 === 1 ? 'MOBILE_GPS' : 'QR',
          checkIn: '06:45', checkOut: i % 2 === 0 ? '16:30' : '',
        },
      });
    }

    if (i === 14) {
      await prisma.transportStaffLeaveRequest.create({
        data: {
          institutionId, staffId: staff.id, leaveType: 'CASUAL',
          fromDate: tripDate, toDate: new Date(tripDate.getTime() + 2 * 86400000),
          reason: 'Family function', status: 'APPROVED',
        },
      });
    }
    if (i === 13) {
      await prisma.transportStaffLeaveRequest.create({
        data: {
          institutionId, staffId: staff.id, leaveType: 'SICK',
          fromDate: new Date(tripDate.getTime() + 3 * 86400000),
          toDate: new Date(tripDate.getTime() + 4 * 86400000),
          reason: 'Medical leave', status: 'PENDING',
        },
      });
    }
    if (i === 7) {
      await prisma.transportStaffComplaint.create({
        data: {
          institutionId, staffId: staff.id, complaintType: 'COMPLAINT',
          severity: 'MEDIUM', description: 'Parent reported late pickup on Route 03',
          status: 'OPEN',
        },
      });
    }
  }

  for (let i = 0; i < ATTENDANT_NAMES.length; i++) {
    const code = `ATT-${String(i + 1).padStart(4, '0')}`;
    const exists = await prisma.transportStaffMember.findFirst({ where: { institutionId, employeeCode: code } });
    if (exists) continue;

    const staff = await prisma.transportStaffMember.create({
      data: {
        institutionId, employeeCode: code, name: ATTENDANT_NAMES[i], role: 'Attendant',
        mobile: `98${String(30000000 + i).slice(0, 8)}`,
        employmentType: 'Permanent', branch: 'Main Campus',
        bloodGroup: ['A+', 'B+', 'O+'][i % 3],
        policeVerificationStatus: 'VERIFIED', backgroundVerified: true,
        shiftType: i % 2 === 0 ? 'MORNING' : 'EVENING',
        assignedRouteId: routes[i % routes.length]?.id,
        assignedVehicleId: vehicles[i % vehicles.length]?.id,
        rating: 4.0 + (i % 8) * 0.1,
        performanceScore: 75 + (i % 20),
        workflowStage: 'ACTIVE', staffStatus: 'ACTIVE', onDuty: i < 8,
        uniformIssued: true,
      },
    });

    await prisma.transportStaffTraining.create({
      data: {
        institutionId, staffId: staff.id, courseName: 'Student Safety & Emergency Evacuation',
        completedAt: new Date('2024-08-01'), validTill: in60,
      },
    });

    await prisma.transportStaffDutyRoster.create({
      data: {
        institutionId, staffId: staff.id, rosterDate: tripDate,
        shiftType: staff.shiftType, routeId: staff.assignedRouteId,
        vehicleId: staff.assignedVehicleId, status: 'SCHEDULED',
      },
    });

    if (i < 7) {
      await prisma.transportStaffAttendance.create({
        data: {
          institutionId, staffId: staff.id, attendDate: tripDate,
          status: 'PRESENT', method: 'BIOMETRIC', checkIn: '06:50',
        },
      });
    }
  }

  await audit(institutionId, 'SYSTEM', 'Demo driver & attendant data seeded');
  return getTransportDriverAttendant(institutionId);
}
