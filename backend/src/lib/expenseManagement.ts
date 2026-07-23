import {
  ExpenseApprovalStage,
  ExpenseEntryStatus,
  ExpensePaymentMethod,
  FeeMasterStatus,
  type Prisma,
} from '@prisma/client';
import { prisma } from './prisma.js';
import {
  EXPENSE_CAMPUSES,
  EXPENSE_CATEGORY_SEED,
  EXPENSE_DEPARTMENTS,
} from './expenseCategoriesSeed.js';

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function slugCode(text: string) {
  return text
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 40);
}

const APPROVAL_FLOW: ExpenseApprovalStage[] = [
  'DEPARTMENT_HEAD',
  'ACCOUNTS',
  'PRINCIPAL',
  'MANAGEMENT',
  'COMPLETED',
];

export async function seedExpenseCategories(institutionId: string) {
  const existing = await prisma.expenseCategory.count({ where: { institutionId } });
  if (existing > 0) return { seeded: false, count: existing };

  for (const cat of EXPENSE_CATEGORY_SEED) {
    const category = await prisma.expenseCategory.create({
      data: {
        institutionId,
        code: cat.code,
        name: cat.name,
        groupName: cat.group,
      },
    });
    for (const headName of cat.heads) {
      await prisma.expenseHead.create({
        data: {
          institutionId,
          categoryId: category.id,
          code: `${cat.code}_${slugCode(headName)}`,
          name: headName,
        },
      });
    }
  }
  return { seeded: true, count: EXPENSE_CATEGORY_SEED.length };
}

async function nextId(institutionId: string, prefix: string, model: 'entry' | 'vendor' | 'budget' | 'recurring' | 'reimbursement') {
  const year = new Date().getFullYear();
  let count = 0;
  if (model === 'entry') count = await prisma.expenseEntry.count({ where: { institutionId } });
  if (model === 'vendor') count = await prisma.expenseVendor.count({ where: { institutionId } });
  if (model === 'budget') count = await prisma.expenseBudget.count({ where: { institutionId } });
  if (model === 'recurring') count = await prisma.expenseRecurring.count({ where: { institutionId } });
  if (model === 'reimbursement') count = await prisma.expenseReimbursement.count({ where: { institutionId } });
  return `${prefix}-${year}-${String(count + 1).padStart(4, '0')}`;
}

function dateRangeForPeriod(period: 'today' | 'month' | 'year') {
  const now = new Date();
  if (period === 'today') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { start, end };
  }
  if (period === 'month') {
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
    };
  }
  return {
    start: new Date(now.getFullYear(), 0, 1),
    end: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999),
  };
}

async function sumExpenses(
  institutionId: string,
  where: Prisma.ExpenseEntryWhereInput,
) {
  const rows = await prisma.expenseEntry.findMany({
    where: { institutionId, ...where, status: { in: ['APPROVED', 'PAID', 'PENDING_APPROVAL'] } },
    select: { amount: true, gstAmount: true },
  });
  return round2(rows.reduce((s, r) => s + r.amount + r.gstAmount, 0));
}

export async function getExpenseDashboard(institutionId: string, academicYear?: string) {
  await seedExpenseCategories(institutionId);
  const year = academicYear || '2025-26';

  const today = dateRangeForPeriod('today');
  const month = dateRangeForPeriod('month');

  const [todayTotal, monthTotal, yearTotal, entries, budgets, vendors, recurring, reimbursements] =
    await Promise.all([
      sumExpenses(institutionId, { expenseDate: { gte: today.start, lte: today.end } }),
      sumExpenses(institutionId, { expenseDate: { gte: month.start, lte: month.end }, academicYear: year }),
      sumExpenses(institutionId, { academicYear: year }),
      prisma.expenseEntry.findMany({
        where: { institutionId, academicYear: year },
        include: { category: true, head: true, vendor: true },
      }),
      prisma.expenseBudget.findMany({ where: { institutionId, academicYear: year, status: FeeMasterStatus.ACTIVE } }),
      prisma.expenseVendor.findMany({ where: { institutionId, status: FeeMasterStatus.ACTIVE } }),
      prisma.expenseRecurring.findMany({ where: { institutionId, status: FeeMasterStatus.ACTIVE } }),
      prisma.expenseReimbursement.findMany({ where: { institutionId, academicYear: year } }),
    ]);

  const categoryMap = new Map<string, number>();
  const deptMap = new Map<string, number>();
  const campusMap = new Map<string, number>();
  let gstPaid = 0;
  let cashOut = 0;
  let bankOut = 0;

  for (const e of entries.filter((x) => ['APPROVED', 'PAID'].includes(x.status))) {
    const total = e.amount + e.gstAmount;
    categoryMap.set(e.category.name, round2((categoryMap.get(e.category.name) || 0) + total));
    deptMap.set(e.department, round2((deptMap.get(e.department) || 0) + total));
    campusMap.set(e.campus, round2((campusMap.get(e.campus) || 0) + total));
    gstPaid = round2(gstPaid + e.gstAmount);
    if (e.paymentMethod === 'CASH') cashOut = round2(cashOut + total);
    else bankOut = round2(bankOut + total);
  }

  const budgetVsActual = await Promise.all(
    budgets.map(async (b) => {
      const spent = await sumExpenses(institutionId, {
        academicYear: year,
        ...(b.department ? { department: b.department } : {}),
        ...(b.categoryId ? { categoryId: b.categoryId } : {}),
        ...(b.campus ? { campus: b.campus } : {}),
        expenseDate: { gte: b.periodStart, lte: b.periodEnd },
      });
      const pct = b.allocatedAmount > 0 ? round2((spent / b.allocatedAmount) * 100) : 0;
      return {
        budgetCode: b.budgetCode,
        name: b.name,
        allocated: b.allocatedAmount,
        spent,
        variance: round2(b.allocatedAmount - spent),
        utilizationPct: pct,
        overBudget: spent > b.allocatedAmount,
      };
    }),
  );

  const monthlyTrend: Array<{ month: string; amount: number }> = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    const amt = entries
      .filter(
        (e) =>
          ['APPROVED', 'PAID'].includes(e.status) &&
          e.expenseDate >= start &&
          e.expenseDate <= end,
      )
      .reduce((s, e) => s + e.amount + e.gstAmount, 0);
    monthlyTrend.push({
      month: d.toLocaleString('en-IN', { month: 'short', year: '2-digit' }),
      amount: round2(amt),
    });
  }

  const topCategories = [...categoryMap.entries()]
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8);

  return {
    academicYear: year,
    kpis: {
      totalToday: todayTotal,
      totalMonth: monthTotal,
      totalYear: yearTotal,
      pendingApprovals: entries.filter((e) => e.status === 'PENDING_APPROVAL').length,
      overBudgetAlerts: budgetVsActual.filter((b) => b.overBudget).length,
      vendorPaymentsDue: round2(vendors.reduce((s, v) => s + v.outstandingBalance, 0)),
      gstPaid,
      outstandingBills: round2(
        entries
          .filter((e) => e.status === 'APPROVED')
          .reduce((s, e) => s + e.amount + e.gstAmount, 0),
      ),
      recurringCount: recurring.length,
      reimbursementPending: reimbursements.filter((r) => r.status === 'PENDING_APPROVAL').length,
    },
    budgetVsActual,
    categoryWise: [...categoryMap.entries()].map(([name, amount]) => ({ name, amount })),
    departmentWise: [...deptMap.entries()].map(([name, amount]) => ({ name, amount })),
    campusWise: [...campusMap.entries()].map(([name, amount]) => ({ name, amount })),
    monthlyTrend,
    cashFlowSummary: { cashOut, bankOut, totalOut: round2(cashOut + bankOut) },
    topCategories,
    overBudgetAlerts: budgetVsActual.filter((b) => b.overBudget),
  };
}

function serializeEntry(
  e: Prisma.ExpenseEntryGetPayload<{
    include: { category: true; head: true; vendor: true; approvals: true };
  }>,
) {
  return {
    id: e.id,
    expenseId: e.expenseId,
    academicYear: e.academicYear,
    expenseDate: e.expenseDate.toISOString().slice(0, 10),
    categoryId: e.categoryId,
    categoryName: e.category.name,
    categoryGroup: e.category.groupName,
    headId: e.headId,
    headName: e.head?.name || '',
    department: e.department,
    campus: e.campus,
    branch: e.branch,
    vendorId: e.vendorId,
    vendorName: e.vendor?.vendorName || '',
    invoiceNumber: e.invoiceNumber,
    purchaseOrderRef: e.purchaseOrderRef,
    paymentMethod: e.paymentMethod,
    amount: e.amount,
    gstAmount: e.gstAmount,
    cgst: e.cgst,
    sgst: e.sgst,
    igst: e.igst,
    totalAmount: round2(e.amount + e.gstAmount),
    budgetCode: e.budgetCode,
    costCenter: e.costCenter,
    description: e.description,
    billUploadName: e.billUploadName,
    status: e.status,
    currentStage: e.currentStage,
    assetType: e.assetType,
    assetRef: e.assetRef,
    remarks: e.remarks,
    paidAt: e.paidAt?.toISOString() || null,
    createdBy: e.createdBy,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
    approvals: e.approvals.map((a) => ({
      id: a.id,
      stage: a.stage,
      action: a.action,
      actorName: a.actorName,
      remarks: a.remarks,
      digitalSignature: a.digitalSignature,
      signedAt: a.signedAt.toISOString(),
    })),
  };
}

export async function listExpenseCategories(institutionId: string, ensure?: boolean) {
  if (ensure) await seedExpenseCategories(institutionId);
  const rows = await prisma.expenseCategory.findMany({
    where: { institutionId, status: FeeMasterStatus.ACTIVE },
    include: { heads: { where: { status: FeeMasterStatus.ACTIVE }, orderBy: { name: 'asc' } } },
    orderBy: [{ groupName: 'asc' }, { name: 'asc' }],
  });
  return rows.map((c) => ({
    id: c.id,
    code: c.code,
    name: c.name,
    groupName: c.groupName,
    heads: c.heads.map((h) => ({ id: h.id, code: h.code, name: h.name })),
  }));
}

export async function listExpenseEntries(
  institutionId: string,
  opts?: { academicYear?: string; status?: ExpenseEntryStatus; department?: string },
) {
  const rows = await prisma.expenseEntry.findMany({
    where: {
      institutionId,
      ...(opts?.academicYear ? { academicYear: opts.academicYear } : {}),
      ...(opts?.status ? { status: opts.status } : {}),
      ...(opts?.department ? { department: opts.department } : {}),
    },
    include: { category: true, head: true, vendor: true, approvals: { orderBy: { createdAt: 'asc' } } },
    orderBy: { expenseDate: 'desc' },
    take: 200,
  });
  return rows.map(serializeEntry);
}

export async function createExpenseEntry(
  institutionId: string,
  actorName: string,
  data: {
    academicYear?: string;
    expenseDate: string;
    categoryId: string;
    headId?: string;
    department?: string;
    campus?: string;
    branch?: string;
    vendorId?: string;
    invoiceNumber?: string;
    purchaseOrderRef?: string;
    paymentMethod?: ExpensePaymentMethod;
    amount: number;
    gstAmount?: number;
    cgst?: number;
    sgst?: number;
    igst?: number;
    budgetCode?: string;
    costCenter?: string;
    description?: string;
    billUploadName?: string;
    assetType?: string;
    assetRef?: string;
    remarks?: string;
    submit?: boolean;
  },
) {
  const expenseId = await nextId(institutionId, 'EXP', 'entry');
  const gst = round2(data.gstAmount || 0);

  const row = await prisma.expenseEntry.create({
    data: {
      institutionId,
      expenseId,
      academicYear: data.academicYear || '2025-26',
      expenseDate: new Date(data.expenseDate),
      categoryId: data.categoryId,
      headId: data.headId || null,
      department: data.department || 'General',
      campus: data.campus || 'Main Campus',
      branch: data.branch || 'Main Branch',
      vendorId: data.vendorId || null,
      invoiceNumber: data.invoiceNumber || '',
      purchaseOrderRef: data.purchaseOrderRef || '',
      paymentMethod: data.paymentMethod || ExpensePaymentMethod.CASH,
      amount: round2(data.amount),
      gstAmount: gst,
      cgst: round2(data.cgst || 0),
      sgst: round2(data.sgst || 0),
      igst: round2(data.igst || 0),
      budgetCode: data.budgetCode || '',
      costCenter: data.costCenter || '',
      description: data.description || '',
      billUploadName: data.billUploadName || '',
      assetType: data.assetType || '',
      assetRef: data.assetRef || '',
      remarks: data.remarks || '',
      status: data.submit ? ExpenseEntryStatus.PENDING_APPROVAL : ExpenseEntryStatus.DRAFT,
      currentStage: data.submit ? 'DEPARTMENT_HEAD' : 'STAFF',
      createdBy: actorName,
    },
    include: { category: true, head: true, vendor: true, approvals: true },
  });

  if (data.submit) {
    await prisma.expenseApproval.create({
      data: {
        entryId: row.id,
        stage: 'STAFF',
        action: 'SUBMIT',
        actorName,
        remarks: 'Submitted for approval',
        digitalSignature: `${actorName} — ${new Date().toLocaleString('en-IN')}`,
      },
    });
  }

  return serializeEntry(row);
}

export async function processExpenseApproval(
  institutionId: string,
  entryId: string,
  action: 'APPROVE' | 'REJECT' | 'RETURN',
  actorName: string,
  opts?: { remarks?: string; digitalSignature?: string },
) {
  const entry = await prisma.expenseEntry.findFirst({
    where: { id: entryId, institutionId },
    include: { category: true, head: true, vendor: true, approvals: true },
  });
  if (!entry) throw new Error('Expense entry not found');
  if (entry.status !== ExpenseEntryStatus.PENDING_APPROVAL) {
    throw new Error('Expense is not pending approval');
  }

  const signature = opts?.digitalSignature || `${actorName} — ${new Date().toLocaleString('en-IN')}`;
  const stage = entry.currentStage;

  if (action === 'REJECT') {
    const updated = await prisma.$transaction(async (tx) => {
      await tx.expenseApproval.create({
        data: { entryId, stage, action: 'REJECT', actorName, remarks: opts?.remarks || 'Rejected', digitalSignature: signature },
      });
      return tx.expenseEntry.update({
        where: { id: entryId },
        data: { status: ExpenseEntryStatus.REJECTED, currentStage: 'STAFF' },
        include: { category: true, head: true, vendor: true, approvals: { orderBy: { createdAt: 'asc' } } },
      });
    });
    return serializeEntry(updated);
  }

  if (action === 'RETURN') {
    const updated = await prisma.$transaction(async (tx) => {
      await tx.expenseApproval.create({
        data: { entryId, stage, action: 'RETURN', actorName, remarks: opts?.remarks || 'Returned', digitalSignature: signature },
      });
      return tx.expenseEntry.update({
        where: { id: entryId },
        data: { status: ExpenseEntryStatus.RETURNED, currentStage: 'STAFF' },
        include: { category: true, head: true, vendor: true, approvals: { orderBy: { createdAt: 'asc' } } },
      });
    });
    return serializeEntry(updated);
  }

  const idx = APPROVAL_FLOW.indexOf(stage);
  const next = APPROVAL_FLOW[idx + 1] || 'COMPLETED';
  const isComplete = next === 'COMPLETED';

  const updated = await prisma.$transaction(async (tx) => {
    await tx.expenseApproval.create({
      data: { entryId, stage, action: 'APPROVE', actorName, remarks: opts?.remarks || 'Approved', digitalSignature: signature },
    });
    return tx.expenseEntry.update({
      where: { id: entryId },
      data: {
        status: isComplete ? ExpenseEntryStatus.APPROVED : ExpenseEntryStatus.PENDING_APPROVAL,
        currentStage: isComplete ? 'COMPLETED' : next,
      },
      include: { category: true, head: true, vendor: true, approvals: { orderBy: { createdAt: 'asc' } } },
    });
  });
  return serializeEntry(updated);
}

export async function markExpensePaid(institutionId: string, entryId: string, actorName: string) {
  const entry = await prisma.expenseEntry.findFirst({ where: { id: entryId, institutionId } });
  if (!entry) throw new Error('Expense not found');
  if (entry.status !== ExpenseEntryStatus.APPROVED) throw new Error('Only approved expenses can be marked paid');

  const updated = await prisma.$transaction(async (tx) => {
    if (entry.vendorId) {
      await tx.expenseVendor.update({
        where: { id: entry.vendorId },
        data: { outstandingBalance: { decrement: round2(entry.amount + entry.gstAmount) } },
      });
    }
    return tx.expenseEntry.update({
      where: { id: entryId },
      data: { status: ExpenseEntryStatus.PAID, paidAt: new Date() },
      include: { category: true, head: true, vendor: true, approvals: { orderBy: { createdAt: 'asc' } } },
    });
  });
  return serializeEntry(updated);
}

export async function listExpenseVendors(institutionId: string) {
  const rows = await prisma.expenseVendor.findMany({
    where: { institutionId },
    orderBy: { vendorName: 'asc' },
  });
  return rows.map((v) => ({
    id: v.id,
    vendorCode: v.vendorCode,
    vendorName: v.vendorName,
    contactPerson: v.contactPerson,
    mobile: v.mobile,
    email: v.email,
    gstin: v.gstin,
    pan: v.pan,
    bankAccount: v.bankAccount,
    bankIfsc: v.bankIfsc,
    paymentTerms: v.paymentTerms,
    outstandingBalance: v.outstandingBalance,
    rating: v.rating,
    contractExpiry: v.contractExpiry?.toISOString().slice(0, 10) || null,
    amcExpiry: v.amcExpiry?.toISOString().slice(0, 10) || null,
    status: v.status,
    remarks: v.remarks,
    createdAt: v.createdAt.toISOString(),
  }));
}

export async function createExpenseVendor(
  institutionId: string,
  data: {
    vendorName: string;
    contactPerson?: string;
    mobile?: string;
    email?: string;
    gstin?: string;
    pan?: string;
    bankAccount?: string;
    bankIfsc?: string;
    paymentTerms?: string;
    rating?: number;
    contractExpiry?: string;
    amcExpiry?: string;
    remarks?: string;
  },
) {
  const vendorCode = await nextId(institutionId, 'VEN', 'vendor');
  const row = await prisma.expenseVendor.create({
    data: {
      institutionId,
      vendorCode,
      vendorName: data.vendorName,
      contactPerson: data.contactPerson || '',
      mobile: data.mobile || '',
      email: data.email || '',
      gstin: data.gstin || '',
      pan: data.pan || '',
      bankAccount: data.bankAccount || '',
      bankIfsc: data.bankIfsc || '',
      paymentTerms: data.paymentTerms || 'Net 30',
      rating: data.rating || 0,
      contractExpiry: data.contractExpiry ? new Date(data.contractExpiry) : null,
      amcExpiry: data.amcExpiry ? new Date(data.amcExpiry) : null,
      remarks: data.remarks || '',
    },
  });
  return listExpenseVendors(institutionId).then((all) => all.find((v) => v.id === row.id)!);
}

export async function listExpenseBudgets(institutionId: string, academicYear?: string) {
  const rows = await prisma.expenseBudget.findMany({
    where: { institutionId, ...(academicYear ? { academicYear } : {}) },
    include: { category: true },
    orderBy: { name: 'asc' },
  });

  return Promise.all(
    rows.map(async (b) => {
      const spent = await sumExpenses(institutionId, {
        academicYear: b.academicYear,
        ...(b.department ? { department: b.department } : {}),
        ...(b.categoryId ? { categoryId: b.categoryId } : {}),
        ...(b.campus ? { campus: b.campus } : {}),
        expenseDate: { gte: b.periodStart, lte: b.periodEnd },
      });
      return {
        id: b.id,
        budgetCode: b.budgetCode,
        name: b.name,
        budgetType: b.budgetType,
        academicYear: b.academicYear,
        department: b.department,
        categoryId: b.categoryId,
        categoryName: b.category?.name || '',
        campus: b.campus,
        periodStart: b.periodStart.toISOString().slice(0, 10),
        periodEnd: b.periodEnd.toISOString().slice(0, 10),
        allocatedAmount: b.allocatedAmount,
        spentAmount: spent,
        remaining: round2(b.allocatedAmount - spent),
        utilizationPct: b.allocatedAmount > 0 ? round2((spent / b.allocatedAmount) * 100) : 0,
        overBudget: spent > b.allocatedAmount,
        alertThreshold: b.alertThreshold,
        status: b.status,
        remarks: b.remarks,
      };
    }),
  );
}

export async function createExpenseBudget(
  institutionId: string,
  data: {
    name: string;
    budgetType?: string;
    academicYear?: string;
    department?: string;
    categoryId?: string;
    campus?: string;
    periodStart: string;
    periodEnd: string;
    allocatedAmount: number;
    alertThreshold?: number;
    remarks?: string;
  },
) {
  const budgetCode = await nextId(institutionId, 'BDG', 'budget');
  await prisma.expenseBudget.create({
    data: {
      institutionId,
      budgetCode,
      name: data.name,
      budgetType: (data.budgetType as never) || 'ANNUAL',
      academicYear: data.academicYear || '2025-26',
      department: data.department || '',
      categoryId: data.categoryId || null,
      campus: data.campus || '',
      periodStart: new Date(data.periodStart),
      periodEnd: new Date(data.periodEnd),
      allocatedAmount: round2(data.allocatedAmount),
      alertThreshold: data.alertThreshold ?? 0.9,
      remarks: data.remarks || '',
    },
  });
  return listExpenseBudgets(institutionId, data.academicYear);
}

export async function listExpenseRecurring(institutionId: string) {
  const rows = await prisma.expenseRecurring.findMany({
    where: { institutionId },
    include: { head: true, vendor: true },
    orderBy: { nextDueDate: 'asc' },
  });
  return rows.map((r) => ({
    id: r.id,
    templateCode: r.templateCode,
    name: r.name,
    headName: r.head?.name || '',
    vendorName: r.vendor?.vendorName || '',
    amount: r.amount,
    frequency: r.frequency,
    nextDueDate: r.nextDueDate.toISOString().slice(0, 10),
    department: r.department,
    campus: r.campus,
    paymentMethod: r.paymentMethod,
    autoCreate: r.autoCreate,
    status: r.status,
    lastGeneratedAt: r.lastGeneratedAt?.toISOString() || null,
    remarks: r.remarks,
  }));
}

export async function createExpenseRecurring(
  institutionId: string,
  data: {
    name: string;
    headId?: string;
    vendorId?: string;
    amount: number;
    frequency?: string;
    nextDueDate: string;
    department?: string;
    campus?: string;
    paymentMethod?: ExpensePaymentMethod;
    autoCreate?: boolean;
    remarks?: string;
  },
) {
  const templateCode = await nextId(institutionId, 'REC', 'recurring');
  await prisma.expenseRecurring.create({
    data: {
      institutionId,
      templateCode,
      name: data.name,
      headId: data.headId || null,
      vendorId: data.vendorId || null,
      amount: round2(data.amount),
      frequency: (data.frequency as never) || 'MONTHLY',
      nextDueDate: new Date(data.nextDueDate),
      department: data.department || 'General',
      campus: data.campus || 'Main Campus',
      paymentMethod: data.paymentMethod || ExpensePaymentMethod.BANK_TRANSFER,
      autoCreate: data.autoCreate ?? false,
      remarks: data.remarks || '',
    },
  });
  return listExpenseRecurring(institutionId);
}

export async function listExpenseReimbursements(institutionId: string, academicYear?: string) {
  const rows = await prisma.expenseReimbursement.findMany({
    where: { institutionId, ...(academicYear ? { academicYear } : {}) },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((r) => ({
    id: r.id,
    requestId: r.requestId,
    academicYear: r.academicYear,
    employeeName: r.employeeName,
    department: r.department,
    amount: r.amount,
    description: r.description,
    billUploadName: r.billUploadName,
    status: r.status,
    approvedBy: r.approvedBy,
    approvedAt: r.approvedAt?.toISOString() || null,
    paidAt: r.paidAt?.toISOString() || null,
    remarks: r.remarks,
    createdBy: r.createdBy,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function createExpenseReimbursement(
  institutionId: string,
  actorName: string,
  data: {
    academicYear?: string;
    employeeName: string;
    department?: string;
    amount: number;
    description?: string;
    billUploadName?: string;
    remarks?: string;
  },
) {
  const requestId = await nextId(institutionId, 'RMB', 'reimbursement');
  const row = await prisma.expenseReimbursement.create({
    data: {
      institutionId,
      requestId,
      academicYear: data.academicYear || '2025-26',
      employeeName: data.employeeName,
      department: data.department || 'General',
      amount: round2(data.amount),
      description: data.description || '',
      billUploadName: data.billUploadName || '',
      remarks: data.remarks || '',
      createdBy: actorName,
    },
  });
  return {
    id: row.id,
    requestId: row.requestId,
    academicYear: row.academicYear,
    employeeName: row.employeeName,
    department: row.department,
    amount: row.amount,
    description: row.description,
    billUploadName: row.billUploadName,
    status: row.status,
    approvedBy: row.approvedBy,
    approvedAt: null,
    paidAt: null,
    remarks: row.remarks,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function approveExpenseReimbursement(
  institutionId: string,
  id: string,
  actorName: string,
  action: 'APPROVE' | 'REJECT',
) {
  const row = await prisma.expenseReimbursement.findFirst({ where: { id, institutionId } });
  if (!row) throw new Error('Reimbursement not found');
  const updated = await prisma.expenseReimbursement.update({
    where: { id },
    data: {
      status: action === 'APPROVE' ? ExpenseEntryStatus.APPROVED : ExpenseEntryStatus.REJECTED,
      approvedBy: actorName,
      approvedAt: new Date(),
    },
  });
  return {
    id: updated.id,
    requestId: updated.requestId,
    status: updated.status,
    approvedBy: updated.approvedBy,
    approvedAt: updated.approvedAt?.toISOString() || null,
  };
}

export async function getExpenseMeta(institutionId: string) {
  await seedExpenseCategories(institutionId);
  return {
    departments: EXPENSE_DEPARTMENTS,
    campuses: EXPENSE_CAMPUSES,
    paymentMethods: [
      'CASH',
      'BANK_TRANSFER',
      'CHEQUE',
      'UPI',
      'CARD',
      'ONLINE',
      'NEFT_RTGS',
    ],
    approvalStages: ['STAFF', 'DEPARTMENT_HEAD', 'ACCOUNTS', 'PRINCIPAL', 'MANAGEMENT', 'COMPLETED'],
    budgetTypes: ['ANNUAL', 'MONTHLY', 'DEPARTMENT', 'CATEGORY', 'BRANCH', 'EVENT', 'PROJECT'],
    recurringFrequencies: ['MONTHLY', 'QUARTERLY', 'YEARLY'],
    assetTypes: [
      'Building',
      'Bus',
      'Computer',
      'Smart Board',
      'Furniture',
      'Laboratory Equipment',
      'Air Conditioner',
    ],
  };
}

export async function generateExpenseReport(
  institutionId: string,
  reportType: string,
  academicYear?: string,
) {
  const year = academicYear || '2025-26';
  const entries = await listExpenseEntries(institutionId, { academicYear: year });
  const dashboard = await getExpenseDashboard(institutionId, year);

  const reports: Record<string, unknown> = {
    daily: {
      title: 'Daily Expense Report',
      rows: entries.filter((e) => e.expenseDate === new Date().toISOString().slice(0, 10)),
    },
    monthly: {
      title: 'Monthly Expense Statement',
      rows: entries.filter((e) => {
        const d = new Date(e.expenseDate);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }),
    },
    category: { title: 'Category-wise Expense Report', rows: dashboard.categoryWise },
    department: { title: 'Department-wise Expense Report', rows: dashboard.departmentWise },
    campus: { title: 'Campus-wise Expense Report', rows: dashboard.campusWise },
    vendor: {
      title: 'Vendor Payment Report',
      rows: await listExpenseVendors(institutionId),
    },
    budgetVariance: { title: 'Budget Variance Report', rows: dashboard.budgetVsActual },
    gst: {
      title: 'GST Input Report',
      rows: entries.map((e) => ({
        expenseId: e.expenseId,
        date: e.expenseDate,
        gstAmount: e.gstAmount,
        cgst: e.cgst,
        sgst: e.sgst,
        igst: e.igst,
        total: e.totalAmount,
      })),
    },
    reimbursement: {
      title: 'Reimbursement Report',
      rows: await listExpenseReimbursements(institutionId, year),
    },
    outstanding: {
      title: 'Outstanding Payments',
      rows: entries.filter((e) => e.status === 'APPROVED'),
    },
    cashBook: {
      title: 'Cash Book',
      rows: entries.filter((e) => e.paymentMethod === 'CASH'),
    },
    bankBook: {
      title: 'Bank Book',
      rows: entries.filter((e) => e.paymentMethod !== 'CASH'),
    },
  };

  return reports[reportType] || { title: reportType, rows: entries };
}

export async function exportExpenseData(institutionId: string, academicYear?: string) {
  const year = academicYear || '2025-26';
  return {
    exportedAt: new Date().toISOString(),
    academicYear: year,
    dashboard: await getExpenseDashboard(institutionId, year),
    entries: await listExpenseEntries(institutionId, { academicYear: year }),
    vendors: await listExpenseVendors(institutionId),
    budgets: await listExpenseBudgets(institutionId, year),
    recurring: await listExpenseRecurring(institutionId),
    reimbursements: await listExpenseReimbursements(institutionId, year),
  };
}
