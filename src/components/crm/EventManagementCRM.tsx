import { useState } from 'react';
import { 
  Calendar, CalendarDays, CalendarCheck, Users, IndianRupee,
  ChevronDown, Plus, ChevronLeft, ChevronRight, Image as ImageIcon,
  MapPin, CheckCircle2, FileText, UserPlus, Gift, Upload, 
  BarChart2, Settings, Globe, Smartphone, Edit3, MoreHorizontal,
  Star, Smile, Meh, Frown, Bell, Clock, Mail, CheckSquare, List
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid, Legend
} from 'recharts';

const kpis = [
  { title: 'Total Events', value: '28', subtitle: '↑ 21.7% this month', subtitleColor: 'text-green-600', icon: <CalendarDays size={20} />, color: 'bg-blue-500', iconColor: 'text-blue-500', iconBg: 'bg-blue-100' },
  { title: 'Upcoming Events', value: '12', subtitle: 'Next 30 Days', subtitleColor: 'text-slate-500', icon: <Calendar size={20} />, color: 'bg-green-500', iconColor: 'text-green-500', iconBg: 'bg-green-100' },
  { title: 'Ongoing Events', value: '3', subtitle: 'Live Now', subtitleColor: 'text-red-500 font-bold', icon: <Clock size={20} />, color: 'bg-purple-500', iconColor: 'text-purple-500', iconBg: 'bg-purple-100' },
  { title: 'Completed Events', value: '13', subtitle: 'This Month', subtitleColor: 'text-slate-500', icon: <CalendarCheck size={20} />, color: 'bg-blue-500', iconColor: 'text-blue-500', iconBg: 'bg-blue-100' },
  { title: 'Total Registrations', value: '2,458', subtitle: '↑ 18.6% this month', subtitleColor: 'text-green-600', icon: <Users size={20} />, color: 'bg-orange-500', iconColor: 'text-orange-500', iconBg: 'bg-orange-100' },
  { title: 'Total Revenue', value: '₹ 8,75,600', subtitle: '↑ 24.3% this month', subtitleColor: 'text-green-600', icon: <IndianRupee size={20} />, color: 'bg-green-500', iconColor: 'text-green-500', iconBg: 'bg-green-100' },
];

const eventTypes = [
  { name: 'Academic', value: 10, color: '#3b82f6', percent: '35.7%' },
  { name: 'Cultural', value: 7, color: '#10b981', percent: '25.0%' },
  { name: 'Sports', value: 5, color: '#f59e0b', percent: '17.9%' },
  { name: 'Seminar / Workshop', value: 4, color: '#8b5cf6', percent: '14.3%' },
  { name: 'Other', value: 2, color: '#64748b', percent: '7.1%' },
];

const registrationTrends = [
  { day: '11 May', total: 400, confirmed: 300, checkins: 200 },
  { day: '12 May', total: 500, confirmed: 400, checkins: 300 },
  { day: '13 May', total: 600, confirmed: 500, checkins: 350 },
  { day: '14 May', total: 800, confirmed: 650, checkins: 500 },
  { day: '15 May', total: 750, confirmed: 600, checkins: 450 },
  { day: '16 May', total: 900, confirmed: 700, checkins: 550 },
  { day: '17 May', total: 1000, confirmed: 850, checkins: 700 },
];

const upcomingEvents = [
  { title: 'Annual Day Celebration 2025', date: '20 May 2025 • 10:00 AM', location: 'Main Auditorium', users: 452, image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=100&h=100&fit=crop&q=80' },
  { title: 'Science Exhibition', date: '22 May 2025 • 09:30 AM', location: 'Science Block', users: 320, image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=100&h=100&fit=crop&q=80' },
  { title: 'Sports Day 2025', date: '25 May 2025 • 08:00 AM', location: 'Sports Ground', users: 612, image: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=100&h=100&fit=crop&q=80' },
  { title: 'Parent Teacher Meeting', date: '28 May 2025 • 11:00 AM', location: 'Conference Hall', users: 185, image: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=100&h=100&fit=crop&q=80' },
];

const recentEvents = [
  { name: 'Inter School Debate', type: 'Academic', date: '15 May 2025', registrations: 136, revenue: '₹ 12,600', status: 'Completed' },
  { name: 'Art & Craft Competition', type: 'Cultural', date: '14 May 2025', registrations: 152, revenue: '₹ 8,400', status: 'Completed' },
  { name: 'Yoga Workshop', type: 'Workshop', date: '12 May 2025', registrations: 98, revenue: '₹ 6,200', status: 'Completed' },
  { name: 'Career Guidance Seminar', type: 'Seminar', date: '10 May 2025', registrations: 210, revenue: '₹ 15,600', status: 'Completed' },
  { name: 'Basketball Tournament', type: 'Sports', date: '08 May 2025', registrations: 270, revenue: '₹ 18,500', status: 'Completed' },
];

const quickActions = [
  { label: 'Create Event', icon: <CalendarDays size={18} className="text-blue-600" /> },
  { label: 'Add Task', icon: <CheckSquare size={18} className="text-green-600" /> },
  { label: 'Manage Registrations', icon: <Users size={18} className="text-purple-600" /> },
  { label: 'Send Invitation', icon: <Mail size={18} className="text-blue-600" /> },
  { label: 'Add Volunteer', icon: <UserPlus size={18} className="text-amber-600" /> },
  { label: 'Add Sponsor', icon: <Gift size={18} className="text-orange-600" /> },
  { label: 'Upload Certificate', icon: <Upload size={18} className="text-indigo-600" /> },
  { label: 'Generate Report', icon: <FileText size={18} className="text-slate-600" /> },
  { label: 'Event Settings', icon: <Settings size={18} className="text-slate-600" /> },
];

const statusSummary = [
  { label: 'Upcoming', count: 12, percent: '42.9%', color: 'bg-blue-500' },
  { label: 'Ongoing', count: 3, percent: '10.7%', color: 'bg-purple-500' },
  { label: 'Completed', count: 13, percent: '46.4%', color: 'bg-green-500' },
  { label: 'Cancelled', count: 0, percent: '0%', color: 'bg-slate-300' },
];

const regSources = [
  { label: 'Website', count: 856, percent: '34.8%', color: 'bg-blue-500', icon: <Globe size={12} className="text-blue-500" /> },
  { label: 'Mobile App', count: 652, percent: '26.5%', color: 'bg-green-500', icon: <Smartphone size={12} className="text-green-500" /> },
  { label: 'Google Form', count: 421, percent: '17.1%', color: 'bg-yellow-500', icon: <List size={12} className="text-yellow-500" /> },
  { label: 'Manual Entry', count: 286, percent: '11.6%', color: 'bg-orange-500', icon: <Edit3 size={12} className="text-orange-500" /> },
  { label: 'Others', count: 243, percent: '9.9%', color: 'bg-slate-500', icon: <MoreHorizontal size={12} className="text-slate-500" /> },
];

const topEvents = [
  { name: 'Sports Day 2025', count: 612 },
  { name: 'Annual Day Celebration 2025', count: 452 },
  { name: 'Science Exhibition', count: 320 },
  { name: 'Inter School Debate', count: 186 },
  { name: 'Parent Teacher Meeting', count: 185 },
];

const reminders = [
  { title: 'Annual Day Celebration 2025', desc: 'Event starts in 3 days', date: '20 May 2025', icon: <Calendar size={14} className="text-blue-500" />, bg: 'bg-blue-50' },
  { title: 'Science Exhibition', desc: 'Last date to register: 20 May 2025', date: '22 May 2025', icon: <Users size={14} className="text-green-500" />, bg: 'bg-green-50' },
  { title: 'Sports Day 2025', desc: 'Volunteers meeting tomorrow at 04:00 PM', date: '25 May 2025', icon: <UserPlus size={14} className="text-purple-500" />, bg: 'bg-purple-50' },
  { title: 'PTM', desc: "Don't forget to send invitation", date: '28 May 2025', icon: <Bell size={14} className="text-orange-500" />, bg: 'bg-orange-50' },
];

const keyBenefits = [
  { title: 'Centralized Event Management', desc: 'Manage all school events in one place', icon: <CalendarDays size={14} className="text-blue-600" /> },
  { title: 'Easy Registrations', desc: 'Online registration & ticketing', icon: <List size={14} className="text-blue-600" /> },
  { title: 'Real-time Communication', desc: 'Invite, remind & update instantly', icon: <Mail size={14} className="text-purple-600" /> },
  { title: 'Task & Volunteer Management', desc: 'Assign tasks & track progress', icon: <CheckCircle2 size={14} className="text-green-600" /> },
  { title: 'Sponsors & Revenue Tracking', desc: 'Manage sponsors & event revenue', icon: <IndianRupee size={14} className="text-green-600" /> },
  { title: 'Feedback & Analytics', desc: 'Measure success & improve events', icon: <BarChart2 size={14} className="text-purple-600" /> },
  { title: 'Certificates & Reports', desc: 'Generate certificates & reports', icon: <FileText size={14} className="text-indigo-600" /> },
];

export function EventManagementCRM() {
  const [selectedPeriod, setSelectedPeriod] = useState('This Month');
  const [selectedEventGroup, setSelectedEventGroup] = useState('All Events');

  return (
    <div className="flex flex-col space-y-4 h-full relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Event Management CRM</h2>
          <p className="text-xs text-slate-500 mt-0.5">Plan • Organize • Engage • Celebrate</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded px-3 py-1.5 shadow-sm cursor-pointer hover:bg-slate-50">
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
          <div className="flex items-center text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded px-3 py-1.5 shadow-sm cursor-pointer hover:bg-slate-50">
            <select 
              className="bg-transparent border-none outline-none text-slate-700 cursor-pointer appearance-none pr-4"
              value={selectedEventGroup}
              onChange={(e) => setSelectedEventGroup(e.target.value)}
            >
              <option value="All Events">All Events</option>
              <option value="Academic">Academic</option>
              <option value="Cultural">Cultural</option>
              <option value="Sports">Sports</option>
            </select>
            <ChevronDown size={14} className="ml-[-12px] text-slate-400 pointer-events-none" />
          </div>
          <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded flex items-center gap-2 shadow-sm transition-colors">
            <Plus size={14} />
            <span>Create New Event</span>
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
                <p className="text-[14px] font-bold text-slate-900 truncate leading-tight mt-0.5">{kpi.value}</p>
              </div>
            </div>
            {kpi.subtitle && (
              <div className={`text-[8px] flex items-center gap-1 font-medium ${kpi.subtitleColor}`}>
                {kpi.subtitle}
              </div>
            )}
            <div className={`absolute bottom-0 left-0 w-full h-0.5 ${kpi.color}`}></div>
          </div>
        ))}
      </div>

      {/* First Row Workspace */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4">
        
        {/* Event Calendar Mini */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[11px] font-bold text-slate-800">Event Calendar</h3>
          </div>
          <div className="flex-1 flex flex-col items-center">
             <div className="flex items-center justify-between w-full mb-3 px-2">
                <button className="text-slate-400 hover:text-slate-700"><ChevronLeft size={14}/></button>
                <span className="text-[10px] font-bold text-slate-800">May 2025</span>
                <div className="flex items-center gap-2">
                   <button className="text-[8px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">Today</button>
                   <button className="text-slate-400 hover:text-slate-700"><ChevronRight size={14}/></button>
                </div>
             </div>
             
             <div className="w-full text-center text-[8px]">
                <div className="grid grid-cols-7 text-slate-400 font-medium mb-2">
                   <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
                </div>
                <div className="grid grid-cols-7 gap-y-2 text-slate-700 font-medium">
                   {/* Dummy Calendar Days */}
                   <div className="text-slate-300">27</div><div className="text-slate-300">28</div><div className="text-slate-300">29</div><div className="text-slate-300">30</div><div>1</div><div>2</div><div>3</div>
                   <div>4</div><div>5</div><div>6</div><div>7</div><div className="text-blue-500 font-bold">8</div><div>9</div><div className="text-green-500 font-bold relative">10<div className="w-1 h-1 bg-green-500 rounded-full mx-auto mt-0.5"></div></div>
                   <div>11</div><div className="text-purple-500 font-bold relative">12<div className="w-1 h-1 bg-purple-500 rounded-full mx-auto mt-0.5"></div></div><div>13</div><div className="text-blue-500 font-bold relative">14<div className="w-1 h-1 bg-blue-500 rounded-full mx-auto mt-0.5"></div></div><div className="text-red-500 font-bold relative line-through decoration-slate-300 decoration-1">15</div><div>16</div><div className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center mx-auto shadow-sm">17</div>
                   <div>18</div><div>19</div><div className="text-blue-500 font-bold relative">20<div className="w-1 h-1 bg-blue-500 rounded-full mx-auto mt-0.5"></div></div><div>21</div><div className="text-blue-500 font-bold relative">22<div className="w-1 h-1 bg-blue-500 rounded-full mx-auto mt-0.5"></div></div><div>23</div><div>24</div>
                   <div className="text-blue-500 font-bold relative">25<div className="w-1 h-1 bg-blue-500 rounded-full mx-auto mt-0.5"></div></div><div>26</div><div>27</div><div className="text-blue-500 font-bold relative">28<div className="w-1 h-1 bg-blue-500 rounded-full mx-auto mt-0.5"></div></div><div>29</div><div>30</div><div>31</div>
                </div>
             </div>
          </div>
          
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 text-[7px] font-medium text-slate-500">
             <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div> Upcoming</div>
             <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div> Ongoing</div>
             <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> Completed</div>
             <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-red-500"></div> Cancelled</div>
          </div>
        </div>

        {/* Events Overview */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[11px] font-bold text-slate-800">Events Overview <span className="font-normal text-slate-500">(This Month)</span></h3>
          </div>
          <div className="flex items-center justify-center gap-4 flex-1">
             <div className="w-24 h-24 relative shrink-0">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie data={eventTypes} cx="50%" cy="50%" innerRadius={28} outerRadius={40} dataKey="value" stroke="none">
                     {eventTypes.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={entry.color} />
                     ))}
                   </Pie>
                 </PieChart>
               </ResponsiveContainer>
               <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-[14px] font-bold text-slate-800">28</span>
                  <span className="text-[6px] text-slate-500 leading-tight">Total Events</span>
               </div>
             </div>
             <div className="flex flex-col gap-1.5 text-[9px] flex-1">
               {eventTypes.map((item, i) => (
                 <div key={i} className="flex items-center justify-between">
                   <div className="flex items-center gap-1.5">
                     <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                     <span className="text-slate-600 text-[8px] font-medium whitespace-nowrap">{item.name}</span>
                   </div>
                   <div className="flex items-center gap-1 text-[8px]">
                      <span className="font-bold text-slate-800">{item.value}</span>
                      <span className="text-slate-400">({item.percent})</span>
                   </div>
                 </div>
               ))}
             </div>
          </div>
        </div>

        {/* Registrations Overview */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-4 flex flex-col relative">
          <div className="flex justify-between items-center mb-1">
            <h3 className="text-[11px] font-bold text-slate-800">Registrations Overview</h3>
          </div>
          
          <div className="flex justify-between items-center text-center mb-2 mt-1">
             <div>
                <span className="text-[7px] text-slate-500 block">Total Registrations</span>
                <span className="text-[12px] font-bold text-slate-800">2,458</span>
             </div>
             <div>
                <span className="text-[7px] text-green-600 block">Confirmed</span>
                <span className="text-[12px] font-bold text-green-600">2,123</span>
             </div>
             <div>
                <span className="text-[7px] text-purple-600 block">Check-ins</span>
                <span className="text-[12px] font-bold text-purple-600">1,876</span>
             </div>
          </div>

          <div className="flex-1 w-full h-full min-h-[140px] relative">
             <ResponsiveContainer width="100%" height="100%">
               <LineChart data={registrationTrends} margin={{ top: 10, right: 0, left: -25, bottom: 10 }}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                 <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 7, fill: '#64748b' }} dy={5} />
                 <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 7, fill: '#64748b' }} domain={[0, 1000]} tickFormatter={(val) => val >= 1000 ? `${val/1000}K` : val} />
                 <RechartsTooltip contentStyle={{ fontSize: '9px', borderRadius: '4px', padding: '4px' }} />
                 <Legend iconType="circle" wrapperStyle={{ fontSize: '7px', bottom: -10 }} />
                 <Line type="monotone" dataKey="total" name="Total Registrations" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                 <Line type="monotone" dataKey="confirmed" name="Confirmed" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                 <Line type="monotone" dataKey="checkins" name="Check-ins" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
               </LineChart>
             </ResponsiveContainer>
          </div>
        </div>

        {/* Upcoming Events Feed */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-2 flex flex-col">
          <div className="flex justify-between items-center mb-3">
             <h3 className="text-[11px] font-bold text-slate-800">Upcoming Events</h3>
             <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View All</a>
          </div>
          <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-1">
             {upcomingEvents.map((event, i) => (
                <div key={i} className="flex gap-2 items-start border-b border-slate-50 pb-2 last:border-0 last:pb-0 group cursor-pointer hover:bg-slate-50 -mx-2 px-2 rounded transition-colors">
                   <div className="w-10 h-10 rounded overflow-hidden shrink-0 shadow-sm">
                      <img src={event.image} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                   </div>
                   <div className="flex-1 min-w-0">
                      <h4 className="text-[9px] font-bold text-slate-800 leading-tight truncate">{event.title}</h4>
                      <p className="text-[7.5px] text-slate-500 mt-0.5 whitespace-nowrap">{event.date}</p>
                      <p className="text-[7.5px] text-slate-500 truncate">{event.location}</p>
                   </div>
                   <div className="flex flex-col items-end justify-between h-full py-0.5 shrink-0">
                      <span className="text-[7px] font-medium text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">Upcoming</span>
                      <span className="text-[8px] text-slate-600 font-medium flex items-center gap-0.5 mt-2"><Users size={9} className="text-slate-400"/> {event.users}</span>
                   </div>
                </div>
             ))}
          </div>
        </div>

      </div>

      {/* Second Row Workspace */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4">
        
        {/* Recent Events */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-4 flex flex-col">
          <div className="flex justify-between items-center mb-3">
             <h3 className="text-[11px] font-bold text-slate-800">Recent Events</h3>
             <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View All</a>
          </div>
          
          <div className="flex-1 overflow-x-auto">
             <table className="w-full text-[8px] text-left">
                <thead>
                   <tr className="text-slate-500 border-b border-slate-100">
                      <th className="pb-2 font-medium">Event Name</th>
                      <th className="pb-2 font-medium">Type</th>
                      <th className="pb-2 font-medium">Date</th>
                      <th className="pb-2 font-medium text-center">Registrations</th>
                      <th className="pb-2 font-medium text-right">Revenue</th>
                      <th className="pb-2 font-medium text-right">Status</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                   {recentEvents.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                         <td className="py-2 text-slate-800 font-bold max-w-[100px] truncate" title={row.name}>{row.name}</td>
                         <td className="py-2 text-slate-600">{row.type}</td>
                         <td className="py-2 text-slate-600 whitespace-nowrap">{row.date}</td>
                         <td className="py-2 text-center font-bold text-blue-600">{row.registrations}</td>
                         <td className="py-2 text-right font-bold text-slate-800">{row.revenue}</td>
                         <td className="py-2 text-right">
                            <span className="text-[7px] font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded border border-green-200">{row.status}</span>
                         </td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
          <div className="text-center mt-2 border-t border-slate-100 pt-2">
            <a href="#" className="text-[9px] font-bold text-blue-600 hover:underline">View All Events</a>
          </div>
        </div>

        {/* Event Type Distribution (Second Donut) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[11px] font-bold text-slate-800">Event Type Distribution</h3>
            <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View Report</a>
          </div>
          <div className="flex items-center justify-center gap-4 flex-1">
             <div className="w-24 h-24 relative shrink-0">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie data={eventTypes} cx="50%" cy="50%" innerRadius={28} outerRadius={40} dataKey="value" stroke="none">
                     {eventTypes.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={entry.color} />
                     ))}
                   </Pie>
                 </PieChart>
               </ResponsiveContainer>
               <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-[14px] font-bold text-slate-800">28</span>
                  <span className="text-[6px] text-slate-500 leading-tight">Total Events</span>
               </div>
             </div>
             <div className="flex flex-col gap-1.5 text-[9px] flex-1">
               {eventTypes.map((item, i) => (
                 <div key={i} className="flex items-center justify-between">
                   <div className="flex items-center gap-1.5">
                     <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                     <span className="text-slate-600 text-[8px] font-medium whitespace-nowrap">{item.name}</span>
                   </div>
                   <div className="flex items-center gap-1 text-[8px]">
                      <span className="font-bold text-slate-800">{item.value}</span>
                      <span className="text-slate-400">({item.percent})</span>
                   </div>
                 </div>
               ))}
             </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Quick Actions</h3>
          <div className="grid grid-cols-3 gap-2 flex-1 content-start">
            {quickActions.map((action, i) => (
              <button key={i} className="flex flex-col items-center justify-center text-center p-2 rounded-xl border border-slate-100 hover:bg-slate-50 hover:border-slate-200 transition-colors group">
                <div className="mb-2 group-hover:scale-110 transition-transform bg-white rounded-lg p-1.5 shadow-sm border border-slate-100">
                  {action.icon}
                </div>
                <span className="text-[7.5px] text-slate-700 font-medium leading-tight px-0.5 whitespace-normal">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Event Status Summary */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-2 flex flex-col">
          <div className="flex justify-between items-center mb-4">
             <h3 className="text-[11px] font-bold text-slate-800">Event Status Summary</h3>
             <select className="text-[8px] border border-slate-200 rounded text-slate-600 focus:outline-none">
               <option>This Month</option>
             </select>
          </div>
          <div className="flex flex-col gap-4 flex-1 justify-center">
             {statusSummary.map((status, i) => (
                <div key={i} className="flex flex-col gap-1">
                   <div className="flex justify-between items-center text-[9px]">
                      <span className="text-slate-600 font-medium">{status.label}</span>
                      <span className="font-bold text-slate-900">{status.count} <span className="text-slate-400 font-normal">({status.percent})</span></span>
                   </div>
                   <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div className={`h-full rounded-full ${status.color}`} style={{ width: status.percent }}></div>
                   </div>
                </div>
             ))}
          </div>
        </div>

      </div>

      {/* Third Row Workspace */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4">
        
        {/* Registrations by Source */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <div className="flex justify-between items-center mb-4">
             <h3 className="text-[11px] font-bold text-slate-800">Registrations by Source</h3>
             <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View Report</a>
          </div>
          <div className="flex flex-col gap-3 flex-1 justify-center">
             {regSources.map((source, i) => (
                <div key={i} className="flex items-center gap-2 text-[9px]">
                   <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 bg-slate-50 border border-slate-100`}>
                      {source.icon}
                   </div>
                   <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                         <span className="text-slate-700 font-medium">{source.label}</span>
                         <span className="font-bold text-slate-900">{source.count} <span className="text-slate-400 font-normal">({source.percent})</span></span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                         <div className={`h-full rounded-full ${source.color}`} style={{ width: source.percent }}></div>
                      </div>
                   </div>
                </div>
             ))}
          </div>
        </div>

        {/* Top Events by Registrations */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <div className="flex justify-between items-center mb-4">
             <h3 className="text-[11px] font-bold text-slate-800">Top Events by Registrations</h3>
             <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View Report</a>
          </div>
          <div className="flex flex-col gap-3 flex-1 justify-center">
             {topEvents.map((event, i) => {
                const maxCount = topEvents[0].count;
                const percent = (event.count / maxCount) * 100;
                return (
                <div key={i} className="flex items-center gap-2 text-[9px]">
                   <span className="text-slate-400 font-bold w-3 shrink-0">{i + 1}.</span>
                   <div className="flex-1 min-w-0 flex items-center gap-2">
                      <span className="text-slate-700 font-medium truncate w-32 shrink-0" title={event.name}>{event.name}</span>
                      <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                         <div className="bg-blue-500 h-full rounded-full" style={{ width: `${percent}%` }}></div>
                      </div>
                   </div>
                   <span className="font-bold text-slate-900 w-6 text-right shrink-0">{event.count}</span>
                </div>
             )})}
          </div>
        </div>

        {/* Feedback Summary */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <div className="flex justify-between items-center mb-3">
             <h3 className="text-[11px] font-bold text-slate-800">Feedback Summary</h3>
             <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View Report</a>
          </div>
          
          <div className="flex items-center justify-between mb-4">
             <div className="flex flex-col">
                <span className="text-[20px] font-bold text-slate-900 flex items-center gap-1">4.6 <span className="text-[12px] text-slate-400 font-medium">/ 5</span></span>
                <div className="flex items-center text-amber-400 mt-1">
                   <Star size={12} fill="currentColor" />
                   <Star size={12} fill="currentColor" />
                   <Star size={12} fill="currentColor" />
                   <Star size={12} fill="currentColor" />
                   <Star size={12} className="text-slate-200" fill="currentColor" />
                </div>
                <span className="text-[7px] text-slate-500 font-medium mt-1">Average Rating</span>
             </div>
             <div className="text-center border-l border-slate-100 pl-6">
                <span className="text-[8px] text-slate-500 block mb-0.5">Total Feedback</span>
                <span className="text-[16px] font-bold text-slate-800">1,248</span>
             </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-auto border-t border-slate-100 pt-3">
             <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-green-500 mb-1">
                   <Smile size={14} /> <span className="text-[8px] font-medium">Positive</span>
                </div>
                <span className="text-[10px] font-bold text-green-600 block">856 <span className="text-[7px] text-slate-400 font-normal">(68.6%)</span></span>
             </div>
             <div className="text-center border-l border-r border-slate-100">
                <div className="flex items-center justify-center gap-1 text-amber-500 mb-1">
                   <Meh size={14} /> <span className="text-[8px] font-medium">Neutral</span>
                </div>
                <span className="text-[10px] font-bold text-amber-600 block">256 <span className="text-[7px] text-slate-400 font-normal">(20.5%)</span></span>
             </div>
             <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-red-500 mb-1">
                   <Frown size={14} /> <span className="text-[8px] font-medium">Negative</span>
                </div>
                <span className="text-[10px] font-bold text-red-600 block">136 <span className="text-[7px] text-slate-400 font-normal">(10.9%)</span></span>
             </div>
          </div>
        </div>

        {/* Important Reminders */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <div className="flex justify-between items-center mb-3">
             <h3 className="text-[11px] font-bold text-slate-800">Important Reminders</h3>
             <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View All</a>
          </div>
          <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-1">
             {reminders.map((reminder, i) => (
                <div key={i} className="flex gap-2 items-start">
                   <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${reminder.bg}`}>
                      {reminder.icon}
                   </div>
                   <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-bold text-slate-800 leading-tight truncate">{reminder.title}</p>
                      <p className="text-[7.5px] text-slate-600 mt-0.5">{reminder.desc}</p>
                   </div>
                   <span className="text-[7px] text-slate-500 whitespace-nowrap pt-0.5">{reminder.date}</span>
                </div>
             ))}
          </div>
        </div>

      </div>

      {/* Bottom Banner - Key Benefits */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-2 mt-2">
         {keyBenefits.map((benefit, i) => (
            <div key={i} className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm flex items-center gap-2">
               <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 bg-slate-50 border border-slate-100`}>
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
