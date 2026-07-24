import { useCallback, useEffect, useState } from 'react';
import {
  Download, FileSpreadsheet, FileText, Loader2, RefreshCw, Search, X,
} from 'lucide-react';
import {
  fetchHrReport,
  fetchHrReportsMeta,
  type HrReportCategory,
  type HrReportPayload,
  type HrReportsMeta,
} from '../../../lib/hrServices';
import {
  am,
  AcademicLoading,
  AcademicPageHeader,
  AcademicPageShell,
} from '../FeeFinanceManagement/FeeFinanceUi';

function labelize(key: string) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

function downloadCsv(report: HrReportPayload) {
  const header = report.columns.join(',');
  const lines = report.rows.map((row) =>
    report.columns.map((col) => {
      const val = row[col];
      const str = val === null || val === undefined ? '' : String(val);
      return str.includes(',') ? `"${str.replace(/"/g, '""')}"` : str;
    }).join(','),
  );
  const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${report.key}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function ReportCategoryCard({
  category,
  onSelect,
}: {
  category: HrReportCategory;
  onSelect: (key: string, label: string) => void;
}) {
  const spanClass = category.colSpan === 2 ? 'lg:col-span-2' : '';
  return (
    <div className={`${am.card} border-2 ${category.borderColor} p-4 ${spanClass}`}>
      <h3 className="font-bold text-slate-900 text-sm mb-3 border-b border-slate-100 pb-2">
        {category.title}
      </h3>
      <div className={category.sections.length > 1 ? 'grid sm:grid-cols-2 gap-4' : ''}>
        {category.sections.map((section) => (
          <div key={section.title}>
            {category.sections.length > 1 && (
              <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">{section.title}</p>
            )}
            <ul className="space-y-0.5">
              {section.reports.map((r) => (
                <li key={r.key}>
                  <button
                    type="button"
                    onClick={() => onSelect(r.key, r.label)}
                    className="text-left text-xs text-slate-700 hover:text-amber-700 hover:underline w-full py-0.5 transition-colors"
                  >
                    {r.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {category.footer && (
        <p className="text-[10px] text-slate-400 mt-3 pt-2 border-t border-slate-100 italic">
          {category.footer}
        </p>
      )}
    </div>
  );
}

function ReportPreviewModal({
  report,
  loading,
  onClose,
  onRefresh,
}: {
  report: HrReportPayload | null;
  loading: boolean;
  onClose: () => void;
  onRefresh: () => void;
}) {
  if (!report && !loading) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-[3px]" onClick={onClose}>
      <div
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start p-4 border-b">
          <div>
            <h3 className="font-bold text-slate-900">{report?.label ?? 'Loading Report…'}</h3>
            {report && (
              <p className="text-xs text-slate-500 mt-1">{report.category}</p>
            )}
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {loading && (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-slate-400" size={24} />
            </div>
          )}
          {!loading && report && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                <span>Generated {new Date(report.generatedAt).toLocaleString('en-IN')}</span>
                <span>{report.rows.length} rows</span>
              </div>

              {Object.keys(report.summary).length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Object.entries(report.summary).map(([k, v]) => (
                    <div key={k} className="bg-slate-50 border rounded-lg p-2">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">{labelize(k)}</p>
                      <p className="text-lg font-bold text-slate-800">{String(v)}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className={am.tableWrap}>
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      {report.columns.map((col) => (
                        <th key={col} className={am.th}>{labelize(col)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {report.rows.slice(0, 100).map((row, i) => (
                      <tr key={i}>
                        {report.columns.map((col) => (
                          <td key={col} className={am.td}>{String(row[col] ?? '—')}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {report.rows.length === 0 && (
                  <p className="p-6 text-center text-slate-400 text-sm">No data for selected filters.</p>
                )}
                {report.rows.length > 100 && (
                  <p className="text-xs text-amber-600 p-2 bg-amber-50 border-t">
                    Preview shows first 100 of {report.rows.length} rows. Download CSV for full export.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {!loading && report && (
          <div className="flex flex-wrap justify-between gap-2 p-4 border-t">
            <button type="button" onClick={onRefresh} className={am.btnSecondary}>
              <RefreshCw size={14} /> Refresh
            </button>
            <div className="flex gap-2">
              <button type="button" onClick={() => downloadCsv(report)} className={am.btnSecondary}>
                <FileSpreadsheet size={14} /> CSV
              </button>
              <button type="button" onClick={() => downloadCsv(report)} className={am.btnPrimary}>
                <Download size={14} /> Export
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function HrReportsView() {
  const [meta, setMeta] = useState<HrReportsMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeReport, setActiveReport] = useState<{ key: string; label: string } | null>(null);
  const [report, setReport] = useState<HrReportPayload | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [academicYear, setAcademicYear] = useState('2025-26');

  const loadMeta = useCallback(async () => {
    setLoading(true);
    try {
      setMeta(await fetchHrReportsMeta());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadMeta(); }, [loadMeta]);

  const loadReport = useCallback(async (key: string) => {
    setReportLoading(true);
    try {
      setReport(await fetchHrReport(key, { academicYear }));
    } finally {
      setReportLoading(false);
    }
  }, [academicYear]);

  const openReport = (key: string, label: string) => {
    setActiveReport({ key, label });
    void loadReport(key);
  };

  const filteredCatalog = (meta?.catalog ?? []).map((cat) => ({
    ...cat,
    sections: cat.sections.map((sec) => ({
      ...sec,
      reports: sec.reports.filter((r) => {
        if (!search.trim()) return true;
        return r.label.toLowerCase().includes(search.toLowerCase());
      }),
    })).filter((sec) => sec.reports.length > 0),
  })).filter((cat) => cat.sections.length > 0);

  if (loading && !meta) return <AcademicLoading />;

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="HR & Payroll Management › Reports"
        title="HR & Payroll Reports"
        subtitle="Comprehensive reports across attendance, leave, payroll, recruitment, performance, training, exit & onboarding"
        actions={(
          <div className="flex items-center gap-2">
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className={`${am.input} text-xs py-1.5`}
            >
              {['2023-24', '2024-25', '2025-26', '2026-27'].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <button type="button" onClick={() => void loadMeta()} className={am.btnSecondary}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        )}
      />

      <div className={am.content}>
        {meta && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {[
              { label: 'Report Types', value: meta.summary.totalReportTypes },
              { label: 'Active Employees', value: meta.summary.activeEmployees },
              { label: 'Leave Applications', value: meta.summary.leaveApplications },
              { label: 'Payroll Slips', value: meta.summary.payrollSlips },
            ].map((k) => (
              <div key={k.label} className={`${am.card} p-3`}>
                <p className="text-[10px] font-bold text-slate-400 uppercase">{k.label}</p>
                <p className="text-xl font-black text-slate-900 mt-1">{k.value}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-3 items-center mb-4">
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search reports…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`${am.input} pl-9`}
            />
          </div>
          <p className="text-xs text-slate-500 flex items-center gap-1">
            <FileText size={12} />
            Export formats: {meta?.exportFormats.join(', ')}
          </p>
        </div>

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredCatalog.map((cat) => (
            <ReportCategoryCard key={cat.id} category={cat} onSelect={openReport} />
          ))}
        </div>

        {filteredCatalog.length === 0 && (
          <p className="text-center text-slate-400 py-12">No reports match your search.</p>
        )}
      </div>

      {activeReport && (
        <ReportPreviewModal
          report={report}
          loading={reportLoading}
          onClose={() => { setActiveReport(null); setReport(null); }}
          onRefresh={() => void loadReport(activeReport.key)}
        />
      )}
    </AcademicPageShell>
  );
}
