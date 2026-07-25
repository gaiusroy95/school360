import { useCallback, useEffect, useState } from 'react';
import {
  MessageSquare, RefreshCw, Download, Plus, CheckCircle2,
  AlertTriangle, Clock, User, Wrench, Star, Mail,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import {
  fetchComplaintsManagement,
  submitHostelComplaint,
  takeHostelComplaintAction,
  resolveHostelComplaint,
  confirmHostelComplaint,
  exportHostelComplaints,
  type ComplaintsManagement,
} from '../../../lib/hostelServices';
import { AcademicLoading, AcademicModal, FeeMessage } from '../FeeFinanceManagement/FeeFinanceUi';

const STATUS_STYLE: Record<string, string> = {
  SUBMITTED: 'bg-slate-50 text-slate-700 border-slate-200',
  ASSIGNED: 'bg-amber-50 text-amber-800 border-amber-200',
  IN_PROGRESS: 'bg-blue-50 text-blue-800 border-blue-200',
  RESOLVED: 'bg-green-50 text-green-800 border-green-200',
  CONFIRMED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  ESCALATED: 'bg-red-50 text-red-800 border-red-200',
};

const SEVERITY_STYLE: Record<string, string> = {
  LOW: 'text-slate-500',
  MEDIUM: 'text-amber-600',
  HIGH: 'text-red-600 font-bold',
};

export function ComplaintsFeedbackView() {
  const [data, setData] = useState<ComplaintsManagement | null>(null);
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [submitOpen, setSubmitOpen] = useState(false);
  const [actionModal, setActionModal] = useState<{ id: string; mode: 'action' | 'resolve' | 'confirm' } | null>(null);
  const [actionText, setActionText] = useState('');
  const [rating, setRating] = useState(4);

  const [form, setForm] = useState({
    studentProfileId: '',
    category: 'GENERAL',
    complaintType: 'COMPLAINT' as 'COMPLAINT' | 'FEEDBACK',
    subject: '',
    description: '',
    severity: 'MEDIUM',
  });

  const load = useCallback(async (seed = false) => {
    setLoading(true);
    try {
      setData(await fetchComplaintsManagement(seed, academicYear, statusFilter, categoryFilter));
    } finally {
      setLoading(false);
    }
  }, [academicYear, statusFilter, categoryFilter]);

  useEffect(() => { void load(); }, [load]);

  const flash = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 6000);
  };

  const handleSubmit = async () => {
    if (!form.studentProfileId || !form.subject || !form.description) {
      flash('Student, subject, and description are required', 'error');
      return;
    }
    try {
      const result = await submitHostelComplaint({ ...form, academicYear });
      flash(result.message, 'success');
      setSubmitOpen(false);
      await load();
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Failed', 'error');
    }
  };

  const handleModalSubmit = async () => {
    if (!actionModal) return;
    try {
      if (actionModal.mode === 'action') {
        const r = await takeHostelComplaintAction(actionModal.id, actionText);
        flash(r.message, 'success');
      } else if (actionModal.mode === 'resolve') {
        const r = await resolveHostelComplaint(actionModal.id, actionText);
        flash(r.message, 'success');
      } else {
        const r = await confirmHostelComplaint(actionModal.id, rating, actionText);
        flash(r.message, 'success');
      }
      setActionModal(null);
      setActionText('');
      await load();
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Failed', 'error');
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
          <h2 className="text-xl font-bold text-slate-800">Complaints / Feedback</h2>
          <p className="text-xs text-slate-500">{data?.scopeNote} · Auto-escalation to Principal after {data?.escalationHours ?? 48}h</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className="text-xs border rounded-lg px-2 py-1.5">
            <option value="2025-26">2025-26</option>
          </select>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="text-xs border rounded-lg px-2 py-1.5">
            <option value="ALL">All Categories</option>
            {(data?.categories ?? []).map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-xs border rounded-lg px-2 py-1.5">
            <option value="ALL">All Status</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="ESCALATED">Escalated</option>
          </select>
          <button type="button" onClick={() => void load()} className="p-2 border rounded-lg"><RefreshCw size={14} /></button>
          {perms?.canExport && (
            <button type="button" onClick={() => void exportHostelComplaints(academicYear, 'PDF', 'Complaint Register').then((r) => flash(r.message, 'success'))} className="px-3 py-1.5 text-xs border rounded-lg flex items-center gap-1">
              <Download size={12} /> Export
            </button>
          )}
          {perms?.canSubmit && (
            <button type="button" onClick={() => setSubmitOpen(true)} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg flex items-center gap-1">
              <Plus size={12} /> Log Complaint
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-center text-[9px]">
        <div className="bg-amber-50 rounded-lg p-2 border border-amber-100"><p className="font-bold text-lg text-amber-700">{kpis?.open ?? 0}</p>Open</div>
        <div className="bg-blue-50 rounded-lg p-2 border border-blue-100"><p className="font-bold text-lg text-blue-700">{kpis?.inProgress ?? 0}</p>In Progress</div>
        <div className="bg-green-50 rounded-lg p-2 border border-green-100"><p className="font-bold text-lg text-green-700">{kpis?.resolved ?? 0}</p>Awaiting Confirm</div>
        <div className="bg-emerald-50 rounded-lg p-2 border border-emerald-100"><p className="font-bold text-lg text-emerald-700">{kpis?.confirmed ?? 0}</p>Closed</div>
        <div className="bg-red-50 rounded-lg p-2 border border-red-100"><p className="font-bold text-lg text-red-700">{kpis?.escalated ?? 0}</p>Escalated</div>
        <div className="bg-purple-50 rounded-lg p-2 border border-purple-100"><p className="font-bold text-lg text-purple-700">{kpis?.feedback ?? 0}</p>Feedback</div>
        <div className="bg-slate-50 rounded-lg p-2 border border-slate-100"><p className="font-bold text-lg text-slate-700">{kpis?.total ?? 0}</p>Total</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white border rounded-xl p-4 shadow-sm">
            <h3 className="text-[11px] font-bold text-slate-800 mb-3">By Category</h3>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.categoryChart ?? []} layout="vertical" margin={{ left: 0, right: 8 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={72} tick={{ fontSize: 9 }} />
                  <Tooltip contentStyle={{ fontSize: 10 }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {(data?.categoryChart ?? []).map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-white border rounded-xl p-4 shadow-sm">
            <h3 className="text-[11px] font-bold text-slate-800 mb-3">Status Distribution</h3>
            <div className="flex items-center justify-center gap-4">
              <div className="w-24 h-24 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data?.statusChart ?? []} dataKey="value" cx="50%" cy="50%" innerRadius={25} outerRadius={42} stroke="none">
                      {(data?.statusChart ?? []).map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1 text-[9px]">
                {(data?.statusChart ?? []).map((c) => (
                  <div key={c.name} className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: c.color }} />{c.name}</span>
                    <span className="font-bold">{c.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-[9px] text-red-800">
            <p className="font-bold flex items-center gap-1 mb-1"><Mail size={11} /> Communication Integration</p>
            <p>Unresolved complaints &gt;{data?.escalationHours ?? 48}h trigger escalation email to Principal automatically.</p>
          </div>
        </div>

        <div className="lg:col-span-8 bg-white border rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-auto max-h-[55vh]">
            <table className="w-full text-[10px] text-left">
              <thead className="bg-slate-50 sticky top-0">
                <tr className="text-slate-500 border-b">
                  <th className="p-2">Student / Category</th>
                  <th>Subject</th>
                  <th>Warden</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(data?.complaints ?? []).map((c) => (
                  <tr key={c.id} className={`hover:bg-slate-50 ${c.isEscalated ? 'bg-red-50/30' : ''}`}>
                    <td className="p-2">
                      <p className="font-bold flex items-center gap-1">
                        <User size={9} /> {c.studentName}
                        {c.complaintType === 'FEEDBACK' && <Star size={9} className="text-amber-500" />}
                      </p>
                      <p className="text-slate-500">{c.hostel} · {c.category}</p>
                      <p className={`text-[8px] ${SEVERITY_STYLE[c.severity] ?? ''}`}>{c.severity}</p>
                    </td>
                    <td>
                      <p className="font-medium">{c.subject}</p>
                      <p className="text-slate-500 line-clamp-2">{c.description}</p>
                      <p className="text-[8px] text-slate-400 flex items-center gap-0.5 mt-0.5"><Clock size={8} /> {c.ageHours}h ago</p>
                    </td>
                    <td className="whitespace-nowrap">
                      <p>{c.assignedWarden}</p>
                      {c.actionTaken && <p className="text-[8px] text-blue-600 line-clamp-2">{c.actionTaken}</p>}
                    </td>
                    <td>
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${STATUS_STYLE[c.status] ?? ''}`}>
                        {c.status.replace(/_/g, ' ')}
                      </span>
                      {c.isEscalated && (
                        <p className="text-[7px] text-red-600 flex items-center gap-0.5 mt-0.5">
                          <AlertTriangle size={8} /> {c.escalationEmailSent ? 'Email sent' : 'Escalated'}
                        </p>
                      )}
                      {c.studentRating > 0 && (
                        <p className="text-[7px] text-amber-600 flex items-center gap-0.5"><Star size={8} /> {c.studentRating}/5</p>
                      )}
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {['ASSIGNED', 'IN_PROGRESS'].includes(c.rawStatus) && perms?.canTakeAction && c.rawStatus === 'ASSIGNED' && (
                          <button type="button" onClick={() => { setActionModal({ id: c.id, mode: 'action' }); setActionText(''); }} className="text-[8px] bg-blue-600 text-white px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            <Wrench size={9} /> Act
                          </button>
                        )}
                        {['ASSIGNED', 'IN_PROGRESS'].includes(c.rawStatus) && perms?.canResolve && (
                          <button type="button" onClick={() => { setActionModal({ id: c.id, mode: 'resolve' }); setActionText(''); }} className="text-[8px] bg-green-600 text-white px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            <CheckCircle2 size={9} /> Resolve
                          </button>
                        )}
                        {c.rawStatus === 'RESOLVED' && perms?.canConfirm && (
                          <button type="button" onClick={() => { setActionModal({ id: c.id, mode: 'confirm' }); setActionText(''); setRating(4); }} className="text-[8px] border border-green-400 text-green-700 px-1.5 py-0.5 rounded">
                            Confirm
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

      <AcademicModal open={submitOpen} onClose={() => setSubmitOpen(false)} title="Log Complaint / Feedback">
        <div className="space-y-3 text-sm">
          <select value={form.studentProfileId} onChange={(e) => setForm((f) => ({ ...f, studentProfileId: e.target.value }))} className="w-full border rounded px-2 py-1.5 text-xs">
            <option value="">Select student...</option>
            {(data?.students ?? []).map((s) => (
              <option key={s.profileId} value={s.profileId}>{s.studentName}</option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <select value={form.complaintType} onChange={(e) => setForm((f) => ({ ...f, complaintType: e.target.value as 'COMPLAINT' | 'FEEDBACK' }))} className="border rounded px-2 py-1.5 text-xs">
              <option value="COMPLAINT">Complaint</option>
              <option value="FEEDBACK">Feedback</option>
            </select>
            <select value={form.severity} onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))} className="border rounded px-2 py-1.5 text-xs">
              {(data?.severities ?? []).map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="w-full border rounded px-2 py-1.5 text-xs">
            {(data?.categories ?? []).map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <input value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} placeholder="Subject" className="w-full border rounded px-2 py-1.5 text-xs" />
          <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Describe the issue..." className="w-full border rounded px-2 py-1.5 text-xs" rows={3} />
          <p className="text-[9px] text-slate-500 flex items-center gap-1"><MessageSquare size={10} /> Auto-assigned to hostel warden on submit</p>
          <button type="button" onClick={() => void handleSubmit()} className="w-full bg-blue-600 text-white font-bold py-2 rounded-lg text-xs">Submit</button>
        </div>
      </AcademicModal>

      <AcademicModal
        open={!!actionModal}
        onClose={() => setActionModal(null)}
        title={actionModal?.mode === 'action' ? 'Warden Action' : actionModal?.mode === 'resolve' ? 'Mark Resolved' : 'Confirm Resolution'}
      >
        <div className="space-y-3 text-sm">
          {actionModal?.mode === 'confirm' && (
            <div>
              <label className="text-[10px] text-slate-500">Rating (1–5)</label>
              <div className="flex gap-1 mt-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" onClick={() => setRating(n)} className={`p-1 rounded ${rating >= n ? 'text-amber-500' : 'text-slate-300'}`}>
                    <Star size={18} fill={rating >= n ? 'currentColor' : 'none'} />
                  </button>
                ))}
              </div>
            </div>
          )}
          <textarea
            value={actionText}
            onChange={(e) => setActionText(e.target.value)}
            placeholder={actionModal?.mode === 'action' ? 'Action taken...' : actionModal?.mode === 'resolve' ? 'Resolution notes...' : 'Optional feedback note...'}
            className="w-full border rounded px-2 py-1.5 text-xs"
            rows={3}
          />
          <button type="button" onClick={() => void handleModalSubmit()} className="w-full bg-green-600 text-white font-bold py-2 rounded-lg text-xs">
            {actionModal?.mode === 'confirm' ? 'Confirm & Close' : 'Submit'}
          </button>
        </div>
      </AcademicModal>
    </div>
  );
}
