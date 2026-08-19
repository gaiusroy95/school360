import { Router } from 'express';
import { z } from 'zod';
import { FeeMasterStatus, PayrollEmploymentType } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { getDefaultInstitutionId } from '../lib/institution.js';
import { getHrDashboard } from '../lib/hrDashboard.js';
import {
  createEmployeeDirectoryEntry,
  bulkUpsertEmployeeDirectory,
  getEmployeeDirectoryDetail,
  listEmployeeDirectory,
  seedEmployeeDirectoryDemo,
  updateEmployeeDirectoryProfile,
} from '../lib/employeeDirectory.js';
import {
  createHrDepartment,
  deleteHrDepartment,
  getHrDepartment,
  listDepartmentEmployeeOptions,
  listHrDepartments,
  seedHrDepartmentsDemo,
  syncAllEmployeesToDepartments,
  updateHrDepartment,
} from '../lib/hrDepartments.js';
import {
  assignEmployeesToDepartment,
  unassignEmployeesFromDepartment,
} from '../lib/employeeDepartmentSync.js';
import {
  createHrDesignation,
  deleteHrDesignation,
  bulkUpsertHrDesignations,
  getDesignationsDashboard,
  listHrDesignationsExport,
  REFERENCE_DESIGNATIONS,
  seedHrDesignationsDemo,
  updateHrDesignation,
} from '../lib/hrDesignations.js';
import {
  advanceHrAttendancePeriodWorkflow,
  advanceHrCorrectionWorkflow,
  approveHrDailyAttendance,
  calculateHrPayrollAttendance,
  createHrAttendanceCorrection,
  getHrAttendanceDashboard,
  getHrAttendanceMeta,
  getHrAttendancePeriodLock,
  getHrBiometricDevicesSummary,
  getHrDailyAttendance,
  getHrEmployeeAttendanceCard,
  getHrMonthlyRegister,
  listHrAttendanceCorrections,
  saveHrDailyAttendance,
  seedHrAttendanceLeaveDemo,
  submitHrDailyAttendance,
  updateHrAttendanceSettings,
} from '../lib/hrAttendanceLeave.js';
import {
  createHrLeaveApplication,
  getHrLeaveBalances,
  getHrLeaveDashboard,
  getHrLeavePolicy,
  getHrLeaveSettings,
  LEAVE_TYPE_DEFS,
  listHrLeavePolicies,
  seedHrLeaveManagementDemo,
  syncAttendanceLeaveToApplications,
  updateHrLeaveApplicationStatus,
  updateHrLeaveSettings,
} from '../lib/hrLeaveManagement.js';
import {
  approveHrPayRun,
  generateHrPayRun,
  getHrPayrollDashboard,
  getHrPayrollEmployeeMaster,
  seedHrPayrollManagementDemo,
} from '../lib/hrPayrollManagement.js';
import {
  assignLeavePolicy,
  getAttendancePolicyDashboard,
  removeLeavePolicyAssignment,
  seedAttendancePolicyDemo,
  updateAttendancePolicy,
} from '../lib/hrAttendancePolicy.js';
import {
  advanceOvertimeWorkflow,
  advanceShiftChangeRequest,
  assignDuty,
  assignEmployeeShift,
  updateEmployeeShiftAssignment,
  assignSubstitute,
  createHrShift,
  createOvertimeRecord,
  createShiftChangeRequest,
  getShiftManagementDashboard,
  mapDepartmentShift,
  seedShiftManagementDemo,
  updateHrShift,
  updateInstitutionWorkingHours,
  updateShiftModuleSettings,
} from '../lib/hrShiftManagement.js';
import {
  advanceAppraisalWorkflow,
  computeAnnualReviews,
  createPerformanceAppraisal,
  createPerformanceKpi,
  generateAppraisalsFromEmployees,
  getPerformanceAppraisalDashboard,
  publishAppraisalsToMobile,
  seedPerformanceAppraisalDemo,
  syncKpisFromDepartmentsDesignations,
  syncPayGradesFromDesignations,
  syncTeachingKpisFromContinuousEvaluation,
  updatePayGrade,
  updatePerformanceAppraisal,
  updatePerformanceKpi,
  updatePerformanceSettings,
} from '../lib/hrPerformanceAppraisal.js';
import {
  acceptOffer,
  advanceApplicationPipeline,
  advanceOfferWorkflow,
  advanceRequisitionWorkflow,
  approveReferenceHire,
  assignInterview,
  bulkUploadCandidates,
  completeOnboardingAndCreateEmployee,
  completeProbationWithFeedback,
  confirmProbation,
  createApplication,
  createCandidate,
  createInterviewFeedback,
  createJobPosting,
  createJobRequisition,
  createManpowerPlan,
  createOffer,
  createReferenceCheck,
  extendProbation,
  generateSelectionLetterEmail,
  getRecruitmentDashboard,
  passInterviewAndCreateOffer,
  publishJobPosting,
  reviewCandidateApplication,
  seedRecruitmentDemo,
  selectCandidateForInterview,
  sendOfferEmail,
  submitReferenceFeedback,
  updateCandidate,
  updateInterviewFeedback,
  updateProbationPeriod,
  updateRecruitmentOffer,
  updateRecruitmentSettings,
} from '../lib/hrRecruitment.js';
import {
  approveAnnualPlan,
  completeAssessment,
  confirmNominationWorkflow,
  createAnnualPlan,
  createTrainingAssignment,
  createTrainingBatch,
  createTrainingBudget,
  createTrainingCategory,
  createTrainingCompetency,
  createTrainingCourse,
  createTrainingExternal,
  createTrainingIdp,
  createTrainingNeed,
  createTrainingTrainer,
  createTrainingVenue,
  getTrainingDashboard,
  gradeTrainingAssignment,
  issueTrainingCertificate,
  markTrainingAttendance,
  nominateEmployee,
  seedTrainingDemo,
  submitTrainingFeedback,
  updateTrainingBudget,
  updateTrainingCourse,
  updateTrainingIdp,
  updateTrainingNeed,
  updateTrainingSettings,
} from '../lib/hrTrainingDevelopment.js';
import {
  activatePreOnboardingPortal,
  activateSystemAccess,
  acknowledgeEmploymentLetter,
  addChecklistItem,
  advanceOnboardingWorkflow,
  completeChecklistItem,
  confirmProbation as confirmEdomsProbation,
  createAsset,
  createEdomsDocument,
  createEmploymentHistoryRecord,
  createEmployeeFromOnboarding,
  createOnboardingCase,
  createQualification,
  createSystemAccess,
  generateEmploymentLetters,
  getEdomsDashboard,
  renewDocumentExpiry,
  seedEdomsDemo,
  sendExpiryAlert,
  submitDocument,
  updateAssetStatus,
  updateEdomsSettings,
  updateInduction,
  updateOnboardingCase,
  updateProbation,
  updateVerification,
  verifyDocument,
  verifyQualification,
} from '../lib/hrEdoms.js';
import {
  addHandoverTask,
  addKnowledgeTransfer,
  advanceExitWorkflow,
  approveClearance,
  approveFnf,
  closeRetention,
  completeHandover,
  completeKnowledgeTransfer,
  createResignationCase,
  extendNoticePeriod,
  generateExitDocuments,
  getExitDashboard,
  initiateRetention,
  markFnfPaid,
  processApproval,
  recalculateFnf,
  recoverAsset,
  rejectClearance,
  seedExitDemo,
  sendExitDocument,
  submitResignation,
  updateAlumniRecord,
  updateAssetRecovery,
  updateExitInterview,
  updateExitSettings,
  updateHandover,
  updateLeaveSettlement,
  updateResignationCase,
} from '../lib/hrExitManagement.js';
import {
  generateHrReport,
  getHrReportsMeta,
} from '../lib/hrReports.js';
import {
  assignHrSalaryStructure,
  cloneHrSalaryStructureTemplate,
  createHrSalaryStructureTemplate,
  getHrSalaryStructureTemplate,
  listHrSalaryStructureAssignments,
  listHrSalaryStructureTemplates,
  listSalaryStructureEmployeeOptions,
  previewHrSalaryStructure,
  seedHrSalaryStructureDemo,
  updateHrSalaryStructureTemplate,
} from '../lib/hrSalaryStructure.js';
import {
  createHrSalaryComponent,
  createHrSalaryComponentGroup,
  createHrSalaryComponentMapping,
  deleteHrSalaryComponent,
  deleteHrSalaryComponentGroup,
  deleteHrSalaryComponentMapping,
  getAllowancesDeductionsDashboard,
  getHrSalaryComponent,
  previewComponentFormula,
  seedHrAllowancesDeductionsDemo,
  updateHrSalaryComponent,
  updateHrSalaryComponentGroup,
} from '../lib/hrAllowancesDeductions.js';
import { getInstitutionFilterMeta } from '../lib/students.js';

export const hrRouter = Router();
hrRouter.use(requireAuth);

const employmentTypeSchema = z.nativeEnum(PayrollEmploymentType);
const statusSchema = z.nativeEnum(FeeMasterStatus);

hrRouter.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const filters = await getInstitutionFilterMeta(institutionId);
    const academicYear =
      typeof req.query.academicYear === 'string' ? req.query.academicYear : filters.defaultAcademicYear;
    const data = await getHrDashboard(institutionId, { academicYear });
    return res.json(data);
  }),
);

hrRouter.get(
  '/employees',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    const status =
      typeof req.query.status === 'string' ? (req.query.status as FeeMasterStatus) : undefined;
    const department = typeof req.query.department === 'string' ? req.query.department : undefined;
    const classGroup = typeof req.query.classGroup === 'string' ? req.query.classGroup : undefined;
    const seed = false;
    let records = await listEmployeeDirectory(institutionId, { q, status, department, classGroup });
    if (records.length === 0 && seed) {
      await seedEmployeeDirectoryDemo(institutionId);
      records = await listEmployeeDirectory(institutionId, { q, status });
    }
    return res.json({ records });
  }),
);

hrRouter.post(
  '/employees/seed-demo',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const record = await seedEmployeeDirectoryDemo(institutionId);
    return res.json({ record, message: 'Demo employee profile created' });
  }),
);

const bulkEmployeeSchema = z.object({
  rows: z.array(z.object({
    employeeCode: z.string().optional(),
    fullName: z.string().min(1),
    employmentType: z.string().optional(),
    department: z.string().optional(),
    designation: z.string().optional(),
    classGroup: z.string().optional(),
    mobile: z.string().optional(),
    email: z.string().optional(),
    joinDate: z.string().optional(),
    gender: z.string().optional(),
    dateOfBirth: z.string().optional(),
    reportingTo: z.string().optional(),
    workLocation: z.string().optional(),
    subject: z.string().optional(),
    bankAccount: z.string().optional(),
    bankIfsc: z.string().optional(),
    panNumber: z.string().optional(),
    uanNumber: z.string().optional(),
    pfNumber: z.string().optional(),
    esicNumber: z.string().optional(),
    bankName: z.string().optional(),
    paymentMode: z.string().optional(),
    basicSalary: z.number().optional(),
    hra: z.number().optional(),
    da: z.number().optional(),
    specialAllowance: z.number().optional(),
    conveyanceAllowance: z.number().optional(),
    otherAllowances: z.number().optional(),
    epfEmployee: z.number().optional(),
    professionalTax: z.number().optional(),
    otherDeductions: z.number().optional(),
    structureCode: z.string().optional(),
    effectiveFrom: z.string().optional(),
  })).min(1).max(2000),
});

hrRouter.post(
  '/employees/bulk',
  asyncHandler(async (req, res) => {
    const parsed = bulkEmployeeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'rows array with employee data is required' });
    const institutionId = await getDefaultInstitutionId();
    return res.json(await bulkUpsertEmployeeDirectory(institutionId, parsed.data.rows));
  }),
);

hrRouter.get(
  '/employees/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      const record = await getEmployeeDirectoryDetail(institutionId, req.params.id);
      return res.json({ record });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Employee not found';
      return res.status(404).json({ error: message });
    }
  }),
);

const createEmployeeSchema = z.object({
  fullName: z.string().min(1),
  employeeCode: z.string().optional(),
  employmentType: employmentTypeSchema.optional(),
  department: z.string().optional(),
  designation: z.string().optional(),
  classGroup: z.string().optional(),
  mobile: z.string().optional(),
  email: z.string().optional(),
  joinDate: z.string().nullable().optional(),
  profile: z.record(z.unknown()).optional(),
});

hrRouter.post(
  '/employees',
  asyncHandler(async (req, res) => {
    const parsed = createEmployeeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    try {
      const record = await createEmployeeDirectoryEntry(institutionId, parsed.data);
      return res.status(201).json({ record });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create employee';
      return res.status(400).json({ error: message });
    }
  }),
);

const updateEmployeeSchema = createEmployeeSchema.partial().extend({
  employeeCode: z.string().optional(),
  status: statusSchema.optional(),
  bankAccount: z.string().optional(),
  bankIfsc: z.string().optional(),
  panNumber: z.string().optional(),
  uanNumber: z.string().optional(),
  pfNumber: z.string().optional(),
  esicNumber: z.string().optional(),
});

hrRouter.patch(
  '/employees/:id',
  asyncHandler(async (req, res) => {
    const parsed = updateEmployeeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    try {
      const record = await updateEmployeeDirectoryProfile(institutionId, req.params.id, parsed.data);
      return res.json({ record });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update employee';
      return res.status(400).json({ error: message });
    }
  }),
);

// ─── Departments ─────────────────────────────────────────────────────────────

hrRouter.get(
  '/departments',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    const includeDeleted = req.query.includeDeleted === '1' || req.query.includeDeleted === 'true';
    const seed = false;
    let records = await listHrDepartments(institutionId, q, { includeDeleted });
    if (records.length === 0 && seed) {
      await seedHrDepartmentsDemo(institutionId);
      records = await listHrDepartments(institutionId, q, { includeDeleted });
    }
    return res.json({ records });
  }),
);

hrRouter.get(
  '/departments/employee-options',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const records = await listDepartmentEmployeeOptions(institutionId);
    return res.json({ records });
  }),
);

hrRouter.get(
  '/departments/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      const record = await getHrDepartment(institutionId, req.params.id);
      return res.json({ record });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Department not found';
      return res.status(404).json({ error: message });
    }
  }),
);

const departmentSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  parentId: z.string().nullable().optional(),
  headEmployeeId: z.string().optional(),
  reportsToEmployeeId: z.string().optional(),
  shortDescription: z.string().optional(),
  detailedDescription: z.string().optional(),
  campus: z.string().optional(),
  status: z.string().optional(),
  budgetAllocation: z.number().optional(),
  costCenter: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  workingDays: z.array(z.string()).optional(),
  logoUrl: z.string().optional(),
  notes: z.string().optional(),
  functions: z.array(z.string()).optional(),
  structureTree: z.array(z.record(z.unknown())).optional(),
  settings: z.record(z.unknown()).optional(),
});

hrRouter.post(
  '/departments',
  asyncHandler(async (req, res) => {
    const parsed = departmentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    try {
      const record = await createHrDepartment(institutionId, parsed.data as Parameters<typeof createHrDepartment>[1]);
      return res.status(201).json({ record });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create department';
      return res.status(400).json({ error: message });
    }
  }),
);

hrRouter.patch(
  '/departments/:id',
  asyncHandler(async (req, res) => {
    const parsed = departmentSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    try {
      const record = await updateHrDepartment(institutionId, req.params.id, parsed.data as Parameters<typeof updateHrDepartment>[2]);
      return res.json({ record });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update department';
      return res.status(400).json({ error: message });
    }
  }),
);

hrRouter.delete(
  '/departments/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      const result = await deleteHrDepartment(institutionId, req.params.id);
      return res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete department';
      return res.status(400).json({ error: message });
    }
  }),
);

hrRouter.post(
  '/departments/:id/assign-employees',
  asyncHandler(async (req, res) => {
    const parsed = z.object({ employeeIds: z.array(z.string().min(1)).min(1).max(500) }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    try {
      const result = await assignEmployeesToDepartment(institutionId, req.params.id, parsed.data.employeeIds);
      const record = await getHrDepartment(institutionId, req.params.id);
      return res.json({ ...result, record });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to assign employees';
      return res.status(400).json({ error: message });
    }
  }),
);

hrRouter.post(
  '/departments/:id/unassign-employees',
  asyncHandler(async (req, res) => {
    const parsed = z.object({ employeeIds: z.array(z.string().min(1)).min(1).max(500) }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    try {
      const result = await unassignEmployeesFromDepartment(institutionId, req.params.id, parsed.data.employeeIds);
      const record = await getHrDepartment(institutionId, req.params.id);
      return res.json({ ...result, record });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to unassign employees';
      return res.status(400).json({ error: message });
    }
  }),
);

hrRouter.post(
  '/departments/sync-employees',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await syncAllEmployeesToDepartments(institutionId);
    const records = await listHrDepartments(institutionId);
    return res.json({ ...result, records });
  }),
);

// ─── Designations ────────────────────────────────────────────────────────────

hrRouter.get(
  '/designations',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const seed = false;
    const page = typeof req.query.page === 'string' ? Number(req.query.page) : undefined;
    const pageSize = typeof req.query.pageSize === 'string' ? Number(req.query.pageSize) : undefined;
    const filters = {
      q: typeof req.query.q === 'string' ? req.query.q : undefined,
      department: typeof req.query.department === 'string' ? req.query.department : undefined,
      designationType: typeof req.query.designationType === 'string' ? req.query.designationType : undefined,
      status: typeof req.query.status === 'string' ? req.query.status : undefined,
      page: Number.isFinite(page) ? page : undefined,
      pageSize: Number.isFinite(pageSize) ? pageSize : undefined,
    };

    let data = await getDesignationsDashboard(institutionId, filters);
    if (data.summary.totalDesignations === 0 && seed) {
      await seedHrDesignationsDemo(institutionId);
      data = await getDesignationsDashboard(institutionId, filters);
    }
    return res.json(data);
  }),
);

hrRouter.get(
  '/designations/reference',
  asyncHandler(async (_req, res) => {
    return res.json({ categories: REFERENCE_DESIGNATIONS });
  }),
);

hrRouter.get(
  '/designations/export',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const records = await listHrDesignationsExport(institutionId, {
      q: typeof req.query.q === 'string' ? req.query.q : undefined,
      department: typeof req.query.department === 'string' ? req.query.department : undefined,
      designationType: typeof req.query.designationType === 'string' ? req.query.designationType : undefined,
      status: typeof req.query.status === 'string' ? req.query.status : undefined,
    });
    return res.json({ records, total: records.length });
  }),
);

const designationSchema = z.object({
  name: z.string().min(1),
  department: z.string().min(1),
  designationType: z.string().optional(),
  totalPositions: z.number().int().min(0).optional(),
  filledPositions: z.number().int().min(0).optional(),
  status: z.string().optional(),
});

hrRouter.post(
  '/designations',
  asyncHandler(async (req, res) => {
    const parsed = designationSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    try {
      const record = await createHrDesignation(institutionId, parsed.data);
      return res.status(201).json({ record });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create designation';
      return res.status(400).json({ error: message });
    }
  }),
);

const bulkDesignationSchema = z.object({
  rows: z.array(z.object({
    name: z.string().min(1),
    department: z.string().optional(),
    departmentCode: z.string().optional(),
    designationType: z.string().optional(),
    totalPositions: z.coerce.number().optional(),
    filledPositions: z.coerce.number().optional(),
    status: z.string().optional(),
  })).min(1).max(2000),
});

hrRouter.post(
  '/designations/bulk',
  asyncHandler(async (req, res) => {
    const parsed = bulkDesignationSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'rows array with designation data is required' });
    const institutionId = await getDefaultInstitutionId();
    return res.json(await bulkUpsertHrDesignations(institutionId, parsed.data.rows));
  }),
);

hrRouter.patch(
  '/designations/:id',
  asyncHandler(async (req, res) => {
    const parsed = designationSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    try {
      const record = await updateHrDesignation(institutionId, req.params.id, parsed.data);
      return res.json({ record });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update designation';
      return res.status(400).json({ error: message });
    }
  }),
);

hrRouter.delete(
  '/designations/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      await deleteHrDesignation(institutionId, req.params.id);
      return res.json({ ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete designation';
      return res.status(400).json({ error: message });
    }
  }),
);

// ─── Attendance & Leave ──────────────────────────────────────────────────────

hrRouter.get(
  '/attendance/meta',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const seed = false;
    if (seed) await seedHrAttendanceLeaveDemo(institutionId);
    const meta = await getHrAttendanceMeta(institutionId);
    return res.json(meta);
  }),
);

hrRouter.get(
  '/attendance/dashboard',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const date = typeof req.query.date === 'string' ? req.query.date : undefined;
    const seed = false;
    if (seed) await seedHrAttendanceLeaveDemo(institutionId);
    const data = await getHrAttendanceDashboard(institutionId, date);
    return res.json(data);
  }),
);

hrRouter.get(
  '/attendance/daily',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await getHrDailyAttendance(institutionId, {
      date: typeof req.query.date === 'string' ? req.query.date : undefined,
      department: typeof req.query.department === 'string' ? req.query.department : undefined,
      designation: typeof req.query.designation === 'string' ? req.query.designation : undefined,
      shift: typeof req.query.shift === 'string' ? req.query.shift : undefined,
      employmentType: typeof req.query.employmentType === 'string' ? req.query.employmentType : undefined,
      employeeId: typeof req.query.employeeId === 'string' ? req.query.employeeId : undefined,
      q: typeof req.query.q === 'string' ? req.query.q : undefined,
    });
    return res.json(data);
  }),
);

const dailyRowSchema = z.object({
  employeeId: z.string(),
  shiftCode: z.string().optional(),
  inTime: z.string().optional(),
  outTime: z.string().optional(),
  workingHours: z.number().optional(),
  status: z.string().optional(),
  overtimeHours: z.number().optional(),
  lateMinutes: z.number().optional(),
  earlyExitMinutes: z.number().optional(),
  isMissingPunch: z.boolean().optional(),
  remarks: z.string().optional(),
});

hrRouter.post(
  '/attendance/daily/save',
  asyncHandler(async (req, res) => {
    const parsed = z.object({ date: z.string(), rows: z.array(dailyRowSchema) }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    try {
      const data = await saveHrDailyAttendance(institutionId, parsed.data.date, parsed.data.rows);
      return res.json(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save attendance';
      return res.status(400).json({ error: message });
    }
  }),
);

hrRouter.post(
  '/attendance/daily/submit',
  asyncHandler(async (req, res) => {
    const date = typeof req.body.date === 'string' ? req.body.date : '';
    if (!date) return res.status(400).json({ error: 'date is required' });
    const institutionId = await getDefaultInstitutionId();
    const data = await submitHrDailyAttendance(institutionId, date);
    return res.json(data);
  }),
);

hrRouter.post(
  '/attendance/daily/approve',
  asyncHandler(async (req, res) => {
    const date = typeof req.body.date === 'string' ? req.body.date : '';
    if (!date) return res.status(400).json({ error: 'date is required' });
    const institutionId = await getDefaultInstitutionId();
    const data = await approveHrDailyAttendance(institutionId, date);
    return res.json(data);
  }),
);

hrRouter.get(
  '/attendance/monthly-register',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const year = Number(req.query.year) || new Date().getFullYear();
    const month = Number(req.query.month) || new Date().getMonth() + 1;
    const data = await getHrMonthlyRegister(institutionId, year, month);
    return res.json(data);
  }),
);

hrRouter.get(
  '/attendance/employee-card/:employeeId',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const year = Number(req.query.year) || new Date().getFullYear();
    const month = Number(req.query.month) || new Date().getMonth() + 1;
    try {
      const data = await getHrEmployeeAttendanceCard(institutionId, req.params.employeeId, year, month);
      return res.json(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Employee not found';
      return res.status(404).json({ error: message });
    }
  }),
);

hrRouter.get(
  '/attendance/payroll-preview/:employeeId',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const year = Number(req.query.year) || new Date().getFullYear();
    const month = Number(req.query.month) || new Date().getMonth() + 1;
    try {
      const data = await calculateHrPayrollAttendance(institutionId, req.params.employeeId, year, month);
      return res.json(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Calculation failed';
      return res.status(400).json({ error: message });
    }
  }),
);

hrRouter.get(
  '/attendance/corrections',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const records = await listHrAttendanceCorrections(institutionId);
    return res.json({ records });
  }),
);

hrRouter.post(
  '/attendance/corrections',
  asyncHandler(async (req, res) => {
    const parsed = z.object({
      employeeId: z.string(),
      attendanceDate: z.string(),
      originalInTime: z.string().optional(),
      originalOutTime: z.string().optional(),
      correctedInTime: z.string().optional(),
      correctedOutTime: z.string().optional(),
      reason: z.string().min(1),
      attachmentUrl: z.string().optional(),
    }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    const result = await createHrAttendanceCorrection(institutionId, parsed.data);
    return res.status(201).json(result);
  }),
);

hrRouter.post(
  '/attendance/corrections/:id/workflow',
  asyncHandler(async (req, res) => {
    const action = req.body.action === 'reject' ? 'reject' : 'approve';
    const remarks = typeof req.body.remarks === 'string' ? req.body.remarks : undefined;
    const institutionId = await getDefaultInstitutionId();
    const result = await advanceHrCorrectionWorkflow(institutionId, req.params.id, action, remarks);
    return res.json(result);
  }),
);

hrRouter.get(
  '/attendance/period-lock',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const year = Number(req.query.year) || new Date().getFullYear();
    const month = Number(req.query.month) || new Date().getMonth() + 1;
    const data = await getHrAttendancePeriodLock(institutionId, year, month);
    return res.json(data);
  }),
);

hrRouter.post(
  '/attendance/period-lock/advance',
  asyncHandler(async (req, res) => {
    const year = Number(req.body.year) || new Date().getFullYear();
    const month = Number(req.body.month) || new Date().getMonth() + 1;
    const institutionId = await getDefaultInstitutionId();
    const data = await advanceHrAttendancePeriodWorkflow(institutionId, year, month);
    return res.json(data);
  }),
);

hrRouter.get(
  '/attendance/biometric',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await getHrBiometricDevicesSummary(institutionId);
    return res.json(data);
  }),
);

hrRouter.patch(
  '/attendance/settings',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const settings = await updateHrAttendanceSettings(institutionId, req.body);
    return res.json({ settings });
  }),
);

hrRouter.post(
  '/attendance/seed-demo',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await seedHrAttendanceLeaveDemo(institutionId);
    return res.json(result);
  }),
);

// ─── Leave Management ────────────────────────────────────────────────────────

hrRouter.get(
  '/leave/dashboard',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const seed = false;
    if (seed) await seedHrLeaveManagementDemo(institutionId);
    const filters = await getInstitutionFilterMeta(institutionId);
    const data = await getHrLeaveDashboard(institutionId, {
      academicYear: typeof req.query.academicYear === 'string' ? req.query.academicYear : filters.defaultAcademicYear,
      campus: typeof req.query.campus === 'string' ? req.query.campus : undefined,
      year: typeof req.query.year === 'string' ? Number(req.query.year) : undefined,
      month: typeof req.query.month === 'string' ? Number(req.query.month) : undefined,
    });
    return res.json(data);
  }),
);

hrRouter.post(
  '/leave/sync-attendance',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const filters = await getInstitutionFilterMeta(institutionId);
    const academicYear =
      typeof req.body?.academicYear === 'string' ? req.body.academicYear : filters.defaultAcademicYear;
    const result = await syncAttendanceLeaveToApplications(institutionId, academicYear);
    const data = await getHrLeaveDashboard(institutionId, { academicYear });
    return res.json({
      ...data,
      message: `Synced ${result.created} leave record(s) from Attendance & Leave`,
    });
  }),
);

hrRouter.get(
  '/leave/policies',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const records = await listHrLeavePolicies(institutionId);
    return res.json({ records, leaveTypeDefs: LEAVE_TYPE_DEFS });
  }),
);

hrRouter.get(
  '/leave/policies/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      const record = await getHrLeavePolicy(institutionId, req.params.id);
      return res.json({ record });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Policy not found';
      return res.status(404).json({ error: message });
    }
  }),
);

hrRouter.get(
  '/leave/balances',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const filters = await getInstitutionFilterMeta(institutionId);
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : filters.defaultAcademicYear;
    const employeeId = typeof req.query.employeeId === 'string' ? req.query.employeeId : undefined;
    const records = await getHrLeaveBalances(institutionId, academicYear, employeeId);
    return res.json({ records });
  }),
);

hrRouter.get(
  '/leave/settings',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const settings = await getHrLeaveSettings(institutionId);
    return res.json({ settings });
  }),
);

hrRouter.patch(
  '/leave/settings',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const settings = await updateHrLeaveSettings(institutionId, req.body);
    return res.json({ settings });
  }),
);

const leaveApplicationSchema = z.object({
  employeeId: z.string(),
  leaveType: z.string(),
  fromDate: z.string(),
  toDate: z.string(),
  session: z.string().optional(),
  reason: z.string().optional(),
  addressDuringLeave: z.string().optional(),
  emergencyContact: z.string().optional(),
  attachmentUrl: z.string().optional(),
  remarks: z.string().optional(),
  status: z.string().optional(),
  academicYear: z.string().optional(),
});

hrRouter.post(
  '/leave/applications',
  asyncHandler(async (req, res) => {
    const parsed = leaveApplicationSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    const record = await createHrLeaveApplication(institutionId, parsed.data);
    return res.status(201).json({ record });
  }),
);

hrRouter.post(
  '/leave/applications/:id/workflow',
  asyncHandler(async (req, res) => {
    const action = req.body.action === 'reject' ? 'reject' : req.body.action === 'return' ? 'return' : 'approve';
    const remarks = typeof req.body.remarks === 'string' ? req.body.remarks : undefined;
    const approvedBy = typeof req.body.approvedBy === 'string' ? req.body.approvedBy : undefined;
    const institutionId = await getDefaultInstitutionId();
    try {
      const record = await updateHrLeaveApplicationStatus(institutionId, req.params.id, action, remarks, approvedBy);
      return res.json({ record });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Workflow action failed';
      return res.status(400).json({ error: message });
    }
  }),
);

hrRouter.post(
  '/leave/seed-demo',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await seedHrLeaveManagementDemo(institutionId);
    return res.json(data);
  }),
);

// ─── Payroll Management ──────────────────────────────────────────────────────

hrRouter.get(
  '/payroll/dashboard',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const seed = false;
    if (seed) await seedHrPayrollManagementDemo(institutionId);
    const filters = await getInstitutionFilterMeta(institutionId);
    const data = await getHrPayrollDashboard(institutionId, {
      employeeId: typeof req.query.employeeId === 'string' ? req.query.employeeId : undefined,
      payPeriod: typeof req.query.payPeriod === 'string' ? req.query.payPeriod : undefined,
      academicYear: typeof req.query.academicYear === 'string' ? req.query.academicYear : filters.defaultAcademicYear,
      branch: typeof req.query.branch === 'string' ? req.query.branch : undefined,
      q: typeof req.query.q === 'string' ? req.query.q : undefined,
      page: typeof req.query.page === 'string' ? Number(req.query.page) : undefined,
      pageSize: typeof req.query.pageSize === 'string' ? Number(req.query.pageSize) : undefined,
    });
    return res.json(data);
  }),
);

hrRouter.get(
  '/payroll/employees/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const payPeriod = typeof req.query.payPeriod === 'string' ? req.query.payPeriod : undefined;
    try {
      const record = await getHrPayrollEmployeeMaster(institutionId, req.params.id, payPeriod);
      return res.json({ record });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Employee not found';
      return res.status(404).json({ error: message });
    }
  }),
);

hrRouter.post(
  '/payroll/pay-run/generate',
  asyncHandler(async (req, res) => {
    const payPeriod = typeof req.body.payPeriod === 'string' ? req.body.payPeriod : '';
    if (!payPeriod) return res.status(400).json({ error: 'payPeriod is required' });
    const institutionId = await getDefaultInstitutionId();
    const result = await generateHrPayRun(
      institutionId,
      payPeriod,
      Number(req.body.workingDays) || 30,
      Number(req.body.presentDays) || 28,
    );
    return res.json(result);
  }),
);

hrRouter.post(
  '/payroll/pay-run/approve',
  asyncHandler(async (req, res) => {
    const payPeriod = typeof req.body.payPeriod === 'string' ? req.body.payPeriod : '';
    if (!payPeriod) return res.status(400).json({ error: 'payPeriod is required' });
    const institutionId = await getDefaultInstitutionId();
    const data = await approveHrPayRun(institutionId, payPeriod);
    return res.json(data);
  }),
);

hrRouter.post(
  '/payroll/seed-demo',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await seedHrPayrollManagementDemo(institutionId);
    return res.json(data);
  }),
);

// ─── Salary Structure Templates ──────────────────────────────────────────────

hrRouter.get(
  '/salary-structures',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const seed = false;
    if (seed) await seedHrSalaryStructureDemo(institutionId);
    const templates = await listHrSalaryStructureTemplates(institutionId, {
      q: typeof req.query.q === 'string' ? req.query.q : undefined,
      status: typeof req.query.status === 'string' ? req.query.status : undefined,
    });
    const assignments = await listHrSalaryStructureAssignments(institutionId, {
      templateId: typeof req.query.templateId === 'string' ? req.query.templateId : undefined,
    });
    const employees = await listSalaryStructureEmployeeOptions(institutionId);
    return res.json({ templates, assignments, employees });
  }),
);

hrRouter.get(
  '/salary-structures/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      const template = await getHrSalaryStructureTemplate(institutionId, req.params.id);
      const assignments = await listHrSalaryStructureAssignments(institutionId, { templateId: req.params.id });
      return res.json({ template, assignments });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Template not found';
      return res.status(404).json({ error: message });
    }
  }),
);

const salaryStructureTemplateSchema = z.object({
  structureCode: z.string().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  payGrade: z.string().optional(),
  payFrequency: z.string().optional(),
  effectiveFrom: z.string(),
  effectiveTo: z.string().nullable().optional(),
  currency: z.string().optional(),
  status: z.string().optional(),
  earnings: z.array(z.record(z.unknown())).optional(),
  deductions: z.array(z.record(z.unknown())).optional(),
  employerContributions: z.array(z.record(z.unknown())).optional(),
});

hrRouter.post(
  '/salary-structures',
  asyncHandler(async (req, res) => {
    const parsed = salaryStructureTemplateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    try {
      const template = await createHrSalaryStructureTemplate(institutionId, parsed.data);
      return res.status(201).json({ template });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Create failed';
      return res.status(400).json({ error: message });
    }
  }),
);

hrRouter.patch(
  '/salary-structures/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      const template = await updateHrSalaryStructureTemplate(institutionId, req.params.id, req.body);
      return res.json({ template });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Update failed';
      return res.status(400).json({ error: message });
    }
  }),
);

hrRouter.post(
  '/salary-structures/:id/clone',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const name = typeof req.body.name === 'string' ? req.body.name : undefined;
    try {
      const template = await cloneHrSalaryStructureTemplate(institutionId, req.params.id, name);
      return res.status(201).json({ template });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Clone failed';
      return res.status(400).json({ error: message });
    }
  }),
);

hrRouter.post(
  '/salary-structures/preview',
  asyncHandler(async (req, res) => {
    const preview = await previewHrSalaryStructure(req.body);
    return res.json({ preview });
  }),
);

const salaryStructureAssignmentSchema = z.object({
  templateId: z.string(),
  employeeId: z.string(),
  effectiveDate: z.string(),
  annualCtc: z.number().optional(),
  monthlySalary: z.number().optional(),
  payFrequency: z.string().optional(),
  syncPayrollStructure: z.boolean().optional(),
});

hrRouter.post(
  '/salary-structures/assign',
  asyncHandler(async (req, res) => {
    const parsed = salaryStructureAssignmentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    const createdBy = typeof req.body.createdBy === 'string' ? req.body.createdBy : 'hr-admin';
    try {
      const assignment = await assignHrSalaryStructure(institutionId, parsed.data, createdBy);
      return res.status(201).json({ assignment });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Assignment failed';
      return res.status(400).json({ error: message });
    }
  }),
);

hrRouter.post(
  '/salary-structures/seed-demo',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await seedHrSalaryStructureDemo(institutionId);
    return res.json(data);
  }),
);

// ─── Allowances & Deductions ─────────────────────────────────────────────────

hrRouter.get(
  '/allowances-deductions',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const seed = false;
    if (seed) await seedHrAllowancesDeductionsDemo(institutionId);
    const data = await getAllowancesDeductionsDashboard(institutionId, {
      componentType: typeof req.query.componentType === 'string' ? req.query.componentType : undefined,
      groupId: typeof req.query.groupId === 'string' ? req.query.groupId : undefined,
      calculationType: typeof req.query.calculationType === 'string' ? req.query.calculationType : undefined,
      taxability: typeof req.query.taxability === 'string' ? req.query.taxability : undefined,
      status: typeof req.query.status === 'string' ? req.query.status : undefined,
      q: typeof req.query.q === 'string' ? req.query.q : undefined,
    });
    return res.json(data);
  }),
);

hrRouter.get(
  '/allowances-deductions/components/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      const data = await getHrSalaryComponent(institutionId, req.params.id);
      return res.json(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Component not found';
      return res.status(404).json({ error: message });
    }
  }),
);

const componentSchema = z.object({
  code: z.string().optional(),
  name: z.string().min(1),
  componentType: z.string(),
  groupId: z.string().nullable().optional(),
  calculationType: z.string().optional(),
  formula: z.string().optional(),
  percentage: z.number().optional(),
  fixedAmount: z.number().optional(),
  taxable: z.boolean().optional(),
  taxability: z.string().optional(),
  pfApplicable: z.boolean().optional(),
  esiApplicable: z.boolean().optional(),
  gratuity: z.boolean().optional(),
  displayOrder: z.number().optional(),
  status: z.string().optional(),
  description: z.string().optional(),
  advancedSettings: z.record(z.unknown()).optional(),
});

hrRouter.post(
  '/allowances-deductions/components',
  asyncHandler(async (req, res) => {
    const parsed = componentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    const createdBy = typeof req.body.createdBy === 'string' ? req.body.createdBy : 'hr-admin';
    try {
      const component = await createHrSalaryComponent(institutionId, parsed.data, createdBy);
      return res.status(201).json({ component });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Create failed';
      return res.status(400).json({ error: message });
    }
  }),
);

hrRouter.patch(
  '/allowances-deductions/components/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const updatedBy = typeof req.body.updatedBy === 'string' ? req.body.updatedBy : 'hr-admin';
    try {
      const component = await updateHrSalaryComponent(institutionId, req.params.id, req.body, updatedBy);
      return res.json({ component });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Update failed';
      return res.status(400).json({ error: message });
    }
  }),
);

hrRouter.delete(
  '/allowances-deductions/components/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      await deleteHrSalaryComponent(institutionId, req.params.id);
      return res.json({ ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Delete failed';
      return res.status(400).json({ error: message });
    }
  }),
);

const groupSchema = z.object({
  code: z.string().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  status: z.string().optional(),
  displayOrder: z.number().optional(),
});

hrRouter.post(
  '/allowances-deductions/groups',
  asyncHandler(async (req, res) => {
    const parsed = groupSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    try {
      const group = await createHrSalaryComponentGroup(institutionId, parsed.data);
      return res.status(201).json({ group });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Create failed';
      return res.status(400).json({ error: message });
    }
  }),
);

hrRouter.patch(
  '/allowances-deductions/groups/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      const group = await updateHrSalaryComponentGroup(institutionId, req.params.id, req.body);
      return res.json({ group });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Update failed';
      return res.status(400).json({ error: message });
    }
  }),
);

hrRouter.delete(
  '/allowances-deductions/groups/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      await deleteHrSalaryComponentGroup(institutionId, req.params.id);
      return res.json({ ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Delete failed';
      return res.status(400).json({ error: message });
    }
  }),
);

const mappingSchema = z.object({
  componentId: z.string(),
  templateId: z.string().nullable().optional(),
  payGrade: z.string().optional(),
  effectiveFrom: z.string(),
  effectiveTo: z.string().nullable().optional(),
  priority: z.number().optional(),
  status: z.string().optional(),
});

hrRouter.post(
  '/allowances-deductions/mappings',
  asyncHandler(async (req, res) => {
    const parsed = mappingSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    try {
      const mapping = await createHrSalaryComponentMapping(institutionId, parsed.data);
      return res.status(201).json({ mapping });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Mapping failed';
      return res.status(400).json({ error: message });
    }
  }),
);

hrRouter.delete(
  '/allowances-deductions/mappings/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      await deleteHrSalaryComponentMapping(institutionId, req.params.id);
      return res.json({ ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Delete failed';
      return res.status(400).json({ error: message });
    }
  }),
);

hrRouter.post(
  '/allowances-deductions/preview-formula',
  asyncHandler(async (req, res) => {
    const preview = previewComponentFormula(req.body);
    return res.json({ preview });
  }),
);

hrRouter.post(
  '/allowances-deductions/seed-demo',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await seedHrAllowancesDeductionsDemo(institutionId);
    return res.json(data);
  }),
);

// ─── Attendance Policy ───────────────────────────────────────────────────────

hrRouter.get(
  '/attendance-policy',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const seed = false;
    if (seed) await seedAttendancePolicyDemo(institutionId);
    const filters = await getInstitutionFilterMeta(institutionId);
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : filters.defaultAcademicYear;
    const data = await getAttendancePolicyDashboard(institutionId, academicYear);
    return res.json(data);
  }),
);

hrRouter.patch(
  '/attendance-policy',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      const data = await updateAttendancePolicy(institutionId, req.body);
      return res.json(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Update failed';
      return res.status(400).json({ error: message });
    }
  }),
);

const policyAssignmentSchema = z
  .object({
    policyId: z.string().min(1),
    employeeId: z.string().min(1).optional(),
    employeeIds: z.array(z.string().min(1)).max(500).optional(),
    effectiveDate: z.string().min(1),
  })
  .refine((d) => Boolean(d.employeeId) || (d.employeeIds?.length ?? 0) > 0, {
    message: 'Select at least one employee',
  });

hrRouter.post(
  '/attendance-policy/assign',
  asyncHandler(async (req, res) => {
    const parsed = policyAssignmentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    try {
      const result = await assignLeavePolicy(institutionId, parsed.data);
      return res.status(201).json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Assignment failed';
      return res.status(400).json({ error: message });
    }
  }),
);

hrRouter.delete(
  '/attendance-policy/assignments/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      await removeLeavePolicyAssignment(institutionId, req.params.id);
      return res.json({ ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Delete failed';
      return res.status(400).json({ error: message });
    }
  }),
);

hrRouter.post(
  '/attendance-policy/seed-demo',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await seedAttendancePolicyDemo(institutionId);
    return res.json(data);
  }),
);

// ─── Shift Management ────────────────────────────────────────────────────────

hrRouter.get(
  '/shift-management',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await getShiftManagementDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.post(
  '/shift-management/shifts',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const shift = await createHrShift(institutionId, req.body);
    return res.status(201).json({ shift });
  }),
);

hrRouter.patch(
  '/shift-management/shifts/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const shift = await updateHrShift(institutionId, req.params.id, req.body);
    return res.json({ shift });
  }),
);

hrRouter.patch(
  '/shift-management/working-hours',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await updateInstitutionWorkingHours(institutionId, req.body);
    const data = await getShiftManagementDashboard(institutionId);
    return res.json(data);
  }),
);

const shiftAssignmentSchema = z
  .object({
    employeeId: z.string().min(1).optional(),
    employeeIds: z.array(z.string().min(1)).max(500).optional(),
    shiftId: z.string().min(1),
    effectiveDate: z.string().min(1),
    employmentType: z.string().optional(),
    branch: z.string().optional(),
    workingDays: z.array(z.string()).optional(),
    weeklyOff: z.array(z.string()).optional(),
    attendanceRule: z.string().optional(),
    payrollRule: z.string().optional(),
    remarks: z.string().optional(),
  })
  .refine((d) => Boolean(d.employeeId) || (d.employeeIds?.length ?? 0) > 0, {
    message: 'Select at least one employee',
  });

const shiftAssignmentUpdateSchema = z.object({
  shiftId: z.string().min(1).optional(),
  effectiveDate: z.string().min(1).optional(),
  employmentType: z.string().optional(),
  branch: z.string().optional(),
  workingDays: z.array(z.string()).optional(),
  weeklyOff: z.array(z.string()).optional(),
  attendanceRule: z.string().optional(),
  payrollRule: z.string().optional(),
  remarks: z.string().optional(),
  status: z.string().optional(),
});

hrRouter.post(
  '/shift-management/assignments',
  asyncHandler(async (req, res) => {
    const parsed = shiftAssignmentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    try {
      await assignEmployeeShift(institutionId, parsed.data);
      const data = await getShiftManagementDashboard(institutionId);
      return res.json(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Assignment failed';
      return res.status(400).json({ error: message });
    }
  }),
);

hrRouter.patch(
  '/shift-management/assignments/:id',
  asyncHandler(async (req, res) => {
    const parsed = shiftAssignmentUpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    try {
      await updateEmployeeShiftAssignment(institutionId, req.params.id, parsed.data);
      const data = await getShiftManagementDashboard(institutionId);
      return res.json(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Update failed';
      return res.status(400).json({ error: message });
    }
  }),
);

hrRouter.post(
  '/shift-management/department-mapping',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await mapDepartmentShift(institutionId, req.body);
    const data = await getShiftManagementDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.post(
  '/shift-management/change-requests',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const record = await createShiftChangeRequest(institutionId, req.body);
    return res.status(201).json({ record });
  }),
);

hrRouter.post(
  '/shift-management/change-requests/:id/workflow',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const action = req.body.action === 'reject' ? 'reject' : 'approve';
    await advanceShiftChangeRequest(institutionId, req.params.id, action, req.body.approvedBy);
    const data = await getShiftManagementDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.post(
  '/shift-management/substitutes',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const record = await assignSubstitute(institutionId, req.body);
    return res.status(201).json({ record });
  }),
);

hrRouter.post(
  '/shift-management/overtime',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const record = await createOvertimeRecord(institutionId, req.body);
    return res.status(201).json({ record });
  }),
);

hrRouter.post(
  '/shift-management/overtime/:id/workflow',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const action = req.body.action === 'reject' ? 'reject' : 'approve';
    await advanceOvertimeWorkflow(institutionId, req.params.id, action, req.body.approvedBy);
    const data = await getShiftManagementDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.post(
  '/shift-management/duties',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const record = await assignDuty(institutionId, req.body);
    return res.status(201).json({ record });
  }),
);

hrRouter.patch(
  '/shift-management/settings',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await updateShiftModuleSettings(institutionId, req.body);
    const data = await getShiftManagementDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.post(
  '/shift-management/seed-demo',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await seedShiftManagementDemo(institutionId);
    return res.json(data);
  }),
);

// ─── Performance Appraisal ───────────────────────────────────────────────────

hrRouter.get(
  '/performance-appraisal',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
    const quarter = typeof req.query.quarter === 'string' ? req.query.quarter : undefined;
    const data = await getPerformanceAppraisalDashboard(institutionId, { academicYear, quarter });
    return res.json(data);
  }),
);

hrRouter.post(
  '/performance-appraisal/generate',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = String(req.body.academicYear ?? '2025-26');
    const quarter = String(req.body.quarter ?? 'Q1');
    const result = await generateAppraisalsFromEmployees(institutionId, academicYear, quarter);
    const data = await getPerformanceAppraisalDashboard(institutionId, { academicYear, quarter });
    return res.json({ ...result, data });
  }),
);

hrRouter.post(
  '/performance-appraisal/appraisals',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const appraisal = await createPerformanceAppraisal(institutionId, req.body);
    return res.status(201).json({ appraisal });
  }),
);

hrRouter.patch(
  '/performance-appraisal/appraisals/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const appraisal = await updatePerformanceAppraisal(institutionId, req.params.id, req.body);
    return res.json({ appraisal });
  }),
);

hrRouter.post(
  '/performance-appraisal/appraisals/:id/workflow',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const appraisal = await advanceAppraisalWorkflow(institutionId, req.params.id);
    return res.json({ appraisal });
  }),
);

hrRouter.post(
  '/performance-appraisal/publish-mobile',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const ids = Array.isArray(req.body.ids) ? req.body.ids.map(String) : [];
    const result = await publishAppraisalsToMobile(institutionId, ids);
    const academicYear = typeof req.body.academicYear === 'string' ? req.body.academicYear : '2025-26';
    const quarter = typeof req.body.quarter === 'string' ? req.body.quarter : 'Q1';
    const data = await getPerformanceAppraisalDashboard(institutionId, { academicYear, quarter });
    return res.json({ ...result, data });
  }),
);

hrRouter.post(
  '/performance-appraisal/annual-reviews/compute',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = String(req.body.academicYear ?? '2025-26');
    const result = await computeAnnualReviews(institutionId, academicYear);
    const data = await getPerformanceAppraisalDashboard(institutionId, { academicYear });
    return res.json({ ...result, data });
  }),
);

hrRouter.patch(
  '/performance-appraisal/settings',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await updatePerformanceSettings(institutionId, req.body);
    const data = await getPerformanceAppraisalDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.post(
  '/performance-appraisal/kpis',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const kpi = await createPerformanceKpi(institutionId, req.body);
    const data = await getPerformanceAppraisalDashboard(institutionId);
    return res.json({ kpi, data });
  }),
);

hrRouter.patch(
  '/performance-appraisal/kpis/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const kpi = await updatePerformanceKpi(institutionId, String(req.params.id), req.body);
    const data = await getPerformanceAppraisalDashboard(institutionId);
    return res.json({ kpi, data });
  }),
);

hrRouter.post(
  '/performance-appraisal/kpis/sync-departments-designations',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await syncKpisFromDepartmentsDesignations(institutionId);
    const academicYear = typeof req.body.academicYear === 'string' ? req.body.academicYear : '2025-26';
    const data = await getPerformanceAppraisalDashboard(institutionId, { academicYear });
    return res.json({ ...result, data });
  }),
);

hrRouter.post(
  '/performance-appraisal/kpis/sync-continuous-evaluation',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await syncTeachingKpisFromContinuousEvaluation(institutionId);
    const academicYear = typeof req.body.academicYear === 'string' ? req.body.academicYear : '2025-26';
    const data = await getPerformanceAppraisalDashboard(institutionId, { academicYear });
    return res.json({ ...result, data });
  }),
);

hrRouter.patch(
  '/performance-appraisal/pay-grades/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const payGrade = await updatePayGrade(institutionId, String(req.params.id), req.body);
    const data = await getPerformanceAppraisalDashboard(institutionId);
    return res.json({ payGrade, data });
  }),
);

hrRouter.post(
  '/performance-appraisal/pay-grades/sync-designations',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await syncPayGradesFromDesignations(institutionId);
    const data = await getPerformanceAppraisalDashboard(institutionId);
    return res.json({ ...result, data });
  }),
);

hrRouter.post(
  '/performance-appraisal/seed-demo',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await seedPerformanceAppraisalDemo(institutionId);
    return res.json(data);
  }),
);

// ─── Recruitment Management ──────────────────────────────────────────────────

hrRouter.get(
  '/recruitment',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : '2025-26';
    const data = await getRecruitmentDashboard(institutionId, academicYear);
    return res.json(data);
  }),
);

hrRouter.post(
  '/recruitment/manpower-plans',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const plan = await createManpowerPlan(institutionId, req.body);
    const data = await getRecruitmentDashboard(institutionId, String(req.body.academicYear ?? '2025-26'));
    return res.status(201).json({ plan, data });
  }),
);

hrRouter.post(
  '/recruitment/requisitions',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const requisition = await createJobRequisition(institutionId, req.body);
    const data = await getRecruitmentDashboard(institutionId);
    return res.status(201).json({ requisition, data });
  }),
);

hrRouter.post(
  '/recruitment/requisitions/:id/workflow',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const action = ['reject', 'return', 'hold'].includes(req.body.action) ? req.body.action : 'approve';
    await advanceRequisitionWorkflow(institutionId, req.params.id, action);
    const data = await getRecruitmentDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.post(
  '/recruitment/postings',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const posting = await createJobPosting(institutionId, String(req.body.requisitionId));
    const data = await getRecruitmentDashboard(institutionId);
    return res.status(201).json({ posting, data });
  }),
);

hrRouter.post(
  '/recruitment/postings/:id/publish',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const channels = Array.isArray(req.body.channels) ? req.body.channels.map(String) : ['Career Website'];
    await publishJobPosting(institutionId, req.params.id, channels);
    const data = await getRecruitmentDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.post(
  '/recruitment/candidates',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const candidate = await createCandidate(institutionId, req.body);
    const data = await getRecruitmentDashboard(institutionId);
    return res.status(201).json({ candidate, data });
  }),
);

hrRouter.post(
  '/recruitment/applications',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const application = await createApplication(institutionId, req.body);
    const data = await getRecruitmentDashboard(institutionId);
    return res.status(201).json({ application, data });
  }),
);

hrRouter.post(
  '/recruitment/applications/:id/advance',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await advanceApplicationPipeline(institutionId, req.params.id, req.body.action);
    const data = await getRecruitmentDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.post(
  '/recruitment/interviews',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const interview = await createInterviewFeedback(institutionId, req.body);
    const data = await getRecruitmentDashboard(institutionId);
    return res.status(201).json({ interview, data });
  }),
);

hrRouter.post(
  '/recruitment/offers',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const offer = await createOffer(institutionId, req.body);
    const data = await getRecruitmentDashboard(institutionId);
    return res.status(201).json({ offer, data });
  }),
);

hrRouter.post(
  '/recruitment/offers/:id/workflow',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await advanceOfferWorkflow(institutionId, req.params.id);
    const data = await getRecruitmentDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.post(
  '/recruitment/offers/:id/accept',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await acceptOffer(institutionId, req.params.id);
    const data = await getRecruitmentDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.post(
  '/recruitment/onboarding/:id/create-employee',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await completeOnboardingAndCreateEmployee(institutionId, req.params.id);
    const data = await getRecruitmentDashboard(institutionId);
    return res.json({ ...result, data });
  }),
);

hrRouter.post(
  '/recruitment/onboarding/:id/confirm',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await confirmProbation(institutionId, req.params.id);
    const data = await getRecruitmentDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.patch(
  '/recruitment/settings',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await updateRecruitmentSettings(institutionId, req.body);
    const data = await getRecruitmentDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.post(
  '/recruitment/candidates/bulk-upload',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const postingId = String(req.body.postingId ?? '');
    const rows = Array.isArray(req.body.rows) ? req.body.rows : [];
    const result = await bulkUploadCandidates(institutionId, postingId, rows);
    const data = await getRecruitmentDashboard(institutionId);
    return res.json({ ...result, data });
  }),
);

hrRouter.patch(
  '/recruitment/candidates/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const candidate = await updateCandidate(institutionId, String(req.params.id), req.body);
    const data = await getRecruitmentDashboard(institutionId);
    return res.json({ candidate, data });
  }),
);

hrRouter.post(
  '/recruitment/applications/:id/review',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const action = req.body.action === 'reject' ? 'reject' : 'approve';
    await reviewCandidateApplication(institutionId, String(req.params.id), action);
    const data = await getRecruitmentDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.post(
  '/recruitment/applications/:id/select-interview',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await selectCandidateForInterview(institutionId, String(req.params.id));
    const data = await getRecruitmentDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.post(
  '/recruitment/interviews/assign',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const interview = await assignInterview(institutionId, req.body);
    const data = await getRecruitmentDashboard(institutionId);
    return res.status(201).json({ interview, data });
  }),
);

hrRouter.patch(
  '/recruitment/interviews/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const interview = await updateInterviewFeedback(institutionId, String(req.params.id), req.body);
    const data = await getRecruitmentDashboard(institutionId);
    return res.json({ interview, data });
  }),
);

hrRouter.post(
  '/recruitment/applications/:id/interview-passed',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const offer = await passInterviewAndCreateOffer(institutionId, String(req.params.id));
    const data = await getRecruitmentDashboard(institutionId);
    return res.json({ offer, data });
  }),
);

hrRouter.post(
  '/recruitment/offers/:id/generate-selection-letter',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const offer = await generateSelectionLetterEmail(institutionId, String(req.params.id));
    const data = await getRecruitmentDashboard(institutionId);
    return res.json({ offer, data });
  }),
);

hrRouter.patch(
  '/recruitment/offers/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const offer = await updateRecruitmentOffer(institutionId, String(req.params.id), req.body);
    const data = await getRecruitmentDashboard(institutionId);
    return res.json({ offer, data });
  }),
);

hrRouter.post(
  '/recruitment/offers/:id/send-email',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const offer = await sendOfferEmail(institutionId, String(req.params.id), req.body);
    const data = await getRecruitmentDashboard(institutionId);
    return res.json({ offer, data });
  }),
);

hrRouter.post(
  '/recruitment/references',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const reference = await createReferenceCheck(institutionId, req.body);
    const data = await getRecruitmentDashboard(institutionId);
    return res.status(201).json({ reference, data });
  }),
);

hrRouter.post(
  '/recruitment/references/:id/feedback',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const feedbackType = req.body.feedbackType === 'NEGATIVE' ? 'NEGATIVE' : 'POSITIVE';
    const reference = await submitReferenceFeedback(institutionId, String(req.params.id), {
      feedbackType,
      feedback: typeof req.body.feedback === 'string' ? req.body.feedback : undefined,
    });
    const data = await getRecruitmentDashboard(institutionId);
    return res.json({ reference, data });
  }),
);

hrRouter.post(
  '/recruitment/references/:id/approve-hire',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const reference = await approveReferenceHire(institutionId, String(req.params.id));
    const data = await getRecruitmentDashboard(institutionId);
    return res.json({ reference, data });
  }),
);

hrRouter.patch(
  '/recruitment/onboarding/:id/probation',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const onboarding = await updateProbationPeriod(institutionId, String(req.params.id), req.body);
    const data = await getRecruitmentDashboard(institutionId);
    return res.json({ onboarding, data });
  }),
);

hrRouter.post(
  '/recruitment/onboarding/:id/extend-probation',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const onboarding = await extendProbation(institutionId, String(req.params.id), {
      extendedEnd: String(req.body.extendedEnd),
      feedback: String(req.body.feedback ?? ''),
    });
    const data = await getRecruitmentDashboard(institutionId);
    return res.json({ onboarding, data });
  }),
);

hrRouter.post(
  '/recruitment/onboarding/:id/complete-probation',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const onboarding = await completeProbationWithFeedback(
      institutionId,
      String(req.params.id),
      String(req.body.feedback ?? ''),
    );
    const data = await getRecruitmentDashboard(institutionId);
    return res.json({ onboarding, data });
  }),
);

hrRouter.post(
  '/recruitment/seed-demo',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await seedRecruitmentDemo(institutionId);
    return res.json(data);
  }),
);

// ─── Training & Development ──────────────────────────────────────────────────

hrRouter.get(
  '/training',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : '2025-26';
    const data = await getTrainingDashboard(institutionId, academicYear);
    return res.json(data);
  }),
);

hrRouter.post(
  '/training/needs',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await createTrainingNeed(institutionId, req.body);
    const data = await getTrainingDashboard(institutionId, String(req.body.academicYear ?? '2025-26'));
    return res.json(data);
  }),
);

hrRouter.post(
  '/training/annual-plan',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = String(req.body.academicYear ?? '2025-26');
    await createAnnualPlan(institutionId, academicYear);
    const data = await getTrainingDashboard(institutionId, academicYear);
    return res.json(data);
  }),
);

hrRouter.post(
  '/training/annual-plan/approve',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const academicYear = String(req.body.academicYear ?? '2025-26');
    await approveAnnualPlan(institutionId, academicYear);
    const data = await getTrainingDashboard(institutionId, academicYear);
    return res.json(data);
  }),
);

hrRouter.post(
  '/training/courses',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await createTrainingCourse(institutionId, req.body);
    const data = await getTrainingDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.post(
  '/training/batches',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await createTrainingBatch(institutionId, req.body);
    const data = await getTrainingDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.post(
  '/training/nominations',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await nominateEmployee(institutionId, String(req.body.batchId), String(req.body.employeeId), String(req.body.method ?? 'HR_ASSIGNED'));
    const data = await getTrainingDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.post(
  '/training/nominations/:id/confirm',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await confirmNominationWorkflow(institutionId, req.params.id);
    const data = await getTrainingDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.post(
  '/training/nominations/:id/attendance',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await markTrainingAttendance(institutionId, req.params.id, String(req.body.method ?? 'QR'));
    const data = await getTrainingDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.post(
  '/training/assessments/:id/complete',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await completeAssessment(institutionId, req.params.id, Number(req.body.score ?? 75));
    const data = await getTrainingDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.patch(
  '/training/settings',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await updateTrainingSettings(institutionId, req.body);
    const data = await getTrainingDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.post(
  '/training/categories',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await createTrainingCategory(institutionId, req.body);
    const data = await getTrainingDashboard(institutionId);
    return res.status(201).json(data);
  }),
);

hrRouter.patch(
  '/training/needs/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await updateTrainingNeed(institutionId, String(req.params.id), req.body);
    const data = await getTrainingDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.patch(
  '/training/courses/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await updateTrainingCourse(institutionId, String(req.params.id), req.body);
    const data = await getTrainingDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.post(
  '/training/trainers',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await createTrainingTrainer(institutionId, req.body);
    const data = await getTrainingDashboard(institutionId);
    return res.status(201).json(data);
  }),
);

hrRouter.post(
  '/training/venues',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await createTrainingVenue(institutionId, req.body);
    const data = await getTrainingDashboard(institutionId);
    return res.status(201).json(data);
  }),
);

hrRouter.post(
  '/training/assignments',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await createTrainingAssignment(institutionId, req.body);
    const data = await getTrainingDashboard(institutionId);
    return res.status(201).json(data);
  }),
);

hrRouter.patch(
  '/training/assignments/:id/grade',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await gradeTrainingAssignment(institutionId, String(req.params.id), String(req.body.status ?? 'APPROVED'));
    const data = await getTrainingDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.post(
  '/training/feedback',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await submitTrainingFeedback(institutionId, req.body);
    const data = await getTrainingDashboard(institutionId);
    return res.status(201).json(data);
  }),
);

hrRouter.post(
  '/training/certificates/issue',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await issueTrainingCertificate(institutionId, String(req.body.nominationId));
    const data = await getTrainingDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.post(
  '/training/competencies',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await createTrainingCompetency(institutionId, req.body);
    const data = await getTrainingDashboard(institutionId);
    return res.status(201).json(data);
  }),
);

hrRouter.post(
  '/training/idps',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await createTrainingIdp(institutionId, req.body);
    const data = await getTrainingDashboard(institutionId);
    return res.status(201).json(data);
  }),
);

hrRouter.patch(
  '/training/idps/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await updateTrainingIdp(institutionId, String(req.params.id), req.body);
    const data = await getTrainingDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.post(
  '/training/budgets',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await createTrainingBudget(institutionId, req.body);
    const data = await getTrainingDashboard(institutionId);
    return res.status(201).json(data);
  }),
);

hrRouter.patch(
  '/training/budgets/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await updateTrainingBudget(institutionId, String(req.params.id), req.body);
    const data = await getTrainingDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.post(
  '/training/external',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await createTrainingExternal(institutionId, req.body);
    const data = await getTrainingDashboard(institutionId);
    return res.status(201).json(data);
  }),
);

hrRouter.post(
  '/training/seed-demo',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await seedTrainingDemo(institutionId);
    return res.json(data);
  }),
);

// ─── Employee Documents & Onboarding (EDOMS) ───────────────────────────────

hrRouter.get(
  '/edoms',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await getEdomsDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.post(
  '/edoms/cases',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await createOnboardingCase(institutionId, req.body);
    const data = await getEdomsDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.post(
  '/edoms/cases/:id/activate-portal',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await activatePreOnboardingPortal(institutionId, req.params.id);
    const data = await getEdomsDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.post(
  '/edoms/documents/:id/submit',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await submitDocument(institutionId, req.params.id, req.body);
    const data = await getEdomsDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.post(
  '/edoms/documents/:id/verify',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const action = ['reject', 'correction'].includes(req.body.action) ? req.body.action : 'verify';
    await verifyDocument(institutionId, req.params.id, action, String(req.body.verifiedBy ?? 'HR Executive'));
    const data = await getEdomsDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.post(
  '/edoms/cases/:id/advance',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await advanceOnboardingWorkflow(institutionId, req.params.id);
    const data = await getEdomsDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.post(
  '/edoms/cases/:id/create-employee',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await createEmployeeFromOnboarding(institutionId, req.params.id);
    const data = await getEdomsDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.post(
  '/edoms/checklists/:id/complete',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await completeChecklistItem(institutionId, req.params.id, String(req.body.completedBy ?? 'HR Executive'));
    const data = await getEdomsDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.post(
  '/edoms/cases/:id/confirm',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await confirmEdomsProbation(institutionId, req.params.id);
    const data = await getEdomsDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.post(
  '/edoms/seed-demo',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await seedEdomsDemo(institutionId);
    return res.json(data);
  }),
);

hrRouter.patch(
  '/edoms/cases/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await updateOnboardingCase(institutionId, req.params.id, req.body);
    const data = await getEdomsDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.post(
  '/edoms/cases/:id/documents',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await createEdomsDocument(institutionId, req.params.id, req.body);
    const data = await getEdomsDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.post(
  '/edoms/cases/:id/qualifications',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await createQualification(institutionId, req.params.id, req.body);
    const data = await getEdomsDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.post(
  '/edoms/qualifications/:id/verify',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const status = req.body.status === 'REJECTED' ? 'REJECTED' : 'VERIFIED';
    await verifyQualification(institutionId, req.params.id, status);
    const data = await getEdomsDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.post(
  '/edoms/cases/:id/employment-history',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await createEmploymentHistoryRecord(institutionId, req.params.id, req.body);
    const data = await getEdomsDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.post(
  '/edoms/verifications/:id/update',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const action = req.body.action === 'fail' ? 'fail' : 'complete';
    await updateVerification(institutionId, req.params.id, action, String(req.body.remarks ?? ''));
    const data = await getEdomsDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.post(
  '/edoms/cases/:id/checklists',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await addChecklistItem(institutionId, req.params.id, req.body);
    const data = await getEdomsDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.post(
  '/edoms/cases/:id/assets',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await createAsset(institutionId, req.params.id, req.body);
    const data = await getEdomsDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.post(
  '/edoms/assets/:id/status',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const status = ['RETURNED', 'LOST'].includes(req.body.status) ? req.body.status : 'ISSUED';
    await updateAssetStatus(institutionId, req.params.id, status);
    const data = await getEdomsDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.post(
  '/edoms/cases/:id/system-access',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await createSystemAccess(institutionId, req.params.id, req.body);
    const data = await getEdomsDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.post(
  '/edoms/system-access/:id/activate',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await activateSystemAccess(institutionId, req.params.id);
    const data = await getEdomsDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.patch(
  '/edoms/inductions/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await updateInduction(institutionId, req.params.id, req.body);
    const data = await getEdomsDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.patch(
  '/edoms/cases/:id/probation',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await updateProbation(institutionId, req.params.id, req.body);
    const data = await getEdomsDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.post(
  '/edoms/cases/:id/generate-letters',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await generateEmploymentLetters(institutionId, req.params.id);
    const data = await getEdomsDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.post(
  '/edoms/letters/:id/acknowledge',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await acknowledgeEmploymentLetter(institutionId, req.params.id);
    const data = await getEdomsDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.post(
  '/edoms/documents/:id/renew',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await renewDocumentExpiry(institutionId, req.params.id, req.body);
    const data = await getEdomsDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.post(
  '/edoms/documents/:id/expiry-alert',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await sendExpiryAlert(institutionId, req.params.id);
    const data = await getEdomsDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.patch(
  '/edoms/settings',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await updateEdomsSettings(institutionId, req.body);
    const data = await getEdomsDashboard(institutionId);
    return res.json(data);
  }),
);

// ─── Staff Resignation & Exit Management (SEMS) ──────────────────────────

hrRouter.get(
  '/exit-management',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await getExitDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.post(
  '/exit-management/cases',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await createResignationCase(institutionId, req.body);
    const data = await getExitDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.post(
  '/exit-management/cases/:id/submit',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await submitResignation(institutionId, req.params.id);
    const data = await getExitDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.post(
  '/exit-management/approvals/:id/action',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const action = String(req.body.action ?? 'approve') as 'approve' | 'reject' | 'clarify';
    await processApproval(institutionId, req.params.id, action, String(req.body.remarks ?? ''));
    const data = await getExitDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.post(
  '/exit-management/cases/:id/advance',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await advanceExitWorkflow(institutionId, req.params.id);
    const data = await getExitDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.post(
  '/exit-management/clearances/:id/approve',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await approveClearance(institutionId, req.params.id, String(req.body.remarks ?? ''));
    const data = await getExitDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.post(
  '/exit-management/handovers/:id/complete',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await completeHandover(institutionId, req.params.id);
    const data = await getExitDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.post(
  '/exit-management/assets/:id/recover',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await recoverAsset(institutionId, req.params.id);
    const data = await getExitDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.post(
  '/exit-management/cases/:id/approve-fnf',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await approveFnf(institutionId, req.params.id);
    const data = await getExitDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.post(
  '/exit-management/cases/:id/retention',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await initiateRetention(institutionId, req.params.id, String(req.body.retentionType ?? 'Stay Interview'));
    const data = await getExitDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.post(
  '/exit-management/seed-demo',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await seedExitDemo(institutionId);
    return res.json(data);
  }),
);

hrRouter.patch(
  '/exit-management/cases/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await updateResignationCase(institutionId, req.params.id, req.body);
    const data = await getExitDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.post(
  '/exit-management/cases/:id/extend-notice',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await extendNoticePeriod(institutionId, req.params.id, req.body);
    const data = await getExitDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.post(
  '/exit-management/cases/:id/handovers',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await addHandoverTask(institutionId, req.params.id, req.body);
    const data = await getExitDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.patch(
  '/exit-management/handovers/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await updateHandover(institutionId, req.params.id, req.body);
    const data = await getExitDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.post(
  '/exit-management/cases/:id/knowledge-transfer',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await addKnowledgeTransfer(institutionId, req.params.id, req.body);
    const data = await getExitDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.post(
  '/exit-management/knowledge-transfer/:id/complete',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await completeKnowledgeTransfer(institutionId, req.params.id);
    const data = await getExitDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.post(
  '/exit-management/clearances/:id/reject',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await rejectClearance(institutionId, req.params.id, String(req.body.remarks ?? ''));
    const data = await getExitDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.patch(
  '/exit-management/assets/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await updateAssetRecovery(institutionId, req.params.id, req.body);
    const data = await getExitDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.post(
  '/exit-management/cases/:id/recalculate-fnf',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await recalculateFnf(institutionId, req.params.id, req.body);
    const data = await getExitDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.post(
  '/exit-management/cases/:id/mark-fnf-paid',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await markFnfPaid(institutionId, req.params.id, req.body);
    const data = await getExitDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.patch(
  '/exit-management/cases/:id/leave-settlement',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await updateLeaveSettlement(institutionId, req.params.id, req.body);
    const data = await getExitDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.patch(
  '/exit-management/interviews/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await updateExitInterview(institutionId, req.params.id, req.body);
    const data = await getExitDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.post(
  '/exit-management/cases/:id/generate-documents',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await generateExitDocuments(institutionId, req.params.id);
    const data = await getExitDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.post(
  '/exit-management/documents/:id/send',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await sendExitDocument(institutionId, req.params.id);
    const data = await getExitDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.patch(
  '/exit-management/alumni/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await updateAlumniRecord(institutionId, req.params.id, req.body);
    const data = await getExitDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.patch(
  '/exit-management/retentions/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await closeRetention(institutionId, req.params.id, req.body);
    const data = await getExitDashboard(institutionId);
    return res.json(data);
  }),
);

hrRouter.patch(
  '/exit-management/settings',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await updateExitSettings(institutionId, req.body);
    const data = await getExitDashboard(institutionId);
    return res.json(data);
  }),
);

// ─── HR Reports ───────────────────────────────────────────────────────────

hrRouter.get(
  '/reports',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await getHrReportsMeta(institutionId);
    return res.json(data);
  }),
);

hrRouter.get(
  '/reports/:key',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const data = await generateHrReport(institutionId, req.params.key, {
      academicYear: String(req.query.academicYear ?? '2025-26'),
      dateFrom: req.query.dateFrom ? String(req.query.dateFrom) : undefined,
      dateTo: req.query.dateTo ? String(req.query.dateTo) : undefined,
      department: req.query.department ? String(req.query.department) : undefined,
    });
    return res.json(data);
  }),
);

// ─── Approval Hierarchy (module → role → person) ───────────────────────────

hrRouter.get(
  '/approval-hierarchy',
  asyncHandler(async (_req, res) => {
    const { listApprovalHierarchy } = await import('../lib/approvalHierarchy.js');
    const institutionId = await getDefaultInstitutionId();
    const records = await listApprovalHierarchy(institutionId);
    return res.json({ records });
  }),
);

hrRouter.get(
  '/approval-hierarchy/department/:departmentId/prefill',
  asyncHandler(async (req, res) => {
    const { getDepartmentHierarchyPrefill } = await import('../lib/approvalHierarchy.js');
    const institutionId = await getDefaultInstitutionId();
    try {
      const data = await getDepartmentHierarchyPrefill(institutionId, req.params.departmentId);
      return res.json(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load department hierarchy';
      return res.status(400).json({ error: message });
    }
  }),
);

const departmentHierarchySchema = z.object({
  departmentId: z.string().min(1),
  levels: z.array(z.object({
    roleKey: z.string().optional(),
    roleLabel: z.string().min(1),
    employeeId: z.string().optional(),
    sortOrder: z.number().int().optional(),
  })).min(1).max(20),
});

hrRouter.post(
  '/approval-hierarchy/department',
  asyncHandler(async (req, res) => {
    const parsed = departmentHierarchySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const { upsertDepartmentApprovalHierarchy } = await import('../lib/approvalHierarchy.js');
    const institutionId = await getDefaultInstitutionId();
    try {
      const data = await upsertDepartmentApprovalHierarchy(institutionId, parsed.data);
      return res.json(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save department hierarchy';
      return res.status(400).json({ error: message });
    }
  }),
);

hrRouter.delete(
  '/approval-hierarchy/department/:departmentId',
  asyncHandler(async (req, res) => {
    const { deleteDepartmentApprovalHierarchy } = await import('../lib/approvalHierarchy.js');
    const institutionId = await getDefaultInstitutionId();
    try {
      const data = await deleteDepartmentApprovalHierarchy(institutionId, req.params.departmentId);
      return res.json(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Delete failed';
      return res.status(400).json({ error: message });
    }
  }),
);

hrRouter.patch(
  '/approval-hierarchy/:id',
  asyncHandler(async (req, res) => {
    const bodySchema = z.object({
      employeeId: z.string().optional(),
      assigneeName: z.string().optional(),
      assigneeEmail: z.string().optional(),
      isActive: z.boolean().optional(),
    });
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { updateApprovalMapping } = await import('../lib/approvalHierarchy.js');
    const institutionId = await getDefaultInstitutionId();
    try {
      const record = await updateApprovalMapping(institutionId, req.params.id, parsed.data);
      return res.json({ record });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Update failed';
      return res.status(400).json({ error: message });
    }
  }),
);
