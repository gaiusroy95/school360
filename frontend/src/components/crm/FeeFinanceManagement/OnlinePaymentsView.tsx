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

function currentPeriod() {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export function OnlinePaymentsView() {
  const [report, setReport] = useState<OnlinePaymentsReport | null>(null);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [years, setYears] = useState<string[]>(['2025-26']);
  const [period, setPeriod] = useState(currentPeriod());
  const [channelFilter, setChannelFilter] = useState<OnlinePaymentChannel | ''>('');
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState<OnlinePaymentChannel | ''>('');
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

  const load = useCallback(
    async (channel?: OnlinePaymentChannel | '') => {
      setLoading(true);
      setError('');
      try {
        const meta = await fetchFeeDashboardMeta();
        if (meta.academicYears?.length) setYears(meta.academicYears);
        const year = academicYear || meta.defaultAcademicYear || '2025-26';
        if (!academicYear && meta.defaultAcademicYear) setAcademicYear(meta.defaultAcademicYear);

        const data = await getOnlinePaymentsReport({
          academicYear: year,
          year: String(period.year),
          month: String(period.month),
          channel: channel || undefined,
        });
        setReport(data);
        setChannelFilter(channel || '');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load online payments');
      } finally {
        setLoading(false);
        setFetching('');
      }
    },
    [academicYear, period.year, period.month],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const fetchChannel = async (channel: OnlinePaymentChannel) => {
    setFetching(channel);
    setMessage(`Fetched ${CHANNEL_OPTIONS.find((c) => c.key === channel)?.label} report`);
    await load(channel);
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
      setMessage('Excel report downloaded');
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
      void load(channelFilter || undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Payment recording failed');
    }
  };

  const matrixRows = useMemo(() => report?.matrix || [], [report]);

  if (loading && !report) {
    return <AcademicLoading label="Loading online payments…" />;
  }

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="Fees & Finance › Online Payments"
        title="Online Payments"
        subtitle="Bank, UPI & POS collection matrix — fetch reports and export to Excel"
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
            <button
              type="button"
              onClick={() => void load(channelFilter || undefined)}
              className={am.btnSecondary}
            >
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
            disabled={fetching === 'bankTransfer'}
            onClick={() => void fetchChannel('bankTransfer')}
            className="flex-1 min-w-[160px] bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl px-4 py-3 text-sm font-bold shadow-sm hover:opacity-95 disabled:opacity-60"
          >
            {fetching === 'bankTransfer' ? 'Fetching…' : 'Fetch bank transfer reports'}
          </button>
          <button
            type="button"
            disabled={fetching === 'upi'}
            onClick={() => void fetchChannel('upi')}
            className="flex-1 min-w-[160px] bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-900 rounded-xl px-4 py-3 text-sm font-bold shadow-sm hover:opacity-95 disabled:opacity-60"
          >
            {fetching === 'upi' ? 'Fetching…' : 'Fetch UPI reports'}
          </button>
          <button
            type="button"
            disabled={fetching === 'pos'}
            onClick={() => void fetchChannel('pos')}
            className="flex-1 min-w-[160px] bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-xl px-4 py-3 text-sm font-bold shadow-sm hover:opacity-95 disabled:opacity-60"
          >
            {fetching === 'pos' ? 'Fetching…' : 'Fetch POS reports'}
          </button>
          <div className="bg-white border border-slate-200 rounded-xl px-5 py-3 min-w-[120px] shadow-sm">
            <p className="text-[10px] font-bold uppercase text-slate-500 tracking-wide">This Month</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{report?.transactionCount ?? 0}</p>
            <p className="text-[10px] text-slate-400">{report?.periodLabel}</p>
          </div>
        </div>

        {channelFilter && (
          <div className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2 flex items-center justify-between">
            <span>
              Showing <strong>{CHANNEL_OPTIONS.find((c) => c.key === channelFilter)?.label}</strong> collections only
            </span>
            <button
              type="button"
              className="font-semibold underline"
              onClick={() => void load()}
            >
              Clear filter
            </button>
          </div>
        )}

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
          Data from fee receipts, transport/hostel collections, mobile payment orders & paid fines for{' '}
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
