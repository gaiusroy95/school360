import { useCallback, useEffect, useState } from 'react';
import {
  BarChart3, BookOpen, Calendar, CheckCircle2, ChevronRight,
  RefreshCw, Smartphone, Users,
} from 'lucide-react';
import {
  approveTrainingAnnualPlan,
  fetchTrainingDashboard,
  markTrainingAttendance,
  type TrainingDashboard,
} from '../../../lib/hrServices';
import {
  am,
  AcademicLoading,
  AcademicPageHeader,
  AcademicPageShell,
  FeeTabs,
  StatusBadge,
} from '../FeeFinanceManagement/FeeFinanceUi';

const TABS = [
  'Dashboard',
  'Workflow',
  'TNA',
  'Categories',
  'Courses',
  'Trainers',
  'Calendar',
  'Batches',
  'Nominations',
  'LMS',
  'Attendance',
  'Assessments',
  'Assignments',
  'Feedback',
  'Certificates',
  'Competencies',
  'IDP',
  'Budget',
  'External',
  'Analytics',
  'Settings',
] as const;
type TabId = (typeof TABS)[number];

function Kpi({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className={`${am.card} p-3`}>
      <p className="text-[10px] font-bold text-slate-400 uppercase">{label}</p>
      <p className="text-xl font-black text-slate-900 mt-1">{value}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function WorkflowDiagram({ workflow }: { workflow: TrainingDashboard['workflow'] }) {
  return (
    <div className={`${am.card} p-6`}>
      <h3 className="font-bold text-slate-800 mb-4 text-center">Annual Training Workflow</h3>
      <div className="flex flex-col items-center max-w-md mx-auto">
        {workflow.map((step, i) => (
          <div key={step.key} className="flex flex-col items-center w-full">
            <div className="w-full text-center px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700">
              {step.label}
            </div>
            {i < workflow.length - 1 && (
              <div className="flex flex-col items-center py-1">
                <div className="w-0.5 h-2 bg-slate-300" />
                <span className="text-slate-400 text-xs">|</span>
                <div className="w-0.5 h-2 bg-slate-300" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ModuleTree() {
  const modules = [
    'Training Dashboard', 'Annual Training Calendar', 'Training Need Analysis (TNA)',
    'Training Categories', 'Course Master', 'Trainer Management', 'Training Batch Management',
    'Nomination Management', 'Learning Management (LMS)', 'Live Training Sessions',
    'Assessments & Quiz', 'Assignment Management', 'Attendance Management',
    'Feedback & Evaluation', 'Certification Management', 'Competency Development',
    'Individual Development Plan (IDP)', 'Training Budget', 'External Training',
    'Training Reports', 'Training Analytics', 'Settings',
  ];
  return (
    <div className={`${am.card} p-4`}>
      <h3 className="font-bold text-slate-800 mb-2">Module Architecture</h3>
      <p className="text-xs text-amber-700 font-bold mb-2">HR Management</p>
      <div className="space-y-1 text-sm text-slate-600 pl-3 border-l-2 border-amber-200">
        {modules.map((m) => (
          <p key={m} className="flex items-center gap-1">
            <ChevronRight size={12} className="text-slate-400 shrink-0" />
            {m}
          </p>
        ))}
      </div>
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

  const load = useCallback(async (seed = false) => {
    setLoading(true);
    try {
      const d = await fetchTrainingDashboard({ seed, academicYear });
      setData(d);
      setAcademicYear(d.academicYear);
    } finally { setLoading(false); }
  }, [academicYear]);

  useEffect(() => { void load(); }, [load]);

  if (loading && !data) return <AcademicLoading />;

  const automation = (data?.settings.automationRules ?? {}) as Record<string, unknown>;

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="HR & Payroll Management › Training & Development"
        title="Training & Development"
        subtitle="Enterprise LMS integrated with HRMS — courses, nominations, attendance, assessments, certificates & mobile sync"
        actions={(
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void load(true)} disabled={busy} className={am.btnSecondary}>
              <RefreshCw size={14} /> Load Demo
            </button>
            {data?.annualPlan && !data.annualPlan.calendarPublished && (
              <button type="button" onClick={async () => {
                setBusy(true);
                try { setData(await approveTrainingAnnualPlan(academicYear)); setMessage('Annual plan approved & calendar published'); }
                finally { setBusy(false); }
              }} className={am.btnPrimary}>
                <CheckCircle2 size={14} /> Approve Annual Plan
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
            <div className="grid lg:grid-cols-3 gap-4">
              <WorkflowDiagram workflow={data.workflow} />
              <ModuleTree />
              <div className={`${am.card} p-4`}>
                <h3 className="font-bold text-slate-800 mb-3">Database Masters</h3>
                <div className="grid grid-cols-2 gap-1 text-xs text-slate-600 max-h-80 overflow-y-auto">
                  {data.databaseMasters.map((m) => (
                    <p key={m} className="flex items-center gap-1">
                      <CheckCircle2 size={10} className="text-green-600 shrink-0" /> {m}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'Workflow' && data && (
          <div className="grid lg:grid-cols-2 gap-4">
            <WorkflowDiagram workflow={data.workflow} />
            <div className={`${am.card} p-4`}>
              <h3 className="font-bold text-slate-800 mb-3">Workflow Automation</h3>
              <div className="space-y-2 text-sm text-slate-600">
                {[
                  'Send nomination notifications',
                  'Schedule calendar invites',
                  'Send reminders (7d, 3d, 1d, 1hr before)',
                  'Mark attendance via QR/GPS/Biometric',
                  'Unlock content after attendance',
                  'Trigger quizzes after completion',
                  'Issue certificates on passing',
                  'Update competency records',
                  'Link training to annual appraisal',
                  'Notify managers of overdue mandatory training',
                  'Recommend refresher before cert expiry',
                ].map((rule) => (
                  <p key={rule} className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-green-600 shrink-0 mt-0.5" />
                    {rule}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'TNA' && data && (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead>
                <tr>
                  <th className={am.th}>Source</th>
                  <th className={am.th}>Department</th>
                  <th className={am.th}>Employee</th>
                  <th className={am.th}>Skill Gap</th>
                  <th className={am.th}>Priority</th>
                  <th className={am.th}>Budget</th>
                  <th className={am.th}>Target Date</th>
                  <th className={am.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.trainingNeeds.length === 0 ? (
                  <tr><td colSpan={8} className={`${am.td} text-center text-slate-400 py-8`}>No training needs identified — load demo or add from appraisal</td></tr>
                ) : data.trainingNeeds.map((n) => (
                  <tr key={String(n.id)}>
                    <td className={am.td}>{String(n.source).replace(/_/g, ' ')}</td>
                    <td className={am.td}>{String(n.department)}</td>
                    <td className={am.td}>{String(n.employeeName) || '—'}</td>
                    <td className={am.td}>{String(n.skillGap)}</td>
                    <td className={am.td}><StatusBadge status={String(n.priority)} /></td>
                    <td className={am.td}>₹{Number(n.budget).toLocaleString('en-IN')}</td>
                    <td className={am.td}>{String(n.targetDate) || '—'}</td>
                    <td className={am.td}><StatusBadge status={String(n.status)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-slate-500 mt-2 p-2">TNA sources: Appraisal, Quarterly Review, Department Request, Principal, Student/Parent Feedback, Audit, Board Compliance, ERP Gaps</p>
          </div>
        )}

        {tab === 'Categories' && data && (
          <div className="grid md:grid-cols-2 gap-4">
            {data.categoryGroups.map((group) => (
              <div key={group} className={`${am.card} p-4`}>
                <h3 className="font-bold text-slate-800 mb-2">{group}</h3>
                <div className="flex flex-wrap gap-2">
                  {data.categories.filter((c) => c.parentGroup === group).map((c) => (
                    <span key={c.id} className="px-2 py-1 bg-slate-100 rounded text-xs font-medium">{c.name}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'Courses' && data && (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead>
                <tr>
                  <th className={am.th}>Code</th>
                  <th className={am.th}>Course Name</th>
                  <th className={am.th}>Category</th>
                  <th className={am.th}>Duration</th>
                  <th className={am.th}>Mode</th>
                  <th className={am.th}>Pass %</th>
                  <th className={am.th}>Mandatory</th>
                  <th className={am.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.courses.map((c) => (
                  <tr key={String(c.id)}>
                    <td className={am.td}><span className="font-mono font-bold">{String(c.code)}</span></td>
                    <td className={am.td}>{String(c.name)}</td>
                    <td className={am.td}>{String(c.category)}</td>
                    <td className={am.td}>{Number(c.durationHours)}h</td>
                    <td className={am.td}>{String(c.mode)}</td>
                    <td className={am.td}>{Number(c.passingMarks)}%</td>
                    <td className={am.td}>{c.isMandatory ? '✓' : '—'}</td>
                    <td className={am.td}><StatusBadge status={String(c.status)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'Trainers' && data && (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead>
                <tr>
                  <th className={am.th}>Type</th>
                  <th className={am.th}>Name</th>
                  <th className={am.th}>Department / Org</th>
                  <th className={am.th}>Expertise</th>
                  <th className={am.th}>Rating</th>
                  <th className={am.th}>Fees/Session</th>
                </tr>
              </thead>
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
        )}

        {tab === 'Calendar' && data && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.calendar.map((ev) => (
              <div key={String(ev.id)} className={`${am.card} p-4`}>
                <div className="flex items-center gap-2 mb-2">
                  <Calendar size={14} className="text-amber-600" />
                  <span className="text-xs font-bold text-slate-500">{String(ev.date)}</span>
                </div>
                <p className="font-bold text-slate-800">{String(ev.title)}</p>
                <p className="text-sm text-slate-500 mt-1">{String(ev.startTime)} – {String(ev.endTime)} · {String(ev.venue)}</p>
                <p className="text-xs text-slate-400 mt-1">{String(ev.branch)}</p>
                <StatusBadge status={String(ev.status)} />
              </div>
            ))}
          </div>
        )}

        {tab === 'Batches' && data && (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead>
                <tr>
                  <th className={am.th}>Batch</th>
                  <th className={am.th}>Course</th>
                  <th className={am.th}>Trainer</th>
                  <th className={am.th}>Venue</th>
                  <th className={am.th}>Date</th>
                  <th className={am.th}>Time</th>
                  <th className={am.th}>Nominations</th>
                  <th className={am.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.batches.map((b) => (
                  <tr key={String(b.id)}>
                    <td className={am.td}><span className="font-mono">{String(b.batchCode)}</span></td>
                    <td className={am.td}>{String(b.courseName)}</td>
                    <td className={am.td}>{String(b.trainerName)}</td>
                    <td className={am.td}>{String(b.venueName)}</td>
                    <td className={am.td}>{String(b.sessionDate)}</td>
                    <td className={am.td}>{String(b.startTime)}–{String(b.endTime)}</td>
                    <td className={am.td}>{Number(b.nominationsCount)}/{Number(b.capacity)}</td>
                    <td className={am.td}><StatusBadge status={String(b.status)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'Nominations' && data && (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead>
                <tr>
                  <th className={am.th}>Employee</th>
                  <th className={am.th}>Course</th>
                  <th className={am.th}>Batch</th>
                  <th className={am.th}>Method</th>
                  <th className={am.th}>Workflow</th>
                  <th className={am.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.nominations.map((n) => (
                  <tr key={String(n.id)}>
                    <td className={am.td}>
                      <p className="font-semibold">{String(n.employeeName)}</p>
                      <p className="text-[10px] text-slate-400">{String(n.employeeCode)}</p>
                    </td>
                    <td className={am.td}>{String(n.courseName)}</td>
                    <td className={am.td}>{String(n.batchCode)}</td>
                    <td className={am.td}>{String(n.nominationMethod).replace(/_/g, ' ')}</td>
                    <td className={am.td}>{String(n.workflowStage)}</td>
                    <td className={am.td}><StatusBadge status={String(n.status)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-slate-500 mt-2 p-2">Nomination workflow: Employee → Reporting Manager → HR → Confirmed</p>
          </div>
        )}

        {tab === 'LMS' && data && (
          <div className="space-y-4">
            {data.courses.map((c) => (
              <div key={String(c.id)} className={`${am.card} p-4`}>
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <BookOpen size={16} className="text-amber-600" />
                  {String(c.name)} <span className="text-xs font-normal text-slate-400">({String(c.code)})</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">Module → Chapter → Lesson → Video → Notes → Assignment → Quiz → Certificate</p>
                <div className="mt-3 pl-4 border-l-2 border-amber-200 space-y-2">
                  {(c.modules as Array<{ module: string; chapters?: Array<{ title: string; lessons?: Array<{ title: string; type: string }> }> }>).map((mod) => (
                    <div key={mod.module}>
                      <p className="font-semibold text-sm">{mod.module}</p>
                      {(mod.chapters ?? []).map((ch) => (
                        <div key={ch.title} className="ml-3 mt-1">
                          <p className="text-xs text-slate-600">📁 {ch.title}</p>
                          {(ch.lessons ?? []).map((l) => (
                            <p key={l.title} className="text-xs text-slate-500 ml-4">• {l.title} ({l.type})</p>
                          ))}
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
              <thead>
                <tr>
                  <th className={am.th}>Employee</th>
                  <th className={am.th}>Course</th>
                  <th className={am.th}>Attended</th>
                  <th className={am.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.nominations.map((n) => (
                  <tr key={String(n.id)}>
                    <td className={am.td}>{String(n.employeeName)}</td>
                    <td className={am.td}>{String(n.courseName)}</td>
                    <td className={am.td}>{n.hasAttendance ? <span className="text-green-700 font-bold">✓ Present</span> : '—'}</td>
                    <td className={am.td}>
                      {!n.hasAttendance && (
                        <button type="button" onClick={async () => {
                          setBusy(true);
                          try { setData(await markTrainingAttendance(String(n.id), 'QR')); setMessage('Attendance marked (QR) — synced to HRMS'); }
                          finally { setBusy(false); }
                        }} className="text-xs font-bold text-amber-700">Mark QR Attendance</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-slate-500 mt-2 p-2">Methods: QR Code, GPS, Face Recognition, Manual, Biometric, OTP — syncs to HRMS attendance register</p>
          </div>
        )}

        {tab === 'Assessments' && data && (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead>
                <tr>
                  <th className={am.th}>Employee</th>
                  <th className={am.th}>Assessment</th>
                  <th className={am.th}>Score</th>
                  <th className={am.th}>Passed</th>
                  <th className={am.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.assessments.map((a) => (
                  <tr key={String(a.id)}>
                    <td className={am.td}>{String(a.employeeName)}</td>
                    <td className={am.td}>{String(a.title)}</td>
                    <td className={am.td}><span className="font-bold">{Number(a.score)}/{Number(a.maxScore)}</span></td>
                    <td className={am.td}>{a.passed ? '✓' : '✗'}</td>
                    <td className={am.td}><StatusBadge status={String(a.status)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'Assignments' && data && (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead><tr><th className={am.th}>Employee</th><th className={am.th}>Title</th><th className={am.th}>Type</th><th className={am.th}>Status</th></tr></thead>
              <tbody>
                {data.assignments.length === 0 ? (
                  <tr><td colSpan={4} className={`${am.td} text-center text-slate-400`}>Assignments uploaded via Staff Mobile App</td></tr>
                ) : data.assignments.map((a) => (
                  <tr key={String(a.id)}>
                    <td className={am.td}>{String(a.employeeName)}</td>
                    <td className={am.td}>{String(a.title)}</td>
                    <td className={am.td}>{String(a.assignmentType).replace(/_/g, ' ')}</td>
                    <td className={am.td}><StatusBadge status={String(a.status)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'Feedback' && data && (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead>
                <tr>
                  <th className={am.th}>Employee</th>
                  <th className={am.th}>By</th>
                  <th className={am.th}>Rating</th>
                  <th className={am.th}>Effectiveness</th>
                </tr>
              </thead>
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
        )}

        {tab === 'Certificates' && data && (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead>
                <tr>
                  <th className={am.th}>Employee</th>
                  <th className={am.th}>Certificate #</th>
                  <th className={am.th}>Type</th>
                  <th className={am.th}>Badge</th>
                  <th className={am.th}>QR Verified</th>
                  <th className={am.th}>Issued</th>
                </tr>
              </thead>
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
        )}

        {tab === 'Competencies' && data && (
          <div className="grid md:grid-cols-3 gap-3">
            {data.competencies.map((c) => (
              <div key={String(c.id)} className={`${am.card} p-3`}>
                <p className="text-xs text-slate-400">{String(c.category)}</p>
                <p className="font-bold text-slate-800">{String(c.name)}</p>
                <p className="text-xs font-mono text-slate-500">{String(c.code)}</p>
              </div>
            ))}
          </div>
        )}

        {tab === 'IDP' && data && (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead>
                <tr>
                  <th className={am.th}>Employee</th>
                  <th className={am.th}>Department</th>
                  <th className={am.th}>Mentor</th>
                  <th className={am.th}>Completion</th>
                  <th className={am.th}>Next Review</th>
                </tr>
              </thead>
              <tbody>
                {data.idps.map((i) => (
                  <tr key={String(i.id)}>
                    <td className={am.td}>{String(i.employeeName)}</td>
                    <td className={am.td}>{String(i.department)}</td>
                    <td className={am.td}>{String(i.mentorName)}</td>
                    <td className={am.td}>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Number(i.completionPct)}%` }} />
                        </div>
                        <span className="text-xs font-bold">{Number(i.completionPct).toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className={am.td}>{String(i.nextReview)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'Budget' && data && (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead>
                <tr>
                  <th className={am.th}>Category</th>
                  <th className={am.th}>Allocated</th>
                  <th className={am.th}>Utilized</th>
                  <th className={am.th}>Remaining</th>
                  <th className={am.th}>Approval</th>
                </tr>
              </thead>
              <tbody>
                {data.budgets.map((b) => (
                  <tr key={String(b.id)}>
                    <td className={am.td}>{String(b.category)}</td>
                    <td className={am.td}>₹{Number(b.allocated).toLocaleString('en-IN')}</td>
                    <td className={am.td}>₹{Number(b.utilized).toLocaleString('en-IN')}</td>
                    <td className={am.td}>₹{(Number(b.allocated) - Number(b.utilized)).toLocaleString('en-IN')}</td>
                    <td className={am.td}><StatusBadge status={String(b.approvalStatus)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'External' && data && (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead>
                <tr>
                  <th className={am.th}>Vendor</th>
                  <th className={am.th}>Program</th>
                  <th className={am.th}>Employee</th>
                  <th className={am.th}>Expense</th>
                  <th className={am.th}>Approval</th>
                  <th className={am.th}>Status</th>
                </tr>
              </thead>
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
        )}

        {tab === 'Analytics' && data && (
          <div className="grid md:grid-cols-2 gap-4">
            <div className={`${am.card} p-4`}>
              <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><BarChart3 size={16} /> Training Analytics</h3>
              <div className="space-y-3">
                {Object.entries(data.kpis).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm">
                    <span className="text-slate-600 capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
                    <span className="font-bold">{typeof v === 'number' && k.includes('Rate') || k.includes('Pct') ? `${v}%` : v}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className={`${am.card} p-4`}>
              <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><Users size={16} /> Upcoming Batches</h3>
              <p className="text-3xl font-black text-amber-700">{data.kpis.upcomingBatches}</p>
              <p className="text-sm text-slate-500 mt-2">Scheduled training sessions in calendar</p>
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
            <div className={`${am.card} p-4`}>
              <h3 className="font-bold text-slate-800 mb-3">Automation Rules</h3>
              <div className="space-y-1 text-sm">
                {Object.entries(automation).map(([k, v]) => (
                  <p key={k} className="flex items-center gap-2">
                    <CheckCircle2 size={12} className={v ? 'text-green-600' : 'text-slate-300'} />
                    {k.replace(/([A-Z])/g, ' $1')}
                  </p>
                ))}
              </div>
              <h3 className="font-bold text-slate-800 mt-4 mb-2 flex items-center gap-2"><Smartphone size={14} /> Mobile App Features</h3>
              <p className="text-xs text-slate-600">Notifications · Calendar · QR Attendance · Live Sessions · Learning Content · Assessments · Certificates · Feedback · Leaderboard · Badges</p>
            </div>
          </div>
        )}
      </div>
    </AcademicPageShell>
  );
}
