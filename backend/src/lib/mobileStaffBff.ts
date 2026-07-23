import { AttendanceStatus, TeacherAttendanceStatus, StaffAttendanceStatus, PublicationVisibility, ExamMarksColumnKey, Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import type { MobileAuthUser } from './mobileAuth.js';
import {
  getAttendanceMeta,
  getAttendanceRoster,
  markAttendanceSession,
} from './attendance.js';
import { getDailySchedule } from './timetable.js';
import { nextAcademicRecordId, serializeHomework } from './academicManagement.js';
import { getMobileTeacherTasks, updateMobileTeacherTask } from './teacherRoster.js';
import {
  approveLeaveApplication,
  createLeaveApplication,
  listLeaveApplications,
  rejectLeaveApplication,
} from './leaveManagement.js';
import { getMobileTeacherEvaluations, updateTeacherEvaluation } from './teacherEvaluation.js';
import { getMobileCoScholasticForTeacher } from './coScholastic.js';
import { getMobileMarkingForTeacher, saveMarkingDraft } from './examMarksEntry.js';
import { listPapersForManagement, publishPaperToMobile } from './examPaperManagement.js';

export type StaffContext = {
  kind: 'teacher' | 'staff';
  profileId: string;
  displayName: string;
  teacherName: string;
  employeeCode: string;
  department: string;
  designation: string;
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function nowTime() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const hour = parts.find((p) => p.type === 'hour')?.value ?? '08';
  const minute = parts.find((p) => p.type === 'minute')?.value ?? '00';
  return `${hour}:${minute}`;
}

export async function resolveStaffContext(user: MobileAuthUser): Promise<StaffContext> {
  if (user.role === 'TEACHER' || user.role === 'PRINCIPAL') {
    if (!user.teacherProfileId) throw new Error('Teacher profile is not linked to this account');
    const teacher = await prisma.teacherAttendanceProfile.findFirst({
      where: { id: user.teacherProfileId, institutionId: user.institutionId, isActive: true },
    });
    if (!teacher) throw new Error('Teacher profile not found');
    return {
      kind: 'teacher',
      profileId: teacher.id,
      displayName: teacher.teacherName,
      teacherName: teacher.teacherName,
      employeeCode: teacher.employeeCode,
      department: teacher.department,
      designation: teacher.designation,
    };
  }

  if (user.role === 'TRANSPORT') {
    if (!user.staffProfileId) throw new Error('Staff profile is not linked to this account');
    const staff = await prisma.staffAttendanceProfile.findFirst({
      where: { id: user.staffProfileId, institutionId: user.institutionId, isActive: true },
    });
    if (!staff) throw new Error('Staff profile not found');
    return {
      kind: 'staff',
      profileId: staff.id,
      displayName: staff.staffName,
      teacherName: staff.staffName,
      employeeCode: staff.employeeCode,
      department: staff.department,
      designation: staff.designation,
    };
  }

  throw new Error('Unsupported staff role');
}

export async function getStaffDashboard(user: MobileAuthUser) {
  const ctx = await resolveStaffContext(user);
  const academicYear = '2025-26';

  if (user.role === 'TRANSPORT') {
    const vehicles = await prisma.transportVehicle.count({
      where: { institutionId: user.institutionId, isActive: true },
    });
    return {
      role: user.role,
      displayName: ctx.displayName,
      summary: { activeVehicles: vehicles },
    };
  }

  const [tasks, pendingLeave, evaluationRecords] = await Promise.all([
    getMobileTeacherTasks(user.institutionId, ctx.teacherName, { academicYear }),
    listLeaveApplications(user.institutionId, {
      academicYear,
      category: user.role === 'PRINCIPAL' ? 'all' : ctx.kind === 'teacher' ? 'teacher' : 'staff',
      status: 'pending',
    }),
    user.role === 'PRINCIPAL'
      ? Promise.resolve([])
      : getMobileTeacherEvaluations(user.institutionId, ctx.teacherName, academicYear),
  ]);

  return {
    role: user.role,
    displayName: ctx.displayName,
    department: ctx.department,
    summary: {
      tasksPending: tasks.pending,
      tasksOverdue: tasks.overdue,
      pendingLeaveApprovals: user.role === 'PRINCIPAL' ? pendingLeave.summary.pending : 0,
      evaluationsDue: evaluationRecords.filter(
        (r) => r.status !== 'COMPLETED' && r.status !== 'PUBLISHED',
      ).length,
    },
  };
}

export async function getStaffAttendanceMetaForUser(user: MobileAuthUser) {
  return getAttendanceMeta(user.institutionId);
}

export async function getStaffAttendanceRoster(
  user: MobileAuthUser,
  opts: { className: string; sectionName?: string; date?: string },
) {
  await resolveStaffContext(user);
  return getAttendanceRoster(user.institutionId, {
    className: opts.className,
    sectionName: opts.sectionName,
    date: opts.date || todayIso(),
    mode: 'CLASS',
  });
}

export async function markStaffClassAttendance(
  user: MobileAuthUser,
  input: {
    className: string;
    sectionName?: string;
    sessionDate?: string;
    records: { studentId: string; status: AttendanceStatus; absentReason?: string }[];
  },
) {
  const ctx = await resolveStaffContext(user);
  return markAttendanceSession(user.institutionId, {
    sessionDate: input.sessionDate || todayIso(),
    className: input.className,
    sectionName: input.sectionName,
    mode: 'CLASS',
    markedBy: ctx.teacherName,
    source: 'MOBILE',
    records: input.records.map((r) => ({
      studentId: r.studentId,
      status: r.status,
      absentReason: r.absentReason,
      checkInTime: r.status === AttendanceStatus.PRESENT ? nowTime() : '',
    })),
  });
}

export async function createStaffHomework(
  user: MobileAuthUser,
  input: {
    className: string;
    sectionName: string;
    subjectName: string;
    title: string;
    description?: string;
    dueDate?: string;
    attachments?: unknown[];
    share?: boolean;
  },
) {
  const ctx = await resolveStaffContext(user);
  const now = new Date();
  const recordId = await nextAcademicRecordId(user.institutionId, 'homework');

  const studentCount = await prisma.student.count({
    where: {
      institutionId: user.institutionId,
      className: input.className,
      sectionName: input.sectionName,
      status: 'ACTIVE',
    },
  });

  const row = await prisma.academicHomework.create({
    data: {
      institutionId: user.institutionId,
      recordId,
      academicYear: '2025-26',
      term: 'Term 1',
      className: input.className,
      sectionName: input.sectionName,
      subjectName: input.subjectName,
      teacherName: ctx.teacherName,
      title: input.title,
      description: input.description || '',
      assignedDate: now,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      totalStudents: studentCount,
      attachments: (input.attachments ?? []) as Prisma.InputJsonValue,
      sharedAt: input.share ? now : null,
      publishedAt: input.share ? now : null,
      status: 'ASSIGNED',
    },
  });

  return serializeHomework(row);
}

export async function getStaffTasks(user: MobileAuthUser, opts?: { status?: string }) {
  const ctx = await resolveStaffContext(user);
  return getMobileTeacherTasks(user.institutionId, ctx.teacherName, opts);
}

export async function patchStaffTask(
  user: MobileAuthUser,
  taskId: string,
  data: {
    status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    feedbackNotes?: string;
    parentFeedbackRating?: number;
    feedbackRecorded?: boolean;
  },
) {
  const ctx = await resolveStaffContext(user);
  const task = await updateMobileTeacherTask(user.institutionId, taskId, ctx.teacherName, data);
  return task;
}

export async function getStaffSchedule(user: MobileAuthUser, date?: string) {
  const ctx = await resolveStaffContext(user);
  return getDailySchedule(user.institutionId, {
    date: date || todayIso(),
    audience: user.role === 'PRINCIPAL' ? 'principal' : 'teacher',
    teacherName: ctx.teacherName,
    publishedOnly: true,
  });
}

export async function getStaffLeaveList(user: MobileAuthUser) {
  const ctx = await resolveStaffContext(user);
  const category = ctx.kind === 'teacher' ? 'teacher' : 'staff';
  const data = await listLeaveApplications(user.institutionId, {
    academicYear: '2025-26',
    category,
  });
  const profileId = ctx.profileId;
  return {
    items: data.items.filter((item) => item.applicantId === profileId),
  };
}

export async function submitStaffLeave(
  user: MobileAuthUser,
  input: { leaveType: string; fromDate: string; toDate: string; reason: string },
) {
  const ctx = await resolveStaffContext(user);
  return createLeaveApplication(user.institutionId, {
    category: ctx.kind === 'teacher' ? 'teacher' : 'staff',
    applicantId: ctx.profileId,
    leaveType: input.leaveType,
    fromDate: input.fromDate,
    toDate: input.toDate,
    reason: input.reason,
    source: 'STAFF_MOBILE',
  });
}

export async function getStaffEvaluations(user: MobileAuthUser, academicYear?: string) {
  const ctx = await resolveStaffContext(user);
  const records = await getMobileTeacherEvaluations(
    user.institutionId,
    ctx.teacherName,
    academicYear,
  );
  return { records, total: records.length };
}

export async function patchStaffEvaluation(
  user: MobileAuthUser,
  id: string,
  data: Record<string, unknown>,
) {
  await resolveStaffContext(user);
  return updateTeacherEvaluation(user.institutionId, id, data);
}

export async function getStaffCoScholastic(user: MobileAuthUser, academicYear?: string) {
  const ctx = await resolveStaffContext(user);
  return getMobileCoScholasticForTeacher(user.institutionId, ctx.teacherName, academicYear);
}

export async function getStaffMarksEntry(user: MobileAuthUser, academicYear?: string) {
  const ctx = await resolveStaffContext(user);
  return getMobileMarkingForTeacher(user.institutionId, ctx.teacherName, academicYear);
}

export async function saveStaffMarksDraft(
  user: MobileAuthUser,
  sheetId: string,
  entries: {
    studentId: string;
    columnKey: ExamMarksColumnKey;
    marksObtained?: number | null;
    isAbsent?: boolean;
    remarks?: string;
  }[],
) {
  await resolveStaffContext(user);
  return saveMarkingDraft(user.institutionId, sheetId, entries);
}

export async function getStaffExamPapers(user: MobileAuthUser, academicYear?: string) {
  await resolveStaffContext(user);
  const result = await listPapersForManagement(user.institutionId, {
    academicYear: academicYear || '2025-26',
  });
  return {
    papers: result.papers,
  };
}

export async function publishStaffExamPaper(user: MobileAuthUser, paperId: string) {
  const ctx = await resolveStaffContext(user);
  return publishPaperToMobile(user.institutionId, paperId, {
    visibleOn: PublicationVisibility.BOTH,
    publishedBy: ctx.teacherName,
  });
}

export async function recordStaffSelfAttendance(
  user: MobileAuthUser,
  input?: { latitude?: number; longitude?: number; remarks?: string },
) {
  const ctx = await resolveStaffContext(user);
  const recordDate = new Date();
  recordDate.setHours(0, 0, 0, 0);
  const checkInTime = nowTime();
  const remarks = input?.remarks || '';
  const geoNote =
    input?.latitude !== undefined && input?.longitude !== undefined
      ? `Geo: ${input.latitude.toFixed(5)}, ${input.longitude.toFixed(5)}`
      : '';

  if (ctx.kind === 'teacher') {
    const row = await prisma.teacherAttendanceDailyRecord.upsert({
      where: {
        teacherProfileId_recordDate: { teacherProfileId: ctx.profileId, recordDate },
      },
      create: {
        institutionId: user.institutionId,
        teacherProfileId: ctx.profileId,
        academicYear: '2025-26',
        recordDate,
        status: TeacherAttendanceStatus.PRESENT,
        teacherRemarks: [remarks, geoNote].filter(Boolean).join(' · '),
        checkInTime,
        checkOutTime: '',
        source: 'MOBILE',
        markedAt: new Date(),
      },
      update: {
        status: TeacherAttendanceStatus.PRESENT,
        teacherRemarks: [remarks, geoNote].filter(Boolean).join(' · '),
        checkInTime,
        source: 'MOBILE',
        markedAt: new Date(),
      },
    });
    return { ok: true, profileKind: 'teacher', recordDate: recordDate.toISOString().slice(0, 10), status: row.status };
  }

  const row = await prisma.staffAttendanceDailyRecord.upsert({
    where: {
      staffProfileId_recordDate: { staffProfileId: ctx.profileId, recordDate },
    },
    create: {
      institutionId: user.institutionId,
      staffProfileId: ctx.profileId,
      academicYear: '2025-26',
      recordDate,
      status: StaffAttendanceStatus.PRESENT,
      staffRemarks: [remarks, geoNote].filter(Boolean).join(' · '),
      checkInTime,
      checkOutTime: '',
      source: 'MOBILE',
      markedAt: new Date(),
    },
    update: {
      status: StaffAttendanceStatus.PRESENT,
      staffRemarks: [remarks, geoNote].filter(Boolean).join(' · '),
      checkInTime,
      source: 'MOBILE',
      markedAt: new Date(),
    },
  });
  return { ok: true, profileKind: 'staff', recordDate: recordDate.toISOString().slice(0, 10), status: row.status };
}

export async function getPrincipalPendingLeaves(user: MobileAuthUser) {
  if (user.role !== 'PRINCIPAL') throw new Error('Only principals can view approval queue');
  return listLeaveApplications(user.institutionId, {
    academicYear: '2025-26',
    status: 'pending',
  });
}

export async function approvePrincipalLeave(
  user: MobileAuthUser,
  input: { category: 'student' | 'teacher' | 'staff'; id: string; remarks?: string },
) {
  if (user.role !== 'PRINCIPAL') throw new Error('Only principals can approve leave');
  const ctx = await resolveStaffContext(user);
  return approveLeaveApplication(user.institutionId, {
    category: input.category,
    id: input.id,
    reviewedBy: ctx.teacherName,
    reviewerRemarks: input.remarks,
  });
}

export async function rejectPrincipalLeave(
  user: MobileAuthUser,
  input: { category: 'student' | 'teacher' | 'staff'; id: string; remarks?: string },
) {
  if (user.role !== 'PRINCIPAL') throw new Error('Only principals can reject leave');
  const ctx = await resolveStaffContext(user);
  return rejectLeaveApplication(user.institutionId, {
    category: input.category,
    id: input.id,
    reviewedBy: ctx.teacherName,
    reviewerRemarks: input.remarks?.trim() || 'Rejected via mobile app',
  });
}
