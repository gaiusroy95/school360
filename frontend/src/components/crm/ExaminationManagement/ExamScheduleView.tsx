import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpen, CalendarDays, ChevronLeft, ChevronRight, ClipboardList,
  Filter, Loader2, RefreshCw, School,
} from 'lucide-react';
import {
  fetchExamScheduleCalendar,
  fetchExamScheduleMeta,
  seedExamScheduleCalendar,
  type ExamCalendarEvent,
  type ExamScheduleCalendar,
} from '../../../lib/examinationServices';
import { AcademicLoading, AcademicPageHeader, AcademicPageShell, am } from '../AcademicManagement/AcademicManagementUi';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const EVENT_COLORS: Record<string, string> = {
  EXAM: 'bg-blue-100 text-blue-800 border-blue-200',
  CLASS_TEST: 'bg-emerald-100 text-emerald-800 border-emerald-200',
};

const STATUS_COLORS: Record<string, string> = {
  Scheduled: 'text-slate-600',
  Conducted: 'text-green-700',
  'In Progress': 'text-amber-700',
};

function EventChip({ event }: { event: ExamCalendarEvent }) {
  const color = EVENT_COLORS[event.eventType] || EVENT_COLORS.EXAM;
  return (
    <div
      className={`text-[9px] leading-tight px-1.5 py-1 rounded border truncate ${color}`}
      title={`${event.seriesName} — ${event.className} ${event.sectionName} — ${event.subjectName}`}
    >
      <span className="font-semibold">{event.className}-{event.sectionName}</span>
      <span className="mx-0.5">·</span>
      <span>{event.subjectName}</span>
    </div>
  );
}

export function ExamScheduleView() {
  const now = new Date();
  const [meta, setMeta] = useState<Awaited<ReturnType<typeof fetchExamScheduleMeta>> | null>(null);
  const [data, setData] = useState<ExamScheduleCalendar | null>(null);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth() + 1);
  const [className, setClassName] = useState('');
  const [sectionName, setSectionName] = useState('');
  const [examType, setExamType] = useState('all');
  const [eventType, setEventType] = useState('all');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const sectionOptions = useMemo(() => {
    if (!meta) return [];
    if (!className) return [...new Set(Object.values(meta.sectionsByClass).flat())].sort();
    return meta.sectionsByClass[className] || [];
  }, [meta, className]);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      let m = meta;
      if (!m) {
        m = await fetchExamScheduleMeta();
        setMeta(m);
        setAcademicYear(m.defaultAcademicYear);
      }
      const yearFilter = meta ? academicYear : m.defaultAcademicYear;
      let calendar = await fetchExamScheduleCalendar({
        academicYear: yearFilter,
        year: calYear,
        month: calMonth,
        className: className || undefined,
        sectionName: sectionName || undefined,
        examType: examType !== 'all' ? examType : undefined,
        eventType: eventType !== 'all' ? eventType : undefined,
      });
      if (!calendar.events.length) {
        await seedExamScheduleCalendar(yearFilter);
        calendar = await fetchExamScheduleCalendar({
          academicYear: yearFilter,
          year: calYear,
          month: calMonth,
          className: className || undefined,
          sectionName: sectionName || undefined,
          examType: examType !== 'all' ? examType : undefined,
          eventType: eventType !== 'all' ? eventType : undefined,
        });
      }
      setData(calendar);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load exam schedule');
    } finally {
      setLoading(false);
    }
  }, [meta, academicYear, calYear, calMonth, className, sectionName, examType, eventType]);

  const refresh = useCallback(async () => {
    try {
      const calendar = await fetchExamScheduleCalendar({
        academicYear,
        year: calYear,
        month: calMonth,
        className: className || undefined,
        sectionName: sectionName || undefined,
        examType: examType !== 'all' ? examType : undefined,
        eventType: eventType !== 'all' ? eventType : undefined,
      });
      setData(calendar);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to refresh');
    }
  }, [academicYear, calYear, calMonth, className, sectionName, examType, eventType]);

  useEffect(() => { void load(); }, [load]);

  const shiftMonth = (delta: number) => {
    const d = new Date(Date.UTC(calYear, calMonth - 1 + delta, 1));
    setCalYear(d.getUTCFullYear());
    setCalMonth(d.getUTCMonth() + 1);
    setSelectedDate(null);
  };

  const selectedEvents = useMemo(() => {
    if (!selectedDate || !data) return [];
    return data.events.filter((e) => e.date === selectedDate);
  }, [selectedDate, data]);

  const groupedList = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, ExamCalendarEvent[]>();
    for (const ev of data.events) {
      const list = map.get(ev.date) || [];
      list.push(ev);
      map.set(ev.date, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [data]);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await seedExamScheduleCalendar(academicYear);
      await refresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to seed calendar');
    } finally {
      setSeeding(false);
    }
  };

  if (loading && !data) {
    return <AcademicLoading label="Loading exam calendar…" />;
  }

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="Examination Management › Exam Schedule"
        title="Exam Schedule Calendar"
        subtitle="Date-wise examination and class test series — class, section, and subject on each day"
        actions={(
          <>
            <button type="button" onClick={() => void refresh()} className={am.btnSecondary}>
              <RefreshCw size={14} /> Refresh
            </button>
            <button type="button" onClick={() => void handleSeed()} disabled={seeding} className={am.btnSecondary}>
              {seeding ? <Loader2 size={14} className="animate-spin" /> : <CalendarDays size={14} />}
              Load Demo Data
            </button>
          </>
        )}
      />

      <div className={am.content}>
        {errorMsg && (
          <p className="text-xs font-medium text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{errorMsg}</p>
        )}

        <div className={am.filterBar}>
          <Filter size={14} className="text-slate-400" />
          <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className={am.select}>
            {(meta?.academicYears || [academicYear]).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={className} onChange={(e) => { setClassName(e.target.value); setSectionName(''); }} className={am.select}>
            <option value="">All Classes</option>
            {(meta?.classes || []).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={sectionName} onChange={(e) => setSectionName(e.target.value)} className={am.select}>
            <option value="">All Sections</option>
            {sectionOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={examType} onChange={(e) => setExamType(e.target.value)} className={am.select}>
            <option value="all">All Exam Types</option>
            {(meta?.examTypes || []).map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          <select value={eventType} onChange={(e) => setEventType(e.target.value)} className={am.select}>
            <option value="all">Exams + Class Tests</option>
            {(meta?.eventTypes || []).map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          <div className="ml-auto flex gap-1 bg-slate-100 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${viewMode === 'calendar' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}
            >
              Calendar
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}
            >
              List
            </button>
          </div>
        </div>

        {data && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className={`${am.card} ${am.cardPad}`}>
              <p className="text-[10px] font-semibold text-slate-500 uppercase">This Month</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{data.summary.totalEvents}</p>
              <p className="text-[10px] text-slate-500">Total sessions</p>
            </div>
            <div className={`${am.card} ${am.cardPad}`}>
              <p className="text-[10px] font-semibold text-blue-600 uppercase">Examinations</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{data.summary.examCount}</p>
              <p className="text-[10px] text-slate-500">Unit / Term / Final</p>
            </div>
            <div className={`${am.card} ${am.cardPad}`}>
              <p className="text-[10px] font-semibold text-emerald-600 uppercase">Class Tests</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{data.summary.classTestCount}</p>
              <p className="text-[10px] text-slate-500">From lesson planning series</p>
            </div>
            <div className={`${am.card} ${am.cardPad}`}>
              <p className="text-[10px] font-semibold text-slate-500 uppercase">Exam Series</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{data.summary.examSeries.length}</p>
              <p className="text-[10px] text-slate-500">Active schedules</p>
            </div>
          </div>
        )}

        {viewMode === 'calendar' ? (
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
            <div className={`${am.card} overflow-hidden`}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50/80">
                <button type="button" onClick={() => shiftMonth(-1)} className="p-1.5 rounded-lg hover:bg-white border border-transparent hover:border-slate-200">
                  <ChevronLeft size={18} />
                </button>
                <h2 className="text-sm font-bold text-slate-800">{data?.monthLabel || '—'}</h2>
                <button type="button" onClick={() => shiftMonth(1)} className="p-1.5 rounded-lg hover:bg-white border border-transparent hover:border-slate-200">
                  <ChevronRight size={18} />
                </button>
              </div>

              <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/50">
                {WEEKDAYS.map((d) => (
                  <div key={d} className="text-center text-[10px] font-bold text-slate-500 py-2 uppercase">{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7">
                {(data?.calendar || []).map((cell) => {
                  const isSelected = selectedDate === cell.date;
                  const hasEvents = cell.events.length > 0;
                  return (
                    <button
                      key={cell.date}
                      type="button"
                      onClick={() => setSelectedDate(cell.date)}
                      className={`min-h-[88px] p-1.5 border-b border-r border-slate-100 text-left transition-colors ${
                        !cell.isCurrentMonth ? 'bg-slate-50/60 text-slate-400' : 'bg-white hover:bg-blue-50/30'
                      } ${cell.isToday ? 'ring-2 ring-inset ring-amber-400/60' : ''} ${isSelected ? 'bg-blue-50/50' : ''}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-semibold ${cell.isToday ? 'text-amber-700' : ''}`}>{cell.day}</span>
                        {hasEvents && (
                          <span className="text-[8px] font-bold px-1 rounded bg-slate-200 text-slate-600">{cell.events.length}</span>
                        )}
                      </div>
                      <div className="space-y-0.5">
                        {cell.events.slice(0, 3).map((ev) => (
                          <EventChip key={ev.id} event={ev} />
                        ))}
                        {cell.events.length > 3 && (
                          <p className="text-[8px] text-slate-500 font-medium">+{cell.events.length - 3} more</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              <div className={`${am.card} ${am.cardPad}`}>
                <div className="flex items-center gap-2 mb-3">
                  <CalendarDays size={16} className="text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-800">
                    {selectedDate
                      ? new Date(`${selectedDate}T12:00:00`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                      : 'Select a date'}
                  </h3>
                </div>
                {selectedEvents.length === 0 ? (
                  <p className="text-xs text-slate-500">No exams or class tests on this date.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedEvents.map((ev) => (
                      <div key={ev.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${EVENT_COLORS[ev.eventType]}`}>
                            {ev.eventTypeLabel}
                          </span>
                          {ev.examTypeLabel && (
                            <span className="text-[9px] text-slate-500">{ev.examTypeLabel}</span>
                          )}
                        </div>
                        <p className="text-xs font-semibold text-slate-800">{ev.seriesName}</p>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                          <School size={12} />
                          <span>{ev.className} — Section {ev.sectionName}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                          <BookOpen size={12} />
                          <span>{ev.subjectName}</span>
                        </div>
                        {(ev.startTime || ev.endTime) && (
                          <p className="text-[10px] text-slate-500">{ev.startTime}{ev.endTime ? ` – ${ev.endTime}` : ''}</p>
                        )}
                        <p className={`text-[10px] font-medium ${STATUS_COLORS[ev.status] || 'text-slate-600'}`}>{ev.status}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className={`${am.card} ${am.cardPad}`}>
                <div className="flex items-center gap-2 mb-3">
                  <ClipboardList size={16} className="text-slate-600" />
                  <h3 className="text-sm font-bold text-slate-800">Exam Series</h3>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {(data?.summary.examSeries || []).map((s) => (
                    <div key={s.id} className="text-[11px] p-2 rounded-lg border border-slate-100">
                      <p className="font-semibold text-slate-800">{s.name}</p>
                      <p className="text-slate-500">{s.classRange} · {s.examTypeLabel}</p>
                      <p className="text-slate-400">{s.startDate} – {s.endDate}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 text-[10px]">
                <span className={`px-2 py-1 rounded border ${EVENT_COLORS.EXAM}`}>Examination</span>
                <span className={`px-2 py-1 rounded border ${EVENT_COLORS.CLASS_TEST}`}>Class Test Series</span>
              </div>
            </div>
          </div>
        ) : (
          <div className={`${am.card} overflow-hidden`}>
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/80">
              <h3 className="text-sm font-bold text-slate-800">Date-wise Schedule — {data?.monthLabel}</h3>
            </div>
            {groupedList.length === 0 ? (
              <p className="p-6 text-sm text-slate-500">No exams or class tests in this month for the selected filters.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {groupedList.map(([date, events]) => (
                  <div key={date} className="p-4">
                    <p className="text-xs font-bold text-slate-700 mb-2">
                      {new Date(`${date}T12:00:00`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr>
                            <th className="text-[10px] font-semibold text-slate-500 uppercase py-1 pr-3">Type</th>
                            <th className="text-[10px] font-semibold text-slate-500 uppercase py-1 pr-3">Series</th>
                            <th className="text-[10px] font-semibold text-slate-500 uppercase py-1 pr-3">Class</th>
                            <th className="text-[10px] font-semibold text-slate-500 uppercase py-1 pr-3">Section</th>
                            <th className="text-[10px] font-semibold text-slate-500 uppercase py-1 pr-3">Subject</th>
                            <th className="text-[10px] font-semibold text-slate-500 uppercase py-1 pr-3">Time</th>
                            <th className="text-[10px] font-semibold text-slate-500 uppercase py-1">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {events.map((ev) => (
                            <tr key={ev.id} className="border-t border-slate-50">
                              <td className="py-2 pr-3">
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${EVENT_COLORS[ev.eventType]}`}>
                                  {ev.eventType === 'CLASS_TEST' ? 'Class Test' : ev.examTypeLabel || 'Exam'}
                                </span>
                              </td>
                              <td className="py-2 pr-3 text-xs text-slate-700">{ev.seriesName}</td>
                              <td className="py-2 pr-3 text-xs text-slate-700">{ev.className}</td>
                              <td className="py-2 pr-3 text-xs text-slate-700">{ev.sectionName}</td>
                              <td className="py-2 pr-3 text-xs font-medium text-slate-800">{ev.subjectName}</td>
                              <td className="py-2 pr-3 text-xs text-slate-500">{ev.startTime}{ev.endTime ? ` – ${ev.endTime}` : ''}</td>
                              <td className={`py-2 text-xs font-medium ${STATUS_COLORS[ev.status] || 'text-slate-600'}`}>{ev.status}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AcademicPageShell>
  );
}
