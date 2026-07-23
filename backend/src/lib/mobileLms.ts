import { prisma } from './prisma.js';
import { resolveStudentId } from './mobileScope.js';
import type { MobileAuthUser } from './mobileAuth.js';
import { serializeSyllabusChapter } from './curriculumHub.js';

export type LmsMediaItem = {
  id: string;
  type: 'pdf' | 'video' | 'image' | 'link';
  title: string;
  url: string;
  description?: string;
};

function normalizeMediaItems(raw: unknown): LmsMediaItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, index) => {
      if (!item || typeof item !== 'object') return null;
      const o = item as Record<string, unknown>;
      const type = String(o.type || 'link').toLowerCase();
      const url = String(o.url || '');
      if (!url) return null;
      return {
        id: String(o.id || `media-${index}`),
        type: (['pdf', 'video', 'image', 'link'].includes(type) ? type : 'link') as LmsMediaItem['type'],
        title: String(o.title || `Resource ${index + 1}`),
        url,
        description: o.description ? String(o.description) : undefined,
      };
    })
    .filter(Boolean) as LmsMediaItem[];
}

export async function getMobileLmsContent(
  user: MobileAuthUser,
  opts: { studentId?: string; academicYear?: string; subjectName?: string },
) {
  const studentId = resolveStudentId(user, opts.studentId);
  const student = await prisma.student.findFirst({
    where: { id: studentId, institutionId: user.institutionId },
    select: { className: true, sectionName: true, academicYear: true },
  });
  if (!student) throw new Error('Student not found');

  const academicYear = opts.academicYear || student.academicYear;

  const chapters = await prisma.academicSyllabusChapter.findMany({
    where: {
      institutionId: user.institutionId,
      academicYear,
      className: student.className,
      OR: [{ sectionName: student.sectionName }, { sectionName: '' }],
      ...(opts.subjectName ? { subjectName: opts.subjectName } : {}),
    },
    include: {
      lessonPlans: {
        where: { sharedAt: { not: null } },
        select: {
          id: true,
          title: true,
          objective: true,
          teacherName: true,
          resources: true,
          notes: true,
        },
        orderBy: { plannedDate: 'desc' },
        take: 3,
      },
    },
    orderBy: [{ subjectName: 'asc' }, { unitNumber: 'asc' }],
  });

  return {
    studentId,
    academicYear,
    className: student.className,
    sectionName: student.sectionName,
    chapters: chapters.map((ch) => {
      const base = serializeSyllabusChapter(ch);
      const chapterMedia = normalizeMediaItems(ch.lmsMediaItems);
      const lessonMedia = ch.lessonPlans.flatMap((lp) => {
        const resources = normalizeMediaItems(lp.resources);
        return resources.map((r) => ({
          ...r,
          title: r.title || lp.title,
          description: r.description || lp.objective,
          lessonPlanId: lp.id,
          teacherName: lp.teacherName,
        }));
      });

      return {
        ...base,
        teacherInstructions: ch.teacherInstructions,
        mediaItems: [...chapterMedia, ...lessonMedia],
        lessonPlans: ch.lessonPlans.map((lp) => ({
          id: lp.id,
          title: lp.title,
          objective: lp.objective,
          teacherName: lp.teacherName,
          notes: lp.notes,
          resources: normalizeMediaItems(lp.resources),
        })),
      };
    }),
  };
}
