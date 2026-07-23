import { api } from './api';

export type FeeDashboardMeta = {
  defaultAcademicYear: string;
  academicYears: string[];
  financialYears: string[];
  feeConfigured: boolean;
  currency: string;
};

export type FeeDashboardKpis = {
  totalFeeDue: number;
  totalCollection: number;
  pendingAmount: number;
  collectionPct: number;
  overdueAmount: number;
  totalDiscounts: number;
  studentCount: number;
  receiptCount: number;
  collectionTrendPct: number | null;
  pendingTrendPct: number | null;
};

export type FeeDashboard = {
  academicYear: string;
  financialYear: string;
  currency: string;
  feeConfigured: boolean;
  asOf: string;
  kpis: FeeDashboardKpis;
  collectionOverview: {
    period: string;
    total: number;
    items: Array<{ name: string; amount: number; value: number; color: string }>;
  };
  collectionTrend: Array<{
    month: string;
    collection: number;
    collectedAmount: number;
    percentage: number;
  }>;
  dueVsCollection: Array<{ name: string; value: number; amount: number; fill: string }>;
  installments: {
    rows: Array<{ name: string; due: number; collected: number; pending: number; progress: number }>;
    totals: { due: number; collected: number; pending: number };
  };
  topDues: {
    rows: Array<{ studentId: string; name: string; class: string; due: number }>;
    totalOverdue: number;
  };
  collectionModes: {
    items: Array<{ name: string; amount: number; value: number; color: string }>;
    total: number;
  };
  recentTransactions: Array<{
    id: string;
    title: string;
    desc: string;
    time: string;
    amount: number;
    type: string;
    receiptNumber: string;
  }>;
  reminders: {
    remindersSent: number;
    smsSent: number;
    emailSent: number;
    dueInNext7Days: number;
    dueInNext7Students: number;
  };
  cashFlow: {
    months: Array<{
      month: string;
      inflow: number;
      outflow: number;
      inflowAmount: number;
      outflowAmount: number;
    }>;
    totalInflow: number;
    totalOutflow: number;
    netCashFlow: number;
  };
  expenseSummary: {
    rows: Array<{ name: string; amount: number; percent: number }>;
    total: number;
    note?: string;
  };
  reports: string[];
};

function qs(params?: Record<string, string | undefined>) {
  if (!params) return '';
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) sp.set(k, v);
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export async function fetchFeeDashboardMeta() {
  return api<FeeDashboardMeta>('/api/fee-finance/meta');
}

export async function fetchFeeDashboard(params?: {
  academicYear?: string;
  financialYear?: string;
  overviewPeriod?: 'month' | 'year' | 'academic';
}) {
  return api<FeeDashboard>(`/api/fee-finance/dashboard${qs(params)}`);
}

export function formatInr(amount: number, opts?: { compact?: boolean }): string {
  if (!Number.isFinite(amount)) return '₹ 0';
  if (opts?.compact) {
    if (Math.abs(amount) >= 10000000) {
      return `₹ ${(amount / 10000000).toFixed(2)} Cr`;
    }
    if (Math.abs(amount) >= 100000) {
      return `₹ ${(amount / 100000).toFixed(2)} L`;
    }
  }
  return `₹ ${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function formatTrend(pct: number | null | undefined): string | null {
  if (pct == null || !Number.isFinite(pct)) return null;
  const arrow = pct >= 0 ? '↑' : '↓';
  return `${arrow} ${Math.abs(pct).toFixed(1)}% from last year`;
}

// ─── Module types ─────────────────────────────────────────────────────────────

export type FeeMasterStatus = 'ACTIVE' | 'INACTIVE';
export type FeeInvoiceStatus = 'DRAFT' | 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED';
export type FeeApprovalStatus =
  | 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'ACTIVE'
  | 'EXPIRED' | 'PROCESSED' | 'CLOSED';
export type FeeDiscountScope = 'NEW_ADMISSION' | 'EXISTING_STUDENT' | 'BOTH' | 'ACCOUNT_SETTLEMENT';
export type FeeRefundType = 'ADVANCE' | 'DEPOSIT' | 'OVERPAYMENT' | 'OTHER';
export type FeeFineCategory =
  | 'LATE_FEE' | 'LATE_EXAM_FEE' | 'PROPERTY_DAMAGE' | 'LAB_EQUIPMENT'
  | 'LIBRARY_BOOK' | 'COMPUTER_LAB' | 'OTHER';
export type FeeFineLevyStatus = 'PENDING' | 'PAID' | 'WAIVED' | 'CANCELLED';
export type TransportVendorStatus = 'ACTIVE' | 'INACTIVE' | 'EMPANELLED';

export type FeeMaster = {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  defaultAmount: number;
  isRefundable: boolean;
  isTaxable: boolean;
  displayOrder: number;
  status: FeeMasterStatus;
  showInCollection: boolean;
  showInInvoice: boolean;
  showInPayment: boolean;
  schoolDetails: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type FeeInvoiceLineItem = {
  key?: string;
  label?: string;
  amount?: number;
  [key: string]: unknown;
};

export type FeeInvoice = {
  id: string;
  invoiceNumber: string;
  academicYear: string;
  studentId: string;
  admissionNumber: string;
  studentName: string;
  className: string;
  sectionName: string;
  rollNumber: string;
  parentName: string;
  parentMobile: string;
  parentEmail: string;
  photoUrl: string;
  feePeriod: string;
  invoiceDate: string;
  dueDate: string | null;
  status: FeeInvoiceStatus;
  paymentMode: string;
  lineItems: FeeInvoiceLineItem[];
  totalFee: number;
  concessionAmount: number;
  lateFee: number;
  previousDues: number;
  netPayable: number;
  amountPaid: number;
  balance: number;
  remarks: string;
  preparedBy: string;
  verifiedBy: string;
  approvedBy: string;
  feeReceiptId: string;
  institutionSnapshot: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type FeeDiscount = {
  id: string;
  code: string;
  name: string;
  description: string;
  discountType: string;
  value: number;
  scope: FeeDiscountScope;
  academicYear: string;
  maxUses: number;
  usedCount: number;
  status: FeeApprovalStatus;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  settlementAmount: number;
  requestedBy: string;
  approvedBy: string;
  approvedAt: string | null;
  rejectionReason: string;
  remarks: string;
  createdAt: string;
  updatedAt: string;
};

export type FeeRefund = {
  id: string;
  recordId: string;
  academicYear: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  className: string;
  sectionName: string;
  refundType: FeeRefundType;
  amount: number;
  reason: string;
  status: FeeApprovalStatus;
  originalReceipt: string;
  paymentMode: string;
  requestedBy: string;
  approvedBy: string;
  approvedAt: string | null;
  processedAt: string | null;
  rejectionReason: string;
  remarks: string;
  createdAt: string;
  updatedAt: string;
};

export type FeeFineType = {
  id: string;
  code: string;
  name: string;
  category: FeeFineCategory;
  defaultAmount: number;
  description: string;
  isCustomizable: boolean;
  status: FeeMasterStatus;
  createdAt: string;
  updatedAt: string;
};

export type FeeFineLevy = {
  id: string;
  fineTypeId: string;
  fineTypeCode: string;
  fineTypeName: string;
  fineCategory: FeeFineCategory | null;
  academicYear: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  className: string;
  amount: number;
  reason: string;
  status: FeeFineLevyStatus;
  dueDate: string | null;
  collectedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FeeScholarship = {
  id: string;
  code: string;
  name: string;
  description: string;
  academicYear: string;
  waiverType: string;
  waiverValue: number;
  budgetAllocated: number;
  budgetUsed: number;
  budgetRemaining: number;
  applicableFor: string;
  status: FeeApprovalStatus;
  requestedBy: string;
  approvedBy: string;
  approvedAt: string | null;
  rejectionReason: string;
  createdAt: string;
  updatedAt: string;
};

export type FeeScholarshipAward = {
  id: string;
  scholarshipId: string;
  scholarshipCode: string;
  scholarshipName: string;
  academicYear: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  className: string;
  amount: number;
  status: FeeApprovalStatus;
  approvedBy: string;
  approvedAt: string | null;
  remarks: string;
  createdAt: string;
  updatedAt: string;
};

export type TransportVendor = {
  id: string;
  vendorCode: string;
  vendorName: string;
  contactPerson: string;
  mobile: string;
  email: string;
  address: string;
  routesCovered: string;
  vehicleCount: number;
  bankDetails: Record<string, unknown>;
  status: TransportVendorStatus;
  remarks: string;
  createdAt: string;
  updatedAt: string;
};

export type TransportFeeCollection = {
  id: string;
  receiptNumber: string;
  academicYear: string;
  monthLabel: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  className: string;
  routeName: string;
  amount: number;
  paymentMode: string;
  collectedBy: string;
  collectedAt: string;
  remarks: string;
  createdAt: string;
  updatedAt: string;
};

export type TransportVendorPayment = {
  id: string;
  vendorId: string;
  vendorCode: string;
  vendorName: string;
  paymentNumber: string;
  amount: number;
  paymentMode: string;
  paymentDate: string;
  periodLabel: string;
  remarks: string;
  paidBy: string;
  createdAt: string;
  updatedAt: string;
};

export type TransportFeeSummary = {
  academicYear: string;
  totalCollections: number;
  collectionCount: number;
  totalVendorPayments: number;
  vendorPaymentCount: number;
  vendorCount: number;
  netBalance: number;
};

// ─── Fee Masters ──────────────────────────────────────────────────────────────

export async function listFeeMasters(params?: { status?: FeeMasterStatus; q?: string }) {
  const data = await api<{ records: FeeMaster[] }>(`/api/fee-finance/masters${qs(params)}`);
  return data.records;
}

export async function seedFeeMasters() {
  return api<{ created: number; skipped: number }>('/api/fee-finance/masters/seed', { method: 'POST' });
}

export async function createFeeMaster(body: Partial<FeeMaster> & { code: string; name: string }) {
  const data = await api<{ record: FeeMaster }>('/api/fee-finance/masters', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return data.record;
}

export async function updateFeeMaster(id: string, body: Partial<FeeMaster>) {
  const data = await api<{ record: FeeMaster }>(`/api/fee-finance/masters/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return data.record;
}

// ─── Invoices ─────────────────────────────────────────────────────────────────

export async function listFeeInvoices(params?: {
  academicYear?: string;
  status?: FeeInvoiceStatus;
  q?: string;
}) {
  const data = await api<{ records: FeeInvoice[] }>(`/api/fee-finance/invoices${qs(params)}`);
  return data.records;
}

export async function getFeeInvoice(id: string) {
  const data = await api<{ record: FeeInvoice }>(`/api/fee-finance/invoices/${id}`);
  return data.record;
}

export async function createFeeInvoice(body: Record<string, unknown>) {
  const data = await api<{ record: FeeInvoice }>('/api/fee-finance/invoices', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return data.record;
}

export async function generateInvoicesFromReceipts(body?: { academicYear?: string; receiptIds?: string[] }) {
  const data = await api<{ records: FeeInvoice[] }>('/api/fee-finance/invoices/from-receipts', {
    method: 'POST',
    body: JSON.stringify(body ?? {}),
  });
  return data.records;
}

export async function updateFeeInvoiceStatus(
  id: string,
  body: {
    status: FeeInvoiceStatus;
    amountPaid?: number;
    paymentMode?: string;
    verifiedBy?: string;
    approvedBy?: string;
  },
) {
  const data = await api<{ record: FeeInvoice }>(`/api/fee-finance/invoices/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return data.record;
}

// ─── Discounts ────────────────────────────────────────────────────────────────

export async function listFeeDiscounts(params?: {
  academicYear?: string;
  status?: FeeApprovalStatus;
  scope?: FeeDiscountScope;
}) {
  const data = await api<{ records: FeeDiscount[] }>(`/api/fee-finance/discounts${qs(params)}`);
  return data.records;
}

export async function createFeeDiscount(body: Record<string, unknown>) {
  const data = await api<{ record: FeeDiscount }>('/api/fee-finance/discounts', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return data.record;
}

export async function submitFeeDiscount(id: string) {
  const data = await api<{ record: FeeDiscount }>(`/api/fee-finance/discounts/${id}/submit`, { method: 'POST' });
  return data.record;
}

export async function approveFeeDiscount(id: string) {
  const data = await api<{ record: FeeDiscount }>(`/api/fee-finance/discounts/${id}/approve`, { method: 'POST' });
  return data.record;
}

export async function rejectFeeDiscount(id: string, reason: string) {
  const data = await api<{ record: FeeDiscount }>(`/api/fee-finance/discounts/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
  return data.record;
}

// ─── Refunds ──────────────────────────────────────────────────────────────────

export async function listFeeRefunds(params?: { academicYear?: string; status?: FeeApprovalStatus }) {
  const data = await api<{ records: FeeRefund[] }>(`/api/fee-finance/refunds${qs(params)}`);
  return data.records;
}

export async function createFeeRefund(body: Record<string, unknown>) {
  const data = await api<{ record: FeeRefund }>('/api/fee-finance/refunds', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return data.record;
}

export async function approveFeeRefund(id: string) {
  const data = await api<{ record: FeeRefund }>(`/api/fee-finance/refunds/${id}/approve`, { method: 'POST' });
  return data.record;
}

export async function rejectFeeRefund(id: string, reason: string) {
  const data = await api<{ record: FeeRefund }>(`/api/fee-finance/refunds/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
  return data.record;
}

export async function processFeeRefund(id: string, body?: { paymentMode?: string }) {
  const data = await api<{ record: FeeRefund }>(`/api/fee-finance/refunds/${id}/process`, {
    method: 'POST',
    body: JSON.stringify(body ?? {}),
  });
  return data.record;
}

// ─── Fines ────────────────────────────────────────────────────────────────────

export async function listFeeFineTypes() {
  const data = await api<{ records: FeeFineType[] }>('/api/fee-finance/fines/types');
  return data.records;
}

export async function seedFeeFineTypes() {
  return api<{ created: number; skipped: number }>('/api/fee-finance/fines/types/seed', { method: 'POST' });
}

export async function createFeeFineType(body: Record<string, unknown>) {
  const data = await api<{ record: FeeFineType }>('/api/fee-finance/fines/types', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return data.record;
}

export async function updateFeeFineType(id: string, body: Record<string, unknown>) {
  const data = await api<{ record: FeeFineType }>(`/api/fee-finance/fines/types/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return data.record;
}

export async function listFeeFineLevies(params?: { academicYear?: string; status?: FeeFineLevyStatus }) {
  const data = await api<{ records: FeeFineLevy[] }>(`/api/fee-finance/fines/levies${qs(params)}`);
  return data.records;
}

export async function levyFeeFine(body: Record<string, unknown>) {
  const data = await api<{ record: FeeFineLevy }>('/api/fee-finance/fines/levies', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return data.record;
}

export async function markFinePaid(id: string) {
  const data = await api<{ record: FeeFineLevy }>(`/api/fee-finance/fines/levies/${id}/pay`, { method: 'POST' });
  return data.record;
}

export async function waiveFeeFine(id: string) {
  const data = await api<{ record: FeeFineLevy }>(`/api/fee-finance/fines/levies/${id}/waive`, { method: 'POST' });
  return data.record;
}

// ─── Scholarships ─────────────────────────────────────────────────────────────

export async function listFeeScholarships(params?: { academicYear?: string; status?: FeeApprovalStatus }) {
  const data = await api<{ records: FeeScholarship[] }>(`/api/fee-finance/scholarships${qs(params)}`);
  return data.records;
}

export async function createFeeScholarship(body: Record<string, unknown>) {
  const data = await api<{ record: FeeScholarship }>('/api/fee-finance/scholarships', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return data.record;
}

export async function submitFeeScholarship(id: string) {
  const data = await api<{ record: FeeScholarship }>(`/api/fee-finance/scholarships/${id}/submit`, { method: 'POST' });
  return data.record;
}

export async function approveFeeScholarship(id: string) {
  const data = await api<{ record: FeeScholarship }>(`/api/fee-finance/scholarships/${id}/approve`, { method: 'POST' });
  return data.record;
}

export async function rejectFeeScholarship(id: string, reason: string) {
  const data = await api<{ record: FeeScholarship }>(`/api/fee-finance/scholarships/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
  return data.record;
}

export async function listScholarshipAwards(params?: { academicYear?: string; scholarshipId?: string }) {
  const data = await api<{ records: FeeScholarshipAward[] }>(`/api/fee-finance/scholarships/awards${qs(params)}`);
  return data.records;
}

export async function awardScholarship(body: Record<string, unknown>) {
  const data = await api<{ record: FeeScholarshipAward }>('/api/fee-finance/scholarships/awards', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return data.record;
}

export async function approveScholarshipAward(id: string) {
  const data = await api<{ record: FeeScholarshipAward }>(
    `/api/fee-finance/scholarships/awards/${id}/approve`,
    { method: 'POST' },
  );
  return data.record;
}

export async function rejectScholarshipAward(id: string, reason: string) {
  const data = await api<{ record: FeeScholarshipAward }>(
    `/api/fee-finance/scholarships/awards/${id}/reject`,
    { method: 'POST', body: JSON.stringify({ reason }) },
  );
  return data.record;
}

// ─── Transport ────────────────────────────────────────────────────────────────

export async function getTransportFeeSummary(academicYear?: string) {
  return api<TransportFeeSummary>(`/api/fee-finance/transport/summary${qs({ academicYear })}`);
}

export async function listTransportVendors() {
  const data = await api<{ records: TransportVendor[] }>('/api/fee-finance/transport/vendors');
  return data.records;
}

export async function createTransportVendor(body: Record<string, unknown>) {
  const data = await api<{ record: TransportVendor }>('/api/fee-finance/transport/vendors', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return data.record;
}

export async function updateTransportVendor(id: string, body: Record<string, unknown>) {
  const data = await api<{ record: TransportVendor }>(`/api/fee-finance/transport/vendors/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return data.record;
}

export async function listTransportFeeCollections(params?: { academicYear?: string }) {
  const data = await api<{ records: TransportFeeCollection[] }>(
    `/api/fee-finance/transport/collections${qs(params)}`,
  );
  return data.records;
}

export async function collectTransportFee(body: Record<string, unknown>) {
  const data = await api<{ record: TransportFeeCollection }>('/api/fee-finance/transport/collections', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return data.record;
}

export async function listTransportVendorPayments() {
  const data = await api<{ records: TransportVendorPayment[] }>('/api/fee-finance/transport/vendor-payments');
  return data.records;
}

export async function payTransportVendor(body: Record<string, unknown>) {
  const data = await api<{ record: TransportVendorPayment }>('/api/fee-finance/transport/vendor-payments', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return data.record;
}

// ─── Hostel Fee ───────────────────────────────────────────────────────────────

export type HostelFeeCategory = {
  id: string;
  code: string;
  name: string;
  feeCategory: string;
  frequency: string;
  refundable: boolean;
  refundableLabel: string;
  gstMode: string;
  gstLabel: string;
  defaultAmount: number;
  description: string;
  displayOrder: number;
  status: FeeMasterStatus;
  createdAt: string;
  updatedAt: string;
};

export type HostelFeeCollection = {
  id: string;
  categoryId: string | null;
  categoryName: string;
  categoryCode: string;
  receiptNumber: string;
  academicYear: string;
  periodLabel: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  className: string;
  roomNumber: string;
  amount: number;
  paymentMode: string;
  collectedBy: string;
  collectedAt: string;
  remarks: string;
};

export type HostelFeeSummary = {
  academicYear: string;
  categoryCount: number;
  totalCollections: number;
  collectionCount: number;
};

export async function getHostelFeeSummary(academicYear?: string) {
  return api<HostelFeeSummary>(`/api/fee-finance/hostel/summary${qs({ academicYear })}`);
}

export async function listHostelFeeCategories(params?: { status?: FeeMasterStatus; ensure?: string }) {
  const data = await api<{ records: HostelFeeCategory[] }>(
    `/api/fee-finance/hostel/categories${qs(params)}`,
  );
  return data.records;
}

export async function seedHostelFeeCategories() {
  return api<{ created: number; skipped: number; items: HostelFeeCategory[] }>(
    '/api/fee-finance/hostel/categories/seed',
    { method: 'POST' },
  );
}

export async function createHostelFeeCategory(body: Record<string, unknown>) {
  const data = await api<{ record: HostelFeeCategory }>('/api/fee-finance/hostel/categories', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return data.record;
}

export async function updateHostelFeeCategory(id: string, body: Record<string, unknown>) {
  const data = await api<{ record: HostelFeeCategory }>(`/api/fee-finance/hostel/categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return data.record;
}

export async function listHostelFeeCollections(params?: { academicYear?: string }) {
  const data = await api<{ records: HostelFeeCollection[] }>(
    `/api/fee-finance/hostel/collections${qs(params)}`,
  );
  return data.records;
}

export async function collectHostelFee(body: Record<string, unknown>) {
  const data = await api<{ record: HostelFeeCollection }>('/api/fee-finance/hostel/collections', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return data.record;
}

// ─── Other Charges ────────────────────────────────────────────────────────────

export type FeeOtherChargeRequestType = 'NEW_ADMISSION_DISCOUNT' | 'ACCOUNT_SETTLEMENT';

export type FeeOtherChargeType = {
  id: string;
  code: string;
  name: string;
  description: string;
  defaultAmount: number;
  frequency: string;
  gstMode: string;
  gstLabel: string;
  displayOrder: number;
  status: FeeMasterStatus;
  createdAt: string;
  updatedAt: string;
};

export type FeeOtherChargeRequest = {
  id: string;
  recordId: string;
  requestType: FeeOtherChargeRequestType;
  academicYear: string;
  code: string;
  name: string;
  description: string;
  discountType: string;
  value: number;
  settlementAmount: number;
  chargeTypeId: string | null;
  chargeTypeName: string;
  chargeAmount: number;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  className: string;
  sectionName: string;
  status: FeeApprovalStatus;
  requestedBy: string;
  approvedBy: string;
  approvedAt: string | null;
  rejectionReason: string;
  remarks: string;
  createdAt: string;
  updatedAt: string;
};

export type OtherChargesSummary = {
  academicYear: string;
  typeCount: number;
  pendingApproval: number;
  activeDiscounts: number;
  approvedSettlements: number;
};

export async function getOtherChargesSummary(academicYear?: string) {
  return api<OtherChargesSummary>(`/api/fee-finance/other-charges/summary${qs({ academicYear })}`);
}

export async function listOtherChargeTypes(params?: { ensure?: string }) {
  const data = await api<{ records: FeeOtherChargeType[] }>(
    `/api/fee-finance/other-charges/types${qs(params)}`,
  );
  return data.records;
}

export async function seedOtherChargeTypes() {
  return api<{ created: number; skipped: number; items: FeeOtherChargeType[] }>(
    '/api/fee-finance/other-charges/types/seed',
    { method: 'POST' },
  );
}

export async function listOtherChargeRequests(params?: {
  academicYear?: string;
  status?: FeeApprovalStatus;
  requestType?: FeeOtherChargeRequestType;
}) {
  const data = await api<{ records: FeeOtherChargeRequest[] }>(
    `/api/fee-finance/other-charges/requests${qs(params)}`,
  );
  return data.records;
}

export async function createOtherChargeRequest(body: Record<string, unknown>) {
  const data = await api<{ record: FeeOtherChargeRequest }>('/api/fee-finance/other-charges/requests', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return data.record;
}

export async function submitOtherChargeRequest(id: string) {
  const data = await api<{ record: FeeOtherChargeRequest; message: string }>(
    `/api/fee-finance/other-charges/requests/${id}/submit`,
    { method: 'POST' },
  );
  return data;
}

export async function approveOtherChargeRequest(id: string) {
  const data = await api<{ record: FeeOtherChargeRequest; message: string }>(
    `/api/fee-finance/other-charges/requests/${id}/approve`,
    { method: 'POST' },
  );
  return data;
}

export async function rejectOtherChargeRequest(id: string, reason: string) {
  const data = await api<{ record: FeeOtherChargeRequest; message: string }>(
    `/api/fee-finance/other-charges/requests/${id}/reject`,
    { method: 'POST', body: JSON.stringify({ reason }) },
  );
  return data;
}

// ─── Payroll ──────────────────────────────────────────────────────────────────

export type PayrollEmploymentType = 'TEACHING' | 'NON_TEACHING' | 'ADMIN' | 'SUPPORT';
export type PayrollSlipStatus = 'DRAFT' | 'GENERATED' | 'PAID' | 'CANCELLED';

export type PayrollStatutoryConfig = {
  id: string;
  institutionId: string;
  epfEmployeePercent: number;
  epfEmployerPercent: number;
  epfWageCeiling: number;
  esicEmployeePercent: number;
  esicEmployerPercent: number;
  esicWageCeiling: number;
  professionalTaxAmount: number;
  remarks: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
};

export type PayrollEmployee = {
  id: string;
  employeeCode: string;
  fullName: string;
  employmentType: PayrollEmploymentType;
  department: string;
  designation: string;
  mobile: string;
  email: string;
  joinDate: string | null;
  bankAccount: string;
  bankIfsc: string;
  panNumber: string;
  uanNumber: string;
  pfNumber: string;
  esicNumber: string;
  epfApplicable: boolean;
  esicApplicable: boolean;
  status: FeeMasterStatus;
  remarks: string;
  activeGross: number;
  activeNet: number;
  hasActiveStructure: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PayrollSalaryStructure = {
  id: string;
  structureCode: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  department: string;
  designation: string;
  employmentType: PayrollEmploymentType;
  effectiveFrom: string;
  effectiveTo: string | null;
  basicSalary: number;
  hra: number;
  da: number;
  specialAllowance: number;
  conveyanceAllowance: number;
  otherAllowances: number;
  grossSalary: number;
  pfWages: number;
  epfEmployee: number;
  epfEmployer: number;
  esicEmployee: number;
  esicEmployer: number;
  professionalTax: number;
  tds: number;
  otherDeductions: number;
  totalDeductions: number;
  netSalary: number;
  status: FeeMasterStatus;
  remarks: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type PayrollSlip = {
  id: string;
  slipNumber: string;
  employeeId: string;
  structureId: string | null;
  employeeCode: string;
  employeeName: string;
  department: string;
  designation: string;
  uanNumber: string;
  pfNumber: string;
  esicNumber: string;
  bankAccount: string;
  payPeriod: string;
  payPeriodLabel: string;
  payMonth: number;
  payYear: number;
  workingDays: number;
  presentDays: number;
  leaveDays: number;
  basicSalary: number;
  hra: number;
  da: number;
  specialAllowance: number;
  conveyanceAllowance: number;
  otherAllowances: number;
  grossEarnings: number;
  epfEmployee: number;
  epfEmployer: number;
  esicEmployee: number;
  esicEmployer: number;
  professionalTax: number;
  tds: number;
  otherDeductions: number;
  totalDeductions: number;
  netPay: number;
  status: PayrollSlipStatus;
  paidAt: string | null;
  paidBy: string;
  generatedBy: string;
  remarks: string;
  createdAt: string;
  updatedAt: string;
};

export type PayrollSummary = {
  payPeriod: string | null;
  employeeCount: number;
  structureCount: number;
  slipCount: number;
  generatedCount: number;
  paidCount: number;
  totalGross: number;
  totalNet: number;
  totalDeductions: number;
  totalEpfEmployee: number;
  totalEpfEmployer: number;
  totalEpf: number;
  totalEsicEmployee: number;
  totalEsicEmployer: number;
  totalEsic: number;
  statutory: PayrollStatutoryConfig;
};

export type PayrollStatutoryReport = {
  payPeriod: string;
  rows: Array<{
    slipNumber: string;
    employeeCode: string;
    employeeName: string;
    department: string;
    uanNumber: string;
    pfNumber: string;
    esicNumber: string;
    grossEarnings: number;
    epfEmployee: number;
    epfEmployer: number;
    esicEmployee: number;
    esicEmployer: number;
    professionalTax: number;
    netPay: number;
    status: PayrollSlipStatus;
  }>;
  totals: {
    epfEmployee: number;
    epfEmployer: number;
    epfTotal: number;
    esicEmployee: number;
    esicEmployer: number;
    esicTotal: number;
    professionalTax: number;
    gross: number;
  };
};

export type SalaryPreview = {
  basicSalary: number;
  hra: number;
  da: number;
  specialAllowance: number;
  conveyanceAllowance: number;
  otherAllowances: number;
  grossSalary: number;
  pfWages: number;
  epfEmployee: number;
  epfEmployer: number;
  esicEmployee: number;
  esicEmployer: number;
  professionalTax: number;
  tds: number;
  otherDeductions: number;
  totalDeductions: number;
  netSalary: number;
};

export async function getPayrollSummary(payPeriod?: string) {
  return api<PayrollSummary>(`/api/fee-finance/payroll/summary${qs({ payPeriod })}`);
}

export async function getPayrollStatutoryConfig() {
  const data = await api<{ config: PayrollStatutoryConfig }>('/api/fee-finance/payroll/statutory');
  return data.config;
}

export async function updatePayrollStatutoryConfig(body: Record<string, unknown>) {
  return api<{ config: PayrollStatutoryConfig; message: string }>('/api/fee-finance/payroll/statutory', {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function getPayrollStatutoryReport(payPeriod: string) {
  return api<PayrollStatutoryReport>(
    `/api/fee-finance/payroll/statutory/report${qs({ payPeriod })}`,
  );
}

export async function listPayrollEmployees(params?: {
  status?: FeeMasterStatus;
  employmentType?: PayrollEmploymentType;
  q?: string;
}) {
  const data = await api<{ records: PayrollEmployee[] }>(
    `/api/fee-finance/payroll/employees${qs(params)}`,
  );
  return data.records;
}

export async function createPayrollEmployee(body: Record<string, unknown>) {
  const data = await api<{ record: PayrollEmployee }>('/api/fee-finance/payroll/employees', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return data.record;
}

export async function updatePayrollEmployee(id: string, body: Record<string, unknown>) {
  const data = await api<{ record: PayrollEmployee }>(`/api/fee-finance/payroll/employees/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return data.record;
}

export async function listPayrollSalaryStructures(params?: {
  employeeId?: string;
  status?: FeeMasterStatus;
}) {
  const data = await api<{ records: PayrollSalaryStructure[] }>(
    `/api/fee-finance/payroll/structures${qs(params)}`,
  );
  return data.records;
}

export async function previewPayrollSalaryStructure(body: Record<string, unknown>) {
  const data = await api<{ preview: SalaryPreview }>('/api/fee-finance/payroll/structures/preview', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return data.preview;
}

export async function createPayrollSalaryStructure(body: Record<string, unknown>) {
  const data = await api<{ record: PayrollSalaryStructure }>('/api/fee-finance/payroll/structures', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return data.record;
}

export async function listPayrollSlips(params?: {
  payPeriod?: string;
  status?: PayrollSlipStatus;
  employeeId?: string;
}) {
  const data = await api<{ records: PayrollSlip[] }>(
    `/api/fee-finance/payroll/slips${qs(params)}`,
  );
  return data.records;
}

export async function generatePayrollSlips(body: Record<string, unknown>) {
  return api<{
    created: number;
    skipped: Array<{ employeeCode: string; reason: string }>;
    records: PayrollSlip[];
    message: string;
  }>('/api/fee-finance/payroll/slips/generate', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function markPayrollSlipPaid(id: string) {
  return api<{ record: PayrollSlip; message: string }>(
    `/api/fee-finance/payroll/slips/${id}/pay`,
    { method: 'POST' },
  );
}

export async function cancelPayrollSlip(id: string) {
  return api<{ record: PayrollSlip; message: string }>(
    `/api/fee-finance/payroll/slips/${id}/cancel`,
    { method: 'POST' },
  );
}

// ─── Financial Reports ────────────────────────────────────────────────────────

export type FinancialReportType =
  | 'overview'
  | 'fee-collection'
  | 'fee-dues'
  | 'fee-masters'
  | 'invoices'
  | 'discounts-concessions'
  | 'refunds'
  | 'fines-penalties'
  | 'scholarships'
  | 'transport-fee'
  | 'hostel-fee'
  | 'other-charges'
  | 'payroll'
  | 'epf-esic'
  | 'collection-modes'
  | 'cash-flow';

export type FinancialReportCatalogItem = {
  id: FinancialReportType;
  tab: string;
  title: string;
  description: string;
};

export type FinancialReportPayload = {
  reportType: FinancialReportType;
  reportTitle: string;
  tab: string;
  academicYear: string;
  financialYear: string;
  payPeriod: string | null;
  generatedAt: string;
  summary: Record<string, unknown>;
  columns: { key: string; label: string }[];
  rows: Record<string, unknown>[];
};

export type FinancialReportsPack = {
  academicYear: string;
  financialYear: string;
  payPeriod: string | null;
  generatedAt: string;
  reportCount: number;
  reports: FinancialReportPayload[];
};

export async function fetchFinancialReportsMeta() {
  return api<{ reports: FinancialReportCatalogItem[] }>('/api/fee-finance/reports/meta');
}

export async function fetchFinancialReport(
  type: FinancialReportType,
  params?: { academicYear?: string; financialYear?: string; payPeriod?: string },
) {
  return api<FinancialReportPayload>(`/api/fee-finance/reports/${type}${qs(params)}`);
}

export async function fetchAllFinancialReports(params?: {
  academicYear?: string;
  financialYear?: string;
  payPeriod?: string;
}) {
  return api<FinancialReportsPack>(`/api/fee-finance/reports/all${qs(params)}`);
}

// ─── Fee Structure ────────────────────────────────────────────────────────────

export type FeeStructureStatus =
  | 'DRAFT'
  | 'OPEN'
  | 'ACTIVE'
  | 'PENDING'
  | 'DUE'
  | 'COMPLETED';

export type FeeStructureRecord = {
  id: string;
  recordId: string;
  academicYear: string;
  className: string;
  sectionName: string;
  classLabel: string;
  frequency: string;
  studentId: string;
  studentName: string;
  partyName: string;
  admissionNumber: string;
  tuitionFee: number;
  admissionFee: number;
  registrationFee: number;
  librarySecurityDeposit: number;
  cautionMoney: number;
  computerLabFee: number;
  picnicFieldTrip: number;
  addOnFee: number;
  examinationFee: number;
  annualCharges: number;
  sportsFee: number;
  totalAmount: number;
  status: FeeStructureStatus;
  effectiveDate: string | null;
  displayDate: string;
  remarks: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  feeHeads: Array<{ key: string; label: string; refundable: boolean; amount: number }>;
};

export type FeeStructureSummary = {
  academicYear: string;
  totalClasses: number;
  structuresCreated: number;
  pendingCount: number;
  activeCount: number;
  totalCollection: number;
};

export async function getFeeStructureSummary(academicYear?: string) {
  return api<FeeStructureSummary>(`/api/fee-finance/structures/summary${qs({ academicYear })}`);
}

export async function listFeeStructures(params?: {
  academicYear?: string;
  status?: FeeStructureStatus;
  q?: string;
  className?: string;
  sectionName?: string;
}) {
  const data = await api<{ records: FeeStructureRecord[] }>(
    `/api/fee-finance/structures${qs(params)}`,
  );
  return data.records;
}

export async function getFeeStructure(id: string) {
  const data = await api<{ record: FeeStructureRecord }>(`/api/fee-finance/structures/${id}`);
  return data.record;
}

export async function createFeeStructure(body: Record<string, unknown>) {
  const data = await api<{ record: FeeStructureRecord }>('/api/fee-finance/structures', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return data.record;
}

export async function updateFeeStructure(id: string, body: Record<string, unknown>) {
  const data = await api<{ record: FeeStructureRecord }>(`/api/fee-finance/structures/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return data.record;
}

export async function exportFeeStructures(academicYear?: string) {
  return api<{
    exportedAt: string;
    academicYear: string;
    count: number;
    records: FeeStructureRecord[];
    columns: string[];
  }>(`/api/fee-finance/structures/export${qs({ academicYear })}`);
}

export async function importFeeStructuresFromSetup(academicYear?: string) {
  return api<{ created: number; skipped: number; message: string }>(
    '/api/fee-finance/structures/import/setup',
    { method: 'POST', body: JSON.stringify({ academicYear }) },
  );
}

export async function importFeeStructuresBatch(rows: Record<string, unknown>[], academicYear?: string) {
  return api<{ created: number; errors: string[] }>('/api/fee-finance/structures/import', {
    method: 'POST',
    body: JSON.stringify({ rows, academicYear }),
  });
}

// ─── Fee Collection (Finance) ─────────────────────────────────────────────────

export type FeeCollectionEntryStatus =
  | 'PAID'
  | 'COMPLETED'
  | 'ACTIVE'
  | 'PENDING'
  | 'DUE'
  | 'DRAFT'
  | 'APPROVED'
  | 'OPEN';

export type FeeCollectionEntry = {
  id: string;
  recordId: string;
  source: 'receipt' | 'transport' | 'hostel' | 'due';
  studentName: string;
  admissionNumber: string;
  className: string;
  sectionName: string;
  classLabel: string;
  frequency: string;
  tuitionFee: number;
  admissionFee: number;
  registrationFee: number;
  librarySecurityDeposit: number;
  cautionMoney: number;
  computerLabFee: number;
  picnicFieldTrip: number;
  addOnFee: number;
  examinationFee: number;
  annualCharges: number;
  sportsFee: number;
  hostelFee: number;
  transportFee: number;
  totalAmount: number;
  collectedAt: string;
  displayDate: string;
  status: FeeCollectionEntryStatus;
  paymentMode: string;
  collectedBy: string;
  remarks: string;
};

export type FeeCollectionAnalytics = {
  academicYear: string;
  totalCollected: number;
  receiptCount: number;
  pendingDues: number;
  analytics: Array<{ key: string; label: string; amount: number }>;
  totals: Record<string, number>;
};

export async function getFeeCollectionAnalytics(academicYear?: string) {
  return api<FeeCollectionAnalytics>(`/api/fee-finance/collections/analytics${qs({ academicYear })}`);
}

export async function listFeeCollectionEntries(params?: {
  academicYear?: string;
  q?: string;
  status?: FeeCollectionEntryStatus;
  includeDues?: string;
}) {
  const data = await api<{ records: FeeCollectionEntry[] }>(
    `/api/fee-finance/collections${qs(params)}`,
  );
  return data.records;
}

export async function exportFeeCollectionEntries(academicYear?: string) {
  return api<{
    exportedAt: string;
    academicYear: string;
    count: number;
    records: FeeCollectionEntry[];
    columns: string[];
  }>(`/api/fee-finance/collections/export${qs({ academicYear })}`);
}

// ─── Online Payments ──────────────────────────────────────────────────────────

export type OnlinePaymentChannel = 'online' | 'bankTransfer' | 'upi' | 'pos';

export type OnlinePaymentMatrixRow = {
  category: string;
  label: string;
  online: number;
  bankTransfer: number;
  upi: number;
  pos: number;
  total: number;
};

export type OnlinePaymentsReport = {
  academicYear: string;
  period: string;
  periodLabel: string;
  year: number;
  month: number;
  transactionCount: number;
  matrix: OnlinePaymentMatrixRow[];
  columnTotals: {
    online: number;
    bankTransfer: number;
    upi: number;
    pos: number;
    total: number;
  };
  fetchedAt: string;
  channelFilter: OnlinePaymentChannel | null;
};

export async function getOnlinePaymentsReport(params?: {
  academicYear?: string;
  year?: string;
  month?: string;
  channel?: OnlinePaymentChannel;
}) {
  return api<OnlinePaymentsReport>(`/api/fee-finance/online-payments/report${qs(params)}`);
}

export async function exportOnlinePaymentsReport(params?: {
  academicYear?: string;
  year?: string;
  month?: string;
}) {
  return api<OnlinePaymentsReport>(`/api/fee-finance/online-payments/export${qs(params)}`);
}

// ─── Payment Reconciliation ───────────────────────────────────────────────────

export type PaymentReconciliationStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'RETURNED'
  | 'REJECTED'
  | 'FROZEN'
  | 'DAY_CLOSING_COMPLETED';

export type PaymentReconciliationStage =
  | 'CASHIER'
  | 'ACCOUNTS_EXECUTIVE'
  | 'ACCOUNTS_MANAGER'
  | 'FINANCE_HEAD'
  | 'PRINCIPAL_DIRECTOR'
  | 'COMPLETED';

export type PaymentReconciliationAction =
  | 'SUBMIT'
  | 'APPROVE'
  | 'REJECT'
  | 'RETURN_FOR_CORRECTION'
  | 'FREEZE'
  | 'SIGN';

export type ReconciliationReport = {
  date: string;
  academicYear: string;
  openings: Array<{ label: string; amount: number }>;
  cashMovement: Array<{ label: string; amount: number; rowType: 'item' | 'total' }>;
  bankMovement: Array<{ label: string; amount: number; rowType: 'item' | 'total' }>;
  collectionSummary: Array<{
    category: string;
    label: string;
    cash: number;
    online: number;
    cheque: number;
    bankTransfer: number;
    upi: number;
    pos: number;
    total: number;
  }>;
  reconciliationSummary: Array<{ label: string; amount: number; highlight?: boolean }>;
  systemVerification: Array<{ label: string; amount: number; highlight?: boolean }>;
  totalAvailableFunds: number;
  totals: {
    cashCollection: number;
    onlineCollection: number;
    bankTransferReceived: number;
    chequeCleared: number;
    totalCreditCollection: number;
    totalDebitPayment: number;
    closingCashInHand: number;
    closingBankBalance: number;
    erpTotalCollection: number;
    expectedBalance: number;
    actualBalance: number;
    difference: number;
  };
};

export type PaymentReconciliationRecord = {
  id: string;
  reconciliationDate: string;
  academicYear: string;
  status: PaymentReconciliationStatus;
  currentStage: PaymentReconciliationStage;
  bankStatementTotal: number;
  cashCount: number;
  gatewaySettlement: number;
  cashDepositedToBank: number;
  cashWithdrawnFromBank: number;
  cashPayments: number;
  bankCharges: number;
  openingPettyCash: number;
  previousDayOutstanding: number;
  principalRequired: boolean;
  remarks: string;
  frozenAt: string | null;
  frozenBy: string;
  completedAt: string | null;
  submittedBy: string;
  submittedAt: string | null;
  pdfGeneratedAt: string | null;
  createdAt: string;
  updatedAt: string;
  approvals: Array<{
    id: string;
    stage: PaymentReconciliationStage;
    action: PaymentReconciliationAction;
    actorName: string;
    actorRole: string;
    remarks: string;
    digitalSignature: string;
    signedAt: string;
  }>;
  report: ReconciliationReport;
  workflow: Array<{ key: PaymentReconciliationStage; label: string; order: number }>;
};

export async function listReconciliations(params?: { academicYear?: string; limit?: string }) {
  return api<PaymentReconciliationRecord[]>(`/api/fee-finance/reconciliation${qs(params)}`);
}

export async function getReconciliationDay(params: { date: string; academicYear?: string }) {
  return api<PaymentReconciliationRecord>(`/api/fee-finance/reconciliation/day${qs(params)}`);
}

export async function updateReconciliationInputs(
  id: string,
  body: Partial<{
    bankStatementTotal: number;
    cashCount: number;
    gatewaySettlement: number;
    cashDepositedToBank: number;
    cashWithdrawnFromBank: number;
    cashPayments: number;
    bankCharges: number;
    openingPettyCash: number;
    previousDayOutstanding: number;
    principalRequired: boolean;
    remarks: string;
  }>,
) {
  return api<PaymentReconciliationRecord>(`/api/fee-finance/reconciliation/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function submitReconciliationForApproval(
  id: string,
  body?: { remarks?: string; digitalSignature?: string },
) {
  return api<PaymentReconciliationRecord>(`/api/fee-finance/reconciliation/${id}/submit`, {
    method: 'POST',
    body: JSON.stringify(body || {}),
  });
}

export async function processReconciliationAction(
  id: string,
  body: {
    action: 'APPROVE' | 'REJECT' | 'RETURN_FOR_CORRECTION' | 'FREEZE' | 'SIGN';
    remarks?: string;
    digitalSignature?: string;
    actorRole?: string;
    forwardToPrincipal?: boolean;
  },
) {
  return api<PaymentReconciliationRecord>(`/api/fee-finance/reconciliation/${id}/action`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function getReconciliationPdfPayload(id: string) {
  return api<{
    institutionName: string;
    reconciliation: PaymentReconciliationRecord;
    generatedAt: string;
  }>(`/api/fee-finance/reconciliation/${id}/pdf`);
}

// ─── Bank & Cash Book ─────────────────────────────────────────────────────────

export type BankDepositStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'DEPOSITED'
  | 'REALIZED'
  | 'REJECTED';

export type BankCashBookSummary = {
  academicYear: string;
  totalChequeAmount: number;
  totalCashDeposited: number;
  totalCollectionDeposited: number;
  totalChequeRealized: number;
};

export type BankCashDeposit = {
  id: string;
  type: 'CASH';
  depositId: string;
  academicYear: string;
  depositDate: string;
  depositTime: string;
  campus: string;
  branch: string;
  cashierName: string;
  depositBy: string;
  bankName: string;
  bankAccount: string;
  depositSlipNo: string;
  depositAmount: number;
  depositType: string;
  collectionDate: string;
  totalCashCollected: number;
  cashCounted: number;
  difference: number;
  remarks: string;
  slipUploadName: string;
  status: BankDepositStatus;
  approvedBy: string;
  approvedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type BankChequeDepositItem = {
  id: string;
  studentName: string;
  receiptNumber: string;
  bankName: string;
  chequeNumber: string;
  chequeBankBranch: string;
  depositDate: string;
  amount: number;
  status: BankDepositStatus;
};

export type BankChequeDeposit = {
  id: string;
  type: 'CHEQUE';
  depositId: string;
  academicYear: string;
  depositDate: string;
  bankName: string;
  branch: string;
  depositSlipNo: string;
  depositAmount: number;
  totalCheques: number;
  depositBy: string;
  remarks: string;
  status: BankDepositStatus;
  approvedBy: string;
  approvedAt: string | null;
  realizedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  items: BankChequeDepositItem[];
};

export type BankDepositRecord = BankCashDeposit | BankChequeDeposit;

export type DepositHistoryRow = {
  id: string;
  studentName: string;
  receiptNumber: string;
  bankName: string;
  chequeNumber: string;
  depositDate: string;
  amount: number;
  status: BankDepositStatus;
  depositId: string;
};

export async function getBankCashBookSummary(academicYear?: string) {
  return api<BankCashBookSummary>(`/api/fee-finance/bank-cash-book/summary${qs({ academicYear })}`);
}

export async function fetchBankCashBookMeta() {
  return api<{
    banks: string[];
    campuses: string[];
    branches: string[];
    employees: Array<{ label: string; value: string; code: string }>;
    bankAccounts: Array<{ bank: string; account: string }>;
  }>('/api/fee-finance/bank-cash-book/meta');
}

export async function listBankCashBookDeposits(params?: {
  academicYear?: string;
  status?: BankDepositStatus;
  type?: 'CASH' | 'CHEQUE';
}) {
  return api<BankDepositRecord[]>(`/api/fee-finance/bank-cash-book/deposits${qs(params)}`);
}

export async function listDepositHistory(academicYear?: string) {
  return api<DepositHistoryRow[]>(`/api/fee-finance/bank-cash-book/history${qs({ academicYear })}`);
}

export async function previewCashCollection(academicYear: string, collectionDate: string) {
  return api<{ collectionDate: string; academicYear: string; totalCashCollected: number }>(
    `/api/fee-finance/bank-cash-book/cash-collection-preview${qs({ academicYear, collectionDate })}`,
  );
}

export async function createCashDeposit(body: {
  academicYear?: string;
  depositDate: string;
  campus?: string;
  branch?: string;
  depositBy?: string;
  bankName?: string;
  bankAccount?: string;
  depositSlipNo?: string;
  depositAmount: number;
  collectionDate: string;
  cashCounted?: number;
  remarks?: string;
  slipUploadName?: string;
}) {
  return api<BankCashDeposit>('/api/fee-finance/bank-cash-book/cash-deposits', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function createChequeDeposit(body: {
  academicYear?: string;
  depositDate: string;
  bankName?: string;
  branch?: string;
  depositSlipNo?: string;
  depositBy?: string;
  remarks?: string;
  items: Array<{
    studentName?: string;
    receiptNumber?: string;
    bankName?: string;
    chequeNumber?: string;
    chequeBankBranch?: string;
    amount: number;
  }>;
}) {
  return api<BankChequeDeposit>('/api/fee-finance/bank-cash-book/cheque-deposits', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function approveCashDeposit(id: string) {
  return api<BankCashDeposit>(`/api/fee-finance/bank-cash-book/cash-deposits/${id}/approve`, {
    method: 'PATCH',
  });
}

export async function realizeChequeDeposit(id: string) {
  return api<BankChequeDeposit>(`/api/fee-finance/bank-cash-book/cheque-deposits/${id}/realize`, {
    method: 'PATCH',
  });
}

export async function exportBankCashBook(academicYear?: string) {
  return api<{
    exportedAt: string;
    academicYear: string;
    summary: BankCashBookSummary;
    deposits: BankDepositRecord[];
    history: DepositHistoryRow[];
  }>(`/api/fee-finance/bank-cash-book/export${qs({ academicYear })}`);
}

export async function importBankCashBookBatch(rows: Array<Record<string, unknown>>) {
  return api<{ imported: number; total: number }>('/api/fee-finance/bank-cash-book/import', {
    method: 'POST',
    body: JSON.stringify({ rows }),
  });
}

// ─── Expense Management ───────────────────────────────────────────────────────

export type ExpenseEntryStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'RETURNED'
  | 'PAID';

export type ExpensePaymentMethod =
  | 'CASH'
  | 'BANK_TRANSFER'
  | 'CHEQUE'
  | 'UPI'
  | 'CARD'
  | 'ONLINE'
  | 'NEFT_RTGS';

export type ExpenseDashboard = {
  academicYear: string;
  kpis: {
    totalToday: number;
    totalMonth: number;
    totalYear: number;
    pendingApprovals: number;
    overBudgetAlerts: number;
    vendorPaymentsDue: number;
    gstPaid: number;
    outstandingBills: number;
    recurringCount: number;
    reimbursementPending: number;
  };
  budgetVsActual: Array<{
    budgetCode: string;
    name: string;
    allocated: number;
    spent: number;
    variance: number;
    utilizationPct: number;
    overBudget: boolean;
  }>;
  categoryWise: Array<{ name: string; amount: number }>;
  departmentWise: Array<{ name: string; amount: number }>;
  campusWise: Array<{ name: string; amount: number }>;
  monthlyTrend: Array<{ month: string; amount: number }>;
  cashFlowSummary: { cashOut: number; bankOut: number; totalOut: number };
  topCategories: Array<{ name: string; amount: number }>;
  overBudgetAlerts: Array<{
    budgetCode: string;
    name: string;
    allocated: number;
    spent: number;
    overBudget: boolean;
  }>;
};

export type ExpenseCategory = {
  id: string;
  code: string;
  name: string;
  groupName: string;
  heads: Array<{ id: string; code: string; name: string }>;
};

export type ExpenseEntry = {
  id: string;
  expenseId: string;
  academicYear: string;
  expenseDate: string;
  categoryId: string;
  categoryName: string;
  categoryGroup: string;
  headId: string | null;
  headName: string;
  department: string;
  campus: string;
  branch: string;
  vendorId: string | null;
  vendorName: string;
  invoiceNumber: string;
  purchaseOrderRef: string;
  paymentMethod: ExpensePaymentMethod;
  amount: number;
  gstAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalAmount: number;
  budgetCode: string;
  costCenter: string;
  description: string;
  billUploadName: string;
  status: ExpenseEntryStatus;
  currentStage: string;
  assetType: string;
  assetRef: string;
  remarks: string;
  paidAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  approvals: Array<{
    id: string;
    stage: string;
    action: string;
    actorName: string;
    remarks: string;
    digitalSignature: string;
    signedAt: string;
  }>;
};

export type ExpenseVendor = {
  id: string;
  vendorCode: string;
  vendorName: string;
  contactPerson: string;
  mobile: string;
  email: string;
  gstin: string;
  pan: string;
  bankAccount: string;
  bankIfsc: string;
  paymentTerms: string;
  outstandingBalance: number;
  rating: number;
  contractExpiry: string | null;
  amcExpiry: string | null;
  status: string;
  remarks: string;
  createdAt: string;
};

export type ExpenseBudget = {
  id: string;
  budgetCode: string;
  name: string;
  budgetType: string;
  academicYear: string;
  department: string;
  categoryId: string | null;
  categoryName: string;
  campus: string;
  periodStart: string;
  periodEnd: string;
  allocatedAmount: number;
  spentAmount: number;
  remaining: number;
  utilizationPct: number;
  overBudget: boolean;
  alertThreshold: number;
  status: string;
  remarks: string;
};

export type ExpenseRecurring = {
  id: string;
  templateCode: string;
  name: string;
  headName: string;
  vendorName: string;
  amount: number;
  frequency: string;
  nextDueDate: string;
  department: string;
  campus: string;
  paymentMethod: ExpensePaymentMethod;
  autoCreate: boolean;
  status: string;
  lastGeneratedAt: string | null;
  remarks: string;
};

export type ExpenseReimbursement = {
  id: string;
  requestId: string;
  academicYear: string;
  employeeName: string;
  department: string;
  amount: number;
  description: string;
  billUploadName: string;
  status: ExpenseEntryStatus;
  approvedBy: string;
  approvedAt: string | null;
  paidAt: string | null;
  remarks: string;
  createdBy: string;
  createdAt: string;
};

export async function getExpenseDashboard(academicYear?: string) {
  return api<ExpenseDashboard>(`/api/fee-finance/expenses/dashboard${qs({ academicYear })}`);
}

export async function fetchExpenseMeta() {
  return api<{
    departments: string[];
    campuses: string[];
    paymentMethods: string[];
    approvalStages: string[];
    budgetTypes: string[];
    recurringFrequencies: string[];
    assetTypes: string[];
  }>('/api/fee-finance/expenses/meta');
}

export async function listExpenseCategories(ensure?: boolean) {
  return api<ExpenseCategory[]>(`/api/fee-finance/expenses/categories${qs({ ensure: ensure ? '1' : undefined })}`);
}

export async function listExpenseEntries(params?: {
  academicYear?: string;
  status?: ExpenseEntryStatus;
  department?: string;
}) {
  return api<ExpenseEntry[]>(`/api/fee-finance/expenses/entries${qs(params)}`);
}

export async function createExpenseEntry(body: Record<string, unknown>) {
  return api<ExpenseEntry>('/api/fee-finance/expenses/entries', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function processExpenseApproval(
  id: string,
  body: { action: 'APPROVE' | 'REJECT' | 'RETURN'; remarks?: string; digitalSignature?: string },
) {
  return api<ExpenseEntry>(`/api/fee-finance/expenses/entries/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function markExpensePaid(id: string) {
  return api<ExpenseEntry>(`/api/fee-finance/expenses/entries/${id}/pay`, { method: 'PATCH' });
}

export async function listExpenseVendors() {
  return api<ExpenseVendor[]>('/api/fee-finance/expenses/vendors');
}

export async function createExpenseVendor(body: Record<string, unknown>) {
  return api<ExpenseVendor>('/api/fee-finance/expenses/vendors', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function listExpenseBudgets(academicYear?: string) {
  return api<ExpenseBudget[]>(`/api/fee-finance/expenses/budgets${qs({ academicYear })}`);
}

export async function createExpenseBudget(body: Record<string, unknown>) {
  return api<ExpenseBudget[]>('/api/fee-finance/expenses/budgets', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function listExpenseRecurring() {
  return api<ExpenseRecurring[]>('/api/fee-finance/expenses/recurring');
}

export async function createExpenseRecurring(body: Record<string, unknown>) {
  return api<ExpenseRecurring[]>('/api/fee-finance/expenses/recurring', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function listExpenseReimbursements(academicYear?: string) {
  return api<ExpenseReimbursement[]>(`/api/fee-finance/expenses/reimbursements${qs({ academicYear })}`);
}

export async function createExpenseReimbursement(body: Record<string, unknown>) {
  return api<ExpenseReimbursement>('/api/fee-finance/expenses/reimbursements', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function approveExpenseReimbursement(id: string, action: 'APPROVE' | 'REJECT') {
  return api<{ id: string; status: string }>(`/api/fee-finance/expenses/reimbursements/${id}/approve`, {
    method: 'PATCH',
    body: JSON.stringify({ action }),
  });
}

export async function fetchExpenseReport(type: string, academicYear?: string) {
  return api<{ title: string; rows: unknown[] }>(
    `/api/fee-finance/expenses/reports/${type}${qs({ academicYear })}`,
  );
}

export async function exportExpenseData(academicYear?: string) {
  return api<Record<string, unknown>>(`/api/fee-finance/expenses/export${qs({ academicYear })}`);
}

// ─── Accounts & Ledger ────────────────────────────────────────────────────────

export type LedgerLineItem = {
  code: string;
  name: string;
  amount: number;
  note?: string;
};

export type LedgerSection = {
  title: string;
  items: LedgerLineItem[];
  total: number;
};

export type AccountsLedger = {
  academicYear: string;
  financialYear: string;
  currency: string;
  asOf: string;
  ratios: {
    operatingMargin: number;
    currentRatio: number;
    plRatio: number;
    grossMargin: number;
  };
  incomeStatement: {
    revenue: LedgerSection;
    contraRevenue: LedgerSection;
    netRevenue: number;
    operatingExpenses: LedgerSection;
    payrollExpense: LedgerSection;
    operatingIncome: number;
    otherExpenses: LedgerSection;
    netProfit: number;
    rows: Array<{ label: string; amount: number; level: number; bold?: boolean }>;
  };
  balanceSheet: {
    assets: { current: LedgerSection; nonCurrent: LedgerSection; total: number };
    liabilities: { current: LedgerSection; nonCurrent: LedgerSection; total: number };
    equity: LedgerSection;
    totalLiabilitiesAndEquity: number;
    balanced: boolean;
    rows: Array<{ label: string; amount: number; level: number; bold?: boolean }>;
  };
  cashFlow: {
    operating: LedgerSection;
    investing: LedgerSection;
    financing: LedgerSection;
    netChange: number;
    openingBalance: number;
    closingBalance: number;
    monthly: Array<{
      month: string;
      operating: number;
      investing: number;
      financing: number;
      net: number;
    }>;
    rows: Array<{ label: string; amount: number; level: number; bold?: boolean }>;
  };
  financialReport: {
    summary: Record<string, number | string>;
    highlights: string[];
    kpis: Array<{ label: string; value: string; sub?: string }>;
  };
};

export async function fetchAccountsLedger(params?: { academicYear?: string; financialYear?: string }) {
  return api<AccountsLedger>(`/api/fee-finance/accounts-ledger${qs(params)}`);
}

export function accountsLedgerExportUrl(params?: {
  academicYear?: string;
  financialYear?: string;
  section?: 'income' | 'balance' | 'cashflow' | 'full';
}) {
  const q = new URLSearchParams();
  if (params?.academicYear) q.set('academicYear', params.academicYear);
  if (params?.financialYear) q.set('financialYear', params.financialYear);
  if (params?.section) q.set('section', params.section);
  q.set('format', 'csv');
  const query = q.toString();
  return `/api/fee-finance/accounts-ledger${query ? `?${query}` : ''}`;
}

