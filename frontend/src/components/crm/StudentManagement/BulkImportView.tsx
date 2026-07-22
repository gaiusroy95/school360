import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Upload, Download, Search, Filter, Loader2, X, Eye, CheckCircle, AlertCircle,
} from 'lucide-react';
import {
  BULK_IMPORT_STATUSES,
  createBulkImportBatch,
  exportBulkImportData,
  fetchBulkImportBatch,
  fetchBulkImportBatches,
  fetchBulkImportMeta,
  type BulkImportBatch,
  type BulkImportRow,
  type BulkImportSummary,
} from '../../../lib/studentBulkImportServices';
import { downloadBulkImportExport, downloadBulkImportTemplate } from '../../../lib/studentBulkImportExcel';
import { parseStudentWorkbook } from '../../../lib/studentExcel';
import { fetchStudentsMeta } from '../../../lib/studentServices';

const STATUS_BADGE: Record<string, string> = {
  Draft: 'bg-slate-100 text-slate-500 border-slate-200',
  Pending: 'bg-amber-100 text-amber-700 border-amber-200',
  Open: 'bg-blue-100 text-blue-700 border-blue-200',
  Active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Completed: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  Approved: 'bg-green-100 text-green-800 border-green-200',
  Paid: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  Due: 'bg-red-100 text-red-700 border-red-200',
};

export function BulkImportView() {
  const [summary, setSummary] = useState<BulkImportSummary | null>(null);
  const [batches, setBatches] = useState<BulkImportBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [classOptions, setClassOptions] = useState<string[]>([]);
  const [sectionOptions, setSectionOptions] = useState<string[]>([]);
  const [yearOptions, setYearOptions] = useState<string[]>([]);
  const [importOpen, setImportOpen] = useState(false);
  const [viewBatch, setViewBatch] = useState<{ batch: BulkImportBatch; rows: BulkImportRow[] } | null>(null);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [meta, list] = await Promise.all([
        fetchBulkImportMeta(),
        fetchBulkImportBatches({
          q: search || undefined,
          status: filterStatus || undefined,
          className: filterClass || undefined,
          sectionName: filterSection || undefined,
          academicYear: filterYear || undefined,
        }),
      ]);
      setSummary(meta.summary);
      setBatches(list.batches);
    } finally {
      setLoading(false);
    }
  }, [search, filterStatus, filterClass, filterSection, filterYear]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void fetchStudentsMeta().then((m) => {
      setClassOptions(m.filters.classes);
      setYearOptions(m.filters.academicYears);
      setFilterYear((y) => y || m.filters.defaultAcademicYear);
    });
  }, []);

  useEffect(() => {
    void fetchStudentsMeta().then((m) => {
      setSectionOptions(filterClass ? m.filters.sectionsByClass[filterClass] || [] : []);
    });
  }, [filterClass]);

  const handleExport = async () => {
    const data = await exportBulkImportData({
      className: filterClass || undefined,
      sectionName: filterSection || undefined,
      academicYear: filterYear || undefined,
    });
    downloadBulkImportExport(data.batches, data.students);
    setMessage(`Exported ${data.batches.length} batch(es) and ${data.students.length} student(s).`);
  };

  const openView = async (batch: BulkImportBatch) => {
    const detail = await fetchBulkImportBatch(batch.id);
    setViewBatch(detail);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      <div className="p-4 md:p-6 bg-white border-b border-slate-200 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-[10px] text-slate-400 font-medium">Student Management &gt; Bulk Import</p>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800 mt-0.5">Bulk Import</h1>
            <p className="text-xs text-slate-500 mt-1">Class &amp; section-wise student onboarding for new institutes</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setImportOpen(true)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm flex items-center gap-1.5 hover:bg-slate-50">
              <Upload size={14} /> Import
            </button>
            <button type="button" onClick={() => void handleExport()} className="px-3 py-2 border border-slate-300 rounded-lg text-sm flex items-center gap-1.5 hover:bg-slate-50">
              <Download size={14} /> Export
            </button>
          </div>
        </div>

        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            {[
              { label: 'Total Bulk Import', value: summary.total },
              { label: 'Active / Open', value: summary.activeOpen },
              { label: 'Pending', value: summary.pending },
              { label: 'This Month', value: summary.thisMonth },
            ].map((k) => (
              <div key={k.label} className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <p className="text-[10px] font-bold text-slate-500 uppercase">{k.label}</p>
                <p className="text-2xl font-bold text-slate-800">{k.value.toLocaleString('en-IN')}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search bulk import..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <button type="button" onClick={() => setShowFilters((v) => !v)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm flex items-center gap-1.5 hover:bg-slate-50">
            <Filter size={14} /> Filters
          </button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-2 mt-3 p-3 bg-slate-50 rounded-lg border">
            <select value={filterClass} onChange={(e) => { setFilterClass(e.target.value); setFilterSection(''); }} className="border rounded-lg px-2 py-1.5 text-sm">
              <option value="">All Classes</option>
              {classOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filterSection} onChange={(e) => setFilterSection(e.target.value)} className="border rounded-lg px-2 py-1.5 text-sm">
              <option value="">All Sections</option>
              {sectionOptions.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className="border rounded-lg px-2 py-1.5 text-sm">
              <option value="">All Years</option>
              {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="border rounded-lg px-2 py-1.5 text-sm">
              <option value="">All Statuses</option>
              {BULK_IMPORT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button type="button" onClick={() => { setFilterClass(''); setFilterSection(''); setFilterStatus(''); setFilterYear(''); }} className="text-xs text-indigo-600 font-medium px-2">Clear</button>
          </div>
        )}
        {message && <p className="text-xs text-indigo-600 mt-2">{message}</p>}
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6">
        {loading ? (
          <div className="flex justify-center p-12"><Loader2 className="animate-spin text-slate-400" /></div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="p-3 text-left text-xs font-bold text-slate-500">Record ID</th>
                  <th className="p-3 text-left text-xs font-bold text-slate-500">Name</th>
                  <th className="p-3 text-left text-xs font-bold text-slate-500">Class / Group</th>
                  <th className="p-3 text-left text-xs font-bold text-slate-500">Details</th>
                  <th className="p-3 text-left text-xs font-bold text-slate-500">Updated</th>
                  <th className="p-3 text-left text-xs font-bold text-slate-500">Status</th>
                  <th className="p-3 text-right text-xs font-bold text-slate-500">Action</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.id} className="border-t hover:bg-slate-50">
                    <td className="p-3 font-mono text-xs text-slate-600">{b.recordId}</td>
                    <td className="p-3 font-medium text-slate-800">{b.fileName || b.recordId}</td>
                    <td className="p-3 text-slate-600">{b.classGroup}</td>
                    <td className="p-3 text-slate-600 text-xs max-w-[220px] truncate">{b.details}</td>
                    <td className="p-3 text-xs text-slate-500">
                      {new Date(b.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="p-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${STATUS_BADGE[b.statusLabel] || STATUS_BADGE.Open}`}>
                        {b.statusLabel}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button type="button" onClick={() => void openView(b)} className="text-indigo-600 text-xs font-bold hover:underline">View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {batches.length === 0 && (
              <p className="p-10 text-center text-slate-500 text-sm">
                No import batches yet. Click <strong>Import</strong> to upload class/section-wise student data.
              </p>
            )}
          </div>
        )}
      </div>

      {importOpen && (
        <ImportModal
          classOptions={classOptions}
          sectionOptions={sectionOptions}
          defaultYear={filterYear}
          onClose={() => setImportOpen(false)}
          onDone={(msg) => { setImportOpen(false); setMessage(msg); void load(); }}
        />
      )}

      {viewBatch && (
        <ViewBatchModal batch={viewBatch.batch} rows={viewBatch.rows} onClose={() => setViewBatch(null)} />
      )}
    </div>
  );
}

function ImportModal({
  classOptions,
  sectionOptions: initialSections,
  defaultYear,
  onClose,
  onDone,
}: {
  classOptions: string[];
  sectionOptions: string[];
  defaultYear: string;
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [className, setClassName] = useState('');
  const [sectionName, setSectionName] = useState('');
  const [academicYear, setAcademicYear] = useState(defaultYear || '2025-26');
  const [updateExisting, setUpdateExisting] = useState(true);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [sections, setSections] = useState(initialSections);

  useEffect(() => {
    void fetchStudentsMeta().then((m) => {
      setSections(className ? m.filters.sectionsByClass[className] || [] : []);
    });
  }, [className]);

  const handleFile = async (file: File) => {
    const buf = await file.arrayBuffer();
    setRows(parseStudentWorkbook(buf));
    setFileName(file.name);
    setError('');
  };

  const runImport = async () => {
    if (rows.length === 0) { setError('Select an Excel file with student rows'); return; }
    setImporting(true);
    setError('');
    try {
      const res = await createBulkImportBatch({
        fileName,
        className,
        sectionName,
        academicYear,
        updateExisting,
        rows,
      });
      onDone(`${res.batch.recordId}: ${res.created} created, ${res.updated} updated${res.errors.length ? `, ${res.errors.length} errors` : ''}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <div>
            <h3 className="font-bold text-slate-800">Import Students</h3>
            <p className="text-xs text-slate-500">Class &amp; section filters apply to all rows in the file</p>
          </div>
          <button type="button" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Class (optional filter)</label>
              <select value={className} onChange={(e) => { setClassName(e.target.value); setSectionName(''); }} className="w-full border rounded-lg p-2 text-sm">
                <option value="">All classes in file</option>
                {classOptions.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Section (optional filter)</label>
              <select value={sectionName} onChange={(e) => setSectionName(e.target.value)} className="w-full border rounded-lg p-2 text-sm" disabled={!className}>
                <option value="">All sections</option>
                {sections.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Academic Year</label>
              <input value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className="w-full border rounded-lg p-2 text-sm" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={updateExisting} onChange={(e) => setUpdateExisting(e.target.checked)} />
            Update existing students (match by admission number)
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => downloadBulkImportTemplate()} className="px-3 py-2 border rounded-lg text-sm flex items-center gap-1"><Download size={14} /> Template</button>
            <button type="button" onClick={() => fileRef.current?.click()} className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm flex items-center gap-1"><Upload size={14} /> Select Excel</button>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.target.value = ''; }} />
            {fileName && <span className="text-xs text-slate-500 self-center">{fileName} — {rows.length} rows</span>}
          </div>
          {rows.length > 0 && (
            <div className="border rounded-lg overflow-x-auto max-h-[200px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="p-2 text-left">Name</th>
                    <th className="p-2 text-left">Class</th>
                    <th className="p-2 text-left">Section</th>
                    <th className="p-2 text-left">Mobile</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 20).map((r, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-2">{String(r.fullName || r.firstName || '')}</td>
                      <td className="p-2">{String(r.className || className || '')}</td>
                      <td className="p-2">{String(r.sectionName || sectionName || '')}</td>
                      <td className="p-2">{String(r.mobile || '')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="p-4 border-t flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
          <button type="button" disabled={importing || rows.length === 0} onClick={() => void runImport()} className="px-4 py-2 bg-amber-400 text-slate-900 font-bold rounded-lg text-sm disabled:opacity-50 flex items-center gap-2">
            {importing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            Run Import ({rows.length})
          </button>
        </div>
      </div>
    </div>
  );
}

function ViewBatchModal({
  batch,
  rows,
  onClose,
}: {
  batch: BulkImportBatch;
  rows: BulkImportRow[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-start p-4 border-b">
          <div>
            <h3 className="font-bold text-slate-800">{batch.recordId} — {batch.fileName || 'Import Batch'}</h3>
            <p className="text-xs text-slate-500 mt-1">{batch.classGroup} · {batch.academicYear}</p>
            <div className="flex gap-3 mt-2 text-xs">
              <span className="flex items-center gap-1 text-emerald-600"><CheckCircle size={12} /> {batch.createdCount} created</span>
              <span className="flex items-center gap-1 text-blue-600"><CheckCircle size={12} /> {batch.updatedCount} updated</span>
              {batch.errorCount > 0 && <span className="flex items-center gap-1 text-red-600"><AlertCircle size={12} /> {batch.errorCount} errors</span>}
            </div>
          </div>
          <button type="button" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-2 text-left text-xs font-bold text-slate-500">#</th>
                <th className="p-2 text-left text-xs font-bold text-slate-500">Name</th>
                <th className="p-2 text-left text-xs font-bold text-slate-500">Class / Group</th>
                <th className="p-2 text-left text-xs font-bold text-slate-500">Admission No.</th>
                <th className="p-2 text-left text-xs font-bold text-slate-500">Status</th>
                <th className="p-2 text-left text-xs font-bold text-slate-500">Message</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-2 text-slate-500">{r.rowNumber}</td>
                  <td className="p-2 font-medium">{r.studentName}</td>
                  <td className="p-2">{r.classGroup}</td>
                  <td className="p-2 font-mono text-xs">{r.admissionNumber || '—'}</td>
                  <td className="p-2">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${r.status === 'ERROR' ? 'bg-red-100 text-red-700' : r.status === 'UPDATED' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="p-2 text-xs text-slate-600">{r.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t flex justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg text-sm flex items-center gap-1"><Eye size={14} /> Close</button>
        </div>
      </div>
    </div>
  );
}
