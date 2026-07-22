import { TeacherAttendanceStatus } from '@prisma/client';
import { prisma } from './prisma.js';
import { dispatchPushNotifications } from './notifications.js';
import { getInstitutionFilterMeta } from './students.js';
import { dayOfWeekFromDate, isSlotActiveOnDate, serializeTimetableSlot } from './timetable.js';
import { formatClassSection } from './students.js';

export type AttendanceByDateFilter = 'present' | 'absent' | 'onLeave' | 'medicalLeave';

const FILTER_STATUS_MAP: Record<AttendanceByDateFilter, TeacherAttendanceStatus[]> = {
  present: [TeacherAttendanceStatus.PRESENT],
  absent: [TeacherAttendanceStatus.UNPLANNED_ABSENT, TeacherAttendanceStatus.UNPLANNED_NOT_INTIMATED],
  onLeave: [TeacherAttendanceStatus.PLANNED_LEAVE_ABSENT],
  medicalLeave: [TeacherAttendanceStatus.MEDICAL_LEAVE_ABSENT],
};

const FILTER_LABELS: Record<AttendanceByDateFilter, string> = {
  present: 'Present',
  absent: 'Absent',
  onLeave: 'On Leave',
  medicalLeave: 'On Medical Leave',
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

function formatDateIso(d: Date) {
  return d.toISOString().slice(0, 10);
}

function pct(count: number, total: number) {
  if (!total) return 0;
  return Math.round((count / total) * 1000) / 10;
}

async function nextSubstituteRecordId(institutionId: string) {
  const count = await prisma.teacherSubstituteAssignment.count({ where: { institutionId } });
  return `SUB-${String(1000 + count + 1)}`;
}

async function buildTeacherContext(
  institutionId: string,
  academicYear: string,
  teacherName: string,
  sessionDate: Date,
) {
  const dayOfWeek = dayOfWeekFromDate(sessionDate);

  const classTeacherSections = await prisma.academicClassSection.findMany({
    where: { institutionId, academicYear, classTeacher: teacherName, isActive: true },
    select: { className: true, sectionName: true, room: true },
  });

  const allocations = await prisma.academicTeacherAllocation.findMany({
    where: { institutionId, academicYear, teacherName },
    select: { className: true, sectionName: true, subjectName: true, department: true },
  });

  const subjectAllocations = await prisma.academicSubjectAllocation.findMany({
    where: { institutionId, academicYear, teacherName },
    select: {
      className: true,
      sectionName: true,
      subject: { select: { subjectName: true } },
    },
  });

  const timetableRows = await prisma.academicTimetableSlot.findMany({
    where: {
      institutionId,
      academicYear,
      teacherName: { equals: teacherName, mode: 'insensitive' },
      dayOfWeek,
    },
    orderBy: [{ period: 'asc' }],
  });

  const scheduledPeriods = timetableRows
    .filter((slot) => isSlotActiveOnDate(slot, sessionDate))
    .map(serializeTimetableSlot);

  const subjects = [
    ...new Set([
      ...allocations.map((a) => a.subjectName),
      ...subjectAllocations.map((a) => a.subject.subjectName),
      ...scheduledPeriods.map((p) => p.subjectName),
    ]),
  ].filter(Boolean);

  return {
    classTeacherOf: classTeacherSections.map((s) => ({
      classGroup: formatClassSection(s.className, s.sectionName),
      className: s.className,
      sectionName: s.sectionName,
      room: s.room,
    })),
    subjects,
    scheduledPeriods,
    department: allocations[0]?.department || 'General',
  };
}

export async function getAttendanceByDateMeta(institutionId: string, academicYear?: string) {
  const filters = await getInstitutionFilterMeta(institutionId);
  const year = academicYear || filters.defaultAcademicYear;

  const latest = await prisma.teacherAttendanceDailyRecord.findFirst({
    where: { institutionId, academicYear: year },
    orderBy: { recordDate: 'desc' },
    select: { recordDate: true },
  });

  const availableDates = await prisma.teacherAttendanceDailyRecord.findMany({
    where: { institutionId, academicYear: year },
    select: { recordDate: true },
    distinct: ['recordDate'],
    orderBy: { recordDate: 'desc' },
    take: 60,
  });

  return {
    defaultAcademicYear: year,
    academicYears: filters.academicYears,
    latestDate: latest ? formatDateIso(latest.recordDate) : formatDateIso(new Date()),
    availableDates: availableDates.map((d) => formatDateIso(d.recordDate)),
  };
}

export async function getAttendanceByDateSummary(
  institutionId: string,
  opts: { academicYear?: string; date?: string },
) {
  const filters = await getInstitutionFilterMeta(institutionId);
  const academicYear = opts.academicYear || filters.defaultAcademicYear;

  let sessionDate: Date;
  if (opts.date) {
    sessionDate = parseDateOnly(opts.date);
  } else {
    const latest = await prisma.teacherAttendanceDailyRecord.findFirst({
      where: { institutionId, academicYear },
      orderBy: { recordDate: 'desc' },
      select: { recordDate: true },
    });
    sessionDate = latest?.recordDate || parseDateOnly();
  }

  const teachers = await prisma.teacherAttendanceProfile.findMany({
    where: { institutionId, academicYear, isActive: true },
    orderBy: { teacherName: 'asc' },
  });
  const totalTeachers = teachers.length;

  const records = await prisma.teacherAttendanceDailyRecord.findMany({
    where: { institutionId, academicYear, recordDate: sessionDate },
  });
  const recordMap = new Map(records.map((r) => [r.teacherProfileId, r]));

  const counts = {
    present: 0,
    absent: 0,
    onLeave: 0,
    medicalLeave: 0,
    unmarked: 0,
  };

  for (const t of teachers) {
    const rec = recordMap.get(t.id);
    if (!rec) {
      counts.unmarked += 1;
      continue;
    }
    if (rec.status === TeacherAttendanceStatus.PRESENT) counts.present += 1;
    else if (
      rec.status === TeacherAttendanceStatus.UNPLANNED_ABSENT ||
      rec.status === TeacherAttendanceStatus.UNPLANNED_NOT_INTIMATED
    ) counts.absent += 1;
    else if (rec.status === TeacherAttendanceStatus.PLANNED_LEAVE_ABSENT) counts.onLeave += 1;
    else if (rec.status === TeacherAttendanceStatus.MEDICAL_LEAVE_ABSENT) counts.medicalLeave += 1;
  }

  const tiles = (Object.keys(FILTER_STATUS_MAP) as AttendanceByDateFilter[]).map((key) => {
    const count = counts[key];
    return {
      id: key,
      title: FILTER_LABELS[key],
      count,
      percent: pct(count, totalTeachers),
      totalTeachers,
    };
  });

  return {
    academicYear,
    date: formatDateIso(sessionDate),
    dateLabel: sessionDate.toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
    totalTeachers,
    markedCount: records.length,
    unmarkedCount: counts.unmarked,
    tiles,
    generatedAt: new Date().toISOString(),
  };
}

export async function getAttendanceByDateTeachers(
  institutionId: string,
  opts: { academicYear?: string; date?: string; filter: AttendanceByDateFilter },
) {
  const summary = await getAttendanceByDateSummary(institutionId, opts);
  const sessionDate = parseDateOnly(summary.date);
  const statuses = FILTER_STATUS_MAP[opts.filter];

  const teachers = await prisma.teacherAttendanceProfile.findMany({
    where: { institutionId, academicYear: summary.academicYear, isActive: true },
    orderBy: { teacherName: 'asc' },
  });

  const records = await prisma.teacherAttendanceDailyRecord.findMany({
    where: { institutionId, academicYear: summary.academicYear, recordDate: sessionDate },
  });
  const recordMap = new Map(records.map((r) => [r.teacherProfileId, r]));

  const rows = [];
  for (const t of teachers) {
    const rec = recordMap.get(t.id);
    if (!rec || !statuses.includes(rec.status)) continue;

    const ctx = await buildTeacherContext(institutionId, summary.academicYear, t.teacherName, sessionDate);
    rows.push({
      id: t.id,
      recordId: t.recordId,
      teacherName: t.teacherName,
      employeeCode: t.employeeCode,
      department: ctx.department || t.department,
      mobile: t.mobile,
      email: t.email,
      status: rec.status,
      statusLabel: FILTER_LABELS[opts.filter],
      teacherRemarks: rec.teacherRemarks,
      checkInTime: rec.checkInTime,
      classTeacherOf: ctx.classTeacherOf,
      subjects: ctx.subjects,
      scheduledPeriods: ctx.scheduledPeriods,
      periodCount: ctx.scheduledPeriods.length,
    });
  }

  return {
    ...summary,
    filter: opts.filter,
    filterLabel: FILTER_LABELS[opts.filter],
    teachers: rows,
  };
}

export async function getSubstituteAssignmentBoard(
  institutionId: string,
  opts: { academicYear?: string; date?: string },
) {
  const summary = await getAttendanceByDateSummary(institutionId, opts);
  const sessionDate = parseDateOnly(summary.date);

  const absentStatuses: TeacherAttendanceStatus[] = [
    TeacherAttendanceStatus.PLANNED_LEAVE_ABSENT,
    TeacherAttendanceStatus.MEDICAL_LEAVE_ABSENT,
    TeacherAttendanceStatus.UNPLANNED_ABSENT,
    TeacherAttendanceStatus.UNPLANNED_NOT_INTIMATED,
  ];
  const absentStatusSet = new Set(absentStatuses);

  const teachers = await prisma.teacherAttendanceProfile.findMany({
    where: { institutionId, academicYear: summary.academicYear, isActive: true },
  });
  const records = await prisma.teacherAttendanceDailyRecord.findMany({
    where: { institutionId, academicYear: summary.academicYear, recordDate: sessionDate },
  });
  const recordMap = new Map(records.map((r) => [r.teacherProfileId, r]));

  const presentTeachers = teachers
    .filter((t) => recordMap.get(t.id)?.status === TeacherAttendanceStatus.PRESENT)
    .map((t) => ({
      id: t.id,
      teacherName: t.teacherName,
      employeeCode: t.employeeCode,
      department: t.department,
    }));

  const assignments = await prisma.teacherSubstituteAssignment.findMany({
    where: { institutionId, academicYear: summary.academicYear, sessionDate },
    include: {
      absentTeacherProfile: true,
      substituteTeacherProfile: true,
    },
    orderBy: [{ period: 'asc' }, { createdAt: 'asc' }],
  });

  const absentTeachers = [];
  for (const t of teachers) {
    const rec = recordMap.get(t.id);
    if (!rec || !absentStatusSet.has(rec.status)) continue;
    const ctx = await buildTeacherContext(institutionId, summary.academicYear, t.teacherName, sessionDate);
    const teacherAssignments = assignments.filter((a) => a.absentTeacherProfileId === t.id);
    const assignedSlotIds = new Set(teacherAssignments.map((a) => a.timetableSlotId));

    absentTeachers.push({
      id: t.id,
      teacherName: t.teacherName,
      employeeCode: t.employeeCode,
      status: rec.status,
      statusLabel:
        rec.status === TeacherAttendanceStatus.PLANNED_LEAVE_ABSENT
          ? 'On Leave'
          : rec.status === TeacherAttendanceStatus.MEDICAL_LEAVE_ABSENT
            ? 'Medical Leave'
            : 'Absent',
      teacherRemarks: rec.teacherRemarks,
      classTeacherOf: ctx.classTeacherOf,
      subjects: ctx.subjects,
      scheduledPeriods: ctx.scheduledPeriods.map((p) => ({
        ...p,
        isAssigned: assignedSlotIds.has(p.id),
        assignment: teacherAssignments.find((a) => a.timetableSlotId === p.id) || null,
      })),
      assignments: teacherAssignments.map((a) => ({
        id: a.id,
        recordId: a.recordId,
        substituteTeacherName: a.substituteTeacherProfile.teacherName,
        substituteTeacherId: a.substituteTeacherProfileId,
        classGroup: formatClassSection(a.className, a.sectionName),
        subjectName: a.subjectName,
        periodLabel: a.periodLabel,
        timeRange: `${a.startTime} - ${a.endTime}`,
        notificationSentAt: a.notificationSentAt?.toISOString() ?? null,
      })),
    });
  }

  return {
    ...summary,
    presentTeachers,
    absentTeachers,
    assignments: assignments.map((a) => ({
      id: a.id,
      recordId: a.recordId,
      absentTeacherName: a.absentTeacherProfile.teacherName,
      substituteTeacherName: a.substituteTeacherProfile.teacherName,
      classGroup: formatClassSection(a.className, a.sectionName),
      subjectName: a.subjectName,
      periodLabel: a.periodLabel,
      timeRange: `${a.startTime} - ${a.endTime}`,
      room: a.room,
      notificationSentAt: a.notificationSentAt?.toISOString() ?? null,
    })),
  };
}

export async function assignSubstituteTeacher(
  institutionId: string,
  input: {
    academicYear?: string;
    date: string;
    absentTeacherProfileId: string;
    substituteTeacherProfileId: string;
    timetableSlotIds?: string[];
    notify?: boolean;
  },
) {
  const academicYear = input.academicYear || '2025-26';
  const sessionDate = parseDateOnly(input.date);

  const absent = await prisma.teacherAttendanceProfile.findFirst({
    where: { id: input.absentTeacherProfileId, institutionId },
  });
  const substitute = await prisma.teacherAttendanceProfile.findFirst({
    where: { id: input.substituteTeacherProfileId, institutionId },
  });
  if (!absent || !substitute) throw new Error('Teacher profile not found');

  const dayOfWeek = dayOfWeekFromDate(sessionDate);
  const slots = await prisma.academicTimetableSlot.findMany({
    where: {
      institutionId,
      academicYear,
      teacherName: { equals: absent.teacherName, mode: 'insensitive' },
      dayOfWeek,
      ...(input.timetableSlotIds?.length ? { id: { in: input.timetableSlotIds } } : {}),
    },
    orderBy: { period: 'asc' },
  });

  const activeSlots = slots.filter((s) => isSlotActiveOnDate(s, sessionDate));
  if (!activeSlots.length) throw new Error('No scheduled classes found for this teacher on the selected date');

  const created = [];
  for (const slot of activeSlots) {
    const row = await prisma.teacherSubstituteAssignment.upsert({
      where: {
        institutionId_sessionDate_timetableSlotId_absentTeacherProfileId: {
          institutionId,
          sessionDate,
          timetableSlotId: slot.id,
          absentTeacherProfileId: absent.id,
        },
      },
      create: {
        institutionId,
        recordId: await nextSubstituteRecordId(institutionId),
        academicYear,
        sessionDate,
        absentTeacherProfileId: absent.id,
        substituteTeacherProfileId: substitute.id,
        timetableSlotId: slot.id,
        className: slot.className,
        sectionName: slot.sectionName,
        subjectName: slot.subjectName,
        period: slot.period,
        periodLabel: slot.periodLabel,
        startTime: slot.startTime,
        endTime: slot.endTime,
        room: slot.room,
      },
      update: {
        substituteTeacherProfileId: substitute.id,
        updatedAt: new Date(),
      },
      include: { substituteTeacherProfile: true },
    });
    created.push(row);
  }

  let notificationResult = { sent: 0, event: '', title: '' };
  if (input.notify !== false) {
    const periodList = activeSlots
      .map((s) => `${s.periodLabel} ${s.subjectName} (${formatClassSection(s.className, s.sectionName)})`)
      .join(', ');
    notificationResult = await dispatchPushNotifications({
      institutionId,
      event: 'Substitute Class Assignment',
      title: 'Substitute Class Assignment',
      body: `You have been assigned to cover ${absent.teacherName}'s classes on ${formatDateIso(sessionDate)}: ${periodList}. Please check your mobile app.`,
      recipients: [
        {
          type: 'staff',
          name: substitute.teacherName,
          mobile: substitute.mobile,
          email: substitute.email,
        },
      ],
    });

    await prisma.teacherSubstituteAssignment.updateMany({
      where: { id: { in: created.map((c) => c.id) } },
      data: { notificationSentAt: new Date() },
    });
  }

  return {
    assigned: created.length,
    substituteTeacherName: substitute.teacherName,
    absentTeacherName: absent.teacherName,
    notification: notificationResult,
    assignments: created.map((a) => ({
      id: a.id,
      recordId: a.recordId,
      periodLabel: a.periodLabel,
      subjectName: a.subjectName,
      classGroup: formatClassSection(a.className, a.sectionName),
    })),
  };
}
