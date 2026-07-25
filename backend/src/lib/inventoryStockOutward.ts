import { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { lookupBarcode } from './inventoryBarcodes.js';
import { seedGrnManagement } from './inventoryGrn.js';

const ACADEMIC_YEARS = ['2023-24', '2024-25', '2025-26', '2026-27'];
const OUTWARD_TYPES = ['ISSUE_TO_DEPT', 'ISSUE_TO_STAFF', 'SALE_TO_STUDENT'] as const;
const CONSUMER_TYPES = ['STUDENT', 'STAFF', 'DEPARTMENT'] as const;

const STORE_KEEPER_ROLES = new Set(['Store Keeper', 'Inventory Manager', 'Super Admin', 'Admin']);
const DEPT_HEAD_ROLES = new Set(['Department Head', 'Inventory Manager', 'Super Admin', 'Admin']);
const ACCOUNTANT_ROLES = new Set(['Accountant', 'Inventory Manager', 'Super Admin', 'Admin']);

const CONSUMER_SEED = {
  students: [
    { id: 'STU-1001', name: 'Rahul Sharma', class: '10-A' },
    { id: 'STU-1002', name: 'Priya Patel', class: '9-B' },
    { id: 'STU-1003', name: 'Amit Kumar', class: '12-Sci' },
  ],
  staff: [
    { id: 'STF-201', name: 'Mr. Rajesh Verma', dept: 'Science' },
    { id: 'STF-202', name: 'Ms. Anita Desai', dept: 'Admin' },
    { id: 'STF-203', name: 'Mr. Suresh Iyer', dept: 'Sports' },
  ],
  departments: [
    { id: 'DEPT-SCI', name: 'Science Department' },
    { id: 'DEPT-ADMIN', name: 'Administration' },
    { id: 'DEPT-SPORT', name: 'Sports Department' },
    { id: 'DEPT-LAB', name: 'Chemistry Lab' },
  ],
};

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

function outwardTypeForConsumer(consumerType: string) {
  if (consumerType === 'STUDENT') return 'SALE_TO_STUDENT';
  if (consumerType === 'DEPARTMENT') return 'ISSUE_TO_DEPT';
  return 'ISSUE_TO_STAFF';
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

export async function generateOutwardNumber(institutionId: string) {
  const count = await prisma.invStockOutward.count({ where: { institutionId } });
  return `OUT-${String(1001 + count).padStart(4, '0')}`;
}

export async function generateSalesInvoiceNo(institutionId: string) {
  const count = await prisma.invStockOutward.count({
    where: { institutionId, outwardType: 'SALE_TO_STUDENT' },
  });
  return `INV-SALE-${String(1001 + count).padStart(4, '0')}`;
}

function mapOutwardRow(o: {
  id: string;
  outwardNumber: string;
  outwardDate: Date;
  outwardType: string;
  consumerType: string;
  consumerName: string;
  totalItems: number;
  totalValue: number;
  status: string;
  salesInvoiceNo: string;
  paymentMethod: string;
  paymentStatus: string;
  issuedBy: string;
  issuedTo: string;
  store: { storeName: string };
}) {
  return {
    id: o.id,
    outwardNumber: o.outwardNumber,
    date: formatDate(o.outwardDate),
    outwardType: o.outwardType,
    outwardTypeLabel: o.outwardType.replace(/_/g, ' '),
    consumerType: o.consumerType,
    consumerName: o.consumerName || o.issuedTo || '—',
    store: o.store.storeName,
    items: o.totalItems,
    value: formatInr(o.totalValue),
    totalValue: o.totalValue,
    status: o.status,
    salesInvoiceNo: o.salesInvoiceNo || '—',
    paymentMethod: o.paymentMethod || '—',
    paymentStatus: o.paymentStatus || '—',
    issuedBy: o.issuedBy,
  };
}

async function allocateFifoBatches(
  institutionId: string,
  itemId: string,
  qty: number,
  academicYear: string,
) {
  const batches = await prisma.invBatch.findMany({
    where: {
      institutionId,
      itemId,
      academicYear,
      status: 'ACTIVE',
      remainingQty: { gt: 0 },
    },
    orderBy: [{ expiryDate: 'asc' }, { createdAt: 'asc' }],
  });

  const allocations: { batchId: string; batchNo: string; qty: number }[] = [];
  let remaining = qty;

  for (const batch of batches) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, batch.remainingQty);
    allocations.push({ batchId: batch.id, batchNo: batch.batchNo, qty: take });
    remaining -= take;
  }

  if (remaining > 0) {
    allocations.push({ batchId: '', batchNo: '—', qty: remaining });
  }

  return allocations;
}

async function deductStockAndLedger(
  institutionId: string,
  outward: {
    id: string;
    outwardNumber: string;
    storeId: string;
    outwardDate: Date;
    academicYear: string;
    issuedBy: string;
  },
  lines: {
    itemId: string;
    quantity: number;
    unitCost: number;
    batchId?: string;
    batchNo?: string;
    item: { id: string; stockQty: number; itemType: string; itemName: string };
  }[],
) {
  const stockDelta = new Map<string, number>();

  for (const line of lines) {
    if (line.quantity <= 0) continue;

    const item = line.item;
    const currentStock = item.stockQty - (stockDelta.get(item.id) ?? 0);
    if (line.quantity > currentStock) {
      throw new Error(`Insufficient stock for ${item.itemName}. Available: ${currentStock}`);
    }

    stockDelta.set(item.id, (stockDelta.get(item.id) ?? 0) + line.quantity);
    const newStock = item.stockQty - (stockDelta.get(item.id) ?? 0);

    await prisma.invItem.update({
      where: { id: item.id },
      data: {
        stockQty: newStock,
        monthlyUsage: { increment: line.quantity },
      },
    });

    if (line.batchId && line.item.itemType === 'CONSUMABLE') {
      const batch = await prisma.invBatch.findUnique({ where: { id: line.batchId } });
      if (batch) {
        await prisma.invBatch.update({
          where: { id: batch.id },
          data: { remainingQty: Math.max(0, batch.remainingQty - line.quantity) },
        });
      }
    }

    await prisma.invLedger.create({
      data: {
        institutionId,
        storeId: outward.storeId,
        itemId: item.id,
        outwardId: outward.id,
        transactionType: 'OUTWARD',
        referenceNo: outward.outwardNumber,
        quantityOut: line.quantity,
        unitCost: line.unitCost,
        balanceQty: newStock,
        transactionDate: outward.outwardDate,
        academicYear: outward.academicYear,
        performedBy: outward.issuedBy,
      },
    });
  }
}

export async function getStockOutwardManagement(
  institutionId: string,
  academicYear = '2025-26',
  filters: { outwardType?: string; storeId?: string; q?: string } = {},
  userRole = 'Store Keeper',
) {
  const where: Prisma.InvStockOutwardWhereInput = { institutionId, academicYear };
  if (filters.outwardType && filters.outwardType !== 'ALL') where.outwardType = filters.outwardType;
  if (filters.storeId && filters.storeId !== 'ALL') where.storeId = filters.storeId;
  if (filters.q) {
    where.OR = [
      { outwardNumber: { contains: filters.q, mode: 'insensitive' } },
      { consumerName: { contains: filters.q, mode: 'insensitive' } },
      { salesInvoiceNo: { contains: filters.q, mode: 'insensitive' } },
    ];
  }

  const [outwards, stores, items, approvedIndents, typeCounts] = await Promise.all([
    prisma.invStockOutward.findMany({
      where,
      include: { store: true },
      orderBy: { outwardDate: 'desc' },
      take: 100,
    }),
    prisma.invStore.findMany({ where: { institutionId, academicYear, status: 'ACTIVE' } }),
    prisma.invItem.findMany({
      where: { institutionId, academicYear, status: 'ACTIVE' },
      select: {
        id: true, itemCode: true, itemName: true, unit: true, barcode: true,
        stockQty: true, weightedAvgCost: true, itemType: true,
      },
      orderBy: { itemName: 'asc' },
      take: 500,
    }),
    prisma.invOutwardIndent.findMany({
      where: { institutionId, academicYear, status: 'APPROVED' },
      include: { lines: { include: { item: true } } },
      orderBy: { approvedAt: 'desc' },
      take: 20,
    }),
    prisma.invStockOutward.groupBy({
      by: ['outwardType'],
      where: { institutionId, academicYear },
      _count: { _all: true },
      _sum: { totalValue: true },
    }),
  ]);

  await logActivity(institutionId, 'VIEW_OUTWARD', 'Stock Outward accessed', { academicYear });

  return {
    academicYear,
    academicYears: ACADEMIC_YEARS,
    outwards: outwards.map(mapOutwardRow),
    stores: stores.map((s) => ({ id: s.id, code: s.storeCode, name: s.storeName })),
    catalog: items.map((i) => ({
      id: i.id,
      sku: i.itemCode,
      name: i.itemName,
      unit: i.unit,
      barcode: i.barcode,
      availableQty: i.stockQty,
      unitCost: i.weightedAvgCost,
      salePrice: Math.round(i.weightedAvgCost * 1.15),
      itemType: i.itemType,
    })),
    consumers: CONSUMER_SEED,
    approvedIndents: approvedIndents.map((ind) => ({
      id: ind.id,
      indentNumber: ind.indentNumber,
      department: ind.departmentName,
      approvedBy: ind.approvedBy,
      approvedAt: ind.approvedAt ? formatDate(ind.approvedAt) : '—',
      lines: ind.lines.map((l) => ({
        itemId: l.itemId,
        sku: l.item.itemCode,
        itemName: l.item.itemName,
        unit: l.item.unit,
        requestedQty: l.requestedQty,
        pendingQty: Math.max(0, l.requestedQty - l.issuedQty),
        unitCost: l.unitCost,
        availableStock: l.item.stockQty,
      })),
    })),
    outwardTypes: OUTWARD_TYPES.map((t) => ({
      value: t,
      label: t.replace(/_/g, ' '),
    })),
    consumerTypes: CONSUMER_TYPES.map((t) => ({ value: t, label: t })),
    paymentMethods: ['CASH', 'WALLET', 'GATEWAY', 'CREDIT'],
    typeBreakdown: OUTWARD_TYPES.map((t) => {
      const row = typeCounts.find((c) => c.outwardType === t);
      return {
        type: t,
        label: t.replace(/_/g, ' '),
        count: row?._count._all ?? 0,
        value: formatInr(row?._sum.totalValue ?? 0),
      };
    }),
    permissions: {
      canCreate: STORE_KEEPER_ROLES.has(userRole),
      canCheckout: STORE_KEEPER_ROLES.has(userRole),
      canApproveIndent: DEPT_HEAD_ROLES.has(userRole),
      canViewSales: ACCOUNTANT_ROLES.has(userRole),
      canViewFinancials: ACCOUNTANT_ROLES.has(userRole) || STORE_KEEPER_ROLES.has(userRole),
    },
    automationRules: [
      'Auto-generate Sales Invoice for Student purchases',
      'FIFO auto-selection of batches for consumable outward entries',
      'Real-time stock deduction on checkout',
    ],
    validationRules: [
      'Negative stock restriction: cannot issue more than available quantity',
      'Department issues require approved indent',
    ],
    erpIntegration: [
      'Fees & Finance: student sales post to fee ledger',
      'HR/Payroll: staff asset issuance maps to employee custody record',
    ],
    notifications: [
      'Email/App receipt to Student/Parent upon purchase',
      'Email to Staff upon item issuance',
    ],
  };
}

export async function lookupItemByBarcode(
  institutionId: string,
  code: string,
  academicYear = '2025-26',
) {
  const result = await lookupBarcode(institutionId, code, academicYear);
  return {
    id: result.item.id,
    sku: result.item.sku,
    name: result.item.name,
    unit: result.item.unit,
    barcode: result.code,
    availableQty: result.item.availableQty,
    unitCost: result.item.unitCost,
    salePrice: Math.round(result.item.unitCost * 1.15),
    itemType: result.item.itemType,
    batch: result.batch,
    assetSerialNo: result.assetSerialNo,
  };
}

export async function getOutwardDetail(institutionId: string, outwardId: string) {
  const outward = await prisma.invStockOutward.findFirst({
    where: { id: outwardId, institutionId },
    include: {
      store: true,
      indent: true,
      lines: { include: { item: true } },
      ledgerEntries: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (!outward) throw new Error('Outward entry not found');

  return {
    ...mapOutwardRow(outward),
    storeId: outward.storeId,
    indentId: outward.indentId,
    indentNumber: outward.indent?.indentNumber ?? '—',
    consumerId: outward.consumerId,
    receiptSent: outward.receiptSent,
    feeLedgerPosted: outward.feeLedgerPosted,
    lines: outward.lines.map((l) => ({
      id: l.id,
      itemId: l.itemId,
      sku: l.item.itemCode,
      itemName: l.item.itemName,
      unit: l.item.unit,
      quantity: l.quantity,
      unitCost: l.unitCost,
      unitPrice: l.unitPrice,
      lineValue: l.lineValue,
      batchNo: l.batchNo || '—',
    })),
    ledger: outward.ledgerEntries.map((e) => ({
      referenceNo: e.referenceNo,
      quantityOut: e.quantityOut,
      balanceQty: e.balanceQty,
      date: formatDate(e.transactionDate),
    })),
  };
}

type CartLine = {
  itemId: string;
  quantity: number;
  unitCost?: number;
  unitPrice?: number;
  batchId?: string;
  batchNo?: string;
};

export async function checkoutStockOutward(
  institutionId: string,
  body: {
    storeId: string;
    consumerType: string;
    consumerId?: string;
    consumerName?: string;
    indentId?: string;
    outwardDate?: string;
    academicYear?: string;
    issuedBy?: string;
    paymentMethod?: string;
    lines: CartLine[];
  },
) {
  const academicYear = body.academicYear ?? '2025-26';
  if (!body.storeId) throw new Error('Store is required');
  if (!body.lines?.length) throw new Error('Cart is empty');
  if (!body.consumerType) throw new Error('Consumer type is required');

  const { assertStoreOperationsAllowed } = await import('./inventoryStoreFreeze.js');
  await assertStoreOperationsAllowed(institutionId, body.storeId);

  const outwardType = outwardTypeForConsumer(body.consumerType);

  if (body.consumerType === 'DEPARTMENT' && !body.indentId) {
    throw new Error('Approved indent is required for department issues');
  }

  if (body.indentId) {
    const indent = await prisma.invOutwardIndent.findFirst({
      where: { id: body.indentId, institutionId, status: 'APPROVED' },
    });
    if (!indent) throw new Error('Approved indent not found');
  }

  const itemIds = body.lines.map((l) => l.itemId);
  const items = await prisma.invItem.findMany({
    where: { id: { in: itemIds }, institutionId, storeId: body.storeId },
  });
  const itemMap = new Map(items.map((i) => [i.id, i]));

  const expandedLines: {
    itemId: string;
    quantity: number;
    unitCost: number;
    unitPrice: number;
    batchId: string;
    batchNo: string;
    item: typeof items[0];
  }[] = [];

  const qtyByItem = new Map<string, number>();
  for (const line of body.lines) {
    qtyByItem.set(line.itemId, (qtyByItem.get(line.itemId) ?? 0) + line.quantity);
  }
  for (const [itemId, totalQty] of qtyByItem) {
    const item = itemMap.get(itemId);
    if (!item) throw new Error('Item not found in selected store');
    if (totalQty > item.stockQty) {
      throw new Error(`Cannot issue ${totalQty} ${item.unit} of ${item.itemName} — only ${item.stockQty} available`);
    }
  }

  for (const line of body.lines) {
    const item = itemMap.get(line.itemId)!;
    const unitCost = line.unitCost ?? item.weightedAvgCost;
    const unitPrice = outwardType === 'SALE_TO_STUDENT'
      ? (line.unitPrice ?? Math.round(unitCost * 1.15))
      : unitCost;

    if (item.itemType === 'CONSUMABLE') {
      const allocations = await allocateFifoBatches(institutionId, item.id, line.quantity, academicYear);
      for (const alloc of allocations) {
        expandedLines.push({
          itemId: item.id,
          quantity: alloc.qty,
          unitCost,
          unitPrice,
          batchId: alloc.batchId,
          batchNo: alloc.batchNo,
          item,
        });
      }
    } else {
      expandedLines.push({
        itemId: item.id,
        quantity: line.quantity,
        unitCost,
        unitPrice,
        batchId: line.batchId ?? '',
        batchNo: line.batchNo ?? '',
        item,
      });
    }
  }

  const outwardNumber = await generateOutwardNumber(institutionId);
  const salesInvoiceNo = outwardType === 'SALE_TO_STUDENT'
    ? await generateSalesInvoiceNo(institutionId)
    : '';
  const paymentStatus = outwardType === 'SALE_TO_STUDENT'
    ? (body.paymentMethod ? 'PAID' : 'PENDING')
    : 'N/A';

  const totalItems = body.lines.length;
  const totalValue = expandedLines.reduce((s, l) => s + l.quantity * (outwardType === 'SALE_TO_STUDENT' ? l.unitPrice : l.unitCost), 0);

  const consumerName = body.consumerName
    || CONSUMER_SEED.students.find((s) => s.id === body.consumerId)?.name
    || CONSUMER_SEED.staff.find((s) => s.id === body.consumerId)?.name
    || CONSUMER_SEED.departments.find((d) => d.id === body.consumerId)?.name
    || body.consumerId
    || '';

  const outward = await prisma.invStockOutward.create({
    data: {
      institutionId,
      storeId: body.storeId,
      indentId: body.indentId ?? null,
      outwardNumber,
      outwardType,
      consumerType: body.consumerType,
      consumerId: body.consumerId ?? '',
      consumerName,
      outwardDate: parseDate(body.outwardDate) ?? new Date(),
      totalItems,
      totalValue,
      issuedTo: consumerName,
      salesInvoiceNo,
      paymentMethod: body.paymentMethod ?? '',
      paymentStatus,
      status: 'ISSUED',
      academicYear,
      issuedBy: body.issuedBy ?? 'Store Keeper',
      receiptSent: true,
      feeLedgerPosted: outwardType === 'SALE_TO_STUDENT',
      lines: {
        create: expandedLines.map((l) => ({
          itemId: l.itemId,
          batchId: l.batchId || null,
          batchNo: l.batchNo,
          quantity: l.quantity,
          unitCost: l.unitCost,
          unitPrice: l.unitPrice,
          lineValue: l.quantity * (outwardType === 'SALE_TO_STUDENT' ? l.unitPrice : l.unitCost),
        })),
      },
    },
    include: { lines: { include: { item: true } }, store: true },
  });

  await deductStockAndLedger(
    institutionId,
    {
      id: outward.id,
      outwardNumber: outward.outwardNumber,
      storeId: outward.storeId,
      outwardDate: outward.outwardDate,
      academicYear: outward.academicYear,
      issuedBy: outward.issuedBy,
    },
    outward.lines.map((l) => ({
      itemId: l.itemId,
      quantity: l.quantity,
      unitCost: l.unitCost,
      batchId: l.batchId ?? undefined,
      batchNo: l.batchNo,
      item: l.item,
    })),
  );

  if (body.indentId) {
    for (const line of body.lines) {
      const indentLine = await prisma.invOutwardIndentLine.findFirst({
        where: { indentId: body.indentId, itemId: line.itemId },
      });
      if (indentLine) {
        await prisma.invOutwardIndentLine.update({
          where: { id: indentLine.id },
          data: { issuedQty: { increment: line.quantity } },
        });
      }
    }
    const indentLines = await prisma.invOutwardIndentLine.findMany({ where: { indentId: body.indentId } });
    const fulfilled = indentLines.every((l) => l.issuedQty >= l.requestedQty);
    if (fulfilled) {
      await prisma.invOutwardIndent.update({
        where: { id: body.indentId },
        data: { status: 'FULFILLED' },
      });
    }
  }

  const notifMsg = outwardType === 'SALE_TO_STUDENT'
    ? `Sales receipt sent to ${consumerName} — Invoice ${salesInvoiceNo}`
    : `Issuance notification sent to ${consumerName}`;

  await prisma.invAlert.create({
    data: {
      institutionId,
      storeId: body.storeId,
      alertType: outwardType === 'SALE_TO_STUDENT' ? 'STUDENT_SALE' : 'STOCK_ISSUED',
      severity: 'LOW',
      message: `${outwardNumber}: ${notifMsg}`,
      academicYear,
    },
  });

  await logActivity(
    institutionId,
    'OUTWARD_CHECKOUT',
    `Checkout ${outwardNumber} — ${totalItems} items to ${consumerName}`,
    { outwardId: outward.id, salesInvoiceNo },
    body.issuedBy,
  );

  const { refreshReorderOnStockChange } = await import('./inventoryReorderLevel.js');
  await refreshReorderOnStockChange(institutionId, academicYear);

  return {
    success: true,
    outwardId: outward.id,
    outwardNumber,
    salesInvoiceNo: salesInvoiceNo || undefined,
    totalValue: formatInr(totalValue),
    message: outwardType === 'SALE_TO_STUDENT'
      ? `Sale completed — Invoice ${salesInvoiceNo}, stock deducted`
      : `Items issued to ${consumerName}, stock deducted`,
    outward: mapOutwardRow(outward),
  };
}

export async function exportOutwardRegister(
  institutionId: string,
  academicYear: string,
  format: 'PDF' | 'Excel' | 'CSV',
) {
  const data = await getStockOutwardManagement(institutionId, academicYear);
  const fileName = `outward_register_${Date.now()}.${format.toLowerCase()}`;
  await logActivity(institutionId, 'EXPORT_OUTWARD', `Exported outward register as ${format}`, { rowCount: data.outwards.length });
  return { success: true, format, fileName, message: `Outward register exported (${data.outwards.length} records)`, snapshot: data };
}

export async function seedStockOutward(institutionId: string) {
  await seedGrnManagement(institutionId);
  const academicYear = '2025-26';

  const [store, items] = await Promise.all([
    prisma.invStore.findFirst({ where: { institutionId, academicYear } }),
    prisma.invItem.findMany({ where: { institutionId, academicYear, status: 'ACTIVE' }, take: 8 }),
  ]);

  if (!store || items.length < 3) {
    return getStockOutwardManagement(institutionId, academicYear);
  }

  const indentExists = await prisma.invOutwardIndent.count({ where: { institutionId } });
  if (indentExists === 0) {
    await prisma.invOutwardIndent.create({
      data: {
        institutionId,
        storeId: store.id,
        indentNumber: 'IND-2025-042',
        departmentName: 'Chemistry Lab',
        requestedBy: 'Lab Assistant',
        approvedBy: 'Department Head — Science',
        approvedAt: new Date(Date.now() - 2 * 86400000),
        status: 'APPROVED',
        academicYear,
        notes: 'Monthly lab consumables',
        lines: {
          create: items.slice(0, 2).map((item, i) => ({
            itemId: item.id,
            requestedQty: 10 + i * 5,
            unitCost: item.weightedAvgCost || 50,
          })),
        },
      },
    });

    await prisma.invOutwardIndent.create({
      data: {
        institutionId,
        storeId: store.id,
        indentNumber: 'IND-2025-043',
        departmentName: 'Sports Department',
        requestedBy: 'Sports Coach',
        approvedBy: 'Department Head — Sports',
        approvedAt: new Date(Date.now() - 86400000),
        status: 'APPROVED',
        academicYear,
        lines: {
          create: [{
            itemId: items[2].id,
            requestedQty: 5,
            unitCost: items[2].weightedAvgCost || 100,
          }],
        },
      },
    });
  }

  const outwardCount = await prisma.invStockOutward.count({
    where: { institutionId, outwardType: { in: ['ISSUE_TO_STAFF', 'SALE_TO_STUDENT'] } },
  });

  if (outwardCount < 2 && items[0].stockQty > 5) {
    try {
      await checkoutStockOutward(institutionId, {
        storeId: store.id,
        consumerType: 'STAFF',
        consumerId: 'STF-201',
        consumerName: 'Mr. Rajesh Verma',
        academicYear,
        lines: [{ itemId: items[0].id, quantity: 2 }],
      });
    } catch { /* skip if insufficient stock */ }
  }

  if (outwardCount < 3 && items[1]?.stockQty > 2) {
    try {
      await checkoutStockOutward(institutionId, {
        storeId: store.id,
        consumerType: 'STUDENT',
        consumerId: 'STU-1001',
        consumerName: 'Rahul Sharma',
        paymentMethod: 'WALLET',
        academicYear,
        lines: [{ itemId: items[1].id, quantity: 1 }],
      });
    } catch { /* skip */ }
  }

  await logActivity(institutionId, 'SEED_OUTWARD', 'Stock Outward module seeded');
  return getStockOutwardManagement(institutionId, academicYear);
}
