import * as XLSX from 'xlsx';
import type { ParentListItem } from './parentServices';
import type { MeetingRecord } from './parentMeetingServices';

export function downloadParentsExcel(parents: ParentListItem[], filename = 'Parents_Export.xlsx') {
  const headers = ['Parent Name', 'Relationship', 'Mobile', 'Email', 'Status', 'Students', 'Last Communication', 'Engagement Score', 'Tier'];
  const rows = parents.map((p) => [
    p.name,
    p.relationship,
    p.mobile,
    p.email,
    p.status,
    p.students.map((s) => `${s.name} (${s.class})`).join('; '),
    p.lastComm,
    p.engagementScore ?? '',
    p.engagementTier ?? '',
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([headers, ...rows]), 'Parents');
  XLSX.writeFile(wb, filename);
}

export function downloadParentMeetingsExcel(meetings: MeetingRecord[], filename = 'PTM_Export.xlsx') {
  const headers = ['Record ID', 'Batch ID', 'Title', 'Venue', 'Class', 'Section', 'Student Name', "Father's Name", 'Scheduled', 'Conducted', 'Status', 'Discussion Notes', 'Attendees'];
  const rows = meetings.map((m) => [
    m.recordId,
    m.batchId || '',
    m.meetingTitle || '',
    m.venue || '',
    m.className,
    m.sectionName,
    m.studentName,
    m.fatherName,
    new Date(m.scheduledAt).toLocaleString('en-IN'),
    m.conductedAt ? new Date(m.conductedAt).toLocaleString('en-IN') : '',
    m.statusLabel,
    m.discussionNotes,
    m.attendees,
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([headers, ...rows]), 'PTM Records');
  XLSX.writeFile(wb, filename);
}
