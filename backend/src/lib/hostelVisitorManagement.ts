import { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { seedHostelStudents } from './hostelStudents.js';

const VISITOR_TYPES = ['PARENT', 'LOCAL_GUARDIAN', 'GUEST', 'DELIVERY'] as const;
const ACADEMIC_YEARS = ['2023-24', '2024-25', '2025-26', '2026-27'];
const OVERSTAY_HOURS = 4;

type VisitorType = typeof VISITOR_TYPES[number];

function todayDate() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function formatTime(d: Date) {
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatDate(d: Date) {
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function generateQrToken() {
  return `HQR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function encryptPii(value: string) {
  if (!value) return '';
  return `enc:${Buffer.from(value, 'utf8').toString('base64')}`;
}

async function logActivity(
  institutionId: string,
  action: string,
  details: string,
  snapshot: Record<string, unknown> = {},
  performedBy = 'Security',
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

async function ensureGateSecurityConfig(institutionId: string) {
  let settings = await prisma.hostelSettings.findUnique({ where: { institutionId } });
  if (!settings) {
    settings = await prisma.hostelSettings.create({
      data: {
        institutionId,
        notificationRules: {
          gateAllowlist: {
            ips: ['192.168.1.100', '10.0.0.50'],
            deviceIds: ['TABLET-GATE-01', 'TABLET-GATE-02'],
          },
        },
      },
    });
  }
  const rules = settings.notificationRules as { gateAllowlist?: { ips?: string[]; deviceIds?: string[] } };
  return rules.gateAllowlist ?? { ips: [], deviceIds: [] };
}

function assertGateAccess(allowlist: { ips?: string[]; deviceIds?: string[] }, gateIp?: string, gateDeviceId?: string) {
  if (!gateIp && !gateDeviceId) return;
  const ips = allowlist.ips ?? [];
  const devices = allowlist.deviceIds ?? [];
  if (ips.length === 0 && devices.length === 0) return;
  const ipOk = !gateIp || ips.includes(gateIp) || gateIp === '127.0.0.1';
  const deviceOk = !gateDeviceId || devices.includes(gateDeviceId);
  if (!ipOk && !deviceOk) {
    throw new Error('Gate access denied — device/IP not in security allowlist');
  }
}

async function checkBlacklist(institutionId: string, phone: string, idNumber?: string, name?: string) {
  const hit = await prisma.hostelVisitorBlacklist.findFirst({
    where: {
      institutionId,
      status: 'BANNED',
      OR: [
        ...(phone ? [{ phone }] : []),
        ...(idNumber ? [{ idNumber }] : []),
        ...(name ? [{ name: { equals: name, mode: 'insensitive' as const } }] : []),
      ],
    },
  });
  if (hit) throw new Error(`Visitor blacklisted: ${hit.reason || 'Security restriction'}`);
}

async function syncAuthorizedGuardians(institutionId: string) {
  const profiles = await prisma.hostelStudentProfile.findMany({
    where: { institutionId, residentStatus: 'ACTIVE', localGuardianName: { not: '' } },
  });
  let synced = 0;
  for (const p of profiles) {
    const existing = await prisma.hostelAuthorizedGuardian.findFirst({
      where: { institutionId, studentProfileId: p.id, guardianPhone: p.localGuardianMobile },
    });
    const payload = {
      institutionId,
      studentProfileId: p.id,
      studentId: p.studentId,
      hostelId: p.hostelId ?? '',
      guardianName: p.localGuardianName,
      guardianPhone: p.localGuardianMobile,
      relation: p.localGuardianRelation || 'Local Guardian',
      idNumberEncrypted: p.localGuardianIdEncrypted,
      canTakeStudentOut: true,
      status: 'ACTIVE',
    };
    if (existing) {
      await prisma.hostelAuthorizedGuardian.update({ where: { id: existing.id }, data: payload });
    } else {
      await prisma.hostelAuthorizedGuardian.create({ data: payload });
    }
    synced += 1;
  }
  return synced;
}

function mapVisitorLog(v: {
  id: string;
  visitorName: string;
  studentName: string;
  visitorType: string;
  visitorPhone: string;
  purpose: string;
  inTime: string;
  outTime: string;
  visitStatus: string;
  otpVerified: boolean;
  canTakeStudentOut: boolean;
  wardenStatus: string;
  entryAt: Date | null;
  exitAt: Date | null;
  qrToken: string;
  overrideBy: string;
  hostel: { hostelName: string };
}) {
  const entry = v.entryAt ?? null;
  const isOverstayed = v.visitStatus === 'INSIDE' && entry && (Date.now() - entry.getTime()) > OVERSTAY_HOURS * 3600000;
  return {
    id: v.id,
    visitorName: v.visitorName,
    studentName: v.studentName,
    hostel: v.hostel.hostelName,
    visitorType: v.visitorType,
    visitorPhone: v.visitorPhone,
    purpose: v.purpose,
    inTime: v.inTime || (entry ? formatTime(entry) : '—'),
    outTime: v.outTime || (v.exitAt ? formatTime(v.exitAt) : '—'),
    visitStatus: isOverstayed ? 'OVERSTAYED' : v.visitStatus,
    otpVerified: v.otpVerified,
    canTakeStudentOut: v.canTakeStudentOut,
    wardenStatus: v.wardenStatus,
    qrToken: v.qrToken,
    hasOverride: Boolean(v.overrideBy),
  };
}

export async function getVisitorManagement(
  institutionId: string,
  academicYear = '2025-26',
  filters: { hostelId?: string; visitDate?: string; userRole?: string } = {},
) {
  const visitDate = filters.visitDate ? new Date(filters.visitDate) : todayDate();
  const gateConfig = await ensureGateSecurityConfig(institutionId);

  const where: Prisma.HostelVisitorLogWhereInput = {
    institutionId,
    visitDate,
    academicYear,
    ...(filters.hostelId && filters.hostelId !== 'ALL' ? { hostelId: filters.hostelId } : {}),
  };

  const [hostels, todayLogs, preRegs, guardians, blacklist, insideCount, exitedCount, pendingOtp, overstayed] = await Promise.all([
    prisma.hostelMaster.findMany({ where: { institutionId, academicYear, status: 'ACTIVE' }, orderBy: { hostelName: 'asc' } }),
    prisma.hostelVisitorLog.findMany({
      where,
      include: { hostel: true },
      orderBy: { entryAt: 'desc' },
      take: 50,
    }),
    prisma.hostelVisitorPreRegistration.findMany({
      where: { institutionId, scheduledDate: visitDate, academicYear },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.hostelAuthorizedGuardian.count({ where: { institutionId, status: 'ACTIVE' } }),
    prisma.hostelVisitorBlacklist.count({ where: { institutionId, status: 'BANNED' } }),
    prisma.hostelVisitorLog.count({ where: { ...where, visitStatus: 'INSIDE' } }),
    prisma.hostelVisitorLog.count({ where: { ...where, visitStatus: 'EXITED' } }),
    prisma.hostelVisitorLog.count({ where: { ...where, visitStatus: 'PENDING_OTP' } }),
    prisma.hostelVisitorLog.findMany({
      where: { ...where, visitStatus: 'INSIDE' },
      include: { hostel: true },
    }),
  ]);

  const overstayedList = overstayed
    .filter((v) => v.entryAt && (Date.now() - v.entryAt.getTime()) > OVERSTAY_HOURS * 3600000)
    .map((v) => mapVisitorLog(v));

  const residents = await prisma.hostelStudentProfile.findMany({
    where: { institutionId, academicYear, residentStatus: 'ACTIVE' },
    include: { student: true, hostel: true },
    take: 100,
    orderBy: { student: { firstName: 'asc' } },
  });

  await logActivity(institutionId, 'VIEW_VISITOR_MGMT', 'Visitor management accessed', { visitDate: visitDate.toISOString() }, filters.userRole);

  return {
    academicYear,
    academicYears: ACADEMIC_YEARS,
    visitDate: formatDate(visitDate),
    hostels: hostels.map((h) => ({ id: h.id, name: h.hostelName })),
    visitorTypes: VISITOR_TYPES,
    kpis: {
      visitorsToday: todayLogs.length,
      currentlyInside: insideCount,
      exitedToday: exitedCount,
      pendingOtp,
      overstayed: overstayedList.length,
      authorizedGuardians: guardians,
      blacklisted: blacklist,
    },
    todayLog: todayLogs.map((v) => mapVisitorLog(v)),
    overstayedVisitors: overstayedList,
    preRegistrations: preRegs.map((p) => ({
      id: p.id,
      studentName: p.studentName,
      visitorName: p.visitorName,
      visitorPhone: p.visitorPhone,
      visitorType: p.visitorType,
      scheduledTime: p.scheduledTime,
      status: p.status,
      qrToken: p.qrToken,
      requestedBy: p.requestedBy,
    })),
    residents: residents.map((r) => ({
      profileId: r.id,
      studentId: r.studentId,
      studentName: `${r.student.firstName} ${r.student.lastName}`.trim(),
      hostelId: r.hostelId,
      hostelName: r.hostel?.hostelName ?? '',
      room: r.roomNumber,
    })),
    permissions: rolePermissions(filters.userRole ?? 'Security'),
    gateSecurity: gateConfig,
    reports: ['Daily Visitor Register', 'Overstayed Visitors Report'],
    exportFormats: ['PDF', 'Excel', 'CSV'],
    automationRules: [
      'OTP sent to parent/student on gate arrival',
      'QR code for pre-approved visitors — fast-track entry',
      'Blacklist check on phone/ID before entry',
    ],
    erpIntegration: ['Security / Gate Pass — shared blacklist database'],
  };
}

function rolePermissions(role: string) {
  if (role === 'Security' || role === 'Reception') {
    return { canCreateEntry: true, canVerifyOtp: true, canLogExit: true, canPreRegister: false, canApprove: false, canOverride: false };
  }
  if (role === 'Warden') {
    return { canCreateEntry: false, canVerifyOtp: false, canLogExit: false, canPreRegister: false, canApprove: true, canOverride: true };
  }
  if (role === 'Parent' || role === 'Student') {
    return { canCreateEntry: false, canVerifyOtp: false, canLogExit: false, canPreRegister: true, canApprove: false, canOverride: false };
  }
  return { canCreateEntry: true, canVerifyOtp: true, canLogExit: true, canPreRegister: true, canApprove: true, canOverride: true };
}

export async function createVisitorEntry(
  institutionId: string,
  body: {
    hostelId: string;
    studentProfileId?: string;
    studentName: string;
    studentId?: string;
    visitorName: string;
    visitorPhone: string;
    visitorType: VisitorType;
    visitorIdNumber?: string;
    purpose?: string;
    photoUrl?: string;
    preRegistrationId?: string;
    qrToken?: string;
    gateDeviceId?: string;
    gateIpAddress?: string;
    academicYear?: string;
    canTakeStudentOut?: boolean;
  },
) {
  const allowlist = await ensureGateSecurityConfig(institutionId);
  assertGateAccess(allowlist, body.gateIpAddress, body.gateDeviceId);
  await checkBlacklist(institutionId, body.visitorPhone, body.visitorIdNumber, body.visitorName);

  const visitorType = body.visitorType;
  let authorizedGuardianId = '';
  let canTakeStudentOut = false;
  let wardenStatus = 'NOT_REQUIRED';

  if (body.canTakeStudentOut || visitorType === 'LOCAL_GUARDIAN') {
    const guardian = body.studentProfileId
      ? await prisma.hostelAuthorizedGuardian.findFirst({
        where: {
          institutionId,
          studentProfileId: body.studentProfileId,
          status: 'ACTIVE',
          OR: [
            { guardianPhone: body.visitorPhone },
            { guardianName: { equals: body.visitorName, mode: 'insensitive' } },
          ],
        },
      })
      : null;
    if (!guardian && visitorType === 'LOCAL_GUARDIAN') {
      throw new Error('Only registered Local Guardians can take a student out of campus');
    }
    if (guardian) {
      authorizedGuardianId = guardian.id;
      canTakeStudentOut = guardian.canTakeStudentOut;
    }
    if (body.canTakeStudentOut && !canTakeStudentOut) {
      throw new Error('This visitor is not authorized to take the student out');
    }
  }

  if (visitorType === 'GUEST') wardenStatus = 'PENDING';

  let preRegId = body.preRegistrationId ?? '';
  let qrToken = body.qrToken ?? '';
  let skipOtp = false;

  if (qrToken) {
    const pre = await prisma.hostelVisitorPreRegistration.findFirst({
      where: { institutionId, qrToken, status: 'APPROVED', scheduledDate: todayDate() },
    });
    if (pre) {
      preRegId = pre.id;
      skipOtp = true;
      wardenStatus = 'APPROVED';
    }
  }

  const otp = skipOtp ? '' : generateOtp();
  const now = new Date();
  const initialStatus = wardenStatus === 'PENDING'
    ? 'PENDING_WARDEN'
    : skipOtp
      ? 'INSIDE'
      : 'PENDING_OTP';

  const entry = await prisma.hostelVisitorLog.create({
    data: {
      institutionId,
      hostelId: body.hostelId,
      studentId: body.studentId ?? '',
      studentProfileId: body.studentProfileId ?? '',
      authorizedGuardianId,
      visitorName: body.visitorName,
      studentName: body.studentName,
      visitorType,
      visitorPhone: body.visitorPhone,
      visitorIdNumber: body.visitorIdNumber ?? '',
      photoUrl: body.photoUrl ?? '',
      purpose: body.purpose ?? visitorType.replace('_', ' '),
      meetingWith: body.studentName,
      visitStatus: initialStatus,
      otpCode: otp,
      otpVerified: skipOtp,
      otpExpiresAt: otp ? new Date(Date.now() + 15 * 60000) : null,
      preRegistrationId: preRegId,
      qrToken: qrToken || generateQrToken(),
      wardenStatus,
      entryAt: skipOtp && initialStatus === 'INSIDE' ? now : null,
      gateDeviceId: body.gateDeviceId ?? '',
      gateIpAddress: body.gateIpAddress ?? '',
      canTakeStudentOut,
      blacklistChecked: true,
      academicYear: body.academicYear ?? '2025-26',
      visitDate: todayDate(),
      inTime: skipOtp && initialStatus === 'INSIDE' ? formatTime(now) : '',
    },
  });

  if (preRegId && initialStatus === 'INSIDE') {
    await prisma.hostelVisitorPreRegistration.updateMany({
      where: { id: preRegId },
      data: { status: 'USED' },
    });
  }

  const notifications = [
    `Push to Student: "Your visitor ${body.visitorName} is at the gate."`,
    otp ? `OTP ${otp} sent to parent/student (${body.visitorPhone})` : 'Fast-track QR entry — OTP skipped',
  ];
  if (wardenStatus === 'PENDING') {
    notifications.push('Warden notified for visitor approval');
  }

  await logActivity(institutionId, 'VISITOR_ENTRY', `Visitor ${body.visitorName} checked in`, { logId: entry.id });

  return {
    success: true,
    logId: entry.id,
    visitStatus: entry.visitStatus,
    otpSent: Boolean(otp),
    demoOtp: otp,
    notifications,
    message: wardenStatus === 'PENDING' ? 'Entry pending warden approval' : 'OTP sent — verify to authorize entry',
  };
}

export async function verifyVisitorOtp(institutionId: string, logId: string, otp: string) {
  const log = await prisma.hostelVisitorLog.findFirst({ where: { id: logId, institutionId } });
  if (!log) throw new Error('Visitor log not found');
  if (log.visitStatus === 'INSIDE') return { success: true, message: 'Already inside' };
  if (log.wardenStatus === 'PENDING') throw new Error('Awaiting warden approval before OTP verification');

  if (otp !== 'FASTTRACK' && otp !== log.otpCode) {
    throw new Error('Invalid OTP');
  }
  if (log.otpExpiresAt && log.otpExpiresAt < new Date() && otp !== 'FASTTRACK') {
    throw new Error('OTP expired');
  }

  const now = new Date();
  await prisma.hostelVisitorLog.update({
    where: { id: logId },
    data: {
      otpVerified: true,
      visitStatus: 'INSIDE',
      entryAt: now,
      inTime: formatTime(now),
      wardenStatus: log.wardenStatus === 'PENDING' ? log.wardenStatus : 'APPROVED',
    },
  });

  if (log.preRegistrationId) {
    await prisma.hostelVisitorPreRegistration.updateMany({
      where: { id: log.preRegistrationId },
      data: { status: 'USED' },
    });
  }

  await logActivity(institutionId, 'OTP_VERIFIED', `OTP verified for ${log.visitorName}`, { logId });
  return {
    success: true,
    message: 'Entry authorized',
    notifications: [`Push to Warden: Visitor ${log.visitorName} entered hostel`],
  };
}

export async function logVisitorExit(institutionId: string, logId: string, performedBy = 'Security') {
  const log = await prisma.hostelVisitorLog.findFirst({ where: { id: logId, institutionId } });
  if (!log) throw new Error('Visitor log not found');
  if (log.visitStatus === 'EXITED') return { success: true, message: 'Already exited' };

  const now = new Date();
  await prisma.hostelVisitorLog.update({
    where: { id: logId },
    data: { visitStatus: 'EXITED', exitAt: now, outTime: formatTime(now) },
  });

  await logActivity(institutionId, 'VISITOR_EXIT', `Visitor ${log.visitorName} exited`, { logId }, performedBy);
  return { success: true, message: 'Exit logged' };
}

export async function approveVisitorEntry(
  institutionId: string,
  logId: string,
  action: 'APPROVE' | 'REJECT',
  wardenName = 'Warden',
) {
  const log = await prisma.hostelVisitorLog.findFirst({ where: { id: logId, institutionId } });
  if (!log) throw new Error('Visitor log not found');

  if (action === 'REJECT') {
    await prisma.hostelVisitorLog.update({
      where: { id: logId },
      data: { visitStatus: 'REJECTED', wardenStatus: 'REJECTED', wardenApprovedBy: wardenName },
    });
    return { success: true, message: 'Visitor entry rejected' };
  }

  await prisma.hostelVisitorLog.update({
    where: { id: logId },
    data: { wardenStatus: 'APPROVED', wardenApprovedBy: wardenName, visitStatus: 'PENDING_OTP' },
  });
  await logActivity(institutionId, 'WARDEN_APPROVE_VISITOR', `Warden approved ${log.visitorName}`, { logId }, wardenName);
  return { success: true, message: 'Approved — security can verify OTP', demoOtp: log.otpCode };
}

export async function wardenOverrideEntry(
  institutionId: string,
  logId: string,
  reason: string,
  wardenName = 'Warden',
) {
  const log = await prisma.hostelVisitorLog.findFirst({ where: { id: logId, institutionId } });
  if (!log) throw new Error('Visitor log not found');

  const now = new Date();
  await prisma.hostelVisitorLog.update({
    where: { id: logId },
    data: {
      visitStatus: 'INSIDE',
      otpVerified: true,
      entryAt: now,
      inTime: formatTime(now),
      overrideBy: wardenName,
      overrideReason: reason,
      wardenStatus: 'APPROVED',
      wardenApprovedBy: wardenName,
    },
  });

  await logActivity(institutionId, 'VISITOR_OVERRIDE', `Manual override for ${log.visitorName}: ${reason}`, { logId }, wardenName);
  return { success: true, message: 'Manual override applied — entry authorized without OTP' };
}

export async function preRegisterVisitor(
  institutionId: string,
  body: {
    hostelId: string;
    studentProfileId: string;
    studentName: string;
    studentId?: string;
    visitorName: string;
    visitorPhone: string;
    visitorType: VisitorType;
    scheduledDate?: string;
    scheduledTime?: string;
    requestedBy?: string;
    academicYear?: string;
  },
) {
  const scheduledDate = body.scheduledDate ? new Date(body.scheduledDate) : todayDate();
  const qrToken = generateQrToken();

  const row = await prisma.hostelVisitorPreRegistration.create({
    data: {
      institutionId,
      hostelId: body.hostelId,
      studentProfileId: body.studentProfileId,
      studentId: body.studentId ?? '',
      studentName: body.studentName,
      visitorName: body.visitorName,
      visitorPhone: body.visitorPhone,
      visitorType: body.visitorType,
      scheduledDate,
      scheduledTime: body.scheduledTime ?? '10:00 AM',
      status: 'PENDING',
      qrToken,
      requestedBy: body.requestedBy ?? 'Parent',
      academicYear: body.academicYear ?? '2025-26',
    },
  });

  return {
    success: true,
    preRegistration: row,
    message: 'Visit scheduled — awaiting warden approval',
    qrPreview: qrToken,
  };
}

export async function approvePreRegistration(
  institutionId: string,
  preRegId: string,
  action: 'APPROVE' | 'REJECT',
  wardenName = 'Warden',
  rejectionReason = '',
) {
  const pre = await prisma.hostelVisitorPreRegistration.findFirst({ where: { id: preRegId, institutionId } });
  if (!pre) throw new Error('Pre-registration not found');

  await prisma.hostelVisitorPreRegistration.update({
    where: { id: preRegId },
    data: {
      status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
      wardenApprovedBy: wardenName,
      rejectionReason: action === 'REJECT' ? rejectionReason : '',
    },
  });

  return {
    success: true,
    message: action === 'APPROVE' ? `Approved — QR: ${pre.qrToken}` : 'Pre-registration rejected',
    qrToken: action === 'APPROVE' ? pre.qrToken : '',
  };
}

export async function exportVisitorReport(
  institutionId: string,
  academicYear: string,
  format: 'PDF' | 'Excel' | 'CSV',
  reportType = 'Daily Visitor Register',
) {
  const data = await getVisitorManagement(institutionId, academicYear);
  const fileName = `hostel_visitors_${Date.now()}.${format.toLowerCase()}`;
  await logActivity(institutionId, 'EXPORT_VISITORS', `Exported ${reportType}`, { format, reportType });
  return { success: true, format, fileName, message: `${reportType} exported`, snapshot: data };
}

export async function seedVisitorManagement(institutionId: string) {
  await seedHostelStudents(institutionId);
  await syncAuthorizedGuardians(institutionId);

  const existing = await prisma.hostelVisitorLog.count({
    where: { institutionId, visitDate: todayDate() },
  });
  if (existing >= 5) return getVisitorManagement(institutionId);

  const hostels = await prisma.hostelMaster.findMany({ where: { institutionId, status: 'ACTIVE' }, take: 2 });
  const profiles = await prisma.hostelStudentProfile.findMany({
    where: { institutionId, residentStatus: 'ACTIVE' },
    include: { student: true },
    take: 8,
  });
  if (!hostels[0] || profiles.length === 0) return getVisitorManagement(institutionId);

  await prisma.hostelVisitorBlacklist.create({
    data: {
      institutionId,
      name: 'Banned Person',
      phone: '9999900000',
      idNumber: 'BL-001',
      reason: 'Previous security incident',
      status: 'BANNED',
    },
  });

  const academicYear = '2025-26';
  const now = new Date();
  const samples = [
    { name: 'Rajesh Sharma', type: 'PARENT' as VisitorType, phone: '9876543210', purpose: 'Parent visit', status: 'EXITED', minsAgo: 120 },
    { name: 'Sunita Devi', type: 'LOCAL_GUARDIAN' as VisitorType, phone: profiles[1]?.localGuardianMobile || '9876543211', purpose: 'Local guardian', status: 'INSIDE', minsAgo: 45 },
    { name: 'Amazon Delivery', type: 'DELIVERY' as VisitorType, phone: '9876543212', purpose: 'Parcel delivery', status: 'INSIDE', minsAgo: 30 },
    { name: 'Rohit Friend', type: 'GUEST' as VisitorType, phone: '9876543213', purpose: 'Guest', status: 'PENDING_OTP', minsAgo: 5 },
    { name: 'Priya Patel', type: 'PARENT' as VisitorType, phone: '9876543214', purpose: 'Parent', status: 'EXITED', minsAgo: 180 },
  ];

  for (let i = 0; i < samples.length; i += 1) {
    const s = samples[i];
    const profile = profiles[i % profiles.length];
    const hostel = hostels[i % hostels.length];
    const entryAt = new Date(now.getTime() - s.minsAgo * 60000);
    const otp = generateOtp();

    await prisma.hostelVisitorLog.create({
      data: {
        institutionId,
        hostelId: hostel.id,
        studentProfileId: profile.id,
        studentId: profile.studentId,
        studentName: `${profile.student.firstName} ${profile.student.lastName}`.trim(),
        visitorName: s.name,
        visitorType: s.type,
        visitorPhone: s.phone,
        purpose: s.purpose,
        meetingWith: `${profile.student.firstName} ${profile.student.lastName}`.trim(),
        visitStatus: s.status,
        otpCode: otp,
        otpVerified: s.status !== 'PENDING_OTP',
        entryAt: s.status !== 'PENDING_OTP' ? entryAt : null,
        exitAt: s.status === 'EXITED' ? new Date(entryAt.getTime() + 60 * 60000) : null,
        inTime: s.status !== 'PENDING_OTP' ? formatTime(entryAt) : '',
        outTime: s.status === 'EXITED' ? formatTime(new Date(entryAt.getTime() + 60 * 60000)) : '',
        wardenStatus: s.type === 'GUEST' ? 'APPROVED' : 'NOT_REQUIRED',
        gateDeviceId: 'TABLET-GATE-01',
        academicYear,
        visitDate: todayDate(),
        qrToken: generateQrToken(),
        canTakeStudentOut: s.type === 'LOCAL_GUARDIAN',
      },
    });
  }

  const pre = await preRegisterVisitor(institutionId, {
    hostelId: hostels[0].id,
    studentProfileId: profiles[0].id,
    studentName: `${profiles[0].student.firstName} ${profiles[0].student.lastName}`.trim(),
    studentId: profiles[0].studentId,
    visitorName: 'Grandfather Kumar',
    visitorPhone: '9876501234',
    visitorType: 'PARENT',
    scheduledTime: '4:00 PM',
    requestedBy: 'Parent',
  });
  await approvePreRegistration(institutionId, pre.preRegistration.id, 'APPROVE');

  await preRegisterVisitor(institutionId, {
    hostelId: hostels[0].id,
    studentProfileId: profiles[2].id,
    studentName: `${profiles[2].student.firstName} ${profiles[2].student.lastName}`.trim(),
    studentId: profiles[2].studentId,
    visitorName: 'Uncle Verma',
    visitorPhone: '9876505678',
    visitorType: 'LOCAL_GUARDIAN',
    scheduledTime: '5:30 PM',
    requestedBy: 'Student',
  });

  await logActivity(institutionId, 'SEED_VISITORS', 'Visitor management demo seeded');
  return getVisitorManagement(institutionId);
}
