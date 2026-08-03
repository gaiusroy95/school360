import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpen, CalendarDays, ChevronLeft, ChevronRight, ClipboardList,
  Copy, Filter, Link2, Loader2, Plus, RefreshCw, School, Upload, RefreshCcw,
} from 'lucide-react';
import {
  captureExamSessionResults,
  createScheduledExam,
  fetchExamScheduleCalendar,
  fetchExamScheduleCreateMeta,
  fetchExamScheduleMeta,
  publishDueDigitalExams,
  syncExamScheduleCalendar,
  type ExamCalendarEvent,
  type ExamScheduleCalendar,
  type ExamScheduleCreateMeta,
  type ScheduledExamSession,
} from '../../../lib/examinationServices';
import { AcademicLoading, AcademicModal, AcademicPageHeader, AcademicPageShell, am } from '../AcademicManagement/AcademicManagementUi';

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

type Tab = 'calendar' | 'list' | 'create' | 'sync';

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
      {event.examMode === 'DIGITAL' && <span className="ml-0.5 text-indigo-600">●</span>}
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function ExamScheduleView() {
  const now = new Date();
  const [tab, setTab] = useState<Tab>('calendar');
  const [meta, setMeta] = useState<Awaited<ReturnType<typeof fetchExamScheduleMeta>> | null>(null);
  const [createMeta, setCreateMeta] = useState<ExamScheduleCreateMeta | null>(null);
  const [data, setData] = useState<ExamScheduleCalendar | null>(null);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth() + 1);
  const [className, setClassName] = useState('');
  const [sectionName, setSectionName] = useState('');
  const [examType, setExamType] = useState('all');
  const [eventType, setEventType] = useState('all');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [createdSession, setCreatedSession] = useState<ScheduledExamSession | null>(null);

  const [form, setForm] = useState({
    examMode: 'DIGITAL' as 'DIGITAL' | 'MANUAL',
    examType: 'UNIT_TEST',
    seriesName: '',
    className: '',
    sectionName: '',
    subjectName: '',
    examDate: '',
    startTime: '09:00 AM',
    endTime: '12:00 PM',
    publishAt: '',
    paperSource: 'QUESTION_BANK' as 'QUESTION_BANK' | 'PAPER_UPLOAD' | 'NONE',
    questionPaperId: '',
    teacherName: '',
    notes: '',
    syncToAcademicCalendar: true,
    createMarksAssignment: true,
    newPaperTitle: '',
  });
  const [uploadMeta, setUploadMeta] = useState<{ fileName: string; mimeType?: string; fileData?: string; sizeBytes?: number }[]>([]);

  const sectionOptions = useMemo(() => {
    if (!meta) return [];
    if (!className) return [...new Set(Object.values(meta.sectionsByClass).flat())].sort();
    return meta.sectionsByClass[className] || [];
  }, [meta, className]);

  const formSectionOptions = useMemo(() => {
    if (!meta || !form.className) return [];
    return meta.sectionsByClass[form.className] || [];
  }, [meta, form.className]);

  const subjectOptions = useMemo(() => {
    if (!createMeta) return [];
    if (form.className && createMeta.subjectsByClass[form.className]?.length) {
      return createMeta.subjectsByClass[form.className];
    }
    return createMeta.subjects;
  }, [createMeta, form.className]);

  const filteredPapers = useMemo(() => {
    if (!createMeta) return [];
    return createMeta.papers.filter((p) => {
      if (form.className && p.className !== form.className) return false;
      if (form.subjectName && p.subjectName !== form.subjectName) return false;
      if (form.examMode === 'DIGITAL' && p.numQuestions < 1) return false;
      return true;
    });
  }, [createMeta, form.className, form.subjectName, form.examMode]);

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
      const calendar = await fetchExamScheduleCalendar({
        academicYear: yearFilter,
        year: calYear,
        month: calMonth,
        className: className || undefined,
        sectionName: sectionName || undefined,
        examType: examType !== 'all' ? examType : undefined,
        eventType: eventType !== 'all' ? eventType : undefined,
      });
      setData(calendar);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load exam schedule');
    } finally {
      setLoading(false);
    }
  }, [meta, academicYear, calYear, calMonth, className, sectionName, examType, eventType]);

  const loadCreateMeta = useCallback(async (year: string) => {
    try {
      const cm = await fetchExamScheduleCreateMeta(year);
      setCreateMeta(cm);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load create meta');
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (tab === 'create' || tab === 'sync') void loadCreateMeta(academicYear);
  }, [tab, academicYear, loadCreateMeta]);

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

  const handleCreate = async () => {
    setActionLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const result = await createScheduledExam({
        academicYear,
        examMode: form.examMode,
        examType: form.examType,
        seriesName: form.seriesName || (meta?.examTypes.find((t) => t.id === form.examType)?.label || 'Examination'),
        className: form.className,
        sectionName: form.sectionName,
        subjectName: form.subjectName,
        examDate: form.examDate,
        startTime: form.startTime,
        endTime: form.endTime,
        publishAt: form.examMode === 'DIGITAL' && form.publishAt ? new Date(form.publishAt).toISOString() : undefined,
        paperSource: form.examMode === 'MANUAL' && form.paperSource === 'NONE' ? 'NONE' : form.paperSource,
        questionPaperId: form.questionPaperId || undefined,
        uploadedPaperMeta: form.paperSource === 'PAPER_UPLOAD' ? uploadMeta : undefined,
        newPaperTitle: form.newPaperTitle || undefined,
        teacherName: form.teacherName || undefined,
        notes: form.notes || undefined,
        syncToAcademicCalendar: form.syncToAcademicCalendar,
        createMarksAssignment: form.createMarksAssignment,
      });
      setCreatedSession(result.session);
      setSuccessMsg(result.message);
      await load();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create exam');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSync = async () => {
    setActionLoading(true);
    setErrorMsg(null);
    try {
      const result = await syncExamScheduleCalendar({ academicYear, year: calYear, month: calMonth });
      setSuccessMsg(result.message);
      await load();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePublishDue = async () => {
    setActionLoading(true);
    try {
      const result = await publishDueDigitalExams();
      setSuccessMsg(result.published ? `Published ${result.published} digital exam link(s)` : 'No exams due for publish right now');
      await load();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Publish failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCapture = async (sessionId: string) => {
    setActionLoading(true);
    try {
      const result = await captureExamSessionResults(sessionId);
      setSuccessMsg(result.message);
      await load();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Capture failed');
    } finally {
      setActionLoading(false);
    }
  };

  const copyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setSuccessMsg('Exam link copied');
    } catch {
      setSuccessMsg(link);
    }
  };

  if (loading && !data) {
    return <AcademicLoading label="Loading exam calendar…" />;
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'calendar', label: 'Calendar' },
    { id: 'list', label: 'List Schedule' },
    { id: 'create', label: 'Create Exam' },
    { id: 'sync', label: 'Sync' },
  ];

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="Examination Management › Exam Schedule"
        title="Exam Schedule"
        subtitle="Create digital or manual exams, publish exam links on schedule, sync with Academic Calendar, and capture results into Marks Entry"
        actions={(
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setTab('create')} className={am.btnPrimary}>
              <Plus size={14} /> Create Exam
            </button>
            <button type="button" onClick={() => void load()} className={am.btnSecondary}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        )}
      />

      <div className={am.content}>
        {errorMsg && (
          <p className="text-xs font-medium text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{errorMsg}</p>
        )}
        {successMsg && (
          <p className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">{successMsg}</p>
        )}

        <div className="flex flex-wrap gap-1 bg-slate-100 rounded-lg p-0.5 w-fit">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                tab === t.id ? 'bg-white shadow text-slate-900' : 'text-slate-500'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {(tab === 'calendar' || tab === 'list') && (
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
          </div>
        )}

        {(tab === 'calendar' || tab === 'list') && data && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className={`${am.card} ${am.cardPad}`}>
              <p className="text-[10px] font-semibold text-slate-500 uppercase">This Month</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{data.summary.totalEvents}</p>
            </div>
            <div className={`${am.card} ${am.cardPad}`}>
              <p className="text-[10px] font-semibold text-blue-600 uppercase">Examinations</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{data.summary.examCount}</p>
            </div>
            <div className={`${am.card} ${am.cardPad}`}>
              <p className="text-[10px] font-semibold text-emerald-600 uppercase">Class Tests</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{data.summary.classTestCount}</p>
            </div>
            <div className={`${am.card} ${am.cardPad}`}>
              <p className="text-[10px] font-semibold text-indigo-600 uppercase">Digital Links</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {data.events.filter((e) => e.examMode === 'DIGITAL').length}
              </p>
            </div>
          </div>
        )}

        {tab === 'calendar' && (
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
                        {cell.events.length > 0 && (
                          <span className="text-[8px] font-bold px-1 rounded bg-slate-200 text-slate-600">{cell.events.length}</span>
                        )}
                      </div>
                      <div className="space-y-0.5">
                        {cell.events.slice(0, 3).map((ev) => <EventChip key={ev.id} event={ev} />)}
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
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${EVENT_COLORS[ev.eventType]}`}>
                            {ev.eventTypeLabel}
                          </span>
                          {ev.examMode && (
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${ev.examMode === 'DIGITAL' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200 text-slate-700'}`}>
                              {ev.examMode}
                            </span>
                          )}
                          {ev.syncedToCalendar && (
                            <span className="text-[9px] text-emerald-700">Synced</span>
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
                        {ev.examLink && (
                          <button type="button" onClick={() => void copyLink(ev.examLink!)} className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-700">
                            <Link2 size={12} /> Copy exam link {ev.isLinkLive ? '(live)' : '(scheduled)'}
                          </button>
                        )}
                        {ev.examMode === 'DIGITAL' && ev.source === 'calendar' && (
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => void handleCapture(ev.id)}
                            className="text-[10px] font-semibold text-emerald-700"
                          >
                            Capture results → Marks Entry
                          </button>
                        )}
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
            </div>
          </div>
        )}

        {tab === 'list' && (
          <div className={`${am.card} overflow-hidden`}>
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">Date-wise Schedule — {data?.monthLabel}</h3>
              <div className="flex gap-1">
                <button type="button" onClick={() => shiftMonth(-1)} className={am.btnSecondary}><ChevronLeft size={14} /></button>
                <button type="button" onClick={() => shiftMonth(1)} className={am.btnSecondary}><ChevronRight size={14} /></button>
              </div>
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
                            <th className="text-[10px] font-semibold text-slate-500 uppercase py-1 pr-3">Mode</th>
                            <th className="text-[10px] font-semibold text-slate-500 uppercase py-1 pr-3">Series</th>
                            <th className="text-[10px] font-semibold text-slate-500 uppercase py-1 pr-3">Class / Sec</th>
                            <th className="text-[10px] font-semibold text-slate-500 uppercase py-1 pr-3">Subject</th>
                            <th className="text-[10px] font-semibold text-slate-500 uppercase py-1 pr-3">Time</th>
                            <th className="text-[10px] font-semibold text-slate-500 uppercase py-1 pr-3">Status</th>
                            <th className="text-[10px] font-semibold text-slate-500 uppercase py-1">Actions</th>
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
                              <td className="py-2 pr-3 text-[10px] font-semibold text-slate-600">{ev.examMode || '—'}</td>
                              <td className="py-2 pr-3 text-xs text-slate-700">{ev.seriesName}</td>
                              <td className="py-2 pr-3 text-xs text-slate-700">{ev.className}-{ev.sectionName}</td>
                              <td className="py-2 pr-3 text-xs font-medium text-slate-800">{ev.subjectName}</td>
                              <td className="py-2 pr-3 text-xs text-slate-500">{ev.startTime}{ev.endTime ? ` – ${ev.endTime}` : ''}</td>
                              <td className={`py-2 pr-3 text-xs font-medium ${STATUS_COLORS[ev.status] || 'text-slate-600'}`}>{ev.status}</td>
                              <td className="py-2 text-[10px] space-x-2">
                                {ev.examLink && (
                                  <button type="button" onClick={() => void copyLink(ev.examLink!)} className="font-semibold text-indigo-700">Copy link</button>
                                )}
                                {ev.examMode === 'DIGITAL' && ev.source === 'calendar' && (
                                  <button type="button" onClick={() => void handleCapture(ev.id)} className="font-semibold text-emerald-700">Capture marks</button>
                                )}
                              </td>
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

        {tab === 'create' && (
          <div className="grid gap-4 lg:grid-cols-12">
            <div className={`${am.card} ${am.cardPad} lg:col-span-7 space-y-4`}>
              <div>
                <h3 className="text-sm font-semibold text-slate-800">Create Examination</h3>
                <p className="text-[10px] text-slate-500">Digital exams publish a take-exam link at the defined date/time. Manual exams schedule hall exams for Marks Entry.</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {(['DIGITAL', 'MANUAL'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setForm((f) => ({
                      ...f,
                      examMode: mode,
                      paperSource: mode === 'MANUAL' ? 'NONE' : 'QUESTION_BANK',
                    }))}
                    className={`rounded-xl border p-3 text-left ${
                      form.examMode === mode ? 'border-amber-400 bg-amber-50 ring-2 ring-amber-200' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <p className="text-xs font-bold text-slate-800">{mode === 'DIGITAL' ? 'Digital Exam' : 'Manual Exam'}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {mode === 'DIGITAL'
                        ? 'Question bank / paper + publish link + auto marks capture'
                        : 'Schedule only — record results manually in Marks Entry'}
                    </p>
                  </button>
                ))}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={am.label}>Exam Type</label>
                  <select value={form.examType} onChange={(e) => setForm((f) => ({ ...f, examType: e.target.value, seriesName: meta?.examTypes.find((t) => t.id === e.target.value)?.label || f.seriesName }))} className={am.select + ' w-full'}>
                    {(meta?.examTypes || []).map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={am.label}>Series / Exam Name</label>
                  <input value={form.seriesName} onChange={(e) => setForm((f) => ({ ...f, seriesName: e.target.value }))} className={am.input} placeholder="e.g. Unit Test 2" />
                </div>
                <div>
                  <label className={am.label}>Class</label>
                  <select value={form.className} onChange={(e) => setForm((f) => ({ ...f, className: e.target.value, sectionName: '', subjectName: '', questionPaperId: '' }))} className={am.select + ' w-full'}>
                    <option value="">Select class</option>
                    {(meta?.classes || []).map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={am.label}>Section</label>
                  <select value={form.sectionName} onChange={(e) => setForm((f) => ({ ...f, sectionName: e.target.value }))} className={am.select + ' w-full'}>
                    <option value="">Select section</option>
                    {formSectionOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className={am.label}>Subject</label>
                  <select value={form.subjectName} onChange={(e) => setForm((f) => ({ ...f, subjectName: e.target.value, questionPaperId: '' }))} className={am.select + ' w-full'}>
                    <option value="">Select subject</option>
                    {subjectOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className={am.label}>Exam Date</label>
                  <input type="date" value={form.examDate} onChange={(e) => setForm((f) => ({ ...f, examDate: e.target.value }))} className={am.input} />
                </div>
                <div>
                  <label className={am.label}>Start Time</label>
                  <input value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} className={am.input} />
                </div>
                <div>
                  <label className={am.label}>End Time</label>
                  <input value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} className={am.input} />
                </div>
                {form.examMode === 'DIGITAL' && (
                  <div className="sm:col-span-2">
                    <label className={am.label}>Publish Link At (date &amp; time)</label>
                    <input type="datetime-local" value={form.publishAt} onChange={(e) => setForm((f) => ({ ...f, publishAt: e.target.value }))} className={am.input} />
                    <p className="text-[10px] text-slate-500 mt-1">Students can open the exam link only after this time.</p>
                  </div>
                )}
                <div>
                  <label className={am.label}>Teacher (Marks Entry)</label>
                  <select value={form.teacherName} onChange={(e) => setForm((f) => ({ ...f, teacherName: e.target.value }))} className={am.select + ' w-full'}>
                    <option value="">Subject Teacher</option>
                    {(createMeta?.teachers || []).map((t) => <option key={t.name} value={t.name}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={am.label}>Notes</label>
                  <input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className={am.input} />
                </div>
              </div>

              <div className="space-y-2">
                <p className={am.label}>Question Paper Source</p>
                <div className="flex flex-wrap gap-2">
                  {(form.examMode === 'DIGITAL'
                    ? (['QUESTION_BANK', 'PAPER_UPLOAD'] as const)
                    : (['NONE', 'QUESTION_BANK', 'PAPER_UPLOAD'] as const)
                  ).map((src) => (
                    <button
                      key={src}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, paperSource: src }))}
                      className={`rounded-lg border px-3 py-1.5 text-[11px] font-semibold ${
                        form.paperSource === src ? 'border-amber-400 bg-amber-50' : 'border-slate-200'
                      }`}
                    >
                      {src === 'QUESTION_BANK' ? 'Question Bank / Paper Mgmt' : src === 'PAPER_UPLOAD' ? 'Upload Paper' : 'No Paper (Manual)'}
                    </button>
                  ))}
                </div>
              </div>

              {form.paperSource === 'QUESTION_BANK' && (
                <div>
                  <label className={am.label}>Select Paper (subject questions)</label>
                  <div className="max-h-48 overflow-y-auto space-y-1.5 rounded-lg border border-slate-200 p-2">
                    {filteredPapers.length === 0 ? (
                      <p className="text-xs text-slate-500 p-2">No papers found for this class/subject. Create one in Question Bank first.</p>
                    ) : filteredPapers.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, questionPaperId: p.id }))}
                        className={`w-full text-left rounded-lg border px-3 py-2 ${
                          form.questionPaperId === p.id ? 'border-amber-400 bg-amber-50' : 'border-slate-100 hover:bg-slate-50'
                        }`}
                      >
                        <p className="text-xs font-semibold text-slate-800">{p.title}</p>
                        <p className="text-[10px] text-slate-500">{p.subjectName} · {p.numQuestions} Q · {p.status} · {p.purpose}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {form.paperSource === 'PAPER_UPLOAD' && (
                <div className="space-y-2">
                  <label className={am.label}>Upload Question Paper (PDF / image)</label>
                  <label className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-slate-300 p-6 cursor-pointer hover:border-blue-400 hover:bg-blue-50">
                    <Upload size={20} className="text-slate-400" />
                    <span className="text-xs text-slate-600">Click to upload paper file</span>
                    <input
                      type="file"
                      accept="application/pdf,image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const dataUrl = await fileToBase64(file);
                        setUploadMeta([{ fileName: file.name, mimeType: file.type, fileData: dataUrl, sizeBytes: file.size }]);
                        e.target.value = '';
                      }}
                    />
                  </label>
                  {uploadMeta[0] && (
                    <p className="text-[10px] text-emerald-700 font-semibold">Uploaded: {uploadMeta[0].fileName}</p>
                  )}
                  {form.examMode === 'DIGITAL' && (
                    <p className="text-[10px] text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1.5">
                      Digital mode still needs questions — also select a Question Bank paper above, or create the paper in Question Bank (OCR/AI) then attach it here.
                    </p>
                  )}
                  {form.examMode === 'DIGITAL' && (
                    <div>
                      <label className={am.label}>Attach questions from existing paper</label>
                      <select
                        value={form.questionPaperId}
                        onChange={(e) => setForm((f) => ({ ...f, questionPaperId: e.target.value }))}
                        className={am.select + ' w-full'}
                      >
                        <option value="">Select paper with questions</option>
                        {filteredPapers.map((p) => (
                          <option key={p.id} value={p.id}>{p.title} ({p.numQuestions} Q)</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-4 text-xs">
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={form.syncToAcademicCalendar} onChange={(e) => setForm((f) => ({ ...f, syncToAcademicCalendar: e.target.checked }))} />
                  Sync to Academic Calendar
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={form.createMarksAssignment} onChange={(e) => setForm((f) => ({ ...f, createMarksAssignment: e.target.checked }))} />
                  Create Marks Entry assignment
                </label>
              </div>

              <button
                type="button"
                disabled={actionLoading || !form.className || !form.sectionName || !form.subjectName || !form.examDate}
                onClick={() => void handleCreate()}
                className={am.btnPrimary}
              >
                {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Schedule Exam
              </button>
            </div>

            <div className={`${am.card} ${am.cardPad} lg:col-span-5 space-y-3`}>
              <h3 className="text-sm font-semibold text-slate-800">How it works</h3>
              <ol className="list-decimal list-inside space-y-2 text-[11px] text-slate-600 leading-relaxed">
                <li>Choose <strong>Digital</strong> or <strong>Manual</strong> exam mode and exam type (Unit / Mid / Half / Pre-Final / Final).</li>
                <li>Pick class, section, subject and attach questions from Question Bank / Paper Management, or upload a paper file.</li>
                <li>For digital exams, set <strong>Publish Link At</strong> — the system activates the exam URL at that time.</li>
                <li>Scores auto-flow into <strong>Marks Entry</strong>; continue approval &amp; publication in <strong>Result Processing</strong>.</li>
                <li>Use the <strong>Sync</strong> tab to push sessions into Academic Calendar.</li>
              </ol>
              {createdSession && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 space-y-2">
                  <p className="text-xs font-bold text-emerald-900">Exam created</p>
                  <p className="text-[10px] text-emerald-800">{createdSession.seriesName} · {createdSession.examMode}</p>
                  {createdSession.examLink && (
                    <button type="button" onClick={() => void copyLink(createdSession.examLink!)} className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-800">
                      <Copy size={12} /> Copy digital exam link
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'sync' && (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className={`${am.card} ${am.cardPad} space-y-3`}>
              <h3 className="text-sm font-semibold text-slate-800">Sync with Academic Calendar</h3>
              <p className="text-[11px] text-slate-500">
                Push unsynced exam sessions for {academicYear} ({data?.monthLabel || 'current month'}) into Academic Calendar as EXAM events so parents/staff see them on the school calendar.
              </p>
              <button type="button" disabled={actionLoading} onClick={() => void handleSync()} className={am.btnPrimary}>
                {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
                Sync Month to Academic Calendar
              </button>
            </div>
            <div className={`${am.card} ${am.cardPad} space-y-3`}>
              <h3 className="text-sm font-semibold text-slate-800">Publish Due Digital Links</h3>
              <p className="text-[11px] text-slate-500">
                Manually run the publisher for exams whose publish date/time has already passed (also runs automatically every minute on the server).
              </p>
              <button type="button" disabled={actionLoading} onClick={() => void handlePublishDue()} className={am.btnSecondary}>
                {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
                Publish Due Exam Links Now
              </button>
            </div>
          </div>
        )}
      </div>

      <AcademicModal open={Boolean(createdSession?.examLink)} onClose={() => setCreatedSession(null)} title="Digital Exam Link Ready">
        {createdSession?.examLink && (
          <div className="space-y-3">
            <p className="text-xs text-slate-600">Share this link with students. It becomes active at the publish time you set.</p>
            <code className="block text-[11px] break-all rounded-lg bg-slate-50 border border-slate-200 p-3">{createdSession.examLink}</code>
            <button type="button" onClick={() => void copyLink(createdSession.examLink!)} className={am.btnPrimary}>
              <Copy size={14} /> Copy Link
            </button>
          </div>
        )}
      </AcademicModal>
    </AcademicPageShell>
  );
}
