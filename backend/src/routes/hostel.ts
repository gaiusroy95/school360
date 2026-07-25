import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { getDefaultInstitutionId } from '../lib/institution.js';
import {
  exportHostelDashboard,
  getHostelDashboard,
  seedHostelDashboard,
} from '../lib/hostelDashboard.js';
import {
  allocateBed,
  approveTransfer,
  autoAssignBed,
  confirmAllotmentPayment,
  createAllotmentRequest,
  deallocateBed,
  exportRoomsAllotmentReport,
  getRoomsAllotment,
  getStudentRoom,
  requestTransfer,
  seedRoomsAllotment,
  updateBedStatus,
} from '../lib/hostelRoomsAllotment.js';
import {
  createProfileUpdateRequest,
  exportHostelStudentsReport,
  getHostelStudentDetail,
  getHostelStudents,
  reviewProfileUpdateRequest,
  seedHostelStudents,
  syncHostelStudentsFromErp,
  updateHostelStudentProfile,
  verifyHostelStudentDocument,
} from '../lib/hostelStudents.js';
import {
  approvePreRegistration,
  approveVisitorEntry,
  createVisitorEntry,
  exportVisitorReport,
  getVisitorManagement,
  logVisitorExit,
  preRegisterVisitor,
  seedVisitorManagement,
  verifyVisitorOtp,
  wardenOverrideEntry,
} from '../lib/hostelVisitorManagement.js';
import {
  exportLeaveReport,
  getLeaveDetail,
  getLeaveManagement,
  parentApproveLeave,
  rejectLeave,
  securityLogReturn,
  securityVerifyExit,
  seedLeaveManagement,
  submitLeaveRequest,
  wardenApproveLeave,
} from '../lib/hostelLeaveManagement.js';
import {
  exportGatePassReport,
  getGatePassDetail,
  getGatePassManagement,
  issueGatePass,
  rejectGatePass,
  securityScanIn,
  securityScanOut,
  seedGatePassManagement,
  submitGatePassRequest,
} from '../lib/hostelGatePass.js';
import {
  confirmComplaintResolution,
  exportComplaintsReport,
  getComplaintDetail,
  getComplaintsManagement,
  resolveComplaint,
  seedComplaintsManagement,
  submitComplaint,
  takeComplaintAction,
} from '../lib/hostelComplaintsFeedback.js';
import {
  assignMaintenanceTechnician,
  closeMaintenanceTicket,
  exportMaintenanceReport,
  getMaintenanceDetail,
  getMaintenanceManagement,
  raiseMaintenanceTicket,
  resolveMaintenanceTicket,
  seedMaintenanceManagement,
  startMaintenanceWork,
} from '../lib/hostelMaintenance.js';
import {
  acknowledgeProcurementAlert,
  assignAssetToBed,
  createInventoryAsset,
  exportInventoryReport,
  getInventoryManagement,
  recordStockIn,
  releaseAssetFromBed,
  seedInventoryManagement,
  upsertInventoryItem,
} from '../lib/hostelInventory.js';
import {
  collectLaundry,
  dispatchLaundryBatch,
  dropLaundry,
  exportLaundryReport,
  getLaundryManagement,
  getStudentLaundryMobile,
  receiveLaundryBatch,
  seedLaundryManagement,
} from '../lib/hostelLaundryManagement.js';
import {
  escalateDisciplineIncident,
  exportDisciplineReport,
  getDisciplineIncidentDetail,
  getDisciplineManagement,
  logDisciplineIncident,
  resolveDisciplineIncident,
  seedDisciplineManagement,
} from '../lib/hostelDisciplineIncidents.js';
import {
  deleteHostelReportSchedule,
  exportHostelReport,
  generateHostelReport,
  getHostelReportsAnalytics,
  scheduleHostelReport,
  seedHostelReportsAnalytics,
} from '../lib/hostelReportsAnalytics.js';
import {
  exportMessReport,
  getMessManagement,
  logMessAttendance,
  optOutMess,
  recordMessExpense,
  seedMessManagement,
  submitMessFeedback,
  upsertMessMenu,
} from '../lib/hostelMessManagement.js';

export const hostelRouter = Router();
hostelRouter.use(requireAuth);

hostelRouter.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = String(req.query.academicYear ?? '2025-26');
    const hostelId = req.query.hostelId ? String(req.query.hostelId) : undefined;
    const userRole = String(req.query.role ?? 'Admin');
    const data = await getHostelDashboard(institutionId, academicYear, hostelId, userRole);
    return res.json(data);
  }),
);

hostelRouter.post(
  '/dashboard/export',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const { academicYear, hostelId, format } = req.body;
    const result = await exportHostelDashboard(
      institutionId,
      academicYear ?? '2025-26',
      hostelId,
      format ?? 'PDF',
    );
    return res.json(result);
  }),
);

hostelRouter.get(
  '/rooms-allotment',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = String(req.query.academicYear ?? '2025-26');
    const data = await getRoomsAllotment(institutionId, academicYear, {
      hostelId: req.query.hostelId ? String(req.query.hostelId) : undefined,
      blockId: req.query.blockId ? String(req.query.blockId) : undefined,
      floorId: req.query.floorId ? String(req.query.floorId) : undefined,
      roomType: req.query.roomType ? String(req.query.roomType) : undefined,
      userRole: req.query.role ? String(req.query.role) : 'Admin',
    });
    return res.json(data);
  }),
);

hostelRouter.post(
  '/rooms-allotment/allocate',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await allocateBed(institutionId, req.body);
    return res.json(result);
  }),
);

hostelRouter.post(
  '/rooms-allotment/confirm-payment',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const { allotmentId, collectedBy } = req.body;
    const result = await confirmAllotmentPayment(institutionId, allotmentId, collectedBy);
    return res.json(result);
  }),
);

hostelRouter.post(
  '/rooms-allotment/deallocate',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await deallocateBed(institutionId, req.body);
    return res.json(result);
  }),
);

hostelRouter.post(
  '/rooms-allotment/transfer',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await requestTransfer(institutionId, req.body);
    return res.json(result);
  }),
);

hostelRouter.post(
  '/rooms-allotment/approve-transfer',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const { transferId, approverRole, approverName } = req.body;
    const result = await approveTransfer(institutionId, transferId, approverRole, approverName);
    return res.json(result);
  }),
);

hostelRouter.post(
  '/rooms-allotment/request',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await createAllotmentRequest(institutionId, req.body);
    return res.json(result);
  }),
);

hostelRouter.post(
  '/rooms-allotment/bed-status',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const { bedId, bedStatus, performedBy } = req.body;
    const result = await updateBedStatus(institutionId, bedId, bedStatus, performedBy);
    return res.json(result);
  }),
);

hostelRouter.post(
  '/rooms-allotment/auto-assign',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await autoAssignBed(institutionId, req.body);
    return res.json(result);
  }),
);

hostelRouter.post(
  '/rooms-allotment/export',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const { academicYear, hostelId, format } = req.body;
    const result = await exportRoomsAllotmentReport(
      institutionId,
      academicYear ?? '2025-26',
      format ?? 'PDF',
      hostelId,
    );
    return res.json(result);
  }),
);

hostelRouter.get(
  '/rooms-allotment/my-room',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const studentId = String(req.query.studentId ?? 'STU-BHA-BHA11-01-3');
    const academicYear = String(req.query.academicYear ?? '2025-26');
    const data = await getStudentRoom(institutionId, studentId, academicYear);
    return res.json(data);
  }),
);

hostelRouter.get(
  '/students',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = String(req.query.academicYear ?? '2025-26');
    const data = await getHostelStudents(institutionId, academicYear, {
      q: req.query.q ? String(req.query.q) : undefined,
      branch: req.query.branch ? String(req.query.branch) : undefined,
      batch: req.query.batch ? String(req.query.batch) : undefined,
      hostelId: req.query.hostelId ? String(req.query.hostelId) : undefined,
      room: req.query.room ? String(req.query.room) : undefined,
      docStatus: req.query.docStatus ? String(req.query.docStatus) : undefined,
      userRole: req.query.role ? String(req.query.role) : 'Admin',
    });
    return res.json(data);
  }),
);

hostelRouter.post(
  '/students/sync',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const { academicYear } = req.body;
    const result = await syncHostelStudentsFromErp(institutionId, academicYear ?? '2025-26');
    const data = await getHostelStudents(institutionId, academicYear ?? '2025-26');
    return res.json({ ...result, ...data });
  }),
);

hostelRouter.get(
  '/students/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await getHostelStudentDetail(institutionId, String(req.params.id));
    return res.json(data);
  }),
);

hostelRouter.patch(
  '/students/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await updateHostelStudentProfile(institutionId, String(req.params.id), req.body, req.body.performedBy);
    return res.json(data);
  }),
);

hostelRouter.post(
  '/students/:id/update-request',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await createProfileUpdateRequest(
      institutionId,
      String(req.params.id),
      req.body.fieldChanges ?? req.body,
      req.body.requestedBy,
    );
    return res.json(result);
  }),
);

hostelRouter.post(
  '/students/update-requests/:requestId/review',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const { action, reviewedBy, rejectionReason } = req.body;
    const result = await reviewProfileUpdateRequest(
      institutionId,
      String(req.params.requestId),
      action,
      reviewedBy,
      rejectionReason,
    );
    return res.json(result);
  }),
);

hostelRouter.post(
  '/students/documents/:documentId/verify',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const { status, verifiedBy } = req.body;
    const result = await verifyHostelStudentDocument(institutionId, String(req.params.documentId), status, verifiedBy);
    return res.json(result);
  }),
);

hostelRouter.post(
  '/students/export',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const { academicYear, format, reportType } = req.body;
    const result = await exportHostelStudentsReport(
      institutionId,
      academicYear ?? '2025-26',
      format ?? 'PDF',
      reportType ?? 'Hostel Directory',
    );
    return res.json(result);
  }),
);

hostelRouter.get(
  '/visitors',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await getVisitorManagement(institutionId, String(req.query.academicYear ?? '2025-26'), {
      hostelId: req.query.hostelId ? String(req.query.hostelId) : undefined,
      visitDate: req.query.visitDate ? String(req.query.visitDate) : undefined,
      userRole: req.query.role ? String(req.query.role) : 'Security',
    });
    return res.json(data);
  }),
);

hostelRouter.post(
  '/visitors/entry',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await createVisitorEntry(institutionId, req.body);
    return res.json(result);
  }),
);

hostelRouter.post(
  '/visitors/:id/verify-otp',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const { otp } = req.body;
    const result = await verifyVisitorOtp(institutionId, String(req.params.id), otp);
    return res.json(result);
  }),
);

hostelRouter.post(
  '/visitors/:id/exit',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await logVisitorExit(institutionId, String(req.params.id), req.body.performedBy);
    return res.json(result);
  }),
);

hostelRouter.post(
  '/visitors/:id/approve',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const { action, wardenName } = req.body;
    const result = await approveVisitorEntry(institutionId, String(req.params.id), action, wardenName);
    return res.json(result);
  }),
);

hostelRouter.post(
  '/visitors/:id/override',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const { reason, wardenName } = req.body;
    const result = await wardenOverrideEntry(institutionId, String(req.params.id), reason, wardenName);
    return res.json(result);
  }),
);

hostelRouter.post(
  '/visitors/pre-register',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await preRegisterVisitor(institutionId, req.body);
    return res.json(result);
  }),
);

hostelRouter.post(
  '/visitors/pre-register/:id/review',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const { action, wardenName, rejectionReason } = req.body;
    const result = await approvePreRegistration(institutionId, String(req.params.id), action, wardenName, rejectionReason);
    return res.json(result);
  }),
);

hostelRouter.post(
  '/visitors/export',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const { academicYear, format, reportType } = req.body;
    const result = await exportVisitorReport(institutionId, academicYear ?? '2025-26', format ?? 'PDF', reportType);
    return res.json(result);
  }),
);

hostelRouter.get(
  '/mess',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await getMessManagement(institutionId, String(req.query.academicYear ?? '2025-26'), {
      weekStart: req.query.weekStart ? String(req.query.weekStart) : undefined,
      userRole: req.query.role ? String(req.query.role) : 'Mess Manager',
    });
    return res.json(data);
  }),
);

hostelRouter.post(
  '/mess/menu',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await upsertMessMenu(institutionId, req.body, req.body.performedBy);
    return res.json(result);
  }),
);

hostelRouter.post(
  '/mess/attendance',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await logMessAttendance(institutionId, req.body);
    return res.json(result);
  }),
);

hostelRouter.post(
  '/mess/expense',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await recordMessExpense(institutionId, req.body, req.body.recordedBy);
    return res.json(result);
  }),
);

hostelRouter.post(
  '/mess/feedback',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await submitMessFeedback(institutionId, req.body);
    return res.json(result);
  }),
);

hostelRouter.post(
  '/mess/opt-out',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await optOutMess(institutionId, req.body);
    return res.json(result);
  }),
);

hostelRouter.post(
  '/mess/export',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const { academicYear, format, reportType } = req.body;
    const result = await exportMessReport(institutionId, academicYear ?? '2025-26', format ?? 'PDF', reportType);
    return res.json(result);
  }),
);

hostelRouter.get(
  '/leave',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await getLeaveManagement(institutionId, String(req.query.academicYear ?? '2025-26'), {
      status: req.query.status ? String(req.query.status) : undefined,
      userRole: req.query.role ? String(req.query.role) : 'Warden',
    });
    return res.json(data);
  }),
);

hostelRouter.get(
  '/leave/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await getLeaveDetail(institutionId, String(req.params.id));
    return res.json(data);
  }),
);

hostelRouter.post(
  '/leave/request',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await submitLeaveRequest(institutionId, req.body);
    return res.json(result);
  }),
);

hostelRouter.post(
  '/leave/:id/parent-approve',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await parentApproveLeave(institutionId, String(req.params.id), req.body);
    return res.json(result);
  }),
);

hostelRouter.post(
  '/leave/:id/warden-approve',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await wardenApproveLeave(institutionId, String(req.params.id), req.body.wardenName);
    return res.json(result);
  }),
);

hostelRouter.post(
  '/leave/:id/reject',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await rejectLeave(institutionId, String(req.params.id), req.body);
    return res.json(result);
  }),
);

hostelRouter.post(
  '/leave/verify-exit',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await securityVerifyExit(institutionId, req.body);
    return res.json(result);
  }),
);

hostelRouter.post(
  '/leave/:id/return',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await securityLogReturn(institutionId, String(req.params.id), req.body.securityName);
    return res.json(result);
  }),
);

hostelRouter.post(
  '/leave/export',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const { academicYear, format, reportType } = req.body;
    const result = await exportLeaveReport(institutionId, academicYear ?? '2025-26', format ?? 'PDF', reportType);
    return res.json(result);
  }),
);

hostelRouter.get(
  '/gate-pass',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await getGatePassManagement(institutionId, String(req.query.academicYear ?? '2025-26'), {
      status: req.query.status ? String(req.query.status) : undefined,
      userRole: req.query.role ? String(req.query.role) : 'Warden',
    });
    return res.json(data);
  }),
);

hostelRouter.get(
  '/gate-pass/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await getGatePassDetail(institutionId, String(req.params.id));
    return res.json(data);
  }),
);

hostelRouter.post(
  '/gate-pass/request',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await submitGatePassRequest(institutionId, req.body);
    return res.json(result);
  }),
);

hostelRouter.post(
  '/gate-pass/:id/issue',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await issueGatePass(institutionId, String(req.params.id), req.body);
    return res.json(result);
  }),
);

hostelRouter.post(
  '/gate-pass/:id/reject',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await rejectGatePass(institutionId, String(req.params.id), req.body);
    return res.json(result);
  }),
);

hostelRouter.post(
  '/gate-pass/scan-out',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await securityScanOut(institutionId, req.body);
    return res.json(result);
  }),
);

hostelRouter.post(
  '/gate-pass/scan-in',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await securityScanIn(institutionId, req.body);
    return res.json(result);
  }),
);

hostelRouter.post(
  '/gate-pass/export',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const { academicYear, format, reportType } = req.body;
    const result = await exportGatePassReport(institutionId, academicYear ?? '2025-26', format ?? 'PDF', reportType);
    return res.json(result);
  }),
);

hostelRouter.get(
  '/complaints',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await getComplaintsManagement(institutionId, String(req.query.academicYear ?? '2025-26'), {
      status: req.query.status ? String(req.query.status) : undefined,
      category: req.query.category ? String(req.query.category) : undefined,
      userRole: req.query.role ? String(req.query.role) : 'Warden',
    });
    return res.json(data);
  }),
);

hostelRouter.get(
  '/complaints/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await getComplaintDetail(institutionId, String(req.params.id));
    return res.json(data);
  }),
);

hostelRouter.post(
  '/complaints/submit',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await submitComplaint(institutionId, req.body);
    return res.json(result);
  }),
);

hostelRouter.post(
  '/complaints/:id/action',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await takeComplaintAction(institutionId, String(req.params.id), req.body);
    return res.json(result);
  }),
);

hostelRouter.post(
  '/complaints/:id/resolve',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await resolveComplaint(institutionId, String(req.params.id), req.body);
    return res.json(result);
  }),
);

hostelRouter.post(
  '/complaints/:id/confirm',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await confirmComplaintResolution(institutionId, String(req.params.id), req.body);
    return res.json(result);
  }),
);

hostelRouter.post(
  '/complaints/export',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const { academicYear, format, reportType } = req.body;
    const result = await exportComplaintsReport(institutionId, academicYear ?? '2025-26', format ?? 'PDF', reportType);
    return res.json(result);
  }),
);

hostelRouter.get(
  '/maintenance',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await getMaintenanceManagement(institutionId, String(req.query.academicYear ?? '2025-26'), {
      status: req.query.status ? String(req.query.status) : undefined,
      category: req.query.category ? String(req.query.category) : undefined,
      userRole: req.query.role ? String(req.query.role) : 'Facility Manager',
    });
    return res.json(data);
  }),
);

hostelRouter.get(
  '/maintenance/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await getMaintenanceDetail(institutionId, String(req.params.id));
    return res.json(data);
  }),
);

hostelRouter.post(
  '/maintenance/raise',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await raiseMaintenanceTicket(institutionId, req.body);
    return res.json(result);
  }),
);

hostelRouter.post(
  '/maintenance/:id/assign',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await assignMaintenanceTechnician(institutionId, String(req.params.id), req.body);
    return res.json(result);
  }),
);

hostelRouter.post(
  '/maintenance/:id/start',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await startMaintenanceWork(institutionId, String(req.params.id), req.body);
    return res.json(result);
  }),
);

hostelRouter.post(
  '/maintenance/:id/resolve',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await resolveMaintenanceTicket(institutionId, String(req.params.id), req.body);
    return res.json(result);
  }),
);

hostelRouter.post(
  '/maintenance/:id/close',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await closeMaintenanceTicket(institutionId, String(req.params.id), req.body);
    return res.json(result);
  }),
);

hostelRouter.post(
  '/maintenance/export',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const { academicYear, format, reportType } = req.body;
    const result = await exportMaintenanceReport(institutionId, academicYear ?? '2025-26', format ?? 'PDF', reportType);
    return res.json(result);
  }),
);

hostelRouter.get(
  '/inventory',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await getInventoryManagement(institutionId, String(req.query.academicYear ?? '2025-26'), {
      itemType: req.query.itemType ? String(req.query.itemType) : undefined,
      subCategory: req.query.subCategory ? String(req.query.subCategory) : undefined,
    });
    return res.json(data);
  }),
);

hostelRouter.post(
  '/inventory/items',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await upsertInventoryItem(institutionId, req.body);
    return res.json(result);
  }),
);

hostelRouter.post(
  '/inventory/stock-in',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await recordStockIn(institutionId, req.body);
    return res.json(result);
  }),
);

hostelRouter.post(
  '/inventory/assets',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await createInventoryAsset(institutionId, req.body);
    return res.json(result);
  }),
);

hostelRouter.post(
  '/inventory/assign-bed',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await assignAssetToBed(institutionId, req.body);
    return res.json(result);
  }),
);

hostelRouter.post(
  '/inventory/mappings/:id/release',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await releaseAssetFromBed(institutionId, String(req.params.id), req.body.performedBy);
    return res.json(result);
  }),
);

hostelRouter.post(
  '/inventory/alerts/:id/acknowledge',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await acknowledgeProcurementAlert(institutionId, String(req.params.id));
    return res.json(result);
  }),
);

hostelRouter.post(
  '/inventory/export',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const { academicYear, format, reportType } = req.body;
    const result = await exportInventoryReport(institutionId, academicYear ?? '2025-26', format ?? 'PDF', reportType);
    return res.json(result);
  }),
);

hostelRouter.get(
  '/laundry',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await getLaundryManagement(institutionId, String(req.query.academicYear ?? '2025-26'), {
      status: req.query.status ? String(req.query.status) : undefined,
      monthLabel: req.query.month ? String(req.query.month) : undefined,
    });
    return res.json(data);
  }),
);

hostelRouter.get(
  '/laundry/mobile/:studentProfileId',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await getStudentLaundryMobile(
      institutionId,
      String(req.params.studentProfileId),
      String(req.query.academicYear ?? '2025-26'),
    );
    return res.json(data);
  }),
);

hostelRouter.post(
  '/laundry/drop',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await dropLaundry(institutionId, req.body);
    return res.json(result);
  }),
);

hostelRouter.post(
  '/laundry/dispatch',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await dispatchLaundryBatch(institutionId, req.body);
    return res.json(result);
  }),
);

hostelRouter.post(
  '/laundry/batch/:id/receive',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await receiveLaundryBatch(institutionId, String(req.params.id), req.body.performedBy);
    return res.json(result);
  }),
);

hostelRouter.post(
  '/laundry/collect',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await collectLaundry(institutionId, req.body);
    return res.json(result);
  }),
);

hostelRouter.post(
  '/laundry/export',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const { academicYear, format, reportType } = req.body;
    const result = await exportLaundryReport(institutionId, academicYear ?? '2025-26', format ?? 'PDF', reportType);
    return res.json(result);
  }),
);

hostelRouter.get(
  '/discipline',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await getDisciplineManagement(institutionId, String(req.query.academicYear ?? '2025-26'), {
      status: req.query.status ? String(req.query.status) : undefined,
      severity: req.query.severity ? String(req.query.severity) : undefined,
      monthLabel: req.query.monthLabel ? String(req.query.monthLabel) : undefined,
    });
    return res.json(data);
  }),
);

hostelRouter.get(
  '/discipline/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await getDisciplineIncidentDetail(institutionId, String(req.params.id));
    return res.json(data);
  }),
);

hostelRouter.post(
  '/discipline/log',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await logDisciplineIncident(institutionId, req.body);
    return res.json(result);
  }),
);

hostelRouter.post(
  '/discipline/:id/resolve',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await resolveDisciplineIncident(institutionId, String(req.params.id), req.body);
    return res.json(result);
  }),
);

hostelRouter.post(
  '/discipline/:id/escalate',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await escalateDisciplineIncident(institutionId, String(req.params.id), req.body.performedBy);
    return res.json(result);
  }),
);

hostelRouter.post(
  '/discipline/export',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const { academicYear, format, reportType } = req.body;
    const result = await exportDisciplineReport(institutionId, academicYear ?? '2025-26', format ?? 'PDF', reportType);
    return res.json(result);
  }),
);

hostelRouter.get(
  '/reports',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await getHostelReportsAnalytics(
      institutionId,
      String(req.query.academicYear ?? '2025-26'),
      req.query.hostelId ? String(req.query.hostelId) : undefined,
    );
    return res.json(data);
  }),
);

hostelRouter.post(
  '/reports/generate',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const { templateId, filters } = req.body;
    const result = await generateHostelReport(institutionId, templateId, filters ?? {});
    return res.json(result);
  }),
);

hostelRouter.post(
  '/reports/export',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const { templateId, format, filters } = req.body;
    const result = await exportHostelReport(institutionId, templateId, format ?? 'PDF', filters ?? {});
    return res.json(result);
  }),
);

hostelRouter.post(
  '/reports/schedule',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await scheduleHostelReport(institutionId, req.body);
    return res.json(result);
  }),
);

hostelRouter.delete(
  '/reports/schedules/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await deleteHostelReportSchedule(institutionId, String(req.params.id));
    return res.json(result);
  }),
);
