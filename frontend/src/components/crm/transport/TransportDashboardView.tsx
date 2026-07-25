import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bus, Map as MapIcon, Users, Navigation, ChevronDown, Plus, Wrench,
  ShieldAlert, CheckCircle2, AlertTriangle, Clock, School, UserCheck,
  Settings, FileText, Bell, Activity, IndianRupee, RefreshCw, Info,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { fetchTransportDashboard, type TransportDashboard } from '../../../lib/transportServices';
import { toViewKey } from '../../../lib/navigation';
import { AcademicLoading } from '../FeeFinanceManagement/FeeFinanceUi';

const KPI_ICONS = [
  { icon: <Bus size={20} />, iconColor: 'text-amber-500', iconBg: 'bg-amber-100', bar: 'bg-amber-500' },
  { icon: <Navigation size={20} />, iconColor: 'text-teal-500', iconBg: 'bg-teal-100', bar: 'bg-teal-500' },
  { icon: <Users size={20} />, iconColor: 'text-indigo-500', iconBg: 'bg-indigo-100', bar: 'bg-indigo-500' },
  { icon: <Activity size={20} />, iconColor: 'text-green-500', iconBg: 'bg-green-100', bar: 'bg-green-500' },
  { icon: <Bus size={20} />, iconColor: 'text-blue-500', iconBg: 'bg-blue-100', bar: 'bg-blue-500' },
  { icon: <Wrench size={20} />, iconColor: 'text-red-500', iconBg: 'bg-red-100', bar: 'bg-red-500' },
];

const ACTIVITY_BG: Record<string, string> = {
  green: 'bg-green-500', amber: 'bg-amber-500', blue: 'bg-blue-500', red: 'bg-red-500',
};

const BUS_PIN_BG: Record<string, string> = {
  green: 'bg-green-500', amber: 'bg-amber-500', purple: 'bg-purple-500', red: 'bg-red-500',
};

const ALERT_BG: Record<string, string> = {
  green: 'bg-green-500', amber: 'bg-amber-500', red: 'bg-red-500',
};

const QUICK_ICONS = [
  <MapIcon size={16} className="text-blue-600" key="0" />,
  <Users size={16} className="text-blue-600" key="1" />,
  <Navigation size={16} className="text-blue-600" key="2" />,
  <UserCheck size={16} className="text-green-600" key="3" />,
  <Wrench size={16} className="text-blue-600" key="4" />,
  <FileText size={16} className="text-slate-600" key="5" />,
  <Bell size={16} className="text-blue-600" key="6" />,
  <Settings size={16} className="text-slate-600" key="7" />,
];

function activityIcon(color: string) {
  if (color === 'green') return <CheckCircle2 size={12} className="text-white" />;
  if (color === 'amber') return <Users size={12} className="text-white" />;
  if (color === 'blue') return <Navigation size={12} className="text-white" />;
  return <Clock size={12} className="text-white" />;
}

function alertIcon(color: string) {
  if (color === 'green') return <CheckCircle2 size={14} className="text-white" />;
  if (color === 'red') return <ShieldAlert size={14} className="text-white" />;
  return <AlertTriangle size={14} className="text-white" />;
}

export function TransportDashboardView({ onNavigate }: { onNavigate?: (view: string) => void }) {
  const [data, setData] = useState<TransportDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [routeFilter, setRouteFilter] = useState('All Routes');
  const [activeTripTab, setActiveTripTab] = useState<'MORNING' | 'EVENING'>('MORNING');

  const load = useCallback(async (seed = false) => {
    setLoading(true);
    try {
      setData(await fetchTransportDashboard(seed, academicYear));
    } finally {
      setLoading(false);
    }
  }, [academicYear]);

  useEffect(() => { void load(); }, [load]);

  const kpiList = useMemo(() => {
    if (!data) return [];
    const k = data.kpis;
    return [
      { title: 'Total Buses', value: String(k.totalBuses.value), subtitle: k.totalBuses.subtitle, trendUp: k.totalBuses.trendUp },
      { title: 'Active Routes', value: String(k.activeRoutes.value), subtitle: k.activeRoutes.subtitle },
      { title: 'Students Using Transport', value: String(k.studentsUsingTransport.value), subtitle: k.studentsUsingTransport.subtitle },
      { title: 'On Trip Now', value: k.onTripNow.value, subtitle: k.onTripNow.subtitle, statusColor: `bg-${k.onTripNow.statusColor}-500` },
      { title: 'In Campus', value: k.inCampus.value, subtitle: k.inCampus.subtitle, statusColor: `bg-${k.inCampus.statusColor}-500` },
      { title: 'Under Maintenance', value: k.underMaintenance.value, subtitle: k.underMaintenance.subtitle, statusColor: `bg-${k.underMaintenance.statusColor}-500` },
    ];
  }, [data]);

  const filteredTrips = useMemo(
    () => (data?.trips ?? []).filter((t) => t.tripType === activeTripTab),
    [data, activeTripTab],
  );

  const attendanceChart = useMemo(() => {
    if (!data) return [];
    return [
      { name: 'Completed', value: data.attendance.pct, color: '#10b981' },
      { name: 'Remaining', value: 100 - data.attendance.pct, color: '#e2e8f0' },
    ];
  }, [data]);

  const nav = (target: string) => {
    if (onNavigate) onNavigate(toViewKey('Transport Management', target));
  };

  if (loading && !data) return <AcademicLoading />;

  return (
    <div className="flex flex-col space-y-4 h-full relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Transport Management CRM</h2>
          <p className="text-xs text-slate-500 mt-0.5">Safe • Smart • Reliable School Transport</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            className="text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded px-3 py-1.5 shadow-sm"
          >
            {(data?.academicYears ?? ['2025-26']).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select
            value={routeFilter}
            onChange={(e) => setRouteFilter(e.target.value)}
            className="text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded px-3 py-1.5 shadow-sm"
          >
            {(data?.routeFilterOptions ?? ['All Routes']).map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <button
            type="button"
            onClick={() => void load(true)}
            className="bg-white border border-slate-200 text-slate-700 font-bold text-xs px-3 py-2 rounded flex items-center gap-1 shadow-sm"
          >
            <RefreshCw size={14} /> Demo
          </button>
          <button
            type="button"
            onClick={() => nav('Route & Vehicle Master')}
            className="bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold text-xs px-4 py-2 rounded flex items-center gap-2 shadow-sm"
          >
            <Plus size={14} />
            <span>Add New Route</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpiList.map((kpi, i) => {
          const meta = KPI_ICONS[i];
          return (
            <div key={kpi.title} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-8 h-8 rounded-full ${meta.iconBg} ${meta.iconColor} flex items-center justify-center shadow-sm shrink-0`}>
                  {meta.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] text-slate-500 font-bold truncate">{kpi.title}</p>
                  <p className="text-[13px] font-bold text-slate-900 truncate leading-tight mt-0.5">{kpi.value}</p>
                </div>
              </div>
              {kpi.subtitle && (
                <div className="text-[8px] text-slate-500 flex items-center gap-1">
                  {kpi.statusColor ? <div className={`w-1.5 h-1.5 rounded-full ${kpi.statusColor}`} /> : kpi.trendUp ? <span className="text-green-500">↑</span> : null}
                  <span className={kpi.trendUp ? 'text-green-600' : ''}>{kpi.subtitle}</span>
                </div>
              )}
              <div className={`absolute bottom-0 left-0 w-full h-0.5 ${meta.bar}`} />
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-6 flex flex-col md:flex-row gap-4">
          <div className="flex-1 flex flex-col min-h-[250px]">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-[11px] font-bold text-slate-800">Live Vehicle Tracking</h3>
              {data?.liveTracking.isLive && (
                <span className="bg-green-500 text-white text-[8px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  LIVE
                </span>
              )}
            </div>
            <div className="flex-1 bg-blue-50/50 rounded-lg border border-slate-200 relative overflow-hidden flex items-center justify-center min-h-[200px]">
              <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '20px 20px', opacity: 0.5 }} />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center text-white shadow-lg z-10">
                  <School size={16} />
                </div>
                <span className="text-[9px] font-bold text-slate-800 mt-1 bg-white/80 px-1 rounded">School</span>
              </div>
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <path d="M 50% 50% L 30% 30% L 20% 40%" stroke="#f59e0b" strokeWidth="2" fill="none" strokeDasharray="4 2" />
                <path d="M 50% 50% L 70% 30% L 80% 20%" stroke="#10b981" strokeWidth="2" fill="none" strokeDasharray="4 2" />
                <path d="M 50% 50% L 20% 70% L 30% 80%" stroke="#8b5cf6" strokeWidth="2" fill="none" strokeDasharray="4 2" />
                <path d="M 50% 50% L 80% 70% L 70% 90%" stroke="#ef4444" strokeWidth="2" fill="none" strokeDasharray="4 2" />
              </svg>
              {(data?.liveTracking.vehicles ?? []).map((v) => (
                <div
                  key={v.busLabel}
                  className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
                  style={{ top: `${v.topPct}%`, left: `${v.leftPct}%` }}
                >
                  <div className={`${BUS_PIN_BG[v.color] ?? 'bg-slate-500'} text-white p-1 rounded-full shadow-md`}>
                    <Bus size={12} />
                  </div>
                  <div className="bg-white border border-slate-200 rounded px-1.5 py-0.5 mt-1 shadow-sm text-center">
                    <div className="text-[8px] font-bold text-slate-800">{v.busLabel}</div>
                    <div className="text-[6px] text-slate-500">On Trip</div>
                  </div>
                </div>
              ))}
            </div>
            {data?.liveTracking.gpsNote && (
              <div className="mt-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg flex gap-2 items-start">
                <Info size={12} className="text-blue-600 shrink-0 mt-0.5" />
                <p className="text-[9px] text-blue-700 leading-snug">{data.liveTracking.gpsNote}</p>
              </div>
            )}
          </div>
          <div className="w-full md:w-48 xl:w-56 flex flex-col">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-[11px] font-bold text-slate-800">Recent Updates</h3>
              <button type="button" onClick={() => nav(data?.navigationTargets.allUpdates ?? 'Live Vehicle Tracking')} className="text-[9px] text-blue-600 font-medium hover:underline">View All</button>
            </div>
            <div className="flex-1 flex flex-col gap-4 overflow-y-auto relative pl-2">
              <div className="absolute left-[13px] top-2 bottom-2 w-px bg-slate-200" />
              {(data?.recentUpdates ?? []).map((update) => (
                <div key={`${update.title}-${update.time}`} className="flex gap-3 relative z-10">
                  <div className={`w-6 h-6 rounded-full ${ACTIVITY_BG[update.color] ?? 'bg-slate-400'} flex items-center justify-center shrink-0 border-2 border-white shadow-sm`}>
                    {activityIcon(update.color)}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <p className="text-[10px] font-bold text-slate-800 leading-tight">{update.title}</p>
                    <p className="text-[9px] text-slate-600 mt-0.5 truncate">{update.desc}</p>
                    <p className="text-[8px] text-slate-400 mt-0.5">{update.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <div className="flex justify-between items-center mb-1">
            <h3 className="text-[11px] font-bold text-slate-800">Route Wise Ridership</h3>
            <select className="text-[9px] border border-slate-200 rounded text-slate-600 focus:outline-none">
              <option>This Month</option>
            </select>
          </div>
          <div className="flex justify-end mb-2 text-[8px] text-slate-500 items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-blue-500" /> No. of Students
          </div>
          <div className="flex-1 w-full min-h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.ridership ?? []} margin={{ top: 10, right: 0, left: -25, bottom: 0 }} barSize={12}>
                <XAxis dataKey="route" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b' }} dy={5} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b' }} />
                <RechartsTooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ fontSize: '10px', borderRadius: '4px', padding: '4px' }} />
                <Bar dataKey="students" radius={[2, 2, 0, 0]}>
                  {(data?.ridership ?? []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Transport Attendance <span className="font-normal text-slate-500">(Today)</span></h3>
          <div className="flex items-center gap-4 flex-1">
            <div className="w-24 h-24 relative shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={attendanceChart} cx="50%" cy="50%" innerRadius={28} outerRadius={40} dataKey="value" stroke="none">
                    {attendanceChart.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[13px] font-bold text-slate-800">{data?.attendance.pct}%</span>
                <span className="text-[6px] text-slate-500 leading-tight">Students<br />Picked & Dropped</span>
              </div>
            </div>
            <div className="flex-1 flex flex-col gap-2 text-[9px]">
              {(data?.attendance.stats ?? []).map((stat) => (
                <div key={stat.name} className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 size={10} style={{ color: stat.color }} />
                    <span className="text-slate-600">{stat.name}</span>
                  </div>
                  <span className="font-bold text-slate-800">{stat.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-5 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[11px] font-bold text-slate-800">Today&apos;s Trips</h3>
            <span className="text-[8px] font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200">In Progress</span>
          </div>
          <div className="flex gap-2 mb-3">
            {(['MORNING', 'EVENING'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                className={`text-[9px] font-bold py-1.5 px-4 rounded-full transition-colors ${activeTripTab === tab ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
                onClick={() => setActiveTripTab(tab)}
              >
                {tab === 'MORNING' ? 'Morning Trip' : 'Evening Trip'}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-[9px] text-left">
              <thead>
                <tr className="text-slate-500 border-b border-slate-100">
                  <th className="pb-2 font-medium">Bus No.</th>
                  <th className="pb-2 font-medium">Route</th>
                  <th className="pb-2 font-medium">Driver</th>
                  <th className="pb-2 font-medium text-center">Stops</th>
                  <th className="pb-2 font-medium text-center">Students</th>
                  <th className="pb-2 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredTrips.map((row) => (
                  <tr key={`${row.busNo}-${row.tripType}`} className="hover:bg-slate-50">
                    <td className="py-2 text-slate-800 font-bold">{row.busNo}</td>
                    <td className="py-2 text-slate-600">{row.route}</td>
                    <td className="py-2 text-slate-600">{row.driver}</td>
                    <td className="py-2 text-center text-slate-600">{row.stops}</td>
                    <td className="py-2 text-center text-slate-600">{row.students}</td>
                    <td className="py-2 text-right font-bold text-green-600">{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-2 text-center">
            <button type="button" onClick={() => nav(data?.navigationTargets.allTrips ?? 'Trip Management')} className="text-[9px] text-blue-600 font-medium hover:underline">View All Trips</button>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-4 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-4">Vehicle Health & Maintenance</h3>
          <div className="flex items-center gap-4 flex-1">
            <div className="flex flex-col items-center flex-1">
              <div className="w-24 h-24 relative shrink-0 mb-3">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data?.vehicleHealth.segments ?? []} cx="50%" cy="50%" innerRadius={25} outerRadius={40} dataKey="value" stroke="none">
                      {(data?.vehicleHealth.segments ?? []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-[13px] font-bold text-slate-800">{data?.vehicleHealth.total}</span>
                  <span className="text-[7px] text-slate-500 leading-tight">Total Vehicles</span>
                </div>
              </div>
              <div className="w-full grid grid-cols-2 gap-x-2 gap-y-1.5 text-[8px]">
                {(data?.vehicleHealth.segments ?? []).map((stat) => (
                  <div key={stat.name} className="flex justify-between items-center">
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stat.color }} />
                      <span className="text-slate-600 truncate">{stat.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-slate-800">{stat.value}</span>
                      <span className="text-slate-400">({data?.vehicleHealth.total ? Math.round((stat.value / data.vehicleHealth.total) * 100) : 0}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="w-px h-full bg-slate-100 hidden sm:block" />
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <h4 className="text-[9px] font-bold text-slate-700 mb-2">Next Service Due</h4>
                <div className="flex flex-col gap-2">
                  {(data?.vehicleHealth.nextServiceDue ?? []).map((m) => (
                    <div key={m.busLabel} className="text-[9px] bg-blue-50 text-blue-700 border border-blue-100 px-2 py-1.5 rounded">
                      <span className="font-bold">{m.busLabel}</span> - Due in {m.dueInDays} days
                    </div>
                  ))}
                </div>
              </div>
              <button type="button" onClick={() => nav(data?.navigationTargets.maintenance ?? 'Maintenance & Service')} className="mt-3 w-full bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-[9px] font-bold py-1.5 rounded">
                View Maintenance
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[11px] font-bold text-slate-800">Safety & Alerts</h3>
            <button type="button" onClick={() => nav(data?.navigationTargets.allAlerts ?? 'Safety & Alerts')} className="text-[9px] text-blue-600 font-medium hover:underline">View All</button>
          </div>
          <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
            {(data?.safetyAlerts ?? []).map((alert) => (
              <div key={`${alert.title}-${alert.time}`} className="flex gap-2">
                <div className={`w-6 h-6 rounded-full ${ALERT_BG[alert.color] ?? 'bg-slate-400'} flex items-center justify-center shrink-0`}>
                  {alertIcon(alert.color)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <p className="text-[9px] font-bold text-slate-800 leading-tight">{alert.title}</p>
                    <span className="text-[8px] text-slate-500 whitespace-nowrap ml-2">{alert.time}</span>
                  </div>
                  <p className="text-[9px] text-slate-600 mt-0.5 leading-snug">{alert.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[11px] font-bold text-slate-800">Transport Fees Summary</h3>
          </div>
          <div className="grid grid-cols-3 gap-2 flex-1 mb-4">
            <div className="bg-blue-50 rounded-lg border border-blue-100 p-2 flex flex-col items-center justify-center text-center">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mb-1">
                <IndianRupee size={12} className="text-blue-600" />
              </div>
              <span className="text-[8px] text-blue-700 font-medium mb-1">Total Dues</span>
              <span className="text-[11px] font-bold text-slate-900">{data?.feesSummary.totalDues}</span>
            </div>
            <div className="bg-green-50 rounded-lg border border-green-100 p-2 flex flex-col items-center justify-center text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 p-1"><CheckCircle2 size={10} className="text-green-500 opacity-50" /></div>
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mb-1">
                <IndianRupee size={12} className="text-green-600" />
              </div>
              <span className="text-[8px] text-green-700 font-medium mb-1">Collected</span>
              <span className="text-[11px] font-bold text-slate-900 leading-tight">{data?.feesSummary.collected}</span>
              <span className="text-[8px] text-green-600 font-bold mt-0.5">({data?.feesSummary.collectedPct}%)</span>
            </div>
            <div className="bg-red-50 rounded-lg border border-red-100 p-2 flex flex-col items-center justify-center text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 p-1"><AlertTriangle size={10} className="text-red-500 opacity-50" /></div>
              <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center mb-1">
                <IndianRupee size={12} className="text-red-600" />
              </div>
              <span className="text-[8px] text-red-700 font-medium mb-1">Pending</span>
              <span className="text-[11px] font-bold text-slate-900 leading-tight">{data?.feesSummary.pending}</span>
              <span className="text-[8px] text-red-600 font-bold mt-0.5">({data?.feesSummary.pendingPct}%)</span>
            </div>
          </div>
          <button type="button" onClick={() => nav(data?.navigationTargets.feeReport ?? 'Transport Fees')} className="w-full bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-[10px] font-bold py-1.5 rounded">
            View Fee Report
          </button>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-4 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[11px] font-bold text-slate-800">Top Routes by Students</h3>
            <button type="button" onClick={() => nav(data?.navigationTargets.allRoutes ?? 'Route & Vehicle Master')} className="text-[9px] text-blue-600 font-medium hover:underline">View All</button>
          </div>
          <div className="flex flex-col gap-3 flex-1">
            {(data?.topRoutes ?? []).map((route) => (
              <div key={route.name} className="flex items-center gap-3">
                <span className="text-[9px] font-bold text-slate-500 w-3">{route.rank}</span>
                <span className="text-[9px] font-medium text-slate-700 w-32 truncate">{route.name}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-blue-500 h-full rounded-full" style={{ width: `${route.percentage}%` }} />
                </div>
                <span className="text-[9px] font-medium text-slate-600 w-16 text-right">{route.students} Students</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-2 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-4">Driver & Attendant</h3>
          <div className="text-center mb-4">
            <span className="text-[9px] text-slate-500">Total Staff</span>
            <span className="text-[14px] font-bold text-slate-900 ml-2">{data?.staff.total}</span>
          </div>
          <div className="flex gap-2 flex-1 mb-3">
            <div className="flex-1 border border-slate-100 rounded-lg p-2 flex flex-col items-center justify-center text-center">
              <UserCheck size={16} className="text-blue-500 mb-1" />
              <span className="text-[8px] text-slate-600 mb-0.5">Drivers</span>
              <span className="text-[12px] font-bold text-slate-900">{data?.staff.drivers.total}</span>
              <span className="text-[7px] text-green-600 font-medium">On Duty: {data?.staff.drivers.onDuty}</span>
            </div>
            <div className="flex-1 border border-slate-100 rounded-lg p-2 flex flex-col items-center justify-center text-center">
              <Users size={16} className="text-amber-500 mb-1" />
              <span className="text-[8px] text-slate-600 mb-0.5">Attendants</span>
              <span className="text-[12px] font-bold text-slate-900">{data?.staff.attendants.total}</span>
              <span className="text-[7px] text-green-600 font-medium">On Duty: {data?.staff.attendants.onDuty}</span>
            </div>
          </div>
          <button type="button" onClick={() => nav(data?.navigationTargets.staffDirectory ?? 'Driver & Attendant')} className="w-full bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-[10px] font-bold py-1.5 rounded">
            View Directory
          </button>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Quick Actions</h3>
          <div className="grid grid-cols-4 gap-2 flex-1">
            {(data?.quickActions ?? []).map((action, i) => (
              <button
                key={action.label}
                type="button"
                onClick={() => nav(action.target)}
                className="flex flex-col items-center justify-start text-center p-2 rounded-lg border border-slate-100 hover:bg-slate-50 hover:border-slate-200 transition-colors group"
              >
                <div className="w-6 h-6 rounded flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                  {QUICK_ICONS[i]}
                </div>
                <span className="text-[7px] text-slate-600 font-medium leading-tight px-0.5">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
