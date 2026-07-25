import { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { seedStockOutward } from './inventoryStockOutward.js';

const ACADEMIC_YEARS = ['2023-24', '2024-25', '2025-26', '2026-27'];
const TRANSFER_STATUSES = ['DRAFT', 'DISPATCHED', 'IN_TRANSIT', 'RECEIVED', 'DISPUTED'] as const;

const STORE_KEEPER_ROLES = new Set(['Store Keeper', 'Inventory Manager', 'Super Admin', 'Admin']);

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

export async function generateTransferNumber(institutionId: string) {
  const count = await prisma.invTransfer.count({ where: { institutionId } });
  return `TRF-${String(1001 + count).padStart(4, '0')}`;
}

function mapTransferRow(t: {
  id: string;
  transferNumber: string;
  transferDate: Date;
  totalItems: number;
  totalValue: number;
  status: string;
  vehicleInfo: string;
  driverName: string;
  dispatchedBy: string;
  receivedBy: string;
  fromStore: { storeName: string };
  toStore: { storeName: string };
}) {
  return {
    id: t.id,
    transferNumber: t.transferNumber,
    date: formatDate(t.transferDate),
    fromStore: t.fromStore.storeName,
    toStore: t.toStore.storeName,
    items: t.totalItems,
    value: formatInr(t.totalValue),
    totalValue: t.totalValue,
    status: t.status,
    statusLabel: t.status.replace(/_/g, ' '),
    vehicleInfo: t.vehicleInfo || '—',
    driverName: t.driverName || '—',
    dispatchedBy: t.dispatchedBy || '—',
    receivedBy: t.receivedBy || '—',
  };
}

export async function getTransferManagement(
  institutionId: string,
  academicYear = '2025-26',
  filters: { status?: string; storeId?: string; q?: string } = {},
  userRole = 'Store Keeper',
) {
  const where: Prisma.InvTransferWhereInput = { institutionId, academicYear };
  if (filters.status && filters.status !== 'ALL') where.status = filters.status;
  if (filters.storeId && filters.storeId !== 'ALL') {
    where.OR = [{ fromStoreId: filters.storeId }, { toStoreId: filters.storeId }];
  }
  if (filters.q) {
    where.OR = [
      { transferNumber: { contains: filters.q, mode: 'insensitive' } },
      { vehicleInfo: { contains: filters.q, mode: 'insensitive' } },
      { driverName: { contains: filters.q, mode: 'insensitive' } },
    ];
  }

  const [transfers, stores, items, statusCounts, inTransitAgg] = await Promise.all([
    prisma.invTransfer.findMany({
      where,
      include: { fromStore: true, toStore: true },
      orderBy: { transferDate: 'desc' },
      take: 100,
    }),
    prisma.invStore.findMany({ where: { institutionId, academicYear, status: 'ACTIVE' } }),
    prisma.invItem.findMany({
      where: { institutionId, academicYear, status: 'ACTIVE' },
      select: {
        id: true, storeId: true, itemCode: true, itemName: true, unit: true,
        stockQty: true, inTransitQty: true, weightedAvgCost: true, categoryId: true,
      },
      orderBy: { itemName: 'asc' },
      take: 500,
    }),
    prisma.invTransfer.groupBy({
      by: ['status'],
      where: { institutionId, academicYear },
      _count: { _all: true },
    }),
    prisma.invItem.aggregate({
      where: { institutionId, academicYear, status: 'ACTIVE' },
      _sum: { inTransitQty: true },
    }),
  ]);

  const inTransitTotal = Math.round(inTransitAgg._sum.inTransitQty ?? 0);
  const transferCount = await prisma.invTransfer.count({ where: { institutionId, academicYear } });

  await logActivity(institutionId, 'VIEW_TRANSFERS', 'Transfer / Stock Movement accessed', { academicYear });

  return {
    academicYear,
    academicYears: ACADEMIC_YEARS,
    transfers: transfers.map(mapTransferRow),
    stores: stores.map((s) => ({ id: s.id, code: s.storeCode, name: s.storeName })),
    catalog: items.map((i) => ({
      id: i.id,
      storeId: i.storeId,
      sku: i.itemCode,
      name: i.itemName,
      unit: i.unit,
      availableQty: i.stockQty,
      inTransitQty: i.inTransitQty,
      unitCost: i.weightedAvgCost,
    })),
    kpis: {
      inTransit: inTransitTotal,
      totalTransfers: transferCount,
    },
    statusBreakdown: TRANSFER_STATUSES.map((st) => ({
      status: st,
      label: st.replace(/_/g, ' '),
      count: statusCounts.find((c) => c.status === st)?._count._all ?? 0,
    })),
    permissions: {
      canCreate: STORE_KEEPER_ROLES.has(userRole),
      canDispatch: STORE_KEEPER_ROLES.has(userRole),
      canReceive: STORE_KEEPER_ROLES.has(userRole),
      canDispute: STORE_KEEPER_ROLES.has(userRole),
    },
    stateMachine: ['Draft', 'Dispatched', 'In-Transit', 'Received', 'Disputed'],
    automationRules: [
      'On dispatch: deduct from source store and move to In-Transit virtual bucket',
      'On receive: clear In-Transit and add stock to destination store',
    ],
    validationRules: [
      'Cannot transfer more than available stock at source store',
      'Source and destination stores must differ',
    ],
  };
}

export async function getTransferDetail(institutionId: string, transferId: string) {
  const transfer = await prisma.invTransfer.findFirst({
    where: { id: transferId, institutionId },
    include: {
      fromStore: true,
      toStore: true,
      lines: { include: { item: true } },
      ledgerEntries: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (!transfer) throw new Error('Transfer not found');

  return {
    ...mapTransferRow(transfer),
    fromStoreId: transfer.fromStoreId,
    toStoreId: transfer.toStoreId,
    transferDate: transfer.transferDate.toISOString().slice(0, 10),
    driverMobile: transfer.driverMobile,
    notes: transfer.notes,
    disputeReason: transfer.disputeReason,
    dispatchedAt: transfer.dispatchedAt ? formatDate(transfer.dispatchedAt) : '—',
    receivedAt: transfer.receivedAt ? formatDate(transfer.receivedAt) : '—',
    lines: transfer.lines.map((l) => ({
      id: l.id,
      itemId: l.itemId,
      sku: l.item.itemCode,
      itemName: l.item.itemName,
      unit: l.item.unit,
      quantity: l.quantity,
      receivedQty: l.receivedQty,
      unitCost: l.unitCost,
      lineValue: l.lineValue,
      pendingReceive: Math.max(0, l.quantity - l.receivedQty),
    })),
    ledger: transfer.ledgerEntries.map((e) => ({
      type: e.transactionType,
      referenceNo: e.referenceNo,
      quantityIn: e.quantityIn,
      quantityOut: e.quantityOut,
      balanceQty: e.balanceQty,
      date: formatDate(e.transactionDate),
    })),
  };
}

type TransferLineInput = { itemId: string; quantity: number; unitCost?: number };

async function findOrCreateDestItem(
  institutionId: string,
  toStoreId: string,
  sourceItem: {
    id: string;
    itemCode: string;
    itemName: string;
    unit: string;
    categoryId: string;
    brand: string;
    itemType: string;
    weightedAvgCost: number;
    academicYear: string;
  },
  transferNumber: string,
) {
  const existing = await prisma.invItem.findFirst({
    where: {
      institutionId,
      storeId: toStoreId,
      itemName: sourceItem.itemName,
      status: 'ACTIVE',
    },
  });
  if (existing) return existing;

  const destCode = `${sourceItem.itemCode}-TRF-${transferNumber.slice(-4)}`;
  const dup = await prisma.invItem.findFirst({ where: { institutionId, itemCode: destCode } });
  const itemCode = dup ? `${destCode}-${Date.now().toString().slice(-4)}` : destCode;

  return prisma.invItem.create({
    data: {
      institutionId,
      storeId: toStoreId,
      categoryId: sourceItem.categoryId,
      itemCode,
      itemName: sourceItem.itemName,
      brand: sourceItem.brand,
      itemType: sourceItem.itemType,
      unit: sourceItem.unit,
      weightedAvgCost: sourceItem.weightedAvgCost,
      academicYear: sourceItem.academicYear,
    },
  });
}

export async function createTransfer(
  institutionId: string,
  body: {
    fromStoreId: string;
    toStoreId: string;
    transferDate?: string;
    vehicleInfo?: string;
    driverName?: string;
    driverMobile?: string;
    notes?: string;
    academicYear?: string;
    lines: TransferLineInput[];
  },
) {
  const academicYear = body.academicYear ?? '2025-26';
  if (!body.fromStoreId || !body.toStoreId) throw new Error('Source and destination stores are required');
  if (body.fromStoreId === body.toStoreId) throw new Error('Source and destination must be different');
  if (!body.lines?.length) throw new Error('At least one line item is required');

  const { assertStoreOperationsAllowed } = await import('./inventoryStoreFreeze.js');
  await assertStoreOperationsAllowed(institutionId, body.fromStoreId);

  const itemIds = body.lines.map((l) => l.itemId);
  const items = await prisma.invItem.findMany({
    where: { id: { in: itemIds }, institutionId, storeId: body.fromStoreId },
  });

  for (const line of body.lines) {
    const item = items.find((i) => i.id === line.itemId);
    if (!item) throw new Error('Item not found at source store');
    if (line.quantity <= 0) throw new Error('Quantity must be greater than zero');
    if (line.quantity > item.stockQty) {
      throw new Error(`Cannot transfer ${line.quantity} ${item.unit} of ${item.itemName} — only ${item.stockQty} available`);
    }
  }

  const transferNumber = await generateTransferNumber(institutionId);
  const totalItems = body.lines.length;
  const totalValue = body.lines.reduce((s, l) => {
    const item = items.find((i) => i.id === l.itemId)!;
    const cost = l.unitCost ?? item.weightedAvgCost;
    return s + l.quantity * cost;
  }, 0);

  const transfer = await prisma.invTransfer.create({
    data: {
      institutionId,
      fromStoreId: body.fromStoreId,
      toStoreId: body.toStoreId,
      transferNumber,
      transferDate: parseDate(body.transferDate) ?? new Date(),
      totalItems,
      totalValue,
      status: 'DRAFT',
      vehicleInfo: body.vehicleInfo?.trim() ?? '',
      driverName: body.driverName?.trim() ?? '',
      driverMobile: body.driverMobile?.trim() ?? '',
      notes: body.notes?.trim() ?? '',
      academicYear,
      lines: {
        create: body.lines.map((l) => {
          const item = items.find((i) => i.id === l.itemId)!;
          const unitCost = l.unitCost ?? item.weightedAvgCost;
          return {
            itemId: l.itemId,
            quantity: l.quantity,
            unitCost,
            lineValue: l.quantity * unitCost,
          };
        }),
      },
    },
    include: { fromStore: true, toStore: true },
  });

  await logActivity(institutionId, 'TRANSFER_CREATED', `Created draft ${transferNumber}`, { transferId: transfer.id });

  return {
    success: true,
    transferId: transfer.id,
    transferNumber,
    transfer: mapTransferRow(transfer),
    message: `Transfer ${transferNumber} created as draft`,
  };
}

export async function updateTransfer(
  institutionId: string,
  transferId: string,
  body: {
    vehicleInfo?: string;
    driverName?: string;
    driverMobile?: string;
    notes?: string;
    lines?: TransferLineInput[];
  },
) {
  const transfer = await prisma.invTransfer.findFirst({ where: { id: transferId, institutionId } });
  if (!transfer) throw new Error('Transfer not found');
  if (transfer.status !== 'DRAFT') throw new Error('Only draft transfers can be edited');

  const updates: Prisma.InvTransferUpdateInput = {};
  if (body.vehicleInfo !== undefined) updates.vehicleInfo = body.vehicleInfo;
  if (body.driverName !== undefined) updates.driverName = body.driverName;
  if (body.driverMobile !== undefined) updates.driverMobile = body.driverMobile;
  if (body.notes !== undefined) updates.notes = body.notes;

  if (body.lines) {
    const items = await prisma.invItem.findMany({
      where: { institutionId, storeId: transfer.fromStoreId, id: { in: body.lines.map((l) => l.itemId) } },
    });
    for (const line of body.lines) {
      const item = items.find((i) => i.id === line.itemId);
      if (!item) throw new Error('Item not found at source store');
      if (line.quantity > item.stockQty) {
        throw new Error(`Insufficient stock for ${item.itemName}`);
      }
    }
    await prisma.invTransferLine.deleteMany({ where: { transferId } });
    const totalValue = body.lines.reduce((s, l) => {
      const item = items.find((i) => i.id === l.itemId)!;
      const cost = l.unitCost ?? item.weightedAvgCost;
      return s + l.quantity * cost;
    }, 0);
    updates.totalItems = body.lines.length;
    updates.totalValue = totalValue;
    updates.lines = {
      create: body.lines.map((l) => {
        const item = items.find((i) => i.id === l.itemId)!;
        const unitCost = l.unitCost ?? item.weightedAvgCost;
        return { itemId: l.itemId, quantity: l.quantity, unitCost, lineValue: l.quantity * unitCost };
      }),
    };
  }

  await prisma.invTransfer.update({ where: { id: transferId }, data: updates });
  return { success: true, message: 'Transfer updated' };
}

export async function dispatchTransfer(
  institutionId: string,
  transferId: string,
  performedBy = 'Store Keeper',
) {
  const transfer = await prisma.invTransfer.findFirst({
    where: { id: transferId, institutionId },
    include: { lines: { include: { item: true } } },
  });
  if (!transfer) throw new Error('Transfer not found');
  if (transfer.status !== 'DRAFT' && transfer.status !== 'DISPATCHED') {
    throw new Error('Transfer cannot be dispatched in current status');
  }

  for (const line of transfer.lines) {
    if (line.quantity > line.item.stockQty) {
      throw new Error(`Insufficient stock for ${line.item.itemName} — available ${line.item.stockQty}`);
    }
  }

  for (const line of transfer.lines) {
    const newStock = line.item.stockQty - line.quantity;
    const newInTransit = line.item.inTransitQty + line.quantity;

    await prisma.invItem.update({
      where: { id: line.itemId },
      data: { stockQty: newStock, inTransitQty: newInTransit },
    });

    await prisma.invLedger.create({
      data: {
        institutionId,
        storeId: transfer.fromStoreId,
        itemId: line.itemId,
        transferId: transfer.id,
        transactionType: 'TRANSFER_OUT',
        referenceNo: transfer.transferNumber,
        quantityOut: line.quantity,
        unitCost: line.unitCost,
        balanceQty: newStock,
        transactionDate: transfer.transferDate,
        academicYear: transfer.academicYear,
        performedBy,
      },
    });
  }

  await prisma.invTransfer.update({
    where: { id: transferId },
    data: {
      status: 'IN_TRANSIT',
      dispatchedBy: performedBy,
      dispatchedAt: new Date(),
    },
  });

  await prisma.invAlert.create({
    data: {
      institutionId,
      storeId: transfer.toStoreId,
      alertType: 'TRANSFER_IN_TRANSIT',
      severity: 'MEDIUM',
      message: `${transfer.transferNumber} in transit from ${transfer.fromStoreId} — awaiting receipt`,
      academicYear: transfer.academicYear,
    },
  });

  await logActivity(institutionId, 'TRANSFER_DISPATCHED', `Dispatched ${transfer.transferNumber} — stock in transit`, { transferId }, performedBy);

  return { success: true, message: `${transfer.transferNumber} dispatched — stock moved to In-Transit` };
}

export async function receiveTransfer(
  institutionId: string,
  transferId: string,
  performedBy = 'Store Keeper',
  lines?: { lineId: string; receivedQty: number }[],
) {
  const transfer = await prisma.invTransfer.findFirst({
    where: { id: transferId, institutionId },
    include: { lines: { include: { item: true } } },
  });
  if (!transfer) throw new Error('Transfer not found');
  if (transfer.status !== 'IN_TRANSIT') throw new Error('Transfer is not in transit');

  for (const line of transfer.lines) {
    const recvLine = lines?.find((l) => l.lineId === line.id);
    const receivedQty = recvLine?.receivedQty ?? line.quantity;

    if (receivedQty < 0 || receivedQty > line.quantity) {
      throw new Error(`Invalid receive quantity for ${line.item.itemName}`);
    }

    const sourceItem = line.item;
    await prisma.invItem.update({
      where: { id: sourceItem.id },
      data: { inTransitQty: Math.max(0, sourceItem.inTransitQty - receivedQty) },
    });

    if (receivedQty > 0) {
      const destItem = await findOrCreateDestItem(
        institutionId,
        transfer.toStoreId,
        sourceItem,
        transfer.transferNumber,
      );

      await prisma.invItem.update({
        where: { id: destItem.id },
        data: { stockQty: { increment: receivedQty } },
      });

      await prisma.invTransferLine.update({
        where: { id: line.id },
        data: { receivedQty, destItemId: destItem.id },
      });

      await prisma.invLedger.create({
        data: {
          institutionId,
          storeId: transfer.toStoreId,
          itemId: destItem.id,
          transferId: transfer.id,
          transactionType: 'TRANSFER_IN',
          referenceNo: transfer.transferNumber,
          quantityIn: receivedQty,
          unitCost: line.unitCost,
          balanceQty: destItem.stockQty + receivedQty,
          transactionDate: new Date(),
          academicYear: transfer.academicYear,
          performedBy,
        },
      });
    }

    if (receivedQty < line.quantity) {
      await prisma.invTransfer.update({
        where: { id: transferId },
        data: { status: 'DISPUTED', disputeReason: `Short receipt on ${line.item.itemName}: expected ${line.quantity}, received ${receivedQty}` },
      });
      await logActivity(institutionId, 'TRANSFER_DISPUTED', `Disputed ${transfer.transferNumber}`, { transferId }, performedBy);
      return { success: true, status: 'DISPUTED', message: `Transfer ${transfer.transferNumber} marked disputed — quantity mismatch` };
    }
  }

  await prisma.invTransfer.update({
    where: { id: transferId },
    data: { status: 'RECEIVED', receivedBy: performedBy, receivedAt: new Date() },
  });

  await logActivity(institutionId, 'TRANSFER_RECEIVED', `Received ${transfer.transferNumber} at destination`, { transferId }, performedBy);

  return { success: true, status: 'RECEIVED', message: `${transfer.transferNumber} received — stock added to destination store` };
}

export async function markTransferDispatched(
  institutionId: string,
  transferId: string,
  performedBy = 'Store Keeper',
) {
  const transfer = await prisma.invTransfer.findFirst({ where: { id: transferId, institutionId } });
  if (!transfer || transfer.status !== 'DRAFT') throw new Error('Invalid transfer for dispatch marking');

  await prisma.invTransfer.update({
    where: { id: transferId },
    data: { status: 'DISPATCHED', dispatchedBy: performedBy, dispatchedAt: new Date() },
  });

  return dispatchTransfer(institutionId, transferId, performedBy);
}

export async function deleteTransfer(institutionId: string, transferId: string) {
  const transfer = await prisma.invTransfer.findFirst({ where: { id: transferId, institutionId } });
  if (!transfer) throw new Error('Transfer not found');
  if (transfer.status !== 'DRAFT') throw new Error('Only draft transfers can be deleted');

  await prisma.invTransferLine.deleteMany({ where: { transferId } });
  await prisma.invTransfer.delete({ where: { id: transferId } });

  return { success: true, message: 'Draft transfer deleted' };
}

export async function exportTransferRegister(
  institutionId: string,
  academicYear: string,
  format: 'PDF' | 'Excel' | 'CSV',
) {
  const data = await getTransferManagement(institutionId, academicYear);
  const fileName = `transfer_register_${Date.now()}.${format.toLowerCase()}`;
  await logActivity(institutionId, 'EXPORT_TRANSFERS', `Exported transfer register as ${format}`, { rowCount: data.transfers.length });
  return { success: true, format, fileName, message: `Transfer register exported (${data.transfers.length} records)`, snapshot: data };
}

export async function seedTransferManagement(institutionId: string) {
  await seedStockOutward(institutionId);
  const academicYear = '2025-26';

  const stores = await prisma.invStore.findMany({ where: { institutionId, academicYear }, take: 4 });
  if (stores.length < 2) return getTransferManagement(institutionId, academicYear);

  const mainStore = stores.find((s) => s.storeCode === 'MAIN') ?? stores[0];
  const itStore = stores.find((s) => s.storeCode === 'IT') ?? stores[1];

  const sourceItems = await prisma.invItem.findMany({
    where: { institutionId, storeId: mainStore.id, academicYear, stockQty: { gt: 5 } },
    take: 3,
  });

  const draftExists = await prisma.invTransfer.count({ where: { institutionId, status: 'DRAFT' } });
  if (draftExists === 0 && sourceItems.length >= 2) {
    await createTransfer(institutionId, {
      fromStoreId: mainStore.id,
      toStoreId: itStore.id,
      vehicleInfo: 'School Van — KA-01-AB-1234',
      driverName: 'Ramesh Kumar',
      driverMobile: '9876543210',
      notes: 'IT lab replenishment',
      academicYear,
      lines: sourceItems.slice(0, 2).map((i) => ({ itemId: i.id, quantity: 3 })),
    });
  }

  const inTransitExists = await prisma.invTransfer.count({ where: { institutionId, status: 'IN_TRANSIT' } });
  if (inTransitExists === 0 && sourceItems[2]) {
    const created = await createTransfer(institutionId, {
      fromStoreId: mainStore.id,
      toStoreId: stores[2]?.id ?? itStore.id,
      vehicleInfo: 'Tempo Traveller — KA-02-CD-5678',
      driverName: 'Suresh Naidu',
      academicYear,
      lines: [{ itemId: sourceItems[2].id, quantity: 2 }],
    });
    try {
      await dispatchTransfer(institutionId, created.transferId!);
    } catch { /* skip if stock changed */ }
  }

  await logActivity(institutionId, 'SEED_TRANSFERS', 'Transfer / Stock Movement seeded');
  return getTransferManagement(institutionId, academicYear);
}
