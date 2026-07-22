import { ParentCommunicationChannel, ParentCommunicationDirection, ParentCommunicationStatus, ParentRelationship, Student } from '@prisma/client';
import { prisma } from './prisma.js';
import { deriveParentContacts, loadStudentsForParents, makeParentKey } from './parents.js';
import { formatClassSection } from './students.js';

function studentFullName(s: Pick<Student, 'firstName' | 'lastName'>) {
  return [s.firstName, s.lastName].filter(Boolean).join(' ').trim();
}

export const CHANNEL_UI: Record<ParentCommunicationChannel, string> = {
  SMS: 'SMS',
  EMAIL: 'Email',
  APP: 'App',
  CALL: 'Call',
  NOTICE: 'Notice',
  WHATSAPP: 'WhatsApp',
};

export const COMM_STATUS_UI: Record<ParentCommunicationStatus, string> = {
  PLANNED: 'Planned',
  SENT: 'Sent',
  DELIVERED: 'Delivered',
  READ: 'Read',
  FAILED: 'Failed',
};

export function serializeCommunication(row: {
  id: string;
  recordId: string;
  studentId: string;
  parentRelationship: ParentRelationship;
  channel: ParentCommunicationChannel;
  direction?: ParentCommunicationDirection;
  subject: string;
  body: string;
  plannedAt: Date | null;
  sentAt: Date | null;
  readAt?: Date | null;
  responseTimeMinutes?: number | null;
  status: ParentCommunicationStatus;
  isImportant: boolean;
  category: string;
  academicData: unknown;
  teacherFeedback: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    recordId: row.recordId,
    studentId: row.studentId,
    parentRelationship: row.parentRelationship,
    channel: row.channel,
    channelLabel: CHANNEL_UI[row.channel],
    direction: row.direction ?? 'OUTBOUND',
    directionLabel: row.direction === 'INBOUND' ? 'Inbound' : 'Outbound',
    subject: row.subject,
    body: row.body,
    plannedAt: row.plannedAt?.toISOString() ?? null,
    sentAt: row.sentAt?.toISOString() ?? null,
    readAt: row.readAt?.toISOString() ?? null,
    responseTimeMinutes: row.responseTimeMinutes ?? null,
    status: row.status,
    statusLabel: COMM_STATUS_UI[row.status],
    isImportant: row.isImportant,
    category: row.category,
    academicData: row.academicData,
    teacherFeedback: row.teacherFeedback,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

type CommMeta = {
  campaignId?: string;
  parentMobile?: string;
  parentName?: string;
  studentName?: string;
  classGroup?: string;
  recipientCount?: number;
};

function readCommMeta(academicData: unknown): CommMeta {
  if (!academicData || typeof academicData !== 'object') return {};
  return academicData as CommMeta;
}

export async function enrichCommunicationRecords(
  institutionId: string,
  rows: Parameters<typeof serializeCommunication>[0][],
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
    const base = serializeCommunication(row);
    const meta = readCommMeta(row.academicData);
    const student = studentMap.get(row.studentId);
    const rel = row.parentRelationship;

    let parentName = meta.parentName || '';
    let parentMobile = meta.parentMobile || '';
    let studentName = meta.studentName || '';
    let classGroup = meta.classGroup || '';

    if (student) {
      studentName = studentName || studentFullName(student);
      classGroup = classGroup || formatClassSection(student.className, student.sectionName);
      if (!parentName) {
        parentName =
          rel === 'FATHER'
            ? student.fatherName.trim() || 'Father'
            : rel === 'MOTHER'
              ? student.motherName.trim() || 'Mother'
              : 'Guardian';
      }
      if (!parentMobile) {
        parentMobile = rel === 'FATHER' ? student.fatherMobile : rel === 'MOTHER' ? student.motherMobile : '';
      }
    }

    return {
      ...base,
      campaignId: meta.campaignId || '',
      parentName: parentName || '—',
      parentMobile: parentMobile || '—',
      studentName: studentName || '—',
      classGroup: classGroup || '—',
      parentKey: makeParentKey(rel, parentMobile, parentName),
    };
  });
}

export async function autoRecordCommunication(
  institutionId: string,
  data: {
    studentId: string;
    parentRelationship: ParentRelationship;
    channel: ParentCommunicationChannel;
    subject: string;
    body: string;
    category?: string;
    sentAt?: Date;
    status?: ParentCommunicationStatus;
    academicData?: Record<string, unknown>;
  },
) {
  const recordId = await nextCommunicationRecordId(institutionId);
  const sentAt = data.sentAt ?? new Date();
  const row = await prisma.parentCommunication.create({
    data: {
      institutionId,
      recordId,
      studentId: data.studentId,
      parentRelationship: data.parentRelationship,
      channel: data.channel,
      direction: 'OUTBOUND',
      subject: data.subject,
      body: data.body,
      sentAt,
      status: data.status ?? 'SENT',
      category: data.category ?? 'general',
      academicData: (data.academicData ?? {}) as object,
    },
  });
  const [enriched] = await enrichCommunicationRecords(institutionId, [row]);
  return enriched;
}

export async function bulkSendAndRecordCommunications(
  institutionId: string,
  params: {
    channel: ParentCommunicationChannel;
    subject: string;
    body: string;
    category?: string;
    className?: string;
    sectionName?: string;
    academicYear?: string;
    parentRelationship?: ParentRelationship;
  },
) {
  const students = await loadStudentsForParents(institutionId, {
    className: params.className,
    sectionName: params.sectionName,
    academicYear: params.academicYear,
  });
  const parents = deriveParentContacts(students);
  const campaignId = `CAMP-${Date.now()}`;
  const sentAt = new Date();
  const rows = [];

  for (const parent of parents) {
    if (params.parentRelationship && parent.relationship !== params.parentRelationship) continue;
    if (!parent.mobile || parent.mobile === '—') continue;

    const child = parent.children[0];
    const recordId = await nextCommunicationRecordId(institutionId);
    const row = await prisma.parentCommunication.create({
      data: {
        institutionId,
        recordId,
        studentId: child.studentId,
        parentRelationship: parent.relationship,
        channel: params.channel,
        direction: 'OUTBOUND',
        subject: params.subject,
        body: params.body,
        sentAt,
        status: 'SENT',
        category: params.category ?? 'general',
        academicData: {
          campaignId,
          parentMobile: parent.mobile,
          parentName: parent.name,
          studentName: child.name,
          classGroup: child.classGroup,
          recipientCount: parent.children.length,
          autoRecorded: true,
        },
      },
    });
    rows.push(row);
  }

  const records = await enrichCommunicationRecords(institutionId, rows);
  return { campaignId, sentAt: sentAt.toISOString(), count: records.length, records };
}

export async function nextCommunicationRecordId(institutionId: string) {
  const count = await prisma.parentCommunication.count({ where: { institutionId } });
  return `COM-${String(3000 + count + 1)}`;
}

export async function getCommunicationDashboard(institutionId: string) {
  const [total, sent, planned, important] = await Promise.all([
    prisma.parentCommunication.count({ where: { institutionId } }),
    prisma.parentCommunication.count({ where: { institutionId, status: { in: ['SENT', 'DELIVERED', 'READ'] } } }),
    prisma.parentCommunication.count({ where: { institutionId, status: 'PLANNED' } }),
    prisma.parentCommunication.count({ where: { institutionId, isImportant: true } }),
  ]);
  return { total, sent, planned, important };
}

export async function getCommunicationTopicBreakdown(institutionId: string) {
  const rows = await prisma.parentCommunication.groupBy({
    by: ['category'],
    where: { institutionId },
    _count: { id: true },
  });
  const total = rows.reduce((s, r) => s + r._count.id, 0) || 1;
  return rows.map((r) => ({
    name: r.category,
    count: r._count.id,
    percent: Math.round((r._count.id / total) * 100),
  }));
}
