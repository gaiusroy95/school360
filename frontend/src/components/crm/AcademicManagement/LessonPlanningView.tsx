import { useCallback, useEffect, useState } from 'react';
import {
  Plus, Share2, ClipboardCheck, BarChart3, Pencil, Eye,
} from 'lucide-react';
import {
  BLOOMS_LABELS, BLOOMS_LEVELS, createClassTestForLessonPlan, createLessonPlan,
  fetchLessonPlanDetail, fetchLessonPlans, submitClassTestScores, updateLessonPlan, type LessonPlan,
} from '../../../lib/academicServices';
import { fetchStudents } from '../../../lib/studentServices';
import {
  AcademicLoading, AcademicModal, AcademicPageHeader, AcademicPageShell,
  AcademicYearTermFilters, am,
} from './AcademicManagementUi';

const BUCKET_COLORS = {
  excellent: 'bg-green-100 text-green-800 border-green-200',
  good: 'bg-blue-100 text-blue-800 border-blue-200',
  average: 'bg-amber-100 text-amber-800 border-amber-200',
  below: 'bg-red-100 text-red-800 border-red-200',
};

const EMPTY_FORM = {
  title: '', className: '', sectionName: '', subjectName: '', teacherName: '', department: 'General',
  objective: '', teachingMethod: '', propsUsed: '', bloomsLevel: 'UNDERSTAND' as const,
  resultMeasurement: '', plannedDate: '', notes: '', createClassTest: true,
};

export function LessonPlanningView() {
  const [records, setRecords] = useState<LessonPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [className, setClassName] = useState('');
  const [sectionName, setSectionName] = useState('');
  const [meta, setMeta] = useState<{ academicYears: string[]; classes: string[]; sectionsByClass: Record<string, string[]>; terms: string[] } | null>(null);
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof fetchLessonPlanDetail>>['record'] | null>(null);
  const [showScores, setShowScores] = useState(false);
  const [scoreRows, setScoreRows] = useState<{ studentId: string; fullName: string; marks: string }[]>([]);
  const [activeTestId, setActiveTestId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchLessonPlans(academicYear, { className: className || undefined, sectionName: sectionName || undefined });
      setRecords(res.records);
    } finally { setLoading(false); }
  }, [academicYear, className, sectionName]);

  useEffect(() => { void load(); }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, className, sectionName });
    setShowForm(true);
  };

  const openEdit = (r: LessonPlan) => {
    setEditingId(r.id);
    setForm({
      title: r.title, className: r.className, sectionName: r.sectionName, subjectName: r.subjectName,
      teacherName: r.teacherName, department: r.department, objective: r.objective || '',
      teachingMethod: r.teachingMethod || '', propsUsed: r.propsUsed || '',
      bloomsLevel: (r.bloomsLevel as typeof form.bloomsLevel) || 'UNDERSTAND',
      resultMeasurement: r.resultMeasurement || '', plannedDate: r.plannedDate?.slice(0, 10) || '',
      notes: r.notes || '', createClassTest: false,
    });
    setShowForm(true);
  };

  const savePlan = async () => {
    const payload = { ...form, academicYear, share: true };
    if (editingId) {
      await updateLessonPlan(editingId, payload);
      setMessage('Lesson plan updated');
    } else {
      await createLessonPlan(payload);
      setMessage('Lesson plan created' + (form.createClassTest ? ' with linked class test' : ''));
    }
    setShowForm(false);
    void load();
  };

  const viewDetail = async (id: string) => {
    const res = await fetchLessonPlanDetail(id);
    setDetail(res.record);
  };

  const createTest = async (planId: string) => {
    await createClassTestForLessonPlan(planId);
    setMessage('Class test created and synced to Examination Management');
    void load();
    if (detail?.id === planId) void viewDetail(planId);
  };

  const openScoreEntry = async (plan: LessonPlan) => {
    if (!plan.classTestId) {
      await createClassTestForLessonPlan(plan.id);
      void load();
    }
    const testId = plan.classTestId || (await fetchLessonPlanDetail(plan.id)).record.classTest?.id;
    if (!testId) return;
    setActiveTestId(testId);
    const students = await fetchStudents({ className: plan.className, sectionName: plan.sectionName, viewAll: true, pageSize: 200 });
    const existing = await fetchLessonPlanDetail(plan.id);
    const scoreMap = new Map((existing.record.scores || []).map((s) => [s.studentId, String(s.marksObtained)]));
    setScoreRows(students.students.map((s) => ({ studentId: s.id, fullName: s.fullName, marks: scoreMap.get(s.id) || '' })));
    setShowScores(true);
  };

  const saveScores = async () => {
    if (!activeTestId) return;
    const scores = scoreRows.filter((r) => r.marks !== '').map((r) => ({ studentId: r.studentId, marksObtained: Number(r.marks) }));
    const res = await submitClassTestScores(activeTestId, scores);
    setMessage(`Scores saved — ${res.upserted} students. Results synced to mobile analytics.`);
    setShowScores(false);
    void load();
  };

  if (loading && !records.length) return <AcademicLoading label="Loading lesson plans…" />;

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="Academic Management › Lesson Planning"
        title="Lesson Planning"
        subtitle="Plan lessons with objectives, Bloom's taxonomy, teaching methods — link class tests and track result buckets"
        actions={<button type="button" onClick={openCreate} className={am.btnPrimary}><Plus size={14} /> New Lesson Plan</button>}
      />
      <div className={am.content}>
        {message && <p className={am.message}>{message}</p>}

        <AcademicYearTermFilters
          academicYear={academicYear} term="Term 1" years={meta?.academicYears || [academicYear]} terms={['Term 1', 'Term 2']}
          onYear={setAcademicYear} onTerm={() => {}} className={className} sectionName={sectionName}
          classes={meta?.classes} sections={className ? meta?.sectionsByClass[className] : []}
          onClass={(v) => { setClassName(v); setSectionName(''); }} onSection={setSectionName}
        />

        <div className={am.tableWrap}>
          <table className="w-full">
            <thead><tr>
              <th className={am.th}>Title</th><th className={am.th}>Class</th><th className={am.th}>Subject</th>
              <th className={am.th}>Teacher</th><th className={am.th}>Bloom&apos;s</th><th className={am.th}>Class Test</th>
              <th className={am.th}>Results</th><th className={am.th}>Status</th><th className={am.th} />
            </tr></thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id}>
                  <td className={am.td}><span className="font-semibold">{r.title}</span></td>
                  <td className={am.td}>{r.classGroup}</td>
                  <td className={am.td}>{r.subjectName}</td>
                  <td className={am.td}>{r.teacherName || '—'}</td>
                  <td className={am.td}><span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded font-bold">{BLOOMS_LABELS[r.bloomsLevel as keyof typeof BLOOMS_LABELS] || r.bloomsLevel}</span></td>
                  <td className={am.td}>
                    {r.hasClassTest ? <span className="text-xs text-green-600 font-bold">Linked</span> : (
                      <button type="button" className="text-xs text-indigo-600" onClick={() => void createTest(r.id)}>Create Test</button>
                    )}
                  </td>
                  <td className={am.td}>
                    {r.resultBuckets ? (
                      <div className="flex flex-wrap gap-1">
                        {r.resultBuckets.excellent > 0 && <span className={`text-[10px] px-1.5 py-0.5 rounded border ${BUCKET_COLORS.excellent}`}>80–100%: {r.resultBuckets.excellent}</span>}
                        {r.resultBuckets.good > 0 && <span className={`text-[10px] px-1.5 py-0.5 rounded border ${BUCKET_COLORS.good}`}>60–79%: {r.resultBuckets.good}</span>}
                        {r.resultBuckets.average > 0 && <span className={`text-[10px] px-1.5 py-0.5 rounded border ${BUCKET_COLORS.average}`}>36–59%: {r.resultBuckets.average}</span>}
                        {r.resultBuckets.below > 0 && <span className={`text-[10px] px-1.5 py-0.5 rounded border ${BUCKET_COLORS.below}`}>&lt;36%: {r.resultBuckets.below}</span>}
                        {!r.resultBuckets.excellent && !r.resultBuckets.good && !r.resultBuckets.average && !r.resultBuckets.below && <span className="text-xs text-slate-400">No scores</span>}
                      </div>
                    ) : '—'}
                  </td>
                  <td className={am.td}><span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100">{r.statusLabel}</span></td>
                  <td className={am.td}>
                    <div className="flex gap-2">
                      <button type="button" title="View" onClick={() => void viewDetail(r.id)} className="text-slate-600"><Eye size={14} /></button>
                      <button type="button" title="Edit" onClick={() => openEdit(r)} className="text-indigo-600"><Pencil size={14} /></button>
                      {r.hasClassTest && <button type="button" title="Enter Scores" onClick={() => void openScoreEntry(r)} className="text-green-600"><ClipboardCheck size={14} /></button>}
                      {!r.sharedAt && <button type="button" title="Share" onClick={() => void updateLessonPlan(r.id, { share: true }).then(load)} className="text-indigo-600"><Share2 size={14} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AcademicModal open={showForm} onClose={() => setShowForm(false)} title={editingId ? 'Edit Lesson Plan' : 'New Lesson Plan'} large>
        <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto">
          <input placeholder="Lesson Title *" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className={`${am.input} col-span-2`} />
          <input placeholder="Class *" value={form.className} onChange={(e) => setForm((f) => ({ ...f, className: e.target.value }))} className={am.input} />
          <input placeholder="Section *" value={form.sectionName} onChange={(e) => setForm((f) => ({ ...f, sectionName: e.target.value }))} className={am.input} />
          <input placeholder="Subject *" value={form.subjectName} onChange={(e) => setForm((f) => ({ ...f, subjectName: e.target.value }))} className={am.input} />
          <input placeholder="Teacher" value={form.teacherName} onChange={(e) => setForm((f) => ({ ...f, teacherName: e.target.value }))} className={am.input} />
          <textarea placeholder="Learning Objective *" value={form.objective} onChange={(e) => setForm((f) => ({ ...f, objective: e.target.value }))} className={`${am.input} col-span-2`} rows={2} />
          <input placeholder="Teaching Method (e.g. Demonstration, Group Discussion)" value={form.teachingMethod} onChange={(e) => setForm((f) => ({ ...f, teachingMethod: e.target.value }))} className={`${am.input} col-span-2`} />
          <input placeholder="Props / Aids Used (e.g. Whiteboard, Models, Projector)" value={form.propsUsed} onChange={(e) => setForm((f) => ({ ...f, propsUsed: e.target.value }))} className={`${am.input} col-span-2`} />
          <label className="text-xs space-y-1">
            <span className="font-semibold text-slate-600">Bloom&apos;s Taxonomy Level</span>
            <select value={form.bloomsLevel} onChange={(e) => setForm((f) => ({ ...f, bloomsLevel: e.target.value as typeof f.bloomsLevel }))} className={am.input}>
              {BLOOMS_LEVELS.map((l) => <option key={l} value={l}>{BLOOMS_LABELS[l]}</option>)}
            </select>
          </label>
          <input type="date" value={form.plannedDate} onChange={(e) => setForm((f) => ({ ...f, plannedDate: e.target.value }))} className={am.input} />
          <textarea placeholder="Result Measurement (how success will be measured)" value={form.resultMeasurement} onChange={(e) => setForm((f) => ({ ...f, resultMeasurement: e.target.value }))} className={`${am.input} col-span-2`} rows={2} />
          <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className={`${am.input} col-span-2`} rows={2} />
          {!editingId && (
            <label className="col-span-2 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.createClassTest} onChange={(e) => setForm((f) => ({ ...f, createClassTest: e.target.checked }))} />
              Auto-create Class Test (syncs to Examination Management → Marks Entry)
            </label>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={() => setShowForm(false)} className={am.btnSecondary}>Cancel</button>
          <button type="button" onClick={() => void savePlan()} className={am.btnPrimary}>{editingId ? 'Update' : 'Create & Share'}</button>
        </div>
      </AcademicModal>

      <AcademicModal open={!!detail} onClose={() => setDetail(null)} title="Lesson Plan Detail" large>
        {detail && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <p><span className="text-slate-500">Class:</span> <strong>{detail.classGroup}</strong></p>
              <p><span className="text-slate-500">Subject:</span> <strong>{detail.subjectName}</strong></p>
              <p><span className="text-slate-500">Teacher:</span> <strong>{detail.teacherName}</strong></p>
              <p><span className="text-slate-500">Bloom&apos;s:</span> <strong>{BLOOMS_LABELS[detail.bloomsLevel as keyof typeof BLOOMS_LABELS]}</strong></p>
            </div>
            <div><p className="text-slate-500 text-xs font-bold uppercase">Objective</p><p>{detail.objective || '—'}</p></div>
            <div><p className="text-slate-500 text-xs font-bold uppercase">Method</p><p>{detail.teachingMethod || '—'}</p></div>
            <div><p className="text-slate-500 text-xs font-bold uppercase">Props Used</p><p>{detail.propsUsed || '—'}</p></div>
            <div><p className="text-slate-500 text-xs font-bold uppercase">Result Measurement</p><p>{detail.resultMeasurement || '—'}</p></div>
            {detail.classTest && (
              <div className={`${am.card} p-4 space-y-2`}>
                <h4 className="font-bold flex items-center gap-2"><BarChart3 size={16} /> Class Test Results</h4>
                <p className="text-xs text-slate-500">{detail.classTest.title}</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className={`p-2 rounded border ${BUCKET_COLORS.excellent}`}>80%–100%: <strong>{detail.classTest.resultBuckets.excellent}</strong> students</div>
                  <div className={`p-2 rounded border ${BUCKET_COLORS.good}`}>60%–79.99%: <strong>{detail.classTest.resultBuckets.good}</strong> students</div>
                  <div className={`p-2 rounded border ${BUCKET_COLORS.average}`}>36%–59.99%: <strong>{detail.classTest.resultBuckets.average}</strong> students</div>
                  <div className={`p-2 rounded border ${BUCKET_COLORS.below}`}>Below 36%: <strong>{detail.classTest.resultBuckets.below}</strong> students</div>
                </div>
                <p className="text-xs text-slate-500">Avg: {detail.classTest.resultBuckets.avgPercentage}% · Synced to student & parent mobile analytics</p>
              </div>
            )}
          </div>
        )}
      </AcademicModal>

      <AcademicModal open={showScores} onClose={() => setShowScores(false)} title="Enter Class Test Scores" large>
        <p className="text-xs text-slate-500 mb-2">Scores auto-bucket into 80–100%, 60–79.99%, 36–59.99%, and below 36%. Results sync to mobile analytics.</p>
        <div className="max-h-64 overflow-y-auto space-y-1">
          {scoreRows.map((r) => (
            <div key={r.studentId} className="flex items-center gap-2 text-sm">
              <span className="flex-1">{r.fullName}</span>
              <input type="number" min={0} max={100} value={r.marks} onChange={(e) => setScoreRows((rows) => rows.map((x) => x.studentId === r.studentId ? { ...x, marks: e.target.value } : x))} className={`${am.input} w-20`} placeholder="Marks" />
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={() => setShowScores(false)} className={am.btnSecondary}>Cancel</button>
          <button type="button" onClick={() => void saveScores()} className={am.btnPrimary}>Save & Publish to Mobile</button>
        </div>
      </AcademicModal>
    </AcademicPageShell>
  );
}
