import { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';

const ACADEMIC_YEARS = ['2023-24', '2024-25', '2025-26', '2026-27'];
const SLOW_MOVING_DAYS = 180;

const FINANCIAL_REPORT_ROLES = new Set([
  'Super Admin',
  'Management',
  'Principal',
  'Finance Head',
  'Accountant',
  'Admin',
]);

const FINANCIAL_TEMPLATES = new Set(['inventory_valuation', 'vendor_bills']);

const REPORT_CATALOG = {
  operational: {
    label: 'Operational Registers',
    reports: [
      {
        id: 'stock_ledger',
        name: 'Stock Ledger',
        description: 'Chronological transaction history per item — GRN, outward, transfer, adjustments',
        restricted: false,
      },
      {
        id: 'department_consumption',
        name: 'Department Consumption',
        description: 'Resource utilization by department against allocated budget',
        restricted: false,
      },
      {
        id: 'dead_slow_moving',
        name: 'Dead / Slow Moving Stock',
        description: 'Items with zero outward movement in the last 180 days',
        restricted: false,
      },
      {
        id: 'batch_expiry',
        name: 'Batch Expiry Report',
        description: 'Medical & lab chemical batches — expired and nearing expiry',
        restricted: false,
      },
    ],
  },
  financial: {
    label: 'Financial & Compliance',
    reports: [
      {
        id: 'inventory_valuation',
        name: 'Inventory Valuation',
        description: 'Total stock value segregated by store and category',
        restricted: true,
      },
      {
        id: 'vendor_bills',
        name: 'Vendor Bills Summary',
        description: 'AP invoices, 3-way match status and payment pipeline',
        restricted: true,
      },
    ],
  },
};

export type InvReportFilters = {
  academicYear?: string;
  dateFrom?: string;
  dateTo?: string;
  storeId?: string;
  categoryId?: string;
  itemId?: string;
  department?: string;
  expiryWithinDays?: number;
};

function formatDate(d: Date) {
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatInr(amount: number) {
  return `₹ ${Math.round(amount).toLocaleString('en-IN')}`;
}

function todayDate() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function parseDateRange(filters: InvReportFilters) {
  const dateTo = filters.dateTo ? new Date(filters.dateTo) : todayDate();
  const dateFrom = filters.dateFrom
    ? new Date(filters.dateFrom)
    : new Date(dateTo.getFullYear(), dateTo.getMonth() - 2, 1);
  dateTo.setHours(23, 59, 59, 999);
  return { dateFrom, dateTo };
}

export function canAccessFinancialReports(userRole = 'Inventory Manager') {
  return FINANCIAL_REPORT_ROLES.has(userRole);
}

async function logActivity(
  institutionId: string,
  action: string,
  details: string,
  snapshot: Record<string, unknown> = {},
  performedBy = 'Reports System',
) {
  await prisma.invActivityLog.create({
    data: { institutionId, action, details, filterSnapshot: snapshot as Prisma.InputJsonValue, performedBy },
  });
}

function assertReportAccess(templateId: string, userRole: string) {
  if (FINANCIAL_TEMPLATES.has(templateId) && !canAccessFinancialReports(userRole)) {
    throw new Error('Access denied — financial reports are restricted to Accountant / Principal roles');
  }
}

function maskValue(show: boolean, value: number) {
  return show ? formatInr(value) : '***';
}

async function buildStockLedger(
  institutionId: string,
  academicYear: string,
  filters: InvReportFilters,
) {
  const { dateFrom, dateTo } = parseDateRange(filters);
  const entries = await prisma.invLedger.findMany({
    where: {
      institutionId,
      academicYear,
      transactionDate: { gte: dateFrom, lte: dateTo },
      ...(filters.storeId && filters.storeId !== 'ALL' ? { storeId: filters.storeId } : {}),
      ...(filters.itemId ? { itemId: filters.itemId } : {}),
      ...(filters.categoryId
        ? { item: { categoryId: filters.categoryId } }
        : {}),
    },
    include: { item: { include: { category: true } } },
    orderBy: [{ transactionDate: 'asc' }, { createdAt: 'asc' }],
    take: 2000,
  });

  const rows = entries.map((e) => ({
    date: formatDate(e.transactionDate),
    itemName: e.item.itemName,
    sku: e.item.itemCode,
    category: e.item.category.categoryName,
    transactionType: e.transactionType.replace(/_/g, ' '),
    referenceNo: e.referenceNo,
    qtyIn: e.quantityIn,
    qtyOut: e.quantityOut,
    unitCost: e.unitCost,
    balanceQty: e.balanceQty,
    performedBy: e.performedBy,
  }));

  return {
    columns: ['Date', 'Item', 'SKU', 'Category', 'Type', 'Reference', 'Qty In', 'Qty Out', 'Unit Cost', 'Balance', 'By'],
    rows,
    summary: {
      totalTransactions: rows.length,
      totalIn: rows.reduce((s, r) => s + r.qtyIn, 0),
      totalOut: rows.reduce((s, r) => s + r.qtyOut, 0),
      period: `${formatDate(dateFrom)} — ${formatDate(dateTo)}`,
    },
  };
}

async function buildInventoryValuation(
  institutionId: string,
  academicYear: string,
  filters: InvReportFilters,
  showFinancials: boolean,
) {
  const items = await prisma.invItem.findMany({
    where: {
      institutionId,
      academicYear,
      status: 'ACTIVE',
      ...(filters.storeId && filters.storeId !== 'ALL' ? { storeId: filters.storeId } : {}),
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    },
    include: { category: true, store: true },
  });

  const byStore = new Map<string, { name: string; itemCount: number; totalQty: number; value: number }>();
  const byCategory = new Map<string, { name: string; color: string; itemCount: number; totalQty: number; value: number }>();

  for (const item of items) {
    const value = item.stockQty * item.weightedAvgCost;
    const storeEntry = byStore.get(item.storeId) ?? {
      name: item.store.storeName,
      itemCount: 0,
      totalQty: 0,
      value: 0,
    };
    storeEntry.itemCount += 1;
    storeEntry.totalQty += item.stockQty;
    storeEntry.value += value;
    byStore.set(item.storeId, storeEntry);

    const catEntry = byCategory.get(item.categoryId) ?? {
      name: item.category.categoryName,
      color: item.category.color,
      itemCount: 0,
      totalQty: 0,
      value: 0,
    };
    catEntry.itemCount += 1;
    catEntry.totalQty += item.stockQty;
    catEntry.value += value;
    byCategory.set(item.categoryId, catEntry);
  }

  const totalValue = items.reduce((s, i) => s + i.stockQty * i.weightedAvgCost, 0);

  const storeRows = [...byStore.values()]
    .sort((a, b) => b.value - a.value)
    .map((s) => ({
      store: s.name,
      items: s.itemCount,
      totalQty: Math.round(s.totalQty),
      value: maskValue(showFinancials, s.value),
      valueRaw: s.value,
    }));

  const categoryRows = [...byCategory.values()]
    .sort((a, b) => b.value - a.value)
    .map((c) => ({
      category: c.name,
      items: c.itemCount,
      totalQty: Math.round(c.totalQty),
      value: maskValue(showFinancials, c.value),
      valueRaw: c.value,
    }));

  const detailRows = items
    .filter((i) => i.stockQty > 0)
    .sort((a, b) => (b.stockQty * b.weightedAvgCost) - (a.stockQty * a.weightedAvgCost))
    .slice(0, 100)
    .map((i) => ({
      itemName: i.itemName,
      store: i.store.storeName,
      category: i.category.categoryName,
      stockQty: i.stockQty,
      unitCost: showFinancials ? i.weightedAvgCost : 0,
      value: maskValue(showFinancials, i.stockQty * i.weightedAvgCost),
    }));

  return {
    columns: ['Store / Category', 'Items', 'Total Qty', 'Value'],
    rows: categoryRows.map((c) => ({
      segment: c.category,
      items: c.items,
      totalQty: c.totalQty,
      value: c.value,
    })),
    storeBreakdown: storeRows,
    categoryBreakdown: categoryRows,
    detailRows,
    summary: {
      totalItems: items.length,
      totalValue: maskValue(showFinancials, totalValue),
      totalValueRaw: totalValue,
      topCategory: categoryRows[0]?.category ?? '—',
      topCategoryValue: categoryRows[0] ? maskValue(showFinancials, categoryRows[0].valueRaw) : '—',
      example: categoryRows.find((c) => c.category.toLowerCase().includes('lab'))
        ? `${categoryRows.find((c) => c.category.toLowerCase().includes('lab'))!.category} ${categoryRows.find((c) => c.category.toLowerCase().includes('lab'))!.value}`
        : categoryRows[0]?.value ?? '—',
    },
  };
}

async function buildDepartmentConsumption(
  institutionId: string,
  academicYear: string,
  filters: InvReportFilters,
) {
  const { dateFrom, dateTo } = parseDateRange(filters);

  const outwards = await prisma.invStockOutward.findMany({
    where: {
      institutionId,
      academicYear,
      status: 'ISSUED',
      outwardDate: { gte: dateFrom, lte: dateTo },
      ...(filters.storeId && filters.storeId !== 'ALL' ? { storeId: filters.storeId } : {}),
    },
    include: { indent: true, lines: true },
  });

  const budgets = await prisma.expenseBudget.findMany({
    where: { institutionId, academicYear },
  });
  const budgetByDept = new Map(
    budgets.map((b) => [b.department.toLowerCase(), b.allocatedAmount]),
  );

  const deptMap = new Map<string, { department: string; issues: number; totalQty: number; consumedValue: number; budget: number }>();

  for (const o of outwards) {
    const department = o.indent?.departmentName
      || (o.consumerType === 'DEPARTMENT' ? o.consumerName : '')
      || o.consumerName
      || o.consumerType
      || 'General';

    if (filters.department && !department.toLowerCase().includes(filters.department.toLowerCase())) {
      continue;
    }

    const entry = deptMap.get(department) ?? {
      department,
      issues: 0,
      totalQty: 0,
      consumedValue: 0,
      budget: budgetByDept.get(department.toLowerCase()) ?? 0,
    };
    entry.issues += 1;
    entry.totalQty += o.lines.reduce((s, l) => s + l.quantity, 0);
    entry.consumedValue += o.totalValue;
    deptMap.set(department, entry);
  }

  const rows = [...deptMap.values()]
    .sort((a, b) => b.consumedValue - a.consumedValue)
    .map((d) => {
      const utilizationPct = d.budget > 0 ? Math.round((d.consumedValue / d.budget) * 100) : null;
      return {
        department: d.department,
        issues: d.issues,
        totalQty: Math.round(d.totalQty),
        consumedValue: formatInr(d.consumedValue),
        consumedValueRaw: d.consumedValue,
        budget: d.budget > 0 ? formatInr(d.budget) : 'Not allocated',
        budgetRaw: d.budget,
        utilizationPct: utilizationPct != null ? `${utilizationPct}%` : '—',
        status: utilizationPct != null && utilizationPct >= 90 ? 'OVER_BUDGET' : utilizationPct != null && utilizationPct >= 75 ? 'WARNING' : 'OK',
      };
    });

  const topDept = rows[0];

  return {
    columns: ['Department', 'Issues', 'Qty Issued', 'Consumed Value', 'Budget', 'Utilization'],
    rows,
    summary: {
      departments: rows.length,
      totalConsumed: formatInr(rows.reduce((s, r) => s + r.consumedValueRaw, 0)),
      topConsumer: topDept?.department ?? '—',
      topConsumerValue: topDept?.consumedValue ?? '—',
      period: `${formatDate(dateFrom)} — ${formatDate(dateTo)}`,
    },
  };
}

async function buildDeadSlowMoving(
  institutionId: string,
  academicYear: string,
  filters: InvReportFilters,
) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - SLOW_MOVING_DAYS);

  const items = await prisma.invItem.findMany({
    where: {
      institutionId,
      academicYear,
      status: 'ACTIVE',
      stockQty: { gt: 0 },
      ...(filters.storeId && filters.storeId !== 'ALL' ? { storeId: filters.storeId } : {}),
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    },
    include: { category: true, store: true },
  });

  const recentOutward = await prisma.invLedger.groupBy({
    by: ['itemId'],
    where: {
      institutionId,
      academicYear,
      quantityOut: { gt: 0 },
      transactionDate: { gte: cutoff },
    },
    _max: { transactionDate: true },
  });
  const activeItemIds = new Set(recentOutward.map((r) => r.itemId));

  const lastMovement = await prisma.invLedger.groupBy({
    by: ['itemId'],
    where: { institutionId, academicYear, quantityOut: { gt: 0 } },
    _max: { transactionDate: true },
  });
  const lastMoveMap = new Map(lastMovement.map((r) => [r.itemId, r._max.transactionDate]));

  const rows = items
    .filter((i) => !activeItemIds.has(i.id))
    .map((i) => {
      const lastOut = lastMoveMap.get(i.id);
      const daysSince = lastOut
        ? Math.floor((Date.now() - lastOut.getTime()) / 86400000)
        : 999;
      return {
        itemName: i.itemName,
        sku: i.itemCode,
        category: i.category.categoryName,
        store: i.store.storeName,
        stockQty: i.stockQty,
        unit: i.unit,
        stockValue: formatInr(i.stockQty * i.weightedAvgCost),
        lastOutward: lastOut ? formatDate(lastOut) : 'Never',
        daysSinceMovement: daysSince >= 999 ? '180+' : daysSince,
        classification: daysSince >= 365 || !lastOut ? 'DEAD' : 'SLOW',
      };
    })
    .sort((a, b) => {
      const da = typeof a.daysSinceMovement === 'number' ? a.daysSinceMovement : 999;
      const db = typeof b.daysSinceMovement === 'number' ? b.daysSinceMovement : 999;
      return db - da;
    });

  return {
    columns: ['Item', 'SKU', 'Store', 'Stock', 'Last Outward', 'Days Idle', 'Classification'],
    rows,
    summary: {
      deadCount: rows.filter((r) => r.classification === 'DEAD').length,
      slowCount: rows.filter((r) => r.classification === 'SLOW').length,
      totalIdleValue: formatInr(
        items.filter((i) => !activeItemIds.has(i.id)).reduce((s, i) => s + i.stockQty * i.weightedAvgCost, 0),
      ),
      thresholdDays: SLOW_MOVING_DAYS,
    },
  };
}

async function buildBatchExpiry(
  institutionId: string,
  academicYear: string,
  filters: InvReportFilters,
) {
  const withinDays = filters.expiryWithinDays ?? 90;
  const today = todayDate();
  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + withinDays);

  const batches = await prisma.invBatch.findMany({
    where: {
      institutionId,
      academicYear,
      remainingQty: { gt: 0 },
      expiryDate: { not: null },
      ...(filters.itemId ? { itemId: filters.itemId } : {}),
    },
    include: { item: { include: { category: true, store: true } } },
    orderBy: { expiryDate: 'asc' },
    take: 500,
  });

  const rows = batches.map((b) => {
    const expiry = b.expiryDate!;
    const daysLeft = Math.ceil((expiry.getTime() - today.getTime()) / 86400000);
    let status = 'OK';
    if (daysLeft < 0) status = 'EXPIRED';
    else if (daysLeft <= 30) status = 'CRITICAL';
    else if (daysLeft <= withinDays) status = 'WARNING';

    return {
      itemName: b.item.itemName,
      sku: b.item.itemCode,
      category: b.item.category.categoryName,
      store: b.item.store.storeName,
      batchNo: b.batchNo,
      remainingQty: b.remainingQty,
      unit: b.item.unit,
      expiryDate: formatDate(expiry),
      daysLeft,
      status,
      complianceNote: status === 'EXPIRED' ? 'Quarantine & dispose per policy' : status === 'CRITICAL' ? 'Use or transfer immediately' : '',
    };
  }).filter((r) => r.status !== 'OK');

  return {
    columns: ['Item', 'Batch', 'Store', 'Remaining', 'Expiry', 'Days Left', 'Status'],
    rows,
    summary: {
      expired: rows.filter((r) => r.status === 'EXPIRED').length,
      critical: rows.filter((r) => r.status === 'CRITICAL').length,
      warning: rows.filter((r) => r.status === 'WARNING').length,
      withinDays,
    },
  };
}

async function buildVendorBillsSummary(
  institutionId: string,
  academicYear: string,
  filters: InvReportFilters,
) {
  const { dateFrom, dateTo } = parseDateRange(filters);

  const bills = await prisma.invVendorBill.findMany({
    where: {
      institutionId,
      academicYear,
      invoiceDate: { gte: dateFrom, lte: dateTo },
    },
    include: { supplier: true, grn: true, purchaseOrder: true },
    orderBy: { invoiceDate: 'desc' },
    take: 500,
  });

  const rows = bills.map((b) => ({
    billRef: b.billRef,
    invoiceNumber: b.invoiceNumber,
    supplier: b.supplier.supplierName,
    grn: b.grn.grnNumber,
    po: b.purchaseOrder?.poNumber ?? '—',
    invoiceDate: formatDate(b.invoiceDate),
    totalAmount: formatInr(b.totalAmount),
    totalAmountRaw: b.totalAmount,
    status: b.status,
    matchStatus: b.matchStatus,
    hasVariance: b.hasRateVariance || b.hasQtyVariance,
    journalEntry: b.journalEntryRef || '—',
  }));

  const byStatus = new Map<string, number>();
  for (const b of bills) {
    byStatus.set(b.status, (byStatus.get(b.status) ?? 0) + b.totalAmount);
  }

  return {
    columns: ['Bill Ref', 'Invoice', 'Supplier', 'GRN', 'PO', 'Date', 'Amount', 'Status', 'Match'],
    rows,
    summary: {
      totalBills: rows.length,
      totalPayable: formatInr(rows.reduce((s, r) => s + r.totalAmountRaw, 0)),
      varianceCount: rows.filter((r) => r.hasVariance).length,
      pendingFinance: rows.filter((r) => r.status === 'APPROVED' && !r.journalEntry).length,
      byStatus: Object.fromEntries([...byStatus.entries()].map(([k, v]) => [k, formatInr(v)])),
      period: `${formatDate(dateFrom)} — ${formatDate(dateTo)}`,
    },
  };
}

export async function generateInventoryReport(
  institutionId: string,
  templateId: string,
  filters: InvReportFilters = {},
  userRole = 'Inventory Manager',
) {
  assertReportAccess(templateId, userRole);
  const academicYear = filters.academicYear ?? '2025-26';
  const showFinancials = canAccessFinancialReports(userRole);

  let reportData: {
    columns: string[];
    rows: Record<string, unknown>[];
    summary: Record<string, unknown>;
    storeBreakdown?: unknown[];
    categoryBreakdown?: unknown[];
    detailRows?: unknown[];
  };

  const allReports = [
    ...REPORT_CATALOG.operational.reports,
    ...REPORT_CATALOG.financial.reports,
  ];
  const meta = allReports.find((r) => r.id === templateId);
  if (!meta) throw new Error('Unknown report template');

  switch (templateId) {
    case 'stock_ledger':
      reportData = await buildStockLedger(institutionId, academicYear, filters);
      break;
    case 'inventory_valuation':
      reportData = await buildInventoryValuation(institutionId, academicYear, filters, showFinancials);
      break;
    case 'department_consumption':
      reportData = await buildDepartmentConsumption(institutionId, academicYear, filters);
      break;
    case 'dead_slow_moving':
      reportData = await buildDeadSlowMoving(institutionId, academicYear, filters);
      break;
    case 'batch_expiry':
      reportData = await buildBatchExpiry(institutionId, academicYear, filters);
      break;
    case 'vendor_bills':
      reportData = await buildVendorBillsSummary(institutionId, academicYear, filters);
      break;
    default:
      throw new Error('Report not implemented');
  }

  await logActivity(
    institutionId,
    `REPORT_${templateId.toUpperCase()}`,
    `Generated "${meta.name}" — ${reportData.rows.length} rows`,
    { templateId, filters, rowCount: reportData.rows.length, userRole },
    userRole,
  );

  return {
    templateId,
    name: meta.name,
    description: meta.description,
    restricted: meta.restricted,
    generatedAt: new Date().toISOString(),
    rowCount: reportData.rows.length,
    columns: reportData.columns,
    rows: reportData.rows,
    summary: reportData.summary,
    storeBreakdown: reportData.storeBreakdown,
    categoryBreakdown: reportData.categoryBreakdown,
    detailRows: reportData.detailRows,
    filters,
    academicYear,
  };
}

export async function getInventoryReportsAnalytics(
  institutionId: string,
  academicYear = '2025-26',
  userRole = 'Inventory Manager',
) {
  const showFinancials = canAccessFinancialReports(userRole);

  const [stores, categories, items, recentLogs] = await Promise.all([
    prisma.invStore.findMany({
      where: { institutionId, academicYear, status: 'ACTIVE' },
      orderBy: { storeName: 'asc' },
      select: { id: true, storeCode: true, storeName: true },
    }),
    prisma.invCategory.findMany({
      where: { institutionId, academicYear, status: 'ACTIVE' },
      orderBy: { categoryName: 'asc' },
      select: { id: true, categoryCode: true, categoryName: true },
    }),
    prisma.invItem.findMany({
      where: { institutionId, academicYear, status: 'ACTIVE' },
      orderBy: { itemName: 'asc' },
      take: 200,
      select: { id: true, itemCode: true, itemName: true },
    }),
    prisma.invActivityLog.findMany({
      where: { institutionId, action: { startsWith: 'REPORT_' } },
      orderBy: { createdAt: 'desc' },
      take: 12,
    }),
  ]);

  const dateTo = todayDate();
  const dateFrom = new Date(dateTo.getFullYear(), dateTo.getMonth() - 2, 1);

  const catalog = {
    operational: REPORT_CATALOG.operational,
    financial: {
      ...REPORT_CATALOG.financial,
      reports: REPORT_CATALOG.financial.reports.map((r) => ({
        ...r,
        locked: !showFinancials,
      })),
    },
  };

  await logActivity(institutionId, 'VIEW_REPORTS', 'Inventory Reports & Analytics accessed', { userRole });

  return {
    academicYear,
    academicYears: ACADEMIC_YEARS,
    userRole,
    canViewFinancials: showFinancials,
    stores,
    categories,
    items,
    defaultFilters: {
      dateFrom: dateFrom.toISOString().slice(0, 10),
      dateTo: dateTo.toISOString().slice(0, 10),
      expiryWithinDays: 90,
    },
    reportCatalog: catalog,
    securityMatrix: [
      { report: 'Stock Ledger', roles: 'All inventory roles' },
      { report: 'Department Consumption', roles: 'Inventory Manager, Store Keeper, Principal' },
      { report: 'Dead / Slow Moving', roles: 'Inventory Manager, Purchase Manager' },
      { report: 'Batch Expiry', roles: 'Lab Store Keeper, Inventory Manager' },
      { report: 'Inventory Valuation', roles: 'Accountant, Principal, Finance Head only', restricted: true },
      { report: 'Vendor Bills', roles: 'Accountant, Principal, Finance Head only', restricted: true },
    ],
    financialRoles: [...FINANCIAL_REPORT_ROLES],
    recentRuns: recentLogs.map((l) => ({
      id: l.id,
      action: l.action.replace('REPORT_', '').replace(/_/g, ' '),
      details: l.details,
      performedBy: l.performedBy,
      at: l.createdAt.toISOString(),
      atLabel: formatDate(l.createdAt),
    })),
    exportFormats: ['PDF', 'Excel', 'CSV'],
    complianceNotes: [
      'Stock Ledger supports NAAC / audit trail requirements',
      'Batch Expiry report flags items within 30 days as CRITICAL',
      'Financial valuation uses Weighted Average Cost (WAC) method',
    ],
  };
}

export async function exportInventoryReport(
  institutionId: string,
  templateId: string,
  filters: InvReportFilters = {},
  format: 'PDF' | 'Excel' | 'CSV' = 'CSV',
  userRole = 'Inventory Manager',
) {
  const preview = await generateInventoryReport(institutionId, templateId, filters, userRole);
  const fileName = `inv_${templateId}_${Date.now()}.${format.toLowerCase()}`;
  await logActivity(
    institutionId,
    'REPORT_EXPORT',
    `Exported ${preview.name} as ${format}`,
    { templateId, format, rowCount: preview.rowCount },
    userRole,
  );
  return {
    success: true,
    format,
    fileName,
    message: `${preview.name} exported (${preview.rowCount} rows)`,
    preview,
  };
}

export async function seedInventoryReports(institutionId: string) {
  const { seedInventoryDashboard } = await import('./inventoryDashboard.js');
  await seedInventoryDashboard(institutionId);

  const academicYear = '2025-26';
  const labItems = await prisma.invItem.findMany({
    where: {
      institutionId,
      academicYear,
      OR: [
        { itemName: { contains: 'Lab', mode: 'insensitive' } },
        { itemName: { contains: 'Chemical', mode: 'insensitive' } },
        { itemName: { contains: 'Cleaner', mode: 'insensitive' } },
      ],
    },
    take: 8,
  });

  for (let i = 0; i < labItems.length; i += 1) {
    const item = labItems[i];
    const existing = await prisma.invBatch.findFirst({
      where: { institutionId, itemId: item.id, batchNo: `BATCH-EXP-${i + 1}` },
    });
    if (existing) continue;

    const expiry = new Date();
    expiry.setDate(expiry.getDate() + (i < 2 ? -15 : i < 4 ? 20 : 120));

    await prisma.invBatch.create({
      data: {
        institutionId,
        itemId: item.id,
        batchNo: `BATCH-EXP-${i + 1}`,
        expiryDate: expiry,
        quantity: 50,
        remainingQty: 20 + i * 5,
        academicYear,
      },
    });
  }

  const outwards = await prisma.invStockOutward.findMany({
    where: { institutionId, academicYear },
    take: 1,
  });
  if (!outwards.length) {
    const store = await prisma.invStore.findFirst({ where: { institutionId, status: 'ACTIVE' } });
    const items = await prisma.invItem.findMany({ where: { institutionId, storeId: store?.id }, take: 3 });
    if (store && items.length) {
      await prisma.invOutwardIndent.create({
        data: {
          institutionId,
          storeId: store.id,
          indentNumber: 'OUT-IND-DEPT-001',
          departmentName: 'Science Lab',
          requestedBy: 'HOD Science',
          status: 'APPROVED',
          academicYear,
          lines: {
            create: items.map((it) => ({
              itemId: it.id,
              requestedQty: 10,
              issuedQty: 10,
              unitCost: it.weightedAvgCost,
            })),
          },
        },
      });
    }
  }

  const templates = ['stock_ledger', 'inventory_valuation', 'department_consumption', 'dead_slow_moving', 'batch_expiry'];
  for (const t of templates) {
    try {
      await generateInventoryReport(institutionId, t, { academicYear }, 'Principal');
    } catch {
      // partial seed ok
    }
  }

  return getInventoryReportsAnalytics(institutionId, academicYear, 'Principal');
}
