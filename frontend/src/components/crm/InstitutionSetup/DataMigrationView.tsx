import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Database,
  Download,
  FileSpreadsheet,
  RefreshCcw,
  Upload,
} from 'lucide-react';
import {
  downloadMasterMigrationTemplate,
  fetchMigrationTemplateMeta,
  parseMasterMigrationWorkbook,
  runMasterMigration,
  type MasterMigrationSummary,
  type MigrationTemplateMeta,
} from '../../../lib/dataMigrationServices';

export function DataMigrationView({ onBack }: { onBack?: () => void }) {
  const [meta, setMeta] = useState<MigrationTemplateMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [updateExisting, setUpdateExisting] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [summary, setSummary] = useState<MasterMigrationSummary | null>(null);
  const [parsedPreview, setParsedPreview] = useState<Record<string, number>>({});
  const [selectedFileName, setSelectedFileName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingFile = useRef<File | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setMeta(await fetchMigrationTemplateMeta());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load migration template');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDownload = () => {
    if (!meta) return;
    downloadMasterMigrationTemplate(meta);
    setMessage('Master Excel template downloaded');
  };

  const handleFile = async (file: File) => {
    setError('');
    setMessage('');
    setSummary(null);
    pendingFile.current = file;
    setSelectedFileName(file.name);
    try {
      const buf = await file.arrayBuffer();
      const sheets = parseMasterMigrationWorkbook(buf);
      const preview: Record<string, number> = {};
      for (const [k, rows] of Object.entries(sheets)) {
        preview[k] = rows?.length || 0;
      }
      setParsedPreview(preview);
      if (Object.keys(preview).length === 0) {
        setError('No valid sheets found. Use sheet names: Students, Teachers, Accounts, Results.');
      } else {
        setMessage(`Ready to import: ${Object.entries(preview).map(([k, n]) => `${k} (${n})`).join(', ')}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to read Excel file');
    }
  };

  const handleImport = async () => {
    const file = pendingFile.current;
    if (!file) {
      setError('Select a Master Excel file first');
      return;
    }
    setUploading(true);
    setError('');
    setMessage('');
    try {
      const buf = await file.arrayBuffer();
      const sheets = parseMasterMigrationWorkbook(buf);
      if (!Object.keys(sheets).length) {
        throw new Error('No valid sheets to import');
      }
      const result = await runMasterMigration({
        fileName: file.name,
        updateExisting,
        sheets,
      });
      setSummary(result);
      setMessage(
        `Migration complete — ${result.totals.created} created, ${result.totals.updated} updated, ${result.totals.errors} errors`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setUploading(false);
    }
  };

  if (loading && !meta) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-sm text-slate-500">
        Loading Data Migration…
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-[10px] text-slate-400 font-medium">Institution Setup › Data Migration</p>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800 mt-0.5">Master Excel Data Migration</h1>
          <p className="text-xs text-slate-500 mt-1">
            Upload existing school data — Students, Teachers, Accounts & Results — synced into related ERP fields.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {onBack && (
            <button type="button" onClick={onBack} className="text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white hover:bg-slate-50">
              Back
            </button>
          )}
          <button type="button" onClick={() => void load()} className="text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 flex items-center gap-1.5">
            <RefreshCcw size={14} /> Refresh
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="text-xs px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold flex items-center gap-1.5"
          >
            <Download size={14} /> Download Master Template
          </button>
        </div>
      </div>

      {message && (
        <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 flex items-center gap-2">
          <CheckCircle2 size={14} /> {message}
        </div>
      )}
      {error && (
        <div className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>
      )}

      <div className="bg-sky-50 border border-sky-100 rounded-xl p-4 text-xs text-sky-900 space-y-1">
        <p className="font-bold flex items-center gap-1.5"><Database size={14} /> How migration works</p>
        {(meta?.instructions || []).map((line) => (
          <p key={line}>• {line}</p>
        ))}
        <p className="pt-1 text-sky-800">
          • After Students/Teachers are imported, mobile apps can log in with Admission No. / Employee Code + registered mobile (default password = mobile number until reset).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {(meta?.sheets || []).map((s) => (
          <div key={s.key} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <FileSpreadsheet size={16} className="text-indigo-600" />
              <p className="text-sm font-bold text-slate-800">{s.label}</p>
            </div>
            <p className="text-[10px] text-slate-500 leading-snug">{s.description}</p>
            {parsedPreview[s.key] != null && (
              <p className="text-[10px] font-bold text-indigo-700 mt-2">{parsedPreview[s.key]} rows ready</p>
            )}
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
        <h2 className="text-sm font-bold text-slate-800">Upload Master Excel</h2>
        <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={updateExisting}
            onChange={(e) => setUpdateExisting(e.target.checked)}
          />
          Update existing records (match Admission No. / Employee Code)
        </label>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
            e.target.value = '';
          }}
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="text-xs px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 hover:bg-slate-100 font-bold flex items-center gap-1.5"
          >
            <Upload size={14} /> Choose Excel File
          </button>
          <button
            type="button"
            disabled={uploading || !selectedFileName}
            onClick={() => void handleImport()}
            className="text-xs px-4 py-2 bg-amber-400 text-slate-900 rounded-lg hover:bg-amber-500 font-bold disabled:opacity-50 flex items-center gap-1.5"
          >
            {uploading ? 'Importing…' : 'Import & Sync to ERP'}
          </button>
        </div>
        {selectedFileName && (
          <p className="text-[10px] text-slate-500">Selected: {selectedFileName}</p>
        )}
      </div>

      {summary && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-700">
            Import result — {summary.fileName}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-left">
                  <th className="px-3 py-2">Sheet</th>
                  <th className="px-3 py-2">Total</th>
                  <th className="px-3 py-2">Created</th>
                  <th className="px-3 py-2">Updated</th>
                  <th className="px-3 py-2">Skipped</th>
                  <th className="px-3 py-2">Errors</th>
                </tr>
              </thead>
              <tbody>
                {summary.sheets.map((s) => (
                  <tr key={s.sheet} className="border-b border-slate-50">
                    <td className="px-3 py-2 font-semibold capitalize">{s.sheet}</td>
                    <td className="px-3 py-2">{s.total}</td>
                    <td className="px-3 py-2 text-emerald-700">{s.created}</td>
                    <td className="px-3 py-2 text-blue-700">{s.updated}</td>
                    <td className="px-3 py-2 text-slate-500">{s.skipped}</td>
                    <td className="px-3 py-2 text-red-600">{s.errors.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {summary.sheets.some((s) => s.errors.length > 0) && (
            <div className="p-3 border-t border-slate-100 max-h-40 overflow-y-auto text-[10px] text-red-700 space-y-0.5">
              {summary.sheets.flatMap((s) =>
                s.errors.slice(0, 20).map((e) => (
                  <p key={`${s.sheet}-${e.row}-${e.message}`}>
                    [{s.sheet}] Row {e.row}: {e.message}
                  </p>
                )),
              )}
            </div>
          )}
          <p className="px-3 py-2 text-[10px] text-slate-500 border-t border-slate-100">{summary.note}</p>
        </div>
      )}
    </div>
  );
}
