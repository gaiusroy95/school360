import {
  AttendanceSessionMode,
  AttendanceStatus,
  LeaveApplicationStatus,
  StaffAttendanceStatus,
  StudentStatus,
  TeacherAttendanceStatus,
} from '@prisma/client';
import { prisma } from './prisma.js';
import { formatClassSection, getInstitutionFilterMeta } from './students.js';

export type LeaveCategory = 'student' | 'teacher' | 'staff' | 'all';
export type LeaveStatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

const LEAVE_TYPE_LABELS: Record<string, string> = {
  GENERAL: 'General Leave',
  PLANNED: 'Planned Leave',
  MEDICAL: 'Medical Leave',
  CASUAL: 'Casual Leave',
  OTHER: 'Other',
};

const STATUS_LABELS: Record<LeaveApplicationStatus, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

function parseDateOnly(value: string | Date): Date {
  if (value instanceof Date) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  }
  const m = String(value).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  throw new Error('Invalid date');
}

function formatDateIso(d: Date) {
  return d.toISOString().slice(0, 10);
}

function listDatesInclusive(from: Date, to: Date) {
  const dates: Date[] = [];
  const cur = new Date(from);
  while (cur <= to) {
    dates.push(new Date(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}

function countLeaveDays(from: Date, to: Date) {
  return listDatesInclusive(from, to).length;
}

function statusFilterWhere(status?: LeaveStatusFilter): LeaveApplicationStatus | undefined {
  if (!status || status === 'all') return undefined;
  if (status === 'pending') return LeaveApplicationStatus.PENDING;
  if (status === 'approved') return LeaveApplicationStatus.APPROVED;
  return LeaveApplicationStatus.REJECTED;
}

async function nextRecordId(institutionId: string, prefix: string, model: 'student' | 'teacher' | 'staff') {
  const count = model === 'student'
    ? await prisma.studentLeaveApplication.count({ where: { institutionId } })
    : model === 'teacher'
      ? await prisma.teacherLeaveApplication.count({ where: { institutionId } })
      : await prisma.staffLeaveApplication.count({ where: { institutionId } });
  return `${prefix}-${String(1000 + count + 1)}`;
}

function serializeStudentLeave(row: Awaited<ReturnType<typeof fetchStudentLeaves>>[number]) {
  return {
    id: row.id,
    recordId: row.recordId,
    category: 'student' as const,
    categoryLabel: 'Student',
    applicantId: row.studentId,
    applicantName: `${row.student.firstName} ${row.student.lastName}`.trim(),
    admissionNumber: row.student.admissionNumber,
    classGroup: formatClassSection(row.student.className, row.student.sectionName),
    designation: formatClassSection(row.student.className, row.student.sectionName),
    department: row.student.sectionName || row.student.className,
    leaveType: row.leaveType,
    leaveTypeLabel: LEAVE_TYPE_LABELS[row.leaveType] || row.leaveType,
    fromDate: formatDateIso(row.fromDate),
    toDate: formatDateIso(row.toDate),
    totalDays: countLeaveDays(row.fromDate, row.toDate),
    reason: row.reason,
    status: row.status,
    statusLabel: STATUS_LABELS[row.status],
    reviewedBy: row.reviewedBy,
    reviewerRemarks: row.reviewerRemarks,
    source: row.source,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    mobile: row.student.mobile,
    email: row.student.email,
  };
}

async function fetchStudentLeaves(
  institutionId: string,
  opts: { academicYear: string; status?: LeaveApplicationStatus; q?: string },
) {
  return prisma.studentLeaveApplication.findMany({
    where: {
      institutionId,
      academicYear: opts.academicYear,
      ...(opts.status ? { status: opts.status } : {}),
      ...(opts.q
        ? {
            OR: [
              { reason: { contains: opts.q, mode: 'insensitive' } },
              { student: { firstName: { contains: opts.q, mode: 'insensitive' } } },
              { student: { lastName: { contains: opts.q, mode: 'insensitive' } } },
              { student: { admissionNumber: { contains: opts.q, mode: 'insensitive' } } },
            ],
          }
        : {}),
    },
    include: { student: true },
    orderBy: [{ createdAt: 'desc' }],
  });
}

function serializeTeacherLeave(row: Awaited<ReturnType<typeof fetchTeacherLeaves>>[number]) {
  return {
    id: row.id,
    recordId: row.recordId,
    category: 'teacher' as const,
    categoryLabel: 'Teacher',
    applicantId: row.teacherProfileId,
    applicantName: row.teacherProfile.teacherName,
    admissionNumber: row.teacherProfile.employeeCode,
    classGroup: row.teacherProfile.department,
    designation: row.teacherProfile.designation,
    department: row.teacherProfile.department,
    leaveType: row.leaveType,
    leaveTypeLabel: LEAVE_TYPE_LABELS[row.leaveType] || row.leaveType,
    fromDate: formatDateIso(row.fromDate),
    toDate: formatDateIso(row.toDate),
    totalDays: countLeaveDays(row.fromDate, row.toDate),
    reason: row.reason,
    status: row.status,
    statusLabel: STATUS_LABELS[row.status],
    reviewedBy: row.reviewedBy,
    reviewerRemarks: row.reviewerRemarks,
    source: row.source,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    mobile: row.teacherProfile.mobile,
    email: row.teacherProfile.email,
  };
}

async function fetchTeacherLeaves(
  institutionId: string,
  opts: { academicYear: string; status?: LeaveApplicationStatus; q?: string },
) {
  return prisma.teacherLeaveApplication.findMany({
    where: {
      institutionId,
      academicYear: opts.academicYear,
      ...(opts.status ? { status: opts.status } : {}),
      ...(opts.q
        ? {
            OR: [
              { reason: { contains: opts.q, mode: 'insensitive' } },
              { teacherProfile: { teacherName: { contains: opts.q, mode: 'insensitive' } } },
              { teacherProfile: { employeeCode: { contains: opts.q, mode: 'insensitive' } } },
            ],
          }
        : {}),
    },
    include: { teacherProfile: true },
    orderBy: [{ createdAt: 'desc' }],
  });
}

function serializeStaffLeave(row: Awaited<ReturnType<typeof fetchStaffLeaves>>[number]) {
  return {
    id: row.id,
    recordId: row.recordId,
    category: 'staff' as const,
    categoryLabel: 'Staff',
    applicantId: row.staffProfileId,
    applicantName: row.staffProfile.staffName,
    admissionNumber: row.staffProfile.employeeCode,
    classGroup: row.staffProfile.department,
    designation: row.staffProfile.designation,
    department: row.staffProfile.department,
    leaveType: row.leaveType,
    leaveTypeLabel: LEAVE_TYPE_LABELS[row.leaveType] || row.leaveType,
    fromDate: formatDateIso(row.fromDate),
    toDate: formatDateIso(row.toDate),
    totalDays: countLeaveDays(row.fromDate, row.toDate),
    reason: row.reason,
    status: row.status,
    statusLabel: STATUS_LABELS[row.status],
    reviewedBy: row.reviewedBy,
    reviewerRemarks: row.reviewerRemarks,
    source: row.source,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    mobile: row.staffProfile.mobile,
    email: row.staffProfile.email,
  };
}

async function fetchStaffLeaves(
  institutionId: string,
  opts: { academicYear: string; status?: LeaveApplicationStatus; q?: string },
) {
  return prisma.staffLeaveApplication.findMany({
    where: {
      institutionId,
      academicYear: opts.academicYear,
      ...(opts.status ? { status: opts.status } : {}),
      ...(opts.q
        ? {
            OR: [
              { reason: { contains: opts.q, mode: 'insensitive' } },
              { staffProfile: { staffName: { contains: opts.q, mode: 'insensitive' } } },
              { staffProfile: { employeeCode: { contains: opts.q, mode: 'insensitive' } } },
            ],
          }
        : {}),
    },
    include: { staffProfile: true },
    orderBy: [{ createdAt: 'desc' }],
  });
}

export async function getLeaveManagementMeta(institutionId: string) {
  const filters = await getInstitutionFilterMeta(institutionId);
  const [students, teachers, staff] = await Promise.all([
    prisma.student.findMany({
      where: { institutionId, academicYear: filters.defaultAcademicYear, status: StudentStatus.ACTIVE },
      select: { id: true, admissionNumber: true, firstName: true, lastName: true, className: true, sectionName: true },
      orderBy: [{ className: 'asc' }, { firstName: 'asc' }],
      take: 500,
    }),
    prisma.teacherAttendanceProfile.findMany({
      where: { institutionId, academicYear: filters.defaultAcademicYear, isActive: true },
      select: { id: true, teacherName: true, employeeCode: true, department: true, designation: true },
      orderBy: { teacherName: 'asc' },
    }),
    prisma.staffAttendanceProfile.findMany({
      where: { institutionId, academicYear: filters.defaultAcademicYear, isActive: true },
      select: { id: true, staffName: true, employeeCode: true, department: true, designation: true },
      orderBy: { staffName: 'asc' },
    }),
  ]);

  return {
    defaultAcademicYear: filters.defaultAcademicYear,
    academicYears: filters.academicYears,
    leaveTypes: [
      { id: 'PLANNED', label: 'Planned Leave' },
      { id: 'MEDICAL', label: 'Medical Leave' },
      { id: 'CASUAL', label: 'Casual Leave' },
      { id: 'GENERAL', label: 'General Leave' },
      { id: 'OTHER', label: 'Other' },
    ],
    students: students.map((s) => ({
      id: s.id,
      name: `${s.firstName} ${s.lastName}`.trim(),
      admissionNumber: s.admissionNumber,
      classGroup: formatClassSection(s.className, s.sectionName),
    })),
    teachers: teachers.map((t) => ({
      id: t.id,
      name: t.teacherName,
      employeeCode: t.employeeCode,
      department: t.department,
      designation: t.designation,
    })),
    staff: staff.map((s) => ({
      id: s.id,
      name: s.staffName,
      employeeCode: s.employeeCode,
      department: s.department,
      designation: s.designation,
    })),
  };
}

export async function listLeaveApplications(
  institutionId: string,
  opts: {
    academicYear?: string;
    category?: LeaveCategory;
    status?: LeaveStatusFilter;
    q?: string;
  },
) {
  const academicYear = opts.academicYear || '2025-26';
  const status = statusFilterWhere(opts.status);
  const category = opts.category || 'all';
  const q = opts.q?.trim();

  const items = [];

  if (category === 'all' || category === 'student') {
    const rows = await fetchStudentLeaves(institutionId, { academicYear, status, q });
    items.push(...rows.map(serializeStudentLeave));
  }
  if (category === 'all' || category === 'teacher') {
    const rows = await fetchTeacherLeaves(institutionId, { academicYear, status, q });
    items.push(...rows.map(serializeTeacherLeave));
  }
  if (category === 'all' || category === 'staff') {
    const rows = await fetchStaffLeaves(institutionId, { academicYear, status, q });
    items.push(...rows.map(serializeStaffLeave));
  }

  items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const summary = {
    total: items.length,
    pending: items.filter((i) => i.status === LeaveApplicationStatus.PENDING).length,
    approved: items.filter((i) => i.status === LeaveApplicationStatus.APPROVED).length,
    rejected: items.filter((i) => i.status === LeaveApplicationStatus.REJECTED).length,
    students: items.filter((i) => i.category === 'student').length,
    teachers: items.filter((i) => i.category === 'teacher').length,
    staff: items.filter((i) => i.category === 'staff').length,
  };

  return { academicYear, items, summary };
}

async function applyStudentLeaveToAttendance(
  institutionId: string,
  studentId: string,
  academicYear: string,
  fromDate: Date,
  toDate: Date,
) {
  const student = await prisma.student.findFirst({ where: { id: studentId, institutionId } });
  if (!student) return;

  for (const date of listDatesInclusive(fromDate, toDate)) {
    const session = await prisma.attendanceSession.upsert({
      where: {
        institutionId_sessionDate_className_sectionName_mode_subjectName_activityName: {
          institutionId,
          sessionDate: date,
          className: student.className,
          sectionName: student.sectionName,
          mode: AttendanceSessionMode.CLASS,
          subjectName: '',
          activityName: '',
        },
      },
      create: {
        institutionId,
        recordId: `LV-SES-${formatDateIso(date)}-${student.className}`.slice(0, 40),
        academicYear,
        sessionDate: date,
        className: student.className,
        sectionName: student.sectionName,
        mode: AttendanceSessionMode.CLASS,
        markedBy: 'Leave Management',
        source: 'LEAVE_APPROVAL',
      },
      update: {},
    });

    await prisma.attendanceRecord.upsert({
      where: { sessionId_studentId: { sessionId: session.id, studentId } },
      create: {
        sessionId: session.id,
        studentId,
        status: AttendanceStatus.ON_LEAVE,
        absentReason: 'Approved leave',
      },
      update: { status: AttendanceStatus.ON_LEAVE, absentReason: 'Approved leave' },
    });
  }
}

function teacherStatusForLeaveType(leaveType: string): TeacherAttendanceStatus {
  if (leaveType === 'MEDICAL') return TeacherAttendanceStatus.MEDICAL_LEAVE_ABSENT;
  if (leaveType === 'PLANNED' || leaveType === 'CASUAL') return TeacherAttendanceStatus.PLANNED_LEAVE_ABSENT;
  return TeacherAttendanceStatus.PLANNED_LEAVE_ABSENT;
}

function staffStatusForLeaveType(leaveType: string): StaffAttendanceStatus {
  if (leaveType === 'MEDICAL') return StaffAttendanceStatus.MEDICAL_LEAVE_ABSENT;
  if (leaveType === 'PLANNED' || leaveType === 'CASUAL') return StaffAttendanceStatus.PLANNED_LEAVE_ABSENT;
  return StaffAttendanceStatus.PLANNED_LEAVE_ABSENT;
}

async function applyTeacherLeaveToAttendance(
  institutionId: string,
  teacherProfileId: string,
  academicYear: string,
  leaveType: string,
  fromDate: Date,
  toDate: Date,
) {
  const status = teacherStatusForLeaveType(leaveType);
  for (const date of listDatesInclusive(fromDate, toDate)) {
    await prisma.teacherAttendanceDailyRecord.upsert({
      where: { teacherProfileId_recordDate: { teacherProfileId, recordDate: date } },
      create: {
        institutionId,
        teacherProfileId,
        academicYear,
        recordDate: date,
        status,
        teacherRemarks: 'Approved leave',
        source: 'LEAVE_APPROVAL',
      },
      update: { status, teacherRemarks: 'Approved leave', source: 'LEAVE_APPROVAL' },
    });
  }
}

async function applyStaffLeaveToAttendance(
  institutionId: string,
  staffProfileId: string,
  academicYear: string,
  leaveType: string,
  fromDate: Date,
  toDate: Date,
) {
  const status = staffStatusForLeaveType(leaveType);
  for (const date of listDatesInclusive(fromDate, toDate)) {
    await prisma.staffAttendanceDailyRecord.upsert({
      where: { staffProfileId_recordDate: { staffProfileId, recordDate: date } },
      create: {
        institutionId,
        staffProfileId,
        academicYear,
        recordDate: date,
        status,
        staffRemarks: 'Approved leave',
        source: 'LEAVE_APPROVAL',
      },
      update: { status, staffRemarks: 'Approved leave', source: 'LEAVE_APPROVAL' },
    });
  }
}

export async function createLeaveApplication(
  institutionId: string,
  input: {
    category: 'student' | 'teacher' | 'staff';
    applicantId: string;
    academicYear?: string;
    leaveType?: string;
    fromDate: string;
    toDate: string;
    reason: string;
    source?: string;
    attachmentUrl?: string;
  },
) {
  const academicYear = input.academicYear || '2025-26';
  const fromDate = parseDateOnly(input.fromDate);
  const toDate = parseDateOnly(input.toDate);
  if (toDate < fromDate) throw new Error('To date must be on or after from date');

  if (input.category === 'student') {
    const row = await prisma.studentLeaveApplication.create({
      data: {
        institutionId,
        recordId: await nextRecordId(institutionId, 'LV-STU', 'student'),
        studentId: input.applicantId,
        academicYear,
        leaveType: input.leaveType || 'GENERAL',
        fromDate,
        toDate,
        reason: input.reason,
        source: input.source || 'ADMIN',
        attachmentUrl: input.attachmentUrl || '',
      },
      include: { student: true },
    });
    return serializeStudentLeave(row);
  }

  if (input.category === 'teacher') {
    const row = await prisma.teacherLeaveApplication.create({
      data: {
        institutionId,
        recordId: await nextRecordId(institutionId, 'LV-TCH', 'teacher'),
        teacherProfileId: input.applicantId,
        academicYear,
        leaveType: input.leaveType || 'PLANNED',
        fromDate,
        toDate,
        reason: input.reason,
        source: input.source || 'ADMIN',
      },
      include: { teacherProfile: true },
    });
    return serializeTeacherLeave(row);
  }

  const row = await prisma.staffLeaveApplication.create({
    data: {
      institutionId,
      recordId: await nextRecordId(institutionId, 'LV-STF', 'staff'),
      staffProfileId: input.applicantId,
      academicYear,
      leaveType: input.leaveType || 'PLANNED',
      fromDate,
      toDate,
      reason: input.reason,
      source: input.source || 'ADMIN',
    },
    include: { staffProfile: true },
  });
  return serializeStaffLeave(row);
}

export async function approveLeaveApplication(
  institutionId: string,
  input: {
    category: 'student' | 'teacher' | 'staff';
    id: string;
    reviewedBy: string;
    reviewerRemarks?: string;
  },
) {
  const reviewedAt = new Date();
  const remarks = input.reviewerRemarks || '';

  if (input.category === 'student') {
    const existing = await prisma.studentLeaveApplication.findFirst({
      where: { id: input.id, institutionId },
      include: { student: true },
    });
    if (!existing) throw new Error('Leave application not found');
    if (existing.status !== LeaveApplicationStatus.PENDING) throw new Error('Only pending applications can be approved');

    const row = await prisma.studentLeaveApplication.update({
      where: { id: input.id },
      data: {
        status: LeaveApplicationStatus.APPROVED,
        reviewedBy: input.reviewedBy,
        reviewerRemarks: remarks,
        reviewedAt,
      },
      include: { student: true },
    });
    await applyStudentLeaveToAttendance(
      institutionId,
      row.studentId,
      row.academicYear,
      row.fromDate,
      row.toDate,
    );
    return serializeStudentLeave(row);
  }

  if (input.category === 'teacher') {
    const existing = await prisma.teacherLeaveApplication.findFirst({
      where: { id: input.id, institutionId },
    });
    if (!existing) throw new Error('Leave application not found');
    if (existing.status !== LeaveApplicationStatus.PENDING) throw new Error('Only pending applications can be approved');

    const row = await prisma.teacherLeaveApplication.update({
      where: { id: input.id },
      data: {
        status: LeaveApplicationStatus.APPROVED,
        reviewedBy: input.reviewedBy,
        reviewerRemarks: remarks,
        reviewedAt,
      },
      include: { teacherProfile: true },
    });
    await applyTeacherLeaveToAttendance(
      institutionId,
      row.teacherProfileId,
      row.academicYear,
      row.leaveType,
      row.fromDate,
      row.toDate,
    );
    return serializeTeacherLeave(row);
  }

  const existing = await prisma.staffLeaveApplication.findFirst({
    where: { id: input.id, institutionId },
  });
  if (!existing) throw new Error('Leave application not found');
  if (existing.status !== LeaveApplicationStatus.PENDING) throw new Error('Only pending applications can be approved');

  const row = await prisma.staffLeaveApplication.update({
    where: { id: input.id },
    data: {
      status: LeaveApplicationStatus.APPROVED,
      reviewedBy: input.reviewedBy,
      reviewerRemarks: remarks,
      reviewedAt,
    },
    include: { staffProfile: true },
  });
  await applyStaffLeaveToAttendance(
    institutionId,
    row.staffProfileId,
    row.academicYear,
    row.leaveType,
    row.fromDate,
    row.toDate,
  );
  return serializeStaffLeave(row);
}

export async function rejectLeaveApplication(
  institutionId: string,
  input: {
    category: 'student' | 'teacher' | 'staff';
    id: string;
    reviewedBy: string;
    reviewerRemarks: string;
  },
) {
  if (!input.reviewerRemarks.trim()) throw new Error('Rejection remarks are required');
  const reviewedAt = new Date();

  if (input.category === 'student') {
    const existing = await prisma.studentLeaveApplication.findFirst({ where: { id: input.id, institutionId } });
    if (!existing) throw new Error('Leave application not found');
    if (existing.status !== LeaveApplicationStatus.PENDING) throw new Error('Only pending applications can be rejected');
    const row = await prisma.studentLeaveApplication.update({
      where: { id: input.id },
      data: {
        status: LeaveApplicationStatus.REJECTED,
        reviewedBy: input.reviewedBy,
        reviewerRemarks: input.reviewerRemarks,
        reviewedAt,
      },
      include: { student: true },
    });
    return serializeStudentLeave(row);
  }

  if (input.category === 'teacher') {
    const existing = await prisma.teacherLeaveApplication.findFirst({ where: { id: input.id, institutionId } });
    if (!existing) throw new Error('Leave application not found');
    if (existing.status !== LeaveApplicationStatus.PENDING) throw new Error('Only pending applications can be rejected');
    const row = await prisma.teacherLeaveApplication.update({
      where: { id: input.id },
      data: {
        status: LeaveApplicationStatus.REJECTED,
        reviewedBy: input.reviewedBy,
        reviewerRemarks: input.reviewerRemarks,
        reviewedAt,
      },
      include: { teacherProfile: true },
    });
    return serializeTeacherLeave(row);
  }

  const existing = await prisma.staffLeaveApplication.findFirst({ where: { id: input.id, institutionId } });
  if (!existing) throw new Error('Leave application not found');
  if (existing.status !== LeaveApplicationStatus.PENDING) throw new Error('Only pending applications can be rejected');
  const row = await prisma.staffLeaveApplication.update({
    where: { id: input.id },
    data: {
      status: LeaveApplicationStatus.REJECTED,
      reviewedBy: input.reviewedBy,
      reviewerRemarks: input.reviewerRemarks,
      reviewedAt,
    },
    include: { staffProfile: true },
  });
  return serializeStaffLeave(row);
}

export async function seedLeaveApplicationsDemo(institutionId: string, academicYear = '2025-26') {
  const [students, teachers, staff] = await Promise.all([
    prisma.student.findMany({
      where: { institutionId, academicYear, status: StudentStatus.ACTIVE },
      take: 8,
    }),
    prisma.teacherAttendanceProfile.findMany({
      where: { institutionId, academicYear, isActive: true },
      take: 5,
    }),
    prisma.staffAttendanceProfile.findMany({
      where: { institutionId, academicYear, isActive: true },
      take: 5,
    }),
  ]);

  const reasons = [
    'Family function — need to travel out of station',
    'Medical appointment — doctor visit scheduled',
    'Personal work — urgent family matter',
    'Fever and cold — advised rest by doctor',
    'Sibling wedding ceremony',
  ];
  const statuses = [
    LeaveApplicationStatus.PENDING,
    LeaveApplicationStatus.APPROVED,
    LeaveApplicationStatus.REJECTED,
  ];
  let created = 0;

  const today = new Date();
  const mkDate = (offset: number) => {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + offset));
    return d;
  };

  for (let i = 0; i < students.length; i++) {
    const s = students[i];
    const from = mkDate(i + 1);
    const to = mkDate(i + (i % 2 === 0 ? 2 : 1));
    const status = statuses[i % statuses.length];
    await prisma.studentLeaveApplication.upsert({
      where: { institutionId_recordId: { institutionId, recordId: `LV-STU-DEMO-${i + 1}` } },
      create: {
        institutionId,
        recordId: `LV-STU-DEMO-${i + 1}`,
        studentId: s.id,
        academicYear,
        leaveType: i % 3 === 0 ? 'MEDICAL' : 'GENERAL',
        fromDate: from,
        toDate: to,
        reason: reasons[i % reasons.length],
        status,
        source: 'PARENT_APP',
        reviewedBy: status !== LeaveApplicationStatus.PENDING ? 'Principal' : '',
        reviewerRemarks: status === LeaveApplicationStatus.REJECTED ? 'Insufficient documentation provided' : '',
        reviewedAt: status !== LeaveApplicationStatus.PENDING ? new Date() : null,
      },
      update: {},
    });
    created += 1;
  }

  for (let i = 0; i < teachers.length; i++) {
    const t = teachers[i];
    const from = mkDate(i + 3);
    const to = mkDate(i + 4);
    const status = statuses[(i + 1) % statuses.length];
    await prisma.teacherLeaveApplication.upsert({
      where: { institutionId_recordId: { institutionId, recordId: `LV-TCH-DEMO-${i + 1}` } },
      create: {
        institutionId,
        recordId: `LV-TCH-DEMO-${i + 1}`,
        teacherProfileId: t.id,
        academicYear,
        leaveType: i % 2 === 0 ? 'PLANNED' : 'MEDICAL',
        fromDate: from,
        toDate: to,
        reason: reasons[(i + 1) % reasons.length],
        status,
        source: 'MOBILE',
        reviewedBy: status !== LeaveApplicationStatus.PENDING ? 'HR Admin' : '',
        reviewerRemarks: status === LeaveApplicationStatus.REJECTED ? 'Substitute not arranged' : '',
        reviewedAt: status !== LeaveApplicationStatus.PENDING ? new Date() : null,
      },
      update: {},
    });
    created += 1;
  }

  for (let i = 0; i < staff.length; i++) {
    const s = staff[i];
    const from = mkDate(i + 5);
    const to = mkDate(i + 6);
    const status = statuses[(i + 2) % statuses.length];
    await prisma.staffLeaveApplication.upsert({
      where: { institutionId_recordId: { institutionId, recordId: `LV-STF-DEMO-${i + 1}` } },
      create: {
        institutionId,
        recordId: `LV-STF-DEMO-${i + 1}`,
        staffProfileId: s.id,
        academicYear,
        leaveType: 'CASUAL',
        fromDate: from,
        toDate: to,
        reason: reasons[(i + 2) % reasons.length],
        status,
        source: 'MOBILE',
        reviewedBy: status !== LeaveApplicationStatus.PENDING ? 'HR Admin' : '',
        reviewerRemarks: status === LeaveApplicationStatus.REJECTED ? 'Peak workload period' : '',
        reviewedAt: status !== LeaveApplicationStatus.PENDING ? new Date() : null,
      },
      update: {},
    });
    created += 1;
  }

  return { created, students: students.length, teachers: teachers.length, staff: staff.length };
}
