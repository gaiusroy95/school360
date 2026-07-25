import { useCallback, useEffect, useState } from 'react';
import {
  UserCheck, LogIn, LogOut, Shield, QrCode, RefreshCw, Download,
  AlertTriangle, CheckCircle2, XCircle, KeyRound, Clock, Users,
} from 'lucide-react';
import {
  fetchVisitorManagement,
  createHostelVisitorEntry,
  verifyHostelVisitorOtp,
  logHostelVisitorExit,
  approveHostelVisitor,
  overrideHostelVisitor,
  reviewHostelPreRegistration,
  exportHostelVisitors,
  type VisitorManagement,
} from '../../../lib/hostelServices';
import { AcademicLoading, AcademicModal, FeeMessage } from '../FeeFinanceManagement/FeeFinanceUi';

const STATUS_COLORS: Record<string, string> = {
  INSIDE: 'text-green-700 bg-green-50 border-green-200',
  EXITED: 'text-slate-600 bg-slate-50 border-slate-200',
  PENDING_OTP: 'text-amber-700 bg-amber-50 border-amber-200',
  PENDING_WARDEN: 'text-purple-700 bg-purple-50 border-purple-200',
  OVERSTAYED: 'text-red-700 bg-red-50 border-red-200',
  REJECTED: 'text-red-700 bg-red-50 border-red-200',
};

export function VisitorManagementView() {
  const [data, setData] = useState<VisitorManagement | null>(null);
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [hostelId, setHostelId] = useState('ALL');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [otpModal, setOtpModal] = useState<{ logId: string; demoOtp?: string } | null>(null);
  const [otpInput, setOtpInput] = useState('');
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    hostelId: '',
    studentProfileId: '',
    studentName: '',
    visitorName: '',
    visitorPhone: '',
    visitorType: 'PARENT',
    purpose: '',
    qrToken: '',
    canTakeStudentOut: false,
  });

  const load = useCallback(async (seed = false) => {
    setLoading(true);
    try {
      const result = await fetchVisitorManagement(seed, academicYear, hostelId);
      setData(result);
      if (!form.hostelId && result.hostels[0]) {
        setForm((f) => ({ ...f, hostelId: result.hostels[0].id }));
      }
    } finally {
      setLoading(false);
    }
  }, [academicYear, hostelId, form.hostelId]);

  useEffect(() => { void load(true); }, [load]);

  const flash = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 6000);
  };

  const handleQuickEntry = async () => {
    if (!form.visitorName || !form.studentName || !form.visitorPhone) {
      flash('Visitor name, student, and phone are required', 'error');
      return;
    }
    setSaving(true);
    try {
      const result = await createHostelVisitorEntry({
        ...form,
        gateDeviceId: 'TABLET-GATE-01',
        gateIpAddress: '192.168.1.100',
        academicYear,
      });
      flash(result.message + (result.notifications ? ` — ${result.notifications.join('; ')}` : ''), 'success');
      if (result.demoOtp && result.logId) {
        setOtpModal({ logId: result.logId, demoOtp: result.demoOtp });
        setOtpInput(result.demoOtp);
      }
      setForm((f) => ({ ...f, visitorName: '', visitorPhone: '', purpose: '', qrToken: '' }));
      await load();
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Entry failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpModal) return;
    setSaving(true);
    try {
      const result = await verifyHostelVisitorOtp(otpModal.logId, otpInput);
      flash(result.message, 'success');
      setOtpModal(null);
      await load();
    } catch (e) {
      flash(e instanceof Error ? e.message : 'OTP failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleExit = async (logId: string) => {
    try {
      const result = await logHostelVisitorExit(logId);
      flash(result.message, 'success');
      await load();
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Failed', 'error');
    }
  };

  const handleApprove = async (logId: string, action: 'APPROVE' | 'REJECT') => {
    try {
      const result = await approveHostelVisitor(logId, action);
      flash(result.message, 'success');
      if (result.demoOtp) setOtpInput(result.demoOtp);
      await load();
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Failed', 'error');
    }
  };

  const handleOverride = async (logId: string) => {
    try {
      const result = await overrideHostelVisitor(logId, 'Warden manual override — OTP unavailable');
      flash(result.message, 'success');
      await load();
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Failed', 'error');
    }
  };

  const handlePreRegReview = async (id: string, action: 'APPROVE' | 'REJECT') => {
    try {
      const result = await reviewHostelPreRegistration(id, action);
      flash(result.message, 'success');
      await load();
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Failed', 'error');
    }
  };

  const selectResident = (profileId: string, studentName: string, hId: string) => {
    setForm((f) => ({ ...f, studentProfileId: profileId, studentName, hostelId: hId || f.hostelId }));
  };

  if (loading && !data) return <AcademicLoading />;

  const perms = data?.permissions;

  return (
    <div className="flex flex-col h-full gap-4">
      <FeeMessage message={message} type={messageType} />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Visitor Management</h2>
          <p className="text-xs text-slate-500">Digital visitor log · OTP verification · Pre-approved QR fast-track</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-600 font-medium">Today: {data?.visitDate}</span>
          <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className="text-xs border rounded-lg px-2 py-1.5">
            <option value="2025-26">2025-26</option>
          </select>
          <select value={hostelId} onChange={(e) => setHostelId(e.target.value)} className="text-xs border rounded-lg px-2 py-1.5">
            <option value="ALL">All Hostels</option>
            {(data?.hostels ?? []).map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
          <button type="button" onClick={() => void load()} className="p-2 border rounded-lg"><RefreshCw size={14} /></button>
          <button type="button" onClick={() => void exportHostelVisitors(academicYear, 'PDF', 'Daily Visitor Register').then((r) => flash(r.message, 'success'))} className="px-3 py-1.5 text-xs border rounded-lg flex items-center gap-1">
            <Download size={12} /> Export
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
        {[
          { label: 'Today', value: data?.kpis.visitorsToday ?? 0, icon: <Users size={14} /> },
          { label: 'Inside', value: data?.kpis.currentlyInside ?? 0, icon: <LogIn size={14} /> },
          { label: 'Exited', value: data?.kpis.exitedToday ?? 0, icon: <LogOut size={14} /> },
          { label: 'Pending OTP', value: data?.kpis.pendingOtp ?? 0, icon: <KeyRound size={14} /> },
          { label: 'Overstayed', value: data?.kpis.overstayed ?? 0, icon: <AlertTriangle size={14} /> },
          { label: 'Guardians', value: data?.kpis.authorizedGuardians ?? 0, icon: <UserCheck size={14} /> },
          { label: 'Blacklisted', value: data?.kpis.blacklisted ?? 0, icon: <Shield size={14} /> },
        ].map((k) => (
          <div key={k.label} className="bg-white border rounded-xl p-2.5 shadow-sm">
            <div className="flex items-center gap-1 text-slate-500 text-[8px] font-bold mb-0.5">{k.icon}{k.label}</div>
            <p className="text-base font-bold text-slate-800">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 flex-1 min-h-0">
        {perms?.canCreateEntry && (
          <div className="xl:col-span-4 bg-white border rounded-xl p-4 shadow-sm">
            <h3 className="text-[11px] font-bold text-slate-800 mb-3 flex items-center gap-1"><LogIn size={12} /> Quick Entry (Tablet)</h3>
            <div className="space-y-2 text-[10px]">
              <div>
                <label className="text-slate-500 font-medium">Meeting With (Student)</label>
                <select
                  value={form.studentProfileId}
                  onChange={(e) => {
                    const r = data?.residents.find((x) => x.profileId === e.target.value);
                    if (r) selectResident(r.profileId, r.studentName, r.hostelId ?? '');
                  }}
                  className="w-full border rounded-lg px-2 py-1.5 mt-0.5"
                >
                  <option value="">Select student...</option>
                  {(data?.residents ?? []).map((r) => (
                    <option key={r.profileId} value={r.profileId}>{r.studentName} · {r.hostelName} {r.room}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-500 font-medium">Visitor Name *</label>
                  <input value={form.visitorName} onChange={(e) => setForm((f) => ({ ...f, visitorName: e.target.value }))} className="w-full border rounded-lg px-2 py-1.5 mt-0.5" />
                </div>
                <div>
                  <label className="text-slate-500 font-medium">Phone *</label>
                  <input value={form.visitorPhone} onChange={(e) => setForm((f) => ({ ...f, visitorPhone: e.target.value }))} className="w-full border rounded-lg px-2 py-1.5 mt-0.5" placeholder="Not 9999900000" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-500 font-medium">Visitor Type</label>
                  <select value={form.visitorType} onChange={(e) => setForm((f) => ({ ...f, visitorType: e.target.value }))} className="w-full border rounded-lg px-2 py-1.5 mt-0.5">
                    {(data?.visitorTypes ?? []).map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-slate-500 font-medium">Purpose</label>
                  <input value={form.purpose} onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))} className="w-full border rounded-lg px-2 py-1.5 mt-0.5" />
                </div>
              </div>
              <div>
                <label className="text-slate-500 font-medium flex items-center gap-1"><QrCode size={10} /> Pre-approved QR Token</label>
                <input value={form.qrToken} onChange={(e) => setForm((f) => ({ ...f, qrToken: e.target.value }))} className="w-full border rounded-lg px-2 py-1.5 mt-0.5 font-mono text-[9px]" placeholder="HQR-... (optional fast-track)" />
              </div>
              <label className="flex items-center gap-2 text-slate-600">
                <input type="checkbox" checked={form.canTakeStudentOut} onChange={(e) => setForm((f) => ({ ...f, canTakeStudentOut: e.target.checked }))} />
                Student leaving campus (Local Guardian only)
              </label>
              <button type="button" disabled={saving} onClick={() => void handleQuickEntry()} className="w-full bg-blue-600 text-white font-bold py-2 rounded-lg text-xs">
                Create Entry & Send OTP
              </button>
            </div>

            {(data?.preRegistrations ?? []).length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <h4 className="text-[10px] font-bold text-slate-700 mb-2">Pre-Registrations (Mobile App)</h4>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {data?.preRegistrations.map((p) => (
                    <div key={p.id} className="text-[9px] border rounded p-2 bg-slate-50">
                      <p className="font-bold">{p.visitorName} → {p.studentName}</p>
                      <p className="text-slate-500">{p.scheduledTime} · {p.status} · {p.requestedBy}</p>
                      {p.status === 'PENDING' && perms?.canApprove && (
                        <div className="flex gap-1 mt-1">
                          <button type="button" onClick={() => void handlePreRegReview(p.id, 'APPROVE')} className="text-[8px] bg-green-600 text-white px-2 py-0.5 rounded">Approve</button>
                          <button type="button" onClick={() => void handlePreRegReview(p.id, 'REJECT')} className="text-[8px] border px-2 py-0.5 rounded">Reject</button>
                        </div>
                      )}
                      {p.status === 'APPROVED' && <p className="text-green-700 font-mono mt-0.5">{p.qrToken}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className={`${perms?.canCreateEntry ? 'xl:col-span-8' : 'xl:col-span-12'} bg-white border rounded-xl shadow-sm overflow-hidden flex flex-col`}>
          <div className="p-3 border-b flex justify-between items-center">
            <h3 className="text-[11px] font-bold text-slate-800 flex items-center gap-1"><Clock size={12} /> Today&apos;s Visitor Log</h3>
            {(data?.overstayedVisitors ?? []).length > 0 && (
              <span className="text-[9px] text-red-600 font-bold flex items-center gap-1"><AlertTriangle size={10} /> {data?.overstayedVisitors.length} overstayed</span>
            )}
          </div>
          <div className="overflow-auto flex-1">
            <table className="w-full text-[10px] text-left">
              <thead className="bg-slate-50 sticky top-0">
                <tr className="text-slate-500 border-b">
                  <th className="p-2">Visitor</th>
                  <th>Student</th>
                  <th>Type</th>
                  <th>In</th>
                  <th>Out</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(data?.todayLog ?? []).map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50">
                    <td className="p-2">
                      <p className="font-bold">{v.visitorName}</p>
                      <p className="text-slate-500">{v.visitorPhone}</p>
                    </td>
                    <td>
                      <p>{v.studentName}</p>
                      <p className="text-slate-500">{v.hostel}</p>
                    </td>
                    <td>{v.visitorType.replace('_', ' ')}</td>
                    <td>{v.inTime || '—'}</td>
                    <td>{v.outTime || '—'}</td>
                    <td>
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${STATUS_COLORS[v.visitStatus] ?? ''}`}>
                        {v.visitStatus.replace('_', ' ')}
                      </span>
                      {v.hasOverride && <span className="text-[7px] text-purple-600 block">Override</span>}
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {v.visitStatus === 'PENDING_OTP' && perms?.canVerifyOtp && (
                          <button type="button" onClick={() => { setOtpModal({ logId: v.id }); setOtpInput(''); }} className="text-[8px] bg-amber-500 text-white px-1.5 py-0.5 rounded">OTP</button>
                        )}
                        {v.visitStatus === 'PENDING_WARDEN' && perms?.canApprove && (
                          <>
                            <button type="button" onClick={() => void handleApprove(v.id, 'APPROVE')} className="text-[8px] bg-green-600 text-white px-1.5 py-0.5 rounded"><CheckCircle2 size={10} /></button>
                            <button type="button" onClick={() => void handleApprove(v.id, 'REJECT')} className="text-[8px] bg-red-600 text-white px-1.5 py-0.5 rounded"><XCircle size={10} /></button>
                          </>
                        )}
                        {(v.visitStatus === 'INSIDE' || v.visitStatus === 'OVERSTAYED') && perms?.canLogExit && (
                          <button type="button" onClick={() => void handleExit(v.id)} className="text-[8px] border px-1.5 py-0.5 rounded flex items-center gap-0.5"><LogOut size={10} /> Exit</button>
                        )}
                        {v.visitStatus === 'PENDING_OTP' && perms?.canOverride && (
                          <button type="button" onClick={() => void handleOverride(v.id)} className="text-[8px] border border-purple-300 text-purple-700 px-1.5 py-0.5 rounded">Override</button>
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

      <AcademicModal open={!!otpModal} onClose={() => setOtpModal(null)} title="Verify OTP">
        <div className="space-y-3 text-sm">
          {otpModal?.demoOtp && <p className="text-xs text-slate-500">Demo OTP: <strong className="font-mono">{otpModal.demoOtp}</strong></p>}
          <input value={otpInput} onChange={(e) => setOtpInput(e.target.value)} placeholder="6-digit OTP" className="w-full border rounded-lg px-3 py-2 text-center font-mono text-lg tracking-widest" maxLength={6} />
          <button type="button" disabled={saving} onClick={() => void handleVerifyOtp()} className="w-full bg-green-600 text-white font-bold py-2 rounded-lg text-xs">Verify & Authorize Entry</button>
        </div>
      </AcademicModal>
    </div>
  );
}
