import { useCallback, useEffect, useMemo, useState } from 'react';
import { Banknote, Check, Plus, RefreshCcw, X } from 'lucide-react';
import {
  fetchFeeCollectionMeta,
  feeStudentOptionKey,
  type FeeStudent,
} from '../../../lib/feeCollectionServices';
import {
  approveFeeRefund,
  createFeeRefund,
  fetchFeeDashboardMeta,
  fetchStudentDepositedFees,
  formatInr,
  listFeeRefunds,
  processFeeRefund,
  rejectFeeRefund,
  type FeeRefund,
  type FeeRefundType,
  type StudentDepositedFees,
} from '../../../lib/feeFinanceServices';
import {
  AcademicLoading,
  AcademicModal,
  AcademicPageHeader,
  AcademicPageShell,
  am,
  EmptyState,
  FeeMessage,
  StatusBadge,
} from './FeeFinanceUi';

const REFUND_TYPES: FeeRefundType[] = ['ADVANCE', 'DEPOSIT', 'OVERPAYMENT', 'OTHER'];

export function RefundsView() {
  const [records, setRecords] = useState<FeeRefund[]>([]);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [saving, setSaving] = useState(false);

  const [students, setStudents] = useState<FeeStudent[]>([]);
  const [className, setClassName] = useState('');
  const [sectionName, setSectionName] = useState('');
  const [studentKey, setStudentKey] = useState('');
  const [deposits, setDeposits] = useState<StudentDepositedFees | null>(null);
  const [depositsLoading, setDepositsLoading] = useState(false);

  const [form, setForm] = useState({
    refundType: 'ADVANCE' as FeeRefundType,
    amount: '',
    reason: '',
    originalReceipt: '',
    paymentMode: 'BANK_TRANSFER',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const meta = await fetchFeeDashboardMeta();
      if (meta.defaultAcademicYear) setAcademicYear((y) => y || meta.defaultAcademicYear);
      const rows = await listFeeRefunds({ academicYear });
      setRecords(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load refunds');
    } finally {
      setLoading(false);
    }
  }, [academicYear]);

  useEffect(() => {
    void load();
  }, [load]);

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

  const openCreate = async () => {
    setForm({
      refundType: 'ADVANCE',
      amount: '',
      reason: '',
      originalReceipt: '',
      paymentMode: 'BANK_TRANSFER',
    });
    setClassName('');
    setSectionName('');
    setStudentKey('');
    setDeposits(null);
    setShowModal(true);
    try {
      const meta = await fetchFeeCollectionMeta();
      setStudents(meta.students || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load students');
    }
  };

  useEffect(() => {
    if (!showModal || !selectedStudent) {
      setDeposits(null);
      return;
    }
    let cancelled = false;
    setDepositsLoading(true);
    void fetchStudentDepositedFees({
      academicYear,
      studentId: selectedStudent.studentId || undefined,
      admissionNumber: selectedStudent.admissionNumber || undefined,
    })
      .then((data) => {
        if (cancelled) return;
        setDeposits(data);
        setForm((f) => ({
          ...f,
          originalReceipt: data.latestReceiptNumber || f.originalReceipt,
        }));
      })
      .catch((e) => {
        if (!cancelled) {
          setDeposits(null);
          setError(e instanceof Error ? e.message : 'Failed to load deposited fees');
        }
      })
      .finally(() => {
        if (!cancelled) setDepositsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showModal, selectedStudent, academicYear]);

  const handleCreate = async () => {
    setError('');
    if (!selectedStudent) {
      setError('Select a student');
      return;
    }
    if (!form.amount || Number(form.amount) <= 0) {
      setError('Enter a valid refund amount');
      return;
    }
    setSaving(true);
    try {
      await createFeeRefund({
        academicYear,
        studentId: selectedStudent.studentId || undefined,
        studentName: selectedStudent.studentName,
        admissionNumber: selectedStudent.admissionNumber,
        className: selectedStudent.className,
        sectionName: selectedStudent.sectionName,
        refundType: form.refundType,
        amount: Number(form.amount),
        reason: form.reason || undefined,
        originalReceipt: form.originalReceipt || undefined,
        paymentMode: form.paymentMode || undefined,
        depositBreakdown: deposits?.heads,
      });
      setMessage('Refund request created — sent for approval to HOD of Finance');
      setShowModal(false);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed');
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (action: 'approve' | 'reject' | 'process', id: string) => {
    setError('');
    try {
      if (action === 'approve') await approveFeeRefund(id);
      else if (action === 'reject') {
        if (!rejectReason.trim()) {
          setError('Rejection reason required');
          return;
        }
        await rejectFeeRefund(id, rejectReason);
        setRejectId(null);
        setRejectReason('');
      } else await processFeeRefund(id, { paymentMode: 'BANK_TRANSFER' });
      setMessage(`Refund ${action === 'process' ? 'processed' : `${action}d`}`);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    }
  };

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="Fees & Finance › Refunds"
        title="Refunds"
        subtitle="Request refunds with deposited fee matrix — approvals route to HOD of Finance (HR Approval Hierarchy)."
        actions={
          <>
            <button type="button" onClick={() => void load()} className={am.btnSecondary}>
              <RefreshCcw size={14} /> Refresh
            </button>
            <button type="button" onClick={() => void openCreate()} className={am.btnPrimary}>
              <Plus size={14} /> New Refund Request
            </button>
          </>
        }
      />
      <div className={am.content}>
        <FeeMessage message={message} type="success" />
        <FeeMessage message={error} type="error" />

        {loading ? (
          <AcademicLoading />
        ) : records.length === 0 ? (
          <EmptyState>No refund requests yet.</EmptyState>
        ) : (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead>
                <tr>
                  <th className={am.th}>Ref #</th>
                  <th className={am.th}>Student</th>
                  <th className={am.th}>Type</th>
                  <th className={`${am.th} text-right`}>Amount</th>
                  <th className={am.th}>Status</th>
                  <th className={am.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80">
                    <td className={`${am.td} font-mono text-xs`}>{row.recordId}</td>
                    <td className={am.td}>
                      <p className="font-semibold">{row.studentName}</p>
                      <p className="text-xs text-slate-500">
                        {row.className}
                        {row.sectionName ? `-${row.sectionName}` : ''}
                        {row.admissionNumber ? ` · ${row.admissionNumber}` : ''}
                      </p>
                      {row.status === 'PENDING_APPROVAL' && (
                        <p className="text-[10px] text-indigo-600 mt-0.5">
                          Approver: {row.pendingApproverRole || 'HOD of Finance'}
                          {row.pendingApproverName ? ` — ${row.pendingApproverName}` : ' (map in HR › Approval Hierarchy)'}
                        </p>
                      )}
                    </td>
                    <td className={am.td}>
                      <StatusBadge status={row.refundType} />
                    </td>
                    <td className={`${am.td} text-right font-bold`}>{formatInr(row.amount)}</td>
                    <td className={am.td}>
                      <StatusBadge status={row.status} />
                    </td>
                    <td className={am.td}>
                      <div className="flex flex-wrap gap-1">
                        {row.status === 'PENDING_APPROVAL' && (
                          <>
                            <button
                              type="button"
                              onClick={() => void runAction('approve', row.id)}
                              className={`${am.btnSecondary} text-[10px] py-1 px-2 text-green-700`}
                              title={
                                row.pendingApproverName
                                  ? `Approve as routed to ${row.pendingApproverName}`
                                  : 'Approve (HOD of Finance)'
                              }
                            >
                              <Check size={10} /> Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => setRejectId(row.id)}
                              className={`${am.btnSecondary} text-[10px] py-1 px-2 text-red-700`}
                            >
                              <X size={10} /> Reject
                            </button>
                          </>
                        )}
                        {row.status === 'APPROVED' && (
                          <button
                            type="button"
                            onClick={() => void runAction('process', row.id)}
                            className={`${am.btnSecondary} text-[10px] py-1 px-2`}
                          >
                            <Banknote size={10} /> Process
                          </button>
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

      <AcademicModal open={showModal} onClose={() => setShowModal(false)} title="New Refund Request" large>
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Section *</label>
              <select
                className={`${am.select} w-full`}
                value={sectionName}
                disabled={!className}
                onChange={(e) => {
                  setSectionName(e.target.value);
                  setStudentKey('');
                }}
              >
                <option value="">Select section</option>
                {sectionOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-600">Student Name *</label>
              <select
                className={`${am.select} w-full`}
                value={studentKey}
                disabled={!className || !sectionName}
                onChange={(e) => setStudentKey(e.target.value)}
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

          {selectedStudent && (
            <div className="grid grid-cols-3 gap-3 text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <div>
                <span className="text-slate-500">Admission No</span>
                <p className="font-semibold">{selectedStudent.admissionNumber || '—'}</p>
              </div>
              <div>
                <span className="text-slate-500">Class</span>
                <p className="font-semibold">{selectedStudent.className}</p>
              </div>
              <div>
                <span className="text-slate-500">Section</span>
                <p className="font-semibold">{selectedStudent.sectionName}</p>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 text-xs font-bold uppercase text-slate-600">
              Amount deposited (from system)
            </div>
            {depositsLoading ? (
              <p className="text-xs text-slate-400 px-3 py-4">Loading deposited fees…</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left px-3 py-1.5 text-slate-500">Headers</th>
                    <th className="text-right px-3 py-1.5 text-slate-500">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(deposits?.heads || [
                    { key: 'admissionFee', label: 'Admission Fee', amount: 0 },
                    { key: 'tuitionFee', label: 'Tuition Fee', amount: 0 },
                    { key: 'transportFee', label: 'Transport Fee', amount: 0 },
                    { key: 'cautionMoney', label: 'Caution Money', amount: 0 },
                    { key: 'librarySecurityDeposit', label: 'Library Security Deposit', amount: 0 },
                  ]).map((h) => (
                    <tr key={h.key} className="border-b border-slate-50">
                      <td className="px-3 py-1.5 text-slate-700">{h.label}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{formatInr(h.amount)}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-bold">
                    <td className="px-3 py-2">Total Amount</td>
                    <td className="px-3 py-2 text-right">
                      {formatInr(deposits?.totalDeposited || 0)}
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">Refund Type</label>
              <select
                className={`${am.select} w-full`}
                value={form.refundType}
                onChange={(e) =>
                  setForm((f) => ({ ...f, refundType: e.target.value as FeeRefundType }))
                }
              >
                {REFUND_TYPES.map((t) => (
                  <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Amount *</label>
              <input
                type="number"
                className={am.input}
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Reason</label>
            <textarea
              className={am.input}
              rows={2}
              value={form.reason}
              onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">Original Receipt</label>
              <input
                className={am.input}
                value={form.originalReceipt}
                onChange={(e) => setForm((f) => ({ ...f, originalReceipt: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Payment Mode</label>
              <select
                className={`${am.select} w-full`}
                value={form.paymentMode}
                onChange={(e) => setForm((f) => ({ ...f, paymentMode: e.target.value }))}
              >
                <option value="BANK_TRANSFER">BANK_TRANSFER</option>
                <option value="UPI">UPI</option>
                <option value="CHEQUE">CHEQUE</option>
                <option value="CASH">CASH</option>
              </select>
            </div>
          </div>
          <p className="text-[11px] text-slate-400">
            On submit, approval is routed to the person mapped as HOD of Finance under HR → Approval Hierarchy.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className={am.btnSecondary}>
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleCreate()}
              className={am.btnPrimary}
              disabled={saving || !studentKey || !form.amount}
            >
              Submit
            </button>
          </div>
        </div>
      </AcademicModal>

      <AcademicModal open={!!rejectId} onClose={() => setRejectId(null)} title="Reject Refund">
        <div className="space-y-3">
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
              Reject
            </button>
          </div>
        </div>
      </AcademicModal>
    </AcademicPageShell>
  );
}
