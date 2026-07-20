import { useState } from 'react';
import { 
  Globe, FileText, Image as ImageIcon, Layout, Layers, 
  MessageSquare, FormInput, BellRing, Search, Palette, 
  Database, BarChart2, ChevronDown, Plus, ExternalLink,
  ShieldCheck, Upload, PlayCircle, Music, Clock, Settings,
  Laptop, Smartphone, Tablet, Edit3, Monitor, Activity, 
  RefreshCcw, AlertTriangle, Info, CheckCircle2
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid, Legend
} from 'recharts';

const kpis = [
  { title: 'Total Pages', value: '58', subtitle: '↑ 12.2% this month', icon: <FileText size={20} />, color: 'text-blue-500', bg: 'bg-blue-100', chartColor: '#3b82f6' },
  { title: 'Blog Posts', value: '32', subtitle: '↑ 8.6% this month', icon: <Edit3 size={20} />, color: 'text-green-500', bg: 'bg-green-100', chartColor: '#10b981' },
  { title: 'Media Files', value: '1,248', subtitle: '↑ 15.3% this month', icon: <ImageIcon size={20} />, color: 'text-orange-500', bg: 'bg-orange-100', chartColor: '#f59e0b' },
  { title: 'Form Submissions', value: '254', subtitle: '↑ 18.7% this month', icon: <FormInput size={20} />, color: 'text-red-500', bg: 'bg-red-100', chartColor: '#ef4444' },
  { title: 'Website Visitors', value: '12,458', subtitle: '↑ 21.5% this month', icon: <Globe size={20} />, color: 'text-blue-500', bg: 'bg-blue-100', chartColor: '#3b82f6' },
  { title: 'SEO Score', value: '92 / 100', subtitle: 'Excellent', icon: <ShieldCheck size={20} />, color: 'text-green-500', bg: 'bg-green-100', chartColor: '#10b981', noSparkline: true },
];

const visitorTrends = [
  { day: '1 May', visitors: 1200 },
  { day: '6 May', visitors: 1800 },
  { day: '11 May', visitors: 1500 },
  { day: '16 May', visitors: 2200 },
  { day: '21 May', visitors: 1600 },
  { day: '26 May', visitors: 2500 },
  { day: '31 May', visitors: 2100 },
];

const topPages = [
  { name: 'Home', views: 3245, max: 3500 },
  { name: 'About Us', views: 1856, max: 3500 },
  { name: 'Admissions', views: 1425, max: 3500 },
  { name: 'Academics', views: 1286, max: 3500 },
  { name: 'Events', views: 1125, max: 3500 },
  { name: 'Gallery', views: 985, max: 3500 },
  { name: 'Contact Us', views: 852, max: 3500 },
  { name: 'Blog', views: 768, max: 3500 },
];

const seoChecklist = [
  { name: 'On-Page SEO', score: '95/100', color: 'text-blue-500' },
  { name: 'Meta Tags', score: '90/100', color: 'text-blue-500' },
  { name: 'Mobile Friendly', score: '100/100', color: 'text-green-500' },
  { name: 'Page Speed', score: '88/100', color: 'text-yellow-500' },
  { name: 'Sitemap', score: '95/100', color: 'text-red-500' },
  { name: 'SSL Security', score: '100/100', color: 'text-green-500' },
];

const recentPages = [
  { title: 'Home', type: 'Static', status: 'Published', date: '16 May 2025' },
  { title: 'About Us', type: 'Static', status: 'Published', date: '16 May 2025' },
  { title: 'Admissions', type: 'Static', status: 'Published', date: '15 May 2025' },
  { title: 'Campus Life', type: 'Static', status: 'Published', date: '15 May 2025' },
  { title: 'Facilities', type: 'Static', status: 'Published', date: '14 May 2025' },
];

const blogPosts = [
  { title: 'Annual Day Celebration 2025', author: 'Admin', status: 'Published', date: '17 May 2025' },
  { title: 'Science Exhibition Highlights', author: 'Admin', status: 'Published', date: '16 May 2025' },
  { title: 'Tips for Exam Preparation', author: 'Teacher', status: 'Published', date: '15 May 2025' },
  { title: 'Summer Camp Registration Open', author: 'Admin', status: 'Draft', date: '14 May 2025' },
  { title: 'Why Choose Our School?', author: 'Admin', status: 'Published', date: '13 May 2025' },
];

const quickActions = [
  { label: 'Create New Page', icon: <FileText size={18} className="text-blue-600" /> },
  { label: 'Add Blog Post', icon: <Edit3 size={18} className="text-green-600" /> },
  { label: 'Upload Media', icon: <Upload size={18} className="text-purple-600" /> },
  { label: 'Create Form', icon: <FormInput size={18} className="text-orange-600" /> },
  { label: 'Manage Menus', icon: <Layout size={18} className="text-blue-600" /> },
  { label: 'Edit Sliders', icon: <Layers size={18} className="text-indigo-600" /> },
  { label: 'Add Popup', icon: <BellRing size={18} className="text-red-600" /> },
  { label: 'SEO Settings', icon: <Search size={18} className="text-slate-600" /> },
  { label: 'Theme Settings', icon: <Palette size={18} className="text-blue-600" /> },
  { label: 'Backup Website', icon: <Database size={18} className="text-slate-600" /> },
];

const formOverview = [
  { name: 'Admission Enquiry', value: 98, color: '#3b82f6', percent: '38.6%' },
  { name: 'Contact Us', value: 76, color: '#10b981', percent: '29.9%' },
  { name: 'Career Enquiry', value: 45, color: '#f59e0b', percent: '17.7%' },
  { name: 'Event Registration', value: 25, color: '#ef4444', percent: '9.9%' },
  { name: 'Other Forms', value: 10, color: '#8b5cf6', percent: '3.9%' },
];

const deviceOverview = [
  { name: 'Desktop', value: 7245, color: '#3b82f6', percent: '58.2%' },
  { name: 'Mobile', value: 4852, color: '#10b981', percent: '38.9%' },
  { name: 'Tablet', value: 361, color: '#f59e0b', percent: '2.9%' },
];

const recentActivity = [
  { text: 'Page "Admissions" updated', by: 'By Admin', time: '16 May 2025, 10:15 AM', icon: <FileText size={14} className="text-red-500" />, bg: 'bg-red-50' },
  { text: 'New blog post published', by: 'By Admin', time: '16 May 2025, 09:30 AM', icon: <Edit3 size={14} className="text-green-500" />, bg: 'bg-green-50' },
  { text: 'New form submission received', by: 'Contact Us Form', time: '16 May 2025, 09:05 AM', icon: <FormInput size={14} className="text-orange-500" />, bg: 'bg-orange-50' },
  { text: 'Image uploaded in gallery', by: 'By Admin', time: '15 May 2025, 06:20 PM', icon: <ImageIcon size={14} className="text-blue-500" />, bg: 'bg-blue-50' },
];

const importantNotices = [
  { text: 'Website maintenance scheduled on 20 May 2025 from 12:00 AM to 2:00 AM.', date: '16 May 2025', icon: <AlertTriangle size={14} className="text-orange-500" />, bg: 'bg-orange-50' },
  { text: 'Please update all admission related pages.', date: '15 May 2025', icon: <Info size={14} className="text-blue-500" />, bg: 'bg-blue-50' },
  { text: 'Don\'t forget to backup your website regularly.', date: '14 May 2025', icon: <Database size={14} className="text-red-500" />, bg: 'bg-red-50' },
];

const keyBenefits = [
  { title: 'Easy Content Management', desc: 'Update pages & content without coding', icon: <FileText size={16} className="text-green-600" />, bg: 'bg-green-50' },
  { title: 'SEO Optimized', desc: 'Improve search ranking & visibility', icon: <Search size={16} className="text-blue-600" />, bg: 'bg-blue-50' },
  { title: 'Mobile Responsive', desc: 'Looks perfect on all devices', icon: <Smartphone size={16} className="text-indigo-600" />, bg: 'bg-indigo-50' },
  { title: 'Real-time Analytics', desc: 'Track visitors and performance', icon: <BarChart2 size={16} className="text-red-600" />, bg: 'bg-red-50' },
  { title: 'Secure & Reliable', desc: 'SSL, backup & security for your website', icon: <ShieldCheck size={16} className="text-blue-600" />, bg: 'bg-blue-50' },
  { title: 'Engage Better', desc: 'Forms, popups & blogs to engage visitors', icon: <MessageSquare size={16} className="text-orange-600" />, bg: 'bg-orange-50' },
  { title: 'Brand Building', desc: 'Showcase your school professionally', icon: <Globe size={16} className="text-pink-600" />, bg: 'bg-pink-50' },
];

// Simple Sparkline component using SVG
const Sparkline = ({ color }: { color: string }) => {
  return (
    <svg width="60" height="15" className="ml-auto">
      <path d="M0,10 L10,5 L20,8 L30,2 L40,6 L50,0 L60,4" fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
};

export function WebsiteCMSManagementCRM() {
  const [selectedPeriod, setSelectedPeriod] = useState('This Month');

  return (
    <div className="flex flex-col space-y-4 h-full relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Website & CMS Management CRM</h2>
          <p className="text-xs text-slate-500 mt-0.5">Build • Manage • Optimize • Publish</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="flex items-center text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded px-3 py-2 shadow-sm hover:bg-slate-50 transition-colors">
             <span className="mr-2">View Website</span>
             <ExternalLink size={14} className="text-slate-400" />
          </button>
          <div className="flex items-center text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded px-3 py-2 shadow-sm cursor-pointer hover:bg-slate-50">
            <select 
              className="bg-transparent border-none outline-none text-slate-700 cursor-pointer appearance-none pr-4"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
            >
              <option value="This Month">This Month</option>
              <option value="Last Month">Last Month</option>
              <option value="This Year">This Year</option>
            </select>
            <ChevronDown size={14} className="ml-[-12px] text-slate-400 pointer-events-none" />
          </div>
          <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded flex items-center gap-2 shadow-sm transition-colors">
            <Plus size={14} />
            <span>Create New Page</span>
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {kpis.map((kpi, i) => (
          <div key={i} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden">
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

      {/* First Row Workspace */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4">
        
        {/* Website Overview */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[11px] font-bold text-slate-800">Website Overview</h3>
          </div>
          <div className="flex-1 flex flex-col">
             <div className="w-full bg-slate-100 rounded-lg overflow-hidden border border-slate-200 shadow-inner flex flex-col">
                {/* Mock Browser Header */}
                <div className="bg-slate-200 h-4 flex items-center px-2 gap-1 border-b border-slate-300">
                   <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div>
                   <div className="w-1.5 h-1.5 rounded-full bg-yellow-400"></div>
                   <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                </div>
                {/* Mock Image Content */}
                <div className="h-28 bg-slate-800 relative flex items-center justify-center p-4">
                   <div className="text-center w-full z-10">
                      <div className="flex items-center gap-1 mb-2">
                         <div className="w-3 h-3 bg-white rounded-sm"></div>
                         <span className="text-[6px] text-white font-bold tracking-widest uppercase">School</span>
                      </div>
                      <h4 className="text-[14px] text-white font-bold leading-tight text-left w-2/3">Nurturing Minds<br/>Building Futures</h4>
                      <div className="mt-2 text-left">
                         <button className="text-[6px] bg-yellow-500 text-white px-2 py-1 rounded font-bold">Explore Now</button>
                      </div>
                   </div>
                   {/* Background Image mock */}
                   <div className="absolute inset-0 opacity-40">
                      <img src="https://images.unsplash.com/photo-1577896851231-70ef18881754?w=400&h=200&fit=crop&q=80" alt="Students" className="w-full h-full object-cover" />
                   </div>
                </div>
             </div>
             <div className="text-center mt-2 mb-3">
                <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline flex items-center justify-center gap-1">www.yourschool.edu.in <ExternalLink size={10} /></a>
             </div>
             
             <div className="grid grid-cols-4 gap-2 text-center mt-auto border-t border-slate-100 pt-3">
                <div>
                   <span className="text-[7px] text-slate-500 font-medium block mb-1">Status</span>
                   <span className="text-[8px] font-bold text-green-700">Published</span>
                </div>
                <div>
                   <span className="text-[7px] text-slate-500 font-medium block mb-1">Theme</span>
                   <span className="text-[8px] font-bold text-blue-700">Education Pro</span>
                </div>
                <div>
                   <span className="text-[7px] text-slate-500 font-medium block mb-1">Last Updated</span>
                   <span className="text-[8px] font-bold text-slate-700">16 May 2025</span>
                </div>
                <div>
                   <span className="text-[7px] text-slate-500 font-medium block mb-1">Version</span>
                   <span className="text-[8px] font-bold text-slate-700">v2.4.1</span>
                </div>
             </div>
          </div>
        </div>

        {/* Visitors Analytics */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-4 flex flex-col relative">
          <div className="flex justify-between items-center mb-1">
            <h3 className="text-[11px] font-bold text-slate-800">Visitors Analytics <span className="font-normal text-slate-500">(This Month)</span></h3>
          </div>
          
          <div className="flex-1 w-full h-full min-h-[140px] relative mt-2 mb-2">
             <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={visitorTrends} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                 <defs>
                   <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                     <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                   </linearGradient>
                 </defs>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                 <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 7, fill: '#64748b' }} dy={5} />
                 <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 7, fill: '#64748b' }} domain={[0, 3000]} tickFormatter={(val) => val >= 1000 ? `${val/1000}K` : val} />
                 <RechartsTooltip contentStyle={{ fontSize: '9px', borderRadius: '4px', padding: '4px' }} />
                 <Area type="monotone" dataKey="visitors" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorVisitors)" dot={{ r: 3, fill: '#8b5cf6', strokeWidth: 1, stroke: '#fff' }} />
               </AreaChart>
             </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center border-t border-slate-100 pt-3">
             <div>
                <span className="text-[12px] font-bold text-blue-600 block">12,458</span>
                <span className="text-[7px] text-slate-500 font-medium">Total Visitors</span>
             </div>
             <div>
                <span className="text-[12px] font-bold text-green-600 block">10,245</span>
                <span className="text-[7px] text-slate-500 font-medium">Unique Visitors</span>
             </div>
             <div>
                <span className="text-[12px] font-bold text-purple-600 block">23,654</span>
                <span className="text-[7px] text-slate-500 font-medium">Page Views</span>
             </div>
             <div>
                <span className="text-[12px] font-bold text-slate-800 block">3m 45s</span>
                <span className="text-[7px] text-slate-500 font-medium">Avg. Session</span>
             </div>
          </div>
        </div>

        {/* Top Pages */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-2 flex flex-col">
          <div className="flex justify-between items-center mb-3">
             <h3 className="text-[11px] font-bold text-slate-800">Top Pages</h3>
             <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View All</a>
          </div>
          
          <div className="flex text-[7px] text-slate-400 font-medium border-b border-slate-100 pb-1 mb-2">
             <div className="flex-1">Page Title</div>
             <div className="w-12 text-right">Views</div>
          </div>
          
          <div className="flex-1 flex flex-col gap-2 overflow-y-auto">
             {topPages.map((page, i) => {
                const percent = (page.views / page.max) * 100;
                return (
                   <div key={i} className="flex items-center gap-2 text-[9px]">
                      <span className="text-slate-700 font-medium truncate w-16 shrink-0">{page.name}</span>
                      <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden flex items-center">
                         <div className="bg-purple-500 h-full rounded-full" style={{ width: `${percent}%` }}></div>
                      </div>
                      <span className="text-slate-600 w-8 text-right shrink-0">{page.views.toLocaleString()}</span>
                   </div>
                )
             })}
          </div>
        </div>

        {/* SEO Overview */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <div className="flex justify-between items-center mb-3">
             <h3 className="text-[11px] font-bold text-slate-800">SEO Overview</h3>
             <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View Report</a>
          </div>
          
          <div className="flex items-center flex-1">
             <div className="w-24 flex flex-col items-center shrink-0">
                <div className="w-16 h-16 rounded-full border-4 border-green-500 flex items-center justify-center mb-1 relative">
                   <div className="text-center leading-none">
                      <span className="text-[18px] font-bold text-slate-800 block">92</span>
                      <span className="text-[8px] text-slate-500">/ 100</span>
                   </div>
                   {/* Simplified circular gauge arc illusion */}
                   <div className="absolute inset-[-4px] rounded-full border-4 border-slate-100" style={{ clipPath: 'polygon(50% 50%, 100% 0, 100% 100%, 0 100%, 0 0, 40% 0)' }}></div>
                </div>
                <span className="text-[9px] font-bold text-green-700">Excellent</span>
             </div>
             
             <div className="flex-1 flex flex-col gap-1.5 border-l border-slate-100 pl-4 ml-2">
                {seoChecklist.map((item, i) => (
                   <div key={i} className="flex justify-between items-center text-[8px]">
                      <div className="flex items-center gap-1.5">
                         <div className={`w-1.5 h-1.5 rounded-full ${item.name.includes('Speed') ? 'bg-yellow-500' : item.name.includes('Sitemap') ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                         <span className="text-slate-600 font-medium">{item.name}</span>
                      </div>
                      <span className="font-bold text-slate-800">{item.score}</span>
                   </div>
                ))}
             </div>
          </div>
        </div>

      </div>

      {/* Second Row Workspace */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4">
        
        {/* Recent Pages */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <div className="flex justify-between items-center mb-3">
             <h3 className="text-[11px] font-bold text-slate-800">Recent Pages</h3>
             <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View All</a>
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
                   {recentPages.map((row, i) => (
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
            Total Pages: 58
          </div>
        </div>

        {/* Blog Posts */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-4 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[11px] font-bold text-slate-800">Blog Posts</h3>
            <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View All</a>
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
                   {blogPosts.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                         <td className="py-2 text-slate-800 font-medium truncate max-w-[120px] pr-2">{row.title}</td>
                         <td className="py-2 text-slate-600">{row.author}</td>
                         <td className="py-2">
                            <span className={`text-[7px] font-bold ${row.status === 'Published' ? 'text-green-700' : 'text-amber-600'}`}>{row.status}</span>
                         </td>
                         <td className="py-2 text-right text-slate-600 whitespace-nowrap">{row.date}</td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
          <div className="text-center mt-2 border-t border-slate-100 pt-2 text-[9px] font-bold text-blue-600">
            Total Posts: 32
          </div>
        </div>

        {/* Media Library */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <div className="flex justify-between items-center mb-3">
             <h3 className="text-[11px] font-bold text-slate-800">Media Library</h3>
             <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View All</a>
          </div>
          
          <div className="grid grid-cols-4 gap-2 mb-4">
             <div className="border border-slate-100 rounded-lg p-2 flex flex-col items-center justify-center text-center hover:bg-slate-50 cursor-pointer transition-colors">
                <ImageIcon size={16} className="text-green-500 mb-1" />
                <span className="text-[7px] font-medium text-slate-600 block mb-0.5">Images</span>
                <span className="text-[11px] font-bold text-slate-900">856</span>
             </div>
             <div className="border border-slate-100 rounded-lg p-2 flex flex-col items-center justify-center text-center hover:bg-slate-50 cursor-pointer transition-colors">
                <FileText size={16} className="text-blue-500 mb-1" />
                <span className="text-[7px] font-medium text-slate-600 block mb-0.5">Documents</span>
                <span className="text-[11px] font-bold text-slate-900">152</span>
             </div>
             <div className="border border-slate-100 rounded-lg p-2 flex flex-col items-center justify-center text-center hover:bg-slate-50 cursor-pointer transition-colors">
                <PlayCircle size={16} className="text-red-500 mb-1" />
                <span className="text-[7px] font-medium text-slate-600 block mb-0.5">Videos</span>
                <span className="text-[11px] font-bold text-slate-900">68</span>
             </div>
             <div className="border border-slate-100 rounded-lg p-2 flex flex-col items-center justify-center text-center hover:bg-slate-50 cursor-pointer transition-colors">
                <Music size={16} className="text-purple-500 mb-1" />
                <span className="text-[7px] font-medium text-slate-600 block mb-0.5">Audio</span>
                <span className="text-[11px] font-bold text-slate-900">24</span>
             </div>
          </div>

          <div className="mt-auto">
             <div className="flex justify-between items-end mb-1">
                <span className="text-[8px] font-bold text-slate-700">Storage Used</span>
                <span className="text-[7px] text-slate-500">2.45 GB / 10 GB</span>
             </div>
             <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden mb-1">
                <div className="bg-blue-600 h-full rounded-full" style={{ width: '24.5%' }}></div>
             </div>
             <div className="text-right text-[7px] font-bold text-slate-700">24.5%</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-2 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-2 flex-1 content-start">
            {quickActions.slice(0, 8).map((action, i) => (
              <button key={i} className="flex flex-col items-center justify-center text-center p-2 rounded-lg border border-slate-100 hover:bg-slate-50 hover:border-slate-200 transition-colors group">
                <div className="mb-1 group-hover:scale-110 transition-transform bg-white rounded p-1 shadow-sm border border-slate-100">
                  {action.icon}
                </div>
                <span className="text-[7px] text-slate-700 font-medium leading-tight px-0.5 whitespace-normal">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Third Row Workspace */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4">
        
        {/* Forms Overview */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <div className="flex justify-between items-center mb-3">
             <h3 className="text-[11px] font-bold text-slate-800">Forms Overview</h3>
             <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View All</a>
          </div>
          <div className="flex items-center justify-center gap-2 flex-1">
             <div className="w-20 h-20 relative shrink-0">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie data={formOverview} cx="50%" cy="50%" innerRadius={22} outerRadius={32} dataKey="value" stroke="none">
                     {formOverview.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={entry.color} />
                     ))}
                   </Pie>
                 </PieChart>
               </ResponsiveContainer>
               <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-[11px] font-bold text-slate-800">254</span>
                  <span className="text-[5px] text-slate-500 leading-tight w-10">Total Submissions</span>
               </div>
             </div>
             <div className="flex flex-col gap-1.5 text-[8px] flex-1 min-w-0">
               {formOverview.map((item, i) => (
                 <div key={i} className="flex items-center justify-between">
                   <div className="flex items-center gap-1 min-w-0">
                     <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: item.color }}></div>
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

        {/* Device Overview */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <div className="flex justify-between items-center mb-3">
             <h3 className="text-[11px] font-bold text-slate-800">Device Overview</h3>
             <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View Report</a>
          </div>
          <div className="flex items-center justify-center gap-4 flex-1">
             <div className="w-20 h-20 relative shrink-0">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie data={deviceOverview} cx="50%" cy="50%" innerRadius={22} outerRadius={32} dataKey="value" stroke="none">
                     {deviceOverview.map((entry, index) => (
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
               {deviceOverview.map((item, i) => (
                 <div key={i} className="flex items-center justify-between">
                   <div className="flex items-center gap-1.5">
                     <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                     <span className="text-slate-600 font-medium whitespace-nowrap">{item.name}</span>
                   </div>
                   <div className="flex items-center gap-1 text-[8px]">
                      <span className="font-bold text-slate-800">{item.value.toLocaleString()}</span>
                      <span className="text-slate-400">({item.percent})</span>
                   </div>
                 </div>
               ))}
             </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <div className="flex justify-between items-center mb-3">
             <h3 className="text-[11px] font-bold text-slate-800">Recent Activity</h3>
             <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View All</a>
          </div>
          <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-1">
             {recentActivity.map((activity, i) => (
                <div key={i} className="flex gap-2 items-start">
                   <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${activity.bg}`}>
                      {activity.icon}
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

        {/* Important Notices */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <div className="flex justify-between items-center mb-3">
             <h3 className="text-[11px] font-bold text-slate-800">Important Notices</h3>
             <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View All</a>
          </div>
          <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-1">
             {importantNotices.map((notice, i) => (
                <div key={i} className="flex gap-2 items-start">
                   <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${notice.bg}`}>
                      {notice.icon}
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

      {/* Bottom Banner - Key Benefits */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-2 mt-2">
         {keyBenefits.map((benefit, i) => (
            <div key={i} className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm flex items-center gap-2">
               <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${benefit.bg}`}>
                  {benefit.icon}
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
