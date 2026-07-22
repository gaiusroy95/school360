import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpen, ChevronDown, ChevronRight, ClipboardList, Filter,
  GraduationCap, Layers, Loader2, RefreshCw, School,
} from 'lucide-react';
import {
  fetchExamSyllabusMeta,
  fetchExamSyllabusOverview,
  seedExamSyllabus,
  type ExamSubjectSyllabusRecord,
  type ExamSyllabusCategory,
  type ExamSyllabusOverview,
} from '../../../lib/examinationServices';
import { AcademicLoading, AcademicPageHeader, AcademicPageShell, am } from '../AcademicManagement/AcademicManagementUi';

const CATEGORIES: ExamSyllabusCategory[] = ['CLASS_TEST_SERIES', 'UNIT_TEST', 'MID_TERM', 'ANNUAL_EXAM'];

const CATEGORY_STYLES: Record<ExamSyllabusCategory, { bg: string; border: string; icon: string }> = {
  CLASS_TEST_SERIES: { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'text-emerald-700' },
  UNIT_TEST: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-700' },
  MID_TERM: { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'text-amber-700' },
  ANNUAL_EXAM: { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'text-purple-700' },
};

function SyllabusCard({ syllabus }: { syllabus: ExamSubjectSyllabusRecord }) {
  const style = CATEGORY_STYLES[syllabus.category];
  return (
    <div className={`rounded-lg border p-3 ${style.bg} ${style.border}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <p className={`text-[10px] font-bold uppercase ${style.icon}`}>{syllabus.categoryLabel}</p>
          <p className="text-xs font-semibold text-slate-800 mt-0.5">{syllabus.title}</p>
        </div>
        <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-white/80 text-slate-600 border border-slate-200">
          {syllabus.status}
        </span>
      </div>
      <p className="text-[10px] text-slate-600 mb-2">
        <span className="font-semibold">{syllabus.unitsCovered}</span>
        {' · '}{syllabus.maxMarks} marks · {syllabus.durationMinutes} min · {syllabus.weightagePercent}% weight
      </p>
      <div className="space-y-1.5">
        {syllabus.topics.map((unit) => (
          <div key={`${unit.unitNumber}-${unit.chapterTitle}`} className="text-[10px]">
            <p className="font-semibold text-slate-700">Unit {unit.unitNumber}: {unit.chapterTitle}</p>
            <ul className="list-disc list-inside text-slate-600 ml-1">
              {unit.topics.map((t) => <li key={t}>{t}</li>)}
            </ul>
          </div>
        ))}
      </div>
      {syllabus.notes && (
        <p className="text-[9px] text-slate-500 mt-2 italic">{syllabus.notes}</p>
      )}
    </div>
  );
}

function SubjectRow({
  subjectName,
  sectionName,
  classGroup,
  syllabi,
  expanded,
  onToggle,
}: {
  subjectName: string;
  sectionName: string;
  classGroup: string;
  syllabi: Record<ExamSyllabusCategory, ExamSubjectSyllabusRecord | null>;
  expanded: boolean;
  onToggle: () => void;
}) {
  const filled = CATEGORIES.filter((c) => syllabi[c]).length;
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          {expanded ? <ChevronDown size={16} className="text-slate-400 shrink-0" /> : <ChevronRight size={16} className="text-slate-400 shrink-0" />}
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900">{subjectName}</p>
            <p className="text-[10px] text-slate-500">{classGroup}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {CATEGORIES.map((cat) => (
            <span
              key={cat}
              className={`w-2 h-2 rounded-full ${syllabi[cat] ? 'bg-green-500' : 'bg-slate-200'}`}
              title={syllabi[cat]?.categoryLabel || 'Not defined'}
            />
          ))}
          <span className="text-[10px] font-medium text-slate-500">{filled}/4 syllabi</span>
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-2 gap-3 border-t border-slate-100 pt-3">
          {CATEGORIES.map((cat) => {
            const syl = syllabi[cat];
            if (!syl) {
              return (
                <div key={cat} className="rounded-lg border border-dashed border-slate-200 p-3 text-center">
                  <p className="text-[10px] text-slate-400">No {cat.replace(/_/g, ' ').toLowerCase()} syllabus</p>
                </div>
              );
            }
            return <SyllabusCard key={syl.id} syllabus={syl} />;
          })}
        </div>
      )}
    </div>
  );
}

export function SubjectsSyllabusView() {
  const [meta, setMeta] = useState<Awaited<ReturnType<typeof fetchExamSyllabusMeta>> | null>(null);
  const [data, setData] = useState<ExamSyllabusOverview | null>(null);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [className, setClassName] = useState('');
  const [sectionName, setSectionName] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [category, setCategory] = useState('all');
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'matrix' | 'table'>('matrix');
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const sectionOptions = useMemo(() => {
    if (!meta) return [];
    if (!className) return [...new Set(Object.values(meta.sectionsByClass).flat())].sort();
    return meta.sectionsByClass[className] || [];
  }, [meta, className]);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      let m = meta;
      if (!m) {
        m = await fetchExamSyllabusMeta();
        setMeta(m);
        setAcademicYear(m.defaultAcademicYear);
      }
      const yearFilter = meta ? academicYear : m.defaultAcademicYear;
      let overview = await fetchExamSyllabusOverview({
        academicYear: yearFilter,
        className: className || undefined,
        sectionName: sectionName || undefined,
        subjectName: subjectName || undefined,
        category: category !== 'all' ? category : undefined,
      });
      if (!overview.records.length) {
        await seedExamSyllabus(yearFilter);
        overview = await fetchExamSyllabusOverview({
          academicYear: yearFilter,
          className: className || undefined,
          sectionName: sectionName || undefined,
          subjectName: subjectName || undefined,
          category: category !== 'all' ? category : undefined,
        });
      }
      setData(overview);
      setExpandedSubjects((prev) => {
        if (prev.size > 0) return prev;
        const firstClass = overview.classes[0];
        const firstSubject = firstClass?.subjects[0];
        if (!firstClass || !firstSubject) return prev;
        return new Set([`${firstClass.className}::${firstSubject.subjectName}::${firstSubject.sectionName}`]);
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load exam syllabus');
    } finally {
      setLoading(false);
    }
  }, [meta, academicYear, className, sectionName, subjectName, category]);

  const refresh = useCallback(async () => {
    try {
      const overview = await fetchExamSyllabusOverview({
        academicYear,
        className: className || undefined,
        sectionName: sectionName || undefined,
        subjectName: subjectName || undefined,
        category: category !== 'all' ? category : undefined,
      });
      setData(overview);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to refresh');
    }
  }, [academicYear, className, sectionName, subjectName, category]);

  useEffect(() => { void load(); }, [load]);

  const toggleSubject = (key: string) => {
    setExpandedSubjects((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await seedExamSyllabus(academicYear);
      await refresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to seed syllabus');
    } finally {
      setSeeding(false);
    }
  };

  if (loading && !data) {
    return <AcademicLoading label="Loading exam syllabus…" />;
  }

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="Examination Management › Subjects & Syllabus"
        title="Subjects & Syllabus"
        subtitle="Class and subject-wise syllabus for class test series, unit test, mid term, and annual exam"
        actions={(
          <>
            <button type="button" onClick={() => void refresh()} className={am.btnSecondary}>
              <RefreshCw size={14} /> Refresh
            </button>
            <button type="button" onClick={() => void handleSeed()} disabled={seeding} className={am.btnSecondary}>
              {seeding ? <Loader2 size={14} className="animate-spin" /> : <Layers size={14} />}
              Load Demo Data
            </button>
          </>
        )}
      />

      <div className={am.content}>
        {errorMsg && (
          <p className="text-xs font-medium text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{errorMsg}</p>
        )}

        <div className={am.filterBar}>
          <Filter size={14} className="text-slate-400" />
          <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className={am.select}>
            {(meta?.academicYears || [academicYear]).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={className} onChange={(e) => { setClassName(e.target.value); setSectionName(''); }} className={am.select}>
            <option value="">All Classes</option>
            {(meta?.classes || []).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={sectionName} onChange={(e) => setSectionName(e.target.value)} className={am.select}>
            <option value="">All Sections</option>
            {sectionOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={subjectName} onChange={(e) => setSubjectName(e.target.value)} className={am.select}>
            <option value="">All Subjects</option>
            {(meta?.subjects || []).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={am.select}>
            <option value="all">All Exam Types</option>
            {(meta?.categories || []).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <div className="ml-auto flex gap-1 bg-slate-100 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('matrix')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${viewMode === 'matrix' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}
            >
              Class Matrix
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${viewMode === 'table' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}
            >
              Table View
            </button>
          </div>
        </div>

        {data && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {CATEGORIES.map((cat) => {
              const info = data.summary.byCategory[cat];
              const style = CATEGORY_STYLES[cat];
              return (
                <div key={cat} className={`${am.card} ${am.cardPad} border ${style.border}`}>
                  <p className={`text-[10px] font-bold uppercase ${style.icon}`}>{info?.label || cat}</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{info?.count || 0}</p>
                  <p className="text-[10px] text-slate-500">syllabus records</p>
                </div>
              );
            })}
          </div>
        )}

        {viewMode === 'matrix' ? (
          <div className="space-y-6">
            {(data?.classes || []).length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-12">No syllabus records for the selected filters.</p>
            ) : (data?.classes || []).map((cls) => (
              <div key={cls.className} className="space-y-3">
                <div className="flex items-center gap-2">
                  <School size={18} className="text-slate-600" />
                  <h3 className="text-sm font-bold text-slate-800">{cls.className}</h3>
                  <span className="text-[10px] text-slate-500">{cls.subjects.length} subject(s)</span>
                </div>
                <div className="space-y-2">
                  {cls.subjects.map((subj) => {
                    const key = `${cls.className}::${subj.subjectName}::${subj.sectionName}`;
                    return (
                      <SubjectRow
                        key={key}
                        subjectName={subj.subjectName}
                        sectionName={subj.sectionName}
                        classGroup={subj.classGroup}
                        syllabi={subj.syllabi}
                        expanded={expandedSubjects.has(key)}
                        onToggle={() => toggleSubject(key)}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead>
                <tr>
                  <th className={am.th}>Class</th>
                  <th className={am.th}>Section</th>
                  <th className={am.th}>Subject</th>
                  <th className={am.th}>Exam Type</th>
                  <th className={am.th}>Units Covered</th>
                  <th className={am.th}>Topics</th>
                  <th className={am.th}>Marks</th>
                  <th className={am.th}>Duration</th>
                  <th className={am.th}>Weight</th>
                  <th className={am.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {(data?.records || []).length === 0 ? (
                  <tr><td colSpan={10} className="px-4 py-8 text-center text-slate-400 text-sm">No records found</td></tr>
                ) : (data?.records || []).map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/50">
                    <td className={am.td}>{rec.className}</td>
                    <td className={am.td}>{rec.sectionName || '—'}</td>
                    <td className={`${am.td} font-medium`}>{rec.subjectName}</td>
                    <td className={am.td}>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${CATEGORY_STYLES[rec.category].bg} ${CATEGORY_STYLES[rec.category].border}`}>
                        {rec.categoryLabel}
                      </span>
                    </td>
                    <td className={am.td}>{rec.unitsCovered}</td>
                    <td className={am.td}>
                      <span className="text-xs text-slate-600">{rec.topicCount} topics</span>
                    </td>
                    <td className={am.td}>{rec.maxMarks}</td>
                    <td className={am.td}>{rec.durationMinutes} min</td>
                    <td className={am.td}>{rec.weightagePercent}%</td>
                    <td className={am.td}>{rec.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className={`${am.card} ${am.cardPad}`}>
          <div className="flex items-center gap-2 mb-3">
            <GraduationCap size={16} className="text-slate-600" />
            <h3 className="text-sm font-bold text-slate-800">Syllabus Coverage Guide</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-[11px] text-slate-600">
            <div className={`p-3 rounded-lg border ${CATEGORY_STYLES.CLASS_TEST_SERIES.bg} ${CATEGORY_STYLES.CLASS_TEST_SERIES.border}`}>
              <p className="font-bold text-emerald-800 mb-1">Class Test Series</p>
              <p>Lesson-wise tests from ongoing chapters — typically 1 unit per test, synced with lesson planning.</p>
            </div>
            <div className={`p-3 rounded-lg border ${CATEGORY_STYLES.UNIT_TEST.bg} ${CATEGORY_STYLES.UNIT_TEST.border}`}>
              <p className="font-bold text-blue-800 mb-1">Unit Test</p>
              <p>Covers 1–2 units per subject. Short assessment before mid-term examinations.</p>
            </div>
            <div className={`p-3 rounded-lg border ${CATEGORY_STYLES.MID_TERM.bg} ${CATEGORY_STYLES.MID_TERM.border}`}>
              <p className="font-bold text-amber-800 mb-1">Mid Term</p>
              <p>Half-yearly syllabus covering units 1–3. Higher weightage and longer duration.</p>
            </div>
            <div className={`p-3 rounded-lg border ${CATEGORY_STYLES.ANNUAL_EXAM.bg} ${CATEGORY_STYLES.ANNUAL_EXAM.border}`}>
              <p className="font-bold text-purple-800 mb-1">Annual Exam</p>
              <p>Full year syllabus — all units and chapters as per board curriculum.</p>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 mt-3 flex items-center gap-1">
            <BookOpen size={12} />
            Syllabus topics are mapped from Curriculum & Syllabus chapters for each class and subject.
          </p>
        </div>
      </div>
    </AcademicPageShell>
  );
}
