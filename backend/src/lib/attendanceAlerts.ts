import { AttendanceStatus } from '@prisma/client';
import { prisma } from './prisma.js';
import { notifyMobileNumbers } from './sms.js';
import { pushToParentAccountsForStudent } from './mobileParentNotify.js';

export async function notifyParentsStudentAbsent(params: {
  institutionId: string;
  studentId: string;
  sessionDate: string;
  className: string;
  sectionName: string;
  absentReason?: string;
}) {
  const student = await prisma.student.findFirst({
    where: { id: params.studentId, institutionId: params.institutionId },
  });
  if (!student) return { skipped: true, reason: 'student_not_found' };

  const studentName = [student.firstName, student.lastName].filter(Boolean).join(' ').trim();
  const classGroup = [params.className, params.sectionName].filter(Boolean).join('-');
  const message = `Attendance Alert: ${studentName} (${student.admissionNumber}) was marked ABSENT on ${params.sessionDate} for ${classGroup}. ${
    params.absentReason ? `Reason: ${params.absentReason}.` : ''
  } — 360schoolERP`;

  const mobiles = [student.fatherMobile, student.motherMobile].filter((m) => m?.trim());
  const sms = await notifyMobileNumbers(params.institutionId, mobiles, message, {
    useWhatsApp: process.env.ABSENT_ALERT_CHANNEL !== 'sms',
  });

  const push = await pushToParentAccountsForStudent({
    institutionId: params.institutionId,
    studentId: params.studentId,
    title: 'Attendance: Absent',
    body: `${studentName} was marked absent today (${classGroup}).`,
    category: 'attendance',
    payload: {
      studentId: params.studentId,
      sessionDate: params.sessionDate,
      status: AttendanceStatus.ABSENT,
    },
  });

  await prisma.parentCommunication.create({
    data: {
      institutionId: params.institutionId,
      recordId: `PC-ABS-${Date.now()}`,
      studentId: params.studentId,
      parentRelationship: 'FATHER',
      channel: process.env.WHATSAPP_API_URL ? 'WHATSAPP' : 'SMS',
      direction: 'OUTBOUND',
      subject: 'Student absent alert',
      body: message,
      sentAt: new Date(),
      status: 'SENT',
      category: 'attendance',
    },
  });

  return { sms, push };
}
