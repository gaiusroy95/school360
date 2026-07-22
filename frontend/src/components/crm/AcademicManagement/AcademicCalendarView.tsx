import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus, Upload, Send, Smartphone, FileText, CheckCircle2, AlertTriangle, Eye, Trash2, Loader2,
} from 'lucide-react';
import {
  BOARD_OPTIONS, confirmCalendarUpload, createAcademicCalendarEvent, deleteAcademicCalendarEvent,
  fetchAcademicCalendar, fetchCalendarUploads, publishAcademicCalendar, uploadBoardCalendarOcr,
  type CalendarEvent, type CalendarUpload, type OcrCalendarEventPreview,
} from '../../../lib/academicServices';
import {
  AcademicLoading, AcademicModal, AcademicPageHeader, AcademicPageShell,
  AcademicYearTermFilters, am,
} from './AcademicManagementUi';

const TYPE_COLORS: Record<string, string> = {
  HOLIDAY: 'bg-red-100 text-red-800',
  EXAM: 'bg-purple-100 text-purple-800',
  PTM: 'bg-blue-100 text-blue-800',
  ACTIVITY: 'bg-green-100 text-green-800',
  OTHER: 'bg-slate-100 text-slate-700',
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function AcademicCalendarView() {
  const [records, setRecords] = useState<CalendarEvent[]>([]);
  const [uploads, setUploads] = useState<CalendarUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [boardName, setBoardName] = useState('CBSE');
  const [message, setMessage] = useState('');
  const [scanning, setScanning] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showOcrPreview, setShowOcrPreview] = useState(false);
  const [previewUpload, setPreviewUpload] = useState<CalendarUpload | null>(null);
  const [previewEvents, setPreviewEvents] = useState<OcrCalendarEventPreview[]>([]);
  const [detailEvent, setDetailEvent] = useState<CalendarEvent | null>(null);
  const [form, setForm] = useState({ title: '', eventType: 'ACTIVITY', eventDate: '', endDate: '', description: '', sharedToParents: true });
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cal, up] = await Promise.all([
        fetchAcademicCalendar({ academicYear, boardName: boardName || undefined }),
        fetchCalendarUploads(academicYear),
      ]);
      setRecords(cal.records);
      setUploads(up.uploads);
    } finally { setLoading(false); }
  }, [academicYear, boardName]);

  useEffect(() => { void load(); }, [load]);

  const groupedByMonth = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const r of records) {
      const key = r.eventDate.slice(0, 7);
      const list = map.get(key) || [];
      list.push(r);
      map.set(key, list);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [records]);

  const publishedCount = records.filter((r) => r.isPublished).length;
  const boardUploads = uploads.filter((u) => u.boardName === boardName);

  const handlePdfUpload = async (file: File) => {
    setScanning(true);
    setMessage('');
    try {
      const fileData = await fileToBase64(file);
      const res = await uploadBoardCalendarOcr({
        boardName,
        academicYear,
        fileName: file.name,
        fileData,
        mimeType: file.type || 'application/pdf',
      });
      setPreviewUpload(res.upload);
      setPreviewEvents(res.previewEvents);
      setShowOcrPreview(true);
      setMessage(`OCR complete — ${res.previewEvents.length} events extracted from ${file.name}`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'OCR scan failed');
    } finally {
      setScanning(false);
    }
  };

  const importOcrEvents = async () => {
    if (!previewUpload) return;
    const res = await confirmCalendarUpload(previewUpload.id, { replaceExisting: true, events: previewEvents });
    setMessage(`Imported ${res.created} events for ${boardName} calendar`);
    setShowOcrPreview(false);
    void load();
  };

  const publishToMobile = async () => {
    const res = await publishAcademicCalendar({ academicYear, boardName });
    setMessage(`Published ${res.publishedEvents} event(s) to all mobile apps (teacher, student, parent)`);
    void load();
  };

  const addManualEvent = async () => {
    await createAcademicCalendarEvent({ ...form, academicYear, boardName, share: true });
    setShowForm(false);
    setMessage('Event added');
    void load();
  };

  const openEventPopup = (event: CalendarEvent) => setDetailEvent(event);

  if (loading && !records.length) return <AcademicLoading label="Loading academic calendar…" />;

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="Academic Management › Academic Calendar"
        title="Academic Calendar"
        subtitle="Upload board calendars via PDF OCR — events sync to teacher, student & parent mobile apps"
        actions={(
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void publishToMobile()} className={am.btnDark}><Send size={14} /> Publish to Mobile</button>
            <button type="button" onClick={() => fileRef.current?.click()} disabled={scanning} className={am.btnSecondary}>
              {scanning ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Upload Board PDF
            </button>
            <button type="button" onClick={() => setShowForm(true)} className={am.btnPrimary}><Plus size={14} /> Add Event</button>
          </div>
        )}
      />
      <input ref={fileRef} type="file" accept=".pdf,image/*" className="hidden" onChange={(e) => {
        const f = e.target.files?.[0];
        if (f) void handlePdfUpload(f);
        e.target.value = '';
      }} />

      <div className={am.content}>
        {message && <p className={am.message}>{message}</p>}

        <div className={`${am.filterBar} flex-wrap`}>
          <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className={am.select}>
            <option>2025-26</option><option>2024-25</option>
          </select>
          <div className="flex flex-wrap gap-1">
            {BOARD_OPTIONS.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBoardName(b)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${boardName === b ? 'bg-amber-100 border-amber-400 text-amber-900' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                {b}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Events', value: records.length, icon: <FileText size={18} />, color: 'text-slate-600 bg-slate-100' },
            { label: 'Published', value: publishedCount, icon: <Smartphone size={18} />, color: 'text-green-700 bg-green-100' },
            { label: 'Board Uploads', value: boardUploads.length, icon: <Upload size={18} />, color: 'text-blue-700 bg-blue-100' },
            { label: 'OCR Events', value: records.filter((r) => r.eventSource === 'OCR').length, icon: <CheckCircle2 size={18} />, color: 'text-purple-700 bg-purple-100' },
          ].map((k) => (
            <div key={k.label} className={`${am.card} p-4 flex items-center gap-3`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${k.color}`}>{k.icon}</div>
              <div><p className="text-xl font-bold">{k.value}</p><p className="text-[10px] font-bold text-slate-500 uppercase">{k.label}</p></div>
            </div>
          ))}
        </div>

        {boardUploads.length > 0 && (
          <div className={`${am.card} ${am.cardPad}`}>
            <h3 className="text-sm font-bold text-slate-800 mb-2">{boardName} Calendar Uploads</h3>
            <div className="space-y-2">
              {boardUploads.map((u) => (
                <div key={u.id} className="flex items-center justify-between text-xs border border-slate-100 rounded-lg p-2">
                  <div>
                    <span className="font-semibold">{u.fileName}</span>
                    <span className="text-slate-400 ml-2">{(u.fileSizeBytes / 1024).toFixed(0)} KB · {u.eventCount} events</span>
                  </div>
                  <span className={`font-bold px-2 py-0.5 rounded ${u.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : u.status === 'FAILED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                    {u.status}{u.isPublished ? ' · Live' : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {groupedByMonth.map(([month, events]) => (
          <div key={month} className={am.tableWrap}>
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
              <h3 className="text-xs font-bold text-slate-600 uppercase">
                {new Date(`${month}-01`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
              </h3>
            </div>
            <table className="w-full">
              <thead><tr>
                <th className={am.th}>Date</th><th className={am.th}>Title</th><th className={am.th}>Type</th>
                <th className={am.th}>Board</th><th className={am.th}>Source</th><th className={am.th}>Mobile</th><th className={am.th} />
              </tr></thead>
              <tbody>
                {events.map((r) => (
                  <tr key={r.id}>
                    <td className={`${am.td} text-xs whitespace-nowrap`}>
                      {new Date(r.eventDate).toLocaleDateString('en-IN')}
                      {r.endDate && ` – ${new Date(r.endDate).toLocaleDateString('en-IN')}`}
                    </td>
                    <td className={am.td}><span className="font-semibold">{r.title}</span></td>
                    <td className={am.td}><span className={`text-[10px] font-bold px-2 py-0.5 rounded ${TYPE_COLORS[r.eventType] || TYPE_COLORS.OTHER}`}>{r.eventTypeLabel}</span></td>
                    <td className={am.td}>{r.boardName || '—'}</td>
                    <td className={am.td}>{r.eventSource === 'OCR' ? <span className="text-purple-600 font-bold text-xs">OCR</span> : 'Manual'}</td>
                    <td className={am.td}>{r.isPublished ? <CheckCircle2 size={14} className="text-green-600" /> : <AlertTriangle size={14} className="text-amber-500" />}</td>
                    <td className={am.td}>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => openEventPopup(r)} className="text-indigo-600 text-xs font-bold flex items-center gap-1"><Eye size={12} /> View</button>
                        <button type="button" onClick={() => void deleteAcademicCalendarEvent(r.id).then(load)} className="text-red-500"><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        {records.length === 0 && (
          <div className={`${am.card} p-8 text-center text-slate-400`}>
            <Upload size={32} className="mx-auto mb-2 opacity-40" />
            <p>No events for {boardName}. Upload a board academic calendar PDF to extract events via OCR.</p>
          </div>
        )}

        <p className="text-xs text-slate-500 flex items-center gap-1">
          <Smartphone size={12} /> Mobile API: <code className="bg-slate-100 px-1 rounded">GET /api/academic/calendar/mobile?academicYear=&boardName=</code>
        </p>
      </div>

      {/* OCR Preview Modal */}
      <AcademicModal open={showOcrPreview} onClose={() => setShowOcrPreview(false)} title={`OCR Preview — ${boardName} Calendar`} large>
        <p className="text-xs text-slate-500 mb-3">Review extracted events before importing. Edit titles/dates if needed.</p>
        <div className="max-h-64 overflow-y-auto space-y-2 mb-4">
          {previewEvents.map((ev, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 text-xs items-center border border-slate-100 rounded-lg p-2">
              <input value={ev.eventDate} onChange={(e) => setPreviewEvents((list) => list.map((x, j) => j === i ? { ...x, eventDate: e.target.value } : x))} className={`${am.input} col-span-2`} type="date" />
              <input value={ev.title} onChange={(e) => setPreviewEvents((list) => list.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} className={`${am.input} col-span-4`} />
              <select value={ev.eventType} onChange={(e) => setPreviewEvents((list) => list.map((x, j) => j === i ? { ...x, eventType: e.target.value } : x))} className={`${am.input} col-span-2`}>
                {['HOLIDAY', 'EXAM', 'PTM', 'ACTIVITY', 'OTHER'].map((t) => <option key={t}>{t}</option>)}
              </select>
              <input value={ev.description || ''} onChange={(e) => setPreviewEvents((list) => list.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} className={`${am.input} col-span-3`} placeholder="Description" />
              <button type="button" onClick={() => setPreviewEvents((list) => list.filter((_, j) => j !== i))} className="text-red-500 col-span-1">×</button>
            </div>
          ))}
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-slate-500">{previewEvents.length} event(s) ready to import</span>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowOcrPreview(false)} className={am.btnSecondary}>Cancel</button>
            <button type="button" onClick={() => void importOcrEvents()} className={am.btnPrimary}>Import Events</button>
          </div>
        </div>
      </AcademicModal>

      {/* Event Detail Popup */}
      <AcademicModal open={!!detailEvent} onClose={() => setDetailEvent(null)} title="Calendar Event" large>
        {detailEvent && (
          <div className="space-y-4 text-sm">
            <div className="flex items-start justify-between">
              <h4 className="text-lg font-bold text-slate-900">{detailEvent.title}</h4>
              <span className={`text-xs font-bold px-2 py-1 rounded ${TYPE_COLORS[detailEvent.eventType]}`}>{detailEvent.eventTypeLabel}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg">
              <div><p className="text-[10px] font-bold text-slate-400 uppercase">Date</p><p className="font-semibold">{new Date(detailEvent.eventDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p></div>
              {detailEvent.endDate && <div><p className="text-[10px] font-bold text-slate-400 uppercase">End Date</p><p className="font-semibold">{new Date(detailEvent.endDate).toLocaleDateString('en-IN')}</p></div>}
              <div><p className="text-[10px] font-bold text-slate-400 uppercase">Board</p><p className="font-semibold">{detailEvent.boardName || '—'}</p></div>
              <div><p className="text-[10px] font-bold text-slate-400 uppercase">Source</p><p className="font-semibold">{detailEvent.eventSource === 'OCR' ? 'PDF OCR Import' : 'Manual Entry'}</p></div>
              <div><p className="text-[10px] font-bold text-slate-400 uppercase">Mobile Status</p><p className="font-semibold flex items-center gap-1">{detailEvent.isPublished ? <><CheckCircle2 size={14} className="text-green-600" /> Published to all apps</> : 'Draft — click Publish to Mobile'}</p></div>
              <div><p className="text-[10px] font-bold text-slate-400 uppercase">Shared to Parents</p><p className="font-semibold">{detailEvent.sharedToParents ? 'Yes' : 'No'}</p></div>
            </div>
            {detailEvent.description && (
              <div><p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Description</p><p className="text-slate-700 bg-white border rounded-lg p-3">{detailEvent.description}</p></div>
            )}
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button type="button" onClick={() => setDetailEvent(null)} className={am.btnSecondary}>Close</button>
            </div>
          </div>
        )}
      </AcademicModal>

      {/* Manual Add Event */}
      <AcademicModal open={showForm} onClose={() => setShowForm(false)} title="Add Calendar Event">
        <div className="space-y-3">
          <input placeholder="Event Title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className={am.input} />
          <select value={form.eventType} onChange={(e) => setForm((f) => ({ ...f, eventType: e.target.value }))} className={am.input}>
            <option value="HOLIDAY">Holiday</option><option value="EXAM">Exam</option><option value="PTM">PTM</option><option value="ACTIVITY">Activity</option><option value="OTHER">Other</option>
          </select>
          <div className="grid grid-cols-2 gap-3">
            <input type="date" value={form.eventDate} onChange={(e) => setForm((f) => ({ ...f, eventDate: e.target.value }))} className={am.input} />
            <input type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} className={am.input} placeholder="End date" />
          </div>
          <textarea placeholder="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className={am.input} rows={2} />
          <p className="text-xs text-slate-500">Board: {boardName} · Year: {academicYear}</p>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={() => setShowForm(false)} className={am.btnSecondary}>Cancel</button>
          <button type="button" onClick={() => void addManualEvent()} className={am.btnPrimary}>Save Event</button>
        </div>
      </AcademicModal>
    </AcademicPageShell>
  );
}
