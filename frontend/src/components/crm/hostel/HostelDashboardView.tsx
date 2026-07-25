import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Building, Users, DoorOpen, Bed, UserCircle, IndianRupee,
  ChevronDown, Plus, CheckCircle2, ArrowRightCircle, ArrowLeftCircle,
  Clock, FileText, Wrench, ShieldAlert, AlertTriangle, Coffee,
  TrendingUp, TrendingDown, Bell, RefreshCw, Download,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid,
} from 'recharts';
import { fetchHostelDashboard, exportHostelDashboard, type HostelDashboard } from '../../../lib/hostelServices';
import { toViewKey } from '../../../lib/navigation';
import { AcademicLoading } from '../FeeFinanceManagement/FeeFinanceUi';

const KPI_META = [
  { key: 'totalHostels' as const, title: 'Total Hostels', color: 'bg-blue-500', icon: <Building size={20} />, iconBg: 'bg-blue-100', iconColor: 'text-blue-500' },
  { key: 'totalStudents' as const, title: 'Total Students', color: 'bg-green-500', icon: <Users size={20} />, iconBg: 'bg-green-100', iconColor: 'text-green-500' },
  { key: 'totalRooms' as const, title: 'Total Rooms', color: 'bg-purple-500', icon: <DoorOpen size={20} />, iconBg: 'bg-purple-100', iconColor: 'text-purple-500' },
  { key: 'occupiedRooms' as const, title: 'Occupied Rooms', color: 'bg-orange-500', icon: <Bed size={20} />, iconBg: 'bg-orange-100', iconColor: 'text-orange-500' },
  { key: 'totalStaff' as const, title: 'Total Staff', color: 'bg-red-500', icon: <UserCircle size={20} />, iconBg: 'bg-red-100', iconColor: 'text-red-500' },
  { key: 'messBalance' as const, title: 'Mess Balance', color: 'bg-teal-500', icon: <IndianRupee size={20} />, iconBg: 'bg-teal-100', iconColor: 'text-teal-500' },
];

const NOTICE_ICONS: Record<string, ReactNode> = {
  amber: <Coffee size={12} className="text-amber-600" />,
  blue: <IndianRupee size={12} className="text-blue-600" />,
  purple: <Wrench size={12} className="text-purple-600" />,
};

const MAINT_ICONS: Record<string, { icon: ReactNode; bg: string }> = {
  Open: { icon: <AlertTriangle size={14} className="text-red-500" />, bg: 'bg-red-100' },
  'In Progress': { icon: <Wrench size={14} className="text-amber-500" />, bg: 'bg-amber-100' },
  Resolved: { icon: <CheckCircle2 size={14} className="text-green-500" />, bg: 'bg-green-100' },
};

export function HostelDashboardView({ onNavigate }: { onNavigate?: (view: string) => void }) {
  const [data, setData] = useState<HostelDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [hostelId, setHostelId] = useState('ALL');
  const [exportMsg, setExportMsg] = useState('');

  const load = useCallback(async (seed = false) => {
    setLoading(true);
    try {
      const result = await fetchHostelDashboard(seed, academicYear, hostelId === 'ALL' ? undefined : hostelId);
      setData(result);
    } finally {
      setLoading(false);
    }
  }, [academicYear, hostelId]);

  useEffect(() => { void load(); }, [load]);

  const nav = (target: string) => {
    if (onNavigate) onNavigate(toViewKey('Hostel Management', target));
  };

  const kpiList = useMemo(() => {
    if (!data) return [];
    return KPI_META.map((m) => {
      const k = data.kpis[m.key];
      const value = typeof k.value === 'number' ? k.value.toLocaleString('en-IN') : k.value;
      return { ...m, value, subtitle: k.subtitle };
    });
  }, [data]);

  const handleExport = async (format: string) => {
    const result = await exportHostelDashboard(academicYear, hostelId === 'ALL' ? undefined : hostelId, format);
    setExportMsg(result.message);
    setTimeout(() => setExportMsg(''), 4000);
  };

  if (loading && !data) return <AcademicLoading />;

  const occupancyPct = data?.kpis.occupiedRooms.occupancyPct ?? 0;

  return (
    <div className="flex flex-col space-y-4 h-full relative">
      {data?.capacityAlert && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-xs px-4 py-2 rounded-lg flex items-center gap-2">
          <AlertTriangle size={14} /> Capacity alert: Occupancy at {occupancyPct}% — exceeds threshold. Admin notified.
        </div>
      )}
      {exportMsg && (
        <div className="fixed top-4 right-4 z-50 bg-teal-600 text-white text-xs px-4 py-2 rounded-lg shadow-lg">{exportMsg}</div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Hostel Management CRM</h2>
          <p className="text-xs text-slate-500 mt-0.5">Safe • Comfortable • Secure Living</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className="text-xs font-medium bg-white border border-slate-200 rounded px-3 py-1.5 shadow-sm">
            {(data?.academicYears ?? ['2025-26']).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={hostelId} onChange={(e) => setHostelId(e.target.value)} className="text-xs font-medium bg-white border border-slate-200 rounded px-3 py-1.5 shadow-sm">
            <option value="ALL">All Hostels</option>
            {(data?.hostels ?? []).filter((h) => h.accessible).map((h) => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
          <button type="button" onClick={() => void load()} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50">
            <RefreshCw size={14} />
          </button>
          <button type="button" onClick={() => void handleExport('PDF')} className="px-3 py-1.5 text-xs border rounded-lg font-semibold flex items-center gap-1">
            <Download size={12} /> Export
          </button>
          <button type="button" onClick={() => nav('Students')} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded flex items-center gap-2 shadow-sm">
            <Plus size={14} /> Add New Student
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {kpiList.map((kpi) => (
          <div key={kpi.key} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-8 h-8 rounded-full ${kpi.iconBg} ${kpi.iconColor} flex items-center justify-center shrink-0`}>{kpi.icon}</div>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] text-slate-500 font-bold truncate">{kpi.title}</p>
                <p className="text-[13px] font-bold text-slate-900 truncate leading-tight mt-0.5">{kpi.value}</p>
              </div>
            </div>
            <div className="text-[8px] text-slate-500">{kpi.subtitle}</div>
            <div className={`absolute bottom-0 left-0 w-full h-0.5 ${kpi.color}`} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Room Occupancy Overview</h3>
          <div className="flex items-center justify-center gap-4 flex-1">
            <div className="w-24 h-24 relative shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data?.roomOccupancy ?? []} cx="50%" cy="50%" innerRadius={28} outerRadius={40} dataKey="value" stroke="none">
                    {(data?.roomOccupancy ?? []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[11px] font-bold text-slate-800">{occupancyPct}%</span>
                <span className="text-[6px] text-slate-500">Occupancy</span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 text-[9px] flex-1">
              {(data?.roomOccupancy ?? []).map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-600 font-medium">{item.name}</span>
                  </div>
                  <span className="font-bold">{item.value} ({item.percent})</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-2 text-[9px] text-slate-600 font-medium text-center">Total Rooms: {data?.kpis.totalRooms.value ?? 0}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-4 flex flex-col relative">
          <div className="flex justify-between items-center mb-1">
            <h3 className="text-[11px] font-bold text-slate-800">Hostel Wise Students</h3>
            <button type="button" onClick={() => nav('Students')} className="text-[9px] text-blue-600 font-medium hover:underline">View All</button>
          </div>
          <div className="flex-1 w-full min-h-[140px] mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.hostelWiseStudents ?? []} margin={{ top: 15, right: 0, left: -25, bottom: 10 }} barSize={12}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 7, fill: '#64748b' }} angle={-15} textAnchor="end" />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#64748b' }} />
                <RechartsTooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ fontSize: '9px', borderRadius: '4px' }} />
                <Bar dataKey="students" radius={[2, 2, 0, 0]}>
                  {(data?.hostelWiseStudents ?? []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-2 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-4">Students Check-in / Check-out <span className="font-normal text-slate-500">(Today)</span></h3>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div className="border border-slate-100 rounded-lg p-2 text-center bg-slate-50 flex flex-col items-center">
              <ArrowRightCircle size={14} className="text-green-600 mb-1" />
              <span className="text-[8px] text-slate-500">Check-in</span>
              <span className="text-[12px] font-bold">{data?.checkInOut.checkInToday ?? 0}</span>
            </div>
            <div className="border border-slate-100 rounded-lg p-2 text-center bg-slate-50 flex flex-col items-center">
              <ArrowLeftCircle size={14} className="text-red-600 mb-1" />
              <span className="text-[8px] text-slate-500">Check-out</span>
              <span className="text-[12px] font-bold">{data?.checkInOut.checkOutToday ?? 0}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 flex-1">
            <div className="border border-slate-100 rounded-lg p-2 flex flex-col justify-center text-center">
              <span className="text-[7px] text-slate-500">Currently In Hostel</span>
              <span className="text-[11px] font-bold">{data?.checkInOut.currentlyInHostel ?? 0}</span>
            </div>
            <div className="border border-slate-100 rounded-lg p-2 flex flex-col justify-center text-center">
              <span className="text-[7px] text-slate-500">On Leave / Outing</span>
              <span className="text-[11px] font-bold">{data?.checkInOut.onLeaveOuting ?? 0}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[11px] font-bold text-slate-800">Leave Applications</h3>
            <button type="button" onClick={() => nav('Leave Management')} className="text-[9px] text-blue-600 font-medium hover:underline">View All</button>
          </div>
          <div className="flex items-center justify-center gap-4 flex-1">
            <div className="w-24 h-24 relative shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data?.leaveApplications ?? []} cx="50%" cy="50%" innerRadius={28} outerRadius={40} dataKey="value" stroke="none">
                    {(data?.leaveApplications ?? []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[13px] font-bold">{data?.leaveTotal ?? 0}</span>
                <span className="text-[6px] text-slate-500">Total Requests</span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 text-[9px] flex-1">
              {(data?.leaveApplications ?? []).map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span>{item.name}</span>
                  </div>
                  <span className="font-bold">{item.value} ({item.percent})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-4 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[11px] font-bold text-slate-800">Recent Room Allotment</h3>
            <button type="button" onClick={() => nav('Rooms & Allotment')} className="text-[9px] text-blue-600 font-medium hover:underline">View All</button>
          </div>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-[9px] text-left">
              <thead>
                <tr className="text-slate-500 border-b">
                  <th className="pb-2">Student</th><th>Hostel</th><th>Room</th><th className="text-center">Bed</th><th>Date</th><th>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(data?.recentAllotments ?? []).map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="py-2 font-medium">{row.student}</td>
                    <td>{row.hostel}</td>
                    <td>{row.room}</td>
                    <td className="text-center">{row.bed}</td>
                    <td className="whitespace-nowrap">{row.date}</td>
                    <td><span className="text-[7px] font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded border border-green-200">{row.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {data?.messDashboard && (
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-5 flex flex-col">
            <h3 className="text-[11px] font-bold text-slate-800 mb-4">Mess Dashboard <span className="font-normal text-slate-500">(This Month)</span></h3>
            <div className="grid grid-cols-4 gap-2 mb-4">
              <div className="bg-slate-50 rounded border p-2 text-center">
                <span className="text-[7px] text-slate-500 block">Total Collection</span>
                <span className="text-[10px] font-bold text-blue-600">{data.messDashboard.totalCollection}</span>
              </div>
              <div className="bg-slate-50 rounded border p-2 text-center">
                <span className="text-[7px] text-slate-500 block">Total Expense</span>
                <span className="text-[10px] font-bold">{data.messDashboard.totalExpense}</span>
              </div>
              <div className="bg-green-50 rounded border border-green-100 p-2 text-center">
                <span className="text-[7px] text-green-700 block">Mess Balance</span>
                <span className="text-[10px] font-bold text-green-700">{data.messDashboard.messBalance}</span>
              </div>
              <div className="bg-slate-50 rounded border p-2 text-center">
                <span className="text-[7px] text-slate-500 block">Students Opted</span>
                <span className="text-[10px] font-bold">{data.messDashboard.studentsOpted.toLocaleString('en-IN')}</span>
              </div>
            </div>
            <h4 className="text-[9px] font-bold text-slate-700 mb-2">Top Meals Preference</h4>
            <div className="flex flex-col gap-2">
              {data.messDashboard.mealPreferences.map((m) => (
                <div key={m.name} className="flex items-center gap-2">
                  <span className="text-[8px] text-slate-600 w-14 shrink-0">{m.name}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${m.pct}%`, backgroundColor: m.color }} />
                  </div>
                  <span className="text-[8px] font-medium w-6 text-right">{m.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[11px] font-bold text-slate-800">Pending Payments</h3>
            <button type="button" onClick={() => nav('Students')} className="text-[9px] text-blue-600 font-medium hover:underline">View All</button>
          </div>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-[9px]">
              <thead>
                <tr className="text-slate-500 border-b">
                  <th className="pb-2 text-left">Student</th><th className="text-left">Hostel</th><th className="text-right">Amount</th><th className="text-right">Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(data?.pendingPayments ?? []).map((row, i) => (
                  <tr key={i}>
                    <td className="py-2 font-medium">{row.student}</td>
                    <td>{row.hostel}</td>
                    <td className="text-right font-bold">{row.amount}</td>
                    <td className={`text-right ${row.isPastDue ? 'text-red-500 font-bold' : 'text-red-400'}`}>{row.dueDate}</td>
                  </tr>
                ))}
                {!data?.pendingPayments.length && (
                  <tr><td colSpan={4} className="text-center text-slate-400 py-6">No pending payments</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Hostel Facilities</h3>
          <div className="grid grid-cols-4 gap-2">
            {(data?.facilities ?? []).map((f, i) => (
              <button key={i} type="button" onClick={() => nav(f.target)} className="flex flex-col items-center p-2 rounded-lg border border-slate-100 hover:bg-slate-50 text-[7px] font-medium text-slate-600">
                <Bed size={16} className="text-blue-600 mb-1" />{f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[11px] font-bold text-slate-800">Maintenance Requests</h3>
            <button type="button" onClick={() => nav('Maintenance')} className="text-[9px] text-blue-600 font-medium hover:underline">View All</button>
          </div>
          <div className="space-y-3">
            {(data?.maintenanceRequests ?? []).map((req, i) => {
              const mi = MAINT_ICONS[req.status] ?? MAINT_ICONS.Open;
              return (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${mi.bg}`}>{mi.icon}</div>
                    <div className="min-w-0">
                      <p className="text-[9px] font-bold truncate">{req.issue}</p>
                      <p className="text-[8px] text-slate-500 truncate">{req.location}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[7px] text-slate-500">{req.date}</span>
                    <p className={`text-[7px] font-bold ${req.statusColor}`}>{req.status}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[11px] font-bold text-slate-800">Visitor Log <span className="font-normal text-slate-500">(Today)</span></h3>
            <button type="button" onClick={() => nav('Visitor Management')} className="text-[9px] text-blue-600 font-medium hover:underline">View All</button>
          </div>
          <table className="w-full text-[8px]">
            <thead>
              <tr className="text-slate-500 border-b">
                <th className="pb-1.5 text-left">Visitor</th><th className="text-left">Student</th><th className="text-center">In</th><th className="text-center">Out</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {(data?.visitorLog ?? []).map((row, i) => (
                <tr key={i}>
                  <td className="py-1.5 font-medium">{row.visitorName}</td>
                  <td>{row.studentName}</td>
                  <td className="text-center">{row.inTime}</td>
                  <td className="text-center text-slate-500">{row.outTime}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-2">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Quick Actions</h3>
          <div className="grid grid-cols-4 gap-2">
            {(data?.quickActions ?? []).map((a, i) => (
              <button key={i} type="button" onClick={() => nav(a.target)} className="flex flex-col items-center p-1.5 rounded-lg border border-slate-100 hover:bg-slate-50 text-[7px] font-medium text-slate-600">
                <FileText size={14} className="text-blue-600 mb-1" />{a.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-4">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Hostel Overview</h3>
          <div className="flex items-center justify-between flex-wrap gap-2 text-center text-[13px] font-bold">
            {[
              ['Total Hostels', data?.hostelOverview.totalHostels],
              ['Total Rooms', data?.hostelOverview.totalRooms],
              ['Occupied', data?.hostelOverview.occupiedRooms],
              ['Vacant', data?.hostelOverview.vacantRooms],
              ['Students', data?.hostelOverview.totalStudents],
              ['Staff', data?.hostelOverview.staffMembers],
            ].map(([label, val]) => (
              <div key={String(label)}>
                <span className="text-[7px] text-slate-500 font-medium block">{label}</span>
                {val}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Attendance Summary <span className="font-normal text-slate-500">(Today)</span></h3>
          <div className="flex gap-2">
            {[
              { label: 'Present', value: data?.attendanceSummary.present, pct: data?.attendanceSummary.presentPct, color: 'green' },
              { label: 'Absent', value: data?.attendanceSummary.absent, pct: data?.attendanceSummary.absentPct, color: 'red' },
              { label: 'On Leave', value: data?.attendanceSummary.onLeave, pct: data?.attendanceSummary.onLeavePct, color: 'amber' },
            ].map((a) => (
              <div key={a.label} className="flex-1 bg-slate-50 rounded border p-2 text-center">
                <span className="text-[8px] text-slate-600 block">{a.label}</span>
                <span className="text-[13px] font-bold block">{a.value?.toLocaleString('en-IN')}</span>
                <span className={`text-[7px] text-${a.color}-600 font-bold`}>{a.pct}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-2">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Incident Summary <span className="font-normal text-slate-500">(Month)</span></h3>
          <div className="flex gap-2 text-center">
            <div className="flex-1 bg-slate-50 rounded border p-2">
              <span className="text-[8px] block">Total</span>
              <span className="text-[14px] font-bold">{data?.incidentSummary.total}</span>
            </div>
            <div className="flex-1 bg-slate-50 rounded border p-2">
              <span className="text-[8px] text-green-700 block">Resolved</span>
              <span className="text-[14px] font-bold text-green-700">{data?.incidentSummary.resolved}</span>
            </div>
            <div className="flex-1 bg-slate-50 rounded border p-2">
              <span className="text-[8px] text-red-600 block">Open</span>
              <span className="text-[14px] font-bold text-red-600">{data?.incidentSummary.open}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Important Notices</h3>
          <div className="space-y-2">
            {(data?.importantNotices ?? []).map((notice, i) => (
              <div key={i} className="flex gap-2 items-center">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${notice.bg}`}>
                  {NOTICE_ICONS[notice.iconColor] ?? <Bell size={12} />}
                </div>
                <div className="flex-1 min-w-0 flex justify-between gap-2">
                  <p className="text-[8px] font-medium truncate">{notice.text}</p>
                  <span className="text-[7px] text-slate-500 shrink-0">{notice.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="text-[9px] text-slate-400 text-center">
        Cache refreshes every {data?.cacheRefreshMins ?? 15} min · RFID/QR gate sync · {(data?.erpIntegration ?? []).join(' · ')}
      </p>
    </div>
  );
}
