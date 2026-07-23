import { useCallback, useEffect, useState } from 'react';
import { Check, Plus, RefreshCcw, X, Banknote } from 'lucide-react';
import {
  approveFeeRefund,
  createFeeRefund,
  fetchFeeDashboardMeta,
  formatInr,
  listFeeRefunds,
  processFeeRefund,
  rejectFeeRefund,
  type FeeRefund,
  type FeeRefundType,
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
  const [form, setForm] = useState({
    studentName: '',
    admissionNumber: '',
    className: '',
    sectionName: '',
    refundType: 'ADVANCE' as FeeRefundType,
    amount: '',
    reason: '',
    originalReceipt: '',
    paymentMode: 'BANK_TRANSFER',
    remarks: '',
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

  const handleCreate = async () => {
    setError('');
    try {
      await createFeeRefund({
        academicYear,
        studentName: form.studentName,
        admissionNumber: form.admissionNumber || undefined,
        className: form.className || undefined,
        sectionName: form.sectionName || undefined,
        refundType: form.refundType,
        amount: Number(form.amount),
        reason: form.reason || undefined,
        originalReceipt: form.originalReceipt || undefined,
        paymentMode: form.paymentMode || undefined,
        remarks: form.remarks || undefined,
      });
      setMessage('Refund request created');
      setShowModal(false);
      setForm({
        studentName: '', admissionNumber: '', className: '', sectionName: '',
        refundType: 'ADVANCE', amount: '', reason: '', originalReceipt: '', paymentMode: 'BANK_TRANSFER', remarks: '',
      });
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed');
    }
  };

  const runAction = async (action: 'approve' | 'reject' | 'process', id: string) => {
    setError('');
    try {
      if (action === 'approve') await approveFeeRefund(id);
      else if (action === 'reject') {
        if (!rejectReason.trim()) { setError('Rejection reason required'); return; }
        await rejectFeeRefund(id, rejectReason);
        setRejectId(null);
        setRejectReason('');
      } else await processFeeRefund(id, { paymentMode: 'BANK_TRANSFER' });
      setMessage(`Refund ${action === 'process' ? 'processed' : action + 'd'}`);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    }
  };

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="Fees & Finance"
        title="Refunds"
        subtitle="Request, approve, and process student fee refunds."
        actions={
          <>
            <button type="button" onClick={() => void load()} className={am.btnSecondary}>
              <RefreshCcw size={14} /> Refresh
            </button>
            <button type="button" onClick={() => setShowModal(true)} className={am.btnPrimary}>
              <Plus size={14} /> New Refund Request
            </button>
          </>
        }
      />
      <div className={am.content}>
        <FeeMessage message={message} type="success" />
        <FeeMessage message={error} type="error" />

        {loading ? <AcademicLoading /> : records.length === 0 ? (
          <EmptyState>No refund requests yet.</EmptyState>
        ) : (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead>
                <tr>
                  <th className={am.th}>Ref #</th>
                  <th className={am.th}>Student</th>
                  <th className={am.th}>Type</th>
                  <th className={am.th + ' text-right'}>Amount</th>
                  <th className={am.th}>Status</th>
                  <th className={am.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80">
                    <td className={am.td + ' font-mono text-xs'}>{row.recordId}</td>
                    <td className={am.td}>
                      <p className="font-semibold">{row.studentName}</p>
                      <p className="text-xs text-slate-500">{row.className} {row.admissionNumber && `· ${row.admissionNumber}`}</p>
                    </td>
                    <td className={am.td}><StatusBadge status={row.refundType} /></td>
                    <td className={am.td + ' text-right font-bold'}>{formatInr(row.amount)}</td>
                    <td className={am.td}><StatusBadge status={row.status} /></td>
                    <td className={am.td}>
                      <div className="flex flex-wrap gap-1">
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
                        {row.status === 'APPROVED' && (
                          <button type="button" onClick={() => void runAction('process', row.id)} className={am.btnSecondary + ' text-[10px] py-1 px-2'}>
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">Student Name *</label>
              <input className={am.input} value={form.studentName} onChange={(e) => setForm((f) => ({ ...f, studentName: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Admission No</label>
              <input className={am.input} value={form.admissionNumber} onChange={(e) => setForm((f) => ({ ...f, admissionNumber: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">Class</label>
              <input className={am.input} value={form.className} onChange={(e) => setForm((f) => ({ ...f, className: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Section</label>
              <input className={am.input} value={form.sectionName} onChange={(e) => setForm((f) => ({ ...f, sectionName: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">Refund Type</label>
              <select className={am.select + ' w-full'} value={form.refundType} onChange={(e) => setForm((f) => ({ ...f, refundType: e.target.value as FeeRefundType }))}>
                {REFUND_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Amount *</label>
              <input type="number" className={am.input} value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Reason</label>
            <textarea className={am.input} rows={2} value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">Original Receipt</label>
              <input className={am.input} value={form.originalReceipt} onChange={(e) => setForm((f) => ({ ...f, originalReceipt: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Payment Mode</label>
              <input className={am.input} value={form.paymentMode} onChange={(e) => setForm((f) => ({ ...f, paymentMode: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className={am.btnSecondary}>Cancel</button>
            <button type="button" onClick={() => void handleCreate()} className={am.btnPrimary} disabled={!form.studentName || !form.amount}>Submit</button>
          </div>
        </div>
      </AcademicModal>

      <AcademicModal open={!!rejectId} onClose={() => setRejectId(null)} title="Reject Refund">
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
