import {
  FeeApprovalStatus,
  FeeDueStatus,
  FeeFineLevyStatus,
  FeeInvoiceStatus,
  FeeMasterStatus,
  FeePaymentMode,
  PayrollSlipStatus,
} from '@prisma/client';
import { prisma } from './prisma.js';
import { getFeeDashboard } from './feeDashboard.js';
import { getStatutoryReport } from './payroll.js';

export type FinancialReportType =
  | 'overview'
  | 'fee-collection'
  | 'fee-dues'
  | 'fee-masters'
  | 'invoices'
  | 'discounts-concessions'
  | 'refunds'
  | 'fines-penalties'
  | 'scholarships'
  | 'transport-fee'
  | 'hostel-fee'
  | 'other-charges'
  | 'payroll'
  | 'epf-esic'
  | 'collection-modes'
  | 'cash-flow';

export const FINANCIAL_REPORT_CATALOG: {
  id: FinancialReportType;
  tab: string;
  title: string;
  description: string;
}[] = [
  {
    id: 'overview',
    tab: 'Fee Dashboard',
    title: 'Financial Overview Report',
    description: 'KPIs — total due, collection, pending, overdue, discounts & collection %',
  },
  {
    id: 'fee-collection',
    tab: 'Fee Collection',
    title: 'Fee Collection Report',
    description: 'All fee receipts with student, class, amount, payment mode & collector',
  },
  {
    id: 'fee-dues',
    tab: 'Fee Collection',
    title: 'Fee Dues & Outstanding Report',
    description: 'Pending and overdue fee dues by student with due dates',
  },
  {
    id: 'fee-masters',
    tab: 'Fee Masters',
    title: 'Fee Masters Report',
    description: 'Configured fee heads, categories, default amounts & visibility flags',
  },
  {
    id: 'invoices',
    tab: 'Invoices',
    title: 'Fee Invoices Report',
    description: 'Generated invoices with status, amounts, concessions & payment details',
  },
  {
    id: 'discounts-concessions',
    tab: 'Discounts & Concessions',
    title: 'Discounts & Concessions Report',
    description: 'Discount codes, values, scope, approval status & usage',
  },
  {
    id: 'refunds',
    tab: 'Refunds',
    title: 'Refunds Report',
    description: 'Fee refund requests with type, amount, status & processing details',
  },
  {
    id: 'fines-penalties',
    tab: 'Fine / Penalties',
    title: 'Fines & Penalties Report',
    description: 'Fine levies by student with fine type, amount & payment status',
  },
  {
    id: 'scholarships',
    tab: 'Scholarship',
    title: 'Scholarship Report',
    description: 'Scholarship schemes and student awards with amounts & status',
  },
  {
    id: 'transport-fee',
    tab: 'Transport Fee',
    title: 'Transport Fee Report',
    description: 'Transport fee collections and vendor payments',
  },
  {
    id: 'hostel-fee',
    tab: 'Hostel Fee',
    title: 'Hostel Fee Report',
    description: 'Hostel fee collections by category, room & student',
  },
  {
    id: 'other-charges',
    tab: 'Other Charges',
    title: 'Other Charges Report',
    description: 'Discount codes & account settlement requests with approval status',
  },
  {
    id: 'payroll',
    tab: 'Payroll',
    title: 'Payroll Slips Report',
    description: 'Monthly payroll slips with earnings, deductions & net pay',
  },
  {
    id: 'epf-esic',
    tab: 'Payroll',
    title: 'EPF & ESIC Statutory Report',
    description: 'Employee & employer EPF / ESIC contributions by pay period',
  },
  {
    id: 'collection-modes',
    tab: 'Online Payments',
    title: 'Collection Mode Report',
    description: 'Fee collection breakdown by payment mode (Cash, UPI, Card, etc.)',
  },
  {
    id: 'cash-flow',
    tab: 'Bank & Cash Book',
    title: 'Cash Flow Report',
    description: 'Monthly fee inflows vs refund & vendor outflows',
  },
];

export type FinancialReportPayload = {
  reportType: FinancialReportType;
  reportTitle: string;
  tab: string;
  academicYear: string;
  financialYear: string;
  payPeriod: string | null;
  generatedAt: string;
  summary: Record<string, unknown>;
  columns: { key: string; label: string }[];
  rows: Record<string, unknown>[];
};

function col(key: string, label: string) {
  return { key, label };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

const MODE_LABELS: Record<FeePaymentMode, string> = {
  CASH: 'Cash',
  UPI: 'UPI',
  CARD: 'Card',
  CHEQUE: 'Cheque',
  BANK_TRANSFER: 'Bank Transfer',
};

function defaultPayPeriod(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export async function generateFinancialReport(
  institutionId: string,
  reportType: FinancialReportType,
  opts: { academicYear?: string; financialYear?: string; payPeriod?: string },
): Promise<FinancialReportPayload> {
  const academicYear = opts.academicYear || '2025-26';
  const financialYear = opts.financialYear || academicYear;
  const payPeriod = opts.payPeriod || defaultPayPeriod();
  const meta = FINANCIAL_REPORT_CATALOG.find((r) => r.id === reportType)!;
  const generatedAt = new Date().toISOString();

  switch (reportType) {
    case 'overview':
      return buildOverviewReport(institutionId, academicYear, financialYear, meta, generatedAt);
    case 'fee-collection':
      return buildFeeCollectionReport(institutionId, academicYear, financialYear, meta, generatedAt);
    case 'fee-dues':
      return buildFeeDuesReport(institutionId, academicYear, financialYear, meta, generatedAt);
    case 'fee-masters':
      return buildFeeMastersReport(institutionId, meta, generatedAt);
    case 'invoices':
      return buildInvoicesReport(institutionId, academicYear, financialYear, meta, generatedAt);
    case 'discounts-concessions':
      return buildDiscountsReport(institutionId, academicYear, financialYear, meta, generatedAt);
    case 'refunds':
      return buildRefundsReport(institutionId, academicYear, financialYear, meta, generatedAt);
    case 'fines-penalties':
      return buildFinesReport(institutionId, academicYear, financialYear, meta, generatedAt);
    case 'scholarships':
      return buildScholarshipsReport(institutionId, academicYear, financialYear, meta, generatedAt);
    case 'transport-fee':
      return buildTransportFeeReport(institutionId, academicYear, financialYear, meta, generatedAt);
    case 'hostel-fee':
      return buildHostelFeeReport(institutionId, academicYear, financialYear, meta, generatedAt);
    case 'other-charges':
      return buildOtherChargesReport(institutionId, academicYear, financialYear, meta, generatedAt);
    case 'payroll':
      return buildPayrollReport(institutionId, payPeriod, academicYear, financialYear, meta, generatedAt);
    case 'epf-esic':
      return buildEpfEsicReport(institutionId, payPeriod, academicYear, financialYear, meta, generatedAt);
    case 'collection-modes':
      return buildCollectionModesReport(institutionId, academicYear, financialYear, meta, generatedAt);
    case 'cash-flow':
      return buildCashFlowReport(institutionId, academicYear, financialYear, meta, generatedAt);
    default:
      throw new Error(`Unknown report type: ${reportType}`);
  }
}

async function buildOverviewReport(
  institutionId: string,
  academicYear: string,
  financialYear: string,
  meta: (typeof FINANCIAL_REPORT_CATALOG)[0],
  generatedAt: string,
): Promise<FinancialReportPayload> {
  const dashboard = await getFeeDashboard(institutionId, { academicYear, financialYear });
  const kpis = dashboard.kpis;
  const rows: Record<string, unknown>[] = [
    { metric: 'Total Fee Due', value: kpis.totalFeeDue },
    { metric: 'Total Collection', value: kpis.totalCollection },
    { metric: 'Pending Amount', value: kpis.pendingAmount },
    { metric: 'Collection %', value: `${kpis.collectionPct}%` },
    { metric: 'Overdue Amount', value: kpis.overdueAmount },
    { metric: 'Total Discounts', value: kpis.totalDiscounts },
    { metric: 'Active Students', value: kpis.studentCount },
    { metric: 'Receipt Count', value: kpis.receiptCount },
    ...dashboard.collectionOverview.items.map((i) => ({
      metric: `Collection — ${i.name}`,
      value: i.amount,
    })),
    ...dashboard.installments.rows.map((i) => ({
      metric: `Installment — ${i.name}`,
      value: `Due ${i.due} / Collected ${i.collected} / Pending ${i.pending}`,
    })),
  ];

  return {
    reportType: meta.id,
    reportTitle: meta.title,
    tab: meta.tab,
    academicYear,
    financialYear,
    payPeriod: null,
    generatedAt,
    summary: {
      totalFeeDue: kpis.totalFeeDue,
      totalCollection: kpis.totalCollection,
      pendingAmount: kpis.pendingAmount,
      collectionPct: kpis.collectionPct,
      overdueAmount: kpis.overdueAmount,
      totalDiscounts: kpis.totalDiscounts,
      studentCount: kpis.studentCount,
      receiptCount: kpis.receiptCount,
    },
    columns: [col('metric', 'Metric'), col('value', 'Value')],
    rows,
  };
}

async function buildFeeCollectionReport(
  institutionId: string,
  academicYear: string,
  financialYear: string,
  meta: (typeof FINANCIAL_REPORT_CATALOG)[0],
  generatedAt: string,
): Promise<FinancialReportPayload> {
  const receipts = await prisma.feeReceipt.findMany({
    where: { institutionId, academicYear },
    orderBy: { collectedAt: 'desc' },
  });
  const total = round2(receipts.reduce((s, r) => s + r.amountPaid, 0));
  return {
    reportType: meta.id,
    reportTitle: meta.title,
    tab: meta.tab,
    academicYear,
    financialYear,
    payPeriod: null,
    generatedAt,
    summary: { receiptCount: receipts.length, totalCollection: total },
    columns: [
      col('receiptNumber', 'Receipt No'),
      col('studentName', 'Student'),
      col('admissionNumber', 'Admission No'),
      col('className', 'Class'),
      col('sectionName', 'Section'),
      col('paymentMode', 'Mode'),
      col('amountPaid', 'Amount'),
      col('collectedBy', 'Collected By'),
      col('collectedAt', 'Date'),
    ],
    rows: receipts.map((r) => ({
      receiptNumber: r.receiptNumber,
      studentName: r.studentName,
      admissionNumber: r.admissionNumber,
      className: r.className,
      sectionName: r.sectionName,
      paymentMode: MODE_LABELS[r.paymentMode] || r.paymentMode,
      amountPaid: r.amountPaid,
      collectedBy: r.collectedBy,
      collectedAt: r.collectedAt.toISOString().slice(0, 10),
    })),
  };
}

async function buildFeeDuesReport(
  institutionId: string,
  academicYear: string,
  financialYear: string,
  meta: (typeof FINANCIAL_REPORT_CATALOG)[0],
  generatedAt: string,
): Promise<FinancialReportPayload> {
  const dues = await prisma.feeDue.findMany({
    where: { institutionId, academicYear, status: { not: FeeDueStatus.CANCELLED } },
    orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
  });
  const pending = dues.filter((d) => d.status === FeeDueStatus.PENDING || d.status === FeeDueStatus.OVERDUE);
  return {
    reportType: meta.id,
    reportTitle: meta.title,
    tab: meta.tab,
    academicYear,
    financialYear,
    payPeriod: null,
    generatedAt,
    summary: {
      totalDues: dues.length,
      pendingCount: pending.length,
      pendingAmount: round2(pending.reduce((s, d) => s + d.amount, 0)),
      overdueAmount: round2(
        dues.filter((d) => d.status === FeeDueStatus.OVERDUE).reduce((s, d) => s + d.amount, 0),
      ),
    },
    columns: [
      col('title', 'Title'),
      col('admissionNumber', 'Admission No'),
      col('feeHead', 'Fee Head'),
      col('amount', 'Amount'),
      col('status', 'Status'),
      col('dueDate', 'Due Date'),
      col('remarks', 'Remarks'),
    ],
    rows: dues.map((d) => ({
      title: d.title,
      admissionNumber: d.admissionNumber,
      feeHead: d.feeHead,
      amount: d.amount,
      status: d.status,
      dueDate: d.dueDate.toISOString().slice(0, 10),
      remarks: d.remarks,
    })),
  };
}

async function buildFeeMastersReport(
  institutionId: string,
  meta: (typeof FINANCIAL_REPORT_CATALOG)[0],
  generatedAt: string,
): Promise<FinancialReportPayload> {
  const masters = await prisma.feeMaster.findMany({
    where: { institutionId },
    orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
  });
  return {
    reportType: meta.id,
    reportTitle: meta.title,
    tab: meta.tab,
    academicYear: '—',
    financialYear: '—',
    payPeriod: null,
    generatedAt,
    summary: {
      totalHeads: masters.length,
      activeHeads: masters.filter((m) => m.status === FeeMasterStatus.ACTIVE).length,
    },
    columns: [
      col('code', 'Code'),
      col('name', 'Name'),
      col('category', 'Category'),
      col('defaultAmount', 'Default Amount'),
      col('isRefundable', 'Refundable'),
      col('isTaxable', 'Taxable'),
      col('status', 'Status'),
      col('showInCollection', 'In Collection'),
      col('showInInvoice', 'In Invoice'),
    ],
    rows: masters.map((m) => ({
      code: m.code,
      name: m.name,
      category: m.category,
      defaultAmount: m.defaultAmount,
      isRefundable: m.isRefundable ? 'Yes' : 'No',
      isTaxable: m.isTaxable ? 'Yes' : 'No',
      status: m.status,
      showInCollection: m.showInCollection ? 'Yes' : 'No',
      showInInvoice: m.showInInvoice ? 'Yes' : 'No',
    })),
  };
}

async function buildInvoicesReport(
  institutionId: string,
  academicYear: string,
  financialYear: string,
  meta: (typeof FINANCIAL_REPORT_CATALOG)[0],
  generatedAt: string,
): Promise<FinancialReportPayload> {
  const invoices = await prisma.feeInvoice.findMany({
    where: { institutionId, academicYear },
    orderBy: { invoiceDate: 'desc' },
  });
  return {
    reportType: meta.id,
    reportTitle: meta.title,
    tab: meta.tab,
    academicYear,
    financialYear,
    payPeriod: null,
    generatedAt,
    summary: {
      invoiceCount: invoices.length,
      totalFee: round2(invoices.reduce((s, i) => s + i.totalFee, 0)),
      totalPaid: round2(invoices.reduce((s, i) => s + i.amountPaid, 0)),
      pending: round2(
        invoices
          .filter((i) => i.status !== FeeInvoiceStatus.PAID && i.status !== FeeInvoiceStatus.CANCELLED)
          .reduce((s, i) => s + Math.max(i.totalFee - i.amountPaid, 0), 0),
      ),
    },
    columns: [
      col('invoiceNumber', 'Invoice No'),
      col('studentName', 'Student'),
      col('className', 'Class'),
      col('feePeriod', 'Period'),
      col('totalFee', 'Total Fee'),
      col('concessionAmount', 'Concession'),
      col('amountPaid', 'Paid'),
      col('status', 'Status'),
      col('invoiceDate', 'Date'),
    ],
    rows: invoices.map((i) => ({
      invoiceNumber: i.invoiceNumber,
      studentName: i.studentName,
      className: `${i.className}${i.sectionName ? ` ${i.sectionName}` : ''}`,
      feePeriod: i.feePeriod,
      totalFee: i.totalFee,
      concessionAmount: i.concessionAmount,
      amountPaid: i.amountPaid,
      status: i.status,
      invoiceDate: i.invoiceDate.toISOString().slice(0, 10),
    })),
  };
}

async function buildDiscountsReport(
  institutionId: string,
  academicYear: string,
  financialYear: string,
  meta: (typeof FINANCIAL_REPORT_CATALOG)[0],
  generatedAt: string,
): Promise<FinancialReportPayload> {
  const discounts = await prisma.feeDiscount.findMany({
    where: { institutionId, academicYear },
    orderBy: { createdAt: 'desc' },
  });
  return {
    reportType: meta.id,
    reportTitle: meta.title,
    tab: meta.tab,
    academicYear,
    financialYear,
    payPeriod: null,
    generatedAt,
    summary: {
      discountCount: discounts.length,
      activeCount: discounts.filter((d) => d.status === FeeApprovalStatus.ACTIVE).length,
      pendingCount: discounts.filter((d) => d.status === FeeApprovalStatus.PENDING_APPROVAL).length,
    },
    columns: [
      col('code', 'Code'),
      col('name', 'Name'),
      col('discountType', 'Type'),
      col('value', 'Value'),
      col('scope', 'Scope'),
      col('studentName', 'Student'),
      col('status', 'Status'),
      col('requestedBy', 'Requested By'),
      col('approvedBy', 'Approved By'),
    ],
    rows: discounts.map((d) => ({
      code: d.code,
      name: d.name,
      discountType: d.discountType,
      value: d.value,
      scope: d.scope,
      studentName: d.studentName || '—',
      status: d.status,
      requestedBy: d.requestedBy,
      approvedBy: d.approvedBy || '—',
    })),
  };
}

async function buildRefundsReport(
  institutionId: string,
  academicYear: string,
  financialYear: string,
  meta: (typeof FINANCIAL_REPORT_CATALOG)[0],
  generatedAt: string,
): Promise<FinancialReportPayload> {
  const refunds = await prisma.feeRefund.findMany({
    where: { institutionId, academicYear },
    orderBy: { createdAt: 'desc' },
  });
  return {
    reportType: meta.id,
    reportTitle: meta.title,
    tab: meta.tab,
    academicYear,
    financialYear,
    payPeriod: null,
    generatedAt,
    summary: {
      refundCount: refunds.length,
      totalAmount: round2(refunds.reduce((s, r) => s + r.amount, 0)),
      processedAmount: round2(
        refunds.filter((r) => r.status === FeeApprovalStatus.PROCESSED).reduce((s, r) => s + r.amount, 0),
      ),
    },
    columns: [
      col('recordId', 'Refund No'),
      col('studentName', 'Student'),
      col('refundType', 'Type'),
      col('amount', 'Amount'),
      col('status', 'Status'),
      col('requestedBy', 'Requested By'),
      col('processedAt', 'Processed At'),
      col('remarks', 'Remarks'),
    ],
    rows: refunds.map((r) => ({
      recordId: r.recordId,
      studentName: r.studentName,
      refundType: r.refundType,
      amount: r.amount,
      status: r.status,
      requestedBy: r.requestedBy,
      processedAt: r.processedAt ? r.processedAt.toISOString().slice(0, 10) : '—',
      remarks: r.remarks,
    })),
  };
}

async function buildFinesReport(
  institutionId: string,
  academicYear: string,
  financialYear: string,
  meta: (typeof FINANCIAL_REPORT_CATALOG)[0],
  generatedAt: string,
): Promise<FinancialReportPayload> {
  const levies = await prisma.feeFineLevy.findMany({
    where: { institutionId, academicYear },
    include: { fineType: { select: { name: true, code: true, category: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return {
    reportType: meta.id,
    reportTitle: meta.title,
    tab: meta.tab,
    academicYear,
    financialYear,
    payPeriod: null,
    generatedAt,
    summary: {
      levyCount: levies.length,
      totalAmount: round2(levies.reduce((s, l) => s + l.amount, 0)),
      paidAmount: round2(
        levies.filter((l) => l.status === FeeFineLevyStatus.PAID).reduce((s, l) => s + l.amount, 0),
      ),
      waivedCount: levies.filter((l) => l.status === FeeFineLevyStatus.WAIVED).length,
    },
    columns: [
      col('reference', 'Reference'),
      col('fineType', 'Fine Type'),
      col('studentName', 'Student'),
      col('className', 'Class'),
      col('amount', 'Amount'),
      col('status', 'Status'),
      col('leviedAt', 'Levied Date'),
      col('collectedAt', 'Collected Date'),
    ],
    rows: levies.map((l) => ({
      reference: l.id.slice(-8).toUpperCase(),
      fineType: l.fineType?.name || l.fineTypeId,
      studentName: l.studentName,
      className: l.className,
      amount: l.amount,
      status: l.status,
      leviedAt: l.createdAt.toISOString().slice(0, 10),
      collectedAt: l.collectedAt ? l.collectedAt.toISOString().slice(0, 10) : '—',
    })),
  };
}

async function buildScholarshipsReport(
  institutionId: string,
  academicYear: string,
  financialYear: string,
  meta: (typeof FINANCIAL_REPORT_CATALOG)[0],
  generatedAt: string,
): Promise<FinancialReportPayload> {
  const [scholarships, awards] = await Promise.all([
    prisma.feeScholarship.findMany({
      where: { institutionId, academicYear },
      orderBy: { name: 'asc' },
    }),
    prisma.feeScholarshipAward.findMany({
      where: { institutionId, academicYear },
      include: { scholarship: { select: { name: true, code: true } } },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const rows: Record<string, unknown>[] = [
    ...scholarships.map((s) => ({
      recordType: 'Scheme',
      code: s.code,
      name: s.name,
      studentName: '—',
      amount: s.waiverValue,
      status: s.status,
      date: s.createdAt.toISOString().slice(0, 10),
    })),
    ...awards.map((a) => ({
      recordType: 'Award',
      code: a.scholarship?.code || '—',
      name: a.scholarship?.name || '—',
      studentName: a.studentName,
      amount: a.amount,
      status: a.status,
      date: a.createdAt.toISOString().slice(0, 10),
    })),
  ];

  return {
    reportType: meta.id,
    reportTitle: meta.title,
    tab: meta.tab,
    academicYear,
    financialYear,
    payPeriod: null,
    generatedAt,
    summary: {
      schemeCount: scholarships.length,
      awardCount: awards.length,
      totalAwarded: round2(awards.reduce((s, a) => s + a.amount, 0)),
    },
    columns: [
      col('recordType', 'Type'),
      col('code', 'Code'),
      col('name', 'Scholarship'),
      col('studentName', 'Student'),
      col('amount', 'Amount'),
      col('status', 'Status'),
      col('date', 'Date'),
    ],
    rows,
  };
}

async function buildTransportFeeReport(
  institutionId: string,
  academicYear: string,
  financialYear: string,
  meta: (typeof FINANCIAL_REPORT_CATALOG)[0],
  generatedAt: string,
): Promise<FinancialReportPayload> {
  const [collections, payments] = await Promise.all([
    prisma.transportFeeCollection.findMany({
      where: { institutionId, academicYear },
      orderBy: { collectedAt: 'desc' },
    }),
    prisma.transportVendorPayment.findMany({
      where: { institutionId },
      include: { vendor: { select: { vendorName: true, vendorCode: true } } },
      orderBy: { paymentDate: 'desc' },
    }),
  ]);

  const rows: Record<string, unknown>[] = [
    ...collections.map((c) => ({
      entryType: 'Collection',
      reference: c.receiptNumber,
      vendor: c.routeName || '—',
      studentName: c.studentName,
      amount: c.amount,
      paymentMode: c.paymentMode,
      date: c.collectedAt.toISOString().slice(0, 10),
    })),
    ...payments.map((p) => ({
      entryType: 'Vendor Payment',
      reference: p.paymentNumber,
      vendor: p.vendor?.vendorName || '—',
      studentName: '—',
      amount: p.amount,
      paymentMode: p.paymentMode,
      date: p.paymentDate.toISOString().slice(0, 10),
    })),
  ];

  return {
    reportType: meta.id,
    reportTitle: meta.title,
    tab: meta.tab,
    academicYear,
    financialYear,
    payPeriod: null,
    generatedAt,
    summary: {
      collectionCount: collections.length,
      collectionTotal: round2(collections.reduce((s, c) => s + c.amount, 0)),
      vendorPaymentTotal: round2(payments.reduce((s, p) => s + p.amount, 0)),
    },
    columns: [
      col('entryType', 'Type'),
      col('reference', 'Reference'),
      col('vendor', 'Vendor'),
      col('studentName', 'Student'),
      col('amount', 'Amount'),
      col('paymentMode', 'Mode'),
      col('date', 'Date'),
    ],
    rows,
  };
}

async function buildHostelFeeReport(
  institutionId: string,
  academicYear: string,
  financialYear: string,
  meta: (typeof FINANCIAL_REPORT_CATALOG)[0],
  generatedAt: string,
): Promise<FinancialReportPayload> {
  const collections = await prisma.hostelFeeCollection.findMany({
    where: { institutionId, academicYear },
    include: { category: { select: { name: true, code: true } } },
    orderBy: { collectedAt: 'desc' },
  });
  return {
    reportType: meta.id,
    reportTitle: meta.title,
    tab: meta.tab,
    academicYear,
    financialYear,
    payPeriod: null,
    generatedAt,
    summary: {
      collectionCount: collections.length,
      totalAmount: round2(collections.reduce((s, c) => s + c.amount, 0)),
    },
    columns: [
      col('receiptNumber', 'Receipt No'),
      col('category', 'Category'),
      col('studentName', 'Student'),
      col('admissionNumber', 'Admission No'),
      col('roomNumber', 'Room'),
      col('periodLabel', 'Period'),
      col('amount', 'Amount'),
      col('paymentMode', 'Mode'),
      col('collectedAt', 'Date'),
    ],
    rows: collections.map((c) => ({
      receiptNumber: c.receiptNumber,
      category: c.category?.name || '—',
      studentName: c.studentName,
      admissionNumber: c.admissionNumber,
      roomNumber: c.roomNumber,
      periodLabel: c.periodLabel,
      amount: c.amount,
      paymentMode: c.paymentMode,
      collectedAt: c.collectedAt.toISOString().slice(0, 10),
    })),
  };
}

async function buildOtherChargesReport(
  institutionId: string,
  academicYear: string,
  financialYear: string,
  meta: (typeof FINANCIAL_REPORT_CATALOG)[0],
  generatedAt: string,
): Promise<FinancialReportPayload> {
  const requests = await prisma.feeOtherChargeRequest.findMany({
    where: { institutionId, academicYear },
    orderBy: { createdAt: 'desc' },
  });
  return {
    reportType: meta.id,
    reportTitle: meta.title,
    tab: meta.tab,
    academicYear,
    financialYear,
    payPeriod: null,
    generatedAt,
    summary: {
      requestCount: requests.length,
      pendingApproval: requests.filter((r) => r.status === FeeApprovalStatus.PENDING_APPROVAL).length,
      activeDiscounts: requests.filter(
        (r) => r.requestType === 'NEW_ADMISSION_DISCOUNT' && r.status === FeeApprovalStatus.ACTIVE,
      ).length,
      approvedSettlements: requests.filter(
        (r) => r.requestType === 'ACCOUNT_SETTLEMENT' && r.status === FeeApprovalStatus.APPROVED,
      ).length,
    },
    columns: [
      col('recordId', 'Ref'),
      col('requestType', 'Type'),
      col('code', 'Code'),
      col('name', 'Title'),
      col('studentName', 'Student'),
      col('valueOrAmount', 'Value / Amount'),
      col('status', 'Status'),
      col('requestedBy', 'Requested By'),
      col('approvedBy', 'Approved By'),
    ],
    rows: requests.map((r) => ({
      recordId: r.recordId,
      requestType: r.requestType === 'NEW_ADMISSION_DISCOUNT' ? 'New Admission Discount' : 'Account Settlement',
      code: r.code,
      name: r.name,
      studentName: r.studentName || '—',
      valueOrAmount:
        r.requestType === 'ACCOUNT_SETTLEMENT'
          ? r.settlementAmount
          : r.discountType === 'PERCENTAGE' || r.discountType === 'PERCENT'
            ? `${r.value}%`
            : r.value,
      status: r.status,
      requestedBy: r.requestedBy,
      approvedBy: r.approvedBy || '—',
    })),
  };
}

async function buildPayrollReport(
  institutionId: string,
  payPeriod: string,
  academicYear: string,
  financialYear: string,
  meta: (typeof FINANCIAL_REPORT_CATALOG)[0],
  generatedAt: string,
): Promise<FinancialReportPayload> {
  const slips = await prisma.payrollSlip.findMany({
    where: {
      institutionId,
      payPeriod,
      status: { in: [PayrollSlipStatus.GENERATED, PayrollSlipStatus.PAID] },
    },
    include: {
      employee: { select: { employeeCode: true, fullName: true, department: true } },
    },
    orderBy: { slipNumber: 'asc' },
  });
  return {
    reportType: meta.id,
    reportTitle: meta.title,
    tab: meta.tab,
    academicYear,
    financialYear,
    payPeriod,
    generatedAt,
    summary: {
      slipCount: slips.length,
      totalGross: round2(slips.reduce((s, p) => s + p.grossEarnings, 0)),
      totalNet: round2(slips.reduce((s, p) => s + p.netPay, 0)),
      totalDeductions: round2(slips.reduce((s, p) => s + p.totalDeductions, 0)),
      paidCount: slips.filter((p) => p.status === PayrollSlipStatus.PAID).length,
    },
    columns: [
      col('slipNumber', 'Slip No'),
      col('employeeCode', 'Code'),
      col('employeeName', 'Employee'),
      col('department', 'Department'),
      col('grossEarnings', 'Gross'),
      col('epfEmployee', 'EPF EE'),
      col('esicEmployee', 'ESIC EE'),
      col('totalDeductions', 'Deductions'),
      col('netPay', 'Net Pay'),
      col('status', 'Status'),
    ],
    rows: slips.map((s) => ({
      slipNumber: s.slipNumber,
      employeeCode: s.employee.employeeCode,
      employeeName: s.employee.fullName,
      department: s.employee.department,
      grossEarnings: s.grossEarnings,
      epfEmployee: s.epfEmployee,
      esicEmployee: s.esicEmployee,
      totalDeductions: s.totalDeductions,
      netPay: s.netPay,
      status: s.status,
    })),
  };
}

async function buildEpfEsicReport(
  institutionId: string,
  payPeriod: string,
  academicYear: string,
  financialYear: string,
  meta: (typeof FINANCIAL_REPORT_CATALOG)[0],
  generatedAt: string,
): Promise<FinancialReportPayload> {
  const report = await getStatutoryReport(institutionId, payPeriod);
  return {
    reportType: meta.id,
    reportTitle: meta.title,
    tab: meta.tab,
    academicYear,
    financialYear,
    payPeriod,
    generatedAt,
    summary: report.totals,
    columns: [
      col('employeeCode', 'Code'),
      col('employeeName', 'Employee'),
      col('department', 'Department'),
      col('uanNumber', 'UAN'),
      col('pfNumber', 'PF No'),
      col('esicNumber', 'ESIC No'),
      col('grossEarnings', 'Gross'),
      col('epfEmployee', 'EPF EE'),
      col('epfEmployer', 'EPF ER'),
      col('esicEmployee', 'ESIC EE'),
      col('esicEmployer', 'ESIC ER'),
      col('professionalTax', 'PT'),
      col('netPay', 'Net Pay'),
    ],
    rows: report.rows,
  };
}

async function buildCollectionModesReport(
  institutionId: string,
  academicYear: string,
  financialYear: string,
  meta: (typeof FINANCIAL_REPORT_CATALOG)[0],
  generatedAt: string,
): Promise<FinancialReportPayload> {
  const dashboard = await getFeeDashboard(institutionId, { academicYear, financialYear });
  const modes = dashboard.collectionModes;
  return {
    reportType: meta.id,
    reportTitle: meta.title,
    tab: meta.tab,
    academicYear,
    financialYear,
    payPeriod: null,
    generatedAt,
    summary: { totalCollection: modes.total, modeCount: modes.items.length },
    columns: [
      col('paymentMode', 'Payment Mode'),
      col('amount', 'Amount'),
      col('percentage', 'Share %'),
      col('receiptCount', 'Receipts'),
    ],
    rows: await (async () => {
      const receipts = await prisma.feeReceipt.findMany({
        where: { institutionId, academicYear },
        select: { paymentMode: true },
      });
      const counts: Record<string, number> = {};
      for (const r of receipts) {
        const label = MODE_LABELS[r.paymentMode] || r.paymentMode;
        counts[label] = (counts[label] || 0) + 1;
      }
      return modes.items.map((m) => ({
        paymentMode: m.name,
        amount: m.amount,
        percentage: m.value,
        receiptCount: counts[m.name] || 0,
      }));
    })(),
  };
}

async function buildCashFlowReport(
  institutionId: string,
  academicYear: string,
  financialYear: string,
  meta: (typeof FINANCIAL_REPORT_CATALOG)[0],
  generatedAt: string,
): Promise<FinancialReportPayload> {
  const dashboard = await getFeeDashboard(institutionId, { academicYear, financialYear });
  const cf = dashboard.cashFlow;
  return {
    reportType: meta.id,
    reportTitle: meta.title,
    tab: meta.tab,
    academicYear,
    financialYear,
    payPeriod: null,
    generatedAt,
    summary: {
      totalInflow: cf.totalInflow,
      totalOutflow: cf.totalOutflow,
      netCashFlow: round2(cf.totalInflow - cf.totalOutflow),
    },
    columns: [
      col('month', 'Month'),
      col('inflow', 'Inflow'),
      col('outflow', 'Outflow'),
      col('net', 'Net'),
    ],
    rows: cf.months.map((m) => ({
      month: m.month,
      inflow: m.inflowAmount,
      outflow: m.outflowAmount,
      net: round2(m.inflowAmount - m.outflowAmount),
    })),
  };
}

export async function generateAllFinancialReports(
  institutionId: string,
  opts: { academicYear?: string; financialYear?: string; payPeriod?: string },
) {
  const academicYear = opts.academicYear || '2025-26';
  const financialYear = opts.financialYear || academicYear;
  const payPeriod = opts.payPeriod || defaultPayPeriod();
  const reports: FinancialReportPayload[] = [];
  for (const item of FINANCIAL_REPORT_CATALOG) {
    reports.push(
      await generateFinancialReport(institutionId, item.id, { academicYear, financialYear, payPeriod }),
    );
  }
  return {
    academicYear,
    financialYear,
    payPeriod,
    generatedAt: new Date().toISOString(),
    reportCount: reports.length,
    reports,
  };
}

export function reportToCsv(payload: FinancialReportPayload): string {
  const header = payload.columns.map((c) => c.label).join(',');
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const body = payload.rows.map((row) =>
    payload.columns.map((c) => escape(row[c.key])).join(','),
  );
  return [header, ...body].join('\n');
}
