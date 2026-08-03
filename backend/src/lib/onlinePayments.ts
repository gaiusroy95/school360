import { FeeFineLevyStatus, FeePaymentMode, PaymentOrderStatus } from '@prisma/client';
import { prisma } from './prisma.js';

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export type OnlinePaymentChannel = 'online' | 'bankTransfer' | 'upi' | 'pos';

export type OnlinePaymentCategory =
  | 'studentFee'
  | 'hostelFee'
  | 'transportFee'
  | 'admissionFee'
  | 'examinationFee'
  | 'libraryFee'
  | 'fineCollection'
  | 'otherCollection';

export const ONLINE_PAYMENT_CATEGORIES: Array<{ key: OnlinePaymentCategory; label: string }> = [
  { key: 'studentFee', label: 'Student Fee' },
  { key: 'hostelFee', label: 'Hostel Fee' },
  { key: 'transportFee', label: 'Transport Fee' },
  { key: 'admissionFee', label: 'Admission Fee' },
  { key: 'examinationFee', label: 'Examination Fee' },
  { key: 'libraryFee', label: 'Library Fee' },
  { key: 'fineCollection', label: 'Fine Collection' },
  { key: 'otherCollection', label: 'Other Collection' },
];

export const ONLINE_PAYMENT_CHANNELS: Array<{ key: OnlinePaymentChannel; label: string }> = [
  { key: 'online', label: 'Online' },
  { key: 'bankTransfer', label: 'Bank Transfer' },
  { key: 'upi', label: 'UPI' },
  { key: 'pos', label: 'POS' },
];

type Matrix = Record<OnlinePaymentCategory, Record<OnlinePaymentChannel, number>>;

function emptyMatrix(): Matrix {
  const m = {} as Matrix;
  for (const cat of ONLINE_PAYMENT_CATEGORIES) {
    m[cat.key] = { online: 0, bankTransfer: 0, upi: 0, pos: 0 };
  }
  return m;
}

function feeHeadToCategory(headKey: string): OnlinePaymentCategory {
  const k = headKey.toLowerCase().replace(/[_\s-]/g, '');
  if (k.includes('hostel') || k === 'messfee' || k === 'hostelfee') return 'hostelFee';
  if (k.includes('transport') || k === 'transportfee') return 'transportFee';
  if (k.includes('admission') || k === 'admissionfee') return 'admissionFee';
  if (k.includes('exam') || k === 'examinationfee') return 'examinationFee';
  if (k.includes('library') || k.includes('librarysecurity')) return 'libraryFee';
  if (k.includes('fine') || k.includes('penalty')) return 'fineCollection';
  if (
    k.includes('tuition') ||
    k.includes('registration') ||
    k.includes('annual') ||
    k.includes('sports') ||
    k.includes('development') ||
    k.includes('computer') ||
    k.includes('picnic') ||
    k.includes('fieldtrip') ||
    k.includes('addon') ||
    k.includes('caution') ||
    k === 'tuitionfee' ||
    k === 'registrationfee' ||
    k === 'annualcharges' ||
    k === 'sportsfee' ||
    k === 'computerlabfee' ||
    k === 'picnicfieldtrip' ||
    k === 'addonfee' ||
    k === 'cautionmoney'
  ) {
    return 'studentFee';
  }
  return 'otherCollection';
}

function paymentModeToChannel(mode: FeePaymentMode | string): OnlinePaymentChannel | null {
  const m = String(mode).toUpperCase();
  if (m === 'UPI') return 'upi';
  if (m === 'BANK_TRANSFER' || m === 'BANK TRANSFER' || m === 'CHEQUE') return 'bankTransfer';
  if (m === 'CARD') return 'pos';
  if (m === 'CASH') return null;
  return 'online';
}

function paymentModeStringToChannel(mode: string): OnlinePaymentChannel | null {
  const m = mode.trim().toUpperCase();
  if (m === 'UPI') return 'upi';
  if (m === 'BANK_TRANSFER' || m === 'BANK TRANSFER' || m === 'CHEQUE') return 'bankTransfer';
  if (m === 'CARD' || m === 'POS') return 'pos';
  if (m === 'ONLINE') return 'online';
  if (m === 'CASH') return null;
  return 'online';
}

function addToMatrix(
  matrix: Matrix,
  category: OnlinePaymentCategory,
  channel: OnlinePaymentChannel,
  amount: number,
) {
  matrix[category][channel] = round2(matrix[category][channel] + amount);
}

function dueHeadToCategory(feeHead: string): OnlinePaymentCategory {
  return feeHeadToCategory(feeHead);
}

function monthRange(year: number, month: number) {
  // Asia/Kolkata month window — same calendar as Payment Reconciliation day sync
  const mm = String(month).padStart(2, '0');
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const start = new Date(`${year}-${mm}-01T00:00:00.000+05:30`);
  const end = new Date(
    `${year}-${mm}-${String(lastDay).padStart(2, '0')}T23:59:59.999+05:30`,
  );
  return { start, end };
}

function buildRows(matrix: Matrix) {
  const rows = ONLINE_PAYMENT_CATEGORIES.map((cat) => {
    const channels = matrix[cat.key];
    const total = round2(
      channels.online + channels.bankTransfer + channels.upi + channels.pos,
    );
    return {
      category: cat.key,
      label: cat.label,
      online: channels.online,
      bankTransfer: channels.bankTransfer,
      upi: channels.upi,
      pos: channels.pos,
      total,
    };
  });

  const totals = {
    online: round2(rows.reduce((s, r) => s + r.online, 0)),
    bankTransfer: round2(rows.reduce((s, r) => s + r.bankTransfer, 0)),
    upi: round2(rows.reduce((s, r) => s + r.upi, 0)),
    pos: round2(rows.reduce((s, r) => s + r.pos, 0)),
    total: round2(rows.reduce((s, r) => s + r.total, 0)),
  };

  return { rows, totals };
}

export async function getOnlinePaymentsReport(
  institutionId: string,
  opts?: { academicYear?: string; year?: number; month?: number; channel?: OnlinePaymentChannel },
) {
  const academicYear = opts?.academicYear || '2025-26';
  const now = new Date();
  const year = opts?.year ?? now.getFullYear();
  const month = opts?.month ?? now.getMonth() + 1;
  const { start, end } = monthRange(year, month);

  const matrix = emptyMatrix();
  let transactionCount = 0;

  const receipts = await prisma.feeReceipt.findMany({
    where: {
      institutionId,
      academicYear,
      collectedAt: { gte: start, lte: end },
    },
  });

  for (const r of receipts) {
    const channel = paymentModeToChannel(r.paymentMode);
    if (!channel) continue;
    // Always build full matrix — channel filter is not applied to the collection grid

    const breakdownRaw = r.feeBreakdown;
    let items: { key: string; amount: number }[] = [];
    if (Array.isArray(breakdownRaw)) {
      items = breakdownRaw.map((item) => {
        const row = item as { key?: string; amount?: number };
        return { key: String(row.key || ''), amount: Number(row.amount) || 0 };
      });
    } else if (breakdownRaw && typeof breakdownRaw === 'object') {
      items = Object.entries(breakdownRaw as Record<string, unknown>).map(([key, value]) => ({
        key,
        amount: Number(value) || 0,
      }));
    }

    if (items.length === 0) {
      addToMatrix(matrix, 'studentFee', channel, r.amountPaid);
      transactionCount += 1;
      continue;
    }

    for (const item of items) {
      if (item.amount <= 0) continue;
      const category = feeHeadToCategory(item.key);
      addToMatrix(matrix, category, channel, item.amount);
      transactionCount += 1;
    }
  }

  const [transportRows, hostelRows, paidOrders, paidFines] = await Promise.all([
    prisma.transportFeeCollection.findMany({
      where: { institutionId, academicYear, collectedAt: { gte: start, lte: end } },
    }),
    prisma.hostelFeeCollection.findMany({
      where: { institutionId, academicYear, collectedAt: { gte: start, lte: end } },
    }),
    prisma.paymentOrder.findMany({
      where: {
        institutionId,
        status: PaymentOrderStatus.PAID,
        updatedAt: { gte: start, lte: end },
      },
      include: { feeDue: { select: { feeHead: true, amount: true } } },
    }),
    prisma.feeFineLevy.findMany({
      where: {
        institutionId,
        academicYear,
        status: FeeFineLevyStatus.PAID,
        collectedAt: { gte: start, lte: end },
      },
    }),
  ]);

  for (const t of transportRows) {
    const channel = paymentModeStringToChannel(t.paymentMode);
    if (!channel) continue;
    addToMatrix(matrix, 'transportFee', channel, t.amount);
    transactionCount += 1;
  }

  for (const h of hostelRows) {
    const channel = paymentModeStringToChannel(h.paymentMode);
    if (!channel) continue;
    addToMatrix(matrix, 'hostelFee', channel, h.amount);
    transactionCount += 1;
  }

  for (const o of paidOrders) {
    const channel: OnlinePaymentChannel = 'online';
    const category = dueHeadToCategory(o.feeDue.feeHead);
    addToMatrix(matrix, category, channel, o.amount);
    transactionCount += 1;
  }

  for (const f of paidFines) {
    const channel: OnlinePaymentChannel = 'upi';
    addToMatrix(matrix, 'fineCollection', channel, f.amount);
    transactionCount += 1;
  }

  const { rows, totals } = buildRows(matrix);

  return {
    academicYear,
    period: `${year}-${String(month).padStart(2, '0')}`,
    periodLabel: new Date(year, month - 1, 1).toLocaleString('en-IN', {
      month: 'long',
      year: 'numeric',
    }),
    year,
    month,
    transactionCount,
    totalCollected: totals.total,
    matrix: rows,
    columnTotals: totals,
    fetchedAt: new Date().toISOString(),
    channelFilter: null,
    lastFetchedChannel: opts?.channel || null,
  };
}

export async function exportOnlinePaymentsReport(
  institutionId: string,
  opts?: { academicYear?: string; year?: number; month?: number },
) {
  const report = await getOnlinePaymentsReport(institutionId, opts);
  return {
    exportedAt: new Date().toISOString(),
    ...report,
  };
}
