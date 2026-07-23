import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Check, Download, Plus, RefreshCcw, Send, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  approveExpenseReimbursement,
  createExpenseBudget,
  createExpenseEntry,
  createExpenseRecurring,
  createExpenseReimbursement,
  createExpenseVendor,
  exportExpenseData,
  fetchExpenseMeta,
  fetchExpenseReport,
  fetchFeeDashboardMeta,
  formatInr,
  getExpenseDashboard,
  listExpenseBudgets,
  listExpenseCategories,
  listExpenseEntries,
  listExpenseRecurring,
  listExpenseReimbursements,
  listExpenseVendors,
  markExpensePaid,
  processExpenseApproval,
  type ExpenseBudget,
  type ExpenseCategory,
  type ExpenseDashboard,
  type ExpenseEntry,
  type ExpensePaymentMethod,
  type ExpenseRecurring,
  type ExpenseReimbursement,
  type ExpenseVendor,
} from '../../../lib/feeFinanceServices';
import {
  AcademicLoading,
  AcademicModal,
  AcademicPageHeader,
  AcademicPageShell,
  am,
  EmptyState,
  FeeMessage,
  FeeTabs,
  StatusBadge,
} from './FeeFinanceUi';

const TABS = [
  'Dashboard',
  'Categories',
  'Expense Entry',
  'Vendors',
  'Budgets',
  'Recurring',
  'Reimbursements',
  'Approvals',
  'Reports',
] as const;

const BRANCH_OPTIONS = ['Main Branch', 'City Branch', 'Suburban Branch'];

const REPORT_TYPES: Array<{ key: string; label: string }> = [
  { key: 'daily', label: 'Daily' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'category', label: 'Category' },
  { key: 'department', label: 'Department' },
  { key: 'campus', label: 'Campus' },
  { key: 'vendor', label: 'Vendor' },
  { key: 'budgetVariance', label: 'Budget Variance' },
  { key: 'gst', label: 'GST Input' },
  { key: 'reimbursement', label: 'Reimbursement' },
  { key: 'outstanding', label: 'Outstanding' },
  { key: 'cashBook', label: 'Cash Book' },
  { key: 'bankBook', label: 'Bank Book' },
];

const PAYMENT_LABELS: Record<ExpensePaymentMethod, string> = {
  CASH: 'Cash',
  BANK_TRANSFER: 'Bank Transfer',
  CHEQUE: 'Cheque',
  UPI: 'UPI',
  CARD: 'Card',
  ONLINE: 'Online',
  NEFT_RTGS: 'NEFT / RTGS',
};

const emptyEntryForm = () => ({
  expenseDate: new Date().toISOString().slice(0, 10),
  categoryId: '',
  headId: '',
  department: '',
  campus: '',
  branch: '',
  vendorId: '',
  invoiceNumber: '',
  purchaseOrderRef: '',
  paymentMethod: 'CASH' as ExpensePaymentMethod,
  amount: '',
  gstAmount: '',
  cgst: '',
  sgst: '',
  igst: '',
  budgetCode: '',
  costCenter: '',
  description: '',
  billUploadName: '',
  assetType: '',
  assetRef: '',
  remarks: '',
});

const emptyVendorForm = {
  vendorName: '',
  contactPerson: '',
  mobile: '',
  email: '',
  gstin: '',
  pan: '',
  bankAccount: '',
  bankIfsc: '',
  paymentTerms: '',
  rating: '3',
  amcExpiry: '',
  remarks: '',
};

const emptyBudgetForm = () => ({
  name: '',
  budgetType: 'ANNUAL',
  department: '',
  categoryId: '',
  campus: '',
  periodStart: new Date().toISOString().slice(0, 10),
  periodEnd: `${new Date().getFullYear() + 1}-03-31`,
  allocatedAmount: '',
  alertThreshold: '80',
  remarks: '',
});

const emptyRecurringForm = () => ({
  name: '',
  headId: '',
  vendorId: '',
  amount: '',
  frequency: 'MONTHLY',
  nextDueDate: new Date().toISOString().slice(0, 10),
  department: '',
  campus: '',
  paymentMethod: 'BANK_TRANSFER' as ExpensePaymentMethod,
  autoCreate: true,
  remarks: '',
});

const emptyReimbursementForm = {
  employeeName: '',
  department: '',
  amount: '',
  description: '',
  billUploadName: '',
  remarks: '',
};

function Field({
  label,
  children,
  className = '',
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="text-xs font-semibold text-slate-600 block mb-1">{label}</label>
      {children}
    </div>
  );
}

export function ExpenseManagementView() {
  const [tab, setTab] = useState<string>(TABS[0]);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [years, setYears] = useState<string[]>(['2025-26']);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [dashboard, setDashboard] = useState<ExpenseDashboard | null>(null);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [entries, setEntries] = useState<ExpenseEntry[]>([]);
  const [vendors, setVendors] = useState<ExpenseVendor[]>([]);
  const [budgets, setBudgets] = useState<ExpenseBudget[]>([]);
  const [recurring, setRecurring] = useState<ExpenseRecurring[]>([]);
  const [reimbursements, setReimbursements] = useState<ExpenseReimbursement[]>([]);
  const [meta, setMeta] = useState<Awaited<ReturnType<typeof fetchExpenseMeta>> | null>(null);

  const [showEntryModal, setShowEntryModal] = useState(false);
  const [entryForm, setEntryForm] = useState(emptyEntryForm);

  const [showVendorModal, setShowVendorModal] = useState(false);
  const [vendorForm, setVendorForm] = useState(emptyVendorForm);

  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [budgetForm, setBudgetForm] = useState(emptyBudgetForm);

  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [recurringForm, setRecurringForm] = useState(emptyRecurringForm);

  const [showReimbursementModal, setShowReimbursementModal] = useState(false);
  const [reimbursementForm, setReimbursementForm] = useState(emptyReimbursementForm);

  const [approvalTarget, setApprovalTarget] = useState<ExpenseEntry | null>(null);
  const [approvalAction, setApprovalAction] = useState<'APPROVE' | 'REJECT' | 'RETURN'>('APPROVE');
  const [approvalRemarks, setApprovalRemarks] = useState('');

  const [reportType, setReportType] = useState('');
  const [reportTitle, setReportTitle] = useState('');
  const [reportRows, setReportRows] = useState<Record<string, unknown>[]>([]);
  const [reportLoading, setReportLoading] = useState(false);

  const pendingApprovals = useMemo(
    () => entries.filter((e) => e.status === 'PENDING_APPROVAL'),
    [entries],
  );

  const categoryGroups = useMemo(() => {
    const map = new Map<string, ExpenseCategory[]>();
    for (const cat of categories) {
      const list = map.get(cat.groupName) || [];
      list.push(cat);
      map.set(cat.groupName, list);
    }
    return Array.from(map.entries());
  }, [categories]);

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === entryForm.categoryId),
    [categories, entryForm.categoryId],
  );

  const allHeads = useMemo(
    () => categories.flatMap((c) => c.heads.map((h) => ({ ...h, categoryName: c.name }))),
    [categories],
  );

  const maxTrend = useMemo(
    () => Math.max(...(dashboard?.monthlyTrend.map((m) => m.amount) || [1]), 1),
    [dashboard],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const dashMeta = await fetchFeeDashboardMeta();
      if (dashMeta.academicYears?.length) setYears(dashMeta.academicYears);
      const year = academicYear || dashMeta.defaultAcademicYear || '2025-26';
      if (!academicYear && dashMeta.defaultAcademicYear) setAcademicYear(dashMeta.defaultAcademicYear);

      const [
        dash,
        cats,
        entryRows,
        vendorRows,
        budgetRows,
        recurringRows,
        reimbursementRows,
        expenseMeta,
      ] = await Promise.all([
        getExpenseDashboard(year),
        listExpenseCategories(true),
        listExpenseEntries({ academicYear: year }),
        listExpenseVendors(),
        listExpenseBudgets(year),
        listExpenseRecurring(),
        listExpenseReimbursements(year),
        fetchExpenseMeta(),
      ]);

      setDashboard(dash);
      setCategories(cats);
      setEntries(entryRows);
      setVendors(vendorRows);
      setBudgets(budgetRows);
      setRecurring(recurringRows);
      setReimbursements(reimbursementRows);
      setMeta(expenseMeta);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load expense management');
    } finally {
      setLoading(false);
    }
  }, [academicYear]);

  useEffect(() => {
    void load();
  }, [load]);

  const openEntryModal = () => {
    setEntryForm({
      ...emptyEntryForm(),
      department: meta?.departments[0] || '',
      campus: meta?.campuses[0] || '',
      branch: BRANCH_OPTIONS[0],
      categoryId: categories[0]?.id || '',
    });
    setShowEntryModal(true);
  };

  const buildEntryPayload = (submit: boolean) => ({
    academicYear,
    expenseDate: entryForm.expenseDate,
    categoryId: entryForm.categoryId,
    headId: entryForm.headId || undefined,
    department: entryForm.department || undefined,
    campus: entryForm.campus || undefined,
    branch: entryForm.branch || undefined,
    vendorId: entryForm.vendorId || undefined,
    invoiceNumber: entryForm.invoiceNumber.trim() || undefined,
    purchaseOrderRef: entryForm.purchaseOrderRef.trim() || undefined,
    paymentMethod: entryForm.paymentMethod,
    amount: Number(entryForm.amount) || 0,
    gstAmount: entryForm.gstAmount ? Number(entryForm.gstAmount) : undefined,
    cgst: entryForm.cgst ? Number(entryForm.cgst) : undefined,
    sgst: entryForm.sgst ? Number(entryForm.sgst) : undefined,
    igst: entryForm.igst ? Number(entryForm.igst) : undefined,
    budgetCode: entryForm.budgetCode.trim() || undefined,
    costCenter: entryForm.costCenter.trim() || undefined,
    description: entryForm.description.trim() || undefined,
    billUploadName: entryForm.billUploadName.trim() || undefined,
    assetType: entryForm.assetType || undefined,
    assetRef: entryForm.assetRef.trim() || undefined,
    remarks: entryForm.remarks.trim() || undefined,
    submit,
  });

  const handleSaveEntry = async (submit: boolean) => {
    setError('');
    const amount = Number(entryForm.amount);
    if (!entryForm.categoryId || !amount || amount <= 0) {
      setError('Category and a valid amount are required');
      return;
    }
    try {
      const record = await createExpenseEntry(buildEntryPayload(submit));
      setMessage(
        submit
          ? `Expense ${record.expenseId} submitted for approval`
          : `Expense ${record.expenseId} saved as draft`,
      );
      setShowEntryModal(false);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save expense entry');
    }
  };

  const handleCreateVendor = async () => {
    setError('');
    if (!vendorForm.vendorName.trim()) {
      setError('Vendor name is required');
      return;
    }
    try {
      const record = await createExpenseVendor({
        vendorName: vendorForm.vendorName.trim(),
        contactPerson: vendorForm.contactPerson.trim() || undefined,
        mobile: vendorForm.mobile.trim() || undefined,
        email: vendorForm.email.trim() || undefined,
        gstin: vendorForm.gstin.trim() || undefined,
        pan: vendorForm.pan.trim() || undefined,
        bankAccount: vendorForm.bankAccount.trim() || undefined,
        bankIfsc: vendorForm.bankIfsc.trim() || undefined,
        paymentTerms: vendorForm.paymentTerms.trim() || undefined,
        rating: Number(vendorForm.rating) || undefined,
        amcExpiry: vendorForm.amcExpiry || undefined,
        remarks: vendorForm.remarks.trim() || undefined,
      });
      setMessage(`Vendor ${record.vendorCode} created`);
      setShowVendorModal(false);
      setVendorForm(emptyVendorForm);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create vendor');
    }
  };

  const handleCreateBudget = async () => {
    setError('');
    const allocated = Number(budgetForm.allocatedAmount);
    if (!budgetForm.name.trim() || !allocated || allocated <= 0) {
      setError('Budget name and allocated amount are required');
      return;
    }
    try {
      await createExpenseBudget({
        name: budgetForm.name.trim(),
        budgetType: budgetForm.budgetType,
        academicYear,
        department: budgetForm.department || undefined,
        categoryId: budgetForm.categoryId || undefined,
        campus: budgetForm.campus || undefined,
        periodStart: budgetForm.periodStart,
        periodEnd: budgetForm.periodEnd,
        allocatedAmount: allocated,
        alertThreshold: budgetForm.alertThreshold ? Number(budgetForm.alertThreshold) : undefined,
        remarks: budgetForm.remarks.trim() || undefined,
      });
      setMessage('Budget created');
      setShowBudgetModal(false);
      setBudgetForm(emptyBudgetForm());
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create budget');
    }
  };

  const handleCreateRecurring = async () => {
    setError('');
    const amount = Number(recurringForm.amount);
    if (!recurringForm.name.trim() || !amount || amount <= 0) {
      setError('Name and amount are required');
      return;
    }
    try {
      await createExpenseRecurring({
        name: recurringForm.name.trim(),
        headId: recurringForm.headId || undefined,
        vendorId: recurringForm.vendorId || undefined,
        amount,
        frequency: recurringForm.frequency,
        nextDueDate: recurringForm.nextDueDate,
        department: recurringForm.department || undefined,
        campus: recurringForm.campus || undefined,
        paymentMethod: recurringForm.paymentMethod,
        autoCreate: recurringForm.autoCreate,
        remarks: recurringForm.remarks.trim() || undefined,
      });
      setMessage('Recurring template created');
      setShowRecurringModal(false);
      setRecurringForm(emptyRecurringForm());
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create recurring template');
    }
  };

  const handleCreateReimbursement = async () => {
    setError('');
    const amount = Number(reimbursementForm.amount);
    if (!reimbursementForm.employeeName.trim() || !amount || amount <= 0) {
      setError('Employee name and amount are required');
      return;
    }
    try {
      const record = await createExpenseReimbursement({
        academicYear,
        employeeName: reimbursementForm.employeeName.trim(),
        department: reimbursementForm.department || undefined,
        amount,
        description: reimbursementForm.description.trim() || undefined,
        billUploadName: reimbursementForm.billUploadName.trim() || undefined,
        remarks: reimbursementForm.remarks.trim() || undefined,
      });
      setMessage(`Reimbursement ${record.requestId} created`);
      setShowReimbursementModal(false);
      setReimbursementForm(emptyReimbursementForm);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create reimbursement');
    }
  };

  const runApproval = async () => {
    if (!approvalTarget) return;
    setError('');
    try {
      await processExpenseApproval(approvalTarget.id, {
        action: approvalAction,
        remarks: approvalRemarks.trim() || undefined,
      });
      setMessage(`Expense ${approvalTarget.expenseId} ${approvalAction.toLowerCase()}d`);
      setApprovalTarget(null);
      setApprovalRemarks('');
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Approval action failed');
    }
  };

  const handleMarkPaid = async (id: string) => {
    setError('');
    try {
      const record = await markExpensePaid(id);
      setMessage(`Expense ${record.expenseId} marked as paid`);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Mark paid failed');
    }
  };

  const handleReimbursementAction = async (id: string, action: 'APPROVE' | 'REJECT') => {
    setError('');
    try {
      await approveExpenseReimbursement(id, action);
      setMessage(`Reimbursement ${action.toLowerCase()}d`);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reimbursement action failed');
    }
  };

  const loadReport = async (type: string) => {
    setReportLoading(true);
    setError('');
    setReportType(type);
    try {
      const data = await fetchExpenseReport(type, academicYear);
      setReportTitle(data.title);
      const rows = (data.rows || []).map((row) =>
        typeof row === 'object' && row !== null ? (row as Record<string, unknown>) : { value: row },
      );
      setReportRows(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load report');
      setReportRows([]);
    } finally {
      setReportLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const data = await exportExpenseData(academicYear);
      const wb = XLSX.utils.book_new();

      const entrySheet = (data.entries as ExpenseEntry[]).map((e) => ({
        'Expense ID': e.expenseId,
        Date: e.expenseDate,
        Category: e.categoryName,
        Head: e.headName,
        Department: e.department,
        Campus: e.campus,
        Vendor: e.vendorName,
        Amount: e.amount,
        GST: e.gstAmount,
        Total: e.totalAmount,
        Status: e.status,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(entrySheet), 'Entries');

      const vendorSheet = (data.vendors as ExpenseVendor[]).map((v) => ({
        Code: v.vendorCode,
        Name: v.vendorName,
        Contact: v.contactPerson,
        GSTIN: v.gstin,
        Outstanding: v.outstandingBalance,
        Rating: v.rating,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(vendorSheet), 'Vendors');

      const budgetSheet = (data.budgets as ExpenseBudget[]).map((b) => ({
        Code: b.budgetCode,
        Name: b.name,
        Allocated: b.allocatedAmount,
        Spent: b.spentAmount,
        Remaining: b.remaining,
        'Util %': b.utilizationPct,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(budgetSheet), 'Budgets');

      const reimbSheet = (data.reimbursements as ExpenseReimbursement[]).map((r) => ({
        'Request ID': r.requestId,
        Employee: r.employeeName,
        Amount: r.amount,
        Status: r.status,
        Created: r.createdAt.slice(0, 10),
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(reimbSheet), 'Reimbursements');

      XLSX.writeFile(wb, `Expense_Management_${academicYear.replace(/[^a-zA-Z0-9_-]+/g, '_')}.xlsx`);
      setMessage('Excel exported');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed');
    }
  };

  const reportColumns = useMemo(() => {
    if (!reportRows.length) return [];
    return Object.keys(reportRows[0]);
  }, [reportRows]);

  if (loading && !dashboard) {
    return <AcademicLoading label="Loading expense management…" />;
  }

  const kpis = dashboard?.kpis;

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="Fees & Finance › Expense Management"
        title="Expense Management"
        subtitle="Expense entries, vendor payments, budgets, recurring charges, reimbursements and approvals"
        actions={
          <>
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className={am.select}
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <button type="button" onClick={() => void load()} className={am.btnSecondary}>
              <RefreshCcw size={14} /> Refresh
            </button>
            <button type="button" onClick={() => void handleExport()} className={am.btnSecondary}>
              <Download size={14} /> Export Excel
            </button>
            {tab === 'Expense Entry' && (
              <button type="button" onClick={openEntryModal} className={am.btnPrimary}>
                <Plus size={14} /> Add New
              </button>
            )}
            {tab === 'Vendors' && (
              <button
                type="button"
                onClick={() => {
                  setVendorForm(emptyVendorForm);
                  setShowVendorModal(true);
                }}
                className={am.btnPrimary}
              >
                <Plus size={14} /> Add Vendor
              </button>
            )}
            {tab === 'Budgets' && (
              <button
                type="button"
                onClick={() => {
                  setBudgetForm({
                    ...emptyBudgetForm(),
                    department: meta?.departments[0] || '',
                    campus: meta?.campuses[0] || '',
                    budgetType: meta?.budgetTypes[0] || 'ANNUAL',
                  });
                  setShowBudgetModal(true);
                }}
                className={am.btnPrimary}
              >
                <Plus size={14} /> Add Budget
              </button>
            )}
            {tab === 'Recurring' && (
              <button
                type="button"
                onClick={() => {
                  setRecurringForm({
                    ...emptyRecurringForm(),
                    department: meta?.departments[0] || '',
                    campus: meta?.campuses[0] || '',
                  });
                  setShowRecurringModal(true);
                }}
                className={am.btnPrimary}
              >
                <Plus size={14} /> Add Recurring
              </button>
            )}
            {tab === 'Reimbursements' && (
              <button
                type="button"
                onClick={() => {
                  setReimbursementForm(emptyReimbursementForm);
                  setShowReimbursementModal(true);
                }}
                className={am.btnPrimary}
              >
                <Plus size={14} /> Add Reimbursement
              </button>
            )}
          </>
        }
      />

      <div className={am.content}>
        {message && <FeeMessage message={message} type="success" />}
        {error && <FeeMessage message={error} type="error" />}

        <FeeTabs tabs={[...TABS]} active={tab} onChange={setTab} />

        {tab === 'Dashboard' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
              {[
                { label: 'Today', value: kpis?.totalToday ?? 0 },
                { label: 'This Month', value: kpis?.totalMonth ?? 0 },
                { label: 'This Year', value: kpis?.totalYear ?? 0 },
                { label: 'Pending Approvals', value: kpis?.pendingApprovals ?? 0, count: true },
                { label: 'Over Budget Alerts', value: kpis?.overBudgetAlerts ?? 0, count: true },
                { label: 'Vendor Payments Due', value: kpis?.vendorPaymentsDue ?? 0 },
                { label: 'GST Paid', value: kpis?.gstPaid ?? 0 },
                { label: 'Outstanding Bills', value: kpis?.outstandingBills ?? 0 },
                { label: 'Recurring Templates', value: kpis?.recurringCount ?? 0, count: true },
                { label: 'Reimbursement Pending', value: kpis?.reimbursementPending ?? 0, count: true },
              ].map((card) => (
                <div key={card.label} className={`${am.card} ${am.cardPad}`}>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">{card.label}</p>
                  <p className="text-xl font-bold text-slate-900 mt-1">
                    {card.count ? card.value : formatInr(card.value)}
                  </p>
                </div>
              ))}
            </div>

            {dashboard?.cashFlowSummary && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { label: 'Cash Outflow', value: dashboard.cashFlowSummary.cashOut },
                  { label: 'Bank Outflow', value: dashboard.cashFlowSummary.bankOut },
                  { label: 'Total Outflow', value: dashboard.cashFlowSummary.totalOut },
                ].map((card) => (
                  <div
                    key={card.label}
                    className="bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-xl px-4 py-3 shadow-sm"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wide opacity-90">{card.label}</p>
                    <p className="text-2xl font-bold mt-1">{formatInr(card.value)}</p>
                  </div>
                ))}
              </div>
            )}

            <div className={`${am.card} ${am.cardPad}`}>
              <h3 className="text-sm font-bold text-slate-800 mb-3">Budget vs Actual</h3>
              <div className={am.tableWrap}>
                <table className="w-full min-w-[640px]">
                  <thead>
                    <tr>
                      <th className={am.th}>Code</th>
                      <th className={am.th}>Name</th>
                      <th className={`${am.th} text-right`}>Allocated</th>
                      <th className={`${am.th} text-right`}>Spent</th>
                      <th className={`${am.th} text-right`}>Variance</th>
                      <th className={`${am.th} text-right`}>Util %</th>
                      <th className={am.th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(dashboard?.budgetVsActual || []).length === 0 ? (
                      <tr>
                        <td colSpan={7} className={am.td}>
                          <EmptyState>No budget data yet.</EmptyState>
                        </td>
                      </tr>
                    ) : (
                      dashboard?.budgetVsActual.map((row) => (
                        <tr key={row.budgetCode} className="hover:bg-slate-50/80">
                          <td className={`${am.td} font-mono text-xs`}>{row.budgetCode}</td>
                          <td className={am.td}>{row.name}</td>
                          <td className={`${am.td} text-right`}>{formatInr(row.allocated)}</td>
                          <td className={`${am.td} text-right`}>{formatInr(row.spent)}</td>
                          <td className={`${am.td} text-right ${row.variance < 0 ? 'text-red-600' : ''}`}>
                            {formatInr(row.variance)}
                          </td>
                          <td className={`${am.td} text-right`}>{row.utilizationPct}%</td>
                          <td className={am.td}>
                            {row.overBudget ? (
                              <span className="text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded">OVER</span>
                            ) : (
                              <span className="text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded">OK</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className={`${am.card} ${am.cardPad}`}>
                <h3 className="text-sm font-bold text-slate-800 mb-3">Monthly Trend</h3>
                {(dashboard?.monthlyTrend || []).length === 0 ? (
                  <EmptyState>No monthly data.</EmptyState>
                ) : (
                  <div className="flex items-end gap-2 h-40">
                    {dashboard?.monthlyTrend.map((m) => (
                      <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className="w-full bg-amber-400 rounded-t"
                          style={{ height: `${Math.max(8, (m.amount / maxTrend) * 100)}%` }}
                          title={formatInr(m.amount)}
                        />
                        <span className="text-[9px] text-slate-500 font-semibold">{m.month}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className={`${am.card} ${am.cardPad}`}>
                <h3 className="text-sm font-bold text-slate-800 mb-3">Top Categories</h3>
                {(dashboard?.topCategories || []).length === 0 ? (
                  <EmptyState>No category spend yet.</EmptyState>
                ) : (
                  <ul className="space-y-2">
                    {dashboard?.topCategories.map((c) => (
                      <li key={c.name} className="flex justify-between text-sm">
                        <span className="text-slate-700">{c.name}</span>
                        <span className="font-semibold">{formatInr(c.amount)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {(dashboard?.overBudgetAlerts || []).length > 0 && (
              <div className={`${am.card} ${am.cardPad} border-red-200 bg-red-50/50`}>
                <h3 className="text-sm font-bold text-red-800 mb-3">Over Budget Alerts</h3>
                <div className="space-y-2">
                  {dashboard?.overBudgetAlerts.map((a) => (
                    <div key={a.budgetCode} className="flex flex-wrap justify-between gap-2 text-sm">
                      <span className="font-semibold text-red-900">{a.name} ({a.budgetCode})</span>
                      <span className="text-red-700">
                        Spent {formatInr(a.spent)} / {formatInr(a.allocated)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'Categories' && (
          <div className="space-y-4">
            {categoryGroups.length === 0 ? (
              <EmptyState>No expense categories configured.</EmptyState>
            ) : (
              categoryGroups.map(([group, cats]) => (
                <div key={group} className={`${am.card} ${am.cardPad}`}>
                  <h3 className="text-sm font-bold text-slate-800 mb-3">{group}</h3>
                  <div className="space-y-3">
                    {cats.map((cat) => (
                      <div key={cat.id} className="border border-slate-100 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-mono text-[10px] text-slate-400">{cat.code}</span>
                          <span className="font-semibold text-slate-800">{cat.name}</span>
                        </div>
                        {cat.heads.length > 0 ? (
                          <ul className="pl-4 space-y-1">
                            {cat.heads.map((h) => (
                              <li key={h.id} className="text-xs text-slate-600 flex gap-2">
                                <span className="font-mono text-slate-400">{h.code}</span>
                                <span>{h.name}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-slate-400 pl-4">No heads defined</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'Expense Entry' && (
          <div className={am.tableWrap}>
            <table className="w-full min-w-[900px]">
              <thead>
                <tr>
                  <th className={am.th}>Expense ID</th>
                  <th className={am.th}>Date</th>
                  <th className={am.th}>Category</th>
                  <th className={am.th}>Vendor</th>
                  <th className={am.th}>Department</th>
                  <th className={`${am.th} text-right`}>Total</th>
                  <th className={am.th}>Status</th>
                  <th className={am.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan={8} className={am.td}>
                      <EmptyState>No expense entries yet — click Add New to create one.</EmptyState>
                    </td>
                  </tr>
                ) : (
                  entries.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/80">
                      <td className={`${am.td} font-mono text-xs`}>{row.expenseId}</td>
                      <td className={`${am.td} text-xs`}>{row.expenseDate}</td>
                      <td className={am.td}>
                        <div className="font-semibold">{row.categoryName}</div>
                        {row.headName && <div className="text-[11px] text-slate-500">{row.headName}</div>}
                      </td>
                      <td className={`${am.td} text-xs`}>{row.vendorName || '—'}</td>
                      <td className={`${am.td} text-xs`}>{row.department}</td>
                      <td className={`${am.td} text-right font-semibold`}>{formatInr(row.totalAmount)}</td>
                      <td className={am.td}><StatusBadge status={row.status} /></td>
                      <td className={am.td}>
                        {row.status === 'APPROVED' && (
                          <button
                            type="button"
                            onClick={() => void handleMarkPaid(row.id)}
                            className={`${am.btnSecondary} text-[10px] py-1 px-2 text-green-700`}
                          >
                            <Check size={10} /> Mark Paid
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'Vendors' && (
          <div className={am.tableWrap}>
            <table className="w-full min-w-[800px]">
              <thead>
                <tr>
                  <th className={am.th}>Code</th>
                  <th className={am.th}>Vendor</th>
                  <th className={am.th}>Contact</th>
                  <th className={am.th}>GSTIN</th>
                  <th className={am.th}>Payment Terms</th>
                  <th className={`${am.th} text-right`}>Outstanding</th>
                  <th className={am.th}>Rating</th>
                  <th className={am.th}>AMC Expiry</th>
                </tr>
              </thead>
              <tbody>
                {vendors.length === 0 ? (
                  <tr>
                    <td colSpan={8} className={am.td}>
                      <EmptyState>No vendors yet — add your first vendor.</EmptyState>
                    </td>
                  </tr>
                ) : (
                  vendors.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50/80">
                      <td className={`${am.td} font-mono text-xs`}>{v.vendorCode}</td>
                      <td className={am.td}>
                        <div className="font-semibold">{v.vendorName}</div>
                        <div className="text-[11px] text-slate-500">{v.contactPerson}</div>
                      </td>
                      <td className={`${am.td} text-xs`}>
                        <div>{v.mobile || '—'}</div>
                        <div className="text-slate-500">{v.email}</div>
                      </td>
                      <td className={`${am.td} font-mono text-xs`}>{v.gstin || '—'}</td>
                      <td className={`${am.td} text-xs`}>{v.paymentTerms || '—'}</td>
                      <td className={`${am.td} text-right`}>{formatInr(v.outstandingBalance)}</td>
                      <td className={am.td}>{'★'.repeat(Math.min(5, v.rating))}</td>
                      <td className={`${am.td} text-xs`}>{v.amcExpiry || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'Budgets' && (
          <div className={am.tableWrap}>
            <table className="w-full min-w-[800px]">
              <thead>
                <tr>
                  <th className={am.th}>Code</th>
                  <th className={am.th}>Name</th>
                  <th className={am.th}>Type</th>
                  <th className={am.th}>Department</th>
                  <th className={`${am.th} text-right`}>Allocated</th>
                  <th className={`${am.th} text-right`}>Spent</th>
                  <th className={`${am.th} text-right`}>Remaining</th>
                  <th className={`${am.th} text-right`}>Util %</th>
                  <th className={am.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {budgets.length === 0 ? (
                  <tr>
                    <td colSpan={9} className={am.td}>
                      <EmptyState>No budgets configured yet.</EmptyState>
                    </td>
                  </tr>
                ) : (
                  budgets.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/80">
                      <td className={`${am.td} font-mono text-xs`}>{b.budgetCode}</td>
                      <td className={am.td}>{b.name}</td>
                      <td className={`${am.td} text-xs`}>{b.budgetType}</td>
                      <td className={`${am.td} text-xs`}>{b.department}</td>
                      <td className={`${am.td} text-right`}>{formatInr(b.allocatedAmount)}</td>
                      <td className={`${am.td} text-right`}>{formatInr(b.spentAmount)}</td>
                      <td className={`${am.td} text-right font-semibold`}>{formatInr(b.remaining)}</td>
                      <td className={`${am.td} text-right ${b.overBudget ? 'text-red-600' : ''}`}>
                        {b.utilizationPct}%
                      </td>
                      <td className={am.td}>
                        {b.overBudget ? (
                          <span className="text-[10px] font-bold text-red-700">OVER</span>
                        ) : (
                          <StatusBadge status={b.status} />
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'Recurring' && (
          <div className={am.tableWrap}>
            <table className="w-full min-w-[800px]">
              <thead>
                <tr>
                  <th className={am.th}>Code</th>
                  <th className={am.th}>Name</th>
                  <th className={am.th}>Head</th>
                  <th className={am.th}>Vendor</th>
                  <th className={`${am.th} text-right`}>Amount</th>
                  <th className={am.th}>Frequency</th>
                  <th className={am.th}>Next Due</th>
                  <th className={am.th}>Auto Create</th>
                  <th className={am.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {recurring.length === 0 ? (
                  <tr>
                    <td colSpan={9} className={am.td}>
                      <EmptyState>No recurring expense templates yet.</EmptyState>
                    </td>
                  </tr>
                ) : (
                  recurring.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80">
                      <td className={`${am.td} font-mono text-xs`}>{r.templateCode}</td>
                      <td className={am.td}>{r.name}</td>
                      <td className={`${am.td} text-xs`}>{r.headName || '—'}</td>
                      <td className={`${am.td} text-xs`}>{r.vendorName || '—'}</td>
                      <td className={`${am.td} text-right`}>{formatInr(r.amount)}</td>
                      <td className={`${am.td} text-xs`}>{r.frequency}</td>
                      <td className={`${am.td} text-xs`}>{r.nextDueDate}</td>
                      <td className={am.td}>{r.autoCreate ? 'Yes' : 'No'}</td>
                      <td className={am.td}><StatusBadge status={r.status} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'Reimbursements' && (
          <div className={am.tableWrap}>
            <table className="w-full min-w-[800px]">
              <thead>
                <tr>
                  <th className={am.th}>Request ID</th>
                  <th className={am.th}>Employee</th>
                  <th className={am.th}>Department</th>
                  <th className={`${am.th} text-right`}>Amount</th>
                  <th className={am.th}>Description</th>
                  <th className={am.th}>Status</th>
                  <th className={am.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reimbursements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className={am.td}>
                      <EmptyState>No reimbursement requests yet.</EmptyState>
                    </td>
                  </tr>
                ) : (
                  reimbursements.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80">
                      <td className={`${am.td} font-mono text-xs`}>{r.requestId}</td>
                      <td className={am.td}>{r.employeeName}</td>
                      <td className={`${am.td} text-xs`}>{r.department}</td>
                      <td className={`${am.td} text-right font-semibold`}>{formatInr(r.amount)}</td>
                      <td className={`${am.td} text-xs max-w-[200px] truncate`}>{r.description || '—'}</td>
                      <td className={am.td}><StatusBadge status={r.status} /></td>
                      <td className={am.td}>
                        {r.status === 'PENDING_APPROVAL' && (
                          <div className="flex flex-wrap gap-1">
                            <button
                              type="button"
                              onClick={() => void handleReimbursementAction(r.id, 'APPROVE')}
                              className={`${am.btnSecondary} text-[10px] py-1 px-2 text-green-700`}
                            >
                              <Check size={10} /> Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleReimbursementAction(r.id, 'REJECT')}
                              className={`${am.btnSecondary} text-[10px] py-1 px-2 text-red-700`}
                            >
                              <X size={10} /> Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'Approvals' && (
          <div className={am.tableWrap}>
            <table className="w-full min-w-[900px]">
              <thead>
                <tr>
                  <th className={am.th}>Expense ID</th>
                  <th className={am.th}>Date</th>
                  <th className={am.th}>Category</th>
                  <th className={am.th}>Department</th>
                  <th className={`${am.th} text-right`}>Total</th>
                  <th className={am.th}>Stage</th>
                  <th className={am.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingApprovals.length === 0 ? (
                  <tr>
                    <td colSpan={7} className={am.td}>
                      <EmptyState>No expenses pending approval.</EmptyState>
                    </td>
                  </tr>
                ) : (
                  pendingApprovals.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/80">
                      <td className={`${am.td} font-mono text-xs`}>{row.expenseId}</td>
                      <td className={`${am.td} text-xs`}>{row.expenseDate}</td>
                      <td className={am.td}>{row.categoryName}</td>
                      <td className={`${am.td} text-xs`}>{row.department}</td>
                      <td className={`${am.td} text-right font-semibold`}>{formatInr(row.totalAmount)}</td>
                      <td className={`${am.td} text-xs`}>{row.currentStage.replace(/_/g, ' ')}</td>
                      <td className={am.td}>
                        <div className="flex flex-wrap gap-1">
                          {(['APPROVE', 'REJECT', 'RETURN'] as const).map((action) => (
                            <button
                              key={action}
                              type="button"
                              onClick={() => {
                                setApprovalTarget(row);
                                setApprovalAction(action);
                                setApprovalRemarks('');
                              }}
                              className={`${am.btnSecondary} text-[10px] py-1 px-2 ${
                                action === 'APPROVE'
                                  ? 'text-green-700'
                                  : action === 'REJECT'
                                    ? 'text-red-700'
                                    : 'text-amber-700'
                              }`}
                            >
                              {action === 'APPROVE' && <Check size={10} />}
                              {action === 'REJECT' && <X size={10} />}
                              {action === 'RETURN' && <Send size={10} />}
                              {action.charAt(0) + action.slice(1).toLowerCase()}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'Reports' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {REPORT_TYPES.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => void loadReport(r.key)}
                  className={`${am.btnSecondary} text-xs justify-center ${
                    reportType === r.key ? 'ring-2 ring-amber-400 border-amber-300' : ''
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {reportLoading ? (
              <AcademicLoading label="Loading report…" />
            ) : reportTitle ? (
              <div className={`${am.card} ${am.cardPad}`}>
                <h3 className="text-sm font-bold text-slate-800 mb-3">{reportTitle}</h3>
                {reportRows.length === 0 ? (
                  <EmptyState>No data for this report.</EmptyState>
                ) : (
                  <div className={am.tableWrap}>
                    <table className="w-full min-w-[600px]">
                      <thead>
                        <tr>
                          {reportColumns.map((col) => (
                            <th key={col} className={am.th}>{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {reportRows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/80">
                            {reportColumns.map((col) => (
                              <td key={col} className={`${am.td} text-xs`}>
                                {typeof row[col] === 'number'
                                  ? col.toLowerCase().includes('amount') ||
                                    col.toLowerCase().includes('total') ||
                                    col.toLowerCase().includes('gst') ||
                                    col.toLowerCase().includes('outstanding') ||
                                    col.toLowerCase().includes('allocated') ||
                                    col.toLowerCase().includes('spent')
                                    ? formatInr(row[col] as number)
                                    : String(row[col])
                                  : String(row[col] ?? '—')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <EmptyState>Select a report type above to view data.</EmptyState>
            )}
          </div>
        )}
      </div>

      {/* Expense Entry Modal */}
      <AcademicModal open={showEntryModal} onClose={() => setShowEntryModal(false)} title="New Expense Entry" large>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Date *">
            <input
              type="date"
              className={am.input}
              value={entryForm.expenseDate}
              onChange={(e) => setEntryForm((f) => ({ ...f, expenseDate: e.target.value }))}
            />
          </Field>
          <Field label="Category *">
            <select
              className={am.select}
              value={entryForm.categoryId}
              onChange={(e) => setEntryForm((f) => ({ ...f, categoryId: e.target.value, headId: '' }))}
            >
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Head">
            <select
              className={am.select}
              value={entryForm.headId}
              onChange={(e) => setEntryForm((f) => ({ ...f, headId: e.target.value }))}
            >
              <option value="">Select head</option>
              {(selectedCategory?.heads || []).map((h) => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Department">
            <select
              className={am.select}
              value={entryForm.department}
              onChange={(e) => setEntryForm((f) => ({ ...f, department: e.target.value }))}
            >
              {(meta?.departments || []).map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </Field>
          <Field label="Campus">
            <select
              className={am.select}
              value={entryForm.campus}
              onChange={(e) => setEntryForm((f) => ({ ...f, campus: e.target.value }))}
            >
              {(meta?.campuses || []).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Branch">
            <select
              className={am.select}
              value={entryForm.branch}
              onChange={(e) => setEntryForm((f) => ({ ...f, branch: e.target.value }))}
            >
              {BRANCH_OPTIONS.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </Field>
          <Field label="Vendor">
            <select
              className={am.select}
              value={entryForm.vendorId}
              onChange={(e) => setEntryForm((f) => ({ ...f, vendorId: e.target.value }))}
            >
              <option value="">No vendor</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>{v.vendorName}</option>
              ))}
            </select>
          </Field>
          <Field label="Invoice Number">
            <input
              className={am.input}
              value={entryForm.invoiceNumber}
              onChange={(e) => setEntryForm((f) => ({ ...f, invoiceNumber: e.target.value }))}
            />
          </Field>
          <Field label="PO Reference">
            <input
              className={am.input}
              value={entryForm.purchaseOrderRef}
              onChange={(e) => setEntryForm((f) => ({ ...f, purchaseOrderRef: e.target.value }))}
            />
          </Field>
          <Field label="Payment Method">
            <select
              className={am.select}
              value={entryForm.paymentMethod}
              onChange={(e) =>
                setEntryForm((f) => ({ ...f, paymentMethod: e.target.value as ExpensePaymentMethod }))
              }
            >
              {(meta?.paymentMethods || Object.keys(PAYMENT_LABELS)).map((m) => (
                <option key={m} value={m}>
                  {PAYMENT_LABELS[m as ExpensePaymentMethod] || m}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Amount *">
            <input
              type="number"
              step="0.01"
              className={am.input}
              value={entryForm.amount}
              onChange={(e) => setEntryForm((f) => ({ ...f, amount: e.target.value }))}
            />
          </Field>
          <Field label="GST Amount">
            <input
              type="number"
              step="0.01"
              className={am.input}
              value={entryForm.gstAmount}
              onChange={(e) => setEntryForm((f) => ({ ...f, gstAmount: e.target.value }))}
            />
          </Field>
          <Field label="CGST">
            <input
              type="number"
              step="0.01"
              className={am.input}
              value={entryForm.cgst}
              onChange={(e) => setEntryForm((f) => ({ ...f, cgst: e.target.value }))}
            />
          </Field>
          <Field label="SGST">
            <input
              type="number"
              step="0.01"
              className={am.input}
              value={entryForm.sgst}
              onChange={(e) => setEntryForm((f) => ({ ...f, sgst: e.target.value }))}
            />
          </Field>
          <Field label="IGST">
            <input
              type="number"
              step="0.01"
              className={am.input}
              value={entryForm.igst}
              onChange={(e) => setEntryForm((f) => ({ ...f, igst: e.target.value }))}
            />
          </Field>
          <Field label="Budget Code">
            <input
              className={am.input}
              value={entryForm.budgetCode}
              onChange={(e) => setEntryForm((f) => ({ ...f, budgetCode: e.target.value }))}
            />
          </Field>
          <Field label="Cost Center">
            <input
              className={am.input}
              value={entryForm.costCenter}
              onChange={(e) => setEntryForm((f) => ({ ...f, costCenter: e.target.value }))}
            />
          </Field>
          <Field label="Asset Type">
            <select
              className={am.select}
              value={entryForm.assetType}
              onChange={(e) => setEntryForm((f) => ({ ...f, assetType: e.target.value }))}
            >
              <option value="">None</option>
              {(meta?.assetTypes || []).map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </Field>
          <Field label="Asset Reference">
            <input
              className={am.input}
              value={entryForm.assetRef}
              onChange={(e) => setEntryForm((f) => ({ ...f, assetRef: e.target.value }))}
            />
          </Field>
          <Field label="Description" className="sm:col-span-2">
            <textarea
              className={am.input}
              rows={2}
              value={entryForm.description}
              onChange={(e) => setEntryForm((f) => ({ ...f, description: e.target.value }))}
            />
          </Field>
          <Field label="Bill Upload (filename)">
            <input
              className={am.input}
              placeholder="e.g. invoice_march.pdf"
              value={entryForm.billUploadName}
              onChange={(e) => setEntryForm((f) => ({ ...f, billUploadName: e.target.value }))}
            />
          </Field>
          <Field label="Remarks">
            <input
              className={am.input}
              value={entryForm.remarks}
              onChange={(e) => setEntryForm((f) => ({ ...f, remarks: e.target.value }))}
            />
          </Field>
        </div>
        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <button type="button" onClick={() => setShowEntryModal(false)} className={am.btnSecondary}>
            Cancel
          </button>
          <button type="button" onClick={() => void handleSaveEntry(false)} className={am.btnSecondary}>
            Save Draft
          </button>
          <button type="button" onClick={() => void handleSaveEntry(true)} className={am.btnPrimary}>
            <Send size={14} /> Submit for Approval
          </button>
        </div>
      </AcademicModal>

      {/* Vendor Modal */}
      <AcademicModal open={showVendorModal} onClose={() => setShowVendorModal(false)} title="Add Vendor" large>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Vendor Name *" className="sm:col-span-2">
            <input
              className={am.input}
              value={vendorForm.vendorName}
              onChange={(e) => setVendorForm((f) => ({ ...f, vendorName: e.target.value }))}
            />
          </Field>
          <Field label="Contact Person">
            <input
              className={am.input}
              value={vendorForm.contactPerson}
              onChange={(e) => setVendorForm((f) => ({ ...f, contactPerson: e.target.value }))}
            />
          </Field>
          <Field label="Mobile">
            <input
              className={am.input}
              value={vendorForm.mobile}
              onChange={(e) => setVendorForm((f) => ({ ...f, mobile: e.target.value }))}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              className={am.input}
              value={vendorForm.email}
              onChange={(e) => setVendorForm((f) => ({ ...f, email: e.target.value }))}
            />
          </Field>
          <Field label="GSTIN">
            <input
              className={am.input}
              value={vendorForm.gstin}
              onChange={(e) => setVendorForm((f) => ({ ...f, gstin: e.target.value }))}
            />
          </Field>
          <Field label="PAN">
            <input
              className={am.input}
              value={vendorForm.pan}
              onChange={(e) => setVendorForm((f) => ({ ...f, pan: e.target.value }))}
            />
          </Field>
          <Field label="Bank Account">
            <input
              className={am.input}
              value={vendorForm.bankAccount}
              onChange={(e) => setVendorForm((f) => ({ ...f, bankAccount: e.target.value }))}
            />
          </Field>
          <Field label="Bank IFSC">
            <input
              className={am.input}
              value={vendorForm.bankIfsc}
              onChange={(e) => setVendorForm((f) => ({ ...f, bankIfsc: e.target.value }))}
            />
          </Field>
          <Field label="Payment Terms">
            <input
              className={am.input}
              placeholder="e.g. Net 30"
              value={vendorForm.paymentTerms}
              onChange={(e) => setVendorForm((f) => ({ ...f, paymentTerms: e.target.value }))}
            />
          </Field>
          <Field label="Rating (1–5)">
            <select
              className={am.select}
              value={vendorForm.rating}
              onChange={(e) => setVendorForm((f) => ({ ...f, rating: e.target.value }))}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={String(n)}>{n} ★</option>
              ))}
            </select>
          </Field>
          <Field label="AMC Expiry">
            <input
              type="date"
              className={am.input}
              value={vendorForm.amcExpiry}
              onChange={(e) => setVendorForm((f) => ({ ...f, amcExpiry: e.target.value }))}
            />
          </Field>
          <Field label="Remarks" className="sm:col-span-2">
            <input
              className={am.input}
              value={vendorForm.remarks}
              onChange={(e) => setVendorForm((f) => ({ ...f, remarks: e.target.value }))}
            />
          </Field>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={() => setShowVendorModal(false)} className={am.btnSecondary}>Cancel</button>
          <button type="button" onClick={() => void handleCreateVendor()} className={am.btnPrimary}>Save Vendor</button>
        </div>
      </AcademicModal>

      {/* Budget Modal */}
      <AcademicModal open={showBudgetModal} onClose={() => setShowBudgetModal(false)} title="Add Budget" large>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Budget Name *" className="sm:col-span-2">
            <input
              className={am.input}
              value={budgetForm.name}
              onChange={(e) => setBudgetForm((f) => ({ ...f, name: e.target.value }))}
            />
          </Field>
          <Field label="Budget Type">
            <select
              className={am.select}
              value={budgetForm.budgetType}
              onChange={(e) => setBudgetForm((f) => ({ ...f, budgetType: e.target.value }))}
            >
              {(meta?.budgetTypes || ['ANNUAL']).map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Department">
            <select
              className={am.select}
              value={budgetForm.department}
              onChange={(e) => setBudgetForm((f) => ({ ...f, department: e.target.value }))}
            >
              {(meta?.departments || []).map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </Field>
          <Field label="Category">
            <select
              className={am.select}
              value={budgetForm.categoryId}
              onChange={(e) => setBudgetForm((f) => ({ ...f, categoryId: e.target.value }))}
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Campus">
            <select
              className={am.select}
              value={budgetForm.campus}
              onChange={(e) => setBudgetForm((f) => ({ ...f, campus: e.target.value }))}
            >
              {(meta?.campuses || []).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Period Start *">
            <input
              type="date"
              className={am.input}
              value={budgetForm.periodStart}
              onChange={(e) => setBudgetForm((f) => ({ ...f, periodStart: e.target.value }))}
            />
          </Field>
          <Field label="Period End *">
            <input
              type="date"
              className={am.input}
              value={budgetForm.periodEnd}
              onChange={(e) => setBudgetForm((f) => ({ ...f, periodEnd: e.target.value }))}
            />
          </Field>
          <Field label="Allocated Amount *">
            <input
              type="number"
              step="0.01"
              className={am.input}
              value={budgetForm.allocatedAmount}
              onChange={(e) => setBudgetForm((f) => ({ ...f, allocatedAmount: e.target.value }))}
            />
          </Field>
          <Field label="Alert Threshold %">
            <input
              type="number"
              className={am.input}
              value={budgetForm.alertThreshold}
              onChange={(e) => setBudgetForm((f) => ({ ...f, alertThreshold: e.target.value }))}
            />
          </Field>
          <Field label="Remarks" className="sm:col-span-2">
            <input
              className={am.input}
              value={budgetForm.remarks}
              onChange={(e) => setBudgetForm((f) => ({ ...f, remarks: e.target.value }))}
            />
          </Field>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={() => setShowBudgetModal(false)} className={am.btnSecondary}>Cancel</button>
          <button type="button" onClick={() => void handleCreateBudget()} className={am.btnPrimary}>Save Budget</button>
        </div>
      </AcademicModal>

      {/* Recurring Modal */}
      <AcademicModal open={showRecurringModal} onClose={() => setShowRecurringModal(false)} title="Add Recurring Template" large>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Name *" className="sm:col-span-2">
            <input
              className={am.input}
              value={recurringForm.name}
              onChange={(e) => setRecurringForm((f) => ({ ...f, name: e.target.value }))}
            />
          </Field>
          <Field label="Expense Head">
            <select
              className={am.select}
              value={recurringForm.headId}
              onChange={(e) => setRecurringForm((f) => ({ ...f, headId: e.target.value }))}
            >
              <option value="">Select head</option>
              {allHeads.map((h) => (
                <option key={h.id} value={h.id}>{h.categoryName} — {h.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Vendor">
            <select
              className={am.select}
              value={recurringForm.vendorId}
              onChange={(e) => setRecurringForm((f) => ({ ...f, vendorId: e.target.value }))}
            >
              <option value="">No vendor</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>{v.vendorName}</option>
              ))}
            </select>
          </Field>
          <Field label="Amount *">
            <input
              type="number"
              step="0.01"
              className={am.input}
              value={recurringForm.amount}
              onChange={(e) => setRecurringForm((f) => ({ ...f, amount: e.target.value }))}
            />
          </Field>
          <Field label="Frequency">
            <select
              className={am.select}
              value={recurringForm.frequency}
              onChange={(e) => setRecurringForm((f) => ({ ...f, frequency: e.target.value }))}
            >
              {(meta?.recurringFrequencies || ['MONTHLY']).map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </Field>
          <Field label="Next Due Date *">
            <input
              type="date"
              className={am.input}
              value={recurringForm.nextDueDate}
              onChange={(e) => setRecurringForm((f) => ({ ...f, nextDueDate: e.target.value }))}
            />
          </Field>
          <Field label="Department">
            <select
              className={am.select}
              value={recurringForm.department}
              onChange={(e) => setRecurringForm((f) => ({ ...f, department: e.target.value }))}
            >
              {(meta?.departments || []).map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </Field>
          <Field label="Campus">
            <select
              className={am.select}
              value={recurringForm.campus}
              onChange={(e) => setRecurringForm((f) => ({ ...f, campus: e.target.value }))}
            >
              {(meta?.campuses || []).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Payment Method">
            <select
              className={am.select}
              value={recurringForm.paymentMethod}
              onChange={(e) =>
                setRecurringForm((f) => ({ ...f, paymentMethod: e.target.value as ExpensePaymentMethod }))
              }
            >
              {(meta?.paymentMethods || Object.keys(PAYMENT_LABELS)).map((m) => (
                <option key={m} value={m}>
                  {PAYMENT_LABELS[m as ExpensePaymentMethod] || m}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Auto-create entries">
            <label className="flex items-center gap-2 text-sm text-slate-700 mt-2">
              <input
                type="checkbox"
                checked={recurringForm.autoCreate}
                onChange={(e) => setRecurringForm((f) => ({ ...f, autoCreate: e.target.checked }))}
              />
              Automatically create expense on due date
            </label>
          </Field>
          <Field label="Remarks" className="sm:col-span-2">
            <input
              className={am.input}
              value={recurringForm.remarks}
              onChange={(e) => setRecurringForm((f) => ({ ...f, remarks: e.target.value }))}
            />
          </Field>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={() => setShowRecurringModal(false)} className={am.btnSecondary}>Cancel</button>
          <button type="button" onClick={() => void handleCreateRecurring()} className={am.btnPrimary}>Save Template</button>
        </div>
      </AcademicModal>

      {/* Reimbursement Modal */}
      <AcademicModal
        open={showReimbursementModal}
        onClose={() => setShowReimbursementModal(false)}
        title="Add Reimbursement Request"
        large
      >
        <div className="space-y-3">
          <Field label="Employee Name *">
            <input
              className={am.input}
              value={reimbursementForm.employeeName}
              onChange={(e) => setReimbursementForm((f) => ({ ...f, employeeName: e.target.value }))}
            />
          </Field>
          <Field label="Department">
            <select
              className={am.select}
              value={reimbursementForm.department}
              onChange={(e) => setReimbursementForm((f) => ({ ...f, department: e.target.value }))}
            >
              <option value="">Select department</option>
              {(meta?.departments || []).map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </Field>
          <Field label="Amount *">
            <input
              type="number"
              step="0.01"
              className={am.input}
              value={reimbursementForm.amount}
              onChange={(e) => setReimbursementForm((f) => ({ ...f, amount: e.target.value }))}
            />
          </Field>
          <Field label="Description">
            <textarea
              className={am.input}
              rows={2}
              value={reimbursementForm.description}
              onChange={(e) => setReimbursementForm((f) => ({ ...f, description: e.target.value }))}
            />
          </Field>
          <Field label="Bill Upload (filename)">
            <input
              className={am.input}
              value={reimbursementForm.billUploadName}
              onChange={(e) => setReimbursementForm((f) => ({ ...f, billUploadName: e.target.value }))}
            />
          </Field>
          <Field label="Remarks">
            <input
              className={am.input}
              value={reimbursementForm.remarks}
              onChange={(e) => setReimbursementForm((f) => ({ ...f, remarks: e.target.value }))}
            />
          </Field>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={() => setShowReimbursementModal(false)} className={am.btnSecondary}>Cancel</button>
          <button type="button" onClick={() => void handleCreateReimbursement()} className={am.btnPrimary}>
            Submit Request
          </button>
        </div>
      </AcademicModal>

      {/* Approval Remarks Modal */}
      <AcademicModal
        open={!!approvalTarget}
        onClose={() => setApprovalTarget(null)}
        title={`${approvalAction.charAt(0) + approvalAction.slice(1).toLowerCase()} Expense`}
      >
        {approvalTarget && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              <span className="font-semibold">{approvalTarget.expenseId}</span>
              {' — '}
              {formatInr(approvalTarget.totalAmount)}
            </p>
            <Field label="Remarks">
              <textarea
                className={am.input}
                rows={3}
                value={approvalRemarks}
                onChange={(e) => setApprovalRemarks(e.target.value)}
                placeholder="Optional remarks for this action"
              />
            </Field>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setApprovalTarget(null)} className={am.btnSecondary}>Cancel</button>
              <button type="button" onClick={() => void runApproval()} className={am.btnPrimary}>Confirm</button>
            </div>
          </div>
        )}
      </AcademicModal>
    </AcademicPageShell>
  );
}
