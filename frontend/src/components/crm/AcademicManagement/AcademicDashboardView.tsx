import { useCallback, useEffect, useState } from 'react';
import {
  Book, Users, ClipboardList, CheckSquare, FileText, Calendar as CalendarIcon,
  PlusCircle, BrainCircuit, Download, ChevronLeft, ChevronRight, Award, Trophy, LayoutGrid,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip as RechartsTooltip, CartesianGrid, LineChart, Line, Legend,
} from 'recharts';
import {
  fetchAcademicDashboard, fetchAcademicMeta, seedAcademicData, clearAcademicDemoData, type AcademicDashboard,
} from '../../../lib/academicServices';
import {
  AcademicLoading, AcademicModal, AcademicPageHeader, AcademicPageShell, AcademicYearTermFilters, am,
} from './AcademicManagementUi';

const KPI_ICONS = [
  { key: 'classes', title: 'Classes', color: 'bg-blue-500', icon: <Book size={20} /> },
  { key: 'subjects', title: 'Subjects', color: 'bg-indigo-600', icon: <FileText size={20} /> },
  { key: 'teachers', title: 'Teachers', color: 'bg-green-500', icon: <Users size={20} /> },
  { key: 'lessonPlans', title: 'Lesson Plans', color: 'bg-orange-500', icon: <CalendarIcon size={20} /> },
  { key: 'homeworkAssigned', title: 'Homework Assigned', color: 'bg-pink-500', icon: <CheckSquare size={20} /> },
  { key: 'assessmentsConducted', title: 'Assessments', color: 'bg-purple-600', icon: <ClipboardList size={20} /> },
] as const;

const PERIOD_COLORS = ['bg-blue-500', 'bg-orange-500', 'bg-green-500', 'bg-pink-500', 'bg-blue-400'];

export function AcademicDashboardView() {
  const [meta, setMeta] = useState<{ defaultAcademicYear: string; academicYears: string[]; classes: string[]; sectionsByClass: Record<string, string[]>; terms: string[] } | null>(null);
  const [data, setData] = useState<AcademicDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [term, setTerm] = useState('Term 1');
  const [className, setClassName] = useState('');
  const [sectionName, setSectionName] = useState('');
  const [message, setMessage] = useState('');
  const [clearOpen, setClearOpen] = useState(false);
  const [clearing, setClearing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [m, d] = await Promise.all([
        fetchAcademicMeta(),
        fetchAcademicDashboard({ academicYear, term, className: className || undefined, sectionName: sectionName || undefined }),
      ]);
      setMeta(m);
      setData(d);
      if (!academicYear && m.defaultAcademicYear) setAcademicYear(m.defaultAcademicYear);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [academicYear, term, className, sectionName]);

  useEffect(() => { void load(); }, [load]);

  const handleSeed = async () => {
    const res = await seedAcademicData(academicYear);
    setMessage(res.message);
    void load();
  };

  const handleClearDemo = async () => {
    setClearing(true);
    try {
      const res = await clearAcademicDemoData(academicYear);
      setMessage(res.message);
      setClearOpen(false);
      void load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed to clear demo data');
      setClearOpen(false);
    } finally {
      setClearing(false);
    }
  };

  if (loading && !data) return <AcademicLoading label="Loading academic dashboard…" />;

  const lessonPie = data ? [
    { name: 'Completed', value: data.lessonPlanCompletion.completed, color: '#10b981' },
    { name: 'In Progress', value: data.lessonPlanCompletion.inProgress, color: '#f59e0b' },
    { name: 'Pending', value: data.lessonPlanCompletion.pending, color: '#ec4899' },
  ] : [];

  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="Academic Management › Dashboard"
        title="Academic Management CRM"
        subtitle="Plan • Teach • Assess • Improve — share & track academic operations"
        actions={
          <>
            <button type="button" onClick={() => void handleSeed()} className={am.btnSecondary}>Load Demo Data</button>
            <button type="button" onClick={() => setClearOpen(true)} className={am.btnSecondary}>Clear Demo Data</button>
            <button type="button" className={am.btnPrimary}><PlusCircle size={14} /> Plan New Activity</button>
          </>
        }
      />
      <div className={am.content}>
        {message && <p className={am.message}>{message}</p>}
        <AcademicYearTermFilters
          academicYear={academicYear}
          term={term}
          years={meta?.academicYears || [academicYear]}
          terms={meta?.terms || ['Term 1', 'Term 2']}
          onYear={setAcademicYear}
          onTerm={setTerm}
          className={className}
          sectionName={sectionName}
          classes={meta?.classes}
          sections={className ? meta?.sectionsByClass[className] : []}
          onClass={(v) => { setClassName(v); setSectionName(''); }}
          onSection={setSectionName}
        />

        {data && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {KPI_ICONS.map((k) => (
                <div key={k.key} className={`${am.card} p-3 flex items-center gap-3`}>
                  <div className={`w-10 h-10 rounded-full ${k.color} text-white flex items-center justify-center shrink-0`}>
                    {k.icon}
                  </div>
                  <div>
                    <p className="text-lg font-bold text-slate-900">{data.kpis[k.key]}</p>
                    <p className="text-[10px] text-slate-500 font-bold">{k.title}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className={`${am.card} ${am.cardPad} lg:col-span-4`}>
                <h3 className="text-[11px] font-bold text-slate-800 mb-3">Today&apos;s Schedule — {today}</h3>
                <div className="space-y-2">
                  {data.todaySchedule.length === 0 ? (
                    <p className="text-xs text-slate-400">No timetable slots for today</p>
                  ) : data.todaySchedule.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 bg-slate-50 rounded-lg p-2 border border-slate-100">
                      <div className={`w-6 h-6 rounded ${PERIOD_COLORS[i % PERIOD_COLORS.length]} text-white flex items-center justify-center text-[10px] font-bold`}>{item.period}</div>
                      <div className="w-20 text-[9px] text-slate-500">{item.time}</div>
                      <div className="flex-1">
                        <p className="text-[10px] font-bold text-slate-800">{item.subject}</p>
                        <p className="text-[9px] text-slate-500">{item.class}</p>
                      </div>
                      <div className="text-[9px] text-slate-600">{item.teacher}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className={`${am.card} ${am.cardPad} lg:col-span-4`}>
                <h3 className="text-[11px] font-bold text-slate-800 mb-2">Lesson Plan Completion</h3>
                <div className="flex items-center">
                  <div className="w-20 h-20 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={lessonPie} cx="50%" cy="50%" innerRadius={25} outerRadius={35} dataKey="value" stroke="none">
                          {lessonPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-[11px] font-bold">{data.lessonPlanCompletion.percent}%</span>
                    </div>
                  </div>
                  <div className="flex-1 ml-3 text-[9px] space-y-1">
                    {lessonPie.map((item) => (
                      <div key={item.name} className="flex justify-between"><span>{item.name}</span><span className="font-bold">{item.value}</span></div>
                    ))}
                  </div>
                </div>
                {data.lessonPlanCompletion.byDepartment.length > 0 && (
                  <div className="h-20 mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.lessonPlanCompletion.byDepartment} margin={{ top: 5, left: -25 }}>
                        <XAxis dataKey="name" tick={{ fontSize: 7 }} />
                        <Bar dataKey="value" radius={[2, 2, 0, 0]} fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div className={`${am.card} ${am.cardPad} lg:col-span-4`}>
                <h3 className="text-[11px] font-bold text-slate-800 mb-3">Key Academic Activities</h3>
                <div className="space-y-2">
                  {data.keyActivities.map((a, i) => (
                    <div key={i} className="flex gap-2 text-[10px]">
                      <FileText size={12} className="text-blue-500 shrink-0 mt-0.5" />
                      <div><p className="font-bold text-slate-800">{a.title}</p><p className="text-slate-500">{a.date} · {a.type}</p></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className={`${am.card} ${am.cardPad} lg:col-span-3`}>
                <h3 className="text-[11px] font-bold mb-3">Syllabus Progress</h3>
                <div className="space-y-2">
                  {data.syllabusProgress.map((item) => (
                    <div key={item.className} className="flex items-center gap-2 text-[9px]">
                      <span className="w-14 text-slate-600">{item.className}</span>
                      <div className="flex-1 h-2 bg-slate-100 rounded-full"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${item.percent}%` }} /></div>
                      <span className="w-8 text-right font-bold">{item.percent}%</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={`${am.card} ${am.cardPad} lg:col-span-4`}>
                <h3 className="text-[11px] font-bold mb-2">Subject Performance</h3>
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.subjectPerformance}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 9 }} />
                      <Legend wrapperStyle={{ fontSize: 9 }} />
                      <Line type="monotone" dataKey="Math" stroke="#3b82f6" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="Science" stroke="#10b981" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="English" stroke="#f59e0b" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="Social" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className={`${am.card} ${am.cardPad} lg:col-span-2`}>
                <h3 className="text-[11px] font-bold mb-3">Homework</h3>
                <div className="grid grid-cols-2 gap-2 text-center text-[9px]">
                  <div className="bg-blue-50 p-2 rounded"><p className="font-bold text-lg">{data.homework.assigned}</p><p>Assigned</p></div>
                  <div className="bg-green-50 p-2 rounded"><p className="font-bold text-lg">{data.homework.submitted}</p><p>Submitted</p></div>
                  <div className="bg-orange-50 p-2 rounded"><p className="font-bold text-lg">{data.homework.pending}</p><p>Pending</p></div>
                  <div className="bg-red-50 p-2 rounded"><p className="font-bold text-lg">{data.homework.overdue}</p><p>Overdue</p></div>
                </div>
              </div>

              <div className={`${am.card} ${am.cardPad} lg:col-span-3`}>
                <h3 className="text-[11px] font-bold mb-2">Teacher Workload</h3>
                <div className="flex items-center gap-3">
                  <div className="w-20 h-20">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={data.teacherWorkload} cx="50%" cy="50%" innerRadius={28} outerRadius={38} dataKey="value" stroke="none">
                          {data.teacherWorkload.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="text-[9px] space-y-1">
                    {data.teacherWorkload.map((w) => (
                      <div key={w.name} className="flex justify-between gap-4"><span>{w.name}</span><span className="font-bold">{w.value} ({w.percent})</span></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className={`${am.card} ${am.cardPad} lg:col-span-5`}>
                <h3 className="text-[11px] font-bold mb-3">CCE & Student Performance</h3>
                <div className="grid grid-cols-4 gap-2 mb-4 text-center text-[8px]">
                  <div className="bg-slate-50 p-2 rounded"><p className="font-bold text-sm">{data.cce.UNIT_TEST}</p><p>Unit Tests</p></div>
                  <div className="bg-slate-50 p-2 rounded"><p className="font-bold text-sm">{data.cce.ASSIGNMENT}</p><p>Assignments</p></div>
                  <div className="bg-slate-50 p-2 rounded"><p className="font-bold text-sm">{data.cce.PROJECT}</p><p>Projects</p></div>
                  <div className="bg-slate-50 p-2 rounded"><p className="font-bold text-sm">{data.cce.ACTIVITY}</p><p>Activities</p></div>
                </div>
                <div className="h-28">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.studentPerformanceTrend}>
                      <XAxis dataKey="name" tick={{ fontSize: 8 }} />
                      <Bar dataKey="value" radius={[2, 2, 0, 0]} fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[9px] text-amber-600 font-bold mt-1">Overall Avg: {data.overallAvg}%</p>
              </div>

              <div className={`${am.card} ${am.cardPad} lg:col-span-3`}>
                <h3 className="text-[11px] font-bold mb-3">Co-Scholastic</h3>
                <div className="space-y-2 text-[9px]">
                  {data.coScholastic.map((a) => (
                    <div key={a.id} className="flex justify-between"><span className="font-bold">{a.title}</span><span className="text-slate-500">{new Date(a.activityDate).toLocaleDateString('en-IN')}</span></div>
                  ))}
                </div>
              </div>

              <div className={`${am.card} ${am.cardPad} lg:col-span-4 bg-blue-50 border-blue-100`}>
                <h3 className="text-[11px] font-bold mb-3 flex items-center gap-2"><BrainCircuit size={14} /> Smart Insights</h3>
                <ul className="space-y-2 text-[9px] text-slate-700">
                  {data.insights.map((ins, i) => <li key={i}>• {ins}</li>)}
                </ul>
              </div>
            </div>
          </>
        )}
      </div>

      <AcademicModal
        open={clearOpen}
        onClose={() => setClearOpen(false)}
        title="Clear Demo Data?"
      >
        <div className="space-y-4 text-sm">
          <p className="text-slate-600">
            This will permanently delete all demo records for session <strong>{academicYear}</strong>, including:
          </p>
          <ul className="list-inside list-disc space-y-1 text-xs text-slate-500">
            <li>Academic data (classes, subjects, lesson plans, homework, assessments)</li>
            <li>Examination data (schedules, marks, results, report cards, certificates)</li>
            <li>Attendance data (teacher/staff profiles, daily records, gate passes)</li>
          </ul>
          <p className="text-xs text-red-600">
            Real student admissions, enquiries, and user accounts are not deleted.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void handleClearDemo()}
              disabled={clearing}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold shadow-sm transition-colors disabled:opacity-50"
            >
              {clearing ? 'Clearing…' : 'Yes, Clear Demo Data'}
            </button>
            <button type="button" onClick={() => setClearOpen(false)} className={am.btnSecondary} disabled={clearing}>
              Cancel
            </button>
          </div>
        </div>
      </AcademicModal>
    </AcademicPageShell>
  );
}
