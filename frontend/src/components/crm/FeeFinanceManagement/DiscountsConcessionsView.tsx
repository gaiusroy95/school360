import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Plus, Printer, RefreshCcw, Send, X } from 'lucide-react';
import {
  fetchFeeCollectionMeta,
  feeStudentOptionKey,
  type FeeStudent,
} from '../../../lib/feeCollectionServices';
import {
  approveFeeDiscount,
  createFeeDiscount,
  fetchFeeDashboardMeta,
  fetchStudentSettlementDues,
  formatInr,
  listFeeDiscounts,
  rejectFeeDiscount,
  submitFeeDiscount,
  type FeeDiscount,
  type FeeDiscountScope,
} from '../../../lib/feeFinanceServices';
import { downloadSettlementReceiptPdf } from '../../../lib/settlementReceiptPdf';
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

export function DiscountsConcessionsView() {
  const [tab, setTab] = useState('Discount Codes');
  const [records, setRecords] = useState<FeeDiscount[]>([]);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalScope, setModalScope] = useState<FeeDiscountScope>('NEW_ADMISSION');
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [saving, setSaving] = useState(false);

  const [students, setStudents] = useState<FeeStudent[]>([]);
  const [className, setClassName] = useState('');
  const [sectionName, setSectionName] = useState('');
  const [studentKey, setStudentKey] = useState('');
  const [totalDueFees, setTotalDueFees] = useState<number | null>(null);
  const [duesLoading, setDuesLoading] = useState(false);

  const [form, setForm] = useState({
    name: '',
    code: '',
    value: '',
    discountType: 'PERCENT',
    settlementAmount: '',
    remarks: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const meta = await fetchFeeDashboardMeta();
      if (meta.defaultAcademicYear) setAcademicYear((y) => y || meta.defaultAcademicYear);
      const rows = await listFeeDiscounts({ academicYear });
      setRecords(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load discounts');
    } finally {
      setLoading(false);
    }
  }, [academicYear]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (tab === 'Discount Codes') {
      return records.filter((r) => r.scope !== 'ACCOUNT_SETTLEMENT');
    }
    if (tab === 'Settlements') {
      return records.filter((r) => r.scope === 'ACCOUNT_SETTLEMENT');
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

  const openCreate = async (scope: FeeDiscountScope) => {
    setModalScope(scope);
    setForm({
      name: '',
      code: '',
      value: '',
      discountType: 'PERCENT',
      settlementAmount: '',
      remarks: '',
    });
    setClassName('');
    setSectionName('');
    setStudentKey('');
    setTotalDueFees(null);
    setShowModal(true);

    if (scope === 'ACCOUNT_SETTLEMENT') {
      try {
        const meta = await fetchFeeCollectionMeta();
        setStudents(meta.students || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load students');
      }
    }
  };

  useEffect(() => {
    if (modalScope !== 'ACCOUNT_SETTLEMENT' || !selectedStudent) {
      setTotalDueFees(null);
      return;
    }
    let cancelled = false;
    setDuesLoading(true);
    void fetchStudentSettlementDues({
      academicYear,
      studentId: selectedStudent.studentId || undefined,
      admissionNumber: selectedStudent.admissionNumber || undefined,
    })
      .then((data) => {
        if (!cancelled) setTotalDueFees(data.totalDueFees);
      })
      .catch((e) => {
        if (!cancelled) {
          setTotalDueFees(0);
          setError(e instanceof Error ? e.message : 'Failed to load total due fees');
        }
      })
      .finally(() => {
        if (!cancelled) setDuesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [modalScope, selectedStudent, academicYear]);

  const handleCreate = async () => {
    setError('');
    setSaving(true);
    try {
      if (modalScope === 'ACCOUNT_SETTLEMENT') {
        if (!selectedStudent) {
          setError('Select class, section and student');
          return;
        }
        if (!form.settlementAmount || Number(form.settlementAmount) <= 0) {
          setError('Enter a valid settlement amount');
          return;
        }
        if (!form.remarks.trim()) {
          setError('Reason for settlement is required');
          return;
        }
        await createFeeDiscount({
          scope: 'ACCOUNT_SETTLEMENT',
          academicYear,
          studentId: selectedStudent.studentId || undefined,
          studentName: selectedStudent.studentName,
          admissionNumber: selectedStudent.admissionNumber,
          className: selectedStudent.className,
          sectionName: selectedStudent.sectionName,
          settlementAmount: Number(form.settlementAmount),
          totalDueFees: totalDueFees ?? 0,
          remarks: form.remarks.trim(),
          submitForApproval: true,
        });
        setMessage('Settlement saved and sent for approval');
        setTab('Pending Approval');
      } else {
        if (!form.name.trim()) {
          setError('Name is required');
          return;
        }
        await createFeeDiscount({
          name: form.name,
          code: form.code || undefined,
          scope: modalScope,
          academicYear,
          value: form.value ? Number(form.value) : undefined,
          discountType: form.discountType,
          remarks: form.remarks || undefined,
        });
        setMessage('Discount code created');
      }
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
      if (action === 'submit') await submitFeeDiscount(id);
      else if (action === 'approve') await approveFeeDiscount(id);
      else if (action === 'reject') {
        if (!rejectReason.trim()) {
          setError('Rejection reason required');
          return;
        }
        await rejectFeeDiscount(id, rejectReason);
        setRejectId(null);
        setRejectReason('');
      }
      setMessage(
        `Discount ${action === 'submit' ? 'submitted' : action === 'approve' ? 'approved' : 'rejected'}`,
      );
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    }
  };

  const handlePrintReceipt = (row: FeeDiscount) => {
    setError('');
    try {
      downloadSettlementReceiptPdf(row);
      setMessage(`Settlement receipt printed for ${row.studentName || row.code}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Print failed');
    }
  };

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="Fees & Finance"
        title="Discounts & Concessions"
        subtitle="Discount codes, account settlements with approval, and printable approved receipts."
        actions={
          <>
            <button type="button" onClick={() => void load()} className={am.btnSecondary}>
              <RefreshCcw size={14} /> Refresh
            </button>
            {tab !== 'Pending Approval' && (
              <button
                type="button"
                onClick={() => void openCreate(tab === 'Settlements' ? 'ACCOUNT_SETTLEMENT' : 'NEW_ADMISSION')}
                className={am.btnPrimary}
              >
                <Plus size={14} /> {tab === 'Settlements' ? 'Add Settlement' : 'Add Discount'}
              </button>
            )}
          </>
        }
      />
      <div className={am.content}>
        <FeeTabs tabs={['Discount Codes', 'Settlements', 'Pending Approval']} active={tab} onChange={setTab} />
        <FeeMessage message={message} type="success" />
        <FeeMessage message={error} type="error" />

        {loading ? (
          <AcademicLoading />
        ) : filtered.length === 0 ? (
          <EmptyState>No records in this tab.</EmptyState>
        ) : (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead>
                <tr>
                  <th className={am.th}>Code</th>
                  <th className={am.th}>Name</th>
                  <th className={am.th}>Value</th>
                  <th className={am.th}>Scope</th>
                  <th className={am.th}>Student</th>
                  <th className={am.th}>Status</th>
                  <th className={am.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80">
                    <td className={`${am.td} font-mono text-xs`}>{row.code || '—'}</td>
                    <td className={`${am.td} font-semibold`}>
                      {row.name}
                      {row.scope === 'ACCOUNT_SETTLEMENT' && row.remarks && (
                        <p className="text-[10px] font-normal text-slate-500 mt-0.5 line-clamp-1">
                          Reason: {row.remarks}
                        </p>
                      )}
                    </td>
                    <td className={am.td}>
                      {row.scope === 'ACCOUNT_SETTLEMENT'
                        ? formatInr(row.settlementAmount)
                        : row.discountType === 'PERCENT' || row.discountType === 'PERCENTAGE'
                          ? `${row.value}%`
                          : formatInr(row.value)}
                    </td>
                    <td className={am.td}>
                      <StatusBadge status={row.scope} />
                    </td>
                    <td className={am.td}>
                      {row.studentName || '—'}
                      {row.admissionNumber && (
                        <p className="text-[10px] text-slate-400">{row.admissionNumber}</p>
                      )}
                    </td>
                    <td className={am.td}>
                      <StatusBadge status={row.status} />
                    </td>
                    <td className={am.td}>
                      <div className="flex flex-wrap gap-1">
                        {row.status === 'DRAFT' && (
                          <button
                            type="button"
                            onClick={() => void runAction('submit', row.id)}
                            className={`${am.btnSecondary} text-[10px] py-1 px-2`}
                          >
                            <Send size={10} /> Submit
                          </button>
                        )}
                        {row.status === 'PENDING_APPROVAL' && (
                          <>
                            <button
                              type="button"
                              onClick={() => void runAction('approve', row.id)}
                              className={`${am.btnSecondary} text-[10px] py-1 px-2 text-green-700`}
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
                        {row.scope === 'ACCOUNT_SETTLEMENT' && row.status === 'APPROVED' && (
                          <button
                            type="button"
                            onClick={() => handlePrintReceipt(row)}
                            className={`${am.btnPrimary} text-[10px] py-1 px-2`}
                          >
                            <Printer size={10} /> Print Receipt
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

      <AcademicModal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={modalScope === 'ACCOUNT_SETTLEMENT' ? 'Account Settlement' : 'Discount Code'}
        large
      >
        <div className="space-y-3">
          {modalScope === 'ACCOUNT_SETTLEMENT' ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

              <p className="text-sm text-slate-700">
                Total Due Fees:{' '}
                <span className="font-bold text-indigo-700 underline decoration-indigo-300">
                  {duesLoading
                    ? 'Loading…'
                    : selectedStudent
                      ? formatInr(totalDueFees ?? 0)
                      : 'Select a student'}
                </span>
                <span className="text-[11px] text-slate-400 ml-2">Auto populated from accounts</span>
              </p>

              <div>
                <label className="text-xs font-semibold text-slate-600">Settlement Amount *</label>
                <input
                  type="number"
                  min={0}
                  className={am.input}
                  value={form.settlementAmount}
                  onChange={(e) => setForm((f) => ({ ...f, settlementAmount: e.target.value }))}
                  placeholder="Enter settlement amount"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">Reason for Settlement *</label>
                <input
                  className={am.input}
                  value={form.remarks}
                  onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
                  placeholder="Why is this settlement being requested?"
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
                  disabled={saving || !studentKey || !form.settlementAmount || !form.remarks.trim()}
                >
                  <Send size={14} /> Save &amp; Send for Approval
                </button>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="text-xs font-semibold text-slate-600">Name *</label>
                <input
                  className={am.input}
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600">Code</label>
                  <input
                    className={am.input}
                    value={form.code}
                    onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Type</label>
                  <select
                    className={`${am.select} w-full`}
                    value={form.discountType}
                    onChange={(e) => setForm((f) => ({ ...f, discountType: e.target.value }))}
                  >
                    <option value="PERCENT">Percent</option>
                    <option value="FLAT">Flat Amount</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Value</label>
                <input
                  type="number"
                  className={am.input}
                  value={form.value}
                  onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Remarks</label>
                <input
                  className={am.input}
                  value={form.remarks}
                  onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
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
                  disabled={saving || !form.name}
                >
                  Save
                </button>
              </div>
            </>
          )}
        </div>
      </AcademicModal>

      <AcademicModal open={!!rejectId} onClose={() => setRejectId(null)} title="Reject Discount">
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
