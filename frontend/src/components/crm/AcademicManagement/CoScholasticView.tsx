import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus, Eye, Send, Smartphone, Trophy, Users, Star, ClipboardList, Dumbbell, Palette, Heart, CheckCircle2,
} from 'lucide-react';
import {
  createCoScholastic, fetchAcademicMeta, fetchCoScholasticDashboard, fetchCoScholasticDetail,
  publishCoScholasticActivities, recordCoScholasticPerformances,
  type CoScholasticActivity, type CoScholasticDashboard, type CoScholasticPerformance,
} from '../../../lib/academicServices';
import { fetchStudents } from '../../../lib/studentServices';
import {
  AcademicLoading, AcademicModal, AcademicPageHeader, AcademicPageShell,
  AcademicYearTermFilters, am,
} from './AcademicManagementUi';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  PHYSICAL_HEALTH: <Dumbbell size={14} className="text-orange-600" />,
  WORK_EDUCATION: <ClipboardList size={14} className="text-teal-600" />,
  VISUAL_PERFORMING_ARTS: <Palette size={14} className="text-purple-600" />,
  LEADERSHIP_COMMUNITY: <Heart size={14} className="text-rose-600" />,
};

const STATUS_STYLES: Record<string, string> = {
  PLANNED: 'bg-slate-100 text-slate-600',
  SCHEDULED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-amber-100 text-amber-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

const BAND_STYLES: Record<string, string> = {
  EXCELLENT: 'bg-green-100 text-green-800',
  GOOD: 'bg-blue-100 text-blue-800',
  AVERAGE: 'bg-amber-100 text-amber-800',
  NEEDS_IMPROVEMENT: 'bg-red-100 text-red-800',
};

const EMPTY_FORM = {
  title: '', category: 'PHYSICAL_HEALTH', subCategory: '', activityType: '',
  className: '', sectionName: '', teacherName: '', coTeacherName: '',
  activityDate: '', startDate: '', endDate: '', venue: '', description: '',
  measurementCriteria: '', maxScore: 100, term: 'Term 1',
};

function ActivityDetail({
  activity, performances, onClose, onRecordPerformance,
}: {
  activity: CoScholasticActivity;
  performances: CoScholasticPerformance[];
  onClose: () => void;
  onRecordPerformance: () => void;
}) {
  return (
    <div className="space-y-4 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-lg font-bold text-slate-900">{activity.title}</h4>
          <p className="text-xs text-slate-500 mt-1">
            {activity.categoryLabel} · {activity.subCategoryLabel} · {activity.activityType}
          </p>
        </div>
        <span className={`text-xs font-bold px-2 py-1 rounded ${STATUS_STYLES[activity.status] || ''}`}>
          {activity.statusLabel}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg">
        <div><p className="text-[10px] font-bold text-slate-400 uppercase">Class</p><p className="font-semibold">{activity.classGroup}</p></div>
        <div><p className="text-[10px] font-bold text-slate-400 uppercase">Teacher</p><p className="font-semibold">{activity.teacherName || '—'}</p></div>
        <div><p className="text-[10px] font-bold text-slate-400 uppercase">Date</p><p className="font-semibold">{new Date(activity.activityDate).toLocaleDateString('en-IN')}</p></div>
        <div><p className="text-[10px] font-bold text-slate-400 uppercase">Venue</p><p className="font-semibold">{activity.venue || '—'}</p></div>
        <div><p className="text-[10px] font-bold text-slate-400 uppercase">Max Score</p><p className="font-semibold">{activity.maxScore}</p></div>
        <div><p className="text-[10px] font-bold text-slate-400 uppercase">Mobile</p><p className="font-semibold flex items-center gap-1">{activity.isPublished ? <><Smartphone size={12} className="text-green-600" /> Published</> : 'Draft'}</p></div>
      </div>

      {activity.measurementCriteria && (
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Performance Measurement Criteria</p>
          <p className="text-slate-700 bg-white border rounded-lg p-3">{activity.measurementCriteria}</p>
        </div>
      )}

      {activity.description && (
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Description</p>
          <p className="text-slate-700">{activity.description}</p>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-slate-500 uppercase">Student Performances ({performances.length})</p>
          <button type="button" onClick={onRecordPerformance} className={am.btnSecondary}><Trophy size={12} /> Record Performance</button>
        </div>
        {performances.length === 0 ? (
          <p className="text-center text-slate-400 py-4 text-xs">No performances recorded yet. Teachers record via mobile app or dashboard.</p>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead><tr className="bg-slate-50">
                <th className="px-3 py-2 text-left font-semibold text-slate-500">Student</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-500">Class</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-500">Score</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-500">Grade</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-500">Band</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-500">Remarks</th>
              </tr></thead>
              <tbody>
                {performances.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="px-3 py-2 font-medium">{p.studentName}</td>
                    <td className="px-3 py-2">{p.classGroup}</td>
                    <td className="px-3 py-2 font-bold">{p.performanceScore}</td>
                    <td className="px-3 py-2">{p.performanceGrade}</td>
                    <td className="px-3 py-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${BAND_STYLES[p.performanceBand] || ''}`}>
                        {p.performanceBandLabel}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-500">{p.remarks || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className={`${am.card} p-3 bg-indigo-50 border-indigo-100`}>
        <p className="text-xs font-bold text-indigo-700 mb-1">Mobile App Access</p>
        <ul className="text-xs text-indigo-600 space-y-0.5">
          <li>• <strong>Teacher:</strong> Record student performance scores</li>
          <li>• <strong>Student:</strong> View activities & own performance</li>
          <li>• <strong>Parent:</strong> View child&apos;s performance & submit feedback</li>
        </ul>
      </div>

      <div className="flex justify-end pt-2 border-t">
        <button type="button" onClick={onClose} className={am.btnSecondary}>Close</button>
      </div>
    </div>
  );
}

export function CoScholasticView() {
  const [dashboard, setDashboard] = useState<CoScholasticDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [years, setYears] = useState<string[]>(['2025-26']);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [detail, setDetail] = useState<{ activity: CoScholasticActivity; performances: CoScholasticPerformance[] } | null>(null);
  const [showPerfForm, setShowPerfForm] = useState(false);
  const [perfRows, setPerfRows] = useState<{ studentId: string; fullName: string; marks: string; remarks: string }[]>([]);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const meta = await fetchAcademicMeta();
      setYears(meta.academicYears);
      const d = await fetchCoScholasticDashboard({ academicYear, category: categoryFilter || undefined });
      setDashboard(d);
    } finally { setLoading(false); }
  }, [academicYear, categoryFilter]);

  useEffect(() => { void load(); }, [load]);

  const selectedCategory = useMemo(
    () => dashboard?.categories.find((c) => c.id === form.category),
    [dashboard, form.category],
  );
  const selectedSubCategory = useMemo(
    () => selectedCategory?.subCategories.find((s) => s.id === form.subCategory),
    [selectedCategory, form.subCategory],
  );

  const filteredActivities = useMemo(() => {
    if (!dashboard) return [];
    if (!categoryFilter) return dashboard.activities;
    return dashboard.activities.filter((a) => a.category === categoryFilter);
  }, [dashboard, categoryFilter]);

  const openDetail = async (activity: CoScholasticActivity) => {
    const d = await fetchCoScholasticDetail(activity.id);
    setDetail({ activity: d.activity, performances: d.performances });
  };

  const openPerfForm = async () => {
    if (!detail) return;
    const className = detail.activity.className;
    const sectionName = detail.activity.sectionName;
    const res = await fetchStudents({ className: className || undefined, sectionName: sectionName || undefined, pageSize: 50, viewAll: true });
    setPerfRows(res.students.map((s) => ({
      studentId: s.id,
      fullName: s.fullName,
      marks: '',
      remarks: '',
    })));
    setShowPerfForm(true);
  };

  const saveActivity = async () => {
    await createCoScholastic({ ...form, academicYear });
    setMessage(`Activity "${form.title}" planned successfully`);
    setShowForm(false);
    setForm({ ...EMPTY_FORM });
    void load();
  };

  const savePerformances = async () => {
    if (!detail) return;
    const performances = perfRows
      .filter((r) => r.marks !== '')
      .map((r) => ({
        studentId: r.studentId,
        studentName: r.fullName,
        className: detail.activity.className,
        sectionName: detail.activity.sectionName,
        performanceScore: Number(r.marks),
        remarks: r.remarks,
      }));
    if (performances.length === 0) return;
    await recordCoScholasticPerformances(detail.activity.id, {
      recordedBy: detail.activity.teacherName || 'Academic Coordinator',
      performances,
    });
    setMessage(`Recorded ${performances.length} performance(s)`);
    setShowPerfForm(false);
    const d = await fetchCoScholasticDetail(detail.activity.id);
    setDetail({ activity: d.activity, performances: d.performances });
    void load();
  };

  const handlePublish = async () => {
    setBusy(true);
    try {
      const r = await publishCoScholasticActivities({ academicYear });
      setMessage(`Published ${r.published} activities to mobile apps`);
      void load();
    } finally { setBusy(false); }
  };

  if (loading && !dashboard) return <AcademicLoading />;

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="Academic Management › Co-Scholastic Activities"
        title="Co-Scholastic Activities"
        subtitle="Plan sports, arts, life skills & community activities with performance measurement for mobile"
        actions={(
          <div className="flex gap-2">
            <button type="button" onClick={() => void handlePublish()} disabled={busy} className={am.btnSecondary}>
              <Send size={14} /> Publish to Mobile
            </button>
            <button type="button" onClick={() => setShowForm(true)} className={am.btnPrimary}>
              <Plus size={14} /> Plan Activity
            </button>
          </div>
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
            { label: 'Total', value: dashboard?.kpis.totalActivities ?? 0, icon: ClipboardList },
            { label: 'Planned', value: dashboard?.kpis.planned ?? 0, icon: Star },
            { label: 'In Progress', value: dashboard?.kpis.inProgress ?? 0, icon: Trophy },
            { label: 'Completed', value: dashboard?.kpis.completed ?? 0, icon: CheckCircle2 },
            { label: 'Published', value: dashboard?.kpis.published ?? 0, icon: Smartphone },
            { label: 'Performances', value: dashboard?.kpis.performancesRecorded ?? 0, icon: Users },
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

        {/* Category tabs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
          <button
            type="button"
            onClick={() => setCategoryFilter('')}
            className={`p-3 rounded-lg border text-left transition-all ${!categoryFilter ? 'border-teal-500 bg-teal-50 ring-1 ring-teal-200' : 'border-slate-200 hover:bg-slate-50'}`}
          >
            <p className="text-xs font-bold text-slate-700">All Categories</p>
            <p className="text-lg font-black text-slate-800">{dashboard?.activities.length ?? 0}</p>
          </button>
          {(dashboard?.byCategory || []).map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoryFilter(cat.id)}
              className={`p-3 rounded-lg border text-left transition-all ${categoryFilter === cat.id ? 'border-teal-500 bg-teal-50 ring-1 ring-teal-200' : 'border-slate-200 hover:bg-slate-50'}`}
            >
              <div className="flex items-center gap-1.5 mb-1">{CATEGORY_ICONS[cat.id]}<p className="text-[10px] font-bold text-slate-600 line-clamp-1">{cat.label}</p></div>
              <p className="text-lg font-black text-slate-800">{cat.count}</p>
            </button>
          ))}
        </div>

        {/* Activities table */}
        <div className={am.tableWrap}>
          <table className="w-full">
            <thead><tr>
              <th className={am.th}>Activity</th>
              <th className={am.th}>Category</th>
              <th className={am.th}>Class</th>
              <th className={am.th}>Teacher</th>
              <th className={am.th}>Date</th>
              <th className={am.th}>Performances</th>
              <th className={am.th}>Avg Score</th>
              <th className={am.th}>Status</th>
              <th className={am.th}>Actions</th>
            </tr></thead>
            <tbody>
              {filteredActivities.length === 0 ? (
                <tr><td colSpan={9} className={`${am.td} text-center text-slate-400 py-8`}>No activities planned. Click &quot;Plan Activity&quot; to get started.</td></tr>
              ) : filteredActivities.map((a) => (
                <tr key={a.id}>
                  <td className={am.td}>
                    <p className="font-semibold text-slate-800">{a.title}</p>
                    <p className="text-[10px] text-slate-400">{a.activityType}</p>
                  </td>
                  <td className={am.td}>
                    <p className="text-xs">{a.subCategoryLabel}</p>
                  </td>
                  <td className={am.td}>{a.classGroup}</td>
                  <td className={am.td}>{a.teacherName || '—'}</td>
                  <td className={am.td}>{new Date(a.activityDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
                  <td className={am.td}>{a.performanceCount}</td>
                  <td className={am.td}>{a.avgPerformanceScore > 0 ? a.avgPerformanceScore.toFixed(0) : '—'}</td>
                  <td className={am.td}>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${STATUS_STYLES[a.status] || ''}`}>{a.statusLabel}</span>
                    {a.isPublished && <Smartphone size={11} className="inline ml-1 text-green-600" />}
                  </td>
                  <td className={am.td}>
                    <button type="button" onClick={() => void openDetail(a)} className="p-1 text-slate-500 hover:text-teal-600"><Eye size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Plan Activity Modal */}
      <AcademicModal open={showForm} onClose={() => setShowForm(false)} title="Plan Co-Scholastic Activity" large>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          <input placeholder="Activity Title *" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className={am.input} />

          <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value, subCategory: '', activityType: '' }))} className={am.input}>
            {(dashboard?.categories || []).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>

          <select value={form.subCategory} onChange={(e) => setForm((f) => ({ ...f, subCategory: e.target.value, activityType: '' }))} className={am.input}>
            <option value="">Select Sub-Category</option>
            {(selectedCategory?.subCategories || []).map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>

          <select value={form.activityType} onChange={(e) => setForm((f) => ({ ...f, activityType: e.target.value }))} className={am.input}>
            <option value="">Select Activity Type</option>
            {(selectedSubCategory?.activities || []).map((a) => <option key={a} value={a}>{a}</option>)}
          </select>

          <div className="grid grid-cols-2 gap-2">
            <input placeholder="Class" value={form.className} onChange={(e) => setForm((f) => ({ ...f, className: e.target.value }))} className={am.input} />
            <input placeholder="Section" value={form.sectionName} onChange={(e) => setForm((f) => ({ ...f, sectionName: e.target.value }))} className={am.input} />
            <input placeholder="Teacher In-Charge" value={form.teacherName} onChange={(e) => setForm((f) => ({ ...f, teacherName: e.target.value }))} className={am.input} />
            <input placeholder="Co-Teacher" value={form.coTeacherName} onChange={(e) => setForm((f) => ({ ...f, coTeacherName: e.target.value }))} className={am.input} />
            <input type="date" value={form.activityDate} onChange={(e) => setForm((f) => ({ ...f, activityDate: e.target.value }))} className={am.input} />
            <input placeholder="Venue" value={form.venue} onChange={(e) => setForm((f) => ({ ...f, venue: e.target.value }))} className={am.input} />
            <input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} className={am.input} title="Plan Start Date" />
            <input type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} className={am.input} title="Plan End Date" />
          </div>

          <textarea placeholder="Performance Measurement Criteria (how students will be evaluated)" value={form.measurementCriteria} onChange={(e) => setForm((f) => ({ ...f, measurementCriteria: e.target.value }))} className={am.input} rows={2} />
          <textarea placeholder="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className={am.input} rows={2} />
          <input type="number" placeholder="Max Score" value={form.maxScore} onChange={(e) => setForm((f) => ({ ...f, maxScore: Number(e.target.value) }))} className={am.input} />
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t mt-3">
          <button type="button" onClick={() => setShowForm(false)} className={am.btnSecondary}>Cancel</button>
          <button type="button" onClick={() => void saveActivity()} className={am.btnPrimary} disabled={!form.title.trim() || !form.activityDate}>Save Activity</button>
        </div>
      </AcademicModal>

      {/* Detail Modal */}
      <AcademicModal open={!!detail} onClose={() => setDetail(null)} title="Activity Details" large>
        {detail && (
          <ActivityDetail
            activity={detail.activity}
            performances={detail.performances}
            onClose={() => setDetail(null)}
            onRecordPerformance={() => void openPerfForm()}
          />
        )}
      </AcademicModal>

      {/* Record Performance Modal */}
      <AcademicModal open={showPerfForm} onClose={() => setShowPerfForm(false)} title="Record Student Performance" large>
        <div className="max-h-[50vh] overflow-y-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-50">
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Student</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 w-24">Score</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Remarks</th>
            </tr></thead>
            <tbody>
              {perfRows.map((r, i) => (
                <tr key={r.studentId} className="border-t">
                  <td className="px-3 py-2 font-medium">{r.fullName}</td>
                  <td className="px-3 py-2">
                    <input type="number" min={0} max={detail?.activity.maxScore || 100} value={r.marks}
                      onChange={(e) => setPerfRows((rows) => rows.map((row, j) => j === i ? { ...row, marks: e.target.value } : row))}
                      className={`${am.input} w-20`} placeholder="0" />
                  </td>
                  <td className="px-3 py-2">
                    <input value={r.remarks} onChange={(e) => setPerfRows((rows) => rows.map((row, j) => j === i ? { ...row, remarks: e.target.value } : row))}
                      className={am.input} placeholder="Optional remarks" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t mt-3">
          <button type="button" onClick={() => setShowPerfForm(false)} className={am.btnSecondary}>Cancel</button>
          <button type="button" onClick={() => void savePerformances()} className={am.btnPrimary}>Save Performances</button>
        </div>
      </AcademicModal>
    </AcademicPageShell>
  );
}
