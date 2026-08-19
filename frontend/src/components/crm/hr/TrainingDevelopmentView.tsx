import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3, BookOpen, Calendar, CheckCircle2, Loader2, Plus, Save, Send, Smartphone, Users,
} from 'lucide-react';
import {
  approveTrainingAnnualPlan,
  completeTrainingAssessment,
  confirmTrainingNomination,
  createTrainingAnnualPlan,
  createTrainingAssignment,
  createTrainingBatch,
  createTrainingBudget,
  createTrainingCategory,
  createTrainingCompetency,
  createTrainingCourse,
  createTrainingExternal,
  createTrainingIdp,
  createTrainingNeed,
  createTrainingTrainer,
  createTrainingVenue,
  fetchTrainingDashboard,
  gradeTrainingAssignment,
  issueTrainingCertificate,
  markTrainingAttendance,
  nominateForTraining,
  seedTrainingDemo,
  submitTrainingFeedback,
  updateTrainingBudget,
  updateTrainingCourse,
  updateTrainingIdp,
  updateTrainingNeed,
  updateTrainingSettings,
  type TrainingDashboard,
} from '../../../lib/hrServices';
import {
  am, AcademicLoading, AcademicModal, AcademicPageHeader, AcademicPageShell, FeeTabs, StatusBadge,
} from '../FeeFinanceManagement/FeeFinanceUi';

const TABS = [
  'Dashboard', 'TNA', 'Categories', 'Courses', 'Trainers', 'Calendar', 'Batches', 'Nominations',
  'LMS', 'Attendance', 'Assessments', 'Assignments', 'Feedback', 'Certificates', 'Competencies',
  'IDP', 'Budget', 'External', 'Analytics', 'Settings',
] as const;
type TabId = (typeof TABS)[number];
type ModalKind = 'tna' | 'category' | 'course' | 'trainer' | 'batch' | 'nominate' | 'assignment' | 'feedback' | 'competency' | 'idp' | 'budget' | 'external' | 'courseEdit' | 'idpEdit' | 'budgetEdit' | null;

function Kpi({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className={`${am.card} p-3`}>
      <p className="text-[10px] font-bold text-slate-400 uppercase">{label}</p>
      <p className="text-xl font-black text-slate-900 mt-1">{value}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export function TrainingDevelopmentView() {
  const [data, setData] = useState<TrainingDashboard | null>(null);
  const [tab, setTab] = useState<TabId>('Dashboard');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [modal, setModal] = useState<ModalKind>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string | number | boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await fetchTrainingDashboard({ academicYear });
      setData(d);
      setAcademicYear(d.academicYear);
    } finally { setLoading(false); }
  }, [academicYear]);

  useEffect(() => { void load(); }, [load]);

  const openModal = (kind: ModalKind, defaults: Record<string, string | number | boolean> = {}, id?: string) => {
    setModal(kind);
    setEditId(id ?? null);
    setForm(defaults);
  };

  const saveModal = async () => {
    if (!modal) return;
    setBusy(true);
    try {
      let result: TrainingDashboard;
      switch (modal) {
        case 'tna':
          result = await createTrainingNeed({ ...form, academicYear });
          setMessage('Training need added');
          break;
        case 'category':
          result = await createTrainingCategory(form);
          setMessage('Category created');
          break;
        case 'course':
          result = await createTrainingCourse({ ...form, isMandatory: Boolean(form.isMandatory) });
          setMessage('Course created');
          break;
        case 'courseEdit':
          result = await updateTrainingCourse(editId!, form);
          setMessage('Course updated');
          break;
        case 'trainer':
          result = await createTrainingTrainer(form);
          setMessage('Trainer added');
          break;
        case 'batch':
          result = await createTrainingBatch(form);
          setMessage('Batch scheduled');
          break;
        case 'nominate':
          result = await nominateForTraining(String(form.batchId), String(form.employeeId));
          setMessage('Employee nominated');
          break;
        case 'assignment':
          result = await createTrainingAssignment(form);
          setMessage('Assignment created');
          break;
        case 'feedback':
          result = await submitTrainingFeedback(form);
          setMessage('Feedback submitted');
          break;
        case 'competency':
          result = await createTrainingCompetency(form);
          setMessage('Competency added');
          break;
        case 'idp':
          result = await createTrainingIdp({ ...form, academicYear, skillGaps: String(form.skillGaps || '').split(',').map((s) => s.trim()).filter(Boolean), recommendedTraining: String(form.recommendedTraining || '').split(',').map((s) => s.trim()).filter(Boolean) });
          setMessage('IDP created');
          break;
        case 'idpEdit':
          result = await updateTrainingIdp(editId!, { completionPct: Number(form.completionPct), mentorName: String(form.mentorName) });
          setMessage('IDP updated');
          break;
        case 'budget':
          result = await createTrainingBudget({ ...form, academicYear });
          setMessage('Budget line added');
          break;
        case 'budgetEdit':
          result = await updateTrainingBudget(editId!, { utilized: Number(form.utilized), approvalStatus: String(form.approvalStatus) });
          setMessage('Budget updated');
          break;
        case 'external':
          result = await createTrainingExternal(form);
          setMessage('External training recorded');
          break;
        default:
          return;
      }
      setData(result);
      setModal(null);
    } finally { setBusy(false); }
  };

  const deptBreakdown = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, number>();
    for (const n of data.nominations) {
      const d = String(n.department ?? 'Unknown');
      map.set(d, (map.get(d) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [data]);

  if (loading && !data) return <AcademicLoading />;

  const automation = (data?.settings.automationRules ?? {}) as Record<string, unknown>;

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="HR & Payroll Management › Training & Development"
        title="Training & Development"
        subtitle="Enterprise LMS integrated with HRMS — courses, nominations, attendance, assessments, certificates & mobile sync"
        actions={(
          <div className="flex gap-2">
            {!data?.annualPlan && (
              <button type="button" disabled={busy} onClick={async () => { setBusy(true); try { setData(await createTrainingAnnualPlan(academicYear)); setMessage('Annual plan created'); } finally { setBusy(false); } }} className={am.btnSecondary}>
                Create Annual Plan
              </button>
            )}
            {data?.annualPlan && !data.annualPlan.calendarPublished && (
              <button type="button" disabled={busy} onClick={async () => { setBusy(true); try { setData(await approveTrainingAnnualPlan(academicYear)); setMessage('Annual plan approved & calendar published'); } finally { setBusy(false); } }} className={am.btnPrimary}>
                <CheckCircle2 size={14} /> Approve Annual Plan
              </button>
            )}
            <button type="button" disabled={busy} onClick={async () => { setBusy(true); try { setData(await seedTrainingDemo()); setMessage('Demo training data loaded'); } finally { setBusy(false); } }} className={am.btnSecondary}>
              Load Demo Data
            </button>
          </div>
        )}
      />

      <div className={am.content}>
        <FeeTabs tabs={[...TABS]} active={tab} onChange={(t) => setTab(t as TabId)} />

        {message && (
          <div className="mb-4 px-4 py-2 bg-amber-50 text-amber-900 text-sm rounded-lg border border-amber-200">{message}</div>
        )}

        <div className="flex flex-wrap gap-3 mb-4">
          <div className="block space-y-1">
            <span className="text-xs font-semibold text-slate-600">Academic Year</span>
            <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className={am.input}>
              {(data?.academicYears ?? []).map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          {data?.settings.mobileSyncEnabled && (
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
              <Smartphone size={14} /> Staff Mobile App Sync Enabled
            </div>
          )}
        </div>

        {tab === 'Dashboard' && data && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Kpi label="Total Trainings" value={data.kpis.totalTrainings} />
              <Kpi label="Participants" value={data.kpis.totalParticipants} />
              <Kpi label="Completion Rate" value={`${data.kpis.completionRate}%`} />
              <Kpi label="Avg Score" value={data.kpis.averageScore} />
              <Kpi label="Certification Rate" value={`${data.kpis.certificationRate}%`} />
              <Kpi label="Attendance %" value={`${data.kpis.attendancePct}%`} />
              <Kpi label="Feedback Rating" value={`${data.kpis.feedbackRating}/5`} />
              <Kpi label="Budget Used" value={`${data.kpis.budgetUtilization}%`} />
              <Kpi label="Training Hours" value={data.kpis.trainingHours} />
              <Kpi label="Mandatory Compliance" value={`${data.kpis.mandatoryCompliancePct}%`} />
            </div>
            <div className="grid lg:grid-cols-2 gap-4">
              <div className={`${am.card} p-4`}>
                <h3 className="font-bold text-slate-800 mb-3">15-Step Workflow</h3>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {data.workflow.map((w) => (
                    <p key={w.key} className="text-xs text-slate-600 flex gap-2"><span className="font-bold text-amber-700">{w.step}.</span>{w.label}</p>
                  ))}
                </div>
              </div>
              <div className={`${am.card} p-4`}>
                <h3 className="font-bold text-slate-800 mb-3">Database Masters ({data.databaseMasters.length})</h3>
                <div className="grid grid-cols-2 gap-1 text-xs text-slate-600 max-h-64 overflow-y-auto">
                  {data.databaseMasters.map((m) => (
                    <p key={m} className="flex items-center gap-1"><CheckCircle2 size={10} className="text-green-600 shrink-0" /> {m}</p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'TNA' && data && (
          <div>
            <div className="flex justify-end mb-3">
              <button type="button" onClick={() => openModal('tna', { department: 'Teaching', source: 'DEPARTMENT_REQUEST', priority: 'MEDIUM', skillGap: '', budget: 0 })} className={am.btnPrimary}><Plus size={14} /> Add Training Need</button>
            </div>
            <div className={am.tableWrap}>
              <table className="w-full">
                <thead><tr><th className={am.th}>Source</th><th className={am.th}>Department</th><th className={am.th}>Skill Gap</th><th className={am.th}>Priority</th><th className={am.th}>Budget</th><th className={am.th}>Status</th><th className={am.th}>Actions</th></tr></thead>
                <tbody>
                  {data.trainingNeeds.length === 0 ? (
                    <tr><td colSpan={7} className={`${am.td} text-center text-slate-400 py-8`}>No training needs — click Add Training Need</td></tr>
                  ) : data.trainingNeeds.map((n) => (
                    <tr key={String(n.id)}>
                      <td className={am.td}>{String(n.source).replace(/_/g, ' ')}</td>
                      <td className={am.td}>{String(n.department)}</td>
                      <td className={am.td}>{String(n.skillGap)}</td>
                      <td className={am.td}><StatusBadge status={String(n.priority)} /></td>
                      <td className={am.td}>₹{Number(n.budget).toLocaleString('en-IN')}</td>
                      <td className={am.td}><StatusBadge status={String(n.status)} /></td>
                      <td className={am.td}>
                        {n.status === 'IDENTIFIED' && (
                          <button type="button" disabled={busy} onClick={async () => { setBusy(true); try { setData(await updateTrainingNeed(String(n.id), { status: 'APPROVED' })); } finally { setBusy(false); } }} className="text-xs font-bold text-green-700">Approve</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'Categories' && data && (
          <div>
            <div className="flex justify-end mb-3">
              <button type="button" onClick={() => openModal('category', { name: '', parentGroup: 'Academic', code: '' })} className={am.btnPrimary}><Plus size={14} /> Add Category</button>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {data.categoryGroups.map((group) => (
                <div key={group} className={`${am.card} p-4`}>
                  <h3 className="font-bold text-slate-800 mb-2">{group}</h3>
                  <div className="flex flex-wrap gap-2">
                    {data.categories.filter((c) => c.parentGroup === group).map((c) => (
                      <span key={c.id} className="px-2 py-1 bg-slate-100 rounded text-xs font-medium">{c.name} <span className="text-slate-400">({c.code})</span></span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'Courses' && data && (
          <div>
            <div className="flex justify-end mb-3">
              <button type="button" onClick={() => openModal('course', { name: '', durationHours: 3, mode: 'CLASSROOM', passingMarks: 70, isMandatory: false, categoryName: data.categories[0]?.name ?? 'Teaching Methodology' })} className={am.btnPrimary}><Plus size={14} /> Add Course</button>
            </div>
            <div className={am.tableWrap}>
              <table className="w-full">
                <thead><tr><th className={am.th}>Code</th><th className={am.th}>Course</th><th className={am.th}>Category</th><th className={am.th}>Duration</th><th className={am.th}>Mode</th><th className={am.th}>Mandatory</th><th className={am.th}>Actions</th></tr></thead>
                <tbody>
                  {data.courses.map((c) => (
                    <tr key={String(c.id)}>
                      <td className={am.td}><span className="font-mono font-bold">{String(c.code)}</span></td>
                      <td className={am.td}>{String(c.name)}</td>
                      <td className={am.td}>{String(c.category)}</td>
                      <td className={am.td}>{Number(c.durationHours)}h</td>
                      <td className={am.td}>{String(c.mode)}</td>
                      <td className={am.td}>{c.isMandatory ? '✓' : '—'}</td>
                      <td className={am.td}>
                        <button type="button" onClick={() => openModal('courseEdit', { name: String(c.name), durationHours: Number(c.durationHours), passingMarks: Number(c.passingMarks), isMandatory: Boolean(c.isMandatory) }, String(c.id))} className="text-xs font-bold text-blue-700">Edit</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'Trainers' && data && (
          <div>
            <div className="flex justify-end mb-3">
              <button type="button" onClick={() => openModal('trainer', { trainerType: 'INTERNAL', fullName: '', department: '', expertise: '', feesPerSession: 0 })} className={am.btnPrimary}><Plus size={14} /> Add Trainer</button>
            </div>
            <div className={am.tableWrap}>
              <table className="w-full">
                <thead><tr><th className={am.th}>Type</th><th className={am.th}>Name</th><th className={am.th}>Dept / Org</th><th className={am.th}>Expertise</th><th className={am.th}>Rating</th><th className={am.th}>Fees</th></tr></thead>
                <tbody>
                  {data.trainers.map((t) => (
                    <tr key={String(t.id)}>
                      <td className={am.td}><StatusBadge status={String(t.trainerType)} /></td>
                      <td className={am.td}>{String(t.fullName)}</td>
                      <td className={am.td}>{String(t.department) || String(t.organization)}</td>
                      <td className={am.td}>{String(t.expertise)}</td>
                      <td className={am.td}>⭐ {Number(t.rating).toFixed(1)}</td>
                      <td className={am.td}>{Number(t.feesPerSession) > 0 ? `₹${Number(t.feesPerSession).toLocaleString('en-IN')}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'Calendar' && data && (
          <div>
            <div className="flex justify-end mb-3">
              <button type="button" onClick={() => setTab('Batches')} className={am.btnSecondary}>Schedule via Batches →</button>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.calendar.length === 0 ? (
                <p className="text-slate-400 col-span-3 text-center py-8">No calendar events — create a batch first</p>
              ) : data.calendar.map((ev) => (
                <div key={String(ev.id)} className={`${am.card} p-4`}>
                  <div className="flex items-center gap-2 mb-2"><Calendar size={14} className="text-amber-600" /><span className="text-xs font-bold text-slate-500">{String(ev.date)}</span></div>
                  <p className="font-bold text-slate-800">{String(ev.title)}</p>
                  <p className="text-sm text-slate-500 mt-1">{String(ev.startTime)} – {String(ev.endTime)} · {String(ev.venue)}</p>
                  <StatusBadge status={String(ev.status)} />
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'Batches' && data && (
          <div>
            <div className="flex justify-end mb-3">
              <button type="button" onClick={() => openModal('batch', { courseId: data.courses[0]?.id ?? '', trainerId: data.trainers[0]?.id ?? '', venueId: data.venues[0]?.id ?? '', sessionDate: new Date().toISOString().slice(0, 10), startTime: '10:00', endTime: '13:00', capacity: 30 })} className={am.btnPrimary}><Plus size={14} /> Schedule Batch</button>
            </div>
            <div className={am.tableWrap}>
              <table className="w-full">
                <thead><tr><th className={am.th}>Batch</th><th className={am.th}>Course</th><th className={am.th}>Trainer</th><th className={am.th}>Date</th><th className={am.th}>Nominations</th><th className={am.th}>Status</th></tr></thead>
                <tbody>
                  {data.batches.map((b) => (
                    <tr key={String(b.id)}>
                      <td className={am.td}><span className="font-mono">{String(b.batchCode)}</span></td>
                      <td className={am.td}>{String(b.courseName)}</td>
                      <td className={am.td}>{String(b.trainerName)}</td>
                      <td className={am.td}>{String(b.sessionDate)}</td>
                      <td className={am.td}>{Number(b.nominationsCount)}/{Number(b.capacity)}</td>
                      <td className={am.td}><StatusBadge status={String(b.status)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'Nominations' && data && (
          <div>
            <div className="flex justify-end mb-3">
              <button type="button" onClick={() => openModal('nominate', { batchId: data.batches[0]?.id ?? '', employeeId: data.employees[0]?.id ?? '' })} className={am.btnPrimary}><Plus size={14} /> Nominate Employee</button>
            </div>
            <div className={am.tableWrap}>
              <table className="w-full">
                <thead><tr><th className={am.th}>Employee</th><th className={am.th}>Course</th><th className={am.th}>Batch</th><th className={am.th}>Workflow</th><th className={am.th}>Status</th><th className={am.th}>Actions</th></tr></thead>
                <tbody>
                  {data.nominations.map((n) => (
                    <tr key={String(n.id)}>
                      <td className={am.td}><p className="font-semibold">{String(n.employeeName)}</p><p className="text-[10px] text-slate-400">{String(n.employeeCode)}</p></td>
                      <td className={am.td}>{String(n.courseName)}</td>
                      <td className={am.td}>{String(n.batchCode)}</td>
                      <td className={am.td}>{String(n.workflowStage)}</td>
                      <td className={am.td}><StatusBadge status={String(n.status)} /></td>
                      <td className={am.td}>
                        {n.status !== 'CONFIRMED' && (
                          <button type="button" disabled={busy} onClick={async () => { setBusy(true); try { setData(await confirmTrainingNomination(String(n.id))); setMessage('Nomination confirmed'); } finally { setBusy(false); } }} className="text-xs font-bold text-green-700">Confirm</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'LMS' && data && (
          <div className="space-y-4">
            {data.courses.map((c) => (
              <div key={String(c.id)} className={`${am.card} p-4`}>
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2"><BookOpen size={16} className="text-amber-600" />{String(c.name)}</h3>
                  <button type="button" onClick={() => openModal('courseEdit', { name: String(c.name), modules: JSON.stringify(c.modules, null, 2) }, String(c.id))} className="text-xs font-bold text-blue-700">Edit Modules</button>
                </div>
                <p className="text-xs text-slate-500 mt-1">Module → Chapter → Lesson → Video → Notes → Assignment → Quiz → Certificate</p>
                <div className="mt-3 pl-4 border-l-2 border-amber-200 space-y-2">
                  {(c.modules as Array<{ module: string; chapters?: Array<{ title: string; lessons?: Array<{ title: string; type: string }> }> }>).map((mod) => (
                    <div key={mod.module}>
                      <p className="font-semibold text-sm">{mod.module}</p>
                      {(mod.chapters ?? []).map((ch) => (
                        <div key={ch.title} className="ml-3 mt-1">
                          <p className="text-xs text-slate-600">📁 {ch.title}</p>
                          {(ch.lessons ?? []).map((l) => <p key={l.title} className="text-xs text-slate-500 ml-4">• {l.title} ({l.type})</p>)}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'Attendance' && data && (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead><tr><th className={am.th}>Employee</th><th className={am.th}>Course</th><th className={am.th}>Attended</th><th className={am.th}>Mark Attendance</th></tr></thead>
              <tbody>
                {data.nominations.map((n) => (
                  <tr key={String(n.id)}>
                    <td className={am.td}>{String(n.employeeName)}</td>
                    <td className={am.td}>{String(n.courseName)}</td>
                    <td className={am.td}>{n.hasAttendance ? <span className="text-green-700 font-bold">✓ Present</span> : '—'}</td>
                    <td className={am.td}>
                      {!n.hasAttendance && (
                        <div className="flex flex-wrap gap-1">
                          {['QR', 'GPS', 'BIOMETRIC', 'MANUAL', 'OTP'].map((m) => (
                            <button key={m} type="button" disabled={busy} onClick={async () => { setBusy(true); try { setData(await markTrainingAttendance(String(n.id), m)); setMessage(`Attendance marked (${m})`); } finally { setBusy(false); } }} className="text-[10px] font-bold text-amber-700 px-1">{m}</button>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'Assessments' && data && (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead><tr><th className={am.th}>Employee</th><th className={am.th}>Assessment</th><th className={am.th}>Score</th><th className={am.th}>Status</th><th className={am.th}>Actions</th></tr></thead>
              <tbody>
                {data.assessments.map((a) => (
                  <tr key={String(a.id)}>
                    <td className={am.td}>{String(a.employeeName)}</td>
                    <td className={am.td}>{String(a.title)}</td>
                    <td className={am.td}>{a.status === 'COMPLETED' ? <span className="font-bold">{Number(a.score)}/{Number(a.maxScore)}</span> : '—'}</td>
                    <td className={am.td}><StatusBadge status={String(a.status)} /></td>
                    <td className={am.td}>
                      {a.status === 'PENDING' && (
                        <button type="button" disabled={busy} onClick={async () => { setBusy(true); try { setData(await completeTrainingAssessment(String(a.id), 78)); setMessage('Assessment completed — certificate auto-issued if passed'); } finally { setBusy(false); } }} className="text-xs font-bold text-green-700">Complete (Score 78)</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'Assignments' && data && (
          <div>
            <div className="flex justify-end mb-3">
              <button type="button" onClick={() => openModal('assignment', { nominationId: data.nominations[0]?.id ?? '', title: '', assignmentType: 'LESSON_PLAN' })} className={am.btnPrimary}><Plus size={14} /> Add Assignment</button>
            </div>
            <div className={am.tableWrap}>
              <table className="w-full">
                <thead><tr><th className={am.th}>Employee</th><th className={am.th}>Title</th><th className={am.th}>Type</th><th className={am.th}>Status</th><th className={am.th}>Actions</th></tr></thead>
                <tbody>
                  {data.assignments.length === 0 ? (
                    <tr><td colSpan={5} className={`${am.td} text-center text-slate-400 py-8`}>No assignments yet</td></tr>
                  ) : data.assignments.map((a) => (
                    <tr key={String(a.id)}>
                      <td className={am.td}>{String(a.employeeName)}</td>
                      <td className={am.td}>{String(a.title)}</td>
                      <td className={am.td}>{String(a.assignmentType).replace(/_/g, ' ')}</td>
                      <td className={am.td}><StatusBadge status={String(a.status)} /></td>
                      <td className={am.td}>
                        {a.status === 'SUBMITTED' && (
                          <button type="button" disabled={busy} onClick={async () => { setBusy(true); try { setData(await gradeTrainingAssignment(String(a.id), 'APPROVED')); setMessage('Assignment approved'); } finally { setBusy(false); } }} className="text-xs font-bold text-green-700">Approve</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'Feedback' && data && (
          <div>
            <div className="flex justify-end mb-3">
              <button type="button" onClick={() => openModal('feedback', { nominationId: data.nominations[0]?.id ?? '', feedbackBy: 'EMPLOYEE', rating: 4, effectivenessScore: 85, comments: '' })} className={am.btnPrimary}><Plus size={14} /> Submit Feedback</button>
            </div>
            <div className={am.tableWrap}>
              <table className="w-full">
                <thead><tr><th className={am.th}>Employee</th><th className={am.th}>By</th><th className={am.th}>Rating</th><th className={am.th}>Effectiveness</th></tr></thead>
                <tbody>
                  {data.feedbacks.map((f) => (
                    <tr key={String(f.id)}>
                      <td className={am.td}>{String(f.employeeName)}</td>
                      <td className={am.td}>{String(f.feedbackBy)}</td>
                      <td className={am.td}>⭐ {Number(f.rating).toFixed(1)}</td>
                      <td className={am.td}>{Number(f.effectivenessScore).toFixed(0)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'Certificates' && data && (
          <div>
            <div className="flex justify-end mb-3 gap-2">
              <select id="cert-nom" className={am.input} defaultValue="">
                <option value="">Select nomination to issue cert</option>
                {data.nominations.filter((n) => !n.hasCertificate).map((n) => (
                  <option key={String(n.id)} value={String(n.id)}>{n.employeeName} — {n.courseName}</option>
                ))}
              </select>
              <button type="button" disabled={busy} onClick={async () => {
                const sel = document.getElementById('cert-nom') as HTMLSelectElement;
                if (!sel.value) return;
                setBusy(true);
                try { setData(await issueTrainingCertificate(sel.value)); setMessage('Certificate issued'); } finally { setBusy(false); }
              }} className={am.btnPrimary}><Send size={14} /> Issue Certificate</button>
            </div>
            <div className={am.tableWrap}>
              <table className="w-full">
                <thead><tr><th className={am.th}>Employee</th><th className={am.th}>Certificate #</th><th className={am.th}>Type</th><th className={am.th}>Badge</th><th className={am.th}>QR</th><th className={am.th}>Issued</th></tr></thead>
                <tbody>
                  {data.certificates.map((c) => (
                    <tr key={String(c.id)}>
                      <td className={am.td}>{String(c.employeeName)}</td>
                      <td className={am.td}><span className="font-mono text-xs">{String(c.certificateNumber)}</span></td>
                      <td className={am.td}>{String(c.certificateType)}</td>
                      <td className={am.td}>{String(c.badgeName)}</td>
                      <td className={am.td}>{c.qrVerified ? '✓' : '—'}</td>
                      <td className={am.td}>{new Date(String(c.issuedAt)).toLocaleDateString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'Competencies' && data && (
          <div>
            <div className="flex justify-end mb-3">
              <button type="button" onClick={() => openModal('competency', { name: '', category: 'Teaching Skills', code: '' })} className={am.btnPrimary}><Plus size={14} /> Add Competency</button>
            </div>
            <div className="grid md:grid-cols-3 gap-3">
              {data.competencies.map((c) => (
                <div key={String(c.id)} className={`${am.card} p-3`}>
                  <p className="text-xs text-slate-400">{String(c.category)}</p>
                  <p className="font-bold text-slate-800">{String(c.name)}</p>
                  <p className="text-xs font-mono text-slate-500">{String(c.code)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'IDP' && data && (
          <div>
            <div className="flex justify-end mb-3">
              <button type="button" onClick={() => openModal('idp', { employeeId: data.employees[0]?.id ?? '', mentorName: '', skillGaps: '', recommendedTraining: '', completionPct: 0 })} className={am.btnPrimary}><Plus size={14} /> Create IDP</button>
            </div>
            <div className={am.tableWrap}>
              <table className="w-full">
                <thead><tr><th className={am.th}>Employee</th><th className={am.th}>Department</th><th className={am.th}>Mentor</th><th className={am.th}>Completion</th><th className={am.th}>Actions</th></tr></thead>
                <tbody>
                  {data.idps.map((i) => (
                    <tr key={String(i.id)}>
                      <td className={am.td}>{String(i.employeeName)}</td>
                      <td className={am.td}>{String(i.department)}</td>
                      <td className={am.td}>{String(i.mentorName)}</td>
                      <td className={am.td}>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-amber-500 rounded-full" style={{ width: `${Number(i.completionPct)}%` }} /></div>
                          <span className="text-xs font-bold">{Number(i.completionPct).toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className={am.td}>
                        <button type="button" onClick={() => openModal('idpEdit', { completionPct: Number(i.completionPct), mentorName: String(i.mentorName) }, String(i.id))} className="text-xs font-bold text-blue-700">Update</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'Budget' && data && (
          <div>
            <div className="flex justify-end mb-3">
              <button type="button" onClick={() => openModal('budget', { category: 'Trainer Cost', allocated: 50000, utilized: 0, approvalStatus: 'PENDING' })} className={am.btnPrimary}><Plus size={14} /> Add Budget Line</button>
            </div>
            <div className={am.tableWrap}>
              <table className="w-full">
                <thead><tr><th className={am.th}>Category</th><th className={am.th}>Allocated</th><th className={am.th}>Utilized</th><th className={am.th}>Remaining</th><th className={am.th}>Approval</th><th className={am.th}>Actions</th></tr></thead>
                <tbody>
                  {data.budgets.map((b) => (
                    <tr key={String(b.id)}>
                      <td className={am.td}>{String(b.category)}</td>
                      <td className={am.td}>₹{Number(b.allocated).toLocaleString('en-IN')}</td>
                      <td className={am.td}>₹{Number(b.utilized).toLocaleString('en-IN')}</td>
                      <td className={am.td}>₹{(Number(b.allocated) - Number(b.utilized)).toLocaleString('en-IN')}</td>
                      <td className={am.td}><StatusBadge status={String(b.approvalStatus)} /></td>
                      <td className={am.td}>
                        <button type="button" onClick={() => openModal('budgetEdit', { utilized: Number(b.utilized), approvalStatus: String(b.approvalStatus) }, String(b.id))} className="text-xs font-bold text-blue-700">Update</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'External' && data && (
          <div>
            <div className="flex justify-end mb-3">
              <button type="button" onClick={() => openModal('external', { vendorName: '', programType: 'WORKSHOP', employeeName: data.employees[0]?.fullName ?? '', expenseAmount: 0, approvalStatus: 'PENDING' })} className={am.btnPrimary}><Plus size={14} /> Record External Training</button>
            </div>
            <div className={am.tableWrap}>
              <table className="w-full">
                <thead><tr><th className={am.th}>Vendor</th><th className={am.th}>Program</th><th className={am.th}>Employee</th><th className={am.th}>Expense</th><th className={am.th}>Approval</th><th className={am.th}>Status</th></tr></thead>
                <tbody>
                  {data.externalTrainings.map((e) => (
                    <tr key={String(e.id)}>
                      <td className={am.td}>{String(e.vendorName)}</td>
                      <td className={am.td}>{String(e.programType)}</td>
                      <td className={am.td}>{String(e.employeeName)}</td>
                      <td className={am.td}>₹{Number(e.expenseAmount).toLocaleString('en-IN')}</td>
                      <td className={am.td}><StatusBadge status={String(e.approvalStatus)} /></td>
                      <td className={am.td}><StatusBadge status={String(e.status)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'Analytics' && data && (
          <div className="grid md:grid-cols-2 gap-4">
            <div className={`${am.card} p-4`}>
              <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><BarChart3 size={16} /> KPI Summary</h3>
              <div className="space-y-2">
                {Object.entries(data.kpis).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm">
                    <span className="text-slate-600 capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
                    <span className="font-bold">{typeof v === 'number' && (k.includes('Rate') || k.includes('Pct') || k.includes('Utilization')) ? `${v}%` : v}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className={`${am.card} p-4`}>
              <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><Users size={16} /> Participants by Department</h3>
              {deptBreakdown.length === 0 ? <p className="text-slate-400 text-sm">No nominations yet</p> : deptBreakdown.map(([dept, count]) => (
                <div key={dept} className="flex justify-between text-sm py-1 border-b border-slate-50">
                  <span>{dept}</span><span className="font-bold text-amber-700">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'Settings' && data && (
          <div className="grid md:grid-cols-2 gap-4">
            <div className={`${am.card} p-4`}>
              <h3 className="font-bold text-slate-800 mb-3">Role-Based Access</h3>
              {(data.settings.roleMatrix as Array<{ role: string; responsibilities: string }>).map((r) => (
                <div key={r.role} className="border-b border-slate-100 py-2 text-sm">
                  <span className="font-bold">{r.role}</span>
                  <p className="text-slate-500 text-xs mt-0.5">{r.responsibilities}</p>
                </div>
              ))}
            </div>
            <div className={`${am.card} p-4 space-y-4`}>
              <h3 className="font-bold text-slate-800">Automation & Mobile</h3>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={Boolean(data.settings.mobileSyncEnabled)} onChange={async (e) => { setData(await updateTrainingSettings({ mobileSyncEnabled: e.target.checked })); setMessage('Settings saved'); }} />
                Enable Staff Mobile App Sync
              </label>
              <div className="space-y-1 text-sm">
                {Object.entries(automation).map(([k, v]) => (
                  <p key={k} className="flex items-center gap-2"><CheckCircle2 size={12} className={v ? 'text-green-600' : 'text-slate-300'} />{k.replace(/([A-Z])/g, ' $1')}</p>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <AcademicModal open={!!modal} onClose={() => setModal(null)} title={
        modal === 'tna' ? 'Add Training Need' : modal === 'category' ? 'Add Category' : modal === 'course' ? 'Add Course' :
        modal === 'courseEdit' ? 'Edit Course' : modal === 'trainer' ? 'Add Trainer' : modal === 'batch' ? 'Schedule Batch' :
        modal === 'nominate' ? 'Nominate Employee' : modal === 'assignment' ? 'Add Assignment' : modal === 'feedback' ? 'Submit Feedback' :
        modal === 'competency' ? 'Add Competency' : modal === 'idp' ? 'Create IDP' : modal === 'idpEdit' ? 'Update IDP' :
        modal === 'budget' ? 'Add Budget' : modal === 'budgetEdit' ? 'Update Budget' : modal === 'external' ? 'External Training' : ''
      } large>
        <div className="grid grid-cols-2 gap-3 text-sm max-h-[55vh] overflow-y-auto">
          {modal === 'tna' && (
            <>
              <select value={String(form.source ?? '')} onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))} className={am.input}>
                {(data?.tnaSources ?? []).map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
              </select>
              <input placeholder="Department" value={String(form.department ?? '')} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} className={am.input} />
              <input placeholder="Skill Gap" value={String(form.skillGap ?? '')} onChange={(e) => setForm((f) => ({ ...f, skillGap: e.target.value }))} className={`${am.input} col-span-2`} />
              <select value={String(form.priority ?? 'MEDIUM')} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))} className={am.input}>
                {['HIGH', 'MEDIUM', 'LOW'].map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <input type="number" placeholder="Budget" value={Number(form.budget ?? 0)} onChange={(e) => setForm((f) => ({ ...f, budget: Number(e.target.value) }))} className={am.input} />
            </>
          )}
          {modal === 'category' && (
            <>
              <input placeholder="Category Name" value={String(form.name ?? '')} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={am.input} />
              <select value={String(form.parentGroup ?? 'Academic')} onChange={(e) => setForm((f) => ({ ...f, parentGroup: e.target.value }))} className={am.input}>
                {(data?.categoryGroups ?? []).map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
              <input placeholder="Code (optional)" value={String(form.code ?? '')} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} className={`${am.input} col-span-2`} />
            </>
          )}
          {(modal === 'course' || modal === 'courseEdit') && (
            <>
              <input placeholder="Course Name" value={String(form.name ?? '')} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={`${am.input} col-span-2`} />
              {modal === 'course' && <input placeholder="Category Name" value={String(form.categoryName ?? '')} onChange={(e) => setForm((f) => ({ ...f, categoryName: e.target.value }))} className={am.input} />}
              <input type="number" placeholder="Duration (hours)" value={Number(form.durationHours ?? 3)} onChange={(e) => setForm((f) => ({ ...f, durationHours: Number(e.target.value) }))} className={am.input} />
              <input type="number" placeholder="Passing %" value={Number(form.passingMarks ?? 70)} onChange={(e) => setForm((f) => ({ ...f, passingMarks: Number(e.target.value) }))} className={am.input} />
              <label className="col-span-2 flex items-center gap-2"><input type="checkbox" checked={Boolean(form.isMandatory)} onChange={(e) => setForm((f) => ({ ...f, isMandatory: e.target.checked }))} /> Mandatory training</label>
            </>
          )}
          {modal === 'trainer' && (
            <>
              <select value={String(form.trainerType ?? 'INTERNAL')} onChange={(e) => setForm((f) => ({ ...f, trainerType: e.target.value }))} className={am.input}><option value="INTERNAL">Internal</option><option value="EXTERNAL">External</option></select>
              <input placeholder="Full Name" value={String(form.fullName ?? '')} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} className={am.input} />
              <input placeholder="Department / Organization" value={String(form.department ?? '')} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} className={am.input} />
              <input placeholder="Expertise" value={String(form.expertise ?? '')} onChange={(e) => setForm((f) => ({ ...f, expertise: e.target.value }))} className={am.input} />
            </>
          )}
          {modal === 'batch' && (
            <>
              <select value={String(form.courseId ?? '')} onChange={(e) => setForm((f) => ({ ...f, courseId: e.target.value }))} className={am.input}>
                {(data?.courses ?? []).map((c) => <option key={String(c.id)} value={String(c.id)}>{String(c.name)}</option>)}
              </select>
              <select value={String(form.trainerId ?? '')} onChange={(e) => setForm((f) => ({ ...f, trainerId: e.target.value }))} className={am.input}>
                {(data?.trainers ?? []).map((t) => <option key={String(t.id)} value={String(t.id)}>{String(t.fullName)}</option>)}
              </select>
              <input type="date" value={String(form.sessionDate ?? '')} onChange={(e) => setForm((f) => ({ ...f, sessionDate: e.target.value }))} className={am.input} />
              <input type="number" placeholder="Capacity" value={Number(form.capacity ?? 30)} onChange={(e) => setForm((f) => ({ ...f, capacity: Number(e.target.value) }))} className={am.input} />
            </>
          )}
          {modal === 'nominate' && (
            <>
              <select value={String(form.batchId ?? '')} onChange={(e) => setForm((f) => ({ ...f, batchId: e.target.value }))} className={am.input}>
                {(data?.batches ?? []).map((b) => <option key={String(b.id)} value={String(b.id)}>{String(b.batchCode)} — {String(b.courseName)}</option>)}
              </select>
              <select value={String(form.employeeId ?? '')} onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))} className={am.input}>
                {(data?.employees ?? []).map((e) => <option key={e.id} value={e.id}>{e.fullName} — {e.department}</option>)}
              </select>
            </>
          )}
          {modal === 'assignment' && (
            <>
              <select value={String(form.nominationId ?? '')} onChange={(e) => setForm((f) => ({ ...f, nominationId: e.target.value }))} className={`${am.input} col-span-2`}>
                {(data?.nominations ?? []).map((n) => <option key={String(n.id)} value={String(n.id)}>{n.employeeName} — {n.courseName}</option>)}
              </select>
              <input placeholder="Assignment Title" value={String(form.title ?? '')} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className={am.input} />
              <select value={String(form.assignmentType ?? 'LESSON_PLAN')} onChange={(e) => setForm((f) => ({ ...f, assignmentType: e.target.value }))} className={am.input}>
                {['LESSON_PLAN', 'REFLECTION', 'PROJECT', 'PORTFOLIO'].map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </>
          )}
          {modal === 'feedback' && (
            <>
              <select value={String(form.nominationId ?? '')} onChange={(e) => setForm((f) => ({ ...f, nominationId: e.target.value }))} className={`${am.input} col-span-2`}>
                {(data?.nominations ?? []).map((n) => <option key={String(n.id)} value={String(n.id)}>{n.employeeName}</option>)}
              </select>
              <input type="number" min={1} max={5} placeholder="Rating" value={Number(form.rating ?? 4)} onChange={(e) => setForm((f) => ({ ...f, rating: Number(e.target.value) }))} className={am.input} />
              <input type="number" placeholder="Effectiveness %" value={Number(form.effectivenessScore ?? 85)} onChange={(e) => setForm((f) => ({ ...f, effectivenessScore: Number(e.target.value) }))} className={am.input} />
              <textarea placeholder="Comments" value={String(form.comments ?? '')} onChange={(e) => setForm((f) => ({ ...f, comments: e.target.value }))} className={`${am.input} col-span-2`} rows={2} />
            </>
          )}
          {modal === 'competency' && (
            <>
              <input placeholder="Competency Name" value={String(form.name ?? '')} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={am.input} />
              <input placeholder="Category" value={String(form.category ?? '')} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className={am.input} />
            </>
          )}
          {(modal === 'idp' || modal === 'idpEdit') && (
            <>
              {modal === 'idp' && (
                <select value={String(form.employeeId ?? '')} onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))} className={`${am.input} col-span-2`}>
                  {(data?.employees ?? []).map((e) => <option key={e.id} value={e.id}>{e.fullName}</option>)}
                </select>
              )}
              <input placeholder="Mentor Name" value={String(form.mentorName ?? '')} onChange={(e) => setForm((f) => ({ ...f, mentorName: e.target.value }))} className={am.input} />
              <input type="number" placeholder="Completion %" value={Number(form.completionPct ?? 0)} onChange={(e) => setForm((f) => ({ ...f, completionPct: Number(e.target.value) }))} className={am.input} />
              {modal === 'idp' && (
                <>
                  <input placeholder="Skill Gaps (comma-separated)" value={String(form.skillGaps ?? '')} onChange={(e) => setForm((f) => ({ ...f, skillGaps: e.target.value }))} className={`${am.input} col-span-2`} />
                  <input placeholder="Recommended Training (comma-separated)" value={String(form.recommendedTraining ?? '')} onChange={(e) => setForm((f) => ({ ...f, recommendedTraining: e.target.value }))} className={`${am.input} col-span-2`} />
                </>
              )}
            </>
          )}
          {(modal === 'budget' || modal === 'budgetEdit') && (
            <>
              {modal === 'budget' && <input placeholder="Category" value={String(form.category ?? '')} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className={`${am.input} col-span-2`} />}
              {modal === 'budget' && <input type="number" placeholder="Allocated" value={Number(form.allocated ?? 0)} onChange={(e) => setForm((f) => ({ ...f, allocated: Number(e.target.value) }))} className={am.input} />}
              <input type="number" placeholder="Utilized" value={Number(form.utilized ?? 0)} onChange={(e) => setForm((f) => ({ ...f, utilized: Number(e.target.value) }))} className={am.input} />
              <select value={String(form.approvalStatus ?? 'PENDING')} onChange={(e) => setForm((f) => ({ ...f, approvalStatus: e.target.value }))} className={am.input}>
                {['PENDING', 'APPROVED', 'REJECTED'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </>
          )}
          {modal === 'external' && (
            <>
              <input placeholder="Vendor Name" value={String(form.vendorName ?? '')} onChange={(e) => setForm((f) => ({ ...f, vendorName: e.target.value }))} className={am.input} />
              <select value={String(form.programType ?? 'WORKSHOP')} onChange={(e) => setForm((f) => ({ ...f, programType: e.target.value }))} className={am.input}>
                {['WORKSHOP', 'CONFERENCE', 'CERTIFICATION', 'ONLINE_COURSE'].map((p) => <option key={p} value={p}>{p.replace(/_/g, ' ')}</option>)}
              </select>
              <input placeholder="Employee Name" value={String(form.employeeName ?? '')} onChange={(e) => setForm((f) => ({ ...f, employeeName: e.target.value }))} className={am.input} />
              <input type="number" placeholder="Expense Amount" value={Number(form.expenseAmount ?? 0)} onChange={(e) => setForm((f) => ({ ...f, expenseAmount: Number(e.target.value) }))} className={am.input} />
            </>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button type="button" onClick={() => setModal(null)} className={am.btnSecondary}>Cancel</button>
          <button type="button" disabled={busy} onClick={() => void saveModal()} className={am.btnPrimary}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
          </button>
        </div>
      </AcademicModal>
    </AcademicPageShell>
  );
}
