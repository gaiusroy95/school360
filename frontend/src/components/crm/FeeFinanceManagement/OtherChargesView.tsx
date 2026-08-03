import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Plus, RefreshCcw, Send, ShieldCheck, Sparkles, X } from 'lucide-react';
import {
  fetchFeeCollectionMeta,
  feeStudentOptionKey,
  type FeeStudent,
} from '../../../lib/feeCollectionServices';
import {
  approveOtherChargeRequest,
  createOtherChargeRequest,
  fetchFeeDashboardMeta,
  fetchStudentAllSessionDues,
  formatInr,
  getOtherChargesSummary,
  listAdmissionDiscountCandidates,
  listOtherChargeRequests,
  listOtherChargeTypes,
  rejectOtherChargeRequest,
  seedOtherChargeTypes,
  submitOtherChargeRequest,
  type AdmissionDiscountCandidate,
  type FeeOtherChargeRequest,
  type FeeOtherChargeRequestType,
  type OtherChargesSummary,
  type StudentAllSessionDues,
} from '../../../lib/feeFinanceServices';
import {
  AcademicLoading,
  AcademicModal,
  AcademicPageHeader,
  AcademicPageShell,
  am,
  EmptyState,
  FeeMessage,
  FeeTabs,
  StatusBadge,
} from './FeeFinanceUi';

const REQUEST_TYPE_LABELS: Record<FeeOtherChargeRequestType, string> = {
  NEW_ADMISSION_DISCOUNT: 'New Admission Discount',
  ACCOUNT_SETTLEMENT: 'Account Settlement',
};

export function OtherChargesView() {
  const [tab, setTab] = useState('New Admission Discounts');
  const [records, setRecords] = useState<FeeOtherChargeRequest[]>([]);
  const [summary, setSummary] = useState<OtherChargesSummary | null>(null);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [years, setYears] = useState<string[]>(['2025-26']);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<FeeOtherChargeRequestType>('NEW_ADMISSION_DISCOUNT');
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [form, setForm] = useState({
    name: '',
    code: '',
    discountType: 'PERCENTAGE',
    value: '',
    studentId: '',
    studentName: '',
    admissionNumber: '',
    className: '',
    sectionName: '',
    settlementAmount: '',
    remarks: '',
  });

  const [candidates, setCandidates] = useState<AdmissionDiscountCandidate[]>([]);
  const [candidateKey, setCandidateKey] = useState('');
  const [students, setStudents] = useState<FeeStudent[]>([]);
  const [className, setClassName] = useState('');
  const [sectionName, setSectionName] = useState('');
  const [studentKey, setStudentKey] = useState('');
  const [duesLoading, setDuesLoading] = useState(false);
  const [allSessionDues, setAllSessionDues] = useState<StudentAllSessionDues | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const meta = await fetchFeeDashboardMeta();
      if (meta.academicYears?.length) setYears(meta.academicYears);
      const year = academicYear || meta.defaultAcademicYear || '2025-26';
      if (!academicYear && meta.defaultAcademicYear) setAcademicYear(meta.defaultAcademicYear);

      const [rows, sum] = await Promise.all([
        listOtherChargeRequests({ academicYear: year }),
        getOtherChargesSummary(year),
      ]);
      await listOtherChargeTypes({ ensure: '1' });
      setRecords(rows);
      setSummary(sum);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load other charges');
    } finally {
      setLoading(false);
    }
  }, [academicYear]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (tab === 'New Admission Discounts') {
      return records.filter((r) => r.requestType === 'NEW_ADMISSION_DISCOUNT');
    }
    if (tab === 'Account Settlements') {
      return records.filter((r) => r.requestType === 'ACCOUNT_SETTLEMENT');
    }
    return records.filter((r) => r.status === 'PENDING_APPROVAL');
  }, [records, tab]);

  const classOptions = useMemo(() => {
    const set = new Set(students.map((s) => s.className).filter(Boolean));
    return [...set].sort();
  }, [students]);

  const sectionOptions = useMemo(() => {
    const set = new Set(
      students
        .filter((s) => !className || s.className === className)
        .map((s) => s.sectionName)
        .filter(Boolean),
    );
    return [...set].sort();
  }, [students, className]);

  const studentOptions = useMemo(
    () =>
      students.filter(
        (s) =>
          (!className || s.className === className) &&
          (!sectionName || s.sectionName === sectionName),
      ),
    [students, className, sectionName],
  );

  const selectedStudent = useMemo(
    () => studentOptions.find((s) => feeStudentOptionKey(s) === studentKey) || null,
    [studentOptions, studentKey],
  );

  const selectedCandidate = useMemo(
    () => candidates.find((c) => c.key === candidateKey) || null,
    [candidates, candidateKey],
  );

  const openCreate = async (type: FeeOtherChargeRequestType) => {
    setModalType(type);
    setForm({
      name: '',
      code: '',
      discountType: 'PERCENTAGE',
      value: '',
      studentId: '',
      studentName: '',
      admissionNumber: '',
      className: '',
      sectionName: '',
      settlementAmount: '',
      remarks: '',
    });
    setCandidateKey('');
    setClassName('');
    setSectionName('');
    setStudentKey('');
    setAllSessionDues(null);
    setShowModal(true);

    try {
      if (type === 'NEW_ADMISSION_DISCOUNT') {
        const rows = await listAdmissionDiscountCandidates({ academicYear });
        setCandidates(rows);
      } else {
        const meta = await fetchFeeCollectionMeta();
        setStudents(meta.students || []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load student data');
    }
  };

  useEffect(() => {
    if (!showModal || modalType !== 'NEW_ADMISSION_DISCOUNT' || !selectedCandidate) return;
    setForm((f) => ({
      ...f,
      studentId: selectedCandidate.studentId || '',
      studentName: selectedCandidate.studentName,
      admissionNumber: selectedCandidate.admissionNumber,
      className: selectedCandidate.className,
      sectionName: selectedCandidate.sectionName,
    }));
  }, [showModal, modalType, selectedCandidate]);

  useEffect(() => {
    if (!showModal || modalType !== 'ACCOUNT_SETTLEMENT' || !selectedStudent) {
      if (modalType === 'ACCOUNT_SETTLEMENT' && !selectedStudent) setAllSessionDues(null);
      return;
    }
    let cancelled = false;
    setDuesLoading(true);
    setForm((f) => ({
      ...f,
      studentId: selectedStudent.studentId || '',
      studentName: selectedStudent.studentName,
      admissionNumber: selectedStudent.admissionNumber,
      className: selectedStudent.className,
      sectionName: selectedStudent.sectionName,
    }));
    void fetchStudentAllSessionDues({
      studentId: selectedStudent.studentId || undefined,
      admissionNumber: selectedStudent.admissionNumber || undefined,
    })
      .then((data) => {
        if (cancelled) return;
        setAllSessionDues(data);
        setForm((f) => ({
          ...f,
          settlementAmount:
            f.settlementAmount || (data.totalDueFees > 0 ? String(data.totalDueFees) : f.settlementAmount),
        }));
      })
      .catch((e) => {
        if (!cancelled) {
          setAllSessionDues(null);
          setError(e instanceof Error ? e.message : 'Failed to load total due across sessions');
        }
      })
      .finally(() => {
        if (!cancelled) setDuesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showModal, modalType, selectedStudent]);

  const handleCreate = async () => {
    setError('');
    if (modalType === 'NEW_ADMISSION_DISCOUNT' && !form.studentName.trim()) {
      setError('Select a student from application records');
      return;
    }
    if (modalType === 'ACCOUNT_SETTLEMENT' && !selectedStudent) {
      setError('Select class, section and student');
      return;
    }
    setSaving(true);
    try {
      const record = await createOtherChargeRequest({
        requestType: modalType,
        academicYear,
        name: form.name.trim(),
        code: form.code.trim() || undefined,
        discountType: form.discountType,
        value: form.value ? Number(form.value) : undefined,
        settlementAmount: form.settlementAmount ? Number(form.settlementAmount) : undefined,
        studentId: form.studentId.trim() || undefined,
        studentName: form.studentName.trim() || undefined,
        admissionNumber: form.admissionNumber.trim() || undefined,
        className: form.className.trim() || undefined,
        sectionName: form.sectionName.trim() || undefined,
        totalDueFees: allSessionDues?.totalDueFees ?? 0,
        remarks: form.remarks.trim() || undefined,
      });
      setMessage(
        modalType === 'ACCOUNT_SETTLEMENT'
          ? `Settlement request ${record.recordId} saved as draft — use Send to Principal`
          : `Discount code ${record.code} saved as draft — use Send to Principal`,
      );
      setShowModal(false);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed');
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (action: 'submit' | 'approve' | 'reject', id: string) => {
    setError('');
    try {
      if (action === 'submit') {
        const res = await submitOtherChargeRequest(id);
        setMessage(res.message || 'Sent to Principal / Center Head for approval');
      } else if (action === 'approve') {
        const res = await approveOtherChargeRequest(id);
        setMessage(res.message || 'Request approved');
      } else if (action === 'reject') {
        if (!rejectReason.trim()) {
          setError('Rejection reason is required');
          return;
        }
        const res = await rejectOtherChargeRequest(id, rejectReason);
        setMessage(res.message || 'Request rejected');
        setRejectId(null);
        setRejectReason('');
      }
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    }
  };

  const handleSeed = async () => {
    try {
      const res = await seedOtherChargeTypes();
      setMessage(res.created > 0 ? `Loaded ${res.created} charge type(s)` : 'Charge types already exist');
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Seed failed');
    }
  };

  if (loading && !records.length) {
    return <AcademicLoading label="Loading other charges…" />;
  }

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="Fees & Finance › Other Charges"
        title="Other Charges"
        subtitle="Admission discount codes synced from applications, and account settlements with all-session dues — routed to Principal / Center Head."
        actions={
          <>
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className={am.select}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <button type="button" onClick={() => void load()} className={am.btnSecondary}>
              <RefreshCcw size={14} /> Refresh
            </button>
            <button type="button" onClick={() => void handleSeed()} className={am.btnSecondary}>
              <Sparkles size={14} /> Seed Charge Types
            </button>
            {tab !== 'Principal Approval' && (
              <button
                type="button"
                onClick={() =>
                  void openCreate(
                    tab === 'Account Settlements' ? 'ACCOUNT_SETTLEMENT' : 'NEW_ADMISSION_DISCOUNT',
                  )
                }
                className={am.btnPrimary}
              >
                <Plus size={14} />
                {tab === 'Account Settlements' ? 'New Settlement' : 'New Discount Code'}
              </button>
            )}
          </>
        }
      />

      <div className={am.content}>
        {message && <FeeMessage message={message} type="success" />}
        {error && <FeeMessage message={error} type="error" />}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className={`${am.card} ${am.cardPad}`}>
            <p className="text-[10px] font-bold uppercase text-slate-500">Pending Approval</p>
            <p className="mt-1 text-xl font-bold text-amber-700">{summary?.pendingApproval ?? 0}</p>
          </div>
          <div className={`${am.card} ${am.cardPad}`}>
            <p className="text-[10px] font-bold uppercase text-slate-500">Active Discount Codes</p>
            <p className="mt-1 text-xl font-bold text-green-700">{summary?.activeDiscounts ?? 0}</p>
          </div>
          <div className={`${am.card} ${am.cardPad}`}>
            <p className="text-[10px] font-bold uppercase text-slate-500">Approved Settlements</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{summary?.approvedSettlements ?? 0}</p>
          </div>
          <div className={`${am.card} ${am.cardPad}`}>
            <p className="text-[10px] font-bold uppercase text-slate-500">Charge Types</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{summary?.typeCount ?? 0}</p>
          </div>
        </div>

        <FeeTabs
          tabs={['New Admission Discounts', 'Account Settlements', 'Principal Approval']}
          active={tab}
          onChange={setTab}
        />

        {tab === 'Principal Approval' && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
            <ShieldCheck size={16} className="mt-0.5 shrink-0" />
            <p>
              Requests below are awaiting <strong>Principal / Center Head</strong> approval. After
              approval, discount codes become active and settlement requests are marked approved for
              fee processing.
            </p>
          </div>
        )}

        {loading ? (
          <AcademicLoading />
        ) : filtered.length === 0 ? (
          <EmptyState>
            {tab === 'Principal Approval'
              ? 'No requests pending Principal / Center Head approval.'
              : `No ${tab.toLowerCase()} yet. Click the button above to create one.`}
          </EmptyState>
        ) : (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead>
                <tr>
                  <th className={am.th}>Ref / Code</th>
                  <th className={am.th}>Title</th>
                  <th className={am.th}>Type</th>
                  <th className={am.th}>Value / Amount</th>
                  <th className={am.th}>Student</th>
                  <th className={am.th}>Requested By</th>
                  <th className={am.th}>Status</th>
                  <th className={am.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80">
                    <td className={`${am.td} font-mono text-xs`}>
                      <div>{row.recordId}</div>
                      {row.code && <div className="text-slate-500">{row.code}</div>}
                    </td>
                    <td className={`${am.td} font-semibold`}>{row.name}</td>
                    <td className={am.td}>
                      <span className="text-[10px] font-bold uppercase text-slate-600">
                        {REQUEST_TYPE_LABELS[row.requestType]}
                      </span>
                    </td>
                    <td className={am.td}>
                      {row.requestType === 'ACCOUNT_SETTLEMENT' ? (
                        <div>
                          <div className="font-semibold">{formatInr(row.settlementAmount)}</div>
                          {(row.totalDueFees || 0) > 0 && (
                            <div className="text-[10px] text-slate-500">
                              All-session due {formatInr(row.totalDueFees || 0)}
                            </div>
                          )}
                        </div>
                      ) : row.discountType === 'PERCENTAGE' || row.discountType === 'PERCENT' ? (
                        `${row.value}%`
                      ) : (
                        formatInr(row.value)
                      )}
                    </td>
                    <td className={am.td}>
                      {row.studentName ? (
                        <>
                          <div className="font-medium">{row.studentName}</div>
                          <div className="text-[11px] text-slate-500">
                            {[row.admissionNumber, row.className, row.sectionName]
                              .filter(Boolean)
                              .join(' · ')}
                          </div>
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className={`${am.td} text-xs text-slate-600`}>{row.requestedBy || '—'}</td>
                    <td className={am.td}>
                      <StatusBadge status={row.status} />
                      {row.status === 'PENDING_APPROVAL' && row.pendingApproverRole ? (
                        <p className="mt-1 text-[10px] text-slate-500">{row.pendingApproverRole}</p>
                      ) : null}
                    </td>
                    <td className={am.td}>
                      <div className="flex flex-wrap gap-1">
                        {row.status === 'DRAFT' && (
                          <button
                            type="button"
                            onClick={() => void runAction('submit', row.id)}
                            className={`${am.btnSecondary} px-2 py-1 text-[10px]`}
                          >
                            <Send size={10} /> Send to Principal
                          </button>
                        )}
                        {row.status === 'PENDING_APPROVAL' && (
                          <>
                            <button
                              type="button"
                              onClick={() => void runAction('approve', row.id)}
                              className={`${am.btnSecondary} px-2 py-1 text-[10px] text-green-700`}
                            >
                              <Check size={10} /> Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => setRejectId(row.id)}
                              className={`${am.btnSecondary} px-2 py-1 text-[10px] text-red-700`}
                            >
                              <X size={10} /> Reject
                            </button>
                          </>
                        )}
                        {row.status === 'REJECTED' && row.rejectionReason && (
                          <span className="text-[10px] text-red-600">{row.rejectionReason}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AcademicModal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={
          modalType === 'ACCOUNT_SETTLEMENT'
            ? 'Account Settlement Request'
            : 'New Admission Discount Code'
        }
        large
      >
        <div className="space-y-3">
          <p className="rounded-lg border border-sky-100 bg-sky-50 px-3 py-2 text-xs text-sky-900">
            After saving, use <strong>Send to Principal</strong> to route this request to the
            Principal / Center Head for approval.
          </p>

          <div>
            <label className="text-xs font-semibold text-slate-600">Title / Description</label>
            <input
              className={am.input}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder={
                modalType === 'ACCOUNT_SETTLEMENT'
                  ? 'e.g. Old student fee settlement — Class 10 passout'
                  : 'e.g. Sibling discount for new admission 2025-26'
              }
            />
          </div>

          {modalType === 'NEW_ADMISSION_DISCOUNT' ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600">Discount Code (optional)</label>
                  <input
                    className={am.input}
                    value={form.code}
                    onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                    placeholder="Auto-generated if blank"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Discount Type</label>
                  <select
                    className={`${am.select} w-full`}
                    value={form.discountType}
                    onChange={(e) => setForm((f) => ({ ...f, discountType: e.target.value }))}
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FLAT">Flat Amount (₹)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Discount Value</label>
                <input
                  type="number"
                  className={am.input}
                  value={form.value}
                  onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                  placeholder={form.discountType === 'PERCENTAGE' ? 'e.g. 10' : 'e.g. 5000'}
                />
              </div>

              <div className="rounded-lg border border-slate-200 p-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Student (synced from application creation)
                </p>
                <div className="mb-3">
                  <label className="text-xs font-semibold text-slate-600">Select Applicant / Student *</label>
                  <select
                    className={`${am.select} w-full`}
                    value={candidateKey}
                    onChange={(e) => setCandidateKey(e.target.value)}
                  >
                    <option value="">Select from applications</option>
                    {candidates.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.studentName}
                        {c.admissionNumber ? ` · ${c.admissionNumber}` : ''}
                        {c.className ? ` · ${c.className}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600">Student Name</label>
                    <input className={am.input} value={form.studentName} readOnly />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600">Admission No</label>
                    <input className={am.input} value={form.admissionNumber} readOnly />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="text-xs font-semibold text-slate-600">Settlement Amount (₹)</label>
                <input
                  type="number"
                  className={am.input}
                  value={form.settlementAmount}
                  onChange={(e) => setForm((f) => ({ ...f, settlementAmount: e.target.value }))}
                  placeholder="Outstanding amount to settle"
                />
              </div>

              <div className="rounded-lg border border-slate-200 p-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Student (auto from system)
                </p>
                <div className="mb-3 grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600">Class *</label>
                    <select
                      className={`${am.select} w-full`}
                      value={className}
                      onChange={(e) => {
                        setClassName(e.target.value);
                        setSectionName('');
                        setStudentKey('');
                      }}
                    >
                      <option value="">Select class</option>
                      {classOptions.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600">Section *</label>
                    <select
                      className={`${am.select} w-full`}
                      value={sectionName}
                      onChange={(e) => {
                        setSectionName(e.target.value);
                        setStudentKey('');
                      }}
                      disabled={!className}
                    >
                      <option value="">Select section</option>
                      {sectionOptions.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600">Student Name *</label>
                    <select
                      className={`${am.select} w-full`}
                      value={studentKey}
                      onChange={(e) => setStudentKey(e.target.value)}
                      disabled={!className || !sectionName}
                    >
                      <option value="">Select student</option>
                      {studentOptions.map((s) => (
                        <option key={feeStudentOptionKey(s)} value={feeStudentOptionKey(s)}>
                          {s.studentName}
                          {s.admissionNumber ? ` (${s.admissionNumber})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600">Admission No</label>
                    <input className={am.input} value={form.admissionNumber} readOnly />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600">Class / Section</label>
                    <input
                      className={am.input}
                      value={[form.className, form.sectionName].filter(Boolean).join(' · ')}
                      readOnly
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 px-3 py-2">
                <p className="text-sm text-slate-700">
                  Total Due (All Sessions):{' '}
                  <span className="font-bold text-indigo-700 underline decoration-indigo-300">
                    {duesLoading
                      ? 'Loading…'
                      : selectedStudent
                        ? formatInr(allSessionDues?.totalDueFees ?? 0)
                        : 'Select a student'}
                  </span>
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Auto flow from accounts across all academic sessions
                  {allSessionDues?.sessionCount
                    ? ` · ${allSessionDues.sessionCount} session(s)`
                    : ''}
                </p>
                {allSessionDues && allSessionDues.sessions.length > 0 && (
                  <ul className="mt-2 space-y-0.5 text-[11px] text-slate-600">
                    {allSessionDues.sessions.map((s) => (
                      <li key={s.academicYear}>
                        {s.academicYear}: {formatInr(s.totalDueFees)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-600">Remarks for Principal</label>
            <textarea
              className={am.input}
              rows={2}
              value={form.remarks}
              onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
              placeholder="Reason / supporting notes for approval"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className={am.btnSecondary}>
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleCreate()}
              className={am.btnPrimary}
              disabled={
                saving ||
                !form.name.trim() ||
                (modalType === 'ACCOUNT_SETTLEMENT' &&
                  (!studentKey || !form.settlementAmount || Number(form.settlementAmount) <= 0)) ||
                (modalType === 'NEW_ADMISSION_DISCOUNT' &&
                  (!candidateKey || !form.value || Number(form.value) <= 0))
              }
            >
              Save Draft
            </button>
          </div>
        </div>
      </AcademicModal>

      <AcademicModal open={!!rejectId} onClose={() => setRejectId(null)} title="Reject Request">
        <div className="space-y-3">
          <p className="text-xs text-slate-500">Provide a reason for rejecting this request.</p>
          <textarea
            className={am.input}
            rows={3}
            placeholder="Rejection reason"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setRejectId(null)} className={am.btnSecondary}>
              Cancel
            </button>
            <button
              type="button"
              onClick={() => rejectId && void runAction('reject', rejectId)}
              className={am.btnPrimary}
            >
              Reject Request
            </button>
          </div>
        </div>
      </AcademicModal>
    </AcademicPageShell>
  );
}
