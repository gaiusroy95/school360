import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Users, CheckCircle2, XCircle, Clock, TrendingUp, CalendarX,
  ChevronDown, RefreshCw, AlertCircle, Calendar, Fingerprint,
  ClipboardCheck, ArrowUpRight, FileText, ShieldAlert, DoorOpen,
  Loader2,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid, Legend,
} from 'recharts';
import { toViewKey } from '../../../lib/navigation';
import {
  fetchAttendanceDashboard,
  fetchAttendanceMeta,
  seedAttendanceDemo,
  type AttendanceDashboard,
  type AttendanceDrilldownType,
  type AttendanceMeta,
} from '../../../lib/attendanceServices';
import { AttendanceDrilldownModal } from './AttendanceDrilldownModal';
import { MarkAttendanceModal } from './MarkAttendanceModal';

const OVERVIEW_COLORS = ['#10b981', '#ef4444', '#f59e0b', '#8b5cf6'];
const DAY_TYPE_COLORS = ['#3b82f6', '#ef4444', '#10b981'];

type Props = {
  onNavigate?: (view: string) => void;
};

export function StudentAttendanceDashboardView({ onNavigate }: Props) {
  const [meta, setMeta] = useState<AttendanceMeta | null>(null);
  const [dashboard, setDashboard] = useState<AttendanceDashboard | null>(null);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [section, setSection] = useState('All Sections');
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'By Class' | 'By Subject' | 'By Activity'>('By Class');
  const [selectedClassKey, setSelectedClassKey] = useState('');
  const [markDate, setMarkDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [subjectName, setSubjectName] = useState('Mathematics');
  const [activityName, setActivityName] = useState('Morning Assembly');
  const [drilldown, setDrilldown] = useState<{ type: AttendanceDrilldownType; title: string } | null>(null);
  const [markModalOpen, setMarkModalOpen] = useState(false);
  const markWidgetRef = useRef<HTMLDivElement>(null);

  const selectedClass = useMemo(() => {
    const g = meta?.classGroups.find((c) => c.label === selectedClassKey || `${c.className}::${c.sectionName}` === selectedClassKey);
    return g || meta?.classGroups[0] || null;
  }, [meta, selectedClassKey]);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const m = await fetchAttendanceMeta();
      setMeta(m);
      if (!selectedClassKey && m.classGroups[0]) {
        setSelectedClassKey(m.classGroups[0].label);
      }
      const data = await fetchAttendanceDashboard({
        academicYear,
        sectionName: section,
        date: markDate,
      });
      setDashboard(data);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load attendance dashboard');
    } finally {
      setLoading(false);
    }
  }, [academicYear, section, markDate, selectedClassKey]);

  useEffect(() => { void load(); }, [load]);

  const navigateTo = (page: string) => {
    if (onNavigate) onNavigate(toViewKey('Attendance Management', page));
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await seedAttendanceDemo(academicYear);
      await load();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Seed failed');
    } finally {
      setSeeding(false);
    }
  };

  const openMarkModal = () => {
    if (!selectedClass) {
      setErrorMsg('Please select a class first');
      return;
    }
    setMarkModalOpen(true);
  };

  const scrollToMark = () => {
    markWidgetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const kpis = dashboard ? [
    {
      key: 'total' as const,
      title: 'Total Students',
      value: dashboard.kpis.totalStudents.toLocaleString('en-IN'),
      subtitle: `${dashboard.kpis.studentGrowthPercent}% from last month`,
      trend: 'up' as const,
      color: 'bg-green-500',
      icon: <Users size={20} />,
      iconColor: 'text-green-500',
      iconBg: 'bg-green-100',
    },
    {
      key: 'present' as const,
      title: 'Present Today',
      value: dashboard.kpis.presentToday.toLocaleString('en-IN'),
      subtitle: `${dashboard.kpis.presentPercent}%`,
      trend: 'neutral' as const,
      color: 'bg-blue-500',
      icon: <CheckCircle2 size={20} />,
      iconColor: 'text-blue-500',
      iconBg: 'bg-blue-100',
    },
    {
      key: 'absent' as const,
      title: 'Absent Today',
      value: dashboard.kpis.absentToday.toLocaleString('en-IN'),
      subtitle: `${dashboard.kpis.absentPercent}%`,
      trend: 'neutral' as const,
      color: 'bg-orange-500',
      icon: <XCircle size={20} />,
      iconColor: 'text-orange-500',
      iconBg: 'bg-orange-100',
    },
    {
      key: 'late' as const,
      title: 'Late Today',
      value: dashboard.kpis.lateToday.toLocaleString('en-IN'),
      subtitle: `${dashboard.kpis.latePercent}%`,
      trend: 'neutral' as const,
      color: 'bg-purple-500',
      icon: <Clock size={20} />,
      iconColor: 'text-purple-500',
      iconBg: 'bg-purple-100',
    },
    {
      key: 'average' as const,
      title: 'Average Attendance',
      value: `${dashboard.kpis.averageAttendance}%`,
      subtitle: `${dashboard.kpis.improvement >= 0 ? '+' : ''}${dashboard.kpis.improvement}% from last month`,
      trend: dashboard.kpis.improvement >= 0 ? 'up' as const : 'down' as const,
      color: 'bg-teal-500',
      icon: <TrendingUp size={20} />,
      iconColor: 'text-teal-500',
      iconBg: 'bg-teal-100',
    },
    {
      key: 'onLeave' as const,
      title: 'On Leave Today',
      value: dashboard.kpis.onLeaveToday.toLocaleString('en-IN'),
      subtitle: `${dashboard.kpis.onLeavePercent}%`,
      trend: 'neutral' as const,
      color: 'bg-pink-500',
      icon: <CalendarX size={20} />,
      iconColor: 'text-pink-500',
      iconBg: 'bg-pink-100',
    },
  ] : [];

  const overviewData = dashboard ? [
    { name: 'Present', value: dashboard.overview.present, color: OVERVIEW_COLORS[0] },
    { name: 'Absent', value: dashboard.overview.absent, color: OVERVIEW_COLORS[1] },
    { name: 'Late', value: dashboard.overview.late, color: OVERVIEW_COLORS[2] },
    { name: 'On Leave', value: dashboard.overview.onLeave, color: OVERVIEW_COLORS[3] },
  ] : [];

  const dayTypeData = dashboard ? [
    { name: 'Working Days', value: dashboard.dayType.workingDays, color: DAY_TYPE_COLORS[0] },
    { name: 'Holidays', value: dashboard.dayType.holidays, color: DAY_TYPE_COLORS[1] },
    { name: 'Weekend', value: dashboard.dayType.weekend, color: DAY_TYPE_COLORS[2] },
  ] : [];

  const alertIcons: Record<string, ReactNode> = {
    high_absenteeism: <ShieldAlert size={16} className="text-red-500" />,
    continuous_absent: <AlertCircle size={16} className="text-orange-500" />,
    late: <Clock size={16} className="text-purple-500" />,
    on_leave: <CalendarX size={16} className="text-blue-500" />,
  };
  const alertBgs: Record<string, string> = {
    high_absenteeism: 'bg-red-50',
    continuous_absent: 'bg-orange-50',
    late: 'bg-purple-50',
    on_leave: 'bg-blue-50',
  };

  const markMode = activeTab === 'By Subject' ? 'SUBJECT' as const : activeTab === 'By Activity' ? 'ACTIVITY' as const : 'CLASS' as const;

  return (
    <div className="flex flex-col space-y-4 h-full relative">
      {loading && !dashboard && (
        <div className="absolute inset-0 bg-white/50 z-50 flex items-center justify-center backdrop-blur-[1px] rounded-xl">
          <Loader2 className="animate-spin text-amber-500" size={32} />
        </div>
      )}

      {errorMsg && (
        <div className="px-3 py-2 rounded-lg text-xs flex items-center gap-2 bg-red-50 text-red-700 border border-red-100">
          <AlertCircle size={14} />
          {errorMsg}
          <button type="button" onClick={() => setErrorMsg(null)} className="ml-auto underline">Dismiss</button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Attendance Management CRM</h2>
          <p className="text-xs text-slate-500 mt-0.5">Track • Monitor • Analyze • Improve</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded px-2 py-1 shadow-sm text-xs">
            <span className="text-slate-500 font-medium">Academic Year</span>
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="font-bold text-slate-800 focus:outline-none bg-transparent"
            >
              {(meta?.academicYears || [academicYear]).map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded px-2 py-1 shadow-sm text-xs">
            <span className="text-slate-500 font-medium">Select Section</span>
            <select
              value={section}
              onChange={(e) => setSection(e.target.value)}
              className="font-bold text-slate-800 focus:outline-none bg-transparent"
            >
              <option>All Sections</option>
              {(meta?.sections || []).map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="p-2 border border-slate-200 rounded bg-white hover:bg-slate-50"
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          {dashboard?.kpis.totalStudents === 0 && (
            <button
              type="button"
              disabled={seeding}
              onClick={() => void handleSeed()}
              className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-3 py-2 rounded"
            >
              {seeding ? 'Seeding…' : 'Load Demo Data'}
            </button>
          )}
          <button
            type="button"
            onClick={scrollToMark}
            className="bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold text-xs px-4 py-2 rounded flex items-center gap-2 shadow-sm transition-colors"
          >
            <ClipboardCheck size={14} />
            <span>Mark Attendance</span>
            <ChevronDown size={14} className="opacity-70" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map((kpi) => (
          <button
            key={kpi.key}
            type="button"
            onClick={() => setDrilldown({ type: kpi.key, title: kpi.title })}
            className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md hover:border-amber-300 transition-all relative overflow-hidden text-left"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-10 h-10 rounded-full ${kpi.iconBg} ${kpi.iconColor} flex items-center justify-center shadow-sm shrink-0`}>
                {kpi.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-slate-500 font-bold truncate">{kpi.title}</p>
                <p className="text-lg font-bold text-slate-900 truncate leading-tight mt-0.5">{kpi.value}</p>
              </div>
            </div>
            {kpi.subtitle && (
              <div className="text-[9px] text-slate-500 flex items-center gap-1">
                {kpi.trend === 'up' && <ArrowUpRight size={10} className="text-green-500 font-bold" />}
                <span className={kpi.trend === 'up' ? 'text-green-600 font-medium' : ''}>{kpi.subtitle}</span>
              </div>
            )}
            <div className={`absolute bottom-0 left-0 w-full h-0.5 ${kpi.color}`} />
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-3 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Attendance Overview <span className="font-normal text-slate-500">(This Month)</span></h3>
          <div className="flex items-center justify-center gap-4 flex-1 min-h-[120px]">
            <div className="w-24 h-24 relative shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={overviewData} cx="50%" cy="50%" innerRadius={35} outerRadius={45} paddingAngle={2} dataKey="value" stroke="none">
                    {overviewData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-sm font-bold text-slate-800 leading-none">{dashboard?.overview.overallPercent || 0}%</span>
                <span className="text-[6px] text-slate-500 mt-0.5 uppercase tracking-wider text-center">Overall<br />Attendance</span>
              </div>
            </div>
            <div className="flex flex-col gap-2 text-[9px] min-w-[100px]">
              {overviewData.map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-600">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 mr-1">
                      ({dashboard?.overview.totalStudents ? ((item.value / dashboard.overview.totalStudents) * 100).toFixed(1) : 0}%)
                    </span>
                    <span className="font-bold text-slate-800">{item.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="text-[9px] text-slate-500 mt-2">Total Students: {dashboard?.kpis.totalStudents.toLocaleString('en-IN') || 0}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-4 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[11px] font-bold text-slate-800">Attendance Trend <span className="font-normal text-slate-500">(Last 7 Days)</span></h3>
            <select className="text-[9px] border border-slate-200 rounded text-slate-500 focus:outline-none">
              <option>This Week</option>
            </select>
          </div>
          <div className="flex-1 w-full min-h-[140px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dashboard?.trend || []} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b' }} dy={5} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b' }} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                <RechartsTooltip contentStyle={{ fontSize: '9px', borderRadius: '8px', padding: '4px' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '9px', top: -10 }} />
                <Line type="monotone" dataKey="present" name="Present %" stroke="#10b981" strokeWidth={2} dot={{ r: 2 }} />
                <Line type="monotone" dataKey="absent" name="Absent %" stroke="#ef4444" strokeWidth={2} dot={{ r: 2 }} />
                <Line type="monotone" dataKey="late" name="Late %" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-3 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Real Time Attendance <span className="font-normal text-slate-500">(Today)</span></h3>
          <div className="flex items-center justify-center gap-4 flex-1 min-h-[120px]">
            <div className="w-24 h-24 relative shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path className="text-slate-100" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path
                  className="text-green-500"
                  strokeWidth="3"
                  strokeDasharray={`${dashboard?.realTime.presentPercent || 0}, 100`}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-sm font-bold text-slate-800 leading-none">{dashboard?.realTime.totalStudents.toLocaleString('en-IN')}</span>
                <span className="text-[7px] text-slate-500 mt-0.5">Total Students</span>
              </div>
            </div>
            <div className="flex flex-col gap-2 text-[9px] min-w-[100px]">
              {[
                { label: 'Present', count: dashboard?.realTime.present, pct: dashboard?.realTime.presentPercent, icon: <CheckCircle2 size={10} className="text-green-500" /> },
                { label: 'Absent', count: dashboard?.realTime.absent, pct: dashboard?.realTime.absentPercent, icon: <XCircle size={10} className="text-red-500" /> },
                { label: 'Late', count: dashboard?.realTime.late, pct: dashboard?.realTime.latePercent, icon: <Clock size={10} className="text-amber-500" /> },
                { label: 'On Leave', count: dashboard?.realTime.onLeave, pct: dashboard?.realTime.onLeavePercent, icon: <CalendarX size={10} className="text-purple-500" /> },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-1">{row.icon}<span className="text-slate-600">{row.label}</span></div>
                  <div className="text-right">
                    <span className="font-bold text-slate-800 mr-1">{row.count?.toLocaleString('en-IN')}</span>
                    <span className="text-slate-400 text-[8px]">({row.pct}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between text-[9px] text-slate-500 mt-2">
            <span>Last Updated: {dashboard ? new Date(dashboard.realTime.lastUpdated).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
            <button type="button" onClick={() => void load()} className="text-slate-400 hover:text-blue-500"><RefreshCw size={10} /></button>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-2 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Attendance by Class <span className="font-normal text-slate-500">(This Month)</span></h3>
          <div className="space-y-2 flex-1 flex flex-col justify-center">
            {(dashboard?.classProgress || []).slice(0, 7).map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-[9px]">
                <span className="w-10 text-slate-600 truncate">{item.name}</span>
                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${item.percent}%` }} />
                </div>
                <span className="w-6 text-right font-bold text-slate-700">{item.percent}%</span>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => navigateTo('Attendance Report')} className="text-center text-[9px] text-blue-600 font-medium hover:underline mt-2">View Full Report</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-4 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Today&apos;s Attendance by Class</h3>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-[9px] text-left">
              <thead>
                <tr className="text-slate-500 border-b border-slate-100">
                  <th className="pb-2 font-medium">Class / Section</th>
                  <th className="pb-2 font-medium text-center">Present</th>
                  <th className="pb-2 font-medium text-center">Absent</th>
                  <th className="pb-2 font-medium text-center">Late</th>
                  <th className="pb-2 font-medium text-center">On Leave</th>
                  <th className="pb-2 font-medium text-right">Attendance %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(dashboard?.todayByClass || []).map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2 text-slate-700">{row.className}</td>
                    <td className="py-2 text-center text-slate-700">{row.present}</td>
                    <td className="py-2 text-center text-slate-700">{row.absent}</td>
                    <td className="py-2 text-center text-slate-700">{row.late}</td>
                    <td className="py-2 text-center text-slate-700">{row.leave}</td>
                    <td className="py-2 text-right font-bold text-slate-800">{row.percent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" onClick={() => setDrilldown({ type: 'total', title: 'All Classes — Students' })} className="text-center text-[9px] text-blue-600 font-medium hover:underline mt-2">View All Classes</button>
        </div>

        <div ref={markWidgetRef} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-3 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Mark Attendance</h3>
          <div className="flex border-b border-slate-200 mb-3">
            {(['By Class', 'By Subject', 'By Activity'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`text-[9px] font-bold px-3 py-1.5 border-b-2 transition-colors flex-1 text-center ${activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="space-y-3 flex-1 flex flex-col justify-center">
            <div>
              <label className="block text-[9px] font-medium text-slate-600 mb-1">Select Class</label>
              <select
                value={selectedClassKey}
                onChange={(e) => setSelectedClassKey(e.target.value)}
                className="w-full text-[10px] border border-slate-200 rounded p-1.5 focus:outline-none focus:border-blue-500 bg-white"
              >
                {(meta?.classGroups || []).map((g) => (
                  <option key={g.label} value={g.label}>{g.label}</option>
                ))}
              </select>
            </div>
            {activeTab === 'By Subject' && (
              <div>
                <label className="block text-[9px] font-medium text-slate-600 mb-1">Subject</label>
                <input value={subjectName} onChange={(e) => setSubjectName(e.target.value)} className="w-full text-[10px] border border-slate-200 rounded p-1.5" />
              </div>
            )}
            {activeTab === 'By Activity' && (
              <div>
                <label className="block text-[9px] font-medium text-slate-600 mb-1">Activity</label>
                <input value={activityName} onChange={(e) => setActivityName(e.target.value)} className="w-full text-[10px] border border-slate-200 rounded p-1.5" />
              </div>
            )}
            <div>
              <label className="block text-[9px] font-medium text-slate-600 mb-1">Select Date</label>
              <div className="relative">
                <Calendar size={12} className="absolute left-2 top-1.5 text-slate-400" />
                <input type="date" value={markDate} onChange={(e) => setMarkDate(e.target.value)} className="w-full text-[10px] border border-slate-200 rounded p-1.5 pl-6 focus:outline-none focus:border-blue-500 bg-white" />
              </div>
            </div>
            <button type="button" onClick={openMarkModal} className="w-full bg-green-600 hover:bg-green-700 text-white text-[10px] font-bold py-1.5 rounded flex items-center justify-center gap-1.5 transition-colors">
              <CheckCircle2 size={12} /> Mark Attendance
            </button>
            <button type="button" onClick={() => navigateTo('Biometric Devices')} className="w-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-[10px] font-bold py-1.5 rounded flex items-center justify-center gap-1.5 transition-colors">
              <Fingerprint size={12} /> Use Biometric Device
            </button>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-3 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Attendance Summary <span className="font-normal text-slate-500">(This Month)</span></h3>
          <div className="grid grid-cols-4 gap-2 mb-4 text-center">
            {[
              { label: 'Total Working Days', value: dashboard?.monthSummary.workingDays },
              { label: 'Days Completed', value: dashboard?.monthSummary.daysCompleted },
              { label: 'Holidays', value: dashboard?.monthSummary.holidays },
              { label: 'Attendance Taken', value: dashboard?.monthSummary.attendanceTaken },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-[8px] text-slate-500 mb-0.5">{item.label}</p>
                <p className="text-lg font-bold text-green-600">{item.value ?? 0}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 mt-auto text-center border-t border-slate-100 pt-3">
            <div>
              <p className="text-[8px] text-slate-500">Best Attendance</p>
              <p className="text-[9px] font-bold text-slate-800">{dashboard?.monthSummary.bestClass || '—'}</p>
            </div>
            <div>
              <p className="text-[8px] text-slate-500">Lowest Attendance</p>
              <p className="text-[9px] font-bold text-slate-800">{dashboard?.monthSummary.lowestClass || '—'}</p>
            </div>
            <div>
              <p className="text-[8px] text-slate-500">Improvement</p>
              <p className="text-[10px] font-bold text-green-600 flex items-center justify-center gap-0.5">
                <ArrowUpRight size={10} /> {dashboard?.monthSummary.improvement ?? 0}%
              </p>
            </div>
            <div>
              <p className="text-[8px] text-slate-500">At Risk Students</p>
              <button type="button" onClick={() => setDrilldown({ type: 'atRisk', title: 'At Risk Students' })} className="text-[10px] font-bold text-red-500 hover:underline">
                {dashboard?.monthSummary.atRiskStudents ?? 0}
              </button>
            </div>
          </div>
          <button type="button" onClick={() => navigateTo('Daily Summary')} className="text-center text-[9px] text-blue-600 font-medium hover:underline mt-3 block w-full">View Detailed Summary</button>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-2 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[11px] font-bold text-slate-800">Attendance Alerts</h3>
            <button type="button" onClick={() => setDrilldown({ type: 'atRisk', title: 'All Alerts' })} className="text-[9px] text-blue-600 font-medium hover:underline">View All</button>
          </div>
          <div className="flex-1 flex flex-col gap-2.5 overflow-hidden">
            {(dashboard?.alerts || []).map((alert, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  if (alert.type === 'late') setDrilldown({ type: 'late', title: 'Late Students Today' });
                  else if (alert.type === 'on_leave') setDrilldown({ type: 'onLeave', title: 'On Leave Today' });
                  else setDrilldown({ type: 'atRisk', title: alert.title });
                }}
                className="flex gap-2 text-left hover:bg-slate-50 rounded p-1 -mx-1"
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${alertBgs[alert.type] || 'bg-slate-50'}`}>
                  {alertIcons[alert.type] || <AlertCircle size={16} />}
                </div>
                <div className="min-w-0">
                  <div className="flex justify-between items-start gap-1">
                    <p className="text-[9px] font-bold text-slate-800 truncate leading-tight">{alert.title}</p>
                    <span className="text-[7px] text-slate-400 shrink-0 mt-0.5">{alert.time}</span>
                  </div>
                  <p className="text-[8px] text-slate-500 leading-snug line-clamp-2 pr-1">{alert.description}</p>
                </div>
              </button>
            ))}
            {!dashboard?.alerts?.length && <p className="text-[9px] text-slate-400 italic">No alerts</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-3 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Attendance by Day Type <span className="font-normal text-slate-500">(This Month)</span></h3>
          <div className="flex items-center justify-center gap-4 flex-1 min-h-[100px]">
            <div className="w-20 h-20 relative shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={dayTypeData} cx="50%" cy="50%" innerRadius={25} outerRadius={35} paddingAngle={2} dataKey="value" stroke="none">
                    {dayTypeData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-2 text-[9px]">
              {dayTypeData.map((item, i) => (
                <div key={i} className="flex items-center justify-between min-w-[80px]">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-600">{item.name}</span>
                  </div>
                  <span className="font-bold text-slate-800">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
          <button type="button" onClick={() => navigateTo('Holiday Calendar')} className="text-center text-[9px] text-blue-600 font-medium hover:underline mt-2">View Calendar</button>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-2 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Top 5 Students <span className="font-normal text-slate-500">(By Attendance %)</span></h3>
          <div className="space-y-2 flex-1">
            {(dashboard?.topStudents || []).map((student, i) => (
              <div key={i} className="flex items-center justify-between text-[9px]">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-medium">{i + 1}.</span>
                  <div>
                    <p className="font-bold text-slate-700">{student.name}</p>
                    <p className="text-[8px] text-slate-400">{student.class}</p>
                  </div>
                </div>
                <span className="font-bold text-slate-800">{student.percent}%</span>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setDrilldown({ type: 'average', title: 'All Students by Attendance %' })} className="text-center text-[9px] text-blue-600 font-medium hover:underline mt-2">View All</button>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-3 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Attendance by Time <span className="font-normal text-slate-500">(Today)</span></h3>
          <div className="grid grid-cols-4 gap-2 flex-1 items-center justify-center">
            {[
              { label: 'Before\n8:00 AM', count: dashboard?.timeBuckets.before8, iconClass: 'text-blue-500', tagClass: 'text-blue-500 bg-blue-50', tag: 'On Time' },
              { label: '8:00 AM -\n8:30 AM', count: dashboard?.timeBuckets['8to830'], iconClass: 'text-green-500', tagClass: 'text-green-500 bg-green-50', tag: 'On Time' },
              { label: '8:30 AM -\n9:00 AM', count: dashboard?.timeBuckets['830to9'], iconClass: 'text-orange-500', tagClass: 'text-orange-500 bg-orange-50', tag: 'Late' },
              { label: 'After\n9:00 AM', count: dashboard?.timeBuckets.after9, iconClass: 'text-red-500', tagClass: 'text-red-500 bg-red-50', tag: 'Very Late' },
            ].map((slot, i) => (
              <div key={i} className={`flex flex-col items-center justify-center text-center p-2 ${i > 0 ? 'border-l border-slate-100' : ''}`}>
                <Clock size={16} className={`${slot.iconClass} mb-1`} />
                <p className="text-[7px] text-slate-500 leading-tight mb-1 whitespace-pre-line">{slot.label}</p>
                <p className="text-sm font-bold text-slate-800">{slot.count ?? 0}</p>
                <p className={`text-[7px] font-medium px-1 rounded mt-0.5 ${slot.tagClass}`}>{slot.tag}</p>
              </div>
            ))}
          </div>
          <div className="text-center text-[9px] font-bold text-slate-700 mt-2">
            Total Present: {dashboard?.kpis.presentToday.toLocaleString('en-IN')}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-2 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Leave Overview <span className="font-normal text-slate-500">(This Month)</span></h3>
          <div className="flex-1 flex flex-col justify-between gap-1 text-[9px]">
            {[
              { label: 'Total Leave Applications', value: dashboard?.leaveOverview.total, icon: <FileText size={10} />, bg: 'bg-blue-50 text-blue-500' },
              { label: 'Approved', value: dashboard?.leaveOverview.approved, icon: <CheckCircle2 size={10} />, bg: 'bg-green-50 text-green-500' },
              { label: 'Pending', value: dashboard?.leaveOverview.pending, icon: <Clock size={10} />, bg: 'bg-amber-50 text-amber-500' },
              { label: 'Rejected', value: dashboard?.leaveOverview.rejected, icon: <XCircle size={10} />, bg: 'bg-red-50 text-red-500' },
            ].map((row, i) => (
              <div key={row.label} className={`flex items-center justify-between py-1 ${i < 3 ? 'border-b border-slate-50' : ''}`}>
                <div className="flex items-center gap-1.5">
                  <div className={`w-5 h-5 rounded flex items-center justify-center ${row.bg}`}>{row.icon}</div>
                  <span className="text-slate-700 font-medium">{row.label}</span>
                </div>
                <span className="font-bold text-slate-800">{row.value ?? 0}</span>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => navigateTo('Leave Management')} className="text-center text-[9px] text-blue-600 font-medium hover:underline mt-2 block w-full">View All Leave Requests</button>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-2 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Quick Actions</h3>
          <div className="grid grid-cols-4 gap-2 flex-1">
            {[
              { label: 'Mark Attendance', icon: <ClipboardCheck size={16} className="text-blue-600" />, action: scrollToMark },
              { label: 'Student Attendance Report', icon: <FileText size={16} className="text-blue-600" />, action: () => navigateTo('Attendance Report') },
              { label: 'Teacher Attendance Report', icon: <FileText size={16} className="text-blue-600" />, action: () => navigateTo('Teacher Attendance') },
              { label: 'Staff Attendance Report', icon: <FileText size={16} className="text-blue-600" />, action: () => navigateTo('Staff Attendance') },
              { label: 'Leave Requests', icon: <CalendarX size={16} className="text-blue-600" />, action: () => navigateTo('Leave Management') },
              { label: 'Gate Pass', icon: <DoorOpen size={16} className="text-blue-600" />, action: () => navigateTo('Gate Pass') },
              { label: 'Late Coming Report', icon: <Clock size={16} className="text-blue-600" />, action: () => setDrilldown({ type: 'late', title: 'Late Coming Report' }) },
              { label: 'Attendance Settings', icon: <FileText size={16} className="text-blue-600" />, action: () => navigateTo('Attendance By Date') },
            ].map((action, i) => (
              <button key={i} type="button" onClick={action.action} className="flex flex-col items-center justify-center text-center p-1.5 rounded-lg border border-slate-100 hover:bg-blue-50 hover:border-blue-100 transition-colors group">
                <div className="w-6 h-6 rounded bg-slate-50 flex items-center justify-center mb-1 group-hover:bg-white transition-colors">{action.icon}</div>
                <span className="text-[7px] text-slate-600 group-hover:text-blue-700 font-medium leading-tight">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {drilldown && (
        <AttendanceDrilldownModal
          open
          onClose={() => setDrilldown(null)}
          type={drilldown.type}
          title={drilldown.title}
          academicYear={academicYear}
          sectionName={section}
          date={markDate}
        />
      )}

      {selectedClass && (
        <MarkAttendanceModal
          open={markModalOpen}
          onClose={() => setMarkModalOpen(false)}
          onSaved={() => void load()}
          academicYear={academicYear}
          className={selectedClass.className}
          sectionName={selectedClass.sectionName}
          sessionDate={markDate}
          mode={markMode}
          subjectName={activeTab === 'By Subject' ? subjectName : ''}
          activityName={activeTab === 'By Activity' ? activityName : ''}
        />
      )}
    </div>
  );
}
