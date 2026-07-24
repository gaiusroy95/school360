import { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2, ChevronRight, DoorOpen, RefreshCw, Shield, Users,
} from 'lucide-react';
import {
  advanceExitWorkflow,
  approveExitClearance,
  approveExitFnf,
  completeExitHandover,
  fetchExitDashboard,
  processExitApproval,
  recoverExitAsset,
  submitExitResignation,
  type ExitDashboard,
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
  'Resignations',
  'Approvals',
  'Notice Period',
  'Handover',
  'Knowledge Transfer',
  'Clearance',
  'Asset Recovery',
  'Payroll & F&F',
  'Leave Encashment',
  'Exit Interview',
  'Documents',
  'Analytics',
  'Alumni',
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

function ExitWorkflow({ workflow }: { workflow: ExitDashboard['workflow'] }) {
  return (
    <div className={`${am.card} p-6`}>
      <h3 className="font-bold text-slate-800 mb-4 text-center">End-to-End Exit Workflow</h3>
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

function LinearWorkflow({ title, steps }: { title: string; steps: { step: number; label: string }[] }) {
  return (
    <div className={`${am.card} p-4`}>
      <h3 className="font-bold text-slate-800 mb-3">{title}</h3>
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

function RoleMatrix({ roles }: { roles: { role: string; responsibilities: string }[] }) {
  return (
    <div className={`${am.card} p-4`}>
      <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
        <Shield size={16} /> Role-Based Access Matrix
      </h3>
      <div className={am.tableWrap}>
        <table className="w-full">
          <thead>
            <tr>
              <th className={am.th}>Role</th>
              <th className={am.th}>Responsibilities</th>
            </tr>
          </thead>
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

  const load = useCallback(async (seed = false) => {
    setLoading(true);
    try {
      setData(await fetchExitDashboard(seed));
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const roleMatrix = (data?.settings?.roleMatrix ?? []) as { role: string; responsibilities: string }[];

  if (loading && !data) return <AcademicLoading />;

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="HR & Payroll Management › Resignation & Exit"
        title="Staff Resignation, Exit Management & F&F Settlement (SEMS)"
        subtitle="Digital resignation workflow — approvals, notice period, handover, clearance, full & final settlement & alumni archival"
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
              <Kpi label="Total Cases" value={data.kpis.totalCases} />
              <Kpi label="Pending Approvals" value={data.kpis.pendingApprovals} />
              <Kpi label="In Notice Period" value={data.kpis.inNoticePeriod} />
              <Kpi label="Completed Exits" value={data.kpis.completedExits} />
              <Kpi label="Pending Clearances" value={data.kpis.pendingClearances} />
              <Kpi label="Pending F&F" value={data.kpis.pendingFnf} />
              <Kpi label="Attrition Rate" value={`${data.kpis.attritionRate}%`} />
              <Kpi label="Avg Notice (days)" value={data.analytics.avgNoticePeriod} />
            </div>
            <div className="grid lg:grid-cols-3 gap-4">
              <ExitWorkflow workflow={data.workflow} />
              <ModuleStructure modules={data.moduleStructure} />
              <div className="space-y-4">
                <LinearWorkflow title="Approval Workflow" steps={data.approvalWorkflow} />
                <LinearWorkflow title="Clearance Workflow" steps={data.clearanceWorkflow} />
              </div>
            </div>
            <RoleMatrix roles={roleMatrix} />
          </div>
        )}

        {tab === 'Resignations' && data && (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead>
                <tr>
                  <th className={am.th}>Case #</th>
                  <th className={am.th}>Employee</th>
                  <th className={am.th}>Department</th>
                  <th className={am.th}>Type</th>
                  <th className={am.th}>LWD</th>
                  <th className={am.th}>Notice</th>
                  <th className={am.th}>Handover</th>
                  <th className={am.th}>Clearance</th>
                  <th className={am.th}>Stage</th>
                  <th className={am.th}>Status</th>
                  <th className={am.th}>Actions</th>
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
                    <td className={am.td}>
                      {r.noticeDaysRemaining != null ? `${r.noticeDaysRemaining}d left` : `${r.noticePeriodDays}d`}
                    </td>
                    <td className={am.td}>{Number(r.handoverDone)}/{Number(r.handoverTotal)}</td>
                    <td className={am.td}>{Number(r.clearanceDone)}/{Number(r.clearanceTotal)}</td>
                    <td className={am.td}><span className="text-xs">{String(r.workflowStage).replace(/_/g, ' ')}</span></td>
                    <td className={am.td}><StatusBadge status={String(r.status)} /></td>
                    <td className={am.td}>
                      <div className="flex gap-1 flex-wrap">
                        {r.status === 'DRAFT' && (
                          <button type="button" title="Submit" onClick={async () => {
                            setBusy(true);
                            try { setData(await submitExitResignation(String(r.id))); setMessage('Resignation submitted'); }
                            finally { setBusy(false); }
                          }} className="text-xs text-amber-700 font-bold">Submit</button>
                        )}
                        <button type="button" title="Advance" onClick={async () => {
                          setBusy(true);
                          try { setData(await advanceExitWorkflow(String(r.id))); setMessage('Workflow advanced'); }
                          finally { setBusy(false); }
                        }} className="text-xs text-blue-700 font-bold">→</button>
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
                  <th className={am.th}>Case</th>
                  <th className={am.th}>Employee</th>
                  <th className={am.th}>Approver Role</th>
                  <th className={am.th}>Approver</th>
                  <th className={am.th}>Action</th>
                  <th className={am.th}>Remarks</th>
                  <th className={am.th}>Actions</th>
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
                          <button type="button" onClick={async () => {
                            setBusy(true);
                            try { setData(await processExitApproval(String(a.id), 'approve')); }
                            finally { setBusy(false); }
                          }} className="text-xs text-green-700 font-bold">✓</button>
                          <button type="button" onClick={async () => {
                            setBusy(true);
                            try { setData(await processExitApproval(String(a.id), 'reject')); }
                            finally { setBusy(false); }
                          }} className="text-xs text-red-700 font-bold">✗</button>
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
                  <th className={am.th}>Case</th>
                  <th className={am.th}>Employee</th>
                  <th className={am.th}>Notice Start</th>
                  <th className={am.th}>Notice End</th>
                  <th className={am.th}>Days Remaining</th>
                  <th className={am.th}>Status</th>
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
                        {r.noticeDaysRemaining ?? '—'} days
                      </span>
                    </td>
                    <td className={am.td}><StatusBadge status={String(r.status)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'Handover' && data && (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead>
                <tr>
                  <th className={am.th}>Case</th>
                  <th className={am.th}>Employee</th>
                  <th className={am.th}>Category</th>
                  <th className={am.th}>Task</th>
                  <th className={am.th}>Successor</th>
                  <th className={am.th}>Due</th>
                  <th className={am.th}>Status</th>
                  <th className={am.th}>Actions</th>
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
                      {h.status !== 'COMPLETED' && (
                        <button type="button" onClick={async () => {
                          setBusy(true);
                          try { setData(await completeExitHandover(String(h.id))); setMessage('Handover completed'); }
                          finally { setBusy(false); }
                        }} className="text-xs text-green-700 font-bold">Complete</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'Knowledge Transfer' && data && (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead>
                <tr>
                  <th className={am.th}>Case</th>
                  <th className={am.th}>Employee</th>
                  <th className={am.th}>Type</th>
                  <th className={am.th}>Description</th>
                  <th className={am.th}>Due</th>
                  <th className={am.th}>Status</th>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'Clearance' && data && (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead>
                <tr>
                  <th className={am.th}>Case</th>
                  <th className={am.th}>Employee</th>
                  <th className={am.th}>Department</th>
                  <th className={am.th}>Recovery</th>
                  <th className={am.th}>Pending Items</th>
                  <th className={am.th}>Status</th>
                  <th className={am.th}>Actions</th>
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
                        <button type="button" onClick={async () => {
                          setBusy(true);
                          try { setData(await approveExitClearance(String(c.id))); setMessage('Clearance approved'); }
                          finally { setBusy(false); }
                        }} className="text-xs text-green-700 font-bold">Approve</button>
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
                  <th className={am.th}>Case</th>
                  <th className={am.th}>Employee</th>
                  <th className={am.th}>Asset</th>
                  <th className={am.th}>Asset ID</th>
                  <th className={am.th}>Condition</th>
                  <th className={am.th}>Damage Cost</th>
                  <th className={am.th}>Status</th>
                  <th className={am.th}>Actions</th>
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
                      {a.status === 'PENDING' && (
                        <button type="button" onClick={async () => {
                          setBusy(true);
                          try { setData(await recoverExitAsset(String(a.id))); setMessage('Asset recovered'); }
                          finally { setBusy(false); }
                        }} className="text-xs text-green-700 font-bold">Recover</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'Payroll & F&F' && data && (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead>
                <tr>
                  <th className={am.th}>Case</th>
                  <th className={am.th}>Employee</th>
                  <th className={am.th}>Leave Encashment</th>
                  <th className={am.th}>Net F&F</th>
                  <th className={am.th}>Payment Date</th>
                  <th className={am.th}>Mode</th>
                  <th className={am.th}>Status</th>
                  <th className={am.th}>Actions</th>
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
                      {f.settlementStatus === 'CALCULATED' && (
                        <button type="button" onClick={async () => {
                          const caseId = data.resignations.find((r) => r.caseNumber === f.caseNumber)?.id;
                          if (!caseId) return;
                          setBusy(true);
                          try { setData(await approveExitFnf(String(caseId))); setMessage('F&F approved'); }
                          finally { setBusy(false); }
                        }} className="text-xs text-green-700 font-bold">Approve</button>
                      )}
                    </td>
                  </tr>
                ))}
                {data.fnfSettlements.length === 0 && (
                  <tr><td colSpan={8} className={`${am.td} text-center text-slate-400`}>Advance workflow to F&F calculation stage</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'Leave Encashment' && data && (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead>
                <tr>
                  <th className={am.th}>Case</th>
                  <th className={am.th}>Employee</th>
                  <th className={am.th}>Earned Leave</th>
                  <th className={am.th}>Casual</th>
                  <th className={am.th}>Sick</th>
                  <th className={am.th}>Comp-Off</th>
                  <th className={am.th}>Encashment</th>
                  <th className={am.th}>Recovery</th>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'Exit Interview' && data && (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead>
                <tr>
                  <th className={am.th}>Case</th>
                  <th className={am.th}>Employee</th>
                  <th className={am.th}>Scheduled</th>
                  <th className={am.th}>Rehire Interest</th>
                  <th className={am.th}>Status</th>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'Documents' && data && (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead>
                <tr>
                  <th className={am.th}>Case</th>
                  <th className={am.th}>Employee</th>
                  <th className={am.th}>Document</th>
                  <th className={am.th}>File</th>
                  <th className={am.th}>Digital Sign</th>
                  <th className={am.th}>QR</th>
                  <th className={am.th}>Status</th>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'Analytics' && data && (
          <div className="grid lg:grid-cols-2 gap-4">
            <div className={`${am.card} p-4`}>
              <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                <Users size={16} /> Department-wise Attrition
              </h3>
              {data.analytics.departmentAttrition.map((d) => (
                <div key={d.department} className="flex justify-between py-2 border-b border-slate-100 text-sm">
                  <span>{d.department}</span>
                  <span className="font-bold">{d.count}</span>
                </div>
              ))}
            </div>
            <div className={`${am.card} p-4`}>
              <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                <DoorOpen size={16} /> Resignation Types
              </h3>
              {data.analytics.resignationTypes.map((t) => (
                <div key={t.type} className="flex justify-between py-2 border-b border-slate-100 text-sm">
                  <span>{t.type}</span>
                  <span className="font-bold">{t.count}</span>
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
                  <th className={am.th}>Case</th>
                  <th className={am.th}>Employee</th>
                  <th className={am.th}>Rehire Eligibility</th>
                  <th className={am.th}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {data.alumniRecords.map((a) => (
                  <tr key={String(a.id)}>
                    <td className={am.td}>{String(a.caseNumber)}</td>
                    <td className={am.td}>{String(a.employeeName)}</td>
                    <td className={am.td}><StatusBadge status={String(a.rehireEligibility)} /></td>
                    <td className={am.td}>{String(a.notes) || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'Audit Trail' && data && (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead>
                <tr>
                  <th className={am.th}>Case</th>
                  <th className={am.th}>Action</th>
                  <th className={am.th}>Performed By</th>
                  <th className={am.th}>Timestamp</th>
                </tr>
              </thead>
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
              <h3 className="font-bold text-slate-800 mb-3">Workflow Automation</h3>
              {data.automationRules.map((rule) => (
                <p key={rule} className="flex items-start gap-2 text-sm text-slate-600 mb-1">
                  <CheckCircle2 size={14} className="text-green-600 shrink-0 mt-0.5" />
                  {rule}
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
          </div>
        )}
      </div>
    </AcademicPageShell>
  );
}
