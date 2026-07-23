import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download, Eye, Filter, Plus, RefreshCcw, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  approveCashDeposit,
  createCashDeposit,
  createChequeDeposit,
  exportBankCashBook,
  fetchBankCashBookMeta,
  fetchFeeDashboardMeta,
  formatInr,
  getBankCashBookSummary,
  importBankCashBookBatch,
  listBankCashBookDeposits,
  listDepositHistory,
  previewCashCollection,
  realizeChequeDeposit,
  type BankCashBookSummary,
  type BankDepositRecord,
  type BankDepositStatus,
  type DepositHistoryRow,
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

const STATUS_OPTIONS: BankDepositStatus[] = [
  'PENDING',
  'APPROVED',
  'DEPOSITED',
  'REALIZED',
  'REJECTED',
];

const emptyChequeItem = () => ({
  studentName: '',
  receiptNumber: '',
  bankName: '',
  chequeNumber: '',
  chequeBankBranch: '',
  amount: '',
});

export function BankCashBookView() {
  const [summary, setSummary] = useState<BankCashBookSummary | null>(null);
  const [deposits, setDeposits] = useState<BankDepositRecord[]>([]);
  const [history, setHistory] = useState<DepositHistoryRow[]>([]);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [years, setYears] = useState<string[]>(['2025-26']);
  const [statusFilter, setStatusFilter] = useState<BankDepositStatus | ''>('');
  const [typeFilter, setTypeFilter] = useState<'CASH' | 'CHEQUE' | ''>('');
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [meta, setMeta] = useState<Awaited<ReturnType<typeof fetchBankCashBookMeta>> | null>(null);
  const [modalTab, setModalTab] = useState<'Cash Deposit' | 'Cheque Deposit'>('Cash Deposit');
  const [showModal, setShowModal] = useState(false);
  const [viewRecord, setViewRecord] = useState<BankDepositRecord | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const [cashForm, setCashForm] = useState({
    depositDate: new Date().toISOString().slice(0, 10),
    campus: 'Main Campus',
    branch: 'Main Branch',
    depositBy: '',
    bankName: 'SBI',
    bankAccount: '',
    depositSlipNo: '',
    depositAmount: '',
    collectionDate: new Date().toISOString().slice(0, 10),
    totalCashCollected: 0,
    cashCounted: '',
    remarks: '',
    slipUploadName: '',
  });

  const [chequeForm, setChequeForm] = useState({
    depositDate: new Date().toISOString().slice(0, 10),
    bankName: 'SBI',
    branch: 'Main Branch',
    depositSlipNo: '',
    depositBy: '',
    remarks: '',
    items: [emptyChequeItem()],
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const dashMeta = await fetchFeeDashboardMeta();
      if (dashMeta.academicYears?.length) setYears(dashMeta.academicYears);
      const year = academicYear || dashMeta.defaultAcademicYear || '2025-26';
      if (!academicYear && dashMeta.defaultAcademicYear) setAcademicYear(dashMeta.defaultAcademicYear);

      const [sum, rows, hist, bookMeta] = await Promise.all([
        getBankCashBookSummary(year),
        listBankCashBookDeposits({
          academicYear: year,
          status: statusFilter || undefined,
          type: typeFilter || undefined,
        }),
        listDepositHistory(year),
        fetchBankCashBookMeta(),
      ]);
      setSummary(sum);
      setDeposits(rows);
      setHistory(hist);
      setMeta(bookMeta);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load bank & cash book');
    } finally {
      setLoading(false);
    }
  }, [academicYear, statusFilter, typeFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const refreshCashCollected = async (collectionDate: string) => {
    try {
      const data = await previewCashCollection(academicYear, collectionDate);
      setCashForm((f) => ({ ...f, totalCashCollected: data.totalCashCollected }));
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (showModal && modalTab === 'Cash Deposit') {
      void refreshCashCollected(cashForm.collectionDate);
    }
  }, [showModal, modalTab, cashForm.collectionDate, academicYear]);

  const filteredDeposits = useMemo(() => deposits, [deposits]);

  const cashDifference = useMemo(() => {
    const counted = Number(cashForm.cashCounted) || Number(cashForm.depositAmount) || 0;
    const deposit = Number(cashForm.depositAmount) || 0;
    return counted - deposit;
  }, [cashForm.cashCounted, cashForm.depositAmount]);

  const chequeTotal = useMemo(
    () => chequeForm.items.reduce((s, i) => s + (Number(i.amount) || 0), 0),
    [chequeForm.items],
  );

  const openCreate = (tab: 'Cash Deposit' | 'Cheque Deposit') => {
    setModalTab(tab);
    setCashForm({
      depositDate: new Date().toISOString().slice(0, 10),
      campus: 'Main Campus',
      branch: 'Main Branch',
      depositBy: meta?.employees[0]?.value || '',
      bankName: meta?.banks[0] || 'SBI',
      bankAccount: meta?.bankAccounts[0]?.account || '',
      depositSlipNo: '',
      depositAmount: '',
      collectionDate: new Date().toISOString().slice(0, 10),
      totalCashCollected: 0,
      cashCounted: '',
      remarks: '',
      slipUploadName: '',
    });
    setChequeForm({
      depositDate: new Date().toISOString().slice(0, 10),
      bankName: meta?.banks[0] || 'SBI',
      branch: 'Main Branch',
      depositSlipNo: '',
      depositBy: meta?.employees[0]?.value || '',
      remarks: '',
      items: [emptyChequeItem()],
    });
    setShowModal(true);
  };

  const handleCreateCash = async () => {
    setError('');
    const amount = Number(cashForm.depositAmount);
    if (!amount || amount <= 0) {
      setError('Enter a valid deposit amount');
      return;
    }
    try {
      await createCashDeposit({
        academicYear,
        depositDate: cashForm.depositDate,
        campus: cashForm.campus,
        branch: cashForm.branch,
        depositBy: cashForm.depositBy,
        bankName: cashForm.bankName,
        bankAccount: cashForm.bankAccount,
        depositSlipNo: cashForm.depositSlipNo,
        depositAmount: amount,
        collectionDate: cashForm.collectionDate,
        cashCounted: Number(cashForm.cashCounted) || amount,
        remarks: cashForm.remarks,
        slipUploadName: cashForm.slipUploadName,
      });
      setMessage('Cash deposit recorded');
      setShowModal(false);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create cash deposit');
    }
  };

  const handleCreateCheque = async () => {
    setError('');
    const items = chequeForm.items
      .filter((i) => Number(i.amount) > 0)
      .map((i) => ({
        studentName: i.studentName,
        receiptNumber: i.receiptNumber,
        bankName: i.bankName || chequeForm.bankName,
        chequeNumber: i.chequeNumber,
        chequeBankBranch: i.chequeBankBranch,
        amount: Number(i.amount),
      }));
    if (!items.length) {
      setError('Add at least one cheque with amount');
      return;
    }
    try {
      await createChequeDeposit({
        academicYear,
        depositDate: chequeForm.depositDate,
        bankName: chequeForm.bankName,
        branch: chequeForm.branch,
        depositSlipNo: chequeForm.depositSlipNo,
        depositBy: chequeForm.depositBy,
        remarks: chequeForm.remarks,
        items,
      });
      setMessage('Cheque deposit recorded');
      setShowModal(false);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create cheque deposit');
    }
  };

  const handleExport = async () => {
    try {
      const data = await exportBankCashBook(academicYear);
      const depositRows = data.deposits.map((d) => ({
        Type: d.type,
        'Deposit ID': d.depositId,
        Date: d.depositDate,
        Bank: d.bankName,
        Amount: d.depositAmount,
        Status: d.status,
        Updated: d.updatedAt.slice(0, 10),
      }));
      const historyRows = data.history.map((h) => ({
        Student: h.studentName,
        'Receipt No': h.receiptNumber,
        Bank: h.bankName,
        'Cheque No': h.chequeNumber,
        Date: h.depositDate,
        Amount: h.amount,
        Status: h.status,
      }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(depositRows), 'Deposits');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(historyRows), 'History');
      XLSX.writeFile(wb, `Bank_Cash_Book_${academicYear}.xlsx`);
      setMessage('Excel exported');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed');
    }
  };

  const handleImport = async (file: File) => {
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
      const result = await importBankCashBookBatch(rows);
      setMessage(`Imported ${result.imported} of ${result.total} rows`);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed');
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await approveCashDeposit(id);
      setMessage('Cash deposit approved');
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Approval failed');
    }
  };

  const handleRealize = async (id: string) => {
    try {
      await realizeChequeDeposit(id);
      setMessage('Cheque deposit marked as realized');
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Realize failed');
    }
  };

  if (loading && !summary) {
    return <AcademicLoading label="Loading bank & cash book…" />;
  }

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="Fees & Finance › Bank & Cash Book"
        title="Bank & Cash Book"
        subtitle="Cash & cheque deposit slips, bank collections and deposit history"
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
            <input
              ref={importRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleImport(f);
                e.target.value = '';
              }}
            />
            <button type="button" onClick={() => importRef.current?.click()} className={am.btnSecondary}>
              <Upload size={14} /> Import
            </button>
            <button type="button" onClick={() => void handleExport()} className={am.btnSecondary}>
              <Download size={14} /> Export
            </button>
            <button type="button" onClick={() => openCreate('Cash Deposit')} className={am.btnPrimary}>
              <Plus size={14} /> Add New
            </button>
          </>
        }
      />

      <div className={am.content}>
        {message && <FeeMessage message={message} type="success" />}
        {error && <FeeMessage message={error} type="error" />}

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {[
            { label: 'Bank Total Amount Cheque', value: summary?.totalChequeAmount ?? 0 },
            { label: 'Bank Total Cash Deposited', value: summary?.totalCashDeposited ?? 0 },
            { label: 'Bank Total Collection Deposited', value: summary?.totalCollectionDeposited ?? 0 },
            { label: 'Bank Total Cheque Amount Deposited Realized', value: summary?.totalChequeRealized ?? 0 },
          ].map((card) => (
            <div
              key={card.label}
              className="bg-gradient-to-br from-blue-600 to-blue-500 text-white rounded-xl px-4 py-3 shadow-sm"
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide opacity-90">{card.label}</p>
              <p className="text-2xl font-bold mt-1">{formatInr(card.value)}</p>
            </div>
          ))}
        </div>

        {/* Filters + list */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className={am.btnSecondary}
          >
            <Filter size={14} /> Filters
          </button>
          <button type="button" onClick={() => void load()} className={am.btnSecondary}>
            <RefreshCcw size={14} /> Refresh
          </button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-2 bg-slate-50 border border-slate-200 rounded-lg p-3">
            <select
              className={am.select}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
            >
              <option value="">All Types</option>
              <option value="CASH">Cash Deposit</option>
              <option value="CHEQUE">Cheque Deposit</option>
            </select>
            <select
              className={am.select}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as BankDepositStatus | '')}
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
        )}

        <div className={am.tableWrap}>
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="bg-slate-50">
                <th className={`${am.th} text-left`}>Deposit ID</th>
                <th className={`${am.th} text-left`}>Type</th>
                <th className={`${am.th} text-left`}>Date</th>
                <th className={`${am.th} text-left`}>Bank</th>
                <th className={`${am.th} text-right`}>Amount</th>
                <th className={`${am.th} text-left`}>Updated</th>
                <th className={`${am.th} text-left`}>Status</th>
                <th className={`${am.th} text-left`}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredDeposits.length === 0 ? (
                <tr>
                  <td colSpan={8} className={am.td}>
                    <EmptyState>No deposits yet — click Add New to record a cash or cheque deposit.</EmptyState>
                  </td>
                </tr>
              ) : (
                filteredDeposits.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/80">
                    <td className={`${am.td} font-mono text-[11px]`}>{d.depositId}</td>
                    <td className={am.td}>{d.type}</td>
                    <td className={am.td}>{d.depositDate}</td>
                    <td className={am.td}>{d.bankName}</td>
                    <td className={`${am.td} text-right font-semibold`}>{formatInr(d.depositAmount)}</td>
                    <td className={am.td}>
                      {new Date(d.updatedAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </td>
                    <td className={am.td}><StatusBadge status={d.status} /></td>
                    <td className={am.td}>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="text-indigo-600 font-semibold text-[11px] flex items-center gap-1"
                          onClick={() => setViewRecord(d)}
                        >
                          <Eye size={12} /> View
                        </button>
                        {d.type === 'CASH' && d.status === 'PENDING' && (
                          <button
                            type="button"
                            className="text-green-700 font-semibold text-[11px]"
                            onClick={() => void handleApprove(d.id)}
                          >
                            Approve
                          </button>
                        )}
                        {d.type === 'CHEQUE' && d.status === 'DEPOSITED' && (
                          <button
                            type="button"
                            className="text-teal-700 font-semibold text-[11px]"
                            onClick={() => void handleRealize(d.id)}
                          >
                            Realize
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Deposit history */}
        <div className="rounded-xl overflow-hidden border border-blue-200 shadow-sm">
          <div className="bg-blue-600 text-white px-3 py-2 text-xs font-bold uppercase tracking-wide">
            Cash & Cheque Deposit History
          </div>
          <div className="overflow-x-auto bg-white">
            <table className="w-full min-w-[640px] text-xs">
              <thead>
                <tr className="bg-blue-50 border-b border-blue-100">
                  <th className={`${am.th} text-left`}>Student</th>
                  <th className={`${am.th} text-left`}>Receipt No</th>
                  <th className={`${am.th} text-left`}>Bank</th>
                  <th className={`${am.th} text-left`}>Cheque No</th>
                  <th className={`${am.th} text-left`}>Date</th>
                  <th className={`${am.th} text-right`}>Amount</th>
                  <th className={`${am.th} text-left`}>Status</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={7} className={`${am.td} text-center text-slate-400 py-6`}>
                      Cheque deposit history will appear here
                    </td>
                  </tr>
                ) : (
                  history.map((h) => (
                    <tr key={h.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                      <td className={am.td}>{h.studentName}</td>
                      <td className={am.td}>{h.receiptNumber}</td>
                      <td className={am.td}>{h.bankName}</td>
                      <td className={am.td}>{h.chequeNumber}</td>
                      <td className={am.td}>
                        {new Date(h.depositDate).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </td>
                      <td className={`${am.td} text-right font-semibold`}>{formatInr(h.amount)}</td>
                      <td className={am.td}><StatusBadge status={h.status} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add New modal */}
      <AcademicModal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Add New Deposit"
        large
      >
        <FeeTabs
          tabs={['Cash Deposit', 'Cheque Deposit']}
          active={modalTab}
          onChange={(t) => setModalTab(t as typeof modalTab)}
        />
        <div className="pt-3">
          {modalTab === 'Cash Deposit' ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-semibold text-slate-500">Deposit Date *</label>
                <input
                  type="date"
                  className={am.input}
                  value={cashForm.depositDate}
                  onChange={(e) => setCashForm((f) => ({ ...f, depositDate: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-500">Collection Date *</label>
                <input
                  type="date"
                  className={am.input}
                  value={cashForm.collectionDate}
                  onChange={(e) => setCashForm((f) => ({ ...f, collectionDate: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-500">Campus</label>
                <select
                  className={`${am.select} w-full`}
                  value={cashForm.campus}
                  onChange={(e) => setCashForm((f) => ({ ...f, campus: e.target.value }))}
                >
                  {(meta?.campuses || ['Main Campus']).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-500">Branch</label>
                <select
                  className={`${am.select} w-full`}
                  value={cashForm.branch}
                  onChange={(e) => setCashForm((f) => ({ ...f, branch: e.target.value }))}
                >
                  {(meta?.branches || ['Main Branch']).map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-500">Deposit By</label>
                <select
                  className={`${am.select} w-full`}
                  value={cashForm.depositBy}
                  onChange={(e) => setCashForm((f) => ({ ...f, depositBy: e.target.value }))}
                >
                  <option value="">Select employee</option>
                  {(meta?.employees || []).map((e) => (
                    <option key={e.code} value={e.value}>{e.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-500">Bank Name</label>
                <select
                  className={`${am.select} w-full`}
                  value={cashForm.bankName}
                  onChange={(e) => {
                    const bank = e.target.value;
                    const account = meta?.bankAccounts.find((a) => a.bank === bank)?.account || '';
                    setCashForm((f) => ({ ...f, bankName: bank, bankAccount: account }));
                  }}
                >
                  {(meta?.banks || ['SBI']).map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-500">Bank Account</label>
                <input className={am.input} value={cashForm.bankAccount} readOnly />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-500">Deposit Slip No</label>
                <input
                  className={am.input}
                  value={cashForm.depositSlipNo}
                  onChange={(e) => setCashForm((f) => ({ ...f, depositSlipNo: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-500">Deposit Amount (₹) *</label>
                <input
                  type="number"
                  className={am.input}
                  value={cashForm.depositAmount}
                  onChange={(e) => setCashForm((f) => ({ ...f, depositAmount: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-500">Total Cash Collected (Auto)</label>
                <input className={am.input} value={formatInr(cashForm.totalCashCollected)} readOnly />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-500">Cash Counted (₹)</label>
                <input
                  type="number"
                  className={am.input}
                  value={cashForm.cashCounted}
                  onChange={(e) => setCashForm((f) => ({ ...f, cashCounted: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-500">Difference (Auto)</label>
                <input className={am.input} value={formatInr(cashDifference)} readOnly />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-semibold text-slate-500">Deposit Slip Upload (filename)</label>
                <input
                  className={am.input}
                  value={cashForm.slipUploadName}
                  onChange={(e) => setCashForm((f) => ({ ...f, slipUploadName: e.target.value }))}
                  placeholder="e.g. slip_july20.pdf"
                />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-semibold text-slate-500">Remarks</label>
                <input
                  className={am.input}
                  value={cashForm.remarks}
                  onChange={(e) => setCashForm((f) => ({ ...f, remarks: e.target.value }))}
                />
              </div>
              <div className="col-span-2 flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className={am.btnSecondary}>Cancel</button>
                <button type="button" onClick={() => void handleCreateCash()} className={am.btnPrimary}>
                  Save Cash Deposit
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-slate-500">Deposit Date *</label>
                  <input
                    type="date"
                    className={am.input}
                    value={chequeForm.depositDate}
                    onChange={(e) => setChequeForm((f) => ({ ...f, depositDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500">Bank Name</label>
                  <select
                    className={`${am.select} w-full`}
                    value={chequeForm.bankName}
                    onChange={(e) => setChequeForm((f) => ({ ...f, bankName: e.target.value }))}
                  >
                    {(meta?.banks || ['SBI']).map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500">Branch</label>
                  <select
                    className={`${am.select} w-full`}
                    value={chequeForm.branch}
                    onChange={(e) => setChequeForm((f) => ({ ...f, branch: e.target.value }))}
                  >
                    {(meta?.branches || ['Main Branch']).map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500">Deposit Slip No</label>
                  <input
                    className={am.input}
                    value={chequeForm.depositSlipNo}
                    onChange={(e) => setChequeForm((f) => ({ ...f, depositSlipNo: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500">Deposit By</label>
                  <select
                    className={`${am.select} w-full`}
                    value={chequeForm.depositBy}
                    onChange={(e) => setChequeForm((f) => ({ ...f, depositBy: e.target.value }))}
                  >
                    <option value="">Select employee</option>
                    {(meta?.employees || []).map((e) => (
                      <option key={e.code} value={e.value}>{e.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500">Total Cheques / Amount</label>
                  <input
                    className={am.input}
                    value={`${chequeForm.items.length} cheques — ${formatInr(chequeTotal)}`}
                    readOnly
                  />
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-900">Cheque Line Items</div>
                <div className="divide-y divide-slate-100">
                  {chequeForm.items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-6 gap-2 p-2">
                      <input
                        className={am.input}
                        placeholder="Student"
                        value={item.studentName}
                        onChange={(e) => {
                          const items = [...chequeForm.items];
                          items[idx] = { ...items[idx], studentName: e.target.value };
                          setChequeForm((f) => ({ ...f, items }));
                        }}
                      />
                      <input
                        className={am.input}
                        placeholder="Receipt No"
                        value={item.receiptNumber}
                        onChange={(e) => {
                          const items = [...chequeForm.items];
                          items[idx] = { ...items[idx], receiptNumber: e.target.value };
                          setChequeForm((f) => ({ ...f, items }));
                        }}
                      />
                      <input
                        className={am.input}
                        placeholder="Cheque No"
                        value={item.chequeNumber}
                        onChange={(e) => {
                          const items = [...chequeForm.items];
                          items[idx] = { ...items[idx], chequeNumber: e.target.value };
                          setChequeForm((f) => ({ ...f, items }));
                        }}
                      />
                      <input
                        className={am.input}
                        placeholder="Bank & Branch"
                        value={item.chequeBankBranch}
                        onChange={(e) => {
                          const items = [...chequeForm.items];
                          items[idx] = { ...items[idx], chequeBankBranch: e.target.value };
                          setChequeForm((f) => ({ ...f, items }));
                        }}
                      />
                      <input
                        type="number"
                        className={am.input}
                        placeholder="Amount"
                        value={item.amount}
                        onChange={(e) => {
                          const items = [...chequeForm.items];
                          items[idx] = { ...items[idx], amount: e.target.value };
                          setChequeForm((f) => ({ ...f, items }));
                        }}
                      />
                      <button
                        type="button"
                        className="text-red-600 text-xs font-semibold"
                        onClick={() =>
                          setChequeForm((f) => ({
                            ...f,
                            items: f.items.filter((_, i) => i !== idx),
                          }))
                        }
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="w-full text-xs font-semibold text-indigo-600 py-2 hover:bg-indigo-50"
                  onClick={() =>
                    setChequeForm((f) => ({ ...f, items: [...f.items, emptyChequeItem()] }))
                  }
                >
                  + Add Cheque
                </button>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-500">Remarks</label>
                <input
                  className={am.input}
                  value={chequeForm.remarks}
                  onChange={(e) => setChequeForm((f) => ({ ...f, remarks: e.target.value }))}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowModal(false)} className={am.btnSecondary}>Cancel</button>
                <button type="button" onClick={() => void handleCreateCheque()} className={am.btnPrimary}>
                  Save Cheque Deposit
                </button>
              </div>
            </div>
          )}
        </div>
      </AcademicModal>

      {/* View modal */}
      <AcademicModal
        open={!!viewRecord}
        onClose={() => setViewRecord(null)}
        title={viewRecord ? `${viewRecord.type} Deposit — ${viewRecord.depositId}` : 'View'}
        large
      >
        {viewRecord && (
          <div className="space-y-2 text-xs">
            <p><strong>Date:</strong> {viewRecord.depositDate}</p>
            <p><strong>Bank:</strong> {viewRecord.bankName}</p>
            <p><strong>Amount:</strong> {formatInr(viewRecord.depositAmount)}</p>
            <p><strong>Status:</strong> <StatusBadge status={viewRecord.status} /></p>
            {viewRecord.type === 'CASH' && (
              <>
                <p><strong>Campus:</strong> {viewRecord.campus}</p>
                <p><strong>Cashier:</strong> {viewRecord.cashierName}</p>
                <p><strong>Total Cash Collected:</strong> {formatInr(viewRecord.totalCashCollected)}</p>
                <p><strong>Difference:</strong> {formatInr(viewRecord.difference)}</p>
                <p><strong>Remarks:</strong> {viewRecord.remarks || '—'}</p>
              </>
            )}
            {viewRecord.type === 'CHEQUE' && (
              <>
                <p><strong>Total Cheques:</strong> {viewRecord.totalCheques}</p>
                <p><strong>Remarks:</strong> {viewRecord.remarks || '—'}</p>
                <div className={am.tableWrap}>
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className={am.th}>Student</th>
                        <th className={am.th}>Receipt</th>
                        <th className={am.th}>Cheque No</th>
                        <th className={am.th}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewRecord.items.map((i) => (
                        <tr key={i.id}>
                          <td className={am.td}>{i.studentName}</td>
                          <td className={am.td}>{i.receiptNumber}</td>
                          <td className={am.td}>{i.chequeNumber}</td>
                          <td className={am.td}>{formatInr(i.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </AcademicModal>
    </AcademicPageShell>
  );
}
