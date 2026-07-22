import {
  ExamSeatingPlanStatus,
  ParentRelationship,
  StudentStatus,
} from '@prisma/client';
import { prisma } from './prisma.js';
import { getInstitutionFilterMeta } from './students.js';
import { dispatchPushNotifications, notifyStaffPush } from './notifications.js';
import { autoRecordCommunication } from './parentCommunications.js';

const STATUS_LABELS: Record<ExamSeatingPlanStatus, string> = {
  DRAFT: 'Draft',
  FINALIZED: 'Finalized',
  EXAM_CALL_ISSUED: 'Exam Call Issued',
  IN_PROGRESS: 'Exam In Progress',
  COMPLETED: 'Completed',
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function formatDate(d: Date) {
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

async function nextPlanRecordId(institutionId: string) {
  const count = await prisma.examSeatingPlan.count({ where: { institutionId } });
  return `SEA-${String(1000 + count + 1)}`;
}

function studentFullName(s: { firstName: string; lastName: string }) {
  return [s.firstName, s.lastName].filter(Boolean).join(' ').trim();
}

function serializeAssignment(a: {
  id: string;
  seriesNumber: string;
  seatNumber: number;
  rollLabel: string;
  className: string;
  sectionName: string;
  studentName: string;
  admissionNumber: string;
  roomId: string;
  studentId: string;
  room?: { roomNumber: string; buildingName: string };
}) {
  return {
    id: a.id,
    studentId: a.studentId,
    seriesNumber: a.seriesNumber,
    seatNumber: a.seatNumber,
    rollLabel: a.rollLabel,
    className: a.className,
    sectionName: a.sectionName,
    classGroup: a.sectionName ? `${a.className} — ${a.sectionName}` : a.className,
    studentName: a.studentName,
    admissionNumber: a.admissionNumber,
    roomId: a.roomId,
    roomNumber: a.room?.roomNumber ?? '',
    buildingName: a.room?.buildingName ?? '',
  };
}

function serializeRoom(r: {
  id: string;
  roomNumber: string;
  buildingName: string;
  capacity: number;
  invigilatorName: string;
  sortOrder: number;
  assignments?: { id: string }[];
  _count?: { assignments: number };
}) {
  const assigned = r._count?.assignments ?? r.assignments?.length ?? 0;
  return {
    id: r.id,
    roomNumber: r.roomNumber,
    buildingName: r.buildingName,
    capacity: r.capacity,
    invigilatorName: r.invigilatorName,
    sortOrder: r.sortOrder,
    assignedCount: assigned,
    vacantSeats: Math.max(0, r.capacity - assigned),
  };
}

function serializePlan(
  plan: {
    id: string;
    recordId: string;
    academicYear: string;
    title: string;
    examDate: Date;
    status: ExamSeatingPlanStatus;
    seriesPrefix: string;
    totalStudents: number;
    totalRooms: number;
    examCallIssuedAt: Date | null;
    examCallIssuedBy: string;
    notificationsSentAt: Date | null;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    rooms?: Parameters<typeof serializeRoom>[0][];
    assignments?: Parameters<typeof serializeAssignment>[0][];
    _count?: { rooms: number; assignments: number };
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
    status: plan.status,
    statusLabel: STATUS_LABELS[plan.status],
    seriesPrefix: plan.seriesPrefix,
    totalStudents: plan.totalStudents,
    totalRooms: plan.totalRooms,
    examCallIssuedAt: plan.examCallIssuedAt?.toISOString() ?? null,
    examCallIssuedBy: plan.examCallIssuedBy,
    notificationsSentAt: plan.notificationsSentAt?.toISOString() ?? null,
    createdBy: plan.createdBy,
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
    canEditRoomOnly: plan.status === ExamSeatingPlanStatus.IN_PROGRESS,
    canIssueExamCall: plan.status === ExamSeatingPlanStatus.FINALIZED,
    canFinalize: plan.status === ExamSeatingPlanStatus.DRAFT,
    canStartExam: plan.status === ExamSeatingPlanStatus.EXAM_CALL_ISSUED,
    roomCount: plan._count?.rooms ?? plan.totalRooms,
    assignmentCount: plan._count?.assignments ?? plan.totalStudents,
    ...(includeDetail && plan.rooms
      ? {
          rooms: plan.rooms.map(serializeRoom),
          assignments: (plan.assignments || []).map(serializeAssignment),
        }
      : {}),
  };
}

export async function getSeatingMeta(institutionId: string) {
  const filters = await getInstitutionFilterMeta(institutionId);
  const classSections = await prisma.academicClassSection.findMany({
    where: { institutionId, isActive: true },
    select: { className: true, sectionName: true, room: true, capacity: true, classTeacher: true },
    orderBy: [{ className: 'asc' }, { sectionName: 'asc' }],
  });

  const roomSuggestions = [...new Map(
    classSections
      .filter((c) => c.room)
      .map((c) => [c.room, { roomNumber: c.room, buildingName: 'Main Block', capacity: c.capacity || 40, invigilatorName: c.classTeacher }]),
  ).values()];

  const activeStudents = await prisma.student.count({
    where: { institutionId, academicYear: filters.defaultAcademicYear, status: StudentStatus.ACTIVE },
  });

  return {
    defaultAcademicYear: filters.defaultAcademicYear,
    academicYears: filters.academicYears,
    classes: filters.classes,
    sectionsByClass: filters.sectionsByClass,
    activeStudentCount: activeStudents,
    suggestedRooms: roomSuggestions.length
      ? roomSuggestions
      : [
          { roomNumber: 'Room 101', buildingName: 'Block A', capacity: 40, invigilatorName: '' },
          { roomNumber: 'Room 102', buildingName: 'Block A', capacity: 40, invigilatorName: '' },
          { roomNumber: 'Room 201', buildingName: 'Block B', capacity: 35, invigilatorName: '' },
        ],
  };
}

export async function listSeatingPlans(institutionId: string, academicYear?: string) {
  const year = academicYear || '2025-26';
  const plans = await prisma.examSeatingPlan.findMany({
    where: { institutionId, academicYear: year },
    orderBy: [{ examDate: 'desc' }, { createdAt: 'desc' }],
    include: { _count: { select: { rooms: true, assignments: true } } },
  });
  return { academicYear: year, plans: plans.map((p) => serializePlan(p)) };
}

export async function getSeatingPlan(institutionId: string, planId: string) {
  const plan = await prisma.examSeatingPlan.findFirst({
    where: { institutionId, id: planId },
    include: {
      rooms: { orderBy: [{ sortOrder: 'asc' }], include: { _count: { select: { assignments: true } } } },
      assignments: {
        orderBy: [{ roomId: 'asc' }, { seatNumber: 'asc' }],
        include: { room: { select: { roomNumber: true, buildingName: true } } },
      },
      notifications: { orderBy: [{ sentAt: 'desc' }], take: 20 },
    },
  });
  if (!plan) throw new Error('Seating plan not found');

  const notifications = await prisma.examSeatingNotification.groupBy({
    by: ['channel', 'recipientType'],
    where: { planId: plan.id },
    _count: { _all: true },
  });

  return {
    plan: serializePlan(plan, true),
    notificationSummary: notifications.map((n) => ({
      channel: n.channel,
      recipientType: n.recipientType,
      count: n._count._all,
    })),
    recentNotifications: plan.notifications.map((n) => ({
      id: n.id,
      channel: n.channel,
      recipientType: n.recipientType,
      recipientName: n.recipientName,
      recipientMobile: n.recipientMobile,
      status: n.status,
      message: n.message.slice(0, 120),
      sentAt: n.sentAt.toISOString(),
    })),
  };
}

export async function createSeatingPlan(
  institutionId: string,
  data: {
    academicYear: string;
    title: string;
    examDate: string;
    seriesPrefix?: string;
    rooms: { roomNumber: string; buildingName?: string; capacity: number; invigilatorName?: string }[];
    createdBy?: string;
  },
) {
  if (!data.rooms.length) throw new Error('At least one room is required');

  const students = await prisma.student.findMany({
    where: { institutionId, academicYear: data.academicYear, status: StudentStatus.ACTIVE },
    orderBy: [{ className: 'asc' }, { sectionName: 'asc' }, { admissionNumber: 'asc' }],
  });
  if (!students.length) throw new Error('No active students found');

  const totalCapacity = data.rooms.reduce((sum, r) => sum + r.capacity, 0);
  if (totalCapacity < students.length) {
    throw new Error(`Total room capacity (${totalCapacity}) is less than active students (${students.length})`);
  }

  const shuffled = shuffle(students);
  const prefix = (data.seriesPrefix || 'SER').toUpperCase().slice(0, 6);
  const recordId = await nextPlanRecordId(institutionId);

  const plan = await prisma.examSeatingPlan.create({
    data: {
      institutionId,
      recordId,
      academicYear: data.academicYear,
      title: data.title.trim(),
      examDate: new Date(data.examDate),
      seriesPrefix: prefix,
      totalStudents: students.length,
      totalRooms: data.rooms.length,
      createdBy: data.createdBy || 'Exam Admin',
      rooms: {
        create: data.rooms.map((r, i) => ({
          institutionId,
          roomNumber: r.roomNumber.trim(),
          buildingName: r.buildingName?.trim() || '',
          capacity: r.capacity,
          invigilatorName: r.invigilatorName?.trim() || '',
          sortOrder: i + 1,
        })),
      },
    },
    include: { rooms: { orderBy: [{ sortOrder: 'asc' }] } },
  });

  const roomList = plan.rooms;
  const assignments: {
    institutionId: string;
    planId: string;
    roomId: string;
    studentId: string;
    seriesNumber: string;
    seatNumber: number;
    rollLabel: string;
    className: string;
    sectionName: string;
    studentName: string;
    admissionNumber: string;
  }[] = [];

  let roomIdx = 0;
  let seatInRoom = 0;

  for (let i = 0; i < shuffled.length; i++) {
    const student = shuffled[i];
    while (roomIdx < roomList.length && seatInRoom >= roomList[roomIdx].capacity) {
      roomIdx++;
      seatInRoom = 0;
    }
    if (roomIdx >= roomList.length) break;

    const room = roomList[roomIdx];
    seatInRoom += 1;

    assignments.push({
      institutionId,
      planId: plan.id,
      roomId: room.id,
      studentId: student.id,
      seriesNumber: `${prefix}-${String(1000 + i + 1).slice(-4)}`,
      seatNumber: seatInRoom,
      rollLabel: `${room.roomNumber}-${String(seatInRoom).padStart(2, '0')}`,
      className: student.className,
      sectionName: student.sectionName,
      studentName: studentFullName(student),
      admissionNumber: student.admissionNumber,
    });
  }

  await prisma.examSeatingAssignment.createMany({ data: assignments });
  return getSeatingPlan(institutionId, plan.id);
}

export async function finalizeSeatingPlan(institutionId: string, planId: string) {
  const plan = await prisma.examSeatingPlan.findFirst({ where: { institutionId, id: planId } });
  if (!plan) throw new Error('Seating plan not found');
  if (plan.status !== ExamSeatingPlanStatus.DRAFT) throw new Error('Only draft plans can be finalized');

  await prisma.examSeatingPlan.update({
    where: { id: plan.id },
    data: { status: ExamSeatingPlanStatus.FINALIZED },
  });
  return getSeatingPlan(institutionId, planId);
}

export async function updateAssignmentRoom(
  institutionId: string,
  planId: string,
  assignmentId: string,
  newRoomId: string,
) {
  const plan = await prisma.examSeatingPlan.findFirst({ where: { institutionId, id: planId } });
  if (!plan) throw new Error('Seating plan not found');

  const allowed: ExamSeatingPlanStatus[] = [
    ExamSeatingPlanStatus.DRAFT,
    ExamSeatingPlanStatus.FINALIZED,
    ExamSeatingPlanStatus.IN_PROGRESS,
  ];
  if (!allowed.includes(plan.status)) throw new Error('Room changes are not allowed in current plan status');
  if (plan.status === ExamSeatingPlanStatus.EXAM_CALL_ISSUED) {
    throw new Error('Start the exam first to allow room-only edits during the exam');
  }

  const assignment = await prisma.examSeatingAssignment.findFirst({
    where: { id: assignmentId, planId, institutionId },
  });
  if (!assignment) throw new Error('Assignment not found');

  const newRoom = await prisma.examSeatingRoom.findFirst({
    where: { id: newRoomId, planId },
    include: { _count: { select: { assignments: true } } },
  });
  if (!newRoom) throw new Error('Target room not found');
  if (newRoom._count.assignments >= newRoom.capacity) {
    throw new Error(`Room ${newRoom.roomNumber} is at full capacity`);
  }

  const nextSeat = newRoom._count.assignments + 1;
  const updated = await prisma.examSeatingAssignment.update({
    where: { id: assignment.id },
    data: {
      roomId: newRoom.id,
      seatNumber: nextSeat,
      rollLabel: `${newRoom.roomNumber}-${String(nextSeat).padStart(2, '0')}`,
    },
    include: { room: { select: { roomNumber: true, buildingName: true } } },
  });

  return {
    assignment: serializeAssignment(updated),
    message: plan.status === ExamSeatingPlanStatus.IN_PROGRESS
      ? `Room updated to ${newRoom.roomNumber} (only room editable during exam)`
      : `Student moved to ${newRoom.roomNumber}`,
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
  await prisma.examSeatingNotification.create({
    data: { institutionId, planId, channel, recipientType, recipientName, recipientMobile, message, status: 'SENT' },
  });
}

async function dispatchExamCallNotifications(
  institutionId: string,
  plan: { id: string; title: string; examDate: Date },
  assignments: {
    studentId: string;
    studentName: string;
    seriesNumber: string;
    rollLabel: string;
    room: { roomNumber: string; buildingName: string };
  }[],
) {
  const dateStr = formatDate(plan.examDate);
  let pushCount = 0;
  let whatsappCount = 0;
  const pushRecipients: { type: 'parent' | 'staff' | 'student'; name: string; mobile?: string; email?: string }[] = [];

  const students = await prisma.student.findMany({
    where: { institutionId, id: { in: [...new Set(assignments.map((a) => a.studentId))] } },
    select: { id: true, firstName: true, lastName: true, fatherName: true, motherName: true, fatherMobile: true, motherMobile: true },
  });
  const studentMap = new Map(students.map((s) => [s.id, s]));
  const assignMap = new Map(assignments.map((a) => [a.studentId, a]));

  for (const student of students) {
    const assign = assignMap.get(student.id);
    if (!assign) continue;

    const roomLabel = assign.room.buildingName
      ? `${assign.room.roomNumber} (${assign.room.buildingName})`
      : assign.room.roomNumber;
    const body = `Exam Call: ${student.firstName} ${student.lastName} — Series ${assign.seriesNumber}, Room ${roomLabel}, Seat ${assign.rollLabel}. Exam: ${plan.title} on ${dateStr}.`;

    if (student.fatherMobile) {
      pushRecipients.push({ type: 'parent', name: student.fatherName || 'Parent', mobile: student.fatherMobile });
      await autoRecordCommunication(institutionId, {
        studentId: student.id,
        parentRelationship: ParentRelationship.FATHER,
        channel: 'WHATSAPP',
        subject: `Exam Call — ${plan.title}`,
        body,
        category: 'exam_seating',
        academicData: { planId: plan.id, channel: 'WHATSAPP', pushType: 'EXAM_CALL', seriesNumber: assign.seriesNumber, roomNumber: assign.room.roomNumber },
      });
      await recordNotification(institutionId, plan.id, 'WHATSAPP', 'parent', student.fatherName || 'Father', student.fatherMobile, body);
      whatsappCount += 1;
    }

    await autoRecordCommunication(institutionId, {
      studentId: student.id,
      parentRelationship: ParentRelationship.FATHER,
      channel: 'APP',
      subject: `Exam Call — ${plan.title}`,
      body,
      category: 'exam_seating',
      academicData: { planId: plan.id, channel: 'PUSH', pushType: 'EXAM_CALL_PARENT' },
    });
    pushCount += 1;
  }

  const classSections = await prisma.academicClassSection.findMany({
    where: { institutionId, isActive: true },
    select: { classTeacher: true, classTeacherPhone: true, classTeacherEmail: true },
  });
  const teachers = new Map<string, { name: string; mobile: string; email: string }>();
  for (const cs of classSections) {
    if (cs.classTeacher) {
      teachers.set(cs.classTeacher, { name: cs.classTeacher, mobile: cs.classTeacherPhone, email: cs.classTeacherEmail });
    }
  }

  for (const teacher of teachers.values()) {
    pushRecipients.push({ type: 'staff', name: teacher.name, mobile: teacher.mobile, email: teacher.email });
    await recordNotification(institutionId, plan.id, 'PUSH', 'teacher', teacher.name, teacher.mobile,
      `Exam seating for ${plan.title} on ${dateStr}. Check invigilation room assignments.`);
    pushCount += 1;
  }

  const staffResult = await notifyStaffPush(
    institutionId,
    `Exam Call — ${plan.title}`,
    `Seating arrangement issued for ${plan.title} on ${dateStr}. ${assignments.length} students assigned.`,
    'Exam Call Issued',
  );
  pushCount += staffResult.sent;

  await dispatchPushNotifications({
    institutionId,
    event: 'Exam Call Issued',
    title: `Exam Call — ${plan.title}`,
    body: `Exam on ${dateStr}. Seating arrangement published on mobile app.`,
    recipients: pushRecipients,
  });

  return { pushCount, whatsappCount, total: pushCount + whatsappCount };
}

export async function issueExamCall(institutionId: string, planId: string, issuedBy: string) {
  const plan = await prisma.examSeatingPlan.findFirst({
    where: { institutionId, id: planId },
    include: { assignments: { include: { room: { select: { roomNumber: true, buildingName: true } } } } },
  });
  if (!plan) throw new Error('Seating plan not found');
  if (plan.status !== ExamSeatingPlanStatus.FINALIZED) {
    throw new Error('Finalize seating plan before issuing exam call');
  }

  const notifications = await dispatchExamCallNotifications(institutionId, plan, plan.assignments);
  const now = new Date();

  await prisma.examSeatingPlan.update({
    where: { id: plan.id },
    data: {
      status: ExamSeatingPlanStatus.EXAM_CALL_ISSUED,
      examCallIssuedAt: now,
      examCallIssuedBy: issuedBy,
      notificationsSentAt: now,
    },
  });

  return {
    plan: (await getSeatingPlan(institutionId, planId)).plan,
    notifications,
    message: `Exam call issued — ${notifications.pushCount} push, ${notifications.whatsappCount} WhatsApp sent`,
  };
}

export async function startExam(institutionId: string, planId: string) {
  const plan = await prisma.examSeatingPlan.findFirst({ where: { institutionId, id: planId } });
  if (!plan) throw new Error('Seating plan not found');
  if (plan.status !== ExamSeatingPlanStatus.EXAM_CALL_ISSUED) {
    throw new Error('Issue exam call before starting the exam');
  }

  await prisma.examSeatingPlan.update({
    where: { id: plan.id },
    data: { status: ExamSeatingPlanStatus.IN_PROGRESS },
  });

  return {
    plan: (await getSeatingPlan(institutionId, planId)).plan,
    message: 'Exam started — only room number can be edited for seating assignments',
  };
}

export async function completeExam(institutionId: string, planId: string) {
  const plan = await prisma.examSeatingPlan.findFirst({ where: { institutionId, id: planId } });
  if (!plan) throw new Error('Seating plan not found');

  await prisma.examSeatingPlan.update({
    where: { id: plan.id },
    data: { status: ExamSeatingPlanStatus.COMPLETED },
  });
  return getSeatingPlan(institutionId, planId);
}

export async function seedSeatingDemo(institutionId: string, academicYear = '2025-26') {
  const existing = await prisma.examSeatingPlan.count({ where: { institutionId, academicYear } });
  if (existing > 0) return { seeded: false, plans: existing };

  const meta = await getSeatingMeta(institutionId);
  const rooms = meta.suggestedRooms.slice(0, 4).map((r) => ({
    roomNumber: r.roomNumber,
    buildingName: r.buildingName,
    capacity: r.capacity,
    invigilatorName: r.invigilatorName || '',
  }));

  const result = await createSeatingPlan(institutionId, {
    academicYear,
    title: 'Unit Test — Seating Arrangement',
    examDate: new Date().toISOString().slice(0, 10),
    seriesPrefix: 'UT',
    rooms: rooms.length ? rooms : [
      { roomNumber: 'Room 101', buildingName: 'Block A', capacity: 40 },
      { roomNumber: 'Room 102', buildingName: 'Block A', capacity: 40 },
    ],
    createdBy: 'System',
  });

  await finalizeSeatingPlan(institutionId, result.plan.id);
  return { seeded: true, planId: result.plan.id };
}
