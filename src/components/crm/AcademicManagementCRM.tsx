import React, { useState } from 'react';
import { ChevronDown, PlusCircle, Calendar as CalendarIcon, Book, Users, ClipboardList, CheckSquare, FileText, ChevronLeft, ChevronRight, Award, Trophy, FlaskConical, Music, LayoutGrid, BrainCircuit, Download } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid, LineChart, Line, Legend } from 'recharts';

const kpis = [
  { title: 'Classes', value: '182', subtitle: 'Nursery to Class 12', color: 'bg-blue-500', icon: <Book size={20} /> },
  { title: 'Subjects', value: '276', subtitle: 'Across All Classes', color: 'bg-indigo-600', icon: <FileText size={20} /> },
  { title: 'Teachers', value: '326', subtitle: 'Active Teachers', color: 'bg-green-500', icon: <Users size={20} /> },
  { title: 'Lesson Plans', value: '2,486', subtitle: 'Created This Term', color: 'bg-orange-500', icon: <CalendarIcon size={20} /> },
  { title: 'Homework Assigned', value: '1,285', subtitle: 'This Month', color: 'bg-pink-500', icon: <CheckSquare size={20} /> },
  { title: 'Assessments Conducted', value: '342', subtitle: 'This Term', color: 'bg-purple-600', icon: <ClipboardList size={20} /> },
];

const scheduleData = [
  { period: 'P1', time: '08:00 - 08:40', subject: 'Mathematics', class: 'Class 10-A', teacher: 'Dr. Neha Verma', color: 'bg-blue-500' },
  { period: 'P2', time: '08:50 - 09:30', subject: 'Science', class: 'Class 8-B', teacher: 'Mr. Rahul Mehta', color: 'bg-orange-500' },
  { period: 'P3', time: '09:40 - 10:20', subject: 'English', class: 'Class 6-A', teacher: 'Ms. Pooja Sharma', color: 'bg-green-500' },
  { period: 'P4', time: '10:40 - 11:20', subject: 'Social Science', class: 'Class 9-B', teacher: 'Mr. Amit Kumar', color: 'bg-pink-500' },
  { period: 'P5', time: '11:30 - 12:10', subject: 'Computer', class: 'Class 7-A', teacher: 'Ms. Kavita Gupta', color: 'bg-blue-400' },
];

const completionByDeptData = [
  { name: 'Science', value: 92 },
  { name: 'Maths', value: 88 },
  { name: 'English', value: 85 },
  { name: 'Social Sc.', value: 83 },
  { name: 'Commerce', value: 80 },
  { name: 'Others', value: 78 },
];

const lessonPlanData = [
  { name: 'Completed', value: 2142, color: '#10b981' },
  { name: 'In Progress', value: 268, color: '#f59e0b' },
  { name: 'Pending', value: 76, color: '#ec4899' },
];

const activitiesData = [
  { title: 'Unit Test - Science (Class 8-10)', date: '20 May 2025', icon: <FileText size={12} />, color: 'bg-blue-500' },
  { title: 'Project Submission', date: '22 May 2025', icon: <Trophy size={12} />, color: 'bg-amber-500' },
  { title: 'Parent Teacher Meeting', date: '24 May 2025', icon: <Users size={12} />, color: 'bg-teal-500' },
  { title: 'Inter House Debate', date: '28 May 2025', icon: <Award size={12} />, color: 'bg-orange-500' },
  { title: 'Term 1 Exams Start', date: '10 Jun 2025', icon: <CheckSquare size={12} />, color: 'bg-green-500' },
];

const syllabusProgress = [
  { className: 'Class 6', percent: 78, color: 'bg-blue-500' },
  { className: 'Class 7', percent: 82, color: 'bg-teal-500' },
  { className: 'Class 8', percent: 80, color: 'bg-indigo-500' },
  { className: 'Class 9', percent: 76, color: 'bg-amber-500' },
  { className: 'Class 10', percent: 79, color: 'bg-blue-600' },
  { className: 'Class 11', percent: 84, color: 'bg-purple-500' },
  { className: 'Class 12', percent: 81, color: 'bg-blue-500' },
];

const subjectPerformance = [
  { name: 'Jan', Math: 60, Science: 65, English: 70, Social: 55 },
  { name: 'Feb', Math: 65, Science: 70, English: 75, Social: 60 },
  { name: 'Mar', Math: 70, Science: 80, English: 78, Social: 62 },
  { name: 'Apr', Math: 68, Science: 75, English: 72, Social: 58 },
  { name: 'May', Math: 80, Science: 85, English: 82, Social: 70 },
];

const teacherWorkload = [
  { name: 'Full Load', value: 210, color: '#3b82f6', percent: '64%' },
  { name: 'Medium Load', value: 78, color: '#f59e0b', percent: '24%' },
  { name: 'Low Load', value: 38, color: '#8b5cf6', percent: '12%' },
];

const studentPerformanceTrend = [
  { name: 'Class 6', value: 84 },
  { name: 'Class 7', value: 83 },
  { name: 'Class 8', value: 82 },
  { name: 'Class 9', value: 81 },
  { name: 'Class 10', value: 83 },
];

export function AcademicManagementCRM() {
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [term, setTerm] = useState('Term 1');
  const [loading, setLoading] = useState(false);

  // Simulate data fetching on filter change
  const handleFilterChange = (setter: React.Dispatch<React.SetStateAction<string>>, value: string) => {
    setter(value);
    setLoading(true);
    setTimeout(() => setLoading(false), 400); // Simulate network delay
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
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Academic Management CRM</h2>
          <p className="text-xs text-slate-500 mt-0.5">Plan • Teach • Assess • Improve</p>
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
            <span className="text-slate-500 font-medium">Term</span>
            <select 
              value={term}
              onChange={(e) => handleFilterChange(setTerm, e.target.value)}
              className="font-bold text-slate-800 focus:outline-none bg-transparent"
            >
              <option>Term 1</option>
              <option>Term 2</option>
            </select>
          </div>
          <button className="bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold text-xs px-4 py-2 rounded flex items-center gap-2 shadow-sm transition-colors ml-2">
            <PlusCircle size={14} />
            <span>Plan New Activity</span>
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map((kpi, i) => (
          <div key={i} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-10 h-10 rounded-full ${kpi.color} text-white flex items-center justify-center shadow-sm shrink-0`}>
                {kpi.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-bold text-slate-900 truncate leading-tight">{kpi.value}</p>
                <p className="text-[10px] text-slate-500 font-bold truncate">{kpi.title}</p>
              </div>
            </div>
            {kpi.subtitle && (
              <div className="text-[9px] text-slate-500">
                {kpi.subtitle}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* First Row Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Calendar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-3 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Academic Calendar</h3>
          <div className="flex items-center justify-between mb-2">
            <button className="text-slate-400 hover:text-slate-600"><ChevronLeft size={16} /></button>
            <span className="text-xs font-bold text-slate-800">May 2025</span>
            <button className="text-slate-400 hover:text-slate-600"><ChevronRight size={16} /></button>
          </div>
          <div className="grid grid-cols-7 text-center text-[10px] font-medium text-slate-500 mb-1">
            <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
          </div>
          <div className="grid grid-cols-7 text-center text-[10px] gap-y-1">
            <div className="py-1 text-transparent">27</div>
            <div className="py-1 text-transparent">28</div>
            <div className="py-1 text-transparent">29</div>
            <div className="py-1 text-transparent">30</div>
            <div className="py-1 text-slate-800">1</div>
            <div className="py-1 text-slate-800">2</div>
            <div className="py-1 text-slate-800">3</div>
            
            <div className="py-1 text-slate-800">4</div>
            <div className="py-1 text-slate-800">5</div>
            <div className="py-1 text-slate-800">6</div>
            <div className="py-1 text-slate-800">7</div>
            <div className="py-1 text-slate-800">8</div>
            <div className="py-1 text-slate-800">9</div>
            <div className="py-1 text-slate-800">10</div>

            <div className="py-1 text-slate-800">11</div>
            <div className="py-1 text-slate-800">12</div>
            <div className="py-1 text-slate-800">13</div>
            <div className="py-1 text-slate-800">14</div>
            <div className="py-1 text-slate-800">15</div>
            <div className="py-1 text-slate-800 font-bold bg-blue-50 text-blue-600 rounded-full w-6 h-6 mx-auto flex items-center justify-center">16</div>
            <div className="py-1 text-slate-800 font-bold bg-amber-400 text-slate-900 rounded-full w-6 h-6 mx-auto flex items-center justify-center">17</div>

            <div className="py-1 text-slate-800">18</div>
            <div className="py-1 text-purple-600 font-bold">19</div>
            <div className="py-1 text-slate-800">20</div>
            <div className="py-1 text-slate-800">21</div>
            <div className="py-1 text-slate-800">22</div>
            <div className="py-1 text-green-600 font-bold">23</div>
            <div className="py-1 text-slate-800">24</div>

            <div className="py-1 text-red-500 font-bold">26</div>
            <div className="py-1 text-red-500 font-bold">26</div>
            <div className="py-1 text-slate-800">27</div>
            <div className="py-1 text-slate-800">28</div>
            <div className="py-1 text-slate-800">29</div>
            <div className="py-1 text-slate-800">30</div>
            <div className="py-1 text-slate-800">31</div>
          </div>
        </div>

        {/* Schedule */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-4 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[11px] font-bold text-slate-800">Today's Academic Schedule - 17 May 2025</h3>
            <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View Full Timetable</a>
          </div>
          <div className="flex-1 space-y-2">
            {scheduleData.map((item, i) => (
              <div key={i} className="flex items-center gap-3 bg-slate-50 rounded-lg p-2 border border-slate-100">
                <div className={`w-6 h-6 rounded ${item.color} text-white flex items-center justify-center text-[10px] font-bold shrink-0`}>
                  {item.period}
                </div>
                <div className="w-20 text-[9px] text-slate-500 shrink-0">{item.time}</div>
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-slate-800">{item.subject}</p>
                  <p className="text-[9px] text-slate-500">{item.class}</p>
                </div>
                <div className="w-24 text-[9px] text-slate-600 text-right">{item.teacher}</div>
              </div>
            ))}
          </div>
          <button className="w-full max-w-[200px] mx-auto mt-3 bg-amber-400 text-slate-900 text-[10px] font-bold py-2 rounded hover:bg-amber-500 transition-colors">
            View Full Timetable
          </button>
        </div>

        {/* Lesson Plan Completion */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-3 flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-[11px] font-bold text-slate-800">Lesson Plan Completion</h3>
            <select className="text-[9px] border border-slate-200 rounded text-slate-500 focus:outline-none">
              <option>This Month</option>
            </select>
          </div>
          
          <div className="flex items-center mb-2">
            <div className="w-20 h-20 relative shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={lessonPlanData} cx="50%" cy="50%" innerRadius={25} outerRadius={35} paddingAngle={2} dataKey="value" stroke="none">
                    {lessonPlanData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[11px] font-bold text-slate-800">86%</span>
                <span className="text-[7px] text-slate-500">Completed</span>
              </div>
            </div>
            <div className="flex-1 ml-3 flex flex-col gap-1 text-[9px]">
              {lessonPlanData.map((item, i) => (
                <div key={i} className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                    <span className="text-slate-600">{item.name}</span>
                  </div>
                  <span className="font-bold text-slate-800">{item.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[9px] font-bold text-slate-700 mt-2 mb-1">Completion by Department</p>
          <div className="h-20 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={completionByDeptData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 7, fill: '#64748b' }} interval={0} />
                <YAxis hide />
                <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                  {completionByDeptData.map((entry, index) => {
                    const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#6366f1'];
                    return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Key Activities */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-2 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[11px] font-bold text-slate-800">Key Academic Activities</h3>
            <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View All</a>
          </div>
          <div className="flex-1 space-y-3">
            {activitiesData.map((act, i) => (
              <div key={i} className="flex gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white ${act.color} shrink-0`}>
                  {act.icon}
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-800 leading-tight">{act.title}</p>
                  <p className="text-[9px] text-slate-500">{act.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Second Row Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Syllabus Progress */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-3 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[11px] font-bold text-slate-800">Syllabus & Curriculum Progress</h3>
            <select className="text-[9px] border border-slate-200 rounded text-slate-500 focus:outline-none">
              <option>This Term</option>
            </select>
          </div>
          <div className="space-y-3 flex-1 flex flex-col justify-center">
            {syllabusProgress.map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-[9px]">
                <span className="w-12 text-slate-600">{item.className}</span>
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.percent}%` }}></div>
                </div>
                <span className="w-6 text-right font-bold text-slate-700">{item.percent}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Subject Performance */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-4 flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-[11px] font-bold text-slate-800">Subject Performance Overview</h3>
            <select className="text-[9px] border border-slate-200 rounded text-slate-500 focus:outline-none">
              <option>This Term</option>
            </select>
          </div>
          <div className="flex-1 w-full h-32 relative">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={subjectPerformance} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b' }} dy={5} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b' }} tickFormatter={(val) => `${val}%`} />
                <RechartsTooltip contentStyle={{ fontSize: '9px', borderRadius: '8px', padding: '4px' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '9px', top: -10 }} />
                <Line type="monotone" dataKey="Math" name="Mathematics" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2 }} />
                <Line type="monotone" dataKey="Science" name="Science" stroke="#10b981" strokeWidth={2} dot={{ r: 2 }} />
                <Line type="monotone" dataKey="English" name="English" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2 }} />
                <Line type="monotone" dataKey="Social" name="Social Science" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
            <div className="absolute top-8 right-4 bg-[#0a1930] text-white text-[8px] font-bold px-1.5 py-0.5 rounded">
              Avg. 84%
            </div>
          </div>
        </div>

        {/* Teacher Workload */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-3 flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-[11px] font-bold text-slate-800">Teacher Workload</h3>
            <select className="text-[9px] border border-slate-200 rounded text-slate-500 focus:outline-none">
              <option>This Week</option>
            </select>
          </div>
          <div className="flex items-center flex-1">
            <div className="w-24 h-24 relative shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={teacherWorkload} cx="50%" cy="50%" innerRadius={30} outerRadius={42} paddingAngle={2} dataKey="value" stroke="none">
                    {teacherWorkload.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[8px] text-slate-500">Total</span>
                <span className="text-[14px] font-bold text-slate-800 leading-none">326</span>
                <span className="text-[8px] text-slate-500">Teachers</span>
              </div>
            </div>
            <div className="flex-1 ml-3 flex flex-col gap-2 text-[9px]">
              {teacherWorkload.map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                    <span className="text-slate-600">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-800 mr-1">{item.value}</span>
                    <span className="text-slate-400">({item.percent})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Homework */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-2 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[11px] font-bold text-slate-800">Homework & Assignments</h3>
            <select className="text-[9px] border border-slate-200 rounded text-slate-500 focus:outline-none">
              <option>This Month</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-3 flex-1">
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-2 flex flex-col justify-center">
              <div className="flex items-center gap-1 text-blue-600 mb-1">
                <CheckSquare size={10} />
                <span className="text-[8px] font-bold">Assigned</span>
              </div>
              <span className="text-sm font-bold text-slate-800">1,285</span>
            </div>
            <div className="bg-green-50 border border-green-100 rounded-lg p-2 flex flex-col justify-center">
              <div className="flex items-center gap-1 text-green-600 mb-1">
                <CheckSquare size={10} />
                <span className="text-[8px] font-bold">Submitted</span>
              </div>
              <span className="text-sm font-bold text-slate-800">1,142</span>
              <span className="text-[7px] text-slate-500">(88.8%)</span>
            </div>
            <div className="bg-orange-50 border border-orange-100 rounded-lg p-2 flex flex-col justify-center">
              <div className="flex items-center gap-1 text-orange-600 mb-1">
                <CheckSquare size={10} />
                <span className="text-[8px] font-bold">Pending</span>
              </div>
              <span className="text-sm font-bold text-slate-800">143</span>
              <span className="text-[7px] text-slate-500">(11.2%)</span>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-lg p-2 flex flex-col justify-center">
              <div className="flex items-center gap-1 text-red-600 mb-1">
                <CheckSquare size={10} />
                <span className="text-[8px] font-bold">Overdue</span>
              </div>
              <span className="text-sm font-bold text-slate-800">52</span>
              <span className="text-[7px] text-slate-500">(4.0%)</span>
            </div>
          </div>
          <button className="w-full bg-[#0a1930] text-white text-[10px] font-bold py-1.5 rounded hover:bg-slate-800 transition-colors">
            View Homework Details
          </button>
        </div>

      </div>

      {/* Third Row Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* CCE */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-5 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[11px] font-bold text-slate-800">Continuous & Comprehensive Evaluation (CCE)</h3>
            <select className="text-[9px] border border-slate-200 rounded text-slate-500 focus:outline-none">
              <option>This Term</option>
            </select>
          </div>
          
          <div className="grid grid-cols-4 gap-2 mb-4">
            <div className="bg-slate-50 rounded border border-slate-100 p-2 flex flex-col items-center justify-center text-center">
              <div className="text-blue-500 mb-1 bg-blue-100 p-1 rounded-sm"><FileText size={12}/></div>
              <p className="text-[8px] font-bold text-slate-600">Unit Tests</p>
              <p className="text-sm font-bold text-slate-900">48</p>
              <p className="text-[7px] text-slate-400">Conducted</p>
            </div>
            <div className="bg-slate-50 rounded border border-slate-100 p-2 flex flex-col items-center justify-center text-center">
              <div className="text-green-500 mb-1 bg-green-100 p-1 rounded-sm"><CheckSquare size={12}/></div>
              <p className="text-[8px] font-bold text-slate-600">Assignments</p>
              <p className="text-sm font-bold text-slate-900">126</p>
              <p className="text-[7px] text-slate-400">Evaluated</p>
            </div>
            <div className="bg-slate-50 rounded border border-slate-100 p-2 flex flex-col items-center justify-center text-center">
              <div className="text-indigo-500 mb-1 bg-indigo-100 p-1 rounded-sm"><LayoutGrid size={12}/></div>
              <p className="text-[8px] font-bold text-slate-600">Projects</p>
              <p className="text-sm font-bold text-slate-900">36</p>
              <p className="text-[7px] text-slate-400">Submitted</p>
            </div>
            <div className="bg-slate-50 rounded border border-slate-100 p-2 flex flex-col items-center justify-center text-center">
              <div className="text-amber-500 mb-1 bg-amber-100 p-1 rounded-sm"><Award size={12}/></div>
              <p className="text-[8px] font-bold text-slate-600">Activities</p>
              <p className="text-sm font-bold text-slate-900">72</p>
              <p className="text-[7px] text-slate-400">Conducted</p>
            </div>
          </div>

          <p className="text-[9px] font-bold text-slate-700 mb-2">Student Performance Trend</p>
          <div className="h-28 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={studentPerformanceTrend} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b' }} dy={5} />
                <YAxis hide domain={[0, 100]} />
                <Bar dataKey="value" radius={[2, 2, 0, 0]} barSize={24}>
                  {studentPerformanceTrend.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#10b981', '#3b82f6', '#8b5cf6', '#3b82f6', '#3b82f6'][index]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="absolute top-[30%] left-0 w-full border-t-2 border-dashed border-amber-400 opacity-70"></div>
            <div className="absolute top-[30%] right-[30%] transform -translate-y-1/2 bg-amber-50 text-amber-600 font-bold text-[8px] px-1 py-0.5 rounded border border-amber-200">
              Overall Avg. 82.6%
            </div>
            {/* Adding % labels manually over bars */}
            <div className="absolute top-[25%] left-0 w-full flex justify-around px-4 pointer-events-none text-[8px] font-bold text-slate-700">
               <span className="w-[10%] text-center">84%</span>
               <span className="w-[10%] text-center ml-2">83%</span>
               <span className="w-[10%] text-center ml-1">82%</span>
               <span className="w-[10%] text-center ml-1">81%</span>
               <span className="w-[10%] text-center ml-1">83%</span>
            </div>
          </div>
        </div>

        {/* Co-Scholastic */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-2 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[11px] font-bold text-slate-800">Co-Scholastic Activities</h3>
            <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View All</a>
          </div>
          <div className="flex-1 space-y-3">
            {[
              { title: 'Sports Practice', date: '18 May 2025', icon: '🏃', color: 'bg-amber-100 text-amber-600' },
              { title: 'Art Competition', date: '21 May 2025', icon: '🎨', color: 'bg-purple-100 text-purple-600' },
              { title: 'Science Exhibition', date: '25 May 2025', icon: '🔬', color: 'bg-green-100 text-green-600' },
              { title: 'Music Festival', date: '30 May 2025', icon: '🎵', color: 'bg-orange-100 text-orange-600' },
              { title: 'Quiz Competition', date: '02 Jun 2025', icon: '🧠', color: 'bg-indigo-100 text-indigo-600' },
            ].map((act, i) => (
              <div key={i} className="flex justify-between items-center p-1.5 rounded hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded flex items-center justify-center text-[12px] ${act.color}`}>
                    {act.icon}
                  </div>
                  <span className="text-[9px] font-bold text-slate-700">{act.title}</span>
                </div>
                <span className="text-[8px] text-slate-500">{act.date}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Academic Reports */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-2 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Academic Reports</h3>
          <div className="flex-1 space-y-2">
            {[
              'Class-wise Progress Report',
              'Subject Analysis Report',
              'Teacher Performance Report',
              'Syllabus Coverage Report',
              'Student Learning Outcomes',
              'Custom Academic Report',
            ].map((report, i) => (
              <div key={i} className="flex justify-between items-center bg-slate-50 border border-slate-100 p-2 rounded text-[9px] text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-100 cursor-pointer transition-colors group">
                <div className="flex items-center gap-2">
                  <FileText size={12} className="text-slate-400 group-hover:text-blue-500" />
                  <span>{report}</span>
                </div>
                <Download size={12} className="text-slate-400 hover:text-blue-600" />
              </div>
            ))}
          </div>
          <button className="w-full bg-[#0a1930] text-white text-[10px] font-bold py-1.5 rounded hover:bg-slate-800 transition-colors mt-3">
            Generate New Report
          </button>
        </div>

        {/* Smart Insights */}
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 shadow-sm lg:col-span-3 flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-blue-600">
            <BrainCircuit size={80} />
          </div>
          <h3 className="text-[11px] font-bold text-slate-800 mb-3 flex items-center gap-2 relative z-10">
            <span className="bg-blue-600 text-white p-1 rounded"><BrainCircuit size={14} /></span>
            Smart Insights (AI)
          </h3>
          <div className="space-y-3 flex-1 relative z-10">
            <div className="flex items-start gap-2">
              <div className="w-4 h-4 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0 mt-0.5">
                <CheckSquare size={10} />
              </div>
              <p className="text-[9px] text-slate-700 leading-snug">Class 8 needs extra focus in Mathematics (avg 72%)</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-4 h-4 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0 mt-0.5">
                <CheckSquare size={10} />
              </div>
              <p className="text-[9px] text-slate-700 leading-snug">Science engagement improved by 12% this month</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-4 h-4 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0 mt-0.5">
                <CheckSquare size={10} />
              </div>
              <p className="text-[9px] text-slate-700 leading-snug">Homework submission rate up by 8%</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-4 h-4 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0 mt-0.5">
                <CheckSquare size={10} />
              </div>
              <p className="text-[9px] text-slate-700 leading-snug">Plan remedial classes for Class 9 Math next week</p>
            </div>
          </div>
          <button className="w-full bg-[#0a1930] text-white text-[10px] font-bold py-1.5 rounded hover:bg-slate-800 transition-colors mt-3 relative z-10">
            View AI Recommendations
          </button>
        </div>

      </div>
    </div>
  );
}
