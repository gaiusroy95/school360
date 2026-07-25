import { prisma } from './prisma.js';
import { seedTransportAttendance } from './transportAttendance.js';

export const PRICING_TYPES = ['ROUTE', 'STOP', 'DISTANCE', 'ZONE', 'VEHICLE_CATEGORY', 'STUDENT_CATEGORY', 'CLASS'];
export const BILLING_CYCLES = ['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'ANNUAL', 'ONE_TIME', 'CUSTOM'];
export const INVOICE_STATUSES = ['DRAFT', 'ISSUED', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED'];
export const PAYMENT_MODES = ['CASH', 'UPI', 'CARD', 'NET_BANKING', 'WALLET', 'CHEQUE', 'QR'];

const REPORT_CATALOG = [
  'Transport Fee Register', 'Route-wise Fee Report', 'Stop-wise Fee Report', 'Distance-wise Fee Report',
  'Zone-wise Fee Report', 'Student Transport Fee Report', 'Monthly Collection Report',
  'Quarterly Collection Report', 'Annual Collection Report', 'Outstanding Fee Report',
  'Due Recovery Report', 'Fee Defaulter Report', 'Concession Report', 'Scholarship Report',
  'Sibling Discount Report', 'Staff Child Concession Report', 'Invoice Register', 'Receipt Register',
  'Refund Report', 'Credit Note Report', 'Debit Note Report', 'Penalty Collection Report',
  'Late Fee Report', 'Online Payment Report', 'Offline Payment Report',
  'Payment Gateway Settlement Report', 'Bank Reconciliation Report', 'GST/Tax Report',
  'Journal Entry Report', 'Daily Collection Report', 'Cash Collection Report',
  'Transport Revenue Report', 'Branch-wise Revenue Report', 'Vehicle-wise Revenue Report',
  'Route Profitability Report', 'Fee Adjustment Report', 'Transport Deposit Report',
  'Security Deposit Refund Report', 'Temporary Transport Charge Report',
  'Event Transport Billing Report', 'Exam Transport Billing Report',
  'Student Withdrawal Settlement Report', 'Accounts Ledger Report', 'Audit Trail Report',
  'Transport Fee Analytics Dashboard',
];

const WORKFLOW = [
  'Transport Registration', 'Route Allocation', 'Fee Structure Applied', 'Invoice Generated',
  'Parent Notification', 'Online/Offline Payment', 'Receipt Generated', 'Accounts Posting',
  'Outstanding Monitoring', 'Reports & Analytics',
];

function todayDate() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function relativeTime(d: Date): string {
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  return hrs < 24 ? `${hrs} hr ago` : 'Yesterday';
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

async function ensureSettings(institutionId: string) {
  let row = await prisma.transportFeeSettings.findUnique({ where: { institutionId } });
  if (!row) {
    row = await prisma.transportFeeSettings.create({
      data: {
        institutionId,
        gracePeriodDays: 7,
        lateFeePerDay: 50,
        lateFeeCap: 500,
        autoSuspendDays: 60,
        siblingDiscountPct: 10,
        staffChildDiscountPct: 25,
        roleMatrix: [
          { role: 'Admin', permissions: 'Full fee structures, invoices, collections, refunds, settings' },
          { role: 'Transport Manager', permissions: 'Fee structures, student mapping, concessions, reports' },
          { role: 'Accounts', permissions: 'Collections, receipts, refunds, journal posting, reconciliation' },
          { role: 'Principal', permissions: 'Approve concessions/refunds, revenue analytics, profitability' },
          { role: 'Parent', permissions: 'View fees, pay online, download invoices/receipts' },
        ],
        notificationRules: {
          channels: ['Push', 'SMS', 'WhatsApp', 'Email'],
          events: ['Invoice generated', 'Payment reminder', 'Receipt issued', 'Overdue alert', 'Refund processed'],
        },
        mobileSyncRules: {
          parentApp: [
            'View transport fee details', 'Billing history', 'Route charges', 'Download invoices/receipts',
            'Pay online', 'Pending dues', 'Concessions', 'Late fees', 'Payment reminders', 'Payment certificates',
          ],
          studentApp: ['Fee status', 'Paid/pending amounts', 'Download receipts', 'Due reminders'],
          accountsApp: ['Verify collections', 'Approve refunds', 'Generate invoices', 'Outstanding dues', 'Gateway status'],
          principalApp: ['Transport revenue', 'Collection efficiency', 'Pending dues', 'Approve concessions/refunds', 'Profitability'],
        },
        reportCatalog: REPORT_CATALOG,
      },
    });
  }
  return row;
}

async function audit(institutionId: string, entityType: string, action: string, details = '', entityId = '') {
  await prisma.transportFeeAuditLog.create({
    data: { institutionId, entityType, entityId, action, details, performedBy: 'Accounts' },
  });
}

async function nextCode(institutionId: string, prefix: string, model: 'structure' | 'invoice' | 'receipt' | 'refund') {
  const count = model === 'structure' ? await prisma.transportFeeStructure.count({ where: { institutionId } })
    : model === 'invoice' ? await prisma.transportFeeInvoice.count({ where: { institutionId } })
      : model === 'receipt' ? await prisma.transportFeePayment.count({ where: { institutionId } })
        : await prisma.transportFeeRefund.count({ where: { institutionId } });
  return `${prefix}-${String(count + 1).padStart(5, '0')}`;
}

function calcNetAmount(base: number, concessions: { sibling?: number; staff?: number; scholarship?: number; other?: number }) {
  const totalConcession = (concessions.sibling ?? 0) + (concessions.staff ?? 0) + (concessions.scholarship ?? 0) + (concessions.other ?? 0);
  return round2(Math.max(0, base - totalConcession));
}

function serializeStructure(s: {
  id: string; structureCode: string; structureName: string; pricingType: string; billingCycle: string;
  academicYear: string; branch: string; stopName: string; zoneName: string;
  distanceKm: number; perKmRate: number; vehicleCategory: string; studentCategory: string;
  className: string; baseAmount: number; depositAmount: number; gstPct: number;
  effectiveFrom: Date; effectiveTo: Date | null; versionLabel: string; status: string;
  route?: { routeCode: string; routeName: string } | null;
  _count?: { assignments: number };
}) {
  const computedAmount = s.pricingType === 'DISTANCE'
    ? round2(s.baseAmount + s.distanceKm * s.perKmRate)
    : s.baseAmount;
  return {
    id: s.id, structureCode: s.structureCode, structureName: s.structureName,
    pricingType: s.pricingType, billingCycle: s.billingCycle,
    academicYear: s.academicYear, branch: s.branch,
    routeCode: s.route?.routeCode ?? '', routeName: s.route?.routeName ?? '',
    stopName: s.stopName, zoneName: s.zoneName,
    distanceKm: s.distanceKm, perKmRate: s.perKmRate,
    vehicleCategory: s.vehicleCategory, studentCategory: s.studentCategory,
    className: s.className, baseAmount: s.baseAmount, computedAmount,
    depositAmount: s.depositAmount, gstPct: s.gstPct,
    effectiveFrom: s.effectiveFrom.toISOString().slice(0, 10),
    effectiveTo: s.effectiveTo?.toISOString().slice(0, 10) ?? null,
    versionLabel: s.versionLabel, status: s.status,
    assignmentCount: s._count?.assignments ?? 0,
  };
}

function serializeInvoice(inv: {
  id: string; invoiceNumber: string; studentName: string; className: string; routeName: string;
  periodLabel: string; billingCycle: string; academicYear: string;
  grossAmount: number; concessionAmount: number; penaltyAmount: number;
  netAmount: number; paidAmount: number; balanceAmount: number;
  dueDate: Date; gracePeriodDays: number; status: string; isProforma: boolean;
  journalPosted: boolean; enrollmentId: string;
  enrollment?: { admissionNumber: string; feeStatus: string } | null;
}) {
  const overdue = inv.status !== 'PAID' && inv.status !== 'CANCELLED'
    && inv.dueDate < todayDate() && inv.balanceAmount > 0;
  return {
    id: inv.id, invoiceNumber: inv.invoiceNumber, enrollmentId: inv.enrollmentId,
    studentName: inv.studentName, admissionNumber: inv.enrollment?.admissionNumber ?? '',
    className: inv.className, routeName: inv.routeName,
    periodLabel: inv.periodLabel, billingCycle: inv.billingCycle, academicYear: inv.academicYear,
    grossAmount: inv.grossAmount, concessionAmount: inv.concessionAmount,
    penaltyAmount: inv.penaltyAmount, netAmount: inv.netAmount,
    paidAmount: inv.paidAmount, balanceAmount: inv.balanceAmount,
    dueDate: inv.dueDate.toISOString().slice(0, 10),
    gracePeriodDays: inv.gracePeriodDays,
    status: overdue ? 'OVERDUE' : inv.status,
    isProforma: inv.isProforma, journalPosted: inv.journalPosted,
    feeStatus: inv.enrollment?.feeStatus ?? '',
  };
}

export async function getTransportFeeManagement(institutionId: string, academicYear = '2025-26') {
  await ensureSettings(institutionId);

  const [structures, assignments, invoices, payments, refunds, penalties, revisions, auditLogs, settings, enrollments] = await Promise.all([
    prisma.transportFeeStructure.findMany({
      where: { institutionId, academicYear },
      include: { route: { select: { routeCode: true, routeName: true } }, _count: { select: { assignments: true } } },
      orderBy: { structureCode: 'asc' },
    }),
    prisma.transportFeeStudentAssignment.findMany({
      where: { institutionId, academicYear },
      include: {
        enrollment: { select: { studentName: true, className: true, admissionNumber: true, route: { select: { routeName: true } } } },
        structure: { select: { structureName: true, billingCycle: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.transportFeeInvoice.findMany({
      where: { institutionId, academicYear },
      include: { enrollment: { select: { admissionNumber: true, feeStatus: true } } },
      orderBy: { createdAt: 'desc' },
      take: 80,
    }),
    prisma.transportFeePayment.findMany({
      where: { institutionId },
      include: { invoice: { select: { invoiceNumber: true, studentName: true } } },
      orderBy: { collectedAt: 'desc' },
      take: 40,
    }),
    prisma.transportFeeRefund.findMany({
      where: { institutionId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.transportFeePenalty.findMany({
      where: { institutionId },
      include: { invoice: { select: { invoiceNumber: true, studentName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.transportFeeStructureRevision.findMany({
      where: { institutionId },
      orderBy: { revisedAt: 'desc' },
      take: 15,
    }),
    prisma.transportFeeAuditLog.findMany({
      where: { institutionId }, orderBy: { createdAt: 'desc' }, take: 25,
    }),
    prisma.transportFeeSettings.findUnique({ where: { institutionId } }),
    prisma.transportStudentEnrollment.findMany({
      where: { institutionId, academicYear, status: 'ACTIVE' },
      select: { id: true, studentName: true, className: true, routeId: true, category: true, feeStatus: true, feeDueAmount: true },
      take: 30,
    }),
  ]);

  const serializedInvoices = invoices.map(serializeInvoice);
  const totalBilled = round2(serializedInvoices.reduce((s, i) => s + i.netAmount, 0));
  const totalCollected = round2(payments.reduce((s, p) => s + p.amount, 0));
  const totalOutstanding = round2(serializedInvoices.reduce((s, i) => s + i.balanceAmount, 0));
  const totalConcessions = round2(serializedInvoices.reduce((s, i) => s + i.concessionAmount, 0));
  const overdueCount = serializedInvoices.filter((i) => i.status === 'OVERDUE').length;

  return {
    academicYear,
    academicYears: ['2024-25', '2025-26', '2026-27'],
    pricingTypes: PRICING_TYPES,
    billingCycles: BILLING_CYCLES,
    invoiceStatuses: INVOICE_STATUSES,
    paymentModes: PAYMENT_MODES,
    workflow: WORKFLOW,
    kpis: {
      totalBilled, totalCollected, totalOutstanding, totalConcessions,
      totalRefunds: round2(refunds.filter((r) => r.status === 'APPROVED').reduce((s, r) => s + r.amount, 0)),
      overdueAccounts: overdueCount,
      invoiceCount: serializedInvoices.length,
      paidInvoices: serializedInvoices.filter((i) => i.status === 'PAID').length,
      collectionRate: totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0,
      structureCount: structures.length,
      assignedStudents: assignments.length,
      pendingRefunds: refunds.filter((r) => r.status === 'PENDING').length,
      penaltyTotal: round2(penalties.filter((p) => !p.waived).reduce((s, p) => s + p.amount, 0)),
    },
    structures: structures.map(serializeStructure),
    assignments: assignments.map((a) => ({
      id: a.id, enrollmentId: a.enrollmentId,
      studentName: a.enrollment.studentName, className: a.enrollment.className,
      admissionNumber: a.enrollment.admissionNumber,
      routeName: a.enrollment.route?.routeName ?? '',
      structureName: a.structure.structureName, billingCycle: a.structure.billingCycle,
      assignedAmount: a.assignedAmount, concessionAmount: a.concessionAmount,
      siblingDiscount: a.siblingDiscount, staffChildDiscount: a.staffChildDiscount,
      scholarshipWaiver: a.scholarshipWaiver, netAmount: a.netAmount,
      depositPaid: a.depositPaid, status: a.status,
      effectiveFrom: a.effectiveFrom.toISOString().slice(0, 10),
    })),
    invoices: serializedInvoices,
    payments: payments.map((p) => ({
      id: p.id, receiptNumber: p.receiptNumber, invoiceNumber: p.invoice.invoiceNumber,
      studentName: p.invoice.studentName, amount: p.amount, paymentMode: p.paymentMode,
      gatewayRef: p.gatewayRef, qrPayment: p.qrPayment, isPartial: p.isPartial,
      collectedBy: p.collectedBy, collectedAt: p.collectedAt.toISOString(),
      relativeTime: relativeTime(p.collectedAt),
    })),
    refunds: refunds.map((r) => ({
      id: r.id, refundNumber: r.refundNumber, studentName: r.studentName,
      amount: r.amount, reason: r.reason, status: r.status,
      approvedBy: r.approvedBy, createdAt: r.createdAt.toISOString(),
    })),
    penalties: penalties.map((p) => ({
      id: p.id, invoiceNumber: p.invoice.invoiceNumber, studentName: p.invoice.studentName,
      penaltyType: p.penaltyType, amount: p.amount, waived: p.waived,
    })),
    revisions: revisions.map((r) => ({
      id: r.id, previousAmount: r.previousAmount, newAmount: r.newAmount,
      reason: r.reason, revisedBy: r.revisedBy,
      revisedAt: r.revisedAt.toISOString(), relativeTime: relativeTime(r.revisedAt),
    })),
    enrollments,
    auditLogs: auditLogs.map((a) => ({
      id: a.id, entityType: a.entityType, action: a.action, details: a.details,
      performedBy: a.performedBy, relativeTime: relativeTime(a.createdAt),
    })),
    settings,
    reports: REPORT_CATALOG,
  };
}

export async function createFeeStructure(institutionId: string, body: Record<string, unknown>) {
  await ensureSettings(institutionId);
  const structureCode = String(body.structureCode ?? '').trim() || await nextCode(institutionId, 'TFS', 'structure');
  const baseAmount = Number(body.baseAmount ?? 0);
  const distanceKm = Number(body.distanceKm ?? 0);
  const perKmRate = Number(body.perKmRate ?? 0);
  const pricingType = String(body.pricingType ?? 'ROUTE');
  const computed = pricingType === 'DISTANCE' ? round2(baseAmount + distanceKm * perKmRate) : baseAmount;

  const structure = await prisma.transportFeeStructure.create({
    data: {
      institutionId,
      structureCode,
      structureName: String(body.structureName ?? 'Transport Fee'),
      pricingType,
      billingCycle: String(body.billingCycle ?? 'MONTHLY'),
      academicYear: String(body.academicYear ?? '2025-26'),
      branch: String(body.branch ?? 'Main Campus'),
      routeId: body.routeId ? String(body.routeId) : null,
      stopName: String(body.stopName ?? ''),
      zoneName: String(body.zoneName ?? ''),
      distanceKm, perKmRate,
      vehicleCategory: String(body.vehicleCategory ?? 'Non-AC'),
      studentCategory: String(body.studentCategory ?? 'Day Scholar'),
      className: String(body.className ?? ''),
      baseAmount: computed,
      depositAmount: Number(body.depositAmount ?? 0),
      gstPct: Number(body.gstPct ?? 0),
      effectiveFrom: body.effectiveFrom ? new Date(String(body.effectiveFrom)) : todayDate(),
      effectiveTo: body.effectiveTo ? new Date(String(body.effectiveTo)) : null,
      versionLabel: String(body.versionLabel ?? 'v1'),
    },
    include: { route: { select: { routeCode: true, routeName: true } }, _count: { select: { assignments: true } } },
  });
  await audit(institutionId, 'STRUCTURE', 'Created', `${structureCode} — ${structure.structureName}`, structure.id);
  return structure;
}

export async function reviseFeeStructure(institutionId: string, structureId: string, body: Record<string, unknown>) {
  const existing = await prisma.transportFeeStructure.findFirst({ where: { id: structureId, institutionId } });
  if (!existing) throw new Error('Fee structure not found');
  const newAmount = Number(body.newAmount ?? existing.baseAmount);

  await prisma.transportFeeStructureRevision.create({
    data: {
      institutionId, structureId,
      previousAmount: existing.baseAmount, newAmount,
      reason: String(body.reason ?? 'Fee revision'),
      revisedBy: String(body.revisedBy ?? 'Transport Manager'),
    },
  });

  const updated = await prisma.transportFeeStructure.update({
    where: { id: structureId },
    data: {
      baseAmount: newAmount,
      versionLabel: `v${parseInt(existing.versionLabel.replace(/\D/g, '') || '1', 10) + 1}`,
    },
    include: { route: { select: { routeCode: true, routeName: true } }, _count: { select: { assignments: true } } },
  });
  await audit(institutionId, 'STRUCTURE', 'Revised', `${existing.structureCode}: ₹${existing.baseAmount} → ₹${newAmount}`, structureId);
  return updated;
}

export async function assignStudentFee(institutionId: string, body: Record<string, unknown>) {
  const settings = await ensureSettings(institutionId);
  const enrollment = await prisma.transportStudentEnrollment.findFirst({
    where: { id: String(body.enrollmentId), institutionId },
    include: { route: true },
  });
  if (!enrollment) throw new Error('Enrollment not found');

  const structure = await prisma.transportFeeStructure.findFirst({
    where: { id: String(body.structureId), institutionId },
  });
  if (!structure) throw new Error('Fee structure not found');

  const assignedAmount = Number(body.assignedAmount ?? structure.baseAmount);
  const siblingDiscount = body.applySiblingDiscount
    ? round2(assignedAmount * settings.siblingDiscountPct / 100) : Number(body.siblingDiscount ?? 0);
  const staffChildDiscount = body.applyStaffDiscount
    ? round2(assignedAmount * settings.staffChildDiscountPct / 100) : Number(body.staffChildDiscount ?? 0);
  const scholarshipWaiver = Number(body.scholarshipWaiver ?? 0);
  const concessionAmount = siblingDiscount + staffChildDiscount + scholarshipWaiver;
  const netAmount = calcNetAmount(assignedAmount, { sibling: siblingDiscount, staff: staffChildDiscount, scholarship: scholarshipWaiver });

  const assignment = await prisma.transportFeeStudentAssignment.upsert({
    where: {
      enrollmentId_structureId_academicYear: {
        enrollmentId: enrollment.id,
        structureId: structure.id,
        academicYear: structure.academicYear,
      },
    },
    create: {
      institutionId, enrollmentId: enrollment.id, structureId: structure.id,
      academicYear: structure.academicYear,
      assignedAmount, concessionAmount, siblingDiscount, staffChildDiscount,
      scholarshipWaiver, netAmount,
      depositPaid: Number(body.depositPaid ?? 0),
      overrideReason: String(body.overrideReason ?? ''),
      effectiveFrom: todayDate(),
    },
    update: {
      assignedAmount, concessionAmount, siblingDiscount, staffChildDiscount,
      scholarshipWaiver, netAmount,
      overrideReason: String(body.overrideReason ?? 'Updated'),
    },
  });

  await prisma.transportStudentEnrollment.update({
    where: { id: enrollment.id },
    data: { feeStatus: 'ASSIGNED', feeDueAmount: netAmount },
  });

  await audit(institutionId, 'ASSIGNMENT', 'Fee Mapped', `${enrollment.studentName} → ${structure.structureName}`, assignment.id);
  return assignment;
}

export async function generateTransportInvoices(institutionId: string, academicYear: string, periodLabel?: string) {
  const assignments = await prisma.transportFeeStudentAssignment.findMany({
    where: { institutionId, academicYear, status: 'ACTIVE' },
    include: {
      enrollment: { include: { route: true } },
      structure: true,
    },
  });

  const settings = await ensureSettings(institutionId);
  const period = periodLabel ?? new Date().toLocaleString('en-IN', { month: 'short', year: 'numeric' });
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + settings.gracePeriodDays);
  let created = 0;

  for (const a of assignments) {
    const existing = await prisma.transportFeeInvoice.findFirst({
      where: { institutionId, enrollmentId: a.enrollmentId, periodLabel: period, status: { not: 'CANCELLED' } },
    });
    if (existing) continue;

    const invoiceNumber = await nextCode(institutionId, 'TFI', 'invoice');
    const netAmount = a.netAmount;

    await prisma.transportFeeInvoice.create({
      data: {
        institutionId, invoiceNumber,
        enrollmentId: a.enrollmentId, assignmentId: a.id,
        academicYear, periodLabel: period,
        billingCycle: a.structure.billingCycle,
        studentName: a.enrollment.studentName,
        className: a.enrollment.className,
        routeName: a.enrollment.route?.routeName ?? '',
        grossAmount: a.assignedAmount,
        concessionAmount: a.concessionAmount,
        netAmount, balanceAmount: netAmount,
        dueDate, gracePeriodDays: settings.gracePeriodDays,
        status: 'ISSUED',
      },
    });

    await prisma.transportStudentEnrollment.update({
      where: { id: a.enrollmentId },
      data: { feeStatus: 'DUE', feeDueAmount: netAmount },
    });
    created++;
  }

  await audit(institutionId, 'INVOICE', 'Bulk Generated', `${created} invoices for ${period}`);
  return { created, period };
}

export async function collectTransportFeePayment(
  institutionId: string, invoiceId: string, body: Record<string, unknown>,
) {
  const invoice = await prisma.transportFeeInvoice.findFirst({
    where: { id: invoiceId, institutionId },
  });
  if (!invoice) throw new Error('Invoice not found');
  if (invoice.status === 'CANCELLED') throw new Error('Invoice is cancelled');

  const amount = round2(Number(body.amount ?? invoice.balanceAmount));
  if (amount <= 0) throw new Error('Payment amount must be positive');
  if (amount > invoice.balanceAmount + 0.01) throw new Error('Amount exceeds balance');

  const receiptNumber = await nextCode(institutionId, 'TFR', 'receipt');
  const paymentMode = String(body.paymentMode ?? 'CASH');
  const isPartial = amount < invoice.balanceAmount;

  await prisma.transportFeePayment.create({
    data: {
      institutionId, invoiceId, receiptNumber, amount, paymentMode,
      gatewayRef: String(body.gatewayRef ?? ''),
      qrPayment: paymentMode === 'QR' || body.qrPayment === true,
      isPartial, isAdvance: body.isAdvance === true,
      collectedBy: String(body.collectedBy ?? 'Accounts'),
      remarks: String(body.remarks ?? ''),
    },
  });

  const newPaid = round2(invoice.paidAmount + amount);
  const newBalance = round2(invoice.netAmount - newPaid);
  const status = newBalance <= 0 ? 'PAID' : 'PARTIAL';

  await prisma.transportFeeInvoice.update({
    where: { id: invoiceId },
    data: { paidAmount: newPaid, balanceAmount: Math.max(0, newBalance), status, journalPosted: true },
  });

  await prisma.transportStudentEnrollment.update({
    where: { id: invoice.enrollmentId },
    data: {
      feeStatus: status === 'PAID' ? 'PAID' : 'PARTIAL',
      feeDueAmount: Math.max(0, newBalance),
    },
  });

  await prisma.transportFeeCollection.create({
    data: {
      institutionId, receiptNumber, academicYear: invoice.academicYear,
      monthLabel: invoice.periodLabel, studentName: invoice.studentName,
      className: invoice.className, routeName: invoice.routeName,
      amount, paymentMode, collectedBy: String(body.collectedBy ?? 'Accounts'),
    },
  });

  await audit(institutionId, 'PAYMENT', 'Collected', `${receiptNumber} ₹${amount} for ${invoice.invoiceNumber}`, invoiceId);
}

export async function waiveTransportPenalty(institutionId: string, penaltyId: string, reason: string) {
  const penalty = await prisma.transportFeePenalty.update({
    where: { id: penaltyId, institutionId },
    data: { waived: true, waiverReason: reason },
    include: { invoice: true },
  });

  await prisma.transportFeeInvoice.update({
    where: { id: penalty.invoiceId },
    data: {
      penaltyAmount: { decrement: penalty.amount },
      netAmount: { decrement: penalty.amount },
      balanceAmount: { decrement: penalty.amount },
    },
  });
  await audit(institutionId, 'PENALTY', 'Waived', reason, penaltyId);
}

export async function requestTransportRefund(institutionId: string, body: Record<string, unknown>) {
  const refundNumber = await nextCode(institutionId, 'TFD', 'refund');
  const refund = await prisma.transportFeeRefund.create({
    data: {
      institutionId,
      invoiceId: body.invoiceId ? String(body.invoiceId) : null,
      refundNumber,
      enrollmentId: String(body.enrollmentId ?? ''),
      studentName: String(body.studentName ?? ''),
      amount: Number(body.amount ?? 0),
      reason: String(body.reason ?? ''),
      status: 'PENDING',
    },
  });
  await audit(institutionId, 'REFUND', 'Requested', refundNumber, refund.id);
  return refund;
}

export async function approveTransportRefund(institutionId: string, refundId: string) {
  const refund = await prisma.transportFeeRefund.update({
    where: { id: refundId, institutionId },
    data: { status: 'APPROVED', approvedBy: 'Principal', processedAt: new Date() },
  });
  await audit(institutionId, 'REFUND', 'Approved', refund.refundNumber, refundId);
  return refund;
}

export async function applyLatePenalties(institutionId: string) {
  const settings = await ensureSettings(institutionId);
  const today = todayDate();
  const overdue = await prisma.transportFeeInvoice.findMany({
    where: {
      institutionId,
      status: { in: ['ISSUED', 'PARTIAL', 'OVERDUE'] },
      balanceAmount: { gt: 0 },
      dueDate: { lt: today },
    },
  });

  let applied = 0;
  for (const inv of overdue) {
    const daysLate = Math.floor((today.getTime() - inv.dueDate.getTime()) / 86400000);
    if (daysLate <= settings.gracePeriodDays) continue;

    const existing = await prisma.transportFeePenalty.findFirst({
      where: { invoiceId: inv.id, penaltyType: 'LATE_FEE', waived: false },
    });
    if (existing) continue;

    const penaltyAmt = Math.min(settings.lateFeeCap, round2((daysLate - settings.gracePeriodDays) * settings.lateFeePerDay));
    if (penaltyAmt <= 0) continue;

    await prisma.transportFeePenalty.create({
      data: { institutionId, invoiceId: inv.id, penaltyType: 'LATE_FEE', amount: penaltyAmt },
    });
    await prisma.transportFeeInvoice.update({
      where: { id: inv.id },
      data: {
        penaltyAmount: { increment: penaltyAmt },
        netAmount: { increment: penaltyAmt },
        balanceAmount: { increment: penaltyAmt },
        status: 'OVERDUE',
      },
    });
    applied++;
  }
  await audit(institutionId, 'PENALTY', 'Late Fees Applied', `${applied} invoices`);
  return { applied };
}

export async function autoAssignFeesFromRoutes(institutionId: string, academicYear: string) {
  const enrollments = await prisma.transportStudentEnrollment.findMany({
    where: { institutionId, academicYear, status: 'ACTIVE', routeId: { not: null } },
  });
  let assigned = 0;

  for (const enr of enrollments) {
    const structure = await prisma.transportFeeStructure.findFirst({
      where: { institutionId, academicYear, routeId: enr.routeId, status: 'ACTIVE' },
    });
    if (!structure) continue;

    const existing = await prisma.transportFeeStudentAssignment.findFirst({
      where: { enrollmentId: enr.id, structureId: structure.id, academicYear },
    });
    if (existing) continue;

    await assignStudentFee(institutionId, {
      enrollmentId: enr.id,
      structureId: structure.id,
      applySiblingDiscount: Boolean(enr.siblingGroupId),
      applyStaffDiscount: enr.category === 'Staff Child',
    });
    assigned++;
  }
  return { assigned };
}

export async function seedTransportFeeManagement(institutionId: string) {
  await seedTransportAttendance(institutionId);
  await ensureSettings(institutionId);

  const existing = await prisma.transportFeeStructure.count({ where: { institutionId } });
  if (existing >= 6) return getTransportFeeManagement(institutionId);

  const routes = await prisma.transportRoute.findMany({
    where: { institutionId, isArchived: false }, take: 6,
  });
  const enrollments = await prisma.transportStudentEnrollment.findMany({
    where: { institutionId, status: 'ACTIVE' }, take: 25,
  });
  const effectiveFrom = todayDate();

  const structureDefs = [
    { code: 'TFS-ROUTE', name: 'Route-wise Monthly', type: 'ROUTE', cycle: 'MONTHLY', base: 2500 },
    { code: 'TFS-STOP', name: 'Stop-wise Monthly', type: 'STOP', cycle: 'MONTHLY', base: 1800 },
    { code: 'TFS-DIST', name: 'Distance-based', type: 'DISTANCE', cycle: 'MONTHLY', base: 500, km: 12, rate: 150 },
    { code: 'TFS-ZONE', name: 'Zone A Annual', type: 'ZONE', cycle: 'ANNUAL', base: 22000 },
    { code: 'TFS-AC', name: 'AC Bus Premium', type: 'VEHICLE_CATEGORY', cycle: 'MONTHLY', base: 3500 },
    { code: 'TFS-HOSTEL', name: 'Hostel Student', type: 'STUDENT_CATEGORY', cycle: 'QUARTERLY', base: 6500 },
  ];

  const structures = [];
  for (let i = 0; i < structureDefs.length; i++) {
    const d = structureDefs[i];
    const route = routes[i % routes.length];
    const amount = d.type === 'DISTANCE' ? round2(d.base + (d.km ?? 0) * (d.rate ?? 0)) : d.base;
    const s = await prisma.transportFeeStructure.create({
      data: {
        institutionId,
        structureCode: d.code,
        structureName: d.name,
        pricingType: d.type,
        billingCycle: d.cycle,
        academicYear: '2025-26',
        routeId: d.type === 'ROUTE' ? route?.id : null,
        stopName: d.type === 'STOP' ? 'City Center' : '',
        zoneName: d.type === 'ZONE' ? 'Zone A' : '',
        distanceKm: d.km ?? 0,
        perKmRate: d.rate ?? 0,
        vehicleCategory: d.type === 'VEHICLE_CATEGORY' ? 'AC' : 'Non-AC',
        studentCategory: d.type === 'STUDENT_CATEGORY' ? 'Hostel' : 'Day Scholar',
        baseAmount: amount,
        depositAmount: 1000,
        gstPct: 0,
        effectiveFrom,
      },
    });
    structures.push(s);

    if (i === 0) {
      await prisma.transportFeeStructureRevision.create({
        data: {
          institutionId, structureId: s.id,
          previousAmount: amount - 200, newAmount: amount,
          reason: 'Annual fee revision effective Apr 2025',
        },
      });
    }
  }

  for (let i = 0; i < Math.min(enrollments.length, 20); i++) {
    const enr = enrollments[i];
    const structure = structures[i % structures.length];
    const assignedAmount = structure.baseAmount;
    const siblingDiscount = enr.siblingGroupId ? round2(assignedAmount * 0.1) : 0;
    const staffDiscount = enr.category === 'Staff Child' ? round2(assignedAmount * 0.25) : 0;
    const scholarshipWaiver = i % 7 === 0 ? round2(assignedAmount * 0.15) : 0;
    const concessionAmount = siblingDiscount + staffDiscount + scholarshipWaiver;
    const netAmount = round2(assignedAmount - concessionAmount);

    await prisma.transportFeeStudentAssignment.create({
      data: {
        institutionId, enrollmentId: enr.id, structureId: structure.id,
        academicYear: '2025-26', assignedAmount, concessionAmount,
        siblingDiscount, staffChildDiscount: staffDiscount, scholarshipWaiver,
        netAmount, depositPaid: i % 3 === 0 ? 1000 : 0,
        effectiveFrom,
      },
    });
  }

  await generateTransportInvoices(institutionId, '2025-26', 'Jul 2026');

  const invoices = await prisma.transportFeeInvoice.findMany({
    where: { institutionId, academicYear: '2025-26' },
    take: 15,
  });

  for (let i = 0; i < invoices.length; i++) {
    const inv = invoices[i];
    if (i < 8) {
      await collectTransportFeePayment(institutionId, inv.id, {
        amount: i < 5 ? inv.netAmount : round2(inv.netAmount * 0.5),
        paymentMode: ['CASH', 'UPI', 'CARD', 'NET_BANKING', 'QR'][i % 5],
        qrPayment: i % 5 === 4,
      });
    } else if (i < 11) {
      await prisma.transportFeeInvoice.update({
        where: { id: inv.id },
        data: { status: 'OVERDUE' },
      });
      await prisma.transportFeePenalty.create({
        data: { institutionId, invoiceId: inv.id, penaltyType: 'LATE_FEE', amount: 150 },
      });
      await prisma.transportFeeInvoice.update({
        where: { id: inv.id },
        data: { penaltyAmount: 150, netAmount: { increment: 150 }, balanceAmount: { increment: 150 } },
      });
    }
  }

  await prisma.transportFeeRefund.create({
    data: {
      institutionId,
      refundNumber: 'TFD-00001',
      enrollmentId: enrollments[0]?.id ?? '',
      studentName: enrollments[0]?.studentName ?? 'Student',
      amount: 500,
      reason: 'Transport cancelled mid-session',
      status: 'PENDING',
    },
  });

  await audit(institutionId, 'SYSTEM', 'Seed Demo', 'Transport fee management demo data loaded');
  return getTransportFeeManagement(institutionId);
}
