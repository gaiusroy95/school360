import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus, AlertTriangle, BookOpen, GraduationCap, Layers, Users, FileText,
  BrainCircuit, Share2, Link as LinkIcon, CheckCircle,
} from 'lucide-react';
import {
  bulkAssignElectives, createLessonPlan, createSyllabusChapter, fetchAcademicMeta,
  fetchAcademicSubjects, fetchClassSections, fetchCurriculumAnalytics, fetchCurriculumFramework,
  fetchCurriculumTeacherWorkload, fetchElectives, fetchLessonPlans, fetchSyllabus,
  fetchTimetableConflicts, saveCurriculumFramework, updateLessonPlan, updateSyllabusChapter,
  type CurriculumAnalytics, type CurriculumFramework, type LessonPlan, type SyllabusChapter,
} from '../../../lib/academicServices';
import { fetchStudents } from '../../../lib/studentServices';
import {
  AcademicLoading, AcademicModal, AcademicPageHeader, AcademicPageShell,
  AcademicYearTermFilters, am,
} from './AcademicManagementUi';

type TabId = 'framework' | 'grades' | 'subjects' | 'syllabus' | 'teachers' | 'lessons' | 'analytics';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'framework', label: 'Board & Framework', icon: <BookOpen size={14} /> },
  { id: 'grades', label: 'Grade Levels', icon: <Layers size={14} /> },
  { id: 'subjects', label: 'Subjects', icon: <GraduationCap size={14} /> },
  { id: 'syllabus', label: 'Syllabus Map', icon: <FileText size={14} /> },
  { id: 'teachers', label: 'Teacher Allocation', icon: <Users size={14} /> },
  { id: 'lessons', label: 'Lesson Plans & LMS', icon: <Share2 size={14} /> },
  { id: 'analytics', label: 'Analytics & Alerts', icon: <BrainCircuit size={14} /> },
];

const SEV_COLOR = { high: 'text-red-700 bg-red-50 border-red-200', medium: 'text-amber-800 bg-amber-50 border-amber-200', low: 'text-blue-700 bg-blue-50 border-blue-200' };

export function CurriculumSyllabusView() {
  const [tab, setTab] = useState<TabId>('framework');
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [term, setTerm] = useState('Term 1');
  const [className, setClassName] = useState('');
  const [sectionName, setSectionName] = useState('');
  const [meta, setMeta] = useState<{ academicYears: string[]; classes: string[]; sectionsByClass: Record<string, string[]>; terms: string[] } | null>(null);
  const [message, setMessage] = useState('');

  const [framework, setFramework] = useState<CurriculumFramework | null>(null);
  const [instFramework, setInstFramework] = useState<Record<string, string>>({});
  const [classSections, setClassSections] = useState<{ className: string; sectionName: string; classGroup: string; capacity: number; classTeacher: string }[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; subjectName: string; subjectType: string; isElective: boolean; subjectCode: string }[]>([]);
  const [chapters, setChapters] = useState<SyllabusChapter[]>([]);
  const [analytics, setAnalytics] = useState<CurriculumAnalytics | null>(null);
  const [teachers, setTeachers] = useState<{ teacherName: string; periodsPerWeek: number; isOverloaded: boolean; workloadLevel: string }[]>([]);
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [conflicts, setConflicts] = useState<{ message: string; details: string }[]>([]);
  const [electives, setElectives] = useState<Record<string, unknown>[]>([]);

  const [showChapterForm, setShowChapterForm] = useState(false);
  const [chapterForm, setChapterForm] = useState({
    className: '', sectionName: '', subjectName: '', chapterTitle: '', boardTopicCode: '',
    plannedStartDate: '', plannedEndDate: '', unitNumber: 1,
  });
  const [showLessonForm, setShowLessonForm] = useState(false);
  const [lessonForm, setLessonForm] = useState({
    title: '', className: '', sectionName: '', subjectName: '', teacherName: '',
    syllabusChapterId: '', resourceTitle: '', resourceUrl: '',
  });
  const [showElectiveModal, setShowElectiveModal] = useState(false);
  const [electiveSubjectId, setElectiveSubjectId] = useState('');
  const [electiveStudents, setElectiveStudents] = useState<{ id: string; fullName: string }[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  const terms = useMemo(() => framework?.terms?.length ? framework.terms : meta?.terms || ['Term 1', 'Term 2'], [framework, meta]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const m = await fetchAcademicMeta();
      setMeta(m);
      const [fw, cs, sub, syl, ana, tw, lp, tc, el] = await Promise.all([
        fetchCurriculumFramework(academicYear),
        fetchClassSections(academicYear),
        fetchAcademicSubjects(),
        fetchSyllabus({ academicYear, className: className || undefined }),
        fetchCurriculumAnalytics({ academicYear, term, className: className || undefined, sectionName: sectionName || undefined }),
        fetchCurriculumTeacherWorkload(academicYear),
        fetchLessonPlans(academicYear),
        fetchTimetableConflicts(academicYear),
        fetchElectives({ academicYear, className: className || undefined, sectionName: sectionName || undefined }),
      ]);
      setFramework(fw.curriculum);
      setInstFramework(fw.institutionFramework);
      setClassSections(cs.records.map((r) => ({ className: r.className, sectionName: r.sectionName, classGroup: r.classGroup, capacity: r.capacity, classTeacher: r.classTeacher })));
      setSubjects(sub.records.map((r) => ({ id: r.id, subjectName: r.subjectName, subjectType: r.subjectType, isElective: r.isElective, subjectCode: r.subjectCode })));
      setChapters(syl.records as SyllabusChapter[]);
      setAnalytics(ana);
      setTeachers(tw.teachers);
      setLessonPlans(lp.records);
      setConflicts(tc.conflicts);
      setElectives(el.records);
    } finally {
      setLoading(false);
    }
  }, [academicYear, term, className, sectionName]);

  useEffect(() => { void load(); }, [load]);

  const saveFramework = async () => {
    if (!framework) return;
    await saveCurriculumFramework({ ...framework, academicYear, terms: framework.terms });
    setMessage('Curriculum framework saved');
    void load();
  };

  const addChapter = async () => {
    await createSyllabusChapter({ ...chapterForm, academicYear, term });
    setShowChapterForm(false);
    void load();
  };

  const addLessonWithLms = async () => {
    const resources = lessonForm.resourceUrl
      ? [{ type: 'link' as const, title: lessonForm.resourceTitle || 'Resource', url: lessonForm.resourceUrl }]
      : [];
    await createLessonPlan({
      title: lessonForm.title,
      className: lessonForm.className,
      sectionName: lessonForm.sectionName,
      subjectName: lessonForm.subjectName,
      teacherName: lessonForm.teacherName,
      syllabusChapterId: lessonForm.syllabusChapterId || undefined,
      resources,
      share: true,
      academicYear,
      term,
    });
    setShowLessonForm(false);
    void load();
  };

  const openElectiveBulk = async () => {
    const res = await fetchStudents({
      className: className || undefined,
      sectionName: sectionName || undefined,
      viewAll: true,
      pageSize: 500,
    });
    setElectiveStudents(res.students.map((s) => ({ id: s.id, fullName: s.fullName })));
    setSelectedStudentIds([]);
    setShowElectiveModal(true);
  };

  const assignElectives = async () => {
    if (!electiveSubjectId || selectedStudentIds.length === 0) return;
    const cs = classSections[0];
    const res = await bulkAssignElectives({
      academicYear,
      subjectId: electiveSubjectId,
      className: className || cs?.className || '',
      sectionName: sectionName || cs?.sectionName || '',
      studentIds: selectedStudentIds,
    });
    setMessage(`Assigned ${res.created} student(s) to elective (${res.skipped} already mapped)`);
    setShowElectiveModal(false);
    void load();
  };

  if (loading && !framework) return <AcademicLoading label="Loading curriculum hub…" />;

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="Academic Management › Curriculum & Syllabus"
        title="Curriculum & Syllabus"
        subtitle="Academic engine — board standards, grading, syllabus compliance, teacher allocation & lesson delivery"
      />
      <div className={am.content}>
        {message && <p className={am.message}>{message}</p>}

        <AcademicYearTermFilters
          academicYear={academicYear} term={term}
          years={meta?.academicYears || [academicYear]}
          terms={terms}
          onYear={setAcademicYear} onTerm={setTerm}
          className={className} sectionName={sectionName}
          classes={meta?.classes}
          sections={className ? meta?.sectionsByClass[className] : []}
          onClass={(v) => { setClassName(v); setSectionName(''); }}
          onSection={setSectionName}
        />

        <div className="flex flex-wrap gap-1 border-b border-slate-200 pb-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-colors ${
                tab === t.id ? 'border-amber-400 text-amber-900 bg-amber-50' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Phase A: Board & Framework */}
        {tab === 'framework' && framework && (
          <div className={`${am.card} ${am.cardPad} space-y-4`}>
            <h3 className="text-sm font-bold text-slate-800">Curriculum Mapping & Compliance</h3>
            <p className="text-xs text-slate-500">Synced from Institution Setup where available. Configure board alignment, terms, and grading before subjects.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="text-xs space-y-1">
                <span className="font-semibold text-slate-600">Education Board</span>
                <select value={framework.boardName} onChange={(e) => setFramework((f) => f && ({ ...f, boardName: e.target.value }))} className={am.input}>
                  {['CBSE', 'ICSE', 'State Board', 'IB', 'Cambridge', 'Other'].map((b) => <option key={b}>{b}</option>)}
                </select>
              </label>
              <label className="text-xs space-y-1">
                <span className="font-semibold text-slate-600">Board Code</span>
                <input value={framework.boardCode} onChange={(e) => setFramework((f) => f && ({ ...f, boardCode: e.target.value }))} className={am.input} />
              </label>
              <label className="text-xs space-y-1">
                <span className="font-semibold text-slate-600">Standard Alignment</span>
                <input value={framework.standardAlignment} onChange={(e) => setFramework((f) => f && ({ ...f, standardAlignment: e.target.value }))} className={am.input} placeholder="National / State / International" />
              </label>
              <label className="text-xs space-y-1">
                <span className="font-semibold text-slate-600">Term System</span>
                <select value={framework.termSystem} onChange={(e) => setFramework((f) => f && ({ ...f, termSystem: e.target.value }))} className={am.input}>
                  {['Terms', 'Semesters', 'Trimesters', 'Quarters'].map((t) => <option key={t}>{t}</option>)}
                </select>
              </label>
              <label className="text-xs space-y-1">
                <span className="font-semibold text-slate-600">Grading System</span>
                <select value={framework.gradingSystem} onChange={(e) => setFramework((f) => f && ({ ...f, gradingSystem: e.target.value }))} className={am.input}>
                  {['Percentage', 'GPA', 'CGPA', 'Letter Grade', 'Pass-Fail'].map((g) => <option key={g}>{g}</option>)}
                </select>
              </label>
              <label className="text-xs space-y-1">
                <span className="font-semibold text-slate-600">Max / Pass Marks</span>
                <div className="flex gap-2">
                  <input type="number" value={framework.maxMarks} onChange={(e) => setFramework((f) => f && ({ ...f, maxMarks: Number(e.target.value) }))} className={am.input} />
                  <input type="number" value={framework.passMarks} onChange={(e) => setFramework((f) => f && ({ ...f, passMarks: Number(e.target.value) }))} className={am.input} />
                </div>
              </label>
            </div>
            <textarea
              value={framework.complianceNotes}
              onChange={(e) => setFramework((f) => f && ({ ...f, complianceNotes: e.target.value }))}
              className={am.input} rows={2} placeholder="Compliance notes / board mapping remarks"
            />
            {instFramework.levels && (
              <p className="text-xs text-slate-500">Institution levels: {instFramework.levels} · Classes {instFramework.classFrom}–{instFramework.classTo}</p>
            )}
            <button type="button" onClick={() => void saveFramework()} className={am.btnPrimary}>Save Framework</button>
          </div>
        )}

        {/* Grade Levels */}
        {tab === 'grades' && (
          <div className={am.tableWrap}>
            <table className="w-full"><thead><tr>
              <th className={am.th}>Class</th><th className={am.th}>Section</th><th className={am.th}>Capacity</th><th className={am.th}>Class Teacher</th>
            </tr></thead><tbody>
              {classSections.map((r, i) => (
                <tr key={i}><td className={am.td}>{r.className}</td><td className={am.td}>{r.sectionName}</td><td className={am.td}>{r.capacity}</td><td className={am.td}>{r.classTeacher || '—'}</td></tr>
              ))}
            </tbody></table>
          </div>
        )}

        {/* Subjects */}
        {tab === 'subjects' && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <button type="button" onClick={() => void openElectiveBulk()} className={am.btnSecondary}>Bulk Assign Electives</button>
            </div>
            <div className={am.tableWrap}>
              <table className="w-full"><thead><tr>
                <th className={am.th}>Subject</th><th className={am.th}>Code</th><th className={am.th}>Type</th><th className={am.th}>Category</th><th className={am.th}>Elective Enrollments</th>
              </tr></thead><tbody>
                {subjects.map((s) => (
                  <tr key={s.id}>
                    <td className={am.td}>{s.subjectName}</td><td className={am.td}>{s.subjectCode}</td>
                    <td className={am.td}><span className={`text-xs font-bold px-2 py-0.5 rounded ${s.isElective ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{s.subjectType}</span></td>
                    <td className={am.td}>{s.isElective ? 'Elective' : 'Core'}</td>
                    <td className={am.td}>{electives.filter((e) => e.subjectId === s.id).length}</td>
                  </tr>
                ))}
              </tbody></table>
            </div>
          </div>
        )}

        {/* Phase B: Syllabus Map */}
        {tab === 'syllabus' && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <button type="button" onClick={() => setShowChapterForm(true)} className={am.btnPrimary}><Plus size={14} /> Add Chapter</button>
            </div>
            <div className={am.tableWrap}>
              <table className="w-full"><thead><tr>
                <th className={am.th}>Class-Section</th><th className={am.th}>Subject</th><th className={am.th}>Chapter</th><th className={am.th}>Board Code</th><th className={am.th}>Planned End</th><th className={am.th}>Progress</th><th className={am.th}>Status</th>
              </tr></thead><tbody>
                {chapters.map((r) => (
                  <tr key={r.id}>
                    <td className={am.td}>{r.classGroup}</td><td className={am.td}>{r.subjectName}</td><td className={am.td}>{r.chapterTitle}</td>
                    <td className={am.td}>{r.boardTopicCode || '—'}</td>
                    <td className={am.td}>{r.plannedEndDate ? new Date(r.plannedEndDate).toLocaleDateString('en-IN') : '—'}</td>
                    <td className={am.td}>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full"><div className="h-full bg-teal-500 rounded-full" style={{ width: `${r.completionPercent}%` }} /></div>
                        <span className="text-xs font-bold w-8">{r.completionPercent}%</span>
                        <button type="button" className="text-xs text-indigo-600" onClick={() => void updateSyllabusChapter(r.id, { completionPercent: Math.min(100, r.completionPercent + 10) }).then(load)}>+10%</button>
                      </div>
                    </td>
                    <td className={am.td}>
                      {r.scheduleStatus === 'behind' ? (
                        <span className="text-xs font-bold text-red-600 flex items-center gap-1"><AlertTriangle size={12} /> Behind</span>
                      ) : r.scheduleStatus === 'no_plan' ? (
                        <span className="text-xs text-slate-400">No plan</span>
                      ) : (
                        <span className="text-xs font-bold text-green-600 flex items-center gap-1"><CheckCircle size={12} /> On track</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody></table>
            </div>
          </div>
        )}

        {/* Phase C: Teacher Allocation */}
        {tab === 'teachers' && (
          <div className="space-y-4">
            <div className={am.tableWrap}>
              <table className="w-full"><thead><tr>
                <th className={am.th}>Teacher</th><th className={am.th}>Periods/Week</th><th className={am.th}>Workload</th><th className={am.th}>Status</th>
              </tr></thead><tbody>
                {teachers.map((t) => (
                  <tr key={t.teacherName}>
                    <td className={am.td}>{t.teacherName}</td><td className={am.td}>{t.periodsPerWeek}</td>
                    <td className={am.td}>{t.workloadLevel}</td>
                    <td className={am.td}>{t.isOverloaded ? <span className="text-red-600 font-bold text-xs">Overloaded</span> : <span className="text-green-600 text-xs">OK</span>}</td>
                  </tr>
                ))}
              </tbody></table>
            </div>
            {conflicts.length > 0 && (
              <div className={`${am.card} p-4 border-amber-200 bg-amber-50`}>
                <h4 className="text-xs font-bold text-amber-800 mb-2">Timetable Conflicts ({conflicts.length})</h4>
                {conflicts.slice(0, 5).map((c, i) => <p key={i} className="text-xs text-amber-900">• {c.message} — {c.details}</p>)}
              </div>
            )}
          </div>
        )}

        {/* Phase D: Lesson Plans & LMS */}
        {tab === 'lessons' && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <button type="button" onClick={() => setShowLessonForm(true)} className={am.btnPrimary}><Plus size={14} /> New Lesson Plan</button>
            </div>
            <div className={am.tableWrap}>
              <table className="w-full"><thead><tr>
                <th className={am.th}>Title</th><th className={am.th}>Class</th><th className={am.th}>Subject</th><th className={am.th}>Linked Syllabus</th><th className={am.th}>LMS Resources</th><th className={am.th}>Status</th>
              </tr></thead><tbody>
                {lessonPlans.map((lp) => (
                  <tr key={lp.id}>
                    <td className={am.td}>{lp.title}</td><td className={am.td}>{lp.classGroup}</td><td className={am.td}>{lp.subjectName}</td>
                    <td className={am.td}>{lp.syllabusChapterId ? chapters.find((c) => c.id === lp.syllabusChapterId)?.chapterTitle || 'Linked' : '—'}</td>
                    <td className={am.td}>{(lp.resources as unknown[])?.length || 0} file(s)</td>
                    <td className={am.td}>
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100">{lp.statusLabel}</span>
                      {lp.status !== 'COMPLETED' && (
                        <button type="button" className="text-xs text-green-600 ml-2" onClick={() => void updateLessonPlan(lp.id, { status: 'COMPLETED' }).then(load)}>Complete</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody></table>
            </div>
          </div>
        )}

        {/* Analytics & Bottleneck Alerts */}
        {tab === 'analytics' && analytics && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: 'Chapters', value: analytics.summary.totalChapters },
                { label: 'On Track', value: analytics.summary.onTrack },
                { label: 'Behind', value: analytics.summary.behind },
                { label: 'No Plan', value: analytics.summary.noPlan },
                { label: 'Avg Completion', value: `${analytics.summary.avgCompletion}%` },
              ].map((k) => (
                <div key={k.label} className={`${am.card} p-3 text-center`}>
                  <p className="text-lg font-bold">{k.value}</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">{k.label}</p>
                </div>
              ))}
            </div>

            {analytics.bottlenecks.length > 0 && (
              <div className={`${am.card} p-4`}>
                <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2"><AlertTriangle size={16} className="text-red-500" /> Bottleneck Alerts</h4>
                <div className="space-y-2">
                  {analytics.bottlenecks.map((b, i) => (
                    <div key={i} className={`text-xs px-3 py-2 rounded-lg border ${SEV_COLOR[b.severity]}`}>{b.message}</div>
                  ))}
                </div>
              </div>
            )}

            <div className={`${am.card} p-4`}>
              <h4 className="text-sm font-bold mb-3">Subject-Section Progress (Planned vs Actual)</h4>
              <div className="space-y-2">
                {analytics.subjectProgress.slice(0, 12).map((sp, i) => (
                  <div key={i} className="text-xs">
                    <div className="flex justify-between mb-1">
                      <span className="font-semibold">{sp.classGroup} · {sp.subjectName}</span>
                      <span className={sp.gap > 10 ? 'text-red-600 font-bold' : 'text-slate-600'}>Gap: {sp.gap}%</span>
                    </div>
                    <div className="flex gap-2 items-center">
                      <span className="w-14 text-slate-500">Planned</span>
                      <div className="flex-1 h-2 bg-slate-100 rounded-full"><div className="h-full bg-blue-400 rounded-full" style={{ width: `${sp.plannedPercent}%` }} /></div>
                      <span className="w-8">{sp.plannedPercent}%</span>
                    </div>
                    <div className="flex gap-2 items-center mt-1">
                      <span className="w-14 text-slate-500">Actual</span>
                      <div className="flex-1 h-2 bg-slate-100 rounded-full"><div className="h-full bg-teal-500 rounded-full" style={{ width: `${sp.actualPercent}%` }} /></div>
                      <span className="w-8">{sp.actualPercent}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {analytics.performanceByClass.length > 0 && (
              <div className={`${am.card} p-4`}>
                <h4 className="text-sm font-bold mb-2">Performance by Class (Student Analytics)</h4>
                <div className="flex flex-wrap gap-2">
                  {analytics.performanceByClass.map((p) => (
                    <span key={p.className} className="text-xs bg-slate-100 px-2 py-1 rounded">{p.className}: {p.avgScore}%</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <AcademicModal open={showChapterForm} onClose={() => setShowChapterForm(false)} title="Add Syllabus Chapter" large>
        <div className="grid grid-cols-2 gap-3">
          <input placeholder="Class" value={chapterForm.className} onChange={(e) => setChapterForm((f) => ({ ...f, className: e.target.value }))} className={am.input} />
          <input placeholder="Section" value={chapterForm.sectionName} onChange={(e) => setChapterForm((f) => ({ ...f, sectionName: e.target.value }))} className={am.input} />
          <input placeholder="Subject" value={chapterForm.subjectName} onChange={(e) => setChapterForm((f) => ({ ...f, subjectName: e.target.value }))} className={am.input} />
          <input placeholder="Board Topic Code" value={chapterForm.boardTopicCode} onChange={(e) => setChapterForm((f) => ({ ...f, boardTopicCode: e.target.value }))} className={am.input} />
          <input placeholder="Chapter Title" value={chapterForm.chapterTitle} onChange={(e) => setChapterForm((f) => ({ ...f, chapterTitle: e.target.value }))} className={`${am.input} col-span-2`} />
          <input type="date" value={chapterForm.plannedStartDate} onChange={(e) => setChapterForm((f) => ({ ...f, plannedStartDate: e.target.value }))} className={am.input} />
          <input type="date" value={chapterForm.plannedEndDate} onChange={(e) => setChapterForm((f) => ({ ...f, plannedEndDate: e.target.value }))} className={am.input} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={() => setShowChapterForm(false)} className={am.btnSecondary}>Cancel</button>
          <button type="button" onClick={() => void addChapter()} className={am.btnPrimary}>Save Chapter</button>
        </div>
      </AcademicModal>

      <AcademicModal open={showLessonForm} onClose={() => setShowLessonForm(false)} title="Lesson Plan + LMS Resource" large>
        <div className="space-y-3">
          <input placeholder="Lesson Title" value={lessonForm.title} onChange={(e) => setLessonForm((f) => ({ ...f, title: e.target.value }))} className={am.input} />
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Class" value={lessonForm.className} onChange={(e) => setLessonForm((f) => ({ ...f, className: e.target.value }))} className={am.input} />
            <input placeholder="Section" value={lessonForm.sectionName} onChange={(e) => setLessonForm((f) => ({ ...f, sectionName: e.target.value }))} className={am.input} />
            <input placeholder="Subject" value={lessonForm.subjectName} onChange={(e) => setLessonForm((f) => ({ ...f, subjectName: e.target.value }))} className={am.input} />
            <input placeholder="Teacher" value={lessonForm.teacherName} onChange={(e) => setLessonForm((f) => ({ ...f, teacherName: e.target.value }))} className={am.input} />
          </div>
          <select value={lessonForm.syllabusChapterId} onChange={(e) => setLessonForm((f) => ({ ...f, syllabusChapterId: e.target.value }))} className={am.input}>
            <option value="">Link to syllabus chapter (optional)</option>
            {chapters.map((c) => <option key={c.id} value={c.id}>{c.classGroup} · {c.subjectName} · {c.chapterTitle}</option>)}
          </select>
          <div className="border-t pt-3">
            <p className="text-xs font-bold text-slate-600 mb-2 flex items-center gap-1"><LinkIcon size={12} /> LMS Resource</p>
            <input placeholder="Resource title" value={lessonForm.resourceTitle} onChange={(e) => setLessonForm((f) => ({ ...f, resourceTitle: e.target.value }))} className={am.input} />
            <input placeholder="URL (PDF, video, presentation link)" value={lessonForm.resourceUrl} onChange={(e) => setLessonForm((f) => ({ ...f, resourceUrl: e.target.value }))} className={`${am.input} mt-2`} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={() => setShowLessonForm(false)} className={am.btnSecondary}>Cancel</button>
          <button type="button" onClick={() => void addLessonWithLms()} className={am.btnPrimary}>Create & Share</button>
        </div>
      </AcademicModal>

      <AcademicModal open={showElectiveModal} onClose={() => setShowElectiveModal(false)} title="Bulk Assign Student Electives" large>
        <select value={electiveSubjectId} onChange={(e) => setElectiveSubjectId(e.target.value)} className={am.input}>
          <option value="">Select elective subject</option>
          {subjects.filter((s) => s.isElective).map((s) => <option key={s.id} value={s.id}>{s.subjectName}</option>)}
        </select>
        <div className="max-h-48 overflow-y-auto border rounded-lg p-2 space-y-1">
          {electiveStudents.map((s) => (
            <label key={s.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={selectedStudentIds.includes(s.id)} onChange={(e) => setSelectedStudentIds((ids) => e.target.checked ? [...ids, s.id] : ids.filter((id) => id !== s.id))} />
              {s.fullName}
            </label>
          ))}
        </div>
        <p className="text-xs text-slate-500">{selectedStudentIds.length} student(s) selected</p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setShowElectiveModal(false)} className={am.btnSecondary}>Cancel</button>
          <button type="button" onClick={() => void assignElectives()} className={am.btnPrimary}>Assign Electives</button>
        </div>
      </AcademicModal>
    </AcademicPageShell>
  );
}
