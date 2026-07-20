import { useState } from 'react';
import { 
  Users, UserCheck, UserMinus, UserX, Building2, IndianRupee, 
  ChevronDown, Plus, Gift, Calendar, FileText, CheckCircle2, 
  XCircle, Clock, Search, Briefcase, FileSignature, Upload, 
  Award, Settings, ClipboardList, TrendingUp, TrendingDown
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid, Legend,
  BarChart, Bar, RadialBarChart, RadialBar, PolarAngleAxis
} from 'recharts';

const kpis = [
  { title: 'Total Employees', value: '256', subtitle: '12 New this month', trend: 'up', color: 'bg-blue-500', icon: <Users size={20} />, iconColor: 'text-blue-500', iconBg: 'bg-blue-100' },
  { title: 'Present Today', value: '218', subtitle: '85.16%', color: 'bg-green-500', icon: <UserCheck size={20} />, iconColor: 'text-green-500', iconBg: 'bg-green-100' },
  { title: 'On Leave Today', value: '18', subtitle: '7.03%', color: 'bg-orange-500', icon: <UserMinus size={20} />, iconColor: 'text-orange-500', iconBg: 'bg-orange-100' },
  { title: 'Absent Today', value: '20', subtitle: '7.81%', color: 'bg-red-500', icon: <UserX size={20} />, iconColor: 'text-red-500', iconBg: 'bg-red-100' },
  { title: 'Total Departments', value: '16', subtitle: 'Active Departments', color: 'bg-purple-500', icon: <Building2 size={20} />, iconColor: 'text-purple-500', iconBg: 'bg-purple-100' },
  { title: 'Payroll This Month', value: '₹ 68,45,320', subtitle: 'May 2025', color: 'bg-green-500', icon: <IndianRupee size={20} />, iconColor: 'text-green-500', iconBg: 'bg-green-100' },
  { title: 'Total Deductions', value: '₹ 6,89,450', subtitle: 'May 2025', color: 'bg-red-500', icon: <IndianRupee size={20} />, iconColor: 'text-red-500', iconBg: 'bg-red-100' },
  { title: 'Net Payroll', value: '₹ 61,55,870', subtitle: 'May 2025', color: 'bg-blue-500', icon: <IndianRupee size={20} />, iconColor: 'text-blue-500', iconBg: 'bg-blue-100' },
];

const employeeOverview = [
  { name: 'Teaching Staff', value: 142, color: '#3b82f6', percent: '55.47%' },
  { name: 'Non Teaching Staff', value: 78, color: '#10b981', percent: '30.47%' },
  { name: 'Admin Staff', value: 22, color: '#f59e0b', percent: '8.59%' },
  { name: 'Support Staff', value: 14, color: '#ef4444', percent: '5.47%' },
];

const employeeStatusTrend = [
  { day: '11 May', present: 220, leave: 15, absent: 21 },
  { day: '12 May', present: 215, leave: 18, absent: 23 },
  { day: '13 May', present: 235, leave: 10, absent: 11 },
  { day: '14 May', present: 240, leave: 8, absent: 8 },
  { day: '15 May', present: 225, leave: 20, absent: 11 },
  { day: '16 May', present: 210, leave: 25, absent: 21 },
  { day: '17 May', present: 218, leave: 18, absent: 20 },
];

const departmentDistribution = [
  { name: 'Academics', value: 110, color: '#3b82f6', percent: '42.97%' },
  { name: 'Administration', value: 58, color: '#10b981', percent: '22.66%' },
  { name: 'Finance', value: 28, color: '#f59e0b', percent: '10.94%' },
  { name: 'IT Support', value: 22, color: '#ef4444', percent: '8.59%' },
  { name: 'Transport', value: 16, color: '#8b5cf6', percent: '6.25%' },
  { name: 'Others', value: 22, color: '#64748b', percent: '8.59%' },
];

const quickActions = [
  { label: 'Add Employee', icon: <Users size={16} className="text-green-600" /> },
  { label: 'Mark Attendance', icon: <UserCheck size={16} className="text-green-600" /> },
  { label: 'Leave Request', icon: <FileText size={16} className="text-blue-600" /> },
  { label: 'Payroll Process', icon: <IndianRupee size={16} className="text-purple-600" /> },
  { label: 'Salary Structure', icon: <ClipboardList size={16} className="text-orange-600" /> },
  { label: 'Approve Leaves', icon: <CheckCircle2 size={16} className="text-green-600" /> },
  { label: 'Employee Transfer', icon: <UserMinus size={16} className="text-blue-600" /> },
  { label: 'Certificates', icon: <Award size={16} className="text-blue-600" /> },
  { label: 'Performance Review', icon: <TrendingUp size={16} className="text-red-600" /> },
  { label: 'Payslip', icon: <FileText size={16} className="text-blue-600" /> },
  { label: 'Reports', icon: <Search size={16} className="text-slate-600" /> },
  { label: 'Settings', icon: <Settings size={16} className="text-slate-600" /> },
];

const birthdays = [
  { name: 'Neha Sharma', designation: 'Teacher - Mathematics', date: '17 May', avatar: 'NS' },
  { name: 'Rahul Verma', designation: 'Accountant', date: '18 May', avatar: 'RV' },
  { name: 'Pooja Singh', designation: 'Receptionist', date: '20 May', avatar: 'PS' },
  { name: 'Amit Kumar', designation: 'Lab Assistant', date: '22 May', avatar: 'AK' },
];

const leaveSummaryData = [
  { type: 'Casual Leave (CL)', total: 18, approved: 12, pending: 4, rejected: 2 },
  { type: 'Earned Leave (EL)', total: 12, approved: 8, pending: 2, rejected: 2 },
  { type: 'Sick Leave (SL)', total: 8, approved: 6, pending: 1, rejected: 1 },
  { type: 'Maternity Leave (ML)', total: 2, approved: 2, pending: 0, rejected: 0 },
  { type: 'Paternity Leave (PL)', total: 2, approved: 2, pending: 0, rejected: 0 },
  { type: 'Comp Off', total: 6, approved: 2, pending: 3, rejected: 1 },
];

const payrollComponents = [
  { name: 'Basic Salary', amount: '₹ 34,25,000' },
  { name: 'Allowances', amount: '₹ 21,35,670' },
  { name: 'Overtime', amount: '₹ 2,45,320' },
  { name: 'Bonus', amount: '₹ 1,25,000' },
  { name: 'Deductions', amount: '₹ 6,89,450' },
];

const netVsDeductions = [
  { name: 'Net Payroll', value: 6155870, color: '#3b82f6' },
  { name: 'Deductions', value: 689450, color: '#ef4444' },
];

const topEarners = [
  { name: 'Dr. Anil Sharma', designation: 'Principal', amount: '₹ 1,25,000', avatar: 'AS' },
  { name: 'Neha Verma', designation: 'Academic Coordinator', amount: '₹ 85,000', avatar: 'NV' },
  { name: 'Rajeev Kumar', designation: 'IT Manager', amount: '₹ 75,000', avatar: 'RK' },
  { name: 'Priya Sharma', designation: 'Vice Principal', amount: '₹ 70,000', avatar: 'PS' },
  { name: 'Sanjay Gupta', designation: 'Finance Manager', amount: '₹ 65,000', avatar: 'SG' },
];

const recruitmentPipeline = [
  { name: 'Total Openings', count: 12, icon: <Briefcase size={12} className="text-blue-500" /> },
  { name: 'Applications Received', count: 156, icon: <FileText size={12} className="text-blue-500" /> },
  { name: 'Under Review', count: 48, icon: <Search size={12} className="text-blue-500" /> },
  { name: 'Interview Scheduled', count: 32, icon: <Calendar size={12} className="text-blue-500" /> },
  { name: 'Offers Sent', count: 8, icon: <FileSignature size={12} className="text-blue-500" /> },
  { name: 'Joined', count: 5, icon: <UserCheck size={12} className="text-green-500" /> },
];

const onLeaveToday = [
  { name: 'Anjali Verma', designation: 'Teacher', type: 'Casual Leave', avatar: 'AV' },
  { name: 'Vikram Singh', designation: 'Lab Assistant', type: 'Sick Leave', avatar: 'VS' },
  { name: 'Meena Kumari', designation: 'Librarian', type: 'Earned Leave', avatar: 'MK' },
  { name: 'Rohit Sharma', designation: 'Accountant', type: 'Personal Leave', avatar: 'RS' },
  { name: 'Sunita Rani', designation: 'Peon', type: 'Casual Leave', avatar: 'SR' },
];

const performanceData = [
  { dept: 'Academics', excellent: 40, good: 50, average: 15, needsImp: 5 },
  { dept: 'Admin', excellent: 15, good: 30, average: 10, needsImp: 3 },
  { dept: 'Finance', excellent: 10, good: 15, average: 3, needsImp: 0 },
  { dept: 'IT', excellent: 8, good: 10, average: 2, needsImp: 2 },
  { dept: 'Support', excellent: 2, good: 5, average: 5, needsImp: 2 },
];

const employeeDocuments = [
  { name: 'Aadhaar Card', count: 256, total: 256 },
  { name: 'PAN Card', count: 256, total: 256 },
  { name: 'Resume', count: 256, total: 256 },
  { name: 'Appointment Letter', count: 256, total: 256 },
  { name: 'Experience Letter', count: 182, total: 256 },
  { name: 'Qualification Certificates', count: 256, total: 256 },
];

const hrAnalytics = [
  { name: 'Attendance %', value: 85.16, trend: '+3.26%', trendUp: true, color: '#10b981' },
  { name: 'Leave %', value: 7.03, trend: '-1.12%', trendUp: false, color: '#f59e0b' },
  { name: 'Overtime %', value: 4.28, trend: '+0.75%', trendUp: true, color: '#3b82f6' },
  { name: 'Attrition %', value: 0.78, trend: '-0.21%', trendUp: false, color: '#ef4444' },
];

export function HrPayrollManagementCRM() {
  const [activeTab, setActiveTab] = useState('Birthdays');

  return (
    <div className="flex flex-col space-y-4 h-full relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">HR & Payroll Management CRM</h2>
          <p className="text-xs text-slate-500 mt-0.5">Manage Workforce • Streamline Payroll • Automate HR Processes</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold text-xs px-4 py-2 rounded flex items-center gap-2 shadow-sm transition-colors">
            <Plus size={14} />
            <span>Add New Employee</span>
            <ChevronDown size={14} />
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
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
              <div className="text-[8px] text-slate-500 flex items-center gap-1">
                {kpi.trend === 'up' && <TrendingUp size={10} className="text-green-500" />}
                <span className={kpi.trend === 'up' ? 'text-green-600' : ''}>{kpi.subtitle}</span>
              </div>
            )}
            <div className={`absolute bottom-0 left-0 w-full h-0.5 ${kpi.color}`}></div>
          </div>
        ))}
      </div>

      {/* First Row Workspace */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
        
        {/* Employee Overview */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-3 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Employee Overview</h3>
          <div className="flex items-center justify-center gap-4 flex-1">
             <div className="w-24 h-24 relative shrink-0">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie data={employeeOverview} cx="50%" cy="50%" innerRadius={25} outerRadius={40} paddingAngle={2} dataKey="value" stroke="none">
                     {employeeOverview.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={entry.color} />
                     ))}
                   </Pie>
                 </PieChart>
               </ResponsiveContainer>
               <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-[12px] font-bold text-slate-800">256</span>
                  <span className="text-[7px] text-slate-500 leading-tight">Total Employees</span>
               </div>
             </div>
             <div className="flex flex-col gap-1.5 text-[9px] flex-1">
               {employeeOverview.map((item, i) => (
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
          <a href="#" className="text-center text-[9px] text-blue-600 font-medium hover:underline mt-2">View Full Report</a>
        </div>

        {/* Employee Status */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-4 flex flex-col relative">
          <div className="flex justify-between items-center mb-1">
            <h3 className="text-[11px] font-bold text-slate-800">Employee Status <span className="font-normal text-slate-500">(This Month)</span></h3>
          </div>
          <div className="flex-1 w-full h-full min-h-[160px] relative">
             <ResponsiveContainer width="100%" height="100%">
               <LineChart data={employeeStatusTrend} margin={{ top: 20, right: 10, left: -25, bottom: -10 }}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                 <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#64748b' }} dy={5} />
                 <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#64748b' }} domain={[0, 300]} />
                 <RechartsTooltip contentStyle={{ fontSize: '9px', borderRadius: '4px', padding: '4px' }} />
                 <Legend iconType="circle" wrapperStyle={{ fontSize: '9px', top: -10 }} />
                 <Line type="monotone" dataKey="present" name="Present" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                 <Line type="monotone" dataKey="leave" name="On Leave" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                 <Line type="monotone" dataKey="absent" name="Absent" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
               </LineChart>
             </ResponsiveContainer>
          </div>
        </div>

        {/* Department Wise Distribution */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-3 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Department Wise Distribution</h3>
          <div className="flex items-center justify-center gap-4 flex-1">
             <div className="w-24 h-24 relative shrink-0">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie data={departmentDistribution} cx="50%" cy="50%" innerRadius={25} outerRadius={40} paddingAngle={2} dataKey="value" stroke="none">
                     {departmentDistribution.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={entry.color} />
                     ))}
                   </Pie>
                 </PieChart>
               </ResponsiveContainer>
               <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-[12px] font-bold text-slate-800">256</span>
                  <span className="text-[7px] text-slate-500 leading-tight">Total Employees</span>
               </div>
             </div>
             <div className="flex flex-col gap-1.5 text-[9px] flex-1">
               {departmentDistribution.map((item, i) => (
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
          <a href="#" className="text-center text-[9px] text-blue-600 font-medium hover:underline mt-2">View Full Report</a>
        </div>

        {/* Quick Actions */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-2 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Quick Actions</h3>
          <div className="grid grid-cols-3 md:grid-cols-4 gap-2 flex-1">
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
        
        {/* Birthday & Work Anniversary */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-3 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Birthday & Work Anniversary</h3>
          <div className="flex border-b border-slate-200 mb-3">
             <button 
               className={`flex-1 text-[9px] font-bold py-1.5 border-b-2 transition-colors ${activeTab === 'Birthdays' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
               onClick={() => setActiveTab('Birthdays')}
             >
               Birthdays
             </button>
             <button 
               className={`flex-1 text-[9px] font-bold py-1.5 border-b-2 transition-colors ${activeTab === 'Work Anniversary' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
               onClick={() => setActiveTab('Work Anniversary')}
             >
               Work Anniversary
             </button>
          </div>
          <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
             {birthdays.map((person, i) => (
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
             ))}
          </div>
        </div>

        {/* Leave Summary */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-3 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[11px] font-bold text-slate-800">Leave Summary <span className="font-normal text-slate-500">(This Month)</span></h3>
            <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View All</a>
          </div>
          <div className="grid grid-cols-4 gap-1.5 mb-3">
             <div className="bg-blue-50 border border-blue-100 rounded flex flex-col items-center justify-center p-1.5">
                <span className="text-[7px] text-slate-600 font-medium mb-0.5">Total Leaves</span>
                <span className="text-sm font-bold text-blue-600">48</span>
             </div>
             <div className="bg-green-50 border border-green-100 rounded flex flex-col items-center justify-center p-1.5">
                <span className="text-[7px] text-slate-600 font-medium mb-0.5">Approved</span>
                <span className="text-sm font-bold text-green-600">32</span>
             </div>
             <div className="bg-orange-50 border border-orange-100 rounded flex flex-col items-center justify-center p-1.5">
                <span className="text-[7px] text-slate-600 font-medium mb-0.5">Pending</span>
                <span className="text-sm font-bold text-orange-600">10</span>
             </div>
             <div className="bg-red-50 border border-red-100 rounded flex flex-col items-center justify-center p-1.5">
                <span className="text-[7px] text-slate-600 font-medium mb-0.5">Rejected</span>
                <span className="text-sm font-bold text-red-600">6</span>
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
                   {leaveSummaryData.map((row, i) => (
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

        {/* Payroll Summary */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-4 flex flex-col">
          <div className="flex justify-between items-center mb-3">
             <h3 className="text-[11px] font-bold text-slate-800">Payroll Summary <span className="font-normal text-slate-500">(May 2025)</span></h3>
             <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View Payslip</a>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-4">
             <div className="border border-slate-100 rounded-lg p-2 text-center bg-slate-50">
                <span className="text-[8px] text-slate-500 block mb-1">Gross Salary</span>
                <span className="text-[11px] font-bold text-slate-900">₹ 68,45,320</span>
             </div>
             <div className="border border-slate-100 rounded-lg p-2 text-center bg-slate-50">
                <span className="text-[8px] text-slate-500 block mb-1">Deductions</span>
                <span className="text-[11px] font-bold text-slate-900">₹ 6,89,450</span>
             </div>
             <div className="border border-blue-100 rounded-lg p-2 text-center bg-blue-50">
                <span className="text-[8px] text-blue-700 block mb-1">Net Payroll</span>
                <span className="text-[11px] font-bold text-blue-700">₹ 61,55,870</span>
             </div>
          </div>
          <div className="flex flex-1 gap-4 items-center">
             <div className="flex-1">
                <p className="text-[9px] font-bold text-slate-700 mb-2">Payroll Components</p>
                <div className="flex flex-col gap-1.5">
                   {payrollComponents.map((comp, i) => (
                      <div key={i} className="flex justify-between text-[9px]">
                         <span className="text-slate-600">{comp.name}</span>
                         <span className="font-medium text-slate-900">{comp.amount}</span>
                      </div>
                   ))}
                </div>
             </div>
             <div className="w-24 h-24 relative shrink-0">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie data={netVsDeductions} cx="50%" cy="50%" innerRadius={25} outerRadius={40} dataKey="value" stroke="none">
                     {netVsDeductions.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={entry.color} />
                     ))}
                   </Pie>
                 </PieChart>
               </ResponsiveContainer>
               <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-[6px] text-slate-500">Net Payroll</span>
                  <span className="text-[8px] font-bold text-slate-800">₹ 61,55,870</span>
               </div>
             </div>
          </div>
        </div>

        {/* Top Earners */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-2 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[11px] font-bold text-slate-800">Top Earners <span className="font-normal text-slate-500">(This Month)</span></h3>
            <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View All</a>
          </div>
          <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
             {topEarners.map((person, i) => (
               <div key={i} className="flex items-center gap-2">
                 <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-600 shrink-0">
                    {person.avatar}
                 </div>
                 <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-bold text-slate-800 leading-tight truncate">{person.name}</p>
                    <p className="text-[8px] text-slate-500 truncate">{person.designation}</p>
                 </div>
                 <div className="text-right shrink-0">
                    <span className="text-[9px] font-bold text-slate-900">{person.amount}</span>
                 </div>
               </div>
             ))}
          </div>
        </div>

      </div>

      {/* Third Row Workspace */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
        
        {/* Recruitment Pipeline */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-2 flex flex-col">
          <div className="flex justify-between items-center mb-3">
             <h3 className="text-[11px] font-bold text-slate-800">Recruitment Pipeline</h3>
             <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View All</a>
          </div>
          <div className="flex flex-col gap-2 flex-1">
             {recruitmentPipeline.map((step, i) => (
                <div key={i} className="flex items-center justify-between p-1.5 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors">
                   <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded bg-slate-100 flex items-center justify-center">
                         {step.icon}
                      </div>
                      <span className="text-[9px] text-slate-700 font-medium">{step.name}</span>
                   </div>
                   <span className="text-[10px] font-bold text-slate-900">{step.count < 10 ? `0${step.count}` : step.count}</span>
                </div>
             ))}
          </div>
        </div>

        {/* Employees on Leave Today */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-3 flex flex-col">
          <div className="flex justify-between items-center mb-3">
             <h3 className="text-[11px] font-bold text-slate-800">Employees on Leave Today</h3>
             <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View All</a>
          </div>
          <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
             {onLeaveToday.map((person, i) => (
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
                 <span className="text-[8px] text-slate-600 shrink-0 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded">{person.type}</span>
               </div>
             ))}
          </div>
        </div>

        {/* Performance Overview */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-3 flex flex-col relative">
           <div className="flex justify-between items-center mb-1">
             <h3 className="text-[11px] font-bold text-slate-800">Performance Overview <span className="font-normal text-slate-500">(This Year)</span></h3>
             <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View Report</a>
           </div>
           <div className="flex items-center gap-2 mb-2 text-[8px] flex-wrap">
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-green-500"></div><span>Excellent</span></div>
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-blue-500"></div><span>Good</span></div>
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-orange-500"></div><span>Average</span></div>
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-red-500"></div><span>Needs Improvement</span></div>
           </div>
           <div className="flex-1 w-full h-full min-h-[140px] relative">
              <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={performanceData} margin={{ top: 5, right: 0, left: -25, bottom: -5 }} barSize={6}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="dept" axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#64748b' }} dy={5} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#64748b' }} domain={[0, 100]} />
                    <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{ fontSize: '9px', borderRadius: '4px', padding: '4px' }} />
                    <Bar dataKey="excellent" name="Excellent" fill="#10b981" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="good" name="Good" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="average" name="Average" fill="#f59e0b" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="needsImp" name="Needs Imp" fill="#ef4444" radius={[2, 2, 0, 0]} />
                 </BarChart>
              </ResponsiveContainer>
           </div>
        </div>

        {/* Employee Documents */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-2 flex flex-col">
          <div className="flex justify-between items-center mb-3">
             <h3 className="text-[11px] font-bold text-slate-800">Employee Documents</h3>
             <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View All</a>
          </div>
          <div className="flex flex-col gap-2 flex-1">
             {employeeDocuments.map((doc, i) => (
                <div key={i} className="flex items-center justify-between p-1.5 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors">
                   <div className="flex items-center gap-2">
                      <FileText size={12} className="text-blue-500" />
                      <span className="text-[9px] text-slate-700 font-medium">{doc.name}</span>
                   </div>
                   <span className="text-[9px] font-bold text-slate-900">{doc.count}</span>
                </div>
             ))}
          </div>
        </div>

        {/* HR Analytics */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-2 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">HR Analytics <span className="font-normal text-slate-500">(This Month)</span></h3>
          <div className="grid grid-cols-2 gap-2 mb-3">
             {hrAnalytics.map((stat, i) => (
                <div key={i} className="flex flex-col items-center p-2 border border-slate-100 rounded-lg text-center">
                   <span className="text-[7px] text-slate-500 font-medium mb-1 truncate w-full">{stat.name}</span>
                   
                   <div className="w-10 h-10 relative mb-1">
                     <ResponsiveContainer width="100%" height="100%">
                       <RadialBarChart cx="50%" cy="50%" innerRadius="80%" outerRadius="100%" barSize={4} data={[{ value: stat.value, fill: stat.color }]} startAngle={90} endAngle={-270}>
                         <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                         <RadialBar dataKey="value" cornerRadius={10} background={{ fill: '#f1f5f9' }} />
                       </RadialBarChart>
                     </ResponsiveContainer>
                     <div className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-slate-800">{stat.value}%</div>
                   </div>

                   <span className={`text-[7px] font-medium flex items-center gap-0.5 ${stat.trendUp ? 'text-green-600' : 'text-red-500'}`}>
                      {stat.trendUp ? <TrendingUp size={8} /> : <TrendingDown size={8} />} {stat.trend}
                   </span>
                </div>
             ))}
          </div>
          <div className="flex gap-2">
             <div className="flex-1 bg-slate-50 rounded border border-slate-100 p-2 text-center">
                <span className="text-[7px] text-slate-500 font-medium mb-0.5 block">Average Experience</span>
                <span className="text-[10px] font-bold text-slate-900">4.6 <span className="text-[8px] font-normal text-slate-500">Years</span></span>
             </div>
             <div className="flex-1 bg-slate-50 rounded border border-slate-100 p-2 text-center">
                <span className="text-[7px] text-slate-500 font-medium mb-0.5 block">Employee Satisfaction</span>
                <span className="text-[10px] font-bold text-slate-900">4.3 / 5</span>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}
