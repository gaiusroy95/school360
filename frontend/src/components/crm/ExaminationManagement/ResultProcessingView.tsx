import { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2, Clock, Eye, Loader2, Lock, RefreshCw, RotateCcw, Send, Shield, Unlock,
} from 'lucide-react';
import {
  approveMarks,
  fetchPendingApprovals,
  fetchResultAuditTrail,
  fetchResultBatch,
  fetchResultBatches,
  fetchResultProcessingMeta,
  publishAllResults,
  publishResults,
  reopenMarks,
  returnMarksToTeacher,
  scheduleResultPublication,
  seedResultProcessing,
  type AuditLogEntry,
  type MarkingSheetApproval,
  type ResultBatch,
} from '../../../lib/examinationServices';
import { AcademicLoading, AcademicModal, AcademicPageHeader, AcademicPageShell, am } from '../AcademicManagement/AcademicManagementUi';

type Tab = 'approval' | 'compilation' | 'publication' | 'audit';

const STATUS_COLORS: Record<string, string> = {
  SUBMITTED: 'bg-amber-100 text-amber-800',
  LOCKED: 'bg-emerald-100 text-emerald-800',
  RETURNED: 'bg-red-100 text-red-800',
  COMPILED: 'bg-blue-100 text-blue-800',
  SCHEDULED: 'bg-purple-100 text-purple-800',
  PUBLISHED: 'bg-green-100 text-green-800',
};

export function ResultProcessingView() {
  const [tab, setTab] = useState<Tab>('approval');
  const [meta, setMeta] = useState<Awaited<ReturnType<typeof fetchResultProcessingMeta>> | null>(null);
  const [approvals, setApprovals] = useState<MarkingSheetApproval[]>([]);
  const [batches, setBatches] = useState<ResultBatch[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<Awaited<ReturnType<typeof fetchResultBatch>> | null>(null);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [actionModal, setActionModal] = useState<{ type: 'return' | 'reopen'; sheet: MarkingSheetApproval } | null>(null);
  const [reason, setReason] = useState('');
  const [scheduleModal, setScheduleModal] = useState<ResultBatch | null>(null);
  const [scheduleAt, setScheduleAt] = useState('');

  const load = useCallback(async (year?: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      let m = meta;
      if (!m) {
        m = await fetchResultProcessingMeta();
        setMeta(m);
        setAcademicYear(m.defaultAcademicYear);
      }
      const yearFilter = year || academicYear || m.defaultAcademicYear;
      let approvalData = await fetchPendingApprovals(yearFilter);
      if (!approvalData.sheets.length) {
        await seedResultProcessing(yearFilter);
        approvalData = await fetchPendingApprovals(yearFilter);
      }
      const [batchData, auditData] = await Promise.all([
        fetchResultBatches(yearFilter),
        fetchResultAuditTrail({ limit: 30 }),
      ]);
      setApprovals(approvalData.sheets);
      setBatches(batchData.batches);
      setAuditLogs(auditData.logs);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [meta, academicYear]);

  useEffect(() => { void load(); }, [load]);

  const handleApprove = async (sheet: MarkingSheetApproval) => {
    setActionLoading(true);
    try {
      const result = await approveMarks(sheet.id);
      setSuccessMsg(result.message);
      await load(academicYear);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Approval failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAction = async () => {
    if (!actionModal || !reason.trim()) return;
    setActionLoading(true);
    try {
      const result = actionModal.type === 'return'
        ? await returnMarksToTeacher(actionModal.sheet.id, reason)
        : await reopenMarks(actionModal.sheet.id, reason);
      setSuccessMsg(result.message);
      setActionModal(null);
      setReason('');
      await load(academicYear);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePublish = async (batch: ResultBatch) => {
    setActionLoading(true);
    try {
      const result = await publishResults(batch.id);
      setSuccessMsg(result.message);
      await load(academicYear);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Publish failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePublishAll = async () => {
    setActionLoading(true);
    try {
      const result = await publishAllResults(academicYear);
      setSuccessMsg(result.message);
      await load(academicYear);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Publish all failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSchedule = async () => {
    if (!scheduleModal || !scheduleAt) return;
    setActionLoading(true);
    try {
      const result = await scheduleResultPublication(scheduleModal.id, new Date(scheduleAt).toISOString());
      setSuccessMsg(result.message);
      setScheduleModal(null);
      await load(academicYear);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Schedule failed');
    } finally {
      setActionLoading(false);
    }
  };

  const viewBatch = async (batch: ResultBatch) => {
    setActionLoading(true);
    try {
      setSelectedBatch(await fetchResultBatch(batch.id));
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load batch');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !approvals.length) {
    return <AcademicPageShell><AcademicLoading label="Loading result processing…" /></AcademicPageShell>;
  }

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="Examination Management › Result Processing"
        title="Result Processing"
        subtitle="Principal verification, result compilation, publication & parent notifications with full audit trail"
        actions={(
          <div className="flex flex-wrap gap-2">
            <select className={am.select} value={academicYear} onChange={(e) => { setAcademicYear(e.target.value); void load(e.target.value); }}>
              {(meta?.academicYears || [academicYear]).map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <button type="button" className={am.btnSecondary} onClick={() => void load(academicYear)}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        )}
      />

      <div className={am.content}>
        {errorMsg && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{errorMsg}</p>}
        {successMsg && (
          <p className="text-xs text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
            {successMsg}
            <button type="button" className="ml-2 underline" onClick={() => setSuccessMsg(null)}>Dismiss</button>
          </p>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className={`${am.card} ${am.cardPad}`}>
            <p className="text-[10px] font-bold text-amber-600 uppercase">Pending Approval</p>
            <p className="text-2xl font-bold">{meta?.summary.pendingApproval ?? 0}</p>
          </div>
          <div className={`${am.card} ${am.cardPad}`}>
            <p className="text-[10px] font-bold text-blue-600 uppercase">Compiled</p>
            <p className="text-2xl font-bold">{meta?.summary.compiled ?? 0}</p>
          </div>
          <div className={`${am.card} ${am.cardPad}`}>
            <p className="text-[10px] font-bold text-green-600 uppercase">Published</p>
            <p className="text-2xl font-bold">{meta?.summary.published ?? 0}</p>
          </div>
          <div className={`${am.card} ${am.cardPad}`}>
            <p className="text-[10px] font-bold text-slate-500 uppercase">Audit Logs</p>
            <p className="text-2xl font-bold">{auditLogs.length}</p>
          </div>
        </div>

        <div className="flex gap-1 border-b border-slate-200">
          {([
            ['approval', 'Principal Verification'],
            ['compilation', 'Result Compilation'],
            ['publication', 'Publication'],
            ['audit', 'Audit Trail'],
          ] as const).map(([id, label]) => (
            <button key={id} type="button" onClick={() => setTab(id)}
              className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px ${tab === id ? 'border-amber-400 text-slate-900' : 'border-transparent text-slate-500'}`}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'approval' && (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead>
                <tr>
                  <th className={am.th}>Subject / Class</th>
                  <th className={am.th}>Teacher</th>
                  <th className={am.th}>Status</th>
                  <th className={am.th}>Submitted</th>
                  <th className={am.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {approvals.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50">
                    <td className={am.td}>
                      <p className="font-semibold text-sm">{s.subjectName}</p>
                      <p className="text-xs text-slate-400">{s.classGroup}</p>
                    </td>
                    <td className={am.td}>{s.teacherName}</td>
                    <td className={am.td}>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${STATUS_COLORS[s.status] || ''}`}>{s.status}</span>
                      {s.isLocked && <Lock size={12} className="inline ml-1 text-emerald-600" />}
                    </td>
                    <td className={`${am.td} text-xs`}>{s.submittedAt ? new Date(s.submittedAt).toLocaleString() : '—'}</td>
                    <td className={am.td}>
                      <div className="flex flex-wrap gap-1">
                        {s.canApprove && (
                          <button type="button" disabled={actionLoading} onClick={() => void handleApprove(s)}
                            className={`${am.btnPrimary} text-xs py-1 px-2`}>
                            <Shield size={12} /> Approve
                          </button>
                        )}
                        {s.canReturn && (
                          <button type="button" onClick={() => setActionModal({ type: 'return', sheet: s })}
                            className={`${am.btnSecondary} text-xs py-1 px-2`}>
                            <RotateCcw size={12} /> Return
                          </button>
                        )}
                        {s.canReopen && (
                          <button type="button" onClick={() => setActionModal({ type: 'reopen', sheet: s })}
                            className={`${am.btnSecondary} text-xs py-1 px-2`}>
                            <Unlock size={12} /> Reopen
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!approvals.length && (
                  <tr><td colSpan={5} className={`${am.td} text-center text-slate-400`}>No marking sheets yet. Submit marks from Marks Entry first.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'compilation' && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Results auto-compile when all subject teachers have submitted and the Principal has approved all marks for a class.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {batches.map((b) => (
                <div key={b.id} className={`${am.card} ${am.cardPad}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">{b.classGroup}</p>
                      <p className="text-xs text-slate-500">{b.examinationName}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[b.status] || ''}`}>{b.status}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-3 text-center text-xs">
                    <div><p className="font-bold text-lg">{b.totalStudents}</p><p className="text-slate-500">Students</p></div>
                    <div><p className="font-bold text-lg">{b.averagePercent}%</p><p className="text-slate-500">Average</p></div>
                    <div><p className="font-bold text-lg">{b.passPercent}%</p><p className="text-slate-500">Pass Rate</p></div>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">{b.subjectsApproved}/{b.subjectsTotal} subjects approved</p>
                  <button type="button" className={`${am.btnSecondary} text-xs mt-2`} onClick={() => void viewBatch(b)}>
                    <Eye size={12} /> View Compiled Results
                  </button>
                </div>
              ))}
              {!batches.length && <p className="text-slate-400 text-sm">No compiled results yet.</p>}
            </div>
          </div>
        )}

        {tab === 'publication' && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <button type="button" className={am.btnPrimary} disabled={actionLoading} onClick={() => void handlePublishAll()}>
                <Send size={14} /> Publish All Compiled Classes
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Results remain confidential until published. Parents receive push, WhatsApp, SMS & email with secure report card links.
            </p>
            <div className={am.tableWrap}>
              <table className="w-full">
                <thead>
                  <tr>
                    <th className={am.th}>Class</th>
                    <th className={am.th}>Status</th>
                    <th className={am.th}>Students</th>
                    <th className={am.th}>Scheduled</th>
                    <th className={am.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((b) => (
                    <tr key={b.id}>
                      <td className={am.td}>{b.classGroup}</td>
                      <td className={am.td}>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[b.status] || ''}`}>{b.status}</span>
                      </td>
                      <td className={am.td}>{b.totalStudents}</td>
                      <td className={`${am.td} text-xs`}>
                        {b.scheduledPublishAt ? new Date(b.scheduledPublishAt).toLocaleString() : '—'}
                      </td>
                      <td className={am.td}>
                        <div className="flex gap-1">
                          {b.canPublish && (
                            <>
                              <button type="button" disabled={actionLoading} onClick={() => void handlePublish(b)}
                                className={`${am.btnPrimary} text-xs py-1 px-2`}>
                                <Send size={12} /> Publish
                              </button>
                              <button type="button" onClick={() => setScheduleModal(b)}
                                className={`${am.btnSecondary} text-xs py-1 px-2`}>
                                <Clock size={12} /> Schedule
                              </button>
                            </>
                          )}
                          {b.isPublished && (
                            <span className="text-xs text-green-700 flex items-center gap-1">
                              <CheckCircle2 size={12} /> Published
                            </span>
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

        {tab === 'audit' && (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead>
                <tr>
                  <th className={am.th}>Time</th>
                  <th className={am.th}>Action</th>
                  <th className={am.th}>Entity</th>
                  <th className={am.th}>Actor</th>
                  <th className={am.th}>Details</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td className={`${am.td} text-xs`}>{new Date(log.createdAt).toLocaleString()}</td>
                    <td className={am.td}><span className="text-xs font-bold">{log.action}</span></td>
                    <td className={`${am.td} text-xs`}>{log.entityType}</td>
                    <td className={`${am.td} text-xs`}>{log.actor}</td>
                    <td className={`${am.td} text-xs text-slate-500`}>{log.details}</td>
                  </tr>
                ))}
                {!auditLogs.length && (
                  <tr><td colSpan={5} className={`${am.td} text-center text-slate-400`}>No audit logs yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AcademicModal open={!!actionModal} onClose={() => setActionModal(null)}
        title={actionModal?.type === 'return' ? 'Return to Teacher' : 'Reopen Marks (Audit Trail)'}>
        <p className="text-sm text-slate-600 mb-3">
          {actionModal?.type === 'return'
            ? 'Marks will be returned to the teacher for correction.'
            : 'Controlled re-opening — this action is logged in the audit trail.'}
        </p>
        <textarea className={am.input} rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (required)" />
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className={am.btnSecondary} onClick={() => setActionModal(null)}>Cancel</button>
          <button type="button" className={am.btnPrimary} disabled={!reason.trim() || actionLoading} onClick={() => void handleAction()}>
            Confirm
          </button>
        </div>
      </AcademicModal>

      <AcademicModal open={!!scheduleModal} onClose={() => setScheduleModal(null)} title="Schedule Automatic Publication">
        <label className="block">
          <span className="text-xs text-slate-600">Publish Date & Time</span>
          <input type="datetime-local" className={am.input} value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} />
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className={am.btnSecondary} onClick={() => setScheduleModal(null)}>Cancel</button>
          <button type="button" className={am.btnPrimary} disabled={!scheduleAt || actionLoading} onClick={() => void handleSchedule()}>
            Schedule
          </button>
        </div>
      </AcademicModal>

      <AcademicModal open={!!selectedBatch} onClose={() => setSelectedBatch(null)} title="Compiled Results" large>
        {selectedBatch && (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            <p className="text-sm font-semibold">{selectedBatch.batch.classGroup} — {selectedBatch.batch.examinationName}</p>
            <div className={am.tableWrap}>
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className={am.th}>Rank</th>
                    <th className={am.th}>Student</th>
                    <th className={am.th}>Total</th>
                    <th className={am.th}>%</th>
                    <th className={am.th}>Grade</th>
                    <th className={am.th}>GPA</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedBatch.results.map((r) => (
                    <tr key={r.admissionNumber}>
                      <td className={am.td}>{r.rank}</td>
                      <td className={am.td}>{r.studentName}</td>
                      <td className={am.td}>{r.totalObtained}/{r.totalMax}</td>
                      <td className={am.td}>{r.percentage}%</td>
                      <td className={am.td}>{r.grade}</td>
                      <td className={am.td}>{r.gpa}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </AcademicModal>
    </AcademicPageShell>
  );
}
