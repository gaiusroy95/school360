import { FeeStructureStatus, Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { FEE_HEAD_KEYS, FEE_HEAD_LABELS, loadFeeCollectionContext } from './feeConfig.js';

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export const FEE_STRUCTURE_FREQUENCIES = ['Monthly', 'Quarterly', 'Yearly', 'One-time'] as const;

export const FEE_STRUCTURE_HEAD_FIELDS = [
  { key: 'tuitionFee', label: 'Tuition Fee', refundable: false },
  { key: 'admissionFee', label: 'Admission Fee', refundable: false },
  { key: 'registrationFee', label: 'Registration Fee', refundable: false },
  { key: 'librarySecurityDeposit', label: 'Library Security Deposit (Refundable)', refundable: true },
  { key: 'cautionMoney', label: 'Caution Money (Refundable)', refundable: true },
  { key: 'computerLabFee', label: 'Computer Lab Fee', refundable: false },
  { key: 'picnicFieldTrip', label: 'Picnic / Field Trip', refundable: false },
  { key: 'addOnFee', label: 'Add-on Fee', refundable: false },
  { key: 'examinationFee', label: 'Examination Fee', refundable: false },
  { key: 'annualCharges', label: 'Annual Charges', refundable: false },
  { key: 'sportsFee', label: 'Sports Fee', refundable: false },
] as const;

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

function computeTotalAmount(data: FeeAmountInput) {
  return round2(
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
    totalAmount: row.totalAmount,
    status: row.status,
    effectiveDate: row.effectiveDate ? row.effectiveDate.toISOString().slice(0, 10) : null,
    displayDate: (row.effectiveDate || row.createdAt).toISOString().slice(0, 10),
    remarks: row.remarks,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    feeHeads: FEE_STRUCTURE_HEAD_FIELDS.map((h) => ({
      key: h.key,
      label: h.label,
      refundable: h.refundable,
      amount: row[h.key as keyof typeof row] as number,
    })).filter((h) => h.amount > 0),
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
  const [classCount, structureCount, pendingCount, activeCount] = await Promise.all([
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
  ]);

  return {
    academicYear,
    totalClasses: classCount,
    structuresCreated: structureCount,
    pendingCount,
    activeCount,
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
  data: FeeAmountInput & {
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
  },
  createdBy: string,
) {
  const className = data.className?.trim();
  if (!className) throw new Error('Class is required');

  const amounts = {
    tuitionFee: round2(data.tuitionFee ?? 0),
    admissionFee: round2(data.admissionFee ?? 0),
    registrationFee: round2(data.registrationFee ?? 0),
    librarySecurityDeposit: round2(data.librarySecurityDeposit ?? 0),
    cautionMoney: round2(data.cautionMoney ?? 0),
    computerLabFee: round2(data.computerLabFee ?? 0),
    picnicFieldTrip: round2(data.picnicFieldTrip ?? 0),
    addOnFee: round2(data.addOnFee ?? 0),
    examinationFee: round2(data.examinationFee ?? 0),
    annualCharges: round2(data.annualCharges ?? 0),
    sportsFee: round2(data.sportsFee ?? 0),
  };
  const totalAmount = computeTotalAmount(amounts);
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
      totalAmount,
      status: data.status ?? FeeStructureStatus.DRAFT,
      effectiveDate: data.effectiveDate ? new Date(data.effectiveDate) : new Date(),
      remarks: data.remarks ?? '',
      createdBy,
    },
  });
  return serializeFeeStructure(row);
}

export async function updateFeeStructure(
  institutionId: string,
  id: string,
  data: Partial<
    FeeAmountInput & {
      className: string;
      sectionName: string;
      frequency: string;
      studentId: string;
      studentName: string;
      admissionNumber: string;
      status: FeeStructureStatus;
      effectiveDate: string | null;
      remarks: string;
    }
  >,
) {
  const existing = await prisma.feeStructure.findFirst({ where: { id, institutionId } });
  if (!existing) throw new Error('Fee structure not found');

  const amounts = {
    tuitionFee: data.tuitionFee != null ? round2(data.tuitionFee) : existing.tuitionFee,
    admissionFee: data.admissionFee != null ? round2(data.admissionFee) : existing.admissionFee,
    registrationFee:
      data.registrationFee != null ? round2(data.registrationFee) : existing.registrationFee,
    librarySecurityDeposit:
      data.librarySecurityDeposit != null
        ? round2(data.librarySecurityDeposit)
        : existing.librarySecurityDeposit,
    cautionMoney: data.cautionMoney != null ? round2(data.cautionMoney) : existing.cautionMoney,
    computerLabFee:
      data.computerLabFee != null ? round2(data.computerLabFee) : existing.computerLabFee,
    picnicFieldTrip:
      data.picnicFieldTrip != null ? round2(data.picnicFieldTrip) : existing.picnicFieldTrip,
    addOnFee: data.addOnFee != null ? round2(data.addOnFee) : existing.addOnFee,
    examinationFee:
      data.examinationFee != null ? round2(data.examinationFee) : existing.examinationFee,
    annualCharges:
      data.annualCharges != null ? round2(data.annualCharges) : existing.annualCharges,
    sportsFee: data.sportsFee != null ? round2(data.sportsFee) : existing.sportsFee,
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
      totalAmount: computeTotalAmount(amounts),
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
  return serializeFeeStructure(row);
}

export async function importFeeStructuresFromSetup(institutionId: string, academicYear: string, createdBy: string) {
  const ctx = await loadFeeCollectionContext(institutionId);
  const schedules = ctx.schedules;
  if (!schedules.length) {
    return { created: 0, skipped: 0, message: 'No fee schedules found in Institution Setup' };
  }

  let created = 0;
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
      skipped += 1;
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
    skipped,
    message:
      created > 0
        ? `Imported ${created} fee structure(s) from Institution Setup`
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
