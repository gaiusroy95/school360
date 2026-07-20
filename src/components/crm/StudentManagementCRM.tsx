import { useState } from 'react';
import { Search, Filter, Phone, Mail, User, PhoneCall, Calendar as CalendarIcon, Download, List, Clock, CheckCircle, PlusCircle, MoreVertical, Upload, Eye, FileText, ChevronDown, Edit, Briefcase, Droplets, MapPin, Grid, BarChart3, Users, Settings } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip } from 'recharts';
import { AddNewStudentView } from './StudentManagement/AddNewStudentView';
import { StudentProfilesView } from './StudentManagement/StudentProfilesView';
import { SubModuleView } from './shared/SubModuleView';

const kpis = [
  { title: 'Total Students', value: '5,248', trend: '▲ 8.5%', trendText: 'from last month', color: 'bg-indigo-600', icon: <Users size={20} /> },
  { title: 'Active Students', value: '5,102', subtitle: '97.2% of total', color: 'bg-blue-500', icon: <User size={20} /> },
  { title: 'New Admissions', value: '842', trend: '▲ 14.3%', trendText: 'from last year', badge: '(This Year)', color: 'bg-green-500', icon: <User size={20} /> },
  { title: 'Male Students', value: '2,732', subtitle: '52.1% of total', color: 'bg-orange-500', icon: <User size={20} /> },
  { title: 'Female Students', value: '2,516', subtitle: '47.9% of total', color: 'bg-pink-500', icon: <User size={20} /> },
  { title: 'Average Attendance', value: '92.6%', trend: '▲ 3.4%', trendText: 'from last month', color: 'bg-yellow-500', icon: <CalendarIcon size={20} /> },
];

const studentsData = [
  { id: 'ADM2025001256', name: 'Aarav Sharma', class: 'Class 6 - A', rollNo: '01', dob: '12/04/2013', mobile: '98765 43210', status: 'Active', gender: 'Male', email: 'aarav.sharma@example.com', address: '123, Green Park, Jaipur, Rajasthan', bloodGroup: 'B+', father: 'Rajesh Sharma (98765 43211)', mother: 'Neha Sharma (98765 43212)' },
  { id: 'ADM2025001257', name: 'Myra Singh', class: 'Class 6 - B', rollNo: '15', dob: '23/05/2013', mobile: '91234 56789', status: 'Active', gender: 'Female', email: 'myra.singh@example.com', address: '45, Civil Lines, Jaipur, Rajasthan', bloodGroup: 'O+', father: 'Vikram Singh (91234 56780)', mother: 'Priya Singh (91234 56781)' },
  { id: 'ADM2025001258', name: 'Vihaan Patel', class: 'Class 7 - A', rollNo: '07', dob: '10/02/2012', mobile: '99887 76655', status: 'Active', gender: 'Male', email: 'vihaan.p@example.com', address: '8, Shyam Nagar, Jaipur', bloodGroup: 'A+', father: 'Sunil Patel (99887 76650)', mother: 'Meera Patel (99887 76651)' },
  { id: 'ADM2025001259', name: 'Ananya Gupta', class: 'Class 7 - B', rollNo: '12', dob: '18/08/2012', mobile: '87654 32109', status: 'Active', gender: 'Female', email: 'ananya.g@example.com', address: '22, Malviya Nagar, Jaipur', bloodGroup: 'AB+', father: 'Sanjay Gupta (87654 32100)', mother: 'Ritu Gupta (87654 32101)' },
  { id: 'ADM2025001260', name: 'Rudra Mehra', class: 'Class 8 - A', rollNo: '05', dob: '30/11/2011', mobile: '90909 09090', status: 'Inactive', gender: 'Male', email: 'rudra.m@example.com', address: '15, Vaishali Nagar, Jaipur', bloodGroup: 'B-', father: 'Amit Mehra (90909 09091)', mother: 'Sonia Mehra (90909 09092)' },
  { id: 'ADM2025001261', name: 'Diya Sharma', class: 'Class 8 - B', rollNo: '21', dob: '01/09/2011', mobile: '98765 67890', status: 'Active', gender: 'Female', email: 'diya.s@example.com', address: '10, C-Scheme, Jaipur', bloodGroup: 'O-', father: 'Anil Sharma (98765 67891)', mother: 'Kiran Sharma (98765 67892)' },
  { id: 'ADM2025001262', name: 'Kabir Joshi', class: 'Class 9 - A', rollNo: '03', dob: '14/07/2010', mobile: '91234 67890', status: 'Active', gender: 'Male', email: 'kabir.j@example.com', address: '33, Raja Park, Jaipur', bloodGroup: 'A-', father: 'Rakesh Joshi (91234 67891)', mother: 'Sunita Joshi (91234 67892)' },
  { id: 'ADM2025001263', name: 'Sara Khan', class: 'Class 9 - B', rollNo: '18', dob: '09/03/2010', mobile: '90000 11122', status: 'Active', gender: 'Female', email: 'sara.k@example.com', address: '5, Tonk Road, Jaipur', bloodGroup: 'AB-', father: 'Imran Khan (90000 11123)', mother: 'Zoya Khan (90000 11124)' },
];

const classStats = [
  { name: 'Class 6', value: 1250, percent: '23.8%', color: '#3b82f6' },
  { name: 'Class 7', value: 1180, percent: '22.5%', color: '#8b5cf6' },
  { name: 'Class 8', value: 1160, percent: '22.1%', color: '#eab308' },
  { name: 'Class 9', value: 920, percent: '17.5%', color: '#10b981' },
  { name: 'Class 10', value: 738, percent: '14.1%', color: '#ec4899' },
];

const genderStats = [
  { name: 'Male', value: 2732, percent: '52.1%', color: '#3b82f6' },
  { name: 'Female', value: 2516, percent: '47.9%', color: '#ec4899' },
];

const topPerformers = [
  { rank: 1, name: 'Myra Singh', class: 'Class 6 - B', percentage: '96.8%' },
  { rank: 2, name: 'Aarav Sharma', class: 'Class 6 - A', percentage: '95.4%' },
  { rank: 3, name: 'Vihaan Patel', class: 'Class 7 - A', percentage: '94.7%' },
];

const documents = [
  { name: 'Aadhaar Card', count: '5,120 / 5,248', icon: <FileText size={16} /> },
  { name: 'Birth Certificate', count: '5,010 / 5,248', icon: <FileText size={16} /> },
  { name: 'Transfer Certificate', count: '4,980 / 5,248', icon: <FileText size={16} /> },
  { name: 'Passport Photo', count: '5,200 / 5,248', icon: <User size={16} /> },
  { name: 'Medical Record', count: '4,850 / 5,248', icon: <CheckCircle size={16} /> },
  { name: 'Other Documents', count: '4,720 / 5,248', icon: <MoreVertical size={16} /> },
];

export function StudentManagementCRM({ currentView = 'Students List' }: { currentView?: string }) {
  const [activeTab, setActiveTab] = useState('All Students (5,248)');
  const [selectedStudent, setSelectedStudent] = useState(studentsData[0]);

  if (currentView === 'Add New Student') {
    return <AddNewStudentView />;
  }
  if (currentView === 'Student Profiles') {
    return <StudentProfilesView />;
  }
  if (currentView && currentView !== 'Students List') {
    return <SubModuleView module="Student Management" title={currentView} />;
  }

  const filteredStudents = studentsData.filter(student => {
    if (activeTab.startsWith('All')) return true;
    if (activeTab.startsWith('Active')) return student.status === 'Active';
    if (activeTab.startsWith('Inactive')) return student.status === 'Inactive';
    if (activeTab.startsWith('Passout')) return student.status === 'Passout';
    if (activeTab.startsWith('Transferred')) return student.status === 'Transferred';
    return true;
  });

  return (
    <div className="flex flex-col space-y-4 h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Student Management CRM</h2>
          <p className="text-xs text-slate-500 mt-0.5">Manage student information, academic records and overall student lifecycle</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="bg-white border border-slate-200 text-slate-700 font-medium text-xs px-3 py-2 rounded flex items-center gap-2 shadow-sm hover:bg-slate-50 transition-colors">
            <Download size={14} />
            <span>Import Students</span>
          </button>
          <button className="bg-white border border-slate-200 text-slate-700 font-medium text-xs px-3 py-2 rounded flex items-center gap-2 shadow-sm hover:bg-slate-50 transition-colors">
            <span>Bulk Actions</span>
            <ChevronDown size={14} />
          </button>
          <button className="bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold text-xs px-4 py-2 rounded flex items-center gap-2 shadow-sm transition-colors">
            <PlusCircle size={14} />
            <span>Add New Student</span>
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
                <div className="flex items-center gap-1">
                  <p className="text-[10px] text-slate-500 font-bold truncate">{kpi.title}</p>
                  {kpi.badge && <span className="text-[8px] text-slate-400">{kpi.badge}</span>}
                </div>
                <p className="text-lg font-bold text-slate-900 truncate">{kpi.value}</p>
              </div>
            </div>
            {kpi.trend && (
              <div className="text-[9px] font-bold text-green-500">
                {kpi.trend} <span className="text-slate-400 font-normal">{kpi.trendText}</span>
              </div>
            )}
            {kpi.subtitle && (
              <div className="text-[9px] text-slate-500">
                {kpi.subtitle}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 items-start">
        
        {/* Left Column */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-3">Filter Students</h3>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1">Academic Year</label>
                <select className="w-full text-xs border border-slate-200 rounded p-1.5 focus:outline-none focus:border-amber-400">
                  <option>2025-26</option>
                  <option>2024-25</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1">Class / Grade</label>
                <select className="w-full text-xs border border-slate-200 rounded p-1.5 focus:outline-none focus:border-amber-400">
                  <option>All Classes</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1">Section</label>
                <select className="w-full text-xs border border-slate-200 rounded p-1.5 focus:outline-none focus:border-amber-400">
                  <option>All Sections</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1">House</label>
                <select className="w-full text-xs border border-slate-200 rounded p-1.5 focus:outline-none focus:border-amber-400">
                  <option>All Houses</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1">Gender</label>
                <select className="w-full text-xs border border-slate-200 rounded p-1.5 focus:outline-none focus:border-amber-400">
                  <option>All</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1">Status</label>
                <select className="w-full text-xs border border-slate-200 rounded p-1.5 focus:outline-none focus:border-amber-400">
                  <option>Active</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1">Category</label>
                <select className="w-full text-xs border border-slate-200 rounded p-1.5 focus:outline-none focus:border-amber-400">
                  <option>All Categories</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1">Search</label>
                <input type="text" placeholder="Search by name, roll no..." className="w-full text-xs border border-slate-200 rounded p-1.5 focus:outline-none focus:border-amber-400" />
              </div>
              <button className="w-full bg-[#0a1930] text-white text-xs font-bold py-2 rounded mt-2 hover:bg-slate-800 transition-colors">
                Apply Filters
              </button>
              <button className="w-full text-blue-600 text-xs text-center hover:underline mt-1">
                Reset Filters
              </button>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-3">Quick Links</h3>
            <div className="flex flex-col gap-1 text-[11px]">
              {[
                { label: 'Add New Student', icon: <PlusCircle size={14} /> },
                { label: 'Bulk Import Students', icon: <Upload size={14} /> },
                { label: 'Student Categories', icon: <List size={14} /> },
                { label: 'Generate ID Cards', icon: <User size={14} /> },
                { label: 'Export Student Data', icon: <Download size={14} /> },
                { label: 'Student Reports', icon: <FileText size={14} /> },
                { label: 'Student Analytics', icon: <BarChart3 size={14} /> },
              ].map((link, i) => (
                <button key={i} className="flex items-center gap-2 p-1.5 hover:bg-slate-50 text-slate-600 hover:text-slate-900 rounded text-left transition-colors">
                  {link.icon} <span>{link.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Center Workspace */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-3 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">Students List</h3>
              <div className="flex items-center gap-2 text-slate-400">
                <button className="p-1 bg-slate-100 text-slate-800 rounded"><List size={14}/></button>
                <button className="p-1 hover:bg-slate-100 rounded text-slate-600"><Grid size={14}/></button>
                <button className="p-1 hover:bg-slate-100 rounded text-slate-600"><Download size={14}/></button>
              </div>
            </div>
            <div className="flex border-b border-slate-200 px-3 overflow-x-auto custom-scrollbar text-[11px] font-medium text-slate-500">
              {['All Students (5,248)', 'Active (5,102)', 'Inactive (146)', 'Passout (245)', 'Transferred (122)'].map((tab) => (
                <button 
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-2 whitespace-nowrap border-b-2 transition-colors ${activeTab === tab ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent hover:text-slate-700'}`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px] text-[10px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold tracking-wide">
                    <th className="p-3 w-8"><input type="checkbox" className="rounded border-slate-300" /></th>
                    <th className="p-3">Photo</th>
                    <th className="p-3">Admission No.</th>
                    <th className="p-3">Name</th>
                    <th className="p-3">Class - Section</th>
                    <th className="p-3">Roll No.</th>
                    <th className="p-3">Date of Birth</th>
                    <th className="p-3">Mobile</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.map((student, i) => (
                    <tr 
                      key={i} 
                      className={`hover:bg-slate-50 transition-colors cursor-pointer ${selectedStudent.id === student.id ? 'bg-blue-50/50' : ''}`}
                      onClick={() => setSelectedStudent(student)}
                    >
                      <td className="p-3" onClick={(e) => e.stopPropagation()}><input type="checkbox" className="rounded border-slate-300" /></td>
                      <td className="p-3">
                        <div className="w-6 h-6 bg-slate-200 rounded-full overflow-hidden flex items-center justify-center">
                          <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${student.name}`} alt={student.name} />
                        </div>
                      </td>
                      <td className="p-3 text-slate-600">{student.id}</td>
                      <td className="p-3 font-semibold text-slate-800">{student.name}</td>
                      <td className="p-3 text-slate-600">{student.class}</td>
                      <td className="p-3 text-slate-600">{student.rollNo}</td>
                      <td className="p-3 text-slate-600">{student.dob}</td>
                      <td className="p-3 text-slate-600">{student.mobile}</td>
                      <td className="p-3">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border
                          ${student.status === 'Active' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100' }
                        `}>
                          {student.status}
                        </span>
                      </td>
                      <td className="p-3 text-slate-400 flex justify-center gap-1.5">
                        <Eye size={14} className="hover:text-blue-500 cursor-pointer" />
                        <span className="cursor-pointer hover:text-slate-600">✏️</span>
                        <MoreVertical size={14} className="hover:text-slate-600 cursor-pointer" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
              <span>Showing 1 to 8 of 5,248 entries</span>
              <div className="flex gap-1">
                <button className="px-2 py-1 border border-slate-200 rounded hover:bg-slate-50">&lt;</button>
                <button className="px-2 py-1 bg-[#0a1930] text-white rounded">1</button>
                <button className="px-2 py-1 border border-slate-200 rounded hover:bg-slate-50">2</button>
                <button className="px-2 py-1 border border-slate-200 rounded hover:bg-slate-50">3</button>
                <span className="px-1 py-1">...</span>
                <button className="px-2 py-1 border border-slate-200 rounded hover:bg-slate-50">656</button>
                <button className="px-2 py-1 border border-slate-200 rounded hover:bg-slate-50">&gt;</button>
              </div>
            </div>
          </div>

          {/* Analytics Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-[11px] font-bold text-slate-800">Student Statistics</h3>
                <select className="text-[9px] border border-slate-200 rounded text-slate-500 focus:outline-none">
                  <option>This Year</option>
                </select>
              </div>
              <div className="flex items-center flex-1">
                <div className="w-20 h-20 relative shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={classStats} cx="50%" cy="50%" innerRadius={22} outerRadius={35} paddingAngle={2} dataKey="value" stroke="none">
                        {classStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[8px] text-slate-500">Total</span>
                    <span className="text-[10px] font-bold">5,248</span>
                  </div>
                </div>
                <div className="flex-1 ml-3 flex flex-col gap-1">
                  {classStats.map((item, i) => (
                    <div key={i} className="flex items-center text-[9px]">
                      <div className="w-1.5 h-1.5 rounded-full mr-1.5" style={{ backgroundColor: item.color }}></div>
                      <span className="text-slate-600 flex-1 truncate">{item.name}</span>
                      <span className="font-medium text-slate-800 mr-1">{item.value}</span>
                      <span className="text-slate-400">({item.percent})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-[11px] font-bold text-slate-800">Gender Distribution</h3>
                <select className="text-[9px] border border-slate-200 rounded text-slate-500 focus:outline-none">
                  <option>This Year</option>
                </select>
              </div>
              <div className="flex items-center flex-1">
                <div className="w-20 h-20 relative shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={genderStats} cx="50%" cy="50%" innerRadius={22} outerRadius={35} paddingAngle={2} dataKey="value" stroke="none">
                        {genderStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[8px] text-slate-500">Total</span>
                    <span className="text-[10px] font-bold">5,248</span>
                  </div>
                </div>
                <div className="flex-1 ml-3 flex flex-col justify-center gap-2">
                  {genderStats.map((item, i) => (
                    <div key={i} className="flex items-center text-[9px]">
                      <div className="w-1.5 h-1.5 rounded-full mr-1.5" style={{ backgroundColor: item.color }}></div>
                      <span className="text-slate-600 w-10">{item.name}</span>
                      <span className="font-medium text-slate-800 mr-1">{item.value}</span>
                      <span className="text-slate-400">({item.percent})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-[11px] font-bold text-slate-800">Attendance Overview</h3>
                <select className="text-[9px] border border-slate-200 rounded text-slate-500 focus:outline-none">
                  <option>This Month</option>
                </select>
              </div>
              <div className="flex flex-col items-center justify-center flex-1">
                <div className="w-32 h-16 relative overflow-hidden mb-1">
                  <div className="absolute top-0 left-0 w-32 h-32 rounded-full border-[10px] border-slate-100"></div>
                  <div className="absolute top-0 left-0 w-32 h-32 rounded-full border-[10px] border-green-500 border-b-transparent border-r-transparent transform -rotate-45" style={{ transform: 'rotate(-45deg)' }}></div>
                  <div className="absolute bottom-0 left-0 w-full flex flex-col items-center">
                    <span className="text-lg font-bold text-slate-800 leading-none">92.6%</span>
                    <span className="text-[8px] text-slate-500 mt-0.5">Average Attendance</span>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-4 w-full mt-2 text-[10px]">
                  <div className="text-center">
                    <span className="text-green-500 font-medium block">Present</span>
                    <span className="font-bold">4,860</span>
                  </div>
                  <div className="text-center">
                    <span className="text-red-500 font-medium block">Absent</span>
                    <span className="font-bold">312</span>
                  </div>
                  <div className="text-center">
                    <span className="text-amber-500 font-medium block">On Leave</span>
                    <span className="font-bold">76</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-[11px] font-bold text-slate-800">Document Summary</h3>
                <select className="text-[9px] border border-slate-200 rounded text-slate-500 focus:outline-none">
                  <option>All</option>
                </select>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {documents.map((doc, i) => (
                  <div key={i} className="flex flex-col items-center text-center group">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-1 group-hover:bg-blue-100 transition-colors">
                      {doc.icon}
                    </div>
                    <span className="text-[8px] text-slate-600 font-medium leading-tight h-6 flex items-center justify-center">{doc.name}</span>
                    <span className="text-[8px] font-bold text-slate-800 mt-0.5">{doc.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-[11px] font-bold text-slate-800">Top Performing Students</h3>
                <select className="text-[9px] border border-slate-200 rounded text-slate-500 focus:outline-none">
                  <option>This Term</option>
                </select>
              </div>
              <table className="w-full text-left text-[9px]">
                <thead>
                  <tr className="text-slate-500 font-medium border-b border-slate-100">
                    <th className="pb-1 w-8 text-center">Rank</th>
                    <th className="pb-1">Student Name</th>
                    <th className="pb-1">Class - Section</th>
                    <th className="pb-1 text-right">Percentage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {topPerformers.map((performer, i) => (
                    <tr key={i}>
                      <td className="py-1.5 text-center">
                        <div className={`w-4 h-4 mx-auto rounded-full text-[8px] flex items-center justify-center font-bold text-white
                          ${performer.rank === 1 ? 'bg-amber-400' : performer.rank === 2 ? 'bg-slate-300' : 'bg-amber-600'}
                        `}>
                          {performer.rank}
                        </div>
                      </td>
                      <td className="py-1.5 font-semibold text-slate-800">{performer.name}</td>
                      <td className="py-1.5 text-slate-600">{performer.class}</td>
                      <td className="py-1.5 text-right font-bold text-green-600">{performer.percentage}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="text-center mt-2">
                <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View Full Topper List</a>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          {/* Profile Quick View */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-sm font-bold text-slate-800">Student Profile</h3>
              <a href="#" className="text-[10px] text-blue-600 font-medium hover:underline">View Full Profile</a>
            </div>
            
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 bg-slate-200 rounded-full overflow-hidden shrink-0 shadow-sm">
                <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${selectedStudent.name}`} alt={selectedStudent.name} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-slate-900 text-sm">{selectedStudent.name}</h4>
                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold border ${selectedStudent.status === 'Active' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                    {selectedStudent.status}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">Admission No.: <span className="font-medium text-slate-700">{selectedStudent.id}</span></p>
                <p className="text-[10px] text-slate-500">Roll No.: <span className="font-medium text-slate-700">{selectedStudent.rollNo}</span></p>
              </div>
            </div>

            <div className="space-y-1.5 text-[10px] mb-4 flex-1">
              <div className="grid grid-cols-[80px_1fr] gap-2">
                <span className="text-slate-500">Class - Section:</span>
                <span className="font-medium text-slate-800">{selectedStudent.class}</span>
              </div>
              <div className="grid grid-cols-[80px_1fr] gap-2">
                <span className="text-slate-500">Date of Birth:</span>
                <span className="font-medium text-slate-800">{selectedStudent.dob} (13 Yrs)</span>
              </div>
              <div className="grid grid-cols-[80px_1fr] gap-2">
                <span className="text-slate-500">Gender:</span>
                <span className="font-medium text-slate-800">{selectedStudent.gender}</span>
              </div>
              <div className="grid grid-cols-[80px_1fr] gap-2">
                <span className="text-slate-500">Mobile:</span>
                <span className="font-medium text-slate-800">{selectedStudent.mobile}</span>
              </div>
              <div className="grid grid-cols-[80px_1fr] gap-2">
                <span className="text-slate-500">Email:</span>
                <span className="font-medium text-blue-600 truncate">{selectedStudent.email}</span>
              </div>
              <div className="grid grid-cols-[80px_1fr] gap-2">
                <span className="text-slate-500">Address:</span>
                <span className="font-medium text-slate-800 leading-tight">{selectedStudent.address}</span>
              </div>
              <div className="grid grid-cols-[80px_1fr] gap-2">
                <span className="text-slate-500">Blood Group:</span>
                <span className="font-medium text-red-600">{selectedStudent.bloodGroup}</span>
              </div>
              <div className="grid grid-cols-[80px_1fr] gap-2 mt-2 pt-2 border-t border-slate-100">
                <span className="text-slate-500">Father:</span>
                <span className="font-medium text-slate-800">{selectedStudent.father}</span>
              </div>
              <div className="grid grid-cols-[80px_1fr] gap-2">
                <span className="text-slate-500">Mother:</span>
                <span className="font-medium text-slate-800">{selectedStudent.mother}</span>
              </div>
            </div>

            <div className="grid grid-cols-6 gap-1 pt-3 border-t border-slate-100">
              {[
                { label: 'Edit Profile', icon: <Edit size={12} /> },
                { label: 'Academic', icon: <Briefcase size={12} /> },
                { label: 'Attendance', icon: <CalendarIcon size={12} /> },
                { label: 'Fees', icon: <MoreVertical size={12} /> },
                { label: 'Documents', icon: <FileText size={12} /> },
                { label: 'More', icon: <MoreVertical size={12} /> },
              ].map((action, i) => (
                <div key={i} className="flex flex-col items-center group cursor-pointer">
                  <div className="w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 mb-1 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors border border-slate-200">
                    {action.icon}
                  </div>
                  <span className="text-[8px] text-slate-500 text-center leading-tight">{action.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Student Alerts */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-[11px] font-bold text-slate-800">Student Alerts</h3>
              <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View All</a>
            </div>
            <div className="space-y-3">
              {[
                { icon: '💰', title: 'Fee Due', desc: '2nd Installment is pending', time: '2 days ago', color: 'bg-red-50 text-red-600 border-red-100' },
                { icon: '📅', title: 'Attendance', desc: '3 days absent this month', time: '1 day ago', color: 'bg-amber-50 text-amber-600 border-amber-100' },
                { icon: '📝', title: 'Homework', desc: '2 Assignments pending', time: '2 days ago', color: 'bg-blue-50 text-blue-600 border-blue-100' },
                { icon: '🏥', title: 'Medical Record', desc: 'Annual checkup due', time: '5 days ago', color: 'bg-green-50 text-green-600 border-green-100' },
              ].map((alert, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] shrink-0 border ${alert.color}`}>
                    {alert.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <p className="text-[10px] font-bold text-slate-800">{alert.title}</p>
                      <span className="text-[8px] text-slate-400 whitespace-nowrap">{alert.time}</span>
                    </div>
                    <p className="text-[9px] text-slate-500 truncate">{alert.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activities */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-[11px] font-bold text-slate-800">Recent Activities</h3>
              <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View All</a>
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="relative pl-3 border-l border-slate-200 space-y-4 ml-1">
                {[
                  { title: 'Fees Payment of ₹ 12,500 received', time: '17 May 2025, 10:20 AM', icon: '₹', color: 'bg-green-500' },
                  { title: 'Assignment "Maths Worksheet" submitted', time: '16 May 2025, 09:15 AM', icon: '📝', color: 'bg-blue-500' },
                  { title: 'Attendance marked present', time: '16 May 2025, 08:30 AM', icon: '✓', color: 'bg-slate-400' },
                  { title: 'Library book issued "Science Today"', time: '15 May 2025, 02:45 PM', icon: '📚', color: 'bg-purple-500' },
                ].map((act, i) => (
                  <div key={i} className="relative">
                    <div className={`absolute -left-[17px] top-0 w-3 h-3 rounded-full border-2 border-white ${act.color} flex items-center justify-center`}>
                    </div>
                    <p className="text-[10px] font-medium text-slate-700 leading-tight">{act.title}</p>
                    <p className="text-[8px] text-slate-400 mt-0.5">{act.time}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
