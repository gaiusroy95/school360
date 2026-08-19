import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus, Eye, Calendar, CheckCircle2, XCircle, Smartphone, ClipboardList,
  Upload, Link2, FileText, Image as ImageIcon, Video, Trash2, Download,
} from 'lucide-react';
import {
  bulkDeleteHomework, bulkUploadHomework, createHomework, deleteHomework, fetchAcademicMeta,
  fetchHomeworkDashboard, fetchHomeworkDetail, fetchTeacherAllocationMeta, uploadHomeworkAttachment,
  type Homework, type HomeworkAttachment, type HomeworkDashboardRow, type TeacherAllocationMeta,
} from '../../../lib/academicServices';
import {
  downloadHomeworkTemplate, parseHomeworkUploadFile,
} from '../../../lib/homeworkExcel';
import {
  AcademicLoading, AcademicModal, AcademicPageHeader, AcademicPageShell,
  AcademicYearTermFilters, am,
} from './AcademicManagementUi';

const EMPTY_FORM = {
  className: '',
  sectionName: '',
  subjectName: '',
  teacherName: '',
  title: '',
  description: '',
  totalStudents: 35,
  dueDate: '',
  youtubeUrl: '',
};

const btnExcel =
  'inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 disabled:opacity-60';
const btnDanger =
  'inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors disabled:opacity-60';

type StatusTab = 'ALL' | 'ASSIGNED' | 'NOT_ASSIGNED';

const STATUS_TABS: { id: StatusTab; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'ASSIGNED', label: 'Assigned' },
  { id: 'NOT_ASSIGNED', label: 'Not Assigned' },
];


function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

function HomeworkDetailPopup({
  row, onClose, onAssign, onDelete, busyDelete,
}: {
  row: HomeworkDashboardRow;
  onClose: () => void;
  onAssign: () => void;
  onDelete: (id: string, title: string) => void;
  busyDelete: boolean;
}) {
  const [detail, setDetail] = useState<Homework | null>(row.homework);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (row.homeworkId && !row.homework) {
      setLoading(true);
      void fetchHomeworkDetail(row.homeworkId).then((r) => {
        setDetail(r.record);
        setLoading(false);
      });
    }
  }, [row]);

  if (loading) return <p className="text-sm text-slate-500 py-8 text-center">Loading homework…</p>;

  if (!detail) {
    return (
      <div className="space-y-4 text-center py-6">
        <XCircle size={40} className="mx-auto text-amber-400" />
        <h4 className="font-bold text-slate-800">No Homework Assigned</h4>
        <p className="text-sm text-slate-500">
          {row.teacherName} has not assigned homework for {row.classGroup} · {row.subjectName} on{' '}
          {new Date(row.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}.
        </p>
        <p className="text-xs text-slate-400">Teachers assign via mobile app (synced to their class/subject allocations) or from this dashboard.</p>
        <div className="flex justify-center gap-2 pt-2">
          <button type="button" onClick={onClose} className={am.btnSecondary}>Close</button>
          <button type="button" onClick={onAssign} className={am.btnPrimary}>Assign from Dashboard</button>
        </div>
      </div>
    );
  }

  const attachments = detail.attachments || [];

  return (
    <div className="space-y-4 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-lg font-bold text-slate-900">{detail.title}</h4>
          <p className="text-xs text-slate-500 mt-1">
            {detail.classGroup} · {detail.subjectName} · {detail.teacherName || row.teacherName}
          </p>
        </div>
        <span className={`text-xs font-bold px-2 py-1 rounded shrink-0 ${detail.status === 'SUBMITTED' ? 'bg-green-100 text-green-700' : detail.status === 'OVERDUE' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
          {detail.statusLabel}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg">
        <div><p className="text-[10px] font-bold text-slate-400 uppercase">Assigned Date</p><p className="font-semibold">{new Date(detail.assignedDate).toLocaleDateString('en-IN')}</p></div>
        <div><p className="text-[10px] font-bold text-slate-400 uppercase">Due Date</p><p className="font-semibold">{detail.dueDate ? new Date(detail.dueDate).toLocaleDateString('en-IN') : '—'}</p></div>
        <div><p className="text-[10px] font-bold text-slate-400 uppercase">Teacher</p><p className="font-semibold">{detail.teacherName || row.teacherName}</p></div>
        <div><p className="text-[10px] font-bold text-slate-400 uppercase">Mobile Status</p><p className="font-semibold flex items-center gap-1">{detail.isPublished ? <><Smartphone size={12} className="text-green-600" /> Published</> : 'Draft'}</p></div>
      </div>

      {detail.description && (
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Description</p>
          <p className="text-slate-700 bg-white border border-slate-200 rounded-lg p-3">{detail.description}</p>
        </div>
      )}

      {attachments.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Supporting Files</p>
          <div className="space-y-1">
            {attachments.map((a) => (
              <a
                key={a.id}
                href={a.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2 hover:bg-indigo-100"
              >
                {a.type === 'pdf' ? <FileText size={14} /> : a.type === 'image' ? <ImageIcon size={14} /> : a.type === 'video' ? <Video size={14} /> : <Link2 size={14} />}
                <span className="font-semibold">{a.title || a.fileName || a.type}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      <div className={`${am.card} p-3`}>
        <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Submission Progress</p>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${detail.submissionRate}%` }} />
          </div>
          <span className="text-sm font-bold text-slate-700">{detail.submittedCount}/{detail.totalStudents}</span>
          <span className="text-xs text-slate-500">({detail.submissionRate}%)</span>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t">
        {detail.id && (
          <button
            type="button"
            disabled={busyDelete}
            onClick={() => onDelete(detail.id, detail.title)}
            className={btnDanger}
          >
            <Trash2 size={14} /> Delete Homework
          </button>
        )}
        <button type="button" onClick={onClose} className={am.btnSecondary}>Close</button>
      </div>
    </div>
  );
}

export function HomeworkView() {
  const [dashboard, setDashboard] = useState<Awaited<ReturnType<typeof fetchHomeworkDashboard>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [className, setClassName] = useState('');
  const [sectionName, setSectionName] = useState('');
  const [teacherFilter, setTeacherFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusTab>('ALL');
  const [meta, setMeta] = useState<{ academicYears: string[]; classes: string[]; sectionsByClass: Record<string, string[]> } | null>(null);
  const [allocMeta, setAllocMeta] = useState<TeacherAllocationMeta | null>(null);
  const [popupRow, setPopupRow] = useState<HomeworkDashboardRow | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [attachments, setAttachments] = useState<HomeworkAttachment[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [formError, setFormError] = useState('');
  const [uploadingExcel, setUploadingExcel] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [busyDelete, setBusyDelete] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const excelFileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [m, alloc, d] = await Promise.all([
        fetchAcademicMeta(),
        fetchTeacherAllocationMeta(academicYear).catch(() => null),
        fetchHomeworkDashboard({
          date,
          academicYear,
          className: className || undefined,
          sectionName: sectionName || undefined,
          teacherName: teacherFilter || undefined,
        }),
      ]);
      setMeta(m);
      setAllocMeta(alloc);
      setDashboard(d);
      setSelectedIds(new Set());
    } finally { setLoading(false); }
  }, [date, academicYear, className, sectionName, teacherFilter]);

  useEffect(() => { void load(); }, [load]);

  const allocationSlots = useMemo(() => {
    const slots: Array<{ className: string; sectionName: string; subjectName: string; teacherName: string }> = [];
    for (const t of allocMeta?.teachers || []) {
      for (const cs of t.classSubjects) {
        slots.push({
          className: cs.className,
          sectionName: cs.sectionName,
          subjectName: cs.subjectName,
          teacherName: t.teacherName,
        });
      }
    }
    return slots;
  }, [allocMeta]);

  const classOptions = useMemo(() => {
    const fromAlloc = [...new Set(allocationSlots.map((s) => s.className).filter(Boolean))];
    return fromAlloc.length ? fromAlloc.sort() : (allocMeta?.classes || meta?.classes || []);
  }, [allocationSlots, allocMeta, meta]);

  const sectionOptions = useMemo(() => {
    if (!form.className) return [] as string[];
    const fromAlloc = [...new Set(
      allocationSlots.filter((s) => s.className === form.className).map((s) => s.sectionName).filter(Boolean),
    )];
    if (fromAlloc.length) return fromAlloc.sort();
    return allocMeta?.sectionsByClass[form.className] || meta?.sectionsByClass[form.className] || [];
  }, [allocationSlots, form.className, allocMeta, meta]);

  const subjectOptions = useMemo(() => {
    if (!form.className) return [] as string[];
    return [...new Set(
      allocationSlots
        .filter((s) => s.className === form.className && (!form.sectionName || s.sectionName === form.sectionName || !s.sectionName))
        .map((s) => s.subjectName)
        .filter(Boolean),
    )].sort();
  }, [allocationSlots, form.className, form.sectionName]);

  const teacherOptions = useMemo(() => {
    if (!form.className || !form.subjectName) return [] as string[];
    return [...new Set(
      allocationSlots
        .filter((s) =>
          s.className === form.className
          && s.subjectName === form.subjectName
          && (!form.sectionName || s.sectionName === form.sectionName || !s.sectionName),
        )
        .map((s) => s.teacherName)
        .filter(Boolean),
    )].sort();
  }, [allocationSlots, form.className, form.sectionName, form.subjectName]);

  const rows = useMemo(() => {
    if (!dashboard) return [];
    if (statusFilter === 'ALL') return dashboard.rows;
    return dashboard.rows.filter((r) => r.assignmentStatus === statusFilter);
  }, [dashboard, statusFilter]);

  const deletableIds = useMemo(
    () => rows.map((r) => r.homeworkId).filter((id): id is string => Boolean(id)),
    [rows],
  );
  const allDeletableSelected = deletableIds.length > 0 && deletableIds.every((id) => selectedIds.has(id));

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      if (allDeletableSelected) {
        const next = new Set(prev);
        deletableIds.forEach((id) => next.delete(id));
        return next;
      }
      const next = new Set(prev);
      deletableIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const deleteOne = async (id: string, title: string) => {
    if (!window.confirm(`Delete homework "${title}"? This cannot be undone.`)) return;
    setBusyDelete(true);
    try {
      await deleteHomework(id);
      setPopupRow(null);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setMessage(`Deleted "${title}"`);
      void load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setBusyDelete(false);
    }
  };

  const deleteSelected = async () => {
    const ids = deletableIds.filter((id) => selectedIds.has(id));
    if (!ids.length) return;
    if (!window.confirm(`Delete ${ids.length} assigned homework record(s)? This cannot be undone.`)) return;
    setBusyDelete(true);
    try {
      const res = await bulkDeleteHomework(ids);
      setSelectedIds(new Set());
      setPopupRow(null);
      setMessage(`Deleted ${res.deleted} homework record(s)`);
      void load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Bulk delete failed');
    } finally {
      setBusyDelete(false);
    }
  };

  const openView = (row: HomeworkDashboardRow) => setPopupRow(row);

  const openAssignBlank = () => {
    setForm({ ...EMPTY_FORM });
    setAttachments([]);
    setFormError('');
    setShowForm(true);
  };

  const openAssignFromRow = (row: HomeworkDashboardRow) => {
    setPopupRow(null);
    setForm({
      className: row.className,
      sectionName: row.sectionName,
      subjectName: row.subjectName,
      teacherName: row.teacherName,
      title: `${row.subjectName} Homework`,
      description: '',
      totalStudents: 35,
      dueDate: '',
      youtubeUrl: '',
    });
    setAttachments([]);
    setFormError('');
    setShowForm(true);
  };

  const setClass = (value: string) => {
    setForm((f) => ({
      ...f,
      className: value,
      sectionName: '',
      subjectName: '',
      teacherName: '',
    }));
  };

  const setSection = (value: string) => {
    setForm((f) => ({
      ...f,
      sectionName: value,
      subjectName: '',
      teacherName: '',
    }));
  };

  const setSubject = (value: string) => {
    const teachers = allocationSlots
      .filter((s) =>
        s.className === form.className
        && s.subjectName === value
        && (!form.sectionName || s.sectionName === form.sectionName || !s.sectionName),
      )
      .map((s) => s.teacherName);
    setForm((f) => ({
      ...f,
      subjectName: value,
      teacherName: teachers.length === 1 ? teachers[0] : '',
    }));
  };

  const handleFileUpload = async (file: File) => {
    setUploadingFile(true);
    setFormError('');
    try {
      const dataBase64 = await fileToBase64(file);
      const res = await uploadHomeworkAttachment({
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        dataBase64,
        title: file.name,
      });
      setAttachments((prev) => [...prev, res.attachment]);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'File upload failed');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleBulkUpload = async (file: File) => {
    setUploadingExcel(true);
    try {
      const rows = await parseHomeworkUploadFile(file);
      if (!rows.length) {
        setMessage('No valid rows found. Need className, sectionName, subjectName, and title.');
        return;
      }
      const res = await bulkUploadHomework({
        academicYear,
        defaultAssignedDate: date,
        share: true,
        rows,
      });
      let msg = `Bulk homework: ${res.created} created, ${res.updated} updated from ${res.totalRows} row(s)`;
      if (res.errors?.length) msg += `. Errors: ${res.errors.slice(0, 3).join('; ')}`;
      setMessage(msg);
      void load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Bulk upload failed');
    } finally {
      setUploadingExcel(false);
    }
  };

  const assignHomework = async () => {
    setFormError('');
    if (!form.title.trim() || !form.className || !form.sectionName || !form.subjectName) {
      setFormError('Title, Class, Section and Subject are required');
      return;
    }
    if (!form.teacherName) {
      setFormError('Select a teacher mapped from system allocations');
      return;
    }
    setSaving(true);
    try {
      await createHomework({
        ...form,
        academicYear,
        assignedDate: date,
        share: true,
        attachments,
        youtubeUrl: form.youtubeUrl || undefined,
        totalStudents: Number(form.totalStudents) || undefined,
        dueDate: form.dueDate || undefined,
      });
      setMessage('Homework assigned and published to mobile app');
      setShowForm(false);
      void load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to assign homework');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !dashboard) return <AcademicLoading label="Loading homework dashboard…" />;

  const summary = dashboard?.summary;

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="Academic Management › Homework"
        title="Homework Dashboard"
        subtitle="Track daily homework assignments by teacher, class & subject — synced with mobile app"
        actions={(
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => downloadHomeworkTemplate()} className={btnExcel}>
              <Download size={14} /> Excel Template
            </button>
            <button
              type="button"
              disabled={uploadingExcel}
              onClick={() => excelFileRef.current?.click()}
              className={btnExcel}
            >
              <Upload size={14} /> {uploadingExcel ? 'Uploading…' : 'Bulk Upload'}
            </button>
            <input
              ref={excelFileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleBulkUpload(file);
                e.target.value = '';
              }}
            />
            <button type="button" onClick={openAssignBlank} className={am.btnPrimary}>
              <Plus size={14} /> Assign Homework
            </button>
          </div>
        )}
      />
      <div className={am.content}>
        {message && <p className={am.message}>{message}</p>}

        <AcademicYearTermFilters
          academicYear={academicYear} term="Term 1"
          years={meta?.academicYears || [academicYear]} terms={['Term 1', 'Term 2']}
          onYear={setAcademicYear} onTerm={() => {}}
          className={className} sectionName={sectionName}
          classes={meta?.classes} sections={className ? meta?.sectionsByClass[className] : []}
          onClass={(v) => { setClassName(v); setSectionName(''); }} onSection={setSectionName}
        />

        <div className={`${am.filterBar} flex-wrap`}>
          <label className="text-xs font-semibold text-slate-600 flex items-center gap-2">
            <Calendar size={14} /> Date
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={am.select} />
          </label>
          <input placeholder="Filter by teacher" value={teacherFilter} onChange={(e) => setTeacherFilter(e.target.value)} className={`${am.input} max-w-[180px]`} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1 border-b border-slate-200 pb-1">
            {STATUS_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => { setStatusFilter(t.id); setSelectedIds(new Set()); }}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-colors ${
                  statusFilter === t.id ? 'border-amber-400 text-amber-900 bg-amber-50' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {t.label}
                {t.id === 'ALL' && summary ? ` (${summary.totalSlots})` : ''}
                {t.id === 'ASSIGNED' && summary ? ` (${summary.assigned})` : ''}
                {t.id === 'NOT_ASSIGNED' && summary ? ` (${summary.notAssigned})` : ''}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={!selectedIds.size || busyDelete}
            onClick={() => void deleteSelected()}
            className={btnDanger}
          >
            <Trash2 size={14} /> Delete Selected{selectedIds.size ? ` (${selectedIds.size})` : ''}
          </button>
        </div>

        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total Slots', value: summary.totalSlots, icon: <ClipboardList size={18} />, color: 'text-slate-600 bg-slate-100' },
              { label: 'Assigned', value: summary.assigned, icon: <CheckCircle2 size={18} />, color: 'text-green-700 bg-green-100' },
              { label: 'Not Assigned', value: summary.notAssigned, icon: <XCircle size={18} />, color: 'text-amber-700 bg-amber-100' },
              { label: 'Coverage', value: `${summary.assignedPercent}%`, icon: <Smartphone size={18} />, color: 'text-blue-700 bg-blue-100' },
            ].map((k) => (
              <div key={k.label} className={`${am.card} p-4 flex items-center gap-3`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${k.color}`}>{k.icon}</div>
                <div>
                  <p className="text-xl font-bold text-slate-900">{k.value}</p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase">{k.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className={am.tableWrap}>
          <table className="w-full">
            <thead><tr>
              <th className={`${am.th} w-10`}>
                <input
                  type="checkbox"
                  checked={allDeletableSelected}
                  onChange={toggleSelectAll}
                  disabled={!deletableIds.length}
                  title="Select assigned homework"
                />
              </th>
              <th className={am.th}>Date</th>
              <th className={am.th}>Class</th>
              <th className={am.th}>Section</th>
              <th className={am.th}>Subject</th>
              <th className={am.th}>Teacher</th>
              <th className={am.th}>Assignment Status</th>
              <th className={am.th}>Homework Title</th>
              <th className={am.th}>Submissions</th>
              <th className={am.th}>Actions</th>
            </tr></thead>
            <tbody>
              {rows.map((r, i) => {
                const hwId = r.homeworkId;
                return (
                <tr key={`${r.teacherName}-${r.classGroup}-${r.subjectName}-${hwId || i}`} className={hwId && selectedIds.has(hwId) ? 'bg-amber-50/40' : r.assignmentStatus === 'NOT_ASSIGNED' ? 'bg-amber-50/20' : ''}>
                  <td className={am.td}>
                    {hwId ? (
                      <input type="checkbox" checked={selectedIds.has(hwId)} onChange={() => toggleSelect(hwId)} />
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className={`${am.td} text-xs whitespace-nowrap`}>{new Date(r.date).toLocaleDateString('en-IN')}</td>
                  <td className={am.td}>{r.className}</td>
                  <td className={am.td}>{r.sectionName}</td>
                  <td className={am.td}>{r.subjectName}</td>
                  <td className={am.td}><span className="font-semibold">{r.teacherName}</span></td>
                  <td className={am.td}>
                    {r.assignmentStatus === 'ASSIGNED' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded bg-green-100 text-green-700"><CheckCircle2 size={12} /> Assigned</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800"><XCircle size={12} /> Not Assigned</span>
                    )}
                  </td>
                  <td className={am.td}>{r.homework?.title || <span className="text-slate-400">—</span>}</td>
                  <td className={am.td}>
                    {r.homework ? `${r.homework.submittedCount}/${r.homework.totalStudents} (${r.homework.submissionRate}%)` : '—'}
                  </td>
                  <td className={am.td}>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openView(r)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                      >
                        <Eye size={14} /> View
                      </button>
                      {hwId && (
                        <button
                          type="button"
                          disabled={busyDelete}
                          onClick={() => void deleteOne(hwId, r.homework?.title || 'homework')}
                          className="inline-flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-800"
                          title="Delete homework"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                );
              })}
              {rows.length === 0 && (
                <tr><td colSpan={10} className={`${am.td} text-center text-slate-400 py-8`}>
                  {statusFilter === 'ASSIGNED'
                    ? 'No assigned homework for this date.'
                    : statusFilter === 'NOT_ASSIGNED'
                      ? 'All slots have homework assigned.'
                      : 'No teacher slots found. Seed academic data or add teacher allocations.'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-slate-500 flex items-center gap-1">
          <Smartphone size={12} /> Class/Subject/Teacher options sync from Teacher Allocations. When allocations change, open homework auto-maps to the new teacher.
        </p>
      </div>

      <AcademicModal
        open={!!popupRow}
        onClose={() => setPopupRow(null)}
        title={popupRow?.assignmentStatus === 'ASSIGNED' ? 'Homework Details' : 'Homework Not Assigned'}
        large
      >
        {popupRow && (
          <HomeworkDetailPopup
            row={popupRow}
            onClose={() => setPopupRow(null)}
            onAssign={() => openAssignFromRow(popupRow)}
            onDelete={(id, title) => void deleteOne(id, title)}
            busyDelete={busyDelete}
          />
        )}
      </AcademicModal>

      <AcademicModal open={showForm} onClose={() => setShowForm(false)} title="Assign Homework" large>
        <div className="space-y-3">
          <input placeholder="Title *" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className={am.input} />

          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs space-y-1">
              <span className="font-semibold text-slate-600">Class *</span>
              <select value={form.className} onChange={(e) => setClass(e.target.value)} className={am.input}>
                <option value="">Select class…</option>
                {classOptions.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="text-xs space-y-1">
              <span className="font-semibold text-slate-600">Section *</span>
              <select value={form.sectionName} onChange={(e) => setSection(e.target.value)} className={am.input} disabled={!form.className}>
                <option value="">Select section…</option>
                {sectionOptions.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label className="text-xs space-y-1">
              <span className="font-semibold text-slate-600">Subject *</span>
              <select value={form.subjectName} onChange={(e) => setSubject(e.target.value)} className={am.input} disabled={!form.className}>
                <option value="">Select subject…</option>
                {subjectOptions.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label className="text-xs space-y-1">
              <span className="font-semibold text-slate-600">Teacher *</span>
              <select value={form.teacherName} onChange={(e) => setForm((f) => ({ ...f, teacherName: e.target.value }))} className={am.input} disabled={!form.subjectName}>
                <option value="">Select teacher…</option>
                {teacherOptions.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
          </div>

          {!allocationSlots.length && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              No teacher allocations found for {academicYear}. Add allocations under Teacher Allocation so Class / Section / Subject / Teacher dropdowns populate automatically.
            </p>
          )}

          <textarea placeholder="Description (visible on mobile app)" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className={am.input} rows={3} />

          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs space-y-1">
              <span className="font-semibold text-slate-600">Total Students</span>
              <input type="number" min={0} value={form.totalStudents} onChange={(e) => setForm((f) => ({ ...f, totalStudents: Number(e.target.value) }))} className={am.input} />
            </label>
            <label className="text-xs space-y-1">
              <span className="font-semibold text-slate-600">Due Date</span>
              <input type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} className={am.input} />
            </label>
          </div>

          <label className="text-xs space-y-1 block">
            <span className="font-semibold text-slate-600 flex items-center gap-1"><Link2 size={12} /> YouTube / Video Link</span>
            <input
              placeholder="https://youtube.com/watch?v=… or other video URL"
              value={form.youtubeUrl}
              onChange={(e) => setForm((f) => ({ ...f, youtubeUrl: e.target.value }))}
              className={am.input}
            />
          </label>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-600">Supporting files (PDF / JPG / PNG / Video)</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={uploadingFile}
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-2 border border-indigo-300 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg text-xs font-bold"
              >
                <Upload size={14} /> {uploadingFile ? 'Uploading…' : 'Upload the home work supporting file'}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.mp4,.webm,.mov,application/pdf,image/*,video/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFileUpload(file);
                  e.target.value = '';
                }}
              />
            </div>
            {attachments.length > 0 && (
              <div className="space-y-1">
                {attachments.map((a) => (
                  <div key={a.id} className="flex items-center gap-2 text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                    {a.type === 'pdf' ? <FileText size={14} /> : a.type === 'image' ? <ImageIcon size={14} /> : <Video size={14} />}
                    <span className="flex-1 font-medium text-slate-700 truncate">{a.title || a.fileName}</span>
                    <button type="button" onClick={() => setAttachments((prev) => prev.filter((x) => x.id !== a.id))} className="text-red-500">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {formError && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{formError}</p>}
          <p className="text-xs text-slate-500">Will be assigned for {new Date(date).toLocaleDateString('en-IN')} and published to mobile app.</p>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={() => setShowForm(false)} className={am.btnSecondary}>Cancel</button>
          <button type="button" disabled={saving || uploadingFile} onClick={() => void assignHomework()} className={am.btnPrimary}>
            {saving ? 'Publishing…' : 'Assign & Publish to Mobile'}
          </button>
        </div>
      </AcademicModal>
    </AcademicPageShell>
  );
}
