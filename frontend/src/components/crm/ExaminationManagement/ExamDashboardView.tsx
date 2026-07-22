import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle, ArrowUp, Award, BarChart2, CalendarDays, CheckCircle2, CheckSquare,
  ClipboardCheck, Clock, Eye, FileEdit, FileText, Loader2, PlusCircle, Printer,
  RefreshCw, Share2, ShieldAlert, Upload, User, UserCheck, Users, XCircle,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid, Legend } from 'recharts';
import { toViewKey } from '../../../lib/navigation';
import {
  fetchExamDashboard,
  fetchExamDashboardMeta,
  seedExamDashboardDemo,
  type ExamDashboard,
} from '../../../lib/examinationServices';

type Props = { onNavigate?: (view: string) => void };

const WORKFLOW_COLORS: Record<string, string> = {
  green: 'bg-green-500',
  blue: 'bg-blue-500',
  orange: 'bg-orange-500',
  purple: 'bg-purple-500',
  slate: 'bg-slate-300',
};

const ALERT_STYLES: Record<string, { bg: string; icon: React.ReactNode }> = {
  URGENT: { bg: 'bg-red-50', icon: <ShieldAlert size={16} className="text-red-500" /> },
  WARNING: { bg: 'bg-orange-50', icon: <AlertCircle size={16} className="text-orange-500" /> },
  INFO: { bg: 'bg-blue-50', icon: <CheckSquare size={16} className="text-blue-500" /> },
};

const QUICK_ACTIONS = [
  { label: 'Create New Exam', page: 'Exam Schedule', icon: <PlusCircle size={16} className="text-blue-600" /> },
  { label: 'Upload Question Paper', page: 'Paper Management', icon: <Upload size={16} className="text-blue-600" /> },
  { label: 'Generate Admit Card', page: 'Exam Schedule', icon: <FileText size={16} className="text-blue-600" /> },
  { label: 'Seating Arrangement', page: 'Seating Arrangement', icon: <Users size={16} className="text-blue-600" /> },
  { label: 'Marks Entry', page: 'Marks Entry', icon: <CheckSquare size={16} className="text-blue-600" /> },
  { label: 'Generate Report Card', page: 'Report Cards', icon: <Printer size={16} className="text-blue-600" /> },
  { label: 'Result Analysis', page: 'Exam Analytics', icon: <BarChart2 size={16} className="text-blue-600" /> },
  { label: 'Exam Settings', page: 'Subjects & Syllabus', icon: <ClipboardCheck size={16} className="text-blue-600" /> },
];

function fmt(n: number) {
  return n.toLocaleString('en-IN');
}

export function ExamDashboardView({ onNavigate }: Props) {
  const [meta, setMeta] = useState<Awaited<ReturnType<typeof fetchExamDashboardMeta>> | null>(null);
  const [data, setData] = useState<ExamDashboard | null>(null);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [examType, setExamType] = useState('FINAL_EXAMINATION');
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const nav = (page: string) => onNavigate?.(toViewKey('Examination Management', page));

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const m = await fetchExamDashboardMeta();
      setMeta(m);
      setAcademicYear(m.defaultAcademicYear);
      let dashboard = await fetchExamDashboard({ academicYear: m.defaultAcademicYear, examType });
      if (!dashboard.examSchedule.length) {
        await seedExamDashboardDemo(m.defaultAcademicYear);
        dashboard = await fetchExamDashboard({ academicYear: m.defaultAcademicYear, examType });
      }
      setData(dashboard);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load exam dashboard');
    } finally {
      setLoading(false);
    }
  }, [examType]);

  const refresh = useCallback(async () => {
    try {
      const dashboard = await fetchExamDashboard({ academicYear, examType });
      setData(dashboard);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to refresh');
    }
  }, [academicYear, examType]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (meta) void refresh(); }, [academicYear, examType]);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await seedExamDashboardDemo(academicYear);
      await refresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Seed failed');
    } finally {
      setSeeding(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-slate-500">
        <Loader2 className="animate-spin mr-2" size={20} />
        Loading exam dashboard...
      </div>
    );
  }

  const kpis = data ? [
    { title: 'Upcoming Exams', value: String(data.kpis.upcomingExams), subtitle: `Next: ${data.kpis.nextExamName}`, subDate: data.kpis.nextExamDate, color: 'bg-blue-500', icon: <CalendarDays size={20} />, iconColor: 'text-blue-500', iconBg: 'bg-blue-100' },
    { title: 'Students Registered', value: fmt(data.kpis.studentsRegistered), subtitle: 'All Classes', color: 'bg-green-500', icon: <Users size={20} />, iconColor: 'text-green-500', iconBg: 'bg-green-100' },
    { title: 'Exams Conducted', value: String(data.kpis.examsConducted), subtitle: 'This Academic Year', color: 'bg-orange-500', icon: <ClipboardCheck size={20} />, iconColor: 'text-orange-500', iconBg: 'bg-orange-100' },
    { title: 'Papers Created', value: String(data.kpis.papersCreated), subtitle: 'This Term', color: 'bg-purple-500', icon: <FileText size={20} />, iconColor: 'text-purple-500', iconBg: 'bg-purple-100' },
    { title: 'Results Declared', value: String(data.kpis.resultsDeclared), subtitle: 'This Academic Year', color: 'bg-teal-500', icon: <BarChart2 size={20} />, iconColor: 'text-teal-500', iconBg: 'bg-teal-100' },
    { title: 'Average Pass %', value: `${data.kpis.averagePassPercent}%`, subtitle: 'This Term', color: 'bg-red-500', icon: <Award size={20} />, iconColor: 'text-red-500', iconBg: 'bg-red-100' },
  ] : [];

  return (
    <div className="flex flex-col space-y-4 h-full relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Examination Management CRM</h2>
          <p className="text-xs text-slate-500 mt-0.5">Plan • Organize • Conduct • Evaluate • Analyze</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded px-2 py-1 shadow-sm text-xs">
            <span className="text-slate-500 font-medium">Academic Year</span>
            <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className="font-bold text-slate-800 focus:outline-none bg-transparent">
              {(meta?.academicYears || ['2025-26']).map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded px-2 py-1 shadow-sm text-xs">
            <span className="text-slate-500 font-medium">Exam Type</span>
            <select value={examType} onChange={(e) => setExamType(e.target.value)} className="font-bold text-slate-800 focus:outline-none bg-transparent">
              {(meta?.examTypes || []).map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
          <button type="button" onClick={() => void handleSeed()} disabled={seeding}
            className="flex items-center gap-1 px-3 py-2 text-xs border border-slate-200 rounded hover:bg-slate-50">
            {seeding ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Reload Demo
          </button>
          <button type="button" onClick={() => nav('Exam Schedule')}
            className="bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold text-xs px-4 py-2 rounded flex items-center gap-2 shadow-sm">
            <PlusCircle size={14} />
            <span>Create New Exam</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle size={16} />{errorMsg}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map((kpi) => (
          <div key={kpi.title} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-10 h-10 rounded-full ${kpi.iconBg} ${kpi.iconColor} flex items-center justify-center shadow-sm shrink-0`}>{kpi.icon}</div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-slate-500 font-bold truncate">{kpi.title}</p>
                <p className="text-lg font-bold text-slate-900 truncate leading-tight mt-0.5">{kpi.value}</p>
              </div>
            </div>
            <div className="text-[9px] text-slate-500 flex flex-col">
              <span className="truncate">{kpi.subtitle}</span>
              {'subDate' in kpi && kpi.subDate && <span className="font-bold text-slate-700">{kpi.subDate}</span>}
            </div>
            <div className={`absolute bottom-0 left-0 w-full h-0.5 ${kpi.color}`} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-5 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[11px] font-bold text-slate-800">Exam Schedule <span className="font-normal text-slate-500">(Upcoming)</span></h3>
            <button type="button" onClick={() => nav('Exam Schedule')} className="text-[9px] text-blue-600 font-medium hover:underline">View All</button>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-[9px] text-left">
              <thead>
                <tr className="text-slate-500 border-b border-slate-100">
                  <th className="pb-2 font-medium">Exam Name</th>
                  <th className="pb-2 font-medium">Class</th>
                  <th className="pb-2 font-medium">Start Date</th>
                  <th className="pb-2 font-medium">End Date</th>
                  <th className="pb-2 font-medium text-center">Subjects</th>
                  <th className="pb-2 font-medium text-center">Students</th>
                  <th className="pb-2 font-medium text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(data?.examSchedule || []).map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 text-blue-600 font-medium">{row.name}</td>
                    <td className="py-2.5 text-slate-700">{row.classRange}</td>
                    <td className="py-2.5 text-slate-700">{row.startDate}</td>
                    <td className="py-2.5 text-slate-700">{row.endDate}</td>
                    <td className="py-2.5 text-center text-slate-700">{row.subjectCount}</td>
                    <td className="py-2.5 text-center text-slate-700">{fmt(row.studentCount)}</td>
                    <td className="py-2.5 text-center text-slate-400 hover:text-blue-600 cursor-pointer flex justify-center">
                      <button type="button" onClick={() => nav('Exam Schedule')} aria-label="View"><Eye size={12} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-4 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[11px] font-bold text-slate-800">Exam Process Workflow</h3>
            <button type="button" onClick={() => nav('Result Processing')} className="text-[9px] text-blue-600 font-medium hover:underline">View Workflow</button>
          </div>
          <div className="flex justify-between items-start mb-6 px-2">
            {(data?.workflow?.steps || []).map((step, i) => (
              <div key={step.label} className="flex flex-col items-center flex-1 relative z-10">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1.5 shadow-sm border-2 border-white ${step.percent > 0 ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                  {i === 0 ? <User size={12} /> : i === 1 ? <FileEdit size={12} /> : i === 2 ? <UserCheck size={12} /> : i === 3 ? <CheckSquare size={12} /> : <FileText size={12} />}
                </div>
                <p className="text-[9px] font-bold mb-0.5 text-center leading-tight text-slate-700">{step.label}</p>
                <p className="text-[7px] text-slate-400 text-center leading-tight px-1">{step.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-[9px] font-bold text-slate-700 mb-2">Current Status</p>
          <div className="space-y-2 flex-1">
            {(data?.workflow?.currentStatus || []).map((status) => (
              <div key={status.label} className="flex items-center gap-3 text-[9px]">
                <span className="w-16 text-slate-600">{status.label}</span>
                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${WORKFLOW_COLORS[status.label === 'Planned' ? 'green' : status.label === 'Preparation' ? 'blue' : status.label === 'Conduct' ? 'orange' : status.label === 'Evaluation' ? 'purple' : 'slate']} rounded-full`} style={{ width: `${status.percent}%` }} />
                </div>
                <span className="w-8 text-right font-bold text-slate-700">{status.percent}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-3 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[11px] font-bold text-slate-800">Question Bank Overview</h3>
            <button type="button" onClick={() => nav('Question Bank')} className="text-[9px] text-blue-600 font-medium hover:underline">View All</button>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-4 text-center">
            <div className="bg-blue-50 border border-blue-100 rounded p-1.5"><span className="text-[7px] text-blue-600 font-medium block">Total Questions</span><span className="text-sm font-bold">{fmt(data?.questionBank.total || 0)}</span></div>
            <div className="bg-slate-50 border rounded p-1.5"><span className="text-[7px] text-slate-500 block">Subjective</span><span className="text-sm font-bold">{fmt(data?.questionBank.subjective || 0)}</span></div>
            <div className="bg-slate-50 border rounded p-1.5"><span className="text-[7px] text-slate-500 block">Objective (MCQ)</span><span className="text-sm font-bold">{fmt(data?.questionBank.objective || 0)}</span></div>
            <div className="bg-slate-50 border rounded p-1.5"><span className="text-[7px] text-slate-500 block">With Solution</span><span className="text-sm font-bold">{fmt(data?.questionBank.withSolution || 0)}</span></div>
          </div>
          <p className="text-[9px] font-bold text-slate-700 mb-2">Subject Wise Question Distribution</p>
          <div className="flex items-center justify-center gap-3 flex-1">
            <div className="w-24 h-24 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data?.questionBank.subjectDistribution || []} cx="50%" cy="50%" innerRadius={20} outerRadius={40} paddingAngle={1} dataKey="value" stroke="none">
                    {(data?.questionBank.subjectDistribution || []).map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-1.5 text-[9px] min-w-[100px]">
              {(data?.questionBank.subjectDistribution || []).map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-600 text-[8px] truncate max-w-[50px]">{item.name}</span>
                  </div>
                  <span className="font-bold text-[8px]">({item.count})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-2 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3 flex items-center gap-1.5"><CalendarDays size={14} className="text-slate-400" />Today&apos;s Exam</h3>
          {data?.todayExam ? (
            <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 flex-1 flex flex-col">
              <p className="text-[11px] font-bold text-slate-900">{data.todayExam.title}</p>
              <p className="text-[9px] text-slate-500 mb-3">Class: {data.todayExam.classGroup}</p>
              <div className="space-y-2 text-[9px] mb-4 flex-1">
                <div className="flex justify-between"><span className="text-slate-500">Date:</span><span className="font-medium">{data.todayExam.date}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Time:</span><span className="font-medium">{data.todayExam.startTime} - {data.todayExam.endTime}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Subject:</span><span className="font-medium">{data.todayExam.subject}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Present:</span><span className="font-medium text-green-600">{data.todayExam.present}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Absent:</span><span className="font-medium text-red-500">{data.todayExam.absent}</span></div>
              </div>
              <button type="button" onClick={() => nav('Invigilation Management')} className="w-full bg-white border text-[9px] font-bold py-1.5 rounded hover:bg-slate-50 mt-auto">View Attendance</button>
            </div>
          ) : (
            <p className="text-sm text-slate-400 p-4">No exam scheduled for today</p>
          )}
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-2 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[11px] font-bold text-slate-800">Examination Alerts</h3>
            <button type="button" onClick={() => nav('Exam Schedule')} className="text-[9px] text-blue-600 font-medium hover:underline">View All</button>
          </div>
          <div className="flex-1 flex flex-col gap-3">
            {(data?.alerts || []).map((alert) => {
              const style = ALERT_STYLES[alert.type] || ALERT_STYLES.INFO;
              return (
                <div key={alert.id} className="flex gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${style.bg}`}>{style.icon}</div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold text-slate-800 leading-tight">{alert.title}</p>
                    <p className="text-[8px] text-slate-500">{alert.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-4 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[11px] font-bold text-slate-800">Result Summary <span className="font-normal text-slate-500">(This Term)</span></h3>
            <button type="button" onClick={() => nav('Result Processing')} className="text-[9px] text-blue-600 font-medium hover:underline">View Detailed</button>
          </div>
          {data?.resultSummary && (
            <>
              <div className="grid grid-cols-5 gap-2 mb-4 text-center">
                <div className="border rounded-lg p-1.5"><span className="text-[8px] text-slate-500 block">Appeared</span><span className="text-sm font-bold">{fmt(data.resultSummary.appeared)}</span></div>
                <div className="border border-green-100 bg-green-50 rounded-lg p-1.5"><span className="text-[8px] text-green-700 block">Pass</span><span className="text-sm font-bold text-green-700">{fmt(data.resultSummary.pass)}</span><span className="text-[7px] text-green-600">({data.resultSummary.passPercent}%)</span></div>
                <div className="border border-red-100 bg-red-50 rounded-lg p-1.5"><span className="text-[8px] text-red-700 block">Fail</span><span className="text-sm font-bold text-red-700">{fmt(data.resultSummary.fail)}</span></div>
                <div className="border rounded-lg p-1.5"><span className="text-[8px] text-slate-500 block">Highest</span><span className="text-sm font-bold text-blue-600">{data.resultSummary.highest}%</span></div>
                <div className="border rounded-lg p-1.5"><span className="text-[8px] text-slate-500 block">Average</span><span className="text-sm font-bold text-blue-600">{data.resultSummary.average}%</span></div>
              </div>
              <div className="flex gap-4 flex-1">
                <div className="flex-1 border rounded-lg p-2.5 flex flex-col">
                  <p className="text-[9px] font-bold mb-2">Top Performers</p>
                  <table className="w-full text-[8px]">
                    <thead><tr className="text-slate-400"><th className="pb-1">Rank</th><th>Name</th><th>Class</th><th className="text-right">%</th></tr></thead>
                    <tbody>
                      {data.topPerformers.map((row) => (
                        <tr key={row.rank}><td className="py-1">{row.rank}</td><td className="font-medium">{row.name}</td><td>{row.classGroup}</td><td className="text-right font-bold">{row.percent}</td></tr>
                      ))}
                    </tbody>
                  </table>
                  <button type="button" onClick={() => nav('Exam Analytics')} className="text-center text-[9px] text-blue-600 mt-auto pt-2">View All</button>
                </div>
                <div className="flex-1 border rounded-lg p-2.5 flex flex-col min-h-[80px]">
                  <p className="text-[9px] font-bold mb-1">Performance Trend</p>
                  <ResponsiveContainer width="100%" height={80}>
                    <LineChart data={data.performanceTrend} margin={{ top: 5, right: 5, left: -30, bottom: -5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="term" tick={{ fontSize: 7 }} />
                      <YAxis tick={{ fontSize: 7 }} domain={[0, 100]} />
                      <Line type="monotone" dataKey="average" name="Average %" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2 }} />
                      <Line type="monotone" dataKey="pass" name="Pass %" stroke="#10b981" strokeWidth={2} dot={{ r: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-4 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[11px] font-bold text-slate-800">Marks Entry Status</h3>
            <button type="button" onClick={() => nav('Marks Entry')} className="text-[9px] text-blue-600 font-medium hover:underline">View All</button>
          </div>
          <table className="w-full text-[9px]">
            <thead><tr className="text-slate-500 border-b"><th className="pb-2">Class</th><th className="pb-2 text-center">Total</th><th className="pb-2 text-center">Entered</th><th className="pb-2 text-center">Pending</th><th className="pb-2 text-right">Progress</th></tr></thead>
            <tbody className="divide-y divide-slate-50">
              {(data?.marksEntryStatus || []).map((row) => (
                <tr key={row.className} className="hover:bg-slate-50">
                  <td className="py-1.5">{row.className}</td>
                  <td className="py-1.5 text-center">{row.total}</td>
                  <td className="py-1.5 text-center">{row.entered}</td>
                  <td className="py-1.5 text-center">{row.pending}</td>
                  <td className="py-1.5 flex items-center justify-end gap-2">
                    <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${row.progress > 80 ? 'bg-green-500' : 'bg-blue-500'} rounded-full`} style={{ width: `${row.progress}%` }} />
                    </div>
                    <span className="font-bold w-5 text-right">{row.progress}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {data?.examAnalytics && (
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-3">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-[11px] font-bold text-slate-800">Exam Analytics</h3>
              <button type="button" onClick={() => nav('Exam Analytics')} className="text-[9px] text-blue-600 hover:underline">View All</button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="border rounded-lg p-2 text-center">
                <span className="text-[8px] text-slate-500 block">Pass %</span>
                <span className="text-xl font-bold">{data.examAnalytics.passPercent}%</span>
                <span className="text-[7px] text-green-600 flex items-center justify-center gap-0.5"><ArrowUp size={8} />{data.examAnalytics.passDelta}%</span>
              </div>
              <div className="border rounded-lg p-2 text-center">
                <span className="text-[8px] text-slate-500 block">Average</span>
                <span className="text-xl font-bold text-blue-600">{data.examAnalytics.average}%</span>
              </div>
              <div className="border rounded-lg p-2 text-center">
                <span className="text-[8px] text-slate-500 block">Improvement</span>
                <span className="text-xl font-bold text-purple-600">+{data.examAnalytics.improvement}%</span>
              </div>
            </div>
          </div>
        )}

        {data?.revaluation && (
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-3">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-[11px] font-bold text-slate-800">Revaluation / Recheck</h3>
              <button type="button" onClick={() => nav('Revaluation / Recheck')} className="text-[9px] text-blue-600 hover:underline">View All</button>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                { label: 'Received', value: data.revaluation.received, icon: <FileText size={12} className="text-blue-500" />, bg: 'bg-blue-50' },
                { label: 'Under Review', value: data.revaluation.underReview, icon: <Clock size={12} className="text-orange-500" />, bg: 'bg-orange-50' },
                { label: 'Approved', value: data.revaluation.approved, icon: <CheckCircle2 size={12} className="text-green-500" />, bg: 'bg-green-50' },
                { label: 'Rejected', value: data.revaluation.rejected, icon: <XCircle size={12} className="text-red-500" />, bg: 'bg-red-50' },
              ].map((item) => (
                <div key={item.label} className="flex flex-col items-center">
                  <div className={`w-6 h-6 rounded flex items-center justify-center mb-1 ${item.bg}`}>{item.icon}</div>
                  <span className="text-[7px] text-slate-500">{item.label}</span>
                  <span className="text-base font-bold">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {data?.reportCards && (
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-3">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-[11px] font-bold text-slate-800">Report Card Status</h3>
              <button type="button" onClick={() => nav('Report Cards')} className="text-[9px] text-blue-600 hover:underline">View All</button>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                { label: 'Generated', value: data.reportCards.generated, icon: <FileText size={12} className="text-blue-500" /> },
                { label: 'Published', value: data.reportCards.published, icon: <Upload size={12} className="text-indigo-500" /> },
                { label: 'Shared', value: data.reportCards.shared, icon: <Share2 size={12} className="text-green-500" /> },
                { label: 'Pending', value: data.reportCards.pending, icon: <Clock size={12} className="text-orange-500" /> },
              ].map((item) => (
                <div key={item.label} className="border rounded p-1.5 bg-slate-50">
                  <div className="mb-1">{item.icon}</div>
                  <span className="text-[7px] text-slate-500 block">{item.label}</span>
                  <span className="text-sm font-bold">{fmt(item.value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-3">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Quick Actions</h3>
          <div className="grid grid-cols-4 gap-2">
            {QUICK_ACTIONS.map((action) => (
              <button key={action.label} type="button" onClick={() => nav(action.page)}
                className="flex flex-col items-center p-1.5 rounded-lg border border-slate-100 hover:bg-blue-50 hover:border-blue-100 transition-colors group">
                <div className="w-6 h-6 rounded bg-slate-50 flex items-center justify-center mb-1 group-hover:bg-white">{action.icon}</div>
                <span className="text-[7px] text-slate-600 group-hover:text-blue-700 font-medium leading-tight text-center">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
