import { useCallback, useEffect, useState } from 'react';
import {
  IndianRupee, RefreshCw, CreditCard, FileText, Users, AlertCircle,
  CheckCircle2, XCircle, Receipt, Shield,
} from 'lucide-react';
import {
  fetchFineManagement,
  collectLibraryFinePayment,
  requestLibraryFineWaiver,
  approveLibraryFineWaiver,
  accrueLibraryFines,
  type FineManagement,
  type FineRecord,
} from '../../../lib/libraryServices';
import { AcademicLoading, AcademicModal, StatusBadge, FeeMessage, FeeTabs } from '../FeeFinanceManagement/FeeFinanceUi';

export function FineManagementView() {
  const [data, setData] = useState<FineManagement | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('Ledger');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [paymentModal, setPaymentModal] = useState(false);
  const [waiverModal, setWaiverModal] = useState(false);
  const [receiptModal, setReceiptModal] = useState<Record<string, unknown> | null>(null);
  const [selectedFine, setSelectedFine] = useState<FineRecord | null>(null);

  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    paymentMethod: 'CASH',
    transactionRef: '',
    collectedBy: 'Librarian',
  });
  const [waiverForm, setWaiverForm] = useState({
    waiverAmount: 0,
    reason: '',
    requestedBy: 'Librarian',
  });

  const load = useCallback(async (seed = false, memberId?: string) => {
    setLoading(true);
    try {
      const result = await fetchFineManagement(seed, memberId || selectedMemberId || undefined);
      setData(result);
      if (!selectedMemberId && result.members[0]) setSelectedMemberId(result.members[0].id);
    } finally {
      setLoading(false);
    }
  }, [selectedMemberId]);

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    if (selectedMemberId) void load(false, selectedMemberId);
  }, [selectedMemberId]);

  const flash = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 6000);
  };

  const ledger = data?.memberLedger;

  const handlePayment = async () => {
    if (!selectedMemberId || paymentForm.amount <= 0) {
      flash('Enter a valid payment amount', 'error');
      return;
    }
    try {
      const result = await collectLibraryFinePayment({
        memberId: selectedMemberId,
        amount: paymentForm.amount,
        paymentMethod: paymentForm.paymentMethod,
        transactionRef: paymentForm.transactionRef || undefined,
        collectedBy: paymentForm.collectedBy,
        fineIds: selectedFine ? [selectedFine.id] : undefined,
      });
      setData(result.data);
      setPaymentModal(false);
      setReceiptModal(result.receipt);
      flash(`Payment collected — Receipt ${result.receiptNo}`, 'success');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Payment failed', 'error');
    }
  };

  const handleWaiver = async () => {
    if (!selectedFine || waiverForm.waiverAmount <= 0) {
      flash('Select a fine and enter waiver amount', 'error');
      return;
    }
    try {
      const result = await requestLibraryFineWaiver({
        fineId: selectedFine.id,
        waiverAmount: waiverForm.waiverAmount,
        reason: waiverForm.reason,
        requestedBy: waiverForm.requestedBy,
      });
      setData(result.data);
      setWaiverModal(false);
      flash(result.message, result.requiresPrincipal ? 'info' : 'success');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Waiver failed', 'error');
    }
  };

  const handleApproveWaiver = async (waiverId: string, approve: boolean) => {
    try {
      const result = await approveLibraryFineWaiver(waiverId, 'Principal', approve);
      setData(result.data);
      flash(result.message, approve ? 'success' : 'info');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Failed', 'error');
    }
  };

  const handleAccrue = async () => {
    try {
      const result = await accrueLibraryFines();
      setData(result.data);
      flash(result.message, 'success');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Accrual failed', 'error');
    }
  };

  if (loading && !data) return <AcademicLoading />;

  return (
    <div className="flex flex-col space-y-4 h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Fine Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Track, collect & waive overdue/lost/damage fines · integrates with central fee ledger
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => void handleAccrue()} className="px-3 py-1.5 text-xs border border-amber-200 text-amber-800 rounded-lg font-semibold">
            Run Daily Accrual
          </button>
          <button type="button" onClick={() => void load()} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {message && <FeeMessage message={message} type={messageType} />}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Collected (Month)', value: data?.kpis.collectedThisMonthFormatted ?? '₹ 0', icon: <IndianRupee size={16} /> },
          { label: 'Pending Fines', value: data?.kpis.pendingTotalFormatted ?? '₹ 0', icon: <AlertCircle size={16} /> },
          { label: 'Defaulters', value: data?.kpis.defaultersCount ?? 0, icon: <Users size={16} /> },
          { label: "Today's Collection", value: data?.kpis.todayCollectionFormatted ?? '₹ 0', icon: <Receipt size={16} /> },
        ].map((k) => (
          <div key={k.label} className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">{k.icon}</div>
            <div>
              <p className="text-[9px] text-slate-500">{k.label}</p>
              <p className="font-bold text-slate-900 text-lg">{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      <FeeTabs tabs={['Ledger', 'Payments', 'Waivers', 'Reports']} active={tab} onChange={setTab} />

      {tab === 'Ledger' && (
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1 bg-white border border-slate-200 rounded-xl p-4">
            <label className="block space-y-1 mb-3">
              <span className="text-xs font-semibold text-slate-600">Member</span>
              <select
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="w-full text-sm border rounded-lg px-3 py-2"
              >
                {(data?.members ?? []).map((m) => (
                  <option key={m.id} value={m.id}>{m.name} ({m.code}) — {m.className}</option>
                ))}
              </select>
            </label>
            {ledger && (
              <div className="space-y-3">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="font-semibold text-slate-800">{ledger.member.name}</p>
                  <p className="text-xs text-slate-500">{ledger.member.code} · {ledger.member.className}</p>
                  <p className="text-lg font-bold text-rose-600 mt-2">{ledger.outstandingFormatted}</p>
                  <p className="text-[10px] text-slate-500">Outstanding balance</p>
                  {ledger.noDuesBlocked && (
                    <p className="text-[10px] text-amber-700 mt-1 flex items-center gap-1">
                      <Shield size={10} /> No Dues certificate blocked
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => { setPaymentForm((f) => ({ ...f, amount: ledger.outstanding })); setPaymentModal(true); }}
                  disabled={ledger.outstanding <= 0}
                  className="w-full py-2 bg-rose-600 text-white text-xs font-semibold rounded-lg disabled:opacity-40"
                >
                  <CreditCard size={14} className="inline mr-1" /> Collect Payment
                </button>
              </div>
            )}
          </div>

          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-4">
            <h3 className="text-sm font-bold text-slate-800 mb-3">Member Ledger</h3>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 border-b">
                  <th className="text-left py-2">Ref</th>
                  <th className="text-left">Type</th>
                  <th className="text-left">Description</th>
                  <th className="text-right">Amount</th>
                  <th className="text-right">Balance</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(ledger?.fines ?? []).map((f) => (
                  <tr key={f.id} className="border-b border-slate-50">
                    <td className="py-2 font-mono text-[10px]">{f.transactionRef}</td>
                    <td><StatusBadge status={f.fineType === 'OVERDUE' ? 'ACTIVE' : 'INACTIVE'} /></td>
                    <td className="max-w-[180px] truncate">{f.description || f.bookTitle}</td>
                    <td className="text-right">{f.amountFormatted}</td>
                    <td className="text-right font-semibold text-rose-600">{f.balanceFormatted}</td>
                    <td className="text-center">
                      {f.balance > 0 && (
                        <div className="flex justify-center gap-1">
                          <button type="button" onClick={() => { setSelectedFine(f); setPaymentForm((p) => ({ ...p, amount: f.balance })); setPaymentModal(true); }} className="text-[10px] text-rose-600">Pay</button>
                          <button type="button" onClick={() => { setSelectedFine(f); setWaiverForm((w) => ({ ...w, waiverAmount: f.balance })); setWaiverModal(true); }} className="text-[10px] text-amber-600">Waive</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!ledger?.fines.length && <p className="text-xs text-slate-400 text-center py-8">No fines for this member</p>}
          </div>
        </div>
      )}

      {tab === 'Payments' && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h3 className="text-sm font-bold text-slate-800 mb-3">Daily Collection Register</h3>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500 border-b">
                <th className="text-left py-2">Receipt</th>
                <th className="text-left">Member</th>
                <th className="text-left">Method</th>
                <th className="text-right">Amount</th>
                <th className="text-left">Time</th>
                <th className="text-left">Collected By</th>
              </tr>
            </thead>
            <tbody>
              {(data?.dailyCollectionRegister ?? []).map((p) => (
                <tr key={p.id} className="border-b border-slate-50">
                  <td className="py-2 font-mono">{p.receiptNo}</td>
                  <td>{p.memberName}</td>
                  <td>{p.paymentMethod}</td>
                  <td className="text-right font-semibold">{p.amountFormatted}</td>
                  <td>{p.time}</td>
                  <td>{p.collectedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h3 className="text-sm font-bold text-slate-800 mt-6 mb-3">Recent Payments (This Month)</h3>
          <div className="grid md:grid-cols-2 gap-2">
            {(data?.recentPayments ?? []).map((p) => (
              <div key={p.id} className="p-2 border border-slate-100 rounded-lg flex justify-between text-xs">
                <span>{p.memberName}</span>
                <span className="font-semibold text-emerald-600">{p.amountFormatted}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'Waivers' && (
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <AlertCircle size={14} className="text-amber-500" /> Pending Approvals
            </h3>
            <p className="text-[10px] text-slate-500 mb-2">
              Librarian waiver limit: {data?.settings.librarianWaiverThreshold ? `₹ ${data.settings.librarianWaiverThreshold}` : '₹ 100'} — above requires Principal
            </p>
            <div className="space-y-2">
              {(data?.pendingWaivers ?? []).map((w) => (
                <div key={w.id} className="p-3 border border-amber-100 bg-amber-50 rounded-lg text-xs">
                  <p className="font-semibold">{w.memberName} — {w.fineType}</p>
                  <p className="text-rose-600 font-bold">{w.waiverAmountFormatted}</p>
                  <p className="text-slate-500">{w.reason}</p>
                  <div className="flex gap-2 mt-2">
                    <button type="button" onClick={() => void handleApproveWaiver(w.id, true)} className="px-2 py-1 bg-emerald-600 text-white rounded text-[10px]">
                      <CheckCircle2 size={10} className="inline" /> Approve
                    </button>
                    <button type="button" onClick={() => void handleApproveWaiver(w.id, false)} className="px-2 py-1 border border-red-200 text-red-600 rounded text-[10px]">
                      <XCircle size={10} className="inline" /> Reject
                    </button>
                  </div>
                </div>
              ))}
              {!data?.pendingWaivers.length && <p className="text-slate-400 text-center py-6">No pending waivers</p>}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h3 className="text-sm font-bold text-slate-800 mb-3">Waived Fines Report</h3>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {(data?.waivedFinesReport ?? []).map((w) => (
                <div key={w.id} className="p-2 border border-slate-100 rounded-lg text-xs">
                  <p className="font-semibold">{w.memberName}</p>
                  <p className="text-emerald-600">{w.waiverAmountFormatted} — {w.fineType}</p>
                  <p className="text-slate-500">{w.reason}</p>
                  <p className="text-[10px] text-slate-400">Approved by {w.approvedBy}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'Reports' && (
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h3 className="text-sm font-bold text-slate-800 mb-3">Defaulters List</h3>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 border-b">
                  <th className="text-left py-2">Member</th>
                  <th className="text-left">Class</th>
                  <th className="text-right">Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {(data?.defaultersList ?? []).map((d) => (
                  <tr key={d.memberId} className="border-b border-slate-50 cursor-pointer hover:bg-slate-50" onClick={() => { setSelectedMemberId(d.memberId); setTab('Ledger'); }}>
                    <td className="py-2">{d.memberName}</td>
                    <td>{d.className}</td>
                    <td className="text-right font-semibold text-rose-600">{d.outstandingFormatted}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 text-xs text-rose-900 space-y-2">
            <p className="font-semibold flex items-center gap-1"><FileText size={14} /> Integration</p>
            <p>{data?.feeIntegration}</p>
            <p>{data?.financeIntegration}</p>
            <p className="text-rose-700">{data?.mobileSync.join(' · ')}</p>
            <ul className="mt-2 space-y-1">
              {(data?.automationRules ?? []).map((r) => <li key={r}>· {r}</li>)}
            </ul>
          </div>
        </div>
      )}

      <AcademicModal open={paymentModal} onClose={() => setPaymentModal(false)} title="Collect Fine Payment">
        <div className="space-y-3">
          <p className="text-xs text-slate-500">Partial payments supported — allocates to oldest fines first</p>
          <label className="block space-y-1">
            <span className="text-xs font-semibold">Amount *</span>
            <input type="number" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })} className="w-full text-sm border rounded-lg px-3 py-2" />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold">Payment Method</span>
            <select value={paymentForm.paymentMethod} onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })} className="w-full text-sm border rounded-lg px-3 py-2">
              {(data?.paymentMethods ?? ['CASH', 'ONLINE', 'UPI', 'CARD']).map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold">Transaction Ref (optional)</span>
            <input value={paymentForm.transactionRef} onChange={(e) => setPaymentForm({ ...paymentForm, transactionRef: e.target.value })} className="w-full text-sm border rounded-lg px-3 py-2" placeholder="Auto-generated if empty" />
          </label>
          <button type="button" onClick={() => void handlePayment()} className="w-full py-2 bg-rose-600 text-white text-sm font-semibold rounded-lg">
            Process Payment
          </button>
        </div>
      </AcademicModal>

      <AcademicModal open={waiverModal} onClose={() => setWaiverModal(false)} title="Request Fine Waiver">
        <div className="space-y-3">
          {selectedFine && <p className="text-xs text-slate-600">Fine balance: <strong>{selectedFine.balanceFormatted}</strong></p>}
          <label className="block space-y-1">
            <span className="text-xs font-semibold">Waiver Amount *</span>
            <input type="number" value={waiverForm.waiverAmount} onChange={(e) => setWaiverForm({ ...waiverForm, waiverAmount: Number(e.target.value) })} className="w-full text-sm border rounded-lg px-3 py-2" />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold">Reason</span>
            <textarea value={waiverForm.reason} onChange={(e) => setWaiverForm({ ...waiverForm, reason: e.target.value })} rows={2} className="w-full text-sm border rounded-lg px-3 py-2" />
          </label>
          <button type="button" onClick={() => void handleWaiver()} className="w-full py-2 bg-amber-600 text-white text-sm font-semibold rounded-lg">
            Submit Waiver Request
          </button>
        </div>
      </AcademicModal>

      <AcademicModal open={!!receiptModal} onClose={() => setReceiptModal(null)} title="Payment Receipt">
        {receiptModal && (
          <div className="space-y-2 text-sm border border-slate-200 rounded-lg p-4 bg-slate-50">
            <p className="font-bold text-center text-lg">Library Fine Receipt</p>
            <p><span className="text-slate-500">Receipt No:</span> {String(receiptModal.receiptNo)}</p>
            <p><span className="text-slate-500">Transaction:</span> {String(receiptModal.transactionRef)}</p>
            <p><span className="text-slate-500">Member:</span> {String(receiptModal.memberName)} ({String(receiptModal.memberCode)})</p>
            <p><span className="text-slate-500">Amount:</span> <strong className="text-emerald-600">{String(receiptModal.amountFormatted)}</strong></p>
            <p><span className="text-slate-500">Method:</span> {String(receiptModal.paymentMethod)}</p>
            <p className="text-[10px] text-slate-400 text-center mt-4">{String(receiptModal.institutionNote ?? '')}</p>
          </div>
        )}
      </AcademicModal>
    </div>
  );
}
