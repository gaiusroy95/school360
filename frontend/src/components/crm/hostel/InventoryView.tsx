import { useCallback, useEffect, useState } from 'react';
import {
  Package, RefreshCw, Download, AlertTriangle, BedDouble,
  Boxes, Mail, ArrowDownToLine, Link2, Unlink,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import {
  fetchInventoryManagement,
  stockInHostelInventory,
  assignHostelAssetToBed,
  releaseHostelAssetMapping,
  acknowledgeHostelProcurementAlert,
  exportHostelInventory,
  type InventoryManagement,
} from '../../../lib/hostelServices';
import { AcademicLoading, AcademicModal, FeeMessage } from '../FeeFinanceManagement/FeeFinanceUi';

type Tab = 'consumables' | 'assets' | 'mappings' | 'alerts';

export function InventoryView() {
  const [data, setData] = useState<InventoryManagement | null>(null);
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [tab, setTab] = useState<Tab>('consumables');
  const [subFilter, setSubFilter] = useState('ALL');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [stockModal, setStockModal] = useState<{ itemId: string; itemName: string } | null>(null);
  const [stockQty, setStockQty] = useState(10);
  const [assignModal, setAssignModal] = useState<{ assetId: string; assetTag: string } | null>(null);
  const [selectedBedId, setSelectedBedId] = useState('');

  const load = useCallback(async (seed = false) => {
    setLoading(true);
    try {
      const itemType = tab === 'consumables' ? 'CONSUMABLE' : undefined;
      const sub = tab === 'consumables' ? subFilter : undefined;
      setData(await fetchInventoryManagement(seed, academicYear, itemType, sub));
    } finally {
      setLoading(false);
    }
  }, [academicYear, tab, subFilter]);

  useEffect(() => { void load(true); }, [load]);

  const flash = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 6000);
  };

  const handleStockIn = async () => {
    if (!stockModal) return;
    try {
      const r = await stockInHostelInventory(stockModal.itemId, stockQty);
      flash(r.message, 'success');
      setStockModal(null);
      await load();
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Failed', 'error');
    }
  };

  const handleAssign = async () => {
    if (!assignModal || !selectedBedId) return;
    const bed = data?.availableBeds.find((b) => b.bedId === selectedBedId);
    try {
      const r = await assignHostelAssetToBed(assignModal.assetId, selectedBedId, bed?.studentName, bed?.studentId);
      flash(r.message, 'success');
      setAssignModal(null);
      setSelectedBedId('');
      await load();
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Failed', 'error');
    }
  };

  if (loading && !data) return <AcademicLoading />;

  const kpis = data?.kpis;

  return (
    <div className="flex flex-col h-full gap-4">
      <FeeMessage message={message} type={messageType} />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Inventory</h2>
          <p className="text-xs text-slate-500">Assets & consumables · Bed asset mapping · Procurement low-stock alerts</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className="text-xs border rounded-lg px-2 py-1.5">
            <option value="2025-26">2025-26</option>
          </select>
          <button type="button" onClick={() => void load()} className="p-2 border rounded-lg"><RefreshCw size={14} /></button>
          <button type="button" onClick={() => void exportHostelInventory(academicYear).then((r) => flash(r.message, 'success'))} className="px-3 py-1.5 text-xs border rounded-lg flex items-center gap-1">
            <Download size={12} /> Export
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-center text-[9px]">
        <div className="bg-slate-50 rounded-lg p-2 border"><p className="font-bold text-lg text-slate-700">{kpis?.totalItems ?? 0}</p>Items</div>
        <div className="bg-blue-50 rounded-lg p-2 border border-blue-100"><p className="font-bold text-lg text-blue-700">{kpis?.consumables ?? 0}</p>Consumables</div>
        <div className="bg-red-50 rounded-lg p-2 border border-red-100"><p className="font-bold text-lg text-red-700">{kpis?.lowStock ?? 0}</p>Low Stock</div>
        <div className="bg-purple-50 rounded-lg p-2 border border-purple-100"><p className="font-bold text-lg text-purple-700">{kpis?.assetTotal ?? 0}</p>Assets</div>
        <div className="bg-teal-50 rounded-lg p-2 border border-teal-100"><p className="font-bold text-lg text-teal-700">{kpis?.assetAllotted ?? 0}</p>Allotted</div>
        <div className="bg-green-50 rounded-lg p-2 border border-green-100"><p className="font-bold text-lg text-green-700">{kpis?.assetAvailable ?? 0}</p>Available</div>
        <div className="bg-amber-50 rounded-lg p-2 border border-amber-100"><p className="font-bold text-lg text-amber-700">{kpis?.mappings ?? 0}</p>Bed Maps</div>
      </div>

      {(data?.procurementAlerts?.length ?? 0) > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
          <Mail size={16} className="text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-[10px] text-red-800">
            <p className="font-bold mb-1">Procurement Alerts Sent</p>
            {data?.procurementAlerts.slice(0, 3).map((a) => (
              <p key={a.id}>{a.message}</p>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-1 border-b text-[10px]">
        {(['consumables', 'assets', 'mappings', 'alerts'] as Tab[]).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={`px-3 py-1.5 capitalize font-medium border-b-2 -mb-px ${tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0">
        <div className="lg:col-span-3 bg-white border rounded-xl p-4 shadow-sm">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Inventory Mix</h3>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.categoryChart ?? []} layout="vertical" margin={{ left: 0, right: 8 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={72} tick={{ fontSize: 9 }} />
                <Tooltip contentStyle={{ fontSize: 10 }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {(data?.categoryChart ?? []).map((e, i) => <Cell key={i} fill={e.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-3 space-y-1 text-[9px] text-slate-600">
            {(data?.automationRules ?? []).map((r, i) => (
              <li key={i} className="flex items-start gap-1"><Package size={9} className="shrink-0 mt-0.5" />{r}</li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-9 bg-white border rounded-xl shadow-sm overflow-hidden">
          {tab === 'consumables' && (
            <>
              <div className="p-2 border-b flex gap-2">
                <select value={subFilter} onChange={(e) => setSubFilter(e.target.value)} className="text-[10px] border rounded px-2 py-1">
                  <option value="ALL">All</option>
                  {(data?.consumableSubCategories ?? []).map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div className="overflow-auto max-h-[50vh]">
                <table className="w-full text-[10px] text-left">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr className="text-slate-500 border-b">
                      <th className="p-2">Item</th><th>Category</th><th>Stock</th><th>Reorder</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(data?.items ?? []).map((i) => (
                      <tr key={i.id} className={i.lowStock ? 'bg-red-50/40' : 'hover:bg-slate-50'}>
                        <td className="p-2">
                          <p className="font-bold">{i.itemName}</p>
                          <p className="font-mono text-[8px] text-slate-400">{i.itemCode}</p>
                        </td>
                        <td>{i.subCategory}</td>
                        <td className={i.lowStock ? 'text-red-600 font-bold' : ''}>
                          {i.stockQty} {i.unit}
                          {i.lowStock && <AlertTriangle size={10} className="inline ml-1" />}
                        </td>
                        <td>{i.reorderLevel} {i.unit}</td>
                        <td>
                          <button type="button" onClick={() => { setStockModal({ itemId: i.id, itemName: i.itemName }); setStockQty(10); }} className="text-[8px] bg-blue-600 text-white px-2 py-0.5 rounded flex items-center gap-0.5">
                            <ArrowDownToLine size={9} /> Stock In
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {tab === 'assets' && (
            <div className="overflow-auto max-h-[50vh]">
              <table className="w-full text-[10px] text-left">
                <thead className="bg-slate-50 sticky top-0">
                  <tr className="text-slate-500 border-b">
                    <th className="p-2">Asset Tag</th><th>Type</th><th>Condition</th><th>Mapped To</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(data?.assets ?? []).map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="p-2">
                        <p className="font-mono font-bold">{a.assetTag}</p>
                        <p className="text-slate-500">{a.assetName}</p>
                      </td>
                      <td>{a.assetType}</td>
                      <td><span className={a.condition === 'FAIR' ? 'text-amber-600' : 'text-green-600'}>{a.condition}</span></td>
                      <td>
                        {a.isAllotted ? (
                          <span className="text-teal-700"><BedDouble size={9} className="inline" /> {a.mappedToBed}<br /><span className="text-[8px]">{a.mappedStudent}</span></span>
                        ) : (
                          <span className="text-green-600">Available</span>
                        )}
                      </td>
                      <td>
                        {!a.isAllotted && (
                          <button type="button" onClick={() => { setAssignModal({ assetId: a.id, assetTag: a.assetTag }); setSelectedBedId(''); }} className="text-[8px] border border-teal-400 text-teal-700 px-2 py-0.5 rounded flex items-center gap-0.5">
                            <Link2 size={9} /> Map to Bed
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'mappings' && (
            <div className="overflow-auto max-h-[50vh]">
              <table className="w-full text-[10px] text-left">
                <thead className="bg-slate-50 sticky top-0">
                  <tr className="text-slate-500 border-b">
                    <th className="p-2">Asset</th><th>Student</th><th>Bed / Room</th><th>Since</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(data?.bedMappings ?? []).map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="p-2">
                        <p className="font-mono font-bold">{m.assetTag}</p>
                        <p className="text-slate-500">{m.assetType} · {m.assetName}</p>
                      </td>
                      <td>{m.studentName || '—'}</td>
                      <td>{m.roomLabel} / Bed {m.bedLabel}</td>
                      <td>{m.allottedAt}</td>
                      <td>
                        <button type="button" onClick={() => void releaseHostelAssetMapping(m.id).then((r) => { flash(r.message, 'success'); void load(); })} className="text-[8px] border border-red-300 text-red-700 px-2 py-0.5 rounded flex items-center gap-0.5">
                          <Unlink size={9} /> Release
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'alerts' && (
            <div className="p-4 space-y-3 max-h-[50vh] overflow-auto">
              {(data?.procurementAlerts ?? []).length === 0 && (
                <p className="text-center text-slate-400 py-8 text-xs">No procurement alerts</p>
              )}
              {(data?.procurementAlerts ?? []).map((a) => (
                <div key={a.id} className={`p-3 rounded-lg border text-[10px] ${a.acknowledged ? 'bg-slate-50 border-slate-200' : 'bg-red-50 border-red-200'}`}>
                  <p className="font-bold flex items-center gap-1"><Mail size={11} /> {a.itemName}</p>
                  <p className="text-slate-600 mt-1">{a.message}</p>
                  <p className="text-[8px] text-slate-400 mt-1">{a.sentAt} · {a.sentToProcurement ? 'Sent to Procurement' : 'Pending'}</p>
                  {!a.acknowledged && (
                    <button type="button" onClick={() => void acknowledgeHostelProcurementAlert(a.id).then((r) => { flash(r.message, 'success'); void load(); })} className="mt-2 text-[8px] bg-white border px-2 py-0.5 rounded">
                      Acknowledge
                    </button>
                  )}
                </div>
              ))}
              <h4 className="text-[10px] font-bold text-slate-700 mt-4 flex items-center gap-1"><Boxes size={11} /> Recent Transactions</h4>
              {(data?.recentTransactions ?? []).map((t) => (
                <div key={t.id} className="text-[9px] flex justify-between py-1 border-b border-slate-100">
                  <span>{t.itemName} — {t.type} ({t.quantity > 0 ? '+' : ''}{t.quantity})</span>
                  <span className="text-slate-400">{t.at}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AcademicModal open={!!stockModal} onClose={() => setStockModal(null)} title={`Stock In — ${stockModal?.itemName}`}>
        <div className="space-y-3 text-sm">
          <input type="number" min={1} value={stockQty} onChange={(e) => setStockQty(Number(e.target.value))} className="w-full border rounded px-3 py-2 text-xs" />
          <button type="button" onClick={() => void handleStockIn()} className="w-full bg-blue-600 text-white font-bold py-2 rounded-lg text-xs">Confirm Stock In</button>
        </div>
      </AcademicModal>

      <AcademicModal open={!!assignModal} onClose={() => setAssignModal(null)} title={`Map ${assignModal?.assetTag} to Bed`}>
        <div className="space-y-3 text-sm">
          <select value={selectedBedId} onChange={(e) => setSelectedBedId(e.target.value)} className="w-full border rounded px-2 py-1.5 text-xs">
            <option value="">Select occupied bed...</option>
            {(data?.availableBeds ?? []).map((b) => (
              <option key={b.bedId} value={b.bedId}>{b.hostelName} — {b.roomLabel} Bed {b.bedLabel}{b.studentName ? ` (${b.studentName})` : ''}</option>
            ))}
          </select>
          <p className="text-[9px] text-slate-500">System tracks which mattress/chair ID is allotted to which student bed.</p>
          <button type="button" onClick={() => void handleAssign()} className="w-full bg-teal-600 text-white font-bold py-2 rounded-lg text-xs flex items-center justify-center gap-1">
            <Link2 size={14} /> Assign Asset to Bed
          </button>
        </div>
      </AcademicModal>
    </div>
  );
}
