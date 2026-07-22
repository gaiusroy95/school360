import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  DoorOpen,
  Loader2,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Send,
  User,
  X,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import {
  approveGatePass,
  completeGatePass,
  createGatePass,
  fetchGatePassMeta,
  fetchGatePasses,
  fetchGatePassStudents,
  issueGatePass,
  rejectGatePass,
  seedGatePassDemo,
  submitGatePassToPrincipal,
  type GatePassItem,
  type GatePassStatusFilter,
  type GatePassStudentOption,
  type GatePassType,
} from '../../../lib/attendanceServices';

function statusClass(status: GatePassItem['status']) {
  if (status === 'APPROVED' || status === 'ISSUED' || status === 'COMPLETED') return 'bg-emerald-100 text-emerald-700';
  if (status === 'REJECTED') return 'bg-red-100 text-red-700';
  if (status === 'AWAITING_PRINCIPAL') return 'bg-purple-100 text-purple-700';
  return 'bg-amber-100 text-amber-700';
}

function canApprove(role?: string) {
  return role === 'SUPER_ADMIN' || role === 'ADMIN';
}

function formatDateTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function GatePassView() {
  const { user } = useAuth();
  const isApprover = canApprove(user?.role);

  const [meta, setMeta] = useState<Awaited<ReturnType<typeof fetchGatePassMeta>> | null>(null);
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchGatePasses>> | null>(null);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [status, setStatus] = useState<GatePassStatusFilter>('all');
  const [className, setClassName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [adminRemarks, setAdminRemarks] = useState('');
  const [principalRemarks, setPrincipalRemarks] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [students, setStudents] = useState<GatePassStudentOption[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [createForm, setCreateForm] = useState({
    className: '',
    sectionName: '',
    studentId: '',
    passType: 'MID_CLASS' as GatePassType,
    reason: '',
    remarks: '',
    parentName: '',
    parentMobile: '',
    parentRelation: 'Parent',
  });

  const selected = useMemo(
    () => data?.items.find((i) => i.id === selectedId) || null,
    [data, selectedId],
  );

  const sectionOptions = useMemo(() => {
    if (!meta || !createForm.className) return [];
    return [...new Set(
      meta.classGroups
        .filter((g) => g.className === createForm.className)
        .map((g) => g.sectionName),
    )].sort();
  }, [meta, createForm.className]);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const m = await fetchGatePassMeta();
      setMeta(m);
      setAcademicYear(m.defaultAcademicYear);
      const res = await fetchGatePasses({
        academicYear: m.defaultAcademicYear,
        status,
        date,
        className: className || undefined,
        q: search || undefined,
      });
      setData(res);
      setSelectedId((prev) => prev && res.items.some((i) => i.id === prev) ? prev : res.items[0]?.id || null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load gate passes');
    } finally {
      setLoading(false);
    }
  }, [status, date, className, search]);

  const refresh = useCallback(async () => {
    try {
      const res = await fetchGatePasses({
        academicYear,
        status,
        date,
        className: className || undefined,
        q: search || undefined,
      });
      setData(res);
      setSelectedId((prev) => prev && res.items.some((i) => i.id === prev) ? prev : res.items[0]?.id || null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to refresh');
    }
  }, [academicYear, status, date, className, search]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!meta) return;
    void refresh();
  }, [academicYear, status, date, className]);

  useEffect(() => {
    if (!createOpen) return;
    if (!createForm.className) {
      setStudents([]);
      return;
    }
    setLoadingStudents(true);
    void fetchGatePassStudents({
      academicYear,
      className: createForm.className,
      sectionName: createForm.sectionName || undefined,
    })
      .then((res) => setStudents(res.students))
      .catch(() => setStudents([]))
      .finally(() => setLoadingStudents(false));
  }, [createOpen, academicYear, createForm.className, createForm.sectionName]);

  const handleStudentSelect = (studentId: string) => {
    const student = students.find((s) => s.id === studentId);
    setCreateForm((f) => ({
      ...f,
      studentId,
      parentName: student?.fatherName || student?.motherName || f.parentName,
      parentMobile: student?.fatherMobile || student?.motherMobile || f.parentMobile,
    }));
  };

  const handleCreate = async () => {
    if (!createForm.studentId || !createForm.reason.trim() || !createForm.parentName.trim()) {
      setErrorMsg('Please select student, enter reason and parent name');
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const item = await createGatePass({
        studentId: createForm.studentId,
        academicYear,
        passType: createForm.passType,
        reason: createForm.reason,
        remarks: createForm.remarks,
        parentName: createForm.parentName,
        parentMobile: createForm.parentMobile,
        parentRelation: createForm.parentRelation,
        source: 'FRONT_DESK',
      });
      setSuccessMsg(`Gate pass request created for ${item.studentName} (${item.passNumber})`);
      setCreateOpen(false);
      setCreateForm({
        className: '',
        sectionName: '',
        studentId: '',
        passType: 'MID_CLASS',
        reason: '',
        remarks: '',
        parentName: '',
        parentMobile: '',
        parentRelation: 'Parent',
      });
      await refresh();
      setSelectedId(item.id);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create gate pass');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitToPrincipal = async () => {
    if (!selected) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await submitGatePassToPrincipal(selected.id, adminRemarks);
      setSuccessMsg(`Gate pass ${selected.passNumber} sent to Principal for approval`);
      setAdminRemarks('');
      await refresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async () => {
    if (!selected) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await approveGatePass(selected.id, principalRemarks);
      setSuccessMsg(`Gate pass ${selected.passNumber} approved`);
      setPrincipalRemarks('');
      await refresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Approval failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selected || !rejectReason.trim()) {
      setErrorMsg('Rejection reason is required');
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await rejectGatePass(selected.id, rejectReason);
      setSuccessMsg(`Gate pass ${selected.passNumber} rejected`);
      setRejectOpen(false);
      setRejectReason('');
      await refresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Rejection failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleIssue = async () => {
    if (!selected) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await issueGatePass(selected.id);
      setSuccessMsg(`Gate pass ${selected.passNumber} issued — student may exit`);
      await refresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Issue failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = async () => {
    if (!selected) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await completeGatePass(selected.id);
      setSuccessMsg(`Gate pass ${selected.passNumber} marked as completed`);
      await refresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Complete failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await seedGatePassDemo(academicYear);
      await refresh();
      setSuccessMsg('Demo gate pass requests loaded');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Seed failed');
    } finally {
      setSeeding(false);
    }
  };

  const handlePrint = () => {
    if (!selected?.isPrintable) return;
    setPrintOpen(true);
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-slate-500">
        <Loader2 className="animate-spin mr-2" size={20} />
        Loading gate pass management...
      </div>
    );
  }

  return (
    <div className="space-y-4 p-1">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gate Pass</h1>
          <p className="text-slate-500 text-sm mt-1">
            {meta?.workflowNote || 'Parent visit gate pass — half-day or mid-class exit with principal approval'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={16} />
            New Gate Pass Request
          </button>
          <button
            type="button"
            onClick={() => void handleSeed()}
            disabled={seeding}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            {seeding ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            Load Demo Data
          </button>
          <button
            type="button"
            onClick={() => void refresh()}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          <CheckCircle2 size={16} />
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle size={16} />
          {errorMsg}
        </div>
      )}

      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { label: 'Total', value: data.summary.total, filter: 'all' as GatePassStatusFilter, color: 'text-slate-900' },
            { label: 'Pending', value: data.summary.pending, filter: 'pending' as GatePassStatusFilter, color: 'text-amber-600' },
            { label: 'Awaiting Principal', value: data.summary.awaitingPrincipal, filter: 'awaiting_principal' as GatePassStatusFilter, color: 'text-purple-600' },
            { label: 'Approved', value: data.summary.approved, filter: 'approved' as GatePassStatusFilter, color: 'text-green-600' },
            { label: 'Rejected', value: data.summary.rejected, filter: 'rejected' as GatePassStatusFilter, color: 'text-red-600' },
            { label: 'Issued', value: data.summary.issued, filter: 'issued' as GatePassStatusFilter, color: 'text-blue-600' },
            { label: 'Completed', value: data.summary.completed, filter: 'completed' as GatePassStatusFilter, color: 'text-emerald-600' },
          ].map((kpi) => (
            <button
              key={kpi.label}
              type="button"
              onClick={() => setStatus(kpi.filter)}
              className={`bg-white rounded-xl border border-slate-200 p-3 text-left hover:border-blue-200 transition-colors ${
                status === kpi.filter ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              <p className="text-xs text-slate-500 uppercase truncate">{kpi.label}</p>
              <p className={`text-xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
            </button>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs text-slate-500 block mb-1">Academic Year</label>
          <select
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
          >
            {(meta?.academicYears || ['2025-26']).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">Class</label>
          <select
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All Classes</option>
            {(meta?.classes || []).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as GatePassStatusFilter)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="awaiting_principal">Awaiting Principal</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="issued">Issued</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs text-slate-500 block mb-1">Search</label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void refresh(); }}
              placeholder="Student, pass #, parent, reason..."
              className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 min-h-[500px]">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-slate-100 font-semibold text-sm text-slate-800 flex items-center gap-2">
            <DoorOpen size={16} className="text-blue-600" />
            Gate Pass Requests ({data?.items.length ?? 0})
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-[600px]">
            {!data?.items.length ? (
              <p className="p-6 text-center text-slate-400 text-sm">No gate pass requests for selected filters</p>
            ) : data.items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedId(item.id)}
                className={`w-full text-left p-4 hover:bg-slate-50 transition-colors ${
                  selectedId === item.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 truncate">{item.studentName}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {item.classGroup} · {item.passTypeLabel}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {item.passNumber} · Parent: {item.parentName}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${statusClass(item.status)}`}>
                    {item.statusLabel}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 overflow-hidden">
          {!selected ? (
            <div className="flex items-center justify-center h-full min-h-[400px] text-slate-400">
              Select a gate pass request to manage
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-slate-900">{selected.studentName}</h2>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusClass(selected.status)}`}>
                      {selected.statusLabel}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500">{selected.passNumber} · {selected.classGroup}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selected.canSubmitToPrincipal && (
                    <button
                      type="button"
                      onClick={() => void handleSubmitToPrincipal()}
                      disabled={submitting}
                      className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                    >
                      {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                      Send to Principal
                    </button>
                  )}
                  {selected.canApprove && isApprover && (
                    <>
                      <button
                        type="button"
                        onClick={() => setRejectOpen(true)}
                        disabled={submitting}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm border border-red-200 text-red-700 rounded-lg hover:bg-red-50"
                      >
                        <X size={14} />
                        Reject
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleApprove()}
                        disabled={submitting}
                        className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                      >
                        {submitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                        Approve (Web Demo)
                      </button>
                    </>
                  )}
                  {selected.canIssue && (
                    <button
                      type="button"
                      onClick={() => void handleIssue()}
                      disabled={submitting}
                      className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      <DoorOpen size={14} />
                      Issue Pass
                    </button>
                  )}
                  {selected.canComplete && (
                    <button
                      type="button"
                      onClick={() => void handleComplete()}
                      disabled={submitting}
                      className="flex items-center gap-1.5 px-3 py-2 text-sm border border-emerald-200 text-emerald-700 rounded-lg hover:bg-emerald-50 disabled:opacity-50"
                    >
                      <CheckCircle2 size={14} />
                      Mark Exited
                    </button>
                  )}
                  {selected.isPrintable && (
                    <button
                      type="button"
                      onClick={handlePrint}
                      className="flex items-center gap-1.5 px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50"
                    >
                      <Printer size={14} />
                      Print
                    </button>
                  )}
                </div>
              </div>

              <div className="p-5 space-y-5 flex-1 overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <InfoField label="Admission No." value={selected.admissionNumber} />
                  <InfoField label="Roll No." value={selected.rollNumber || '—'} />
                  <InfoField label="Class / Section" value={selected.classGroup} />
                  <InfoField label="Pass Type" value={selected.passTypeLabel} />
                  <InfoField label="Parent / Guardian" value={selected.parentName} icon={<User size={12} />} />
                  <InfoField label="Parent Mobile" value={selected.parentMobile || '—'} />
                  <InfoField label="Relation" value={selected.parentRelation || '—'} />
                  <InfoField label="Created By" value={selected.createdBy} />
                  <InfoField label="Created At" value={formatDateTime(selected.createdAt)} icon={<Clock size={12} />} />
                  {selected.exitTime && (
                    <InfoField label="Exit Time" value={selected.exitTime} />
                  )}
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase mb-1">Reason</p>
                  <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">{selected.reason}</p>
                </div>

                {selected.remarks && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase mb-1">Remarks</p>
                    <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3 whitespace-pre-wrap">{selected.remarks}</p>
                  </div>
                )}

                {selected.canSubmitToPrincipal && (
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase block mb-1">
                      Admin Remarks (optional, sent with request)
                    </label>
                    <textarea
                      value={adminRemarks}
                      onChange={(e) => setAdminRemarks(e.target.value)}
                      rows={2}
                      placeholder="Notes for principal..."
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                )}

                {selected.canApprove && isApprover && (
                  <div className="bg-purple-50 border border-purple-100 rounded-lg p-3">
                    <p className="text-xs text-purple-700 mb-2">
                      Principal mobile approval will be available later. Use web approve for demo.
                    </p>
                    <label className="text-xs font-medium text-slate-500 uppercase block mb-1">
                      Principal Remarks (optional)
                    </label>
                    <textarea
                      value={principalRemarks}
                      onChange={(e) => setPrincipalRemarks(e.target.value)}
                      rows={2}
                      placeholder="Approval remarks..."
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                )}

                {selected.submittedBy && (
                  <div className="border-t border-slate-100 pt-4">
                    <p className="text-xs font-medium text-slate-500 uppercase mb-2">Submission</p>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <InfoField label="Submitted By" value={selected.submittedBy} />
                      <InfoField label="Submitted At" value={formatDateTime(selected.submittedAt)} />
                    </div>
                  </div>
                )}

                {selected.approvedBy && (
                  <div className="border-t border-slate-100 pt-4">
                    <p className="text-xs font-medium text-slate-500 uppercase mb-2">Approval</p>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <InfoField label="Approved By" value={selected.approvedBy} />
                      <InfoField label="Approved At" value={formatDateTime(selected.approvedAt)} />
                    </div>
                    {selected.principalRemarks && (
                      <p className="text-sm text-slate-600 mt-2 bg-green-50 rounded-lg p-3">{selected.principalRemarks}</p>
                    )}
                  </div>
                )}

                {selected.rejectedBy && (
                  <div className="border-t border-slate-100 pt-4">
                    <p className="text-xs font-medium text-slate-500 uppercase mb-2">Rejection</p>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <InfoField label="Rejected By" value={selected.rejectedBy} />
                      <InfoField label="Rejected At" value={formatDateTime(selected.rejectedAt)} />
                    </div>
                    {selected.rejectionReason && (
                      <p className="text-sm text-red-700 mt-2 bg-red-50 rounded-lg p-3">{selected.rejectionReason}</p>
                    )}
                  </div>
                )}

                {selected.issuedBy && (
                  <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 rounded-lg p-3">
                    <DoorOpen size={16} />
                    Issued by {selected.issuedBy} at {formatDateTime(selected.issuedAt)}
                    {selected.exitTime ? ` — Exit time: ${selected.exitTime}` : ''}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {rejectOpen && selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Reject Gate Pass</h3>
              <button type="button" onClick={() => setRejectOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              Rejecting gate pass for <strong>{selected.studentName}</strong>. Please provide a reason.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder="Rejection reason (required)..."
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectOpen(false)}
                className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleReject()}
                disabled={submitting || !rejectReason.trim()}
                className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {createOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 my-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">New Gate Pass Request</h3>
              <button type="button" onClick={() => setCreateOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Parent visited school — create half-day or mid-class exit request for principal approval.
            </p>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Class</label>
                  <select
                    value={createForm.className}
                    onChange={(e) => setCreateForm((f) => ({
                      ...f,
                      className: e.target.value,
                      sectionName: '',
                      studentId: '',
                    }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">Select class...</option>
                    {(meta?.classes || []).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Section</label>
                  <select
                    value={createForm.sectionName}
                    onChange={(e) => setCreateForm((f) => ({ ...f, sectionName: e.target.value, studentId: '' }))}
                    disabled={!createForm.className}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm disabled:bg-slate-50"
                  >
                    <option value="">All sections</option>
                    {sectionOptions.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Student</label>
                <select
                  value={createForm.studentId}
                  onChange={(e) => handleStudentSelect(e.target.value)}
                  disabled={!createForm.className || loadingStudents}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm disabled:bg-slate-50"
                >
                  <option value="">
                    {loadingStudents ? 'Loading students...' : 'Select student...'}
                  </option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.admissionNumber}) — {s.classGroup}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Pass Type</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(meta?.passTypes || []).map((pt) => (
                    <button
                      key={pt.id}
                      type="button"
                      onClick={() => setCreateForm((f) => ({ ...f, passType: pt.id as GatePassType }))}
                      className={`text-left p-3 rounded-lg border text-sm transition-colors ${
                        createForm.passType === pt.id
                          ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <p className="font-medium text-slate-900">{pt.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{pt.description}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Parent / Guardian Name</label>
                  <input
                    type="text"
                    value={createForm.parentName}
                    onChange={(e) => setCreateForm((f) => ({ ...f, parentName: e.target.value }))}
                    placeholder="Parent name"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Mobile</label>
                  <input
                    type="text"
                    value={createForm.parentMobile}
                    onChange={(e) => setCreateForm((f) => ({ ...f, parentMobile: e.target.value }))}
                    placeholder="Mobile number"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Reason</label>
                <textarea
                  value={createForm.reason}
                  onChange={(e) => setCreateForm((f) => ({ ...f, reason: e.target.value }))}
                  rows={2}
                  placeholder="Unexpected event — e.g. family emergency, medical appointment..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Remarks (optional)</label>
                <textarea
                  value={createForm.remarks}
                  onChange={(e) => setCreateForm((f) => ({ ...f, remarks: e.target.value }))}
                  rows={2}
                  placeholder="Additional notes..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleCreate()}
                disabled={submitting}
                className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Create Request
              </button>
            </div>
          </div>
        </div>
      )}

      {printOpen && selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto print:bg-white print:static">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md print:shadow-none print:rounded-none">
            <div className="p-6 print:p-8" id="gate-pass-print">
              <div className="text-center border-b-2 border-slate-800 pb-4 mb-4">
                <h2 className="text-xl font-bold text-slate-900 uppercase tracking-wide">Gate Pass</h2>
                <p className="text-sm text-slate-600 mt-1">{selected.passNumber}</p>
              </div>
              <div className="space-y-3 text-sm">
                <PrintRow label="Date" value={formatDate(selected.createdAt)} />
                <PrintRow label="Student" value={selected.studentName} />
                <PrintRow label="Admission No." value={selected.admissionNumber} />
                <PrintRow label="Class" value={selected.classGroup} />
                <PrintRow label="Pass Type" value={selected.passTypeLabel} />
                <PrintRow label="Parent / Guardian" value={selected.parentName} />
                <PrintRow label="Mobile" value={selected.parentMobile || '—'} />
                <PrintRow label="Reason" value={selected.reason} />
                {selected.exitTime && <PrintRow label="Exit Time" value={selected.exitTime} />}
                <PrintRow label="Approved By" value={selected.approvedBy || '—'} />
              </div>
              <div className="mt-8 pt-4 border-t border-slate-200 grid grid-cols-2 gap-8 text-xs text-slate-500">
                <div>
                  <p className="border-t border-slate-400 pt-1 mt-8">Security Signature</p>
                </div>
                <div>
                  <p className="border-t border-slate-400 pt-1 mt-8">Parent Signature</p>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-slate-100 print:hidden">
              <button
                type="button"
                onClick={() => setPrintOpen(false)}
                className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Printer size={14} />
                Print Gate Pass
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoField({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
}) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm font-medium text-slate-800 flex items-center gap-1 mt-0.5">
        {icon}
        {value}
      </p>
    </div>
  );
}

function PrintRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="font-medium text-slate-600 w-32 shrink-0">{label}:</span>
      <span className="text-slate-900">{value}</span>
    </div>
  );
}
