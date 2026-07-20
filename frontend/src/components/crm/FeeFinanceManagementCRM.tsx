import React, { useState } from 'react';
import { 
  IndianRupee, TrendingUp, AlertCircle, Clock, Percent, PercentSquare,
  FileText, PlusCircle, CheckCircle2, XCircle, CreditCard, Receipt,
  Bell, Mail, MessageSquare, Download, Calculator, BookOpen, User, Users,
  BarChart2, PieChart as PieChartIcon, Calendar, ArrowUpRight, ArrowDownRight,
  TrendingDown, RefreshCcw, HandCoins
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid, Legend,
  BarChart, Bar, ComposedChart
} from 'recharts';

const kpis = [
  { title: 'Total Fee Due', value: '₹ 6,58,75,200', subtitle: 'This Academic Year', icon: <IndianRupee size={20} />, color: 'bg-blue-500', iconColor: 'text-blue-500', iconBg: 'bg-blue-100' },
  { title: 'Total Collection', value: '₹ 4,82,36,750', subtitle: 'This Academic Year', trend: '↑ 15.6% from last year', trendColor: 'text-green-600', icon: <HandCoins size={20} />, color: 'bg-green-500', iconColor: 'text-green-500', iconBg: 'bg-green-100' },
  { title: 'Pending Amount', value: '₹ 1,76,38,450', subtitle: 'This Academic Year', trend: '↑ 8.3% from last year', trendColor: 'text-orange-600', icon: <AlertCircle size={20} />, color: 'bg-orange-500', iconColor: 'text-orange-500', iconBg: 'bg-orange-100' },
  { title: 'Collection %', value: '73.25%', subtitle: 'This Academic Year', icon: <Percent size={20} />, color: 'bg-purple-500', iconColor: 'text-purple-500', iconBg: 'bg-purple-100' },
  { title: 'Overdue Amount', value: '₹ 68,47,500', subtitle: 'As on 17 May 2025', icon: <Clock size={20} />, color: 'bg-teal-500', iconColor: 'text-teal-500', iconBg: 'bg-teal-100' },
  { title: 'Total Discounts', value: '₹ 27,85,600', subtitle: 'This Academic Year', icon: <PercentSquare size={20} />, color: 'bg-red-500', iconColor: 'text-red-500', iconBg: 'bg-red-100' },
];

const collectionOverview = [
  { name: 'Tuition Fee', value: 62.5, color: '#3b82f6' },
  { name: 'Transport Fee', value: 15.6, color: '#10b981' },
  { name: 'Hostel Fee', value: 8.9, color: '#f59e0b' },
  { name: 'Exam Fee', value: 6.3, color: '#ef4444' },
  { name: 'Other Fees', value: 6.7, color: '#64748b' },
];

const collectionTrend = [
  { month: 'Apr', collection: 30, percentage: 20 },
  { month: 'May', collection: 45, percentage: 35 },
  { month: 'Jun', collection: 65, percentage: 48 },
  { month: 'Jul', collection: 55, percentage: 55 },
  { month: 'Aug', collection: 70, percentage: 65 },
  { month: 'Sep', collection: 80, percentage: 70 },
  { month: 'Oct', collection: 75, percentage: 75 },
  { month: 'Nov', collection: 90, percentage: 82 },
  { month: 'Dec', collection: 85, percentage: 88 },
  { month: 'Jan', collection: 95, percentage: 92 },
  { month: 'Feb', collection: 90, percentage: 95 },
  { month: 'Mar', collection: 98, percentage: 100 },
];

const dueVsCollection = [
  { name: 'Total Due', value: 6.59, fill: '#3b82f6' },
  { name: 'Collected', value: 4.82, fill: '#10b981' },
  { name: 'Pending', value: 1.76, fill: '#f59e0b' },
  { name: 'Overdue', value: 0.68, fill: '#ef4444' },
];

const quickActions = [
  { label: 'Create Invoice', icon: <PlusCircle size={16} className="text-blue-600" /> },
  { label: 'Receive Payment', icon: <HandCoins size={16} className="text-green-600" /> },
  { label: 'Online Collection', icon: <CreditCard size={16} className="text-purple-600" /> },
  { label: 'Fee Receipt', icon: <Receipt size={16} className="text-blue-600" /> },
  { label: 'Add Discount', icon: <Percent size={16} className="text-orange-600" /> },
  { label: 'Waive Off', icon: <XCircle size={16} className="text-red-600" /> },
  { label: 'Generate Statement', icon: <FileText size={16} className="text-teal-600" /> },
  { label: 'Payment Reconcile', icon: <RefreshCcw size={16} className="text-indigo-600" /> },
  { label: 'Fee Reminder', icon: <Bell size={16} className="text-yellow-600" /> },
  { label: 'Send SMS / Email', icon: <Mail size={16} className="text-blue-600" /> },
  { label: 'Refund Request', icon: <ArrowDownRight size={16} className="text-red-600" /> },
  { label: 'Reports', icon: <BarChart2 size={16} className="text-slate-600" /> },
];

const installments = [
  { name: '1st Installment', due: '₹ 2,01,45,600', collected: '₹ 1,72,35,450', pending: '₹ 29,10,150', progress: 85 },
  { name: '2nd Installment', due: '₹ 2,01,45,600', collected: '₹ 1,48,20,300', pending: '₹ 53,25,300', progress: 73 },
  { name: '3rd Installment', due: '₹ 1,95,82,000', collected: '₹ 1,14,65,000', pending: '₹ 81,17,000', progress: 58 },
  { name: '4th Installment', due: '₹ 1,59,02,000', collected: '₹ 47,15,800', pending: '₹ 1,11,86,200', progress: 29 },
];

const topDues = [
  { name: 'Aarav Sharma', class: 'Class 10 - A', due: '₹ 45,600' },
  { name: 'Vihaan Patel', class: 'Class 9 - B', due: '₹ 42,300' },
  { name: 'Ananya Gupta', class: 'Class 8 - A', due: '₹ 41,200' },
  { name: 'Rudra Mehra', class: 'Class 7 - A', due: '₹ 38,700' },
  { name: 'Myra Singh', class: 'Class 6 - B', due: '₹ 36,900' },
];

const collectionModes = [
  { name: 'Online Payment', value: 62.4, color: '#3b82f6' },
  { name: 'UPI', value: 16.7, color: '#f59e0b' },
  { name: 'Card', value: 9.6, color: '#10b981' },
  { name: 'Bank Transfer', value: 6.1, color: '#ef4444' },
  { name: 'Cash', value: 3.2, color: '#64748b' },
];

const transactions = [
  { icon: <HandCoins size={14} className="text-green-600" />, bg: 'bg-green-100', title: 'Payment Received', desc: 'Rohan Verma (Class 9 - A)', time: '17 May 2025, 10:15 AM', amount: '₹ 25,600', type: 'Online' },
  { icon: <FileText size={14} className="text-purple-600" />, bg: 'bg-purple-100', title: 'Invoice Generated', desc: 'INV-2025-26-1025', time: '17 May 2025, 09:45 AM', amount: '₹ 15,800', type: '' },
  { icon: <HandCoins size={14} className="text-blue-600" />, bg: 'bg-blue-100', title: 'Payment Received', desc: 'Ananya Gupta (Class 8 - A)', time: '16 May 2025, 04:30 PM', amount: '₹ 18,200', type: 'UPI' },
  { icon: <ArrowDownRight size={14} className="text-red-600" />, bg: 'bg-red-100', title: 'Refund Processed', desc: 'Arjun Mehta (Class 7 - B)', time: '16 May 2025, 02:20 PM', amount: '₹ 5,000', type: '' },
  { icon: <Percent size={14} className="text-green-600" />, bg: 'bg-green-100', title: 'Discount Applied', desc: 'Sibling Discount', time: '16 May 2025, 11:05 AM', amount: '₹ 2,000', type: '' },
];

const cashFlow = [
  { month: 'Apr', inflow: 3, outflow: 1.5 },
  { month: 'May', inflow: 4.5, outflow: 2 },
  { month: 'Jun', inflow: 5, outflow: 2.5 },
  { month: 'Jul', inflow: 4, outflow: 2.2 },
  { month: 'Aug', inflow: 6, outflow: 2.8 },
  { month: 'Sep', inflow: 5.5, outflow: 3 },
  { month: 'Oct', inflow: 6.5, outflow: 2.5 },
  { month: 'Nov', inflow: 5.8, outflow: 2.7 },
  { month: 'Dec', inflow: 7, outflow: 3.5 },
  { month: 'Jan', inflow: 6.2, outflow: 3 },
  { month: 'Feb', inflow: 8, outflow: 3.2 },
  { month: 'Mar', inflow: 7.5, outflow: 4 },
];

const expenseSummary = [
  { name: 'Salaries & Payroll', amount: '₹ 1,25,43,200', percent: '58.27%' },
  { name: 'Infrastructure', amount: '₹ 32,18,600', percent: '14.93%' },
  { name: 'Academic Expenses', amount: '₹ 18,75,300', percent: '8.72%' },
  { name: 'Transport Expenses', amount: '₹ 16,20,400', percent: '7.53%' },
  { name: 'Other Expenses', amount: '₹ 22,80,900', percent: '10.55%' },
];

const reports = [
  'Fee Collection Report',
  'Student Ledger Report',
  'Outstanding Report',
  'Fee Concession Report',
  'Daily Collection Report',
  'Cash Flow Report'
];

import { SubModuleView } from './shared/SubModuleView';

export function FeeFinanceManagementCRM({ currentView = 'Fee Dashboard' }: { currentView?: string }) {
  if (currentView && currentView !== 'Fee Dashboard') {
    return <SubModuleView module="Fees & Finance" title={currentView} />;
  }

  const [academicYear, setAcademicYear] = useState('2025-26');
  const [financialYear, setFinancialYear] = useState('2025-26');
  const [loading, setLoading] = useState(false);

  const handleFilterChange = (setter: React.Dispatch<React.SetStateAction<string>>, value: string) => {
    setter(value);
    setLoading(true);
    setTimeout(() => setLoading(false), 400);
  };

  return (
    <div className="flex flex-col space-y-4 h-full relative">
      {loading && (
        <div className="absolute inset-0 bg-white/50 z-50 flex items-center justify-center backdrop-blur-[1px] rounded-xl transition-all">
           <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Fee & Finance Management CRM</h2>
          <p className="text-xs text-slate-500 mt-0.5">Collect • Manage • Reconcile • Analyze • Report</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded px-2 py-1 shadow-sm text-xs">
            <span className="text-slate-500 font-medium">Academic Year</span>
            <select 
              value={academicYear}
              onChange={(e) => handleFilterChange(setAcademicYear, e.target.value)}
              className="font-bold text-slate-800 focus:outline-none bg-transparent"
            >
              <option>2025-26</option>
              <option>2024-25</option>
            </select>
          </div>
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded px-2 py-1 shadow-sm text-xs">
            <span className="text-slate-500 font-medium">Financial Year</span>
            <select 
              value={financialYear}
              onChange={(e) => handleFilterChange(setFinancialYear, e.target.value)}
              className="font-bold text-slate-800 focus:outline-none bg-transparent"
            >
              <option>2025-26</option>
              <option>2024-25</option>
            </select>
          </div>
          <button className="bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold text-xs px-4 py-2 rounded flex items-center gap-2 shadow-sm transition-colors ml-2">
            <PlusCircle size={14} />
            <span>Create New Invoice</span>
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map((kpi, i) => (
          <div key={i} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
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
              <div className="text-[9px] text-slate-500 flex flex-col">
                <span className="truncate">{kpi.subtitle}</span>
                {kpi.trend && <span className={`font-bold ${kpi.trendColor}`}>{kpi.trend}</span>}
              </div>
            )}
            <div className={`absolute bottom-0 left-0 w-full h-0.5 ${kpi.color}`}></div>
          </div>
        ))}
      </div>

      {/* First Row Workspace */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4">
        
        {/* Fee Collection Overview */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[11px] font-bold text-slate-800">Fee Collection Overview</h3>
            <select className="text-[9px] border border-slate-200 rounded text-slate-600 focus:outline-none">
              <option>This Month</option>
            </select>
          </div>
          <div className="flex items-center justify-center gap-4 flex-1">
             <div className="w-28 h-28 relative shrink-0">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie data={collectionOverview} cx="50%" cy="50%" innerRadius={35} outerRadius={50} paddingAngle={2} dataKey="value" stroke="none">
                     {collectionOverview.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={entry.color} />
                     ))}
                   </Pie>
                 </PieChart>
               </ResponsiveContainer>
               <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-[7px] text-slate-500 font-medium">Total Collection</span>
                  <span className="text-[10px] font-bold text-slate-800">₹ 82,45,230</span>
                  <span className="text-[7px] text-slate-500">This Month</span>
               </div>
             </div>
             <div className="flex flex-col gap-1.5 text-[9px] flex-1">
               {collectionOverview.map((item, i) => (
                 <div key={i} className="flex items-center justify-between">
                   <div className="flex items-center gap-1.5">
                     <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                     <span className="text-slate-600 text-[9px] font-medium">{item.name}</span>
                   </div>
                   <span className="text-slate-500 text-[9px]">{item.value}%</span>
                 </div>
               ))}
             </div>
          </div>
        </div>

        {/* Collection Trend */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-4 flex flex-col relative">
          <div className="flex justify-between items-center mb-1">
            <h3 className="text-[11px] font-bold text-slate-800">Collection Trend</h3>
            <select className="text-[9px] border border-slate-200 rounded text-slate-600 focus:outline-none">
              <option>This Year</option>
            </select>
          </div>
          <div className="flex-1 w-full h-full min-h-[160px] relative">
             <ResponsiveContainer width="100%" height="100%">
               <ComposedChart data={collectionTrend} margin={{ top: 20, right: -15, left: -25, bottom: -10 }}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                 <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#64748b' }} dy={5} />
                 <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#64748b' }} tickFormatter={(val) => `${val}L`} domain={[0, 100]} />
                 <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#64748b' }} tickFormatter={(val) => `${val}%`} domain={[0, 100]} />
                 <RechartsTooltip contentStyle={{ fontSize: '9px', borderRadius: '4px', padding: '4px' }} />
                 <Legend iconType="circle" wrapperStyle={{ fontSize: '9px', top: -5 }} />
                 <Line yAxisId="left" type="monotone" dataKey="collection" name="Collection (₹)" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                 <Line yAxisId="right" type="monotone" dataKey="percentage" name="Collection %" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
               </ComposedChart>
             </ResponsiveContainer>
          </div>
        </div>

        {/* Fee Due vs Collection */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-2 flex flex-col">
          <div className="flex justify-between items-center mb-3">
             <h3 className="text-[11px] font-bold text-slate-800">Fee Due vs Collection</h3>
             <select className="text-[8px] border border-slate-200 rounded text-slate-600 focus:outline-none hidden sm:block">
               <option>This Academic Year</option>
             </select>
          </div>
          <div className="flex-1 w-full h-full min-h-[160px] relative">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={dueVsCollection} margin={{ top: 15, right: 0, left: -30, bottom: -10 }} barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#64748b' }} dy={5} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#64748b' }} tickFormatter={(val) => `${val} Cr`} domain={[0, 8]} />
                  <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{ fontSize: '9px', borderRadius: '4px', padding: '4px' }} formatter={(val: number) => [`${val} Cr`, 'Amount']} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {dueVsCollection.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
               </BarChart>
             </ResponsiveContainer>
             <div className="absolute top-2 left-6 text-[8px] font-bold text-blue-600">6.59 Cr</div>
             <div className="absolute top-9 left-[75px] text-[8px] font-bold text-green-600">4.82 Cr</div>
             <div className="absolute top-[80px] left-[135px] text-[8px] font-bold text-orange-600">1.76 Cr</div>
             <div className="absolute top-[108px] right-2 text-[8px] font-bold text-red-600">68.47 L</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Quick Actions</h3>
          <div className="grid grid-cols-4 gap-2 flex-1">
            {quickActions.map((action, i) => (
              <button key={i} className="flex flex-col items-center justify-center text-center p-1.5 rounded-lg border border-slate-100 hover:bg-slate-50 hover:border-slate-200 transition-colors group">
                <div className="w-6 h-6 rounded flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                  {action.icon}
                </div>
                <span className="text-[7px] text-slate-600 font-medium leading-tight px-0.5">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Second Row Workspace */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4">
        
        {/* Fee Installment Summary */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm md:col-span-2 xl:col-span-5 flex flex-col">
          <div className="flex justify-between items-center mb-3">
             <h3 className="text-[11px] font-bold text-slate-800">Fee Installment Summary</h3>
             <select className="text-[9px] border border-slate-200 rounded text-slate-600 focus:outline-none">
               <option>This Academic Year</option>
             </select>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-[9px] text-left border-collapse">
              <thead>
                <tr className="text-slate-500 border-b border-slate-100">
                  <th className="pb-2 font-medium">Installment</th>
                  <th className="pb-2 font-medium text-right">Total Due</th>
                  <th className="pb-2 font-medium text-right">Collected</th>
                  <th className="pb-2 font-medium text-right">Pending</th>
                  <th className="pb-2 font-medium text-center">% Collected</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {installments.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 text-slate-700">{row.name}</td>
                    <td className="py-2.5 text-right font-medium text-slate-800">{row.due}</td>
                    <td className="py-2.5 text-right font-medium text-green-600">{row.collected}</td>
                    <td className="py-2.5 text-right font-medium text-orange-600">{row.pending}</td>
                    <td className="py-2.5 flex items-center justify-center">
                       <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                         <div className={`h-full ${row.progress > 80 ? 'bg-green-500' : row.progress > 50 ? 'bg-blue-500' : 'bg-orange-500'} rounded-full`} style={{ width: `${row.progress}%` }}></div>
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                 <tr className="border-t border-slate-200 font-bold text-slate-900 bg-slate-50/50">
                    <td className="py-2.5">Total</td>
                    <td className="py-2.5 text-right">₹ 7,57,75,200</td>
                    <td className="py-2.5 text-right text-green-600">₹ 4,82,36,750</td>
                    <td className="py-2.5 text-right text-orange-600">₹ 2,75,38,450</td>
                    <td className="py-2.5"></td>
                 </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Top Dues (Students) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[11px] font-bold text-slate-800">Top Dues (Students)</h3>
            <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View All</a>
          </div>
          <div className="overflow-x-auto flex-1 flex flex-col">
            <table className="w-full text-[9px] text-left">
              <thead>
                <tr className="text-slate-400 border-b border-slate-50">
                  <th className="pb-2 font-medium">Student Name</th>
                  <th className="pb-2 font-medium">Class</th>
                  <th className="pb-2 font-medium text-right">Total Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {topDues.map((row, i) => (
                  <tr key={i}>
                    <td className="py-2 text-blue-600 font-medium">{row.name}</td>
                    <td className="py-2 text-slate-600">{row.class}</td>
                    <td className="py-2 text-right font-bold text-slate-800">{row.due}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-auto pt-3 border-t border-slate-100 flex justify-between items-center font-bold">
               <span className="text-[10px] text-slate-700">Total Overdue</span>
               <span className="text-[11px] text-slate-900">₹ 2,75,38,450</span>
            </div>
          </div>
        </div>

        {/* Fee Collection Mode */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-2 flex flex-col">
           <div className="flex justify-between items-center mb-3">
            <h3 className="text-[11px] font-bold text-slate-800">Fee Collection Mode</h3>
            <select className="text-[8px] border border-slate-200 rounded text-slate-600 focus:outline-none hidden xl:block">
              <option>This Academic Year</option>
            </select>
          </div>
          <div className="flex flex-col items-center justify-center flex-1">
             <div className="w-32 h-32 relative shrink-0 mb-4">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie data={collectionModes} cx="50%" cy="50%" innerRadius={40} outerRadius={55} paddingAngle={2} dataKey="value" stroke="none">
                     {collectionModes.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={entry.color} />
                     ))}
                   </Pie>
                 </PieChart>
               </ResponsiveContainer>
               <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-[7px] text-slate-500 font-medium">Total Collection</span>
                  <span className="text-[10px] font-bold text-slate-800">₹ 4,82,36,750</span>
               </div>
             </div>
             <div className="w-full flex flex-col gap-1.5 text-[9px] px-2">
               {collectionModes.map((item, i) => (
                 <div key={i} className="flex items-center justify-between">
                   <div className="flex items-center gap-1.5">
                     <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                     <span className="text-slate-700 font-medium">{item.name}</span>
                   </div>
                   <span className="text-slate-500">{item.value}%</span>
                 </div>
               ))}
             </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-2 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[11px] font-bold text-slate-800">Recent Transactions</h3>
            <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View All</a>
          </div>
          <div className="flex-1 flex flex-col gap-3.5 overflow-hidden">
            {transactions.map((t, i) => (
              <div key={i} className="flex gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${t.bg}`}>
                  {t.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between items-start">
                    <p className="text-[9px] font-bold text-slate-800 leading-tight mb-0.5">{t.title}</p>
                    <p className="text-[9px] font-bold text-slate-900">{t.amount}</p>
                  </div>
                  <p className="text-[8px] text-slate-600 leading-snug truncate">{t.desc}</p>
                  <div className="flex justify-between items-center mt-0.5">
                     <p className="text-[7px] text-slate-400">{t.time}</p>
                     {t.type && <span className="text-[7px] bg-slate-100 text-slate-500 px-1 rounded">{t.type}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Third Row Workspace */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4">
        
        {/* Fee Reminder & Notifications */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-4">Fee Reminder & Notifications</h3>
          
          <div className="grid grid-cols-4 gap-2 flex-1 mb-4">
            <div className="flex flex-col items-center text-center">
              <div className="w-8 h-8 rounded border border-purple-100 bg-purple-50 text-purple-600 flex items-center justify-center mb-2"><FileText size={14} /></div>
              <span className="text-[7px] text-slate-500 font-medium mb-1">Reminders Sent</span>
              <span className="text-sm font-bold text-slate-900 mb-1">1,246</span>
              <span className="text-[7px] text-slate-400">This Month</span>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-8 h-8 rounded border border-green-100 bg-green-50 text-green-600 flex items-center justify-center mb-2"><MessageSquare size={14} /></div>
              <span className="text-[7px] text-slate-500 font-medium mb-1">SMS Sent</span>
              <span className="text-sm font-bold text-slate-900 mb-1">3,568</span>
              <span className="text-[7px] text-slate-400">This Month</span>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-8 h-8 rounded border border-blue-100 bg-blue-50 text-blue-600 flex items-center justify-center mb-2"><Mail size={14} /></div>
              <span className="text-[7px] text-slate-500 font-medium mb-1">Email Sent</span>
              <span className="text-sm font-bold text-slate-900 mb-1">2,145</span>
              <span className="text-[7px] text-slate-400">This Month</span>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-8 h-8 rounded border border-orange-100 bg-orange-50 text-orange-600 flex items-center justify-center mb-2"><Calendar size={14} /></div>
              <span className="text-[7px] text-slate-500 font-medium mb-1">Due in Next 7 Days</span>
              <span className="text-[11px] font-bold text-slate-900 mb-1">₹ 48,65,200</span>
              <span className="text-[7px] text-slate-400">From 215 Students</span>
            </div>
          </div>
          
          <button className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] py-2 rounded transition-colors mt-auto">
            Send Fee Reminders
          </button>
        </div>

        {/* Cash Flow Overview */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-4 flex flex-col relative">
          <div className="flex justify-between items-center mb-3">
             <h3 className="text-[11px] font-bold text-slate-800">Cash Flow Overview</h3>
             <select className="text-[9px] border border-slate-200 rounded text-slate-600 focus:outline-none">
               <option>This Academic Year</option>
             </select>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
             <div className="border border-slate-100 rounded-lg p-2 text-center">
                <span className="text-[8px] text-slate-500 mb-1 block">Total Inflow</span>
                <span className="text-[11px] font-bold text-slate-900">₹ 4,86,52,600</span>
             </div>
             <div className="border border-slate-100 rounded-lg p-2 text-center">
                <span className="text-[8px] text-slate-500 mb-1 block">Total Outflow</span>
                <span className="text-[11px] font-bold text-slate-900">₹ 2,15,38,400</span>
             </div>
             <div className="border border-green-100 bg-green-50 rounded-lg p-2 text-center">
                <span className="text-[8px] text-slate-600 mb-1 block">Net Cash Flow</span>
                <span className="text-[11px] font-bold text-green-700">₹ 2,71,14,200</span>
                <span className="text-[7px] text-green-600 block">(Surplus)</span>
             </div>
          </div>
          <div className="flex-1 w-full h-full min-h-[100px]">
             <ResponsiveContainer width="100%" height="100%">
               <LineChart data={cashFlow} margin={{ top: 5, right: 5, left: -30, bottom: -10 }}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                 <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#64748b' }} dy={5} />
                 <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#64748b' }} domain={[0, 9]} />
                 <RechartsTooltip contentStyle={{ fontSize: '9px', borderRadius: '4px', padding: '4px' }} />
                 <Legend iconType="circle" wrapperStyle={{ fontSize: '9px', top: -15 }} />
                 <Line type="monotone" dataKey="inflow" name="Inflow" stroke="#10b981" strokeWidth={2} dot={{ r: 2 }} />
                 <Line type="monotone" dataKey="outflow" name="Outflow" stroke="#ef4444" strokeWidth={2} dot={{ r: 2 }} />
               </LineChart>
             </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Summary */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[11px] font-bold text-slate-800">Expense Summary</h3>
            <select className="text-[9px] border border-slate-200 rounded text-slate-600 focus:outline-none hidden xl:block">
              <option>This Academic Year</option>
            </select>
          </div>
          <div className="flex-1 flex flex-col justify-between">
            <table className="w-full text-[9px] text-left">
              <tbody className="divide-y divide-slate-50">
                {expenseSummary.map((row, i) => (
                  <tr key={i}>
                    <td className="py-2 text-slate-700 font-medium">{row.name}</td>
                    <td className="py-2 text-right font-medium text-slate-900">{row.amount}</td>
                    <td className="py-2 text-right text-slate-500 w-12">{row.percent}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-2 pt-3 border-t border-slate-200 flex justify-between items-center font-bold">
               <span className="text-[10px] text-slate-800">Total Expenses</span>
               <span className="text-[11px] text-slate-900 mr-12">₹ 2,15,38,400</span>
            </div>
          </div>
        </div>

        {/* Reports */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-2 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Reports</h3>
          <div className="flex-1 flex flex-col gap-2">
            {reports.map((report, i) => (
               <div key={i} className="flex justify-between items-center p-1.5 hover:bg-slate-50 rounded transition-colors group cursor-pointer">
                  <div className="flex items-center gap-2">
                     <FileText size={12} className="text-slate-400 group-hover:text-blue-500" />
                     <span className="text-[9px] text-slate-700 group-hover:text-blue-700 font-medium truncate">{report}</span>
                  </div>
                  <Download size={12} className="text-slate-300 hover:text-blue-600" />
               </div>
            ))}
          </div>
          <button className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-[9px] py-1.5 rounded transition-colors mt-auto">
            View All Reports
          </button>
        </div>

      </div>
    </div>
  );
}
