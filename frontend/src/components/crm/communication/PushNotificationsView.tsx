import { useCallback, useEffect, useState } from 'react';
import {
  Bell, RefreshCw, Send, Smartphone, CheckCheck, Zap,
  AlertTriangle, Users, Eye, Server, Apple,
} from 'lucide-react';
import {
  fetchPushManagement,
  sendPushNotification,
  simulatePushRead,
  type PushManagement,
} from '../../../lib/communicationServices';
import { AcademicLoading, FeeMessage } from '../FeeFinanceManagement/FeeFinanceUi';

const ROLE_OPTIONS = ['Super Admin', 'Principal', 'Communication Manager', 'Teacher'];
const STATUS_STYLE: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  STANDBY: 'bg-blue-100 text-blue-800',
  DOWN: 'bg-red-100 text-red-700',
  SENT: 'bg-green-100 text-green-800',
  DELIVERED: 'bg-emerald-100 text-emerald-800',
  READ: 'bg-purple-100 text-purple-800',
  FAILED: 'bg-red-100 text-red-700',
  PARTIAL: 'bg-amber-100 text-amber-800',
  SENDING: 'bg-blue-100 text-blue-800',
  QUEUED: 'bg-slate-100 text-slate-700',
};

const PROVIDER_ICON: Record<string, React.ReactNode> = {
  FCM: <Zap size={12} className="text-orange-500" />,
  APNS: <Apple size={12} className="text-slate-700" />,
};

export function PushNotificationsView() {
  const [data, setData] = useState<PushManagement | null>(null);
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [userRole, setUserRole] = useState('Communication Manager');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [sending, setSending] = useState(false);

  const [title, setTitle] = useState('School Alert — Fee Due Reminder');
  const [body, setBody] = useState('Dear Parent, your child\'s Term 2 fee is due by 30th. Pay via the parent app to avoid late fine.');
  const [audienceType, setAudienceType] = useState('PARENT');
  const [classFilter, setClassFilter] = useState('');
  const [deepLink, setDeepLink] = useState('/fees/pay');
  const [category, setCategory] = useState('fee_reminder');

  const load = useCallback(async (seed = false) => {
    setLoading(true);
    try {
      const result = await fetchPushManagement(seed, academicYear, userRole);
      setData(result);
    } finally {
      setLoading(false);
    }
  }, [academicYear, userRole]);

  useEffect(() => { void load(); }, [load]);

  const flash = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 7000);
  };

  const canSend = data?.permissions.canSend ?? false;

  const handleSend = async () => {
    setSending(true);
    try {
      const result = await sendPushNotification({
        title,
        body,
        audienceType,
        classFilter: audienceType === 'CLASS' ? classFilter : undefined,
        deepLink,
        category,
        sentBy: userRole,
        userRole,
        academicYear,
      });
      setData(result.data);
      flash(result.message, result.status === 'FAILED' ? 'error' : 'success');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Push send failed', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleSimulateRead = async (recipientId: string) => {
    try {
      const result = await simulatePushRead(recipientId);
      setData(result.data);
      flash(result.message, 'success');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Simulation failed', 'error');
    }
  };

  if (loading && !data) return <AcademicLoading label="Loading push notifications…" />;

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Push Notifications</h2>
          <p className="text-xs text-slate-500 mt-0.5">Zero-cost instant alerts via FCM &amp; APNs to Student/Parent/Staff mobile apps</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)}
            className="text-xs border border-slate-200 rounded px-2 py-1.5 bg-white">
            {(data?.academicYears ?? ['2025-26']).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={userRole} onChange={(e) => setUserRole(e.target.value)}
            className="text-xs border border-slate-200 rounded px-2 py-1.5 bg-white">
            {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <button type="button" onClick={() => void load(false)} className="p-1.5 border border-slate-200 rounded hover:bg-slate-50">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {message && <FeeMessage message={message} type={messageType} />}

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-2">
        {[
          { label: 'Push Sent', value: data?.kpis.pushSent ?? 0, color: 'text-red-600' },
          { label: 'Delivered', value: data?.kpis.delivered ?? 0, color: 'text-green-600' },
          { label: 'Read', value: data?.kpis.read ?? 0, color: 'text-purple-600' },
          { label: 'Read Rate', value: `${data?.kpis.readRate ?? 0}%`, color: 'text-cyan-600' },
          { label: 'Sent Today', value: data?.kpis.sentToday ?? 0, color: 'text-blue-600' },
          { label: 'Devices', value: data?.kpis.registeredDevices ?? 0, color: 'text-indigo-600' },
          { label: 'Accounts', value: data?.kpis.registeredAccounts ?? 0, color: 'text-slate-600' },
          { label: 'Cost', value: '₹0', color: 'text-emerald-600' },
        ].map((k) => (
          <div key={k.label} className="bg-white rounded-lg border border-slate-200 p-2 text-center">
            <div className={`text-lg font-bold ${k.color}`}>
              {typeof k.value === 'number' ? k.value.toLocaleString('en-IN') : k.value}
            </div>
            <div className="text-[10px] text-slate-500">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Compose Push */}
        <div className="xl:col-span-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-100 flex items-center gap-2">
            <Send size={14} className="text-red-500" />
            <span className="text-xs font-bold text-slate-700">Compose Push</span>
          </div>
          <div className="p-3 space-y-2">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)}
                className="w-full mt-0.5 text-xs border border-slate-200 rounded px-2 py-1.5" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Body</label>
              <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4}
                className="w-full mt-0.5 text-xs border border-slate-200 rounded px-2 py-1.5 resize-none" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase">Audience</label>
              <select value={audienceType} onChange={(e) => setAudienceType(e.target.value)}
                className="w-full mt-0.5 text-xs border border-slate-200 rounded px-2 py-1.5 bg-white">
                {(data?.audienceOptions ?? []).map((a) => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
            </div>
            {audienceType === 'CLASS' && (
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Class / Section Filter</label>
                <input value={classFilter} onChange={(e) => setClassFilter(e.target.value)}
                  placeholder="e.g. 10-A"
                  className="w-full mt-0.5 text-xs border border-slate-200 rounded px-2 py-1.5" />
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Deep Link</label>
                <input value={deepLink} onChange={(e) => setDeepLink(e.target.value)}
                  className="w-full mt-0.5 text-xs border border-slate-200 rounded px-2 py-1.5" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Category</label>
                <input value={category} onChange={(e) => setCategory(e.target.value)}
                  className="w-full mt-0.5 text-xs border border-slate-200 rounded px-2 py-1.5" />
              </div>
            </div>
            {canSend ? (
              <button type="button" onClick={() => void handleSend()} disabled={sending}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50">
                <Bell size={12} /> {sending ? 'Sending…' : 'Send Push Notification'}
              </button>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-2">
                <AlertTriangle size={12} /> Your role cannot send push notifications.
              </div>
            )}
          </div>
        </div>

        {/* Gateways + Device breakdown */}
        <div className="xl:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-100 flex items-center gap-2">
              <Server size={14} className="text-orange-600" />
              <span className="text-xs font-bold text-slate-700">Push Gateway Pool</span>
              <span className="text-[10px] text-slate-400 ml-auto">FCM · APNs · Expo</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="text-left px-3 py-2 font-bold text-slate-600">Gateway</th>
                    <th className="text-left px-3 py-2 font-bold text-slate-600">Provider</th>
                    <th className="text-left px-3 py-2 font-bold text-slate-600">Bundle / Key</th>
                    <th className="text-left px-3 py-2 font-bold text-slate-600">Status</th>
                    <th className="text-right px-3 py-2 font-bold text-slate-600">Today</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.gateways ?? []).map((gw) => (
                    <tr key={gw.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="px-3 py-2">
                        <div className="font-semibold text-slate-800">{gw.name}</div>
                        <div className="text-[10px] text-slate-400">{gw.code}</div>
                      </td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50">
                          {PROVIDER_ICON[gw.provider]} {gw.provider}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        {gw.provider === 'APNS' ? gw.bundleId || '—' : gw.serverKeyMasked}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${STATUS_STYLE[gw.status] ?? ''}`}>
                          {gw.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-mono">{gw.sentToday}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Smartphone size={14} className="text-indigo-600" />
                <span className="text-xs font-bold text-slate-700">Registered Devices</span>
              </div>
              <div className="space-y-1">
                {(data?.deviceBreakdown ?? []).map((d) => (
                  <div key={d.platform} className="flex justify-between text-xs">
                    <span className="text-slate-600">{d.platform}</span>
                    <span className="font-bold text-slate-800">{d.count}</span>
                  </div>
                ))}
                {(data?.deviceBreakdown ?? []).length === 0 && (
                  <p className="text-xs text-slate-400">No devices registered yet.</p>
                )}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Users size={14} className="text-blue-600" />
                <span className="text-xs font-bold text-slate-700">App Accounts</span>
              </div>
              <div className="space-y-1">
                {(data?.accountBreakdown ?? []).map((a) => (
                  <div key={a.role} className="flex justify-between text-xs">
                    <span className="text-slate-600">{a.role}</span>
                    <span className="font-bold text-slate-800">{a.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Campaign history */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-3 py-2 border-b border-slate-100 flex items-center gap-2">
          <Bell size={14} className="text-red-500" />
          <span className="text-xs font-bold text-slate-700">Recent Push Campaigns</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-3 py-2 font-bold text-slate-600">Campaign</th>
                <th className="text-left px-3 py-2 font-bold text-slate-600">Audience</th>
                <th className="text-left px-3 py-2 font-bold text-slate-600">Status</th>
                <th className="text-right px-3 py-2 font-bold text-slate-600">Devices</th>
                <th className="text-right px-3 py-2 font-bold text-slate-600">Read Rate</th>
                <th className="text-left px-3 py-2 font-bold text-slate-600">Recipients</th>
              </tr>
            </thead>
            <tbody>
              {(data?.campaigns ?? []).map((c) => (
                <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/50 align-top">
                  <td className="px-3 py-2">
                    <div className="font-semibold text-slate-800">{c.title}</div>
                    <div className="text-[10px] text-slate-500 line-clamp-1">{c.body}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{c.sentBy} · {new Date(c.sentAt).toLocaleString('en-IN')}</div>
                  </td>
                  <td className="px-3 py-2">
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                      {c.audienceLabel}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${STATUS_STYLE[c.status] ?? ''}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {c.sentCount}/{c.deviceCount}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span className="font-bold text-purple-700">{c.readRate}%</span>
                    <div className="text-[10px] text-slate-400">{c.readCount} read</div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="space-y-1">
                      {c.recipients.map((r) => (
                        <div key={r.id} className="flex items-center gap-1.5">
                          <span className="text-slate-700 truncate max-w-[100px]">{r.accountName}</span>
                          <span className={`px-1 py-0.5 rounded text-[9px] font-bold ${STATUS_STYLE[r.status] ?? ''}`}>
                            {r.status}
                          </span>
                          {r.status === 'DELIVERED' && (
                            <button type="button" onClick={() => void handleSimulateRead(r.id)}
                              className="text-[9px] text-purple-600 hover:underline flex items-center gap-0.5" title="Simulate app open">
                              <Eye size={9} /> Read
                            </button>
                          )}
                          {r.status === 'READ' && <CheckCheck size={10} className="text-purple-500" />}
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
              {(data?.campaigns ?? []).length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-slate-400">No push campaigns yet. Send your first notification above.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Workflow */}
      <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl border border-red-100 p-3">
        <div className="text-xs font-bold text-red-800 mb-2">Push Delivery Workflow</div>
        <div className="flex flex-wrap gap-2">
          {(data?.workflowSteps ?? []).map((step, i) => (
            <div key={step} className="flex items-center gap-1">
              <span className="text-[10px] bg-white border border-red-200 rounded-full px-2 py-0.5 text-red-700 font-medium">
                {i + 1}. {step}
              </span>
              {i < (data?.workflowSteps.length ?? 0) - 1 && <span className="text-red-300">→</span>}
            </div>
          ))}
        </div>
        <ul className="mt-2 space-y-0.5">
          {(data?.complianceNotes ?? []).map((n) => (
            <li key={n} className="text-[10px] text-red-700/80 flex items-start gap-1">
              <span>•</span> {n}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
