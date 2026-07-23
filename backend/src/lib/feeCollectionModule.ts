import { FeeDueStatus } from '@prisma/client';
import { prisma } from './prisma.js';
import {
  FEE_HEAD_LABELS,
  findFeeSchedule,
  loadFeeCollectionContext,
} from './feeConfig.js';
import { listFeeStructures } from './feeStructure.js';

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export const FEE_COLLECTION_HEAD_KEYS = [
  'tuitionFee',
  'admissionFee',
  'registrationFee',
  'librarySecurityDeposit',
  'cautionMoney',
  'computerLabFee',
  'picnicFieldTrip',
  'addOnFee',
  'examinationFee',
  'annualCharges',
  'sportsFee',
  'hostelFee',
  'transportFee',
] as const;

export const FEE_COLLECTION_COLUMNS = FEE_COLLECTION_HEAD_KEYS.map((key) => ({
  key,
  label:
    key === 'hostelFee'
      ? 'Hostel Fee'
      : key === 'transportFee'
        ? 'Transport Fee'
        : FEE_HEAD_LABELS[key] || key,
}));

export type FeeCollectionEntryStatus =
  | 'PAID'
  | 'COMPLETED'
  | 'ACTIVE'
  | 'PENDING'
  | 'DUE'
  | 'DRAFT'
  | 'APPROVED'
  | 'OPEN';

export type FeeCollectionAmounts = Record<(typeof FEE_COLLECTION_HEAD_KEYS)[number], number>;

function emptyAmounts(): FeeCollectionAmounts {
  return {
    tuitionFee: 0,
    admissionFee: 0,
    registrationFee: 0,
    librarySecurityDeposit: 0,
    cautionMoney: 0,
    computerLabFee: 0,
    picnicFieldTrip: 0,
    addOnFee: 0,
    examinationFee: 0,
    annualCharges: 0,
    sportsFee: 0,
    hostelFee: 0,
    transportFee: 0,
  };
}

function breakdownToAmounts(breakdown: unknown): FeeCollectionAmounts {
  const amounts = emptyAmounts();
  if (!Array.isArray(breakdown)) return amounts;
  for (const item of breakdown) {
    const row = item as { key?: string; amount?: number };
    const key = row.key as keyof FeeCollectionAmounts;
    if (key && key in amounts) {
      amounts[key] = round2((amounts[key] || 0) + (Number(row.amount) || 0));
    }
  }
  return amounts;
}

function sumAmounts(amounts: FeeCollectionAmounts) {
  return round2(Object.values(amounts).reduce((s, v) => s + v, 0));
}

function mapDueStatus(status: FeeDueStatus): FeeCollectionEntryStatus {
  if (status === FeeDueStatus.OVERDUE) return 'DUE';
  if (status === FeeDueStatus.PENDING) return 'PENDING';
  if (status === FeeDueStatus.PAID) return 'PAID';
  return 'DRAFT';
}

function frequencyForClass(
  schedules: Awaited<ReturnType<typeof loadFeeCollectionContext>>['schedules'],
  structures: Awaited<ReturnType<typeof listFeeStructures>>,
  className: string,
  sectionName: string,
) {
  const structure = structures.find(
    (s) =>
      s.className === className &&
      (s.sectionName || 'A') === (sectionName || 'A') &&
      !s.studentId,
  );
  if (structure?.frequency) return structure.frequency;
  const schedule = findFeeSchedule(schedules, className, sectionName);
  return schedule?.frequency || 'Yearly';
}

export async function getFeeCollectionAnalytics(institutionId: string, academicYear: string) {
  const [receipts, transportRows, hostelRows] = await Promise.all([
    prisma.feeReceipt.findMany({ where: { institutionId, academicYear } }),
    prisma.transportFeeCollection.findMany({ where: { institutionId, academicYear } }),
    prisma.hostelFeeCollection.findMany({ where: { institutionId, academicYear } }),
  ]);

  const totals = emptyAmounts();
  let totalCollected = 0;
  let receiptCount = 0;

  for (const r of receipts) {
    const amounts = breakdownToAmounts(r.feeBreakdown);
    for (const key of FEE_COLLECTION_HEAD_KEYS) {
      totals[key] = round2(totals[key] + amounts[key]);
    }
    totalCollected = round2(totalCollected + r.amountPaid);
    receiptCount += 1;
  }

  for (const t of transportRows) {
    totals.transportFee = round2(totals.transportFee + t.amount);
    totalCollected = round2(totalCollected + t.amount);
    receiptCount += 1;
  }

  for (const h of hostelRows) {
    totals.hostelFee = round2(totals.hostelFee + h.amount);
    totalCollected = round2(totalCollected + h.amount);
    receiptCount += 1;
  }

  const analytics = FEE_COLLECTION_COLUMNS.map((col) => ({
    key: col.key,
    label: col.label,
    amount: totals[col.key as keyof FeeCollectionAmounts],
  })).filter((a) => a.amount > 0);

  const pendingDues = await prisma.feeDue.count({
    where: {
      institutionId,
      academicYear,
      status: { in: [FeeDueStatus.PENDING, FeeDueStatus.OVERDUE] },
    },
  });

  return {
    academicYear,
    totalCollected,
    receiptCount,
    pendingDues,
    analytics,
    totals,
  };
}

export async function listFeeCollectionEntries(
  institutionId: string,
  filters?: {
    academicYear?: string;
    q?: string;
    status?: FeeCollectionEntryStatus;
    includeDues?: boolean;
  },
) {
  const academicYear = filters?.academicYear || '2025-26';
  const ctx = await loadFeeCollectionContext(institutionId);
  const structures = await listFeeStructures(institutionId, { academicYear });

  const [receipts, transportRows, hostelRows, dues] = await Promise.all([
    prisma.feeReceipt.findMany({
      where: { institutionId, academicYear },
      orderBy: { collectedAt: 'desc' },
    }),
    prisma.transportFeeCollection.findMany({
      where: { institutionId, academicYear },
      orderBy: { collectedAt: 'desc' },
    }),
    prisma.hostelFeeCollection.findMany({
      where: { institutionId, academicYear },
      orderBy: { collectedAt: 'desc' },
    }),
    filters?.includeDues !== false
      ? prisma.feeDue.findMany({
          where: {
            institutionId,
            academicYear,
            status: { not: FeeDueStatus.CANCELLED },
          },
          orderBy: { dueDate: 'desc' },
        })
      : Promise.resolve([]),
  ]);

  type Entry = {
    id: string;
    recordId: string;
    source: 'receipt' | 'transport' | 'hostel' | 'due';
    studentName: string;
    admissionNumber: string;
    className: string;
    sectionName: string;
    classLabel: string;
    frequency: string;
    amounts: FeeCollectionAmounts;
    totalAmount: number;
    collectedAt: string;
    displayDate: string;
    status: FeeCollectionEntryStatus;
    paymentMode: string;
    collectedBy: string;
    remarks: string;
  };

  const entries: Entry[] = [];

  for (const r of receipts) {
    const amounts = breakdownToAmounts(r.feeBreakdown);
    entries.push({
      id: r.id,
      recordId: r.receiptNumber,
      source: 'receipt',
      studentName: r.studentName,
      admissionNumber: r.admissionNumber,
      className: r.className,
      sectionName: r.sectionName,
      classLabel: `Class ${r.className}${r.sectionName ? `-${r.sectionName}` : ''}`,
      frequency: frequencyForClass(ctx.schedules, structures, r.className, r.sectionName),
      amounts,
      totalAmount: r.amountPaid,
      collectedAt: r.collectedAt.toISOString(),
      displayDate: r.collectedAt.toISOString().slice(0, 10),
      status: 'PAID',
      paymentMode: r.paymentMode,
      collectedBy: r.collectedBy,
      remarks: r.remarks,
    });
  }

  for (const t of transportRows) {
    const amounts = emptyAmounts();
    amounts.transportFee = t.amount;
    entries.push({
      id: t.id,
      recordId: t.receiptNumber,
      source: 'transport',
      studentName: t.studentName,
      admissionNumber: t.admissionNumber,
      className: t.className,
      sectionName: '',
      classLabel: t.className ? `Class ${t.className}` : '—',
      frequency: t.monthLabel || 'Monthly',
      amounts,
      totalAmount: t.amount,
      collectedAt: t.collectedAt.toISOString(),
      displayDate: t.collectedAt.toISOString().slice(0, 10),
      status: 'COMPLETED',
      paymentMode: t.paymentMode,
      collectedBy: t.collectedBy,
      remarks: t.remarks,
    });
  }

  for (const h of hostelRows) {
    const amounts = emptyAmounts();
    amounts.hostelFee = h.amount;
    entries.push({
      id: h.id,
      recordId: h.receiptNumber,
      source: 'hostel',
      studentName: h.studentName,
      admissionNumber: h.admissionNumber,
      className: h.className,
      sectionName: '',
      classLabel: h.className ? `Class ${h.className}` : '—',
      frequency: h.periodLabel || 'Monthly',
      amounts,
      totalAmount: h.amount,
      collectedAt: h.collectedAt.toISOString(),
      displayDate: h.collectedAt.toISOString().slice(0, 10),
      status: 'COMPLETED',
      paymentMode: h.paymentMode,
      collectedBy: h.collectedBy,
      remarks: h.remarks,
    });
  }

  for (const d of dues) {
    const amounts = emptyAmounts();
    const head = d.feeHead as keyof FeeCollectionAmounts;
    if (head in amounts) {
      amounts[head] = d.amount;
    } else {
      amounts.tuitionFee = d.amount;
    }
    entries.push({
      id: d.id,
      recordId: `DUE-${d.id.slice(-6).toUpperCase()}`,
      source: 'due',
      studentName: d.title || d.admissionNumber || 'Student',
      admissionNumber: d.admissionNumber,
      className: '',
      sectionName: '',
      classLabel: '—',
      frequency: '—',
      amounts,
      totalAmount: d.amount,
      collectedAt: d.dueDate.toISOString(),
      displayDate: d.dueDate.toISOString().slice(0, 10),
      status: mapDueStatus(d.status),
      paymentMode: '—',
      collectedBy: '—',
      remarks: d.remarks,
    });
  }

  let filtered = entries;
  if (filters?.status) {
    filtered = filtered.filter((e) => e.status === filters.status);
  }
  if (filters?.q?.trim()) {
    const q = filters.q.trim().toLowerCase();
    filtered = filtered.filter(
      (e) =>
        e.recordId.toLowerCase().includes(q) ||
        e.studentName.toLowerCase().includes(q) ||
        e.classLabel.toLowerCase().includes(q) ||
        e.admissionNumber.toLowerCase().includes(q),
    );
  }

  filtered.sort((a, b) => b.collectedAt.localeCompare(a.collectedAt));

  return filtered.map((e) => ({
    ...e,
    ...e.amounts,
  }));
}

export async function exportFeeCollectionEntries(institutionId: string, academicYear: string) {
  const records = await listFeeCollectionEntries(institutionId, { academicYear, includeDues: true });
  return {
    exportedAt: new Date().toISOString(),
    academicYear,
    count: records.length,
    records,
    columns: ['recordId', 'studentName', 'classLabel', 'frequency', ...FEE_COLLECTION_HEAD_KEYS, 'totalAmount', 'status', 'displayDate'],
  };
}
