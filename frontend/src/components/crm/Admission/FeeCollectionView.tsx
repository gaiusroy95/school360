import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  IndianRupee,
  Loader2,
  Search,
  Printer,
  Receipt,
  CheckCircle,
  AlertCircle,
  Users,
  FileText,
  Settings,
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import {
  collectFee,
  fetchFeeCollectionMeta,
  fetchFeeReceipts,
  fetchFeeSchedule,
  type FeeHead,
  type FeeReceipt,
  type FeeStudent,
  type InstitutionProfile,
} from '../../../lib/feeCollectionServices';

function formatCurrency(amount: number, currency = 'INR') {
  if (currency === 'INR') return `₹ ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `${currency} ${amount.toFixed(2)}`;
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function FeeReceiptPrint({
  receipt,
  institution,
}: {
  receipt: FeeReceipt;
  institution: InstitutionProfile;
}) {
  const inst = receipt.institution?.name ? receipt.institution : institution;
  const address = [
    inst.addressLine1,
    inst.addressLine2,
    [inst.city, inst.state, inst.pincode].filter(Boolean).join(', '),
    inst.country,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="fee-receipt-print bg-white text-slate-900 p-8 max-w-lg mx-auto text-sm">
      <div className="text-center border-b-2 border-slate-800 pb-4 mb-4">
        <h1 className="text-xl font-bold uppercase tracking-wide">{inst.name}</h1>
        {inst.shortName && <p className="text-xs text-slate-500">{inst.shortName}</p>}
        {address && <p className="text-xs text-slate-600 mt-2">{address}</p>}
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[10px] text-slate-500 mt-2">
          {inst.phone && <span>Ph: {inst.phone}</span>}
          {inst.email && <span>{inst.email}</span>}
          {inst.registrationNo && <span>Reg: {inst.registrationNo}</span>}
          {inst.affiliationNo && <span>Aff: {inst.affiliationNo}</span>}
        </div>
      </div>

      <div className="text-center mb-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Fee Receipt</p>
        <p className="text-lg font-bold font-mono mt-1">{receipt.receiptNumber}</p>
        <p className="text-[10px] text-slate-500">{formatDateTime(receipt.collectedAt)}</p>
      </div>

      <table className="w-full text-xs mb-4">
        <tbody>
          <tr>
            <td className="py-1 text-slate-500 w-32">Student Name</td>
            <td className="py-1 font-semibold">{receipt.studentName}</td>
          </tr>
          {receipt.admissionNumber && (
            <tr>
              <td className="py-1 text-slate-500">Admission No.</td>
              <td className="py-1 font-mono">{receipt.admissionNumber}</td>
            </tr>
          )}
          <tr>
            <td className="py-1 text-slate-500">Class / Section</td>
            <td className="py-1">
              {receipt.className}
              {receipt.sectionName ? ` — ${receipt.sectionName}` : ''}
            </td>
          </tr>
          <tr>
            <td className="py-1 text-slate-500">Academic Year</td>
            <td className="py-1">{receipt.academicYear}</td>
          </tr>
          <tr>
            <td className="py-1 text-slate-500">Payment Mode</td>
            <td className="py-1">{receipt.paymentMode}</td>
          </tr>
          <tr>
            <td className="py-1 text-slate-500">Collected By</td>
            <td className="py-1">{receipt.collectedBy}</td>
          </tr>
        </tbody>
      </table>

      <table className="w-full text-xs border border-slate-200 mb-4">
        <thead>
          <tr className="bg-slate-100">
            <th className="text-left p-2 font-semibold">Fee Head</th>
            <th className="text-right p-2 font-semibold">Amount</th>
          </tr>
        </thead>
        <tbody>
          {receipt.feeBreakdown.map((item) => (
            <tr key={item.key} className="border-t border-slate-100">
              <td className="p-2">{item.label}</td>
              <td className="p-2 text-right font-mono">
                {formatCurrency(item.amount, inst.currency)}
              </td>
            </tr>
          ))}
          <tr className="border-t-2 border-slate-800 font-bold">
            <td className="p-2">Total Paid</td>
            <td className="p-2 text-right font-mono">
              {formatCurrency(receipt.amountPaid, inst.currency)}
            </td>
          </tr>
        </tbody>
      </table>

      {receipt.remarks && (
        <p className="text-xs text-slate-600 mb-4">
          <span className="font-semibold">Remarks:</span> {receipt.remarks}
        </p>
      )}

      <p className="text-[10px] text-slate-500 text-center border-t border-slate-200 pt-4">
        {inst.receiptFooter ||
          'This is a computer-generated fee receipt. Please retain for your records.'}
      </p>
    </div>
  );
}

export function FeeCollectionView() {
  const { user } = useAuth();
  const printRef = useRef<HTMLDivElement>(null);

  const [meta, setMeta] = useState<Awaited<ReturnType<typeof fetchFeeCollectionMeta>> | null>(null);
  const [receipts, setReceipts] = useState<FeeReceipt[]>([]);
  const [tab, setTab] = useState<'collect' | 'history'>('collect');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [scheduleHeads, setScheduleHeads] = useState<FeeHead[]>([]);
  const [scheduleHint, setScheduleHint] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [remarks, setRemarks] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [printReceipt, setPrintReceipt] = useState<FeeReceipt | null>(null);

  const selectedStudent = useMemo(
    () => meta?.students.find((s) => s.admissionRecordId === selectedStudentId) || null,
    [meta, selectedStudentId],
  );

  const totalSelected = useMemo(() => {
    return scheduleHeads
      .filter((h) => selectedKeys.has(h.key))
      .reduce((s, h) => s + h.amount, 0);
  }, [scheduleHeads, selectedKeys]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [metaRes, receiptsRes] = await Promise.all([
        fetchFeeCollectionMeta(),
        fetchFeeReceipts(),
      ]);
      setMeta(metaRes);
      setReceipts(receiptsRes.receipts);
      if (!selectedStudentId && metaRes.students[0]) {
        setSelectedStudentId(metaRes.students[0].admissionRecordId);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load fee collection');
    } finally {
      setLoading(false);
    }
  }, [selectedStudentId]);

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadScheduleForStudent = useCallback(
    async (student: FeeStudent) => {
      try {
        const res = await fetchFeeSchedule(student.className, student.sectionName);
        setScheduleHeads(res.schedule.heads);
        setSelectedKeys(new Set(res.schedule.heads.map((h) => h.key)));
        setScheduleHint('');
        setErrorMsg(null);
      } catch (err) {
        setScheduleHeads([]);
        setSelectedKeys(new Set());
        const message = err instanceof Error ? err.message : 'Failed to load fee schedule';
        setScheduleHint(message);
      }
    },
    [],
  );

  useEffect(() => {
    if (!selectedStudent) {
      setScheduleHeads([]);
      setSelectedKeys(new Set());
      setScheduleHint('');
      return;
    }
    void loadScheduleForStudent(selectedStudent);
  }, [selectedStudent, loadScheduleForStudent]);

  const toggleFeeHead = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleCollect = async () => {
    if (!selectedStudent) {
      setErrorMsg('Select a student with confirmed admission');
      return;
    }
    const feeItems = scheduleHeads.filter((h) => selectedKeys.has(h.key));
    if (feeItems.length === 0) {
      setErrorMsg('Select at least one fee head');
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await collectFee({
        admissionRecordId: selectedStudent.admissionRecordId,
        paymentMode,
        feeItems,
        remarks: remarks.trim() || undefined,
        amountPaid: totalSelected,
      });
      setSuccessMsg(res.message);
      setPrintReceipt(res.receipt);
      setRemarks('');
      const receiptsRes = await fetchFeeReceipts();
      setReceipts(receiptsRes.receipts);
      const metaRes = await fetchFeeCollectionMeta();
      setMeta(metaRes);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Fee collection failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const institution = meta?.institution;

  return (
    <div className="h-full bg-slate-50 flex flex-col p-6 overflow-hidden">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .fee-receipt-print, .fee-receipt-print * { visibility: visible; }
          .fee-receipt-print { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="no-print flex flex-wrap items-start justify-between gap-4 mb-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <IndianRupee className="text-emerald-600" size={28} />
            Fee Collection
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Collect admission fees for confirmed students. Fee structure is configured in{' '}
            <span className="font-semibold">Institution Setup → Fee Group Setup</span>.
          </p>
        </div>
      </div>

      {(errorMsg || successMsg) && (
        <div
          className={`no-print mb-3 px-4 py-3 rounded-lg text-sm flex items-center gap-2 shrink-0 ${
            errorMsg
              ? 'bg-red-50 text-red-700 border border-red-100'
              : 'bg-green-50 text-green-700 border border-green-100'
          }`}
        >
          {errorMsg ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
          {errorMsg || successMsg}
        </div>
      )}

      {meta && !meta.feeConfigured && (
        <div className="no-print mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3 text-sm text-amber-900 shrink-0">
          <Settings className="shrink-0 text-amber-600" size={20} />
          <div>
            <p className="font-semibold">Fee structure not configured</p>
            <p className="text-xs mt-1">{meta.setupHint}</p>
          </div>
        </div>
      )}

      <div className="no-print grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 shrink-0">
        {[
          { label: 'Confirmed Students', value: meta?.summary.confirmedAdmissions ?? 0, icon: Users },
          { label: 'Receipts Issued', value: meta?.summary.totalReceipts ?? 0, icon: Receipt },
          {
            label: 'Total Collected',
            value: formatCurrency(meta?.summary.totalCollected ?? 0, meta?.currency),
            icon: IndianRupee,
          },
          { label: 'Fee Schedules', value: meta?.schedules.length ?? 0, icon: FileText },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <card.icon size={14} className="text-emerald-600" />
              {card.label}
            </div>
            <p className="text-lg font-bold text-slate-800">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="no-print flex gap-1 mb-4 bg-white p-1 rounded-lg border border-slate-200 w-fit shrink-0">
        <button
          type="button"
          onClick={() => setTab('collect')}
          className={`px-4 py-2 text-sm font-semibold rounded-md ${
            tab === 'collect' ? 'bg-emerald-600 text-white' : 'text-slate-600'
          }`}
        >
          Collect Fee
        </button>
        <button
          type="button"
          onClick={() => setTab('history')}
          className={`px-4 py-2 text-sm font-semibold rounded-md ${
            tab === 'history' ? 'bg-emerald-600 text-white' : 'text-slate-600'
          }`}
        >
          Receipt History
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-slate-400 gap-2">
          <Loader2 className="animate-spin" size={20} /> Loading…
        </div>
      ) : tab === 'collect' ? (
        <div className="no-print flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0 overflow-hidden">
          <div className="bg-white rounded-xl border border-slate-200 p-5 overflow-y-auto">
            <h2 className="text-sm font-bold text-slate-800 mb-4">Cashier — Collect Fee</h2>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">
                  Student (Confirmed Admission)
                </label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Select student…</option>
                  {(meta?.students || []).map((s) => (
                    <option key={s.admissionRecordId} value={s.admissionRecordId}>
                      {s.studentName} — {s.admissionNumber || s.className} ({s.className}
                      {s.sectionName ? `-${s.sectionName}` : ''})
                    </option>
                  ))}
                </select>
                {meta?.students.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    No confirmed admissions yet. Confirm admissions first in the Admissions module.
                  </p>
                )}
              </div>

              {selectedStudent && (
                <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-600 space-y-1">
                  <p>
                    <span className="font-semibold">Father:</span> {selectedStudent.fatherName || '—'}
                  </p>
                  <p>
                    <span className="font-semibold">Mobile:</span> {selectedStudent.mobile || '—'}
                  </p>
                  <p>
                    <span className="font-semibold">Class:</span> {selectedStudent.className}
                    {selectedStudent.sectionName ? ` — ${selectedStudent.sectionName}` : ''} · AY{' '}
                    {selectedStudent.academicYear}
                  </p>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-600">Fee Heads (from Setup)</label>
                  {scheduleHeads.length > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedKeys(
                          selectedKeys.size === scheduleHeads.length
                            ? new Set()
                            : new Set(scheduleHeads.map((h) => h.key)),
                        )
                      }
                      className="text-[10px] text-emerald-600 font-semibold"
                    >
                      {selectedKeys.size === scheduleHeads.length ? 'Deselect all' : 'Select all'}
                    </button>
                  )}
                </div>
                {scheduleHeads.length === 0 ? (
                  <div className="text-sm text-slate-500 py-4 px-3 text-center border border-dashed border-slate-200 rounded-lg space-y-2">
                    <p>
                      No fee heads for{' '}
                      <span className="font-semibold text-slate-700">
                        {selectedStudent?.className}
                        {selectedStudent?.sectionName ? ` — ${selectedStudent.sectionName}` : ''}
                      </span>
                      .
                    </p>
                    {scheduleHint ? (
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1.5">
                        {scheduleHint}
                      </p>
                    ) : (
                      <p className="text-xs">
                        Add class-wise fee amounts in{' '}
                        <span className="font-semibold">Institution Setup → Fee Group Setup → Records / Master List</span>,
                        then save configuration.
                      </p>
                    )}
                    {meta && meta.schedules.length > 0 && (
                      <p className="text-[10px] text-slate-400">
                        Configured classes:{' '}
                        {meta.schedules
                          .filter((s) => s.heads.length > 0)
                          .map((s) => `${s.class}${s.section ? `-${s.section}` : ''}`)
                          .join(', ') || 'rows exist but fee amounts are empty'}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto border border-slate-100 rounded-lg p-2">
                    {scheduleHeads.map((head) => (
                      <label
                        key={head.key}
                        className="flex items-center justify-between gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedKeys.has(head.key)}
                            onChange={() => toggleFeeHead(head.key)}
                            className="accent-emerald-600"
                          />
                          <span className="text-sm text-slate-700">{head.label}</span>
                        </div>
                        <span className="text-sm font-mono font-semibold text-slate-800">
                          {formatCurrency(head.amount, meta?.currency)}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Payment Mode</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  >
                    {(meta?.paymentModes || []).map((m) => (
                      <option key={m.key} value={m.label}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Total</label>
                  <div className="px-3 py-2 bg-emerald-50 border border-emerald-100 rounded-lg text-lg font-bold text-emerald-800">
                    {formatCurrency(totalSelected, meta?.currency)}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">Remarks (optional)</label>
                <input
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Admission fee — first installment"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <button
                type="button"
                disabled={submitting || !selectedStudent || totalSelected <= 0}
                onClick={() => void handleCollect()}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-lg flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Receipt size={18} />
                )}
                Collect Fee &amp; Generate Receipt
              </button>
              <p className="text-[10px] text-slate-400 text-center">
                Cashier: {user?.email || 'Staff'}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 overflow-y-auto flex flex-col">
            <h2 className="text-sm font-bold text-slate-800 mb-4">Receipt Preview</h2>
            {printReceipt && institution ? (
              <>
                <div ref={printRef} className="flex-1 overflow-y-auto border border-slate-100 rounded-lg">
                  <FeeReceiptPrint receipt={printReceipt} institution={institution} />
                </div>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="mt-4 w-full py-2.5 border border-slate-200 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:bg-slate-50"
                >
                  <Printer size={16} /> Print Receipt for Customer
                </button>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-sm text-center p-8">
                <Receipt size={40} className="mb-3 opacity-30" />
                <p>Collect a fee to generate and preview the receipt here.</p>
                <p className="text-xs mt-2">Receipt includes institution details from Basic Information setup.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="no-print flex-1 bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col min-h-0">
          <div className="p-4 border-b border-slate-100 flex gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    void fetchFeeReceipts({ q: searchQuery }).then((r) => setReceipts(r.receipts));
                  }
                }}
                placeholder="Search receipt #, student, admission #…"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>
            <button
              type="button"
              onClick={() =>
                void fetchFeeReceipts({ q: searchQuery || undefined }).then((r) => setReceipts(r.receipts))
              }
              className="px-4 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-lg"
            >
              Search
            </button>
          </div>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-600 uppercase">
                <tr>
                  <th className="text-left p-3 font-semibold">Receipt #</th>
                  <th className="text-left p-3 font-semibold">Student</th>
                  <th className="text-left p-3 font-semibold">Class</th>
                  <th className="text-left p-3 font-semibold">Amount</th>
                  <th className="text-left p-3 font-semibold">Mode</th>
                  <th className="text-left p-3 font-semibold">Date</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {receipts.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono text-xs font-semibold text-emerald-700">
                      {r.receiptNumber}
                    </td>
                    <td className="p-3">
                      <p className="font-medium">{r.studentName}</p>
                      <p className="text-[10px] text-slate-400">{r.admissionNumber}</p>
                    </td>
                    <td className="p-3 text-slate-600">
                      {r.className}
                      {r.sectionName ? `-${r.sectionName}` : ''}
                    </td>
                    <td className="p-3 font-semibold">
                      {formatCurrency(r.amountPaid, meta?.currency)}
                    </td>
                    <td className="p-3 text-slate-600">{r.paymentMode}</td>
                    <td className="p-3 text-xs text-slate-500">{formatDateTime(r.collectedAt)}</td>
                    <td className="p-3">
                      <button
                        type="button"
                        onClick={() => {
                          setPrintReceipt(r);
                          setTab('collect');
                        }}
                        className="text-xs text-indigo-600 font-semibold hover:underline"
                      >
                        View / Print
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {receipts.length === 0 && (
              <p className="text-center text-slate-500 py-12 text-sm">No receipts yet</p>
            )}
          </div>
        </div>
      )}

      {/* Hidden print-only receipt */}
      {printReceipt && institution && (
        <div className="hidden print:block">
          <FeeReceiptPrint receipt={printReceipt} institution={institution} />
        </div>
      )}
    </div>
  );
}
