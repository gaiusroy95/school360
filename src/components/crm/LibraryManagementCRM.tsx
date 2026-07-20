import { useState } from 'react';
import { 
  BookOpen, Users, BookMarked, Clock, IndianRupee, Library,
  ChevronDown, Plus, Search, CheckCircle2, AlertCircle, Calendar,
  BarChart2, FileText, Settings, Laptop, ArrowRight, BookUp, UserPlus,
  RefreshCcw, AlertTriangle, ShieldCheck, FileCheck, Bookmark, Bell,
  BookCopy, Fingerprint, History, TrendingUp, TrendingDown
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid, Legend,
  BarChart, Bar, AreaChart, Area
} from 'recharts';

const kpis = [
  { title: 'Total Books', value: '12,458', subtitle: '↑ 620 this month', color: 'bg-blue-500', icon: <BookOpen size={20} />, iconColor: 'text-blue-500', iconBg: 'bg-blue-100' },
  { title: 'Total Members', value: '2,856', subtitle: '↑ 98 this month', color: 'bg-green-500', icon: <Users size={20} />, iconColor: 'text-green-500', iconBg: 'bg-green-100' },
  { title: 'Books Issued', value: '1,245', subtitle: 'Currently Issued', color: 'bg-purple-500', icon: <BookUp size={20} />, iconColor: 'text-purple-500', iconBg: 'bg-purple-100' },
  { title: 'Overdue Books', value: '57', subtitle: 'Need Attention', subtitleColor: 'text-red-500', color: 'bg-orange-500', icon: <Clock size={20} />, iconColor: 'text-orange-500', iconBg: 'bg-orange-100' },
  { title: 'Fine Collected', value: '₹ 18,650', subtitle: 'This Month', color: 'bg-pink-500', icon: <IndianRupee size={20} />, iconColor: 'text-pink-500', iconBg: 'bg-pink-100' },
  { title: 'Available Books', value: '11,213', subtitle: '89.9% Available', color: 'bg-teal-500', icon: <Library size={20} />, iconColor: 'text-teal-500', iconBg: 'bg-teal-100' },
];

const issueReturnOverview = [
  { name: 'Returned', value: 896, color: '#10b981', percent: '72%' },
  { name: 'Issued', value: 349, color: '#3b82f6', percent: '28%' },
  { name: 'Overdue', value: 57, color: '#ef4444', percent: '4.6%' },
];

const issueReturnTrend = [
  { day: '1 May', issued: 40, returned: 20, overdue: 5 },
  { day: '5 May', issued: 65, returned: 45, overdue: 18 },
  { day: '10 May', issued: 62, returned: 55, overdue: 22 },
  { day: '15 May', issued: 78, returned: 45, overdue: 18 },
  { day: '20 May', issued: 90, returned: 55, overdue: 15 },
  { day: '25 May', issued: 85, returned: 50, overdue: 25 },
  { day: '30 May', issued: 75, returned: 48, overdue: 20 },
];

const bookCategories = [
  { name: 'Fiction', value: 3245, color: '#3b82f6', percent: '26%' },
  { name: 'Science', value: 2785, color: '#10b981', percent: '22%' },
  { name: 'Academic', value: 2430, color: '#f59e0b', percent: '19%' },
  { name: 'Reference', value: 1856, color: '#ef4444', percent: '15%' },
  { name: 'Others', value: 2142, color: '#6366f1', percent: '18%' },
];

const recentIssuedBooks = [
  { title: 'The Alchemist', author: 'Paulo Coelho', issuedTo: 'Aarav Sharma (Class 10-A)', dueDate: '28 May 2025', cover: 'bg-slate-800' },
  { title: 'Wings of Fire', author: 'A.P.J. Abdul Kalam', issuedTo: 'Myra Singh (Class 9-B)', dueDate: '27 May 2025', cover: 'bg-blue-800' },
  { title: 'Science Explorer', author: 'Dr. R.K. Sharma', issuedTo: 'Vihaan Patel (Class 8-A)', dueDate: '25 May 2025', cover: 'bg-teal-800' },
  { title: 'Rich Dad Poor Dad', author: 'Robert T. Kiyosaki', issuedTo: 'Ananya Gupta (Class 11-A)', dueDate: '30 May 2025', cover: 'bg-red-800' },
];

const overdueBooks = [
  { title: 'Harry Potter & Philosopher\'s Stone', issuedTo: 'Rudra Mehra', class: '9-A', issueDate: '10 May 2025', dueDate: '20 May 2025', daysOverdue: '-3 Days', fine: '₹ 30' },
  { title: 'NCERT Physics Part - I', issuedTo: 'Tanya Sharma', class: '11-B', issueDate: '05 May 2025', dueDate: '19 May 2025', daysOverdue: '-4 Days', fine: '₹ 40' },
  { title: 'Atomic Habits', issuedTo: 'Ishaan Verma', class: '10-A', issueDate: '03 May 2025', dueDate: '17 May 2025', daysOverdue: '-6 Days', fine: '₹ 60' },
  { title: 'Think & Grow Rich', issuedTo: 'Meera Joshi', class: '12-A', issueDate: '01 May 2025', dueDate: '16 May 2025', daysOverdue: '-7 Days', fine: '₹ 70' },
  { title: 'The Lord of the Rings', issuedTo: 'Kabir Singh', class: '9-B', issueDate: '02 May 2025', dueDate: '18 May 2025', daysOverdue: '-5 Days', fine: '₹ 50' },
];

const topVendors = [
  { name: 'Scholastic India', books: 452, amount: '₹ 4,25,000' },
  { name: 'New Age International', books: 325, amount: '₹ 3,15,600' },
  { name: 'Oxford University Press', books: 286, amount: '₹ 2,80,450' },
  { name: 'Pearson Education', books: 185, amount: '₹ 2,27,510' },
];

const popularBooks = [
  { title: 'Wings of Fire', times: 28 },
  { title: 'The Alchemist', times: 26 },
  { title: 'Harry Potter Series', times: 24 },
  { title: 'Atomic Habits', times: 22 },
  { title: 'Think & Grow Rich', times: 20 },
];

const quickActions = [
  { label: 'Add New Book', icon: <BookOpen size={16} className="text-blue-600" /> },
  { label: 'Issue Book', icon: <BookUp size={16} className="text-green-600" /> },
  { label: 'Return Book', icon: <RefreshCcw size={16} className="text-emerald-600" /> },
  { label: 'Add Member', icon: <UserPlus size={16} className="text-purple-600" /> },
  { label: 'Book Search', icon: <Search size={16} className="text-blue-600" /> },
  { label: 'Fine Collection', icon: <IndianRupee size={16} className="text-red-600" /> },
  { label: 'Stock Verify', icon: <CheckCircle2 size={16} className="text-green-600" /> },
  { label: 'Reading Room', icon: <Library size={16} className="text-amber-600" /> },
  { label: 'Book Reservation', icon: <Bookmark size={16} className="text-indigo-600" /> },
  { label: 'E-Resources', icon: <Laptop size={16} className="text-blue-600" /> },
  { label: 'Generate Report', icon: <FileText size={16} className="text-slate-600" /> },
  { label: 'Library Settings', icon: <Settings size={16} className="text-slate-600" /> },
];

const newArrivals = [
  { title: 'Sapiens: A Brief History of Humankind', author: 'Yuval Noah Harari', category: 'History', date: '15 May 2025', cover: 'bg-amber-100 text-amber-800' },
  { title: 'The Power of Your Subconscious Mind', author: 'Joseph Murphy', category: 'Self Help', date: '14 May 2025', cover: 'bg-red-100 text-red-800' },
  { title: 'Educated', author: 'Tara Westover', category: 'Biography', date: '13 May 2025', cover: 'bg-blue-100 text-blue-800' },
];

const memberDistribution = [
  { name: 'Students', value: 2432, color: '#3b82f6', percent: '85%' },
  { name: 'Teachers', value: 256, color: '#10b981', percent: '9%' },
  { name: 'Staff', value: 108, color: '#f59e0b', percent: '4%' },
  { name: 'Others', value: 60, color: '#8b5cf6', percent: '2%' },
];

const attendanceData = [
  { time: '8 AM', visitors: 10 },
  { time: '10 AM', visitors: 45 },
  { time: '12 PM', visitors: 120 },
  { time: '2 PM', visitors: 85 },
  { time: '4 PM', visitors: 60 },
  { time: '6 PM', visitors: 20 },
];

const importantNotices = [
  { title: 'Return overdue books and avoid fine.', issuedBy: 'Library Admin', date: '15 May 2025', icon: <RefreshCcw size={14} className="text-red-600" />, bg: 'bg-red-50' },
  { title: 'Library will remain closed on 25 May 2025', issuedBy: 'Library Admin', date: '15 May 2025', icon: <Calendar size={14} className="text-purple-600" />, bg: 'bg-purple-50' },
  { title: 'New books on Science & Technology now available.', issuedBy: 'Library Admin', date: '14 May 2025', icon: <BookOpen size={14} className="text-amber-600" />, bg: 'bg-amber-50' },
  { title: 'Reading competition registration open.', issuedBy: 'Library Admin', date: '13 May 2025', icon: <BookMarked size={14} className="text-green-600" />, bg: 'bg-green-50' },
];

import { SubModuleView } from './shared/SubModuleView';

export function LibraryManagementCRM({ currentView = 'Library Dashboard' }: { currentView?: string }) {
  if (currentView && currentView !== 'Library Dashboard') {
    return <SubModuleView module="Library Management" title={currentView} />;
  }

  return (
    <div className="flex flex-col space-y-4 h-full relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Library Management CRM</h2>
          <p className="text-xs text-slate-500 mt-0.5">Organize • Automate • Track • Empower Learning</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded px-3 py-1.5 shadow-sm">
            <span className="text-slate-400 mr-2">Academic Year</span>
            <span>2025-26</span>
            <ChevronDown size={14} className="ml-2 text-slate-400" />
          </div>
          <div className="flex items-center text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded px-3 py-1.5 shadow-sm">
            <span className="text-slate-400 mr-2">Library</span>
            <span>Main Library</span>
            <ChevronDown size={14} className="ml-2 text-slate-400" />
          </div>
          <button className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-4 py-2 rounded flex items-center gap-2 shadow-sm transition-colors">
            <Plus size={14} />
            <span>Add New Book</span>
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {kpis.map((kpi, i) => (
          <div key={i} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
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
                {kpi.subtitle.startsWith('↑') && <span className="text-green-500 font-bold mr-0.5">↑</span>}
                <span className={kpi.subtitle.startsWith('↑') ? 'text-green-600' : ''}>
                  {kpi.subtitle.replace('↑ ', '')}
                </span>
              </div>
            )}
            <div className={`absolute bottom-0 left-0 w-full h-0.5 ${kpi.color}`}></div>
          </div>
        ))}
      </div>

      {/* First Row Workspace */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4">
        
        {/* Book Issue & Return Overview */}
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
                   <Pie data={issueReturnOverview} cx="50%" cy="50%" innerRadius={28} outerRadius={40} dataKey="value" stroke="none">
                     {issueReturnOverview.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={entry.color} />
                     ))}
                   </Pie>
                 </PieChart>
               </ResponsiveContainer>
               <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-[13px] font-bold text-slate-800">1,245</span>
                  <span className="text-[6px] text-slate-500 leading-tight">Total Issued</span>
               </div>
             </div>
             <div className="flex flex-col gap-1.5 text-[9px] flex-1">
               {issueReturnOverview.map((item, i) => (
                 <div key={i} className="flex items-center justify-between">
                   <div className="flex items-center gap-1.5">
                     <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }}></div>
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
          <div className="mt-2 text-[9px] text-slate-600 font-medium">Average Issue Duration: 12 Days</div>
        </div>

        {/* Issue & Return Trend */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-4 flex flex-col relative">
          <div className="flex justify-between items-center mb-1">
            <h3 className="text-[11px] font-bold text-slate-800">Issue & Return Trend</h3>
            <select className="text-[9px] border border-slate-200 rounded text-slate-600 focus:outline-none">
              <option>This Month</option>
            </select>
          </div>
          <div className="flex-1 w-full h-full min-h-[160px] relative">
             <ResponsiveContainer width="100%" height="100%">
               <LineChart data={issueReturnTrend} margin={{ top: 20, right: 10, left: -25, bottom: -10 }}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                 <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#64748b' }} dy={5} />
                 <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#64748b' }} domain={[0, 100]} />
                 <RechartsTooltip contentStyle={{ fontSize: '9px', borderRadius: '4px', padding: '4px' }} />
                 <Legend iconType="circle" wrapperStyle={{ fontSize: '9px', top: -10 }} />
                 <Line type="monotone" dataKey="issued" name="Issued" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                 <Line type="monotone" dataKey="returned" name="Returned" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                 <Line type="monotone" dataKey="overdue" name="Overdue" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
               </LineChart>
             </ResponsiveContainer>
          </div>
        </div>

        {/* Top Book Categories */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <div className="flex justify-between items-center mb-3">
             <h3 className="text-[11px] font-bold text-slate-800">Top Book Categories</h3>
             <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View All</a>
          </div>
          <div className="flex items-center justify-center gap-4 flex-1">
             <div className="w-24 h-24 relative shrink-0">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie data={bookCategories} cx="50%" cy="50%" innerRadius={25} outerRadius={40} dataKey="value" stroke="none">
                     {bookCategories.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={entry.color} />
                     ))}
                   </Pie>
                 </PieChart>
               </ResponsiveContainer>
               <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-[12px] font-bold text-slate-800">12,458</span>
                  <span className="text-[6px] text-slate-500 leading-tight">Total Books</span>
               </div>
             </div>
             <div className="flex flex-col gap-1.5 text-[9px] flex-1">
               {bookCategories.map((item, i) => (
                 <div key={i} className="flex items-center justify-between">
                   <div className="flex items-center gap-1.5">
                     <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                     <span className="text-slate-600 text-[9px] font-medium whitespace-nowrap">{item.name}</span>
                   </div>
                   <div className="flex items-center gap-1">
                      <span className="font-bold text-slate-800">{item.value.toLocaleString()}</span>
                      <span className="text-slate-400">({item.percent})</span>
                   </div>
                 </div>
               ))}
             </div>
          </div>
        </div>

        {/* Recent Issued Books */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-2 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[11px] font-bold text-slate-800">Recent Issued Books</h3>
            <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View All</a>
          </div>
          <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-1">
             {recentIssuedBooks.map((book, i) => (
               <div key={i} className="flex gap-2">
                 <div className={`w-8 h-10 rounded shadow-sm ${book.cover} flex shrink-0 border border-slate-200/50`}></div>
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

      {/* Second Row Workspace */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4">
        
        {/* Overdue Books */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-5 flex flex-col">
          <div className="flex justify-between items-center mb-3">
             <h3 className="text-[11px] font-bold text-slate-800">Overdue Books</h3>
             <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View All</a>
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
                   {overdueBooks.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
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

        {/* Book Acquisition Summary */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
           <div className="flex justify-between items-center mb-4">
             <h3 className="text-[11px] font-bold text-slate-800">Book Acquisition Summary</h3>
             <select className="text-[8px] border border-slate-200 rounded text-slate-600 focus:outline-none hidden sm:block">
               <option>This Academic Year</option>
             </select>
           </div>
           
           <div className="grid grid-cols-4 gap-2 mb-4">
              <div className="bg-blue-50/50 rounded border border-blue-100 p-1.5 flex flex-col items-center justify-center text-center">
                 <span className="text-[7px] text-slate-500 font-medium mb-1 line-clamp-1">Books Added</span>
                 <span className="text-[11px] font-bold text-blue-600">1,248</span>
              </div>
              <div className="bg-green-50/50 rounded border border-green-100 p-1.5 flex flex-col items-center justify-center text-center">
                 <span className="text-[7px] text-slate-500 font-medium mb-1 line-clamp-1">Total Cost</span>
                 <span className="text-[10px] font-bold text-green-600 truncate">₹ 12,48,560</span>
              </div>
              <div className="bg-amber-50/50 rounded border border-amber-100 p-1.5 flex flex-col items-center justify-center text-center">
                 <span className="text-[7px] text-slate-500 font-medium mb-1 line-clamp-1">Donated Books</span>
                 <span className="text-[11px] font-bold text-amber-600">258</span>
              </div>
              <div className="bg-purple-50/50 rounded border border-purple-100 p-1.5 flex flex-col items-center justify-center text-center">
                 <span className="text-[7px] text-slate-500 font-medium mb-1 line-clamp-1">Vendors</span>
                 <span className="text-[11px] font-bold text-purple-600">18</span>
              </div>
           </div>

           <div>
              <h4 className="text-[9px] font-bold text-slate-700 mb-2">Top Vendors</h4>
              <div className="flex flex-col gap-2 text-[9px]">
                 {topVendors.map((vendor, i) => (
                    <div key={i} className="flex justify-between items-center">
                       <span className="text-slate-600 w-32 truncate">{i+1}. {vendor.name}</span>
                       <span className="text-slate-500 w-16">{vendor.books} Books</span>
                       <span className="text-slate-900 font-bold text-right w-16">{vendor.amount}</span>
                    </div>
                 ))}
              </div>
           </div>
        </div>

        {/* Popular Books */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-2 flex flex-col">
          <div className="flex justify-between items-center mb-4">
             <h3 className="text-[11px] font-bold text-slate-800">Popular Books</h3>
             <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View All</a>
          </div>
          <div className="flex text-[8px] text-slate-400 font-medium justify-between border-b border-slate-100 pb-1 mb-2">
            <span>Book Title</span>
            <span>Times Issued</span>
          </div>
          <div className="flex flex-col gap-3 flex-1">
             {popularBooks.map((book, i) => (
                <div key={i} className="flex flex-col gap-1">
                   <div className="flex items-center justify-between">
                     <span className="text-[9px] font-medium text-slate-700 truncate w-32">{book.title}</span>
                     <span className="text-[9px] font-bold text-slate-900">{book.times}</span>
                   </div>
                   <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-green-500 h-full rounded-full" style={{ width: `${(book.times/30)*100}%` }}></div>
                   </div>
                </div>
             ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-2 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Quick Actions</h3>
          <div className="grid grid-cols-4 gap-2 flex-1">
            {quickActions.map((action, i) => (
              <button key={i} className="flex flex-col items-center justify-center text-center p-1.5 rounded-lg border border-slate-100 hover:bg-slate-50 hover:border-slate-200 transition-colors group">
                <div className="w-6 h-6 rounded flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                  {action.icon}
                </div>
                <span className="text-[6.5px] text-slate-600 font-medium leading-tight px-0.5 whitespace-normal">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Third Row Workspace */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4">
        
        {/* New Arrivals */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <div className="flex justify-between items-center mb-3">
             <h3 className="text-[11px] font-bold text-slate-800">New Arrivals</h3>
             <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View All</a>
          </div>
          <div className="flex flex-col gap-3 flex-1 overflow-y-auto pr-1">
             {newArrivals.map((book, i) => (
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

        {/* Member Type Distribution */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Member Type Distribution</h3>
          <div className="flex items-center justify-center gap-4 flex-1">
             <div className="w-24 h-24 relative shrink-0">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie data={memberDistribution} cx="50%" cy="50%" innerRadius={28} outerRadius={40} dataKey="value" stroke="none">
                     {memberDistribution.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={entry.color} />
                     ))}
                   </Pie>
                 </PieChart>
               </ResponsiveContainer>
               <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-[13px] font-bold text-slate-800">2,856</span>
                  <span className="text-[6px] text-slate-500 leading-tight">Total Members</span>
               </div>
             </div>
             <div className="flex flex-col gap-1.5 text-[9px] flex-1">
               {memberDistribution.map((item, i) => (
                 <div key={i} className="flex items-center justify-between">
                   <div className="flex items-center gap-1.5">
                     <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                     <span className="text-slate-600 text-[9px] font-medium whitespace-nowrap">{item.name}</span>
                   </div>
                   <div className="flex items-center gap-1">
                      <span className="font-bold text-slate-800">{item.value.toLocaleString()}</span>
                      <span className="text-slate-400">({item.percent})</span>
                   </div>
                 </div>
               ))}
             </div>
          </div>
        </div>

        {/* Library Attendance (Today) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-4 flex flex-col relative">
           <div className="flex justify-between items-center mb-1">
             <h3 className="text-[11px] font-bold text-slate-800">Library Attendance <span className="font-normal text-slate-500">(Today)</span></h3>
           </div>
           
           <div className="flex gap-4 flex-1 items-center">
              <div className="flex-1 w-full h-full min-h-[120px] relative">
                 <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={attendanceData} margin={{ top: 10, right: 0, left: -25, bottom: -5 }}>
                       <defs>
                          <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                             <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                             <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
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
                    <span className="text-[12px] font-bold text-slate-900">186</span>
                 </div>
                 <div className="bg-slate-50 rounded border border-slate-100 p-2 text-center">
                    <span className="text-[7px] text-slate-500 font-medium mb-0.5 block">Peak Time</span>
                    <span className="text-[9px] font-bold text-slate-900">12 PM - 2 PM</span>
                 </div>
              </div>
           </div>
        </div>

        {/* Important Notices */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-2 flex flex-col">
          <div className="flex justify-between items-center mb-4">
             <h3 className="text-[11px] font-bold text-slate-800">Important Notices</h3>
             <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View All</a>
          </div>
          <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
             {importantNotices.map((notice, i) => (
                <div key={i} className="flex gap-2">
                   <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${notice.bg}`}>
                      {notice.icon}
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
