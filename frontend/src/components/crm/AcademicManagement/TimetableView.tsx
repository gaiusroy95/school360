import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus, Pencil, Trash2, Upload, Download, Send, AlertTriangle, LayoutGrid, List, Calendar,
} from 'lucide-react';
import {
  bulkUploadTimetable, createTimetableSlot, deleteTimetableSlot, fetchAcademicMeta,
  fetchAcademicSubjects, fetchTimetable, fetchTimetableConflicts, publishTimetable,
  updateTimetableSlot, PERIOD_TYPE_LABELS, PERIOD_TYPES, type TimetableSlot,
} from '../../../lib/academicServices';
import { downloadTimetableTemplate, exportTimetableExcel, parseTimetableUploadFile } from '../../../lib/timetableExcel';
import {
  AcademicLoading, AcademicModal, AcademicPageHeader, AcademicPageShell,
  AcademicYearTermFilters, am,
} from './AcademicManagementUi';

const DAYS = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TYPE_COLORS: Record<string, string> = {
  THEORY: 'bg-blue-50 border-blue-200 text-blue-900',
  PRACTICAL: 'bg-purple-50 border-purple-200 text-purple-900',
  LAB: 'bg-teal-50 border-teal-200 text-teal-900',
  SPORTS: 'bg-green-50 border-green-200 text-green-900',
  EVENT: 'bg-amber-50 border-amber-200 text-amber-900',
};

const EMPTY_FORM = {
  className: '', sectionName: '', dayOfWeek: 1, period: 1, periodLabel: 'P1',
  periodType: 'THEORY' as const, startTime: '08:00', endTime: '08:40',
  subjectName: '', teacherName: '', room: '', term: 'Term 1',
  effectiveFrom: '', effectiveTo: '', versionLabel: '', notes: '',
};

type ViewMode = 'grid' | 'list';

export function TimetableView() {
  const [records, setRecords] = useState<TimetableSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [term, setTerm] = useState('Term 1');
  const [className, setClassName] = useState('');
  const [sectionName, setSectionName] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [meta, setMeta] = useState<{ academicYears: string[]; classes: string[]; sectionsByClass: Record<string, string[]>; terms: string[] } | null>(null);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [conflicts, setConflicts] = useState<{ message: string; details: string }[]>([]);
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [showUpload, setShowUpload] = useState(false);
  const [uploadRows, setUploadRows] = useState(0);
  const [replaceOnUpload, setReplaceOnUpload] = useState(false);
  const [uploadVersion, setUploadVersion] = useState('');
  const [uploadFrom, setUploadFrom] = useState('');
  const [uploadTo, setUploadTo] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const m = await fetchAcademicMeta();
      setMeta(m);
      const [tt, sub, tc] = await Promise.all([
        fetchTimetable({
          academicYear,
          term,
          className: className || undefined,
          sectionName: sectionName || undefined,
          effectiveDate,
        }),
        fetchAcademicSubjects(),
        fetchTimetableConflicts(academicYear),
      ]);
      setRecords(tt.records);
      setSubjects(sub.records.map((s) => s.subjectName));
      setConflicts(tc.conflicts);
    } finally {
      setLoading(false);
    }
  }, [academicYear, term, className, sectionName, effectiveDate]);

  useEffect(() => { void load(); }, [load]);

  const grid = useMemo(() => {
    const periods = [...new Set(records.map((r) => r.period))].sort((a, b) => a - b);
    const days = [1, 2, 3, 4, 5, 6];
    const map = new Map(records.map((r) => [`${r.dayOfWeek}-${r.period}`, r]));
    return { periods, days, map };
  }, [records]);

  const publishedCount = records.filter((r) => r.isPublished).length;
  const unpublishedCount = records.length - publishedCount;

  const openCreate = () => {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      className: className || '',
      sectionName: sectionName || '',
      term,
      effectiveFrom: effectiveDate,
    });
    setShowForm(true);
  };

  const openEdit = (slot: TimetableSlot) => {
    setEditingId(slot.id);
    setForm({
      className: slot.className,
      sectionName: slot.sectionName,
      dayOfWeek: slot.dayOfWeek,
      period: slot.period,
      periodLabel: slot.periodLabel,
      periodType: slot.periodType,
      startTime: slot.startTime,
      endTime: slot.endTime,
      subjectName: slot.subjectName,
      teacherName: slot.teacherName,
      room: slot.room,
      term: slot.term,
      effectiveFrom: slot.effectiveFrom?.slice(0, 10) || '',
      effectiveTo: slot.effectiveTo?.slice(0, 10) || '',
      versionLabel: slot.versionLabel,
      notes: slot.notes,
    });
    setShowForm(true);
  };

  const saveSlot = async () => {
    const payload = {
      ...form,
      academicYear,
      effectiveFrom: form.effectiveFrom || null,
      effectiveTo: form.effectiveTo || null,
    };
    if (editingId) {
      await updateTimetableSlot(editingId, payload);
      setMessage('Timetable slot updated');
    } else {
      await createTimetableSlot(payload);
      setMessage('Timetable slot created');
    }
    setShowForm(false);
    void load();
  };

  const removeSlot = async (id: string) => {
    if (!window.confirm('Delete this timetable slot?')) return;
    await deleteTimetableSlot(id);
    setMessage('Slot deleted');
    void load();
  };

  const handlePublish = async () => {
    const res = await publishTimetable({
      academicYear,
      term,
      className: className || undefined,
      sectionName: sectionName || undefined,
    });
    setMessage(`Published ${res.published} slot(s) — visible on teacher, principal & parent mobile apps`);
    void load();
  };

  const handleFileUpload = async (file: File) => {
    const rows = await parseTimetableUploadFile(file);
    setUploadRows(rows.length);
    const res = await bulkUploadTimetable({
      academicYear,
      term,
      className: className || undefined,
      sectionName: sectionName || undefined,
      effectiveFrom: uploadFrom || null,
      effectiveTo: uploadTo || null,
      versionLabel: uploadVersion || `Upload ${new Date().toLocaleDateString('en-IN')}`,
      replaceExisting: replaceOnUpload,
      slots: rows,
    });
    setMessage(`Upload complete: ${res.created} created, ${res.updated} updated${res.errors.length ? `, ${res.errors.length} errors` : ''}`);
    setShowUpload(false);
    void load();
  };

  if (loading && records.length === 0) return <AcademicLoading label="Loading timetable…" />;

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="Academic Management › Timetable"
        title="Timetable"
        subtitle="Create period-wise schedules with theory/practical/lab/sports/event types. Publish to sync teacher, principal & parent mobile apps."
        actions={(
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => downloadTimetableTemplate()} className={am.btnSecondary}><Download size={14} /> Template</button>
            <button type="button" onClick={() => exportTimetableExcel(records)} className={am.btnSecondary}><Download size={14} /> Export</button>
            <button type="button" onClick={() => setShowUpload(true)} className={am.btnSecondary}><Upload size={14} /> Upload</button>
            <button type="button" onClick={() => void handlePublish()} className={am.btnDark}><Send size={14} /> Publish to Mobile</button>
            <button type="button" onClick={openCreate} className={am.btnPrimary}><Plus size={14} /> Add Period</button>
          </div>
        )}
      />
      <div className={am.content}>
        {message && <p className={am.message}>{message}</p>}

        <AcademicYearTermFilters
          academicYear={academicYear} term={term}
          years={meta?.academicYears || [academicYear]}
          terms={meta?.terms || ['Term 1', 'Term 2']}
          onYear={setAcademicYear} onTerm={setTerm}
          className={className} sectionName={sectionName}
          classes={meta?.classes}
          sections={className ? meta?.sectionsByClass[className] : []}
          onClass={(v) => { setClassName(v); setSectionName(''); }}
          onSection={setSectionName}
        />

        <div className={`${am.filterBar} justify-between`}>
          <label className="text-xs font-semibold text-slate-600 flex items-center gap-2">
            <Calendar size={14} /> Applicable on
            <input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} className={am.select} />
          </label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">{publishedCount} published · {unpublishedCount} draft</span>
            <button type="button" onClick={() => setViewMode('grid')} className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-amber-100 text-amber-900' : 'text-slate-400'}`}><LayoutGrid size={16} /></button>
            <button type="button" onClick={() => setViewMode('list')} className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-amber-100 text-amber-900' : 'text-slate-400'}`}><List size={16} /></button>
          </div>
        </div>

        {conflicts.length > 0 && (
          <div className={`${am.card} p-4 border-amber-200 bg-amber-50`}>
            <h4 className="text-xs font-bold text-amber-800 mb-2 flex items-center gap-1"><AlertTriangle size={14} /> {conflicts.length} Timetable Conflict(s)</h4>
            {conflicts.slice(0, 4).map((c, i) => <p key={i} className="text-xs text-amber-900">• {c.message} — {c.details}</p>)}
          </div>
        )}

        {viewMode === 'grid' ? (
          <div className={`${am.tableWrap} overflow-x-auto`}>
            <table className="w-full min-w-[900px]">
              <thead>
                <tr>
                  <th className={am.th}>Period</th>
                  <th className={am.th}>Time</th>
                  {grid.days.map((d) => <th key={d} className={am.th}>{DAYS[d]}</th>)}
                </tr>
              </thead>
              <tbody>
                {grid.periods.map((p) => {
                  const sample = records.find((r) => r.period === p);
                  return (
                    <tr key={p}>
                      <td className={`${am.td} font-bold`}>{sample?.periodLabel || `P${p}`}</td>
                      <td className={`${am.td} text-xs whitespace-nowrap`}>{sample?.timeRange || '—'}</td>
                      {grid.days.map((d) => {
                        const slot = grid.map.get(`${d}-${p}`);
                        if (!slot) return <td key={d} className={`${am.td} bg-slate-50/50`}>—</td>;
                        return (
                          <td key={d} className={`${am.td} p-2`}>
                            <div className={`rounded-lg border p-2 text-xs space-y-1 ${TYPE_COLORS[slot.periodType] || 'bg-white'}`}>
                              <div className="font-bold">{slot.subjectName}</div>
                              <div className="opacity-80">{slot.teacherName || '—'}</div>
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-semibold opacity-70">{slot.periodTypeLabel}</span>
                                {!slot.isPublished && <span className="text-[10px] bg-white/80 px-1 rounded">Draft</span>}
                              </div>
                              <div className="flex gap-1 pt-1">
                                <button type="button" onClick={() => openEdit(slot)} className="text-indigo-700 hover:underline"><Pencil size={12} /></button>
                                <button type="button" onClick={() => void removeSlot(slot.id)} className="text-red-600 hover:underline"><Trash2 size={12} /></button>
                              </div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead><tr>
                <th className={am.th}>Day</th><th className={am.th}>Period</th><th className={am.th}>Time</th>
                <th className={am.th}>Class</th><th className={am.th}>Subject</th><th className={am.th}>Type</th>
                <th className={am.th}>Teacher</th><th className={am.th}>Room</th><th className={am.th}>Applicable</th><th className={am.th}>Status</th><th className={am.th} />
              </tr></thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id}>
                    <td className={am.td}>{r.dayLabel}</td>
                    <td className={am.td}>{r.periodLabel}</td>
                    <td className={am.td}>{r.timeRange}</td>
                    <td className={am.td}>{r.classGroup}</td>
                    <td className={am.td}>{r.subjectName}</td>
                    <td className={am.td}><span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${TYPE_COLORS[r.periodType]}`}>{r.periodTypeLabel}</span></td>
                    <td className={am.td}>{r.teacherName || '—'}</td>
                    <td className={am.td}>{r.room || '—'}</td>
                    <td className={`${am.td} text-xs`}>
                      {r.effectiveFrom ? new Date(r.effectiveFrom).toLocaleDateString('en-IN') : 'Any'}
                      {' – '}
                      {r.effectiveTo ? new Date(r.effectiveTo).toLocaleDateString('en-IN') : 'Any'}
                    </td>
                    <td className={am.td}>{r.isPublished ? <span className="text-green-600 text-xs font-bold">Live</span> : <span className="text-slate-400 text-xs">Draft</span>}</td>
                    <td className={am.td}>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => openEdit(r)} className="text-indigo-600"><Pencil size={14} /></button>
                        <button type="button" onClick={() => void removeSlot(r.id)} className="text-red-600"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className={`${am.card} ${am.cardPad} text-xs text-slate-500 space-y-1`}>
          <p className="font-bold text-slate-700">Mobile app sync</p>
          <p>After editing, click <strong>Publish to Mobile</strong> to push the timetable to teacher, principal, and parent apps.</p>
          <p>API: <code className="bg-slate-100 px-1 rounded">GET /api/academic/timetable/schedule/daily?audience=teacher|parent|principal</code></p>
        </div>
      </div>

      <AcademicModal open={showForm} onClose={() => setShowForm(false)} title={editingId ? 'Edit Timetable Slot' : 'Add Timetable Slot'} large>
        <div className="grid grid-cols-2 gap-3">
          <input placeholder="Class" value={form.className} onChange={(e) => setForm((f) => ({ ...f, className: e.target.value }))} className={am.input} list="tt-classes" />
          <input placeholder="Section" value={form.sectionName} onChange={(e) => setForm((f) => ({ ...f, sectionName: e.target.value }))} className={am.input} />
          <label className="text-xs space-y-1 col-span-2">
            <span className="font-semibold text-slate-600">Day</span>
            <select value={form.dayOfWeek} onChange={(e) => setForm((f) => ({ ...f, dayOfWeek: Number(e.target.value) }))} className={am.input}>
              {DAYS.slice(1, 8).map((d, i) => <option key={d} value={i + 1}>{d}</option>)}
            </select>
          </label>
          <input type="number" placeholder="Period #" value={form.period} onChange={(e) => setForm((f) => ({ ...f, period: Number(e.target.value), periodLabel: `P${e.target.value}` }))} className={am.input} />
          <input placeholder="Period Label" value={form.periodLabel} onChange={(e) => setForm((f) => ({ ...f, periodLabel: e.target.value }))} className={am.input} />
          <label className="text-xs space-y-1">
            <span className="font-semibold text-slate-600">Period Type</span>
            <select value={form.periodType} onChange={(e) => setForm((f) => ({ ...f, periodType: e.target.value as typeof form.periodType }))} className={am.input}>
              {PERIOD_TYPES.map((t) => <option key={t} value={t}>{PERIOD_TYPE_LABELS[t]}</option>)}
            </select>
          </label>
          <input placeholder="Room" value={form.room} onChange={(e) => setForm((f) => ({ ...f, room: e.target.value }))} className={am.input} />
          <input type="time" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} className={am.input} />
          <input type="time" value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} className={am.input} />
          <input placeholder="Subject" value={form.subjectName} onChange={(e) => setForm((f) => ({ ...f, subjectName: e.target.value }))} className={am.input} list="tt-subjects" />
          <input placeholder="Teacher" value={form.teacherName} onChange={(e) => setForm((f) => ({ ...f, teacherName: e.target.value }))} className={am.input} />
          <input type="date" value={form.effectiveFrom} onChange={(e) => setForm((f) => ({ ...f, effectiveFrom: e.target.value }))} className={am.input} title="Effective from" />
          <input type="date" value={form.effectiveTo} onChange={(e) => setForm((f) => ({ ...f, effectiveTo: e.target.value }))} className={am.input} title="Effective to" />
          <input placeholder="Version label" value={form.versionLabel} onChange={(e) => setForm((f) => ({ ...f, versionLabel: e.target.value }))} className={`${am.input} col-span-2`} />
          <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className={`${am.input} col-span-2`} rows={2} />
        </div>
        <datalist id="tt-subjects">{subjects.map((s) => <option key={s} value={s} />)}</datalist>
        <datalist id="tt-classes">{meta?.classes?.map((c) => <option key={c} value={c} />)}</datalist>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={() => setShowForm(false)} className={am.btnSecondary}>Cancel</button>
          <button type="button" onClick={() => void saveSlot()} className={am.btnPrimary}>{editingId ? 'Update' : 'Save'}</button>
        </div>
      </AcademicModal>

      <AcademicModal open={showUpload} onClose={() => setShowUpload(false)} title="Upload Timetable (Excel/CSV)" large>
        <p className="text-xs text-slate-500">Upload a filled template. Columns: className, sectionName, dayOfWeek (1=Mon), period, periodType (THEORY/PRACTICAL/LAB/SPORTS/EVENT), startTime, endTime, subjectName, teacherName, room.</p>
        <div className="grid grid-cols-2 gap-3">
          <input type="date" value={uploadFrom} onChange={(e) => setUploadFrom(e.target.value)} className={am.input} placeholder="Effective from" />
          <input type="date" value={uploadTo} onChange={(e) => setUploadTo(e.target.value)} className={am.input} placeholder="Effective to" />
          <input placeholder="Version label" value={uploadVersion} onChange={(e) => setUploadVersion(e.target.value)} className={`${am.input} col-span-2`} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={replaceOnUpload} onChange={(e) => setReplaceOnUpload(e.target.checked)} />
          Replace existing slots for this class/section in date range
        </label>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="text-sm" onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFileUpload(file);
        }} />
        {uploadRows > 0 && <p className="text-xs text-green-600">{uploadRows} rows parsed</p>}
      </AcademicModal>
    </AcademicPageShell>
  );
}
