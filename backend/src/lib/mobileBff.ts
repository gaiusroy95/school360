import { AttendanceStatus, ParentConsentResponseStatus } from '@prisma/client';
import { prisma } from './prisma.js';
import { getMobileHomeworkForStudent } from './homework.js';
import { getMobileLessonAnalytics } from './lessonPlanning.js';
import { getMobileCoScholasticForStudent } from './coScholastic.js';
import { getDailySchedule } from './timetable.js';
import { getMobilePublishedPapers } from './examPaperManagement.js';
import { formatClassSection } from './students.js';
import type { MobileAuthUser } from './mobileAuth.js';
import { resolveStudentId } from './mobileScope.js';
import { serializeConsentResponse, serializeConsentTemplate } from './parentConsents.js';
import { createLeaveApplication } from './leaveManagement.js';
import { getMobileFeesSummary, createFeePaymentOrder } from './mobileFees.js';
import {
  DEFAULT_REMINDER_PREFERENCES,
  getReminderPreferences,
  updateReminderPreferences,
} from './mobileReminders.js';
import { getMobileLmsContent } from './mobileLms.js';

function pct(n: number, total: number) {
  return total > 0 ? Math.round((n / total) * 1000) / 10 : 0;
}

async function getStudentAttendanceSnapshot(
  institutionId: string,
  studentId: string,
  academicYear: string,
) {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const records = await prisma.attendanceRecord.findMany({
    where: {
      studentId,
      session: {
        institutionId,
        academicYear,
        mode: 'CLASS',
        sessionDate: { gte: monthStart },
      },
    },
    include: { session: { select: { sessionDate: true } } },
  });

  const present = records.filter(
    (r) => r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.LATE,
  ).length;
  const absent = records.filter((r) => r.status === AttendanceStatus.ABSENT).length;
  const onLeave = records.filter((r) => r.status === AttendanceStatus.ON_LEAVE).length;
  const total = records.length;

  return {
    month: now.toLocaleString('en-IN', { month: 'long', year: 'numeric' }),
    present,
    absent,
    onLeave,
    totalMarked: total,
    attendancePercent: pct(present, total),
  };
}

export async function getMobileDashboard(
  user: MobileAuthUser,
  opts: { studentId?: string; academicYear?: string; date?: string },
) {
  const studentId = resolveStudentId(user, opts.studentId);
  const student = await prisma.student.findFirst({
    where: { id: studentId, institutionId: user.institutionId },
  });
  if (!student) throw new Error('Student not found');

  const academicYear = opts.academicYear || student.academicYear;
  const date = opts.date || new Date().toISOString().slice(0, 10);

  const [attendance, performance, coScholastic, analyticsRecord] = await Promise.all([
    getStudentAttendanceSnapshot(user.institutionId, studentId, academicYear),
    getMobileLessonAnalytics(user.institutionId, { studentId, academicYear }),
    getMobileCoScholasticForStudent(user.institutionId, studentId, academicYear),
    prisma.studentAnalyticsRecord.findFirst({
      where: { institutionId: user.institutionId, studentId, academicYear },
    }),
  ]);

  const scores = (analyticsRecord?.scores || {}) as Record<string, number>;
  const riskFlags = (analyticsRecord?.riskFlags || {}) as Record<string, boolean>;

  const coScholasticSummary = {
    totalActivities: coScholastic.length,
    withPerformance: coScholastic.filter((a) => a.myPerformance).length,
    recent: coScholastic.slice(0, 3).map((a) => ({
      id: a.id,
      title: a.title,
      category: a.categoryLabel,
      band: a.myPerformance?.performanceBandLabel ?? null,
    })),
  };

  return {
    studentId,
    studentName: [student.firstName, student.lastName].filter(Boolean).join(' '),
    admissionNumber: student.admissionNumber,
    classGroup: formatClassSection(student.className, student.sectionName),
    academicYear,
    date,
    attendance,
    performance: {
      academicPerformance: performance.academicPerformance,
      classTestAvg: performance.classTestAvg,
      subjectPerformance: performance.subjectPerformance.slice(0, 5),
      overallBuckets: performance.overallBuckets,
    },
    behavior: {
      behaviourScore: scores.behaviourScore ?? scores.disciplineScore ?? null,
      disciplineScore: scores.disciplineScore ?? null,
      riskFlags,
    },
    extracurricular: coScholasticSummary,
  };
}

export async function getMobileHomework(
  user: MobileAuthUser,
  opts: { studentId?: string; date?: string; academicYear?: string },
) {
  const studentId = resolveStudentId(user, opts.studentId);
  return getMobileHomeworkForStudent(user.institutionId, {
    studentId,
    date: opts.date,
    academicYear: opts.academicYear,
  });
}

export async function getMobileTimetable(
  user: MobileAuthUser,
  opts: { studentId?: string; date?: string; academicYear?: string },
) {
  const studentId = resolveStudentId(user, opts.studentId);
  const date = opts.date || new Date().toISOString().slice(0, 10);
  return getDailySchedule(user.institutionId, {
    date,
    academicYear: opts.academicYear,
    audience: 'parent',
    studentId,
    publishedOnly: true,
  });
}

export async function getMobileTests(
  user: MobileAuthUser,
  opts: { studentId?: string; academicYear?: string },
) {
  const studentId = resolveStudentId(user, opts.studentId);
  const student = await prisma.student.findFirst({
    where: { id: studentId, institutionId: user.institutionId },
    select: { className: true, sectionName: true, academicYear: true },
  });
  if (!student) throw new Error('Student not found');

  const papers = await getMobilePublishedPapers(user.institutionId, {
    academicYear: opts.academicYear || student.academicYear,
    className: student.className,
    sectionName: student.sectionName,
  });

  return { studentId, papers };
}

export async function getMobileProfile(user: MobileAuthUser, opts: { studentId?: string }) {
  const studentId = resolveStudentId(user, opts.studentId);
  const student = await prisma.student.findFirst({
    where: { id: studentId, institutionId: user.institutionId },
  });
  if (!student) throw new Error('Student not found');

  return {
    student: {
      id: student.id,
      admissionNumber: student.admissionNumber,
      name: [student.firstName, student.lastName].filter(Boolean).join(' '),
      classGroup: formatClassSection(student.className, student.sectionName),
      academicYear: student.academicYear,
      mobile: student.mobile,
      email: student.email,
      photoUrl: student.photoUrl,
      status: student.status,
    },
    parents: [
      { relationship: 'FATHER', name: student.fatherName, mobile: student.fatherMobile },
      { relationship: 'MOTHER', name: student.motherName, mobile: student.motherMobile },
    ].filter((p) => p.name.trim() || p.mobile.trim()),
    account: {
      role: user.role,
      displayName: user.displayName,
      mustResetPassword: user.mustResetPassword,
    },
  };
}

export async function listMobileConsents(user: MobileAuthUser, opts: { studentId?: string }) {
  const studentId = resolveStudentId(user, opts.studentId);

  const responses = await prisma.parentConsentResponse.findMany({
    where: { institutionId: user.institutionId, studentId },
    include: { template: true },
    orderBy: { sharedAt: 'desc' },
  });

  return {
    studentId,
    consents: responses.map((r) => ({
      ...serializeConsentResponse(r),
      template: serializeConsentTemplate(r.template),
    })),
  };
}

export async function respondMobileConsent(
  user: MobileAuthUser,
  responseId: string,
  input: { status: 'APPROVED' | 'REJECTED'; remarks?: string },
) {
  const row = await prisma.parentConsentResponse.findFirst({
    where: { id: responseId, institutionId: user.institutionId },
  });
  if (!row) throw new Error('Consent request not found');

  resolveStudentId(user, row.studentId);

  if (user.role === 'STUDENT') {
    throw new Error('Only parents can approve or reject consent requests');
  }

  const updated = await prisma.parentConsentResponse.update({
    where: { id: responseId },
    data: {
      status: input.status as ParentConsentResponseStatus,
      remarks: input.remarks?.trim() || '',
    },
  });

  return serializeConsentResponse(updated);
}

export async function submitMobileLeave(
  user: MobileAuthUser,
  input: {
    studentId?: string;
    leaveType: string;
    fromDate: string;
    toDate: string;
    reason: string;
    attachmentUrl?: string;
    academicYear?: string;
  },
) {
  const studentId = resolveStudentId(user, input.studentId);

  if (user.role === 'STUDENT') {
    throw new Error('Leave applications must be submitted by a parent');
  }

  return createLeaveApplication(user.institutionId, {
    category: 'student',
    applicantId: studentId,
    academicYear: input.academicYear,
    leaveType: input.leaveType,
    fromDate: input.fromDate,
    toDate: input.toDate,
    reason: input.reason,
    source: 'PARENT_APP',
    attachmentUrl: input.attachmentUrl,
  });
}

export async function listMobileLeaveApplications(user: MobileAuthUser, opts: { studentId?: string }) {
  const studentId = resolveStudentId(user, opts.studentId);
  const rows = await prisma.studentLeaveApplication.findMany({
    where: { institutionId: user.institutionId, studentId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return {
    studentId,
    applications: rows.map((r) => ({
      id: r.id,
      recordId: r.recordId,
      leaveType: r.leaveType,
      fromDate: r.fromDate.toISOString().slice(0, 10),
      toDate: r.toDate.toISOString().slice(0, 10),
      reason: r.reason,
      status: r.status,
      attachmentUrl: r.attachmentUrl || null,
      reviewedBy: r.reviewedBy,
      reviewerRemarks: r.reviewerRemarks,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}

export {
  getMobileFeesSummary,
  createFeePaymentOrder,
  getMobileLmsContent,
  getReminderPreferences,
  updateReminderPreferences,
  DEFAULT_REMINDER_PREFERENCES,
};

export { verifyMobileFeePayment } from './mobileFees.js';
