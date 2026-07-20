import { useState } from 'react';
import { 
  Bus, Map as MapIcon, Users, Navigation, 
  ChevronDown, Plus, Wrench, ShieldAlert, 
  CheckCircle2, AlertTriangle, Clock, MapPin, 
  School, Phone, UserCheck, Settings, 
  ClipboardCheck, BarChart2, IndianRupee, Bell, 
  Activity, ArrowRight, FileText
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, 
  PieChart, Pie, Cell
} from 'recharts';

const kpis = [
  { title: 'Total Buses', value: '24', subtitle: '2 New this year', color: 'bg-amber-500', icon: <Bus size={20} />, iconColor: 'text-amber-500', iconBg: 'bg-amber-100', trendUp: true },
  { title: 'Active Routes', value: '18', subtitle: '2,456 Students', color: 'bg-teal-500', icon: <Navigation size={20} />, iconColor: 'text-teal-500', iconBg: 'bg-teal-100' },
  { title: 'Students Using Transport', value: '1,842', subtitle: '35% of Total Students', color: 'bg-indigo-500', icon: <Users size={20} />, iconColor: 'text-indigo-500', iconBg: 'bg-indigo-100' },
  { title: 'On Trip Now', value: '20 Buses', subtitle: 'Running', color: 'bg-green-500', icon: <Activity size={20} />, iconColor: 'text-green-500', iconBg: 'bg-green-100', statusColor: 'bg-green-500' },
  { title: 'In Campus', value: '3 Buses', subtitle: 'Idle', color: 'bg-blue-500', icon: <Bus size={20} />, iconColor: 'text-blue-500', iconBg: 'bg-blue-100', statusColor: 'bg-blue-500' },
  { title: 'Under Maintenance', value: '1 Bus', subtitle: 'In Service', color: 'bg-red-500', icon: <Wrench size={20} />, iconColor: 'text-red-500', iconBg: 'bg-red-100', statusColor: 'bg-red-500' },
];

const recentUpdates = [
  { time: '5 min ago', title: 'Bus 07', desc: 'Reached Shyam Nagar Stop', icon: <CheckCircle2 size={12} className="text-white" />, bg: 'bg-green-500' },
  { time: '12 min ago', title: 'Bus 12', desc: 'Picked 3 Students', icon: <Users size={12} className="text-white" />, bg: 'bg-amber-500' },
  { time: '18 min ago', title: 'Bus 18', desc: 'On the way to School', icon: <Navigation size={12} className="text-white" />, bg: 'bg-blue-500' },
  { time: '22 min ago', title: 'Bus 21', desc: 'Left last stop', icon: <Clock size={12} className="text-white" />, bg: 'bg-red-500' },
];

const ridershipData = [
  { route: 'R01', students: 186, color: '#3b82f6' },
  { route: 'R02', students: 178, color: '#f59e0b' },
  { route: 'R03', students: 165, color: '#3b82f6' },
  { route: 'R04', students: 142, color: '#f59e0b' },
  { route: 'R05', students: 128, color: '#3b82f6' },
  { route: 'R06', students: 110, color: '#f59e0b' },
  { route: 'R07', students: 98, color: '#3b82f6' },
  { route: 'R08', students: 86, color: '#f59e0b' },
];

const attendanceStats = [
  { name: 'Picked', value: 1795, color: '#10b981' },
  { name: 'Pending Pick', value: 28, color: '#f59e0b' },
  { name: 'Dropped', value: 1742, color: '#10b981' },
  { name: 'Pending Drop', value: 40, color: '#f59e0b' },
];
// Specifically for the donut chart to just show a generic "completed vs remaining" feel
const attendanceChartData = [
  { name: 'Completed', value: 96.8, color: '#10b981' },
  { name: 'Remaining', value: 3.2, color: '#e2e8f0' },
];

const trips = [
  { busNo: 'Bus 07', route: 'Route 01', driver: 'Ramesh Kumar', stops: '12/12', students: '186/186', status: 'On Time', statusColor: 'text-green-600' },
  { busNo: 'Bus 12', route: 'Route 03', driver: 'Sunil Mehta', stops: '10/10', students: '165/165', status: 'On Time', statusColor: 'text-green-600' },
  { busNo: 'Bus 18', route: 'Route 05', driver: 'Imran Khan', stops: '8/8', students: '128/128', status: 'On Time', statusColor: 'text-green-600' },
  { busNo: 'Bus 21', route: 'Route 08', driver: 'Mohan Singh', stops: '6/6', students: '86/86', status: 'On Time', statusColor: 'text-green-600' },
  { busNo: 'Bus 09', route: 'Route 06', driver: 'Rajesh Yadav', stops: '11/11', students: '110/110', status: 'On Time', statusColor: 'text-green-600' },
];

const vehicleHealthData = [
  { name: 'Excellent', value: 18, color: '#10b981' },
  { name: 'Good', value: 4, color: '#3b82f6' },
  { name: 'Under Service', value: 1, color: '#f59e0b' },
  { name: 'Due for Service', value: 1, color: '#ef4444' },
];

const safetyAlerts = [
  { time: '08:15 AM', title: 'Bus 21 - Delayed by 10 mins', desc: 'Traffic congestion at Civil Lines', icon: <AlertTriangle size={14} className="text-white" />, bg: 'bg-red-500' },
  { time: '08:05 AM', title: 'Bus 07 - Reached School', desc: 'All students dropped safely', icon: <CheckCircle2 size={14} className="text-white" />, bg: 'bg-green-500' },
  { time: '07:50 AM', title: 'Bus 12 - Route Change', desc: 'Taking alternate route due to road work', icon: <AlertTriangle size={14} className="text-white" />, bg: 'bg-amber-500' },
  { time: 'Yesterday', title: 'SOS Alert - Resolved', desc: 'Student assistance provided in Bus 18', icon: <ShieldAlert size={14} className="text-white" />, bg: 'bg-green-500' },
];

const topRoutes = [
  { name: 'Route 01 - Shyam Nagar', students: 186, percentage: 100 },
  { name: 'Route 02 - Vaishali Nagar', students: 178, percentage: 95 },
  { name: 'Route 03 - Mansarovar', students: 165, percentage: 88 },
  { name: 'Route 04 - Jagatpura', students: 142, percentage: 76 },
  { name: 'Route 05 - Pratap Nagar', students: 128, percentage: 68 },
];

const quickActions = [
  { label: 'Add New Route', icon: <MapIcon size={16} className="text-blue-600" /> },
  { label: 'Assign Students', icon: <Users size={16} className="text-blue-600" /> },
  { label: 'Track Vehicles (Live)', icon: <Navigation size={16} className="text-blue-600" /> },
  { label: 'Mark Transport Attendance', icon: <UserCheck size={16} className="text-green-600" /> },
  { label: 'Raise Service Request', icon: <Wrench size={16} className="text-blue-600" /> },
  { label: 'Generate Transport Report', icon: <FileText size={16} className="text-slate-600" /> },
  { label: 'Send Parent Notification', icon: <Bell size={16} className="text-blue-600" /> },
  { label: 'Settings', icon: <Settings size={16} className="text-slate-600" /> },
];

import { SubModuleView } from './shared/SubModuleView';

export function TransportManagementCRM({ currentView = 'Transport Dashboard' }: { currentView?: string }) {
  if (currentView && currentView !== 'Transport Dashboard') {
    return <SubModuleView module="Transport Management" title={currentView} />;
  }

  const [activeTripTab, setActiveTripTab] = useState('Morning Trip');

  return (
    <div className="flex flex-col space-y-4 h-full relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Transport Management CRM</h2>
          <p className="text-xs text-slate-500 mt-0.5">Safe • Smart • Reliable School Transport</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded px-3 py-1.5 shadow-sm">
            <span className="text-slate-400 mr-2">Academic Year</span>
            <span>2025-26</span>
            <ChevronDown size={14} className="ml-2 text-slate-400" />
          </div>
          <div className="flex items-center text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded px-3 py-1.5 shadow-sm">
            <span>All Routes</span>
            <ChevronDown size={14} className="ml-2 text-slate-400" />
          </div>
          <button className="bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold text-xs px-4 py-2 rounded flex items-center gap-2 shadow-sm transition-colors">
            <Plus size={14} />
            <span>Add New Route</span>
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
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
                {kpi.statusColor ? (
                  <div className={`w-1.5 h-1.5 rounded-full ${kpi.statusColor}`}></div>
                ) : (
                  kpi.trendUp ? <span className="text-green-500">↑</span> : null
                )}
                <span className={kpi.trendUp ? 'text-green-600' : ''}>{kpi.subtitle}</span>
              </div>
            )}
            <div className={`absolute bottom-0 left-0 w-full h-0.5 ${kpi.color}`}></div>
          </div>
        ))}
      </div>

      {/* First Row Workspace */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        
        {/* Live Vehicle Tracking & Updates */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-6 flex flex-col md:flex-row gap-4">
           {/* Map View */}
           <div className="flex-1 flex flex-col min-h-[250px]">
             <div className="flex justify-between items-center mb-3">
                <h3 className="text-[11px] font-bold text-slate-800">Live Vehicle Tracking</h3>
                <span className="bg-green-500 text-white text-[8px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
                  LIVE
                </span>
             </div>
             
             <div className="flex-1 bg-blue-50/50 rounded-lg border border-slate-200 relative overflow-hidden flex items-center justify-center min-h-[200px]">
                {/* Mock Map Background Grid */}
                <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '20px 20px', opacity: 0.5 }}></div>
                
                {/* School Center */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                   <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center text-white shadow-lg z-10">
                     <School size={16} />
                   </div>
                   <span className="text-[9px] font-bold text-slate-800 mt-1 bg-white/80 px-1 rounded">School</span>
                </div>

                {/* Route Lines (SVG) */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  {/* Route 1 */}
                  <path d="M 50% 50% L 30% 30% L 20% 40%" stroke="#f59e0b" strokeWidth="2" fill="none" strokeDasharray="4 2" />
                  {/* Route 2 */}
                  <path d="M 50% 50% L 70% 30% L 80% 20%" stroke="#10b981" strokeWidth="2" fill="none" strokeDasharray="4 2" />
                  {/* Route 3 */}
                  <path d="M 50% 50% L 20% 70% L 30% 80%" stroke="#8b5cf6" strokeWidth="2" fill="none" strokeDasharray="4 2" />
                  {/* Route 4 */}
                  <path d="M 50% 50% L 80% 70% L 70% 90%" stroke="#ef4444" strokeWidth="2" fill="none" strokeDasharray="4 2" />
                </svg>

                {/* Bus Pins */}
                <div className="absolute top-[30%] left-[30%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                   <div className="bg-amber-500 text-white p-1 rounded-full shadow-md"><Bus size={12} /></div>
                   <div className="bg-white border border-slate-200 rounded px-1.5 py-0.5 mt-1 shadow-sm text-center">
                     <div className="text-[8px] font-bold text-slate-800">Bus 12</div>
                     <div className="text-[6px] text-slate-500">On Trip</div>
                   </div>
                </div>
                
                <div className="absolute top-[25%] left-[75%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                   <div className="bg-green-500 text-white p-1 rounded-full shadow-md"><Bus size={12} /></div>
                   <div className="bg-white border border-slate-200 rounded px-1.5 py-0.5 mt-1 shadow-sm text-center">
                     <div className="text-[8px] font-bold text-slate-800">Bus 07</div>
                     <div className="text-[6px] text-slate-500">On Trip</div>
                   </div>
                </div>

                <div className="absolute top-[75%] left-[25%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                   <div className="bg-purple-500 text-white p-1 rounded-full shadow-md"><Bus size={12} /></div>
                   <div className="bg-white border border-slate-200 rounded px-1.5 py-0.5 mt-1 shadow-sm text-center">
                     <div className="text-[8px] font-bold text-slate-800">Bus 18</div>
                     <div className="text-[6px] text-slate-500">On Trip</div>
                   </div>
                </div>

                <div className="absolute top-[80%] left-[75%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                   <div className="bg-red-500 text-white p-1 rounded-full shadow-md"><Bus size={12} /></div>
                   <div className="bg-white border border-slate-200 rounded px-1.5 py-0.5 mt-1 shadow-sm text-center">
                     <div className="text-[8px] font-bold text-slate-800">Bus 21</div>
                     <div className="text-[6px] text-slate-500">On Trip</div>
                   </div>
                </div>

             </div>
           </div>

           {/* Updates Timeline */}
           <div className="w-full md:w-48 xl:w-56 flex flex-col">
              <div className="flex justify-between items-center mb-3">
                 <h3 className="text-[11px] font-bold text-slate-800">Recent Updates</h3>
                 <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View All</a>
              </div>
              <div className="flex-1 flex flex-col gap-4 overflow-y-auto relative pl-2">
                 <div className="absolute left-[13px] top-2 bottom-2 w-px bg-slate-200"></div>
                 {recentUpdates.map((update, i) => (
                    <div key={i} className="flex gap-3 relative z-10">
                       <div className={`w-6 h-6 rounded-full ${update.bg} flex items-center justify-center shrink-0 border-2 border-white shadow-sm`}>
                          {update.icon}
                       </div>
                       <div className="flex flex-col min-w-0">
                          <p className="text-[10px] font-bold text-slate-800 leading-tight">{update.title}</p>
                          <p className="text-[9px] text-slate-600 mt-0.5 truncate">{update.desc}</p>
                          <p className="text-[8px] text-slate-400 mt-0.5">{update.time}</p>
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        </div>

        {/* Route Wise Ridership */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col relative">
           <div className="flex justify-between items-center mb-1">
             <h3 className="text-[11px] font-bold text-slate-800">Route Wise Ridership</h3>
             <select className="text-[9px] border border-slate-200 rounded text-slate-600 focus:outline-none">
               <option>This Month</option>
             </select>
           </div>
           <div className="flex justify-end mb-2 text-[8px] text-slate-500 items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div> No. of Students
           </div>
           <div className="flex-1 w-full h-full min-h-[160px] relative">
              <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={ridershipData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }} barSize={12}>
                    <XAxis dataKey="route" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b' }} dy={5} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b' }} />
                    <RechartsTooltip cursor={{fill: '#f1f5f9'}} contentStyle={{ fontSize: '10px', borderRadius: '4px', padding: '4px' }} />
                    <Bar dataKey="students" radius={[2, 2, 0, 0]}>
                      {ridershipData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                 </BarChart>
              </ResponsiveContainer>
           </div>
        </div>

        {/* Transport Attendance */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Transport Attendance <span className="font-normal text-slate-500">(Today)</span></h3>
          <div className="flex items-center gap-4 flex-1">
             <div className="w-24 h-24 relative shrink-0">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie data={attendanceChartData} cx="50%" cy="50%" innerRadius={28} outerRadius={40} dataKey="value" stroke="none">
                     {attendanceChartData.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={entry.color} />
                     ))}
                   </Pie>
                 </PieChart>
               </ResponsiveContainer>
               <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-[13px] font-bold text-slate-800">96.8%</span>
                  <span className="text-[6px] text-slate-500 leading-tight">Students<br/>Picked & Dropped</span>
               </div>
             </div>
             
             <div className="flex-1 flex flex-col gap-2 text-[9px]">
               {attendanceStats.map((stat, i) => (
                  <div key={i} className="flex justify-between items-center">
                     <div className="flex items-center gap-1.5">
                        <CheckCircle2 size={10} style={{ color: stat.color }} />
                        <span className="text-slate-600">{stat.name}</span>
                     </div>
                     <span className="font-bold text-slate-800">{stat.value.toLocaleString()}</span>
                  </div>
               ))}
             </div>
          </div>
        </div>

      </div>

      {/* Second Row Workspace */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4">
        
        {/* Today's Trips */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-5 flex flex-col">
          <div className="flex justify-between items-center mb-3">
             <h3 className="text-[11px] font-bold text-slate-800">Today's Trips</h3>
             <span className="text-[8px] font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200">In Progress</span>
          </div>
          <div className="flex gap-2 mb-3">
             <button 
               className={`text-[9px] font-bold py-1.5 px-4 rounded-full transition-colors ${activeTripTab === 'Morning Trip' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
               onClick={() => setActiveTripTab('Morning Trip')}
             >
               Morning Trip
             </button>
             <button 
               className={`text-[9px] font-bold py-1.5 px-4 rounded-full transition-colors ${activeTripTab === 'Evening Trip' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
               onClick={() => setActiveTripTab('Evening Trip')}
             >
               Evening Trip
             </button>
          </div>
          
          <div className="flex-1 overflow-x-auto">
             <table className="w-full text-[9px] text-left">
                <thead>
                   <tr className="text-slate-500 border-b border-slate-100">
                      <th className="pb-2 font-medium">Bus No.</th>
                      <th className="pb-2 font-medium">Route</th>
                      <th className="pb-2 font-medium">Driver</th>
                      <th className="pb-2 font-medium text-center">Stops</th>
                      <th className="pb-2 font-medium text-center">Students</th>
                      <th className="pb-2 font-medium text-right">Status</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                   {trips.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                         <td className="py-2 text-slate-800 font-bold">{row.busNo}</td>
                         <td className="py-2 text-slate-600">{row.route}</td>
                         <td className="py-2 text-slate-600">{row.driver}</td>
                         <td className="py-2 text-center text-slate-600">{row.stops}</td>
                         <td className="py-2 text-center text-slate-600">{row.students}</td>
                         <td className={`py-2 text-right font-bold ${row.statusColor}`}>{row.status}</td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
          <div className="mt-2 text-center">
             <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View All Trips</a>
          </div>
        </div>

        {/* Vehicle Health & Maintenance */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-4 flex flex-col">
           <h3 className="text-[11px] font-bold text-slate-800 mb-4">Vehicle Health & Maintenance</h3>
           <div className="flex items-center gap-4 flex-1">
              
              <div className="flex flex-col items-center flex-1">
                 <div className="w-24 h-24 relative shrink-0 mb-3">
                   <ResponsiveContainer width="100%" height="100%">
                     <PieChart>
                       <Pie data={vehicleHealthData} cx="50%" cy="50%" innerRadius={25} outerRadius={40} dataKey="value" stroke="none">
                         {vehicleHealthData.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={entry.color} />
                         ))}
                       </Pie>
                     </PieChart>
                   </ResponsiveContainer>
                   <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-[13px] font-bold text-slate-800">24</span>
                      <span className="text-[7px] text-slate-500 leading-tight">Total Vehicles</span>
                   </div>
                 </div>
                 
                 <div className="w-full grid grid-cols-2 gap-x-2 gap-y-1.5 text-[8px]">
                   {vehicleHealthData.map((stat, i) => (
                      <div key={i} className="flex justify-between items-center">
                         <div className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stat.color }}></div>
                            <span className="text-slate-600 truncate">{stat.name}</span>
                         </div>
                         <div className="flex items-center gap-1">
                            <span className="font-bold text-slate-800">{stat.value}</span>
                            <span className="text-slate-400">({Math.round((stat.value/24)*100)}%)</span>
                         </div>
                      </div>
                   ))}
                 </div>
              </div>

              <div className="w-px h-full bg-slate-100 hidden sm:block"></div>

              <div className="flex-1 flex flex-col justify-between">
                 <div>
                    <h4 className="text-[9px] font-bold text-slate-700 mb-2">Next Service Due</h4>
                    <div className="flex flex-col gap-2">
                       <div className="text-[9px] bg-blue-50 text-blue-700 border border-blue-100 px-2 py-1.5 rounded">
                          <span className="font-bold">Bus 14</span> - Due in 3 days
                       </div>
                       <div className="text-[9px] bg-blue-50 text-blue-700 border border-blue-100 px-2 py-1.5 rounded">
                          <span className="font-bold">Bus 19</span> - Due in 5 days
                       </div>
                       <div className="text-[9px] bg-blue-50 text-blue-700 border border-blue-100 px-2 py-1.5 rounded">
                          <span className="font-bold">Bus 03</span> - Due in 7 days
                       </div>
                    </div>
                 </div>
                 <button className="mt-3 w-full bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-[9px] font-bold py-1.5 rounded transition-colors">
                    View Maintenance
                 </button>
              </div>

           </div>
        </div>

        {/* Safety & Alerts */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <div className="flex justify-between items-center mb-4">
             <h3 className="text-[11px] font-bold text-slate-800">Safety & Alerts</h3>
             <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View All</a>
          </div>
          <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
             {safetyAlerts.map((alert, i) => (
                <div key={i} className="flex gap-2">
                   <div className={`w-6 h-6 rounded-full ${alert.bg} flex items-center justify-center shrink-0`}>
                      {alert.icon}
                   </div>
                   <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                         <p className="text-[9px] font-bold text-slate-800 leading-tight">{alert.title}</p>
                         <span className="text-[8px] text-slate-500 whitespace-nowrap ml-2">{alert.time}</span>
                      </div>
                      <p className="text-[9px] text-slate-600 mt-0.5 leading-snug">{alert.desc}</p>
                   </div>
                </div>
             ))}
          </div>
        </div>

      </div>

      {/* Third Row Workspace */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4">
        
        {/* Transport Fees Summary */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <div className="flex justify-between items-center mb-4">
             <h3 className="text-[11px] font-bold text-slate-800">Transport Fees Summary</h3>
             <select className="text-[8px] border border-slate-200 rounded text-slate-600 focus:outline-none hidden sm:block">
               <option>This Academic Year</option>
             </select>
          </div>
          <div className="grid grid-cols-3 gap-2 flex-1 mb-4">
             <div className="bg-blue-50 rounded-lg border border-blue-100 p-2 flex flex-col items-center justify-center text-center">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mb-1">
                   <IndianRupee size={12} className="text-blue-600" />
                </div>
                <span className="text-[8px] text-blue-700 font-medium mb-1">Total Dues</span>
                <span className="text-[11px] font-bold text-slate-900">₹ 48,72,000</span>
             </div>
             <div className="bg-green-50 rounded-lg border border-green-100 p-2 flex flex-col items-center justify-center text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 p-1"><CheckCircle2 size={10} className="text-green-500 opacity-50" /></div>
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mb-1">
                   <IndianRupee size={12} className="text-green-600" />
                </div>
                <span className="text-[8px] text-green-700 font-medium mb-1">Collected</span>
                <span className="text-[11px] font-bold text-slate-900 leading-tight">₹ 44,58,600</span>
                <span className="text-[8px] text-green-600 font-bold mt-0.5">(91.5%)</span>
             </div>
             <div className="bg-red-50 rounded-lg border border-red-100 p-2 flex flex-col items-center justify-center text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 p-1"><AlertTriangle size={10} className="text-red-500 opacity-50" /></div>
                <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center mb-1">
                   <IndianRupee size={12} className="text-red-600" />
                </div>
                <span className="text-[8px] text-red-700 font-medium mb-1">Pending</span>
                <span className="text-[11px] font-bold text-slate-900 leading-tight">₹ 4,13,400</span>
                <span className="text-[8px] text-red-600 font-bold mt-0.5">(8.5%)</span>
             </div>
          </div>
          <button className="w-full bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-[10px] font-bold py-1.5 rounded transition-colors">
            View Fee Report
          </button>
        </div>

        {/* Top Routes by Students */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-4 flex flex-col">
          <div className="flex justify-between items-center mb-4">
             <h3 className="text-[11px] font-bold text-slate-800">Top Routes by Students</h3>
             <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View All</a>
          </div>
          <div className="flex flex-col gap-3 flex-1">
             {topRoutes.map((route, i) => (
                <div key={i} className="flex items-center gap-3">
                   <span className="text-[9px] font-bold text-slate-500 w-3">{i+1}</span>
                   <span className="text-[9px] font-medium text-slate-700 w-32 truncate">{route.name}</span>
                   <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div className="bg-blue-500 h-full rounded-full" style={{ width: `${route.percentage}%` }}></div>
                   </div>
                   <span className="text-[9px] font-medium text-slate-600 w-16 text-right">{route.students} Students</span>
                </div>
             ))}
          </div>
        </div>

        {/* Driver & Attendant */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-2 flex flex-col">
          <div className="flex justify-between items-center mb-4">
             <h3 className="text-[11px] font-bold text-slate-800">Driver & Attendant</h3>
          </div>
          <div className="text-center mb-4">
             <span className="text-[9px] text-slate-500">Total Staff</span>
             <span className="text-[14px] font-bold text-slate-900 ml-2">26</span>
          </div>
          <div className="flex gap-2 flex-1 mb-3">
             <div className="flex-1 border border-slate-100 rounded-lg p-2 flex flex-col items-center justify-center text-center">
                <UserCheck size={16} className="text-blue-500 mb-1" />
                <span className="text-[8px] text-slate-600 mb-0.5">Drivers</span>
                <span className="text-[12px] font-bold text-slate-900">18</span>
                <span className="text-[7px] text-green-600 font-medium">On Duty: 16</span>
             </div>
             <div className="flex-1 border border-slate-100 rounded-lg p-2 flex flex-col items-center justify-center text-center">
                <Users size={16} className="text-amber-500 mb-1" />
                <span className="text-[8px] text-slate-600 mb-0.5">Attendants</span>
                <span className="text-[12px] font-bold text-slate-900">8</span>
                <span className="text-[7px] text-green-600 font-medium">On Duty: 7</span>
             </div>
          </div>
          <button className="w-full bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-[10px] font-bold py-1.5 rounded transition-colors">
            View Directory
          </button>
        </div>

        {/* Quick Actions */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Quick Actions</h3>
          <div className="grid grid-cols-4 gap-2 flex-1">
            {quickActions.map((action, i) => (
              <button key={i} className="flex flex-col items-center justify-start text-center p-2 rounded-lg border border-slate-100 hover:bg-slate-50 hover:border-slate-200 transition-colors group">
                <div className="w-6 h-6 rounded flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                  {action.icon}
                </div>
                <span className="text-[7px] text-slate-600 font-medium leading-tight px-0.5">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
