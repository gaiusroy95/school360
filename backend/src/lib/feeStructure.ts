import { FeeStructureStatus, Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { FEE_HEAD_KEYS, FEE_HEAD_LABELS, loadFeeCollectionContext } from './feeConfig.js';
import {
  FEE_STRUCTURE_HEAD_FIELDS,
  STANDARD_STRUCTURE_COLUMN_KEYS,
  collectStructureHeadAmounts,
  getFeeStructureHeadCatalog,
  parseExtraHeads,
  syncFeeMastersFromStructure,
} from './feeMasterSync.js';

export { FEE_STRUCTURE_HEAD_FIELDS } from './feeMasterSync.js';

export const FEE_STRUCTURE_FREQUENCIES = ['Monthly', 'Quarterly', 'Yearly', 'One-time'] as const;

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

type NewHeadInput = {
  code: string;
  name: string;
  category?: string;
  isRefundable?: boolean;
};

function mergeStructureAmounts(
  data: FeeAmountInput & {
    headAmounts?: Record<string, number>;
    extraHeads?: Record<string, number>;
  },
  existing?: FeeAmountInput & { extraHeads?: unknown },
) {
  const merged: Record<string, number> = {};
  const base = existing || data;

  for (const field of FEE_STRUCTURE_HEAD_FIELDS) {
    const fromData = data[field.key as keyof FeeAmountInput];
    const value =
      fromData != null ? round2(Number(fromData) || 0) : round2(Number(base[field.key as keyof FeeAmountInput]) || 0);
    if (value > 0) merged[field.key] = value;
  }

  const extra = {
    ...parseExtraHeads(existing?.extraHeads),
    ...parseExtraHeads(data.extraHeads),
    ...Object.fromEntries(
      Object.entries(data.headAmounts || {})
        .filter(([key]) => !STANDARD_STRUCTURE_COLUMN_KEYS.has(key))
        .map(([key, value]) => [key, round2(Number(value) || 0)]),
    ),
  };
  for (const [key, value] of Object.entries(data.headAmounts || {})) {
    if (STANDARD_STRUCTURE_COLUMN_KEYS.has(key) && value > 0) {
      merged[key] = round2(Number(value) || 0);
    }
  }

  const standard: FeeAmountInput = {};
  const extraHeads: Record<string, number> = {};
  for (const [key, amount] of Object.entries(merged)) {
    if (STANDARD_STRUCTURE_COLUMN_KEYS.has(key)) {
      (standard as Record<string, number>)[key] = amount;
    }
  }
  for (const [key, amount] of Object.entries(extra)) {
    if (amount > 0) extraHeads[key] = amount;
  }

  return { standard, extraHeads };
}

async function persistStructureSync(
  institutionId: string,
  standard: FeeAmountInput,
  extraHeads: Record<string, number>,
  newHeads: NewHeadInput[] = [],
) {
  const heads = collectStructureHeadAmounts(
    standard as Record<string, unknown>,
    extraHeads,
  );
  await syncFeeMastersFromStructure(institutionId, heads, newHeads);
}

type FeeAmountInput = {
  tuitionFee?: number;
  admissionFee?: number;
  registrationFee?: number;
  librarySecurityDeposit?: number;
  cautionMoney?: number;
  computerLabFee?: number;
  picnicFieldTrip?: number;
  addOnFee?: number;
  examinationFee?: number;
  annualCharges?: number;
  sportsFee?: number;
};

type FeeStructureExtras = {
  headAmounts?: Record<string, number>;
  extraHeads?: Record<string, number>;
};

function computeTotalAmount(data: FeeAmountInput & { extraHeads?: unknown }) {
  const standard = round2(
    (data.tuitionFee ?? 0) +
      (data.admissionFee ?? 0) +
      (data.registrationFee ?? 0) +
      (data.librarySecurityDeposit ?? 0) +
      (data.cautionMoney ?? 0) +
      (data.computerLabFee ?? 0) +
      (data.picnicFieldTrip ?? 0) +
      (data.addOnFee ?? 0) +
      (data.examinationFee ?? 0) +
      (data.annualCharges ?? 0) +
      (data.sportsFee ?? 0),
  );
  const extra = Object.values(parseExtraHeads(data.extraHeads)).reduce((s, v) => s + v, 0);
  return round2(standard + extra);
}

function serializeFeeStructure(row: {
  id: string;
  recordId: string;
  academicYear: string;
  className: string;
  sectionName: string;
  frequency: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  tuitionFee: number;
  admissionFee: number;
  registrationFee: number;
  librarySecurityDeposit: number;
  cautionMoney: number;
  computerLabFee: number;
  picnicFieldTrip: number;
  addOnFee: number;
  examinationFee: number;
  annualCharges: number;
  sportsFee: number;
  extraHeads?: unknown;
  totalAmount: number;
  status: FeeStructureStatus;
  effectiveDate: Date | null;
  remarks: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  const classLabel = `Class ${row.className}${row.sectionName ? `-${row.sectionName}` : ''}`;
  const partyName =
    row.studentName?.trim() ||
    (row.studentId ? 'Student' : `${classLabel} Structure`);
  const extraHeads = parseExtraHeads(row.extraHeads);
  const headCatalog: Array<{ key: string; label: string; refundable: boolean; amount: number }> =
    FEE_STRUCTURE_HEAD_FIELDS.map((h) => ({
      key: h.key,
      label: h.label,
      refundable: h.refundable,
      amount: row[h.key as keyof typeof row] as number,
    }));
  for (const [key, amount] of Object.entries(extraHeads)) {
    if (amount > 0 && !headCatalog.some((h) => h.key === key)) {
      headCatalog.push({
        key,
        label: FEE_HEAD_LABELS[key] || key.replace(/_/g, ' '),
        refundable: false,
        amount,
      });
    }
  }

  return {
    id: row.id,
    recordId: row.recordId,
    academicYear: row.academicYear,
    className: row.className,
    sectionName: row.sectionName,
    classLabel,
    frequency: row.frequency,
    studentId: row.studentId,
    studentName: row.studentName,
    partyName,
    admissionNumber: row.admissionNumber,
    tuitionFee: row.tuitionFee,
    admissionFee: row.admissionFee,
    registrationFee: row.registrationFee,
    librarySecurityDeposit: row.librarySecurityDeposit,
    cautionMoney: row.cautionMoney,
    computerLabFee: row.computerLabFee,
    picnicFieldTrip: row.picnicFieldTrip,
    addOnFee: row.addOnFee,
    examinationFee: row.examinationFee,
    annualCharges: row.annualCharges,
    sportsFee: row.sportsFee,
    extraHeads,
    totalAmount: row.totalAmount,
    status: row.status,
    effectiveDate: row.effectiveDate ? row.effectiveDate.toISOString().slice(0, 10) : null,
    displayDate: (row.effectiveDate || row.createdAt).toISOString().slice(0, 10),
    remarks: row.remarks,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    feeHeads: headCatalog.filter((h) => h.amount > 0),
  };
}

export async function getFeeStructureMeta(institutionId: string) {
  const headCatalog = await getFeeStructureHeadCatalog(institutionId);
  return {
    headCatalog,
    frequencies: FEE_STRUCTURE_FREQUENCIES,
    standardKeys: FEE_STRUCTURE_HEAD_FIELDS.map((h) => h.key),
  };
}

async function nextRecordId(institutionId: string) {
  const count = await prisma.feeStructure.count({ where: { institutionId } });
  for (let i = 0; i < 100; i++) {
    const candidate = `FEE-${2170 + count + i}`;
    const exists = await prisma.feeStructure.findFirst({
      where: { institutionId, recordId: candidate },
    });
    if (!exists) return candidate;
  }
  return `FEE-${Date.now().toString().slice(-6)}`;
}

export async function getFeeStructureSummary(institutionId: string, academicYear: string) {
  const [classCount, structureCount, pendingCount, activeCount, receipts, transport, hostel] =
    await Promise.all([
    prisma.academicClassSection.count({
      where: { institutionId, academicYear, isActive: true },
    }),
    prisma.feeStructure.count({ where: { institutionId, academicYear } }),
    prisma.feeStructure.count({
      where: {
        institutionId,
        academicYear,
        status: { in: [FeeStructureStatus.PENDING, FeeStructureStatus.DUE] },
      },
    }),
    prisma.feeStructure.count({
      where: { institutionId, academicYear, status: FeeStructureStatus.ACTIVE },
    }),
    prisma.feeReceipt.findMany({
      where: { institutionId, academicYear },
      select: { amountPaid: true },
    }),
    prisma.transportFeeCollection.findMany({
      where: { institutionId, academicYear },
      select: { amount: true },
    }),
    prisma.hostelFeeCollection.findMany({
      where: { institutionId, academicYear },
      select: { amount: true },
    }),
  ]);

  const totalCollection = round2(
    receipts.reduce((s, r) => s + r.amountPaid, 0) +
      transport.reduce((s, r) => s + r.amount, 0) +
      hostel.reduce((s, r) => s + r.amount, 0),
  );

  return {
    academicYear,
    totalClasses: classCount,
    structuresCreated: structureCount,
    pendingCount,
    activeCount,
    totalCollection,
  };
}

export async function listFeeStructures(
  institutionId: string,
  filters?: {
    academicYear?: string;
    status?: FeeStructureStatus;
    q?: string;
    className?: string;
    sectionName?: string;
  },
) {
  const where: Prisma.FeeStructureWhereInput = { institutionId };
  if (filters?.academicYear) where.academicYear = filters.academicYear;
  if (filters?.status) where.status = filters.status;
  if (filters?.className) where.className = filters.className;
  if (filters?.sectionName) where.sectionName = filters.sectionName;
  if (filters?.q?.trim()) {
    const q = filters.q.trim();
    where.OR = [
      { recordId: { contains: q, mode: 'insensitive' } },
      { studentName: { contains: q, mode: 'insensitive' } },
      { className: { contains: q, mode: 'insensitive' } },
      { sectionName: { contains: q, mode: 'insensitive' } },
      { admissionNumber: { contains: q, mode: 'insensitive' } },
    ];
  }

  const rows = await prisma.feeStructure.findMany({
    where,
    orderBy: [{ updatedAt: 'desc' }, { recordId: 'desc' }],
  });
  return rows.map(serializeFeeStructure);
}

export async function getFeeStructure(institutionId: string, id: string) {
  const row = await prisma.feeStructure.findFirst({ where: { id, institutionId } });
  if (!row) throw new Error('Fee structure not found');
  return serializeFeeStructure(row);
}

export async function createFeeStructure(
  institutionId: string,
  data: FeeAmountInput & FeeStructureExtras & {
    academicYear: string;
    className: string;
    sectionName?: string;
    frequency?: string;
    studentId?: string;
    studentName?: string;
    admissionNumber?: string;
    status?: FeeStructureStatus;
    effectiveDate?: string;
    remarks?: string;
    recordId?: string;
    headAmounts?: Record<string, number>;
    extraHeads?: Record<string, number>;
    newHeads?: NewHeadInput[];
  },
  createdBy: string,
) {
  const className = data.className?.trim();
  if (!className) throw new Error('Class is required');

  const { standard, extraHeads } = mergeStructureAmounts(data);
  const amounts = {
    tuitionFee: round2(standard.tuitionFee ?? 0),
    admissionFee: round2(standard.admissionFee ?? 0),
    registrationFee: round2(standard.registrationFee ?? 0),
    librarySecurityDeposit: round2(standard.librarySecurityDeposit ?? 0),
    cautionMoney: round2(standard.cautionMoney ?? 0),
    computerLabFee: round2(standard.computerLabFee ?? 0),
    picnicFieldTrip: round2(standard.picnicFieldTrip ?? 0),
    addOnFee: round2(standard.addOnFee ?? 0),
    examinationFee: round2(standard.examinationFee ?? 0),
    annualCharges: round2(standard.annualCharges ?? 0),
    sportsFee: round2(standard.sportsFee ?? 0),
  };
  const totalAmount = computeTotalAmount({ ...amounts, extraHeads });
  if (totalAmount <= 0) throw new Error('At least one fee head amount must be greater than zero');

  const recordId = data.recordId?.trim() || (await nextRecordId(institutionId));
  const row = await prisma.feeStructure.create({
    data: {
      institutionId,
      recordId,
      academicYear: data.academicYear || '2025-26',
      className,
      sectionName: data.sectionName?.trim() || 'A',
      frequency: data.frequency || 'Yearly',
      studentId: data.studentId ?? '',
      studentName: data.studentName ?? '',
      admissionNumber: data.admissionNumber ?? '',
      ...amounts,
      extraHeads: extraHeads as Prisma.InputJsonValue,
      totalAmount,
      status: data.status ?? FeeStructureStatus.DRAFT,
      effectiveDate: data.effectiveDate ? new Date(data.effectiveDate) : new Date(),
      remarks: data.remarks ?? '',
      createdBy,
    },
  });

  await persistStructureSync(institutionId, amounts, extraHeads, data.newHeads || []);
  return serializeFeeStructure(row);
}

export async function updateFeeStructure(
  institutionId: string,
  id: string,
  data: Partial<
    FeeAmountInput & FeeStructureExtras & {
      className: string;
      sectionName: string;
      frequency: string;
      studentId: string;
      studentName: string;
      admissionNumber: string;
      status: FeeStructureStatus;
      effectiveDate: string | null;
      remarks: string;
      headAmounts?: Record<string, number>;
      extraHeads?: Record<string, number>;
      newHeads?: NewHeadInput[];
    }
  >,
) {
  const existing = await prisma.feeStructure.findFirst({ where: { id, institutionId } });
  if (!existing) throw new Error('Fee structure not found');

  const { standard, extraHeads } = mergeStructureAmounts(data, existing);
  const amounts = {
    tuitionFee: round2(standard.tuitionFee ?? 0),
    admissionFee: round2(standard.admissionFee ?? 0),
    registrationFee: round2(standard.registrationFee ?? 0),
    librarySecurityDeposit: round2(standard.librarySecurityDeposit ?? 0),
    cautionMoney: round2(standard.cautionMoney ?? 0),
    computerLabFee: round2(standard.computerLabFee ?? 0),
    picnicFieldTrip: round2(standard.picnicFieldTrip ?? 0),
    addOnFee: round2(standard.addOnFee ?? 0),
    examinationFee: round2(standard.examinationFee ?? 0),
    annualCharges: round2(standard.annualCharges ?? 0),
    sportsFee: round2(standard.sportsFee ?? 0),
  };

  const row = await prisma.feeStructure.update({
    where: { id },
    data: {
      className: data.className?.trim(),
      sectionName: data.sectionName?.trim(),
      frequency: data.frequency,
      studentId: data.studentId,
      studentName: data.studentName,
      admissionNumber: data.admissionNumber,
      ...amounts,
      extraHeads: extraHeads as Prisma.InputJsonValue,
      totalAmount: computeTotalAmount({ ...amounts, extraHeads }),
      status: data.status,
      effectiveDate:
        data.effectiveDate === null
          ? null
          : data.effectiveDate
            ? new Date(data.effectiveDate)
            : undefined,
      remarks: data.remarks,
    },
  });

  await persistStructureSync(institutionId, amounts, extraHeads, data.newHeads || []);
  return serializeFeeStructure(row);
}

export async function importFeeStructuresFromSetup(institutionId: string, academicYear: string, createdBy: string) {
  const ctx = await loadFeeCollectionContext(institutionId);
  const schedules = ctx.schedules;
  if (!schedules.length) {
    return { created: 0, skipped: 0, message: 'No fee schedules found in Institution Setup' };
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const schedule of schedules) {
    const exists = await prisma.feeStructure.findFirst({
      where: {
        institutionId,
        academicYear,
        className: schedule.class,
        sectionName: schedule.section || 'A',
        studentId: '',
      },
    });
    if (exists) {
      const amounts: FeeAmountInput = {};
      for (const head of schedule.heads) {
        if (FEE_HEAD_KEYS.includes(head.key)) {
          (amounts as Record<string, number>)[head.key] = head.amount;
        }
      }
      await prisma.feeStructure.update({
        where: { id: exists.id },
        data: {
          frequency: schedule.frequency || exists.frequency,
          status: FeeStructureStatus.ACTIVE,
          ...amounts,
          totalAmount: schedule.heads.reduce((s, h) => s + h.amount, 0),
        },
      });
      updated += 1;
      continue;
    }

    const amounts: FeeAmountInput = {};
    for (const head of schedule.heads) {
      if (FEE_HEAD_KEYS.includes(head.key)) {
        (amounts as Record<string, number>)[head.key] = head.amount;
      }
    }

    await createFeeStructure(
      institutionId,
      {
        academicYear,
        className: schedule.class,
        sectionName: schedule.section || 'A',
        frequency: schedule.frequency || 'Yearly',
        status: FeeStructureStatus.ACTIVE,
        ...amounts,
      },
      createdBy,
    );
    created += 1;
  }

  return {
    created,
    updated,
    skipped,
    message:
      created > 0 || updated > 0
        ? `Imported ${created} and updated ${updated} fee structure(s) from Institution Setup`
        : 'All class structures already exist',
  };
}

export async function exportFeeStructures(institutionId: string, academicYear?: string) {
  const records = await listFeeStructures(institutionId, { academicYear });
  return {
    exportedAt: new Date().toISOString(),
    academicYear: academicYear || 'all',
    count: records.length,
    records,
    columns: [
      'recordId',
      'academicYear',
      'className',
      'sectionName',
      'frequency',
      'studentName',
      'admissionNumber',
      ...FEE_STRUCTURE_HEAD_FIELDS.map((h) => h.key),
      'totalAmount',
      'status',
      'effectiveDate',
    ],
    headLabels: FEE_STRUCTURE_HEAD_FIELDS.reduce(
      (acc, h) => {
        acc[h.key] = h.label;
        return acc;
      },
      { ...FEE_HEAD_LABELS } as Record<string, string>,
    ),
  };
}

export async function importFeeStructuresBatch(
  institutionId: string,
  rows: Array<Record<string, unknown>>,
  academicYear: string,
  createdBy: string,
) {
  let created = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const className = String(row.className || row.class || '').trim();
      if (!className) throw new Error('className is required');
      await createFeeStructure(
        institutionId,
        {
          academicYear: String(row.academicYear || academicYear),
          className,
          sectionName: String(row.sectionName || row.section || 'A'),
          frequency: String(row.frequency || 'Yearly'),
          studentName: String(row.studentName || ''),
          admissionNumber: String(row.admissionNumber || ''),
          tuitionFee: Number(row.tuitionFee) || 0,
          admissionFee: Number(row.admissionFee) || 0,
          registrationFee: Number(row.registrationFee) || 0,
          librarySecurityDeposit: Number(row.librarySecurityDeposit) || 0,
          cautionMoney: Number(row.cautionMoney) || 0,
          computerLabFee: Number(row.computerLabFee) || 0,
          picnicFieldTrip: Number(row.picnicFieldTrip) || 0,
          addOnFee: Number(row.addOnFee) || 0,
          examinationFee: Number(row.examinationFee) || 0,
          annualCharges: Number(row.annualCharges) || 0,
          sportsFee: Number(row.sportsFee) || 0,
          status: (row.status as FeeStructureStatus) || FeeStructureStatus.DRAFT,
          effectiveDate: row.effectiveDate ? String(row.effectiveDate) : undefined,
        },
        createdBy,
      );
      created += 1;
    } catch (e) {
      errors.push(`Row ${i + 1}: ${e instanceof Error ? e.message : 'Import failed'}`);
    }
  }

  return { created, errors };
}
