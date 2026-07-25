import { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { applyMessRebate } from './hostelMessManagement.js';
import { seedHostelStudents } from './hostelStudents.js';

const ACADEMIC_YEARS = ['2023-24', '2024-25', '2025-26', '2026-27'];
const LEAVE_TYPES = ['HOME_VISIT', 'LOCAL_OUTING', 'MEDICAL'] as const;
const MIN_NOTICE_HOURS = 24;

type LeaveType = typeof LEAVE_TYPES[number];

const PENDING_STATUSES = ['PENDING', 'PARENT_APPROVED'];
const APPROVED_STATUSES = ['WARDEN_APPROVED', 'ACTIVE', 'COMPLETED', 'APPROVED'];
const REJECTED_STATUSES = ['REJECTED'];

function formatDateTime(d: Date) {
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatDate(d: Date) {
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function generateGatePassQr() {
  return `HLGP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function leaveDaysBetween(out: Date, expectedIn: Date) {
  return Math.ceil((expectedIn.getTime() - out.getTime()) / 86400000) + 1;
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart <= bEnd && bStart <= aEnd;
}

async function logLeaveAudit(
  institutionId: string,
  leaveId: string,
  action: string,
  fromStatus: string,
  toStatus: string,
  performedBy: string,
  details = '',
) {
  await prisma.hostelLeaveAuditLog.create({
    data: { institutionId, leaveId, action, fromStatus, toStatus, performedBy, details },
  });
}

async function logActivity(
  institutionId: string,
  action: string,
  details: string,
  snapshot: Record<string, unknown> = {},
  performedBy = 'System',
) {
  await prisma.hostelActivityLog.create({
    data: {
      institutionId,
      action,
      details,
      filterSnapshot: snapshot as Prisma.InputJsonValue,
      performedBy,
    },
  });
}

function mapLeaveRow(l: {
  id: string;
  studentName: string;
  leaveType: string;
  reason: string;
  addressDuringLeave: string;
  outDateTime: Date;
  expectedInDateTime: Date;
  status: string;
  gatePassQrToken: string;
  exitLoggedAt: Date | null;
  returnLoggedAt: Date | null;
  parentApprovedAt: Date | null;
  wardenApprovedAt: Date | null;
  rejectedAt: Date | null;
  rejectionReason: string;
  createdAt: Date;
  hostel: { hostelName: string } | null;
}) {
  const now = Date.now();
  const isOverstayed = (l.status === 'ACTIVE' || l.status === 'WARDEN_APPROVED')
    && l.expectedInDateTime.getTime() < now
    && !l.returnLoggedAt;

  return {
    id: l.id,
    studentName: l.studentName,
    hostel: l.hostel?.hostelName ?? '—',
    leaveType: l.leaveType.replace('_', ' '),
    reason: l.reason,
    address: l.addressDuringLeave,
    outDateTime: formatDateTime(l.outDateTime),
    expectedInDateTime: formatDateTime(l.expectedInDateTime),
    status: isOverstayed ? 'OVERSTAYED' : l.status,
    gatePassQr: l.gatePassQrToken,
    exitLogged: l.exitLoggedAt ? formatDateTime(l.exitLoggedAt) : null,
    returnLogged: l.returnLoggedAt ? formatDateTime(l.returnLoggedAt) : null,
    parentApprovedAt: l.parentApprovedAt ? formatDateTime(l.parentApprovedAt) : null,
    wardenApprovedAt: l.wardenApprovedAt ? formatDateTime(l.wardenApprovedAt) : null,
    appliedOn: formatDate(l.createdAt),
    isOverstayed,
  };
}

export function countLeaveKpis(apps: { status: string; expectedInDateTime?: Date; returnLoggedAt?: Date | null }[]) {
  let pending = 0;
  let approved = 0;
  let rejected = 0;
  let overstayed = 0;
  const now = Date.now();

  for (const a of apps) {
    if (REJECTED_STATUSES.includes(a.status)) rejected += 1;
    else if (PENDING_STATUSES.includes(a.status)) pending += 1;
    else if (APPROVED_STATUSES.includes(a.status)) {
      approved += 1;
      if (a.expectedInDateTime && a.expectedInDateTime.getTime() < now && !a.returnLoggedAt && (a.status === 'ACTIVE' || a.status === 'WARDEN_APPROVED')) {
        overstayed += 1;
      }
    }
  }

  return { pending, approved, rejected, overstayed, total: apps.length };
}

export async function getLeaveManagement(
  institutionId: string,
  academicYear = '2025-26',
  filters: { status?: string; userRole?: string } = {},
) {
  const where: Prisma.HostelLeaveApplicationWhereInput = { institutionId, academicYear };
  if (filters.status && filters.status !== 'ALL') where.status = filters.status;

  const [applications, hostels, students] = await Promise.all([
    prisma.hostelLeaveApplication.findMany({
      where,
      include: { hostel: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.hostelMaster.findMany({ where: { institutionId, academicYear, status: 'ACTIVE' }, orderBy: { hostelName: 'asc' } }),
    prisma.hostelStudentProfile.findMany({
      where: { institutionId, academicYear, residentStatus: 'ACTIVE' },
      include: { student: true },
      take: 50,
    }),
  ]);

  const allApps = await prisma.hostelLeaveApplication.findMany({ where: { institutionId, academicYear } });
  const kpis = countLeaveKpis(allApps);

  const chart = [
    { name: 'Pending', value: kpis.pending, color: '#f59e0b', percent: kpis.total ? `${Math.round((kpis.pending / kpis.total) * 100)}%` : '0%' },
    { name: 'Approved', value: kpis.approved, color: '#10b981', percent: kpis.total ? `${Math.round((kpis.approved / kpis.total) * 100)}%` : '0%' },
    { name: 'Rejected', value: kpis.rejected, color: '#ef4444', percent: kpis.total ? `${Math.round((kpis.rejected / kpis.total) * 100)}%` : '0%' },
  ];

  const overstayed = applications
    .filter((l) => {
      const row = mapLeaveRow(l);
      return row.isOverstayed;
    })
    .map((l) => mapLeaveRow(l));

  await logActivity(institutionId, 'VIEW_LEAVE_MGMT', 'Leave management accessed', { academicYear }, filters.userRole);

  return {
    academicYear,
    academicYears: ACADEMIC_YEARS,
    leaveTypes: LEAVE_TYPES.map((t) => ({ value: t, label: t.replace('_', ' ') })),
    kpis,
    chart,
    applications: applications.map((l) => mapLeaveRow(l)),
    overstayedLeaves: overstayed,
    students: students.map((s) => ({
      profileId: s.id,
      studentId: s.studentId,
      studentName: `${s.student.firstName} ${s.student.lastName}`.trim(),
      hostelId: s.hostelId,
      disciplinaryPoints: s.disciplinaryPoints,
    })),
    hostels: hostels.map((h) => ({ id: h.id, name: h.hostelName })),
    permissions: rolePermissions(filters.userRole ?? 'Warden'),
    minNoticeHours: MIN_NOTICE_HOURS,
    reports: ['Leave Register', 'Overstayed Leave Report (Defaulters)'],
    exportFormats: ['PDF', 'Excel', 'CSV'],
    statusFlow: ['PENDING', 'PARENT_APPROVED', 'WARDEN_APPROVED', 'ACTIVE', 'COMPLETED', 'REJECTED'],
    automationRules: [
      'Auto-reject if student has pending disciplinary actions',
      'Digital gate pass QR on warden approval',
      'Mess rebate auto-applied for leaves > 3 days',
      'Academic attendance marked On Leave',
    ],
    erpIntegration: ['Academic Attendance — auto On Leave mark', 'Mess Management — rebate on extended leave'],
  };
}

function rolePermissions(role: string) {
  if (role === 'Student') {
    return { canApply: true, canParentApprove: false, canWardenApprove: false, canSecurityVerify: false, canExport: false };
  }
  if (role === 'Parent') {
    return { canApply: false, canParentApprove: true, canWardenApprove: false, canSecurityVerify: false, canExport: false };
  }
  if (role === 'Warden') {
    return { canApply: false, canParentApprove: false, canWardenApprove: true, canSecurityVerify: false, canExport: true };
  }
  if (role === 'Security') {
    return { canApply: false, canParentApprove: false, canWardenApprove: false, canSecurityVerify: true, canExport: false };
  }
  return { canApply: true, canParentApprove: true, canWardenApprove: true, canSecurityVerify: true, canExport: true };
}

async function validateLeaveRequest(
  institutionId: string,
  studentProfileId: string,
  outDateTime: Date,
  expectedInDateTime: Date,
  excludeLeaveId?: string,
) {
  const profile = await prisma.hostelStudentProfile.findFirst({
    where: { id: studentProfileId, institutionId },
  });
  if (!profile) throw new Error('Student profile not found');

  if (profile.disciplinaryPoints >= 3) {
    throw new Error('Leave auto-rejected — pending disciplinary actions on record');
  }

  const hoursUntilOut = (outDateTime.getTime() - Date.now()) / 3600000;
  if (hoursUntilOut < MIN_NOTICE_HOURS) {
    throw new Error(`Minimum ${MIN_NOTICE_HOURS}-hour advance notice required`);
  }

  if (expectedInDateTime <= outDateTime) {
    throw new Error('Expected return must be after departure');
  }

  const existing = await prisma.hostelLeaveApplication.findMany({
    where: {
      institutionId,
      studentProfileId,
      status: { in: [...PENDING_STATUSES, ...APPROVED_STATUSES, 'ACTIVE', 'WARDEN_APPROVED'] },
      ...(excludeLeaveId ? { NOT: { id: excludeLeaveId } } : {}),
    },
  });

  for (const e of existing) {
    if (overlaps(outDateTime, expectedInDateTime, e.outDateTime, e.expectedInDateTime)) {
      throw new Error('Leave dates overlap with an existing approved or pending leave');
    }
  }

  return profile;
}

export async function submitLeaveRequest(
  institutionId: string,
  body: {
    studentProfileId: string;
    leaveType: LeaveType;
    reason: string;
    addressDuringLeave: string;
    outDateTime: string;
    expectedInDateTime: string;
    academicYear?: string;
  },
) {
  const outDateTime = new Date(body.outDateTime);
  const expectedInDateTime = new Date(body.expectedInDateTime);
  const academicYear = body.academicYear ?? '2025-26';

  let profile;
  let hasDisciplinaryBlock = false;
  try {
    profile = await validateLeaveRequest(institutionId, body.studentProfileId, outDateTime, expectedInDateTime);
  } catch (e) {
    if (e instanceof Error && e.message.includes('disciplinary')) {
      hasDisciplinaryBlock = true;
      profile = await prisma.hostelStudentProfile.findFirst({ where: { id: body.studentProfileId, institutionId } });
      if (!profile) throw e;
    } else {
      throw e;
    }
  }

  const studentName = await prisma.student.findUnique({ where: { id: profile!.studentId } }).then(
    (s) => (s ? `${s.firstName} ${s.lastName}`.trim() : 'Student'),
  );

  const leave = await prisma.hostelLeaveApplication.create({
    data: {
      institutionId,
      hostelId: profile!.hostelId,
      studentId: profile!.studentId,
      studentProfileId: body.studentProfileId,
      studentName,
      leaveType: body.leaveType,
      reason: body.reason,
      addressDuringLeave: body.addressDuringLeave,
      outDateTime,
      expectedInDateTime,
      status: hasDisciplinaryBlock ? 'REJECTED' : 'PENDING',
      hasDisciplinaryBlock,
      rejectionReason: hasDisciplinaryBlock ? 'Pending disciplinary actions' : '',
      rejectedBy: hasDisciplinaryBlock ? 'System' : '',
      rejectedAt: hasDisciplinaryBlock ? new Date() : null,
      academicYear,
    },
  });

  await logLeaveAudit(institutionId, leave.id, 'LEAVE_SUBMITTED', '', leave.status, studentName, body.reason);

  if (hasDisciplinaryBlock) {
    return { success: false, leave, message: 'Leave auto-rejected due to disciplinary actions' };
  }

  return {
    success: true,
    leave,
    message: 'Leave request submitted',
    notifications: [`Push notify Parent: Leave request from ${studentName} requires approval`],
    demoParentOtp: generateOtp(),
  };
}

export async function parentApproveLeave(
  institutionId: string,
  leaveId: string,
  body: { otp: string; parentName?: string },
) {
  const leave = await prisma.hostelLeaveApplication.findFirst({ where: { id: leaveId, institutionId } });
  if (!leave || leave.status !== 'PENDING') throw new Error('Leave not found or not awaiting parent approval');

  const demoOtp = '123456';
  if (body.otp !== demoOtp && body.otp.length !== 6) {
    throw new Error('Parent OTP verification failed');
  }

  const updated = await prisma.hostelLeaveApplication.update({
    where: { id: leaveId },
    data: {
      status: 'PARENT_APPROVED',
      parentApprovedAt: new Date(),
      parentApprovedBy: body.parentName ?? 'Parent',
      parentOtpVerified: true,
    },
  });

  await logLeaveAudit(institutionId, leaveId, 'PARENT_APPROVED', 'PENDING', 'PARENT_APPROVED', body.parentName ?? 'Parent');

  return {
    success: true,
    leave: updated,
    message: 'Parent approval recorded',
    notifications: [`Push notify Warden: ${leave.studentName} leave awaiting warden approval`],
  };
}

export async function wardenApproveLeave(
  institutionId: string,
  leaveId: string,
  wardenName = 'Warden',
) {
  const leave = await prisma.hostelLeaveApplication.findFirst({ where: { id: leaveId, institutionId } });
  if (!leave || leave.status !== 'PARENT_APPROVED') {
    throw new Error('Leave must be parent-approved before warden approval');
  }

  const qrToken = generateGatePassQr();
  const updated = await prisma.hostelLeaveApplication.update({
    where: { id: leaveId },
    data: {
      status: 'WARDEN_APPROVED',
      wardenApprovedAt: new Date(),
      wardenApprovedBy: wardenName,
      gatePassQrToken: qrToken,
    },
  });

  await logLeaveAudit(institutionId, leaveId, 'WARDEN_APPROVED', 'PARENT_APPROVED', 'WARDEN_APPROVED', wardenName);

  const days = leaveDaysBetween(leave.outDateTime, leave.expectedInDateTime);
  if (days > 3) {
    await applyMessRebate(institutionId, leave.studentProfileId, leave.studentName, days, leave.academicYear);
  }

  await logActivity(
    institutionId,
    'ACADEMIC_ATTENDANCE_SYNC',
    `Student ${leave.studentName} marked On Leave in academic attendance`,
    { leaveId, from: formatDate(leave.outDateTime), to: formatDate(leave.expectedInDateTime) },
  );

  return {
    success: true,
    leave: updated,
    gatePassQr: qrToken,
    message: 'Leave approved by warden — digital gate pass issued',
    notifications: [
      `Push to Student: Leave Approved by Warden`,
      `QR Gate Pass: ${qrToken}`,
    ],
  };
}

export async function rejectLeave(
  institutionId: string,
  leaveId: string,
  body: { rejectedBy: string; rejectionReason: string },
) {
  const leave = await prisma.hostelLeaveApplication.findFirst({ where: { id: leaveId, institutionId } });
  if (!leave || REJECTED_STATUSES.includes(leave.status)) throw new Error('Cannot reject this leave');

  const updated = await prisma.hostelLeaveApplication.update({
    where: { id: leaveId },
    data: {
      status: 'REJECTED',
      rejectedBy: body.rejectedBy,
      rejectionReason: body.rejectionReason,
      rejectedAt: new Date(),
    },
  });

  await logLeaveAudit(institutionId, leaveId, 'LEAVE_REJECTED', leave.status, 'REJECTED', body.rejectedBy, body.rejectionReason);
  return { success: true, leave: updated, message: 'Leave rejected' };
}

export async function securityVerifyExit(
  institutionId: string,
  body: { gatePassQr: string; securityName?: string },
) {
  const leave = await prisma.hostelLeaveApplication.findFirst({
    where: { institutionId, gatePassQrToken: body.gatePassQr, status: { in: ['WARDEN_APPROVED', 'ACTIVE'] } },
  });
  if (!leave) throw new Error('Invalid or inactive gate pass');

  const now = new Date();
  const updated = await prisma.hostelLeaveApplication.update({
    where: { id: leave.id },
    data: {
      status: 'ACTIVE',
      exitLoggedAt: now,
      securityVerifiedBy: body.securityName ?? 'Security',
    },
  });

  await logLeaveAudit(institutionId, leave.id, 'EXIT_LOGGED', leave.status, 'ACTIVE', body.securityName ?? 'Security');

  return {
    success: true,
    leave: updated,
    message: `Exit verified for ${leave.studentName}`,
    notifications: [`SMS to Parent: Student ${leave.studentName} has exited the campus at ${formatDateTime(now)}`],
  };
}

export async function securityLogReturn(
  institutionId: string,
  leaveId: string,
  securityName = 'Security',
) {
  const leave = await prisma.hostelLeaveApplication.findFirst({ where: { id: leaveId, institutionId } });
  if (!leave || leave.status !== 'ACTIVE') throw new Error('Leave not active');

  const now = new Date();
  const updated = await prisma.hostelLeaveApplication.update({
    where: { id: leaveId },
    data: {
      status: 'COMPLETED',
      returnLoggedAt: now,
      actualReturnAt: now,
    },
  });

  await logLeaveAudit(institutionId, leaveId, 'RETURN_LOGGED', 'ACTIVE', 'COMPLETED', securityName);
  return { success: true, leave: updated, message: 'Return logged — leave closed' };
}

export async function getLeaveDetail(institutionId: string, leaveId: string) {
  const leave = await prisma.hostelLeaveApplication.findFirst({
    where: { id: leaveId, institutionId },
    include: { hostel: true, auditLogs: { orderBy: { createdAt: 'asc' } } },
  });
  if (!leave) throw new Error('Leave not found');

  return {
    ...mapLeaveRow(leave),
    auditTrail: leave.auditLogs.map((a) => ({
      action: a.action,
      fromStatus: a.fromStatus,
      toStatus: a.toStatus,
      performedBy: a.performedBy,
      details: a.details,
      at: formatDateTime(a.createdAt),
    })),
  };
}

export async function exportLeaveReport(
  institutionId: string,
  academicYear: string,
  format: 'PDF' | 'Excel' | 'CSV',
  reportType = 'Leave Register',
) {
  const data = await getLeaveManagement(institutionId, academicYear);
  const fileName = `hostel_leave_${Date.now()}.${format.toLowerCase()}`;
  await logActivity(institutionId, 'EXPORT_LEAVE', `Exported ${reportType}`, { format });
  return { success: true, format, fileName, message: `${reportType} exported`, snapshot: data };
}

export async function seedLeaveManagement(institutionId: string) {
  await seedHostelStudents(institutionId);
  const academicYear = '2025-26';

  const existing = await prisma.hostelLeaveApplication.count({ where: { institutionId, academicYear } });
  if (existing >= 100) return getLeaveManagement(institutionId, academicYear);

  await prisma.hostelLeaveAuditLog.deleteMany({ where: { institutionId } });
  await prisma.hostelLeaveApplication.deleteMany({ where: { institutionId } });

  const hostels = await prisma.hostelMaster.findMany({ where: { institutionId, status: 'ACTIVE' }, take: 3 });
  const profiles = await prisma.hostelStudentProfile.findMany({
    where: { institutionId, residentStatus: 'ACTIVE' },
    include: { student: true },
    take: 120,
  });

  const types: LeaveType[] = ['HOME_VISIT', 'LOCAL_OUTING', 'MEDICAL'];
  const now = new Date();

  async function createLeave(
    profile: typeof profiles[0],
    status: string,
    offsetDays: number,
    durationDays: number,
  ) {
    const out = new Date(now.getTime() + offsetDays * 86400000);
    out.setHours(8, 0, 0, 0);
    const expectedIn = new Date(out.getTime() + durationDays * 86400000);
    expectedIn.setHours(18, 0, 0, 0);
    const name = `${profile.student.firstName} ${profile.student.lastName}`.trim();

    const leave = await prisma.hostelLeaveApplication.create({
      data: {
        institutionId,
        hostelId: profile.hostelId ?? hostels[0]?.id,
        studentId: profile.studentId,
        studentProfileId: profile.id,
        studentName: name,
        leaveType: types[Math.abs(offsetDays) % types.length],
        reason: status === 'REJECTED' ? 'Insufficient notice' : 'Family visit',
        addressDuringLeave: '123 Home Street, City',
        outDateTime: out,
        expectedInDateTime: expectedIn,
        status,
        academicYear,
        parentApprovedAt: ['PARENT_APPROVED', 'WARDEN_APPROVED', 'ACTIVE', 'COMPLETED', 'APPROVED'].includes(status) ? new Date() : null,
        parentApprovedBy: 'Parent',
        parentOtpVerified: true,
        wardenApprovedAt: ['WARDEN_APPROVED', 'ACTIVE', 'COMPLETED', 'APPROVED'].includes(status) ? new Date() : null,
        wardenApprovedBy: 'Warden',
        gatePassQrToken: ['WARDEN_APPROVED', 'ACTIVE', 'COMPLETED', 'APPROVED'].includes(status) ? generateGatePassQr() : '',
        exitLoggedAt: ['ACTIVE', 'COMPLETED'].includes(status) ? out : null,
        returnLoggedAt: status === 'COMPLETED' ? expectedIn : null,
        rejectedAt: status === 'REJECTED' ? new Date() : null,
        rejectedBy: status === 'REJECTED' ? 'Warden' : '',
        rejectionReason: status === 'REJECTED' ? 'Dates conflict with exam schedule' : '',
      },
    });

    await logLeaveAudit(institutionId, leave.id, 'SEED', '', status, 'System');
    return leave;
  }

  let idx = 0;
  for (let i = 0; i < 64 && idx < profiles.length; i += 1, idx += 1) {
    const st = i % 5 === 0 ? 'PARENT_APPROVED' : 'PENDING';
    await createLeave(profiles[idx % profiles.length], st, 2 + (i % 7), 2);
  }
  for (let i = 0; i < 34 && idx < profiles.length; i += 1, idx += 1) {
    const st = i % 4 === 0 ? 'COMPLETED' : i % 3 === 0 ? 'ACTIVE' : 'WARDEN_APPROVED';
    await createLeave(profiles[idx % profiles.length], st, 1, 3);
  }
  for (let i = 0; i < 8 && idx < profiles.length; i += 1, idx += 1) {
    await createLeave(profiles[idx % profiles.length], 'REJECTED', 0, 1);
  }

  const overstayedProfile = profiles[0];
  if (overstayedProfile) {
    const out = new Date(now.getTime() - 5 * 86400000);
    const expectedIn = new Date(now.getTime() - 1 * 86400000);
    await prisma.hostelLeaveApplication.create({
      data: {
        institutionId,
        hostelId: overstayedProfile.hostelId,
        studentId: overstayedProfile.studentId,
        studentProfileId: overstayedProfile.id,
        studentName: `${overstayedProfile.student.firstName} ${overstayedProfile.student.lastName}`.trim(),
        leaveType: 'HOME_VISIT',
        reason: 'Extended family emergency',
        addressDuringLeave: 'Home',
        outDateTime: out,
        expectedInDateTime: expectedIn,
        status: 'ACTIVE',
        academicYear,
        parentApprovedAt: out,
        parentApprovedBy: 'Parent',
        parentOtpVerified: true,
        wardenApprovedAt: out,
        wardenApprovedBy: 'Warden',
        gatePassQrToken: generateGatePassQr(),
        exitLoggedAt: out,
      },
    });
  }

  await logActivity(institutionId, 'SEED_LEAVE', 'Leave management demo seeded');
  return getLeaveManagement(institutionId, academicYear);
}
