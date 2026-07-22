import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AlertCircle,
  Briefcase,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  GraduationCap,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  UserCheck,
  X,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import {
  approveLeaveApplication,
  createLeaveApplication,
  fetchLeaveApplications,
  fetchLeaveManagementMeta,
  rejectLeaveApplication,
  seedLeaveApplicationsDemo,
  type LeaveApplicationItem,
  type LeaveCategory,
  type LeaveStatusFilter,
} from '../../../lib/attendanceServices';

function statusClass(status: string) {
  if (status === 'Approved' || status === 'APPROVED') return 'bg-emerald-100 text-emerald-700';
  if (status === 'Rejected' || status === 'REJECTED') return 'bg-red-100 text-red-700';
  return 'bg-amber-100 text-amber-700';
}

function categoryIcon(category: LeaveApplicationItem['category']) {
  if (category === 'student') return <GraduationCap size={14} />;
  if (category === 'teacher') return <UserCheck size={14} />;
  return <Briefcase size={14} />;
}

function canApprove(role?: string) {
  return role === 'SUPER_ADMIN' || role === 'ADMIN';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function LeaveManagementView() {
  const { user } = useAuth();
  const isApprover = canApprove(user?.role);

  const [meta, setMeta] = useState<Awaited<ReturnType<typeof fetchLeaveManagementMeta>> | null>(null);
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchLeaveApplications>> | null>(null);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [category, setCategory] = useState<LeaveCategory>('all');
  const [status, setStatus] = useState<LeaveStatusFilter>('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectRemarks, setRejectRemarks] = useState('');
  const [approveRemarks, setApproveRemarks] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    category: 'student' as 'student' | 'teacher' | 'staff',
    applicantId: '',
    leaveType: 'GENERAL',
    fromDate: new Date().toISOString().slice(0, 10),
    toDate: new Date().toISOString().slice(0, 10),
    reason: '',
  });

  const selected = useMemo(
    () => data?.items.find((i) => i.id === selectedId) || null,
    [data, selectedId],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const m = await fetchLeaveManagementMeta();
      setMeta(m);
      setAcademicYear(m.defaultAcademicYear);
      const res = await fetchLeaveApplications({
        academicYear: m.defaultAcademicYear,
        category,
        status,
        q: search || undefined,
      });
      setData(res);
      setSelectedId((prev) => prev && res.items.some((i) => i.id === prev) ? prev : res.items[0]?.id || null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load leave applications');
    } finally {
      setLoading(false);
    }
  }, [category, status, search]);

  const refresh = useCallback(async () => {
    try {
      const res = await fetchLeaveApplications({
        academicYear,
        category,
        status,
        q: search || undefined,
      });
      setData(res);
      setSelectedId((prev) => prev && res.items.some((i) => i.id === prev) ? prev : res.items[0]?.id || null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to refresh');
    }
  }, [academicYear, category, status, search]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!meta) return;
    void refresh();
  }, [academicYear, category, status]);

  const handleApprove = async () => {
    if (!selected) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await approveLeaveApplication({
        id: selected.id,
        category: selected.category,
        reviewerRemarks: approveRemarks,
      });
      setSuccessMsg(`Leave approved for ${selected.applicantName}`);
      setApproveRemarks('');
      await refresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Approval failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selected || !rejectRemarks.trim()) {
      setErrorMsg('Rejection remarks are required');
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await rejectLeaveApplication({
        id: selected.id,
        category: selected.category,
        reviewerRemarks: rejectRemarks,
      });
      setSuccessMsg(`Leave rejected for ${selected.applicantName}`);
      setRejectOpen(false);
      setRejectRemarks('');
      await refresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Rejection failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreate = async () => {
    if (!createForm.applicantId || !createForm.reason.trim()) {
      setErrorMsg('Please select applicant and enter reason');
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const item = await createLeaveApplication({
        ...createForm,
        academicYear,
        leaveType: createForm.category === 'student' && createForm.leaveType === 'PLANNED'
          ? 'GENERAL'
          : createForm.leaveType,
      });
      setSuccessMsg(`Leave application submitted for ${item.applicantName}`);
      setCreateOpen(false);
      setCreateForm((f) => ({ ...f, applicantId: '', reason: '' }));
      await refresh();
      setSelectedId(item.id);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create leave application');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await seedLeaveApplicationsDemo(academicYear);
      await refresh();
      setSuccessMsg('Demo leave applications loaded');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Seed failed');
    } finally {
      setSeeding(false);
    }
  };

  const applicantOptions = useMemo(() => {
    if (!meta) return [];
    if (createForm.category === 'student') return meta.students;
    if (createForm.category === 'teacher') return meta.teachers;
    return meta.staff;
  }, [meta, createForm.category]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-slate-500">
        <Loader2 className="animate-spin mr-2" size={20} />
        Loading leave management...
      </div>
    );
  }

  return (
    <div className="space-y-4 p-1">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Leave Management</h1>
          <p className="text-slate-500 text-sm mt-1">
            Review and approve leave requests from students, teachers, and staff
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={16} />
            New Leave Request
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

      {/* KPI tiles */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total', value: data.summary.total, color: 'text-slate-900' },
            { label: 'Pending', value: data.summary.pending, color: 'text-amber-600' },
            { label: 'Approved', value: data.summary.approved, color: 'text-green-600' },
            { label: 'Rejected', value: data.summary.rejected, color: 'text-red-600' },
          ].map((kpi) => (
            <button
              key={kpi.label}
              type="button"
              onClick={() => setStatus(kpi.label.toLowerCase() as LeaveStatusFilter)}
              className={`bg-white rounded-xl border border-slate-200 p-4 text-left hover:border-blue-200 transition-colors ${
                status === kpi.label.toLowerCase() ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              <p className="text-xs text-slate-500 uppercase">{kpi.label}</p>
              <p className={`text-2xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
            </button>
          ))}
        </div>
      )}

      {/* Filters */}
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
          <label className="text-xs text-slate-500 block mb-1">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as LeaveCategory)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All</option>
            <option value="student">Students</option>
            <option value="teacher">Teachers</option>
            <option value="staff">Staff</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as LeaveStatusFilter)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
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
              placeholder="Name, ID, reason..."
              className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Master-detail */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 min-h-[500px]">
        {/* List */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-slate-100 font-semibold text-sm text-slate-800">
            Leave Applications ({data?.items.length ?? 0})
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-[600px]">
            {!data?.items.length ? (
              <p className="p-6 text-center text-slate-400 text-sm">No leave applications found</p>
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
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">{categoryIcon(item.category)}</span>
                      <p className="font-medium text-slate-900 truncate">{item.applicantName}</p>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {item.categoryLabel} · {item.designation}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {formatDate(item.fromDate)} – {formatDate(item.toDate)} ({item.totalDays} day{item.totalDays > 1 ? 's' : ''})
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${statusClass(item.statusLabel)}`}>
                    {item.statusLabel}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 overflow-hidden">
          {!selected ? (
            <div className="flex items-center justify-center h-full min-h-[400px] text-slate-400">
              Select a leave application to review
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-slate-900">{selected.applicantName}</h2>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusClass(selected.statusLabel)}`}>
                      {selected.statusLabel}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500">{selected.recordId} · {selected.categoryLabel}</p>
                </div>
                {selected.status === 'PENDING' && isApprover && (
                  <div className="flex gap-2">
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
                      Approve Leave
                    </button>
                  </div>
                )}
              </div>

              <div className="p-5 space-y-5 flex-1 overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <InfoField label="ID / Code" value={selected.admissionNumber} />
                  <InfoField label="Designation / Class" value={selected.designation} />
                  <InfoField label="Department" value={selected.department || '—'} />
                  <InfoField label="Leave Type" value={selected.leaveTypeLabel} />
                  <InfoField label="From Date" value={formatDate(selected.fromDate)} icon={<Calendar size={12} />} />
                  <InfoField label="To Date" value={formatDate(selected.toDate)} icon={<Calendar size={12} />} />
                  <InfoField label="Total Days" value={String(selected.totalDays)} />
                  <InfoField label="Source" value={selected.source} />
                  <InfoField label="Mobile" value={selected.mobile || '—'} />
                  <InfoField label="Email" value={selected.email || '—'} />
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase mb-1">Reason</p>
                  <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">{selected.reason}</p>
                </div>

                {selected.status === 'PENDING' && isApprover && (
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase block mb-1">
                      Approval Remarks (optional)
                    </label>
                    <textarea
                      value={approveRemarks}
                      onChange={(e) => setApproveRemarks(e.target.value)}
                      rows={2}
                      placeholder="Add remarks for approval..."
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                )}

                {selected.reviewedBy && (
                  <div className="border-t border-slate-100 pt-4">
                    <p className="text-xs font-medium text-slate-500 uppercase mb-2">Review Details</p>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <InfoField label="Reviewed By" value={selected.reviewedBy} />
                      <InfoField
                        label="Reviewed At"
                        value={selected.reviewedAt ? formatDate(selected.reviewedAt) : '—'}
                        icon={<Clock size={12} />}
                      />
                    </div>
                    {selected.reviewerRemarks && (
                      <p className="text-sm text-slate-600 mt-2 bg-slate-50 rounded-lg p-3">
                        {selected.reviewerRemarks}
                      </p>
                    )}
                  </div>
                )}

                {selected.status === 'APPROVED' && (
                  <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg p-3">
                    <CheckCircle2 size={16} />
                    Attendance records updated for approved leave dates
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reject modal */}
      {rejectOpen && selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Reject Leave Application</h3>
              <button type="button" onClick={() => setRejectOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              Rejecting leave for <strong>{selected.applicantName}</strong>. Please provide a reason.
            </p>
            <textarea
              value={rejectRemarks}
              onChange={(e) => setRejectRemarks(e.target.value)}
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
                disabled={submitting || !rejectRemarks.trim()}
                className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create modal */}
      {createOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">New Leave Request</h3>
              <button type="button" onClick={() => setCreateOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-500 block mb-1">Category</label>
                <select
                  value={createForm.category}
                  onChange={(e) => setCreateForm((f) => ({
                    ...f,
                    category: e.target.value as 'student' | 'teacher' | 'staff',
                    applicantId: '',
                    leaveType: e.target.value === 'student' ? 'GENERAL' : 'PLANNED',
                  }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="staff">Staff</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Applicant</label>
                <select
                  value={createForm.applicantId}
                  onChange={(e) => setCreateForm((f) => ({ ...f, applicantId: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Select {createForm.category}...</option>
                  {createForm.category === 'student' && applicantOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {(s as { name: string; classGroup: string }).name} ({(s as { classGroup: string }).classGroup})
                    </option>
                  ))}
                  {createForm.category !== 'student' && applicantOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {(s as { name: string; designation?: string; department?: string }).name}
                      {' '}({(s as { designation?: string; department?: string }).designation || (s as { department?: string }).department})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Leave Type</label>
                <select
                  value={createForm.leaveType}
                  onChange={(e) => setCreateForm((f) => ({ ...f, leaveType: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                >
                  {(meta?.leaveTypes || []).map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">From Date</label>
                  <input
                    type="date"
                    value={createForm.fromDate}
                    onChange={(e) => setCreateForm((f) => ({ ...f, fromDate: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">To Date</label>
                  <input
                    type="date"
                    value={createForm.toDate}
                    onChange={(e) => setCreateForm((f) => ({ ...f, toDate: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Reason</label>
                <textarea
                  value={createForm.reason}
                  onChange={(e) => setCreateForm((f) => ({ ...f, reason: e.target.value }))}
                  rows={3}
                  placeholder="Reason for leave..."
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
                Submit Request
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
