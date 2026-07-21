import React, { useCallback, useEffect, useState } from 'react';
import {
  GraduationCap,
  Search,
  Loader2,
  CheckCircle,
  Clock,
  Users,
  Filter,
  UserCheck,
  RefreshCw,
  AlertCircle,
  Hash,
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import {
  confirmAdmission,
  confirmAdmissionsBulk,
  fetchAdmissions,
  fetchAdmissionsMeta,
  syncAdmissionRecords,
  type AdmissionRecord,
} from '../../../lib/admissionsRecordServices';

function formatDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function canApprove(role?: string) {
  return role === 'SUPER_ADMIN' || role === 'ADMIN';
}

function statusBadge(record: AdmissionRecord) {
  if (record.statusKey === 'CONFIRMED') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">
        <CheckCircle size={10} /> Confirmed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-700">
      <Clock size={10} /> Pending Confirmation
    </span>
  );
}

export function AdmissionsView() {
  const { user } = useAuth();
  const isPrincipal = canApprove(user?.role);

  const [meta, setMeta] = useState<Awaited<ReturnType<typeof fetchAdmissionsMeta>> | null>(null);
  const [admissions, setAdmissions] = useState<AdmissionRecord[]>([]);
  const [summary, setSummary] = useState({ total: 0, pending: 0, confirmed: 0 });
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [filterClass, setFilterClass] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const selected = admissions.find((a) => a.id === selectedId) || null;

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setErrorMsg(null);
    setTimeout(() => setSuccessMsg(null), 4500);
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setSuccessMsg(null);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [metaRes, listRes] = await Promise.all([
        fetchAdmissionsMeta(),
        fetchAdmissions({
          academicYear,
          className: filterClass || undefined,
          status: filterStatus,
          q: searchQuery || undefined,
        }),
      ]);
      setMeta(metaRes);
      setAdmissions(listRes.admissions);
      setSummary(listRes.summary);
      setSelectedId((prev) => {
        if (prev && listRes.admissions.some((a) => a.id === prev)) return prev;
        return listRes.admissions[0]?.id ?? null;
      });
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to load admissions');
    } finally {
      setLoading(false);
    }
  }, [academicYear, filterClass, filterStatus, searchQuery]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleSync = async () => {
    setSubmitting(true);
    try {
      const res = await syncAdmissionRecords();
      showSuccess(res.message);
      await loadData();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirm = async (id: string) => {
    if (!isPrincipal) {
      showError('Only Principal / Admin can confirm admissions');
      return;
    }
    if (!confirm('Confirm this admission and generate an admission number?')) return;
    setSubmitting(true);
    try {
      const res = await confirmAdmission(id);
      showSuccess(res.message);
      await loadData();
      setSelectedId(res.admission.id);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Confirmation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkConfirm = async () => {
    if (!isPrincipal) {
      showError('Only Principal / Admin can confirm admissions');
      return;
    }
    if (
      !confirm(
        'Confirm all pending principal-approved admissions that have allocated seats?\n\nThis will generate admission numbers for each student.',
      )
    ) {
      return;
    }
    setSubmitting(true);
    try {
      const res = await confirmAdmissionsBulk(academicYear, true);
      showSuccess(res.message);
      await loadData();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Bulk confirmation failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-full bg-slate-50 flex flex-col p-6 overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <GraduationCap className="text-indigo-600" size={28} />
            Admissions
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Finalize enrollments for students whose applications were{' '}
            <span className="font-semibold text-slate-700">principal-approved</span>. Confirm to
            issue admission numbers.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={submitting}
            onClick={() => void handleSync()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold border border-slate-200 rounded-lg bg-white hover:bg-slate-50"
          >
            <RefreshCw size={14} /> Sync Approved
          </button>
          {isPrincipal && (
            <button
              type="button"
              disabled={submitting || summary.pending === 0}
              onClick={() => void handleBulkConfirm()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <UserCheck size={14} />}
              Confirm All (with seats)
            </button>
          )}
        </div>
      </div>

      {(errorMsg || successMsg) && (
        <div
          className={`mb-3 px-4 py-3 rounded-lg text-sm flex items-center gap-2 shrink-0 ${
            errorMsg
              ? 'bg-red-50 text-red-700 border border-red-100'
              : 'bg-green-50 text-green-700 border border-green-100'
          }`}
        >
          {errorMsg ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
          {errorMsg || successMsg}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 shrink-0">
        {[
          {
            label: 'Principal Approved',
            value: meta?.summary.principalApproved ?? 0,
            icon: UserCheck,
            color: 'text-indigo-600',
          },
          {
            label: 'Pending Confirmation',
            value: meta?.summary.pendingConfirmation ?? summary.pending,
            icon: Clock,
            color: 'text-amber-600',
          },
          {
            label: 'Confirmed',
            value: meta?.summary.confirmedAdmissions ?? summary.confirmed,
            icon: CheckCircle,
            color: 'text-emerald-600',
          },
          { label: 'Listed', value: summary.total, icon: Users, color: 'text-slate-600' },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <card.icon size={14} className={card.color} />
              {card.label}
            </div>
            <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-4 shrink-0">
        <select
          value={academicYear}
          onChange={(e) => setAcademicYear(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white"
        >
          {(meta?.academicYears || [academicYear]).map((y) => (
            <option key={y} value={y}>
              AY {y}
            </option>
          ))}
        </select>
        <select
          value={filterClass}
          onChange={(e) => setFilterClass(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white"
        >
          <option value="">All Classes</option>
          {(meta?.classes || []).map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white"
        >
          <option value="all">All Status</option>
          <option value="Pending Confirmation">Pending Confirmation</option>
          <option value="Confirmed">Confirmed</option>
        </select>
        <div className="relative flex-1 min-w-[160px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void loadData()}
            placeholder="Search student, admission #…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg"
          />
        </div>
        <button
          type="button"
          onClick={() => void loadData()}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg"
        >
          <Filter size={14} /> Apply
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-slate-400 gap-2">
          <Loader2 className="animate-spin" size={20} /> Loading admissions…
        </div>
      ) : admissions.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 bg-white rounded-xl border border-slate-200">
          <GraduationCap size={48} className="text-slate-300 mb-3" />
          <p className="text-sm font-medium">No admissions yet</p>
          <p className="text-xs mt-1 text-center max-w-md px-4">
            Students appear here after the Principal approves their application (Applications module)
            or after seat allocation auto-approval. Click <strong>Sync Approved</strong> to import
            existing approvals.
          </p>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0 overflow-hidden">
          <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col min-h-0">
            <div className="p-3 border-b border-slate-100 text-xs font-semibold text-slate-600 uppercase">
              Principal-Approved Students ({admissions.length})
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {admissions.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setSelectedId(a.id)}
                  className={`w-full text-left p-3 hover:bg-slate-50 transition-colors ${
                    selectedId === a.id ? 'bg-indigo-50 border-l-4 border-indigo-600' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{a.studentName}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{a.applicationId}</p>
                    </div>
                    {statusBadge(a)}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-slate-500">
                    {a.admissionNumber && (
                      <span className="font-mono text-indigo-600">{a.admissionNumber}</span>
                    )}
                    <span>
                      {a.className}
                      {a.sectionName ? ` — ${a.sectionName}` : ''}
                    </span>
                    {a.entranceTestScore != null && <span>Score: {a.entranceTestScore}%</span>}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-y-auto min-h-0">
            {selected ? (
              <div className="p-6">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">{selected.studentName}</h2>
                    <p className="text-sm text-slate-500 mt-0.5">
                      Application {selected.applicationId}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">{statusBadge(selected)}</div>
                </div>

                {selected.admissionNumber && (
                  <div className="mb-6 p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center gap-3">
                    <Hash className="text-indigo-600" size={24} />
                    <div>
                      <p className="text-[10px] font-semibold text-indigo-600 uppercase">
                        Admission Number
                      </p>
                      <p className="text-2xl font-bold text-indigo-800 font-mono">
                        {selected.admissionNumber}
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 text-sm">
                  {[
                    ['Class Applied', selected.classApplied || '—'],
                    ['Allocated Class', `${selected.className}${selected.sectionName ? ` — ${selected.sectionName}` : ''}`],
                    ['Entrance Score', selected.entranceTestScore != null ? `${selected.entranceTestScore}%` : '—'],
                    ['Seat Status', selected.seatStatus || '—'],
                    ['Merit Rank', selected.seatMeritRank != null ? `#${selected.seatMeritRank}` : '—'],
                    ['Principal Approved By', selected.principalApprovedBy || '—'],
                    ['Approved On', formatDate(selected.principalApprovedAt)],
                    ['Confirmed On', formatDate(selected.confirmedAt)],
                  ].map(([label, value]) => (
                    <div key={label} className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-[10px] font-semibold text-slate-500 uppercase">{label}</p>
                      <p className="text-sm font-medium text-slate-800 mt-0.5">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 text-sm">
                  <div className="p-3 border border-slate-100 rounded-lg">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase">Father</p>
                    <p className="text-sm text-slate-800">{selected.fatherName || '—'}</p>
                  </div>
                  <div className="p-3 border border-slate-100 rounded-lg">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase">Mother</p>
                    <p className="text-sm text-slate-800">{selected.motherName || '—'}</p>
                  </div>
                  <div className="p-3 border border-slate-100 rounded-lg">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase">Mobile</p>
                    <p className="text-sm text-slate-800">{selected.mobile || '—'}</p>
                  </div>
                  <div className="p-3 border border-slate-100 rounded-lg">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase">Email</p>
                    <p className="text-sm text-slate-800">{selected.email || '—'}</p>
                  </div>
                </div>

                {selected.approvalRemarks && (
                  <div className="mb-6 p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-sm text-emerald-800">
                    <p className="text-[10px] font-semibold uppercase mb-1">Principal Remarks</p>
                    {selected.approvalRemarks}
                  </div>
                )}

                {selected.statusKey === 'PENDING_CONFIRMATION' && (
                  <div className="border-t border-slate-100 pt-6">
                    {isPrincipal ? (
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => void handleConfirm(selected.id)}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-lg"
                      >
                        {submitting ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <UserCheck size={16} />
                        )}
                        Confirm Admission &amp; Generate Number
                      </button>
                    ) : (
                      <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-4 py-3">
                        Awaiting Principal confirmation to issue admission number.
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                Select a student to view admission details
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
