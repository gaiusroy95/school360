import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Download, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';
import { fetchPayrollCalendar, type PayrollCalendar } from '../../../lib/holidayApi';
import { HolidayManager, downloadHolidayTemplate } from '../InstitutionSetup/HolidayManager';

export function PayrollCalendarView({ title = 'Payroll Calendar' }: { title?: string }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<PayrollCalendar | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const monthLabel = useMemo(
    () => new Date(Date.UTC(year, month - 1, 1)).toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
    [year, month],
  );

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await fetchPayrollCalendar(year, month);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load payroll calendar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [year, month]);

  const exportMonth = () => {
    if (!data) return;
    const wb = XLSX.utils.book_new();
    const rows = [
      ['Date', 'Weekday', 'Kind', 'Holiday Name'],
      ...data.calendar.map((d) => [d.date, d.weekday, d.kind, d.holidayName || '']),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Payroll Calendar');
    XLSX.writeFile(wb, `Payroll_Calendar_${year}_${String(month).padStart(2, '0')}.xlsx`);
  };

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <CalendarDays className="text-indigo-600" size={22} />
            {title}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Working days are calculated from weekends + institution holiday master (staff-applicable).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="border border-slate-300 rounded-lg px-2 py-2 text-xs"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(2000, i, 1).toLocaleString('en-US', { month: 'long' })}
              </option>
            ))}
          </select>
          <input
            type="number"
            className="w-24 border border-slate-300 rounded-lg px-2 py-2 text-xs"
            value={year}
            onChange={(e) => setYear(Number(e.target.value) || now.getFullYear())}
          />
          <button
            type="button"
            onClick={() => void load()}
            className="px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold hover:bg-slate-50 flex items-center gap-1"
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            type="button"
            onClick={exportMonth}
            disabled={!data}
            className="px-3 py-2 border border-emerald-500 text-emerald-700 rounded-lg text-xs font-bold hover:bg-emerald-50 flex items-center gap-1 disabled:opacity-50"
          >
            <Download size={14} /> Export Month
          </button>
          <button
            type="button"
            onClick={downloadHolidayTemplate}
            className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700"
          >
            Holiday Template
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Month', value: monthLabel },
          { label: 'Days in Month', value: data ? String(data.daysInMonth) : '—' },
          { label: 'Working Days', value: data ? String(data.workingDays) : '—' },
          { label: 'Holidays', value: data ? String(data.holidayCount) : '—' },
          { label: 'Weekends', value: data ? String(data.weekends) : '—' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wide">{kpi.label}</p>
            <p className="text-sm font-bold text-slate-800 mt-1">{loading ? '...' : kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">Month Calendar (Payroll)</h3>
          <div className="flex gap-3 text-[10px] font-semibold">
            <span className="text-green-700">● Working</span>
            <span className="text-slate-500">● Weekend</span>
            <span className="text-amber-700">● Holiday</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Weekday</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Holiday</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-slate-400">
                    Loading calendar...
                  </td>
                </tr>
              )}
              {!loading &&
                data?.calendar.map((day) => (
                  <tr
                    key={day.date}
                    className={`border-b border-slate-50 ${
                      day.kind === 'holiday'
                        ? 'bg-amber-50/70'
                        : day.kind === 'weekend'
                          ? 'bg-slate-50'
                          : ''
                    }`}
                  >
                    <td className="px-3 py-2 font-medium">{day.date}</td>
                    <td className="px-3 py-2">{day.weekday}</td>
                    <td className="px-3 py-2 capitalize font-semibold">
                      <span
                        className={
                          day.kind === 'holiday'
                            ? 'text-amber-700'
                            : day.kind === 'weekend'
                              ? 'text-slate-500'
                              : 'text-green-700'
                        }
                      >
                        {day.kind}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-600">{day.holidayName || '—'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <HolidayManager
        title="Holiday Master (shared with Institution Setup)"
        description="Changes here update the same holiday list used by Institution Setup and payroll working-day calculation."
      />
    </div>
  );
}
