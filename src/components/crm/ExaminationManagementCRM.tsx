import React, { useState } from 'react';
import { 
  CalendarDays, Users, ClipboardCheck, FileText, BarChart2, Award, 
  ChevronRight, User, FileEdit, UserCheck, CheckSquare, Eye, 
  ShieldAlert, AlertCircle, Clock, CalendarX, ArrowUpRight, 
  ChevronDown, PlusCircle, Printer, XCircle, Share2, Upload, 
  Download, Filter, ArrowUp, ArrowDown, CheckCircle2
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid, Legend 
} from 'recharts';

const kpis = [
  { title: 'Upcoming Exams', value: '8', subtitle: 'Next: Unit Test - Science', subDate: '20 May 2025', color: 'bg-blue-500', icon: <CalendarDays size={20} />, iconColor: 'text-blue-500', iconBg: 'bg-blue-100' },
  { title: 'Students Registered', value: '5,248', subtitle: 'All Classes', color: 'bg-green-500', icon: <Users size={20} />, iconColor: 'text-green-500', iconBg: 'bg-green-100' },
  { title: 'Exams Conducted', value: '12', subtitle: 'This Academic Year', color: 'bg-orange-500', icon: <ClipboardCheck size={20} />, iconColor: 'text-orange-500', iconBg: 'bg-orange-100' },
  { title: 'Papers Created', value: '36', subtitle: 'This Term', color: 'bg-purple-500', icon: <FileText size={20} />, iconColor: 'text-purple-500', iconBg: 'bg-purple-100' },
  { title: 'Results Declared', value: '7', subtitle: 'This Academic Year', color: 'bg-teal-500', icon: <BarChart2 size={20} />, iconColor: 'text-teal-500', iconBg: 'bg-teal-100' },
  { title: 'Average Pass %', value: '92.6%', subtitle: 'This Term', color: 'bg-red-500', icon: <Award size={20} />, iconColor: 'text-red-500', iconBg: 'bg-red-100' },
];

const examSchedule = [
  { name: 'Unit Test - 1', class: 'Class 6 - 10', start: '20 May 2025', end: '24 May 2025', subjects: 8, students: '1,248' },
  { name: 'Mid Term Examination', class: 'Class 6 - 12', start: '15 Jun 2025', end: '25 Jun 2025', subjects: 10, students: '5,248' },
  { name: 'Half Yearly Examination', class: 'Class 6 - 12', start: '15 Sep 2025', end: '25 Sep 2025', subjects: 10, students: '5,248' },
  { name: 'Pre Final Examination', class: 'Class 9 - 12', start: '10 Nov 2025', end: '20 Nov 2025', subjects: 8, students: '2,156' },
  { name: 'Final Examination', class: 'Class 6 - 12', start: '10 Mar 2026', end: '25 Mar 2026', subjects: 'All', students: '5,248' },
];

const questionDistribution = [
  { name: 'Mathematics', value: 28, count: '3,518', color: '#3b82f6' },
  { name: 'Science', value: 24, count: '3,015', color: '#10b981' },
  { name: 'English', value: 18, count: '2,261', color: '#f59e0b' },
  { name: 'Social Science', value: 16, count: '2,010', color: '#ef4444' },
  { name: 'Hindi', value: 8, count: '1,005', color: '#8b5cf6' },
  { name: 'Others', value: 6, count: '759', color: '#64748b' },
];

const performanceTrend = [
  { term: 'Unit Test - 1', average: 75, pass: 88 },
  { term: 'Mid Term', average: 78, pass: 90 },
  { term: 'Half Yearly', average: 76, pass: 89 },
  { term: 'Pre Final', average: 82, pass: 94 },
];

const topPerformers = [
  { rank: 1, name: 'Aarav Sharma', class: 'Class 10 - A', percent: '98.6%' },
  { rank: 2, name: 'Myra Singh', class: 'Class 10 - B', percent: '97.8%' },
  { rank: 3, name: 'Vihaan Patel', class: 'Class 10 - A', percent: '97.2%' },
];

const marksEntryStatus = [
  { class: 'Class 6', total: 512, entered: 510, pending: 2, progress: 99 },
  { class: 'Class 7', total: 498, entered: 492, pending: 6, progress: 99 },
  { class: 'Class 8', total: 526, entered: 500, pending: 26, progress: 95 },
  { class: 'Class 9', total: 498, entered: 420, pending: 78, progress: 84 },
  { class: 'Class 10', total: 512, entered: 430, pending: 82, progress: 84 },
  { class: 'Class 11', total: 512, entered: 380, pending: 132, progress: 74 },
  { class: 'Class 12', total: 498, entered: 310, pending: 188, progress: 62 },
];

const alerts = [
  { icon: <ShieldAlert size={16} className="text-red-500" />, title: 'Unit Test - Science starts in 3 days', desc: '20 May 2025', bg: 'bg-red-50' },
  { icon: <AlertCircle size={16} className="text-orange-500" />, title: 'Upload question papers for Mid Term', desc: '10 Jun 2025', bg: 'bg-orange-50' },
  { icon: <CheckSquare size={16} className="text-blue-500" />, title: 'Marks entry pending for Unit Test - 1', desc: '5 classes', bg: 'bg-blue-50' },
  { icon: <FileText size={16} className="text-purple-500" />, title: 'Revaluation requests pending', desc: '12 requests', bg: 'bg-purple-50' },
];

const quickActions = [
  { label: 'Create New Exam', icon: <PlusCircle size={16} className="text-blue-600" /> },
  { label: 'Upload Question Paper', icon: <Upload size={16} className="text-blue-600" /> },
  { label: 'Generate Admit Card', icon: <FileText size={16} className="text-blue-600" /> },
  { label: 'Seating Arrangement', icon: <Users size={16} className="text-blue-600" /> },
  { label: 'Marks Entry', icon: <CheckSquare size={16} className="text-blue-600" /> },
  { label: 'Generate Report Card', icon: <Printer size={16} className="text-blue-600" /> },
  { label: 'Result Analysis', icon: <BarChart2 size={16} className="text-blue-600" /> },
  { label: 'Exam Settings', icon: <ClipboardCheck size={16} className="text-blue-600" /> },
];

export function ExaminationManagementCRM() {
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [examType, setExamType] = useState('Final Examination');
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
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Examination Management CRM</h2>
          <p className="text-xs text-slate-500 mt-0.5">Plan • Organize • Conduct • Evaluate • Analyze</p>
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
            <span className="text-slate-500 font-medium">Exam Type</span>
            <select 
              value={examType}
              onChange={(e) => handleFilterChange(setExamType, e.target.value)}
              className="font-bold text-slate-800 focus:outline-none bg-transparent"
            >
              <option>Final Examination</option>
              <option>Mid Term Examination</option>
              <option>Unit Test</option>
            </select>
          </div>
          <button className="bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold text-xs px-4 py-2 rounded flex items-center gap-2 shadow-sm transition-colors ml-2">
            <PlusCircle size={14} />
            <span>Create New Exam</span>
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
                {kpi.subDate && <span className="font-bold text-slate-700">{kpi.subDate}</span>}
              </div>
            )}
            <div className={`absolute bottom-0 left-0 w-full h-0.5 ${kpi.color}`}></div>
          </div>
        ))}
      </div>

      {/* First Row Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Exam Schedule */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-5 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[11px] font-bold text-slate-800">Exam Schedule <span className="font-normal text-slate-500">(Upcoming)</span></h3>
            <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View All</a>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-[9px] text-left">
              <thead>
                <tr className="text-slate-500 border-b border-slate-100">
                  <th className="pb-2 font-medium">Exam Name</th>
                  <th className="pb-2 font-medium">Class</th>
                  <th className="pb-2 font-medium">Start Date</th>
                  <th className="pb-2 font-medium">End Date</th>
                  <th className="pb-2 font-medium text-center">Subjects</th>
                  <th className="pb-2 font-medium text-center">Students</th>
                  <th className="pb-2 font-medium text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {examSchedule.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 text-blue-600 font-medium">{row.name}</td>
                    <td className="py-2.5 text-slate-700">{row.class}</td>
                    <td className="py-2.5 text-slate-700">{row.start}</td>
                    <td className="py-2.5 text-slate-700">{row.end}</td>
                    <td className="py-2.5 text-center text-slate-700">{row.subjects}</td>
                    <td className="py-2.5 text-center text-slate-700">{row.students}</td>
                    <td className="py-2.5 text-center text-slate-400 hover:text-blue-600 cursor-pointer flex justify-center"><Eye size={12} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Exam Process Workflow */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-4 flex flex-col">
           <div className="flex justify-between items-center mb-4">
             <h3 className="text-[11px] font-bold text-slate-800">Exam Process Workflow</h3>
             <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View Workflow</a>
           </div>
           
           <div className="flex justify-between items-start mb-6 px-2">
              {[
                { label: 'Plan Exam', desc: 'Create Exam, Set Schedule', icon: <User size={12} />, color: 'text-green-600 bg-green-100', active: true },
                { label: 'Prepare', desc: 'Syllabus, Paper, Question Bank', icon: <FileEdit size={12} />, color: 'text-blue-600 bg-blue-100', active: true },
                { label: 'Conduct', desc: 'Seating, Invigilation, Exams', icon: <UserCheck size={12} />, color: 'text-orange-600 bg-orange-100', active: true },
                { label: 'Evaluate', desc: 'Marks Entry, Evaluation', icon: <CheckSquare size={12} />, color: 'text-purple-600 bg-purple-100', active: true },
                { label: 'Publish', desc: 'Results, Report Cards', icon: <FileText size={12} />, color: 'text-slate-400 bg-slate-100', active: false },
              ].map((step, i) => (
                <div key={i} className="flex flex-col items-center flex-1 relative z-10 group">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1.5 shadow-sm border-2 ${step.active ? 'border-white' : 'border-slate-50'} ${step.color} transition-transform group-hover:scale-110`}>
                    {i === 3 ? <span className="font-bold text-[12px]">4</span> : step.icon}
                  </div>
                  <p className={`text-[9px] font-bold mb-0.5 text-center leading-tight ${step.active ? (i===0?'text-green-600':i===1?'text-blue-600':i===2?'text-orange-600':'text-purple-600') : 'text-slate-500'}`}>{step.label}</p>
                  <p className="text-[7px] text-slate-400 text-center leading-tight px-1">{step.desc}</p>
                  {i < 4 && (
                    <div className="absolute top-4 left-[50%] w-full h-[1px] bg-slate-200 -z-10 flex items-center justify-center">
                       <ChevronRight size={10} className="text-slate-300 bg-white" />
                    </div>
                  )}
                </div>
              ))}
           </div>

           <p className="text-[9px] font-bold text-slate-700 mb-2">Current Status</p>
           <div className="space-y-2 flex-1">
             {[
               { label: 'Planned', percent: 100, color: 'bg-green-500' },
               { label: 'Preparation', percent: 80, color: 'bg-blue-500' },
               { label: 'Conduct', percent: 40, color: 'bg-orange-500' },
               { label: 'Evaluation', percent: 25, color: 'bg-purple-500' },
               { label: 'Publish', percent: 0, color: 'bg-slate-300' },
             ].map((status, i) => (
               <div key={i} className="flex items-center gap-3 text-[9px]">
                 <span className="w-16 text-slate-600">{status.label}</span>
                 <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                   <div className={`h-full ${status.color} rounded-full`} style={{ width: `${status.percent}%` }}></div>
                 </div>
                 <span className="w-8 text-right font-bold text-slate-700">{status.percent}%</span>
               </div>
             ))}
           </div>
        </div>

        {/* Question Bank Overview */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-3 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[11px] font-bold text-slate-800">Question Bank Overview</h3>
            <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View All</a>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4 text-center">
            <div className="bg-blue-50 border border-blue-100 rounded p-1.5 flex flex-col justify-center">
              <span className="text-[7px] text-blue-600 font-medium mb-0.5">Total Questions</span>
              <span className="text-sm font-bold text-slate-800">12,568</span>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded p-1.5 flex flex-col justify-center">
              <span className="text-[7px] text-slate-500 font-medium mb-0.5">Subjective</span>
              <span className="text-sm font-bold text-slate-800">4,125</span>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded p-1.5 flex flex-col justify-center">
              <span className="text-[7px] text-slate-500 font-medium mb-0.5">Objective (MCQ)</span>
              <span className="text-sm font-bold text-slate-800">7,856</span>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded p-1.5 flex flex-col justify-center">
              <span className="text-[7px] text-slate-500 font-medium mb-0.5">With Solution</span>
              <span className="text-sm font-bold text-slate-800">9,245</span>
            </div>
          </div>

          <p className="text-[9px] font-bold text-slate-700 mb-2">Subject Wise Question Distribution</p>
          <div className="flex items-center justify-center gap-3 flex-1">
             <div className="w-24 h-24 relative shrink-0">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie data={questionDistribution} cx="50%" cy="50%" innerRadius={20} outerRadius={40} paddingAngle={1} dataKey="value" stroke="none">
                     {questionDistribution.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={entry.color} />
                     ))}
                   </Pie>
                 </PieChart>
               </ResponsiveContainer>
             </div>
             <div className="flex flex-col gap-1.5 text-[9px] min-w-[100px]">
               {questionDistribution.map((item, i) => (
                 <div key={i} className="flex items-center justify-between">
                   <div className="flex items-center gap-1.5">
                     <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                     <span className="text-slate-600 text-[8px] truncate max-w-[50px]">{item.name}</span>
                   </div>
                   <div className="text-right flex items-center gap-1">
                     <span className="text-slate-400 text-[8px]">{item.value}%</span>
                     <span className="font-bold text-slate-800 text-[8px]">({item.count})</span>
                   </div>
                 </div>
               ))}
             </div>
          </div>
        </div>

      </div>

      {/* Second Row Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Today's Exam */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-2 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3 flex items-center gap-1.5">
            <CalendarDays size={14} className="text-slate-400"/>
            Today's Exam
          </h3>
          <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 flex-1 flex flex-col">
            <div className="flex items-start gap-2 mb-3">
              <div className="w-8 h-8 rounded bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <FileText size={16} />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-900 leading-tight">Unit Test - Science</p>
                <p className="text-[9px] text-slate-500">Class: 8 - A</p>
              </div>
            </div>
            <div className="space-y-2 text-[9px] mb-4">
              <div className="flex justify-between"><span className="text-slate-500">Date:</span><span className="font-medium text-slate-800">17 May 2025</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Time:</span><span className="font-medium text-slate-800">10:00 AM - 12:00 PM</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Subject:</span><span className="font-medium text-slate-800">Science</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Total Students:</span><span className="font-medium text-slate-800">42</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Present:</span><span className="font-medium text-green-600">41</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Absent:</span><span className="font-medium text-red-500">1</span></div>
            </div>
            <button className="w-full bg-white border border-slate-200 text-slate-700 text-[9px] font-bold py-1.5 rounded hover:bg-slate-50 transition-colors mt-auto">
              View Attendance
            </button>
          </div>
        </div>

        {/* Examination Alerts */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-2 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[11px] font-bold text-slate-800">Examination Alerts</h3>
            <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View All</a>
          </div>
          <div className="flex-1 flex flex-col gap-3 overflow-hidden">
            {alerts.map((alert, i) => (
              <div key={i} className="flex gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${alert.bg}`}>
                  {alert.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] font-bold text-slate-800 leading-tight mb-0.5">{alert.title}</p>
                  <p className="text-[8px] text-slate-500 leading-snug">{alert.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Result Summary */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-4 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-[11px] font-bold text-slate-800">Result Summary <span className="font-normal text-slate-500">(This Term)</span></h3>
            </div>
            <div className="flex items-center gap-2">
               <div className="flex items-center gap-1 text-[9px]">
                 <span className="text-slate-500">Class</span>
                 <select className="border border-slate-200 rounded px-1 py-0.5 text-slate-700 focus:outline-none">
                   <option>All Classes</option>
                 </select>
               </div>
               <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View Detailed</a>
            </div>
          </div>
          
          <div className="grid grid-cols-5 gap-2 mb-4 text-center">
            <div className="border border-slate-100 rounded-lg p-1.5 flex flex-col justify-center">
              <span className="text-[8px] text-slate-500 mb-0.5">Students Appeared</span>
              <span className="text-sm font-bold text-slate-800">5,248</span>
            </div>
            <div className="border border-green-100 bg-green-50 rounded-lg p-1.5 flex flex-col justify-center">
              <span className="text-[8px] text-green-700 mb-0.5">Pass</span>
              <span className="text-sm font-bold text-green-700">4,859</span>
              <span className="text-[7px] text-green-600">(92.6%)</span>
            </div>
            <div className="border border-red-100 bg-red-50 rounded-lg p-1.5 flex flex-col justify-center">
              <span className="text-[8px] text-red-700 mb-0.5">Fail</span>
              <span className="text-sm font-bold text-red-700">389</span>
              <span className="text-[7px] text-red-600">(7.4%)</span>
            </div>
            <div className="border border-slate-100 rounded-lg p-1.5 flex flex-col justify-center">
              <span className="text-[8px] text-slate-500 mb-0.5">Highest Score</span>
              <span className="text-sm font-bold text-blue-600">98.6%</span>
            </div>
            <div className="border border-slate-100 rounded-lg p-1.5 flex flex-col justify-center">
              <span className="text-[8px] text-slate-500 mb-0.5">Average Score</span>
              <span className="text-sm font-bold text-blue-600">78.4%</span>
            </div>
          </div>

          <div className="flex gap-4 flex-1">
             {/* Top Performers */}
             <div className="flex-1 border border-slate-100 rounded-lg p-2.5 flex flex-col">
               <p className="text-[9px] font-bold text-slate-700 mb-2">Top Performers</p>
               <table className="w-full text-[8px] text-left">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-50">
                      <th className="pb-1 font-medium">Rank</th>
                      <th className="pb-1 font-medium">Student Name</th>
                      <th className="pb-1 font-medium">Class</th>
                      <th className="pb-1 font-medium text-right">Percentage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {topPerformers.map((row, i) => (
                      <tr key={i}>
                        <td className="py-1 text-slate-600">{row.rank}</td>
                        <td className="py-1 text-slate-800 font-medium">{row.name}</td>
                        <td className="py-1 text-slate-500">{row.class}</td>
                        <td className="py-1 text-right font-bold text-slate-800">{row.percent}</td>
                      </tr>
                    ))}
                  </tbody>
               </table>
               <a href="#" className="text-center text-[9px] text-blue-600 font-medium hover:underline mt-auto pt-2 block">View All</a>
             </div>
             
             {/* Performance Trend */}
             <div className="flex-1 border border-slate-100 rounded-lg p-2.5 flex flex-col relative">
               <div className="flex justify-between items-center mb-1">
                 <p className="text-[9px] font-bold text-slate-700">Performance Trend</p>
                 <select className="text-[7px] border border-slate-200 rounded focus:outline-none">
                   <option>This Term</option>
                 </select>
               </div>
               <div className="flex-1 w-full h-full min-h-[60px]">
                 <ResponsiveContainer width="100%" height="100%">
                   <LineChart data={performanceTrend} margin={{ top: 15, right: 5, left: -30, bottom: -10 }}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                     <XAxis dataKey="term" axisLine={false} tickLine={false} tick={{ fontSize: 7, fill: '#64748b' }} dy={5} />
                     <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 7, fill: '#64748b' }} tickFormatter={(val) => `${val}%`} domain={[0, 100]} />
                     <RechartsTooltip contentStyle={{ fontSize: '8px', borderRadius: '4px', padding: '4px' }} />
                     <Legend iconType="circle" wrapperStyle={{ fontSize: '8px', top: -5 }} />
                     <Line type="monotone" dataKey="average" name="Average %" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2 }} />
                     <Line type="monotone" dataKey="pass" name="Pass %" stroke="#10b981" strokeWidth={2} dot={{ r: 2 }} />
                   </LineChart>
                 </ResponsiveContainer>
               </div>
             </div>
          </div>
        </div>

        {/* Marks Entry Status */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-4 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[11px] font-bold text-slate-800">Marks Entry Status</h3>
            <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View All</a>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-[9px] text-left">
              <thead>
                <tr className="text-slate-500 border-b border-slate-100">
                  <th className="pb-2 font-medium">Class</th>
                  <th className="pb-2 font-medium text-center">Total Students</th>
                  <th className="pb-2 font-medium text-center">Marks Entered</th>
                  <th className="pb-2 font-medium text-center">Pending</th>
                  <th className="pb-2 font-medium text-right">Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {marksEntryStatus.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="py-1.5 text-slate-700">{row.class}</td>
                    <td className="py-1.5 text-center text-slate-700">{row.total}</td>
                    <td className="py-1.5 text-center text-slate-700">{row.entered}</td>
                    <td className="py-1.5 text-center text-slate-700">{row.pending}</td>
                    <td className="py-1.5 flex items-center justify-end gap-2">
                       <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                         <div className={`h-full ${row.progress > 80 ? 'bg-green-500' : 'bg-blue-500'} rounded-full`} style={{ width: `${row.progress}%` }}></div>
                       </div>
                       <span className="w-5 text-right font-bold text-slate-800">{row.progress}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Third Row Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Exam Analytics */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-3 flex flex-col">
          <div className="flex justify-between items-center mb-3">
             <h3 className="text-[11px] font-bold text-slate-800">Exam Analytics</h3>
             <select className="text-[7px] border border-slate-200 rounded focus:outline-none">
               <option>This Term</option>
             </select>
          </div>
          <div className="grid grid-cols-3 gap-2 flex-1">
             <div className="border border-slate-100 rounded-lg p-2 text-center flex flex-col justify-center">
                <span className="text-[8px] text-slate-500 mb-1">Pass Percentage</span>
                <span className="text-xl font-bold text-slate-900 mb-1">92.6%</span>
                <span className="text-[7px] text-green-600 font-medium flex items-center justify-center gap-0.5 mt-auto">
                  <ArrowUp size={8} /> 4.2% <span className="text-slate-400">from last term</span>
                </span>
             </div>
             <div className="border border-slate-100 rounded-lg p-2 text-center flex flex-col justify-center">
                <span className="text-[8px] text-slate-500 mb-1">Average Score</span>
                <span className="text-xl font-bold text-blue-600 mb-1">78.4%</span>
                <span className="text-[7px] text-blue-600 font-medium flex items-center justify-center gap-0.5 mt-auto">
                  <ArrowUp size={8} /> 3.6% <span className="text-slate-400">from last term</span>
                </span>
             </div>
             <div className="border border-slate-100 rounded-lg p-2 text-center flex flex-col justify-center">
                <span className="text-[8px] text-slate-500 mb-1">Improvement</span>
                <span className="text-xl font-bold text-purple-600 mb-1">+5.8%</span>
                <span className="text-[7px] text-slate-400 font-medium flex items-center justify-center gap-0.5 mt-auto">
                   from last term
                </span>
             </div>
          </div>
        </div>

        {/* Revaluation / Recheck */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-3 flex flex-col">
          <div className="flex justify-between items-center mb-3">
             <h3 className="text-[11px] font-bold text-slate-800">Revaluation / Recheck</h3>
             <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View All</a>
          </div>
          <div className="grid grid-cols-4 gap-2 flex-1 items-center">
             <div className="flex flex-col items-center text-center">
                <div className="w-6 h-6 rounded bg-blue-50 text-blue-500 flex items-center justify-center mb-1"><FileText size={12} /></div>
                <span className="text-[7px] text-slate-500 font-medium leading-tight mb-0.5">Requests<br/>Received</span>
                <span className="text-base font-bold text-slate-900">96</span>
             </div>
             <div className="flex flex-col items-center text-center">
                <div className="w-6 h-6 rounded bg-orange-50 text-orange-500 flex items-center justify-center mb-1"><Clock size={12} /></div>
                <span className="text-[7px] text-slate-500 font-medium leading-tight mb-0.5">Under<br/>Review</span>
                <span className="text-base font-bold text-slate-900">28</span>
             </div>
             <div className="flex flex-col items-center text-center">
                <div className="w-6 h-6 rounded bg-green-50 text-green-500 flex items-center justify-center mb-1"><CheckCircle2 size={12} /></div>
                <span className="text-[7px] text-slate-500 font-medium leading-tight mb-0.5"><br/>Approved</span>
                <span className="text-base font-bold text-slate-900">42</span>
             </div>
             <div className="flex flex-col items-center text-center">
                <div className="w-6 h-6 rounded bg-red-50 text-red-500 flex items-center justify-center mb-1"><XCircle size={12} /></div>
                <span className="text-[7px] text-slate-500 font-medium leading-tight mb-0.5"><br/>Rejected</span>
                <span className="text-base font-bold text-slate-900">26</span>
             </div>
          </div>
        </div>

        {/* Report Card Status */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-3 flex flex-col">
          <div className="flex justify-between items-center mb-3">
             <h3 className="text-[11px] font-bold text-slate-800">Report Card Status</h3>
             <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View All</a>
          </div>
          <div className="grid grid-cols-4 gap-2 flex-1 items-center">
             <div className="flex flex-col items-center text-center border border-slate-100 rounded p-1.5 bg-slate-50">
                <div className="text-blue-500 mb-1"><FileText size={12} /></div>
                <span className="text-[7px] text-slate-500 font-medium mb-1">Generated</span>
                <span className="text-sm font-bold text-slate-900">4,618</span>
             </div>
             <div className="flex flex-col items-center text-center border border-slate-100 rounded p-1.5 bg-slate-50">
                <div className="text-indigo-500 mb-1"><Upload size={12} /></div>
                <span className="text-[7px] text-slate-500 font-medium mb-1">Published</span>
                <span className="text-sm font-bold text-slate-900">4,102</span>
             </div>
             <div className="flex flex-col items-center text-center border border-slate-100 rounded p-1.5 bg-slate-50">
                <div className="text-green-500 mb-1"><Share2 size={12} /></div>
                <span className="text-[7px] text-slate-500 font-medium mb-1">Shared</span>
                <span className="text-sm font-bold text-slate-900">3,985</span>
             </div>
             <div className="flex flex-col items-center text-center border border-slate-100 rounded p-1.5 bg-slate-50">
                <div className="text-orange-500 mb-1"><Clock size={12} /></div>
                <span className="text-[7px] text-slate-500 font-medium mb-1">Pending</span>
                <span className="text-sm font-bold text-slate-900">1,146</span>
             </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-3 flex flex-col">
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
