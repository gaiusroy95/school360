import { useCallback, useEffect, useState } from 'react';
import {
  Search, Filter, Loader2, X, Eye, RefreshCw, FileBarChart, Info, Download,
} from 'lucide-react';
import {
  STUDENT_REPORT_STATUSES,
  fetchStudentReport,
  fetchStudentReports,
  fetchStudentReportsMeta,
  generateStudentReport,
  refreshStudentReport,
  seedStudentReports,
  type StudentReport,
  type StudentReportSummary,
  type ReportTypeOption,
} from '../../../lib/studentReportServices';
import { fetchStudentsMeta } from '../../../lib/studentServices';
import { downloadStudentReportExcel } from '../../../lib/studentReportExcel';

const STATUS_BADGE: Record<string, string> = {
  Draft: 'bg-slate-100 text-slate-500 border-slate-200',
  Pending: 'bg-amber-100 text-amber-700 border-amber-200',
  Open: 'bg-blue-100 text-blue-700 border-blue-200',
  Active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Completed: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  Approved: 'bg-green-100 text-green-800 border-green-200',
  Paid: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  Due: 'bg-red-100 text-red-700 border-red-200',
};

const REPORT_TYPE_DESCRIPTIONS = [
  'Student-wise active / inactive status breakdown',
  'Class-wise results and entrance score toppers',
  'Absent data grouped by class (from profile attendance)',
  'ID card readiness — students with / without photo',
  'RFID / biometrics assignment by class and student',
  'Configurable custom reports from live analytics',
];

export function StudentReportsView() {
  const [summary, setSummary] = useState<StudentReportSummary | null>(null);
  const [reportTypes, setReportTypes] = useState<ReportTypeOption[]>([]);
  const [reports, setReports] = useState<StudentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [classOptions, setClassOptions] = useState<string[]>([]);
  const [filterSectionOptions, setFilterSectionOptions] = useState<string[]>([]);
  const [genSectionOptions, setGenSectionOptions] = useState<string[]>([]);
  const [yearOptions, setYearOptions] = useState<string[]>([]);
  const [viewReport, setViewReport] = useState<StudentReport | null>(null);
  const [message, setMessage] = useState('');

  const [genType, setGenType] = useState('');
  const [genClass, setGenClass] = useState('');
  const [genSection, setGenSection] = useState('');
  const [genYear, setGenYear] = useState('');
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [meta, list] = await Promise.all([
        fetchStudentReportsMeta(),
        fetchStudentReports({
          q: search || undefined,
          status: filterStatus || undefined,
          reportType: filterType || undefined,
          className: filterClass || undefined,
          sectionName: filterSection || undefined,
          academicYear: filterYear || undefined,
        }),
      ]);
      setSummary(meta.summary);
      setReportTypes(meta.reportTypes);
      setReports(list.reports);
      setGenYear((y) => y || meta.defaultAcademicYear);
      setFilterYear((y) => y || meta.defaultAcademicYear);

      if (meta.summary.total === 0) {
        await seedStudentReports(meta.defaultAcademicYear);
        const refreshed = await fetchStudentReports({
          q: search || undefined,
          status: filterStatus || undefined,
          reportType: filterType || undefined,
          className: filterClass || undefined,
          sectionName: filterSection || undefined,
          academicYear: filterYear || meta.defaultAcademicYear,
        });
        setReports(refreshed.reports);
        const meta2 = await fetchStudentReportsMeta();
        setSummary(meta2.summary);
      }
    } finally {
      setLoading(false);
    }
  }, [search, filterStatus, filterType, filterClass, filterSection, filterYear]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void fetchStudentsMeta().then((m) => {
      setClassOptions(m.filters.classes);
      setYearOptions(m.filters.academicYears);
    });
  }, []);

  useEffect(() => {
    void fetchStudentsMeta().then((m) => {
      setFilterSectionOptions(filterClass ? m.filters.sectionsByClass[filterClass] || [] : []);
    });
  }, [filterClass]);

  useEffect(() => {
    void fetchStudentsMeta().then((m) => {
      setGenSectionOptions(genClass ? m.filters.sectionsByClass[genClass] || [] : []);
    });
  }, [genClass]);

  const openView = async (report: StudentReport) => {
    const detail = await fetchStudentReport(report.id);
    setViewReport(detail.report);
  };

  const handleGenerate = async () => {
    if (!genType) {
      setMessage('Select a report type to generate.');
      return;
    }
    setGenerating(true);
    setMessage('');
    try {
      const res = await generateStudentReport({
        reportType: genType,
        academicYear: genYear,
        className: genClass || undefined,
        sectionName: genSection || undefined,
      });
      setMessage(`Generated ${res.report.recordId} — ${res.report.name}`);
      void load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      <div className="p-4 md:p-6 bg-white border-b border-slate-200 shrink-0">
        <div className="mb-4">
          <p className="text-[10px] text-slate-400 font-medium">Student Management &gt; Student Reports</p>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800 mt-0.5">Student Reports</h1>
          <p className="text-xs text-slate-500 mt-1">Generate and view class-wise student reports from live data</p>
        </div>

        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            {[
              { label: 'Total Student Reports', value: summary.total },
              { label: 'Active / Open', value: summary.activeOpen },
              { label: 'Pending', value: summary.pending },
              { label: 'This Month', value: summary.thisMonth },
            ].map((k) => (
              <div key={k.label} className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <p className="text-[10px] font-bold text-slate-500 uppercase">{k.label}</p>
                <p className="text-2xl font-bold text-slate-800">{k.value.toLocaleString('en-IN')}</p>
              </div>
            ))}
          </div>
        )}

        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="flex items-start gap-2">
            <Info size={16} className="text-blue-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-bold text-blue-800 mb-1">Available report types</p>
              <ul className="text-xs text-blue-700 space-y-0.5 list-disc list-inside">
                {REPORT_TYPE_DESCRIPTIONS.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-end p-3 bg-slate-50 border border-slate-200 rounded-xl mb-4">
          <div className="min-w-[180px] flex-1">
            <label className="text-[10px] font-bold text-slate-500 block mb-1">Report Type</label>
            <select value={genType} onChange={(e) => setGenType(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm">
              <option value="">Select type…</option>
              {reportTypes.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="min-w-[120px]">
            <label className="text-[10px] font-bold text-slate-500 block mb-1">Class</label>
            <select value={genClass} onChange={(e) => { setGenClass(e.target.value); setGenSection(''); }} className="w-full border rounded-lg px-2 py-1.5 text-sm">
              <option value="">All Classes</option>
              {classOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="min-w-[100px]">
            <label className="text-[10px] font-bold text-slate-500 block mb-1">Section</label>
            <select value={genSection} onChange={(e) => setGenSection(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" disabled={!genClass}>
              <option value="">All</option>
              {genSectionOptions.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="min-w-[100px]">
            <label className="text-[10px] font-bold text-slate-500 block mb-1">Year</label>
            <select value={genYear} onChange={(e) => setGenYear(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm">
              {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button
            type="button"
            disabled={generating}
            onClick={() => void handleGenerate()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold flex items-center gap-1.5 hover:bg-indigo-700 disabled:opacity-50"
          >
            {generating ? <Loader2 size={14} className="animate-spin" /> : <FileBarChart size={14} />}
            Generate
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search student reports…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <button type="button" onClick={() => setShowFilters((v) => !v)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm flex items-center gap-1.5 hover:bg-slate-50">
            <Filter size={14} /> Filters
          </button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-2 mt-3 p-3 bg-slate-50 rounded-lg border">
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="border rounded-lg px-2 py-1.5 text-sm">
              <option value="">All Report Types</option>
              {reportTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <select value={filterClass} onChange={(e) => { setFilterClass(e.target.value); setFilterSection(''); }} className="border rounded-lg px-2 py-1.5 text-sm">
              <option value="">All Classes</option>
              {classOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filterSection} onChange={(e) => setFilterSection(e.target.value)} className="border rounded-lg px-2 py-1.5 text-sm">
              <option value="">All Sections</option>
              {filterSectionOptions.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className="border rounded-lg px-2 py-1.5 text-sm">
              <option value="">All Years</option>
              {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="border rounded-lg px-2 py-1.5 text-sm">
              <option value="">All Statuses</option>
              {STUDENT_REPORT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button type="button" onClick={() => { setFilterClass(''); setFilterSection(''); setFilterStatus(''); setFilterType(''); setFilterYear(''); }} className="text-xs text-indigo-600 font-medium px-2">Clear</button>
          </div>
        )}
        {message && <p className="text-xs text-indigo-600 mt-2">{message}</p>}
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6">
        {loading ? (
          <div className="flex justify-center p-12"><Loader2 className="animate-spin text-slate-400" /></div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="p-3 text-left text-xs font-bold text-slate-500">Report ID</th>
                  <th className="p-3 text-left text-xs font-bold text-slate-500">Report Name</th>
                  <th className="p-3 text-left text-xs font-bold text-slate-500">Period</th>
                  <th className="p-3 text-left text-xs font-bold text-slate-500">Generated</th>
                  <th className="p-3 text-left text-xs font-bold text-slate-500">Status</th>
                  <th className="p-3 text-right text-xs font-bold text-slate-500">Action</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.id} className="border-t hover:bg-slate-50">
                    <td className="p-3 font-mono text-xs text-slate-600">{r.recordId}</td>
                    <td className="p-3 font-medium text-slate-800">{r.name}</td>
                    <td className="p-3 text-slate-600 text-xs max-w-[200px] truncate">{r.period}</td>
                    <td className="p-3 text-xs text-slate-500">
                      {new Date(r.generatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="p-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${STATUS_BADGE[r.statusLabel] || STATUS_BADGE.Open}`}>
                        {r.statusLabel}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button type="button" onClick={() => void openView(r)} className="text-indigo-600 text-xs font-bold hover:underline">View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {reports.length === 0 && (
              <p className="p-10 text-center text-slate-500 text-sm">
                No reports yet. Use <strong>Generate</strong> above to create a report from live student data.
              </p>
            )}
          </div>
        )}
      </div>

      {viewReport && (
        <ViewReportModal
          report={viewReport}
          onClose={() => setViewReport(null)}
          onRefresh={async () => {
            const res = await refreshStudentReport(viewReport.id);
            setViewReport(res.report);
            void load();
          }}
        />
      )}
    </div>
  );
}

function ViewReportModal({
  report,
  onClose,
  onRefresh,
}: {
  report: StudentReport;
  onClose: () => void;
  onRefresh: () => Promise<void>;
}) {
  const [refreshing, setRefreshing] = useState(false);
  const data = report.data || {};

  const runRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  const summary = (data.summary || {}) as Record<string, number | string>;
  const rows = (data.rows || []) as Record<string, unknown>[];
  const toppers = (data.toppers || []) as Record<string, unknown>[];
  const classBreakdown = (data.classBreakdown || data.classResults || data.classStats || []) as Record<string, unknown>[];
  const breakdownColumns = classBreakdown.length > 0
    ? Object.keys(classBreakdown[0]).filter((col) => col !== 'students')
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-start p-4 border-b">
          <div>
            <h3 className="font-bold text-slate-800">{report.recordId} — {report.name}</h3>
            <p className="text-xs text-slate-500 mt-1">{report.reportTypeLabel} · {report.period}</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Generated {new Date(report.generatedAt).toLocaleString('en-IN')}
            </p>
          </div>
          <button type="button" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          {Object.keys(summary).length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Object.entries(summary).map(([k, v]) => (
                <div key={k} className="bg-slate-50 border rounded-lg p-3">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">{k.replace(/([A-Z])/g, ' $1')}</p>
                  <p className="text-lg font-bold text-slate-800">{String(v)}</p>
                </div>
              ))}
            </div>
          )}

          {classBreakdown.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-600 mb-2">Class Breakdown</h4>
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50">
                    <tr>
                      {breakdownColumns.map((col) => (
                        <th key={col} className="p-2 text-left font-bold text-slate-500 capitalize">{col.replace(/([A-Z])/g, ' $1')}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {classBreakdown.map((row, i) => (
                      <tr key={i} className="border-t">
                        {breakdownColumns.map((col) => (
                          <td key={col} className="p-2">{String(row[col] ?? '—')}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {toppers.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-600 mb-2">Toppers</h4>
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="p-2 text-left">Rank</th>
                      <th className="p-2 text-left">Name</th>
                      <th className="p-2 text-left">Class</th>
                      <th className="p-2 text-left">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {toppers.map((t, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2">{String(t.rank ?? i + 1)}</td>
                        <td className="p-2 font-medium">{String(t.name ?? '')}</td>
                        <td className="p-2">{String(t.classGroup ?? '')}</td>
                        <td className="p-2">{String(t.percentage ?? t.score ?? '')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {rows.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-600 mb-2">Student Rows ({rows.length})</h4>
              <div className="border rounded-lg overflow-x-auto max-h-[280px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      {Object.keys(rows[0]).map((col) => (
                        <th key={col} className="p-2 text-left font-bold text-slate-500 capitalize">{col.replace(/([A-Z])/g, ' $1')}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 100).map((row, i) => (
                      <tr key={i} className="border-t">
                        {Object.values(row).map((val, j) => (
                          <td key={j} className="p-2">{typeof val === 'boolean' ? (val ? 'Yes' : 'No') : String(val ?? '—')}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > 100 && (
                  <p className="text-xs text-amber-600 p-2 bg-amber-50 border-t">
                    Preview shows first 100 of {rows.length.toLocaleString('en-IN')} students. Use <strong>Download Excel</strong> for the full list.
                  </p>
                )}
              </div>
            </div>
          )}

          {rows.length === 0 && toppers.length === 0 && classBreakdown.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-6">No detailed rows in this report. Try refreshing to rebuild from live data.</p>
          )}
        </div>

        <div className="p-4 border-t flex flex-wrap justify-between gap-2">
          <button
            type="button"
            disabled={refreshing}
            onClick={() => void runRefresh()}
            className="px-4 py-2 border rounded-lg text-sm flex items-center gap-1 disabled:opacity-50"
          >
            {refreshing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Refresh Data
          </button>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => downloadStudentReportExcel(report)}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold flex items-center gap-1 hover:bg-emerald-700"
            >
              <Download size={14} />
              Download Excel
              {rows.length > 0 ? ` (${rows.length.toLocaleString('en-IN')})` : ''}
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg text-sm flex items-center gap-1">
              <Eye size={14} /> Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
