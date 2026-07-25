import { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { seedStockAdjustmentManagement } from './inventoryStockAdjustment.js';

const ACADEMIC_YEARS = ['2023-24', '2024-25', '2025-26', '2026-27'];
const LABEL_TEMPLATES = [
  { id: '1x2', label: '1×2 (Large)', cols: 1, rows: 2, widthMm: 100, heightMm: 50 },
  { id: '2x4', label: '2×4 (Standard)', cols: 2, rows: 4, widthMm: 50, heightMm: 25 },
] as const;

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

function isAssetItem(itemType: string) {
  return itemType === 'ASSET';
}

function buildConsumableCode(itemCode: string, batchNo?: string) {
  const base = `INV-${itemCode.replace(/[^A-Z0-9]/gi, '').toUpperCase()}`;
  return batchNo ? `${base}-${batchNo.replace(/[^A-Z0-9]/gi, '').toUpperCase()}` : base;
}

function buildAssetCode(itemCode: string, serialNo: string) {
  return `AST-${itemCode.replace(/[^A-Z0-9]/gi, '').toUpperCase()}-${serialNo}`;
}

function buildPrintHtml(
  labels: {
    code: string;
    codeType: string;
    itemName: string;
    sku: string;
    batchNo: string;
    serialNo: string;
    unit: string;
  }[],
  template: string,
) {
  const tpl = LABEL_TEMPLATES.find((t) => t.id === template) ?? LABEL_TEMPLATES[1];
  const labelCells = labels.map((l) => {
    const scanImg = l.codeType === 'QR'
      ? `<img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(l.code)}" alt="QR" style="width:80px;height:80px" />`
      : `<svg class="barcode" data-code="${l.code}"></svg>`;
    return `
      <div class="label">
        <div class="name">${l.itemName}</div>
        <div class="meta">SKU: ${l.sku}${l.batchNo ? ` · Batch: ${l.batchNo}` : ''}${l.serialNo ? ` · S/N: ${l.serialNo}` : ''}</div>
        <div class="scan">${scanImg}</div>
        <div class="code">${l.code}</div>
      </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Inventory Labels</title>
<style>
  @page { size: A4; margin: 8mm; }
  body { font-family: Arial, sans-serif; margin: 0; padding: 8mm; }
  .grid { display: grid; grid-template-columns: repeat(${tpl.cols}, 1fr); gap: 4mm; }
  .label { border: 1px dashed #ccc; padding: 3mm; text-align: center; min-height: ${tpl.heightMm}mm; page-break-inside: avoid; }
  .name { font-size: 9pt; font-weight: bold; margin-bottom: 1mm; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .meta { font-size: 7pt; color: #555; margin-bottom: 2mm; }
  .scan { margin: 2mm 0; min-height: 22mm; display: flex; align-items: center; justify-content: center; }
  .code { font-family: monospace; font-size: 8pt; letter-spacing: 1px; }
  svg.barcode { width: 90%; height: 40px; }
  @media print { .no-print { display: none; } }
</style>
<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
</head><body>
<button class="no-print" onclick="window.print()" style="margin-bottom:8px;padding:8px 16px">Print Labels</button>
<div class="grid">${labelCells}</div>
<script>
  document.querySelectorAll('svg.barcode').forEach(el => {
    try { JsBarcode(el, el.dataset.code, { format: 'CODE128', displayValue: false, height: 40, margin: 0 }); } catch(e) {}
  });
<\/script>
</body></html>`;
}

export async function lookupBarcode(
  institutionId: string,
  code: string,
  academicYear = '2025-26',
) {
  const barcode = await prisma.invBarcode.findFirst({
    where: { institutionId, code, status: 'ACTIVE' },
    include: {
      item: { include: { category: true, store: true } },
      batch: true,
    },
  });

  if (barcode) {
    return {
      found: true,
      source: 'INV_BARCODE',
      code: barcode.code,
      codeType: barcode.codeType,
      item: {
        id: barcode.item.id,
        sku: barcode.item.itemCode,
        name: barcode.item.itemName,
        unit: barcode.item.unit,
        itemType: barcode.item.itemType,
        barcode: barcode.item.barcode,
        availableQty: barcode.item.stockQty,
        unitCost: barcode.item.weightedAvgCost,
        category: barcode.item.category.categoryName,
        store: barcode.item.store.storeName,
      },
      batch: barcode.batch ? {
        id: barcode.batch.id,
        batchNo: barcode.batch.batchNo,
        expiryDate: barcode.batch.expiryDate?.toISOString().slice(0, 10) ?? null,
        remainingQty: barcode.batch.remainingQty,
      } : null,
      assetSerialNo: barcode.assetSerialNo || null,
      mobileActions: ['GRN_SCAN', 'OUTWARD_SCAN', 'STOCK_VERIFY'],
    };
  }

  const item = await prisma.invItem.findFirst({
    where: {
      institutionId,
      academicYear,
      status: 'ACTIVE',
      OR: [
        { barcode: code },
        { itemCode: { equals: code, mode: 'insensitive' } },
        { itemName: { contains: code, mode: 'insensitive' } },
      ],
    },
    include: { category: true, store: true },
  });

  if (!item) throw new Error(`No item found for code: ${code}`);

  return {
    found: true,
    source: 'ITEM_MASTER',
    code,
    codeType: isAssetItem(item.itemType) ? 'QR' : 'BARCODE',
    item: {
      id: item.id,
      sku: item.itemCode,
      name: item.itemName,
      unit: item.unit,
      itemType: item.itemType,
      barcode: item.barcode,
      availableQty: item.stockQty,
      unitCost: item.weightedAvgCost,
      category: item.category.categoryName,
      store: item.store.storeName,
    },
    batch: null,
    assetSerialNo: null,
    mobileActions: ['GRN_SCAN', 'OUTWARD_SCAN', 'STOCK_VERIFY'],
  };
}

function mapBarcodeRow(b: {
  id: string;
  code: string;
  codeType: string;
  labelTemplate: string;
  status: string;
  printCount: number;
  assetSerialNo: string;
  lastPrintedAt: Date | null;
  item: { itemCode: string; itemName: string; itemType: string; unit: string };
  batch: { batchNo: string } | null;
}) {
  return {
    id: b.id,
    code: b.code,
    codeType: b.codeType,
    codeTypeLabel: b.codeType === 'QR' ? 'QR Code' : 'Barcode',
    sku: b.item.itemCode,
    itemName: b.item.itemName,
    itemType: b.item.itemType,
    batchNo: b.batch?.batchNo ?? '—',
    serialNo: b.assetSerialNo || '—',
    labelTemplate: b.labelTemplate,
    status: b.status,
    printCount: b.printCount,
    lastPrinted: b.lastPrintedAt ? b.lastPrintedAt.toLocaleDateString('en-IN') : '—',
  };
}

export async function getBarcodeManagement(
  institutionId: string,
  academicYear = '2025-26',
  filters: { codeType?: string; q?: string } = {},
) {
  const where: Prisma.InvBarcodeWhereInput = { institutionId, academicYear };
  if (filters.codeType && filters.codeType !== 'ALL') where.codeType = filters.codeType;
  if (filters.q) {
    where.OR = [
      { code: { contains: filters.q, mode: 'insensitive' } },
      { assetSerialNo: { contains: filters.q, mode: 'insensitive' } },
      { item: { itemName: { contains: filters.q, mode: 'insensitive' } } },
      { item: { itemCode: { contains: filters.q, mode: 'insensitive' } } },
    ];
  }

  const [barcodes, items, batches, typeCounts] = await Promise.all([
    prisma.invBarcode.findMany({
      where,
      include: { item: true, batch: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
    prisma.invItem.findMany({
      where: { institutionId, academicYear, status: 'ACTIVE' },
      select: {
        id: true, itemCode: true, itemName: true, itemType: true, unit: true,
        barcode: true, stockQty: true, storeId: true,
      },
      orderBy: { itemName: 'asc' },
      take: 500,
    }),
    prisma.invBatch.findMany({
      where: { institutionId, academicYear, status: 'ACTIVE', remainingQty: { gt: 0 } },
      include: { item: { select: { itemCode: true, itemName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.invBarcode.groupBy({
      by: ['codeType'],
      where: { institutionId, academicYear },
      _count: { _all: true },
    }),
  ]);

  await logActivity(institutionId, 'VIEW_BARCODES', 'Barcode/QR management accessed', { academicYear });

  return {
    academicYear,
    academicYears: ACADEMIC_YEARS,
    barcodes: barcodes.map(mapBarcodeRow),
    items: items.map((i) => ({
      id: i.id,
      storeId: i.storeId,
      code: i.itemCode,
      name: i.itemName,
      itemType: i.itemType,
      unit: i.unit,
      stockQty: i.stockQty,
      hasBarcode: Boolean(i.barcode),
      labelType: isAssetItem(i.itemType) ? 'QR' : 'BARCODE',
    })),
    batches: batches.map((b) => ({
      id: b.id,
      itemId: b.itemId,
      batchNo: b.batchNo,
      itemCode: b.item.itemCode,
      itemName: b.item.itemName,
      remainingQty: b.remainingQty,
    })),
    labelTemplates: LABEL_TEMPLATES.map((t) => ({ id: t.id, label: t.label, cols: t.cols, rows: t.rows })),
    kpis: {
      totalBarcodes: barcodes.length,
      barcodeCount: typeCounts.find((t) => t.codeType === 'BARCODE')?._count._all ?? 0,
      qrCount: typeCounts.find((t) => t.codeType === 'QR')?._count._all ?? 0,
      printedLabels: barcodes.reduce((s, b) => s + b.printCount, 0),
    },
    automationRules: [
      'Fixed assets (ASSET): unique QR code per serial number',
      'Consumables: standard barcode per SKU (batch variant when batch selected)',
    ],
    mobileSync: [
      'Staff/Admin App: in-app barcode scanner using device camera',
      'Fetch item details for GRN, Outward, and Stock Verification',
    ],
    erpIntegration: ['Maps unique code string to Item_ID and Batch_ID or Asset serial'],
  };
}

export async function generateBarcodes(
  institutionId: string,
  body: {
    items: { itemId: string; batchId?: string; quantity: number; serialPrefix?: string }[];
    labelTemplate?: string;
    academicYear?: string;
    generatedBy?: string;
  },
) {
  if (!body.items?.length) throw new Error('Select at least one item');

  const academicYear = body.academicYear ?? '2025-26';
  const labelTemplate = body.labelTemplate ?? '2x4';
  const generatedBy = body.generatedBy ?? 'Inventory Manager';
  const created: { id: string; code: string; codeType: string }[] = [];

  for (const row of body.items) {
    const item = await prisma.invItem.findFirst({
      where: { id: row.itemId, institutionId, status: 'ACTIVE' },
    });
    if (!item) throw new Error('Item not found');

    let batch: { id: string; batchNo: string } | null = null;
    if (row.batchId) {
      batch = await prisma.invBatch.findFirst({
        where: { id: row.batchId, institutionId, itemId: item.id },
      });
      if (!batch) throw new Error('Batch not found for item');
    }

    const qty = Math.max(1, Math.min(100, row.quantity || 1));

    if (isAssetItem(item.itemType)) {
      for (let i = 0; i < qty; i += 1) {
        const serialNo = `${row.serialPrefix ?? 'SN'}-${String(Date.now()).slice(-6)}-${i + 1}`;
        const code = buildAssetCode(item.itemCode, serialNo);
        const existing = await prisma.invBarcode.findFirst({ where: { institutionId, code } });
        if (existing) continue;

        const rec = await prisma.invBarcode.create({
          data: {
            institutionId,
            code,
            codeType: 'QR',
            itemId: item.id,
            assetSerialNo: serialNo,
            labelTemplate,
            generatedBy,
            academicYear,
          },
        });
        created.push({ id: rec.id, code: rec.code, codeType: rec.codeType });

        if (!item.barcode) {
          await prisma.invItem.update({ where: { id: item.id }, data: { barcode: code } });
        }
      }
    } else {
      const code = buildConsumableCode(item.itemCode, batch?.batchNo);
      let rec = await prisma.invBarcode.findFirst({
        where: { institutionId, code, itemId: item.id, batchId: batch?.id ?? null },
      });

      if (!rec) {
        rec = await prisma.invBarcode.create({
          data: {
            institutionId,
            code,
            codeType: 'BARCODE',
            itemId: item.id,
            batchId: batch?.id ?? null,
            labelTemplate,
            generatedBy,
            academicYear,
          },
        });
        created.push({ id: rec.id, code: rec.code, codeType: rec.codeType });
      } else {
        created.push({ id: rec.id, code: rec.code, codeType: rec.codeType });
      }

      await prisma.invItem.update({
        where: { id: item.id },
        data: { barcode: code },
      });
    }
  }

  await logActivity(institutionId, 'BARCODES_GENERATED', `Generated ${created.length} label code(s)`, {
    count: created.length,
    template: labelTemplate,
  }, generatedBy);

  return {
    success: true,
    count: created.length,
    codes: created,
    message: `Generated ${created.length} scannable code(s)`,
  };
}

export async function generateLabelPdf(
  institutionId: string,
  body: {
    barcodeIds?: string[];
    items?: { itemId: string; batchId?: string; quantity: number }[];
    labelTemplate?: string;
    academicYear?: string;
  },
) {
  const labelTemplate = body.labelTemplate ?? '2x4';
  const academicYear = body.academicYear ?? '2025-26';

  type BarcodeRec = Prisma.InvBarcodeGetPayload<{ include: { item: true; batch: true } }>;
  let barcodeRecords: BarcodeRec[] = [];

  if (body.barcodeIds?.length) {
    barcodeRecords = await prisma.invBarcode.findMany({
      where: { institutionId, id: { in: body.barcodeIds }, status: { in: ['ACTIVE', 'PRINTED'] } },
      include: { item: true, batch: true },
    });
  } else if (body.items?.length) {
    const gen = await generateBarcodes(institutionId, {
      items: body.items,
      labelTemplate,
      academicYear,
    });
    barcodeRecords = await prisma.invBarcode.findMany({
      where: { institutionId, id: { in: gen.codes.map((c) => c.id) } },
      include: { item: true, batch: true },
    });
  } else {
    throw new Error('Select barcodes or items to print');
  }

  const toLabel = (b: (typeof barcodeRecords)[0]) => ({
    code: b.code,
    codeType: b.codeType,
    itemName: b.item.itemName,
    sku: b.item.itemCode,
    batchNo: b.batch?.batchNo ?? '',
    serialNo: b.assetSerialNo,
    unit: b.item.unit,
  });

  const printLabels: ReturnType<typeof toLabel>[] = [];

  if (body.items?.length) {
    for (const row of body.items) {
      const rec = barcodeRecords.find((b) => b.itemId === row.itemId
        && (row.batchId ? b.batchId === row.batchId : true));
      if (!rec) continue;
      const copies = Math.max(1, row.quantity || 1);
      for (let i = 0; i < copies; i += 1) printLabels.push(toLabel(rec));
    }
  } else {
    for (const b of barcodeRecords) printLabels.push(toLabel(b));
  }

  if (!printLabels.length) throw new Error('No labels to print');

  const now = new Date();
  await prisma.invBarcode.updateMany({
    where: { id: { in: barcodeRecords.map((b) => b.id) } },
    data: { printCount: { increment: 1 }, lastPrintedAt: now, status: 'PRINTED' },
  });

  const fileName = `inventory_labels_${labelTemplate}_${Date.now()}.html`;
  const printHtml = buildPrintHtml(printLabels, labelTemplate);

  await logActivity(institutionId, 'LABELS_PRINTED', `Print job — ${printLabels.length} labels`, {
    template: labelTemplate,
    count: printLabels.length,
  });

  return {
    success: true,
    format: 'PDF',
    fileName,
    labelCount: printLabels.length,
    template: labelTemplate,
    printHtml,
    labels: printLabels,
    message: `${printLabels.length} label(s) ready for thermal printer`,
  };
}

export async function deleteBarcode(institutionId: string, barcodeId: string) {
  const rec = await prisma.invBarcode.findFirst({ where: { id: barcodeId, institutionId } });
  if (!rec) throw new Error('Barcode not found');

  await prisma.invBarcode.update({
    where: { id: barcodeId },
    data: { status: 'INACTIVE' },
  });

  return { success: true, message: 'Barcode deactivated' };
}

export async function seedBarcodeManagement(institutionId: string) {
  await seedStockAdjustmentManagement(institutionId);
  const academicYear = '2025-26';

  const items = await prisma.invItem.findMany({
    where: { institutionId, academicYear, status: 'ACTIVE' },
    take: 20,
  });

  const existing = await prisma.invBarcode.count({ where: { institutionId } });
  if (existing === 0 && items.length) {
    const consumables = items.filter((i) => i.itemType === 'CONSUMABLE').slice(0, 8);
    const assets = items.filter((i) => i.itemType === 'ASSET').slice(0, 3);

    if (consumables.length) {
      await generateBarcodes(institutionId, {
        academicYear,
        labelTemplate: '2x4',
        items: consumables.map((i) => ({ itemId: i.id, quantity: 1 })),
      });
    }

    for (const asset of assets) {
      await generateBarcodes(institutionId, {
        academicYear,
        labelTemplate: '1x2',
        items: [{ itemId: asset.id, quantity: 2, serialPrefix: 'PRJ' }],
      });
    }

    if (!assets.length && consumables.length >= 2) {
      await prisma.invItem.update({
        where: { id: consumables[0].id },
        data: { itemType: 'ASSET', itemName: `${consumables[0].itemName} (Asset)` },
      });
      await generateBarcodes(institutionId, {
        academicYear,
        labelTemplate: '1x2',
        items: [{ itemId: consumables[0].id, quantity: 2, serialPrefix: 'AST' }],
      });
    }
  }

  return getBarcodeManagement(institutionId, academicYear);
}
