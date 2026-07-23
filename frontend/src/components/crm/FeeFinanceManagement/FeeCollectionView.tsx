import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download, Filter, Plus, RefreshCcw, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  collectFee,
  fetchFeeCollectionMeta,
  fetchFeeReceipt,
  fetchFeeSchedule,
  type FeeHead,
  type FeeReceipt,
  type FeeStudent,
} from '../../../lib/feeCollectionServices';
import {
  exportFeeCollectionEntries,
  fetchFeeDashboardMeta,
  formatInr,
  getFeeCollectionAnalytics,
  listFeeCollectionEntries,
  type FeeCollectionAnalytics,
  type FeeCollectionEntry,
  type FeeCollectionEntryStatus,
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

const FEE_HEAD_COLUMNS = [
  { key: 'tuitionFee', label: 'Tuition Fee' },
  { key: 'admissionFee', label: 'Admission Fee' },
  { key: 'registrationFee', label: 'Registration Fee' },
  { key: 'librarySecurityDeposit', label: 'Library Security Deposit (Refundable)' },
  { key: 'cautionMoney', label: 'Caution Money (Refundable)' },
  { key: 'computerLabFee', label: 'Computer Lab Fee' },
  { key: 'picnicFieldTrip', label: 'Picnic / Field Trip' },
  { key: 'addOnFee', label: 'Add-on Fee' },
  { key: 'examinationFee', label: 'Examination Fee' },
  { key: 'annualCharges', label: 'Annual Charges' },
  { key: 'sportsFee', label: 'Sports Fee' },
  { key: 'hostelFee', label: 'Hostel Fee' },
  { key: 'transportFee', label: 'Transport Fee' },
] as const;

const STATUS_OPTIONS: FeeCollectionEntryStatus[] = [
  'PAID',
  'COMPLETED',
  'ACTIVE',
  'PENDING',
  'DUE',
  'DRAFT',
  'APPROVED',
  'OPEN',
];

function formatDisplayDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function FeeCollectionView() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [records, setRecords] = useState<FeeCollectionEntry[]>([]);
  const [analytics, setAnalytics] = useState<FeeCollectionAnalytics | null>(null);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [years, setYears] = useState<string[]>(['2025-26']);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FeeCollectionEntryStatus | ''>('');
  const [showFilters, setShowFilters] = useState(false);
  const [viewRow, setViewRow] = useState<FeeCollectionEntry | null>(null);
  const [receiptDetail, setReceiptDetail] = useState<FeeReceipt | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [students, setStudents] = useState<FeeStudent[]>([]);
  const [paymentModes, setPaymentModes] = useState<Array<{ key: string; label: string }>>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [scheduleHeads, setScheduleHeads] = useState<FeeHead[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [remarks, setRemarks] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const meta = await fetchFeeDashboardMeta();
      if (meta.academicYears?.length) setYears(meta.academicYears);
      const year = academicYear || meta.defaultAcademicYear || '2025-26';
      if (!academicYear && meta.defaultAcademicYear) setAcademicYear(meta.defaultAcademicYear);

      const [rows, sum] = await Promise.all([
        listFeeCollectionEntries({ academicYear: year, includeDues: '1' }),
        getFeeCollectionAnalytics(year),
      ]);
      setRecords(rows);
      setAnalytics(sum);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load fee collection');
    } finally {
      setLoading(false);
    }
  }, [academicYear]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    let rows = records;
    if (statusFilter) rows = rows.filter((r) => r.status === statusFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(
        (r) =>
          r.recordId.toLowerCase().includes(q) ||
          r.studentName.toLowerCase().includes(q) ||
          r.classLabel.toLowerCase().includes(q) ||
          r.admissionNumber.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [records, search, statusFilter]);

  const openCreate = async () => {
    setError('');
    try {
      const meta = await fetchFeeCollectionMeta();
      setStudents(meta.students);
      setPaymentModes(meta.paymentModes);
      if (meta.students[0]) setSelectedStudentId(meta.students[0].admissionRecordId);
      setScheduleHeads([]);
      setSelectedKeys(new Set());
      setPaymentMode('Cash');
      setRemarks('');
      setShowModal(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to open collection form');
    }
  };

  const loadScheduleForStudent = async (student: FeeStudent) => {
    try {
      const res = await fetchFeeSchedule(student.className, student.sectionName);
      setScheduleHeads(res.schedule.heads);
      setSelectedKeys(new Set(res.schedule.heads.map((h) => h.key)));
    } catch (e) {
      setScheduleHeads([]);
      setSelectedKeys(new Set());
      setError(e instanceof Error ? e.message : 'No fee schedule for this class');
    }
  };

  useEffect(() => {
    if (!showModal || !selectedStudentId) return;
    const student = students.find((s) => s.admissionRecordId === selectedStudentId);
    if (student) void loadScheduleForStudent(student);
  }, [showModal, selectedStudentId, students]);

  const totalSelected = useMemo(
    () => scheduleHeads.filter((h) => selectedKeys.has(h.key)).reduce((s, h) => s + h.amount, 0),
    [scheduleHeads, selectedKeys],
  );

  const handleCollect = async () => {
    setError('');
    if (!selectedStudentId) {
      setError('Select a student');
      return;
    }
    const feeItems = scheduleHeads
      .filter((h) => selectedKeys.has(h.key) && h.amount > 0)
      .map((h) => ({ key: h.key, label: h.label, amount: h.amount }));
    if (!feeItems.length) {
      setError('Select at least one fee head');
      return;
    }
    try {
      const res = await collectFee({
        admissionRecordId: selectedStudentId,
        paymentMode,
        feeItems,
        remarks: remarks.trim() || undefined,
      });
      setMessage(res.message);
      setShowModal(false);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Collection failed');
    }
  };

  const handleView = async (row: FeeCollectionEntry) => {
    setViewRow(row);
    setReceiptDetail(null);
    if (row.source === 'receipt') {
      try {
        const res = await fetchFeeReceipt(row.id);
        setReceiptDetail(res.receipt);
      } catch {
        setReceiptDetail(null);
      }
    }
  };

  const handleExport = async () => {
    setError('');
    try {
      const data = await exportFeeCollectionEntries(academicYear);
      const rows = data.records.map((r) => ({
        'Ref ID': r.recordId,
        'Student / Party': r.studentName,
        Class: r.className,
        Section: r.sectionName,
        Frequency: r.frequency,
        ...Object.fromEntries(FEE_HEAD_COLUMNS.map((c) => [c.label, r[c.key as keyof FeeCollectionEntry] as number])),
        'Total Amount': r.totalAmount,
        Status: r.status,
        Date: r.displayDate,
        'Payment Mode': r.paymentMode,
      }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Fee Collection');
      XLSX.writeFile(wb, `Fee_Collection_${academicYear.replace(/[^a-zA-Z0-9_-]+/g, '_')}.xlsx`);
      setMessage(`Exported ${data.count} record(s)`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed');
    }
  };

  if (loading && !records.length) {
    return <AcademicLoading label="Loading fee collection…" />;
  }

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="Fees & Finance › Fee Collection"
        title="Fee Collection"
        subtitle="All fee collections by class, section & student — tuition, transport, hostel & more"
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
            <button type="button" onClick={() => fileRef.current?.click()} className={am.btnSecondary}>
              <Upload size={14} /> Import
            </button>
            <button type="button" onClick={() => void handleExport()} className={am.btnSecondary}>
              <Download size={14} /> Export
            </button>
            <button type="button" onClick={() => void openCreate()} className={am.btnPrimary}>
              <Plus size={14} /> Add New
            </button>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.json" className="hidden" onChange={() => {
              setMessage('Use Add New to collect fees, or import via Admission CRM fee receipts API');
            }} />
          </>
        }
      />

      <div className={am.content}>
        {message && <FeeMessage message={message} type="success" />}
        {error && <FeeMessage message={error} type="error" />}

        {/* Analytics per fee head */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl px-5 py-4 text-white shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wide opacity-90 mb-3">
            Amount Collection by Fee Head — {academicYear}
          </p>
          {analytics && analytics.analytics.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {analytics.analytics.map((a) => (
                <div key={a.key} className="bg-white/15 rounded-lg px-3 py-2 backdrop-blur-sm">
                  <p className="text-[10px] font-semibold opacity-90 line-clamp-2">{a.label}</p>
                  <p className="text-lg font-bold mt-0.5">{formatInr(a.amount)}</p>
                </div>
              ))}
              <div className="bg-white/25 rounded-lg px-3 py-2">
                <p className="text-[10px] font-semibold opacity-90">Total Collected</p>
                <p className="text-lg font-bold mt-0.5">{formatInr(analytics.totalCollected)}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm opacity-90">
              No collections yet for this year. Use <strong>Add New</strong> to record a fee payment.
            </p>
          )}
          {analytics && (
            <p className="text-[11px] mt-3 opacity-80">
              {analytics.receiptCount} collection(s) · {analytics.pendingDues} pending due(s)
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            className={`${am.input} max-w-sm flex-1`}
            placeholder="Search fee collection…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="button" onClick={() => setShowFilters((v) => !v)} className={am.btnSecondary}>
            <Filter size={14} /> Filters
          </button>
          {showFilters && (
            <select
              className={am.select}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as FeeCollectionEntryStatus | '')}
            >
              <option value="">All Status</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          )}
        </div>

        {loading ? (
          <AcademicLoading />
        ) : filtered.length === 0 ? (
          <EmptyState>No fee collection records. Click <strong>Add New</strong> to collect fees from a student.</EmptyState>
        ) : (
          <div className={am.tableWrap}>
            <div className="overflow-x-auto max-h-[520px]">
              <table className="w-full min-w-[1400px]">
                <thead className="sticky top-0 z-10 bg-slate-50">
                  <tr>
                    <th className={am.th}>Ref ID</th>
                    <th className={am.th}>Student / Party</th>
                    <th className={am.th}>Class</th>
                    <th className={am.th}>Section</th>
                    <th className={am.th}>Frequency</th>
                    {FEE_HEAD_COLUMNS.map((c) => (
                      <th key={c.key} className={`${am.th} text-right whitespace-nowrap`}>
                        <span className="text-[9px]">{c.label}</span>
                      </th>
                    ))}
                    <th className={am.th}>Amount</th>
                    <th className={am.th}>Date</th>
                    <th className={am.th}>Status</th>
                    <th className={am.th}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr key={`${row.source}-${row.id}`} className="hover:bg-slate-50/80">
                      <td className={`${am.td} font-mono text-xs`}>{row.recordId}</td>
                      <td className={`${am.td} font-medium`}>{row.studentName}</td>
                      <td className={am.td}>{row.className || '—'}</td>
                      <td className={am.td}>{row.sectionName || '—'}</td>
                      <td className={`${am.td} text-xs`}>{row.frequency}</td>
                      {FEE_HEAD_COLUMNS.map((c) => {
                        const val = row[c.key as keyof FeeCollectionEntry] as number;
                        return (
                          <td key={c.key} className={`${am.td} text-right text-xs`}>
                            {val > 0 ? formatInr(val) : '—'}
                          </td>
                        );
                      })}
                      <td className={`${am.td} font-semibold`}>{formatInr(row.totalAmount)}</td>
                      <td className={`${am.td} text-xs`}>{formatDisplayDate(row.displayDate)}</td>
                      <td className={am.td}><StatusBadge status={row.status} /></td>
                      <td className={am.td}>
                        <button
                          type="button"
                          onClick={() => void handleView(row)}
                          className="text-xs font-semibold text-amber-700 hover:underline"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Collect Fee Modal */}
      <AcademicModal open={showModal} onClose={() => setShowModal(false)} title="Collect Fee" large>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-600">Student *</label>
            <select
              className={`${am.select} w-full`}
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
            >
              <option value="">Select student</option>
              {students.map((s) => (
                <option key={s.admissionRecordId} value={s.admissionRecordId}>
                  {s.studentName} — Class {s.className}-{s.sectionName} ({s.admissionNumber || 'no adm no'})
                </option>
              ))}
            </select>
          </div>

          {scheduleHeads.length > 0 ? (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">Fee Heads</div>
              <div className="divide-y divide-slate-100">
                {scheduleHeads.map((h) => (
                  <label key={h.key} className="flex items-center justify-between px-3 py-2 text-sm cursor-pointer hover:bg-slate-50">
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedKeys.has(h.key)}
                        onChange={(e) => {
                          const next = new Set(selectedKeys);
                          if (e.target.checked) next.add(h.key);
                          else next.delete(h.key);
                          setSelectedKeys(next);
                        }}
                      />
                      {h.label}
                    </span>
                    <span className="font-semibold">{formatInr(h.amount)}</span>
                  </label>
                ))}
              </div>
              <div className="bg-green-50 px-3 py-2 flex justify-between font-bold text-green-800 text-sm">
                <span>Total</span>
                <span>{formatInr(totalSelected)}</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              Select a student with a configured fee structure (Fee Structure or Institution Setup).
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">Payment Mode</label>
              <select
                className={`${am.select} w-full`}
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
              >
                {paymentModes.map((m) => (
                  <option key={m.key} value={m.label}>{m.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Remarks</label>
              <input className={am.input} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className={am.btnSecondary}>Cancel</button>
            <button
              type="button"
              onClick={() => void handleCollect()}
              className={am.btnPrimary}
              disabled={!selectedStudentId || totalSelected <= 0}
            >
              Collect & Generate Receipt
            </button>
          </div>
        </div>
      </AcademicModal>

      {/* View Modal */}
      <AcademicModal
        open={!!viewRow}
        onClose={() => { setViewRow(null); setReceiptDetail(null); }}
        title={viewRow ? `Collection ${viewRow.recordId}` : 'Collection'}
        large
      >
        {viewRow && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <p className="text-slate-500">Student</p>
                <p className="font-bold">{viewRow.studentName}</p>
              </div>
              <div>
                <p className="text-slate-500">Class / Section</p>
                <p className="font-bold">{viewRow.classLabel}</p>
              </div>
              <div>
                <p className="text-slate-500">Frequency</p>
                <p className="font-bold">{viewRow.frequency}</p>
              </div>
              <div>
                <p className="text-slate-500">Status</p>
                <StatusBadge status={viewRow.status} />
              </div>
            </div>

            <div className={am.tableWrap}>
              <table className="w-full">
                <thead>
                  <tr>
                    <th className={am.th}>Fee Head</th>
                    <th className={am.th}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {FEE_HEAD_COLUMNS.map((c) => {
                    const amount = viewRow[c.key as keyof FeeCollectionEntry] as number;
                    if (!amount) return null;
                    return (
                      <tr key={c.key}>
                        <td className={am.td}>{c.label}</td>
                        <td className={`${am.td} font-semibold`}>{formatInr(amount)}</td>
                      </tr>
                    );
                  })}
                  <tr className="bg-slate-50 font-bold">
                    <td className={am.td}>Total</td>
                    <td className={am.td}>{formatInr(viewRow.totalAmount)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {receiptDetail && (
              <div className="text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
                <p>Payment: {receiptDetail.paymentMode} · Collected by {receiptDetail.collectedBy}</p>
                {receiptDetail.remarks && <p className="mt-1">Remarks: {receiptDetail.remarks}</p>}
              </div>
            )}

            <div className="flex justify-end">
              <button type="button" onClick={() => setViewRow(null)} className={am.btnSecondary}>Close</button>
            </div>
          </div>
        )}
      </AcademicModal>
    </AcademicPageShell>
  );
}
