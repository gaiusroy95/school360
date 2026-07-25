import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Package, IndianRupee, AlertTriangle, XCircle, Box, ShoppingCart,
  ChevronDown, Plus, Download, Upload, ArrowRightLeft, Settings2,
  CheckCircle2, UserPlus, FileText, Receipt, Barcode, ClipboardList,
  BarChart2, AlertCircle, Info, CheckCircle, RefreshCw,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid, Legend,
} from 'recharts';
import { fetchInventoryDashboard, exportInventoryDashboard, type InventoryDashboard } from '../../../lib/inventoryServices';
import { toViewKey } from '../../../lib/navigation';
import { AcademicLoading } from '../FeeFinanceManagement/FeeFinanceUi';

const KPI_META = [
  { key: 'totalItems' as const, title: 'Total Items', color: 'bg-indigo-500', icon: <Package size={20} />, iconBg: 'bg-indigo-100', iconColor: 'text-indigo-500' },
  { key: 'totalStockValue' as const, title: 'Total Stock Value', color: 'bg-green-500', icon: <IndianRupee size={20} />, iconBg: 'bg-green-100', iconColor: 'text-green-500' },
  { key: 'lowStockItems' as const, title: 'Low Stock Items', color: 'bg-orange-500', icon: <AlertTriangle size={20} />, iconBg: 'bg-orange-100', iconColor: 'text-orange-500', subtitleColor: 'text-red-500' },
  { key: 'outOfStockItems' as const, title: 'Out of Stock Items', color: 'bg-red-500', icon: <XCircle size={20} />, iconBg: 'bg-red-100', iconColor: 'text-red-500' },
  { key: 'stockInHand' as const, title: 'Stock in Hand', color: 'bg-blue-500', icon: <Box size={20} />, iconBg: 'bg-blue-100', iconColor: 'text-blue-500' },
  { key: 'pendingOrders' as const, title: 'Pending Orders', color: 'bg-purple-500', icon: <ShoppingCart size={20} />, iconBg: 'bg-purple-100', iconColor: 'text-purple-500' },
];

const QUICK_ICONS: Record<string, ReactNode> = {
  'Add New Item': <Package size={16} className="text-blue-600" />,
  'Stock Inward (GRN)': <Download size={16} className="text-green-600" />,
  'Stock Outward': <Upload size={16} className="text-orange-600" />,
  'Transfer Stock': <ArrowRightLeft size={16} className="text-purple-600" />,
  'Stock Adjustment': <Settings2 size={16} className="text-slate-600" />,
  'Stock Verification': <CheckCircle2 size={16} className="text-green-600" />,
  'Add Supplier': <UserPlus size={16} className="text-blue-600" />,
  'Purchase Order': <FileText size={16} className="text-indigo-600" />,
  'Vendor Bills': <Receipt size={16} className="text-slate-600" />,
  'Barcode Print': <Barcode size={16} className="text-slate-800" />,
  'Reorder Report': <ClipboardList size={16} className="text-amber-600" />,
  'Inventory Report': <BarChart2 size={16} className="text-blue-600" />,
};

const ALERT_ICONS: Record<string, ReactNode> = {
  OUT_OF_STOCK: <AlertCircle size={14} className="text-red-500" />,
  LOW_STOCK: <AlertTriangle size={14} className="text-amber-500" />,
  PENDING_PO: <Info size={14} className="text-blue-500" />,
  VERIFICATION: <CheckCircle size={14} className="text-green-500" />,
};

const ALERT_BG: Record<string, string> = {
  OUT_OF_STOCK: 'bg-red-50',
  LOW_STOCK: 'bg-amber-50',
  PENDING_PO: 'bg-blue-50',
  VERIFICATION: 'bg-green-50',
};

export function InventoryDashboardView({ onNavigate }: { onNavigate?: (view: string) => void }) {
  const [data, setData] = useState<InventoryDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [storeId, setStoreId] = useState('ALL');
  const [exportMsg, setExportMsg] = useState('');

  const load = useCallback(async (seed = false) => {
    setLoading(true);
    try {
      const result = await fetchInventoryDashboard(seed, academicYear, storeId === 'ALL' ? undefined : storeId);
      setData(result);
    } finally {
      setLoading(false);
    }
  }, [academicYear, storeId]);

  useEffect(() => { void load(true); }, [load]);

  const nav = (target: string) => {
    if (onNavigate) onNavigate(toViewKey('Inventory Management', target));
  };

  const kpiList = useMemo(() => {
    if (!data) return [];
    return KPI_META.map((m) => {
      const k = data.kpis[m.key];
      const value = typeof k.value === 'number' ? k.value.toLocaleString('en-IN') : k.value;
      return { ...m, value, subtitle: k.subtitle, subtitleColor: m.subtitleColor };
    });
  }, [data]);

  const handleExport = async (format: string) => {
    const result = await exportInventoryDashboard(academicYear, storeId === 'ALL' ? undefined : storeId, format);
    setExportMsg(result.message);
    setTimeout(() => setExportMsg(''), 4000);
  };

  if (loading && !data) return <AcademicLoading />;

  const totalItems = data?.kpis.totalItems.value ?? 0;
  const totalValue = data?.kpis.totalStockValue.value ?? '—';

  return (
    <div className="flex flex-col space-y-4 h-full relative">
      {exportMsg && <div className="text-xs bg-green-50 text-green-700 p-2 rounded-lg">{exportMsg}</div>}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Inventory Management CRM</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Track • Manage • Control • Optimize
            {data?.materializedView && (
              <span className="ml-2 text-slate-400">· Cache refresh: {data.cacheRefreshMins}m</span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className="text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded px-3 py-1.5 shadow-sm">
            {(data?.academicYears ?? ['2025-26']).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <div className="flex items-center text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded px-3 py-1.5 shadow-sm">
            <span className="text-slate-400 mr-2">Store/Location</span>
            <select className="bg-transparent border-none outline-none text-slate-700 cursor-pointer" value={storeId} onChange={(e) => setStoreId(e.target.value)}>
              <option value="ALL">All Locations</option>
              {(data?.stores ?? []).filter((s) => s.accessible).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <ChevronDown size={14} className="ml-1 text-slate-400" />
          </div>
          <button type="button" onClick={() => void load()} className="p-2 border rounded-lg"><RefreshCw size={14} /></button>
          <button type="button" onClick={() => void handleExport('PDF')} className="px-3 py-1.5 text-xs border rounded-lg flex items-center gap-1">
            <Download size={12} /> Export PDF
          </button>
          <button type="button" onClick={() => nav('Items / Products')} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded flex items-center gap-2 shadow-sm">
            <Plus size={14} />
            <span>Add New Item</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {kpiList.map((kpi, i) => (
          <div key={i} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-8 h-8 rounded-full ${kpi.iconBg} ${kpi.iconColor} flex items-center justify-center shadow-sm shrink-0`}>{kpi.icon}</div>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] text-slate-500 font-bold truncate">{kpi.title}</p>
                <p className="text-[13px] font-bold text-slate-900 truncate leading-tight mt-0.5">{kpi.value}</p>
              </div>
            </div>
            {kpi.subtitle && (
              <div className={`text-[8px] flex items-center gap-1 ${kpi.subtitleColor || 'text-slate-500'}`}>{kpi.subtitle}</div>
            )}
            <div className={`absolute bottom-0 left-0 w-full h-0.5 ${kpi.color}`} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Stock Overview</h3>
          <div className="flex items-center justify-center gap-4 flex-1">
            <div className="w-24 h-24 relative shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data?.stockOverview ?? []} cx="50%" cy="50%" innerRadius={28} outerRadius={40} dataKey="value" stroke="none">
                    {(data?.stockOverview ?? []).map((e, idx) => <Cell key={idx} fill={e.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[13px] font-bold text-slate-800">{totalItems.toLocaleString('en-IN')}</span>
                <span className="text-[6px] text-slate-500 leading-tight">Total Items</span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 text-[9px] flex-1">
              {(data?.stockOverview ?? []).map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-600 text-[9px] font-medium whitespace-nowrap">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[8px]">
                    <span className="font-bold text-slate-800">{item.value}</span>
                    <span className="text-slate-400">({item.percent})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-2 text-[9px] text-slate-600 font-medium text-center border-t border-slate-100 pt-2">
            Total Stock Value: <span className="font-bold text-slate-900">{totalValue}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-4 flex flex-col relative">
          <h3 className="text-[11px] font-bold text-slate-800 mb-1">Stock Trend <span className="font-normal text-slate-500">(This Month)</span></h3>
          <div className="flex-1 w-full h-full min-h-[160px] relative mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.stockTrend ?? []} margin={{ top: 20, right: -5, left: -25, bottom: -10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#64748b' }} dy={5} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#64748b' }} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#64748b' }} tickFormatter={(v) => `${v}L`} />
                <RechartsTooltip contentStyle={{ fontSize: '9px', borderRadius: '4px', padding: '4px' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '9px', top: -10 }} />
                <Line yAxisId="left" type="monotone" dataKey="inward" name="Stock Inward" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                <Line yAxisId="left" type="monotone" dataKey="outward" name="Stock Outward" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                <Line yAxisId="right" type="monotone" dataKey="value" name="Stock Value (₹)" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Category Wise Stock Value</h3>
          <div className="flex items-center justify-center gap-4 flex-1">
            <div className="w-24 h-24 relative shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data?.categoryWiseStock ?? []} cx="50%" cy="50%" innerRadius={25} outerRadius={40} dataKey="value" stroke="none">
                    {(data?.categoryWiseStock ?? []).map((e, idx) => <Cell key={idx} fill={e.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[9px] font-bold text-slate-800">{totalValue}</span>
                <span className="text-[6px] text-slate-500 leading-tight">Total Value</span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 text-[9px] flex-1">
              {(data?.categoryWiseStock ?? []).map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-600 text-[8px] font-medium whitespace-nowrap truncate w-20">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-slate-800">₹ {(item.value / 100000).toFixed(2)}L</span>
                    <span className="text-slate-400 text-[8px]">({item.percent})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-2 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[11px] font-bold text-slate-800">Top 5 Low Stock Items</h3>
            <button type="button" onClick={() => nav('Reorder Level')} className="text-[9px] text-blue-600 font-medium hover:underline">View All</button>
          </div>
          <table className="w-full text-[8px] text-left">
            <thead>
              <tr className="text-slate-400 font-medium border-b border-slate-100">
                <th className="pb-1">Item Name</th>
                <th className="pb-1 text-center">Current</th>
                <th className="pb-1 text-center">Reorder</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {(data?.topLowStock ?? []).map((item, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="py-1.5 text-slate-700 font-medium max-w-[80px] truncate" title={item.name}>{item.name}</td>
                  <td className="py-1.5 text-center text-red-600 font-bold">{item.stock}</td>
                  <td className="py-1.5 text-center text-slate-500">{item.reorder}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" onClick={() => nav('Purchase Orders')} className="mt-2 w-full bg-red-500 hover:bg-red-600 text-white text-[9px] font-bold py-1.5 rounded transition-colors shadow-sm">
            Purchase / Reorder Now
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-4 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[11px] font-bold text-slate-800">Recent Stock Inward (GRN)</h3>
            <button type="button" onClick={() => nav('Stock Inward (GRN)')} className="text-[9px] text-blue-600 font-medium hover:underline">View All</button>
          </div>
          <table className="w-full text-[9px] text-left">
            <thead>
              <tr className="text-slate-500 border-b border-slate-100">
                <th className="pb-2 font-medium">GRN No.</th>
                <th className="pb-2 font-medium">Date</th>
                <th className="pb-2 font-medium">Supplier</th>
                <th className="pb-2 font-medium text-center">Items</th>
                <th className="pb-2 font-medium text-right">Total Value</th>
                <th className="pb-2 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {(data?.recentGrn ?? []).map((row, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="py-2 text-blue-600 font-bold">{row.grn}</td>
                  <td className="py-2 text-slate-600 whitespace-nowrap">{row.date}</td>
                  <td className="py-2 text-slate-600 max-w-[80px] truncate">{row.supplier}</td>
                  <td className="py-2 text-center font-medium text-slate-700">{row.items}</td>
                  <td className="py-2 text-right font-bold text-slate-800">{row.value}</td>
                  <td className="py-2 text-right"><span className="text-[7px] font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded border border-green-200">{row.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-4">Stock Movement <span className="font-normal text-slate-500">(This Month)</span></h3>
          <div className="grid grid-cols-4 gap-2 mb-4">
            {[
              { label: 'Stock Inward', icon: <Download size={14} className="text-green-500" />, value: data?.stockMovement.inwardQty },
              { label: 'Stock Outward', icon: <Upload size={14} className="text-blue-500" />, value: data?.stockMovement.outwardQty },
              { label: 'Transfers', icon: <ArrowRightLeft size={14} className="text-purple-500" />, value: data?.stockMovement.transfers },
              { label: 'Adjustments', icon: <Settings2 size={14} className="text-amber-500" />, value: data?.stockMovement.adjustments },
            ].map((m) => (
              <div key={m.label} className="bg-slate-50 rounded border border-slate-100 p-2 flex flex-col items-center text-center">
                {m.icon}
                <span className="text-[7px] text-slate-500 font-medium mb-0.5 line-clamp-1">{m.label}</span>
                <span className="text-[11px] font-bold text-slate-900">{m.value?.toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
          <h4 className="text-[9px] font-bold text-slate-700 mb-2 border-b border-slate-100 pb-1">Movement Value (₹)</h4>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div><span className="text-[7px] text-slate-500 block mb-1">Inward Value</span><span className="text-[10px] font-bold text-green-600">{data?.stockMovement.inwardValue}</span></div>
            <div><span className="text-[7px] text-slate-500 block mb-1">Outward Value</span><span className="text-[10px] font-bold text-blue-600">{data?.stockMovement.outwardValue}</span></div>
            <div><span className="text-[7px] text-slate-500 block mb-1">Net Movement</span><span className="text-[10px] font-bold text-purple-600">{data?.stockMovement.netMovement}</span></div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-2 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-4">Stock Status</h3>
          {[
            { key: 'goodStock' as const, label: 'Good Stock', sub: '(> Reorder Level)', color: 'bg-green-500' },
            { key: 'lowStock' as const, label: 'Low Stock', sub: '(< Reorder Level)', color: 'bg-amber-500' },
            { key: 'outOfStock' as const, label: 'Out of Stock', sub: '', color: 'bg-red-500' },
            { key: 'inTransit' as const, label: 'In Transit', sub: '', color: 'bg-blue-500' },
          ].map((s) => {
            const st = data?.stockStatus[s.key];
            return (
              <div key={s.key} className="flex flex-col gap-1 mb-3">
                <div className="flex justify-between items-center text-[9px]">
                  <span className="text-slate-600 font-medium">{s.label} <span className="text-[7px] text-slate-400">{s.sub}</span></span>
                  <span className="font-bold text-slate-900">{st?.count ?? 0} <span className="text-slate-400 font-normal">({st?.pct})</span></span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div className={`${s.color} h-full rounded-full`} style={{ width: st?.pct ?? '0%' }} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Quick Actions</h3>
          <div className="grid grid-cols-4 gap-2 flex-1 content-start">
            {(data?.quickActions ?? []).map((action) => (
              <button key={action.label} type="button" onClick={() => nav(action.target)} className="flex flex-col items-center text-center p-1.5 rounded-lg border border-slate-100 hover:bg-slate-50 hover:border-slate-200 transition-colors group">
                <div className="w-6 h-6 rounded flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                  {QUICK_ICONS[action.label] ?? <Package size={16} />}
                </div>
                <span className="text-[7px] text-slate-600 font-medium leading-tight">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Top Items by Value</h3>
          <table className="w-full text-[8px] text-left">
            <thead><tr className="text-slate-500 border-b border-slate-100"><th className="pb-1.5">Item Name</th><th>Category</th><th className="text-right">Stock Value</th></tr></thead>
            <tbody className="divide-y divide-slate-50">
              {(data?.topByValue ?? []).map((row, i) => (
                <tr key={i}><td className="py-1.5 font-medium truncate max-w-[80px]">{row.name}</td><td className="text-slate-600">{row.category}</td><td className="text-right font-bold">{row.value}</td></tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Top Items by Usage <span className="font-normal text-slate-500">(This Month)</span></h3>
          <table className="w-full text-[8px] text-left">
            <thead><tr className="text-slate-500 border-b border-slate-100"><th className="pb-1.5">Item Name</th><th className="text-center">Issued Qty</th><th>Unit</th></tr></thead>
            <tbody className="divide-y divide-slate-50">
              {(data?.topByUsage ?? []).map((row, i) => (
                <tr key={i}><td className="py-1.5 font-medium truncate max-w-[100px]">{row.name}</td><td className="text-center font-bold text-blue-600">{row.issued}</td><td className="text-slate-500">{row.unit}</td></tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Inventory Alerts</h3>
          <div className="flex flex-col gap-2 overflow-y-auto">
            {(data?.alerts ?? []).map((alert, i) => (
              <div key={i} className="flex gap-2 items-center">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${ALERT_BG[alert.type] ?? 'bg-slate-50'}`}>
                  {ALERT_ICONS[alert.type] ?? <Info size={14} className="text-slate-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[8px] font-medium text-slate-800 leading-tight">{alert.text}</p>
                  <span className="text-[7px] text-slate-500">{alert.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Store / Location Summary</h3>
          <table className="w-full text-[8px] text-left">
            <thead><tr className="text-slate-500 border-b border-slate-100"><th className="pb-1.5">Store</th><th className="text-right">Stock Value</th><th className="text-right">Items</th></tr></thead>
            <tbody className="divide-y divide-slate-50">
              {(data?.storeSummary ?? []).map((row, i) => (
                <tr key={i}><td className="py-1.5 font-medium">{row.name}</td><td className="text-right font-bold">{row.value}</td><td className="text-right text-slate-600">{row.items}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
