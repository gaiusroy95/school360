import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Loader2, Mail, Pencil, Plus, Send, Upload, UserCheck, Download,
} from 'lucide-react';
import {
  assignRecruitmentInterview,
  bulkUploadRecruitmentCandidates,
  completeRecruitmentProbation,
  createEmployeeFromOnboarding,
  createJobRequisition,
  createManpowerPlan,
  createRecruitmentReference,
  extendRecruitmentProbation,
  fetchRecruitment,
  generateRecruitmentSelectionLetter,
  passRecruitmentInterview,
  publishJobPosting,
  reviewRecruitmentApplication,
  selectRecruitmentForInterview,
  sendRecruitmentOfferEmail,
  submitRecruitmentReferenceFeedback,
  approveRecruitmentReferenceHire,
  updateRecruitmentCandidate,
  updateRecruitmentInterview,
  updateRecruitmentOffer,
  updateRecruitmentProbation,
  advanceRequisitionWorkflow,
  createJobPosting,
  type RecruitmentDashboard,
} from '../../../lib/hrServices';
import { downloadCandidateTemplate, parseCandidateUploadFile } from '../../../lib/recruitmentExcel';
import {
  am, AcademicLoading, AcademicModal, AcademicPageHeader, AcademicPageShell, FeeTabs, StatusBadge,
} from '../FeeFinanceManagement/FeeFinanceUi';

const TABS = [
  'Dashboard', 'Manpower Planning', 'Job Requisition', 'Vacancy & Posting', 'Candidates',
  'Screening & Shortlist', 'Interviews', 'Offers', 'Background & Reference', 'Onboarding', 'Probation', 'Settings',
] as const;
type TabId = (typeof TABS)[number];

type AppRow = RecruitmentDashboard['applications'][number] & {
  candidateEmail?: string; candidateMobile?: string;
};
type OfferRow = RecruitmentDashboard['offers'][number] & {
  candidateEmail?: string; salaryComponents?: Record<string, number>;
  emailSubject?: string; emailBody?: string; ccEmails?: string[];
};
type EmployeeRow = RecruitmentDashboard['employees'][number];

function Kpi({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className={`${am.card} p-3`}>
      <p className="text-[10px] font-bold text-slate-400 uppercase">{label}</p>
      <p className="text-xl font-black text-slate-900 mt-1">{value}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
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
  const [uploadPostingId, setUploadPostingId] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const [editCandidateId, setEditCandidateId] = useState<string | null>(null);
  const [candidateForm, setCandidateForm] = useState<Record<string, string | number>>({});
  const [assignModal, setAssignModal] = useState<{ applicationId: string; candidateName: string } | null>(null);
  const [assignForm, setAssignForm] = useState({
    interviewType: 'HR Interview', interviewRoundName: 'Round 1',
    interviewerDepartment: '', interviewerDesignation: '', interviewerName: '',
  });
  const [recordInterviewId, setRecordInterviewId] = useState<string | null>(null);
  const [interviewForm, setInterviewForm] = useState({ rating: 4, comments: '', recommendation: 'HIRE' });
  const [offerEdit, setOfferEdit] = useState<OfferRow | null>(null);
  const [offerForm, setOfferForm] = useState({
    proposedCtc: 0, probationSalary: 0, basic: 0, hra: 0, specialAllowance: 0,
    emailSubject: '', emailBody: '', ccEmails: '',
  });
  const [refModal, setRefModal] = useState(false);
  const [refForm, setRefForm] = useState({
    applicationId: '', refereeName: '', organization: '', designation: '', contactNumber: '', relationship: '',
  });
  const [probationEditId, setProbationEditId] = useState<string | null>(null);
  const [probationForm, setProbationForm] = useState({ probationEnd: '', feedback: '', action: 'edit' as 'edit' | 'extend' | 'complete' });
  const [reqForm, setReqForm] = useState({
    department: 'Teaching', positionTitle: '', designation: '', vacancies: '1',
    employmentType: 'FULL_TIME', salaryMin: '', salaryMax: '', reasonForHiring: 'NEW_POSITION',
  });
  const [planForm, setPlanForm] = useState({
    department: 'Teaching', designation: '', existingHeadcount: '0', approvedHeadcount: '0',
    vacantPositions: '0', newPositions: '1', budgetedSalary: '', priority: 'MEDIUM', justification: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await fetchRecruitment({ academicYear });
      setData(d);
      setAcademicYear(d.academicYear);
      setUploadPostingId((prev) => prev || (d.postings[0] ? String(d.postings[0].id) : ''));
    } finally { setLoading(false); }
  }, [academicYear]);

  useEffect(() => { void load(); }, [load]);

  const applications = useMemo(() => (data?.applications ?? []) as AppRow[], [data]);
  const pendingCandidates = useMemo(
    () => applications.filter((a) => a.reviewStatus === 'PENDING' || a.pipelineStage === 'RESUME_SCREENING'),
    [applications],
  );
  const approvedForScreening = useMemo(
    () => applications.filter((a) => a.reviewStatus === 'APPROVED' && a.shortlistStatus !== 'SELECTED_FOR_INTERVIEW' && a.shortlistStatus !== 'INTERVIEW_PASSED'),
    [applications],
  );
  const selectedForInterview = useMemo(
    () => applications.filter((a) => a.shortlistStatus === 'SELECTED_FOR_INTERVIEW'),
    [applications],
  );
  const interviewRows = useMemo(() => data?.interviews ?? [], [data]);
  const scheduledInterviews = useMemo(() => interviewRows.filter((i) => i.status === 'SCHEDULED'), [interviewRows]);
  const employees = useMemo(() => (data?.employees ?? []) as EmployeeRow[], [data]);

  const filteredInterviewers = useMemo(() => {
    return employees.filter((e) => {
      if (assignForm.interviewerDepartment && e.department !== assignForm.interviewerDepartment) return false;
      if (assignForm.interviewerDesignation && e.designation !== assignForm.interviewerDesignation) return false;
      return true;
    });
  }, [employees, assignForm.interviewerDepartment, assignForm.interviewerDesignation]);

  const deptOptions = useMemo(() => [...new Set(employees.map((e) => e.department))].sort(), [employees]);
  const desigOptions = useMemo(() => {
    const pool = assignForm.interviewerDepartment
      ? employees.filter((e) => e.department === assignForm.interviewerDepartment)
      : employees;
    return [...new Set(pool.map((e) => e.designation))].sort();
  }, [employees, assignForm.interviewerDepartment]);

  const handleApproveReq = async (id: string) => {
    setBusy(true);
    try {
      setData(await advanceRequisitionWorkflow(id, 'approve'));
      setMessage('Requisition approved — moved to next workflow stage');
    } finally { setBusy(false); }
  };

  const handleRejectReq = async (id: string) => {
    setBusy(true);
    try {
      setData(await advanceRequisitionWorkflow(id, 'reject'));
      setMessage('Requisition rejected');
    } finally { setBusy(false); }
  };

  const handleUpload = async (file: File) => {
    if (!uploadPostingId) { setMessage('Select a job posting first'); return; }
    setBusy(true);
    try {
      const rows = await parseCandidateUploadFile(file);
      const r = await bulkUploadRecruitmentCandidates(uploadPostingId, rows);
      setData(r.data);
      setMessage(`Uploaded ${r.created} new + ${r.updated} updated candidates`);
    } finally { setBusy(false); }
  };

  const openEditCandidate = (app: AppRow) => {
    const c = data?.candidates.find((x) => x.id === app.candidateId);
    if (!c) return;
    setEditCandidateId(String(c.id));
    setCandidateForm({
      fullName: String(c.fullName), email: String(c.email), mobile: String(c.mobile),
      qualification: String(c.qualification), experienceYears: Number(c.experienceYears),
      expectedSalary: Number(c.expectedSalary), noticePeriod: String(c.noticePeriod),
    });
  };

  const saveCandidate = async () => {
    if (!editCandidateId) return;
    setBusy(true);
    try {
      const r = await updateRecruitmentCandidate(editCandidateId, candidateForm);
      setData(r.data);
      setEditCandidateId(null);
      setMessage('Candidate updated');
    } finally { setBusy(false); }
  };

  const openOfferEdit = (o: OfferRow) => {
    const sc = (o.salaryComponents ?? {}) as Record<string, number>;
    setOfferEdit(o);
    setOfferForm({
      proposedCtc: Number(o.proposedCtc), probationSalary: Number(o.probationSalary),
      basic: sc.basic ?? 0, hra: sc.hra ?? 0, specialAllowance: sc.specialAllowance ?? 0,
      emailSubject: String(o.emailSubject ?? `Offer Letter — ${o.candidateName}`),
      emailBody: String(o.emailBody ?? ''),
      ccEmails: (o.ccEmails ?? []).join(', '),
    });
  };

  const saveOffer = async () => {
    if (!offerEdit) return;
    setBusy(true);
    try {
      const r = await updateRecruitmentOffer(String(offerEdit.id), {
        proposedCtc: offerForm.proposedCtc,
        probationSalary: offerForm.probationSalary,
        salaryComponents: { basic: offerForm.basic, hra: offerForm.hra, specialAllowance: offerForm.specialAllowance, grossMonthly: offerForm.basic + offerForm.hra + offerForm.specialAllowance },
        emailSubject: offerForm.emailSubject,
        emailBody: offerForm.emailBody,
        ccEmails: offerForm.ccEmails.split(',').map((s) => s.trim()).filter(Boolean),
      });
      setData(r.data);
      setOfferEdit(null);
      setMessage('Offer updated');
    } finally { setBusy(false); }
  };

  const sendOffer = async () => {
    if (!offerEdit) return;
    setBusy(true);
    try {
      await updateRecruitmentOffer(String(offerEdit.id), {
        proposedCtc: offerForm.proposedCtc,
        salaryComponents: { basic: offerForm.basic, hra: offerForm.hra, specialAllowance: offerForm.specialAllowance },
        emailSubject: offerForm.emailSubject,
        emailBody: offerForm.emailBody,
        ccEmails: offerForm.ccEmails.split(',').map((s) => s.trim()).filter(Boolean),
      });
      const r = await sendRecruitmentOfferEmail(String(offerEdit.id), {
        emailSubject: offerForm.emailSubject,
        emailBody: offerForm.emailBody,
        ccEmails: offerForm.ccEmails.split(',').map((s) => s.trim()).filter(Boolean),
      });
      setData(r.data);
      setOfferEdit(null);
      setMessage('Offer email sent to candidate with CC to department heads & HR');
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
          <button type="button" onClick={() => setReqModal(true)} className={am.btnPrimary}>
            <Plus size={14} /> Raise Requisition
          </button>
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
                    <th className={am.th}>Department</th><th className={am.th}>Designation</th>
                    <th className={am.th}>Vacant</th><th className={am.th}>New</th>
                    <th className={am.th}>Budget</th><th className={am.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.manpowerPlans.map((m) => (
                    <tr key={String(m.id)}>
                      <td className={am.td}>{String(m.department)}</td>
                      <td className={am.td}>{String(m.designation)}</td>
                      <td className={am.td}>{Number(m.vacantPositions)}</td>
                      <td className={am.td}>{Number(m.newPositions)}</td>
                      <td className={am.td}>₹{Number(m.budgetedSalary).toLocaleString('en-IN')}</td>
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
                  <th className={am.th}>Req #</th><th className={am.th}>Position</th><th className={am.th}>Department</th>
                  <th className={am.th}>Vacancies</th><th className={am.th}>Workflow</th><th className={am.th}>Status</th>
                  <th className={am.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.requisitions.map((r) => (
                  <tr key={String(r.id)}>
                    <td className={am.td}><span className="font-mono font-bold">{String(r.requisitionNumber)}</span></td>
                    <td className={am.td}>{String(r.positionTitle)}</td>
                    <td className={am.td}>{String(r.department)}</td>
                    <td className={am.td}>{Number(r.vacancies)}</td>
                    <td className={am.td}>{String(r.workflowStage).replace(/_/g, ' ')}</td>
                    <td className={am.td}><StatusBadge status={String(r.status)} /></td>
                    <td className={am.td}>
                      {!['APPROVED', 'CANCELLED', 'PUBLISHED', 'FILLED'].includes(String(r.status)) && (
                        <div className="flex gap-2">
                          <button type="button" disabled={busy} onClick={() => void handleApproveReq(String(r.id))} className={`${am.btnPrimary} !py-1 !px-2 text-xs`}>Approve</button>
                          <button type="button" disabled={busy} onClick={() => void handleRejectReq(String(r.id))} className={`${am.btnSecondary} !py-1 !px-2 text-xs !text-red-600`}>Reject</button>
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
          <div>
            {data.requisitions.some((r) => r.status === 'APPROVED') && data.postings.length === 0 && (
              <div className="mb-3 text-center">
                <button type="button" disabled={busy} onClick={async () => {
                  const approved = data.requisitions.find((r) => r.status === 'APPROVED');
                  if (!approved) return;
                  setBusy(true);
                  try {
                    setData(await createJobPosting(String(approved.id)));
                    setMessage('Job posting created');
                  } finally { setBusy(false); }
                }} className={am.btnPrimary}>Create Posting from Approved Requisition</button>
              </div>
            )}
            <div className={am.tableWrap}>
            <table className="w-full">
              <thead>
                <tr>
                  <th className={am.th}>Job Title</th><th className={am.th}>Department</th>
                  <th className={am.th}>Applications</th><th className={am.th}>Status</th><th className={am.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.postings.map((p) => (
                  <tr key={String(p.id)}>
                    <td className={am.td}>{String(p.jobTitle)}</td>
                    <td className={am.td}>{String(p.department)}</td>
                    <td className={am.td}>{Number(p.applicationCount)}</td>
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
            </div>
          </div>
        )}

        {tab === 'Candidates' && data && (
          <div>
            <div className="flex flex-wrap items-end gap-3 mb-4 p-4 bg-slate-50 rounded-lg border">
              <div className="block space-y-1 flex-1 min-w-[200px]">
                <span className="text-xs font-semibold text-slate-600">Job Posting</span>
                <select value={uploadPostingId} onChange={(e) => setUploadPostingId(e.target.value)} className={am.input}>
                  {data.postings.map((p) => <option key={String(p.id)} value={String(p.id)}>{String(p.jobTitle)} — {String(p.department)}</option>)}
                </select>
              </div>
              <button type="button" onClick={() => downloadCandidateTemplate()} className={am.btnSecondary}>
                <Download size={14} /> Template
              </button>
              <button type="button" onClick={() => fileRef.current?.click()} disabled={busy || !uploadPostingId} className={am.btnPrimary}>
                <Upload size={14} /> Upload Excel
              </button>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleUpload(f); e.target.value = ''; }} />
            </div>
            <div className={am.tableWrap}>
              <table className="w-full">
                <thead>
                  <tr>
                    <th className={am.th}>App #</th><th className={am.th}>Name</th><th className={am.th}>Email</th>
                    <th className={am.th}>Qualification</th><th className={am.th}>Exp</th><th className={am.th}>Expected CTC</th>
                    <th className={am.th}>Review</th><th className={am.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(pendingCandidates.length ? pendingCandidates : applications).map((a) => (
                    <tr key={String(a.id)}>
                      <td className={am.td}>{String(a.applicationNumber)}</td>
                      <td className={am.td}><span className="font-semibold">{String(a.candidateName)}</span></td>
                      <td className={am.td}>{String(a.candidateEmail || '—')}</td>
                      <td className={am.td}>{data.candidates.find((c) => c.id === a.candidateId)?.qualification as string || '—'}</td>
                      <td className={am.td}>{Number(data.candidates.find((c) => c.id === a.candidateId)?.experienceYears ?? 0)} yrs</td>
                      <td className={am.td}>₹{Number(data.candidates.find((c) => c.id === a.candidateId)?.expectedSalary ?? 0).toLocaleString('en-IN')}</td>
                      <td className={am.td}><StatusBadge status={String(a.reviewStatus || 'PENDING')} /></td>
                      <td className={am.td}>
                        <div className="flex gap-1">
                          <button type="button" onClick={() => openEditCandidate(a)} className="p-1 hover:bg-slate-100 rounded" title="Edit"><Pencil size={14} /></button>
                          {a.reviewStatus !== 'APPROVED' && a.reviewStatus !== 'REJECTED' && (
                            <>
                              <button type="button" disabled={busy} onClick={async () => { setBusy(true); try { setData(await reviewRecruitmentApplication(String(a.id), 'approve')); setMessage('Candidate approved for screening'); } finally { setBusy(false); } }} className="text-xs font-bold text-green-700 px-1">Approve</button>
                              <button type="button" disabled={busy} onClick={async () => { setBusy(true); try { setData(await reviewRecruitmentApplication(String(a.id), 'reject')); setMessage('Candidate rejected'); } finally { setBusy(false); } }} className="text-xs font-bold text-red-600 px-1">Reject</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'Screening & Shortlist' && data && (
          <div className={am.tableWrap}>
            <p className="text-sm text-slate-600 mb-3 p-3 bg-blue-50 rounded-lg">Approved candidates from upload — select for interview to move to Interviews tab.</p>
            <table className="w-full">
              <thead>
                <tr>
                  <th className={am.th}>Candidate</th><th className={am.th}>Job</th>
                  <th className={am.th}>Resume Match</th><th className={am.th}>Skill Match</th>
                  <th className={am.th}>Stage</th><th className={am.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {approvedForScreening.length === 0 ? (
                  <tr><td colSpan={6} className={`${am.td} text-center text-slate-400 py-8`}>No approved candidates — approve from Candidates tab first</td></tr>
                ) : approvedForScreening.map((a) => (
                  <tr key={String(a.id)}>
                    <td className={am.td}>{String(a.candidateName)}</td>
                    <td className={am.td}>{String(a.jobTitle)}</td>
                    <td className={am.td}><span className="font-bold text-green-700">{Number(a.resumeMatchPct).toFixed(0)}%</span></td>
                    <td className={am.td}><span className="font-bold text-blue-700">{Number(a.skillMatchPct).toFixed(0)}%</span></td>
                    <td className={am.td}><StatusBadge status={String(a.shortlistStatus || 'APPROVED')} /></td>
                    <td className={am.td}>
                      <button type="button" disabled={busy} onClick={async () => { setBusy(true); try { setData(await selectRecruitmentForInterview(String(a.id))); setMessage(`${a.candidateName} selected for interview`); setTab('Interviews'); } finally { setBusy(false); } }} className={am.btnPrimary}>
                        Selected for Interview
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'Interviews' && data && (
          <div className="space-y-6">
            {selectedForInterview.length > 0 && (
              <div>
                <h3 className="font-bold text-slate-800 mb-2">Awaiting Interviewer Assignment</h3>
                <div className={am.tableWrap}>
                  <table className="w-full">
                    <thead><tr><th className={am.th}>Candidate</th><th className={am.th}>Job</th><th className={am.th}>Actions</th></tr></thead>
                    <tbody>
                      {selectedForInterview.map((a) => (
                        <tr key={String(a.id)}>
                          <td className={am.td}>{String(a.candidateName)}</td>
                          <td className={am.td}>{String(a.jobTitle)}</td>
                          <td className={am.td}>
                            <button type="button" onClick={() => { setAssignModal({ applicationId: String(a.id), candidateName: String(a.candidateName) }); setAssignForm((f) => ({ ...f, interviewerName: '' })); }} className={am.btnSecondary}>
                              Assign Interviewer
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div>
              <h3 className="font-bold text-slate-800 mb-2">Interview Schedule & Feedback</h3>
              <div className={am.tableWrap}>
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className={am.th}>Candidate</th><th className={am.th}>Round</th><th className={am.th}>Interviewer</th>
                      <th className={am.th}>Dept / Designation</th><th className={am.th}>Rating</th><th className={am.th}>Status</th><th className={am.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {interviewRows.length === 0 ? (
                      <tr><td colSpan={7} className={`${am.td} text-center text-slate-400 py-8`}>No interviews scheduled yet</td></tr>
                    ) : interviewRows.map((i) => (
                      <tr key={String(i.id)}>
                        <td className={am.td}>{String(i.candidateName)}</td>
                        <td className={am.td}>{String(i.interviewRoundName || i.interviewType)}</td>
                        <td className={am.td}>{String(i.interviewerName)}</td>
                        <td className={am.td}>{String(i.interviewerDepartment)} / {String(i.interviewerDesignation)}</td>
                        <td className={am.td}>{Number(i.rating) > 0 ? `${Number(i.rating).toFixed(1)}/5` : '—'}</td>
                        <td className={am.td}><StatusBadge status={String(i.status)} /></td>
                        <td className={am.td}>
                          <div className="flex flex-wrap gap-1">
                            {i.status === 'SCHEDULED' && (
                              <button type="button" onClick={() => { setRecordInterviewId(String(i.id)); setInterviewForm({ rating: 4, comments: '', recommendation: 'HIRE' }); }} className="text-xs font-bold text-blue-700">Record Sheet</button>
                            )}
                            {i.status === 'COMPLETED' && (
                              <>
                                <button type="button" disabled={busy} onClick={async () => { setBusy(true); try { const r = await passRecruitmentInterview(String(i.applicationId)); setData(r.data); setMessage('Interview passed — draft offer created'); setTab('Offers'); } finally { setBusy(false); } }} className="text-xs font-bold text-green-700">Interview Passed</button>
                                <button type="button" disabled={busy} onClick={async () => { setBusy(true); try { const offer = data.offers.find((o) => o.applicationId === i.applicationId); if (offer) { const r = await generateRecruitmentSelectionLetter(String(offer.id)); setData(r.data); setMessage('Selection letter emailed to candidate'); setTab('Offers'); } } finally { setBusy(false); } }} className="text-xs font-bold text-amber-700">Generate Offer</button>
                              </>
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
        )}

        {tab === 'Offers' && data && (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead>
                <tr>
                  <th className={am.th}>Candidate</th><th className={am.th}>Proposed CTC</th><th className={am.th}>Grade</th>
                  <th className={am.th}>Status</th><th className={am.th}>Email Sent</th><th className={am.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.offers.map((o) => (
                  <tr key={String(o.id)}>
                    <td className={am.td}>{String(o.candidateName)}</td>
                    <td className={am.td}>₹{Number(o.proposedCtc).toLocaleString('en-IN')}</td>
                    <td className={am.td}>{String(o.grade)}</td>
                    <td className={am.td}><StatusBadge status={String(o.status)} /></td>
                    <td className={am.td}>{o.offerLetterSentAt ? '✓ Sent' : '—'}</td>
                    <td className={am.td}>
                      <button type="button" onClick={() => openOfferEdit(o as OfferRow)} className={`${am.btnSecondary} !py-1 !px-2 text-xs`}>
                        <Mail size={12} className="inline" /> Edit & Send
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'Background & Reference' && data && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button type="button" onClick={() => setRefModal(true)} className={am.btnPrimary}><Plus size={14} /> Add Reference</button>
            </div>
            <div className={am.tableWrap}>
              <table className="w-full">
                <thead>
                  <tr>
                    <th className={am.th}>Candidate</th><th className={am.th}>Referee</th><th className={am.th}>Organization</th>
                    <th className={am.th}>Feedback</th><th className={am.th}>Type</th><th className={am.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.referenceChecks.length === 0 ? (
                    <tr><td colSpan={6} className={`${am.td} text-center text-slate-400 py-8`}>Add reference checks for candidates</td></tr>
                  ) : data.referenceChecks.map((r) => (
                    <tr key={String(r.id)}>
                      <td className={am.td}>{String(r.candidateName)}</td>
                      <td className={am.td}>{String(r.refereeName)}</td>
                      <td className={am.td}>{String(r.organization)}</td>
                      <td className={am.td}>{String(r.feedback || '—')}</td>
                      <td className={am.td}><StatusBadge status={String(r.feedbackType || 'PENDING')} /></td>
                      <td className={am.td}>
                        <div className="flex gap-1">
                          {!r.feedbackType && (
                            <>
                              <button type="button" disabled={busy} onClick={async () => { setBusy(true); try { const res = await submitRecruitmentReferenceFeedback(String(r.id), 'POSITIVE'); setData(res.data); setMessage('Positive reference — candidate moved to onboarding queue'); } finally { setBusy(false); } }} className="text-xs font-bold text-green-700">Positive</button>
                              <button type="button" disabled={busy} onClick={async () => { setBusy(true); try { const res = await submitRecruitmentReferenceFeedback(String(r.id), 'NEGATIVE'); setData(res.data); setMessage('Negative reference — requires department head approval'); } finally { setBusy(false); } }} className="text-xs font-bold text-red-600">Negative</button>
                            </>
                          )}
                          {r.feedbackType === 'NEGATIVE' && r.approvalStatus === 'PENDING' && (
                            <button type="button" disabled={busy} onClick={async () => { setBusy(true); try { const res = await approveRecruitmentReferenceHire(String(r.id)); setData(res.data); setMessage('Department head approved hire — moved to onboarding'); } finally { setBusy(false); } }} className={am.btnPrimary}>Approve Hire</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'Onboarding' && data && (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead>
                <tr>
                  <th className={am.th}>Candidate</th><th className={am.th}>Employee Code</th>
                  <th className={am.th}>Joining Date</th><th className={am.th}>Mentor</th><th className={am.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.onboardings.length === 0 ? (
                  <tr><td colSpan={5} className={`${am.td} text-center text-slate-400 py-8`}>Onboarding queue fills after positive reference checks or offer acceptance</td></tr>
                ) : data.onboardings.map((o) => (
                  <tr key={String(o.id)}>
                    <td className={am.td}>{String(o.candidateName)}</td>
                    <td className={am.td}>{String(o.employeeCode) || '—'}</td>
                    <td className={am.td}>{String(o.joiningDate)}</td>
                    <td className={am.td}>{String(o.mentorName)}</td>
                    <td className={am.td}>
                      {!o.employeeCode && (
                        <button type="button" disabled={busy} onClick={async () => { setBusy(true); try { setData((await createEmployeeFromOnboarding(String(o.id))).data); setMessage('Employee created in HRMS'); } finally { setBusy(false); } }} className="text-xs font-bold text-amber-700">
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
                  <th className={am.th}>Candidate</th><th className={am.th}>Employee Code</th>
                  <th className={am.th}>Probation End</th><th className={am.th}>Extended Until</th>
                  <th className={am.th}>Status</th><th className={am.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.onboardings.filter((o) => o.employeeCode).map((o) => (
                  <tr key={String(o.id)}>
                    <td className={am.td}>{String(o.candidateName)}</td>
                    <td className={am.td}><span className="font-mono">{String(o.employeeCode)}</span></td>
                    <td className={am.td}>{String(o.probationEnd)}</td>
                    <td className={am.td}>{String(o.extendedProbationEnd || '—')}</td>
                    <td className={am.td}><StatusBadge status={String(o.probationStatus)} /></td>
                    <td className={am.td}>
                      <button type="button" onClick={() => { setProbationEditId(String(o.id)); setProbationForm({ probationEnd: String(o.probationEnd), feedback: '', action: 'edit' }); }} className="text-xs font-bold text-blue-700 mr-2">Edit / Extend / Complete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'Settings' && data && (
          <div className={`${am.card} p-4`}>
            <h3 className="font-bold text-slate-800 mb-2">Approval Matrix & Integrations</h3>
            <p className="text-sm text-slate-600">HRMS · Payroll · Email automation · Career Portal</p>
          </div>
        )}
      </div>

      {/* Modals */}
      <AcademicModal open={reqModal} onClose={() => setReqModal(false)} title="Raise Job Requisition" large>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <select value={reqForm.department} onChange={(e) => setReqForm((f) => ({ ...f, department: e.target.value }))} className={am.input}>
            {(data?.departments ?? []).map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <input placeholder="Position Title" value={reqForm.positionTitle} onChange={(e) => setReqForm((f) => ({ ...f, positionTitle: e.target.value }))} className={am.input} />
          <input placeholder="Designation" value={reqForm.designation} onChange={(e) => setReqForm((f) => ({ ...f, designation: e.target.value }))} className={am.input} />
          <input type="number" placeholder="Vacancies" value={reqForm.vacancies} onChange={(e) => setReqForm((f) => ({ ...f, vacancies: e.target.value }))} className={am.input} />
          <input type="number" placeholder="Salary Min" value={reqForm.salaryMin} onChange={(e) => setReqForm((f) => ({ ...f, salaryMin: e.target.value }))} className={am.input} />
          <input type="number" placeholder="Salary Max" value={reqForm.salaryMax} onChange={(e) => setReqForm((f) => ({ ...f, salaryMax: e.target.value }))} className={am.input} />
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button type="button" onClick={() => setReqModal(false)} className={am.btnSecondary}>Cancel</button>
          <button type="button" disabled={busy} onClick={async () => { setBusy(true); try { setData(await createJobRequisition({ ...reqForm, academicYear, vacancies: Number(reqForm.vacancies), salaryMin: Number(reqForm.salaryMin), salaryMax: Number(reqForm.salaryMax) })); setReqModal(false); setMessage('Job requisition raised'); } finally { setBusy(false); } }} className={am.btnPrimary}><Send size={14} /> Submit</button>
        </div>
      </AcademicModal>

      <AcademicModal open={planModal} onClose={() => setPlanModal(false)} title="Add Manpower Plan" large>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <select value={planForm.department} onChange={(e) => setPlanForm((f) => ({ ...f, department: e.target.value }))} className={am.input}>
            {(data?.departments ?? []).map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <input placeholder="Designation" value={planForm.designation} onChange={(e) => setPlanForm((f) => ({ ...f, designation: e.target.value }))} className={am.input} />
          <input type="number" placeholder="New Positions" value={planForm.newPositions} onChange={(e) => setPlanForm((f) => ({ ...f, newPositions: e.target.value }))} className={am.input} />
          <input type="number" placeholder="Budgeted Salary" value={planForm.budgetedSalary} onChange={(e) => setPlanForm((f) => ({ ...f, budgetedSalary: e.target.value }))} className={am.input} />
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button type="button" onClick={() => setPlanModal(false)} className={am.btnSecondary}>Cancel</button>
          <button type="button" disabled={busy} onClick={async () => { setBusy(true); try { setData(await createManpowerPlan({ ...planForm, academicYear, existingHeadcount: Number(planForm.existingHeadcount), approvedHeadcount: Number(planForm.approvedHeadcount), vacantPositions: Number(planForm.vacantPositions), newPositions: Number(planForm.newPositions), budgetedSalary: Number(planForm.budgetedSalary) })); setPlanModal(false); setMessage('Manpower plan created'); } finally { setBusy(false); } }} className={am.btnPrimary}>Save</button>
        </div>
      </AcademicModal>

      <AcademicModal open={!!editCandidateId} onClose={() => setEditCandidateId(null)} title="Edit Candidate">
        <div className="grid grid-cols-2 gap-3 text-sm">
          {(['fullName', 'email', 'mobile', 'qualification', 'noticePeriod'] as const).map((k) => (
            <input key={k} placeholder={k} value={String(candidateForm[k] ?? '')} onChange={(e) => setCandidateForm((f) => ({ ...f, [k]: e.target.value }))} className={am.input} />
          ))}
          <input type="number" placeholder="Experience Years" value={Number(candidateForm.experienceYears ?? 0)} onChange={(e) => setCandidateForm((f) => ({ ...f, experienceYears: Number(e.target.value) }))} className={am.input} />
          <input type="number" placeholder="Expected Salary" value={Number(candidateForm.expectedSalary ?? 0)} onChange={(e) => setCandidateForm((f) => ({ ...f, expectedSalary: Number(e.target.value) }))} className={am.input} />
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button type="button" onClick={() => setEditCandidateId(null)} className={am.btnSecondary}>Cancel</button>
          <button type="button" disabled={busy} onClick={() => void saveCandidate()} className={am.btnPrimary}>Save</button>
        </div>
      </AcademicModal>

      <AcademicModal open={!!assignModal} onClose={() => setAssignModal(null)} title={`Assign Interviewer — ${assignModal?.candidateName ?? ''}`} large>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <input placeholder="Interview Name / Round" value={assignForm.interviewRoundName} onChange={(e) => setAssignForm((f) => ({ ...f, interviewRoundName: e.target.value }))} className={am.input} />
          <select value={assignForm.interviewType} onChange={(e) => setAssignForm((f) => ({ ...f, interviewType: e.target.value }))} className={am.input}>
            {['HR Interview', 'Technical Interview', 'Demo Lecture', 'Panel Interview', 'Principal'].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={assignForm.interviewerDepartment} onChange={(e) => setAssignForm((f) => ({ ...f, interviewerDepartment: e.target.value, interviewerDesignation: '', interviewerName: '' }))} className={am.input}>
            <option value="">All Departments</option>
            {deptOptions.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={assignForm.interviewerDesignation} onChange={(e) => setAssignForm((f) => ({ ...f, interviewerDesignation: e.target.value, interviewerName: '' }))} className={am.input}>
            <option value="">All Designations</option>
            {desigOptions.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={assignForm.interviewerName} onChange={(e) => setAssignForm((f) => ({ ...f, interviewerName: e.target.value }))} className={`${am.input} col-span-2`}>
            <option value="">Select Interviewer</option>
            {filteredInterviewers.map((e) => <option key={e.id} value={e.fullName}>{e.fullName} — {e.designation}</option>)}
          </select>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button type="button" onClick={() => setAssignModal(null)} className={am.btnSecondary}>Cancel</button>
          <button type="button" disabled={busy || !assignForm.interviewerName} onClick={async () => {
            if (!assignModal) return;
            setBusy(true);
            try {
              const r = await assignRecruitmentInterview({ ...assignForm, applicationId: assignModal.applicationId });
              setData(r.data);
              setAssignModal(null);
              setMessage('Interviewer assigned');
            } finally { setBusy(false); }
          }} className={am.btnPrimary}>Assign</button>
        </div>
      </AcademicModal>

      <AcademicModal open={!!recordInterviewId} onClose={() => setRecordInterviewId(null)} title="Record Interview Sheet">
        <div className="space-y-3 text-sm">
          <input type="number" min={1} max={5} step={0.5} placeholder="Rating /5" value={interviewForm.rating} onChange={(e) => setInterviewForm((f) => ({ ...f, rating: Number(e.target.value) }))} className={am.input} />
          <textarea placeholder="Comments & observations" value={interviewForm.comments} onChange={(e) => setInterviewForm((f) => ({ ...f, comments: e.target.value }))} className={am.input} rows={3} />
          <select value={interviewForm.recommendation} onChange={(e) => setInterviewForm((f) => ({ ...f, recommendation: e.target.value }))} className={am.input}>
            <option value="HIRE">Recommend Hire</option><option value="HOLD">Hold</option><option value="REJECT">Reject</option>
          </select>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button type="button" onClick={() => setRecordInterviewId(null)} className={am.btnSecondary}>Cancel</button>
          <button type="button" disabled={busy} onClick={async () => {
            if (!recordInterviewId) return;
            setBusy(true);
            try {
              const r = await updateRecruitmentInterview(recordInterviewId, interviewForm);
              setData(r.data);
              setRecordInterviewId(null);
              setMessage('Interview sheet recorded');
            } finally { setBusy(false); }
          }} className={am.btnPrimary}>Save Interview Sheet</button>
        </div>
      </AcademicModal>

      <AcademicModal open={!!offerEdit} onClose={() => setOfferEdit(null)} title={`Offer — ${offerEdit?.candidateName ?? ''}`} large>
        <div className="grid grid-cols-2 gap-3 text-sm max-h-[60vh] overflow-y-auto">
          <input type="number" placeholder="Annual CTC" value={offerForm.proposedCtc} onChange={(e) => setOfferForm((f) => ({ ...f, proposedCtc: Number(e.target.value) }))} className={am.input} />
          <input type="number" placeholder="Probation Salary (monthly)" value={offerForm.probationSalary} onChange={(e) => setOfferForm((f) => ({ ...f, probationSalary: Number(e.target.value) }))} className={am.input} />
          <input type="number" placeholder="Basic (monthly)" value={offerForm.basic} onChange={(e) => setOfferForm((f) => ({ ...f, basic: Number(e.target.value) }))} className={am.input} />
          <input type="number" placeholder="HRA (monthly)" value={offerForm.hra} onChange={(e) => setOfferForm((f) => ({ ...f, hra: Number(e.target.value) }))} className={am.input} />
          <input type="number" placeholder="Special Allowance" value={offerForm.specialAllowance} onChange={(e) => setOfferForm((f) => ({ ...f, specialAllowance: Number(e.target.value) }))} className={am.input} />
          <input placeholder="Email Subject" value={offerForm.emailSubject} onChange={(e) => setOfferForm((f) => ({ ...f, emailSubject: e.target.value }))} className={`${am.input} col-span-2`} />
          <textarea placeholder="CC emails (comma-separated)" value={offerForm.ccEmails} onChange={(e) => setOfferForm((f) => ({ ...f, ccEmails: e.target.value }))} className={`${am.input} col-span-2`} rows={1} />
          <textarea placeholder="Email body / offer letter draft" value={offerForm.emailBody} onChange={(e) => setOfferForm((f) => ({ ...f, emailBody: e.target.value }))} className={`${am.input} col-span-2`} rows={8} />
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button type="button" onClick={() => setOfferEdit(null)} className={am.btnSecondary}>Cancel</button>
          <button type="button" disabled={busy} onClick={() => void saveOffer()} className={am.btnSecondary}>Save Draft</button>
          <button type="button" disabled={busy} onClick={() => void sendOffer()} className={am.btnPrimary}><Mail size={14} /> Send Offer Email</button>
        </div>
      </AcademicModal>

      <AcademicModal open={refModal} onClose={() => setRefModal(false)} title="Add Reference Check">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <select value={refForm.applicationId} onChange={(e) => setRefForm((f) => ({ ...f, applicationId: e.target.value }))} className={`${am.input} col-span-2`}>
            <option value="">Select Candidate Application</option>
            {applications.map((a) => <option key={String(a.id)} value={String(a.id)}>{a.candidateName} — {a.jobTitle}</option>)}
          </select>
          <input placeholder="Referee Name" value={refForm.refereeName} onChange={(e) => setRefForm((f) => ({ ...f, refereeName: e.target.value }))} className={am.input} />
          <input placeholder="Organization" value={refForm.organization} onChange={(e) => setRefForm((f) => ({ ...f, organization: e.target.value }))} className={am.input} />
          <input placeholder="Designation" value={refForm.designation} onChange={(e) => setRefForm((f) => ({ ...f, designation: e.target.value }))} className={am.input} />
          <input placeholder="Contact" value={refForm.contactNumber} onChange={(e) => setRefForm((f) => ({ ...f, contactNumber: e.target.value }))} className={am.input} />
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button type="button" onClick={() => setRefModal(false)} className={am.btnSecondary}>Cancel</button>
          <button type="button" disabled={busy || !refForm.applicationId} onClick={async () => { setBusy(true); try { const r = await createRecruitmentReference(refForm); setData(r.data); setRefModal(false); setMessage('Reference added'); } finally { setBusy(false); } }} className={am.btnPrimary}>Add</button>
        </div>
      </AcademicModal>

      <AcademicModal open={!!probationEditId} onClose={() => setProbationEditId(null)} title="Probation Management">
        <div className="space-y-3 text-sm">
          <select value={probationForm.action} onChange={(e) => setProbationForm((f) => ({ ...f, action: e.target.value as 'edit' | 'extend' | 'complete' }))} className={am.input}>
            <option value="edit">Edit Probation Period</option>
            <option value="extend">Extend with Feedback</option>
            <option value="complete">Complete with Feedback</option>
          </select>
          <input type="date" value={probationForm.probationEnd} onChange={(e) => setProbationForm((f) => ({ ...f, probationEnd: e.target.value }))} className={am.input} />
          <textarea placeholder="Feedback notes" value={probationForm.feedback} onChange={(e) => setProbationForm((f) => ({ ...f, feedback: e.target.value }))} className={am.input} rows={3} />
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button type="button" onClick={() => setProbationEditId(null)} className={am.btnSecondary}>Cancel</button>
          <button type="button" disabled={busy} onClick={async () => {
            if (!probationEditId) return;
            setBusy(true);
            try {
              let r;
              if (probationForm.action === 'extend') {
                r = await extendRecruitmentProbation(probationEditId, probationForm.probationEnd, probationForm.feedback);
              } else if (probationForm.action === 'complete') {
                r = await completeRecruitmentProbation(probationEditId, probationForm.feedback);
              } else {
                r = await updateRecruitmentProbation(probationEditId, { probationEnd: probationForm.probationEnd });
              }
              setData(r.data);
              setProbationEditId(null);
              setMessage('Probation updated');
            } finally { setBusy(false); }
          }} className={am.btnPrimary}>Save</button>
        </div>
      </AcademicModal>
    </AcademicPageShell>
  );
}
