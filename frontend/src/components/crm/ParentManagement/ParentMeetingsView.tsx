import { useCallback, useEffect, useState, useRef } from 'react';
import { Plus, Download, Camera, Users, User, Bell, Calendar } from 'lucide-react';
import {
  bulkScheduleParentMeetings, createParentMeeting, fetchParentMeetings,
  fetchParentMeetingsMeta, uploadMeetingPhotos, type MeetingRecord,
} from '../../../lib/parentMeetingServices';
import { downloadParentMeetingsExcel } from '../../../lib/parentExcel';
import { fetchStudents, fetchStudentsMeta } from '../../../lib/studentServices';
import {
  ParentKpiCard, ParentLoading, ParentModal, ParentModalActions,
  ParentPageHeader, ParentPageShell, ParentTableCard, pm,
} from './ParentManagementUi';

type ScheduleMode = 'single' | 'bulk';

export function ParentMeetingsView() {
  const [records, setRecords] = useState<MeetingRecord[]>([]);
  const [summary, setSummary] = useState<{ total: number; scheduled: number; completed: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('bulk');
  const [students, setStudents] = useState<{ id: string; fullName: string; classGroup: string }[]>([]);
  const [className, setClassName] = useState('');
  const [sectionName, setSectionName] = useState('');
  const [classOptions, setClassOptions] = useState<string[]>([]);
  const [sectionOptions, setSectionOptions] = useState<string[]>([]);
  const [bulkSectionOptions, setBulkSectionOptions] = useState<string[]>([]);
  const [form, setForm] = useState({
    studentId: '',
    scheduledAt: '',
    meetingTitle: 'Parent Teacher Meeting',
    venue: '',
    discussionNotes: '',
    attendees: '',
    bulkClass: '',
    bulkSection: '',
    notifyParents: true,
    notifyStaff: true,
    notifyStudents: true,
  });
  const [photoMeetingId, setPhotoMeetingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
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
      setStudents(r.students.map((s) => ({
        id: s.id,
        fullName: s.fullName,
        classGroup: s.classSection || `${s.className}-${s.sectionName}`,
      }))),
    );
    void fetchStudentsMeta().then((m) => setClassOptions(m.filters.classes));
  }, []);
  useEffect(() => {
    void fetchStudentsMeta().then((m) => {
      setSectionOptions(className ? m.filters.sectionsByClass[className] || [] : []);
    });
  }, [className]);
  useEffect(() => {
    void fetchStudentsMeta().then((m) => {
      setBulkSectionOptions(form.bulkClass ? m.filters.sectionsByClass[form.bulkClass] || [] : []);
    });
  }, [form.bulkClass]);

  const openForm = (mode: ScheduleMode = 'bulk') => {
    setScheduleMode(mode);
    setShowForm(true);
  };

  const handleSingleCreate = async () => {
    if (!form.studentId || !form.scheduledAt) return;
    setSubmitting(true);
    try {
      const res = await createParentMeeting({
        studentId: form.studentId,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        meetingTitle: form.meetingTitle,
        venue: form.venue,
        discussionNotes: form.discussionNotes,
        attendees: form.attendees,
        notifyParents: form.notifyParents,
        notifyStaff: form.notifyStaff,
        notifyStudents: form.notifyStudents,
      });
      setShowForm(false);
      setMessage(
        `PTM scheduled. Push notifications sent — Parents: ${res.notifications.parentsPush}, Students: ${res.notifications.studentsPush}, Staff: ${res.notifications.staffPush}.`,
      );
      void load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed to schedule PTM');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkCreate = async () => {
    if (!form.bulkClass || !form.scheduledAt) return;
    setSubmitting(true);
    try {
      const res = await bulkScheduleParentMeetings({
        className: form.bulkClass,
        sectionName: form.bulkSection || undefined,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        meetingTitle: form.meetingTitle || `PTM — Class ${form.bulkClass}${form.bulkSection ? ` ${form.bulkSection}` : ''}`,
        venue: form.venue,
        discussionNotes: form.discussionNotes,
        notifyParents: form.notifyParents,
        notifyStaff: form.notifyStaff,
        notifyStudents: form.notifyStudents,
      });
      setShowForm(false);
      setMessage(
        `Bulk PTM created for ${res.count} student(s) (${res.batchId}). Push sent — Parents: ${res.notifications.parentsPush}, Students: ${res.notifications.studentsPush}, Staff: ${res.notifications.staffPush}.`,
      );
      void load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed to bulk schedule PTM');
    } finally {
      setSubmitting(false);
    }
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

  const notifyCheckboxes = (
    <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-3 space-y-2">
      <p className="text-xs font-bold text-indigo-900 flex items-center gap-1"><Bell size={12} /> Auto push notifications</p>
      {[
        ['notifyParents', 'Parents (registered mobile app)'],
        ['notifyStudents', 'Students (mobile app)'],
        ['notifyStaff', 'All staff (admin & teachers)'],
      ].map(([key, label]) => (
        <label key={key} className="flex items-center gap-2 text-xs text-slate-700">
          <input
            type="checkbox"
            checked={form[key as keyof typeof form] as boolean}
            onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.checked }))}
            className="rounded border-slate-300"
          />
          {label}
        </label>
      ))}
    </div>
  );

  if (loading && !summary) return <ParentLoading label="Loading PTM records…" />;

  return (
    <ParentPageShell>
      <ParentPageHeader
        breadcrumb="Parent Management › Parent Meetings (PTM)"
        title="Parent Meetings (PTM)"
        subtitle="Schedule class-wise or individual PTMs — push notifications auto-sent to parents, students, and staff."
        actions={
          <>
            <button type="button" onClick={() => downloadParentMeetingsExcel(records)} className={pm.btnSecondary}>
              <Download size={14} /> Export Excel
            </button>
            <button type="button" onClick={() => openForm('bulk')} className={pm.btnPrimary}>
              <Users size={14} /> Bulk Schedule PTM
            </button>
            <button type="button" onClick={() => openForm('single')} className={pm.btnSecondary}>
              <Plus size={14} /> Single PTM
            </button>
          </>
        }
      />

      <div className={pm.content}>
        {message && <p className={pm.message}>{message}</p>}

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
          <select value={sectionName} onChange={(e) => setSectionName(e.target.value)} disabled={!className} className={pm.select}>
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
                <th className={pm.th}>Title</th>
                <th className={pm.th}>Father</th>
                <th className={pm.th}>Scheduled</th>
                <th className={pm.th}>Status</th>
                <th className={pm.th}>Photos</th>
              </tr>
            </thead>
            <tbody className={pm.tbody}>
              {records.length === 0 ? (
                <tr><td colSpan={7} className="p-10 text-center text-slate-400 text-sm">No PTM scheduled yet — use Bulk Schedule PTM for a whole class</td></tr>
              ) : records.map((r) => (
                <tr key={r.id} className={pm.trHover}>
                  <td className={`${pm.td} font-medium text-slate-800`}>{r.studentName}</td>
                  <td className={pm.td}>{r.classGroup}</td>
                  <td className={`${pm.td} text-xs text-slate-600`}>
                    {r.meetingTitle}
                    {r.batchId && <span className="block text-[10px] text-slate-400">{r.batchId}</span>}
                  </td>
                  <td className={pm.td}>{r.fatherName}</td>
                  <td className={`${pm.td} text-xs text-slate-500 whitespace-nowrap`}>
                    {new Date(r.scheduledAt).toLocaleString('en-IN')}
                    {r.venue && <span className="block text-[10px] text-slate-400">{r.venue}</span>}
                  </td>
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

      <ParentModal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={scheduleMode === 'bulk' ? 'Bulk Schedule PTM (Class-wise)' : 'Schedule Single PTM'}
        large
      >
        <div className={`${pm.tabs} -mx-1 mb-2`}>
          <button type="button" onClick={() => setScheduleMode('bulk')} className={scheduleMode === 'bulk' ? pm.tabActive : pm.tab}>
            <Users size={12} className="inline mr-1" /> Class / Bulk
          </button>
          <button type="button" onClick={() => setScheduleMode('single')} className={scheduleMode === 'single' ? pm.tabActive : pm.tab}>
            <User size={12} className="inline mr-1" /> Single Student
          </button>
        </div>

        <div className="space-y-3">
          {scheduleMode === 'bulk' ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  value={form.bulkClass}
                  onChange={(e) => setForm((f) => ({ ...f, bulkClass: e.target.value, bulkSection: '' }))}
                  className={pm.selectFull}
                >
                  <option value="">Select Class *</option>
                  {classOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <select
                  value={form.bulkSection}
                  onChange={(e) => setForm((f) => ({ ...f, bulkSection: e.target.value }))}
                  disabled={!form.bulkClass}
                  className={pm.selectFull}
                >
                  <option value="">All Sections (entire class)</option>
                  {bulkSectionOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <p className="text-[10px] text-slate-500">
                Creates one PTM per active student in the selected class/section and sends push notifications automatically.
              </p>
            </>
          ) : (
            <select value={form.studentId} onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value }))} className={pm.selectFull}>
              <option value="">Select student *</option>
              {students.map((s) => <option key={s.id} value={s.id}>{s.fullName} ({s.classGroup})</option>)}
            </select>
          )}

          <input
            placeholder="Meeting title"
            value={form.meetingTitle}
            onChange={(e) => setForm((f) => ({ ...f, meetingTitle: e.target.value }))}
            className={pm.input}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="datetime-local"
              value={form.scheduledAt}
              onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))}
              className={pm.input}
            />
            <input
              placeholder="Venue (e.g. School Auditorium)"
              value={form.venue}
              onChange={(e) => setForm((f) => ({ ...f, venue: e.target.value }))}
              className={pm.input}
            />
          </div>
          {scheduleMode === 'single' && (
            <input placeholder="Attendees" value={form.attendees} onChange={(e) => setForm((f) => ({ ...f, attendees: e.target.value }))} className={pm.input} />
          )}
          <textarea placeholder="Discussion notes / agenda" value={form.discussionNotes} onChange={(e) => setForm((f) => ({ ...f, discussionNotes: e.target.value }))} className={pm.input} rows={2} />
          {notifyCheckboxes}
        </div>

        <ParentModalActions
          onCancel={() => setShowForm(false)}
          onConfirm={() => void (scheduleMode === 'bulk' ? handleBulkCreate() : handleSingleCreate())}
          confirmLabel={submitting ? 'Scheduling…' : scheduleMode === 'bulk' ? 'Schedule & Notify All' : 'Schedule & Notify'}
        />
      </ParentModal>
    </ParentPageShell>
  );
}
