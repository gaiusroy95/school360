import { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { seedInventoryDashboard } from './inventoryDashboard.js';

const ACADEMIC_YEARS = ['2023-24', '2024-25', '2025-26', '2026-27'];
const ITEM_TYPES = ['ASSET', 'CONSUMABLE', 'SERVICE'] as const;
const VALUATION_METHODS = ['FIFO', 'LIFO', 'WAC'] as const;

type ItemType = typeof ITEM_TYPES[number];
type ValuationMethod = typeof VALUATION_METHODS[number];

const MANAGER_ROLES = new Set(['Super Admin', 'Inventory Manager', 'Admin']);
const DELETE_ROLES = new Set(['Super Admin', 'Admin']);

const UNIT_SEED = [
  { code: 'PCS', name: 'Pcs' },
  { code: 'REAM', name: 'Ream' },
  { code: 'KG', name: 'Kg' },
  { code: 'LTR', name: 'Ltr' },
  { code: 'SET', name: 'Set' },
  { code: 'KIT', name: 'Kits' },
  { code: 'BOX', name: 'Boxes' },
];

function formatInr(n: number) {
  return `₹ ${Math.round(n).toLocaleString('en-IN')}`;
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

async function logItemAudit(
  institutionId: string,
  itemId: string,
  fieldName: string,
  oldValue: string,
  newValue: string,
  performedBy: string,
) {
  await prisma.invItemAuditLog.create({
    data: { institutionId, itemId, fieldName, oldValue, newValue, performedBy },
  });
}

async function ensureUnits(institutionId: string, academicYear: string) {
  const existing = await prisma.invUnit.count({ where: { institutionId } });
  if (existing > 0) {
    return prisma.invUnit.findMany({ where: { institutionId, status: 'ACTIVE' }, orderBy: { unitName: 'asc' } });
  }
  for (const u of UNIT_SEED) {
    await prisma.invUnit.create({
      data: { institutionId, unitCode: u.code, unitName: u.name, academicYear },
    });
  }
  return prisma.invUnit.findMany({ where: { institutionId, status: 'ACTIVE' }, orderBy: { unitName: 'asc' } });
}

export async function generateItemSku(institutionId: string, categoryId: string) {
  const category = await prisma.invCategory.findFirst({ where: { id: categoryId, institutionId } });
  if (!category) throw new Error('Category not found');

  const prefix = category.skuPrefix || category.categoryCode;
  const count = await prisma.invItem.count({ where: { institutionId, categoryId } });
  const seq = String(count + 1).padStart(4, '0');
  return `${prefix}-${seq}`;
}

export async function generateItemBarcode(institutionId: string, itemCode: string) {
  const hash = itemCode.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
  return `890${String(hash).padStart(7, '0').slice(-7)}${Date.now().toString().slice(-3)}`;
}

async function checkDuplicate(
  institutionId: string,
  itemName: string,
  brand: string,
  excludeId?: string,
) {
  const dup = await prisma.invItem.findFirst({
    where: {
      institutionId,
      itemName: { equals: itemName, mode: 'insensitive' },
      brand: { equals: brand || '', mode: 'insensitive' },
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
  });
  if (dup) throw new Error(`Duplicate item: "${itemName}" with brand "${brand || 'N/A'}" already exists`);
}

async function hasTransactions(itemId: string) {
  const [grn, outward] = await Promise.all([
    prisma.invGrnLine.count({ where: { itemId } }),
    prisma.invStockOutwardLine.count({ where: { itemId } }),
  ]);
  return grn + outward > 0;
}

function mapItemRow(i: {
  id: string;
  itemCode: string;
  itemName: string;
  brand: string;
  itemType: string;
  unit: string;
  barcode: string;
  stockQty: number;
  reorderLevel: number;
  minLevel: number;
  maxLevel: number;
  weightedAvgCost: number;
  valuationMethod: string;
  taxRate: number;
  approvalStatus: string;
  thumbnailUrl: string;
  color: string;
  size: string;
  baseUnitLocked: boolean;
  status: string;
  category: { categoryName: string; categoryCode: string };
  store: { storeName: string };
  defaultSupplier?: { supplierName: string } | null;
}) {
  const stockStatus = i.stockQty <= 0 ? 'OUT_OF_STOCK' : i.stockQty <= i.reorderLevel ? 'LOW_STOCK' : 'IN_STOCK';
  return {
    id: i.id,
    sku: i.itemCode,
    name: i.itemName,
    brand: i.brand || '—',
    itemType: i.itemType,
    itemTypeLabel: i.itemType.charAt(0) + i.itemType.slice(1).toLowerCase(),
    category: i.category.categoryName,
    categoryCode: i.category.categoryCode,
    store: i.store.storeName,
    baseUnit: i.unit,
    currentStock: i.stockQty,
    stockLabel: `${i.stockQty} ${i.unit}`,
    reorderLevel: i.reorderLevel,
    minLevel: i.minLevel,
    maxLevel: i.maxLevel,
    valuationMethod: i.valuationMethod,
    stockValue: formatInr(i.stockQty * i.weightedAvgCost),
    unitCost: formatInr(i.weightedAvgCost),
    taxRate: i.taxRate,
    barcode: i.barcode,
    thumbnailUrl: i.thumbnailUrl || '',
    color: i.color,
    size: i.size,
    defaultVendor: i.defaultSupplier?.supplierName ?? '—',
    approvalStatus: i.approvalStatus,
    baseUnitLocked: i.baseUnitLocked,
    stockStatus,
    status: i.status,
  };
}

export async function getItemsManagement(
  institutionId: string,
  academicYear = '2025-26',
  filters: {
    q?: string;
    categoryId?: string;
    itemType?: string;
    storeId?: string;
    approvalStatus?: string;
  } = {},
  userRole = 'Inventory Manager',
) {
  await ensureUnits(institutionId, academicYear);

  const where: Prisma.InvItemWhereInput = {
    institutionId,
    academicYear,
    status: 'ACTIVE',
  };
  if (filters.categoryId && filters.categoryId !== 'ALL') where.categoryId = filters.categoryId;
  if (filters.itemType && filters.itemType !== 'ALL') where.itemType = filters.itemType;
  if (filters.storeId && filters.storeId !== 'ALL') where.storeId = filters.storeId;
  if (filters.approvalStatus && filters.approvalStatus !== 'ALL') where.approvalStatus = filters.approvalStatus;
  if (filters.q) {
    where.OR = [
      { itemName: { contains: filters.q, mode: 'insensitive' } },
      { itemCode: { contains: filters.q, mode: 'insensitive' } },
      { brand: { contains: filters.q, mode: 'insensitive' } },
      { barcode: { contains: filters.q, mode: 'insensitive' } },
    ];
  }

  const [items, categories, stores, units, suppliers, pendingRequests, totalCount] = await Promise.all([
    prisma.invItem.findMany({
      where,
      include: { category: true, store: true, defaultSupplier: true },
      orderBy: { itemName: 'asc' },
      take: 200,
    }),
    prisma.invCategory.findMany({ where: { institutionId, academicYear, status: 'ACTIVE' }, orderBy: { categoryName: 'asc' } }),
    prisma.invStore.findMany({ where: { institutionId, academicYear, status: 'ACTIVE' }, orderBy: { storeName: 'asc' } }),
    prisma.invUnit.findMany({ where: { institutionId, status: 'ACTIVE' }, orderBy: { unitName: 'asc' } }),
    prisma.invSupplier.findMany({ where: { institutionId, academicYear, status: 'ACTIVE' }, orderBy: { supplierName: 'asc' } }),
    prisma.invItemRequest.count({ where: { institutionId, academicYear, status: 'PENDING' } }),
    prisma.invItem.count({ where: { institutionId, academicYear, status: 'ACTIVE' } }),
  ]);

  const typeBreakdown = ITEM_TYPES.map((t) => ({
    type: t,
    count: items.filter((i) => i.itemType === t).length,
  }));

  await logActivity(institutionId, 'VIEW_ITEMS', 'Items / Products catalog accessed', { academicYear, ...filters });

  return {
    academicYear,
    academicYears: ACADEMIC_YEARS,
    totalItems: totalCount,
    pendingRequests,
    items: items.map(mapItemRow),
    categories: categories.map((c) => ({
      id: c.id,
      code: c.categoryCode,
      name: c.categoryName,
      skuPrefix: c.skuPrefix || c.categoryCode,
      color: c.color,
    })),
    stores: stores.map((s) => ({ id: s.id, code: s.storeCode, name: s.storeName })),
    units: units.map((u) => ({ id: u.id, code: u.unitCode, name: u.unitName })),
    suppliers: suppliers.map((s) => ({ id: s.id, code: s.supplierCode, name: s.supplierName })),
    itemTypes: ITEM_TYPES.map((t) => ({ value: t, label: t.charAt(0) + t.slice(1).toLowerCase() })),
    valuationMethods: VALUATION_METHODS.map((v) => ({ value: v, label: v })),
    typeBreakdown,
    permissions: {
      canCreate: MANAGER_ROLES.has(userRole),
      canEdit: MANAGER_ROLES.has(userRole),
      canDelete: DELETE_ROLES.has(userRole),
      canApprove: MANAGER_ROLES.has(userRole),
      canRequest: userRole === 'Store Keeper' || MANAGER_ROLES.has(userRole),
    },
    automationRules: [
      'Auto-generate SKU: Category Prefix + Sequential Number (e.g., LAB-0001)',
      'Auto-generate Barcode on item creation',
      'Duplicate prevention: Item Name + Brand must be unique',
      'Base Unit locked when transaction history exists',
    ],
    reports: ['Item Master List', 'Dead Stock Potential'],
    exportFormats: ['PDF', 'Excel', 'CSV'],
    erpIntegration: ['Asset Management — Asset type items link to fixed asset register'],
    mobileSync: ['Staff App: item lookup with real-time stock across campuses'],
  };
}

export async function getItemDetail(institutionId: string, itemId: string) {
  const item = await prisma.invItem.findFirst({
    where: { id: itemId, institutionId },
    include: {
      category: true,
      store: true,
      defaultSupplier: true,
      unitRef: true,
      images: { orderBy: { sortOrder: 'asc' } },
      customFields: true,
      auditLogs: { orderBy: { createdAt: 'desc' }, take: 20 },
    },
  });
  if (!item) throw new Error('Item not found');

  const txnExists = await hasTransactions(itemId);

  return {
    ...mapItemRow(item),
    description: item.description,
    storeId: item.storeId,
    categoryId: item.categoryId,
    unitId: item.unitId,
    defaultSupplierId: item.defaultSupplierId,
    weightedAvgCost: item.weightedAvgCost,
    inTransitQty: item.inTransitQty,
    monthlyUsage: item.monthlyUsage,
    hasTransactions: txnExists,
    images: item.images.map((img) => ({ id: img.id, url: img.imageUrl, sortOrder: img.sortOrder })),
    customFields: item.customFields.map((f) => ({
      id: f.id,
      key: f.fieldKey,
      label: f.fieldLabel,
      value: f.fieldValue,
    })),
    auditTrail: item.auditLogs.map((a) => ({
      field: a.fieldName,
      from: a.oldValue,
      to: a.newValue,
      by: a.performedBy,
      at: a.createdAt.toISOString(),
    })),
  };
}

export async function createInventoryItem(
  institutionId: string,
  body: {
    itemName: string;
    brand?: string;
    categoryId: string;
    storeId: string;
    itemType: ItemType;
    unit: string;
    unitId?: string;
    itemCode?: string;
    valuationMethod?: ValuationMethod;
    reorderLevel?: number;
    minLevel?: number;
    maxLevel?: number;
    weightedAvgCost?: number;
    taxRate?: number;
    description?: string;
    defaultSupplierId?: string;
    color?: string;
    size?: string;
    thumbnailUrl?: string;
    customFields?: { key: string; label: string; value: string }[];
    academicYear?: string;
    performedBy?: string;
    approvalStatus?: string;
  },
  userRole = 'Inventory Manager',
) {
  if (!MANAGER_ROLES.has(userRole) && userRole !== 'Store Keeper') {
    throw new Error('Access denied — insufficient permissions');
  }

  const academicYear = body.academicYear ?? '2025-26';
  await checkDuplicate(institutionId, body.itemName, body.brand ?? '');

  const itemCode = body.itemCode || await generateItemSku(institutionId, body.categoryId);
  const barcode = await generateItemBarcode(institutionId, itemCode);

  const existingCode = await prisma.invItem.findFirst({ where: { institutionId, itemCode } });
  if (existingCode) throw new Error('SKU already exists');

  const approvalStatus = userRole === 'Store Keeper' ? 'PENDING' : (body.approvalStatus ?? 'APPROVED');

  const item = await prisma.invItem.create({
    data: {
      institutionId,
      storeId: body.storeId,
      categoryId: body.categoryId,
      unitId: body.unitId || null,
      defaultSupplierId: body.defaultSupplierId || null,
      itemCode,
      itemName: body.itemName,
      brand: body.brand ?? '',
      itemType: body.itemType,
      unit: body.unit,
      barcode,
      valuationMethod: body.valuationMethod ?? 'WAC',
      reorderLevel: body.reorderLevel ?? 10,
      minLevel: body.minLevel ?? 5,
      maxLevel: body.maxLevel ?? 1000,
      weightedAvgCost: body.weightedAvgCost ?? 0,
      taxRate: body.taxRate ?? 0,
      description: body.description ?? '',
      color: body.color ?? '',
      size: body.size ?? '',
      thumbnailUrl: body.thumbnailUrl ?? '',
      approvalStatus,
      requestedBy: body.performedBy ?? 'Inventory Manager',
      academicYear,
    },
    include: { category: true, store: true, defaultSupplier: true },
  });

  if (body.customFields?.length) {
    for (const f of body.customFields) {
      await prisma.invItemCustomField.create({
        data: {
          institutionId,
          itemId: item.id,
          fieldKey: f.key,
          fieldLabel: f.label,
          fieldValue: f.value,
        },
      });
    }
  }

  await logItemAudit(institutionId, item.id, 'CREATED', '', itemCode, body.performedBy ?? 'Inventory Manager');

  if (approvalStatus === 'APPROVED') {
    await prisma.invAlert.create({
      data: {
        institutionId,
        storeId: body.storeId,
        alertType: 'NEW_ITEM',
        severity: 'LOW',
        message: `New catalog item added: ${body.itemName} (${itemCode})`,
        academicYear,
      },
    });
    await logActivity(institutionId, 'ITEM_CREATED', `Created item ${itemCode}: ${body.itemName}`, { itemId: item.id });
  }

  return {
    success: true,
    item: mapItemRow(item),
    sku: itemCode,
    barcode,
    message: approvalStatus === 'PENDING'
      ? 'Item submitted for approval'
      : `Item created — SKU: ${itemCode}, Barcode: ${barcode}`,
  };
}

export async function updateInventoryItem(
  institutionId: string,
  itemId: string,
  body: Record<string, unknown>,
  performedBy = 'Inventory Manager',
) {
  const item = await prisma.invItem.findFirst({ where: { id: itemId, institutionId } });
  if (!item) throw new Error('Item not found');

  const txnExists = await hasTransactions(itemId);
  const updates: Prisma.InvItemUpdateInput = {};

  if (body.itemName || body.brand !== undefined) {
    const name = String(body.itemName ?? item.itemName);
    const brand = String(body.brand ?? item.brand);
    await checkDuplicate(institutionId, name, brand, itemId);
    if (body.itemName) updates.itemName = name;
    if (body.brand !== undefined) updates.brand = brand;
  }

  if (body.unit && body.unit !== item.unit) {
    if (txnExists || item.baseUnitLocked) {
      throw new Error('Cannot change Base Unit — transaction history exists');
    }
    updates.unit = String(body.unit);
    await logItemAudit(institutionId, itemId, 'unit', item.unit, String(body.unit), performedBy);
  }

  const auditedFields = ['reorderLevel', 'minLevel', 'maxLevel', 'taxRate', 'valuationMethod'] as const;
  for (const field of auditedFields) {
    if (body[field] !== undefined && body[field] !== item[field]) {
      await logItemAudit(institutionId, itemId, field, String(item[field]), String(body[field]), performedBy);
      (updates as Record<string, unknown>)[field] = body[field];
    }
  }

  const simpleFields = [
    'itemType', 'description', 'defaultSupplierId', 'color', 'size',
    'thumbnailUrl', 'weightedAvgCost', 'storeId', 'categoryId', 'unitId',
  ] as const;
  for (const f of simpleFields) {
    if (body[f] !== undefined) (updates as Record<string, unknown>)[f] = body[f];
  }

  if (txnExists) updates.baseUnitLocked = true;

  const updated = await prisma.invItem.update({
    where: { id: itemId },
    data: updates,
    include: { category: true, store: true, defaultSupplier: true },
  });

  if (Array.isArray(body.customFields)) {
    await prisma.invItemCustomField.deleteMany({ where: { itemId } });
    for (const f of body.customFields as { key: string; label: string; value: string }[]) {
      await prisma.invItemCustomField.create({
        data: { institutionId, itemId, fieldKey: f.key, fieldLabel: f.label, fieldValue: f.value },
      });
    }
  }

  await logActivity(institutionId, 'ITEM_UPDATED', `Updated item ${updated.itemCode}`, { itemId });

  return { success: true, item: mapItemRow(updated), message: 'Item updated successfully' };
}

export async function deleteInventoryItem(
  institutionId: string,
  itemId: string,
  userRole = 'Super Admin',
  performedBy = 'Super Admin',
) {
  if (!DELETE_ROLES.has(userRole)) throw new Error('Only Super Admin can delete items');

  const item = await prisma.invItem.findFirst({ where: { id: itemId, institutionId } });
  if (!item) throw new Error('Item not found');

  if (await hasTransactions(itemId)) {
    throw new Error('Cannot delete — item has transaction history');
  }

  await prisma.invItemCustomField.deleteMany({ where: { itemId } });
  await prisma.invItemImage.deleteMany({ where: { itemId } });
  await prisma.invItemAuditLog.deleteMany({ where: { itemId } });
  await prisma.invItem.delete({ where: { id: itemId } });

  await logActivity(institutionId, 'ITEM_DELETED', `Deleted item ${item.itemCode}: ${item.itemName}`, { itemId }, performedBy);

  return { success: true, message: `Item ${item.itemCode} deleted` };
}

export async function approveInventoryItem(
  institutionId: string,
  itemId: string,
  performedBy = 'Inventory Manager',
) {
  const item = await prisma.invItem.findFirst({ where: { id: itemId, institutionId } });
  if (!item || item.approvalStatus === 'APPROVED') throw new Error('Item not found or already approved');

  const updated = await prisma.invItem.update({
    where: { id: itemId },
    data: { approvalStatus: 'APPROVED' },
    include: { category: true, store: true, defaultSupplier: true },
  });

  await prisma.invAlert.create({
    data: {
      institutionId,
      storeId: item.storeId,
      alertType: 'NEW_ITEM',
      severity: 'LOW',
      message: `New catalog item approved: ${item.itemName} (${item.itemCode})`,
      academicYear: item.academicYear,
    },
  });

  await logActivity(institutionId, 'ITEM_APPROVED', `Approved item ${item.itemCode}`, { itemId }, performedBy);

  return { success: true, item: mapItemRow(updated), message: 'Item approved and added to catalog' };
}

export async function requestNewInventoryItem(
  institutionId: string,
  body: {
    itemName: string;
    brand?: string;
    categoryId: string;
    itemType?: ItemType;
    unit?: string;
    notes?: string;
    academicYear?: string;
    requestedBy?: string;
  },
) {
  const academicYear = body.academicYear ?? '2025-26';

  const request = await prisma.invItemRequest.create({
    data: {
      institutionId,
      itemName: body.itemName,
      brand: body.brand ?? '',
      categoryId: body.categoryId,
      itemType: body.itemType ?? 'CONSUMABLE',
      unit: body.unit ?? 'Pcs',
      notes: body.notes ?? '',
      requestedBy: body.requestedBy ?? 'Store Keeper',
      academicYear,
    },
  });

  await logActivity(institutionId, 'ITEM_REQUEST', `New item requested: ${body.itemName}`, { requestId: request.id });

  return { success: true, requestId: request.id, message: 'Item request submitted for approval' };
}

export async function exportItemMasterReport(
  institutionId: string,
  academicYear: string,
  format: 'PDF' | 'Excel' | 'CSV',
) {
  const data = await getItemsManagement(institutionId, academicYear);
  const fileName = `item_master_${Date.now()}.${format.toLowerCase()}`;
  await logActivity(institutionId, 'EXPORT_ITEM_MASTER', `Exported Item Master as ${format}`, { rowCount: data.items.length });
  return { success: true, format, fileName, message: `Item Master List exported (${data.items.length} items)`, snapshot: data };
}

export async function seedItemsManagement(institutionId: string) {
  await seedInventoryDashboard(institutionId);
  const academicYear = '2025-26';
  await ensureUnits(institutionId, academicYear);

  const categories = await prisma.invCategory.findMany({ where: { institutionId } });
  for (const cat of categories) {
    if (!cat.skuPrefix) {
      await prisma.invCategory.update({ where: { id: cat.id }, data: { skuPrefix: cat.categoryCode } });
    }
  }

  const items = await prisma.invItem.findMany({ where: { institutionId, academicYear } });
  const typeMap: Record<string, string> = {
    BOOKS: 'CONSUMABLE', LAB: 'ASSET', FURN: 'ASSET', SPORT: 'CONSUMABLE', ELEC: 'ASSET', OTHER: 'CONSUMABLE',
  };

  for (const item of items) {
    const cat = categories.find((c) => c.id === item.categoryId);
    const itemType = typeMap[cat?.categoryCode ?? ''] ?? 'CONSUMABLE';
    const barcode = item.barcode || await generateItemBarcode(institutionId, item.itemCode);
    const brand = item.brand || ['Generic', 'School Brand', 'EduPro', 'LabTech'][Math.floor(Math.random() * 4)];

    await prisma.invItem.update({
      where: { id: item.id },
      data: {
        itemType,
        brand,
        barcode,
        valuationMethod: 'WAC',
        approvalStatus: 'APPROVED',
        description: `${item.itemName} — institutional catalog item`,
      },
    });
  }

  const suppliers = await prisma.invSupplier.findMany({ where: { institutionId }, take: 1 });
  if (suppliers[0] && items[0]) {
    await prisma.invItem.update({ where: { id: items[0].id }, data: { defaultSupplierId: suppliers[0].id } });
  }

  if (items[0]) {
    const existing = await prisma.invItemCustomField.findFirst({
      where: { itemId: items[0].id, fieldKey: 'material' },
    });
    if (!existing) {
      await prisma.invItemCustomField.create({
        data: {
          institutionId,
          itemId: items[0].id,
          fieldKey: 'material',
          fieldLabel: 'Material',
          fieldValue: 'Paper 70 GSM',
        },
      });
    }
  }

  await logActivity(institutionId, 'SEED_ITEMS', 'Items / Products catalog seeded');
  return getItemsManagement(institutionId, academicYear);
}
