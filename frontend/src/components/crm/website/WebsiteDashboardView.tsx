import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Globe, FileText, Image as ImageIcon, Layout, Layers,
  MessageSquare, FormInput, BellRing, Search, Palette,
  Database, BarChart2, ChevronDown, Plus, ExternalLink,
  ShieldCheck, Upload, PlayCircle, Music, Edit3, Monitor,
  Smartphone, AlertTriangle, Info,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid,
} from 'recharts';
import { fetchCmsDashboard, type CmsDashboard } from '../../../lib/websiteCmsServices';
import { toViewKey } from '../../../lib/navigation';
import { AcademicLoading } from '../FeeFinanceManagement/FeeFinanceUi';

const KPI_META = [
  { key: 'totalPages' as const, title: 'Total Pages', icon: <FileText size={20} />, color: 'text-blue-500', bg: 'bg-blue-100', chartColor: '#3b82f6' },
  { key: 'blogPosts' as const, title: 'Blog Posts', icon: <Edit3 size={20} />, color: 'text-green-500', bg: 'bg-green-100', chartColor: '#10b981' },
  { key: 'mediaFiles' as const, title: 'Media Files', icon: <ImageIcon size={20} />, color: 'text-orange-500', bg: 'bg-orange-100', chartColor: '#f59e0b' },
  { key: 'formSubmissions' as const, title: 'Form Submissions', icon: <FormInput size={20} />, color: 'text-red-500', bg: 'bg-red-100', chartColor: '#ef4444' },
  { key: 'websiteVisitors' as const, title: 'Website Visitors', icon: <Globe size={20} />, color: 'text-blue-500', bg: 'bg-blue-100', chartColor: '#3b82f6' },
  { key: 'seoScore' as const, title: 'SEO Score', icon: <ShieldCheck size={20} />, color: 'text-green-500', bg: 'bg-green-100', chartColor: '#10b981', noSparkline: true },
];

const QUICK_ICONS: Record<string, ReactNode> = {
  'Create New Page': <FileText size={18} className="text-blue-600" />,
  'Add Blog Post': <Edit3 size={18} className="text-green-600" />,
  'Upload Media': <Upload size={18} className="text-purple-600" />,
  'Create Form': <FormInput size={18} className="text-orange-600" />,
  'Manage Menus': <Layout size={18} className="text-blue-600" />,
  'Edit Sliders': <Layers size={18} className="text-indigo-600" />,
  'Add Popup': <BellRing size={18} className="text-red-600" />,
  'SEO Settings': <Search size={18} className="text-slate-600" />,
  'Theme Settings': <Palette size={18} className="text-blue-600" />,
  'Backup Website': <Database size={18} className="text-slate-600" />,
};

const BENEFIT_ICONS: Record<string, ReactNode> = {
  page: <FileText size={16} className="text-green-600" />,
  seo: <Search size={16} className="text-blue-600" />,
  mobile: <Smartphone size={16} className="text-indigo-600" />,
  analytics: <BarChart2 size={16} className="text-red-600" />,
  secure: <ShieldCheck size={16} className="text-blue-600" />,
  engage: <MessageSquare size={16} className="text-orange-600" />,
  brand: <Globe size={16} className="text-pink-600" />,
};

const ACTIVITY_ICONS: Record<string, ReactNode> = {
  page: <FileText size={14} className="text-red-500" />,
  blog: <Edit3 size={14} className="text-green-500" />,
  form: <FormInput size={14} className="text-orange-500" />,
  image: <ImageIcon size={14} className="text-blue-500" />,
};

const NOTICE_ICONS: Record<string, ReactNode> = {
  warning: <AlertTriangle size={14} className="text-orange-500" />,
  info: <Info size={14} className="text-blue-500" />,
  backup: <Database size={14} className="text-red-500" />,
};

const Sparkline = ({ color }: { color: string }) => (
  <svg width="60" height="15" className="ml-auto">
    <path d="M0,10 L10,5 L20,8 L30,2 L40,6 L50,0 L60,4" fill="none" stroke={color} strokeWidth="1.5" />
  </svg>
);

export function WebsiteDashboardView({ onNavigate }: { onNavigate?: (view: string) => void }) {
  const [data, setData] = useState<CmsDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('This Month');

  const load = useCallback(async (seed = false) => {
    setLoading(true);
    try {
      const result = await fetchCmsDashboard(seed, period);
      setData(result);
      if (result.period) setPeriod(result.period);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { void load(true); }, [load]);

  const nav = (target: string) => {
    if (onNavigate) onNavigate(toViewKey('Website & CMS Management', target));
  };

  const kpiList = useMemo(() => {
    if (!data) return [];
    return KPI_META.map((m) => ({
      ...m,
      value: typeof data.kpis[m.key].value === 'number'
        ? (data.kpis[m.key].value as number).toLocaleString('en-IN')
        : String(data.kpis[m.key].value),
      subtitle: data.kpis[m.key].subtitle,
      noSparkline: m.noSparkline || data.kpis[m.key].noSparkline,
      chartColor: data.kpis[m.key].chartColor || m.chartColor,
    }));
  }, [data]);

  if (loading && !data) return <AcademicLoading label="Loading website dashboard…" />;

  const heroImage = data?.heroImageUrl || 'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=400&h=200&fit=crop&q=80';
  const periods = data?.periods ?? ['This Month', 'Last Month', 'This Year'];

  return (
    <div className="flex flex-col space-y-4 h-full relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Website &amp; CMS Management CRM</h2>
          <p className="text-xs text-slate-500 mt-0.5">Build • Manage • Optimize • Publish</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`https://${data?.siteUrl ?? 'www.yourschool.edu.in'}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded px-3 py-2 shadow-sm hover:bg-slate-50 transition-colors"
          >
            <span className="mr-2">View Website</span>
            <ExternalLink size={14} className="text-slate-400" />
          </a>
          <div className="flex items-center text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded px-3 py-2 shadow-sm cursor-pointer hover:bg-slate-50">
            <select
              className="bg-transparent border-none outline-none text-slate-700 cursor-pointer appearance-none pr-4"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              {periods.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <ChevronDown size={14} className="ml-[-12px] text-slate-400 pointer-events-none" />
          </div>
          <button
            type="button"
            onClick={() => nav('Pages Management')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded flex items-center gap-2 shadow-sm transition-colors"
          >
            <Plus size={14} />
            <span>Create New Page</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {kpiList.map((kpi) => (
          <div key={kpi.key} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-8 h-8 rounded-full ${kpi.bg} ${kpi.color} flex items-center justify-center shadow-sm shrink-0`}>
                {kpi.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] text-slate-500 font-bold truncate">{kpi.title}</p>
                <p className="text-[14px] font-bold text-slate-900 truncate leading-tight mt-0.5">{kpi.value}</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              {kpi.subtitle && (
                <div className={`text-[8px] flex items-center gap-1 font-medium ${kpi.noSparkline ? 'text-slate-500' : 'text-green-600'}`}>
                  {kpi.subtitle}
                </div>
              )}
              {!kpi.noSparkline && <Sparkline color={kpi.chartColor} />}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[11px] font-bold text-slate-800">Website Overview</h3>
          </div>
          <div className="flex-1 flex flex-col">
            <div className="w-full bg-slate-100 rounded-lg overflow-hidden border border-slate-200 shadow-inner flex flex-col">
              <div className="bg-slate-200 h-4 flex items-center px-2 gap-1 border-b border-slate-300">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
              </div>
              <div className="h-28 bg-slate-800 relative flex items-center justify-center p-4">
                <div className="text-center w-full z-10">
                  <div className="flex items-center gap-1 mb-2">
                    <div className="w-3 h-3 bg-white rounded-sm" />
                    <span className="text-[6px] text-white font-bold tracking-widest uppercase">{data?.siteName ?? 'School'}</span>
                  </div>
                  <h4 className="text-[14px] text-white font-bold leading-tight text-left w-2/3 whitespace-pre-line">
                    {data?.heroTitle ?? 'Nurturing Minds\nBuilding Futures'}
                  </h4>
                  <div className="mt-2 text-left">
                    <button type="button" className="text-[6px] bg-yellow-500 text-white px-2 py-1 rounded font-bold">Explore Now</button>
                  </div>
                </div>
                <div className="absolute inset-0 opacity-40">
                  <img src={heroImage} alt="Website preview" className="w-full h-full object-cover" />
                </div>
              </div>
            </div>
            <div className="text-center mt-2 mb-3">
              <a href={`https://${data?.siteUrl}`} target="_blank" rel="noopener noreferrer" className="text-[9px] text-blue-600 font-medium hover:underline flex items-center justify-center gap-1">
                {data?.siteUrl} <ExternalLink size={10} />
              </a>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center mt-auto border-t border-slate-100 pt-3">
              <div>
                <span className="text-[7px] text-slate-500 font-medium block mb-1">Status</span>
                <span className="text-[8px] font-bold text-green-700">{data?.publishStatus ?? 'Published'}</span>
              </div>
              <div>
                <span className="text-[7px] text-slate-500 font-medium block mb-1">Theme</span>
                <span className="text-[8px] font-bold text-blue-700">{data?.themeName ?? 'Education Pro'}</span>
              </div>
              <div>
                <span className="text-[7px] text-slate-500 font-medium block mb-1">Last Updated</span>
                <span className="text-[8px] font-bold text-slate-700">{data?.lastUpdated ?? '—'}</span>
              </div>
              <div>
                <span className="text-[7px] text-slate-500 font-medium block mb-1">Version</span>
                <span className="text-[8px] font-bold text-slate-700">{data?.themeVersion ?? 'v2.4.1'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-4 flex flex-col relative">
          <div className="flex justify-between items-center mb-1">
            <h3 className="text-[11px] font-bold text-slate-800">
              Visitors Analytics <span className="font-normal text-slate-500">({period})</span>
            </h3>
          </div>
          <div className="flex-1 w-full h-full min-h-[140px] relative mt-2 mb-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.visitorTrends ?? []} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 7, fill: '#64748b' }} dy={5} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 7, fill: '#64748b' }} tickFormatter={(val) => val >= 1000 ? `${val / 1000}K` : val} />
                <RechartsTooltip contentStyle={{ fontSize: '9px', borderRadius: '4px', padding: '4px' }} />
                <Area type="monotone" dataKey="visitors" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorVisitors)" dot={{ r: 3, fill: '#8b5cf6', strokeWidth: 1, stroke: '#fff' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center border-t border-slate-100 pt-3">
            <div>
              <span className="text-[12px] font-bold text-blue-600 block">{(data?.visitorSummary.totalVisitors ?? 0).toLocaleString('en-IN')}</span>
              <span className="text-[7px] text-slate-500 font-medium">Total Visitors</span>
            </div>
            <div>
              <span className="text-[12px] font-bold text-green-600 block">{(data?.visitorSummary.uniqueVisitors ?? 0).toLocaleString('en-IN')}</span>
              <span className="text-[7px] text-slate-500 font-medium">Unique Visitors</span>
            </div>
            <div>
              <span className="text-[12px] font-bold text-purple-600 block">{(data?.visitorSummary.pageViews ?? 0).toLocaleString('en-IN')}</span>
              <span className="text-[7px] text-slate-500 font-medium">Page Views</span>
            </div>
            <div>
              <span className="text-[12px] font-bold text-slate-800 block">{data?.visitorSummary.avgSession ?? '—'}</span>
              <span className="text-[7px] text-slate-500 font-medium">Avg. Session</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-2 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[11px] font-bold text-slate-800">Top Pages</h3>
            <button type="button" onClick={() => nav('Pages Management')} className="text-[9px] text-blue-600 font-medium hover:underline">View All</button>
          </div>
          <div className="flex text-[7px] text-slate-400 font-medium border-b border-slate-100 pb-1 mb-2">
            <div className="flex-1">Page Title</div>
            <div className="w-12 text-right">Views</div>
          </div>
          <div className="flex-1 flex flex-col gap-2 overflow-y-auto">
            {(data?.topPages ?? []).map((page, i) => {
              const percent = page.max > 0 ? (page.views / page.max) * 100 : 0;
              return (
                <div key={i} className="flex items-center gap-2 text-[9px]">
                  <span className="text-slate-700 font-medium truncate w-16 shrink-0">{page.name}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden flex items-center">
                    <div className="bg-purple-500 h-full rounded-full" style={{ width: `${percent}%` }} />
                  </div>
                  <span className="text-slate-600 w-8 text-right shrink-0">{page.views.toLocaleString('en-IN')}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[11px] font-bold text-slate-800">SEO Overview</h3>
            <button type="button" onClick={() => nav('SEO Management')} className="text-[9px] text-blue-600 font-medium hover:underline">View Report</button>
          </div>
          <div className="flex items-center flex-1">
            <div className="w-24 flex flex-col items-center shrink-0">
              <div className="w-16 h-16 rounded-full border-4 border-green-500 flex items-center justify-center mb-1 relative">
                <div className="text-center leading-none">
                  <span className="text-[18px] font-bold text-slate-800 block">{data?.seoOverview.score ?? 0}</span>
                  <span className="text-[8px] text-slate-500">/ 100</span>
                </div>
                <div className="absolute inset-[-4px] rounded-full border-4 border-slate-100" style={{ clipPath: 'polygon(50% 50%, 100% 0, 100% 100%, 0 100%, 0 0, 40% 0)' }} />
              </div>
              <span className="text-[9px] font-bold text-green-700">{data?.seoOverview.label ?? 'Excellent'}</span>
            </div>
            <div className="flex-1 flex flex-col gap-1.5 border-l border-slate-100 pl-4 ml-2">
              {(data?.seoOverview.checklist ?? []).map((item, i) => (
                <div key={i} className="flex justify-between items-center text-[8px]">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${item.name.includes('Speed') ? 'bg-yellow-500' : item.name.includes('Sitemap') ? 'bg-red-500' : 'bg-blue-500'}`} />
                    <span className="text-slate-600 font-medium">{item.name}</span>
                  </div>
                  <span className="font-bold text-slate-800">{item.score}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[11px] font-bold text-slate-800">Recent Pages</h3>
            <button type="button" onClick={() => nav('Pages Management')} className="text-[9px] text-blue-600 font-medium hover:underline">View All</button>
          </div>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-[8px] text-left">
              <thead>
                <tr className="text-slate-500 border-b border-slate-100">
                  <th className="pb-2 font-medium">Page Title</th>
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium text-right">Updated On</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(data?.recentPages ?? []).map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2 text-slate-800 font-medium truncate pr-2">{row.title}</td>
                    <td className="py-2 text-slate-600">{row.type}</td>
                    <td className="py-2">
                      <span className="text-[7px] font-bold text-green-700">{row.status}</span>
                    </td>
                    <td className="py-2 text-right text-slate-600 whitespace-nowrap">{row.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-center mt-2 border-t border-slate-100 pt-2 text-[9px] font-bold text-blue-600">
            Total Pages: {data?.totalPages ?? 0}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-4 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[11px] font-bold text-slate-800">Blog Posts</h3>
            <button type="button" onClick={() => nav('Blog Management')} className="text-[9px] text-blue-600 font-medium hover:underline">View All</button>
          </div>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-[8px] text-left">
              <thead>
                <tr className="text-slate-500 border-b border-slate-100">
                  <th className="pb-2 font-medium">Post Title</th>
                  <th className="pb-2 font-medium">Author</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(data?.blogPosts ?? []).map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2 text-slate-800 font-medium truncate max-w-[120px] pr-2">{row.title}</td>
                    <td className="py-2 text-slate-600">{row.author}</td>
                    <td className="py-2">
                      <span className={`text-[7px] font-bold ${row.status === 'Published' || row.status === 'PUBLISHED' ? 'text-green-700' : 'text-amber-600'}`}>{row.status}</span>
                    </td>
                    <td className="py-2 text-right text-slate-600 whitespace-nowrap">{row.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-center mt-2 border-t border-slate-100 pt-2 text-[9px] font-bold text-blue-600">
            Total Posts: {data?.totalPosts ?? 0}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[11px] font-bold text-slate-800">Media Library</h3>
            <button type="button" onClick={() => nav('Media Library')} className="text-[9px] text-blue-600 font-medium hover:underline">View All</button>
          </div>
          <div className="grid grid-cols-4 gap-2 mb-4">
            {[
              { label: 'Images', count: data?.mediaLibrary.images ?? 0, icon: <ImageIcon size={16} className="text-green-500 mb-1" /> },
              { label: 'Documents', count: data?.mediaLibrary.documents ?? 0, icon: <FileText size={16} className="text-blue-500 mb-1" /> },
              { label: 'Videos', count: data?.mediaLibrary.videos ?? 0, icon: <PlayCircle size={16} className="text-red-500 mb-1" /> },
              { label: 'Audio', count: data?.mediaLibrary.audio ?? 0, icon: <Music size={16} className="text-purple-500 mb-1" /> },
            ].map((item) => (
              <div key={item.label} className="border border-slate-100 rounded-lg p-2 flex flex-col items-center justify-center text-center hover:bg-slate-50 cursor-pointer transition-colors">
                {item.icon}
                <span className="text-[7px] font-medium text-slate-600 block mb-0.5">{item.label}</span>
                <span className="text-[11px] font-bold text-slate-900">{item.count.toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
          <div className="mt-auto">
            <div className="flex justify-between items-end mb-1">
              <span className="text-[8px] font-bold text-slate-700">Storage Used</span>
              <span className="text-[7px] text-slate-500">
                {data?.mediaLibrary.storageUsedGb ?? 0} GB / {data?.mediaLibrary.storageLimitGb ?? 10} GB
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden mb-1">
              <div className="bg-blue-600 h-full rounded-full" style={{ width: `${data?.mediaLibrary.storagePercent ?? 0}%` }} />
            </div>
            <div className="text-right text-[7px] font-bold text-slate-700">{data?.mediaLibrary.storagePercent ?? 0}%</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-2 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-2 flex-1 content-start">
            {(data?.quickActions ?? []).slice(0, 8).map((action, i) => (
              <button
                key={i}
                type="button"
                onClick={() => nav(action.target)}
                className="flex flex-col items-center justify-center text-center p-2 rounded-lg border border-slate-100 hover:bg-slate-50 hover:border-slate-200 transition-colors group"
              >
                <div className="mb-1 group-hover:scale-110 transition-transform bg-white rounded p-1 shadow-sm border border-slate-100">
                  {QUICK_ICONS[action.label] ?? <FileText size={18} className="text-blue-600" />}
                </div>
                <span className="text-[7px] text-slate-700 font-medium leading-tight px-0.5 whitespace-normal">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[11px] font-bold text-slate-800">Forms Overview</h3>
            <button type="button" onClick={() => nav('Forms Management')} className="text-[9px] text-blue-600 font-medium hover:underline">View All</button>
          </div>
          <div className="flex items-center justify-center gap-2 flex-1">
            <div className="w-20 h-20 relative shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data?.formOverview ?? []} cx="50%" cy="50%" innerRadius={22} outerRadius={32} dataKey="value" stroke="none">
                    {(data?.formOverview ?? []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[11px] font-bold text-slate-800">{(data?.totalFormSubmissions ?? 0).toLocaleString('en-IN')}</span>
                <span className="text-[5px] text-slate-500 leading-tight w-10">Total Submissions</span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 text-[8px] flex-1 min-w-0">
              {(data?.formOverview ?? []).map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-1 min-w-0">
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-600 font-medium truncate">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-1">
                    <span className="font-bold text-slate-800">{item.value}</span>
                    <span className="text-slate-400">({item.percent})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[11px] font-bold text-slate-800">Device Overview</h3>
            <button type="button" onClick={() => nav('Analytics & Reports')} className="text-[9px] text-blue-600 font-medium hover:underline">View Report</button>
          </div>
          <div className="flex items-center justify-center gap-4 flex-1">
            <div className="w-20 h-20 relative shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data?.deviceOverview ?? []} cx="50%" cy="50%" innerRadius={22} outerRadius={32} dataKey="value" stroke="none">
                    {(data?.deviceOverview ?? []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center">
                <Monitor size={16} className="text-slate-400" />
              </div>
            </div>
            <div className="flex flex-col gap-2 text-[9px] flex-1">
              {(data?.deviceOverview ?? []).map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-600 font-medium whitespace-nowrap">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[8px]">
                    <span className="font-bold text-slate-800">{item.value.toLocaleString('en-IN')}</span>
                    <span className="text-slate-400">({item.percent})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[11px] font-bold text-slate-800">Recent Activity</h3>
            <button type="button" onClick={() => nav('Analytics & Reports')} className="text-[9px] text-blue-600 font-medium hover:underline">View All</button>
          </div>
          <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-1">
            {(data?.recentActivity ?? []).map((activity, i) => (
              <div key={i} className="flex gap-2 items-start">
                <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${activity.bg}`}>
                  {ACTIVITY_ICONS[activity.iconType] ?? <FileText size={14} className="text-slate-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-bold text-slate-800 leading-tight pr-2">{activity.text}</p>
                  <span className="text-[7.5px] text-slate-500 font-medium">{activity.by}</span>
                </div>
                <span className="text-[7px] text-slate-400 whitespace-nowrap pt-0.5">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[11px] font-bold text-slate-800">Important Notices</h3>
            <button type="button" onClick={() => nav('Popups & Notices')} className="text-[9px] text-blue-600 font-medium hover:underline">View All</button>
          </div>
          <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-1">
            {(data?.importantNotices ?? []).map((notice, i) => (
              <div key={i} className="flex gap-2 items-start">
                <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${notice.bg}`}>
                  {NOTICE_ICONS[notice.iconType] ?? <Info size={14} className="text-blue-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[8px] font-medium text-slate-800 leading-snug">{notice.text}</p>
                </div>
                <span className="text-[7px] text-slate-500 whitespace-nowrap pt-0.5 font-medium shrink-0">{notice.date}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-2 mt-2">
        {(data?.keyBenefits ?? []).map((benefit, i) => (
          <div key={i} className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm flex items-center gap-2">
            <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${benefit.bg ?? 'bg-slate-50'}`}>
              {BENEFIT_ICONS[benefit.iconType ?? 'page'] ?? <FileText size={16} className="text-green-600" />}
            </div>
            <div className="min-w-0">
              <p className="text-[7px] font-bold text-slate-800 leading-tight truncate">{benefit.title}</p>
              <p className="text-[6.5px] text-slate-500 truncate leading-snug">{benefit.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
