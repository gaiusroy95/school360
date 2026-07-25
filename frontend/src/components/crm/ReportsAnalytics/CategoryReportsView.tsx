import { useCallback, useEffect, useState } from 'react';
import {
  RefreshCw, FileText, Download, ChevronDown, ChevronRight,
  BarChart3, ExternalLink, Filter, Search,
} from 'lucide-react';
import {
  exportCategoryReport,
  fetchCategoryMeta,
  generateCategoryReport,
  type RaCategoryKey,
  type RaReportItem,
  type RaReportPreview,
} from '../../../lib/reportsAnalyticsServices';
import { AcademicLoading, FeeMessage } from '../FeeFinanceManagement/FeeFinanceUi';

type Props = {
  category: RaCategoryKey;
  title: string;
  subtitle?: string;
};

export function CategoryReportsView({ category, title, subtitle }: Props) {
  const [meta, setMeta] = useState<Awaited<ReturnType<typeof fetchCategoryMeta>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [selected, setSelected] = useState<RaReportItem | null>(null);
  const [preview, setPreview] = useState<RaReportPreview | null>(null);
  const [generating, setGenerating] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<string>('');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    className: '',
    sectionName: '',
    term: 'Term 1',
    period: 'monthly',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchCategoryMeta(category, academicYear);
      setMeta(result);
      if (result.defaultFilters.dateFrom) {
        setFilters((f) => ({
          ...f,
          dateFrom: result.defaultFilters.dateFrom,
          dateTo: result.defaultFilters.dateTo,
          className: '',
          sectionName: '',
        }));
      }
      if (!expandedGroup && result.catalog[0]) {
        setExpandedGroup(result.catalog[0].id);
      }
    } finally {
      setLoading(false);
    }
  }, [category, academicYear, expandedGroup]);

  useEffect(() => { void load(); }, [academicYear, category]);

  const flash = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 6000);
  };

  const handleGenerate = async () => {
    if (!selected) return;
    setGenerating(true);
    try {
      const result = await generateCategoryReport(category, selected.key, {
        academicYear,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        className: filters.className || undefined,
        sectionName: filters.sectionName || undefined,
        term: filters.term,
        period: filters.period,
      });
      setPreview(result);
      flash(`Generated ${result.reportName} — ${result.rowCount} rows`, 'success');
      void load();
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Generation failed', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleExport = async () => {
    if (!selected) return;
    try {
      const result = await exportCategoryReport(category, selected.key, 'csv', {
        academicYear,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        className: filters.className || undefined,
        sectionName: filters.sectionName || undefined,
      });
      const blob = new Blob([result.content], { type: result.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.fileName;
      a.click();
      URL.revokeObjectURL(url);
      flash('Report exported successfully', 'success');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Export failed', 'error');
    }
  };

  const filteredCatalog = meta?.catalog.map((group) => ({
    ...group,
    reports: group.reports.filter(
      (r) =>
        !search ||
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.description.toLowerCase().includes(search.toLowerCase()) ||
        r.sourceModule.toLowerCase().includes(search.toLowerCase()),
    ),
  })).filter((g) => g.reports.length > 0) ?? [];

  if (loading && !meta) return <AcademicLoading label={`Loading ${title}...`} />;

  return (
    <div className="flex flex-col space-y-4 h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">{title}</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {subtitle ?? 'Mapped from module reports • Real-time sync with ERP data'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded px-3 py-1.5 shadow-sm"
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
          >
            {(meta?.academicYears ?? ['2025-26']).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void load()}
            className="bg-white border border-slate-200 text-slate-600 text-xs font-bold px-3 py-1.5 rounded shadow-sm hover:bg-slate-50 flex items-center gap-1.5"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Sync
          </button>
        </div>
      </div>

      {message && <FeeMessage message={message} type={messageType} />}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[9px] text-slate-500 font-bold">Available Reports</p>
          <p className="text-lg font-bold text-slate-900">{meta?.reportCount ?? 0}</p>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[9px] text-slate-500 font-bold">Total Runs</p>
          <p className="text-lg font-bold text-blue-600">{meta?.totalRuns ?? 0}</p>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm col-span-2">
          <p className="text-[9px] text-slate-500 font-bold">Source Module</p>
          <p className="text-sm font-bold text-slate-800">
            {filteredCatalog[0]?.reports[0]?.sourceModule ?? 'ERP Module'} — synced to central hub
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 flex-1 min-h-0">
        <div className="xl:col-span-4 flex flex-col gap-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <Search size={14} className="text-slate-400" />
              <input
                type="text"
                placeholder="Search reports..."
                className="flex-1 text-xs border-none outline-none"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="space-y-2 max-h-[420px] overflow-y-auto">
              {filteredCatalog.map((group) => (
                <div key={group.id} className="border border-slate-100 rounded-lg overflow-hidden">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100 text-left"
                    onClick={() => setExpandedGroup(expandedGroup === group.id ? '' : group.id)}
                  >
                    <span className="text-[10px] font-bold text-slate-700">{group.label}</span>
                    {expandedGroup === group.id ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  </button>
                  {expandedGroup === group.id && (
                    <div className="divide-y divide-slate-50">
                      {group.reports.map((report) => (
                        <button
                          key={report.key}
                          type="button"
                          disabled={report.locked}
                          onClick={() => { setSelected(report); setPreview(null); }}
                          className={`w-full text-left px-3 py-2.5 hover:bg-blue-50 transition-colors ${
                            selected?.key === report.key ? 'bg-blue-50 border-l-2 border-blue-600' : ''
                          } ${report.locked ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <div className="flex items-start gap-2">
                            <FileText size={12} className="text-blue-600 mt-0.5 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-[10px] font-bold text-slate-800 truncate">{report.name}</p>
                              <p className="text-[8px] text-slate-500 line-clamp-2">{report.description}</p>
                              <p className="text-[7px] text-blue-600 mt-0.5 flex items-center gap-1">
                                <ExternalLink size={8} />
                                {report.sourceModule}{report.sourceTab ? ` → ${report.sourceTab}` : ''}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {meta && meta.recentRuns.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <h3 className="text-[10px] font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                <BarChart3 size={12} /> Recent Runs
              </h3>
              <div className="space-y-2 max-h-[160px] overflow-y-auto">
                {meta.recentRuns.map((run) => (
                  <div key={run.id} className="text-[8px] bg-slate-50 rounded p-2 border border-slate-100">
                    <p className="font-bold text-slate-800 truncate">{run.reportName}</p>
                    <p className="text-slate-500">{run.rowCount} rows • {run.time}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="xl:col-span-8 flex flex-col gap-4">
          <div className="bg-blue-50 rounded-xl border border-blue-100 p-4">
            <h3 className="text-[10px] font-bold text-slate-800 mb-3 flex items-center gap-1.5">
              <Filter size={12} /> Report Filters
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-[8px] font-bold text-slate-600 block mb-1">Date From</label>
                <input
                  type="date"
                  className="w-full text-[9px] bg-white border border-slate-200 rounded px-2 py-1.5"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-[8px] font-bold text-slate-600 block mb-1">Date To</label>
                <input
                  type="date"
                  className="w-full text-[9px] bg-white border border-slate-200 rounded px-2 py-1.5"
                  value={filters.dateTo}
                  onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
                />
              </div>
              {(category === 'student' || category === 'academic' || category === 'attendance') && (
                <>
                  <div>
                    <label className="text-[8px] font-bold text-slate-600 block mb-1">Class</label>
                    <select
                      className="w-full text-[9px] bg-white border border-slate-200 rounded px-2 py-1.5"
                      value={filters.className}
                      onChange={(e) => setFilters((f) => ({ ...f, className: e.target.value }))}
                    >
                      <option value="">All Classes</option>
                      {(meta?.classes ?? []).map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[8px] font-bold text-slate-600 block mb-1">Section</label>
                    <select
                      className="w-full text-[9px] bg-white border border-slate-200 rounded px-2 py-1.5"
                      value={filters.sectionName}
                      onChange={(e) => setFilters((f) => ({ ...f, sectionName: e.target.value }))}
                    >
                      <option value="">All Sections</option>
                      {(meta?.sections ?? []).map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>
            <div className="flex gap-2 mt-3">
              <button
                type="button"
                disabled={!selected || generating}
                onClick={() => void handleGenerate()}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-[10px] px-4 py-2 rounded flex items-center gap-1.5"
              >
                <BarChart3 size={12} />
                {generating ? 'Generating...' : 'Generate Report'}
              </button>
              <button
                type="button"
                disabled={!preview}
                onClick={() => void handleExport()}
                className="bg-white border border-slate-200 text-slate-700 font-bold text-[10px] px-4 py-2 rounded flex items-center gap-1.5 hover:bg-slate-50 disabled:opacity-50"
              >
                <Download size={12} /> Export CSV
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex-1 flex flex-col min-h-[300px]">
            {!selected ? (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">
                Select a report from the catalog to generate preview
              </div>
            ) : !preview ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-2">
                <FileText size={32} className="text-blue-200" />
                <p className="text-sm font-bold text-slate-700">{selected.name}</p>
                <p className="text-[10px] text-slate-500 max-w-md">{selected.description}</p>
                <p className="text-[9px] text-blue-600">Source: {selected.sourceModule}</p>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h3 className="text-[11px] font-bold text-slate-800">{preview.reportName}</h3>
                    <p className="text-[8px] text-slate-500">
                      {preview.rowCount} rows • {preview.sourceModule} • {new Date(preview.generatedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex-1 overflow-auto border border-slate-100 rounded-lg">
                  <table className="w-full text-[9px]">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        {preview.columns.map((col) => (
                          <th key={col} className="text-left px-2 py-1.5 font-bold text-slate-600 border-b border-slate-100 whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.rows.slice(0, 100).map((row, i) => (
                        <tr key={i} className="hover:bg-slate-50 border-b border-slate-50">
                          {preview.columns.map((col) => (
                            <td key={col} className="px-2 py-1.5 text-slate-700 whitespace-nowrap">
                              {String(row[col] ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {preview.rows.length > 100 && (
                    <p className="text-[8px] text-slate-400 p-2 text-center">
                      Showing first 100 of {preview.rows.length} rows — export for full data
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
