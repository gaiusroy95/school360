import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  BookOpen, Users, BookMarked, Clock, IndianRupee, Library,
  ChevronDown, Plus, Search, CheckCircle2, Calendar,
  FileText, Settings, Laptop, BookUp, UserPlus,
  RefreshCcw, Bell,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid, Legend,
  AreaChart, Area,
} from 'recharts';
import { fetchLibraryDashboard, sendLibraryBulkReminders, type LibraryDashboard } from '../../../lib/libraryServices';
import { toViewKey } from '../../../lib/navigation';
import { AcademicLoading } from '../FeeFinanceManagement/FeeFinanceUi';

const KPI_META = [
  { key: 'totalBooks' as const, title: 'Total Books', color: 'bg-blue-500', icon: <BookOpen size={20} />, iconColor: 'text-blue-500', iconBg: 'bg-blue-100' },
  { key: 'totalMembers' as const, title: 'Total Members', color: 'bg-green-500', icon: <Users size={20} />, iconColor: 'text-green-500', iconBg: 'bg-green-100' },
  { key: 'booksIssued' as const, title: 'Books Issued', color: 'bg-purple-500', icon: <BookUp size={20} />, iconColor: 'text-purple-500', iconBg: 'bg-purple-100' },
  { key: 'overdueBooks' as const, title: 'Overdue Books', color: 'bg-orange-500', icon: <Clock size={20} />, iconColor: 'text-orange-500', iconBg: 'bg-orange-100' },
  { key: 'fineCollected' as const, title: 'Fine Collected', color: 'bg-pink-500', icon: <IndianRupee size={20} />, iconColor: 'text-pink-500', iconBg: 'bg-pink-100' },
  { key: 'availableBooks' as const, title: 'Available Books', color: 'bg-teal-500', icon: <Library size={20} />, iconColor: 'text-teal-500', iconBg: 'bg-teal-100' },
];

const QUICK_ICONS = [
  <BookOpen size={16} className="text-blue-600" key="0" />,
  <BookUp size={16} className="text-green-600" key="1" />,
  <RefreshCcw size={16} className="text-emerald-600" key="2" />,
  <UserPlus size={16} className="text-purple-600" key="3" />,
  <Search size={16} className="text-blue-600" key="4" />,
  <IndianRupee size={16} className="text-red-600" key="5" />,
  <CheckCircle2 size={16} className="text-green-600" key="6" />,
  <Library size={16} className="text-amber-600" key="7" />,
  <BookMarked size={16} className="text-indigo-600" key="8" />,
  <Laptop size={16} className="text-blue-600" key="9" />,
  <FileText size={16} className="text-slate-600" key="10" />,
  <Settings size={16} className="text-slate-600" key="11" />,
];

const NOTICE_ICONS: Record<string, ReactNode> = {
  red: <RefreshCcw size={14} className="text-red-600" />,
  purple: <Calendar size={14} className="text-purple-600" />,
  amber: <BookOpen size={14} className="text-amber-600" />,
  green: <BookMarked size={14} className="text-green-600" />,
};

export function LibraryDashboardView({ onNavigate }: { onNavigate?: (view: string) => void }) {
  const [data, setData] = useState<LibraryDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [branchId, setBranchId] = useState('');
  const [reminderMsg, setReminderMsg] = useState('');
  const [showOverdueMenu, setShowOverdueMenu] = useState(false);

  const load = useCallback(async (seed = false) => {
    setLoading(true);
    try {
      const result = await fetchLibraryDashboard(seed, academicYear, branchId || undefined);
      setData(result);
      if (!branchId && result.selectedBranchId) setBranchId(result.selectedBranchId);
    } finally {
      setLoading(false);
    }
  }, [academicYear, branchId]);

  useEffect(() => { void load(true); }, [load]);

  const nav = (target: string) => {
    if (onNavigate) onNavigate(toViewKey('Library Management', target));
  };

  const kpiList = useMemo(() => {
    if (!data) return [];
    return KPI_META.map((m) => {
      const k = data.kpis[m.key];
      const value = typeof k.value === 'number' ? k.value.toLocaleString('en-IN') : k.value;
      return {
        ...m,
        value,
        subtitle: k.subtitle,
        subtitleColor: 'subtitleColor' in k ? k.subtitleColor : undefined,
        trendUp: 'trendUp' in k ? k.trendUp : false,
        target: k.target,
      };
    });
  }, [data]);

  const handleOverdueClick = () => {
    setShowOverdueMenu((v) => !v);
  };

  const handleBulkReminders = async () => {
    setShowOverdueMenu(false);
    const result = await sendLibraryBulkReminders(academicYear, branchId);
    setReminderMsg(result.message);
    setTimeout(() => setReminderMsg(''), 4000);
  };

  if (loading && !data) return <AcademicLoading />;

  return (
    <div className="flex flex-col space-y-4 h-full relative">
      {reminderMsg && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white text-xs px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <Bell size={14} /> {reminderMsg}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Library Management CRM</h2>
          <p className="text-xs text-slate-500 mt-0.5">Organize • Automate • Track • Empower Learning</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            className="text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded px-3 py-1.5 shadow-sm focus:outline-none"
          >
            {(data?.academicYears ?? ['2025-26']).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className="text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded px-3 py-1.5 shadow-sm focus:outline-none"
          >
            {(data?.branches ?? []).map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => nav('Add / Manage Books')}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-4 py-2 rounded flex items-center gap-2 shadow-sm transition-colors"
          >
            <Plus size={14} />
            <span>Add New Book</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {kpiList.map((kpi) => (
          <div
            key={kpi.key}
            role="button"
            tabIndex={0}
            onClick={() => {
              if (kpi.key === 'overdueBooks') handleOverdueClick();
              else if (kpi.target) nav(kpi.target);
            }}
            onKeyDown={(e) => { if (e.key === 'Enter' && kpi.target) nav(kpi.target); }}
            className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group cursor-pointer"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-8 h-8 rounded-full ${kpi.iconBg} ${kpi.iconColor} flex items-center justify-center shadow-sm shrink-0`}>
                {kpi.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] text-slate-500 font-bold truncate">{kpi.title}</p>
                <p className="text-[13px] font-bold text-slate-900 truncate leading-tight mt-0.5">{kpi.value}</p>
              </div>
            </div>
            {kpi.subtitle && (
              <div className={`text-[8px] flex items-center gap-1 ${kpi.subtitleColor || 'text-slate-500'}`}>
                {kpi.trendUp && <span className="text-green-500 font-bold mr-0.5">↑</span>}
                <span className={kpi.trendUp ? 'text-green-600' : ''}>{kpi.subtitle.replace('↑ ', '')}</span>
              </div>
            )}
            <div className={`absolute bottom-0 left-0 w-full h-0.5 ${kpi.color}`} />
            {kpi.key === 'overdueBooks' && showOverdueMenu && (
              <div className="absolute top-full left-0 mt-1 z-20 bg-white border border-slate-200 rounded-lg shadow-lg p-2 w-full">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); void handleBulkReminders(); }}
                  className="w-full text-left text-[9px] font-medium text-slate-700 hover:bg-slate-50 px-2 py-1.5 rounded flex items-center gap-1"
                >
                  <Bell size={12} className="text-orange-500" /> Send Bulk Reminders (App/SMS)
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); nav('Book Issue / Return'); }}
                  className="w-full text-left text-[9px] font-medium text-slate-700 hover:bg-slate-50 px-2 py-1.5 rounded"
                >
                  View All Overdue
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[11px] font-bold text-slate-800">Book Issue & Return Overview</h3>
            <select className="text-[9px] border border-slate-200 rounded text-slate-600 focus:outline-none">
              <option>This Month</option>
            </select>
          </div>
          <div className="flex items-center justify-center gap-4 flex-1">
            <div className="w-24 h-24 relative shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data?.issueReturnOverview ?? []} cx="50%" cy="50%" innerRadius={28} outerRadius={40} dataKey="value" stroke="none">
                    {(data?.issueReturnOverview ?? []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[13px] font-bold text-slate-800">{data?.totalIssuedCenter ?? 0}</span>
                <span className="text-[6px] text-slate-500 leading-tight">Total Issued</span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 text-[9px] flex-1">
              {(data?.issueReturnOverview ?? []).map((item, i) => (
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
          <div className="mt-2 text-[9px] text-slate-600 font-medium">
            Average Issue Duration: {data?.avgIssueDuration ?? 0} Days
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-4 flex flex-col relative">
          <div className="flex justify-between items-center mb-1">
            <h3 className="text-[11px] font-bold text-slate-800">Issue & Return Trend</h3>
            <button type="button" onClick={() => nav('Reports & Analytics')} className="text-[9px] text-blue-600 font-medium hover:underline">Export</button>
          </div>
          <div className="flex-1 w-full h-full min-h-[160px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.issueReturnTrend ?? []} margin={{ top: 20, right: 10, left: -25, bottom: -10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#64748b' }} dy={5} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#64748b' }} />
                <RechartsTooltip contentStyle={{ fontSize: '9px', borderRadius: '4px', padding: '4px' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '9px', top: -10 }} />
                <Line type="monotone" dataKey="issued" name="Issued" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="returned" name="Returned" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="overdue" name="Overdue" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[11px] font-bold text-slate-800">Top Book Categories</h3>
            <button type="button" onClick={() => nav('Categories & Subjects')} className="text-[9px] text-blue-600 font-medium hover:underline">View All</button>
          </div>
          <div className="flex items-center justify-center gap-4 flex-1">
            <div className="w-24 h-24 relative shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data?.bookCategories ?? []} cx="50%" cy="50%" innerRadius={25} outerRadius={40} dataKey="value" stroke="none">
                    {(data?.bookCategories ?? []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[12px] font-bold text-slate-800">{(data?.totalBooksCenter ?? 0).toLocaleString('en-IN')}</span>
                <span className="text-[6px] text-slate-500 leading-tight">Total Books</span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 text-[9px] flex-1">
              {(data?.bookCategories ?? []).map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-600 text-[9px] font-medium whitespace-nowrap">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-slate-800">{item.value.toLocaleString('en-IN')}</span>
                    <span className="text-slate-400">({item.percent})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-2 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[11px] font-bold text-slate-800">Recent Issued Books</h3>
            <button type="button" onClick={() => nav('Book Issue / Return')} className="text-[9px] text-blue-600 font-medium hover:underline">View All</button>
          </div>
          <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-1">
            {(data?.recentIssuedBooks ?? []).map((book, i) => (
              <div key={i} className="flex gap-2">
                <div className={`w-8 h-10 rounded shadow-sm ${book.cover} flex shrink-0 border border-slate-200/50`} />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <p className="text-[9px] font-bold text-slate-800 leading-tight truncate">{book.title}</p>
                    <span className="text-[7px] font-bold text-green-600 shrink-0 ml-1">Issued</span>
                  </div>
                  <p className="text-[8px] text-slate-500 truncate">{book.author}</p>
                  <p className="text-[7px] text-slate-600 mt-1 truncate">Issued to: {book.issuedTo}</p>
                  <p className="text-[7px] text-slate-500 truncate">Due: {book.dueDate}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-5 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[11px] font-bold text-slate-800">Overdue Books</h3>
            <button type="button" onClick={() => nav('Book Issue / Return')} className="text-[9px] text-blue-600 font-medium hover:underline">View All</button>
          </div>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-[9px] text-left">
              <thead>
                <tr className="text-slate-500 border-b border-slate-100">
                  <th className="pb-2 font-medium">Book Title</th>
                  <th className="pb-2 font-medium">Issued To</th>
                  <th className="pb-2 font-medium">Class</th>
                  <th className="pb-2 font-medium">Issue Date</th>
                  <th className="pb-2 font-medium">Due Date</th>
                  <th className="pb-2 font-medium">Days Overdue</th>
                  <th className="pb-2 font-medium text-right">Fine</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(data?.overdueBooks ?? []).map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2 text-slate-800 font-bold max-w-[100px] truncate" title={row.title}>{row.title}</td>
                    <td className="py-2 text-slate-600 whitespace-nowrap">{row.issuedTo}</td>
                    <td className="py-2 text-slate-600">{row.class}</td>
                    <td className="py-2 text-slate-600 whitespace-nowrap">{row.issueDate}</td>
                    <td className="py-2 text-slate-600 whitespace-nowrap">{row.dueDate}</td>
                    <td className="py-2 text-red-600 font-medium">{row.daysOverdue}</td>
                    <td className="py-2 text-right font-bold text-slate-800">{row.fine}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[11px] font-bold text-slate-800">Book Acquisition Summary</h3>
          </div>
          <div className="grid grid-cols-4 gap-2 mb-4">
            <div className="bg-blue-50/50 rounded border border-blue-100 p-1.5 flex flex-col items-center justify-center text-center">
              <span className="text-[7px] text-slate-500 font-medium mb-1 line-clamp-1">Books Added</span>
              <span className="text-[11px] font-bold text-blue-600">{data?.acquisitionSummary.booksAdded ?? 0}</span>
            </div>
            <div className="bg-green-50/50 rounded border border-green-100 p-1.5 flex flex-col items-center justify-center text-center">
              <span className="text-[7px] text-slate-500 font-medium mb-1 line-clamp-1">Total Cost</span>
              <span className="text-[10px] font-bold text-green-600 truncate">{data?.acquisitionSummary.totalCost}</span>
            </div>
            <div className="bg-amber-50/50 rounded border border-amber-100 p-1.5 flex flex-col items-center justify-center text-center">
              <span className="text-[7px] text-slate-500 font-medium mb-1 line-clamp-1">Donated Books</span>
              <span className="text-[11px] font-bold text-amber-600">{data?.acquisitionSummary.donatedBooks ?? 0}</span>
            </div>
            <div className="bg-purple-50/50 rounded border border-purple-100 p-1.5 flex flex-col items-center justify-center text-center">
              <span className="text-[7px] text-slate-500 font-medium mb-1 line-clamp-1">Vendors</span>
              <span className="text-[11px] font-bold text-purple-600">{data?.acquisitionSummary.vendors ?? 0}</span>
            </div>
          </div>
          <div>
            <h4 className="text-[9px] font-bold text-slate-700 mb-2">Top Vendors</h4>
            <div className="flex flex-col gap-2 text-[9px]">
              {(data?.topVendors ?? []).map((vendor, i) => (
                <div key={i} className="flex justify-between items-center">
                  <span className="text-slate-600 w-32 truncate">{i + 1}. {vendor.name}</span>
                  <span className="text-slate-500 w-16">{vendor.books} Books</span>
                  <span className="text-slate-900 font-bold text-right w-16">{vendor.amount}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-2 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[11px] font-bold text-slate-800">Popular Books</h3>
            <button type="button" onClick={() => nav('Reports & Analytics')} className="text-[9px] text-blue-600 font-medium hover:underline">View All</button>
          </div>
          <div className="flex text-[8px] text-slate-400 font-medium justify-between border-b border-slate-100 pb-1 mb-2">
            <span>Book Title</span>
            <span>Times Issued</span>
          </div>
          <div className="flex flex-col gap-3 flex-1">
            {(data?.popularBooks ?? []).map((book, i) => (
              <div key={i} className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-medium text-slate-700 truncate w-32">{book.title}</span>
                  <span className="text-[9px] font-bold text-slate-900">{book.times}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-green-500 h-full rounded-full" style={{ width: `${Math.min(100, (book.times / 30) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-2 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Quick Actions</h3>
          <div className="grid grid-cols-4 gap-2 flex-1">
            {(data?.quickActions ?? []).map((action, i) => (
              <button
                key={i}
                type="button"
                onClick={() => nav(action.target)}
                className="flex flex-col items-center justify-center text-center p-1.5 rounded-lg border border-slate-100 hover:bg-slate-50 hover:border-slate-200 transition-colors group"
              >
                <div className="w-6 h-6 rounded flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                  {QUICK_ICONS[i] ?? <BookOpen size={16} />}
                </div>
                <span className="text-[6.5px] text-slate-600 font-medium leading-tight px-0.5 whitespace-normal">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[11px] font-bold text-slate-800">New Arrivals</h3>
            <button type="button" onClick={() => nav('Book Catalogue')} className="text-[9px] text-blue-600 font-medium hover:underline">View All</button>
          </div>
          <div className="flex flex-col gap-3 flex-1 overflow-y-auto pr-1">
            {(data?.newArrivals ?? []).map((book, i) => (
              <div key={i} className="flex gap-2">
                <div className={`w-8 h-10 rounded shadow-sm ${book.cover} flex items-center justify-center shrink-0 border border-slate-200/50 text-[16px] font-serif`}>
                  {book.title.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-bold text-slate-800 leading-tight truncate">{book.title}</p>
                  <p className="text-[8px] text-slate-600 mt-0.5 truncate">{book.author}</p>
                  <p className="text-[7px] text-slate-500 mt-0.5">Category: {book.category}</p>
                  <p className="text-[7px] text-slate-400 mt-0.5">Added on: {book.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Member Type Distribution</h3>
          <div className="flex items-center justify-center gap-4 flex-1">
            <div className="w-24 h-24 relative shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data?.memberDistribution ?? []} cx="50%" cy="50%" innerRadius={28} outerRadius={40} dataKey="value" stroke="none">
                    {(data?.memberDistribution ?? []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[13px] font-bold text-slate-800">{(data?.totalMembersCenter ?? 0).toLocaleString('en-IN')}</span>
                <span className="text-[6px] text-slate-500 leading-tight">Total Members</span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 text-[9px] flex-1">
              {(data?.memberDistribution ?? []).map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-600 text-[9px] font-medium whitespace-nowrap">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-slate-800">{item.value.toLocaleString('en-IN')}</span>
                    <span className="text-slate-400">({item.percent})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-4 flex flex-col relative">
          <div className="flex justify-between items-center mb-1">
            <h3 className="text-[11px] font-bold text-slate-800">
              Library Attendance <span className="font-normal text-slate-500">(Today)</span>
            </h3>
            <button type="button" onClick={() => nav('Library Attendance')} className="text-[9px] text-blue-600 font-medium hover:underline">Details</button>
          </div>
          <div className="flex gap-4 flex-1 items-center">
            <div className="flex-1 w-full h-full min-h-[120px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data?.attendanceData ?? []} margin={{ top: 10, right: 0, left: -25, bottom: -5 }}>
                  <defs>
                    <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#64748b' }} dy={5} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#64748b' }} />
                  <RechartsTooltip contentStyle={{ fontSize: '9px', borderRadius: '4px', padding: '4px' }} />
                  <Area type="monotone" dataKey="visitors" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorVisitors)" dot={{ r: 3, fill: '#8b5cf6', strokeWidth: 1, stroke: '#fff' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="w-24 shrink-0 flex flex-col gap-2">
              <div className="bg-purple-50 rounded border border-purple-100 p-2 text-center">
                <span className="text-[7px] text-slate-500 font-medium mb-0.5 block">Total Visitors</span>
                <span className="text-[12px] font-bold text-slate-900">{data?.attendanceSummary.totalVisitors ?? 0}</span>
              </div>
              <div className="bg-slate-50 rounded border border-slate-100 p-2 text-center">
                <span className="text-[7px] text-slate-500 font-medium mb-0.5 block">Peak Time</span>
                <span className="text-[9px] font-bold text-slate-900">{data?.attendanceSummary.peakTime ?? '—'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-2 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[11px] font-bold text-slate-800">Important Notices</h3>
          </div>
          <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
            {(data?.importantNotices ?? []).map((notice, i) => (
              <div key={i} className="flex gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${notice.bg}`}>
                  {NOTICE_ICONS[notice.iconColor] ?? <Bell size={14} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-medium text-slate-800 leading-tight">{notice.title}</p>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-[7px] text-slate-500">Issued by: {notice.issuedBy}</span>
                    <span className="text-[7px] text-slate-400">{notice.date}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
