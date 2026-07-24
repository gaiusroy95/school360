import { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2, ChevronRight, FileText, FolderOpen, RefreshCw,
  Shield, UserCheck, AlertTriangle,
} from 'lucide-react';
import {
  advanceEdomsWorkflow,
  completeEdomsChecklist,
  confirmEdomsProbation,
  createEdomsEmployee,
  fetchEdomsDashboard,
  verifyEdomsDocument,
  type EdomsDashboard,
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
  'Onboarding Cases',
  'Document Repository',
  'Verification',
  'Qualifications',
  'Employment History',
  'Joining Checklist',
  'Assets',
  'System Access',
  'Induction',
  'Probation',
  'Employment Letters',
  'Expiry Alerts',
  'Audit Trail',
  'Settings',
] as const;
type TabId = (typeof TABS)[number];

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className={`${am.card} p-3`}>
      <p className="text-[10px] font-bold text-slate-400 uppercase">{label}</p>
      <p className="text-xl font-black text-slate-900 mt-1">{value}</p>
    </div>
  );
}

function OnboardingWorkflow({ workflow }: { workflow: EdomsDashboard['workflow'] }) {
  return (
    <div className={`${am.card} p-6`}>
      <h3 className="font-bold text-slate-800 mb-4 text-center">End-to-End Onboarding Workflow</h3>
      <div className="flex flex-col items-center max-w-md mx-auto">
        {workflow.map((step, i) => (
          <div key={step.key} className="flex flex-col items-center w-full">
            <div className="w-full text-center px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700">
              {step.label}
            </div>
            {i < workflow.length - 1 && <span className="text-slate-400 py-0.5">|</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function VerificationWorkflow({ steps }: { steps: EdomsDashboard['verificationWorkflow'] }) {
  return (
    <div className={`${am.card} p-4`}>
      <h3 className="font-bold text-slate-800 mb-3">HR Verification Workflow</h3>
      <div className="flex flex-col items-center">
        {steps.map((s, i) => (
          <div key={s.label} className="flex flex-col items-center w-full">
            <p className="text-sm text-slate-700 text-center py-1">{s.label}</p>
            {i < steps.length - 1 && <span className="text-slate-400">|</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function ModuleStructure({ modules }: { modules: string[] }) {
  return (
    <div className={`${am.card} p-4`}>
      <h3 className="font-bold text-slate-800 mb-2">Module Structure</h3>
      <p className="text-xs text-amber-700 font-bold mb-2">HRMS</p>
      <div className="space-y-1 text-sm text-slate-600 pl-3 border-l-2 border-amber-200 max-h-72 overflow-y-auto">
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

export function DocumentsView() {
  const [data, setData] = useState<EdomsDashboard | null>(null);
  const [tab, setTab] = useState<TabId>('Dashboard');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async (seed = false) => {
    setLoading(true);
    try {
      setData(await fetchEdomsDashboard(seed));
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filteredDocs = (data?.documents ?? []).filter((d) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return String(d.candidateName).toLowerCase().includes(q) || String(d.documentType).toLowerCase().includes(q);
  });

  if (loading && !data) return <AcademicLoading />;

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="HR & Payroll Management › Documents & Onboarding"
        title="Employee Documents & Onboarding (EDOMS)"
        subtitle="Paperless joining from offer acceptance to confirmation — document verification, checklists, assets & ERP provisioning"
        actions={(
          <button type="button" onClick={() => void load(true)} disabled={busy} className={am.btnSecondary}>
            <RefreshCw size={14} /> Load Demo
          </button>
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
              <Kpi label="Active Onboarding" value={data.kpis.activeOnboarding} />
              <Kpi label="Confirmed" value={data.kpis.confirmedEmployees} />
              <Kpi label="Pending Verification" value={data.kpis.pendingVerification} />
              <Kpi label="Verified Documents" value={data.kpis.verifiedDocuments} />
              <Kpi label="Total Documents" value={data.kpis.totalDocuments} />
              <Kpi label="Expiring Soon" value={data.kpis.expiringSoon} />
              <Kpi label="Checklist %" value={`${data.kpis.checklistCompletion}%`} />
            </div>
            <div className="grid lg:grid-cols-3 gap-4">
              <OnboardingWorkflow workflow={data.workflow} />
              <ModuleStructure modules={data.moduleStructure} />
              <VerificationWorkflow steps={data.verificationWorkflow} />
            </div>
          </div>
        )}

        {tab === 'Workflow' && data && (
          <div className="grid lg:grid-cols-2 gap-4">
            <OnboardingWorkflow workflow={data.workflow} />
            <div className="space-y-4">
              <VerificationWorkflow steps={data.verificationWorkflow} />
              <div className={`${am.card} p-4`}>
                <h3 className="font-bold text-slate-800 mb-3">Workflow Automation</h3>
                {data.automationRules.map((rule) => (
                  <p key={rule} className="flex items-start gap-2 text-sm text-slate-600 mb-1">
                    <CheckCircle2 size={14} className="text-green-600 shrink-0 mt-0.5" />
                    {rule}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'Onboarding Cases' && data && (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead>
                <tr>
                  <th className={am.th}>Case #</th>
                  <th className={am.th}>Candidate</th>
                  <th className={am.th}>Department</th>
                  <th className={am.th}>Designation</th>
                  <th className={am.th}>Joining</th>
                  <th className={am.th}>Docs</th>
                  <th className={am.th}>Checklist</th>
                  <th className={am.th}>Stage</th>
                  <th className={am.th}>Status</th>
                  <th className={am.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.onboardings.map((o) => (
                  <tr key={String(o.id)}>
                    <td className={am.td}><span className="font-mono font-bold">{String(o.caseNumber)}</span></td>
                    <td className={am.td}>{String(o.candidateName)}</td>
                    <td className={am.td}>{String(o.department)}</td>
                    <td className={am.td}>{String(o.designation)}</td>
                    <td className={am.td}>{String(o.joiningDate) || '—'}</td>
                    <td className={am.td}>{Number(o.verifiedCount)}/{Number(o.documentsCount)}</td>
                    <td className={am.td}>{Number(o.checklistDone)}/{Number(o.checklistTotal)}</td>
                    <td className={am.td}><span className="text-xs">{String(o.workflowStage).replace(/_/g, ' ')}</span></td>
                    <td className={am.td}><StatusBadge status={String(o.status)} /></td>
                    <td className={am.td}>
                      <div className="flex gap-1 flex-wrap">
                        <button type="button" title="Advance" onClick={async () => { setBusy(true); try { setData(await advanceEdomsWorkflow(String(o.id))); setMessage('Workflow advanced'); } finally { setBusy(false); } }} className="text-xs text-amber-700 font-bold">→</button>
                        {!o.employeeCode && (
                          <button type="button" title="Create Employee" onClick={async () => { setBusy(true); try { setData(await createEdomsEmployee(String(o.id))); setMessage('Employee master created'); } finally { setBusy(false); } }} className="text-xs text-green-700 font-bold">
                            <UserCheck size={12} className="inline" />
                          </button>
                        )}
                        {o.status !== 'CONFIRMED' && o.employeeCode && (
                          <button type="button" title="Confirm" onClick={async () => { setBusy(true); try { setData(await confirmEdomsProbation(String(o.id))); setMessage('Employee confirmed'); } finally { setBusy(false); } }} className="text-xs text-blue-700 font-bold">✓</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'Document Repository' && data && (
          <>
            <input placeholder="Search by name or document type…" value={search} onChange={(e) => setSearch(e.target.value)} className={`${am.input} max-w-sm mb-3`} />
            <div className={am.tableWrap}>
              <table className="w-full">
                <thead>
                  <tr>
                    <th className={am.th}>Case</th>
                    <th className={am.th}>Candidate</th>
                    <th className={am.th}>Category</th>
                    <th className={am.th}>Document</th>
                    <th className={am.th}>File</th>
                    <th className={am.th}>Expiry</th>
                    <th className={am.th}>Version</th>
                    <th className={am.th}>Status</th>
                    <th className={am.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDocs.map((d) => (
                    <tr key={String(d.id)}>
                      <td className={am.td}>{String(d.caseNumber)}</td>
                      <td className={am.td}>{String(d.candidateName)}</td>
                      <td className={am.td}>{String(d.category)}</td>
                      <td className={am.td}>{String(d.documentType)}</td>
                      <td className={am.td}>{String(d.fileName) || '—'}</td>
                      <td className={am.td}>{String(d.expiryDate) || '—'}</td>
                      <td className={am.td}>v{Number(d.version)}</td>
                      <td className={am.td}><StatusBadge status={String(d.status)} /></td>
                      <td className={am.td}>
                        {d.status !== 'VERIFIED' && d.fileName && (
                          <div className="flex gap-1">
                            <button type="button" onClick={async () => { setBusy(true); try { setData(await verifyEdomsDocument(String(d.id), 'verify')); } finally { setBusy(false); } }} className="text-xs text-green-700 font-bold">✓</button>
                            <button type="button" onClick={async () => { setBusy(true); try { setData(await verifyEdomsDocument(String(d.id), 'correction')); } finally { setBusy(false); } }} className="text-xs text-orange-600">↩</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 mt-2">Categories: Personal, Educational, Employment, Tax, Payroll, Medical, Legal, Contracts, Certificates</p>
          </>
        )}

        {tab === 'Verification' && data && (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead><tr><th className={am.th}>Candidate</th><th className={am.th}>Check Type</th><th className={am.th}>Status</th></tr></thead>
              <tbody>
                {data.verifications.map((v) => (
                  <tr key={String(v.id)}>
                    <td className={am.td}>{String(v.candidateName)}</td>
                    <td className={am.td}>{String(v.checkType)}</td>
                    <td className={am.td}><StatusBadge status={String(v.status)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'Qualifications' && data && (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead>
                <tr>
                  <th className={am.th}>Candidate</th>
                  <th className={am.th}>Qualification</th>
                  <th className={am.th}>Board/University</th>
                  <th className={am.th}>Year</th>
                  <th className={am.th}>%</th>
                  <th className={am.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.qualifications.map((q) => (
                  <tr key={String(q.id)}>
                    <td className={am.td}>{String(q.candidateName)}</td>
                    <td className={am.td}>{String(q.qualification)}</td>
                    <td className={am.td}>{String(q.boardUniversity)}</td>
                    <td className={am.td}>{Number(q.yearOfPassing)}</td>
                    <td className={am.td}>{String(q.percentage)}</td>
                    <td className={am.td}><StatusBadge status={String(q.verificationStatus)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'Employment History' && data && (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead><tr><th className={am.th}>Candidate</th><th className={am.th}>Organization</th><th className={am.th}>Designation</th><th className={am.th}>Period</th></tr></thead>
              <tbody>
                {data.employmentHistory.map((e) => (
                  <tr key={String(e.id)}>
                    <td className={am.td}>{String(e.candidateName)}</td>
                    <td className={am.td}>{String(e.organization)}</td>
                    <td className={am.td}>{String(e.designation)}</td>
                    <td className={am.td}>{String(e.periodFrom)} – {String(e.periodTo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'Joining Checklist' && data && (
          <div className="space-y-4">
            {['HR', 'IT', 'Administration', 'Department'].map((dept) => (
              <div key={dept} className={`${am.card} p-4`}>
                <h3 className="font-bold text-slate-800 mb-2">{dept}</h3>
                <div className="space-y-1">
                  {data.checklists.filter((c) => c.department === dept).map((c) => (
                    <div key={String(c.id)} className="flex items-center justify-between text-sm py-1 border-b border-slate-50">
                      <span className={c.completed ? 'text-green-700 line-through' : 'text-slate-700'}>{String(c.item)}</span>
                      {!c.completed && (
                        <button type="button" onClick={async () => { setBusy(true); try { setData(await completeEdomsChecklist(String(c.id))); } finally { setBusy(false); } }} className="text-xs font-bold text-amber-700">Complete</button>
                      )}
                      {c.completed && <CheckCircle2 size={14} className="text-green-600" />}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'Assets' && data && (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead><tr><th className={am.th}>Candidate</th><th className={am.th}>Asset</th><th className={am.th}>Asset ID</th><th className={am.th}>Serial</th><th className={am.th}>Status</th></tr></thead>
              <tbody>
                {data.assets.map((a) => (
                  <tr key={String(a.id)}>
                    <td className={am.td}>{String(a.candidateName)}</td>
                    <td className={am.td}>{String(a.assetType)}</td>
                    <td className={am.td}>{String(a.assetId)}</td>
                    <td className={am.td}>{String(a.serialNumber) || '—'}</td>
                    <td className={am.td}><StatusBadge status={String(a.status)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'System Access' && data && (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead><tr><th className={am.th}>Candidate</th><th className={am.th}>System</th><th className={am.th}>Role</th><th className={am.th}>Email</th><th className={am.th}>ERP Login</th><th className={am.th}>Status</th></tr></thead>
              <tbody>
                {data.systemAccesses.map((s) => (
                  <tr key={String(s.id)}>
                    <td className={am.td}>{String(s.candidateName)}</td>
                    <td className={am.td}>{String(s.systemName)}</td>
                    <td className={am.td}>{String(s.role)}</td>
                    <td className={am.td}>{String(s.emailAddress)}</td>
                    <td className={am.td}><span className="font-mono">{String(s.erpLogin) || '—'}</span></td>
                    <td className={am.td}><StatusBadge status={String(s.status)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'Induction' && data && (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead><tr><th className={am.th}>Candidate</th><th className={am.th}>Session</th><th className={am.th}>Date</th><th className={am.th}>Attended</th></tr></thead>
              <tbody>
                {data.inductions.map((i) => (
                  <tr key={String(i.id)}>
                    <td className={am.td}>{String(i.candidateName)}</td>
                    <td className={am.td}>{String(i.sessionName)}</td>
                    <td className={am.td}>{String(i.sessionDate) || '—'}</td>
                    <td className={am.td}>{i.attended ? '✓' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'Probation' && data && (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead><tr><th className={am.th}>Candidate</th><th className={am.th}>Start</th><th className={am.th}>End</th><th className={am.th}>Mentor</th><th className={am.th}>Status</th></tr></thead>
              <tbody>
                {data.probations.map((p) => (
                  <tr key={String(p.id)}>
                    <td className={am.td}>{String(p.candidateName)}</td>
                    <td className={am.td}>{String(p.startDate)}</td>
                    <td className={am.td}>{String(p.endDate)}</td>
                    <td className={am.td}>{String(p.mentorName)}</td>
                    <td className={am.td}><StatusBadge status={String(p.status)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'Employment Letters' && data && (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead><tr><th className={am.th}>Candidate</th><th className={am.th}>Letter Type</th><th className={am.th}>QR Verified</th><th className={am.th}>Acknowledged</th></tr></thead>
              <tbody>
                {data.employmentLetters.map((l) => (
                  <tr key={String(l.id)}>
                    <td className={am.td}>{String(l.candidateName)}</td>
                    <td className={am.td}><FileText size={14} className="inline mr-1 text-amber-600" />{String(l.letterType)}</td>
                    <td className={am.td}>{l.qrVerified ? '✓' : '—'}</td>
                    <td className={am.td}>{l.acknowledged ? '✓' : 'Pending'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'Expiry Alerts' && data && (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead><tr><th className={am.th}>Candidate</th><th className={am.th}>Document</th><th className={am.th}>Expiry</th><th className={am.th}>Days Left</th></tr></thead>
              <tbody>
                {data.expiringDocuments.length === 0 ? (
                  <tr><td colSpan={4} className={`${am.td} text-center text-slate-400 py-8`}>No documents expiring in next 90 days</td></tr>
                ) : data.expiringDocuments.map((d) => (
                  <tr key={String(d.id)}>
                    <td className={am.td}>{String(d.candidateName)}</td>
                    <td className={am.td}>{String(d.documentType)}</td>
                    <td className={am.td}>{String(d.expiryDate)}</td>
                    <td className={am.td}>
                      <span className={`font-bold ${Number(d.daysRemaining) <= 30 ? 'text-red-600' : 'text-amber-600'}`}>
                        <AlertTriangle size={12} className="inline" /> {Number(d.daysRemaining)}d
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-slate-500 mt-2 p-2">Alert schedule: 90, 60, 30, 7 days & expired — notifies Employee, HR & Reporting Manager</p>
          </div>
        )}

        {tab === 'Audit Trail' && data && (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead><tr><th className={am.th}>Case</th><th className={am.th}>Action</th><th className={am.th}>By</th><th className={am.th}>Timestamp</th></tr></thead>
              <tbody>
                {data.auditLogs.map((a) => (
                  <tr key={String(a.id)}>
                    <td className={am.td}>{String(a.caseNumber)}</td>
                    <td className={am.td}>{String(a.action)}</td>
                    <td className={am.td}>{String(a.performedBy)}</td>
                    <td className={am.td}>{new Date(String(a.createdAt)).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'Settings' && data && (
          <div className="grid md:grid-cols-2 gap-4">
            <div className={`${am.card} p-4`}>
              <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><Shield size={16} /> Role-Based Access</h3>
              {(data.settings.roleMatrix as Array<{ role: string; responsibilities: string }>).map((r) => (
                <div key={r.role} className="border-b border-slate-100 py-2 text-sm">
                  <span className="font-bold">{r.role}</span>
                  <p className="text-slate-500 text-xs mt-0.5">{r.responsibilities}</p>
                </div>
              ))}
            </div>
            <div className={`${am.card} p-4`}>
              <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><FolderOpen size={16} /> Document Policy</h3>
              <p className="text-sm text-slate-600">Retention: {String(data.settings.retentionPolicy)}</p>
              <p className="text-sm text-slate-600 mt-2">Expiry alerts: {(data.settings.expiryAlertDays as number[]).join(', ')} days</p>
              <p className="text-xs text-slate-500 mt-4">Encrypted storage · Immutable audit logs · Version control · No permanent deletion</p>
            </div>
          </div>
        )}
      </div>
    </AcademicPageShell>
  );
}
