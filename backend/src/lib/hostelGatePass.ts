import { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { seedHostelStudents } from './hostelStudents.js';

const ACADEMIC_YEARS = ['2023-24', '2024-25', '2025-26', '2026-27'];
const DEFAULT_MAX_DURATION = 120;
const MAX_DURATION_CAP = 240;
const MAX_OUTINGS_PER_DAY = 2;
const FINE_PER_15_MIN = 25;

const ACTIVE_STATUSES = ['ISSUED', 'OUT'];
const CLOSED_STATUSES = ['RETURNED', 'LATE_RETURN', 'REJECTED', 'EXPIRED'];

function formatDateTime(d: Date) {
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatDate(d: Date) {
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function generateQrToken() {
  return `HGP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function calculateFine(lateMinutes: number) {
  if (lateMinutes <= 0) return 0;
  const blocks = Math.ceil(lateMinutes / 15);
  return blocks * FINE_PER_15_MIN;
}

async function logPassAudit(
  institutionId: string,
  gatePassId: string,
  action: string,
  fromStatus: string,
  toStatus: string,
  performedBy: string,
  details = '',
) {
  await prisma.hostelGatePassAuditLog.create({
    data: { institutionId, gatePassId, action, fromStatus, toStatus, performedBy, details },
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

async function createGateLog(
  institutionId: string,
  hostelId: string,
  gatePassId: string,
  studentId: string,
  studentName: string,
  gateEvent: 'CHECK_OUT' | 'CHECK_IN',
  scanMethod: string,
  scanDevice = '',
  scanIp = '',
) {
  const now = new Date();
  return prisma.hostelGateLog.create({
    data: {
      institutionId,
      hostelId,
      gatePassId,
      studentId,
      studentName,
      gateEvent,
      scanMethod,
      scanDevice,
      scanIp,
      logTime: now,
      logDate: startOfDay(now),
    },
  });
}

function mapPassRow(p: {
  id: string;
  studentName: string;
  purpose: string;
  destination: string;
  maxDurationMinutes: number;
  requestedAt: Date;
  validFrom: Date | null;
  validUntil: Date | null;
  status: string;
  qrToken: string;
  exitScannedAt: Date | null;
  returnScannedAt: Date | null;
  lateMinutes: number;
  fineAmount: number;
  fineApplied: boolean;
  wardenIssuedAt: Date | null;
  wardenIssuedBy: string;
  rejectedAt: Date | null;
  rejectionReason: string;
  createdAt: Date;
  hostel: { hostelName: string } | null;
}) {
  const now = Date.now();
  const isLateActive = p.status === 'OUT' && p.validUntil && p.validUntil.getTime() < now;
  const remainingMins = p.validUntil && p.status === 'OUT'
    ? Math.max(0, Math.round((p.validUntil.getTime() - now) / 60000))
    : null;

  return {
    id: p.id,
    studentName: p.studentName,
    hostel: p.hostel?.hostelName ?? '—',
    purpose: p.purpose,
    destination: p.destination,
    maxDurationMinutes: p.maxDurationMinutes,
    requestedAt: formatDateTime(p.requestedAt),
    validFrom: p.validFrom ? formatDateTime(p.validFrom) : null,
    validUntil: p.validUntil ? formatDateTime(p.validUntil) : null,
    status: isLateActive ? 'OVERDUE' : p.status,
    qrToken: p.qrToken,
    exitScannedAt: p.exitScannedAt ? formatDateTime(p.exitScannedAt) : null,
    returnScannedAt: p.returnScannedAt ? formatDateTime(p.returnScannedAt) : null,
    lateMinutes: p.lateMinutes,
    fineAmount: p.fineAmount,
    fineApplied: p.fineApplied,
    wardenIssuedAt: p.wardenIssuedAt ? formatDateTime(p.wardenIssuedAt) : null,
    wardenIssuedBy: p.wardenIssuedBy,
    rejectedAt: p.rejectedAt ? formatDateTime(p.rejectedAt) : null,
    rejectionReason: p.rejectionReason,
    appliedOn: formatDate(p.createdAt),
    isLateActive,
    remainingMins,
  };
}

export function countGatePassKpis(passes: { status: string; validUntil?: Date | null; returnScannedAt?: Date | null }[]) {
  let pending = 0;
  let issued = 0;
  let out = 0;
  let returned = 0;
  let lateReturn = 0;
  let rejected = 0;
  const now = Date.now();

  for (const p of passes) {
    if (p.status === 'PENDING') pending += 1;
    else if (p.status === 'ISSUED') issued += 1;
    else if (p.status === 'OUT') {
      out += 1;
      if (p.validUntil && p.validUntil.getTime() < now && !p.returnScannedAt) lateReturn += 1;
    } else if (p.status === 'RETURNED') returned += 1;
    else if (p.status === 'LATE_RETURN') lateReturn += 1;
    else if (p.status === 'REJECTED') rejected += 1;
  }

  return { pending, issued, out, returned, lateReturn, rejected, total: passes.length };
}

function rolePermissions(role: string) {
  if (role === 'Student') {
    return { canRequest: true, canIssue: false, canReject: false, canScan: false, canExport: false };
  }
  if (role === 'Warden') {
    return { canRequest: false, canIssue: true, canReject: true, canScan: false, canExport: true };
  }
  if (role === 'Security') {
    return { canRequest: false, canIssue: false, canReject: false, canScan: true, canExport: false };
  }
  return { canRequest: true, canIssue: true, canReject: true, canScan: true, canExport: true };
}

export async function getGatePassManagement(
  institutionId: string,
  academicYear = '2025-26',
  filters: { status?: string; userRole?: string } = {},
) {
  const where: Prisma.HostelGatePassWhereInput = { institutionId, academicYear };
  if (filters.status && filters.status !== 'ALL') {
    if (filters.status === 'OVERDUE') {
      where.status = 'OUT';
      where.validUntil = { lt: new Date() };
    } else {
      where.status = filters.status;
    }
  }

  const [passes, allPasses, hostels, students] = await Promise.all([
    prisma.hostelGatePass.findMany({
      where,
      include: { hostel: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.hostelGatePass.findMany({ where: { institutionId, academicYear } }),
    prisma.hostelMaster.findMany({ where: { institutionId, academicYear, status: 'ACTIVE' }, orderBy: { hostelName: 'asc' } }),
    prisma.hostelStudentProfile.findMany({
      where: { institutionId, academicYear, residentStatus: 'ACTIVE' },
      include: { student: true },
      take: 50,
    }),
  ]);

  const kpis = countGatePassKpis(allPasses);
  const chart = [
    { name: 'Pending', value: kpis.pending, color: '#f59e0b', percent: kpis.total ? `${Math.round((kpis.pending / kpis.total) * 100)}%` : '0%' },
    { name: 'Active Out', value: kpis.out, color: '#3b82f6', percent: kpis.total ? `${Math.round((kpis.out / kpis.total) * 100)}%` : '0%' },
    { name: 'Returned', value: kpis.returned + kpis.lateReturn, color: '#10b981', percent: kpis.total ? `${Math.round(((kpis.returned + kpis.lateReturn) / kpis.total) * 100)}%` : '0%' },
    { name: 'Rejected', value: kpis.rejected, color: '#ef4444', percent: kpis.total ? `${Math.round((kpis.rejected / kpis.total) * 100)}%` : '0%' },
  ];

  const lateReturns = passes
    .filter((p) => p.status === 'LATE_RETURN' || (p.status === 'OUT' && p.validUntil && p.validUntil.getTime() < Date.now()))
    .map((p) => mapPassRow(p));

  await logActivity(institutionId, 'VIEW_GATE_PASS', 'Gate pass management accessed', { academicYear }, filters.userRole);

  return {
    academicYear,
    academicYears: ACADEMIC_YEARS,
    defaultMaxDuration: DEFAULT_MAX_DURATION,
    maxDurationCap: MAX_DURATION_CAP,
    maxOutingsPerDay: MAX_OUTINGS_PER_DAY,
    finePer15Min: FINE_PER_15_MIN,
    kpis,
    chart,
    passes: passes.map((p) => mapPassRow(p)),
    lateReturns,
    students: students.map((s) => ({
      profileId: s.id,
      studentId: s.studentId,
      studentName: `${s.student.firstName} ${s.student.lastName}`.trim(),
      hostelId: s.hostelId,
    })),
    hostels: hostels.map((h) => ({ id: h.id, name: h.hostelName })),
    permissions: rolePermissions(filters.userRole ?? 'Warden'),
    statusFlow: ['PENDING', 'ISSUED', 'OUT', 'RETURNED', 'LATE_RETURN', 'REJECTED', 'EXPIRED'],
    reports: ['Gate Pass Register', 'Late Return / Fine Report'],
    exportFormats: ['PDF', 'Excel', 'CSV'],
    automationRules: [
      'No parent approval for short outings (≤ configured duration)',
      'Auto-fine on late return (₹25 per 15 min)',
      'Gate scans linked to Security_Gate_Logs',
      'Max 2 outings per student per day',
    ],
  };
}

async function validateRequest(
  institutionId: string,
  studentProfileId: string,
  maxDurationMinutes: number,
) {
  const profile = await prisma.hostelStudentProfile.findFirst({
    where: { id: studentProfileId, institutionId },
  });
  if (!profile) throw new Error('Student profile not found');

  if (maxDurationMinutes < 30 || maxDurationMinutes > MAX_DURATION_CAP) {
    throw new Error(`Duration must be between 30 and ${MAX_DURATION_CAP} minutes`);
  }

  const activePass = await prisma.hostelGatePass.findFirst({
    where: {
      institutionId,
      studentProfileId,
      status: { in: ACTIVE_STATUSES },
    },
  });
  if (activePass) {
    throw new Error('Student already has an active gate pass — return before requesting another');
  }

  const todayStart = startOfDay();
  const todayEnd = endOfDay();
  const todayCount = await prisma.hostelGatePass.count({
    where: {
      institutionId,
      studentProfileId,
      requestedAt: { gte: todayStart, lte: todayEnd },
      status: { notIn: ['REJECTED'] },
    },
  });
  if (todayCount >= MAX_OUTINGS_PER_DAY) {
    throw new Error(`Daily outing limit reached (max ${MAX_OUTINGS_PER_DAY} per day)`);
  }

  return profile;
}

export async function submitGatePassRequest(
  institutionId: string,
  body: {
    studentProfileId: string;
    purpose: string;
    destination: string;
    maxDurationMinutes?: number;
    academicYear?: string;
  },
) {
  const maxDurationMinutes = body.maxDurationMinutes ?? DEFAULT_MAX_DURATION;
  const academicYear = body.academicYear ?? '2025-26';
  const profile = await validateRequest(institutionId, body.studentProfileId, maxDurationMinutes);

  const studentName = await prisma.student.findUnique({ where: { id: profile.studentId } }).then(
    (s) => (s ? `${s.firstName} ${s.lastName}`.trim() : 'Student'),
  );

  const pass = await prisma.hostelGatePass.create({
    data: {
      institutionId,
      hostelId: profile.hostelId,
      studentId: profile.studentId,
      studentProfileId: body.studentProfileId,
      studentName,
      purpose: body.purpose,
      destination: body.destination,
      maxDurationMinutes,
      status: 'PENDING',
      academicYear,
    },
  });

  await logPassAudit(institutionId, pass.id, 'PASS_REQUESTED', '', 'PENDING', studentName, body.purpose);

  return {
    success: true,
    pass,
    message: 'Outing request submitted — awaiting warden approval',
    notifications: [`Push notify Warden: ${studentName} requested outing pass`],
  };
}

export async function issueGatePass(
  institutionId: string,
  passId: string,
  body: { wardenName?: string; maxDurationMinutes?: number } = {},
) {
  const pass = await prisma.hostelGatePass.findFirst({ where: { id: passId, institutionId } });
  if (!pass || pass.status !== 'PENDING') {
    throw new Error('Pass not found or not awaiting warden issue');
  }

  const duration = body.maxDurationMinutes ?? pass.maxDurationMinutes;
  if (duration < 30 || duration > MAX_DURATION_CAP) {
    throw new Error(`Duration must be between 30 and ${MAX_DURATION_CAP} minutes`);
  }

  const now = new Date();
  const validUntil = new Date(now.getTime() + duration * 60000);
  const qrToken = generateQrToken();

  const updated = await prisma.hostelGatePass.update({
    where: { id: passId },
    data: {
      status: 'ISSUED',
      maxDurationMinutes: duration,
      validFrom: now,
      validUntil,
      wardenIssuedAt: now,
      wardenIssuedBy: body.wardenName ?? 'Warden',
      qrToken,
    },
  });

  await logPassAudit(institutionId, passId, 'PASS_ISSUED', 'PENDING', 'ISSUED', body.wardenName ?? 'Warden', `Duration: ${duration} min`);

  return {
    success: true,
    pass: updated,
    qrToken,
    validUntil: formatDateTime(validUntil),
    message: `Gate pass issued — valid for ${duration} minutes`,
    notifications: [
      `Push to Student: Gate pass issued — scan QR at gate`,
      `QR: ${qrToken}`,
    ],
  };
}

export async function rejectGatePass(
  institutionId: string,
  passId: string,
  body: { rejectedBy: string; rejectionReason: string },
) {
  const pass = await prisma.hostelGatePass.findFirst({ where: { id: passId, institutionId } });
  if (!pass || CLOSED_STATUSES.includes(pass.status)) {
    throw new Error('Cannot reject this pass');
  }

  const updated = await prisma.hostelGatePass.update({
    where: { id: passId },
    data: {
      status: 'REJECTED',
      rejectedBy: body.rejectedBy,
      rejectionReason: body.rejectionReason,
      rejectedAt: new Date(),
    },
  });

  await logPassAudit(institutionId, passId, 'PASS_REJECTED', pass.status, 'REJECTED', body.rejectedBy, body.rejectionReason);
  return { success: true, pass: updated, message: 'Gate pass rejected' };
}

export async function securityScanOut(
  institutionId: string,
  body: { qrToken: string; securityName?: string; scanDevice?: string; scanIp?: string },
) {
  const pass = await prisma.hostelGatePass.findFirst({
    where: { institutionId, qrToken: body.qrToken, status: 'ISSUED' },
    include: { hostel: true },
  });
  if (!pass) throw new Error('Invalid or already-used gate pass QR');

  const now = new Date();
  if (pass.validUntil && pass.validUntil.getTime() < now.getTime()) {
    await prisma.hostelGatePass.update({
      where: { id: pass.id },
      data: { status: 'EXPIRED' },
    });
    throw new Error('Gate pass has expired — student must request a new pass');
  }

  const updated = await prisma.hostelGatePass.update({
    where: { id: pass.id },
    data: {
      status: 'OUT',
      exitScannedAt: now,
      securityOutBy: body.securityName ?? 'Security',
    },
  });

  const hostelId = pass.hostelId ?? pass.hostel?.id;
  if (hostelId) {
    await createGateLog(
      institutionId,
      hostelId,
      pass.id,
      pass.studentId,
      pass.studentName,
      'CHECK_OUT',
      'QR',
      body.scanDevice ?? 'Gate-Scanner-01',
      body.scanIp ?? '10.0.0.1',
    );
  }

  await logPassAudit(institutionId, pass.id, 'EXIT_SCANNED', 'ISSUED', 'OUT', body.securityName ?? 'Security');

  return {
    success: true,
    pass: updated,
    message: `Exit logged for ${pass.studentName}`,
    validUntil: pass.validUntil ? formatDateTime(pass.validUntil) : null,
    notifications: [`SMS to Parent: ${pass.studentName} exited campus at ${formatDateTime(now)}`],
  };
}

export async function securityScanIn(
  institutionId: string,
  body: { qrToken: string; securityName?: string; scanDevice?: string; scanIp?: string },
) {
  const pass = await prisma.hostelGatePass.findFirst({
    where: { institutionId, qrToken: body.qrToken, status: 'OUT' },
    include: { hostel: true },
  });
  if (!pass) throw new Error('Invalid pass or student not marked OUT');

  const now = new Date();
  let lateMinutes = 0;
  let fineAmount = 0;
  let status: 'RETURNED' | 'LATE_RETURN' = 'RETURNED';

  if (pass.validUntil && now.getTime() > pass.validUntil.getTime()) {
    lateMinutes = Math.ceil((now.getTime() - pass.validUntil.getTime()) / 60000);
    fineAmount = calculateFine(lateMinutes);
    status = 'LATE_RETURN';
  }

  const updated = await prisma.hostelGatePass.update({
    where: { id: pass.id },
    data: {
      status,
      returnScannedAt: now,
      securityInBy: body.securityName ?? 'Security',
      lateMinutes,
      fineAmount,
      fineApplied: fineAmount > 0,
    },
  });

  const hostelId = pass.hostelId ?? pass.hostel?.id;
  if (hostelId) {
    await createGateLog(
      institutionId,
      hostelId,
      pass.id,
      pass.studentId,
      pass.studentName,
      'CHECK_IN',
      'QR',
      body.scanDevice ?? 'Gate-Scanner-01',
      body.scanIp ?? '10.0.0.1',
    );
  }

  await logPassAudit(
    institutionId,
    pass.id,
    'RETURN_SCANNED',
    'OUT',
    status,
    body.securityName ?? 'Security',
    lateMinutes > 0 ? `Late by ${lateMinutes} min, fine ₹${fineAmount}` : 'On time',
  );

  if (fineAmount > 0) {
    await logActivity(
      institutionId,
      'GATE_PASS_FINE',
      `Fine ₹${fineAmount} applied for ${pass.studentName} (${lateMinutes} min late)`,
      { passId: pass.id, fineAmount, lateMinutes },
    );
  }

  return {
    success: true,
    pass: updated,
    lateMinutes,
    fineAmount,
    message: fineAmount > 0
      ? `Return logged — ${lateMinutes} min late, fine ₹${fineAmount} applied`
      : 'Return logged on time — pass closed',
    notifications: fineAmount > 0
      ? [`Push to Student: Late return fine ₹${fineAmount} applied`]
      : [`Push to Student: Welcome back — gate pass closed`],
  };
}

export async function getGatePassDetail(institutionId: string, passId: string) {
  const pass = await prisma.hostelGatePass.findFirst({
    where: { id: passId, institutionId },
    include: {
      hostel: true,
      auditLogs: { orderBy: { createdAt: 'asc' } },
      gateLogs: { orderBy: { logTime: 'asc' } },
    },
  });
  if (!pass) throw new Error('Gate pass not found');

  return {
    ...mapPassRow(pass),
    auditTrail: pass.auditLogs.map((a) => ({
      action: a.action,
      fromStatus: a.fromStatus,
      toStatus: a.toStatus,
      performedBy: a.performedBy,
      details: a.details,
      at: formatDateTime(a.createdAt),
    })),
    gateLogs: pass.gateLogs.map((g) => ({
      event: g.gateEvent,
      method: g.scanMethod,
      device: g.scanDevice,
      at: formatDateTime(g.logTime),
    })),
  };
}

export async function exportGatePassReport(
  institutionId: string,
  academicYear: string,
  format: 'PDF' | 'Excel' | 'CSV',
  reportType = 'Gate Pass Register',
) {
  const data = await getGatePassManagement(institutionId, academicYear);
  const fileName = `hostel_gate_pass_${Date.now()}.${format.toLowerCase()}`;
  await logActivity(institutionId, 'EXPORT_GATE_PASS', `Exported ${reportType}`, { format });
  return { success: true, format, fileName, message: `${reportType} exported`, snapshot: data };
}

export async function seedGatePassManagement(institutionId: string) {
  await seedHostelStudents(institutionId);
  const academicYear = '2025-26';

  const existing = await prisma.hostelGatePass.count({ where: { institutionId, academicYear } });
  if (existing >= 40) return getGatePassManagement(institutionId, academicYear);

  await prisma.hostelGatePassAuditLog.deleteMany({ where: { institutionId } });
  await prisma.hostelGateLog.deleteMany({ where: { institutionId, gatePassId: { not: null } } });
  await prisma.hostelGatePass.deleteMany({ where: { institutionId } });

  const hostels = await prisma.hostelMaster.findMany({ where: { institutionId, status: 'ACTIVE' }, take: 3 });
  const profiles = await prisma.hostelStudentProfile.findMany({
    where: { institutionId, residentStatus: 'ACTIVE' },
    include: { student: true },
    take: 60,
  });

  const purposes = ['Market visit', 'Bank errand', 'Medical checkup', 'Stationery purchase', 'Local outing'];
  const destinations = ['City Market', 'Mall Road', 'Civil Hospital', 'Railway Station', 'Book Store'];
  const now = new Date();

  async function createPass(
    profile: typeof profiles[0],
    status: string,
    hoursAgo: number,
    durationMins: number,
    lateMins = 0,
  ) {
    const name = `${profile.student.firstName} ${profile.student.lastName}`.trim();
    const requestedAt = new Date(now.getTime() - hoursAgo * 3600000);
    const validFrom = ['ISSUED', 'OUT', 'RETURNED', 'LATE_RETURN'].includes(status) ? requestedAt : null;
    const validUntil = validFrom ? new Date(validFrom.getTime() + durationMins * 60000) : null;
    const qr = ['ISSUED', 'OUT', 'RETURNED', 'LATE_RETURN'].includes(status) ? generateQrToken() : '';

    const pass = await prisma.hostelGatePass.create({
      data: {
        institutionId,
        hostelId: profile.hostelId ?? hostels[0]?.id,
        studentId: profile.studentId,
        studentProfileId: profile.id,
        studentName: name,
        purpose: purposes[Math.abs(hoursAgo) % purposes.length],
        destination: destinations[Math.abs(hoursAgo) % destinations.length],
        maxDurationMinutes: durationMins,
        requestedAt,
        validFrom,
        validUntil,
        status,
        wardenIssuedAt: validFrom,
        wardenIssuedBy: 'Warden',
        qrToken: qr,
        exitScannedAt: ['OUT', 'RETURNED', 'LATE_RETURN'].includes(status) ? validFrom : null,
        returnScannedAt: ['RETURNED', 'LATE_RETURN'].includes(status)
          ? new Date((validUntil ?? requestedAt).getTime() + lateMins * 60000)
          : null,
        lateMinutes: lateMins,
        fineAmount: lateMins > 0 ? calculateFine(lateMins) : 0,
        fineApplied: lateMins > 0,
        securityOutBy: ['OUT', 'RETURNED', 'LATE_RETURN'].includes(status) ? 'Security' : '',
        securityInBy: ['RETURNED', 'LATE_RETURN'].includes(status) ? 'Security' : '',
        rejectedAt: status === 'REJECTED' ? requestedAt : null,
        rejectedBy: status === 'REJECTED' ? 'Warden' : '',
        rejectionReason: status === 'REJECTED' ? 'Exceeded daily outing limit' : '',
        academicYear,
      },
    });

    await logPassAudit(institutionId, pass.id, 'SEED', '', status, 'System');

    if (['OUT', 'RETURNED', 'LATE_RETURN'].includes(status) && pass.hostelId) {
      await createGateLog(institutionId, pass.hostelId, pass.id, pass.studentId, name, 'CHECK_OUT', 'QR');
      if (['RETURNED', 'LATE_RETURN'].includes(status)) {
        await createGateLog(institutionId, pass.hostelId, pass.id, pass.studentId, name, 'CHECK_IN', 'QR');
      }
    }

    return pass;
  }

  let idx = 0;
  for (let i = 0; i < 12 && idx < profiles.length; i += 1, idx += 1) {
    await createPass(profiles[idx % profiles.length], 'PENDING', 1 + i, 120);
  }
  for (let i = 0; i < 8 && idx < profiles.length; i += 1, idx += 1) {
    await createPass(profiles[idx % profiles.length], 'ISSUED', 0.5, 120);
  }
  for (let i = 0; i < 6 && idx < profiles.length; i += 1, idx += 1) {
    await createPass(profiles[idx % profiles.length], 'OUT', 2, 120);
  }
  for (let i = 0; i < 10 && idx < profiles.length; i += 1, idx += 1) {
    await createPass(profiles[idx % profiles.length], 'RETURNED', 4, 120);
  }
  for (let i = 0; i < 4 && idx < profiles.length; i += 1, idx += 1) {
    await createPass(profiles[idx % profiles.length], 'LATE_RETURN', 6, 90, 35);
  }
  for (let i = 0; i < 3 && idx < profiles.length; i += 1, idx += 1) {
    await createPass(profiles[idx % profiles.length], 'REJECTED', 1, 120);
  }

  if (profiles[0]) {
    const overdue = await createPass(profiles[0], 'OUT', 3, 60);
    await prisma.hostelGatePass.update({
      where: { id: overdue.id },
      data: { validUntil: new Date(now.getTime() - 30 * 60000) },
    });
  }

  await logActivity(institutionId, 'SEED_GATE_PASS', 'Gate pass demo seeded');
  return getGatePassManagement(institutionId, academicYear);
}
