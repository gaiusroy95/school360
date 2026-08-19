import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2, FileText, FolderOpen, Loader2, Mail, Pencil, Plus, Save,
  Shield, UserCheck, AlertTriangle,
} from 'lucide-react';
import {
  activateEdomsPortal,
  activateEdomsSystemAccess,
  acknowledgeEdomsLetter,
  addEdomsChecklistItem,
  advanceEdomsWorkflow,
  completeEdomsChecklist,
  confirmEdomsProbation,
  createEdomsAsset,
  createEdomsCase,
  createEdomsDocumentRecord,
  createEdomsEmploymentHistory,
  createEdomsEmployee,
  createEdomsQualification,
  createEdomsSystemAccess,
  fetchEdomsDashboard,
  generateEdomsLetters,
  renewEdomsDocument,
  seedEdomsDemo,
  sendEdomsExpiryAlert,
  submitEdomsDocument,
  updateEdomsCase,
  updateEdomsInduction,
  updateEdomsProbation,
  updateEdomsSettings,
  updateEdomsVerification,
  updateEdomsAssetStatus,
  verifyEdomsDocument,
  verifyEdomsQualification,
  type EdomsDashboard,
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

type ModalKind =
  | 'case' | 'caseEdit' | 'document' | 'submitDoc' | 'qualification' | 'employment'
  | 'checklist' | 'asset' | 'systemAccess' | 'induction' | 'probation' | 'renew' | 'settings' | null;

const DOC_CATEGORIES = ['Personal', 'Educational', 'Employment', 'Tax', 'Payroll', 'Medical', 'Legal', 'Contracts', 'Certificates'];
const CHECKLIST_DEPTS = ['HR', 'IT', 'Administration', 'Department'];
const ASSET_TYPES = ['Laptop', 'Mobile Phone', 'ID Card', 'Uniform', 'Locker Key', 'Biometric Device'];
const SYSTEMS = ['360SchoolERP', 'Email (Google Workspace)', 'Staff Mobile App', 'Biometric', 'Wi-Fi Network'];

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className={`${am.card} p-3`}>
      <p className="text-[10px] font-bold text-slate-400 uppercase">{label}</p>
      <p className="text-xl font-black text-slate-900 mt-1">{value}</p>
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
  const [modal, setModal] = useState<ModalKind>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string | number | boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchEdomsDashboard());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const onboardings = useMemo(() => data?.onboardings ?? [], [data]);
  const caseOptions = useMemo(
    () => onboardings.map((o) => ({ id: String(o.id), label: `${o.caseNumber} — ${o.candidateName}` })),
    [onboardings],
  );

  const filteredDocs = useMemo(() => (data?.documents ?? []).filter((d) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return String(d.candidateName).toLowerCase().includes(q) || String(d.documentType).toLowerCase().includes(q);
  }), [data, search]);

  const openModal = (kind: ModalKind, defaults: Record<string, string | number | boolean> = {}, id?: string) => {
    setModal(kind);
    setEditId(id ?? null);
    setForm(defaults);
  };

  const saveModal = async () => {
    if (!modal) return;
    setBusy(true);
    try {
      let result: EdomsDashboard;
      switch (modal) {
        case 'case':
          result = await createEdomsCase(form);
          setMessage('Onboarding case created');
          break;
        case 'caseEdit':
          result = await updateEdomsCase(editId!, form);
          setMessage('Case updated');
          break;
        case 'document':
          result = await createEdomsDocumentRecord(String(form.onboardingId), {
            category: form.category, documentType: form.documentType,
          });
          setMessage('Document requirement added');
          break;
        case 'submitDoc':
          result = await submitEdomsDocument(editId!, {
            fileName: form.fileName, documentNumber: form.documentNumber,
            expiryDate: form.expiryDate || undefined,
          });
          setMessage('Document submitted');
          break;
        case 'qualification':
          result = await createEdomsQualification(String(form.onboardingId), form);
          setMessage('Qualification added');
          break;
        case 'employment':
          result = await createEdomsEmploymentHistory(String(form.onboardingId), form);
          setMessage('Employment history added');
          break;
        case 'checklist':
          result = await addEdomsChecklistItem(String(form.onboardingId), {
            department: form.department, item: form.item,
          });
          setMessage('Checklist item added');
          break;
        case 'asset':
          result = await createEdomsAsset(String(form.onboardingId), {
            assetType: form.assetType, assetId: form.assetId,
            serialNumber: form.serialNumber, agreementSigned: Boolean(form.agreementSigned),
          });
          setMessage('Asset allocated');
          break;
        case 'systemAccess':
          result = await createEdomsSystemAccess(String(form.onboardingId), {
            systemName: form.systemName, role: form.role,
            emailAddress: form.emailAddress, erpLogin: form.erpLogin,
            mobileAppAccess: Boolean(form.mobileAppAccess),
          });
          setMessage('System access requested');
          break;
        case 'induction':
          result = await updateEdomsInduction(editId!, {
            attended: Boolean(form.attended), sessionDate: form.sessionDate || undefined,
          });
          setMessage('Induction updated');
          break;
        case 'probation':
          result = await updateEdomsProbation(String(form.onboardingId), {
            action: form.action, mentorName: form.mentorName,
            extendMonths: Number(form.extendMonths), feedback: form.feedback,
            rating: Number(form.rating),
          });
          setMessage('Probation updated');
          break;
        case 'renew':
          result = await renewEdomsDocument(editId!, {
            fileName: form.fileName, expiryDate: form.expiryDate,
            documentNumber: form.documentNumber,
          });
          setMessage('Document renewed');
          break;
        case 'settings':
          result = await updateEdomsSettings({
            retentionPolicy: form.retentionPolicy,
            expiryAlertDays: String(form.expiryAlertDays || '90,60,30,7,0').split(',').map((s) => Number(s.trim())).filter((n) => !Number.isNaN(n)),
            automationRules: {
              uploadLinkAfterOffer: Boolean(form.uploadLinkAfterOffer),
              notifyHrOnSubmit: Boolean(form.notifyHrOnSubmit),
              requestCorrections: Boolean(form.requestCorrections),
              generateAppointmentLetter: Boolean(form.generateAppointmentLetter),
              createEmployeeOnJoining: Boolean(form.createEmployeeOnJoining),
              triggerItChecklist: Boolean(form.triggerItChecklist),
              assignInduction: Boolean(form.assignInduction),
              probationReminders: Boolean(form.probationReminders),
              expiryAlerts: Boolean(form.expiryAlerts),
            },
          });
          setMessage('Settings saved');
          break;
        default:
          return;
      }
      setData(result);
      setModal(null);
    } finally { setBusy(false); }
  };

  const run = async (fn: () => Promise<EdomsDashboard>, msg: string) => {
    setBusy(true);
    try {
      setData(await fn());
      setMessage(msg);
    } finally { setBusy(false); }
  };

  if (loading && !data) return <AcademicLoading />;

  const automation = (data?.settings.automationRules ?? {}) as Record<string, boolean>;

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="HR & Payroll Management › Documents & Onboarding"
        title="Employee Documents & Onboarding (EDOMS)"
        subtitle="Paperless joining from offer acceptance to confirmation — document verification, checklists, assets & ERP provisioning"
        actions={(
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={() => openModal('case', {
              candidateName: '', candidateEmail: '', candidateMobile: '',
              department: 'Teaching', designation: '', joiningDate: '',
            })} className={am.btnPrimary}>
              <Plus size={14} /> New Onboarding Case
            </button>
            <button type="button" disabled={busy} onClick={() => run(seedEdomsDemo, 'Demo EDOMS data loaded')} className={am.btnSecondary}>
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
            <div className={`${am.card} p-4`}>
              <h3 className="font-bold text-slate-800 mb-3">Onboarding Workflow</h3>
              <div className="flex flex-wrap gap-1">
                {data.workflow.map((w) => (
                  <span key={w.key} className="text-[9px] px-2 py-1 bg-slate-100 text-slate-600 rounded-full">{w.step}. {w.label}</span>
                ))}
              </div>
            </div>
            <div className={`${am.card} p-4`}>
              <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-500" /> Recent Onboarding Cases
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {data.onboardings.slice(0, 6).map((o) => (
                  <div key={String(o.id)} className="flex items-center justify-between text-sm border-b border-slate-50 pb-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 truncate">{String(o.candidateName)}</p>
                      <p className="text-[10px] text-slate-500">{String(o.department)} · {String(o.workflowStage).replace(/_/g, ' ')}</p>
                    </div>
                    <StatusBadge status={String(o.status)} />
                  </div>
                ))}
                {data.onboardings.length === 0 && <p className="text-slate-400 text-sm">No onboarding cases yet — create one to get started</p>}
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
                      <div className="flex gap-1 flex-wrap items-center">
                        {!o.preOnboardingActive && (
                          <button type="button" title="Activate Portal" disabled={busy} onClick={() => run(() => activateEdomsPortal(String(o.id)), 'Pre-onboarding portal activated')} className="text-xs text-purple-700 font-bold">Portal</button>
                        )}
                        <button type="button" title="Edit" disabled={busy} onClick={() => openModal('caseEdit', {
                          candidateName: String(o.candidateName), candidateEmail: String(o.candidateEmail ?? ''),
                          candidateMobile: String(o.candidateMobile ?? ''), department: String(o.department),
                          designation: String(o.designation), joiningDate: String(o.joiningDate ?? ''),
                          reportingManager: String(o.reportingManager ?? ''),
                        }, String(o.id))} className="text-xs text-slate-600"><Pencil size={12} /></button>
                        <button type="button" title="Advance" disabled={busy} onClick={() => run(() => advanceEdomsWorkflow(String(o.id)), 'Workflow advanced')} className="text-xs text-amber-700 font-bold">→</button>
                        {!o.employeeCode && (
                          <button type="button" title="Create Employee" disabled={busy} onClick={() => run(() => createEdomsEmployee(String(o.id)), 'Employee master created')} className="text-xs text-green-700 font-bold">
                            <UserCheck size={12} className="inline" />
                          </button>
                        )}
                        {o.status !== 'CONFIRMED' && o.employeeCode && (
                          <button type="button" title="Confirm" disabled={busy} onClick={() => run(() => confirmEdomsProbation(String(o.id)), 'Employee confirmed')} className="text-xs text-blue-700 font-bold">✓</button>
                        )}
                        <button type="button" title="Generate Letters" disabled={busy} onClick={() => run(() => generateEdomsLetters(String(o.id)), 'Employment letters generated')} className="text-xs text-indigo-700"><FileText size={12} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {data.onboardings.length === 0 && (
                  <tr><td colSpan={10} className={`${am.td} text-center text-slate-400 py-8`}>No cases — click &quot;New Onboarding Case&quot; above</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'Document Repository' && data && (
          <>
            <div className="flex flex-wrap gap-2 mb-3">
              <input placeholder="Search by name or document type…" value={search} onChange={(e) => setSearch(e.target.value)} className={`${am.input} max-w-sm`} />
              <button type="button" disabled={busy || caseOptions.length === 0} onClick={() => openModal('document', { onboardingId: caseOptions[0]?.id ?? '', category: 'Personal', documentType: '' })} className={am.btnSecondary}>
                <Plus size={14} /> Add Document
              </button>
            </div>
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
                        <div className="flex gap-1 flex-wrap">
                          {(d.status === 'PENDING' || d.status === 'CORRECTION_REQUIRED') && (
                            <button type="button" disabled={busy} onClick={() => openModal('submitDoc', {
                              fileName: `${String(d.documentType).replace(/\s/g, '_')}.pdf`, documentNumber: '', expiryDate: '',
                            }, String(d.id))} className="text-xs text-blue-700 font-bold">Upload</button>
                          )}
                          {d.status === 'SUBMITTED' && (
                            <>
                              <button type="button" disabled={busy} onClick={() => run(() => verifyEdomsDocument(String(d.id), 'verify'), 'Document verified')} className="text-xs text-green-700 font-bold">✓</button>
                              <button type="button" disabled={busy} onClick={() => run(() => verifyEdomsDocument(String(d.id), 'correction'), 'Correction requested')} className="text-xs text-orange-600">↩</button>
                              <button type="button" disabled={busy} onClick={() => run(() => verifyEdomsDocument(String(d.id), 'reject'), 'Document rejected')} className="text-xs text-red-600">✗</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 mt-2">Categories: {DOC_CATEGORIES.join(', ')}</p>
          </>
        )}

        {tab === 'Verification' && data && (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead><tr><th className={am.th}>Candidate</th><th className={am.th}>Check Type</th><th className={am.th}>Status</th><th className={am.th}>Remarks</th><th className={am.th}>Actions</th></tr></thead>
              <tbody>
                {data.verifications.map((v) => (
                  <tr key={String(v.id)}>
                    <td className={am.td}>{String(v.candidateName)}</td>
                    <td className={am.td}>{String(v.checkType)}</td>
                    <td className={am.td}><StatusBadge status={String(v.status)} /></td>
                    <td className={am.td}>{String(v.remarks) || '—'}</td>
                    <td className={am.td}>
                      {v.status !== 'COMPLETED' && v.status !== 'FAILED' && (
                        <div className="flex gap-1">
                          <button type="button" disabled={busy} onClick={() => run(() => updateEdomsVerification(String(v.id), 'complete'), 'BGV check completed')} className="text-xs text-green-700 font-bold">Pass</button>
                          <button type="button" disabled={busy} onClick={() => run(() => updateEdomsVerification(String(v.id), 'fail', 'Failed verification'), 'BGV check failed')} className="text-xs text-red-600">Fail</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {data.verifications.length === 0 && (
                  <tr><td colSpan={5} className={`${am.td} text-center text-slate-400 py-8`}>Advance onboarding to Background Verification stage to initiate BGV checks</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'Qualifications' && data && (
          <>
            <div className="mb-3">
              <button type="button" disabled={busy || caseOptions.length === 0} onClick={() => openModal('qualification', {
                onboardingId: caseOptions[0]?.id ?? '', qualification: '', boardUniversity: '',
                yearOfPassing: new Date().getFullYear(), percentage: '', majorSubject: '',
              })} className={am.btnSecondary}><Plus size={14} /> Add Qualification</button>
            </div>
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
                    <th className={am.th}>Actions</th>
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
                      <td className={am.td}>
                        {q.verificationStatus === 'PENDING' && (
                          <div className="flex gap-1">
                            <button type="button" disabled={busy} onClick={() => run(() => verifyEdomsQualification(String(q.id), 'VERIFIED'), 'Qualification verified')} className="text-xs text-green-700 font-bold">Verify</button>
                            <button type="button" disabled={busy} onClick={() => run(() => verifyEdomsQualification(String(q.id), 'REJECTED'), 'Qualification rejected')} className="text-xs text-red-600">Reject</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === 'Employment History' && data && (
          <>
            <div className="mb-3">
              <button type="button" disabled={busy || caseOptions.length === 0} onClick={() => openModal('employment', {
                onboardingId: caseOptions[0]?.id ?? '', organization: '', designation: '',
                periodFrom: '', periodTo: '', lastSalary: 0,
              })} className={am.btnSecondary}><Plus size={14} /> Add Employment</button>
            </div>
            <div className={am.tableWrap}>
              <table className="w-full">
                <thead><tr><th className={am.th}>Candidate</th><th className={am.th}>Organization</th><th className={am.th}>Designation</th><th className={am.th}>Period</th><th className={am.th}>Last Salary</th></tr></thead>
                <tbody>
                  {data.employmentHistory.map((e) => (
                    <tr key={String(e.id)}>
                      <td className={am.td}>{String(e.candidateName)}</td>
                      <td className={am.td}>{String(e.organization)}</td>
                      <td className={am.td}>{String(e.designation)}</td>
                      <td className={am.td}>{String(e.periodFrom)} – {String(e.periodTo)}</td>
                      <td className={am.td}>₹{Number(e.lastSalary).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === 'Joining Checklist' && data && (
          <div className="space-y-4">
            <button type="button" disabled={busy || caseOptions.length === 0} onClick={() => openModal('checklist', {
              onboardingId: caseOptions[0]?.id ?? '', department: 'HR', item: '',
            })} className={`${am.btnSecondary} mb-2`}><Plus size={14} /> Add Checklist Item</button>
            {CHECKLIST_DEPTS.map((dept) => (
              <div key={dept} className={`${am.card} p-4`}>
                <h3 className="font-bold text-slate-800 mb-2">{dept}</h3>
                <div className="space-y-1">
                  {data.checklists.filter((c) => c.department === dept).map((c) => (
                    <div key={String(c.id)} className="flex items-center justify-between text-sm py-1 border-b border-slate-50">
                      <span className={c.completed ? 'text-green-700 line-through' : 'text-slate-700'}>{String(c.item)}</span>
                      {!c.completed && (
                        <button type="button" disabled={busy} onClick={() => run(() => completeEdomsChecklist(String(c.id)), 'Checklist item completed')} className="text-xs font-bold text-amber-700">Complete</button>
                      )}
                      {c.completed && <CheckCircle2 size={14} className="text-green-600" />}
                    </div>
                  ))}
                  {data.checklists.filter((c) => c.department === dept).length === 0 && (
                    <p className="text-xs text-slate-400">No items — advance workflow to Joining Day Checklist</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'Assets' && data && (
          <>
            <div className="mb-3">
              <button type="button" disabled={busy || caseOptions.length === 0} onClick={() => openModal('asset', {
                onboardingId: caseOptions[0]?.id ?? '', assetType: 'Laptop', assetId: '', serialNumber: '', agreementSigned: true,
              })} className={am.btnSecondary}><Plus size={14} /> Allocate Asset</button>
            </div>
            <div className={am.tableWrap}>
              <table className="w-full">
                <thead><tr><th className={am.th}>Candidate</th><th className={am.th}>Asset</th><th className={am.th}>Asset ID</th><th className={am.th}>Serial</th><th className={am.th}>Status</th><th className={am.th}>Actions</th></tr></thead>
                <tbody>
                  {data.assets.map((a) => (
                    <tr key={String(a.id)}>
                      <td className={am.td}>{String(a.candidateName)}</td>
                      <td className={am.td}>{String(a.assetType)}</td>
                      <td className={am.td}>{String(a.assetId)}</td>
                      <td className={am.td}>{String(a.serialNumber) || '—'}</td>
                      <td className={am.td}><StatusBadge status={String(a.status)} /></td>
                      <td className={am.td}>
                        {a.status === 'ISSUED' && (
                          <div className="flex gap-1">
                            <button type="button" disabled={busy} onClick={() => run(() => updateEdomsAssetStatus(String(a.id), 'RETURNED'), 'Asset returned')} className="text-xs text-green-700">Return</button>
                            <button type="button" disabled={busy} onClick={() => run(() => updateEdomsAssetStatus(String(a.id), 'LOST'), 'Asset marked lost')} className="text-xs text-red-600">Lost</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === 'System Access' && data && (
          <>
            <div className="mb-3">
              <button type="button" disabled={busy || caseOptions.length === 0} onClick={() => openModal('systemAccess', {
                onboardingId: caseOptions[0]?.id ?? '', systemName: '360SchoolERP', role: '', emailAddress: '', erpLogin: '', mobileAppAccess: true,
              })} className={am.btnSecondary}><Plus size={14} /> Request Access</button>
            </div>
            <div className={am.tableWrap}>
              <table className="w-full">
                <thead><tr><th className={am.th}>Candidate</th><th className={am.th}>System</th><th className={am.th}>Role</th><th className={am.th}>Email</th><th className={am.th}>ERP Login</th><th className={am.th}>Status</th><th className={am.th}>Actions</th></tr></thead>
                <tbody>
                  {data.systemAccesses.map((s) => (
                    <tr key={String(s.id)}>
                      <td className={am.td}>{String(s.candidateName)}</td>
                      <td className={am.td}>{String(s.systemName)}</td>
                      <td className={am.td}>{String(s.role)}</td>
                      <td className={am.td}>{String(s.emailAddress)}</td>
                      <td className={am.td}><span className="font-mono">{String(s.erpLogin) || '—'}</span></td>
                      <td className={am.td}><StatusBadge status={String(s.status)} /></td>
                      <td className={am.td}>
                        {s.status === 'PENDING' && (
                          <button type="button" disabled={busy} onClick={() => run(() => activateEdomsSystemAccess(String(s.id)), 'Access provisioned')} className="text-xs text-green-700 font-bold">Provision</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === 'Induction' && data && (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead><tr><th className={am.th}>Candidate</th><th className={am.th}>Session</th><th className={am.th}>Date</th><th className={am.th}>Attended</th><th className={am.th}>Actions</th></tr></thead>
              <tbody>
                {data.inductions.map((i) => (
                  <tr key={String(i.id)}>
                    <td className={am.td}>{String(i.candidateName)}</td>
                    <td className={am.td}>{String(i.sessionName)}</td>
                    <td className={am.td}>{String(i.sessionDate) || '—'}</td>
                    <td className={am.td}>{i.attended ? '✓' : '—'}</td>
                    <td className={am.td}>
                      {!i.attended && (
                        <button type="button" disabled={busy} onClick={() => openModal('induction', {
                          sessionDate: new Date().toISOString().slice(0, 10), attended: true,
                        }, String(i.id))} className="text-xs text-green-700 font-bold">Mark Attended</button>
                      )}
                    </td>
                  </tr>
                ))}
                {data.inductions.length === 0 && (
                  <tr><td colSpan={5} className={`${am.td} text-center text-slate-400 py-8`}>Advance to Orientation & Induction stage to assign sessions</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'Probation' && data && (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead><tr><th className={am.th}>Candidate</th><th className={am.th}>Start</th><th className={am.th}>End</th><th className={am.th}>Mentor</th><th className={am.th}>Status</th><th className={am.th}>Actions</th></tr></thead>
              <tbody>
                {data.probations.map((p) => (
                  <tr key={String(p.id)}>
                    <td className={am.td}>{String(p.candidateName)}</td>
                    <td className={am.td}>{String(p.startDate)}</td>
                    <td className={am.td}>{String(p.endDate)}</td>
                    <td className={am.td}>{String(p.mentorName)}</td>
                    <td className={am.td}><StatusBadge status={String(p.status)} /></td>
                    <td className={am.td}>
                      {p.status === 'IN_PROGRESS' && (
                        <div className="flex gap-1 flex-wrap">
                          <button type="button" disabled={busy} onClick={() => openModal('probation', {
                            onboardingId: String(p.onboardingId), action: 'review', mentorName: String(p.mentorName),
                            feedback: '', rating: 4, extendMonths: 3,
                          })} className="text-xs text-blue-700">Review</button>
                          <button type="button" disabled={busy} onClick={() => openModal('probation', {
                            onboardingId: String(p.onboardingId), action: 'extend', extendMonths: 3,
                          })} className="text-xs text-amber-700">Extend</button>
                          <button type="button" disabled={busy} onClick={() => run(() => confirmEdomsProbation(String(p.onboardingId)), 'Probation confirmed')} className="text-xs text-green-700 font-bold">Confirm</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {data.probations.length === 0 && (
                  <tr><td colSpan={6} className={`${am.td} text-center text-slate-400 py-8`}>No probation records — advance to Probation Start stage</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'Employment Letters' && data && (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead><tr><th className={am.th}>Candidate</th><th className={am.th}>Letter Type</th><th className={am.th}>File</th><th className={am.th}>QR Verified</th><th className={am.th}>Acknowledged</th><th className={am.th}>Actions</th></tr></thead>
              <tbody>
                {data.employmentLetters.map((l) => (
                  <tr key={String(l.id)}>
                    <td className={am.td}>{String(l.candidateName)}</td>
                    <td className={am.td}><FileText size={14} className="inline mr-1 text-amber-600" />{String(l.letterType)}</td>
                    <td className={am.td}><span className="font-mono text-xs">{String(l.fileName) || '—'}</span></td>
                    <td className={am.td}>{l.qrVerified ? '✓' : '—'}</td>
                    <td className={am.td}>{l.acknowledged ? '✓' : 'Pending'}</td>
                    <td className={am.td}>
                      {!l.acknowledged && (
                        <button type="button" disabled={busy} onClick={() => run(() => acknowledgeEdomsLetter(String(l.id)), 'Letter acknowledged')} className="text-xs text-green-700 font-bold">Acknowledge</button>
                      )}
                    </td>
                  </tr>
                ))}
                {data.employmentLetters.length === 0 && (
                  <tr><td colSpan={6} className={`${am.td} text-center text-slate-400 py-8`}>Generate letters from Onboarding Cases tab</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'Expiry Alerts' && data && (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead><tr><th className={am.th}>Candidate</th><th className={am.th}>Document</th><th className={am.th}>Expiry</th><th className={am.th}>Days Left</th><th className={am.th}>Actions</th></tr></thead>
              <tbody>
                {data.expiringDocuments.length === 0 ? (
                  <tr><td colSpan={5} className={`${am.td} text-center text-slate-400 py-8`}>No documents expiring in next 90 days</td></tr>
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
                    <td className={am.td}>
                      <div className="flex gap-1">
                        <button type="button" disabled={busy} onClick={() => run(() => sendEdomsExpiryAlert(String(d.id)), 'Expiry alert sent')} className="text-xs text-amber-700"><Mail size={12} className="inline" /> Alert</button>
                        <button type="button" disabled={busy} onClick={() => openModal('renew', {
                          fileName: `renewed_${String(d.documentType).replace(/\s/g, '_')}.pdf`,
                          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
                          documentNumber: '',
                        }, String(d.id))} className="text-xs text-green-700">Renew</button>
                      </div>
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
                {data.auditLogs.length === 0 && (
                  <tr><td colSpan={4} className={`${am.td} text-center text-slate-400 py-8`}>Actions will appear here as onboarding progresses</td></tr>
                )}
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
            <div className="space-y-4">
              <div className={`${am.card} p-4`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-slate-800">Automation Rules</h3>
                  <button type="button" disabled={busy} onClick={() => openModal('settings', {
                    retentionPolicy: String(data.settings.retentionPolicy),
                    expiryAlertDays: (data.settings.expiryAlertDays as number[]).join(','),
                    uploadLinkAfterOffer: automation.uploadLinkAfterOffer ?? true,
                    notifyHrOnSubmit: automation.notifyHrOnSubmit ?? true,
                    requestCorrections: automation.requestCorrections ?? true,
                    generateAppointmentLetter: automation.generateAppointmentLetter ?? true,
                    createEmployeeOnJoining: automation.createEmployeeOnJoining ?? true,
                    triggerItChecklist: automation.triggerItChecklist ?? true,
                    assignInduction: automation.assignInduction ?? true,
                    probationReminders: automation.probationReminders ?? true,
                    expiryAlerts: automation.expiryAlerts ?? true,
                  })} className={am.btnSecondary}><Pencil size={14} /> Edit</button>
                </div>
                {data.automationRules.map((rule) => (
                  <p key={rule} className="flex items-start gap-2 text-sm text-slate-600 mb-1">
                    <CheckCircle2 size={14} className="text-green-600 shrink-0 mt-0.5" />
                    {rule}
                  </p>
                ))}
              </div>
              <div className={`${am.card} p-4`}>
                <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><FolderOpen size={16} /> Document Policy</h3>
                <p className="text-sm text-slate-600">Retention: {String(data.settings.retentionPolicy)}</p>
                <p className="text-sm text-slate-600 mt-2">Expiry alerts: {(data.settings.expiryAlertDays as number[]).join(', ')} days</p>
                <p className="text-xs text-slate-500 mt-4">Encrypted storage · Immutable audit logs · Version control · No permanent deletion</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <AcademicModal
        open={modal !== null}
        title={
          modal === 'case' ? 'New Onboarding Case'
            : modal === 'caseEdit' ? 'Edit Onboarding Case'
              : modal === 'document' ? 'Add Document Requirement'
                : modal === 'submitDoc' ? 'Submit Document'
                  : modal === 'qualification' ? 'Add Qualification'
                    : modal === 'employment' ? 'Add Employment History'
                      : modal === 'checklist' ? 'Add Checklist Item'
                        : modal === 'asset' ? 'Allocate Asset'
                          : modal === 'systemAccess' ? 'Request System Access'
                            : modal === 'induction' ? 'Update Induction Session'
                              : modal === 'probation' ? 'Probation Action'
                                : modal === 'renew' ? 'Renew Document'
                                  : modal === 'settings' ? 'EDOMS Settings'
                                    : ''
        }
        onClose={() => setModal(null)}
        footer={(
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setModal(null)} className={am.btnSecondary}>Cancel</button>
            <button type="button" disabled={busy} onClick={() => void saveModal()} className={am.btnPrimary}>
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
            </button>
          </div>
        )}
      >
        {(modal === 'case' || modal === 'caseEdit') && (
          <div className="space-y-3">
            <label className={am.label}>Candidate Name<input className={am.input} value={String(form.candidateName ?? '')} onChange={(e) => setForm({ ...form, candidateName: e.target.value })} /></label>
            <label className={am.label}>Email<input className={am.input} value={String(form.candidateEmail ?? '')} onChange={(e) => setForm({ ...form, candidateEmail: e.target.value })} /></label>
            <label className={am.label}>Mobile<input className={am.input} value={String(form.candidateMobile ?? '')} onChange={(e) => setForm({ ...form, candidateMobile: e.target.value })} /></label>
            <label className={am.label}>Department<input className={am.input} value={String(form.department ?? '')} onChange={(e) => setForm({ ...form, department: e.target.value })} /></label>
            <label className={am.label}>Designation<input className={am.input} value={String(form.designation ?? '')} onChange={(e) => setForm({ ...form, designation: e.target.value })} /></label>
            <label className={am.label}>Joining Date<input type="date" className={am.input} value={String(form.joiningDate ?? '')} onChange={(e) => setForm({ ...form, joiningDate: e.target.value })} /></label>
            {modal === 'caseEdit' && (
              <label className={am.label}>Reporting Manager<input className={am.input} value={String(form.reportingManager ?? '')} onChange={(e) => setForm({ ...form, reportingManager: e.target.value })} /></label>
            )}
          </div>
        )}

        {modal === 'document' && (
          <div className="space-y-3">
            <label className={am.label}>Onboarding Case
              <select className={am.input} value={String(form.onboardingId ?? '')} onChange={(e) => setForm({ ...form, onboardingId: e.target.value })}>
                {caseOptions.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </label>
            <label className={am.label}>Category
              <select className={am.input} value={String(form.category ?? '')} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {DOC_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className={am.label}>Document Type<input className={am.input} value={String(form.documentType ?? '')} onChange={(e) => setForm({ ...form, documentType: e.target.value })} /></label>
          </div>
        )}

        {modal === 'submitDoc' && (
          <div className="space-y-3">
            <label className={am.label}>File Name<input className={am.input} value={String(form.fileName ?? '')} onChange={(e) => setForm({ ...form, fileName: e.target.value })} /></label>
            <label className={am.label}>Document Number<input className={am.input} value={String(form.documentNumber ?? '')} onChange={(e) => setForm({ ...form, documentNumber: e.target.value })} /></label>
            <label className={am.label}>Expiry Date (if applicable)<input type="date" className={am.input} value={String(form.expiryDate ?? '')} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} /></label>
          </div>
        )}

        {modal === 'qualification' && (
          <div className="space-y-3">
            <label className={am.label}>Onboarding Case
              <select className={am.input} value={String(form.onboardingId ?? '')} onChange={(e) => setForm({ ...form, onboardingId: e.target.value })}>
                {caseOptions.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </label>
            <label className={am.label}>Qualification<input className={am.input} value={String(form.qualification ?? '')} onChange={(e) => setForm({ ...form, qualification: e.target.value })} /></label>
            <label className={am.label}>Board/University<input className={am.input} value={String(form.boardUniversity ?? '')} onChange={(e) => setForm({ ...form, boardUniversity: e.target.value })} /></label>
            <label className={am.label}>Year<input type="number" className={am.input} value={Number(form.yearOfPassing ?? 0)} onChange={(e) => setForm({ ...form, yearOfPassing: Number(e.target.value) })} /></label>
            <label className={am.label}>Percentage<input className={am.input} value={String(form.percentage ?? '')} onChange={(e) => setForm({ ...form, percentage: e.target.value })} /></label>
          </div>
        )}

        {modal === 'employment' && (
          <div className="space-y-3">
            <label className={am.label}>Onboarding Case
              <select className={am.input} value={String(form.onboardingId ?? '')} onChange={(e) => setForm({ ...form, onboardingId: e.target.value })}>
                {caseOptions.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </label>
            <label className={am.label}>Organization<input className={am.input} value={String(form.organization ?? '')} onChange={(e) => setForm({ ...form, organization: e.target.value })} /></label>
            <label className={am.label}>Designation<input className={am.input} value={String(form.designation ?? '')} onChange={(e) => setForm({ ...form, designation: e.target.value })} /></label>
            <label className={am.label}>Period From<input className={am.input} placeholder="2018" value={String(form.periodFrom ?? '')} onChange={(e) => setForm({ ...form, periodFrom: e.target.value })} /></label>
            <label className={am.label}>Period To<input className={am.input} placeholder="2024" value={String(form.periodTo ?? '')} onChange={(e) => setForm({ ...form, periodTo: e.target.value })} /></label>
            <label className={am.label}>Last Salary<input type="number" className={am.input} value={Number(form.lastSalary ?? 0)} onChange={(e) => setForm({ ...form, lastSalary: Number(e.target.value) })} /></label>
          </div>
        )}

        {modal === 'checklist' && (
          <div className="space-y-3">
            <label className={am.label}>Onboarding Case
              <select className={am.input} value={String(form.onboardingId ?? '')} onChange={(e) => setForm({ ...form, onboardingId: e.target.value })}>
                {caseOptions.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </label>
            <label className={am.label}>Department
              <select className={am.input} value={String(form.department ?? '')} onChange={(e) => setForm({ ...form, department: e.target.value })}>
                {CHECKLIST_DEPTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </label>
            <label className={am.label}>Item<input className={am.input} value={String(form.item ?? '')} onChange={(e) => setForm({ ...form, item: e.target.value })} /></label>
          </div>
        )}

        {modal === 'asset' && (
          <div className="space-y-3">
            <label className={am.label}>Onboarding Case
              <select className={am.input} value={String(form.onboardingId ?? '')} onChange={(e) => setForm({ ...form, onboardingId: e.target.value })}>
                {caseOptions.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </label>
            <label className={am.label}>Asset Type
              <select className={am.input} value={String(form.assetType ?? '')} onChange={(e) => setForm({ ...form, assetType: e.target.value })}>
                {ASSET_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label className={am.label}>Asset ID<input className={am.input} value={String(form.assetId ?? '')} onChange={(e) => setForm({ ...form, assetId: e.target.value })} /></label>
            <label className={am.label}>Serial Number<input className={am.input} value={String(form.serialNumber ?? '')} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} /></label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={Boolean(form.agreementSigned)} onChange={(e) => setForm({ ...form, agreementSigned: e.target.checked })} />
              Agreement signed
            </label>
          </div>
        )}

        {modal === 'systemAccess' && (
          <div className="space-y-3">
            <label className={am.label}>Onboarding Case
              <select className={am.input} value={String(form.onboardingId ?? '')} onChange={(e) => setForm({ ...form, onboardingId: e.target.value })}>
                {caseOptions.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </label>
            <label className={am.label}>System
              <select className={am.input} value={String(form.systemName ?? '')} onChange={(e) => setForm({ ...form, systemName: e.target.value })}>
                {SYSTEMS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label className={am.label}>Role<input className={am.input} value={String(form.role ?? '')} onChange={(e) => setForm({ ...form, role: e.target.value })} /></label>
            <label className={am.label}>Email<input className={am.input} value={String(form.emailAddress ?? '')} onChange={(e) => setForm({ ...form, emailAddress: e.target.value })} /></label>
            <label className={am.label}>ERP Login<input className={am.input} value={String(form.erpLogin ?? '')} onChange={(e) => setForm({ ...form, erpLogin: e.target.value })} /></label>
          </div>
        )}

        {modal === 'induction' && (
          <div className="space-y-3">
            <label className={am.label}>Session Date<input type="date" className={am.input} value={String(form.sessionDate ?? '')} onChange={(e) => setForm({ ...form, sessionDate: e.target.value })} /></label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={Boolean(form.attended)} onChange={(e) => setForm({ ...form, attended: e.target.checked })} />
              Mark as attended
            </label>
          </div>
        )}

        {modal === 'probation' && (
          <div className="space-y-3">
            <input type="hidden" value={String(form.onboardingId ?? '')} />
            {form.action === 'extend' ? (
              <label className={am.label}>Extend by (months)<input type="number" className={am.input} value={Number(form.extendMonths ?? 3)} onChange={(e) => setForm({ ...form, extendMonths: Number(e.target.value) })} /></label>
            ) : (
              <>
                <label className={am.label}>Mentor<input className={am.input} value={String(form.mentorName ?? '')} onChange={(e) => setForm({ ...form, mentorName: e.target.value })} /></label>
                <label className={am.label}>Monthly Review Feedback<textarea className={am.input} rows={3} value={String(form.feedback ?? '')} onChange={(e) => setForm({ ...form, feedback: e.target.value })} /></label>
                <label className={am.label}>Rating (1-5)<input type="number" min={1} max={5} className={am.input} value={Number(form.rating ?? 4)} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })} /></label>
              </>
            )}
          </div>
        )}

        {modal === 'renew' && (
          <div className="space-y-3">
            <label className={am.label}>New File Name<input className={am.input} value={String(form.fileName ?? '')} onChange={(e) => setForm({ ...form, fileName: e.target.value })} /></label>
            <label className={am.label}>Document Number<input className={am.input} value={String(form.documentNumber ?? '')} onChange={(e) => setForm({ ...form, documentNumber: e.target.value })} /></label>
            <label className={am.label}>New Expiry Date<input type="date" className={am.input} value={String(form.expiryDate ?? '')} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} /></label>
          </div>
        )}

        {modal === 'settings' && (
          <div className="space-y-3">
            <label className={am.label}>Retention Policy<input className={am.input} value={String(form.retentionPolicy ?? '')} onChange={(e) => setForm({ ...form, retentionPolicy: e.target.value })} /></label>
            <label className={am.label}>Expiry Alert Days (comma-separated)<input className={am.input} value={String(form.expiryAlertDays ?? '')} onChange={(e) => setForm({ ...form, expiryAlertDays: e.target.value })} /></label>
            {(['uploadLinkAfterOffer', 'notifyHrOnSubmit', 'requestCorrections', 'generateAppointmentLetter', 'createEmployeeOnJoining', 'triggerItChecklist', 'assignInduction', 'probationReminders', 'expiryAlerts'] as const).map((key) => (
              <label key={key} className="flex items-center gap-2 text-sm capitalize">
                <input type="checkbox" checked={Boolean(form[key])} onChange={(e) => setForm({ ...form, [key]: e.target.checked })} />
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </label>
            ))}
          </div>
        )}
      </AcademicModal>
    </AcademicPageShell>
  );
}
