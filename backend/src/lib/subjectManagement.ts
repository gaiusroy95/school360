import type { AcademicSubject, AcademicSubjectAllocation, AcademicSyllabusChapter } from '@prisma/client';
import { prisma } from './prisma.js';
import { formatClassSection } from './students.js';
import { nextAcademicRecordId, serializeSubject } from './academicManagement.js';
import { serializeSyllabusChapter } from './curriculumHub.js';

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
  const academicYear = data.academicYear || '2025-26';
  const recordId = await nextAcademicRecordId(institutionId, 'subject');
  const subject = await prisma.academicSubject.create({
    data: {
      institutionId,
      recordId,
      subjectName: data.subjectName,
      subjectCode: data.subjectCode || '',
      subjectType: data.subjectType || 'Core',
      subjectGroup: data.subjectGroup || 'General',
      isElective: data.isElective ?? false,
    },
  });

  const createdOfferings = [];
  for (const t of data.teachers || []) {
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
    createdOfferings.push(allocation);
  }

  return {
    subject: serializeSubject(subject),
    offeringsCreated: createdOfferings.length,
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

  const chapters = await prisma.academicSyllabusChapter.findMany({
    where: {
      institutionId,
      academicYear: row.academicYear,
      className: row.className,
      sectionName: row.sectionName,
      subjectName: row.subject?.subjectName || '',
    },
  });

  return serializeSubjectOffering(row, chapters, row.subject?.subjectName || '');
}

export async function addTeacherToSubject(
  institutionId: string,
  subjectId: string,
  data: TeacherAssignmentInput & { academicYear?: string },
) {
  const subject = await prisma.academicSubject.findFirst({ where: { id: subjectId, institutionId } });
  if (!subject) throw new Error('Subject not found');

  const academicYear = data.academicYear || '2025-26';
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
