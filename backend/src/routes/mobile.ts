import { Router } from 'express';
import { z } from 'zod';
import { MobileDevicePlatform, AttendanceStatus, ExamMarksColumnKey } from '@prisma/client';
import { asyncHandler } from '../lib/asyncHandler.js';
import {
  changeMobilePassword,
  getMobileAccountById,
  loginStaff,
  loginStudentParent,
} from '../lib/mobileAuth.js';
import {
  assertPasswordLoginAllowed,
  getMobileAuthModes,
  requestMobileOtp,
  verifyMobileOtpAndLogin,
} from '../lib/mobileOtp.js';
import {
  listMobileNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  registerMobileDevice,
} from '../lib/mobileNotifications.js';
import { getMobileUploadFile, listMobileUploads, saveMobileUpload } from '../lib/mobileUploads.js';
import {
  requireMobileAuth,
  requirePasswordChanged,
  requireMobileRoles,
  signMobileToken,
} from '../middleware/mobileAuth.js';
import { prisma } from '../lib/prisma.js';
import {
  createFeePaymentOrder,
  getMobileDashboard,
  getMobileFeesSummary,
  getMobileHomework,
  getMobileLmsContent,
  getMobileProfile,
  getMobileTests,
  getMobileTimetable,
  getReminderPreferences,
  listMobileConsents,
  listMobileLeaveApplications,
  respondMobileConsent,
  submitMobileLeave,
  updateReminderPreferences,
  verifyMobileFeePayment,
} from '../lib/mobileBff.js';
import {
  getVehicleLiveStatus,
  listActiveVehicles,
  recordVehicleLocation,
  triggerTransportEmergency,
} from '../lib/transport.js';
import {
  approvePrincipalLeave,
  createStaffHomework,
  getPrincipalPendingLeaves,
  getStaffAttendanceMetaForUser,
  getStaffAttendanceRoster,
  getStaffCoScholastic,
  getStaffDashboard,
  getStaffEvaluations,
  getStaffExamPapers,
  getStaffLeaveList,
  getStaffMarksEntry,
  getStaffSchedule,
  getStaffTasks,
  markStaffClassAttendance,
  patchStaffEvaluation,
  patchStaffTask,
  publishStaffExamPaper,
  recordStaffSelfAttendance,
  rejectPrincipalLeave,
  saveStaffMarksDraft,
  submitStaffLeave,
} from '../lib/mobileStaffBff.js';

export const mobileRouter = Router();

const loginStudentParentSchema = z.object({
  layer: z.enum(['student', 'parent']),
  admissionNumber: z.string().min(1),
  registeredMobile: z.string().min(5),
  password: z.string().min(1),
});

const loginStaffSchema = z.object({
  employeeCode: z.string().min(1),
  registeredMobile: z.string().min(5),
  password: z.string().min(1),
});

// ─── Auth (public) ────────────────────────────────────────────────────────────

mobileRouter.get(
  '/auth/modes',
  asyncHandler(async (_req, res) => {
    return res.json(getMobileAuthModes());
  }),
);

mobileRouter.post(
  '/auth/request-otp',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      app: z.enum(['student-parent', 'staff']),
      layer: z.enum(['student', 'parent']).optional(),
      admissionNumber: z.string().optional(),
      employeeCode: z.string().optional(),
      registeredMobile: z.string().min(5),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    try {
      return res.json(await requestMobileOtp(parsed.data));
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to send OTP' });
    }
  }),
);

mobileRouter.post(
  '/auth/verify-otp',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      app: z.enum(['student-parent', 'staff']),
      layer: z.enum(['student', 'parent']).optional(),
      admissionNumber: z.string().optional(),
      employeeCode: z.string().optional(),
      registeredMobile: z.string().min(5),
      otp: z.string().min(4).max(8),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    try {
      const user = await verifyMobileOtpAndLogin(parsed.data);
      const token = signMobileToken(user);
      return res.json({ token, user });
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'OTP verification failed' });
    }
  }),
);

mobileRouter.post(
  '/auth/login',
  asyncHandler(async (req, res) => {
    try {
      assertPasswordLoginAllowed();
    } catch (e) {
      return res.status(403).json({ error: e instanceof Error ? e.message : 'Password login disabled' });
    }

    const app = typeof req.body?.app === 'string' ? req.body.app : 'student-parent';

    if (app === 'staff') {
      const parsed = loginStaffSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

      try {
        const user = await loginStaff(parsed.data);
        const token = signMobileToken(user);
        return res.json({ token, user });
      } catch (e) {
        return res.status(401).json({ error: e instanceof Error ? e.message : 'Login failed' });
      }
    }

    const parsed = loginStudentParentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    try {
      const user = await loginStudentParent(parsed.data);
      const token = signMobileToken(user);
      return res.json({ token, user });
    } catch (e) {
      return res.status(401).json({ error: e instanceof Error ? e.message : 'Login failed' });
    }
  }),
);

mobileRouter.get(
  '/auth/me',
  requireMobileAuth,
  asyncHandler(async (req, res) => {
    const fresh = await getMobileAccountById(req.mobileUser!.accountId);
    if (!fresh) return res.status(404).json({ error: 'Account not found' });
    return res.json({ user: fresh });
  }),
);

mobileRouter.post(
  '/auth/change-password',
  requireMobileAuth,
  asyncHandler(async (req, res) => {
    const schema = z.object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(8),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    try {
      const user = await changeMobilePassword(
        req.mobileUser!.accountId,
        parsed.data.currentPassword,
        parsed.data.newPassword,
      );

      const token = signMobileToken(user);
      return res.json({ token, user });
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Password change failed' });
    }
  }),
);

// ─── Devices ──────────────────────────────────────────────────────────────────

mobileRouter.post(
  '/devices/register',
  requireMobileAuth,
  requirePasswordChanged,
  asyncHandler(async (req, res) => {
    const schema = z.object({
      fcmToken: z.string().min(10),
      platform: z.nativeEnum(MobileDevicePlatform).optional(),
      deviceName: z.string().optional(),
      appVersion: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const device = await registerMobileDevice(req.mobileUser!.accountId, parsed.data);
    return res.status(201).json({ device });
  }),
);

// ─── Notifications ────────────────────────────────────────────────────────────

mobileRouter.get(
  '/notifications',
  requireMobileAuth,
  requirePasswordChanged,
  asyncHandler(async (req, res) => {
    const unreadOnly = req.query.unreadOnly === 'true' || req.query.unreadOnly === '1';
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const data = await listMobileNotifications(req.mobileUser!.accountId, { unreadOnly, limit });
    return res.json(data);
  }),
);

mobileRouter.patch(
  '/notifications/:id/read',
  requireMobileAuth,
  requirePasswordChanged,
  asyncHandler(async (req, res) => {
    try {
      const result = await markNotificationRead(req.mobileUser!.accountId, req.params.id);
      return res.json(result);
    } catch (e) {
      return res.status(404).json({ error: e instanceof Error ? e.message : 'Not found' });
    }
  }),
);

mobileRouter.post(
  '/notifications/read-all',
  requireMobileAuth,
  requirePasswordChanged,
  asyncHandler(async (req, res) => {
    const result = await markAllNotificationsRead(req.mobileUser!.accountId);
    return res.json(result);
  }),
);

// ─── Uploads ──────────────────────────────────────────────────────────────────

mobileRouter.post(
  '/uploads',
  requireMobileAuth,
  requirePasswordChanged,
  asyncHandler(async (req, res) => {
    const schema = z.object({
      fileName: z.string().min(1),
      mimeType: z.string().min(1),
      dataBase64: z.string().min(1),
      studentId: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    try {
      const upload = await saveMobileUpload(req.mobileUser!, parsed.data);
      return res.status(201).json({ upload });
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Upload failed' });
    }
  }),
);

mobileRouter.get(
  '/uploads',
  requireMobileAuth,
  requirePasswordChanged,
  asyncHandler(async (req, res) => {
    const studentId = typeof req.query.studentId === 'string' ? req.query.studentId : undefined;
    try {
      const uploads = await listMobileUploads(req.mobileUser!, studentId);
      return res.json({ uploads });
    } catch (e) {
      return res.status(403).json({ error: e instanceof Error ? e.message : 'Forbidden' });
    }
  }),
);

mobileRouter.get(
  '/uploads/:id/file',
  requireMobileAuth,
  requirePasswordChanged,
  asyncHandler(async (req, res) => {
    try {
      const { row, data } = await getMobileUploadFile(req.mobileUser!, req.params.id);
      res.setHeader('Content-Type', row.mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${row.fileName}"`);
      return res.send(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Not found';
      const status = msg.includes('denied') ? 403 : 404;
      return res.status(status).json({ error: msg });
    }
  }),
);

// ─── BFF: Student / Parent app data ───────────────────────────────────────────

function studentQuery(req: { query: Record<string, unknown> }) {
  return {
    studentId: typeof req.query.studentId === 'string' ? req.query.studentId : undefined,
    academicYear: typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined,
    date: typeof req.query.date === 'string' ? req.query.date : undefined,
  };
}

const studentParentOnly = [requireMobileAuth, requirePasswordChanged, requireMobileRoles('STUDENT', 'PARENT')];

mobileRouter.get(
  '/dashboard',
  ...studentParentOnly,
  asyncHandler(async (req, res) => {
    try {
      return res.json(await getMobileDashboard(req.mobileUser!, studentQuery(req)));
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to load dashboard' });
    }
  }),
);

mobileRouter.get(
  '/homework',
  ...studentParentOnly,
  asyncHandler(async (req, res) => {
    try {
      return res.json(await getMobileHomework(req.mobileUser!, studentQuery(req)));
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to load homework' });
    }
  }),
);

mobileRouter.get(
  '/timetable',
  ...studentParentOnly,
  asyncHandler(async (req, res) => {
    try {
      return res.json(await getMobileTimetable(req.mobileUser!, studentQuery(req)));
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to load timetable' });
    }
  }),
);

mobileRouter.get(
  '/tests',
  ...studentParentOnly,
  asyncHandler(async (req, res) => {
    try {
      return res.json(await getMobileTests(req.mobileUser!, studentQuery(req)));
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to load tests' });
    }
  }),
);

mobileRouter.get(
  '/lms',
  requireMobileAuth,
  requirePasswordChanged,
  requireMobileRoles('STUDENT'),
  asyncHandler(async (req, res) => {
    try {
      const q = studentQuery(req);
      const subjectName = typeof req.query.subjectName === 'string' ? req.query.subjectName : undefined;
      return res.json(
        await getMobileLmsContent(req.mobileUser!, { ...q, subjectName }),
      );
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to load LMS content' });
    }
  }),
);

mobileRouter.get(
  '/profile',
  ...studentParentOnly,
  asyncHandler(async (req, res) => {
    try {
      const studentId = typeof req.query.studentId === 'string' ? req.query.studentId : undefined;
      return res.json(await getMobileProfile(req.mobileUser!, { studentId }));
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to load profile' });
    }
  }),
);

mobileRouter.get(
  '/fees',
  requireMobileAuth,
  requirePasswordChanged,
  requireMobileRoles('PARENT'),
  asyncHandler(async (req, res) => {
    try {
      return res.json(await getMobileFeesSummary(req.mobileUser!, studentQuery(req)));
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to load fees' });
    }
  }),
);

mobileRouter.post(
  '/fees/:feeDueId/pay',
  requireMobileAuth,
  requirePasswordChanged,
  requireMobileRoles('PARENT'),
  asyncHandler(async (req, res) => {
    try {
      return res.json(await createFeePaymentOrder(req.mobileUser!, req.params.feeDueId));
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Payment initiation failed' });
    }
  }),
);

mobileRouter.post(
  '/fees/verify-payment',
  requireMobileAuth,
  requirePasswordChanged,
  requireMobileRoles('PARENT'),
  asyncHandler(async (req, res) => {
    const schema = z.object({
      orderId: z.string().min(1),
      razorpayPaymentId: z.string().min(1),
      razorpayOrderId: z.string().min(1),
      razorpaySignature: z.string().min(1),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    try {
      return res.json(await verifyMobileFeePayment(req.mobileUser!, parsed.data));
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Payment verification failed' });
    }
  }),
);

const staffTransportOnly = [
  requireMobileAuth,
  requirePasswordChanged,
  requireMobileRoles('TRANSPORT', 'PRINCIPAL'),
];

mobileRouter.get(
  '/transport/vehicles',
  ...staffTransportOnly,
  asyncHandler(async (req, res) => {
    const vehicles = await listActiveVehicles(req.mobileUser!.institutionId);
    return res.json({ vehicles });
  }),
);

mobileRouter.get(
  '/transport/vehicles/:vehicleId',
  ...staffTransportOnly,
  asyncHandler(async (req, res) => {
    try {
      return res.json(await getVehicleLiveStatus(req.mobileUser!.institutionId, req.params.vehicleId));
    } catch (e) {
      return res.status(404).json({ error: e instanceof Error ? e.message : 'Vehicle not found' });
    }
  }),
);

mobileRouter.post(
  '/transport/location',
  requireMobileAuth,
  requirePasswordChanged,
  requireMobileRoles('TRANSPORT'),
  asyncHandler(async (req, res) => {
    const staffProfileId = req.mobileUser!.staffProfileId;
    if (!staffProfileId) {
      return res.status(400).json({ error: 'Transport staff profile is not linked to this account' });
    }

    const schema = z.object({
      vehicleId: z.string().min(1),
      latitude: z.number(),
      longitude: z.number(),
      speedKmh: z.number().optional(),
      heading: z.number().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    try {
      const location = await recordVehicleLocation(
        req.mobileUser!.institutionId,
        staffProfileId,
        parsed.data,
      );
      return res.json({ location });
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to record location' });
    }
  }),
);

mobileRouter.post(
  '/transport/emergency',
  requireMobileAuth,
  requirePasswordChanged,
  requireMobileRoles('TRANSPORT'),
  asyncHandler(async (req, res) => {
    const staffProfileId = req.mobileUser!.staffProfileId;
    if (!staffProfileId) {
      return res.status(400).json({ error: 'Transport staff profile is not linked to this account' });
    }

    const schema = z.object({
      vehicleId: z.string().min(1),
      description: z.string().optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    try {
      const incident = await triggerTransportEmergency(
        req.mobileUser!.institutionId,
        staffProfileId,
        parsed.data.vehicleId,
        parsed.data.description || '',
        parsed.data.latitude,
        parsed.data.longitude,
      );
      return res.status(201).json({ incident });
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to report emergency' });
    }
  }),
);

mobileRouter.get(
  '/consents',
  ...studentParentOnly,
  asyncHandler(async (req, res) => {
    try {
      const studentId = typeof req.query.studentId === 'string' ? req.query.studentId : undefined;
      return res.json(await listMobileConsents(req.mobileUser!, { studentId }));
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to load consents' });
    }
  }),
);

mobileRouter.patch(
  '/consents/:responseId',
  requireMobileAuth,
  requirePasswordChanged,
  requireMobileRoles('PARENT'),
  asyncHandler(async (req, res) => {
    const schema = z.object({
      status: z.enum(['APPROVED', 'REJECTED']),
      remarks: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    try {
      const result = await respondMobileConsent(req.mobileUser!, req.params.responseId, parsed.data);
      return res.json({ consent: result });
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to update consent' });
    }
  }),
);

mobileRouter.get(
  '/leave',
  ...studentParentOnly,
  asyncHandler(async (req, res) => {
    try {
      const studentId = typeof req.query.studentId === 'string' ? req.query.studentId : undefined;
      return res.json(await listMobileLeaveApplications(req.mobileUser!, { studentId }));
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to load leave applications' });
    }
  }),
);

mobileRouter.post(
  '/leave',
  requireMobileAuth,
  requirePasswordChanged,
  requireMobileRoles('PARENT'),
  asyncHandler(async (req, res) => {
    const schema = z.object({
      studentId: z.string().optional(),
      leaveType: z.string().min(1),
      fromDate: z.string().min(4),
      toDate: z.string().min(4),
      reason: z.string().min(3),
      attachmentUrl: z.string().optional(),
      academicYear: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    try {
      const application = await submitMobileLeave(req.mobileUser!, parsed.data);
      return res.status(201).json({ application });
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to submit leave' });
    }
  }),
);

mobileRouter.get(
  '/reminders',
  requireMobileAuth,
  requirePasswordChanged,
  requireMobileRoles('PARENT'),
  asyncHandler(async (req, res) => {
    return res.json(await getReminderPreferences(req.mobileUser!.accountId));
  }),
);

mobileRouter.put(
  '/reminders',
  requireMobileAuth,
  requirePasswordChanged,
  requireMobileRoles('PARENT'),
  asyncHandler(async (req, res) => {
    const preferences = req.body?.preferences;
    if (!preferences || typeof preferences !== 'object') {
      return res.status(400).json({ error: 'preferences object is required' });
    }
    return res.json(await updateReminderPreferences(req.mobileUser!.accountId, preferences));
  }),
);

// ─── BFF: Staff app (teacher / principal / transport) ─────────────────────────

const staffOnly = [requireMobileAuth, requirePasswordChanged, requireMobileRoles('TEACHER', 'PRINCIPAL', 'TRANSPORT')];
const teacherPrincipal = [requireMobileAuth, requirePasswordChanged, requireMobileRoles('TEACHER', 'PRINCIPAL')];

mobileRouter.get(
  '/staff/dashboard',
  ...staffOnly,
  asyncHandler(async (req, res) => {
    try {
      return res.json(await getStaffDashboard(req.mobileUser!));
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to load dashboard' });
    }
  }),
);

mobileRouter.get(
  '/staff/attendance/meta',
  ...teacherPrincipal,
  asyncHandler(async (req, res) => {
    return res.json(await getStaffAttendanceMetaForUser(req.mobileUser!));
  }),
);

mobileRouter.get(
  '/staff/attendance/roster',
  ...teacherPrincipal,
  asyncHandler(async (req, res) => {
    const className = typeof req.query.className === 'string' ? req.query.className : '';
    if (!className) return res.status(400).json({ error: 'className is required' });
    try {
      return res.json(
        await getStaffAttendanceRoster(req.mobileUser!, {
          className,
          sectionName: typeof req.query.sectionName === 'string' ? req.query.sectionName : undefined,
          date: typeof req.query.date === 'string' ? req.query.date : undefined,
        }),
      );
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to load roster' });
    }
  }),
);

mobileRouter.post(
  '/staff/attendance/mark',
  ...teacherPrincipal,
  asyncHandler(async (req, res) => {
    const schema = z.object({
      className: z.string().min(1),
      sectionName: z.string().optional(),
      sessionDate: z.string().optional(),
      records: z.array(
        z.object({
          studentId: z.string().min(1),
          status: z.nativeEnum(AttendanceStatus),
          absentReason: z.string().optional(),
        }),
      ),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    try {
      return res.json(await markStaffClassAttendance(req.mobileUser!, parsed.data));
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to mark attendance' });
    }
  }),
);

mobileRouter.post(
  '/staff/homework',
  ...teacherPrincipal,
  asyncHandler(async (req, res) => {
    const schema = z.object({
      className: z.string().min(1),
      sectionName: z.string().min(1),
      subjectName: z.string().min(1),
      title: z.string().min(1),
      description: z.string().optional(),
      dueDate: z.string().optional(),
      attachments: z.array(z.record(z.unknown())).optional(),
      share: z.boolean().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    try {
      const record = await createStaffHomework(req.mobileUser!, parsed.data);
      return res.status(201).json({ record });
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to create homework' });
    }
  }),
);

mobileRouter.get(
  '/staff/tasks',
  ...teacherPrincipal,
  asyncHandler(async (req, res) => {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    return res.json(await getStaffTasks(req.mobileUser!, { status }));
  }),
);

mobileRouter.patch(
  '/staff/tasks/:id',
  ...teacherPrincipal,
  asyncHandler(async (req, res) => {
    const schema = z.object({
      status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
      feedbackNotes: z.string().optional(),
      parentFeedbackRating: z.number().min(0).max(5).optional(),
      feedbackRecorded: z.boolean().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    try {
      const task = await patchStaffTask(req.mobileUser!, req.params.id, parsed.data);
      return res.json({ task });
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to update task' });
    }
  }),
);

mobileRouter.get(
  '/staff/schedule',
  ...staffOnly,
  asyncHandler(async (req, res) => {
    const date = typeof req.query.date === 'string' ? req.query.date : undefined;
    return res.json(await getStaffSchedule(req.mobileUser!, date));
  }),
);

mobileRouter.get(
  '/staff/leave',
  ...staffOnly,
  asyncHandler(async (req, res) => {
    return res.json(await getStaffLeaveList(req.mobileUser!));
  }),
);

mobileRouter.post(
  '/staff/leave',
  ...staffOnly,
  asyncHandler(async (req, res) => {
    const schema = z.object({
      leaveType: z.string().min(1),
      fromDate: z.string().min(4),
      toDate: z.string().min(4),
      reason: z.string().min(3),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    try {
      const application = await submitStaffLeave(req.mobileUser!, parsed.data);
      return res.status(201).json({ application });
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to submit leave' });
    }
  }),
);

mobileRouter.post(
  '/staff/self-attendance',
  ...staffOnly,
  asyncHandler(async (req, res) => {
    const schema = z.object({
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      remarks: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    try {
      return res.json(await recordStaffSelfAttendance(req.mobileUser!, parsed.data));
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to record attendance' });
    }
  }),
);

mobileRouter.get(
  '/staff/evaluations',
  ...teacherPrincipal,
  asyncHandler(async (req, res) => {
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
    return res.json(await getStaffEvaluations(req.mobileUser!, academicYear));
  }),
);

mobileRouter.patch(
  '/staff/evaluations/:id',
  ...teacherPrincipal,
  asyncHandler(async (req, res) => {
    try {
      const record = await patchStaffEvaluation(req.mobileUser!, req.params.id, req.body ?? {});
      return res.json({ record });
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to update evaluation' });
    }
  }),
);

mobileRouter.get(
  '/staff/co-scholastic',
  ...teacherPrincipal,
  asyncHandler(async (req, res) => {
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
    return res.json(await getStaffCoScholastic(req.mobileUser!, academicYear));
  }),
);

mobileRouter.get(
  '/staff/marks-entry',
  ...teacherPrincipal,
  asyncHandler(async (req, res) => {
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
    return res.json(await getStaffMarksEntry(req.mobileUser!, academicYear));
  }),
);

mobileRouter.post(
  '/staff/marks-entry/sheets/:sheetId/draft',
  ...teacherPrincipal,
  asyncHandler(async (req, res) => {
    const schema = z.object({
      entries: z.array(
        z.object({
          studentId: z.string().min(1),
          columnKey: z.nativeEnum(ExamMarksColumnKey),
          marksObtained: z.number().nullable().optional(),
          isAbsent: z.boolean().optional(),
          remarks: z.string().optional(),
        }),
      ),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    try {
      return res.json(await saveStaffMarksDraft(req.mobileUser!, req.params.sheetId, parsed.data.entries));
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to save marks' });
    }
  }),
);

mobileRouter.get(
  '/staff/papers',
  ...teacherPrincipal,
  asyncHandler(async (req, res) => {
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
    return res.json(await getStaffExamPapers(req.mobileUser!, academicYear));
  }),
);

mobileRouter.post(
  '/staff/papers/:paperId/publish',
  ...teacherPrincipal,
  asyncHandler(async (req, res) => {
    try {
      return res.json(await publishStaffExamPaper(req.mobileUser!, req.params.paperId));
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to publish paper' });
    }
  }),
);

mobileRouter.get(
  '/staff/approvals/leave',
  requireMobileAuth,
  requirePasswordChanged,
  requireMobileRoles('PRINCIPAL'),
  asyncHandler(async (req, res) => {
    try {
      return res.json(await getPrincipalPendingLeaves(req.mobileUser!));
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to load approvals' });
    }
  }),
);

mobileRouter.post(
  '/staff/approvals/leave/:id/approve',
  requireMobileAuth,
  requirePasswordChanged,
  requireMobileRoles('PRINCIPAL'),
  asyncHandler(async (req, res) => {
    const schema = z.object({
      category: z.enum(['student', 'teacher', 'staff']),
      remarks: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    try {
      return res.json(await approvePrincipalLeave(req.mobileUser!, { ...parsed.data, id: req.params.id }));
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to approve leave' });
    }
  }),
);

mobileRouter.post(
  '/staff/approvals/leave/:id/reject',
  requireMobileAuth,
  requirePasswordChanged,
  requireMobileRoles('PRINCIPAL'),
  asyncHandler(async (req, res) => {
    const schema = z.object({
      category: z.enum(['student', 'teacher', 'staff']),
      remarks: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    try {
      return res.json(await rejectPrincipalLeave(req.mobileUser!, { ...parsed.data, id: req.params.id }));
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Failed to reject leave' });
    }
  }),
);

// ─── Dev helper: seed a welcome notification (optional) ───────────────────────

mobileRouter.post(
  '/notifications/seed-welcome',
  requireMobileAuth,
  asyncHandler(async (req, res) => {
    if (process.env.NODE_ENV === 'production') {
      return res.status(404).json({ error: 'Not found' });
    }
    const user = req.mobileUser!;
    const existing = await prisma.mobileNotification.count({ where: { accountId: user.accountId } });
    if (existing > 0) {
      return res.json({ skipped: true, message: 'Notifications already exist' });
    }
    const { createMobileNotification } = await import('../lib/mobileNotifications.js');
    await createMobileNotification({
      institutionId: user.institutionId,
      accountId: user.accountId,
      title: 'Welcome to 360schoolERP',
      body: 'Your mobile account is active. Notifications stay visible until you mark them as read.',
      category: 'system',
    });
    return res.json({ seeded: true });
  }),
);
