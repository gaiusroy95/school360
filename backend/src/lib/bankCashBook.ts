import { BankDepositStatus, FeePaymentMode } from '@prisma/client';
import { prisma } from './prisma.js';

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export const BANK_OPTIONS = ['SBI', 'HDFC', 'ICICI', 'Axis Bank', 'PNB', 'BOB', 'Canara Bank'];
export const CAMPUS_OPTIONS = ['Main Campus', 'North Campus', 'South Campus', 'Junior Wing'];
export const BRANCH_OPTIONS = ['Main Branch', 'City Branch', 'Suburban Branch'];

function dayRange(dateInput: string | Date) {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : new Date(dateInput);
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  return { start, end, dateOnly: start };
}

async function nextDepositId(institutionId: string, prefix: 'CD' | 'CH') {
  const count =
    prefix === 'CD'
      ? await prisma.bankCashDeposit.count({ where: { institutionId } })
      : await prisma.bankChequeDeposit.count({ where: { institutionId } });
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${String(count + 1).padStart(4, '0')}`;
}

export async function getCashCollectedForDate(
  institutionId: string,
  academicYear: string,
  collectionDate: string,
) {
  const { start, end } = dayRange(collectionDate);
  const [receipts, transport, hostel] = await Promise.all([
    prisma.feeReceipt.findMany({
      where: {
        institutionId,
        academicYear,
        paymentMode: FeePaymentMode.CASH,
        collectedAt: { gte: start, lte: end },
      },
    }),
    prisma.transportFeeCollection.findMany({
      where: {
        institutionId,
        academicYear,
        paymentMode: 'CASH',
        collectedAt: { gte: start, lte: end },
      },
    }),
    prisma.hostelFeeCollection.findMany({
      where: {
        institutionId,
        academicYear,
        paymentMode: 'CASH',
        collectedAt: { gte: start, lte: end },
      },
    }),
  ]);

  const total = round2(
    receipts.reduce((s, r) => s + r.amountPaid, 0) +
      transport.reduce((s, r) => s + r.amount, 0) +
      hostel.reduce((s, r) => s + r.amount, 0),
  );
  return total;
}

export async function getBankCashBookSummary(institutionId: string, academicYear?: string) {
  const year = academicYear || '2025-26';
  const [chequeDeposits, cashDeposits, chequeItems] = await Promise.all([
    prisma.bankChequeDeposit.findMany({
      where: { institutionId, academicYear: year },
      include: { items: true },
    }),
    prisma.bankCashDeposit.findMany({
      where: { institutionId, academicYear: year },
    }),
    prisma.bankChequeDepositItem.findMany({
      where: { deposit: { institutionId, academicYear: year } },
      include: { deposit: true },
    }),
  ]);

  const totalChequeAmount = round2(
    chequeDeposits
      .filter((d) => d.status !== BankDepositStatus.REJECTED)
      .reduce((s, d) => s + d.depositAmount, 0),
  );

  const totalCashDeposited = round2(
    cashDeposits
      .filter((d) => d.status === BankDepositStatus.APPROVED || d.status === BankDepositStatus.DEPOSITED)
      .reduce((s, d) => s + d.depositAmount, 0),
  );

  const totalCollectionDeposited = round2(
    cashDeposits
      .filter((d) => d.status !== BankDepositStatus.REJECTED)
      .reduce((s, d) => s + d.depositAmount, 0) +
      chequeDeposits
        .filter((d) => d.status !== BankDepositStatus.REJECTED)
        .reduce((s, d) => s + d.depositAmount, 0),
  );

  const totalChequeRealized = round2(
    chequeItems
      .filter((i) => i.status === BankDepositStatus.REALIZED || i.deposit.status === BankDepositStatus.REALIZED)
      .reduce((s, i) => s + i.amount, 0),
  );

  return {
    academicYear: year,
    totalChequeAmount,
    totalCashDeposited,
    totalCollectionDeposited,
    totalChequeRealized,
  };
}

function serializeCashDeposit(row: Awaited<ReturnType<typeof prisma.bankCashDeposit.findFirst>>) {
  if (!row) return null;
  return {
    id: row.id,
    type: 'CASH' as const,
    depositId: row.depositId,
    academicYear: row.academicYear,
    depositDate: row.depositDate.toISOString().slice(0, 10),
    depositTime: row.depositTime.toISOString(),
    campus: row.campus,
    branch: row.branch,
    cashierName: row.cashierName,
    depositBy: row.depositBy,
    bankName: row.bankName,
    bankAccount: row.bankAccount,
    depositSlipNo: row.depositSlipNo,
    depositAmount: row.depositAmount,
    depositType: row.depositType,
    collectionDate: row.collectionDate.toISOString().slice(0, 10),
    totalCashCollected: row.totalCashCollected,
    cashCounted: row.cashCounted,
    difference: row.difference,
    remarks: row.remarks,
    slipUploadName: row.slipUploadName,
    status: row.status,
    approvedBy: row.approvedBy,
    approvedAt: row.approvedAt?.toISOString() || null,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function serializeChequeDeposit(
  row: NonNullable<Awaited<ReturnType<typeof prisma.bankChequeDeposit.findFirst>>> & {
    items: Awaited<ReturnType<typeof prisma.bankChequeDepositItem.findMany>>;
  },
) {
  return {
    id: row.id,
    type: 'CHEQUE' as const,
    depositId: row.depositId,
    academicYear: row.academicYear,
    depositDate: row.depositDate.toISOString().slice(0, 10),
    bankName: row.bankName,
    branch: row.branch,
    depositSlipNo: row.depositSlipNo,
    depositAmount: row.depositAmount,
    totalCheques: row.totalCheques,
    depositBy: row.depositBy,
    remarks: row.remarks,
    status: row.status,
    approvedBy: row.approvedBy,
    approvedAt: row.approvedAt?.toISOString() || null,
    realizedAt: row.realizedAt?.toISOString() || null,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    items: row.items.map((i) => ({
      id: i.id,
      studentName: i.studentName,
      receiptNumber: i.receiptNumber,
      bankName: i.bankName,
      chequeNumber: i.chequeNumber,
      chequeBankBranch: i.chequeBankBranch,
      depositDate: i.depositDate.toISOString().slice(0, 10),
      amount: i.amount,
      status: i.status,
    })),
  };
}

export async function listBankCashBookDeposits(
  institutionId: string,
  opts?: { academicYear?: string; status?: BankDepositStatus; type?: 'CASH' | 'CHEQUE' },
) {
  const year = opts?.academicYear;
  const where = {
    institutionId,
    ...(year ? { academicYear: year } : {}),
    ...(opts?.status ? { status: opts.status } : {}),
  };

  const [cashRows, chequeRows] = await Promise.all([
    opts?.type === 'CHEQUE'
      ? []
      : prisma.bankCashDeposit.findMany({ where, orderBy: { updatedAt: 'desc' } }),
    opts?.type === 'CASH'
      ? []
      : prisma.bankChequeDeposit.findMany({
          where,
          include: { items: true },
          orderBy: { updatedAt: 'desc' },
        }),
  ]);

  const combined = [
    ...cashRows.map((r) => serializeCashDeposit(r)!),
    ...chequeRows.map((r) => serializeChequeDeposit(r)),
  ].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return combined;
}

export async function listDepositHistory(institutionId: string, academicYear?: string) {
  const items = await prisma.bankChequeDepositItem.findMany({
    where: {
      deposit: {
        institutionId,
        ...(academicYear ? { academicYear } : {}),
      },
    },
    include: { deposit: true },
    orderBy: { depositDate: 'desc' },
    take: 100,
  });

  return items.map((i) => ({
    id: i.id,
    studentName: i.studentName,
    receiptNumber: i.receiptNumber,
    bankName: i.bankName || i.deposit.bankName,
    chequeNumber: i.chequeNumber,
    depositDate: i.depositDate.toISOString().slice(0, 10),
    amount: i.amount,
    status: i.status,
    depositId: i.deposit.depositId,
  }));
}

export async function getBankCashBookMeta(institutionId: string) {
  const employees = await prisma.payrollEmployee.findMany({
    where: { institutionId, status: 'ACTIVE' },
    select: { fullName: true, employeeCode: true },
    orderBy: { fullName: 'asc' },
    take: 50,
  });

  return {
    banks: BANK_OPTIONS,
    campuses: CAMPUS_OPTIONS,
    branches: BRANCH_OPTIONS,
    employees: employees.map((e) => ({ label: e.fullName, value: e.fullName, code: e.employeeCode })),
    bankAccounts: BANK_OPTIONS.map((b) => ({ bank: b, account: `${b} — Current A/c` })),
  };
}

export async function createCashDeposit(
  institutionId: string,
  actorName: string,
  data: {
    academicYear?: string;
    depositDate: string;
    campus?: string;
    branch?: string;
    depositBy?: string;
    bankName?: string;
    bankAccount?: string;
    depositSlipNo?: string;
    depositAmount: number;
    collectionDate: string;
    cashCounted?: number;
    remarks?: string;
    slipUploadName?: string;
  },
) {
  const academicYear = data.academicYear || '2025-26';
  const depositId = await nextDepositId(institutionId, 'CD');
  const totalCashCollected = await getCashCollectedForDate(
    institutionId,
    academicYear,
    data.collectionDate,
  );
  const cashCounted = round2(data.cashCounted ?? data.depositAmount);
  const difference = round2(cashCounted - data.depositAmount);

  const row = await prisma.bankCashDeposit.create({
    data: {
      institutionId,
      depositId,
      academicYear,
      depositDate: dayRange(data.depositDate).dateOnly,
      campus: data.campus || 'Main Campus',
      branch: data.branch || 'Main Branch',
      cashierName: actorName,
      depositBy: data.depositBy || actorName,
      bankName: data.bankName || '',
      bankAccount: data.bankAccount || '',
      depositSlipNo: data.depositSlipNo || '',
      depositAmount: round2(data.depositAmount),
      collectionDate: dayRange(data.collectionDate).dateOnly,
      totalCashCollected,
      cashCounted,
      difference,
      remarks: data.remarks || '',
      slipUploadName: data.slipUploadName || '',
      createdBy: actorName,
    },
  });

  return serializeCashDeposit(row)!;
}

export async function createChequeDeposit(
  institutionId: string,
  actorName: string,
  data: {
    academicYear?: string;
    depositDate: string;
    bankName?: string;
    branch?: string;
    depositSlipNo?: string;
    depositBy?: string;
    remarks?: string;
    items: Array<{
      studentName?: string;
      receiptNumber?: string;
      bankName?: string;
      chequeNumber?: string;
      chequeBankBranch?: string;
      amount: number;
    }>;
  },
) {
  const academicYear = data.academicYear || '2025-26';
  const depositId = await nextDepositId(institutionId, 'CH');
  const depositAmount = round2(data.items.reduce((s, i) => s + (Number(i.amount) || 0), 0));
  const { dateOnly } = dayRange(data.depositDate);

  const row = await prisma.bankChequeDeposit.create({
    data: {
      institutionId,
      depositId,
      academicYear,
      depositDate: dateOnly,
      bankName: data.bankName || '',
      branch: data.branch || '',
      depositSlipNo: data.depositSlipNo || '',
      depositAmount,
      totalCheques: data.items.length,
      depositBy: data.depositBy || actorName,
      remarks: data.remarks || '',
      status: BankDepositStatus.DEPOSITED,
      createdBy: actorName,
      items: {
        create: data.items.map((item) => ({
          studentName: item.studentName || '',
          receiptNumber: item.receiptNumber || '',
          bankName: item.bankName || data.bankName || '',
          chequeNumber: item.chequeNumber || '',
          chequeBankBranch: item.chequeBankBranch || '',
          depositDate: dateOnly,
          amount: round2(item.amount),
          status: BankDepositStatus.DEPOSITED,
        })),
      },
    },
    include: { items: true },
  });

  return serializeChequeDeposit(row);
}

export async function approveCashDeposit(institutionId: string, id: string, actorName: string) {
  const row = await prisma.bankCashDeposit.findFirst({ where: { id, institutionId } });
  if (!row) throw new Error('Cash deposit not found');
  if (row.status !== BankDepositStatus.PENDING) {
    throw new Error('Only pending cash deposits can be approved');
  }

  const updated = await prisma.bankCashDeposit.update({
    where: { id },
    data: {
      status: BankDepositStatus.APPROVED,
      approvedBy: actorName,
      approvedAt: new Date(),
    },
  });
  return serializeCashDeposit(updated)!;
}

export async function realizeChequeDeposit(institutionId: string, id: string, actorName: string) {
  const row = await prisma.bankChequeDeposit.findFirst({
    where: { id, institutionId },
    include: { items: true },
  });
  if (!row) throw new Error('Cheque deposit not found');

  const updated = await prisma.$transaction(async (tx) => {
    await tx.bankChequeDepositItem.updateMany({
      where: { depositId: id },
      data: { status: BankDepositStatus.REALIZED },
    });
    return tx.bankChequeDeposit.update({
      where: { id },
      data: {
        status: BankDepositStatus.REALIZED,
        approvedBy: actorName,
        approvedAt: new Date(),
        realizedAt: new Date(),
      },
      include: { items: true },
    });
  });

  return serializeChequeDeposit(updated);
}

export async function exportBankCashBook(institutionId: string, academicYear?: string) {
  const deposits = await listBankCashBookDeposits(institutionId, { academicYear });
  const history = await listDepositHistory(institutionId, academicYear);
  const summary = await getBankCashBookSummary(institutionId, academicYear);
  return {
    exportedAt: new Date().toISOString(),
    academicYear: academicYear || '2025-26',
    summary,
    deposits,
    history,
  };
}

export async function importBankCashBookBatch(
  institutionId: string,
  actorName: string,
  rows: Array<Record<string, unknown>>,
) {
  let imported = 0;
  for (const row of rows) {
    const type = String(row.type || row.Type || '').toUpperCase();
    if (type === 'CASH' || type === 'CASH DEPOSIT') {
      await createCashDeposit(institutionId, actorName, {
        depositDate: String(row.depositDate || row['Deposit Date'] || new Date().toISOString().slice(0, 10)),
        collectionDate: String(row.collectionDate || row['Collection Date'] || new Date().toISOString().slice(0, 10)),
        depositAmount: Number(row.depositAmount || row.Amount || 0),
        bankName: String(row.bankName || row.Bank || ''),
        depositSlipNo: String(row.depositSlipNo || row['Deposit Slip No'] || ''),
        campus: String(row.campus || ''),
        branch: String(row.branch || ''),
        depositBy: String(row.depositBy || ''),
        remarks: String(row.remarks || ''),
      });
      imported += 1;
    }
  }
  return { imported, total: rows.length };
}

export async function previewCashCollection(
  institutionId: string,
  academicYear: string,
  collectionDate: string,
) {
  const total = await getCashCollectedForDate(institutionId, academicYear, collectionDate);
  return { collectionDate, academicYear, totalCashCollected: total };
}
