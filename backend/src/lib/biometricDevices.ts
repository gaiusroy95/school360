import {
  AttendanceSessionMode,
  AttendanceStatus,
  BiometricAttendanceEventType,
  BiometricDeviceStatus,
  BiometricDeviceType,
  BiometricPersonType,
  BiometricPunchStatus,
  Prisma,
  StaffAttendanceStatus,
  StudentStatus,
  TeacherAttendanceStatus,
} from '@prisma/client';
import { prisma } from './prisma.js';
import { formatClassSection, getInstitutionFilterMeta } from './students.js';
import { getOrCreateTimelineConfig, parseTimeToMinutes } from './lateEarlyExit.js';

const DEVICE_TYPE_LABELS: Record<BiometricDeviceType, string> = {
  FINGERPRINT: 'Fingerprint Scanner',
  FACE_RECOGNITION: 'Face Recognition',
  RFID_READER: 'RFID Card Reader',
  MOBILE_GEOFENCE: 'Mobile Geo-Fence App',
};

const PUNCH_STATUS_LABELS: Record<BiometricPunchStatus, string> = {
  ACCEPTED: 'Accepted',
  REJECTED_OUTSIDE_FENCE: 'Rejected — Outside Geo-Fence',
  REJECTED_NOT_ENROLLED: 'Rejected — Not Enrolled',
  REJECTED_DEVICE_INACTIVE: 'Rejected — Device Inactive',
};

const PERSON_TYPE_LABELS: Record<BiometricPersonType, string> = {
  STUDENT: 'Student',
  TEACHER: 'Teacher',
  STAFF: 'Staff',
};

function parseDateOnly(value?: string | Date): Date {
  if (value instanceof Date) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  }
  const raw = String(value || '').trim();
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function formatTimeNow() {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

function haversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function nextRecordId(institutionId: string, prefix: string, model: 'geoFence' | 'device' | 'enrollment' | 'punch') {
  const count =
    model === 'geoFence'
      ? await prisma.attendanceGeoFence.count({ where: { institutionId } })
      : model === 'device'
        ? await prisma.biometricDevice.count({ where: { institutionId } })
        : model === 'enrollment'
          ? await prisma.biometricEnrollment.count({ where: { institutionId } })
          : await prisma.biometricAttendancePunch.count({ where: { institutionId } });
  return `${prefix}-${String(1000 + count + 1)}`;
}

function checkGeoFence(
  lat: number | undefined,
  lng: number | undefined,
  fence: { latitude: number; longitude: number; radiusMeters: number; id: string; name: string },
) {
  if (lat == null || lng == null) {
    return { within: false, distanceMeters: null as number | null, geoFenceId: fence.id, geoFenceName: fence.name };
  }
  const distance = haversineDistanceMeters(lat, lng, fence.latitude, fence.longitude);
  return {
    within: distance <= fence.radiusMeters,
    distanceMeters: Math.round(distance * 10) / 10,
    geoFenceId: fence.id,
    geoFenceName: fence.name,
  };
}

async function resolveGeoFence(
  institutionId: string,
  device?: { geoFenceId: string | null; requiresGeoFence: boolean } | null,
) {
  if (device?.geoFenceId) {
    const fence = await prisma.attendanceGeoFence.findFirst({
      where: { id: device.geoFenceId, institutionId, isActive: true },
    });
    if (fence) return fence;
  }
  return prisma.attendanceGeoFence.findFirst({
    where: { institutionId, isActive: true, isDefault: true },
    orderBy: { createdAt: 'asc' },
  });
}

async function findEnrollment(
  institutionId: string,
  opts: { rfidCardId?: string; personType?: BiometricPersonType; personId?: string },
) {
  if (opts.rfidCardId) {
    const byRfid = await prisma.biometricEnrollment.findFirst({
      where: { institutionId, rfidCardId: opts.rfidCardId, isActive: true },
      include: {
        student: true,
        teacherProfile: true,
        staffProfile: true,
      },
    });
    if (byRfid) return byRfid;

    const studentByTag = await prisma.student.findFirst({
      where: { institutionId, rfidTag: opts.rfidCardId, status: StudentStatus.ACTIVE },
    });
    if (studentByTag) {
      return prisma.biometricEnrollment.findFirst({
        where: { institutionId, studentId: studentByTag.id, isActive: true },
        include: { student: true, teacherProfile: true, staffProfile: true },
      }) || {
        id: 'inline-student',
        institutionId,
        recordId: 'inline',
        personType: BiometricPersonType.STUDENT,
        studentId: studentByTag.id,
        teacherProfileId: null,
        staffProfileId: null,
        academicYear: studentByTag.academicYear,
        rfidCardId: opts.rfidCardId,
        biometricTemplateId: '',
        deviceId: null,
        isActive: true,
        enrolledBy: 'RFID Tag',
        enrolledAt: new Date(),
        notes: '',
        createdAt: new Date(),
        updatedAt: new Date(),
        student: studentByTag,
        teacherProfile: null,
        staffProfile: null,
      };
    }
  }

  if (opts.personType && opts.personId) {
    const where =
      opts.personType === BiometricPersonType.STUDENT
        ? { institutionId, studentId: opts.personId, isActive: true }
        : opts.personType === BiometricPersonType.TEACHER
          ? { institutionId, teacherProfileId: opts.personId, isActive: true }
          : { institutionId, staffProfileId: opts.personId, isActive: true };
    return prisma.biometricEnrollment.findFirst({
      where,
      include: { student: true, teacherProfile: true, staffProfile: true },
    });
  }

  return null;
}

type ResolvedPerson = {
  personType: BiometricPersonType;
  personId: string;
  personName: string;
  personCode: string;
  classGroup: string;
  academicYear: string;
  className?: string;
  sectionName?: string;
};

function resolvePersonFromEnrollment(enrollment: NonNullable<Awaited<ReturnType<typeof findEnrollment>>>): ResolvedPerson | null {
  if (enrollment.personType === BiometricPersonType.STUDENT && enrollment.student) {
    const s = enrollment.student;
    return {
      personType: BiometricPersonType.STUDENT,
      personId: s.id,
      personName: `${s.firstName} ${s.lastName}`.trim(),
      personCode: s.admissionNumber,
      classGroup: formatClassSection(s.className, s.sectionName),
      academicYear: s.academicYear,
      className: s.className,
      sectionName: s.sectionName,
    };
  }
  if (enrollment.personType === BiometricPersonType.TEACHER && enrollment.teacherProfile) {
    const t = enrollment.teacherProfile;
    return {
      personType: BiometricPersonType.TEACHER,
      personId: t.id,
      personName: t.teacherName,
      personCode: t.employeeCode,
      classGroup: t.department,
      academicYear: t.academicYear,
    };
  }
  if (enrollment.personType === BiometricPersonType.STAFF && enrollment.staffProfile) {
    const s = enrollment.staffProfile;
    return {
      personType: BiometricPersonType.STAFF,
      personId: s.id,
      personName: s.staffName,
      personCode: s.employeeCode,
      classGroup: s.department,
      academicYear: s.academicYear,
    };
  }
  return null;
}

async function applyAttendanceFromPunch(
  institutionId: string,
  person: ResolvedPerson,
  eventType: BiometricAttendanceEventType,
  checkTime: string,
) {
  const today = parseDateOnly();
  const timeline = await getOrCreateTimelineConfig(institutionId);

  if (person.personType === BiometricPersonType.STUDENT && person.className) {
    let session = await prisma.attendanceSession.findFirst({
      where: {
        institutionId,
        sessionDate: today,
        className: person.className,
        sectionName: person.sectionName || '',
        mode: AttendanceSessionMode.CLASS,
        subjectName: '',
        activityName: '',
      },
    });
    if (!session) {
      session = await prisma.attendanceSession.create({
        data: {
          institutionId,
          recordId: await nextRecordId(institutionId, 'ATT', 'punch'),
          academicYear: person.academicYear,
          sessionDate: today,
          className: person.className,
          sectionName: person.sectionName || '',
          mode: AttendanceSessionMode.CLASS,
          markedBy: 'Biometric System',
          source: 'BIOMETRIC',
        },
      });
    }

    if (eventType === BiometricAttendanceEventType.CHECK_IN) {
      const lateThreshold = parseTimeToMinutes(timeline.studentLateAfter);
      const checkInMins = parseTimeToMinutes(checkTime);
      const isLate = lateThreshold != null && checkInMins != null && checkInMins > lateThreshold;
      const lateMinutes = isLate && checkInMins != null && lateThreshold != null ? checkInMins - lateThreshold : 0;

      await prisma.attendanceRecord.upsert({
        where: { sessionId_studentId: { sessionId: session.id, studentId: person.personId } },
        create: {
          sessionId: session.id,
          studentId: person.personId,
          status: isLate ? AttendanceStatus.LATE : AttendanceStatus.PRESENT,
          checkInTime: checkTime,
          lateMinutes,
          remarks: 'Marked via biometric/RFID',
        },
        update: {
          status: isLate ? AttendanceStatus.LATE : AttendanceStatus.PRESENT,
          checkInTime: checkTime,
          lateMinutes,
          remarks: 'Marked via biometric/RFID',
        },
      });
    } else {
      const existing = await prisma.attendanceRecord.findFirst({
        where: { sessionId: session.id, studentId: person.personId },
      });
      if (existing) {
        const earlyThreshold = parseTimeToMinutes(timeline.studentEarlyExitBefore);
        const checkOutMins = parseTimeToMinutes(checkTime);
        const earlyExitMinutes =
          earlyThreshold != null && checkOutMins != null && checkOutMins < earlyThreshold
            ? earlyThreshold - checkOutMins
            : 0;
        await prisma.attendanceRecord.update({
          where: { id: existing.id },
          data: { checkOutTime: checkTime, earlyExitMinutes },
        });
      }
    }
    return;
  }

  if (person.personType === BiometricPersonType.TEACHER) {
    const lateThreshold = parseTimeToMinutes(timeline.teacherLateAfter);
    const checkInMins = parseTimeToMinutes(checkTime);
    const isLate = lateThreshold != null && checkInMins != null && checkInMins > lateThreshold;
    const lateMinutes = isLate && checkInMins != null && lateThreshold != null ? checkInMins - lateThreshold : 0;

    if (eventType === BiometricAttendanceEventType.CHECK_IN) {
      await prisma.teacherAttendanceDailyRecord.upsert({
        where: { teacherProfileId_recordDate: { teacherProfileId: person.personId, recordDate: today } },
        create: {
          institutionId,
          teacherProfileId: person.personId,
          academicYear: person.academicYear,
          recordDate: today,
          status: TeacherAttendanceStatus.PRESENT,
          checkInTime: checkTime,
          lateMinutes,
          source: 'BIOMETRIC',
          markedAt: new Date(),
          teacherRemarks: 'Marked via biometric/RFID',
        },
        update: { status: TeacherAttendanceStatus.PRESENT, checkInTime: checkTime, lateMinutes, source: 'BIOMETRIC' },
      });
    } else {
      const existing = await prisma.teacherAttendanceDailyRecord.findFirst({
        where: { teacherProfileId: person.personId, recordDate: today },
      });
      const earlyThreshold = parseTimeToMinutes(timeline.teacherEarlyExitBefore);
      const checkOutMins = parseTimeToMinutes(checkTime);
      const earlyExitMinutes =
        earlyThreshold != null && checkOutMins != null && checkOutMins < earlyThreshold
          ? earlyThreshold - checkOutMins
          : 0;
      if (existing) {
        await prisma.teacherAttendanceDailyRecord.update({
          where: { id: existing.id },
          data: { checkOutTime: checkTime, earlyExitMinutes },
        });
      }
    }
    return;
  }

  if (person.personType === BiometricPersonType.STAFF) {
    const lateThreshold = parseTimeToMinutes(timeline.staffLateAfter);
    const checkInMins = parseTimeToMinutes(checkTime);
    const isLate = lateThreshold != null && checkInMins != null && checkInMins > lateThreshold;
    const lateMinutes = isLate && checkInMins != null && lateThreshold != null ? checkInMins - lateThreshold : 0;

    if (eventType === BiometricAttendanceEventType.CHECK_IN) {
      await prisma.staffAttendanceDailyRecord.upsert({
        where: { staffProfileId_recordDate: { staffProfileId: person.personId, recordDate: today } },
        create: {
          institutionId,
          staffProfileId: person.personId,
          academicYear: person.academicYear,
          recordDate: today,
          status: StaffAttendanceStatus.PRESENT,
          checkInTime: checkTime,
          lateMinutes,
          source: 'BIOMETRIC',
          markedAt: new Date(),
          staffRemarks: 'Marked via biometric/RFID',
        },
        update: { status: StaffAttendanceStatus.PRESENT, checkInTime: checkTime, lateMinutes, source: 'BIOMETRIC' },
      });
    } else {
      const existing = await prisma.staffAttendanceDailyRecord.findFirst({
        where: { staffProfileId: person.personId, recordDate: today },
      });
      const earlyThreshold = parseTimeToMinutes(timeline.staffEarlyExitBefore);
      const checkOutMins = parseTimeToMinutes(checkTime);
      const earlyExitMinutes =
        earlyThreshold != null && checkOutMins != null && checkOutMins < earlyThreshold
          ? earlyThreshold - checkOutMins
          : 0;
      if (existing) {
        await prisma.staffAttendanceDailyRecord.update({
          where: { id: existing.id },
          data: { checkOutTime: checkTime, earlyExitMinutes },
        });
      }
    }
  }
}

function serializeGeoFence(row: {
  id: string;
  recordId: string;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  isActive: boolean;
  isDefault: boolean;
  address: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    recordId: row.recordId,
    name: row.name,
    description: row.description,
    latitude: row.latitude,
    longitude: row.longitude,
    radiusMeters: row.radiusMeters,
    isActive: row.isActive,
    isDefault: row.isDefault,
    address: row.address,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function serializeDevice(row: {
  id: string;
  recordId: string;
  name: string;
  deviceType: BiometricDeviceType;
  status: BiometricDeviceStatus;
  location: string;
  serialNumber: string;
  geoFenceId: string | null;
  supportsStudents: boolean;
  supportsTeachers: boolean;
  supportsStaff: boolean;
  requiresGeoFence: boolean;
  lastSyncAt: Date | null;
  notes: string;
  geoFence?: { name: string } | null;
}) {
  return {
    id: row.id,
    recordId: row.recordId,
    name: row.name,
    deviceType: row.deviceType,
    deviceTypeLabel: DEVICE_TYPE_LABELS[row.deviceType],
    status: row.status,
    location: row.location,
    serialNumber: row.serialNumber,
    geoFenceId: row.geoFenceId,
    geoFenceName: row.geoFence?.name || '',
    supportsStudents: row.supportsStudents,
    supportsTeachers: row.supportsTeachers,
    supportsStaff: row.supportsStaff,
    requiresGeoFence: row.requiresGeoFence,
    lastSyncAt: row.lastSyncAt?.toISOString() ?? null,
    notes: row.notes,
  };
}

function serializeEnrollment(row: {
  id: string;
  recordId: string;
  personType: BiometricPersonType;
  academicYear: string;
  rfidCardId: string;
  biometricTemplateId: string;
  deviceId: string | null;
  isActive: boolean;
  enrolledBy: string;
  enrolledAt: Date;
  notes: string;
  student?: { firstName: string; lastName: string; admissionNumber: string; className: string; sectionName: string } | null;
  teacherProfile?: { teacherName: string; employeeCode: string; department: string } | null;
  staffProfile?: { staffName: string; employeeCode: string; department: string } | null;
}) {
  let name = '';
  let code = '';
  let classGroup = '';
  if (row.personType === BiometricPersonType.STUDENT && row.student) {
    name = `${row.student.firstName} ${row.student.lastName}`.trim();
    code = row.student.admissionNumber;
    classGroup = formatClassSection(row.student.className, row.student.sectionName);
  } else if (row.personType === BiometricPersonType.TEACHER && row.teacherProfile) {
    name = row.teacherProfile.teacherName;
    code = row.teacherProfile.employeeCode;
    classGroup = row.teacherProfile.department;
  } else if (row.personType === BiometricPersonType.STAFF && row.staffProfile) {
    name = row.staffProfile.staffName;
    code = row.staffProfile.employeeCode;
    classGroup = row.staffProfile.department;
  }

  return {
    id: row.id,
    recordId: row.recordId,
    personType: row.personType,
    personTypeLabel: PERSON_TYPE_LABELS[row.personType],
    personName: name,
    personCode: code,
    classGroup,
    academicYear: row.academicYear,
    rfidCardId: row.rfidCardId,
    biometricTemplateId: row.biometricTemplateId,
    deviceId: row.deviceId,
    isActive: row.isActive,
    enrolledBy: row.enrolledBy,
    enrolledAt: row.enrolledAt.toISOString(),
    notes: row.notes,
  };
}

function serializePunch(row: {
  id: string;
  recordId: string;
  personType: BiometricPersonType;
  personName: string;
  personCode: string;
  classGroup: string;
  deviceType: BiometricDeviceType;
  eventType: BiometricAttendanceEventType;
  punchStatus: BiometricPunchStatus;
  verificationMethod: string;
  rfidCardId: string;
  latitude: number | null;
  longitude: number | null;
  distanceMeters: number | null;
  withinGeoFence: boolean;
  geoFenceName: string;
  remarks: string;
  punchedAt: Date;
}) {
  return {
    id: row.id,
    recordId: row.recordId,
    personType: row.personType,
    personTypeLabel: PERSON_TYPE_LABELS[row.personType],
    personName: row.personName,
    personCode: row.personCode,
    classGroup: row.classGroup,
    deviceType: row.deviceType,
    deviceTypeLabel: DEVICE_TYPE_LABELS[row.deviceType],
    eventType: row.eventType,
    eventTypeLabel: row.eventType === BiometricAttendanceEventType.CHECK_IN ? 'Check In' : 'Check Out',
    punchStatus: row.punchStatus,
    punchStatusLabel: PUNCH_STATUS_LABELS[row.punchStatus],
    verificationMethod: row.verificationMethod,
    rfidCardId: row.rfidCardId,
    latitude: row.latitude,
    longitude: row.longitude,
    distanceMeters: row.distanceMeters,
    withinGeoFence: row.withinGeoFence,
    geoFenceName: row.geoFenceName,
    remarks: row.remarks,
    punchedAt: row.punchedAt.toISOString(),
  };
}

export async function getBiometricDevicesMeta(institutionId: string, academicYear?: string) {
  const filters = await getInstitutionFilterMeta(institutionId);
  const year = academicYear || filters.defaultAcademicYear;

  const [students, teachers, staff, geoFences, devices, enrollments] = await Promise.all([
    prisma.student.count({ where: { institutionId, academicYear: year, status: StudentStatus.ACTIVE } }),
    prisma.teacherAttendanceProfile.count({ where: { institutionId, academicYear: year, isActive: true } }),
    prisma.staffAttendanceProfile.count({ where: { institutionId, academicYear: year, isActive: true } }),
    prisma.attendanceGeoFence.count({ where: { institutionId, isActive: true } }),
    prisma.biometricDevice.count({ where: { institutionId, status: BiometricDeviceStatus.ACTIVE } }),
    prisma.biometricEnrollment.count({ where: { institutionId, academicYear: year, isActive: true } }),
  ]);

  const todayStart = parseDateOnly();
  const todayEnd = new Date(Date.UTC(todayStart.getUTCFullYear(), todayStart.getUTCMonth(), todayStart.getUTCDate(), 23, 59, 59, 999));
  const todayPunches = await prisma.biometricAttendancePunch.count({
    where: { institutionId, punchedAt: { gte: todayStart, lte: todayEnd } },
  });
  const todayAccepted = await prisma.biometricAttendancePunch.count({
    where: { institutionId, punchedAt: { gte: todayStart, lte: todayEnd }, punchStatus: BiometricPunchStatus.ACCEPTED },
  });

  return {
    defaultAcademicYear: year,
    academicYears: filters.academicYears,
    classes: filters.classes,
    deviceTypes: Object.entries(DEVICE_TYPE_LABELS).map(([id, label]) => ({ id, label })),
    personTypes: Object.entries(PERSON_TYPE_LABELS).map(([id, label]) => ({ id, label })),
    summary: {
      totalStudents: students,
      totalTeachers: teachers,
      totalStaff: staff,
      activeGeoFences: geoFences,
      activeDevices: devices,
      enrollments,
      todayPunches,
      todayAccepted,
    },
    workflowNote: 'Attendance can only be marked within the configured geo-fence area. Supports fingerprint, face recognition, RFID cards, and mobile geo-fence app.',
    students: await prisma.student.findMany({
      where: { institutionId, academicYear: year, status: StudentStatus.ACTIVE },
      select: { id: true, firstName: true, lastName: true, admissionNumber: true, className: true, sectionName: true, rfidTag: true },
      orderBy: { firstName: 'asc' },
      take: 500,
    }).then((rows) =>
      rows.map((s) => ({
        id: s.id,
        name: `${s.firstName} ${s.lastName}`.trim(),
        admissionNumber: s.admissionNumber,
        classGroup: formatClassSection(s.className, s.sectionName),
        rfidTag: s.rfidTag,
      })),
    ),
    teachers: await prisma.teacherAttendanceProfile.findMany({
      where: { institutionId, academicYear: year, isActive: true },
      select: { id: true, teacherName: true, employeeCode: true, department: true },
      orderBy: { teacherName: 'asc' },
    }).then((rows) =>
      rows.map((t) => ({ id: t.id, name: t.teacherName, employeeCode: t.employeeCode, department: t.department })),
    ),
    staff: await prisma.staffAttendanceProfile.findMany({
      where: { institutionId, academicYear: year, isActive: true },
      select: { id: true, staffName: true, employeeCode: true, department: true },
      orderBy: { staffName: 'asc' },
    }).then((rows) =>
      rows.map((s) => ({ id: s.id, name: s.staffName, employeeCode: s.employeeCode, department: s.department })),
    ),
  };
}

export async function listGeoFences(institutionId: string) {
  const rows = await prisma.attendanceGeoFence.findMany({
    where: { institutionId },
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
  });
  return { items: rows.map(serializeGeoFence) };
}

export async function createGeoFence(
  institutionId: string,
  input: {
    name: string;
    description?: string;
    latitude: number;
    longitude: number;
    radiusMeters?: number;
    isDefault?: boolean;
    address?: string;
  },
) {
  const recordId = await nextRecordId(institutionId, 'GF', 'geoFence');
  if (input.isDefault) {
    await prisma.attendanceGeoFence.updateMany({
      where: { institutionId },
      data: { isDefault: false },
    });
  }
  const row = await prisma.attendanceGeoFence.create({
    data: {
      institutionId,
      recordId,
      name: input.name.trim(),
      description: input.description?.trim() || '',
      latitude: input.latitude,
      longitude: input.longitude,
      radiusMeters: input.radiusMeters ?? 150,
      isDefault: input.isDefault ?? false,
      address: input.address?.trim() || '',
    },
  });
  return serializeGeoFence(row);
}

export async function updateGeoFence(
  institutionId: string,
  id: string,
  input: Partial<{
    name: string;
    description: string;
    latitude: number;
    longitude: number;
    radiusMeters: number;
    isActive: boolean;
    isDefault: boolean;
    address: string;
  }>,
) {
  const existing = await prisma.attendanceGeoFence.findFirst({ where: { id, institutionId } });
  if (!existing) throw new Error('Geo-fence not found');
  if (input.isDefault) {
    await prisma.attendanceGeoFence.updateMany({ where: { institutionId }, data: { isDefault: false } });
  }
  const row = await prisma.attendanceGeoFence.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.latitude !== undefined ? { latitude: input.latitude } : {}),
      ...(input.longitude !== undefined ? { longitude: input.longitude } : {}),
      ...(input.radiusMeters !== undefined ? { radiusMeters: input.radiusMeters } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
      ...(input.address !== undefined ? { address: input.address } : {}),
    },
  });
  return serializeGeoFence(row);
}

export async function listBiometricDevices(institutionId: string) {
  const rows = await prisma.biometricDevice.findMany({
    where: { institutionId },
    include: { geoFence: { select: { name: true } } },
    orderBy: { name: 'asc' },
  });
  return { items: rows.map(serializeDevice) };
}

export async function createBiometricDevice(
  institutionId: string,
  input: {
    name: string;
    deviceType: BiometricDeviceType;
    location?: string;
    serialNumber?: string;
    geoFenceId?: string;
    supportsStudents?: boolean;
    supportsTeachers?: boolean;
    supportsStaff?: boolean;
    requiresGeoFence?: boolean;
    notes?: string;
  },
) {
  const recordId = await nextRecordId(institutionId, 'DEV', 'device');
  const row = await prisma.biometricDevice.create({
    data: {
      institutionId,
      recordId,
      name: input.name.trim(),
      deviceType: input.deviceType,
      location: input.location?.trim() || '',
      serialNumber: input.serialNumber?.trim() || '',
      geoFenceId: input.geoFenceId || null,
      supportsStudents: input.supportsStudents ?? true,
      supportsTeachers: input.supportsTeachers ?? true,
      supportsStaff: input.supportsStaff ?? true,
      requiresGeoFence: input.requiresGeoFence ?? true,
      notes: input.notes?.trim() || '',
    },
    include: { geoFence: { select: { name: true } } },
  });
  return serializeDevice(row);
}

export async function updateBiometricDevice(
  institutionId: string,
  id: string,
  input: Partial<{
    name: string;
    status: BiometricDeviceStatus;
    location: string;
    serialNumber: string;
    geoFenceId: string | null;
    supportsStudents: boolean;
    supportsTeachers: boolean;
    supportsStaff: boolean;
    requiresGeoFence: boolean;
    notes: string;
  }>,
) {
  const existing = await prisma.biometricDevice.findFirst({ where: { id, institutionId } });
  if (!existing) throw new Error('Device not found');
  const row = await prisma.biometricDevice.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.location !== undefined ? { location: input.location } : {}),
      ...(input.serialNumber !== undefined ? { serialNumber: input.serialNumber } : {}),
      ...(input.geoFenceId !== undefined ? { geoFenceId: input.geoFenceId } : {}),
      ...(input.supportsStudents !== undefined ? { supportsStudents: input.supportsStudents } : {}),
      ...(input.supportsTeachers !== undefined ? { supportsTeachers: input.supportsTeachers } : {}),
      ...(input.supportsStaff !== undefined ? { supportsStaff: input.supportsStaff } : {}),
      ...(input.requiresGeoFence !== undefined ? { requiresGeoFence: input.requiresGeoFence } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      lastSyncAt: new Date(),
    },
    include: { geoFence: { select: { name: true } } },
  });
  return serializeDevice(row);
}

export async function listBiometricEnrollments(institutionId: string, academicYear?: string) {
  const year = academicYear || '2025-26';
  const rows = await prisma.biometricEnrollment.findMany({
    where: { institutionId, academicYear: year },
    include: {
      student: { select: { firstName: true, lastName: true, admissionNumber: true, className: true, sectionName: true } },
      teacherProfile: { select: { teacherName: true, employeeCode: true, department: true } },
      staffProfile: { select: { staffName: true, employeeCode: true, department: true } },
    },
    orderBy: { enrolledAt: 'desc' },
    take: 500,
  });
  return { items: rows.map(serializeEnrollment) };
}

export async function createBiometricEnrollment(
  institutionId: string,
  input: {
    personType: BiometricPersonType;
    studentId?: string;
    teacherProfileId?: string;
    staffProfileId?: string;
    academicYear?: string;
    rfidCardId?: string;
    biometricTemplateId?: string;
    deviceId?: string;
    enrolledBy?: string;
    notes?: string;
  },
) {
  const recordId = await nextRecordId(institutionId, 'ENR', 'enrollment');
  const row = await prisma.biometricEnrollment.create({
    data: {
      institutionId,
      recordId,
      personType: input.personType,
      studentId: input.personType === BiometricPersonType.STUDENT ? input.studentId : null,
      teacherProfileId: input.personType === BiometricPersonType.TEACHER ? input.teacherProfileId : null,
      staffProfileId: input.personType === BiometricPersonType.STAFF ? input.staffProfileId : null,
      academicYear: input.academicYear || '2025-26',
      rfidCardId: input.rfidCardId?.trim() || '',
      biometricTemplateId: input.biometricTemplateId?.trim() || '',
      deviceId: input.deviceId || null,
      enrolledBy: input.enrolledBy || 'Admin',
      notes: input.notes?.trim() || '',
    },
    include: {
      student: { select: { firstName: true, lastName: true, admissionNumber: true, className: true, sectionName: true } },
      teacherProfile: { select: { teacherName: true, employeeCode: true, department: true } },
      staffProfile: { select: { staffName: true, employeeCode: true, department: true } },
    },
  });

  if (input.personType === BiometricPersonType.STUDENT && input.studentId && input.rfidCardId) {
    await prisma.student.update({
      where: { id: input.studentId },
      data: { rfidTag: input.rfidCardId.trim() },
    });
  }

  return serializeEnrollment(row);
}

export async function listBiometricPunches(
  institutionId: string,
  opts?: { date?: string; personType?: BiometricPersonType; status?: BiometricPunchStatus; q?: string },
) {
  const where: Prisma.BiometricAttendancePunchWhereInput = { institutionId };

  if (opts?.date) {
    const d = parseDateOnly(opts.date);
    where.punchedAt = {
      gte: d,
      lte: new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999)),
    };
  }
  if (opts?.personType) where.personType = opts.personType;
  if (opts?.status) where.punchStatus = opts.status;

  let rows = await prisma.biometricAttendancePunch.findMany({
    where,
    orderBy: { punchedAt: 'desc' },
    take: 200,
  });

  if (opts?.q) {
    const q = opts.q.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.personName.toLowerCase().includes(q) ||
        r.personCode.toLowerCase().includes(q) ||
        r.rfidCardId.toLowerCase().includes(q),
    );
  }

  const summary = {
    total: rows.length,
    accepted: rows.filter((r) => r.punchStatus === BiometricPunchStatus.ACCEPTED).length,
    rejectedOutsideFence: rows.filter((r) => r.punchStatus === BiometricPunchStatus.REJECTED_OUTSIDE_FENCE).length,
    rejectedNotEnrolled: rows.filter((r) => r.punchStatus === BiometricPunchStatus.REJECTED_NOT_ENROLLED).length,
    students: rows.filter((r) => r.personType === BiometricPersonType.STUDENT).length,
    teachers: rows.filter((r) => r.personType === BiometricPersonType.TEACHER).length,
    staff: rows.filter((r) => r.personType === BiometricPersonType.STAFF).length,
  };

  return { items: rows.map(serializePunch), summary };
}

export async function recordBiometricPunch(
  institutionId: string,
  input: {
    deviceId?: string;
    rfidCardId?: string;
    personType?: BiometricPersonType;
    personId?: string;
    eventType?: BiometricAttendanceEventType;
    verificationMethod?: string;
    latitude?: number;
    longitude?: number;
  },
) {
  const device = input.deviceId
    ? await prisma.biometricDevice.findFirst({ where: { id: input.deviceId, institutionId } })
    : null;

  if (device && device.status !== BiometricDeviceStatus.ACTIVE) {
    const recordId = await nextRecordId(institutionId, 'PCH', 'punch');
    const punch = await prisma.biometricAttendancePunch.create({
      data: {
        institutionId,
        recordId,
        personType: input.personType || BiometricPersonType.STUDENT,
        personId: input.personId || '',
        personName: 'Unknown',
        deviceId: device.id,
        deviceType: device.deviceType,
        eventType: input.eventType || BiometricAttendanceEventType.CHECK_IN,
        punchStatus: BiometricPunchStatus.REJECTED_DEVICE_INACTIVE,
        verificationMethod: input.verificationMethod || 'BIOMETRIC',
        rfidCardId: input.rfidCardId || '',
        latitude: input.latitude,
        longitude: input.longitude,
        remarks: 'Device is not active',
      },
    });
    return serializePunch(punch);
  }

  const enrollment = await findEnrollment(institutionId, {
    rfidCardId: input.rfidCardId,
    personType: input.personType,
    personId: input.personId,
  });

  const deviceType = device?.deviceType || BiometricDeviceType.MOBILE_GEOFENCE;
  const eventType = input.eventType || BiometricAttendanceEventType.CHECK_IN;
  const recordId = await nextRecordId(institutionId, 'PCH', 'punch');

  if (!enrollment) {
    const punch = await prisma.biometricAttendancePunch.create({
      data: {
        institutionId,
        recordId,
        personType: input.personType || BiometricPersonType.STUDENT,
        personId: input.personId || '',
        personName: 'Unknown',
        deviceId: device?.id,
        deviceType,
        eventType,
        punchStatus: BiometricPunchStatus.REJECTED_NOT_ENROLLED,
        verificationMethod: input.verificationMethod || (input.rfidCardId ? 'RFID' : 'BIOMETRIC'),
        rfidCardId: input.rfidCardId || '',
        latitude: input.latitude,
        longitude: input.longitude,
        remarks: 'Person not enrolled for biometric/RFID attendance',
      },
    });
    return serializePunch(punch);
  }

  const person = resolvePersonFromEnrollment(enrollment);
  if (!person) throw new Error('Could not resolve enrolled person');

  const requiresGeoFence = device?.requiresGeoFence ?? true;
  const fence = requiresGeoFence ? await resolveGeoFence(institutionId, device) : null;

  let withinGeoFence = true;
  let distanceMeters: number | null = null;
  let geoFenceId: string | null = null;
  let geoFenceName = '';

  if (fence && requiresGeoFence) {
    const check = checkGeoFence(input.latitude, input.longitude, fence);
    withinGeoFence = check.within;
    distanceMeters = check.distanceMeters;
    geoFenceId = check.geoFenceId;
    geoFenceName = check.geoFenceName;
  }

  if (fence && requiresGeoFence && !withinGeoFence) {
    const punch = await prisma.biometricAttendancePunch.create({
      data: {
        institutionId,
        recordId,
        personType: person.personType,
        personId: person.personId,
        personName: person.personName,
        personCode: person.personCode,
        classGroup: person.classGroup,
        deviceId: device?.id,
        deviceType,
        eventType,
        punchStatus: BiometricPunchStatus.REJECTED_OUTSIDE_FENCE,
        verificationMethod: input.verificationMethod || (input.rfidCardId ? 'RFID' : 'BIOMETRIC'),
        rfidCardId: input.rfidCardId || enrollment.rfidCardId,
        latitude: input.latitude,
        longitude: input.longitude,
        distanceMeters,
        withinGeoFence: false,
        geoFenceId,
        geoFenceName,
        remarks: `Outside restricted area — ${distanceMeters ?? '?'}m from ${geoFenceName} (max ${fence.radiusMeters}m)`,
      },
    });
    return serializePunch(punch);
  }

  const checkTime = formatTimeNow();
  await applyAttendanceFromPunch(institutionId, person, eventType, checkTime);

  const punch = await prisma.biometricAttendancePunch.create({
    data: {
      institutionId,
      recordId,
      personType: person.personType,
      personId: person.personId,
      personName: person.personName,
      personCode: person.personCode,
      classGroup: person.classGroup,
      deviceId: device?.id,
      deviceType,
      eventType,
      punchStatus: BiometricPunchStatus.ACCEPTED,
      verificationMethod: input.verificationMethod || (input.rfidCardId ? 'RFID' : 'BIOMETRIC'),
      rfidCardId: input.rfidCardId || enrollment.rfidCardId,
      latitude: input.latitude,
      longitude: input.longitude,
      distanceMeters,
      withinGeoFence: true,
      geoFenceId,
      geoFenceName,
      remarks: `Attendance marked — ${eventType === BiometricAttendanceEventType.CHECK_IN ? 'Check In' : 'Check Out'} at ${checkTime}`,
    },
  });

  if (device) {
    await prisma.biometricDevice.update({
      where: { id: device.id },
      data: { lastSyncAt: new Date() },
    });
  }

  return serializePunch(punch);
}

export async function seedBiometricDevicesDemo(institutionId: string, academicYear = '2025-26') {
  const existingFences = await prisma.attendanceGeoFence.count({ where: { institutionId } });
  if (existingFences > 0) {
    return { geoFences: existingFences, devices: await prisma.biometricDevice.count({ where: { institutionId } }), enrollments: await prisma.biometricEnrollment.count({ where: { institutionId } }) };
  }

  const mainFence = await createGeoFence(institutionId, {
    name: 'Main Campus',
    description: 'Primary school building and playground — restricted attendance area',
    latitude: 28.6139,
    longitude: 77.209,
    radiusMeters: 200,
    isDefault: true,
    address: 'School Main Gate, Campus Road',
  });

  await createGeoFence(institutionId, {
    name: 'Sports Block',
    description: 'Sports complex geo-fence for PE attendance',
    latitude: 28.6145,
    longitude: 77.2098,
    radiusMeters: 100,
    address: 'Sports Block, East Wing',
  });

  const fingerprint = await createBiometricDevice(institutionId, {
    name: 'Main Gate Fingerprint Scanner',
    deviceType: BiometricDeviceType.FINGERPRINT,
    location: 'Main Entrance',
    serialNumber: 'FP-MAIN-001',
    geoFenceId: mainFence.id,
    supportsStudents: true,
    supportsTeachers: true,
    supportsStaff: true,
  });

  const rfid = await createBiometricDevice(institutionId, {
    name: 'RFID Card Reader — Reception',
    deviceType: BiometricDeviceType.RFID_READER,
    location: 'Reception Desk',
    serialNumber: 'RFID-REC-001',
    geoFenceId: mainFence.id,
  });

  await createBiometricDevice(institutionId, {
    name: 'Mobile Geo-Fence App',
    deviceType: BiometricDeviceType.MOBILE_GEOFENCE,
    location: 'Staff & Teacher Mobile',
    serialNumber: 'APP-GEOFENCE',
    geoFenceId: mainFence.id,
    requiresGeoFence: true,
  });

  await createBiometricDevice(institutionId, {
    name: 'Face Recognition — Admin Block',
    deviceType: BiometricDeviceType.FACE_RECOGNITION,
    location: 'Admin Building',
    serialNumber: 'FACE-ADM-001',
    geoFenceId: mainFence.id,
  });

  const students = await prisma.student.findMany({
    where: { institutionId, academicYear, status: StudentStatus.ACTIVE },
    take: 20,
  });
  const teachers = await prisma.teacherAttendanceProfile.findMany({
    where: { institutionId, academicYear, isActive: true },
    take: 10,
  });
  const staff = await prisma.staffAttendanceProfile.findMany({
    where: { institutionId, academicYear, isActive: true },
    take: 10,
  });

  let enrollCount = 0;
  for (let i = 0; i < students.length; i++) {
    const s = students[i];
    const rfidId = s.rfidTag?.trim() || `RFID-STU-${String(i + 1).padStart(4, '0')}`;
    await createBiometricEnrollment(institutionId, {
      personType: BiometricPersonType.STUDENT,
      studentId: s.id,
      academicYear,
      rfidCardId: rfidId,
      biometricTemplateId: `BIO-STU-${i + 1}`,
      deviceId: i % 2 === 0 ? fingerprint.id : rfid.id,
      enrolledBy: 'Demo Seed',
    });
    enrollCount += 1;
  }

  for (let i = 0; i < teachers.length; i++) {
    const t = teachers[i];
    await createBiometricEnrollment(institutionId, {
      personType: BiometricPersonType.TEACHER,
      teacherProfileId: t.id,
      academicYear,
      rfidCardId: `RFID-TCH-${String(i + 1).padStart(4, '0')}`,
      biometricTemplateId: `BIO-TCH-${i + 1}`,
      deviceId: fingerprint.id,
      enrolledBy: 'Demo Seed',
    });
    enrollCount += 1;
  }

  for (let i = 0; i < staff.length; i++) {
    const s = staff[i];
    await createBiometricEnrollment(institutionId, {
      personType: BiometricPersonType.STAFF,
      staffProfileId: s.id,
      academicYear,
      rfidCardId: `RFID-STF-${String(i + 1).padStart(4, '0')}`,
      biometricTemplateId: `BIO-STF-${i + 1}`,
      deviceId: rfid.id,
      enrolledBy: 'Demo Seed',
    });
    enrollCount += 1;
  }

  const sampleStudent = students[0];
  if (sampleStudent) {
    await recordBiometricPunch(institutionId, {
      deviceId: fingerprint.id,
      rfidCardId: sampleStudent.rfidTag || 'RFID-STU-0001',
      eventType: BiometricAttendanceEventType.CHECK_IN,
      verificationMethod: 'RFID',
      latitude: 28.6139,
      longitude: 77.209,
    });
  }

  return {
    geoFences: 2,
    devices: 4,
    enrollments: enrollCount,
  };
}
