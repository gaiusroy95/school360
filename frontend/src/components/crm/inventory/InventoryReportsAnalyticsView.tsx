import { useCallback, useEffect, useState } from 'react';
import {
  BarChart3, RefreshCw, FileText, Download, Shield, Lock, ChevronRight,
  Building2, Package,
} from 'lucide-react';
import {
  fetchInventoryReportsAnalytics,
  generateInventoryReport,
  exportInventoryReport,
  type InventoryReportsAnalytics,
  type InventoryReportPreview,
} from '../../../lib/inventoryServices';
import { AcademicLoading, FeeMessage } from '../FeeFinanceManagement/FeeFinanceUi';

type ReportItem = { id: string; name: string; description: string; restricted?: boolean; locked?: boolean };

const ROLE_OPTIONS = [
  'Inventory Manager',
  'Store Keeper',
  'Purchase Manager',
  'Principal',
  'Accountant',
  'Finance Head',
];

export function InventoryReportsAnalyticsView() {
  const [data, setData] = useState<InventoryReportsAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [userRole, setUserRole] = useState('Inventory Manager');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [selected, setSelected] = useState<ReportItem | null>(null);
  const [preview, setPreview] = useState<InventoryReportPreview | null>(null);
  const [generating, setGenerating] = useState(false);
  const [expandedCat, setExpandedCat] = useState<'operational' | 'financial'>('operational');

  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    storeId: 'ALL',
    categoryId: '',
    itemId: '',
    department: '',
    expiryWithinDays: 90,
  });

  const load = useCallback(async (seed = false) => {
    setLoading(true);
    try {
      const result = await fetchInventoryReportsAnalytics(seed, academicYear, userRole);
      setData(result);
      setFilters((f) => ({
        ...f,
        dateFrom: result.defaultFilters.dateFrom,
        dateTo: result.defaultFilters.dateTo,
        expiryWithinDays: result.defaultFilters.expiryWithinDays,
      }));
    } finally {
      setLoading(false);
    }
  }, [academicYear, userRole]);

  useEffect(() => { void load(); }, [userRole, academicYear]);

  const flash = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 6000);
  };

  const handleSelect = (report: ReportItem) => {
    if (report.locked) {
      flash('Financial reports require Accountant or Principal role', 'error');
      return;
    }
    setSelected(report);
    setPreview(null);
  };

  const handleGenerate = async () => {
    if (!selected) return;
    setGenerating(true);
    try {
      const result = await generateInventoryReport(selected.id, {
        academicYear,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        storeId: filters.storeId !== 'ALL' ? filters.storeId : undefined,
        categoryId: filters.categoryId || undefined,
        itemId: filters.itemId || undefined,
        department: filters.department || undefined,
        expiryWithinDays: filters.expiryWithinDays,
      }, userRole);
      setPreview(result);
      flash(`${result.name} generated — ${result.rowCount} rows`, 'success');
      void load(false);
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Generation failed', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleExport = async (format: string) => {
    if (!selected) return;
    try {
      const result = await exportInventoryReport(selected.id, {
        academicYear,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        storeId: filters.storeId !== 'ALL' ? filters.storeId : undefined,
        categoryId: filters.categoryId || undefined,
        itemId: filters.itemId || undefined,
        department: filters.department || undefined,
        expiryWithinDays: filters.expiryWithinDays,
      }, format, userRole);
      setPreview(result.preview);
      flash(result.message, 'success');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Export failed', 'error');
    }
  };

  if (loading && !data) return <AcademicLoading label="Loading reports…" />;

  const renderReportList = (reports: ReportItem[], icon: React.ReactNode) => (
    <ul className="space-y-1">
      {reports.map((r) => (
        <li key={r.id}>
          <button
            type="button"
            onClick={() => handleSelect(r)}
            className={`w-full flex items-start gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
              selected?.id === r.id ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-slate-50 border border-transparent'
            } ${r.locked ? 'opacity-60' : ''}`}
          >
            <span className="mt-0.5 text-slate-400">{icon}</span>
            <span className="flex-1 min-w-0">
              <span className="flex items-center gap-1 text-xs font-semibold text-slate-800">
                {r.name}
                {r.restricted && <Lock className="w-3 h-3 text-amber-600" />}
              </span>
              <span className="text-[10px] text-slate-500 line-clamp-2">{r.description}</span>
            </span>
            <ChevronRight className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />
          </button>
        </li>
      ))}
    </ul>
  );

  const summaryEntries = preview?.summary ? Object.entries(preview.summary) : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            Reports &amp; Analytics
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational &amp; financial inventory reporting for compliance, auditing &amp; procurement planning
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5">
            {(data?.academicYears ?? ['2025-26']).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={userRole} onChange={(e) => setUserRole(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5" title="Simulate role for access control">
            {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <button type="button" onClick={() => void load(false)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-slate-50">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {message && <FeeMessage message={message} type={messageType} />}

      {!data?.canViewFinancials && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
          <Shield className="w-4 h-4 shrink-0" />
          Financial reports (Valuation, Vendor Bills) are restricted — switch role to Principal or Accountant to access
        </div>
      )}

      <div className="grid lg:grid-cols-12 gap-4">
        {/* Report catalog */}
        <div className="lg:col-span-4 space-y-3">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <button type="button" onClick={() => setExpandedCat('operational')}
              className="w-full px-4 py-2 flex justify-between items-center bg-slate-50 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-700">Operational Registers</span>
              <ChevronRight className={`w-4 h-4 transition-transform ${expandedCat === 'operational' ? 'rotate-90' : ''}`} />
            </button>
            {expandedCat === 'operational' && (
              <div className="p-2">
                {renderReportList(data?.reportCatalog.operational.reports ?? [], <Package className="w-4 h-4" />)}
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <button type="button" onClick={() => setExpandedCat('financial')}
              className="w-full px-4 py-2 flex justify-between items-center bg-slate-50 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                Financial &amp; Compliance <Lock className="w-3 h-3 text-amber-600" />
              </span>
              <ChevronRight className={`w-4 h-4 transition-transform ${expandedCat === 'financial' ? 'rotate-90' : ''}`} />
            </button>
            {expandedCat === 'financial' && (
              <div className="p-2">
                {renderReportList(data?.reportCatalog.financial.reports ?? [], <Building2 className="w-4 h-4" />)}
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3">
            <p className="text-[10px] font-bold text-slate-600 mb-2">Recent Report Runs</p>
            <ul className="space-y-1.5 max-h-40 overflow-y-auto">
              {(data?.recentRuns ?? []).map((r) => (
                <li key={r.id} className="text-[10px] text-slate-500 border-b border-slate-50 pb-1">
                  <span className="font-semibold text-slate-700">{r.action}</span>
                  <span className="block truncate">{r.details}</span>
                  <span className="text-slate-400">{r.atLabel} · {r.performedBy}</span>
                </li>
              ))}
              {!data?.recentRuns.length && <li className="text-[10px] text-slate-400">No reports generated yet</li>}
            </ul>
          </div>
        </div>

        {/* Filters + preview */}
        <div className="lg:col-span-8 space-y-3">
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <FileText className="w-4 h-4" />
              {selected ? selected.name : 'Select a report'}
            </h3>

            {selected && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500">From</label>
                    <input type="date" value={filters.dateFrom}
                      onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
                      className="w-full text-xs border border-slate-200 rounded px-2 py-1" />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500">To</label>
                    <input type="date" value={filters.dateTo}
                      onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
                      className="w-full text-xs border border-slate-200 rounded px-2 py-1" />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500">Store</label>
                    <select value={filters.storeId} onChange={(e) => setFilters((f) => ({ ...f, storeId: e.target.value }))}
                      className="w-full text-xs border border-slate-200 rounded px-2 py-1">
                      <option value="ALL">All Stores</option>
                      {(data?.stores ?? []).map((s) => <option key={s.id} value={s.id}>{s.storeName}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500">Category</label>
                    <select value={filters.categoryId} onChange={(e) => setFilters((f) => ({ ...f, categoryId: e.target.value }))}
                      className="w-full text-xs border border-slate-200 rounded px-2 py-1">
                      <option value="">All</option>
                      {(data?.categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.categoryName}</option>)}
                    </select>
                  </div>
                  {(selected.id === 'stock_ledger' || selected.id === 'batch_expiry') && (
                    <div className="col-span-2">
                      <label className="text-[10px] text-slate-500">Item</label>
                      <select value={filters.itemId} onChange={(e) => setFilters((f) => ({ ...f, itemId: e.target.value }))}
                        className="w-full text-xs border border-slate-200 rounded px-2 py-1">
                        <option value="">All Items</option>
                        {(data?.items ?? []).map((i) => <option key={i.id} value={i.id}>{i.itemName}</option>)}
                      </select>
                    </div>
                  )}
                  {selected.id === 'department_consumption' && (
                    <div>
                      <label className="text-[10px] text-slate-500">Department</label>
                      <input value={filters.department} onChange={(e) => setFilters((f) => ({ ...f, department: e.target.value }))}
                        placeholder="Filter dept…" className="w-full text-xs border border-slate-200 rounded px-2 py-1" />
                    </div>
                  )}
                  {selected.id === 'batch_expiry' && (
                    <div>
                      <label className="text-[10px] text-slate-500">Expiry within (days)</label>
                      <input type="number" value={filters.expiryWithinDays}
                        onChange={(e) => setFilters((f) => ({ ...f, expiryWithinDays: Number(e.target.value) }))}
                        className="w-full text-xs border border-slate-200 rounded px-2 py-1" />
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button type="button" disabled={generating} onClick={() => void handleGenerate()}
                    className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                    {generating ? 'Generating…' : 'Generate Report'}
                  </button>
                  {(data?.exportFormats ?? ['CSV']).map((fmt) => (
                    <button key={fmt} type="button" onClick={() => void handleExport(fmt)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-slate-50">
                      <Download className="w-3.5 h-3.5" /> {fmt}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {preview && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-4 py-2 border-b border-slate-200 flex flex-wrap justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-slate-800">{preview.name}</p>
                  <p className="text-[10px] text-slate-500">{preview.rowCount} rows · {new Date(preview.generatedAt).toLocaleString('en-IN')}</p>
                </div>
                {preview.restricted && (
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Financial — restricted access
                  </span>
                )}
              </div>

              {summaryEntries.length > 0 && (
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-3">
                  {summaryEntries.map(([k, v]) => (
                    <div key={k} className="text-center min-w-[80px]">
                      <p className="text-sm font-bold text-slate-800">{String(v)}</p>
                      <p className="text-[9px] text-slate-500 capitalize">{k.replace(/([A-Z])/g, ' $1')}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Valuation breakdown */}
              {preview.categoryBreakdown && preview.categoryBreakdown.length > 0 && (
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-[10px] font-bold text-slate-600 mb-2">By Category</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {preview.categoryBreakdown.map((c) => (
                      <div key={c.category} className="bg-blue-50 rounded-lg p-2 text-center">
                        <p className="text-[10px] text-slate-600">{c.category}</p>
                        <p className="text-sm font-bold text-blue-800">{c.value}</p>
                        <p className="text-[9px] text-slate-400">{c.items} items</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      {preview.columns.map((col) => (
                        <th key={col} className="text-left px-3 py-2 font-semibold text-slate-600 whitespace-nowrap">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.slice(0, 100).map((row, i) => (
                      <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                        {Object.values(row).map((val, j) => (
                          <td key={j} className="px-3 py-1.5 whitespace-nowrap text-slate-700">
                            {String(val ?? '—')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.rows.length > 100 && (
                  <p className="text-[10px] text-slate-400 text-center py-2">Showing first 100 of {preview.rows.length} rows — export for full data</p>
                )}
              </div>
            </div>
          )}

          {!preview && selected && (
            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400 text-xs">
              Click <strong>Generate Report</strong> to preview {selected.name}
            </div>
          )}
        </div>
      </div>

      {/* Security matrix */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1 mb-3">
          <Shield className="w-4 h-4 text-indigo-600" /> Security &amp; Access Control
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-3 py-2">Report</th>
                <th className="text-left px-3 py-2">Authorized Roles</th>
                <th className="text-center px-3 py-2">Restricted</th>
              </tr>
            </thead>
            <tbody>
              {(data?.securityMatrix ?? []).map((row) => (
                <tr key={row.report} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-medium">{row.report}</td>
                  <td className="px-3 py-2 text-slate-600">{row.roles}</td>
                  <td className="px-3 py-2 text-center">
                    {row.restricted ? <Lock className="w-3.5 h-3.5 text-amber-600 inline" /> : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="mt-3 text-[10px] text-slate-500 space-y-0.5 list-disc list-inside">
          {(data?.complianceNotes ?? []).map((n) => <li key={n}>{n}</li>)}
        </ul>
      </div>
    </div>
  );
}
