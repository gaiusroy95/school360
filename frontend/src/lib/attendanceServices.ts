import { api } from './api';

export type AttendanceMeta = {
  defaultAcademicYear: string;
  academicYears: string[];
  sections: string[];
  classes: string[];
  classGroups: { className: string; sectionName: string; label: string }[];
  terms: string[];
};

export type AttendanceDashboard = {
  filters: { academicYear: string; sectionName: string | null; date: string };
  generatedAt: string;
  kpis: {
    totalStudents: number;
    presentToday: number;
    absentToday: number;
    lateToday: number;
    onLeaveToday: number;
    averageAttendance: number;
    presentPercent: number;
    absentPercent: number;
    latePercent: number;
    onLeavePercent: number;
    improvement: number;
    studentGrowthPercent: number;
  };
  overview: {
    present: number;
    absent: number;
    late: number;
    onLeave: number;
    overallPercent: number;
    totalStudents: number;
  };
  realTime: {
    totalStudents: number;
    present: number;
    absent: number;
    late: number;
    onLeave: number;
    presentPercent: number;
    absentPercent: number;
    latePercent: number;
    onLeavePercent: number;
    lastUpdated: string;
  };
  trend: { date: string; present: number; absent: number; late: number }[];
  todayByClass: {
    className: string;
    present: number;
    absent: number;
    late: number;
    leave: number;
    percent: number;
  }[];
  classProgress: { name: string; percent: number }[];
  monthSummary: {
    workingDays: number;
    daysCompleted: number;
    holidays: number;
    attendanceTaken: number;
    bestClass: string;
    lowestClass: string;
    improvement: number;
    atRiskStudents: number;
  };
  dayType: { workingDays: number; holidays: number; weekend: number };
  timeBuckets: { before8: number; '8to830': number; '830to9': number; after9: number };
  leaveOverview: { total: number; approved: number; pending: number; rejected: number };
  topStudents: { name: string; class: string; percent: number }[];
  alerts: { type: string; title: string; description: string; time: string }[];
};

export type AttendanceDrilldownType =
  | 'total'
  | 'present'
  | 'absent'
  | 'late'
  | 'onLeave'
  | 'average'
  | 'atRisk';

export type AttendanceDrilldown = {
  type: AttendanceDrilldownType;
  title: string;
  columns: { key: string; label: string }[];
  rows: Record<string, unknown>[];
};

export type AttendanceRosterStudent = {
  studentId: string;
  admissionNumber: string;
  rollNumber: string;
  name: string;
  classGroup: string;
  status: string | null;
  checkInTime: string;
  absentReason: string;
  remarks: string;
};

export type AttendanceRoster = {
  session: { id: string; recordId: string; sessionDate: string; markedBy: string; source: string } | null;
  students: AttendanceRosterStudent[];
};

function qs(params?: Record<string, string | number | undefined>) {
  const q = new URLSearchParams();
  if (!params) return '';
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}

export async function fetchAttendanceMeta() {
  return api<AttendanceMeta>('/api/attendance/meta');
}

export async function fetchAttendanceDashboard(params?: {
  academicYear?: string;
  sectionName?: string;
  date?: string;
}) {
  return api<AttendanceDashboard>(`/api/attendance/dashboard${qs(params)}`);
}

export async function fetchAttendanceDrilldown(
  type: AttendanceDrilldownType,
  params?: { academicYear?: string; sectionName?: string; date?: string },
) {
  return api<AttendanceDrilldown>(`/api/attendance/drilldown${qs({ type, ...params })}`);
}

export async function fetchAttendanceRoster(params: {
  className: string;
  sectionName?: string;
  academicYear?: string;
  date?: string;
  mode?: 'CLASS' | 'SUBJECT' | 'ACTIVITY';
  subjectName?: string;
  activityName?: string;
}) {
  return api<AttendanceRoster>(`/api/attendance/roster${qs(params)}`);
}

export async function markAttendance(payload: {
  academicYear?: string;
  sessionDate: string;
  className: string;
  sectionName?: string;
  mode?: 'CLASS' | 'SUBJECT' | 'ACTIVITY';
  subjectName?: string;
  activityName?: string;
  markedBy?: string;
  source?: string;
  records: {
    studentId: string;
    status: 'PRESENT' | 'ABSENT' | 'LATE' | 'ON_LEAVE' | 'HALF_DAY';
    checkInTime?: string;
    absentReason?: string;
    remarks?: string;
    lateMinutes?: number;
  }[];
}) {
  return api<{ sessionId: string; recordId: string; marked: number }>('/api/attendance/sessions/mark', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function seedAttendanceDemo(academicYear?: string) {
  return api<{ sessions: number; records: number; leaves: number }>('/api/attendance/seed', {
    method: 'POST',
    body: JSON.stringify({ academicYear }),
  });
}

// ─── Teacher Attendance ───────────────────────────────────────────────────────

export type TeacherPeriod = 'monthly' | 'quarterly' | 'half_yearly' | 'yearly';

export type TeacherAttendanceSection = {
  id: string;
  key: string;
  title: string;
  color: string;
  count?: number;
  teachers?: TeacherDayRecord[];
};

export type TeacherProfile = {
  id: string;
  recordId: string;
  teacherName: string;
  employeeCode: string;
  department: string;
  designation: string;
  mobile: string;
  email: string;
  academicYear: string;
};

export type TeacherDayRecord = {
  id: string;
  recordDate: string;
  status: string;
  statusLabel: string;
  statusShort: string;
  teacherRemarks: string;
  checkInTime: string;
  source: string;
  markedAt: string | null;
  teacher: TeacherProfile;
};

export type TeacherCalendar = {
  academicYear: string;
  year: number;
  month: number;
  monthLabel: string;
  totalTeachers: number;
  days: {
    date: string;
    day: number;
    isWeekend: boolean;
    isHoliday: boolean;
    counts: Record<string, number>;
    hasData: boolean;
  }[];
  holidays: { date: string; name: string }[];
};

export type TeacherDayDetail = {
  academicYear: string;
  date: string;
  dateLabel: string;
  totalTeachers: number;
  markedCount: number;
  unmarkedCount: number;
  sections: TeacherAttendanceSection[];
  unmarkedTeachers: TeacherProfile[];
  summary: Record<string, number>;
};

export type TeacherAttendanceReport = {
  academicYear: string;
  period: TeacherPeriod;
  periodLabel: string;
  from: string;
  to: string;
  workingDays: number;
  dateColumns: { date: string; label: string }[];
  rows: {
    teacher: TeacherProfile;
    daily: Record<string, string>;
    totals: {
      workingDays: number;
      daysPresent: number;
      daysPlannedLeave: number;
      daysMedicalLeave: number;
      daysUnplannedAbsent: number;
      daysNotIntimated: number;
      totalLeaveUsed: number;
      attendanceScore: number;
    };
    leaveGrants: {
      planned: number;
      medical: number;
      casual: number;
      totalGranted: number;
      totalUsed: number;
      balance: number;
    };
  }[];
  categoryExports: {
    id: string;
    key: string;
    title: string;
    color: string;
    rows: {
      date: string;
      teacherName: string;
      employeeCode: string;
      department: string;
      status: string;
      teacherRemarks: string;
      checkInTime: string;
    }[];
  }[];
  summary: { totalTeachers: number; avgAttendanceScore: number };
};

export async function fetchTeacherAttendanceMeta() {
  return api<{
    defaultAcademicYear: string;
    academicYears: string[];
    periods: { id: string; label: string }[];
    sections: TeacherAttendanceSection[];
    teacherCount: number;
    captureSource: string;
    captureNote: string;
  }>('/api/attendance/teachers/meta');
}

export async function fetchTeacherAttendanceCalendar(params?: {
  academicYear?: string;
  year?: number;
  month?: number;
}) {
  return api<TeacherCalendar>(`/api/attendance/teachers/calendar${qs(params)}`);
}

export async function fetchTeacherAttendanceDay(params: { date: string; academicYear?: string }) {
  return api<TeacherDayDetail>(`/api/attendance/teachers/day${qs(params)}`);
}

export async function fetchTeacherAttendanceReport(params?: {
  academicYear?: string;
  period?: TeacherPeriod;
  year?: number;
  month?: number;
  quarter?: number;
  half?: number;
}) {
  return api<TeacherAttendanceReport>(`/api/attendance/teachers/report${qs(params)}`);
}

export async function syncTeacherProfiles(academicYear?: string) {
  return api<{ synced: number; created: number; updated?: number; message: string }>('/api/attendance/teachers/sync', {
    method: 'POST',
    body: JSON.stringify({ academicYear }),
  });
}

export async function fetchTeachers(academicYear?: string) {
  return api<{
    academicYear: string;
    total: number;
    teachers: TeacherProfile[];
  }>(`/api/attendance/teachers${qs({ academicYear })}`);
}

export async function registerTeacher(data: {
  academicYear?: string;
  teacherName: string;
  department?: string;
  mobile?: string;
  email?: string;
  employeeCode?: string;
}) {
  return api<{ teacher: TeacherProfile; created: boolean; message: string }>('/api/attendance/teachers', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function seedTeacherAttendanceDemo(academicYear?: string) {
  return api<{ teachers: number; records: number }>('/api/attendance/teachers/seed', {
    method: 'POST',
    body: JSON.stringify({ academicYear }),
  });
}

// ─── Staff Attendance ───────────────────────────────────────────────────────────

export type StaffPeriod = TeacherPeriod;

export type StaffProfile = {
  id: string;
  recordId: string;
  staffName: string;
  employeeCode: string;
  department: string;
  designation: string;
  mobile: string;
  email: string;
  academicYear: string;
};

export type StaffDayRecord = {
  id: string;
  recordDate: string;
  status: string;
  statusLabel: string;
  statusShort: string;
  staffRemarks: string;
  checkInTime: string;
  source: string;
  markedAt: string | null;
  staff: StaffProfile;
};

export type StaffCalendar = Omit<TeacherCalendar, 'totalTeachers'> & { totalStaff: number };

export type StaffDayDetail = {
  academicYear: string;
  date: string;
  dateLabel: string;
  totalStaff: number;
  markedCount: number;
  unmarkedCount: number;
  sections: (TeacherAttendanceSection & { staff?: StaffDayRecord[] })[];
  unmarkedStaff: StaffProfile[];
  summary: Record<string, number>;
};

export type StaffAttendanceReport = {
  academicYear: string;
  period: StaffPeriod;
  periodLabel: string;
  from: string;
  to: string;
  workingDays: number;
  dateColumns: { date: string; label: string }[];
  rows: {
    staff: StaffProfile;
    daily: Record<string, string>;
    totals: TeacherAttendanceReport['rows'][0]['totals'];
    leaveGrants: TeacherAttendanceReport['rows'][0]['leaveGrants'];
  }[];
  categoryExports: {
    id: string;
    key: string;
    title: string;
    color: string;
    rows: {
      date: string;
      staffName: string;
      employeeCode: string;
      department: string;
      status: string;
      staffRemarks: string;
      checkInTime: string;
    }[];
  }[];
  summary: { totalStaff: number; avgAttendanceScore: number };
};

export async function fetchStaffAttendanceMeta() {
  return api<{
    defaultAcademicYear: string;
    academicYears: string[];
    periods: { id: string; label: string }[];
    sections: TeacherAttendanceSection[];
    staffCount: number;
    captureSource: string;
    captureNote: string;
  }>('/api/attendance/staff/meta');
}

export async function fetchStaffAttendanceCalendar(params?: {
  academicYear?: string;
  year?: number;
  month?: number;
}) {
  return api<StaffCalendar>(`/api/attendance/staff/calendar${qs(params)}`);
}

export async function fetchStaffAttendanceDay(params: { date: string; academicYear?: string }) {
  return api<StaffDayDetail>(`/api/attendance/staff/day${qs(params)}`);
}

export async function fetchStaffAttendanceReport(params?: {
  academicYear?: string;
  period?: StaffPeriod;
  year?: number;
  month?: number;
  quarter?: number;
  half?: number;
}) {
  return api<StaffAttendanceReport>(`/api/attendance/staff/report${qs(params)}`);
}

export async function syncStaffProfiles(academicYear?: string) {
  return api<{ synced: number; created: number }>('/api/attendance/staff/sync', {
    method: 'POST',
    body: JSON.stringify({ academicYear }),
  });
}

export async function seedStaffAttendanceDemo(academicYear?: string) {
  return api<{ staff: number; records: number }>('/api/attendance/staff/seed', {
    method: 'POST',
    body: JSON.stringify({ academicYear }),
  });
}

// ─── Attendance By Date ───────────────────────────────────────────────────────

export type AttendanceByDateFilter = 'present' | 'absent' | 'onLeave' | 'medicalLeave';

export type AttendanceByDateMeta = {
  defaultAcademicYear: string;
  academicYears: string[];
  latestDate: string;
  availableDates: string[];
};

export type AttendanceByDateTile = {
  id: AttendanceByDateFilter;
  title: string;
  count: number;
  percent: number;
  totalTeachers: number;
};

export type AttendanceByDateSummary = {
  academicYear: string;
  date: string;
  dateLabel: string;
  totalTeachers: number;
  markedCount: number;
  unmarkedCount: number;
  tiles: AttendanceByDateTile[];
  generatedAt: string;
};

export type AttendanceByDateTeacher = {
  id: string;
  recordId: string;
  teacherName: string;
  employeeCode: string;
  department: string;
  mobile: string;
  email: string;
  status: string;
  statusLabel: string;
  teacherRemarks: string;
  checkInTime: string;
  classTeacherOf: { classGroup: string; className: string; sectionName: string; room: string }[];
  subjects: string[];
  scheduledPeriods: {
    id: string;
    period: number;
    periodLabel: string;
    timeRange: string;
    subjectName: string;
    classGroup: string;
    room: string;
    dayLabel: string;
  }[];
  periodCount: number;
};

export type AttendanceByDateTeachers = AttendanceByDateSummary & {
  filter: AttendanceByDateFilter;
  filterLabel: string;
  teachers: AttendanceByDateTeacher[];
};

export type SubstituteAssignmentBoard = AttendanceByDateSummary & {
  presentTeachers: { id: string; teacherName: string; employeeCode: string; department: string }[];
  absentTeachers: {
    id: string;
    teacherName: string;
    employeeCode: string;
    status: string;
    statusLabel: string;
    teacherRemarks: string;
    classTeacherOf: AttendanceByDateTeacher['classTeacherOf'];
    subjects: string[];
    scheduledPeriods: (AttendanceByDateTeacher['scheduledPeriods'][0] & {
      isAssigned: boolean;
      assignment: { id: string; substituteTeacherName: string } | null;
    })[];
    assignments: {
      id: string;
      recordId: string;
      substituteTeacherName: string;
      substituteTeacherId: string;
      classGroup: string;
      subjectName: string;
      periodLabel: string;
      timeRange: string;
      notificationSentAt: string | null;
    }[];
  }[];
  assignments: {
    id: string;
    recordId: string;
    absentTeacherName: string;
    substituteTeacherName: string;
    classGroup: string;
    subjectName: string;
    periodLabel: string;
    timeRange: string;
    room: string;
    notificationSentAt: string | null;
  }[];
};

export async function fetchAttendanceByDateMeta(academicYear?: string) {
  return api<AttendanceByDateMeta>(`/api/attendance/by-date/meta${qs({ academicYear })}`);
}

export async function fetchAttendanceByDateSummary(params?: { academicYear?: string; date?: string }) {
  return api<AttendanceByDateSummary>(`/api/attendance/by-date/summary${qs(params)}`);
}

export async function fetchAttendanceByDateTeachers(params: {
  filter: AttendanceByDateFilter;
  academicYear?: string;
  date?: string;
}) {
  return api<AttendanceByDateTeachers>(`/api/attendance/by-date/teachers${qs(params)}`);
}

export async function fetchSubstituteAssignmentBoard(params?: { academicYear?: string; date?: string }) {
  return api<SubstituteAssignmentBoard>(`/api/attendance/by-date/assignments${qs(params)}`);
}

export async function assignSubstituteTeacher(input: {
  academicYear?: string;
  date: string;
  absentTeacherProfileId: string;
  substituteTeacherProfileId: string;
  timetableSlotIds?: string[];
  notify?: boolean;
}) {
  return api<{
    assigned: number;
    substituteTeacherName: string;
    absentTeacherName: string;
    notification: { sent: number; event: string; title: string };
    assignments: { id: string; recordId: string; periodLabel: string; subjectName: string; classGroup: string }[];
  }>('/api/attendance/by-date/assign', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

// ─── Daily Summary ────────────────────────────────────────────────────────────

export type DailySummaryBucket = {
  total: number;
  present: number;
  absent: number;
  late: number;
  onLeave: number;
  medical: number;
  notIntimated: number;
  unmarked: number;
  marked: number;
  presentPercent: number;
  absentPercent: number;
  onLeavePercent: number;
};

export type DailySummaryDesignationRow = DailySummaryBucket & {
  designation: string;
};

export type DailySummaryPersonRow = {
  id: string;
  name: string;
  admissionNumber?: string;
  rollNumber?: string;
  employeeCode?: string;
  designation: string;
  department?: string;
  className?: string;
  sectionName?: string;
  status: string | null;
  statusLabel: string;
  checkInTime: string;
  remarks: string;
  category?: 'Teacher' | 'Staff';
};

export type DailySummary = {
  academicYear: string;
  date: string;
  dateLabel: string;
  generatedAt: string;
  overview: {
    students: DailySummaryBucket;
    teachers: DailySummaryBucket;
    staff: DailySummaryBucket;
    allStaff: DailySummaryBucket;
    grandTotal: number;
  };
  students: {
    rows: DailySummaryPersonRow[];
    byDesignation: DailySummaryDesignationRow[];
    statusLegend: { id: string; label: string }[];
  };
  teachers: {
    rows: DailySummaryPersonRow[];
    byDesignation: DailySummaryDesignationRow[];
    statusLegend: { id: string; label: string }[];
  };
  staff: {
    rows: DailySummaryPersonRow[];
    byDesignation: DailySummaryDesignationRow[];
    statusLegend: { id: string; label: string }[];
  };
  allStaff: {
    rows: DailySummaryPersonRow[];
    byDesignation: DailySummaryDesignationRow[];
  };
};

export type DailySummaryMeta = {
  defaultAcademicYear: string;
  academicYears: string[];
  latestDate: string;
  availableDates: string[];
};

export async function fetchDailySummaryMeta(academicYear?: string) {
  return api<DailySummaryMeta>(`/api/attendance/daily-summary/meta${qs({ academicYear })}`);
}

export async function fetchDailySummary(params?: { academicYear?: string; date?: string }) {
  return api<DailySummary>(`/api/attendance/daily-summary${qs(params)}`);
}

// ─── Attendance Reports ───────────────────────────────────────────────────────

export type StudentPeriod = TeacherPeriod;

export type StudentAttendanceReport = {
  academicYear: string;
  period: StudentPeriod;
  periodLabel: string;
  from: string;
  to: string;
  workingDays: number;
  dateColumns: { date: string; label: string }[];
  rows: {
    student: {
      id: string;
      admissionNumber: string;
      rollNumber: string;
      name: string;
      className: string;
      sectionName: string;
      classGroup: string;
      mobile: string;
      category: string;
    };
    daily: Record<string, string>;
    totals: {
      workingDays: number;
      daysPresent: number;
      daysAbsent: number;
      daysLate: number;
      daysOnLeave: number;
      daysHalfDay: number;
      daysMarked: number;
      attendanceScore: number;
    };
  }[];
  classSummary: {
    classGroup: string;
    totalStudents: number;
    avgAttendance: number;
    totalPresent: number;
    totalAbsent: number;
    totalLate: number;
    totalOnLeave: number;
  }[];
  categoryExports: {
    id: string;
    key: string;
    title: string;
    color: string;
    rows: {
      date: string;
      admissionNumber: string;
      studentName: string;
      classGroup: string;
      rollNumber: string;
      status: string;
      checkInTime: string;
      remarks: string;
    }[];
  }[];
  summary: { totalStudents: number; avgAttendanceScore: number };
};

export type AttendanceReportsMeta = {
  defaultAcademicYear: string;
  academicYears: string[];
  periods: { id: string; label: string }[];
  sections: string[];
  classes: string[];
  classGroups: { className: string; sectionName: string; label: string }[];
};

export type AllAttendanceReports = {
  generatedAt: string;
  filters: {
    academicYear: string;
    period: StudentPeriod;
    periodLabel: string;
    from: string;
    to: string;
    sectionName: string | null;
    className: string | null;
  };
  students: StudentAttendanceReport;
  teachers: TeacherAttendanceReport;
  staff: StaffAttendanceReport;
  summary: {
    totalStudents: number;
    totalTeachers: number;
    totalStaff: number;
    studentAvgAttendance: number;
    teacherAvgAttendance: number;
    staffAvgAttendance: number;
  };
};

export async function fetchAttendanceReportsMeta() {
  return api<AttendanceReportsMeta>('/api/attendance/reports/meta');
}

export async function fetchStudentAttendanceReport(params?: {
  academicYear?: string;
  period?: StudentPeriod;
  year?: number;
  month?: number;
  quarter?: number;
  half?: number;
  sectionName?: string;
  className?: string;
}) {
  return api<StudentAttendanceReport>(`/api/attendance/reports/students${qs(params)}`);
}

export async function fetchAllAttendanceReports(params?: {
  academicYear?: string;
  period?: StudentPeriod;
  year?: number;
  month?: number;
  quarter?: number;
  half?: number;
  sectionName?: string;
  className?: string;
}) {
  return api<AllAttendanceReports>(`/api/attendance/reports/all${qs(params)}`);
}

// ─── Leave Management ─────────────────────────────────────────────────────────

export type LeaveCategory = 'all' | 'student' | 'teacher' | 'staff';
export type LeaveStatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

export type LeaveApplicationItem = {
  id: string;
  recordId: string;
  category: 'student' | 'teacher' | 'staff';
  categoryLabel: string;
  applicantId: string;
  applicantName: string;
  admissionNumber: string;
  classGroup: string;
  designation: string;
  department: string;
  leaveType: string;
  leaveTypeLabel: string;
  fromDate: string;
  toDate: string;
  totalDays: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  statusLabel: string;
  reviewedBy: string;
  reviewerRemarks: string;
  source: string;
  reviewedAt: string | null;
  createdAt: string;
  mobile: string;
  email: string;
};

export type LeaveManagementMeta = {
  defaultAcademicYear: string;
  academicYears: string[];
  leaveTypes: { id: string; label: string }[];
  students: { id: string; name: string; admissionNumber: string; classGroup: string }[];
  teachers: { id: string; name: string; employeeCode: string; department: string; designation: string }[];
  staff: { id: string; name: string; employeeCode: string; department: string; designation: string }[];
};

export type LeaveApplicationsResponse = {
  academicYear: string;
  items: LeaveApplicationItem[];
  summary: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    students: number;
    teachers: number;
    staff: number;
  };
};

export async function fetchLeaveManagementMeta() {
  return api<LeaveManagementMeta>('/api/attendance/leaves/meta');
}

export async function fetchLeaveApplications(params?: {
  academicYear?: string;
  category?: LeaveCategory;
  status?: LeaveStatusFilter;
  q?: string;
}) {
  return api<LeaveApplicationsResponse>(`/api/attendance/leaves${qs(params)}`);
}

export async function createLeaveApplication(input: {
  category: 'student' | 'teacher' | 'staff';
  applicantId: string;
  academicYear?: string;
  leaveType?: string;
  fromDate: string;
  toDate: string;
  reason: string;
  source?: string;
}) {
  return api<LeaveApplicationItem>('/api/attendance/leaves', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function approveLeaveApplication(input: {
  id: string;
  category: 'student' | 'teacher' | 'staff';
  reviewerRemarks?: string;
}) {
  return api<LeaveApplicationItem>(`/api/attendance/leaves/${input.id}/approve`, {
    method: 'POST',
    body: JSON.stringify({ category: input.category, reviewerRemarks: input.reviewerRemarks }),
  });
}

export async function rejectLeaveApplication(input: {
  id: string;
  category: 'student' | 'teacher' | 'staff';
  reviewerRemarks: string;
}) {
  return api<LeaveApplicationItem>(`/api/attendance/leaves/${input.id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ category: input.category, reviewerRemarks: input.reviewerRemarks }),
  });
}

export async function seedLeaveApplicationsDemo(academicYear?: string) {
  return api<{ created: number; students: number; teachers: number; staff: number }>(
    '/api/attendance/leaves/seed',
    { method: 'POST', body: JSON.stringify({ academicYear }) },
  );
}

// ─── Gate Pass ────────────────────────────────────────────────────────────────

export type GatePassStatusFilter =
  | 'all'
  | 'pending'
  | 'awaiting_principal'
  | 'approved'
  | 'rejected'
  | 'issued'
  | 'completed';

export type GatePassType = 'HALF_DAY' | 'MID_CLASS';

export type GatePassItem = {
  id: string;
  recordId: string;
  passNumber: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  rollNumber: string;
  className: string;
  sectionName: string;
  classGroup: string;
  academicYear: string;
  passType: GatePassType;
  passTypeLabel: string;
  reason: string;
  remarks: string;
  parentName: string;
  parentMobile: string;
  parentRelation: string;
  status: 'PENDING' | 'AWAITING_PRINCIPAL' | 'APPROVED' | 'REJECTED' | 'ISSUED' | 'COMPLETED';
  statusLabel: string;
  createdBy: string;
  submittedBy: string;
  submittedAt: string | null;
  approvedBy: string;
  approvedAt: string | null;
  rejectedBy: string;
  rejectedAt: string | null;
  rejectionReason: string;
  principalRemarks: string;
  issuedBy: string;
  issuedAt: string | null;
  exitTime: string;
  completedAt: string | null;
  principalNotifiedAt: string | null;
  source: string;
  createdAt: string;
  updatedAt: string;
  fatherName: string;
  fatherMobile: string;
  motherName: string;
  motherMobile: string;
  canSubmitToPrincipal: boolean;
  canApprove: boolean;
  canReject: boolean;
  canIssue: boolean;
  canComplete: boolean;
  isPrintable: boolean;
};

export type GatePassMeta = {
  defaultAcademicYear: string;
  academicYears: string[];
  classes: string[];
  sections: string[];
  classGroups: { className: string; sectionName: string; label: string }[];
  passTypes: { id: string; label: string; description: string }[];
  statusLegend: { id: string; label: string }[];
  workflowNote: string;
};

export type GatePassStudentOption = {
  id: string;
  name: string;
  admissionNumber: string;
  rollNumber: string;
  classGroup: string;
  className: string;
  sectionName: string;
  fatherName: string;
  fatherMobile: string;
  motherName: string;
  motherMobile: string;
};

export type GatePassesResponse = {
  academicYear: string;
  items: GatePassItem[];
  summary: {
    total: number;
    pending: number;
    awaitingPrincipal: number;
    approved: number;
    rejected: number;
    issued: number;
    completed: number;
  };
};

export async function fetchGatePassMeta(academicYear?: string) {
  return api<GatePassMeta>(`/api/attendance/gate-passes/meta${qs({ academicYear })}`);
}

export async function fetchGatePassStudents(params?: {
  academicYear?: string;
  className?: string;
  sectionName?: string;
  q?: string;
}) {
  return api<{ students: GatePassStudentOption[] }>(`/api/attendance/gate-passes/students${qs(params)}`);
}

export async function fetchGatePasses(params?: {
  academicYear?: string;
  status?: GatePassStatusFilter;
  date?: string;
  className?: string;
  q?: string;
}) {
  return api<GatePassesResponse>(`/api/attendance/gate-passes${qs(params)}`);
}

export async function createGatePass(input: {
  studentId: string;
  academicYear?: string;
  passType: GatePassType;
  reason: string;
  remarks?: string;
  parentName: string;
  parentMobile?: string;
  parentRelation?: string;
  source?: string;
}) {
  return api<GatePassItem>('/api/attendance/gate-passes', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function submitGatePassToPrincipal(id: string, adminRemarks?: string) {
  return api<GatePassItem & { notification?: unknown }>(
    `/api/attendance/gate-passes/${id}/submit-to-principal`,
    { method: 'POST', body: JSON.stringify({ adminRemarks }) },
  );
}

export async function approveGatePass(id: string, principalRemarks?: string) {
  return api<GatePassItem>(`/api/attendance/gate-passes/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify({ principalRemarks }),
  });
}

export async function rejectGatePass(id: string, rejectionReason: string) {
  return api<GatePassItem>(`/api/attendance/gate-passes/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ rejectionReason }),
  });
}

export async function issueGatePass(id: string, exitTime?: string) {
  return api<GatePassItem>(`/api/attendance/gate-passes/${id}/issue`, {
    method: 'POST',
    body: JSON.stringify({ exitTime }),
  });
}

export async function completeGatePass(id: string) {
  return api<GatePassItem>(`/api/attendance/gate-passes/${id}/complete`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function seedGatePassDemo(academicYear?: string) {
  return api<{ created: number }>('/api/attendance/gate-passes/seed', {
    method: 'POST',
    body: JSON.stringify({ academicYear }),
  });
}

// ─── Late Coming / Early Exit ─────────────────────────────────────────────────

export type LateEarlyCategory = 'all' | 'students' | 'teachers' | 'staff';
export type LateEarlyTypeFilter = 'all' | 'late' | 'early' | 'both';

export type TimelineConfig = {
  studentSchoolStart: string;
  studentLateAfter: string;
  studentSchoolEnd: string;
  studentEarlyExitBefore: string;
  teacherSchoolStart: string;
  teacherLateAfter: string;
  teacherSchoolEnd: string;
  teacherEarlyExitBefore: string;
  staffSchoolStart: string;
  staffLateAfter: string;
  staffSchoolEnd: string;
  staffEarlyExitBefore: string;
  updatedBy: string;
  updatedAt: string;
};

export type LateEarlyRow = {
  id: string;
  category: 'student' | 'teacher' | 'staff';
  categoryLabel: string;
  personId: string;
  name: string;
  code: string;
  classGroup: string;
  designation: string;
  department: string;
  date: string;
  checkInTime: string;
  checkOutTime: string;
  expectedStart: string;
  expectedEnd: string;
  lateAfter: string;
  earlyExitBefore: string;
  isLateComing: boolean;
  isEarlyExit: boolean;
  lateMinutes: number;
  earlyExitMinutes: number;
  violationType: 'Late Coming' | 'Early Exit' | 'Late & Early Exit' | 'On Time';
  status: string;
  remarks: string;
  source: string;
};

export type LateEarlyExitMeta = {
  defaultAcademicYear: string;
  academicYears: string[];
  classes: string[];
  timeline: TimelineConfig;
  categories: { id: string; label: string }[];
  typeFilters: { id: string; label: string }[];
  timelineLegend: {
    group: string;
    start: string;
    lateAfter: string;
    end: string;
    earlyBefore: string;
  }[];
};

export type LateEarlyExitReport = {
  academicYear: string;
  date: string;
  timeline: TimelineConfig;
  items: LateEarlyRow[];
  summary: {
    total: number;
    students: number;
    teachers: number;
    staff: number;
    lateComing: number;
    earlyExit: number;
    both: number;
    onTime: number;
  };
};

export async function fetchLateEarlyExitMeta(academicYear?: string) {
  return api<LateEarlyExitMeta>(`/api/attendance/late-early-exit/meta${qs({ academicYear })}`);
}

export async function fetchLateEarlyExitReport(params?: {
  academicYear?: string;
  date?: string;
  category?: LateEarlyCategory;
  type?: LateEarlyTypeFilter;
  className?: string;
  q?: string;
  violationsOnly?: boolean;
}) {
  const query = {
    ...params,
    violationsOnly: params?.violationsOnly === false ? 'false' : undefined,
  };
  return api<LateEarlyExitReport>(`/api/attendance/late-early-exit${qs(query)}`);
}

export async function updateLateEarlyTimeline(input: Partial<TimelineConfig>) {
  return api<TimelineConfig>('/api/attendance/late-early-exit/timeline', {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function syncLateEarlyMetrics(date?: string) {
  return api<{ updated: number; date: string }>('/api/attendance/late-early-exit/sync', {
    method: 'POST',
    body: JSON.stringify({ date }),
  });
}

// ─── Biometric Devices ────────────────────────────────────────────────────────

export type BiometricDeviceType = 'FINGERPRINT' | 'FACE_RECOGNITION' | 'RFID_READER' | 'MOBILE_GEOFENCE';
export type BiometricPersonType = 'STUDENT' | 'TEACHER' | 'STAFF';
export type BiometricPunchStatus = 'ACCEPTED' | 'REJECTED_OUTSIDE_FENCE' | 'REJECTED_NOT_ENROLLED' | 'REJECTED_DEVICE_INACTIVE';

export type GeoFenceItem = {
  id: string;
  recordId: string;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  isActive: boolean;
  isDefault: boolean;
  address: string;
};

export type BiometricDeviceItem = {
  id: string;
  recordId: string;
  name: string;
  deviceType: BiometricDeviceType;
  deviceTypeLabel: string;
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
  location: string;
  serialNumber: string;
  geoFenceId: string | null;
  geoFenceName: string;
  supportsStudents: boolean;
  supportsTeachers: boolean;
  supportsStaff: boolean;
  requiresGeoFence: boolean;
  lastSyncAt: string | null;
  notes: string;
};

export type BiometricEnrollmentItem = {
  id: string;
  recordId: string;
  personType: BiometricPersonType;
  personTypeLabel: string;
  personName: string;
  personCode: string;
  classGroup: string;
  academicYear: string;
  rfidCardId: string;
  biometricTemplateId: string;
  deviceId: string | null;
  isActive: boolean;
  enrolledBy: string;
  enrolledAt: string;
  notes: string;
};

export type BiometricPunchItem = {
  id: string;
  recordId: string;
  personType: BiometricPersonType;
  personTypeLabel: string;
  personName: string;
  personCode: string;
  classGroup: string;
  deviceType: BiometricDeviceType;
  deviceTypeLabel: string;
  eventType: 'CHECK_IN' | 'CHECK_OUT';
  eventTypeLabel: string;
  punchStatus: BiometricPunchStatus;
  punchStatusLabel: string;
  verificationMethod: string;
  rfidCardId: string;
  latitude: number | null;
  longitude: number | null;
  distanceMeters: number | null;
  withinGeoFence: boolean;
  geoFenceName: string;
  remarks: string;
  punchedAt: string;
};

export type BiometricDevicesMeta = {
  defaultAcademicYear: string;
  academicYears: string[];
  classes: string[];
  deviceTypes: { id: string; label: string }[];
  personTypes: { id: string; label: string }[];
  summary: {
    totalStudents: number;
    totalTeachers: number;
    totalStaff: number;
    activeGeoFences: number;
    activeDevices: number;
    enrollments: number;
    todayPunches: number;
    todayAccepted: number;
  };
  workflowNote: string;
  students: { id: string; name: string; admissionNumber: string; classGroup: string; rfidTag: string }[];
  teachers: { id: string; name: string; employeeCode: string; department: string }[];
  staff: { id: string; name: string; employeeCode: string; department: string }[];
};

export async function fetchBiometricDevicesMeta(academicYear?: string) {
  return api<BiometricDevicesMeta>(`/api/attendance/biometric-devices/meta${qs({ academicYear })}`);
}

export async function fetchGeoFences() {
  return api<{ items: GeoFenceItem[] }>('/api/attendance/biometric-devices/geo-fences');
}

export async function createGeoFence(input: {
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
  radiusMeters?: number;
  isDefault?: boolean;
  address?: string;
}) {
  return api<GeoFenceItem>('/api/attendance/biometric-devices/geo-fences', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function fetchBiometricDevices() {
  return api<{ items: BiometricDeviceItem[] }>('/api/attendance/biometric-devices/devices');
}

export async function createBiometricDevice(input: {
  name: string;
  deviceType: BiometricDeviceType;
  location?: string;
  serialNumber?: string;
  geoFenceId?: string;
  supportsStudents?: boolean;
  supportsTeachers?: boolean;
  supportsStaff?: boolean;
  requiresGeoFence?: boolean;
  notes?: string;
}) {
  return api<BiometricDeviceItem>('/api/attendance/biometric-devices/devices', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function fetchBiometricEnrollments(academicYear?: string) {
  return api<{ items: BiometricEnrollmentItem[] }>(
    `/api/attendance/biometric-devices/enrollments${qs({ academicYear })}`,
  );
}

export async function createBiometricEnrollment(input: {
  personType: BiometricPersonType;
  studentId?: string;
  teacherProfileId?: string;
  staffProfileId?: string;
  academicYear?: string;
  rfidCardId?: string;
  biometricTemplateId?: string;
  deviceId?: string;
  notes?: string;
}) {
  return api<BiometricEnrollmentItem>('/api/attendance/biometric-devices/enrollments', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function fetchBiometricPunches(params?: {
  date?: string;
  personType?: BiometricPersonType;
  status?: BiometricPunchStatus;
  q?: string;
}) {
  return api<{
    items: BiometricPunchItem[];
    summary: {
      total: number;
      accepted: number;
      rejectedOutsideFence: number;
      rejectedNotEnrolled: number;
      students: number;
      teachers: number;
      staff: number;
    };
  }>(`/api/attendance/biometric-devices/punches${qs(params)}`);
}

export async function recordBiometricPunch(input: {
  deviceId?: string;
  rfidCardId?: string;
  personType?: BiometricPersonType;
  personId?: string;
  eventType?: 'CHECK_IN' | 'CHECK_OUT';
  verificationMethod?: string;
  latitude?: number;
  longitude?: number;
}) {
  return api<BiometricPunchItem>('/api/attendance/biometric-devices/punch', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function seedBiometricDevicesDemo(academicYear?: string) {
  return api<{ geoFences: number; devices: number; enrollments: number }>(
    '/api/attendance/biometric-devices/seed',
    { method: 'POST', body: JSON.stringify({ academicYear }) },
  );
}
