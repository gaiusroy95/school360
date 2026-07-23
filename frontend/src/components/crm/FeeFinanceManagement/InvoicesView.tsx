import { useCallback, useEffect, useState } from 'react';
import { FileText, Printer, RefreshCcw, Sparkles } from 'lucide-react';
import {
  fetchFeeDashboardMeta,
  formatInr,
  generateInvoicesFromReceipts,
  getFeeInvoice,
  listFeeInvoices,
  updateFeeInvoiceStatus,
  type FeeInvoice,
  type FeeInvoiceStatus,
} from '../../../lib/feeFinanceServices';
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

function InvoicePreview({ invoice }: { invoice: FeeInvoice }) {
  const inst = invoice.institutionSnapshot as Record<string, string>;
  const schoolName = inst.name || inst.shortName || 'School';
  const address = [inst.addressLine1, inst.addressLine2, inst.city, inst.state, inst.pincode]
    .filter(Boolean)
    .join(', ');

  return (
    <div id="invoice-print-area" className="bg-white border border-slate-200 rounded-xl p-6 md:p-8 text-sm print:border-0 print:shadow-none print:p-0">
      <div className="text-center border-b border-slate-200 pb-4 mb-4">
        {inst.logoUrl && <img src={inst.logoUrl} alt="" className="h-12 mx-auto mb-2 object-contain" />}
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

export function InvoicesView() {
  const [tab, setTab] = useState('All Invoices');
  const [records, setRecords] = useState<FeeInvoice[]>([]);
  const [selected, setSelected] = useState<FeeInvoice | null>(null);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [years, setYears] = useState<string[]>(['2025-26']);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [meta, rows] = await Promise.all([
        fetchFeeDashboardMeta(),
        listFeeInvoices({ academicYear }),
      ]);
      setYears(meta.academicYears);
      if (meta.defaultAcademicYear) setAcademicYear((y) => y || meta.defaultAcademicYear);
      setRecords(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }, [academicYear]);

  useEffect(() => {
    void load();
  }, [load]);

  const openInvoice = async (id: string) => {
    setError('');
    try {
      const inv = await getFeeInvoice(id);
      setSelected(inv);
      setTab('Preview');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load invoice');
    }
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
        setTab('Preview');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setGenerating(false);
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

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="Fees & Finance"
        title="Invoices"
        subtitle="Generate, preview, and manage student fee invoices."
        actions={
          <>
            <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className={am.select}>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <button type="button" onClick={() => void load()} className={am.btnSecondary}>
              <RefreshCcw size={14} /> Refresh
            </button>
          </>
        }
      />
      <div className={am.content}>
        <FeeTabs tabs={['All Invoices', 'Generate', 'Preview']} active={tab} onChange={setTab} />
        <FeeMessage message={message} type="success" />
        <FeeMessage message={error} type="error" />

        {tab === 'All Invoices' && (
          loading ? <AcademicLoading /> : records.length === 0 ? (
            <EmptyState>No invoices yet. Generate from fee receipts to get started.</EmptyState>
          ) : (
            <div className={am.tableWrap}>
              <table className="w-full">
                <thead>
                  <tr>
                    <th className={am.th}>Invoice #</th>
                    <th className={am.th}>Student</th>
                    <th className={am.th}>Class</th>
                    <th className={am.th}>Date</th>
                    <th className={am.th + ' text-right'}>Net Payable</th>
                    <th className={am.th + ' text-right'}>Balance</th>
                    <th className={am.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((row) => (
                    <tr
                      key={row.id}
                      className="hover:bg-amber-50/50 cursor-pointer"
                      onClick={() => void openInvoice(row.id)}
                    >
                      <td className={am.td + ' font-mono text-xs'}>{row.invoiceNumber}</td>
                      <td className={am.td + ' font-semibold'}>{row.studentName}</td>
                      <td className={am.td}>{row.className}</td>
                      <td className={am.td}>{row.invoiceDate}</td>
                      <td className={am.td + ' text-right'}>{formatInr(row.netPayable)}</td>
                      <td className={am.td + ' text-right font-bold'}>{formatInr(row.balance)}</td>
                      <td className={am.td}><StatusBadge status={row.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {tab === 'Generate' && (
          <div className={`${am.card} ${am.cardPad} max-w-lg space-y-4`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Sparkles className="text-amber-600" size={20} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Generate from Receipts</h3>
                <p className="text-xs text-slate-500">Create invoices for all fee receipts in {academicYear} that do not yet have an invoice.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={generating}
              className={am.btnPrimary + ' w-full'}
            >
              <FileText size={14} />
              {generating ? 'Generating…' : 'Generate from Receipts'}
            </button>
          </div>
        )}

        {tab === 'Preview' && (
          selected ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 justify-between items-center print:hidden">
                <div className="flex flex-wrap gap-2">
                  {(['PENDING', 'PARTIAL', 'PAID', 'CANCELLED'] as FeeInvoiceStatus[]).map((s) => (
                    <button key={s} type="button" onClick={() => void handleStatus(s)} className={am.btnSecondary + ' text-xs'}>
                      Mark {s}
                    </button>
                  ))}
                </div>
                <button type="button" onClick={() => window.print()} className={am.btnPrimary}>
                  <Printer size={14} /> Print
                </button>
              </div>
              <InvoicePreview invoice={selected} />
            </div>
          ) : (
            <EmptyState>Select an invoice from the list to preview, or generate new invoices.</EmptyState>
          )
        )}
      </div>
    </AcademicPageShell>
  );
}
