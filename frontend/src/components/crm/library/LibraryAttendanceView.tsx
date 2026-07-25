import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DoorOpen, ScanBarcode, RefreshCw, Users, Clock, TrendingUp,
  LogIn, LogOut, Edit3, BarChart3,
} from 'lucide-react';
import {
  fetchLibraryGateAttendance,
  gateScanIn,
  gateScanOut,
  manualGateEntry,
  autoCloseGateSessions,
  type LibraryGateAttendance,
} from '../../../lib/libraryServices';
import { AcademicLoading, AcademicModal, StatusBadge, FeeMessage, FeeTabs } from '../FeeFinanceManagement/FeeFinanceUi';

export function LibraryAttendanceView() {
  const [data, setData] = useState<LibraryGateAttendance | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('Live Gate');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [branchId, setBranchId] = useState('');
  const [scanInput, setScanInput] = useState('');
  const [scanMode, setScanMode] = useState<'IN' | 'OUT'>('IN');
  const [terminalId, setTerminalId] = useState('GATE-01');
  const [scanMethod, setScanMethod] = useState('BARCODE');
  const [manualModal, setManualModal] = useState(false);
  const [manualForm, setManualForm] = useState({ memberCode: '', event: 'IN' as 'IN' | 'OUT', reason: '', performedBy: 'Librarian' });
  const scanRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (seed = false) => {
    setLoading(true);
    try {
      const result = await fetchLibraryGateAttendance(seed, academicYear, branchId || undefined);
      setData(result);
      if (!branchId && result.branches[0]) setBranchId(result.branches[0].id);
      if (!terminalId && result.settings.gateTerminals[0]) setTerminalId(result.settings.gateTerminals[0]);
    } finally {
      setLoading(false);
    }
  }, [academicYear, branchId, terminalId]);

  useEffect(() => { void load(); }, [academicYear]);

  const flash = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 6000);
  };

  const handleScan = async () => {
    if (!scanInput.trim()) return;
    try {
      const result = scanMode === 'IN'
        ? await gateScanIn({ memberCode: scanInput.trim(), terminalId, scanMethod, academicYear })
        : await gateScanOut({ memberCode: scanInput.trim(), terminalId, scanMethod, academicYear });
      setData(result.data);
      flash(result.message, 'success');
      setScanInput('');
      scanRef.current?.focus();
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Scan failed', 'error');
    }
  };

  const handleManual = async () => {
    try {
      const result = await manualGateEntry({ ...manualForm, terminalId: 'MANUAL', academicYear });
      setData(result.data);
      setManualModal(false);
      flash(result.message, 'success');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Manual entry failed', 'error');
    }
  };

  const handleAutoClose = async () => {
    try {
      const result = await autoCloseGateSessions();
      setData(result.data);
      flash(result.message, 'info');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Auto-close failed', 'error');
    }
  };

  if (loading && !data) return <AcademicLoading />;

  const maxPeak = Math.max(...(data?.peakHoursAnalysis.map((p) => p.count) ?? [1]), 1);

  return (
    <div className="flex flex-col space-y-4 h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Library Attendance</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Gate entry/exit logging · RFID, barcode, biometric & QR · feeds dashboard footfall chart
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className="text-xs border rounded px-2 py-1.5">
            {(data?.academicYears ?? ['2025-26']).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="text-xs border rounded px-2 py-1.5">
            {(data?.branches ?? []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <button type="button" onClick={() => setManualModal(true)} className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg font-semibold flex items-center gap-1">
            <Edit3 size={12} /> Manual Override
          </button>
          <button type="button" onClick={() => void handleAutoClose()} className="px-3 py-1.5 text-xs border border-amber-200 text-amber-800 rounded-lg font-semibold">
            Auto-Close Sessions
          </button>
          <button type="button" onClick={() => void load()} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {message && <FeeMessage message={message} type={messageType} />}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Inside Now', value: data?.kpis.currentlyInside ?? 0, icon: <DoorOpen size={16} /> },
          { label: 'Today Visitors', value: data?.kpis.todayVisitors ?? 0, icon: <Users size={16} /> },
          { label: 'Peak Hour', value: data?.kpis.peakHour ?? '—', icon: <Clock size={16} />, small: true },
          { label: 'Monthly Footfall', value: data?.kpis.monthlyFootfall ?? 0, icon: <TrendingUp size={16} /> },
        ].map((k) => (
          <div key={k.label} className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">{k.icon}</div>
            <div>
              <p className="text-[9px] text-slate-500">{k.label}</p>
              <p className={`font-bold text-slate-900 ${k.small ? 'text-sm' : 'text-lg'}`}>{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
          <div className="flex gap-2">
            <button type="button" onClick={() => setScanMode('IN')} className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1 ${scanMode === 'IN' ? 'bg-emerald-600 text-white' : 'border border-slate-200'}`}>
              <LogIn size={12} /> Scan In
            </button>
            <button type="button" onClick={() => setScanMode('OUT')} className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1 ${scanMode === 'OUT' ? 'bg-blue-600 text-white' : 'border border-slate-200'}`}>
              <LogOut size={12} /> Scan Out
            </button>
          </div>
          <input
            ref={scanRef}
            value={scanInput}
            onChange={(e) => setScanInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void handleScan(); }}
            placeholder="Scan member ID / barcode / RFID..."
            className="flex-1 text-sm border rounded-lg px-4 py-2 font-mono w-full"
            autoFocus
          />
          <select value={terminalId} onChange={(e) => setTerminalId(e.target.value)} className="text-xs border rounded px-2 py-2">
            {(data?.settings.gateTerminals ?? ['GATE-01']).map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={scanMethod} onChange={(e) => setScanMethod(e.target.value)} className="text-xs border rounded px-2 py-2">
            {(data?.scanMethods ?? []).map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <button type="button" onClick={() => void handleScan()} className="px-4 py-2 bg-sky-600 text-white text-sm font-semibold rounded-lg flex items-center gap-1">
            <ScanBarcode size={14} /> Scan
          </button>
        </div>
      </div>

      <FeeTabs tabs={['Live Gate', 'Daily Log', 'Reports']} active={tab} onChange={setTab} />

      {tab === 'Live Gate' && (
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-sky-50 to-blue-50 border border-sky-200 rounded-xl p-4">
            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <DoorOpen size={16} className="text-sky-600" /> Live Gate — {data?.liveGate.currentlyInside ?? 0} inside
            </h3>
            <div className="space-y-2 max-h-[360px] overflow-y-auto">
              {(data?.liveGate.recentEntries ?? []).map((e) => (
                <div key={e.id} className="flex items-center justify-between p-2 bg-white/80 rounded-lg text-xs">
                  <div>
                    <p className="font-semibold text-slate-800">{e.memberName}</p>
                    <p className="text-slate-500">{e.memberCode} · {e.className} · In at {e.entryTimeFormatted}</p>
                  </div>
                  <StatusBadge status="ACTIVE" />
                </div>
              ))}
              {!data?.liveGate.recentEntries.length && (
                <p className="text-slate-400 text-center py-8">No one currently inside</p>
              )}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <BarChart3 size={16} className="text-sky-600" /> Today&apos;s Footfall (Dashboard Chart)
            </h3>
            <div className="space-y-2">
              {(data?.attendanceChart ?? []).filter((_, i) => i % 2 === 0 || _.visitors > 0).map((slot) => (
                <div key={slot.time} className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500 w-12">{slot.time}</span>
                  <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sky-500 rounded-full"
                      style={{ width: `${(slot.visitors / maxPeak) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold w-6 text-right">{slot.visitors}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 mt-3">
              Peak: {data?.attendanceSummary.peakTime} · Total: {data?.attendanceSummary.totalVisitors} visitors
            </p>
          </div>
        </div>
      )}

      {tab === 'Daily Log' && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 overflow-x-auto">
          <table className="w-full text-xs min-w-[640px]">
            <thead>
              <tr className="text-slate-500 border-b">
                <th className="text-left py-2">Member</th>
                <th className="text-left">Class</th>
                <th className="text-left">Entry</th>
                <th className="text-left">Exit</th>
                <th className="text-left">Duration</th>
                <th className="text-left">Terminal</th>
                <th className="text-left">Method</th>
                <th className="text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {(data?.dailyVisitorLog ?? []).map((log) => (
                <tr key={log.id} className="border-b border-slate-50">
                  <td className="py-2">
                    <p className="font-medium">{log.memberName}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{log.memberCode}</p>
                  </td>
                  <td>{log.className}</td>
                  <td>{log.entryTimeFormatted}</td>
                  <td>{log.exitTimeFormatted}</td>
                  <td>{log.durationFormatted}</td>
                  <td>{log.terminalId}</td>
                  <td>{log.scanMethod}</td>
                  <td className="text-center"><StatusBadge status={log.status === 'INSIDE' ? 'ACTIVE' : 'COMPLETED'} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'Reports' && (
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h3 className="text-sm font-bold text-slate-800 mb-3">Peak Hours Analysis</h3>
            <div className="space-y-1">
              {(data?.peakHoursAnalysis ?? []).map((p) => (
                <div key={p.hour} className="flex justify-between text-xs py-1 border-b border-slate-50">
                  <span>{p.hour}</span>
                  <span className="font-semibold">{p.count} entries</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h3 className="text-sm font-bold text-slate-800 mb-3">Non-Visitors (This Month)</h3>
            <div className="max-h-[280px] overflow-y-auto space-y-1">
              {(data?.nonVisitorsReport ?? []).map((m) => (
                <div key={m.memberCode} className="flex justify-between text-xs py-1 border-b border-slate-50">
                  <span>{m.memberName}</span>
                  <span className="text-slate-400">{m.className}</span>
                </div>
              ))}
              {!data?.nonVisitorsReport.length && <p className="text-slate-400 text-center py-6">All members visited this month</p>}
            </div>
          </div>
          <div className="lg:col-span-2 bg-sky-50 border border-sky-100 rounded-xl p-4 text-xs text-sky-900 space-y-1">
            <p className="font-semibold">Integration & Automation</p>
            <p>{data?.erpIntegration}</p>
            <p>{data?.mobileSync.join(' · ')}</p>
            <ul className="mt-2">{(data?.automationRules ?? []).map((r) => <li key={r}>· {r}</li>)}</ul>
            <p className="text-sky-700 mt-1">Closing time: {data?.settings.libraryClosingTime}</p>
          </div>
        </div>
      )}

      <AcademicModal open={manualModal} onClose={() => setManualModal(false)} title="Manual Entry Override">
        <div className="space-y-3">
          <label className="block space-y-1">
            <span className="text-xs font-semibold">Member ID / Code *</span>
            <input value={manualForm.memberCode} onChange={(e) => setManualForm({ ...manualForm, memberCode: e.target.value })} className="w-full text-sm border rounded-lg px-3 py-2 font-mono" />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold">Event</span>
            <select value={manualForm.event} onChange={(e) => setManualForm({ ...manualForm, event: e.target.value as 'IN' | 'OUT' })} className="w-full text-sm border rounded-lg px-3 py-2">
              <option value="IN">Entry (IN)</option>
              <option value="OUT">Exit (OUT)</option>
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold">Reason</span>
            <input value={manualForm.reason} onChange={(e) => setManualForm({ ...manualForm, reason: e.target.value })} className="w-full text-sm border rounded-lg px-3 py-2" placeholder="Gate scanner offline, etc." />
          </label>
          <button type="button" onClick={() => void handleManual()} className="w-full py-2 bg-sky-600 text-white text-sm font-semibold rounded-lg">
            Log Manual {manualForm.event === 'IN' ? 'Entry' : 'Exit'}
          </button>
        </div>
      </AcademicModal>
    </div>
  );
}
