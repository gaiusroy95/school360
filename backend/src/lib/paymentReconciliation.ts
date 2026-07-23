import {
  FeeFineLevyStatus,
  FeePaymentMode,
  PaymentOrderStatus,
  PaymentReconciliationAction,
  PaymentReconciliationStage,
  PaymentReconciliationStatus,
  PayrollSlipStatus,
  Prisma,
  type Prisma as PrismaTypes,
} from '@prisma/client';
import { prisma } from './prisma.js';
import { ONLINE_PAYMENT_CATEGORIES } from './onlinePayments.js';

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export type CollectionPaymentMode =
  | 'cash'
  | 'online'
  | 'cheque'
  | 'bankTransfer'
  | 'upi'
  | 'pos';

export type CollectionCategory =
  | 'studentFee'
  | 'hostelFee'
  | 'transportFee'
  | 'admissionFee'
  | 'examinationFee'
  | 'libraryFee'
  | 'fineCollection'
  | 'otherCollection';

type CollectionMatrix = Record<CollectionCategory, Record<CollectionPaymentMode, number>>;

export const RECONCILIATION_STAGES: Array<{
  key: PaymentReconciliationStage;
  label: string;
  order: number;
}> = [
  { key: 'CASHIER', label: 'Cashier', order: 0 },
  { key: 'ACCOUNTS_EXECUTIVE', label: 'Accounts Executive', order: 1 },
  { key: 'ACCOUNTS_MANAGER', label: 'Accounts Manager', order: 2 },
  { key: 'FINANCE_HEAD', label: 'Finance Head', order: 3 },
  { key: 'PRINCIPAL_DIRECTOR', label: 'Principal / Director', order: 4 },
  { key: 'COMPLETED', label: 'Day Closing Completed', order: 5 },
];

const APPROVAL_FLOW: PaymentReconciliationStage[] = [
  'ACCOUNTS_EXECUTIVE',
  'ACCOUNTS_MANAGER',
  'FINANCE_HEAD',
  'PRINCIPAL_DIRECTOR',
  'COMPLETED',
];

function emptyCollectionMatrix(): CollectionMatrix {
  const m = {} as CollectionMatrix;
  for (const cat of ONLINE_PAYMENT_CATEGORIES) {
    m[cat.key as CollectionCategory] = {
      cash: 0,
      online: 0,
      cheque: 0,
      bankTransfer: 0,
      upi: 0,
      pos: 0,
    };
  }
  return m;
}

function feeHeadToCategory(headKey: string): CollectionCategory {
  const k = headKey.toLowerCase();
  if (k.includes('hostel') || k === 'hostelfee' || k === 'messfee') return 'hostelFee';
  if (k.includes('transport')) return 'transportFee';
  if (k.includes('admission')) return 'admissionFee';
  if (k.includes('exam')) return 'examinationFee';
  if (k.includes('library')) return 'libraryFee';
  if (k.includes('fine') || k.includes('penalty')) return 'fineCollection';
  if (
    k.includes('tuition') ||
    k.includes('registration') ||
    k.includes('annual') ||
    k.includes('sports') ||
    k.includes('development')
  ) {
    return 'studentFee';
  }
  return 'otherCollection';
}

function feePaymentModeToCollection(mode: FeePaymentMode | string): CollectionPaymentMode | null {
  const m = String(mode).toUpperCase();
  if (m === 'CASH') return 'cash';
  if (m === 'UPI') return 'upi';
  if (m === 'CARD') return 'pos';
  if (m === 'CHEQUE') return 'cheque';
  if (m === 'BANK_TRANSFER' || m === 'BANK TRANSFER') return 'bankTransfer';
  return 'online';
}

function paymentModeStringToCollection(mode: string): CollectionPaymentMode | null {
  const m = mode.trim().toUpperCase();
  if (m === 'CASH') return 'cash';
  if (m === 'UPI') return 'upi';
  if (m === 'CARD' || m === 'POS') return 'pos';
  if (m === 'CHEQUE') return 'cheque';
  if (m === 'BANK_TRANSFER' || m === 'BANK TRANSFER') return 'bankTransfer';
  if (m === 'ONLINE') return 'online';
  return 'online';
}

function addCollection(
  matrix: CollectionMatrix,
  category: CollectionCategory,
  mode: CollectionPaymentMode,
  amount: number,
) {
  matrix[category][mode] = round2(matrix[category][mode] + amount);
}

function dayRange(dateInput: string | Date) {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : new Date(dateInput);
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  return { start, end, dateOnly: start };
}

function previousDate(dateInput: string | Date) {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : new Date(dateInput);
  const prev = new Date(d);
  prev.setDate(prev.getDate() - 1);
  return prev;
}

function formatDateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

export type ReconciliationManualInputs = {
  bankStatementTotal: number;
  cashCount: number;
  gatewaySettlement: number;
  cashDepositedToBank: number;
  cashWithdrawnFromBank: number;
  cashPayments: number;
  bankCharges: number;
  openingPettyCash: number;
  previousDayOutstanding: number;
  principalRequired: boolean;
  remarks: string;
};

export type ReconciliationReport = {
  date: string;
  academicYear: string;
  openings: Array<{ label: string; amount: number }>;
  cashMovement: Array<{ label: string; amount: number; rowType: 'item' | 'total' }>;
  bankMovement: Array<{ label: string; amount: number; rowType: 'item' | 'total' }>;
  collectionSummary: Array<{
    category: string;
    label: string;
    cash: number;
    online: number;
    cheque: number;
    bankTransfer: number;
    upi: number;
    pos: number;
    total: number;
  }>;
  reconciliationSummary: Array<{ label: string; amount: number; highlight?: boolean }>;
  systemVerification: Array<{ label: string; amount: number; highlight?: boolean }>;
  totalAvailableFunds: number;
  totals: {
    cashCollection: number;
    onlineCollection: number;
    bankTransferReceived: number;
    chequeCleared: number;
    totalCreditCollection: number;
    totalDebitPayment: number;
    closingCashInHand: number;
    closingBankBalance: number;
    erpTotalCollection: number;
    expectedBalance: number;
    actualBalance: number;
    difference: number;
  };
};

async function aggregateCollections(
  institutionId: string,
  academicYear: string,
  start: Date,
  end: Date,
) {
  const matrix = emptyCollectionMatrix();

  const receipts = await prisma.feeReceipt.findMany({
    where: { institutionId, academicYear, collectedAt: { gte: start, lte: end } },
  });

  for (const r of receipts) {
    const mode = feePaymentModeToCollection(r.paymentMode);
    if (!mode) continue;
    const breakdown = Array.isArray(r.feeBreakdown) ? r.feeBreakdown : [];
    if (breakdown.length === 0) {
      addCollection(matrix, 'studentFee', mode, r.amountPaid);
      continue;
    }
    for (const item of breakdown) {
      const row = item as { key?: string; amount?: number };
      const amount = Number(row.amount) || 0;
      if (amount <= 0) continue;
      addCollection(matrix, feeHeadToCategory(String(row.key || '')), mode, amount);
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
    const mode = paymentModeStringToCollection(t.paymentMode);
    if (!mode) continue;
    addCollection(matrix, 'transportFee', mode, t.amount);
  }

  for (const h of hostelRows) {
    const mode = paymentModeStringToCollection(h.paymentMode);
    if (!mode) continue;
    addCollection(matrix, 'hostelFee', mode, h.amount);
  }

  for (const o of paidOrders) {
    addCollection(matrix, feeHeadToCategory(o.feeDue.feeHead), 'online', o.amount);
  }

  for (const f of paidFines) {
    addCollection(matrix, 'fineCollection', 'cash', f.amount);
  }

  return matrix;
}

function sumMatrixMode(matrix: CollectionMatrix, mode: CollectionPaymentMode) {
  return round2(
    ONLINE_PAYMENT_CATEGORIES.reduce(
      (s, cat) => s + matrix[cat.key as CollectionCategory][mode],
      0,
    ),
  );
}

function sumMatrixAll(matrix: CollectionMatrix) {
  return round2(
    ONLINE_PAYMENT_CATEGORIES.reduce((s, cat) => {
      const row = matrix[cat.key as CollectionCategory];
      return s + row.cash + row.online + row.cheque + row.bankTransfer + row.upi + row.pos;
    }, 0),
  );
}

async function getPreviousClosingBalances(institutionId: string, date: Date) {
  const prev = await prisma.paymentReconciliation.findFirst({
    where: {
      institutionId,
      reconciliationDate: previousDate(date),
      status: PaymentReconciliationStatus.DAY_CLOSING_COMPLETED,
    },
  });

  if (prev?.snapshot && typeof prev.snapshot === 'object') {
    const snap = prev.snapshot as { totals?: { closingCashInHand?: number; closingBankBalance?: number } };
    return {
      openingCash: round2(snap.totals?.closingCashInHand || 0),
      openingBank: round2(snap.totals?.closingBankBalance || 0),
    };
  }

  return { openingCash: 0, openingBank: 0 };
}

export async function buildReconciliationReport(
  institutionId: string,
  dateInput: string,
  academicYear: string,
  manual: Partial<ReconciliationManualInputs> = {},
): Promise<ReconciliationReport> {
  const { start, end, dateOnly } = dayRange(dateInput);
  const date = formatDateKey(dateOnly);

  const matrix = await aggregateCollections(institutionId, academicYear, start, end);
  const { openingCash, openingBank } = await getPreviousClosingBalances(institutionId, dateOnly);

  const cashCollection = sumMatrixMode(matrix, 'cash');
  const onlineCollection = sumMatrixMode(matrix, 'online');
  const bankTransferReceived = sumMatrixMode(matrix, 'bankTransfer');
  const chequeCleared = sumMatrixMode(matrix, 'cheque');
  const upiCollection = sumMatrixMode(matrix, 'upi');
  const posCollection = sumMatrixMode(matrix, 'pos');
  const erpTotalCollection = sumMatrixAll(matrix);

  const cashDepositedToBank = round2(manual.cashDepositedToBank || 0);
  const cashWithdrawnFromBank = round2(manual.cashWithdrawnFromBank || 0);
  const cashPayments = round2(manual.cashPayments || 0);
  const bankCharges = round2(manual.bankCharges || 0);
  const openingPettyCash = round2(manual.openingPettyCash || 0);
  const previousDayOutstanding = round2(manual.previousDayOutstanding || 0);
  const bankStatementTotal = round2(manual.bankStatementTotal || 0);
  const cashCount = round2(manual.cashCount || 0);
  const gatewaySettlement = round2(manual.gatewaySettlement || 0);

  const [vendorPayments, salaryPayments, onlineRefunds] = await Promise.all([
    prisma.transportVendorPayment.findMany({
      where: { institutionId, paymentDate: dateOnly },
    }),
    prisma.payrollSlip.findMany({
      where: {
        institutionId,
        status: PayrollSlipStatus.PAID,
        paidAt: { gte: start, lte: end },
      },
    }),
    prisma.feeRefund.findMany({
      where: {
        institutionId,
        academicYear,
        status: 'PROCESSED',
        processedAt: { gte: start, lte: end },
      },
    }),
  ]);

  const vendorPaymentTotal = round2(vendorPayments.reduce((s, v) => s + v.amount, 0));
  const salaryPaymentTotal = round2(salaryPayments.reduce((s, v) => s + v.netPay, 0));
  const onlineRefundTotal = round2(onlineRefunds.reduce((s, v) => s + v.amount, 0));

  const closingCashInHand = round2(
    openingCash + cashCollection - cashPayments - cashDepositedToBank + cashWithdrawnFromBank,
  );
  const closingBankBalance = round2(
    openingBank +
      onlineCollection +
      upiCollection +
      posCollection +
      bankTransferReceived +
      chequeCleared +
      cashDepositedToBank -
      onlineRefundTotal -
      vendorPaymentTotal -
      salaryPaymentTotal -
      bankCharges,
  );

  const totalCreditCollection = erpTotalCollection;
  const totalDebitPayment = round2(
    cashPayments + onlineRefundTotal + vendorPaymentTotal + salaryPaymentTotal + bankCharges,
  );
  const totalAvailableFunds = round2(closingCashInHand + closingBankBalance);
  const ledgerBalance = totalAvailableFunds;
  const expectedBalance = round2(openingCash + openingBank + totalCreditCollection - totalDebitPayment);
  const actualBalance = round2(bankStatementTotal + cashCount);
  const difference = round2(actualBalance - expectedBalance);

  const collectionSummary = ONLINE_PAYMENT_CATEGORIES.map((cat) => {
    const row = matrix[cat.key as CollectionCategory];
    const total = round2(
      row.cash + row.online + row.cheque + row.bankTransfer + row.upi + row.pos,
    );
    return {
      category: cat.key,
      label: cat.label,
      ...row,
      total,
    };
  });

  return {
    date,
    academicYear,
    openings: [
      { label: 'Opening Cash in Hand', amount: openingCash },
      { label: 'Opening Bank Balance', amount: openingBank },
      { label: 'Opening Petty Cash', amount: openingPettyCash },
      { label: 'Previous Day Outstanding', amount: previousDayOutstanding },
    ],
    cashMovement: [
      { label: 'Opening Cash', amount: openingCash, rowType: 'item' },
      { label: '+ Cash Collection', amount: cashCollection, rowType: 'item' },
      { label: '- Cash Payments', amount: cashPayments, rowType: 'item' },
      { label: '- Cash Deposited to Bank', amount: cashDepositedToBank, rowType: 'item' },
      { label: '+ Cash Withdrawn from Bank', amount: cashWithdrawnFromBank, rowType: 'item' },
      { label: '= Closing Cash in Hand', amount: closingCashInHand, rowType: 'total' },
    ],
    bankMovement: [
      { label: 'Opening Bank Balance', amount: openingBank, rowType: 'item' },
      { label: '+ Online Collection', amount: round2(onlineCollection + upiCollection + posCollection), rowType: 'item' },
      { label: '+ Bank Transfer Received', amount: bankTransferReceived, rowType: 'item' },
      { label: '+ Cheque Cleared', amount: chequeCleared, rowType: 'item' },
      { label: '+ Cash Deposited', amount: cashDepositedToBank, rowType: 'item' },
      { label: '- Online Refund', amount: onlineRefundTotal, rowType: 'item' },
      { label: '- Vendor Payments', amount: vendorPaymentTotal, rowType: 'item' },
      { label: '- Salary Payment', amount: salaryPaymentTotal, rowType: 'item' },
      { label: '- Bank Charges', amount: bankCharges, rowType: 'item' },
      { label: '= Closing Bank Balance', amount: closingBankBalance, rowType: 'total' },
    ],
    collectionSummary,
    reconciliationSummary: [
      { label: 'Opening Cash', amount: openingCash },
      { label: 'Opening Bank', amount: openingBank },
      { label: 'Total Credit Collection', amount: totalCreditCollection },
      { label: 'Total Debit Payment', amount: totalDebitPayment },
      { label: 'Cash Deposit to Bank', amount: cashDepositedToBank },
      { label: 'Cash Withdrawal from Bank', amount: cashWithdrawnFromBank },
      { label: 'Current Cash in Hand', amount: closingCashInHand },
      { label: 'Current Bank Balance', amount: closingBankBalance },
      {
        label: 'Total Available Funds',
        amount: totalAvailableFunds,
        highlight: true,
      },
    ],
    systemVerification: [
      { label: 'ERP Total Collection', amount: erpTotalCollection },
      { label: 'Bank Statement Total', amount: bankStatementTotal },
      { label: 'Cash Count', amount: cashCount },
      { label: 'Gateway Settlement', amount: gatewaySettlement },
      { label: 'Ledger Balance', amount: ledgerBalance },
      { label: 'Expected Balance', amount: expectedBalance },
      { label: 'Actual Balance', amount: actualBalance },
      { label: 'Difference', amount: difference, highlight: true },
    ],
    totalAvailableFunds,
    totals: {
      cashCollection,
      onlineCollection: round2(onlineCollection + upiCollection + posCollection),
      bankTransferReceived,
      chequeCleared,
      totalCreditCollection,
      totalDebitPayment,
      closingCashInHand,
      closingBankBalance,
      erpTotalCollection,
      expectedBalance,
      actualBalance,
      difference,
    },
  };
}

function manualFromRecord(
  record: PrismaTypes.PaymentReconciliationGetPayload<{ include: { approvals: true } }>,
): ReconciliationManualInputs {
  return {
    bankStatementTotal: record.bankStatementTotal,
    cashCount: record.cashCount,
    gatewaySettlement: record.gatewaySettlement,
    cashDepositedToBank: record.cashDepositedToBank,
    cashWithdrawnFromBank: record.cashWithdrawnFromBank,
    cashPayments: record.cashPayments,
    bankCharges: record.bankCharges,
    openingPettyCash: record.openingPettyCash,
    previousDayOutstanding: record.previousDayOutstanding,
    principalRequired: record.principalRequired,
    remarks: record.remarks,
  };
}

function serializeRecord(
  record: PrismaTypes.PaymentReconciliationGetPayload<{ include: { approvals: true } }>,
  report: ReconciliationReport,
) {
  return {
    id: record.id,
    reconciliationDate: formatDateKey(record.reconciliationDate),
    academicYear: record.academicYear,
    status: record.status,
    currentStage: record.currentStage,
    bankStatementTotal: record.bankStatementTotal,
    cashCount: record.cashCount,
    gatewaySettlement: record.gatewaySettlement,
    cashDepositedToBank: record.cashDepositedToBank,
    cashWithdrawnFromBank: record.cashWithdrawnFromBank,
    cashPayments: record.cashPayments,
    bankCharges: record.bankCharges,
    openingPettyCash: record.openingPettyCash,
    previousDayOutstanding: record.previousDayOutstanding,
    principalRequired: record.principalRequired,
    remarks: record.remarks,
    frozenAt: record.frozenAt?.toISOString() || null,
    frozenBy: record.frozenBy,
    completedAt: record.completedAt?.toISOString() || null,
    submittedBy: record.submittedBy,
    submittedAt: record.submittedAt?.toISOString() || null,
    pdfGeneratedAt: record.pdfGeneratedAt?.toISOString() || null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    approvals: record.approvals
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((a) => ({
        id: a.id,
        stage: a.stage,
        action: a.action,
        actorName: a.actorName,
        actorRole: a.actorRole,
        remarks: a.remarks,
        digitalSignature: a.digitalSignature,
        signedAt: a.signedAt.toISOString(),
      })),
    report,
    workflow: RECONCILIATION_STAGES,
  };
}

export async function getOrCreateReconciliation(
  institutionId: string,
  dateInput: string,
  academicYear?: string,
) {
  const { dateOnly } = dayRange(dateInput);
  const year = academicYear || '2025-26';

  let record = await prisma.paymentReconciliation.findUnique({
    where: {
      institutionId_reconciliationDate: {
        institutionId,
        reconciliationDate: dateOnly,
      },
    },
    include: { approvals: true },
  });

  if (!record) {
    record = await prisma.paymentReconciliation.create({
      data: {
        institutionId,
        reconciliationDate: dateOnly,
        academicYear: year,
      },
      include: { approvals: true },
    });
  }

  const useSnapshot =
    record.snapshot &&
    (record.status === PaymentReconciliationStatus.FROZEN ||
      record.status === PaymentReconciliationStatus.PENDING_APPROVAL ||
      record.status === PaymentReconciliationStatus.DAY_CLOSING_COMPLETED);

  const report = useSnapshot
    ? (record.snapshot as ReconciliationReport)
    : await buildReconciliationReport(institutionId, dateInput, record.academicYear, manualFromRecord(record));

  return serializeRecord(record, report);
}

export async function updateReconciliationInputs(
  institutionId: string,
  id: string,
  data: Partial<ReconciliationManualInputs>,
) {
  const record = await prisma.paymentReconciliation.findFirst({
    where: { id, institutionId },
    include: { approvals: true },
  });
  if (!record) throw new Error('Reconciliation not found');
  if (
    record.status !== PaymentReconciliationStatus.DRAFT &&
    record.status !== PaymentReconciliationStatus.RETURNED
  ) {
    throw new Error('Only draft or returned reconciliations can be edited');
  }

  const updated = await prisma.paymentReconciliation.update({
    where: { id },
    data: {
      bankStatementTotal: data.bankStatementTotal,
      cashCount: data.cashCount,
      gatewaySettlement: data.gatewaySettlement,
      cashDepositedToBank: data.cashDepositedToBank,
      cashWithdrawnFromBank: data.cashWithdrawnFromBank,
      cashPayments: data.cashPayments,
      bankCharges: data.bankCharges,
      openingPettyCash: data.openingPettyCash,
      previousDayOutstanding: data.previousDayOutstanding,
      principalRequired: data.principalRequired,
      remarks: data.remarks,
    },
    include: { approvals: true },
  });

  const report = await buildReconciliationReport(
    institutionId,
    formatDateKey(updated.reconciliationDate),
    updated.academicYear,
    manualFromRecord(updated),
  );

  return serializeRecord(updated, report);
}

function nextStage(
  current: PaymentReconciliationStage,
  principalRequired: boolean,
): PaymentReconciliationStage {
  const idx = APPROVAL_FLOW.indexOf(current);
  if (idx < 0) return 'ACCOUNTS_EXECUTIVE';
  let next = APPROVAL_FLOW[idx + 1] || 'COMPLETED';
  if (next === 'PRINCIPAL_DIRECTOR' && !principalRequired) {
    next = 'COMPLETED';
  }
  return next;
}

export async function submitReconciliationForApproval(
  institutionId: string,
  id: string,
  actorName: string,
  opts?: { remarks?: string; digitalSignature?: string },
) {
  const record = await prisma.paymentReconciliation.findFirst({
    where: { id, institutionId },
    include: { approvals: true },
  });
  if (!record) throw new Error('Reconciliation not found');
  if (
    record.status !== PaymentReconciliationStatus.DRAFT &&
    record.status !== PaymentReconciliationStatus.RETURNED
  ) {
    throw new Error('Only draft or returned reconciliations can be submitted');
  }

  const report = await buildReconciliationReport(
    institutionId,
    formatDateKey(record.reconciliationDate),
    record.academicYear,
    manualFromRecord(record),
  );

  const signature =
    opts?.digitalSignature?.trim() ||
    `${actorName} — ${new Date().toLocaleString('en-IN')}`;

  const updated = await prisma.$transaction(async (tx) => {
    await tx.paymentReconciliationApproval.create({
      data: {
        reconciliationId: id,
        stage: 'CASHIER',
        action: PaymentReconciliationAction.SUBMIT,
        actorName,
        actorRole: 'Cashier',
        remarks: opts?.remarks || 'Submitted for approval',
        digitalSignature: signature,
      },
    });

    return tx.paymentReconciliation.update({
      where: { id },
      data: {
        status: PaymentReconciliationStatus.PENDING_APPROVAL,
        currentStage: 'ACCOUNTS_EXECUTIVE',
        snapshot: report as unknown as Prisma.InputJsonValue,
        frozenAt: new Date(),
        frozenBy: actorName,
        submittedBy: actorName,
        submittedAt: new Date(),
      },
      include: { approvals: true },
    });
  });

  return serializeRecord(updated, report);
}

export async function processReconciliationAction(
  institutionId: string,
  id: string,
  action: 'APPROVE' | 'REJECT' | 'RETURN_FOR_CORRECTION' | 'FREEZE' | 'SIGN',
  actorName: string,
  opts?: {
    remarks?: string;
    digitalSignature?: string;
    actorRole?: string;
    forwardToPrincipal?: boolean;
  },
) {
  const record = await prisma.paymentReconciliation.findFirst({
    where: { id, institutionId },
    include: { approvals: true },
  });
  if (!record) throw new Error('Reconciliation not found');

  const stage = record.currentStage;
  if (stage === 'CASHIER' || stage === 'COMPLETED') {
    throw new Error('No pending approval at this stage');
  }

  const signature =
    opts?.digitalSignature?.trim() ||
    `${actorName} — ${new Date().toLocaleString('en-IN')}`;

  const report =
    (record.snapshot as ReconciliationReport | null) ||
    (await buildReconciliationReport(
      institutionId,
      formatDateKey(record.reconciliationDate),
      record.academicYear,
      manualFromRecord(record),
    ));

  if (action === 'FREEZE') {
    const updated = await prisma.$transaction(async (tx) => {
      await tx.paymentReconciliationApproval.create({
        data: {
          reconciliationId: id,
          stage,
          action: PaymentReconciliationAction.FREEZE,
          actorName,
          actorRole: opts?.actorRole || stageLabel(stage),
          remarks: opts?.remarks || 'Day closing frozen',
          digitalSignature: signature,
        },
      });
      return tx.paymentReconciliation.update({
        where: { id },
        data: {
          status: PaymentReconciliationStatus.FROZEN,
          snapshot: report as unknown as Prisma.InputJsonValue,
          frozenAt: new Date(),
          frozenBy: actorName,
        },
        include: { approvals: true },
      });
    });
    return serializeRecord(updated, report);
  }

  if (action === 'SIGN') {
    const updated = await prisma.$transaction(async (tx) => {
      await tx.paymentReconciliationApproval.create({
        data: {
          reconciliationId: id,
          stage,
          action: PaymentReconciliationAction.SIGN,
          actorName,
          actorRole: opts?.actorRole || stageLabel(stage),
          remarks: opts?.remarks || 'Digitally signed',
          digitalSignature: signature,
        },
      });
      return tx.paymentReconciliation.findUniqueOrThrow({
        where: { id },
        include: { approvals: true },
      });
    });
    return serializeRecord(updated, report);
  }

  if (action === 'REJECT') {
    const updated = await prisma.$transaction(async (tx) => {
      await tx.paymentReconciliationApproval.create({
        data: {
          reconciliationId: id,
          stage,
          action: PaymentReconciliationAction.REJECT,
          actorName,
          actorRole: opts?.actorRole || stageLabel(stage),
          remarks: opts?.remarks || 'Rejected',
          digitalSignature: signature,
        },
      });
      return tx.paymentReconciliation.update({
        where: { id },
        data: {
          status: PaymentReconciliationStatus.REJECTED,
          currentStage: 'CASHIER',
        },
        include: { approvals: true },
      });
    });
    return serializeRecord(updated, report);
  }

  if (action === 'RETURN_FOR_CORRECTION') {
    await prisma.$transaction(async (tx) => {
      await tx.paymentReconciliationApproval.create({
        data: {
          reconciliationId: id,
          stage,
          action: PaymentReconciliationAction.RETURN_FOR_CORRECTION,
          actorName,
          actorRole: opts?.actorRole || stageLabel(stage),
          remarks: opts?.remarks || 'Returned for correction',
          digitalSignature: signature,
        },
      });
      await tx.paymentReconciliation.update({
        where: { id },
        data: {
          status: PaymentReconciliationStatus.RETURNED,
          currentStage: 'CASHIER',
          snapshot: Prisma.DbNull,
        },
      });
    });
    const updated = await prisma.paymentReconciliation.findUniqueOrThrow({
      where: { id },
      include: { approvals: true },
    });
    const freshReport = await buildReconciliationReport(
      institutionId,
      formatDateKey(updated.reconciliationDate),
      updated.academicYear,
      manualFromRecord(updated),
    );
    return serializeRecord(updated, freshReport);
  }

  // APPROVE
  const principalRequired =
    stage === 'FINANCE_HEAD'
      ? Boolean(opts?.forwardToPrincipal ?? record.principalRequired)
      : record.principalRequired;

  const next = nextStage(stage, principalRequired);
  const isComplete = next === 'COMPLETED';

  const updated = await prisma.$transaction(async (tx) => {
    await tx.paymentReconciliationApproval.create({
      data: {
        reconciliationId: id,
        stage,
        action: PaymentReconciliationAction.APPROVE,
        actorName,
        actorRole: opts?.actorRole || stageLabel(stage),
        remarks: opts?.remarks || 'Approved',
        digitalSignature: signature,
      },
    });

    return tx.paymentReconciliation.update({
      where: { id },
      data: {
        status: isComplete
          ? PaymentReconciliationStatus.DAY_CLOSING_COMPLETED
          : PaymentReconciliationStatus.PENDING_APPROVAL,
        currentStage: isComplete ? 'COMPLETED' : next,
        principalRequired,
        completedAt: isComplete ? new Date() : null,
        pdfGeneratedAt: isComplete ? new Date() : record.pdfGeneratedAt,
      },
      include: { approvals: true },
    });
  });

  return serializeRecord(updated, report);
}

function stageLabel(stage: PaymentReconciliationStage) {
  return RECONCILIATION_STAGES.find((s) => s.key === stage)?.label || stage;
}

export async function listReconciliations(
  institutionId: string,
  opts?: { academicYear?: string; limit?: number },
) {
  const rows = await prisma.paymentReconciliation.findMany({
    where: {
      institutionId,
      ...(opts?.academicYear ? { academicYear: opts.academicYear } : {}),
    },
    orderBy: { reconciliationDate: 'desc' },
    take: opts?.limit || 30,
    include: { approvals: { orderBy: { createdAt: 'asc' } } },
  });

  return Promise.all(
    rows.map(async (record) => {
      const report =
        (record.snapshot as ReconciliationReport | null) ||
        (await buildReconciliationReport(
          institutionId,
          formatDateKey(record.reconciliationDate),
          record.academicYear,
          manualFromRecord(record),
        ));
      return serializeRecord(record, report);
    }),
  );
}

export async function getReconciliationPdfPayload(institutionId: string, id: string) {
  const data = await prisma.paymentReconciliation.findFirst({
    where: { id, institutionId },
    include: { approvals: { orderBy: { createdAt: 'asc' } } },
  });
  if (!data) throw new Error('Reconciliation not found');

  const report =
    (data.snapshot as ReconciliationReport | null) ||
    (await buildReconciliationReport(
      institutionId,
      formatDateKey(data.reconciliationDate),
      data.academicYear,
      manualFromRecord(data),
    ));

  const institution = await prisma.institution.findUnique({
    where: { id: institutionId },
    select: { name: true },
  });

  return {
    institutionName: institution?.name || 'Institution',
    reconciliation: serializeRecord(data, report),
    generatedAt: new Date().toISOString(),
  };
}
