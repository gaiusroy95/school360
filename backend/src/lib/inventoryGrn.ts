import { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { seedCategoriesUnits } from './inventoryCategoriesUnits.js';

const ACADEMIC_YEARS = ['2023-24', '2024-25', '2025-26', '2026-27'];
const GRN_STATUSES = ['DRAFT', 'PENDING_QA', 'RECEIVED', 'BILLED'] as const;

const STORE_KEEPER_ROLES = new Set(['Store Keeper', 'Inventory Manager', 'Super Admin', 'Admin']);
const MANAGER_ROLES = new Set(['Inventory Manager', 'Super Admin', 'Admin']);
const ACCOUNTANT_ROLES = new Set(['Accountant', 'Inventory Manager', 'Super Admin', 'Admin']);

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

function requiresExpiry(itemType: string) {
  return itemType === 'CONSUMABLE';
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

export async function generateGrnNumber(institutionId: string) {
  const count = await prisma.invGrn.count({ where: { institutionId } });
  return `GRN-${String(1024 + count).padStart(4, '0')}`;
}

function mapGrnRow(g: {
  id: string;
  grnNumber: string;
  grnDate: Date;
  challanNumber: string;
  billNumber: string;
  totalItems: number;
  totalValue: number;
  status: string;
  hasVariance: boolean;
  varianceApproved: boolean;
  apQueued: boolean;
  receivedBy: string;
  approvedBy: string;
  store: { storeName: string };
  supplier: { supplierName: string } | null;
  purchaseOrder: { poNumber: string } | null;
}) {
  return {
    id: g.id,
    grnNumber: g.grnNumber,
    date: formatDate(g.grnDate),
    grnDate: g.grnDate.toISOString().slice(0, 10),
    challanNumber: g.challanNumber,
    billNumber: g.billNumber,
    supplier: g.supplier?.supplierName ?? '—',
    store: g.store.storeName,
    poNumber: g.purchaseOrder?.poNumber ?? '—',
    items: g.totalItems,
    value: formatInr(g.totalValue),
    totalValue: g.totalValue,
    status: g.status,
    statusLabel: g.status.replace(/_/g, ' '),
    hasVariance: g.hasVariance,
    varianceApproved: g.varianceApproved,
    apQueued: g.apQueued,
    receivedBy: g.receivedBy,
    approvedBy: g.approvedBy || '—',
  };
}

function mapLineRow(l: {
  id: string;
  itemId: string;
  poLineId: string | null;
  orderedQty: number;
  pendingQty: number;
  quantity: number;
  unitCost: number;
  lineValue: number;
  batchNo: string;
  manufacturingDate: Date | null;
  expiryDate: Date | null;
  varianceOverride: boolean;
  item: { itemCode: string; itemName: string; unit: string; itemType: string };
}) {
  const overReceipt = l.quantity > l.pendingQty && l.pendingQty > 0;
  return {
    id: l.id,
    itemId: l.itemId,
    poLineId: l.poLineId,
    sku: l.item.itemCode,
    itemName: l.item.itemName,
    unit: l.item.unit,
    itemType: l.item.itemType,
    requiresExpiry: requiresExpiry(l.item.itemType),
    orderedQty: l.orderedQty,
    pendingQty: l.pendingQty,
    receivedQty: l.quantity,
    unitCost: l.unitCost,
    lineValue: l.lineValue,
    batchNo: l.batchNo,
    manufacturingDate: l.manufacturingDate?.toISOString().slice(0, 10) ?? '',
    expiryDate: l.expiryDate?.toISOString().slice(0, 10) ?? '',
    varianceOverride: l.varianceOverride,
    overReceipt,
  };
}

export async function getGrnManagement(
  institutionId: string,
  academicYear = '2025-26',
  filters: { status?: string; storeId?: string; q?: string } = {},
  userRole = 'Store Keeper',
) {
  const where: Prisma.InvGrnWhereInput = { institutionId, academicYear };
  if (filters.status && filters.status !== 'ALL') where.status = filters.status;
  if (filters.storeId && filters.storeId !== 'ALL') where.storeId = filters.storeId;
  if (filters.q) {
    where.OR = [
      { grnNumber: { contains: filters.q, mode: 'insensitive' } },
      { challanNumber: { contains: filters.q, mode: 'insensitive' } },
      { supplier: { supplierName: { contains: filters.q, mode: 'insensitive' } } },
    ];
  }

  const [grns, stores, suppliers, pendingPos, statusCounts] = await Promise.all([
    prisma.invGrn.findMany({
      where,
      include: { supplier: true, store: true, purchaseOrder: true },
      orderBy: { grnDate: 'desc' },
      take: 100,
    }),
    prisma.invStore.findMany({ where: { institutionId, academicYear, status: 'ACTIVE' } }),
    prisma.invSupplier.findMany({ where: { institutionId, academicYear, status: 'ACTIVE' } }),
    prisma.invPurchaseOrder.findMany({
      where: { institutionId, academicYear, status: { in: ['ORDERED', 'PARTIAL', 'PENDING'] } },
      include: {
        supplier: true,
        lines: { include: { item: true } },
      },
      orderBy: { poDate: 'desc' },
      take: 50,
    }),
    prisma.invGrn.groupBy({
      by: ['status'],
      where: { institutionId, academicYear },
      _count: { _all: true },
    }),
  ]);

  const pendingPoList = pendingPos.map((po) => {
    const lines = po.lines.map((l) => ({
      id: l.id,
      itemId: l.itemId,
      sku: l.item.itemCode,
      itemName: l.item.itemName,
      unit: l.item.unit,
      itemType: l.item.itemType,
      orderedQty: l.orderedQty,
      receivedQty: l.receivedQty,
      pendingQty: Math.max(0, l.orderedQty - l.receivedQty),
      unitCost: l.unitCost,
    }));
    const totalPending = lines.reduce((s, l) => s + l.pendingQty, 0);
    return {
      id: po.id,
      poNumber: po.poNumber,
      poDate: formatDate(po.poDate),
      supplierId: po.supplierId,
      supplier: po.supplier?.supplierName ?? '—',
      storeId: po.storeId,
      totalValue: formatInr(po.totalValue),
      status: po.status,
      lineCount: lines.length,
      pendingQty: totalPending,
      lines,
    };
  });

  const canViewFinancials = ACCOUNTANT_ROLES.has(userRole) || MANAGER_ROLES.has(userRole);

  await logActivity(institutionId, 'VIEW_GRN', 'Stock Inward (GRN) accessed', { academicYear, ...filters });

  return {
    academicYear,
    academicYears: ACADEMIC_YEARS,
    grns: grns.map(mapGrnRow),
    pendingPos: pendingPoList,
    stores: stores.map((s) => ({ id: s.id, code: s.storeCode, name: s.storeName })),
    suppliers: suppliers.map((s) => ({ id: s.id, code: s.supplierCode, name: s.supplierName })),
    statusBreakdown: GRN_STATUSES.map((st) => ({
      status: st,
      label: st.replace(/_/g, ' '),
      count: statusCounts.find((c) => c.status === st)?._count._all ?? 0,
    })),
    permissions: {
      canCreate: STORE_KEEPER_ROLES.has(userRole),
      canEdit: STORE_KEEPER_ROLES.has(userRole),
      canSubmit: STORE_KEEPER_ROLES.has(userRole),
      canApprove: MANAGER_ROLES.has(userRole),
      canView: true,
      canViewFinancials,
      canPrintBarcode: STORE_KEEPER_ROLES.has(userRole),
      canMarkBilled: ACCOUNTANT_ROLES.has(userRole),
    },
    stateMachine: ['Draft', 'Pending QA', 'Received', 'Billed'],
    automationRules: [
      'Auto-generate GRN Number (e.g., GRN-1024)',
      'Auto-calculate Weighted Average Cost (WAC) upon GRN commit',
      'Default Received Qty to Pending PO Qty',
    ],
    validationRules: [
      'Challan Number is mandatory',
      'Warn if Received Qty > Ordered Qty (requires Manager override)',
      'Expiry Date mandatory for Consumable items',
    ],
    reports: ['GRN Register', 'Pending PO vs GRN Report', 'Batch Expiry Report'],
    erpIntegration: ['Purchase Orders: updates PO line Received_Qty', 'Accounts Payable: queues GRN for vendor bill matching'],
  };
}

export async function getGrnDetail(institutionId: string, grnId: string) {
  const grn = await prisma.invGrn.findFirst({
    where: { id: grnId, institutionId },
    include: {
      supplier: true,
      store: true,
      purchaseOrder: { include: { lines: { include: { item: true } } } },
      lines: { include: { item: true, poLine: true } },
      batches: true,
      ledgerEntries: { orderBy: { createdAt: 'desc' }, take: 20 },
    },
  });
  if (!grn) throw new Error('GRN not found');

  return {
    ...mapGrnRow(grn),
    storeId: grn.storeId,
    supplierId: grn.supplierId,
    purchaseOrderId: grn.purchaseOrderId,
    qualityNotes: grn.qualityNotes,
    lines: grn.lines.map(mapLineRow),
    batches: grn.batches.map((b) => ({
      id: b.id,
      batchNo: b.batchNo,
      itemId: b.itemId,
      quantity: b.quantity,
      remainingQty: b.remainingQty,
      expiryDate: b.expiryDate ? formatDate(b.expiryDate) : '—',
      status: b.status,
    })),
    ledger: grn.ledgerEntries.map((e) => ({
      referenceNo: e.referenceNo,
      quantityIn: e.quantityIn,
      unitCost: e.unitCost,
      balanceQty: e.balanceQty,
      date: formatDate(e.transactionDate),
    })),
  };
}

type GrnLineInput = {
  itemId: string;
  poLineId?: string;
  orderedQty?: number;
  pendingQty?: number;
  receivedQty: number;
  unitCost: number;
  batchNo?: string;
  manufacturingDate?: string;
  expiryDate?: string;
  varianceOverride?: boolean;
};

function computeVariance(lines: GrnLineInput[]) {
  return lines.some((l) => {
    const pending = l.pendingQty ?? l.orderedQty ?? 0;
    return l.receivedQty > pending && pending > 0 && !l.varianceOverride;
  });
}

function validateLines(items: { id: string; itemType: string; itemName: string }[], lines: GrnLineInput[]) {
  for (const line of lines) {
    if (!line.receivedQty || line.receivedQty <= 0) continue;
    const item = items.find((i) => i.id === line.itemId);
    if (!item) throw new Error('Item not found');
    if (requiresExpiry(item.itemType) && !line.expiryDate) {
      throw new Error(`Expiry date required for consumable: ${item.itemName}`);
    }
  }
}

async function commitGrnStock(
  institutionId: string,
  grnId: string,
  performedBy: string,
) {
  const grn = await prisma.invGrn.findFirst({
    where: { id: grnId, institutionId },
    include: { lines: { include: { item: true, poLine: true } } },
  });
  if (!grn) throw new Error('GRN not found');

  const stockDelta = new Map<string, number>();

  for (const line of grn.lines) {
    if (line.quantity <= 0) continue;

    const item = line.item;
    const prevStock = item.stockQty + (stockDelta.get(item.id) ?? 0);
    const newStock = prevStock + line.quantity;
    stockDelta.set(item.id, (stockDelta.get(item.id) ?? 0) + line.quantity);

    const newWac = item.valuationMethod === 'WAC' || !item.valuationMethod
      ? (prevStock * item.weightedAvgCost + line.quantity * line.unitCost) / (newStock || 1)
      : line.unitCost;

    await prisma.invItem.update({
      where: { id: item.id },
      data: {
        stockQty: newStock,
        weightedAvgCost: Math.round(newWac * 100) / 100,
        baseUnitLocked: true,
      },
    });

    if (line.poLineId) {
      const poLine = line.poLine ?? await prisma.invPurchaseOrderLine.findUnique({ where: { id: line.poLineId } });
      if (poLine) {
        const newReceived = poLine.receivedQty + line.quantity;
        await prisma.invPurchaseOrderLine.update({
          where: { id: poLine.id },
          data: { receivedQty: newReceived },
        });

        const allLines = await prisma.invPurchaseOrderLine.findMany({ where: { purchaseOrderId: poLine.purchaseOrderId } });
        const allReceived = allLines.every((pl) => pl.receivedQty >= pl.orderedQty);
        const anyReceived = allLines.some((pl) => pl.receivedQty > 0);
        await prisma.invPurchaseOrder.update({
          where: { id: poLine.purchaseOrderId },
          data: { status: allReceived ? 'COMPLETED' : anyReceived ? 'PARTIAL' : 'ORDERED' },
        });
      }
    }

    if (line.batchNo) {
      await prisma.invBatch.create({
        data: {
          institutionId,
          grnId: grn.id,
          itemId: item.id,
          batchNo: line.batchNo,
          manufacturingDate: line.manufacturingDate,
          expiryDate: line.expiryDate,
          quantity: line.quantity,
          remainingQty: line.quantity,
          academicYear: grn.academicYear,
        },
      });
    }

    const balanceQty = newStock;

    await prisma.invLedger.create({
      data: {
        institutionId,
        storeId: grn.storeId,
        itemId: item.id,
        grnId: grn.id,
        transactionType: 'GRN_IN',
        referenceNo: grn.grnNumber,
        quantityIn: line.quantity,
        unitCost: line.unitCost,
        balanceQty,
        transactionDate: grn.grnDate,
        academicYear: grn.academicYear,
        performedBy,
      },
    });
  }

  await prisma.invGrn.update({
    where: { id: grnId },
    data: { status: 'RECEIVED', apQueued: true },
  });

  const supplierName = grn.supplierId
    ? (await prisma.invSupplier.findUnique({ where: { id: grn.supplierId } }))?.supplierName ?? 'Vendor'
    : 'Vendor';

  await prisma.invAlert.create({
    data: {
      institutionId,
      storeId: grn.storeId,
      alertType: 'GRN_RECEIVED',
      severity: 'LOW',
      message: `${grn.grnNumber} received from ${supplierName}`,
      academicYear: grn.academicYear,
    },
  });

  await logActivity(institutionId, 'GRN_COMMITTED', `GRN ${grn.grnNumber} committed — stock & ledger updated`, { grnId }, performedBy);

  const { refreshReorderOnStockChange } = await import('./inventoryReorderLevel.js');
  await refreshReorderOnStockChange(institutionId, grn.academicYear);
}

export async function createGrn(
  institutionId: string,
  body: {
    storeId: string;
    supplierId?: string;
    purchaseOrderId?: string;
    grnDate?: string;
    challanNumber: string;
    billNumber?: string;
    qualityNotes?: string;
    academicYear?: string;
    receivedBy?: string;
    lines?: GrnLineInput[];
  },
) {
  if (!body.challanNumber?.trim()) throw new Error('Challan Number is mandatory');
  if (!body.storeId) throw new Error('Store is required');

  const { assertStoreOperationsAllowed } = await import('./inventoryStoreFreeze.js');
  await assertStoreOperationsAllowed(institutionId, body.storeId);

  const academicYear = body.academicYear ?? '2025-26';
  const grnNumber = await generateGrnNumber(institutionId);
  const grnDate = parseDate(body.grnDate) ?? new Date();

  let lines: GrnLineInput[] = body.lines ?? [];

  if (body.purchaseOrderId && lines.length === 0) {
    const po = await prisma.invPurchaseOrder.findFirst({
      where: { id: body.purchaseOrderId, institutionId },
      include: { lines: { include: { item: true } } },
    });
    if (!po) throw new Error('Purchase Order not found');
    lines = po.lines
      .filter((l) => l.orderedQty - l.receivedQty > 0)
      .map((l) => ({
        itemId: l.itemId,
        poLineId: l.id,
        orderedQty: l.orderedQty,
        pendingQty: Math.max(0, l.orderedQty - l.receivedQty),
        receivedQty: Math.max(0, l.orderedQty - l.receivedQty),
        unitCost: l.unitCost,
      }));
  }

  const itemIds = lines.map((l) => l.itemId);
  const items = await prisma.invItem.findMany({ where: { id: { in: itemIds }, institutionId } });
  validateLines(items, lines);

  const hasVariance = computeVariance(lines);
  const totalItems = lines.filter((l) => l.receivedQty > 0).length;
  const totalValue = lines.reduce((s, l) => s + l.receivedQty * l.unitCost, 0);

  const grn = await prisma.invGrn.create({
    data: {
      institutionId,
      storeId: body.storeId,
      supplierId: body.supplierId ?? null,
      purchaseOrderId: body.purchaseOrderId ?? null,
      grnNumber,
      grnDate,
      challanNumber: body.challanNumber.trim(),
      billNumber: body.billNumber?.trim() ?? '',
      qualityNotes: body.qualityNotes?.trim() ?? '',
      totalItems,
      totalValue,
      status: 'DRAFT',
      hasVariance,
      academicYear,
      receivedBy: body.receivedBy ?? 'Store Keeper',
      lines: {
        create: lines.map((l) => ({
          itemId: l.itemId,
          poLineId: l.poLineId ?? null,
          orderedQty: l.orderedQty ?? 0,
          pendingQty: l.pendingQty ?? Math.max(0, (l.orderedQty ?? 0) - 0),
          quantity: l.receivedQty,
          unitCost: l.unitCost,
          lineValue: l.receivedQty * l.unitCost,
          batchNo: l.batchNo ?? '',
          manufacturingDate: parseDate(l.manufacturingDate),
          expiryDate: parseDate(l.expiryDate),
          varianceOverride: l.varianceOverride ?? false,
        })),
      },
    },
    include: { supplier: true, store: true, purchaseOrder: true, lines: { include: { item: true } } },
  });

  await logActivity(institutionId, 'GRN_CREATED', `Created draft ${grnNumber}`, { grnId: grn.id }, body.receivedBy);

  return {
    success: true,
    grnId: grn.id,
    grnNumber,
    grn: mapGrnRow(grn),
    message: `Draft GRN ${grnNumber} created`,
  };
}

export async function updateGrn(
  institutionId: string,
  grnId: string,
  body: {
    challanNumber?: string;
    billNumber?: string;
    qualityNotes?: string;
    grnDate?: string;
    lines?: GrnLineInput[];
  },
) {
  const grn = await prisma.invGrn.findFirst({ where: { id: grnId, institutionId } });
  if (!grn) throw new Error('GRN not found');
  if (grn.status !== 'DRAFT') throw new Error('Only draft GRNs can be edited');

  const updates: Prisma.InvGrnUpdateInput = {};
  if (body.challanNumber) updates.challanNumber = body.challanNumber.trim();
  if (body.billNumber !== undefined) updates.billNumber = body.billNumber;
  if (body.qualityNotes !== undefined) updates.qualityNotes = body.qualityNotes;
  if (body.grnDate) updates.grnDate = parseDate(body.grnDate) ?? grn.grnDate;

  if (body.lines) {
    const itemIds = body.lines.map((l) => l.itemId);
    const items = await prisma.invItem.findMany({ where: { id: { in: itemIds }, institutionId } });
    validateLines(items, body.lines);

    await prisma.invGrnLine.deleteMany({ where: { grnId } });

    const hasVariance = computeVariance(body.lines);
    const totalItems = body.lines.filter((l) => l.receivedQty > 0).length;
    const totalValue = body.lines.reduce((s, l) => s + l.receivedQty * l.unitCost, 0);

    updates.hasVariance = hasVariance;
    updates.totalItems = totalItems;
    updates.totalValue = totalValue;
    updates.lines = {
      create: body.lines.map((l) => ({
        itemId: l.itemId,
        poLineId: l.poLineId ?? null,
        orderedQty: l.orderedQty ?? 0,
        pendingQty: l.pendingQty ?? 0,
        quantity: l.receivedQty,
        unitCost: l.unitCost,
        lineValue: l.receivedQty * l.unitCost,
        batchNo: l.batchNo ?? '',
        manufacturingDate: parseDate(l.manufacturingDate),
        expiryDate: parseDate(l.expiryDate),
        varianceOverride: l.varianceOverride ?? false,
      })),
    };
  }

  await prisma.invGrn.update({ where: { id: grnId }, data: updates });
  await logActivity(institutionId, 'GRN_UPDATED', `Updated draft ${grn.grnNumber}`, { grnId });

  return { success: true, message: 'GRN updated' };
}

export async function submitGrn(
  institutionId: string,
  grnId: string,
  performedBy = 'Store Keeper',
) {
  const grn = await prisma.invGrn.findFirst({
    where: { id: grnId, institutionId },
    include: { lines: { include: { item: true } } },
  });
  if (!grn) throw new Error('GRN not found');
  if (grn.status !== 'DRAFT') throw new Error('GRN already submitted');
  if (!grn.challanNumber) throw new Error('Challan Number is mandatory');

  const items = grn.lines.map((l) => l.item);
  validateLines(items, grn.lines.map((l) => ({
    itemId: l.itemId,
    receivedQty: l.quantity,
    unitCost: l.unitCost,
    expiryDate: l.expiryDate?.toISOString().slice(0, 10),
    pendingQty: l.pendingQty,
    varianceOverride: l.varianceOverride,
  })));

  if (grn.lines.every((l) => l.quantity <= 0)) {
    throw new Error('At least one line must have received quantity');
  }

  if (grn.hasVariance && !grn.varianceApproved) {
    await prisma.invGrn.update({
      where: { id: grnId },
      data: { status: 'PENDING_QA' },
    });
    await prisma.invAlert.create({
      data: {
        institutionId,
        storeId: grn.storeId,
        alertType: 'GRN_VARIANCE',
        severity: 'HIGH',
        message: `${grn.grnNumber} has quantity variance — awaiting Inventory Manager approval`,
        academicYear: grn.academicYear,
      },
    });
    await logActivity(institutionId, 'GRN_SUBMITTED', `GRN ${grn.grnNumber} submitted with variance — pending approval`, { grnId }, performedBy);
    return { success: true, status: 'PENDING_QA', message: 'GRN submitted — variance requires Manager approval' };
  }

  await commitGrnStock(institutionId, grnId, performedBy);
  return { success: true, status: 'RECEIVED', message: `GRN ${grn.grnNumber} received — stock ledger updated` };
}

export async function approveGrn(
  institutionId: string,
  grnId: string,
  performedBy = 'Inventory Manager',
  overrideVariance = true,
) {
  const grn = await prisma.invGrn.findFirst({ where: { id: grnId, institutionId } });
  if (!grn) throw new Error('GRN not found');
  if (grn.status !== 'PENDING_QA') throw new Error('GRN is not pending approval');

  if (overrideVariance) {
    await prisma.invGrnLine.updateMany({
      where: { grnId },
      data: { varianceOverride: true },
    });
  }

  await prisma.invGrn.update({
    where: { id: grnId },
    data: {
      varianceApproved: true,
      approvedBy: performedBy,
      approvedAt: new Date(),
    },
  });

  await commitGrnStock(institutionId, grnId, performedBy);
  await logActivity(institutionId, 'GRN_APPROVED', `GRN ${grn.grnNumber} approved by manager`, { grnId }, performedBy);

  return { success: true, message: `GRN ${grn.grnNumber} approved — stock committed` };
}

export async function markGrnBilled(institutionId: string, grnId: string, performedBy = 'Accountant') {
  const grn = await prisma.invGrn.findFirst({ where: { id: grnId, institutionId } });
  if (!grn) throw new Error('GRN not found');
  if (grn.status !== 'RECEIVED') throw new Error('Only received GRNs can be marked as billed');

  await prisma.invGrn.update({ where: { id: grnId }, data: { status: 'BILLED' } });
  await logActivity(institutionId, 'GRN_BILLED', `GRN ${grn.grnNumber} marked billed (AP matched)`, { grnId }, performedBy);

  return { success: true, message: `GRN ${grn.grnNumber} marked as Billed` };
}

export async function deleteGrn(institutionId: string, grnId: string) {
  const grn = await prisma.invGrn.findFirst({ where: { id: grnId, institutionId } });
  if (!grn) throw new Error('GRN not found');
  if (grn.status !== 'DRAFT') throw new Error('Only draft GRNs can be deleted');

  await prisma.invGrnLine.deleteMany({ where: { grnId } });
  await prisma.invGrn.delete({ where: { id: grnId } });
  await logActivity(institutionId, 'GRN_DELETED', `Deleted draft ${grn.grnNumber}`, { grnId });

  return { success: true, message: 'Draft GRN deleted' };
}

export async function exportGrnRegister(
  institutionId: string,
  academicYear: string,
  format: 'PDF' | 'Excel' | 'CSV',
) {
  const data = await getGrnManagement(institutionId, academicYear);
  const fileName = `grn_register_${Date.now()}.${format.toLowerCase()}`;
  await logActivity(institutionId, 'EXPORT_GRN', `Exported GRN register as ${format}`, { rowCount: data.grns.length });
  return { success: true, format, fileName, message: `GRN Register exported (${data.grns.length} records)`, snapshot: data };
}

export async function seedGrnManagement(institutionId: string) {
  await seedCategoriesUnits(institutionId);
  const academicYear = '2025-26';

  const [stores, suppliers, items] = await Promise.all([
    prisma.invStore.findMany({ where: { institutionId, academicYear }, take: 3 }),
    prisma.invSupplier.findMany({ where: { institutionId, academicYear }, take: 3 }),
    prisma.invItem.findMany({ where: { institutionId, academicYear, status: 'ACTIVE' }, take: 10 }),
  ]);

  if (!stores.length || !suppliers.length || items.length < 3) {
    return getGrnManagement(institutionId, academicYear);
  }

  const existingPoLines = await prisma.invPurchaseOrderLine.count({ where: { purchaseOrder: { institutionId } } });
  if (existingPoLines === 0) {
    for (let i = 0; i < 3; i += 1) {
      const po = await prisma.invPurchaseOrder.create({
        data: {
          institutionId,
          storeId: stores[i % stores.length].id,
          supplierId: suppliers[i % suppliers.length].id,
          poNumber: `PO-2025-${String(100 + i).padStart(3, '0')}`,
          poDate: new Date(Date.now() - (i + 5) * 86400000),
          expectedDate: new Date(Date.now() + 7 * 86400000),
          totalValue: 0,
          status: 'ORDERED',
          academicYear,
          lines: {
            create: [
              {
                itemId: items[i % items.length].id,
                orderedQty: 100,
                receivedQty: i === 0 ? 40 : 0,
                unitCost: items[i % items.length].weightedAvgCost || 100,
                lineValue: 100 * (items[i % items.length].weightedAvgCost || 100),
              },
              {
                itemId: items[(i + 1) % items.length].id,
                orderedQty: 50,
                receivedQty: 0,
                unitCost: items[(i + 1) % items.length].weightedAvgCost || 80,
                lineValue: 50 * (items[(i + 1) % items.length].weightedAvgCost || 80),
              },
            ],
          },
        },
        include: { lines: true },
      });
      const totalValue = po.lines.reduce((s, l) => s + l.lineValue, 0);
      await prisma.invPurchaseOrder.update({
        where: { id: po.id },
        data: { totalValue, status: i === 0 ? 'PARTIAL' : 'ORDERED' },
      });
    }
  }

  const poWithLines = await prisma.invPurchaseOrder.findFirst({
    where: { institutionId, academicYear, status: { in: ['ORDERED', 'PARTIAL', 'PENDING'] } },
    include: { lines: { include: { item: true } }, supplier: true },
  });

  const draftExists = await prisma.invGrn.count({ where: { institutionId, status: 'DRAFT' } });
  if (draftExists === 0 && poWithLines) {
    const line = poWithLines.lines[0];
    const pending = Math.max(0, line.orderedQty - line.receivedQty);
    await createGrn(institutionId, {
      storeId: poWithLines.storeId,
      supplierId: poWithLines.supplierId ?? undefined,
      purchaseOrderId: poWithLines.id,
      challanNumber: 'CH-2025-8842',
      billNumber: 'BILL-44521',
      academicYear,
      lines: [{
        itemId: line.itemId,
        poLineId: line.id,
        orderedQty: line.orderedQty,
        pendingQty: pending,
        receivedQty: Math.min(pending, 30),
        unitCost: line.unitCost,
        batchNo: line.item.itemType === 'CONSUMABLE' ? 'BATCH-2025-A1' : '',
        expiryDate: line.item.itemType === 'CONSUMABLE'
          ? new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10)
          : undefined,
      }],
    });
  }

  const pendingQaExists = await prisma.invGrn.count({ where: { institutionId, status: 'PENDING_QA' } });
  if (pendingQaExists === 0 && poWithLines && poWithLines.lines[1]) {
    const line = poWithLines.lines[1];
    const grnNumber = await generateGrnNumber(institutionId);
    await prisma.invGrn.create({
      data: {
        institutionId,
        storeId: poWithLines.storeId,
        supplierId: poWithLines.supplierId,
        purchaseOrderId: poWithLines.id,
        grnNumber,
        grnDate: new Date(),
        challanNumber: 'CH-2025-9901',
        totalItems: 1,
        totalValue: line.unitCost * (line.orderedQty + 10),
        status: 'PENDING_QA',
        hasVariance: true,
        academicYear,
        lines: {
          create: [{
            itemId: line.itemId,
            poLineId: line.id,
            orderedQty: line.orderedQty,
            pendingQty: line.orderedQty - line.receivedQty,
            quantity: line.orderedQty + 10,
            unitCost: line.unitCost,
            lineValue: line.unitCost * (line.orderedQty + 10),
            batchNo: 'BATCH-OVR-01',
            expiryDate: new Date(Date.now() + 180 * 86400000),
          }],
        },
      },
    });
  }

  const legacyGrns = await prisma.invGrn.findMany({
    where: { institutionId, status: 'RECEIVED', challanNumber: '' },
    take: 5,
  });
  for (const g of legacyGrns) {
    await prisma.invGrn.update({
      where: { id: g.id },
      data: { challanNumber: `CH-LEGACY-${g.grnNumber}`, apQueued: true },
    });
  }

  await logActivity(institutionId, 'SEED_GRN', 'Stock Inward (GRN) module seeded');
  return getGrnManagement(institutionId, academicYear);
}
