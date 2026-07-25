import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle, RefreshCw, ShoppingCart, Mail, Package, Search,
  CheckSquare, Square, Zap,
} from 'lucide-react';
import {
  fetchReorderLevelManagement,
  createReorderPurchaseRequest,
  runReorderLevelScan,
  type ReorderLevelManagement,
} from '../../../lib/inventoryServices';
import { AcademicLoading, FeeMessage } from '../FeeFinanceManagement/FeeFinanceUi';

const STATUS_STYLE: Record<string, string> = {
  LOW_STOCK: 'bg-amber-100 text-amber-800',
  OUT_OF_STOCK: 'bg-red-100 text-red-800',
  OK: 'bg-green-100 text-green-800',
};

export function ReorderLevelView() {
  const [data, setData] = useState<ReorderLevelManagement | null>(null);
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [storeId, setStoreId] = useState('ALL');
  const [categoryId, setCategoryId] = useState('');
  const [itemType, setItemType] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [requestedBy, setRequestedBy] = useState('Inventory Manager');

  const load = useCallback(async (seed = false) => {
    setLoading(true);
    try {
      const result = await fetchReorderLevelManagement(seed, academicYear, {
        storeId: storeId !== 'ALL' ? storeId : undefined,
        categoryId: categoryId || undefined,
        itemType: itemType !== 'ALL' ? itemType : undefined,
        q: search || undefined,
      });
      setData(result);
      setSelected(new Set());
    } finally {
      setLoading(false);
    }
  }, [academicYear, storeId, categoryId, itemType, search]);

  useEffect(() => { void load(); }, []);

  const flash = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 6000);
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (!data) return;
    if (selected.size === data.lowStockItems.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(data.lowStockItems.map((i) => i.id)));
    }
  };

  const handleReorder = async (itemIds?: string[]) => {
    const ids = itemIds ?? [...selected];
    if (!ids.length) {
      flash('Select at least one item', 'error');
      return;
    }
    try {
      const result = await createReorderPurchaseRequest({
        itemIds: ids,
        academicYear,
        requestedBy,
      });
      setData(result.data);
      flash(result.message, 'success');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Reorder failed', 'error');
    }
  };

  const handleScan = async () => {
    try {
      const result = await runReorderLevelScan(academicYear);
      setData(result.data);
      flash(result.message, 'success');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Scan failed', 'error');
    }
  };

  if (loading && !data) return <AcademicLoading label="Loading reorder levels…" />;

  const allSelected = (data?.lowStockItems.length ?? 0) > 0 && selected.size === data!.lowStockItems.length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Package className="w-5 h-5 text-orange-600" />
            Reorder Level
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor stock against minimum thresholds — auto-draft purchase indents &amp; alert Purchase Manager
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5">
            {(data?.academicYears ?? ['2025-26']).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <input value={requestedBy} onChange={(e) => setRequestedBy(e.target.value)}
            placeholder="Requested by" className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 w-36" />
          <button type="button" onClick={() => void handleScan()}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-slate-50">
            <Zap className="w-3.5 h-3.5" /> Run Scan
          </button>
          <button type="button" onClick={() => void load(false)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-slate-50">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {message && <FeeMessage message={message} type={messageType} />}

      {/* Dashboard alert banner */}
      {(data?.lowStockCount ?? 0) > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-orange-50 border border-orange-200 rounded-xl">
          <div className="flex items-center gap-2 text-sm text-orange-800">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span className="font-semibold">{data!.dashboardAlert}</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-orange-600">
            <Mail className="w-3.5 h-3.5" />
            {data!.emailNotification.sent
              ? `Email sent to ${data!.emailNotification.recipient}`
              : `Alert active — email to ${data!.emailNotification.recipient} (max 1/24h)`}
          </div>
        </div>
      )}

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-orange-600">{data?.lowStockCount ?? 0}</p>
          <p className="text-[10px] text-slate-500">Low Stock Items</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-amber-600">{data?.consumableLowCount ?? 0}</p>
          <p className="text-[10px] text-slate-500">Essential Consumables</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-indigo-600">{data?.draftIndents.length ?? 0}</p>
          <p className="text-[10px] text-slate-500">Draft Purchase Indents</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-slate-700">{selected.size}</p>
          <p className="text-[10px] text-slate-500">Selected for Reorder</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 bg-white border border-slate-200 rounded-xl p-3">
        <select value={storeId} onChange={(e) => setStoreId(e.target.value)}
          className="text-xs border border-slate-200 rounded-lg px-2 py-1.5">
          <option value="ALL">All Stores</option>
          {(data?.stores ?? []).map((s) => <option key={s.id} value={s.id}>{s.storeName}</option>)}
        </select>
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
          className="text-xs border border-slate-200 rounded-lg px-2 py-1.5">
          <option value="">All Categories</option>
          {(data?.categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.categoryName}</option>)}
        </select>
        <select value={itemType} onChange={(e) => setItemType(e.target.value)}
          className="text-xs border border-slate-200 rounded-lg px-2 py-1.5">
          {(data?.itemTypes ?? ['ALL']).map((t) => <option key={t} value={t}>{t === 'ALL' ? 'All Types' : t}</option>)}
        </select>
        <div className="flex flex-1 min-w-[160px]">
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void load(false)}
            placeholder="Search item…" className="flex-1 text-xs border border-slate-200 rounded-l-lg px-2 py-1.5" />
          <button type="button" onClick={() => void load(false)}
            className="px-2 border border-l-0 border-slate-200 rounded-r-lg hover:bg-slate-50">
            <Search className="w-3.5 h-3.5" />
          </button>
        </div>
        <button type="button" disabled={!selected.size} onClick={() => void handleReorder()}
          className="flex items-center gap-1 px-4 py-1.5 text-xs font-semibold bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-40">
          <ShoppingCart className="w-3.5 h-3.5" /> Purchase / Reorder Now ({selected.size})
        </button>
      </div>

      {/* Low stock grid */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-2 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            Low Stock Items
          </h3>
          <span className="text-[10px] text-slate-400">{data?.lowStockItems.length ?? 0} items need attention</span>
        </div>
        <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 sticky top-0">
              <tr>
                <th className="px-3 py-2 w-8">
                  <button type="button" onClick={toggleAll} className="text-slate-500">
                    {allSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  </button>
                </th>
                <th className="text-left px-3 py-2 font-semibold text-slate-600">Item Name</th>
                <th className="text-left px-3 py-2 font-semibold text-slate-600">Store</th>
                <th className="text-right px-3 py-2 font-semibold text-slate-600">Current Stock</th>
                <th className="text-right px-3 py-2 font-semibold text-slate-600">Reorder Level</th>
                <th className="text-right px-3 py-2 font-semibold text-slate-600">Max Level</th>
                <th className="text-right px-3 py-2 font-semibold text-slate-600">Suggested Reorder Qty</th>
                <th className="text-center px-3 py-2 font-semibold text-slate-600">Status</th>
                <th className="text-center px-3 py-2 font-semibold text-slate-600">Action</th>
              </tr>
            </thead>
            <tbody>
              {(data?.lowStockItems ?? []).map((item) => (
                <tr key={item.id} className="border-t border-slate-100 hover:bg-orange-50/30">
                  <td className="px-3 py-2">
                    <button type="button" onClick={() => toggleSelect(item.id)}>
                      {selected.has(item.id)
                        ? <CheckSquare className="w-4 h-4 text-orange-600" />
                        : <Square className="w-4 h-4 text-slate-300" />}
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <p className="font-medium text-slate-800">{item.itemName}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{item.sku} · {item.category}</p>
                  </td>
                  <td className="px-3 py-2 text-slate-600">{item.storeName}</td>
                  <td className={`px-3 py-2 text-right font-mono font-semibold ${item.currentStock <= 0 ? 'text-red-600' : 'text-amber-700'}`}>
                    {item.currentStock} {item.unit}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-slate-600">{item.reorderLevel}</td>
                  <td className="px-3 py-2 text-right font-mono text-slate-600">{item.maxLevel}</td>
                  <td className="px-3 py-2 text-right font-mono font-bold text-indigo-700">{item.suggestedReorderQty} {item.unit}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLE[item.status] ?? ''}`}>
                      {item.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button type="button" onClick={() => void handleReorder([item.id])}
                      className="text-[10px] font-semibold text-orange-600 hover:underline">
                      Reorder
                    </button>
                  </td>
                </tr>
              ))}
              {(data?.lowStockItems.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-10 text-center text-slate-400">
                    All items are above reorder level
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top 5 + Draft indents */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h3 className="text-xs font-bold text-slate-700 mb-3">Top 5 Low Stock Items</h3>
          <ul className="space-y-2">
            {(data?.topLowStock ?? []).map((item, i) => (
              <li key={item.id} className="flex justify-between text-xs border-b border-slate-50 pb-2">
                <span className="text-slate-700">
                  <span className="font-bold text-orange-600 mr-1">#{i + 1}</span>
                  {item.itemName}
                </span>
                <span className="font-mono text-amber-700">{item.currentStock} / {item.reorderLevel} {item.unit}</span>
              </li>
            ))}
            {!data?.topLowStock.length && <li className="text-xs text-slate-400">No low stock items</li>}
          </ul>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h3 className="text-xs font-bold text-slate-700 mb-3">Auto-Generated Draft Indents</h3>
          <ul className="space-y-2">
            {(data?.draftIndents ?? []).map((ind) => (
              <li key={ind.id} className="text-xs border border-slate-100 rounded-lg p-2">
                <div className="flex justify-between font-semibold text-slate-800">
                  <span className="font-mono">{ind.indentNumber}</span>
                  <span className="text-indigo-600">{ind.lineCount} lines</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">{ind.department} · {ind.requestedBy}</p>
                <p className="text-[10px] text-slate-400">Total qty: {ind.totalQty} — convert in Purchase Orders</p>
              </li>
            ))}
            {!data?.draftIndents.length && (
              <li className="text-xs text-slate-400">No draft indents — automation runs on page load</li>
            )}
          </ul>
        </div>
      </div>

      {/* Automation rules */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
        <p className="text-[10px] font-bold text-slate-600 mb-1">Automation Rules</p>
        <ul className="text-[10px] text-slate-500 space-y-0.5 list-disc list-inside">
          {(data?.automationRules ?? []).map((r) => <li key={r}>{r}</li>)}
        </ul>
      </div>
    </div>
  );
}
