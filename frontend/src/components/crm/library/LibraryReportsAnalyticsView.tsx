import { useCallback, useEffect, useState } from 'react';
import {
  RefreshCw, FileText, Download, Calendar, Filter, ChevronRight,
  BarChart3, Shield, AlertTriangle, Trash2, GripVertical,
} from 'lucide-react';
import {
  fetchLibraryReportsAnalytics,
  generateLibraryReport,
  exportLibraryReport,
  scheduleLibraryReport,
  deleteLibraryReportSchedule,
  type LibraryReportsAnalytics,
  type ReportPreview,
} from '../../../lib/libraryServices';
import { AcademicLoading, AcademicModal, StatusBadge, FeeMessage, FeeTabs } from '../FeeFinanceManagement/FeeFinanceUi';

type ReportItem = { id: string; name: string; description: string };

export function LibraryReportsAnalyticsView() {
  const [data, setData] = useState<LibraryReportsAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('Report Builder');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [branchId, setBranchId] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<ReportItem | null>(null);
  const [preview, setPreview] = useState<ReportPreview | null>(null);
  const [generating, setGenerating] = useState(false);
  const [scheduleModal, setScheduleModal] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState('operational');

  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    categoryId: '',
    memberType: '',
  });

  const [schedForm, setSchedForm] = useState({
    reportName: '',
    frequency: 'WEEKLY',
    channel: 'EMAIL',
    recipients: 'principal@school.edu',
  });

  const load = useCallback(async (seed = false) => {
    setLoading(true);
    try {
      const result = await fetchLibraryReportsAnalytics(seed, academicYear, branchId || undefined);
      setData(result);
      if (!branchId && result.branches[0]) setBranchId(result.branches[0].id);
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
  }, [academicYear, branchId]);

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
      const result = await generateLibraryReport(selectedTemplate.id, {
        ...filters,
        academicYear,
        branchId: branchId || undefined,
        categoryId: filters.categoryId || undefined,
        memberType: filters.memberType || undefined,
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
      const result = await exportLibraryReport(selectedTemplate.id, format, {
        ...filters,
        academicYear,
        branchId: branchId || undefined,
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
      const result = await scheduleLibraryReport({
        reportTemplate: selectedTemplate.id,
        reportName: schedForm.reportName || selectedTemplate.name,
        frequency: schedForm.frequency,
        channel: schedForm.channel,
        recipients: schedForm.recipients,
        branchId: branchId || undefined,
        filters: { ...filters, academicYear },
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
      const result = await deleteLibraryReportSchedule(id);
      setData(result.data);
      flash('Schedule removed', 'info');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Delete failed', 'error');
    }
  };

  if (loading && !data) return <AcademicLoading />;

  const tree = data?.reportTree;

  return (
    <div className="flex flex-col space-y-4 h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Reports & Analytics</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            NAAC · NBA · CBSE compliance registers · Custom report builder · Scheduled email delivery
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className="text-xs border rounded px-2 py-1.5">
            {(data?.academicYears ?? ['2025-26']).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="text-xs border rounded px-2 py-1.5">
            {(data?.branches ?? []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <button type="button" onClick={() => void load()} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {message && <FeeMessage message={message} type={messageType} />}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Reports Generated', value: data?.kpis.reportsGenerated ?? 0, icon: <FileText size={16} /> },
          { label: 'Active Schedules', value: data?.kpis.activeSchedules ?? 0, icon: <Calendar size={16} /> },
          { label: 'Compliance Registers', value: data?.kpis.complianceRegisters ?? 0, icon: <Shield size={16} /> },
          { label: 'Analytical Reports', value: data?.kpis.analyticalReports ?? 0, icon: <BarChart3 size={16} /> },
        ].map((k) => (
          <div key={k.label} className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">{k.icon}</div>
            <div>
              <p className="text-[9px] text-slate-500">{k.label}</p>
              <p className="font-bold text-slate-900 text-lg">{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      <FeeTabs tabs={['Report Builder', 'Scheduled Reports', 'Run History', 'Settings']} active={tab} onChange={setTab} />

      {tab === 'Report Builder' && (
        <div className="grid lg:grid-cols-4 gap-4">
          {/* Report Category Tree */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Report Templates</h3>
            {(['operational', 'analytical', 'exception'] as const).map((cat) => {
              const section = tree?.[cat];
              if (!section) return null;
              const Icon = cat === 'operational' ? FileText : cat === 'analytical' ? BarChart3 : AlertTriangle;
              return (
                <div key={cat}>
                  <button
                    type="button"
                    onClick={() => setExpandedCategory(expandedCategory === cat ? '' : cat)}
                    className="w-full flex items-center gap-2 text-xs font-semibold text-slate-700 py-1.5"
                  >
                    <Icon size={14} className="text-teal-600" />
                    {section.label}
                    <ChevronRight size={12} className={`ml-auto transition-transform ${expandedCategory === cat ? 'rotate-90' : ''}`} />
                  </button>
                  {expandedCategory === cat && (
                    <div className="ml-2 space-y-0.5">
                      {section.reports.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => handleSelectReport(r)}
                          className={`w-full text-left text-[11px] px-2 py-1.5 rounded-lg ${selectedTemplate?.id === r.id ? 'bg-teal-100 text-teal-900 font-semibold' : 'hover:bg-slate-50 text-slate-600'}`}
                        >
                          {r.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {'compliance' in (tree?.operational ?? {}) && (
              <p className="text-[9px] text-slate-400 pt-2 border-t">
                Compliance: {(tree?.operational as { compliance?: string[] }).compliance?.join(' · ')}
              </p>
            )}
          </div>

          {/* Filter Panel + Preview */}
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                <Filter size={14} className="text-teal-600" />
                {selectedTemplate ? selectedTemplate.name : 'Select a report template'}
              </h3>
              {selectedTemplate && (
                <p className="text-[10px] text-slate-500 mb-3">{selectedTemplate.description}</p>
              )}
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                <label className="block space-y-1">
                  <span className="text-[10px] font-semibold text-slate-500">Date From</span>
                  <input type="date" value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} className="w-full text-xs border rounded px-2 py-1.5" />
                </label>
                <label className="block space-y-1">
                  <span className="text-[10px] font-semibold text-slate-500">Date To</span>
                  <input type="date" value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} className="w-full text-xs border rounded px-2 py-1.5" />
                </label>
                <label className="block space-y-1">
                  <span className="text-[10px] font-semibold text-slate-500">Category</span>
                  <select value={filters.categoryId} onChange={(e) => setFilters({ ...filters, categoryId: e.target.value })} className="w-full text-xs border rounded px-2 py-1.5">
                    <option value="">All Categories</option>
                    {(data?.categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </label>
                <label className="block space-y-1">
                  <span className="text-[10px] font-semibold text-slate-500">Member Type</span>
                  <select value={filters.memberType} onChange={(e) => setFilters({ ...filters, memberType: e.target.value })} className="w-full text-xs border rounded px-2 py-1.5">
                    <option value="">All Types</option>
                    {(data?.memberTypes ?? []).map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={!selectedTemplate || generating} onClick={() => void handleGenerate()} className="px-4 py-2 bg-teal-600 text-white text-xs font-semibold rounded-lg disabled:opacity-50">
                  Generate Preview
                </button>
                {(data?.exportFormats ?? []).map((fmt) => (
                  <button key={fmt} type="button" disabled={!selectedTemplate} onClick={() => void handleExport(fmt)} className="px-3 py-2 border border-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1 disabled:opacity-50">
                    <Download size={12} /> {fmt}
                  </button>
                ))}
                <button type="button" disabled={!selectedTemplate} onClick={() => setScheduleModal(true)} className="px-3 py-2 border border-teal-200 text-teal-700 text-xs font-semibold rounded-lg flex items-center gap-1 disabled:opacity-50">
                  <Calendar size={12} /> Schedule Email
                </button>
              </div>
            </div>

            {/* Drag-drop builder hint */}
            {data?.dragDropBuilder.enabled && (
              <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-3 flex items-center gap-3">
                <GripVertical size={16} className="text-slate-400" />
                <div className="text-[10px] text-slate-500">
                  <span className="font-semibold text-slate-700">Report Builder: </span>
                  {data.dragDropBuilder.message} — Fields: {data.dragDropBuilder.availableFields.join(', ')}
                </div>
              </div>
            )}

            {/* Data Grid Preview */}
            {preview && (
              <div className="bg-white border border-slate-200 rounded-xl p-4 overflow-x-auto">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-800">{preview.reportName}</h3>
                  <span className="text-[10px] text-slate-400">{preview.rowCount} rows · {preview.generatedAt.slice(0, 16).replace('T', ' ')}</span>
                </div>
                {Object.keys(preview.summary).length > 0 && (
                  <div className="flex flex-wrap gap-3 mb-3 text-[10px]">
                    {Object.entries(preview.summary).map(([k, v]) => (
                      <span key={k} className="bg-teal-50 text-teal-800 px-2 py-1 rounded font-semibold">{k}: {v}</span>
                    ))}
                  </div>
                )}
                <table className="w-full text-xs min-w-[640px]">
                  <thead>
                    <tr className="text-slate-500 border-b">
                      {preview.columns.map((col) => <th key={col} className="text-left py-2 px-2">{col}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.slice(0, 100).map((row, i) => (
                      <tr key={i} className="border-b border-slate-50">
                        {preview.columns.map((col) => (
                          <td key={col} className="py-1.5 px-2">{row[col] ?? '—'}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.rows.length > 100 && (
                  <p className="text-[10px] text-slate-400 mt-2 text-center">Showing first 100 of {preview.rows.length} rows</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'Scheduled Reports' && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 overflow-x-auto">
          <table className="w-full text-xs min-w-[700px]">
            <thead>
              <tr className="text-slate-500 border-b">
                <th className="text-left py-2">Report</th>
                <th className="text-left">Frequency</th>
                <th className="text-left">Channel</th>
                <th className="text-left">Recipients</th>
                <th className="text-left">Cron</th>
                <th className="text-left">Next Run</th>
                <th className="text-center">Status</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {(data?.schedules ?? []).map((s) => (
                <tr key={s.id} className="border-b border-slate-50">
                  <td className="py-2 font-medium">{s.reportName}</td>
                  <td>{s.frequency}</td>
                  <td>{s.channel}</td>
                  <td className="max-w-[160px] truncate">{s.recipients}</td>
                  <td className="font-mono text-[10px]">{s.cronExpr}</td>
                  <td>{s.nextRunAt ? s.nextRunAt.slice(0, 10) : '—'}</td>
                  <td className="text-center"><StatusBadge status={s.status === 'ACTIVE' ? 'ACTIVE' : 'PENDING'} /></td>
                  <td className="text-right">
                    <button type="button" onClick={() => void handleDeleteSchedule(s.id)} className="text-red-600"><Trash2 size={12} /></button>
                  </td>
                </tr>
              ))}
              {!data?.schedules.length && (
                <tr><td colSpan={8} className="text-center text-slate-400 py-8">No scheduled reports — use Report Builder to schedule</td></tr>
              )}
            </tbody>
          </table>
          <p className="text-[10px] text-slate-400 mt-3">
            {(data?.automationRules ?? []).join(' · ')}
          </p>
        </div>
      )}

      {tab === 'Run History' && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 overflow-x-auto">
          <table className="w-full text-xs min-w-[600px]">
            <thead>
              <tr className="text-slate-500 border-b">
                <th className="text-left py-2">Report</th>
                <th className="text-left">Template</th>
                <th className="text-center">Rows</th>
                <th className="text-left">Format</th>
                <th className="text-left">By</th>
                <th className="text-left">When</th>
                <th className="text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {(data?.recentRuns ?? []).map((r) => (
                <tr key={r.id} className="border-b border-slate-50">
                  <td className="py-2 font-medium">{r.reportName}</td>
                  <td className="font-mono text-[10px]">{r.reportTemplate}</td>
                  <td className="text-center">{r.rowCount}</td>
                  <td>{r.exportFormat}</td>
                  <td>{r.performedBy}</td>
                  <td>{r.relativeTime}</td>
                  <td className="text-center"><StatusBadge status="COMPLETED" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'Settings' && (
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h3 className="text-sm font-bold text-slate-800 mb-3">Role Access Matrix</h3>
            <div className="space-y-2">
              {(data?.roleMatrix ?? []).map((r) => (
                <div key={r.role} className="text-xs border-b border-slate-50 py-2">
                  <p className="font-semibold">{r.role}</p>
                  <p className="text-slate-500">{r.permissions}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-teal-50 border border-teal-100 rounded-xl p-4 text-xs text-teal-900 space-y-2">
            <p className="font-semibold">Validation & Integration</p>
            <ul>{(data?.validationRules ?? []).map((r) => <li key={r}>· {r}</li>)}</ul>
            <p className="mt-2">{data?.erpIntegration}</p>
            <p>{data?.mobileSync.join(' · ')}</p>
            <p className="text-teal-700">Export formats: {(data?.exportFormats ?? []).join(', ')}</p>
          </div>
        </div>
      )}

      <AcademicModal open={scheduleModal} onClose={() => setScheduleModal(false)} title="Schedule Report Email">
        <div className="space-y-3">
          <input value={schedForm.reportName} onChange={(e) => setSchedForm({ ...schedForm, reportName: e.target.value })} placeholder="Report name" className="w-full text-sm border rounded-lg px-3 py-2" />
          <div className="grid grid-cols-2 gap-2">
            <select value={schedForm.frequency} onChange={(e) => setSchedForm({ ...schedForm, frequency: e.target.value })} className="text-sm border rounded-lg px-3 py-2">
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly (Monday 8 AM)</option>
              <option value="MONTHLY">Monthly</option>
            </select>
            <select value={schedForm.channel} onChange={(e) => setSchedForm({ ...schedForm, channel: e.target.value })} className="text-sm border rounded-lg px-3 py-2">
              <option value="EMAIL">Email</option>
              <option value="PUSH">Push (Principal App)</option>
            </select>
          </div>
          <input value={schedForm.recipients} onChange={(e) => setSchedForm({ ...schedForm, recipients: e.target.value })} placeholder="Recipients (comma-separated emails)" className="w-full text-sm border rounded-lg px-3 py-2" />
          <p className="text-[10px] text-slate-400">Weekly Defaulters List auto-emails Principal every Monday at 8:00 AM</p>
          <button type="button" onClick={() => void handleSchedule()} className="w-full py-2 bg-teal-600 text-white text-sm font-semibold rounded-lg">
            Create Schedule
          </button>
        </div>
      </AcademicModal>
    </div>
  );
}
