import { useState } from 'react';
import { 
  Building, Users, DoorOpen, Bed, UserCircle, IndianRupee,
  ChevronDown, Plus, CheckCircle2, ArrowRightCircle, ArrowLeftCircle,
  Clock, FileText, Wrench, ShieldAlert, AlertTriangle, Coffee,
  Calendar, Info, LayoutDashboard, Shirt, Box, UserCheck, Phone,
  TrendingUp, TrendingDown, Bell
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid
} from 'recharts';

const kpis = [
  { title: 'Total Hostels', value: '6', subtitle: 'Active Hostels', color: 'bg-blue-500', icon: <Building size={20} />, iconColor: 'text-blue-500', iconBg: 'bg-blue-100' },
  { title: 'Total Students', value: '1,248', subtitle: 'In Hostels', color: 'bg-green-500', icon: <Users size={20} />, iconColor: 'text-green-500', iconBg: 'bg-green-100' },
  { title: 'Total Rooms', value: '312', subtitle: 'All Rooms', color: 'bg-purple-500', icon: <DoorOpen size={20} />, iconColor: 'text-purple-500', iconBg: 'bg-purple-100' },
  { title: 'Occupied Rooms', value: '276', subtitle: '88.46% Occupied', color: 'bg-orange-500', icon: <Bed size={20} />, iconColor: 'text-orange-500', iconBg: 'bg-orange-100' },
  { title: 'Total Staff', value: '48', subtitle: 'Wardens & Staff', color: 'bg-red-500', icon: <UserCircle size={20} />, iconColor: 'text-red-500', iconBg: 'bg-red-100' },
  { title: 'Mess Balance', value: '₹ 2,48,560', subtitle: 'This Month', color: 'bg-teal-500', icon: <IndianRupee size={20} />, iconColor: 'text-teal-500', iconBg: 'bg-teal-100' },
];

const roomOccupancy = [
  { name: 'Occupied', value: 276, color: '#3b82f6', percent: '88.46%' },
  { name: 'Vacant', value: 36, color: '#10b981', percent: '11.54%' },
];

const hostelWiseStudents = [
  { name: 'Boys Hostel A', students: 356, color: '#3b82f6' },
  { name: 'Boys Hostel B', students: 312, color: '#3b82f6' },
  { name: 'Girls Hostel A', students: 286, color: '#3b82f6' },
  { name: 'Girls Hostel B', students: 194, color: '#3b82f6' },
  { name: 'PG Hostel', students: 100, color: '#3b82f6' },
];

const leaveApplications = [
  { name: 'Pending', value: 22, color: '#f59e0b', percent: '34.38%' },
  { name: 'Approved', value: 34, color: '#10b981', percent: '53.13%' },
  { name: 'Rejected', value: 8, color: '#ef4444', percent: '12.50%' },
];

const recentAllotments = [
  { student: 'Aarav Sharma', hostel: 'Boys Hostel A', room: 'A-101', bed: '1', date: '15 May 2025', status: 'Active' },
  { student: 'Vihaan Patel', hostel: 'Boys Hostel B', room: 'B-203', bed: '2', date: '14 May 2025', status: 'Active' },
  { student: 'Meera Joshi', hostel: 'Girls Hostel A', room: 'GA-105', bed: '1', date: '13 May 2025', status: 'Active' },
  { student: 'Ananya Singh', hostel: 'Girls Hostel B', room: 'GB-210', bed: '2', date: '12 May 2025', status: 'Active' },
  { student: 'Rohit Kumar', hostel: 'PG Hostel', room: 'PG-12', bed: '1', date: '11 May 2025', status: 'Active' },
];

const pendingPayments = [
  { student: 'Karan Mehta', hostel: 'Boys Hostel A', amount: '₹ 6,450', dueDate: '20 May 2025', isPastDue: false },
  { student: 'Aditya Verma', hostel: 'Boys Hostel B', amount: '₹ 5,800', dueDate: '18 May 2025', isPastDue: false },
  { student: 'Neha Kumari', hostel: 'Girls Hostel A', amount: '₹ 6,450', dueDate: '20 May 2025', isPastDue: false },
  { student: 'Pooja Patel', hostel: 'Girls Hostel B', amount: '₹ 5,800', dueDate: '18 May 2025', isPastDue: false },
  { student: 'Ritik Singh', hostel: 'PG Hostel', amount: '₹ 7,200', dueDate: '22 May 2025', isPastDue: false },
];

const facilities = [
  { label: 'Room Allotment', icon: <Bed size={16} className="text-blue-600" /> },
  { label: 'Mess Management', icon: <Coffee size={16} className="text-blue-600" /> },
  { label: 'Visitor Management', icon: <UserCheck size={16} className="text-blue-600" /> },
  { label: 'Laundry Management', icon: <Shirt size={16} className="text-blue-600" /> },
  { label: 'Inventory', icon: <Box size={16} className="text-blue-600" /> },
  { label: 'Complaints', icon: <AlertTriangle size={16} className="text-blue-600" /> },
  { label: 'Gate Pass', icon: <FileText size={16} className="text-blue-600" /> },
  { label: 'Discipline', icon: <ShieldAlert size={16} className="text-blue-600" /> },
];

const quickActions = [
  { label: 'Add Student', icon: <Users size={16} className="text-blue-600" /> },
  { label: 'Allocate Room', icon: <Bed size={16} className="text-blue-600" /> },
  { label: 'Mark Attendance', icon: <CheckCircle2 size={16} className="text-blue-600" /> },
  { label: 'Leave Request', icon: <FileText size={16} className="text-blue-600" /> },
  { label: 'Gate Pass', icon: <FileText size={16} className="text-blue-600" /> },
  { label: 'Mess Menu', icon: <Coffee size={16} className="text-blue-600" /> },
  { label: 'Send Notice', icon: <Bell size={16} className="text-blue-600" /> },
  { label: 'Settings', icon: <Wrench size={16} className="text-slate-600" /> },
];

const maintenanceRequests = [
  { issue: 'Room Light Not Working', location: 'Boys Hostel A - Room A101', date: '17 May 2025', status: 'In Progress', statusColor: 'text-amber-600', icon: <Wrench size={14} className="text-amber-500" />, iconBg: 'bg-amber-100' },
  { issue: 'Water Heater Issue', location: 'Girls Hostel B - Room GB210', date: '16 May 2025', status: 'Open', statusColor: 'text-red-600', icon: <AlertTriangle size={14} className="text-red-500" />, iconBg: 'bg-red-100' },
  { issue: 'Fan Not Working', location: 'PG Hostel - Room PG12', date: '16 May 2025', status: 'Resolved', statusColor: 'text-green-600', icon: <CheckCircle2 size={14} className="text-green-500" />, iconBg: 'bg-green-100' },
  { issue: 'Door Lock Problem', location: 'Boys Hostel B - Room B203', date: '15 May 2025', status: 'In Progress', statusColor: 'text-amber-600', icon: <Wrench size={14} className="text-amber-500" />, iconBg: 'bg-amber-100' },
];

const visitorLog = [
  { visitorName: 'Rajesh Sharma', studentName: 'Aarav Sharma', inTime: '10:15 AM', outTime: '10:45 AM', purpose: 'Parent' },
  { visitorName: 'Sunita Patel', studentName: 'Vihaan Patel', inTime: '11:20 AM', outTime: '11:50 AM', purpose: 'Parent' },
  { visitorName: 'Ramesh Singh', studentName: 'Meera Joshi', inTime: '12:05 PM', outTime: '12:30 PM', purpose: 'Guardian' },
  { visitorName: 'Anjali Verma', studentName: 'Ananya Singh', inTime: '04:10 PM', outTime: '04:40 PM', purpose: 'Parent' },
];

const importantNotices = [
  { text: 'Mess will remain closed on 18 May (Sunday).', date: '16 May 2025', icon: <Coffee size={12} className="text-amber-600" />, bg: 'bg-amber-50' },
  { text: 'Hostel fee due date is 25 May 2025.', date: '15 May 2025', icon: <IndianRupee size={12} className="text-blue-600" />, bg: 'bg-blue-50' },
  { text: 'Water supply maintenance on 19 May.', date: '14 May 2025', icon: <Wrench size={12} className="text-purple-600" />, bg: 'bg-purple-50' },
];

export function HostelManagementCRM() {
  const [selectedHostel, setSelectedHostel] = useState('All Hostels');

  return (
    <div className="flex flex-col space-y-4 h-full relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Hostel Management CRM</h2>
          <p className="text-xs text-slate-500 mt-0.5">Safe • Comfortable • Secure Living</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded px-3 py-1.5 shadow-sm">
            <span className="text-slate-400 mr-2">Academic Year</span>
            <span>2025-26</span>
            <ChevronDown size={14} className="ml-2 text-slate-400" />
          </div>
          <div className="flex items-center text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded px-3 py-1.5 shadow-sm cursor-pointer hover:bg-slate-50">
            <span className="text-slate-400 mr-2">Hostel</span>
            <select 
              className="bg-transparent border-none outline-none text-slate-700 cursor-pointer appearance-none pr-4"
              value={selectedHostel}
              onChange={(e) => setSelectedHostel(e.target.value)}
            >
              <option value="All Hostels">All Hostels</option>
              <option value="Boys Hostel A">Boys Hostel A</option>
              <option value="Boys Hostel B">Boys Hostel B</option>
              <option value="Girls Hostel A">Girls Hostel A</option>
              <option value="Girls Hostel B">Girls Hostel B</option>
              <option value="PG Hostel">PG Hostel</option>
            </select>
            <ChevronDown size={14} className="ml-[-12px] text-slate-400 pointer-events-none" />
          </div>
          <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded flex items-center gap-2 shadow-sm transition-colors">
            <Plus size={14} />
            <span>Add New Student</span>
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
              <div className="text-[8px] text-slate-500 flex items-center gap-1">
                {kpi.subtitle}
              </div>
            )}
            <div className={`absolute bottom-0 left-0 w-full h-0.5 ${kpi.color}`}></div>
          </div>
        ))}
      </div>

      {/* First Row Workspace */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4">
        
        {/* Room Occupancy Overview */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[11px] font-bold text-slate-800">Room Occupancy Overview</h3>
          </div>
          <div className="flex items-center justify-center gap-4 flex-1">
             <div className="w-24 h-24 relative shrink-0">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie data={roomOccupancy} cx="50%" cy="50%" innerRadius={28} outerRadius={40} dataKey="value" stroke="none">
                     {roomOccupancy.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={entry.color} />
                     ))}
                   </Pie>
                 </PieChart>
               </ResponsiveContainer>
               <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-[11px] font-bold text-slate-800">88.46%</span>
                  <span className="text-[6px] text-slate-500 leading-tight">Occupancy</span>
               </div>
             </div>
             <div className="flex flex-col gap-1.5 text-[9px] flex-1">
               {roomOccupancy.map((item, i) => (
                 <div key={i} className="flex items-center justify-between">
                   <div className="flex items-center gap-1.5">
                     <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                     <span className="text-slate-600 text-[9px] font-medium whitespace-nowrap">{item.name}</span>
                   </div>
                   <div className="flex items-center gap-1 text-[8px]">
                      <span className="font-bold text-slate-800">{item.value}</span>
                      <span className="text-slate-400">({item.percent})</span>
                   </div>
                 </div>
               ))}
             </div>
          </div>
          <div className="mt-2 text-[9px] text-slate-600 font-medium text-center">Total Rooms: 312</div>
        </div>

        {/* Hostel Wise Students */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-4 flex flex-col relative">
          <div className="flex justify-between items-center mb-1">
            <h3 className="text-[11px] font-bold text-slate-800">Hostel Wise Students</h3>
            <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View All</a>
          </div>
          <div className="flex-1 w-full h-full min-h-[140px] relative mt-2">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={hostelWiseStudents} margin={{ top: 15, right: 0, left: -25, bottom: 10 }} barSize={12}>
                 <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 7, fill: '#64748b' }} dy={10} angle={-15} textAnchor="end" />
                 <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#64748b' }} />
                 <RechartsTooltip cursor={{fill: '#f1f5f9'}} contentStyle={{ fontSize: '9px', borderRadius: '4px', padding: '4px' }} />
                 <Bar dataKey="students" radius={[2, 2, 0, 0]}>
                   {hostelWiseStudents.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={entry.color} />
                   ))}
                 </Bar>
               </BarChart>
             </ResponsiveContainer>
          </div>
          <div className="absolute bottom-1 left-0 right-0 text-center text-[7px] text-slate-500">No. of Students</div>
        </div>

        {/* Students Check-in / Check-out (Today) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-2 flex flex-col">
          <div className="flex justify-between items-center mb-4">
             <h3 className="text-[11px] font-bold text-slate-800">Students Check-in / Check-out <span className="font-normal text-slate-500">(Today)</span></h3>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-2">
             <div className="border border-slate-100 rounded-lg p-2 text-center bg-slate-50 flex flex-col items-center">
                <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center mb-1"><ArrowRightCircle size={14} className="text-green-600" /></div>
                <span className="text-[8px] text-slate-500 block mb-0.5">Check-in</span>
                <span className="text-[12px] font-bold text-slate-900">12</span>
             </div>
             <div className="border border-slate-100 rounded-lg p-2 text-center bg-slate-50 flex flex-col items-center">
                <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center mb-1"><ArrowLeftCircle size={14} className="text-red-600" /></div>
                <span className="text-[8px] text-slate-500 block mb-0.5">Check-out</span>
                <span className="text-[12px] font-bold text-slate-900">8</span>
             </div>
          </div>
          <div className="grid grid-cols-2 gap-2 flex-1">
             <div className="border border-slate-100 rounded-lg p-2 flex flex-col justify-center">
                <span className="text-[7px] text-slate-500 block mb-0.5">Currently In Hostel</span>
                <span className="text-[11px] font-bold text-slate-900">1,240</span>
             </div>
             <div className="border border-slate-100 rounded-lg p-2 flex flex-col justify-center">
                <span className="text-[7px] text-slate-500 block mb-0.5">On Leave / Outing</span>
                <span className="text-[11px] font-bold text-slate-900">64</span>
             </div>
          </div>
        </div>

        {/* Leave Applications */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <div className="flex justify-between items-center mb-3">
             <h3 className="text-[11px] font-bold text-slate-800">Leave Applications</h3>
             <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View All</a>
          </div>
          <div className="flex items-center justify-center gap-4 flex-1">
             <div className="w-24 h-24 relative shrink-0">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie data={leaveApplications} cx="50%" cy="50%" innerRadius={28} outerRadius={40} dataKey="value" stroke="none">
                     {leaveApplications.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={entry.color} />
                     ))}
                   </Pie>
                 </PieChart>
               </ResponsiveContainer>
               <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-[13px] font-bold text-slate-800">64</span>
                  <span className="text-[6px] text-slate-500 leading-tight">Total Requests</span>
               </div>
             </div>
             <div className="flex flex-col gap-1.5 text-[9px] flex-1">
               {leaveApplications.map((item, i) => (
                 <div key={i} className="flex items-center justify-between">
                   <div className="flex items-center gap-1.5">
                     <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                     <span className="text-slate-600 text-[9px] font-medium whitespace-nowrap">{item.name}</span>
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

      </div>

      {/* Second Row Workspace */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4">
        
        {/* Recent Room Allotment */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-4 flex flex-col">
          <div className="flex justify-between items-center mb-3">
             <h3 className="text-[11px] font-bold text-slate-800">Recent Room Allotment</h3>
             <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View All</a>
          </div>
          
          <div className="flex-1 overflow-x-auto">
             <table className="w-full text-[9px] text-left">
                <thead>
                   <tr className="text-slate-500 border-b border-slate-100">
                      <th className="pb-2 font-medium">Student Name</th>
                      <th className="pb-2 font-medium">Hostel</th>
                      <th className="pb-2 font-medium">Room No.</th>
                      <th className="pb-2 font-medium text-center">Bed No.</th>
                      <th className="pb-2 font-medium">Allotment Date</th>
                      <th className="pb-2 font-medium">Status</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                   {recentAllotments.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                         <td className="py-2 text-slate-800 font-medium">{row.student}</td>
                         <td className="py-2 text-slate-600">{row.hostel}</td>
                         <td className="py-2 text-slate-600">{row.room}</td>
                         <td className="py-2 text-center text-slate-600">{row.bed}</td>
                         <td className="py-2 text-slate-600 whitespace-nowrap">{row.date}</td>
                         <td className="py-2"><span className="text-[7px] font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded border border-green-200">{row.status}</span></td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
        </div>

        {/* Mess Dashboard */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-5 flex flex-col">
           <div className="flex justify-between items-center mb-4">
             <h3 className="text-[11px] font-bold text-slate-800">Mess Dashboard <span className="font-normal text-slate-500">(This Month)</span></h3>
           </div>
           
           <div className="grid grid-cols-4 gap-2 mb-4">
              <div className="bg-slate-50 rounded border border-slate-100 p-2 flex flex-col items-center justify-center text-center">
                 <span className="text-[7px] text-slate-500 font-medium mb-1 line-clamp-1">Total Collection</span>
                 <span className="text-[10px] font-bold text-blue-600 truncate">₹ 8,75,600</span>
              </div>
              <div className="bg-slate-50 rounded border border-slate-100 p-2 flex flex-col items-center justify-center text-center">
                 <span className="text-[7px] text-slate-500 font-medium mb-1 line-clamp-1">Total Expense</span>
                 <span className="text-[10px] font-bold text-slate-900 truncate">₹ 6,27,040</span>
              </div>
              <div className="bg-green-50 rounded border border-green-100 p-2 flex flex-col items-center justify-center text-center">
                 <span className="text-[7px] text-green-700 font-medium mb-1 line-clamp-1">Mess Balance</span>
                 <span className="text-[10px] font-bold text-green-700 truncate">₹ 2,48,560</span>
              </div>
              <div className="bg-slate-50 rounded border border-slate-100 p-2 flex flex-col items-center justify-center text-center">
                 <span className="text-[7px] text-slate-500 font-medium mb-1 line-clamp-1">Students Opted</span>
                 <span className="text-[10px] font-bold text-slate-900">1,198</span>
              </div>
           </div>

           <div>
              <h4 className="text-[9px] font-bold text-slate-700 mb-2">Top Meals Preference</h4>
              <div className="flex flex-col gap-2">
                 <div className="flex items-center gap-2">
                    <span className="text-[8px] text-slate-600 w-12 shrink-0">Veg</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                       <div className="bg-green-500 h-full rounded-full" style={{ width: '78%' }}></div>
                    </div>
                    <span className="text-[8px] font-medium text-slate-700 w-6 text-right">78%</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <span className="text-[8px] text-slate-600 w-12 shrink-0">Non-Veg</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                       <div className="bg-orange-500 h-full rounded-full" style={{ width: '18%' }}></div>
                    </div>
                    <span className="text-[8px] font-medium text-slate-700 w-6 text-right">18%</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <span className="text-[8px] text-slate-600 w-12 shrink-0">Eggetarian</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                       <div className="bg-blue-500 h-full rounded-full" style={{ width: '4%' }}></div>
                    </div>
                    <span className="text-[8px] font-medium text-slate-700 w-6 text-right">4%</span>
                 </div>
              </div>
           </div>
        </div>

        {/* Pending Payments */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <div className="flex justify-between items-center mb-3">
             <h3 className="text-[11px] font-bold text-slate-800">Pending Payments</h3>
             <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View All</a>
          </div>
          
          <div className="flex-1 overflow-x-auto">
             <table className="w-full text-[9px] text-left">
                <thead>
                   <tr className="text-slate-500 border-b border-slate-100">
                      <th className="pb-2 font-medium">Student Name</th>
                      <th className="pb-2 font-medium">Hostel</th>
                      <th className="pb-2 font-medium text-right">Due Amount</th>
                      <th className="pb-2 font-medium text-right">Due Date</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                   {pendingPayments.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                         <td className="py-2 text-slate-800 font-medium">{row.student}</td>
                         <td className="py-2 text-slate-600">{row.hostel}</td>
                         <td className="py-2 text-right font-bold text-slate-800">{row.amount}</td>
                         <td className={`py-2 text-right ${row.isPastDue ? 'text-red-500 font-bold' : 'text-red-400 font-medium'}`}>{row.dueDate}</td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
        </div>

      </div>

      {/* Third Row Workspace */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4">
        
        {/* Hostel Facilities */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Hostel Facilities</h3>
          <div className="grid grid-cols-4 gap-2 flex-1 content-start">
            {facilities.map((action, i) => (
              <button key={i} className="flex flex-col items-center justify-start text-center p-2 rounded-lg border border-slate-100 hover:bg-slate-50 hover:border-slate-200 transition-colors group aspect-square">
                <div className="w-6 h-6 rounded flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                  {action.icon}
                </div>
                <span className="text-[7px] text-slate-600 font-medium leading-tight px-0.5 whitespace-normal">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Maintenance Requests */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-4 flex flex-col">
          <div className="flex justify-between items-center mb-3">
             <h3 className="text-[11px] font-bold text-slate-800">Maintenance Requests</h3>
             <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View All</a>
          </div>
          <div className="flex flex-col gap-3 flex-1 overflow-y-auto pr-1">
             {maintenanceRequests.map((req, i) => (
                <div key={i} className="flex items-center justify-between">
                   <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${req.iconBg}`}>
                        {req.icon}
                      </div>
                      <div className="min-w-0 pr-2">
                         <p className="text-[9px] font-bold text-slate-800 leading-tight truncate">{req.issue}</p>
                         <p className="text-[8px] text-slate-500 truncate mt-0.5">{req.location}</p>
                      </div>
                   </div>
                   <div className="flex flex-col items-end shrink-0">
                      <span className="text-[7px] text-slate-500">{req.date}</span>
                      <span className={`text-[7px] font-bold mt-0.5 ${req.statusColor}`}>{req.status}</span>
                   </div>
                </div>
             ))}
          </div>
        </div>

        {/* Visitor Log (Today) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <div className="flex justify-between items-center mb-3">
             <h3 className="text-[11px] font-bold text-slate-800">Visitor Log <span className="font-normal text-slate-500">(Today)</span></h3>
             <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View All</a>
          </div>
          
          <div className="flex-1 overflow-x-auto">
             <table className="w-full text-[8px] text-left">
                <thead>
                   <tr className="text-slate-500 border-b border-slate-100">
                      <th className="pb-1.5 font-medium">Visitor Name</th>
                      <th className="pb-1.5 font-medium">Student Name</th>
                      <th className="pb-1.5 font-medium text-center">In Time</th>
                      <th className="pb-1.5 font-medium text-center">Out Time</th>
                      <th className="pb-1.5 font-medium">Purpose</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                   {visitorLog.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                         <td className="py-1.5 text-slate-800 font-medium whitespace-nowrap">{row.visitorName}</td>
                         <td className="py-1.5 text-slate-600 whitespace-nowrap">{row.studentName}</td>
                         <td className="py-1.5 text-center font-medium text-slate-800">{row.inTime}</td>
                         <td className="py-1.5 text-center text-slate-500">{row.outTime}</td>
                         <td className="py-1.5 text-slate-600">{row.purpose}</td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-2 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Quick Actions</h3>
          <div className="grid grid-cols-4 gap-2 flex-1 content-start">
            {quickActions.map((action, i) => (
              <button key={i} className="flex flex-col items-center justify-start text-center p-1.5 rounded-lg border border-slate-100 hover:bg-slate-50 hover:border-slate-200 transition-colors group">
                <div className="w-6 h-6 rounded flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                  {action.icon}
                </div>
                <span className="text-[7px] text-slate-600 font-medium leading-tight px-0.5 whitespace-normal">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Fourth Row Workspace */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4">
         
         {/* Hostel Overview */}
         <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-4 flex flex-col">
            <div className="flex justify-between items-center mb-3">
               <h3 className="text-[11px] font-bold text-slate-800">Hostel Overview</h3>
               <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View Report</a>
            </div>
            <div className="flex items-center justify-between flex-1">
               <div className="text-center">
                  <span className="text-[7px] text-blue-600 font-medium block mb-1">Total Hostels</span>
                  <span className="text-[13px] font-bold text-slate-900">6</span>
               </div>
               <div className="w-px h-8 bg-slate-200"></div>
               <div className="text-center">
                  <span className="text-[7px] text-slate-500 font-medium block mb-1">Total Rooms</span>
                  <span className="text-[13px] font-bold text-slate-900">312</span>
               </div>
               <div className="w-px h-8 bg-slate-200"></div>
               <div className="text-center">
                  <span className="text-[7px] text-slate-500 font-medium block mb-1">Occupied Rooms</span>
                  <span className="text-[13px] font-bold text-slate-900">276</span>
               </div>
               <div className="w-px h-8 bg-slate-200"></div>
               <div className="text-center">
                  <span className="text-[7px] text-slate-500 font-medium block mb-1">Vacant Rooms</span>
                  <span className="text-[13px] font-bold text-slate-900">36</span>
               </div>
               <div className="w-px h-8 bg-slate-200"></div>
               <div className="text-center">
                  <span className="text-[7px] text-slate-500 font-medium block mb-1">Total Students</span>
                  <span className="text-[13px] font-bold text-slate-900">1,248</span>
               </div>
               <div className="w-px h-8 bg-slate-200"></div>
               <div className="text-center">
                  <span className="text-[7px] text-slate-500 font-medium block mb-1">Staff Members</span>
                  <span className="text-[13px] font-bold text-slate-900">48</span>
               </div>
            </div>
         </div>

         {/* Attendance Summary */}
         <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
            <h3 className="text-[11px] font-bold text-slate-800 mb-3">Attendance Summary <span className="font-normal text-slate-500">(Today)</span></h3>
            <div className="flex gap-2 flex-1">
               <div className="flex-1 bg-slate-50 rounded border border-slate-100 p-2 flex flex-col items-center justify-center">
                  <div className="flex items-center gap-1 mb-1">
                     <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                     <span className="text-[8px] text-slate-600 font-medium">Present</span>
                  </div>
                  <span className="text-[13px] font-bold text-slate-900 mb-1">1,176</span>
                  <span className="text-[7px] text-green-600 font-bold flex items-center gap-0.5"><TrendingUp size={8}/> 94.23%</span>
               </div>
               <div className="flex-1 bg-slate-50 rounded border border-slate-100 p-2 flex flex-col items-center justify-center">
                  <div className="flex items-center gap-1 mb-1">
                     <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                     <span className="text-[8px] text-slate-600 font-medium">Absent</span>
                  </div>
                  <span className="text-[13px] font-bold text-slate-900 mb-1">42</span>
                  <span className="text-[7px] text-red-600 font-bold flex items-center gap-0.5"><TrendingDown size={8}/> 3.37%</span>
               </div>
               <div className="flex-1 bg-slate-50 rounded border border-slate-100 p-2 flex flex-col items-center justify-center">
                  <div className="flex items-center gap-1 mb-1">
                     <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                     <span className="text-[8px] text-slate-600 font-medium">On Leave</span>
                  </div>
                  <span className="text-[13px] font-bold text-slate-900 mb-1">30</span>
                  <span className="text-[7px] text-amber-600 font-bold flex items-center gap-0.5"><TrendingUp size={8}/> 2.40%</span>
               </div>
            </div>
         </div>

         {/* Incident Summary */}
         <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-2 flex flex-col">
            <div className="flex justify-between items-center mb-3">
               <h3 className="text-[11px] font-bold text-slate-800">Incident Summary <span className="font-normal text-slate-500">(This Month)</span></h3>
               <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View All</a>
            </div>
            <div className="flex gap-2 flex-1">
               <div className="flex-1 bg-slate-50 rounded border border-slate-100 p-2 flex flex-col items-center justify-center">
                  <span className="text-[8px] text-slate-600 font-medium mb-1">Total Incidents</span>
                  <span className="text-[14px] font-bold text-slate-900">12</span>
               </div>
               <div className="flex-1 bg-slate-50 rounded border border-slate-100 p-2 flex flex-col items-center justify-center">
                  <span className="text-[8px] text-green-700 font-medium mb-1 flex items-center gap-1"><CheckCircle2 size={10} /> Resolved</span>
                  <span className="text-[14px] font-bold text-green-700">9</span>
               </div>
               <div className="flex-1 bg-slate-50 rounded border border-slate-100 p-2 flex flex-col items-center justify-center">
                  <span className="text-[8px] text-red-600 font-medium mb-1">Open</span>
                  <span className="text-[14px] font-bold text-red-600">3</span>
               </div>
            </div>
         </div>

         {/* Important Notices */}
         <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
            <div className="flex justify-between items-center mb-3">
               <h3 className="text-[11px] font-bold text-slate-800">Important Notices</h3>
               <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View All</a>
            </div>
            <div className="flex-1 flex flex-col gap-2 overflow-y-auto">
               {importantNotices.map((notice, i) => (
                  <div key={i} className="flex gap-2 items-center">
                     <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${notice.bg}`}>
                        {notice.icon}
                     </div>
                     <div className="flex-1 min-w-0 flex justify-between items-center">
                        <p className="text-[8px] font-medium text-slate-800 leading-tight truncate">{notice.text}</p>
                        <span className="text-[7px] text-slate-500 whitespace-nowrap ml-2">{notice.date}</span>
                     </div>
                  </div>
               ))}
            </div>
         </div>

      </div>

    </div>
  );
}
