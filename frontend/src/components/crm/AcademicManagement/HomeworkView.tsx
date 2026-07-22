import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus, Eye, Calendar, CheckCircle2, XCircle, Smartphone, ClipboardList,
} from 'lucide-react';
import {
  createHomework, fetchAcademicMeta, fetchHomeworkDashboard, fetchHomeworkDetail,
  type Homework, type HomeworkDashboardRow,
} from '../../../lib/academicServices';
import {
  AcademicLoading, AcademicModal, AcademicPageHeader, AcademicPageShell,
  AcademicYearTermFilters, am,
} from './AcademicManagementUi';

function HomeworkDetailPopup({
  row, onClose, onAssign,
}: {
  row: HomeworkDashboardRow;
  onClose: () => void;
  onAssign: () => void;
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
        <p className="text-xs text-slate-400">Teachers assign homework via the mobile app. This slot is pending.</p>
        <div className="flex justify-center gap-2 pt-2">
          <button type="button" onClick={onClose} className={am.btnSecondary}>Close</button>
          <button type="button" onClick={onAssign} className={am.btnPrimary}>Assign from Dashboard</button>
        </div>
      </div>
    );
  }

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
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ASSIGNED' | 'NOT_ASSIGNED'>('ALL');
  const [meta, setMeta] = useState<{ academicYears: string[]; classes: string[]; sectionsByClass: Record<string, string[]> } | null>(null);
  const [popupRow, setPopupRow] = useState<HomeworkDashboardRow | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ className: '', sectionName: '', subjectName: '', teacherName: '', title: '', description: '', totalStudents: 35 });
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const m = await fetchAcademicMeta();
      setMeta(m);
      const d = await fetchHomeworkDashboard({
        date,
        academicYear,
        className: className || undefined,
        sectionName: sectionName || undefined,
        teacherName: teacherFilter || undefined,
      });
      setDashboard(d);
    } finally { setLoading(false); }
  }, [date, academicYear, className, sectionName, teacherFilter]);

  useEffect(() => { void load(); }, [load]);

  const rows = useMemo(() => {
    if (!dashboard) return [];
    if (statusFilter === 'ALL') return dashboard.rows;
    return dashboard.rows.filter((r) => r.assignmentStatus === statusFilter);
  }, [dashboard, statusFilter]);

  const openView = (row: HomeworkDashboardRow) => setPopupRow(row);

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
    });
    setShowForm(true);
  };

  const assignHomework = async () => {
    await createHomework({ ...form, academicYear, assignedDate: date, share: true });
    setMessage('Homework assigned and published to mobile app');
    setShowForm(false);
    void load();
  };

  if (loading && !dashboard) return <AcademicLoading label="Loading homework dashboard…" />;

  const summary = dashboard?.summary;

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="Academic Management › Homework"
        title="Homework Dashboard"
        subtitle="Track daily homework assignments by teacher, class & subject — synced with mobile app"
        actions={<button type="button" onClick={() => setShowForm(true)} className={am.btnPrimary}><Plus size={14} /> Assign Homework</button>}
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
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className={am.select}>
            <option value="ALL">All Status</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="NOT_ASSIGNED">Not Assigned</option>
          </select>
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
              <th className={am.th}>Date</th>
              <th className={am.th}>Class</th>
              <th className={am.th}>Section</th>
              <th className={am.th}>Subject</th>
              <th className={am.th}>Teacher</th>
              <th className={am.th}>Assignment Status</th>
              <th className={am.th}>Homework Title</th>
              <th className={am.th}>Submissions</th>
              <th className={am.th} />
            </tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={`${r.teacherName}-${r.classGroup}-${r.subjectName}-${i}`} className={r.assignmentStatus === 'NOT_ASSIGNED' ? 'bg-amber-50/40' : ''}>
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
                    <button
                      type="button"
                      onClick={() => openView(r)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                    >
                      <Eye size={14} /> View
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={9} className={`${am.td} text-center text-slate-400 py-8`}>No teacher slots found. Seed academic data or add teacher allocations.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-slate-500 flex items-center gap-1"><Smartphone size={12} /> Homework assigned via mobile app appears here automatically. API: <code className="bg-slate-100 px-1 rounded">GET /api/academic/homework/mobile?studentId=</code></p>
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
          />
        )}
      </AcademicModal>

      <AcademicModal open={showForm} onClose={() => setShowForm(false)} title="Assign Homework" large>
        <div className="space-y-3">
          <input placeholder="Title *" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className={am.input} />
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Class *" value={form.className} onChange={(e) => setForm((f) => ({ ...f, className: e.target.value }))} className={am.input} />
            <input placeholder="Section *" value={form.sectionName} onChange={(e) => setForm((f) => ({ ...f, sectionName: e.target.value }))} className={am.input} />
            <input placeholder="Subject *" value={form.subjectName} onChange={(e) => setForm((f) => ({ ...f, subjectName: e.target.value }))} className={am.input} />
            <input placeholder="Teacher" value={form.teacherName} onChange={(e) => setForm((f) => ({ ...f, teacherName: e.target.value }))} className={am.input} />
          </div>
          <textarea placeholder="Description (visible on mobile app)" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className={am.input} rows={3} />
          <input type="number" placeholder="Total Students" value={form.totalStudents} onChange={(e) => setForm((f) => ({ ...f, totalStudents: Number(e.target.value) }))} className={am.input} />
          <p className="text-xs text-slate-500">Will be assigned for {new Date(date).toLocaleDateString('en-IN')} and published to mobile app.</p>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={() => setShowForm(false)} className={am.btnSecondary}>Cancel</button>
          <button type="button" onClick={() => void assignHomework()} className={am.btnPrimary}>Assign & Publish to Mobile</button>
        </div>
      </AcademicModal>
    </AcademicPageShell>
  );
}
