import React, { useState } from 'react';
import { 
  Users, CheckCircle2, XCircle, Clock, TrendingUp, CalendarX, 
  ChevronDown, RefreshCw, AlertCircle, Calendar, Fingerprint, 
  Settings, ClipboardCheck, ArrowUpRight, ArrowDownRight,
  FileText, ShieldAlert, DoorOpen, LogIn, Search, CheckSquare
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid, Legend 
} from 'recharts';

const kpis = [
  { title: 'Total Students', value: '5,248', subtitle: '8.5% from last month', trend: 'up', color: 'bg-green-500', icon: <Users size={20} />, iconColor: 'text-green-500', iconBg: 'bg-green-100' },
  { title: 'Present Today', value: '4,860', subtitle: '92.6%', trend: 'neutral', color: 'bg-blue-500', icon: <CheckCircle2 size={20} />, iconColor: 'text-blue-500', iconBg: 'bg-blue-100' },
  { title: 'Absent Today', value: '312', subtitle: '5.9%', trend: 'neutral', color: 'bg-orange-500', icon: <XCircle size={20} />, iconColor: 'text-orange-500', iconBg: 'bg-orange-100' },
  { title: 'Late Today', value: '76', subtitle: '1.5%', trend: 'neutral', color: 'bg-purple-500', icon: <Clock size={20} />, iconColor: 'text-purple-500', iconBg: 'bg-purple-100' },
  { title: 'Average Attendance', value: '92.6%', subtitle: '3.4% from last month', trend: 'up', color: 'bg-teal-500', icon: <TrendingUp size={20} />, iconColor: 'text-teal-500', iconBg: 'bg-teal-100' },
  { title: 'On Leave Today', value: '42', subtitle: '0.8%', trend: 'neutral', color: 'bg-pink-500', icon: <CalendarX size={20} />, iconColor: 'text-pink-500', iconBg: 'bg-pink-100' },
];

const overviewData = [
  { name: 'Present', value: 4860, color: '#10b981' },
  { name: 'Absent', value: 312, color: '#ef4444' },
  { name: 'Late', value: 76, color: '#f59e0b' },
  { name: 'On Leave', value: 42, color: '#8b5cf6' },
];

const trendData = [
  { date: '11 May', present: 90, absent: 8, late: 2 },
  { date: '12 May', present: 91, absent: 7, late: 2 },
  { date: '13 May', present: 88, absent: 9, late: 3 },
  { date: '14 May', present: 93, absent: 5, late: 2 },
  { date: '15 May', present: 89, absent: 8, late: 3 },
  { date: '16 May', present: 94, absent: 4, late: 2 },
  { date: '17 May', present: 92.6, absent: 5.9, late: 1.5 },
];

const dayTypeData = [
  { name: 'Working Days', value: 92.6, color: '#3b82f6' },
  { name: 'Holidays', value: 0.8, color: '#ef4444' },
  { name: 'Weekend', value: 6.6, color: '#10b981' },
];

const classAttendanceData = [
  { className: 'Class 6', present: 42, absent: 2, late: 1, leave: 0, percent: 93.3 },
  { className: 'Class 6 - B', present: 41, absent: 3, late: 0, leave: 1, percent: 89.1 },
  { className: 'Class 7 - A', present: 45, absent: 1, late: 2, leave: 0, percent: 93.8 },
  { className: 'Class 7 - B', present: 43, absent: 2, late: 1, leave: 0, percent: 91.5 },
  { className: 'Class 8 - A', present: 46, absent: 2, late: 0, leave: 0, percent: 95.8 },
];

const classProgressData = [
  { name: 'Class 6', percent: 93.6 },
  { name: 'Class 7', percent: 91.8 },
  { name: 'Class 8', percent: 92.1 },
  { name: 'Class 9', percent: 90.3 },
  { name: 'Class 10', percent: 92.7 },
  { name: 'Class 11', percent: 93.2 },
  { name: 'Class 12', percent: 94.5 },
];

const topStudents = [
  { name: 'Aarav Sharma', class: 'Class 8 - A', percent: '98.6%' },
  { name: 'Myra Singh', class: 'Class 7 - B', percent: '98.2%' },
  { name: 'Vihaan Patel', class: 'Class 9 - A', percent: '97.8%' },
  { name: 'Ananya Gupta', class: 'Class 6 - A', percent: '97.5%' },
  { name: 'Rudra Mehra', class: 'Class 10 - B', percent: '97.2%' },
];

const alerts = [
  { icon: <ShieldAlert size={16} className="text-red-500" />, title: 'High Absenteeism', desc: '28 students have < 75% attendance', time: '10 min ago', bg: 'bg-red-50' },
  { icon: <AlertCircle size={16} className="text-orange-500" />, title: 'Continuous Absent', desc: '5 students absent for 3 consecutive days', time: '25 min ago', bg: 'bg-orange-50' },
  { icon: <Clock size={16} className="text-purple-500" />, title: 'Late Coming Alert', desc: '12 students came late today', time: '35 min ago', bg: 'bg-purple-50' },
  { icon: <CalendarX size={16} className="text-blue-500" />, title: 'On Leave', desc: '42 students on leave today', time: '1 hr ago', bg: 'bg-blue-50' },
];

const quickActions = [
  { label: 'Mark Attendance', icon: <CheckSquare size={16} className="text-blue-600" /> },
  { label: 'Student Attendance Report', icon: <FileText size={16} className="text-blue-600" /> },
  { label: 'Teacher Attendance Report', icon: <FileText size={16} className="text-blue-600" /> },
  { label: 'Staff Attendance Report', icon: <FileText size={16} className="text-blue-600" /> },
  { label: 'Leave Requests', icon: <CalendarX size={16} className="text-blue-600" /> },
  { label: 'Gate Pass', icon: <DoorOpen size={16} className="text-blue-600" /> },
  { label: 'Late Coming Report', icon: <Clock size={16} className="text-blue-600" /> },
  { label: 'Attendance Settings', icon: <Settings size={16} className="text-blue-600" /> },
];

import { SubModuleView } from './shared/SubModuleView';

export function AttendanceManagementCRM({ currentView = 'Student Attendance' }: { currentView?: string }) {
  if (currentView && currentView !== 'Student Attendance') {
    return <SubModuleView module="Attendance Management" title={currentView} />;
  }

  const [academicYear, setAcademicYear] = useState('2025-26');
  const [section, setSection] = useState('All Sections');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('By Class');

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
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Attendance Management CRM</h2>
          <p className="text-xs text-slate-500 mt-0.5">Track • Monitor • Analyze • Improve</p>
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
            <span className="text-slate-500 font-medium">Select Section</span>
            <select 
              value={section}
              onChange={(e) => handleFilterChange(setSection, e.target.value)}
              className="font-bold text-slate-800 focus:outline-none bg-transparent"
            >
              <option>All Sections</option>
              <option>Section A</option>
              <option>Section B</option>
            </select>
          </div>
          <button className="bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold text-xs px-4 py-2 rounded flex items-center gap-2 shadow-sm transition-colors ml-2">
            <ClipboardCheck size={14} />
            <span>Mark Attendance</span>
            <ChevronDown size={14} className="ml-1 opacity-70" />
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map((kpi, i) => (
          <div key={i} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden">
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
              <div className="text-[9px] text-slate-500 flex items-center gap-1">
                {kpi.trend === 'up' && <ArrowUpRight size={10} className="text-green-500 font-bold" />}
                {kpi.trend === 'down' && <ArrowDownRight size={10} className="text-red-500 font-bold" />}
                <span className={kpi.trend === 'up' ? 'text-green-600 font-medium' : ''}>{kpi.subtitle}</span>
              </div>
            )}
            <div className={`absolute bottom-0 left-0 w-full h-0.5 ${kpi.color}`}></div>
          </div>
        ))}
      </div>

      {/* First Row Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Attendance Overview */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-3 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Attendance Overview <span className="font-normal text-slate-500">(This Month)</span></h3>
          <div className="flex items-center justify-center gap-4 flex-1">
            <div className="w-24 h-24 relative shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={overviewData} cx="50%" cy="50%" innerRadius={35} outerRadius={45} paddingAngle={2} dataKey="value" stroke="none">
                    {overviewData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-sm font-bold text-slate-800 leading-none">92.6%</span>
                <span className="text-[6px] text-slate-500 mt-0.5 uppercase tracking-wider text-center">Overall<br/>Attendance</span>
              </div>
            </div>
            <div className="flex flex-col gap-2 text-[9px] min-w-[100px]">
              {overviewData.map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                    <span className="text-slate-600">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 mr-1">({((item.value / 5248) * 100).toFixed(1)}%)</span>
                    <span className="font-bold text-slate-800">{item.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="text-[9px] text-slate-500 mt-2">Total Students: 5,248</div>
        </div>

        {/* Attendance Trend */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-4 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[11px] font-bold text-slate-800">Attendance Trend <span className="font-normal text-slate-500">(Last 7 Days)</span></h3>
            <select className="text-[9px] border border-slate-200 rounded text-slate-500 focus:outline-none">
              <option>This Week</option>
            </select>
          </div>
          <div className="flex-1 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b' }} dy={5} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b' }} tickFormatter={(val) => `${val}%`} domain={[0, 100]} />
                <RechartsTooltip contentStyle={{ fontSize: '9px', borderRadius: '8px', padding: '4px' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '9px', top: -10 }} />
                <Line type="monotone" dataKey="present" name="Present %" stroke="#10b981" strokeWidth={2} dot={{ r: 2 }} />
                <Line type="monotone" dataKey="absent" name="Absent %" stroke="#ef4444" strokeWidth={2} dot={{ r: 2 }} />
                <Line type="monotone" dataKey="late" name="Late %" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Real Time Attendance */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-3 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Real Time Attendance <span className="font-normal text-slate-500">(Today)</span></h3>
          <div className="flex items-center justify-center gap-4 flex-1">
            <div className="w-24 h-24 relative shrink-0">
               <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-slate-100"
                    strokeWidth="3"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-green-500"
                    strokeWidth="3"
                    strokeDasharray="92.6, 100"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
               </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-sm font-bold text-slate-800 leading-none">5,248</span>
                <span className="text-[7px] text-slate-500 mt-0.5">Total Students</span>
              </div>
            </div>
            <div className="flex flex-col gap-2 text-[9px] min-w-[100px]">
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <CheckCircle2 size={10} className="text-green-500" />
                    <span className="text-slate-600">Present</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-800 mr-1">4,860</span>
                    <span className="text-slate-400 text-[8px]">(92.6%)</span>
                  </div>
               </div>
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <XCircle size={10} className="text-red-500" />
                    <span className="text-slate-600">Absent</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-800 mr-1">312</span>
                    <span className="text-slate-400 text-[8px]">(5.9%)</span>
                  </div>
               </div>
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Clock size={10} className="text-amber-500" />
                    <span className="text-slate-600">Late</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-800 mr-1">76</span>
                    <span className="text-slate-400 text-[8px]">(1.5%)</span>
                  </div>
               </div>
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <CalendarX size={10} className="text-purple-500" />
                    <span className="text-slate-600">On Leave</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-800 mr-1">42</span>
                    <span className="text-slate-400 text-[8px]">(0.8%)</span>
                  </div>
               </div>
            </div>
          </div>
          <div className="flex items-center justify-between text-[9px] text-slate-500 mt-2">
            <span>Last Updated: 10:30 AM</span>
            <button className="text-slate-400 hover:text-blue-500"><RefreshCw size={10} /></button>
          </div>
        </div>

        {/* Attendance by Class */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-2 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Attendance by Class <span className="font-normal text-slate-500">(This Month)</span></h3>
          <div className="space-y-2 flex-1 flex flex-col justify-center">
            {classProgressData.map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-[9px]">
                <span className="w-10 text-slate-600">{item.name}</span>
                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${item.percent}%` }}></div>
                </div>
                <span className="w-6 text-right font-bold text-slate-700">{item.percent}%</span>
              </div>
            ))}
          </div>
          <a href="#" className="text-center text-[9px] text-blue-600 font-medium hover:underline mt-2">View Full Report</a>
        </div>
      </div>

      {/* Second Row Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Today's Attendance Table */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-4 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Today's Attendance by Class</h3>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-[9px] text-left">
              <thead>
                <tr className="text-slate-500 border-b border-slate-100">
                  <th className="pb-2 font-medium">Class / Section</th>
                  <th className="pb-2 font-medium text-center">Present</th>
                  <th className="pb-2 font-medium text-center">Absent</th>
                  <th className="pb-2 font-medium text-center">Late</th>
                  <th className="pb-2 font-medium text-center">On Leave</th>
                  <th className="pb-2 font-medium text-right">Attendance %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {classAttendanceData.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2 text-slate-700">{row.className}</td>
                    <td className="py-2 text-center text-slate-700">{row.present}</td>
                    <td className="py-2 text-center text-slate-700">{row.absent}</td>
                    <td className="py-2 text-center text-slate-700">{row.late}</td>
                    <td className="py-2 text-center text-slate-700">{row.leave}</td>
                    <td className="py-2 text-right font-bold text-slate-800">{row.percent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <a href="#" className="text-center text-[9px] text-blue-600 font-medium hover:underline mt-2">View All Classes</a>
        </div>

        {/* Mark Attendance Action Widget */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-3 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Mark Attendance</h3>
          
          <div className="flex border-b border-slate-200 mb-3">
            {['By Class', 'By Subject', 'By Activity'].map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`text-[9px] font-bold px-3 py-1.5 border-b-2 transition-colors flex-1 text-center ${activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="space-y-3 flex-1 flex flex-col justify-center">
            <div>
              <label className="block text-[9px] font-medium text-slate-600 mb-1">Select Class</label>
              <select className="w-full text-[10px] border border-slate-200 rounded p-1.5 focus:outline-none focus:border-blue-500 bg-white">
                <option>Class 8 - A</option>
                <option>Class 8 - B</option>
                <option>Class 9 - A</option>
              </select>
            </div>
            <div>
              <label className="block text-[9px] font-medium text-slate-600 mb-1">Select Date</label>
              <div className="relative">
                <Calendar size={12} className="absolute left-2 top-1.5 text-slate-400" />
                <input type="date" className="w-full text-[10px] border border-slate-200 rounded p-1.5 pl-6 focus:outline-none focus:border-blue-500 bg-white" defaultValue="2025-05-17" />
              </div>
            </div>
            <button className="w-full bg-green-600 hover:bg-green-700 text-white text-[10px] font-bold py-1.5 rounded flex items-center justify-center gap-1.5 transition-colors">
              <CheckCircle2 size={12} /> Mark Attendance
            </button>
            <button className="w-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-[10px] font-bold py-1.5 rounded flex items-center justify-center gap-1.5 transition-colors">
              <Fingerprint size={12} /> Use Biometric Device
            </button>
          </div>
        </div>

        {/* Attendance Summary */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-3 flex flex-col">
           <h3 className="text-[11px] font-bold text-slate-800 mb-3">Attendance Summary <span className="font-normal text-slate-500">(This Month)</span></h3>
           <div className="grid grid-cols-4 gap-2 mb-4 text-center">
              <div>
                <p className="text-[8px] text-slate-500 mb-0.5">Total Working Days</p>
                <p className="text-lg font-bold text-green-600">26</p>
              </div>
              <div>
                <p className="text-[8px] text-slate-500 mb-0.5">Days Completed</p>
                <p className="text-lg font-bold text-green-600">17</p>
              </div>
              <div>
                <p className="text-[8px] text-slate-500 mb-0.5">Holidays</p>
                <p className="text-lg font-bold text-green-600">4</p>
              </div>
              <div>
                <p className="text-[8px] text-slate-500 mb-0.5">Attendance Taken</p>
                <p className="text-lg font-bold text-green-600">17</p>
              </div>
           </div>
           
           <div className="grid grid-cols-2 gap-x-4 gap-y-3 mt-auto text-center border-t border-slate-100 pt-3">
              <div>
                <p className="text-[8px] text-slate-500">Best Attendance</p>
                <p className="text-[9px] font-bold text-slate-800">Class 12 (94.5%)</p>
              </div>
              <div>
                <p className="text-[8px] text-slate-500">Lowest Attendance</p>
                <p className="text-[9px] font-bold text-slate-800">Class 9 (90.3%)</p>
              </div>
              <div>
                <p className="text-[8px] text-slate-500">Improvement</p>
                <p className="text-[10px] font-bold text-green-600 flex items-center justify-center gap-0.5">
                  <ArrowUpRight size={10} /> 3.4%
                </p>
              </div>
              <div>
                <p className="text-[8px] text-slate-500">At Risk Students</p>
                <p className="text-[10px] font-bold text-red-500">28</p>
              </div>
           </div>
           <a href="#" className="text-center text-[9px] text-blue-600 font-medium hover:underline mt-3 block">View Detailed Summary</a>
        </div>

        {/* Attendance Alerts */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-2 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[11px] font-bold text-slate-800">Attendance Alerts</h3>
            <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View All</a>
          </div>
          <div className="flex-1 flex flex-col gap-2.5 overflow-hidden">
            {alerts.map((alert, i) => (
              <div key={i} className="flex gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${alert.bg}`}>
                  {alert.icon}
                </div>
                <div className="min-w-0">
                  <div className="flex justify-between items-start gap-1">
                    <p className="text-[9px] font-bold text-slate-800 truncate leading-tight">{alert.title}</p>
                    <span className="text-[7px] text-slate-400 shrink-0 mt-0.5">{alert.time}</span>
                  </div>
                  <p className="text-[8px] text-slate-500 leading-snug line-clamp-2 pr-1">{alert.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Third Row Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Day Type */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-3 flex flex-col">
           <h3 className="text-[11px] font-bold text-slate-800 mb-3">Attendance by Day Type <span className="font-normal text-slate-500">(This Month)</span></h3>
           <div className="flex items-center justify-center gap-4 flex-1">
             <div className="w-20 h-20 relative shrink-0">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie data={dayTypeData} cx="50%" cy="50%" innerRadius={25} outerRadius={35} paddingAngle={2} dataKey="value" stroke="none">
                     {dayTypeData.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={entry.color} />
                     ))}
                   </Pie>
                 </PieChart>
               </ResponsiveContainer>
             </div>
             <div className="flex flex-col gap-2 text-[9px]">
               {dayTypeData.map((item, i) => (
                 <div key={i} className="flex items-center justify-between min-w-[80px]">
                   <div className="flex items-center gap-1.5">
                     <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                     <span className="text-slate-600">{item.name}</span>
                   </div>
                   <span className="font-bold text-slate-800">{item.value}%</span>
                 </div>
               ))}
             </div>
           </div>
           <a href="#" className="text-center text-[9px] text-blue-600 font-medium hover:underline mt-2">View Calendar</a>
        </div>

        {/* Top 5 Students */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-2 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Top 5 Students <span className="font-normal text-slate-500">(By Attendance %)</span></h3>
          <div className="space-y-2 flex-1">
            {topStudents.map((student, i) => (
              <div key={i} className="flex items-center justify-between text-[9px]">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-medium">{i + 1}.</span>
                  <div>
                    <p className="font-bold text-slate-700">{student.name}</p>
                    <p className="text-[8px] text-slate-400">{student.class}</p>
                  </div>
                </div>
                <span className="font-bold text-slate-800">{student.percent}</span>
              </div>
            ))}
          </div>
          <a href="#" className="text-center text-[9px] text-blue-600 font-medium hover:underline mt-2">View All</a>
        </div>

        {/* Attendance by Time */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-3 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Attendance by Time <span className="font-normal text-slate-500">(Today)</span></h3>
          <div className="grid grid-cols-4 gap-2 flex-1 items-center justify-center">
            <div className="flex flex-col items-center justify-center text-center p-2">
              <Clock size={16} className="text-blue-500 mb-1" />
              <p className="text-[7px] text-slate-500 leading-tight mb-1">Before<br/>8:00 AM</p>
              <p className="text-sm font-bold text-slate-800">120</p>
              <p className="text-[7px] text-blue-500 font-medium bg-blue-50 px-1 rounded mt-0.5">On Time</p>
            </div>
            <div className="flex flex-col items-center justify-center text-center p-2 border-l border-slate-100">
              <Clock size={16} className="text-green-500 mb-1" />
              <p className="text-[7px] text-slate-500 leading-tight mb-1">8:00 AM -<br/>8:30 AM</p>
              <p className="text-sm font-bold text-slate-800">4,736</p>
              <p className="text-[7px] text-green-500 font-medium bg-green-50 px-1 rounded mt-0.5">On Time</p>
            </div>
            <div className="flex flex-col items-center justify-center text-center p-2 border-l border-slate-100">
              <Clock size={16} className="text-orange-500 mb-1" />
              <p className="text-[7px] text-slate-500 leading-tight mb-1">8:30 AM -<br/>9:00 AM</p>
              <p className="text-sm font-bold text-slate-800">268</p>
              <p className="text-[7px] text-orange-500 font-medium bg-orange-50 px-1 rounded mt-0.5">Late</p>
            </div>
            <div className="flex flex-col items-center justify-center text-center p-2 border-l border-slate-100">
              <Clock size={16} className="text-red-500 mb-1" />
              <p className="text-[7px] text-slate-500 leading-tight mb-1">After<br/>9:00 AM</p>
              <p className="text-sm font-bold text-slate-800">76</p>
              <p className="text-[7px] text-red-500 font-medium bg-red-50 px-1 rounded mt-0.5">Very Late</p>
            </div>
          </div>
          <div className="text-center text-[9px] font-bold text-slate-700 mt-2">
            Total Present: 4,860
          </div>
        </div>

        {/* Leave Overview */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-2 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Leave Overview <span className="font-normal text-slate-500">(This Month)</span></h3>
          <div className="flex-1 flex flex-col justify-between gap-1 text-[9px]">
            <div className="flex items-center justify-between py-1 border-b border-slate-50">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded bg-blue-50 text-blue-500 flex items-center justify-center"><FileText size={10} /></div>
                <span className="text-slate-700 font-medium">Total Leave Applications</span>
              </div>
              <span className="font-bold text-slate-800">68</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-slate-50">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded bg-green-50 text-green-500 flex items-center justify-center"><CheckCircle2 size={10} /></div>
                <span className="text-slate-700 font-medium">Approved</span>
              </div>
              <span className="font-bold text-slate-800">54</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-slate-50">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded bg-amber-50 text-amber-500 flex items-center justify-center"><Clock size={10} /></div>
                <span className="text-slate-700 font-medium">Pending</span>
              </div>
              <span className="font-bold text-slate-800">8</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded bg-red-50 text-red-500 flex items-center justify-center"><XCircle size={10} /></div>
                <span className="text-slate-700 font-medium">Rejected</span>
              </div>
              <span className="font-bold text-slate-800">6</span>
            </div>
          </div>
          <a href="#" className="text-center text-[9px] text-blue-600 font-medium hover:underline mt-2 block">View All Leave Requests</a>
        </div>

        {/* Quick Actions */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-2 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Quick Actions</h3>
          <div className="grid grid-cols-4 gap-2 flex-1">
            {quickActions.map((action, i) => (
              <button key={i} className="flex flex-col items-center justify-center text-center p-1.5 rounded-lg border border-slate-100 hover:bg-blue-50 hover:border-blue-100 transition-colors group">
                <div className="w-6 h-6 rounded bg-slate-50 flex items-center justify-center mb-1 group-hover:bg-white transition-colors">
                  {action.icon}
                </div>
                <span className="text-[7px] text-slate-600 group-hover:text-blue-700 font-medium leading-tight">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
