import { useCallback, useEffect, useState } from 'react';
import {
  ShoppingCart, RefreshCw, Plus, Search, Mail, CheckCircle2, XCircle,
  Send, Trash2, Edit3, FileText, ClipboardList, AlertTriangle,
} from 'lucide-react';
import {
  fetchPurchaseOrderManagement,
  fetchPurchaseOrderDetail,
  previewPoNumber,
  createPurchaseOrder,
  createPoFromIndent,
  updatePurchaseOrder,
  deletePurchaseOrder,
  submitPurchaseOrder,
  approvePurchaseOrder,
  rejectPurchaseOrder,
  emailPurchaseOrderToVendor,
  type PurchaseOrderManagement,
  type PurchaseOrderDetail,
} from '../../../lib/inventoryServices';
import { AcademicLoading, AcademicModal, FeeMessage, StatusBadge } from '../FeeFinanceManagement/FeeFinanceUi';

const STATUS_STYLE: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  PENDING_APPROVAL: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-blue-100 text-blue-800',
  ORDERED: 'bg-indigo-100 text-indigo-800',
  PENDING: 'bg-indigo-100 text-indigo-800',
  PARTIAL: 'bg-purple-100 text-purple-800',
  COMPLETED: 'bg-green-100 text-green-800',
  BILLED: 'bg-teal-100 text-teal-800',
  REJECTED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-slate-100 text-slate-500',
};

function ProgressBar({ pct, ordered, received, billed }: { pct: number; ordered: boolean; received: boolean; billed: boolean }) {
  return (
    <div className="space-y-1">
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between text-[8px] text-slate-400">
        <span className={ordered ? 'text-blue-600 font-bold' : ''}>Ordered</span>
        <span className={received ? 'text-purple-600 font-bold' : ''}>Received</span>
        <span className={billed ? 'text-teal-600 font-bold' : ''}>Billed</span>
      </div>
    </div>
  );
}

type LineForm = {
  itemId: string;
  sku: string;
  itemName: string;
  unit: string;
  orderedQty: number;
  unitCost: number;
  taxRate: number;
  discountPct: number;
  indentLineId?: string;
};

const emptyHeader = () => ({
  storeId: '',
  supplierId: '',
  indentId: '',
  budgetCode: '',
  department: '',
  expectedDate: '',
  notes: '',
  poNumber: '',
});

export function PurchaseOrdersView() {
  const [data, setData] = useState<PurchaseOrderManagement | null>(null);
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [formOpen, setFormOpen] = useState(false);
  const [indentOpen, setIndentOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [header, setHeader] = useState(emptyHeader());
  const [lines, setLines] = useState<LineForm[]>([]);
  const [detail, setDetail] = useState<PurchaseOrderDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedIndent, setSelectedIndent] = useState<string>('');
  const [indentSupplier, setIndentSupplier] = useState('');

  const load = useCallback(async (seed = false) => {
    setLoading(true);
    try {
      const result = await fetchPurchaseOrderManagement(seed, academicYear, {
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        q: search || undefined,
      });
      setData(result);
      setHeader((h) => ({
        ...h,
        storeId: h.storeId || result.stores[0]?.id || '',
        budgetCode: h.budgetCode || result.budgets[0]?.code || '',
      }));
    } finally {
      setLoading(false);
    }
  }, [academicYear, statusFilter, search]);

  useEffect(() => { void load(); }, [academicYear]);

  const flash = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(msg);
    setMessageType(type);
    if (type === 'success') void load();
    setTimeout(() => setMessage(''), 6000);
  };

  const calcLineTotal = (l: LineForm) => {
    const gross = l.orderedQty * l.unitCost;
    const disc = gross * (l.discountPct / 100);
    const tax = (gross - disc) * (l.taxRate / 100);
    return gross - disc + tax;
  };

  const formTotal = lines.reduce((s, l) => s + calcLineTotal(l), 0);

  const openCreate = async () => {
    setEditId(null);
    const { poNumber } = await previewPoNumber();
    setHeader({ ...emptyHeader(), storeId: data?.stores[0]?.id ?? '', budgetCode: data?.budgets[0]?.code ?? '', poNumber });
    setLines([]);
    setFormOpen(true);
  };

  const openFromIndent = () => {
    setSelectedIndent(data?.approvedIndents[0]?.id ?? '');
    setIndentSupplier(data?.suppliers[0]?.id ?? '');
    setIndentOpen(true);
  };

  const openEdit = async (id: string) => {
    try {
      const d = await fetchPurchaseOrderDetail(id);
      setDetail(d);
      setEditId(id);
      setHeader({
        storeId: d.storeId,
        supplierId: d.supplierId ?? '',
        indentId: d.indentId ?? '',
        budgetCode: d.budgetCode === '—' ? '' : d.budgetCode,
        department: d.department === '—' ? '' : d.department,
        expectedDate: '',
        notes: d.notes,
        poNumber: d.poNumber,
      });
      setLines(d.lines.map((l) => ({
        itemId: l.itemId,
        sku: l.sku,
        itemName: l.itemName,
        unit: l.unit,
        orderedQty: l.orderedQty,
        unitCost: l.unitCost,
        taxRate: l.taxRate,
        discountPct: l.discountPct,
      })));
      setFormOpen(true);
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Load failed', 'error');
    }
  };

  const openDetail = async (id: string) => {
    try {
      const d = await fetchPurchaseOrderDetail(id);
      setDetail(d);
      setDetailOpen(true);
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Load failed', 'error');
    }
  };

  const addLine = () => {
    const item = data?.items[0];
    if (!item) return;
    setLines((prev) => [...prev, {
      itemId: item.id,
      sku: item.code,
      itemName: item.name,
      unit: item.unit,
      orderedQty: 1,
      unitCost: item.rate,
      taxRate: item.taxRate,
      discountPct: 0,
    }]);
  };

  const handleSave = async () => {
    if (!header.supplierId || !header.storeId || !lines.length) {
      flash('Supplier, store, and at least one line are required', 'error');
      return;
    }
    const payload = {
      ...header,
      academicYear,
      lines: lines.map((l) => ({
        itemId: l.itemId,
        orderedQty: l.orderedQty,
        unitCost: l.unitCost,
        taxRate: l.taxRate,
        discountPct: l.discountPct,
        indentLineId: l.indentLineId,
      })),
    };
    try {
      if (editId) {
        await updatePurchaseOrder(editId, payload);
        flash('PO updated', 'success');
      } else {
        const r = await createPurchaseOrder(payload);
        flash(r.message, 'success');
      }
      setFormOpen(false);
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Save failed', 'error');
    }
  };

  const handleIndentConvert = async () => {
    if (!selectedIndent || !indentSupplier) {
      flash('Select indent and supplier', 'error');
      return;
    }
    try {
      const r = await createPoFromIndent({
        indentId: selectedIndent,
        supplierId: indentSupplier,
        storeId: data?.stores[0]?.id,
        budgetCode: data?.budgets[0]?.code,
        academicYear,
      });
      flash(r.message, 'success');
      setIndentOpen(false);
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Convert failed', 'error');
    }
  };

  const handleSubmit = async (id: string) => {
    try {
      const r = await submitPurchaseOrder(id);
      flash(r.message, 'success');
      if (detailOpen) {
        const d = await fetchPurchaseOrderDetail(id);
        setDetail(d);
      }
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Submit failed', 'error');
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const r = await approvePurchaseOrder(id);
      flash(r.message, 'success');
      if (detailOpen) {
        const d = await fetchPurchaseOrderDetail(id);
        setDetail(d);
      }
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Approve failed', 'error');
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Rejection reason:');
    if (!reason) return;
    try {
      const r = await rejectPurchaseOrder(id, reason);
      flash(r.message, 'success');
      setDetailOpen(false);
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Reject failed', 'error');
    }
  };

  const handleEmail = async (id: string) => {
    try {
      const r = await emailPurchaseOrderToVendor(id);
      flash(r.message, 'success');
      if (detailOpen) {
        const d = await fetchPurchaseOrderDetail(id);
        setDetail(d);
      }
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Email failed', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this draft PO?')) return;
    try {
      await deletePurchaseOrder(id);
      flash('PO deleted', 'success');
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
          <h2 className="text-xl font-bold text-slate-800">Purchase Orders</h2>
          <p className="text-xs text-slate-500">Procurement — budget encumbrance, approval routing, vendor POs</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className="text-xs border rounded-lg px-2 py-1.5">
            {(data?.academicYears ?? ['2025-26']).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-xs border rounded-lg px-2 py-1.5">
            <option value="ALL">All Status</option>
            {(data?.statusBreakdown ?? []).map((s) => <option key={s.status} value={s.status}>{s.status.replace(/_/g, ' ')} ({s.count})</option>)}
          </select>
          <div className="relative">
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search PO..." className="text-xs border rounded-lg pl-7 pr-2 py-1.5 w-32" />
          </div>
          <button type="button" onClick={() => void load()} className="p-2 border rounded-lg"><RefreshCw size={14} /></button>
          {perms?.canCreate && (
            <>
              <button type="button" onClick={openFromIndent} className="px-3 py-1.5 text-xs border rounded-lg flex items-center gap-1">
                <ClipboardList size={12} /> From Indent
              </button>
              <button type="button" onClick={() => void openCreate()} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg flex items-center gap-1">
                <Plus size={12} /> New PO
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 text-center text-[9px]">
        <div className="bg-white border rounded-xl p-3">
          <p className="text-slate-500">Total POs</p>
          <p className="font-bold text-xl">{data?.kpis.totalOrders}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-3">
          <p className="text-red-600">Pending Orders</p>
          <p className="font-bold text-xl text-red-800">{data?.kpis.pendingOrders}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <p className="text-amber-600">Awaiting Approval</p>
          <p className="font-bold text-xl text-amber-800">{data?.kpis.pendingApproval}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
          <p className="text-blue-600">Total Value</p>
          <p className="font-bold text-sm text-blue-800">{data?.kpis.totalValue}</p>
        </div>
      </div>

      <div className="bg-white border rounded-xl overflow-hidden flex-1">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 text-[10px] uppercase text-slate-500">
                <th className="text-left px-4 py-3">PO Number</th>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3">Supplier</th>
                <th className="text-left px-4 py-3">Department</th>
                <th className="text-right px-4 py-3">Value</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3 min-w-[140px]">Progress</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(data?.purchaseOrders ?? []).map((po) => (
                <tr key={po.id} className="border-t hover:bg-slate-50 cursor-pointer" onClick={() => void openDetail(po.id)}>
                  <td className="px-4 py-3 font-mono font-bold text-blue-700">{po.poNumber}</td>
                  <td className="px-4 py-3">{po.date}</td>
                  <td className="px-4 py-3">{po.supplier}</td>
                  <td className="px-4 py-3">{po.department}</td>
                  <td className="px-4 py-3 text-right font-bold">{po.value}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${STATUS_STYLE[po.status] ?? 'bg-slate-100'}`}>
                      {po.statusLabel}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <ProgressBar pct={po.progressPct} ordered={po.ordered} received={po.received} billed={po.billed} />
                    <p className="text-[8px] text-slate-400 mt-0.5">{po.progressLabel}</p>
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      {po.status === 'DRAFT' && perms?.canEdit && (
                        <button type="button" onClick={() => void openEdit(po.id)} className="p-1 border rounded" title="Edit"><Edit3 size={11} /></button>
                      )}
                      {po.status === 'DRAFT' && perms?.canCreate && (
                        <button type="button" onClick={() => void handleSubmit(po.id)} className="p-1 border rounded text-blue-600" title="Submit"><Send size={11} /></button>
                      )}
                      {po.status === 'PENDING_APPROVAL' && perms?.canApprove && (
                        <button type="button" onClick={() => void handleApprove(po.id)} className="p-1 border rounded text-green-600" title="Approve"><CheckCircle2 size={11} /></button>
                      )}
                      {['APPROVED', 'ORDERED'].includes(po.status) && perms?.canEmail && !po.emailed && (
                        <button type="button" onClick={() => void handleEmail(po.id)} className="p-1 border rounded text-indigo-600" title="Email Vendor"><Mail size={11} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {(data?.purchaseOrders ?? []).length === 0 && (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">No purchase orders</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-[9px] text-amber-800 flex items-start gap-2">
        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
        <div>
          <p className="font-bold">Automation: PO routing based on value</p>
          <p>Below {data?.autoApproveLimitLabel} → auto-approved. Above → Principal/Finance Head approval required. Budget encumbrance blocked on submit.</p>
        </div>
      </div>

      <div className="bg-slate-50 border rounded-lg p-3 text-[9px] text-slate-600">
        <p className="font-bold mb-1">Workflow</p>
        <p>{(data?.workflow ?? []).join(' → ')}</p>
      </div>

      <AcademicModal open={indentOpen} onClose={() => setIndentOpen(false)} title="Convert Approved Indent to PO">
        <div className="space-y-3 text-sm">
          <div>
            <p className="text-[10px] text-slate-500 mb-1">Approved Indent</p>
            <select value={selectedIndent} onChange={(e) => setSelectedIndent(e.target.value)} className="w-full text-xs border rounded px-2 py-1.5">
              {(data?.approvedIndents ?? []).map((ind) => (
                <option key={ind.id} value={ind.id}>{ind.indentNumber} — {ind.department} ({ind.lines.length} items)</option>
              ))}
            </select>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 mb-1">Select Supplier</p>
            <select value={indentSupplier} onChange={(e) => setIndentSupplier(e.target.value)} className="w-full text-xs border rounded px-2 py-1.5">
              {(data?.suppliers ?? []).map((s) => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
            </select>
          </div>
          {selectedIndent && (
            <div className="bg-slate-50 rounded p-2 text-[10px]">
              {(data?.approvedIndents.find((i) => i.id === selectedIndent)?.lines ?? []).map((l) => (
                <div key={l.id} className="flex justify-between py-0.5">
                  <span>{l.itemName}</span>
                  <span>{l.remainingQty} {l.unit} @ ₹{l.unitEstimate}</span>
                </div>
              ))}
            </div>
          )}
          <button type="button" onClick={() => void handleIndentConvert()} className="w-full bg-blue-600 text-white py-2 rounded-lg text-xs font-bold">
            Generate PO Draft
          </button>
        </div>
      </AcademicModal>

      <AcademicModal open={formOpen} onClose={() => setFormOpen(false)} title={editId ? `Edit ${header.poNumber}` : `New PO ${header.poNumber}`} wide>
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <select value={header.supplierId} onChange={(e) => setHeader((h) => ({ ...h, supplierId: e.target.value }))} className="text-xs border rounded px-2 py-1.5">
              <option value="">Select Supplier *</option>
              {(data?.suppliers ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select value={header.storeId} onChange={(e) => setHeader((h) => ({ ...h, storeId: e.target.value }))} className="text-xs border rounded px-2 py-1.5">
              {(data?.stores ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input value={header.department} onChange={(e) => setHeader((h) => ({ ...h, department: e.target.value }))} placeholder="Department" className="text-xs border rounded px-2 py-1.5" />
            <select value={header.budgetCode} onChange={(e) => setHeader((h) => ({ ...h, budgetCode: e.target.value }))} className="text-xs border rounded px-2 py-1.5">
              <option value="">Budget Code</option>
              {(data?.budgets ?? []).map((b) => <option key={b.code} value={b.code}>{b.code} — {b.name}</option>)}
            </select>
          </div>
          <input value={header.expectedDate} onChange={(e) => setHeader((h) => ({ ...h, expectedDate: e.target.value }))} type="date" className="w-full text-xs border rounded px-2 py-1.5" />

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-[10px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-2 py-1.5">Item</th>
                  <th className="text-right px-2 py-1.5">Qty</th>
                  <th className="text-right px-2 py-1.5">Rate</th>
                  <th className="text-right px-2 py-1.5">Tax%</th>
                  <th className="text-right px-2 py-1.5">Disc%</th>
                  <th className="text-right px-2 py-1.5">Amount</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="px-2 py-1">
                      <select
                        value={l.itemId}
                        onChange={(e) => {
                          const item = data?.items.find((i) => i.id === e.target.value);
                          if (!item) return;
                          setLines((prev) => prev.map((x, i) => i === idx ? {
                            ...x, itemId: item.id, sku: item.code, itemName: item.name,
                            unit: item.unit, unitCost: item.rate, taxRate: item.taxRate,
                          } : x));
                        }}
                        className="w-full text-[10px] border rounded px-1 py-0.5"
                      >
                        {(data?.items ?? []).map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1">
                      <input type="number" value={l.orderedQty} onChange={(e) => setLines((prev) => prev.map((x, i) => i === idx ? { ...x, orderedQty: Number(e.target.value) } : x))} className="w-14 text-right text-[10px] border rounded px-1 py-0.5" />
                    </td>
                    <td className="px-2 py-1">
                      <input type="number" value={l.unitCost} onChange={(e) => setLines((prev) => prev.map((x, i) => i === idx ? { ...x, unitCost: Number(e.target.value) } : x))} className="w-16 text-right text-[10px] border rounded px-1 py-0.5" />
                    </td>
                    <td className="px-2 py-1">
                      <input type="number" value={l.taxRate} onChange={(e) => setLines((prev) => prev.map((x, i) => i === idx ? { ...x, taxRate: Number(e.target.value) } : x))} className="w-12 text-right text-[10px] border rounded px-1 py-0.5" />
                    </td>
                    <td className="px-2 py-1">
                      <input type="number" value={l.discountPct} onChange={(e) => setLines((prev) => prev.map((x, i) => i === idx ? { ...x, discountPct: Number(e.target.value) } : x))} className="w-12 text-right text-[10px] border rounded px-1 py-0.5" />
                    </td>
                    <td className="px-2 py-1 text-right font-bold">₹{Math.round(calcLineTotal(l)).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button type="button" onClick={addLine} className="w-full text-[10px] py-1.5 text-blue-600 border-t">+ Add Line</button>
          </div>

          <div className="flex justify-between items-center bg-slate-50 rounded p-2 text-xs">
            <span className="text-slate-500">Total Amount (auto-calculated)</span>
            <span className="font-bold text-lg">₹ {Math.round(formTotal).toLocaleString('en-IN')}</span>
          </div>
          {formTotal >= (data?.autoApproveLimit ?? 1000) && (
            <p className="text-[10px] text-amber-600 flex items-center gap-1"><AlertTriangle size={12} /> Requires Principal/Finance Head approval</p>
          )}

          <button type="button" onClick={() => void handleSave()} className="w-full bg-blue-600 text-white py-2 rounded-lg text-xs font-bold">
            {editId ? 'Update PO Draft' : 'Save PO Draft'}
          </button>
        </div>
      </AcademicModal>

      <AcademicModal open={detailOpen} onClose={() => setDetailOpen(false)} title={detail ? `${detail.poNumber} — ${detail.statusLabel}` : 'PO Detail'} wide>
        {detail && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2 bg-slate-50 rounded"><span className="text-slate-500">Supplier</span><p className="font-bold">{detail.supplier}</p></div>
              <div className="p-2 bg-slate-50 rounded"><span className="text-slate-500">Department</span><p className="font-bold">{detail.department}</p></div>
              <div className="p-2 bg-slate-50 rounded"><span className="text-slate-500">Budget</span><p className="font-bold">{detail.budgetCode}</p></div>
            </div>

            <ProgressBar pct={detail.progressPct} ordered={detail.ordered} received={detail.received} billed={detail.billed} />

            <div className="grid grid-cols-4 gap-2 text-[10px]">
              <div className="p-2 border rounded"><span className="text-slate-500">Subtotal</span><p className="font-bold">{detail.subtotal}</p></div>
              <div className="p-2 border rounded"><span className="text-slate-500">Tax</span><p className="font-bold">{detail.taxAmount}</p></div>
              <div className="p-2 border rounded"><span className="text-slate-500">Discount</span><p className="font-bold">{detail.discountAmount}</p></div>
              <div className="p-2 bg-blue-50 border border-blue-200 rounded"><span className="text-blue-600">Total</span><p className="font-bold text-blue-800">{detail.value}</p></div>
            </div>

            {detail.encumbranceAmount !== '₹ 0' && (
              <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                Encumbrance blocked: {detail.encumbranceAmount}
              </p>
            )}

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-[10px]">
                <thead className="bg-slate-50"><tr>
                  <th className="text-left px-2 py-1.5">Item</th>
                  <th className="text-right px-2 py-1.5">Ordered</th>
                  <th className="text-right px-2 py-1.5">Received</th>
                  <th className="text-right px-2 py-1.5">Rate</th>
                  <th className="text-right px-2 py-1.5">Amount</th>
                </tr></thead>
                <tbody>
                  {detail.lines.map((l) => (
                    <tr key={l.id} className="border-t">
                      <td className="px-2 py-1.5">{l.itemName}</td>
                      <td className="px-2 py-1.5 text-right">{l.orderedQty} {l.unit}</td>
                      <td className="px-2 py-1.5 text-right">{l.receivedQty}</td>
                      <td className="px-2 py-1.5 text-right">₹{l.unitCost}</td>
                      <td className="px-2 py-1.5 text-right font-bold">{l.lineValueFmt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {detail.grns.length > 0 && (
              <div>
                <p className="font-bold mb-1 flex items-center gap-1"><FileText size={12} /> Linked GRNs</p>
                {detail.grns.map((g) => (
                  <div key={g.id} className="flex justify-between p-2 border rounded mb-1">
                    <span>{g.grnNumber} · {g.date}</span>
                    <StatusBadge status={g.status} /><span>{g.value}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              {detail.status === 'DRAFT' && perms?.canCreate && (
                <button type="button" onClick={() => void handleSubmit(detail.id)} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1">
                  <Send size={14} /> Submit for Approval
                </button>
              )}
              {detail.status === 'PENDING_APPROVAL' && perms?.canApprove && (
                <>
                  <button type="button" onClick={() => void handleApprove(detail.id)} className="flex-1 bg-green-600 text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1">
                    <CheckCircle2 size={14} /> Approve PO
                  </button>
                  <button type="button" onClick={() => void handleReject(detail.id)} className="px-4 border border-red-200 text-red-600 py-2 rounded-lg text-xs flex items-center gap-1">
                    <XCircle size={14} /> Reject
                  </button>
                </>
              )}
              {['APPROVED', 'ORDERED'].includes(detail.status) && perms?.canEmail && (
                <button type="button" onClick={() => void handleEmail(detail.id)} className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1">
                  <Mail size={14} /> Email to Vendor
                </button>
              )}
              {detail.status === 'DRAFT' && perms?.canDelete && (
                <button type="button" onClick={() => void handleDelete(detail.id)} className="text-xs text-red-600 border border-red-200 px-3 py-2 rounded-lg flex items-center gap-1">
                  <Trash2 size={12} /> Delete
                </button>
              )}
            </div>
            {detail.emailedTo && detail.emailedTo !== '—' && (
              <p className="text-[10px] text-green-600">Emailed to {detail.emailedTo} on {detail.emailedAt}</p>
            )}
          </div>
        )}
      </AcademicModal>
    </div>
  );
}
