import { ParentMeetingStatus, ParentRelationship, Student } from '@prisma/client';
import { prisma } from './prisma.js';
import { autoRecordCommunication } from './parentCommunications.js';
import { deriveParentContacts } from './parents.js';
import { notifyStaffPush } from './notifications.js';
import { studentFullNameLocal } from './parentSeedHelpers.js';

export const MEETING_STATUS_UI: Record<ParentMeetingStatus, string> = {
  SCHEDULED: 'Scheduled',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  MISSED: 'Missed',
};

export function serializeMeeting(row: {
  id: string;
  recordId: string;
  studentId: string;
  className: string;
  sectionName: string;
  studentName: string;
  fatherName: string;
  meetingTitle?: string;
  venue?: string;
  batchId?: string;
  scheduledAt: Date;
  conductedAt: Date | null;
  discussionNotes: string;
  photoUrls: unknown;
  attendees: string;
  status: ParentMeetingStatus;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    recordId: row.recordId,
    studentId: row.studentId,
    className: row.className,
    sectionName: row.sectionName,
    classGroup: row.sectionName ? `${row.className} - ${row.sectionName}` : row.className,
    studentName: row.studentName,
    fatherName: row.fatherName,
    meetingTitle: row.meetingTitle || 'Parent Teacher Meeting',
    venue: row.venue || '',
    batchId: row.batchId || '',
    scheduledAt: row.scheduledAt.toISOString(),
    conductedAt: row.conductedAt?.toISOString() ?? null,
    discussionNotes: row.discussionNotes,
    photoUrls: Array.isArray(row.photoUrls) ? row.photoUrls : [],
    attendees: row.attendees,
    status: row.status,
    statusLabel: MEETING_STATUS_UI[row.status],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function nextMeetingRecordId(institutionId: string) {
  const count = await prisma.parentMeeting.count({ where: { institutionId } });
  return `PTM-${String(5000 + count + 1)}`;
}

export async function getMeetingDashboard(institutionId: string) {
  const [total, scheduled, completed] = await Promise.all([
    prisma.parentMeeting.count({ where: { institutionId } }),
    prisma.parentMeeting.count({ where: { institutionId, status: 'SCHEDULED' } }),
    prisma.parentMeeting.count({ where: { institutionId, status: 'COMPLETED' } }),
  ]);
  return { total, scheduled, completed };
}

function formatPtmDateTime(date: Date) {
  return date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export async function sendPtmPushNotifications(
  institutionId: string,
  params: {
    batchId: string;
    title: string;
    scheduledAt: Date;
    venue?: string;
    students: Student[];
    className?: string;
    sectionName?: string;
    notifyParents: boolean;
    notifyStaff: boolean;
    notifyStudents: boolean;
  },
) {
  const dateStr = formatPtmDateTime(params.scheduledAt);
  const venueLine = params.venue ? ` Venue: ${params.venue}.` : '';
  let parentsPush = 0;
  let studentsPush = 0;
  let staffPush = 0;

  if (params.notifyParents) {
    const parents = deriveParentContacts(params.students);
    for (const parent of parents) {
      if (!parent.mobile || parent.mobile === '—') continue;
      const child = parent.children[0];
      await autoRecordCommunication(institutionId, {
        studentId: child.studentId,
        parentRelationship: parent.relationship,
        channel: 'APP',
        subject: params.title,
        body: `PTM scheduled on ${dateStr} for ${child.name}.${venueLine} Please attend.`,
        category: 'ptm',
        sentAt: new Date(),
        status: 'SENT',
        academicData: {
          batchId: params.batchId,
          pushType: 'PTM_SCHEDULED',
          parentMobile: parent.mobile,
          channel: 'PUSH',
        },
      });
      parentsPush += 1;
    }
  }

  if (params.notifyStudents) {
    for (const student of params.students) {
      const name = studentFullNameLocal(student);
      await autoRecordCommunication(institutionId, {
        studentId: student.id,
        parentRelationship: ParentRelationship.FATHER,
        channel: 'APP',
        subject: params.title,
        body: `Dear ${name}, your PTM is scheduled on ${dateStr}.${venueLine}`,
        category: 'ptm',
        sentAt: new Date(),
        status: 'SENT',
        academicData: {
          batchId: params.batchId,
          pushType: 'PTM_STUDENT',
          recipientType: 'student',
          channel: 'PUSH',
        },
      });
      studentsPush += 1;
    }
  }

  if (params.notifyStaff) {
    const classLabel = `${params.className || ''}${params.sectionName ? ` ${params.sectionName}` : ''}`.trim() || 'school';
    const staffResult = await notifyStaffPush(
      institutionId,
      params.title,
      `Bulk PTM scheduled for ${classLabel} on ${dateStr}.${venueLine} ${params.students.length} student meeting(s) created.`,
      'PTM Scheduled',
    );
    staffPush = staffResult.sent;
  }

  return { parentsPush, studentsPush, staffPush, total: parentsPush + studentsPush + staffPush };
}

export async function createSingleParentMeeting(
  institutionId: string,
  data: {
    studentId: string;
    scheduledAt: Date;
    meetingTitle?: string;
    venue?: string;
    discussionNotes?: string;
    attendees?: string;
    status?: ParentMeetingStatus;
    conductedAt?: Date | null;
    notifyParents?: boolean;
    notifyStaff?: boolean;
    notifyStudents?: boolean;
  },
) {
  const student = await prisma.student.findFirst({ where: { institutionId, id: data.studentId } });
  if (!student) throw new Error('Student not found');

  const recordId = await nextMeetingRecordId(institutionId);
  const title = data.meetingTitle || 'Parent Teacher Meeting';
  const row = await prisma.parentMeeting.create({
    data: {
      institutionId,
      recordId,
      studentId: student.id,
      className: student.className,
      sectionName: student.sectionName,
      studentName: studentFullNameLocal(student),
      fatherName: student.fatherName,
      meetingTitle: title,
      venue: data.venue || '',
      batchId: '',
      scheduledAt: data.scheduledAt,
      conductedAt: data.conductedAt ?? null,
      discussionNotes: data.discussionNotes || '',
      attendees: data.attendees || student.fatherName,
      status: data.status || 'SCHEDULED',
      photoUrls: [],
    },
  });

  const notifications = await sendPtmPushNotifications(institutionId, {
    batchId: row.recordId,
    title,
    scheduledAt: data.scheduledAt,
    venue: data.venue,
    students: [student],
    className: student.className,
    sectionName: student.sectionName,
    notifyParents: data.notifyParents !== false,
    notifyStaff: data.notifyStaff !== false,
    notifyStudents: data.notifyStudents !== false,
  });

  return { record: serializeMeeting(row), notifications };
}

export async function bulkScheduleParentMeetings(
  institutionId: string,
  data: {
    className: string;
    sectionName?: string;
    scheduledAt: Date;
    meetingTitle?: string;
    venue?: string;
    discussionNotes?: string;
    notifyParents?: boolean;
    notifyStaff?: boolean;
    notifyStudents?: boolean;
  },
) {
  const students = await prisma.student.findMany({
    where: {
      institutionId,
      className: data.className,
      ...(data.sectionName ? { sectionName: data.sectionName } : {}),
      status: 'ACTIVE',
    },
    orderBy: [{ className: 'asc' }, { sectionName: 'asc' }, { firstName: 'asc' }],
  });

  if (students.length === 0) {
    throw new Error('No active students found for the selected class/section.');
  }

  const batchId = `PTM-BATCH-${Date.now()}`;
  const title =
    data.meetingTitle ||
    `PTM — Class ${data.className}${data.sectionName ? ` ${data.sectionName}` : ''}`;
  const records = [];

  for (const student of students) {
    const recordId = await nextMeetingRecordId(institutionId);
    const row = await prisma.parentMeeting.create({
      data: {
        institutionId,
        recordId,
        studentId: student.id,
        className: student.className,
        sectionName: student.sectionName,
        studentName: studentFullNameLocal(student),
        fatherName: student.fatherName,
        meetingTitle: title,
        venue: data.venue || '',
        batchId,
        scheduledAt: data.scheduledAt,
        discussionNotes: data.discussionNotes || '',
        attendees: student.fatherName || student.motherName || 'Parent',
        status: 'SCHEDULED',
        photoUrls: [],
      },
    });
    records.push(row);
  }

  const notifications = await sendPtmPushNotifications(institutionId, {
    batchId,
    title,
    scheduledAt: data.scheduledAt,
    venue: data.venue,
    students,
    className: data.className,
    sectionName: data.sectionName,
    notifyParents: data.notifyParents !== false,
    notifyStaff: data.notifyStaff !== false,
    notifyStudents: data.notifyStudents !== false,
  });

  return {
    batchId,
    count: records.length,
    records: records.map(serializeMeeting),
    notifications,
  };
}
