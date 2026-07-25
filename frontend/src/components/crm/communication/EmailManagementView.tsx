import { useCallback, useEffect, useState } from 'react';
import {
  Mail, RefreshCw, Send, Server, Eye, MousePointerClick, Zap,
  ArrowRightLeft, AlertTriangle, Play, CheckCircle2, XCircle, BarChart2,
} from 'lucide-react';
import {
  fetchEmailManagement,
  enqueueEmailMessage,
  processEmailQueue,
  updateEmailGateway,
  simulateEmailEngagement,
  type EmailManagement,
} from '../../../lib/communicationServices';
import { AcademicLoading, FeeMessage } from '../FeeFinanceManagement/FeeFinanceUi';

const ROLE_OPTIONS = ['Super Admin', 'Principal', 'Communication Manager', 'Teacher'];
const STATUS_STYLE: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  STANDBY: 'bg-blue-100 text-blue-800',
  DOWN: 'bg-red-100 text-red-700',
  QUEUED: 'bg-amber-100 text-amber-800',
  SENT: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-700',
  PROCESSING: 'bg-blue-100 text-blue-800',
};

const PROVIDER_STYLE: Record<string, string> = {
  SENDGRID: 'bg-blue-50 text-blue-800 border-blue-200',
  SES: 'bg-orange-50 text-orange-800 border-orange-200',
  SMTP: 'bg-slate-50 text-slate-700 border-slate-200',
};

export function EmailManagementView() {
  const [data, setData] = useState<EmailManagement | null>(null);
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [userRole, setUserRole] = useState('Super Admin');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [sending, setSending] = useState(false);

  const [testEmail, setTestEmail] = useState('parent@example.com');
  const [testName, setTestName] = useState('Parent');
  const [testSubject, setTestSubject] = useState('School ERP — Test Email');
  const [testBody, setTestBody] = useState('<p>Dear Parent,</p><p>This is a test email with <a href="https://school.example.com/portal">tracking link</a>.</p><p>Regards,<br/>School ERP</p>');
  const [testType, setTestType] = useState<'TRANSACTIONAL' | 'MARKETING'>('TRANSACTIONAL');

  const load = useCallback(async (seed = false) => {
    setLoading(true);
    try {
      const result = await fetchEmailManagement(seed, academicYear, userRole);
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

  const canManage = data?.permissions.canManageGateways ?? false;

  const handleSend = async () => {
    setSending(true);
    try {
      const result = await enqueueEmailMessage({
        toEmail: testEmail,
        toName: testName,
        subject: testSubject,
        bodyHtml: testBody,
        campaignType: testType,
        academicYear,
        processNow: true,
      });
      setData(result.data);
      flash(result.message, result.status === 'SENT' ? 'success' : 'error');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Send failed', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleProcessQueue = async () => {
    try {
      const result = await processEmailQueue(academicYear);
      setData(result.data);
      flash(`Processed ${result.processed} queued emails.`, 'success');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Queue processing failed', 'error');
    }
  };

  const handleToggle503 = async (gw: EmailManagement['gateways'][0]) => {
    try {
      const result = await updateEmailGateway(gw.id, {
        gatewayName: gw.name,
        fromEmail: gw.fromEmail,
        simulate503: !gw.simulate503,
        userRole,
      });
      setData(result.data);
      flash(`Gateway ${gw.code} simulate-503 ${!gw.simulate503 ? 'enabled' : 'disabled'}.`, 'success');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Update failed', 'error');
    }
  };

  const handleSimulateEngagement = async (trackingId: string) => {
    try {
      const result = await simulateEmailEngagement(trackingId);
      setData(result.data);
      flash(result.message, 'success');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Simulation failed', 'error');
    }
  };

  if (loading && !data) return <AcademicLoading label="Loading email management…" />;

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Email Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">SMTP gateways, high-volume dispatch, open &amp; click tracking</p>
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
          {canManage && (
            <button type="button" onClick={() => void handleProcessQueue()}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-slate-50">
              <Play size={12} /> Process Queue
            </button>
          )}
        </div>
      </div>

      {message && <FeeMessage message={message} type={messageType} />}

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-2">
        {[
          { label: 'Active Gateways', value: data?.kpis.activeGateways ?? 0, color: 'text-blue-600' },
          { label: 'Sent Today', value: data?.kpis.sentToday ?? 0, color: 'text-green-600' },
          { label: 'Queued', value: data?.kpis.queued ?? 0, color: 'text-amber-600' },
          { label: 'Total Sent', value: data?.kpis.sent ?? 0, color: 'text-emerald-600' },
          { label: 'Failed', value: data?.kpis.failed ?? 0, color: 'text-red-600' },
          { label: 'Opens', value: data?.kpis.totalOpens ?? 0, color: 'text-purple-600' },
          { label: 'Clicks', value: data?.kpis.totalClicks ?? 0, color: 'text-indigo-600' },
          { label: 'Open Rate', value: `${data?.kpis.openRate ?? 0}%`, color: 'text-cyan-600' },
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
        {/* SMTP Gateway Pool */}
        <div className="xl:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-100 flex items-center gap-2">
            <Server size={14} className="text-blue-600" />
            <span className="text-xs font-bold text-slate-700">SMTP Gateway Pool</span>
            <span className="text-[10px] text-slate-400 ml-auto">SendGrid · SES · Custom SMTP</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-3 py-2 font-bold text-slate-600">#</th>
                  <th className="text-left px-3 py-2 font-bold text-slate-600">Gateway</th>
                  <th className="text-left px-3 py-2 font-bold text-slate-600">Provider</th>
                  <th className="text-left px-3 py-2 font-bold text-slate-600">From</th>
                  <th className="text-left px-3 py-2 font-bold text-slate-600">Status</th>
                  <th className="text-right px-3 py-2 font-bold text-slate-600">Today</th>
                  <th className="text-right px-3 py-2 font-bold text-slate-600">Limit</th>
                  {canManage && <th className="text-right px-3 py-2 font-bold text-slate-600">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {(data?.gateways ?? []).map((gw) => (
                  <tr key={gw.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-3 py-2 font-mono font-bold">{gw.priority}</td>
                    <td className="px-3 py-2">
                      <div className="font-semibold text-slate-800">{gw.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{gw.code}</div>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex px-2 py-0.5 rounded border text-[10px] font-semibold ${PROVIDER_STYLE[gw.provider] ?? ''}`}>
                        {gw.provider}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="text-slate-700">{gw.fromEmail}</div>
                      <div className="text-[10px] text-slate-400">{gw.smtpHost}:{gw.smtpPort}</div>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold ${STATUS_STYLE[gw.status] ?? ''}`}>
                        {gw.status}
                      </span>
                      {gw.simulate503 && <span className="ml-1 text-[9px] text-red-600 font-semibold">503 SIM</span>}
                      <div className="flex gap-1 mt-0.5">
                        {gw.trackOpens && <span className="text-[9px] text-purple-600 flex items-center gap-0.5"><Eye size={8} /> opens</span>}
                        {gw.trackClicks && <span className="text-[9px] text-indigo-600 flex items-center gap-0.5"><MousePointerClick size={8} /> clicks</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right font-semibold">{gw.sentToday.toLocaleString('en-IN')}</td>
                    <td className="px-3 py-2 text-right text-slate-500">
                      {gw.utilizationPct}%
                      <div className="w-16 h-1 bg-slate-100 rounded ml-auto mt-0.5">
                        <div className="h-1 bg-blue-500 rounded" style={{ width: `${Math.min(gw.utilizationPct, 100)}%` }} />
                      </div>
                    </td>
                    {canManage && (
                      <td className="px-3 py-2 text-right">
                        <button type="button" onClick={() => void handleToggle503(gw)}
                          className="text-[10px] px-2 py-0.5 border border-slate-200 rounded hover:bg-slate-50">
                          {gw.simulate503 ? 'Disable 503' : 'Simulate 503'}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-3 py-2 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-500 flex items-center gap-1">
            <ArrowRightLeft size={10} /> {data?.failoverNote}
          </div>
        </div>

        {/* Test Send */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 space-y-3">
          <div className="flex items-center gap-2">
            <Send size={14} className="text-blue-600" />
            <span className="text-xs font-bold text-slate-700">Send Test Email</span>
          </div>
          <input value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="To email"
            className="w-full text-xs border border-slate-200 rounded px-2 py-1.5" />
          <input value={testName} onChange={(e) => setTestName(e.target.value)} placeholder="Recipient name"
            className="w-full text-xs border border-slate-200 rounded px-2 py-1.5" />
          <input value={testSubject} onChange={(e) => setTestSubject(e.target.value)} placeholder="Subject"
            className="w-full text-xs border border-slate-200 rounded px-2 py-1.5" />
          <select value={testType} onChange={(e) => setTestType(e.target.value as 'TRANSACTIONAL' | 'MARKETING')}
            className="w-full text-xs border border-slate-200 rounded px-2 py-1.5">
            <option value="TRANSACTIONAL">Transactional</option>
            <option value="MARKETING">Marketing</option>
          </select>
          <textarea value={testBody} onChange={(e) => setTestBody(e.target.value)} rows={5}
            className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 font-mono" />
          <button type="button" onClick={() => void handleSend()} disabled={sending || !canManage}
            className="w-full flex items-center justify-center gap-1 py-2 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            <Zap size={12} /> {sending ? 'Dispatching…' : 'Send via SMTP Pool'}
          </button>
          <p className="text-[10px] text-slate-400">{data?.trackingNote}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Dispatch Queue */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-100 flex items-center gap-2">
            <Mail size={14} className="text-emerald-600" />
            <span className="text-xs font-bold text-slate-700">Dispatch Queue</span>
          </div>
          <div className="overflow-x-auto max-h-64">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2">To</th>
                  <th className="text-left px-3 py-2">Subject</th>
                  <th className="text-left px-3 py-2">Type</th>
                  <th className="text-center px-3 py-2"><Eye size={10} /></th>
                  <th className="text-center px-3 py-2"><MousePointerClick size={10} /></th>
                  <th className="text-left px-3 py-2">Status</th>
                  {canManage && <th className="text-right px-3 py-2">Sim</th>}
                </tr>
              </thead>
              <tbody>
                {(data?.recentQueue ?? []).map((q) => (
                  <tr key={q.id} className="border-b border-slate-50">
                    <td className="px-3 py-2 font-mono">{q.toEmail}</td>
                    <td className="px-3 py-2 max-w-[140px] truncate">{q.subject}</td>
                    <td className="px-3 py-2">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded ${q.campaignType === 'MARKETING' ? 'bg-orange-50 text-orange-700' : 'bg-cyan-50 text-cyan-700'}`}>
                        {q.campaignType}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center font-semibold text-purple-700">{q.openCount}</td>
                    <td className="px-3 py-2 text-center font-semibold text-indigo-700">{q.clickCount}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${STATUS_STYLE[q.status] ?? ''}`}>
                        {q.status === 'SENT' && <CheckCircle2 size={10} />}
                        {q.status === 'FAILED' && <XCircle size={10} />}
                        {q.status}
                      </span>
                    </td>
                    {canManage && (
                      <td className="px-3 py-2 text-right">
                        {q.status === 'SENT' && (
                          <button type="button" onClick={() => void handleSimulateEngagement(q.trackingId)}
                            className="text-[9px] text-blue-600 hover:underline">+open/click</button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
                {(data?.recentQueue.length ?? 0) === 0 && (
                  <tr><td colSpan={canManage ? 7 : 6} className="px-3 py-6 text-center text-slate-400">No emails dispatched yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tracking Events */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3">
          <div className="flex items-center gap-2 mb-3">
            <BarChart2 size={14} className="text-purple-600" />
            <span className="text-xs font-bold text-slate-700">Open &amp; Click Tracking</span>
            <span className="ml-auto text-[10px] text-slate-400">Click rate: {data?.kpis.clickRate ?? 0}%</span>
          </div>
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {(data?.recentTrackingEvents ?? []).map((e) => (
              <div key={e.id} className={`rounded-lg p-2 text-[10px] border ${
                e.eventType === 'OPEN' ? 'bg-purple-50 border-purple-100' : 'bg-indigo-50 border-indigo-100'
              }`}>
                <div className="flex items-center gap-1 font-semibold">
                  {e.eventType === 'OPEN' ? <Eye size={10} /> : <MousePointerClick size={10} />}
                  {e.eventType}
                  <span className="text-slate-400 font-normal ml-auto">
                    {new Date(e.createdAt).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="text-slate-600 truncate">{e.subject}</div>
                <div className="text-slate-400">{e.recipient}</div>
                {e.linkUrl && <div className="text-indigo-600 truncate">{e.linkUrl}</div>}
              </div>
            ))}
            {(data?.recentTrackingEvents.length ?? 0) === 0 && (
              <p className="text-[10px] text-slate-400 text-center py-4">
                No tracking events yet. Send a test email and click &quot;+open/click&quot; to simulate engagement.
              </p>
            )}
          </div>
          <div className="mt-3 flex items-start gap-1 text-[10px] text-slate-500 border-t border-slate-100 pt-2">
            <AlertTriangle size={10} className="shrink-0 mt-0.5" />
            {data?.trackingNote}
          </div>
        </div>
      </div>
    </div>
  );
}
