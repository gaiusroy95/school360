import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Plus, RefreshCcw, Send, ShieldCheck, Sparkles, X } from 'lucide-react';
import {
  approveOtherChargeRequest,
  createOtherChargeRequest,
  fetchFeeDashboardMeta,
  formatInr,
  getOtherChargesSummary,
  listOtherChargeRequests,
  listOtherChargeTypes,
  rejectOtherChargeRequest,
  seedOtherChargeTypes,
  submitOtherChargeRequest,
  type FeeOtherChargeRequest,
  type FeeOtherChargeRequestType,
  type OtherChargesSummary,
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
    studentName: '',
    admissionNumber: '',
    className: '',
    sectionName: '',
    settlementAmount: '',
    remarks: '',
  });

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

  const openCreate = (type: FeeOtherChargeRequestType) => {
    setModalType(type);
    setForm({
      name: '',
      code: '',
      discountType: 'PERCENTAGE',
      value: '',
      studentName: '',
      admissionNumber: '',
      className: '',
      sectionName: '',
      settlementAmount: '',
      remarks: '',
    });
    setShowModal(true);
  };

  const handleCreate = async () => {
    setError('');
    try {
      const record = await createOtherChargeRequest({
        requestType: modalType,
        academicYear,
        name: form.name.trim(),
        code: form.code.trim() || undefined,
        discountType: form.discountType,
        value: form.value ? Number(form.value) : undefined,
        settlementAmount: form.settlementAmount ? Number(form.settlementAmount) : undefined,
        studentName: form.studentName.trim() || undefined,
        admissionNumber: form.admissionNumber.trim() || undefined,
        className: form.className.trim() || undefined,
        sectionName: form.sectionName.trim() || undefined,
        remarks: form.remarks.trim() || undefined,
      });
      setMessage(
        modalType === 'ACCOUNT_SETTLEMENT'
          ? `Settlement request ${record.recordId} created — submit to Principal for approval`
          : `Discount code ${record.code} created — submit to Principal for approval`,
      );
      setShowModal(false);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed');
    }
  };

  const runAction = async (action: 'submit' | 'approve' | 'reject', id: string) => {
    setError('');
    try {
      if (action === 'submit') {
        const res = await submitOtherChargeRequest(id);
        setMessage(res.message);
      } else if (action === 'approve') {
        const res = await approveOtherChargeRequest(id);
        setMessage(res.message);
      } else if (action === 'reject') {
        if (!rejectReason.trim()) {
          setError('Rejection reason is required');
          return;
        }
        const res = await rejectOtherChargeRequest(id, rejectReason);
        setMessage(res.message);
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
        subtitle="Create discount codes for new admissions and account settlement requests — routed to Principal / Center Head for approval"
        actions={
          <>
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className={am.select}
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
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
                  openCreate(tab === 'Account Settlements' ? 'ACCOUNT_SETTLEMENT' : 'NEW_ADMISSION_DISCOUNT')
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

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className={`${am.card} ${am.cardPad}`}>
            <p className="text-[10px] text-slate-500 font-bold uppercase">Pending Approval</p>
            <p className="text-xl font-bold text-amber-700 mt-1">{summary?.pendingApproval ?? 0}</p>
          </div>
          <div className={`${am.card} ${am.cardPad}`}>
            <p className="text-[10px] text-slate-500 font-bold uppercase">Active Discount Codes</p>
            <p className="text-xl font-bold text-green-700 mt-1">{summary?.activeDiscounts ?? 0}</p>
          </div>
          <div className={`${am.card} ${am.cardPad}`}>
            <p className="text-[10px] text-slate-500 font-bold uppercase">Approved Settlements</p>
            <p className="text-xl font-bold text-slate-900 mt-1">{summary?.approvedSettlements ?? 0}</p>
          </div>
          <div className={`${am.card} ${am.cardPad}`}>
            <p className="text-[10px] text-slate-500 font-bold uppercase">Charge Types</p>
            <p className="text-xl font-bold text-slate-900 mt-1">{summary?.typeCount ?? 0}</p>
          </div>
        </div>

        <FeeTabs
          tabs={['New Admission Discounts', 'Account Settlements', 'Principal Approval']}
          active={tab}
          onChange={setTab}
        />

        {tab === 'Principal Approval' && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-900 flex items-start gap-2">
            <ShieldCheck size={16} className="shrink-0 mt-0.5" />
            <p>
              Requests below are awaiting <strong>Principal / Center Head</strong> approval.
              Only administrators can approve or reject. After approval, discount codes become active
              and settlement requests are marked approved for fee processing.
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
                      {row.requestType === 'ACCOUNT_SETTLEMENT'
                        ? formatInr(row.settlementAmount)
                        : row.discountType === 'PERCENTAGE' || row.discountType === 'PERCENT'
                          ? `${row.value}%`
                          : formatInr(row.value)}
                    </td>
                    <td className={am.td}>
                      {row.studentName ? (
                        <>
                          <div className="font-medium">{row.studentName}</div>
                          <div className="text-[11px] text-slate-500">
                            {[row.admissionNumber, row.className, row.sectionName].filter(Boolean).join(' · ')}
                          </div>
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className={`${am.td} text-xs text-slate-600`}>{row.requestedBy || '—'}</td>
                    <td className={am.td}><StatusBadge status={row.status} /></td>
                    <td className={am.td}>
                      <div className="flex flex-wrap gap-1">
                        {row.status === 'DRAFT' && (
                          <button
                            type="button"
                            onClick={() => void runAction('submit', row.id)}
                            className={`${am.btnSecondary} text-[10px] py-1 px-2`}
                          >
                            <Send size={10} /> Send to Principal
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
          <p className="text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
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
            </>
          ) : (
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
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">
                Student Name {modalType === 'ACCOUNT_SETTLEMENT' ? '*' : ''}
              </label>
              <input
                className={am.input}
                value={form.studentName}
                onChange={(e) => setForm((f) => ({ ...f, studentName: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Admission No</label>
              <input
                className={am.input}
                value={form.admissionNumber}
                onChange={(e) => setForm((f) => ({ ...f, admissionNumber: e.target.value }))}
              />
            </div>
          </div>

          {modalType === 'ACCOUNT_SETTLEMENT' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600">Class</label>
                <input
                  className={am.input}
                  value={form.className}
                  onChange={(e) => setForm((f) => ({ ...f, className: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Section</label>
                <input
                  className={am.input}
                  value={form.sectionName}
                  onChange={(e) => setForm((f) => ({ ...f, sectionName: e.target.value }))}
                />
              </div>
            </div>
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
                !form.name.trim() ||
                (modalType === 'ACCOUNT_SETTLEMENT' &&
                  (!form.studentName.trim() || !form.settlementAmount || Number(form.settlementAmount) <= 0)) ||
                (modalType === 'NEW_ADMISSION_DISCOUNT' && (!form.value || Number(form.value) <= 0))
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
