import { ParentRelationship, Student } from '@prisma/client';
import { prisma } from './prisma.js';
import { deriveParentContacts, loadStudentsForParents, makeParentKey } from './parents.js';
import { formatClassSection } from './students.js';

function studentFullName(s: Pick<Student, 'firstName' | 'lastName'>) {
  return [s.firstName, s.lastName].filter(Boolean).join(' ').trim();
}

export const FEEDBACK_SOURCE_UI: Record<string, string> = {
  MOBILE: 'Parent Mobile App',
  APP: 'Parent Mobile App',
  SMS: 'SMS Reply',
  WEB: 'Parent Portal',
  ADMIN: 'Admin Entry',
};

export function serializeFeedback(row: {
  id: string;
  recordId: string;
  studentId: string;
  parentRelationship: ParentRelationship;
  parentName: string;
  parentMobile?: string;
  source?: string;
  rating: number;
  category: string;
  message: string;
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}) {
  const source = row.source || 'MOBILE';
  return {
    id: row.id,
    recordId: row.recordId,
    studentId: row.studentId,
    parentRelationship: row.parentRelationship,
    relationshipLabel: row.parentRelationship === 'FATHER' ? 'Father' : row.parentRelationship === 'MOTHER' ? 'Mother' : 'Guardian',
    parentName: row.parentName,
    parentMobile: row.parentMobile || '',
    source,
    sourceLabel: FEEDBACK_SOURCE_UI[source] || source,
    rating: row.rating,
    category: row.category,
    message: row.message,
    submittedAt: row.submittedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function enrichFeedbackRecords(
  institutionId: string,
  rows: Parameters<typeof serializeFeedback>[0][],
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
    const base = serializeFeedback(row);
    const student = studentMap.get(row.studentId);
    if (!student) {
      return {
        ...base,
        studentName: '—',
        classGroup: '—',
        parentKey: '',
      };
    }

    const rel = row.parentRelationship;
    const parentName =
      row.parentName ||
      (rel === 'FATHER'
        ? student.fatherName.trim() || 'Father'
        : rel === 'MOTHER'
          ? student.motherName.trim() || 'Mother'
          : 'Guardian');
    const parentMobile =
      row.parentMobile ||
      (rel === 'FATHER' ? student.fatherMobile : rel === 'MOTHER' ? student.motherMobile : '');

    return {
      ...base,
      parentName,
      parentMobile: parentMobile || '—',
      studentName: studentFullName(student),
      classGroup: formatClassSection(student.className, student.sectionName),
      parentKey: makeParentKey(rel, parentMobile, parentName),
    };
  });
}

export async function submitMobileParentFeedback(
  institutionId: string,
  data: {
    studentId: string;
    parentRelationship: ParentRelationship;
    parentMobile?: string;
    parentName?: string;
    rating: number;
    category?: string;
    message: string;
    source?: string;
  },
) {
  const student = await prisma.student.findFirst({
    where: { institutionId, id: data.studentId },
  });
  if (!student) throw new Error('Student not found');

  const rel = data.parentRelationship;
  const parentName =
    data.parentName ||
    (rel === 'FATHER'
      ? student.fatherName.trim() || 'Father'
      : rel === 'MOTHER'
        ? student.motherName.trim() || 'Mother'
        : 'Guardian');
  const parentMobile =
    data.parentMobile ||
    (rel === 'FATHER' ? student.fatherMobile : rel === 'MOTHER' ? student.motherMobile : '');

  const recordId = await nextFeedbackRecordId(institutionId);
  const row = await prisma.parentFeedback.create({
    data: {
      institutionId,
      recordId,
      studentId: data.studentId,
      parentRelationship: rel,
      parentName,
      parentMobile: parentMobile || '',
      source: data.source || 'MOBILE',
      rating: data.rating,
      category: data.category || 'General',
      message: data.message,
      submittedAt: new Date(),
    },
  });
  const [enriched] = await enrichFeedbackRecords(institutionId, [row]);
  return enriched;
}

export async function nextFeedbackRecordId(institutionId: string) {
  const count = await prisma.parentFeedback.count({ where: { institutionId } });
  return `FB-${String(4000 + count + 1)}`;
}

export async function getFeedbackDashboard(institutionId: string) {
  const [total, avg] = await Promise.all([
    prisma.parentFeedback.count({ where: { institutionId } }),
    prisma.parentFeedback.aggregate({ where: { institutionId, rating: { gt: 0 } }, _avg: { rating: true } }),
  ]);
  return { total, averageRating: avg._avg.rating ? Math.round(avg._avg.rating * 10) / 10 : 0 };
}

export async function ensureParentFeedbackDemo(institutionId: string) {
  const count = await prisma.parentFeedback.count({ where: { institutionId } });
  if (count > 0) return { created: 0 };

  const students = await prisma.student.findMany({
    where: { institutionId },
    take: 12,
    orderBy: { enrolledAt: 'desc' },
  });
  if (students.length === 0) return { created: 0 };

  const now = Date.now();
  let created = 0;
  const messages = [
    'Very happy with teacher communication this term.',
    'Homework load is manageable. Thank you.',
    'Would like more updates on sports activities.',
    'Fee payment process on the app is smooth.',
    'PTM was helpful — appreciate the effort.',
    'Bus timing has improved, thanks.',
  ];

  for (let i = 0; i < students.length; i++) {
    const s = students[i];
    const rel = i % 3 === 0 ? ParentRelationship.MOTHER : ParentRelationship.FATHER;
    const parentName = rel === ParentRelationship.FATHER ? s.fatherName || 'Father' : s.motherName || 'Mother';
    const parentMobile = rel === ParentRelationship.FATHER ? s.fatherMobile : s.motherMobile;
    if (!parentMobile?.trim()) continue;

    await prisma.parentFeedback.create({
      data: {
        institutionId,
        recordId: `FB-${4000 + created + 1}`,
        studentId: s.id,
        parentRelationship: rel,
        parentName,
        parentMobile: parentMobile.trim(),
        source: 'MOBILE',
        rating: 3 + (i % 3),
        category: i % 2 === 0 ? 'Academic' : 'General',
        message: messages[i % messages.length],
        submittedAt: new Date(now - i * 86400000 * 3),
      },
    });
    created += 1;
  }

  return { created };
}

export async function resolveStudentIdsForParentSearch(
  institutionId: string,
  opts: { q?: string; className?: string; sectionName?: string },
) {
  const students = await loadStudentsForParents(institutionId, opts);
  if (!opts.q?.trim()) return students.map((s) => s.id);

  const parents = deriveParentContacts(students);
  const needle = opts.q.trim().toLowerCase();
  const mobileNeedle = opts.q.replace(/\D/g, '');

  const matchedParentKeys = new Set(
    parents
      .filter(
        (p) =>
          p.name.toLowerCase().includes(needle) ||
          p.mobile.replace(/\D/g, '').includes(mobileNeedle) ||
          p.children.some((c) => c.name.toLowerCase().includes(needle)),
      )
      .map((p) => p.parentKey),
  );

  const studentIds = new Set<string>();
  for (const p of parents) {
    if (!matchedParentKeys.has(p.parentKey)) continue;
    for (const c of p.children) studentIds.add(c.studentId);
  }
  return [...studentIds];
}
