import { useCallback, useEffect, useState } from 'react';
import {
  RefreshCw, FileText, Download, Calendar, BarChart3,
  AlertTriangle, Trash2, TrendingUp, Mail, IndianRupee,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, CartesianGrid, Cell, PieChart, Pie,
} from 'recharts';
import {
  fetchCommunicationReports,
  generateCommunicationReport,
  exportCommunicationReport,
  scheduleCommunicationReport,
  deleteCommunicationReportSchedule,
  type CommunicationReportsAnalytics,
  type CommReportPreview,
} from '../../../lib/communicationServices';
import { AcademicLoading, FeeMessage, FeeTabs } from '../FeeFinanceManagement/FeeFinanceUi';

type ReportItem = { id: string; name: string; description: string };

const CATEGORY_META = {
  mis: { label: 'MIS & Cost', icon: <IndianRupee size={14} />, color: 'text-amber-600 bg-amber-50' },
  engagement: { label: 'Engagement', icon: <TrendingUp size={14} />, color: 'text-blue-600 bg-blue-50' },
  bottlenecks: { label: 'Bottlenecks', icon: <AlertTriangle size={14} />, color: 'text-red-600 bg-red-50' },
} as const;

export function CommunicationReportsAnalyticsView() {
  const [data, setData] = useState<CommunicationReportsAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('Report Builder');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [userRole, setUserRole] = useState('Communication Manager');
  const [selectedTemplate, setSelectedTemplate] = useState<ReportItem | null>(null);
  const [preview, setPreview] = useState<CommReportPreview | null>(null);
  const [generating, setGenerating] = useState(false);
  const [scheduleModal, setScheduleModal] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<keyof typeof CATEGORY_META>('mis');

  const [filters, setFilters] = useState({ dateFrom: '', dateTo: '', channel: 'ALL' });
  const [schedForm, setSchedForm] = useState({
    reportName: '',
    frequency: 'MONTHLY',
    channel: 'EMAIL',
    recipients: 'principal@school.edu, accounts@school.edu',
  });

  const load = useCallback(async (seed = false) => {
    setLoading(true);
    try {
      const result = await fetchCommunicationReports(seed, academicYear, userRole);
      setData(result);
      if (result.defaultFilters.dateFrom) {
        setFilters((f) => ({
          ...f,
          dateFrom: result.defaultFilters.dateFrom ?? '',
          dateTo: result.defaultFilters.dateTo ?? '',
        }));
      }
    } finally {
      setLoading(false);
    }
  }, [academicYear, userRole]);

  useEffect(() => { void load(); }, [academicYear, userRole]);

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
      const result = await generateCommunicationReport(
        selectedTemplate.id,
        { ...filters, academicYear },
        userRole,
      );
      setPreview(result);
      flash(`Generated ${result.reportName} — ${result.rowCount} rows`, 'success');
      void load();
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Generation failed', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const downloadContent = (content: string, fileName: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = async (format: string) => {
    if (!selectedTemplate) return;
    try {
      const result = await exportCommunicationReport(
        selectedTemplate.id,
        format,
        { ...filters, academicYear },
        userRole,
      );
      downloadContent(result.content, result.fileName, result.mimeType);
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
      const result = await scheduleCommunicationReport({
        reportTemplate: selectedTemplate.id,
        reportName: schedForm.reportName || selectedTemplate.name,
        frequency: schedForm.frequency,
        channel: schedForm.channel,
        recipients: schedForm.recipients,
        filters: { ...filters, academicYear },
        createdBy: userRole,
        academicYear,
      });
      setData(result.data);
      setScheduleModal(false);
      flash(result.message, 'success');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Schedule failed', 'error');
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    try {
      const result = await deleteCommunicationReportSchedule(id);
      setData(result.data);
      flash('Schedule removed', 'info');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Delete failed', 'error');
    }
  };

  if (loading && !data) return <AcademicLoading label="Loading reports & analytics…" />;

  const tree = data?.reportTree;
  const canExport = data?.permissions.canExport ?? false;
  const canSchedule = data?.permissions.canSchedule ?? false;

  return (
    <div className="flex flex-col space-y-4 h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Reports &amp; Analytics</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            MIS reports — communication expenses, engagement metrics &amp; delivery bottlenecks
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className="text-xs border border-slate-200 rounded-lg px-2 py-1.5">
            {(data?.academicYears ?? ['2025-26']).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={userRole} onChange={(e) => setUserRole(e.target.value)} className="text-xs border border-slate-200 rounded-lg px-2 py-1.5">
            {['Super Admin', 'Principal', 'Finance Head', 'Communication Manager', 'Accountant'].map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <button type="button" onClick={() => void load()} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {message && <FeeMessage message={message} type={messageType} />}

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: 'Gateway Cost', value: `₹${(data?.kpis.totalGatewayCost ?? 0).toLocaleString('en-IN')}`, icon: <IndianRupee size={16} /> },
          { label: 'Messages', value: data?.kpis.totalMessages ?? 0, icon: <Mail size={16} /> },
          { label: 'Delivery Rate', value: `${data?.kpis.deliveryRate ?? 0}%`, icon: <TrendingUp size={16} /> },
          { label: 'Failed', value: data?.kpis.failedCount ?? 0, icon: <AlertTriangle size={16} /> },
          { label: 'Reports Run', value: data?.kpis.reportsGenerated ?? 0, icon: <FileText size={16} /> },
          { label: 'Schedules', value: data?.kpis.activeSchedules ?? 0, icon: <Calendar size={16} /> },
          { label: 'Gateway Alerts', value: data?.kpis.openGatewayAlerts ?? 0, icon: <BarChart3 size={16} /> },
        ].map((k) => (
          <div key={k.label} className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">{k.icon}</div>
            <div>
              <p className="text-[9px] text-slate-500">{k.label}</p>
              <p className="font-bold text-slate-900 text-sm">{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h3 className="text-xs font-bold text-slate-700 mb-3">Expense Trend (6 months)</h3>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={data?.charts.expenseTrend ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 9 }} />
              <Tooltip formatter={(v: number) => [`₹${v}`, 'Cost']} />
              <Area type="monotone" dataKey="cost" stroke="#f59e0b" fill="#fef3c7" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h3 className="text-xs font-bold text-slate-700 mb-3">Engagement Funnel</h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={data?.charts.engagementFunnel ?? []}
                dataKey="value"
                nameKey="stage"
                cx="50%"
                cy="50%"
                outerRadius={55}
                label={(props) => `${String(props.name ?? '')}: ${String(props.value ?? '')}`}
              >
                {(data?.charts.engagementFunnel ?? []).map((e) => (
                  <Cell key={e.stage} fill={e.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h3 className="text-xs font-bold text-slate-700 mb-3">Channel Performance</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={data?.charts.channelPerformance ?? []}>
              <XAxis dataKey="channel" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 9 }} />
              <Tooltip />
              <Bar dataKey="sent" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {(data?.bottlenecks ?? []).length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3">
          <h3 className="text-xs font-bold text-red-800 mb-2 flex items-center gap-2">
            <AlertTriangle size={14} /> Active Delivery Bottlenecks
          </h3>
          <div className="space-y-1">
            {data!.bottlenecks.map((b) => (
              <p key={b.id} className="text-[10px] text-red-700">
                <span className="font-bold">{b.channel}</span> [{b.severity}]: {b.message}
              </p>
            ))}
          </div>
        </div>
      )}

      <FeeTabs tabs={['Report Builder', 'Scheduled Reports', 'Run History', 'Automation']} active={tab} onChange={setTab} />

      {tab === 'Report Builder' && (
        <div className="grid lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Report Templates</h3>
            {(Object.keys(CATEGORY_META) as (keyof typeof CATEGORY_META)[]).map((cat) => {
              const section = tree?.[cat];
              if (!section) return null;
              const meta = CATEGORY_META[cat];
              return (
                <div key={cat}>
                  <button
                    type="button"
                    onClick={() => setExpandedCategory(cat)}
                    className={`w-full flex items-center gap-2 text-left text-[10px] font-bold px-2 py-1.5 rounded-lg ${expandedCategory === cat ? meta.color : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    {meta.icon} {section.label}
                  </button>
                  {expandedCategory === cat && section.reports.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => handleSelectReport(r)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-[10px] mt-1 border ${selectedTemplate?.id === r.id ? 'border-blue-300 bg-blue-50 text-blue-800' : 'border-transparent hover:bg-slate-50 text-slate-700'}`}
                    >
                      <div className="font-semibold">{r.name}</div>
                      <div className="text-[9px] text-slate-400 mt-0.5">{r.description}</div>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>

          <div className="lg:col-span-3 space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <h3 className="text-xs font-bold text-slate-700 mb-3">Filters</h3>
              <div className="grid sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[9px] text-slate-500 block mb-1">Date From</label>
                  <input type="date" value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} className="w-full text-xs border rounded-lg px-2 py-1.5" />
                </div>
                <div>
                  <label className="text-[9px] text-slate-500 block mb-1">Date To</label>
                  <input type="date" value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} className="w-full text-xs border rounded-lg px-2 py-1.5" />
                </div>
                <div>
                  <label className="text-[9px] text-slate-500 block mb-1">Channel</label>
                  <select value={filters.channel} onChange={(e) => setFilters({ ...filters, channel: e.target.value })} className="w-full text-xs border rounded-lg px-2 py-1.5">
                    {(data?.channelOptions ?? ['ALL']).map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="flex items-end gap-2 flex-wrap">
                  <button type="button" disabled={!selectedTemplate || generating} onClick={() => void handleGenerate()} className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                    {generating ? 'Generating…' : 'Generate'}
                  </button>
                  {canExport && selectedTemplate && (
                    <>
                      <button type="button" onClick={() => void handleExport('CSV')} className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center gap-1">
                        <Download size={12} /> CSV
                      </button>
                      <button type="button" onClick={() => void handleExport('Excel')} className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center gap-1">
                        <Download size={12} /> Excel
                      </button>
                    </>
                  )}
                  {canSchedule && selectedTemplate && (
                    <button type="button" onClick={() => setScheduleModal(true)} className="text-xs px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 flex items-center gap-1">
                      <Calendar size={12} /> Schedule
                    </button>
                  )}
                </div>
              </div>
            </div>

            {selectedTemplate && (
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <h3 className="text-sm font-bold text-slate-800 mb-1">{selectedTemplate.name}</h3>
                <p className="text-[10px] text-slate-500 mb-3">{selectedTemplate.description}</p>
                {preview ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[10px]">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600">
                          {preview.columns.map((col) => <th key={col} className="px-2 py-1.5 text-left font-medium">{col}</th>)}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {preview.rows.map((row, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            {preview.columns.map((col) => <td key={col} className="px-2 py-1.5">{String(row[col] ?? '')}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="text-[9px] text-slate-400 mt-2">{preview.rowCount} row(s) · Generated {new Date(preview.generatedAt).toLocaleString('en-IN')}</p>
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400 py-8 text-center">Click Generate to preview report data</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'Scheduled Reports' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-[10px]">
            <thead className="bg-slate-50">
              <tr className="text-slate-600">
                <th className="px-3 py-2 text-left">Report</th>
                <th className="px-3 py-2 text-left">Frequency</th>
                <th className="px-3 py-2 text-left">Recipients</th>
                <th className="px-3 py-2 text-left">Next Run</th>
                <th className="px-3 py-2 text-left">Last Run</th>
                <th className="px-3 py-2 text-center">Status</th>
                <th className="px-3 py-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data?.schedules ?? []).length === 0 && (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-400">No scheduled reports</td></tr>
              )}
              {(data?.schedules ?? []).map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium">{s.reportName}</td>
                  <td className="px-3 py-2">{s.frequency}</td>
                  <td className="px-3 py-2 text-slate-600">{s.recipients}</td>
                  <td className="px-3 py-2">{s.nextRunAt ? new Date(s.nextRunAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—'}</td>
                  <td className="px-3 py-2">{s.lastRunAt ? new Date(s.lastRunAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—'}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${s.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-slate-100'}`}>{s.status}</span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    {canSchedule && (
                      <button type="button" onClick={() => void handleDeleteSchedule(s.id)} className="text-red-500 hover:text-red-700">
                        <Trash2 size={12} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'Run History' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-[10px]">
            <thead className="bg-slate-50">
              <tr className="text-slate-600">
                <th className="px-3 py-2 text-left">Report</th>
                <th className="px-3 py-2 text-left">Template</th>
                <th className="px-3 py-2 text-right">Rows</th>
                <th className="px-3 py-2 text-left">Format</th>
                <th className="px-3 py-2 text-left">By</th>
                <th className="px-3 py-2 text-left">When</th>
                <th className="px-3 py-2 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data?.recentRuns ?? []).map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium">{r.reportName}</td>
                  <td className="px-3 py-2 text-slate-500">{r.reportTemplate}</td>
                  <td className="px-3 py-2 text-right">{r.rowCount}</td>
                  <td className="px-3 py-2">{r.exportFormat}</td>
                  <td className="px-3 py-2">{r.performedBy}</td>
                  <td className="px-3 py-2">{r.relativeTime}</td>
                  <td className="px-3 py-2 text-center">
                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-green-100 text-green-800">{r.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'Automation' && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Mail size={14} className="text-blue-600" /> Monthly Summary Email
            </h3>
            <ul className="space-y-2">
              {(data?.automationNotes ?? []).map((note) => (
                <li key={note} className="text-[10px] text-slate-600 flex items-start gap-2">
                  <span className="text-green-500 shrink-0">•</span>
                  {note}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h3 className="text-sm font-bold text-slate-800 mb-3">Developer Notes</h3>
            <ul className="space-y-2">
              {(data?.developerNotes ?? []).map((note) => (
                <li key={note} className="text-[10px] text-slate-500 font-mono">{note}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {scheduleModal && selectedTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-4 space-y-4">
            <h3 className="text-sm font-bold text-slate-800">Schedule Report</h3>
            <p className="text-[10px] text-slate-500">{selectedTemplate.name}</p>
            <div>
              <label className="text-[9px] text-slate-500 block mb-1">Report Name</label>
              <input value={schedForm.reportName} onChange={(e) => setSchedForm({ ...schedForm, reportName: e.target.value })} className="w-full text-xs border rounded-lg px-2 py-1.5" />
            </div>
            <div>
              <label className="text-[9px] text-slate-500 block mb-1">Frequency</label>
              <select value={schedForm.frequency} onChange={(e) => setSchedForm({ ...schedForm, frequency: e.target.value })} className="w-full text-xs border rounded-lg px-2 py-1.5">
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
              </select>
            </div>
            <div>
              <label className="text-[9px] text-slate-500 block mb-1">Email Recipients (comma-separated)</label>
              <input value={schedForm.recipients} onChange={(e) => setSchedForm({ ...schedForm, recipients: e.target.value })} placeholder="principal@school.edu, accounts@school.edu" className="w-full text-xs border rounded-lg px-2 py-1.5" />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setScheduleModal(false)} className="text-xs px-3 py-1.5 rounded-lg border">Cancel</button>
              <button type="button" onClick={() => void handleSchedule()} className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white">Save Schedule</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
