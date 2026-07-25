import { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { seedVendorBillManagement } from './inventoryVendorBills.js';

const ACADEMIC_YEARS = ['2023-24', '2024-25', '2025-26', '2026-27'];
const REASON_CODES = ['DAMAGE', 'THEFT', 'EXPIRY', 'OPENING_BALANCE', 'CORRECTION', 'WRITE_OFF', 'AUDIT_VARIANCE'] as const;
const CREATOR_ROLES = new Set(['Store Keeper', 'Inventory Manager', 'Purchase Manager', 'Super Admin', 'Admin']);
const APPROVER_ROLES = new Set(['Inventory Manager', 'Principal', 'Finance Head', 'Super Admin', 'Admin']);

const REASON_LABELS: Record<string, string> = {
  DAMAGE: 'Damage / Breakage',
  THEFT: 'Theft / Loss',
  EXPIRY: 'Expiry Write-off',
  OPENING_BALANCE: 'Opening Balance',
  CORRECTION: 'Stock Correction',
  WRITE_OFF: 'Write-off',
  AUDIT_VARIANCE: 'Audit Discrepancy',
};

function formatInr(n: number) {
  return `₹ ${Math.round(n).toLocaleString('en-IN')}`;
}

function formatDate(d: Date) {
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(d: Date) {
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
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
  performedBy = 'Store Keeper',
) {
  await prisma.invActivityLog.create({
    data: { institutionId, action, details, filterSnapshot: snapshot as Prisma.InputJsonValue, performedBy },
  });
}

async function logAdjustmentAudit(
  institutionId: string,
  adjustmentId: string,
  action: string,
  details: string,
  snapshot: Record<string, unknown> = {},
  performedBy = 'Store Keeper',
) {
  await prisma.invAdjustmentAuditLog.create({
    data: {
      institutionId,
      adjustmentId,
      action,
      details,
      fieldSnapshot: snapshot as Prisma.InputJsonValue,
      performedBy,
    },
  });
}

type LineInput = {
  itemId: string;
  direction: 'ADD' | 'DEDUCT';
  quantity: number;
  unitCost?: number;
  reasonCode?: string;
  remarks?: string;
};

function calcLines(lines: LineInput[], items: Map<string, { weightedAvgCost: number }>) {
  return lines.map((line) => {
    const unitCost = line.unitCost ?? items.get(line.itemId)?.weightedAvgCost ?? 0;
    const lineValue = round2(line.quantity * unitCost);
    return {
      itemId: line.itemId,
      direction: line.direction,
      quantity: line.quantity,
      unitCost,
      lineValue,
      reasonCode: line.reasonCode ?? 'CORRECTION',
      remarks: line.remarks ?? '',
    };
  });
}

function summarize(lines: { direction: string; quantity: number; lineValue: number }[]) {
  const totalQty = round2(lines.reduce((s, l) => s + l.quantity, 0));
  const totalValue = round2(lines.reduce((s, l) => s + l.lineValue, 0));
  const deductValue = round2(lines.filter((l) => l.direction === 'DEDUCT').reduce((s, l) => s + l.lineValue, 0));
  const addValue = round2(lines.filter((l) => l.direction === 'ADD').reduce((s, l) => s + l.lineValue, 0));
  const financialImpact = round2(deductValue - addValue);
  return { totalQty, totalValue, financialImpact };
}

export async function generateAdjustmentNumber(institutionId: string) {
  const count = await prisma.invAdjustment.count({ where: { institutionId } });
  return `ADJ-${new Date().getFullYear()}-${String(1001 + count).padStart(4, '0')}`;
}

function mapAdjustmentRow(a: {
  id: string;
  adjustmentNumber: string;
  adjustmentDate: Date;
  adjustmentType: string;
  reasonCode: string;
  totalQty: number;
  totalValue: number;
  financialImpact: number;
  status: string;
  createdBy: string;
  store: { storeName: string };
  lines: { direction: string }[];
}) {
  const addCount = a.lines.filter((l) => l.direction === 'ADD').length;
  const deductCount = a.lines.filter((l) => l.direction === 'DEDUCT').length;
  return {
    id: a.id,
    adjustmentNumber: a.adjustmentNumber,
    date: formatDate(a.adjustmentDate),
    store: a.store.storeName,
    type: addCount && deductCount ? 'Mixed' : addCount ? 'Add' : 'Deduct',
    reasonCode: a.reasonCode,
    reasonLabel: REASON_LABELS[a.reasonCode] ?? a.reasonCode,
    totalQty: a.totalQty,
    value: formatInr(a.totalValue),
    totalValue: a.totalValue,
    financialImpact: formatInr(Math.abs(a.financialImpact)),
    financialImpactRaw: a.financialImpact,
    pnlLabel: a.financialImpact > 0 ? 'P&L Expense' : a.financialImpact < 0 ? 'P&L Gain' : 'Neutral',
    status: a.status,
    statusLabel: a.status.replace(/_/g, ' '),
    createdBy: a.createdBy,
    lineCount: a.lines.length,
  };
}

export async function getStockAdjustmentManagement(
  institutionId: string,
  academicYear = '2025-26',
  filters: { status?: string; reasonCode?: string; q?: string } = {},
  userRole = 'Inventory Manager',
) {
  const where: Prisma.InvAdjustmentWhereInput = { institutionId, academicYear };
  if (filters.status && filters.status !== 'ALL') where.status = filters.status;
  if (filters.reasonCode && filters.reasonCode !== 'ALL') where.reasonCode = filters.reasonCode;
  if (filters.q) {
    where.OR = [
      { adjustmentNumber: { contains: filters.q, mode: 'insensitive' } },
      { reason: { contains: filters.q, mode: 'insensitive' } },
      { remarks: { contains: filters.q, mode: 'insensitive' } },
    ];
  }

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const [adjustments, stores, items, statusCounts, monthCount, pendingCount] = await Promise.all([
    prisma.invAdjustment.findMany({
      where,
      include: { store: true, lines: true },
      orderBy: { adjustmentDate: 'desc' },
      take: 100,
    }),
    prisma.invStore.findMany({ where: { institutionId, academicYear, status: 'ACTIVE' } }),
    prisma.invItem.findMany({
      where: { institutionId, academicYear, status: 'ACTIVE' },
      select: {
        id: true, storeId: true, itemCode: true, itemName: true, unit: true,
        stockQty: true, weightedAvgCost: true, categoryId: true,
      },
      orderBy: { itemName: 'asc' },
      take: 500,
    }),
    prisma.invAdjustment.groupBy({
      by: ['status'],
      where: { institutionId, academicYear },
      _count: { _all: true },
    }),
    prisma.invAdjustment.count({
      where: { institutionId, academicYear, adjustmentDate: { gte: monthStart }, status: 'APPROVED' },
    }),
    prisma.invAdjustment.count({
      where: { institutionId, academicYear, status: 'PENDING_APPROVAL' },
    }),
  ]);

  await logActivity(institutionId, 'VIEW_ADJUSTMENTS', 'Stock Adjustment accessed', { academicYear });

  return {
    academicYear,
    academicYears: ACADEMIC_YEARS,
    adjustments: adjustments.map(mapAdjustmentRow),
    stores: stores.map((s) => ({ id: s.id, name: s.storeName })),
    items: items.map((i) => ({
      id: i.id,
      storeId: i.storeId,
      code: i.itemCode,
      name: i.itemName,
      unit: i.unit,
      stockQty: i.stockQty,
      unitCost: i.weightedAvgCost || 0,
    })),
    reasonCodes: REASON_CODES.map((c) => ({ code: c, label: REASON_LABELS[c] })),
    kpis: {
      totalAdjustments: adjustments.length,
      monthAdjustments: monthCount,
      pendingApproval: pendingCount,
      totalImpact: formatInr(adjustments.filter((a) => a.status === 'APPROVED').reduce((s, a) => s + Math.abs(a.financialImpact), 0)),
    },
    statusBreakdown: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'].map((st) => ({
      status: st,
      count: statusCounts.find((s) => s.status === st)?._count._all ?? 0,
    })),
    permissions: {
      canCreate: CREATOR_ROLES.has(userRole),
      canEdit: CREATOR_ROLES.has(userRole),
      canApprove: APPROVER_ROLES.has(userRole),
      canDelete: CREATOR_ROLES.has(userRole),
    },
    validationRules: [
      'Deduct adjustments cannot exceed available stock without manager review',
      'Only Inventory Manager / Principal can approve — impacts P&L directly',
    ],
    auditPolicy: 'Strict audit log on every create, submit, approve, reject, and stock commit',
    workflow: [
      'Identify Discrepancy → Create Adjustment → Specify Reason → Manager Approval → Stock & Ledger Updated',
    ],
    dashboardFeed: { adjustments: monthCount || adjustments.filter((a) => a.status === 'APPROVED').length },
  };
}

export async function getStockAdjustmentDetail(institutionId: string, adjustmentId: string) {
  const adj = await prisma.invAdjustment.findFirst({
    where: { id: adjustmentId, institutionId },
    include: {
      store: true,
      lines: { include: { item: true } },
      auditLogs: { orderBy: { createdAt: 'desc' }, take: 50 },
      ledgerEntries: { include: { item: true }, orderBy: { createdAt: 'desc' } },
    },
  });
  if (!adj) throw new Error('Adjustment not found');

  return {
    ...mapAdjustmentRow(adj),
    storeId: adj.storeId,
    adjustmentDate: formatDate(adj.adjustmentDate),
    reason: adj.reason,
    remarks: adj.remarks,
    submittedBy: adj.submittedBy || '—',
    submittedAt: adj.submittedAt ? formatDateTime(adj.submittedAt) : '—',
    approvedBy: adj.approvedBy || '—',
    approvedAt: adj.approvedAt ? formatDateTime(adj.approvedAt) : '—',
    rejectedReason: adj.rejectedReason,
    lines: adj.lines.map((l) => ({
      id: l.id,
      itemId: l.itemId,
      sku: l.item.itemCode,
      itemName: l.item.itemName,
      unit: l.item.unit,
      direction: l.direction,
      directionLabel: l.direction === 'ADD' ? 'Add' : 'Deduct',
      quantity: l.quantity,
      unitCost: l.unitCost,
      lineValue: formatInr(l.lineValue),
      reasonCode: l.reasonCode,
      reasonLabel: REASON_LABELS[l.reasonCode] ?? l.reasonCode,
      remarks: l.remarks,
      stockBefore: l.item.stockQty,
    })),
    auditTrail: adj.auditLogs.map((log) => ({
      id: log.id,
      action: log.action,
      details: log.details,
      performedBy: log.performedBy,
      at: formatDateTime(log.createdAt),
    })),
    ledgerEntries: adj.ledgerEntries.map((e) => ({
      id: e.id,
      item: e.item.itemName,
      type: e.transactionType,
      qtyIn: e.quantityIn,
      qtyOut: e.quantityOut,
      balance: e.balanceQty,
      date: formatDate(e.transactionDate),
    })),
  };
}

export async function createStockAdjustment(
  institutionId: string,
  body: {
    storeId: string;
    adjustmentDate?: string;
    reasonCode?: string;
    reason?: string;
    remarks?: string;
    academicYear?: string;
    createdBy?: string;
    lines: LineInput[];
  },
) {
  if (!body.storeId) throw new Error('Store is required');
  if (!body.lines?.length) throw new Error('At least one line item is required');

  const { assertStoreOperationsAllowed } = await import('./inventoryStoreFreeze.js');
  await assertStoreOperationsAllowed(institutionId, body.storeId);

  const academicYear = body.academicYear ?? '2025-26';
  const itemIds = body.lines.map((l) => l.itemId);
  const items = await prisma.invItem.findMany({
    where: { id: { in: itemIds }, institutionId, storeId: body.storeId },
  });
  if (items.length !== itemIds.length) throw new Error('All items must belong to the selected store');

  const itemMap = new Map(items.map((i) => [i.id, i]));
  const lineCreates = calcLines(body.lines, itemMap);
  const summary = summarize(lineCreates);

  for (const line of lineCreates) {
    if (line.direction === 'DEDUCT') {
      const item = itemMap.get(line.itemId)!;
      if (line.quantity > item.stockQty) {
        throw new Error(`Insufficient stock for ${item.itemName}: available ${item.stockQty}, requested deduct ${line.quantity}`);
      }
    }
  }

  const adjustmentNumber = await generateAdjustmentNumber(institutionId);
  const primaryReason = body.reasonCode ?? lineCreates[0]?.reasonCode ?? 'CORRECTION';

  const adj = await prisma.invAdjustment.create({
    data: {
      institutionId,
      storeId: body.storeId,
      adjustmentNumber,
      adjustmentDate: parseDate(body.adjustmentDate) ?? new Date(),
      adjustmentType: lineCreates.every((l) => l.direction === 'ADD') ? 'ADD'
        : lineCreates.every((l) => l.direction === 'DEDUCT') ? 'DEDUCT' : 'MIXED',
      reasonCode: primaryReason,
      reason: body.reason ?? REASON_LABELS[primaryReason] ?? primaryReason,
      remarks: body.remarks ?? '',
      totalQty: summary.totalQty,
      totalValue: summary.totalValue,
      financialImpact: summary.financialImpact,
      status: 'DRAFT',
      createdBy: body.createdBy ?? 'Store Keeper',
      academicYear,
      lines: { create: lineCreates },
    },
  });

  await logAdjustmentAudit(institutionId, adj.id, 'CREATED', `Adjustment ${adjustmentNumber} created`, {
    lines: lineCreates.length,
    financialImpact: summary.financialImpact,
  }, body.createdBy);

  await logActivity(institutionId, 'ADJUSTMENT_CREATED', `Draft ${adjustmentNumber} created`, { adjustmentId: adj.id }, body.createdBy);

  return { success: true, adjustmentId: adj.id, adjustmentNumber, message: `Adjustment ${adjustmentNumber} draft created` };
}

export async function updateStockAdjustment(
  institutionId: string,
  adjustmentId: string,
  body: {
    adjustmentDate?: string;
    reasonCode?: string;
    reason?: string;
    remarks?: string;
    lines?: LineInput[];
  },
) {
  const adj = await prisma.invAdjustment.findFirst({
    where: { id: adjustmentId, institutionId },
    include: { lines: true },
  });
  if (!adj) throw new Error('Adjustment not found');
  if (adj.status !== 'DRAFT') throw new Error('Only draft adjustments can be edited');

  if (body.lines?.length) {
    const items = await prisma.invItem.findMany({
      where: { id: { in: body.lines.map((l) => l.itemId) }, institutionId, storeId: adj.storeId },
    });
    const itemMap = new Map(items.map((i) => [i.id, i]));
    const lineCreates = calcLines(body.lines, itemMap);
    const summary = summarize(lineCreates);

    for (const line of lineCreates) {
      if (line.direction === 'DEDUCT') {
        const item = itemMap.get(line.itemId)!;
        if (line.quantity > item.stockQty) {
          throw new Error(`Insufficient stock for ${item.itemName}`);
        }
      }
    }

    await prisma.invAdjustmentLine.deleteMany({ where: { adjustmentId } });
    await prisma.invAdjustmentLine.createMany({
      data: lineCreates.map((l) => ({ ...l, adjustmentId })),
    });

    await prisma.invAdjustment.update({
      where: { id: adjustmentId },
      data: {
        adjustmentDate: body.adjustmentDate ? parseDate(body.adjustmentDate) ?? adj.adjustmentDate : adj.adjustmentDate,
        reasonCode: body.reasonCode ?? adj.reasonCode,
        reason: body.reason ?? adj.reason,
        remarks: body.remarks ?? adj.remarks,
        adjustmentType: lineCreates.every((l) => l.direction === 'ADD') ? 'ADD'
          : lineCreates.every((l) => l.direction === 'DEDUCT') ? 'DEDUCT' : 'MIXED',
        totalQty: summary.totalQty,
        totalValue: summary.totalValue,
        financialImpact: summary.financialImpact,
      },
    });
  } else {
    await prisma.invAdjustment.update({
      where: { id: adjustmentId },
      data: {
        adjustmentDate: body.adjustmentDate ? parseDate(body.adjustmentDate) ?? adj.adjustmentDate : adj.adjustmentDate,
        reasonCode: body.reasonCode ?? adj.reasonCode,
        reason: body.reason ?? adj.reason,
        remarks: body.remarks ?? adj.remarks,
      },
    });
  }

  await logAdjustmentAudit(institutionId, adjustmentId, 'UPDATED', `Adjustment ${adj.adjustmentNumber} updated`);
  return { success: true, message: 'Adjustment updated' };
}

export async function submitStockAdjustment(
  institutionId: string,
  adjustmentId: string,
  performedBy = 'Store Keeper',
) {
  const adj = await prisma.invAdjustment.findFirst({
    where: { id: adjustmentId, institutionId },
    include: { lines: true },
  });
  if (!adj) throw new Error('Adjustment not found');
  if (adj.status !== 'DRAFT') throw new Error('Only draft adjustments can be submitted');

  await prisma.invAdjustment.update({
    where: { id: adjustmentId },
    data: {
      status: 'PENDING_APPROVAL',
      submittedBy: performedBy,
      submittedAt: new Date(),
    },
  });

  await logAdjustmentAudit(institutionId, adjustmentId, 'SUBMITTED', `Submitted for manager approval — P&L impact ${formatInr(Math.abs(adj.financialImpact))}`, {
    financialImpact: adj.financialImpact,
  }, performedBy);

  await logActivity(institutionId, 'ADJUSTMENT_SUBMITTED', `${adj.adjustmentNumber} submitted for approval`, { adjustmentId }, performedBy);

  return { success: true, message: 'Adjustment submitted — awaiting Inventory Manager / Principal approval' };
}

async function commitAdjustmentStock(
  institutionId: string,
  adjustmentId: string,
  performedBy: string,
) {
  const adj = await prisma.invAdjustment.findFirst({
    where: { id: adjustmentId, institutionId },
    include: { lines: { include: { item: true } } },
  });
  if (!adj) throw new Error('Adjustment not found');

  for (const line of adj.lines) {
    const item = line.item;
    let newStock = item.stockQty;
    if (line.direction === 'ADD') {
      newStock += line.quantity;
    } else {
      if (line.quantity > item.stockQty) {
        throw new Error(`Insufficient stock for ${item.itemName} at approval time`);
      }
      newStock -= line.quantity;
    }

    await prisma.invItem.update({
      where: { id: item.id },
      data: { stockQty: round2(newStock) },
    });

    await prisma.invItemAuditLog.create({
      data: {
        institutionId,
        itemId: item.id,
        fieldName: 'stockQty',
        oldValue: String(item.stockQty),
        newValue: String(round2(newStock)),
        performedBy,
      },
    });

    const txType = line.direction === 'ADD' ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT';
    await prisma.invLedger.create({
      data: {
        institutionId,
        storeId: adj.storeId,
        itemId: item.id,
        adjustmentId: adj.id,
        transactionType: txType,
        referenceNo: adj.adjustmentNumber,
        quantityIn: line.direction === 'ADD' ? line.quantity : 0,
        quantityOut: line.direction === 'DEDUCT' ? line.quantity : 0,
        unitCost: line.unitCost,
        balanceQty: round2(newStock),
        transactionDate: adj.adjustmentDate,
        academicYear: adj.academicYear,
        performedBy,
      },
    });
  }

  await logAdjustmentAudit(institutionId, adjustmentId, 'STOCK_COMMITTED', `Stock & financial ledger updated for ${adj.adjustmentNumber}`, {
    lineCount: adj.lines.length,
    financialImpact: adj.financialImpact,
  }, performedBy);
}

export async function approveStockAdjustment(
  institutionId: string,
  adjustmentId: string,
  performedBy = 'Inventory Manager',
) {
  const adj = await prisma.invAdjustment.findFirst({ where: { id: adjustmentId, institutionId } });
  if (!adj) throw new Error('Adjustment not found');
  if (adj.status !== 'PENDING_APPROVAL') throw new Error('Adjustment is not pending approval');

  await commitAdjustmentStock(institutionId, adjustmentId, performedBy);

  await prisma.invAdjustment.update({
    where: { id: adjustmentId },
    data: {
      status: 'APPROVED',
      approvedBy: performedBy,
      approvedAt: new Date(),
    },
  });

  await logAdjustmentAudit(institutionId, adjustmentId, 'APPROVED', `Approved by ${performedBy} — P&L impact ${formatInr(Math.abs(adj.financialImpact))}`, {}, performedBy);
  await logActivity(institutionId, 'ADJUSTMENT_APPROVED', `${adj.adjustmentNumber} approved — stock & ledger updated`, { adjustmentId, financialImpact: adj.financialImpact }, performedBy);

  return {
    success: true,
    message: `${adj.adjustmentNumber} approved — stock updated, P&L impact ${formatInr(Math.abs(adj.financialImpact))}`,
  };
}

export async function rejectStockAdjustment(
  institutionId: string,
  adjustmentId: string,
  reason?: string,
  performedBy = 'Inventory Manager',
) {
  const adj = await prisma.invAdjustment.findFirst({ where: { id: adjustmentId, institutionId } });
  if (!adj) throw new Error('Adjustment not found');
  if (!['DRAFT', 'PENDING_APPROVAL'].includes(adj.status)) throw new Error('Cannot reject in current status');

  await prisma.invAdjustment.update({
    where: { id: adjustmentId },
    data: { status: 'REJECTED', rejectedReason: reason ?? 'Rejected' },
  });

  await logAdjustmentAudit(institutionId, adjustmentId, 'REJECTED', reason ?? 'Rejected', {}, performedBy);
  return { success: true, message: 'Adjustment rejected' };
}

export async function deleteStockAdjustment(institutionId: string, adjustmentId: string) {
  const adj = await prisma.invAdjustment.findFirst({ where: { id: adjustmentId, institutionId } });
  if (!adj) throw new Error('Adjustment not found');
  if (adj.status !== 'DRAFT') throw new Error('Only draft adjustments can be deleted');

  await prisma.invAdjustmentLine.deleteMany({ where: { adjustmentId } });
  await prisma.invAdjustmentAuditLog.deleteMany({ where: { adjustmentId } });
  await prisma.invAdjustment.delete({ where: { id: adjustmentId } });

  await logActivity(institutionId, 'ADJUSTMENT_DELETED', `Deleted draft ${adj.adjustmentNumber}`, { adjustmentId });
  return { success: true, message: 'Draft adjustment deleted' };
}

export async function seedStockAdjustmentManagement(institutionId: string) {
  await seedVendorBillManagement(institutionId);
  const academicYear = '2025-26';

  const [stores, items] = await Promise.all([
    prisma.invStore.findMany({ where: { institutionId, academicYear }, take: 2 }),
    prisma.invItem.findMany({ where: { institutionId, academicYear, status: 'ACTIVE' }, take: 15 }),
  ]);

  if (!stores.length || items.length < 3) {
    return getStockAdjustmentManagement(institutionId, academicYear);
  }

  const existing = await prisma.invAdjustment.count({ where: { institutionId } });
  const target = 32;
  if (existing < target) {
    const scenarios: { direction: 'ADD' | 'DEDUCT'; reason: string; status: string }[] = [
      { direction: 'DEDUCT', reason: 'DAMAGE', status: 'APPROVED' },
      { direction: 'DEDUCT', reason: 'EXPIRY', status: 'APPROVED' },
      { direction: 'DEDUCT', reason: 'THEFT', status: 'PENDING_APPROVAL' },
      { direction: 'ADD', reason: 'OPENING_BALANCE', status: 'APPROVED' },
      { direction: 'DEDUCT', reason: 'AUDIT_VARIANCE', status: 'DRAFT' },
      { direction: 'DEDUCT', reason: 'WRITE_OFF', status: 'APPROVED' },
      { direction: 'ADD', reason: 'CORRECTION', status: 'APPROVED' },
      { direction: 'DEDUCT', reason: 'DAMAGE', status: 'REJECTED' },
    ];

    for (let i = existing; i < target; i += 1) {
      const sc = scenarios[i % scenarios.length];
      const item = items[i % items.length];
      const qty = sc.direction === 'ADD' ? 10 + (i % 5) : Math.min(2 + (i % 3), item.stockQty || 5);

      const created = await createStockAdjustment(institutionId, {
        storeId: item.storeId,
        adjustmentDate: new Date(Date.now() - (i % 30) * 86400000).toISOString().slice(0, 10),
        reasonCode: sc.reason,
        remarks: `Seed adjustment ${i + 1} — ${REASON_LABELS[sc.reason]}`,
        academicYear,
        createdBy: 'Store Keeper',
        lines: [{
          itemId: item.id,
          direction: sc.direction,
          quantity: qty || 1,
          reasonCode: sc.reason,
        }],
      });

      if (sc.status === 'PENDING_APPROVAL' || sc.status === 'APPROVED') {
        await submitStockAdjustment(institutionId, created.adjustmentId!, 'Store Keeper');
      }
      if (sc.status === 'APPROVED') {
        await approveStockAdjustment(institutionId, created.adjustmentId!, 'Inventory Manager');
      }
      if (sc.status === 'REJECTED') {
        await submitStockAdjustment(institutionId, created.adjustmentId!, 'Store Keeper');
        await rejectStockAdjustment(institutionId, created.adjustmentId!, 'Insufficient documentation', 'Principal');
      }
    }
  }

  return getStockAdjustmentManagement(institutionId, academicYear);
}
