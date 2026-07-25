import { useCallback, useEffect, useState } from 'react';
import {
  PackagePlus, RefreshCw, Search, Plus, Download, Edit3, Trash2,
  CheckCircle2, AlertTriangle, FileText, Printer, ClipboardList,
} from 'lucide-react';
import {
  fetchGrnManagement,
  fetchGrnDetail,
  previewGrnNumber,
  createGrn,
  updateGrn,
  deleteGrn,
  submitGrn,
  approveGrn,
  markGrnBilled,
  exportGrnRegister,
  type GrnManagement,
  type GrnDetail,
} from '../../../lib/inventoryServices';
import { AcademicLoading, AcademicModal, FeeMessage, StatusBadge } from '../FeeFinanceManagement/FeeFinanceUi';

const STATUS_STYLE: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  PENDING_QA: 'bg-amber-100 text-amber-800',
  RECEIVED: 'bg-green-100 text-green-800',
  BILLED: 'bg-indigo-100 text-indigo-800',
};

type LineForm = {
  itemId: string;
  poLineId?: string;
  sku: string;
  itemName: string;
  unit: string;
  itemType: string;
  requiresExpiry: boolean;
  orderedQty: number;
  pendingQty: number;
  receivedQty: number;
  unitCost: number;
  batchNo: string;
  manufacturingDate: string;
  expiryDate: string;
  varianceOverride: boolean;
};

const emptyHeader = () => ({
  storeId: '',
  supplierId: '',
  purchaseOrderId: '',
  grnDate: new Date().toISOString().slice(0, 10),
  challanNumber: '',
  billNumber: '',
  qualityNotes: '',
  grnNumber: '',
});

export function StockInwardGrnView() {
  const [data, setData] = useState<GrnManagement | null>(null);
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [header, setHeader] = useState(emptyHeader());
  const [lines, setLines] = useState<LineForm[]>([]);
  const [detail, setDetail] = useState<GrnDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const load = useCallback(async (seed = false) => {
    setLoading(true);
    try {
      const result = await fetchGrnManagement(seed, academicYear, {
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        q: search || undefined,
      });
      setData(result);
      setHeader((h) => ({
        ...h,
        storeId: h.storeId || result.stores[0]?.id || '',
      }));
    } finally {
      setLoading(false);
    }
  }, [academicYear, statusFilter, search]);

  useEffect(() => { void load(); }, [academicYear]);

  const flash = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 6000);
  };

  const openCreateFromPo = async (po: GrnManagement['pendingPos'][0]) => {
    setEditId(null);
    const { grnNumber } = await previewGrnNumber();
    setHeader({
      storeId: po.storeId,
      supplierId: po.supplierId ?? '',
      purchaseOrderId: po.id,
      grnDate: new Date().toISOString().slice(0, 10),
      challanNumber: '',
      billNumber: '',
      qualityNotes: '',
      grnNumber,
    });
    setLines(po.lines.filter((l) => l.pendingQty > 0).map((l) => ({
      itemId: l.itemId,
      poLineId: l.id,
      sku: l.sku,
      itemName: l.itemName,
      unit: l.unit,
      itemType: l.itemType,
      requiresExpiry: l.itemType === 'CONSUMABLE',
      orderedQty: l.orderedQty,
      pendingQty: l.pendingQty,
      receivedQty: l.pendingQty,
      unitCost: l.unitCost,
      batchNo: '',
      manufacturingDate: '',
      expiryDate: '',
      varianceOverride: false,
    })));
    setFormOpen(true);
  };

  const openEdit = async (id: string) => {
    try {
      const d = await fetchGrnDetail(id);
      setDetail(d);
      setEditId(id);
      setHeader({
        storeId: d.storeId,
        supplierId: d.supplierId ?? '',
        purchaseOrderId: d.purchaseOrderId ?? '',
        grnDate: d.grnDate,
        challanNumber: d.challanNumber,
        billNumber: d.billNumber,
        qualityNotes: d.qualityNotes,
        grnNumber: d.grnNumber,
      });
      setLines(d.lines.map((l) => ({
        itemId: l.itemId,
        poLineId: l.poLineId ?? undefined,
        sku: l.sku,
        itemName: l.itemName,
        unit: l.unit,
        itemType: l.itemType,
        requiresExpiry: l.requiresExpiry,
        orderedQty: l.orderedQty,
        pendingQty: l.pendingQty,
        receivedQty: l.receivedQty,
        unitCost: l.unitCost,
        batchNo: l.batchNo,
        manufacturingDate: l.manufacturingDate,
        expiryDate: l.expiryDate,
        varianceOverride: l.varianceOverride,
      })));
      setFormOpen(true);
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Failed to load GRN', 'error');
    }
  };

  const openView = async (id: string) => {
    try {
      const d = await fetchGrnDetail(id);
      setDetail(d);
      setDetailOpen(true);
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Failed to load GRN', 'error');
    }
  };

  const updateLine = (idx: number, patch: Partial<LineForm>) => {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };

  const handleSave = async () => {
    if (!header.challanNumber.trim()) {
      flash('Challan Number is mandatory', 'error');
      return;
    }
    const payload = {
      ...header,
      academicYear,
      receivedBy: 'Store Keeper',
      lines: lines.map((l) => ({
        itemId: l.itemId,
        poLineId: l.poLineId,
        orderedQty: l.orderedQty,
        pendingQty: l.pendingQty,
        receivedQty: l.receivedQty,
        unitCost: l.unitCost,
        batchNo: l.batchNo,
        manufacturingDate: l.manufacturingDate || undefined,
        expiryDate: l.expiryDate || undefined,
        varianceOverride: l.varianceOverride,
      })),
    };
    try {
      if (editId) {
        await updateGrn(editId, payload);
        flash('GRN updated', 'success');
      } else {
        const r = await createGrn(payload);
        flash(r.message, 'success');
      }
      setFormOpen(false);
      await load();
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Save failed', 'error');
    }
  };

  const handleSubmit = async (id: string) => {
    try {
      const r = await submitGrn(id);
      flash(r.message, r.status === 'PENDING_QA' ? 'info' : 'success');
      setFormOpen(false);
      await load();
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Submit failed', 'error');
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const r = await approveGrn(id);
      flash(r.message, 'success');
      setDetailOpen(false);
      await load();
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Approve failed', 'error');
    }
  };

  const handleBill = async (id: string) => {
    try {
      const r = await markGrnBilled(id);
      flash(r.message, 'success');
      setDetailOpen(false);
      await load();
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Failed', 'error');
    }
  };

  const handleDelete = async (id: string, grnNumber: string) => {
    if (!confirm(`Delete draft ${grnNumber}?`)) return;
    try {
      await deleteGrn(id);
      flash('Draft deleted', 'success');
      await load();
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
          <h2 className="text-xl font-bold text-slate-800">Stock Inward (GRN)</h2>
          <p className="text-xs text-slate-500">Goods receipt — verify against PO, batch tracking, stock ledger & AP</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className="text-xs border rounded-lg px-2 py-1.5">
            {(data?.academicYears ?? ['2025-26']).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-xs border rounded-lg px-2 py-1.5">
            <option value="ALL">All Status</option>
            {(data?.statusBreakdown ?? []).map((s) => <option key={s.status} value={s.status}>{s.label}</option>)}
          </select>
          <div className="relative">
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="GRN, challan, vendor..." className="text-xs border rounded-lg pl-7 pr-2 py-1.5 w-40" />
          </div>
          <button type="button" onClick={() => void load()} className="p-2 border rounded-lg"><RefreshCw size={14} /></button>
          <button type="button" onClick={() => void exportGrnRegister(academicYear).then((r) => flash(r.message, 'success'))} className="px-3 py-1.5 text-xs border rounded-lg flex items-center gap-1">
            <Download size={12} /> Export
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 text-center text-[9px]">
        {(data?.statusBreakdown ?? []).map((s) => (
          <div key={s.status} className={`rounded-lg p-2 border ${STATUS_STYLE[s.status] ?? 'bg-slate-50'}`}>
            <p className="font-bold text-lg">{s.count}</p>
            <span>{s.label}</span>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white border rounded-xl shadow-sm overflow-hidden">
          <div className="p-3 border-b bg-slate-50 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <PackagePlus size={16} className="text-blue-600" /> GRN Register
            </h3>
            <span className="text-[10px] text-slate-500">{data?.stateMachine.join(' → ')}</span>
          </div>
          <div className="overflow-auto max-h-[45vh]">
            <table className="w-full text-[10px] text-left">
              <thead className="bg-slate-50 sticky top-0">
                <tr className="text-slate-500 border-b">
                  <th className="p-2">GRN #</th>
                  <th>Date</th>
                  <th>Vendor</th>
                  <th>Challan</th>
                  <th>PO</th>
                  <th>Items</th>
                  <th>Value</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(data?.grns ?? []).map((g) => (
                  <tr key={g.id} className="hover:bg-slate-50">
                    <td className="p-2 font-mono font-bold text-blue-600">{g.grnNumber}</td>
                    <td>{g.date}</td>
                    <td>{g.supplier}</td>
                    <td>{g.challanNumber || '—'}</td>
                    <td>{g.poNumber}</td>
                    <td>{g.items}</td>
                    <td>{perms?.canViewFinancials ? g.value : '***'}</td>
                    <td>
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${STATUS_STYLE[g.status] ?? ''}`}>{g.statusLabel}</span>
                      {g.hasVariance && !g.varianceApproved && (
                        <AlertTriangle size={10} className="inline ml-1 text-amber-500" />
                      )}
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        <button type="button" onClick={() => void openView(g.id)} className="text-[8px] border px-1 py-0.5 rounded">View</button>
                        {g.status === 'DRAFT' && perms?.canEdit && (
                          <button type="button" onClick={() => void openEdit(g.id)} className="text-[8px] border px-1 py-0.5 rounded"><Edit3 size={9} /></button>
                        )}
                        {g.status === 'DRAFT' && perms?.canSubmit && (
                          <button type="button" onClick={() => void handleSubmit(g.id)} className="text-[8px] bg-green-600 text-white px-1 py-0.5 rounded">Submit</button>
                        )}
                        {g.status === 'PENDING_QA' && perms?.canApprove && (
                          <button type="button" onClick={() => void handleApprove(g.id)} className="text-[8px] bg-amber-600 text-white px-1 py-0.5 rounded">Approve</button>
                        )}
                        {g.status === 'RECEIVED' && perms?.canMarkBilled && (
                          <button type="button" onClick={() => void handleBill(g.id)} className="text-[8px] border px-1 py-0.5 rounded">Bill</button>
                        )}
                        {g.status === 'DRAFT' && perms?.canEdit && (
                          <button type="button" onClick={() => void handleDelete(g.id, g.grnNumber)} className="text-[8px] text-red-600"><Trash2 size={9} /></button>
                        )}
                        {perms?.canPrintBarcode && g.status === 'RECEIVED' && (
                          <button type="button" onClick={() => flash(`Barcode labels queued for ${g.grnNumber}`, 'info')} className="text-[8px] border px-1 py-0.5 rounded flex items-center gap-0.5">
                            <Printer size={8} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {(data?.grns ?? []).length === 0 && (
                  <tr><td colSpan={9} className="p-12 text-center text-slate-400">No GRNs — select a PO below to create</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white border rounded-xl p-4">
          <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
            <ClipboardList size={16} className="text-blue-600" /> Pending POs
          </h3>
          <div className="space-y-2 max-h-[45vh] overflow-y-auto">
            {(data?.pendingPos ?? []).map((po) => (
              <div key={po.id} className="p-3 border rounded-lg hover:border-blue-200">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-bold text-slate-800">{po.poNumber}</p>
                    <p className="text-[10px] text-slate-500">{po.supplier} · {po.poDate}</p>
                    <p className="text-[10px] text-amber-600">{po.pendingQty} units pending</p>
                  </div>
                  <StatusBadge status={po.status} />
                </div>
                {perms?.canCreate && (
                  <button type="button" onClick={() => void openCreateFromPo(po)} className="mt-2 w-full text-[10px] py-1.5 bg-blue-600 text-white rounded-lg flex items-center justify-center gap-1">
                    <Plus size={10} /> Create GRN
                  </button>
                )}
              </div>
            ))}
            {(data?.pendingPos ?? []).length === 0 && (
              <p className="text-xs text-slate-400 text-center py-6">No pending purchase orders</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3 text-[9px] text-slate-600">
        <div className="bg-slate-50 border rounded-lg p-3">
          <p className="font-bold mb-1">Automation</p>
          <ul className="space-y-0.5">{(data?.automationRules ?? []).map((r, i) => <li key={i}>• {r}</li>)}</ul>
        </div>
        <div className="bg-slate-50 border rounded-lg p-3">
          <p className="font-bold mb-1">ERP Integration</p>
          <ul className="space-y-0.5">{(data?.erpIntegration ?? []).map((r, i) => <li key={i}>• {r}</li>)}</ul>
        </div>
      </div>

      <AcademicModal open={formOpen} onClose={() => setFormOpen(false)} title={editId ? `Edit ${header.grnNumber}` : `New GRN ${header.grnNumber}`} wide>
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <input value={header.challanNumber} onChange={(e) => setHeader((h) => ({ ...h, challanNumber: e.target.value }))} placeholder="Challan No *" className="border rounded px-2 py-1.5 text-xs" />
            <input value={header.billNumber} onChange={(e) => setHeader((h) => ({ ...h, billNumber: e.target.value }))} placeholder="Bill No" className="border rounded px-2 py-1.5 text-xs" />
            <input type="date" value={header.grnDate} onChange={(e) => setHeader((h) => ({ ...h, grnDate: e.target.value }))} className="border rounded px-2 py-1.5 text-xs" />
            <select value={header.storeId} onChange={(e) => setHeader((h) => ({ ...h, storeId: e.target.value }))} className="border rounded px-2 py-1.5 text-xs">
              {(data?.stores ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <textarea value={header.qualityNotes} onChange={(e) => setHeader((h) => ({ ...h, qualityNotes: e.target.value }))} placeholder="Quality check notes (optional)" rows={1} className="w-full border rounded px-2 py-1.5 text-xs" />

          <div className="overflow-auto border rounded-lg">
            <table className="w-full text-[10px]">
              <thead className="bg-slate-50">
                <tr className="text-slate-500">
                  <th className="p-2 text-left">Item</th>
                  <th>Ordered</th>
                  <th>Pending</th>
                  <th>Received *</th>
                  <th>Batch</th>
                  <th>Mfg Date</th>
                  <th>Expiry</th>
                  <th>Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {lines.map((line, idx) => {
                  const over = line.receivedQty > line.pendingQty && line.pendingQty > 0;
                  return (
                    <tr key={line.itemId} className={over ? 'bg-amber-50' : ''}>
                      <td className="p-2">
                        <p className="font-bold">{line.itemName}</p>
                        <p className="text-slate-400">{line.sku} · {line.unit}</p>
                        {over && <p className="text-[8px] text-amber-600 flex items-center gap-0.5"><AlertTriangle size={8} /> Over receipt</p>}
                      </td>
                      <td className="text-center">{line.orderedQty}</td>
                      <td className="text-center font-bold">{line.pendingQty}</td>
                      <td>
                        <input type="number" min={0} value={line.receivedQty} onChange={(e) => updateLine(idx, { receivedQty: Number(e.target.value) })} className="w-16 border rounded px-1 py-0.5 text-xs text-center" />
                      </td>
                      <td>
                        <input value={line.batchNo} onChange={(e) => updateLine(idx, { batchNo: e.target.value })} placeholder="Batch" className="w-20 border rounded px-1 py-0.5 text-xs" />
                      </td>
                      <td>
                        <input type="date" value={line.manufacturingDate} onChange={(e) => updateLine(idx, { manufacturingDate: e.target.value })} className="w-28 border rounded px-1 py-0.5 text-xs" />
                      </td>
                      <td>
                        <input type="date" value={line.expiryDate} onChange={(e) => updateLine(idx, { expiryDate: e.target.value })} className={`w-28 border rounded px-1 py-0.5 text-xs ${line.requiresExpiry && !line.expiryDate ? 'border-red-300' : ''}`} />
                      </td>
                      <td>
                        <input type="number" min={0} value={line.unitCost} onChange={(e) => updateLine(idx, { unitCost: Number(e.target.value) })} className="w-16 border rounded px-1 py-0.5 text-xs" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex gap-2">
            <button type="button" onClick={() => void handleSave()} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-xs font-bold">Save Draft</button>
            {editId && (
              <button type="button" onClick={() => void handleSubmit(editId)} className="flex-1 bg-green-600 text-white py-2 rounded-lg text-xs font-bold">Submit GRN</button>
            )}
          </div>
        </div>
      </AcademicModal>

      <AcademicModal open={detailOpen} onClose={() => setDetailOpen(false)} title={detail ? `${detail.grnNumber} — ${detail.statusLabel}` : 'GRN Detail'} wide>
        {detail && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px]">
              <div className="p-2 bg-slate-50 rounded"><span className="text-slate-500">Vendor</span><p className="font-bold">{detail.supplier}</p></div>
              <div className="p-2 bg-slate-50 rounded"><span className="text-slate-500">Challan</span><p className="font-bold">{detail.challanNumber}</p></div>
              <div className="p-2 bg-slate-50 rounded"><span className="text-slate-500">PO</span><p className="font-bold">{detail.poNumber}</p></div>
              <div className="p-2 bg-slate-50 rounded"><span className="text-slate-500">Value</span><p className="font-bold">{detail.value}</p></div>
            </div>

            <table className="w-full text-[10px] border rounded-lg overflow-hidden">
              <thead className="bg-slate-50">
                <tr><th className="p-2 text-left">Item</th><th>Received</th><th>Batch</th><th>Expiry</th></tr>
              </thead>
              <tbody className="divide-y">
                {detail.lines.map((l) => (
                  <tr key={l.id}>
                    <td className="p-2">{l.itemName} <span className="text-slate-400">({l.sku})</span></td>
                    <td className="text-center">{l.receivedQty} {l.unit}</td>
                    <td>{l.batchNo || '—'}</td>
                    <td>{l.expiryDate || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {detail.batches.length > 0 && (
              <div>
                <p className="text-xs font-bold mb-1 flex items-center gap-1"><FileText size={12} /> Batches</p>
                <div className="flex flex-wrap gap-2">
                  {detail.batches.map((b) => (
                    <span key={b.id} className="text-[10px] px-2 py-1 bg-blue-50 rounded border">{b.batchNo}: {b.quantity} (exp {b.expiryDate})</span>
                  ))}
                </div>
              </div>
            )}

            {detail.ledger.length > 0 && (
              <div>
                <p className="text-xs font-bold mb-1">Stock Ledger Entries</p>
                {detail.ledger.map((e, i) => (
                  <p key={i} className="text-[10px] text-slate-600">{e.date}: +{e.quantityIn} @ ₹{e.unitCost} → Bal {e.balanceQty}</p>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              {detail.status === 'PENDING_QA' && perms?.canApprove && (
                <button type="button" onClick={() => void handleApprove(detail.id)} className="flex-1 bg-amber-600 text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1">
                  <CheckCircle2 size={12} /> Approve Variance
                </button>
              )}
              {detail.status === 'RECEIVED' && perms?.canMarkBilled && (
                <button type="button" onClick={() => void handleBill(detail.id)} className="flex-1 border py-2 rounded-lg text-xs font-bold">Mark Billed (AP)</button>
              )}
            </div>
          </div>
        )}
      </AcademicModal>
    </div>
  );
}
