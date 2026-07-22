import type { AcademicPeriodType, AcademicTimetableSlot, Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { formatClassSection } from './students.js';
import { nextAcademicRecordId } from './academicManagement.js';

export const PERIOD_TYPE_LABELS: Record<AcademicPeriodType, string> = {
  THEORY: 'Theory',
  PRACTICAL: 'Practical',
  LAB: 'Lab',
  SPORTS: 'Sports',
  EVENT: 'Event',
};

export const PERIOD_TYPE_COLORS: Record<AcademicPeriodType, string> = {
  THEORY: 'bg-blue-50 border-blue-200 text-blue-800',
  PRACTICAL: 'bg-purple-50 border-purple-200 text-purple-800',
  LAB: 'bg-teal-50 border-teal-200 text-teal-800',
  SPORTS: 'bg-green-50 border-green-200 text-green-800',
  EVENT: 'bg-amber-50 border-amber-200 text-amber-800',
};

export type TimetableSlotInput = {
  academicYear?: string;
  term?: string;
  className: string;
  sectionName: string;
  dayOfWeek: number;
  period: number;
  periodLabel?: string;
  periodType?: AcademicPeriodType;
  startTime?: string;
  endTime?: string;
  subjectName: string;
  teacherName?: string;
  room?: string;
  effectiveFrom?: string | Date | null;
  effectiveTo?: string | Date | null;
  versionLabel?: string;
  notes?: string;
};

export function parseDateInput(val?: string | Date | null): Date | null {
  if (!val) return null;
  const d = val instanceof Date ? val : new Date(val);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function isSlotActiveOnDate(
  slot: { effectiveFrom: Date | null; effectiveTo: Date | null },
  date: Date,
): boolean {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);
  if (slot.effectiveFrom && dayEnd < slot.effectiveFrom) return false;
  if (slot.effectiveTo && dayStart > slot.effectiveTo) return false;
  return true;
}

export function dayOfWeekFromDate(date: Date): number {
  const js = date.getDay();
  return js === 0 ? 7 : js;
}

export function serializeTimetableSlot(row: AcademicTimetableSlot) {
  return {
    id: row.id,
    recordId: row.recordId,
    academicYear: row.academicYear,
    term: row.term,
    className: row.className,
    sectionName: row.sectionName,
    classGroup: formatClassSection(row.className, row.sectionName),
    dayOfWeek: row.dayOfWeek,
    dayLabel: ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][row.dayOfWeek] || `Day ${row.dayOfWeek}`,
    period: row.period,
    periodLabel: row.periodLabel,
    periodType: row.periodType,
    periodTypeLabel: PERIOD_TYPE_LABELS[row.periodType],
    startTime: row.startTime,
    endTime: row.endTime,
    timeRange: `${row.startTime} - ${row.endTime}`,
    subjectName: row.subjectName,
    teacherName: row.teacherName,
    room: row.room,
    effectiveFrom: row.effectiveFrom?.toISOString() ?? null,
    effectiveTo: row.effectiveTo?.toISOString() ?? null,
    versionLabel: row.versionLabel,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    isPublished: Boolean(row.publishedAt),
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export type MobileScheduleSlot = {
  period: string;
  periodNumber: number;
  time: string;
  subject: string;
  class: string;
  teacher: string;
  periodType: string;
  periodTypeLabel: string;
  room: string;
};

export function toMobileScheduleSlot(row: AcademicTimetableSlot): MobileScheduleSlot {
  return {
    period: row.periodLabel,
    periodNumber: row.period,
    time: `${row.startTime} - ${row.endTime}`,
    subject: row.subjectName,
    class: formatClassSection(row.className, row.sectionName),
    teacher: row.teacherName,
    periodType: row.periodType,
    periodTypeLabel: PERIOD_TYPE_LABELS[row.periodType],
    room: row.room,
  };
}

export function buildTimetableWhere(
  institutionId: string,
  opts: {
    academicYear?: string;
    term?: string;
    className?: string;
    sectionName?: string;
    teacherName?: string;
    dayOfWeek?: number;
    periodType?: AcademicPeriodType;
    effectiveDate?: string;
    publishedOnly?: boolean;
  },
): Prisma.AcademicTimetableSlotWhereInput {
  const where: Prisma.AcademicTimetableSlotWhereInput = {
    institutionId,
    ...(opts.academicYear ? { academicYear: opts.academicYear } : {}),
    ...(opts.term ? { term: opts.term } : {}),
    ...(opts.className ? { className: opts.className } : {}),
    ...(opts.sectionName ? { sectionName: opts.sectionName } : {}),
    ...(opts.teacherName ? { teacherName: { equals: opts.teacherName, mode: 'insensitive' } } : {}),
    ...(opts.dayOfWeek ? { dayOfWeek: opts.dayOfWeek } : {}),
    ...(opts.periodType ? { periodType: opts.periodType } : {}),
    ...(opts.publishedOnly ? { publishedAt: { not: null } } : {}),
  };

  if (opts.effectiveDate) {
    const d = new Date(opts.effectiveDate);
    if (!Number.isNaN(d.getTime())) {
      const dayStart = new Date(d);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(d);
      dayEnd.setHours(23, 59, 59, 999);
      where.AND = [
        { OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: dayEnd } }] },
        { OR: [{ effectiveTo: null }, { effectiveTo: { gte: dayStart } }] },
      ];
    }
  }

  return where;
}

export async function listTimetableSlots(
  institutionId: string,
  opts: Parameters<typeof buildTimetableWhere>[1],
) {
  const rows = await prisma.academicTimetableSlot.findMany({
    where: buildTimetableWhere(institutionId, opts),
    orderBy: [{ dayOfWeek: 'asc' }, { period: 'asc' }],
  });
  return rows.map(serializeTimetableSlot);
}

export async function getDailySchedule(
  institutionId: string,
  opts: {
    date: string;
    academicYear?: string;
    audience: 'teacher' | 'parent' | 'principal';
    teacherName?: string;
    studentId?: string;
    className?: string;
    sectionName?: string;
    publishedOnly?: boolean;
  },
) {
  const date = new Date(opts.date);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid date');
  }

  const dayOfWeek = dayOfWeekFromDate(date);
  let className = opts.className;
  let sectionName = opts.sectionName;
  let teacherName = opts.teacherName;

  if (opts.audience === 'parent' && opts.studentId) {
    const student = await prisma.student.findFirst({
      where: { institutionId, id: opts.studentId },
      select: { className: true, sectionName: true },
    });
    if (!student) throw new Error('Student not found');
    className = student.className;
    sectionName = student.sectionName;
  }

  const where = buildTimetableWhere(institutionId, {
    academicYear: opts.academicYear,
    className,
    sectionName,
    teacherName: opts.audience === 'teacher' ? teacherName : undefined,
    dayOfWeek,
    effectiveDate: opts.date,
    publishedOnly: opts.publishedOnly ?? opts.audience !== 'principal',
  });

  const rows = await prisma.academicTimetableSlot.findMany({
    where,
    orderBy: [{ period: 'asc' }],
  });

  const schedule = rows.map(toMobileScheduleSlot);

  return {
    date: opts.date,
    dayOfWeek,
    dayLabel: ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][dayOfWeek],
    audience: opts.audience,
    className: className || null,
    sectionName: sectionName || null,
    teacherName: teacherName || null,
    schedule,
    totalPeriods: schedule.length,
    lastUpdated: rows.reduce((max, r) => (r.updatedAt > max ? r.updatedAt : max), new Date(0)).toISOString(),
  };
}

export async function createTimetableSlotRecord(institutionId: string, data: TimetableSlotInput) {
  const recordId = await nextAcademicRecordId(institutionId, 'timetable');
  const row = await prisma.academicTimetableSlot.create({
    data: {
      institutionId,
      recordId,
      academicYear: data.academicYear || '2025-26',
      term: data.term || 'Term 1',
      className: data.className,
      sectionName: data.sectionName,
      dayOfWeek: data.dayOfWeek,
      period: data.period,
      periodLabel: data.periodLabel || `P${data.period}`,
      periodType: data.periodType || 'THEORY',
      startTime: data.startTime || '08:00',
      endTime: data.endTime || '08:40',
      subjectName: data.subjectName,
      teacherName: data.teacherName || '',
      room: data.room || '',
      effectiveFrom: parseDateInput(data.effectiveFrom),
      effectiveTo: parseDateInput(data.effectiveTo),
      versionLabel: data.versionLabel || '',
      notes: data.notes || '',
    },
  });
  return serializeTimetableSlot(row);
}

export async function updateTimetableSlotRecord(
  institutionId: string,
  id: string,
  data: Partial<TimetableSlotInput> & { publishedAt?: string | null },
) {
  const existing = await prisma.academicTimetableSlot.findFirst({ where: { institutionId, id } });
  if (!existing) return null;

  const row = await prisma.academicTimetableSlot.update({
    where: { id: existing.id },
    data: {
      ...(data.academicYear !== undefined ? { academicYear: data.academicYear } : {}),
      ...(data.term !== undefined ? { term: data.term } : {}),
      ...(data.className !== undefined ? { className: data.className } : {}),
      ...(data.sectionName !== undefined ? { sectionName: data.sectionName } : {}),
      ...(data.dayOfWeek !== undefined ? { dayOfWeek: data.dayOfWeek } : {}),
      ...(data.period !== undefined ? { period: data.period } : {}),
      ...(data.periodLabel !== undefined ? { periodLabel: data.periodLabel } : {}),
      ...(data.periodType !== undefined ? { periodType: data.periodType } : {}),
      ...(data.startTime !== undefined ? { startTime: data.startTime } : {}),
      ...(data.endTime !== undefined ? { endTime: data.endTime } : {}),
      ...(data.subjectName !== undefined ? { subjectName: data.subjectName } : {}),
      ...(data.teacherName !== undefined ? { teacherName: data.teacherName } : {}),
      ...(data.room !== undefined ? { room: data.room } : {}),
      ...(data.effectiveFrom !== undefined ? { effectiveFrom: parseDateInput(data.effectiveFrom) } : {}),
      ...(data.effectiveTo !== undefined ? { effectiveTo: parseDateInput(data.effectiveTo) } : {}),
      ...(data.versionLabel !== undefined ? { versionLabel: data.versionLabel } : {}),
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
      ...(data.publishedAt !== undefined
        ? { publishedAt: data.publishedAt ? new Date(data.publishedAt) : null }
        : {}),
    },
  });
  return serializeTimetableSlot(row);
}

export async function bulkUpsertTimetableSlots(
  institutionId: string,
  data: {
    academicYear: string;
    term?: string;
    className?: string;
    sectionName?: string;
    effectiveFrom?: string | null;
    effectiveTo?: string | null;
    versionLabel?: string;
    replaceExisting?: boolean;
    slots: TimetableSlotInput[];
  },
) {
  const effectiveFrom = parseDateInput(data.effectiveFrom);
  const effectiveTo = parseDateInput(data.effectiveTo);

  if (data.replaceExisting) {
    await prisma.academicTimetableSlot.deleteMany({
      where: {
        institutionId,
        academicYear: data.academicYear,
        ...(data.className ? { className: data.className } : {}),
        ...(data.sectionName ? { sectionName: data.sectionName } : {}),
        ...(effectiveFrom || effectiveTo
          ? {
              AND: [
                ...(effectiveFrom ? [{ OR: [{ effectiveFrom: null }, { effectiveFrom: { gte: effectiveFrom } }] }] : []),
                ...(effectiveTo ? [{ OR: [{ effectiveTo: null }, { effectiveTo: { lte: effectiveTo } }] }] : []),
              ],
            }
          : {}),
      },
    });
  }

  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const slot of data.slots) {
    try {
      const existing = await prisma.academicTimetableSlot.findFirst({
        where: {
          institutionId,
          academicYear: data.academicYear,
          className: slot.className,
          sectionName: slot.sectionName,
          dayOfWeek: slot.dayOfWeek,
          period: slot.period,
          ...(effectiveFrom ? { effectiveFrom } : {}),
          ...(effectiveTo ? { effectiveTo } : {}),
        },
      });

      if (existing) {
        await prisma.academicTimetableSlot.update({
          where: { id: existing.id },
          data: {
            term: slot.term || data.term || existing.term,
            periodLabel: slot.periodLabel || `P${slot.period}`,
            periodType: slot.periodType || 'THEORY',
            startTime: slot.startTime || existing.startTime,
            endTime: slot.endTime || existing.endTime,
            subjectName: slot.subjectName,
            teacherName: slot.teacherName || '',
            room: slot.room || '',
            versionLabel: data.versionLabel || slot.versionLabel || existing.versionLabel,
            notes: slot.notes || '',
            publishedAt: null,
          },
        });
        updated += 1;
      } else {
        await createTimetableSlotRecord(institutionId, {
          ...slot,
          academicYear: data.academicYear,
          term: slot.term || data.term,
          effectiveFrom: slot.effectiveFrom ?? data.effectiveFrom,
          effectiveTo: slot.effectiveTo ?? data.effectiveTo,
          versionLabel: data.versionLabel || slot.versionLabel,
        });
        created += 1;
      }
    } catch (e) {
      errors.push(e instanceof Error ? e.message : 'Unknown error');
    }
  }

  return { created, updated, errors, total: data.slots.length };
}

export async function publishTimetable(
  institutionId: string,
  opts: {
    academicYear: string;
    className?: string;
    sectionName?: string;
    term?: string;
  },
) {
  const now = new Date();
  const result = await prisma.academicTimetableSlot.updateMany({
    where: {
      institutionId,
      academicYear: opts.academicYear,
      ...(opts.className ? { className: opts.className } : {}),
      ...(opts.sectionName ? { sectionName: opts.sectionName } : {}),
      ...(opts.term ? { term: opts.term } : {}),
    },
    data: { publishedAt: now },
  });
  return { published: result.count, publishedAt: now.toISOString() };
}

export function buildWeekGrid(slots: ReturnType<typeof serializeTimetableSlot>[]) {
  const periods = [...new Set(slots.map((s) => s.period))].sort((a, b) => a - b);
  const days = [1, 2, 3, 4, 5, 6];
  const grid: Record<string, ReturnType<typeof serializeTimetableSlot> | null> = {};
  for (const s of slots) {
    grid[`${s.dayOfWeek}-${s.period}`] = s;
  }
  return { periods, days, grid, dayLabels: ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] };
}
