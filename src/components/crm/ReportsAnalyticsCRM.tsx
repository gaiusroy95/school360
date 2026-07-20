import { useState } from 'react';
import { 
  Users, ClipboardCheck, FileText, IndianRupee, 
  Activity, ChevronDown, Plus, ExternalLink, Calendar, 
  AlertCircle, BookOpen, Target, Download, Share2, 
  TrendingUp, BarChart2, PieChart as PieChartIcon, 
  Lightbulb, Award, Clock, Search, Filter
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, 
  CartesianGrid, Legend, BarChart, Bar
} from 'recharts';

const kpis = [
  { title: 'Total Students', value: '12,568', subtitle: '↑ 8.45% vs last month', subtitleColor: 'text-green-600', icon: <Users size={20} />, color: 'text-blue-600', bg: 'bg-blue-100', sparkColor: '#2563eb' },
  { title: 'Total Teachers', value: '856', subtitle: '↑ 6.21% vs last month', subtitleColor: 'text-green-600', icon: <Users size={20} />, color: 'text-green-600', bg: 'bg-green-100', sparkColor: '#16a34a' },
  { title: 'Attendance Average', value: '92.45%', subtitle: '↑ 3.18% vs last month', subtitleColor: 'text-green-600', icon: <ClipboardCheck size={20} />, color: 'text-purple-600', bg: 'bg-purple-100', sparkColor: '#9333ea' },
  { title: 'Exam Pass Percentage', value: '89.67%', subtitle: '↑ 5.35% vs last month', subtitleColor: 'text-green-600', icon: <FileText size={20} />, color: 'text-orange-600', bg: 'bg-orange-100', sparkColor: '#ea580c' },
  { title: 'Fee Collection', value: '₹ 8,75,60,000', subtitle: '↑ 12.78% vs last month', subtitleColor: 'text-green-600', icon: <IndianRupee size={20} />, color: 'text-teal-600', bg: 'bg-teal-100', sparkColor: '#0d9488' },
  { title: 'Overall Performance Index', value: '85.6 / 100', subtitle: 'Very Good', subtitleColor: 'text-green-600', icon: <Activity size={20} />, color: 'text-red-600', bg: 'bg-red-100', sparkColor: '' },
];

const attendanceData = [
  { day: '01 Apr', attendance: 75 },
  { day: '08 Apr', attendance: 85 },
  { day: '15 Apr', attendance: 80 },
  { day: '22 Apr', attendance: 89 },
  { day: '29 Apr', attendance: 85 },
  { day: '06 May', attendance: 82 },
  { day: '13 May', attendance: 84 },
];

const feeData = [
  { month: 'Apr', collection: 5.52 },
  { month: 'May', collection: 8.75 },
  { month: 'Jun', collection: 6.23 },
  { month: 'Jul', collection: 7.18 },
  { month: 'Aug', collection: 5.95 },
  { month: 'Sep', collection: 4.82 },
];

const examPerformance = [
  { name: 'Distinction (75%+)', value: 3456, percent: '27.6%', color: '#16a34a' },
  { name: 'First Division (60-74%)', value: 5689, percent: '45.4%', color: '#2563eb' },
  { name: 'Second Division (40-59%)', value: 2145, percent: '17.1%', color: '#9333ea' },
  { name: 'Pass (33-39%)', value: 856, percent: '6.8%', color: '#eab308' },
  { name: 'Fail (Below 33%)', value: 422, percent: '3.4%', color: '#dc2626' },
];

const studentStrength = [
  { name: 'Nursery', value: 1245, percent: '9.9%', color: '#16a34a' },
  { name: 'Primary (1-5)', value: 4125, percent: '32.8%', color: '#2563eb' },
  { name: 'Middle (6-8)', value: 3245, percent: '25.8%', color: '#eab308' },
  { name: 'Secondary (9-10)', value: 2356, percent: '18.7%', color: '#9333ea' },
  { name: 'Senior Secondary (11-12)', value: 1597, percent: '12.8%', color: '#4f46e5' },
];

const academicPerformance = [
  { class: 'Class 10', total: 256, avg: 84.56, highest: 98.20, lowest: 45.60, pass: 92.18 },
  { class: 'Class 9', total: 278, avg: 82.34, highest: 97.40, lowest: 41.20, pass: 89.93 },
  { class: 'Class 8', total: 265, avg: 81.12, highest: 96.30, lowest: 38.40, pass: 88.30 },
  { class: 'Class 7', total: 290, avg: 79.45, highest: 95.60, lowest: 36.20, pass: 86.55 },
  { class: 'Class 6', total: 312, avg: 78.23, highest: 94.80, lowest: 34.60, pass: 85.10 },
];

const topPerformers = [
  { name: 'Aarav Sharma', class: 'Class 10-A', percent: '98.20%', iconColor: 'text-yellow-500', rank: 1 },
  { name: 'Diya Patel', class: 'Class 9-B', percent: '97.40%', iconColor: 'text-slate-400', rank: 2 },
  { name: 'Kabir Verma', class: 'Class 10-B', percent: '96.80%', iconColor: 'text-amber-700', rank: 3 },
  { name: 'Ishita Singh', class: 'Class 12-A', percent: '96.20%', iconColor: 'text-blue-500', rank: 4 },
  { name: 'Rohan Mehta', class: 'Class 11-A', percent: '95.70%', iconColor: 'text-blue-500', rank: 5 },
];

const alerts = [
  { text: 'Attendance below 75%', count: '58 Students', icon: <AlertCircle size={14} />, color: 'text-red-500', bg: 'bg-red-50' },
  { text: 'Fee pending more than 30 days', count: '152 Students', icon: <AlertCircle size={14} />, color: 'text-amber-500', bg: 'bg-amber-50' },
  { text: 'Exam scores below 40%', count: '96 Students', icon: <Target size={14} />, color: 'text-green-500', bg: 'bg-green-50' },
  { text: 'Library books overdue', count: '34 Students', icon: <BookOpen size={14} />, color: 'text-green-500', bg: 'bg-green-50' },
  { text: 'Upcoming events in next 7 days', count: '8 Events', icon: <Calendar size={14} />, color: 'text-purple-500', bg: 'bg-purple-50' },
];

const quickReports = [
  { label: 'Student Report', icon: <FileText size={18} className="text-blue-600" /> },
  { label: 'Attendance Report', icon: <ClipboardCheck size={18} className="text-blue-600" /> },
  { label: 'Exam Report', icon: <FileText size={18} className="text-blue-600" /> },
  { label: 'Fee Report', icon: <IndianRupee size={18} className="text-blue-600" /> },
  { label: 'Teacher Report', icon: <Users size={18} className="text-blue-600" /> },
  { label: 'Class Performance', icon: <BarChart2 size={18} className="text-blue-600" /> },
  { label: 'Subject Report', icon: <BookOpen size={18} className="text-blue-600" /> },
  { label: 'Custom Report', icon: <Activity size={18} className="text-blue-600" /> },
];

const analyticsTools = [
  { title: 'Comparative Analysis', desc: 'Compare performance between classes, sections, or time periods.', icon: <BarChart2 size={18} className="text-blue-600" />, bg: 'bg-blue-50' },
  { title: 'Export & Share', desc: 'Export reports in PDF, Excel, CSV & share.', icon: <Download size={18} className="text-green-600" />, bg: 'bg-green-50' },
  { title: 'Trend Analysis', desc: 'Identify trends & patterns over time.', icon: <TrendingUp size={18} className="text-amber-600" />, bg: 'bg-amber-50' },
  { title: 'Automated Reports', desc: 'Schedule & email reports automatically.', icon: <Target size={18} className="text-red-600" />, bg: 'bg-red-50' },
  { title: 'Drill-Down Reports', desc: 'Go deep into data for detailed insights.', icon: <Search size={18} className="text-purple-600" />, bg: 'bg-purple-50' },
  { title: 'Data Visualization', desc: 'Interactive charts & graphs for better insights.', icon: <PieChartIcon size={18} className="text-indigo-600" />, bg: 'bg-indigo-50' },
];

const dataInsights = [
  { text: 'Overall student performance improved by 5.35% compared to last month.', icon: <Users size={14} className="text-blue-500" />, bg: 'bg-blue-50' },
  { text: 'Attendance is above 90% in 78% of the classes.', icon: <Target size={14} className="text-green-500" />, bg: 'bg-green-50' },
  { text: 'Fee collection is 12.78% higher than last month.', icon: <FileText size={14} className="text-red-500" />, bg: 'bg-red-50' },
  { text: 'Science and Mathematics subject performance is the highest.', icon: <Activity size={14} className="text-amber-500" />, bg: 'bg-amber-50' },
];

const Sparkline = ({ color }: { color: string }) => {
  return (
    <svg width="60" height="15" className="ml-auto opacity-70">
      <path d="M0,12 L10,8 L20,10 L30,5 L40,7 L50,2 L60,0" fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
};

export function ReportsAnalyticsCRM() {
  const [dateRange, setDateRange] = useState('01 Apr 2025 - 17 May 2025');
  const [moduleFilter, setModuleFilter] = useState('All Modules');

  return (
    <div className="flex flex-col space-y-4 h-full relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Reports & Analytics Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">Real-time Insights • Data-driven Decisions • Better Outcomes</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded px-3 py-1.5 shadow-sm cursor-pointer hover:bg-slate-50">
            <select 
              className="bg-transparent border-none outline-none text-slate-700 cursor-pointer appearance-none pr-4 min-w-[150px]"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
            >
              <option value="01 Apr 2025 - 17 May 2025">01 Apr 2025 - 17 May 2025</option>
              <option value="Last Month">Last Month</option>
              <option value="This Year">This Year</option>
            </select>
            <ChevronDown size={14} className="ml-[-12px] text-slate-400 pointer-events-none" />
          </div>
          <div className="flex items-center text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded px-3 py-1.5 shadow-sm cursor-pointer hover:bg-slate-50">
            <select 
              className="bg-transparent border-none outline-none text-slate-700 cursor-pointer appearance-none pr-4"
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
            >
              <option value="All Modules">All Modules</option>
              <option value="Academics">Academics</option>
              <option value="Finance">Finance</option>
              <option value="HR">HR</option>
            </select>
            <ChevronDown size={14} className="ml-[-12px] text-slate-400 pointer-events-none" />
          </div>
          <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded flex items-center gap-2 shadow-sm transition-colors">
            <Plus size={14} />
            <span>Generate Custom Report</span>
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {kpis.map((kpi, i) => (
          <div key={i} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-8 h-8 rounded-full ${kpi.bg} ${kpi.color} flex items-center justify-center shadow-sm shrink-0`}>
                {kpi.icon}
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

      {/* First Row Workspace */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4">
        
        {/* Report Filters */}
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 shadow-sm xl:col-span-2 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[11px] font-bold text-slate-800">Report Filters</h3>
          </div>
          <div className="flex flex-col gap-3 flex-1">
             <div>
                <label className="text-[8px] font-bold text-slate-600 block mb-1">Date Range</label>
                <div className="flex items-center bg-white border border-slate-200 rounded px-2 py-1.5 shadow-sm cursor-text relative">
                   <input type="text" className="bg-transparent border-none outline-none text-slate-700 text-[9px] w-full pr-6" defaultValue="01 Apr 2025 - 17 May 2025" />
                   <Calendar size={12} className="text-slate-400 absolute right-2" />
                </div>
             </div>
             <div>
                <label className="text-[8px] font-bold text-slate-600 block mb-1">Academic Year</label>
                <div className="flex items-center bg-white border border-slate-200 rounded px-2 py-1.5 shadow-sm cursor-pointer relative">
                   <select className="bg-transparent border-none outline-none text-slate-700 text-[9px] w-full appearance-none pr-6 cursor-pointer">
                      <option>2025-26</option>
                   </select>
                   <ChevronDown size={12} className="text-slate-400 absolute right-2 pointer-events-none" />
                </div>
             </div>
             <div>
                <label className="text-[8px] font-bold text-slate-600 block mb-1">Class / Group</label>
                <div className="flex items-center bg-white border border-slate-200 rounded px-2 py-1.5 shadow-sm cursor-pointer relative">
                   <select className="bg-transparent border-none outline-none text-slate-700 text-[9px] w-full appearance-none pr-6 cursor-pointer">
                      <option>All Classes</option>
                   </select>
                   <ChevronDown size={12} className="text-slate-400 absolute right-2 pointer-events-none" />
                </div>
             </div>
             <div>
                <label className="text-[8px] font-bold text-slate-600 block mb-1">Section</label>
                <div className="flex items-center bg-white border border-slate-200 rounded px-2 py-1.5 shadow-sm cursor-pointer relative">
                   <select className="bg-transparent border-none outline-none text-slate-700 text-[9px] w-full appearance-none pr-6 cursor-pointer">
                      <option>All Sections</option>
                   </select>
                   <ChevronDown size={12} className="text-slate-400 absolute right-2 pointer-events-none" />
                </div>
             </div>
             <div>
                <label className="text-[8px] font-bold text-slate-600 block mb-1">Module</label>
                <div className="flex items-center bg-white border border-slate-200 rounded px-2 py-1.5 shadow-sm cursor-pointer relative">
                   <select className="bg-transparent border-none outline-none text-slate-700 text-[9px] w-full appearance-none pr-6 cursor-pointer">
                      <option>All Modules</option>
                   </select>
                   <ChevronDown size={12} className="text-slate-400 absolute right-2 pointer-events-none" />
                </div>
             </div>
          </div>
          <button className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] px-4 py-2 rounded shadow-sm transition-colors flex items-center justify-center gap-1.5">
             <Filter size={12} /> Apply Filters
          </button>
        </div>

        {/* Attendance Overview */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-4 flex flex-col relative group">
          <div className="flex justify-between items-center mb-1">
            <h3 className="text-[11px] font-bold text-slate-800">Attendance Overview</h3>
            <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline hidden group-hover:block">This Month</a>
          </div>
          
          <div className="flex-1 w-full min-h-[140px] relative mt-2 mb-2 pt-4">
             <ResponsiveContainer width="100%" height="100%">
               <LineChart data={attendanceData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
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
                <span className="text-[12px] font-bold text-slate-800 block">11,610</span>
                <span className="text-[8px] font-bold text-green-600">92.45%</span>
             </div>
             <div>
                <span className="text-[7px] text-slate-500 font-medium block mb-1">Absent</span>
                <span className="text-[12px] font-bold text-slate-800 block">958</span>
                <span className="text-[8px] font-bold text-red-600">7.63%</span>
             </div>
             <div>
                <span className="text-[7px] text-slate-500 font-medium block mb-1">On Leave</span>
                <span className="text-[12px] font-bold text-slate-800 block">346</span>
                <span className="text-[8px] font-bold text-amber-500">2.75%</span>
             </div>
             <div>
                <span className="text-[7px] text-slate-500 font-medium block mb-1">Late</span>
                <span className="text-[12px] font-bold text-slate-800 block">152</span>
                <span className="text-[8px] font-bold text-purple-600">1.21%</span>
             </div>
          </div>
        </div>

        {/* Student Performance (Exam) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col group">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[11px] font-bold text-slate-800">Student Performance (Exam)</h3>
            <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline hidden group-hover:block">This Month</a>
          </div>
          <div className="flex items-center justify-center gap-4 flex-1">
             <div className="w-24 h-24 relative shrink-0">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie data={examPerformance} cx="50%" cy="50%" innerRadius={28} outerRadius={40} dataKey="value" stroke="none">
                     {examPerformance.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={entry.color} />
                     ))}
                   </Pie>
                 </PieChart>
               </ResponsiveContainer>
               <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-[14px] font-bold text-slate-800">89.67%</span>
                  <span className="text-[6px] text-slate-500 leading-tight">Pass Percentage</span>
               </div>
             </div>
             <div className="flex flex-col gap-1.5 text-[8px] flex-1">
               {examPerformance.map((item, i) => (
                 <div key={i} className="flex items-center justify-between">
                   <div className="flex items-center gap-1.5 min-w-0">
                     <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: item.color }}></div>
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
             Total Students: 12,568
          </div>
        </div>

        {/* Fee Collection Overview */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col group">
          <div className="flex justify-between items-center mb-1">
            <h3 className="text-[11px] font-bold text-slate-800">Fee Collection Overview</h3>
            <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline hidden group-hover:block">This Month</a>
          </div>
          
          <div className="flex-1 w-full h-full min-h-[140px] relative mt-2 mb-2 pt-4">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={feeData} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                 <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 7, fill: '#64748b' }} dy={5} />
                 <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 7, fill: '#64748b' }} domain={[0, 10]} tickFormatter={(val) => `${val}Cr`} />
                 <RechartsTooltip contentStyle={{ fontSize: '9px', borderRadius: '4px', padding: '4px' }} formatter={(val) => [`${val} Cr`, 'Collection (₹)']} />
                 <Legend wrapperStyle={{ fontSize: '8px', top: -15, right: 0 }} iconType="circle" />
                 <Bar dataKey="collection" name="Collection (₹)" fill="#2563eb" radius={[2, 2, 0, 0]} barSize={12}>
                    {feeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.month === 'May' ? '#1d4ed8' : '#3b82f6'} />
                    ))}
                 </Bar>
               </BarChart>
             </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center border-t border-slate-100 pt-3">
             <div>
                <span className="text-[7px] text-slate-500 font-medium block mb-1">Total Collected</span>
                <span className="text-[10px] font-bold text-green-700">₹ 8,75,60,000</span>
             </div>
             <div>
                <span className="text-[7px] text-slate-500 font-medium block mb-1">Total Due</span>
                <span className="text-[10px] font-bold text-red-600">₹ 2,15,40,000</span>
             </div>
             <div>
                <span className="text-[7px] text-slate-500 font-medium block mb-1">Collection %</span>
                <span className="text-[10px] font-bold text-green-600">80.24%</span>
             </div>
          </div>
        </div>

      </div>

      {/* Second Row Workspace */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4">
        
        {/* Academic Performance Summary */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-4 flex flex-col">
          <div className="flex justify-between items-center mb-3">
             <h3 className="text-[11px] font-bold text-slate-800">Academic Performance Summary</h3>
             <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View Report</a>
          </div>
          
          <div className="flex-1 overflow-x-auto">
             <table className="w-full text-[8px] text-left">
                <thead>
                   <tr className="text-slate-500 border-b border-slate-100">
                      <th className="pb-2 font-medium">Class</th>
                      <th className="pb-2 font-medium text-center">Total Students</th>
                      <th className="pb-2 font-medium text-center">Average %</th>
                      <th className="pb-2 font-medium text-center">Highest %</th>
                      <th className="pb-2 font-medium text-center">Lowest %</th>
                      <th className="pb-2 font-medium text-right">Pass %</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                   {academicPerformance.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                         <td className="py-2 text-slate-800 font-medium">{row.class}</td>
                         <td className="py-2 text-center text-slate-600">{row.total}</td>
                         <td className="py-2 text-center font-bold text-slate-800">{row.avg}</td>
                         <td className="py-2 text-center text-green-600 font-bold">{row.highest}</td>
                         <td className="py-2 text-center text-red-500 font-bold">{row.lowest}</td>
                         <td className="py-2 text-right text-blue-600 font-bold">{row.pass}%</td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
        </div>

        {/* Student Strength */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col group">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[11px] font-bold text-slate-800">Student Strength</h3>
            <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline hidden group-hover:block">This Month</a>
          </div>
          <div className="flex items-center justify-center gap-2 flex-1">
             <div className="w-24 h-24 relative shrink-0">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie data={studentStrength} cx="50%" cy="50%" innerRadius={28} outerRadius={40} dataKey="value" stroke="none">
                     {studentStrength.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={entry.color} />
                     ))}
                   </Pie>
                 </PieChart>
               </ResponsiveContainer>
               <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-[12px] font-bold text-slate-800">12,568</span>
                  <span className="text-[6px] text-slate-500 leading-tight w-12">Total Students</span>
               </div>
             </div>
             <div className="flex flex-col gap-1.5 text-[8px] flex-1">
               {studentStrength.map((item, i) => (
                 <div key={i} className="flex items-center justify-between">
                   <div className="flex items-center gap-1.5">
                     <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                     <span className="text-slate-600 font-medium whitespace-nowrap">{item.name}</span>
                   </div>
                   <div className="flex items-center gap-1 text-[8px] shrink-0">
                      <span className="font-bold text-slate-800">{item.value.toLocaleString()}</span>
                      <span className="text-slate-400">({item.percent})</span>
                   </div>
                 </div>
               ))}
             </div>
          </div>
        </div>

        {/* Top Performing Students */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col group">
          <div className="flex justify-between items-center mb-3">
             <h3 className="text-[11px] font-bold text-slate-800">Top Performing Students</h3>
             <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline hidden group-hover:block">This Month</a>
          </div>
          
          <div className="flex text-[7px] text-slate-400 font-medium border-b border-slate-100 pb-1 mb-2">
             <div className="w-6">Rank</div>
             <div className="flex-1">Student Name</div>
             <div className="w-12 text-left">Class</div>
             <div className="w-12 text-right">Percentage</div>
          </div>
          
          <div className="flex-1 flex flex-col gap-2 overflow-y-auto">
             {topPerformers.map((student, i) => (
                 <div key={i} className="flex items-center gap-2 text-[9px]">
                    <div className="w-6 shrink-0 flex justify-center">
                       {i < 3 ? <Award size={14} className={student.iconColor} /> : <span className="font-bold text-slate-500 text-[10px] pr-1">{student.rank}</span>}
                    </div>
                    <span className="flex-1 text-slate-800 font-bold truncate">{student.name}</span>
                    <span className="w-12 text-slate-600 shrink-0 text-left">{student.class}</span>
                    <span className="w-12 text-right font-bold text-green-700 shrink-0">{student.percent}</span>
                 </div>
             ))}
          </div>
          <div className="text-center mt-3 pt-2">
             <a href="#" className="text-[9px] font-bold text-blue-600 hover:underline">View All Top Performers</a>
          </div>
        </div>

        {/* Alerts & Insights */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-2 flex flex-col group">
          <div className="flex justify-between items-center mb-3">
             <h3 className="text-[11px] font-bold text-slate-800">Alerts & Insights</h3>
             <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline hidden group-hover:block">View All</a>
          </div>
          <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-1">
             {alerts.map((alert, i) => (
                <div key={i} className="flex items-start gap-2">
                   <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${alert.bg} ${alert.color}`}>
                      {alert.icon}
                   </div>
                   <div className="flex-1 min-w-0">
                      <p className="text-[8px] font-bold text-slate-800 leading-tight mb-0.5">{alert.text}</p>
                      <p className="text-[7px] text-slate-500 font-medium">{alert.count}</p>
                   </div>
                </div>
             ))}
          </div>
        </div>

      </div>

      {/* Third Row Workspace */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4">
        
        {/* Quick Reports */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-4">Quick Reports</h3>
          <div className="grid grid-cols-2 gap-2 flex-1 content-start">
             {quickReports.map((report, i) => (
                <button key={i} className="flex flex-col items-center justify-center text-center p-3 rounded-lg border border-slate-100 hover:bg-slate-50 hover:border-slate-200 transition-colors group">
                  <div className="mb-2 group-hover:scale-110 transition-transform bg-blue-50 rounded p-1.5 border border-blue-100">
                    {report.icon}
                  </div>
                  <span className="text-[8px] text-slate-700 font-bold leading-tight">{report.label}</span>
                </button>
             ))}
          </div>
        </div>

        {/* Reports & Analytics Tools */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-6 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-4">Reports & Analytics Tools</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 flex-1 content-start">
             {analyticsTools.map((tool, i) => (
                <div key={i} className="flex gap-2 p-2 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer group">
                   <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border border-white shadow-sm ${tool.bg}`}>
                      <div className="group-hover:scale-110 transition-transform">
                         {tool.icon}
                      </div>
                   </div>
                   <div className="min-w-0">
                      <h4 className="text-[9px] font-bold text-slate-800 leading-tight mb-0.5 group-hover:text-blue-600 transition-colors">{tool.title}</h4>
                      <p className="text-[7.5px] text-slate-500 leading-snug">{tool.desc}</p>
                   </div>
                </div>
             ))}
          </div>
        </div>

        {/* Data Insights */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col group">
          <div className="flex justify-between items-center mb-4">
             <h3 className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5"><Lightbulb size={12} className="text-amber-500" /> Data Insights</h3>
             <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline hidden group-hover:block">This Month</a>
          </div>
          <div className="flex-1 flex flex-col gap-3 justify-center">
             {dataInsights.map((insight, i) => (
                <div key={i} className="flex gap-2 items-start bg-slate-50 p-2 rounded-lg border border-slate-100">
                   <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${insight.bg}`}>
                      {insight.icon}
                   </div>
                   <p className="text-[8.5px] text-slate-700 font-medium leading-snug flex-1">
                      {insight.text}
                   </p>
                </div>
             ))}
          </div>
        </div>

      </div>

      {/* Bottom Banner */}
      <div className="mt-2 text-center pb-2">
         <p className="text-[9px] text-slate-500 font-medium">Reports & Analytics help you make data-driven decisions and improve overall institutional efficiency.</p>
      </div>

    </div>
  );
}
