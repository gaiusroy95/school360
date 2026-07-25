import { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { seedRoomsAllotment } from './hostelRoomsAllotment.js';

const ACADEMIC_YEARS = ['2023-24', '2024-25', '2025-26', '2026-27'];
const ITEM_TYPES = ['ASSET', 'CONSUMABLE'] as const;
const ASSET_TYPES = ['MATTRESS', 'CHAIR', 'TABLE', 'BED_FRAME'] as const;
const CONSUMABLE_SUBS = ['CLEANING', 'MESS_GROCERY', 'SPARE_PART', 'GENERAL'] as const;

function formatDateTime(d: Date) {
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatDate(d: Date) {
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

async function logActivity(
  institutionId: string,
  action: string,
  details: string,
  snapshot: Record<string, unknown> = {},
  performedBy = 'System',
) {
  await prisma.hostelActivityLog.create({
    data: {
      institutionId,
      action,
      details,
      filterSnapshot: snapshot as Prisma.InputJsonValue,
      performedBy,
    },
  });
}

async function recordTransaction(
  institutionId: string,
  inventoryItemId: string,
  transactionType: string,
  quantity: number,
  balanceAfter: number,
  referenceType: string,
  referenceId: string,
  performedBy: string,
  notes: string,
) {
  return prisma.hostelInventoryTransaction.create({
    data: {
      institutionId,
      inventoryItemId,
      transactionType,
      quantity,
      balanceAfter,
      referenceType,
      referenceId,
      performedBy,
      notes,
    },
  });
}

export async function processLowStockAlerts(institutionId: string, academicYear: string) {
  const lowItems = await prisma.hostelInventoryItem.findMany({
    where: {
      institutionId,
      academicYear,
      status: 'ACTIVE',
      itemType: 'CONSUMABLE',
      procurementAlertEnabled: true,
      subCategory: { in: ['CLEANING', 'MESS_GROCERY'] },
    },
  });

  const newAlerts: string[] = [];
  for (const item of lowItems) {
    if (item.stockQty > item.reorderLevel) continue;

    const recent = await prisma.hostelInventoryAlert.findFirst({
      where: {
        institutionId,
        inventoryItemId: item.id,
        alertType: 'LOW_STOCK',
        sentToProcurement: true,
        createdAt: { gte: new Date(Date.now() - 24 * 3600000) },
      },
    });
    if (recent) continue;

    const message = `Low stock: ${item.itemName} — ${item.stockQty} ${item.unit} remaining (reorder at ${item.reorderLevel})`;
    await prisma.hostelInventoryAlert.create({
      data: {
        institutionId,
        inventoryItemId: item.id,
        itemName: item.itemName,
        alertType: 'LOW_STOCK',
        currentStock: item.stockQty,
        reorderLevel: item.reorderLevel,
        message,
        sentToProcurement: true,
        sentAt: new Date(),
        academicYear,
      },
    });

    await logActivity(
      institutionId,
      'PROCUREMENT_ALERT',
      `Email to Procurement: ${message}`,
      { itemId: item.id, itemCode: item.itemCode, stockQty: item.stockQty },
    );
    newAlerts.push(item.itemName);
  }
  return newAlerts;
}

function mapItemRow(i: {
  id: string;
  itemCode: string;
  itemName: string;
  itemType: string;
  category: string;
  subCategory: string;
  unit: string;
  stockQty: number;
  reorderLevel: number;
  status: string;
}) {
  const lowStock = i.itemType === 'CONSUMABLE' && i.stockQty <= i.reorderLevel;
  return {
    id: i.id,
    itemCode: i.itemCode,
    itemName: i.itemName,
    itemType: i.itemType,
    category: i.category,
    subCategory: i.subCategory.replace('_', ' '),
    subCategoryCode: i.subCategory,
    unit: i.unit,
    stockQty: i.stockQty,
    reorderLevel: i.reorderLevel,
    lowStock,
    status: i.status,
  };
}

function mapAssetRow(a: {
  id: string;
  assetTag: string;
  assetName: string;
  assetType: string;
  condition: string;
  status: string;
  serialNumber: string;
  bedMappings?: { bedLabel: string; roomLabel: string; studentName: string; status: string }[];
}) {
  const activeMapping = a.bedMappings?.find((m) => m.status === 'ACTIVE');
  return {
    id: a.id,
    assetTag: a.assetTag,
    assetName: a.assetName,
    assetType: a.assetType.replace('_', ' '),
    assetTypeCode: a.assetType,
    condition: a.condition,
    status: a.status,
    serialNumber: a.serialNumber,
    mappedToBed: activeMapping ? `${activeMapping.roomLabel} / Bed ${activeMapping.bedLabel}` : null,
    mappedStudent: activeMapping?.studentName ?? null,
    isAllotted: !!activeMapping,
  };
}

export function countInventoryKpis(
  items: { itemType: string; stockQty: number; reorderLevel: number }[],
  assets: { status: string }[],
) {
  const consumables = items.filter((i) => i.itemType === 'CONSUMABLE');
  const lowStock = consumables.filter((i) => i.stockQty <= i.reorderLevel).length;
  const assetTotal = assets.length;
  const assetAllotted = assets.filter((a) => a.status === 'ALLOTTED').length;
  const assetAvailable = assets.filter((a) => a.status === 'AVAILABLE').length;

  return {
    totalItems: items.length,
    consumables: consumables.length,
    lowStock,
    assetTotal,
    assetAllotted,
    assetAvailable,
    mappings: assetAllotted,
  };
}

export async function getInventoryManagement(
  institutionId: string,
  academicYear = '2025-26',
  filters: { itemType?: string; subCategory?: string } = {},
) {
  await processLowStockAlerts(institutionId, academicYear);

  const itemWhere: Prisma.HostelInventoryItemWhereInput = { institutionId, academicYear, status: 'ACTIVE' };
  if (filters.itemType && filters.itemType !== 'ALL') itemWhere.itemType = filters.itemType;
  if (filters.subCategory && filters.subCategory !== 'ALL') itemWhere.subCategory = filters.subCategory;

  const [items, assets, mappings, alerts, transactions, hostels, beds] = await Promise.all([
    prisma.hostelInventoryItem.findMany({ where: itemWhere, orderBy: [{ itemType: 'asc' }, { itemName: 'asc' }] }),
    prisma.hostelInventoryAsset.findMany({
      where: { institutionId, academicYear },
      include: { bedMappings: { where: { status: 'ACTIVE' } } },
      orderBy: { assetTag: 'asc' },
      take: 100,
    }),
    prisma.hostelBedAssetMapping.findMany({
      where: { institutionId, academicYear, status: 'ACTIVE' },
      include: { asset: true, bed: { include: { room: { include: { floor: { include: { block: true } } } } } } },
      orderBy: { allottedAt: 'desc' },
      take: 50,
    }),
    prisma.hostelInventoryAlert.findMany({
      where: { institutionId, academicYear },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.hostelInventoryTransaction.findMany({
      where: { institutionId },
      include: { inventoryItem: true },
      orderBy: { createdAt: 'desc' },
      take: 15,
    }),
    prisma.hostelMaster.findMany({ where: { institutionId, academicYear, status: 'ACTIVE' }, orderBy: { hostelName: 'asc' } }),
    prisma.hostelBed.findMany({
      where: { institutionId, bedStatus: { in: ['OCCUPIED', 'AVAILABLE'] } },
      include: {
        room: { include: { floor: { include: { block: { include: { hostel: true } } } } } },
        allotments: { where: { status: 'ACTIVE' }, take: 1 },
      },
      take: 80,
    }),
  ]);

  const kpis = countInventoryKpis(items, assets);

  const categoryChart = [
    { name: 'Cleaning', value: items.filter((i) => i.subCategory === 'CLEANING').length, color: '#3b82f6' },
    { name: 'Mess Grocery', value: items.filter((i) => i.subCategory === 'MESS_GROCERY').length, color: '#f59e0b' },
    { name: 'Assets', value: assets.length, color: '#8b5cf6' },
    { name: 'Spare Parts', value: items.filter((i) => i.subCategory === 'SPARE_PART').length, color: '#64748b' },
  ].map((c) => ({
    ...c,
    percent: kpis.totalItems ? `${Math.round((c.value / Math.max(1, kpis.totalItems + assets.length)) * 100)}%` : '0%',
  }));

  await logActivity(institutionId, 'VIEW_INVENTORY', 'Hostel inventory accessed', { academicYear });

  return {
    academicYear,
    academicYears: ACADEMIC_YEARS,
    itemTypes: ITEM_TYPES.map((t) => ({ value: t, label: t.charAt(0) + t.slice(1).toLowerCase() })),
    assetTypes: ASSET_TYPES.map((t) => ({ value: t, label: t.replace('_', ' ') })),
    consumableSubCategories: CONSUMABLE_SUBS.map((s) => ({ value: s, label: s.replace('_', ' ') })),
    kpis,
    categoryChart,
    items: items.map(mapItemRow),
    assets: assets.map((a) => mapAssetRow(a)),
    bedMappings: mappings.map((m) => ({
      id: m.id,
      assetTag: m.asset.assetTag,
      assetName: m.asset.assetName,
      assetType: m.asset.assetType,
      studentName: m.studentName,
      roomLabel: m.roomLabel,
      bedLabel: m.bedLabel,
      allottedAt: formatDateTime(m.allottedAt),
      status: m.status,
    })),
    lowStockItems: items.filter((i) => i.itemType === 'CONSUMABLE' && i.stockQty <= i.reorderLevel).map(mapItemRow),
    procurementAlerts: alerts.map((a) => ({
      id: a.id,
      itemName: a.itemName,
      message: a.message,
      currentStock: a.currentStock,
      reorderLevel: a.reorderLevel,
      sentToProcurement: a.sentToProcurement,
      sentAt: a.sentAt ? formatDateTime(a.sentAt) : null,
      acknowledged: !!a.acknowledgedAt,
    })),
    recentTransactions: transactions.map((t) => ({
      id: t.id,
      itemName: t.inventoryItem.itemName,
      type: t.transactionType.replace('_', ' '),
      quantity: t.quantity,
      balanceAfter: t.balanceAfter,
      performedBy: t.performedBy,
      at: formatDateTime(t.createdAt),
    })),
    availableBeds: beds
      .filter((b) => b.allotments.length > 0 || b.bedStatus === 'OCCUPIED')
      .map((b) => {
        const allotment = b.allotments[0];
        const block = b.room.floor.block;
        const hostel = block.hostel;
        return {
          bedId: b.id,
          bedLabel: b.bedNumber,
          roomLabel: `${block.blockName} / ${b.room.roomNumber}`,
          hostelName: hostel.hostelName,
          studentName: allotment?.studentName ?? '',
          studentProfileId: '',
          studentId: allotment?.studentId ?? '',
        };
      }),
    availableAssets: assets.filter((a) => a.status === 'AVAILABLE').map((a) => mapAssetRow(a)),
    hostels: hostels.map((h) => ({ id: h.id, name: h.hostelName })),
    permissions: {
      canAddItem: true,
      canStockIn: true,
      canAssignAsset: true,
      canReleaseAsset: true,
      canExport: true,
    },
    automationRules: [
      'Low-stock alerts emailed to Procurement for cleaning supplies & mess groceries',
      'Asset tags mapped to student beds (mattress, chair, table)',
      'Maintenance module auto-deducts spare parts on ticket close',
    ],
    reports: ['Stock Register', 'Asset Mapping Report', 'Procurement Reorder List'],
    exportFormats: ['PDF', 'Excel', 'CSV'],
  };
}

export async function upsertInventoryItem(
  institutionId: string,
  body: {
    id?: string;
    itemCode: string;
    itemName: string;
    itemType?: string;
    subCategory?: string;
    category?: string;
    unit?: string;
    stockQty?: number;
    reorderLevel?: number;
    academicYear?: string;
  },
) {
  const academicYear = body.academicYear ?? '2025-26';
  const data = {
    itemCode: body.itemCode,
    itemName: body.itemName,
    itemType: body.itemType ?? 'CONSUMABLE',
    subCategory: body.subCategory ?? 'GENERAL',
    category: body.category ?? 'GENERAL',
    unit: body.unit ?? 'pcs',
    stockQty: body.stockQty ?? 0,
    reorderLevel: body.reorderLevel ?? 5,
    academicYear,
    procurementAlertEnabled: ['CLEANING', 'MESS_GROCERY'].includes(body.subCategory ?? ''),
  };

  const item = body.id
    ? await prisma.hostelInventoryItem.update({ where: { id: body.id }, data })
    : await prisma.hostelInventoryItem.upsert({
        where: { institutionId_itemCode: { institutionId, itemCode: body.itemCode } },
        create: { institutionId, ...data },
        update: data,
      });

  return { success: true, item: mapItemRow(item), message: 'Inventory item saved' };
}

export async function recordStockIn(
  institutionId: string,
  body: { inventoryItemId: string; quantity: number; performedBy?: string; notes?: string },
) {
  const item = await prisma.hostelInventoryItem.findFirst({
    where: { id: body.inventoryItemId, institutionId, itemType: 'CONSUMABLE' },
  });
  if (!item) throw new Error('Consumable item not found');

  const newQty = item.stockQty + body.quantity;
  const updated = await prisma.hostelInventoryItem.update({
    where: { id: item.id },
    data: { stockQty: newQty },
  });

  await recordTransaction(
    institutionId,
    item.id,
    'STOCK_IN',
    body.quantity,
    newQty,
    'PROCUREMENT',
    '',
    body.performedBy ?? 'Store Keeper',
    body.notes ?? 'Stock received',
  );

  return { success: true, item: mapItemRow(updated), message: `Stock in: +${body.quantity} ${item.unit}` };
}

export async function createInventoryAsset(
  institutionId: string,
  body: {
    assetTag: string;
    assetName: string;
    assetType: string;
    serialNumber?: string;
    condition?: string;
    hostelId?: string;
    academicYear?: string;
  },
) {
  const academicYear = body.academicYear ?? '2025-26';
  const asset = await prisma.hostelInventoryAsset.create({
    data: {
      institutionId,
      assetTag: body.assetTag,
      assetName: body.assetName,
      assetType: body.assetType,
      serialNumber: body.serialNumber ?? '',
      condition: body.condition ?? 'GOOD',
      hostelId: body.hostelId ?? '',
      status: 'AVAILABLE',
      academicYear,
    },
    include: { bedMappings: true },
  });

  await logActivity(institutionId, 'ASSET_CREATED', `Asset ${body.assetTag} registered`, { assetId: asset.id });
  return { success: true, asset: mapAssetRow(asset), message: `Asset ${body.assetTag} registered` };
}

export async function assignAssetToBed(
  institutionId: string,
  body: {
    assetId: string;
    bedId: string;
    studentName?: string;
    studentProfileId?: string;
    studentId?: string;
    performedBy?: string;
    academicYear?: string;
  },
) {
  const asset = await prisma.hostelInventoryAsset.findFirst({ where: { id: body.assetId, institutionId } });
  if (!asset || asset.status !== 'AVAILABLE') {
    throw new Error('Asset not available for allotment');
  }

  const bed = await prisma.hostelBed.findFirst({
    where: { id: body.bedId, institutionId },
    include: {
      room: { include: { floor: { include: { block: true } } } },
      allotments: { where: { status: 'ACTIVE' }, take: 1 },
    },
  });
  if (!bed) throw new Error('Bed not found');

  const allotment = bed.allotments[0];
  const studentName = body.studentName ?? allotment?.studentName ?? '';
  const studentId = body.studentId ?? allotment?.studentId ?? '';
  const roomLabel = `${bed.room.floor.block.blockName} / Room ${bed.room.roomNumber}`;
  const academicYear = body.academicYear ?? '2025-26';

  const mapping = await prisma.hostelBedAssetMapping.create({
    data: {
      institutionId,
      bedId: body.bedId,
      assetId: body.assetId,
      studentProfileId: body.studentProfileId ?? '',
      studentId,
      studentName,
      roomLabel,
      bedLabel: bed.bedNumber,
      academicYear,
    },
  });

  await prisma.hostelInventoryAsset.update({
    where: { id: body.assetId },
    data: { status: 'ALLOTTED' },
  });

  await logActivity(
    institutionId,
    'ASSET_MAPPED',
    `${asset.assetTag} (${asset.assetType}) mapped to ${roomLabel} Bed ${bed.bedNumber}${studentName ? ` — ${studentName}` : ''}`,
    { mappingId: mapping.id, assetTag: asset.assetTag, bedId: body.bedId },
    body.performedBy ?? 'Facility Manager',
  );

  return {
    success: true,
    mapping,
    message: `${asset.assetTag} mapped to Bed ${bed.bedNumber}`,
  };
}

export async function releaseAssetFromBed(
  institutionId: string,
  mappingId: string,
  performedBy = 'Facility Manager',
) {
  const mapping = await prisma.hostelBedAssetMapping.findFirst({
    where: { id: mappingId, institutionId, status: 'ACTIVE' },
    include: { asset: true },
  });
  if (!mapping) throw new Error('Active mapping not found');

  await prisma.hostelBedAssetMapping.update({
    where: { id: mappingId },
    data: { status: 'RELEASED', releasedAt: new Date() },
  });

  await prisma.hostelInventoryAsset.update({
    where: { id: mapping.assetId },
    data: { status: 'AVAILABLE' },
  });

  await logActivity(
    institutionId,
    'ASSET_RELEASED',
    `${mapping.asset.assetTag} released from Bed ${mapping.bedLabel}`,
    { mappingId },
    performedBy,
  );

  return { success: true, message: `${mapping.asset.assetTag} released from bed` };
}

export async function acknowledgeProcurementAlert(institutionId: string, alertId: string) {
  const alert = await prisma.hostelInventoryAlert.update({
    where: { id: alertId },
    data: { acknowledgedAt: new Date() },
  });
  return { success: true, alert, message: 'Alert acknowledged' };
}

export async function exportInventoryReport(
  institutionId: string,
  academicYear: string,
  format: 'PDF' | 'Excel' | 'CSV',
  reportType = 'Stock Register',
) {
  const data = await getInventoryManagement(institutionId, academicYear);
  const fileName = `hostel_inventory_${Date.now()}.${format.toLowerCase()}`;
  await logActivity(institutionId, 'EXPORT_INVENTORY', `Exported ${reportType}`, { format });
  return { success: true, format, fileName, message: `${reportType} exported`, snapshot: data };
}

export async function seedInventoryManagement(institutionId: string) {
  await seedRoomsAllotment(institutionId);
  const academicYear = '2025-26';

  const existing = await prisma.hostelInventoryItem.count({
    where: { institutionId, subCategory: { in: ['CLEANING', 'MESS_GROCERY'] } },
  });
  if (existing >= 8) return getInventoryManagement(institutionId, academicYear);

  await prisma.hostelBedAssetMapping.deleteMany({ where: { institutionId } });
  await prisma.hostelInventoryAlert.deleteMany({ where: { institutionId } });
  await prisma.hostelInventoryTransaction.deleteMany({ where: { institutionId } });
  await prisma.hostelInventoryAsset.deleteMany({ where: { institutionId } });

  const consumables = [
    { itemCode: 'CLN-FLOOR', itemName: 'Floor Cleaner 5L', subCategory: 'CLEANING', unit: 'ltr', stockQty: 3, reorderLevel: 10 },
    { itemCode: 'CLN-DET', itemName: 'Detergent Powder', subCategory: 'CLEANING', unit: 'kg', stockQty: 8, reorderLevel: 15 },
    { itemCode: 'CLN-MOP', itemName: 'Mop Heads', subCategory: 'CLEANING', unit: 'pcs', stockQty: 4, reorderLevel: 8 },
    { itemCode: 'CLN-DISINF', itemName: 'Disinfectant Liquid', subCategory: 'CLEANING', unit: 'ltr', stockQty: 2, reorderLevel: 8 },
    { itemCode: 'MSG-RICE', itemName: 'Basmati Rice', subCategory: 'MESS_GROCERY', unit: 'kg', stockQty: 120, reorderLevel: 50 },
    { itemCode: 'MSG-DAL', itemName: 'Toor Dal', subCategory: 'MESS_GROCERY', unit: 'kg', stockQty: 45, reorderLevel: 30 },
    { itemCode: 'MSG-OIL', itemName: 'Cooking Oil', subCategory: 'MESS_GROCERY', unit: 'ltr', stockQty: 25, reorderLevel: 20 },
    { itemCode: 'MSG-VEG', itemName: 'Mixed Vegetables (weekly)', subCategory: 'MESS_GROCERY', unit: 'kg', stockQty: 12, reorderLevel: 25 },
  ];

  for (const c of consumables) {
    await prisma.hostelInventoryItem.upsert({
      where: { institutionId_itemCode: { institutionId, itemCode: c.itemCode } },
      create: {
        institutionId,
        academicYear,
        itemType: 'CONSUMABLE',
        category: 'CONSUMABLE',
        procurementAlertEnabled: true,
        status: 'ACTIVE',
        ...c,
      },
      update: { stockQty: c.stockQty, reorderLevel: c.reorderLevel, subCategory: c.subCategory, itemType: 'CONSUMABLE' },
    });
  }

  const hostels = await prisma.hostelMaster.findMany({ where: { institutionId, status: 'ACTIVE' }, take: 3 });
  const occupiedBeds = await prisma.hostelBed.findMany({
    where: { institutionId, bedStatus: 'OCCUPIED' },
    include: {
      room: { include: { floor: { include: { block: true } } } },
      allotments: { where: { status: 'ACTIVE' }, take: 1 },
    },
    take: 20,
  });

  let assetIdx = 0;
  const assetTypes: (typeof ASSET_TYPES)[number][] = ['MATTRESS', 'CHAIR', 'TABLE', 'BED_FRAME'];

  for (const bed of occupiedBeds.slice(0, 15)) {
    const allotment = bed.allotments[0];
    const hostel = hostels[assetIdx % hostels.length];
    const assetType = assetTypes[assetIdx % assetTypes.length];
    assetIdx += 1;
    const tag = `${assetType.slice(0, 3)}-${new Date().getFullYear()}-${String(assetIdx).padStart(4, '0')}`;

    const asset = await prisma.hostelInventoryAsset.create({
      data: {
        institutionId,
        assetTag: tag,
        assetName: `${assetType.replace('_', ' ')} — ${tag}`,
        assetType,
        condition: assetIdx % 5 === 0 ? 'FAIR' : 'GOOD',
        hostelId: hostel?.id ?? '',
        status: 'ALLOTTED',
        academicYear,
        purchaseDate: new Date('2024-06-01'),
      },
    });

    const roomLabel = `${bed.room.floor.block.blockName} / Room ${bed.room.roomNumber}`;
    await prisma.hostelBedAssetMapping.create({
      data: {
        institutionId,
        bedId: bed.id,
        assetId: asset.id,
        studentName: allotment?.studentName ?? '',
        studentId: allotment?.studentId ?? '',
        roomLabel,
        bedLabel: bed.bedNumber,
        academicYear,
      },
    });
  }

  for (let i = 0; i < 10; i += 1) {
    const assetType = assetTypes[i % assetTypes.length];
    const tag = `${assetType.slice(0, 3)}-SPARE-${String(i + 1).padStart(3, '0')}`;
    await prisma.hostelInventoryAsset.create({
      data: {
        institutionId,
        assetTag: tag,
        assetName: `Spare ${assetType.replace('_', ' ')}`,
        assetType,
        status: 'AVAILABLE',
        hostelId: hostels[0]?.id ?? '',
        academicYear,
      },
    });
  }

  await processLowStockAlerts(institutionId, academicYear);

  const riceItem = await prisma.hostelInventoryItem.findFirst({ where: { institutionId, itemCode: 'MSG-RICE' } });
  if (riceItem) {
    await prisma.hostelInventoryTransaction.create({
      data: {
        institutionId,
        inventoryItemId: riceItem.id,
        transactionType: 'STOCK_IN',
        quantity: 50,
        balanceAfter: riceItem.stockQty,
        referenceType: 'PROCUREMENT',
        performedBy: 'Store Keeper',
        notes: 'Weekly mess grocery receipt',
      },
    });
  }

  await logActivity(institutionId, 'SEED_INVENTORY', 'Hostel inventory demo seeded');
  return getInventoryManagement(institutionId, academicYear);
}
