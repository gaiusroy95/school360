import type { AcademicHomework } from '@prisma/client';
import { prisma } from './prisma.js';
import { formatClassSection } from './students.js';
import { serializeHomework } from './academicManagement.js';

export type HomeworkDashboardRow = {
  date: string;
  className: string;
  sectionName: string;
  classGroup: string;
  subjectName: string;
  teacherName: string;
  assignmentStatus: 'ASSIGNED' | 'NOT_ASSIGNED';
  assignmentStatusLabel: string;
  homeworkId: string | null;
  homework: ReturnType<typeof serializeHomework> | null;
};

function dayBounds(dateStr: string) {
  const start = new Date(dateStr);
  start.setHours(0, 0, 0, 0);
  const end = new Date(dateStr);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function matchHomework(
  hw: AcademicHomework,
  slot: { className: string; sectionName: string; subjectName: string; teacherName: string },
) {
  if (hw.className !== slot.className || hw.sectionName !== slot.sectionName) return false;
  if (hw.subjectName !== slot.subjectName) return false;
  if (slot.teacherName && hw.teacherName && hw.teacherName !== slot.teacherName) return false;
  return true;
}

export async function getHomeworkDashboard(
  institutionId: string,
  opts: { date: string; academicYear?: string; className?: string; sectionName?: string; teacherName?: string },
) {
  const { start, end } = dayBounds(opts.date);

  const allocations = await prisma.academicTeacherAllocation.findMany({
    where: {
      institutionId,
      ...(opts.academicYear ? { academicYear: opts.academicYear } : {}),
      ...(opts.className ? { className: opts.className } : {}),
      ...(opts.sectionName ? { sectionName: opts.sectionName } : {}),
      ...(opts.teacherName ? { teacherName: { contains: opts.teacherName, mode: 'insensitive' } } : {}),
    },
    orderBy: [{ teacherName: 'asc' }, { className: 'asc' }, { subjectName: 'asc' }],
  });

  const homeworkToday = await prisma.academicHomework.findMany({
    where: {
      institutionId,
      assignedDate: { gte: start, lte: end },
      ...(opts.academicYear ? { academicYear: opts.academicYear } : {}),
      ...(opts.className ? { className: opts.className } : {}),
      ...(opts.sectionName ? { sectionName: opts.sectionName } : {}),
    },
    orderBy: { assignedDate: 'desc' },
  });

  const usedHomeworkIds = new Set<string>();
  const rows: HomeworkDashboardRow[] = allocations.map((a) => {
    const hw = homeworkToday.find((h) => !usedHomeworkIds.has(h.id) && matchHomework(h, a));
    if (hw) usedHomeworkIds.add(hw.id);
    return {
      date: opts.date,
      className: a.className,
      sectionName: a.sectionName,
      classGroup: formatClassSection(a.className, a.sectionName),
      subjectName: a.subjectName,
      teacherName: a.teacherName,
      assignmentStatus: hw ? 'ASSIGNED' : 'NOT_ASSIGNED',
      assignmentStatusLabel: hw ? 'Assigned' : 'Not Assigned',
      homeworkId: hw?.id ?? null,
      homework: hw ? serializeHomework(hw) : null,
    };
  });

  const orphanHomework = homeworkToday.filter((h) => !usedHomeworkIds.has(h.id));
  for (const hw of orphanHomework) {
    rows.push({
      date: opts.date,
      className: hw.className,
      sectionName: hw.sectionName,
      classGroup: formatClassSection(hw.className, hw.sectionName),
      subjectName: hw.subjectName,
      teacherName: hw.teacherName || '—',
      assignmentStatus: 'ASSIGNED',
      assignmentStatusLabel: 'Assigned',
      homeworkId: hw.id,
      homework: serializeHomework(hw),
    });
  }

  const assigned = rows.filter((r) => r.assignmentStatus === 'ASSIGNED').length;
  const notAssigned = rows.filter((r) => r.assignmentStatus === 'NOT_ASSIGNED').length;

  return {
    date: opts.date,
    academicYear: opts.academicYear || null,
    summary: {
      totalSlots: rows.length,
      assigned,
      notAssigned,
      assignedPercent: rows.length ? Math.round((assigned / rows.length) * 100) : 0,
    },
    rows,
  };
}

export async function getHomeworkDetail(institutionId: string, id: string) {
  const row = await prisma.academicHomework.findFirst({ where: { institutionId, id } });
  if (!row) return null;
  return serializeHomework(row);
}

export async function getMobileHomeworkForStudent(
  institutionId: string,
  opts: { studentId: string; date?: string; academicYear?: string },
) {
  const student = await prisma.student.findFirst({
    where: { institutionId, id: opts.studentId },
    select: { className: true, sectionName: true, academicYear: true },
  });
  if (!student) throw new Error('Student not found');

  const year = opts.academicYear || student.academicYear;
  const date = opts.date || new Date().toISOString().slice(0, 10);
  const { start, end } = dayBounds(date);

  const records = await prisma.academicHomework.findMany({
    where: {
      institutionId,
      academicYear: year,
      className: student.className,
      sectionName: student.sectionName,
      assignedDate: { gte: start, lte: end },
      publishedAt: { not: null },
    },
    orderBy: { assignedDate: 'desc' },
  });

  return {
    studentId: opts.studentId,
    date,
    classGroup: formatClassSection(student.className, student.sectionName),
    homework: records.map(serializeHomework),
    total: records.length,
  };
}
