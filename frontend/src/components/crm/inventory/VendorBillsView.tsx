import { useCallback, useEffect, useState } from 'react';
import {
  Receipt, RefreshCw, Plus, Search, CheckCircle2, XCircle, AlertTriangle,
  GitCompareArrows, Send, Trash2, FileText, Scale,
} from 'lucide-react';
import {
  fetchVendorBillManagement,
  fetchVendorBillDetail,
  createVendorBill,
  deleteVendorBill,
  runVendorBillMatch,
  approveVendorBillVariance,
  approveVendorBill,
  sendVendorBillToFinance,
  rejectVendorBill,
  type VendorBillManagement,
  type VendorBillDetail,
} from '../../../lib/inventoryServices';
import { AcademicLoading, AcademicModal, FeeMessage, StatusBadge } from '../FeeFinanceManagement/FeeFinanceUi';

const STATUS_STYLE: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  MATCHED: 'bg-green-100 text-green-800',
  VARIANCE: 'bg-orange-100 text-orange-800',
  PENDING_APPROVAL: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-blue-100 text-blue-800',
  SENT_TO_FINANCE: 'bg-teal-100 text-teal-800',
  REJECTED: 'bg-red-100 text-red-800',
};

const MATCH_STYLE: Record<string, string> = {
  PASS: 'bg-green-100 text-green-800',
  FAIL: 'bg-red-100 text-red-800',
  PENDING: 'bg-slate-100 text-slate-600',
};

type LineForm = {
  grnLineId: string;
  itemId: string;
  sku: string;
  itemName: string;
  unit: string;
  grnQty: number;
  poRate: number;
  invoiceQty: number;
  invoiceRate: number;
};

export function VendorBillsView() {
  const [data, setData] = useState<VendorBillManagement | null>(null);
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [matchFilter, setMatchFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<VendorBillDetail | null>(null);
  const [selectedGrnId, setSelectedGrnId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [lines, setLines] = useState<LineForm[]>([]);

  const load = useCallback(async (seed = false) => {
    setLoading(true);
    try {
      const result = await fetchVendorBillManagement(seed, academicYear, {
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        matchStatus: matchFilter !== 'ALL' ? matchFilter : undefined,
        q: search || undefined,
      });
      setData(result);
      if (!selectedGrnId && result.eligibleGrns[0]) {
        setSelectedGrnId(result.eligibleGrns[0].id);
      }
    } finally {
      setLoading(false);
    }
  }, [academicYear, statusFilter, matchFilter, search, selectedGrnId]);

  useEffect(() => { void load(); }, [academicYear]);

  const flash = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(msg);
    setMessageType(type);
    if (type === 'success') void load();
    setTimeout(() => setMessage(''), 6000);
  };

  const selectGrn = (grnId: string) => {
    setSelectedGrnId(grnId);
    const grn = data?.eligibleGrns.find((g) => g.id === grnId);
    if (grn) {
      setLines(grn.lines.map((l) => ({
        grnLineId: l.grnLineId,
        itemId: l.itemId,
        sku: l.sku,
        itemName: l.itemName,
        unit: l.unit,
        grnQty: l.grnQty,
        poRate: l.poRate,
        invoiceQty: l.grnQty,
        invoiceRate: l.defaultInvoiceRate,
      })));
    }
  };

  const openCreate = () => {
    const first = data?.eligibleGrns[0];
    if (first) {
      setSelectedGrnId(first.id);
      selectGrn(first.id);
    }
    setInvoiceNumber('');
    setInvoiceDate(new Date().toISOString().slice(0, 10));
    setFormOpen(true);
  };

  const openDetail = async (id: string) => {
    try {
      const d = await fetchVendorBillDetail(id);
      setDetail(d);
      setDetailOpen(true);
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Load failed', 'error');
    }
  };

  const handleCreate = async () => {
    if (!selectedGrnId || !invoiceNumber.trim()) {
      flash('GRN and invoice number are required', 'error');
      return;
    }
    try {
      const r = await createVendorBill({
        grnId: selectedGrnId,
        invoiceNumber,
        invoiceDate,
        academicYear,
        lines: lines.map((l) => ({
          grnLineId: l.grnLineId,
          itemId: l.itemId,
          invoiceQty: l.invoiceQty,
          invoiceRate: l.invoiceRate,
        })),
      });
      flash(r.message, r.matchStatus === 'PASS' ? 'success' : 'info');
      setFormOpen(false);
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Create failed', 'error');
    }
  };

  const handleMatch = async (id: string) => {
    try {
      const r = await runVendorBillMatch(id);
      flash(r.message, r.matchStatus === 'PASS' ? 'success' : 'info');
      if (detailOpen) setDetail(await fetchVendorBillDetail(id));
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Match failed', 'error');
    }
  };

  const handleApproveVariance = async (id: string) => {
    const notes = prompt('Variance approval notes:');
    if (!notes) return;
    try {
      const r = await approveVendorBillVariance(id, notes);
      flash(r.message, 'success');
      if (detailOpen) setDetail(await fetchVendorBillDetail(id));
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Failed', 'error');
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const r = await approveVendorBill(id);
      flash(r.message, 'success');
      if (detailOpen) setDetail(await fetchVendorBillDetail(id));
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Approve failed', 'error');
    }
  };

  const handleSendFinance = async (id: string) => {
    try {
      const r = await sendVendorBillToFinance(id);
      flash(r.message, 'success');
      if (detailOpen) setDetail(await fetchVendorBillDetail(id));
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Send failed', 'error');
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Rejection reason:');
    if (!reason) return;
    try {
      await rejectVendorBill(id, reason);
      flash('Bill rejected', 'success');
      setDetailOpen(false);
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Reject failed', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete draft bill?')) return;
    try {
      await deleteVendorBill(id);
      flash('Bill deleted', 'success');
      setDetailOpen(false);
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Delete failed', 'error');
    }
  };

  if (loading && !data) return <AcademicLoading />;

  const perms = data?.permissions;

  return (
    <div className="flex flex-col h-full gap-4">
      <FeeMessage message={message} type={messageType} />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Vendor Bills</h2>
          <p className="text-xs text-slate-500">3-way matching — PO vs GRN vs Invoice → Accounts Payable</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className="text-xs border rounded-lg px-2 py-1.5">
            {(data?.academicYears ?? ['2025-26']).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-xs border rounded-lg px-2 py-1.5">
            <option value="ALL">All Status</option>
            {(data?.statusBreakdown ?? []).map((s) => <option key={s.status} value={s.status}>{s.status.replace(/_/g, ' ')}</option>)}
          </select>
          <select value={matchFilter} onChange={(e) => setMatchFilter(e.target.value)} className="text-xs border rounded-lg px-2 py-1.5">
            <option value="ALL">All Match</option>
            {(data?.matchBreakdown ?? []).map((s) => <option key={s.matchStatus} value={s.matchStatus}>{s.matchStatus}</option>)}
          </select>
          <div className="relative">
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search bills..." className="text-xs border rounded-lg pl-7 pr-2 py-1.5 w-32" />
          </div>
          <button type="button" onClick={() => void load()} className="p-2 border rounded-lg"><RefreshCw size={14} /></button>
          {perms?.canCreate && (data?.eligibleGrns.length ?? 0) > 0 && (
            <button type="button" onClick={openCreate} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg flex items-center gap-1">
              <Plus size={12} /> Receive Invoice
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 text-center text-[9px]">
        <div className="bg-white border rounded-xl p-3">
          <p className="text-slate-500">Total Bills</p>
          <p className="font-bold text-xl">{data?.kpis.totalBills}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <p className="text-amber-600">Pending Approval</p>
          <p className="font-bold text-xl text-amber-800">{data?.kpis.pendingApproval}</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
          <p className="text-orange-600">With Variances</p>
          <p className="font-bold text-xl text-orange-800">{data?.kpis.varianceBills}</p>
        </div>
        <div className="bg-teal-50 border border-teal-200 rounded-xl p-3">
          <p className="text-teal-600">Payable (Approved)</p>
          <p className="font-bold text-sm text-teal-800">{data?.kpis.totalPayable}</p>
        </div>
      </div>

      <div className="bg-white border rounded-xl overflow-hidden flex-1">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 text-[10px] uppercase text-slate-500">
                <th className="text-left px-4 py-3">Bill Ref</th>
                <th className="text-left px-4 py-3">Invoice</th>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3">Supplier</th>
                <th className="text-left px-4 py-3">GRN / PO</th>
                <th className="text-right px-4 py-3">Amount</th>
                <th className="text-left px-4 py-3">3-Way Match</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(data?.vendorBills ?? []).map((b) => (
                <tr key={b.id} className="border-t hover:bg-slate-50 cursor-pointer" onClick={() => void openDetail(b.id)}>
                  <td className="px-4 py-3 font-mono font-bold text-blue-700">{b.billRef}</td>
                  <td className="px-4 py-3">{b.invoiceNumber}</td>
                  <td className="px-4 py-3">{b.date}</td>
                  <td className="px-4 py-3">{b.supplier}</td>
                  <td className="px-4 py-3 text-[10px]">
                    <span className="block">{b.grnNumber}</span>
                    <span className="text-slate-400">{b.poNumber}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-bold">{b.amount}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${MATCH_STYLE[b.matchStatus] ?? ''}`}>{b.matchLabel}</span>
                    {b.hasVariance && (
                      <div className="flex gap-1 mt-1">
                        {b.rateFlag && <span className="text-[8px] text-red-600 flex items-center gap-0.5"><AlertTriangle size={8} /> Rate</span>}
                        {b.qtyFlag && <span className="text-[8px] text-red-600 flex items-center gap-0.5"><AlertTriangle size={8} /> Qty</span>}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${STATUS_STYLE[b.status] ?? ''}`}>{b.statusLabel}</span>
                    {b.journalEntryRef !== '—' && <p className="text-[8px] text-teal-600 mt-0.5">{b.journalEntryRef}</p>}
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      {['DRAFT', 'VARIANCE', 'MATCHED'].includes(b.status) && (
                        <button type="button" onClick={() => void handleMatch(b.id)} className="p-1 border rounded" title="Run Match"><GitCompareArrows size={11} /></button>
                      )}
                      {b.status === 'APPROVED' && perms?.canSendToFinance && (
                        <button type="button" onClick={() => void handleSendFinance(b.id)} className="p-1 border rounded text-teal-600" title="Send to Finance"><Send size={11} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {(data?.vendorBills ?? []).length === 0 && (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-400">No vendor bills — receive an invoice against a GRN</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-slate-50 border rounded-lg p-3 text-[9px] text-slate-600">
        <p className="font-bold mb-1 flex items-center gap-1"><Scale size={12} /> Validation Rules</p>
        <p>{(data?.validationRules ?? []).join(' · ')}</p>
        <p className="mt-1 text-slate-500">{(data?.erpIntegration ?? []).join(' · ')}</p>
      </div>

      <AcademicModal open={formOpen} onClose={() => setFormOpen(false)} title="Receive Vendor Invoice" wide>
        <div className="space-y-3 text-sm">
          <div>
            <p className="text-[10px] text-slate-500 mb-1">Map to GRN *</p>
            <select value={selectedGrnId} onChange={(e) => selectGrn(e.target.value)} className="w-full text-xs border rounded px-2 py-1.5">
              {(data?.eligibleGrns ?? []).map((g) => (
                <option key={g.id} value={g.id}>{g.grnNumber} — {g.supplier} ({g.poNumber}) · {g.totalValue}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="Vendor Invoice Number *" className="text-xs border rounded px-2 py-1.5" />
            <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className="text-xs border rounded px-2 py-1.5" />
          </div>

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-[10px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-2 py-1.5">Item</th>
                  <th className="text-right px-2 py-1.5">GRN Qty</th>
                  <th className="text-right px-2 py-1.5">PO Rate</th>
                  <th className="text-right px-2 py-1.5">Inv Qty</th>
                  <th className="text-right px-2 py-1.5">Inv Rate</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l, idx) => {
                  const rateFlag = l.invoiceRate > l.poRate + 0.001;
                  const qtyFlag = l.invoiceQty > l.grnQty + 0.001;
                  return (
                    <tr key={l.grnLineId} className="border-t">
                      <td className="px-2 py-1">{l.itemName}</td>
                      <td className="px-2 py-1 text-right">{l.grnQty}</td>
                      <td className="px-2 py-1 text-right">₹{l.poRate}</td>
                      <td className="px-2 py-1">
                        <input type="number" value={l.invoiceQty} onChange={(e) => setLines((prev) => prev.map((x, i) => i === idx ? { ...x, invoiceQty: Number(e.target.value) } : x))} className={`w-14 text-right border rounded px-1 py-0.5 ${qtyFlag ? 'border-red-400 bg-red-50' : ''}`} />
                      </td>
                      <td className="px-2 py-1">
                        <input type="number" value={l.invoiceRate} onChange={(e) => setLines((prev) => prev.map((x, i) => i === idx ? { ...x, invoiceRate: Number(e.target.value) } : x))} className={`w-16 text-right border rounded px-1 py-0.5 ${rateFlag ? 'border-red-400 bg-red-50' : ''}`} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <button type="button" onClick={() => void handleCreate()} className="w-full bg-blue-600 text-white py-2 rounded-lg text-xs font-bold">
            Record Invoice & Run 3-Way Match
          </button>
        </div>
      </AcademicModal>

      <AcademicModal open={detailOpen} onClose={() => setDetailOpen(false)} title={detail ? `${detail.billRef} — ${detail.invoiceNumber}` : 'Bill Detail'} wide>
        {detail && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-lg">
              <div><span className="text-slate-500">PO</span><p className="font-bold">{detail.threeWayMatch.poNumber}</p></div>
              <div><span className="text-slate-500">GRN</span><p className="font-bold">{detail.threeWayMatch.grnNumber}</p></div>
              <div><span className="text-slate-500">Invoice</span><p className="font-bold">{detail.threeWayMatch.invoiceNumber}</p></div>
            </div>

            <div className="flex items-center gap-2">
              <GitCompareArrows size={14} className="text-slate-400" />
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${MATCH_STYLE[detail.matchStatus] ?? ''}`}>{detail.matchLabel}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${STATUS_STYLE[detail.status] ?? ''}`}>{detail.statusLabel}</span>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-[10px]">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-2 py-1.5">Item</th>
                    <th className="text-right px-2 py-1.5">PO Rate</th>
                    <th className="text-right px-2 py-1.5">GRN Qty</th>
                    <th className="text-right px-2 py-1.5">Inv Rate</th>
                    <th className="text-right px-2 py-1.5">Inv Qty</th>
                    <th className="text-right px-2 py-1.5">Amount</th>
                    <th className="text-center px-2 py-1.5">Flags</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.lines.map((l) => (
                    <tr key={l.id} className={`border-t ${l.hasRateVariance || l.hasQtyVariance ? 'bg-red-50' : ''}`}>
                      <td className="px-2 py-1.5">{l.itemName}</td>
                      <td className="px-2 py-1.5 text-right">₹{l.poRate}</td>
                      <td className="px-2 py-1.5 text-right">{l.grnQty}</td>
                      <td className={`px-2 py-1.5 text-right ${l.hasRateVariance ? 'text-red-600 font-bold' : ''}`}>₹{l.invoiceRate}</td>
                      <td className={`px-2 py-1.5 text-right ${l.hasQtyVariance ? 'text-red-600 font-bold' : ''}`}>{l.invoiceQty}</td>
                      <td className="px-2 py-1.5 text-right font-bold">{l.lineValue}</td>
                      <td className="px-2 py-1.5 text-center">
                        {l.hasRateVariance && <span className="text-[8px] text-red-600">Rate↑</span>}
                        {l.hasQtyVariance && <span className="text-[8px] text-red-600 ml-1">Qty↑</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="p-2 border rounded"><span className="text-slate-500">Subtotal</span><p className="font-bold">{detail.subtotal}</p></div>
              <div className="p-2 border rounded"><span className="text-slate-500">Tax</span><p className="font-bold">{detail.taxAmount}</p></div>
              <div className="p-2 bg-blue-50 border border-blue-200 rounded"><span className="text-blue-600">Total</span><p className="font-bold text-blue-800">{detail.amount}</p></div>
            </div>

            {detail.varianceNotes && (
              <p className="text-[10px] text-orange-700 bg-orange-50 border border-orange-200 rounded p-2">{detail.varianceNotes}</p>
            )}

            {detail.journalEntryRef && detail.journalEntryRef !== '—' && (
              <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg">
                <p className="font-bold text-teal-800 flex items-center gap-1"><FileText size={12} /> Journal Entry: {detail.journalEntryRef}</p>
                <p className="text-[10px] text-teal-700 mt-1">AP Account: {detail.apLedgerAccount} · Sent {detail.sentToFinanceAt}</p>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              {['DRAFT', 'VARIANCE', 'MATCHED'].includes(detail.status) && (
                <button type="button" onClick={() => void handleMatch(detail.id)} className="px-3 py-2 border rounded-lg text-xs flex items-center gap-1">
                  <GitCompareArrows size={12} /> Re-run Match
                </button>
              )}
              {detail.matchStatus === 'FAIL' && !detail.varianceApproved && perms?.canApprove && (
                <button type="button" onClick={() => void handleApproveVariance(detail.id)} className="px-3 py-2 bg-orange-600 text-white rounded-lg text-xs flex items-center gap-1">
                  <AlertTriangle size={12} /> Approve Variance
                </button>
              )}
              {['MATCHED', 'VARIANCE', 'PENDING_APPROVAL'].includes(detail.status) && perms?.canApprove && (
                <button type="button" onClick={() => void handleApprove(detail.id)} className="flex-1 bg-green-600 text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1">
                  <CheckCircle2 size={14} /> Approve Bill
                </button>
              )}
              {detail.status === 'APPROVED' && perms?.canSendToFinance && (
                <button type="button" onClick={() => void handleSendFinance(detail.id)} className="flex-1 bg-teal-600 text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1">
                  <Send size={14} /> Send to Finance (Create AP Journal)
                </button>
              )}
              {detail.status !== 'SENT_TO_FINANCE' && perms?.canApprove && (
                <button type="button" onClick={() => void handleReject(detail.id)} className="px-3 py-2 border border-red-200 text-red-600 rounded-lg text-xs flex items-center gap-1">
                  <XCircle size={12} /> Reject
                </button>
              )}
              {detail.status === 'DRAFT' && perms?.canDelete && (
                <button type="button" onClick={() => void handleDelete(detail.id)} className="text-xs text-red-600 border border-red-200 px-3 py-2 rounded-lg flex items-center gap-1">
                  <Trash2 size={12} /> Delete
                </button>
              )}
            </div>
          </div>
        )}
      </AcademicModal>
    </div>
  );
}
