import { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { lookupBarcode, seedBarcodeManagement } from './inventoryBarcodes.js';
import {
  approveStockAdjustment,
  createStockAdjustment,
  submitStockAdjustment,
} from './inventoryStockAdjustment.js';

const ACADEMIC_YEARS = ['2023-24', '2024-25', '2025-26', '2026-27'];
const SESSION_TYPES = ['CYCLIC', 'ANNUAL', 'SPOT'] as const;
const COUNTABLE_STATUSES = ['FROZEN', 'IN_PROGRESS'];

function formatInr(n: number) {
  return `₹ ${Math.round(n).toLocaleString('en-IN')}`;
}

function formatDate(d: Date) {
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(d: Date) {
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
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

async function nextSessionCode(institutionId: string) {
  const count = await prisma.invAuditSession.count({ where: { institutionId } });
  const year = new Date().getFullYear();
  return `AUD-${year}-${String(count + 1).padStart(4, '0')}`;
}

function calcVariance(systemQty: number, physicalQty: number, unitCost: number) {
  const variance = round2(physicalQty - systemQty);
  const varianceValue = round2(variance * unitCost);
  return { variance, varianceValue };
}

async function refreshSessionStats(institutionId: string, sessionId: string) {
  const counts = await prisma.invAuditCount.findMany({ where: { institutionId, sessionId } });
  const itemsCounted = counts.filter((c) => c.status === 'COUNTED' || c.physicalQty > 0).length;
  const varianceCounts = counts.filter((c) => c.variance !== 0);
  const totalVarianceQty = round2(varianceCounts.reduce((s, c) => s + Math.abs(c.variance), 0));
  const totalVarianceValue = round2(varianceCounts.reduce((s, c) => s + Math.abs(c.varianceValue), 0));

  await prisma.invAuditSession.update({
    where: { id: sessionId },
    data: {
      totalItems: counts.length,
      itemsCounted,
      varianceLines: varianceCounts.length,
      totalVarianceQty,
      totalVarianceValue,
    },
  });
}

function mapCountRow(c: {
  id: string;
  itemId: string;
  systemQty: number;
  physicalQty: number;
  variance: number;
  unitCost: number;
  varianceValue: number;
  scanMethod: string;
  scannedBy: string;
  scannedAt: Date | null;
  status: string;
  item: { itemCode: string; itemName: string; unit: string; barcode: string };
}) {
  return {
    id: c.id,
    itemId: c.itemId,
    sku: c.item.itemCode,
    itemName: c.item.itemName,
    unit: c.item.unit,
    barcode: c.item.barcode,
    systemQty: c.systemQty,
    physicalQty: c.physicalQty,
    variance: c.variance,
    unitCost: c.unitCost,
    varianceValue: c.varianceValue,
    varianceValueFormatted: formatInr(Math.abs(c.varianceValue)),
    scanMethod: c.scanMethod,
    scannedBy: c.scannedBy,
    scannedAt: c.scannedAt?.toISOString() ?? null,
    status: c.status,
    matched: c.variance === 0 && c.physicalQty > 0,
  };
}

function mapVarianceRow(v: {
  id: string;
  systemQty: number;
  physicalQty: number;
  variance: number;
  unitCost: number;
  varianceValue: number;
  status: string;
  approvedBy: string;
  approvedAt: Date | null;
  notes: string;
  item: { itemCode: string; itemName: string; unit: string };
}) {
  return {
    id: v.id,
    sku: v.item.itemCode,
    itemName: v.item.itemName,
    unit: v.item.unit,
    systemQty: v.systemQty,
    physicalQty: v.physicalQty,
    variance: v.variance,
    varianceLabel: v.variance > 0 ? `+${v.variance}` : String(v.variance),
    unitCost: v.unitCost,
    varianceValue: v.varianceValue,
    varianceValueFormatted: formatInr(Math.abs(v.varianceValue)),
    status: v.status,
    approvedBy: v.approvedBy,
    approvedAt: v.approvedAt?.toISOString() ?? null,
    notes: v.notes,
  };
}

function mapSessionRow(s: {
  id: string;
  sessionCode: string;
  sessionType: string;
  status: string;
  storeFrozen: boolean;
  frozenAt: Date | null;
  frozenBy: string;
  initiatedBy: string;
  startedAt: Date;
  completedAt: Date | null;
  academicYear: string;
  totalItems: number;
  itemsCounted: number;
  varianceLines: number;
  totalVarianceQty: number;
  totalVarianceValue: number;
  adjustmentId: string | null;
  notes: string;
  store: { storeName: string };
}) {
  const progress = s.totalItems > 0 ? Math.round((s.itemsCounted / s.totalItems) * 100) : 0;
  return {
    id: s.id,
    sessionCode: s.sessionCode,
    sessionType: s.sessionType,
    sessionTypeLabel: s.sessionType.charAt(0) + s.sessionType.slice(1).toLowerCase(),
    status: s.status,
    statusLabel: s.status.replace(/_/g, ' '),
    storeFrozen: s.storeFrozen,
    frozenAt: s.frozenAt?.toISOString() ?? null,
    frozenBy: s.frozenBy,
    initiatedBy: s.initiatedBy,
    startedAt: formatDate(s.startedAt),
    startedAtIso: s.startedAt.toISOString(),
    completedAt: s.completedAt?.toISOString() ?? null,
    academicYear: s.academicYear,
    storeName: s.store.storeName,
    totalItems: s.totalItems,
    itemsCounted: s.itemsCounted,
    varianceLines: s.varianceLines,
    totalVarianceQty: s.totalVarianceQty,
    totalVarianceValue: s.totalVarianceValue,
    totalVarianceValueFormatted: formatInr(s.totalVarianceValue),
    adjustmentId: s.adjustmentId,
    notes: s.notes,
    progress,
  };
}

async function loadSessionDetail(institutionId: string, sessionId: string) {
  const session = await prisma.invAuditSession.findFirst({
    where: { institutionId, id: sessionId },
    include: {
      store: true,
      counts: { include: { item: true }, orderBy: { item: { itemName: 'asc' } } },
      variances: { include: { item: true }, orderBy: { item: { itemName: 'asc' } } },
    },
  });
  if (!session) return null;

  const counts = session.counts.map(mapCountRow);
  const variances = session.variances.map(mapVarianceRow);
  const pendingVariances = variances.filter((v) => v.status === 'PENDING').length;
  const approvedVariances = variances.filter((v) => v.status === 'APPROVED').length;

  return {
    ...mapSessionRow(session),
    counts,
    variances,
    matchedCount: counts.filter((c) => c.matched).length,
    pendingVariances,
    approvedVariances,
    canFreeze: session.status === 'DRAFT',
    canCount: COUNTABLE_STATUSES.includes(session.status),
    canGenerateVariance: ['FROZEN', 'IN_PROGRESS'].includes(session.status),
    canApproveVariances: session.status === 'VARIANCE_REVIEW' && pendingVariances > 0,
    canCreateAdjustments: session.status === 'VARIANCE_REVIEW' && approvedVariances > 0 && !session.adjustmentId,
    canComplete: session.status === 'VARIANCE_REVIEW' && pendingVariances === 0 && (approvedVariances === 0 || !!session.adjustmentId),
    canCancel: !['COMPLETED', 'CANCELLED'].includes(session.status),
  };
}

export async function getStockVerificationManagement(
  institutionId: string,
  academicYear = '2025-26',
  opts: { sessionId?: string; storeId?: string } = {},
) {
  const stores = await prisma.invStore.findMany({
    where: { institutionId, academicYear, status: 'ACTIVE' },
    orderBy: { storeName: 'asc' },
    select: { id: true, storeCode: true, storeName: true },
  });

  const sessions = await prisma.invAuditSession.findMany({
    where: {
      institutionId,
      academicYear,
      ...(opts.storeId ? { storeId: opts.storeId } : {}),
    },
    include: { store: true },
    orderBy: { startedAt: 'desc' },
    take: 50,
  });

  const activeSession = sessions.find((s) => !['COMPLETED', 'CANCELLED'].includes(s.status)) ?? null;
  const focusId = opts.sessionId ?? activeSession?.id;
  const focusSession = focusId ? await loadSessionDetail(institutionId, focusId) : null;

  const frozenStores = await prisma.invAuditSession.findMany({
    where: {
      institutionId,
      storeFrozen: true,
      status: { in: COUNTABLE_STATUSES.concat(['VARIANCE_REVIEW']) },
    },
    select: { storeId: true, sessionCode: true },
  });

  return {
    academicYears: ACADEMIC_YEARS,
    sessionTypes: SESSION_TYPES.map((t) => ({ id: t, label: t.charAt(0) + t.slice(1).toLowerCase() })),
    stores,
    sessions: sessions.map(mapSessionRow),
    activeSession: activeSession ? mapSessionRow(activeSession) : null,
    focusSession,
    frozenStores: frozenStores.map((f) => ({ storeId: f.storeId, sessionCode: f.sessionCode })),
    workflow: [
      'Initiate Audit Session',
      'Freeze Store Operations',
      'Staff scans physical items (Mobile / Barcode)',
      'Generate Variance Report',
      'Approve Variances',
      'Auto-create Stock Adjustments',
      'Complete Session',
    ],
    scanMethods: ['BARCODE', 'MOBILE', 'MANUAL'],
    roles: ['Store Keeper', 'Inventory Manager', 'Auditor'],
    reports: ['Variance Summary', 'Unscanned Items', 'High-Value Variances'],
  };
}

export async function createAuditSession(
  institutionId: string,
  body: {
    storeId: string;
    sessionType?: string;
    academicYear?: string;
    initiatedBy?: string;
    notes?: string;
  },
) {
  if (!body.storeId) throw new Error('Store is required');

  const store = await prisma.invStore.findFirst({
    where: { id: body.storeId, institutionId, status: 'ACTIVE' },
  });
  if (!store) throw new Error('Store not found');

  const existing = await prisma.invAuditSession.findFirst({
    where: {
      institutionId,
      storeId: body.storeId,
      status: { notIn: ['COMPLETED', 'CANCELLED'] },
    },
  });
  if (existing) {
    throw new Error(`An active audit session (${existing.sessionCode}) already exists for this store`);
  }

  const academicYear = body.academicYear ?? store.academicYear ?? '2025-26';
  const sessionType = SESSION_TYPES.includes(body.sessionType as typeof SESSION_TYPES[number])
    ? body.sessionType!
    : 'CYCLIC';

  const items = await prisma.invItem.findMany({
    where: { institutionId, storeId: body.storeId, status: 'ACTIVE', academicYear },
    orderBy: { itemName: 'asc' },
  });

  const sessionCode = await nextSessionCode(institutionId);
  const session = await prisma.invAuditSession.create({
    data: {
      institutionId,
      storeId: body.storeId,
      sessionCode,
      sessionType,
      status: 'DRAFT',
      initiatedBy: body.initiatedBy ?? 'Store Keeper',
      academicYear,
      totalItems: items.length,
      notes: body.notes ?? '',
      counts: {
        create: items.map((item) => ({
          institutionId,
          itemId: item.id,
          systemQty: item.stockQty,
          physicalQty: 0,
          variance: round2(0 - item.stockQty),
          unitCost: item.weightedAvgCost,
          varianceValue: round2((0 - item.stockQty) * item.weightedAvgCost),
          status: 'PENDING',
        })),
      },
    },
  });

  await logActivity(
    institutionId,
    'AUDIT_SESSION_CREATED',
    `Audit session ${sessionCode} created for ${store.storeName} (${items.length} items)`,
    { sessionId: session.id, sessionType },
    body.initiatedBy,
  );

  const data = await getStockVerificationManagement(institutionId, academicYear, { sessionId: session.id });
  return { success: true, sessionId: session.id, sessionCode, message: `Audit session ${sessionCode} created`, data };
}

export async function freezeAuditSession(
  institutionId: string,
  sessionId: string,
  frozenBy = 'Inventory Manager',
) {
  const session = await prisma.invAuditSession.findFirst({
    where: { id: sessionId, institutionId },
    include: { store: true, counts: { include: { item: true } } },
  });
  if (!session) throw new Error('Audit session not found');
  if (session.status !== 'DRAFT') throw new Error('Only draft sessions can be frozen');

  const items = await prisma.invItem.findMany({
    where: { institutionId, storeId: session.storeId, status: 'ACTIVE', academicYear: session.academicYear },
  });
  const itemMap = new Map(items.map((i) => [i.id, i]));
  const existingItemIds = new Set(session.counts.map((c) => c.itemId));

  for (const count of session.counts) {
    const item = itemMap.get(count.itemId);
    const systemQty = item?.stockQty ?? count.systemQty;
    const unitCost = item?.weightedAvgCost ?? count.unitCost;
    const { variance, varianceValue } = calcVariance(systemQty, count.physicalQty, unitCost);
    await prisma.invAuditCount.update({
      where: { id: count.id },
      data: { systemQty, unitCost, variance, varianceValue },
    });
  }

  for (const item of items) {
    if (!existingItemIds.has(item.id)) {
      const { variance, varianceValue } = calcVariance(item.stockQty, 0, item.weightedAvgCost);
      await prisma.invAuditCount.create({
        data: {
          institutionId,
          sessionId,
          itemId: item.id,
          systemQty: item.stockQty,
          physicalQty: 0,
          variance,
          unitCost: item.weightedAvgCost,
          varianceValue,
          status: 'PENDING',
        },
      });
    }
  }

  await prisma.invAuditSession.update({
    where: { id: sessionId },
    data: {
      status: 'FROZEN',
      storeFrozen: true,
      frozenAt: new Date(),
      frozenBy,
    },
  });

  await refreshSessionStats(institutionId, sessionId);
  await logActivity(
    institutionId,
    'AUDIT_STORE_FROZEN',
    `Store ${session.store.storeName} frozen for audit ${session.sessionCode}`,
    { sessionId },
    frozenBy,
  );

  const data = await getStockVerificationManagement(institutionId, session.academicYear, { sessionId });
  return {
    success: true,
    message: `Store frozen — GRN, outward, transfer & manual adjustments blocked until audit completes`,
    data,
  };
}

async function updateCountPhysical(
  institutionId: string,
  sessionId: string,
  itemId: string,
  physicalQty: number,
  scanMethod: string,
  scannedBy: string,
) {
  const session = await prisma.invAuditSession.findFirst({ where: { id: sessionId, institutionId } });
  if (!session) throw new Error('Audit session not found');
  if (!COUNTABLE_STATUSES.includes(session.status)) {
    throw new Error('Session must be frozen before recording counts');
  }

  const count = await prisma.invAuditCount.findFirst({
    where: { sessionId, itemId },
    include: { item: true },
  });
  if (!count) throw new Error('Item is not in this audit scope');

  const { variance, varianceValue } = calcVariance(count.systemQty, physicalQty, count.unitCost);
  const updated = await prisma.invAuditCount.update({
    where: { id: count.id },
    data: {
      physicalQty: round2(physicalQty),
      variance,
      varianceValue,
      scanMethod,
      scannedBy,
      scannedAt: new Date(),
      status: 'COUNTED',
    },
    include: { item: true },
  });

  if (session.status === 'FROZEN') {
    await prisma.invAuditSession.update({
      where: { id: sessionId },
      data: { status: 'IN_PROGRESS' },
    });
  }

  await refreshSessionStats(institutionId, sessionId);
  return mapCountRow(updated);
}

export async function recordAuditCount(
  institutionId: string,
  sessionId: string,
  body: { itemId: string; physicalQty: number; scannedBy?: string; scanMethod?: string },
) {
  if (!body.itemId) throw new Error('Item is required');
  if (body.physicalQty == null || body.physicalQty < 0) throw new Error('Physical quantity must be zero or positive');

  const count = await updateCountPhysical(
    institutionId,
    sessionId,
    body.itemId,
    body.physicalQty,
    body.scanMethod ?? 'MANUAL',
    body.scannedBy ?? 'Auditor',
  );

  const session = await prisma.invAuditSession.findFirst({ where: { id: sessionId, institutionId } });
  const data = await getStockVerificationManagement(institutionId, session!.academicYear, { sessionId });
  return { success: true, count, message: `Physical count recorded for ${count.itemName}`, data };
}

export async function scanAuditItem(
  institutionId: string,
  sessionId: string,
  body: { code: string; scannedBy?: string; scanMethod?: string; quantity?: number },
) {
  if (!body.code?.trim()) throw new Error('Scan code is required');

  const session = await prisma.invAuditSession.findFirst({ where: { id: sessionId, institutionId } });
  if (!session) throw new Error('Audit session not found');
  if (!COUNTABLE_STATUSES.includes(session.status)) {
    throw new Error('Session must be frozen before scanning');
  }

  const lookup = await lookupBarcode(institutionId, body.code.trim(), session.academicYear);
  if (!lookup.found || !lookup.item) throw new Error(`No item found for code: ${body.code}`);

  const item = await prisma.invItem.findFirst({
    where: { id: lookup.item.id, institutionId },
    select: { storeId: true, itemName: true, store: { select: { storeName: true } } },
  });
  if (!item || item.storeId !== session.storeId) {
    throw new Error(`Item belongs to ${item?.store.storeName ?? 'another store'}, not this audit store`);
  }

  const count = await prisma.invAuditCount.findFirst({ where: { sessionId, itemId: lookup.item.id } });
  if (!count) throw new Error('Item is not in this audit scope');

  const increment = body.quantity ?? 1;
  const newPhysical = round2(count.physicalQty + increment);
  const scanMethod = body.scanMethod ?? 'BARCODE';
  const updated = await updateCountPhysical(
    institutionId,
    sessionId,
    lookup.item.id,
    newPhysical,
    scanMethod,
    body.scannedBy ?? 'Auditor',
  );

  const data = await getStockVerificationManagement(institutionId, session.academicYear, { sessionId });
  return {
    success: true,
    count: updated,
    item: lookup.item,
    message: `Scanned ${item.itemName}: physical qty now ${newPhysical}`,
    data,
  };
}

export async function generateVarianceReport(institutionId: string, sessionId: string) {
  const session = await prisma.invAuditSession.findFirst({
    where: { id: sessionId, institutionId },
    include: { counts: true },
  });
  if (!session) throw new Error('Audit session not found');
  if (!['FROZEN', 'IN_PROGRESS'].includes(session.status)) {
    throw new Error('Variance report can only be generated during counting phase');
  }

  await prisma.invAuditVariance.deleteMany({ where: { sessionId, institutionId } });

  const varianceCounts = session.counts.filter((c) => c.variance !== 0);
  if (varianceCounts.length) {
    await prisma.invAuditVariance.createMany({
      data: varianceCounts.map((c) => ({
        institutionId,
        sessionId,
        countId: c.id,
        itemId: c.itemId,
        systemQty: c.systemQty,
        physicalQty: c.physicalQty,
        variance: c.variance,
        unitCost: c.unitCost,
        varianceValue: c.varianceValue,
        status: 'PENDING',
      })),
    });
  }

  await prisma.invAuditSession.update({
    where: { id: sessionId },
    data: { status: 'VARIANCE_REVIEW' },
  });
  await refreshSessionStats(institutionId, sessionId);

  await logActivity(
    institutionId,
    'AUDIT_VARIANCE_GENERATED',
    `${varianceCounts.length} variance line(s) for ${session.sessionCode}`,
    { sessionId, varianceLines: varianceCounts.length },
  );

  const data = await getStockVerificationManagement(institutionId, session.academicYear, { sessionId });
  return {
    success: true,
    varianceLines: varianceCounts.length,
    message: varianceCounts.length
      ? `Variance report generated — ${varianceCounts.length} discrepancy line(s)`
      : 'No variances — all counts match system ledger',
    data,
  };
}

export async function approveAuditVariances(
  institutionId: string,
  sessionId: string,
  body: { varianceIds?: string[]; approvedBy?: string; notes?: string },
) {
  const session = await prisma.invAuditSession.findFirst({ where: { id: sessionId, institutionId } });
  if (!session) throw new Error('Audit session not found');
  if (session.status !== 'VARIANCE_REVIEW') throw new Error('Session is not in variance review');

  const where: Prisma.InvAuditVarianceWhereInput = {
    institutionId,
    sessionId,
    status: 'PENDING',
    ...(body.varianceIds?.length ? { id: { in: body.varianceIds } } : {}),
  };

  const pending = await prisma.invAuditVariance.findMany({ where });
  if (!pending.length) throw new Error('No pending variances to approve');

  const approvedBy = body.approvedBy ?? 'Inventory Manager';
  await prisma.invAuditVariance.updateMany({
    where: { id: { in: pending.map((v) => v.id) } },
    data: { status: 'APPROVED', approvedBy, approvedAt: new Date(), notes: body.notes ?? '' },
  });

  await logActivity(
    institutionId,
    'AUDIT_VARIANCES_APPROVED',
    `${pending.length} variance(s) approved for ${session.sessionCode}`,
    { sessionId, count: pending.length },
    approvedBy,
  );

  const data = await getStockVerificationManagement(institutionId, session.academicYear, { sessionId });
  return { success: true, approved: pending.length, message: `${pending.length} variance(s) approved`, data };
}

export async function createAdjustmentsFromAudit(
  institutionId: string,
  sessionId: string,
  performedBy = 'Inventory Manager',
) {
  const session = await prisma.invAuditSession.findFirst({
    where: { id: sessionId, institutionId },
    include: { store: true },
  });
  if (!session) throw new Error('Audit session not found');
  if (session.status !== 'VARIANCE_REVIEW') throw new Error('Session is not in variance review');
  if (session.adjustmentId) throw new Error('Stock adjustment already created for this session');

  const approved = await prisma.invAuditVariance.findMany({
    where: { institutionId, sessionId, status: 'APPROVED', variance: { not: 0 } },
    include: { item: true },
  });
  if (!approved.length) throw new Error('No approved variances to adjust');

  const lines = approved.map((v) => ({
    itemId: v.itemId,
    direction: (v.variance > 0 ? 'ADD' : 'DEDUCT') as 'ADD' | 'DEDUCT',
    quantity: Math.abs(v.variance),
    unitCost: v.unitCost,
    reasonCode: 'AUDIT_VARIANCE',
    remarks: `Audit ${session.sessionCode} — system ${v.systemQty}, physical ${v.physicalQty}`,
  }));

  const created = await createStockAdjustment(institutionId, {
    storeId: session.storeId,
    reasonCode: 'AUDIT_VARIANCE',
    reason: `Physical inventory audit ${session.sessionCode}`,
    remarks: `Auto-generated from stock verification session ${session.sessionCode}`,
    academicYear: session.academicYear,
    createdBy: performedBy,
    lines,
  });

  await submitStockAdjustment(institutionId, created.adjustmentId, performedBy);
  await approveStockAdjustment(institutionId, created.adjustmentId, performedBy);

  await prisma.invAuditSession.update({
    where: { id: sessionId },
    data: { adjustmentId: created.adjustmentId },
  });

  await logActivity(
    institutionId,
    'AUDIT_ADJUSTMENT_CREATED',
    `Adjustment ${created.adjustmentNumber} auto-created from ${session.sessionCode}`,
    { sessionId, adjustmentId: created.adjustmentId },
    performedBy,
  );

  const data = await getStockVerificationManagement(institutionId, session.academicYear, { sessionId });
  return {
    success: true,
    adjustmentId: created.adjustmentId,
    adjustmentNumber: created.adjustmentNumber,
    message: `Stock adjustment ${created.adjustmentNumber} created and approved`,
    data,
  };
}

export async function completeAuditSession(
  institutionId: string,
  sessionId: string,
  performedBy = 'Inventory Manager',
) {
  const session = await prisma.invAuditSession.findFirst({
    where: { id: sessionId, institutionId },
    include: { variances: true },
  });
  if (!session) throw new Error('Audit session not found');
  if (session.status !== 'VARIANCE_REVIEW') throw new Error('Session must be in variance review to complete');

  const pending = session.variances.filter((v) => v.status === 'PENDING').length;
  if (pending > 0) throw new Error(`${pending} variance(s) still pending approval`);

  const approved = session.variances.filter((v) => v.status === 'APPROVED' && v.variance !== 0).length;
  if (approved > 0 && !session.adjustmentId) {
    throw new Error('Create stock adjustments before completing the session');
  }

  await prisma.invAuditSession.update({
    where: { id: sessionId },
    data: {
      status: 'COMPLETED',
      storeFrozen: false,
      completedAt: new Date(),
    },
  });

  await logActivity(
    institutionId,
    'AUDIT_SESSION_COMPLETED',
    `Audit session ${session.sessionCode} completed`,
    { sessionId },
    performedBy,
  );

  const data = await getStockVerificationManagement(institutionId, session.academicYear, { sessionId });
  return { success: true, message: `Audit session ${session.sessionCode} completed — store operations resumed`, data };
}

export async function cancelAuditSession(
  institutionId: string,
  sessionId: string,
  performedBy = 'Inventory Manager',
) {
  const session = await prisma.invAuditSession.findFirst({ where: { id: sessionId, institutionId } });
  if (!session) throw new Error('Audit session not found');
  if (['COMPLETED', 'CANCELLED'].includes(session.status)) {
    throw new Error('Session is already closed');
  }

  await prisma.invAuditSession.update({
    where: { id: sessionId },
    data: { status: 'CANCELLED', storeFrozen: false, completedAt: new Date() },
  });

  await logActivity(
    institutionId,
    'AUDIT_SESSION_CANCELLED',
    `Audit session ${session.sessionCode} cancelled`,
    { sessionId },
    performedBy,
  );

  const data = await getStockVerificationManagement(institutionId, session.academicYear);
  return { success: true, message: `Audit session ${session.sessionCode} cancelled`, data };
}

export async function seedStockVerification(institutionId: string) {
  await seedBarcodeManagement(institutionId);

  const store = await prisma.invStore.findFirst({
    where: { institutionId, status: 'ACTIVE' },
    orderBy: { createdAt: 'asc' },
  });
  if (!store) return { seeded: false, message: 'No store found' };

  const existing = await prisma.invAuditSession.findFirst({
    where: { institutionId, sessionCode: { startsWith: 'AUD-' } },
  });
  if (existing) return { seeded: true, message: 'Stock verification data already exists' };

  const created = await createAuditSession(institutionId, {
    storeId: store.id,
    sessionType: 'CYCLIC',
    academicYear: store.academicYear,
    initiatedBy: 'Inventory Manager',
    notes: 'Sample cyclic audit — freeze store then scan items',
  });

  return { seeded: true, sessionId: created.sessionId, message: created.message };
}
