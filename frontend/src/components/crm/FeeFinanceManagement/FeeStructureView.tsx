import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download, Filter, Plus, RefreshCcw, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  createFeeStructure,
  exportFeeStructures,
  fetchFeeDashboardMeta,
  fetchFeeStructureMeta,
  formatInr,
  getFeeStructureSummary,
  importFeeStructuresBatch,
  importFeeStructuresFromSetup,
  listFeeStructures,
  updateFeeStructure,
  type FeeStructureHeadCatalogItem,
  type FeeStructureRecord,
  type FeeStructureStatus,
  type FeeStructureSummary,
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

const FREQUENCIES = ['Monthly', 'Quarterly', 'Yearly', 'One-time'];

const STATUS_OPTIONS: FeeStructureStatus[] = [
  'DRAFT',
  'OPEN',
  'ACTIVE',
  'PENDING',
  'DUE',
  'COMPLETED',
];

const BASE_FORM = {
  className: '',
  sectionName: 'A',
  frequency: 'Yearly',
  studentName: '',
  admissionNumber: '',
  status: 'DRAFT' as FeeStructureStatus,
  effectiveDate: new Date().toISOString().slice(0, 10),
  remarks: '',
};

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

function amountForKey(row: FeeStructureRecord, key: string) {
  const standard = row[key as keyof FeeStructureRecord];
  if (typeof standard === 'number') return standard;
  return row.extraHeads?.[key] ?? 0;
}

function recordToHeadAmounts(row: FeeStructureRecord) {
  const amounts: Record<string, string> = {};
  for (const head of row.feeHeads) {
    if (head.amount > 0) amounts[head.key] = String(head.amount);
  }
  return amounts;
}

export function FeeStructureView() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [records, setRecords] = useState<FeeStructureRecord[]>([]);
  const [headCatalog, setHeadCatalog] = useState<FeeStructureHeadCatalogItem[]>([]);
  const [summary, setSummary] = useState<FeeStructureSummary | null>(null);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [years, setYears] = useState<string[]>(['2025-26']);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FeeStructureStatus | ''>('');
  const [showFilters, setShowFilters] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [viewRow, setViewRow] = useState<FeeStructureRecord | null>(null);
  const [editRow, setEditRow] = useState<FeeStructureRecord | null>(null);
  const [form, setForm] = useState(BASE_FORM);
  const [headAmounts, setHeadAmounts] = useState<Record<string, string>>({});
  const [newHeads, setNewHeads] = useState<Array<{ code: string; name: string }>>([]);
  const [newHeadCode, setNewHeadCode] = useState('');
  const [newHeadName, setNewHeadName] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const meta = await fetchFeeDashboardMeta();
      if (meta.academicYears?.length) setYears(meta.academicYears);
      const year = academicYear || meta.defaultAcademicYear || '2025-26';
      if (!academicYear && meta.defaultAcademicYear) setAcademicYear(meta.defaultAcademicYear);

      const [rows, sum, structureMeta] = await Promise.all([
        listFeeStructures({ academicYear: year }),
        getFeeStructureSummary(year),
        fetchFeeStructureMeta(),
      ]);
      setRecords(rows);
      setSummary(sum);
      setHeadCatalog(structureMeta.headCatalog);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load fee structures');
    } finally {
      setLoading(false);
    }
  }, [academicYear]);

  useEffect(() => {
    void load();
  }, [load]);

  const tableHeads = useMemo(() => {
    const map = new Map<string, FeeStructureHeadCatalogItem>();
    for (const head of headCatalog) map.set(head.key, head);
    for (const row of records) {
      for (const head of row.feeHeads) {
        if (!map.has(head.key)) {
          map.set(head.key, {
            key: head.key,
            label: head.label,
            refundable: head.refundable,
            isStandard: false,
            defaultAmount: head.amount,
            showInCollection: true,
            showInInvoice: true,
            showInPayment: true,
            masterId: '',
          });
        }
      }
    }
    return Array.from(map.values());
  }, [headCatalog, records]);

  const filtered = useMemo(() => {
    let rows = records;
    if (statusFilter) rows = rows.filter((r) => r.status === statusFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(
        (r) =>
          r.recordId.toLowerCase().includes(q) ||
          r.partyName.toLowerCase().includes(q) ||
          r.classLabel.toLowerCase().includes(q) ||
          r.admissionNumber.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [records, search, statusFilter]);

  const resetModal = () => {
    setForm(BASE_FORM);
    setHeadAmounts({});
    setNewHeads([]);
    setNewHeadCode('');
    setNewHeadName('');
  };

  const openCreate = () => {
    setEditRow(null);
    resetModal();
    const defaults: Record<string, string> = {};
    for (const head of headCatalog) {
      if (head.defaultAmount > 0) defaults[head.key] = String(head.defaultAmount);
    }
    setHeadAmounts(defaults);
    setShowModal(true);
  };

  const openEdit = (row: FeeStructureRecord) => {
    setEditRow(row);
    setForm({
      className: row.className,
      sectionName: row.sectionName,
      frequency: row.frequency,
      studentName: row.studentName,
      admissionNumber: row.admissionNumber,
      status: row.status,
      effectiveDate: row.effectiveDate || row.displayDate,
      remarks: row.remarks,
    });
    setHeadAmounts(recordToHeadAmounts(row));
    setNewHeads([]);
    setNewHeadCode('');
    setNewHeadName('');
    setShowModal(true);
  };

  const formHeadFields = useMemo(() => {
    const keys = new Set(headCatalog.map((h) => h.key));
    for (const head of newHeads) keys.add(head.code);
    for (const key of Object.keys(headAmounts)) keys.add(key);
    const fields: FeeStructureHeadCatalogItem[] = [];
    for (const key of keys) {
      const catalog = headCatalog.find((h) => h.key === key);
      const custom = newHeads.find((h) => h.code === key);
      fields.push(
        catalog || {
          key,
          label: custom?.name || key.replace(/_/g, ' '),
          refundable: false,
          isStandard: false,
          defaultAmount: 0,
          showInCollection: true,
          showInInvoice: true,
          showInPayment: true,
          masterId: '',
        },
      );
    }
    return fields;
  }, [headCatalog, headAmounts, newHeads]);

  const previewTotal = useMemo(
    () =>
      Object.values(headAmounts).reduce((sum, value) => sum + (value ? Number(value) : 0), 0),
    [headAmounts],
  );

  const addCustomHead = () => {
    const code = newHeadCode.trim().replace(/\s+/g, '_');
    const name = newHeadName.trim();
    if (!code || !name) {
      setError('Enter both code and name for the new fee component');
      return;
    }
    if (formHeadFields.some((h) => h.key.toLowerCase() === code.toLowerCase())) {
      setError('A fee component with this code already exists');
      return;
    }
    setNewHeads((rows) => [...rows, { code, name }]);
    setHeadAmounts((amounts) => ({ ...amounts, [code]: amounts[code] || '' }));
    setNewHeadCode('');
    setNewHeadName('');
    setError('');
  };

  const handleSave = async () => {
    setError('');
    try {
      const amounts = Object.fromEntries(
        Object.entries(headAmounts)
          .map(([key, value]) => [key, value ? Number(value) : 0] as const)
          .filter(([, value]) => value > 0),
      );
      const payload = {
        academicYear,
        className: form.className.trim(),
        sectionName: form.sectionName.trim() || 'A',
        frequency: form.frequency,
        studentName: form.studentName.trim() || undefined,
        admissionNumber: form.admissionNumber.trim() || undefined,
        status: form.status,
        effectiveDate: form.effectiveDate || undefined,
        remarks: form.remarks.trim() || undefined,
        headAmounts: amounts,
        newHeads: newHeads.map((head) => ({
          code: head.code,
          name: head.name,
        })),
      };
      if (editRow) {
        await updateFeeStructure(editRow.id, payload);
        setMessage(`Fee structure ${editRow.recordId} updated and synced to Fee Masters`);
      } else {
        const record = await createFeeStructure(payload);
        setMessage(`Fee structure ${record.recordId} created and synced to Fee Masters`);
      }
      setShowModal(false);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    }
  };

  const handleExport = async () => {
    setError('');
    try {
      const data = await exportFeeStructures(academicYear);
      const rows = data.records.map((r) => ({
        'Ref ID': r.recordId,
        'Academic Year': r.academicYear,
        Class: r.className,
        Section: r.sectionName,
        Frequency: r.frequency,
        'Student / Party': r.partyName,
        'Admission No': r.admissionNumber,
        ...Object.fromEntries(r.feeHeads.map((h) => [h.label, h.amount])),
        'Total Amount': r.totalAmount,
        Status: r.status,
        Date: r.displayDate,
      }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Fee Structure');
      XLSX.writeFile(wb, `Fee_Structure_${academicYear.replace(/[^a-zA-Z0-9_-]+/g, '_')}.xlsx`);
      setMessage(`Exported ${data.count} fee structure(s)`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed');
    }
  };

  const handleImportSetup = async () => {
    setError('');
    try {
      const res = await importFeeStructuresFromSetup(academicYear);
      setMessage(res.message);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import from setup failed');
    }
  };

  const handleFileImport = async (file: File) => {
    setError('');
    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      let rows: Record<string, unknown>[] = [];
      if (ext === 'json') {
        const text = await file.text();
        const parsed = JSON.parse(text) as unknown;
        rows = Array.isArray(parsed) ? parsed : (parsed as { rows?: Record<string, unknown>[] }).rows || [];
      } else {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
      }
      if (!rows.length) throw new Error('No rows found in file');
      const res = await importFeeStructuresBatch(rows, academicYear);
      setMessage(
        `Imported ${res.created} structure(s)${res.errors.length ? ` · ${res.errors.length} error(s)` : ''}`,
      );
      if (res.errors.length) setError(res.errors.slice(0, 3).join('; '));
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed');
    }
  };

  if (loading && !records.length) {
    return <AcademicLoading label="Loading fee structures…" />;
  }

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="Fees & Finance › Fee Structure"
        title="Fee Structure"
        subtitle="Define class-wise fee components — synced automatically to Fee Masters for visibility & collection"
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
            <button type="button" onClick={() => void handleImportSetup()} className={am.btnSecondary}>
              <Upload size={14} /> Import
            </button>
            <button type="button" onClick={() => fileRef.current?.click()} className={am.btnSecondary}>
              <Upload size={14} /> Import File
            </button>
            <button type="button" onClick={() => void handleExport()} className={am.btnSecondary}>
              <Download size={14} /> Export
            </button>
            <button type="button" onClick={openCreate} className={am.btnPrimary}>
              <Plus size={14} /> Add New
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.json,.csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFileImport(file);
                e.target.value = '';
              }}
            />
          </>
        }
      />

      <div className={am.content}>
        {message && <FeeMessage message={message} type="success" />}
        {error && <FeeMessage message={error} type="error" />}

        <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-800">
          Fee components created here are automatically synced to <strong>Fee Masters</strong> for visibility in collection, invoices, and payments.
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl px-5 py-4 text-white shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wide opacity-90">Total Class</p>
            <p className="text-3xl font-bold mt-1">{summary?.totalClasses ?? 0}</p>
          </div>
          <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl px-5 py-4 text-white shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wide opacity-90">
              Total Class Structure Created
            </p>
            <p className="text-3xl font-bold mt-1">{summary?.structuresCreated ?? 0}</p>
          </div>
          <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl px-5 py-4 text-white shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wide opacity-90">Pending</p>
            <p className="text-3xl font-bold mt-1">{summary?.pendingCount ?? 0}</p>
          </div>
          <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl px-5 py-4 text-white shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wide opacity-90">Total Collection</p>
            <p className="text-2xl md:text-3xl font-bold mt-1">
              {formatInr(summary?.totalCollection ?? 0)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            className={`${am.input} max-w-xs`}
            placeholder="Search fee structure…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className={am.btnSecondary}
          >
            <Filter size={14} /> Filters
          </button>
          {showFilters && (
            <select
              className={am.select}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as FeeStructureStatus | '')}
            >
              <option value="">All Status</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>
          )}
        </div>

        {loading ? (
          <AcademicLoading />
        ) : filtered.length === 0 ? (
          <EmptyState>
            No fee structures yet. Click <strong>Add New</strong> or <strong>Import</strong> from Institution Setup.
          </EmptyState>
        ) : (
          <div className={`${am.tableWrap} overflow-x-auto`}>
            <table className="w-full min-w-[1400px]">
              <thead>
                <tr>
                  <th className={am.th} rowSpan={2}>Ref ID</th>
                  <th className={am.th} rowSpan={2}>Student / Party</th>
                  <th className={am.th} rowSpan={2}>Class</th>
                  <th
                    className={`${am.th} text-center border-l border-slate-200/80`}
                    colSpan={Math.max(tableHeads.length, 1)}
                  >
                    Fee Components
                  </th>
                  <th className={`${am.th} border-l border-slate-200/80`} rowSpan={2}>Total Amount</th>
                  <th className={am.th} rowSpan={2}>Date</th>
                  <th className={am.th} rowSpan={2}>Status</th>
                  <th className={am.th} rowSpan={2}>Action</th>
                </tr>
                <tr>
                  {tableHeads.map((field) => (
                    <th
                      key={field.key}
                      className={`${am.th} text-xs font-semibold normal-case tracking-normal whitespace-nowrap min-w-[120px] border-l border-slate-200/80 first:border-l-0`}
                      title={field.label}
                    >
                      {field.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80">
                    <td className={`${am.td} font-mono text-xs whitespace-nowrap`}>{row.recordId}</td>
                    <td className={`${am.td} font-medium whitespace-nowrap`}>{row.partyName}</td>
                    <td className={`${am.td} whitespace-nowrap`}>{row.classLabel}</td>
                    {tableHeads.map((field) => {
                      const amount = amountForKey(row, field.key);
                      return (
                        <td
                          key={field.key}
                          className={`${am.td} text-right tabular-nums text-xs border-l border-slate-100 whitespace-nowrap`}
                        >
                          {amount > 0 ? formatInr(amount) : '—'}
                        </td>
                      );
                    })}
                    <td className={`${am.td} font-semibold text-right tabular-nums border-l border-slate-100 whitespace-nowrap`}>
                      {formatInr(row.totalAmount)}
                    </td>
                    <td className={`${am.td} text-xs whitespace-nowrap`}>{formatDisplayDate(row.displayDate)}</td>
                    <td className={am.td}><StatusBadge status={row.status} /></td>
                    <td className={am.td}>
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => setViewRow(row)}
                          className="text-xs font-semibold text-amber-700 hover:underline text-left"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(row)}
                          className="text-xs font-semibold text-blue-700 hover:underline text-left"
                        >
                          Edit
                        </button>
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
        title={editRow ? `Edit ${editRow.recordId}` : 'New Fee Structure'}
        large
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">Class *</label>
              <input
                className={am.input}
                value={form.className}
                onChange={(e) => setForm((f) => ({ ...f, className: e.target.value }))}
                placeholder="e.g. 5"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Section</label>
              <input
                className={am.input}
                value={form.sectionName}
                onChange={(e) => setForm((f) => ({ ...f, sectionName: e.target.value }))}
                placeholder="A"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Frequency</label>
              <select
                className={`${am.select} w-full`}
                value={form.frequency}
                onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value }))}
              >
                {FREQUENCIES.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Status</label>
              <select
                className={`${am.select} w-full`}
                value={form.status}
                onChange={(e) =>
                  setForm((f) => ({ ...f, status: e.target.value as FeeStructureStatus }))
                }
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">Student / Party (optional)</label>
              <input
                className={am.input}
                value={form.studentName}
                onChange={(e) => setForm((f) => ({ ...f, studentName: e.target.value }))}
                placeholder="Leave blank for class structure"
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

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-600">Fee Components</label>
              <span className="text-[10px] text-slate-500">Synced to Fee Masters on save</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {formHeadFields.map((field) => (
                <div key={field.key}>
                  <label className="text-xs font-semibold text-slate-600">{field.label}</label>
                  <input
                    type="number"
                    className={am.input}
                    value={headAmounts[field.key] || ''}
                    onChange={(e) =>
                      setHeadAmounts((amounts) => ({ ...amounts, [field.key]: e.target.value }))
                    }
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="border border-dashed border-slate-300 rounded-lg p-3 space-y-2">
            <p className="text-xs font-semibold text-slate-600">Add New Fee Component</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <input
                className={am.input}
                value={newHeadCode}
                onChange={(e) => setNewHeadCode(e.target.value)}
                placeholder="Code e.g. LAB_FEE"
              />
              <input
                className={am.input}
                value={newHeadName}
                onChange={(e) => setNewHeadName(e.target.value)}
                placeholder="Display name"
              />
              <button type="button" onClick={addCustomHead} className={am.btnSecondary}>
                <Plus size={14} /> Add Component
              </button>
            </div>
          </div>

          <div className="bg-green-50 border border-green-100 rounded-lg px-3 py-2 flex justify-between items-center">
            <span className="text-xs font-semibold text-green-800">Total Amount</span>
            <span className="text-lg font-bold text-green-900">{formatInr(previewTotal)}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">Effective Date</label>
              <input
                type="date"
                className={am.input}
                value={form.effectiveDate}
                onChange={(e) => setForm((f) => ({ ...f, effectiveDate: e.target.value }))}
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
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className={am.btnSecondary}>
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              className={am.btnPrimary}
              disabled={!form.className.trim() || previewTotal <= 0}
            >
              {editRow ? 'Update & Sync' : 'Save & Sync'}
            </button>
          </div>
        </div>
      </AcademicModal>

      <AcademicModal
        open={!!viewRow}
        onClose={() => setViewRow(null)}
        title={viewRow ? `Fee Structure ${viewRow.recordId}` : 'Fee Structure'}
        large
      >
        {viewRow && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <p className="text-slate-500">Student / Party</p>
                <p className="font-bold">{viewRow.partyName}</p>
              </div>
              <div>
                <p className="text-slate-500">Class & Section</p>
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
                  {viewRow.feeHeads.map((head) => (
                    <tr key={head.key}>
                      <td className={am.td}>{head.label}</td>
                      <td className={`${am.td} font-semibold`}>{formatInr(head.amount)}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-bold">
                    <td className={am.td}>Total</td>
                    <td className={am.td}>{formatInr(viewRow.totalAmount)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setViewRow(null)} className={am.btnSecondary}>
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  openEdit(viewRow);
                  setViewRow(null);
                }}
                className={am.btnPrimary}
              >
                Edit
              </button>
            </div>
          </div>
        )}
      </AcademicModal>
    </AcademicPageShell>
  );
}
