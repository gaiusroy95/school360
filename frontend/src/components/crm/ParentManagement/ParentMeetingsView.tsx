import { useCallback, useEffect, useState, useRef } from 'react';
import { Plus, Download, Camera } from 'lucide-react';
import {
  createParentMeeting, fetchParentMeetings, fetchParentMeetingsMeta, uploadMeetingPhotos,
  type MeetingRecord,
} from '../../../lib/parentMeetingServices';
import { downloadParentMeetingsExcel } from '../../../lib/parentExcel';
import { fetchStudents, fetchStudentsMeta } from '../../../lib/studentServices';
import {
  ParentKpiCard, ParentKpiGrid, ParentLoading, ParentModal, ParentModalActions,
  ParentPageHeader, ParentPageShell, ParentTableCard, pm,
} from './ParentManagementUi';

export function ParentMeetingsView() {
  const [records, setRecords] = useState<MeetingRecord[]>([]);
  const [summary, setSummary] = useState<{ total: number; scheduled: number; completed: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [students, setStudents] = useState<{ id: string; fullName: string }[]>([]);
  const [className, setClassName] = useState('');
  const [sectionName, setSectionName] = useState('');
  const [classOptions, setClassOptions] = useState<string[]>([]);
  const [sectionOptions, setSectionOptions] = useState<string[]>([]);
  const [form, setForm] = useState({ studentId: '', scheduledAt: '', discussionNotes: '', attendees: '' });
  const [photoMeetingId, setPhotoMeetingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [meta, list] = await Promise.all([
        fetchParentMeetingsMeta(),
        fetchParentMeetings({ className: className || undefined, sectionName: sectionName || undefined }),
      ]);
      setSummary(meta.summary);
      setRecords(list.records);
    } finally {
      setLoading(false);
    }
  }, [className, sectionName]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    void fetchStudents({ pageSize: 500, viewAll: true }).then((r) =>
      setStudents(r.students.map((s) => ({ id: s.id, fullName: s.fullName }))),
    );
    void fetchStudentsMeta().then((m) => setClassOptions(m.filters.classes));
  }, []);
  useEffect(() => {
    void fetchStudentsMeta().then((m) => {
      setSectionOptions(className ? m.filters.sectionsByClass[className] || [] : []);
    });
  }, [className]);

  const handleCreate = async () => {
    if (!form.studentId || !form.scheduledAt) return;
    await createParentMeeting({
      studentId: form.studentId,
      scheduledAt: new Date(form.scheduledAt).toISOString(),
      discussionNotes: form.discussionNotes,
      attendees: form.attendees,
    });
    setShowForm(false);
    void load();
  };

  const handlePhotoUpload = async (file: File) => {
    if (!photoMeetingId) return;
    const reader = new FileReader();
    reader.onload = async () => {
      await uploadMeetingPhotos(photoMeetingId, [reader.result as string]);
      setPhotoMeetingId(null);
      void load();
    };
    reader.readAsDataURL(file);
  };

  if (loading && !summary) return <ParentLoading label="Loading PTM records…" />;

  return (
    <ParentPageShell>
      <ParentPageHeader
        breadcrumb="Parent Management › Parent Meetings (PTM)"
        title="Parent Meetings (PTM)"
        subtitle="Schedule meetings, upload photos, and export PTM history."
        actions={
          <>
            <button type="button" onClick={() => downloadParentMeetingsExcel(records)} className={pm.btnSecondary}>
              <Download size={14} /> Export Excel
            </button>
            <button type="button" onClick={() => setShowForm(true)} className={pm.btnPrimary}>
              <Plus size={14} /> Schedule PTM
            </button>
          </>
        }
      />

      <div className={pm.content}>
        {summary && (
          <div className="grid grid-cols-3 gap-4 max-w-2xl">
            <ParentKpiCard label="Total" value={summary.total} />
            <ParentKpiCard label="Scheduled" value={summary.scheduled} valueClassName="text-amber-600" />
            <ParentKpiCard label="Completed" value={summary.completed} valueClassName="text-emerald-600" />
          </div>
        )}

        <div className={pm.filterBar}>
          <select value={className} onChange={(e) => { setClassName(e.target.value); setSectionName(''); }} className={pm.select}>
            <option value="">All Classes</option>
            {classOptions.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={sectionName} onChange={(e) => setSectionName(e.target.value)} className={pm.select}>
            <option value="">All Sections</option>
            {sectionOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <ParentTableCard title="PTM Records" footer={`${records.length} meeting(s)`}>
          <table className={pm.table}>
            <thead className={pm.tableHead}>
              <tr>
                <th className={pm.th}>Student</th>
                <th className={pm.th}>Class</th>
                <th className={pm.th}>Father</th>
                <th className={pm.th}>Scheduled</th>
                <th className={pm.th}>Status</th>
                <th className={pm.th}>Photos</th>
              </tr>
            </thead>
            <tbody className={pm.tbody}>
              {records.map((r) => (
                <tr key={r.id} className={pm.trHover}>
                  <td className={`${pm.td} font-medium text-slate-800`}>{r.studentName}</td>
                  <td className={pm.td}>{r.classGroup}</td>
                  <td className={pm.td}>{r.fatherName}</td>
                  <td className={`${pm.td} text-xs text-slate-500`}>{new Date(r.scheduledAt).toLocaleString('en-IN')}</td>
                  <td className={pm.td}><span className={`${pm.badge} ${pm.badgeSlate}`}>{r.statusLabel}</span></td>
                  <td className={pm.td}>
                    <button type="button" onClick={() => { setPhotoMeetingId(r.id); fileRef.current?.click(); }} className="text-xs text-indigo-600 font-bold flex items-center gap-1 hover:underline">
                      <Camera size={12} /> {r.photoUrls.length} photo(s)
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ParentTableCard>
      </div>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handlePhotoUpload(f); }} />

      <ParentModal open={showForm} onClose={() => setShowForm(false)} title="Schedule PTM">
        <div className="space-y-3">
          <select value={form.studentId} onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value }))} className={pm.selectFull}>
            <option value="">Select student</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.fullName}</option>)}
          </select>
          <input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))} className={pm.input} />
          <input placeholder="Attendees" value={form.attendees} onChange={(e) => setForm((f) => ({ ...f, attendees: e.target.value }))} className={pm.input} />
          <textarea placeholder="Discussion notes" value={form.discussionNotes} onChange={(e) => setForm((f) => ({ ...f, discussionNotes: e.target.value }))} className={pm.input} rows={2} />
        </div>
        <ParentModalActions onCancel={() => setShowForm(false)} onConfirm={() => void handleCreate()} confirmLabel="Schedule" />
      </ParentModal>
    </ParentPageShell>
  );
}
