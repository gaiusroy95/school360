import { ParentMeetingStatus } from '@prisma/client';
import { prisma } from './prisma.js';

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
