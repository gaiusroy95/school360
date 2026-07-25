import { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { seedGrnManagement } from './inventoryGrn.js';

const ACADEMIC_YEARS = ['2023-24', '2024-25', '2025-26', '2026-27'];
const MANAGER_ROLES = new Set(['Purchase Manager', 'Inventory Manager', 'Accountant', 'Finance Head', 'Super Admin', 'Admin']);
const APPROVER_ROLES = new Set(['Finance Head', 'Principal', 'Accountant', 'Super Admin', 'Admin']);

function formatInr(n: number) {
  return `₹ ${Math.round(n).toLocaleString('en-IN')}`;
}

function formatDate(d: Date) {
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function parseDate(s?: string | null) {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

async function logActivity(
  institutionId: string,
  action: string,
  details: string,
  snapshot: Record<string, unknown> = {},
  performedBy = 'Accountant',
) {
  await prisma.invActivityLog.create({
    data: { institutionId, action, details, filterSnapshot: snapshot as Prisma.InputJsonValue, performedBy },
  });
}

type MatchLineInput = {
  grnLineId?: string;
  itemId: string;
  invoiceQty: number;
  invoiceRate: number;
};

type MatchLineResult = {
  grnLineId: string | null;
  poLineId: string | null;
  itemId: string;
  invoiceQty: number;
  invoiceRate: number;
  grnQty: number;
  poRate: number;
  poQty: number;
  lineValue: number;
  hasRateVariance: boolean;
  hasQtyVariance: boolean;
  varianceNote: string;
};

function evaluateLine(
  input: MatchLineInput,
  grnLine?: {
    id: string;
    quantity: number;
    unitCost: number;
    poLineId: string | null;
    poLine?: { unitCost: number; orderedQty: number } | null;
  },
): MatchLineResult {
  const grnQty = grnLine?.quantity ?? 0;
  const poRate = grnLine?.poLine?.unitCost ?? grnLine?.unitCost ?? input.invoiceRate;
  const poQty = grnLine?.poLine?.orderedQty ?? grnQty;
  const hasRateVariance = input.invoiceRate > poRate + 0.001;
  const hasQtyVariance = input.invoiceQty > grnQty + 0.001;
  const notes: string[] = [];
  if (hasRateVariance) notes.push(`Invoice rate ${input.invoiceRate} > PO rate ${poRate}`);
  if (hasQtyVariance) notes.push(`Invoice qty ${input.invoiceQty} > GRN qty ${grnQty}`);

  return {
    grnLineId: grnLine?.id ?? input.grnLineId ?? null,
    poLineId: grnLine?.poLineId ?? null,
    itemId: input.itemId,
    invoiceQty: input.invoiceQty,
    invoiceRate: input.invoiceRate,
    grnQty,
    poRate,
    poQty,
    lineValue: round2(input.invoiceQty * input.invoiceRate),
    hasRateVariance,
    hasQtyVariance,
    varianceNote: notes.join('; '),
  };
}

function summarizeMatch(lines: MatchLineResult[]) {
  const hasRateVariance = lines.some((l) => l.hasRateVariance);
  const hasQtyVariance = lines.some((l) => l.hasQtyVariance);
  const subtotal = round2(lines.reduce((s, l) => s + l.lineValue, 0));
  const taxAmount = round2(subtotal * 0.18);
  const totalAmount = round2(subtotal + taxAmount);
  const matchStatus = hasRateVariance || hasQtyVariance ? 'FAIL' : 'PASS';
  const status = matchStatus === 'PASS' ? 'MATCHED' : 'VARIANCE';
  return { hasRateVariance, hasQtyVariance, subtotal, taxAmount, totalAmount, matchStatus, status };
}

export async function generateBillRef(institutionId: string) {
  const count = await prisma.invVendorBill.count({ where: { institutionId } });
  return `VB-${new Date().getFullYear()}-${String(1001 + count).padStart(4, '0')}`;
}

async function generateJournalEntryRef(institutionId: string) {
  const count = await prisma.invVendorBill.count({
    where: { institutionId, journalEntryRef: { not: '' } },
  });
  return `JE-AP-${new Date().getFullYear()}-${String(1001 + count).padStart(4, '0')}`;
}

function mapBillRow(b: {
  id: string;
  billRef: string;
  invoiceNumber: string;
  invoiceDate: Date;
  totalAmount: number;
  status: string;
  matchStatus: string;
  hasRateVariance: boolean;
  hasQtyVariance: boolean;
  journalEntryRef: string;
  supplier: { supplierName: string };
  grn: { grnNumber: string };
  purchaseOrder: { poNumber: string } | null;
}) {
  return {
    id: b.id,
    billRef: b.billRef,
    invoiceNumber: b.invoiceNumber,
    date: formatDate(b.invoiceDate),
    supplier: b.supplier.supplierName,
    grnNumber: b.grn.grnNumber,
    poNumber: b.purchaseOrder?.poNumber ?? '—',
    amount: formatInr(b.totalAmount),
    totalAmount: b.totalAmount,
    status: b.status,
    statusLabel: b.status.replace(/_/g, ' '),
    matchStatus: b.matchStatus,
    matchLabel: b.matchStatus === 'PASS' ? '3-Way Match OK' : b.matchStatus === 'FAIL' ? 'Variance Detected' : 'Pending',
    hasVariance: b.hasRateVariance || b.hasQtyVariance,
    rateFlag: b.hasRateVariance,
    qtyFlag: b.hasQtyVariance,
    journalEntryRef: b.journalEntryRef || '—',
  };
}

export async function getVendorBillManagement(
  institutionId: string,
  academicYear = '2025-26',
  filters: { status?: string; q?: string; matchStatus?: string } = {},
  userRole = 'Accountant',
) {
  const where: Prisma.InvVendorBillWhereInput = { institutionId, academicYear };
  if (filters.status && filters.status !== 'ALL') where.status = filters.status;
  if (filters.matchStatus && filters.matchStatus !== 'ALL') where.matchStatus = filters.matchStatus;
  if (filters.q) {
    where.OR = [
      { billRef: { contains: filters.q, mode: 'insensitive' } },
      { invoiceNumber: { contains: filters.q, mode: 'insensitive' } },
      { supplier: { supplierName: { contains: filters.q, mode: 'insensitive' } } },
      { grn: { grnNumber: { contains: filters.q, mode: 'insensitive' } } },
    ];
  }

  const [bills, eligibleGrns, statusCounts, matchCounts] = await Promise.all([
    prisma.invVendorBill.findMany({
      where,
      include: {
        supplier: true,
        grn: true,
        purchaseOrder: true,
      },
      orderBy: { invoiceDate: 'desc' },
      take: 100,
    }),
    prisma.invGrn.findMany({
      where: {
        institutionId,
        academicYear,
        status: 'RECEIVED',
        vendorBills: { none: {} },
      },
      include: {
        supplier: true,
        purchaseOrder: true,
        lines: { include: { item: true, poLine: true } },
      },
      orderBy: { grnDate: 'desc' },
      take: 30,
    }),
    prisma.invVendorBill.groupBy({
      by: ['status'],
      where: { institutionId, academicYear },
      _count: { _all: true },
    }),
    prisma.invVendorBill.groupBy({
      by: ['matchStatus'],
      where: { institutionId, academicYear },
      _count: { _all: true },
    }),
  ]);

  await logActivity(institutionId, 'VIEW_VENDOR_BILLS', 'Vendor Bills accessed', { academicYear });

  const pendingApproval = statusCounts.find((s) => s.status === 'PENDING_APPROVAL')?._count._all ?? 0;
  const varianceCount = bills.filter((b) => b.hasRateVariance || b.hasQtyVariance).length;

  return {
    academicYear,
    academicYears: ACADEMIC_YEARS,
    vendorBills: bills.map(mapBillRow),
    eligibleGrns: eligibleGrns.map((g) => ({
      id: g.id,
      grnNumber: g.grnNumber,
      date: formatDate(g.grnDate),
      supplierId: g.supplierId,
      supplier: g.supplier?.supplierName ?? '—',
      poNumber: g.purchaseOrder?.poNumber ?? '—',
      purchaseOrderId: g.purchaseOrderId,
      totalValue: formatInr(g.totalValue),
      lineCount: g.lines.length,
      lines: g.lines.map((l) => ({
        grnLineId: l.id,
        itemId: l.itemId,
        sku: l.item.itemCode,
        itemName: l.item.itemName,
        unit: l.item.unit,
        grnQty: l.quantity,
        poRate: l.poLine?.unitCost ?? l.unitCost,
        defaultInvoiceRate: l.unitCost,
      })),
    })),
    kpis: {
      totalBills: bills.length,
      pendingApproval,
      varianceBills: varianceCount,
      sentToFinance: statusCounts.find((s) => s.status === 'SENT_TO_FINANCE')?._count._all ?? 0,
      totalPayable: formatInr(bills.filter((b) => ['APPROVED', 'SENT_TO_FINANCE'].includes(b.status)).reduce((s, b) => s + b.totalAmount, 0)),
    },
    statusBreakdown: ['DRAFT', 'MATCHED', 'VARIANCE', 'PENDING_APPROVAL', 'APPROVED', 'SENT_TO_FINANCE', 'REJECTED'].map((st) => ({
      status: st,
      count: statusCounts.find((s) => s.status === st)?._count._all ?? 0,
    })),
    matchBreakdown: ['PENDING', 'PASS', 'FAIL'].map((st) => ({
      matchStatus: st,
      count: matchCounts.find((s) => s.matchStatus === st)?._count._all ?? 0,
    })),
    permissions: {
      canCreate: MANAGER_ROLES.has(userRole),
      canEdit: MANAGER_ROLES.has(userRole),
      canApprove: APPROVER_ROLES.has(userRole) || MANAGER_ROLES.has(userRole),
      canSendToFinance: APPROVER_ROLES.has(userRole),
      canDelete: MANAGER_ROLES.has(userRole),
    },
    validationRules: [
      'Flag if Invoice Rate > PO Rate',
      'Flag if Invoice Qty > GRN Received Qty',
    ],
    erpIntegration: ['Accounts / Finance: approved bills create Journal Entry as Accounts Payable'],
    workflow: [
      'Receive Vendor Invoice → Map to GRN → 3-Way Match (PO vs GRN vs Bill) → Handle Variances → Approve Bill → Send to Finance',
    ],
  };
}

export async function getVendorBillDetail(institutionId: string, billId: string) {
  const bill = await prisma.invVendorBill.findFirst({
    where: { id: billId, institutionId },
    include: {
      supplier: true,
      grn: { include: { purchaseOrder: true } },
      purchaseOrder: true,
      lines: { include: { item: true } },
    },
  });
  if (!bill) throw new Error('Vendor bill not found');

  return {
    ...mapBillRow({
      ...bill,
      grn: bill.grn,
      purchaseOrder: bill.purchaseOrder,
    }),
    supplierId: bill.supplierId,
    grnId: bill.grnId,
    purchaseOrderId: bill.purchaseOrderId,
    invoiceDate: formatDate(bill.invoiceDate),
    dueDate: bill.dueDate ? formatDate(bill.dueDate) : '—',
    subtotal: formatInr(bill.subtotal),
    taxAmount: formatInr(bill.taxAmount),
    varianceNotes: bill.varianceNotes,
    varianceApproved: bill.varianceApproved,
    varianceApprovedBy: bill.varianceApprovedBy || '—',
    approvedBy: bill.approvedBy || '—',
    approvedAt: bill.approvedAt ? formatDate(bill.approvedAt) : '—',
    sentToFinanceAt: bill.sentToFinanceAt ? formatDate(bill.sentToFinanceAt) : '—',
    apLedgerAccount: bill.apLedgerAccount || bill.supplier.apLedgerAccount || '—',
    journalEntryPayload: bill.journalEntryPayload,
    lines: bill.lines.map((l) => ({
      id: l.id,
      grnLineId: l.grnLineId,
      itemId: l.itemId,
      sku: l.item.itemCode,
      itemName: l.item.itemName,
      unit: l.item.unit,
      invoiceQty: l.invoiceQty,
      invoiceRate: l.invoiceRate,
      grnQty: l.grnQty,
      poRate: l.poRate,
      poQty: l.poQty,
      lineValue: formatInr(l.lineValue),
      hasRateVariance: l.hasRateVariance,
      hasQtyVariance: l.hasQtyVariance,
      varianceNote: l.varianceNote,
    })),
    threeWayMatch: {
      poNumber: bill.purchaseOrder?.poNumber ?? bill.grn.purchaseOrder?.poNumber ?? '—',
      grnNumber: bill.grn.grnNumber,
      invoiceNumber: bill.invoiceNumber,
      matchStatus: bill.matchStatus,
      rateVariance: bill.hasRateVariance,
      qtyVariance: bill.hasQtyVariance,
    },
  };
}

async function buildMatchFromGrn(
  grn: {
    lines: {
      id: string;
      itemId: string;
      quantity: number;
      unitCost: number;
      poLineId: string | null;
      poLine?: { unitCost: number; orderedQty: number } | null;
    }[];
  },
  lineInputs?: MatchLineInput[],
) {
  const inputs = lineInputs?.length
    ? lineInputs
    : grn.lines.map((l) => ({
      grnLineId: l.id,
      itemId: l.itemId,
      invoiceQty: l.quantity,
      invoiceRate: l.unitCost,
    }));

  return inputs.map((input) => {
    const grnLine = grn.lines.find((l) => l.id === input.grnLineId || l.itemId === input.itemId);
    return evaluateLine(input, grnLine);
  });
}

export async function createVendorBill(
  institutionId: string,
  body: {
    grnId: string;
    invoiceNumber: string;
    invoiceDate?: string;
    dueDate?: string;
    taxAmount?: number;
    lines?: MatchLineInput[];
    academicYear?: string;
  },
) {
  if (!body.grnId) throw new Error('GRN mapping is required');
  if (!body.invoiceNumber?.trim()) throw new Error('Vendor invoice number is required');

  const grn = await prisma.invGrn.findFirst({
    where: { id: body.grnId, institutionId, status: 'RECEIVED' },
    include: {
      supplier: true,
      purchaseOrder: true,
      lines: { include: { poLine: true } },
      vendorBills: true,
    },
  });
  if (!grn) throw new Error('Received GRN not found');
  if (!grn.supplierId) throw new Error('GRN must have a supplier');
  if (grn.vendorBills.length) throw new Error('GRN already has a vendor bill');

  const matchLines = await buildMatchFromGrn(grn, body.lines);
  const summary = summarizeMatch(matchLines);
  const billRef = await generateBillRef(institutionId);
  const apLedger = grn.supplier?.apLedgerAccount || `AP-${grn.supplier?.supplierCode ?? 'VENDOR'}`;

  const bill = await prisma.invVendorBill.create({
    data: {
      institutionId,
      supplierId: grn.supplierId,
      grnId: grn.id,
      purchaseOrderId: grn.purchaseOrderId,
      billRef,
      invoiceNumber: body.invoiceNumber.trim(),
      invoiceDate: parseDate(body.invoiceDate) ?? new Date(),
      dueDate: parseDate(body.dueDate),
      subtotal: summary.subtotal,
      taxAmount: body.taxAmount ?? summary.taxAmount,
      totalAmount: round2(summary.subtotal + (body.taxAmount ?? summary.taxAmount)),
      status: summary.status,
      matchStatus: summary.matchStatus,
      hasRateVariance: summary.hasRateVariance,
      hasQtyVariance: summary.hasQtyVariance,
      apLedgerAccount: apLedger,
      academicYear: body.academicYear ?? grn.academicYear,
      lines: {
        create: matchLines.map((l) => ({
          grnLineId: l.grnLineId,
          poLineId: l.poLineId,
          itemId: l.itemId,
          invoiceQty: l.invoiceQty,
          invoiceRate: l.invoiceRate,
          grnQty: l.grnQty,
          poRate: l.poRate,
          poQty: l.poQty,
          lineValue: l.lineValue,
          hasRateVariance: l.hasRateVariance,
          hasQtyVariance: l.hasQtyVariance,
          varianceNote: l.varianceNote,
        })),
      },
    },
  });

  await logActivity(institutionId, 'VENDOR_BILL_CREATED', `Bill ${billRef} created for GRN ${grn.grnNumber}`, {
    billId: bill.id,
    matchStatus: summary.matchStatus,
  });

  return {
    success: true,
    billId: bill.id,
    billRef,
    matchStatus: summary.matchStatus,
    message: summary.matchStatus === 'PASS'
      ? `Invoice recorded — 3-way match passed`
      : `Invoice recorded — variances detected (rate/qty flags)`,
  };
}

export async function updateVendorBill(
  institutionId: string,
  billId: string,
  body: {
    invoiceNumber?: string;
    invoiceDate?: string;
    dueDate?: string;
    lines?: MatchLineInput[];
  },
) {
  const bill = await prisma.invVendorBill.findFirst({
    where: { id: billId, institutionId },
    include: { grn: { include: { lines: { include: { poLine: true } } } } },
  });
  if (!bill) throw new Error('Vendor bill not found');
  if (!['DRAFT', 'VARIANCE', 'MATCHED'].includes(bill.status)) {
    throw new Error('Bill cannot be edited in current status');
  }

  if (body.lines?.length) {
    await prisma.invVendorBillLine.deleteMany({ where: { vendorBillId: billId } });
    const matchLines = await buildMatchFromGrn(bill.grn, body.lines);
    const summary = summarizeMatch(matchLines);

    await prisma.invVendorBillLine.createMany({
      data: matchLines.map((l) => ({
        vendorBillId: billId,
        grnLineId: l.grnLineId,
        poLineId: l.poLineId,
        itemId: l.itemId,
        invoiceQty: l.invoiceQty,
        invoiceRate: l.invoiceRate,
        grnQty: l.grnQty,
        poRate: l.poRate,
        poQty: l.poQty,
        lineValue: l.lineValue,
        hasRateVariance: l.hasRateVariance,
        hasQtyVariance: l.hasQtyVariance,
        varianceNote: l.varianceNote,
      })),
    });

    await prisma.invVendorBill.update({
      where: { id: billId },
      data: {
        invoiceNumber: body.invoiceNumber?.trim() ?? bill.invoiceNumber,
        invoiceDate: body.invoiceDate ? parseDate(body.invoiceDate) ?? bill.invoiceDate : bill.invoiceDate,
        dueDate: body.dueDate !== undefined ? parseDate(body.dueDate) : bill.dueDate,
        subtotal: summary.subtotal,
        taxAmount: summary.taxAmount,
        totalAmount: summary.totalAmount,
        status: summary.status,
        matchStatus: summary.matchStatus,
        hasRateVariance: summary.hasRateVariance,
        hasQtyVariance: summary.hasQtyVariance,
        varianceApproved: false,
        varianceApprovedBy: '',
      },
    });
  } else {
    await prisma.invVendorBill.update({
      where: { id: billId },
      data: {
        invoiceNumber: body.invoiceNumber?.trim() ?? bill.invoiceNumber,
        invoiceDate: body.invoiceDate ? parseDate(body.invoiceDate) ?? bill.invoiceDate : bill.invoiceDate,
        dueDate: body.dueDate !== undefined ? parseDate(body.dueDate) : bill.dueDate,
      },
    });
  }

  return { success: true, message: 'Vendor bill updated' };
}

export async function runThreeWayMatch(institutionId: string, billId: string) {
  const bill = await prisma.invVendorBill.findFirst({
    where: { id: billId, institutionId },
    include: {
      lines: true,
      grn: { include: { lines: { include: { poLine: true } } } },
    },
  });
  if (!bill) throw new Error('Vendor bill not found');

  const matchLines = bill.lines.map((l) => evaluateLine(
    { grnLineId: l.grnLineId ?? undefined, itemId: l.itemId, invoiceQty: l.invoiceQty, invoiceRate: l.invoiceRate },
    bill.grn.lines.find((gl) => gl.id === l.grnLineId || gl.itemId === l.itemId),
  ));
  const summary = summarizeMatch(matchLines);

  await prisma.invVendorBillLine.deleteMany({ where: { vendorBillId: billId } });
  await prisma.invVendorBillLine.createMany({
    data: matchLines.map((l) => ({
      vendorBillId: billId,
      grnLineId: l.grnLineId,
      poLineId: l.poLineId,
      itemId: l.itemId,
      invoiceQty: l.invoiceQty,
      invoiceRate: l.invoiceRate,
      grnQty: l.grnQty,
      poRate: l.poRate,
      poQty: l.poQty,
      lineValue: l.lineValue,
      hasRateVariance: l.hasRateVariance,
      hasQtyVariance: l.hasQtyVariance,
      varianceNote: l.varianceNote,
    })),
  });

  await prisma.invVendorBill.update({
    where: { id: billId },
    data: {
      subtotal: summary.subtotal,
      taxAmount: summary.taxAmount,
      totalAmount: summary.totalAmount,
      status: summary.status,
      matchStatus: summary.matchStatus,
      hasRateVariance: summary.hasRateVariance,
      hasQtyVariance: summary.hasQtyVariance,
      varianceApproved: summary.matchStatus === 'PASS',
    },
  });

  await logActivity(institutionId, 'VENDOR_BILL_MATCH', `3-way match ${summary.matchStatus} on ${bill.billRef}`, { billId });

  return {
    success: true,
    matchStatus: summary.matchStatus,
    hasRateVariance: summary.hasRateVariance,
    hasQtyVariance: summary.hasQtyVariance,
    message: summary.matchStatus === 'PASS' ? '3-way match passed' : 'Variances flagged — review required',
  };
}

export async function approveVariance(
  institutionId: string,
  billId: string,
  notes?: string,
  performedBy = 'Finance Head',
) {
  const bill = await prisma.invVendorBill.findFirst({ where: { id: billId, institutionId } });
  if (!bill) throw new Error('Vendor bill not found');
  if (bill.matchStatus !== 'FAIL') throw new Error('No variances to approve');

  await prisma.invVendorBill.update({
    where: { id: billId },
    data: {
      varianceApproved: true,
      varianceApprovedBy: performedBy,
      varianceNotes: notes ?? bill.varianceNotes,
      status: 'PENDING_APPROVAL',
    },
  });

  await logActivity(institutionId, 'VENDOR_BILL_VARIANCE_APPROVED', `Variance approved on ${bill.billRef}`, { billId }, performedBy);
  return { success: true, message: 'Variance approved — ready for bill approval' };
}

export async function approveVendorBill(
  institutionId: string,
  billId: string,
  performedBy = 'Finance Head',
) {
  const bill = await prisma.invVendorBill.findFirst({ where: { id: billId, institutionId } });
  if (!bill) throw new Error('Vendor bill not found');
  if (!['MATCHED', 'VARIANCE', 'PENDING_APPROVAL'].includes(bill.status)) {
    throw new Error('Bill cannot be approved in current status');
  }
  if (bill.matchStatus === 'FAIL' && !bill.varianceApproved) {
    throw new Error('Variances must be approved before bill approval');
  }

  await prisma.invVendorBill.update({
    where: { id: billId },
    data: {
      status: 'APPROVED',
      approvedBy: performedBy,
      approvedAt: new Date(),
    },
  });

  await logActivity(institutionId, 'VENDOR_BILL_APPROVED', `Bill ${bill.billRef} approved`, { billId }, performedBy);
  return { success: true, message: `Bill ${bill.billRef} approved — ready for finance` };
}

export async function sendVendorBillToFinance(
  institutionId: string,
  billId: string,
  performedBy = 'Accountant',
) {
  const bill = await prisma.invVendorBill.findFirst({
    where: { id: billId, institutionId },
    include: { supplier: true, grn: true, purchaseOrder: true },
  });
  if (!bill) throw new Error('Vendor bill not found');
  if (bill.status !== 'APPROVED') throw new Error('Only approved bills can be sent to finance');

  const journalEntryRef = await generateJournalEntryRef(institutionId);
  const apAccount = bill.apLedgerAccount || bill.supplier.apLedgerAccount || 'Accounts Payable';
  const journalEntryPayload = {
    entryType: 'ACCOUNTS_PAYABLE',
    reference: bill.billRef,
    invoiceNumber: bill.invoiceNumber,
    supplier: bill.supplier.supplierName,
    poNumber: bill.purchaseOrder?.poNumber ?? '',
    grnNumber: bill.grn.grnNumber,
    amount: bill.totalAmount,
    debit: [{ account: 'Inventory / Expense', amount: bill.subtotal }],
    credit: [{ account: apAccount, amount: bill.totalAmount }],
    tax: bill.taxAmount,
    postedAt: new Date().toISOString(),
    postedBy: performedBy,
  };

  await prisma.invVendorBill.update({
    where: { id: billId },
    data: {
      status: 'SENT_TO_FINANCE',
      sentToFinanceAt: new Date(),
      journalEntryRef,
      journalEntryPayload: journalEntryPayload as Prisma.InputJsonValue,
    },
  });

  await prisma.invGrn.update({
    where: { id: bill.grnId },
    data: { status: 'BILLED', apQueued: true },
  });

  if (bill.purchaseOrderId) {
    const poGrns = await prisma.invGrn.findMany({ where: { purchaseOrderId: bill.purchaseOrderId } });
    if (poGrns.length && poGrns.every((g) => g.status === 'BILLED')) {
      await prisma.invPurchaseOrder.update({
        where: { id: bill.purchaseOrderId },
        data: { status: 'BILLED', encumbranceBlocked: false, encumbranceAmount: 0 },
      });
    }
  }

  await logActivity(
    institutionId,
    'VENDOR_BILL_SENT_FINANCE',
    `Bill ${bill.billRef} sent to finance — ${journalEntryRef} created`,
    { billId, journalEntryRef },
    performedBy,
  );

  return {
    success: true,
    journalEntryRef,
    message: `Journal Entry ${journalEntryRef} created — Accounts Payable ${formatInr(bill.totalAmount)}`,
  };
}

export async function rejectVendorBill(
  institutionId: string,
  billId: string,
  reason?: string,
  performedBy = 'Finance Head',
) {
  const bill = await prisma.invVendorBill.findFirst({ where: { id: billId, institutionId } });
  if (!bill) throw new Error('Vendor bill not found');
  if (bill.status === 'SENT_TO_FINANCE') throw new Error('Cannot reject bill already sent to finance');

  await prisma.invVendorBill.update({
    where: { id: billId },
    data: { status: 'REJECTED', varianceNotes: reason ?? bill.varianceNotes },
  });

  return { success: true, message: 'Vendor bill rejected' };
}

export async function deleteVendorBill(institutionId: string, billId: string) {
  const bill = await prisma.invVendorBill.findFirst({ where: { id: billId, institutionId } });
  if (!bill) throw new Error('Vendor bill not found');
  if (bill.status !== 'DRAFT') throw new Error('Only draft bills can be deleted');

  await prisma.invVendorBillLine.deleteMany({ where: { vendorBillId: billId } });
  await prisma.invVendorBill.delete({ where: { id: billId } });

  return { success: true, message: 'Draft bill deleted' };
}

export async function seedVendorBillManagement(institutionId: string) {
  await seedGrnManagement(institutionId);
  const academicYear = '2025-26';

  const receivedGrns = await prisma.invGrn.findMany({
    where: { institutionId, academicYear, status: 'RECEIVED' },
    include: { supplier: true, lines: { include: { poLine: true } }, vendorBills: true },
    take: 5,
  });

  const billCount = await prisma.invVendorBill.count({ where: { institutionId } });
  if (billCount === 0 && receivedGrns.length) {
    for (let i = 0; i < Math.min(3, receivedGrns.length); i += 1) {
      const grn = receivedGrns[i];
      if (grn.vendorBills.length || !grn.supplierId) continue;

      const lines: MatchLineInput[] = grn.lines.map((l, idx) => ({
        grnLineId: l.id,
        itemId: l.itemId,
        invoiceQty: l.quantity,
        invoiceRate: i === 1 && idx === 0 ? (l.poLine?.unitCost ?? l.unitCost) * 1.05 : l.unitCost,
      }));

      const created = await createVendorBill(institutionId, {
        grnId: grn.id,
        invoiceNumber: `INV-VND-${String(5000 + i).padStart(4, '0')}`,
        invoiceDate: new Date().toISOString().slice(0, 10),
        dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
        lines,
        academicYear,
      });

      if (i === 0 && created.billId) {
        await approveVendorBill(institutionId, created.billId);
      }
      if (i === 1 && created.billId) {
        await approveVariance(institutionId, created.billId, 'Rate variance within negotiated tolerance');
        await approveVendorBill(institutionId, created.billId);
      }
    }
  }

  const approvedBill = await prisma.invVendorBill.findFirst({
    where: { institutionId, status: 'APPROVED' },
  });
  if (approvedBill && !approvedBill.journalEntryRef) {
    await sendVendorBillToFinance(institutionId, approvedBill.id);
  }

  return getVendorBillManagement(institutionId, academicYear);
}
