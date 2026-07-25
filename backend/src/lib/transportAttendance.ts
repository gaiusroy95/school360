import { prisma } from './prisma.js';
import { seedTransportStopsGeoFencing } from './transportStopsGeoFencing.js';

export const ATTENDANCE_MODES = ['RFID', 'QR', 'NFC', 'FACE', 'MANUAL', 'MOBILE'];
export const SAFETY_STATUSES = ['PENDING', 'SAFE_BOARDED', 'SAFE_DROPPED', 'ABSENT', 'EXCEPTION', 'MISSED_PICKUP', 'MISSED_DROP'];
export const SESSION_TYPES = ['MORNING_PICKUP', 'AFTERNOON_DROP', 'EVENING_DROP', 'HOSTEL', 'SPECIAL'];

const REPORT_CATALOG = [
  'Student Transport Attendance Register', 'Daily Boarding Report', 'Daily Drop Report',
  'Boarding Summary Report', 'Drop Summary Report', 'Route-wise Attendance Report',
  'Vehicle-wise Attendance Report', 'Stop-wise Attendance Report', 'Driver-wise Attendance Report',
  'Student-wise Attendance Report', 'Missed Pickup Report', 'Missed Drop Report',
  'Wrong Bus Boarding Report', 'Wrong Stop Boarding Report', 'Duplicate Scan Report',
  'Attendance Exception Report', 'Manual Attendance Report', 'Attendance Correction Report',
  'Attendance Reconciliation Report', 'Parent Notification Report', 'Guardian Verification Report',
  'OTP Verification Report', 'RFID Attendance Report', 'QR Scan Report', 'NFC Attendance Report',
  'Face Recognition Attendance Report', 'Occupancy Report', 'Student Safety Report',
  'Emergency Evacuation Report', 'Attendance Audit Trail Report',
  'Transport Attendance Analytics Dashboard', 'Boarding Time Analysis Report',
  'Drop Time Analysis Report', 'Attendance Trend Report', 'Transport Safety Compliance Report',
];

const WORKFLOW = [
  'Student Arrives at Stop', 'RFID / QR / NFC / Face Scan', 'Boarding Verified',
  'GPS & Time Captured', 'Parent Notification Sent', 'Vehicle Travels', 'Drop Verification',
  'Parent Drop Notification', 'Attendance Synced to ERP', 'Trip Reconciliation',
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

async function ensureSettings(institutionId: string) {
  let row = await prisma.transportAttendanceSettings.findUnique({ where: { institutionId } });
  if (!row) {
    row = await prisma.transportAttendanceSettings.create({
      data: {
        institutionId,
        boardingCutoffMin: 15,
        duplicateScanWindowSec: 30,
        lateBoardingAlertMin: 10,
        attendanceModes: ATTENDANCE_MODES,
        roleMatrix: [
          { role: 'Admin', permissions: 'Full transport attendance, corrections, lock, reconciliation, settings' },
          { role: 'Transport Manager', permissions: 'Monitor live boarding, approve corrections, reconcile, reports' },
          { role: 'Driver', permissions: 'Scan QR/RFID, manual attendance, confirm vehicle empty' },
          { role: 'Attendant', permissions: 'Verify boarding/drop, guardian OTP, record absences' },
          { role: 'Principal', permissions: 'Live dashboard, safety compliance, emergency alerts' },
          { role: 'Parent', permissions: 'View notifications, attendance history, approve alternate guardian' },
        ],
        notificationRules: {
          channels: ['Push', 'SMS', 'WhatsApp', 'Email', 'In-App'],
          events: [
            'Bus started', 'Bus approaching stop', 'Student boarded', 'Student dropped',
            'Missed pickup', 'Late boarding', 'Wrong bus', 'Emergency SOS', 'Attendance locked',
          ],
        },
        mobileSyncRules: {
          parentApp: [
            'Bus started notification', 'Approaching pickup alert', 'Boarded confirmation',
            'Dropped confirmation', 'Timestamps & map location', 'Missed pickup alerts',
            'Emergency alerts', 'Attendance history', 'Download records', 'Report discrepancies',
          ],
          studentApp: ['Attendance history', 'Boarding/drop status', 'Schedule', 'Route & seat', 'Report issues'],
          driverApp: [
            'Boarding list', 'QR/RFID scan', 'Manual attendance', 'Pending students',
            'Drop verification', 'Occupancy count', 'Vehicle empty confirmation', 'Exception reports',
          ],
          attendantApp: [
            'Verify boarding/drop', 'Scan RFID/QR', 'Guardian verification', 'Record absences',
            'Late boarding', 'Incident reports', 'End-of-trip count',
          ],
          principalApp: [
            'Live boarding status', 'Bus occupancy', 'Students not boarded', 'Statistics',
            'Emergency alerts', 'Safety compliance', 'Exception review',
          ],
        },
        reportCatalog: REPORT_CATALOG,
      },
    });
  }
  return row;
}

async function audit(institutionId: string, entityType: string, action: string, details = '', entityId = '') {
  await prisma.transportAttendanceAuditLog.create({
    data: { institutionId, entityType, entityId, action, details, performedBy: 'Transport Manager' },
  });
}

async function nextSessionNumber(institutionId: string): Promise<string> {
  const count = await prisma.transportAttendanceSession.count({ where: { institutionId } });
  return `ATT-${String(count + 1).padStart(5, '0')}`;
}

async function syncSessionCounts(sessionId: string) {
  const records = await prisma.transportAttendanceRecord.findMany({ where: { sessionId } });
  const boarded = records.filter((r) => r.boardingStatus === 'BOARDED' || r.boardingStatus === 'LATE').length;
  const dropped = records.filter((r) => r.dropStatus === 'DROPPED').length;
  const absent = records.filter((r) => r.isAbsent).length;
  const pending = records.filter((r) => !r.isAbsent && r.boardingStatus === 'NOT_BOARDED').length;
  const exceptions = records.filter((r) => r.safetyStatus === 'EXCEPTION' || r.wrongBusAlert || r.wrongStopAlert).length;
  const missedPickup = records.filter((r) => r.safetyStatus === 'MISSED_PICKUP').length;
  const missedDrop = records.filter((r) => r.safetyStatus === 'MISSED_DROP').length;
  const occupancy = boarded - dropped;

  await prisma.transportAttendanceSession.update({
    where: { id: sessionId },
    data: {
      totalStudents: records.length,
      boardedCount: boarded,
      droppedCount: dropped,
      absentCount: absent,
      pendingCount: pending,
      exceptionCount: exceptions,
      missedPickupCount: missedPickup,
      missedDropCount: missedDrop,
      currentOccupancy: Math.max(0, occupancy),
    },
  });
}

async function syncBoardingLog(enrollmentId: string, institutionId: string, action: 'BOARD' | 'DROP', method: string) {
  const logDate = todayDate();
  const existing = await prisma.transportStudentBoardingLog.findUnique({
    where: { enrollmentId_logDate: { enrollmentId, logDate } },
  });
  if (action === 'DROP') {
    if (existing) {
      await prisma.transportStudentBoardingLog.update({
        where: { id: existing.id },
        data: { dropStatus: 'DROPPED', droppedAt: new Date() },
      });
    } else {
      await prisma.transportStudentBoardingLog.create({
        data: {
          institutionId, enrollmentId, logDate,
          boardingStatus: 'PRESENT', dropStatus: 'DROPPED',
          boardingMethod: method, droppedAt: new Date(),
        },
      });
    }
    return;
  }
  if (existing) {
    await prisma.transportStudentBoardingLog.update({
      where: { id: existing.id },
      data: { boardingStatus: 'PRESENT', boardingMethod: method, boardedAt: new Date() },
    });
  } else {
    await prisma.transportStudentBoardingLog.create({
      data: {
        institutionId, enrollmentId, logDate,
        boardingStatus: 'PRESENT', boardingMethod: method, boardedAt: new Date(),
      },
    });
  }
}

async function updateDailySummary(institutionId: string) {
  const logDate = todayDate();
  const sessions = await prisma.transportAttendanceSession.findMany({
    where: { institutionId, sessionDate: logDate },
  });
  const picked = sessions.reduce((s, x) => s + x.boardedCount, 0);
  const dropped = sessions.reduce((s, x) => s + x.droppedCount, 0);
  const pendingPick = sessions.reduce((s, x) => s + x.pendingCount, 0);
  const pendingDrop = Math.max(0, picked - dropped);
  const total = sessions.reduce((s, x) => s + x.totalStudents, 0);
  const attendancePct = total > 0 ? Math.round((picked / total) * 100) : 0;

  await prisma.transportAttendanceDaily.upsert({
    where: { institutionId_recordDate: { institutionId, recordDate: logDate } },
    create: { institutionId, recordDate: logDate, picked, dropped, pendingPick, pendingDrop, attendancePct },
    update: { picked, dropped, pendingPick, pendingDrop, attendancePct },
  });
}

function serializeRecord(r: {
  id: string; studentName: string; className: string; sectionName: string;
  pickupStopName: string; dropStopName: string; seatNumber: number | null;
  safetyStatus: string; boardingStatus: string; dropStatus: string;
  boardingMethod: string; dropMethod: string;
  boardedAt: Date | null; droppedAt: Date | null;
  boardingLat: number | null; boardingLng: number | null;
  dropLat: number | null; dropLng: number | null;
  boardingStopName: string; wrongBusAlert: boolean; wrongStopAlert: boolean;
  duplicatePrevented: boolean; guardianVerified: boolean; otpVerified: boolean;
  medicalAlert: string; exceptionType: string; exceptionReason: string;
  isAbsent: boolean; absentReason: string; correctionStatus: string;
  photoUrl: string; siblingGroupId: string; enrollmentId: string;
  enrollment?: {
    transportCardId: string; qrCode: string; photoUrl?: string;
    vehicle?: { vehicleNumber: string } | null;
    route?: { routeCode: string; routeName: string } | null;
  } | null;
}) {
  return {
    id: r.id, enrollmentId: r.enrollmentId, studentName: r.studentName,
    className: r.className, sectionName: r.sectionName,
    classSection: `${r.className}${r.sectionName ? `-${r.sectionName}` : ''}`,
    pickupStopName: r.pickupStopName, dropStopName: r.dropStopName,
    seatNumber: r.seatNumber, safetyStatus: r.safetyStatus,
    boardingStatus: r.boardingStatus, dropStatus: r.dropStatus,
    boardingMethod: r.boardingMethod, dropMethod: r.dropMethod,
    boardedAt: r.boardedAt?.toISOString() ?? null,
    droppedAt: r.droppedAt?.toISOString() ?? null,
    boardedTime: r.boardedAt ? r.boardedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '',
    droppedTime: r.droppedAt ? r.droppedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '',
    boardingLat: r.boardingLat, boardingLng: r.boardingLng,
    dropLat: r.dropLat, dropLng: r.dropLng,
    boardingStopName: r.boardingStopName,
    wrongBusAlert: r.wrongBusAlert, wrongStopAlert: r.wrongStopAlert,
    duplicatePrevented: r.duplicatePrevented,
    guardianVerified: r.guardianVerified, otpVerified: r.otpVerified,
    medicalAlert: r.medicalAlert, exceptionType: r.exceptionType,
    exceptionReason: r.exceptionReason, isAbsent: r.isAbsent,
    absentReason: r.absentReason, correctionStatus: r.correctionStatus,
    photoUrl: r.photoUrl || r.enrollment?.photoUrl || '',
    transportCardId: r.enrollment?.transportCardId ?? '',
    qrCode: r.enrollment?.qrCode ?? '',
    vehicleNumber: r.enrollment?.vehicle?.vehicleNumber ?? '',
    routeCode: r.enrollment?.route?.routeCode ?? '',
    routeName: r.enrollment?.route?.routeName ?? '',
    siblingGroupId: r.siblingGroupId,
  };
}

function serializeSession(s: {
  id: string; sessionNumber: string; sessionDate: Date; sessionType: string;
  status: string; totalStudents: number; boardedCount: number; droppedCount: number;
  absentCount: number; pendingCount: number; exceptionCount: number;
  missedPickupCount: number; missedDropCount: number; currentOccupancy: number;
  vehicleEmptyConfirmed: boolean; attendanceLocked: boolean; boardingCutoffTime: string;
  branch: string; academicYear: string; reconciledAt: Date | null;
  vehicle?: { vehicleNumber: string } | null;
  route?: { routeCode: string; routeName: string } | null;
  driver?: { name: string } | null;
  attendant?: { name: string } | null;
}) {
  const occupancyPct = s.totalStudents > 0 ? Math.round((s.currentOccupancy / s.totalStudents) * 100) : 0;
  return {
    id: s.id, sessionNumber: s.sessionNumber,
    sessionDate: s.sessionDate.toISOString().slice(0, 10),
    sessionType: s.sessionType, status: s.status,
    vehicleNumber: s.vehicle?.vehicleNumber ?? '',
    routeCode: s.route?.routeCode ?? '', routeName: s.route?.routeName ?? '',
    driverName: s.driver?.name ?? '', attendantName: s.attendant?.name ?? '',
    totalStudents: s.totalStudents, boardedCount: s.boardedCount,
    droppedCount: s.droppedCount, absentCount: s.absentCount,
    pendingCount: s.pendingCount, exceptionCount: s.exceptionCount,
    missedPickupCount: s.missedPickupCount, missedDropCount: s.missedDropCount,
    currentOccupancy: s.currentOccupancy, occupancyPct,
    vehicleEmptyConfirmed: s.vehicleEmptyConfirmed,
    attendanceLocked: s.attendanceLocked,
    boardingCutoffTime: s.boardingCutoffTime,
    branch: s.branch, academicYear: s.academicYear,
    reconciledAt: s.reconciledAt?.toISOString() ?? null,
  };
}

const recordInclude = {
  enrollment: {
    select: {
      transportCardId: true, qrCode: true, photoUrl: true,
      vehicle: { select: { vehicleNumber: true } },
      route: { select: { routeCode: true, routeName: true } },
    },
  },
};

const sessionInclude = {
  vehicle: { select: { vehicleNumber: true } },
  route: { select: { routeCode: true, routeName: true } },
  driver: { select: { name: true } },
  attendant: { select: { name: true } },
};

export async function getTransportAttendance(institutionId: string, academicYear = '2025-26') {
  await ensureSettings(institutionId);
  const sessionDate = todayDate();

  const [sessions, corrections, events, auditLogs, settings, daily] = await Promise.all([
    prisma.transportAttendanceSession.findMany({
      where: { institutionId, academicYear, sessionDate },
      include: {
        ...sessionInclude,
        records: { include: recordInclude, orderBy: { studentName: 'asc' } },
      },
      orderBy: { sessionNumber: 'asc' },
    }),
    prisma.transportAttendanceCorrection.findMany({
      where: { institutionId, status: 'PENDING' },
      include: { record: { select: { studentName: true, sessionId: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.transportAttendanceEvent.findMany({
      where: { institutionId },
      orderBy: { scannedAt: 'desc' },
      take: 30,
    }),
    prisma.transportAttendanceAuditLog.findMany({
      where: { institutionId }, orderBy: { createdAt: 'desc' }, take: 25,
    }),
    prisma.transportAttendanceSettings.findUnique({ where: { institutionId } }),
    prisma.transportAttendanceDaily.findUnique({
      where: { institutionId_recordDate: { institutionId, recordDate: sessionDate } },
    }),
  ]);

  const serializedSessions = sessions.map((s) => ({
    ...serializeSession(s),
    records: s.records.map((r) => serializeRecord({ ...r, enrollment: r.enrollment })),
  }));

  const allRecords = serializedSessions.flatMap((s) => s.records.map((r) => ({ ...r, sessionId: s.id, sessionNumber: s.sessionNumber })));
  const activeSessions = serializedSessions.filter((s) => s.status === 'IN_PROGRESS');

  return {
    academicYear,
    academicYears: ['2024-25', '2025-26', '2026-27'],
    attendanceModes: ATTENDANCE_MODES,
    safetyStatuses: SAFETY_STATUSES,
    sessionTypes: SESSION_TYPES,
    workflow: WORKFLOW,
    kpis: {
      totalStudents: allRecords.length,
      boarded: allRecords.filter((r) => r.boardingStatus === 'BOARDED' || r.boardingStatus === 'LATE').length,
      dropped: allRecords.filter((r) => r.dropStatus === 'DROPPED').length,
      pending: allRecords.filter((r) => r.safetyStatus === 'PENDING' && !r.isAbsent).length,
      absent: allRecords.filter((r) => r.isAbsent).length,
      exceptions: allRecords.filter((r) => r.safetyStatus === 'EXCEPTION' || r.wrongBusAlert || r.wrongStopAlert).length,
      missedPickup: allRecords.filter((r) => r.safetyStatus === 'MISSED_PICKUP').length,
      missedDrop: allRecords.filter((r) => r.safetyStatus === 'MISSED_DROP').length,
      safeBoarded: allRecords.filter((r) => r.safetyStatus === 'SAFE_BOARDED').length,
      safeDropped: allRecords.filter((r) => r.safetyStatus === 'SAFE_DROPPED').length,
      currentOccupancy: activeSessions.reduce((s, x) => s + x.currentOccupancy, 0),
      activeSessions: activeSessions.length,
      pendingCorrections: corrections.length,
      attendancePct: daily?.attendancePct ?? 0,
      wrongBusAlerts: allRecords.filter((r) => r.wrongBusAlert).length,
      emergencyCases: allRecords.filter((r) => r.exceptionType === 'EMERGENCY').length,
    },
    sessions: serializedSessions,
    activeSessions,
    records: allRecords,
    corrections: corrections.map((c) => ({
      id: c.id, recordId: c.recordId, studentName: c.record.studentName,
      correctionType: c.correctionType, fieldName: c.fieldName,
      previousValue: c.previousValue, newValue: c.newValue,
      reason: c.reason, status: c.status, requestedBy: c.requestedBy,
      createdAt: c.createdAt.toISOString(), relativeTime: relativeTime(c.createdAt),
    })),
    recentEvents: events.map((e) => ({
      id: e.id, eventType: e.eventType, method: e.method,
      enrollmentId: e.enrollmentId, stopName: e.stopName,
      isDuplicate: e.isDuplicate, isWrongBus: e.isWrongBus, isWrongStop: e.isWrongStop,
      scannedAt: e.scannedAt.toISOString(),
      relativeTime: relativeTime(e.scannedAt),
      notes: e.notes,
    })),
    auditLogs: auditLogs.map((a) => ({
      id: a.id, entityType: a.entityType, entityId: a.entityId,
      action: a.action, details: a.details, performedBy: a.performedBy,
      createdAt: a.createdAt.toISOString(), relativeTime: relativeTime(a.createdAt),
    })),
    dailySummary: daily ? {
      picked: daily.picked, dropped: daily.dropped,
      pendingPick: daily.pendingPick, pendingDrop: daily.pendingDrop,
      attendancePct: daily.attendancePct,
    } : null,
    settings,
    reports: REPORT_CATALOG,
  };
}

export async function recordTransportAttendance(
  institutionId: string, recordId: string, body: Record<string, unknown>,
) {
  const settings = await ensureSettings(institutionId);
  const action = String(body.action ?? 'BOARD').toUpperCase();
  const method = String(body.method ?? 'QR').toUpperCase();
  const now = new Date();

  const record = await prisma.transportAttendanceRecord.findFirst({
    where: { id: recordId, institutionId },
    include: {
      session: true,
      enrollment: { include: { vehicle: true, route: true } },
    },
  });
  if (!record) throw new Error('Attendance record not found');
  if (record.session.attendanceLocked) throw new Error('Attendance is locked for this session');

  const recentDup = await prisma.transportAttendanceEvent.findFirst({
    where: {
      recordId,
      eventType: action === 'DROP' ? 'DROP' : 'BOARD',
      scannedAt: { gte: new Date(now.getTime() - settings.duplicateScanWindowSec * 1000) },
    },
  });
  if (recentDup) {
    await prisma.transportAttendanceEvent.create({
      data: {
        institutionId, sessionId: record.sessionId, recordId, enrollmentId: record.enrollmentId,
        eventType: action === 'DROP' ? 'DROP' : 'BOARD', method,
        isDuplicate: true, notes: 'Duplicate scan prevented',
        vehicleId: record.session.vehicleId, routeId: record.session.routeId,
        stopName: String(body.stopName ?? record.pickupStopName),
        latitude: body.latitude != null ? Number(body.latitude) : null,
        longitude: body.longitude != null ? Number(body.longitude) : null,
        verifiedBy: String(body.verifiedBy ?? 'Driver'),
      },
    });
    await prisma.transportAttendanceRecord.update({
      where: { id: recordId },
      data: { duplicatePrevented: true },
    });
    throw new Error('Duplicate scan prevented');
  }

  const scanVehicleId = body.vehicleId ? String(body.vehicleId) : record.session.vehicleId;
  const wrongBus = record.assignedVehicleId && scanVehicleId && record.assignedVehicleId !== scanVehicleId;
  const stopName = String(body.stopName ?? (action === 'DROP' ? record.dropStopName : record.pickupStopName));
  const wrongStop = body.stopName && record.pickupStopName
    && !record.pickupStopName.toLowerCase().includes(stopName.toLowerCase().slice(0, 4))
    && action === 'BOARD';

  if (action === 'DROP') {
    await prisma.transportAttendanceRecord.update({
      where: { id: recordId },
      data: {
        dropStatus: 'DROPPED', dropMethod: method, droppedAt: now,
        dropLat: body.latitude != null ? Number(body.latitude) : null,
        dropLng: body.longitude != null ? Number(body.longitude) : null,
        dropStopNameActual: stopName,
        safetyStatus: 'SAFE_DROPPED',
        guardianVerified: body.guardianVerified === true,
        otpVerified: body.otpVerified === true,
      },
    });
    await prisma.transportAttendanceEvent.create({
      data: {
        institutionId, sessionId: record.sessionId, recordId, enrollmentId: record.enrollmentId,
        eventType: 'DROP', method, stopName,
        vehicleId: scanVehicleId, routeId: record.session.routeId,
        latitude: body.latitude != null ? Number(body.latitude) : null,
        longitude: body.longitude != null ? Number(body.longitude) : null,
        verifiedBy: String(body.verifiedBy ?? 'Attendant'),
        notes: 'Parent drop notification sent',
      },
    });
    await syncBoardingLog(record.enrollmentId, institutionId, 'DROP', method);
    await audit(institutionId, 'ATTENDANCE', 'Drop Recorded', `${record.studentName} via ${method}`, recordId);
  } else {
    const isLate = body.isLate === true;
    await prisma.transportAttendanceRecord.update({
      where: { id: recordId },
      data: {
        boardingStatus: isLate ? 'LATE' : 'BOARDED',
        boardingMethod: method, boardedAt: now,
        boardingLat: body.latitude != null ? Number(body.latitude) : null,
        boardingLng: body.longitude != null ? Number(body.longitude) : null,
        boardingStopName: stopName,
        safetyStatus: wrongBus || wrongStop ? 'EXCEPTION' : 'SAFE_BOARDED',
        wrongBusAlert: Boolean(wrongBus),
        wrongStopAlert: Boolean(wrongStop),
        exceptionType: wrongBus ? 'WRONG_BUS' : wrongStop ? 'WRONG_STOP' : '',
        exceptionReason: wrongBus ? 'Student boarded incorrect vehicle' : wrongStop ? 'Student boarded at wrong stop' : '',
        guardianVerified: body.guardianVerified === true,
        otpVerified: body.otpVerified === true,
        offlineSynced: body.offlineSynced !== false,
      },
    });
    await prisma.transportAttendanceEvent.create({
      data: {
        institutionId, sessionId: record.sessionId, recordId, enrollmentId: record.enrollmentId,
        eventType: 'BOARD', method, stopName,
        vehicleId: scanVehicleId, routeId: record.session.routeId,
        latitude: body.latitude != null ? Number(body.latitude) : null,
        longitude: body.longitude != null ? Number(body.longitude) : null,
        isWrongBus: Boolean(wrongBus), isWrongStop: Boolean(wrongStop),
        verifiedBy: String(body.verifiedBy ?? 'Driver'),
        notes: wrongBus ? 'Wrong bus alert triggered' : 'Parent boarding notification sent',
      },
    });
    await syncBoardingLog(record.enrollmentId, institutionId, 'BOARD', method);
    await audit(institutionId, 'ATTENDANCE', 'Boarding Recorded', `${record.studentName} via ${method}`, recordId);
  }

  await syncSessionCounts(record.sessionId);
  await updateDailySummary(institutionId);
}

export async function markTransportAbsent(
  institutionId: string, recordId: string, reason: string,
) {
  const record = await prisma.transportAttendanceRecord.update({
    where: { id: recordId, institutionId },
    data: {
      isAbsent: true, absentReason: reason,
      boardingStatus: 'ABSENT', safetyStatus: 'ABSENT',
    },
  });
  await prisma.transportAttendanceEvent.create({
    data: {
      institutionId, sessionId: record.sessionId, recordId,
      enrollmentId: record.enrollmentId, eventType: 'ABSENT', method: 'MANUAL',
      notes: reason, verifiedBy: 'Attendant',
    },
  });
  await syncSessionCounts(record.sessionId);
  await updateDailySummary(institutionId);
  await audit(institutionId, 'ATTENDANCE', 'Marked Absent', `${record.studentName}: ${reason}`, recordId);
}

export async function confirmVehicleEmpty(institutionId: string, sessionId: string) {
  const session = await prisma.transportAttendanceSession.findFirst({
    where: { id: sessionId, institutionId },
    include: { records: true },
  });
  if (!session) throw new Error('Session not found');

  const onboard = session.records.filter(
    (r) => (r.boardingStatus === 'BOARDED' || r.boardingStatus === 'LATE') && r.dropStatus !== 'DROPPED',
  );
  if (onboard.length > 0) {
    for (const r of onboard) {
      await prisma.transportAttendanceRecord.update({
        where: { id: r.id },
        data: { safetyStatus: 'MISSED_DROP', exceptionType: 'LEFT_IN_VEHICLE', exceptionReason: 'Student not dropped — left in vehicle check' },
      });
    }
    await audit(institutionId, 'SAFETY', 'Students Left Behind Alert', `${onboard.length} students still onboard`, sessionId);
  }

  await prisma.transportAttendanceSession.update({
    where: { id: sessionId },
    data: { vehicleEmptyConfirmed: true, currentOccupancy: 0 },
  });
  await audit(institutionId, 'SESSION', 'Vehicle Empty Confirmed', session.sessionNumber, sessionId);
}

export async function lockTransportAttendance(institutionId: string, sessionId: string) {
  await prisma.transportAttendanceSession.update({
    where: { id: sessionId, institutionId },
    data: { attendanceLocked: true, status: 'COMPLETED' },
  });
  await audit(institutionId, 'SESSION', 'Attendance Locked', sessionId);
}

export async function reconcileTransportAttendance(institutionId: string, sessionId: string) {
  const session = await prisma.transportAttendanceSession.findFirst({
    where: { id: sessionId, institutionId },
    include: { records: true },
  });
  if (!session) throw new Error('Session not found');

  for (const r of session.records) {
    if (!r.isAbsent && r.boardingStatus === 'NOT_BOARDED') {
      await prisma.transportAttendanceRecord.update({
        where: { id: r.id },
        data: { safetyStatus: 'MISSED_PICKUP', exceptionType: 'MISSED_PICKUP' },
      });
    }
    if ((r.boardingStatus === 'BOARDED' || r.boardingStatus === 'LATE') && r.dropStatus !== 'DROPPED') {
      await prisma.transportAttendanceRecord.update({
        where: { id: r.id },
        data: { safetyStatus: 'MISSED_DROP', exceptionType: 'MISSED_DROP' },
      });
    }
  }

  await prisma.transportAttendanceSession.update({
    where: { id: sessionId },
    data: { reconciledAt: new Date(), status: 'RECONCILED' },
  });
  await syncSessionCounts(sessionId);
  await updateDailySummary(institutionId);
  await audit(institutionId, 'SESSION', 'Reconciled', session.sessionNumber, sessionId);
}

export async function requestAttendanceCorrection(
  institutionId: string, recordId: string, body: Record<string, unknown>,
) {
  const record = await prisma.transportAttendanceRecord.findFirst({ where: { id: recordId, institutionId } });
  if (!record) throw new Error('Record not found');

  const fieldName = String(body.fieldName ?? 'boardingStatus');
  const newValue = String(body.newValue ?? '');
  const previousValue = String((record as Record<string, unknown>)[fieldName] ?? '');

  await prisma.transportAttendanceCorrection.create({
    data: {
      institutionId, recordId,
      correctionType: String(body.correctionType ?? 'MANUAL_FIX'),
      fieldName, previousValue, newValue,
      reason: String(body.reason ?? 'Correction requested'),
      requestedBy: String(body.requestedBy ?? 'Driver'),
    },
  });
  await prisma.transportAttendanceRecord.update({
    where: { id: recordId },
    data: { correctionStatus: 'PENDING' },
  });
  await audit(institutionId, 'CORRECTION', 'Requested', `${record.studentName}: ${fieldName}`, recordId);
}

export async function resolveAttendanceCorrection(
  institutionId: string, correctionId: string, action: string,
) {
  const correction = await prisma.transportAttendanceCorrection.findFirst({
    where: { id: correctionId, institutionId },
    include: { record: true },
  });
  if (!correction) throw new Error('Correction not found');

  if (action === 'APPROVED') {
    const update: Record<string, unknown> = { correctionStatus: 'APPROVED' };
    if (correction.fieldName === 'boardingStatus') {
      update.boardingStatus = correction.newValue;
      update.safetyStatus = correction.newValue === 'BOARDED' ? 'SAFE_BOARDED' : 'PENDING';
      if (correction.newValue === 'BOARDED') update.boardedAt = new Date();
    }
    if (correction.fieldName === 'dropStatus') {
      update.dropStatus = correction.newValue;
      update.safetyStatus = correction.newValue === 'DROPPED' ? 'SAFE_DROPPED' : 'SAFE_BOARDED';
      if (correction.newValue === 'DROPPED') update.droppedAt = new Date();
    }
    await prisma.transportAttendanceRecord.update({
      where: { id: correction.recordId },
      data: update,
    });
    await syncSessionCounts(correction.record.sessionId);
  }

  await prisma.transportAttendanceCorrection.update({
    where: { id: correctionId },
    data: {
      status: action, approvedBy: 'Transport Manager', resolvedAt: new Date(),
    },
  });
  await audit(institutionId, 'CORRECTION', action, correction.correctionType, correctionId);
}

export async function seedTransportAttendance(institutionId: string) {
  await seedTransportStopsGeoFencing(institutionId);
  await ensureSettings(institutionId);

  const existing = await prisma.transportAttendanceSession.count({ where: { institutionId } });
  if (existing >= 4) return getTransportAttendance(institutionId);

  const sessionDate = todayDate();
  const enrollments = await prisma.transportStudentEnrollment.findMany({
    where: { institutionId, status: 'ACTIVE' },
    include: { vehicle: true, route: true, driver: true, attendant: true },
    take: 40,
  });
  const trips = await prisma.transportTrip.findMany({
    where: { institutionId, tripDate: sessionDate },
    take: 6,
  });

  const vehicles = [...new Map(enrollments.filter((e) => e.vehicleId).map((e) => [e.vehicleId, e.vehicle])).values()];
  const sessionTypes = ['MORNING_PICKUP', 'MORNING_PICKUP', 'AFTERNOON_DROP', 'AFTERNOON_DROP'];

  for (let vi = 0; vi < Math.min(vehicles.length, 4); vi++) {
    const vehicle = vehicles[vi];
    const vehicleEnrollments = enrollments.filter((e) => e.vehicleId === vehicle?.id);
    if (!vehicleEnrollments.length) continue;

    const sample = vehicleEnrollments[0];
    const trip = trips.find((t) => t.vehicleId === vehicle?.id);
    const sessionNumber = await nextSessionNumber(institutionId);

    const session = await prisma.transportAttendanceSession.create({
      data: {
        institutionId,
        sessionNumber,
        sessionDate,
        sessionType: sessionTypes[vi] ?? 'MORNING_PICKUP',
        tripId: trip?.id,
        vehicleId: vehicle?.id,
        routeId: sample.routeId,
        driverId: sample.driverId,
        attendantId: sample.attendantId,
        branch: sample.branch,
        academicYear: sample.academicYear,
        status: vi < 2 ? 'IN_PROGRESS' : 'COMPLETED',
        boardingCutoffTime: sample.pickupTime,
        vehicleEmptyConfirmed: vi >= 2,
        attendanceLocked: vi >= 3,
      },
    });

    const methods = ['RFID', 'QR', 'NFC', 'QR', 'MANUAL', 'MOBILE', 'QR', 'FACE'];
    let boarded = 0;
    let dropped = 0;

    for (let i = 0; i < vehicleEnrollments.length; i++) {
      const enr = vehicleEnrollments[i];
      const isAbsent = i % 11 === 0;
      const isBoarded = !isAbsent && i % 7 !== 6;
      const isDropped = isBoarded && (vi >= 2 || i % 3 !== 2);
      const isLate = isBoarded && i % 9 === 0;
      const wrongBus = isBoarded && i === 3;
      const wrongStop = isBoarded && i === 5;
      const method = methods[i % methods.length];
      const boardedAt = isBoarded ? new Date(Date.now() - (vehicleEnrollments.length - i) * 120000) : null;
      const droppedAt = isDropped ? new Date(Date.now() - (vehicleEnrollments.length - i) * 60000) : null;

      let safetyStatus = 'PENDING';
      if (isAbsent) safetyStatus = 'ABSENT';
      else if (isDropped) safetyStatus = 'SAFE_DROPPED';
      else if (isBoarded) safetyStatus = wrongBus || wrongStop ? 'EXCEPTION' : 'SAFE_BOARDED';
      else if (vi >= 2) safetyStatus = 'MISSED_PICKUP';

      const record = await prisma.transportAttendanceRecord.create({
        data: {
          institutionId,
          sessionId: session.id,
          enrollmentId: enr.id,
          studentName: enr.studentName,
          className: enr.className,
          sectionName: enr.sectionName,
          assignedRouteId: enr.routeId,
          assignedVehicleId: enr.vehicleId,
          pickupStopName: enr.pickupStopName,
          dropStopName: enr.dropStopName,
          seatNumber: enr.seatNumber,
          safetyStatus,
          boardingStatus: isAbsent ? 'ABSENT' : isBoarded ? (isLate ? 'LATE' : 'BOARDED') : 'NOT_BOARDED',
          dropStatus: isDropped ? 'DROPPED' : 'NOT_DROPPED',
          boardingMethod: isBoarded ? method : '',
          dropMethod: isDropped ? (i % 2 === 0 ? 'QR' : 'MANUAL') : '',
          boardedAt,
          droppedAt,
          boardingLat: 26.91 + i * 0.001,
          boardingLng: 75.78 + i * 0.001,
          boardingStopName: enr.pickupStopName,
          wrongBusAlert: wrongBus,
          wrongStopAlert: wrongStop,
          guardianVerified: isDropped && i % 2 === 0,
          otpVerified: isDropped && enr.className.includes('1'),
          medicalAlert: i % 13 === 0 ? 'Allergy: Peanuts' : '',
          exceptionType: wrongBus ? 'WRONG_BUS' : wrongStop ? 'WRONG_STOP' : isAbsent ? '' : '',
          exceptionReason: wrongBus ? 'Boarded wrong vehicle' : wrongStop ? 'Wrong stop boarding' : '',
          isAbsent,
          absentReason: isAbsent ? 'Parent informed — not using transport today' : '',
          photoUrl: enr.photoUrl,
          siblingGroupId: enr.siblingGroupId,
          offlineSynced: i % 8 !== 0,
        },
      });

      if (isBoarded) {
        boarded++;
        await prisma.transportAttendanceEvent.create({
          data: {
            institutionId, sessionId: session.id, recordId: record.id,
            enrollmentId: enr.id, eventType: 'BOARD', method,
            latitude: 26.91 + i * 0.001, longitude: 75.78 + i * 0.001,
            stopName: enr.pickupStopName, vehicleId: vehicle?.id, routeId: enr.routeId,
            isWrongBus: wrongBus, isWrongStop: wrongStop,
            verifiedBy: 'Driver', notes: wrongBus ? 'Wrong bus alert' : 'Boarding verified',
          },
        });
      }
      if (isDropped) {
        dropped++;
        await prisma.transportAttendanceEvent.create({
          data: {
            institutionId, sessionId: session.id, recordId: record.id,
            enrollmentId: enr.id, eventType: 'DROP', method: 'QR',
            latitude: 26.912, longitude: 75.787,
            stopName: enr.dropStopName || 'School Gate',
            vehicleId: vehicle?.id, routeId: enr.routeId,
            verifiedBy: 'Attendant', notes: 'Drop confirmed — parent notified',
          },
        });
      }
      if (isAbsent) {
        await prisma.transportAttendanceEvent.create({
          data: {
            institutionId, sessionId: session.id, recordId: record.id,
            enrollmentId: enr.id, eventType: 'ABSENT', method: 'MANUAL',
            verifiedBy: 'Attendant', notes: 'Absent from transport',
          },
        });
      }
    }

    await syncSessionCounts(session.id);
    if (vi >= 2) {
      await prisma.transportAttendanceSession.update({
        where: { id: session.id },
        data: { reconciledAt: new Date(), status: 'RECONCILED' },
      });
    }
  }

  const firstRecord = await prisma.transportAttendanceRecord.findFirst({ where: { institutionId } });
  if (firstRecord) {
    await prisma.transportAttendanceCorrection.create({
      data: {
        institutionId,
        recordId: firstRecord.id,
        correctionType: 'BOARDING_TIME',
        fieldName: 'boardingStatus',
        previousValue: 'NOT_BOARDED',
        newValue: 'BOARDED',
        reason: 'RFID failed — manual correction after supervisor verification',
        requestedBy: 'Driver',
      },
    });
  }

  await updateDailySummary(institutionId);
  await audit(institutionId, 'SYSTEM', 'Seed Demo', 'Transport attendance demo data loaded');
  return getTransportAttendance(institutionId);
}
