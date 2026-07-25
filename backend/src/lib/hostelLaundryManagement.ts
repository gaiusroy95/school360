import { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { seedHostelStudents } from './hostelStudents.js';

const ACADEMIC_YEARS = ['2023-24', '2024-25', '2025-26', '2026-27'];
const DEFAULT_MONTHLY_ITEMS = 30;
const DEFAULT_MONTHLY_WEIGHT_KG = 15;
const DISPATCHABLE_STATUSES = ['TOKEN_ISSUED'];
const ACTIVE_STATUSES = ['TOKEN_ISSUED', 'DISPATCHED_TO_VENDOR', 'RECEIVED_FROM_VENDOR', 'READY_FOR_PICKUP'];

function formatDateTime(d: Date) {
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatDate(d: Date) {
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function monthLabel(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function generateTokenNumber(seq: number) {
  return `LND-${Date.now().toString(36).toUpperCase().slice(-4)}-${String(seq).padStart(3, '0')}`;
}

function generateQrToken() {
  return `HLND-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    TOKEN_ISSUED: 'Token Issued',
    DISPATCHED_TO_VENDOR: 'With Vendor',
    RECEIVED_FROM_VENDOR: 'Received',
    READY_FOR_PICKUP: 'Ready for Pickup',
    COLLECTED: 'Collected',
  };
  return map[status] ?? status.replace(/_/g, ' ');
}

function mobileStatusLabel(status: string) {
  if (status === 'READY_FOR_PICKUP') return 'Ready for Pickup';
  if (status === 'COLLECTED') return 'Collected';
  if (['DISPATCHED_TO_VENDOR', 'RECEIVED_FROM_VENDOR'].includes(status)) return 'Processing at Vendor';
  return 'Dropped — Awaiting Dispatch';
}

async function logLaundryAudit(
  institutionId: string,
  requestId: string,
  action: string,
  fromStatus: string,
  toStatus: string,
  performedBy: string,
  details = '',
) {
  await prisma.hostelLaundryAuditLog.create({
    data: { institutionId, requestId, action, fromStatus, toStatus, performedBy, details },
  });
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

async function getQuota(institutionId: string, studentProfileId: string, academicYear: string) {
  const custom = await prisma.hostelLaundryQuota.findFirst({
    where: { institutionId, studentProfileId, academicYear },
  });
  if (custom) {
    return { monthlyItemLimit: custom.monthlyItemLimit, monthlyWeightLimitKg: custom.monthlyWeightLimitKg };
  }
  const defaultQ = await prisma.hostelLaundryQuota.findFirst({
    where: { institutionId, studentProfileId: '', academicYear },
  });
  return {
    monthlyItemLimit: defaultQ?.monthlyItemLimit ?? DEFAULT_MONTHLY_ITEMS,
    monthlyWeightLimitKg: defaultQ?.monthlyWeightLimitKg ?? DEFAULT_MONTHLY_WEIGHT_KG,
  };
}

async function getMonthlyUsage(institutionId: string, studentProfileId: string, month: string) {
  const requests = await prisma.hostelLaundryRequest.findMany({
    where: {
      institutionId,
      studentProfileId,
      monthLabel: month,
      status: { not: 'CANCELLED' },
    },
  });
  return {
    itemsUsed: requests.reduce((s, r) => s + r.itemCount, 0),
    weightUsed: requests.reduce((s, r) => s + r.weightKg, 0),
    dropCount: requests.length,
  };
}

function mapRequestRow(r: {
  id: string;
  tokenNumber: string;
  qrToken: string;
  studentName: string;
  itemCount: number;
  weightKg: number;
  status: string;
  dropNotes: string;
  droppedAt: Date;
  droppedBy: string;
  dispatchedAt: Date | null;
  receivedFromVendorAt: Date | null;
  readyNotifiedAt: Date | null;
  collectedAt: Date | null;
  monthLabel: string;
  batch?: { batchNumber: string } | null;
  hostel?: { hostelName: string } | null;
}) {
  return {
    id: r.id,
    tokenNumber: r.tokenNumber,
    qrToken: r.qrToken,
    studentName: r.studentName,
    hostel: r.hostel?.hostelName ?? '—',
    itemCount: r.itemCount,
    weightKg: r.weightKg,
    status: r.status,
    statusLabel: statusLabel(r.status),
    mobileStatus: mobileStatusLabel(r.status),
    dropNotes: r.dropNotes,
    droppedAt: formatDateTime(r.droppedAt),
    droppedBy: r.droppedBy,
    dispatchedAt: r.dispatchedAt ? formatDateTime(r.dispatchedAt) : null,
    receivedAt: r.receivedFromVendorAt ? formatDateTime(r.receivedFromVendorAt) : null,
    readyAt: r.readyNotifiedAt ? formatDateTime(r.readyNotifiedAt) : null,
    collectedAt: r.collectedAt ? formatDateTime(r.collectedAt) : null,
    batchNumber: r.batch?.batchNumber ?? null,
    monthLabel: r.monthLabel,
  };
}

export function countLaundryKpis(requests: { status: string }[]) {
  let tokenIssued = 0;
  let withVendor = 0;
  let readyForPickup = 0;
  let collected = 0;

  for (const r of requests) {
    if (r.status === 'TOKEN_ISSUED') tokenIssued += 1;
    else if (r.status === 'DISPATCHED_TO_VENDOR' || r.status === 'RECEIVED_FROM_VENDOR') withVendor += 1;
    else if (r.status === 'READY_FOR_PICKUP') readyForPickup += 1;
    else if (r.status === 'COLLECTED') collected += 1;
  }

  return { tokenIssued, withVendor, readyForPickup, collected, total: requests.length };
}

export async function getLaundryManagement(
  institutionId: string,
  academicYear = '2025-26',
  filters: { status?: string; monthLabel?: string } = {},
) {
  const month = filters.monthLabel ?? monthLabel();
  const where: Prisma.HostelLaundryRequestWhereInput = { institutionId, academicYear };
  if (filters.status && filters.status !== 'ALL') where.status = filters.status;

  const [requests, allRequests, vendors, batches, students, defaultQuota] = await Promise.all([
    prisma.hostelLaundryRequest.findMany({
      where,
      include: { hostel: true, batch: true },
      orderBy: { droppedAt: 'desc' },
      take: 100,
    }),
    prisma.hostelLaundryRequest.findMany({ where: { institutionId, academicYear, monthLabel: month } }),
    prisma.hostelLaundryVendor.findMany({ where: { institutionId, academicYear, status: 'ACTIVE' } }),
    prisma.hostelLaundryBatch.findMany({
      where: { institutionId, academicYear },
      include: { vendor: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.hostelStudentProfile.findMany({
      where: { institutionId, academicYear, residentStatus: 'ACTIVE' },
      include: { student: true },
      take: 50,
    }),
    prisma.hostelLaundryQuota.findFirst({ where: { institutionId, studentProfileId: '', academicYear } }),
  ]);

  const kpis = countLaundryKpis(allRequests);
  const pendingDispatch = await prisma.hostelLaundryRequest.count({
    where: { institutionId, academicYear, status: 'TOKEN_ISSUED' },
  });

  const statusChart = [
    { name: 'Token Issued', value: kpis.tokenIssued, color: '#f59e0b' },
    { name: 'With Vendor', value: kpis.withVendor, color: '#3b82f6' },
    { name: 'Ready', value: kpis.readyForPickup, color: '#10b981' },
    { name: 'Collected', value: kpis.collected, color: '#64748b' },
  ].map((c) => ({
    ...c,
    percent: kpis.total ? `${Math.round((c.value / kpis.total) * 100)}%` : '0%',
  }));

  await logActivity(institutionId, 'VIEW_LAUNDRY', 'Laundry management accessed', { academicYear, month });

  return {
    academicYear,
    academicYears: ACADEMIC_YEARS,
    currentMonth: month,
    defaultQuota: {
      monthlyItemLimit: defaultQuota?.monthlyItemLimit ?? DEFAULT_MONTHLY_ITEMS,
      monthlyWeightLimitKg: defaultQuota?.monthlyWeightLimitKg ?? DEFAULT_MONTHLY_WEIGHT_KG,
    },
    kpis: { ...kpis, pendingDispatch },
    statusChart,
    requests: requests.map((r) => mapRequestRow(r)),
    vendors: vendors.map((v) => ({
      id: v.id,
      name: v.vendorName,
      contact: v.contactPerson,
      mobile: v.mobile,
      schedule: v.pickupSchedule,
    })),
    batches: batches.map((b) => ({
      id: b.id,
      batchNumber: b.batchNumber,
      vendor: b.vendor.vendorName,
      status: b.status,
      totalItems: b.totalItems,
      totalWeightKg: b.totalWeightKg,
      requestCount: b.requestCount,
      dispatchedAt: b.dispatchedAt ? formatDateTime(b.dispatchedAt) : null,
      receivedAt: b.receivedAt ? formatDateTime(b.receivedAt) : null,
      expectedReturnAt: b.expectedReturnAt ? formatDateTime(b.expectedReturnAt) : null,
    })),
    students: await Promise.all(
      students.map(async (s) => {
        const usage = await getMonthlyUsage(institutionId, s.id, month);
        const quota = await getQuota(institutionId, s.id, academicYear);
        const active = await prisma.hostelLaundryRequest.findFirst({
          where: {
            institutionId,
            studentProfileId: s.id,
            status: { in: ACTIVE_STATUSES },
          },
          orderBy: { droppedAt: 'desc' },
        });
        return {
          profileId: s.id,
          studentId: s.studentId,
          studentName: `${s.student.firstName} ${s.student.lastName}`.trim(),
          hostelId: s.hostelId,
          monthlyItemsUsed: usage.itemsUsed,
          monthlyItemsRemaining: Math.max(0, quota.monthlyItemLimit - usage.itemsUsed),
          monthlyWeightUsed: usage.weightUsed,
          monthlyWeightRemaining: Math.max(0, quota.monthlyWeightLimitKg - usage.weightUsed),
          activeStatus: active ? mobileStatusLabel(active.status) : null,
          readyForPickup: active?.status === 'READY_FOR_PICKUP',
        };
      }),
    ),
    permissions: {
      canDrop: true,
      canDispatch: true,
      canReceive: true,
      canCollect: true,
      canExport: true,
    },
    statusFlow: ['TOKEN_ISSUED', 'DISPATCHED_TO_VENDOR', 'RECEIVED_FROM_VENDOR', 'READY_FOR_PICKUP', 'COLLECTED'],
    mobileSync: {
      fields: ['laundryStatus', 'remainingMonthlyQuota', 'remainingWeightQuota', 'activeToken', 'qrToken'],
      readyMessage: 'Laundry Status: Ready for Pickup',
    },
    reports: ['Laundry Register', 'Vendor Dispatch Report', 'Monthly Quota Usage'],
    exportFormats: ['PDF', 'Excel', 'CSV'],
  };
}

export async function dropLaundry(
  institutionId: string,
  body: {
    studentProfileId: string;
    itemCount: number;
    weightKg: number;
    dropNotes?: string;
    droppedBy?: string;
    academicYear?: string;
  },
) {
  const academicYear = body.academicYear ?? '2025-26';
  const month = monthLabel();

  const profile = await prisma.hostelStudentProfile.findFirst({
    where: { id: body.studentProfileId, institutionId },
    include: { student: true },
  });
  if (!profile) throw new Error('Student profile not found');
  if (body.itemCount < 1) throw new Error('Item count must be at least 1');

  const quota = await getQuota(institutionId, body.studentProfileId, academicYear);
  const usage = await getMonthlyUsage(institutionId, body.studentProfileId, month);

  if (usage.itemsUsed + body.itemCount > quota.monthlyItemLimit) {
    throw new Error(`Monthly item limit exceeded (${usage.itemsUsed}/${quota.monthlyItemLimit} used)`);
  }
  if (usage.weightUsed + body.weightKg > quota.monthlyWeightLimitKg) {
    throw new Error(`Monthly weight limit exceeded (${usage.weightUsed}/${quota.monthlyWeightLimitKg} kg used)`);
  }

  const seq = await prisma.hostelLaundryRequest.count({ where: { institutionId, monthLabel: month } }) + 1;
  const tokenNumber = generateTokenNumber(seq);
  const qrToken = generateQrToken();
  const studentName = `${profile.student.firstName} ${profile.student.lastName}`.trim();

  const request = await prisma.hostelLaundryRequest.create({
    data: {
      institutionId,
      hostelId: profile.hostelId,
      studentId: profile.studentId,
      studentProfileId: body.studentProfileId,
      studentName,
      itemCount: body.itemCount,
      weightKg: body.weightKg,
      dropNotes: body.dropNotes ?? '',
      status: 'TOKEN_ISSUED',
      tokenNumber,
      qrToken,
      monthLabel: month,
      droppedBy: body.droppedBy ?? 'Laundry Staff',
      academicYear,
    },
    include: { hostel: true },
  });

  await logLaundryAudit(institutionId, request.id, 'CLOTHES_DROPPED', '', 'TOKEN_ISSUED', body.droppedBy ?? 'Staff', `${body.itemCount} items, ${body.weightKg} kg`);

  const remaining = quota.monthlyItemLimit - usage.itemsUsed - body.itemCount;

  return {
    success: true,
    request: mapRequestRow(request),
    tokenNumber,
    qrToken,
    message: `Digital token ${tokenNumber} issued — ${body.itemCount} items logged`,
    notifications: [`Push to Student: Laundry dropped — Token ${tokenNumber}. ${remaining} items remaining this month.`],
    mobileSync: {
      laundryStatus: 'Dropped — Awaiting Dispatch',
      remainingMonthlyQuota: remaining,
      remainingWeightQuota: Math.max(0, quota.monthlyWeightLimitKg - usage.weightUsed - body.weightKg),
      activeToken: tokenNumber,
      qrToken,
    },
  };
}

export async function dispatchLaundryBatch(
  institutionId: string,
  body: { vendorId: string; requestIds?: string[]; performedBy?: string; academicYear?: string },
) {
  const academicYear = body.academicYear ?? '2025-26';
  const vendor = await prisma.hostelLaundryVendor.findFirst({ where: { id: body.vendorId, institutionId } });
  if (!vendor) throw new Error('Vendor not found');

  const requests = body.requestIds?.length
    ? await prisma.hostelLaundryRequest.findMany({
        where: { institutionId, id: { in: body.requestIds }, status: { in: DISPATCHABLE_STATUSES } },
      })
    : await prisma.hostelLaundryRequest.findMany({
        where: { institutionId, academicYear, status: 'TOKEN_ISSUED', batchId: null },
        take: 50,
      });

  if (requests.length === 0) throw new Error('No requests ready for dispatch');

  const batchNum = `LB-${new Date().getFullYear()}-${String(await prisma.hostelLaundryBatch.count({ where: { institutionId } }) + 1).padStart(4, '0')}`;
  const now = new Date();
  const expectedReturn = new Date(now.getTime() + 2 * 86400000);

  const batch = await prisma.hostelLaundryBatch.create({
    data: {
      institutionId,
      vendorId: body.vendorId,
      batchNumber: batchNum,
      totalItems: requests.reduce((s, r) => s + r.itemCount, 0),
      totalWeightKg: requests.reduce((s, r) => s + r.weightKg, 0),
      requestCount: requests.length,
      status: 'DISPATCHED',
      dispatchedAt: now,
      expectedReturnAt: expectedReturn,
      academicYear,
    },
  });

  for (const req of requests) {
    await prisma.hostelLaundryRequest.update({
      where: { id: req.id },
      data: { status: 'DISPATCHED_TO_VENDOR', batchId: batch.id, dispatchedAt: now },
    });
    await logLaundryAudit(institutionId, req.id, 'DISPATCHED', 'TOKEN_ISSUED', 'DISPATCHED_TO_VENDOR', body.performedBy ?? 'Staff', batchNum);
  }

  await logActivity(institutionId, 'LAUNDRY_DISPATCH', `Batch ${batchNum} dispatched to ${vendor.vendorName}`, { batchId: batch.id, count: requests.length });

  return {
    success: true,
    batch: { id: batch.id, batchNumber: batchNum, requestCount: requests.length },
    message: `Batch ${batchNum} dispatched — ${requests.length} student loads sent to ${vendor.vendorName}`,
    notifications: requests.map((r) => `Push to ${r.studentName}: Laundry sent to vendor`),
  };
}

export async function receiveLaundryBatch(
  institutionId: string,
  batchId: string,
  performedBy = 'Laundry Staff',
) {
  const batch = await prisma.hostelLaundryBatch.findFirst({
    where: { id: batchId, institutionId },
    include: { requests: true, vendor: true },
  });
  if (!batch || batch.status !== 'DISPATCHED') {
    throw new Error('Batch not found or not dispatched');
  }

  const now = new Date();
  await prisma.hostelLaundryBatch.update({
    where: { id: batchId },
    data: { status: 'RECEIVED', receivedAt: now },
  });

  for (const req of batch.requests) {
    await prisma.hostelLaundryRequest.update({
      where: { id: req.id },
      data: {
        status: 'READY_FOR_PICKUP',
        receivedFromVendorAt: now,
        readyNotifiedAt: now,
      },
    });
    await logLaundryAudit(institutionId, req.id, 'RECEIVED_FROM_VENDOR', 'DISPATCHED_TO_VENDOR', 'READY_FOR_PICKUP', performedBy);
    await logLaundryAudit(institutionId, req.id, 'STUDENT_NOTIFIED', 'READY_FOR_PICKUP', 'READY_FOR_PICKUP', 'System', 'Ready for Pickup');
  }

  await logActivity(institutionId, 'LAUNDRY_RECEIVED', `Batch ${batch.batchNumber} received from ${batch.vendor.vendorName}`, { batchId });

  return {
    success: true,
    message: `Batch ${batch.batchNumber} received — ${batch.requests.length} loads ready for pickup`,
    notifications: batch.requests.map((r) => `Push to ${r.studentName}: Laundry Status: Ready for Pickup`),
  };
}

export async function collectLaundry(
  institutionId: string,
  body: { qrToken: string; collectedBy?: string },
) {
  const request = await prisma.hostelLaundryRequest.findFirst({
    where: { institutionId, qrToken: body.qrToken, status: 'READY_FOR_PICKUP' },
    include: { hostel: true, batch: true },
  });
  if (!request) throw new Error('Invalid QR or laundry not ready for pickup');

  const updated = await prisma.hostelLaundryRequest.update({
    where: { id: request.id },
    data: {
      status: 'COLLECTED',
      collectedAt: new Date(),
      collectedBy: body.collectedBy ?? 'Laundry Staff',
    },
    include: { hostel: true, batch: true },
  });

  await logLaundryAudit(institutionId, request.id, 'COLLECTED', 'READY_FOR_PICKUP', 'COLLECTED', body.collectedBy ?? 'Staff');

  return {
    success: true,
    request: mapRequestRow(updated),
    message: `Laundry collected by ${request.studentName} — Token ${request.tokenNumber}`,
    notifications: [`Push to ${request.studentName}: Laundry collected successfully`],
  };
}

export async function getStudentLaundryMobile(
  institutionId: string,
  studentProfileId: string,
  academicYear = '2025-26',
) {
  const month = monthLabel();
  const quota = await getQuota(institutionId, studentProfileId, academicYear);
  const usage = await getMonthlyUsage(institutionId, studentProfileId, month);

  const active = await prisma.hostelLaundryRequest.findFirst({
    where: {
      institutionId,
      studentProfileId,
      status: { in: ACTIVE_STATUSES },
    },
    orderBy: { droppedAt: 'desc' },
    include: { hostel: true, batch: true },
  });

  const history = await prisma.hostelLaundryRequest.findMany({
    where: { institutionId, studentProfileId, academicYear },
    orderBy: { droppedAt: 'desc' },
    take: 10,
    include: { hostel: true, batch: true },
  });

  const laundryStatus = active
    ? active.status === 'READY_FOR_PICKUP'
      ? 'Laundry Status: Ready for Pickup'
      : mobileStatusLabel(active.status)
    : 'No active laundry';

  return {
    studentProfileId,
    academicYear,
    monthLabel: month,
    laundryStatus,
    readyForPickup: active?.status === 'READY_FOR_PICKUP',
    remainingMonthlyQuota: Math.max(0, quota.monthlyItemLimit - usage.itemsUsed),
    remainingWeightQuota: Math.max(0, quota.monthlyWeightLimitKg - usage.weightUsed),
    monthlyItemLimit: quota.monthlyItemLimit,
    monthlyWeightLimitKg: quota.monthlyWeightLimitKg,
    itemsUsedThisMonth: usage.itemsUsed,
    weightUsedThisMonth: usage.weightUsed,
    activeRequest: active ? mapRequestRow(active) : null,
    activeToken: active?.tokenNumber ?? null,
    qrToken: active?.status === 'READY_FOR_PICKUP' ? active.qrToken : null,
    history: history.map((r) => mapRequestRow(r)),
  };
}

export async function exportLaundryReport(
  institutionId: string,
  academicYear: string,
  format: 'PDF' | 'Excel' | 'CSV',
  reportType = 'Laundry Register',
) {
  const data = await getLaundryManagement(institutionId, academicYear);
  const fileName = `hostel_laundry_${Date.now()}.${format.toLowerCase()}`;
  await logActivity(institutionId, 'EXPORT_LAUNDRY', `Exported ${reportType}`, { format });
  return { success: true, format, fileName, message: `${reportType} exported`, snapshot: data };
}

export async function seedLaundryManagement(institutionId: string) {
  await seedHostelStudents(institutionId);
  const academicYear = '2025-26';
  const month = monthLabel();

  const existing = await prisma.hostelLaundryRequest.count({ where: { institutionId, academicYear } });
  if (existing >= 20) return getLaundryManagement(institutionId, academicYear);

  await prisma.hostelLaundryAuditLog.deleteMany({ where: { institutionId } });
  await prisma.hostelLaundryRequest.deleteMany({ where: { institutionId } });
  await prisma.hostelLaundryBatch.deleteMany({ where: { institutionId } });
  await prisma.hostelLaundryVendor.deleteMany({ where: { institutionId } });

  await prisma.hostelLaundryQuota.upsert({
    where: { institutionId_studentProfileId_academicYear: { institutionId, studentProfileId: '', academicYear } },
    create: { institutionId, academicYear, monthlyItemLimit: 30, monthlyWeightLimitKg: 15 },
    update: { monthlyItemLimit: 30, monthlyWeightLimitKg: 15 },
  });

  const vendor = await prisma.hostelLaundryVendor.create({
    data: {
      institutionId,
      vendorName: 'Sparkle Clean Laundry Services',
      contactPerson: 'Mr. Ramesh',
      mobile: '9876543210',
      pickupSchedule: 'Mon, Wed, Fri',
      academicYear,
    },
  });

  const profiles = await prisma.hostelStudentProfile.findMany({
    where: { institutionId, residentStatus: 'ACTIVE' },
    include: { student: true },
    take: 40,
  });

  const now = new Date();
  let seq = 0;

  async function createRequest(
    profile: typeof profiles[0],
    status: string,
    itemCount: number,
    weightKg: number,
    batchId?: string,
  ) {
    seq += 1;
    const name = `${profile.student.firstName} ${profile.student.lastName}`.trim();
    const token = generateTokenNumber(seq);
    const qr = generateQrToken();

    return prisma.hostelLaundryRequest.create({
      data: {
        institutionId,
        hostelId: profile.hostelId,
        batchId: batchId ?? null,
        studentId: profile.studentId,
        studentProfileId: profile.id,
        studentName: name,
        itemCount,
        weightKg,
        status,
        tokenNumber: token,
        qrToken: qr,
        monthLabel: month,
        droppedBy: 'Laundry Staff',
        droppedAt: new Date(now.getTime() - seq * 3600000),
        dispatchedAt: ['DISPATCHED_TO_VENDOR', 'RECEIVED_FROM_VENDOR', 'READY_FOR_PICKUP', 'COLLECTED'].includes(status)
          ? new Date(now.getTime() - (seq - 1) * 3600000) : null,
        receivedFromVendorAt: ['READY_FOR_PICKUP', 'COLLECTED'].includes(status) ? new Date(now.getTime() - 3600000) : null,
        readyNotifiedAt: ['READY_FOR_PICKUP', 'COLLECTED'].includes(status) ? new Date(now.getTime() - 1800000) : null,
        collectedAt: status === 'COLLECTED' ? new Date() : null,
        collectedBy: status === 'COLLECTED' ? 'Laundry Staff' : '',
        academicYear,
      },
    });
  }

  const tokenRequests = [];
  for (let i = 0; i < 6 && i < profiles.length; i += 1) {
    tokenRequests.push(await createRequest(profiles[i], 'TOKEN_ISSUED', 5 + i, 2.5 + i * 0.3));
  }

  const dispatchBatch = await prisma.hostelLaundryBatch.create({
    data: {
      institutionId,
      vendorId: vendor.id,
      batchNumber: `LB-2025-0001`,
      totalItems: 0,
      totalWeightKg: 0,
      requestCount: 0,
      status: 'DISPATCHED',
      dispatchedAt: new Date(now.getTime() - 86400000),
      expectedReturnAt: new Date(now.getTime() + 86400000),
      academicYear,
    },
  });

  const dispatched = [];
  for (let i = 6; i < 12 && i < profiles.length; i += 1) {
    dispatched.push(await createRequest(profiles[i], 'DISPATCHED_TO_VENDOR', 8, 3.5, dispatchBatch.id));
  }
  await prisma.hostelLaundryBatch.update({
    where: { id: dispatchBatch.id },
    data: {
      totalItems: dispatched.reduce((s, r) => s + r.itemCount, 0),
      totalWeightKg: dispatched.reduce((s, r) => s + r.weightKg, 0),
      requestCount: dispatched.length,
    },
  });

  const receivedBatch = await prisma.hostelLaundryBatch.create({
    data: {
      institutionId,
      vendorId: vendor.id,
      batchNumber: `LB-2025-0002`,
      status: 'RECEIVED',
      dispatchedAt: new Date(now.getTime() - 2 * 86400000),
      receivedAt: new Date(now.getTime() - 3600000),
      expectedReturnAt: new Date(now.getTime() - 3600000),
      totalItems: 0,
      totalWeightKg: 0,
      requestCount: 0,
      academicYear,
    },
  });

  const ready = [];
  for (let i = 12; i < 18 && i < profiles.length; i += 1) {
    ready.push(await createRequest(profiles[i], 'READY_FOR_PICKUP', 6, 2.8, receivedBatch.id));
  }
  await prisma.hostelLaundryBatch.update({
    where: { id: receivedBatch.id },
    data: {
      totalItems: ready.reduce((s, r) => s + r.itemCount, 0),
      totalWeightKg: ready.reduce((s, r) => s + r.weightKg, 0),
      requestCount: ready.length,
    },
  });

  for (let i = 18; i < 25 && i < profiles.length; i += 1) {
    await createRequest(profiles[i], 'COLLECTED', 7, 3, receivedBatch.id);
  }

  await logActivity(institutionId, 'SEED_LAUNDRY', 'Laundry management demo seeded');
  return getLaundryManagement(institutionId, academicYear);
}
