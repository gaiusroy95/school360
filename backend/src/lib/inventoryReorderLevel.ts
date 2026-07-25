import { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';

const ACADEMIC_YEARS = ['2023-24', '2024-25', '2025-26', '2026-27'];
const PURCHASE_MANAGER_EMAIL = 'purchase.manager@school.edu';

export function isItemLowStock(item: { stockQty: number; reorderLevel: number }) {
  return item.stockQty <= item.reorderLevel;
}

export function suggestedReorderQty(item: { stockQty: number; maxLevel: number; reorderLevel: number }) {
  const target = item.maxLevel > item.reorderLevel ? item.maxLevel : item.reorderLevel * 2;
  return Math.max(0, Math.round(target - item.stockQty));
}

async function logActivity(
  institutionId: string,
  action: string,
  details: string,
  snapshot: Record<string, unknown> = {},
  performedBy = 'Inventory Manager',
) {
  await prisma.invActivityLog.create({
    data: { institutionId, action, details, filterSnapshot: snapshot as Prisma.InputJsonValue, performedBy },
  });
}

async function nextIndentNumber(institutionId: string, prefix = 'PIN') {
  const count = await prisma.invPurchaseIndent.count({ where: { institutionId } });
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${String(count + 1).padStart(4, '0')}`;
}

function mapLowStockRow(item: {
  id: string;
  itemCode: string;
  itemName: string;
  unit: string;
  stockQty: number;
  inTransitQty: number;
  reorderLevel: number;
  minLevel: number;
  maxLevel: number;
  weightedAvgCost: number;
  itemType: string;
  defaultSupplierId: string | null;
  category: { categoryName: string };
  store: { id: string; storeName: string };
}) {
  const availableQty = item.stockQty;
  const lowStock = isItemLowStock(item);
  const suggestedQty = suggestedReorderQty(item);
  const status = item.stockQty <= 0 ? 'OUT_OF_STOCK' : lowStock ? 'LOW_STOCK' : 'OK';
  return {
    id: item.id,
    sku: item.itemCode,
    itemName: item.itemName,
    category: item.category.categoryName,
    storeId: item.store.id,
    storeName: item.store.storeName,
    itemType: item.itemType,
    unit: item.unit,
    currentStock: availableQty,
    availableQty,
    inTransitQty: item.inTransitQty,
    minLevel: item.minLevel,
    reorderLevel: item.reorderLevel,
    maxLevel: item.maxLevel,
    suggestedReorderQty: suggestedQty,
    unitCost: item.weightedAvgCost,
    estimatedValue: Math.round(suggestedQty * item.weightedAvgCost),
    defaultSupplierId: item.defaultSupplierId,
    status,
    lowStock,
  };
}

export async function countLowStockItems(
  institutionId: string,
  academicYear: string,
  storeId?: string,
) {
  const items = await prisma.invItem.findMany({
    where: {
      institutionId,
      academicYear,
      status: 'ACTIVE',
      ...(storeId && storeId !== 'ALL' ? { storeId } : {}),
    },
    select: { stockQty: true, reorderLevel: true },
  });
  return items.filter((i) => isItemLowStock(i)).length;
}

export async function syncLowStockAlerts(
  institutionId: string,
  academicYear: string,
  storeId = '',
) {
  const lowStockCount = await countLowStockItems(institutionId, academicYear, storeId || undefined);
  const message = `${lowStockCount} item${lowStockCount === 1 ? '' : 's'} are below reorder level.`;

  const existing = await prisma.invAlert.findFirst({
    where: {
      institutionId,
      academicYear,
      alertType: 'LOW_STOCK',
      status: 'OPEN',
      storeId: storeId || '',
    },
    orderBy: { createdAt: 'desc' },
  });

  if (lowStockCount === 0) {
    if (existing) {
      await prisma.invAlert.update({
        where: { id: existing.id },
        data: { status: 'RESOLVED', message: 'All items above reorder level.' },
      });
    }
    return { lowStockCount, message: 'No low stock alerts', emailSent: false };
  }

  const severity = lowStockCount >= 50 ? 'HIGH' : lowStockCount >= 10 ? 'MEDIUM' : 'LOW';
  let emailSent = false;

  if (existing) {
    await prisma.invAlert.update({
      where: { id: existing.id },
      data: { message, severity },
    });
  } else {
    await prisma.invAlert.create({
      data: {
        institutionId,
        storeId: storeId || '',
        alertType: 'LOW_STOCK',
        severity,
        message,
        status: 'OPEN',
        academicYear,
      },
    });
  }

  const recentEmail = await prisma.invActivityLog.findFirst({
    where: {
      institutionId,
      action: 'LOW_STOCK_EMAIL',
      createdAt: { gte: new Date(Date.now() - 24 * 3600000) },
    },
  });

  if (!recentEmail) {
    await logActivity(
      institutionId,
      'LOW_STOCK_EMAIL',
      `Email to Purchase Manager (${PURCHASE_MANAGER_EMAIL}): ${message}`,
      { lowStockCount, recipient: PURCHASE_MANAGER_EMAIL, academicYear },
      'System',
    );
    emailSent = true;
  }

  return { lowStockCount, message, emailSent, recipient: PURCHASE_MANAGER_EMAIL };
}

async function findOpenAutoDraftIndent(institutionId: string, academicYear: string) {
  return prisma.invPurchaseIndent.findFirst({
    where: {
      institutionId,
      academicYear,
      status: 'DRAFT',
      department: 'Auto Replenishment',
    },
    include: { lines: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function processReorderAutomation(
  institutionId: string,
  academicYear: string,
) {
  const lowItems = await prisma.invItem.findMany({
    where: {
      institutionId,
      academicYear,
      status: 'ACTIVE',
      itemType: 'CONSUMABLE',
    },
    include: { category: true, store: true },
  });

  const needsReorder = lowItems.filter((i) => isItemLowStock(i));
  if (!needsReorder.length) return { created: 0, indentId: null as string | null };

  let indent = await findOpenAutoDraftIndent(institutionId, academicYear);
  const existingItemIds = new Set(indent?.lines.map((l) => l.itemId) ?? []);

  const newLines = needsReorder
    .filter((i) => !existingItemIds.has(i.id))
    .map((i) => ({
      itemId: i.id,
      requestedQty: suggestedReorderQty(i),
      unitEstimate: i.weightedAvgCost,
      notes: `Auto-reorder: stock ${i.stockQty} ≤ reorder ${i.reorderLevel}`,
    }))
    .filter((l) => l.requestedQty > 0);

  if (!newLines.length) {
    return { created: 0, indentId: indent?.id ?? null };
  }

  if (!indent) {
    const indentNumber = await nextIndentNumber(institutionId, 'PIN-AUTO');
    indent = await prisma.invPurchaseIndent.create({
      data: {
        institutionId,
        indentNumber,
        department: 'Auto Replenishment',
        requestedBy: 'System (Reorder Monitor)',
        status: 'DRAFT',
        notes: 'Auto-generated draft purchase request — items at or below reorder level',
        academicYear,
        lines: { create: newLines },
      },
      include: { lines: true },
    });
    await logActivity(
      institutionId,
      'REORDER_INDENT_AUTO',
      `Draft indent ${indent.indentNumber} created with ${newLines.length} line(s)`,
      { indentId: indent.id, lineCount: newLines.length },
    );
    return { created: newLines.length, indentId: indent.id, indentNumber: indent.indentNumber };
  }

  await prisma.invPurchaseIndentLine.createMany({
    data: newLines.map((l) => ({ ...l, indentId: indent!.id })),
  });

  await logActivity(
    institutionId,
    'REORDER_INDENT_AUTO',
    `Added ${newLines.length} line(s) to draft indent ${indent.indentNumber}`,
    { indentId: indent.id, lineCount: newLines.length },
  );

  return { created: newLines.length, indentId: indent.id, indentNumber: indent.indentNumber };
}

export async function getReorderLevelManagement(
  institutionId: string,
  academicYear = '2025-26',
  filters: { storeId?: string; categoryId?: string; q?: string; itemType?: string } = {},
) {
  await processReorderAutomation(institutionId, academicYear);
  const alertSync = await syncLowStockAlerts(institutionId, academicYear, filters.storeId ?? '');

  const items = await prisma.invItem.findMany({
    where: {
      institutionId,
      academicYear,
      status: 'ACTIVE',
      ...(filters.storeId && filters.storeId !== 'ALL' ? { storeId: filters.storeId } : {}),
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
      ...(filters.itemType && filters.itemType !== 'ALL' ? { itemType: filters.itemType } : {}),
      ...(filters.q
        ? {
            OR: [
              { itemName: { contains: filters.q, mode: 'insensitive' as const } },
              { itemCode: { contains: filters.q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    },
    include: { category: true, store: true },
    orderBy: [{ stockQty: 'asc' }, { itemName: 'asc' }],
  });

  const lowStockItems = items.filter((i) => isItemLowStock(i)).map(mapLowStockRow);
  const topLowStock = [...lowStockItems]
    .sort((a, b) => a.currentStock - b.currentStock)
    .slice(0, 5);

  const draftIndents = await prisma.invPurchaseIndent.findMany({
    where: { institutionId, academicYear, status: 'DRAFT' },
    include: { lines: { include: { item: true } } },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  const stores = await prisma.invStore.findMany({
    where: { institutionId, academicYear, status: 'ACTIVE' },
    orderBy: { storeName: 'asc' },
    select: { id: true, storeCode: true, storeName: true },
  });

  const categories = await prisma.invCategory.findMany({
    where: { institutionId, academicYear, status: 'ACTIVE' },
    orderBy: { categoryName: 'asc' },
    select: { id: true, categoryCode: true, categoryName: true },
  });

  const consumableLow = lowStockItems.filter((i) => i.itemType === 'CONSUMABLE').length;

  return {
    academicYear,
    academicYears: ACADEMIC_YEARS,
    stores,
    categories,
    lowStockCount: lowStockItems.length,
    consumableLowCount: consumableLow,
    dashboardAlert: alertSync.message,
    emailNotification: {
      sent: alertSync.emailSent,
      recipient: PURCHASE_MANAGER_EMAIL,
      subject: `Low Stock Alert — ${lowStockItems.length} items need reorder`,
    },
    lowStockItems,
    topLowStock,
    draftIndents: draftIndents.map((ind) => ({
      id: ind.id,
      indentNumber: ind.indentNumber,
      department: ind.department,
      status: ind.status,
      lineCount: ind.lines.length,
      totalQty: ind.lines.reduce((s, l) => s + l.requestedQty, 0),
      requestedBy: ind.requestedBy,
      createdAt: ind.createdAt.toISOString(),
      lines: ind.lines.map((l) => ({
        id: l.id,
        itemName: l.item.itemName,
        sku: l.item.itemCode,
        requestedQty: l.requestedQty,
        unitEstimate: l.unitEstimate,
      })),
    })),
    automationRules: [
      'When Available Qty ≤ Reorder Level, system auto-generates a Draft Purchase Indent',
      'Suggested Reorder Qty = Max Level − Current Stock (brings stock up to max capacity)',
      'Dashboard "Low Stock Items" KPI and Top 5 list refresh on every stock movement',
      'Purchase Manager receives email alert when low stock count changes (max once per 24h)',
    ],
    itemTypes: ['ALL', 'CONSUMABLE', 'ASSET'],
  };
}

export async function createReorderPurchaseIndent(
  institutionId: string,
  body: {
    itemIds: string[];
    academicYear?: string;
    requestedBy?: string;
    department?: string;
    notes?: string;
  },
) {
  if (!body.itemIds?.length) throw new Error('Select at least one item to reorder');

  const academicYear = body.academicYear ?? '2025-26';
  const items = await prisma.invItem.findMany({
    where: { id: { in: body.itemIds }, institutionId, status: 'ACTIVE' },
    include: { store: true },
  });
  if (items.length !== body.itemIds.length) throw new Error('One or more items not found');

  const lines = items.map((i) => ({
    itemId: i.id,
    requestedQty: suggestedReorderQty(i),
    unitEstimate: i.weightedAvgCost,
    notes: `Manual reorder — current stock ${i.stockQty}, reorder at ${i.reorderLevel}`,
  })).filter((l) => l.requestedQty > 0);

  if (!lines.length) throw new Error('Selected items do not need reorder');

  const indentNumber = await nextIndentNumber(institutionId);
  const indent = await prisma.invPurchaseIndent.create({
    data: {
      institutionId,
      indentNumber,
      department: body.department ?? 'Store Replenishment',
      requestedBy: body.requestedBy ?? 'Inventory Manager',
      status: 'DRAFT',
      notes: body.notes ?? 'Manual reorder request from Reorder Level screen',
      academicYear,
      lines: { create: lines },
    },
    include: { lines: true },
  });

  await logActivity(
    institutionId,
    'REORDER_INDENT_CREATED',
    `Purchase indent ${indent.indentNumber} created for ${lines.length} item(s)`,
    { indentId: indent.id, itemIds: body.itemIds },
    body.requestedBy,
  );

  const data = await getReorderLevelManagement(institutionId, academicYear);
  return {
    success: true,
    indentId: indent.id,
    indentNumber: indent.indentNumber,
    lineCount: lines.length,
    message: `Draft purchase indent ${indent.indentNumber} created — proceed to Purchase Orders to convert to PO`,
    data,
  };
}

export async function refreshReorderOnStockChange(institutionId: string, academicYear: string) {
  await processReorderAutomation(institutionId, academicYear);
  await syncLowStockAlerts(institutionId, academicYear);
}

export async function runReorderScan(
  institutionId: string,
  academicYear = '2025-26',
) {
  const automation = await processReorderAutomation(institutionId, academicYear);
  const alerts = await syncLowStockAlerts(institutionId, academicYear);
  const data = await getReorderLevelManagement(institutionId, academicYear);
  return {
    success: true,
    automation,
    alerts,
    message: automation.created
      ? `Auto-generated ${automation.created} indent line(s) in ${automation.indentNumber}`
      : `Scan complete — ${alerts.lowStockCount} items below reorder level`,
    data,
  };
}

export async function seedReorderLevel(institutionId: string) {
  const { seedInventoryDashboard } = await import('./inventoryDashboard.js');
  await seedInventoryDashboard(institutionId);

  const academicYear = '2025-26';
  const consumables = await prisma.invItem.findMany({
    where: { institutionId, academicYear, itemType: 'CONSUMABLE', status: 'ACTIVE' },
    take: 20,
  });

  const essentials = ['A4', 'Chalk', 'Paper', 'Pen', 'Marker', 'Notebook'];
  for (const item of consumables) {
    const isEssential = essentials.some((e) => item.itemName.toLowerCase().includes(e.toLowerCase()));
    if (!isEssential && Math.random() > 0.35) continue;
    const reorder = item.reorderLevel || 20;
    const lowQty = Math.max(0, Math.floor(reorder * (0.2 + Math.random() * 0.6)));
    await prisma.invItem.update({
      where: { id: item.id },
      data: {
        stockQty: lowQty,
        reorderLevel: reorder,
        minLevel: Math.max(1, Math.floor(reorder * 0.5)),
        maxLevel: Math.max(reorder * 2, item.maxLevel || 100),
      },
    });
  }

  await processReorderAutomation(institutionId, academicYear);
  await syncLowStockAlerts(institutionId, academicYear);

  return { seeded: true, message: 'Reorder level demo data prepared' };
}
