import { useCallback, useEffect, useState } from 'react';
import {
  Clock, RefreshCw, Download, Plus, CheckCircle2, XCircle,
  Shield, QrCode, LogOut, LogIn, AlertTriangle, Ticket,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import {
  fetchGatePassManagement,
  submitHostelGatePassRequest,
  issueHostelGatePass,
  rejectHostelGatePass,
  scanHostelGatePassOut,
  scanHostelGatePassIn,
  exportHostelGatePass,
  type GatePassManagement,
} from '../../../lib/hostelServices';
import { AcademicLoading, AcademicModal, FeeMessage } from '../FeeFinanceManagement/FeeFinanceUi';

const STATUS_STYLE: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-800 border-amber-200',
  ISSUED: 'bg-blue-50 text-blue-800 border-blue-200',
  OUT: 'bg-teal-50 text-teal-800 border-teal-200',
  OVERDUE: 'bg-red-50 text-red-800 border-red-200',
  RETURNED: 'bg-green-50 text-green-800 border-green-200',
  LATE_RETURN: 'bg-orange-50 text-orange-800 border-orange-200',
  REJECTED: 'bg-red-50 text-red-800 border-red-200',
  EXPIRED: 'bg-slate-50 text-slate-600 border-slate-200',
};

export function HostelGatePassView() {
  const [data, setData] = useState<GatePassManagement | null>(null);
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [requestOpen, setRequestOpen] = useState(false);
  const [qrInput, setQrInput] = useState('');
  const [scanMode, setScanMode] = useState<'OUT' | 'IN'>('OUT');

  const [form, setForm] = useState({
    studentProfileId: '',
    purpose: '',
    destination: '',
    maxDurationMinutes: 120,
  });

  const load = useCallback(async (seed = false) => {
    setLoading(true);
    try {
      setData(await fetchGatePassManagement(seed, academicYear, statusFilter));
    } finally {
      setLoading(false);
    }
  }, [academicYear, statusFilter]);

  useEffect(() => { void load(); }, [load]);

  const flash = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 6000);
  };

  const handleRequest = async () => {
    if (!form.studentProfileId || !form.purpose || !form.destination) {
      flash('Student, purpose, and destination are required', 'error');
      return;
    }
    try {
      const result = await submitHostelGatePassRequest({ ...form, academicYear });
      flash(result.message, result.success ? 'success' : 'error');
      setRequestOpen(false);
      await load();
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Failed', 'error');
    }
  };

  const handleScan = async () => {
    if (!qrInput.trim()) {
      flash('Enter or scan QR token', 'error');
      return;
    }
    try {
      const result = scanMode === 'OUT'
        ? await scanHostelGatePassOut(qrInput.trim())
        : await scanHostelGatePassIn(qrInput.trim());
      flash(result.message, 'success');
      setQrInput('');
      await load();
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Scan failed', 'error');
    }
  };

  if (loading && !data) return <AcademicLoading />;

  const perms = data?.permissions;
  const kpis = data?.kpis;

  return (
    <div className="flex flex-col h-full gap-4">
      <FeeMessage message={message} type={messageType} />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Gate Pass</h2>
          <p className="text-xs text-slate-500">Short-term outings · Warden issue · QR scan at gate · Auto-fine on late return</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className="text-xs border rounded-lg px-2 py-1.5">
            <option value="2025-26">2025-26</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-xs border rounded-lg px-2 py-1.5">
            <option value="ALL">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="ISSUED">Issued</option>
            <option value="OUT">Out</option>
            <option value="OVERDUE">Overdue</option>
            <option value="LATE_RETURN">Late Return</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <button type="button" onClick={() => void load()} className="p-2 border rounded-lg"><RefreshCw size={14} /></button>
          {perms?.canExport && (
            <button type="button" onClick={() => void exportHostelGatePass(academicYear, 'PDF', 'Gate Pass Register').then((r) => flash(r.message, 'success'))} className="px-3 py-1.5 text-xs border rounded-lg flex items-center gap-1">
              <Download size={12} /> Export
            </button>
          )}
          {perms?.canRequest && (
            <button type="button" onClick={() => setRequestOpen(true)} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg flex items-center gap-1">
              <Plus size={12} /> Request Pass
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 text-center text-[9px]">
        <div className="bg-amber-50 rounded-lg p-2 border border-amber-100"><p className="font-bold text-lg text-amber-700">{kpis?.pending ?? 0}</p>Pending</div>
        <div className="bg-blue-50 rounded-lg p-2 border border-blue-100"><p className="font-bold text-lg text-blue-700">{kpis?.issued ?? 0}</p>Issued</div>
        <div className="bg-teal-50 rounded-lg p-2 border border-teal-100"><p className="font-bold text-lg text-teal-700">{kpis?.out ?? 0}</p>Out</div>
        <div className="bg-green-50 rounded-lg p-2 border border-green-100"><p className="font-bold text-lg text-green-700">{kpis?.returned ?? 0}</p>Returned</div>
        <div className="bg-orange-50 rounded-lg p-2 border border-orange-100"><p className="font-bold text-lg text-orange-700">{kpis?.lateReturn ?? 0}</p>Late</div>
        <div className="bg-red-50 rounded-lg p-2 border border-red-100"><p className="font-bold text-lg text-red-700">{kpis?.rejected ?? 0}</p>Rejected</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-4 bg-white border rounded-xl p-4 shadow-sm">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Pass Distribution</h3>
          <div className="flex items-center justify-center gap-4">
            <div className="w-28 h-28 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data?.chart ?? []} dataKey="value" cx="50%" cy="50%" innerRadius={30} outerRadius={50} stroke="none">
                    {(data?.chart ?? []).map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-sm font-bold">{kpis?.total ?? 0}</span>
                <span className="text-[7px] text-slate-500">Total</span>
              </div>
            </div>
            <div className="space-y-2 text-[10px]">
              {(data?.chart ?? []).map((c) => (
                <div key={c.name} className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: c.color }} />{c.name}</span>
                  <span className="font-bold">{c.value} ({c.percent})</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 p-2 bg-slate-50 rounded-lg text-[9px] text-slate-600 space-y-1">
            <p className="flex items-center gap-1"><Clock size={10} /> Default max: {data?.defaultMaxDuration ?? 120} min</p>
            <p className="flex items-center gap-1"><AlertTriangle size={10} /> Fine: ₹{data?.finePer15Min ?? 25} per 15 min late</p>
            <p>Max {data?.maxOutingsPerDay ?? 2} outings/student/day</p>
          </div>
          {(data?.lateReturns?.length ?? 0) > 0 && (
            <div className="mt-3">
              <h4 className="text-[10px] font-bold text-red-700 mb-1">Late Returns / Defaulters</h4>
              <ul className="text-[9px] text-red-600 space-y-0.5 max-h-20 overflow-auto">
                {data?.lateReturns.slice(0, 5).map((p) => (
                  <li key={p.id}>{p.studentName} — {p.lateMinutes}m late (₹{p.fineAmount})</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="lg:col-span-8 bg-white border rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-auto max-h-[50vh]">
            <table className="w-full text-[10px] text-left">
              <thead className="bg-slate-50 sticky top-0">
                <tr className="text-slate-500 border-b">
                  <th className="p-2">Student</th>
                  <th>Purpose / Destination</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(data?.passes ?? []).map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="p-2">
                      <p className="font-bold">{p.studentName}</p>
                      <p className="text-slate-500">{p.hostel}</p>
                    </td>
                    <td>
                      <p>{p.purpose}</p>
                      <p className="text-slate-500">{p.destination}</p>
                    </td>
                    <td className="whitespace-nowrap">
                      <span className="flex items-center gap-0.5"><Clock size={9} /> {p.maxDurationMinutes}m</span>
                      {p.validUntil && <span className="text-slate-500">Until {p.validUntil}</span>}
                      {p.isLateActive && p.remainingMins !== null && (
                        <span className="text-red-600 flex items-center gap-0.5"><AlertTriangle size={9} /> Overdue</span>
                      )}
                    </td>
                    <td>
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${STATUS_STYLE[p.status] ?? ''}`}>
                        {p.status.replace(/_/g, ' ')}
                      </span>
                      {p.qrToken && <p className="text-[7px] font-mono text-slate-400 mt-0.5">{p.qrToken.slice(0, 14)}…</p>}
                      {p.fineApplied && <p className="text-[7px] text-orange-600">Fine ₹{p.fineAmount}</p>}
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {p.status === 'PENDING' && perms?.canIssue && (
                          <button type="button" onClick={() => void issueHostelGatePass(p.id).then((r) => { flash(r.message + (r.qrToken ? ` · QR: ${r.qrToken.slice(0, 12)}…` : ''), 'success'); void load(); })} className="text-[8px] bg-green-600 text-white px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            <Ticket size={9} /> Issue
                          </button>
                        )}
                        {p.status === 'PENDING' && perms?.canReject && (
                          <button type="button" onClick={() => void rejectHostelGatePass(p.id, 'Not approved', 'Warden').then((r) => { flash(r.message, 'success'); void load(); })} className="text-[8px] border border-red-300 text-red-700 px-1.5 py-0.5 rounded">
                            <XCircle size={9} />
                          </button>
                        )}
                        {p.qrToken && p.status === 'ISSUED' && (
                          <button type="button" onClick={() => { setQrInput(p.qrToken); setScanMode('OUT'); }} className="text-[8px] border px-1.5 py-0.5 rounded text-teal-700">
                            <LogOut size={9} /> Out
                          </button>
                        )}
                        {p.qrToken && p.status === 'OUT' && (
                          <button type="button" onClick={() => { setQrInput(p.qrToken); setScanMode('IN'); }} className="text-[8px] border px-1.5 py-0.5 rounded text-blue-700">
                            <LogIn size={9} /> In
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {perms?.canScan && (
        <div className="bg-white border rounded-xl p-4 shadow-sm">
          <h3 className="text-[11px] font-bold text-slate-800 mb-2 flex items-center gap-1"><Shield size={12} /> Security Gate Scanner</h3>
          <div className="flex flex-wrap gap-2 mb-2">
            <button type="button" onClick={() => setScanMode('OUT')} className={`text-[10px] px-3 py-1 rounded-lg border ${scanMode === 'OUT' ? 'bg-teal-600 text-white border-teal-600' : ''}`}>
              <LogOut size={10} className="inline mr-1" /> Scan Out
            </button>
            <button type="button" onClick={() => setScanMode('IN')} className={`text-[10px] px-3 py-1 rounded-lg border ${scanMode === 'IN' ? 'bg-blue-600 text-white border-blue-600' : ''}`}>
              <LogIn size={10} className="inline mr-1" /> Scan In
            </button>
          </div>
          <div className="flex gap-2 max-w-lg">
            <input value={qrInput} onChange={(e) => setQrInput(e.target.value)} placeholder="Scan gate pass QR token..." className="flex-1 border rounded-lg px-3 py-2 text-xs font-mono" />
            <button type="button" onClick={() => void handleScan()} className="px-4 py-2 bg-teal-600 text-white text-xs font-bold rounded-lg flex items-center gap-1">
              <QrCode size={12} /> {scanMode === 'OUT' ? 'Verify Exit' : 'Verify Return'}
            </button>
          </div>
        </div>
      )}

      <AcademicModal open={requestOpen} onClose={() => setRequestOpen(false)} title="Request Gate Pass">
        <div className="space-y-3 text-sm">
          <select value={form.studentProfileId} onChange={(e) => setForm((f) => ({ ...f, studentProfileId: e.target.value }))} className="w-full border rounded px-2 py-1.5 text-xs">
            <option value="">Select student...</option>
            {(data?.students ?? []).map((s) => (
              <option key={s.profileId} value={s.profileId}>{s.studentName}</option>
            ))}
          </select>
          <input value={form.purpose} onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))} placeholder="Purpose (e.g. Market visit)" className="w-full border rounded px-2 py-1.5 text-xs" />
          <input value={form.destination} onChange={(e) => setForm((f) => ({ ...f, destination: e.target.value }))} placeholder="Destination" className="w-full border rounded px-2 py-1.5 text-xs" />
          <div>
            <label className="text-[10px] text-slate-500">Max Duration (minutes)</label>
            <input type="number" min={30} max={data?.maxDurationCap ?? 240} value={form.maxDurationMinutes} onChange={(e) => setForm((f) => ({ ...f, maxDurationMinutes: Number(e.target.value) }))} className="w-full border rounded px-2 py-1.5 text-xs" />
            <p className="text-[9px] text-slate-500 mt-0.5">Default {data?.defaultMaxDuration ?? 120} min · No parent approval required</p>
          </div>
          <button type="button" onClick={() => void handleRequest()} className="w-full bg-blue-600 text-white font-bold py-2 rounded-lg text-xs flex items-center justify-center gap-1">
            <CheckCircle2 size={14} /> Submit Request
          </button>
        </div>
      </AcademicModal>
    </div>
  );
}
