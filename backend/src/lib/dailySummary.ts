import {
  AttendanceSessionMode,
  AttendanceStatus,
  StaffAttendanceStatus,
  StudentStatus,
  TeacherAttendanceStatus,
} from '@prisma/client';
import { prisma } from './prisma.js';
import { formatClassSection, getInstitutionFilterMeta } from './students.js';
import { TEACHER_ATTENDANCE_SECTIONS } from './teacherAttendance.js';
import { STAFF_ATTENDANCE_SECTIONS } from './staffAttendance.js';

const STUDENT_STATUS_LABEL: Record<AttendanceStatus, string> = {
  PRESENT: 'Present',
  ABSENT: 'Absent',
  LATE: 'Late',
  ON_LEAVE: 'On Leave',
  HALF_DAY: 'Half Day',
};

const TEACHER_STATUS_LABEL: Record<TeacherAttendanceStatus, string> = {
  PRESENT: 'Present',
  PLANNED_LEAVE_ABSENT: 'On Leave',
  MEDICAL_LEAVE_ABSENT: 'Medical Leave',
  UNPLANNED_ABSENT: 'Absent',
  UNPLANNED_NOT_INTIMATED: 'Not Intimated',
};

const STAFF_STATUS_LABEL: Record<StaffAttendanceStatus, string> = {
  PRESENT: 'Present',
  PLANNED_LEAVE_ABSENT: 'On Leave',
  MEDICAL_LEAVE_ABSENT: 'Medical Leave',
  UNPLANNED_ABSENT: 'Absent',
  UNPLANNED_NOT_INTIMATED: 'Not Intimated',
};

function parseDateOnly(value?: string | Date): Date {
  if (value instanceof Date) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  }
  const raw = String(value || '').trim();
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function formatDateIso(d: Date) {
  return d.toISOString().slice(0, 10);
}

function pct(count: number, total: number) {
  if (!total) return 0;
  return Math.round((count / total) * 1000) / 10;
}

type StatusBucket = {
  total: number;
  present: number;
  absent: number;
  late: number;
  onLeave: number;
  medical: number;
  notIntimated: number;
  unmarked: number;
};

function emptyBucket(): StatusBucket {
  return {
    total: 0,
    present: 0,
    absent: 0,
    late: 0,
    onLeave: 0,
    medical: 0,
    notIntimated: 0,
    unmarked: 0,
  };
}

function bucketFromTeacherStatus(bucket: StatusBucket, status?: TeacherAttendanceStatus) {
  bucket.total += 1;
  if (!status) {
    bucket.unmarked += 1;
    return;
  }
  if (status === TeacherAttendanceStatus.PRESENT) bucket.present += 1;
  else if (status === TeacherAttendanceStatus.PLANNED_LEAVE_ABSENT) bucket.onLeave += 1;
  else if (status === TeacherAttendanceStatus.MEDICAL_LEAVE_ABSENT) bucket.medical += 1;
  else if (status === TeacherAttendanceStatus.UNPLANNED_ABSENT) bucket.absent += 1;
  else if (status === TeacherAttendanceStatus.UNPLANNED_NOT_INTIMATED) bucket.notIntimated += 1;
}

function bucketFromStaffStatus(bucket: StatusBucket, status?: StaffAttendanceStatus) {
  bucket.total += 1;
  if (!status) {
    bucket.unmarked += 1;
    return;
  }
  if (status === StaffAttendanceStatus.PRESENT) bucket.present += 1;
  else if (status === StaffAttendanceStatus.PLANNED_LEAVE_ABSENT) bucket.onLeave += 1;
  else if (status === StaffAttendanceStatus.MEDICAL_LEAVE_ABSENT) bucket.medical += 1;
  else if (status === StaffAttendanceStatus.UNPLANNED_ABSENT) bucket.absent += 1;
  else if (status === StaffAttendanceStatus.UNPLANNED_NOT_INTIMATED) bucket.notIntimated += 1;
}

function bucketFromStudentStatus(bucket: StatusBucket, status?: AttendanceStatus) {
  bucket.total += 1;
  if (!status) {
    bucket.unmarked += 1;
    return;
  }
  if (status === AttendanceStatus.PRESENT) bucket.present += 1;
  else if (status === AttendanceStatus.ABSENT) bucket.absent += 1;
  else if (status === AttendanceStatus.LATE) bucket.late += 1;
  else if (status === AttendanceStatus.ON_LEAVE) bucket.onLeave += 1;
  else if (status === AttendanceStatus.HALF_DAY) bucket.onLeave += 1;
}

function serializeBucket(bucket: StatusBucket) {
  const marked = bucket.total - bucket.unmarked;
  return {
    ...bucket,
    marked,
    presentPercent: pct(bucket.present + bucket.late, bucket.total),
    absentPercent: pct(bucket.absent + bucket.notIntimated, bucket.total),
    onLeavePercent: pct(bucket.onLeave + bucket.medical, bucket.total),
  };
}

async function resolveLatestDate(institutionId: string, academicYear: string) {
  const [studentLatest, teacherLatest, staffLatest] = await Promise.all([
    prisma.attendanceSession.findFirst({
      where: { institutionId, academicYear },
      orderBy: { sessionDate: 'desc' },
      select: { sessionDate: true },
    }),
    prisma.teacherAttendanceDailyRecord.findFirst({
      where: { institutionId, academicYear },
      orderBy: { recordDate: 'desc' },
      select: { recordDate: true },
    }),
    prisma.staffAttendanceDailyRecord.findFirst({
      where: { institutionId, academicYear },
      orderBy: { recordDate: 'desc' },
      select: { recordDate: true },
    }),
  ]);

  const candidates = [
    studentLatest?.sessionDate,
    teacherLatest?.recordDate,
    staffLatest?.recordDate,
  ].filter(Boolean) as Date[];

  if (!candidates.length) return parseDateOnly();
  return candidates.reduce((latest, d) => (d > latest ? d : latest));
}

export async function getDailySummaryMeta(institutionId: string, academicYear?: string) {
  const filters = await getInstitutionFilterMeta(institutionId);
  const year = academicYear || filters.defaultAcademicYear;
  const latestDate = await resolveLatestDate(institutionId, year);

  const [studentDates, teacherDates, staffDates] = await Promise.all([
    prisma.attendanceSession.findMany({
      where: { institutionId, academicYear: year },
      select: { sessionDate: true },
      distinct: ['sessionDate'],
      orderBy: { sessionDate: 'desc' },
      take: 60,
    }),
    prisma.teacherAttendanceDailyRecord.findMany({
      where: { institutionId, academicYear: year },
      select: { recordDate: true },
      distinct: ['recordDate'],
      orderBy: { recordDate: 'desc' },
      take: 60,
    }),
    prisma.staffAttendanceDailyRecord.findMany({
      where: { institutionId, academicYear: year },
      select: { recordDate: true },
      distinct: ['recordDate'],
      orderBy: { recordDate: 'desc' },
      take: 60,
    }),
  ]);

  const dateSet = new Set<string>();
  for (const d of [...studentDates, ...teacherDates, ...staffDates]) {
    const iso = formatDateIso('sessionDate' in d ? d.sessionDate : d.recordDate);
    dateSet.add(iso);
  }
  const availableDates = [...dateSet].sort((a, b) => b.localeCompare(a));

  return {
    defaultAcademicYear: year,
    academicYears: filters.academicYears,
    latestDate: formatDateIso(latestDate),
    availableDates,
  };
}

export async function getDailyAttendanceSummary(
  institutionId: string,
  opts: { academicYear?: string; date?: string },
) {
  const filters = await getInstitutionFilterMeta(institutionId);
  const academicYear = opts.academicYear || filters.defaultAcademicYear;
  const sessionDate = opts.date
    ? parseDateOnly(opts.date)
    : await resolveLatestDate(institutionId, academicYear);

  const students = await prisma.student.findMany({
    where: { institutionId, academicYear, status: StudentStatus.ACTIVE },
    orderBy: [{ className: 'asc' }, { sectionName: 'asc' }, { firstName: 'asc' }],
  });

  const todaySessions = await prisma.attendanceSession.findMany({
    where: {
      institutionId,
      academicYear,
      sessionDate,
      mode: AttendanceSessionMode.CLASS,
    },
    include: { records: { include: { student: true } } },
  });

  const studentRecordMap = new Map<string, {
    status: AttendanceStatus;
    checkInTime: string;
    remarks: string;
    absentReason: string;
  }>();
  for (const session of todaySessions) {
    for (const rec of session.records) {
      studentRecordMap.set(rec.studentId, {
        status: rec.status,
        checkInTime: rec.checkInTime,
        remarks: rec.remarks,
        absentReason: rec.absentReason,
      });
    }
  }

  const studentRows = students.map((s) => {
    const rec = studentRecordMap.get(s.id);
    const designation = formatClassSection(s.className, s.sectionName);
    return {
      id: s.id,
      name: `${s.firstName} ${s.lastName}`.trim(),
      admissionNumber: s.admissionNumber,
      rollNumber: s.rollNumber,
      designation,
      className: s.className,
      sectionName: s.sectionName,
      status: rec?.status || null,
      statusLabel: rec ? STUDENT_STATUS_LABEL[rec.status] : 'Unmarked',
      checkInTime: rec?.checkInTime || '—',
      remarks: rec?.absentReason || rec?.remarks || '—',
    };
  });

  const studentByClass = new Map<string, StatusBucket>();
  for (const row of studentRows) {
    const key = row.designation;
    if (!studentByClass.has(key)) studentByClass.set(key, emptyBucket());
    bucketFromStudentStatus(studentByClass.get(key)!, row.status || undefined);
  }

  const studentOverview = emptyBucket();
  for (const row of studentRows) {
    bucketFromStudentStatus(studentOverview, row.status || undefined);
  }

  const teachers = await prisma.teacherAttendanceProfile.findMany({
    where: { institutionId, academicYear, isActive: true },
    orderBy: [{ designation: 'asc' }, { teacherName: 'asc' }],
  });

  const teacherRecords = await prisma.teacherAttendanceDailyRecord.findMany({
    where: { institutionId, academicYear, recordDate: sessionDate },
  });
  const teacherRecordMap = new Map(teacherRecords.map((r) => [r.teacherProfileId, r]));

  const teacherRows = teachers.map((t) => {
    const rec = teacherRecordMap.get(t.id);
    return {
      id: t.id,
      name: t.teacherName,
      employeeCode: t.employeeCode,
      designation: t.designation || 'Teacher',
      department: t.department,
      status: rec?.status || null,
      statusLabel: rec ? TEACHER_STATUS_LABEL[rec.status] : 'Unmarked',
      checkInTime: rec?.checkInTime || '—',
      remarks: rec?.teacherRemarks || '—',
    };
  });

  const teacherByDesignation = new Map<string, StatusBucket>();
  for (const row of teacherRows) {
    const key = row.designation;
    if (!teacherByDesignation.has(key)) teacherByDesignation.set(key, emptyBucket());
    bucketFromTeacherStatus(teacherByDesignation.get(key)!, row.status || undefined);
  }

  const teacherOverview = emptyBucket();
  for (const row of teacherRows) {
    bucketFromTeacherStatus(teacherOverview, row.status || undefined);
  }

  const staffList = await prisma.staffAttendanceProfile.findMany({
    where: { institutionId, academicYear, isActive: true },
    orderBy: [{ designation: 'asc' }, { staffName: 'asc' }],
  });

  const staffRecords = await prisma.staffAttendanceDailyRecord.findMany({
    where: { institutionId, academicYear, recordDate: sessionDate },
  });
  const staffRecordMap = new Map(staffRecords.map((r) => [r.staffProfileId, r]));

  const staffRows = staffList.map((s) => {
    const rec = staffRecordMap.get(s.id);
    return {
      id: s.id,
      name: s.staffName,
      employeeCode: s.employeeCode,
      designation: s.designation || 'Staff',
      department: s.department,
      status: rec?.status || null,
      statusLabel: rec ? STAFF_STATUS_LABEL[rec.status] : 'Unmarked',
      checkInTime: rec?.checkInTime || '—',
      remarks: rec?.staffRemarks || '—',
    };
  });

  const staffByDesignation = new Map<string, StatusBucket>();
  for (const row of staffRows) {
    const key = row.designation;
    if (!staffByDesignation.has(key)) staffByDesignation.set(key, emptyBucket());
    bucketFromStaffStatus(staffByDesignation.get(key)!, row.status || undefined);
  }

  const staffOverview = emptyBucket();
  for (const row of staffRows) {
    bucketFromStaffStatus(staffOverview, row.status || undefined);
  }

  const allStaffOverview = emptyBucket();
  for (const row of teacherRows) {
    bucketFromTeacherStatus(allStaffOverview, row.status || undefined);
  }
  for (const row of staffRows) {
    bucketFromStaffStatus(allStaffOverview, row.status || undefined);
  }

  const allStaffByDesignation = new Map<string, StatusBucket>();
  for (const [key, bucket] of teacherByDesignation) {
    allStaffByDesignation.set(key, { ...bucket });
  }
  for (const [key, bucket] of staffByDesignation) {
    const existing = allStaffByDesignation.get(key);
    if (!existing) {
      allStaffByDesignation.set(key, { ...bucket });
      continue;
    }
    existing.total += bucket.total;
    existing.present += bucket.present;
    existing.absent += bucket.absent;
    existing.late += bucket.late;
    existing.onLeave += bucket.onLeave;
    existing.medical += bucket.medical;
    existing.notIntimated += bucket.notIntimated;
    existing.unmarked += bucket.unmarked;
  }

  const mapDesignationSummary = (entries: Map<string, StatusBucket>) =>
    [...entries.entries()]
      .map(([designation, bucket]) => ({
        designation,
        ...serializeBucket(bucket),
      }))
      .sort((a, b) => a.designation.localeCompare(b.designation));

  return {
    academicYear,
    date: formatDateIso(sessionDate),
    dateLabel: sessionDate.toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
    generatedAt: new Date().toISOString(),
    overview: {
      students: serializeBucket(studentOverview),
      teachers: serializeBucket(teacherOverview),
      staff: serializeBucket(staffOverview),
      allStaff: serializeBucket(allStaffOverview),
      grandTotal: studentOverview.total + teacherOverview.total + staffOverview.total,
    },
    students: {
      rows: studentRows,
      byDesignation: mapDesignationSummary(studentByClass),
      statusLegend: Object.entries(STUDENT_STATUS_LABEL).map(([id, label]) => ({ id, label })),
    },
    teachers: {
      rows: teacherRows,
      byDesignation: mapDesignationSummary(teacherByDesignation),
      statusLegend: TEACHER_ATTENDANCE_SECTIONS.map((s) => ({ id: s.id, label: s.title })),
    },
    staff: {
      rows: staffRows,
      byDesignation: mapDesignationSummary(staffByDesignation),
      statusLegend: STAFF_ATTENDANCE_SECTIONS.map((s) => ({ id: s.id, label: s.title })),
    },
    allStaff: {
      rows: [
        ...teacherRows.map((r) => ({ ...r, category: 'Teacher' as const })),
        ...staffRows.map((r) => ({ ...r, category: 'Staff' as const })),
      ].sort((a, b) => a.designation.localeCompare(b.designation) || a.name.localeCompare(b.name)),
      byDesignation: mapDesignationSummary(allStaffByDesignation),
    },
  };
}
