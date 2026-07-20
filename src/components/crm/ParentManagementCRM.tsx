import { useState } from 'react';
import { Search, Filter, Phone, Mail, User, PhoneCall, Calendar as CalendarIcon, Download, List, Clock, CheckCircle, PlusCircle, MoreVertical, ChevronDown, Edit, Briefcase, MapPin, Grid, BarChart3, Users, Settings, MessageSquare, CreditCard, Eye, Bell, Send, History } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, Legend } from 'recharts';

// Dummy data to populate the UI
const kpis = [
  { title: 'Total Parents', value: '4,897', trend: '▲ 8.6%', trendText: 'from last month', color: 'bg-blue-600', icon: <Users size={20} /> },
  { title: 'Active Parents', value: '4,256', subtitle: '86.9% of total', color: 'bg-green-500', icon: <MessageSquare size={20} /> },
  { title: 'New This Year', value: '624', trend: '▲ 12.5%', trendText: 'from last year', color: 'bg-purple-500', icon: <User size={20} /> },
  { title: 'PTM Meetings', value: '1,286', subtitle: 'This Academic Year', color: 'bg-orange-500', icon: <Users size={20} /> },
  { title: 'Messages Sent', value: '12,458', subtitle: 'This Academic Year', color: 'bg-teal-500', icon: <Send size={20} /> },
  { title: 'Satisfaction Score', value: '4.6 / 5', trend: '▲ 0.4', trendText: 'from last month', color: 'bg-yellow-500', icon: <CheckCircle size={20} /> },
];

const parentsData = [
  { id: 'PAR001', name: 'Mr. Rajesh Sharma', students: [{ name: 'Aarav Sharma', class: '6-A' }], relationship: 'Father', mobile: '98765 43210', email: 'rajesh.sharma@gmail.com', status: 'Active', lastComm: '17 May 2025', occupation: 'Business', address: '123, Green Park, Jaipur, Rajasthan', joinedOn: '12 Apr 2023', category: 'VIP Parent' },
  { id: 'PAR002', name: 'Mrs. Neha Sharma', students: [{ name: 'Aarav Sharma', class: '6-A' }], relationship: 'Mother', mobile: '98765 43211', email: 'neha.sharma@gmail.com', status: 'Active', lastComm: '17 May 2025', occupation: 'Teacher', address: '123, Green Park, Jaipur, Rajasthan', joinedOn: '12 Apr 2023', category: 'VIP Parent' },
  { id: 'PAR003', name: 'Mr. Amit Verma', students: [{ name: 'Myra Singh', class: '6-B' }], relationship: 'Father', mobile: '91234 56789', email: 'amit.verma@gmail.com', status: 'Active', lastComm: '16 May 2025', occupation: 'Engineer', address: '45, Civil Lines, Jaipur', joinedOn: '05 Mar 2022', category: 'General' },
  { id: 'PAR004', name: 'Mrs. Pooja Verma', students: [{ name: 'Myra Singh', class: '6-B' }], relationship: 'Mother', mobile: '91234 56780', email: 'pooja.verma@gmail.com', status: 'Active', lastComm: '16 May 2025', occupation: 'Homemaker', address: '45, Civil Lines, Jaipur', joinedOn: '05 Mar 2022', category: 'General' },
  { id: 'PAR005', name: 'Mr. Vihan Patel', students: [{ name: 'Vihaan Patel', class: '7-A' }], relationship: 'Father', mobile: '99887 76655', email: 'vihan.patel@gmail.com', status: 'Active', lastComm: '15 May 2025', occupation: 'Doctor', address: '8, Shyam Nagar, Jaipur', joinedOn: '20 Jun 2024', category: 'PTA Member' },
  { id: 'PAR006', name: 'Mrs. Ananya Patel', students: [{ name: 'Vihaan Patel', class: '7-A' }], relationship: 'Mother', mobile: '99887 76656', email: 'ananya.patel@gmail.com', status: 'Inactive', lastComm: '02 May 2025', occupation: 'Architect', address: '8, Shyam Nagar, Jaipur', joinedOn: '20 Jun 2024', category: 'General' },
  { id: 'PAR007', name: 'Mr. Sanjay Gupta', students: [{ name: 'Ananya Gupta', class: '7-B' }, { name: 'Rahul Gupta', class: '5-C' }], relationship: 'Father', mobile: '87654 32109', email: 'sanjay.gupta@gmail.com', status: 'Active', lastComm: '14 May 2025', occupation: 'Lawyer', address: '22, Malviya Nagar, Jaipur', joinedOn: '15 May 2021', category: 'General' },
  { id: 'PAR008', name: 'Mrs. Kavita Gupta', students: [{ name: 'Ananya Gupta', class: '7-B' }, { name: 'Rahul Gupta', class: '5-C' }], relationship: 'Mother', mobile: '87654 32110', email: 'kavita.gupta@gmail.com', status: 'Active', lastComm: '14 May 2025', occupation: 'Professor', address: '22, Malviya Nagar, Jaipur', joinedOn: '15 May 2021', category: 'General' },
];

const feesData = [
  { name: 'Paid', value: 425600, color: '#3b82f6' },
  { name: 'Outstanding', value: 219400, color: '#f97316' },
];

const engagementTrend = [
  { name: 'Jun', messages: 200, ptm: 50, logins: 300 },
  { name: 'Jul', messages: 250, ptm: 80, logins: 400 },
  { name: 'Aug', messages: 400, ptm: 120, logins: 500 },
  { name: 'Sep', messages: 350, ptm: 200, logins: 600 },
  { name: 'Oct', messages: 300, ptm: 220, logins: 550 },
  { name: 'Nov', messages: 280, ptm: 150, logins: 500 },
  { name: 'Dec', messages: 200, ptm: 100, logins: 450 },
  { name: 'Jan', messages: 450, ptm: 180, logins: 650 },
  { name: 'Feb', messages: 500, ptm: 250, logins: 700 },
  { name: 'Mar', messages: 550, ptm: 280, logins: 800 },
  { name: 'Apr', messages: 480, ptm: 200, logins: 750 },
  { name: 'May', messages: 300, ptm: 100, logins: 500 },
];

export function ParentManagementCRM() {
  const [activeTab, setActiveTab] = useState('All Parents (4,897)');
  const [selectedParent, setSelectedParent] = useState(parentsData[0]);

  const filteredParents = parentsData.filter(parent => {
    if (activeTab.startsWith('All')) return true;
    if (activeTab.startsWith('Active')) return parent.status === 'Active';
    if (activeTab.startsWith('Inactive')) return parent.status === 'Inactive';
    // Mock logic for Primary/Secondary
    if (activeTab.startsWith('Primary')) return parent.relationship === 'Father';
    if (activeTab.startsWith('Secondary')) return parent.relationship === 'Mother';
    return true;
  });

  return (
    <div className="flex flex-col space-y-4 h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Parent Management CRM</h2>
          <p className="text-xs text-slate-500 mt-0.5">Manage parent information, engagement and communication effectively</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold text-xs px-4 py-2 rounded flex items-center gap-2 shadow-sm transition-colors">
            <PlusCircle size={14} />
            <span>Add New Parent</span>
            <ChevronDown size={14} className="ml-1" />
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
                <p className="text-[10px] text-slate-500 font-bold truncate">{kpi.title}</p>
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

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 items-start">
        
        {/* Left Column */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-3">Filter Parents</h3>
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
                <label className="text-[10px] font-bold text-slate-600 block mb-1">Relationship</label>
                <select className="w-full text-xs border border-slate-200 rounded p-1.5 focus:outline-none focus:border-amber-400">
                  <option>All</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1">Parent Category</label>
                <select className="w-full text-xs border border-slate-200 rounded p-1.5 focus:outline-none focus:border-amber-400">
                  <option>All Categories</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1">Communication Preference</label>
                <select className="w-full text-xs border border-slate-200 rounded p-1.5 focus:outline-none focus:border-amber-400">
                  <option>All</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1">Status</label>
                <select className="w-full text-xs border border-slate-200 rounded p-1.5 focus:outline-none focus:border-amber-400">
                  <option>All</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1">Search</label>
                <input type="text" placeholder="Search by parent name, mobile..." className="w-full text-xs border border-slate-200 rounded p-1.5 focus:outline-none focus:border-amber-400" />
              </div>
              <button className="w-full bg-[#0a1930] text-white text-xs font-bold py-2 rounded mt-2 hover:bg-slate-800 transition-colors">
                Apply Filters
              </button>
              <button className="w-full text-blue-600 text-xs text-center hover:underline mt-1">
                Reset Filters
              </button>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col h-[400px]">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold text-slate-800">Recent Parent Activities</h3>
              <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View All</a>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="relative pl-3 border-l border-slate-200 space-y-4 ml-2 mt-2">
                {[
                  { title: 'Fee Payment', desc: 'Rajesh Sharma paid ₹ 32,500', time: '17 May 2025, 10:15 AM', icon: '₹', color: 'bg-green-500' },
                  { title: 'PTM Meeting Scheduled', desc: 'With Class Teacher (Aarav Sharma)', time: '16 May 2025, 03:30 PM', icon: '📅', color: 'bg-orange-500' },
                  { title: 'Homework Viewed', desc: 'Aarav Sharma - Mathematics', time: '16 May 2025, 11:20 AM', icon: '📚', color: 'bg-blue-500' },
                  { title: 'Leave Request Approved', desc: 'Aarav Sharma - 2 days', time: '15 May 2025, 09:45 AM', icon: '✓', color: 'bg-teal-500' },
                  { title: 'Feedback Submitted', desc: 'Academic feedback for Term 1', time: '14 May 2025, 07:10 PM', icon: '💬', color: 'bg-blue-600' },
                ].map((act, i) => (
                  <div key={i} className="relative">
                    <div className={`absolute -left-[19px] top-0 w-4 h-4 rounded-full border-2 border-white ${act.color} flex items-center justify-center text-[8px] text-white`}>
                      {/* {act.icon} */}
                    </div>
                    <p className="text-[10px] font-bold text-slate-800 leading-tight">{act.title}</p>
                    <p className="text-[9px] text-slate-500 mt-0.5">{act.desc}</p>
                    <p className="text-[8px] text-slate-400 mt-0.5">{act.time}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Center Column */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          
          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-3 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">Parents List</h3>
              <div className="flex items-center gap-2 text-slate-400">
                <button className="p-1 bg-slate-100 text-slate-800 rounded"><List size={14}/></button>
                <button className="p-1 hover:bg-slate-100 rounded text-slate-600"><Grid size={14}/></button>
                <button className="p-1 hover:bg-slate-100 rounded text-slate-600"><Download size={14}/></button>
              </div>
            </div>
            
            <div className="flex border-b border-slate-200 px-3 overflow-x-auto custom-scrollbar text-[11px] font-medium text-slate-500">
              {['All Parents (4,897)', 'Active (4,256)', 'Inactive (321)', 'Primary Contact (2,981)', 'Secondary Contact (1,916)'].map((tab) => (
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
                    <th className="p-3">Parent Name</th>
                    <th className="p-3">Student(s)</th>
                    <th className="p-3">Relationship</th>
                    <th className="p-3">Mobile</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Last Communication</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredParents.map((parent, i) => (
                    <tr 
                      key={i} 
                      className={`hover:bg-slate-50 transition-colors cursor-pointer ${selectedParent.id === parent.id ? 'bg-blue-50/50' : ''}`}
                      onClick={() => setSelectedParent(parent)}
                    >
                      <td className="p-3 font-semibold text-slate-800">{parent.name}</td>
                      <td className="p-3">
                        <div className="flex flex-col gap-0.5">
                          {parent.students.map((s, idx) => (
                            <span key={idx} className="text-slate-600">{s.name} ({s.class})</span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3 text-slate-600">{parent.relationship}</td>
                      <td className="p-3 text-slate-600">{parent.mobile}</td>
                      <td className="p-3 text-slate-600">{parent.email}</td>
                      <td className="p-3">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border
                          ${parent.status === 'Active' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100' }
                        `}>
                          {parent.status}
                        </span>
                      </td>
                      <td className="p-3 text-slate-500">{parent.lastComm}</td>
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
              <span>Showing 1 to {filteredParents.length} of 4,897 entries</span>
              <div className="flex gap-1">
                <button className="px-2 py-1 border border-slate-200 rounded hover:bg-slate-50">&lt;</button>
                <button className="px-2 py-1 bg-[#0a1930] text-white rounded">1</button>
                <button className="px-2 py-1 border border-slate-200 rounded hover:bg-slate-50">2</button>
                <button className="px-2 py-1 border border-slate-200 rounded hover:bg-slate-50">3</button>
                <span className="px-1 py-1">...</span>
                <button className="px-2 py-1 border border-slate-200 rounded hover:bg-slate-50">612</button>
                <button className="px-2 py-1 border border-slate-200 rounded hover:bg-slate-50">&gt;</button>
              </div>
            </div>
          </div>

          {/* Analytics Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Fees Summary */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-[11px] font-bold text-slate-800">Fees Summary <span className="font-normal text-slate-500">(All Children)</span></h3>
                <select className="text-[9px] border border-slate-200 rounded text-slate-500 focus:outline-none">
                  <option>This Year</option>
                </select>
              </div>
              
              <div className="flex justify-between text-[10px] mb-4">
                <div className="text-center">
                  <p className="text-slate-500">Total Payable</p>
                  <p className="font-bold text-slate-800">₹ 6,45,000</p>
                </div>
                <div className="text-center">
                  <p className="text-slate-500">Total Paid</p>
                  <p className="font-bold text-green-600">₹ 4,25,600</p>
                </div>
                <div className="text-center">
                  <p className="text-slate-500">Outstanding</p>
                  <p className="font-bold text-red-500">₹ 2,19,400</p>
                </div>
              </div>

              <div className="flex items-center justify-center flex-1 mb-4">
                <div className="w-24 h-24 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={feesData} cx="50%" cy="50%" innerRadius={25} outerRadius={45} paddingAngle={2} dataKey="value" stroke="none">
                        {feesData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col justify-center ml-4 gap-2 text-[10px]">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                      <span className="text-slate-600">Paid (66%)</span>
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>
                      <span className="text-slate-600">Outstanding (34%)</span>
                    </div>
                    <span className="font-bold text-slate-800 ml-3">₹ 2,19,400</span>
                  </div>
                </div>
              </div>

              <button className="w-full bg-[#0a1930] text-white text-[10px] font-bold py-1.5 rounded hover:bg-slate-800 transition-colors">
                View Payment History
              </button>
            </div>

            {/* Parent Engagement Trend */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-[11px] font-bold text-slate-800">Parent Engagement Trend</h3>
                <select className="text-[9px] border border-slate-200 rounded text-slate-500 focus:outline-none">
                  <option>This Year</option>
                </select>
              </div>
              
              <div className="h-32 w-full mb-3">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={engagementTrend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94a3b8' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94a3b8' }} dx={-10} />
                    <RechartsTooltip 
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '9px' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '9px', top: -10 }} />
                    <Line type="monotone" dataKey="messages" name="Messages" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                    <Line type="monotone" dataKey="ptm" name="PTM Meetings" stroke="#f97316" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                    <Line type="monotone" dataKey="logins" name="App Logins" stroke="#10b981" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center border-t border-slate-100 pt-3">
                <div>
                  <p className="text-[8px] text-slate-500 text-blue-600 font-medium">App Logins</p>
                  <p className="font-bold text-slate-800 text-[11px]">4,856</p>
                </div>
                <div>
                  <p className="text-[8px] text-slate-500 text-teal-600 font-medium">Not. Notices</p>
                  <p className="font-bold text-slate-800 text-[11px]">3,245</p>
                </div>
                <div>
                  <p className="text-[8px] text-slate-500 text-green-600 font-medium">Events Participated</p>
                  <p className="font-bold text-slate-800 text-[11px]">892</p>
                </div>
                <div>
                  <p className="text-[8px] text-slate-500 text-indigo-600 font-medium">Feedback Given</p>
                  <p className="font-bold text-slate-800 text-[11px]">612</p>
                </div>
              </div>

            </div>

          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          
          {/* Profile Card */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-sm font-bold text-slate-800">Parent Profile</h3>
              <a href="#" className="text-[10px] text-blue-600 font-medium hover:underline">View Full Profile</a>
            </div>
            
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 bg-slate-200 rounded-full overflow-hidden shrink-0 shadow-sm flex items-center justify-center">
                <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${selectedParent.name}`} alt={selectedParent.name} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-slate-900 text-sm">{selectedParent.name}</h4>
                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold border ${selectedParent.status === 'Active' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                    {selectedParent.status}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {selectedParent.relationship} of {selectedParent.students.map(s => `${s.name} (${s.class})`).join(', ')}
                </p>
              </div>
            </div>

            <div className="space-y-1.5 text-[10px] mb-4 flex-1">
              <div className="grid grid-cols-[70px_1fr] gap-2">
                <span className="text-slate-500">Mobile:</span>
                <span className="font-medium text-slate-800">{selectedParent.mobile}</span>
              </div>
              <div className="grid grid-cols-[70px_1fr] gap-2">
                <span className="text-slate-500">Email:</span>
                <span className="font-medium text-blue-600 truncate">{selectedParent.email}</span>
              </div>
              <div className="grid grid-cols-[70px_1fr] gap-2">
                <span className="text-slate-500">Occupation:</span>
                <span className="font-medium text-slate-800">{selectedParent.occupation}</span>
              </div>
              <div className="grid grid-cols-[70px_1fr] gap-2">
                <span className="text-slate-500">Address:</span>
                <span className="font-medium text-slate-800 leading-tight">{selectedParent.address}</span>
              </div>
              <div className="grid grid-cols-[70px_1fr] gap-2">
                <span className="text-slate-500">Joined On:</span>
                <span className="font-medium text-slate-800">{selectedParent.joinedOn}</span>
              </div>
              <div className="grid grid-cols-[70px_1fr] gap-2">
                <span className="text-slate-500">Category:</span>
                <span className="font-medium text-slate-800">{selectedParent.category}</span>
              </div>
              <div className="grid grid-cols-[70px_1fr] gap-2 items-center mt-2 pt-2 border-t border-slate-100">
                <span className="text-slate-500">Communication:</span>
                <div className="flex gap-2">
                  <div className="w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center cursor-pointer"><Phone size={10} /></div>
                  <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center cursor-pointer"><Mail size={10} /></div>
                  <div className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center cursor-pointer"><MessageSquare size={10} /></div>
                  <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center cursor-pointer"><PhoneCall size={10} /></div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100">
              <h4 className="text-[10px] font-bold text-slate-800 mb-2">Quick Actions</h4>
              <div className="grid grid-cols-5 gap-1">
                {[
                  { label: 'Send Message', icon: <Send size={12} /> },
                  { label: 'Schedule PTM', icon: <CalendarIcon size={12} /> },
                  { label: 'View Student', icon: <User size={12} /> },
                  { label: 'Payment History', icon: <History size={12} /> },
                  { label: 'More', icon: <MoreVertical size={12} /> },
                ].map((action, i) => (
                  <div key={i} className="flex flex-col items-center group cursor-pointer">
                    <div className="w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 mb-1 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors border border-slate-200">
                      {action.icon}
                    </div>
                    <span className="text-[7px] text-slate-500 text-center leading-tight">{action.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Communication Summary */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-[11px] font-bold text-slate-800">Communication Summary</h3>
              <select className="text-[9px] border border-slate-200 rounded text-slate-500 focus:outline-none">
                <option>This Year</option>
              </select>
            </div>
            
            <div className="grid grid-cols-4 gap-2 mb-4">
              <div className="bg-green-50 rounded-lg p-2 text-center border border-green-100">
                <div className="flex items-center justify-center gap-1 text-green-600 mb-0.5">
                  <MessageSquare size={10} />
                  <span className="text-[8px] font-bold">Messages</span>
                </div>
                <p className="font-bold text-slate-800 text-sm">245</p>
                <p className="text-[8px] text-slate-500">Sent</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-2 text-center border border-blue-100">
                <div className="flex items-center justify-center gap-1 text-blue-600 mb-0.5">
                  <Mail size={10} />
                  <span className="text-[8px] font-bold">Emails</span>
                </div>
                <p className="font-bold text-slate-800 text-sm">128</p>
                <p className="text-[8px] text-slate-500">Sent</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-2 text-center border border-orange-100">
                <div className="flex items-center justify-center gap-1 text-orange-600 mb-0.5">
                  <Phone size={10} />
                  <span className="text-[8px] font-bold">SMS</span>
                </div>
                <p className="font-bold text-slate-800 text-sm">95</p>
                <p className="text-[8px] text-slate-500">Sent</p>
              </div>
              <div className="bg-indigo-50 rounded-lg p-2 text-center border border-indigo-100">
                <div className="flex items-center justify-center gap-1 text-indigo-600 mb-0.5">
                  <Bell size={10} />
                  <span className="text-[8px] font-bold">Notices</span>
                </div>
                <p className="font-bold text-slate-800 text-sm">32</p>
                <p className="text-[8px] text-slate-500">Sent</p>
              </div>
            </div>

            <div className="flex items-center justify-between px-2">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 relative overflow-hidden flex items-center justify-center">
                   <div className="absolute top-0 left-0 w-full h-full rounded-full border-4 border-slate-100"></div>
                   <div className="absolute top-0 left-0 w-full h-full rounded-full border-4 border-teal-500 border-l-transparent border-b-transparent transform rotate-45"></div>
                   <span className="text-xs font-bold text-slate-800">82%</span>
                </div>
                <span className="text-[8px] text-slate-500 mt-1">Average Response</span>
              </div>
              
              <div className="text-right">
                <p className="text-[9px] text-slate-500">Avg. Response Time</p>
                <p className="text-lg font-bold text-slate-800">2h 15m</p>
                <p className="text-[8px] text-green-500 flex items-center justify-end gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                  Very Good
                </p>
              </div>
            </div>
          </div>

          {/* Upcoming PTM */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-[11px] font-bold text-slate-800">Upcoming PTM / Meetings</h3>
              <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View Calendar</a>
            </div>
            
            <div className="space-y-3">
              {[
                { date: '20 May 2025', time: '11:00 AM', title: 'PTM with Class Teacher', desc: 'Aarav Sharma (6-A)' },
                { date: '24 May 2025', time: '12:00 PM', title: 'PTM with Subject Teacher', desc: 'Mathematics - Aarav Sharma' },
                { date: '27 May 2025', time: '02:30 PM', title: 'Counselling Session', desc: 'Career Guidance - Aarav Sharma' },
              ].map((mtg, i) => (
                <div key={i} className="flex gap-2">
                  <div className="mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <p className="text-[9px] text-slate-500 font-medium">{mtg.date}</p>
                      <span className="text-[8px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded font-bold">{mtg.time}</span>
                    </div>
                    <p className="text-[10px] font-bold text-slate-800 mt-0.5">{mtg.title}</p>
                    <p className="text-[9px] text-slate-500">{mtg.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full bg-[#0a1930] text-white text-[10px] font-bold py-1.5 rounded hover:bg-slate-800 transition-colors mt-3">
              View All Meetings
            </button>
          </div>

          {/* Top Communication Topics */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col flex-1">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-[11px] font-bold text-slate-800">Top Communication Topics</h3>
              <select className="text-[9px] border border-slate-200 rounded text-slate-500 focus:outline-none">
                <option>This Year</option>
              </select>
            </div>
            
            <div className="space-y-3 flex-1 flex flex-col justify-center">
              {[
                { name: 'Academics', percent: 42, color: 'bg-blue-600' },
                { name: 'Fee & Payments', percent: 24, color: 'bg-blue-500' },
                { name: 'Attendance', percent: 15, color: 'bg-blue-400' },
                { name: 'Examinations', percent: 10, color: 'bg-blue-300' },
                { name: 'Transport', percent: 6, color: 'bg-slate-300' },
                { name: 'Others', percent: 3, color: 'bg-slate-200' },
              ].map((topic, i) => (
                <div key={i} className="flex items-center gap-2 text-[9px]">
                  <span className="w-20 text-slate-600">{topic.name}</span>
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${topic.color} rounded-full`} style={{ width: `${topic.percent}%` }}></div>
                  </div>
                  <span className="w-6 text-right font-bold text-slate-700">{topic.percent}%</span>
                </div>
              ))}
            </div>
            
            <p className="text-[8px] text-center text-slate-500 mt-3 border-t border-slate-100 pt-2">
              Total Conversations: 1,245
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
