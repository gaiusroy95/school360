import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, ArrowUp, Award, BarChart2, BookOpen, CheckCircle2,
  ClipboardList, Loader2, RefreshCw, TrendingUp, UserCheck, Users, XCircle,
} from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  ExamAnalytics,
  fetchExamAnalytics,
  fetchExamAnalyticsMeta,
  seedExamAnalytics,
} from '../../../lib/examinationServices';
import { AcademicLoading, AcademicPageHeader, AcademicPageShell, am } from '../AcademicManagement/AcademicManagementUi';

type Tab = 'overview' | 'marks' | 'teachers' | 'rankings';

const GRADE_COLORS: Record<string, string> = {
  'A+': '#16a34a', A: '#22c55e', 'B+': '#3b82f6', B: '#60a5fa',
  C: '#f59e0b', D: '#f97316', F: '#ef4444',
};

const SHEET_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-amber-100 text-amber-800',
  SUBMITTED: 'bg-blue-100 text-blue-800',
  APPROVED: 'bg-emerald-100 text-emerald-800',
  LOCKED: 'bg-green-100 text-green-800',
  RETURNED: 'bg-red-100 text-red-800',
};

const PIE_COLORS = ['#22c55e', '#ef4444'];

function fmt(n: number) {
  return n.toLocaleString('en-IN');
}

export function ExamAnalyticsView() {
  const [tab, setTab] = useState<Tab>('overview');
  const [meta, setMeta] = useState<Awaited<ReturnType<typeof fetchExamAnalyticsMeta>> | null>(null);
  const [data, setData] = useState<ExamAnalytics | null>(null);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [examType, setExamType] = useState('FINAL_EXAMINATION');
  const [className, setClassName] = useState('');
  const [sectionName, setSectionName] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const sectionOptions = useMemo(() => {
    if (!meta) return [];
    if (!className) return [...new Set(Object.values(meta.sectionsByClass).flat())].sort();
    return meta.sectionsByClass[className] || [];
  }, [meta, className]);

  const load = useCallback(async (year?: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      let m = meta;
      if (!m) {
        m = await fetchExamAnalyticsMeta();
        setMeta(m);
        setAcademicYear(m.defaultAcademicYear);
      }
      const yearFilter = year || academicYear || m.defaultAcademicYear;
      let analytics = await fetchExamAnalytics({
        academicYear: yearFilter,
        examType,
        className: className || undefined,
        sectionName: sectionName || undefined,
      });
      if (!analytics.classAnalytics.length && !analytics.teacherWork.workItems.length) {
        await seedExamAnalytics(yearFilter);
        analytics = await fetchExamAnalytics({
          academicYear: yearFilter,
          examType,
          className: className || undefined,
          sectionName: sectionName || undefined,
        });
      }
      setData(analytics);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [meta, academicYear, examType, className, sectionName]);

  useEffect(() => { void load(); }, [load]);

  const resultPieData = useMemo(() => {
    if (!data?.resultSummary) return [];
    return [
      { name: 'Pass', value: data.resultSummary.pass },
      { name: 'Fail', value: data.resultSummary.fail },
    ];
  }, [data]);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'marks', label: 'Marks Analytics' },
    { id: 'teachers', label: 'Teacher Work' },
    { id: 'rankings', label: 'Rankings' },
  ];

  if (loading && !data) return <AcademicLoading label="Loading exam analytics…" />;

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="Examination Management › Exam Analytics"
        title="Exam Analytics"
        subtitle="All exam marks, performance trends, class/subject analysis, and teacher work assignments"
        actions={(
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={academicYear}
              onChange={(e) => { setAcademicYear(e.target.value); void load(e.target.value); }}
              className={am.select}
            >
              {(meta?.academicYears || [academicYear]).map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <select value={examType} onChange={(e) => setExamType(e.target.value)} className={am.select}>
              {(meta?.examTypes || []).map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
            <button type="button" onClick={() => void load()} className={am.btnSecondary}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        )}
      />

      {errorMsg && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
          <XCircle size={16} /> {errorMsg}
          <button type="button" onClick={() => setErrorMsg(null)} className="ml-auto text-xs underline">Dismiss</button>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-end gap-2">
        <div>
          <label className={am.label}>Class</label>
          <select value={className} onChange={(e) => { setClassName(e.target.value); setSectionName(''); }} className={am.select}>
            <option value="">All Classes</option>
            {(meta?.classes || []).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className={am.label}>Section</label>
          <select value={sectionName} onChange={(e) => setSectionName(e.target.value)} className={am.select}>
            <option value="">All Sections</option>
            {sectionOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {data && (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: 'Students Registered', value: fmt(data.overview.studentsRegistered), color: 'text-blue-600', icon: <Users size={16} /> },
            { label: 'With Results', value: fmt(data.overview.totalStudentsWithResults), color: 'text-indigo-600', icon: <ClipboardList size={16} /> },
            { label: 'Pass %', value: `${data.overview.averagePassPercent}%`, color: 'text-green-600', icon: <CheckCircle2 size={16} /> },
            { label: 'Average %', value: `${data.overview.averagePercent}%`, color: 'text-purple-600', icon: <BarChart2 size={16} /> },
            { label: 'Highest %', value: `${data.overview.highestPercent}%`, color: 'text-amber-600', icon: <Award size={16} /> },
            { label: 'Pending Teachers', value: String(data.teacherWork.summary.pendingTeachers), color: 'text-red-600', icon: <AlertTriangle size={16} /> },
          ].map((k) => (
            <div key={k.label} className={`${am.card} ${am.cardPad}`}>
              <div className="mb-1 flex items-center gap-1 text-slate-400">{k.icon}<p className="text-[10px]">{k.label}</p></div>
              <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-1 border-b border-slate-200 pb-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-t px-3 py-1.5 text-xs font-medium transition ${tab === t.id ? 'border-b-2 border-blue-600 text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <AcademicLoading label="Loading…" />
      ) : !data ? null : tab === 'overview' ? (
        <div className="space-y-4">
          {data.examAnalytics && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { label: 'Pass Rate', value: `${data.examAnalytics.passPercent}%`, delta: data.examAnalytics.passDelta, color: 'text-green-600' },
                { label: 'Class Average', value: `${data.examAnalytics.average}%`, delta: data.examAnalytics.averageDelta, color: 'text-blue-600' },
                { label: 'Improvement', value: `+${data.examAnalytics.improvement}%`, delta: null, color: 'text-purple-600' },
              ].map((k) => (
                <div key={k.label} className={`${am.card} ${am.cardPad} text-center`}>
                  <p className="text-[10px] text-slate-500">{k.label}</p>
                  <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
                  {k.delta !== null && (
                    <p className="text-[10px] text-green-600 flex items-center justify-center gap-0.5">
                      <ArrowUp size={10} />{k.delta}% vs last term
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <div className={`${am.card} ${am.cardPad}`}>
              <h3 className="mb-3 text-sm font-semibold text-slate-800">Result Summary</h3>
              {data.resultSummary ? (
                <div className="flex items-center gap-4">
                  <div className="h-40 w-40 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={resultPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={35} outerRadius={60}>
                          {resultPieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-slate-500">Appeared</span><p className="font-bold">{data.resultSummary.appeared}</p></div>
                    <div><span className="text-slate-500">Pass</span><p className="font-bold text-green-600">{data.resultSummary.pass}</p></div>
                    <div><span className="text-slate-500">Fail</span><p className="font-bold text-red-600">{data.resultSummary.fail}</p></div>
                    <div><span className="text-slate-500">Highest</span><p className="font-bold">{data.resultSummary.highest}%</p></div>
                    <div><span className="text-slate-500">Average</span><p className="font-bold">{data.resultSummary.average}%</p></div>
                    <div><span className="text-slate-500">Pass %</span><p className="font-bold text-green-600">{data.resultSummary.passPercent}%</p></div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-400">No result data available</p>
              )}
            </div>

            <div className={`${am.card} ${am.cardPad}`}>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
                <TrendingUp size={16} /> Performance Trend
              </h3>
              {data.performanceTrend.length ? (
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.performanceTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="term" tick={{ fontSize: 10 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Line type="monotone" dataKey="average" name="Average %" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="pass" name="Pass %" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-slate-400">No trend data</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {data.revaluation && (
              <div className={`${am.card} ${am.cardPad}`}>
                <h3 className="mb-2 text-sm font-semibold text-slate-800">Revaluation</h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-slate-500">Received</span><p className="font-bold">{data.revaluation.received ?? 0}</p></div>
                  <div><span className="text-slate-500">Under Review</span><p className="font-bold text-amber-600">{data.revaluation.underReview ?? 0}</p></div>
                  <div><span className="text-slate-500">Approved</span><p className="font-bold text-green-600">{data.revaluation.approved ?? 0}</p></div>
                  <div><span className="text-slate-500">Rejected</span><p className="font-bold text-red-600">{data.revaluation.rejected ?? 0}</p></div>
                </div>
              </div>
            )}
            {data.reportCards && (
              <div className={`${am.card} ${am.cardPad}`}>
                <h3 className="mb-2 text-sm font-semibold text-slate-800">Report Cards</h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-slate-500">Generated</span><p className="font-bold">{data.reportCards.generated}</p></div>
                  <div><span className="text-slate-500">Published</span><p className="font-bold text-green-600">{data.reportCards.published}</p></div>
                  <div><span className="text-slate-500">Shared</span><p className="font-bold text-blue-600">{data.reportCards.shared}</p></div>
                  <div><span className="text-slate-500">Pending</span><p className="font-bold text-amber-600">{data.reportCards.pending}</p></div>
                </div>
              </div>
            )}
            <div className={`${am.card} ${am.cardPad}`}>
              <h3 className="mb-2 text-sm font-semibold text-slate-800">Teacher Work Summary</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-slate-500">Assigned</span><p className="font-bold">{data.teacherWork.summary.assignedTeachers}</p></div>
                <div><span className="text-slate-500">Pending</span><p className="font-bold text-red-600">{data.teacherWork.summary.pendingTeachers}</p></div>
                <div><span className="text-slate-500">Completed</span><p className="font-bold text-green-600">{data.teacherWork.summary.completedTeachers}</p></div>
                <div><span className="text-slate-500">Assignments</span><p className="font-bold">{data.teacherWork.summary.totalAssignments}</p></div>
              </div>
            </div>
          </div>
        </div>
      ) : tab === 'marks' ? (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className={`${am.card} ${am.cardPad}`}>
              <h3 className="mb-3 text-sm font-semibold text-slate-800">Class-wise Pass %</h3>
              {data.classAnalytics.length ? (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.classAnalytics} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="classGroup" tick={{ fontSize: 9 }} width={80} />
                      <Tooltip />
                      <Bar dataKey="passPercent" name="Pass %" fill="#22c55e" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="averagePercent" name="Average %" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-slate-400">No class analytics data</p>
              )}
            </div>

            <div className={`${am.card} ${am.cardPad}`}>
              <h3 className="mb-3 text-sm font-semibold text-slate-800">Subject-wise Average</h3>
              {data.subjectAnalytics.length ? (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.subjectAnalytics}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="subjectName" tick={{ fontSize: 9 }} angle={-20} textAnchor="end" height={50} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="averagePercent" name="Average %" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-slate-400">No subject analytics data</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className={`${am.card} ${am.cardPad}`}>
              <h3 className="mb-3 text-sm font-semibold text-slate-800">Grade Distribution</h3>
              {data.gradeDistribution.length ? (
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.gradeDistribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="grade" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="count" name="Students" radius={[4, 4, 0, 0]}>
                        {data.gradeDistribution.map((g) => (
                          <Cell key={g.grade} fill={GRADE_COLORS[g.grade] || '#94a3b8'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-slate-400">No grade distribution data</p>
              )}
            </div>

            <div className={`${am.card} ${am.cardPad}`}>
              <h3 className="mb-3 text-sm font-semibold text-slate-800">Marks Entry Progress by Class</h3>
              {data.marksEntryStatus.length ? (
                <div className="space-y-2">
                  {data.marksEntryStatus.map((m) => (
                    <div key={m.className}>
                      <div className="mb-0.5 flex justify-between text-[10px]">
                        <span className="font-medium">{m.className}</span>
                        <span className="text-slate-500">{m.entered}/{m.total} ({m.progress}%)</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100">
                        <div
                          className="h-2 rounded-full bg-blue-500 transition-all"
                          style={{ width: `${m.progress}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">No marks entry progress data</p>
              )}
            </div>
          </div>

          <div className={`${am.card} overflow-x-auto`}>
            <div className={`${am.cardPad} border-b border-slate-100`}>
              <h3 className="text-sm font-semibold text-slate-800">Class-wise Results</h3>
            </div>
            <table className={am.table}>
              <thead>
                <tr>
                  <th className={am.th}>Class / Section</th>
                  <th className={am.th}>Examination</th>
                  <th className={am.th}>Students</th>
                  <th className={am.th}>Average %</th>
                  <th className={am.th}>Pass %</th>
                  <th className={am.th}>Pass</th>
                  <th className={am.th}>Fail</th>
                  <th className={am.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.classAnalytics.map((c) => (
                  <tr key={`${c.className}-${c.sectionName}`} className={am.tr}>
                    <td className={am.td}>{c.classGroup}</td>
                    <td className={am.td}>{c.examinationName}</td>
                    <td className={am.td}>{c.totalStudents}</td>
                    <td className={am.td}>{c.averagePercent}%</td>
                    <td className={am.td}>{c.passPercent}%</td>
                    <td className={`${am.td} text-green-600`}>{c.passCount}</td>
                    <td className={`${am.td} text-red-600`}>{c.failCount}</td>
                    <td className={am.td}><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px]">{c.status}</span></td>
                  </tr>
                ))}
                {!data.classAnalytics.length && (
                  <tr><td colSpan={8} className={`${am.td} py-6 text-center text-slate-400`}>No class results compiled yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : tab === 'teachers' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Assigned Teachers', value: data.teacherWork.summary.assignedTeachers, color: 'text-blue-600', icon: <UserCheck size={16} /> },
              { label: 'Pending Teachers', value: data.teacherWork.summary.pendingTeachers, color: 'text-red-600', icon: <AlertTriangle size={16} /> },
              { label: 'Completed Teachers', value: data.teacherWork.summary.completedTeachers, color: 'text-green-600', icon: <CheckCircle2 size={16} /> },
              { label: 'Pending Assignments', value: data.teacherWork.summary.pendingAssignments, color: 'text-amber-600', icon: <BookOpen size={16} /> },
            ].map((k) => (
              <div key={k.label} className={`${am.card} ${am.cardPad}`}>
                <div className="mb-1 flex items-center gap-1 text-slate-400">{k.icon}<p className="text-[10px]">{k.label}</p></div>
                <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
              </div>
            ))}
          </div>

          {data.teacherWork.pendingTeachers.length > 0 && (
            <div className={`${am.card} overflow-x-auto`}>
              <div className={`${am.cardPad} border-b border-red-100 bg-red-50`}>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-red-800">
                  <AlertTriangle size={16} /> Pending Teachers ({data.teacherWork.pendingTeachers.length})
                </h3>
                <p className="text-[10px] text-red-600">Teachers with incomplete marks entry or unsubmitted sheets</p>
              </div>
              <table className={am.table}>
                <thead>
                  <tr>
                    <th className={am.th}>Teacher</th>
                    <th className={am.th}>Contact</th>
                    <th className={am.th}>Subjects</th>
                    <th className={am.th}>Classes</th>
                    <th className={am.th}>Pending</th>
                    <th className={am.th}>Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {data.teacherWork.pendingTeachers.map((t) => (
                    <tr key={t.teacherName} className={am.tr}>
                      <td className={am.td}><p className="font-medium">{t.teacherName}</p></td>
                      <td className={am.td}>
                        <p className="text-[10px]">{t.teacherEmail || '—'}</p>
                        <p className="text-[10px] text-slate-400">{t.teacherPhone || '—'}</p>
                      </td>
                      <td className={am.td}>{t.subjects.join(', ')}</td>
                      <td className={am.td}>{t.classGroups.join(', ')}</td>
                      <td className={`${am.td} text-red-600 font-medium`}>{t.pendingAssignments}</td>
                      <td className={am.td}>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 rounded-full bg-slate-100">
                            <div className="h-1.5 rounded-full bg-amber-500" style={{ width: `${t.overallProgress}%` }} />
                          </div>
                          <span className="text-[10px]">{t.overallProgress}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className={`${am.card} overflow-x-auto`}>
            <div className={`${am.cardPad} border-b border-slate-100`}>
              <h3 className="text-sm font-semibold text-slate-800">All Assigned Teachers & Work Status</h3>
            </div>
            <table className={am.table}>
              <thead>
                <tr>
                  <th className={am.th}>Teacher</th>
                  <th className={am.th}>Class / Section</th>
                  <th className={am.th}>Subject</th>
                  <th className={am.th}>Students</th>
                  <th className={am.th}>Marks Entered</th>
                  <th className={am.th}>Progress</th>
                  <th className={am.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.teacherWork.workItems.map((w) => (
                  <tr key={w.assignmentId} className={am.tr}>
                    <td className={am.td}>
                      <p className="font-medium">{w.teacherName}</p>
                      <p className="text-[10px] text-slate-400">{w.recordId}</p>
                    </td>
                    <td className={am.td}>{w.classGroup}</td>
                    <td className={am.td}>{w.subjectName}</td>
                    <td className={am.td}>{w.studentCount}</td>
                    <td className={am.td}>{w.marksEntered}/{w.marksTotal}</td>
                    <td className={am.td}>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 rounded-full bg-slate-100">
                          <div
                            className={`h-1.5 rounded-full ${w.isPending ? 'bg-amber-500' : 'bg-green-500'}`}
                            style={{ width: `${w.progress}%` }}
                          />
                        </div>
                        <span className="text-[10px]">{w.progress}%</span>
                      </div>
                    </td>
                    <td className={am.td}>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${SHEET_STATUS_COLORS[w.sheetStatus] || 'bg-slate-100 text-slate-600'}`}>
                        {w.sheetStatus}
                      </span>
                    </td>
                  </tr>
                ))}
                {!data.teacherWork.workItems.length && (
                  <tr><td colSpan={7} className={`${am.td} py-6 text-center text-slate-400`}>No teacher assignments found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className={`${am.card} overflow-x-auto`}>
            <div className={`${am.cardPad} border-b border-slate-100`}>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Award size={16} className="text-amber-500" /> Top Performers
              </h3>
            </div>
            <table className={am.table}>
              <thead>
                <tr>
                  <th className={am.th}>Rank</th>
                  <th className={am.th}>Student</th>
                  <th className={am.th}>Class</th>
                  <th className={am.th}>%</th>
                  <th className={am.th}>Grade</th>
                </tr>
              </thead>
              <tbody>
                {data.topPerformers.map((s) => (
                  <tr key={`top-${s.rank}-${s.name}`} className={am.tr}>
                    <td className={am.td}><span className="font-bold text-amber-600">#{s.rank}</span></td>
                    <td className={am.td}>
                      <p className="font-medium">{s.name}</p>
                      {s.admissionNumber && <p className="text-[10px] text-slate-400">{s.admissionNumber}</p>}
                    </td>
                    <td className={am.td}>{s.classGroup}</td>
                    <td className={`${am.td} font-bold text-green-600`}>{s.percentage}%</td>
                    <td className={am.td}>{s.grade || '—'}</td>
                  </tr>
                ))}
                {!data.topPerformers.length && (
                  <tr><td colSpan={5} className={`${am.td} py-6 text-center text-slate-400`}>No ranking data</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className={`${am.card} overflow-x-auto`}>
            <div className={`${am.cardPad} border-b border-slate-100`}>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <AlertTriangle size={16} className="text-red-500" /> At-Risk Students (&lt;50%)
              </h3>
            </div>
            <table className={am.table}>
              <thead>
                <tr>
                  <th className={am.th}>#</th>
                  <th className={am.th}>Student</th>
                  <th className={am.th}>Class</th>
                  <th className={am.th}>%</th>
                  <th className={am.th}>Grade</th>
                </tr>
              </thead>
              <tbody>
                {data.bottomPerformers.map((s) => (
                  <tr key={`bottom-${s.rank}-${s.name}`} className={am.tr}>
                    <td className={am.td}>{s.rank}</td>
                    <td className={am.td}>
                      <p className="font-medium">{s.name}</p>
                      {s.admissionNumber && <p className="text-[10px] text-slate-400">{s.admissionNumber}</p>}
                    </td>
                    <td className={am.td}>{s.classGroup}</td>
                    <td className={`${am.td} font-bold text-red-600`}>{s.percentage}%</td>
                    <td className={am.td}>{s.grade || '—'}</td>
                  </tr>
                ))}
                {!data.bottomPerformers.length && (
                  <tr><td colSpan={5} className={`${am.td} py-6 text-center text-slate-400`}>No at-risk students</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AcademicPageShell>
  );
}
