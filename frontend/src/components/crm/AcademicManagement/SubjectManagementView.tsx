import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus, Trash2, Eye, Pencil, Users, BookOpen, Calendar, TrendingUp, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import {
  createAcademicSubject, deleteAcademicSubject, fetchAcademicMeta, fetchSubjectManagementDashboard,
  updateSyllabusChapter, type SubjectOffering, type SubjectManagementDashboard,
} from '../../../lib/academicServices';
import {
  AcademicLoading, AcademicModal, AcademicPageHeader, AcademicPageShell,
  AcademicYearTermFilters, am,
} from './AcademicManagementUi';

const PROGRESS_STATUS: Record<string, { label: string; className: string }> = {
  ahead: { label: 'Ahead', className: 'bg-green-100 text-green-800' },
  on_track: { label: 'On Track', className: 'bg-blue-100 text-blue-800' },
  behind: { label: 'Behind', className: 'bg-red-100 text-red-800' },
  not_started: { label: 'Not Started', className: 'bg-slate-100 text-slate-600' },
};

type TeacherRow = {
  teacherName: string;
  teacherEmail: string;
  teacherPhone: string;
  className: string;
  sectionName: string;
  courseStartDate: string;
  courseCompletionDeadline: string;
  revisionDeadline: string;
};

const EMPTY_TEACHER: TeacherRow = {
  teacherName: '', teacherEmail: '', teacherPhone: '',
  className: '', sectionName: '',
  courseStartDate: '', courseCompletionDeadline: '', revisionDeadline: '',
};

function ProgressCompare({ current, ideal }: { current: number; ideal: number }) {
  return (
    <div className="space-y-1.5 min-w-[140px]">
      <div>
        <div className="flex justify-between text-[10px] mb-0.5">
          <span className="text-slate-500">Current</span>
          <span className="font-bold text-teal-700">{current.toFixed(0)}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-teal-500 rounded-full" style={{ width: `${Math.min(100, current)}%` }} />
        </div>
      </div>
      <div>
        <div className="flex justify-between text-[10px] mb-0.5">
          <span className="text-slate-500">Ideal</span>
          <span className="font-bold text-indigo-600">{ideal.toFixed(0)}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-400 rounded-full border border-dashed border-indigo-300" style={{ width: `${Math.min(100, ideal)}%` }} />
        </div>
      </div>
    </div>
  );
}

function OfferingDetail({ offering, onClose, onSaveRevision }: {
  offering: SubjectOffering;
  onClose: () => void;
  onSaveRevision: (chapterId: string, revisionDeadline: string) => void;
}) {
  const [editingChapter, setEditingChapter] = useState<string | null>(null);
  const [revDate, setRevDate] = useState('');

  return (
    <div className="space-y-4 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-lg font-bold text-slate-900">{offering.subjectName}</h4>
          <p className="text-xs text-slate-500">{offering.classGroup} · {offering.teacherName}</p>
        </div>
        <span className={`text-xs font-bold px-2 py-1 rounded ${PROGRESS_STATUS[offering.progressStatus]?.className || ''}`}>
          {PROGRESS_STATUS[offering.progressStatus]?.label || offering.progressStatus}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg">
        <div><p className="text-[10px] font-bold text-slate-400 uppercase">Teacher Email</p><p className="font-semibold">{offering.teacherEmail || '—'}</p></div>
        <div><p className="text-[10px] font-bold text-slate-400 uppercase">Teacher Phone</p><p className="font-semibold">{offering.teacherPhone || '—'}</p></div>
        <div><p className="text-[10px] font-bold text-slate-400 uppercase">Course Start</p><p className="font-semibold">{offering.courseStartDate ? new Date(offering.courseStartDate).toLocaleDateString('en-IN') : '—'}</p></div>
        <div><p className="text-[10px] font-bold text-slate-400 uppercase">Completion Deadline</p><p className="font-semibold">{offering.courseCompletionDeadline ? new Date(offering.courseCompletionDeadline).toLocaleDateString('en-IN') : '—'}</p></div>
        <div><p className="text-[10px] font-bold text-slate-400 uppercase">Revision Deadline</p><p className="font-semibold">{offering.revisionDeadline ? new Date(offering.revisionDeadline).toLocaleDateString('en-IN') : '—'}</p></div>
        <div><p className="text-[10px] font-bold text-slate-400 uppercase">Progress Gap</p><p className={`font-semibold ${offering.progressGap < -10 ? 'text-red-600' : 'text-green-600'}`}>{offering.progressGap > 0 ? '+' : ''}{offering.progressGap.toFixed(1)}%</p></div>
      </div>

      <ProgressCompare current={offering.currentProgress} ideal={offering.idealProgress} />

      <div>
        <p className="text-xs font-bold text-slate-500 uppercase mb-2">Syllabus Chapters & Revision Deadlines</p>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead><tr className="bg-slate-50">
              <th className="px-3 py-2 text-left font-semibold text-slate-500">Unit</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-500">Chapter</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-500">Progress</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-500">Revision Due</th>
              <th className="px-3 py-2" />
            </tr></thead>
            <tbody>
              {offering.syllabusChapters.length === 0 ? (
                <tr><td colSpan={5} className="px-3 py-4 text-center text-slate-400">No syllabus chapters mapped</td></tr>
              ) : offering.syllabusChapters.map((ch) => (
                <tr key={ch.id} className="border-t">
                  <td className="px-3 py-2">{ch.unitNumber}</td>
                  <td className="px-3 py-2 font-medium">{ch.chapterTitle}</td>
                  <td className="px-3 py-2">{ch.completionPercent}%</td>
                  <td className="px-3 py-2">
                    {editingChapter === ch.id ? (
                      <input type="date" value={revDate} onChange={(e) => setRevDate(e.target.value)} className={am.input} />
                    ) : (
                      ch.revisionDeadline ? new Date(ch.revisionDeadline).toLocaleDateString('en-IN') : '—'
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {editingChapter === ch.id ? (
                      <button type="button" onClick={() => { onSaveRevision(ch.id, revDate); setEditingChapter(null); }} className="text-teal-600 font-semibold">Save</button>
                    ) : (
                      <button type="button" onClick={() => { setEditingChapter(ch.id); setRevDate(ch.revisionDeadline?.slice(0, 10) || ''); }} className="text-slate-500 hover:text-blue-600"><Pencil size={12} /></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end pt-2 border-t">
        <button type="button" onClick={onClose} className={am.btnSecondary}>Close</button>
      </div>
    </div>
  );
}

export function SubjectManagementView() {
  const [dashboard, setDashboard] = useState<SubjectManagementDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [years, setYears] = useState<string[]>(['2025-26']);
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [detailOffering, setDetailOffering] = useState<SubjectOffering | null>(null);
  const [teacherFilter, setTeacherFilter] = useState('');
  const [form, setForm] = useState({
    subjectName: '', subjectCode: '', subjectType: 'Core', subjectGroup: 'General', isElective: false,
    teachers: [{ ...EMPTY_TEACHER }] as TeacherRow[],
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const meta = await fetchAcademicMeta();
      setYears(meta.academicYears);
      const d = await fetchSubjectManagementDashboard(academicYear);
      setDashboard(d);
    } finally { setLoading(false); }
  }, [academicYear]);

  useEffect(() => { void load(); }, [load]);

  const filteredOfferings = useMemo(() => {
    if (!dashboard) return [];
    if (!teacherFilter.trim()) return dashboard.offerings;
    const q = teacherFilter.toLowerCase();
    return dashboard.offerings.filter((o) =>
      o.teacherName.toLowerCase().includes(q) || o.subjectName.toLowerCase().includes(q));
  }, [dashboard, teacherFilter]);

  const addTeacherRow = () => setForm((f) => ({ ...f, teachers: [...f.teachers, { ...EMPTY_TEACHER }] }));
  const updateTeacherRow = (idx: number, patch: Partial<TeacherRow>) => {
    setForm((f) => ({ ...f, teachers: f.teachers.map((t, i) => (i === idx ? { ...t, ...patch } : t)) }));
  };
  const removeTeacherRow = (idx: number) => {
    setForm((f) => ({ ...f, teachers: f.teachers.filter((_, i) => i !== idx) }));
  };

  const saveSubject = async () => {
    const teachers = form.teachers.filter((t) => t.teacherName && t.className);
    await createAcademicSubject({ ...form, academicYear, teachers });
    setMessage(`Subject "${form.subjectName}" created with ${teachers.length} teacher assignment(s)`);
    setShowForm(false);
    setForm({ subjectName: '', subjectCode: '', subjectType: 'Core', subjectGroup: 'General', isElective: false, teachers: [{ ...EMPTY_TEACHER }] });
    void load();
  };

  const saveChapterRevision = async (chapterId: string, revisionDeadline: string) => {
    await updateSyllabusChapter(chapterId, { revisionDeadline });
    setMessage('Revision deadline updated');
    void load();
    if (detailOffering) {
      const updated = (await fetchSubjectManagementDashboard(academicYear)).offerings.find((o) => o.id === detailOffering.id);
      if (updated) setDetailOffering(updated);
    }
  };

  if (loading && !dashboard) return <AcademicLoading />;

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="Academic Management › Subject Management"
        title="Subject Management"
        subtitle="Subjects with teacher assignments, course deadlines, syllabus revision schedule & progress tracking"
        actions={(
          <button type="button" onClick={() => setShowForm(true)} className={am.btnPrimary}>
            <Plus size={14} /> Add Subject
          </button>
        )}
      />

      <div className={am.content}>
        <AcademicYearTermFilters
          academicYear={academicYear} term="Term 1" years={years} terms={['Term 1', 'Term 2']}
          onYear={setAcademicYear} onTerm={() => {}}
        />

        {message && <div className="mb-4 px-4 py-2 bg-teal-50 text-teal-800 text-sm rounded-lg border border-teal-200">{message}</div>}

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
          {[
            { label: 'Subjects', value: dashboard?.kpis.totalSubjects ?? 0, icon: BookOpen },
            { label: 'Offerings', value: dashboard?.kpis.totalOfferings ?? 0, icon: TrendingUp },
            { label: 'Teachers', value: dashboard?.kpis.teachersAssigned ?? 0, icon: Users },
            { label: 'Multi-Subject', value: dashboard?.kpis.multiSubjectTeachers ?? 0, icon: Users },
            { label: 'On Track', value: dashboard?.kpis.onTrack ?? 0, icon: CheckCircle2 },
            { label: 'Behind', value: dashboard?.kpis.behindSchedule ?? 0, icon: AlertTriangle },
          ].map((k) => (
            <div key={k.label} className={`${am.card} p-3`}>
              <div className="flex items-center gap-2 mb-1">
                <k.icon size={14} className="text-teal-600" />
                <span className="text-[10px] font-bold text-slate-400 uppercase">{k.label}</span>
              </div>
              <p className="text-xl font-black text-slate-800">{k.value}</p>
            </div>
          ))}
        </div>

        {/* Multi-subject teachers */}
        {(dashboard?.teachersMultiSubject?.filter((t) => t.subjectCount > 1).length ?? 0) > 0 && (
          <div className={`${am.card} p-4 mb-4`}>
            <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
              <Users size={14} className="text-indigo-600" /> Teachers Teaching Multiple Subjects
            </h3>
            <div className="flex flex-wrap gap-2">
              {dashboard!.teachersMultiSubject.filter((t) => t.subjectCount > 1).map((t) => (
                <span key={t.teacherName} className="text-xs bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-lg px-3 py-1.5">
                  <strong>{t.teacherName}</strong> — {t.subjects.join(', ')}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3 mb-3">
          <input placeholder="Filter by teacher or subject…" value={teacherFilter} onChange={(e) => setTeacherFilter(e.target.value)} className={`${am.input} max-w-xs`} />
        </div>

        {/* Subject offerings table */}
        <div className={am.tableWrap}>
          <table className="w-full">
            <thead><tr>
              <th className={am.th}>Subject</th>
              <th className={am.th}>Class</th>
              <th className={am.th}>Teacher</th>
              <th className={am.th}>Course Deadline</th>
              <th className={am.th}>Revision Due</th>
              <th className={am.th}>Progress (Current vs Ideal)</th>
              <th className={am.th}>Status</th>
              <th className={am.th}>Actions</th>
            </tr></thead>
            <tbody>
              {filteredOfferings.length === 0 ? (
                <tr><td colSpan={8} className={`${am.td} text-center text-slate-400 py-8`}>No subject offerings. Add a subject with teacher assignments.</td></tr>
              ) : filteredOfferings.map((o) => (
                <tr key={o.id}>
                  <td className={am.td}>
                    <p className="font-semibold text-slate-800">{o.subjectName}</p>
                    <p className="text-[10px] text-slate-400">{o.chapterCount} chapters</p>
                  </td>
                  <td className={am.td}>{o.classGroup}</td>
                  <td className={am.td}>
                    <p className="font-medium">{o.teacherName || '—'}</p>
                    {o.teacherEmail && <p className="text-[10px] text-slate-400">{o.teacherEmail}</p>}
                  </td>
                  <td className={am.td}>
                    {o.courseCompletionDeadline
                      ? <span className="flex items-center gap-1 text-xs"><Calendar size={11} />{new Date(o.courseCompletionDeadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      : '—'}
                  </td>
                  <td className={am.td}>
                    {o.revisionDeadline
                      ? new Date(o.revisionDeadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                      : o.upcomingRevisions[0]?.revisionDeadline
                        ? new Date(o.upcomingRevisions[0].revisionDeadline!).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                        : '—'}
                  </td>
                  <td className={am.td}><ProgressCompare current={o.currentProgress} ideal={o.idealProgress} /></td>
                  <td className={am.td}>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${PROGRESS_STATUS[o.progressStatus]?.className || ''}`}>
                      {PROGRESS_STATUS[o.progressStatus]?.label || o.progressStatus}
                    </span>
                  </td>
                  <td className={am.td}>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => setDetailOffering(o)} className="p-1 text-slate-500 hover:text-teal-600" title="View"><Eye size={14} /></button>
                      <button type="button" onClick={() => void deleteAcademicSubject(o.subjectId).then(load)} className="p-1 text-slate-500 hover:text-red-600" title="Delete subject"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Subject summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
          {(dashboard?.subjects || []).map((s) => (
            <div key={s.id} className={`${am.card} p-4`}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-bold text-slate-800">{s.subjectName}</h4>
                  <p className="text-xs text-slate-500">{s.subjectCode} · {s.subjectType}</p>
                </div>
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{s.offerings.length} classes</span>
              </div>
              <p className="text-xs text-slate-600 mb-2">
                Teachers: {s.teachers.length > 0 ? s.teachers.join(', ') : 'None assigned'}
              </p>
              <ProgressCompare current={s.avgCurrentProgress} ideal={s.avgIdealProgress} />
            </div>
          ))}
        </div>
      </div>

      {/* Add Subject Modal */}
      <AcademicModal open={showForm} onClose={() => setShowForm(false)} title="Add Subject with Teachers" large>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Subject Name *" value={form.subjectName} onChange={(e) => setForm((f) => ({ ...f, subjectName: e.target.value }))} className={am.input} />
            <input placeholder="Subject Code" value={form.subjectCode} onChange={(e) => setForm((f) => ({ ...f, subjectCode: e.target.value }))} className={am.input} />
            <input placeholder="Type (Core/Elective)" value={form.subjectType} onChange={(e) => setForm((f) => ({ ...f, subjectType: e.target.value }))} className={am.input} />
            <input placeholder="Group" value={form.subjectGroup} onChange={(e) => setForm((f) => ({ ...f, subjectGroup: e.target.value }))} className={am.input} />
          </div>

          <div className="border-t pt-3">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-slate-700">Teacher Assignments (a teacher may teach multiple subjects)</p>
              <button type="button" onClick={addTeacherRow} className={am.btnSecondary}><Plus size={12} /> Add Teacher</button>
            </div>
            {form.teachers.map((t, idx) => (
              <div key={idx} className="border border-slate-200 rounded-lg p-3 mb-3 space-y-2 bg-slate-50/50">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500">Assignment {idx + 1}</span>
                  {form.teachers.length > 1 && (
                    <button type="button" onClick={() => removeTeacherRow(idx)} className="text-red-500 text-xs">Remove</button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input placeholder="Teacher Name *" value={t.teacherName} onChange={(e) => updateTeacherRow(idx, { teacherName: e.target.value })} className={am.input} />
                  <input placeholder="Teacher Email" value={t.teacherEmail} onChange={(e) => updateTeacherRow(idx, { teacherEmail: e.target.value })} className={am.input} />
                  <input placeholder="Teacher Phone" value={t.teacherPhone} onChange={(e) => updateTeacherRow(idx, { teacherPhone: e.target.value })} className={am.input} />
                  <input placeholder="Class *" value={t.className} onChange={(e) => updateTeacherRow(idx, { className: e.target.value })} className={am.input} />
                  <input placeholder="Section *" value={t.sectionName} onChange={(e) => updateTeacherRow(idx, { sectionName: e.target.value })} className={am.input} />
                  <input type="date" placeholder="Course Start" value={t.courseStartDate} onChange={(e) => updateTeacherRow(idx, { courseStartDate: e.target.value })} className={am.input} />
                  <input type="date" placeholder="Course Completion Deadline" value={t.courseCompletionDeadline} onChange={(e) => updateTeacherRow(idx, { courseCompletionDeadline: e.target.value })} className={am.input} />
                  <input type="date" placeholder="Revision Deadline" value={t.revisionDeadline} onChange={(e) => updateTeacherRow(idx, { revisionDeadline: e.target.value })} className={am.input} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t mt-3">
          <button type="button" onClick={() => setShowForm(false)} className={am.btnSecondary}>Cancel</button>
          <button type="button" onClick={() => void saveSubject()} className={am.btnPrimary} disabled={!form.subjectName.trim()}>Save Subject</button>
        </div>
      </AcademicModal>

      <AcademicModal open={!!detailOffering} onClose={() => setDetailOffering(null)} title="Subject Offering Details" large>
        {detailOffering && (
          <OfferingDetail
            offering={detailOffering}
            onClose={() => setDetailOffering(null)}
            onSaveRevision={(id, date) => void saveChapterRevision(id, date)}
          />
        )}
      </AcademicModal>
    </AcademicPageShell>
  );
}
