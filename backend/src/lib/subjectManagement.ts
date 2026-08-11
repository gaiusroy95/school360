import type { AcademicSubject, AcademicSubjectAllocation, AcademicSyllabusChapter } from '@prisma/client';
import { prisma } from './prisma.js';
import { formatClassSection } from './students.js';
import { nextAcademicRecordId, serializeSubject } from './academicManagement.js';
import { serializeSyllabusChapter } from './curriculumHub.js';
import { validateSubjectPayload, validateTeacherWorkload } from './academicSetupSync.js';
import { listTeachingStaffForAcademic } from './employeeDirectory.js';
import { upsertTeacherAllocationFromSubject } from './teacherSubjectAllocationSync.js';
import { syncTeacherProfilesFromAcademic } from './teacherAttendance.js';

export type TeacherAssignmentInput = {
  teacherName: string;
  teacherEmail?: string;
  teacherPhone?: string;
  className: string;
  sectionName: string;
  courseStartDate?: string;
  courseCompletionDeadline?: string;
  revisionDeadline?: string;
};

export function computeIdealProgress(
  startDate: Date | null | undefined,
  endDate: Date | null | undefined,
  now = new Date(),
): number {
  if (!startDate || !endDate) return 0;
  const startMs = startDate.getTime();
  const endMs = endDate.getTime();
  if (endMs <= startMs) return 100;
  if (now.getTime() <= startMs) return 0;
  if (now.getTime() >= endMs) return 100;
  return Math.round(((now.getTime() - startMs) / (endMs - startMs)) * 100);
}

export function computeCurrentProgress(chapters: { completionPercent: number }[]): number {
  if (chapters.length === 0) return 0;
  const sum = chapters.reduce((a, c) => a + c.completionPercent, 0);
  return Math.round((sum / chapters.length) * 100) / 100;
}

function progressStatus(current: number, ideal: number): 'ahead' | 'on_track' | 'behind' | 'not_started' {
  if (current <= 0 && ideal <= 0) return 'not_started';
  const gap = current - ideal;
  if (gap >= 5) return 'ahead';
  if (gap >= -10) return 'on_track';
  return 'behind';
}

export function serializeSubjectOffering(
  allocation: AcademicSubjectAllocation & { subject?: AcademicSubject | null },
  chapters: AcademicSyllabusChapter[],
  subjectName: string,
) {
  const serializedChapters = chapters.map(serializeSyllabusChapter);
  const currentProgress = computeCurrentProgress(chapters);
  const idealProgress = computeIdealProgress(
    allocation.courseStartDate,
    allocation.courseCompletionDeadline,
  );
  const progressGap = Math.round((currentProgress - idealProgress) * 100) / 100;

  return {
    id: allocation.id,
    recordId: allocation.recordId,
    subjectId: allocation.subjectId,
    subjectName,
    academicYear: allocation.academicYear,
    className: allocation.className,
    sectionName: allocation.sectionName,
    classGroup: formatClassSection(allocation.className, allocation.sectionName),
    teacherName: allocation.teacherName,
    teacherEmail: allocation.teacherEmail,
    teacherPhone: allocation.teacherPhone,
    courseStartDate: allocation.courseStartDate?.toISOString() ?? null,
    courseCompletionDeadline: allocation.courseCompletionDeadline?.toISOString() ?? null,
    revisionDeadline: allocation.revisionDeadline?.toISOString() ?? null,
    currentProgress,
    idealProgress,
    progressGap,
    progressStatus: progressStatus(currentProgress, idealProgress),
    chapterCount: chapters.length,
    syllabusChapters: serializedChapters,
    upcomingRevisions: serializedChapters
      .filter((c) => c.revisionDeadline && new Date(c.revisionDeadline) > new Date())
      .sort((a, b) => new Date(a.revisionDeadline!).getTime() - new Date(b.revisionDeadline!).getTime())
      .slice(0, 5),
  };
}

export async function getSubjectManagementDashboard(institutionId: string, academicYear: string) {
  const [subjects, allocations, chapters] = await Promise.all([
    prisma.academicSubject.findMany({
      where: { institutionId, isActive: true },
      orderBy: { subjectName: 'asc' },
    }),
    prisma.academicSubjectAllocation.findMany({
      where: { institutionId, academicYear },
      include: { subject: true },
      orderBy: [{ className: 'asc' }, { sectionName: 'asc' }],
    }),
    prisma.academicSyllabusChapter.findMany({
      where: { institutionId, academicYear },
      orderBy: [{ className: 'asc' }, { subjectName: 'asc' }, { unitNumber: 'asc' }],
    }),
  ]);

  const chapterKey = (className: string, sectionName: string, subjectName: string) =>
    `${className}|${sectionName}|${subjectName}`;

  const chaptersByKey = new Map<string, AcademicSyllabusChapter[]>();
  for (const ch of chapters) {
    const key = chapterKey(ch.className, ch.sectionName, ch.subjectName);
    const list = chaptersByKey.get(key) || [];
    list.push(ch);
    chaptersByKey.set(key, list);
  }

  const offerings = allocations.map((a) => {
    const subjectName = a.subject?.subjectName || '';
    const key = chapterKey(a.className, a.sectionName, subjectName);
    return serializeSubjectOffering(a, chaptersByKey.get(key) || [], subjectName);
  });

  const subjectMap = new Map<string, ReturnType<typeof serializeSubject> & {
    teachers: string[];
    offerings: typeof offerings;
    avgCurrentProgress: number;
    avgIdealProgress: number;
  }>();

  for (const s of subjects) {
    subjectMap.set(s.id, {
      ...serializeSubject(s),
      teachers: [],
      offerings: [],
      avgCurrentProgress: 0,
      avgIdealProgress: 0,
    });
  }

  for (const o of offerings) {
    const entry = subjectMap.get(o.subjectId);
    if (!entry) continue;
    entry.offerings.push(o);
    if (o.teacherName && !entry.teachers.includes(o.teacherName)) {
      entry.teachers.push(o.teacherName);
    }
  }

  for (const entry of subjectMap.values()) {
    if (entry.offerings.length > 0) {
      entry.avgCurrentProgress = Math.round(
        (entry.offerings.reduce((a, o) => a + o.currentProgress, 0) / entry.offerings.length) * 100,
      ) / 100;
      entry.avgIdealProgress = Math.round(
        (entry.offerings.reduce((a, o) => a + o.idealProgress, 0) / entry.offerings.length) * 100,
      ) / 100;
    }
  }

  const teacherSubjects = new Map<string, Set<string>>();
  for (const o of offerings) {
    if (!o.teacherName) continue;
    const set = teacherSubjects.get(o.teacherName) || new Set();
    set.add(o.subjectName);
    teacherSubjects.set(o.teacherName, set);
  }

  const teachersMultiSubject = [...teacherSubjects.entries()]
    .map(([teacherName, subjectSet]) => ({
      teacherName,
      subjects: [...subjectSet].sort(),
      subjectCount: subjectSet.size,
    }))
    .sort((a, b) => b.subjectCount - a.subjectCount);

  const behindCount = offerings.filter((o) => o.progressStatus === 'behind').length;
  const onTrackCount = offerings.filter((o) => o.progressStatus === 'on_track' || o.progressStatus === 'ahead').length;

  return {
    academicYear,
    subjects: [...subjectMap.values()],
    offerings,
    teachersMultiSubject,
    kpis: {
      totalSubjects: subjects.length,
      totalOfferings: offerings.length,
      teachersAssigned: teacherSubjects.size,
      multiSubjectTeachers: teachersMultiSubject.filter((t) => t.subjectCount > 1).length,
      behindSchedule: behindCount,
      onTrack: onTrackCount,
    },
  };
}

async function enrichTeachersFromHr(
  institutionId: string,
  teachers: TeacherAssignmentInput[],
): Promise<TeacherAssignmentInput[]> {
  if (!teachers.length) return teachers;
  const staff = await listTeachingStaffForAcademic(institutionId);
  const byName = new Map(staff.map((t) => [t.teacherName.trim().toLowerCase(), t]));
  return teachers.map((t) => {
    const hr = byName.get(t.teacherName.trim().toLowerCase());
    if (!hr) return t;
    return {
      ...t,
      teacherEmail: t.teacherEmail?.trim() || hr.email || '',
      teacherPhone: t.teacherPhone?.trim() || hr.mobile || '',
    };
  });
}

export async function createSubjectWithTeachers(
  institutionId: string,
  data: {
    subjectName: string;
    subjectCode?: string;
    subjectType?: string;
    subjectGroup?: string;
    isElective?: boolean;
    academicYear?: string;
    teachers?: TeacherAssignmentInput[];
  },
) {
  const validation = await validateSubjectPayload(institutionId, data);
  if (!validation.valid) {
    throw new Error(validation.errors.join('; '));
  }

  const academicYear = data.academicYear || '2025-26';
  const subjectType = data.subjectType || 'Core';
  const isElective = data.isElective ?? /elective/i.test(subjectType);
  const recordId = await nextAcademicRecordId(institutionId, 'subject');
  const subject = await prisma.academicSubject.create({
    data: {
      institutionId,
      recordId,
      subjectName: data.subjectName,
      subjectCode: data.subjectCode || '',
      subjectType,
      subjectGroup: data.subjectGroup || 'General',
      isElective,
    },
  });

  const teachers = await enrichTeachersFromHr(institutionId, data.teachers || []);
  const createdOfferings = [];
  for (const t of teachers) {
    const existing = await prisma.academicSubjectAllocation.findFirst({
      where: {
        institutionId,
        academicYear,
        subjectId: subject.id,
        className: t.className,
        sectionName: t.sectionName,
      },
    });
    if (existing) continue;

    const allocation = await prisma.academicSubjectAllocation.create({
      data: {
        institutionId,
        recordId: await nextAcademicRecordId(institutionId, 'allocation'),
        subjectId: subject.id,
        academicYear,
        className: t.className,
        sectionName: t.sectionName,
        teacherName: t.teacherName,
        teacherEmail: t.teacherEmail || '',
        teacherPhone: t.teacherPhone || '',
        courseStartDate: t.courseStartDate ? new Date(t.courseStartDate) : null,
        courseCompletionDeadline: t.courseCompletionDeadline ? new Date(t.courseCompletionDeadline) : null,
        revisionDeadline: t.revisionDeadline ? new Date(t.revisionDeadline) : null,
      },
      include: { subject: true },
    });
    if (t.teacherName?.trim()) {
      await upsertTeacherAllocationFromSubject(institutionId, {
        academicYear,
        className: t.className,
        sectionName: t.sectionName,
        subjectName: subject.subjectName,
        teacherName: t.teacherName,
      });
    }
    createdOfferings.push(allocation);
  }

  if (createdOfferings.length > 0) {
    await syncTeacherProfilesFromAcademic(institutionId, academicYear);
  }

  return {
    subject: serializeSubject(subject),
    offeringsCreated: createdOfferings.length,
  };
}

export type SubjectTeacherBulkRow = {
  subjectName: string;
  subjectCode?: string;
  subjectType?: string;
  subjectGroup?: string;
  teacherName: string;
  teacherEmail?: string;
  teacherPhone?: string;
  className: string;
  sectionName: string;
  courseStartDate?: string;
  courseCompletionDeadline?: string;
  revisionDeadline?: string;
};

/** Excel bulk upsert: teacher–subject mapping rows (find/create subject, upsert class allocation). */
export async function bulkUpsertSubjectTeacherMappings(
  institutionId: string,
  academicYear: string,
  rows: SubjectTeacherBulkRow[],
) {
  const staff = await listTeachingStaffForAcademic(institutionId);
  const byName = new Map(staff.map((t) => [t.teacherName.trim().toLowerCase(), t]));

  let subjectsCreated = 0;
  let allocationsCreated = 0;
  let allocationsUpdated = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const excelRow = i + 2;
    try {
      const subjectName = row.subjectName?.trim();
      const teacherName = row.teacherName?.trim();
      const className = row.className?.trim();
      const sectionName = row.sectionName?.trim();
      if (!subjectName || !teacherName || !className || !sectionName) {
        throw new Error('subjectName, teacherName, className and sectionName are required');
      }

      const hr = byName.get(teacherName.toLowerCase());
      const teacherEmail = row.teacherEmail?.trim() || hr?.email || '';
      const teacherPhone = row.teacherPhone?.trim() || hr?.mobile || '';
      const subjectType = row.subjectType?.trim() || 'Core';
      const subjectGroup = row.subjectGroup?.trim() || 'General';
      const subjectCode = row.subjectCode?.trim() || '';

      let subject =
        (subjectCode
          ? await prisma.academicSubject.findFirst({ where: { institutionId, subjectCode } })
          : null)
        || (await prisma.academicSubject.findFirst({
          where: { institutionId, subjectName: { equals: subjectName, mode: 'insensitive' } },
        }));

      if (!subject) {
        const validation = await validateSubjectPayload(institutionId, {
          subjectName,
          subjectCode: subjectCode || undefined,
          subjectType,
        });
        if (!validation.valid) throw new Error(validation.errors.join('; '));

        subject = await prisma.academicSubject.create({
          data: {
            institutionId,
            recordId: await nextAcademicRecordId(institutionId, 'subject'),
            subjectName,
            subjectCode,
            subjectType,
            subjectGroup,
            isElective: /elective/i.test(subjectType),
            isActive: true,
          },
        });
        subjectsCreated += 1;
      }

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
        await prisma.academicSubjectAllocation.update({
          where: { id: existing.id },
          data: {
            teacherName,
            teacherEmail,
            teacherPhone,
            ...(row.courseStartDate ? { courseStartDate: new Date(row.courseStartDate) } : {}),
            ...(row.courseCompletionDeadline
              ? { courseCompletionDeadline: new Date(row.courseCompletionDeadline) }
              : {}),
            ...(row.revisionDeadline ? { revisionDeadline: new Date(row.revisionDeadline) } : {}),
          },
        });
        allocationsUpdated += 1;
      } else {
        await prisma.academicSubjectAllocation.create({
          data: {
            institutionId,
            recordId: await nextAcademicRecordId(institutionId, 'allocation'),
            subjectId: subject.id,
            academicYear,
            className,
            sectionName,
            teacherName,
            teacherEmail,
            teacherPhone,
            courseStartDate: row.courseStartDate ? new Date(row.courseStartDate) : null,
            courseCompletionDeadline: row.courseCompletionDeadline
              ? new Date(row.courseCompletionDeadline)
              : null,
            revisionDeadline: row.revisionDeadline ? new Date(row.revisionDeadline) : null,
          },
        });
        allocationsCreated += 1;
      }

      if (teacherName) {
        await upsertTeacherAllocationFromSubject(
          institutionId,
          {
            academicYear,
            className,
            sectionName,
            subjectName,
            teacherName,
          },
          { skipHomeworkRemap: true },
        );
      }
    } catch (err) {
      errors.push(`Row ${excelRow}: ${err instanceof Error ? err.message : 'Failed'}`);
    }
  }

  if (allocationsCreated + allocationsUpdated > 0) {
    await syncTeacherProfilesFromAcademic(institutionId, academicYear);
  }

  return {
    subjectsCreated,
    allocationsCreated,
    allocationsUpdated,
    errors,
    totalRows: rows.length,
  };
}

export async function updateSubjectOffering(
  institutionId: string,
  allocationId: string,
  data: Partial<TeacherAssignmentInput>,
) {
  const existing = await prisma.academicSubjectAllocation.findFirst({
    where: { id: allocationId, institutionId },
    include: { subject: true },
  });
  if (!existing) throw new Error('Subject offering not found');

  const row = await prisma.academicSubjectAllocation.update({
    where: { id: allocationId },
    data: {
      ...(data.teacherName !== undefined ? { teacherName: data.teacherName } : {}),
      ...(data.teacherEmail !== undefined ? { teacherEmail: data.teacherEmail } : {}),
      ...(data.teacherPhone !== undefined ? { teacherPhone: data.teacherPhone } : {}),
      ...(data.className !== undefined ? { className: data.className } : {}),
      ...(data.sectionName !== undefined ? { sectionName: data.sectionName } : {}),
      ...(data.courseStartDate !== undefined
        ? { courseStartDate: data.courseStartDate ? new Date(data.courseStartDate) : null }
        : {}),
      ...(data.courseCompletionDeadline !== undefined
        ? { courseCompletionDeadline: data.courseCompletionDeadline ? new Date(data.courseCompletionDeadline) : null }
        : {}),
      ...(data.revisionDeadline !== undefined
        ? { revisionDeadline: data.revisionDeadline ? new Date(data.revisionDeadline) : null }
        : {}),
    },
    include: { subject: true },
  });

  const subjectName = row.subject?.subjectName || existing.subject?.subjectName || '';
  const teacherName = (row.teacherName || '').trim();
  if (teacherName && subjectName) {
    await upsertTeacherAllocationFromSubject(institutionId, {
      academicYear: row.academicYear,
      className: row.className,
      sectionName: row.sectionName,
      subjectName,
      teacherName,
    });
    await syncTeacherProfilesFromAcademic(institutionId, row.academicYear);
  }

  const chapters = await prisma.academicSyllabusChapter.findMany({
    where: {
      institutionId,
      academicYear: row.academicYear,
      className: row.className,
      sectionName: row.sectionName,
      subjectName,
    },
  });

  return serializeSubjectOffering(row, chapters, subjectName);
}

export async function addTeacherToSubject(
  institutionId: string,
  subjectId: string,
  data: TeacherAssignmentInput & { academicYear?: string },
) {
  const subject = await prisma.academicSubject.findFirst({ where: { id: subjectId, institutionId } });
  if (!subject) throw new Error('Subject not found');

  const academicYear = data.academicYear || '2025-26';

  if (data.teacherName) {
    const workload = await validateTeacherWorkload(institutionId, academicYear, data.teacherName);
    if (!workload.valid) {
      throw new Error(workload.message || 'Teacher workload limit exceeded');
    }
  }

  const existing = await prisma.academicSubjectAllocation.findFirst({
    where: {
      institutionId,
      academicYear,
      subjectId,
      className: data.className,
      sectionName: data.sectionName,
    },
  });

  if (existing) {
    return updateSubjectOffering(institutionId, existing.id, data);
  }

  const row = await prisma.academicSubjectAllocation.create({
    data: {
      institutionId,
      recordId: await nextAcademicRecordId(institutionId, 'allocation'),
      subjectId,
      academicYear,
      className: data.className,
      sectionName: data.sectionName,
      teacherName: data.teacherName,
      teacherEmail: data.teacherEmail || '',
      teacherPhone: data.teacherPhone || '',
      courseStartDate: data.courseStartDate ? new Date(data.courseStartDate) : null,
      courseCompletionDeadline: data.courseCompletionDeadline ? new Date(data.courseCompletionDeadline) : null,
      revisionDeadline: data.revisionDeadline ? new Date(data.revisionDeadline) : null,
    },
    include: { subject: true },
  });

  if (data.teacherName?.trim()) {
    await upsertTeacherAllocationFromSubject(institutionId, {
      academicYear,
      className: data.className,
      sectionName: data.sectionName,
      subjectName: subject.subjectName,
      teacherName: data.teacherName,
    });
    await syncTeacherProfilesFromAcademic(institutionId, academicYear);
  }

  const chapters = await prisma.academicSyllabusChapter.findMany({
    where: {
      institutionId,
      academicYear,
      className: data.className,
      sectionName: data.sectionName,
      subjectName: subject.subjectName,
    },
  });

  return serializeSubjectOffering(row, chapters, subject.subjectName);
}

export async function bulkSetSyllabusRevisionDeadlines(
  institutionId: string,
  chapterIds: string[],
  revisionDeadline: string,
) {
  const deadline = new Date(revisionDeadline);
  const result = await prisma.academicSyllabusChapter.updateMany({
    where: { institutionId, id: { in: chapterIds } },
    data: { revisionDeadline: deadline },
  });
  return { updated: result.count };
}
