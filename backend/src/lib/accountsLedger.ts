import {
  ExpenseEntryStatus,
  FeeApprovalStatus,
  FeeDueStatus,
  FeeFineLevyStatus,
  PayrollSlipStatus,
} from '@prisma/client';
import { prisma } from './prisma.js';
import { getBankCashBookSummary } from './bankCashBook.js';
import { getInstitutionFilterMeta } from './students.js';
import { loadFeeCollectionContext } from './feeConfig.js';

export type LedgerLineItem = {
  code: string;
  name: string;
  amount: number;
  note?: string;
};

export type LedgerSection = {
  title: string;
  items: LedgerLineItem[];
  total: number;
};

export type AccountsLedgerPayload = {
  academicYear: string;
  financialYear: string;
  currency: string;
  asOf: string;
  ratios: {
    operatingMargin: number;
    currentRatio: number;
    plRatio: number;
    grossMargin: number;
  };
  incomeStatement: {
    revenue: LedgerSection;
    contraRevenue: LedgerSection;
    netRevenue: number;
    operatingExpenses: LedgerSection;
    payrollExpense: LedgerSection;
    operatingIncome: number;
    otherExpenses: LedgerSection;
    netProfit: number;
    rows: Array<{ label: string; amount: number; level: number; bold?: boolean }>;
  };
  balanceSheet: {
    assets: {
      current: LedgerSection;
      nonCurrent: LedgerSection;
      total: number;
    };
    liabilities: {
      current: LedgerSection;
      nonCurrent: LedgerSection;
      total: number;
    };
    equity: LedgerSection;
    totalLiabilitiesAndEquity: number;
    balanced: boolean;
    rows: Array<{ label: string; amount: number; level: number; bold?: boolean }>;
  };
  cashFlow: {
    operating: LedgerSection;
    investing: LedgerSection;
    financing: LedgerSection;
    netChange: number;
    openingBalance: number;
    closingBalance: number;
    monthly: Array<{
      month: string;
      operating: number;
      investing: number;
      financing: number;
      net: number;
    }>;
    rows: Array<{ label: string; amount: number; level: number; bold?: boolean }>;
  };
  financialReport: {
    summary: Record<string, number | string>;
    highlights: string[];
    kpis: Array<{ label: string; value: string; sub?: string }>;
  };
};

const ACADEMIC_MONTHS = [
  { key: 3, label: 'Apr' },
  { key: 4, label: 'May' },
  { key: 5, label: 'Jun' },
  { key: 6, label: 'Jul' },
  { key: 7, label: 'Aug' },
  { key: 8, label: 'Sep' },
  { key: 9, label: 'Oct' },
  { key: 10, label: 'Nov' },
  { key: 11, label: 'Dec' },
  { key: 0, label: 'Jan' },
  { key: 1, label: 'Feb' },
  { key: 2, label: 'Mar' },
] as const;

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function pct(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return round2((numerator / denominator) * 100);
}

function academicYearDateRange(academicYear: string): { start: Date; end: Date } {
  const m = academicYear.match(/^(\d{4})/);
  const startYear = m ? Number(m[1]) : new Date().getFullYear();
  return {
    start: new Date(Date.UTC(startYear, 3, 1)),
    end: new Date(Date.UTC(startYear + 1, 2, 31, 23, 59, 59, 999)),
  };
}

function monthIndexInAcademicYear(d: Date): number {
  const month = d.getUTCMonth();
  if (month >= 3) return month - 3;
  return month + 9;
}

function sumItems(items: LedgerLineItem[]) {
  return round2(items.reduce((s, i) => s + i.amount, 0));
}

function section(title: string, items: LedgerLineItem[]): LedgerSection {
  return { title, items, total: sumItems(items) };
}

async function loadRevenue(institutionId: string, academicYear: string) {
  const range = academicYearDateRange(academicYear);
  const [receipts, transport, hostel, fines] = await Promise.all([
    prisma.feeReceipt.findMany({
      where: { institutionId, academicYear, collectedAt: { gte: range.start, lte: range.end } },
      select: { amountPaid: true, feeBreakdown: true },
    }),
    prisma.transportFeeCollection.findMany({
      where: { institutionId, academicYear, collectedAt: { gte: range.start, lte: range.end } },
      select: { amount: true },
    }),
    prisma.hostelFeeCollection.findMany({
      where: { institutionId, academicYear, collectedAt: { gte: range.start, lte: range.end } },
      select: { amount: true },
    }),
    prisma.feeFineLevy.findMany({
      where: {
        institutionId,
        academicYear,
        status: FeeFineLevyStatus.PAID,
        collectedAt: { gte: range.start, lte: range.end },
      },
      select: { amount: true },
    }),
  ]);

  const feeCollection = round2(receipts.reduce((s, r) => s + r.amountPaid, 0));
  const transportFee = round2(transport.reduce((s, r) => s + r.amount, 0));
  const hostelFee = round2(hostel.reduce((s, s2) => s + s2.amount, 0));
  const finesPenalties = round2(fines.reduce((s, f) => s + f.amount, 0));

  const items: LedgerLineItem[] = [
    { code: '4001', name: 'Tuition & Academic Fee Collection', amount: feeCollection },
    { code: '4002', name: 'Transport Fee Income', amount: transportFee },
    { code: '4003', name: 'Hostel Fee Income', amount: hostelFee },
    { code: '4004', name: 'Fines & Penalties', amount: finesPenalties },
  ].filter((i) => i.amount > 0);

  return { items, total: sumItems(items) };
}

async function loadContraRevenue(institutionId: string, academicYear: string) {
  const [discounts, awards] = await Promise.all([
    prisma.feeDiscount.findMany({
      where: {
        institutionId,
        academicYear,
        status: { in: [FeeApprovalStatus.APPROVED, FeeApprovalStatus.ACTIVE] },
      },
      select: { settlementAmount: true, code: true },
    }),
    prisma.feeScholarshipAward.findMany({
      where: { institutionId, academicYear, status: FeeApprovalStatus.APPROVED },
      select: { amount: true },
    }),
  ]);

  const discountTotal = round2(discounts.reduce((s, d) => s + d.settlementAmount, 0));
  const scholarshipTotal = round2(awards.reduce((s, a) => s + a.amount, 0));

  const items: LedgerLineItem[] = [];
  if (discountTotal > 0) {
    items.push({ code: '4101', name: 'Discounts & Concessions', amount: discountTotal });
  }
  if (scholarshipTotal > 0) {
    items.push({ code: '4102', name: 'Scholarships Awarded', amount: scholarshipTotal });
  }

  return { items, total: sumItems(items) };
}

async function loadOperatingExpenses(institutionId: string, academicYear: string) {
  const range = academicYearDateRange(academicYear);
  const entries = await prisma.expenseEntry.findMany({
    where: {
      institutionId,
      academicYear,
      status: { in: [ExpenseEntryStatus.APPROVED, ExpenseEntryStatus.PAID] },
      expenseDate: { gte: range.start, lte: range.end },
    },
    include: { category: true },
  });

  const byGroup = new Map<string, number>();
  let capitalTotal = 0;

  for (const e of entries) {
    const amt = round2(e.amount + e.gstAmount);
    if (e.assetType && e.assetType.trim()) {
      capitalTotal += amt;
      continue;
    }
    const label = e.category.groupName || e.category.name;
    byGroup.set(label, (byGroup.get(label) || 0) + amt);
  }

  const items: LedgerLineItem[] = [...byGroup.entries()]
    .map(([name, amount], idx) => ({
      code: `500${idx + 1}`,
      name,
      amount: round2(amount),
    }))
    .sort((a, b) => b.amount - a.amount);

  return { items, total: sumItems(items), capitalTotal: round2(capitalTotal), entries };
}

async function loadPayrollExpense(institutionId: string, academicYear: string) {
  const range = academicYearDateRange(academicYear);
  const startPeriod = `${range.start.getUTCFullYear()}-${String(range.start.getUTCMonth() + 1).padStart(2, '0')}`;
  const endPeriod = `${range.end.getUTCFullYear()}-${String(range.end.getUTCMonth() + 1).padStart(2, '0')}`;

  const slips = await prisma.payrollSlip.findMany({
    where: {
      institutionId,
      status: { in: [PayrollSlipStatus.PAID, PayrollSlipStatus.GENERATED] },
      payPeriod: { gte: startPeriod, lte: endPeriod },
    },
    select: { netPay: true, status: true, payPeriod: true },
  });

  const paid = round2(
    slips.filter((s) => s.status === PayrollSlipStatus.PAID).reduce((sum, s) => sum + s.netPay, 0),
  );
  const accrued = round2(
    slips.filter((s) => s.status === PayrollSlipStatus.GENERATED).reduce((sum, s) => sum + s.netPay, 0),
  );

  const items: LedgerLineItem[] = [];
  if (paid > 0) items.push({ code: '5101', name: 'Salaries Paid', amount: paid });
  if (accrued > 0) items.push({ code: '5102', name: 'Salaries Accrued (Unpaid)', amount: accrued });

  return {
    items,
    total: sumItems(items),
    paid,
    accrued,
    slips,
  };
}

async function loadOtherExpenses(institutionId: string, academicYear: string) {
  const range = academicYearDateRange(academicYear);
  const [refunds, vendorPayments] = await Promise.all([
    prisma.feeRefund.findMany({
      where: {
        institutionId,
        academicYear,
        status: FeeApprovalStatus.PROCESSED,
        processedAt: { gte: range.start, lte: range.end },
      },
      select: { amount: true },
    }),
    prisma.transportVendorPayment.findMany({
      where: {
        institutionId,
        paymentDate: { gte: range.start, lte: range.end },
      },
      select: { amount: true },
    }),
  ]);

  const refundTotal = round2(refunds.reduce((s, r) => s + r.amount, 0));
  const vendorTotal = round2(vendorPayments.reduce((s, v) => s + v.amount, 0));

  const items: LedgerLineItem[] = [];
  if (vendorTotal > 0) {
    items.push({ code: '5201', name: 'Transport Vendor Payments', amount: vendorTotal });
  }
  if (refundTotal > 0) {
    items.push({ code: '5202', name: 'Fee Refunds Processed', amount: refundTotal });
  }

  return { items, total: sumItems(items), refundTotal, vendorTotal };
}

async function loadReceivables(institutionId: string, academicYear: string) {
  const dues = await prisma.feeDue.findMany({
    where: {
      institutionId,
      academicYear,
      status: { in: [FeeDueStatus.PENDING, FeeDueStatus.OVERDUE] },
    },
    select: { amount: true, status: true },
  });

  const pending = round2(
    dues.filter((d) => d.status === FeeDueStatus.PENDING).reduce((s, d) => s + d.amount, 0),
  );
  const overdue = round2(dues.filter((d) => d.status === FeeDueStatus.OVERDUE).reduce((s, d) => s + d.amount, 0));

  const items: LedgerLineItem[] = [];
  if (pending > 0) items.push({ code: '1101', name: 'Fee Receivable — Pending', amount: pending });
  if (overdue > 0) items.push({ code: '1102', name: 'Fee Receivable — Overdue', amount: overdue });

  return { items, total: sumItems(items) };
}

async function loadPayables(institutionId: string, academicYear: string) {
  const range = academicYearDateRange(academicYear);
  const startPeriod = `${range.start.getUTCFullYear()}-${String(range.start.getUTCMonth() + 1).padStart(2, '0')}`;
  const endPeriod = `${range.end.getUTCFullYear()}-${String(range.end.getUTCMonth() + 1).padStart(2, '0')}`;

  const [unpaidExpenses, unpaidPayroll, pendingRefunds] = await Promise.all([
    prisma.expenseEntry.findMany({
      where: {
        institutionId,
        academicYear,
        status: ExpenseEntryStatus.APPROVED,
      },
      select: { amount: true, gstAmount: true },
    }),
    prisma.payrollSlip.findMany({
      where: {
        institutionId,
        status: PayrollSlipStatus.GENERATED,
        payPeriod: { gte: startPeriod, lte: endPeriod },
      },
      select: { netPay: true },
    }),
    prisma.feeRefund.findMany({
      where: {
        institutionId,
        academicYear,
        status: { in: [FeeApprovalStatus.APPROVED, FeeApprovalStatus.PENDING_APPROVAL] },
      },
      select: { amount: true },
    }),
  ]);

  const expensePayable = round2(unpaidExpenses.reduce((s, e) => s + e.amount + e.gstAmount, 0));
  const payrollPayable = round2(unpaidPayroll.reduce((s, p) => s + p.netPay, 0));
  const refundPayable = round2(pendingRefunds.reduce((s, r) => s + r.amount, 0));

  const items: LedgerLineItem[] = [];
  if (expensePayable > 0) items.push({ code: '2101', name: 'Accounts Payable — Expenses', amount: expensePayable });
  if (payrollPayable > 0) items.push({ code: '2102', name: 'Salaries Payable', amount: payrollPayable });
  if (refundPayable > 0) items.push({ code: '2103', name: 'Refunds Payable', amount: refundPayable });

  return { items, total: sumItems(items) };
}

async function loadCashPosition(institutionId: string, academicYear: string) {
  const range = academicYearDateRange(academicYear);
  const [receipts, transport, hostel, bankSummary, cashDeposits] = await Promise.all([
    prisma.feeReceipt.findMany({
      where: { institutionId, academicYear, collectedAt: { gte: range.start, lte: range.end } },
      select: { amountPaid: true, paymentMode: true },
    }),
    prisma.transportFeeCollection.findMany({
      where: { institutionId, academicYear, collectedAt: { gte: range.start, lte: range.end } },
      select: { amount: true, paymentMode: true },
    }),
    prisma.hostelFeeCollection.findMany({
      where: { institutionId, academicYear, collectedAt: { gte: range.start, lte: range.end } },
      select: { amount: true, paymentMode: true },
    }),
    getBankCashBookSummary(institutionId, academicYear),
    prisma.bankCashDeposit.findMany({
      where: { institutionId, academicYear },
      select: { depositAmount: true, status: true },
    }),
  ]);

  const totalCollections = round2(
    receipts.reduce((s, r) => s + r.amountPaid, 0) +
      transport.reduce((s, r) => s + r.amount, 0) +
      hostel.reduce((s, r) => s + r.amount, 0),
  );

  const cashCollected = round2(
    receipts.filter((r) => r.paymentMode === 'CASH').reduce((s, r) => s + r.amountPaid, 0) +
      transport.filter((r) => r.paymentMode === 'CASH').reduce((s, r) => s + r.amount, 0) +
      hostel.filter((r) => r.paymentMode === 'CASH').reduce((s, r) => s + r.amount, 0),
  );

  const cashDeposited = round2(
    cashDeposits
      .filter((d) => d.status !== 'REJECTED')
      .reduce((s, d) => s + d.depositAmount, 0),
  );

  const cashInHand = round2(Math.max(cashCollected - cashDeposited, 0));
  const bankBalance = round2(bankSummary.totalCollectionDeposited);

  return {
    cashInHand,
    bankBalance,
    totalCollections,
    bankSummary,
  };
}

function buildIncomeRows(
  revenue: LedgerSection,
  contra: LedgerSection,
  netRevenue: number,
  opex: LedgerSection,
  payroll: LedgerSection,
  operatingIncome: number,
  other: LedgerSection,
  netProfit: number,
) {
  const rows: Array<{ label: string; amount: number; level: number; bold?: boolean }> = [
    { label: 'REVENUE', amount: revenue.total, level: 0, bold: true },
    ...revenue.items.map((i) => ({ label: i.name, amount: i.amount, level: 1 })),
    { label: 'Less: Discounts & Scholarships', amount: -contra.total, level: 0 },
    ...contra.items.map((i) => ({ label: i.name, amount: -i.amount, level: 1 })),
    { label: 'Net Revenue', amount: netRevenue, level: 0, bold: true },
    { label: 'OPERATING EXPENSES', amount: -opex.total, level: 0, bold: true },
    ...opex.items.map((i) => ({ label: i.name, amount: -i.amount, level: 1 })),
    { label: 'Payroll & Salaries', amount: -payroll.total, level: 0 },
    ...payroll.items.map((i) => ({ label: i.name, amount: -i.amount, level: 1 })),
    { label: 'Operating Income', amount: operatingIncome, level: 0, bold: true },
    { label: 'OTHER EXPENSES', amount: -other.total, level: 0, bold: true },
    ...other.items.map((i) => ({ label: i.name, amount: -i.amount, level: 1 })),
    { label: 'Net Profit / (Loss)', amount: netProfit, level: 0, bold: true },
  ];
  return rows;
}

function buildBalanceRows(
  currentAssets: LedgerSection,
  nonCurrentAssets: LedgerSection,
  totalAssets: number,
  currentLiab: LedgerSection,
  nonCurrentLiab: LedgerSection,
  totalLiab: number,
  equity: LedgerSection,
  totalLE: number,
) {
  return [
    { label: 'ASSETS', amount: totalAssets, level: 0, bold: true },
    { label: 'Current Assets', amount: currentAssets.total, level: 1, bold: true },
    ...currentAssets.items.map((i) => ({ label: i.name, amount: i.amount, level: 2 })),
    { label: 'Non-Current Assets', amount: nonCurrentAssets.total, level: 1, bold: true },
    ...nonCurrentAssets.items.map((i) => ({ label: i.name, amount: i.amount, level: 2 })),
    { label: 'Total Assets', amount: totalAssets, level: 0, bold: true },
    { label: 'LIABILITIES', amount: totalLiab, level: 0, bold: true },
    { label: 'Current Liabilities', amount: currentLiab.total, level: 1, bold: true },
    ...currentLiab.items.map((i) => ({ label: i.name, amount: i.amount, level: 2 })),
    { label: 'Non-Current Liabilities', amount: nonCurrentLiab.total, level: 1, bold: true },
    ...nonCurrentLiab.items.map((i) => ({ label: i.name, amount: i.amount, level: 2 })),
    { label: 'Total Liabilities', amount: totalLiab, level: 0, bold: true },
    { label: 'EQUITY', amount: equity.total, level: 0, bold: true },
    ...equity.items.map((i) => ({ label: i.name, amount: i.amount, level: 1 })),
    { label: 'Total Liabilities & Equity', amount: totalLE, level: 0, bold: true },
  ];
}

function buildCashFlowMonthly(
  institutionId: string,
  academicYear: string,
  operatingTotal: number,
  investingTotal: number,
  financingTotal: number,
  receipts: Array<{ collectedAt: Date; amountPaid: number }>,
  expenseDates: Array<{ date: Date; amount: number; type: 'opex' | 'payroll' | 'refund' | 'vendor' | 'capital' }>,
) {
  void institutionId;
  void academicYear;

  const byMonth = ACADEMIC_MONTHS.map((m) => ({
    month: m.label,
    operating: 0,
    investing: 0,
    financing: 0,
    net: 0,
  }));

  for (const r of receipts) {
    const idx = monthIndexInAcademicYear(r.collectedAt);
    if (idx >= 0 && idx < 12) byMonth[idx].operating += r.amountPaid;
  }

  for (const e of expenseDates) {
    const idx = monthIndexInAcademicYear(e.date);
    if (idx < 0 || idx >= 12) continue;
    if (e.type === 'capital') byMonth[idx].investing -= e.amount;
    else if (e.type === 'refund') byMonth[idx].financing -= e.amount;
    else byMonth[idx].operating -= e.amount;
  }

  return byMonth.map((m) => ({
    month: m.month,
    operating: round2(m.operating),
    investing: round2(m.investing),
    financing: round2(m.financing),
    net: round2(m.operating + m.investing + m.financing),
  }));
}

export async function getAccountsLedger(
  institutionId: string,
  opts: { academicYear?: string; financialYear?: string } = {},
): Promise<AccountsLedgerPayload> {
  const filters = await getInstitutionFilterMeta(institutionId);
  const ctx = await loadFeeCollectionContext(institutionId);
  const academicYear = opts.academicYear || filters.defaultAcademicYear;
  const financialYear = opts.financialYear || academicYear;
  const range = academicYearDateRange(academicYear);

  const [
    revenue,
    contra,
    opex,
    payroll,
    other,
    receivables,
    payables,
    cashPos,
    receiptsForFlow,
    expenseEntries,
    payrollSlips,
    refundsProcessed,
    vendorPayments,
  ] = await Promise.all([
    loadRevenue(institutionId, academicYear),
    loadContraRevenue(institutionId, academicYear),
    loadOperatingExpenses(institutionId, academicYear),
    loadPayrollExpense(institutionId, academicYear),
    loadOtherExpenses(institutionId, academicYear),
    loadReceivables(institutionId, academicYear),
    loadPayables(institutionId, academicYear),
    loadCashPosition(institutionId, academicYear),
    prisma.feeReceipt.findMany({
      where: { institutionId, academicYear, collectedAt: { gte: range.start, lte: range.end } },
      select: { collectedAt: true, amountPaid: true },
    }),
    prisma.expenseEntry.findMany({
      where: {
        institutionId,
        academicYear,
        status: { in: [ExpenseEntryStatus.APPROVED, ExpenseEntryStatus.PAID] },
        expenseDate: { gte: range.start, lte: range.end },
      },
      select: { amount: true, gstAmount: true, expenseDate: true, paidAt: true, assetType: true },
    }),
    prisma.payrollSlip.findMany({
      where: {
        institutionId,
        status: PayrollSlipStatus.PAID,
        payPeriod: {
          gte: `${range.start.getUTCFullYear()}-${String(range.start.getUTCMonth() + 1).padStart(2, '0')}`,
          lte: `${range.end.getUTCFullYear()}-${String(range.end.getUTCMonth() + 1).padStart(2, '0')}`,
        },
      },
      select: { netPay: true, paidAt: true, createdAt: true },
    }),
    prisma.feeRefund.findMany({
      where: {
        institutionId,
        academicYear,
        status: FeeApprovalStatus.PROCESSED,
        processedAt: { gte: range.start, lte: range.end },
      },
      select: { amount: true, processedAt: true },
    }),
    prisma.transportVendorPayment.findMany({
      where: { institutionId, paymentDate: { gte: range.start, lte: range.end } },
      select: { amount: true, paymentDate: true },
    }),
  ]);

  const revenueSection = section('Revenue', revenue.items);
  const contraSection = section('Discounts & Scholarships', contra.items);
  const netRevenue = round2(revenueSection.total - contraSection.total);
  const opexSection = section('Operating Expenses', opex.items);
  const payrollSection = section('Payroll & Salaries', payroll.items);
  const operatingIncome = round2(netRevenue - opexSection.total - payroll.paid);
  const otherSection = section('Other Expenses', other.items);
  const netProfit = round2(operatingIncome - otherSection.total);

  const grossMargin = pct(netRevenue, revenueSection.total);
  const operatingMargin = pct(operatingIncome, netRevenue);
  const plRatio = pct(netProfit, netRevenue);

  const currentAssetItems: LedgerLineItem[] = [
    { code: '1001', name: 'Cash in Hand', amount: cashPos.cashInHand },
    { code: '1002', name: 'Bank Balance', amount: cashPos.bankBalance },
    ...receivables.items,
  ].filter((i) => i.amount > 0);

  const nonCurrentAssetItems: LedgerLineItem[] = [];
  if (opex.capitalTotal > 0) {
    nonCurrentAssetItems.push({
      code: '1201',
      name: 'Fixed Assets (Capital Expenditure)',
      amount: opex.capitalTotal,
    });
  }

  const currentAssets = section('Current Assets', currentAssetItems);
  const nonCurrentAssets = section('Non-Current Assets', nonCurrentAssetItems);
  const totalAssets = round2(currentAssets.total + nonCurrentAssets.total);

  const currentLiabItems = payables.items;
  const currentLiabilities = section('Current Liabilities', currentLiabItems);
  const nonCurrentLiabilities = section('Non-Current Liabilities', []);
  const totalLiabilities = round2(currentLiabilities.total + nonCurrentLiabilities.total);

  const retainedEarnings = round2(totalAssets - totalLiabilities);
  const equityItems: LedgerLineItem[] = [
    { code: '3001', name: 'Retained Earnings / Surplus', amount: retainedEarnings },
  ];
  const equitySection = section('Equity', equityItems);
  const totalLE = round2(totalLiabilities + equitySection.total);
  const balanced = Math.abs(totalAssets - totalLE) < 0.02;

  const transportHostelInflow = round2(
    revenue.items.filter((i) => i.code === '4002' || i.code === '4003').reduce((s, i) => s + i.amount, 0),
  );
  const finesInflow = round2(revenue.items.find((i) => i.code === '4004')?.amount || 0);
  const feeInflow = round2(revenueSection.total - transportHostelInflow - finesInflow);

  const operatingItems: LedgerLineItem[] = [
    { code: 'CF01', name: 'Fee & Academic Collections', amount: feeInflow },
    { code: 'CF02', name: 'Transport & Hostel Collections', amount: transportHostelInflow },
    { code: 'CF03', name: 'Fines & Penalties Collected', amount: finesInflow },
    { code: 'CF04', name: 'Operating Expenses Paid', amount: -opexSection.total },
    { code: 'CF05', name: 'Salaries Paid', amount: -payroll.paid },
    { code: 'CF06', name: 'Transport Vendor Payments', amount: -(other.vendorTotal || 0) },
  ].filter((i) => i.amount !== 0);

  const investingItems: LedgerLineItem[] =
    opex.capitalTotal > 0
      ? [{ code: 'CF10', name: 'Purchase of Fixed Assets', amount: -opex.capitalTotal }]
      : [];

  const financingItems: LedgerLineItem[] =
    (other.refundTotal || 0) > 0
      ? [{ code: 'CF20', name: 'Refunds to Students / Parents', amount: -(other.refundTotal || 0) }]
      : [];

  const operatingSection = section('Cash Flow from Operating Activities', operatingItems);
  const investingSection = section('Cash Flow from Investing Activities', investingItems);
  const financingSection = section('Cash Flow from Financing Activities', financingItems);
  const netChange = round2(operatingSection.total + investingSection.total + financingSection.total);
  const closingBalance = round2(cashPos.cashInHand + cashPos.bankBalance);
  const openingBalance = round2(closingBalance - netChange);

  const expenseFlowRows: Array<{ date: Date; amount: number; type: 'opex' | 'payroll' | 'refund' | 'vendor' | 'capital' }> = [];
  for (const e of expenseEntries) {
    const amt = round2(e.amount + e.gstAmount);
    expenseFlowRows.push({
      date: e.paidAt || e.expenseDate,
      amount: amt,
      type: e.assetType?.trim() ? 'capital' : 'opex',
    });
  }
  for (const p of payrollSlips) {
    expenseFlowRows.push({
      date: p.paidAt || p.createdAt,
      amount: p.netPay,
      type: 'payroll',
    });
  }
  for (const r of refundsProcessed) {
    if (r.processedAt) {
      expenseFlowRows.push({ date: r.processedAt, amount: r.amount, type: 'refund' });
    }
  }
  for (const v of vendorPayments) {
    expenseFlowRows.push({ date: v.paymentDate, amount: v.amount, type: 'vendor' });
  }

  const monthly = buildCashFlowMonthly(
    institutionId,
    academicYear,
    operatingSection.total,
    investingSection.total,
    financingSection.total,
    receiptsForFlow,
    expenseFlowRows,
  );

  const cashFlowRows: Array<{ label: string; amount: number; level: number; bold?: boolean }> = [
    { label: 'OPERATING ACTIVITIES', amount: operatingSection.total, level: 0, bold: true },
    ...operatingSection.items.map((i) => ({ label: i.name, amount: i.amount, level: 1 })),
    { label: 'INVESTING ACTIVITIES', amount: investingSection.total, level: 0, bold: true },
    ...investingSection.items.map((i) => ({ label: i.name, amount: i.amount, level: 1 })),
    { label: 'FINANCING ACTIVITIES', amount: financingSection.total, level: 0, bold: true },
    ...financingSection.items.map((i) => ({ label: i.name, amount: i.amount, level: 1 })),
    { label: 'Net Change in Cash', amount: netChange, level: 0, bold: true },
    { label: 'Opening Cash Balance', amount: openingBalance, level: 0 },
    { label: 'Closing Cash Balance', amount: closingBalance, level: 0, bold: true },
  ];

  const currentRatio =
    currentLiabilities.total > 0 ? round2(currentAssets.total / currentLiabilities.total) : currentAssets.total > 0 ? 99.99 : 0;

  const highlights: string[] = [];
  if (netProfit >= 0) highlights.push(`Net surplus of ${ctx.currency} ${netProfit.toLocaleString('en-IN')} for ${academicYear}`);
  else highlights.push(`Net deficit of ${ctx.currency} ${Math.abs(netProfit).toLocaleString('en-IN')} for ${academicYear}`);
  if (receivables.total > 0) {
    highlights.push(`Outstanding fee receivables: ${ctx.currency} ${receivables.total.toLocaleString('en-IN')}`);
  }
  if (operatingMargin >= 20) highlights.push('Healthy operating margin above 20%');
  else if (operatingMargin < 0) highlights.push('Operating margin is negative — review expenses');
  if (currentRatio < 1 && currentLiabilities.total > 0) highlights.push('Current ratio below 1 — liquidity attention needed');

  return {
    academicYear,
    financialYear,
    currency: ctx.currency,
    asOf: new Date().toISOString(),
    ratios: {
      operatingMargin,
      currentRatio,
      plRatio,
      grossMargin,
    },
    incomeStatement: {
      revenue: revenueSection,
      contraRevenue: contraSection,
      netRevenue,
      operatingExpenses: opexSection,
      payrollExpense: payrollSection,
      operatingIncome,
      otherExpenses: otherSection,
      netProfit,
      rows: buildIncomeRows(
        revenueSection,
        contraSection,
        netRevenue,
        opexSection,
        payrollSection,
        operatingIncome,
        otherSection,
        netProfit,
      ),
    },
    balanceSheet: {
      assets: { current: currentAssets, nonCurrent: nonCurrentAssets, total: totalAssets },
      liabilities: { current: currentLiabilities, nonCurrent: nonCurrentLiabilities, total: totalLiabilities },
      equity: equitySection,
      totalLiabilitiesAndEquity: totalLE,
      balanced,
      rows: buildBalanceRows(
        currentAssets,
        nonCurrentAssets,
        totalAssets,
        currentLiabilities,
        nonCurrentLiabilities,
        totalLiabilities,
        equitySection,
        totalLE,
      ),
    },
    cashFlow: {
      operating: operatingSection,
      investing: investingSection,
      financing: financingSection,
      netChange,
      openingBalance,
      closingBalance,
      monthly,
      rows: cashFlowRows,
    },
    financialReport: {
      summary: {
        totalRevenue: revenueSection.total,
        netRevenue,
        totalExpenses: round2(opexSection.total + payrollSection.total + otherSection.total),
        netProfit,
        totalAssets,
        totalLiabilities,
        totalEquity: equitySection.total,
        cashAndBank: round2(cashPos.cashInHand + cashPos.bankBalance),
        feeReceivable: receivables.total,
        operatingMarginPct: operatingMargin,
        currentRatio,
        plRatioPct: plRatio,
      },
      highlights,
      kpis: [
        { label: 'Total Revenue', value: `${ctx.currency} ${revenueSection.total.toLocaleString('en-IN')}` },
        { label: 'Net Profit / (Loss)', value: `${ctx.currency} ${netProfit.toLocaleString('en-IN')}`, sub: `${plRatio}% margin` },
        { label: 'Cash & Bank', value: `${ctx.currency} ${round2(cashPos.cashInHand + cashPos.bankBalance).toLocaleString('en-IN')}` },
        { label: 'Fee Receivable', value: `${ctx.currency} ${receivables.total.toLocaleString('en-IN')}` },
        { label: 'Operating Margin', value: `${operatingMargin}%` },
        { label: 'Current Ratio', value: currentLiabilities.total > 0 ? `${currentRatio}x` : 'N/A' },
      ],
    },
  };
}

export function accountsLedgerToCsv(payload: AccountsLedgerPayload, section: 'income' | 'balance' | 'cashflow' | 'full'): string {
  const lines: string[] = [];
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

  lines.push(`Accounts & Ledger — ${payload.academicYear}`);
  lines.push(`Generated,${payload.asOf}`);
  lines.push('');

  const addRows = (title: string, rows: Array<{ label: string; amount: number; level?: number }>) => {
    lines.push(title);
    lines.push('Particulars,Amount');
    for (const r of rows) {
      const indent = '  '.repeat(r.level || 0);
      lines.push(`${esc(indent + r.label)},${r.amount}`);
    }
    lines.push('');
  };

  if (section === 'income' || section === 'full') {
    addRows('Income Statement (Profit & Loss)', payload.incomeStatement.rows);
  }
  if (section === 'balance' || section === 'full') {
    addRows('Balance Sheet', payload.balanceSheet.rows);
  }
  if (section === 'cashflow' || section === 'full') {
    addRows('Cash Flow Statement', payload.cashFlow.rows);
    lines.push('Monthly Cash Flow');
    lines.push('Month,Operating,Investing,Financing,Net');
    for (const m of payload.cashFlow.monthly) {
      lines.push(`${m.month},${m.operating},${m.investing},${m.financing},${m.net}`);
    }
    lines.push('');
  }
  if (section === 'full') {
    lines.push('Financial Ratios');
    lines.push('Ratio,Value');
    lines.push(`Operating Margin,${payload.ratios.operatingMargin}%`);
    lines.push(`Current Ratio (Liquidity),${payload.ratios.currentRatio}`);
    lines.push(`P&L Ratio (Net Margin),${payload.ratios.plRatio}%`);
    lines.push(`Gross Margin,${payload.ratios.grossMargin}%`);
  }

  return lines.join('\n');
}
