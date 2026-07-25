import { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { seedSupplierManagement } from './inventorySuppliers.js';

const ACADEMIC_YEARS = ['2023-24', '2024-25', '2025-26', '2026-27'];
const AUTO_APPROVE_LIMIT = 1000;
const PURCHASE_MANAGER_ROLES = new Set(['Purchase Manager', 'Inventory Manager', 'Super Admin', 'Admin']);
const APPROVER_ROLES = new Set(['Principal', 'Finance Head', 'Super Admin', 'Admin']);
const PENDING_ORDER_STATUSES = ['PENDING_APPROVAL', 'APPROVED', 'ORDERED', 'PENDING', 'PARTIAL'] as const;

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
  performedBy = 'Purchase Manager',
) {
  await prisma.invActivityLog.create({
    data: { institutionId, action, details, filterSnapshot: snapshot as Prisma.InputJsonValue, performedBy },
  });
}

function calcLineValue(qty: number, rate: number, taxRate = 0, discountPct = 0) {
  const gross = qty * rate;
  const discountAmount = round2(gross * (discountPct / 100));
  const taxable = gross - discountAmount;
  const taxAmount = round2(taxable * (taxRate / 100));
  const lineValue = round2(taxable + taxAmount);
  return { gross, discountAmount, taxAmount, lineValue };
}

function calcPoTotals(lines: { orderedQty: number; unitCost: number; taxRate?: number; discountPct?: number }[]) {
  let subtotal = 0;
  let taxAmount = 0;
  let discountAmount = 0;
  for (const line of lines) {
    const c = calcLineValue(line.orderedQty, line.unitCost, line.taxRate ?? 0, line.discountPct ?? 0);
    subtotal += c.gross;
    taxAmount += c.taxAmount;
    discountAmount += c.discountAmount;
  }
  const totalValue = round2(subtotal - discountAmount + taxAmount);
  return { subtotal: round2(subtotal), taxAmount: round2(taxAmount), discountAmount: round2(discountAmount), totalValue };
}

function resolveApprovalRoute(totalValue: number) {
  return totalValue < AUTO_APPROVE_LIMIT
    ? { route: 'AUTO', requiresPrincipal: false, label: 'Auto-approved (< ₹1,000)' }
    : { route: 'PRINCIPAL', requiresPrincipal: true, label: 'Requires Principal/Finance Head approval' };
}

function computeProgress(status: string, grns: { status: string }[]) {
  if (['DRAFT', 'PENDING_APPROVAL', 'REJECTED', 'CANCELLED'].includes(status)) {
    return { stage: 'draft', progressPct: 0, progressLabel: 'Not Ordered', ordered: false, received: false, billed: false };
  }
  const allBilled = grns.length > 0 && grns.every((g) => g.status === 'BILLED');
  if (status === 'BILLED' || allBilled) {
    return { stage: 'billed', progressPct: 100, progressLabel: 'Billed', ordered: true, received: true, billed: true };
  }
  if (status === 'COMPLETED' || status === 'PARTIAL') {
    return { stage: 'received', progressPct: 66, progressLabel: status === 'PARTIAL' ? 'Partially Received' : 'Received', ordered: true, received: true, billed: false };
  }
  return { stage: 'ordered', progressPct: 33, progressLabel: 'Ordered', ordered: true, received: false, billed: false };
}

async function checkBudgetEncumbrance(
  institutionId: string,
  academicYear: string,
  budgetCode: string,
  department: string,
  poAmount: number,
  excludePoId?: string,
) {
  const budget = budgetCode
    ? await prisma.expenseBudget.findFirst({ where: { institutionId, budgetCode, academicYear, status: 'ACTIVE' } })
    : await prisma.expenseBudget.findFirst({
      where: { institutionId, academicYear, status: 'ACTIVE', department: department || undefined },
      orderBy: { allocatedAmount: 'desc' },
    });

  if (!budget) {
    return {
      ok: true,
      budgetCode: budgetCode || 'UNASSIGNED',
      budgetName: 'No budget linked — encumbrance recorded',
      allocated: 0,
      encumbered: 0,
      available: Infinity,
      message: 'No department budget found; PO encumbrance will be tracked on PO record',
    };
  }

  const activePos = await prisma.invPurchaseOrder.findMany({
    where: {
      institutionId,
      academicYear,
      encumbranceBlocked: true,
      status: { notIn: ['REJECTED', 'CANCELLED', 'BILLED'] },
      ...(excludePoId ? { NOT: { id: excludePoId } } : {}),
      OR: [{ budgetCode: budget.budgetCode }, { department: budget.department }],
    },
    select: { encumbranceAmount: true },
  });

  const encumbered = activePos.reduce((s, p) => s + p.encumbranceAmount, 0);
  const expenseUsed = await prisma.expenseEntry.aggregate({
    where: { institutionId, academicYear, budgetCode: budget.budgetCode, status: { in: ['APPROVED', 'PAID'] } },
    _sum: { amount: true },
  });
  const used = (expenseUsed._sum.amount ?? 0) + encumbered;
  const available = budget.allocatedAmount - used;

  if (poAmount > available) {
    throw new Error(
      `Budget exceeded for ${budget.name}. Available: ${formatInr(Math.max(0, available))}, PO amount: ${formatInr(poAmount)}`,
    );
  }

  return {
    ok: true,
    budgetCode: budget.budgetCode,
    budgetName: budget.name,
    allocated: budget.allocatedAmount,
    encumbered: used,
    available,
    message: `Budget check passed — ${formatInr(available - poAmount)} remaining after encumbrance`,
  };
}

function mapPoRow(po: {
  id: string;
  poNumber: string;
  poDate: Date;
  totalValue: number;
  status: string;
  department: string;
  budgetCode: string;
  approvalRoute: string;
  encumbranceBlocked: boolean;
  emailedAt: Date | null;
  supplier: { supplierName: string } | null;
  grns: { status: string }[];
}) {
  const progress = computeProgress(po.status, po.grns);
  return {
    id: po.id,
    poNumber: po.poNumber,
    date: formatDate(po.poDate),
    supplier: po.supplier?.supplierName ?? '—',
    value: formatInr(po.totalValue),
    totalValue: po.totalValue,
    status: po.status,
    statusLabel: po.status.replace(/_/g, ' '),
    department: po.department || '—',
    budgetCode: po.budgetCode || '—',
    approvalRoute: po.approvalRoute,
    encumbranceBlocked: po.encumbranceBlocked,
    emailed: Boolean(po.emailedAt),
    ...progress,
  };
}

export async function generatePoNumber(institutionId: string) {
  const count = await prisma.invPurchaseOrder.count({ where: { institutionId } });
  return `PO-${new Date().getFullYear()}-${String(1001 + count).padStart(4, '0')}`;
}

export async function getPurchaseOrderManagement(
  institutionId: string,
  academicYear = '2025-26',
  filters: { status?: string; q?: string; supplierId?: string } = {},
  userRole = 'Purchase Manager',
) {
  const where: Prisma.InvPurchaseOrderWhereInput = { institutionId, academicYear };
  if (filters.status && filters.status !== 'ALL') where.status = filters.status;
  if (filters.supplierId && filters.supplierId !== 'ALL') where.supplierId = filters.supplierId;
  if (filters.q) {
    where.OR = [
      { poNumber: { contains: filters.q, mode: 'insensitive' } },
      { department: { contains: filters.q, mode: 'insensitive' } },
      { supplier: { supplierName: { contains: filters.q, mode: 'insensitive' } } },
    ];
  }

  const [orders, suppliers, stores, items, indents, budgets, statusCounts, pendingCount] = await Promise.all([
    prisma.invPurchaseOrder.findMany({
      where,
      include: { supplier: true, grns: { select: { status: true } } },
      orderBy: { poDate: 'desc' },
      take: 100,
    }),
    prisma.invSupplier.findMany({
      where: { institutionId, academicYear, approvalStatus: 'APPROVED', status: 'ACTIVE' },
      orderBy: { supplierName: 'asc' },
    }),
    prisma.invStore.findMany({ where: { institutionId, academicYear, status: 'ACTIVE' } }),
    prisma.invItem.findMany({
      where: { institutionId, academicYear, status: 'ACTIVE' },
      select: { id: true, itemCode: true, itemName: true, unit: true, weightedAvgCost: true, taxRate: true, storeId: true },
      orderBy: { itemName: 'asc' },
      take: 500,
    }),
    prisma.invPurchaseIndent.findMany({
      where: { institutionId, academicYear, status: 'APPROVED' },
      include: { lines: { include: { item: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.expenseBudget.findMany({
      where: { institutionId, academicYear, status: 'ACTIVE' },
      select: { budgetCode: true, name: true, department: true, allocatedAmount: true },
      orderBy: { name: 'asc' },
      take: 30,
    }),
    prisma.invPurchaseOrder.groupBy({
      by: ['status'],
      where: { institutionId, academicYear },
      _count: { _all: true },
    }),
    prisma.invPurchaseOrder.count({
      where: { institutionId, academicYear, status: { in: [...PENDING_ORDER_STATUSES] } },
    }),
  ]);

  await logActivity(institutionId, 'VIEW_PURCHASE_ORDERS', 'Purchase Orders accessed', { academicYear });

  return {
    academicYear,
    academicYears: ACADEMIC_YEARS,
    purchaseOrders: orders.map(mapPoRow),
    suppliers: suppliers.map((s) => ({ id: s.id, name: s.supplierName, code: s.supplierCode, email: s.email })),
    stores: stores.map((s) => ({ id: s.id, name: s.storeName })),
    items: items.map((i) => ({
      id: i.id, code: i.itemCode, name: i.itemName, unit: i.unit,
      rate: i.weightedAvgCost || 100, taxRate: i.taxRate, storeId: i.storeId,
    })),
    approvedIndents: indents.map((ind) => ({
      id: ind.id,
      indentNumber: ind.indentNumber,
      department: ind.department,
      requestedBy: ind.requestedBy,
      lines: ind.lines.map((l) => ({
        id: l.id,
        itemId: l.itemId,
        sku: l.item.itemCode,
        itemName: l.item.itemName,
        unit: l.item.unit,
        requestedQty: l.requestedQty,
        remainingQty: Math.max(0, l.requestedQty - l.convertedQty),
        unitEstimate: l.unitEstimate || l.item.weightedAvgCost || 100,
      })).filter((l) => l.remainingQty > 0),
    })).filter((ind) => ind.lines.length > 0),
    budgets: budgets.map((b) => ({
      code: b.budgetCode,
      name: b.name,
      department: b.department,
      allocated: formatInr(b.allocatedAmount),
    })),
    kpis: {
      totalOrders: orders.length,
      pendingOrders: pendingCount,
      pendingApproval: statusCounts.find((s) => s.status === 'PENDING_APPROVAL')?._count._all ?? 0,
      totalValue: formatInr(orders.reduce((s, o) => s + o.totalValue, 0)),
    },
    statusBreakdown: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'ORDERED', 'PARTIAL', 'COMPLETED', 'BILLED', 'REJECTED'].map((st) => ({
      status: st,
      count: statusCounts.find((s) => s.status === st)?._count._all ?? 0,
    })),
    permissions: {
      canCreate: PURCHASE_MANAGER_ROLES.has(userRole),
      canEdit: PURCHASE_MANAGER_ROLES.has(userRole),
      canApprove: APPROVER_ROLES.has(userRole) || PURCHASE_MANAGER_ROLES.has(userRole),
      canEmail: PURCHASE_MANAGER_ROLES.has(userRole),
      canDelete: PURCHASE_MANAGER_ROLES.has(userRole),
    },
    autoApproveLimit: AUTO_APPROVE_LIMIT,
    autoApproveLimitLabel: formatInr(AUTO_APPROVE_LIMIT),
    validationRules: [
      'Total Amount = Σ(Qty × Rate + Taxes − Discount)',
      `PO value < ${formatInr(AUTO_APPROVE_LIMIT)} auto-approved; above requires Principal/Finance Head`,
      'Department budget encumbrance blocked on submit',
    ],
    erpIntegration: ['Budgeting/Finance: checks department budget limits before PO creation'],
    workflow: [
      'Aggregate Approved Indents → Select Supplier → Generate PO Draft → Route for Financial Approval → PO Approved → Email to Vendor',
    ],
  };
}

export async function getPurchaseOrderDetail(institutionId: string, poId: string) {
  const po = await prisma.invPurchaseOrder.findFirst({
    where: { id: poId, institutionId },
    include: {
      supplier: true,
      store: true,
      indent: { include: { lines: { include: { item: true } } } },
      lines: { include: { item: true } },
      grns: { select: { id: true, grnNumber: true, status: true, totalValue: true, grnDate: true } },
    },
  });
  if (!po) throw new Error('Purchase order not found');

  const progress = computeProgress(po.status, po.grns);
  const approval = resolveApprovalRoute(po.totalValue);

  return {
    ...mapPoRow(po),
    storeId: po.storeId,
    storeName: po.store.storeName,
    supplierId: po.supplierId,
    supplierEmail: po.supplier?.email ?? '',
    indentId: po.indentId,
    indentNumber: po.indent?.indentNumber ?? '—',
    poDate: formatDate(po.poDate),
    expectedDate: po.expectedDate ? formatDate(po.expectedDate) : '—',
    subtotal: formatInr(po.subtotal),
    taxAmount: formatInr(po.taxAmount),
    discountAmount: formatInr(po.discountAmount),
    encumbranceAmount: formatInr(po.encumbranceAmount),
    submittedBy: po.submittedBy || '—',
    submittedAt: po.submittedAt ? formatDate(po.submittedAt) : '—',
    approvedBy: po.approvedBy || '—',
    approvedAt: po.approvedAt ? formatDate(po.approvedAt) : '—',
    rejectedReason: po.rejectedReason,
    emailedAt: po.emailedAt ? formatDate(po.emailedAt) : '—',
    emailedTo: po.emailedTo || '—',
    notes: po.notes,
    approvalInfo: approval,
    lines: po.lines.map((l) => ({
      id: l.id,
      itemId: l.itemId,
      sku: l.item.itemCode,
      itemName: l.item.itemName,
      unit: l.item.unit,
      orderedQty: l.orderedQty,
      receivedQty: l.receivedQty,
      unitCost: l.unitCost,
      taxRate: l.taxRate,
      taxAmount: l.taxAmount,
      discountPct: l.discountPct,
      discountAmount: l.discountAmount,
      lineValue: l.lineValue,
      lineValueFmt: formatInr(l.lineValue),
    })),
    grns: po.grns.map((g) => ({
      id: g.id,
      grnNumber: g.grnNumber,
      date: formatDate(g.grnDate),
      status: g.status,
      value: formatInr(g.totalValue),
    })),
    progress,
  };
}

type PoLineInput = {
  itemId: string;
  orderedQty: number;
  unitCost: number;
  taxRate?: number;
  discountPct?: number;
  indentLineId?: string;
};

async function buildLineCreates(lines: PoLineInput[]) {
  return lines.map((line) => {
    const c = calcLineValue(line.orderedQty, line.unitCost, line.taxRate ?? 0, line.discountPct ?? 0);
    return {
      itemId: line.itemId,
      orderedQty: line.orderedQty,
      unitCost: line.unitCost,
      taxRate: line.taxRate ?? 0,
      taxAmount: c.taxAmount,
      discountPct: line.discountPct ?? 0,
      discountAmount: c.discountAmount,
      lineValue: c.lineValue,
      indentLineId: line.indentLineId ?? null,
    };
  });
}

export async function createPurchaseOrder(
  institutionId: string,
  body: {
    storeId: string;
    supplierId: string;
    indentId?: string;
    poDate?: string;
    expectedDate?: string;
    department?: string;
    budgetCode?: string;
    notes?: string;
    academicYear?: string;
    lines: PoLineInput[];
  },
) {
  const academicYear = body.academicYear ?? '2025-26';
  if (!body.supplierId) throw new Error('Supplier is required');
  if (!body.storeId) throw new Error('Store is required');
  if (!body.lines?.length) throw new Error('At least one line item is required');

  const supplier = await prisma.invSupplier.findFirst({
    where: { id: body.supplierId, institutionId, approvalStatus: 'APPROVED' },
  });
  if (!supplier) throw new Error('Approved supplier is required');

  const totals = calcPoTotals(body.lines);
  const poNumber = await generatePoNumber(institutionId);
  const lineCreates = await buildLineCreates(body.lines);

  const po = await prisma.invPurchaseOrder.create({
    data: {
      institutionId,
      storeId: body.storeId,
      supplierId: body.supplierId,
      indentId: body.indentId ?? null,
      poNumber,
      poDate: parseDate(body.poDate) ?? new Date(),
      expectedDate: parseDate(body.expectedDate),
      department: body.department ?? '',
      budgetCode: body.budgetCode ?? '',
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      discountAmount: totals.discountAmount,
      totalValue: totals.totalValue,
      approvalRoute: resolveApprovalRoute(totals.totalValue).route,
      notes: body.notes ?? '',
      academicYear,
      status: 'DRAFT',
      lines: { create: lineCreates },
    },
  });

  await logActivity(institutionId, 'PO_CREATED', `PO ${poNumber} draft created`, { poId: po.id, total: totals.totalValue });

  return { success: true, poId: po.id, poNumber, message: `PO ${poNumber} draft created` };
}

export async function updatePurchaseOrder(
  institutionId: string,
  poId: string,
  body: {
    supplierId?: string;
    expectedDate?: string;
    department?: string;
    budgetCode?: string;
    notes?: string;
    lines?: PoLineInput[];
  },
) {
  const po = await prisma.invPurchaseOrder.findFirst({ where: { id: poId, institutionId } });
  if (!po) throw new Error('Purchase order not found');
  if (po.status !== 'DRAFT') throw new Error('Only draft POs can be edited');

  let totals = { subtotal: po.subtotal, taxAmount: po.taxAmount, discountAmount: po.discountAmount, totalValue: po.totalValue };

  if (body.lines?.length) {
    await prisma.invPurchaseOrderLine.deleteMany({ where: { purchaseOrderId: poId } });
    const lineCreates = await buildLineCreates(body.lines);
    totals = calcPoTotals(body.lines);
    await prisma.invPurchaseOrderLine.createMany({
      data: lineCreates.map((l) => ({ ...l, purchaseOrderId: poId })),
    });
  }

  await prisma.invPurchaseOrder.update({
    where: { id: poId },
    data: {
      supplierId: body.supplierId ?? po.supplierId,
      expectedDate: body.expectedDate !== undefined ? parseDate(body.expectedDate) : po.expectedDate,
      department: body.department ?? po.department,
      budgetCode: body.budgetCode ?? po.budgetCode,
      notes: body.notes ?? po.notes,
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      discountAmount: totals.discountAmount,
      totalValue: totals.totalValue,
      approvalRoute: resolveApprovalRoute(totals.totalValue).route,
    },
  });

  return { success: true, message: 'PO updated' };
}

export async function createPoFromIndent(
  institutionId: string,
  body: {
    indentId: string;
    supplierId: string;
    storeId?: string;
    budgetCode?: string;
    lineIds?: string[];
    academicYear?: string;
  },
) {
  const indent = await prisma.invPurchaseIndent.findFirst({
    where: { id: body.indentId, institutionId, status: 'APPROVED' },
    include: { lines: { include: { item: true } } },
  });
  if (!indent) throw new Error('Approved indent not found');

  const selectedLines = body.lineIds?.length
    ? indent.lines.filter((l) => body.lineIds!.includes(l.id))
    : indent.lines;

  const poLines: PoLineInput[] = selectedLines
    .map((l) => ({
      itemId: l.itemId,
      orderedQty: Math.max(0, l.requestedQty - l.convertedQty),
      unitCost: l.unitEstimate || l.item.weightedAvgCost || 100,
      taxRate: l.item.taxRate,
      indentLineId: l.id,
    }))
    .filter((l) => l.orderedQty > 0);

  if (!poLines.length) throw new Error('No remaining qty on selected indent lines');

  const storeId = body.storeId ?? poLines[0] ? (await prisma.invItem.findUnique({ where: { id: poLines[0].itemId } }))?.storeId : undefined;
  if (!storeId) throw new Error('Store could not be resolved from indent items');

  return createPurchaseOrder(institutionId, {
    storeId,
    supplierId: body.supplierId,
    indentId: indent.id,
    department: indent.department,
    budgetCode: body.budgetCode,
    academicYear: body.academicYear ?? indent.academicYear,
    notes: `Converted from indent ${indent.indentNumber}`,
    lines: poLines,
  });
}

export async function submitPurchaseOrder(
  institutionId: string,
  poId: string,
  performedBy = 'Purchase Manager',
) {
  const po = await prisma.invPurchaseOrder.findFirst({
    where: { id: poId, institutionId },
    include: { lines: true },
  });
  if (!po) throw new Error('Purchase order not found');
  if (po.status !== 'DRAFT') throw new Error('Only draft POs can be submitted');

  const budget = await checkBudgetEncumbrance(
    institutionId,
    po.academicYear,
    po.budgetCode,
    po.department,
    po.totalValue,
    po.id,
  );

  const route = resolveApprovalRoute(po.totalValue);
  const now = new Date();

  if (route.requiresPrincipal) {
    await prisma.invPurchaseOrder.update({
      where: { id: poId },
      data: {
        status: 'PENDING_APPROVAL',
        approvalRoute: route.route,
        submittedBy: performedBy,
        submittedAt: now,
        encumbranceBlocked: true,
        encumbranceAmount: po.totalValue,
        budgetCode: budget.budgetCode,
      },
    });
    await logActivity(institutionId, 'PO_SUBMITTED', `PO ${po.poNumber} submitted for Principal approval`, { poId, total: po.totalValue }, performedBy);
    return { success: true, message: `PO submitted — ${route.label}. Budget encumbrance blocked: ${formatInr(po.totalValue)}` };
  }

  await prisma.invPurchaseOrder.update({
    where: { id: poId },
    data: {
      status: 'APPROVED',
      approvalRoute: route.route,
      submittedBy: performedBy,
      submittedAt: now,
      approvedBy: 'System (Auto-approve)',
      approvedAt: now,
      encumbranceBlocked: true,
      encumbranceAmount: po.totalValue,
      budgetCode: budget.budgetCode,
    },
  });
  await logActivity(institutionId, 'PO_AUTO_APPROVED', `PO ${po.poNumber} auto-approved (< ${formatInr(AUTO_APPROVE_LIMIT)})`, { poId }, performedBy);
  return { success: true, message: `PO auto-approved — ${budget.message}` };
}

export async function approvePurchaseOrder(
  institutionId: string,
  poId: string,
  performedBy = 'Principal',
) {
  const po = await prisma.invPurchaseOrder.findFirst({ where: { id: poId, institutionId } });
  if (!po) throw new Error('Purchase order not found');
  if (po.status !== 'PENDING_APPROVAL') throw new Error('PO is not pending approval');

  await prisma.invPurchaseOrder.update({
    where: { id: poId },
    data: {
      status: 'APPROVED',
      approvedBy: performedBy,
      approvedAt: new Date(),
      encumbranceBlocked: true,
      encumbranceAmount: po.totalValue,
    },
  });

  await logActivity(institutionId, 'PO_APPROVED', `PO ${po.poNumber} approved by ${performedBy}`, { poId }, performedBy);
  return { success: true, message: `PO ${po.poNumber} approved` };
}

export async function rejectPurchaseOrder(
  institutionId: string,
  poId: string,
  reason?: string,
  performedBy = 'Principal',
) {
  const po = await prisma.invPurchaseOrder.findFirst({ where: { id: poId, institutionId } });
  if (!po) throw new Error('Purchase order not found');
  if (!['PENDING_APPROVAL', 'DRAFT'].includes(po.status)) throw new Error('PO cannot be rejected in current status');

  await prisma.invPurchaseOrder.update({
    where: { id: poId },
    data: {
      status: 'REJECTED',
      rejectedReason: reason ?? 'Rejected',
      encumbranceBlocked: false,
      encumbranceAmount: 0,
    },
  });

  await logActivity(institutionId, 'PO_REJECTED', `PO ${po.poNumber} rejected`, { poId, reason }, performedBy);
  return { success: true, message: 'PO rejected — encumbrance released' };
}

export async function emailPurchaseOrderToVendor(
  institutionId: string,
  poId: string,
  performedBy = 'Purchase Manager',
) {
  const po = await prisma.invPurchaseOrder.findFirst({
    where: { id: poId, institutionId },
    include: { supplier: true },
  });
  if (!po) throw new Error('Purchase order not found');
  if (!['APPROVED', 'ORDERED'].includes(po.status)) {
    throw new Error('PO must be approved before emailing vendor');
  }
  if (!po.supplier?.email) throw new Error('Supplier email not on file');

  const emailedTo = po.supplier.email;
  await prisma.invPurchaseOrder.update({
    where: { id: poId },
    data: {
      status: 'ORDERED',
      emailedAt: new Date(),
      emailedTo,
    },
  });

  await logActivity(
    institutionId,
    'PO_EMAILED',
    `PO ${po.poNumber} emailed to ${emailedTo}`,
    { poId, emailedTo },
    performedBy,
  );

  return {
    success: true,
    message: `PO ${po.poNumber} emailed to ${po.supplier.supplierName} (${emailedTo})`,
    emailedTo,
  };
}

export async function deletePurchaseOrder(institutionId: string, poId: string) {
  const po = await prisma.invPurchaseOrder.findFirst({
    where: { id: poId, institutionId },
    include: { grns: true },
  });
  if (!po) throw new Error('Purchase order not found');
  if (po.status !== 'DRAFT') throw new Error('Only draft POs can be deleted');
  if (po.grns.length) throw new Error('PO has linked GRNs');

  await prisma.invPurchaseOrderLine.deleteMany({ where: { purchaseOrderId: poId } });
  await prisma.invPurchaseOrder.delete({ where: { id: poId } });

  return { success: true, message: 'PO deleted' };
}

export async function seedPurchaseOrderManagement(institutionId: string) {
  await seedSupplierManagement(institutionId);
  const academicYear = '2025-26';

  const [stores, suppliers, items] = await Promise.all([
    prisma.invStore.findMany({ where: { institutionId, academicYear }, take: 2 }),
    prisma.invSupplier.findMany({ where: { institutionId, academicYear, approvalStatus: 'APPROVED' }, take: 3 }),
    prisma.invItem.findMany({ where: { institutionId, academicYear, status: 'ACTIVE' }, take: 8 }),
  ]);

  if (!stores.length || !suppliers.length || items.length < 3) {
    return getPurchaseOrderManagement(institutionId, academicYear);
  }

  let budget = await prisma.expenseBudget.findFirst({ where: { institutionId, academicYear } });
  if (!budget) {
    budget = await prisma.expenseBudget.create({
      data: {
        institutionId,
        budgetCode: 'BDG-INV-2025',
        name: 'Inventory Procurement Budget',
        budgetType: 'DEPARTMENT',
        academicYear,
        department: 'Administration',
        periodStart: new Date('2025-04-01'),
        periodEnd: new Date('2026-03-31'),
        allocatedAmount: 500000,
        alertThreshold: 0.9,
      },
    });
  }

  const indentCount = await prisma.invPurchaseIndent.count({ where: { institutionId } });
  if (indentCount === 0) {
    const indents = [
      { indentNumber: 'PIN-2025-018', department: 'Science Lab', requestedBy: 'HOD Science' },
      { indentNumber: 'PIN-2025-019', department: 'Administration', requestedBy: 'Office Manager' },
      { indentNumber: 'PIN-2025-020', department: 'Sports', requestedBy: 'Sports Coach' },
    ];
    for (let i = 0; i < indents.length; i += 1) {
      const ind = indents[i];
      await prisma.invPurchaseIndent.create({
        data: {
          institutionId,
          ...ind,
          status: i < 2 ? 'APPROVED' : 'PENDING',
          academicYear,
          lines: {
            create: [
              {
                itemId: items[i % items.length].id,
                requestedQty: 50 + i * 10,
                unitEstimate: items[i % items.length].weightedAvgCost || 120,
              },
              {
                itemId: items[(i + 1) % items.length].id,
                requestedQty: 30,
                unitEstimate: items[(i + 1) % items.length].weightedAvgCost || 80,
              },
            ],
          },
        },
      });
    }
  }

  const poCount = await prisma.invPurchaseOrder.count({ where: { institutionId } });
  if (poCount < 5) {
    const scenarios: { status: string; total: number; emailed?: boolean; supplierIdx: number }[] = [
      { status: 'DRAFT', total: 850, supplierIdx: 0 },
      { status: 'PENDING_APPROVAL', total: 45000, supplierIdx: 1 },
      { status: 'APPROVED', total: 720, supplierIdx: 2 },
      { status: 'ORDERED', total: 12500, supplierIdx: 0, emailed: true },
      { status: 'PARTIAL', total: 28000, supplierIdx: 1, emailed: true },
    ];

    for (let i = 0; i < scenarios.length; i += 1) {
      const sc = scenarios[i];
      const poNumber = await generatePoNumber(institutionId);
      const lineItems = [
        { itemId: items[i % items.length].id, orderedQty: 20, unitCost: sc.total * 0.6 / 20, taxRate: 18 },
        { itemId: items[(i + 2) % items.length].id, orderedQty: 10, unitCost: sc.total * 0.4 / 10, taxRate: 5 },
      ];
      const totals = calcPoTotals(lineItems);
      const lineCreates = await buildLineCreates(lineItems);

      await prisma.invPurchaseOrder.create({
        data: {
          institutionId,
          storeId: stores[i % stores.length].id,
          supplierId: suppliers[sc.supplierIdx % suppliers.length].id,
          poNumber,
          poDate: new Date(Date.now() - (i + 2) * 86400000),
          expectedDate: new Date(Date.now() + 14 * 86400000),
          department: ['Science Lab', 'Administration', 'Sports', 'Library', 'Maintenance'][i % 5],
          budgetCode: budget.budgetCode,
          subtotal: totals.subtotal,
          taxAmount: totals.taxAmount,
          discountAmount: totals.discountAmount,
          totalValue: totals.totalValue,
          encumbranceBlocked: sc.status !== 'DRAFT',
          encumbranceAmount: sc.status !== 'DRAFT' ? totals.totalValue : 0,
          approvalRoute: sc.total >= AUTO_APPROVE_LIMIT ? 'PRINCIPAL' : 'AUTO',
          status: sc.status,
          submittedBy: sc.status !== 'DRAFT' ? 'Purchase Manager' : '',
          submittedAt: sc.status !== 'DRAFT' ? new Date() : null,
          approvedBy: ['APPROVED', 'ORDERED', 'PARTIAL'].includes(sc.status) ? (sc.total >= AUTO_APPROVE_LIMIT ? 'Principal' : 'System (Auto-approve)') : '',
          approvedAt: ['APPROVED', 'ORDERED', 'PARTIAL'].includes(sc.status) ? new Date() : null,
          emailedAt: sc.emailed ? new Date() : null,
          emailedTo: sc.emailed ? suppliers[sc.supplierIdx % suppliers.length].email : '',
          academicYear,
          lines: { create: lineCreates },
        },
      });
    }
  }

  const partialPo = await prisma.invPurchaseOrder.findFirst({
    where: { institutionId, status: 'PARTIAL' },
    include: { lines: true },
  });
  if (partialPo) {
    await prisma.invPurchaseOrderLine.update({
      where: { id: partialPo.lines[0]?.id },
      data: { receivedQty: partialPo.lines[0].orderedQty * 0.5 },
    });
  }

  return getPurchaseOrderManagement(institutionId, academicYear);
}
