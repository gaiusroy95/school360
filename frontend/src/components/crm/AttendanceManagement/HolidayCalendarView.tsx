import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import {
  createHoliday,
  deleteHoliday,
  fetchHolidays,
  fetchPayrollCalendar,
  formatHolidayDate,
  importHolidays,
  type Holiday,
} from '../../../lib/holidayApi';
import {
  downloadHolidayTemplate,
  exportHolidaysToExcel,
  parseHolidayWorkbook,
} from '../../../lib/holidayExcel';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TYPE_OPTIONS = ['NATIONAL', 'RESTRICTED', 'OPTIONAL', 'INSTITUTIONAL', 'OTHER'];
const AUDIENCE_OPTIONS = ['ALL', 'STAFF', 'STUDENTS'];

const TYPE_COLORS: Record<string, string> = {
  NATIONAL: 'bg-red-100 text-red-700 border-red-200',
  RESTRICTED: 'bg-orange-100 text-orange-700 border-orange-200',
  OPTIONAL: 'bg-blue-100 text-blue-700 border-blue-200',
  INSTITUTIONAL: 'bg-purple-100 text-purple-700 border-purple-200',
  OTHER: 'bg-slate-100 text-slate-700 border-slate-200',
};

export function HolidayCalendarView() {
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth() + 1);
  const [calendar, setCalendar] = useState<Awaited<ReturnType<typeof fetchPayrollCalendar>> | null>(null);
  const [yearHolidays, setYearHolidays] = useState<Holiday[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [replaceYear, setReplaceYear] = useState(true);
  const [form, setForm] = useState({
    date: '',
    name: '',
    type: 'NATIONAL',
    applicableTo: 'ALL',
    isPaid: true,
    notes: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [cal, yearData] = await Promise.all([
        fetchPayrollCalendar(calYear, calMonth),
        fetchHolidays({ year: calYear }),
      ]);
      setCalendar(cal);
      setYearHolidays(yearData.holidays);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load holiday calendar');
    } finally {
      setLoading(false);
    }
  }, [calYear, calMonth]);

  useEffect(() => { void load(); }, [load]);

  const shiftMonth = (delta: number) => {
    const d = new Date(Date.UTC(calYear, calMonth - 1 + delta, 1));
    setCalYear(d.getUTCFullYear());
    setCalMonth(d.getUTCMonth() + 1);
    setSelectedDate(null);
  };

  const calendarCells = useMemo(() => {
    if (!calendar) return [];
    const firstDay = new Date(Date.UTC(calYear, calMonth - 1, 1)).getUTCDay();
    const cells: (typeof calendar.calendar[0] | null)[] = Array(firstDay).fill(null);
    cells.push(...calendar.calendar);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [calendar, calYear, calMonth]);

  const monthHolidays = useMemo(() => {
    if (!calendar) return [];
    return calendar.holidays.map((h) => ({
      ...h,
      dateStr: formatHolidayDate(h.date),
    }));
  }, [calendar]);

  const selectedHoliday = useMemo(() => {
    if (!selectedDate) return null;
    return monthHolidays.find((h) => h.dateStr === selectedDate) || null;
  }, [selectedDate, monthHolidays]);

  const upcomingHolidays = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return yearHolidays
      .filter((h) => formatHolidayDate(h.date) >= today)
      .slice(0, 5);
  }, [yearHolidays]);

  const handleAdd = async () => {
    if (!form.date || !form.name.trim()) {
      setErrorMsg('Date and holiday name are required');
      return;
    }
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await createHoliday({
        date: form.date,
        name: form.name.trim(),
        type: form.type,
        applicableTo: form.applicableTo,
        isPaid: form.isPaid,
        notes: form.notes || null,
      });
      setSuccessMsg(`Holiday "${form.name}" added successfully`);
      setForm({ date: '', name: '', type: 'NATIONAL', applicableTo: 'ALL', isPaid: true, notes: '' });
      await load();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to add holiday');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    setSaving(true);
    setErrorMsg(null);
    try {
      await deleteHoliday(id);
      setSuccessMsg(`Holiday "${name}" deleted`);
      setSelectedDate(null);
      await load();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (file: File) => {
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const buffer = await file.arrayBuffer();
      const rows = parseHolidayWorkbook(buffer);
      if (!rows.length) throw new Error('No valid holiday rows found in Excel file');
      const year = replaceYear ? Number(rows[0].date.slice(0, 4)) : undefined;
      const result = await importHolidays(rows, year);
      setSuccessMsg(
        `Imported ${result.created} holidays${result.skipped ? ` (${result.skipped} duplicates skipped)` : ''}`,
      );
      await load();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Excel import failed');
    } finally {
      setSaving(false);
    }
  };

  const monthLabel = new Date(Date.UTC(calYear, calMonth - 1, 1)).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

  return (
    <div className="space-y-6 p-1">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Holiday Calendar</h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage institution holidays — add manually or import from Excel. Synced with attendance & payroll.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={downloadHolidayTemplate}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-emerald-300 text-emerald-700 rounded-lg hover:bg-emerald-50"
          >
            <Download size={16} />
            Excel Template
          </button>
          <label className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer">
            <UploadCloud size={16} />
            Upload Excel
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
            onClick={() => exportHolidaysToExcel(yearHolidays, `Holidays_${calYear}.xlsx`)}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            <Download size={16} />
            Export {calYear}
          </button>
          <button
            type="button"
            onClick={() => void load()}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">{successMsg}</div>
      )}
      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{errorMsg}</div>
      )}

      <label className="inline-flex items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" checked={replaceYear} onChange={(e) => setReplaceYear(e.target.checked)} />
        On Excel import, replace existing holidays for that year before importing
      </label>

      {/* Summary cards */}
      {calendar && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Days in Month', value: calendar.daysInMonth, color: 'text-slate-900' },
            { label: 'Working Days', value: calendar.workingDays, color: 'text-green-600' },
            { label: 'Weekends', value: calendar.weekends, color: 'text-slate-500' },
            { label: 'Holidays', value: calendar.holidayCount, color: 'text-rose-600' },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500">{kpi.label}</p>
              <p className={`text-2xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="xl:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <Calendar size={18} className="text-rose-500" />
              {monthLabel}
            </h2>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => shiftMonth(-1)} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50">
                <ChevronLeft size={16} />
              </button>
              <button type="button" onClick={() => shiftMonth(1)} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 mb-4 text-xs">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-white border border-slate-200" /> Working Day</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-slate-100" /> Weekend</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-rose-100 border border-rose-200" /> Holiday</span>
          </div>

          {loading && !calendar ? (
            <div className="flex justify-center py-16"><Loader2 className="animate-spin text-slate-400" size={24} /></div>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-1 mb-1">
                {WEEKDAYS.map((d) => (
                  <div key={d} className="text-center text-xs font-semibold text-slate-400 py-2">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {calendarCells.map((day, idx) => {
                  if (!day) return <div key={`empty-${idx}`} className="min-h-[80px]" />;
                  const dayNum = Number(day.date.slice(8, 10));
                  const isSelected = selectedDate === day.date;
                  return (
                    <button
                      key={day.date}
                      type="button"
                      onClick={() => setSelectedDate(day.date)}
                      className={`min-h-[80px] rounded-lg border p-2 text-left transition-all ${
                        day.kind === 'weekend'
                          ? 'bg-slate-50 border-slate-100'
                          : day.kind === 'holiday'
                            ? 'bg-rose-50 border-rose-200 hover:border-rose-400'
                            : 'bg-white border-slate-200 hover:border-blue-300'
                      } ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
                    >
                      <span className={`text-sm font-bold ${
                        day.kind === 'holiday' ? 'text-rose-600' : day.kind === 'weekend' ? 'text-slate-400' : 'text-slate-700'
                      }`}>
                        {dayNum}
                      </span>
                      {day.kind === 'holiday' && day.holidayName && (
                        <p className="text-[10px] text-rose-700 mt-1 line-clamp-2 leading-tight font-medium">
                          {day.holidayName}
                        </p>
                      )}
                      {day.kind === 'working' && (
                        <p className="text-[9px] text-slate-400 mt-1">{day.weekday}</p>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          {/* Selected day detail */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900 text-sm mb-3">
              {selectedDate
                ? new Date(`${selectedDate}T00:00:00Z`).toLocaleDateString('en-IN', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  timeZone: 'UTC',
                })
                : 'Select a date'}
            </h3>
            {selectedHoliday ? (
              <div className="space-y-3">
                <p className="font-medium text-rose-700">{selectedHoliday.name}</p>
                <div className="flex flex-wrap gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${TYPE_COLORS[selectedHoliday.type] || TYPE_COLORS.OTHER}`}>
                    {selectedHoliday.type}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {selectedHoliday.applicableTo}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                    {selectedHoliday.isPaid ? 'Paid' : 'Unpaid'}
                  </span>
                </div>
                {selectedHoliday.notes && (
                  <p className="text-sm text-slate-500">{selectedHoliday.notes}</p>
                )}
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleDelete(selectedHoliday.id, selectedHoliday.name)}
                  className="flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
                >
                  <Trash2 size={14} />
                  Delete Holiday
                </button>
              </div>
            ) : selectedDate ? (
              <p className="text-sm text-slate-500">No holiday on this date. Add one using the form below.</p>
            ) : (
              <p className="text-sm text-slate-400">Click a date on the calendar to view details</p>
            )}
          </div>

          {/* Upcoming */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900 text-sm mb-3">Upcoming Holidays</h3>
            {upcomingHolidays.length === 0 ? (
              <p className="text-sm text-slate-400">No upcoming holidays</p>
            ) : (
              <ul className="space-y-2">
                {upcomingHolidays.map((h) => (
                  <li key={h.id} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700 truncate">{h.name}</span>
                    <span className="text-slate-400 text-xs shrink-0 ml-2">{formatHolidayDate(h.date)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Manual add form */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-900 mb-4">Add Holiday Manually</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div>
            <label className="text-xs text-slate-500 block mb-1">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="lg:col-span-2">
            <label className="text-xs text-slate-500 block mb-1">Holiday Name</label>
            <input
              type="text"
              placeholder="e.g. Republic Day"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            >
              {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Applicable To</label>
            <select
              value={form.applicableTo}
              onChange={(e) => setForm((p) => ({ ...p, applicableTo: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            >
              {AUDIENCE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleAdd()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium bg-amber-500 text-slate-900 rounded-lg hover:bg-amber-600 disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Add Holiday
            </button>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={form.isPaid}
              onChange={(e) => setForm((p) => ({ ...p, isPaid: e.target.checked }))}
            />
            Paid Holiday
          </label>
          <input
            type="text"
            placeholder="Notes (optional)"
            value={form.notes}
            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* Month holiday list */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Holidays in {monthLabel}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3">Holiday</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-left px-4 py-3">Applicable To</th>
                <th className="text-left px-4 py-3">Paid</th>
                <th className="text-left px-4 py-3">Notes</th>
                <th className="text-left px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {monthHolidays.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    No holidays this month. Add manually or upload an Excel sheet.
                  </td>
                </tr>
              ) : monthHolidays.map((h) => (
                <tr key={h.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{h.dateStr}</td>
                  <td className="px-4 py-3 text-slate-800">{h.name}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${TYPE_COLORS[h.type] || TYPE_COLORS.OTHER}`}>
                      {h.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{h.applicableTo}</td>
                  <td className="px-4 py-3">{h.isPaid ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-3 text-slate-400 max-w-[200px] truncate">{h.notes || '—'}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void handleDelete(h.id, h.name)}
                      className="text-red-500 hover:text-red-700 p-1 disabled:opacity-50"
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
    </div>
  );
}
