import { useCallback, useEffect, useState } from 'react';
import {
  Calendar, RefreshCw, Download, Plus, CheckCircle2, XCircle,
  Shield, KeyRound, LogOut, LogIn, AlertTriangle, QrCode,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import {
  fetchLeaveManagement,
  submitHostelLeaveRequest,
  parentApproveHostelLeave,
  wardenApproveHostelLeave,
  rejectHostelLeave,
  verifyHostelLeaveExit,
  logHostelLeaveReturn,
  exportHostelLeave,
  type LeaveManagement,
} from '../../../lib/hostelServices';
import { AcademicLoading, AcademicModal, FeeMessage } from '../FeeFinanceManagement/FeeFinanceUi';

const STATUS_STYLE: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-800 border-amber-200',
  PARENT_APPROVED: 'bg-blue-50 text-blue-800 border-blue-200',
  WARDEN_APPROVED: 'bg-green-50 text-green-800 border-green-200',
  ACTIVE: 'bg-teal-50 text-teal-800 border-teal-200',
  COMPLETED: 'bg-slate-50 text-slate-700 border-slate-200',
  REJECTED: 'bg-red-50 text-red-800 border-red-200',
  OVERSTAYED: 'bg-red-100 text-red-900 border-red-300',
};

export function LeaveManagementView() {
  const [data, setData] = useState<LeaveManagement | null>(null);
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [applyOpen, setApplyOpen] = useState(false);
  const [otpModal, setOtpModal] = useState<{ id: string; demoOtp?: string } | null>(null);
  const [otpInput, setOtpInput] = useState('123456');
  const [qrInput, setQrInput] = useState('');

  const defaultOut = new Date(Date.now() + 2 * 86400000);
  defaultOut.setHours(8, 0, 0, 0);
  const defaultIn = new Date(defaultOut.getTime() + 2 * 86400000);
  defaultIn.setHours(18, 0, 0, 0);

  const [form, setForm] = useState({
    studentProfileId: '',
    leaveType: 'HOME_VISIT',
    reason: '',
    addressDuringLeave: '',
    outDateTime: defaultOut.toISOString().slice(0, 16),
    expectedInDateTime: defaultIn.toISOString().slice(0, 16),
  });

  const load = useCallback(async (seed = false) => {
    setLoading(true);
    try {
      setData(await fetchLeaveManagement(seed, academicYear, statusFilter));
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

  const handleApply = async () => {
    if (!form.studentProfileId || !form.reason) {
      flash('Student and reason are required', 'error');
      return;
    }
    try {
      const result = await submitHostelLeaveRequest({ ...form, academicYear });
      flash(result.message, result.success ? 'success' : 'error');
      if (result.demoParentOtp) setOtpModal({ id: '', demoOtp: result.demoParentOtp });
      setApplyOpen(false);
      await load();
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Failed', 'error');
    }
  };

  const handleParentApprove = async () => {
    if (!otpModal?.id) return;
    try {
      const result = await parentApproveHostelLeave(otpModal.id, otpInput);
      flash(result.message, 'success');
      setOtpModal(null);
      await load();
    } catch (e) {
      flash(e instanceof Error ? e.message : 'OTP failed', 'error');
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
          <h2 className="text-xl font-bold text-slate-800">Leave Management</h2>
          <p className="text-xs text-slate-500">Parent → Warden approval · Digital gate pass · Security verification</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className="text-xs border rounded-lg px-2 py-1.5">
            <option value="2025-26">2025-26</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-xs border rounded-lg px-2 py-1.5">
            <option value="ALL">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="PARENT_APPROVED">Parent Approved</option>
            <option value="WARDEN_APPROVED">Warden Approved</option>
            <option value="ACTIVE">Active</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <button type="button" onClick={() => void load()} className="p-2 border rounded-lg"><RefreshCw size={14} /></button>
          {perms?.canExport && (
            <button type="button" onClick={() => void exportHostelLeave(academicYear, 'PDF', 'Leave Register').then((r) => flash(r.message, 'success'))} className="px-3 py-1.5 text-xs border rounded-lg flex items-center gap-1">
              <Download size={12} /> Export
            </button>
          )}
          {perms?.canApply && (
            <button type="button" onClick={() => setApplyOpen(true)} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg flex items-center gap-1">
              <Plus size={12} /> Apply Leave
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-4 bg-white border rounded-xl p-4 shadow-sm">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Leave Applications</h3>
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
          <div className="grid grid-cols-3 gap-2 mt-4 text-center text-[9px]">
            <div className="bg-amber-50 rounded p-2"><p className="font-bold text-lg text-amber-700">{kpis?.pending ?? 0}</p>Pending</div>
            <div className="bg-green-50 rounded p-2"><p className="font-bold text-lg text-green-700">{kpis?.approved ?? 0}</p>Approved</div>
            <div className="bg-red-50 rounded p-2"><p className="font-bold text-lg text-red-700">{kpis?.rejected ?? 0}</p>Rejected</div>
          </div>
          {(kpis?.overstayed ?? 0) > 0 && (
            <p className="mt-2 text-[9px] text-red-600 flex items-center gap-1"><AlertTriangle size={10} /> {kpis?.overstayed} overstayed (defaulters)</p>
          )}
        </div>

        <div className="lg:col-span-8 bg-white border rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-auto max-h-[55vh]">
            <table className="w-full text-[10px] text-left">
              <thead className="bg-slate-50 sticky top-0">
                <tr className="text-slate-500 border-b">
                  <th className="p-2">Student</th>
                  <th>Type</th>
                  <th>Out / Expected In</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(data?.applications ?? []).map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50">
                    <td className="p-2">
                      <p className="font-bold">{l.studentName}</p>
                      <p className="text-slate-500">{l.hostel}</p>
                    </td>
                    <td>{l.leaveType}</td>
                    <td className="whitespace-nowrap">
                      <span className="flex items-center gap-0.5"><LogOut size={9} /> {l.outDateTime}</span>
                      <span className="flex items-center gap-0.5 text-slate-500"><LogIn size={9} /> {l.expectedInDateTime}</span>
                    </td>
                    <td>
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${STATUS_STYLE[l.status] ?? ''}`}>
                        {l.status.replace(/_/g, ' ')}
                      </span>
                      {l.gatePassQr && <p className="text-[7px] font-mono text-slate-400 mt-0.5">{l.gatePassQr.slice(0, 16)}…</p>}
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {l.status === 'PENDING' && perms?.canParentApprove && (
                          <button type="button" onClick={() => { setOtpModal({ id: l.id }); setOtpInput('123456'); }} className="text-[8px] bg-blue-600 text-white px-1.5 py-0.5 rounded flex items-center gap-0.5"><KeyRound size={9} /> Parent</button>
                        )}
                        {l.status === 'PARENT_APPROVED' && perms?.canWardenApprove && (
                          <button type="button" onClick={() => void wardenApproveHostelLeave(l.id).then((r) => { flash(r.message + (r.gatePassQr ? ` QR: ${r.gatePassQr}` : ''), 'success'); void load(); })} className="text-[8px] bg-green-600 text-white px-1.5 py-0.5 rounded"><CheckCircle2 size={9} /> Warden</button>
                        )}
                        {['PENDING', 'PARENT_APPROVED'].includes(l.status) && (
                          <button type="button" onClick={() => void rejectHostelLeave(l.id, 'Not approved', 'Warden').then((r) => { flash(r.message, 'success'); void load(); })} className="text-[8px] border border-red-300 text-red-700 px-1.5 py-0.5 rounded"><XCircle size={9} /></button>
                        )}
                        {l.status === 'ACTIVE' && perms?.canSecurityVerify && (
                          <button type="button" onClick={() => void logHostelLeaveReturn(l.id).then((r) => { flash(r.message, 'success'); void load(); })} className="text-[8px] border px-1.5 py-0.5 rounded">Return</button>
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

      {perms?.canSecurityVerify && (
        <div className="bg-white border rounded-xl p-4 shadow-sm">
          <h3 className="text-[11px] font-bold text-slate-800 mb-2 flex items-center gap-1"><Shield size={12} /> Security Gate Verification</h3>
          <div className="flex gap-2 max-w-md">
            <input value={qrInput} onChange={(e) => setQrInput(e.target.value)} placeholder="Scan gate pass QR token..." className="flex-1 border rounded-lg px-3 py-2 text-xs font-mono" />
            <button type="button" onClick={() => void verifyHostelLeaveExit(qrInput).then((r) => { flash(r.message, 'success'); setQrInput(''); void load(); }).catch((e) => flash(e instanceof Error ? e.message : 'Failed', 'error'))} className="px-4 py-2 bg-teal-600 text-white text-xs font-bold rounded-lg flex items-center gap-1"><QrCode size={12} /> Verify Exit</button>
          </div>
        </div>
      )}

      <AcademicModal open={applyOpen} onClose={() => setApplyOpen(false)} title="Apply for Leave">
        <div className="space-y-3 text-sm">
          <select value={form.studentProfileId} onChange={(e) => setForm((f) => ({ ...f, studentProfileId: e.target.value }))} className="w-full border rounded px-2 py-1.5 text-xs">
            <option value="">Select student...</option>
            {(data?.students ?? []).map((s) => (
              <option key={s.profileId} value={s.profileId}>{s.studentName}{s.disciplinaryPoints >= 3 ? ' (disciplinary)' : ''}</option>
            ))}
          </select>
          <select value={form.leaveType} onChange={(e) => setForm((f) => ({ ...f, leaveType: e.target.value }))} className="w-full border rounded px-2 py-1.5 text-xs">
            {(data?.leaveTypes ?? []).map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <textarea value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} placeholder="Reason" className="w-full border rounded px-2 py-1.5 text-xs" rows={2} />
          <input value={form.addressDuringLeave} onChange={(e) => setForm((f) => ({ ...f, addressDuringLeave: e.target.value }))} placeholder="Address during leave" className="w-full border rounded px-2 py-1.5 text-xs" />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-500">Out Date/Time</label>
              <input type="datetime-local" value={form.outDateTime} onChange={(e) => setForm((f) => ({ ...f, outDateTime: e.target.value }))} className="w-full border rounded px-2 py-1.5 text-xs" />
            </div>
            <div>
              <label className="text-[10px] text-slate-500">Expected In</label>
              <input type="datetime-local" value={form.expectedInDateTime} onChange={(e) => setForm((f) => ({ ...f, expectedInDateTime: e.target.value }))} className="w-full border rounded px-2 py-1.5 text-xs" />
            </div>
          </div>
          <p className="text-[9px] text-slate-500">Min. {data?.minNoticeHours ?? 24}h advance notice required</p>
          <button type="button" onClick={() => void handleApply()} className="w-full bg-blue-600 text-white font-bold py-2 rounded-lg text-xs">Submit Request</button>
        </div>
      </AcademicModal>

      <AcademicModal open={!!otpModal?.id} onClose={() => setOtpModal(null)} title="Parent Approval (OTP)">
        <div className="space-y-3 text-sm">
          <p className="text-xs text-slate-500">Demo OTP: <strong className="font-mono">123456</strong></p>
          <input value={otpInput} onChange={(e) => setOtpInput(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-center font-mono text-lg tracking-widest" maxLength={6} />
          <button type="button" onClick={() => void handleParentApprove()} className="w-full bg-green-600 text-white font-bold py-2 rounded-lg text-xs">Verify & Approve</button>
        </div>
      </AcademicModal>
    </div>
  );
}
