import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Plus, RefreshCcw } from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  collectFee,
  fetchFeeCollectionMeta,
  fetchFeeSchedule,
  type FeeStudent,
} from '../../../lib/feeCollectionServices';
import {
  exportOnlinePaymentsReport,
  fetchFeeDashboardMeta,
  formatInr,
  getOnlinePaymentsReport,
  type OnlinePaymentChannel,
  type OnlinePaymentsReport,
} from '../../../lib/feeFinanceServices';
import {
  AcademicLoading,
  AcademicModal,
  AcademicPageHeader,
  AcademicPageShell,
  am,
  FeeMessage,
} from './FeeFinanceUi';

const CATEGORY_OPTIONS = [
  { key: 'studentFee', label: 'Student Fee', feeKey: 'tuitionFee' },
  { key: 'hostelFee', label: 'Hostel Fee', feeKey: 'hostelFee' },
  { key: 'transportFee', label: 'Transport Fee', feeKey: 'transportFee' },
  { key: 'admissionFee', label: 'Admission Fee', feeKey: 'admissionFee' },
  { key: 'examinationFee', label: 'Examination Fee', feeKey: 'examinationFee' },
  { key: 'libraryFee', label: 'Library Fee', feeKey: 'libraryFee' },
  { key: 'fineCollection', label: 'Fine Collection', feeKey: 'lateFine' },
  { key: 'otherCollection', label: 'Other Collection', feeKey: 'miscellaneous' },
] as const;

const CHANNEL_OPTIONS = [
  { key: 'bankTransfer' as OnlinePaymentChannel, label: 'Bank Transfer', paymentMode: 'Bank Transfer' },
  { key: 'upi' as OnlinePaymentChannel, label: 'UPI', paymentMode: 'UPI' },
  { key: 'pos' as OnlinePaymentChannel, label: 'POS', paymentMode: 'Card' },
];

const FETCH_LABELS: Record<OnlinePaymentChannel | 'all', string> = {
  online: 'Online',
  bankTransfer: 'Bank Transfer',
  upi: 'UPI',
  pos: 'POS',
  all: 'all payment channels',
};

function currentPeriod() {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export function OnlinePaymentsView() {
  const [report, setReport] = useState<OnlinePaymentsReport | null>(null);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [years, setYears] = useState<string[]>(['2025-26']);
  const [period, setPeriod] = useState(currentPeriod());
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState<OnlinePaymentChannel | 'all' | ''>('');
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [students, setStudents] = useState<FeeStudent[]>([]);
  const [form, setForm] = useState({
    studentId: '',
    category: 'studentFee',
    channel: 'upi' as OnlinePaymentChannel,
    amount: '',
    remarks: '',
  });

  const load = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    setError('');
    try {
      const meta = await fetchFeeDashboardMeta();
      if (meta.academicYears?.length) setYears(meta.academicYears);
      const year = academicYear || meta.defaultAcademicYear || '2025-26';
      if (!academicYear && meta.defaultAcademicYear) setAcademicYear(meta.defaultAcademicYear);

      // Always load the full multi-channel matrix (no channel filter)
      const data = await getOnlinePaymentsReport({
        academicYear: year,
        year: String(period.year),
        month: String(period.month),
      });
      setReport(data);
      setLastSynced(data.fetchedAt);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load online payments');
      return false;
    } finally {
      setLoading(false);
      setFetching('');
    }
  }, [academicYear, period.year, period.month]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Fetch buttons refresh the entire matrix (all channels) simultaneously. */
  const fetchChannel = async (channel: OnlinePaymentChannel | 'all') => {
    setFetching(channel);
    const ok = await load();
    if (ok) {
      setMessage(
        `Synced ${FETCH_LABELS[channel]} into the collection matrix — Online, Bank Transfer, UPI and POS are shown together.`,
      );
    }
  };

  const handleExport = async () => {
    setError('');
    try {
      const data = await exportOnlinePaymentsReport({
        academicYear,
        year: String(period.year),
        month: String(period.month),
      });
      const rows = [
        ...data.matrix.map((r) => ({
          'Collection Head': r.label,
          Online: r.online,
          'Bank Transfer': r.bankTransfer,
          UPI: r.upi,
          POS: r.pos,
          Total: r.total,
        })),
        {
          'Collection Head': 'Total',
          Online: data.columnTotals.online,
          'Bank Transfer': data.columnTotals.bankTransfer,
          UPI: data.columnTotals.upi,
          POS: data.columnTotals.pos,
          Total: data.columnTotals.total,
        },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Online Payments');
      XLSX.writeFile(
        wb,
        `Online_Payments_${data.periodLabel.replace(/\s+/g, '_')}.xlsx`,
      );
      setMessage('Excel report downloaded (full matrix)');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed');
    }
  };

  const openCreate = async () => {
    try {
      const meta = await fetchFeeCollectionMeta();
      setStudents(meta.students);
      setForm({
        studentId: meta.students[0]?.admissionRecordId || '',
        category: 'studentFee',
        channel: 'upi',
        amount: '',
        remarks: '',
      });
      setShowModal(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to open form');
    }
  };

  const handleCreate = async () => {
    setError('');
    const student = students.find((s) => s.admissionRecordId === form.studentId);
    if (!student) {
      setError('Select a student');
      return;
    }
    const amount = Number(form.amount);
    if (!amount || amount <= 0) {
      setError('Enter a valid amount');
      return;
    }
    const cat = CATEGORY_OPTIONS.find((c) => c.key === form.category);
    const ch = CHANNEL_OPTIONS.find((c) => c.key === form.channel);
    if (!cat || !ch) return;

    try {
      await fetchFeeSchedule(student.className, student.sectionName);
      await collectFee({
        admissionRecordId: student.admissionRecordId,
        paymentMode: ch.paymentMode,
        feeItems: [{ key: cat.feeKey, label: cat.label, amount }],
        remarks: form.remarks.trim() || `Online payment — ${cat.label} via ${ch.label}`,
      });
      setMessage(`Payment recorded via ${ch.label}`);
      setShowModal(false);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Payment recording failed');
    }
  };

  const matrixRows = useMemo(() => report?.matrix || [], [report]);
  const monthTotal = report?.totalCollected ?? report?.columnTotals?.total ?? 0;

  if (loading && !report) {
    return <AcademicLoading label="Loading online payments…" />;
  }

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="Fees & Finance › Online Payments"
        title="Online Payments"
        subtitle="Bank, UPI, POS & Online collection matrix — all channels sync into one report"
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
            <input
              type="month"
              className={am.select}
              value={`${period.year}-${String(period.month).padStart(2, '0')}`}
              onChange={(e) => {
                const [y, m] = e.target.value.split('-').map(Number);
                if (y && m) setPeriod({ year: y, month: m });
              }}
            />
            <button type="button" onClick={() => void load()} className={am.btnSecondary}>
              <RefreshCcw size={14} /> Refresh
            </button>
            <button type="button" onClick={() => void handleExport()} className={am.btnSecondary}>
              <Download size={14} /> Export Excel
            </button>
            <button type="button" onClick={() => void openCreate()} className={am.btnPrimary}>
              <Plus size={14} /> Add New
            </button>
          </>
        }
      />

      <div className={am.content}>
        {message && <FeeMessage message={message} type="success" />}
        {error && <FeeMessage message={error} type="error" />}

        <div className="flex flex-wrap items-stretch gap-3">
          <button
            type="button"
            disabled={!!fetching}
            onClick={() => void fetchChannel('bankTransfer')}
            className="flex-1 min-w-[160px] bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl px-4 py-3 text-sm font-bold shadow-sm hover:opacity-95 disabled:opacity-60"
          >
            {fetching === 'bankTransfer' ? 'Syncing…' : 'Fetch bank transfer reports'}
          </button>
          <button
            type="button"
            disabled={!!fetching}
            onClick={() => void fetchChannel('upi')}
            className="flex-1 min-w-[160px] bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-900 rounded-xl px-4 py-3 text-sm font-bold shadow-sm hover:opacity-95 disabled:opacity-60"
          >
            {fetching === 'upi' ? 'Syncing…' : 'Fetch UPI reports'}
          </button>
          <button
            type="button"
            disabled={!!fetching}
            onClick={() => void fetchChannel('pos')}
            className="flex-1 min-w-[160px] bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-xl px-4 py-3 text-sm font-bold shadow-sm hover:opacity-95 disabled:opacity-60"
          >
            {fetching === 'pos' ? 'Syncing…' : 'Fetch POS reports'}
          </button>
          <button
            type="button"
            disabled={!!fetching}
            onClick={() => void fetchChannel('all')}
            className="flex-1 min-w-[160px] bg-gradient-to-r from-indigo-600 to-blue-500 text-white rounded-xl px-4 py-3 text-sm font-bold shadow-sm hover:opacity-95 disabled:opacity-60"
          >
            {fetching === 'all' ? 'Syncing…' : 'Fetch all channels'}
          </button>
          <div className="bg-white border border-slate-200 rounded-xl px-5 py-3 min-w-[160px] shadow-sm">
            <p className="text-[10px] font-bold uppercase text-slate-500 tracking-wide">This Month</p>
            <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{formatInr(monthTotal)}</p>
            <p className="text-[10px] text-slate-400">{report?.periodLabel}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {report?.transactionCount ?? 0} transaction{(report?.transactionCount || 0) === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
          Showing <strong>all payment channels</strong> together (Online · Bank Transfer · UPI · POS) for{' '}
          {report?.periodLabel}. Each Fetch button refreshes the full matrix — it does not filter columns.
          {lastSynced && (
            <span className="text-slate-400"> · Last synced {new Date(lastSynced).toLocaleString('en-IN')}</span>
          )}
        </div>

        {loading ? (
          <AcademicLoading />
        ) : (
          <div className={am.tableWrap}>
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="bg-slate-50">
                  <th className={`${am.th} text-left`}>Collection Head</th>
                  <th className={`${am.th} text-right`}>Online</th>
                  <th className={`${am.th} text-right`}>Bank Transfer</th>
                  <th className={`${am.th} text-right`}>UPI</th>
                  <th className={`${am.th} text-right`}>POS</th>
                  <th className={`${am.th} text-right font-bold`}>Total</th>
                </tr>
              </thead>
              <tbody>
                {matrixRows.map((row) => (
                  <tr key={row.category} className="hover:bg-slate-50/80">
                    <td className={`${am.td} font-semibold`}>{row.label}</td>
                    <td className={`${am.td} text-right`}>{formatInr(row.online)}</td>
                    <td className={`${am.td} text-right`}>{formatInr(row.bankTransfer)}</td>
                    <td className={`${am.td} text-right`}>{formatInr(row.upi)}</td>
                    <td className={`${am.td} text-right`}>{formatInr(row.pos)}</td>
                    <td className={`${am.td} text-right font-bold`}>{formatInr(row.total)}</td>
                  </tr>
                ))}
                {report && (
                  <tr className="bg-blue-50 font-bold">
                    <td className={am.td}>Total</td>
                    <td className={`${am.td} text-right`}>{formatInr(report.columnTotals.online)}</td>
                    <td className={`${am.td} text-right`}>{formatInr(report.columnTotals.bankTransfer)}</td>
                    <td className={`${am.td} text-right`}>{formatInr(report.columnTotals.upi)}</td>
                    <td className={`${am.td} text-right`}>{formatInr(report.columnTotals.pos)}</td>
                    <td className={`${am.td} text-right`}>{formatInr(report.columnTotals.total)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-[11px] text-slate-400">
          Data from fee receipts, transport/hostel collections, mobile payment orders &amp; paid fines for{' '}
          {report?.periodLabel}. Cash collections are excluded. Export downloads the full matrix as Excel.
        </p>
      </div>

      <AcademicModal open={showModal} onClose={() => setShowModal(false)} title="Record Online Payment" large>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-600">Student *</label>
            <select
              className={`${am.select} w-full`}
              value={form.studentId}
              onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value }))}
            >
              <option value="">Select student</option>
              {students.map((s) => (
                <option key={s.admissionRecordId} value={s.admissionRecordId}>
                  {s.studentName} — Class {s.className}-{s.sectionName}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">Collection Head</label>
              <select
                className={`${am.select} w-full`}
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c.key} value={c.key}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Payment Channel</label>
              <select
                className={`${am.select} w-full`}
                value={form.channel}
                onChange={(e) =>
                  setForm((f) => ({ ...f, channel: e.target.value as OnlinePaymentChannel }))
                }
              >
                {CHANNEL_OPTIONS.map((c) => (
                  <option key={c.key} value={c.key}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Amount (₹) *</label>
            <input
              type="number"
              className={am.input}
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
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
              disabled={!form.studentId || !form.amount}
            >
              Record Payment
            </button>
          </div>
        </div>
      </AcademicModal>
    </AcademicPageShell>
  );
}
