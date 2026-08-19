import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2, DoorOpen, Loader2, Mail, Pencil, Plus, Save,
  Shield, Users,
} from 'lucide-react';
import {
  addExitHandover,
  addExitKnowledgeTransfer,
  advanceExitWorkflow,
  approveExitClearance,
  approveExitFnf,
  closeExitRetention,
  completeExitHandover,
  completeExitKnowledgeTransfer,
  createExitCase,
  extendExitNotice,
  fetchExitDashboard,
  generateExitDocuments,
  initiateExitRetention,
  markExitFnfPaid,
  processExitApproval,
  recalculateExitFnf,
  recoverExitAsset,
  rejectExitClearance,
  seedExitDemo,
  sendExitDocument,
  submitExitResignation,
  updateExitAlumni,
  updateExitAsset,
  updateExitCase,
  updateExitHandover,
  updateExitInterview,
  updateExitLeaveSettlement,
  updateExitSettings,
  type ExitDashboard,
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
  'Dashboard', 'Resignations', 'Approvals', 'Notice Period', 'Handover',
  'Knowledge Transfer', 'Clearance', 'Asset Recovery', 'Payroll & F&F',
  'Leave Encashment', 'Exit Interview', 'Documents', 'Analytics',
  'Alumni', 'Audit Trail', 'Settings',
] as const;
type TabId = (typeof TABS)[number];

type ModalKind =
  | 'case' | 'caseEdit' | 'approval' | 'handover' | 'handoverEdit' | 'kt' | 'asset'
  | 'fnf' | 'leave' | 'interview' | 'alumni' | 'retention' | 'settings' | null;

const RETENTION_TYPES = ['Stay Interview', 'Counter Offer', 'Internal Transfer', 'Promotion Opportunity', 'Flexible Work Arrangement'];
const KT_TYPES = ['Training Sessions', 'SOP Handover', 'Recorded Videos', 'Shared Documents', 'Password Transfer (Secure Vault)', 'Pending Activities'];
const REHIRE_OPTIONS = ['Eligible for Rehire', 'Not Eligible', 'Conditional', 'Under Review'];

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className={`${am.card} p-3`}>
      <p className="text-[10px] font-bold text-slate-400 uppercase">{label}</p>
      <p className="text-xl font-black text-slate-900 mt-1">{value}</p>
    </div>
  );
}

function RoleMatrix({ roles }: { roles: { role: string; responsibilities: string }[] }) {
  return (
    <div className={`${am.card} p-4`}>
      <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
        <Shield size={16} /> Role-Based Access Matrix
      </h3>
      <div className={am.tableWrap}>
        <table className="w-full">
          <thead><tr><th className={am.th}>Role</th><th className={am.th}>Responsibilities</th></tr></thead>
          <tbody>
            {roles.map((r) => (
              <tr key={r.role}>
                <td className={am.td}><span className="font-bold text-slate-800">{r.role}</span></td>
                <td className={am.td}>{r.responsibilities}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ResignationExitView() {
  const [data, setData] = useState<ExitDashboard | null>(null);
  const [tab, setTab] = useState<TabId>('Dashboard');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [modal, setModal] = useState<ModalKind>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string | number | boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await fetchExitDashboard()); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const cases = useMemo(() => data?.resignations ?? [], [data]);
  const caseOptions = useMemo(
    () => cases.map((r) => ({ id: String(r.id), label: `${r.caseNumber} — ${r.employeeName}` })),
    [cases],
  );

  const openModal = (kind: ModalKind, defaults: Record<string, string | number | boolean> = {}, id?: string) => {
    setModal(kind);
    setEditId(id ?? null);
    setForm(defaults);
  };

  const run = async (fn: () => Promise<ExitDashboard>, msg: string) => {
    setBusy(true);
    try { setData(await fn()); setMessage(msg); }
    finally { setBusy(false); }
  };

  const saveModal = async () => {
    if (!modal) return;
    setBusy(true);
    try {
      let result: ExitDashboard;
      switch (modal) {
        case 'case':
          result = await createExitCase(form);
          setMessage('Resignation case created');
          break;
        case 'caseEdit':
          result = await updateExitCase(editId!, form);
          setMessage('Case updated');
          break;
        case 'approval':
          result = await processExitApproval(editId!, String(form.action) as 'approve' | 'reject' | 'clarify', String(form.remarks ?? ''));
          setMessage('Approval processed');
          break;
        case 'handover':
          result = await addExitHandover(String(form.resignationId), form);
          setMessage('Handover task added');
          break;
        case 'handoverEdit':
          result = await updateExitHandover(editId!, { successor: form.successor, description: form.description });
          setMessage('Handover updated');
          break;
        case 'kt':
          result = await addExitKnowledgeTransfer(String(form.resignationId), form);
          setMessage('Knowledge transfer added');
          break;
        case 'asset':
          result = await updateExitAsset(editId!, { condition: form.condition, damageCost: Number(form.damageCost), recoveryAmount: Number(form.recoveryAmount) });
          setMessage('Asset details updated');
          break;
        case 'fnf':
          result = await recalculateExitFnf(String(form.resignationId), form);
          setMessage('F&F recalculated');
          break;
        case 'leave':
          result = await updateExitLeaveSettlement(String(form.resignationId), form);
          setMessage('Leave encashment updated');
          break;
        case 'interview':
          result = await updateExitInterview(editId!, {
            scheduledDate: form.scheduledDate, rehireInterest: form.rehireInterest,
            hrNotes: form.hrNotes, status: 'COMPLETED',
          });
          setMessage('Exit interview completed');
          break;
        case 'alumni':
          result = await updateExitAlumni(editId!, { rehireEligibility: form.rehireEligibility, notes: form.notes });
          setMessage('Alumni record updated');
          break;
        case 'retention':
          if (data?.retentions.some((t) => String(t.id) === editId)) {
            result = await closeExitRetention(editId!, { status: form.status, notes: form.notes });
            setMessage('Retention closed');
          } else {
            result = await initiateExitRetention(editId!, String(form.retentionType ?? 'Stay Interview'));
            setMessage('Retention initiated');
          }
          break;
        case 'settings':
          result = await updateExitSettings({
            fnfRules: {
              leaveEncashment: Boolean(form.leaveEncashment),
              gratuity: Boolean(form.gratuity),
              noticePayRecovery: Boolean(form.noticePayRecovery),
              assetDamageRecovery: Boolean(form.assetDamageRecovery),
              loanRecovery: Boolean(form.loanRecovery),
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

  if (loading && !data) return <AcademicLoading />;

  const roleMatrix = (data?.settings?.roleMatrix ?? []) as { role: string; responsibilities: string }[];
  const fnfRules = (data?.settings?.fnfRules ?? {}) as Record<string, boolean>;

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="HR & Payroll Management › Resignation & Exit"
        title="Staff Resignation, Exit Management & F&F Settlement (SEMS)"
        subtitle="Digital resignation workflow — approvals, notice period, handover, clearance, full & final settlement & alumni archival"
        actions={(
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={() => openModal('case', {
              employeeName: '', employeeCode: '', department: 'Teaching', designation: '',
              resignationType: 'Voluntary', detailedReason: '', noticePeriodDays: 30,
              requestedLastWorkingDay: '', reportingManager: '',
            })} className={am.btnPrimary}>
              <Plus size={14} /> New Resignation
            </button>
            <button type="button" disabled={busy} onClick={() => run(seedExitDemo, 'Demo exit data loaded')} className={am.btnSecondary}>
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
              <Kpi label="Total Cases" value={data.kpis.totalCases} />
              <Kpi label="Pending Approvals" value={data.kpis.pendingApprovals} />
              <Kpi label="In Notice Period" value={data.kpis.inNoticePeriod} />
              <Kpi label="Completed Exits" value={data.kpis.completedExits} />
              <Kpi label="Pending Clearances" value={data.kpis.pendingClearances} />
              <Kpi label="Pending F&F" value={data.kpis.pendingFnf} />
              <Kpi label="Attrition Rate" value={`${data.kpis.attritionRate}%`} />
              <Kpi label="Avg Notice (days)" value={data.analytics.avgNoticePeriod} />
            </div>
            <div className={`${am.card} p-4`}>
              <h3 className="font-bold text-slate-800 mb-3">Exit Workflow</h3>
              <div className="flex flex-wrap gap-1">
                {data.workflow.map((w) => (
                  <span key={w.key} className="text-[9px] px-2 py-1 bg-slate-100 text-slate-600 rounded-full">{w.step}. {w.label}</span>
                ))}
              </div>
            </div>
            <RoleMatrix roles={roleMatrix} />
            <div className={`${am.card} p-4`}>
              <h3 className="font-bold text-slate-800 mb-3">Active Exit Cases</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {data.resignations.filter((r) => r.status !== 'COMPLETED').slice(0, 6).map((r) => (
                  <div key={String(r.id)} className="flex items-center justify-between text-sm border-b border-slate-50 pb-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 truncate">{String(r.employeeName)}</p>
                      <p className="text-[10px] text-slate-500">{String(r.department)} · {String(r.workflowStage).replace(/_/g, ' ')}</p>
                    </div>
                    <StatusBadge status={String(r.status)} />
                  </div>
                ))}
                {data.resignations.length === 0 && <p className="text-slate-400 text-sm">No exit cases — create one to get started</p>}
              </div>
            </div>
          </div>
        )}

        {tab === 'Resignations' && data && (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead>
                <tr>
                  <th className={am.th}>Case #</th><th className={am.th}>Employee</th><th className={am.th}>Department</th>
                  <th className={am.th}>Type</th><th className={am.th}>LWD</th><th className={am.th}>Notice</th>
                  <th className={am.th}>Handover</th><th className={am.th}>Clearance</th><th className={am.th}>Stage</th>
                  <th className={am.th}>Status</th><th className={am.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.resignations.map((r) => (
                  <tr key={String(r.id)}>
                    <td className={am.td}><span className="font-mono font-bold">{String(r.caseNumber)}</span></td>
                    <td className={am.td}>{String(r.employeeName)}</td>
                    <td className={am.td}>{String(r.department)}</td>
                    <td className={am.td}>{String(r.resignationType)}</td>
                    <td className={am.td}>{String(r.requestedLastWorkingDay) || '—'}</td>
                    <td className={am.td}>{r.noticeDaysRemaining != null ? `${r.noticeDaysRemaining}d left` : `${r.noticePeriodDays}d`}</td>
                    <td className={am.td}>{Number(r.handoverDone)}/{Number(r.handoverTotal)}</td>
                    <td className={am.td}>{Number(r.clearanceDone)}/{Number(r.clearanceTotal)}</td>
                    <td className={am.td}><span className="text-xs">{String(r.workflowStage).replace(/_/g, ' ')}</span></td>
                    <td className={am.td}><StatusBadge status={String(r.status)} /></td>
                    <td className={am.td}>
                      <div className="flex gap-1 flex-wrap items-center">
                        {r.status === 'DRAFT' && (
                          <button type="button" disabled={busy} onClick={() => run(() => submitExitResignation(String(r.id)), 'Resignation submitted')} className="text-xs text-amber-700 font-bold">Submit</button>
                        )}
                        <button type="button" disabled={busy} onClick={() => openModal('caseEdit', {
                          employeeName: String(r.employeeName), department: String(r.department),
                          designation: String(r.designation), resignationType: String(r.resignationType),
                          detailedReason: String(r.detailedReason ?? ''), noticePeriodDays: Number(r.noticePeriodDays),
                          requestedLastWorkingDay: String(r.requestedLastWorkingDay ?? ''), reportingManager: String(r.reportingManager ?? ''),
                        }, String(r.id))} className="text-xs text-slate-600"><Pencil size={12} /></button>
                        <button type="button" disabled={busy} onClick={() => run(() => advanceExitWorkflow(String(r.id)), 'Workflow advanced')} className="text-xs text-blue-700 font-bold">→</button>
                        <button type="button" disabled={busy} onClick={() => openModal('retention', { retentionType: 'Stay Interview' }, String(r.id))} className="text-xs text-purple-700" title="Initiate Retention">Retain</button>
                        <button type="button" disabled={busy} onClick={() => run(() => generateExitDocuments(String(r.id)), 'Documents generated')} className="text-xs text-indigo-700">Docs</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'Approvals' && data && (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead>
                <tr>
                  <th className={am.th}>Case</th><th className={am.th}>Employee</th><th className={am.th}>Approver Role</th>
                  <th className={am.th}>Approver</th><th className={am.th}>Action</th><th className={am.th}>Remarks</th><th className={am.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.approvals.map((a) => (
                  <tr key={String(a.id)}>
                    <td className={am.td}>{String(a.caseNumber)}</td>
                    <td className={am.td}>{String(a.employeeName)}</td>
                    <td className={am.td}>{String(a.approverRole)}</td>
                    <td className={am.td}>{String(a.approverName)}</td>
                    <td className={am.td}><StatusBadge status={String(a.action)} /></td>
                    <td className={am.td}>{String(a.remarks) || '—'}</td>
                    <td className={am.td}>
                      {a.action === 'PENDING' && (
                        <div className="flex gap-1">
                          <button type="button" disabled={busy} onClick={() => openModal('approval', { action: 'approve', remarks: '' }, String(a.id))} className="text-xs text-green-700 font-bold">✓</button>
                          <button type="button" disabled={busy} onClick={() => openModal('approval', { action: 'reject', remarks: '' }, String(a.id))} className="text-xs text-red-700 font-bold">✗</button>
                          <button type="button" disabled={busy} onClick={() => openModal('approval', { action: 'clarify', remarks: '' }, String(a.id))} className="text-xs text-amber-700">?</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'Notice Period' && data && (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead>
                <tr>
                  <th className={am.th}>Case</th><th className={am.th}>Employee</th><th className={am.th}>Notice Start</th>
                  <th className={am.th}>Notice End</th><th className={am.th}>Days Remaining</th><th className={am.th}>Status</th><th className={am.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.resignations.filter((r) => r.noticeStartDate).map((r) => (
                  <tr key={String(r.id)}>
                    <td className={am.td}>{String(r.caseNumber)}</td>
                    <td className={am.td}>{String(r.employeeName)}</td>
                    <td className={am.td}>{String(r.noticeStartDate)}</td>
                    <td className={am.td}>{String(r.noticeEndDate)}</td>
                    <td className={am.td}>
                      <span className={`font-bold ${Number(r.noticeDaysRemaining) <= 7 ? 'text-red-600' : 'text-slate-800'}`}>
                        {String(r.noticeDaysRemaining ?? '—')} days
                      </span>
                    </td>
                    <td className={am.td}><StatusBadge status={String(r.status)} /></td>
                    <td className={am.td}>
                      <button type="button" disabled={busy} onClick={() => run(() => extendExitNotice(String(r.id), 7), 'Notice extended by 7 days')} className="text-xs text-amber-700 font-bold">+7d</button>
                    </td>
                  </tr>
                ))}
                {data.resignations.filter((r) => r.noticeStartDate).length === 0 && (
                  <tr><td colSpan={7} className={`${am.td} text-center text-slate-400 py-8`}>Notice period starts after final approval</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'Handover' && data && (
          <>
            <div className="mb-3">
              <button type="button" disabled={busy || caseOptions.length === 0} onClick={() => openModal('handover', {
                resignationId: caseOptions[0]?.id ?? '', category: 'Academic Staff', taskType: '', description: '', successor: '',
              })} className={am.btnSecondary}><Plus size={14} /> Add Handover Task</button>
            </div>
            <div className={am.tableWrap}>
              <table className="w-full">
                <thead>
                  <tr>
                    <th className={am.th}>Case</th><th className={am.th}>Employee</th><th className={am.th}>Category</th>
                    <th className={am.th}>Task</th><th className={am.th}>Successor</th><th className={am.th}>Due</th>
                    <th className={am.th}>Status</th><th className={am.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.handovers.map((h) => (
                    <tr key={String(h.id)}>
                      <td className={am.td}>{String(h.caseNumber)}</td>
                      <td className={am.td}>{String(h.employeeName)}</td>
                      <td className={am.td}>{String(h.category)}</td>
                      <td className={am.td}>{String(h.taskType)}</td>
                      <td className={am.td}>{String(h.successor)}</td>
                      <td className={am.td}>{String(h.dueDate) || '—'}</td>
                      <td className={am.td}><StatusBadge status={String(h.status)} /></td>
                      <td className={am.td}>
                        <div className="flex gap-1">
                          {h.status !== 'COMPLETED' && (
                            <>
                              <button type="button" disabled={busy} onClick={() => openModal('handoverEdit', { successor: String(h.successor), description: String(h.description ?? '') }, String(h.id))} className="text-xs text-blue-700"><Pencil size={12} /></button>
                              <button type="button" disabled={busy} onClick={() => run(() => completeExitHandover(String(h.id)), 'Handover completed')} className="text-xs text-green-700 font-bold">Done</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === 'Knowledge Transfer' && data && (
          <>
            <div className="mb-3">
              <button type="button" disabled={busy || caseOptions.length === 0} onClick={() => openModal('kt', {
                resignationId: caseOptions[0]?.id ?? '', transferType: KT_TYPES[0], description: '',
              })} className={am.btnSecondary}><Plus size={14} /> Add KT Item</button>
            </div>
            <div className={am.tableWrap}>
              <table className="w-full">
                <thead>
                  <tr>
                    <th className={am.th}>Case</th><th className={am.th}>Employee</th><th className={am.th}>Type</th>
                    <th className={am.th}>Description</th><th className={am.th}>Due</th><th className={am.th}>Status</th><th className={am.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.knowledgeTransfers.map((k) => (
                    <tr key={String(k.id)}>
                      <td className={am.td}>{String(k.caseNumber)}</td>
                      <td className={am.td}>{String(k.employeeName)}</td>
                      <td className={am.td}>{String(k.transferType)}</td>
                      <td className={am.td}>{String(k.description)}</td>
                      <td className={am.td}>{String(k.dueDate) || '—'}</td>
                      <td className={am.td}><StatusBadge status={String(k.status)} /></td>
                      <td className={am.td}>
                        {k.status !== 'COMPLETED' && (
                          <button type="button" disabled={busy} onClick={() => run(() => completeExitKnowledgeTransfer(String(k.id)), 'KT completed')} className="text-xs text-green-700 font-bold">Complete</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === 'Clearance' && data && (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead>
                <tr>
                  <th className={am.th}>Case</th><th className={am.th}>Employee</th><th className={am.th}>Department</th>
                  <th className={am.th}>Recovery</th><th className={am.th}>Pending Items</th><th className={am.th}>Status</th><th className={am.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.clearances.map((c) => (
                  <tr key={String(c.id)}>
                    <td className={am.td}>{String(c.caseNumber)}</td>
                    <td className={am.td}>{String(c.employeeName)}</td>
                    <td className={am.td}>{String(c.department)}</td>
                    <td className={am.td}>₹{Number(c.recoveryAmount).toLocaleString()}</td>
                    <td className={am.td}>{String(c.pendingItems) || '—'}</td>
                    <td className={am.td}><StatusBadge status={String(c.status)} /></td>
                    <td className={am.td}>
                      {c.status === 'PENDING' && (
                        <div className="flex gap-1">
                          <button type="button" disabled={busy} onClick={() => run(() => approveExitClearance(String(c.id)), 'Clearance approved')} className="text-xs text-green-700 font-bold">✓</button>
                          <button type="button" disabled={busy} onClick={() => run(() => rejectExitClearance(String(c.id), 'Pending items not cleared'), 'Clearance rejected')} className="text-xs text-red-700">✗</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'Asset Recovery' && data && (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead>
                <tr>
                  <th className={am.th}>Case</th><th className={am.th}>Employee</th><th className={am.th}>Asset</th>
                  <th className={am.th}>Asset ID</th><th className={am.th}>Condition</th><th className={am.th}>Damage Cost</th>
                  <th className={am.th}>Status</th><th className={am.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.assetRecoveries.map((a) => (
                  <tr key={String(a.id)}>
                    <td className={am.td}>{String(a.caseNumber)}</td>
                    <td className={am.td}>{String(a.employeeName)}</td>
                    <td className={am.td}>{String(a.assetType)}</td>
                    <td className={am.td}>{String(a.assetId)}</td>
                    <td className={am.td}>{String(a.condition)}</td>
                    <td className={am.td}>₹{Number(a.damageCost).toLocaleString()}</td>
                    <td className={am.td}><StatusBadge status={String(a.status)} /></td>
                    <td className={am.td}>
                      <div className="flex gap-1">
                        <button type="button" disabled={busy} onClick={() => openModal('asset', { condition: String(a.condition), damageCost: Number(a.damageCost), recoveryAmount: Number(a.recoveryAmount ?? 0) }, String(a.id))} className="text-xs text-blue-700"><Pencil size={12} /></button>
                        {a.status === 'PENDING' && (
                          <button type="button" disabled={busy} onClick={() => run(() => recoverExitAsset(String(a.id)), 'Asset recovered')} className="text-xs text-green-700 font-bold">Recover</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'Payroll & F&F' && data && (
          <>
            <div className="mb-3">
              <button type="button" disabled={busy || caseOptions.length === 0} onClick={() => openModal('fnf', {
                resignationId: caseOptions[0]?.id ?? '', salary: 45000, leaveEncashment: 12500, recoveries: 2000,
              })} className={am.btnSecondary}><Plus size={14} /> Calculate F&F</button>
            </div>
            <div className={am.tableWrap}>
              <table className="w-full">
                <thead>
                  <tr>
                    <th className={am.th}>Case</th><th className={am.th}>Employee</th><th className={am.th}>Leave Encashment</th>
                    <th className={am.th}>Net F&F</th><th className={am.th}>Payment Date</th><th className={am.th}>Mode</th>
                    <th className={am.th}>Status</th><th className={am.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.fnfSettlements.map((f) => (
                    <tr key={String(f.id)}>
                      <td className={am.td}>{String(f.caseNumber)}</td>
                      <td className={am.td}>{String(f.employeeName)}</td>
                      <td className={am.td}>₹{Number(f.leaveEncashment).toLocaleString()}</td>
                      <td className={am.td}><span className="font-bold">₹{Number(f.netAmount).toLocaleString()}</span></td>
                      <td className={am.td}>{String(f.paymentDate) || '—'}</td>
                      <td className={am.td}>{String(f.paymentMode) || '—'}</td>
                      <td className={am.td}><StatusBadge status={String(f.settlementStatus)} /></td>
                      <td className={am.td}>
                        <div className="flex gap-1 flex-wrap">
                          {f.settlementStatus === 'CALCULATED' && (
                            <button type="button" disabled={busy} onClick={() => run(() => approveExitFnf(String(f.resignationId)), 'F&F approved')} className="text-xs text-green-700 font-bold">Approve</button>
                          )}
                          {f.settlementStatus === 'APPROVED' && (
                            <button type="button" disabled={busy} onClick={() => run(() => markExitFnfPaid(String(f.resignationId), { paymentMode: 'Bank Transfer' }), 'F&F marked paid')} className="text-xs text-blue-700 font-bold">Mark Paid</button>
                          )}
                          <button type="button" disabled={busy} onClick={() => openModal('fnf', { resignationId: String(f.resignationId), salary: 45000, leaveEncashment: Number(f.leaveEncashment), recoveries: 2000 })} className="text-xs text-amber-700">Recalc</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {data.fnfSettlements.length === 0 && (
                    <tr><td colSpan={8} className={`${am.td} text-center text-slate-400 py-8`}>Advance workflow to F&F calculation stage or click Calculate F&F</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === 'Leave Encashment' && data && (
          <>
            <div className="mb-3">
              <button type="button" disabled={busy || caseOptions.length === 0} onClick={() => openModal('leave', {
                resignationId: caseOptions[0]?.id ?? '', earnedLeave: 18, casualLeave: 5, sickLeave: 3, compOff: 2, encashRate: 1500,
              })} className={am.btnSecondary}><Plus size={14} /> Calculate Encashment</button>
            </div>
            <div className={am.tableWrap}>
              <table className="w-full">
                <thead>
                  <tr>
                    <th className={am.th}>Case</th><th className={am.th}>Employee</th><th className={am.th}>Earned Leave</th>
                    <th className={am.th}>Casual</th><th className={am.th}>Sick</th><th className={am.th}>Comp-Off</th>
                    <th className={am.th}>Encashment</th><th className={am.th}>Recovery</th><th className={am.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.leaveSettlements.map((l) => (
                    <tr key={String(l.id)}>
                      <td className={am.td}>{String(l.caseNumber)}</td>
                      <td className={am.td}>{String(l.employeeName)}</td>
                      <td className={am.td}>{Number(l.earnedLeave)}</td>
                      <td className={am.td}>{Number(l.casualLeave)}</td>
                      <td className={am.td}>{Number(l.sickLeave)}</td>
                      <td className={am.td}>{Number(l.compOff)}</td>
                      <td className={am.td}>₹{Number(l.encashmentAmount).toLocaleString()}</td>
                      <td className={am.td}>₹{Number(l.negativeLeaveRecovery).toLocaleString()}</td>
                      <td className={am.td}>
                        <button type="button" disabled={busy} onClick={() => openModal('leave', {
                          resignationId: String(l.resignationId), earnedLeave: Number(l.earnedLeave),
                          casualLeave: Number(l.casualLeave), sickLeave: Number(l.sickLeave),
                          compOff: Number(l.compOff), encashRate: 1500,
                        })} className="text-xs text-amber-700"><Pencil size={12} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === 'Exit Interview' && data && (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead>
                <tr>
                  <th className={am.th}>Case</th><th className={am.th}>Employee</th><th className={am.th}>Scheduled</th>
                  <th className={am.th}>Rehire Interest</th><th className={am.th}>Status</th><th className={am.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.exitInterviews.map((i) => (
                  <tr key={String(i.id)}>
                    <td className={am.td}>{String(i.caseNumber)}</td>
                    <td className={am.td}>{String(i.employeeName)}</td>
                    <td className={am.td}>{String(i.scheduledDate).slice(0, 10) || '—'}</td>
                    <td className={am.td}>{String(i.rehireInterest) || '—'}</td>
                    <td className={am.td}><StatusBadge status={String(i.status)} /></td>
                    <td className={am.td}>
                      {i.status !== 'COMPLETED' && (
                        <button type="button" disabled={busy} onClick={() => openModal('interview', {
                          scheduledDate: new Date().toISOString().slice(0, 10), rehireInterest: 'Yes',
                          hrNotes: '', status: 'COMPLETED',
                        }, String(i.id))} className="text-xs text-green-700 font-bold">Complete</button>
                      )}
                    </td>
                  </tr>
                ))}
                {data.exitInterviews.length === 0 && (
                  <tr><td colSpan={6} className={`${am.td} text-center text-slate-400 py-8`}>Advance to Exit Interview stage</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'Documents' && data && (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead>
                <tr>
                  <th className={am.th}>Case</th><th className={am.th}>Employee</th><th className={am.th}>Document</th>
                  <th className={am.th}>File</th><th className={am.th}>Digital Sign</th><th className={am.th}>QR</th>
                  <th className={am.th}>Status</th><th className={am.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.documents.map((d) => (
                  <tr key={String(d.id)}>
                    <td className={am.td}>{String(d.caseNumber)}</td>
                    <td className={am.td}>{String(d.employeeName)}</td>
                    <td className={am.td}>{String(d.documentType)}</td>
                    <td className={am.td}>{String(d.fileName)}</td>
                    <td className={am.td}>{d.digitalSigned ? '✓' : '—'}</td>
                    <td className={am.td}>{d.qrVerified ? '✓' : '—'}</td>
                    <td className={am.td}><StatusBadge status={String(d.status)} /></td>
                    <td className={am.td}>
                      {d.status !== 'SENT' && (
                        <button type="button" disabled={busy} onClick={() => run(() => sendExitDocument(String(d.id)), 'Document sent to employee')} className="text-xs text-green-700 font-bold"><Mail size={12} className="inline" /> Send</button>
                      )}
                    </td>
                  </tr>
                ))}
                {data.documents.length === 0 && (
                  <tr><td colSpan={8} className={`${am.td} text-center text-slate-400 py-8`}>Generate documents from Resignations tab</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'Analytics' && data && (
          <div className="grid lg:grid-cols-2 gap-4">
            <div className={`${am.card} p-4`}>
              <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><Users size={16} /> Department-wise Attrition</h3>
              {data.analytics.departmentAttrition.map((d) => (
                <div key={d.department} className="flex justify-between py-2 border-b border-slate-100 text-sm">
                  <span>{d.department}</span><span className="font-bold">{d.count}</span>
                </div>
              ))}
            </div>
            <div className={`${am.card} p-4`}>
              <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><DoorOpen size={16} /> Resignation Types</h3>
              {data.analytics.resignationTypes.map((t) => (
                <div key={t.type} className="flex justify-between py-2 border-b border-slate-100 text-sm">
                  <span>{t.type}</span><span className="font-bold">{t.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'Alumni' && data && (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead>
                <tr>
                  <th className={am.th}>Case</th><th className={am.th}>Employee</th><th className={am.th}>Rehire Eligibility</th>
                  <th className={am.th}>Notes</th><th className={am.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.alumniRecords.map((a) => (
                  <tr key={String(a.id)}>
                    <td className={am.td}>{String(a.caseNumber)}</td>
                    <td className={am.td}>{String(a.employeeName)}</td>
                    <td className={am.td}><StatusBadge status={String(a.rehireEligibility)} /></td>
                    <td className={am.td}>{String(a.notes) || '—'}</td>
                    <td className={am.td}>
                      <button type="button" disabled={busy} onClick={() => openModal('alumni', {
                        rehireEligibility: String(a.rehireEligibility), notes: String(a.notes ?? ''),
                      }, String(a.id))} className="text-xs text-blue-700"><Pencil size={12} /></button>
                    </td>
                  </tr>
                ))}
                {data.alumniRecords.length === 0 && (
                  <tr><td colSpan={5} className={`${am.td} text-center text-slate-400 py-8`}>Alumni records created when exit reaches Employee Archive stage</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'Audit Trail' && data && (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead><tr><th className={am.th}>Case</th><th className={am.th}>Action</th><th className={am.th}>Performed By</th><th className={am.th}>Timestamp</th></tr></thead>
              <tbody>
                {data.auditLogs.map((a) => (
                  <tr key={String(a.id)}>
                    <td className={am.td}>{String(a.caseNumber)}</td>
                    <td className={am.td}>{String(a.action)}</td>
                    <td className={am.td}>{String(a.performedBy)}</td>
                    <td className={am.td}>{new Date(String(a.createdAt)).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'Settings' && data && (
          <div className="space-y-4">
            <RoleMatrix roles={roleMatrix} />
            <div className={`${am.card} p-4`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-slate-800">F&F Rules</h3>
                <button type="button" disabled={busy} onClick={() => openModal('settings', {
                  leaveEncashment: fnfRules.leaveEncashment ?? true,
                  gratuity: fnfRules.gratuity ?? true,
                  noticePayRecovery: fnfRules.noticePayRecovery ?? true,
                  assetDamageRecovery: fnfRules.assetDamageRecovery ?? true,
                  loanRecovery: fnfRules.loanRecovery ?? true,
                })} className={am.btnSecondary}><Pencil size={14} /> Edit</button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {Object.entries(fnfRules).map(([k, v]) => (
                  <p key={k} className="flex items-center gap-2 text-slate-600">
                    <CheckCircle2 size={14} className={v ? 'text-green-600' : 'text-slate-300'} />
                    {k.replace(/([A-Z])/g, ' $1').trim()}
                  </p>
                ))}
              </div>
            </div>
            <div className={`${am.card} p-4`}>
              <h3 className="font-bold text-slate-800 mb-3">Workflow Automation</h3>
              {data.automationRules.map((rule) => (
                <p key={rule} className="flex items-start gap-2 text-sm text-slate-600 mb-1">
                  <CheckCircle2 size={14} className="text-green-600 shrink-0 mt-0.5" />{rule}
                </p>
              ))}
            </div>
            <div className={`${am.card} p-4`}>
              <h3 className="font-bold text-slate-800 mb-3">Resignation Types</h3>
              <div className="flex flex-wrap gap-2">
                {data.resignationTypes.map((t) => (
                  <span key={t} className="px-2 py-1 bg-slate-100 rounded text-xs text-slate-700">{t}</span>
                ))}
              </div>
            </div>
            {data.retentions.length > 0 && (
              <div className={`${am.card} p-4`}>
                <h3 className="font-bold text-slate-800 mb-3">Retention Attempts</h3>
                <div className={am.tableWrap}>
                  <table className="w-full">
                    <thead><tr><th className={am.th}>Case</th><th className={am.th}>Employee</th><th className={am.th}>Type</th><th className={am.th}>Status</th><th className={am.th}>Actions</th></tr></thead>
                    <tbody>
                      {data.retentions.map((t) => (
                        <tr key={String(t.id)}>
                          <td className={am.td}>{String(t.caseNumber)}</td>
                          <td className={am.td}>{String(t.employeeName)}</td>
                          <td className={am.td}>{String(t.retentionType)}</td>
                          <td className={am.td}><StatusBadge status={String(t.status)} /></td>
                          <td className={am.td}>
                            {t.status === 'OPEN' && (
                              <button type="button" disabled={busy} onClick={() => openModal('retention', { status: 'CLOSED', notes: '' }, String(t.id))} className="text-xs text-amber-700">Close</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <AcademicModal
        open={modal !== null}
        title={
          modal === 'case' ? 'New Resignation Case'
            : modal === 'caseEdit' ? 'Edit Resignation Case'
              : modal === 'approval' ? 'Process Approval'
                : modal === 'handover' ? 'Add Handover Task'
                  : modal === 'handoverEdit' ? 'Update Handover'
                    : modal === 'kt' ? 'Add Knowledge Transfer'
                      : modal === 'asset' ? 'Update Asset Details'
                        : modal === 'fnf' ? 'Calculate F&F Settlement'
                          : modal === 'leave' ? 'Leave Encashment'
                            : modal === 'interview' ? 'Complete Exit Interview'
                              : modal === 'alumni' ? 'Update Alumni Record'
                                : modal === 'retention' ? 'Retention Action'
                                  : modal === 'settings' ? 'SEMS Settings'
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
            <label className={am.label}>Employee Name<input className={am.input} value={String(form.employeeName ?? '')} onChange={(e) => setForm({ ...form, employeeName: e.target.value })} /></label>
            {modal === 'case' && <label className={am.label}>Employee Code<input className={am.input} value={String(form.employeeCode ?? '')} onChange={(e) => setForm({ ...form, employeeCode: e.target.value })} /></label>}
            <label className={am.label}>Department<input className={am.input} value={String(form.department ?? '')} onChange={(e) => setForm({ ...form, department: e.target.value })} /></label>
            <label className={am.label}>Designation<input className={am.input} value={String(form.designation ?? '')} onChange={(e) => setForm({ ...form, designation: e.target.value })} /></label>
            <label className={am.label}>Resignation Type
              <select className={am.input} value={String(form.resignationType ?? '')} onChange={(e) => setForm({ ...form, resignationType: e.target.value })}>
                {(data?.resignationTypes ?? []).map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label className={am.label}>Reason<textarea className={am.input} rows={2} value={String(form.detailedReason ?? '')} onChange={(e) => setForm({ ...form, detailedReason: e.target.value })} /></label>
            <label className={am.label}>Last Working Day<input type="date" className={am.input} value={String(form.requestedLastWorkingDay ?? '')} onChange={(e) => setForm({ ...form, requestedLastWorkingDay: e.target.value })} /></label>
            <label className={am.label}>Notice Period (days)<input type="number" className={am.input} value={Number(form.noticePeriodDays ?? 30)} onChange={(e) => setForm({ ...form, noticePeriodDays: Number(e.target.value) })} /></label>
          </div>
        )}

        {modal === 'approval' && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">Action: <strong>{String(form.action)}</strong></p>
            <label className={am.label}>Remarks<textarea className={am.input} rows={3} value={String(form.remarks ?? '')} onChange={(e) => setForm({ ...form, remarks: e.target.value })} /></label>
          </div>
        )}

        {modal === 'handover' && (
          <div className="space-y-3">
            <label className={am.label}>Case
              <select className={am.input} value={String(form.resignationId ?? '')} onChange={(e) => setForm({ ...form, resignationId: e.target.value })}>
                {caseOptions.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </label>
            <label className={am.label}>Category
              <select className={am.input} value={String(form.category ?? '')} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option value="Academic Staff">Academic Staff</option>
                <option value="Administrative Staff">Administrative Staff</option>
              </select>
            </label>
            <label className={am.label}>Task Type<input className={am.input} value={String(form.taskType ?? '')} onChange={(e) => setForm({ ...form, taskType: e.target.value })} /></label>
            <label className={am.label}>Successor<input className={am.input} value={String(form.successor ?? '')} onChange={(e) => setForm({ ...form, successor: e.target.value })} /></label>
          </div>
        )}

        {modal === 'handoverEdit' && (
          <div className="space-y-3">
            <label className={am.label}>Successor<input className={am.input} value={String(form.successor ?? '')} onChange={(e) => setForm({ ...form, successor: e.target.value })} /></label>
            <label className={am.label}>Notes<textarea className={am.input} rows={2} value={String(form.description ?? '')} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
          </div>
        )}

        {modal === 'kt' && (
          <div className="space-y-3">
            <label className={am.label}>Case
              <select className={am.input} value={String(form.resignationId ?? '')} onChange={(e) => setForm({ ...form, resignationId: e.target.value })}>
                {caseOptions.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </label>
            <label className={am.label}>Transfer Type
              <select className={am.input} value={String(form.transferType ?? '')} onChange={(e) => setForm({ ...form, transferType: e.target.value })}>
                {KT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label className={am.label}>Description<textarea className={am.input} rows={2} value={String(form.description ?? '')} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
          </div>
        )}

        {modal === 'asset' && (
          <div className="space-y-3">
            <label className={am.label}>Condition
              <select className={am.input} value={String(form.condition ?? '')} onChange={(e) => setForm({ ...form, condition: e.target.value })}>
                {['Good', 'Fair', 'Damaged', 'Lost'].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className={am.label}>Damage Cost<input type="number" className={am.input} value={Number(form.damageCost ?? 0)} onChange={(e) => setForm({ ...form, damageCost: Number(e.target.value) })} /></label>
            <label className={am.label}>Recovery Amount<input type="number" className={am.input} value={Number(form.recoveryAmount ?? 0)} onChange={(e) => setForm({ ...form, recoveryAmount: Number(e.target.value) })} /></label>
          </div>
        )}

        {modal === 'fnf' && (
          <div className="space-y-3">
            <label className={am.label}>Case
              <select className={am.input} value={String(form.resignationId ?? '')} onChange={(e) => setForm({ ...form, resignationId: e.target.value })}>
                {caseOptions.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </label>
            <label className={am.label}>Salary (up to LWD)<input type="number" className={am.input} value={Number(form.salary ?? 0)} onChange={(e) => setForm({ ...form, salary: Number(e.target.value) })} /></label>
            <label className={am.label}>Leave Encashment<input type="number" className={am.input} value={Number(form.leaveEncashment ?? 0)} onChange={(e) => setForm({ ...form, leaveEncashment: Number(e.target.value) })} /></label>
            <label className={am.label}>Recoveries<input type="number" className={am.input} value={Number(form.recoveries ?? 0)} onChange={(e) => setForm({ ...form, recoveries: Number(e.target.value) })} /></label>
          </div>
        )}

        {modal === 'leave' && (
          <div className="space-y-3">
            {!data?.leaveSettlements.some((l) => String(l.resignationId) === String(form.resignationId)) && (
              <label className={am.label}>Case
                <select className={am.input} value={String(form.resignationId ?? '')} onChange={(e) => setForm({ ...form, resignationId: e.target.value })}>
                  {caseOptions.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </label>
            )}
            <label className={am.label}>Earned Leave<input type="number" className={am.input} value={Number(form.earnedLeave ?? 0)} onChange={(e) => setForm({ ...form, earnedLeave: Number(e.target.value) })} /></label>
            <label className={am.label}>Casual Leave<input type="number" className={am.input} value={Number(form.casualLeave ?? 0)} onChange={(e) => setForm({ ...form, casualLeave: Number(e.target.value) })} /></label>
            <label className={am.label}>Sick Leave<input type="number" className={am.input} value={Number(form.sickLeave ?? 0)} onChange={(e) => setForm({ ...form, sickLeave: Number(e.target.value) })} /></label>
            <label className={am.label}>Comp-Off<input type="number" className={am.input} value={Number(form.compOff ?? 0)} onChange={(e) => setForm({ ...form, compOff: Number(e.target.value) })} /></label>
            <label className={am.label}>Encash Rate (₹/day)<input type="number" className={am.input} value={Number(form.encashRate ?? 1500)} onChange={(e) => setForm({ ...form, encashRate: Number(e.target.value) })} /></label>
          </div>
        )}

        {modal === 'interview' && (
          <div className="space-y-3">
            <label className={am.label}>Interview Date<input type="date" className={am.input} value={String(form.scheduledDate ?? '')} onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })} /></label>
            <label className={am.label}>Rehire Interest
              <select className={am.input} value={String(form.rehireInterest ?? '')} onChange={(e) => setForm({ ...form, rehireInterest: e.target.value })}>
                {['Yes', 'No', 'Maybe', 'Not Discussed'].map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </label>
            <label className={am.label}>HR Notes<textarea className={am.input} rows={3} value={String(form.hrNotes ?? '')} onChange={(e) => setForm({ ...form, hrNotes: e.target.value })} /></label>
          </div>
        )}

        {modal === 'alumni' && (
          <div className="space-y-3">
            <label className={am.label}>Rehire Eligibility
              <select className={am.input} value={String(form.rehireEligibility ?? '')} onChange={(e) => setForm({ ...form, rehireEligibility: e.target.value })}>
                {REHIRE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </label>
            <label className={am.label}>Notes<textarea className={am.input} rows={2} value={String(form.notes ?? '')} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
          </div>
        )}

        {modal === 'retention' && editId && !data?.retentions.find((t) => t.id === editId) && (
          <div className="space-y-3">
            <label className={am.label}>Retention Type
              <select className={am.input} value={String(form.retentionType ?? '')} onChange={(e) => setForm({ ...form, retentionType: e.target.value })}>
                {RETENTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
          </div>
        )}

        {modal === 'retention' && data?.retentions.find((t) => t.id === editId) && (
          <div className="space-y-3">
            <label className={am.label}>Status
              <select className={am.input} value={String(form.status ?? '')} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="CLOSED">Closed — Employee Retained</option>
                <option value="FAILED">Failed — Proceeding with Exit</option>
              </select>
            </label>
            <label className={am.label}>Notes<textarea className={am.input} rows={2} value={String(form.notes ?? '')} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
          </div>
        )}

        {modal === 'settings' && (
          <div className="space-y-3">
            {(['leaveEncashment', 'gratuity', 'noticePayRecovery', 'assetDamageRecovery', 'loanRecovery'] as const).map((key) => (
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
