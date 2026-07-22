import {
  ExamInvigilationDutyStatus,
  ExamInvigilationPlanStatus,
  ExamInvigilatorRole,
  TeacherAttendanceStatus,
} from '@prisma/client';
import { prisma } from './prisma.js';
import { getInstitutionFilterMeta } from './students.js';
import { dispatchPushNotifications, notifyStaffPush } from './notifications.js';

const STATUS_LABELS: Record<ExamInvigilationPlanStatus, string> = {
  DRAFT: 'Draft',
  SCHEDULED: 'Scheduled',
  ROTATED: 'Rotated',
  PUBLISHED: 'Published on Mobile',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
};

const ROLE_LABELS: Record<ExamInvigilatorRole, string> = {
  PRIMARY: 'Primary Invigilator',
  CO_INVIGILATOR: 'Co-Invigilator',
  FLOOR_SUPERVISOR: 'Floor Supervisor',
  RELIEF: 'Relief',
};

type PersonPool = {
  id: string;
  type: 'teacher' | 'staff';
  name: string;
  mobile: string;
  email: string;
  employeeCode: string;
  department: string;
  designation: string;
  dutyKey: string;
};

type RoomArea = {
  roomNumber: string;
  buildingName: string;
  areaLabel: string;
  seatingRoomId?: string;
  shiftStart: string;
  shiftEnd: string;
};

function formatDate(d: Date) {
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function toDateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function parseDateOnly(dateStr: string) {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

async function nextPlanRecordId(institutionId: string) {
  const count = await prisma.examInvigilationPlan.count({ where: { institutionId } });
  return `INV-${String(1000 + count + 1)}`;
}

function serializeDuty(d: {
  id: string;
  personName: string;
  personMobile: string;
  personEmail: string;
  employeeCode: string;
  department: string;
  designation: string;
  role: ExamInvigilatorRole;
  roomNumber: string;
  buildingName: string;
  areaLabel: string;
  teamNumber: number;
  shiftStart: string;
  shiftEnd: string;
  status: ExamInvigilationDutyStatus;
  teacherProfileId: string | null;
  staffProfileId: string | null;
  seatingRoomId: string | null;
  sortOrder: number;
}) {
  return {
    id: d.id,
    personName: d.personName,
    personMobile: d.personMobile,
    personEmail: d.personEmail,
    employeeCode: d.employeeCode,
    department: d.department,
    designation: d.designation,
    role: d.role,
    roleLabel: ROLE_LABELS[d.role],
    roomNumber: d.roomNumber,
    buildingName: d.buildingName,
    areaLabel: d.areaLabel,
    teamNumber: d.teamNumber,
    shiftStart: d.shiftStart,
    shiftEnd: d.shiftEnd,
    status: d.status,
    teacherProfileId: d.teacherProfileId,
    staffProfileId: d.staffProfileId,
    seatingRoomId: d.seatingRoomId,
    sortOrder: d.sortOrder,
  };
}

function serializePlan(
  plan: {
    id: string;
    recordId: string;
    academicYear: string;
    title: string;
    examDate: Date;
    seatingPlanId: string | null;
    status: ExamInvigilationPlanStatus;
    teamSize: number;
    rotationOffset: number;
    autoRotateEnabled: boolean;
    lastRotatedAt: Date | null;
    publishedToMobile: boolean;
    mobilePublishedAt: Date | null;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    duties?: Parameters<typeof serializeDuty>[0][];
    _count?: { duties: number };
  },
  includeDetail = false,
) {
  return {
    id: plan.id,
    recordId: plan.recordId,
    academicYear: plan.academicYear,
    title: plan.title,
    examDate: plan.examDate.toISOString().slice(0, 10),
    examDateDisplay: formatDate(plan.examDate),
    seatingPlanId: plan.seatingPlanId,
    status: plan.status,
    statusLabel: STATUS_LABELS[plan.status],
    teamSize: plan.teamSize,
    rotationOffset: plan.rotationOffset,
    autoRotateEnabled: plan.autoRotateEnabled,
    lastRotatedAt: plan.lastRotatedAt?.toISOString() ?? null,
    publishedToMobile: plan.publishedToMobile,
    mobilePublishedAt: plan.mobilePublishedAt?.toISOString() ?? null,
    createdBy: plan.createdBy,
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
    dutyCount: plan._count?.duties ?? plan.duties?.length ?? 0,
    canRotate: ['DRAFT', 'SCHEDULED', 'ROTATED', 'PUBLISHED'].includes(plan.status),
    canPublish: ['ROTATED', 'SCHEDULED'].includes(plan.status),
    canStart: plan.status === ExamInvigilationPlanStatus.PUBLISHED,
    ...(includeDetail && plan.duties ? { duties: plan.duties.map(serializeDuty) } : {}),
  };
}

async function getRotationState(institutionId: string, academicYear: string) {
  let state = await prisma.examInvigilationRotationState.findUnique({
    where: { institutionId_academicYear: { institutionId, academicYear } },
  });
  if (!state) {
    state = await prisma.examInvigilationRotationState.create({
      data: { institutionId, academicYear, dutyCounts: {} },
    });
  }
  return state;
}

function getDutyCounts(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return raw as Record<string, number>;
}

async function buildPersonPool(institutionId: string, academicYear: string, examDate: Date) {
  const dateKey = toDateKey(examDate);

  const [teachers, staff, teacherLeaves, staffLeaves] = await Promise.all([
    prisma.teacherAttendanceProfile.findMany({
      where: { institutionId, academicYear, isActive: true },
      orderBy: [{ teacherName: 'asc' }],
    }),
    prisma.staffAttendanceProfile.findMany({
      where: { institutionId, academicYear, isActive: true },
      orderBy: [{ staffName: 'asc' }],
    }),
    prisma.teacherLeaveApplication.findMany({
      where: {
        institutionId,
        status: 'APPROVED',
        fromDate: { lte: examDate },
        toDate: { gte: examDate },
      },
      select: { teacherProfileId: true },
    }),
    prisma.staffLeaveApplication.findMany({
      where: {
        institutionId,
        status: 'APPROVED',
        fromDate: { lte: examDate },
        toDate: { gte: examDate },
      },
      select: { staffProfileId: true },
    }),
  ]);

  const absentTeacherIds = new Set(teacherLeaves.map((l) => l.teacherProfileId));
  const absentStaffIds = new Set(staffLeaves.map((l) => l.staffProfileId));

  const absentRecords = await prisma.teacherAttendanceDailyRecord.findMany({
    where: {
      institutionId,
      recordDate: examDate,
      status: {
        in: [
          TeacherAttendanceStatus.PLANNED_LEAVE_ABSENT,
          TeacherAttendanceStatus.MEDICAL_LEAVE_ABSENT,
          TeacherAttendanceStatus.UNPLANNED_ABSENT,
          TeacherAttendanceStatus.UNPLANNED_NOT_INTIMATED,
        ],
      },
    },
    select: { teacherProfileId: true },
  });
  for (const r of absentRecords) absentTeacherIds.add(r.teacherProfileId);

  const pool: PersonPool[] = [];

  for (const t of teachers) {
    if (absentTeacherIds.has(t.id)) continue;
    pool.push({
      id: t.id,
      type: 'teacher',
      name: t.teacherName,
      mobile: t.mobile,
      email: t.email,
      employeeCode: t.employeeCode,
      department: t.department,
      designation: t.designation,
      dutyKey: `teacher:${t.id}`,
    });
  }

  for (const s of staff) {
    if (absentStaffIds.has(s.id)) continue;
    pool.push({
      id: s.id,
      type: 'staff',
      name: s.staffName,
      mobile: s.mobile,
      email: s.email,
      employeeCode: s.employeeCode,
      department: s.department,
      designation: s.designation,
      dutyKey: `staff:${s.id}`,
    });
  }

  return { pool, dateKey };
}

async function resolveRooms(
  institutionId: string,
  examDate: Date,
  seatingPlanId?: string | null,
): Promise<RoomArea[]> {
  if (seatingPlanId) {
    const rooms = await prisma.examSeatingRoom.findMany({
      where: { planId: seatingPlanId },
      orderBy: [{ sortOrder: 'asc' }],
      include: { plan: { select: { examDate: true } } },
    });
    if (rooms.length) {
      const sessions = await prisma.examCalendarSession.findMany({
        where: { institutionId, examDate },
        orderBy: [{ startTime: 'asc' }],
        take: 1,
      });
      const shiftStart = sessions[0]?.startTime || '09:00';
      const shiftEnd = sessions[0]?.endTime || '12:00';
      return rooms.map((r) => ({
        roomNumber: r.roomNumber,
        buildingName: r.buildingName || 'Main Block',
        areaLabel: r.buildingName ? `${r.buildingName} — ${r.roomNumber}` : r.roomNumber,
        seatingRoomId: r.id,
        shiftStart,
        shiftEnd,
      }));
    }
  }

  const seatingPlan = await prisma.examSeatingPlan.findFirst({
    where: { institutionId, examDate },
    include: { rooms: { orderBy: [{ sortOrder: 'asc' }] } },
  });
  if (seatingPlan?.rooms.length) {
    return seatingPlan.rooms.map((r) => ({
      roomNumber: r.roomNumber,
      buildingName: r.buildingName || 'Main Block',
      areaLabel: r.buildingName ? `${r.buildingName} — ${r.roomNumber}` : r.roomNumber,
      seatingRoomId: r.id,
      shiftStart: '09:00',
      shiftEnd: '12:00',
    }));
  }

  const classSections = await prisma.academicClassSection.findMany({
    where: { institutionId, isActive: true, room: { not: '' } },
    select: { room: true, classTeacher: true },
  });
  const uniqueRooms = [...new Map(classSections.map((c) => [c.room, c])).values()];
  if (uniqueRooms.length) {
    return uniqueRooms.map((c) => ({
      roomNumber: c.room,
      buildingName: 'Main Block',
      areaLabel: `Main Block — ${c.room}`,
      shiftStart: '09:00',
      shiftEnd: '12:00',
    }));
  }

  return [
    { roomNumber: 'Room 101', buildingName: 'Block A', areaLabel: 'Block A — Room 101', shiftStart: '09:00', shiftEnd: '12:00' },
    { roomNumber: 'Room 102', buildingName: 'Block A', areaLabel: 'Block A — Room 102', shiftStart: '09:00', shiftEnd: '12:00' },
    { roomNumber: 'Room 201', buildingName: 'Block B', areaLabel: 'Block B — Room 201', shiftStart: '09:00', shiftEnd: '12:00' },
  ];
}

function groupRoomsByArea(rooms: RoomArea[]) {
  const areas = new Map<string, RoomArea[]>();
  for (const room of rooms) {
    const key = room.buildingName || 'Main Block';
    const list = areas.get(key) || [];
    list.push(room);
    areas.set(key, list);
  }
  return [...areas.entries()].map(([buildingName, areaRooms]) => ({
    buildingName,
    areaLabel: buildingName,
    rooms: areaRooms,
  }));
}

function buildTeams(pool: PersonPool[], teamSize: number, dutyCounts: Record<string, number>) {
  const sorted = [...pool].sort((a, b) => {
    const ca = dutyCounts[a.dutyKey] ?? 0;
    const cb = dutyCounts[b.dutyKey] ?? 0;
    if (ca !== cb) return ca - cb;
    return a.name.localeCompare(b.name);
  });

  const teams: PersonPool[][] = [];
  for (let i = 0; i < sorted.length; i += teamSize) {
    teams.push(sorted.slice(i, i + teamSize));
  }
  return teams.filter((t) => t.length > 0);
}

async function applyRotation(
  institutionId: string,
  plan: {
    id: string;
    academicYear: string;
    teamSize: number;
    rotationOffset: number;
    seatingPlanId: string | null;
    examDate: Date;
  },
  incrementOffset = true,
) {
  const { pool } = await buildPersonPool(institutionId, plan.academicYear, plan.examDate);
  if (!pool.length) throw new Error('No available teachers or staff for invigilation');

  const rooms = await resolveRooms(institutionId, plan.examDate, plan.seatingPlanId);
  const areas = groupRoomsByArea(rooms);
  const rotationState = await getRotationState(institutionId, plan.academicYear);
  const dutyCounts = getDutyCounts(rotationState.dutyCounts);
  const teams = buildTeams(pool, plan.teamSize, dutyCounts);

  const offset = plan.rotationOffset;
  const duties: {
    institutionId: string;
    planId: string;
    teacherProfileId?: string;
    staffProfileId?: string;
    personName: string;
    personMobile: string;
    personEmail: string;
    employeeCode: string;
    department: string;
    designation: string;
    role: ExamInvigilatorRole;
    roomNumber: string;
    buildingName: string;
    areaLabel: string;
    seatingRoomId?: string;
    teamNumber: number;
    shiftStart: string;
    shiftEnd: string;
    sortOrder: number;
  }[] = [];

  let sortOrder = 0;
  const updatedCounts = { ...dutyCounts };

  for (let teamIdx = 0; teamIdx < teams.length; teamIdx++) {
    const team = teams[teamIdx];
    const areaIdx = (teamIdx + offset) % areas.length;
    const area = areas[areaIdx];
    const areaRooms = area.rooms;

    for (let memberIdx = 0; memberIdx < team.length; memberIdx++) {
      const person = team[memberIdx];
      const room = areaRooms[memberIdx % areaRooms.length];
      const role = memberIdx === 0 ? ExamInvigilatorRole.PRIMARY : ExamInvigilatorRole.CO_INVIGILATOR;

      duties.push({
        institutionId,
        planId: plan.id,
        ...(person.type === 'teacher' ? { teacherProfileId: person.id } : { staffProfileId: person.id }),
        personName: person.name,
        personMobile: person.mobile,
        personEmail: person.email,
        employeeCode: person.employeeCode,
        department: person.department,
        designation: person.designation,
        role,
        roomNumber: room.roomNumber,
        buildingName: room.buildingName,
        areaLabel: room.areaLabel,
        seatingRoomId: room.seatingRoomId,
        teamNumber: teamIdx + 1,
        shiftStart: room.shiftStart,
        shiftEnd: room.shiftEnd,
        sortOrder: sortOrder++,
      });

      updatedCounts[person.dutyKey] = (updatedCounts[person.dutyKey] ?? 0) + 1;
    }
  }

  const buildings = [...new Set(areas.map((a) => a.buildingName))];
  const supervisors = pool
    .filter((p) => !duties.some((d) => d.personName === p.name))
    .sort((a, b) => (dutyCounts[a.dutyKey] ?? 0) - (dutyCounts[b.dutyKey] ?? 0));

  for (let i = 0; i < buildings.length && i < supervisors.length; i++) {
    const person = supervisors[i];
    const building = buildings[(i + offset) % buildings.length];
    const buildingRooms = rooms.filter((r) => r.buildingName === building);
    const room = buildingRooms[0] || rooms[0];

    duties.push({
      institutionId,
      planId: plan.id,
      ...(person.type === 'teacher' ? { teacherProfileId: person.id } : { staffProfileId: person.id }),
      personName: person.name,
      personMobile: person.mobile,
      personEmail: person.email,
      employeeCode: person.employeeCode,
      department: person.department,
      designation: person.designation,
      role: ExamInvigilatorRole.FLOOR_SUPERVISOR,
      roomNumber: room.roomNumber,
      buildingName: room.buildingName,
      areaLabel: `${building} (Floor Supervisor)`,
      seatingRoomId: room.seatingRoomId,
      teamNumber: teams.length + i + 1,
      shiftStart: room.shiftStart,
      shiftEnd: room.shiftEnd,
      sortOrder: sortOrder++,
    });
    updatedCounts[person.dutyKey] = (updatedCounts[person.dutyKey] ?? 0) + 1;
  }

  await prisma.$transaction([
    prisma.examInvigilationDuty.deleteMany({ where: { planId: plan.id } }),
    prisma.examInvigilationDuty.createMany({ data: duties }),
    prisma.examInvigilationPlan.update({
      where: { id: plan.id },
      data: {
        status: ExamInvigilationPlanStatus.ROTATED,
        lastRotatedAt: new Date(),
        rotationOffset: incrementOffset ? plan.rotationOffset + 1 : plan.rotationOffset,
      },
    }),
    prisma.examInvigilationRotationState.update({
      where: { id: rotationState.id },
      data: { dutyCounts: updatedCounts, updatedAt: new Date() },
    }),
  ]);

  for (const duty of duties) {
    if (duty.seatingRoomId && duty.role === ExamInvigilatorRole.PRIMARY) {
      await prisma.examSeatingRoom.update({
        where: { id: duty.seatingRoomId },
        data: { invigilatorName: duty.personName },
      });
    }
  }

  return duties.length;
}

export async function getInvigilationMeta(institutionId: string) {
  const filters = await getInstitutionFilterMeta(institutionId);
  const academicYear = filters.defaultAcademicYear;

  const [teachers, staff, seatingPlans, examDates] = await Promise.all([
    prisma.teacherAttendanceProfile.findMany({
      where: { institutionId, academicYear, isActive: true },
      orderBy: [{ teacherName: 'asc' }],
      select: {
        id: true, teacherName: true, employeeCode: true, department: true,
        designation: true, mobile: true, email: true,
      },
    }),
    prisma.staffAttendanceProfile.findMany({
      where: { institutionId, academicYear, isActive: true },
      orderBy: [{ staffName: 'asc' }],
      select: {
        id: true, staffName: true, employeeCode: true, department: true,
        designation: true, mobile: true, email: true,
      },
    }),
    prisma.examSeatingPlan.findMany({
      where: { institutionId, academicYear },
      orderBy: [{ examDate: 'desc' }],
      select: { id: true, title: true, examDate: true, recordId: true, status: true },
    }),
    prisma.examCalendarSession.findMany({
      where: { institutionId, academicYear, examDate: { gte: new Date() } },
      select: { examDate: true, seriesName: true },
      distinct: ['examDate'],
      orderBy: [{ examDate: 'asc' }],
      take: 20,
    }),
  ]);

  return {
    defaultAcademicYear: academicYear,
    academicYears: filters.academicYears,
    teachers: teachers.map((t) => ({
      id: t.id,
      type: 'teacher' as const,
      name: t.teacherName,
      employeeCode: t.employeeCode,
      department: t.department,
      designation: t.designation,
      mobile: t.mobile,
      email: t.email,
    })),
    staff: staff.map((s) => ({
      id: s.id,
      type: 'staff' as const,
      name: s.staffName,
      employeeCode: s.employeeCode,
      department: s.department,
      designation: s.designation,
      mobile: s.mobile,
      email: s.email,
    })),
    seatingPlans: seatingPlans.map((p) => ({
      id: p.id,
      recordId: p.recordId,
      title: p.title,
      examDate: p.examDate.toISOString().slice(0, 10),
      status: p.status,
    })),
    upcomingExamDates: examDates.map((e) => ({
      date: e.examDate.toISOString().slice(0, 10),
      label: e.seriesName || formatDate(e.examDate),
    })),
    roles: Object.entries(ROLE_LABELS).map(([id, label]) => ({ id, label })),
    teamSizeDefault: 2,
  };
}

export async function listInvigilationPlans(institutionId: string, academicYear?: string) {
  const year = academicYear || '2025-26';
  const plans = await prisma.examInvigilationPlan.findMany({
    where: { institutionId, academicYear: year },
    orderBy: [{ examDate: 'desc' }, { createdAt: 'desc' }],
    include: { _count: { select: { duties: true } } },
  });
  return { academicYear: year, plans: plans.map((p) => serializePlan(p)) };
}

export async function getInvigilationPlan(institutionId: string, planId: string) {
  const plan = await prisma.examInvigilationPlan.findFirst({
    where: { institutionId, id: planId },
    include: {
      duties: { orderBy: [{ teamNumber: 'asc' }, { sortOrder: 'asc' }] },
      notifications: { orderBy: [{ sentAt: 'desc' }], take: 20 },
    },
  });
  if (!plan) throw new Error('Invigilation plan not found');

  const notificationSummary = await prisma.examInvigilationNotification.groupBy({
    by: ['channel', 'recipientType'],
    where: { planId: plan.id },
    _count: { _all: true },
  });

  const dutiesByRoom = new Map<string, ReturnType<typeof serializeDuty>[]>();
  for (const d of plan.duties) {
    const key = d.roomNumber;
    const list = dutiesByRoom.get(key) || [];
    list.push(serializeDuty(d));
    dutiesByRoom.set(key, list);
  }

  return {
    plan: serializePlan(plan, true),
    dutiesByRoom: [...dutiesByRoom.entries()].map(([roomNumber, duties]) => ({
      roomNumber,
      buildingName: duties[0]?.buildingName || '',
      areaLabel: duties[0]?.areaLabel || roomNumber,
      duties,
    })),
    notificationSummary: notificationSummary.map((n) => ({
      channel: n.channel,
      recipientType: n.recipientType,
      count: n._count._all,
    })),
    recentNotifications: plan.notifications.map((n) => ({
      id: n.id,
      channel: n.channel,
      recipientType: n.recipientType,
      recipientName: n.recipientName,
      status: n.status,
      message: n.message.slice(0, 120),
      sentAt: n.sentAt.toISOString(),
    })),
  };
}

export async function createInvigilationPlan(
  institutionId: string,
  data: {
    academicYear: string;
    title: string;
    examDate: string;
    seatingPlanId?: string;
    teamSize?: number;
    autoRotateEnabled?: boolean;
    createdBy?: string;
  },
) {
  const recordId = await nextPlanRecordId(institutionId);
  const plan = await prisma.examInvigilationPlan.create({
    data: {
      institutionId,
      recordId,
      academicYear: data.academicYear,
      title: data.title.trim(),
      examDate: parseDateOnly(data.examDate),
      seatingPlanId: data.seatingPlanId || null,
      teamSize: data.teamSize || 2,
      autoRotateEnabled: data.autoRotateEnabled !== false,
      status: ExamInvigilationPlanStatus.SCHEDULED,
      createdBy: data.createdBy || 'Exam Admin',
    },
  });

  await applyRotation(institutionId, plan, false);
  return getInvigilationPlan(institutionId, plan.id);
}

export async function rotateInvigilationPlan(institutionId: string, planId: string) {
  const plan = await prisma.examInvigilationPlan.findFirst({ where: { institutionId, id: planId } });
  if (!plan) throw new Error('Invigilation plan not found');

  const count = await applyRotation(institutionId, plan, true);
  return {
    plan: (await getInvigilationPlan(institutionId, planId)).plan,
    message: `Rotation applied — ${count} duty assignments updated`,
  };
}

async function recordNotification(
  institutionId: string,
  planId: string,
  channel: string,
  recipientType: string,
  recipientName: string,
  recipientMobile: string,
  message: string,
) {
  await prisma.examInvigilationNotification.create({
    data: { institutionId, planId, channel, recipientType, recipientName, recipientMobile, message },
  });
}

async function dispatchInvigilationNotifications(
  institutionId: string,
  plan: { id: string; title: string; examDate: Date },
  duties: { personName: string; personMobile: string; personEmail: string; role: ExamInvigilatorRole; roomNumber: string; buildingName: string; areaLabel: string; shiftStart: string; shiftEnd: string }[],
) {
  const dateStr = formatDate(plan.examDate);
  let pushCount = 0;

  const recipients: { type: 'staff'; name: string; mobile?: string; email?: string }[] = [];

  for (const duty of duties) {
    const roleLabel = ROLE_LABELS[duty.role];
    const body = `Invigilation Duty: ${plan.title} on ${dateStr}. Role: ${roleLabel}. Area: ${duty.areaLabel}, Room ${duty.roomNumber}. Shift ${duty.shiftStart}–${duty.shiftEnd}.`;

    recipients.push({ type: 'staff', name: duty.personName, mobile: duty.personMobile, email: duty.personEmail });
    await recordNotification(institutionId, plan.id, 'PUSH', 'teacher', duty.personName, duty.personMobile, body);
    if (duty.personMobile) {
      await recordNotification(institutionId, plan.id, 'WHATSAPP', 'teacher', duty.personName, duty.personMobile, body);
    }
    pushCount += 1;
  }

  await notifyStaffPush(
    institutionId,
    `Invigilation — ${plan.title}`,
    `Duty roster published for ${dateStr}. ${duties.length} assignments on mobile app.`,
    'Invigilation Published',
  );

  await dispatchPushNotifications({
    institutionId,
    event: 'Invigilation Duty',
    title: `Invigilation — ${plan.title}`,
    body: `Your exam duty for ${dateStr} is now on the mobile app.`,
    recipients,
  });

  return { pushCount, whatsappCount: duties.filter((d) => d.personMobile).length, total: pushCount };
}

export async function publishInvigilationToMobile(institutionId: string, planId: string) {
  const plan = await prisma.examInvigilationPlan.findFirst({
    where: { institutionId, id: planId },
    include: { duties: true },
  });
  if (!plan) throw new Error('Invigilation plan not found');
  if (!plan.duties.length) throw new Error('Rotate duties before publishing');

  const notifications = await dispatchInvigilationNotifications(institutionId, plan, plan.duties);
  const now = new Date();

  await prisma.examInvigilationPlan.update({
    where: { id: plan.id },
    data: {
      status: ExamInvigilationPlanStatus.PUBLISHED,
      publishedToMobile: true,
      mobilePublishedAt: now,
    },
  });

  return {
    plan: (await getInvigilationPlan(institutionId, planId)).plan,
    notifications,
    message: `Published to mobile — ${notifications.pushCount} teachers/staff notified`,
  };
}

export async function updateInvigilationDuty(
  institutionId: string,
  planId: string,
  dutyId: string,
  data: { role?: ExamInvigilatorRole; roomNumber?: string; buildingName?: string; status?: ExamInvigilationDutyStatus },
) {
  const plan = await prisma.examInvigilationPlan.findFirst({ where: { institutionId, id: planId } });
  if (!plan) throw new Error('Invigilation plan not found');

  const duty = await prisma.examInvigilationDuty.findFirst({
    where: { id: dutyId, planId, institutionId },
  });
  if (!duty) throw new Error('Duty assignment not found');

  const updated = await prisma.examInvigilationDuty.update({
    where: { id: duty.id },
    data: {
      ...(data.role ? { role: data.role } : {}),
      ...(data.roomNumber ? { roomNumber: data.roomNumber } : {}),
      ...(data.buildingName !== undefined ? { buildingName: data.buildingName } : {}),
      ...(data.status ? { status: data.status } : {}),
    },
  });

  if (data.roomNumber && updated.seatingRoomId && updated.role === ExamInvigilatorRole.PRIMARY) {
    await prisma.examSeatingRoom.update({
      where: { id: updated.seatingRoomId },
      data: { invigilatorName: updated.personName },
    });
  }

  return { duty: serializeDuty(updated), message: 'Duty updated' };
}

export async function startInvigilation(institutionId: string, planId: string) {
  const plan = await prisma.examInvigilationPlan.findFirst({ where: { institutionId, id: planId } });
  if (!plan) throw new Error('Invigilation plan not found');
  if (plan.status !== ExamInvigilationPlanStatus.PUBLISHED) {
    throw new Error('Publish to mobile before starting invigilation');
  }

  await prisma.examInvigilationPlan.update({
    where: { id: plan.id },
    data: { status: ExamInvigilationPlanStatus.IN_PROGRESS },
  });

  return {
    plan: (await getInvigilationPlan(institutionId, planId)).plan,
    message: 'Invigilation started',
  };
}

export async function completeInvigilation(institutionId: string, planId: string) {
  const plan = await prisma.examInvigilationPlan.findFirst({ where: { institutionId, id: planId } });
  if (!plan) throw new Error('Invigilation plan not found');

  await prisma.examInvigilationPlan.update({
    where: { id: plan.id },
    data: { status: ExamInvigilationPlanStatus.COMPLETED },
  });

  return getInvigilationPlan(institutionId, planId);
}

export async function getMobileInvigilationDuties(
  institutionId: string,
  opts: { date?: string; teacherName?: string; staffName?: string },
) {
  const dateFilter = opts.date ? parseDateOnly(opts.date) : new Date();
  const dateKey = toDateKey(dateFilter);

  const plans = await prisma.examInvigilationPlan.findMany({
    where: {
      institutionId,
      examDate: dateFilter,
      publishedToMobile: true,
      status: { in: [ExamInvigilationPlanStatus.PUBLISHED, ExamInvigilationPlanStatus.IN_PROGRESS] },
    },
    include: { duties: { orderBy: [{ teamNumber: 'asc' }, { sortOrder: 'asc' }] } },
  });

  let duties = plans.flatMap((p) =>
    p.duties.map((d) => ({
      planId: p.id,
      planTitle: p.title,
      examDate: dateKey,
      examDateDisplay: formatDate(p.examDate),
      ...serializeDuty(d),
    })),
  );

  const nameFilter = opts.teacherName || opts.staffName;
  if (nameFilter) {
    const q = nameFilter.toLowerCase();
    duties = duties.filter((d) => d.personName.toLowerCase().includes(q));
  }

  return { date: dateKey, duties, total: duties.length };
}

export async function runDailyInvigilationRotation(
  institutionId: string,
  targetDate?: Date,
) {
  const examDate = targetDate || new Date();
  const dateKey = toDateKey(examDate);

  const rotationState = await getRotationState(institutionId, '2025-26');
  if (rotationState.lastRunDate && toDateKey(rotationState.lastRunDate) === dateKey) {
    return { skipped: true, reason: 'Already rotated today', date: dateKey };
  }

  const examSessions = await prisma.examCalendarSession.count({
    where: { institutionId, examDate },
  });
  const seatingPlans = await prisma.examSeatingPlan.count({
    where: { institutionId, examDate },
  });

  if (!examSessions && !seatingPlans) {
    return { skipped: true, reason: 'No exams scheduled for today', date: dateKey };
  }

  let plans = await prisma.examInvigilationPlan.findMany({
    where: {
      institutionId,
      examDate,
      autoRotateEnabled: true,
      status: { not: ExamInvigilationPlanStatus.COMPLETED },
    },
  });

  const results: { planId: string; duties: number; published: boolean }[] = [];

  if (!plans.length) {
    const seatingPlan = await prisma.examSeatingPlan.findFirst({
      where: { institutionId, examDate },
      orderBy: [{ createdAt: 'desc' }],
    });
    const session = await prisma.examCalendarSession.findFirst({
      where: { institutionId, examDate },
    });

    const created = await createInvigilationPlan(institutionId, {
      academicYear: '2025-26',
      title: seatingPlan?.title || session?.seriesName || `Exam Invigilation — ${formatDate(examDate)}`,
      examDate: dateKey,
      seatingPlanId: seatingPlan?.id,
      createdBy: 'Auto Rotation (5:00 AM)',
    });
    const pub = await publishInvigilationToMobile(institutionId, created.plan.id);
    results.push({ planId: created.plan.id, duties: created.plan.dutyCount, published: pub.plan.publishedToMobile });
  } else {
    for (const plan of plans) {
      const dutyCount = await applyRotation(institutionId, plan, true);
      const pub = await publishInvigilationToMobile(institutionId, plan.id);
      results.push({ planId: plan.id, duties: dutyCount, published: pub.plan.publishedToMobile });
    }
  }

  await prisma.examInvigilationRotationState.update({
    where: { id: rotationState.id },
    data: { lastRunDate: examDate, lastRunAt: new Date() },
  });

  return {
    skipped: false,
    date: dateKey,
    plansRotated: results.length,
    results,
    message: `5:00 AM rotation complete — ${results.length} plan(s) rotated and published to mobile`,
  };
}

export async function seedInvigilationDemo(institutionId: string, academicYear = '2025-26') {
  const existing = await prisma.examInvigilationPlan.count({ where: { institutionId, academicYear } });
  if (existing > 0) return { seeded: false, plans: existing };

  const seatingPlan = await prisma.examSeatingPlan.findFirst({
    where: { institutionId, academicYear },
    orderBy: [{ examDate: 'desc' }],
  });

  const examDate = seatingPlan?.examDate.toISOString().slice(0, 10)
    || new Date().toISOString().slice(0, 10);

  const result = await createInvigilationPlan(institutionId, {
    academicYear,
    title: seatingPlan ? `Invigilation — ${seatingPlan.title}` : 'Unit Test — Invigilation',
    examDate,
    seatingPlanId: seatingPlan?.id,
    createdBy: 'System',
  });

  await publishInvigilationToMobile(institutionId, result.plan.id);
  return { seeded: true, planId: result.plan.id };
}
