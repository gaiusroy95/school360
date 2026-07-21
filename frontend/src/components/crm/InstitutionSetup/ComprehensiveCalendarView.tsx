import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  ClipboardList,
  Trophy,
  Users,
  PartyPopper,
  Send,
  Smartphone,
  GraduationCap,
  Briefcase,
} from 'lucide-react';
import {
  fetchComprehensiveCalendar,
  publishComprehensiveCalendar,
  type CalendarPublishInfo,
} from './calendarEventsApi';
import {
  CALENDAR_CATEGORIES,
  categoryMeta,
  formatDisplayDate,
  formatTimeLabel,
  parseIsoDate,
  toIsoDate,
  type CalendarCategory,
  type CalendarEventItem,
} from './calendarTypes';

type ViewMode = 'month' | 'week' | 'list';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const VISIBLE_CATEGORIES: CalendarCategory[] = [
  'ACADEMIC',
  'EXAMINATION',
  'EVENTS',
  'HOLIDAYS',
  'CUSTOM',
  'CO_CURRICULAR',
  'MEETING',
];

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function startOfWeek(d: Date) {
  const x = new Date(d);
  x.setDate(x.getDate() - x.getDay());
  x.setHours(0, 0, 0, 0);
  return x;
}

function eventIcon(category: CalendarCategory) {
  if (category === 'EXAMINATION') return <ClipboardList size={18} />;
  if (category === 'EVENTS' || category === 'CO_CURRICULAR') return <Trophy size={18} />;
  if (category === 'MEETING') return <Users size={18} />;
  if (category === 'HOLIDAYS') return <PartyPopper size={18} />;
  return <CalendarDays size={18} />;
}

function formatPublishedAt(iso: string) {
  try {
    return new Date(iso).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

export function ComprehensiveCalendarView() {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [view, setView] = useState<ViewMode>('month');
  const [events, setEvents] = useState<CalendarEventItem[]>([]);
  const [publishInfo, setPublishInfo] = useState<CalendarPublishInfo | null>(null);
  const [publishedEventCount, setPublishedEventCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [activeCategories, setActiveCategories] = useState<Set<CalendarCategory>>(
    () => new Set(VISIBLE_CATEGORIES),
  );
  const [staffApp, setStaffApp] = useState(true);
  const [studentApp, setStudentApp] = useState(true);
  const [parentApp, setParentApp] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchComprehensiveCalendar(cursor.getFullYear());
      setEvents(data.events);
      setPublishInfo(data.publish);
      setPublishedEventCount(data.publishedEventCount);
      if (data.publish) {
        setStaffApp(data.publish.staffApp === 'Yes');
        setStudentApp(data.publish.studentApp === 'Yes');
        setParentApp(data.publish.parentApp === 'Yes');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load comprehensive calendar');
    } finally {
      setLoading(false);
    }
  }, [cursor]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredEvents = useMemo(
    () => events.filter((e) => activeCategories.has(e.category)),
    [events, activeCategories],
  );

  const monthLabel = cursor.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const monthCells = useMemo(() => {
    const first = startOfMonth(cursor);
    const gridStart = startOfWeek(first);
    const cells: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      cells.push(d);
    }
    return cells;
  }, [cursor]);

  const weekCells = useMemo(() => {
    const base =
      cursor.getMonth() === new Date().getMonth() && cursor.getFullYear() === new Date().getFullYear()
        ? startOfWeek(new Date())
        : startOfWeek(new Date(cursor.getFullYear(), cursor.getMonth(), 15));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return d;
    });
  }, [cursor]);

  const eventsOn = (iso: string) => filteredEvents.filter((e) => e.date === iso);

  const upcoming = useMemo(() => {
    const today = toIsoDate(new Date());
    return [...filteredEvents]
      .filter((e) => e.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date) || (a.startTime || '').localeCompare(b.startTime || ''))
      .slice(0, 8);
  }, [filteredEvents]);

  const listEvents = useMemo(() => {
    const y = cursor.getFullYear();
    const m = cursor.getMonth();
    return [...filteredEvents]
      .filter((e) => {
        const d = parseIsoDate(e.date);
        return d.getFullYear() === y && d.getMonth() === m;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredEvents, cursor]);

  const toggleCategory = (cat: CalendarCategory) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        if (next.size > 1) next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  };

  const handlePublish = async () => {
    if (!staffApp && !studentApp && !parentApp) {
      setError('Select at least one app to publish.');
      return;
    }
    setPublishing(true);
    setError('');
    setMessage('');
    try {
      const result = await publishComprehensiveCalendar({
        staffApp,
        studentApp,
        parentApp,
        year: cursor.getFullYear(),
      });
      setPublishInfo(result.publish);
      setPublishedEventCount(result.eventCount);
      setMessage(result.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Publish failed');
    } finally {
      setPublishing(false);
    }
  };

  const countsByCategory = useMemo(() => {
    const map = new Map<CalendarCategory, number>();
    for (const e of events) {
      map.set(e.category, (map.get(e.category) || 0) + 1);
    }
    return map;
  }, [events]);

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-100">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-800">Comprehensive Calendar</h2>
            <p className="text-[11px] text-slate-500 mt-0.5 max-w-xl">
              All calendars sync here — Academic, Events, Exams, Holidays, and Custom events appear in one
              unified view. Publish this snapshot to Staff, Student, and Parent apps.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {CALENDAR_CATEGORIES.filter((c) => VISIBLE_CATEGORIES.includes(c.id)).map((cat) => {
              const on = activeCategories.has(cat.id);
              const count = countsByCategory.get(cat.id) || 0;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggleCategory(cat.id)}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-opacity ${
                    on ? `${cat.bg} ${cat.color} border-transparent` : 'bg-white text-slate-400 border-slate-200 opacity-60'
                  }`}
                >
                  <span className={`inline-block h-1.5 w-1.5 rounded-full mr-1 ${cat.dot}`} />
                  {cat.label}
                  {count > 0 ? ` (${count})` : ''}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="p-5 border-b border-slate-100 bg-indigo-50/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Send size={14} className="text-indigo-600" />
              Publish to mobile apps
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {publishInfo?.publishedAt
                ? `Last published ${formatPublishedAt(publishInfo.publishedAt)} by ${publishInfo.publishedBy} (${publishedEventCount} events)`
                : 'Not published yet — events from all calendars will be sent to selected apps.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input type="checkbox" checked={staffApp} onChange={(e) => setStaffApp(e.target.checked)} />
              <Briefcase size={14} className="text-slate-500" />
              Staff App
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input type="checkbox" checked={studentApp} onChange={(e) => setStudentApp(e.target.checked)} />
              <GraduationCap size={14} className="text-slate-500" />
              Student App
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input type="checkbox" checked={parentApp} onChange={(e) => setParentApp(e.target.checked)} />
              <Smartphone size={14} className="text-slate-500" />
              Parent App
            </label>
            <button
              type="button"
              disabled={publishing || loading}
              onClick={() => void handlePublish()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-60"
            >
              <Send size={14} />
              {publishing ? 'Publishing…' : 'Publish Calendar'}
            </button>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
        )}
        {message && (
          <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
            {message}
          </p>
        )}

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            <span className="font-semibold text-slate-700">{filteredEvents.length}</span> events in{' '}
            {cursor.getFullYear()} · edit events in their respective calendar tabs
          </p>

          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              className="p-1.5 rounded-full hover:bg-slate-100 text-slate-600"
              onClick={() => setCursor((c) => addMonths(c, -1))}
            >
              <ChevronLeft size={18} />
            </button>
            <p className="text-sm font-bold text-slate-800 min-w-[140px] text-center">{monthLabel}</p>
            <button
              type="button"
              className="p-1.5 rounded-full hover:bg-slate-100 text-slate-600"
              onClick={() => setCursor((c) => addMonths(c, 1))}
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCursor(startOfMonth(new Date()))}
              className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              Today
            </button>
            {(['month', 'week', 'list'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setView(mode)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize ${
                  view === mode
                    ? 'bg-indigo-600 text-white'
                    : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500 py-10 text-center">Loading comprehensive calendar…</p>
        ) : view === 'list' ? (
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Title</th>
                  <th className="px-3 py-2">Time</th>
                </tr>
              </thead>
              <tbody>
                {listEvents.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-slate-400">
                      No events for this month. Add events in Academic, Event, Exam, Holiday, or Custom calendars.
                    </td>
                  </tr>
                )}
                {listEvents.map((e) => {
                  const meta = categoryMeta(e.category);
                  return (
                    <tr key={e.id} className="border-t border-slate-100">
                      <td className="px-3 py-2 whitespace-nowrap">{formatDisplayDate(e.date)}</td>
                      <td className="px-3 py-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.bg} ${meta.color}`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-semibold text-slate-800">{e.title}</td>
                      <td className="px-3 py-2">{formatTimeLabel(e.startTime, e.endTime) || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="grid grid-cols-7 bg-sky-50/80 text-[11px] font-semibold text-slate-600">
              {WEEKDAYS.map((d, i) => (
                <div key={d} className={`px-2 py-2 text-center ${i === 0 ? 'text-red-500' : ''}`}>
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 auto-rows-fr">
              {(view === 'week' ? weekCells : monthCells).map((day) => {
                const iso = toIsoDate(day);
                const inMonth = day.getMonth() === cursor.getMonth();
                const isSun = day.getDay() === 0;
                const dayEvents = eventsOn(iso);
                return (
                  <div
                    key={iso + String(day.getTime())}
                    className={`min-h-[96px] border border-slate-100 p-1.5 ${inMonth || view === 'week' ? 'bg-white' : 'bg-slate-50/50'}`}
                  >
                    <span
                      className={`text-[11px] font-semibold mb-1 block ${
                        !inMonth && view === 'month'
                          ? 'text-slate-300'
                          : isSun
                            ? 'text-red-500'
                            : 'text-slate-700'
                      }`}
                    >
                      {day.getDate()}
                    </span>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, view === 'week' ? 6 : 3).map((e) => {
                        const meta = categoryMeta(e.category);
                        return (
                          <div
                            key={e.id}
                            title={`${meta.label}: ${e.title}`}
                            className={`w-full text-left truncate rounded px-1.5 py-0.5 text-[9px] font-semibold ${meta.bg} ${meta.color}`}
                          >
                            <span className={`inline-block h-1.5 w-1.5 rounded-full mr-1 ${meta.dot}`} />
                            {e.title}
                          </div>
                        );
                      })}
                      {dayEvents.length > (view === 'week' ? 6 : 3) && (
                        <p className="text-[9px] text-slate-400 pl-1">
                          +{dayEvents.length - (view === 'week' ? 6 : 3)} more
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-800">Upcoming — All calendars</h3>
            <span className="text-[11px] font-semibold text-indigo-600">{upcoming.length} upcoming</span>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl py-8 text-center">
              No upcoming events. Add events in any calendar tab — they will appear here automatically.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              {upcoming.map((e) => {
                const meta = categoryMeta(e.category);
                return (
                  <div key={e.id} className={`rounded-xl p-3 flex gap-3 ${meta.bg}`}>
                    <div className={`h-10 w-10 rounded-lg bg-white/80 flex items-center justify-center ${meta.color}`}>
                      {eventIcon(e.category)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">{meta.label}</p>
                      <p className="text-sm font-bold text-slate-800 truncate">{e.title}</p>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        {formatDisplayDate(e.date)}
                        {e.startTime ? `, ${formatTimeLabel(e.startTime, e.endTime)}` : ''}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
