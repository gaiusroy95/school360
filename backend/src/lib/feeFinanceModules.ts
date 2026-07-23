import {
  FeeApprovalStatus,
  FeeDiscountScope,
  FeeFineCategory,
  FeeFineLevyStatus,
  FeeInvoiceStatus,
  FeeMasterStatus,
  FeeOtherChargeRequestType,
  FeeRefundType,
  Prisma,
  TransportVendorStatus,
} from '@prisma/client';
import { prisma } from './prisma.js';
import {
  FEE_HEAD_LABELS,
  findFeeSchedule,
  loadFeeCollectionContext,
} from './feeConfig.js';
import { getInstitutionFilterMeta } from './students.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function academicYearStart(academicYear: string): number {
  const m = academicYear.match(/^(\d{4})/);
  return m ? Number(m[1]) : new Date().getFullYear();
}

const HEAD_CATEGORY_MAP: Record<string, string> = {
  tuitionFee: 'TUITION',
  admissionFee: 'TUITION',
  registrationFee: 'TUITION',
  annualCharges: 'TUITION',
  developmentFee: 'TUITION',
  transportFee: 'TRANSPORT',
  hostelFee: 'HOSTEL',
  messFee: 'HOSTEL',
  examinationFee: 'EXAM',
  libraryFee: 'LIBRARY',
  librarySecurityDeposit: 'LIBRARY',
  computerLabFee: 'LAB',
  labFee: 'LAB',
  sportsFee: 'ACTIVITY',
  activityFee: 'ACTIVITY',
  picnicFieldTrip: 'ACTIVITY',
  addOnFee: 'ACTIVITY',
  uniformFee: 'ADMIN',
  booksStationery: 'ADMIN',
  idCardFee: 'ADMIN',
  certificateFee: 'ADMIN',
  lateFine: 'FINE',
  cautionMoney: 'OTHER',
  miscellaneous: 'OTHER',
  alumniFee: 'OTHER',
};

const EXTRA_FEE_HEADS: Record<string, { name: string; category: string }> = {
  developmentFee: { name: 'Development Fee', category: 'TUITION' },
  activityFee: { name: 'Activity Fee', category: 'ACTIVITY' },
  sportsFee: { name: 'Sports Fee', category: 'ACTIVITY' },
  labFee: { name: 'Lab Fee', category: 'LAB' },
  libraryFee: { name: 'Library Fee', category: 'LIBRARY' },
  uniformFee: { name: 'Uniform Fee', category: 'ADMIN' },
  booksStationery: { name: 'Books & Stationery', category: 'ADMIN' },
  idCardFee: { name: 'ID Card Fee', category: 'ADMIN' },
  certificateFee: { name: 'Certificate Fee', category: 'ADMIN' },
  miscellaneous: { name: 'Miscellaneous', category: 'OTHER' },
  alumniFee: { name: 'Alumni Fee', category: 'OTHER' },
  messFee: { name: 'Mess Fee', category: 'HOSTEL' },
  hostelFee: { name: 'Hostel Fee', category: 'HOSTEL' },
};

const FINE_TYPE_SEEDS: Array<{
  code: string;
  name: string;
  category: FeeFineCategory;
  defaultAmount: number;
  description: string;
}> = [
  { code: 'LATE_FEE', name: 'Late Fee', category: FeeFineCategory.LATE_FEE, defaultAmount: 100, description: 'Late payment penalty' },
  { code: 'LATE_EXAM_FEE', name: 'Late Exam Fee', category: FeeFineCategory.LATE_EXAM_FEE, defaultAmount: 200, description: 'Late examination form submission' },
  { code: 'PROPERTY_DAMAGE', name: 'Property Damage', category: FeeFineCategory.PROPERTY_DAMAGE, defaultAmount: 500, description: 'Damage to school property' },
  { code: 'LAB_EQUIPMENT', name: 'Lab Equipment Damage', category: FeeFineCategory.LAB_EQUIPMENT, defaultAmount: 300, description: 'Damage to laboratory equipment' },
  { code: 'LIBRARY_BOOK', name: 'Library Book Fine', category: FeeFineCategory.LIBRARY_BOOK, defaultAmount: 50, description: 'Late return or damage to library books' },
  { code: 'COMPUTER_LAB', name: 'Computer Lab Fine', category: FeeFineCategory.COMPUTER_LAB, defaultAmount: 250, description: 'Misuse or damage in computer lab' },
];

type LineItem = { key: string; label: string; amount: number };

function categoryForHead(code: string): string {
  return HEAD_CATEGORY_MAP[code] || 'OTHER';
}

function asJsonObject(value: Prisma.JsonValue): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function serializeFeeMaster(row: {
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
  schoolDetails: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    category: row.category,
    defaultAmount: round2(row.defaultAmount),
    isRefundable: row.isRefundable,
    isTaxable: row.isTaxable,
    displayOrder: row.displayOrder,
    status: row.status,
    showInCollection: row.showInCollection,
    showInInvoice: row.showInInvoice,
    showInPayment: row.showInPayment,
    schoolDetails: asJsonObject(row.schoolDetails),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function serializeFeeInvoice(row: {
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
  invoiceDate: Date;
  dueDate: Date | null;
  status: FeeInvoiceStatus;
  paymentMode: string;
  lineItems: Prisma.JsonValue;
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
  institutionSnapshot: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    invoiceNumber: row.invoiceNumber,
    academicYear: row.academicYear,
    studentId: row.studentId,
    admissionNumber: row.admissionNumber,
    studentName: row.studentName,
    className: row.className,
    sectionName: row.sectionName,
    rollNumber: row.rollNumber,
    parentName: row.parentName,
    parentMobile: row.parentMobile,
    parentEmail: row.parentEmail,
    photoUrl: row.photoUrl,
    feePeriod: row.feePeriod,
    invoiceDate: row.invoiceDate.toISOString().slice(0, 10),
    dueDate: row.dueDate ? row.dueDate.toISOString().slice(0, 10) : null,
    status: row.status,
    paymentMode: row.paymentMode,
    lineItems: Array.isArray(row.lineItems) ? row.lineItems : [],
    totalFee: round2(row.totalFee),
    concessionAmount: round2(row.concessionAmount),
    lateFee: round2(row.lateFee),
    previousDues: round2(row.previousDues),
    netPayable: round2(row.netPayable),
    amountPaid: round2(row.amountPaid),
    balance: round2(row.balance),
    remarks: row.remarks,
    preparedBy: row.preparedBy,
    verifiedBy: row.verifiedBy,
    approvedBy: row.approvedBy,
    feeReceiptId: row.feeReceiptId,
    institutionSnapshot: asJsonObject(row.institutionSnapshot),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function serializeFeeDiscount(row: {
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
  approvedAt: Date | null;
  rejectionReason: string;
  remarks: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    discountType: row.discountType,
    value: round2(row.value),
    scope: row.scope,
    academicYear: row.academicYear,
    maxUses: row.maxUses,
    usedCount: row.usedCount,
    status: row.status,
    studentId: row.studentId,
    studentName: row.studentName,
    admissionNumber: row.admissionNumber,
    settlementAmount: round2(row.settlementAmount),
    requestedBy: row.requestedBy,
    approvedBy: row.approvedBy,
    approvedAt: row.approvedAt?.toISOString() ?? null,
    rejectionReason: row.rejectionReason,
    remarks: row.remarks,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function serializeFeeRefund(row: {
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
  approvedAt: Date | null;
  processedAt: Date | null;
  rejectionReason: string;
  remarks: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    recordId: row.recordId,
    academicYear: row.academicYear,
    studentId: row.studentId,
    studentName: row.studentName,
    admissionNumber: row.admissionNumber,
    className: row.className,
    sectionName: row.sectionName,
    refundType: row.refundType,
    amount: round2(row.amount),
    reason: row.reason,
    status: row.status,
    originalReceipt: row.originalReceipt,
    paymentMode: row.paymentMode,
    requestedBy: row.requestedBy,
    approvedBy: row.approvedBy,
    approvedAt: row.approvedAt?.toISOString() ?? null,
    processedAt: row.processedAt?.toISOString() ?? null,
    rejectionReason: row.rejectionReason,
    remarks: row.remarks,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function serializeFeeFineType(row: {
  id: string;
  code: string;
  name: string;
  category: FeeFineCategory;
  defaultAmount: number;
  description: string;
  isCustomizable: boolean;
  status: FeeMasterStatus;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    category: row.category,
    defaultAmount: round2(row.defaultAmount),
    description: row.description,
    isCustomizable: row.isCustomizable,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function serializeFeeFineLevy(row: {
  id: string;
  fineTypeId: string;
  academicYear: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  className: string;
  amount: number;
  reason: string;
  status: FeeFineLevyStatus;
  dueDate: Date | null;
  collectedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  fineType?: { code: string; name: string; category: FeeFineCategory };
}) {
  return {
    id: row.id,
    fineTypeId: row.fineTypeId,
    fineTypeCode: row.fineType?.code ?? '',
    fineTypeName: row.fineType?.name ?? '',
    fineCategory: row.fineType?.category ?? null,
    academicYear: row.academicYear,
    studentId: row.studentId,
    studentName: row.studentName,
    admissionNumber: row.admissionNumber,
    className: row.className,
    amount: round2(row.amount),
    reason: row.reason,
    status: row.status,
    dueDate: row.dueDate ? row.dueDate.toISOString().slice(0, 10) : null,
    collectedAt: row.collectedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function serializeFeeScholarship(row: {
  id: string;
  code: string;
  name: string;
  description: string;
  academicYear: string;
  waiverType: string;
  waiverValue: number;
  budgetAllocated: number;
  budgetUsed: number;
  applicableFor: string;
  status: FeeApprovalStatus;
  requestedBy: string;
  approvedBy: string;
  approvedAt: Date | null;
  rejectionReason: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    academicYear: row.academicYear,
    waiverType: row.waiverType,
    waiverValue: round2(row.waiverValue),
    budgetAllocated: round2(row.budgetAllocated),
    budgetUsed: round2(row.budgetUsed),
    budgetRemaining: round2(Math.max(row.budgetAllocated - row.budgetUsed, 0)),
    applicableFor: row.applicableFor,
    status: row.status,
    requestedBy: row.requestedBy,
    approvedBy: row.approvedBy,
    approvedAt: row.approvedAt?.toISOString() ?? null,
    rejectionReason: row.rejectionReason,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function serializeScholarshipAward(row: {
  id: string;
  scholarshipId: string;
  academicYear: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  className: string;
  amount: number;
  status: FeeApprovalStatus;
  approvedBy: string;
  approvedAt: Date | null;
  remarks: string;
  createdAt: Date;
  updatedAt: Date;
  scholarship?: { code: string; name: string };
}) {
  return {
    id: row.id,
    scholarshipId: row.scholarshipId,
    scholarshipCode: row.scholarship?.code ?? '',
    scholarshipName: row.scholarship?.name ?? '',
    academicYear: row.academicYear,
    studentId: row.studentId,
    studentName: row.studentName,
    admissionNumber: row.admissionNumber,
    className: row.className,
    amount: round2(row.amount),
    status: row.status,
    approvedBy: row.approvedBy,
    approvedAt: row.approvedAt?.toISOString() ?? null,
    remarks: row.remarks,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function serializeTransportVendor(row: {
  id: string;
  vendorCode: string;
  vendorName: string;
  contactPerson: string;
  mobile: string;
  email: string;
  address: string;
  routesCovered: string;
  vehicleCount: number;
  bankDetails: Prisma.JsonValue;
  status: TransportVendorStatus;
  remarks: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    vendorCode: row.vendorCode,
    vendorName: row.vendorName,
    contactPerson: row.contactPerson,
    mobile: row.mobile,
    email: row.email,
    address: row.address,
    routesCovered: row.routesCovered,
    vehicleCount: row.vehicleCount,
    bankDetails: asJsonObject(row.bankDetails),
    status: row.status,
    remarks: row.remarks,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function serializeTransportCollection(row: {
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
  collectedAt: Date;
  remarks: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    receiptNumber: row.receiptNumber,
    academicYear: row.academicYear,
    monthLabel: row.monthLabel,
    studentId: row.studentId,
    studentName: row.studentName,
    admissionNumber: row.admissionNumber,
    className: row.className,
    routeName: row.routeName,
    amount: round2(row.amount),
    paymentMode: row.paymentMode,
    collectedBy: row.collectedBy,
    collectedAt: row.collectedAt.toISOString(),
    remarks: row.remarks,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function serializeVendorPayment(row: {
  id: string;
  vendorId: string;
  paymentNumber: string;
  amount: number;
  paymentMode: string;
  paymentDate: Date;
  periodLabel: string;
  remarks: string;
  paidBy: string;
  createdAt: Date;
  updatedAt: Date;
  vendor?: { vendorCode: string; vendorName: string };
}) {
  return {
    id: row.id,
    vendorId: row.vendorId,
    vendorCode: row.vendor?.vendorCode ?? '',
    vendorName: row.vendor?.vendorName ?? '',
    paymentNumber: row.paymentNumber,
    amount: round2(row.amount),
    paymentMode: row.paymentMode,
    paymentDate: row.paymentDate.toISOString().slice(0, 10),
    periodLabel: row.periodLabel,
    remarks: row.remarks,
    paidBy: row.paidBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function nextSequentialNumber(
  institutionId: string,
  prefix: string,
  year: number,
  countFn: () => Promise<number>,
): Promise<string> {
  const count = await countFn();
  for (let i = 0; i < 50; i++) {
    const candidate = `${prefix}-${year}-${String(count + i + 1).padStart(4, '0')}`;
    return candidate;
  }
  return `${prefix}-${year}-${Date.now().toString().slice(-6)}`;
}

function lineItemsFromBreakdown(breakdown: unknown): LineItem[] {
  if (!Array.isArray(breakdown)) return [];
  return breakdown
    .map((item) => {
      const row = item as { key?: string; label?: string; amount?: number };
      const key = String(row.key || '').trim();
      const amount = round2(Number(row.amount) || 0);
      if (!key || amount <= 0) return null;
      return {
        key,
        label: row.label || FEE_HEAD_LABELS[key] || key,
        amount,
      };
    })
    .filter((x): x is LineItem => x !== null);
}

async function lineItemsFromSchedule(
  institutionId: string,
  className: string,
  sectionName: string,
): Promise<LineItem[]> {
  const ctx = await loadFeeCollectionContext(institutionId);
  const schedule = findFeeSchedule(ctx.schedules, className, sectionName);
  if (schedule && schedule.heads.length > 0) {
    return schedule.heads.map((h) => ({
      key: h.key,
      label: h.label,
      amount: round2(h.amount),
    }));
  }

  const masters = await prisma.feeMaster.findMany({
    where: { institutionId, status: FeeMasterStatus.ACTIVE, defaultAmount: { gt: 0 } },
    orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
  });
  return masters.map((m) => ({
    key: m.code,
    label: m.name,
    amount: round2(m.defaultAmount),
  }));
}

function computeInvoiceTotals(
  lineItems: LineItem[],
  opts: {
    concessionAmount?: number;
    lateFee?: number;
    previousDues?: number;
    amountPaid?: number;
  } = {},
) {
  const totalFee = round2(lineItems.reduce((s, i) => s + i.amount, 0));
  const concessionAmount = round2(opts.concessionAmount ?? 0);
  const lateFee = round2(opts.lateFee ?? 0);
  const previousDues = round2(opts.previousDues ?? 0);
  const netPayable = round2(totalFee - concessionAmount + lateFee + previousDues);
  const amountPaid = round2(opts.amountPaid ?? 0);
  const balance = round2(Math.max(netPayable - amountPaid, 0));
  return { totalFee, concessionAmount, lateFee, previousDues, netPayable, amountPaid, balance };
}

function invoiceStatusFromPayment(netPayable: number, amountPaid: number): FeeInvoiceStatus {
  if (amountPaid <= 0) return FeeInvoiceStatus.PENDING;
  if (amountPaid >= netPayable) return FeeInvoiceStatus.PAID;
  return FeeInvoiceStatus.PARTIAL;
}

async function generateDiscountCode(institutionId: string): Promise<string> {
  const count = await prisma.feeDiscount.count({ where: { institutionId } });
  for (let i = 0; i < 50; i++) {
    const candidate = `DSC-${String(count + i + 1).padStart(4, '0')}`;
    const exists = await prisma.feeDiscount.findFirst({
      where: { institutionId, code: candidate },
    });
    if (!exists) return candidate;
  }
  return `DSC-${Date.now().toString().slice(-4)}`;
}

// ─── Shared ──────────────────────────────────────────────────────────────────

export async function getFeeFinanceModuleMeta(institutionId: string) {
  const [filters, ctx] = await Promise.all([
    getInstitutionFilterMeta(institutionId),
    loadFeeCollectionContext(institutionId),
  ]);
  return {
    defaultAcademicYear: filters.defaultAcademicYear,
    academicYears: filters.academicYears,
    classes: filters.classes,
    sectionsByClass: filters.sectionsByClass,
    currency: ctx.currency,
    feeConfigured: ctx.feeConfigured,
  };
}

// ─── Fee Masters ─────────────────────────────────────────────────────────────

export async function listFeeMasters(
  institutionId: string,
  opts: { status?: FeeMasterStatus; q?: string } = {},
) {
  const where: Prisma.FeeMasterWhereInput = { institutionId };
  if (opts.status) where.status = opts.status;
  if (opts.q?.trim()) {
    const q = opts.q.trim();
    where.OR = [
      { code: { contains: q, mode: 'insensitive' } },
      { name: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
    ];
  }
  const rows = await prisma.feeMaster.findMany({
    where,
    orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
  });
  return rows.map(serializeFeeMaster);
}

export async function createFeeMaster(
  institutionId: string,
  data: {
    code: string;
    name: string;
    description?: string;
    category?: string;
    defaultAmount?: number;
    isRefundable?: boolean;
    isTaxable?: boolean;
    displayOrder?: number;
    status?: FeeMasterStatus;
    showInCollection?: boolean;
    showInInvoice?: boolean;
    showInPayment?: boolean;
    schoolDetails?: Record<string, unknown>;
  },
) {
  const code = data.code?.trim();
  const name = data.name?.trim();
  if (!code) throw new Error('Fee master code is required');
  if (!name) throw new Error('Fee master name is required');

  const existing = await prisma.feeMaster.findFirst({
    where: { institutionId, code },
  });
  if (existing) throw new Error(`Fee master with code "${code}" already exists`);

  const row = await prisma.feeMaster.create({
    data: {
      institutionId,
      code,
      name,
      description: data.description ?? '',
      category: data.category ?? categoryForHead(code),
      defaultAmount: round2(data.defaultAmount ?? 0),
      isRefundable: data.isRefundable ?? false,
      isTaxable: data.isTaxable ?? false,
      displayOrder: data.displayOrder ?? 0,
      status: data.status ?? FeeMasterStatus.ACTIVE,
      showInCollection: data.showInCollection ?? true,
      showInInvoice: data.showInInvoice ?? true,
      showInPayment: data.showInPayment ?? true,
      schoolDetails: (data.schoolDetails ?? {}) as Prisma.InputJsonValue,
    },
  });
  return serializeFeeMaster(row);
}

export async function updateFeeMaster(
  institutionId: string,
  id: string,
  data: Partial<{
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
  }>,
) {
  const existing = await prisma.feeMaster.findFirst({ where: { id, institutionId } });
  if (!existing) throw new Error('Fee master not found');

  const row = await prisma.feeMaster.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name.trim() } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.category !== undefined ? { category: data.category } : {}),
      ...(data.defaultAmount !== undefined ? { defaultAmount: round2(data.defaultAmount) } : {}),
      ...(data.isRefundable !== undefined ? { isRefundable: data.isRefundable } : {}),
      ...(data.isTaxable !== undefined ? { isTaxable: data.isTaxable } : {}),
      ...(data.displayOrder !== undefined ? { displayOrder: data.displayOrder } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.showInCollection !== undefined ? { showInCollection: data.showInCollection } : {}),
      ...(data.showInInvoice !== undefined ? { showInInvoice: data.showInInvoice } : {}),
      ...(data.showInPayment !== undefined ? { showInPayment: data.showInPayment } : {}),
      ...(data.schoolDetails !== undefined
        ? { schoolDetails: data.schoolDetails as Prisma.InputJsonValue }
        : {}),
    },
  });
  return serializeFeeMaster(row);
}

export async function seedFeeMasters(institutionId: string) {
  const existing = await prisma.feeMaster.findMany({
    where: { institutionId },
    select: { code: true },
  });
  const existingCodes = new Set(existing.map((e) => e.code));
  const toCreate: Array<{
    code: string;
    name: string;
    category: string;
    displayOrder: number;
  }> = [];

  let order = 0;
  for (const [code, name] of Object.entries(FEE_HEAD_LABELS)) {
    if (!existingCodes.has(code)) {
      toCreate.push({ code, name, category: categoryForHead(code), displayOrder: order++ });
    }
  }
  for (const [code, meta] of Object.entries(EXTRA_FEE_HEADS)) {
    if (!existingCodes.has(code)) {
      toCreate.push({ code, name: meta.name, category: meta.category, displayOrder: order++ });
    }
  }

  if (toCreate.length === 0) {
    return { created: 0, skipped: existingCodes.size, items: [] as ReturnType<typeof serializeFeeMaster>[] };
  }

  await prisma.feeMaster.createMany({
    data: toCreate.map((item) => ({
      institutionId,
      code: item.code,
      name: item.name,
      category: item.category,
      displayOrder: item.displayOrder,
      status: FeeMasterStatus.ACTIVE,
    })),
  });

  const items = await listFeeMasters(institutionId);
  return { created: toCreate.length, skipped: existingCodes.size, items };
}

// ─── Invoices ────────────────────────────────────────────────────────────────

export async function generateInvoiceNumber(institutionId: string, academicYear: string) {
  const year = academicYearStart(academicYear);
  const count = await prisma.feeInvoice.count({
    where: { institutionId, academicYear },
  });
  for (let i = 0; i < 50; i++) {
    const candidate = `INV-${year}-${String(count + i + 1).padStart(4, '0')}`;
    const exists = await prisma.feeInvoice.findFirst({
      where: { institutionId, invoiceNumber: candidate },
    });
    if (!exists) return candidate;
  }
  return `INV-${year}-${Date.now().toString().slice(-6)}`;
}

export async function listFeeInvoices(
  institutionId: string,
  opts: { academicYear?: string; status?: FeeInvoiceStatus; q?: string } = {},
) {
  const where: Prisma.FeeInvoiceWhereInput = { institutionId };
  if (opts.academicYear) where.academicYear = opts.academicYear;
  if (opts.status) where.status = opts.status;
  if (opts.q?.trim()) {
    const q = opts.q.trim();
    where.OR = [
      { invoiceNumber: { contains: q, mode: 'insensitive' } },
      { studentName: { contains: q, mode: 'insensitive' } },
      { admissionNumber: { contains: q, mode: 'insensitive' } },
    ];
  }
  const rows = await prisma.feeInvoice.findMany({
    where,
    orderBy: [{ invoiceDate: 'desc' }, { createdAt: 'desc' }],
  });
  return rows.map(serializeFeeInvoice);
}

export async function getFeeInvoice(institutionId: string, id: string) {
  const row = await prisma.feeInvoice.findFirst({ where: { id, institutionId } });
  if (!row) throw new Error('Fee invoice not found');
  return serializeFeeInvoice(row);
}

export async function generateInvoiceFromReceipt(
  institutionId: string,
  feeReceiptId: string,
  opts: { preparedBy?: string } = {},
) {
  const receipt = await prisma.feeReceipt.findFirst({
    where: { id: feeReceiptId, institutionId },
  });
  if (!receipt) throw new Error('Fee receipt not found');

  const existingInvoice = await prisma.feeInvoice.findFirst({
    where: { institutionId, feeReceiptId },
  });
  if (existingInvoice) {
    return serializeFeeInvoice(existingInvoice);
  }

  const ctx = await loadFeeCollectionContext(institutionId);
  let lineItems = lineItemsFromBreakdown(receipt.feeBreakdown);
  if (lineItems.length === 0) {
    lineItems = await lineItemsFromSchedule(institutionId, receipt.className, receipt.sectionName);
  }

  const totals = computeInvoiceTotals(lineItems, { amountPaid: receipt.amountPaid });
  const invoiceNumber = await generateInvoiceNumber(institutionId, receipt.academicYear);
  const status = invoiceStatusFromPayment(totals.netPayable, totals.amountPaid);

  const row = await prisma.feeInvoice.create({
    data: {
      institutionId,
      invoiceNumber,
      academicYear: receipt.academicYear,
      studentName: receipt.studentName,
      admissionNumber: receipt.admissionNumber,
      className: receipt.className,
      sectionName: receipt.sectionName,
      lineItems: lineItems as unknown as Prisma.InputJsonValue,
      totalFee: totals.totalFee,
      netPayable: totals.netPayable,
      amountPaid: totals.amountPaid,
      balance: totals.balance,
      status,
      paymentMode: receipt.paymentMode,
      preparedBy: opts.preparedBy ?? receipt.collectedBy,
      feeReceiptId: receipt.id,
      institutionSnapshot: {
        ...ctx.institutionProfile,
        generatedFrom: 'receipt',
      } as Prisma.InputJsonValue,
    },
  });
  return serializeFeeInvoice(row);
}

export async function generateInvoicesFromReceipts(
  institutionId: string,
  opts: { academicYear?: string; preparedBy?: string } = {},
) {
  const receiptWhere: Prisma.FeeReceiptWhereInput = { institutionId };
  if (opts.academicYear) receiptWhere.academicYear = opts.academicYear;

  const receipts = await prisma.feeReceipt.findMany({
    where: receiptWhere,
    orderBy: { collectedAt: 'asc' },
  });

  const invoicedReceiptIds = new Set(
    (
      await prisma.feeInvoice.findMany({
        where: {
          institutionId,
          feeReceiptId: { not: '' },
          ...(opts.academicYear ? { academicYear: opts.academicYear } : {}),
        },
        select: { feeReceiptId: true },
      })
    ).map((i) => i.feeReceiptId),
  );

  const results = [];
  for (const receipt of receipts) {
    if (invoicedReceiptIds.has(receipt.id)) continue;
    const invoice = await generateInvoiceFromReceipt(institutionId, receipt.id, {
      preparedBy: opts.preparedBy,
    });
    results.push(invoice);
  }
  return { created: results.length, invoices: results };
}

export async function createFeeInvoice(
  institutionId: string,
  data: {
    academicYear: string;
    studentName: string;
    studentId?: string;
    admissionNumber?: string;
    className?: string;
    sectionName?: string;
    rollNumber?: string;
    parentName?: string;
    parentMobile?: string;
    parentEmail?: string;
    photoUrl?: string;
    feePeriod?: string;
    invoiceDate?: string | Date;
    dueDate?: string | Date | null;
    lineItems?: LineItem[];
    concessionAmount?: number;
    lateFee?: number;
    previousDues?: number;
    amountPaid?: number;
    remarks?: string;
    preparedBy?: string;
    status?: FeeInvoiceStatus;
  },
) {
  const studentName = data.studentName?.trim();
  if (!studentName) throw new Error('Student name is required');
  if (!data.academicYear?.trim()) throw new Error('Academic year is required');

  const ctx = await loadFeeCollectionContext(institutionId);
  let lineItems = (data.lineItems || []).map((i) => ({
    key: i.key,
    label: i.label || FEE_HEAD_LABELS[i.key] || i.key,
    amount: round2(i.amount),
  }));

  if (lineItems.length === 0 && data.className) {
    lineItems = await lineItemsFromSchedule(
      institutionId,
      data.className,
      data.sectionName || '',
    );
  }
  if (lineItems.length === 0) throw new Error('At least one line item is required');

  const totals = computeInvoiceTotals(lineItems, {
    concessionAmount: data.concessionAmount,
    lateFee: data.lateFee,
    previousDues: data.previousDues,
    amountPaid: data.amountPaid,
  });

  const status =
    data.status ??
    (data.amountPaid !== undefined
      ? invoiceStatusFromPayment(totals.netPayable, totals.amountPaid)
      : FeeInvoiceStatus.PENDING);

  const invoiceNumber = await generateInvoiceNumber(institutionId, data.academicYear);

  const row = await prisma.feeInvoice.create({
    data: {
      institutionId,
      invoiceNumber,
      academicYear: data.academicYear,
      studentId: data.studentId ?? '',
      studentName,
      admissionNumber: data.admissionNumber ?? '',
      className: data.className ?? '',
      sectionName: data.sectionName ?? '',
      rollNumber: data.rollNumber ?? '',
      parentName: data.parentName ?? '',
      parentMobile: data.parentMobile ?? '',
      parentEmail: data.parentEmail ?? '',
      photoUrl: data.photoUrl ?? '',
      feePeriod: data.feePeriod ?? '',
      invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : new Date(),
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      status,
      lineItems: lineItems as unknown as Prisma.InputJsonValue,
      totalFee: totals.totalFee,
      concessionAmount: totals.concessionAmount,
      lateFee: totals.lateFee,
      previousDues: totals.previousDues,
      netPayable: totals.netPayable,
      amountPaid: totals.amountPaid,
      balance: totals.balance,
      remarks: data.remarks ?? '',
      preparedBy: data.preparedBy ?? '',
      institutionSnapshot: ctx.institutionProfile as unknown as Prisma.InputJsonValue,
    },
  });
  return serializeFeeInvoice(row);
}

export async function updateInvoiceStatus(
  institutionId: string,
  id: string,
  status: FeeInvoiceStatus,
  opts: {
    amountPaid?: number;
    paymentMode?: string;
    verifiedBy?: string;
    approvedBy?: string;
  } = {},
) {
  const existing = await prisma.feeInvoice.findFirst({ where: { id, institutionId } });
  if (!existing) throw new Error('Fee invoice not found');

  const amountPaid = opts.amountPaid !== undefined ? round2(opts.amountPaid) : existing.amountPaid;
  const balance = round2(Math.max(existing.netPayable - amountPaid, 0));

  let resolvedStatus = status;
  if (opts.amountPaid !== undefined && status === FeeInvoiceStatus.PENDING) {
    resolvedStatus = invoiceStatusFromPayment(existing.netPayable, amountPaid);
  }

  const row = await prisma.feeInvoice.update({
    where: { id },
    data: {
      status: resolvedStatus,
      amountPaid,
      balance,
      ...(opts.paymentMode !== undefined ? { paymentMode: opts.paymentMode } : {}),
      ...(opts.verifiedBy !== undefined ? { verifiedBy: opts.verifiedBy } : {}),
      ...(opts.approvedBy !== undefined ? { approvedBy: opts.approvedBy } : {}),
    },
  });
  return serializeFeeInvoice(row);
}

// ─── Discounts ───────────────────────────────────────────────────────────────

export async function listFeeDiscounts(
  institutionId: string,
  opts: { academicYear?: string; status?: FeeApprovalStatus; scope?: FeeDiscountScope } = {},
) {
  const where: Prisma.FeeDiscountWhereInput = { institutionId };
  if (opts.academicYear) where.academicYear = opts.academicYear;
  if (opts.status) where.status = opts.status;
  if (opts.scope) where.scope = opts.scope;
  const rows = await prisma.feeDiscount.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(serializeFeeDiscount);
}

export async function createFeeDiscount(
  institutionId: string,
  data: {
    name: string;
    description?: string;
    discountType?: string;
    value?: number;
    scope?: FeeDiscountScope;
    academicYear: string;
    maxUses?: number;
    studentId?: string;
    studentName?: string;
    admissionNumber?: string;
    settlementAmount?: number;
    remarks?: string;
    code?: string;
  },
  requestedBy: string,
) {
  const name = data.name?.trim();
  if (!name) throw new Error('Discount name is required');
  if (!data.academicYear?.trim()) throw new Error('Academic year is required');

  const scope = data.scope ?? FeeDiscountScope.NEW_ADMISSION;
  if (scope === FeeDiscountScope.ACCOUNT_SETTLEMENT && !data.studentName?.trim()) {
    throw new Error('Student name is required for account settlement discounts');
  }

  const code =
    data.code?.trim() ||
    (scope === FeeDiscountScope.ACCOUNT_SETTLEMENT
      ? `STL-${Date.now().toString().slice(-8)}`
      : await generateDiscountCode(institutionId));

  const existing = await prisma.feeDiscount.findFirst({
    where: { institutionId, code },
  });
  if (existing) throw new Error(`Discount code "${code}" already exists`);

  const row = await prisma.feeDiscount.create({
    data: {
      institutionId,
      code,
      name,
      description: data.description ?? '',
      discountType: data.discountType ?? 'PERCENTAGE',
      value: round2(data.value ?? 0),
      scope,
      academicYear: data.academicYear,
      maxUses: data.maxUses ?? 0,
      studentId: data.studentId ?? '',
      studentName: data.studentName ?? '',
      admissionNumber: data.admissionNumber ?? '',
      settlementAmount: round2(data.settlementAmount ?? 0),
      requestedBy,
      status: FeeApprovalStatus.DRAFT,
      remarks: data.remarks ?? '',
    },
  });
  return serializeFeeDiscount(row);
}

export async function submitDiscountForApproval(institutionId: string, id: string) {
  const existing = await prisma.feeDiscount.findFirst({ where: { id, institutionId } });
  if (!existing) throw new Error('Fee discount not found');
  if (existing.status !== FeeApprovalStatus.DRAFT) {
    throw new Error('Only draft discounts can be submitted for approval');
  }
  const row = await prisma.feeDiscount.update({
    where: { id },
    data: { status: FeeApprovalStatus.PENDING_APPROVAL },
  });
  return serializeFeeDiscount(row);
}

export async function approveFeeDiscount(institutionId: string, id: string, approvedBy: string) {
  const existing = await prisma.feeDiscount.findFirst({ where: { id, institutionId } });
  if (!existing) throw new Error('Fee discount not found');
  if (existing.status !== FeeApprovalStatus.PENDING_APPROVAL) {
    throw new Error('Only pending discounts can be approved');
  }

  const newStatus =
    existing.scope === FeeDiscountScope.ACCOUNT_SETTLEMENT
      ? FeeApprovalStatus.APPROVED
      : FeeApprovalStatus.ACTIVE;

  const row = await prisma.feeDiscount.update({
    where: { id },
    data: {
      status: newStatus,
      approvedBy,
      approvedAt: new Date(),
      rejectionReason: '',
    },
  });
  return serializeFeeDiscount(row);
}

export async function rejectFeeDiscount(
  institutionId: string,
  id: string,
  approvedBy: string,
  reason: string,
) {
  const existing = await prisma.feeDiscount.findFirst({ where: { id, institutionId } });
  if (!existing) throw new Error('Fee discount not found');
  if (existing.status !== FeeApprovalStatus.PENDING_APPROVAL) {
    throw new Error('Only pending discounts can be rejected');
  }
  const row = await prisma.feeDiscount.update({
    where: { id },
    data: {
      status: FeeApprovalStatus.REJECTED,
      approvedBy,
      approvedAt: new Date(),
      rejectionReason: reason?.trim() || 'Rejected',
    },
  });
  return serializeFeeDiscount(row);
}

// ─── Refunds ─────────────────────────────────────────────────────────────────

async function generateRefundRecordId(institutionId: string, academicYear: string) {
  const year = academicYearStart(academicYear);
  return nextSequentialNumber(institutionId, 'REF', year, () =>
    prisma.feeRefund.count({ where: { institutionId, academicYear } }),
  );
}

export async function listFeeRefunds(
  institutionId: string,
  opts: { academicYear?: string; status?: FeeApprovalStatus } = {},
) {
  const where: Prisma.FeeRefundWhereInput = { institutionId };
  if (opts.academicYear) where.academicYear = opts.academicYear;
  if (opts.status) where.status = opts.status;
  const rows = await prisma.feeRefund.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(serializeFeeRefund);
}

export async function createFeeRefund(
  institutionId: string,
  data: {
    academicYear: string;
    studentName: string;
    amount: number;
    studentId?: string;
    admissionNumber?: string;
    className?: string;
    sectionName?: string;
    refundType?: FeeRefundType;
    reason?: string;
    originalReceipt?: string;
    remarks?: string;
  },
  requestedBy: string,
) {
  const studentName = data.studentName?.trim();
  if (!studentName) throw new Error('Student name is required');
  if (!data.academicYear?.trim()) throw new Error('Academic year is required');
  const amount = round2(data.amount);
  if (amount <= 0) throw new Error('Refund amount must be greater than zero');

  const recordId = await generateRefundRecordId(institutionId, data.academicYear);

  const row = await prisma.feeRefund.create({
    data: {
      institutionId,
      recordId,
      academicYear: data.academicYear,
      studentId: data.studentId ?? '',
      studentName,
      admissionNumber: data.admissionNumber ?? '',
      className: data.className ?? '',
      sectionName: data.sectionName ?? '',
      refundType: data.refundType ?? FeeRefundType.ADVANCE,
      amount,
      reason: data.reason ?? '',
      originalReceipt: data.originalReceipt ?? '',
      requestedBy,
      status: FeeApprovalStatus.PENDING_APPROVAL,
      remarks: data.remarks ?? '',
    },
  });
  return serializeFeeRefund(row);
}

export async function approveFeeRefund(institutionId: string, id: string, approvedBy: string) {
  const existing = await prisma.feeRefund.findFirst({ where: { id, institutionId } });
  if (!existing) throw new Error('Fee refund not found');
  if (existing.status !== FeeApprovalStatus.PENDING_APPROVAL) {
    throw new Error('Only pending refunds can be approved');
  }
  const row = await prisma.feeRefund.update({
    where: { id },
    data: {
      status: FeeApprovalStatus.APPROVED,
      approvedBy,
      approvedAt: new Date(),
      rejectionReason: '',
    },
  });
  return serializeFeeRefund(row);
}

export async function rejectFeeRefund(
  institutionId: string,
  id: string,
  approvedBy: string,
  reason: string,
) {
  const existing = await prisma.feeRefund.findFirst({ where: { id, institutionId } });
  if (!existing) throw new Error('Fee refund not found');
  if (existing.status !== FeeApprovalStatus.PENDING_APPROVAL) {
    throw new Error('Only pending refunds can be rejected');
  }
  const row = await prisma.feeRefund.update({
    where: { id },
    data: {
      status: FeeApprovalStatus.REJECTED,
      approvedBy,
      approvedAt: new Date(),
      rejectionReason: reason?.trim() || 'Rejected',
    },
  });
  return serializeFeeRefund(row);
}

export async function processFeeRefund(
  institutionId: string,
  id: string,
  opts: { paymentMode?: string } = {},
) {
  const existing = await prisma.feeRefund.findFirst({ where: { id, institutionId } });
  if (!existing) throw new Error('Fee refund not found');
  if (existing.status !== FeeApprovalStatus.APPROVED) {
    throw new Error('Only approved refunds can be processed');
  }
  const row = await prisma.feeRefund.update({
    where: { id },
    data: {
      status: FeeApprovalStatus.PROCESSED,
      paymentMode: opts.paymentMode ?? 'BANK_TRANSFER',
      processedAt: new Date(),
    },
  });
  return serializeFeeRefund(row);
}

// ─── Fine / Penalties ────────────────────────────────────────────────────────

export async function listFeeFineTypes(institutionId: string) {
  const rows = await prisma.feeFineType.findMany({
    where: { institutionId },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  });
  return rows.map(serializeFeeFineType);
}

export async function createFeeFineType(
  institutionId: string,
  data: {
    code: string;
    name: string;
    category?: FeeFineCategory;
    defaultAmount?: number;
    description?: string;
    isCustomizable?: boolean;
    status?: FeeMasterStatus;
  },
) {
  const code = data.code?.trim();
  const name = data.name?.trim();
  if (!code) throw new Error('Fine type code is required');
  if (!name) throw new Error('Fine type name is required');

  const existing = await prisma.feeFineType.findFirst({
    where: { institutionId, code },
  });
  if (existing) throw new Error(`Fine type with code "${code}" already exists`);

  const row = await prisma.feeFineType.create({
    data: {
      institutionId,
      code,
      name,
      category: data.category ?? FeeFineCategory.OTHER,
      defaultAmount: round2(data.defaultAmount ?? 0),
      description: data.description ?? '',
      isCustomizable: data.isCustomizable ?? true,
      status: data.status ?? FeeMasterStatus.ACTIVE,
    },
  });
  return serializeFeeFineType(row);
}

export async function updateFeeFineType(
  institutionId: string,
  id: string,
  data: Partial<{
    name: string;
    category: FeeFineCategory;
    defaultAmount: number;
    description: string;
    isCustomizable: boolean;
    status: FeeMasterStatus;
  }>,
) {
  const existing = await prisma.feeFineType.findFirst({ where: { id, institutionId } });
  if (!existing) throw new Error('Fine type not found');

  const row = await prisma.feeFineType.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name.trim() } : {}),
      ...(data.category !== undefined ? { category: data.category } : {}),
      ...(data.defaultAmount !== undefined ? { defaultAmount: round2(data.defaultAmount) } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.isCustomizable !== undefined ? { isCustomizable: data.isCustomizable } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
    },
  });
  return serializeFeeFineType(row);
}

export async function seedFeeFineTypes(institutionId: string) {
  const existing = await prisma.feeFineType.findMany({
    where: { institutionId },
    select: { code: true },
  });
  const existingCodes = new Set(existing.map((e) => e.code));
  const toCreate = FINE_TYPE_SEEDS.filter((s) => !existingCodes.has(s.code));

  if (toCreate.length > 0) {
    await prisma.feeFineType.createMany({
      data: toCreate.map((s) => ({
        institutionId,
        code: s.code,
        name: s.name,
        category: s.category,
        defaultAmount: s.defaultAmount,
        description: s.description,
        status: FeeMasterStatus.ACTIVE,
      })),
    });
  }

  return {
    created: toCreate.length,
    skipped: existingCodes.size,
    items: await listFeeFineTypes(institutionId),
  };
}

export async function listFeeFineLevies(
  institutionId: string,
  opts: { academicYear?: string; status?: FeeFineLevyStatus } = {},
) {
  const where: Prisma.FeeFineLevyWhereInput = { institutionId };
  if (opts.academicYear) where.academicYear = opts.academicYear;
  if (opts.status) where.status = opts.status;
  const rows = await prisma.feeFineLevy.findMany({
    where,
    include: { fineType: { select: { code: true, name: true, category: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(serializeFeeFineLevy);
}

export async function levyFeeFine(
  institutionId: string,
  data: {
    fineTypeId: string;
    academicYear: string;
    studentName: string;
    amount?: number;
    studentId?: string;
    admissionNumber?: string;
    className?: string;
    reason?: string;
    dueDate?: string | Date | null;
  },
) {
  const studentName = data.studentName?.trim();
  if (!studentName) throw new Error('Student name is required');
  if (!data.academicYear?.trim()) throw new Error('Academic year is required');

  const fineType = await prisma.feeFineType.findFirst({
    where: { id: data.fineTypeId, institutionId },
  });
  if (!fineType) throw new Error('Fine type not found');

  const amount = round2(data.amount ?? fineType.defaultAmount);
  if (amount <= 0) throw new Error('Fine amount must be greater than zero');

  const row = await prisma.feeFineLevy.create({
    data: {
      institutionId,
      fineTypeId: data.fineTypeId,
      academicYear: data.academicYear,
      studentId: data.studentId ?? '',
      studentName,
      admissionNumber: data.admissionNumber ?? '',
      className: data.className ?? '',
      amount,
      reason: data.reason ?? '',
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      status: FeeFineLevyStatus.PENDING,
    },
    include: { fineType: { select: { code: true, name: true, category: true } } },
  });
  return serializeFeeFineLevy(row);
}

export async function markFinePaid(institutionId: string, id: string) {
  const existing = await prisma.feeFineLevy.findFirst({ where: { id, institutionId } });
  if (!existing) throw new Error('Fine levy not found');
  if (existing.status === FeeFineLevyStatus.WAIVED) {
    throw new Error('Waived fines cannot be marked as paid');
  }
  const row = await prisma.feeFineLevy.update({
    where: { id },
    data: { status: FeeFineLevyStatus.PAID, collectedAt: new Date() },
    include: { fineType: { select: { code: true, name: true, category: true } } },
  });
  return serializeFeeFineLevy(row);
}

export async function waiveFeeFine(institutionId: string, id: string) {
  const existing = await prisma.feeFineLevy.findFirst({ where: { id, institutionId } });
  if (!existing) throw new Error('Fine levy not found');
  if (existing.status === FeeFineLevyStatus.PAID) {
    throw new Error('Paid fines cannot be waived');
  }
  const row = await prisma.feeFineLevy.update({
    where: { id },
    data: { status: FeeFineLevyStatus.WAIVED },
    include: { fineType: { select: { code: true, name: true, category: true } } },
  });
  return serializeFeeFineLevy(row);
}

// ─── Scholarship ─────────────────────────────────────────────────────────────

export async function listFeeScholarships(
  institutionId: string,
  opts: { academicYear?: string; status?: FeeApprovalStatus } = {},
) {
  const where: Prisma.FeeScholarshipWhereInput = { institutionId };
  if (opts.academicYear) where.academicYear = opts.academicYear;
  if (opts.status) where.status = opts.status;
  const rows = await prisma.feeScholarship.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(serializeFeeScholarship);
}

export async function createFeeScholarship(
  institutionId: string,
  data: {
    code: string;
    name: string;
    description?: string;
    academicYear: string;
    waiverType?: string;
    waiverValue?: number;
    budgetAllocated?: number;
    applicableFor?: string;
  },
  requestedBy: string,
) {
  const code = data.code?.trim();
  const name = data.name?.trim();
  if (!code) throw new Error('Scholarship code is required');
  if (!name) throw new Error('Scholarship name is required');
  if (!data.academicYear?.trim()) throw new Error('Academic year is required');

  const existing = await prisma.feeScholarship.findFirst({
    where: { institutionId, code, academicYear: data.academicYear },
  });
  if (existing) throw new Error(`Scholarship code "${code}" already exists for this academic year`);

  const row = await prisma.feeScholarship.create({
    data: {
      institutionId,
      code,
      name,
      description: data.description ?? '',
      academicYear: data.academicYear,
      waiverType: data.waiverType ?? 'PERCENTAGE',
      waiverValue: round2(data.waiverValue ?? 0),
      budgetAllocated: round2(data.budgetAllocated ?? 0),
      applicableFor: data.applicableFor ?? 'BOTH',
      requestedBy,
      status: FeeApprovalStatus.DRAFT,
    },
  });
  return serializeFeeScholarship(row);
}

export async function submitScholarshipForApproval(institutionId: string, id: string) {
  const existing = await prisma.feeScholarship.findFirst({ where: { id, institutionId } });
  if (!existing) throw new Error('Scholarship not found');
  if (existing.status !== FeeApprovalStatus.DRAFT) {
    throw new Error('Only draft scholarships can be submitted for approval');
  }
  const row = await prisma.feeScholarship.update({
    where: { id },
    data: { status: FeeApprovalStatus.PENDING_APPROVAL },
  });
  return serializeFeeScholarship(row);
}

export async function approveFeeScholarship(institutionId: string, id: string, approvedBy: string) {
  const existing = await prisma.feeScholarship.findFirst({ where: { id, institutionId } });
  if (!existing) throw new Error('Scholarship not found');
  if (existing.status !== FeeApprovalStatus.PENDING_APPROVAL) {
    throw new Error('Only pending scholarships can be approved');
  }
  const row = await prisma.feeScholarship.update({
    where: { id },
    data: {
      status: FeeApprovalStatus.ACTIVE,
      approvedBy,
      approvedAt: new Date(),
      rejectionReason: '',
    },
  });
  return serializeFeeScholarship(row);
}

export async function rejectFeeScholarship(
  institutionId: string,
  id: string,
  approvedBy: string,
  reason: string,
) {
  const existing = await prisma.feeScholarship.findFirst({ where: { id, institutionId } });
  if (!existing) throw new Error('Scholarship not found');
  if (existing.status !== FeeApprovalStatus.PENDING_APPROVAL) {
    throw new Error('Only pending scholarships can be rejected');
  }
  const row = await prisma.feeScholarship.update({
    where: { id },
    data: {
      status: FeeApprovalStatus.REJECTED,
      approvedBy,
      approvedAt: new Date(),
      rejectionReason: reason?.trim() || 'Rejected',
    },
  });
  return serializeFeeScholarship(row);
}

export async function listScholarshipAwards(
  institutionId: string,
  opts: { academicYear?: string; scholarshipId?: string } = {},
) {
  const where: Prisma.FeeScholarshipAwardWhereInput = { institutionId };
  if (opts.academicYear) where.academicYear = opts.academicYear;
  if (opts.scholarshipId) where.scholarshipId = opts.scholarshipId;
  const rows = await prisma.feeScholarshipAward.findMany({
    where,
    include: { scholarship: { select: { code: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(serializeScholarshipAward);
}

export async function awardScholarship(
  institutionId: string,
  data: {
    scholarshipId: string;
    academicYear: string;
    studentName: string;
    amount: number;
    studentId?: string;
    admissionNumber?: string;
    className?: string;
    remarks?: string;
  },
) {
  const studentName = data.studentName?.trim();
  if (!studentName) throw new Error('Student name is required');
  if (!data.academicYear?.trim()) throw new Error('Academic year is required');
  const amount = round2(data.amount);
  if (amount <= 0) throw new Error('Award amount must be greater than zero');

  const scholarship = await prisma.feeScholarship.findFirst({
    where: { id: data.scholarshipId, institutionId },
  });
  if (!scholarship) throw new Error('Scholarship not found');
  if (scholarship.status !== FeeApprovalStatus.ACTIVE) {
    throw new Error('Scholarship must be active before awarding');
  }

  const row = await prisma.feeScholarshipAward.create({
    data: {
      institutionId,
      scholarshipId: data.scholarshipId,
      academicYear: data.academicYear,
      studentId: data.studentId ?? '',
      studentName,
      admissionNumber: data.admissionNumber ?? '',
      className: data.className ?? '',
      amount,
      status: FeeApprovalStatus.PENDING_APPROVAL,
      remarks: data.remarks ?? '',
    },
    include: { scholarship: { select: { code: true, name: true } } },
  });
  return serializeScholarshipAward(row);
}

export async function approveScholarshipAward(
  institutionId: string,
  id: string,
  approvedBy: string,
) {
  const existing = await prisma.feeScholarshipAward.findFirst({
    where: { id, institutionId },
    include: { scholarship: true },
  });
  if (!existing) throw new Error('Scholarship award not found');
  if (existing.status !== FeeApprovalStatus.PENDING_APPROVAL) {
    throw new Error('Only pending awards can be approved');
  }

  const remaining = existing.scholarship.budgetAllocated - existing.scholarship.budgetUsed;
  if (existing.scholarship.budgetAllocated > 0 && existing.amount > remaining) {
    throw new Error('Award amount exceeds remaining scholarship budget');
  }

  const [, row] = await prisma.$transaction([
    prisma.feeScholarship.update({
      where: { id: existing.scholarshipId },
      data: { budgetUsed: { increment: existing.amount } },
    }),
    prisma.feeScholarshipAward.update({
      where: { id },
      data: {
        status: FeeApprovalStatus.APPROVED,
        approvedBy,
        approvedAt: new Date(),
      },
      include: { scholarship: { select: { code: true, name: true } } },
    }),
  ]);
  return serializeScholarshipAward(row);
}

export async function rejectScholarshipAward(
  institutionId: string,
  id: string,
  approvedBy: string,
  reason: string,
) {
  const existing = await prisma.feeScholarshipAward.findFirst({ where: { id, institutionId } });
  if (!existing) throw new Error('Scholarship award not found');
  if (existing.status !== FeeApprovalStatus.PENDING_APPROVAL) {
    throw new Error('Only pending awards can be rejected');
  }
  const row = await prisma.feeScholarshipAward.update({
    where: { id },
    data: {
      status: FeeApprovalStatus.REJECTED,
      approvedBy,
      approvedAt: new Date(),
      remarks: reason?.trim() || existing.remarks,
    },
    include: { scholarship: { select: { code: true, name: true } } },
  });
  return serializeScholarshipAward(row);
}

// ─── Transport Fee ─────────────────────────────────────────────────────────────

export async function listTransportVendors(institutionId: string) {
  const rows = await prisma.transportFeeVendor.findMany({
    where: { institutionId },
    orderBy: { vendorName: 'asc' },
  });
  return rows.map(serializeTransportVendor);
}

export async function createTransportVendor(
  institutionId: string,
  data: {
    vendorCode: string;
    vendorName: string;
    contactPerson?: string;
    mobile?: string;
    email?: string;
    address?: string;
    routesCovered?: string;
    vehicleCount?: number;
    bankDetails?: Record<string, unknown>;
    status?: TransportVendorStatus;
    remarks?: string;
  },
) {
  const vendorCode = data.vendorCode?.trim();
  const vendorName = data.vendorName?.trim();
  if (!vendorCode) throw new Error('Vendor code is required');
  if (!vendorName) throw new Error('Vendor name is required');

  const existing = await prisma.transportFeeVendor.findFirst({
    where: { institutionId, vendorCode },
  });
  if (existing) throw new Error(`Vendor with code "${vendorCode}" already exists`);

  const row = await prisma.transportFeeVendor.create({
    data: {
      institutionId,
      vendorCode,
      vendorName,
      contactPerson: data.contactPerson ?? '',
      mobile: data.mobile ?? '',
      email: data.email ?? '',
      address: data.address ?? '',
      routesCovered: data.routesCovered ?? '',
      vehicleCount: data.vehicleCount ?? 0,
      bankDetails: (data.bankDetails ?? {}) as Prisma.InputJsonValue,
      status: data.status ?? TransportVendorStatus.EMPANELLED,
      remarks: data.remarks ?? '',
    },
  });
  return serializeTransportVendor(row);
}

export async function updateTransportVendor(
  institutionId: string,
  id: string,
  data: Partial<{
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
  }>,
) {
  const existing = await prisma.transportFeeVendor.findFirst({ where: { id, institutionId } });
  if (!existing) throw new Error('Transport vendor not found');

  const row = await prisma.transportFeeVendor.update({
    where: { id },
    data: {
      ...(data.vendorName !== undefined ? { vendorName: data.vendorName.trim() } : {}),
      ...(data.contactPerson !== undefined ? { contactPerson: data.contactPerson } : {}),
      ...(data.mobile !== undefined ? { mobile: data.mobile } : {}),
      ...(data.email !== undefined ? { email: data.email } : {}),
      ...(data.address !== undefined ? { address: data.address } : {}),
      ...(data.routesCovered !== undefined ? { routesCovered: data.routesCovered } : {}),
      ...(data.vehicleCount !== undefined ? { vehicleCount: data.vehicleCount } : {}),
      ...(data.bankDetails !== undefined
        ? { bankDetails: data.bankDetails as Prisma.InputJsonValue }
        : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.remarks !== undefined ? { remarks: data.remarks } : {}),
    },
  });
  return serializeTransportVendor(row);
}

export async function listTransportFeeCollections(
  institutionId: string,
  opts: { academicYear?: string } = {},
) {
  const where: Prisma.TransportFeeCollectionWhereInput = { institutionId };
  if (opts.academicYear) where.academicYear = opts.academicYear;
  const rows = await prisma.transportFeeCollection.findMany({
    where,
    orderBy: { collectedAt: 'desc' },
  });
  return rows.map(serializeTransportCollection);
}

async function generateTransportReceiptNumber(institutionId: string, academicYear: string) {
  const year = academicYearStart(academicYear);
  return nextSequentialNumber(institutionId, 'TRF', year, () =>
    prisma.transportFeeCollection.count({ where: { institutionId, academicYear } }),
  );
}

export async function collectTransportFee(
  institutionId: string,
  data: {
    academicYear: string;
    studentName: string;
    amount: number;
    studentId?: string;
    admissionNumber?: string;
    className?: string;
    routeName?: string;
    monthLabel?: string;
    paymentMode?: string;
    remarks?: string;
  },
  collectedBy: string,
) {
  const studentName = data.studentName?.trim();
  if (!studentName) throw new Error('Student name is required');
  if (!data.academicYear?.trim()) throw new Error('Academic year is required');
  const amount = round2(data.amount);
  if (amount <= 0) throw new Error('Collection amount must be greater than zero');

  const receiptNumber = await generateTransportReceiptNumber(institutionId, data.academicYear);

  const row = await prisma.transportFeeCollection.create({
    data: {
      institutionId,
      receiptNumber,
      academicYear: data.academicYear,
      monthLabel: data.monthLabel ?? '',
      studentId: data.studentId ?? '',
      studentName,
      admissionNumber: data.admissionNumber ?? '',
      className: data.className ?? '',
      routeName: data.routeName ?? '',
      amount,
      paymentMode: data.paymentMode ?? 'CASH',
      collectedBy,
      remarks: data.remarks ?? '',
    },
  });
  return serializeTransportCollection(row);
}

export async function listTransportVendorPayments(institutionId: string) {
  const rows = await prisma.transportVendorPayment.findMany({
    where: { institutionId },
    include: { vendor: { select: { vendorCode: true, vendorName: true } } },
    orderBy: { paymentDate: 'desc' },
  });
  return rows.map(serializeVendorPayment);
}

async function generateVendorPaymentNumber(institutionId: string) {
  const year = new Date().getFullYear();
  return nextSequentialNumber(institutionId, 'TVP', year, () =>
    prisma.transportVendorPayment.count({ where: { institutionId } }),
  );
}

export async function payTransportVendor(
  institutionId: string,
  data: {
    vendorId: string;
    amount: number;
    paymentMode?: string;
    paymentDate?: string | Date;
    periodLabel?: string;
    remarks?: string;
  },
  paidBy: string,
) {
  const amount = round2(data.amount);
  if (amount <= 0) throw new Error('Payment amount must be greater than zero');

  const vendor = await prisma.transportFeeVendor.findFirst({
    where: { id: data.vendorId, institutionId },
  });
  if (!vendor) throw new Error('Transport vendor not found');

  const paymentNumber = await generateVendorPaymentNumber(institutionId);

  const row = await prisma.transportVendorPayment.create({
    data: {
      institutionId,
      vendorId: data.vendorId,
      paymentNumber,
      amount,
      paymentMode: data.paymentMode ?? 'BANK_TRANSFER',
      paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
      periodLabel: data.periodLabel ?? '',
      remarks: data.remarks ?? '',
      paidBy,
    },
    include: { vendor: { select: { vendorCode: true, vendorName: true } } },
  });
  return serializeVendorPayment(row);
}

export async function getTransportFeeSummary(institutionId: string, academicYear: string) {
  const [collections, payments, vendorCount] = await Promise.all([
    prisma.transportFeeCollection.aggregate({
      where: { institutionId, academicYear },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.transportVendorPayment.aggregate({
      where: { institutionId },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.transportFeeVendor.count({ where: { institutionId } }),
  ]);

  return {
    academicYear,
    totalCollections: round2(collections._sum.amount ?? 0),
    collectionCount: collections._count,
    totalVendorPayments: round2(payments._sum.amount ?? 0),
    vendorPaymentCount: payments._count,
    vendorCount,
    netBalance: round2((collections._sum.amount ?? 0) - (payments._sum.amount ?? 0)),
  };
}

// ─── Hostel Fee ───────────────────────────────────────────────────────────────

const DEFAULT_HOSTEL_FEE_CATEGORIES: Array<{
  code: string;
  name: string;
  frequency: string;
  refundable: boolean;
  gstMode: 'CONFIGURABLE' | 'NO';
  displayOrder: number;
}> = [
  { code: 'HOSTEL_ADMISSION', name: 'Admission Fee', frequency: 'One-Time', refundable: false, gstMode: 'CONFIGURABLE', displayOrder: 1 },
  { code: 'HOSTEL_SECURITY', name: 'Security Deposit', frequency: 'One-Time', refundable: true, gstMode: 'NO', displayOrder: 2 },
  { code: 'HOSTEL_RENT', name: 'Hostel Rent', frequency: 'Monthly/Quarterly', refundable: false, gstMode: 'CONFIGURABLE', displayOrder: 3 },
  { code: 'HOSTEL_MESS', name: 'Mess Fee', frequency: 'Monthly', refundable: false, gstMode: 'CONFIGURABLE', displayOrder: 4 },
  { code: 'HOSTEL_ELECTRICITY', name: 'Electricity', frequency: 'Monthly (Actual/Fixed)', refundable: false, gstMode: 'CONFIGURABLE', displayOrder: 5 },
  { code: 'HOSTEL_LAUNDRY', name: 'Laundry', frequency: 'Monthly', refundable: false, gstMode: 'CONFIGURABLE', displayOrder: 6 },
  { code: 'HOSTEL_WIFI', name: 'Wi-Fi', frequency: 'Monthly', refundable: false, gstMode: 'CONFIGURABLE', displayOrder: 7 },
  { code: 'HOSTEL_MAINTENANCE', name: 'Maintenance', frequency: 'Monthly', refundable: false, gstMode: 'CONFIGURABLE', displayOrder: 8 },
  { code: 'HOSTEL_MEDICAL', name: 'Medical', frequency: 'Annual', refundable: false, gstMode: 'CONFIGURABLE', displayOrder: 9 },
  { code: 'HOSTEL_SPORTS', name: 'Sports & Recreation', frequency: 'Annual', refundable: false, gstMode: 'CONFIGURABLE', displayOrder: 10 },
  { code: 'HOSTEL_LATE_FINE', name: 'Late Fee Fine', frequency: 'As Applicable', refundable: false, gstMode: 'NO', displayOrder: 11 },
  { code: 'HOSTEL_DAMAGE', name: 'Damage Recovery', frequency: 'As Applicable', refundable: false, gstMode: 'CONFIGURABLE', displayOrder: 12 },
];

function serializeHostelCategory(row: {
  id: string;
  code: string;
  name: string;
  frequency: string;
  refundable: boolean;
  gstMode: string;
  defaultAmount: number;
  description: string;
  displayOrder: number;
  status: FeeMasterStatus;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    feeCategory: row.name,
    frequency: row.frequency,
    refundable: row.refundable,
    refundableLabel: row.refundable ? 'Yes' : 'No',
    gstMode: row.gstMode,
    gstLabel: row.gstMode === 'NO' ? 'No' : 'Configurable',
    defaultAmount: round2(row.defaultAmount),
    description: row.description,
    displayOrder: row.displayOrder,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function serializeHostelCollection(row: {
  id: string;
  categoryId: string | null;
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
  collectedAt: Date;
  remarks: string;
  category?: { name: string; code: string } | null;
}) {
  return {
    id: row.id,
    categoryId: row.categoryId,
    categoryName: row.category?.name || '',
    categoryCode: row.category?.code || '',
    receiptNumber: row.receiptNumber,
    academicYear: row.academicYear,
    periodLabel: row.periodLabel,
    studentId: row.studentId,
    studentName: row.studentName,
    admissionNumber: row.admissionNumber,
    className: row.className,
    roomNumber: row.roomNumber,
    amount: round2(row.amount),
    paymentMode: row.paymentMode,
    collectedBy: row.collectedBy,
    collectedAt: row.collectedAt.toISOString(),
    remarks: row.remarks,
  };
}

export async function listHostelFeeCategories(
  institutionId: string,
  opts: { status?: FeeMasterStatus } = {},
) {
  const where: Prisma.HostelFeeCategoryWhereInput = { institutionId };
  if (opts.status) where.status = opts.status;
  const rows = await prisma.hostelFeeCategory.findMany({
    where,
    orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
  });
  return rows.map(serializeHostelCategory);
}

export async function seedHostelFeeCategories(institutionId: string) {
  const existing = await prisma.hostelFeeCategory.findMany({
    where: { institutionId },
    select: { code: true },
  });
  const existingCodes = new Set(existing.map((e) => e.code));
  const toCreate = DEFAULT_HOSTEL_FEE_CATEGORIES.filter((c) => !existingCodes.has(c.code));
  if (toCreate.length === 0) {
    return { created: 0, skipped: existingCodes.size, items: await listHostelFeeCategories(institutionId) };
  }

  await prisma.hostelFeeCategory.createMany({
    data: toCreate.map((c) => ({
      institutionId,
      code: c.code,
      name: c.name,
      frequency: c.frequency,
      refundable: c.refundable,
      gstMode: c.gstMode,
      displayOrder: c.displayOrder,
      status: FeeMasterStatus.ACTIVE,
    })),
  });

  return {
    created: toCreate.length,
    skipped: existingCodes.size,
    items: await listHostelFeeCategories(institutionId),
  };
}

/** Ensure default hostel categories exist, then return them (for first page load). */
export async function ensureHostelFeeCategories(institutionId: string) {
  const existing = await prisma.hostelFeeCategory.count({ where: { institutionId } });
  if (existing === 0) {
    await seedHostelFeeCategories(institutionId);
  }
  return listHostelFeeCategories(institutionId);
}

export async function createHostelFeeCategory(
  institutionId: string,
  data: {
    code: string;
    name: string;
    frequency?: string;
    refundable?: boolean;
    gstMode?: string;
    defaultAmount?: number;
    description?: string;
    displayOrder?: number;
    status?: FeeMasterStatus;
  },
) {
  const code = data.code?.trim().toUpperCase().replace(/\s+/g, '_');
  const name = data.name?.trim();
  if (!code) throw new Error('Category code is required');
  if (!name) throw new Error('Fee category name is required');

  const existing = await prisma.hostelFeeCategory.findFirst({
    where: { institutionId, code },
  });
  if (existing) throw new Error(`Hostel fee category "${code}" already exists`);

  const maxOrder = await prisma.hostelFeeCategory.aggregate({
    where: { institutionId },
    _max: { displayOrder: true },
  });

  const row = await prisma.hostelFeeCategory.create({
    data: {
      institutionId,
      code,
      name,
      frequency: data.frequency?.trim() || 'Monthly',
      refundable: data.refundable ?? false,
      gstMode: data.gstMode === 'NO' ? 'NO' : 'CONFIGURABLE',
      defaultAmount: round2(data.defaultAmount ?? 0),
      description: data.description ?? '',
      displayOrder: data.displayOrder ?? (maxOrder._max.displayOrder ?? 0) + 1,
      status: data.status ?? FeeMasterStatus.ACTIVE,
    },
  });
  return serializeHostelCategory(row);
}

export async function updateHostelFeeCategory(
  institutionId: string,
  id: string,
  data: {
    name?: string;
    frequency?: string;
    refundable?: boolean;
    gstMode?: string;
    defaultAmount?: number;
    description?: string;
    displayOrder?: number;
    status?: FeeMasterStatus;
  },
) {
  const existing = await prisma.hostelFeeCategory.findFirst({ where: { id, institutionId } });
  if (!existing) throw new Error('Hostel fee category not found');

  const row = await prisma.hostelFeeCategory.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name.trim() } : {}),
      ...(data.frequency !== undefined ? { frequency: data.frequency.trim() } : {}),
      ...(data.refundable !== undefined ? { refundable: data.refundable } : {}),
      ...(data.gstMode !== undefined
        ? { gstMode: data.gstMode === 'NO' ? 'NO' : 'CONFIGURABLE' }
        : {}),
      ...(data.defaultAmount !== undefined ? { defaultAmount: round2(data.defaultAmount) } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.displayOrder !== undefined ? { displayOrder: data.displayOrder } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
    },
  });
  return serializeHostelCategory(row);
}

async function generateHostelReceiptNumber(institutionId: string, academicYear: string) {
  const year = academicYearStart(academicYear);
  const count = await prisma.hostelFeeCollection.count({ where: { institutionId } });
  for (let i = 0; i < 50; i++) {
    const candidate = `HSF-${year}-${String(count + i + 1).padStart(5, '0')}`;
    const exists = await prisma.hostelFeeCollection.findFirst({
      where: { institutionId, receiptNumber: candidate },
    });
    if (!exists) return candidate;
  }
  return `HSF-${year}-${Date.now().toString().slice(-6)}`;
}

export async function listHostelFeeCollections(
  institutionId: string,
  opts: { academicYear?: string } = {},
) {
  const where: Prisma.HostelFeeCollectionWhereInput = { institutionId };
  if (opts.academicYear) where.academicYear = opts.academicYear;
  const rows = await prisma.hostelFeeCollection.findMany({
    where,
    include: { category: { select: { name: true, code: true } } },
    orderBy: { collectedAt: 'desc' },
    take: 200,
  });
  return rows.map(serializeHostelCollection);
}

export async function collectHostelFee(
  institutionId: string,
  data: {
    academicYear: string;
    studentName: string;
    amount: number;
    categoryId?: string;
    studentId?: string;
    admissionNumber?: string;
    className?: string;
    roomNumber?: string;
    periodLabel?: string;
    paymentMode?: string;
    remarks?: string;
  },
  collectedBy: string,
) {
  const studentName = data.studentName?.trim();
  if (!studentName) throw new Error('Student name is required');
  if (!data.academicYear?.trim()) throw new Error('Academic year is required');
  const amount = round2(data.amount);
  if (amount <= 0) throw new Error('Amount must be greater than zero');

  if (data.categoryId) {
    const cat = await prisma.hostelFeeCategory.findFirst({
      where: { id: data.categoryId, institutionId },
    });
    if (!cat) throw new Error('Hostel fee category not found');
  }

  const receiptNumber = await generateHostelReceiptNumber(institutionId, data.academicYear);
  const row = await prisma.hostelFeeCollection.create({
    data: {
      institutionId,
      categoryId: data.categoryId || null,
      receiptNumber,
      academicYear: data.academicYear,
      periodLabel: data.periodLabel ?? '',
      studentId: data.studentId ?? '',
      studentName,
      admissionNumber: data.admissionNumber ?? '',
      className: data.className ?? '',
      roomNumber: data.roomNumber ?? '',
      amount,
      paymentMode: data.paymentMode ?? 'CASH',
      collectedBy,
      remarks: data.remarks ?? '',
    },
    include: { category: { select: { name: true, code: true } } },
  });
  return serializeHostelCollection(row);
}

export async function getHostelFeeSummary(institutionId: string, academicYear: string) {
  const [categories, collections] = await Promise.all([
    prisma.hostelFeeCategory.count({
      where: { institutionId, status: FeeMasterStatus.ACTIVE },
    }),
    prisma.hostelFeeCollection.aggregate({
      where: { institutionId, academicYear },
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  return {
    academicYear,
    categoryCount: categories,
    totalCollections: round2(collections._sum.amount ?? 0),
    collectionCount: collections._count,
  };
}

// ─── Other Charges ────────────────────────────────────────────────────────────

const DEFAULT_OTHER_CHARGE_TYPES: Array<{
  code: string;
  name: string;
  defaultAmount: number;
  frequency: string;
  gstMode: string;
  displayOrder: number;
}> = [
  { code: 'ID_CARD', name: 'ID Card Fee', defaultAmount: 200, frequency: 'One-Time', gstMode: 'CONFIGURABLE', displayOrder: 1 },
  { code: 'CERTIFICATE', name: 'Certificate Fee', defaultAmount: 500, frequency: 'As Applicable', gstMode: 'CONFIGURABLE', displayOrder: 2 },
  { code: 'TRANSFER_CERT', name: 'Transfer Certificate', defaultAmount: 1000, frequency: 'One-Time', gstMode: 'CONFIGURABLE', displayOrder: 3 },
  { code: 'CHARACTER_CERT', name: 'Character Certificate', defaultAmount: 300, frequency: 'As Applicable', gstMode: 'CONFIGURABLE', displayOrder: 4 },
  { code: 'BONAFIDE', name: 'Bonafide Certificate', defaultAmount: 200, frequency: 'As Applicable', gstMode: 'CONFIGURABLE', displayOrder: 5 },
  { code: 'ALUMNI', name: 'Alumni Fee', defaultAmount: 0, frequency: 'Annual', gstMode: 'NO', displayOrder: 6 },
  { code: 'MISCELLANEOUS', name: 'Miscellaneous Charge', defaultAmount: 0, frequency: 'As Applicable', gstMode: 'CONFIGURABLE', displayOrder: 7 },
];

function serializeOtherChargeType(row: {
  id: string;
  code: string;
  name: string;
  description: string;
  defaultAmount: number;
  frequency: string;
  gstMode: string;
  displayOrder: number;
  status: FeeMasterStatus;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    defaultAmount: round2(row.defaultAmount),
    frequency: row.frequency,
    gstMode: row.gstMode,
    gstLabel: row.gstMode === 'NO' ? 'No' : 'Configurable',
    displayOrder: row.displayOrder,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function serializeOtherChargeRequest(row: {
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
  chargeAmount: number;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  className: string;
  sectionName: string;
  status: FeeApprovalStatus;
  requestedBy: string;
  approvedBy: string;
  approvedAt: Date | null;
  rejectionReason: string;
  remarks: string;
  createdAt: Date;
  updatedAt: Date;
  chargeType?: { name: string; code: string } | null;
}) {
  return {
    id: row.id,
    recordId: row.recordId,
    requestType: row.requestType,
    academicYear: row.academicYear,
    code: row.code,
    name: row.name,
    description: row.description,
    discountType: row.discountType,
    value: round2(row.value),
    settlementAmount: round2(row.settlementAmount),
    chargeTypeId: row.chargeTypeId,
    chargeTypeName: row.chargeType?.name || '',
    chargeAmount: round2(row.chargeAmount),
    studentId: row.studentId,
    studentName: row.studentName,
    admissionNumber: row.admissionNumber,
    className: row.className,
    sectionName: row.sectionName,
    status: row.status,
    requestedBy: row.requestedBy,
    approvedBy: row.approvedBy,
    approvedAt: row.approvedAt?.toISOString() ?? null,
    rejectionReason: row.rejectionReason,
    remarks: row.remarks,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function generateOtherChargeRecordId(institutionId: string, academicYear: string) {
  const year = academicYearStart(academicYear);
  return nextSequentialNumber(institutionId, 'OCR', year, () =>
    prisma.feeOtherChargeRequest.count({ where: { institutionId, academicYear } }),
  );
}

async function generateOtherChargeDiscountCode(institutionId: string) {
  for (let i = 0; i < 50; i++) {
    const candidate = `OC-DSC-${String(Math.floor(1000 + Math.random() * 9000))}`;
    const exists = await prisma.feeOtherChargeRequest.findFirst({
      where: { institutionId, code: candidate },
    });
    if (!exists) return candidate;
  }
  return `OC-DSC-${Date.now().toString().slice(-6)}`;
}

export async function listOtherChargeTypes(institutionId: string) {
  const rows = await prisma.feeOtherChargeType.findMany({
    where: { institutionId },
    orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
  });
  return rows.map(serializeOtherChargeType);
}

export async function seedOtherChargeTypes(institutionId: string) {
  const existing = await prisma.feeOtherChargeType.findMany({
    where: { institutionId },
    select: { code: true },
  });
  const existingCodes = new Set(existing.map((e) => e.code));
  const toCreate = DEFAULT_OTHER_CHARGE_TYPES.filter((c) => !existingCodes.has(c.code));
  if (toCreate.length === 0) {
    return { created: 0, skipped: existingCodes.size, items: await listOtherChargeTypes(institutionId) };
  }
  await prisma.feeOtherChargeType.createMany({
    data: toCreate.map((c) => ({
      institutionId,
      code: c.code,
      name: c.name,
      defaultAmount: c.defaultAmount,
      frequency: c.frequency,
      gstMode: c.gstMode,
      displayOrder: c.displayOrder,
      status: FeeMasterStatus.ACTIVE,
    })),
  });
  return {
    created: toCreate.length,
    skipped: existingCodes.size,
    items: await listOtherChargeTypes(institutionId),
  };
}

export async function ensureOtherChargeTypes(institutionId: string) {
  const count = await prisma.feeOtherChargeType.count({ where: { institutionId } });
  if (count === 0) await seedOtherChargeTypes(institutionId);
  return listOtherChargeTypes(institutionId);
}

export async function listOtherChargeRequests(
  institutionId: string,
  opts: {
    academicYear?: string;
    status?: FeeApprovalStatus;
    requestType?: FeeOtherChargeRequestType;
  } = {},
) {
  const where: Prisma.FeeOtherChargeRequestWhereInput = { institutionId };
  if (opts.academicYear) where.academicYear = opts.academicYear;
  if (opts.status) where.status = opts.status;
  if (opts.requestType) where.requestType = opts.requestType;
  const rows = await prisma.feeOtherChargeRequest.findMany({
    where,
    include: { chargeType: { select: { name: true, code: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  return rows.map(serializeOtherChargeRequest);
}

export async function getOtherChargesSummary(institutionId: string, academicYear: string) {
  const [types, pending, discounts, settlements] = await Promise.all([
    prisma.feeOtherChargeType.count({ where: { institutionId, status: FeeMasterStatus.ACTIVE } }),
    prisma.feeOtherChargeRequest.count({
      where: { institutionId, academicYear, status: FeeApprovalStatus.PENDING_APPROVAL },
    }),
    prisma.feeOtherChargeRequest.count({
      where: {
        institutionId,
        academicYear,
        requestType: FeeOtherChargeRequestType.NEW_ADMISSION_DISCOUNT,
        status: { in: [FeeApprovalStatus.ACTIVE, FeeApprovalStatus.APPROVED] },
      },
    }),
    prisma.feeOtherChargeRequest.count({
      where: {
        institutionId,
        academicYear,
        requestType: FeeOtherChargeRequestType.ACCOUNT_SETTLEMENT,
        status: FeeApprovalStatus.APPROVED,
      },
    }),
  ]);
  return { academicYear, typeCount: types, pendingApproval: pending, activeDiscounts: discounts, approvedSettlements: settlements };
}

export async function createOtherChargeRequest(
  institutionId: string,
  data: {
    requestType: FeeOtherChargeRequestType;
    academicYear: string;
    name: string;
    description?: string;
    discountType?: string;
    value?: number;
    settlementAmount?: number;
    chargeTypeId?: string;
    chargeAmount?: number;
    code?: string;
    studentId?: string;
    studentName?: string;
    admissionNumber?: string;
    className?: string;
    sectionName?: string;
    remarks?: string;
  },
  requestedBy: string,
) {
  const name = data.name?.trim();
  if (!name) throw new Error('Request title is required');
  if (!data.academicYear?.trim()) throw new Error('Academic year is required');

  if (data.requestType === FeeOtherChargeRequestType.ACCOUNT_SETTLEMENT) {
    if (!data.studentName?.trim()) throw new Error('Student name is required for account settlement');
    const amount = round2(data.settlementAmount ?? 0);
    if (amount <= 0) throw new Error('Settlement amount must be greater than zero');
  } else {
    const val = round2(data.value ?? 0);
    if (val <= 0) throw new Error('Discount value must be greater than zero');
  }

  const recordId = await generateOtherChargeRecordId(institutionId, data.academicYear);
  const code =
    data.code?.trim() ||
    (data.requestType === FeeOtherChargeRequestType.NEW_ADMISSION_DISCOUNT
      ? await generateOtherChargeDiscountCode(institutionId)
      : `STL-${recordId}`);

  const row = await prisma.feeOtherChargeRequest.create({
    data: {
      institutionId,
      recordId,
      requestType: data.requestType,
      academicYear: data.academicYear,
      code,
      name,
      description: data.description ?? '',
      discountType: data.discountType ?? 'PERCENTAGE',
      value: round2(data.value ?? 0),
      settlementAmount: round2(data.settlementAmount ?? 0),
      chargeTypeId: data.chargeTypeId || null,
      chargeAmount: round2(data.chargeAmount ?? 0),
      studentId: data.studentId ?? '',
      studentName: data.studentName ?? '',
      admissionNumber: data.admissionNumber ?? '',
      className: data.className ?? '',
      sectionName: data.sectionName ?? '',
      requestedBy,
      status: FeeApprovalStatus.DRAFT,
      remarks: data.remarks ?? '',
    },
    include: { chargeType: { select: { name: true, code: true } } },
  });
  return serializeOtherChargeRequest(row);
}

export async function submitOtherChargeRequest(institutionId: string, id: string) {
  const existing = await prisma.feeOtherChargeRequest.findFirst({ where: { id, institutionId } });
  if (!existing) throw new Error('Request not found');
  if (existing.status !== FeeApprovalStatus.DRAFT) {
    throw new Error('Only draft requests can be submitted to Principal / Center Head');
  }
  const row = await prisma.feeOtherChargeRequest.update({
    where: { id },
    data: { status: FeeApprovalStatus.PENDING_APPROVAL },
    include: { chargeType: { select: { name: true, code: true } } },
  });
  return serializeOtherChargeRequest(row);
}

export async function approveOtherChargeRequest(
  institutionId: string,
  id: string,
  approvedBy: string,
) {
  const existing = await prisma.feeOtherChargeRequest.findFirst({ where: { id, institutionId } });
  if (!existing) throw new Error('Request not found');
  if (existing.status !== FeeApprovalStatus.PENDING_APPROVAL) {
    throw new Error('Only pending requests can be approved by Principal / Center Head');
  }

  const newStatus =
    existing.requestType === FeeOtherChargeRequestType.NEW_ADMISSION_DISCOUNT
      ? FeeApprovalStatus.ACTIVE
      : FeeApprovalStatus.APPROVED;

  const row = await prisma.feeOtherChargeRequest.update({
    where: { id },
    data: {
      status: newStatus,
      approvedBy,
      approvedAt: new Date(),
      rejectionReason: '',
    },
    include: { chargeType: { select: { name: true, code: true } } },
  });
  return serializeOtherChargeRequest(row);
}

export async function rejectOtherChargeRequest(
  institutionId: string,
  id: string,
  approvedBy: string,
  reason: string,
) {
  const existing = await prisma.feeOtherChargeRequest.findFirst({ where: { id, institutionId } });
  if (!existing) throw new Error('Request not found');
  if (existing.status !== FeeApprovalStatus.PENDING_APPROVAL) {
    throw new Error('Only pending requests can be rejected');
  }
  const row = await prisma.feeOtherChargeRequest.update({
    where: { id },
    data: {
      status: FeeApprovalStatus.REJECTED,
      approvedBy,
      approvedAt: new Date(),
      rejectionReason: reason?.trim() || 'Rejected by Principal / Center Head',
    },
    include: { chargeType: { select: { name: true, code: true } } },
  });
  return serializeOtherChargeRequest(row);
}
