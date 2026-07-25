import { prisma } from './prisma.js';
import { seedFineManagement } from './libraryFines.js';

const ACADEMIC_YEARS = ['2023-24', '2024-25', '2025-26', '2026-27'];
const DASHBOARD_HOUR_SLOTS = ['8 AM', '10 AM', '12 PM', '2 PM', '4 PM', '6 PM'];

function todayDate() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function formatTime(d: Date) {
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(mins: number) {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function hourSlotLabel(d: Date) {
  const h = d.getHours();
  if (h === 12) return '12 PM';
  if (h > 12) return `${h - 12} PM`;
  return `${h} AM`;
}

/** Buckets gate entries into dashboard chart slots (2-hour windows). */
function dashboardHourSlot(d: Date) {
  const h = d.getHours();
  if (h < 10) return '8 AM';
  if (h < 12) return '10 AM';
  if (h < 14) return '12 PM';
  if (h < 16) return '2 PM';
  if (h < 18) return '4 PM';
  return '6 PM';
}

async function logActivity(institutionId: string, action: string, details: string, entityId = '') {
  await prisma.libActivityLog.create({
    data: { institutionId, entityType: 'LibGateLog', entityId, action, details, performedBy: 'Gate System' },
  });
}

async function ensureSettings(institutionId: string) {
  let row = await prisma.libSettings.findUnique({ where: { institutionId } });
  if (!row) {
    row = await prisma.libSettings.create({
      data: {
        institutionId,
        libraryClosingTime: '18:00',
        parentGateNotifications: false,
        gateTerminals: ['GATE-01', 'GATE-02'],
      },
    });
  }
  return row;
}

async function validateMemberForGate(
  institutionId: string,
  memberCode: string,
  academicYear = '2025-26',
) {
  const member = await prisma.libMember.findFirst({
    where: {
      institutionId,
      OR: [
        { memberCode: { equals: memberCode, mode: 'insensitive' } },
        { barcodeUid: { equals: memberCode, mode: 'insensitive' } },
        { id: memberCode },
      ],
    },
  });

  if (!member) throw new Error('Member not found — invalid ID or barcode');
  if (member.status === 'SUSPENDED' || member.suspendedReason) {
    throw new Error(`Entry blocked — member suspended${member.suspendedReason ? `: ${member.suspendedReason}` : ''}`);
  }
  if (member.status !== 'ACTIVE') throw new Error('Entry blocked — member is not active');
  if (member.academicYear !== academicYear) {
    throw new Error(`Entry blocked — member not enrolled in academic session ${academicYear}`);
  }

  return member;
}

export async function syncHourlyFootfall(institutionId: string, logDate = todayDate()) {
  const start = new Date(logDate);
  const end = new Date(logDate);
  end.setDate(end.getDate() + 1);

  const logs = await prisma.libGateLog.findMany({
    where: { institutionId, entryTime: { gte: start, lt: end } },
  });

  const byBranchHour = new Map<string, number>();
  for (const log of logs) {
    const slot = dashboardHourSlot(log.entryTime);
    const key = `${log.branchId}:${slot}`;
    byBranchHour.set(key, (byBranchHour.get(key) ?? 0) + 1);
  }

  const branches = await prisma.libBranch.findMany({ where: { institutionId, status: 'ACTIVE' } });
  for (const branch of branches) {
    for (const slot of DASHBOARD_HOUR_SLOTS) {
      const count = byBranchHour.get(`${branch.id}:${slot}`) ?? 0;
      const existing = await prisma.libAttendanceLog.findFirst({
        where: { institutionId, branchId: branch.id, logDate, hourSlot: slot },
      });
      if (existing) {
        await prisma.libAttendanceLog.update({
          where: { id: existing.id },
          data: { visitorCount: count },
        });
      } else if (count > 0) {
        await prisma.libAttendanceLog.create({
          data: { institutionId, branchId: branch.id, logDate, hourSlot: slot, visitorCount: count },
        });
      }
    }
  }
}

function mapGateLogRow(log: {
  id: string;
  entryTime: Date;
  exitTime: Date | null;
  durationMinutes: number | null;
  terminalId: string;
  scanMethod: string;
  status: string;
  manualOverride: boolean;
  member: { memberCode: string; memberName: string; memberType: string; className: string; sectionName: string };
}) {
  return {
    id: log.id,
    memberCode: log.member.memberCode,
    memberName: log.member.memberName,
    memberType: log.member.memberType,
    className: `${log.member.className}${log.member.sectionName ? `-${log.member.sectionName}` : ''}`,
    entryTime: log.entryTime.toISOString(),
    entryTimeFormatted: formatTime(log.entryTime),
    exitTime: log.exitTime?.toISOString() ?? null,
    exitTimeFormatted: log.exitTime ? formatTime(log.exitTime) : '—',
    durationMinutes: log.durationMinutes,
    durationFormatted: log.durationMinutes != null ? formatDuration(log.durationMinutes) : '—',
    terminalId: log.terminalId || '—',
    scanMethod: log.scanMethod,
    status: log.status,
    manualOverride: log.manualOverride,
  };
}

export async function getLibraryGateAttendance(institutionId: string, academicYear = '2025-26', branchId?: string) {
  const settings = await ensureSettings(institutionId);
  const today = todayDate();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const branchFilter = branchId ? { branchId } : {};

  const [branches, currentlyInside, todayLogs, monthLogs, allMembers, terminals] = await Promise.all([
    prisma.libBranch.findMany({ where: { institutionId, status: 'ACTIVE' }, orderBy: { branchName: 'asc' } }),
    prisma.libGateLog.findMany({
      where: { institutionId, status: 'INSIDE', ...branchFilter },
      include: { member: true },
      orderBy: { entryTime: 'desc' },
      take: 50,
    }),
    prisma.libGateLog.findMany({
      where: {
        institutionId,
        academicYear,
        entryTime: { gte: today },
        ...branchFilter,
      },
      include: { member: true },
      orderBy: { entryTime: 'desc' },
      take: 200,
    }),
    prisma.libGateLog.findMany({
      where: {
        institutionId,
        academicYear,
        entryTime: { gte: monthStart },
        ...branchFilter,
      },
      select: { entryTime: true, memberId: true },
    }),
    prisma.libMember.findMany({
      where: { institutionId, academicYear, status: 'ACTIVE' },
      select: { id: true, memberCode: true, memberName: true, className: true, sectionName: true },
    }),
    Promise.resolve(
      Array.isArray(settings.gateTerminals)
        ? (settings.gateTerminals as string[])
        : ['GATE-01', 'GATE-02'],
    ),
  ]);

  const peakHourMap = new Map<string, number>();
  for (const log of todayLogs) {
    const slot = hourSlotLabel(log.entryTime);
    peakHourMap.set(slot, (peakHourMap.get(slot) ?? 0) + 1);
  }
  const peakHoursAnalysis = [...peakHourMap.entries()]
    .map(([hour, count]) => ({ hour, count }))
    .sort((a, b) => b.count - a.count);

  const dailyFootfall = todayLogs.length;
  const uniqueToday = new Set(todayLogs.map((l) => l.memberId)).size;
  const monthlyFootfall = monthLogs.length;
  const uniqueMonth = new Set(monthLogs.map((l) => l.memberId)).size;

  const visitedMemberIds = new Set(monthLogs.map((l) => l.memberId));
  const nonVisitors = allMembers
    .filter((m) => !visitedMemberIds.has(m.id))
    .slice(0, 50)
    .map((m) => ({
      memberCode: m.memberCode,
      memberName: m.memberName,
      className: `${m.className}${m.sectionName ? `-${m.sectionName}` : ''}`,
    }));

  const dashboardPeakMap = new Map<string, number>();
  for (const log of todayLogs) {
    const slot = dashboardHourSlot(log.entryTime);
    dashboardPeakMap.set(slot, (dashboardPeakMap.get(slot) ?? 0) + 1);
  }
  const attendanceChart = DASHBOARD_HOUR_SLOTS.map((slot) => ({
    time: slot,
    visitors: dashboardPeakMap.get(slot) ?? 0,
  }));
  const peak = [...attendanceChart].sort((a, b) => b.visitors - a.visitors)[0];

  const monthlyByDay = new Map<string, number>();
  for (const log of monthLogs) {
    const day = log.entryTime.toISOString().slice(0, 10);
    monthlyByDay.set(day, (monthlyByDay.get(day) ?? 0) + 1);
  }
  const monthlyFootfallTrend = [...monthlyByDay.entries()]
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30);

  return {
    academicYear,
    academicYears: ACADEMIC_YEARS,
    branches: branches.map((b) => ({ id: b.id, code: b.branchCode, name: b.branchName })),
    selectedBranchId: branchId ?? branches[0]?.id ?? '',
    settings: {
      libraryClosingTime: settings.libraryClosingTime,
      parentGateNotifications: settings.parentGateNotifications,
      gateTerminals: terminals,
    },
    liveGate: {
      currentlyInside: currentlyInside.length,
      recentEntries: currentlyInside.slice(0, 12).map(mapGateLogRow),
    },
    kpis: {
      todayVisitors: dailyFootfall,
      uniqueVisitorsToday: uniqueToday,
      monthlyFootfall,
      uniqueVisitorsMonth: uniqueMonth,
      currentlyInside: currentlyInside.length,
      peakHour: peak?.time ?? '—',
      peakCount: peak?.visitors ?? 0,
    },
    dailyVisitorLog: todayLogs.map(mapGateLogRow),
    peakHoursAnalysis,
    monthlyFootfallTrend,
    nonVisitorsReport: nonVisitors,
    attendanceChart,
    attendanceSummary: {
      totalVisitors: dailyFootfall,
      peakTime: peak?.time ?? '—',
    },
    scanMethods: ['BARCODE', 'RFID', 'BIOMETRIC', 'QR', 'MANUAL'],
    reports: ['Peak Hours Analysis', 'Daily/Monthly Footfall', 'Non-Visitors Report'],
    notifications: settings.parentGateNotifications
      ? ['Parent app push on library entry/exit (K-12)']
      : ['Parent gate notifications disabled'],
    mobileSync: ['Student app dynamic QR code for turnstile access'],
    erpIntegration: 'Cross-references class attendance & transport — library presence proves on-campus',
    roles: ['Librarian', 'Admin'],
    automationRules: ['Auto-close sessions at library closing time if exit scan missed'],
  };
}

export async function gateScanEntry(
  institutionId: string,
  memberCode: string,
  terminalId = 'GATE-01',
  scanMethod: 'BARCODE' | 'RFID' | 'BIOMETRIC' | 'QR' | 'MANUAL' = 'BARCODE',
  academicYear = '2025-26',
  performedBy = '',
) {
  const member = await validateMemberForGate(institutionId, memberCode, academicYear);

  const openSession = await prisma.libGateLog.findFirst({
    where: { institutionId, memberId: member.id, status: 'INSIDE' },
  });
  if (openSession) {
    throw new Error(`${member.memberName} is already inside the library (entered ${formatTime(openSession.entryTime)})`);
  }

  const settings = await ensureSettings(institutionId);
  const log = await prisma.libGateLog.create({
    data: {
      institutionId,
      branchId: member.branchId,
      memberId: member.id,
      terminalId,
      scanMethod,
      gateEvent: 'IN',
      status: 'INSIDE',
      academicYear,
      manualOverride: scanMethod === 'MANUAL',
      performedBy: performedBy || 'Gate System',
    },
    include: { member: true },
  });

  if (settings.parentGateNotifications && member.memberType === 'STUDENT') {
    await prisma.libGateLog.update({
      where: { id: log.id },
      data: { parentNotified: true },
    });
  }

  await syncHourlyFootfall(institutionId);
  await logActivity(
    institutionId,
    'GATE_IN',
    `${member.memberName} entered via ${terminalId} (${scanMethod})`,
    log.id,
  );

  return {
    success: true,
    event: 'ENTRY',
    log: mapGateLogRow(log),
    memberName: member.memberName,
    message: `Welcome, ${member.memberName}! Entry logged at ${formatTime(log.entryTime)}`,
    parentNotification: settings.parentGateNotifications && member.memberType === 'STUDENT'
      ? { sent: true, channels: ['Push'], message: `${member.memberName} entered the library` }
      : null,
    data: await getLibraryGateAttendance(institutionId, academicYear),
  };
}

export async function gateScanExit(
  institutionId: string,
  memberCode: string,
  terminalId = 'GATE-01',
  scanMethod: 'BARCODE' | 'RFID' | 'BIOMETRIC' | 'QR' | 'MANUAL' = 'BARCODE',
  academicYear = '2025-26',
) {
  const member = await validateMemberForGate(institutionId, memberCode, academicYear);

  const openSession = await prisma.libGateLog.findFirst({
    where: { institutionId, memberId: member.id, status: 'INSIDE' },
    orderBy: { entryTime: 'desc' },
  });
  if (!openSession) throw new Error(`No active library session found for ${member.memberName}`);

  const exitTime = new Date();
  const durationMinutes = Math.max(1, Math.round((exitTime.getTime() - openSession.entryTime.getTime()) / 60000));

  const log = await prisma.libGateLog.update({
    where: { id: openSession.id },
    data: {
      exitTime,
      durationMinutes,
      status: 'EXITED',
      gateEvent: 'OUT',
      terminalId: terminalId || openSession.terminalId,
      scanMethod,
    },
    include: { member: true },
  });

  const settings = await ensureSettings(institutionId);
  await syncHourlyFootfall(institutionId);
  await logActivity(
    institutionId,
    'GATE_OUT',
    `${member.memberName} exited — duration ${formatDuration(durationMinutes)}`,
    log.id,
  );

  return {
    success: true,
    event: 'EXIT',
    log: mapGateLogRow(log),
    memberName: member.memberName,
    durationFormatted: formatDuration(durationMinutes),
    message: `Goodbye, ${member.memberName}! Visit duration: ${formatDuration(durationMinutes)}`,
    parentNotification: settings.parentGateNotifications && member.memberType === 'STUDENT'
      ? { sent: true, channels: ['Push'], message: `${member.memberName} left the library` }
      : null,
    data: await getLibraryGateAttendance(institutionId, academicYear),
  };
}

export async function manualGateOverride(
  institutionId: string,
  data: {
    memberCode: string;
    event: 'IN' | 'OUT';
    terminalId?: string;
    reason?: string;
    performedBy: string;
    academicYear?: string;
  },
) {
  if (data.event === 'IN') {
    return gateScanEntry(
      institutionId,
      data.memberCode,
      data.terminalId ?? 'MANUAL',
      'MANUAL',
      data.academicYear ?? '2025-26',
      data.performedBy,
    );
  }
  return gateScanExit(
    institutionId,
    data.memberCode,
    data.terminalId ?? 'MANUAL',
    'MANUAL',
    data.academicYear ?? '2025-26',
  );
}

export async function autoCloseGateSessions(institutionId: string) {
  const settings = await ensureSettings(institutionId);
  const [closeHour, closeMin] = settings.libraryClosingTime.split(':').map(Number);
  const closing = new Date();
  closing.setHours(closeHour ?? 18, closeMin ?? 0, 0, 0);

  const openSessions = await prisma.libGateLog.findMany({
    where: { institutionId, status: 'INSIDE' },
    include: { member: true },
  });

  let closed = 0;
  for (const session of openSessions) {
    const exitTime = closing > session.entryTime ? closing : new Date();
    const durationMinutes = Math.max(1, Math.round((exitTime.getTime() - session.entryTime.getTime()) / 60000));
    await prisma.libGateLog.update({
      where: { id: session.id },
      data: {
        exitTime,
        durationMinutes,
        status: 'AUTO_CLOSED',
        gateEvent: 'OUT',
        overrideReason: `Auto-closed at library closing (${settings.libraryClosingTime})`,
      },
    });
    closed += 1;
  }

  if (closed > 0) await syncHourlyFootfall(institutionId);
  await logActivity(institutionId, 'AUTO_CLOSE', `Auto-closed ${closed} open gate session(s) at ${settings.libraryClosingTime}`);
  return { closed, message: `Auto-closed ${closed} session(s) at closing time` };
}

export async function generateGateQrToken(institutionId: string, memberId: string) {
  const member = await prisma.libMember.findFirst({ where: { institutionId, id: memberId, status: 'ACTIVE' } });
  if (!member) throw new Error('Member not found');

  const token = `LIBQR-${member.memberCode}-${Date.now().toString(36).toUpperCase()}`;
  return {
    memberCode: member.memberCode,
    memberName: member.memberName,
    qrToken: token,
    expiresInSecs: 60,
    message: 'Present this dynamic QR at the turnstile gate',
  };
}

export async function seedLibraryGateAttendance(institutionId: string) {
  await seedFineManagement(institutionId);

  const existing = await prisma.libGateLog.count({ where: { institutionId } });
  if (existing >= 10) return getLibraryGateAttendance(institutionId);

  const members = await prisma.libMember.findMany({ where: { institutionId, status: 'ACTIVE' }, take: 15 });
  const today = new Date();
  const terminals = ['GATE-01', 'GATE-02'];

  for (let i = 0; i < 8; i += 1) {
    const member = members[i % members.length];
    if (!member) break;

    const entryHour = 8 + (i % 8);
    const entry = new Date(today);
    entry.setHours(entryHour, 15 + i * 3, 0, 0);

    const exited = i < 5;
    const exit = exited ? new Date(entry.getTime() + (45 + i * 10) * 60000) : null;

    await prisma.libGateLog.create({
      data: {
        institutionId,
        branchId: member.branchId,
        memberId: member.id,
        entryTime: entry,
        exitTime: exit,
        durationMinutes: exit ? Math.round((exit.getTime() - entry.getTime()) / 60000) : null,
        terminalId: terminals[i % 2],
        scanMethod: ['BARCODE', 'RFID', 'QR', 'BIOMETRIC'][i % 4],
        status: exited ? 'EXITED' : 'INSIDE',
        gateEvent: exited ? 'OUT' : 'IN',
        academicYear: '2025-26',
      },
    });
  }

  await syncHourlyFootfall(institutionId);
  await logActivity(institutionId, 'SEED', 'Library gate attendance demo data seeded');
  return getLibraryGateAttendance(institutionId);
}
