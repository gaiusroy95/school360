import { useCallback, useEffect, useState } from 'react';
import {
  Users, ClipboardCheck, FileText, IndianRupee, Activity, ChevronDown, Plus,
  AlertCircle, BookOpen, Target, Download, TrendingUp, BarChart2,
  PieChart as PieChartIcon, Lightbulb, Award, Calendar, Search,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip as RechartsTooltip, CartesianGrid, Legend, BarChart, Bar,
} from 'recharts';
import { fetchReportsDashboard, type RaDashboard } from '../../../lib/reportsAnalyticsServices';
import { toViewKey } from '../../../lib/navigation';
import { AcademicLoading } from '../FeeFinanceManagement/FeeFinanceUi';

const ICON_MAP: Record<string, React.ReactNode> = {
  users: <Users size={20} />,
  clipboard: <ClipboardCheck size={20} />,
  file: <FileText size={20} />,
  rupee: <IndianRupee size={20} />,
  activity: <Activity size={20} />,
};

const ALERT_ICON: Record<string, React.ReactNode> = {
  alert: <AlertCircle size={14} />,
  target: <Target size={14} />,
  book: <BookOpen size={14} />,
  calendar: <Calendar size={14} />,
};

const INSIGHT_ICON: Record<string, React.ReactNode> = {
  users: <Users size={14} className="text-blue-500" />,
  target: <Target size={14} className="text-green-500" />,
  file: <FileText size={14} className="text-red-500" />,
  activity: <Activity size={14} className="text-amber-500" />,
};

const TOOL_ICON: Record<string, React.ReactNode> = {
  bar: <BarChart2 size={18} className="text-blue-600" />,
  download: <Download size={18} className="text-green-600" />,
  trend: <TrendingUp size={18} className="text-amber-600" />,
  target: <Target size={18} className="text-red-600" />,
  search: <Search size={18} className="text-purple-600" />,
  pie: <PieChartIcon size={18} className="text-indigo-600" />,
};

const Sparkline = ({ color }: { color: string }) => (
  <svg width="60" height="15" className="ml-auto opacity-70">
    <path d="M0,12 L10,8 L20,10 L30,5 L40,7 L50,2 L60,0" fill="none" stroke={color} strokeWidth="1.5" />
  </svg>
);

const RANK_COLORS = ['text-yellow-500', 'text-slate-400', 'text-amber-700', 'text-blue-500', 'text-blue-500'];

type Props = {
  onNavigate?: (view: string) => void;
};

export function ReportsDashboardView({ onNavigate }: Props) {
  const [data, setData] = useState<RaDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [period, setPeriod] = useState('month');

  const load = useCallback(async (seed = false) => {
    setLoading(true);
    try {
      const result = await fetchReportsDashboard(academicYear, period, seed);
      setData(result);
      setAcademicYear(result.academicYear);
      setPeriod(result.period);
    } finally {
      setLoading(false);
    }
  }, [academicYear, period]);

  useEffect(() => { void load(true); }, [academicYear, period]);

  if (loading && !data) return <AcademicLoading label="Loading Reports Dashboard..." />;

  const d = data!;

  return (
    <div className="flex flex-col space-y-4 h-full relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Reports & Analytics Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">Real-time Insights • Data-driven Decisions • Better Outcomes</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded px-3 py-1.5 shadow-sm">
            <select
              className="bg-transparent border-none outline-none text-slate-700 cursor-pointer appearance-none pr-4"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              {d.periods.map((p) => (
                <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
              ))}
            </select>
            <ChevronDown size={14} className="ml-[-12px] text-slate-400 pointer-events-none" />
          </div>
          <div className="flex items-center text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded px-3 py-1.5 shadow-sm">
            <select
              className="bg-transparent border-none outline-none text-slate-700 cursor-pointer appearance-none pr-4"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
            >
              {d.academicYears.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <ChevronDown size={14} className="ml-[-12px] text-slate-400 pointer-events-none" />
          </div>
          <button
            type="button"
            onClick={() => onNavigate?.(toViewKey('Reports & Analytics', 'Custom Reports'))}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded flex items-center gap-2 shadow-sm transition-colors"
          >
            <Plus size={14} />
            <span>Generate Custom Report</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {d.kpis.map((kpi, i) => (
          <div key={i} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-8 h-8 rounded-full ${kpi.bg} ${kpi.color} flex items-center justify-center shadow-sm shrink-0`}>
                {ICON_MAP[kpi.iconType] ?? <Activity size={20} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] text-slate-500 font-bold truncate">{kpi.title}</p>
                <p className="text-[14px] font-bold text-slate-900 truncate leading-tight mt-0.5">{kpi.value}</p>
              </div>
            </div>
            <div className="flex flex-col justify-end min-h-[20px]">
              {kpi.subtitle && (
                <div className={`text-[8px] flex items-center gap-1 font-bold ${kpi.subtitleColor}`}>
                  {kpi.subtitle}
                </div>
              )}
              {kpi.sparkColor && (
                <div className="mt-1">
                  <Sparkline color={kpi.sparkColor} />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4">
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 shadow-sm xl:col-span-2 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-4">Module Report Map</h3>
          <div className="flex flex-col gap-2 flex-1 overflow-y-auto max-h-[280px]">
            {d.moduleMap.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => onNavigate?.(toViewKey('Reports & Analytics', m.label))}
                className="text-left bg-white border border-slate-100 rounded-lg px-3 py-2 hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <p className="text-[9px] font-bold text-slate-800">{m.label}</p>
                <p className="text-[8px] text-blue-600">{m.reportCount} reports synced</p>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-4 flex flex-col relative group">
          <div className="flex justify-between items-center mb-1">
            <h3 className="text-[11px] font-bold text-slate-800">Attendance Overview</h3>
            <span className="text-[9px] text-slate-400">{d.refreshedAt.slice(0, 10)}</span>
          </div>
          <div className="flex-1 w-full min-h-[140px] relative mt-2 mb-2 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={d.attendanceTrend} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 7, fill: '#64748b' }} dy={5} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 7, fill: '#64748b' }} domain={[0, 100]} tickFormatter={(val) => `${val}%`} />
                <RechartsTooltip contentStyle={{ fontSize: '9px', borderRadius: '4px', padding: '4px' }} />
                <Legend wrapperStyle={{ fontSize: '8px', top: -15, right: 0 }} iconType="circle" />
                <Line type="monotone" dataKey="attendance" name="Attendance %" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: '#3b82f6', strokeWidth: 1, stroke: '#fff' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center border-t border-slate-100 pt-3">
            <div>
              <span className="text-[7px] text-slate-500 font-medium block mb-1">Present</span>
              <span className="text-[12px] font-bold text-slate-800 block">{d.attendanceSummary.present.toLocaleString()}</span>
              <span className="text-[8px] font-bold text-green-600">{d.attendanceSummary.presentPct}%</span>
            </div>
            <div>
              <span className="text-[7px] text-slate-500 font-medium block mb-1">Absent</span>
              <span className="text-[12px] font-bold text-slate-800 block">{d.attendanceSummary.absent.toLocaleString()}</span>
              <span className="text-[8px] font-bold text-red-600">{d.attendanceSummary.absentPct}%</span>
            </div>
            <div>
              <span className="text-[7px] text-slate-500 font-medium block mb-1">On Leave</span>
              <span className="text-[12px] font-bold text-slate-800 block">{d.attendanceSummary.onLeave.toLocaleString()}</span>
              <span className="text-[8px] font-bold text-amber-500">{d.attendanceSummary.leavePct}%</span>
            </div>
            <div>
              <span className="text-[7px] text-slate-500 font-medium block mb-1">Late</span>
              <span className="text-[12px] font-bold text-slate-800 block">{d.attendanceSummary.late.toLocaleString()}</span>
              <span className="text-[8px] font-bold text-purple-600">{d.attendanceSummary.latePct}%</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col group">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[11px] font-bold text-slate-800">Student Performance (Exam)</h3>
            <button type="button" onClick={() => onNavigate?.(toViewKey('Reports & Analytics', 'Examination Reports'))} className="text-[9px] text-blue-600 font-medium hover:underline">View</button>
          </div>
          <div className="flex items-center justify-center gap-4 flex-1">
            <div className="w-24 h-24 relative shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={d.examPerformance} cx="50%" cy="50%" innerRadius={28} outerRadius={40} dataKey="value" stroke="none">
                    {d.examPerformance.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[14px] font-bold text-slate-800">{d.examPassPct}%</span>
                <span className="text-[6px] text-slate-500 leading-tight">Pass Percentage</span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 text-[8px] flex-1">
              {d.examPerformance.map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-600 font-medium truncate" title={item.name}>{item.name}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-1">
                    <span className="font-bold text-slate-800">{item.value.toLocaleString()}</span>
                    <span className="text-slate-400">({item.percent})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="text-center mt-3 border-t border-slate-100 pt-2 text-[9px] font-bold text-blue-900">
            Total Students: {d.totalExamStudents.toLocaleString()}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col group">
          <div className="flex justify-between items-center mb-1">
            <h3 className="text-[11px] font-bold text-slate-800">Fee Collection Overview</h3>
            <button type="button" onClick={() => onNavigate?.(toViewKey('Reports & Analytics', 'Finance Reports'))} className="text-[9px] text-blue-600 font-medium hover:underline">View</button>
          </div>
          <div className="flex-1 w-full h-full min-h-[140px] relative mt-2 mb-2 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.feeTrend} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 7, fill: '#64748b' }} dy={5} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 7, fill: '#64748b' }} />
                <RechartsTooltip contentStyle={{ fontSize: '9px', borderRadius: '4px', padding: '4px' }} />
                <Bar dataKey="collection" name="Collection (Cr)" fill="#2563eb" radius={[2, 2, 0, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center border-t border-slate-100 pt-3">
            <div>
              <span className="text-[7px] text-slate-500 font-medium block mb-1">Total Collected</span>
              <span className="text-[10px] font-bold text-green-700">{d.feeSummary.totalCollected}</span>
            </div>
            <div>
              <span className="text-[7px] text-slate-500 font-medium block mb-1">Total Due</span>
              <span className="text-[10px] font-bold text-red-600">{d.feeSummary.totalDue}</span>
            </div>
            <div>
              <span className="text-[7px] text-slate-500 font-medium block mb-1">Collection %</span>
              <span className="text-[10px] font-bold text-green-600">{d.feeSummary.collectionPct}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-4 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[11px] font-bold text-slate-800">Academic Performance Summary</h3>
            <button type="button" onClick={() => onNavigate?.(toViewKey('Reports & Analytics', 'Academic Reports'))} className="text-[9px] text-blue-600 font-medium hover:underline">View Report</button>
          </div>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-[8px]">
              <thead>
                <tr className="text-slate-500 border-b border-slate-100">
                  <th className="text-left py-1.5 font-bold">Class</th>
                  <th className="text-center py-1.5 font-bold">Students</th>
                  <th className="text-center py-1.5 font-bold">Avg %</th>
                  <th className="text-center py-1.5 font-bold">Pass %</th>
                </tr>
              </thead>
              <tbody>
                {d.academicPerformance.map((row, i) => (
                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="py-1.5 font-bold text-slate-800">{row.class}</td>
                    <td className="py-1.5 text-center text-slate-600">{row.total}</td>
                    <td className="py-1.5 text-center font-bold text-blue-600">{row.avg}</td>
                    <td className="py-1.5 text-center font-bold text-green-600">{row.pass}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-2 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Student Strength</h3>
          <div className="flex-1 space-y-2">
            {d.studentStrength.map((item, i) => (
              <div key={i}>
                <div className="flex justify-between text-[8px] mb-0.5">
                  <span className="font-medium text-slate-700">{item.name}</span>
                  <span className="font-bold text-slate-800">{item.value.toLocaleString()} ({item.percent})</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: item.percent, backgroundColor: item.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3 flex items-center gap-1.5">
            <Award size={12} className="text-amber-500" /> Top Performers
          </h3>
          <div className="flex-1 space-y-2">
            {d.topPerformers.map((p) => (
              <div key={p.rank} className="flex items-center gap-2 bg-slate-50 rounded-lg px-2 py-1.5">
                <span className={`text-[10px] font-bold ${RANK_COLORS[p.rank - 1] ?? 'text-slate-400'}`}>#{p.rank}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-bold text-slate-800 truncate">{p.name}</p>
                  <p className="text-[7px] text-slate-500">{p.class}</p>
                </div>
                <span className="text-[9px] font-bold text-green-600">{p.percent}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3 flex items-center gap-1.5">
            <AlertCircle size={12} className="text-red-500" /> Alerts & Notifications
          </h3>
          <div className="flex-1 space-y-2">
            {d.alerts.map((alert, i) => (
              <div key={i} className={`flex items-center justify-between gap-2 p-2 rounded-lg ${alert.bg}`}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className={alert.color}>{ALERT_ICON[alert.iconType] ?? <AlertCircle size={14} />}</span>
                  <span className="text-[8px] font-medium text-slate-700 truncate">{alert.text}</span>
                </div>
                <span className="text-[8px] font-bold text-slate-800 shrink-0">{alert.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Quick Reports</h3>
          <div className="grid grid-cols-2 gap-2">
            {d.quickReports.map((qr, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  const view = d.moduleMap.find((m) => m.key === qr.category)?.label;
                  if (view) onNavigate?.(toViewKey('Reports & Analytics', view));
                }}
                className="flex flex-col items-center gap-1.5 p-3 bg-slate-50 hover:bg-blue-50 rounded-lg border border-slate-100 hover:border-blue-200 transition-colors"
              >
                <FileText size={18} className="text-blue-600" />
                <span className="text-[8px] font-bold text-slate-700 text-center">{qr.label}</span>
                <span className="text-[7px] text-slate-400">{qr.reportCount} reports</span>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Analytics Tools</h3>
          <div className="grid grid-cols-1 gap-2">
            {d.analyticsTools.map((tool, i) => (
              <div key={i} className={`flex items-start gap-2 p-2 rounded-lg ${tool.bg}`}>
                {TOOL_ICON[tool.iconType]}
                <div>
                  <p className="text-[9px] font-bold text-slate-800">{tool.title}</p>
                  <p className="text-[7px] text-slate-500">{tool.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Recent Report Runs</h3>
          <div className="flex-1 space-y-2 overflow-y-auto max-h-[200px]">
            {d.recentRuns.length === 0 ? (
              <p className="text-[9px] text-slate-400 text-center py-4">No reports generated yet</p>
            ) : (
              d.recentRuns.map((run) => (
                <div key={run.id} className="text-[8px] bg-slate-50 rounded p-2 border border-slate-100">
                  <p className="font-bold text-slate-800 truncate">{run.reportName}</p>
                  <p className="text-slate-500">{run.sourceModule} • {run.rowCount} rows • {run.time}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col group">
          <h3 className="text-[11px] font-bold text-slate-800 mb-4 flex items-center gap-1.5">
            <Lightbulb size={12} className="text-amber-500" /> Data Insights
          </h3>
          <div className="flex-1 flex flex-col gap-3 justify-center">
            {d.dataInsights.map((insight, i) => (
              <div key={i} className="flex gap-2 items-start bg-slate-50 p-2 rounded-lg border border-slate-100">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${insight.bg}`}>
                  {INSIGHT_ICON[insight.iconType]}
                </div>
                <p className="text-[8.5px] text-slate-700 font-medium leading-snug flex-1">{insight.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-2 text-center pb-2">
        <p className="text-[9px] text-slate-500 font-medium">
          Reports & Analytics help you make data-driven decisions and improve overall institutional efficiency.
        </p>
      </div>
    </div>
  );
}
