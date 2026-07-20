import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  CalendarDays,
  ClipboardList,
  Trophy,
  Users,
  PartyPopper,
  X,
} from 'lucide-react';
import {
  fetchCalendarBundle,
  removeCalendarEvent,
  upsertCalendarEvent,
} from './calendarEventsApi';
import {
  SECTION_UI,
  categoryMeta,
  defaultCategoryForSection,
  formatDisplayDate,
  formatTimeLabel,
  parseIsoDate,
  toIsoDate,
  type CalendarCategory,
  type CalendarEventItem,
  type CalendarSectionKey,
} from './calendarTypes';

type ViewMode = 'month' | 'week' | 'list';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

export function AcademicCalendarView({
  section,
  title,
}: {
  section: CalendarSectionKey;
  title: string;
}) {
  const lockedCategory = defaultCategoryForSection(section);
  const sectionUi = SECTION_UI[section];
  const meta = categoryMeta(lockedCategory);

  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [view, setView] = useState<ViewMode>('month');
  const [events, setEvents] = useState<CalendarEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '',
    date: toIsoDate(new Date()),
    startTime: '',
    endTime: '',
    description: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { events: next } = await fetchCalendarBundle(cursor.getFullYear());
      // Each sidebar page only shows its own event type
      setEvents(next.filter((e) => e.category === lockedCategory));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load calendar');
    } finally {
      setLoading(false);
    }
  }, [cursor, lockedCategory]);

  useEffect(() => {
    void load();
  }, [load]);

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

  const eventsOn = (iso: string) => events.filter((e) => e.date === iso);

  const upcoming = useMemo(() => {
    const today = toIsoDate(new Date());
    return [...events]
      .filter((e) => e.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date) || (a.startTime || '').localeCompare(b.startTime || ''))
      .slice(0, 6);
  }, [events]);

  const openAdd = (date?: string) => {
    setForm({
      title: '',
      date: date || toIsoDate(new Date()),
      startTime: '',
      endTime: '',
      description: '',
    });
    setModalOpen(true);
  };

  const handleSaveEvent = async () => {
    if (!form.title.trim() || !form.date) {
      setError('Title and date are required.');
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await upsertCalendarEvent({
        title: form.title.trim(),
        category: lockedCategory,
        date: form.date,
        startTime: form.startTime || undefined,
        endTime: form.endTime || undefined,
        description: form.description || undefined,
      });
      setModalOpen(false);
      setMessage(`Saved to ${title}.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save event');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (event: CalendarEventItem) => {
    if (!confirm(`Remove “${event.title}”?`)) return;
    try {
      await removeCalendarEvent(event);
      setMessage('Removed.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete');
    }
  };

  const listEvents = useMemo(() => {
    const y = cursor.getFullYear();
    const m = cursor.getMonth();
    return [...events]
      .filter((e) => {
        const d = parseIsoDate(e.date);
        return d.getFullYear() === y && d.getMonth() === m;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [events, cursor]);

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-800">{title}</h2>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.bg} ${meta.color}`}>
              {meta.label} only
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">{sectionUi.subtitle}</p>
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
          <button
            type="button"
            onClick={() => openAdd()}
            className={`px-4 py-2 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 w-fit ${sectionUi.accentBtn}`}
          >
            <Plus size={14} /> {sectionUi.addLabel}
          </button>

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
                  view === mode ? `${sectionUi.accentBtn} text-white` : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500 py-10 text-center">Loading {title.toLowerCase()}…</p>
        ) : view === 'list' ? (
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Title</th>
                  <th className="px-3 py-2">Time</th>
                  <th className="px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {listEvents.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-slate-400">
                      {sectionUi.emptyHint}
                    </td>
                  </tr>
                )}
                {listEvents.map((e) => (
                  <tr key={e.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 whitespace-nowrap">{formatDisplayDate(e.date)}</td>
                    <td className="px-3 py-2 font-semibold text-slate-800">{e.title}</td>
                    <td className="px-3 py-2">{formatTimeLabel(e.startTime, e.endTime) || '—'}</td>
                    <td className="px-3 py-2">
                      <button type="button" className="text-red-500 hover:text-red-700" onClick={() => void handleDelete(e)}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
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
                    onDoubleClick={() => openAdd(iso)}
                  >
                    <button
                      type="button"
                      onClick={() => openAdd(iso)}
                      className={`text-[11px] font-semibold mb-1 ${
                        !inMonth && view === 'month'
                          ? 'text-slate-300'
                          : isSun
                            ? 'text-red-500'
                            : 'text-slate-700'
                      }`}
                    >
                      {day.getDate()}
                    </button>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, view === 'week' ? 6 : 3).map((e) => (
                        <button
                          key={e.id}
                          type="button"
                          title={e.title}
                          onClick={(ev) => {
                            ev.stopPropagation();
                            if (confirm(`Delete “${e.title}”?`)) void handleDelete(e);
                          }}
                          className={`w-full text-left truncate rounded px-1.5 py-0.5 text-[9px] font-semibold ${meta.bg} ${meta.color}`}
                        >
                          <span className={`inline-block h-1.5 w-1.5 rounded-full mr-1 ${meta.dot}`} />
                          {e.title}
                          {e.startTime ? ` · ${formatTimeLabel(e.startTime)}` : ''}
                        </button>
                      ))}
                      {dayEvents.length > (view === 'week' ? 6 : 3) && (
                        <p className="text-[9px] text-slate-400 pl-1">+{dayEvents.length - (view === 'week' ? 6 : 3)} more</p>
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
            <h3 className="text-sm font-bold text-slate-800">Upcoming — {meta.label}</h3>
            <span className={`text-[11px] font-semibold ${meta.color}`}>{upcoming.length} upcoming</span>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl py-8 text-center">
              {sectionUi.emptyHint}
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {upcoming.map((e) => (
                <div key={e.id} className={`rounded-xl p-3 flex gap-3 ${meta.bg}`}>
                  <div className={`h-10 w-10 rounded-lg bg-white/80 flex items-center justify-center ${meta.color}`}>
                    {eventIcon(e.category)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-800 truncate">{e.title}</p>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      {formatDisplayDate(e.date)}
                      {e.startTime ? `, ${formatTimeLabel(e.startTime, e.endTime)}` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-800">{sectionUi.addLabel}</h3>
                <p className={`text-[11px] font-semibold mt-0.5 ${meta.color}`}>Saves under {meta.label}</p>
              </div>
              <button type="button" onClick={() => setModalOpen(false)} className="p-1 hover:bg-slate-100 rounded">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700">Title *</label>
                <input
                  className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder={
                    lockedCategory === 'EXAMINATION'
                      ? 'Unit Test - I'
                      : lockedCategory === 'HOLIDAYS'
                        ? 'Republic Day'
                        : 'Event title'
                  }
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Date *</label>
                <input
                  type="date"
                  className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Start time</label>
                  <input
                    type="time"
                    className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    value={form.startTime}
                    onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">End time</label>
                  <input
                    type="time"
                    className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    value={form.endTime}
                    onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Notes</label>
                <textarea
                  className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm min-h-[72px]"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              {lockedCategory === 'HOLIDAYS' && (
                <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1.5">
                  Also saved to the shared Holiday master (HR &amp; Payroll).
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-3 py-2 text-xs font-semibold border border-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSaveEvent()}
                className={`px-3 py-2 text-xs font-bold text-white rounded-lg disabled:opacity-60 ${sectionUi.accentBtn}`}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
