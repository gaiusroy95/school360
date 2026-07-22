import { useCallback, useEffect, useState } from 'react';
import { Download, Plus, Trash2, UploadCloud, RefreshCw } from 'lucide-react';
import {
  createHoliday,
  deleteHoliday,
  fetchHolidays,
  formatHolidayDate,
  importHolidays,
  type Holiday,
} from '../../../lib/holidayApi';
import { downloadHolidayTemplate, parseHolidayWorkbook } from '../../../lib/holidayExcel';

const TYPE_OPTIONS = ['NATIONAL', 'RESTRICTED', 'OPTIONAL', 'INSTITUTIONAL', 'OTHER'];
const AUDIENCE_OPTIONS = ['ALL', 'STAFF', 'STUDENTS'];

export { downloadHolidayTemplate };

export function HolidayManager({
  title = 'Holiday List',
  description = 'Upload an Excel holiday list. These holidays sync with the HR & Payroll calendar for working-day calculation.',
}: {
  title?: string;
  description?: string;
}) {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    date: '',
    name: '',
    type: 'NATIONAL',
    applicableTo: 'ALL',
    isPaid: true,
    notes: '',
  });
  const [replaceYear, setReplaceYear] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchHolidays();
      setHolidays(data.holidays);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load holidays');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAdd = async () => {
    if (!form.date || !form.name.trim()) {
      setError('Date and holiday name are required');
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await createHoliday({
        date: form.date,
        name: form.name.trim(),
        type: form.type,
        applicableTo: form.applicableTo,
        isPaid: form.isPaid,
        notes: form.notes || null,
      });
      setForm({ date: '', name: '', type: 'NATIONAL', applicableTo: 'ALL', isPaid: true, notes: '' });
      setMessage('Holiday added');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add holiday');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setSaving(true);
    setError('');
    try {
      await deleteHoliday(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (file: File) => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const buffer = await file.arrayBuffer();
      const rows = parseHolidayWorkbook(buffer);
      if (!rows.length) throw new Error('No valid holiday rows found in Excel');

      const year = replaceYear ? Number(rows[0].date.slice(0, 4)) : undefined;
      const result = await importHolidays(rows, year);
      setMessage(`Imported ${result.created} holidays${result.skipped ? ` (${result.skipped} duplicates skipped)` : ''}`);
      setHolidays(result.holidays);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-800">{title}</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">{description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={downloadHolidayTemplate}
            className="px-3 py-2 border border-emerald-500 text-emerald-700 rounded-lg text-xs font-bold hover:bg-emerald-50 flex items-center gap-1"
          >
            <Download size={14} /> Excel Template
          </button>
          <label className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 flex items-center gap-1 cursor-pointer">
            <UploadCloud size={14} /> Upload Excel
            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleUpload(file);
                e.target.value = '';
              }}
            />
          </label>
          <button
            type="button"
            onClick={() => void load()}
            className="px-3 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 flex items-center gap-1"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      <label className="inline-flex items-center gap-2 text-xs text-slate-600">
        <input type="checkbox" checked={replaceYear} onChange={(e) => setReplaceYear(e.target.checked)} />
        On Excel import, replace existing holidays for that year
      </label>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
      {message && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">{message}</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-6 gap-2 p-3 bg-slate-50 border border-slate-100 rounded-lg">
        <input
          type="date"
          className="border border-slate-300 rounded-lg px-2 py-2 text-xs"
          value={form.date}
          onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
        />
        <input
          type="text"
          placeholder="Holiday name"
          className="md:col-span-2 border border-slate-300 rounded-lg px-2 py-2 text-xs"
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
        />
        <select
          className="border border-slate-300 rounded-lg px-2 py-2 text-xs"
          value={form.type}
          onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
        >
          {TYPE_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          className="border border-slate-300 rounded-lg px-2 py-2 text-xs"
          value={form.applicableTo}
          onChange={(e) => setForm((p) => ({ ...p, applicableTo: e.target.value }))}
        >
          {AUDIENCE_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={saving}
          onClick={() => void handleAdd()}
          className="px-3 py-2 bg-amber-400 hover:bg-amber-500 text-slate-900 rounded-lg text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-60"
        >
          <Plus size={14} /> Add
        </button>
      </div>

      <div className="overflow-x-auto border border-slate-100 rounded-lg">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
            <tr>
              <th className="px-3 py-2 font-semibold">Date</th>
              <th className="px-3 py-2 font-semibold">Holiday</th>
              <th className="px-3 py-2 font-semibold">Type</th>
              <th className="px-3 py-2 font-semibold">Applicable</th>
              <th className="px-3 py-2 font-semibold">Paid</th>
              <th className="px-3 py-2 font-semibold">Notes</th>
              <th className="px-3 py-2 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-slate-400">
                  Loading holidays...
                </td>
              </tr>
            )}
            {!loading && holidays.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-slate-400">
                  No holidays yet. Upload an Excel sheet or add manually.
                </td>
              </tr>
            )}
            {holidays.map((h) => (
              <tr key={h.id} className="border-b border-slate-50 hover:bg-slate-50/80">
                <td className="px-3 py-2 whitespace-nowrap">{formatHolidayDate(h.date)}</td>
                <td className="px-3 py-2 font-medium text-slate-800">{h.name}</td>
                <td className="px-3 py-2">{h.type}</td>
                <td className="px-3 py-2">{h.applicableTo}</td>
                <td className="px-3 py-2">{h.isPaid ? 'Yes' : 'No'}</td>
                <td className="px-3 py-2 text-slate-500">{h.notes || '—'}</td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => void handleDelete(h.id)}
                    className="text-red-500 hover:text-red-700 p-1"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
