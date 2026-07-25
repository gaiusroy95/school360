import { useCallback, useEffect, useState } from 'react';
import {
  Zap, RefreshCw, Play, Clock, Settings, ChevronRight,
  MessageSquare, CheckCircle2, XCircle, AlertTriangle, Layers,
} from 'lucide-react';
import {
  fetchAutoRemindersManagement,
  updateAutomationRule,
  toggleAutomationRule,
  runAutomationRule,
  runAllAutomations,
  type AutoRemindersManagement,
  type AutomationRule,
} from '../../../lib/communicationServices';
import { AcademicLoading, FeeMessage } from '../FeeFinanceManagement/FeeFinanceUi';

const ROLE_OPTIONS = ['Super Admin', 'Principal', 'Communication Manager', 'Admin'];
const STATUS_STYLE: Record<string, string> = {
  COMPLETED: 'bg-green-100 text-green-800',
  RUNNING: 'bg-blue-100 text-blue-800',
  FAILED: 'bg-red-100 text-red-700',
  SENT: 'bg-green-100 text-green-800',
  QUEUED: 'bg-slate-100 text-slate-700',
  DELIVERED: 'bg-emerald-100 text-emerald-800',
};

const CHANNEL_STYLE: Record<string, string> = {
  WHATSAPP: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  SMS: 'text-blue-700 bg-blue-50 border-blue-200',
  EMAIL: 'text-orange-700 bg-orange-50 border-orange-200',
  PUSH: 'text-purple-700 bg-purple-50 border-purple-200',
};

const MODULE_COLOR: Record<string, string> = {
  'Fees & Finance': 'bg-amber-100 text-amber-800',
  Attendance: 'bg-rose-100 text-rose-800',
  Library: 'bg-indigo-100 text-indigo-800',
  Communication: 'bg-teal-100 text-teal-800',
  Academics: 'bg-violet-100 text-violet-800',
};

type ConfigDraft = {
  name: string;
  description: string;
  triggerType: string;
  channel: string;
  channelFallback: string[];
  templateCode: string;
  templateBody: string;
  cronTime: string;
  offsetDays: number;
};

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${checked ? 'bg-green-500' : 'bg-slate-300'}`}
    >
      <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
  );
}

export function AutoRemindersView() {
  const [data, setData] = useState<AutoRemindersManagement | null>(null);
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [userRole, setUserRole] = useState('Communication Manager');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [runningId, setRunningId] = useState<string | null>(null);
  const [runningAll, setRunningAll] = useState(false);
  const [configRule, setConfigRule] = useState<AutomationRule | null>(null);
  const [draft, setDraft] = useState<ConfigDraft | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (seed = false) => {
    setLoading(true);
    try {
      const result = await fetchAutoRemindersManagement(seed, academicYear, userRole);
      setData(result);
    } finally {
      setLoading(false);
    }
  }, [academicYear, userRole]);

  useEffect(() => { void load(true); }, [load]);

  const flash = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 7000);
  };

  const canManage = data?.permissions.canManage ?? false;
  const canRun = data?.permissions.canRun ?? false;

  const openConfig = (rule: AutomationRule) => {
    setConfigRule(rule);
    setDraft({
      name: rule.name,
      description: rule.description,
      triggerType: rule.triggerType,
      channel: rule.channel,
      channelFallback: [...rule.channelFallback],
      templateCode: rule.templateCode,
      templateBody: rule.templateBody,
      cronTime: rule.cronTime,
      offsetDays: rule.offsetDays,
    });
  };

  const handleToggle = async (rule: AutomationRule) => {
    if (!canManage) { flash('You do not have permission to change automations.', 'error'); return; }
    try {
      const result = await toggleAutomationRule(rule.id, !rule.isActive, userRole);
      setData(result.data);
      flash(result.message, 'success');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Toggle failed', 'error');
    }
  };

  const handleRun = async (id: string) => {
    if (!canRun) { flash('You do not have permission to run automations.', 'error'); return; }
    setRunningId(id);
    try {
      const result = await runAutomationRule(id, userRole);
      setData(result.data);
      flash(result.message, result.status === 'FAILED' ? 'error' : 'success');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Run failed', 'error');
    } finally {
      setRunningId(null);
    }
  };

  const handleRunAll = async () => {
    if (!canRun) { flash('You do not have permission to run automations.', 'error'); return; }
    setRunningAll(true);
    try {
      const result = await runAllAutomations(userRole);
      setData(result.data);
      flash(result.message, 'success');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Run all failed', 'error');
    } finally {
      setRunningAll(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!configRule || !draft) return;
    setSaving(true);
    try {
      const result = await updateAutomationRule(configRule.id, { ...draft, userRole });
      setData(result.data);
      setConfigRule(null);
      setDraft(null);
      flash(result.message, 'success');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleFallback = (ch: string) => {
    if (!draft) return;
    const has = draft.channelFallback.includes(ch);
    setDraft({
      ...draft,
      channelFallback: has
        ? draft.channelFallback.filter((c) => c !== ch)
        : [...draft.channelFallback, ch],
    });
  };

  const showOffset = draft && ['FEE_DUE', 'BOOK_DUE_TOMORROW'].includes(draft.triggerType);

  if (loading && !data) return <AcademicLoading label="Loading automation engine…" />;

  return (
    <div className="flex flex-col space-y-4 h-full relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Zap size={22} className="text-amber-500" />
            Auto Reminders (Automation Engine)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Event-driven triggers — cron → query → recipients → template → queue → dispatch
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white"
          >
            {(data?.academicYears ?? ['2025-26']).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select
            value={userRole}
            onChange={(e) => setUserRole(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white"
          >
            {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <button
            type="button"
            onClick={() => void load()}
            className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
          >
            <RefreshCw size={12} /> Refresh
          </button>
          {canRun && (
            <button
              type="button"
              disabled={runningAll}
              onClick={() => void handleRunAll()}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50"
            >
              <Play size={12} /> {runningAll ? 'Running…' : 'Run All Active'}
            </button>
          )}
        </div>
      </div>

      {message && <FeeMessage message={message} type={messageType} />}

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: 'Total Rules', value: data?.kpis.totalRules ?? 0, color: 'text-slate-800' },
          { label: 'Active', value: data?.kpis.activeRules ?? 0, color: 'text-green-600' },
          { label: 'Inactive', value: data?.kpis.inactiveRules ?? 0, color: 'text-slate-500' },
          { label: 'Runs Today', value: data?.kpis.runsToday ?? 0, color: 'text-blue-600' },
          { label: 'Queued', value: data?.kpis.queued ?? 0, color: 'text-amber-600' },
          { label: 'Sent', value: data?.kpis.sent ?? 0, color: 'text-emerald-600' },
          { label: 'Failed', value: data?.kpis.failed ?? 0, color: 'text-red-600' },
        ].map((k) => (
          <div key={k.label} className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
            <p className="text-[9px] text-slate-500 font-medium">{k.label}</p>
            <p className={`text-lg font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-7 bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Layers size={16} className="text-amber-500" />
              Rules Engine
            </h3>
            <span className="text-[10px] text-slate-500">{data?.kpis.activeRules ?? 0} active</span>
          </div>
          <div className="flex flex-col gap-3">
            {(data?.rules ?? []).map((rule) => (
              <div
                key={rule.id}
                className={`flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border ${rule.isActive ? 'border-green-200 bg-green-50/30' : 'border-slate-200 bg-slate-50/50'}`}
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <Toggle checked={rule.isActive} onChange={() => void handleToggle(rule)} disabled={!canManage} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">{rule.name}</span>
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${MODULE_COLOR[rule.sourceModule] ?? 'bg-slate-100 text-slate-700'}`}>
                        {rule.sourceModule}
                      </span>
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${CHANNEL_STYLE[rule.channel] ?? 'text-slate-600 bg-slate-50'}`}>
                        {rule.channel}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">{rule.description}</p>
                    <div className="flex flex-wrap gap-3 mt-1.5 text-[9px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock size={10} /> Cron {rule.cronTime}
                      </span>
                      {rule.offsetDays > 0 && (
                        <span>T−{rule.offsetDays} day(s)</span>
                      )}
                      {rule.lastRunAt && (
                        <span>
                          Last: {new Date(rule.lastRunAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                          {rule.lastRecipientsCount > 0 && ` · ${rule.lastRecipientsCount} recipients`}
                        </span>
                      )}
                    </div>
                    {rule.channelFallback.length > 0 && (
                      <p className="text-[9px] text-slate-400 mt-1">
                        Fallback: {rule.channelFallback.join(' → ')}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 sm:ml-2">
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => openConfig(rule)}
                      className="flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
                    >
                      <Settings size={12} /> Configure
                    </button>
                  )}
                  {canRun && (
                    <button
                      type="button"
                      disabled={runningId === rule.id}
                      onClick={() => void handleRun(rule.id)}
                      className="flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Play size={12} /> {runningId === rule.id ? '…' : 'Run Now'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="xl:col-span-5 flex flex-col gap-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <h3 className="text-sm font-bold text-slate-800 mb-3">Workflow</h3>
            <ol className="space-y-2">
              {(data?.workflowSteps ?? []).map((step, i) => (
                <li key={step} className="flex items-start gap-2 text-[10px] text-slate-600">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-700 font-bold text-[9px] shrink-0">
                    {i + 1}
                  </span>
                  <span className="pt-0.5">{step}</span>
                  {i < (data?.workflowSteps.length ?? 0) - 1 && (
                    <ChevronRight size={12} className="text-slate-300 shrink-0 mt-1 ml-auto hidden sm:block" />
                  )}
                </li>
              ))}
            </ol>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <h3 className="text-sm font-bold text-slate-800 mb-3">ERP Integrations</h3>
            <ul className="space-y-2">
              {(data?.erpIntegrations ?? []).map((item) => (
                <li key={item} className="flex items-start gap-2 text-[10px] text-slate-600">
                  <CheckCircle2 size={12} className="text-green-500 shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
            <Clock size={14} /> Recent Runs
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="text-slate-500 border-b border-slate-100">
                  <th className="pb-2 text-left font-medium">Rule</th>
                  <th className="pb-2 text-left font-medium">Time</th>
                  <th className="pb-2 text-right font-medium">Found</th>
                  <th className="pb-2 text-right font-medium">Sent</th>
                  <th className="pb-2 text-center font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(data?.recentRuns ?? []).length === 0 && (
                  <tr><td colSpan={5} className="py-4 text-center text-slate-400">No runs yet</td></tr>
                )}
                {(data?.recentRuns ?? []).map((run) => (
                  <tr key={run.id} className="hover:bg-slate-50">
                    <td className="py-2 font-medium text-slate-800 truncate max-w-[120px]">{run.automationName}</td>
                    <td className="py-2 text-slate-600 whitespace-nowrap">
                      {new Date(run.runAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="py-2 text-right">{run.recipientsFound}</td>
                    <td className="py-2 text-right font-bold text-green-700">{run.dispatchedCount}</td>
                    <td className="py-2 text-center">
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${STATUS_STYLE[run.status] ?? 'bg-slate-100 text-slate-700'}`}>
                        {run.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
            <MessageSquare size={14} /> Dispatch Queue
          </h3>
          <div className="overflow-x-auto max-h-[280px] overflow-y-auto">
            <table className="w-full text-[10px]">
              <thead className="sticky top-0 bg-white">
                <tr className="text-slate-500 border-b border-slate-100">
                  <th className="pb-2 text-left font-medium">Rule</th>
                  <th className="pb-2 text-left font-medium">Recipient</th>
                  <th className="pb-2 text-left font-medium">Channel</th>
                  <th className="pb-2 text-center font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(data?.recentQueue ?? []).length === 0 && (
                  <tr><td colSpan={4} className="py-4 text-center text-slate-400">Queue empty</td></tr>
                )}
                {(data?.recentQueue ?? []).map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50">
                    <td className="py-2 font-medium text-slate-800 truncate max-w-[90px]">{q.automationName}</td>
                    <td className="py-2 text-slate-600">
                      <div>{q.recipientName}</div>
                      <div className="text-[9px] text-slate-400">{q.recipientMobile}</div>
                    </td>
                    <td className="py-2">
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${CHANNEL_STYLE[q.channel] ?? ''}`}>
                        {q.channel}{q.failoverUsed ? ' (failover)' : ''}
                      </span>
                    </td>
                    <td className="py-2 text-center">
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${STATUS_STYLE[q.status] ?? 'bg-slate-100'}`}>
                        {q.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {configRule && draft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Settings size={16} /> Configure: {configRule.name}
              </h3>
              <button type="button" onClick={() => { setConfigRule(null); setDraft(null); }} className="text-slate-400 hover:text-slate-600">
                <XCircle size={18} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-[10px] font-medium text-slate-600 block mb-1">Rule Name</label>
                <input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="text-[10px] font-medium text-slate-600 block mb-1">Trigger Type</label>
                <select
                  value={draft.triggerType}
                  onChange={(e) => setDraft({ ...draft, triggerType: e.target.value })}
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2"
                >
                  {(data?.triggerTypes ?? []).map((t) => (
                    <option key={t.value} value={t.value}>{t.label} ({t.module})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-medium text-slate-600 block mb-1">Cron Time (daily)</label>
                  <input
                    type="time"
                    value={draft.cronTime}
                    onChange={(e) => setDraft({ ...draft, cronTime: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2"
                  />
                </div>
                {showOffset && (
                  <div>
                    <label className="text-[10px] font-medium text-slate-600 block mb-1">T-minus (days)</label>
                    <input
                      type="number"
                      min={0}
                      max={30}
                      value={draft.offsetDays}
                      onChange={(e) => setDraft({ ...draft, offsetDays: Number(e.target.value) })}
                      className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2"
                    />
                  </div>
                )}
              </div>
              <div>
                <label className="text-[10px] font-medium text-slate-600 block mb-1">Primary Channel</label>
                <select
                  value={draft.channel}
                  onChange={(e) => setDraft({ ...draft, channel: e.target.value })}
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2"
                >
                  {(data?.channelOptions ?? []).map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-medium text-slate-600 block mb-2">Channel Fallback Order</label>
                <div className="flex flex-wrap gap-2">
                  {(data?.channelOptions ?? []).map((ch) => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => toggleFallback(ch)}
                      className={`text-[10px] px-2.5 py-1 rounded-lg border ${draft.channelFallback.includes(ch) ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-slate-200 text-slate-500'}`}
                    >
                      {ch}
                    </button>
                  ))}
                </div>
                <p className="text-[9px] text-slate-400 mt-1 flex items-center gap-1">
                  <AlertTriangle size={10} /> Try primary channel first, then fallback in order
                </p>
              </div>
              <div>
                <label className="text-[10px] font-medium text-slate-600 block mb-1">Template Code (optional)</label>
                <input
                  value={draft.templateCode}
                  onChange={(e) => setDraft({ ...draft, templateCode: e.target.value })}
                  placeholder="e.g. FEE_REMINDER_SMS"
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="text-[10px] font-medium text-slate-600 block mb-1">Message Template Body</label>
                <textarea
                  value={draft.templateBody}
                  onChange={(e) => setDraft({ ...draft, templateBody: e.target.value })}
                  rows={4}
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 font-mono"
                  placeholder="Use {parentName}, {studentName}, {amount}, etc."
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => { setConfigRule(null); setDraft(null); }}
                className="text-xs px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSaveConfig()}
                className="text-xs px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save Configuration'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
