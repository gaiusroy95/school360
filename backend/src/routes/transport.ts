import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { getDefaultInstitutionId } from '../lib/institution.js';
import { getTransportDashboard, seedTransportDashboard } from '../lib/transportDashboard.js';
import {
  archiveTransportRoute,
  assignVehicleRoute,
  cloneTransportRoute,
  createTransportRoute,
  createTransportVehicle,
  getTransportMaster,
  seedTransportMaster,
  toggleLiveTracking,
} from '../lib/transportMaster.js';
import {
  allocatePlanSeats,
  approveRoutePlan,
  archiveRoutePlan,
  assignPlanResources,
  cancelRoutePlan,
  cloneRoutePlan,
  createRoutePlan,
  getTransportRoutePlanning,
  optimizeRoutePlan,
  pauseRoutePlan,
  publishRoutePlan,
  resumeRoutePlan,
  seedTransportRoutePlanning,
  submitPlanForApproval,
  updateRoutePlan,
} from '../lib/transportRoutePlanning.js';
import {
  acknowledgeAlert,
  endLiveTrip,
  getTransportLiveTracking,
  pauseLiveTrip,
  resumeLiveTrip,
  seedTransportLiveTracking,
  startLiveTrip,
  triggerLiveSos,
  updateTrackingSettings,
} from '../lib/transportLiveTracking.js';
import {
  allocateStudentTransport,
  approveStudentTransport,
  createStudentTransportApplication,
  createTransportRequest,
  getTransportStudentTransport,
  recordStudentBoarding,
  resolveTransportRequest,
  seedTransportStudentTransport,
} from '../lib/transportStudentTransport.js';
import {
  approveStaffLeave,
  assignStaffDuty,
  getTransportDriverAttendant,
  recordStaffAttendance,
  registerTransportStaff,
  seedTransportDriverAttendant,
  verifyStaffLicense,
} from '../lib/transportDriverAttendant.js';
import {
  addTripIncident,
  approveTransportTrip,
  cancelTransportTrip,
  completeTransportTrip,
  getTransportTripManagement,
  pauseTransportTrip,
  resumeTransportTrip,
  scheduleTransportTrip,
  seedTransportTripManagement,
  startTransportTrip,
} from '../lib/transportTripManagement.js';
import {
  createGeofence,
  createStopMaster,
  getTransportStopsGeoFencing,
  importFromGoogleMapsPaste,
  importStopsFromRows,
  linkStopToRoute,
  seedTransportStopsGeoFencing,
  updateGeofence,
  updateStopMaster,
  validateStopGeo,
} from '../lib/transportStopsGeoFencing.js';
import {
  confirmVehicleEmpty,
  getTransportAttendance,
  lockTransportAttendance,
  markTransportAbsent,
  reconcileTransportAttendance,
  recordTransportAttendance,
  requestAttendanceCorrection,
  resolveAttendanceCorrection,
  seedTransportAttendance,
} from '../lib/transportAttendance.js';
import {
  applyLatePenalties,
  approveTransportRefund,
  assignStudentFee,
  autoAssignFeesFromRoutes,
  collectTransportFeePayment,
  createFeeStructure,
  generateTransportInvoices,
  getTransportFeeManagement,
  requestTransportRefund,
  reviseFeeStructure,
  seedTransportFeeManagement,
  waiveTransportPenalty,
} from '../lib/transportFeeManagement.js';
import {
  createWorkOrder,
  getTransportFleetMaintenance,
  recordFuelEntry,
  recordInspection,
  registerBreakdown,
  seedTransportFleetMaintenance,
  updateWorkOrderStatus,
} from '../lib/transportFleetMaintenance.js';
import {
  approveFuelRequest,
  assignFuelCard,
  createFuelRequest,
  createFuelStation,
  getTransportFuelManagement,
  recordFuelFill,
  recordMileageLog,
  resolveFuelAnomaly,
  seedTransportFuelManagement,
  syncDeviceReading,
} from '../lib/transportFuelManagement.js';
import {
  acknowledgeSafetyAlert,
  escalateSafetyAlert,
  getTransportSafetyAlerts,
  resolveSafetyAlert,
  reviewSafetyReport,
  seedTransportSafetyAlerts,
  submitMobileSafetyReport,
  triggerGpsAccidentAlert,
  triggerSosAlert,
} from '../lib/transportSafetyAlerts.js';
import {
  getTransportReportsAnalytics,
  scheduleTransportReport,
  seedTransportReportsAnalytics,
} from '../lib/transportReportsAnalytics.js';

export const transportRouter = Router();
transportRouter.use(requireAuth);

transportRouter.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = String(req.query.academicYear ?? '2025-26');
    const data = await getTransportDashboard(institutionId, academicYear);
    return res.json(data);
  }),
);

transportRouter.post(
  '/dashboard/seed-demo',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await seedTransportDashboard(institutionId);
    return res.json(data);
  }),
);

// ─── Route & Vehicle Master ─────────────────────────────────────────────

transportRouter.get(
  '/master',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = String(req.query.academicYear ?? '2025-26');
    const data = await getTransportMaster(institutionId, academicYear);
    return res.json(data);
  }),
);

transportRouter.post(
  '/master/routes',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await createTransportRoute(institutionId, req.body);
    const data = await getTransportMaster(institutionId, String(req.body.academicYear ?? '2025-26'));
    return res.json(data);
  }),
);

transportRouter.post(
  '/master/routes/:id/clone',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await cloneTransportRoute(institutionId, req.params.id);
    const data = await getTransportMaster(institutionId);
    return res.json(data);
  }),
);

transportRouter.post(
  '/master/routes/:id/archive',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await archiveTransportRoute(institutionId, req.params.id);
    const data = await getTransportMaster(institutionId);
    return res.json(data);
  }),
);

transportRouter.post(
  '/master/vehicles',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await createTransportVehicle(institutionId, req.body);
    const data = await getTransportMaster(institutionId);
    return res.json(data);
  }),
);

transportRouter.post(
  '/master/vehicles/:id/assign-route',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await assignVehicleRoute(institutionId, req.params.id, String(req.body.routeId));
    const data = await getTransportMaster(institutionId);
    return res.json(data);
  }),
);

transportRouter.post(
  '/master/vehicles/:id/toggle-tracking',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await toggleLiveTracking(institutionId, req.params.id, Boolean(req.body.enabled));
    const data = await getTransportMaster(institutionId);
    return res.json(data);
  }),
);

transportRouter.post(
  '/master/seed-demo',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await seedTransportMaster(institutionId);
    return res.json(data);
  }),
);

// ─── Route Planning ─────────────────────────────────────────────────────

transportRouter.get(
  '/planning',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = String(req.query.academicYear ?? '2025-26');
    const data = await getTransportRoutePlanning(institutionId, academicYear);
    return res.json(data);
  }),
);

transportRouter.post(
  '/planning/plans',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await createRoutePlan(institutionId, req.body);
    const data = await getTransportRoutePlanning(institutionId, String(req.body.academicYear ?? '2025-26'));
    return res.json(data);
  }),
);

transportRouter.patch(
  '/planning/plans/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await updateRoutePlan(institutionId, req.params.id, req.body);
    const data = await getTransportRoutePlanning(institutionId);
    return res.json(data);
  }),
);

transportRouter.post(
  '/planning/plans/:id/assign',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await assignPlanResources(institutionId, req.params.id, req.body);
    const data = await getTransportRoutePlanning(institutionId);
    return res.json(data);
  }),
);

transportRouter.post(
  '/planning/plans/:id/allocate',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await allocatePlanSeats(institutionId, req.params.id, req.body);
    const data = await getTransportRoutePlanning(institutionId);
    return res.json(data);
  }),
);

transportRouter.post(
  '/planning/plans/:id/optimize',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await optimizeRoutePlan(institutionId, req.params.id);
    const data = await getTransportRoutePlanning(institutionId);
    return res.json(data);
  }),
);

transportRouter.post(
  '/planning/plans/:id/submit',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await submitPlanForApproval(institutionId, req.params.id);
    const data = await getTransportRoutePlanning(institutionId);
    return res.json(data);
  }),
);

transportRouter.post(
  '/planning/plans/:id/approve',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await approveRoutePlan(institutionId, req.params.id, req.body);
    const data = await getTransportRoutePlanning(institutionId);
    return res.json(data);
  }),
);

transportRouter.post(
  '/planning/plans/:id/publish',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await publishRoutePlan(institutionId, req.params.id);
    const data = await getTransportRoutePlanning(institutionId);
    return res.json(data);
  }),
);

transportRouter.post(
  '/planning/plans/:id/pause',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await pauseRoutePlan(institutionId, req.params.id);
    const data = await getTransportRoutePlanning(institutionId);
    return res.json(data);
  }),
);

transportRouter.post(
  '/planning/plans/:id/resume',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await resumeRoutePlan(institutionId, req.params.id);
    const data = await getTransportRoutePlanning(institutionId);
    return res.json(data);
  }),
);

transportRouter.post(
  '/planning/plans/:id/cancel',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await cancelRoutePlan(institutionId, req.params.id, String(req.body.reason ?? 'Cancelled'));
    const data = await getTransportRoutePlanning(institutionId);
    return res.json(data);
  }),
);

transportRouter.post(
  '/planning/plans/:id/archive',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await archiveRoutePlan(institutionId, req.params.id);
    const data = await getTransportRoutePlanning(institutionId);
    return res.json(data);
  }),
);

transportRouter.post(
  '/planning/plans/:id/clone',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await cloneRoutePlan(institutionId, req.params.id);
    const data = await getTransportRoutePlanning(institutionId);
    return res.json(data);
  }),
);

transportRouter.post(
  '/planning/seed-demo',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await seedTransportRoutePlanning(institutionId);
    return res.json(data);
  }),
);

// ─── Live Vehicle Tracking ──────────────────────────────────────────────

transportRouter.get(
  '/live-tracking',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await getTransportLiveTracking(institutionId);
    return res.json(data);
  }),
);

transportRouter.post(
  '/live-tracking/trips/:id/start',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await startLiveTrip(institutionId, req.params.id);
    return res.json(await getTransportLiveTracking(institutionId));
  }),
);

transportRouter.post(
  '/live-tracking/trips/:id/pause',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await pauseLiveTrip(institutionId, req.params.id);
    return res.json(await getTransportLiveTracking(institutionId));
  }),
);

transportRouter.post(
  '/live-tracking/trips/:id/resume',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await resumeLiveTrip(institutionId, req.params.id);
    return res.json(await getTransportLiveTracking(institutionId));
  }),
);

transportRouter.post(
  '/live-tracking/trips/:id/end',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await endLiveTrip(institutionId, req.params.id);
    return res.json(await getTransportLiveTracking(institutionId));
  }),
);

transportRouter.post(
  '/live-tracking/trips/:id/sos',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await triggerLiveSos(institutionId, req.params.id, String(req.body.message ?? ''));
    return res.json(await getTransportLiveTracking(institutionId));
  }),
);

transportRouter.post(
  '/live-tracking/alerts/:id/acknowledge',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await acknowledgeAlert(institutionId, req.params.id);
    return res.json(await getTransportLiveTracking(institutionId));
  }),
);

transportRouter.patch(
  '/live-tracking/settings',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await updateTrackingSettings(institutionId, req.body);
    return res.json(await getTransportLiveTracking(institutionId));
  }),
);

transportRouter.post(
  '/live-tracking/seed-demo',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await seedTransportLiveTracking(institutionId);
    return res.json(data);
  }),
);

// ─── Student Transportation ───────────────────────────────────────────────

transportRouter.get(
  '/student-transport',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = String(req.query.academicYear ?? '2025-26');
    const data = await getTransportStudentTransport(institutionId, academicYear);
    return res.json(data);
  }),
);

transportRouter.post(
  '/student-transport/applications',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await createStudentTransportApplication(institutionId, req.body);
    const data = await getTransportStudentTransport(institutionId, String(req.body.academicYear ?? '2025-26'));
    return res.json(data);
  }),
);

transportRouter.post(
  '/student-transport/enrollments/:id/allocate',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await allocateStudentTransport(institutionId, req.params.id, req.body);
    return res.json(await getTransportStudentTransport(institutionId));
  }),
);

transportRouter.post(
  '/student-transport/enrollments/:id/approve',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await approveStudentTransport(institutionId, req.params.id);
    return res.json(await getTransportStudentTransport(institutionId));
  }),
);

transportRouter.post(
  '/student-transport/enrollments/:id/boarding',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await recordStudentBoarding(institutionId, req.params.id, req.body);
    return res.json(await getTransportStudentTransport(institutionId));
  }),
);

transportRouter.post(
  '/student-transport/enrollments/:id/requests',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await createTransportRequest(institutionId, req.params.id, req.body);
    return res.json(await getTransportStudentTransport(institutionId));
  }),
);

transportRouter.post(
  '/student-transport/requests/:id/resolve',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await resolveTransportRequest(institutionId, req.params.id, req.body);
    return res.json(await getTransportStudentTransport(institutionId));
  }),
);

transportRouter.post(
  '/student-transport/seed-demo',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await seedTransportStudentTransport(institutionId);
    return res.json(data);
  }),
);

// ─── Driver & Attendant ─────────────────────────────────────────────────

transportRouter.get(
  '/driver-attendant',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await getTransportDriverAttendant(institutionId);
    return res.json(data);
  }),
);

transportRouter.post(
  '/driver-attendant/staff',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await registerTransportStaff(institutionId, req.body);
    return res.json(await getTransportDriverAttendant(institutionId));
  }),
);

transportRouter.post(
  '/driver-attendant/staff/:id/assign',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await assignStaffDuty(institutionId, req.params.id, req.body);
    return res.json(await getTransportDriverAttendant(institutionId));
  }),
);

transportRouter.post(
  '/driver-attendant/staff/:id/verify-license',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await verifyStaffLicense(institutionId, req.params.id);
    return res.json(await getTransportDriverAttendant(institutionId));
  }),
);

transportRouter.post(
  '/driver-attendant/staff/:id/attendance',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await recordStaffAttendance(institutionId, req.params.id, req.body);
    return res.json(await getTransportDriverAttendant(institutionId));
  }),
);

transportRouter.post(
  '/driver-attendant/leaves/:id/resolve',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await approveStaffLeave(institutionId, req.params.id, String(req.body.action ?? 'APPROVED'));
    return res.json(await getTransportDriverAttendant(institutionId));
  }),
);

transportRouter.post(
  '/driver-attendant/seed-demo',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await seedTransportDriverAttendant(institutionId);
    return res.json(data);
  }),
);

// ─── Trip Management ────────────────────────────────────────────────────

transportRouter.get(
  '/trips',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = String(req.query.academicYear ?? '2025-26');
    const data = await getTransportTripManagement(institutionId, academicYear);
    return res.json(data);
  }),
);

transportRouter.post(
  '/trips',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await scheduleTransportTrip(institutionId, req.body);
    return res.json(await getTransportTripManagement(institutionId, String(req.body.academicYear ?? '2025-26')));
  }),
);

transportRouter.post(
  '/trips/:id/approve',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await approveTransportTrip(institutionId, req.params.id);
    return res.json(await getTransportTripManagement(institutionId));
  }),
);

transportRouter.post(
  '/trips/:id/start',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await startTransportTrip(institutionId, req.params.id, req.body);
    return res.json(await getTransportTripManagement(institutionId));
  }),
);

transportRouter.post(
  '/trips/:id/pause',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await pauseTransportTrip(institutionId, req.params.id);
    return res.json(await getTransportTripManagement(institutionId));
  }),
);

transportRouter.post(
  '/trips/:id/resume',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await resumeTransportTrip(institutionId, req.params.id);
    return res.json(await getTransportTripManagement(institutionId));
  }),
);

transportRouter.post(
  '/trips/:id/complete',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await completeTransportTrip(institutionId, req.params.id, req.body);
    return res.json(await getTransportTripManagement(institutionId));
  }),
);

transportRouter.post(
  '/trips/:id/cancel',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await cancelTransportTrip(institutionId, req.params.id, String(req.body.reason ?? 'Cancelled'));
    return res.json(await getTransportTripManagement(institutionId));
  }),
);

transportRouter.post(
  '/trips/:id/incidents',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await addTripIncident(institutionId, req.params.id, req.body);
    return res.json(await getTransportTripManagement(institutionId));
  }),
);

transportRouter.post(
  '/trips/seed-demo',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await seedTransportTripManagement(institutionId);
    return res.json(data);
  }),
);

// ─── Stops & Geo Fencing ────────────────────────────────────────────────

transportRouter.get(
  '/stops-geo',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = String(req.query.academicYear ?? '2025-26');
    const data = await getTransportStopsGeoFencing(institutionId, academicYear);
    return res.json(data);
  }),
);

transportRouter.post(
  '/stops-geo/stops',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await createStopMaster(institutionId, req.body);
    return res.json(await getTransportStopsGeoFencing(institutionId, String(req.body.academicYear ?? '2025-26')));
  }),
);

transportRouter.patch(
  '/stops-geo/stops/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await updateStopMaster(institutionId, req.params.id, req.body);
    return res.json(await getTransportStopsGeoFencing(institutionId));
  }),
);

transportRouter.post(
  '/stops-geo/stops/:id/validate',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await validateStopGeo(institutionId, req.params.id);
    return res.json(await getTransportStopsGeoFencing(institutionId));
  }),
);

transportRouter.post(
  '/stops-geo/stops/:id/link-route',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await linkStopToRoute(institutionId, req.params.id, String(req.body.routeId), Number(req.body.sequenceOrder ?? 0) || undefined);
    return res.json(await getTransportStopsGeoFencing(institutionId));
  }),
);

transportRouter.post(
  '/stops-geo/geofences',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await createGeofence(institutionId, req.body);
    return res.json(await getTransportStopsGeoFencing(institutionId));
  }),
);

transportRouter.patch(
  '/stops-geo/geofences/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await updateGeofence(institutionId, req.params.id, req.body);
    return res.json(await getTransportStopsGeoFencing(institutionId));
  }),
);

transportRouter.post(
  '/stops-geo/import/excel',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const rows = Array.isArray(req.body.rows) ? req.body.rows : [];
    await importStopsFromRows(institutionId, rows, 'EXCEL', String(req.body.fileName ?? 'Excel import'));
    return res.json(await getTransportStopsGeoFencing(institutionId, String(req.body.academicYear ?? '2025-26')));
  }),
);

transportRouter.post(
  '/stops-geo/import/google-maps',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const lines = Array.isArray(req.body.lines) ? req.body.lines.map(String) : String(req.body.text ?? '').split('\n');
    await importFromGoogleMapsPaste(institutionId, lines, String(req.body.fileName ?? 'Google Maps paste'));
    return res.json(await getTransportStopsGeoFencing(institutionId, String(req.body.academicYear ?? '2025-26')));
  }),
);

transportRouter.post(
  '/stops-geo/seed-demo',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await seedTransportStopsGeoFencing(institutionId);
    return res.json(data);
  }),
);

// ─── Transport Attendance ───────────────────────────────────────────────

transportRouter.get(
  '/attendance',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = String(req.query.academicYear ?? '2025-26');
    const data = await getTransportAttendance(institutionId, academicYear);
    return res.json(data);
  }),
);

transportRouter.post(
  '/attendance/records/:id/scan',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await recordTransportAttendance(institutionId, req.params.id, req.body);
    return res.json(await getTransportAttendance(institutionId));
  }),
);

transportRouter.post(
  '/attendance/records/:id/absent',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await markTransportAbsent(institutionId, req.params.id, String(req.body.reason ?? 'Absent'));
    return res.json(await getTransportAttendance(institutionId));
  }),
);

transportRouter.post(
  '/attendance/sessions/:id/vehicle-empty',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await confirmVehicleEmpty(institutionId, _req.params.id);
    return res.json(await getTransportAttendance(institutionId));
  }),
);

transportRouter.post(
  '/attendance/sessions/:id/lock',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await lockTransportAttendance(institutionId, req.params.id);
    return res.json(await getTransportAttendance(institutionId));
  }),
);

transportRouter.post(
  '/attendance/sessions/:id/reconcile',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await reconcileTransportAttendance(institutionId, req.params.id);
    return res.json(await getTransportAttendance(institutionId));
  }),
);

transportRouter.post(
  '/attendance/records/:id/corrections',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await requestAttendanceCorrection(institutionId, req.params.id, req.body);
    return res.json(await getTransportAttendance(institutionId));
  }),
);

transportRouter.post(
  '/attendance/corrections/:id/resolve',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await resolveAttendanceCorrection(institutionId, req.params.id, String(req.body.action ?? 'APPROVED'));
    return res.json(await getTransportAttendance(institutionId));
  }),
);

transportRouter.post(
  '/attendance/seed-demo',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await seedTransportAttendance(institutionId);
    return res.json(data);
  }),
);

// ─── Transport Fee Management ───────────────────────────────────────────

transportRouter.get(
  '/fees',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = String(req.query.academicYear ?? '2025-26');
    const data = await getTransportFeeManagement(institutionId, academicYear);
    return res.json(data);
  }),
);

transportRouter.post(
  '/fees/structures',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await createFeeStructure(institutionId, req.body);
    return res.json(await getTransportFeeManagement(institutionId, String(req.body.academicYear ?? '2025-26')));
  }),
);

transportRouter.post(
  '/fees/structures/:id/revise',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await reviseFeeStructure(institutionId, req.params.id, req.body);
    return res.json(await getTransportFeeManagement(institutionId));
  }),
);

transportRouter.post(
  '/fees/assign',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await assignStudentFee(institutionId, req.body);
    return res.json(await getTransportFeeManagement(institutionId, String(req.body.academicYear ?? '2025-26')));
  }),
);

transportRouter.post(
  '/fees/auto-assign',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = String(req.body.academicYear ?? '2025-26');
    await autoAssignFeesFromRoutes(institutionId, academicYear);
    return res.json(await getTransportFeeManagement(institutionId, academicYear));
  }),
);

transportRouter.post(
  '/fees/generate-invoices',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = String(req.body.academicYear ?? '2025-26');
    await generateTransportInvoices(institutionId, academicYear, req.body.periodLabel ? String(req.body.periodLabel) : undefined);
    return res.json(await getTransportFeeManagement(institutionId, academicYear));
  }),
);

transportRouter.post(
  '/fees/invoices/:id/collect',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await collectTransportFeePayment(institutionId, req.params.id, req.body);
    return res.json(await getTransportFeeManagement(institutionId));
  }),
);

transportRouter.post(
  '/fees/penalties/:id/waive',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await waiveTransportPenalty(institutionId, req.params.id, String(req.body.reason ?? 'Waived'));
    return res.json(await getTransportFeeManagement(institutionId));
  }),
);

transportRouter.post(
  '/fees/refunds',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await requestTransportRefund(institutionId, req.body);
    return res.json(await getTransportFeeManagement(institutionId));
  }),
);

transportRouter.post(
  '/fees/refunds/:id/approve',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await approveTransportRefund(institutionId, req.params.id);
    return res.json(await getTransportFeeManagement(institutionId));
  }),
);

transportRouter.post(
  '/fees/apply-penalties',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await applyLatePenalties(institutionId);
    return res.json(await getTransportFeeManagement(institutionId));
  }),
);

transportRouter.post(
  '/fees/seed-demo',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await seedTransportFeeManagement(institutionId);
    return res.json(data);
  }),
);

// ─── Fleet Maintenance & Service ────────────────────────────────────────

transportRouter.get(
  '/fleet-maintenance',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await getTransportFleetMaintenance(institutionId);
    return res.json(data);
  }),
);

transportRouter.post(
  '/fleet-maintenance/work-orders',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await createWorkOrder(institutionId, req.body);
    return res.json(await getTransportFleetMaintenance(institutionId));
  }),
);

transportRouter.post(
  '/fleet-maintenance/work-orders/:id/status',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await updateWorkOrderStatus(institutionId, req.params.id, String(req.body.status ?? 'COMPLETED'));
    return res.json(await getTransportFleetMaintenance(institutionId));
  }),
);

transportRouter.post(
  '/fleet-maintenance/fuel',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await recordFuelEntry(institutionId, req.body);
    return res.json(await getTransportFleetMaintenance(institutionId));
  }),
);

transportRouter.post(
  '/fleet-maintenance/inspections',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await recordInspection(institutionId, req.body);
    return res.json(await getTransportFleetMaintenance(institutionId));
  }),
);

transportRouter.post(
  '/fleet-maintenance/breakdowns',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await registerBreakdown(institutionId, req.body);
    return res.json(await getTransportFleetMaintenance(institutionId));
  }),
);

transportRouter.post(
  '/fleet-maintenance/seed-demo',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await seedTransportFleetMaintenance(institutionId);
    return res.json(data);
  }),
);

// ─── Fuel Management ────────────────────────────────────────────────────

transportRouter.get(
  '/fuel-management',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await getTransportFuelManagement(institutionId);
    return res.json(data);
  }),
);

transportRouter.post(
  '/fuel-management/stations',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await createFuelStation(institutionId, req.body);
    return res.json(await getTransportFuelManagement(institutionId));
  }),
);

transportRouter.post(
  '/fuel-management/cards',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await assignFuelCard(institutionId, req.body);
    return res.json(await getTransportFuelManagement(institutionId));
  }),
);

transportRouter.post(
  '/fuel-management/requests',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await createFuelRequest(institutionId, req.body);
    return res.json(await getTransportFuelManagement(institutionId));
  }),
);

transportRouter.post(
  '/fuel-management/requests/:id/approve',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await approveFuelRequest(institutionId, req.params.id, req.body.approved !== false, String(req.body.reason ?? ''));
    return res.json(await getTransportFuelManagement(institutionId));
  }),
);

transportRouter.post(
  '/fuel-management/fills',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await recordFuelFill(institutionId, req.body);
    return res.json(await getTransportFuelManagement(institutionId));
  }),
);

transportRouter.post(
  '/fuel-management/mileage',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await recordMileageLog(institutionId, req.body);
    return res.json(await getTransportFuelManagement(institutionId));
  }),
);

transportRouter.post(
  '/fuel-management/anomalies/:id/resolve',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await resolveFuelAnomaly(institutionId, req.params.id);
    return res.json(await getTransportFuelManagement(institutionId));
  }),
);

transportRouter.post(
  '/fuel-management/device-sync',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await syncDeviceReading(institutionId, req.body);
    return res.json(await getTransportFuelManagement(institutionId));
  }),
);

transportRouter.post(
  '/fuel-management/seed-demo',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await seedTransportFuelManagement(institutionId);
    return res.json(data);
  }),
);

// ─── Safety & Alerts ────────────────────────────────────────────────────

transportRouter.get(
  '/safety-alerts',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await getTransportSafetyAlerts(institutionId);
    return res.json(data);
  }),
);

transportRouter.post(
  '/safety-alerts/gps-trigger',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await triggerGpsAccidentAlert(institutionId, req.body);
    return res.json(await getTransportSafetyAlerts(institutionId));
  }),
);

transportRouter.post(
  '/safety-alerts/mobile-report',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await submitMobileSafetyReport(institutionId, req.body);
    return res.json(await getTransportSafetyAlerts(institutionId));
  }),
);

transportRouter.post(
  '/safety-alerts/sos',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await triggerSosAlert(institutionId, req.body);
    return res.json(await getTransportSafetyAlerts(institutionId));
  }),
);

transportRouter.post(
  '/safety-alerts/:id/acknowledge',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await acknowledgeSafetyAlert(institutionId, req.params.id, String(req.body.acknowledgedBy ?? 'Transport Manager'));
    return res.json(await getTransportSafetyAlerts(institutionId));
  }),
);

transportRouter.post(
  '/safety-alerts/:id/escalate',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await escalateSafetyAlert(institutionId, req.params.id);
    return res.json(await getTransportSafetyAlerts(institutionId));
  }),
);

transportRouter.post(
  '/safety-alerts/:id/resolve',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await resolveSafetyAlert(institutionId, req.params.id);
    return res.json(await getTransportSafetyAlerts(institutionId));
  }),
);

transportRouter.post(
  '/safety-alerts/reports/:id/review',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await reviewSafetyReport(institutionId, req.params.id, String(req.body.status ?? 'VERIFIED'));
    return res.json(await getTransportSafetyAlerts(institutionId));
  }),
);

transportRouter.post(
  '/safety-alerts/seed-demo',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await seedTransportSafetyAlerts(institutionId);
    return res.json(data);
  }),
);

// ─── Reports & Analytics ────────────────────────────────────────────────

transportRouter.get(
  '/reports-analytics',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = String(req.query.academicYear ?? '2025-26');
    const data = await getTransportReportsAnalytics(institutionId, academicYear);
    return res.json(data);
  }),
);

transportRouter.post(
  '/reports-analytics/schedules',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = String(req.body.academicYear ?? '2025-26');
    await scheduleTransportReport(institutionId, req.body);
    return res.json(await getTransportReportsAnalytics(institutionId, academicYear));
  }),
);

transportRouter.post(
  '/reports-analytics/seed-demo',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = String(req.body.academicYear ?? '2025-26');
    const data = await seedTransportReportsAnalytics(institutionId, academicYear);
    return res.json(data);
  }),
);
