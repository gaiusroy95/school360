import { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { fetchEventInvitationsManagement } from '../../../lib/communicationServices';
import { fetchDepartmentOpsOverview } from '../../../lib/settingsDepartmentOperationsServices';
import { AcademicLoading } from '../FeeFinanceManagement/FeeFinanceUi';

type CalEvent = { id: string; title: string; date: Date; endDate?: Date; source: string; category: string };

export function EventCalendarView() {
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [cursor, setCursor] = useState(() => new Date());
  const [events, setEvents] = useState<CalEvent[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [invitations, deptOps] = await Promise.all([
        fetchEventInvitationsManagement(false, academicYear, 'Super Admin'),
        fetchDepartmentOpsOverview().catch(() => null),
      ]);

      const merged: CalEvent[] = invitations.events.map((e) => ({
        id: e.id,
        title: e.title,
        date: new Date(e.eventDate),
        source: 'invitation',
        category: e.eventTypeLabel,
      }));

      for (const row of deptOps?.eventCalendar ?? []) {
        const start = String(row.startDate ?? row.date ?? '');
        if (!start) continue;
        merged.push({
          id: String(row.id ?? `cal-${start}`),
          title: String(row.title ?? 'Event'),
          date: new Date(start),
          endDate: row.endDate ? new Date(String(row.endDate)) : undefined,
          source: 'calendar',
          category: String(row.audience ?? 'ALL'),
        });
      }

      for (const row of deptOps?.customEvents ?? []) {
        const start = String(row.startDate ?? '');
        if (!start) continue;
        merged.push({
          id: String(row.id ?? `custom-${start}`),
          title: String(row.title ?? 'Custom Event'),
          date: new Date(start),
          endDate: row.endDate ? new Date(String(row.endDate)) : undefined,
          source: 'custom',
          category: String(row.departmentCode ?? 'Dept'),
        });
      }

      setEvents(merged);
    } finally {
      setLoading(false);
    }
  }, [academicYear]);

  useEffect(() => { void load(); }, [load]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const monthLabel = cursor.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay();

  const eventsByDay = useMemo(() => {
    const map = new Map<number, CalEvent[]>();
    for (const e of events) {
      if (e.date.getFullYear() === year && e.date.getMonth() === month) {
        const d = e.date.getDate();
        const list = map.get(d) ?? [];
        list.push(e);
        map.set(d, list);
      }
    }
    return map;
  }, [events, year, month]);

  const monthEvents = useMemo(
    () => events.filter((e) => e.date.getFullYear() === year && e.date.getMonth() === month),
    [events, year, month],
  );

  const today = new Date();

  if (loading) return <AcademicLoading label="Loading event calendar…" />;

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Event Calendar</h2>
          <p className="text-xs text-slate-500 mt-0.5">School events, invitations & institutional calendar entries</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className="text-xs border rounded px-2 py-1.5 bg-white">
            <option value="2025-26">2025-26</option>
            <option value="2024-25">2024-25</option>
          </select>
          <button type="button" onClick={() => void load()} className="p-1.5 border border-slate-200 rounded hover:bg-slate-50">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 flex-1 min-h-0">
        <div className="xl:col-span-2 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <button type="button" onClick={() => setCursor(new Date(year, month - 1, 1))} className="text-slate-400 hover:text-slate-700">
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-bold text-slate-800">{monthLabel}</span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setCursor(new Date())} className="text-[10px] bg-slate-100 px-2 py-0.5 rounded">Today</button>
              <button type="button" onClick={() => setCursor(new Date(year, month + 1, 1))} className="text-slate-400 hover:text-slate-700">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 text-center text-[10px] text-slate-400 font-medium mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-y-2 text-center text-[11px]">
            {Array.from({ length: firstDow }).map((_, i) => <div key={`pad-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayEvents = eventsByDay.get(day) ?? [];
              const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
              return (
                <div key={day} className={`relative py-1 rounded ${isToday ? 'bg-blue-600 text-white font-bold' : 'text-slate-700'}`}>
                  {day}
                  {dayEvents.length > 0 && (
                    <div className={`flex justify-center gap-0.5 mt-0.5 ${isToday ? '' : ''}`}>
                      {dayEvents.slice(0, 3).map((e) => (
                        <div
                          key={e.id}
                          className={`w-1 h-1 rounded-full ${e.source === 'invitation' ? 'bg-blue-500' : e.source === 'custom' ? 'bg-purple-500' : 'bg-green-500'} ${isToday ? 'bg-white' : ''}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-slate-100 text-[9px] text-slate-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Invitations</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Inst. Calendar</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500" /> Custom Events</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm overflow-y-auto">
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={14} className="text-indigo-600" />
            <h3 className="text-xs font-bold text-slate-800">This Month ({monthEvents.length})</h3>
          </div>
          {monthEvents.length === 0 ? (
            <p className="text-xs text-slate-500">No events this month.</p>
          ) : (
            <div className="space-y-2">
              {monthEvents.sort((a, b) => a.date.getTime() - b.date.getTime()).map((e) => (
                <div key={e.id} className="p-2 rounded-lg border border-slate-100 hover:bg-slate-50">
                  <p className="text-[10px] font-bold text-slate-800">{e.title}</p>
                  <p className="text-[9px] text-slate-500">
                    {e.date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                    {' • '}{e.category}
                  </p>
                  <span className={`text-[8px] px-1.5 py-0.5 rounded mt-1 inline-block ${
                    e.source === 'invitation' ? 'bg-blue-50 text-blue-700' : e.source === 'custom' ? 'bg-purple-50 text-purple-700' : 'bg-green-50 text-green-700'
                  }`}>
                    {e.source === 'invitation' ? 'RSVP Event' : e.source === 'custom' ? 'Custom' : 'Calendar'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
