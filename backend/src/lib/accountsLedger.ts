import {
  FeeDueStatus,
  PaymentReconciliationStatus,
} from '@prisma/client';
import { prisma } from './prisma.js';
import { getInstitutionFilterMeta } from './students.js';
import { loadFeeCollectionContext } from './feeConfig.js';
import type {
  ReconciliationLedgerPosting,
  ReconciliationReport,
} from './paymentReconciliation.js';

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
  /** Day-closing posts that feed this ledger (collections/expenses/refunds never bypass). */
  posting: {
    source: 'payment_reconciliation';
    closedDays: number;
    message: string;
  };
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

const REVENUE_LABELS: Record<string, { code: string; name: string }> = {
  studentFee: { code: '4001', name: 'Tuition & Academic Fee Collection' },
  admissionFee: { code: '4001a', name: 'Admission Fee Collection' },
  examinationFee: { code: '4001b', name: 'Examination Fee Collection' },
  libraryFee: { code: '4001c', name: 'Library Fee Collection' },
  otherCollection: { code: '4001d', name: 'Other Fee Collection' },
  transportFee: { code: '4002', name: 'Transport Fee Income' },
  hostelFee: { code: '4003', name: 'Hostel Fee Income' },
  fineCollection: { code: '4004', name: 'Fines & Penalties' },
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function pct(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return round2((numerator / denominator) * 100);
}

function sumItems(items: LedgerLineItem[]) {
  return round2(items.reduce((s, i) => s + i.amount, 0));
}

function section(title: string, items: LedgerLineItem[]): LedgerSection {
  return { title, items, total: sumItems(items) };
}

function monthIndexInAcademicYear(d: Date): number {
  const month = d.getUTCMonth();
  if (month >= 3) return month - 3;
  return month + 9;
}

function movementAmount(
  rows: Array<{ label: string; amount: number }> | undefined,
  includes: string,
): number {
  if (!rows?.length) return 0;
  const hit = rows.find((r) => r.label.toLowerCase().includes(includes.toLowerCase()));
  return round2(hit?.amount || 0);
}

function postingFromSnapshot(snap: ReconciliationReport): ReconciliationLedgerPosting {
  if (snap.ledgerPosting) return snap.ledgerPosting;

  const revenueByCategory: Record<string, number> = {};
  for (const row of snap.collectionSummary || []) {
    revenueByCategory[row.category] = round2(row.total || 0);
  }

  return {
    revenueByCategory,
    discounts: 0,
    scholarships: 0,
    operatingExpenses: 0,
    capitalExpenses: 0,
    payrollPaid: movementAmount(snap.bankMovement, 'Salary'),
    vendorPayments: movementAmount(snap.bankMovement, 'Vendor'),
    refunds: movementAmount(snap.bankMovement, 'Online Refund'),
    bankCharges: movementAmount(snap.bankMovement, 'Bank Charges'),
    cashExpensePayments: movementAmount(snap.cashMovement, 'Cash Payments'),
    bankExpensePayments: movementAmount(snap.bankMovement, 'Expense Payments'),
  };
}

async function loadPostedReconciliations(institutionId: string, academicYear: string) {
  return prisma.paymentReconciliation.findMany({
    where: {
      institutionId,
      academicYear,
      status: {
        in: [
          PaymentReconciliationStatus.DAY_CLOSING_COMPLETED,
          PaymentReconciliationStatus.FROZEN,
        ],
      },
    },
    orderBy: { reconciliationDate: 'asc' },
    select: {
      reconciliationDate: true,
      status: true,
      snapshot: true,
    },
  });
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
  const overdue = round2(
    dues.filter((d) => d.status === FeeDueStatus.OVERDUE).reduce((s, d) => s + d.amount, 0),
  );

  const items: LedgerLineItem[] = [];
  if (pending > 0) items.push({ code: '1101', name: 'Fee Receivable — Pending', amount: pending });
  if (overdue > 0) items.push({ code: '1102', name: 'Fee Receivable — Overdue', amount: overdue });

  return { items, total: sumItems(items) };
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
  return [
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

/**
 * Accounts & Ledger posts ONLY from Payment Reconciliation days that are
 * DAY_CLOSING_COMPLETED or FROZEN. Live collections, expenses, payroll, and
 * refunds never appear here until day closing is approved.
 */
export async function getAccountsLedger(
  institutionId: string,
  opts: { academicYear?: string; financialYear?: string } = {},
): Promise<AccountsLedgerPayload> {
  const filters = await getInstitutionFilterMeta(institutionId);
  const ctx = await loadFeeCollectionContext(institutionId);
  const academicYear = opts.academicYear || filters.defaultAcademicYear;
  const financialYear = opts.financialYear || academicYear;

  const [postedDays, receivables] = await Promise.all([
    loadPostedReconciliations(institutionId, academicYear),
    loadReceivables(institutionId, academicYear),
  ]);

  const revenueTotals = new Map<string, number>();
  let discounts = 0;
  let scholarships = 0;
  let operatingExpenses = 0;
  let capitalExpenses = 0;
  let payrollPaid = 0;
  let vendorPayments = 0;
  let refunds = 0;
  let bankCharges = 0;
  let cashExpensePayments = 0;
  let bankExpensePayments = 0;
  let closingCashInHand = 0;
  let closingBankBalance = 0;
  let openingCashForYear = 0;
  let openingBankForYear = 0;
  let sawFirst = false;

  const byMonth = ACADEMIC_MONTHS.map((m) => ({
    month: m.label,
    operating: 0,
    investing: 0,
    financing: 0,
    net: 0,
  }));

  for (const day of postedDays) {
    if (!day.snapshot || typeof day.snapshot !== 'object') continue;
    const snap = day.snapshot as ReconciliationReport;
    const post = postingFromSnapshot(snap);

    for (const [cat, amount] of Object.entries(post.revenueByCategory || {})) {
      revenueTotals.set(cat, round2((revenueTotals.get(cat) || 0) + amount));
    }
    discounts = round2(discounts + (post.discounts || 0));
    scholarships = round2(scholarships + (post.scholarships || 0));
    operatingExpenses = round2(operatingExpenses + (post.operatingExpenses || 0));
    capitalExpenses = round2(capitalExpenses + (post.capitalExpenses || 0));
    payrollPaid = round2(payrollPaid + (post.payrollPaid || 0));
    vendorPayments = round2(vendorPayments + (post.vendorPayments || 0));
    refunds = round2(refunds + (post.refunds || 0));
    bankCharges = round2(bankCharges + (post.bankCharges || 0));
    cashExpensePayments = round2(cashExpensePayments + (post.cashExpensePayments || 0));
    bankExpensePayments = round2(bankExpensePayments + (post.bankExpensePayments || 0));

    if (!sawFirst) {
      openingCashForYear = round2(snap.openings?.find((o) => o.label.includes('Opening Cash'))?.amount || 0);
      openingBankForYear = round2(
        snap.openings?.find((o) => o.label.includes('Opening Bank'))?.amount || 0,
      );
      sawFirst = true;
    }
    closingCashInHand = round2(snap.totals?.closingCashInHand ?? closingCashInHand);
    closingBankBalance = round2(snap.totals?.closingBankBalance ?? closingBankBalance);

    const idx = monthIndexInAcademicYear(day.reconciliationDate);
    if (idx >= 0 && idx < 12) {
      const dayRevenue = round2(
        Object.values(post.revenueByCategory || {}).reduce((s, n) => s + n, 0),
      );
      const expenseOut =
        (post.operatingExpenses || 0) > 0
          ? round2(
              (post.operatingExpenses || 0) +
                (post.payrollPaid || 0) +
                (post.vendorPayments || 0) +
                (post.bankCharges || 0),
            )
          : round2(
              (post.payrollPaid || 0) +
                (post.vendorPayments || 0) +
                (post.bankCharges || 0) +
                (post.cashExpensePayments || 0) +
                (post.bankExpensePayments || 0),
            );
      byMonth[idx].operating += dayRevenue - expenseOut;
      byMonth[idx].investing -= post.capitalExpenses || 0;
      byMonth[idx].financing -= post.refunds || 0;
    }
  }

  // If operatingExpenses were zero but cash/bank expense payments exist (legacy snapshots)
  if (operatingExpenses <= 0 && (cashExpensePayments > 0 || bankExpensePayments > 0)) {
    operatingExpenses = round2(cashExpensePayments + bankExpensePayments);
  }

  const revenueItems: LedgerLineItem[] = [];
  for (const [cat, amount] of revenueTotals.entries()) {
    if (amount <= 0) continue;
    const meta = REVENUE_LABELS[cat] || { code: '4099', name: cat };
    revenueItems.push({ code: meta.code, name: meta.name, amount });
  }
  revenueItems.sort((a, b) => b.amount - a.amount);

  const contraItems: LedgerLineItem[] = [];
  if (discounts > 0) {
    contraItems.push({ code: '4101', name: 'Discounts & Concessions', amount: discounts });
  }
  if (scholarships > 0) {
    contraItems.push({ code: '4102', name: 'Scholarships Awarded', amount: scholarships });
  }

  const opexItems: LedgerLineItem[] = [];
  if (operatingExpenses > 0) {
    opexItems.push({ code: '5001', name: 'Operating Expenses (posted)', amount: operatingExpenses });
  }
  if (bankCharges > 0) {
    opexItems.push({ code: '5002', name: 'Bank Charges', amount: bankCharges });
  }

  const payrollItems: LedgerLineItem[] = [];
  if (payrollPaid > 0) {
    payrollItems.push({ code: '5101', name: 'Salaries Paid', amount: payrollPaid });
  }

  // Refunds appear ONLY via approved day-closing — never from live FeeRefund rows
  const otherItems: LedgerLineItem[] = [];
  if (vendorPayments > 0) {
    otherItems.push({ code: '5201', name: 'Transport Vendor Payments', amount: vendorPayments });
  }
  if (refunds > 0) {
    otherItems.push({ code: '5202', name: 'Fee Refunds (day-closing posted)', amount: refunds });
  }

  const revenueSection = section('Revenue', revenueItems);
  const contraSection = section('Discounts & Scholarships', contraItems);
  const netRevenue = round2(revenueSection.total - contraSection.total);
  const opexSection = section('Operating Expenses', opexItems);
  const payrollSection = section('Payroll & Salaries', payrollItems);
  const operatingIncome = round2(netRevenue - opexSection.total - payrollSection.total);
  const otherSection = section('Other Expenses', otherItems);
  const netProfit = round2(operatingIncome - otherSection.total);

  const grossMargin = pct(netRevenue, revenueSection.total);
  const operatingMargin = pct(operatingIncome, netRevenue);
  const plRatio = pct(netProfit, netRevenue);

  const cashInHand = closingCashInHand;
  const bankBalance = Math.max(closingBankBalance, 0);

  const currentAssetItems: LedgerLineItem[] = [
    { code: '1001', name: 'Cash in Hand', amount: cashInHand },
    { code: '1002', name: 'Bank Balance', amount: bankBalance },
    ...receivables.items,
  ].filter((i) => i.amount > 0);

  const nonCurrentAssetItems: LedgerLineItem[] = [];
  if (capitalExpenses > 0) {
    nonCurrentAssetItems.push({
      code: '1201',
      name: 'Fixed Assets (Capital Expenditure)',
      amount: capitalExpenses,
    });
  }

  const currentAssets = section('Current Assets', currentAssetItems);
  const nonCurrentAssets = section('Non-Current Assets', nonCurrentAssetItems);
  const totalAssets = round2(currentAssets.total + nonCurrentAssets.total);

  // No direct refunds payable — refunds stay off the ledger until day closing posts them as expense
  const currentLiabilities = section('Current Liabilities', []);
  const nonCurrentLiabilities = section('Non-Current Liabilities', []);
  const totalLiabilities = 0;

  const retainedEarnings = round2(totalAssets - totalLiabilities);
  const equitySection = section('Equity', [
    { code: '3001', name: 'Retained Earnings / Surplus', amount: retainedEarnings },
  ]);
  const totalLE = round2(totalLiabilities + equitySection.total);
  const balanced = Math.abs(totalAssets - totalLE) < 0.02;

  const transportHostelInflow = round2(
    (revenueTotals.get('transportFee') || 0) + (revenueTotals.get('hostelFee') || 0),
  );
  const finesInflow = round2(revenueTotals.get('fineCollection') || 0);
  const feeInflow = round2(revenueSection.total - transportHostelInflow - finesInflow);

  const operatingItems: LedgerLineItem[] = [
    { code: 'CF01', name: 'Fee & Academic Collections', amount: feeInflow },
    { code: 'CF02', name: 'Transport & Hostel Collections', amount: transportHostelInflow },
    { code: 'CF03', name: 'Fines & Penalties Collected', amount: finesInflow },
    { code: 'CF04', name: 'Operating Expenses Paid', amount: -operatingExpenses },
    { code: 'CF05', name: 'Salaries Paid', amount: -payrollPaid },
    { code: 'CF06', name: 'Transport Vendor Payments', amount: -vendorPayments },
    { code: 'CF07', name: 'Bank Charges', amount: -bankCharges },
  ].filter((i) => i.amount !== 0);

  const investingItems: LedgerLineItem[] =
    capitalExpenses > 0
      ? [{ code: 'CF10', name: 'Purchase of Fixed Assets', amount: -capitalExpenses }]
      : [];

  const financingItems: LedgerLineItem[] =
    refunds > 0
      ? [{ code: 'CF20', name: 'Refunds to Students / Parents', amount: -refunds }]
      : [];

  const operatingSection = section('Cash Flow from Operating Activities', operatingItems);
  const investingSection = section('Cash Flow from Investing Activities', investingItems);
  const financingSection = section('Cash Flow from Financing Activities', financingItems);
  const netChange = round2(operatingSection.total + investingSection.total + financingSection.total);
  const closingBalance = round2(cashInHand + bankBalance);
  const openingBalance = round2(
    postedDays.length > 0
      ? openingCashForYear + openingBankForYear
      : closingBalance - netChange,
  );

  const monthly = byMonth.map((m) => ({
    month: m.month,
    operating: round2(m.operating),
    investing: round2(m.investing),
    financing: round2(m.financing),
    net: round2(m.operating + m.investing + m.financing),
  }));

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
    currentLiabilities.total > 0
      ? round2(currentAssets.total / currentLiabilities.total)
      : currentAssets.total > 0
        ? 99.99
        : 0;

  const closedDays = postedDays.length;
  const postingMessage =
    closedDays === 0
      ? 'No day closings approved yet. Complete Payment Reconciliation → Send for Approval → final approval to post collections, expenses and refunds here.'
      : `Posted from ${closedDays} approved Payment Reconciliation day closing(s). Refunds and expenses appear only after day-closing approval.`;

  const highlights: string[] = [postingMessage];
  if (closedDays === 0) {
    highlights.push('Collections and expenses stay in module screens until reconciliation is approved.');
  } else if (netProfit >= 0) {
    highlights.push(`Net surplus of ${ctx.currency} ${netProfit.toLocaleString('en-IN')} for ${academicYear}`);
  } else {
    highlights.push(
      `Net deficit of ${ctx.currency} ${Math.abs(netProfit).toLocaleString('en-IN')} for ${academicYear}`,
    );
  }
  if (receivables.total > 0) {
    highlights.push(
      `Outstanding fee receivables: ${ctx.currency} ${receivables.total.toLocaleString('en-IN')}`,
    );
  }
  if (operatingMargin < 0) highlights.push('Operating margin is negative — review expenses');
  if (currentRatio < 1 && currentLiabilities.total > 0) {
    highlights.push('Current ratio below 1 — liquidity attention needed');
  }

  return {
    academicYear,
    financialYear,
    currency: ctx.currency,
    asOf: new Date().toISOString(),
    posting: {
      source: 'payment_reconciliation',
      closedDays,
      message: postingMessage,
    },
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
      liabilities: {
        current: currentLiabilities,
        nonCurrent: nonCurrentLiabilities,
        total: totalLiabilities,
      },
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
        cashAndBank: closingBalance,
        feeReceivable: receivables.total,
        operatingMarginPct: operatingMargin,
        currentRatio,
        plRatioPct: plRatio,
        closedReconciliationDays: closedDays,
      },
      highlights,
      kpis: [
        {
          label: 'Total Revenue',
          value: `${ctx.currency} ${revenueSection.total.toLocaleString('en-IN')}`,
        },
        {
          label: 'Net Profit / (Loss)',
          value: `${ctx.currency} ${netProfit.toLocaleString('en-IN')}`,
          sub: `${plRatio}% margin`,
        },
        {
          label: 'Cash & Bank',
          value: `${ctx.currency} ${closingBalance.toLocaleString('en-IN')}`,
        },
        {
          label: 'Fee Receivable',
          value: `${ctx.currency} ${receivables.total.toLocaleString('en-IN')}`,
        },
        { label: 'Operating Margin', value: `${operatingMargin}%` },
        {
          label: 'Closed Days Posted',
          value: String(closedDays),
          sub: 'via Payment Reconciliation',
        },
      ],
    },
  };
}

export function accountsLedgerToCsv(
  payload: AccountsLedgerPayload,
  sectionKey: 'income' | 'balance' | 'cashflow' | 'full',
): string {
  const lines: string[] = [];
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

  lines.push(`Accounts & Ledger — ${payload.academicYear}`);
  lines.push(`Generated,${payload.asOf}`);
  lines.push(`Posting source,${payload.posting.source}`);
  lines.push(`Closed reconciliation days,${payload.posting.closedDays}`);
  lines.push(`Note,${esc(payload.posting.message)}`);
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

  if (sectionKey === 'income' || sectionKey === 'full') {
    addRows('Income Statement (Profit & Loss)', payload.incomeStatement.rows);
  }
  if (sectionKey === 'balance' || sectionKey === 'full') {
    addRows('Balance Sheet', payload.balanceSheet.rows);
  }
  if (sectionKey === 'cashflow' || sectionKey === 'full') {
    addRows('Cash Flow Statement', payload.cashFlow.rows);
    lines.push('Monthly Cash Flow');
    lines.push('Month,Operating,Investing,Financing,Net');
    for (const m of payload.cashFlow.monthly) {
      lines.push(`${m.month},${m.operating},${m.investing},${m.financing},${m.net}`);
    }
    lines.push('');
  }
  if (sectionKey === 'full') {
    lines.push('Financial Ratios');
    lines.push('Ratio,Value');
    lines.push(`Operating Margin,${payload.ratios.operatingMargin}%`);
    lines.push(`Current Ratio (Liquidity),${payload.ratios.currentRatio}`);
    lines.push(`P&L Ratio (Net Margin),${payload.ratios.plRatio}%`);
    lines.push(`Gross Margin,${payload.ratios.grossMargin}%`);
  }

  return lines.join('\n');
}
