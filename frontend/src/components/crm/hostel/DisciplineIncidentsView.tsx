import { useCallback, useEffect, useState } from 'react';
import {
  ShieldAlert, RefreshCw, Download, Plus, CheckCircle2,
  AlertTriangle, Mail, Ban, ArrowUpCircle,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import {
  fetchDisciplineManagement,
  logHostelDisciplineIncident,
  resolveHostelDisciplineIncident,
  escalateHostelDisciplineIncident,
  exportHostelDiscipline,
  type DisciplineManagement,
} from '../../../lib/hostelServices';
import { AcademicLoading, AcademicModal, FeeMessage } from '../FeeFinanceManagement/FeeFinanceUi';

const STATUS_BADGE: Record<string, string> = {
  OPEN: 'bg-red-50 text-red-800 border-red-200',
  UNDER_REVIEW: 'bg-amber-50 text-amber-800 border-amber-200',
  ESCALATED: 'bg-orange-50 text-orange-800 border-orange-200',
  RESOLVED: 'bg-green-50 text-green-800 border-green-200',
};

const SEVERITY_STYLE: Record<string, string> = {
  LOW: 'text-slate-500',
  MEDIUM: 'text-amber-600',
  HIGH: 'text-orange-600 font-bold',
  CRITICAL: 'text-red-600 font-bold',
};

export function DisciplineIncidentsView() {
  const [data, setData] = useState<DisciplineManagement | null>(null);
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [logOpen, setLogOpen] = useState(false);
  const [resolveModal, setResolveModal] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const [form, setForm] = useState({
    studentProfileId: '',
    incidentType: 'MISCONDUCT',
    severity: 'MEDIUM',
    title: '',
    description: '',
    penaltyPoints: 2,
  });

  const load = useCallback(async (seed = false) => {
    setLoading(true);
    try {
      const result = await fetchDisciplineManagement(seed, academicYear, statusFilter, severityFilter);
      setData(result);
      setForm((f) => (f.studentProfileId ? f : { ...f, studentProfileId: result.students[0]?.profileId ?? '' }));
    } finally {
      setLoading(false);
    }
  }, [academicYear, statusFilter, severityFilter]);

  useEffect(() => { void load(true); }, [load]);

  const flash = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 6000);
  };

  const handleLog = async () => {
    if (!form.studentProfileId || !form.title || !form.description) {
      flash('Student, title, and description are required', 'error');
      return;
    }
    try {
      const result = await logHostelDisciplineIncident({ ...form, academicYear, reportedBy: 'Warden' });
      flash(result.message, 'success');
      if (result.notifications?.length) {
        setTimeout(() => flash(result.notifications!.join(' · '), 'info'), 500);
      }
      setLogOpen(false);
      await load();
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Failed', 'error');
    }
  };

  const handleResolve = async () => {
    if (!resolveModal || !resolutionNotes.trim()) {
      flash('Resolution notes are required', 'error');
      return;
    }
    try {
      const result = await resolveHostelDisciplineIncident(resolveModal, resolutionNotes);
      flash(result.message, 'success');
      setResolveModal(null);
      setResolutionNotes('');
      await load();
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Failed', 'error');
    }
  };

  const handleEscalate = async (incidentId: string) => {
    try {
      const result = await escalateHostelDisciplineIncident(incidentId);
      flash(result.message, 'success');
      await load();
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Failed', 'error');
    }
  };

  const onSeverityChange = (severity: string) => {
    const def = data?.severities.find((s) => s.value === severity);
    setForm((f) => ({ ...f, severity, penaltyPoints: def?.defaultPoints ?? f.penaltyPoints }));
  };

  if (loading && !data) return <AcademicLoading />;

  const perms = data?.permissions;
  const summary = data?.monthSummary;
  const monthDisplay = data?.currentMonth?.replace('-', ' / ') ?? 'This Month';

  return (
    <div className="flex flex-col h-full gap-4">
      <FeeMessage message={message} type={messageType} />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Discipline & Incidents</h2>
          <p className="text-xs text-slate-500">Log infractions · Assign penalty points · Auto-escalate by severity</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className="text-xs border rounded-lg px-2 py-1.5">
            {(data?.academicYears ?? ['2025-26']).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} className="text-xs border rounded-lg px-2 py-1.5">
            <option value="ALL">All Severity</option>
            {(data?.severities ?? []).map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-xs border rounded-lg px-2 py-1.5">
            <option value="ALL">All Status</option>
            <option value="OPEN">Open</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="ESCALATED">Escalated</option>
            <option value="RESOLVED">Resolved</option>
          </select>
          <button type="button" onClick={() => void load()} className="p-2 border rounded-lg"><RefreshCw size={14} /></button>
          {perms?.canExport && (
            <button type="button" onClick={() => void exportHostelDiscipline(academicYear).then((r) => flash(r.message, 'success'))} className="px-3 py-1.5 text-xs border rounded-lg flex items-center gap-1">
              <Download size={12} /> Export
            </button>
          )}
          {perms?.canLog && (
            <button type="button" onClick={() => setLogOpen(true)} className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg flex items-center gap-1">
              <Plus size={12} /> Log Incident
            </button>
          )}
        </div>
      </div>

      <div className="bg-white border rounded-xl p-4 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
          <ShieldAlert size={16} className="text-red-600" />
          Incident Summary ({monthDisplay})
        </h3>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
            <p className="text-2xl font-bold text-slate-800">{summary?.total ?? 0}</p>
            <p className="text-[10px] text-slate-500 mt-1">Total Incidents</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3 border border-green-100">
            <p className="text-2xl font-bold text-green-700">{summary?.resolved ?? 0}</p>
            <p className="text-[10px] text-green-600 mt-1">Resolved</p>
          </div>
          <div className="bg-red-50 rounded-lg p-3 border border-red-100">
            <p className="text-2xl font-bold text-red-600">{summary?.open ?? 0}</p>
            <p className="text-[10px] text-red-500 mt-1">Open</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white border rounded-xl p-4 shadow-sm">
            <h3 className="text-[11px] font-bold text-slate-800 mb-3">Severity Distribution (This Month)</h3>
            <div className="flex items-center justify-center gap-4">
              <div className="w-24 h-24 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data?.severityChart ?? []} dataKey="value" cx="50%" cy="50%" innerRadius={25} outerRadius={42} stroke="none">
                      {(data?.severityChart ?? []).map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1 text-[9px]">
                {(data?.severityChart ?? []).map((c) => (
                  <div key={c.name} className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: c.color }} />{c.name}</span>
                    <span className="font-bold">{c.value} ({c.percent})</span>
                  </div>
                ))}
                {(data?.severityChart ?? []).length === 0 && <p className="text-slate-400">No incidents this month</p>}
              </div>
            </div>
          </div>

          <div className="bg-white border rounded-xl p-4 shadow-sm">
            <h3 className="text-[11px] font-bold text-slate-800 mb-2 flex items-center gap-1"><Ban size={12} className="text-red-500" /> Leave Suspended</h3>
            <p className="text-[9px] text-slate-500 mb-2">
              Auto-suspend when penalty points ≥ {data?.settings.leaveSuspensionPoints ?? 3}
            </p>
            {(data?.suspendedStudents ?? []).length === 0 ? (
              <p className="text-[9px] text-green-600">No students currently suspended</p>
            ) : (
              <ul className="space-y-1 text-[9px]">
                {(data?.suspendedStudents ?? []).map((s, i) => (
                  <li key={i} className="flex justify-between bg-red-50 rounded px-2 py-1">
                    <span>{s.studentName}</span>
                    <span className="font-bold text-red-600">{s.disciplinaryPoints} pts</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white border rounded-xl p-4 shadow-sm">
            <h3 className="text-[11px] font-bold text-slate-800 mb-2 flex items-center gap-1"><AlertTriangle size={12} /> Automation Rules</h3>
            <ul className="space-y-1 text-[9px] text-slate-600">
              {(data?.automationRules ?? []).map((r, i) => (
                <li key={i} className="flex gap-1"><span className="text-blue-500">•</span>{r}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="lg:col-span-8 bg-white border rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-auto max-h-[55vh]">
            <table className="w-full text-[10px] text-left">
              <thead className="bg-slate-50 sticky top-0">
                <tr className="text-slate-500 border-b">
                  <th className="p-2">Student / Date</th>
                  <th>Incident</th>
                  <th>Severity / Points</th>
                  <th>Status / Flags</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(data?.incidents ?? []).map((inc) => (
                  <tr key={inc.id} className="hover:bg-slate-50">
                    <td className="p-2">
                      <p className="font-bold">{inc.studentName}</p>
                      <p className="text-slate-500">{inc.hostel}</p>
                      <p className="text-[8px] text-slate-400">{inc.incidentDate}</p>
                    </td>
                    <td>
                      <p className="font-bold">{inc.title}</p>
                      <p className="text-slate-500">{inc.incidentType}</p>
                      <p className="text-[8px] text-slate-400 truncate max-w-[180px]">{inc.description}</p>
                    </td>
                    <td>
                      <p className={SEVERITY_STYLE[inc.severity] ?? ''}>{inc.severity}</p>
                      <p className="font-bold text-red-600">{inc.penaltyPoints} pts</p>
                    </td>
                    <td>
                      <span className={`inline-flex text-[8px] font-bold px-1.5 py-0.5 rounded border ${STATUS_BADGE[inc.status] ?? ''}`}>
                        {inc.statusLabel}
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {inc.parentNotified && (
                          <span className="text-[7px] bg-blue-50 text-blue-700 px-1 rounded flex items-center gap-0.5"><Mail size={8} /> Parent</span>
                        )}
                        {inc.managementEscalated && (
                          <span className="text-[7px] bg-orange-50 text-orange-700 px-1 rounded flex items-center gap-0.5"><ArrowUpCircle size={8} /> Mgmt</span>
                        )}
                        {inc.leaveSuspended && (
                          <span className="text-[7px] bg-red-50 text-red-700 px-1 rounded flex items-center gap-0.5"><Ban size={8} /> Leave</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {inc.status !== 'RESOLVED' && perms?.canResolve && (
                          <button type="button" onClick={() => { setResolveModal(inc.id); setResolutionNotes(''); }} className="text-[8px] bg-green-600 text-white px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            <CheckCircle2 size={9} /> Resolve
                          </button>
                        )}
                        {inc.status !== 'RESOLVED' && inc.status !== 'ESCALATED' && perms?.canEscalate && (
                          <button type="button" onClick={() => void handleEscalate(inc.id)} className="text-[8px] bg-orange-600 text-white px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            <ArrowUpCircle size={9} /> Escalate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {(data?.incidents ?? []).length === 0 && (
                  <tr><td colSpan={5} className="p-8 text-center text-slate-400">No incidents found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AcademicModal open={logOpen} onClose={() => setLogOpen(false)} title="Log Disciplinary Incident">
        <div className="space-y-3 text-sm">
          <select value={form.studentProfileId} onChange={(e) => setForm((f) => ({ ...f, studentProfileId: e.target.value }))} className="w-full border rounded px-2 py-1.5 text-xs">
            <option value="">Select student...</option>
            {(data?.students ?? []).map((s) => (
              <option key={s.profileId} value={s.profileId}>
                {s.studentName} ({s.disciplinaryPoints} pts{s.leaveSuspended ? ' — LEAVE SUSPENDED' : ''})
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <select value={form.incidentType} onChange={(e) => setForm((f) => ({ ...f, incidentType: e.target.value }))} className="border rounded px-2 py-1.5 text-xs">
              {(data?.incidentTypes ?? []).map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <select value={form.severity} onChange={(e) => onSeverityChange(e.target.value)} className="border rounded px-2 py-1.5 text-xs">
              {(data?.severities ?? []).map((s) => <option key={s.value} value={s.value}>{s.label} ({s.defaultPoints} pts)</option>)}
            </select>
          </div>
          <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Incident title" className="w-full border rounded px-2 py-1.5 text-xs" />
          <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Detailed description..." rows={3} className="w-full border rounded px-2 py-1.5 text-xs" />
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-600">Penalty Points:</label>
            <input type="number" min={1} max={10} value={form.penaltyPoints} onChange={(e) => setForm((f) => ({ ...f, penaltyPoints: Number(e.target.value) }))} className="w-16 border rounded px-2 py-1 text-xs" />
          </div>
          <button type="button" onClick={() => void handleLog()} className="w-full bg-red-600 text-white py-2 rounded-lg text-xs font-bold">Log Incident & Apply Penalty</button>
        </div>
      </AcademicModal>

      <AcademicModal open={!!resolveModal} onClose={() => setResolveModal(null)} title="Resolve Incident">
        <div className="space-y-3 text-sm">
          <textarea value={resolutionNotes} onChange={(e) => setResolutionNotes(e.target.value)} placeholder="Resolution notes (counseling, warning issued, etc.)" rows={4} className="w-full border rounded px-2 py-1.5 text-xs" />
          <button type="button" onClick={() => void handleResolve()} className="w-full bg-green-600 text-white py-2 rounded-lg text-xs font-bold">Mark Resolved</button>
        </div>
      </AcademicModal>
    </div>
  );
}
