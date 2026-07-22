import { ParentEngagementStatus, ParentRelationship, Student } from '@prisma/client';
import { prisma } from './prisma.js';
import { deriveParentContacts, loadStudentsForParents, makeParentKey, parseParentKey } from './parents.js';
import { formatClassSection } from './students.js';

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
      classGroup: formatClassSection(student.className, student.sectionName),
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
