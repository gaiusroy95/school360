import {
  AdmissionRecordStatus,
  FeeApprovalStatus,
  FeeDueStatus,
  FeePaymentMode,
  ParentCommunicationChannel,
  StudentStatus,
} from '@prisma/client';
import { prisma } from './prisma.js';
import {
  findFeeSchedule,
  loadFeeCollectionContext,
  type FeeSchedule,
} from './feeConfig.js';
import { getInstitutionFilterMeta } from './students.js';
import { seedExpenseCategories } from './expenseManagement.js';

const MODE_LABELS: Record<FeePaymentMode, string> = {
  CASH: 'Cash',
  UPI: 'UPI',
  CARD: 'Card',
  CHEQUE: 'Cheque',
  BANK_TRANSFER: 'Bank Transfer',
};

const OVERVIEW_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#64748b', '#8b5cf6', '#ec4899'];
const MODE_COLORS: Record<string, string> = {
  Cash: '#64748b',
  UPI: '#f59e0b',
  Card: '#10b981',
  Cheque: '#ef4444',
  'Bank Transfer': '#3b82f6',
  Online: '#6366f1',
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

const INSTALLMENT_LABELS = ['1st Installment', '2nd Installment', '3rd Installment', '4th Installment'];

function previousAcademicYear(year: string): string {
  const m = year.match(/^(\d{4})-(\d{2})$/);
  if (!m) return year;
  const start = Number(m[1]) - 1;
  const end = String(Number(m[2]) - 1).padStart(2, '0');
  return `${start}-${end}`;
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

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function pctChange(current: number, previous: number): number | null {
  if (previous <= 0) return current > 0 ? 100 : null;
  return round2(((current - previous) / previous) * 100);
}

type StudentRow = {
  id: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  className: string;
  sectionName: string;
};

async function loadStudents(institutionId: string, academicYear: string): Promise<StudentRow[]> {
  const students = await prisma.student.findMany({
    where: {
      institutionId,
      academicYear,
      status: StudentStatus.ACTIVE,
    },
    select: {
      id: true,
      admissionNumber: true,
      firstName: true,
      lastName: true,
      className: true,
      sectionName: true,
    },
    orderBy: [{ className: 'asc' }, { sectionName: 'asc' }, { firstName: 'asc' }],
  });

  if (students.length > 0) return students;

  const admissions = await prisma.admissionRecord.findMany({
    where: {
      institutionId,
      academicYear,
      status: AdmissionRecordStatus.CONFIRMED,
    },
    include: {
      application: { select: { studentName: true } },
    },
  });

  return admissions.map((a) => {
    const parts = a.application.studentName.trim().split(/\s+/);
    return {
      id: a.id,
      admissionNumber: a.admissionNumber || '',
      firstName: parts[0] || a.application.studentName,
      lastName: parts.slice(1).join(' '),
      className: a.className,
      sectionName: a.sectionName,
    };
  });
}

function expectedDueForStudents(students: StudentRow[], schedules: FeeSchedule[]): number {
  return students.reduce((sum, s) => {
    const schedule = findFeeSchedule(schedules, s.className, s.sectionName);
    return sum + (schedule?.total ?? 0);
  }, 0);
}

function headCategory(key: string): string {
  if (key === 'tuitionFee' || key === 'admissionFee' || key === 'registrationFee' || key === 'annualCharges') {
    return 'Tuition Fee';
  }
  if (key === 'transportFee') return 'Transport Fee';
  if (key === 'hostelFee') return 'Hostel Fee';
  if (key === 'examinationFee') return 'Exam Fee';
  return 'Other Fees';
}

type ReceiptRow = {
  id: string;
  receiptNumber: string;
  studentName: string;
  admissionNumber: string;
  className: string;
  sectionName: string;
  academicYear: string;
  paymentMode: FeePaymentMode;
  amountPaid: number;
  feeBreakdown: unknown;
  collectedAt: Date;
  collectedBy: string;
};

async function loadReceipts(institutionId: string, academicYear: string): Promise<ReceiptRow[]> {
  return prisma.feeReceipt.findMany({
    where: { institutionId, academicYear },
    orderBy: { collectedAt: 'desc' },
  });
}

async function yearTotals(institutionId: string, academicYear: string, schedules: FeeSchedule[]) {
  const [students, receipts, dues] = await Promise.all([
    loadStudents(institutionId, academicYear),
    loadReceipts(institutionId, academicYear),
    prisma.feeDue.findMany({
      where: { institutionId, academicYear, status: { not: FeeDueStatus.CANCELLED } },
    }),
  ]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const scheduleDue = expectedDueForStudents(students, schedules);
  const dueFromRecords = dues.reduce((s, d) => s + d.amount, 0);
  const totalDue = Math.max(scheduleDue, dueFromRecords, 0);

  const totalCollection = receipts.reduce((s, r) => s + r.amountPaid, 0);

  const pendingFromDues = dues
    .filter((d) => d.status === FeeDueStatus.PENDING || d.status === FeeDueStatus.OVERDUE)
    .reduce((s, d) => s + d.amount, 0);

  const pendingAmount =
    pendingFromDues > 0 ? pendingFromDues : Math.max(round2(totalDue - totalCollection), 0);

  const overdueAmount = dues
    .filter((d) => {
      if (d.status === FeeDueStatus.PAID || d.status === FeeDueStatus.CANCELLED) return false;
      if (d.status === FeeDueStatus.OVERDUE) return true;
      const due = new Date(d.dueDate);
      due.setHours(0, 0, 0, 0);
      return due < today;
    })
    .reduce((s, d) => s + d.amount, 0);

  const collectionPct = totalDue > 0 ? round2((totalCollection / totalDue) * 100) : 0;

  return {
    students,
    receipts,
    dues,
    totalDue: round2(totalDue),
    totalCollection: round2(totalCollection),
    pendingAmount: round2(pendingAmount),
    overdueAmount: round2(overdueAmount),
    collectionPct,
    scheduleDue: round2(scheduleDue),
    studentCount: students.length,
    receiptCount: receipts.length,
  };
}

function buildCollectionOverview(receipts: ReceiptRow[]) {
  const buckets: Record<string, number> = {
    'Tuition Fee': 0,
    'Transport Fee': 0,
    'Hostel Fee': 0,
    'Exam Fee': 0,
    'Other Fees': 0,
  };

  let total = 0;
  for (const r of receipts) {
    const breakdown = Array.isArray(r.feeBreakdown) ? r.feeBreakdown : [];
    if (breakdown.length === 0) {
      buckets['Other Fees'] += r.amountPaid;
      total += r.amountPaid;
      continue;
    }
    for (const item of breakdown) {
      const row = item as { key?: string; amount?: number };
      const amount = Number(row.amount) || 0;
      const cat = headCategory(String(row.key || ''));
      buckets[cat] = (buckets[cat] || 0) + amount;
      total += amount;
    }
  }

  const items = Object.entries(buckets)
    .filter(([, v]) => v > 0)
    .map(([name, value], i) => ({
      name,
      amount: round2(value),
      value: total > 0 ? round2((value / total) * 100) : 0,
      color: OVERVIEW_COLORS[i % OVERVIEW_COLORS.length],
    }));

  return { items, total: round2(total) };
}

function buildCollectionTrend(receipts: ReceiptRow[], totalDue: number) {
  const byMonth = ACADEMIC_MONTHS.map((m) => ({ month: m.label, collection: 0, collectedAmount: 0 }));

  for (const r of receipts) {
    const idx = monthIndexInAcademicYear(r.collectedAt);
    if (idx >= 0 && idx < 12) {
      byMonth[idx].collectedAmount += r.amountPaid;
    }
  }

  let cumulative = 0;
  return byMonth.map((row) => {
    cumulative += row.collectedAmount;
    const collectionLakhs = round2(row.collectedAmount / 100000);
    const percentage = totalDue > 0 ? round2((cumulative / totalDue) * 100) : 0;
    return {
      month: row.month,
      collection: collectionLakhs,
      collectedAmount: round2(row.collectedAmount),
      percentage: Math.min(percentage, 100),
    };
  });
}

function buildInstallments(totalDue: number, receipts: ReceiptRow[]) {
  const dueEach = totalDue > 0 ? totalDue / 4 : 0;
  const collected = [0, 0, 0, 0];

  for (const r of receipts) {
    const idx = Math.min(3, Math.floor(monthIndexInAcademicYear(r.collectedAt) / 3));
    collected[idx] += r.amountPaid;
  }

  const rows = INSTALLMENT_LABELS.map((name, i) => {
    const due = round2(dueEach);
    const collectedAmt = round2(collected[i]);
    const pending = round2(Math.max(due - collectedAmt, 0));
    const progress = due > 0 ? Math.min(100, Math.round((collectedAmt / due) * 100)) : collectedAmt > 0 ? 100 : 0;
    return { name, due, collected: collectedAmt, pending, progress };
  });

  return {
    rows,
    totals: {
      due: round2(rows.reduce((s, r) => s + r.due, 0)),
      collected: round2(rows.reduce((s, r) => s + r.collected, 0)),
      pending: round2(rows.reduce((s, r) => s + r.pending, 0)),
    },
  };
}

function buildTopDues(
  students: StudentRow[],
  schedules: FeeSchedule[],
  receipts: ReceiptRow[],
  dues: Array<{ admissionNumber: string; studentId: string; amount: number; status: FeeDueStatus }>,
) {
  const collectedByAdmission = new Map<string, number>();
  for (const r of receipts) {
    const key = r.admissionNumber || r.studentName;
    collectedByAdmission.set(key, (collectedByAdmission.get(key) || 0) + r.amountPaid);
  }

  const pendingByStudent = new Map<string, number>();
  for (const d of dues) {
    if (d.status !== FeeDueStatus.PENDING && d.status !== FeeDueStatus.OVERDUE) continue;
    const key = d.studentId || d.admissionNumber;
    pendingByStudent.set(key, (pendingByStudent.get(key) || 0) + d.amount);
  }

  const rows = students
    .map((s) => {
      const schedule = findFeeSchedule(schedules, s.className, s.sectionName);
      const expected = schedule?.total ?? 0;
      const collected = collectedByAdmission.get(s.admissionNumber) || 0;
      const fromDue = pendingByStudent.get(s.id) || pendingByStudent.get(s.admissionNumber) || 0;
      const due = fromDue > 0 ? fromDue : Math.max(expected - collected, 0);
      return {
        studentId: s.id,
        name: `${s.firstName}${s.lastName ? ` ${s.lastName}` : ''}`.trim(),
        class: `Class ${s.className}${s.sectionName ? ` - ${s.sectionName}` : ''}`,
        due: round2(due),
      };
    })
    .filter((r) => r.due > 0)
    .sort((a, b) => b.due - a.due)
    .slice(0, 8);

  return {
    rows,
    totalOverdue: round2(rows.reduce((s, r) => s + r.due, 0)),
  };
}

function buildCollectionModes(receipts: ReceiptRow[]) {
  const buckets: Record<string, number> = {};
  let total = 0;
  for (const r of receipts) {
    const label = MODE_LABELS[r.paymentMode] || r.paymentMode;
    buckets[label] = (buckets[label] || 0) + r.amountPaid;
    total += r.amountPaid;
  }

  const items = Object.entries(buckets)
    .sort((a, b) => b[1] - a[1])
    .map(([name, amount]) => ({
      name,
      amount: round2(amount),
      value: total > 0 ? round2((amount / total) * 100) : 0,
      color: MODE_COLORS[name] || '#64748b',
    }));

  return { items, total: round2(total) };
}

function buildRecentTransactions(receipts: ReceiptRow[]) {
  return receipts.slice(0, 8).map((r) => ({
    id: r.id,
    title: 'Payment Received',
    desc: `${r.studentName}${r.className ? ` (Class ${r.className}${r.sectionName ? ` - ${r.sectionName}` : ''})` : ''}`,
    time: r.collectedAt.toISOString(),
    amount: round2(r.amountPaid),
    type: MODE_LABELS[r.paymentMode] || r.paymentMode,
    receiptNumber: r.receiptNumber,
  }));
}

type OutflowRow = { amount: number; date: Date };

function buildCashFlow(receipts: ReceiptRow[], outflows: OutflowRow[] = []) {
  const byMonth = ACADEMIC_MONTHS.map((m) => ({
    month: m.label,
    inflow: 0,
    outflow: 0,
    inflowAmount: 0,
    outflowAmount: 0,
  }));

  for (const r of receipts) {
    const idx = monthIndexInAcademicYear(r.collectedAt);
    if (idx >= 0 && idx < 12) {
      byMonth[idx].inflowAmount += r.amountPaid;
    }
  }

  for (const o of outflows) {
    const idx = monthIndexInAcademicYear(o.date);
    if (idx >= 0 && idx < 12) {
      byMonth[idx].outflowAmount += o.amount;
    }
  }

  const totalInflow = receipts.reduce((s, r) => s + r.amountPaid, 0);
  const totalOutflow = outflows.reduce((s, o) => s + o.amount, 0);

  return {
    months: byMonth.map((m) => ({
      month: m.month,
      inflow: round2(m.inflowAmount / 10000000),
      outflow: round2(m.outflowAmount / 10000000),
      inflowAmount: round2(m.inflowAmount),
      outflowAmount: round2(m.outflowAmount),
    })),
    totalInflow: round2(totalInflow),
    totalOutflow: round2(totalOutflow),
    netCashFlow: round2(totalInflow - totalOutflow),
  };
}

async function computeTotalDiscounts(institutionId: string, academicYear: string) {
  const [discounts, awards] = await Promise.all([
    prisma.feeDiscount.findMany({
      where: {
        institutionId,
        academicYear,
        status: { in: [FeeApprovalStatus.APPROVED, FeeApprovalStatus.ACTIVE] },
      },
      select: { settlementAmount: true },
    }),
    prisma.feeScholarshipAward.findMany({
      where: {
        institutionId,
        academicYear,
        status: FeeApprovalStatus.APPROVED,
      },
      select: { amount: true },
    }),
  ]);

  const discountTotal = discounts.reduce((s, d) => s + d.settlementAmount, 0);
  const awardTotal = awards.reduce((s, a) => s + a.amount, 0);
  return round2(discountTotal + awardTotal);
}

async function loadCashFlowOutflows(institutionId: string, academicYear: string): Promise<OutflowRow[]> {
  const range = academicYearDateRange(academicYear);
  const [refunds, vendorPayments] = await Promise.all([
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
      where: {
        institutionId,
        paymentDate: { gte: range.start, lte: range.end },
      },
      select: { amount: true, paymentDate: true },
    }),
  ]);

  const outflows: OutflowRow[] = [];
  for (const r of refunds) {
    if (r.processedAt) outflows.push({ amount: r.amount, date: r.processedAt });
  }
  for (const p of vendorPayments) {
    outflows.push({ amount: p.amount, date: p.paymentDate });
  }
  return outflows;
}

async function loadExpenseSummary(institutionId: string, academicYear: string) {
  await seedExpenseCategories(institutionId);
  const entries = await prisma.expenseEntry.findMany({
    where: {
      institutionId,
      academicYear,
      status: { in: ['APPROVED', 'PAID'] },
    },
    include: { category: true },
  });

  const byGroup = new Map<string, number>();
  for (const e of entries) {
    const label = e.category.groupName || e.category.name;
    byGroup.set(label, (byGroup.get(label) || 0) + e.amount + e.gstAmount);
  }

  const total = round2([...byGroup.values()].reduce((s, v) => s + v, 0));
  const rows = [...byGroup.entries()]
    .map(([name, amount]) => ({
      name,
      amount: round2(amount),
      percent: total > 0 ? round2((amount / total) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8);

  return {
    rows,
    total,
    note: rows.length ? undefined : 'No expense records yet — add entries under Expense Management.',
  };
}

async function loadExpenseOutflows(institutionId: string, academicYear: string): Promise<OutflowRow[]> {
  const range = academicYearDateRange(academicYear);
  const entries = await prisma.expenseEntry.findMany({
    where: {
      institutionId,
      academicYear,
      status: { in: ['APPROVED', 'PAID'] },
      expenseDate: { gte: range.start, lte: range.end },
    },
    select: { amount: true, gstAmount: true, expenseDate: true, paidAt: true },
  });
  return entries.map((e) => ({
    amount: round2(e.amount + e.gstAmount),
    date: e.paidAt || e.expenseDate,
  }));
}

export async function getFeeDashboardMeta(institutionId: string) {
  const filters = await getInstitutionFilterMeta(institutionId);
  const { feeConfigured, currency } = await loadFeeCollectionContext(institutionId);
  return {
    defaultAcademicYear: filters.defaultAcademicYear,
    academicYears: filters.academicYears.length ? filters.academicYears : [filters.defaultAcademicYear],
    financialYears: filters.academicYears.length ? filters.academicYears : [filters.defaultAcademicYear],
    feeConfigured,
    currency,
  };
}

export async function getFeeDashboard(
  institutionId: string,
  opts: { academicYear?: string; financialYear?: string; overviewPeriod?: 'month' | 'year' | 'academic' } = {},
) {
  const filters = await getInstitutionFilterMeta(institutionId);
  const academicYear = opts.academicYear || filters.defaultAcademicYear;
  const financialYear = opts.financialYear || academicYear;
  const prevYear = previousAcademicYear(academicYear);

  const ctx = await loadFeeCollectionContext(institutionId);
  const current = await yearTotals(institutionId, academicYear, ctx.schedules);
  const previous = await yearTotals(institutionId, prevYear, ctx.schedules);

  const collectionOverview = buildCollectionOverview(current.receipts);
  const { start: monthStart, end: monthEnd } = (() => {
    const now = new Date();
    return {
      start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
      end: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999)),
    };
  })();

  const monthReceipts = current.receipts.filter(
    (r) => r.collectedAt >= monthStart && r.collectedAt <= monthEnd,
  );
  const monthOverview = buildCollectionOverview(monthReceipts);

  const yearStart = new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1));
  const yearEnd = new Date(Date.UTC(new Date().getUTCFullYear(), 11, 31, 23, 59, 59, 999));
  const calendarYearReceipts = current.receipts.filter(
    (r) => r.collectedAt >= yearStart && r.collectedAt <= yearEnd,
  );
  const yearOverview = buildCollectionOverview(calendarYearReceipts);
  const academicOverview = buildCollectionOverview(current.receipts);

  const overviewPeriod = opts.overviewPeriod || 'month';
  const overviewByPeriod =
    overviewPeriod === 'year'
      ? yearOverview
      : overviewPeriod === 'academic'
        ? academicOverview
        : monthOverview;
  const overviewLabel =
    overviewPeriod === 'year'
      ? 'This Year'
      : overviewPeriod === 'academic'
        ? 'This Academic Year'
        : 'This Month';

  const collectionTrend = buildCollectionTrend(current.receipts, current.totalDue);
  const installments = buildInstallments(current.totalDue, current.receipts);
  const topDues = buildTopDues(current.students, ctx.schedules, current.receipts, current.dues);
  const collectionModes = buildCollectionModes(current.receipts);
  const recentTransactions = buildRecentTransactions(current.receipts);
  const [totalDiscounts, outflows, expenseOutflows, expenseSummary] = await Promise.all([
    computeTotalDiscounts(institutionId, academicYear),
    loadCashFlowOutflows(institutionId, academicYear),
    loadExpenseOutflows(institutionId, academicYear),
    loadExpenseSummary(institutionId, academicYear),
  ]);
  const cashFlow = buildCashFlow(current.receipts, [...outflows, ...expenseOutflows]);

  const range = academicYearDateRange(academicYear);
  const dueInNext7 = current.dues.filter((d) => {
    if (d.status !== FeeDueStatus.PENDING && d.status !== FeeDueStatus.OVERDUE) return false;
    const due = new Date(d.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in7 = new Date(today);
    in7.setDate(in7.getDate() + 7);
    return due >= today && due <= in7;
  });
  const dueInNext7Amount = round2(dueInNext7.reduce((s, d) => s + d.amount, 0));
  const dueInNext7Students = new Set(dueInNext7.map((d) => d.studentId)).size;

  const monthAgo = new Date();
  monthAgo.setDate(monthAgo.getDate() - 30);
  const [remindersSent, smsSent, emailSent] = await Promise.all([
    prisma.mobileNotification.count({
      where: {
        institutionId,
        category: 'fee',
        createdAt: { gte: monthAgo },
      },
    }),
    prisma.parentCommunication.count({
      where: {
        institutionId,
        channel: ParentCommunicationChannel.SMS,
        createdAt: { gte: monthAgo },
        OR: [
          { category: { contains: 'fee', mode: 'insensitive' } },
          { subject: { contains: 'fee', mode: 'insensitive' } },
        ],
      },
    }),
    prisma.parentCommunication.count({
      where: {
        institutionId,
        channel: ParentCommunicationChannel.EMAIL,
        createdAt: { gte: monthAgo },
        OR: [
          { category: { contains: 'fee', mode: 'insensitive' } },
          { subject: { contains: 'fee', mode: 'insensitive' } },
        ],
      },
    }),
  ]);

  const collectionTrendPct = pctChange(current.totalCollection, previous.totalCollection);
  const pendingTrendPct = pctChange(current.pendingAmount, previous.pendingAmount);

  return {
    academicYear,
    financialYear,
    currency: ctx.currency,
    feeConfigured: ctx.feeConfigured,
    asOf: new Date().toISOString(),
    kpis: {
      totalFeeDue: current.totalDue,
      totalCollection: current.totalCollection,
      pendingAmount: current.pendingAmount,
      collectionPct: current.collectionPct,
      overdueAmount: current.overdueAmount,
      totalDiscounts,
      studentCount: current.studentCount,
      receiptCount: current.receiptCount,
      collectionTrendPct,
      pendingTrendPct,
    },
    collectionOverview: {
      period: overviewLabel,
      total: overviewByPeriod.total,
      items: overviewByPeriod.items,
    },
    collectionTrend,
    dueVsCollection: [
      { name: 'Total Due', value: round2(current.totalDue / 10000000), amount: current.totalDue, fill: '#3b82f6' },
      { name: 'Collected', value: round2(current.totalCollection / 10000000), amount: current.totalCollection, fill: '#10b981' },
    ],
    installments,
    topDues,
    collectionModes,
    recentTransactions,
    reminders: {
      remindersSent,
      smsSent,
      emailSent,
      dueInNext7Days: dueInNext7Amount,
      dueInNext7Students,
    },
    cashFlow,
    expenseSummary,
    reports: [
      'Fee Collection Report',
      'Student Ledger Report',
      'Outstanding Report',
      'Fee Concession Report',
      'Daily Collection Report',
      'Cash Flow Report',
    ],
    dateRange: {
      start: range.start.toISOString(),
      end: range.end.toISOString(),
    },
  };
}
