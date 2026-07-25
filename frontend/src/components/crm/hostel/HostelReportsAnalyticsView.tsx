import { useCallback, useEffect, useState } from 'react';
import {
  RefreshCw, FileText, Download, Calendar, Filter, ChevronRight,
  BarChart3, Shield, BedDouble, Wallet, UtensilsCrossed, ArrowLeftRight, Package,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from 'recharts';
import {
  fetchHostelReportsAnalytics,
  generateHostelReport,
  exportHostelReport,
  scheduleHostelReport,
  deleteHostelReportSchedule,
  type HostelReportsAnalytics,
  type HostelReportPreview,
} from '../../../lib/hostelServices';
import { AcademicLoading, AcademicModal, FeeMessage, FeeTabs } from '../FeeFinanceManagement/FeeFinanceUi';

type ReportItem = { id: string; name: string; description: string };

const REPORT_ICONS: Record<string, typeof FileText> = {
  occupancy_vacancy_matrix: BedDouble,
  hostel_fee_defaulters: Wallet,
  mess_consumption_budget: UtensilsCrossed,
  student_movement_register: ArrowLeftRight,
  asset_reconciliation: Package,
};

const TABS = ['Report Builder', 'Dashboard', 'Schedules', 'Audit Trail', 'Compliance'] as const;

export function HostelReportsAnalyticsView() {
  const [data, setData] = useState<HostelReportsAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<string>('Report Builder');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [hostelId, setHostelId] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<ReportItem | null>(null);
  const [preview, setPreview] = useState<HostelReportPreview | null>(null);
  const [generating, setGenerating] = useState(false);
  const [scheduleModal, setScheduleModal] = useState(false);

  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    monthLabel: '',
  });

  const [schedForm, setSchedForm] = useState({
    reportName: '',
    frequency: 'MONTHLY',
    channel: 'EMAIL',
    recipients: 'principal@school.edu',
  });

  const load = useCallback(async (seed = false) => {
    setLoading(true);
    try {
      const result = await fetchHostelReportsAnalytics(seed, academicYear, hostelId || undefined);
      setData(result);
      if (!hostelId && result.hostels[0]) setHostelId(result.hostels[0].id);
      if (result.defaultFilters.dateFrom) {
        setFilters({
          dateFrom: result.defaultFilters.dateFrom ?? '',
          dateTo: result.defaultFilters.dateTo ?? '',
          monthLabel: result.defaultFilters.monthLabel ?? '',
        });
      }
    } finally {
      setLoading(false);
    }
  }, [academicYear, hostelId]);

  useEffect(() => { void load(true); }, [academicYear]);

  const flash = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 6000);
  };

  const handleSelectReport = (report: ReportItem) => {
    setSelectedTemplate(report);
    setPreview(null);
    setSchedForm((f) => ({ ...f, reportName: report.name }));
  };

  const handleGenerate = async () => {
    if (!selectedTemplate) return;
    setGenerating(true);
    try {
      const result = await generateHostelReport(selectedTemplate.id, {
        ...filters,
        academicYear,
        hostelId: hostelId || undefined,
      });
      setPreview(result);
      flash(`Generated ${result.reportName} — ${result.rowCount} rows`, 'success');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Generation failed', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleExport = async (format: string) => {
    if (!selectedTemplate) return;
    try {
      const result = await exportHostelReport(selectedTemplate.id, format, {
        ...filters,
        academicYear,
        hostelId: hostelId || undefined,
      });
      setPreview(result.preview);
      flash(result.message, 'success');
      void load();
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Export failed', 'error');
    }
  };

  const handleSchedule = async () => {
    if (!selectedTemplate) return;
    try {
      const result = await scheduleHostelReport({
        reportTemplate: selectedTemplate.id,
        reportName: schedForm.reportName || selectedTemplate.name,
        frequency: schedForm.frequency,
        channel: schedForm.channel,
        recipients: schedForm.recipients,
        hostelId: hostelId || undefined,
        filters: { ...filters, academicYear },
      });
      setData(result.data);
      setScheduleModal(false);
      flash(result.message, 'success');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Schedule failed', 'error');
    }
  };

  if (loading && !data) return <AcademicLoading />;

  const reports = data?.reportTree.statutory.reports ?? [];
  const kpis = data?.kpis;

  return (
    <div className="flex flex-col h-full gap-4">
      <FeeMessage message={message} type={messageType} />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Reports & Analytics</h2>
          <p className="text-xs text-slate-500">Statutory compliance · Audit registers · Management MIS — exportable reports</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className="text-xs border rounded-lg px-2 py-1.5">
            {(data?.academicYears ?? ['2025-26']).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={hostelId} onChange={(e) => setHostelId(e.target.value)} className="text-xs border rounded-lg px-2 py-1.5">
            <option value="">All Hostels</option>
            {(data?.hostels ?? []).map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
          <button type="button" onClick={() => void load()} className="p-2 border rounded-lg"><RefreshCw size={14} /></button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 text-center text-[9px]">
        <div className="bg-blue-50 rounded-lg p-2 border border-blue-100">
          <p className="font-bold text-lg text-blue-700">{kpis?.occupancyPct ?? '0%'}</p>
          <span className="text-slate-500">Occupancy</span>
        </div>
        <div className="bg-red-50 rounded-lg p-2 border border-red-100">
          <p className="font-bold text-lg text-red-700">{kpis?.feeDefaulters ?? 0}</p>
          <span className="text-slate-500">Fee Defaulters</span>
        </div>
        <div className="bg-amber-50 rounded-lg p-2 border border-amber-100">
          <p className="font-bold text-lg text-amber-700">{kpis?.messExpense ?? '—'}</p>
          <span className="text-slate-500">Mess Expense</span>
        </div>
        <div className="bg-green-50 rounded-lg p-2 border border-green-100">
          <p className="font-bold text-lg text-green-700">{kpis?.movementRecords ?? 0}</p>
          <span className="text-slate-500">Movements</span>
        </div>
        <div className="bg-purple-50 rounded-lg p-2 border border-purple-100">
          <p className="font-bold text-lg text-purple-700">{kpis?.assetReconciliationPct ?? '0%'}</p>
          <span className="text-slate-500">Assets Reconciled</span>
        </div>
        <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
          <p className="font-bold text-lg text-slate-700">{kpis?.reportsGenerated ?? 0}</p>
          <span className="text-slate-500">Reports Run</span>
        </div>
      </div>

      <FeeTabs tabs={[...TABS]} active={tab} onChange={setTab} />

      {tab === 'Report Builder' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-2">
          <div className="lg:col-span-4 space-y-3">
            <div className="bg-white border rounded-xl p-4 shadow-sm">
              <h3 className="text-[11px] font-bold text-slate-800 mb-3 flex items-center gap-1">
                <Shield size={12} className="text-blue-600" /> Statutory & Compliance Reports
              </h3>
              <div className="space-y-2">
                {reports.map((r) => {
                  const Icon = REPORT_ICONS[r.id] ?? FileText;
                  const previewData = data?.reportPreviews.find((p) => p.id === r.id);
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => handleSelectReport(r)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedTemplate?.id === r.id ? 'border-blue-400 bg-blue-50' : 'border-slate-100 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <Icon size={14} className="text-slate-500 mt-0.5 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-bold text-slate-800">{r.name}</p>
                          <p className="text-[8px] text-slate-500 mt-0.5">{r.description}</p>
                          {previewData && Object.keys(previewData.summary).length > 0 && (
                            <p className="text-[8px] text-blue-600 mt-1">
                              {Object.entries(previewData.summary).slice(0, 2).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                            </p>
                          )}
                        </div>
                        <ChevronRight size={12} className="text-slate-400 shrink-0" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedTemplate && (
              <div className="bg-white border rounded-xl p-4 shadow-sm">
                <h3 className="text-[11px] font-bold text-slate-800 mb-3 flex items-center gap-1"><Filter size={12} /> Filters</h3>
                <div className="space-y-2">
                  <input type="date" value={filters.dateFrom} onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))} className="w-full text-xs border rounded px-2 py-1.5" />
                  <input type="date" value={filters.dateTo} onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))} className="w-full text-xs border rounded px-2 py-1.5" />
                  <input value={filters.monthLabel} onChange={(e) => setFilters((f) => ({ ...f, monthLabel: e.target.value }))} placeholder="Month (YYYY-MM)" className="w-full text-xs border rounded px-2 py-1.5" />
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <button type="button" onClick={() => void handleGenerate()} disabled={generating} className="flex-1 text-xs bg-blue-600 text-white py-1.5 rounded-lg font-bold">
                    {generating ? 'Generating...' : 'Generate'}
                  </button>
                  {(data?.exportFormats ?? ['PDF']).map((fmt) => (
                    <button key={fmt} type="button" onClick={() => void handleExport(fmt)} className="text-[10px] border px-2 py-1.5 rounded-lg flex items-center gap-1">
                      <Download size={10} /> {fmt}
                    </button>
                  ))}
                  <button type="button" onClick={() => setScheduleModal(true)} className="text-[10px] border px-2 py-1.5 rounded-lg flex items-center gap-1">
                    <Calendar size={10} /> Schedule
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-8 bg-white border rounded-xl shadow-sm overflow-hidden">
            {!preview ? (
              <div className="p-12 text-center text-slate-400">
                <FileText size={32} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm">Select a report and click Generate</p>
                <p className="text-xs mt-1">Export as PDF, Excel, or CSV for statutory compliance</p>
              </div>
            ) : (
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">{preview.reportName}</h3>
                    <p className="text-[10px] text-slate-500">{preview.rowCount} rows · {preview.description}</p>
                  </div>
                  <div className="flex gap-1">
                    {Object.entries(preview.summary).slice(0, 3).map(([k, v]) => (
                      <span key={k} className="text-[8px] bg-slate-100 px-2 py-1 rounded">{k}: {v}</span>
                    ))}
                  </div>
                </div>
                <div className="overflow-auto max-h-[50vh] border rounded-lg">
                  <table className="w-full text-[9px] text-left">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr className="text-slate-500 border-b">
                        {preview.columns.map((c) => <th key={c} className="p-2 whitespace-nowrap">{c}</th>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {preview.rows.slice(0, 100).map((row, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          {preview.columns.map((c) => <td key={c} className="p-2 whitespace-nowrap">{row[c] ?? '—'}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {preview.rows.length > 100 && (
                    <p className="text-[9px] text-slate-400 p-2 text-center">Showing first 100 of {preview.rows.length} rows</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'Dashboard' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-2">
          <div className="bg-white border rounded-xl p-4 shadow-sm">
            <h3 className="text-[11px] font-bold text-slate-800 mb-3 flex items-center gap-1"><BedDouble size={12} /> Occupancy Overview</h3>
            <div className="flex items-center gap-6">
              <div className="w-28 h-28">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data?.occupancyChart ?? []} dataKey="value" cx="50%" cy="50%" innerRadius={30} outerRadius={50} stroke="none">
                      {(data?.occupancyChart ?? []).map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1 text-[10px]">
                {(data?.occupancyChart ?? []).map((c) => (
                  <div key={c.name} className="flex items-center justify-between gap-4">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: c.color }} />{c.name}</span>
                    <span className="font-bold">{c.value}</span>
                  </div>
                ))}
                <p className="text-slate-500 pt-2">Total beds: {kpis?.totalBeds ?? 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white border rounded-xl p-4 shadow-sm">
            <h3 className="text-[11px] font-bold text-slate-800 mb-3 flex items-center gap-1"><UtensilsCrossed size={12} /> Mess Budget vs. Actual</h3>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.messBudgetChart ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => `₹ ${v.toLocaleString('en-IN')}`} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {(data?.messBudgetChart ?? []).map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[9px] text-slate-500 mt-2">Budget: {kpis?.messBudget} · Outstanding fees: {kpis?.totalOutstanding}</p>
          </div>

          <div className="lg:col-span-2 bg-white border rounded-xl p-4 shadow-sm">
            <h3 className="text-[11px] font-bold text-slate-800 mb-3 flex items-center gap-1"><BarChart3 size={12} /> Report Catalog Summary</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {(data?.reportPreviews ?? []).map((p) => {
                const Icon = REPORT_ICONS[p.id] ?? FileText;
                return (
                  <div key={p.id} className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon size={12} className="text-blue-600" />
                      <p className="text-[10px] font-bold">{p.name}</p>
                    </div>
                    <div className="text-[8px] text-slate-600 space-y-0.5">
                      {Object.entries(p.summary).map(([k, v]) => (
                        <div key={k} className="flex justify-between"><span>{k}</span><span className="font-bold">{v}</span></div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {tab === 'Schedules' && (
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden mt-2">
          <table className="w-full text-[10px] text-left">
            <thead className="bg-slate-50">
              <tr className="text-slate-500 border-b">
                <th className="p-2">Report</th>
                <th>Frequency</th>
                <th>Recipients</th>
                <th>Next Run</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(data?.schedules ?? []).map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="p-2 font-bold">{s.reportName}</td>
                  <td>{s.frequency}</td>
                  <td className="text-slate-500">{s.recipients}</td>
                  <td>{s.nextRunAt ? new Date(s.nextRunAt).toLocaleDateString('en-IN') : '—'}</td>
                  <td><span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-green-50 text-green-700">{s.status}</span></td>
                  <td>
                    <button type="button" onClick={() => void deleteHostelReportSchedule(s.id).then((r) => { setData(r.data); flash('Schedule removed', 'success'); })} className="text-[8px] text-red-600">Delete</button>
                  </td>
                </tr>
              ))}
              {(data?.schedules ?? []).length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-slate-400">No scheduled reports</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'Audit Trail' && (
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden mt-2">
          <table className="w-full text-[10px] text-left">
            <thead className="bg-slate-50">
              <tr className="text-slate-500 border-b">
                <th className="p-2">Report</th>
                <th>Rows</th>
                <th>Format</th>
                <th>By</th>
                <th>When</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(data?.recentRuns ?? []).map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="p-2 font-bold">{r.reportName}</td>
                  <td>{r.rowCount}</td>
                  <td>{r.exportFormat}</td>
                  <td>{r.performedBy}</td>
                  <td className="text-slate-500">{r.relativeTime}</td>
                  <td><span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'Compliance' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-2">
          <div className="bg-white border rounded-xl p-4 shadow-sm">
            <h3 className="text-[11px] font-bold text-slate-800 mb-3">Compliance Bodies</h3>
            <div className="flex flex-wrap gap-2">
              {(data?.complianceBodies ?? []).map((b) => (
                <span key={b} className="text-[10px] font-bold px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">{b}</span>
              ))}
            </div>
            <p className="text-[9px] text-slate-500 mt-3">{data?.erpIntegration}</p>
          </div>
          <div className="bg-white border rounded-xl p-4 shadow-sm">
            <h3 className="text-[11px] font-bold text-slate-800 mb-3">Automation Rules</h3>
            <ul className="space-y-1 text-[9px] text-slate-600">
              {(data?.automationRules ?? []).map((r, i) => (
                <li key={i} className="flex gap-1"><span className="text-blue-500">•</span>{r}</li>
              ))}
            </ul>
          </div>
          <div className="lg:col-span-2 bg-white border rounded-xl p-4 shadow-sm">
            <h3 className="text-[11px] font-bold text-slate-800 mb-3">Role Access Matrix</h3>
            <table className="w-full text-[9px]">
              <thead><tr className="text-slate-500 border-b"><th className="p-2 text-left">Role</th><th className="text-left">Permissions</th></tr></thead>
              <tbody className="divide-y">
                {(data?.roleMatrix ?? []).map((r) => (
                  <tr key={r.role}><td className="p-2 font-bold">{r.role}</td><td className="text-slate-600">{r.permissions}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AcademicModal open={scheduleModal} onClose={() => setScheduleModal(false)} title="Schedule Report">
        <div className="space-y-3 text-sm">
          <input value={schedForm.reportName} onChange={(e) => setSchedForm((f) => ({ ...f, reportName: e.target.value }))} placeholder="Report name" className="w-full border rounded px-2 py-1.5 text-xs" />
          <select value={schedForm.frequency} onChange={(e) => setSchedForm((f) => ({ ...f, frequency: e.target.value }))} className="w-full border rounded px-2 py-1.5 text-xs">
            <option value="DAILY">Daily</option>
            <option value="WEEKLY">Weekly</option>
            <option value="MONTHLY">Monthly</option>
          </select>
          <input value={schedForm.recipients} onChange={(e) => setSchedForm((f) => ({ ...f, recipients: e.target.value }))} placeholder="Recipients (email)" className="w-full border rounded px-2 py-1.5 text-xs" />
          <button type="button" onClick={() => void handleSchedule()} className="w-full bg-blue-600 text-white py-2 rounded-lg text-xs font-bold">Create Schedule</button>
        </div>
      </AcademicModal>
    </div>
  );
}
