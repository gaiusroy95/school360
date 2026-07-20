import { useState } from 'react';
import { 
  Users, Activity, Package, Clock, Database, ShieldCheck, 
  CheckCircle2, Laptop, Server, HardDrive, Wifi, Shield, 
  Settings, Key, AlertTriangle, Cloud, Calendar, AlertCircle, 
  ChevronRight, ToggleRight, Info, Search, Wrench, DownloadCloud, 
  RefreshCcw, PlayCircle, Zap, Box, Lock, Mail, MessageSquare, 
  FileText, Webhook, BadgeCheck, Power
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer
} from 'recharts';

const kpis = [
  { title: 'Total Users', value: '1,245', subtitle: '↑ 8.5% this month', subtitleColor: 'text-green-600', icon: <Users size={20} />, color: 'text-blue-600', bg: 'bg-blue-100' },
  { title: 'Active Sessions', value: '98', subtitle: '↑ 12.4% this month', subtitleColor: 'text-green-600', icon: <Activity size={20} />, color: 'text-green-600', bg: 'bg-green-100' },
  { title: 'Total Modules', value: '56', subtitle: '24 Active', subtitleColor: 'text-slate-500', icon: <Package size={20} />, color: 'text-purple-600', bg: 'bg-purple-100' },
  { title: 'System Uptime', value: '99.98%', subtitle: 'Excellent', subtitleColor: 'text-green-600', icon: <Clock size={20} />, color: 'text-orange-600', bg: 'bg-orange-100' },
  { title: 'Database Size', value: '245.6 GB', subtitle: 'of 1 TB Used', subtitleColor: 'text-slate-500', icon: <Database size={20} />, color: 'text-teal-600', bg: 'bg-teal-100' },
  { title: 'Security Score', value: '95 / 100', subtitle: 'Excellent', subtitleColor: 'text-green-600', icon: <ShieldCheck size={20} />, color: 'text-red-600', bg: 'bg-red-100' },
];

const resourceUsage = [
  { name: 'CPU Usage', value: 32, total: 100, color: '#3b82f6', limit1: 'Cores: 8', limit2: 'Used: 2.56 GHz' },
  { name: 'Memory Usage', value: 56, total: 100, color: '#10b981', limit1: 'Total: 16 GB', limit2: 'Used: 8.96 GB' },
  { name: 'Disk Usage', value: 24, total: 100, color: '#8b5cf6', limit1: 'Total: 1 TB', limit2: 'Used: 245.6 GB' },
  { name: 'Bandwidth', value: 18, total: 100, color: '#f59e0b', limit1: 'This Month', limit2: '18.6 GB / 100 GB' },
];

const systemHealth = [
  { name: 'Web Server', status: 'Healthy', color: 'text-green-600' },
  { name: 'Database Server', status: 'Healthy', color: 'text-green-600' },
  { name: 'Cache System', status: 'Healthy', color: 'text-green-600' },
  { name: 'Queue System', status: 'Healthy', color: 'text-green-600' },
  { name: 'Backup Process', status: 'Healthy', color: 'text-green-600' },
  { name: 'Email Service', status: 'Healthy', color: 'text-green-600' },
  { name: 'SMS Gateway', status: 'Healthy', color: 'text-green-600' },
  { name: 'File Storage', status: 'Healthy', color: 'text-green-600' },
];

const recentActivities = [
  { text: 'User Login', user: 'admin@school.com', time: '10:28 AM', icon: <Users size={14} className="text-blue-500" />, bg: 'bg-blue-50' },
  { text: 'Backup Completed', user: 'Database backup completed successfully', time: '09:45 AM', icon: <Database size={14} className="text-green-500" />, bg: 'bg-green-50' },
  { text: 'Settings Updated', user: 'General settings updated by Super Admin', time: '09:30 AM', icon: <Settings size={14} className="text-purple-500" />, bg: 'bg-purple-50' },
  { text: 'New User Created', user: 'john.doe@school.com added', time: '09:15 AM', icon: <Users size={14} className="text-blue-500" />, bg: 'bg-blue-50' },
  { text: 'Security Scan', user: 'No threats found in system scan', time: '08:50 AM', icon: <Shield size={14} className="text-red-500" />, bg: 'bg-red-50' },
  { text: 'Module Updated', user: 'Library Management module updated', time: '08:30 AM', icon: <Package size={14} className="text-orange-500" />, bg: 'bg-orange-50' },
];

const activeUsers = [
  { user: 'Super Admin', role: 'Super Admin', ip: '192.168.1.25', lastActivity: '10:30:12 AM' },
  { user: 'Priya Sharma', role: 'Administrator', ip: '192.168.1.26', lastActivity: '10:29:45 AM' },
  { user: 'Rahul Verma', role: 'Teacher', ip: '192.168.1.33', lastActivity: '10:28:31 AM' },
  { user: 'Anita Patel', role: 'Accountant', ip: '192.168.1.45', lastActivity: '10:27:18 AM' },
  { user: 'Vikram Singh', role: 'Receptionist', ip: '192.168.1.52', lastActivity: '10:26:07 AM' },
];

const securityOverview = [
  { label: 'Firewall Status', value: 'Enabled', valueColor: 'text-green-600', icon: <Shield size={14} className="text-blue-500" /> },
  { label: 'SSL Certificate', value: 'Valid (365 days left)', valueColor: 'text-green-600', icon: <Lock size={14} className="text-green-500" /> },
  { label: 'Failed Login Attempts (24h)', value: '5', valueColor: 'text-slate-800', icon: <AlertTriangle size={14} className="text-red-500" /> },
  { label: 'User Password Strength', value: 'Strong', valueColor: 'text-green-600', icon: <Key size={14} className="text-amber-500" /> },
  { label: 'Two Factor Authentication', value: 'Enabled', valueColor: 'text-green-600', icon: <ShieldCheck size={14} className="text-purple-500" /> },
  { label: 'Security Scan', value: 'No Threats Found', valueColor: 'text-green-600', icon: <Search size={14} className="text-teal-500" /> },
];

const systemAlerts = [
  { text: 'Low Disk Space Warning', desc: 'Disk usage is above 85%', date: '16 May 2025', icon: <HardDrive size={14} className="text-orange-500" />, bg: 'bg-orange-50' },
  { text: 'Database Optimization Needed', desc: 'Database optimization recommended', date: '16 May 2025', icon: <Database size={14} className="text-purple-500" />, bg: 'bg-purple-50' },
  { text: 'SSL Certificate Expiring Soon', desc: 'SSL certificate will expire in 30 days', date: '15 May 2025', icon: <Lock size={14} className="text-blue-500" />, bg: 'bg-blue-50' },
  { text: 'Inactive User Accounts', desc: '12 user accounts inactive for 90+ days', date: '15 May 2025', icon: <Users size={14} className="text-amber-500" />, bg: 'bg-amber-50' },
];

const adminTools = [
  { label: 'User Management', desc: 'Manage system users', icon: <Users size={16} className="text-blue-600" /> },
  { label: 'Role & Permission', desc: 'Manage roles & access', icon: <Key size={16} className="text-blue-600" /> },
  { label: 'System Settings', desc: 'Configure system settings', icon: <Settings size={16} className="text-blue-600" /> },
  { label: 'Database Manager', desc: 'Manage databases & tables', icon: <Database size={16} className="text-blue-600" /> },
  { label: 'Backup Manager', desc: 'Backup & restore data', icon: <Cloud size={16} className="text-blue-600" /> },
  { label: 'Server Monitor', desc: 'Monitor server status', icon: <Server size={16} className="text-blue-600" /> },
  { label: 'Security Manager', desc: 'Manage security settings', icon: <ShieldCheck size={16} className="text-blue-600" /> },
  { label: 'Email Templates', desc: 'Manage email templates', icon: <Mail size={16} className="text-blue-600" /> },
  { label: 'SMS Templates', desc: 'Manage SMS templates', icon: <MessageSquare size={16} className="text-blue-600" /> },
  { label: 'System Logs', desc: 'View system logs', icon: <FileText size={16} className="text-blue-600" /> },
  { label: 'API Management', desc: 'Manage API & integrations', icon: <Webhook size={16} className="text-blue-600" /> },
  { label: 'License Manager', desc: 'Manage licenses', icon: <BadgeCheck size={16} className="text-blue-600" /> },
];

const quickActions = [
  { label: 'Clear System Cache', icon: <RefreshCcw size={12} className="text-blue-600" /> },
  { label: 'Rebuild Search Index', icon: <Search size={12} className="text-blue-600" /> },
  { label: 'Optimize Database', icon: <Database size={12} className="text-blue-600" /> },
  { label: 'System Health Check', icon: <Activity size={12} className="text-blue-600" /> },
  { label: 'Update System', icon: <DownloadCloud size={12} className="text-blue-600" /> },
];

const systemInfo = [
  { label: 'Operating System', value: 'Linux (Ubuntu 22.04)', icon: <Laptop size={12} className="text-slate-400" /> },
  { label: 'Web Server', value: 'Nginx 1.24.0', icon: <Server size={12} className="text-slate-400" /> },
  { label: 'PHP Version', value: '8.2.10', icon: <Box size={12} className="text-slate-400" /> },
  { label: 'MySQL Version', value: '8.0.34', icon: <Database size={12} className="text-slate-400" /> },
  { label: 'Laravel Version', value: '10.48.0', icon: <Box size={12} className="text-slate-400" /> },
  { label: 'Time Zone', value: 'Asia/Kolkata (UTC +5:30)', icon: <Clock size={12} className="text-slate-400" /> },
];

const keyBenefits = [
  { title: 'Centralized Control', desc: 'Manage entire system from one place', icon: <Settings size={14} className="text-blue-600" />, bg: 'bg-blue-50' },
  { title: 'Enhanced Security', desc: 'Protect data and prevent threats', icon: <Shield size={14} className="text-green-600" />, bg: 'bg-green-50' },
  { title: 'Better Performance', desc: 'Monitor and optimize system', icon: <Zap size={14} className="text-purple-600" />, bg: 'bg-purple-50' },
  { title: 'Automated Backups', desc: 'Ensure data safety & recovery', icon: <Cloud size={14} className="text-orange-600" />, bg: 'bg-orange-50' },
  { title: 'Audit & Compliance', desc: 'Track activities and ensure compliance', icon: <FileText size={14} className="text-teal-600" />, bg: 'bg-teal-50' },
  { title: 'Scalable Architecture', desc: 'Grow with your institution', icon: <Activity size={14} className="text-indigo-600" />, bg: 'bg-indigo-50' },
];

// Helper for Gauge
const Gauge = ({ value, color, name }: { value: number, color: string, name: string }) => {
  const data = [
    { name: 'Used', value: value },
    { name: 'Free', value: 100 - value },
  ];
  return (
    <div className="relative w-16 h-16 flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            startAngle={220}
            endAngle={-40}
            innerRadius={24}
            outerRadius={32}
            dataKey="value"
            stroke="none"
          >
            <Cell fill={color} />
            <Cell fill="#e2e8f0" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pt-1">
         <span className="text-[12px] font-bold text-slate-800 leading-none">{value}%</span>
         <span className={`text-[6px] font-bold ${color === '#3b82f6' ? 'text-blue-600' : color === '#10b981' ? 'text-green-600' : color === '#8b5cf6' ? 'text-purple-600' : 'text-amber-600'}`}>Normal</span>
      </div>
    </div>
  );
};

export function SystemAdministrationCRM() {
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  return (
    <div className="flex flex-col space-y-4 h-full relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">System Administration</h2>
          <p className="text-xs text-slate-500 mt-0.5">Control • Monitor • Secure • Optimize</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded flex items-center gap-2 shadow-sm transition-colors">
            <CheckCircle2 size={14} />
            <span>System Health: Excellent</span>
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {kpis.map((kpi, i) => (
          <div key={i} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3 hover:shadow-md transition-shadow">
            <div className={`w-10 h-10 rounded-full ${kpi.bg} ${kpi.color} flex items-center justify-center shadow-sm shrink-0`}>
              {kpi.icon}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] text-slate-500 font-bold truncate">{kpi.title}</p>
              <p className={`text-[15px] font-bold text-slate-900 truncate leading-tight mt-0.5`}>{kpi.value}</p>
              <p className={`text-[8px] font-medium mt-0.5 truncate ${kpi.subtitleColor}`}>{kpi.subtitle}</p>
            </div>
          </div>
        ))}
      </div>

      {/* First Row Workspace */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4">
        
        {/* System Overview */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[11px] font-bold text-slate-800">System Overview</h3>
          </div>
          
          <div className="flex items-center gap-3 mb-4">
             <div className="w-10 h-10 rounded border border-slate-200 flex items-center justify-center bg-slate-50 shrink-0">
                <Activity size={20} className="text-blue-600" />
             </div>
             <div>
                <div className="text-[8px] text-slate-500 font-medium">Edition</div>
                <div className="text-[11px] font-bold text-slate-800 leading-tight">Enterprise Edition</div>
             </div>
             <div className="ml-auto text-right">
                <div className="text-[8px] text-slate-500 font-medium">Version</div>
                <div className="text-[11px] font-bold text-slate-800 leading-tight">v3.2.1</div>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-[9px] mb-4">
             <div>
                <span className="text-slate-500 block">Environment</span>
                <span className="font-bold text-slate-800">Production</span>
             </div>
             <div>
                <span className="text-slate-500 block">Server Time</span>
                <span className="font-bold text-slate-800">17 May 2025, 10:30 AM</span>
             </div>
             <div>
                <span className="text-slate-500 block">Server Name</span>
                <span className="font-bold text-slate-800">SRV-360SCHOOLERP-01</span>
             </div>
             <div>
                <span className="text-slate-500 block">IP Address</span>
                <span className="font-bold text-slate-800">192.168.1.25</span>
             </div>
             <div>
                <span className="text-slate-500 block">PHP Version</span>
                <span className="font-bold text-slate-800">8.2.10</span>
             </div>
             <div>
                <span className="text-slate-500 block">Database</span>
                <span className="font-bold text-slate-800">MySQL 8.0</span>
             </div>
          </div>

          <div className="mt-auto border-t border-slate-100 pt-3">
             <div className="flex justify-between items-end mb-1">
                <span className="text-[8px] text-slate-500">Licensed To</span>
                <span className="text-[8px] text-slate-500">License Valid Upto</span>
             </div>
             <div className="flex justify-between items-center">
                <span className="text-[9px] font-bold text-slate-800 truncate pr-2">Redlotus Management & Consultants Pvt Ltd</span>
                <div className="flex items-center gap-2 shrink-0">
                   <span className="text-[9px] font-bold text-slate-800">31 Dec 2026</span>
                   <span className="text-[7px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Active</span>
                </div>
             </div>
          </div>
        </div>

        {/* System Resource Usage */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-4 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[11px] font-bold text-slate-800">System Resource Usage</h3>
          </div>
          <div className="flex-1 grid grid-cols-4 gap-2">
             {resourceUsage.map((res, i) => (
                <div key={i} className="flex flex-col items-center text-center">
                   <span className="text-[8px] font-medium text-slate-600 mb-2">{res.name}</span>
                   <Gauge value={res.value} color={res.color} name={res.name} />
                   <div className="mt-3 w-full">
                      <p className="text-[8px] text-slate-500 truncate">{res.limit1}</p>
                      <p className="text-[8px] font-medium text-slate-700 truncate">{res.limit2}</p>
                   </div>
                </div>
             ))}
          </div>
        </div>

        {/* System Health */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-2 flex flex-col">
          <div className="flex justify-between items-center mb-3">
             <h3 className="text-[11px] font-bold text-slate-800">System Health</h3>
          </div>
          <div className="flex-1 flex flex-col justify-between">
             {systemHealth.map((item, i) => (
                <div key={i} className="flex justify-between items-center text-[9px] py-1 border-b border-slate-50 last:border-0">
                   <span className="text-slate-700 font-medium">{item.name}</span>
                   <span className={`font-bold ${item.color}`}>{item.status}</span>
                </div>
             ))}
          </div>
          <div className="text-center mt-3 pt-2 border-t border-slate-100">
             <a href="#" className="text-[9px] font-bold text-blue-600 hover:underline">View Full Health Report</a>
          </div>
        </div>

        {/* Recent System Activities */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <div className="flex justify-between items-center mb-4">
             <h3 className="text-[11px] font-bold text-slate-800">Recent System Activities</h3>
             <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View All</a>
          </div>
          <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-1">
             {recentActivities.map((activity, i) => (
                <div key={i} className="flex gap-2 items-start">
                   <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${activity.bg}`}>
                      {activity.icon}
                   </div>
                   <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-bold text-slate-800 leading-tight truncate">{activity.text}</p>
                      <p className="text-[7.5px] text-slate-500 mt-0.5 leading-snug">{activity.user}</p>
                   </div>
                   <span className="text-[7px] text-slate-500 whitespace-nowrap pt-0.5 shrink-0">{activity.time}</span>
                </div>
             ))}
          </div>
        </div>

      </div>

      {/* Second Row Workspace */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4">
        
        {/* Active Users (Live) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-4 flex flex-col">
          <div className="flex justify-between items-center mb-3">
             <h3 className="text-[11px] font-bold text-slate-800">Active Users (Live)</h3>
             <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View All</a>
          </div>
          
          <div className="flex-1 overflow-x-auto">
             <table className="w-full text-[8px] text-left">
                <thead>
                   <tr className="text-slate-500 border-b border-slate-100">
                      <th className="pb-2 font-medium">User</th>
                      <th className="pb-2 font-medium">Role</th>
                      <th className="pb-2 font-medium">IP Address</th>
                      <th className="pb-2 font-medium text-right">Last Activity</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                   {activeUsers.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                         <td className="py-2 text-slate-800 font-medium whitespace-nowrap pr-2">{row.user}</td>
                         <td className="py-2 text-slate-600">{row.role}</td>
                         <td className="py-2 text-blue-600">{row.ip}</td>
                         <td className="py-2 text-right text-slate-600 whitespace-nowrap">{row.lastActivity}</td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
        </div>

        {/* Database Overview */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-2 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[11px] font-bold text-slate-800">Database Overview</h3>
            <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View Details</a>
          </div>
          <div className="flex items-center gap-4 flex-1">
             <div className="w-12 shrink-0 flex flex-col justify-center">
                <Database size={40} className="text-blue-600 mx-auto" />
             </div>
             <div className="flex-1 grid grid-cols-2 gap-y-3 gap-x-2">
                <div>
                   <span className="text-[7.5px] font-medium text-slate-500 block mb-0.5">Total Databases</span>
                   <span className="text-[11px] font-bold text-slate-800">1</span>
                </div>
                <div>
                   <span className="text-[7.5px] font-medium text-slate-500 block mb-0.5">Total Tables</span>
                   <span className="text-[11px] font-bold text-slate-800">358</span>
                </div>
                <div>
                   <span className="text-[7.5px] font-medium text-slate-500 block mb-0.5">Total Records</span>
                   <span className="text-[11px] font-bold text-slate-800">12.6 M</span>
                </div>
                <div>
                   <span className="text-[7.5px] font-medium text-slate-500 block mb-0.5">Size</span>
                   <span className="text-[11px] font-bold text-slate-800">245.6 GB</span>
                </div>
             </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
             <div>
                <span className="text-[7px] text-slate-500 block">Last Optimization</span>
                <span className="text-[8px] font-bold text-slate-800">16 May 2025, 11:45 PM</span>
             </div>
             <button className="border border-blue-600 text-blue-600 hover:bg-blue-50 font-bold text-[9px] px-3 py-1 rounded transition-colors flex items-center gap-1">
                <RefreshCcw size={10} /> Optimize Now
             </button>
          </div>
        </div>

        {/* Backup Summary */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-2 flex flex-col">
          <div className="flex justify-between items-center mb-3">
             <h3 className="text-[11px] font-bold text-slate-800">Backup Summary</h3>
             <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View All</a>
          </div>
          
          <div className="flex-1 flex flex-col gap-3 justify-center">
             <div className="flex items-start gap-2">
                <Clock size={12} className="text-blue-500 mt-0.5 shrink-0" />
                <div>
                   <span className="text-[8px] font-bold text-slate-800 block leading-none mb-0.5">Last Backup</span>
                   <span className="text-[7.5px] text-slate-600">16 May 2025, 11:45 PM</span>
                   <span className="text-[7px] text-green-600 block">Full Backup</span>
                </div>
             </div>
             <div className="flex items-start gap-2">
                <Clock size={12} className="text-green-500 mt-0.5 shrink-0" />
                <div>
                   <span className="text-[8px] font-bold text-slate-800 block leading-none mb-0.5">Next Scheduled</span>
                   <span className="text-[7.5px] text-slate-600">17 May 2025, 11:45 PM</span>
                </div>
             </div>
             <div className="flex items-start gap-2">
                <HardDrive size={12} className="text-purple-500 mt-0.5 shrink-0" />
                <div>
                   <span className="text-[8px] font-bold text-slate-800 block leading-none mb-0.5">Backup Size</span>
                   <span className="text-[11px] font-bold text-slate-800">12.45 GB</span>
                </div>
             </div>
             <div>
                <span className="text-[7px] text-slate-500 block text-center">Backup Location</span>
                <span className="text-[8px] font-bold text-slate-800 block text-center">Cloud Storage</span>
             </div>
          </div>
          <button className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] px-4 py-2 rounded shadow-sm transition-colors flex items-center justify-center gap-1.5">
             <Cloud size={12} /> Run Backup Now
          </button>
        </div>

        {/* Security Overview */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-2 flex flex-col">
          <div className="flex justify-between items-center mb-3">
             <h3 className="text-[11px] font-bold text-slate-800">Security Overview</h3>
             <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View Report</a>
          </div>
          <div className="flex-1 flex flex-col justify-between gap-1.5">
             {securityOverview.map((item, i) => (
                <div key={i} className="flex justify-between items-center text-[8.5px] p-1.5 bg-slate-50 rounded border border-slate-100">
                   <div className="flex items-center gap-1.5">
                      {item.icon}
                      <span className="text-slate-700 font-medium">{item.label}</span>
                   </div>
                   <span className={`font-bold ${item.valueColor}`}>{item.value}</span>
                </div>
             ))}
          </div>
        </div>

        {/* System Alerts */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-2 flex flex-col">
          <div className="flex justify-between items-center mb-3">
             <h3 className="text-[11px] font-bold text-slate-800">System Alerts</h3>
             <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View All</a>
          </div>
          <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-1">
             {systemAlerts.map((alert, i) => (
                <div key={i} className="flex gap-2 items-start">
                   <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${alert.bg}`}>
                      {alert.icon}
                   </div>
                   <div className="flex-1 min-w-0">
                      <p className="text-[8.5px] font-bold text-slate-800 leading-tight">{alert.text}</p>
                      <p className="text-[7px] text-slate-500 mt-0.5 leading-snug truncate">{alert.desc}</p>
                   </div>
                   <span className="text-[7px] text-slate-400 whitespace-nowrap pt-0.5">{alert.date}</span>
                </div>
             ))}
          </div>
        </div>

      </div>

      {/* Third Row Workspace */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4">
        
        {/* Administration Tools */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-7 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-4">Administration Tools</h3>
          <div className="grid grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-2 flex-1 content-start">
             {adminTools.map((tool, i) => (
                <button key={i} className="flex flex-col items-center justify-center text-center p-2 rounded-lg border border-slate-100 hover:bg-slate-50 hover:border-slate-200 transition-colors group h-[72px]">
                  <div className="mb-2 group-hover:scale-110 transition-transform bg-white rounded p-1.5 shadow-sm border border-slate-100 text-blue-600">
                    {tool.icon}
                  </div>
                  <span className="text-[8px] text-slate-700 font-bold leading-tight px-0.5">{tool.label}</span>
                  <span className="text-[6.5px] text-slate-500 leading-tight mt-0.5 truncate w-full px-1">{tool.desc}</span>
                </button>
             ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-2 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Quick Actions</h3>
          <div className="flex-1 flex flex-col gap-1">
             {quickActions.map((action, i) => (
                <button key={i} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded text-slate-700 transition-colors group border-b border-slate-50 last:border-0">
                   <div className="flex items-center gap-2">
                      <div className="text-slate-400 group-hover:text-blue-600 transition-colors">
                         {action.icon}
                      </div>
                      <span className="text-[9px] font-medium group-hover:text-blue-700 transition-colors">{action.label}</span>
                   </div>
                   <ChevronRight size={12} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                </button>
             ))}
             
             <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between group cursor-pointer hover:bg-slate-50 p-2 rounded transition-colors" onClick={() => setMaintenanceMode(!maintenanceMode)}>
                <div className="flex items-center gap-2">
                   <Settings size={12} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
                   <span className="text-[9px] font-medium text-slate-700">System Maintenance Mode</span>
                </div>
                {maintenanceMode ? (
                   <ToggleRight size={16} className="text-blue-600" />
                ) : (
                   <div className="w-4 h-4 rounded-full border border-slate-300 bg-slate-100 relative">
                      <div className="w-2 h-2 rounded-full bg-white absolute top-[3px] left-[3px] border border-slate-300"></div>
                   </div>
                )}
             </div>
          </div>
        </div>

        {/* System Information */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">System Information</h3>
          <div className="flex-1 flex flex-col justify-center gap-3">
             {systemInfo.map((info, i) => (
                <div key={i} className="flex items-center justify-between text-[9px]">
                   <div className="flex items-center gap-1.5 text-slate-600">
                      {info.icon}
                      <span className="font-medium">{info.label}</span>
                   </div>
                   <span className="font-bold text-slate-800">{info.value}</span>
                </div>
             ))}
          </div>
        </div>

      </div>

      {/* Bottom Banner - Key Benefits */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2 mt-2">
         {keyBenefits.map((benefit, i) => (
            <div key={i} className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm flex items-center gap-2">
               <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${benefit.bg}`}>
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
