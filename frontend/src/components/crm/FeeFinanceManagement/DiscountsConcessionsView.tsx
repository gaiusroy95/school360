import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Plus, RefreshCcw, Send, X } from 'lucide-react';
import {
  approveFeeDiscount,
  createFeeDiscount,
  fetchFeeDashboardMeta,
  formatInr,
  listFeeDiscounts,
  rejectFeeDiscount,
  submitFeeDiscount,
  type FeeDiscount,
  type FeeDiscountScope,
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
  const [form, setForm] = useState({
    name: '',
    code: '',
    value: '',
    discountType: 'PERCENT',
    studentName: '',
    admissionNumber: '',
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

  const openCreate = (scope: FeeDiscountScope) => {
    setModalScope(scope);
    setForm({ name: '', code: '', value: '', discountType: 'PERCENT', studentName: '', admissionNumber: '', settlementAmount: '', remarks: '' });
    setShowModal(true);
  };

  const handleCreate = async () => {
    setError('');
    try {
      await createFeeDiscount({
        name: form.name,
        code: form.code || undefined,
        scope: modalScope,
        academicYear,
        value: form.value ? Number(form.value) : undefined,
        discountType: form.discountType,
        studentName: form.studentName || undefined,
        admissionNumber: form.admissionNumber || undefined,
        settlementAmount: form.settlementAmount ? Number(form.settlementAmount) : undefined,
        remarks: form.remarks || undefined,
      });
      setMessage(modalScope === 'ACCOUNT_SETTLEMENT' ? 'Settlement created' : 'Discount code created');
      setShowModal(false);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed');
    }
  };

  const runAction = async (action: 'submit' | 'approve' | 'reject', id: string) => {
    setError('');
    try {
      if (action === 'submit') await submitFeeDiscount(id);
      else if (action === 'approve') await approveFeeDiscount(id);
      else if (action === 'reject') {
        if (!rejectReason.trim()) { setError('Rejection reason required'); return; }
        await rejectFeeDiscount(id, rejectReason);
        setRejectId(null);
        setRejectReason('');
      }
      setMessage(`Discount ${action === 'submit' ? 'submitted' : action === 'approve' ? 'approved' : 'rejected'}`);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    }
  };

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="Fees & Finance"
        title="Discounts & Concessions"
        subtitle="Manage discount codes, account settlements, and approval workflow."
        actions={
          <>
            <button type="button" onClick={() => void load()} className={am.btnSecondary}>
              <RefreshCcw size={14} /> Refresh
            </button>
            {tab !== 'Pending Approval' && (
              <button
                type="button"
                onClick={() => openCreate(tab === 'Settlements' ? 'ACCOUNT_SETTLEMENT' : 'NEW_ADMISSION')}
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

        {loading ? <AcademicLoading /> : filtered.length === 0 ? (
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
                    <td className={am.td + ' font-mono text-xs'}>{row.code || '—'}</td>
                    <td className={am.td + ' font-semibold'}>{row.name}</td>
                    <td className={am.td}>
                      {row.scope === 'ACCOUNT_SETTLEMENT'
                        ? formatInr(row.settlementAmount)
                        : row.discountType === 'PERCENT'
                          ? `${row.value}%`
                          : formatInr(row.value)}
                    </td>
                    <td className={am.td}><StatusBadge status={row.scope} /></td>
                    <td className={am.td}>{row.studentName || '—'}</td>
                    <td className={am.td}><StatusBadge status={row.status} /></td>
                    <td className={am.td}>
                      <div className="flex flex-wrap gap-1">
                        {row.status === 'DRAFT' && (
                          <button type="button" onClick={() => void runAction('submit', row.id)} className={am.btnSecondary + ' text-[10px] py-1 px-2'}>
                            <Send size={10} /> Submit
                          </button>
                        )}
                        {row.status === 'PENDING_APPROVAL' && (
                          <>
                            <button type="button" onClick={() => void runAction('approve', row.id)} className={am.btnSecondary + ' text-[10px] py-1 px-2 text-green-700'}>
                              <Check size={10} /> Approve
                            </button>
                            <button type="button" onClick={() => setRejectId(row.id)} className={am.btnSecondary + ' text-[10px] py-1 px-2 text-red-700'}>
                              <X size={10} /> Reject
                            </button>
                          </>
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

      <AcademicModal open={showModal} onClose={() => setShowModal(false)} title={modalScope === 'ACCOUNT_SETTLEMENT' ? 'Account Settlement' : 'Discount Code'} large>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-600">Name</label>
            <input className={am.input} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          {modalScope !== 'ACCOUNT_SETTLEMENT' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600">Code</label>
                  <input className={am.input} value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="Optional" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Type</label>
                  <select className={am.select + ' w-full'} value={form.discountType} onChange={(e) => setForm((f) => ({ ...f, discountType: e.target.value }))}>
                    <option value="PERCENT">Percent</option>
                    <option value="FLAT">Flat Amount</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Value</label>
                <input type="number" className={am.input} value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} />
              </div>
            </>
          )}
          {modalScope === 'ACCOUNT_SETTLEMENT' && (
            <div>
              <label className="text-xs font-semibold text-slate-600">Settlement Amount</label>
              <input type="number" className={am.input} value={form.settlementAmount} onChange={(e) => setForm((f) => ({ ...f, settlementAmount: e.target.value }))} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">Student Name</label>
              <input className={am.input} value={form.studentName} onChange={(e) => setForm((f) => ({ ...f, studentName: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Admission No</label>
              <input className={am.input} value={form.admissionNumber} onChange={(e) => setForm((f) => ({ ...f, admissionNumber: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className={am.btnSecondary}>Cancel</button>
            <button type="button" onClick={() => void handleCreate()} className={am.btnPrimary} disabled={!form.name}>Save</button>
          </div>
        </div>
      </AcademicModal>

      <AcademicModal open={!!rejectId} onClose={() => setRejectId(null)} title="Reject Discount">
        <div className="space-y-3">
          <textarea className={am.input} rows={3} placeholder="Rejection reason" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setRejectId(null)} className={am.btnSecondary}>Cancel</button>
            <button type="button" onClick={() => rejectId && void runAction('reject', rejectId)} className={am.btnPrimary}>Reject</button>
          </div>
        </div>
      </AcademicModal>
    </AcademicPageShell>
  );
}
