import { ParentEngagementStatus, ParentRelationship, Student } from '@prisma/client';
import { prisma } from './prisma.js';
import { deriveParentContacts, loadStudentsForParents, makeParentKey, parseParentKey } from './parents.js';
import { formatClassSection } from './students.js';
import { createRosterTask, publishTeacherRosterTasks } from './teacherRoster.js';

function studentFullName(s: Pick<Student, 'firstName' | 'lastName'>) {
  return [s.firstName, s.lastName].filter(Boolean).join(' ').trim();
}

export const ENGAGEMENT_STATUS_UI: Record<ParentEngagementStatus, string> = {
  PLANNED: 'Planned',
  COMPLETED: 'Completed',
  MISSED: 'Missed',
  CANCELLED: 'Cancelled',
};

export function serializeEngagement(row: {
  id: string;
  recordId: string;
  studentId: string;
  parentRelationship: ParentRelationship;
  title: string;
  description: string;
  engagementType: string;
  plannedAt: Date;
  completedAt: Date | null;
  actionsTaken: string;
  outcome: string;
  studentFeedbackNotes: string;
  status: ParentEngagementStatus;
  teacherName: string;
  className: string;
  sectionName: string;
  academicYear: string;
  rosterTaskId: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    recordId: row.recordId,
    studentId: row.studentId,
    parentRelationship: row.parentRelationship,
    relationshipLabel: row.parentRelationship === 'FATHER' ? 'Father' : row.parentRelationship === 'MOTHER' ? 'Mother' : 'Guardian',
    title: row.title,
    description: row.description,
    engagementType: row.engagementType,
    plannedAt: row.plannedAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
    actionsTaken: row.actionsTaken,
    outcome: row.outcome,
    studentFeedbackNotes: row.studentFeedbackNotes,
    status: row.status,
    statusLabel: ENGAGEMENT_STATUS_UI[row.status],
    teacherName: row.teacherName,
    className: row.className,
    sectionName: row.sectionName,
    classGroup: row.className ? formatClassSection(row.className, row.sectionName) : '',
    academicYear: row.academicYear,
    rosterTaskId: row.rosterTaskId,
    mobilePublished: Boolean(row.rosterTaskId),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function enrichEngagementRecords(
  institutionId: string,
  rows: Parameters<typeof serializeEngagement>[0][],
) {
  if (rows.length === 0) return [];

  const studentIds = [...new Set(rows.map((r) => r.studentId))];
  const students = await prisma.student.findMany({
    where: { institutionId, id: { in: studentIds } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      className: true,
      sectionName: true,
      fatherName: true,
      fatherMobile: true,
      motherName: true,
      motherMobile: true,
    },
  });
  const studentMap = new Map(students.map((s) => [s.id, s]));

  return rows.map((row) => {
    const base = serializeEngagement(row);
    const student = studentMap.get(row.studentId);
    if (!student) return { ...base, studentName: '—', classGroup: '—', parentName: '—', parentMobile: '—', parentKey: '' };

    const rel = row.parentRelationship;
    const parentName =
      rel === 'FATHER'
        ? student.fatherName.trim() || 'Father'
        : rel === 'MOTHER'
          ? student.motherName.trim() || 'Mother'
          : 'Guardian';
    const parentMobile = rel === 'FATHER' ? student.fatherMobile : rel === 'MOTHER' ? student.motherMobile : '';

    return {
      ...base,
      studentName: studentFullName(student),
      classGroup: base.classGroup || formatClassSection(student.className, student.sectionName),
      parentName,
      parentMobile: parentMobile || '—',
      parentKey: makeParentKey(rel, parentMobile, parentName),
    };
  });
}

export async function resolveStudentIdsForParentKey(institutionId: string, parentKey: string) {
  const parsed = parseParentKey(parentKey);
  if (!parsed) return [];

  const students = await loadStudentsForParents(institutionId, {});
  const parents = deriveParentContacts(students);
  const parent = parents.find((p) => p.parentKey === parentKey);
  return parent?.children.map((c) => c.studentId) ?? [];
}

export async function nextEngagementRecordId(institutionId: string) {
  const count = await prisma.parentEngagementEvent.count({ where: { institutionId } });
  return `ENG-${String(2000 + count + 1)}`;
}

export async function getEngagementDashboard(institutionId: string) {
  const [total, planned, completed, missed] = await Promise.all([
    prisma.parentEngagementEvent.count({ where: { institutionId } }),
    prisma.parentEngagementEvent.count({ where: { institutionId, status: 'PLANNED' } }),
    prisma.parentEngagementEvent.count({ where: { institutionId, status: 'COMPLETED' } }),
    prisma.parentEngagementEvent.count({ where: { institutionId, status: 'MISSED' } }),
  ]);
  return { total, planned, completed, missed };
}

export type EngagementHierarchyContext = {
  teacherName: string;
  className: string;
  sectionName: string;
  academicYear: string;
};

export async function getEngagementHierarchyMeta(institutionId: string, academicYear = '2025-26') {
  const sections = await prisma.academicClassSection.findMany({
    where: { institutionId, academicYear },
    orderBy: [{ className: 'asc' }, { sectionName: 'asc' }],
  });

  const allocations = await prisma.academicTeacherAllocation.findMany({
    where: { institutionId, academicYear },
    select: { teacherName: true, className: true, sectionName: true },
    distinct: ['teacherName', 'className', 'sectionName'],
  });

  type Assignment = { className: string; sectionName: string; classGroup: string };
  const teacherMap = new Map<string, { teacherName: string; assignments: Assignment[] }>();

  const addAssignment = (teacherName: string, className: string, sectionName: string) => {
    const name = teacherName.trim();
    if (!name || !className.trim()) return;
    if (!teacherMap.has(name)) {
      teacherMap.set(name, { teacherName: name, assignments: [] });
    }
    const bucket = teacherMap.get(name)!;
    const key = `${className}::${sectionName}`;
    if (!bucket.assignments.some((a) => `${a.className}::${a.sectionName}` === key)) {
      bucket.assignments.push({
        className,
        sectionName,
        classGroup: formatClassSection(className, sectionName),
      });
    }
  };

  for (const s of sections) {
    if (s.classTeacher?.trim()) {
      addAssignment(s.classTeacher, s.className, s.sectionName);
    }
  }
  for (const a of allocations) {
    addAssignment(a.teacherName, a.className, a.sectionName);
  }

  const teachers = [...teacherMap.values()].sort((a, b) => a.teacherName.localeCompare(b.teacherName));
  const classes = [...new Set(sections.map((s) => s.className))].sort();
  const sectionsByClass = sections.reduce<Record<string, string[]>>((acc, s) => {
    const list = acc[s.className] || [];
    if (!list.includes(s.sectionName)) list.push(s.sectionName);
    acc[s.className] = list.sort();
    return acc;
  }, {});

  return { academicYear, teachers, classes, sectionsByClass };
}

export async function publishEngagementToMobile(
  institutionId: string,
  engagement: {
    id: string;
    title: string;
    description: string;
    plannedAt: Date;
  },
  ctx: EngagementHierarchyContext,
) {
  if (!ctx.teacherName.trim()) return '';

  const existing = await prisma.academicTeacherRosterTask.findFirst({
    where: {
      institutionId,
      linkedEntityId: engagement.id,
      taskType: 'PARENT_ENGAGEMENT',
    },
  });
  if (existing) {
    if (!existing.publishedAt) {
      await publishTeacherRosterTasks(institutionId, {
        academicYear: ctx.academicYear,
        taskIds: [existing.id],
      });
    }
    return existing.id;
  }

  const task = await createRosterTask(institutionId, {
    academicYear: ctx.academicYear,
    teacherName: ctx.teacherName,
    taskType: 'PARENT_ENGAGEMENT',
    title: engagement.title,
    description: engagement.description,
    className: ctx.className,
    sectionName: ctx.sectionName,
    linkedEntityId: engagement.id,
    dueDate: engagement.plannedAt.toISOString(),
    feedbackRequired: true,
    assignedBy: 'Parents Engagement',
  });

  await publishTeacherRosterTasks(institutionId, {
    academicYear: ctx.academicYear,
    taskIds: [task.id],
  });

  return task.id;
}
