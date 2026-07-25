import { useCallback, useEffect, useState } from 'react';
import {
  Smartphone, RefreshCw, Send, AlertTriangle, Server, Zap,
  ArrowRightLeft, Ban, Calculator, Play, CheckCircle2, XCircle,
} from 'lucide-react';
import {
  fetchSmsManagement,
  calculateSmsSegments,
  scrubSmsDnd,
  enqueueSmsMessage,
  processSmsQueue,
  updateSmsGateway,
  addSmsDndEntry,
  fetchSmsDndEntries,
  type SmsManagement,
  type SmsSegmentInfo,
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
  DND_SKIPPED: 'bg-slate-100 text-slate-600',
  PROCESSING: 'bg-blue-100 text-blue-800',
};

export function SmsManagementView() {
  const [data, setData] = useState<SmsManagement | null>(null);
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [userRole, setUserRole] = useState('Super Admin');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');

  const [calcText, setCalcText] = useState('Dear Parent, fee of Rs 15000 for Rahul Sharma is due by 30 Apr 2025.');
  const [segments, setSegments] = useState<SmsSegmentInfo | null>(null);

  const [scrubInput, setScrubInput] = useState('9876500000\n9123456789\n9988776655');
  const [scrubResult, setScrubResult] = useState<{ total: number; allowed: number; blocked: number } | null>(null);

  const [testMobile, setTestMobile] = useState('9876543210');
  const [testMessage, setTestMessage] = useState('Test SMS from School ERP — failover enabled.');
  const [testType, setTestType] = useState<'TRANSACTIONAL' | 'PROMOTIONAL'>('TRANSACTIONAL');
  const [sending, setSending] = useState(false);

  const [dndMobile, setDndMobile] = useState('');
  const [dndList, setDndList] = useState<{ id: string; mobile: string; category: string; source: string }[]>([]);

  const load = useCallback(async (seed = false) => {
    setLoading(true);
    try {
      const result = await fetchSmsManagement(seed, academicYear, userRole);
      setData(result);
    } finally {
      setLoading(false);
    }
  }, [academicYear, userRole]);

  const loadDnd = useCallback(async () => {
    const rows = await fetchSmsDndEntries(20);
    setDndList(rows);
  }, []);

  useEffect(() => { void load(true); void loadDnd(); }, [load, loadDnd]);

  useEffect(() => {
    const t = setTimeout(() => {
      void calculateSmsSegments(calcText).then(setSegments).catch(() => setSegments(null));
    }, 300);
    return () => clearTimeout(t);
  }, [calcText]);

  const flash = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 7000);
  };

  const handleScrub = async () => {
    const mobiles = scrubInput.split(/[\n,;]+/).map((m) => m.trim()).filter(Boolean);
    try {
      const result = await scrubSmsDnd(mobiles, 'PROMOTIONAL');
      setScrubResult(result);
      flash(`${result.blocked} blocked, ${result.allowed} clear`, result.blocked > 0 ? 'info' : 'success');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Scrub failed', 'error');
    }
  };

  const handleTestSend = async () => {
    setSending(true);
    try {
      const result = await enqueueSmsMessage({
        mobile: testMobile,
        message: testMessage,
        messageType: testType,
        academicYear,
        processNow: true,
      });
      setData(result.data);
      flash(result.message, result.status === 'SENT' ? 'success' : result.status === 'DND_SKIPPED' ? 'info' : 'error');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Send failed', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleProcessQueue = async () => {
    try {
      const result = await processSmsQueue(academicYear);
      setData(result.data);
      flash(`Processed ${result.processed} queued items.`, 'success');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Queue processing failed', 'error');
    }
  };

  const handleToggle503 = async (gw: SmsManagement['gateways'][0]) => {
    try {
      const result = await updateSmsGateway(gw.id, {
        gatewayName: gw.name,
        simulate503: !gw.simulate503,
        userRole,
      });
      setData(result.data);
      flash(`Gateway ${gw.code} simulate-503 ${!gw.simulate503 ? 'enabled' : 'disabled'}.`, 'success');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Update failed', 'error');
    }
  };

  const handleAddDnd = async () => {
    if (!dndMobile.trim()) return;
    try {
      const result = await addSmsDndEntry(dndMobile, 'PROMOTIONAL', 'Manual entry', userRole);
      setData(result.data);
      setDndMobile('');
      void loadDnd();
      flash(result.message, 'success');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Failed to add DND', 'error');
    }
  };

  if (loading && !data) return <AcademicLoading label="Loading SMS management…" />;

  const canManage = data?.permissions.canManageGateways ?? false;

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">SMS Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">Gateway pool, character limits, DND scrubbing &amp; failover</p>
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

      {(data?.lowCreditAlerts.length ?? 0) > 0 && (
        <div className="space-y-1">
          {data!.lowCreditAlerts.map((a) => (
            <div key={a.gateway} className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
              <AlertTriangle size={14} />
              <strong>{a.gateway}</strong> — {a.credits.toLocaleString('en-IN')} credits remaining (alert at {a.alertAt})
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-2">
        {[
          { label: 'Active Gateways', value: data?.kpis.activeGateways ?? 0, color: 'text-blue-600' },
          { label: 'Total Credits', value: data?.kpis.totalCredits ?? 0, color: 'text-green-600' },
          { label: 'DND Entries', value: data?.kpis.dndEntries ?? 0, color: 'text-slate-600' },
          { label: 'Queued', value: data?.kpis.queued ?? 0, color: 'text-amber-600' },
          { label: 'Sent', value: data?.kpis.sent ?? 0, color: 'text-emerald-600' },
          { label: 'Failed', value: data?.kpis.failed ?? 0, color: 'text-red-600' },
          { label: 'DND Skipped', value: data?.kpis.dndSkipped ?? 0, color: 'text-slate-500' },
        ].map((k) => (
          <div key={k.label} className="bg-white rounded-lg border border-slate-200 p-2 text-center">
            <div className={`text-lg font-bold ${k.color}`}>{k.value.toLocaleString('en-IN')}</div>
            <div className="text-[10px] text-slate-500">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Gateways */}
        <div className="xl:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-100 flex items-center gap-2">
            <Server size={14} className="text-blue-600" />
            <span className="text-xs font-bold text-slate-700">SMS Gateway Pool</span>
            <span className="text-[10px] text-slate-400 ml-auto">Priority-ordered failover</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-3 py-2 font-bold text-slate-600">Priority</th>
                  <th className="text-left px-3 py-2 font-bold text-slate-600">Gateway</th>
                  <th className="text-left px-3 py-2 font-bold text-slate-600">Provider</th>
                  <th className="text-left px-3 py-2 font-bold text-slate-600">Status</th>
                  <th className="text-right px-3 py-2 font-bold text-slate-600">Credits</th>
                  <th className="text-right px-3 py-2 font-bold text-slate-600">Cost/Cr</th>
                  {canManage && <th className="text-right px-3 py-2 font-bold text-slate-600">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {(data?.gateways ?? []).map((gw) => (
                  <tr key={gw.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-3 py-2 font-mono font-bold text-slate-700">#{gw.priority}</td>
                    <td className="px-3 py-2">
                      <div className="font-semibold text-slate-800">{gw.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{gw.code}</div>
                    </td>
                    <td className="px-3 py-2">{gw.provider}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold ${STATUS_STYLE[gw.status] ?? ''}`}>
                        {gw.status}
                      </span>
                      {gw.simulate503 && (
                        <span className="ml-1 text-[9px] text-red-600 font-semibold">503 SIM</span>
                      )}
                    </td>
                    <td className={`px-3 py-2 text-right font-semibold ${gw.lowCredits ? 'text-amber-600' : 'text-slate-700'}`}>
                      {gw.creditsBalance.toLocaleString('en-IN')}
                    </td>
                    <td className="px-3 py-2 text-right">₹{gw.costPerCredit}</td>
                    {canManage && (
                      <td className="px-3 py-2 text-right">
                        <button type="button" onClick={() => handleToggle503(gw)} title="Toggle 503 simulation"
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

        {/* Character calculator */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 space-y-3">
          <div className="flex items-center gap-2">
            <Calculator size={14} className="text-purple-600" />
            <span className="text-xs font-bold text-slate-700">Segment Calculator</span>
          </div>
          <textarea value={calcText} onChange={(e) => setCalcText(e.target.value)} rows={4}
            className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 font-mono" />
          {segments && (
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Encoding</span>
                <span className={`font-bold ${segments.encoding === 'UNICODE' ? 'text-amber-600' : 'text-green-700'}`}>
                  {segments.encoding}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Characters</span>
                <span className="font-bold">{segments.charCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Segments</span>
                <span className="font-bold text-blue-700">{segments.segmentCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Credits Required</span>
                <span className="font-bold text-purple-700">{segments.creditsRequired}</span>
              </div>
              <div className="text-[10px] text-slate-400 border-t border-slate-100 pt-2">
                GSM: {data?.segmentRules.gsm.single} chars (single) / {data?.segmentRules.gsm.concat} (concat)<br />
                Unicode: {data?.segmentRules.unicode.single} chars (single) / {data?.segmentRules.unicode.concat} (concat)
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* DND Scrubber */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 space-y-3">
          <div className="flex items-center gap-2">
            <Ban size={14} className="text-red-600" />
            <span className="text-xs font-bold text-slate-700">DND Scrubber</span>
          </div>
          <textarea value={scrubInput} onChange={(e) => setScrubInput(e.target.value)} rows={4}
            placeholder="One mobile per line"
            className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 font-mono" />
          <button type="button" onClick={() => void handleScrub()}
            className="w-full py-1.5 text-xs font-semibold bg-slate-800 text-white rounded-lg hover:bg-slate-900">
            Scrub Against DND Registry
          </button>
          {scrubResult && (
            <div className="text-[10px] space-y-1">
              <div className="flex justify-between"><span>Total</span><span>{scrubResult.total}</span></div>
              <div className="flex justify-between text-green-700"><span>Clear</span><span>{scrubResult.allowed}</span></div>
              <div className="flex justify-between text-red-600"><span>Blocked</span><span>{scrubResult.blocked}</span></div>
            </div>
          )}
          {canManage && (
            <div className="border-t border-slate-100 pt-2 flex gap-1">
              <input value={dndMobile} onChange={(e) => setDndMobile(e.target.value)} placeholder="Add to DND"
                className="flex-1 text-xs border border-slate-200 rounded px-2 py-1" />
              <button type="button" onClick={() => void handleAddDnd()} className="px-2 py-1 text-xs bg-red-600 text-white rounded">Add</button>
            </div>
          )}
          <div className="max-h-24 overflow-y-auto text-[10px] text-slate-500 space-y-0.5">
            {dndList.map((d) => (
              <div key={d.id} className="flex justify-between">
                <span>{d.mobile}</span>
                <span>{d.category}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Test Send */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 space-y-3">
          <div className="flex items-center gap-2">
            <Send size={14} className="text-blue-600" />
            <span className="text-xs font-bold text-slate-700">Test Dispatch</span>
          </div>
          <input value={testMobile} onChange={(e) => setTestMobile(e.target.value)} placeholder="Mobile"
            className="w-full text-xs border border-slate-200 rounded px-2 py-1.5" />
          <select value={testType} onChange={(e) => setTestType(e.target.value as 'TRANSACTIONAL' | 'PROMOTIONAL')}
            className="w-full text-xs border border-slate-200 rounded px-2 py-1.5">
            <option value="TRANSACTIONAL">Transactional</option>
            <option value="PROMOTIONAL">Promotional (DND checked)</option>
          </select>
          <textarea value={testMessage} onChange={(e) => setTestMessage(e.target.value)} rows={3}
            className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5" />
          <button type="button" onClick={() => void handleTestSend()} disabled={sending || !canManage}
            className="w-full flex items-center justify-center gap-1 py-2 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            <Zap size={12} /> {sending ? 'Dispatching…' : 'Send via Gateway Pool'}
          </button>
          <p className="text-[10px] text-slate-400">Gateway A simulates 503 — watch automatic failover to Gateway B.</p>
        </div>

        {/* Recent Failovers */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 space-y-2">
          <div className="flex items-center gap-2">
            <ArrowRightLeft size={14} className="text-amber-600" />
            <span className="text-xs font-bold text-slate-700">Recent Failovers</span>
          </div>
          {(data?.recentFailovers.length ?? 0) === 0 ? (
            <p className="text-[10px] text-slate-400">No failover events yet. Send a test to trigger Gateway A → B shift.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {data!.recentFailovers.map((f) => (
                <div key={f.id} className="bg-amber-50 border border-amber-100 rounded-lg p-2 text-[10px]">
                  <div className="font-semibold text-amber-800">{f.gatewayCode} — HTTP {f.httpStatus}</div>
                  <div className="text-slate-500 truncate">{f.response}</div>
                  <div className="text-slate-400">{new Date(f.attemptedAt).toLocaleString('en-IN')}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dispatch Queue */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-3 py-2 border-b border-slate-100 flex items-center gap-2">
          <Smartphone size={14} className="text-purple-600" />
          <span className="text-xs font-bold text-slate-700">Dispatch Queue</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-3 py-2 font-bold text-slate-600">Mobile</th>
                <th className="text-left px-3 py-2 font-bold text-slate-600">Message</th>
                <th className="text-left px-3 py-2 font-bold text-slate-600">Encoding</th>
                <th className="text-center px-3 py-2 font-bold text-slate-600">Segments</th>
                <th className="text-center px-3 py-2 font-bold text-slate-600">Credits</th>
                <th className="text-left px-3 py-2 font-bold text-slate-600">Gateway</th>
                <th className="text-left px-3 py-2 font-bold text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {(data?.recentQueue ?? []).map((q) => (
                <tr key={q.id} className="border-b border-slate-50">
                  <td className="px-3 py-2 font-mono">{q.mobile}</td>
                  <td className="px-3 py-2 max-w-[200px] truncate">{q.message}</td>
                  <td className="px-3 py-2">{q.encoding}</td>
                  <td className="px-3 py-2 text-center">{q.segmentCount}</td>
                  <td className="px-3 py-2 text-center">{q.creditsRequired}</td>
                  <td className="px-3 py-2 font-mono">{q.gateway}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${STATUS_STYLE[q.status] ?? ''}`}>
                      {q.status === 'SENT' && <CheckCircle2 size={10} />}
                      {q.status === 'FAILED' && <XCircle size={10} />}
                      {q.status}
                    </span>
                    {q.lastError && <div className="text-[9px] text-red-500 truncate max-w-[120px]">{q.lastError}</div>}
                  </td>
                </tr>
              ))}
              {(data?.recentQueue.length ?? 0) === 0 && (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-400">No dispatch records yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
