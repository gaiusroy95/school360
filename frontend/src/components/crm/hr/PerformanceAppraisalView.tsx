import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Award, BarChart3, Calendar, ClipboardCheck, Eye, Loader2, Pencil, Plus,
  RefreshCw, Save, Send, TrendingUp, Users,
} from 'lucide-react';
import {
  advancePerformanceWorkflow,
  computeHrAnnualReviews,
  fetchPerformanceAppraisal,
  generatePerformanceAppraisals,
  publishPerformanceToMobile,
  updateHrPerformanceAppraisal,
  updatePerformanceAppraisalSettings,
  type PerformanceAppraisalDashboard,
  type PerformanceAppraisalRow,
} from '../../../lib/hrServices';
import {
  am,
  AcademicLoading,
  AcademicModal,
  AcademicPageHeader,
  AcademicPageShell,
  FeeTabs,
  StatusBadge,
} from '../FeeFinanceManagement/FeeFinanceUi';

const TABS = [
  'Dashboard',
  'Quarterly Appraisal',
  'Goals & KPI',
  'Mid-Year Review',
  'Annual Review',
  'PIP Management',
  'Promotion & Increment',
  'Pay Grades',
  'EDP',
  'Settings',
] as const;
type TabId = (typeof TABS)[number];

const BAND_STYLES: Record<string, string> = {
  Outstanding: 'bg-green-100 text-green-800',
  'Exceeds Expectations': 'bg-blue-100 text-blue-800',
  'Meets Expectations': 'bg-amber-100 text-amber-800',
  'Needs Improvement': 'bg-orange-100 text-orange-800',
  Unsatisfactory: 'bg-red-100 text-red-800',
};

const STATUS_MAP: Record<string, string> = {
  DRAFT: 'Draft',
  IN_REVIEW: 'In Review',
  COMPLETED: 'Completed',
  PUBLISHED: 'Published',
};

function KpiCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: typeof Users; color: string }) {
  return (
    <div className={`${am.card} p-3`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} className={color} />
        <span className="text-[10px] font-bold text-slate-400 uppercase">{label}</span>
      </div>
      <p className="text-xl font-black text-slate-800">{value}</p>
    </div>
  );
}

function ScoreCell({ value }: { value: number }) {
  return <span className="font-semibold text-slate-700">{value > 0 ? value.toFixed(0) : '—'}</span>;
}

export function PerformanceAppraisalView() {
  const [data, setData] = useState<PerformanceAppraisalDashboard | null>(null);
  const [tab, setTab] = useState<TabId>('Quarterly Appraisal');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [quarter, setQuarter] = useState('Q1');
  const [teacherFilter, setTeacherFilter] = useState('');
  const [detail, setDetail] = useState<PerformanceAppraisalRow | null>(null);
  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, number | string>>({});

  const load = useCallback(async (seed = false) => {
    setLoading(true);
    try {
      const d = await fetchPerformanceAppraisal({ seed, academicYear, quarter });
      setData(d);
      setAcademicYear(d.academicYear);
      setQuarter(d.quarter);
    } finally {
      setLoading(false);
    }
  }, [academicYear, quarter]);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (!teacherFilter.trim()) return data.appraisals;
    const q = teacherFilter.toLowerCase();
    return data.appraisals.filter((a) => a.employeeName.toLowerCase().includes(q));
  }, [data, teacherFilter]);

  const selectedCycle = data?.selectedCycle;

  const handleGenerate = async () => {
    setBusy(true);
    try {
      const r = await generatePerformanceAppraisals({ academicYear, quarter });
      setData(r.data);
      setMessage(`Generated ${r.created} appraisals for ${quarter} (${academicYear})`);
    } finally { setBusy(false); }
  };

  const handlePublishMobile = async () => {
    const ids = (data?.appraisals ?? []).filter((a) => a.status === 'COMPLETED').map((a) => a.id);
    if (!ids.length) { setMessage('No completed appraisals to publish'); return; }
    setBusy(true);
    try {
      const r = await publishPerformanceToMobile({ ids, academicYear, quarter });
      setData(r);
      setMessage(`Published ${ids.length} appraisals to mobile apps`);
    } finally { setBusy(false); }
  };

  const handleComputeAnnual = async () => {
    setBusy(true);
    try {
      const r = await computeHrAnnualReviews(academicYear);
      setData(r);
      setMessage(`Computed annual reviews for ${r.annualReviews.length} employees`);
    } finally { setBusy(false); }
  };

  const openEdit = (row: PerformanceAppraisalRow) => {
    setDetail(row);
    setEditForm({
      taskActionScore: row.taskActionScore,
      improvementScore: row.improvementScore,
      parentEngScore: row.parentEngScore,
      parentFbScore: row.parentFbScore,
      studentFbScore: row.studentFbScore,
      kpiScore: row.kpiScore,
      competencyScore: row.competencyScore,
      attendanceScore: row.attendanceScore,
      behaviourScore: row.behaviourScore,
      feedbackScore: row.feedbackScore,
      innovationScore: row.innovationScore,
      trainingScore: row.trainingScore,
      classSubject: row.classSubject,
    });
    setEditModal(true);
  };

  const saveEdit = async () => {
    if (!detail) return;
    setBusy(true);
    try {
      const r = await updateHrPerformanceAppraisal(detail.id, editForm);
      setEditModal(false);
      setDetail(r.appraisal);
      void load();
      setMessage('Appraisal scores updated');
    } finally { setBusy(false); }
  };

  const advanceWorkflow = async (id: string) => {
    setBusy(true);
    try {
      await advancePerformanceWorkflow(id);
      void load();
      setMessage('Workflow advanced to next stage');
    } finally { setBusy(false); }
  };

  if (loading && !data) return <AcademicLoading />;

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="HR & Payroll Management › Performance Appraisal"
        title="Performance Appraisal"
        subtitle="Quarterly performance appraisal, annual review, PIP, promotions, increments & pay grades — linked to payroll"
        actions={(
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void load(true)} disabled={busy} className={am.btnSecondary}>
              <RefreshCw size={14} /> Load Demo
            </button>
            {tab === 'Quarterly Appraisal' && (
              <>
                <button type="button" onClick={() => void handleGenerate()} disabled={busy} className={am.btnSecondary}>
                  <RefreshCw size={14} /> Generate from Allocations
                </button>
                <button type="button" onClick={() => setEditModal(true)} className={am.btnPrimary}>
                  <Plus size={14} /> Add Evaluation
                </button>
              </>
            )}
            {tab === 'Annual Review' && (
              <button type="button" onClick={() => void handleComputeAnnual()} disabled={busy} className={am.btnPrimary}>
                <TrendingUp size={14} /> Compute Annual Scores
              </button>
            )}
          </div>
        )}
      />

      <div className={am.content}>
        <FeeTabs tabs={[...TABS]} active={tab} onChange={(t) => setTab(t as TabId)} />

        {message && (
          <div className="mb-4 px-4 py-2 bg-amber-50 text-amber-900 text-sm rounded-lg border border-amber-200">{message}</div>
        )}

        {tab === 'Dashboard' && data && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiCard label="Avg Score" value={data.analytics.avgAppraisalScore.toFixed(1)} icon={BarChart3} color="text-purple-600" />
              <KpiCard label="On PIP" value={data.analytics.pipCount} icon={ClipboardCheck} color="text-red-600" />
              <KpiCard label="Promotion Ready" value={data.analytics.promotionReady} icon={Award} color="text-green-600" />
              <KpiCard label="HiPo Employees" value={data.analytics.hipoCount} icon={TrendingUp} color="text-teal-600" />
            </div>
            <div className={`${am.card} p-4`}>
              <h3 className="font-bold text-slate-800 mb-3">Department-wise Performance</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className={am.th}>Department</th>
                      <th className={am.th}>Employees</th>
                      <th className={am.th}>Avg Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.analytics.departmentPerformance.length === 0 ? (
                      <tr><td colSpan={3} className={`${am.td} text-center text-slate-400`}>No data yet — generate quarterly appraisals first</td></tr>
                    ) : data.analytics.departmentPerformance.map((d) => (
                      <tr key={d.department}>
                        <td className={am.td}>{d.department}</td>
                        <td className={am.td}>{d.count}</td>
                        <td className={am.td}><span className="font-bold">{d.avgScore}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
              Score from quarterly cycles feeds annual appraisal. Calibration committee reviews increment & promotion recommendations before payroll update.
            </div>
          </div>
        )}

        {tab === 'Quarterly Appraisal' && data && (
          <>
            <div className="flex flex-wrap gap-3 mb-4">
              <div className="block space-y-1">
                <span className="text-xs font-semibold text-slate-600">Academic Year</span>
                <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className={am.input}>
                  {data.academicYears.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div className="block space-y-1">
                <span className="text-xs font-semibold text-slate-600">Quarter</span>
                <select value={quarter} onChange={(e) => setQuarter(e.target.value)} className={am.input}>
                  {['Q1', 'Q2', 'Q3', 'Q4'].map((q) => <option key={q} value={q}>{q}</option>)}
                </select>
              </div>
            </div>

            <div className={`${am.card} p-4 mb-4`}>
              <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
                <Calendar size={16} className="text-amber-600" />
                Quarterly Performance Appraisal — 4 Cycles / Year
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                {data.cycles.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setQuarter(c.cycleType)}
                    className={`text-left p-3 rounded-lg border transition-all ${
                      quarter === c.cycleType
                        ? 'border-green-500 bg-green-50 ring-1 ring-green-200'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <p className="text-xs font-bold text-amber-700">{c.cycleType}</p>
                    <p className="text-[11px] font-semibold text-slate-800 mt-0.5 line-clamp-2">{c.name}</p>
                    <p className="text-[10px] text-slate-500 mt-1">Due {c.reviewDueLabel}</p>
                  </button>
                ))}
              </div>
              {selectedCycle && (
                <p className="text-xs text-slate-500 mt-2">
                  Continuous evaluation {selectedCycle.cycleType} for academic year {academicYear} — {selectedCycle.periodLabel}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
              <KpiCard label="Teachers" value={data.kpis.teachers} icon={Users} color="text-blue-600" />
              <KpiCard label="Evaluations" value={data.kpis.evaluations} icon={ClipboardCheck} color="text-teal-600" />
              <KpiCard label="Completed" value={data.kpis.completed} icon={Award} color="text-green-600" />
              <KpiCard label="Avg Score" value={data.kpis.avgScore.toFixed(1)} icon={BarChart3} color="text-purple-600" />
              <KpiCard label="Pending" value={data.kpis.pending} icon={RefreshCw} color="text-amber-600" />
            </div>

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
                    <tr>
                      <td colSpan={11} className={`${am.td} text-center text-slate-400 py-8`}>
                        No evaluations for this cycle. Click &quot;Generate from Allocations&quot; to start.
                      </td>
                    </tr>
                  ) : filtered.map((ev) => (
                    <tr key={ev.id}>
                      <td className={am.td}>
                        <p className="font-semibold text-slate-800">{ev.employeeName}</p>
                        <p className="text-[10px] text-slate-400">{ev.employeeCode}</p>
                      </td>
                      <td className={am.td}>{ev.classSubject || '—'}</td>
                      <td className={am.td}><ScoreCell value={ev.taskActionScore} /></td>
                      <td className={am.td}><ScoreCell value={ev.improvementScore} /></td>
                      <td className={am.td}><ScoreCell value={ev.parentEngScore} /></td>
                      <td className={am.td}><ScoreCell value={ev.parentFbScore} /></td>
                      <td className={am.td}><ScoreCell value={ev.studentFbScore} /></td>
                      <td className={am.td}><span className="font-black text-amber-700">{ev.overallScore > 0 ? ev.overallScore.toFixed(1) : '—'}</span></td>
                      <td className={am.td}>
                        {ev.ratingBand ? (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${BAND_STYLES[ev.ratingBand] ?? 'bg-slate-100'}`}>{ev.ratingBand}</span>
                        ) : '—'}
                      </td>
                      <td className={am.td}><StatusBadge status={STATUS_MAP[ev.status] ?? ev.status} /></td>
                      <td className={am.td}>
                        <div className="flex gap-1">
                          <button type="button" onClick={() => setDetail(ev)} className="p-1 hover:bg-slate-100 rounded" title="View"><Eye size={14} /></button>
                          <button type="button" onClick={() => openEdit(ev)} className="p-1 hover:bg-slate-100 rounded" title="Edit"><Pencil size={14} /></button>
                          {ev.status !== 'COMPLETED' && ev.status !== 'PUBLISHED' && (
                            <button type="button" onClick={() => void advanceWorkflow(ev.id)} className="p-1 hover:bg-slate-100 rounded text-xs font-bold text-teal-700" title="Advance workflow">→</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900 max-w-md ml-auto">
              Score taking from it and creating appraisal for every quarter with taking teacher&apos;s feedback.
            </div>
          </>
        )}

        {tab === 'Goals & KPI' && data && (
          <div className={`${am.card} p-4`}>
            <h3 className="font-bold text-slate-800 mb-3">KPI Library</h3>
            <div className={am.tableWrap}>
              <table className="w-full">
                <thead>
                  <tr>
                    <th className={am.th}>Category</th>
                    <th className={am.th}>Code</th>
                    <th className={am.th}>KPI Name</th>
                    <th className={am.th}>Staff Type</th>
                    <th className={am.th}>Weight %</th>
                    <th className={am.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.kpiLibrary.map((k) => (
                    <tr key={k.id}>
                      <td className={am.td}>{k.category}</td>
                      <td className={am.td}>{k.code}</td>
                      <td className={am.td}>{k.name}</td>
                      <td className={am.td}>{k.staffType}</td>
                      <td className={am.td}>{k.weight}</td>
                      <td className={am.td}><StatusBadge status={k.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 mt-3">Goal categories: Academic, Discipline, Attendance, Administration, Parent Satisfaction, Student Development, Innovation</p>
          </div>
        )}

        {tab === 'Mid-Year Review' && data && (
          <div className={`${am.card} p-4`}>
            <h3 className="font-bold text-slate-800 mb-2">Mid-Year Review (After Q2)</h3>
            <p className="text-sm text-slate-600 mb-4">Review progress, revise KPIs, adjust targets, training recommendations, leadership potential & retention risk.</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <KpiCard label="Q1 Avg" value={data.annualReviews.length ? (data.annualReviews.reduce((s, r) => s + Number(r.q1Score), 0) / data.annualReviews.length).toFixed(1) : '0'} icon={BarChart3} color="text-blue-600" />
              <KpiCard label="Q2 Avg" value={data.annualReviews.length ? (data.annualReviews.reduce((s, r) => s + Number(r.q2Score), 0) / data.annualReviews.length).toFixed(1) : '0'} icon={BarChart3} color="text-teal-600" />
              <KpiCard label="Promotion Pipeline" value={data.analytics.promotionReady} icon={TrendingUp} color="text-green-600" />
            </div>
          </div>
        )}

        {tab === 'Annual Review' && data && (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead>
                <tr>
                  <th className={am.th}>Employee</th>
                  <th className={am.th}>Q1</th>
                  <th className={am.th}>Q2</th>
                  <th className={am.th}>Q3</th>
                  <th className={am.th}>Q4</th>
                  <th className={am.th}>Special</th>
                  <th className={am.th}>Leadership</th>
                  <th className={am.th}>Annual</th>
                  <th className={am.th}>Band</th>
                  <th className={am.th}>Increment %</th>
                  <th className={am.th}>Promotion</th>
                  <th className={am.th}>Salary Revision</th>
                </tr>
              </thead>
              <tbody>
                {data.annualReviews.length === 0 ? (
                  <tr><td colSpan={12} className={`${am.td} text-center text-slate-400 py-8`}>Compute annual reviews after completing quarterly appraisals</td></tr>
                ) : data.annualReviews.map((r) => (
                  <tr key={String(r.id)}>
                    <td className={am.td}>
                      <p className="font-semibold">{String(r.employeeName)}</p>
                      <p className="text-[10px] text-slate-400">{String(r.department)}</p>
                    </td>
                    <td className={am.td}>{Number(r.q1Score).toFixed(0)}</td>
                    <td className={am.td}>{Number(r.q2Score).toFixed(0)}</td>
                    <td className={am.td}>{Number(r.q3Score).toFixed(0)}</td>
                    <td className={am.td}>{Number(r.q4Score).toFixed(0)}</td>
                    <td className={am.td}>{Number(r.specialAchievementScore).toFixed(0)}</td>
                    <td className={am.td}>{Number(r.leadershipScore).toFixed(0)}</td>
                    <td className={am.td}><span className="font-black text-amber-700">{Number(r.annualScore).toFixed(1)}</span></td>
                    <td className={am.td}>{String(r.ratingBand)}</td>
                    <td className={am.td}>{Number(r.incrementPercent).toFixed(1)}%</td>
                    <td className={am.td}>{r.promotionEligible ? '✓ Eligible' : '—'}</td>
                    <td className={am.td}><StatusBadge status={String(r.salaryRevisionStatus)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'PIP Management' && data && (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead>
                <tr>
                  <th className={am.th}>Employee</th>
                  <th className={am.th}>Department</th>
                  <th className={am.th}>Start</th>
                  <th className={am.th}>End</th>
                  <th className={am.th}>Mentor</th>
                  <th className={am.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.pips.length === 0 ? (
                  <tr><td colSpan={6} className={`${am.td} text-center text-slate-400 py-8`}>PIP auto-created when quarterly score &lt; 70</td></tr>
                ) : data.pips.map((p) => (
                  <tr key={String(p.id)}>
                    <td className={am.td}>{String(p.employeeName)}</td>
                    <td className={am.td}>{String(p.department)}</td>
                    <td className={am.td}>{String(p.startDate)}</td>
                    <td className={am.td}>{String(p.endDate)}</td>
                    <td className={am.td}>{String(p.mentorName)}</td>
                    <td className={am.td}><StatusBadge status={String(p.completionStatus)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'Promotion & Increment' && data && (
          <div className="grid md:grid-cols-2 gap-4">
            <div className={`${am.card} p-4`}>
              <h3 className="font-bold text-slate-800 mb-3">Promotion Matrix</h3>
              <div className={am.tableWrap}>
                <table className="w-full text-sm">
                  <thead><tr><th className={am.th}>Min Score</th><th className={am.th}>Outcome</th></tr></thead>
                  <tbody>
                    {(data.settings.promotionMatrix as Array<{ minScore: number; outcome: string }>).map((p) => (
                      <tr key={p.minScore}><td className={am.td}>{p.minScore}+</td><td className={am.td}>{p.outcome}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className={`${am.card} p-4`}>
              <h3 className="font-bold text-slate-800 mb-3">Increment Matrix</h3>
              <div className={am.tableWrap}>
                <table className="w-full text-sm">
                  <thead><tr><th className={am.th}>Band</th><th className={am.th}>Increment %</th></tr></thead>
                  <tbody>
                    {(data.settings.incrementMatrix as Array<{ band: string; minPercent: number; maxPercent: number }>).map((i) => (
                      <tr key={i.band}><td className={am.td}>{i.band}</td><td className={am.td}>{i.minPercent}–{i.maxPercent}%</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {tab === 'Pay Grades' && data && (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead>
                <tr>
                  <th className={am.th}>Code</th>
                  <th className={am.th}>Grade Name</th>
                  <th className={am.th}>Level</th>
                  <th className={am.th}>Min Salary</th>
                  <th className={am.th}>Max Salary</th>
                </tr>
              </thead>
              <tbody>
                {data.payGrades.map((g) => (
                  <tr key={g.id}>
                    <td className={am.td}><span className="font-mono font-bold">{g.code}</span></td>
                    <td className={am.td}>{g.name}</td>
                    <td className={am.td}>{g.level}</td>
                    <td className={am.td}>₹{g.minSalary.toLocaleString('en-IN')}</td>
                    <td className={am.td}>₹{g.maxSalary.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'EDP' && data && (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead>
                <tr>
                  <th className={am.th}>Employee</th>
                  <th className={am.th}>Review Type</th>
                  <th className={am.th}>Leadership Readiness</th>
                  <th className={am.th}>Career Aspirations</th>
                  <th className={am.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.developmentPlans.length === 0 ? (
                  <tr><td colSpan={5} className={`${am.td} text-center text-slate-400 py-8`}>EDP auto-generated after completed reviews</td></tr>
                ) : data.developmentPlans.map((e) => (
                  <tr key={String(e.id)}>
                    <td className={am.td}>{String(e.employeeName)}</td>
                    <td className={am.td}>{String(e.reviewType)}</td>
                    <td className={am.td}>{String(e.leadershipReadiness)}</td>
                    <td className={am.td}>{String(e.careerAspirations)}</td>
                    <td className={am.td}><StatusBadge status={String(e.status)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'Settings' && data && (
          <SettingsPanel settings={data.settings} onSave={async (body) => {
            setBusy(true);
            try {
              const r = await updatePerformanceAppraisalSettings(body);
              setData(r);
              setMessage('Performance settings saved');
            } finally { setBusy(false); }
          }} saving={busy} />
        )}
      </div>

      {detail && !editModal && (
        <AcademicModal open title="Appraisal Detail" onClose={() => setDetail(null)} large>
          <div className="space-y-3 text-sm">
            <p className="font-bold text-lg">{detail.employeeName}</p>
            <p className="text-slate-500">{detail.classSubject} · {detail.quarter} {detail.academicYear}</p>
            <p className="text-2xl font-black text-amber-700">{detail.overallScore.toFixed(1)} <span className="text-sm font-normal">{detail.ratingBand}</span></p>
            <p>Workflow: {detail.workflowStage} · Outcome: {detail.outcome}</p>
            <button type="button" onClick={() => setDetail(null)} className={am.btnSecondary}>Close</button>
          </div>
        </AcademicModal>
      )}

      {editModal && (
        <AcademicModal open title={detail ? `Edit — ${detail.employeeName}` : 'Add Evaluation'} onClose={() => { setEditModal(false); setDetail(null); }} large>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {['taskActionScore', 'improvementScore', 'parentEngScore', 'parentFbScore', 'studentFbScore',
              'kpiScore', 'competencyScore', 'attendanceScore', 'behaviourScore', 'feedbackScore', 'innovationScore', 'trainingScore'].map((field) => (
              <div key={field} className="block space-y-1">
                <span className="text-xs font-semibold text-slate-600">{field.replace(/Score$/, '').replace(/([A-Z])/g, ' $1')}</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={Number(editForm[field] ?? 0)}
                  onChange={(e) => setEditForm((f) => ({ ...f, [field]: Number(e.target.value) }))}
                  className={am.input}
                />
              </div>
            ))}
            <div className="col-span-2 block space-y-1">
              <span className="text-xs font-semibold text-slate-600">Class / Subject</span>
              <input value={String(editForm.classSubject ?? '')} onChange={(e) => setEditForm((f) => ({ ...f, classSubject: e.target.value }))} className={am.input} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button type="button" onClick={() => setEditModal(false)} className={am.btnSecondary}>Cancel</button>
            <button type="button" onClick={() => void saveEdit()} disabled={busy} className={am.btnPrimary}>
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
            </button>
          </div>
        </AcademicModal>
      )}
    </AcademicPageShell>
  );
}

function SettingsPanel({
  settings,
  onSave,
  saving,
}: {
  settings: Record<string, unknown>;
  onSave: (body: Record<string, unknown>) => Promise<void>;
  saving: boolean;
}) {
  const weightage = settings.weightage as Record<string, number>;
  const [form, setForm] = useState<Record<string, number>>({
    pipThreshold: Number(settings.pipThreshold ?? 70),
    pipDurationDays: Number(settings.pipDurationDays ?? 90),
    kpi: weightage.kpi ?? 35,
    competency: weightage.competency ?? 25,
    attendance: weightage.attendance ?? 10,
    behaviour: weightage.behaviour ?? 10,
    feedback: weightage.feedback ?? 10,
    innovation: weightage.innovation ?? 5,
    training: weightage.training ?? 5,
  });

  return (
    <div className={`${am.card} p-4 space-y-4`}>
      <h3 className="font-bold text-slate-800">Weightage & PIP Settings</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {['kpi', 'competency', 'attendance', 'behaviour', 'feedback', 'innovation', 'training'].map((k) => (
          <div key={k} className="block space-y-1">
            <span className="text-xs font-semibold text-slate-600 capitalize">{k} %</span>
            <input type="number" value={form[k] ?? 0} onChange={(e) => setForm((f) => ({ ...f, [k]: Number(e.target.value) }))} className={am.input} />
          </div>
        ))}
        <div className="block space-y-1">
          <span className="text-xs font-semibold text-slate-600">PIP Threshold</span>
          <input type="number" value={form.pipThreshold} onChange={(e) => setForm((f) => ({ ...f, pipThreshold: Number(e.target.value) }))} className={am.input} />
        </div>
        <div className="block space-y-1">
          <span className="text-xs font-semibold text-slate-600">PIP Duration (days)</span>
          <input type="number" value={form.pipDurationDays} onChange={(e) => setForm((f) => ({ ...f, pipDurationDays: Number(e.target.value) }))} className={am.input} />
        </div>
      </div>
      <button
        type="button"
        disabled={saving}
        onClick={() => void onSave({
          weightage: {
            kpi: form.kpi, competency: form.competency, attendance: form.attendance,
            behaviour: form.behaviour, feedback: form.feedback, innovation: form.innovation, training: form.training,
          },
          pipThreshold: form.pipThreshold,
          pipDurationDays: form.pipDurationDays,
        })}
        className={am.btnPrimary}
      >
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Settings
      </button>
      <div className={`${am.card} p-3 bg-slate-50`}>
        <p className="text-xs font-bold text-slate-500 uppercase mb-2">Approval Matrix</p>
        <div className="grid md:grid-cols-2 gap-1 text-sm">
          {(settings.approvalMatrix as Array<{ action: string; level: string }>).map((a) => (
            <p key={a.action}><span className="text-slate-500">{a.action}:</span> <span className="font-semibold">{a.level}</span></p>
          ))}
        </div>
      </div>
    </div>
  );
}
