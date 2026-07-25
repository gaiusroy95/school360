import { useCallback, useEffect, useState } from 'react';
import {
  Truck, RefreshCw, Plus, Download, ArrowRight, Package,
  CheckCircle2, Send, Inbox, AlertTriangle, Trash2,
} from 'lucide-react';
import {
  fetchTransferManagement,
  fetchTransferDetail,
  previewTransferNumber,
  createTransfer,
  deleteTransfer,
  dispatchTransfer,
  receiveTransfer,
  exportTransferRegister,
  type TransferManagement,
  type TransferDetail,
} from '../../../lib/inventoryServices';
import { AcademicLoading, AcademicModal, FeeMessage } from '../FeeFinanceManagement/FeeFinanceUi';

const STATUS_STYLE: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  DISPATCHED: 'bg-blue-100 text-blue-800',
  IN_TRANSIT: 'bg-amber-100 text-amber-800',
  RECEIVED: 'bg-green-100 text-green-800',
  DISPUTED: 'bg-red-100 text-red-800',
};

type LineForm = { itemId: string; sku: string; name: string; unit: string; quantity: number; availableQty: number };

export function TransferStockMovementView() {
  const [data, setData] = useState<TransferManagement | null>(null);
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<TransferDetail | null>(null);
  const [fromStoreId, setFromStoreId] = useState('');
  const [toStoreId, setToStoreId] = useState('');
  const [vehicleInfo, setVehicleInfo] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverMobile, setDriverMobile] = useState('');
  const [notes, setNotes] = useState('');
  const [transferNumber, setTransferNumber] = useState('');
  const [lines, setLines] = useState<LineForm[]>([]);
  const [selectedItemId, setSelectedItemId] = useState('');

  const load = useCallback(async (seed = false) => {
    setLoading(true);
    try {
      const result = await fetchTransferManagement(seed, academicYear, {
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });
      setData(result);
      setFromStoreId((f) => f || result.stores[0]?.id || '');
      setToStoreId((t) => t || result.stores[1]?.id || result.stores[0]?.id || '');
    } finally {
      setLoading(false);
    }
  }, [academicYear, statusFilter]);

  useEffect(() => { void load(); }, [academicYear]);

  const flash = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 6000);
  };

  const sourceItems = (data?.catalog ?? []).filter((i) => i.storeId === fromStoreId);

  const openCreate = async () => {
    const { transferNumber: num } = await previewTransferNumber();
    setTransferNumber(num);
    setLines([]);
    setVehicleInfo('');
    setDriverName('');
    setDriverMobile('');
    setNotes('');
    setFormOpen(true);
  };

  const addLine = () => {
    const item = sourceItems.find((i) => i.id === selectedItemId);
    if (!item) return;
    if (lines.some((l) => l.itemId === item.id)) {
      flash('Item already in transfer', 'error');
      return;
    }
    setLines((prev) => [...prev, {
      itemId: item.id,
      sku: item.sku,
      name: item.name,
      unit: item.unit,
      quantity: 1,
      availableQty: item.availableQty,
    }]);
    setSelectedItemId('');
  };

  const handleCreate = async () => {
    if (!fromStoreId || !toStoreId || fromStoreId === toStoreId) {
      flash('Select different source and destination stores', 'error');
      return;
    }
    if (!lines.length) {
      flash('Add at least one item', 'error');
      return;
    }
    try {
      const r = await createTransfer({
        fromStoreId,
        toStoreId,
        vehicleInfo,
        driverName,
        driverMobile,
        notes,
        academicYear,
        lines: lines.map((l) => ({ itemId: l.itemId, quantity: l.quantity })),
      });
      flash(r.message, 'success');
      setFormOpen(false);
      await load();
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Create failed', 'error');
    }
  };

  const handleDispatch = async (id: string, num: string) => {
    if (!confirm(`Dispatch ${num}? Stock will move to In-Transit.`)) return;
    try {
      const r = await dispatchTransfer(id);
      flash(r.message, 'success');
      setDetailOpen(false);
      await load();
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Dispatch failed', 'error');
    }
  };

  const handleReceive = async (id: string, num: string) => {
    if (!confirm(`Receive ${num} at destination store?`)) return;
    try {
      const r = await receiveTransfer(id);
      flash(r.message, r.status === 'DISPUTED' ? 'info' : 'success');
      setDetailOpen(false);
      await load();
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Receive failed', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete draft transfer?')) return;
    try {
      await deleteTransfer(id);
      flash('Deleted', 'success');
      await load();
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Delete failed', 'error');
    }
  };

  const openDetail = async (id: string) => {
    try {
      const d = await fetchTransferDetail(id);
      setDetail(d);
      setDetailOpen(true);
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Load failed', 'error');
    }
  };

  if (loading && !data) return <AcademicLoading />;

  const perms = data?.permissions;

  return (
    <div className="flex flex-col h-full gap-4">
      <FeeMessage message={message} type={messageType} />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Transfer / Stock Movement</h2>
          <p className="text-xs text-slate-500">Inter-store relocation — Draft → Dispatch → In-Transit → Received</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className="text-xs border rounded-lg px-2 py-1.5">
            {(data?.academicYears ?? ['2025-26']).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-xs border rounded-lg px-2 py-1.5">
            <option value="ALL">All Status</option>
            {(data?.statusBreakdown ?? []).map((s) => <option key={s.status} value={s.status}>{s.label}</option>)}
          </select>
          <button type="button" onClick={() => void load()} className="p-2 border rounded-lg"><RefreshCw size={14} /></button>
          <button type="button" onClick={() => void exportTransferRegister(academicYear).then((r) => flash(r.message, 'success'))} className="px-3 py-1.5 text-xs border rounded-lg flex items-center gap-1">
            <Download size={12} /> Export
          </button>
          {perms?.canCreate && (
            <button type="button" onClick={() => void openCreate()} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg flex items-center gap-1">
              <Plus size={12} /> New Transfer
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-center text-[9px]">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 col-span-2 md:col-span-1">
          <p className="text-[9px] text-blue-600">In Transit</p>
          <p className="font-bold text-2xl text-blue-800">{data?.kpis.inTransit.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-slate-50 border rounded-xl p-3 col-span-2 md:col-span-1">
          <p className="text-[9px] text-slate-500">Total Transfers</p>
          <p className="font-bold text-2xl text-slate-800">{data?.kpis.totalTransfers}</p>
        </div>
        {(data?.statusBreakdown ?? []).slice(0, 3).map((s) => (
          <div key={s.status} className={`rounded-lg p-2 border ${STATUS_STYLE[s.status] ?? 'bg-slate-50'}`}>
            <p className="font-bold text-lg">{s.count}</p>
            <span>{s.label}</span>
          </div>
        ))}
      </div>

      <div className="bg-white border rounded-xl shadow-sm overflow-hidden flex-1">
        <div className="p-3 border-b bg-slate-50 flex items-center gap-2">
          <Truck size={16} className="text-blue-600" />
          <h3 className="text-sm font-bold text-slate-800">Transfer Register</h3>
          <span className="text-[10px] text-slate-400 ml-auto">{data?.stateMachine.join(' → ')}</span>
        </div>
        <div className="overflow-auto max-h-[55vh]">
          <table className="w-full text-[10px] text-left">
            <thead className="bg-slate-50 sticky top-0">
              <tr className="text-slate-500 border-b">
                <th className="p-2">TRF #</th>
                <th>Date</th>
                <th>Route</th>
                <th>Vehicle</th>
                <th>Items</th>
                <th>Value</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(data?.transfers ?? []).map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="p-2 font-mono font-bold text-blue-600">{t.transferNumber}</td>
                  <td>{t.date}</td>
                  <td>
                    <span className="flex items-center gap-1 text-[9px]">
                      {t.fromStore} <ArrowRight size={10} /> {t.toStore}
                    </span>
                  </td>
                  <td>{t.vehicleInfo}</td>
                  <td>{t.items}</td>
                  <td>{t.value}</td>
                  <td>
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${STATUS_STYLE[t.status] ?? ''}`}>{t.statusLabel}</span>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      <button type="button" onClick={() => void openDetail(t.id)} className="text-[8px] border px-1 py-0.5 rounded">View</button>
                      {t.status === 'DRAFT' && perms?.canDispatch && (
                        <button type="button" onClick={() => void handleDispatch(t.id, t.transferNumber)} className="text-[8px] bg-amber-600 text-white px-1 py-0.5 rounded flex items-center gap-0.5">
                          <Send size={8} /> Dispatch
                        </button>
                      )}
                      {t.status === 'IN_TRANSIT' && perms?.canReceive && (
                        <button type="button" onClick={() => void handleReceive(t.id, t.transferNumber)} className="text-[8px] bg-green-600 text-white px-1 py-0.5 rounded flex items-center gap-0.5">
                          <Inbox size={8} /> Receive
                        </button>
                      )}
                      {t.status === 'DRAFT' && perms?.canCreate && (
                        <button type="button" onClick={() => void handleDelete(t.id)} className="text-[8px] text-red-600"><Trash2 size={9} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {(data?.transfers ?? []).length === 0 && (
                <tr><td colSpan={8} className="p-12 text-center text-slate-400">No transfers — create a new transfer order</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3 text-[9px] text-slate-600">
        <div className="bg-slate-50 border rounded-lg p-3">
          <p className="font-bold mb-1">Automation</p>
          <ul className="space-y-0.5">{(data?.automationRules ?? []).map((r, i) => <li key={i}>• {r}</li>)}</ul>
        </div>
        <div className="bg-slate-50 border rounded-lg p-3">
          <p className="font-bold mb-1">Validation</p>
          <ul className="space-y-0.5">{(data?.validationRules ?? []).map((r, i) => <li key={i}>• {r}</li>)}</ul>
        </div>
      </div>

      <AcademicModal open={formOpen} onClose={() => setFormOpen(false)} title={`New Transfer ${transferNumber}`} wide>
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-500">Source Store</label>
              <select value={fromStoreId} onChange={(e) => { setFromStoreId(e.target.value); setLines([]); }} className="w-full border rounded px-2 py-1.5 text-xs mt-0.5">
                {(data?.stores ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-500">Destination Store</label>
              <select value={toStoreId} onChange={(e) => setToStoreId(e.target.value)} className="w-full border rounded px-2 py-1.5 text-xs mt-0.5">
                {(data?.stores ?? []).filter((s) => s.id !== fromStoreId).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input value={vehicleInfo} onChange={(e) => setVehicleInfo(e.target.value)} placeholder="Vehicle (e.g. Van KA-01-1234)" className="border rounded px-2 py-1.5 text-xs" />
            <input value={driverName} onChange={(e) => setDriverName(e.target.value)} placeholder="Driver name" className="border rounded px-2 py-1.5 text-xs" />
            <input value={driverMobile} onChange={(e) => setDriverMobile(e.target.value)} placeholder="Driver mobile" className="border rounded px-2 py-1.5 text-xs" />
          </div>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" rows={1} className="w-full border rounded px-2 py-1.5 text-xs" />

          <div className="flex gap-2">
            <select value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)} className="flex-1 border rounded px-2 py-1.5 text-xs">
              <option value="">Select item from source store...</option>
              {sourceItems.map((i) => (
                <option key={i.id} value={i.id}>{i.name} ({i.sku}) — {i.availableQty} {i.unit} avail</option>
              ))}
            </select>
            <button type="button" onClick={addLine} className="px-3 py-1.5 bg-slate-100 border rounded-lg text-xs">Add</button>
          </div>

          <table className="w-full text-[10px] border rounded-lg overflow-hidden">
            <thead className="bg-slate-50"><tr><th className="p-2 text-left">Item</th><th>Available</th><th>Transfer Qty</th><th /></tr></thead>
            <tbody className="divide-y">
              {lines.map((l) => (
                <tr key={l.itemId}>
                  <td className="p-2"><p className="font-bold">{l.name}</p><p className="text-slate-400">{l.sku}</p></td>
                  <td className="text-center">{l.availableQty} {l.unit}</td>
                  <td>
                    <input
                      type="number"
                      min={1}
                      max={l.availableQty}
                      value={l.quantity}
                      onChange={(e) => {
                        const q = Number(e.target.value);
                        setLines((prev) => prev.map((x) => x.itemId === l.itemId ? { ...x, quantity: q } : x));
                      }}
                      className="w-16 border rounded px-1 py-0.5 text-center"
                    />
                  </td>
                  <td>
                    <button type="button" onClick={() => setLines((prev) => prev.filter((x) => x.itemId !== l.itemId))} className="text-red-500 p-1"><Trash2 size={12} /></button>
                  </td>
                </tr>
              ))}
              {lines.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-slate-400">Add items to transfer</td></tr>}
            </tbody>
          </table>

          <button type="button" onClick={() => void handleCreate()} className="w-full bg-blue-600 text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2">
            <Package size={14} /> Save Transfer Order (Draft)
          </button>
        </div>
      </AcademicModal>

      <AcademicModal open={detailOpen} onClose={() => setDetailOpen(false)} title={detail ? `${detail.transferNumber} — ${detail.statusLabel}` : 'Transfer Detail'} wide>
        {detail && (
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-2 text-xs p-3 bg-slate-50 rounded-lg">
              <span className="font-bold">{detail.fromStore}</span>
              <ArrowRight size={14} />
              <span className="font-bold">{detail.toStore}</span>
              <span className={`ml-auto text-[8px] px-2 py-0.5 rounded ${STATUS_STYLE[detail.status] ?? ''}`}>{detail.statusLabel}</span>
            </div>
            {detail.status === 'DISPUTED' && (
              <p className="text-[10px] text-red-600 flex items-center gap-1"><AlertTriangle size={12} /> {detail.disputeReason}</p>
            )}
            <table className="w-full text-[10px] border rounded-lg overflow-hidden">
              <thead className="bg-slate-50"><tr><th className="p-2 text-left">Item</th><th>Qty</th><th>Received</th><th>Pending</th></tr></thead>
              <tbody className="divide-y">
                {detail.lines.map((l) => (
                  <tr key={l.id}>
                    <td className="p-2">{l.itemName} <span className="text-slate-400">({l.sku})</span></td>
                    <td className="text-center">{l.quantity} {l.unit}</td>
                    <td className="text-center">{l.receivedQty}</td>
                    <td className="text-center font-bold">{l.pendingReceive}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {detail.ledger.length > 0 && (
              <div className="text-[10px] text-slate-600">
                <p className="font-bold mb-1">Ledger</p>
                {detail.ledger.map((e, i) => (
                  <p key={i}>{e.date}: {e.type} — out {e.quantityOut} / in {e.quantityIn} → bal {e.balanceQty}</p>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              {detail.status === 'DRAFT' && perms?.canDispatch && (
                <button type="button" onClick={() => void handleDispatch(detail.id, detail.transferNumber)} className="flex-1 bg-amber-600 text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1">
                  <Send size={12} /> Dispatch
                </button>
              )}
              {detail.status === 'IN_TRANSIT' && perms?.canReceive && (
                <button type="button" onClick={() => void handleReceive(detail.id, detail.transferNumber)} className="flex-1 bg-green-600 text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1">
                  <CheckCircle2 size={12} /> Receive at Destination
                </button>
              )}
            </div>
          </div>
        )}
      </AcademicModal>
    </div>
  );
}
