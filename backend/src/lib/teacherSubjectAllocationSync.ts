import { AcademicWorkloadLevel } from '@prisma/client';
import { prisma } from './prisma.js';
import { nextAcademicRecordId } from './academicManagement.js';
import { remapHomeworkTeachersForAllocation } from './homework.js';
import { syncTeacherProfilesFromAcademic } from './teacherAttendance.js';
import { formatClassSection } from './students.js';

export type AssignmentKey = {
  academicYear: string;
  className: string;
  sectionName: string;
  subjectName: string;
  teacherName: string;
};

function norm(s: string) {
  return s.trim();
}

function matchName(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** Ensure a CLASS_SUBJECT roster task exists for this teacher allocation. */
async function ensureRosterTaskForAllocation(
  institutionId: string,
  allocation: {
    id: string;
    academicYear: string;
    teacherName: string;
    department: string;
    className: string;
    sectionName: string;
    subjectName: string;
    periodsPerWeek: number;
    workloadLevel: AcademicWorkloadLevel;
  },
) {
  const exists = await prisma.academicTeacherRosterTask.findFirst({
    where: {
      institutionId,
      academicYear: allocation.academicYear,
      teacherName: allocation.teacherName,
      taskType: 'CLASS_SUBJECT',
      className: allocation.className,
      sectionName: allocation.sectionName,
      subjectName: allocation.subjectName,
    },
  });
  if (exists) {
    if (exists.linkedEntityId !== allocation.id) {
      await prisma.academicTeacherRosterTask.update({
        where: { id: exists.id },
        data: {
          linkedEntityId: allocation.id,
          description: `${allocation.periodsPerWeek} periods/week · Workload: ${allocation.workloadLevel}`,
          department: allocation.department,
        },
      });
    }
    return exists;
  }

  return prisma.academicTeacherRosterTask.create({
    data: {
      institutionId,
      recordId: await nextAcademicRecordId(institutionId, 'teacherRoster'),
      academicYear: allocation.academicYear,
      teacherName: allocation.teacherName,
      department: allocation.department,
      taskType: 'CLASS_SUBJECT',
      title: `Teach ${allocation.subjectName} — ${formatClassSection(allocation.className, allocation.sectionName)}`,
      description: `${allocation.periodsPerWeek} periods/week · Workload: ${allocation.workloadLevel}`,
      className: allocation.className,
      sectionName: allocation.sectionName,
      subjectName: allocation.subjectName,
      linkedEntityId: allocation.id,
      priority: allocation.workloadLevel === 'FULL' ? 'HIGH' : 'MEDIUM',
      status: 'IN_PROGRESS',
      assignedBy: 'System Sync',
    },
  });
}

/** Count weekly periods from Timetable for this teacher + subject + class/section. */
export async function countPeriodsFromTimetable(
  institutionId: string,
  key: AssignmentKey,
): Promise<number> {
  const slots = await prisma.academicTimetableSlot.findMany({
    where: {
      institutionId,
      academicYear: key.academicYear,
      className: key.className,
      sectionName: key.sectionName,
      subjectName: { equals: key.subjectName, mode: 'insensitive' },
      teacherName: { equals: key.teacherName, mode: 'insensitive' },
    },
    select: { dayOfWeek: true, period: true },
  });
  // Unique day+period pairs = periods per week
  const uniq = new Set(slots.map((s) => `${s.dayOfWeek}-${s.period}`));
  return uniq.size;
}

async function findTeacherAllocation(institutionId: string, key: AssignmentKey) {
  const rows = await prisma.academicTeacherAllocation.findMany({
    where: {
      institutionId,
      academicYear: key.academicYear,
      className: key.className,
      sectionName: key.sectionName,
    },
  });
  return (
    rows.find(
      (r) =>
        matchName(r.subjectName, key.subjectName) && matchName(r.teacherName, key.teacherName),
    ) || null
  );
}

async function ensureSubject(
  institutionId: string,
  subjectName: string,
  opts?: { subjectCode?: string; subjectType?: string; subjectGroup?: string },
) {
  const name = norm(subjectName);
  let subject =
    (opts?.subjectCode
      ? await prisma.academicSubject.findFirst({
          where: { institutionId, subjectCode: opts.subjectCode },
        })
      : null) ||
    (await prisma.academicSubject.findFirst({
      where: { institutionId, subjectName: { equals: name, mode: 'insensitive' } },
    }));

  if (!subject) {
    subject = await prisma.academicSubject.create({
      data: {
        institutionId,
        recordId: await nextAcademicRecordId(institutionId, 'subject'),
        subjectName: name,
        subjectCode: opts?.subjectCode || '',
        subjectType: opts?.subjectType || 'Core',
        subjectGroup: opts?.subjectGroup || 'General',
        isElective: /elective/i.test(opts?.subjectType || ''),
        isActive: true,
      },
    });
  }
  return subject;
}

/**
 * Subject Management → Teacher Allocation
 * Upserts AcademicTeacherAllocation and refreshes periods from Timetable when available.
 */
export async function upsertTeacherAllocationFromSubject(
  institutionId: string,
  key: AssignmentKey,
  opts?: {
    department?: string;
    periodsPerWeek?: number;
    workloadLevel?: AcademicWorkloadLevel;
    skipHomeworkRemap?: boolean;
  },
) {
  const academicYear = key.academicYear || '2025-26';
  const className = norm(key.className);
  const sectionName = norm(key.sectionName);
  const subjectName = norm(key.subjectName);
  const teacherName = norm(key.teacherName);
  if (!className || !subjectName || !teacherName) return null;

  const payload: AssignmentKey = {
    academicYear,
    className,
    sectionName,
    subjectName,
    teacherName,
  };

  const periodsFromTt = await countPeriodsFromTimetable(institutionId, payload);
  const periodsPerWeek =
    opts?.periodsPerWeek != null && opts.periodsPerWeek > 0
      ? opts.periodsPerWeek
      : periodsFromTt;

  const existing = await findTeacherAllocation(institutionId, payload);
  if (existing) {
    const row = await prisma.academicTeacherAllocation.update({
      where: { id: existing.id },
      data: {
        teacherName,
        subjectName,
        className,
        sectionName,
        ...(opts?.department ? { department: opts.department } : {}),
        ...(periodsPerWeek > 0 || existing.periodsPerWeek === 0
          ? { periodsPerWeek: periodsPerWeek || existing.periodsPerWeek }
          : {}),
        ...(opts?.workloadLevel ? { workloadLevel: opts.workloadLevel } : {}),
      },
    });
    await ensureRosterTaskForAllocation(institutionId, row);
    if (!opts?.skipHomeworkRemap) {
      await remapHomeworkTeachersForAllocation(institutionId, payload);
    }
    return row;
  }

  const row = await prisma.academicTeacherAllocation.create({
    data: {
      institutionId,
      recordId: await nextAcademicRecordId(institutionId, 'teacher'),
      academicYear,
      teacherName,
      department: opts?.department || 'General',
      className,
      sectionName,
      subjectName,
      periodsPerWeek: periodsPerWeek || 0,
      workloadLevel: opts?.workloadLevel || AcademicWorkloadLevel.MEDIUM,
    },
  });

  await ensureRosterTaskForAllocation(institutionId, row);
  if (!opts?.skipHomeworkRemap) {
    await remapHomeworkTeachersForAllocation(institutionId, payload);
  }
  return row;
}

/**
 * Teacher Allocation → Subject Management
 * Ensures AcademicSubject + AcademicSubjectAllocation exist for the same assignment.
 */
export async function upsertSubjectAllocationFromTeacher(
  institutionId: string,
  key: AssignmentKey,
  opts?: {
    teacherEmail?: string;
    teacherPhone?: string;
    subjectCode?: string;
    subjectType?: string;
    subjectGroup?: string;
  },
) {
  const academicYear = key.academicYear || '2025-26';
  const className = norm(key.className);
  const sectionName = norm(key.sectionName);
  const subjectName = norm(key.subjectName);
  const teacherName = norm(key.teacherName);
  if (!className || !subjectName || !teacherName) return null;

  const subject = await ensureSubject(institutionId, subjectName, {
    subjectCode: opts?.subjectCode,
    subjectType: opts?.subjectType,
    subjectGroup: opts?.subjectGroup,
  });

  const existing = await prisma.academicSubjectAllocation.findFirst({
    where: {
      institutionId,
      academicYear,
      subjectId: subject.id,
      className,
      sectionName,
    },
  });

  if (existing) {
    return prisma.academicSubjectAllocation.update({
      where: { id: existing.id },
      data: {
        teacherName,
        ...(opts?.teacherEmail !== undefined ? { teacherEmail: opts.teacherEmail } : {}),
        ...(opts?.teacherPhone !== undefined ? { teacherPhone: opts.teacherPhone } : {}),
      },
      include: { subject: true },
    });
  }

  return prisma.academicSubjectAllocation.create({
    data: {
      institutionId,
      recordId: await nextAcademicRecordId(institutionId, 'allocation'),
      subjectId: subject.id,
      academicYear,
      className,
      sectionName,
      teacherName,
      teacherEmail: opts?.teacherEmail || '',
      teacherPhone: opts?.teacherPhone || '',
    },
    include: { subject: true },
  });
}

/** Soft-upsert both sides from timetable (teacher + subject + class/section). */
export async function syncAssignmentFromTimetableSlot(
  institutionId: string,
  data: {
    academicYear: string;
    className: string;
    sectionName: string;
    subjectName: string;
    teacherName?: string;
  },
) {
  const teacherName = norm(data.teacherName || '');
  const subjectName = norm(data.subjectName || '');
  if (!teacherName || !subjectName || !data.className) return;

  const key: AssignmentKey = {
    academicYear: data.academicYear || '2025-26',
    className: data.className,
    sectionName: data.sectionName || '',
    subjectName,
    teacherName,
  };

  await upsertSubjectAllocationFromTeacher(institutionId, key);
  await upsertTeacherAllocationFromSubject(institutionId, key, { skipHomeworkRemap: true });
}

/**
 * Full reconcile for an academic year:
 * Subject offerings ↔ Teacher allocations, then refresh periods from Timetable.
 */
export async function reconcileSubjectTeacherAllocations(
  institutionId: string,
  academicYear: string,
) {
  const [subjectAllocs, teacherAllocs] = await Promise.all([
    prisma.academicSubjectAllocation.findMany({
      where: { institutionId, academicYear },
      include: { subject: true },
    }),
    prisma.academicTeacherAllocation.findMany({
      where: { institutionId, academicYear },
    }),
  ]);

  let fromSubject = 0;
  let fromTeacher = 0;
  let periodsUpdated = 0;

  for (const a of subjectAllocs) {
    const teacherName = norm(a.teacherName);
    const subjectName = norm(a.subject?.subjectName || '');
    if (!teacherName || !subjectName) continue;
    const before = await findTeacherAllocation(institutionId, {
      academicYear,
      className: a.className,
      sectionName: a.sectionName,
      subjectName,
      teacherName,
    });
    await upsertTeacherAllocationFromSubject(
      institutionId,
      {
        academicYear,
        className: a.className,
        sectionName: a.sectionName,
        subjectName,
        teacherName,
      },
      { skipHomeworkRemap: true },
    );
    if (!before) fromSubject += 1;
  }

  for (const a of teacherAllocs) {
    const teacherName = norm(a.teacherName);
    const subjectName = norm(a.subjectName);
    if (!teacherName || !subjectName) continue;
    const subject = await prisma.academicSubject.findFirst({
      where: { institutionId, subjectName: { equals: subjectName, mode: 'insensitive' } },
    });
    const existingOffering = subject
      ? await prisma.academicSubjectAllocation.findFirst({
          where: {
            institutionId,
            academicYear,
            subjectId: subject.id,
            className: a.className,
            sectionName: a.sectionName,
          },
        })
      : null;
    await upsertSubjectAllocationFromTeacher(institutionId, {
      academicYear,
      className: a.className,
      sectionName: a.sectionName,
      subjectName,
      teacherName,
    });
    if (!existingOffering) fromTeacher += 1;
  }

  // Refresh periods for all teacher allocations from timetable
  const refreshed = await prisma.academicTeacherAllocation.findMany({
    where: { institutionId, academicYear },
  });
  for (const a of refreshed) {
    const periods = await countPeriodsFromTimetable(institutionId, {
      academicYear,
      className: a.className,
      sectionName: a.sectionName,
      subjectName: a.subjectName,
      teacherName: a.teacherName,
    });
    if (periods > 0 && periods !== a.periodsPerWeek) {
      await prisma.academicTeacherAllocation.update({
        where: { id: a.id },
        data: { periodsPerWeek: periods },
      });
      periodsUpdated += 1;
    }
  }

  await syncTeacherProfilesFromAcademic(institutionId, academicYear);

  return {
    subjectOfferings: subjectAllocs.length,
    teacherAllocations: refreshed.length,
    syncedFromSubject: fromSubject,
    syncedFromTeacher: fromTeacher,
    periodsUpdated,
  };
}
