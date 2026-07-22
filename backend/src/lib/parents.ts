import { ParentRelationship, Student, StudentStatus } from '@prisma/client';
import { prisma } from './prisma.js';
import { buildStudentProfileBundle, formatClassSection } from './students.js';

function studentFullName(s: Pick<Student, 'firstName' | 'lastName'>) {
  return [s.firstName, s.lastName].filter(Boolean).join(' ').trim();
}

export const RELATIONSHIP_UI: Record<ParentRelationship, string> = {
  FATHER: 'Father',
  MOTHER: 'Mother',
  GUARDIAN: 'Guardian',
};

export type ParentChildLink = {
  studentId: string;
  name: string;
  classGroup: string;
  className: string;
  sectionName: string;
  admissionNumber: string;
  academicYear: string;
  status: string;
};

export type DerivedParentContact = {
  parentKey: string;
  name: string;
  relationship: ParentRelationship;
  relationshipLabel: string;
  mobile: string;
  email: string;
  address: string;
  occupation: string;
  status: 'Active' | 'Inactive';
  children: ParentChildLink[];
  categoryLabels: string[];
  lastComm: string | null;
  enrolledAt: string | null;
};

function normalizeMobile(m: string) {
  return m.replace(/\D/g, '');
}

export function makeParentKey(relationship: ParentRelationship, mobile: string, name: string) {
  const id = normalizeMobile(mobile) || name.trim().toLowerCase().replace(/[^a-z0-9]+/gi, '_').slice(0, 40) || 'unknown';
  return `${relationship}:${id}`;
}

export function parseParentKey(parentKey: string): { relationship: ParentRelationship; idPart: string } | null {
  const idx = parentKey.indexOf(':');
  if (idx < 0) return null;
  const rel = parentKey.slice(0, idx).toUpperCase() as ParentRelationship;
  if (!Object.values(ParentRelationship).includes(rel)) return null;
  return { relationship: rel, idPart: parentKey.slice(idx + 1) };
}

function parentFields(student: Student, rel: ParentRelationship) {
  if (rel === ParentRelationship.FATHER) {
    return { name: student.fatherName, mobile: student.fatherMobile };
  }
  if (rel === ParentRelationship.MOTHER) {
    return { name: student.motherName, mobile: student.motherMobile };
  }
  return { name: '', mobile: '' };
}

export function deriveParentContacts(students: Student[]): DerivedParentContact[] {
  const map = new Map<string, DerivedParentContact>();

  for (const student of students) {
    const child: ParentChildLink = {
      studentId: student.id,
      name: studentFullName(student),
      classGroup: formatClassSection(student.className, student.sectionName),
      className: student.className,
      sectionName: student.sectionName,
      admissionNumber: student.admissionNumber,
      academicYear: student.academicYear,
      status: student.status,
    };

    for (const rel of [ParentRelationship.FATHER, ParentRelationship.MOTHER]) {
      const { name, mobile } = parentFields(student, rel);
      if (!name.trim() && !mobile.trim()) continue;

      const parentKey = makeParentKey(rel, mobile, name || studentFullName(student));
      const displayName =
        rel === ParentRelationship.FATHER
          ? name.trim()
            ? `Mr. ${name.trim()}`
            : 'Father'
          : name.trim()
            ? `Mrs. ${name.trim()}`
            : 'Mother';

      const existing = map.get(parentKey);
      if (existing) {
        if (!existing.children.some((c) => c.studentId === student.id)) {
          existing.children.push(child);
        }
        if (student.status === StudentStatus.ACTIVE) existing.status = 'Active';
        if (!existing.enrolledAt || student.enrolledAt < new Date(existing.enrolledAt)) {
          existing.enrolledAt = student.enrolledAt.toISOString();
        }
      } else {
        map.set(parentKey, {
          parentKey,
          name: displayName,
          relationship: rel,
          relationshipLabel: RELATIONSHIP_UI[rel],
          mobile: mobile.trim() || '—',
          email: student.email || '—',
          address: student.address || '—',
          occupation: (student.customFields as Record<string, unknown>)?.admissionForm
            ? String(((student.customFields as Record<string, unknown>).admissionForm as Record<string, string>)?.fatherOccupation || '')
            : '—',
          status: student.status === StudentStatus.ACTIVE ? 'Active' : 'Inactive',
          children: [child],
          categoryLabels: [],
          lastComm: null,
          enrolledAt: student.enrolledAt.toISOString(),
        });
      }
    }
  }

  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function serializeParentListItem(
  p: DerivedParentContact,
  extras?: { lastComm?: string | null; engagementScore?: number; engagementTier?: string },
) {
  return {
    parentKey: p.parentKey,
    name: p.name,
    students: p.children.map((c) => ({ studentId: c.studentId, name: c.name, class: c.classGroup })),
    relationship: p.relationshipLabel,
    mobile: p.mobile,
    email: p.email,
    status: p.status,
    lastComm: extras?.lastComm ?? p.lastComm ?? '—',
    categoryLabels: p.categoryLabels,
    engagementScore: extras?.engagementScore ?? null,
    engagementTier: extras?.engagementTier ?? null,
  };
}

export async function loadStudentsForParents(
  institutionId: string,
  filters?: {
    academicYear?: string;
    className?: string;
    sectionName?: string;
    q?: string;
  },
) {
  return prisma.student.findMany({
    where: {
      institutionId,
      ...(filters?.academicYear ? { academicYear: filters.academicYear } : {}),
      ...(filters?.className ? { className: filters.className } : {}),
      ...(filters?.sectionName ? { sectionName: filters.sectionName } : {}),
      ...(filters?.q
        ? {
            OR: [
              { firstName: { contains: filters.q, mode: 'insensitive' } },
              { lastName: { contains: filters.q, mode: 'insensitive' } },
              { fatherName: { contains: filters.q, mode: 'insensitive' } },
              { motherName: { contains: filters.q, mode: 'insensitive' } },
              { fatherMobile: { contains: filters.q, mode: 'insensitive' } },
              { motherMobile: { contains: filters.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    orderBy: [{ className: 'asc' }, { firstName: 'asc' }],
    take: 5000,
  });
}

export async function getParentDashboard(institutionId: string, academicYear?: string) {
  const yearStart = new Date();
  yearStart.setMonth(0, 1);
  yearStart.setHours(0, 0, 0, 0);

  const students = await loadStudentsForParents(institutionId, { academicYear });
  const parents = deriveParentContacts(students);

  const [ptmCount, messagesSent, feedbackAvg, newThisYear] = await Promise.all([
    prisma.parentMeeting.count({ where: { institutionId } }),
    prisma.parentCommunication.count({
      where: { institutionId, status: { in: ['SENT', 'DELIVERED', 'READ'] } },
    }),
    prisma.parentFeedback.aggregate({
      where: { institutionId, rating: { gt: 0 } },
      _avg: { rating: true },
    }),
    prisma.student.count({
      where: { institutionId, enrolledAt: { gte: yearStart } },
    }),
  ]);

  const active = parents.filter((p) => p.status === 'Active').length;

  return {
    total: parents.length,
    activeOpen: active,
    newThisYear,
    ptmMeetings: ptmCount,
    messagesSent,
    satisfactionScore: feedbackAvg._avg.rating
      ? Math.round((feedbackAvg._avg.rating / 5) * 50) / 10
      : 0,
  };
}

export async function getParentDetail(institutionId: string, parentKey: string) {
  const parsed = parseParentKey(parentKey);
  if (!parsed) return null;

  const students = await loadStudentsForParents(institutionId);
  const parents = deriveParentContacts(students);
  const parent = parents.find((p) => p.parentKey === parentKey);
  if (!parent) return null;

  const categoryAssignments = await prisma.parentCategoryAssignment.findMany({
    where: { institutionId, parentKey },
    include: { category: true },
  });
  parent.categoryLabels = categoryAssignments.map((a) => a.category.name);

  const studentIds = parent.children.map((c) => c.studentId);

  const [feeReceipts, communications, engagements, meetings, feedbacks, analytics] = await Promise.all([
    prisma.feeReceipt.findMany({
      where: {
        institutionId,
        admissionNumber: { in: parent.children.map((c) => c.admissionNumber).filter(Boolean) },
      },
      orderBy: { collectedAt: 'desc' },
      take: 20,
    }),
    prisma.parentCommunication.findMany({
      where: { institutionId, studentId: { in: studentIds } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.parentEngagementEvent.findMany({
      where: { institutionId, studentId: { in: studentIds } },
      orderBy: { plannedAt: 'desc' },
      take: 20,
    }),
    prisma.parentMeeting.findMany({
      where: { institutionId, studentId: { in: studentIds } },
      orderBy: { scheduledAt: 'desc' },
      take: 10,
    }),
    prisma.parentFeedback.findMany({
      where: { institutionId, studentId: { in: studentIds } },
      orderBy: { submittedAt: 'desc' },
      take: 10,
    }),
    prisma.studentAnalyticsRecord.findMany({
      where: { institutionId, studentId: { in: studentIds } },
      orderBy: { computedAt: 'desc' },
    }),
  ]);

  const lastComm = communications[0];
  const lastCommLabel = lastComm
    ? new Date(lastComm.sentAt || lastComm.plannedAt || lastComm.createdAt).toLocaleDateString('en-IN')
    : '—';

  const childrenDetail = await Promise.all(
    parent.children.map(async (child) => {
      const student = students.find((s) => s.id === child.studentId);
      if (!student) return { ...child, feePaidTotal: 0, feeDueAmount: 0 };
      const receipts = feeReceipts.filter((r) => r.admissionNumber === student.admissionNumber);
      const bundle = buildStudentProfileBundle(student, receipts);
      return {
        ...child,
        feePaidTotal: bundle.profile.feePaidTotal,
        feeDueAmount: bundle.profile.feeDueAmount,
        attendanceToday: bundle.profile.attendanceToday,
      };
    }),
  );

  const feePaidTotal = childrenDetail.reduce((s, c) => s + (c.feePaidTotal || 0), 0);
  const feeDueTotal = childrenDetail.reduce((s, c) => s + (c.feeDueAmount || 0), 0);

  return {
    parent: serializeParentListItem(parent, { lastComm: lastCommLabel }),
    profile: {
      occupation: parent.occupation,
      address: parent.address,
      joinedOn: parent.enrolledAt
        ? new Date(parent.enrolledAt).toLocaleDateString('en-IN')
        : '—',
      category: parent.categoryLabels.join(', ') || 'General',
    },
    children: childrenDetail,
    fees: { paid: feePaidTotal, due: feeDueTotal, payable: feePaidTotal + feeDueTotal },
    communications,
    engagements,
    meetings,
    feedbacks,
    analytics: analytics.map((a) => ({
      studentId: a.studentId,
      name: a.name,
      parentEngagementScore: (a.scores as { parentEngagementScore?: number })?.parentEngagementScore ?? 0,
    })),
    recentActivities: [
      ...communications.slice(0, 5).map((c) => ({
        title: c.subject || c.channel,
        desc: c.body.slice(0, 80),
        time: (c.sentAt || c.plannedAt || c.createdAt).toISOString(),
        type: 'Communication',
      })),
      ...engagements.slice(0, 3).map((e) => ({
        title: e.title,
        desc: e.outcome || e.description,
        time: e.plannedAt.toISOString(),
        type: 'Engagement',
      })),
    ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()),
  };
}

export async function generateParentRecordId(
  institutionId: string,
  prefix: string,
  counter: () => Promise<number>,
): Promise<string> {
  const base = await counter();
  for (let i = 0; i < 50; i++) {
    const candidate = `${prefix}-${String(1000 + base + i + 1)}`;
    return candidate;
  }
  return `${prefix}-${Date.now().toString().slice(-6)}`;
}
