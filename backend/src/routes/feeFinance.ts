import { Router } from 'express';
import { z } from 'zod';
import {
  FeeApprovalStatus,
  FeeDiscountScope,
  FeeFineCategory,
  FeeFineLevyStatus,
  FeeInvoiceStatus,
  FeeMasterStatus,
  FeeOtherChargeRequestType,
  FeeRefundType,
  FeeStructureStatus,
  BankDepositStatus,
  ExpenseEntryStatus,
  ExpensePaymentMethod,
  PayrollEmploymentType,
  PayrollSlipStatus,
  TransportVendorStatus,
} from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';
import { requireApprover } from '../middleware/roles.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { getDefaultInstitutionId } from '../lib/institution.js';
import { getFeeDashboard, getFeeDashboardMeta } from '../lib/feeDashboard.js';
import {
  FINANCIAL_REPORT_CATALOG,
  generateAllFinancialReports,
  generateFinancialReport,
  reportToCsv,
  type FinancialReportType,
} from '../lib/financialReports.js';
import { accountsLedgerToCsv, getAccountsLedger } from '../lib/accountsLedger.js';
import { getInstitutionFilterMeta } from '../lib/students.js';
import {
  createFeeStructure,
  exportFeeStructures,
  getFeeStructure,
  getFeeStructureSummary,
  importFeeStructuresBatch,
  importFeeStructuresFromSetup,
  listFeeStructures,
  updateFeeStructure,
} from '../lib/feeStructure.js';
import {
  exportFeeCollectionEntries,
  getFeeCollectionAnalytics,
  listFeeCollectionEntries,
} from '../lib/feeCollectionModule.js';
import {
  exportOnlinePaymentsReport,
  getOnlinePaymentsReport,
} from '../lib/onlinePayments.js';
import {
  getOrCreateReconciliation,
  getReconciliationPdfPayload,
  listReconciliations,
  processReconciliationAction,
  submitReconciliationForApproval,
  updateReconciliationInputs,
} from '../lib/paymentReconciliation.js';
import {
  approveCashDeposit,
  createCashDeposit,
  createChequeDeposit,
  exportBankCashBook,
  getBankCashBookMeta,
  getBankCashBookSummary,
  importBankCashBookBatch,
  listBankCashBookDeposits,
  listDepositHistory,
  previewCashCollection,
  realizeChequeDeposit,
} from '../lib/bankCashBook.js';
import {
  approveExpenseReimbursement,
  createExpenseBudget,
  createExpenseEntry,
  createExpenseRecurring,
  createExpenseReimbursement,
  createExpenseVendor,
  exportExpenseData,
  generateExpenseReport,
  getExpenseDashboard,
  getExpenseMeta,
  listExpenseBudgets,
  listExpenseCategories,
  listExpenseEntries,
  listExpenseRecurring,
  listExpenseReimbursements,
  listExpenseVendors,
  markExpensePaid,
  processExpenseApproval,
  seedExpenseCategories,
} from '../lib/expenseManagement.js';
import {
  cancelPayrollSlip,
  createPayrollEmployee,
  createSalaryStructure,
  generatePayrollSlips,
  getOrCreateStatutoryConfig,
  getPayrollSlip,
  getPayrollSummary,
  getStatutoryReport,
  listPayrollEmployees,
  listPayrollSlips,
  listSalaryStructures,
  markPayrollSlipPaid,
  previewSalaryStructure,
  updatePayrollEmployee,
  updateStatutoryConfig,
} from '../lib/payroll.js';
import {
  approveFeeDiscount,
  approveFeeRefund,
  approveFeeScholarship,
  approveScholarshipAward,
  awardScholarship,
  collectTransportFee,
  collectHostelFee,
  approveOtherChargeRequest,
  createOtherChargeRequest,
  ensureOtherChargeTypes,
  getOtherChargesSummary,
  listOtherChargeRequests,
  listOtherChargeTypes,
  rejectOtherChargeRequest,
  seedOtherChargeTypes,
  submitOtherChargeRequest,
  createFeeDiscount,
  createFeeFineType,
  createFeeInvoice,
  createFeeMaster,
  createFeeRefund,
  createFeeScholarship,
  createHostelFeeCategory,
  createTransportVendor,
  ensureHostelFeeCategories,
  generateInvoiceFromReceipt,
  generateInvoicesFromReceipts,
  getFeeInvoice,
  getHostelFeeSummary,
  getTransportFeeSummary,
  levyFeeFine,
  listFeeDiscounts,
  listFeeFineLevies,
  listFeeFineTypes,
  listFeeInvoices,
  listFeeMasters,
  listFeeRefunds,
  listFeeScholarships,
  listHostelFeeCategories,
  listHostelFeeCollections,
  listScholarshipAwards,
  listTransportFeeCollections,
  listTransportVendorPayments,
  listTransportVendors,
  markFinePaid,
  payTransportVendor,
  processFeeRefund,
  rejectFeeDiscount,
  rejectFeeRefund,
  rejectFeeScholarship,
  rejectScholarshipAward,
  seedFeeFineTypes,
  seedFeeMasters,
  seedHostelFeeCategories,
  submitDiscountForApproval,
  submitScholarshipForApproval,
  updateFeeFineType,
  updateFeeMaster,
  updateHostelFeeCategory,
  updateInvoiceStatus,
  updateTransportVendor,
  waiveFeeFine,
} from '../lib/feeFinanceModules.js';

export const feeFinanceRouter = Router();
feeFinanceRouter.use(requireAuth);

function actor(req: { user?: { email?: string } }) {
  return req.user?.email || 'System';
}

function handleModuleError(err: unknown, res: import('express').Response, notFoundLabel = 'Record') {
  const message = err instanceof Error ? err.message : 'Request failed';
  if (/not found/i.test(message)) {
    return res.status(404).json({ error: `${notFoundLabel} not found` });
  }
  return res.status(400).json({ error: message });
}

const filterSchema = z.object({
  academicYear: z.string().optional(),
  financialYear: z.string().optional(),
});

const masterStatusSchema = z.nativeEnum(FeeMasterStatus);
const invoiceStatusSchema = z.nativeEnum(FeeInvoiceStatus);
const approvalStatusSchema = z.nativeEnum(FeeApprovalStatus);
const discountScopeSchema = z.nativeEnum(FeeDiscountScope);
const refundTypeSchema = z.nativeEnum(FeeRefundType);
const fineCategorySchema = z.nativeEnum(FeeFineCategory);
const fineLevyStatusSchema = z.nativeEnum(FeeFineLevyStatus);
const transportVendorStatusSchema = z.nativeEnum(TransportVendorStatus);

const createMasterSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  defaultAmount: z.number().optional(),
  isRefundable: z.boolean().optional(),
  isTaxable: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
  status: masterStatusSchema.optional(),
  showInCollection: z.boolean().optional(),
  showInInvoice: z.boolean().optional(),
  showInPayment: z.boolean().optional(),
  schoolDetails: z.record(z.unknown()).optional(),
});

const updateMasterSchema = createMasterSchema.partial();

const createInvoiceSchema = z.object({
  studentName: z.string().min(1),
  academicYear: z.string().optional(),
  studentId: z.string().optional(),
  admissionNumber: z.string().optional(),
  className: z.string().optional(),
  sectionName: z.string().optional(),
  rollNumber: z.string().optional(),
  parentName: z.string().optional(),
  parentMobile: z.string().optional(),
  parentEmail: z.string().optional(),
  photoUrl: z.string().optional(),
  feePeriod: z.string().optional(),
  invoiceDate: z.string().optional(),
  dueDate: z.string().optional(),
  lineItems: z.array(z.record(z.unknown())).optional(),
  totalFee: z.number().optional(),
  concessionAmount: z.number().optional(),
  lateFee: z.number().optional(),
  previousDues: z.number().optional(),
  remarks: z.string().optional(),
});

const fromReceiptsSchema = z.object({
  academicYear: z.string().optional(),
  receiptIds: z.array(z.string()).optional(),
});

const invoiceStatusUpdateSchema = z.object({
  status: invoiceStatusSchema,
  amountPaid: z.number().optional(),
  paymentMode: z.string().optional(),
  verifiedBy: z.string().optional(),
  approvedBy: z.string().optional(),
});

const createDiscountSchema = z.object({
  code: z.string().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  discountType: z.string().optional(),
  value: z.number().optional(),
  scope: discountScopeSchema.optional(),
  academicYear: z.string().optional(),
  maxUses: z.number().int().optional(),
  studentId: z.string().optional(),
  studentName: z.string().optional(),
  admissionNumber: z.string().optional(),
  settlementAmount: z.number().optional(),
  remarks: z.string().optional(),
});

const rejectSchema = z.object({
  reason: z.string().min(1),
});

const createRefundSchema = z.object({
  academicYear: z.string().optional(),
  studentId: z.string().optional(),
  studentName: z.string().min(1),
  admissionNumber: z.string().optional(),
  className: z.string().optional(),
  sectionName: z.string().optional(),
  refundType: refundTypeSchema.optional(),
  amount: z.number().positive(),
  reason: z.string().optional(),
  originalReceipt: z.string().optional(),
  paymentMode: z.string().optional(),
  remarks: z.string().optional(),
});

const processRefundSchema = z.object({
  paymentMode: z.string().optional(),
});

const createFineTypeSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  category: fineCategorySchema.optional(),
  defaultAmount: z.number().optional(),
  description: z.string().optional(),
  isCustomizable: z.boolean().optional(),
  status: masterStatusSchema.optional(),
});

const updateFineTypeSchema = createFineTypeSchema.partial();

const levyFineSchema = z.object({
  fineTypeId: z.string().min(1),
  academicYear: z.string().optional(),
  studentId: z.string().optional(),
  studentName: z.string().min(1),
  admissionNumber: z.string().optional(),
  className: z.string().optional(),
  amount: z.number().positive(),
  reason: z.string().optional(),
  dueDate: z.string().optional(),
});

const createScholarshipSchema = z.object({
  code: z.string().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  academicYear: z.string().optional(),
  waiverType: z.string().optional(),
  waiverValue: z.number().optional(),
  budgetAllocated: z.number().optional(),
  applicableFor: z.string().optional(),
  remarks: z.string().optional(),
});

const awardScholarshipSchema = z.object({
  scholarshipId: z.string().min(1),
  academicYear: z.string().optional(),
  studentId: z.string().optional(),
  studentName: z.string().min(1),
  admissionNumber: z.string().optional(),
  className: z.string().optional(),
  amount: z.number().optional(),
  remarks: z.string().optional(),
});

const createTransportVendorSchema = z.object({
  vendorCode: z.string().min(1),
  vendorName: z.string().min(1),
  contactPerson: z.string().optional(),
  mobile: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  routesCovered: z.string().optional(),
  vehicleCount: z.number().int().optional(),
  bankDetails: z.record(z.unknown()).optional(),
  status: transportVendorStatusSchema.optional(),
  remarks: z.string().optional(),
});

const updateTransportVendorSchema = createTransportVendorSchema.partial();

const collectTransportSchema = z.object({
  academicYear: z.string().optional(),
  monthLabel: z.string().optional(),
  studentId: z.string().optional(),
  studentName: z.string().min(1),
  admissionNumber: z.string().optional(),
  className: z.string().optional(),
  routeName: z.string().optional(),
  amount: z.number().positive(),
  paymentMode: z.string().optional(),
  remarks: z.string().optional(),
});

const payVendorSchema = z.object({
  vendorId: z.string().min(1),
  amount: z.number().positive(),
  paymentMode: z.string().optional(),
  paymentDate: z.string().optional(),
  periodLabel: z.string().optional(),
  remarks: z.string().optional(),
});

// ─── Dashboard ────────────────────────────────────────────────────────────────

feeFinanceRouter.get(
  '/meta',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const meta = await getFeeDashboardMeta(institutionId);
    return res.json(meta);
  }),
);

feeFinanceRouter.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const querySchema = filterSchema.extend({
      overviewPeriod: z.enum(['month', 'year', 'academic']).optional(),
    });
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    const data = await getFeeDashboard(institutionId, {
      academicYear: parsed.data.academicYear,
      financialYear: parsed.data.financialYear,
      overviewPeriod: parsed.data.overviewPeriod,
    });
    return res.json(data);
  }),
);

// ─── Fee Masters ──────────────────────────────────────────────────────────────

feeFinanceRouter.get(
  '/masters',
  asyncHandler(async (req, res) => {
    const querySchema = z.object({
      status: masterStatusSchema.optional(),
      q: z.string().optional(),
    });
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    const records = await listFeeMasters(institutionId, parsed.data);
    return res.json({ records });
  }),
);

feeFinanceRouter.post(
  '/masters/seed',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      const result = await seedFeeMasters(institutionId);
      return res.json(result);
    } catch (err) {
      return handleModuleError(err, res, 'Fee master');
    }
  }),
);

feeFinanceRouter.post(
  '/masters',
  asyncHandler(async (req, res) => {
    const parsed = createMasterSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    try {
      const record = await createFeeMaster(institutionId, parsed.data);
      return res.status(201).json({ record });
    } catch (err) {
      return handleModuleError(err, res, 'Fee master');
    }
  }),
);

feeFinanceRouter.patch(
  '/masters/:id',
  asyncHandler(async (req, res) => {
    const parsed = updateMasterSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    try {
      const record = await updateFeeMaster(institutionId, req.params.id, parsed.data);
      if (!record) return res.status(404).json({ error: 'Fee master not found' });
      return res.json({ record });
    } catch (err) {
      return handleModuleError(err, res, 'Fee master');
    }
  }),
);

// ─── Invoices ─────────────────────────────────────────────────────────────────

feeFinanceRouter.get(
  '/invoices',
  asyncHandler(async (req, res) => {
    const querySchema = z.object({
      academicYear: z.string().optional(),
      status: invoiceStatusSchema.optional(),
      q: z.string().optional(),
    });
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    const records = await listFeeInvoices(institutionId, parsed.data);
    return res.json({ records });
  }),
);

feeFinanceRouter.post(
  '/invoices/from-receipts',
  asyncHandler(async (req, res) => {
    const parsed = fromReceiptsSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    const preparedBy = actor(req);
    try {
      if (parsed.data.receiptIds?.length) {
        const records = [];
        for (const receiptId of parsed.data.receiptIds) {
          records.push(
            await generateInvoiceFromReceipt(institutionId, receiptId, { preparedBy }),
          );
        }
        return res.status(201).json({ records });
      }
      const result = await generateInvoicesFromReceipts(institutionId, {
        academicYear: parsed.data.academicYear,
        preparedBy,
      });
      return res.status(201).json({
        records: Array.isArray(result) ? result : result.invoices,
        created: Array.isArray(result) ? result.length : result.created,
      });
    } catch (err) {
      return handleModuleError(err, res, 'Invoice');
    }
  }),
);

feeFinanceRouter.post(
  '/invoices/from-receipt/:receiptId',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      const record = await generateInvoiceFromReceipt(institutionId, req.params.receiptId, {
        preparedBy: actor(req),
      });
      return res.status(201).json({ record });
    } catch (err) {
      return handleModuleError(err, res, 'Invoice');
    }
  }),
);

feeFinanceRouter.post(
  '/invoices',
  asyncHandler(async (req, res) => {
    const parsed = createInvoiceSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    try {
      const record = await createFeeInvoice(institutionId, {
        ...parsed.data,
        academicYear: parsed.data.academicYear || '2025-26',
        lineItems: parsed.data.lineItems?.map((i) => ({
          key: String((i as { key?: unknown }).key || ''),
          label: String((i as { label?: unknown }).label || ''),
          amount: Number((i as { amount?: unknown }).amount) || 0,
        })),
        preparedBy: actor(req),
      });
      return res.status(201).json({ record });
    } catch (err) {
      return handleModuleError(err, res, 'Invoice');
    }
  }),
);

feeFinanceRouter.get(
  '/invoices/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      const record = await getFeeInvoice(institutionId, req.params.id);
      if (!record) return res.status(404).json({ error: 'Invoice not found' });
      return res.json({ record });
    } catch (err) {
      return handleModuleError(err, res, 'Invoice');
    }
  }),
);

feeFinanceRouter.patch(
  '/invoices/:id/status',
  asyncHandler(async (req, res) => {
    const parsed = invoiceStatusUpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    try {
      const record = await updateInvoiceStatus(institutionId, req.params.id, parsed.data.status, {
        amountPaid: parsed.data.amountPaid,
        paymentMode: parsed.data.paymentMode,
        verifiedBy: parsed.data.verifiedBy,
        approvedBy: parsed.data.approvedBy,
      });
      if (!record) return res.status(404).json({ error: 'Invoice not found' });
      return res.json({ record });
    } catch (err) {
      return handleModuleError(err, res, 'Invoice');
    }
  }),
);

// ─── Discounts ────────────────────────────────────────────────────────────────

feeFinanceRouter.get(
  '/discounts',
  asyncHandler(async (req, res) => {
    const querySchema = z.object({
      academicYear: z.string().optional(),
      status: approvalStatusSchema.optional(),
      scope: discountScopeSchema.optional(),
    });
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    const records = await listFeeDiscounts(institutionId, parsed.data);
    return res.json({ records });
  }),
);

feeFinanceRouter.post(
  '/discounts',
  asyncHandler(async (req, res) => {
    const parsed = createDiscountSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    try {
      const record = await createFeeDiscount(
        institutionId,
        { ...parsed.data, academicYear: parsed.data.academicYear || '2025-26' },
        actor(req),
      );
      return res.status(201).json({ record });
    } catch (err) {
      return handleModuleError(err, res, 'Discount');
    }
  }),
);

feeFinanceRouter.post(
  '/discounts/:id/submit',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      const record = await submitDiscountForApproval(institutionId, req.params.id);
      if (!record) return res.status(404).json({ error: 'Discount not found' });
      return res.json({ record });
    } catch (err) {
      return handleModuleError(err, res, 'Discount');
    }
  }),
);

feeFinanceRouter.post(
  '/discounts/:id/approve',
  requireApprover,
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      const record = await approveFeeDiscount(institutionId, req.params.id, actor(req));
      if (!record) return res.status(404).json({ error: 'Discount not found' });
      return res.json({ record });
    } catch (err) {
      return handleModuleError(err, res, 'Discount');
    }
  }),
);

feeFinanceRouter.post(
  '/discounts/:id/reject',
  requireApprover,
  asyncHandler(async (req, res) => {
    const parsed = rejectSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    try {
      const record = await rejectFeeDiscount(
        institutionId,
        req.params.id,
        actor(req),
        parsed.data.reason,
      );
      if (!record) return res.status(404).json({ error: 'Discount not found' });
      return res.json({ record });
    } catch (err) {
      return handleModuleError(err, res, 'Discount');
    }
  }),
);

// ─── Refunds ──────────────────────────────────────────────────────────────────

feeFinanceRouter.get(
  '/refunds',
  asyncHandler(async (req, res) => {
    const querySchema = z.object({
      academicYear: z.string().optional(),
      status: approvalStatusSchema.optional(),
    });
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    const records = await listFeeRefunds(institutionId, parsed.data);
    return res.json({ records });
  }),
);

feeFinanceRouter.post(
  '/refunds',
  asyncHandler(async (req, res) => {
    const parsed = createRefundSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    try {
      const record = await createFeeRefund(
        institutionId,
        { ...parsed.data, academicYear: parsed.data.academicYear || '2025-26' },
        actor(req),
      );
      return res.status(201).json({ record });
    } catch (err) {
      return handleModuleError(err, res, 'Refund');
    }
  }),
);

feeFinanceRouter.post(
  '/refunds/:id/approve',
  requireApprover,
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      const record = await approveFeeRefund(institutionId, req.params.id, actor(req));
      if (!record) return res.status(404).json({ error: 'Refund not found' });
      return res.json({ record });
    } catch (err) {
      return handleModuleError(err, res, 'Refund');
    }
  }),
);

feeFinanceRouter.post(
  '/refunds/:id/reject',
  requireApprover,
  asyncHandler(async (req, res) => {
    const parsed = rejectSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    try {
      const record = await rejectFeeRefund(
        institutionId,
        req.params.id,
        actor(req),
        parsed.data.reason,
      );
      if (!record) return res.status(404).json({ error: 'Refund not found' });
      return res.json({ record });
    } catch (err) {
      return handleModuleError(err, res, 'Refund');
    }
  }),
);

feeFinanceRouter.post(
  '/refunds/:id/process',
  asyncHandler(async (req, res) => {
    const parsed = processRefundSchema.safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    try {
      const record = await processFeeRefund(institutionId, req.params.id, parsed.data);
      if (!record) return res.status(404).json({ error: 'Refund not found' });
      return res.json({ record });
    } catch (err) {
      return handleModuleError(err, res, 'Refund');
    }
  }),
);

// ─── Fines ────────────────────────────────────────────────────────────────────

feeFinanceRouter.get(
  '/fines/types',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const records = await listFeeFineTypes(institutionId);
    return res.json({ records });
  }),
);

feeFinanceRouter.post(
  '/fines/types/seed',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      const result = await seedFeeFineTypes(institutionId);
      return res.json(result);
    } catch (err) {
      return handleModuleError(err, res, 'Fine type');
    }
  }),
);

feeFinanceRouter.post(
  '/fines/types',
  asyncHandler(async (req, res) => {
    const parsed = createFineTypeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    try {
      const record = await createFeeFineType(institutionId, parsed.data);
      return res.status(201).json({ record });
    } catch (err) {
      return handleModuleError(err, res, 'Fine type');
    }
  }),
);

feeFinanceRouter.patch(
  '/fines/types/:id',
  asyncHandler(async (req, res) => {
    const parsed = updateFineTypeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    try {
      const record = await updateFeeFineType(institutionId, req.params.id, parsed.data);
      if (!record) return res.status(404).json({ error: 'Fine type not found' });
      return res.json({ record });
    } catch (err) {
      return handleModuleError(err, res, 'Fine type');
    }
  }),
);

feeFinanceRouter.get(
  '/fines/levies',
  asyncHandler(async (req, res) => {
    const querySchema = z.object({
      academicYear: z.string().optional(),
      status: fineLevyStatusSchema.optional(),
    });
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    const records = await listFeeFineLevies(institutionId, parsed.data);
    return res.json({ records });
  }),
);

feeFinanceRouter.post(
  '/fines/levies',
  asyncHandler(async (req, res) => {
    const parsed = levyFineSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    try {
      const record = await levyFeeFine(institutionId, {
        ...parsed.data,
        academicYear: parsed.data.academicYear || '2025-26',
      });
      return res.status(201).json({ record });
    } catch (err) {
      return handleModuleError(err, res, 'Fine levy');
    }
  }),
);

feeFinanceRouter.post(
  '/fines/levies/:id/pay',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      const record = await markFinePaid(institutionId, req.params.id);
      if (!record) return res.status(404).json({ error: 'Fine levy not found' });
      return res.json({ record });
    } catch (err) {
      return handleModuleError(err, res, 'Fine levy');
    }
  }),
);

feeFinanceRouter.post(
  '/fines/levies/:id/waive',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      const record = await waiveFeeFine(institutionId, req.params.id);
      if (!record) return res.status(404).json({ error: 'Fine levy not found' });
      return res.json({ record });
    } catch (err) {
      return handleModuleError(err, res, 'Fine levy');
    }
  }),
);

// ─── Scholarships ─────────────────────────────────────────────────────────────

feeFinanceRouter.get(
  '/scholarships/awards',
  asyncHandler(async (req, res) => {
    const querySchema = z.object({
      academicYear: z.string().optional(),
      scholarshipId: z.string().optional(),
    });
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    const records = await listScholarshipAwards(institutionId, parsed.data);
    return res.json({ records });
  }),
);

feeFinanceRouter.post(
  '/scholarships/awards',
  asyncHandler(async (req, res) => {
    const parsed = awardScholarshipSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    try {
      const record = await awardScholarship(institutionId, {
        ...parsed.data,
        academicYear: parsed.data.academicYear || '2025-26',
        amount: parsed.data.amount ?? 0,
      });
      return res.status(201).json({ record });
    } catch (err) {
      return handleModuleError(err, res, 'Scholarship award');
    }
  }),
);

feeFinanceRouter.post(
  '/scholarships/awards/:id/approve',
  requireApprover,
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      const record = await approveScholarshipAward(institutionId, req.params.id, actor(req));
      if (!record) return res.status(404).json({ error: 'Scholarship award not found' });
      return res.json({ record });
    } catch (err) {
      return handleModuleError(err, res, 'Scholarship award');
    }
  }),
);

feeFinanceRouter.post(
  '/scholarships/awards/:id/reject',
  requireApprover,
  asyncHandler(async (req, res) => {
    const parsed = rejectSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    try {
      const record = await rejectScholarshipAward(
        institutionId,
        req.params.id,
        actor(req),
        parsed.data.reason,
      );
      if (!record) return res.status(404).json({ error: 'Scholarship award not found' });
      return res.json({ record });
    } catch (err) {
      return handleModuleError(err, res, 'Scholarship award');
    }
  }),
);

feeFinanceRouter.get(
  '/scholarships',
  asyncHandler(async (req, res) => {
    const querySchema = z.object({
      academicYear: z.string().optional(),
      status: approvalStatusSchema.optional(),
    });
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    const records = await listFeeScholarships(institutionId, parsed.data);
    return res.json({ records });
  }),
);

feeFinanceRouter.post(
  '/scholarships',
  asyncHandler(async (req, res) => {
    const parsed = createScholarshipSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    try {
      const record = await createFeeScholarship(
        institutionId,
        {
          ...parsed.data,
          code: parsed.data.code || `SCH-${Date.now().toString(36).toUpperCase()}`,
          academicYear: parsed.data.academicYear || '2025-26',
        },
        actor(req),
      );
      return res.status(201).json({ record });
    } catch (err) {
      return handleModuleError(err, res, 'Scholarship');
    }
  }),
);

feeFinanceRouter.post(
  '/scholarships/:id/submit',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      const record = await submitScholarshipForApproval(institutionId, req.params.id);
      if (!record) return res.status(404).json({ error: 'Scholarship not found' });
      return res.json({ record });
    } catch (err) {
      return handleModuleError(err, res, 'Scholarship');
    }
  }),
);

feeFinanceRouter.post(
  '/scholarships/:id/approve',
  requireApprover,
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      const record = await approveFeeScholarship(institutionId, req.params.id, actor(req));
      if (!record) return res.status(404).json({ error: 'Scholarship not found' });
      return res.json({ record });
    } catch (err) {
      return handleModuleError(err, res, 'Scholarship');
    }
  }),
);

feeFinanceRouter.post(
  '/scholarships/:id/reject',
  requireApprover,
  asyncHandler(async (req, res) => {
    const parsed = rejectSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    try {
      const record = await rejectFeeScholarship(
        institutionId,
        req.params.id,
        actor(req),
        parsed.data.reason,
      );
      if (!record) return res.status(404).json({ error: 'Scholarship not found' });
      return res.json({ record });
    } catch (err) {
      return handleModuleError(err, res, 'Scholarship');
    }
  }),
);

// ─── Transport ────────────────────────────────────────────────────────────────

feeFinanceRouter.get(
  '/transport/summary',
  asyncHandler(async (req, res) => {
    const querySchema = z.object({
      academicYear: z.string().optional(),
    });
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    const summary = await getTransportFeeSummary(
      institutionId,
      parsed.data.academicYear || '2025-26',
    );
    return res.json(summary);
  }),
);

feeFinanceRouter.get(
  '/transport/vendors',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const records = await listTransportVendors(institutionId);
    return res.json({ records });
  }),
);

feeFinanceRouter.post(
  '/transport/vendors',
  asyncHandler(async (req, res) => {
    const parsed = createTransportVendorSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    try {
      const record = await createTransportVendor(institutionId, parsed.data);
      return res.status(201).json({ record });
    } catch (err) {
      return handleModuleError(err, res, 'Transport vendor');
    }
  }),
);

feeFinanceRouter.patch(
  '/transport/vendors/:id',
  asyncHandler(async (req, res) => {
    const parsed = updateTransportVendorSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    try {
      const record = await updateTransportVendor(institutionId, req.params.id, parsed.data);
      if (!record) return res.status(404).json({ error: 'Transport vendor not found' });
      return res.json({ record });
    } catch (err) {
      return handleModuleError(err, res, 'Transport vendor');
    }
  }),
);

feeFinanceRouter.get(
  '/transport/collections',
  asyncHandler(async (req, res) => {
    const querySchema = z.object({
      academicYear: z.string().optional(),
    });
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    const records = await listTransportFeeCollections(institutionId, parsed.data);
    return res.json({ records });
  }),
);

feeFinanceRouter.post(
  '/transport/collections',
  asyncHandler(async (req, res) => {
    const parsed = collectTransportSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    try {
      const record = await collectTransportFee(
        institutionId,
        { ...parsed.data, academicYear: parsed.data.academicYear || '2025-26' },
        actor(req),
      );
      return res.status(201).json({ record });
    } catch (err) {
      return handleModuleError(err, res, 'Transport collection');
    }
  }),
);

feeFinanceRouter.get(
  '/transport/vendor-payments',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const records = await listTransportVendorPayments(institutionId);
    return res.json({ records });
  }),
);

feeFinanceRouter.post(
  '/transport/vendor-payments',
  asyncHandler(async (req, res) => {
    const parsed = payVendorSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    try {
      const record = await payTransportVendor(institutionId, parsed.data, actor(req));
      return res.status(201).json({ record });
    } catch (err) {
      return handleModuleError(err, res, 'Transport vendor payment');
    }
  }),
);

// ─── Hostel Fee ───────────────────────────────────────────────────────────────

const createHostelCategorySchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  frequency: z.string().optional(),
  refundable: z.boolean().optional(),
  gstMode: z.enum(['CONFIGURABLE', 'NO']).optional(),
  defaultAmount: z.number().optional(),
  description: z.string().optional(),
  displayOrder: z.number().int().optional(),
  status: masterStatusSchema.optional(),
});

const updateHostelCategorySchema = createHostelCategorySchema.partial().omit({ code: true });

const collectHostelSchema = z.object({
  academicYear: z.string().optional(),
  categoryId: z.string().optional(),
  studentId: z.string().optional(),
  studentName: z.string().min(1),
  admissionNumber: z.string().optional(),
  className: z.string().optional(),
  roomNumber: z.string().optional(),
  periodLabel: z.string().optional(),
  amount: z.number().positive(),
  paymentMode: z.string().optional(),
  remarks: z.string().optional(),
});

feeFinanceRouter.get(
  '/hostel/summary',
  asyncHandler(async (req, res) => {
    const querySchema = z.object({ academicYear: z.string().optional() });
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    const summary = await getHostelFeeSummary(
      institutionId,
      parsed.data.academicYear || '2025-26',
    );
    return res.json(summary);
  }),
);

feeFinanceRouter.get(
  '/hostel/categories',
  asyncHandler(async (req, res) => {
    const querySchema = z.object({
      status: masterStatusSchema.optional(),
      ensure: z.string().optional(),
    });
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const institutionId = await getDefaultInstitutionId();
    const records =
      parsed.data.ensure === '1' || parsed.data.ensure === 'true'
        ? await ensureHostelFeeCategories(institutionId)
        : await listHostelFeeCategories(institutionId, { status: parsed.data.status });
    return res.json({ records });
  }),
);

feeFinanceRouter.post(
  '/hostel/categories/seed',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      const result = await seedHostelFeeCategories(institutionId);
      return res.json(result);
    } catch (err) {
      return handleModuleError(err, res, 'Hostel fee category');
    }
  }),
);

feeFinanceRouter.post(
  '/hostel/categories',
  asyncHandler(async (req, res) => {
    const parsed = createHostelCategorySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    try {
      const record = await createHostelFeeCategory(institutionId, parsed.data);
      return res.status(201).json({ record });
    } catch (err) {
      return handleModuleError(err, res, 'Hostel fee category');
    }
  }),
);

feeFinanceRouter.patch(
  '/hostel/categories/:id',
  asyncHandler(async (req, res) => {
    const parsed = updateHostelCategorySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    try {
      const record = await updateHostelFeeCategory(institutionId, req.params.id, parsed.data);
      return res.json({ record });
    } catch (err) {
      return handleModuleError(err, res, 'Hostel fee category');
    }
  }),
);

feeFinanceRouter.get(
  '/hostel/collections',
  asyncHandler(async (req, res) => {
    const querySchema = z.object({ academicYear: z.string().optional() });
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    const records = await listHostelFeeCollections(institutionId, parsed.data);
    return res.json({ records });
  }),
);

feeFinanceRouter.post(
  '/hostel/collections',
  asyncHandler(async (req, res) => {
    const parsed = collectHostelSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    try {
      const record = await collectHostelFee(
        institutionId,
        { ...parsed.data, academicYear: parsed.data.academicYear || '2025-26' },
        actor(req),
      );
      return res.status(201).json({ record });
    } catch (err) {
      return handleModuleError(err, res, 'Hostel fee collection');
    }
  }),
);

// ─── Other Charges ────────────────────────────────────────────────────────────

const otherChargeRequestTypeSchema = z.nativeEnum(FeeOtherChargeRequestType);

const createOtherChargeRequestSchema = z.object({
  requestType: otherChargeRequestTypeSchema,
  academicYear: z.string().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  discountType: z.string().optional(),
  value: z.number().optional(),
  settlementAmount: z.number().optional(),
  chargeTypeId: z.string().optional(),
  chargeAmount: z.number().optional(),
  code: z.string().optional(),
  studentId: z.string().optional(),
  studentName: z.string().optional(),
  admissionNumber: z.string().optional(),
  className: z.string().optional(),
  sectionName: z.string().optional(),
  remarks: z.string().optional(),
});

feeFinanceRouter.get(
  '/other-charges/summary',
  asyncHandler(async (req, res) => {
    const querySchema = z.object({ academicYear: z.string().optional() });
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    const summary = await getOtherChargesSummary(
      institutionId,
      parsed.data.academicYear || '2025-26',
    );
    return res.json(summary);
  }),
);

feeFinanceRouter.get(
  '/other-charges/types',
  asyncHandler(async (req, res) => {
    const querySchema = z.object({ ensure: z.string().optional() });
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    const records =
      parsed.data.ensure === '1' || parsed.data.ensure === 'true'
        ? await ensureOtherChargeTypes(institutionId)
        : await listOtherChargeTypes(institutionId);
    return res.json({ records });
  }),
);

feeFinanceRouter.post(
  '/other-charges/types/seed',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      const result = await seedOtherChargeTypes(institutionId);
      return res.json(result);
    } catch (err) {
      return handleModuleError(err, res, 'Other charge type');
    }
  }),
);

feeFinanceRouter.get(
  '/other-charges/requests',
  asyncHandler(async (req, res) => {
    const querySchema = z.object({
      academicYear: z.string().optional(),
      status: approvalStatusSchema.optional(),
      requestType: otherChargeRequestTypeSchema.optional(),
    });
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    const records = await listOtherChargeRequests(institutionId, parsed.data);
    return res.json({ records });
  }),
);

feeFinanceRouter.post(
  '/other-charges/requests',
  asyncHandler(async (req, res) => {
    const parsed = createOtherChargeRequestSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    try {
      const record = await createOtherChargeRequest(
        institutionId,
        { ...parsed.data, academicYear: parsed.data.academicYear || '2025-26' },
        actor(req),
      );
      return res.status(201).json({ record });
    } catch (err) {
      return handleModuleError(err, res, 'Other charge request');
    }
  }),
);

feeFinanceRouter.post(
  '/other-charges/requests/:id/submit',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      const record = await submitOtherChargeRequest(institutionId, req.params.id);
      return res.json({ record, message: 'Request sent to Principal / Center Head for approval' });
    } catch (err) {
      return handleModuleError(err, res, 'Other charge request');
    }
  }),
);

feeFinanceRouter.post(
  '/other-charges/requests/:id/approve',
  requireApprover,
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      const record = await approveOtherChargeRequest(institutionId, req.params.id, actor(req));
      return res.json({ record, message: 'Request approved by Principal / Center Head' });
    } catch (err) {
      return handleModuleError(err, res, 'Other charge request');
    }
  }),
);

feeFinanceRouter.post(
  '/other-charges/requests/:id/reject',
  requireApprover,
  asyncHandler(async (req, res) => {
    const parsed = rejectSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    try {
      const record = await rejectOtherChargeRequest(
        institutionId,
        req.params.id,
        actor(req),
        parsed.data.reason,
      );
      return res.json({ record, message: 'Request rejected' });
    } catch (err) {
      return handleModuleError(err, res, 'Other charge request');
    }
  }),
);

const feeStructureStatusSchema = z.nativeEnum(FeeStructureStatus);

const feeStructureAmountsSchema = {
  tuitionFee: z.number().optional(),
  admissionFee: z.number().optional(),
  registrationFee: z.number().optional(),
  librarySecurityDeposit: z.number().optional(),
  cautionMoney: z.number().optional(),
  computerLabFee: z.number().optional(),
  picnicFieldTrip: z.number().optional(),
  addOnFee: z.number().optional(),
  examinationFee: z.number().optional(),
  annualCharges: z.number().optional(),
  sportsFee: z.number().optional(),
};

const createFeeStructureSchema = z.object({
  academicYear: z.string().optional(),
  className: z.string().min(1),
  sectionName: z.string().optional(),
  frequency: z.string().optional(),
  studentId: z.string().optional(),
  studentName: z.string().optional(),
  admissionNumber: z.string().optional(),
  status: feeStructureStatusSchema.optional(),
  effectiveDate: z.string().optional(),
  remarks: z.string().optional(),
  ...feeStructureAmountsSchema,
});

const updateFeeStructureSchema = createFeeStructureSchema.partial().extend({
  effectiveDate: z.string().nullable().optional(),
});

const importFeeStructuresSchema = z.object({
  academicYear: z.string().optional(),
  rows: z.array(z.record(z.unknown())).min(1),
});

// ─── Online Payments ──────────────────────────────────────────────────────────

const onlinePaymentChannelSchema = z.enum(['online', 'bankTransfer', 'upi', 'pos']);

feeFinanceRouter.get(
  '/online-payments/report',
  asyncHandler(async (req, res) => {
    const querySchema = z.object({
      academicYear: z.string().optional(),
      year: z.coerce.number().optional(),
      month: z.coerce.number().min(1).max(12).optional(),
      channel: onlinePaymentChannelSchema.optional(),
    });
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    const report = await getOnlinePaymentsReport(institutionId, parsed.data);
    return res.json(report);
  }),
);

feeFinanceRouter.get(
  '/online-payments/export',
  asyncHandler(async (req, res) => {
    const querySchema = z.object({
      academicYear: z.string().optional(),
      year: z.coerce.number().optional(),
      month: z.coerce.number().min(1).max(12).optional(),
    });
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    const data = await exportOnlinePaymentsReport(institutionId, parsed.data);
    return res.json(data);
  }),
);

// ─── Payment Reconciliation ───────────────────────────────────────────────────

const reconciliationActionSchema = z.enum([
  'APPROVE',
  'REJECT',
  'RETURN_FOR_CORRECTION',
  'FREEZE',
  'SIGN',
]);

const updateReconciliationSchema = z.object({
  bankStatementTotal: z.number().optional(),
  cashCount: z.number().optional(),
  gatewaySettlement: z.number().optional(),
  cashDepositedToBank: z.number().optional(),
  cashWithdrawnFromBank: z.number().optional(),
  cashPayments: z.number().optional(),
  bankCharges: z.number().optional(),
  openingPettyCash: z.number().optional(),
  previousDayOutstanding: z.number().optional(),
  principalRequired: z.boolean().optional(),
  remarks: z.string().optional(),
});

const reconciliationWorkflowSchema = z.object({
  remarks: z.string().optional(),
  digitalSignature: z.string().optional(),
  actorRole: z.string().optional(),
  forwardToPrincipal: z.boolean().optional(),
});

feeFinanceRouter.get(
  '/reconciliation',
  asyncHandler(async (req, res) => {
    const querySchema = z.object({
      academicYear: z.string().optional(),
      limit: z.coerce.number().optional(),
    });
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    const rows = await listReconciliations(institutionId, parsed.data);
    return res.json(rows);
  }),
);

feeFinanceRouter.get(
  '/reconciliation/day',
  asyncHandler(async (req, res) => {
    const querySchema = z.object({
      date: z.string().min(1),
      academicYear: z.string().optional(),
    });
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    const data = await getOrCreateReconciliation(
      institutionId,
      parsed.data.date,
      parsed.data.academicYear,
    );
    return res.json(data);
  }),
);

feeFinanceRouter.patch(
  '/reconciliation/:id',
  asyncHandler(async (req, res) => {
    const parsed = updateReconciliationSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    try {
      const data = await updateReconciliationInputs(institutionId, req.params.id, parsed.data);
      return res.json(data);
    } catch (err) {
      return handleModuleError(err, res, 'Reconciliation');
    }
  }),
);

feeFinanceRouter.post(
  '/reconciliation/:id/submit',
  asyncHandler(async (req, res) => {
    const parsed = reconciliationWorkflowSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    try {
      const data = await submitReconciliationForApproval(
        institutionId,
        req.params.id,
        actor(req),
        parsed.data,
      );
      return res.json(data);
    } catch (err) {
      return handleModuleError(err, res, 'Reconciliation');
    }
  }),
);

feeFinanceRouter.post(
  '/reconciliation/:id/action',
  requireApprover,
  asyncHandler(async (req, res) => {
    const bodySchema = reconciliationWorkflowSchema.extend({
      action: reconciliationActionSchema,
    });
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    try {
      const data = await processReconciliationAction(
        institutionId,
        req.params.id,
        parsed.data.action,
        actor(req),
        parsed.data,
      );
      return res.json(data);
    } catch (err) {
      return handleModuleError(err, res, 'Reconciliation');
    }
  }),
);

feeFinanceRouter.get(
  '/reconciliation/:id/pdf',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      const data = await getReconciliationPdfPayload(institutionId, req.params.id);
      return res.json(data);
    } catch (err) {
      return handleModuleError(err, res, 'Reconciliation');
    }
  }),
);

// ─── Bank & Cash Book ─────────────────────────────────────────────────────────

const bankDepositStatusSchema = z.nativeEnum(BankDepositStatus);

const createCashDepositSchema = z.object({
  academicYear: z.string().optional(),
  depositDate: z.string().min(1),
  campus: z.string().optional(),
  branch: z.string().optional(),
  depositBy: z.string().optional(),
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
  depositSlipNo: z.string().optional(),
  depositAmount: z.number().positive(),
  collectionDate: z.string().min(1),
  cashCounted: z.number().optional(),
  remarks: z.string().optional(),
  slipUploadName: z.string().optional(),
});

const chequeItemSchema = z.object({
  studentName: z.string().optional(),
  receiptNumber: z.string().optional(),
  bankName: z.string().optional(),
  chequeNumber: z.string().optional(),
  chequeBankBranch: z.string().optional(),
  amount: z.number().positive(),
});

const createChequeDepositSchema = z.object({
  academicYear: z.string().optional(),
  depositDate: z.string().min(1),
  bankName: z.string().optional(),
  branch: z.string().optional(),
  depositSlipNo: z.string().optional(),
  depositBy: z.string().optional(),
  remarks: z.string().optional(),
  items: z.array(chequeItemSchema).min(1),
});

feeFinanceRouter.get(
  '/bank-cash-book/summary',
  asyncHandler(async (req, res) => {
    const parsed = filterSchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    const summary = await getBankCashBookSummary(institutionId, parsed.data.academicYear);
    return res.json(summary);
  }),
);

feeFinanceRouter.get(
  '/bank-cash-book/meta',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const meta = await getBankCashBookMeta(institutionId);
    return res.json(meta);
  }),
);

feeFinanceRouter.get(
  '/bank-cash-book/deposits',
  asyncHandler(async (req, res) => {
    const querySchema = z.object({
      academicYear: z.string().optional(),
      status: bankDepositStatusSchema.optional(),
      type: z.enum(['CASH', 'CHEQUE']).optional(),
    });
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    const rows = await listBankCashBookDeposits(institutionId, parsed.data);
    return res.json(rows);
  }),
);

feeFinanceRouter.get(
  '/bank-cash-book/history',
  asyncHandler(async (req, res) => {
    const parsed = filterSchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    const rows = await listDepositHistory(institutionId, parsed.data.academicYear);
    return res.json(rows);
  }),
);

feeFinanceRouter.get(
  '/bank-cash-book/cash-collection-preview',
  asyncHandler(async (req, res) => {
    const querySchema = z.object({
      academicYear: z.string().min(1),
      collectionDate: z.string().min(1),
    });
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    const data = await previewCashCollection(
      institutionId,
      parsed.data.academicYear,
      parsed.data.collectionDate,
    );
    return res.json(data);
  }),
);

feeFinanceRouter.post(
  '/bank-cash-book/cash-deposits',
  asyncHandler(async (req, res) => {
    const parsed = createCashDepositSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    const row = await createCashDeposit(institutionId, actor(req), parsed.data);
    return res.status(201).json(row);
  }),
);

feeFinanceRouter.post(
  '/bank-cash-book/cheque-deposits',
  asyncHandler(async (req, res) => {
    const parsed = createChequeDepositSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    const row = await createChequeDeposit(institutionId, actor(req), parsed.data);
    return res.status(201).json(row);
  }),
);

feeFinanceRouter.patch(
  '/bank-cash-book/cash-deposits/:id/approve',
  requireApprover,
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      const row = await approveCashDeposit(institutionId, req.params.id, actor(req));
      return res.json(row);
    } catch (err) {
      return handleModuleError(err, res, 'Cash deposit');
    }
  }),
);

feeFinanceRouter.patch(
  '/bank-cash-book/cheque-deposits/:id/realize',
  requireApprover,
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      const row = await realizeChequeDeposit(institutionId, req.params.id, actor(req));
      return res.json(row);
    } catch (err) {
      return handleModuleError(err, res, 'Cheque deposit');
    }
  }),
);

feeFinanceRouter.get(
  '/bank-cash-book/export',
  asyncHandler(async (req, res) => {
    const parsed = filterSchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    const data = await exportBankCashBook(institutionId, parsed.data.academicYear);
    return res.json(data);
  }),
);

feeFinanceRouter.post(
  '/bank-cash-book/import',
  asyncHandler(async (req, res) => {
    const bodySchema = z.object({ rows: z.array(z.record(z.unknown())).min(1) });
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    const result = await importBankCashBookBatch(institutionId, actor(req), parsed.data.rows);
    return res.json(result);
  }),
);

// ─── Expense Management ───────────────────────────────────────────────────────

const expenseEntryStatusSchema = z.nativeEnum(ExpenseEntryStatus);
const expensePaymentMethodSchema = z.nativeEnum(ExpensePaymentMethod);

const createExpenseEntrySchema = z.object({
  academicYear: z.string().optional(),
  expenseDate: z.string().min(1),
  categoryId: z.string().min(1),
  headId: z.string().optional(),
  department: z.string().optional(),
  campus: z.string().optional(),
  branch: z.string().optional(),
  vendorId: z.string().optional(),
  invoiceNumber: z.string().optional(),
  purchaseOrderRef: z.string().optional(),
  paymentMethod: expensePaymentMethodSchema.optional(),
  amount: z.number().positive(),
  gstAmount: z.number().optional(),
  cgst: z.number().optional(),
  sgst: z.number().optional(),
  igst: z.number().optional(),
  budgetCode: z.string().optional(),
  costCenter: z.string().optional(),
  description: z.string().optional(),
  billUploadName: z.string().optional(),
  assetType: z.string().optional(),
  assetRef: z.string().optional(),
  remarks: z.string().optional(),
  submit: z.boolean().optional(),
});

feeFinanceRouter.get(
  '/expenses/dashboard',
  asyncHandler(async (req, res) => {
    const parsed = filterSchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    const data = await getExpenseDashboard(institutionId, parsed.data.academicYear);
    return res.json(data);
  }),
);

feeFinanceRouter.get(
  '/expenses/meta',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const meta = await getExpenseMeta(institutionId);
    return res.json(meta);
  }),
);

feeFinanceRouter.post(
  '/expenses/categories/seed',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await seedExpenseCategories(institutionId);
    return res.json(result);
  }),
);

feeFinanceRouter.get(
  '/expenses/categories',
  asyncHandler(async (req, res) => {
    const querySchema = z.object({ ensure: z.string().optional() });
    const parsed = querySchema.safeParse(req.query);
    const institutionId = await getDefaultInstitutionId();
    const rows = await listExpenseCategories(institutionId, parsed.success && !!parsed.data.ensure);
    return res.json(rows);
  }),
);

feeFinanceRouter.get(
  '/expenses/entries',
  asyncHandler(async (req, res) => {
    const querySchema = z.object({
      academicYear: z.string().optional(),
      status: expenseEntryStatusSchema.optional(),
      department: z.string().optional(),
    });
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    const rows = await listExpenseEntries(institutionId, parsed.data);
    return res.json(rows);
  }),
);

feeFinanceRouter.post(
  '/expenses/entries',
  asyncHandler(async (req, res) => {
    const parsed = createExpenseEntrySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    const row = await createExpenseEntry(institutionId, actor(req), parsed.data);
    return res.status(201).json(row);
  }),
);

feeFinanceRouter.post(
  '/expenses/entries/:id/approve',
  requireApprover,
  asyncHandler(async (req, res) => {
    const bodySchema = z.object({
      action: z.enum(['APPROVE', 'REJECT', 'RETURN']),
      remarks: z.string().optional(),
      digitalSignature: z.string().optional(),
    });
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    try {
      const row = await processExpenseApproval(
        institutionId,
        req.params.id,
        parsed.data.action,
        actor(req),
        parsed.data,
      );
      return res.json(row);
    } catch (err) {
      return handleModuleError(err, res, 'Expense');
    }
  }),
);

feeFinanceRouter.patch(
  '/expenses/entries/:id/pay',
  requireApprover,
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      const row = await markExpensePaid(institutionId, req.params.id, actor(req));
      return res.json(row);
    } catch (err) {
      return handleModuleError(err, res, 'Expense');
    }
  }),
);

feeFinanceRouter.get(
  '/expenses/vendors',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const rows = await listExpenseVendors(institutionId);
    return res.json(rows);
  }),
);

feeFinanceRouter.post(
  '/expenses/vendors',
  asyncHandler(async (req, res) => {
    const bodySchema = z.object({
      vendorName: z.string().min(1),
      contactPerson: z.string().optional(),
      mobile: z.string().optional(),
      email: z.string().optional(),
      gstin: z.string().optional(),
      pan: z.string().optional(),
      bankAccount: z.string().optional(),
      bankIfsc: z.string().optional(),
      paymentTerms: z.string().optional(),
      rating: z.number().optional(),
      contractExpiry: z.string().optional(),
      amcExpiry: z.string().optional(),
      remarks: z.string().optional(),
    });
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    const row = await createExpenseVendor(institutionId, parsed.data);
    return res.status(201).json(row);
  }),
);

feeFinanceRouter.get(
  '/expenses/budgets',
  asyncHandler(async (req, res) => {
    const parsed = filterSchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    const rows = await listExpenseBudgets(institutionId, parsed.data.academicYear);
    return res.json(rows);
  }),
);

feeFinanceRouter.post(
  '/expenses/budgets',
  asyncHandler(async (req, res) => {
    const bodySchema = z.object({
      name: z.string().min(1),
      budgetType: z.string().optional(),
      academicYear: z.string().optional(),
      department: z.string().optional(),
      categoryId: z.string().optional(),
      campus: z.string().optional(),
      periodStart: z.string().min(1),
      periodEnd: z.string().min(1),
      allocatedAmount: z.number().positive(),
      alertThreshold: z.number().optional(),
      remarks: z.string().optional(),
    });
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    const rows = await createExpenseBudget(institutionId, parsed.data);
    return res.status(201).json(rows);
  }),
);

feeFinanceRouter.get(
  '/expenses/recurring',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const rows = await listExpenseRecurring(institutionId);
    return res.json(rows);
  }),
);

feeFinanceRouter.post(
  '/expenses/recurring',
  asyncHandler(async (req, res) => {
    const bodySchema = z.object({
      name: z.string().min(1),
      headId: z.string().optional(),
      vendorId: z.string().optional(),
      amount: z.number().positive(),
      frequency: z.string().optional(),
      nextDueDate: z.string().min(1),
      department: z.string().optional(),
      campus: z.string().optional(),
      paymentMethod: expensePaymentMethodSchema.optional(),
      autoCreate: z.boolean().optional(),
      remarks: z.string().optional(),
    });
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    const rows = await createExpenseRecurring(institutionId, parsed.data);
    return res.status(201).json(rows);
  }),
);

feeFinanceRouter.get(
  '/expenses/reimbursements',
  asyncHandler(async (req, res) => {
    const parsed = filterSchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    const rows = await listExpenseReimbursements(institutionId, parsed.data.academicYear);
    return res.json(rows);
  }),
);

feeFinanceRouter.post(
  '/expenses/reimbursements',
  asyncHandler(async (req, res) => {
    const bodySchema = z.object({
      academicYear: z.string().optional(),
      employeeName: z.string().min(1),
      department: z.string().optional(),
      amount: z.number().positive(),
      description: z.string().optional(),
      billUploadName: z.string().optional(),
      remarks: z.string().optional(),
    });
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    const row = await createExpenseReimbursement(institutionId, actor(req), parsed.data);
    return res.status(201).json(row);
  }),
);

feeFinanceRouter.patch(
  '/expenses/reimbursements/:id/approve',
  requireApprover,
  asyncHandler(async (req, res) => {
    const bodySchema = z.object({ action: z.enum(['APPROVE', 'REJECT']) });
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    try {
      const row = await approveExpenseReimbursement(
        institutionId,
        req.params.id,
        actor(req),
        parsed.data.action,
      );
      return res.json(row);
    } catch (err) {
      return handleModuleError(err, res, 'Reimbursement');
    }
  }),
);

feeFinanceRouter.get(
  '/expenses/reports/:type',
  asyncHandler(async (req, res) => {
    const parsed = filterSchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    const data = await generateExpenseReport(
      institutionId,
      req.params.type,
      parsed.data.academicYear,
    );
    return res.json(data);
  }),
);

feeFinanceRouter.get(
  '/expenses/export',
  asyncHandler(async (req, res) => {
    const parsed = filterSchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    const data = await exportExpenseData(institutionId, parsed.data.academicYear);
    return res.json(data);
  }),
);

// ─── Fee Collection ───────────────────────────────────────────────────────────

const feeCollectionStatusSchema = z.enum([
  'PAID',
  'COMPLETED',
  'ACTIVE',
  'PENDING',
  'DUE',
  'DRAFT',
  'APPROVED',
  'OPEN',
]);

feeFinanceRouter.get(
  '/collections/analytics',
  asyncHandler(async (req, res) => {
    const querySchema = z.object({ academicYear: z.string().optional() });
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    const analytics = await getFeeCollectionAnalytics(
      institutionId,
      parsed.data.academicYear || '2025-26',
    );
    return res.json(analytics);
  }),
);

feeFinanceRouter.get(
  '/collections/export',
  asyncHandler(async (req, res) => {
    const querySchema = z.object({ academicYear: z.string().optional() });
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    const data = await exportFeeCollectionEntries(
      institutionId,
      parsed.data.academicYear || '2025-26',
    );
    return res.json(data);
  }),
);

feeFinanceRouter.get(
  '/collections',
  asyncHandler(async (req, res) => {
    const querySchema = z.object({
      academicYear: z.string().optional(),
      q: z.string().optional(),
      status: feeCollectionStatusSchema.optional(),
      includeDues: z.string().optional(),
    });
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    const records = await listFeeCollectionEntries(institutionId, {
      ...parsed.data,
      includeDues: parsed.data.includeDues !== '0' && parsed.data.includeDues !== 'false',
    });
    return res.json({ records });
  }),
);

// ─── Fee Structure ────────────────────────────────────────────────────────────

feeFinanceRouter.get(
  '/structures/summary',
  asyncHandler(async (req, res) => {
    const querySchema = z.object({ academicYear: z.string().optional() });
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    const summary = await getFeeStructureSummary(
      institutionId,
      parsed.data.academicYear || '2025-26',
    );
    return res.json(summary);
  }),
);

feeFinanceRouter.get(
  '/structures/export',
  asyncHandler(async (req, res) => {
    const querySchema = z.object({ academicYear: z.string().optional() });
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    const data = await exportFeeStructures(institutionId, parsed.data.academicYear);
    return res.json(data);
  }),
);

feeFinanceRouter.get(
  '/structures',
  asyncHandler(async (req, res) => {
    const querySchema = z.object({
      academicYear: z.string().optional(),
      status: feeStructureStatusSchema.optional(),
      q: z.string().optional(),
      className: z.string().optional(),
      sectionName: z.string().optional(),
    });
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    const records = await listFeeStructures(institutionId, parsed.data);
    return res.json({ records });
  }),
);

feeFinanceRouter.get(
  '/structures/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      const record = await getFeeStructure(institutionId, req.params.id);
      return res.json({ record });
    } catch (err) {
      return handleModuleError(err, res, 'Fee structure');
    }
  }),
);

feeFinanceRouter.post(
  '/structures',
  asyncHandler(async (req, res) => {
    const parsed = createFeeStructureSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    try {
      const record = await createFeeStructure(
        institutionId,
        { ...parsed.data, academicYear: parsed.data.academicYear || '2025-26' },
        actor(req),
      );
      return res.status(201).json({ record });
    } catch (err) {
      return handleModuleError(err, res, 'Fee structure');
    }
  }),
);

feeFinanceRouter.patch(
  '/structures/:id',
  asyncHandler(async (req, res) => {
    const parsed = updateFeeStructureSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    try {
      const record = await updateFeeStructure(institutionId, req.params.id, parsed.data);
      return res.json({ record });
    } catch (err) {
      return handleModuleError(err, res, 'Fee structure');
    }
  }),
);

feeFinanceRouter.post(
  '/structures/import/setup',
  asyncHandler(async (req, res) => {
    const querySchema = z.object({ academicYear: z.string().optional() });
    const parsed = querySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    try {
      const result = await importFeeStructuresFromSetup(
        institutionId,
        parsed.data.academicYear || '2025-26',
        actor(req),
      );
      return res.json(result);
    } catch (err) {
      return handleModuleError(err, res, 'Fee structure import');
    }
  }),
);

feeFinanceRouter.post(
  '/structures/import',
  asyncHandler(async (req, res) => {
    const parsed = importFeeStructuresSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    try {
      const result = await importFeeStructuresBatch(
        institutionId,
        parsed.data.rows,
        parsed.data.academicYear || '2025-26',
        actor(req),
      );
      return res.json(result);
    } catch (err) {
      return handleModuleError(err, res, 'Fee structure import');
    }
  }),
);

// ─── Payroll ──────────────────────────────────────────────────────────────────

const employmentTypeSchema = z.nativeEnum(PayrollEmploymentType);
const payrollSlipStatusSchema = z.nativeEnum(PayrollSlipStatus);

const createEmployeeSchema = z.object({
  employeeCode: z.string().optional(),
  fullName: z.string().min(1),
  employmentType: employmentTypeSchema.optional(),
  department: z.string().optional(),
  designation: z.string().optional(),
  mobile: z.string().optional(),
  email: z.string().optional(),
  joinDate: z.string().optional(),
  bankAccount: z.string().optional(),
  bankIfsc: z.string().optional(),
  panNumber: z.string().optional(),
  uanNumber: z.string().optional(),
  pfNumber: z.string().optional(),
  esicNumber: z.string().optional(),
  epfApplicable: z.boolean().optional(),
  esicApplicable: z.boolean().optional(),
  remarks: z.string().optional(),
});

const updateEmployeeSchema = createEmployeeSchema.partial().extend({
  status: masterStatusSchema.optional(),
  joinDate: z.string().nullable().optional(),
});

const earningsFields = {
  basicSalary: z.number().optional(),
  hra: z.number().optional(),
  da: z.number().optional(),
  specialAllowance: z.number().optional(),
  conveyanceAllowance: z.number().optional(),
  otherAllowances: z.number().optional(),
  tds: z.number().optional(),
  otherDeductions: z.number().optional(),
  professionalTax: z.number().nullable().optional(),
  overrideEpfEmployee: z.number().nullable().optional(),
  overrideEpfEmployer: z.number().nullable().optional(),
  overrideEsicEmployee: z.number().nullable().optional(),
  overrideEsicEmployer: z.number().nullable().optional(),
};

const createStructureSchema = z.object({
  employeeId: z.string().min(1),
  structureCode: z.string().optional(),
  effectiveFrom: z.string().min(1),
  effectiveTo: z.string().optional(),
  remarks: z.string().optional(),
  deactivatePrevious: z.boolean().optional(),
  ...earningsFields,
});

const previewStructureSchema = z.object({
  employeeId: z.string().optional(),
  epfApplicable: z.boolean().optional(),
  esicApplicable: z.boolean().optional(),
  ...earningsFields,
});

const updateStatutorySchema = z.object({
  epfEmployeePercent: z.number().optional(),
  epfEmployerPercent: z.number().optional(),
  epfWageCeiling: z.number().optional(),
  esicEmployeePercent: z.number().optional(),
  esicEmployerPercent: z.number().optional(),
  esicWageCeiling: z.number().optional(),
  professionalTaxAmount: z.number().optional(),
  remarks: z.string().optional(),
});

const generateSlipsSchema = z.object({
  payPeriod: z.string().min(1),
  employeeIds: z.array(z.string()).optional(),
  workingDays: z.number().optional(),
  presentDays: z.number().optional(),
});

feeFinanceRouter.get(
  '/payroll/summary',
  asyncHandler(async (req, res) => {
    const querySchema = z.object({ payPeriod: z.string().optional() });
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    const summary = await getPayrollSummary(institutionId, parsed.data.payPeriod);
    return res.json(summary);
  }),
);

feeFinanceRouter.get(
  '/payroll/statutory',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const config = await getOrCreateStatutoryConfig(institutionId);
    return res.json({ config });
  }),
);

feeFinanceRouter.put(
  '/payroll/statutory',
  asyncHandler(async (req, res) => {
    const parsed = updateStatutorySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    try {
      const config = await updateStatutoryConfig(institutionId, parsed.data, actor(req));
      return res.json({ config, message: 'EPF / ESIC statutory rates updated' });
    } catch (err) {
      return handleModuleError(err, res, 'Statutory config');
    }
  }),
);

feeFinanceRouter.get(
  '/payroll/statutory/report',
  asyncHandler(async (req, res) => {
    const querySchema = z.object({ payPeriod: z.string().min(1) });
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    try {
      const report = await getStatutoryReport(institutionId, parsed.data.payPeriod);
      return res.json(report);
    } catch (err) {
      return handleModuleError(err, res, 'Statutory report');
    }
  }),
);

feeFinanceRouter.get(
  '/payroll/employees',
  asyncHandler(async (req, res) => {
    const querySchema = z.object({
      status: masterStatusSchema.optional(),
      employmentType: employmentTypeSchema.optional(),
      q: z.string().optional(),
    });
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    const records = await listPayrollEmployees(institutionId, parsed.data);
    return res.json({ records });
  }),
);

feeFinanceRouter.post(
  '/payroll/employees',
  asyncHandler(async (req, res) => {
    const parsed = createEmployeeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    try {
      const record = await createPayrollEmployee(institutionId, parsed.data);
      return res.status(201).json({ record });
    } catch (err) {
      return handleModuleError(err, res, 'Payroll employee');
    }
  }),
);

feeFinanceRouter.patch(
  '/payroll/employees/:id',
  asyncHandler(async (req, res) => {
    const parsed = updateEmployeeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    try {
      const record = await updatePayrollEmployee(institutionId, req.params.id, parsed.data);
      return res.json({ record });
    } catch (err) {
      return handleModuleError(err, res, 'Payroll employee');
    }
  }),
);

feeFinanceRouter.get(
  '/payroll/structures',
  asyncHandler(async (req, res) => {
    const querySchema = z.object({
      employeeId: z.string().optional(),
      status: masterStatusSchema.optional(),
    });
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    const records = await listSalaryStructures(institutionId, parsed.data);
    return res.json({ records });
  }),
);

feeFinanceRouter.post(
  '/payroll/structures/preview',
  asyncHandler(async (req, res) => {
    const parsed = previewStructureSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    const preview = await previewSalaryStructure(institutionId, parsed.data);
    return res.json({ preview });
  }),
);

feeFinanceRouter.post(
  '/payroll/structures',
  asyncHandler(async (req, res) => {
    const parsed = createStructureSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    try {
      const record = await createSalaryStructure(institutionId, parsed.data, actor(req));
      return res.status(201).json({ record });
    } catch (err) {
      return handleModuleError(err, res, 'Salary structure');
    }
  }),
);

feeFinanceRouter.get(
  '/payroll/slips',
  asyncHandler(async (req, res) => {
    const querySchema = z.object({
      payPeriod: z.string().optional(),
      status: payrollSlipStatusSchema.optional(),
      employeeId: z.string().optional(),
    });
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    const records = await listPayrollSlips(institutionId, parsed.data);
    return res.json({ records });
  }),
);

feeFinanceRouter.get(
  '/payroll/slips/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      const record = await getPayrollSlip(institutionId, req.params.id);
      return res.json({ record });
    } catch (err) {
      return handleModuleError(err, res, 'Payroll slip');
    }
  }),
);

feeFinanceRouter.post(
  '/payroll/slips/generate',
  asyncHandler(async (req, res) => {
    const parsed = generateSlipsSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const institutionId = await getDefaultInstitutionId();
    try {
      const result = await generatePayrollSlips(institutionId, parsed.data, actor(req));
      return res.status(201).json({
        ...result,
        message: `Generated ${result.created} payroll slip(s)`,
      });
    } catch (err) {
      return handleModuleError(err, res, 'Payroll slip');
    }
  }),
);

feeFinanceRouter.post(
  '/payroll/slips/:id/pay',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      const record = await markPayrollSlipPaid(institutionId, req.params.id, actor(req));
      return res.json({ record, message: 'Payroll slip marked as paid' });
    } catch (err) {
      return handleModuleError(err, res, 'Payroll slip');
    }
  }),
);

feeFinanceRouter.post(
  '/payroll/slips/:id/cancel',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    try {
      const record = await cancelPayrollSlip(institutionId, req.params.id);
      return res.json({ record, message: 'Payroll slip cancelled' });
    } catch (err) {
      return handleModuleError(err, res, 'Payroll slip');
    }
  }),
);

// ─── Accounts & Ledger ──────────────────────────────────────────────────────

feeFinanceRouter.get(
  '/accounts-ledger',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const filters = await getInstitutionFilterMeta(institutionId);
    const academicYear =
      typeof req.query.academicYear === 'string' ? req.query.academicYear : filters.defaultAcademicYear;
    const financialYear =
      typeof req.query.financialYear === 'string' ? req.query.financialYear : academicYear;
    const format = typeof req.query.format === 'string' ? req.query.format : 'json';
    const section =
      typeof req.query.section === 'string'
        ? (req.query.section as 'income' | 'balance' | 'cashflow' | 'full')
        : 'full';

    const data = await getAccountsLedger(institutionId, { academicYear, financialYear });

    if (format === 'csv') {
      const csv = accountsLedgerToCsv(data, section);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="Accounts_Ledger_${section}_${academicYear}.csv"`,
      );
      return res.send('\uFEFF' + csv);
    }

    return res.json(data);
  }),
);

// ─── Financial Reports ────────────────────────────────────────────────────────

feeFinanceRouter.get(
  '/reports/meta',
  asyncHandler(async (_req, res) => {
    return res.json({ reports: FINANCIAL_REPORT_CATALOG });
  }),
);

feeFinanceRouter.get(
  '/reports/all',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const filters = await getInstitutionFilterMeta(institutionId);
    const academicYear =
      typeof req.query.academicYear === 'string' ? req.query.academicYear : filters.defaultAcademicYear;
    const financialYear =
      typeof req.query.financialYear === 'string' ? req.query.financialYear : academicYear;
    const payPeriod = typeof req.query.payPeriod === 'string' ? req.query.payPeriod : undefined;
    const data = await generateAllFinancialReports(institutionId, {
      academicYear,
      financialYear,
      payPeriod,
    });
    return res.json(data);
  }),
);

feeFinanceRouter.get(
  '/reports/:type',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const filters = await getInstitutionFilterMeta(institutionId);
    const academicYear =
      typeof req.query.academicYear === 'string' ? req.query.academicYear : filters.defaultAcademicYear;
    const financialYear =
      typeof req.query.financialYear === 'string' ? req.query.financialYear : academicYear;
    const payPeriod = typeof req.query.payPeriod === 'string' ? req.query.payPeriod : undefined;
    const format = typeof req.query.format === 'string' ? req.query.format : 'json';

    const reportType = req.params.type as FinancialReportType;
    const valid = FINANCIAL_REPORT_CATALOG.some((r) => r.id === reportType);
    if (!valid) return res.status(404).json({ error: 'Report type not found' });

    const report = await generateFinancialReport(institutionId, reportType, {
      academicYear,
      financialYear,
      payPeriod,
    });

    if (format === 'csv') {
      const csv = reportToCsv(report);
      const safeName = reportType.replace(/-/g, '_');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="Financial_${safeName}_${academicYear}.csv"`,
      );
      return res.send('\uFEFF' + csv);
    }

    return res.json(report);
  }),
);
