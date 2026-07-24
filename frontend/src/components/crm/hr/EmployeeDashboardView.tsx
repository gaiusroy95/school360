import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Users,
  UserCheck,
  UserMinus,
  UserX,
  Building2,
  IndianRupee,
  ChevronDown,
  Plus,
  Gift,
  Calendar,
  FileText,
  CheckCircle2,
  Search,
  Briefcase,
  FileSignature,
  Award,
  Settings,
  ClipboardList,
  TrendingUp,
  TrendingDown,
  RefreshCcw,
  Loader2,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  Legend,
  BarChart,
  Bar,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
} from 'recharts';
import { toViewKey } from '../../../lib/navigation';
import { fetchHrDashboard, formatInr, type HrDashboard } from '../../../lib/hrServices';

const QUICK_ACTIONS = [
  { label: 'Add Employee', page: 'Employees Directory', icon: Users, color: 'text-green-600' },
  { label: 'Mark Attendance', page: 'Attendance & Leave', icon: UserCheck, color: 'text-green-600' },
  { label: 'Leave Request', page: 'Leave Management', icon: FileText, color: 'text-blue-600' },
  { label: 'Payroll Process', page: 'Payroll Management', icon: IndianRupee, color: 'text-purple-600' },
  { label: 'Salary Structure', page: 'Salary Structure', icon: ClipboardList, color: 'text-orange-600' },
  { label: 'Approve Loans', page: 'Leave Management', icon: CheckCircle2, color: 'text-green-600' },
  { label: 'Employee Transfer', page: 'Employees Directory', icon: UserMinus, color: 'text-blue-600' },
  { label: 'Certificates', page: 'Documents', icon: Award, color: 'text-blue-600' },
  { label: 'Performance Review', page: 'Performance Appraisal', icon: TrendingUp, color: 'text-red-600' },
  { label: 'Payslip', page: 'Payroll Management', icon: FileText, color: 'text-blue-600' },
  { label: 'Reports', page: 'Reports', icon: Search, color: 'text-slate-600' },
  { label: 'Settings', page: 'Attendance Policy', icon: Settings, color: 'text-slate-600' },
] as const;

const PIPELINE_ICONS: Record<string, typeof Briefcase> = {
  'Total Openings': Briefcase,
  'Applications Received': FileText,
  'Under Review': Search,
  'Interview Scheduled': Calendar,
  'Offers Sent': FileSignature,
  Joined: UserCheck,
};

type Props = {
  onNavigate?: (view: string) => void;
};

export function EmployeeDashboardView({ onNavigate }: Props) {
  const [data, setData] = useState<HrDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'Birthdays' | 'Work Anniversary'>('Birthdays');

  const go = useCallback(
    (page: string) => {
      if (onNavigate) onNavigate(toViewKey('HR & Payroll Management', page));
    },
    [onNavigate],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const dashboard = await fetchHrDashboard();
      setData(dashboard);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load HR dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const kpis = useMemo(() => {
    if (!data) return [];
    const k = data.kpis;
    return [
      {
        title: 'Total Employees',
        value: String(k.totalEmployees),
        subtitle: k.newThisMonth > 0 ? `+${k.newThisMonth} New this month` : 'Active workforce',
        trend: k.newThisMonth > 0 ? ('up' as const) : undefined,
        color: 'bg-blue-500',
        icon: <Users size={20} />,
        iconColor: 'text-blue-500',
        iconBg: 'bg-blue-100',
      },
      {
        title: 'Present Today',
        value: String(k.presentToday),
        subtitle: `${k.presentPct}%`,
        color: 'bg-green-500',
        icon: <UserCheck size={20} />,
        iconColor: 'text-green-500',
        iconBg: 'bg-green-100',
        onClick: () => go('Attendance & Leave'),
      },
      {
        title: 'On Leave Today',
        value: String(k.onLeaveToday),
        subtitle: `${k.leavePct}%`,
        color: 'bg-orange-500',
        icon: <UserMinus size={20} />,
        iconColor: 'text-orange-500',
        iconBg: 'bg-orange-100',
        onClick: () => go('Leave Management'),
      },
      {
        title: 'Absent Today',
        value: String(k.absentToday),
        subtitle: `${k.absentPct}%`,
        color: 'bg-red-500',
        icon: <UserX size={20} />,
        iconColor: 'text-red-500',
        iconBg: 'bg-red-100',
        onClick: () => go('Attendance & Leave'),
      },
      {
        title: 'Total Departments',
        value: String(k.totalDepartments),
        subtitle: 'Active Departments',
        color: 'bg-purple-500',
        icon: <Building2 size={20} />,
        iconColor: 'text-purple-500',
        iconBg: 'bg-purple-100',
        onClick: () => go('Departments'),
      },
      {
        title: 'Payroll This Month',
        value: formatInr(k.payrollGross),
        subtitle: data.payPeriodLabel,
        color: 'bg-green-500',
        icon: <IndianRupee size={20} />,
        iconColor: 'text-green-500',
        iconBg: 'bg-green-100',
        onClick: () => go('Payroll Management'),
      },
      {
        title: 'Total Deductions',
        value: formatInr(k.payrollDeductions),
        subtitle: data.payPeriodLabel,
        color: 'bg-red-500',
        icon: <IndianRupee size={20} />,
        iconColor: 'text-red-500',
        iconBg: 'bg-red-100',
        onClick: () => go('Allowances & Deductions'),
      },
      {
        title: 'Net Payroll',
        value: formatInr(k.payrollNet),
        subtitle: data.payPeriodLabel,
        color: 'bg-blue-500',
        icon: <IndianRupee size={20} />,
        iconColor: 'text-blue-500',
        iconBg: 'bg-blue-100',
        onClick: () => go('Payroll Management'),
      },
    ];
  }, [data, go]);

  const hrAnalytics = useMemo(() => {
    if (!data) return [];
    const a = data.hrAnalytics;
    return [
      { name: 'Attendance %', value: a.attendancePct, trend: '+3.26%', trendUp: true, color: '#10b981' },
      { name: 'Leave %', value: a.leavePct, trend: '-1.12%', trendUp: false, color: '#f59e0b' },
      { name: 'Overtime %', value: a.overtimePct, trend: '+0.75%', trendUp: true, color: '#3b82f6' },
      { name: 'Attrition %', value: a.attritionPct, trend: '-0.21%', trendUp: false, color: '#ef4444' },
    ];
  }, [data]);

  const celebrationList =
    activeTab === 'Birthdays' ? data?.birthdays || [] : data?.workAnniversaries || [];

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-500">
        <Loader2 className="animate-spin text-amber-500" size={28} />
        <p className="text-sm font-medium">Loading employee dashboard…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-4 h-full relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">HR & Payroll Management CRM</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage Workforce • Streamline Payroll • Automate HR Processes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-semibold"
          >
            <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => go('Employees Directory')}
            className="bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold text-xs px-4 py-2 rounded flex items-center gap-2 shadow-sm transition-colors"
          >
            <Plus size={14} />
            <span>Add New Employee</span>
            <ChevronDown size={14} />
          </button>
        </div>
      </div>

      {error && (
        <div className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {kpis.map((kpi, i) => (
          <button
            key={i}
            type="button"
            onClick={'onClick' in kpi ? kpi.onClick : undefined}
            className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden text-left"
          >
            <div className="flex items-center gap-3 mb-2">
              <div
                className={`w-8 h-8 rounded-full ${kpi.iconBg} ${kpi.iconColor} flex items-center justify-center shadow-sm shrink-0`}
              >
                {kpi.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] text-slate-500 font-bold truncate">{kpi.title}</p>
                <p className="text-[13px] font-bold text-slate-900 truncate leading-tight mt-0.5">
                  {kpi.value}
                </p>
              </div>
            </div>
            {kpi.subtitle && (
              <div className="text-[8px] text-slate-500 flex items-center gap-1">
                {kpi.trend === 'up' && <TrendingUp size={10} className="text-green-500" />}
                <span className={kpi.trend === 'up' ? 'text-green-600' : ''}>{kpi.subtitle}</span>
              </div>
            )}
            <div className={`absolute bottom-0 left-0 w-full h-0.5 ${kpi.color}`} />
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-3 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Employee Overview</h3>
          <div className="flex items-center justify-center gap-4 flex-1">
            <div className="w-24 h-24 relative shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data?.employeeOverview || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={25}
                    outerRadius={40}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {(data?.employeeOverview || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[12px] font-bold text-slate-800">{data?.kpis.totalEmployees ?? 0}</span>
                <span className="text-[7px] text-slate-500 leading-tight">Total Employees</span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 text-[9px] flex-1">
              {(data?.employeeOverview || []).map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-600 text-[9px] font-medium whitespace-nowrap">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-slate-800">{item.value}</span>
                    <span className="text-slate-400">({item.percent})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => go(data?.links.employeeOverview || 'Employees Directory')}
            className="text-center text-[9px] text-blue-600 font-medium hover:underline mt-2"
          >
            View Full Report
          </button>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-4 flex flex-col relative">
          <div className="flex justify-between items-center mb-1">
            <h3 className="text-[11px] font-bold text-slate-800">
              Employee Status <span className="font-normal text-slate-500">(This Month)</span>
            </h3>
            <button
              type="button"
              onClick={() => go(data?.links.employeeStatus || 'Attendance & Leave')}
              className="text-[9px] text-blue-600 font-medium hover:underline"
            >
              View All
            </button>
          </div>
          <div className="flex-1 w-full h-full min-h-[160px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data?.employeeStatusTrend || []}
                margin={{ top: 20, right: 10, left: -25, bottom: -10 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#64748b' }} dy={5} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#64748b' }} />
                <RechartsTooltip contentStyle={{ fontSize: '9px', borderRadius: '4px', padding: '4px' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '9px', top: -10 }} />
                <Line type="monotone" dataKey="present" name="Present" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="leave" name="On Leave" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="absent" name="Absent" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-3 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Department Wise Distribution</h3>
          <div className="flex items-center justify-center gap-4 flex-1">
            <div className="w-24 h-24 relative shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data?.departmentDistribution || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={25}
                    outerRadius={40}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {(data?.departmentDistribution || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[12px] font-bold text-slate-800">{data?.kpis.totalEmployees ?? 0}</span>
                <span className="text-[7px] text-slate-500 leading-tight">Total Employees</span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 text-[9px] flex-1">
              {(data?.departmentDistribution || []).map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-600 text-[9px] font-medium whitespace-nowrap">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-slate-800">{item.value}</span>
                    <span className="text-slate-400">({item.percent})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => go(data?.links.departmentDistribution || 'Departments')}
            className="text-center text-[9px] text-blue-600 font-medium hover:underline mt-2"
          >
            View Full Report
          </button>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-2 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Quick Actions</h3>
          <div className="grid grid-cols-3 gap-2 flex-1">
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => go(action.page)}
                  className="flex flex-col items-center justify-center text-center p-1.5 rounded-lg border border-slate-100 hover:bg-slate-50 hover:border-slate-200 transition-colors group"
                >
                  <div className="w-6 h-6 rounded flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                    <Icon size={16} className={action.color} />
                  </div>
                  <span className="text-[7px] text-slate-600 font-medium leading-tight px-0.5">{action.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-3 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Birthday & Work Anniversary</h3>
          <div className="flex border-b border-slate-200 mb-3">
            <button
              type="button"
              className={`flex-1 text-[9px] font-bold py-1.5 border-b-2 transition-colors ${activeTab === 'Birthdays' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              onClick={() => setActiveTab('Birthdays')}
            >
              Birthdays
            </button>
            <button
              type="button"
              className={`flex-1 text-[9px] font-bold py-1.5 border-b-2 transition-colors ${activeTab === 'Work Anniversary' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              onClick={() => setActiveTab('Work Anniversary')}
            >
              Work Anniversary
            </button>
          </div>
          <div className="flex-1 flex flex-col gap-3 overflow-y-auto min-h-[120px]">
            {celebrationList.length === 0 ? (
              <p className="text-[9px] text-slate-500 text-center py-6">
                {activeTab === 'Birthdays'
                  ? 'No upcoming birthdays — add date of birth in employee profiles.'
                  : 'No upcoming work anniversaries.'}
              </p>
            ) : (
              celebrationList.map((person, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600 shrink-0">
                    {person.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-slate-800 leading-tight truncate">{person.name}</p>
                    <p className="text-[8px] text-slate-500 truncate">{person.designation}</p>
                  </div>
                  <div className="text-right shrink-0 flex items-center gap-1.5">
                    <span className="text-[9px] font-bold text-slate-700">{person.date}</span>
                    <Gift size={12} className="text-red-500" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-3 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[11px] font-bold text-slate-800">
              Leave Summary <span className="font-normal text-slate-500">(This Month)</span>
            </h3>
            <button
              type="button"
              onClick={() => go(data?.links.leaveSummary || 'Leave Management')}
              className="text-[9px] text-blue-600 font-medium hover:underline"
            >
              View All
            </button>
          </div>
          <div className="grid grid-cols-4 gap-1.5 mb-3">
            <div className="bg-blue-50 border border-blue-100 rounded flex flex-col items-center justify-center p-1.5">
              <span className="text-[7px] text-slate-600 font-medium mb-0.5">Total Leaves</span>
              <span className="text-sm font-bold text-blue-600">{data?.leaveSummary.total ?? 0}</span>
            </div>
            <div className="bg-green-50 border border-green-100 rounded flex flex-col items-center justify-center p-1.5">
              <span className="text-[7px] text-slate-600 font-medium mb-0.5">Approved</span>
              <span className="text-sm font-bold text-green-600">{data?.leaveSummary.approved ?? 0}</span>
            </div>
            <div className="bg-orange-50 border border-orange-100 rounded flex flex-col items-center justify-center p-1.5">
              <span className="text-[7px] text-slate-600 font-medium mb-0.5">Pending</span>
              <span className="text-sm font-bold text-orange-600">{data?.leaveSummary.pending ?? 0}</span>
            </div>
            <div className="bg-red-50 border border-red-100 rounded flex flex-col items-center justify-center p-1.5">
              <span className="text-[7px] text-slate-600 font-medium mb-0.5">Rejected</span>
              <span className="text-sm font-bold text-red-600">{data?.leaveSummary.rejected ?? 0}</span>
            </div>
          </div>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-[9px] text-left">
              <thead>
                <tr className="text-slate-500 border-b border-slate-100">
                  <th className="pb-1 font-medium">Leave Type</th>
                  <th className="pb-1 font-medium text-center">Total</th>
                  <th className="pb-1 font-medium text-center">Approved</th>
                  <th className="pb-1 font-medium text-center">Pending</th>
                  <th className="pb-1 font-medium text-center">Rejected</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(data?.leaveSummary.rows || []).map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="py-1.5 text-slate-700 font-medium">{row.type}</td>
                    <td className="py-1.5 text-center font-bold text-slate-800">{row.total}</td>
                    <td className="py-1.5 text-center text-slate-600">{row.approved}</td>
                    <td className="py-1.5 text-center text-slate-600">{row.pending}</td>
                    <td className="py-1.5 text-center text-slate-600">{row.rejected}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-4 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[11px] font-bold text-slate-800">
              Payroll Summary <span className="font-normal text-slate-500">({data?.payPeriodLabel})</span>
            </h3>
            <button
              type="button"
              onClick={() => go(data?.links.payrollSummary || 'Payroll Management')}
              className="text-[9px] text-blue-600 font-medium hover:underline"
            >
              View Payslip
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="border border-slate-100 rounded-lg p-2 text-center bg-slate-50">
              <span className="text-[8px] text-slate-500 block mb-1">Gross Salary</span>
              <span className="text-[11px] font-bold text-slate-900">{formatInr(data?.payrollSummary.gross ?? 0)}</span>
            </div>
            <div className="border border-slate-100 rounded-lg p-2 text-center bg-slate-50">
              <span className="text-[8px] text-slate-500 block mb-1">Deductions</span>
              <span className="text-[11px] font-bold text-slate-900">
                {formatInr(data?.payrollSummary.deductions ?? 0)}
              </span>
            </div>
            <div className="border border-blue-100 rounded-lg p-2 text-center bg-blue-50">
              <span className="text-[8px] text-blue-700 block mb-1">Net Payroll</span>
              <span className="text-[11px] font-bold text-blue-700">{formatInr(data?.payrollSummary.net ?? 0)}</span>
            </div>
          </div>
          <div className="flex flex-1 gap-4 items-center">
            <div className="flex-1">
              <p className="text-[9px] font-bold text-slate-700 mb-2">Payroll Components</p>
              <div className="flex flex-col gap-1.5">
                {(data?.payrollSummary.components || []).map((comp, i) => (
                  <div key={i} className="flex justify-between text-[9px]">
                    <span className="text-slate-600">{comp.name}</span>
                    <span className="font-medium text-slate-900">{formatInr(comp.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="w-24 h-24 relative shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data?.payrollSummary.netVsDeductions || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={25}
                    outerRadius={40}
                    dataKey="value"
                    stroke="none"
                  >
                    {(data?.payrollSummary.netVsDeductions || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[6px] text-slate-500">Net Payroll</span>
                <span className="text-[8px] font-bold text-slate-800">{formatInr(data?.payrollSummary.net ?? 0)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-2 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[11px] font-bold text-slate-800">
              Top Earners <span className="font-normal text-slate-500">(This Month)</span>
            </h3>
            <button
              type="button"
              onClick={() => go(data?.links.topEarners || 'Payroll Management')}
              className="text-[9px] text-blue-600 font-medium hover:underline"
            >
              View All
            </button>
          </div>
          <div className="flex-1 flex flex-col gap-3 overflow-y-auto min-h-[120px]">
            {(data?.topEarners || []).length === 0 ? (
              <p className="text-[9px] text-slate-500 text-center py-6">No payroll slips for this month yet.</p>
            ) : (
              (data?.topEarners || []).map((person, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-600 shrink-0">
                    {person.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-bold text-slate-800 leading-tight truncate">{person.name}</p>
                    <p className="text-[8px] text-slate-500 truncate">{person.designation}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[9px] font-bold text-slate-900">{formatInr(person.amount)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-2 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[11px] font-bold text-slate-800">Recruitment Pipeline</h3>
            <button
              type="button"
              onClick={() => go(data?.links.recruitment || 'Recruitment')}
              className="text-[9px] text-blue-600 font-medium hover:underline"
            >
              View All
            </button>
          </div>
          <div className="flex flex-col gap-2 flex-1">
            {(data?.recruitmentPipeline || []).map((step, i) => {
              const Icon = PIPELINE_ICONS[step.name] || Briefcase;
              return (
                <div
                  key={i}
                  className="flex items-center justify-between p-1.5 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded bg-slate-100 flex items-center justify-center">
                      <Icon size={12} className="text-blue-500" />
                    </div>
                    <span className="text-[9px] text-slate-700 font-medium">{step.name}</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-900">
                    {step.count < 10 ? `0${step.count}` : step.count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-3 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[11px] font-bold text-slate-800">Employees on Leave Today</h3>
            <button
              type="button"
              onClick={() => go(data?.links.onLeaveToday || 'Leave Management')}
              className="text-[9px] text-blue-600 font-medium hover:underline"
            >
              View All
            </button>
          </div>
          <div className="flex-1 flex flex-col gap-3 overflow-y-auto min-h-[120px]">
            {(data?.onLeaveToday || []).length === 0 ? (
              <p className="text-[9px] text-slate-500 text-center py-6">No employees on leave today.</p>
            ) : (
              (data?.onLeaveToday || []).map((person, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600 shrink-0">
                      {person.avatar}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-slate-800 leading-tight truncate">{person.name}</p>
                      <p className="text-[8px] text-slate-500 truncate">{person.designation}</p>
                    </div>
                  </div>
                  <span className="text-[8px] text-slate-600 shrink-0 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded">
                    {person.type}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-3 flex flex-col relative">
          <div className="flex justify-between items-center mb-1">
            <h3 className="text-[11px] font-bold text-slate-800">
              Performance Overview <span className="font-normal text-slate-500">(This Year)</span>
            </h3>
            <button
              type="button"
              onClick={() => go(data?.links.performance || 'Performance Appraisal')}
              className="text-[9px] text-blue-600 font-medium hover:underline"
            >
              View Report
            </button>
          </div>
          <div className="flex items-center gap-2 mb-2 text-[8px] flex-wrap">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-sm bg-green-500" />
              <span>Excellent</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-sm bg-blue-500" />
              <span>Good</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-sm bg-orange-500" />
              <span>Average</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-sm bg-red-500" />
              <span>Needs Improvement</span>
            </div>
          </div>
          <div className="flex-1 w-full h-full min-h-[140px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data?.performanceData || []}
                margin={{ top: 5, right: 0, left: -25, bottom: -5 }}
                barSize={6}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="dept" axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#64748b' }} dy={5} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#64748b' }} />
                <RechartsTooltip cursor={{ fill: 'transparent' }} contentStyle={{ fontSize: '9px', borderRadius: '4px', padding: '4px' }} />
                <Bar dataKey="excellent" name="Excellent" fill="#10b981" radius={[2, 2, 0, 0]} />
                <Bar dataKey="good" name="Good" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                <Bar dataKey="average" name="Average" fill="#f59e0b" radius={[2, 2, 0, 0]} />
                <Bar dataKey="needsImp" name="Needs Imp" fill="#ef4444" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-2 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[11px] font-bold text-slate-800">Employee Documents</h3>
            <button
              type="button"
              onClick={() => go(data?.links.documents || 'Documents')}
              className="text-[9px] text-blue-600 font-medium hover:underline"
            >
              View All
            </button>
          </div>
          <div className="flex flex-col gap-2 flex-1">
            {(data?.employeeDocuments || []).map((doc, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-1.5 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <FileText size={12} className="text-blue-500" />
                  <span className="text-[9px] text-slate-700 font-medium">{doc.name}</span>
                </div>
                <span className="text-[9px] font-bold text-slate-900">{doc.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-2 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">
            HR Analytics <span className="font-normal text-slate-500">(This Month)</span>
          </h3>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {hrAnalytics.map((stat, i) => (
              <div key={i} className="flex flex-col items-center p-2 border border-slate-100 rounded-lg text-center">
                <span className="text-[7px] text-slate-500 font-medium mb-1 truncate w-full">{stat.name}</span>
                <div className="w-10 h-10 relative mb-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart
                      cx="50%"
                      cy="50%"
                      innerRadius="80%"
                      outerRadius="100%"
                      barSize={4}
                      data={[{ value: stat.value, fill: stat.color }]}
                      startAngle={90}
                      endAngle={-270}
                    >
                      <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                      <RadialBar dataKey="value" cornerRadius={10} background={{ fill: '#f1f5f9' }} />
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-slate-800">
                    {stat.value}%
                  </div>
                </div>
                <span
                  className={`text-[7px] font-medium flex items-center gap-0.5 ${stat.trendUp ? 'text-green-600' : 'text-red-500'}`}
                >
                  {stat.trendUp ? <TrendingUp size={8} /> : <TrendingDown size={8} />} {stat.trend}
                </span>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <div className="flex-1 bg-slate-50 rounded border border-slate-100 p-2 text-center">
              <span className="text-[7px] text-slate-500 font-medium mb-0.5 block">Average Experience</span>
              <span className="text-[10px] font-bold text-slate-900">
                {data?.hrAnalytics.avgExperienceYears ?? 0}{' '}
                <span className="text-[8px] font-normal text-slate-500">Years</span>
              </span>
            </div>
            <div className="flex-1 bg-slate-50 rounded border border-slate-100 p-2 text-center">
              <span className="text-[7px] text-slate-500 font-medium mb-0.5 block">Employee Satisfaction</span>
              <span className="text-[10px] font-bold text-slate-900">
                {data?.hrAnalytics.employeeSatisfaction ?? 0} / 5
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
