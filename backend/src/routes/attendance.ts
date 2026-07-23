import { Router } from 'express';
import { z } from 'zod';
import { AttendanceSessionMode, AttendanceStatus } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';
import { requireApprover } from '../middleware/roles.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { getDefaultInstitutionId } from '../lib/institution.js';
import {
  getAttendanceDrilldown,
  getAttendanceMeta,
  getAttendanceRoster,
  getStudentAttendanceDashboard,
  getStudentAttendanceReport,
  markAttendanceSession,
  seedAttendanceDemo,
  type DrilldownType,
  type StudentPeriod,
} from '../lib/attendance.js';
import {
  getTeacherAttendanceCalendar,
  getTeacherAttendanceDayDetail,
  getTeacherAttendanceMeta,
  getTeacherAttendanceReport,
  listTeacherProfiles,
  registerTeacherProfile,
  seedTeacherAttendanceDemo,
  syncTeacherProfilesFromAcademic,
  type TeacherPeriod,
} from '../lib/teacherAttendance.js';
import {
  getStaffAttendanceCalendar,
  getStaffAttendanceDayDetail,
  getStaffAttendanceMeta,
  getStaffAttendanceReport,
  seedStaffAttendanceDemo,
  syncStaffProfilesFromInstitution,
  type StaffPeriod,
} from '../lib/staffAttendance.js';
import {
  assignSubstituteTeacher,
  getAttendanceByDateMeta,
  getAttendanceByDateSummary,
  getAttendanceByDateTeachers,
  getSubstituteAssignmentBoard,
  type AttendanceByDateFilter,
} from '../lib/attendanceByDate.js';
import {
  getDailyAttendanceSummary,
  getDailySummaryMeta,
} from '../lib/dailySummary.js';
import {
  getAllAttendanceReports,
  getAttendanceReportsMeta,
} from '../lib/attendanceReports.js';
import {
  approveLeaveApplication,
  createLeaveApplication,
  getLeaveManagementMeta,
  listLeaveApplications,
  rejectLeaveApplication,
  seedLeaveApplicationsDemo,
  type LeaveCategory,
  type LeaveStatusFilter,
} from '../lib/leaveManagement.js';
import {
  approveGatePass,
  completeGatePass,
  createGatePass,
  getGatePassById,
  getGatePassMeta,
  issueGatePass,
  listGatePasses,
  listStudentsForGatePass,
  rejectGatePass,
  seedGatePassDemo,
  submitGatePassToPrincipal,
  type GatePassStatusFilter,
} from '../lib/gatePass.js';
import { GatePassType } from '@prisma/client';
import {
  getLateEarlyExitMeta,
  getLateEarlyExitRangeReport,
  getLateEarlyExitReport,
  syncLateEarlyMetrics,
  updateTimelineConfig,
  type LateEarlyCategory,
  type LateEarlyTypeFilter,
} from '../lib/lateEarlyExit.js';
import {
  BiometricAttendanceEventType,
  BiometricDeviceStatus,
  BiometricDeviceType,
  BiometricPersonType,
  BiometricPunchStatus,
} from '@prisma/client';
import {
  createBiometricDevice,
  createBiometricEnrollment,
  createGeoFence,
  getBiometricDevicesMeta,
  listBiometricDevices,
  listBiometricEnrollments,
  listBiometricPunches,
  listGeoFences,
  recordBiometricPunch,
  seedBiometricDevicesDemo,
  updateBiometricDevice,
  updateGeoFence,
} from '../lib/biometricDevices.js';

export const attendanceRouter = Router();
attendanceRouter.use(requireAuth);

const drilldownTypes = ['total', 'present', 'absent', 'late', 'onLeave', 'average', 'atRisk'] as const;

attendanceRouter.get(
  '/meta',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await getAttendanceMeta(institutionId));
  }),
);

// ─── Teacher Attendance ───────────────────────────────────────────────────────

const teacherPeriods = ['monthly', 'quarterly', 'half_yearly', 'yearly'] as const;

attendanceRouter.get(
  '/teachers/meta',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await getTeacherAttendanceMeta(institutionId));
  }),
);

attendanceRouter.get(
  '/teachers/calendar',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
    const year = req.query.year ? Number(req.query.year) : undefined;
    const month = req.query.month ? Number(req.query.month) : undefined;
    return res.json(await getTeacherAttendanceCalendar(institutionId, { academicYear, year, month }));
  }),
);

attendanceRouter.get(
  '/teachers/day',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const date = typeof req.query.date === 'string' ? req.query.date : '';
    if (!date) return res.status(400).json({ error: 'date is required' });
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
    return res.json(await getTeacherAttendanceDayDetail(institutionId, { academicYear, date }));
  }),
);

attendanceRouter.get(
  '/teachers/report',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
    const periodRaw = typeof req.query.period === 'string' ? req.query.period : 'monthly';
    const period = teacherPeriods.includes(periodRaw as typeof teacherPeriods[number])
      ? (periodRaw as TeacherPeriod)
      : 'monthly';
    const year = req.query.year ? Number(req.query.year) : undefined;
    const month = req.query.month ? Number(req.query.month) : undefined;
    const quarter = req.query.quarter ? Number(req.query.quarter) : undefined;
    const half = req.query.half ? (Number(req.query.half) === 2 ? 2 : 1) : undefined;
    return res.json(
      await getTeacherAttendanceReport(institutionId, { academicYear, period, year, month, quarter, half }),
    );
  }),
);

attendanceRouter.post(
  '/teachers/sync',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.body?.academicYear === 'string' ? req.body.academicYear : '2025-26';
    return res.json(await syncTeacherProfilesFromAcademic(institutionId, academicYear));
  }),
);

attendanceRouter.get(
  '/teachers',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : '2025-26';
    return res.json(await listTeacherProfiles(institutionId, academicYear));
  }),
);

attendanceRouter.post(
  '/teachers',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const schema = z.object({
      academicYear: z.string().optional(),
      teacherName: z.string().min(1),
      department: z.string().optional(),
      mobile: z.string().optional(),
      email: z.string().optional(),
      employeeCode: z.string().optional(),
      designation: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    return res.status(201).json(await registerTeacherProfile(institutionId, parsed.data));
  }),
);

attendanceRouter.post(
  '/teachers/seed',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.body?.academicYear === 'string' ? req.body.academicYear : '2025-26';
    return res.json(await seedTeacherAttendanceDemo(institutionId, academicYear));
  }),
);

// ─── Staff Attendance ─────────────────────────────────────────────────────────

attendanceRouter.get(
  '/staff/meta',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await getStaffAttendanceMeta(institutionId));
  }),
);

attendanceRouter.get(
  '/staff/calendar',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
    const year = req.query.year ? Number(req.query.year) : undefined;
    const month = req.query.month ? Number(req.query.month) : undefined;
    return res.json(await getStaffAttendanceCalendar(institutionId, { academicYear, year, month }));
  }),
);

attendanceRouter.get(
  '/staff/day',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const date = typeof req.query.date === 'string' ? req.query.date : '';
    if (!date) return res.status(400).json({ error: 'date is required' });
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
    return res.json(await getStaffAttendanceDayDetail(institutionId, { academicYear, date }));
  }),
);

attendanceRouter.get(
  '/staff/report',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
    const periodRaw = typeof req.query.period === 'string' ? req.query.period : 'monthly';
    const period = teacherPeriods.includes(periodRaw as typeof teacherPeriods[number])
      ? (periodRaw as StaffPeriod)
      : 'monthly';
    const year = req.query.year ? Number(req.query.year) : undefined;
    const month = req.query.month ? Number(req.query.month) : undefined;
    const quarter = req.query.quarter ? Number(req.query.quarter) : undefined;
    const half = req.query.half ? (Number(req.query.half) === 2 ? 2 : 1) : undefined;
    return res.json(
      await getStaffAttendanceReport(institutionId, { academicYear, period, year, month, quarter, half }),
    );
  }),
);

attendanceRouter.post(
  '/staff/sync',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.body?.academicYear === 'string' ? req.body.academicYear : '2025-26';
    return res.json(await syncStaffProfilesFromInstitution(institutionId, academicYear));
  }),
);

attendanceRouter.post(
  '/staff/seed',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.body?.academicYear === 'string' ? req.body.academicYear : '2025-26';
    return res.json(await seedStaffAttendanceDemo(institutionId, academicYear));
  }),
);

// ─── Attendance By Date ─────────────────────────────────────────────────────────

const byDateFilters = ['present', 'absent', 'onLeave', 'medicalLeave'] as const;

attendanceRouter.get(
  '/by-date/meta',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
    return res.json(await getAttendanceByDateMeta(institutionId, academicYear));
  }),
);

attendanceRouter.get(
  '/by-date/summary',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
    const date = typeof req.query.date === 'string' ? req.query.date : undefined;
    return res.json(await getAttendanceByDateSummary(institutionId, { academicYear, date }));
  }),
);

attendanceRouter.get(
  '/by-date/teachers',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const filterRaw = typeof req.query.filter === 'string' ? req.query.filter : 'present';
    const filter = byDateFilters.includes(filterRaw as typeof byDateFilters[number])
      ? (filterRaw as AttendanceByDateFilter)
      : 'present';
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
    const date = typeof req.query.date === 'string' ? req.query.date : undefined;
    return res.json(await getAttendanceByDateTeachers(institutionId, { academicYear, date, filter }));
  }),
);

attendanceRouter.get(
  '/by-date/assignments',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
    const date = typeof req.query.date === 'string' ? req.query.date : undefined;
    return res.json(await getSubstituteAssignmentBoard(institutionId, { academicYear, date }));
  }),
);

const assignSubstituteSchema = z.object({
  academicYear: z.string().optional(),
  date: z.string().min(4),
  absentTeacherProfileId: z.string().min(1),
  substituteTeacherProfileId: z.string().min(1),
  timetableSlotIds: z.array(z.string()).optional(),
  notify: z.boolean().optional(),
});

attendanceRouter.post(
  '/by-date/assign',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const body = assignSubstituteSchema.parse(req.body);
    try {
      return res.json(await assignSubstituteTeacher(institutionId, body));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Assignment failed';
      return res.status(400).json({ error: message });
    }
  }),
);

// ─── Daily Summary ────────────────────────────────────────────────────────────

attendanceRouter.get(
  '/daily-summary/meta',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
    return res.json(await getDailySummaryMeta(institutionId, academicYear));
  }),
);

attendanceRouter.get(
  '/daily-summary',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
    const date = typeof req.query.date === 'string' ? req.query.date : undefined;
    return res.json(await getDailyAttendanceSummary(institutionId, { academicYear, date }));
  }),
);

// ─── Attendance Reports ───────────────────────────────────────────────────────

function parseReportPeriodQuery(req: { query: Record<string, unknown> }) {
  const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
  const periodRaw = typeof req.query.period === 'string' ? req.query.period : 'monthly';
  const period = teacherPeriods.includes(periodRaw as typeof teacherPeriods[number])
    ? (periodRaw as StudentPeriod)
    : 'monthly';
  const year = req.query.year ? Number(req.query.year) : undefined;
  const month = req.query.month ? Number(req.query.month) : undefined;
  const quarter = req.query.quarter ? Number(req.query.quarter) : undefined;
  const half: 1 | 2 | undefined = req.query.half
    ? (Number(req.query.half) === 2 ? 2 : 1)
    : undefined;
  const sectionName =
    typeof req.query.sectionName === 'string' && req.query.sectionName !== 'All Sections'
      ? req.query.sectionName
      : undefined;
  const className = typeof req.query.className === 'string' ? req.query.className : undefined;
  return { academicYear, period, year, month, quarter, half, sectionName, className };
}

attendanceRouter.get(
  '/reports/meta',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await getAttendanceReportsMeta(institutionId));
  }),
);

attendanceRouter.get(
  '/reports/students',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await getStudentAttendanceReport(institutionId, parseReportPeriodQuery(req)));
  }),
);

attendanceRouter.get(
  '/reports/all',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await getAllAttendanceReports(institutionId, parseReportPeriodQuery(req)));
  }),
);

attendanceRouter.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
    const sectionName =
      typeof req.query.sectionName === 'string' && req.query.sectionName !== 'All Sections'
        ? req.query.sectionName
        : undefined;
    const date = typeof req.query.date === 'string' ? req.query.date : undefined;
    return res.json(await getStudentAttendanceDashboard(institutionId, { academicYear, sectionName, date }));
  }),
);

attendanceRouter.get(
  '/drilldown',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const type = String(req.query.type || 'total') as DrilldownType;
    if (!drilldownTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid drilldown type' });
    }
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
    const sectionName =
      typeof req.query.sectionName === 'string' && req.query.sectionName !== 'All Sections'
        ? req.query.sectionName
        : undefined;
    const date = typeof req.query.date === 'string' ? req.query.date : undefined;
    return res.json(await getAttendanceDrilldown(institutionId, type, { academicYear, sectionName, date }));
  }),
);

attendanceRouter.get(
  '/roster',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const className = typeof req.query.className === 'string' ? req.query.className : '';
    if (!className) return res.status(400).json({ error: 'className is required' });
    const sectionName = typeof req.query.sectionName === 'string' ? req.query.sectionName : '';
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
    const date = typeof req.query.date === 'string' ? req.query.date : undefined;
    const modeRaw = typeof req.query.mode === 'string' ? req.query.mode.toUpperCase() : 'CLASS';
    const mode = modeRaw in AttendanceSessionMode
      ? (modeRaw as AttendanceSessionMode)
      : AttendanceSessionMode.CLASS;
    const subjectName = typeof req.query.subjectName === 'string' ? req.query.subjectName : '';
    const activityName = typeof req.query.activityName === 'string' ? req.query.activityName : '';
    return res.json(
      await getAttendanceRoster(institutionId, {
        academicYear,
        className,
        sectionName,
        date,
        mode,
        subjectName,
        activityName,
      }),
    );
  }),
);

const markBodySchema = z.object({
  academicYear: z.string().optional(),
  sessionDate: z.string().min(4),
  className: z.string().min(1),
  sectionName: z.string().optional(),
  mode: z.enum(['CLASS', 'SUBJECT', 'ACTIVITY']).optional(),
  subjectName: z.string().optional(),
  activityName: z.string().optional(),
  markedBy: z.string().optional(),
  source: z.string().optional(),
  records: z.array(
    z.object({
      studentId: z.string().min(1),
      status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'ON_LEAVE', 'HALF_DAY']),
      checkInTime: z.string().optional(),
      absentReason: z.string().optional(),
      remarks: z.string().optional(),
      lateMinutes: z.number().optional(),
    }),
  ).min(1),
});

attendanceRouter.post(
  '/sessions/mark',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const body = markBodySchema.parse(req.body);
    const mode = body.mode ? AttendanceSessionMode[body.mode] : AttendanceSessionMode.CLASS;
    const result = await markAttendanceSession(institutionId, {
      ...body,
      mode,
      records: body.records.map((r) => ({
        ...r,
        status: AttendanceStatus[r.status],
      })),
    });
    return res.json(result);
  }),
);

attendanceRouter.post(
  '/seed',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.body?.academicYear === 'string' ? req.body.academicYear : '2025-26';
    return res.json(await seedAttendanceDemo(institutionId, academicYear));
  }),
);

// ─── Leave Management ─────────────────────────────────────────────────────────

const leaveCategories = ['all', 'student', 'teacher', 'staff'] as const;
const leaveStatusFilters = ['all', 'pending', 'approved', 'rejected'] as const;

attendanceRouter.get(
  '/leaves/meta',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await getLeaveManagementMeta(institutionId));
  }),
);

attendanceRouter.get(
  '/leaves',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
    const categoryRaw = typeof req.query.category === 'string' ? req.query.category : 'all';
    const category = leaveCategories.includes(categoryRaw as typeof leaveCategories[number])
      ? (categoryRaw as LeaveCategory)
      : 'all';
    const statusRaw = typeof req.query.status === 'string' ? req.query.status : 'all';
    const status = leaveStatusFilters.includes(statusRaw as typeof leaveStatusFilters[number])
      ? (statusRaw as LeaveStatusFilter)
      : 'all';
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    return res.json(await listLeaveApplications(institutionId, { academicYear, category, status, q }));
  }),
);

const createLeaveSchema = z.object({
  category: z.enum(['student', 'teacher', 'staff']),
  applicantId: z.string().min(1),
  academicYear: z.string().optional(),
  leaveType: z.string().optional(),
  fromDate: z.string().min(4),
  toDate: z.string().min(4),
  reason: z.string().min(3),
  source: z.string().optional(),
});

attendanceRouter.post(
  '/leaves',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const body = createLeaveSchema.parse(req.body);
    try {
      return res.status(201).json(await createLeaveApplication(institutionId, body));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create leave application';
      return res.status(400).json({ error: message });
    }
  }),
);

const reviewLeaveSchema = z.object({
  category: z.enum(['student', 'teacher', 'staff']),
  reviewerRemarks: z.string().optional(),
});

attendanceRouter.post(
  '/leaves/seed',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.body?.academicYear === 'string' ? req.body.academicYear : '2025-26';
    return res.json(await seedLeaveApplicationsDemo(institutionId, academicYear));
  }),
);

attendanceRouter.post(
  '/leaves/:id/approve',
  requireApprover,
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const body = reviewLeaveSchema.parse(req.body);
    const reviewedBy = req.user?.email || 'Administrator';
    try {
      return res.json(await approveLeaveApplication(institutionId, {
        category: body.category,
        id: req.params.id,
        reviewedBy,
        reviewerRemarks: body.reviewerRemarks,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Approval failed';
      return res.status(400).json({ error: message });
    }
  }),
);

attendanceRouter.post(
  '/leaves/:id/reject',
  requireApprover,
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const body = reviewLeaveSchema.extend({ reviewerRemarks: z.string().min(3) }).parse(req.body);
    const reviewedBy = req.user?.email || 'Administrator';
    try {
      return res.json(await rejectLeaveApplication(institutionId, {
        category: body.category,
        id: req.params.id,
        reviewedBy,
        reviewerRemarks: body.reviewerRemarks,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Rejection failed';
      return res.status(400).json({ error: message });
    }
  }),
);

// ─── Gate Pass ────────────────────────────────────────────────────────────────

const gatePassStatusFilters = [
  'all', 'pending', 'awaiting_principal', 'approved', 'rejected', 'issued', 'completed',
] as const;

attendanceRouter.get(
  '/gate-passes/meta',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
    return res.json(await getGatePassMeta(institutionId, academicYear));
  }),
);

attendanceRouter.get(
  '/gate-passes/students',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
    const className = typeof req.query.className === 'string' ? req.query.className : undefined;
    const sectionName = typeof req.query.sectionName === 'string' ? req.query.sectionName : undefined;
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    return res.json({
      students: await listStudentsForGatePass(institutionId, { academicYear, className, sectionName, q }),
    });
  }),
);

attendanceRouter.get(
  '/gate-passes',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
    const statusRaw = typeof req.query.status === 'string' ? req.query.status : 'all';
    const status = gatePassStatusFilters.includes(statusRaw as typeof gatePassStatusFilters[number])
      ? (statusRaw as GatePassStatusFilter)
      : 'all';
    const date = typeof req.query.date === 'string' ? req.query.date : undefined;
    const className = typeof req.query.className === 'string' ? req.query.className : undefined;
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    return res.json(await listGatePasses(institutionId, { academicYear, status, date, className, q }));
  }),
);

attendanceRouter.get(
  '/gate-passes/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      return res.json(await getGatePassById(institutionId, req.params.id));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Not found';
      return res.status(404).json({ error: message });
    }
  }),
);

const createGatePassSchema = z.object({
  studentId: z.string().min(1),
  academicYear: z.string().optional(),
  passType: z.enum(['HALF_DAY', 'MID_CLASS']),
  reason: z.string().min(3),
  remarks: z.string().optional(),
  parentName: z.string().min(2),
  parentMobile: z.string().optional(),
  parentRelation: z.string().optional(),
  source: z.string().optional(),
});

attendanceRouter.post(
  '/gate-passes',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const body = createGatePassSchema.parse(req.body);
    const createdBy = req.user?.email || 'Front Desk';
    try {
      return res.status(201).json(
        await createGatePass(institutionId, {
          ...body,
          passType: GatePassType[body.passType],
          createdBy,
        }),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create gate pass';
      return res.status(400).json({ error: message });
    }
  }),
);

attendanceRouter.post(
  '/gate-passes/:id/submit-to-principal',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const submittedBy = req.user?.email || 'Admin';
    const adminRemarks = typeof req.body?.adminRemarks === 'string' ? req.body.adminRemarks : undefined;
    try {
      return res.json(await submitGatePassToPrincipal(institutionId, req.params.id, submittedBy, adminRemarks));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Submit failed';
      return res.status(400).json({ error: message });
    }
  }),
);

attendanceRouter.post(
  '/gate-passes/:id/approve',
  requireApprover,
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const approvedBy = req.user?.email || 'Principal';
    const principalRemarks = typeof req.body?.principalRemarks === 'string' ? req.body.principalRemarks : undefined;
    try {
      return res.json(await approveGatePass(institutionId, req.params.id, approvedBy, principalRemarks));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Approval failed';
      return res.status(400).json({ error: message });
    }
  }),
);

attendanceRouter.post(
  '/gate-passes/:id/reject',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const rejectedBy = req.user?.email || 'Admin';
    const rejectionReason = typeof req.body?.rejectionReason === 'string' ? req.body.rejectionReason : '';
    try {
      return res.json(await rejectGatePass(institutionId, req.params.id, rejectedBy, rejectionReason));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Rejection failed';
      return res.status(400).json({ error: message });
    }
  }),
);

attendanceRouter.post(
  '/gate-passes/:id/issue',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const issuedBy = req.user?.email || 'Front Desk';
    const exitTime = typeof req.body?.exitTime === 'string' ? req.body.exitTime : undefined;
    try {
      return res.json(await issueGatePass(institutionId, req.params.id, issuedBy, exitTime));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Issue failed';
      return res.status(400).json({ error: message });
    }
  }),
);

attendanceRouter.post(
  '/gate-passes/:id/complete',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      return res.json(await completeGatePass(institutionId, req.params.id));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Complete failed';
      return res.status(400).json({ error: message });
    }
  }),
);

attendanceRouter.post(
  '/gate-passes/seed',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.body?.academicYear === 'string' ? req.body.academicYear : '2025-26';
    return res.json(await seedGatePassDemo(institutionId, academicYear));
  }),
);

// ─── Late Coming / Early Exit ─────────────────────────────────────────────────

const lateEarlyCategories = ['all', 'students', 'teachers', 'staff'] as const;
const lateEarlyTypes = ['all', 'late', 'early', 'both'] as const;

attendanceRouter.get(
  '/late-early-exit/meta',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
    return res.json(await getLateEarlyExitMeta(institutionId, academicYear));
  }),
);

attendanceRouter.get(
  '/late-early-exit',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
    const date = typeof req.query.date === 'string' ? req.query.date : undefined;
    const fromDate = typeof req.query.fromDate === 'string' ? req.query.fromDate : undefined;
    const toDate = typeof req.query.toDate === 'string' ? req.query.toDate : undefined;
    const categoryRaw = typeof req.query.category === 'string' ? req.query.category : 'all';
    const typeRaw = typeof req.query.type === 'string' ? req.query.type : 'all';
    const className = typeof req.query.className === 'string' ? req.query.className : undefined;
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    const violationsOnly = req.query.violationsOnly !== 'false';

    const category = lateEarlyCategories.includes(categoryRaw as typeof lateEarlyCategories[number])
      ? (categoryRaw as LateEarlyCategory)
      : 'all';
    const type = lateEarlyTypes.includes(typeRaw as typeof lateEarlyTypes[number])
      ? (typeRaw as LateEarlyTypeFilter)
      : 'all';

    if (fromDate || toDate) {
      return res.json(await getLateEarlyExitRangeReport(institutionId, {
        academicYear,
        fromDate: fromDate || date,
        toDate: toDate || fromDate || date,
        category,
        type,
      }));
    }

    return res.json(await getLateEarlyExitReport(institutionId, {
      academicYear,
      date,
      category,
      type,
      className,
      q,
      violationsOnly,
    }));
  }),
);

const timelineConfigSchema = z.object({
  studentSchoolStart: z.string().optional(),
  studentLateAfter: z.string().optional(),
  studentSchoolEnd: z.string().optional(),
  studentEarlyExitBefore: z.string().optional(),
  teacherSchoolStart: z.string().optional(),
  teacherLateAfter: z.string().optional(),
  teacherSchoolEnd: z.string().optional(),
  teacherEarlyExitBefore: z.string().optional(),
  staffSchoolStart: z.string().optional(),
  staffLateAfter: z.string().optional(),
  staffSchoolEnd: z.string().optional(),
  staffEarlyExitBefore: z.string().optional(),
});

attendanceRouter.put(
  '/late-early-exit/timeline',
  requireApprover,
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const body = timelineConfigSchema.parse(req.body);
    const updatedBy = req.user?.email || 'Admin';
    return res.json(await updateTimelineConfig(institutionId, { ...body, updatedBy }));
  }),
);

attendanceRouter.post(
  '/late-early-exit/sync',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const date = typeof req.body?.date === 'string' ? req.body.date : undefined;
    return res.json(await syncLateEarlyMetrics(institutionId, date));
  }),
);

// ─── Biometric Devices ────────────────────────────────────────────────────────

attendanceRouter.get(
  '/biometric-devices/meta',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
    return res.json(await getBiometricDevicesMeta(institutionId, academicYear));
  }),
);

attendanceRouter.get(
  '/biometric-devices/geo-fences',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await listGeoFences(institutionId));
  }),
);

const geoFenceSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  latitude: z.number(),
  longitude: z.number(),
  radiusMeters: z.number().optional(),
  isDefault: z.boolean().optional(),
  address: z.string().optional(),
});

attendanceRouter.post(
  '/biometric-devices/geo-fences',
  requireApprover,
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const body = geoFenceSchema.parse(req.body);
    return res.status(201).json(await createGeoFence(institutionId, body));
  }),
);

attendanceRouter.put(
  '/biometric-devices/geo-fences/:id',
  requireApprover,
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      return res.json(await updateGeoFence(institutionId, req.params.id, req.body));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Update failed';
      return res.status(400).json({ error: message });
    }
  }),
);

attendanceRouter.get(
  '/biometric-devices/devices',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await listBiometricDevices(institutionId));
  }),
);

const deviceSchema = z.object({
  name: z.string().min(2),
  deviceType: z.enum(['FINGERPRINT', 'FACE_RECOGNITION', 'RFID_READER', 'MOBILE_GEOFENCE']),
  location: z.string().optional(),
  serialNumber: z.string().optional(),
  geoFenceId: z.string().optional(),
  supportsStudents: z.boolean().optional(),
  supportsTeachers: z.boolean().optional(),
  supportsStaff: z.boolean().optional(),
  requiresGeoFence: z.boolean().optional(),
  notes: z.string().optional(),
});

attendanceRouter.post(
  '/biometric-devices/devices',
  requireApprover,
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const body = deviceSchema.parse(req.body);
    return res.status(201).json(
      await createBiometricDevice(institutionId, {
        ...body,
        deviceType: BiometricDeviceType[body.deviceType],
      }),
    );
  }),
);

attendanceRouter.put(
  '/biometric-devices/devices/:id',
  requireApprover,
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const status = typeof req.body?.status === 'string' ? req.body.status : undefined;
    try {
      return res.json(
        await updateBiometricDevice(institutionId, req.params.id, {
          ...req.body,
          ...(status && BiometricDeviceStatus[status as keyof typeof BiometricDeviceStatus]
            ? { status: BiometricDeviceStatus[status as keyof typeof BiometricDeviceStatus] }
            : {}),
        }),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Update failed';
      return res.status(400).json({ error: message });
    }
  }),
);

attendanceRouter.get(
  '/biometric-devices/enrollments',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
    return res.json(await listBiometricEnrollments(institutionId, academicYear));
  }),
);

const enrollmentSchema = z.object({
  personType: z.enum(['STUDENT', 'TEACHER', 'STAFF']),
  studentId: z.string().optional(),
  teacherProfileId: z.string().optional(),
  staffProfileId: z.string().optional(),
  academicYear: z.string().optional(),
  rfidCardId: z.string().optional(),
  biometricTemplateId: z.string().optional(),
  deviceId: z.string().optional(),
  notes: z.string().optional(),
});

attendanceRouter.post(
  '/biometric-devices/enrollments',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const body = enrollmentSchema.parse(req.body);
    const enrolledBy = req.user?.email || 'Admin';
    return res.status(201).json(
      await createBiometricEnrollment(institutionId, {
        ...body,
        personType: BiometricPersonType[body.personType],
        enrolledBy,
      }),
    );
  }),
);

attendanceRouter.get(
  '/biometric-devices/punches',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const date = typeof req.query.date === 'string' ? req.query.date : undefined;
    const personTypeRaw = typeof req.query.personType === 'string' ? req.query.personType : undefined;
    const statusRaw = typeof req.query.status === 'string' ? req.query.status : undefined;
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    const personType = personTypeRaw && BiometricPersonType[personTypeRaw as keyof typeof BiometricPersonType]
      ? BiometricPersonType[personTypeRaw as keyof typeof BiometricPersonType]
      : undefined;
    const status = statusRaw && BiometricPunchStatus[statusRaw as keyof typeof BiometricPunchStatus]
      ? BiometricPunchStatus[statusRaw as keyof typeof BiometricPunchStatus]
      : undefined;
    return res.json(await listBiometricPunches(institutionId, { date, personType, status, q }));
  }),
);

const punchSchema = z.object({
  deviceId: z.string().optional(),
  rfidCardId: z.string().optional(),
  personType: z.enum(['STUDENT', 'TEACHER', 'STAFF']).optional(),
  personId: z.string().optional(),
  eventType: z.enum(['CHECK_IN', 'CHECK_OUT']).optional(),
  verificationMethod: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

attendanceRouter.post(
  '/biometric-devices/punch',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const body = punchSchema.parse(req.body);
    try {
      return res.status(201).json(
        await recordBiometricPunch(institutionId, {
          ...body,
          personType: body.personType ? BiometricPersonType[body.personType] : undefined,
          eventType: body.eventType ? BiometricAttendanceEventType[body.eventType] : undefined,
        }),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Punch failed';
      return res.status(400).json({ error: message });
    }
  }),
);

attendanceRouter.post(
  '/biometric-devices/seed',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.body?.academicYear === 'string' ? req.body.academicYear : '2025-26';
    return res.json(await seedBiometricDevicesDemo(institutionId, academicYear));
  }),
);
