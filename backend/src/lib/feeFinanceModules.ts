import {
  FeeApprovalStatus,
  FeeDiscountScope,
  FeeDueStatus,
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
  resolveCollectionFeeSchedule,
} from './feeConfig.js';
import {
  formatFeePeriod,
  getInvoicePeriodMeta,
  inferFeePeriodFromDate,
  type FeePeriodType,
} from './feeInvoicePeriods.js';
import { getFeeStructureHeadCatalog } from './feeMasterSync.js';
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
  depositBreakdown?: Prisma.JsonValue;
  pendingApproverRole?: string;
  pendingApproverName?: string;
  pendingApproverEmail?: string;
  requestedBy: string;
  approvedBy: string;
  approvedAt: Date | null;
  processedAt: Date | null;
  rejectionReason: string;
  remarks: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  const breakdown = Array.isArray(row.depositBreakdown)
    ? (row.depositBreakdown as Array<{ key?: string; label?: string; amount?: number }>).map((r) => ({
        key: String(r.key || ''),
        label: String(r.label || r.key || ''),
        amount: round2(Number(r.amount) || 0),
      }))
    : [];

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
    depositBreakdown: breakdown,
    pendingApproverRole: row.pendingApproverRole || '',
    pendingApproverName: row.pendingApproverName || '',
    pendingApproverEmail: row.pendingApproverEmail || '',
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
  sectionName?: string;
  amount: number;
  reason: string;
  status: FeeFineLevyStatus;
  dueDate: Date | null;
  collectedAt: Date | null;
  pendingApproverRole?: string;
  pendingApproverName?: string;
  pendingApproverEmail?: string;
  requestedBy?: string;
  approvedBy?: string;
  approvedAt?: Date | null;
  rejectionReason?: string;
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
    sectionName: row.sectionName || '',
    amount: round2(row.amount),
    reason: row.reason,
    status: row.status,
    dueDate: row.dueDate ? row.dueDate.toISOString().slice(0, 10) : null,
    collectedAt: row.collectedAt?.toISOString() ?? null,
    pendingApproverRole: row.pendingApproverRole || '',
    pendingApproverName: row.pendingApproverName || '',
    pendingApproverEmail: row.pendingApproverEmail || '',
    requestedBy: row.requestedBy || '',
    approvedBy: row.approvedBy || '',
    approvedAt: row.approvedAt?.toISOString() ?? null,
    rejectionReason: row.rejectionReason || '',
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
  sectionName?: string;
  amount: number;
  reason?: string;
  totalDueFees?: number;
  entranceTestResult?: string;
  lastClassPercent?: number;
  lastClassTotal?: number;
  lastClassObtain?: number;
  status: FeeApprovalStatus;
  pendingApproverRole?: string;
  pendingApproverName?: string;
  pendingApproverEmail?: string;
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
    sectionName: row.sectionName || '',
    amount: round2(row.amount),
    reason: row.reason || '',
    totalDueFees: round2(row.totalDueFees ?? 0),
    entranceTestResult: row.entranceTestResult || '',
    lastClassPercent: round2(row.lastClassPercent ?? 0),
    lastClassTotal: round2(row.lastClassTotal ?? 0),
    lastClassObtain: round2(row.lastClassObtain ?? 0),
    status: row.status,
    pendingApproverRole: row.pendingApproverRole || '',
    pendingApproverName: row.pendingApproverName || '',
    pendingApproverEmail: row.pendingApproverEmail || '',
    approvedBy: row.approvedBy,
    approvedAt: row.approvedAt?.toISOString() ?? null,
    remarks: row.remarks,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function parseDateOnly(value?: string | Date | null): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  const d = new Date(trimmed.length <= 10 ? `${trimmed}T00:00:00.000Z` : trimmed);
  return Number.isNaN(d.getTime()) ? null : d;
}

function dateOnlyIso(value?: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

function isExpiredDate(value?: Date | null, today = startOfTodayUtc()): boolean {
  if (!value) return false;
  return value.getTime() < today.getTime();
}

function startOfTodayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function daysUntil(value?: Date | null, today = startOfTodayUtc()): number | null {
  if (!value) return null;
  return Math.ceil((value.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

type TransportVendorDocument = {
  id: string;
  name: string;
  type: string;
  mimeType: string;
  fileData: string;
  uploadedAt: string;
};

function asDocumentList(value: Prisma.JsonValue): TransportVendorDocument[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const row = item as Record<string, unknown>;
      const id = String(row.id || '').trim();
      const name = String(row.name || '').trim();
      const fileData = String(row.fileData || '').trim();
      if (!id || !name || !fileData) return null;
      return {
        id,
        name,
        type: String(row.type || 'OTHER'),
        mimeType: String(row.mimeType || 'application/octet-stream'),
        fileData,
        uploadedAt: String(row.uploadedAt || new Date().toISOString()),
      };
    })
    .filter((x): x is TransportVendorDocument => x !== null);
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
  ownerPan?: string;
  ownerAadhaar?: string;
  driver1Name?: string;
  driver1Mobile?: string;
  driver1DlNumber?: string;
  driver1DlExpiry?: Date | null;
  driver1PoliceVerification?: string;
  driver2Name?: string;
  driver2Mobile?: string;
  driver2DlNumber?: string;
  driver2DlExpiry?: Date | null;
  driver2PoliceVerification?: string;
  vehicleRegNo?: string;
  vehicleChassisNo?: string;
  vehicleType?: string;
  pollutionCertDate?: Date | null;
  pollutionExpiryDate?: Date | null;
  insurancePolicyNo?: string;
  insuranceExpiryDate?: Date | null;
  trackingGpsDeviceId?: string;
  trackingPhoneAccess?: string;
  documents?: Prisma.JsonValue;
  complianceCategory?: string;
  pendingApproverRole?: string;
  pendingApproverName?: string;
  pendingApproverEmail?: string;
  requestedBy?: string;
  approvedBy?: string;
  approvedAt?: Date | null;
  rejectionReason?: string;
  status: TransportVendorStatus;
  remarks: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  const pollutionExpiryDate = row.pollutionExpiryDate ?? null;
  const insuranceExpiryDate = row.insuranceExpiryDate ?? null;
  const today = startOfTodayUtc();
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
    ownerPan: row.ownerPan || '',
    ownerAadhaar: row.ownerAadhaar || '',
    driver1Name: row.driver1Name || '',
    driver1Mobile: row.driver1Mobile || '',
    driver1DlNumber: row.driver1DlNumber || '',
    driver1DlExpiry: dateOnlyIso(row.driver1DlExpiry),
    driver1PoliceVerification: row.driver1PoliceVerification || '',
    driver2Name: row.driver2Name || '',
    driver2Mobile: row.driver2Mobile || '',
    driver2DlNumber: row.driver2DlNumber || '',
    driver2DlExpiry: dateOnlyIso(row.driver2DlExpiry),
    driver2PoliceVerification: row.driver2PoliceVerification || '',
    vehicleRegNo: row.vehicleRegNo || '',
    vehicleChassisNo: row.vehicleChassisNo || '',
    vehicleType: row.vehicleType || '',
    pollutionCertDate: dateOnlyIso(row.pollutionCertDate),
    pollutionExpiryDate: dateOnlyIso(pollutionExpiryDate),
    insurancePolicyNo: row.insurancePolicyNo || '',
    insuranceExpiryDate: dateOnlyIso(insuranceExpiryDate),
    trackingGpsDeviceId: row.trackingGpsDeviceId || '',
    trackingPhoneAccess: row.trackingPhoneAccess || '',
    documents: asDocumentList(row.documents ?? []),
    complianceCategory: row.complianceCategory || 'NORMAL',
    pollutionExpired: isExpiredDate(pollutionExpiryDate, today),
    insuranceExpired: isExpiredDate(insuranceExpiryDate, today),
    pollutionDaysLeft: daysUntil(pollutionExpiryDate, today),
    insuranceDaysLeft: daysUntil(insuranceExpiryDate, today),
    pendingApproverRole: row.pendingApproverRole || '',
    pendingApproverName: row.pendingApproverName || '',
    pendingApproverEmail: row.pendingApproverEmail || '',
    requestedBy: row.requestedBy || '',
    approvedBy: row.approvedBy || '',
    approvedAt: row.approvedAt?.toISOString() ?? null,
    rejectionReason: row.rejectionReason || '',
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
  sectionName?: string;
  routeName: string;
  amount: number;
  totalDueFees?: number;
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
    sectionName: row.sectionName || '',
    routeName: row.routeName,
    amount: round2(row.amount),
    totalDueFees: round2(row.totalDueFees ?? 0),
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
  // Array form: [{ key, label, amount }]
  if (Array.isArray(breakdown)) {
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

  // Object form from mobile/online payments: { tuitionFee: 5000, examinationFee: 500 }
  if (breakdown && typeof breakdown === 'object') {
    return Object.entries(breakdown as Record<string, unknown>)
      .map(([key, value]) => {
        const amount = round2(Number(value) || 0);
        if (!key || amount <= 0) return null;
        return {
          key,
          label: FEE_HEAD_LABELS[key] || key,
          amount,
        };
      })
      .filter((x): x is LineItem => x !== null);
  }

  return [];
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
  // Backfill invoices for fee receipts collected before auto-sync was enabled.
  if (opts.academicYear) {
    await generateInvoicesFromReceipts(institutionId, { academicYear: opts.academicYear });
  }

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

  let studentId = '';
  if (receipt.admissionRecordId) {
    const linked = await prisma.student.findFirst({
      where: { institutionId, admissionRecordId: receipt.admissionRecordId },
      select: { id: true },
    });
    studentId = linked?.id || '';
  }
  if (!studentId && receipt.admissionNumber) {
    const linked = await prisma.student.findFirst({
      where: { institutionId, admissionNumber: receipt.admissionNumber },
      select: { id: true },
    });
    studentId = linked?.id || '';
  }

  const row = await prisma.feeInvoice.create({
    data: {
      institutionId,
      invoiceNumber,
      academicYear: receipt.academicYear,
      studentId,
      studentName: receipt.studentName,
      admissionNumber: receipt.admissionNumber,
      className: receipt.className,
      sectionName: receipt.sectionName,
      feePeriod: inferFeePeriodFromDate(receipt.collectedAt || new Date(), receipt.academicYear),
      lineItems: lineItems as unknown as Prisma.InputJsonValue,
      totalFee: totals.totalFee,
      netPayable: totals.netPayable,
      amountPaid: totals.amountPaid,
      balance: totals.balance,
      status,
      paymentMode: receipt.paymentMode,
      preparedBy: opts.preparedBy ?? receipt.collectedBy,
      feeReceiptId: receipt.id,
      remarks: receipt.remarks || '',
      institutionSnapshot: {
        ...ctx.institutionProfile,
        generatedFrom: 'receipt',
        syncSource: receipt.collectedBy?.toLowerCase().includes('razorpay')
          || receipt.remarks?.toLowerCase().includes('online')
          || receipt.paymentMode === 'UPI'
          ? 'mobile_or_link'
          : 'counter',
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
    periodType?: FeePeriodType;
    periodValue?: string;
    invoiceDate?: string | Date;
    dueDate?: string | Date | null;
    lineItems?: LineItem[];
    selectedHeads?: { key: string; amount?: number; label?: string }[];
    concessionAmount?: number;
    lateFee?: number;
    previousDues?: number;
    amountPaid?: number;
    remarks?: string;
    preparedBy?: string;
    status?: FeeInvoiceStatus;
  },
) {
  let studentName = data.studentName?.trim();
  let studentId = data.studentId ?? '';
  let admissionNumber = data.admissionNumber ?? '';
  let className = data.className ?? '';
  let sectionName = data.sectionName ?? '';
  let rollNumber = data.rollNumber ?? '';
  let parentName = data.parentName ?? '';
  let parentMobile = data.parentMobile ?? '';
  let parentEmail = data.parentEmail ?? '';
  let photoUrl = data.photoUrl ?? '';
  let academicYear = data.academicYear?.trim();

  if (studentId) {
    const student = await prisma.student.findFirst({ where: { id: studentId, institutionId } });
    if (!student) throw new Error('Student not found');
    studentName = [student.firstName, student.lastName].filter(Boolean).join(' ') || studentName;
    admissionNumber = student.admissionNumber || admissionNumber;
    className = student.className || className;
    sectionName = student.sectionName || sectionName;
    rollNumber = student.rollNumber || rollNumber;
    parentName = student.fatherName || parentName;
    parentMobile = student.fatherMobile || student.mobile || parentMobile;
    parentEmail = student.email || parentEmail;
    photoUrl = student.photoUrl || photoUrl;
    academicYear = academicYear || student.academicYear;
  }

  if (!studentName) throw new Error('Student name is required');
  if (!academicYear) throw new Error('Academic year is required');

  const ctx = await loadFeeCollectionContext(institutionId);

  let lineItems = (data.lineItems || []).map((i) => ({
    key: i.key,
    label: i.label || FEE_HEAD_LABELS[i.key] || i.key,
    amount: round2(i.amount),
  })).filter((i) => i.amount > 0);

  // Selected fee-structure heads (deposit invoice flow)
  if (lineItems.length === 0 && data.selectedHeads?.length) {
    const schedule = await resolveCollectionFeeSchedule(institutionId, {
      className,
      sectionName,
      studentId: studentId || undefined,
      academicYear,
    });
    const scheduleMap = new Map((schedule?.heads || []).map((h) => [h.key, h]));
    lineItems = data.selectedHeads
      .map((h) => {
        const fromSchedule = scheduleMap.get(h.key);
        const amount = round2(
          h.amount !== undefined && h.amount !== null
            ? Number(h.amount)
            : (fromSchedule?.amount ?? 0),
        );
        if (amount <= 0) return null;
        return {
          key: h.key,
          label: h.label || fromSchedule?.label || FEE_HEAD_LABELS[h.key] || h.key,
          amount,
        };
      })
      .filter((x): x is LineItem => x !== null);
  }

  if (lineItems.length === 0 && className) {
    lineItems = await lineItemsFromSchedule(institutionId, className, sectionName || '');
  }
  if (lineItems.length === 0) throw new Error('Select at least one fee head with amount > 0');

  let feePeriod = data.feePeriod?.trim() || '';
  if (!feePeriod && data.periodType) {
    feePeriod = formatFeePeriod({
      periodType: data.periodType,
      periodValue: data.periodValue || 'FY',
      academicYear,
    });
  }

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

  const invoiceNumber = await generateInvoiceNumber(institutionId, academicYear);

  const row = await prisma.feeInvoice.create({
    data: {
      institutionId,
      invoiceNumber,
      academicYear,
      studentId,
      studentName,
      admissionNumber,
      className,
      sectionName,
      rollNumber,
      parentName,
      parentMobile,
      parentEmail,
      photoUrl,
      feePeriod,
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
      institutionSnapshot: {
        ...ctx.institutionProfile,
        generatedFrom: 'admin_deposit',
        periodType: data.periodType || null,
        periodValue: data.periodValue || null,
      } as Prisma.InputJsonValue,
    },
  });
  return serializeFeeInvoice(row);
}

export async function getInvoiceCreateMeta(
  institutionId: string,
  opts: { academicYear?: string; studentId?: string; className?: string; sectionName?: string } = {},
) {
  const filters = await getInstitutionFilterMeta(institutionId);
  const academicYear = opts.academicYear || filters.defaultAcademicYear;
  const catalog = await getFeeStructureHeadCatalog(institutionId);

  let student: {
    id: string;
    name: string;
    admissionNumber: string;
    className: string;
    sectionName: string;
    rollNumber: string;
    parentName: string;
    parentMobile: string;
    academicYear: string;
  } | null = null;

  let className = opts.className || '';
  let sectionName = opts.sectionName || '';

  if (opts.studentId) {
    const row = await prisma.student.findFirst({ where: { id: opts.studentId, institutionId } });
    if (row) {
      student = {
        id: row.id,
        name: [row.firstName, row.lastName].filter(Boolean).join(' '),
        admissionNumber: row.admissionNumber,
        className: row.className,
        sectionName: row.sectionName,
        rollNumber: row.rollNumber,
        parentName: row.fatherName || '',
        parentMobile: row.fatherMobile || row.mobile || '',
        academicYear: row.academicYear,
      };
      className = row.className;
      sectionName = row.sectionName;
    }
  }

  const schedule = className
    ? await resolveCollectionFeeSchedule(institutionId, {
      className,
      sectionName,
      studentId: opts.studentId,
      academicYear: student?.academicYear || academicYear,
    })
    : null;

  const scheduleMap = new Map((schedule?.heads || []).map((h) => [h.key, h]));
  const feeHeads = catalog
    .filter((h) => h.showInInvoice !== false)
    .map((h) => ({
      key: h.key,
      label: h.label,
      amount: round2(scheduleMap.get(h.key)?.amount ?? h.defaultAmount ?? 0),
      selectedByDefault: (scheduleMap.get(h.key)?.amount ?? 0) > 0,
      fromStructure: scheduleMap.has(h.key),
    }));

  // Include any structure heads missing from catalog
  for (const h of schedule?.heads || []) {
    if (!feeHeads.some((x) => x.key === h.key)) {
      feeHeads.push({
        key: h.key,
        label: h.label,
        amount: round2(h.amount),
        selectedByDefault: h.amount > 0,
        fromStructure: true,
      });
    }
  }

  return {
    defaultAcademicYear: academicYear,
    academicYears: filters.academicYears,
    classes: filters.classes,
    sectionsByClass: filters.sectionsByClass,
    periods: getInvoicePeriodMeta(academicYear),
    student,
    feeHeads,
    scheduleSource: schedule?.source || null,
    scheduleFrequency: schedule?.frequency || null,
  };
}

export async function syncInvoicesFromPayments(
  institutionId: string,
  opts: { academicYear?: string; preparedBy?: string } = {},
) {
  const result = await generateInvoicesFromReceipts(institutionId, opts);
  return {
    created: result.created,
    invoices: result.invoices,
    message: result.created > 0
      ? `Synced ${result.created} invoice(s) from fee receipts (counter, mobile app, and payment links)`
      : 'All receipts already have invoices — nothing new to sync',
  };
}

export async function ensurePendingFeeInvoiceForStudent(
  institutionId: string,
  student: {
    id: string;
    firstName: string;
    lastName: string;
    admissionNumber: string;
    className: string;
    sectionName: string;
    academicYear: string;
    rollNumber?: string;
    fatherName?: string;
    fatherMobile?: string;
    mobile?: string;
    email?: string;
    photoUrl?: string;
  },
) {
  const studentName = `${student.firstName} ${student.lastName}`.trim();
  const existing = await prisma.feeInvoice.findFirst({
    where: {
      institutionId,
      studentId: student.id,
      academicYear: student.academicYear,
      status: {
        in: [FeeInvoiceStatus.PENDING, FeeInvoiceStatus.PARTIAL, FeeInvoiceStatus.DRAFT],
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  if (existing) return serializeFeeInvoice(existing);

  const schedule = await resolveCollectionFeeSchedule(institutionId, {
    className: student.className,
    sectionName: student.sectionName,
    studentId: student.id,
    academicYear: student.academicYear,
  });
  if (!schedule?.heads.length) return null;

  return createFeeInvoice(institutionId, {
    academicYear: student.academicYear,
    studentId: student.id,
    studentName,
    admissionNumber: student.admissionNumber,
    className: student.className,
    sectionName: student.sectionName,
    rollNumber: student.rollNumber || '',
    parentName: student.fatherName || '',
    parentMobile: student.fatherMobile || student.mobile || '',
    parentEmail: student.email || '',
    photoUrl: student.photoUrl || '',
    lineItems: schedule.heads.map((h) => ({
      key: h.key,
      label: h.label,
      amount: h.amount,
    })),
    status: FeeInvoiceStatus.PENDING,
    remarks: `Auto-generated from ${schedule.source.replace(/_/g, ' ')}`,
  });
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

/** Outstanding dues for Account Settlement — auto-populated from FeeDue + open invoices. */
export async function getStudentSettlementDues(
  institutionId: string,
  opts: {
    academicYear?: string;
    studentId?: string;
    admissionNumber?: string;
  },
) {
  const academicYear = opts.academicYear || '2025-26';
  const studentId = opts.studentId?.trim() || '';
  const admissionNumber = opts.admissionNumber?.trim() || '';
  if (!studentId && !admissionNumber) {
    throw new Error('Select a student to load total due fees');
  }

  const student = studentId
    ? await prisma.student.findFirst({
        where: { id: studentId, institutionId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          admissionNumber: true,
          className: true,
          sectionName: true,
          academicYear: true,
        },
      })
    : await prisma.student.findFirst({
        where: { institutionId, admissionNumber },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          admissionNumber: true,
          className: true,
          sectionName: true,
          academicYear: true,
        },
      });

  const resolvedStudentId = student?.id || studentId;
  const resolvedAdmission = student?.admissionNumber || admissionNumber;

  const [dues, invoices] = await Promise.all([
    prisma.feeDue.findMany({
      where: {
        institutionId,
        academicYear,
        status: { in: [FeeDueStatus.PENDING, FeeDueStatus.OVERDUE] },
        OR: [
          ...(resolvedStudentId ? [{ studentId: resolvedStudentId }] : []),
          ...(resolvedAdmission ? [{ admissionNumber: resolvedAdmission }] : []),
        ],
      },
    }),
    prisma.feeInvoice.findMany({
      where: {
        institutionId,
        academicYear,
        balance: { gt: 0 },
        status: {
          in: [
            FeeInvoiceStatus.PENDING,
            FeeInvoiceStatus.PARTIAL,
            FeeInvoiceStatus.OVERDUE,
            FeeInvoiceStatus.DRAFT,
          ],
        },
        OR: [
          ...(resolvedStudentId ? [{ studentId: resolvedStudentId }] : []),
          ...(resolvedAdmission ? [{ admissionNumber: resolvedAdmission }] : []),
        ],
      },
    }),
  ]);

  const dueFromLevies = round2(dues.reduce((s, d) => s + d.amount, 0));
  const dueFromInvoices = round2(invoices.reduce((s, i) => s + i.balance, 0));
  // Prefer the higher signal so we don't understate; invoice balances often mirror dues
  const totalDueFees = round2(Math.max(dueFromLevies, dueFromInvoices));

  return {
    academicYear,
    studentId: resolvedStudentId || '',
    studentName: student
      ? `${student.firstName} ${student.lastName}`.trim()
      : '',
    admissionNumber: resolvedAdmission || '',
    className: student?.className || '',
    sectionName: student?.sectionName || '',
    totalDueFees,
    dueFromLevies,
    dueFromInvoices,
    pendingDueCount: dues.length,
    openInvoiceCount: invoices.length,
  };
}

/** Outstanding fees across all academic sessions for account settlement. */
export async function getStudentAllSessionDues(
  institutionId: string,
  opts: {
    studentId?: string;
    admissionNumber?: string;
  },
) {
  const studentId = opts.studentId?.trim() || '';
  const admissionNumber = opts.admissionNumber?.trim() || '';
  if (!studentId && !admissionNumber) {
    throw new Error('Select a student to load total due fees');
  }

  const student = studentId
    ? await prisma.student.findFirst({
        where: { id: studentId, institutionId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          admissionNumber: true,
          className: true,
          sectionName: true,
          academicYear: true,
        },
      })
    : await prisma.student.findFirst({
        where: { institutionId, admissionNumber },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          admissionNumber: true,
          className: true,
          sectionName: true,
          academicYear: true,
        },
      });

  const resolvedStudentId = student?.id || studentId;
  const resolvedAdmission = student?.admissionNumber || admissionNumber;
  const studentOr: Array<{ studentId?: string; admissionNumber?: string }> = [
    ...(resolvedStudentId ? [{ studentId: resolvedStudentId }] : []),
    ...(resolvedAdmission ? [{ admissionNumber: resolvedAdmission }] : []),
  ];

  const [dues, invoices] = await Promise.all([
    prisma.feeDue.findMany({
      where: {
        institutionId,
        status: { in: [FeeDueStatus.PENDING, FeeDueStatus.OVERDUE] },
        OR: studentOr,
      },
      select: { academicYear: true, amount: true },
    }),
    prisma.feeInvoice.findMany({
      where: {
        institutionId,
        balance: { gt: 0 },
        status: {
          in: [
            FeeInvoiceStatus.PENDING,
            FeeInvoiceStatus.PARTIAL,
            FeeInvoiceStatus.OVERDUE,
            FeeInvoiceStatus.DRAFT,
          ],
        },
        OR: studentOr,
      },
      select: { academicYear: true, balance: true },
    }),
  ]);

  const sessionMap = new Map<string, { dueFromLevies: number; dueFromInvoices: number }>();
  for (const d of dues) {
    const key = d.academicYear || 'Unknown';
    const cur = sessionMap.get(key) || { dueFromLevies: 0, dueFromInvoices: 0 };
    cur.dueFromLevies = round2(cur.dueFromLevies + d.amount);
    sessionMap.set(key, cur);
  }
  for (const inv of invoices) {
    const key = inv.academicYear || 'Unknown';
    const cur = sessionMap.get(key) || { dueFromLevies: 0, dueFromInvoices: 0 };
    cur.dueFromInvoices = round2(cur.dueFromInvoices + inv.balance);
    sessionMap.set(key, cur);
  }

  const sessions = [...sessionMap.entries()]
    .map(([academicYear, v]) => ({
      academicYear,
      dueFromLevies: v.dueFromLevies,
      dueFromInvoices: v.dueFromInvoices,
      totalDueFees: round2(Math.max(v.dueFromLevies, v.dueFromInvoices)),
    }))
    .sort((a, b) => b.academicYear.localeCompare(a.academicYear));

  const totalDueFees = round2(sessions.reduce((s, row) => s + row.totalDueFees, 0));

  return {
    studentId: resolvedStudentId || '',
    studentName: student ? `${student.firstName} ${student.lastName}`.trim() : '',
    admissionNumber: resolvedAdmission || '',
    className: student?.className || '',
    sectionName: student?.sectionName || '',
    currentAcademicYear: student?.academicYear || '',
    totalDueFees,
    sessionCount: sessions.length,
    sessions,
    pendingDueCount: dues.length,
    openInvoiceCount: invoices.length,
  };
}

/** Applicants / new admissions for discount code student selection. */
export async function listAdmissionDiscountCandidates(
  institutionId: string,
  opts: { academicYear?: string; q?: string } = {},
) {
  const q = opts.q?.trim().toLowerCase() || '';
  const apps = await prisma.application.findMany({
    where: { institutionId },
    select: {
      id: true,
      applicationId: true,
      studentName: true,
      classApplied: true,
      status: true,
      submittedAt: true,
      admissionRecord: {
        select: {
          admissionNumber: true,
          className: true,
          sectionName: true,
          academicYear: true,
          student: {
            select: { id: true, admissionNumber: true, className: true, sectionName: true },
          },
        },
      },
    },
    orderBy: { submittedAt: 'desc' },
    take: 400,
  });

  return apps
    .map((app) => {
      const adm = app.admissionRecord;
      const student = adm?.student;
      const admissionNumber =
        student?.admissionNumber || adm?.admissionNumber || app.applicationId || '';
      const className = student?.className || adm?.className || app.classApplied || '';
      const sectionName = student?.sectionName || adm?.sectionName || '';
      return {
        key: `app:${app.id}`,
        source: 'APPLICATION' as const,
        applicationId: app.applicationId,
        applicationDbId: app.id,
        studentId: student?.id || '',
        studentName: app.studentName,
        admissionNumber,
        className,
        sectionName,
        academicYear: adm?.academicYear || opts.academicYear || '',
        status: String(app.status),
        submittedAt: app.submittedAt.toISOString(),
      };
    })
    .filter((row) => {
      if (!q) return true;
      return (
        row.studentName.toLowerCase().includes(q) ||
        row.admissionNumber.toLowerCase().includes(q) ||
        row.applicationId.toLowerCase().includes(q) ||
        row.className.toLowerCase().includes(q)
      );
    });
}

export async function createFeeDiscount(
  institutionId: string,
  data: {
    name?: string;
    description?: string;
    discountType?: string;
    value?: number;
    scope?: FeeDiscountScope;
    academicYear: string;
    maxUses?: number;
    studentId?: string;
    studentName?: string;
    admissionNumber?: string;
    className?: string;
    sectionName?: string;
    settlementAmount?: number;
    totalDueFees?: number;
    remarks?: string;
    code?: string;
    /** When true, create directly in PENDING_APPROVAL (Save & Send for Approval). */
    submitForApproval?: boolean;
  },
  requestedBy: string,
) {
  const scope = data.scope ?? FeeDiscountScope.NEW_ADMISSION;
  const isSettlement = scope === FeeDiscountScope.ACCOUNT_SETTLEMENT;

  if (isSettlement && !data.studentName?.trim() && !data.studentId?.trim()) {
    throw new Error('Select a student for account settlement');
  }
  if (isSettlement && !(Number(data.settlementAmount) > 0)) {
    throw new Error('Settlement amount is required');
  }
  if (isSettlement && !data.remarks?.trim()) {
    throw new Error('Reason for settlement is required');
  }

  const studentName = data.studentName?.trim() || '';
  const name =
    data.name?.trim() ||
    (isSettlement
      ? `Account Settlement — ${studentName || data.admissionNumber || 'Student'}`
      : '');
  if (!name) throw new Error('Discount name is required');
  if (!data.academicYear?.trim()) throw new Error('Academic year is required');

  const code =
    data.code?.trim() ||
    (isSettlement
      ? `STL-${Date.now().toString().slice(-8)}`
      : await generateDiscountCode(institutionId));

  const existing = await prisma.feeDiscount.findFirst({
    where: { institutionId, code },
  });
  if (existing) throw new Error(`Discount code "${code}" already exists`);

  const classLabel = [data.className, data.sectionName].filter(Boolean).join('-');
  const totalDue = round2(data.totalDueFees ?? 0);
  const descriptionParts = [
    data.description?.trim(),
    isSettlement && classLabel ? `Class ${classLabel}` : '',
    isSettlement && totalDue > 0 ? `Total due fees: ${totalDue}` : '',
  ].filter(Boolean);

  const row = await prisma.feeDiscount.create({
    data: {
      institutionId,
      code,
      name,
      description: descriptionParts.join(' | '),
      discountType: data.discountType ?? (isSettlement ? 'FLAT' : 'PERCENTAGE'),
      value: round2(isSettlement ? data.settlementAmount ?? 0 : data.value ?? 0),
      scope,
      academicYear: data.academicYear,
      maxUses: data.maxUses ?? 0,
      studentId: data.studentId ?? '',
      studentName,
      admissionNumber: data.admissionNumber ?? '',
      settlementAmount: round2(data.settlementAmount ?? 0),
      requestedBy,
      status:
        data.submitForApproval || isSettlement
          ? FeeApprovalStatus.PENDING_APPROVAL
          : FeeApprovalStatus.DRAFT,
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

const REFUND_DEPOSIT_HEADS: Array<{ key: string; label: string; match: string[] }> = [
  { key: 'admissionFee', label: 'Admission Fee', match: ['admission'] },
  { key: 'tuitionFee', label: 'Tuition Fee', match: ['tuition', 'studentfee', 'student_fee'] },
  { key: 'transportFee', label: 'Transport Fee', match: ['transport'] },
  { key: 'cautionMoney', label: 'Caution Money', match: ['caution'] },
  {
    key: 'librarySecurityDeposit',
    label: 'Library Security Deposit',
    match: ['librarysecurity', 'library_security', 'librarydeposit', 'library'],
  },
];

function mapDepositHead(key: string): { key: string; label: string } | null {
  const k = key.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const head of REFUND_DEPOSIT_HEADS) {
    if (head.match.some((m) => k.includes(m.replace(/_/g, '')))) {
      return { key: head.key, label: head.label };
    }
  }
  return null;
}

/** Amounts already deposited by fee head — shown on New Refund Request. */
export async function getStudentDepositedFees(
  institutionId: string,
  opts: {
    academicYear?: string;
    studentId?: string;
    admissionNumber?: string;
  },
) {
  const academicYear = opts.academicYear || '2025-26';
  const studentId = opts.studentId?.trim() || '';
  const admissionNumber = opts.admissionNumber?.trim() || '';
  if (!studentId && !admissionNumber) {
    throw new Error('Select a student to load deposited fees');
  }

  const student = studentId
    ? await prisma.student.findFirst({
        where: { id: studentId, institutionId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          admissionNumber: true,
          className: true,
          sectionName: true,
          admissionRecordId: true,
        },
      })
    : await prisma.student.findFirst({
        where: { institutionId, admissionNumber },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          admissionNumber: true,
          className: true,
          sectionName: true,
          admissionRecordId: true,
        },
      });

  const admNo = student?.admissionNumber || admissionNumber;
  const admissionRecordId = student?.admissionRecordId || undefined;

  const receiptOr = [
    ...(admNo ? [{ admissionNumber: admNo }] : []),
    ...(admissionRecordId ? [{ admissionRecordId }] : []),
  ];

  const receipts =
    receiptOr.length > 0
      ? await prisma.feeReceipt.findMany({
          where: {
            institutionId,
            academicYear,
            OR: receiptOr,
          },
          orderBy: { collectedAt: 'desc' },
        })
      : [];

  const totals: Record<string, number> = {};
  for (const head of REFUND_DEPOSIT_HEADS) totals[head.key] = 0;

  let otherDeposited = 0;
  for (const r of receipts) {
    const items = Array.isArray(r.feeBreakdown)
      ? (r.feeBreakdown as Array<{ key?: string; amount?: number }>)
      : r.feeBreakdown && typeof r.feeBreakdown === 'object'
        ? Object.entries(r.feeBreakdown as Record<string, unknown>).map(([key, amount]) => ({
            key,
            amount: Number(amount) || 0,
          }))
        : [];

    if (items.length === 0) {
      totals.tuitionFee = round2(totals.tuitionFee + r.amountPaid);
      continue;
    }

    for (const item of items) {
      const amount = Number(item.amount) || 0;
      if (amount <= 0) continue;
      const mapped = mapDepositHead(String(item.key || ''));
      if (mapped) {
        totals[mapped.key] = round2(totals[mapped.key] + amount);
      } else {
        otherDeposited = round2(otherDeposited + amount);
      }
    }
  }

  // Transport / hostel collections not always on fee receipts
  const [transportRows, hostelRows] = await Promise.all([
    admNo
      ? prisma.transportFeeCollection.findMany({
          where: { institutionId, academicYear, admissionNumber: admNo },
        })
      : Promise.resolve([]),
    admNo
      ? prisma.hostelFeeCollection.findMany({
          where: { institutionId, academicYear, admissionNumber: admNo },
        })
      : Promise.resolve([]),
  ]);
  for (const t of transportRows) {
    totals.transportFee = round2(totals.transportFee + t.amount);
  }
  for (const h of hostelRows) {
    otherDeposited = round2(otherDeposited + h.amount);
  }

  const heads = REFUND_DEPOSIT_HEADS.map((h) => ({
    key: h.key,
    label: h.label,
    amount: totals[h.key] || 0,
  }));
  if (otherDeposited > 0) {
    heads.push({ key: 'other', label: 'Other Collections', amount: otherDeposited });
  }

  const totalDeposited = round2(heads.reduce((s, h) => s + h.amount, 0));

  return {
    academicYear,
    studentId: student?.id || studentId || '',
    studentName: student ? `${student.firstName} ${student.lastName}`.trim() : '',
    admissionNumber: admNo || '',
    className: student?.className || '',
    sectionName: student?.sectionName || '',
    heads,
    totalDeposited,
    receiptCount: receipts.length,
    latestReceiptNumber: receipts[0]?.receiptNumber || '',
  };
}

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
    paymentMode?: string;
    remarks?: string;
    depositBreakdown?: Array<{ key: string; label: string; amount: number }>;
  },
  requestedBy: string,
) {
  const studentName = data.studentName?.trim();
  if (!studentName) throw new Error('Student name is required');
  if (!data.academicYear?.trim()) throw new Error('Academic year is required');
  const amount = round2(data.amount);
  if (amount <= 0) throw new Error('Refund amount must be greater than zero');

  const recordId = await generateRefundRecordId(institutionId, data.academicYear);

  // Route approval to HOD of Finance from HR Approval Hierarchy
  const { resolveModuleApprover } = await import('./approvalHierarchy.js');
  const approver = await resolveModuleApprover(institutionId, 'FEE_REFUND', 'HOD_FINANCE');

  let depositBreakdown = data.depositBreakdown || [];
  if (depositBreakdown.length === 0 && (data.studentId || data.admissionNumber)) {
    try {
      const deposited = await getStudentDepositedFees(institutionId, {
        academicYear: data.academicYear,
        studentId: data.studentId,
        admissionNumber: data.admissionNumber,
      });
      depositBreakdown = deposited.heads;
    } catch {
      depositBreakdown = [];
    }
  }

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
      paymentMode: data.paymentMode ?? 'BANK_TRANSFER',
      depositBreakdown: depositBreakdown as unknown as Prisma.InputJsonValue,
      pendingApproverRole: approver.roleLabel || approver.roleKey,
      pendingApproverName: approver.assigneeName || '',
      pendingApproverEmail: approver.assigneeEmail || '',
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
    fineTypeId?: string;
    category?: FeeFineCategory | string;
    academicYear: string;
    studentName: string;
    amount?: number;
    studentId?: string;
    admissionNumber?: string;
    className?: string;
    sectionName?: string;
    reason?: string;
    dueDate?: string | Date | null;
    submitForApproval?: boolean;
    requestedBy?: string;
  },
) {
  const studentName = data.studentName?.trim();
  if (!studentName) throw new Error('Student name is required');
  if (!data.academicYear?.trim()) throw new Error('Academic year is required');
  if (!data.reason?.trim()) throw new Error('Reason for fine is required');

  let fineType = data.fineTypeId
    ? await prisma.feeFineType.findFirst({
        where: { id: data.fineTypeId, institutionId },
      })
    : null;

  if (!fineType && data.category) {
    fineType = await prisma.feeFineType.findFirst({
      where: {
        institutionId,
        category: data.category as FeeFineCategory,
        status: FeeMasterStatus.ACTIVE,
      },
      orderBy: { name: 'asc' },
    });
  }

  if (!fineType && data.category) {
    const cat = String(data.category);
    const code = `FN-${cat.replace(/_/g, '-').slice(0, 12)}-${Date.now().toString().slice(-4)}`;
    fineType = await prisma.feeFineType.create({
      data: {
        institutionId,
        code,
        name: cat.replace(/_/g, ' '),
        category: cat as FeeFineCategory,
        defaultAmount: round2(data.amount ?? 0),
        description: `Auto-created for ${cat} fines`,
        status: FeeMasterStatus.ACTIVE,
      },
    });
  }

  if (!fineType) throw new Error('Select a fine category or fine type');

  const amount = round2(data.amount ?? fineType.defaultAmount);
  if (amount <= 0) throw new Error('Fine amount must be greater than zero');

  const { resolveModuleApprover } = await import('./approvalHierarchy.js');
  const approver = await resolveModuleApprover(institutionId, 'FEE_FINE', 'HOD_FINANCE');
  const sendForApproval = data.submitForApproval !== false;

  const row = await prisma.feeFineLevy.create({
    data: {
      institutionId,
      fineTypeId: fineType.id,
      academicYear: data.academicYear,
      studentId: data.studentId ?? '',
      studentName,
      admissionNumber: data.admissionNumber ?? '',
      className: data.className ?? '',
      sectionName: data.sectionName ?? '',
      amount,
      reason: data.reason.trim(),
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      status: sendForApproval
        ? FeeFineLevyStatus.PENDING_APPROVAL
        : FeeFineLevyStatus.PENDING,
      pendingApproverRole: approver.roleLabel || approver.roleKey,
      pendingApproverName: approver.assigneeName || '',
      pendingApproverEmail: approver.assigneeEmail || '',
      requestedBy: data.requestedBy ?? '',
    },
    include: { fineType: { select: { code: true, name: true, category: true } } },
  });
  return serializeFeeFineLevy(row);
}

export async function approveFeeFineLevy(institutionId: string, id: string, approvedBy: string) {
  const existing = await prisma.feeFineLevy.findFirst({ where: { id, institutionId } });
  if (!existing) throw new Error('Fine levy not found');
  if (existing.status !== FeeFineLevyStatus.PENDING_APPROVAL) {
    throw new Error('Only fines pending approval can be approved');
  }
  const row = await prisma.feeFineLevy.update({
    where: { id },
    data: {
      status: FeeFineLevyStatus.PENDING,
      approvedBy,
      approvedAt: new Date(),
      rejectionReason: '',
    },
    include: { fineType: { select: { code: true, name: true, category: true } } },
  });
  return serializeFeeFineLevy(row);
}

export async function rejectFeeFineLevy(
  institutionId: string,
  id: string,
  approvedBy: string,
  reason: string,
) {
  const existing = await prisma.feeFineLevy.findFirst({ where: { id, institutionId } });
  if (!existing) throw new Error('Fine levy not found');
  if (existing.status !== FeeFineLevyStatus.PENDING_APPROVAL) {
    throw new Error('Only fines pending approval can be rejected');
  }
  const row = await prisma.feeFineLevy.update({
    where: { id },
    data: {
      status: FeeFineLevyStatus.CANCELLED,
      approvedBy,
      approvedAt: new Date(),
      rejectionReason: reason?.trim() || 'Rejected',
    },
    include: { fineType: { select: { code: true, name: true, category: true } } },
  });
  return serializeFeeFineLevy(row);
}

export async function markFinePaid(institutionId: string, id: string) {
  const existing = await prisma.feeFineLevy.findFirst({ where: { id, institutionId } });
  if (!existing) throw new Error('Fine levy not found');
  if (existing.status === FeeFineLevyStatus.PENDING_APPROVAL) {
    throw new Error('Approve the fine before marking it paid');
  }
  if (existing.status === FeeFineLevyStatus.WAIVED) {
    throw new Error('Waived fines cannot be marked as paid');
  }
  if (existing.status === FeeFineLevyStatus.CANCELLED) {
    throw new Error('Cancelled fines cannot be marked as paid');
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
  if (existing.status === FeeFineLevyStatus.CANCELLED) {
    throw new Error('Cancelled fines cannot be waived');
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

export async function getStudentScholarshipContext(
  institutionId: string,
  opts: {
    academicYear?: string;
    studentId?: string;
    admissionNumber?: string;
  },
) {
  const dues = await getStudentSettlementDues(institutionId, opts);
  const studentId = dues.studentId;
  if (!studentId) {
    return {
      ...dues,
      entranceTestResult: '',
      entranceTestScore: null as number | null,
      entranceTestMax: null as number | null,
      lastClassPercent: 0,
      lastClassTotal: 0,
      lastClassObtain: 0,
      lastClassSource: '',
    };
  }

  const student = await prisma.student.findFirst({
    where: { id: studentId, institutionId },
    select: {
      id: true,
      entranceScore: true,
      customFields: true,
      admissionRecord: {
        select: {
          application: {
            select: {
              entranceTestScore: true,
              entranceTestMax: true,
              manualEntranceTest: {
                select: {
                  percentScore: true,
                  totalMaxMarks: true,
                  totalObtained: true,
                },
              },
              seatAllocation: {
                select: { entranceScore: true },
              },
            },
          },
        },
      },
    },
  });

  const application = student?.admissionRecord?.application;
  let entranceTestScore: number | null = null;
  let entranceTestMax: number | null = null;
  let entranceTestResult = '';

  if (application?.manualEntranceTest) {
    entranceTestScore = application.manualEntranceTest.percentScore;
    entranceTestMax = application.manualEntranceTest.totalMaxMarks;
    entranceTestResult = `${round2(application.manualEntranceTest.totalObtained)} / ${round2(application.manualEntranceTest.totalMaxMarks)} (${round2(application.manualEntranceTest.percentScore)}%)`;
  } else if (application?.entranceTestScore != null) {
    entranceTestScore = application.entranceTestScore;
    entranceTestMax = application.entranceTestMax ?? 100;
    entranceTestResult = `${round2(entranceTestScore)} / ${round2(entranceTestMax)}`;
  } else if (application?.seatAllocation?.entranceScore != null) {
    entranceTestScore = application.seatAllocation.entranceScore;
    entranceTestResult = String(round2(entranceTestScore));
  } else if (student?.entranceScore != null) {
    entranceTestScore = student.entranceScore;
    entranceTestResult = String(round2(entranceTestScore));
  }

  let lastClassPercent = 0;
  let lastClassTotal = 0;
  let lastClassObtain = 0;
  let lastClassSource = '';

  const session = await prisma.studentSessionHistory.findFirst({
    where: { institutionId, studentId },
    orderBy: { promotedAt: 'desc' },
    select: {
      finalPercentage: true,
      resultSnapshot: true,
      fromClassName: true,
      fromAcademicYear: true,
    },
  });

  if (session) {
    lastClassSource = `Session history (${session.fromClassName || session.fromAcademicYear})`;
    const snap = (session.resultSnapshot || {}) as Record<string, unknown>;
    lastClassPercent = round2(
      session.finalPercentage ??
        (typeof snap.percentage === 'number' ? snap.percentage : 0) ??
        0,
    );
    lastClassTotal = round2(
      typeof snap.totalMax === 'number'
        ? snap.totalMax
        : typeof snap.total === 'number'
          ? snap.total
          : 0,
    );
    lastClassObtain = round2(
      typeof snap.totalObtained === 'number'
        ? snap.totalObtained
        : typeof snap.obtain === 'number'
          ? snap.obtain
          : 0,
    );
    if (lastClassPercent > 0 && lastClassTotal <= 0) {
      lastClassTotal = 100;
      lastClassObtain = round2((lastClassPercent / 100) * lastClassTotal);
    }
  }

  if (lastClassPercent <= 0 && lastClassObtain <= 0) {
    const examResult = await prisma.examStudentResult.findFirst({
      where: { institutionId, studentId },
      orderBy: { createdAt: 'desc' },
      select: { percentage: true, totalMax: true, totalObtained: true },
    });
    if (examResult) {
      lastClassPercent = round2(examResult.percentage);
      lastClassTotal = round2(examResult.totalMax);
      lastClassObtain = round2(examResult.totalObtained);
      lastClassSource = 'Exam result';
    }
  }

  if (lastClassPercent <= 0 && lastClassObtain <= 0) {
    const classTest = await prisma.academicClassTestScore.findFirst({
      where: { institutionId, studentId },
      orderBy: { updatedAt: 'desc' },
      select: { percentage: true, maxMarks: true, marksObtained: true },
    });
    if (classTest) {
      lastClassPercent = round2(classTest.percentage);
      lastClassTotal = round2(classTest.maxMarks);
      lastClassObtain = round2(classTest.marksObtained);
      lastClassSource = 'Class test';
    }
  }

  if (lastClassPercent <= 0 && lastClassObtain <= 0 && student?.customFields) {
    const cf = student.customFields as Record<string, unknown>;
    const percent = Number(cf.lastClassPercent ?? cf.previousPercent ?? 0);
    const total = Number(cf.lastClassTotal ?? cf.previousTotal ?? 0);
    const obtain = Number(cf.lastClassObtain ?? cf.previousObtain ?? 0);
    if (percent > 0 || obtain > 0 || total > 0) {
      lastClassPercent = round2(percent);
      lastClassTotal = round2(total);
      lastClassObtain = round2(obtain);
      lastClassSource = 'Student profile';
    }
  }

  return {
    ...dues,
    entranceTestResult,
    entranceTestScore,
    entranceTestMax,
    lastClassPercent,
    lastClassTotal,
    lastClassObtain,
    lastClassSource,
  };
}

function computeScholarshipAwardAmount(
  scholarship: { waiverType: string; waiverValue: number; budgetAllocated: number; budgetUsed: number },
  totalDueFees: number,
  requestedAmount?: number,
) {
  const remaining = round2(scholarship.budgetAllocated - scholarship.budgetUsed);
  let amount = round2(requestedAmount ?? 0);
  if (amount <= 0) {
    const waiverType = (scholarship.waiverType || '').toUpperCase();
    if (waiverType === 'PERCENT' || waiverType === 'PERCENTAGE') {
      amount = round2((Math.max(totalDueFees, 0) * scholarship.waiverValue) / 100);
    } else {
      amount = round2(scholarship.waiverValue);
    }
  }
  if (scholarship.budgetAllocated > 0 && remaining > 0 && amount > remaining) {
    amount = remaining;
  }
  return amount;
}

export async function awardScholarship(
  institutionId: string,
  data: {
    scholarshipId: string;
    academicYear: string;
    studentName: string;
    amount?: number;
    studentId?: string;
    admissionNumber?: string;
    className?: string;
    sectionName?: string;
    reason?: string;
    remarks?: string;
    totalDueFees?: number;
    entranceTestResult?: string;
    lastClassPercent?: number;
    lastClassTotal?: number;
    lastClassObtain?: number;
  },
) {
  const studentName = data.studentName?.trim();
  if (!studentName) throw new Error('Student name is required');
  if (!data.academicYear?.trim()) throw new Error('Academic year is required');
  const reason = (data.reason ?? data.remarks ?? '').trim();
  if (!reason) throw new Error('Reason for scholarship is required');

  const scholarship = await prisma.feeScholarship.findFirst({
    where: { id: data.scholarshipId, institutionId },
  });
  if (!scholarship) throw new Error('Scholarship not found');
  if (
    scholarship.status !== FeeApprovalStatus.ACTIVE &&
    scholarship.status !== FeeApprovalStatus.APPROVED
  ) {
    throw new Error('Scholarship must be active before awarding');
  }

  let context = {
    totalDueFees: round2(data.totalDueFees ?? 0),
    entranceTestResult: data.entranceTestResult ?? '',
    lastClassPercent: round2(data.lastClassPercent ?? 0),
    lastClassTotal: round2(data.lastClassTotal ?? 0),
    lastClassObtain: round2(data.lastClassObtain ?? 0),
    sectionName: data.sectionName ?? '',
    admissionNumber: data.admissionNumber ?? '',
    className: data.className ?? '',
    studentId: data.studentId ?? '',
  };

  if (data.studentId || data.admissionNumber) {
    try {
      const fetched = await getStudentScholarshipContext(institutionId, {
        academicYear: data.academicYear,
        studentId: data.studentId,
        admissionNumber: data.admissionNumber,
      });
      context = {
        totalDueFees: data.totalDueFees != null ? round2(data.totalDueFees) : fetched.totalDueFees,
        entranceTestResult: data.entranceTestResult || fetched.entranceTestResult,
        lastClassPercent:
          data.lastClassPercent != null ? round2(data.lastClassPercent) : fetched.lastClassPercent,
        lastClassTotal:
          data.lastClassTotal != null ? round2(data.lastClassTotal) : fetched.lastClassTotal,
        lastClassObtain:
          data.lastClassObtain != null ? round2(data.lastClassObtain) : fetched.lastClassObtain,
        sectionName: data.sectionName || fetched.sectionName || '',
        admissionNumber: data.admissionNumber || fetched.admissionNumber || '',
        className: data.className || fetched.className || '',
        studentId: data.studentId || fetched.studentId || '',
      };
    } catch {
      // keep provided snapshot
    }
  }

  const amount = computeScholarshipAwardAmount(
    scholarship,
    context.totalDueFees,
    data.amount,
  );
  if (amount <= 0) throw new Error('Award amount must be greater than zero');

  const { resolveModuleApprover } = await import('./approvalHierarchy.js');
  const approver = await resolveModuleApprover(institutionId, 'FEE_SCHOLARSHIP_AWARD', 'PRINCIPAL');

  const row = await prisma.feeScholarshipAward.create({
    data: {
      institutionId,
      scholarshipId: data.scholarshipId,
      academicYear: data.academicYear,
      studentId: context.studentId,
      studentName,
      admissionNumber: context.admissionNumber,
      className: context.className,
      sectionName: context.sectionName,
      amount,
      reason,
      totalDueFees: context.totalDueFees,
      entranceTestResult: context.entranceTestResult,
      lastClassPercent: context.lastClassPercent,
      lastClassTotal: context.lastClassTotal,
      lastClassObtain: context.lastClassObtain,
      status: FeeApprovalStatus.PENDING_APPROVAL,
      pendingApproverRole: approver.roleLabel || approver.roleKey,
      pendingApproverName: approver.assigneeName || '',
      pendingApproverEmail: approver.assigneeEmail || '',
      remarks: reason,
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
        pendingApproverRole: '',
        pendingApproverName: '',
        pendingApproverEmail: '',
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
      reason: reason?.trim() || existing.reason,
      pendingApproverRole: '',
      pendingApproverName: '',
      pendingApproverEmail: '',
    },
    include: { scholarship: { select: { code: true, name: true } } },
  });
  return serializeScholarshipAward(row);
}

// ─── Transport Fee ─────────────────────────────────────────────────────────────

export async function listTransportRouteOptions(institutionId: string, academicYear?: string) {
  const where: Prisma.TransportRouteWhereInput = {
    institutionId,
    isActive: true,
    isArchived: false,
  };
  if (academicYear) where.academicYear = academicYear;
  const rows = await prisma.transportRoute.findMany({
    where,
    select: { id: true, routeCode: true, routeName: true, academicYear: true },
    orderBy: { routeName: 'asc' },
  });
  if (rows.length === 0 && academicYear) {
    return prisma.transportRoute.findMany({
      where: { institutionId, isActive: true, isArchived: false },
      select: { id: true, routeCode: true, routeName: true, academicYear: true },
      orderBy: { routeName: 'asc' },
    });
  }
  return rows;
}

export async function getStudentTransportCollectContext(
  institutionId: string,
  opts: {
    academicYear?: string;
    studentId?: string;
    admissionNumber?: string;
  },
) {
  const dues = await getStudentSettlementDues(institutionId, opts);
  const academicYear = dues.academicYear;
  const studentId = dues.studentId;
  const admissionNumber = dues.admissionNumber;

  let suggestedRouteId = '';
  let suggestedRouteName = '';
  let suggestedMonthlyAmount = 0;

  if (studentId || admissionNumber) {
    const enrollment = await prisma.transportStudentEnrollment.findFirst({
      where: {
        institutionId,
        OR: [
          ...(studentId ? [{ studentId }] : []),
          ...(admissionNumber ? [{ admissionNumber }] : []),
        ],
      },
      include: {
        route: { select: { id: true, routeName: true } },
        feeAssignments: {
          where: { status: 'ACTIVE', academicYear },
          orderBy: { updatedAt: 'desc' },
          take: 1,
          select: { netAmount: true, assignedAmount: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
    if (enrollment) {
      suggestedRouteId = enrollment.routeId || enrollment.route?.id || '';
      suggestedRouteName = enrollment.route?.routeName || '';
      const assignment = enrollment.feeAssignments[0];
      if (assignment) {
        suggestedMonthlyAmount = round2(assignment.netAmount || assignment.assignedAmount || 0);
      }
    }
  }

  return {
    ...dues,
    suggestedRouteId,
    suggestedRouteName,
    suggestedMonthlyAmount,
    totalDueFees: dues.totalDueFees,
  };
}

export async function listTransportVendors(institutionId: string) {
  await syncTransportVendorCompliance(institutionId);
  const rows = await prisma.transportFeeVendor.findMany({
    where: { institutionId },
    orderBy: { vendorName: 'asc' },
  });
  return rows.map(serializeTransportVendor);
}

export async function getTransportVendor(institutionId: string, id: string) {
  const row = await prisma.transportFeeVendor.findFirst({ where: { id, institutionId } });
  if (!row) throw new Error('Transport vendor not found');
  return serializeTransportVendor(row);
}

type TransportVendorInput = {
  vendorCode: string;
  vendorName: string;
  contactPerson?: string;
  mobile?: string;
  email?: string;
  address?: string;
  routesCovered?: string;
  vehicleCount?: number;
  bankDetails?: Record<string, unknown>;
  ownerPan?: string;
  ownerAadhaar?: string;
  driver1Name?: string;
  driver1Mobile?: string;
  driver1DlNumber?: string;
  driver1DlExpiry?: string | null;
  driver1PoliceVerification?: string;
  driver2Name?: string;
  driver2Mobile?: string;
  driver2DlNumber?: string;
  driver2DlExpiry?: string | null;
  driver2PoliceVerification?: string;
  vehicleRegNo?: string;
  vehicleChassisNo?: string;
  vehicleType?: string;
  pollutionCertDate?: string | null;
  pollutionExpiryDate?: string | null;
  insurancePolicyNo?: string;
  insuranceExpiryDate?: string | null;
  trackingGpsDeviceId?: string;
  trackingPhoneAccess?: string;
  documents?: TransportVendorDocument[];
  remarks?: string;
  sendForApproval?: boolean;
};

export async function createTransportVendor(
  institutionId: string,
  data: TransportVendorInput,
  requestedBy: string,
) {
  const vendorCode = data.vendorCode?.trim();
  const vendorName = data.vendorName?.trim();
  if (!vendorCode) throw new Error('Vendor code is required');
  if (!vendorName) throw new Error('Vendor name is required');

  const existing = await prisma.transportFeeVendor.findFirst({
    where: { institutionId, vendorCode },
  });
  if (existing) throw new Error(`Vendor with code "${vendorCode}" already exists`);

  const sendForApproval = data.sendForApproval !== false;
  const { resolveModuleApprover } = await import('./approvalHierarchy.js');
  const approver = sendForApproval
    ? await resolveModuleApprover(institutionId, 'FEE_TRANSPORT_VENDOR', 'PRINCIPAL')
    : {
        roleKey: '',
        roleLabel: '',
        assigneeName: '',
        assigneeEmail: '',
      };

  const pollutionExpiryDate = parseDateOnly(data.pollutionExpiryDate);
  const insuranceExpiryDate = parseDateOnly(data.insuranceExpiryDate);
  const expired =
    isExpiredDate(pollutionExpiryDate) || isExpiredDate(insuranceExpiryDate);

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
      ownerPan: data.ownerPan ?? '',
      ownerAadhaar: data.ownerAadhaar ?? '',
      driver1Name: data.driver1Name ?? '',
      driver1Mobile: data.driver1Mobile ?? '',
      driver1DlNumber: data.driver1DlNumber ?? '',
      driver1DlExpiry: parseDateOnly(data.driver1DlExpiry),
      driver1PoliceVerification: data.driver1PoliceVerification ?? '',
      driver2Name: data.driver2Name ?? '',
      driver2Mobile: data.driver2Mobile ?? '',
      driver2DlNumber: data.driver2DlNumber ?? '',
      driver2DlExpiry: parseDateOnly(data.driver2DlExpiry),
      driver2PoliceVerification: data.driver2PoliceVerification ?? '',
      vehicleRegNo: data.vehicleRegNo ?? '',
      vehicleChassisNo: data.vehicleChassisNo ?? '',
      vehicleType: data.vehicleType ?? '',
      pollutionCertDate: parseDateOnly(data.pollutionCertDate),
      pollutionExpiryDate,
      insurancePolicyNo: data.insurancePolicyNo ?? '',
      insuranceExpiryDate,
      trackingGpsDeviceId: data.trackingGpsDeviceId ?? '',
      trackingPhoneAccess: data.trackingPhoneAccess ?? '',
      documents: (data.documents ?? []) as unknown as Prisma.InputJsonValue,
      complianceCategory: expired ? 'RED' : 'NORMAL',
      pendingApproverRole: sendForApproval ? approver.roleLabel || approver.roleKey : '',
      pendingApproverName: sendForApproval ? approver.assigneeName || '' : '',
      pendingApproverEmail: sendForApproval ? approver.assigneeEmail || '' : '',
      requestedBy,
      status: sendForApproval
        ? TransportVendorStatus.PENDING_APPROVAL
        : TransportVendorStatus.EMPANELLED,
      remarks: data.remarks ?? '',
    },
  });

  if (expired) {
    await notifyPrincipalVendorCompliance(institutionId, row.id, row.vendorName, {
      pollutionExpired: isExpiredDate(pollutionExpiryDate),
      insuranceExpired: isExpiredDate(insuranceExpiryDate),
    });
  }

  return serializeTransportVendor(row);
}

export async function updateTransportVendor(
  institutionId: string,
  id: string,
  data: Partial<TransportVendorInput> & { status?: TransportVendorStatus },
) {
  const existing = await prisma.transportFeeVendor.findFirst({ where: { id, institutionId } });
  if (!existing) throw new Error('Transport vendor not found');

  const pollutionExpiryDate =
    data.pollutionExpiryDate !== undefined
      ? parseDateOnly(data.pollutionExpiryDate)
      : existing.pollutionExpiryDate;
  const insuranceExpiryDate =
    data.insuranceExpiryDate !== undefined
      ? parseDateOnly(data.insuranceExpiryDate)
      : existing.insuranceExpiryDate;
  const expired =
    isExpiredDate(pollutionExpiryDate) || isExpiredDate(insuranceExpiryDate);

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
      ...(data.ownerPan !== undefined ? { ownerPan: data.ownerPan } : {}),
      ...(data.ownerAadhaar !== undefined ? { ownerAadhaar: data.ownerAadhaar } : {}),
      ...(data.driver1Name !== undefined ? { driver1Name: data.driver1Name } : {}),
      ...(data.driver1Mobile !== undefined ? { driver1Mobile: data.driver1Mobile } : {}),
      ...(data.driver1DlNumber !== undefined ? { driver1DlNumber: data.driver1DlNumber } : {}),
      ...(data.driver1DlExpiry !== undefined
        ? { driver1DlExpiry: parseDateOnly(data.driver1DlExpiry) }
        : {}),
      ...(data.driver1PoliceVerification !== undefined
        ? { driver1PoliceVerification: data.driver1PoliceVerification }
        : {}),
      ...(data.driver2Name !== undefined ? { driver2Name: data.driver2Name } : {}),
      ...(data.driver2Mobile !== undefined ? { driver2Mobile: data.driver2Mobile } : {}),
      ...(data.driver2DlNumber !== undefined ? { driver2DlNumber: data.driver2DlNumber } : {}),
      ...(data.driver2DlExpiry !== undefined
        ? { driver2DlExpiry: parseDateOnly(data.driver2DlExpiry) }
        : {}),
      ...(data.driver2PoliceVerification !== undefined
        ? { driver2PoliceVerification: data.driver2PoliceVerification }
        : {}),
      ...(data.vehicleRegNo !== undefined ? { vehicleRegNo: data.vehicleRegNo } : {}),
      ...(data.vehicleChassisNo !== undefined ? { vehicleChassisNo: data.vehicleChassisNo } : {}),
      ...(data.vehicleType !== undefined ? { vehicleType: data.vehicleType } : {}),
      ...(data.pollutionCertDate !== undefined
        ? { pollutionCertDate: parseDateOnly(data.pollutionCertDate) }
        : {}),
      ...(data.pollutionExpiryDate !== undefined ? { pollutionExpiryDate } : {}),
      ...(data.insurancePolicyNo !== undefined ? { insurancePolicyNo: data.insurancePolicyNo } : {}),
      ...(data.insuranceExpiryDate !== undefined ? { insuranceExpiryDate } : {}),
      ...(data.trackingGpsDeviceId !== undefined
        ? { trackingGpsDeviceId: data.trackingGpsDeviceId }
        : {}),
      ...(data.trackingPhoneAccess !== undefined
        ? { trackingPhoneAccess: data.trackingPhoneAccess }
        : {}),
      ...(data.documents !== undefined
        ? { documents: data.documents as unknown as Prisma.InputJsonValue }
        : {}),
      ...(data.remarks !== undefined ? { remarks: data.remarks } : {}),
      complianceCategory: expired ? 'RED' : 'NORMAL',
      ...(data.status !== undefined
        ? { status: data.status }
        : expired &&
            existing.status !== TransportVendorStatus.PENDING_APPROVAL &&
            existing.status !== TransportVendorStatus.REJECTED
          ? { status: TransportVendorStatus.RED_CATEGORY }
          : {}),
    },
  });

  if (expired && existing.complianceCategory !== 'RED') {
    await notifyPrincipalVendorCompliance(institutionId, row.id, row.vendorName, {
      pollutionExpired: isExpiredDate(pollutionExpiryDate),
      insuranceExpired: isExpiredDate(insuranceExpiryDate),
    });
  }

  return serializeTransportVendor(row);
}

export async function approveTransportVendor(
  institutionId: string,
  id: string,
  approvedBy: string,
) {
  const existing = await prisma.transportFeeVendor.findFirst({ where: { id, institutionId } });
  if (!existing) throw new Error('Transport vendor not found');
  if (existing.status !== TransportVendorStatus.PENDING_APPROVAL) {
    throw new Error('Only pending vendors can be approved');
  }
  const expired =
    isExpiredDate(existing.pollutionExpiryDate) || isExpiredDate(existing.insuranceExpiryDate);
  const row = await prisma.transportFeeVendor.update({
    where: { id },
    data: {
      status: expired ? TransportVendorStatus.RED_CATEGORY : TransportVendorStatus.EMPANELLED,
      complianceCategory: expired ? 'RED' : 'NORMAL',
      approvedBy,
      approvedAt: new Date(),
      rejectionReason: '',
      pendingApproverRole: '',
      pendingApproverName: '',
      pendingApproverEmail: '',
    },
  });
  return serializeTransportVendor(row);
}

export async function rejectTransportVendor(
  institutionId: string,
  id: string,
  approvedBy: string,
  reason: string,
) {
  const existing = await prisma.transportFeeVendor.findFirst({ where: { id, institutionId } });
  if (!existing) throw new Error('Transport vendor not found');
  if (existing.status !== TransportVendorStatus.PENDING_APPROVAL) {
    throw new Error('Only pending vendors can be rejected');
  }
  const row = await prisma.transportFeeVendor.update({
    where: { id },
    data: {
      status: TransportVendorStatus.REJECTED,
      approvedBy,
      approvedAt: new Date(),
      rejectionReason: reason?.trim() || 'Rejected',
      pendingApproverRole: '',
      pendingApproverName: '',
      pendingApproverEmail: '',
    },
  });
  return serializeTransportVendor(row);
}

async function notifyPrincipalVendorCompliance(
  institutionId: string,
  vendorId: string,
  vendorName: string,
  flags: { pollutionExpired: boolean; insuranceExpired: boolean },
) {
  const { resolveModuleApprover } = await import('./approvalHierarchy.js');
  const approver = await resolveModuleApprover(institutionId, 'FEE_TRANSPORT_VENDOR', 'PRINCIPAL');
  const parts: string[] = [];
  if (flags.pollutionExpired) parts.push('pollution certificate');
  if (flags.insuranceExpired) parts.push('insurance');
  const label = parts.join(' and ') || 'compliance documents';
  const alertType = flags.pollutionExpired && flags.insuranceExpired
    ? 'COMPLIANCE_EXPIRED'
    : flags.pollutionExpired
      ? 'POLLUTION_EXPIRED'
      : 'INSURANCE_EXPIRED';

  const existingOpen = await prisma.transportVendorComplianceAlert.findFirst({
    where: { institutionId, vendorId, alertType, status: 'OPEN' },
  });
  if (existingOpen) return existingOpen;

  return prisma.transportVendorComplianceAlert.create({
    data: {
      institutionId,
      vendorId,
      alertType,
      title: `Transport vendor red category — ${vendorName}`,
      message: `Vendor "${vendorName}" has expired ${label}. Vehicle placed in red category until documents are renewed.`,
      recipientRole: approver.roleLabel || 'Principal',
      recipientName: approver.assigneeName || '',
      recipientEmail: approver.assigneeEmail || '',
      status: 'OPEN',
    },
  });
}

export async function syncTransportVendorCompliance(institutionId: string) {
  const vendors = await prisma.transportFeeVendor.findMany({
    where: {
      institutionId,
      status: {
        notIn: [TransportVendorStatus.REJECTED, TransportVendorStatus.PENDING_APPROVAL],
      },
    },
  });
  const today = startOfTodayUtc();
  const reminderHorizonDays = 15;
  let flagged = 0;
  let reminders = 0;

  for (const vendor of vendors) {
    const pollutionExpired = isExpiredDate(vendor.pollutionExpiryDate, today);
    const insuranceExpired = isExpiredDate(vendor.insuranceExpiryDate, today);
    const expired = pollutionExpired || insuranceExpired;

    if (expired) {
      if (
        vendor.complianceCategory !== 'RED' ||
        vendor.status !== TransportVendorStatus.RED_CATEGORY
      ) {
        await prisma.transportFeeVendor.update({
          where: { id: vendor.id },
          data: {
            complianceCategory: 'RED',
            status: TransportVendorStatus.RED_CATEGORY,
          },
        });
        flagged += 1;
      }
      await notifyPrincipalVendorCompliance(institutionId, vendor.id, vendor.vendorName, {
        pollutionExpired,
        insuranceExpired,
      });
      continue;
    }

    if (vendor.complianceCategory === 'RED' || vendor.status === TransportVendorStatus.RED_CATEGORY) {
      await prisma.transportFeeVendor.update({
        where: { id: vendor.id },
        data: {
          complianceCategory: 'NORMAL',
          status:
            vendor.status === TransportVendorStatus.RED_CATEGORY
              ? TransportVendorStatus.EMPANELLED
              : vendor.status,
        },
      });
    }

    for (const [alertType, expiry, label] of [
      ['POLLUTION_RENEWAL_REMINDER', vendor.pollutionExpiryDate, 'pollution certificate'],
      ['INSURANCE_RENEWAL_REMINDER', vendor.insuranceExpiryDate, 'insurance'],
    ] as const) {
      const days = daysUntil(expiry, today);
      if (days == null || days < 0 || days > reminderHorizonDays) continue;
      const existing = await prisma.transportVendorComplianceAlert.findFirst({
        where: { institutionId, vendorId: vendor.id, alertType, status: 'OPEN' },
      });
      if (existing) continue;
      const { resolveModuleApprover } = await import('./approvalHierarchy.js');
      const approver = await resolveModuleApprover(institutionId, 'FEE_TRANSPORT_VENDOR', 'PRINCIPAL');
      await prisma.transportVendorComplianceAlert.create({
        data: {
          institutionId,
          vendorId: vendor.id,
          alertType,
          title: `Renew ${label} — ${vendor.vendorName}`,
          message: `${label} for vendor "${vendor.vendorName}" expires in ${days} day(s). Please renew to avoid red category.`,
          recipientRole: approver.roleLabel || 'Principal',
          recipientName: approver.assigneeName || '',
          recipientEmail: approver.assigneeEmail || '',
          status: 'OPEN',
        },
      });
      reminders += 1;
    }
  }

  return { flagged, reminders };
}

export async function listTransportVendorComplianceAlerts(
  institutionId: string,
  opts: { status?: string } = {},
) {
  await syncTransportVendorCompliance(institutionId);
  const rows = await prisma.transportVendorComplianceAlert.findMany({
    where: {
      institutionId,
      ...(opts.status ? { status: opts.status } : {}),
    },
    include: { vendor: { select: { vendorCode: true, vendorName: true, status: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return rows.map((row) => ({
    id: row.id,
    vendorId: row.vendorId,
    vendorCode: row.vendor?.vendorCode ?? '',
    vendorName: row.vendor?.vendorName ?? '',
    vendorStatus: row.vendor?.status ?? '',
    alertType: row.alertType,
    title: row.title,
    message: row.message,
    recipientRole: row.recipientRole,
    recipientName: row.recipientName,
    recipientEmail: row.recipientEmail,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));
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
    sectionName?: string;
    routeName?: string;
    monthLabel?: string;
    paymentMode?: string;
    remarks?: string;
    totalDueFees?: number;
  },
  collectedBy: string,
) {
  const studentName = data.studentName?.trim();
  if (!studentName) throw new Error('Student name is required');
  if (!data.academicYear?.trim()) throw new Error('Academic year is required');
  const amount = round2(data.amount);
  if (amount <= 0) throw new Error('Collection amount must be greater than zero');
  if (!data.paymentMode?.trim()) throw new Error('Payment mode is required');

  let totalDueFees = round2(data.totalDueFees ?? 0);
  let sectionName = data.sectionName ?? '';
  let admissionNumber = data.admissionNumber ?? '';
  let className = data.className ?? '';
  let studentId = data.studentId ?? '';
  let routeName = data.routeName ?? '';

  if (data.studentId || data.admissionNumber) {
    try {
      const ctx = await getStudentTransportCollectContext(institutionId, {
        academicYear: data.academicYear,
        studentId: data.studentId,
        admissionNumber: data.admissionNumber,
      });
      totalDueFees = data.totalDueFees != null ? totalDueFees : ctx.totalDueFees;
      sectionName = sectionName || ctx.sectionName || '';
      admissionNumber = admissionNumber || ctx.admissionNumber || '';
      className = className || ctx.className || '';
      studentId = studentId || ctx.studentId || '';
      routeName = routeName || ctx.suggestedRouteName || '';
    } catch {
      // keep provided values
    }
  }

  const receiptNumber = await generateTransportReceiptNumber(institutionId, data.academicYear);

  const row = await prisma.transportFeeCollection.create({
    data: {
      institutionId,
      receiptNumber,
      academicYear: data.academicYear,
      monthLabel: data.monthLabel ?? '',
      studentId,
      studentName,
      admissionNumber,
      className,
      sectionName,
      routeName,
      amount,
      totalDueFees,
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
  totalDueFees?: number;
  pendingApproverRole?: string;
  pendingApproverName?: string;
  pendingApproverEmail?: string;
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
    totalDueFees: round2(row.totalDueFees ?? 0),
    pendingApproverRole: row.pendingApproverRole || '',
    pendingApproverName: row.pendingApproverName || '',
    pendingApproverEmail: row.pendingApproverEmail || '',
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
    totalDueFees?: number;
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

  let totalDueFees = round2(data.totalDueFees ?? 0);
  let studentId = data.studentId ?? '';
  let studentName = data.studentName ?? '';
  let admissionNumber = data.admissionNumber ?? '';
  let className = data.className ?? '';
  let sectionName = data.sectionName ?? '';

  if (
    data.requestType === FeeOtherChargeRequestType.ACCOUNT_SETTLEMENT &&
    (data.studentId || data.admissionNumber)
  ) {
    try {
      const dues = await getStudentAllSessionDues(institutionId, {
        studentId: data.studentId,
        admissionNumber: data.admissionNumber,
      });
      totalDueFees = data.totalDueFees != null ? totalDueFees : dues.totalDueFees;
      studentId = studentId || dues.studentId;
      studentName = studentName || dues.studentName;
      admissionNumber = admissionNumber || dues.admissionNumber;
      className = className || dues.className;
      sectionName = sectionName || dues.sectionName;
    } catch {
      // keep provided snapshot
    }
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
      studentId,
      studentName,
      admissionNumber,
      className,
      sectionName,
      totalDueFees,
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

  const { resolveModuleApprover } = await import('./approvalHierarchy.js');
  const approver = await resolveModuleApprover(institutionId, 'FEE_OTHER_CHARGE', 'PRINCIPAL');

  const row = await prisma.feeOtherChargeRequest.update({
    where: { id },
    data: {
      status: FeeApprovalStatus.PENDING_APPROVAL,
      pendingApproverRole: approver.roleLabel || approver.roleKey,
      pendingApproverName: approver.assigneeName || '',
      pendingApproverEmail: approver.assigneeEmail || '',
    },
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
      pendingApproverRole: '',
      pendingApproverName: '',
      pendingApproverEmail: '',
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
      pendingApproverRole: '',
      pendingApproverName: '',
      pendingApproverEmail: '',
    },
    include: { chargeType: { select: { name: true, code: true } } },
  });
  return serializeOtherChargeRequest(row);
}
