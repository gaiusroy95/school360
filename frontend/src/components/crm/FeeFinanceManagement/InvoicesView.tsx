import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FileText, Link2, Plus, Printer, RefreshCcw, Search, Smartphone, Sparkles,
} from 'lucide-react';
import {
  createFeeInvoice,
  fetchFeeDashboardMeta,
  fetchInvoiceCreateMeta,
  formatInr,
  generateInvoicesFromReceipts,
  getFeeInvoice,
  listFeeInvoices,
  syncInvoicesFromPayments,
  updateFeeInvoiceStatus,
  type FeeInvoice,
  type FeeInvoiceStatus,
  type InvoiceCreateMeta,
} from '../../../lib/feeFinanceServices';
import { fetchStudents, type Student } from '../../../lib/studentServices';
import {
  AcademicLoading,
  AcademicPageHeader,
  AcademicPageShell,
  am,
  EmptyState,
  FeeMessage,
  FeeTabs,
  StatusBadge,
} from './FeeFinanceUi';
import { resolveLogoUrl } from '../../../lib/branding';

function InvoicePreview({ invoice }: { invoice: FeeInvoice }) {
  const inst = invoice.institutionSnapshot as Record<string, string>;
  const schoolName = inst.name || inst.shortName || 'School';
  const address = [inst.addressLine1, inst.addressLine2, inst.city, inst.state, inst.pincode]
    .filter(Boolean)
    .join(', ');

  return (
    <div id="invoice-print-area" className="bg-white border border-slate-200 rounded-xl p-6 md:p-8 text-sm print:border-0 print:shadow-none print:p-0">
      <div className="text-center border-b border-slate-200 pb-4 mb-4">
        <img src={resolveLogoUrl(inst.logoUrl)} alt="" className="h-12 mx-auto mb-2 object-contain" />
        <h2 className="text-lg font-bold text-slate-900 uppercase tracking-wide">{schoolName}</h2>
        {address && <p className="text-xs text-slate-600 mt-1">{address}</p>}
        {(inst.phone || inst.email) && (
          <p className="text-xs text-slate-500 mt-0.5">
            {[inst.phone, inst.email].filter(Boolean).join(' · ')}
          </p>
        )}
        <p className="text-xs font-bold text-amber-700 mt-2 uppercase tracking-widest">Fee Invoice</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4 text-xs">
        <div>
          <p><span className="text-slate-500">Invoice No:</span> <strong>{invoice.invoiceNumber}</strong></p>
          <p><span className="text-slate-500">Date:</span> {invoice.invoiceDate}</p>
          <p><span className="text-slate-500">Due Date:</span> {invoice.dueDate || '—'}</p>
          <p><span className="text-slate-500">Period:</span> {invoice.feePeriod || invoice.academicYear}</p>
          {invoice.paymentMode && <p><span className="text-slate-500">Mode:</span> {invoice.paymentMode}</p>}
        </div>
        <div className="text-right">
          <p className="font-bold text-slate-800">{invoice.studentName}</p>
          <p>Adm: {invoice.admissionNumber || '—'}</p>
          <p>Class: {invoice.className}{invoice.sectionName ? ` - ${invoice.sectionName}` : ''}</p>
          {invoice.rollNumber && <p>Roll: {invoice.rollNumber}</p>}
          {invoice.parentName && <p className="mt-1">Parent: {invoice.parentName}</p>}
          {invoice.parentMobile && <p>Mob: {invoice.parentMobile}</p>}
        </div>
      </div>

      <table className="w-full text-xs border border-slate-200 mb-4">
        <thead>
          <tr className="bg-slate-50">
            <th className="px-3 py-2 text-left border-b">#</th>
            <th className="px-3 py-2 text-left border-b">Fee Head</th>
            <th className="px-3 py-2 text-right border-b">Amount</th>
          </tr>
        </thead>
        <tbody>
          {(invoice.lineItems || []).length === 0 ? (
            <tr><td colSpan={3} className="px-3 py-4 text-center text-slate-400">No line items</td></tr>
          ) : (
            invoice.lineItems.map((item, i) => (
              <tr key={i} className="border-b border-slate-100">
                <td className="px-3 py-2">{i + 1}</td>
                <td className="px-3 py-2">{String(item.label || item.key || 'Fee')}</td>
                <td className="px-3 py-2 text-right">{formatInr(Number(item.amount) || 0)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div className="flex justify-end mb-6">
        <div className="w-64 space-y-1 text-xs">
          <div className="flex justify-between"><span>Total Fee</span><span>{formatInr(invoice.totalFee)}</span></div>
          <div className="flex justify-between text-green-700"><span>Concession</span><span>- {formatInr(invoice.concessionAmount)}</span></div>
          <div className="flex justify-between"><span>Late Fee</span><span>{formatInr(invoice.lateFee)}</span></div>
          <div className="flex justify-between"><span>Previous Dues</span><span>{formatInr(invoice.previousDues)}</span></div>
          <div className="flex justify-between font-bold border-t pt-1"><span>Net Payable</span><span>{formatInr(invoice.netPayable)}</span></div>
          <div className="flex justify-between text-green-700"><span>Amount Paid</span><span>{formatInr(invoice.amountPaid)}</span></div>
          <div className="flex justify-between font-bold text-red-700"><span>Balance</span><span>{formatInr(invoice.balance)}</span></div>
        </div>
      </div>

      {invoice.remarks && <p className="text-xs text-slate-500 mb-4">Remarks: {invoice.remarks}</p>}

      <div className="grid grid-cols-3 gap-8 pt-8 border-t border-slate-200 text-xs text-center">
        <div>
          <div className="border-t border-slate-400 pt-1 mt-12">Prepared By</div>
          <p className="text-slate-600 mt-1">{invoice.preparedBy || '—'}</p>
        </div>
        <div>
          <div className="border-t border-slate-400 pt-1 mt-12">Verified By</div>
          <p className="text-slate-600 mt-1">{invoice.verifiedBy || '—'}</p>
        </div>
        <div>
          <div className="border-t border-slate-400 pt-1 mt-12">Approved By</div>
          <p className="text-slate-600 mt-1">{invoice.approvedBy || '—'}</p>
        </div>
      </div>
    </div>
  );
}

type HeadRow = { key: string; label: string; amount: number; selected: boolean };

export function InvoicesView() {
  const [tab, setTab] = useState('All Invoices');
  const [records, setRecords] = useState<FeeInvoice[]>([]);
  const [selected, setSelected] = useState<FeeInvoice | null>(null);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [years, setYears] = useState<string[]>(['2025-26']);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Create form
  const [createMeta, setCreateMeta] = useState<InvoiceCreateMeta | null>(null);
  const [formClass, setFormClass] = useState('');
  const [formSection, setFormSection] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [formStudentId, setFormStudentId] = useState('');
  const [periodType, setPeriodType] = useState('MONTHLY');
  const [periodValue, setPeriodValue] = useState('APR');
  const [heads, setHeads] = useState<HeadRow[]>([]);
  const [concession, setConcession] = useState('0');
  const [lateFee, setLateFee] = useState('0');
  const [remarks, setRemarks] = useState('');
  const [creating, setCreating] = useState(false);

  const formSections = useMemo(() => {
    if (!createMeta || !formClass) return [];
    return createMeta.sectionsByClass[formClass] || [];
  }, [createMeta, formClass]);

  const periodValueOptions = useMemo(() => {
    if (!createMeta) return [];
    if (periodType === 'MONTHLY') return createMeta.periods.months;
    if (periodType === 'QUARTERLY') return createMeta.periods.quarters;
    if (periodType === 'HALF_YEARLY') return createMeta.periods.halfYears;
    return [createMeta.periods.yearOption];
  }, [createMeta, periodType]);

  const selectedTotal = useMemo(
    () => heads.filter((h) => h.selected).reduce((s, h) => s + (Number(h.amount) || 0), 0),
    [heads],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [meta, rows] = await Promise.all([
        fetchFeeDashboardMeta(),
        listFeeInvoices({ academicYear, q: search || undefined }),
      ]);
      setYears(meta.academicYears);
      if (meta.defaultAcademicYear) setAcademicYear((y) => y || meta.defaultAcademicYear);
      setRecords(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }, [academicYear, search]);

  useEffect(() => { void load(); }, [load]);

  const loadCreateMeta = useCallback(async (studentId?: string, className?: string, sectionName?: string) => {
    try {
      const meta = await fetchInvoiceCreateMeta({
        academicYear,
        studentId,
        className,
        sectionName,
      });
      setCreateMeta(meta);
      if (!formClass && meta.classes[0]) setFormClass(meta.classes[0]);
      setHeads(meta.feeHeads.map((h) => ({
        key: h.key,
        label: h.label,
        amount: h.amount,
        selected: h.selectedByDefault,
      })));
      const def = meta.periods.defaults[periodType] || meta.periods.defaults.MONTHLY;
      setPeriodValue(def);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load fee heads');
    }
  }, [academicYear, formClass, periodType]);

  useEffect(() => {
    if (tab !== 'Create Invoice') return;
    void loadCreateMeta(formStudentId || undefined, formClass || undefined, formSection || undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, academicYear]);

  useEffect(() => {
    if (tab !== 'Create Invoice' || !formClass) {
      setStudents([]);
      return;
    }
    let cancelled = false;
    setStudentsLoading(true);
    void fetchStudents({
      academicYear,
      className: formClass,
      sectionName: formSection || undefined,
      status: 'ACTIVE',
      pageSize: 300,
      viewAll: true,
    }).then((res) => {
      if (cancelled) return;
      setStudents(res.students);
      setFormStudentId((prev) => (res.students.some((s) => s.id === prev) ? prev : ''));
    }).catch(() => {
      if (!cancelled) setStudents([]);
    }).finally(() => {
      if (!cancelled) setStudentsLoading(false);
    });
    return () => { cancelled = true; };
  }, [tab, formClass, formSection, academicYear]);

  useEffect(() => {
    if (tab !== 'Create Invoice') return;
    if (!formStudentId && !formClass) return;
    void loadCreateMeta(formStudentId || undefined, formClass || undefined, formSection || undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formStudentId, formClass, formSection]);

  useEffect(() => {
    if (!createMeta) return;
    const def = createMeta.periods.defaults[periodType];
    if (def) setPeriodValue(def);
  }, [periodType, createMeta]);

  const openInvoice = async (id: string) => {
    setError('');
    try {
      const inv = await getFeeInvoice(id);
      setSelected(inv);
      setTab('Preview / Print');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load invoice');
    }
  };

  const handleSearch = () => {
    setSearch(searchInput.trim());
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setMessage('');
    setError('');
    try {
      const created = await generateInvoicesFromReceipts({ academicYear });
      setMessage(`Generated ${created.length} invoice(s) from receipts`);
      void load();
      if (created.length === 1) {
        setSelected(created[0]);
        setTab('Preview / Print');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setMessage('');
    setError('');
    try {
      const result = await syncInvoicesFromPayments({ academicYear });
      setMessage(result.message);
      await load();
      if (result.invoices.length === 1) {
        setSelected(result.invoices[0]);
        setTab('Preview / Print');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleCreate = async () => {
    if (!formStudentId) {
      setError('Select a student (after admission)');
      return;
    }
    const selectedHeads = heads.filter((h) => h.selected && Number(h.amount) > 0);
    if (!selectedHeads.length) {
      setError('Select at least one fee head from the fee structure');
      return;
    }
    setCreating(true);
    setError('');
    setMessage('');
    try {
      const record = await createFeeInvoice({
        studentId: formStudentId,
        academicYear,
        periodType,
        periodValue,
        selectedHeads: selectedHeads.map((h) => ({
          key: h.key,
          label: h.label,
          amount: Number(h.amount) || 0,
        })),
        concessionAmount: Number(concession) || 0,
        lateFee: Number(lateFee) || 0,
        remarks,
      });
      setMessage(`Invoice ${record.invoiceNumber} created for ${record.feePeriod || academicYear}`);
      setSelected(record);
      setTab('Preview / Print');
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create invoice');
    } finally {
      setCreating(false);
    }
  };

  const handleStatus = async (status: FeeInvoiceStatus) => {
    if (!selected) return;
    setError('');
    try {
      const updated = await updateFeeInvoiceStatus(selected.id, { status });
      setSelected(updated);
      setMessage(`Invoice marked as ${status}`);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Status update failed');
    }
  };

  const toggleHead = (key: string) => {
    setHeads((prev) => prev.map((h) => (h.key === key ? { ...h, selected: !h.selected } : h)));
  };

  const setHeadAmount = (key: string, amount: string) => {
    setHeads((prev) => prev.map((h) => (h.key === key ? { ...h, amount: Number(amount) || 0 } : h)));
  };

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="Fees & Finance"
        title="Invoices"
        subtitle="Create deposit invoices by fee heads & period · auto-sync mobile / payment-link receipts · search & print"
        actions={
          <>
            <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className={am.select}>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <button type="button" onClick={() => setTab('Create Invoice')} className={am.btnPrimary}>
              <Plus size={14} /> Create Invoice
            </button>
            <button type="button" onClick={() => void load()} className={am.btnSecondary}>
              <RefreshCcw size={14} /> Refresh
            </button>
          </>
        }
      />
      <div className={am.content}>
        <FeeTabs
          tabs={['All Invoices', 'Create Invoice', 'Sync & Generate', 'Preview / Print']}
          active={tab}
          onChange={setTab}
        />
        <FeeMessage message={message} type="success" />
        <FeeMessage message={error} type="error" />

        {tab === 'All Invoices' && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative flex-1 min-w-[220px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                  className={`${am.input} pl-9`}
                  placeholder="Search invoice #, student name, admission no…"
                />
              </div>
              <button type="button" onClick={handleSearch} className={am.btnSecondary}>
                <Search size={14} /> Search
              </button>
              <button type="button" onClick={() => void handleSync()} disabled={syncing} className={am.btnSecondary}>
                <Smartphone size={14} /> {syncing ? 'Syncing…' : 'Sync Mobile / Link Payments'}
              </button>
            </div>

            {loading ? <AcademicLoading /> : records.length === 0 ? (
              <EmptyState>
                No invoices found. Create a deposit invoice after admission, or sync payments from mobile / SMS payment links.
              </EmptyState>
            ) : (
              <div className={am.tableWrap}>
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className={am.th}>Invoice #</th>
                      <th className={am.th}>Student</th>
                      <th className={am.th}>Class</th>
                      <th className={am.th}>Period</th>
                      <th className={am.th}>Date</th>
                      <th className={`${am.th} text-right`}>Net Payable</th>
                      <th className={`${am.th} text-right`}>Balance</th>
                      <th className={am.th}>Status</th>
                      <th className={am.th}>Print</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((row) => (
                      <tr key={row.id} className="hover:bg-amber-50/50">
                        <td className={`${am.td} font-mono text-xs`}>{row.invoiceNumber}</td>
                        <td className={`${am.td} font-semibold`}>
                          <button type="button" className="text-left hover:underline" onClick={() => void openInvoice(row.id)}>
                            {row.studentName}
                          </button>
                          <p className="text-[10px] text-slate-400 font-normal">{row.admissionNumber}</p>
                        </td>
                        <td className={am.td}>{row.className}{row.sectionName ? `-${row.sectionName}` : ''}</td>
                        <td className={`${am.td} text-xs`}>{row.feePeriod || row.academicYear}</td>
                        <td className={am.td}>{row.invoiceDate}</td>
                        <td className={`${am.td} text-right`}>{formatInr(row.netPayable)}</td>
                        <td className={`${am.td} text-right font-bold`}>{formatInr(row.balance)}</td>
                        <td className={am.td}><StatusBadge status={row.status} /></td>
                        <td className={am.td}>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 text-xs text-amber-700 hover:underline"
                            onClick={() => void openInvoice(row.id)}
                          >
                            <Printer size={12} /> Print
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === 'Create Invoice' && (
          <div className="grid gap-4 lg:grid-cols-5">
            <div className={`${am.card} ${am.cardPad} lg:col-span-3 space-y-4`}>
              <div>
                <h3 className="font-bold text-slate-900">Deposit fees invoice (post-admission)</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Select student, billing period, and fee heads from the fee structure.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className={am.label}>Class *</label>
                  <select
                    value={formClass}
                    onChange={(e) => { setFormClass(e.target.value); setFormSection(''); setFormStudentId(''); }}
                    className={am.select}
                  >
                    <option value="">Select class</option>
                    {(createMeta?.classes || []).map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={am.label}>Section</label>
                  <select value={formSection} onChange={(e) => setFormSection(e.target.value)} className={am.select}>
                    <option value="">All</option>
                    {formSections.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className={am.label}>Student *</label>
                  <select
                    value={formStudentId}
                    onChange={(e) => setFormStudentId(e.target.value)}
                    className={am.select}
                    disabled={!formClass || studentsLoading}
                  >
                    <option value="">{studentsLoading ? 'Loading…' : 'Select student'}</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.fullName || s.name} ({s.admissionNumber})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={am.label}>Time period type *</label>
                  <select value={periodType} onChange={(e) => setPeriodType(e.target.value)} className={am.select}>
                    {(createMeta?.periods.periodTypes || [
                      { id: 'MONTHLY', label: '1 — Month / Month Name' },
                      { id: 'QUARTERLY', label: '2 — Quarterly (AMJ / JAS / OND / JFM)' },
                      { id: 'HALF_YEARLY', label: '3 — Half yearly (A–S / O–M)' },
                      { id: 'YEARLY', label: '4 — Year (FY)' },
                    ]).map((p) => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={am.label}>Period value *</label>
                  <select value={periodValue} onChange={(e) => setPeriodValue(e.target.value)} className={am.select}>
                    {periodValueOptions.map((p) => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={am.label}>Fee heads (from fee structure)</label>
                  {createMeta?.scheduleSource && (
                    <span className="text-[10px] text-slate-500">Source: {createMeta.scheduleSource}</span>
                  )}
                </div>
                <div className="max-h-64 overflow-auto border border-slate-200 rounded-lg divide-y">
                  {heads.length === 0 ? (
                    <p className="p-3 text-xs text-slate-400">Select a class/student to load fee structure heads.</p>
                  ) : heads.map((h) => (
                    <label key={h.key} className="flex items-center gap-3 px-3 py-2 text-xs hover:bg-slate-50">
                      <input type="checkbox" checked={h.selected} onChange={() => toggleHead(h.key)} />
                      <span className="flex-1 font-medium text-slate-800">{h.label}</span>
                      <input
                        type="number"
                        min={0}
                        value={h.amount}
                        onChange={(e) => setHeadAmount(h.key, e.target.value)}
                        className="w-28 border border-slate-200 rounded px-2 py-1 text-right"
                        disabled={!h.selected}
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className={am.label}>Concession</label>
                  <input type="number" min={0} value={concession} onChange={(e) => setConcession(e.target.value)} className={am.input} />
                </div>
                <div>
                  <label className={am.label}>Late fee</label>
                  <input type="number" min={0} value={lateFee} onChange={(e) => setLateFee(e.target.value)} className={am.input} />
                </div>
                <div>
                  <label className={am.label}>Selected total</label>
                  <p className="mt-2 text-sm font-bold text-slate-900">{formatInr(selectedTotal)}</p>
                </div>
              </div>

              <div>
                <label className={am.label}>Remarks</label>
                <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} className={am.input} rows={2} placeholder="Optional" />
              </div>

              <button type="button" disabled={creating} onClick={() => void handleCreate()} className={`${am.btnPrimary} w-full`}>
                <FileText size={14} />
                {creating ? 'Creating…' : 'Create Deposit Invoice'}
              </button>
            </div>

            <div className={`${am.card} ${am.cardPad} lg:col-span-2 space-y-3 text-xs text-slate-600`}>
              <h3 className="text-sm font-bold text-slate-900">Period guide</h3>
              <ul className="space-y-2 list-disc pl-4">
                <li><strong>Month</strong> — April … March (month name)</li>
                <li><strong>Quarterly</strong> — AMJ / JAS / OND / JFM</li>
                <li><strong>Half yearly</strong> — A–S (Apr–Sep) / O–M (Oct–Mar)</li>
                <li><strong>Year</strong> — FY {academicYear.replace('-', '-20')}</li>
              </ul>
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-blue-900 space-y-2">
                <p className="font-semibold flex items-center gap-1"><Smartphone size={12} /> Mobile &amp; SMS link sync</p>
                <p>Payments via student/parent app or payment links create receipts and auto-generate invoices. Use Sync on All Invoices / Sync &amp; Generate to backfill.</p>
              </div>
            </div>
          </div>
        )}

        {tab === 'Sync & Generate' && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className={`${am.card} ${am.cardPad} space-y-4`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                  <Smartphone className="text-indigo-600" size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Sync mobile / payment-link invoices</h3>
                  <p className="text-xs text-slate-500">
                    Pull invoices for receipts from mobile app Razorpay payments and SMS payment links in {academicYear}.
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => void handleSync()} disabled={syncing} className={`${am.btnPrimary} w-full`}>
                <Link2 size={14} />
                {syncing ? 'Syncing…' : 'Sync Now'}
              </button>
            </div>

            <div className={`${am.card} ${am.cardPad} space-y-4`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <Sparkles className="text-amber-600" size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Generate from all receipts</h3>
                  <p className="text-xs text-slate-500">
                    Create invoices for every fee receipt in {academicYear} that does not yet have an invoice (counter + online).
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => void handleGenerate()} disabled={generating} className={`${am.btnPrimary} w-full`}>
                <FileText size={14} />
                {generating ? 'Generating…' : 'Generate from Receipts'}
              </button>
            </div>
          </div>
        )}

        {tab === 'Preview / Print' && (
          selected ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 justify-between items-center print:hidden">
                <div className="flex flex-wrap gap-2">
                  {(['PENDING', 'PARTIAL', 'PAID', 'CANCELLED'] as FeeInvoiceStatus[]).map((s) => (
                    <button key={s} type="button" onClick={() => void handleStatus(s)} className={`${am.btnSecondary} text-xs`}>
                      Mark {s}
                    </button>
                  ))}
                </div>
                <button type="button" onClick={() => window.print()} className={am.btnPrimary}>
                  <Printer size={14} /> Print Invoice
                </button>
              </div>
              <InvoicePreview invoice={selected} />
            </div>
          ) : (
            <EmptyState>Search or open an invoice from All Invoices to preview and print.</EmptyState>
          )
        )}
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #invoice-print-area, #invoice-print-area * { visibility: visible !important; }
          #invoice-print-area { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </AcademicPageShell>
  );
}
