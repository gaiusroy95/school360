import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus, Calendar, Send, RefreshCw, Eye, Pencil, BarChart3, Users, Award, ClipboardCheck, Smartphone,
} from 'lucide-react';
import {
  bulkGenerateTeacherEvaluations, createTeacherEvaluation, fetchAcademicMeta, fetchTeacherEvaluationDashboard,
  publishTeacherDevCyclesToCalendar, publishTeacherEvaluations, syncTeacherEvaluationFeedback,
  updateTeacherEvaluation, type TeacherEvaluation, type TeacherDevCycle,
} from '../../../lib/academicServices';
import {
  AcademicLoading, AcademicModal, AcademicPageHeader, AcademicPageShell,
  AcademicYearTermFilters, am,
} from './AcademicManagementUi';

const BAND_STYLES: Record<string, string> = {
  EXCELLENT: 'bg-green-100 text-green-800',
  GOOD: 'bg-blue-100 text-blue-800',
  AVERAGE: 'bg-amber-100 text-amber-800',
  NEEDS_IMPROVEMENT: 'bg-red-100 text-red-800',
};

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-600',
  IN_REVIEW: 'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-teal-100 text-teal-800',
  PUBLISHED: 'bg-indigo-100 text-indigo-800',
};

const EMPTY_FORM = {
  teacherName: '', department: 'General', className: '', sectionName: '', subjectName: '',
  taskActionScore: 0, taskActionNotes: '', taskActionEvidence: '',
  improvementPlanScore: 0, improvementPlanNotes: '', improvementPlanDetails: '',
  parentEngagementScore: 0, parentEngagementNotes: '',
  parentFeedbackScore: 0, parentFeedbackNotes: '',
  studentFeedbackScore: 0, studentFeedbackNotes: '',
  status: 'DRAFT' as const, evaluatedBy: '',
};

function ScoreBar({ label, score, color }: { label: string; score: number; color?: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-600">{label}</span>
        <span className="font-bold text-slate-800">{score.toFixed(0)}</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(100, score)}%`, backgroundColor: color || '#0d9488' }}
        />
      </div>
    </div>
  );
}

function EvaluationDetail({ ev, onClose }: { ev: TeacherEvaluation; onClose: () => void }) {
  return (
    <div className="space-y-4 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-lg font-bold text-slate-900">{ev.teacherName}</h4>
          <p className="text-xs text-slate-500 mt-1">
            {ev.classGroup} · {ev.subjectName} · {ev.cycleTitle}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-teal-700">{ev.overallScore.toFixed(1)}</p>
          <span className={`text-xs font-bold px-2 py-0.5 rounded ${BAND_STYLES[ev.performanceBand] || ''}`}>
            {ev.performanceBandLabel}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg">
        <div><p className="text-[10px] font-bold text-slate-400 uppercase">Department</p><p className="font-semibold">{ev.department}</p></div>
        <div><p className="text-[10px] font-bold text-slate-400 uppercase">Status</p><p className="font-semibold">{ev.statusLabel}</p></div>
        <div><p className="text-[10px] font-bold text-slate-400 uppercase">Evaluated By</p><p className="font-semibold">{ev.evaluatedBy || '—'}</p></div>
        <div><p className="text-[10px] font-bold text-slate-400 uppercase">Mobile</p><p className="font-semibold flex items-center gap-1">{ev.isPublished ? <><Smartphone size={12} className="text-green-600" /> Published</> : 'Draft'}</p></div>
      </div>

      <div className="space-y-3">
        {ev.dimensions.map((d) => (
          <div key={d.key} className="border border-slate-100 rounded-lg p-3">
            <ScoreBar label={d.label} score={d.score} />
            {d.key === 'taskAction' && ev.taskActionNotes && <p className="text-xs text-slate-500 mt-2">{ev.taskActionNotes}</p>}
            {d.key === 'improvementPlan' && ev.improvementPlanNotes && <p className="text-xs text-slate-500 mt-2">{ev.improvementPlanNotes}</p>}
            {d.key === 'parentEngagement' && (
              <p className="text-xs text-slate-500 mt-2">{ev.parentEngagementCount} engagements · {ev.parentEngagementNotes}</p>
            )}
            {d.key === 'parentFeedback' && (
              <p className="text-xs text-slate-500 mt-2">{ev.parentFeedbackCount} responses · {ev.parentFeedbackNotes || '—'}</p>
            )}
            {d.key === 'studentFeedback' && (
              <p className="text-xs text-slate-500 mt-2">{ev.studentFeedbackCount} responses (Class 6+) · {ev.studentFeedbackNotes || '—'}</p>
            )}
          </div>
        ))}
      </div>

      {ev.improvementPlanDetails && (
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Improvement Plan Details</p>
          <p className="text-slate-700 bg-white border rounded-lg p-3">{ev.improvementPlanDetails}</p>
        </div>
      )}

      <div className="flex justify-end pt-2 border-t">
        <button type="button" onClick={onClose} className={am.btnSecondary}>Close</button>
      </div>
    </div>
  );
}

export function ContinuousEvaluationView() {
  const [dashboard, setDashboard] = useState<Awaited<ReturnType<typeof fetchTeacherEvaluationDashboard>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [years, setYears] = useState<string[]>(['2025-26']);
  const [devCycleId, setDevCycleId] = useState('');
  const [teacherFilter, setTeacherFilter] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState<TeacherEvaluation | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const meta = await fetchAcademicMeta();
      setYears(meta.academicYears);
      const d = await fetchTeacherEvaluationDashboard({
        academicYear,
        devCycleId: devCycleId || undefined,
      });
      setDashboard(d);
      if (!devCycleId && d.activeCycleId) setDevCycleId(d.activeCycleId);
    } finally { setLoading(false); }
  }, [academicYear, devCycleId]);

  useEffect(() => { void load(); }, [load]);

  const activeCycle = useMemo(
    () => dashboard?.cycles.find((c) => c.id === (devCycleId || dashboard?.activeCycleId)),
    [dashboard, devCycleId],
  );

  const filtered = useMemo(() => {
    if (!dashboard) return [];
    if (!teacherFilter.trim()) return dashboard.evaluations;
    const q = teacherFilter.toLowerCase();
    return dashboard.evaluations.filter((e) => e.teacherName.toLowerCase().includes(q));
  }, [dashboard, teacherFilter]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setShowForm(true);
  };

  const openEdit = (ev: TeacherEvaluation) => {
    setEditingId(ev.id);
    setForm({
      teacherName: ev.teacherName, department: ev.department,
      className: ev.className, sectionName: ev.sectionName, subjectName: ev.subjectName,
      taskActionScore: ev.taskActionScore, taskActionNotes: ev.taskActionNotes, taskActionEvidence: ev.taskActionEvidence,
      improvementPlanScore: ev.improvementPlanScore, improvementPlanNotes: ev.improvementPlanNotes,
      improvementPlanDetails: ev.improvementPlanDetails,
      parentEngagementScore: ev.parentEngagementScore, parentEngagementNotes: ev.parentEngagementNotes,
      parentFeedbackScore: ev.parentFeedbackScore, parentFeedbackNotes: ev.parentFeedbackNotes,
      studentFeedbackScore: ev.studentFeedbackScore, studentFeedbackNotes: ev.studentFeedbackNotes,
      status: ev.status as typeof form.status, evaluatedBy: ev.evaluatedBy,
    });
    setShowForm(true);
  };

  const saveEval = async () => {
    const cycleId = devCycleId || dashboard?.activeCycleId;
    if (!cycleId) return;
    const payload = { ...form, devCycleId: cycleId };
    if (editingId) {
      await updateTeacherEvaluation(editingId, payload);
      setMessage('Evaluation updated');
    } else {
      await createTeacherEvaluation(payload);
      setMessage('Evaluation created');
    }
    setShowForm(false);
    void load();
  };

  const handleBulkGenerate = async () => {
    const cycleId = devCycleId || dashboard?.activeCycleId;
    if (!cycleId) return;
    setBusy(true);
    try {
      const r = await bulkGenerateTeacherEvaluations(cycleId);
      setMessage(`Generated ${r.created} evaluation records from teacher allocations`);
      void load();
    } finally { setBusy(false); }
  };

  const handlePublishCalendar = async () => {
    setBusy(true);
    try {
      const r = await publishTeacherDevCyclesToCalendar(academicYear);
      setMessage(`Added ${r.published} teacher development cycles to school calendar`);
      void load();
    } finally { setBusy(false); }
  };

  const handlePublishMobile = async () => {
    setBusy(true);
    try {
      const r = await publishTeacherEvaluations({ academicYear, devCycleId: devCycleId || undefined });
      setMessage(`Published ${r.published} evaluations to mobile apps`);
      void load();
    } finally { setBusy(false); }
  };

  if (loading && !dashboard) return <AcademicLoading />;

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="Academic Management › Continuous Evaluation"
        title="Teacher Continuous Evaluation"
        subtitle="Evaluate teachers on task actions, class improvement plans, parent engagement & feedback (5 cycles/year)"
        actions={(
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void handlePublishCalendar()} disabled={busy} className={am.btnSecondary}>
              <Calendar size={14} /> Add to Calendar
            </button>
            <button type="button" onClick={() => void handleBulkGenerate()} disabled={busy} className={am.btnSecondary}>
              <RefreshCw size={14} /> Generate from Allocations
            </button>
            <button type="button" onClick={openCreate} className={am.btnPrimary}>
              <Plus size={14} /> Add Evaluation
            </button>
          </div>
        )}
      />

      <div className={am.content}>
        <AcademicYearTermFilters
          academicYear={academicYear}
          term="Term 1"
          years={years}
          terms={['Term 1', 'Term 2']}
          onYear={setAcademicYear}
          onTerm={() => {}}
        />

        {message && (
          <div className="mb-4 px-4 py-2 bg-teal-50 text-teal-800 text-sm rounded-lg border border-teal-200">{message}</div>
        )}

        {/* Development Plan Cycles */}
        <div className={`${am.card} p-4 mb-4`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Calendar size={16} className="text-teal-600" /> Teacher Development Plan — 5 Cycles / Year
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
            {(dashboard?.cycles || []).map((c: TeacherDevCycle) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setDevCycleId(c.id)}
                className={`text-left p-3 rounded-lg border transition-all ${
                  (devCycleId || dashboard?.activeCycleId) === c.id
                    ? 'border-teal-500 bg-teal-50 ring-1 ring-teal-200'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <p className="text-xs font-bold text-teal-700">Cycle {c.cycleNumber}</p>
                <p className="text-[11px] font-semibold text-slate-800 mt-0.5 line-clamp-2">{c.title}</p>
                <p className="text-[10px] text-slate-500 mt-1">
                  Due {new Date(c.evaluationDueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </p>
                {c.isPublished && <span className="text-[9px] font-bold text-green-600 mt-1 block">On Calendar</span>}
              </button>
            ))}
          </div>
          {activeCycle && (
            <p className="text-xs text-slate-500 mt-2">
              {activeCycle.description} · {new Date(activeCycle.startDate).toLocaleDateString('en-IN')} — {new Date(activeCycle.endDate).toLocaleDateString('en-IN')}
            </p>
          )}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          {[
            { label: 'Teachers', value: dashboard?.kpis.totalTeachers ?? 0, icon: Users, color: 'text-blue-600' },
            { label: 'Evaluations', value: dashboard?.kpis.evaluationsRecorded ?? 0, icon: ClipboardCheck, color: 'text-teal-600' },
            { label: 'Completed', value: dashboard?.kpis.completed ?? 0, icon: Award, color: 'text-green-600' },
            { label: 'Avg Score', value: `${(dashboard?.kpis.averageScore ?? 0).toFixed(1)}`, icon: BarChart3, color: 'text-purple-600' },
            { label: 'Pending', value: dashboard?.kpis.pending ?? 0, icon: RefreshCw, color: 'text-amber-600' },
          ].map((k) => (
            <div key={k.label} className={`${am.card} p-3`}>
              <div className="flex items-center gap-2 mb-1">
                <k.icon size={14} className={k.color} />
                <span className="text-[10px] font-bold text-slate-400 uppercase">{k.label}</span>
              </div>
              <p className="text-xl font-black text-slate-800">{k.value}</p>
            </div>
          ))}
        </div>

        {/* Filters + Publish */}
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <input
            placeholder="Filter by teacher name…"
            value={teacherFilter}
            onChange={(e) => setTeacherFilter(e.target.value)}
            className={`${am.input} max-w-xs`}
          />
          <button type="button" onClick={() => void handlePublishMobile()} disabled={busy} className={am.btnPrimary}>
            <Send size={14} /> Publish Completed to Mobile
          </button>
        </div>

        {/* Evaluations Table */}
        <div className={am.tableWrap}>
          <table className="w-full">
            <thead>
              <tr>
                <th className={am.th}>Teacher</th>
                <th className={am.th}>Class / Subject</th>
                <th className={am.th}>Task Action</th>
                <th className={am.th}>Improvement</th>
                <th className={am.th}>Parent Eng.</th>
                <th className={am.th}>Parent FB</th>
                <th className={am.th}>Student FB</th>
                <th className={am.th}>Overall</th>
                <th className={am.th}>Band</th>
                <th className={am.th}>Status</th>
                <th className={am.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={11} className={`${am.td} text-center text-slate-400 py-8`}>No evaluations for this cycle. Click &quot;Generate from Allocations&quot; to start.</td></tr>
              ) : filtered.map((ev) => (
                <tr key={ev.id}>
                  <td className={am.td}>
                    <p className="font-semibold text-slate-800">{ev.teacherName}</p>
                    <p className="text-[10px] text-slate-400">{ev.department}</p>
                  </td>
                  <td className={am.td}>
                    <p>{ev.classGroup}</p>
                    <p className="text-[10px] text-slate-400">{ev.subjectName}</p>
                  </td>
                  <td className={am.td}>{ev.taskActionScore.toFixed(0)}</td>
                  <td className={am.td}>{ev.improvementPlanScore.toFixed(0)}</td>
                  <td className={am.td}>{ev.parentEngagementScore.toFixed(0)}</td>
                  <td className={am.td}>{ev.parentFeedbackScore.toFixed(0)}</td>
                  <td className={am.td}>{ev.studentFeedbackScore.toFixed(0)}</td>
                  <td className={am.td}><span className="font-bold text-teal-700">{ev.overallScore.toFixed(1)}</span></td>
                  <td className={am.td}>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${BAND_STYLES[ev.performanceBand] || ''}`}>
                      {ev.performanceBandLabel}
                    </span>
                  </td>
                  <td className={am.td}>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${STATUS_STYLES[ev.status] || ''}`}>
                      {ev.statusLabel}
                    </span>
                  </td>
                  <td className={am.td}>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => setDetail(ev)} className="p-1 text-slate-500 hover:text-teal-600" title="View"><Eye size={14} /></button>
                      <button type="button" onClick={() => openEdit(ev)} className="p-1 text-slate-500 hover:text-blue-600" title="Edit"><Pencil size={14} /></button>
                      <button
                        type="button"
                        onClick={() => void syncTeacherEvaluationFeedback(ev.id).then(() => { setMessage('Feedback synced from parent data'); void load(); })}
                        className="p-1 text-slate-500 hover:text-purple-600"
                        title="Sync parent/student feedback"
                      >
                        <RefreshCw size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Band distribution */}
        {(dashboard?.bandDistribution?.length ?? 0) > 0 && (
          <div className={`${am.card} p-4 mt-4`}>
            <h4 className="text-sm font-bold text-slate-700 mb-3">Performance Distribution</h4>
            <div className="flex flex-wrap gap-4">
              {dashboard!.bandDistribution.map((b) => (
                <div key={b.band} className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2 py-1 rounded ${BAND_STYLES[b.band] || 'bg-slate-100'}`}>{b.label}</span>
                  <span className="text-sm font-semibold text-slate-700">{b.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <AcademicModal open={showForm} onClose={() => setShowForm(false)} title={editingId ? 'Edit Teacher Evaluation' : 'Add Teacher Evaluation'} large>
        <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
          <input placeholder="Teacher Name *" value={form.teacherName} onChange={(e) => setForm((f) => ({ ...f, teacherName: e.target.value }))} className={am.input} />
          <input placeholder="Department" value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} className={am.input} />
          <input placeholder="Class" value={form.className} onChange={(e) => setForm((f) => ({ ...f, className: e.target.value }))} className={am.input} />
          <input placeholder="Section" value={form.sectionName} onChange={(e) => setForm((f) => ({ ...f, sectionName: e.target.value }))} className={am.input} />
          <input placeholder="Subject" value={form.subjectName} onChange={(e) => setForm((f) => ({ ...f, subjectName: e.target.value }))} className={`${am.input} col-span-2`} />

          <div className="col-span-2 border-t pt-3 mt-1">
            <p className="text-xs font-bold text-slate-500 uppercase mb-2">1. Action on Assigned Tasks (0–100)</p>
            <input type="number" min={0} max={100} value={form.taskActionScore} onChange={(e) => setForm((f) => ({ ...f, taskActionScore: Number(e.target.value) }))} className={am.input} />
            <textarea placeholder="Notes on task completion & follow-up" value={form.taskActionNotes} onChange={(e) => setForm((f) => ({ ...f, taskActionNotes: e.target.value }))} className={`${am.input} mt-2`} rows={2} />
            <textarea placeholder="Evidence / documentation" value={form.taskActionEvidence} onChange={(e) => setForm((f) => ({ ...f, taskActionEvidence: e.target.value }))} className={`${am.input} mt-2`} rows={2} />
          </div>

          <div className="col-span-2 border-t pt-3">
            <p className="text-xs font-bold text-slate-500 uppercase mb-2">2. Teaching Class Improvement Plan (0–100)</p>
            <input type="number" min={0} max={100} value={form.improvementPlanScore} onChange={(e) => setForm((f) => ({ ...f, improvementPlanScore: Number(e.target.value) }))} className={am.input} />
            <textarea placeholder="Improvement plan summary" value={form.improvementPlanNotes} onChange={(e) => setForm((f) => ({ ...f, improvementPlanNotes: e.target.value }))} className={`${am.input} mt-2`} rows={2} />
            <textarea placeholder="Plan details & outcomes" value={form.improvementPlanDetails} onChange={(e) => setForm((f) => ({ ...f, improvementPlanDetails: e.target.value }))} className={`${am.input} mt-2`} rows={2} />
          </div>

          <div className="col-span-2 border-t pt-3">
            <p className="text-xs font-bold text-slate-500 uppercase mb-2">3. Parents&apos; Engagements (0–100)</p>
            <input type="number" min={0} max={100} value={form.parentEngagementScore} onChange={(e) => setForm((f) => ({ ...f, parentEngagementScore: Number(e.target.value) }))} className={am.input} />
            <textarea placeholder="Engagement notes" value={form.parentEngagementNotes} onChange={(e) => setForm((f) => ({ ...f, parentEngagementNotes: e.target.value }))} className={`${am.input} mt-2`} rows={2} />
          </div>

          <div className="col-span-2 border-t pt-3">
            <p className="text-xs font-bold text-slate-500 uppercase mb-2">4. Parent Feedback on Teaching (0–100)</p>
            <input type="number" min={0} max={100} value={form.parentFeedbackScore} onChange={(e) => setForm((f) => ({ ...f, parentFeedbackScore: Number(e.target.value) }))} className={am.input} />
            <textarea placeholder="Parent feedback summary" value={form.parentFeedbackNotes} onChange={(e) => setForm((f) => ({ ...f, parentFeedbackNotes: e.target.value }))} className={`${am.input} mt-2`} rows={2} />
          </div>

          <div className="col-span-2 border-t pt-3">
            <p className="text-xs font-bold text-slate-500 uppercase mb-2">5. Student Feedback on Teaching — Class 6+ (0–100)</p>
            <input type="number" min={0} max={100} value={form.studentFeedbackScore} onChange={(e) => setForm((f) => ({ ...f, studentFeedbackScore: Number(e.target.value) }))} className={am.input} />
            <textarea placeholder="Student feedback summary" value={form.studentFeedbackNotes} onChange={(e) => setForm((f) => ({ ...f, studentFeedbackNotes: e.target.value }))} className={`${am.input} mt-2`} rows={2} />
          </div>

          <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as typeof form.status }))} className={am.input}>
            <option value="DRAFT">Draft</option>
            <option value="IN_REVIEW">In Review</option>
            <option value="COMPLETED">Completed</option>
          </select>
          <input placeholder="Evaluated By" value={form.evaluatedBy} onChange={(e) => setForm((f) => ({ ...f, evaluatedBy: e.target.value }))} className={am.input} />
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t mt-3">
          <button type="button" onClick={() => setShowForm(false)} className={am.btnSecondary}>Cancel</button>
          <button type="button" onClick={() => void saveEval()} className={am.btnPrimary} disabled={!form.teacherName.trim()}>Save Evaluation</button>
        </div>
      </AcademicModal>

      <AcademicModal open={!!detail} onClose={() => setDetail(null)} title="Evaluation Details" large>
        {detail && <EvaluationDetail ev={detail} onClose={() => setDetail(null)} />}
      </AcademicModal>
    </AcademicPageShell>
  );
}
