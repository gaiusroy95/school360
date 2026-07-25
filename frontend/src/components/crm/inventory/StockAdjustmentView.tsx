import { useCallback, useEffect, useState } from 'react';
import {
  Settings2, RefreshCw, Plus, Search, CheckCircle2, XCircle, Send,
  Trash2, Edit3, AlertTriangle, Shield, History, FileText,
} from 'lucide-react';
import {
  fetchStockAdjustmentManagement,
  fetchStockAdjustmentDetail,
  previewAdjustmentNumber,
  createStockAdjustment,
  updateStockAdjustment,
  deleteStockAdjustment,
  submitStockAdjustment,
  approveStockAdjustment,
  rejectStockAdjustment,
  type StockAdjustmentManagement,
  type StockAdjustmentDetail,
} from '../../../lib/inventoryServices';
import { AcademicLoading, AcademicModal, FeeMessage } from '../FeeFinanceManagement/FeeFinanceUi';

const STATUS_STYLE: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  PENDING_APPROVAL: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
};

type LineForm = {
  itemId: string;
  sku: string;
  itemName: string;
  unit: string;
  stockQty: number;
  direction: 'ADD' | 'DEDUCT';
  quantity: number;
  unitCost: number;
  reasonCode: string;
  remarks: string;
};

const emptyHeader = () => ({
  storeId: '',
  adjustmentDate: new Date().toISOString().slice(0, 10),
  reasonCode: 'CORRECTION',
  reason: '',
  remarks: '',
  adjustmentNumber: '',
});

export function StockAdjustmentView() {
  const [data, setData] = useState<StockAdjustmentManagement | null>(null);
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [reasonFilter, setReasonFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [header, setHeader] = useState(emptyHeader());
  const [lines, setLines] = useState<LineForm[]>([]);
  const [detail, setDetail] = useState<StockAdjustmentDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const load = useCallback(async (seed = false) => {
    setLoading(true);
    try {
      const result = await fetchStockAdjustmentManagement(seed, academicYear, {
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        reasonCode: reasonFilter !== 'ALL' ? reasonFilter : undefined,
        q: search || undefined,
      });
      setData(result);
      setHeader((h) => ({ ...h, storeId: h.storeId || result.stores[0]?.id || '' }));
    } finally {
      setLoading(false);
    }
  }, [academicYear, statusFilter, reasonFilter, search]);

  useEffect(() => { void load(); }, [academicYear]);

  const flash = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(msg);
    setMessageType(type);
    if (type === 'success') void load();
    setTimeout(() => setMessage(''), 6000);
  };

  const storeItems = (data?.items ?? []).filter((i) => i.storeId === header.storeId);

  const openCreate = async () => {
    setEditId(null);
    const { adjustmentNumber } = await previewAdjustmentNumber();
    setHeader({ ...emptyHeader(), storeId: data?.stores[0]?.id ?? '', adjustmentNumber });
    setLines([]);
    setFormOpen(true);
  };

  const openEdit = async (id: string) => {
    try {
      const d = await fetchStockAdjustmentDetail(id);
      setEditId(id);
      setHeader({
        storeId: d.storeId,
        adjustmentDate: d.adjustmentDate,
        reasonCode: d.reasonCode,
        reason: d.reason,
        remarks: d.remarks,
        adjustmentNumber: d.adjustmentNumber,
      });
      setLines(d.lines.map((l) => ({
        itemId: l.itemId,
        sku: l.sku,
        itemName: l.itemName,
        unit: l.unit,
        stockQty: l.stockBefore,
        direction: l.direction as 'ADD' | 'DEDUCT',
        quantity: l.quantity,
        unitCost: l.unitCost,
        reasonCode: l.reasonCode,
        remarks: l.remarks,
      })));
      setFormOpen(true);
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Load failed', 'error');
    }
  };

  const openDetail = async (id: string) => {
    try {
      const d = await fetchStockAdjustmentDetail(id);
      setDetail(d);
      setDetailOpen(true);
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Load failed', 'error');
    }
  };

  const addLine = () => {
    const item = storeItems[0];
    if (!item) return;
    setLines((prev) => [...prev, {
      itemId: item.id,
      sku: item.code,
      itemName: item.name,
      unit: item.unit,
      stockQty: item.stockQty,
      direction: 'DEDUCT',
      quantity: 1,
      unitCost: item.unitCost,
      reasonCode: header.reasonCode,
      remarks: '',
    }]);
  };

  const handleSave = async () => {
    if (!header.storeId || !lines.length) {
      flash('Store and at least one line required', 'error');
      return;
    }
    const payload = {
      ...header,
      academicYear,
      createdBy: 'Store Keeper',
      lines: lines.map((l) => ({
        itemId: l.itemId,
        direction: l.direction,
        quantity: l.quantity,
        unitCost: l.unitCost,
        reasonCode: l.reasonCode,
        remarks: l.remarks,
      })),
    };
    try {
      if (editId) {
        await updateStockAdjustment(editId, payload);
        flash('Adjustment updated', 'success');
      } else {
        const r = await createStockAdjustment(payload);
        flash(r.message, 'success');
      }
      setFormOpen(false);
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Save failed', 'error');
    }
  };

  const handleSubmit = async (id: string) => {
    try {
      const r = await submitStockAdjustment(id);
      flash(r.message, 'success');
      if (detailOpen) setDetail(await fetchStockAdjustmentDetail(id));
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Submit failed', 'error');
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm('Approve adjustment? This will update stock and financial ledger (P&L impact).')) return;
    try {
      const r = await approveStockAdjustment(id);
      flash(r.message, 'success');
      if (detailOpen) setDetail(await fetchStockAdjustmentDetail(id));
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Approve failed', 'error');
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Rejection reason:');
    if (!reason) return;
    try {
      await rejectStockAdjustment(id, reason);
      flash('Adjustment rejected', 'success');
      setDetailOpen(false);
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Reject failed', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete draft adjustment?')) return;
    try {
      await deleteStockAdjustment(id);
      flash('Deleted', 'success');
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
          <h2 className="text-xl font-bold text-slate-800">Stock Adjustment</h2>
          <p className="text-xs text-slate-500">Correct discrepancies — damage, expiry, audit variances with manager approval</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className="text-xs border rounded-lg px-2 py-1.5">
            {(data?.academicYears ?? ['2025-26']).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-xs border rounded-lg px-2 py-1.5">
            <option value="ALL">All Status</option>
            {(data?.statusBreakdown ?? []).map((s) => <option key={s.status} value={s.status}>{s.status.replace(/_/g, ' ')}</option>)}
          </select>
          <select value={reasonFilter} onChange={(e) => setReasonFilter(e.target.value)} className="text-xs border rounded-lg px-2 py-1.5">
            <option value="ALL">All Reasons</option>
            {(data?.reasonCodes ?? []).map((r) => <option key={r.code} value={r.code}>{r.label}</option>)}
          </select>
          <div className="relative">
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="text-xs border rounded-lg pl-7 pr-2 py-1.5 w-28" />
          </div>
          <button type="button" onClick={() => void load()} className="p-2 border rounded-lg"><RefreshCw size={14} /></button>
          {perms?.canCreate && (
            <button type="button" onClick={() => void openCreate()} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg flex items-center gap-1">
              <Plus size={12} /> New Adjustment
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 text-center text-[9px]">
        <div className="bg-white border rounded-xl p-3">
          <p className="text-slate-500">Total</p>
          <p className="font-bold text-xl">{data?.kpis.totalAdjustments}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <p className="text-amber-600">This Month</p>
          <p className="font-bold text-xl text-amber-800">{data?.kpis.monthAdjustments}</p>
          <p className="text-[8px] text-amber-600">Feeds dashboard card</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
          <p className="text-orange-600">Pending Approval</p>
          <p className="font-bold text-xl text-orange-800">{data?.kpis.pendingApproval}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-3">
          <p className="text-red-600">P&L Impact (Approved)</p>
          <p className="font-bold text-sm text-red-800">{data?.kpis.totalImpact}</p>
        </div>
      </div>

      <div className="bg-white border rounded-xl overflow-hidden flex-1">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 text-[10px] uppercase text-slate-500">
                <th className="text-left px-4 py-3">Adj #</th>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3">Store</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-left px-4 py-3">Reason</th>
                <th className="text-right px-4 py-3">Qty</th>
                <th className="text-right px-4 py-3">Value</th>
                <th className="text-left px-4 py-3">P&L</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(data?.adjustments ?? []).map((a) => (
                <tr key={a.id} className="border-t hover:bg-slate-50 cursor-pointer" onClick={() => void openDetail(a.id)}>
                  <td className="px-4 py-3 font-mono font-bold text-blue-700">{a.adjustmentNumber}</td>
                  <td className="px-4 py-3">{a.date}</td>
                  <td className="px-4 py-3">{a.store}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${a.type === 'Add' ? 'bg-green-100 text-green-800' : a.type === 'Deduct' ? 'bg-red-100 text-red-800' : 'bg-purple-100 text-purple-800'}`}>
                      {a.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">{a.reasonLabel}</td>
                  <td className="px-4 py-3 text-right">{a.totalQty}</td>
                  <td className="px-4 py-3 text-right font-bold">{a.value}</td>
                  <td className="px-4 py-3 text-[10px]">
                    <span className="text-red-600">{a.financialImpact}</span>
                    <span className="block text-slate-400">{a.pnlLabel}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${STATUS_STYLE[a.status] ?? ''}`}>{a.statusLabel}</span>
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      {a.status === 'DRAFT' && perms?.canEdit && (
                        <button type="button" onClick={() => void openEdit(a.id)} className="p-1 border rounded"><Edit3 size={11} /></button>
                      )}
                      {a.status === 'DRAFT' && perms?.canCreate && (
                        <button type="button" onClick={() => void handleSubmit(a.id)} className="p-1 border rounded text-blue-600"><Send size={11} /></button>
                      )}
                      {a.status === 'PENDING_APPROVAL' && perms?.canApprove && (
                        <button type="button" onClick={() => void handleApprove(a.id)} className="p-1 border rounded text-green-600"><CheckCircle2 size={11} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {(data?.adjustments ?? []).length === 0 && (
                <tr><td colSpan={10} className="px-4 py-12 text-center text-slate-400">No adjustments</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-[9px] text-amber-800 flex items-start gap-2">
        <Shield size={14} className="shrink-0 mt-0.5" />
        <div>
          <p className="font-bold">{data?.auditPolicy}</p>
          <p className="mt-0.5">{(data?.validationRules ?? []).join(' · ')}</p>
        </div>
      </div>

      <AcademicModal open={formOpen} onClose={() => setFormOpen(false)} title={editId ? `Edit ${header.adjustmentNumber}` : `New Adjustment ${header.adjustmentNumber}`} wide>
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <select value={header.storeId} onChange={(e) => setHeader((h) => ({ ...h, storeId: e.target.value }))} className="text-xs border rounded px-2 py-1.5">
              {(data?.stores ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <input type="date" value={header.adjustmentDate} onChange={(e) => setHeader((h) => ({ ...h, adjustmentDate: e.target.value }))} className="text-xs border rounded px-2 py-1.5" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select value={header.reasonCode} onChange={(e) => setHeader((h) => ({ ...h, reasonCode: e.target.value }))} className="text-xs border rounded px-2 py-1.5">
              {(data?.reasonCodes ?? []).map((r) => <option key={r.code} value={r.code}>{r.label}</option>)}
            </select>
            <input value={header.remarks} onChange={(e) => setHeader((h) => ({ ...h, remarks: e.target.value }))} placeholder="Remarks" className="text-xs border rounded px-2 py-1.5" />
          </div>

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-[10px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-2 py-1.5">Type</th>
                  <th className="text-left px-2 py-1.5">Item</th>
                  <th className="text-right px-2 py-1.5">Stock</th>
                  <th className="text-right px-2 py-1.5">Qty</th>
                  <th className="text-left px-2 py-1.5">Reason</th>
                  <th className="text-left px-2 py-1.5">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l, idx) => {
                  const overStock = l.direction === 'DEDUCT' && l.quantity > l.stockQty;
                  return (
                    <tr key={idx} className="border-t">
                      <td className="px-2 py-1">
                        <select value={l.direction} onChange={(e) => setLines((prev) => prev.map((x, i) => i === idx ? { ...x, direction: e.target.value as 'ADD' | 'DEDUCT' } : x))} className="text-[10px] border rounded px-1 py-0.5">
                          <option value="ADD">Add</option>
                          <option value="DEDUCT">Deduct</option>
                        </select>
                      </td>
                      <td className="px-2 py-1">
                        <select
                          value={l.itemId}
                          onChange={(e) => {
                            const item = storeItems.find((i) => i.id === e.target.value);
                            if (!item) return;
                            setLines((prev) => prev.map((x, i) => i === idx ? {
                              ...x, itemId: item.id, sku: item.code, itemName: item.name,
                              unit: item.unit, stockQty: item.stockQty, unitCost: item.unitCost,
                            } : x));
                          }}
                          className="w-full text-[10px] border rounded px-1 py-0.5"
                        >
                          {storeItems.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-1 text-right">{l.stockQty} {l.unit}</td>
                      <td className="px-2 py-1">
                        <input type="number" value={l.quantity} onChange={(e) => setLines((prev) => prev.map((x, i) => i === idx ? { ...x, quantity: Number(e.target.value) } : x))} className={`w-14 text-right border rounded px-1 py-0.5 ${overStock ? 'border-red-400 bg-red-50' : ''}`} />
                      </td>
                      <td className="px-2 py-1">
                        <select value={l.reasonCode} onChange={(e) => setLines((prev) => prev.map((x, i) => i === idx ? { ...x, reasonCode: e.target.value } : x))} className="text-[10px] border rounded px-1 py-0.5">
                          {(data?.reasonCodes ?? []).map((r) => <option key={r.code} value={r.code}>{r.code}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-1">
                        <input value={l.remarks} onChange={(e) => setLines((prev) => prev.map((x, i) => i === idx ? { ...x, remarks: e.target.value } : x))} className="w-full text-[10px] border rounded px-1 py-0.5" placeholder="Line note" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <button type="button" onClick={addLine} className="w-full text-[10px] py-1.5 text-blue-600 border-t">+ Add Line</button>
          </div>

          <button type="button" onClick={() => void handleSave()} className="w-full bg-blue-600 text-white py-2 rounded-lg text-xs font-bold">
            Save Draft
          </button>
        </div>
      </AcademicModal>

      <AcademicModal open={detailOpen} onClose={() => setDetailOpen(false)} title={detail ? `${detail.adjustmentNumber} — ${detail.statusLabel}` : 'Detail'} wide>
        {detail && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-4 gap-2">
              <div className="p-2 bg-slate-50 rounded"><span className="text-slate-500">Store</span><p className="font-bold">{detail.store}</p></div>
              <div className="p-2 bg-slate-50 rounded"><span className="text-slate-500">Reason</span><p className="font-bold">{detail.reasonLabel}</p></div>
              <div className="p-2 bg-red-50 rounded"><span className="text-red-600">P&L Impact</span><p className="font-bold text-red-800">{detail.financialImpact}</p></div>
              <div className="p-2 bg-slate-50 rounded"><span className="text-slate-500">Created By</span><p className="font-bold">{detail.createdBy}</p></div>
            </div>

            {detail.remarks && <p className="text-[10px] text-slate-600 bg-slate-50 p-2 rounded">{detail.remarks}</p>}

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-[10px]">
                <thead className="bg-slate-50"><tr>
                  <th className="text-left px-2 py-1.5">Type</th>
                  <th className="text-left px-2 py-1.5">Item</th>
                  <th className="text-right px-2 py-1.5">Qty</th>
                  <th className="text-right px-2 py-1.5">Rate</th>
                  <th className="text-right px-2 py-1.5">Value</th>
                  <th className="text-left px-2 py-1.5">Reason</th>
                </tr></thead>
                <tbody>
                  {detail.lines.map((l) => (
                    <tr key={l.id} className="border-t">
                      <td className={`px-2 py-1.5 font-bold ${l.direction === 'ADD' ? 'text-green-600' : 'text-red-600'}`}>{l.directionLabel}</td>
                      <td className="px-2 py-1.5">{l.itemName}</td>
                      <td className="px-2 py-1.5 text-right">{l.quantity} {l.unit}</td>
                      <td className="px-2 py-1.5 text-right">₹{l.unitCost}</td>
                      <td className="px-2 py-1.5 text-right font-bold">{l.lineValue}</td>
                      <td className="px-2 py-1.5">{l.reasonLabel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {detail.ledgerEntries.length > 0 && (
              <div>
                <p className="font-bold mb-1 flex items-center gap-1"><FileText size={12} /> Ledger Entries</p>
                {detail.ledgerEntries.map((e) => (
                  <div key={e.id} className="flex justify-between p-2 border rounded mb-1 text-[10px]">
                    <span>{e.item} · {e.type}</span>
                    <span>In: {e.qtyIn} Out: {e.qtyOut} Bal: {e.balance}</span>
                  </div>
                ))}
              </div>
            )}

            <div>
              <p className="font-bold mb-2 flex items-center gap-1"><History size={12} /> Audit Trail</p>
              <div className="space-y-1 max-h-40 overflow-auto">
                {detail.auditTrail.map((log) => (
                  <div key={log.id} className="p-2 bg-slate-50 rounded text-[10px] border-l-2 border-blue-400">
                    <div className="flex justify-between">
                      <span className="font-bold">{log.action}</span>
                      <span className="text-slate-400">{log.at}</span>
                    </div>
                    <p className="text-slate-600">{log.details}</p>
                    <p className="text-slate-400">by {log.performedBy}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {detail.status === 'DRAFT' && perms?.canCreate && (
                <button type="button" onClick={() => void handleSubmit(detail.id)} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1">
                  <Send size={14} /> Submit for Approval
                </button>
              )}
              {detail.status === 'PENDING_APPROVAL' && perms?.canApprove && (
                <>
                  <button type="button" onClick={() => void handleApprove(detail.id)} className="flex-1 bg-green-600 text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1">
                    <CheckCircle2 size={14} /> Approve (Update Stock & Ledger)
                  </button>
                  <button type="button" onClick={() => void handleReject(detail.id)} className="px-4 border border-red-200 text-red-600 py-2 rounded-lg text-xs flex items-center gap-1">
                    <XCircle size={14} /> Reject
                  </button>
                </>
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
