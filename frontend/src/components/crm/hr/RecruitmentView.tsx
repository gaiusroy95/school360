import { useCallback, useEffect, useState } from 'react';
import {
  ArrowRight, Briefcase, CheckCircle2, ChevronRight, ClipboardList,
  Loader2, Plus, RefreshCw, Send, UserCheck,
} from 'lucide-react';
import {
  acceptRecruitmentOffer,
  advanceRecruitmentApplication,
  advanceRecruitmentOffer,
  advanceRequisitionWorkflow,
  confirmRecruitmentProbation,
  createEmployeeFromOnboarding,
  createJobPosting,
  createJobRequisition,
  createManpowerPlan,
  fetchRecruitment,
  publishJobPosting,
  type RecruitmentDashboard,
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
  'Workflow',
  'Manpower Planning',
  'Job Requisition',
  'Vacancy & Posting',
  'Candidates',
  'Screening & Shortlist',
  'Interviews',
  'Offers',
  'Background & Reference',
  'Onboarding',
  'Probation',
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

function WorkflowDiagram({ workflow, pipeline }: {
  workflow: Array<{ key: string; label: string }>;
  pipeline: Array<{ stage: string; count: number }>;
}) {
  const countMap = new Map(pipeline.map((p) => [p.stage, p.count]));
  return (
    <div className={`${am.card} p-6`}>
      <h3 className="font-bold text-slate-800 mb-4 text-center">Recruitment Workflow</h3>
      <div className="flex flex-col items-center max-w-lg mx-auto">
        {workflow.map((step, i) => {
          const count = countMap.get(step.key) ?? 0;
          const hasActivity = count > 0;
          return (
            <div key={step.key} className="flex flex-col items-center w-full">
              <div
                className={`w-full text-center px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                  hasActivity
                    ? 'bg-amber-50 border-amber-400 text-amber-900 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                <span>{step.label}</span>
                {hasActivity && (
                  <span className="ml-2 text-[10px] font-bold bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-full">
                    {count}
                  </span>
                )}
              </div>
              {i < workflow.length - 1 && (
                <div className="flex flex-col items-center py-1">
                  <div className="w-0.5 h-3 bg-slate-300" />
                  <ChevronRight size={12} className="text-slate-400 rotate-90" />
                  <div className="w-0.5 h-3 bg-slate-300" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function RecruitmentView() {
  const [data, setData] = useState<RecruitmentDashboard | null>(null);
  const [tab, setTab] = useState<TabId>('Dashboard');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [reqModal, setReqModal] = useState(false);
  const [planModal, setPlanModal] = useState(false);
  const [reqForm, setReqForm] = useState({
    department: 'Teaching', positionTitle: '', designation: '', vacancies: '1',
    employmentType: 'FULL_TIME', salaryMin: '', salaryMax: '', reasonForHiring: 'NEW_POSITION',
  });
  const [planForm, setPlanForm] = useState({
    department: 'Teaching', designation: '', existingHeadcount: '0', approvedHeadcount: '0',
    vacantPositions: '0', newPositions: '1', budgetedSalary: '', priority: 'MEDIUM', justification: '',
  });

  const load = useCallback(async (seed = false) => {
    setLoading(true);
    try {
      const d = await fetchRecruitment({ seed, academicYear });
      setData(d);
      setAcademicYear(d.academicYear);
    } finally { setLoading(false); }
  }, [academicYear]);

  useEffect(() => { void load(); }, [load]);

  const handleCreatePlan = async () => {
    setBusy(true);
    try {
      const r = await createManpowerPlan({ ...planForm, academicYear, existingHeadcount: Number(planForm.existingHeadcount), approvedHeadcount: Number(planForm.approvedHeadcount), vacantPositions: Number(planForm.vacantPositions), newPositions: Number(planForm.newPositions), budgetedSalary: Number(planForm.budgetedSalary) });
      setData(r);
      setPlanModal(false);
      setMessage('Manpower plan created');
    } finally { setBusy(false); }
  };

  const handleCreateReq = async () => {
    setBusy(true);
    try {
      const r = await createJobRequisition({ ...reqForm, academicYear, vacancies: Number(reqForm.vacancies), salaryMin: Number(reqForm.salaryMin), salaryMax: Number(reqForm.salaryMax) });
      setData(r);
      setReqModal(false);
      setMessage('Job requisition raised');
    } finally { setBusy(false); }
  };

  if (loading && !data) return <AcademicLoading />;

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="HR & Payroll Management › Recruitment"
        title="Recruitment Management System"
        subtitle="End-to-end hiring: manpower planning → requisition → interviews → offer → onboarding → probation → confirmation"
        actions={(
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void load(true)} disabled={busy} className={am.btnSecondary}>
              <RefreshCw size={14} /> Load Demo
            </button>
            <button type="button" onClick={() => setReqModal(true)} className={am.btnPrimary}>
              <Plus size={14} /> Raise Requisition
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
        </div>

        {tab === 'Dashboard' && data && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Kpi label="Open Vacancies" value={data.kpis.openVacancies} />
              <Kpi label="Positions Filled" value={data.kpis.positionsFilled} />
              <Kpi label="Time to Hire" value={`${data.kpis.timeToHireDays}d`} />
              <Kpi label="Offer Acceptance" value={`${data.kpis.offerAcceptanceRate}%`} />
              <Kpi label="Active Candidates" value={data.kpis.activeCandidates} />
              <Kpi label="Pending Requisitions" value={data.kpis.pendingRequisitions} />
              <Kpi label="Interviews Scheduled" value={data.kpis.interviewsScheduled} />
              <Kpi label="Onboarding" value={data.kpis.onboardingInProgress} />
              <Kpi label="On Probation" value={data.kpis.probationActive} />
              <Kpi label="Cost per Hire" value={`₹${data.kpis.costPerHire.toLocaleString('en-IN')}`} />
            </div>
            <div className="grid lg:grid-cols-2 gap-4">
              <div className={`${am.card} p-4`}>
                <h3 className="font-bold text-slate-800 mb-3">Candidate Pipeline</h3>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {data.pipeline.filter((p) => p.count > 0).map((p) => (
                    <div key={p.stage} className="flex items-center justify-between text-sm">
                      <span className="text-slate-600 truncate flex-1">{p.label}</span>
                      <span className="font-bold text-amber-700 ml-2">{p.count}</span>
                    </div>
                  ))}
                  {data.pipeline.every((p) => p.count === 0) && (
                    <p className="text-slate-400 text-sm">Load demo data to see pipeline</p>
                  )}
                </div>
              </div>
              <WorkflowDiagram workflow={data.workflow.slice(0, 12)} pipeline={data.pipeline} />
            </div>
          </div>
        )}

        {tab === 'Workflow' && data && (
          <div className="grid lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <WorkflowDiagram workflow={data.workflow} pipeline={data.pipeline} />
            </div>
            <div className={`${am.card} p-4 space-y-3`}>
              <h3 className="font-bold text-slate-800">Approval Workflow</h3>
              {(data.settings.approvalMatrix as Array<{ stage: string; action: string }>).map((a) => (
                <div key={a.stage} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 size={14} className="text-green-600 shrink-0" />
                  <span className="font-semibold">{a.stage}</span>
                  <ArrowRight size={12} className="text-slate-300" />
                  <span className="text-slate-500">{a.action}</span>
                </div>
              ))}
              <h3 className="font-bold text-slate-800 pt-2">Role-Based Access</h3>
              {data.roles.map((r) => (
                <div key={r.role} className="text-xs border-b border-slate-100 pb-2">
                  <span className="font-bold text-slate-700">{r.role}</span>
                  <p className="text-slate-500 mt-0.5">{r.permissions}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'Manpower Planning' && data && (
          <div>
            <div className="flex justify-end mb-3">
              <button type="button" onClick={() => setPlanModal(true)} className={am.btnPrimary}>
                <Plus size={14} /> Add Manpower Plan
              </button>
            </div>
            <div className={am.tableWrap}>
              <table className="w-full">
                <thead>
                  <tr>
                    <th className={am.th}>Department</th>
                    <th className={am.th}>Designation</th>
                    <th className={am.th}>Existing</th>
                    <th className={am.th}>Approved</th>
                    <th className={am.th}>Vacant</th>
                    <th className={am.th}>New</th>
                    <th className={am.th}>Budget</th>
                    <th className={am.th}>Priority</th>
                    <th className={am.th}>Deadline</th>
                    <th className={am.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.manpowerPlans.length === 0 ? (
                    <tr><td colSpan={10} className={`${am.td} text-center text-slate-400 py-8`}>No manpower plans — add one to forecast staffing</td></tr>
                  ) : data.manpowerPlans.map((m) => (
                    <tr key={String(m.id)}>
                      <td className={am.td}>{String(m.department)}</td>
                      <td className={am.td}>{String(m.designation)}</td>
                      <td className={am.td}>{Number(m.existingHeadcount)}</td>
                      <td className={am.td}>{Number(m.approvedHeadcount)}</td>
                      <td className={am.td}>{Number(m.vacantPositions)}</td>
                      <td className={am.td}>{Number(m.newPositions)}</td>
                      <td className={am.td}>₹{Number(m.budgetedSalary).toLocaleString('en-IN')}</td>
                      <td className={am.td}><StatusBadge status={String(m.priority)} /></td>
                      <td className={am.td}>{String(m.recruitmentDeadline || '—')}</td>
                      <td className={am.td}><StatusBadge status={String(m.status)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'Job Requisition' && data && (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead>
                <tr>
                  <th className={am.th}>Req #</th>
                  <th className={am.th}>Position</th>
                  <th className={am.th}>Department</th>
                  <th className={am.th}>Vacancies</th>
                  <th className={am.th}>Salary Range</th>
                  <th className={am.th}>Reason</th>
                  <th className={am.th}>Workflow</th>
                  <th className={am.th}>Status</th>
                  <th className={am.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.requisitions.length === 0 ? (
                  <tr><td colSpan={9} className={`${am.td} text-center text-slate-400 py-8`}>No requisitions — click Raise Requisition</td></tr>
                ) : data.requisitions.map((r) => (
                  <tr key={String(r.id)}>
                    <td className={am.td}><span className="font-mono font-bold">{String(r.requisitionNumber)}</span></td>
                    <td className={am.td}>{String(r.positionTitle)}</td>
                    <td className={am.td}>{String(r.department)}</td>
                    <td className={am.td}>{Number(r.vacancies)}</td>
                    <td className={am.td}>₹{Number(r.salaryMin).toLocaleString('en-IN')} – ₹{Number(r.salaryMax).toLocaleString('en-IN')}</td>
                    <td className={am.td}>{String(r.reasonForHiring).replace(/_/g, ' ')}</td>
                    <td className={am.td}>{String(r.workflowStage).replace(/_/g, ' ')}</td>
                    <td className={am.td}><StatusBadge status={String(r.status)} /></td>
                    <td className={am.td}>
                      {r.status !== 'APPROVED' && r.status !== 'CANCELLED' && (
                        <div className="flex gap-1">
                          <button type="button" title="Approve" onClick={async () => { setBusy(true); try { setData(await advanceRequisitionWorkflow(String(r.id), 'approve')); } finally { setBusy(false); } }} className="text-xs text-green-700 font-bold">✓</button>
                          <button type="button" title="Reject" onClick={async () => { setBusy(true); try { setData(await advanceRequisitionWorkflow(String(r.id), 'reject')); } finally { setBusy(false); } }} className="text-xs text-red-600 font-bold">✗</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'Vacancy & Posting' && data && (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead>
                <tr>
                  <th className={am.th}>Job Title</th>
                  <th className={am.th}>Department</th>
                  <th className={am.th}>Location</th>
                  <th className={am.th}>Applications</th>
                  <th className={am.th}>Channels</th>
                  <th className={am.th}>Status</th>
                  <th className={am.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.postings.length === 0 ? (
                  <tr><td colSpan={7} className={`${am.td} text-center text-slate-400 py-8`}>Approve a requisition, then create a job posting</td></tr>
                ) : data.postings.map((p) => (
                  <tr key={String(p.id)}>
                    <td className={am.td}>{String(p.jobTitle)}</td>
                    <td className={am.td}>{String(p.department)}</td>
                    <td className={am.td}>{String(p.location)}</td>
                    <td className={am.td}>{Number(p.applicationCount)}</td>
                    <td className={am.td}>{(p.publishChannels as string[]).join(', ') || '—'}</td>
                    <td className={am.td}><StatusBadge status={String(p.status)} /></td>
                    <td className={am.td}>
                      {p.status === 'DRAFT' && (
                        <button type="button" onClick={async () => { setBusy(true); try { setData(await publishJobPosting(String(p.id), ['Career Website', 'Internal Portal'])); setMessage('Job published'); } finally { setBusy(false); } }} className="text-xs font-bold text-amber-700">Publish</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.requisitions.some((r) => r.status === 'APPROVED') && !data.postings.length && (
              <div className="p-4 text-center">
                <button type="button" onClick={async () => {
                  const approved = data.requisitions.find((r) => r.status === 'APPROVED');
                  if (!approved) return;
                  setBusy(true);
                  try { setData(await createJobPosting(String(approved.id))); setMessage('Job posting created'); } finally { setBusy(false); }
                }} className={am.btnPrimary}>
                  <Briefcase size={14} /> Create Posting from Approved Requisition
                </button>
              </div>
            )}
          </div>
        )}

        {tab === 'Candidates' && data && (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead>
                <tr>
                  <th className={am.th}>Code</th>
                  <th className={am.th}>Name</th>
                  <th className={am.th}>Qualification</th>
                  <th className={am.th}>Experience</th>
                  <th className={am.th}>Expected CTC</th>
                  <th className={am.th}>Notice</th>
                  <th className={am.th}>Source</th>
                </tr>
              </thead>
              <tbody>
                {data.candidates.map((c) => (
                  <tr key={String(c.id)}>
                    <td className={am.td}><span className="font-mono text-xs">{String(c.candidateCode)}</span></td>
                    <td className={am.td}><span className="font-semibold">{String(c.fullName)}</span></td>
                    <td className={am.td}>{String(c.qualification)}</td>
                    <td className={am.td}>{Number(c.experienceYears)} yrs</td>
                    <td className={am.td}>₹{Number(c.expectedSalary).toLocaleString('en-IN')}</td>
                    <td className={am.td}>{String(c.noticePeriod)}</td>
                    <td className={am.td}>{String(c.source)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'Screening & Shortlist' && data && (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead>
                <tr>
                  <th className={am.th}>App #</th>
                  <th className={am.th}>Candidate</th>
                  <th className={am.th}>Job</th>
                  <th className={am.th}>Resume Match</th>
                  <th className={am.th}>Skill Match</th>
                  <th className={am.th}>Exp Match</th>
                  <th className={am.th}>Stage</th>
                  <th className={am.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.applications.map((a) => (
                  <tr key={String(a.id)}>
                    <td className={am.td}>{String(a.applicationNumber)}</td>
                    <td className={am.td}>{String(a.candidateName)}</td>
                    <td className={am.td}>{String(a.jobTitle)}</td>
                    <td className={am.td}><span className="font-bold text-green-700">{Number(a.resumeMatchPct).toFixed(0)}%</span></td>
                    <td className={am.td}><span className="font-bold text-blue-700">{Number(a.skillMatchPct).toFixed(0)}%</span></td>
                    <td className={am.td}><span className="font-bold text-purple-700">{Number(a.experienceMatchPct).toFixed(0)}%</span></td>
                    <td className={am.td}><StatusBadge status={String(a.pipelineStage).replace(/_/g, ' ')} /></td>
                    <td className={am.td}>
                      <div className="flex gap-1">
                        <button type="button" title="Shortlist & Advance" onClick={async () => { setBusy(true); try { setData(await advanceRecruitmentApplication(String(a.id), 'shortlist')); } finally { setBusy(false); } }} className="text-xs text-green-700 font-bold">→</button>
                        <button type="button" title="Reject" onClick={async () => { setBusy(true); try { setData(await advanceRecruitmentApplication(String(a.id), 'reject')); } finally { setBusy(false); } }} className="text-xs text-red-600">✗</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'Interviews' && data && (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead>
                <tr>
                  <th className={am.th}>Candidate</th>
                  <th className={am.th}>Type</th>
                  <th className={am.th}>Interviewer</th>
                  <th className={am.th}>Rating</th>
                  <th className={am.th}>Recommendation</th>
                  <th className={am.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.interviews.length === 0 ? (
                  <tr><td colSpan={6} className={`${am.td} text-center text-slate-400 py-8`}>Interviews appear after shortlisting candidates</td></tr>
                ) : data.interviews.map((i) => (
                  <tr key={String(i.id)}>
                    <td className={am.td}>{String(i.candidateName)}</td>
                    <td className={am.td}>{String(i.interviewType)}</td>
                    <td className={am.td}>{String(i.interviewerName)}</td>
                    <td className={am.td}><span className="font-bold">{Number(i.rating).toFixed(1)}/5</span></td>
                    <td className={am.td}><StatusBadge status={String(i.recommendation)} /></td>
                    <td className={am.td}><StatusBadge status={String(i.status)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'Offers' && data && (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead>
                <tr>
                  <th className={am.th}>Candidate</th>
                  <th className={am.th}>Proposed CTC</th>
                  <th className={am.th}>Grade</th>
                  <th className={am.th}>Pay Band</th>
                  <th className={am.th}>Workflow</th>
                  <th className={am.th}>Status</th>
                  <th className={am.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.offers.map((o) => (
                  <tr key={String(o.id)}>
                    <td className={am.td}>{String(o.candidateName)}</td>
                    <td className={am.td}>₹{Number(o.proposedCtc).toLocaleString('en-IN')}</td>
                    <td className={am.td}>{String(o.grade)}</td>
                    <td className={am.td}>{String(o.payBand)}</td>
                    <td className={am.td}>{String(o.workflowStage)}</td>
                    <td className={am.td}><StatusBadge status={String(o.status)} /></td>
                    <td className={am.td}>
                      <div className="flex gap-1">
                        {o.status === 'DRAFT' && (
                          <button type="button" onClick={async () => { setBusy(true); try { setData(await advanceRecruitmentOffer(String(o.id))); } finally { setBusy(false); } }} className="text-xs font-bold text-amber-700">Approve →</button>
                        )}
                        {o.status === 'SENT' && (
                          <button type="button" onClick={async () => { setBusy(true); try { setData(await acceptRecruitmentOffer(String(o.id))); setMessage('Offer accepted'); } finally { setBusy(false); } }} className="text-xs font-bold text-green-700">Accept</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'Background & Reference' && data && (
          <div className="grid md:grid-cols-2 gap-4">
            <div className={`${am.card} p-4`}>
              <h3 className="font-bold text-slate-800 mb-3">Background Verification</h3>
              <div className={am.tableWrap}>
                <table className="w-full text-sm">
                  <thead><tr><th className={am.th}>Check</th><th className={am.th}>Status</th></tr></thead>
                  <tbody>
                    {data.backgroundVerifications.length === 0 ? (
                      <tr><td colSpan={2} className={`${am.td} text-slate-400`}>BGV starts at background verification stage</td></tr>
                    ) : data.backgroundVerifications.map((b) => (
                      <tr key={String(b.id)}><td className={am.td}>{String(b.checkType)}</td><td className={am.td}><StatusBadge status={String(b.status)} /></td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className={`${am.card} p-4`}>
              <h3 className="font-bold text-slate-800 mb-3">Reference Checks</h3>
              {data.referenceChecks.length === 0 ? (
                <p className="text-slate-400 text-sm">Reference checks recorded during hiring process</p>
              ) : data.referenceChecks.map((r) => (
                <div key={String(r.id)} className="border-b border-slate-100 py-2 text-sm">
                  <p className="font-semibold">{String(r.refereeName)} — {String(r.organization)}</p>
                  <p className="text-slate-500">{String(r.feedback)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'Onboarding' && data && (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead>
                <tr>
                  <th className={am.th}>Candidate</th>
                  <th className={am.th}>Employee Code</th>
                  <th className={am.th}>Joining Date</th>
                  <th className={am.th}>Mentor</th>
                  <th className={am.th}>Checklist</th>
                  <th className={am.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.onboardings.map((o) => (
                  <tr key={String(o.id)}>
                    <td className={am.td}>{String(o.candidateName)}</td>
                    <td className={am.td}>{String(o.employeeCode) || '—'}</td>
                    <td className={am.td}>{String(o.joiningDate)}</td>
                    <td className={am.td}>{String(o.mentorName)}</td>
                    <td className={am.td}>{(o.checklist as unknown[]).length} items</td>
                    <td className={am.td}>
                      {!o.employeeCode && (
                        <button type="button" onClick={async () => { setBusy(true); try { setData((await createEmployeeFromOnboarding(String(o.id))).data); setMessage('Employee created in HRMS'); } finally { setBusy(false); } }} className="text-xs font-bold text-amber-700">
                          <UserCheck size={12} className="inline" /> Create Employee
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'Probation' && data && (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead>
                <tr>
                  <th className={am.th}>Candidate</th>
                  <th className={am.th}>Employee Code</th>
                  <th className={am.th}>Probation Start</th>
                  <th className={am.th}>Probation End</th>
                  <th className={am.th}>Status</th>
                  <th className={am.th}>Confirmation</th>
                  <th className={am.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.onboardings.filter((o) => o.employeeCode).map((o) => (
                  <tr key={String(o.id)}>
                    <td className={am.td}>{String(o.candidateName)}</td>
                    <td className={am.td}><span className="font-mono">{String(o.employeeCode)}</span></td>
                    <td className={am.td}>{String(o.probationStart)}</td>
                    <td className={am.td}>{String(o.probationEnd)}</td>
                    <td className={am.td}><StatusBadge status={String(o.probationStatus)} /></td>
                    <td className={am.td}><StatusBadge status={String(o.confirmationStatus)} /></td>
                    <td className={am.td}>
                      {o.confirmationStatus === 'PENDING' && (
                        <button type="button" onClick={async () => { setBusy(true); try { setData(await confirmRecruitmentProbation(String(o.id))); setMessage('Employee confirmed'); } finally { setBusy(false); } }} className="text-xs font-bold text-green-700">
                          <CheckCircle2 size={12} className="inline" /> Confirm
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'Settings' && data && (
          <div className={`${am.card} p-4 space-y-4`}>
            <h3 className="font-bold text-slate-800">Publish Channels</h3>
            <div className="flex flex-wrap gap-2">
              {(data.settings.publishChannels as string[]).map((ch) => (
                <span key={ch} className="px-3 py-1 bg-slate-100 rounded-full text-sm font-medium">{ch}</span>
              ))}
            </div>
            <h3 className="font-bold text-slate-800">Automation Rules</h3>
            <div className="grid md:grid-cols-3 gap-2 text-sm">
              {Object.entries(data.settings.automationRules as Record<string, boolean>).map(([k, v]) => (
                <div key={k} className="flex items-center gap-2">
                  <CheckCircle2 size={14} className={v ? 'text-green-600' : 'text-slate-300'} />
                  <span>{k.replace(/([A-Z])/g, ' $1')}</span>
                </div>
              ))}
            </div>
            <h3 className="font-bold text-slate-800">Integrations</h3>
            <p className="text-sm text-slate-600">HRMS · Payroll · Attendance · Leave · Documents · Finance · Career Portal · Email/SMS/WhatsApp · Calendar · Analytics</p>
          </div>
        )}
      </div>

      <AcademicModal open={reqModal} onClose={() => setReqModal(false)} title="Raise Job Requisition" large>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="block space-y-1">
            <span className="text-xs font-semibold text-slate-600">Department</span>
            <select value={reqForm.department} onChange={(e) => setReqForm((f) => ({ ...f, department: e.target.value }))} className={am.input}>
              {(data?.departments ?? []).map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="block space-y-1">
            <span className="text-xs font-semibold text-slate-600">Position Title</span>
            <input value={reqForm.positionTitle} onChange={(e) => setReqForm((f) => ({ ...f, positionTitle: e.target.value }))} className={am.input} />
          </div>
          <div className="block space-y-1">
            <span className="text-xs font-semibold text-slate-600">Designation</span>
            <input value={reqForm.designation} onChange={(e) => setReqForm((f) => ({ ...f, designation: e.target.value }))} className={am.input} />
          </div>
          <div className="block space-y-1">
            <span className="text-xs font-semibold text-slate-600">Vacancies</span>
            <input type="number" value={reqForm.vacancies} onChange={(e) => setReqForm((f) => ({ ...f, vacancies: e.target.value }))} className={am.input} />
          </div>
          <div className="block space-y-1">
            <span className="text-xs font-semibold text-slate-600">Salary Min</span>
            <input type="number" value={reqForm.salaryMin} onChange={(e) => setReqForm((f) => ({ ...f, salaryMin: e.target.value }))} className={am.input} />
          </div>
          <div className="block space-y-1">
            <span className="text-xs font-semibold text-slate-600">Salary Max</span>
            <input type="number" value={reqForm.salaryMax} onChange={(e) => setReqForm((f) => ({ ...f, salaryMax: e.target.value }))} className={am.input} />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button type="button" onClick={() => setReqModal(false)} className={am.btnSecondary}>Cancel</button>
          <button type="button" onClick={() => void handleCreateReq()} disabled={busy} className={am.btnPrimary}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Submit Requisition
          </button>
        </div>
      </AcademicModal>

      <AcademicModal open={planModal} onClose={() => setPlanModal(false)} title="Add Manpower Plan" large>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="block space-y-1">
            <span className="text-xs font-semibold text-slate-600">Department</span>
            <select value={planForm.department} onChange={(e) => setPlanForm((f) => ({ ...f, department: e.target.value }))} className={am.input}>
              {(data?.departments ?? []).map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="block space-y-1">
            <span className="text-xs font-semibold text-slate-600">Designation</span>
            <input value={planForm.designation} onChange={(e) => setPlanForm((f) => ({ ...f, designation: e.target.value }))} className={am.input} />
          </div>
          <div className="block space-y-1">
            <span className="text-xs font-semibold text-slate-600">New Positions</span>
            <input type="number" value={planForm.newPositions} onChange={(e) => setPlanForm((f) => ({ ...f, newPositions: e.target.value }))} className={am.input} />
          </div>
          <div className="block space-y-1">
            <span className="text-xs font-semibold text-slate-600">Budgeted Salary</span>
            <input type="number" value={planForm.budgetedSalary} onChange={(e) => setPlanForm((f) => ({ ...f, budgetedSalary: e.target.value }))} className={am.input} />
          </div>
          <div className="col-span-2 block space-y-1">
            <span className="text-xs font-semibold text-slate-600">Justification</span>
            <textarea value={planForm.justification} onChange={(e) => setPlanForm((f) => ({ ...f, justification: e.target.value }))} className={am.input} rows={2} />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button type="button" onClick={() => setPlanModal(false)} className={am.btnSecondary}>Cancel</button>
          <button type="button" onClick={() => void handleCreatePlan()} disabled={busy} className={am.btnPrimary}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : <ClipboardList size={14} />} Save Plan
          </button>
        </div>
      </AcademicModal>
    </AcademicPageShell>
  );
}
