import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, Clock, FileText, IndianRupee, Loader2,
  Plus, RefreshCw, RotateCcw, Send, XCircle,
} from 'lucide-react';
import {
  BackPaperExam,
  completeRevaluationReview,
  createBackPaperExam,
  createRevaluationRequest,
  enterBackPaperMarks,
  fetchBackPaperExams,
  fetchEligibleForRevaluation,
  fetchFailedStudentsForBackPaper,
  fetchRevaluationMeta,
  fetchRevaluationRequests,
  payRevaluationFee,
  publishBackPaperResult,
  publishRevaluationResult,
  seedRevaluation,
  startRevaluationReview,
  type RevaluationRequest,
  type RevaluationRequestType,
} from '../../../lib/examinationServices';
import { AcademicLoading, AcademicModal, AcademicPageHeader, AcademicPageShell, am } from '../AcademicManagement/AcademicManagementUi';

type Tab = 'requests' | 'new' | 'review' | 'publish' | 'backpaper';

const STATUS_COLORS: Record<string, string> = {
  RECEIVED: 'bg-slate-100 text-slate-700',
  FEE_PENDING: 'bg-amber-100 text-amber-800',
  FEE_PAID: 'bg-blue-100 text-blue-800',
  UNDER_REVIEW: 'bg-purple-100 text-purple-800',
  APPROVED: 'bg-indigo-100 text-indigo-800',
  COMPLETED: 'bg-cyan-100 text-cyan-800',
  PUBLISHED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  CREATED: 'bg-amber-100 text-amber-800',
  MARKS_ENTRY: 'bg-blue-100 text-blue-800',
};

export function RevaluationRecheckView() {
  const [tab, setTab] = useState<Tab>('requests');
  const [meta, setMeta] = useState<Awaited<ReturnType<typeof fetchRevaluationMeta>> | null>(null);
  const [requests, setRequests] = useState<RevaluationRequest[]>([]);
  const [backPapers, setBackPapers] = useState<BackPaperExam[]>([]);
  const [eligible, setEligible] = useState<Awaited<ReturnType<typeof fetchEligibleForRevaluation>>['eligible']>([]);
  const [failedStudents, setFailedStudents] = useState<Awaited<ReturnType<typeof fetchFailedStudentsForBackPaper>>['failed']>([]);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [feeModal, setFeeModal] = useState<RevaluationRequest | null>(null);
  const [feeReceipt, setFeeReceipt] = useState('');
  const [feeMode, setFeeMode] = useState('CASH');
  const [reviewModal, setReviewModal] = useState<RevaluationRequest | null>(null);
  const [revisedMarks, setRevisedMarks] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [marksModal, setMarksModal] = useState<BackPaperExam | null>(null);
  const [newMarks, setNewMarks] = useState('');

  const load = useCallback(async (year?: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      let m = meta;
      if (!m) {
        m = await fetchRevaluationMeta();
        setMeta(m);
        setAcademicYear(m.defaultAcademicYear);
      }
      const yearFilter = year || academicYear || m.defaultAcademicYear;
      let reqData = await fetchRevaluationRequests({ academicYear: yearFilter, status: statusFilter });
      if (!reqData.requests.length) {
        await seedRevaluation(yearFilter);
        reqData = await fetchRevaluationRequests({ academicYear: yearFilter, status: statusFilter });
      }
      const [bpData, eligData, failData] = await Promise.all([
        fetchBackPaperExams({ academicYear: yearFilter }),
        fetchEligibleForRevaluation({ academicYear: yearFilter }),
        fetchFailedStudentsForBackPaper({ academicYear: yearFilter }),
      ]);
      setRequests(reqData.requests);
      setBackPapers(bpData.exams);
      setEligible(eligData.eligible);
      setFailedStudents(failData.failed);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [meta, academicYear, statusFilter]);

  useEffect(() => { void load(); }, [load]);

  const handleCreateRequest = async (
    studentResultId: string,
    subjectName: string,
    requestType: RevaluationRequestType,
  ) => {
    setActionLoading(true);
    try {
      const result = await createRevaluationRequest({ studentResultId, subjectName, requestType });
      setSuccessMsg(result.message);
      await load(academicYear);
      setTab('requests');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create request');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePayFee = async () => {
    if (!feeModal || !feeReceipt.trim()) return;
    setActionLoading(true);
    try {
      const result = await payRevaluationFee(feeModal.id, { feeReceiptNumber: feeReceipt, feePaymentMode: feeMode });
      setSuccessMsg(result.message);
      setFeeModal(null);
      setFeeReceipt('');
      await load(academicYear);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartReview = async (req: RevaluationRequest) => {
    setActionLoading(true);
    try {
      const result = await startRevaluationReview(req.id);
      setSuccessMsg(result.message);
      await load(academicYear);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteReview = async (approved: boolean) => {
    if (!reviewModal) return;
    setActionLoading(true);
    try {
      const result = await completeRevaluationReview(reviewModal.id, {
        revisedMarks: Number(revisedMarks),
        approved,
        rejectionReason: approved ? undefined : rejectReason,
      });
      setSuccessMsg(result.message);
      setReviewModal(null);
      setRevisedMarks('');
      setRejectReason('');
      await load(academicYear);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Review failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePublishRevaluation = async (req: RevaluationRequest) => {
    setActionLoading(true);
    try {
      const result = await publishRevaluationResult(req.id);
      setSuccessMsg(result.message);
      await load(academicYear);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Publish failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateBackPaper = async (studentResultId: string, subjectName: string) => {
    setActionLoading(true);
    try {
      const result = await createBackPaperExam({ studentResultId, subjectName });
      setSuccessMsg(result.message);
      await load(academicYear);
      setTab('backpaper');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEnterMarks = async () => {
    if (!marksModal || !newMarks.trim()) return;
    setActionLoading(true);
    try {
      const result = await enterBackPaperMarks(marksModal.id, { newMarks: Number(newMarks) });
      setSuccessMsg(result.message);
      setMarksModal(null);
      setNewMarks('');
      await load(academicYear);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePublishBackPaper = async (exam: BackPaperExam) => {
    setActionLoading(true);
    try {
      const result = await publishBackPaperResult(exam.id);
      setSuccessMsg(result.message);
      await load(academicYear);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Publish failed');
    } finally {
      setActionLoading(false);
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'requests', label: 'All Requests' },
    { id: 'new', label: 'New Request' },
    { id: 'review', label: 'Review' },
    { id: 'publish', label: 'Publish Results' },
    { id: 'backpaper', label: 'Back Paper Exams' },
  ];

  const completedRequests = requests.filter((r) => r.status === 'COMPLETED');
  const reviewRequests = requests.filter((r) => ['FEE_PAID', 'UNDER_REVIEW'].includes(r.status));

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="Examination Management › Revaluation / Recheck"
        title="Revaluation / Recheck"
        subtitle="30-day grace period from result date · additional fee required · revised results published from here only"
        actions={(
          <div className="flex items-center gap-2">
            <select value={academicYear} onChange={(e) => { setAcademicYear(e.target.value); void load(e.target.value); }} className={am.select}>
              {(meta?.academicYears || [academicYear]).map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <button type="button" onClick={() => void load()} className={am.btnSecondary}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        )}
      />

      {errorMsg && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
          <XCircle size={16} /> {errorMsg}
          <button type="button" onClick={() => setErrorMsg(null)} className="ml-auto text-xs underline">Dismiss</button>
        </div>
      )}
      {successMsg && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          <CheckCircle2 size={16} /> {successMsg}
          <button type="button" onClick={() => setSuccessMsg(null)} className="ml-auto text-xs underline">Dismiss</button>
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: 'Received', value: meta?.summary.received ?? 0, color: 'text-blue-600' },
          { label: 'Under Review', value: meta?.summary.underReview ?? 0, color: 'text-purple-600' },
          { label: 'Approved', value: meta?.summary.approved ?? 0, color: 'text-indigo-600' },
          { label: 'Rejected', value: meta?.summary.rejected ?? 0, color: 'text-red-600' },
          { label: 'Published', value: meta?.summary.published ?? 0, color: 'text-green-600' },
          { label: 'Back Papers', value: meta?.summary.backPapers ?? 0, color: 'text-orange-600' },
        ].map((k) => (
          <div key={k.label} className={`${am.card} ${am.cardPad}`}>
            <p className="text-[10px] text-slate-500">{k.label}</p>
            <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-2 text-xs text-blue-800">
        <Clock size={14} />
        <span>
          <strong>Grace Period:</strong> {meta?.config.gracePeriodDays ?? 30} days from result publication date
          &nbsp;|&nbsp; Revaluation Fee: ₹{meta?.config.revaluationFee ?? 500}
          &nbsp;|&nbsp; Recheck Fee: ₹{meta?.config.recheckFee ?? 300}
        </span>
      </div>

      <div className="mb-4 flex flex-wrap gap-1 border-b border-slate-200 pb-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-t-lg px-4 py-2 text-xs font-medium transition-colors ${
              tab === t.id ? 'border-b-2 border-blue-600 bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? <AcademicLoading /> : (
        <>
          {tab === 'requests' && (
            <div className={`${am.card} ${am.cardPad}`}>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800">All Revaluation / Recheck Requests</h3>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={am.select}>
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="UNDER_REVIEW">Under Review</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] uppercase text-slate-500">
                      <th className={am.th}>ID</th>
                      <th className={am.th}>Student</th>
                      <th className={am.th}>Subject</th>
                      <th className={am.th}>Type</th>
                      <th className={am.th}>Original</th>
                      <th className={am.th}>Revised</th>
                      <th className={am.th}>Fee</th>
                      <th className={am.th}>Grace</th>
                      <th className={am.th}>Status</th>
                      <th className={am.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((r) => (
                      <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className={am.td}>{r.recordId}</td>
                        <td className={am.td}>
                          <div className="font-medium">{r.studentName}</div>
                          <div className="text-[10px] text-slate-500">{r.classGroup}</div>
                        </td>
                        <td className={am.td}>{r.subjectName}</td>
                        <td className={am.td}>{r.requestType}</td>
                        <td className={am.td}>{r.originalMarks}/{r.originalMaxMarks} ({r.originalGrade})</td>
                        <td className={am.td}>
                          {r.revisedMarks !== null ? `${r.revisedMarks}/${r.revisedMaxMarks} (${r.revisedGrade})` : '—'}
                        </td>
                        <td className={am.td}>
                          {r.feePaid ? (
                            <span className="text-emerald-600">₹{r.feeAmount} ✓</span>
                          ) : (
                            <span className="text-amber-600">₹{r.feeAmount}</span>
                          )}
                        </td>
                        <td className={am.td}>
                          {r.withinGracePeriod ? (
                            <span className="text-emerald-600">{r.daysLeftInGrace}d left</span>
                          ) : (
                            <span className="text-red-600">Expired</span>
                          )}
                        </td>
                        <td className={am.td}>
                          <span className={`rounded px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[r.status] || ''}`}>
                            {r.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className={am.td}>
                          <div className="flex flex-wrap gap-1">
                            {r.canPayFee && !r.feePaid && (
                              <button type="button" onClick={() => setFeeModal(r)} className="text-blue-600 hover:underline">
                                <IndianRupee size={10} className="inline" /> Pay
                              </button>
                            )}
                            {r.status === 'FEE_PAID' && (
                              <button type="button" onClick={() => void handleStartReview(r)} className="text-purple-600 hover:underline">Review</button>
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

          {tab === 'new' && (
            <div className={`${am.card} ${am.cardPad}`}>
              <h3 className="mb-3 text-sm font-semibold text-slate-800">New Revaluation / Recheck Request</h3>
              <p className="mb-4 text-xs text-slate-500">
                Students eligible within the {meta?.config.gracePeriodDays ?? 30}-day grace period from result publication.
              </p>
              {eligible.length === 0 ? (
                <p className="text-xs text-slate-400">No eligible students within grace period. Publish results first.</p>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {eligible.slice(0, 50).map((e) => (
                    <div key={`${e.studentResultId}-${e.subjectName}`} className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
                      <div>
                        <p className="text-xs font-medium">{e.studentName} — {e.subjectName}</p>
                        <p className="text-[10px] text-slate-500">
                          {e.className} {e.sectionName} · {e.obtained}/{e.max} ({e.grade}) · {Math.max(0, Math.ceil((new Date(e.gracePeriodEndsAt).getTime() - Date.now()) / 86400000))}d left
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => void handleCreateRequest(e.studentResultId, e.subjectName, 'REVALUATION')}
                          className={am.btnPrimary}
                        >
                          <Plus size={12} /> Revaluation (₹{e.revaluationFee})
                        </button>
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => void handleCreateRequest(e.studentResultId, e.subjectName, 'RECHECK')}
                          className={am.btnSecondary}
                        >
                          Recheck (₹{e.recheckFee})
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'review' && (
            <div className={`${am.card} ${am.cardPad}`}>
              <h3 className="mb-3 text-sm font-semibold text-slate-800">Under Review</h3>
              {reviewRequests.length === 0 ? (
                <p className="text-xs text-slate-400">No requests pending review.</p>
              ) : (
                <div className="space-y-2">
                  {reviewRequests.map((r) => (
                    <div key={r.id} className="flex items-center justify-between rounded-lg border border-purple-200 bg-purple-50 px-4 py-3">
                      <div>
                        <p className="text-xs font-medium text-purple-900">{r.studentName} — {r.subjectName} ({r.requestType})</p>
                        <p className="text-[10px] text-purple-700">
                          Original: {r.originalMarks}/{r.originalMaxMarks} ({r.originalGrade}) · Fee: ₹{r.feeAmount} paid
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setReviewModal(r); setRevisedMarks(String(r.originalMarks)); }}
                        className={am.btnPrimary}
                      >
                        <FileText size={12} /> Enter Revised Marks
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'publish' && (
            <div className={`${am.card} ${am.cardPad}`}>
              <div className="mb-3 flex items-center gap-2">
                <Send size={16} className="text-green-600" />
                <h3 className="text-sm font-semibold text-slate-800">Publish Revised Results</h3>
              </div>
              <p className="mb-4 text-xs text-slate-500">
                Revaluation results must be published from this module only. This updates the student&apos;s official result record.
              </p>
              {completedRequests.length === 0 ? (
                <p className="text-xs text-slate-400">No completed revaluations ready to publish.</p>
              ) : (
                <div className="space-y-2">
                  {completedRequests.map((r) => (
                    <div key={r.id} className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-3">
                      <div>
                        <p className="text-xs font-medium text-green-900">{r.studentName} — {r.subjectName}</p>
                        <p className="text-[10px] text-green-700">
                          {r.originalMarks} → <strong>{r.revisedMarks}</strong> ({r.revisedGrade})
                        </p>
                      </div>
                      <button type="button" onClick={() => void handlePublishRevaluation(r)} disabled={actionLoading} className={am.btnPrimary}>
                        <Send size={12} /> Publish Result
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'backpaper' && (
            <div className="space-y-4">
              <div className={`${am.card} ${am.cardPad}`}>
                <h3 className="mb-3 text-sm font-semibold text-slate-800">Create Back Paper Exam (Failed Students)</h3>
                {failedStudents.length === 0 ? (
                  <p className="text-xs text-slate-400">No failed subject records found.</p>
                ) : (
                  <div className="space-y-2 max-h-[250px] overflow-y-auto">
                    {failedStudents.slice(0, 30).map((f) => (
                      <div key={`${f.studentResultId}-${f.subjectName}`} className="flex items-center justify-between rounded-lg border border-orange-200 bg-orange-50 px-4 py-2">
                        <div>
                          <p className="text-xs font-medium">{f.studentName} — {f.subjectName}</p>
                          <p className="text-[10px] text-orange-700">{f.obtained}/{f.max} (need {f.passingMarks}) · {f.className} {f.sectionName}</p>
                        </div>
                        <button type="button" onClick={() => void handleCreateBackPaper(f.studentResultId, f.subjectName)} disabled={actionLoading} className={am.btnSecondary}>
                          <Plus size={12} /> Create Exam
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className={`${am.card} ${am.cardPad}`}>
                <h3 className="mb-3 text-sm font-semibold text-slate-800">Back Paper Exams — Marks Entry & Publish</h3>
                {backPapers.length === 0 ? (
                  <p className="text-xs text-slate-400">No back paper exams created yet.</p>
                ) : (
                  <div className="space-y-2">
                    {backPapers.map((bp) => (
                      <div key={bp.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
                        <div>
                          <p className="text-xs font-medium">{bp.studentName} — {bp.subjectName}</p>
                          <p className="text-[10px] text-slate-500">
                            {bp.recordId} · Original: {bp.originalMarks}/{bp.originalMaxMarks}
                            {bp.newMarks !== null && ` · New: ${bp.newMarks}/${bp.newMaxMarks} (${bp.newGrade})`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`rounded px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[bp.status]}`}>{bp.status}</span>
                          {bp.canEnterMarks && bp.newMarks === null && (
                            <button type="button" onClick={() => { setMarksModal(bp); setNewMarks(''); }} className={am.btnSecondary}>
                              Enter Marks
                            </button>
                          )}
                          {bp.canPublish && (
                            <button type="button" onClick={() => void handlePublishBackPaper(bp)} disabled={actionLoading} className={am.btnPrimary}>
                              <Send size={12} /> Publish
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      <AcademicModal open={Boolean(feeModal)} onClose={() => setFeeModal(null)} title="Record Fee Payment">
        {feeModal && (
          <div className="space-y-3 text-sm">
            <p>Fee: <strong>₹{feeModal.feeAmount}</strong> for {feeModal.requestType} — {feeModal.subjectName}</p>
            <div>
              <label className="mb-1 block text-xs text-slate-600">Receipt Number</label>
              <input type="text" value={feeReceipt} onChange={(e) => setFeeReceipt(e.target.value)} className={am.input} placeholder="RCP-001" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-600">Payment Mode</label>
              <select value={feeMode} onChange={(e) => setFeeMode(e.target.value)} className={am.select}>
                <option value="CASH">Cash</option>
                <option value="UPI">UPI</option>
                <option value="CARD">Card</option>
                <option value="ONLINE">Online</option>
              </select>
            </div>
            <button type="button" onClick={() => void handlePayFee()} disabled={actionLoading} className={am.btnPrimary}>
              {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <IndianRupee size={14} />} Record Payment
            </button>
          </div>
        )}
      </AcademicModal>

      <AcademicModal open={Boolean(reviewModal)} onClose={() => setReviewModal(null)} title="Complete Revaluation Review">
        {reviewModal && (
          <div className="space-y-3 text-sm">
            <p>{reviewModal.studentName} — {reviewModal.subjectName}</p>
            <p className="text-xs text-slate-500">Original: {reviewModal.originalMarks}/{reviewModal.originalMaxMarks} ({reviewModal.originalGrade})</p>
            <div>
              <label className="mb-1 block text-xs text-slate-600">Revised Marks</label>
              <input type="number" value={revisedMarks} onChange={(e) => setRevisedMarks(e.target.value)} className={am.input} />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => void handleCompleteReview(true)} disabled={actionLoading} className={am.btnPrimary}>
                <CheckCircle2 size={14} /> Approve
              </button>
              <button type="button" onClick={() => void handleCompleteReview(false)} disabled={actionLoading} className={am.btnSecondary}>
                <XCircle size={14} /> Reject
              </button>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-600">Rejection Reason (if rejecting)</label>
              <input type="text" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className={am.input} />
            </div>
          </div>
        )}
      </AcademicModal>

      <AcademicModal open={Boolean(marksModal)} onClose={() => setMarksModal(null)} title="Enter Back Paper Marks">
        {marksModal && (
          <div className="space-y-3 text-sm">
            <p>{marksModal.studentName} — {marksModal.subjectName}</p>
            <p className="text-xs text-slate-500">Passing marks: {marksModal.passingMarks} / {marksModal.originalMaxMarks}</p>
            <div>
              <label className="mb-1 block text-xs text-slate-600">Marks Obtained</label>
              <input type="number" value={newMarks} onChange={(e) => setNewMarks(e.target.value)} className={am.input} />
            </div>
            <button type="button" onClick={() => void handleEnterMarks()} disabled={actionLoading} className={am.btnPrimary}>
              Save Marks
            </button>
          </div>
        )}
      </AcademicModal>
    </AcademicPageShell>
  );
}
