import { useState } from 'react';
import { 
  MessageSquare, Users, MessageCircle, Mail, Bell, FileText, 
  Calendar, ClipboardList, RefreshCcw, History, BarChart2, 
  ChevronDown, Plus, Send, CheckCircle2, AlertCircle, 
  Smartphone, ToggleRight, Settings, Info, TrendingUp,
  PieChart as PieChartIcon
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid, Legend,
  AreaChart, Area
} from 'recharts';

const kpis = [
  { title: 'Total Messages Sent', value: '25,684', subtitle: '↑ 18.5% this month', icon: <MessageSquare size={20} />, color: 'bg-blue-500', iconColor: 'text-blue-500', iconBg: 'bg-blue-100' },
  { title: 'Total Recipients', value: '12,845', subtitle: '↑ 14.2% this month', icon: <Users size={20} />, color: 'bg-green-500', iconColor: 'text-green-500', iconBg: 'bg-green-100' },
  { title: 'SMS Sent', value: '15,420', subtitle: '↑ 16.3% this month', icon: <Send size={20} />, color: 'bg-purple-500', iconColor: 'text-purple-500', iconBg: 'bg-purple-100' },
  { title: 'Email Sent', value: '7,842', subtitle: '↑ 21.7% this month', icon: <Mail size={20} />, color: 'bg-orange-500', iconColor: 'text-orange-500', iconBg: 'bg-orange-100' },
  { title: 'WhatsApp Sent', value: '2,422', subtitle: '↑ 19.8% this month', icon: <MessageCircle size={20} />, color: 'bg-green-500', iconColor: 'text-green-500', iconBg: 'bg-green-100' },
  { title: 'Push Notifications', value: '4,125', subtitle: '↑ 23.9% this month', icon: <Bell size={20} />, color: 'bg-red-500', iconColor: 'text-red-500', iconBg: 'bg-red-100' },
];

const deliveryOverview = [
  { name: 'Delivered', value: 23256, color: '#10b981', percent: '90.5%' },
  { name: 'Read', value: 18742, color: '#3b82f6', percent: '72.9%' },
  { name: 'Failed', value: 1245, color: '#f59e0b', percent: '4.8%' },
  { name: 'Pending', value: 1183, color: '#8b5cf6', percent: '4.6%' },
];

const channelPerformance = [
  { name: 'SMS', value: 15420, color: '#3b82f6' },
  { name: 'Email', value: 7842, color: '#10b981' },
  { name: 'WhatsApp', value: 2422, color: '#f59e0b' },
  { name: 'Push', value: 4125, color: '#8b5cf6' },
];

const recentComms = [
  { title: 'PTM Reminder', desc: 'Dear Parent, This is a reminder for PTM scheduled on...', channel: 'WhatsApp', time: 'Today, 09:15 AM', status: 'Delivered', icon: <MessageCircle size={14} className="text-white" />, bg: 'bg-green-500' },
  { title: 'Fee Payment Reminder', desc: 'Dear Parent, This is a friendly reminder to pay the fee...', channel: 'SMS', time: 'Today, 08:30 AM', status: 'Delivered', icon: <MessageSquare size={14} className="text-white" />, bg: 'bg-blue-500' },
  { title: 'Summer Camp Registration', desc: 'Register your child for the exciting Summer Camp 2025...', channel: 'Email', time: 'Yesterday, 04:20 PM', status: 'Delivered', icon: <Mail size={14} className="text-white" />, bg: 'bg-purple-500' },
  { title: 'Exam Schedule Published', desc: 'The final exam schedule has been published. Please check...', channel: 'Push', time: 'Yesterday, 11:45 AM', status: 'Delivered', icon: <Bell size={14} className="text-white" />, bg: 'bg-amber-500' },
  { title: 'Holiday Notice', desc: 'School will remain closed on 20th May 2025 on account of...', channel: 'SMS', time: '16 May 2025', status: 'Delivered', icon: <MessageSquare size={14} className="text-white" />, bg: 'bg-red-500' },
];

const templates = [
  { name: 'Fee Payment Reminder', type: 'SMS', color: 'text-green-600 bg-green-50 border-green-200' },
  { name: 'Holiday Notice', type: 'SMS', color: 'text-orange-600 bg-orange-50 border-orange-200' },
  { name: 'Event Invitation', type: 'Email', color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { name: 'PTM Reminder', type: 'WhatsApp', color: 'text-green-600 bg-green-50 border-green-200' },
  { name: 'New Admission Welcome', type: 'Email', color: 'text-blue-600 bg-blue-50 border-blue-200' },
];

const automations = [
  { name: 'Fee Payment Reminder', active: true },
  { name: 'Attendance Absent Alert', active: true },
  { name: 'Homework Reminder', active: true },
  { name: 'Birthday Wishes', active: true },
  { name: 'Event Reminder', active: true },
];

const recipientGroups = [
  { name: 'All Parents', count: 8562 },
  { name: 'All Students', count: 6245 },
  { name: 'Teaching Staff', count: 625 },
  { name: 'Non Teaching Staff', count: 248 },
  { name: 'Transport Users', count: 1235 },
  { name: 'Hostel Students', count: 356 },
];

const scheduledMessages = [
  { title: 'Weekly Newsletter', channel: 'Email', date: '18 May 2025', time: '10:00 AM', recipients: '8,562', status: 'Scheduled' },
  { title: 'Transport Route Update', channel: 'SMS', date: '18 May 2025', time: '05:00 PM', recipients: '1,235', status: 'Scheduled' },
  { title: 'Sports Event Invitation', channel: 'WhatsApp', date: '19 May 2025', time: '09:00 AM', recipients: '6,245', status: 'Scheduled' },
  { title: 'Library Book Due Reminder', channel: 'SMS', date: '19 May 2025', time: '06:00 PM', recipients: '2,156', status: 'Scheduled' },
];

const analyticsData = [
  { day: '11 May', rate: 25 },
  { day: '12 May', rate: 65 },
  { day: '13 May', rate: 45 },
  { day: '14 May', rate: 65 },
  { day: '15 May', rate: 58 },
  { day: '16 May', rate: 75 },
  { day: '17 May', rate: 73.2 },
];

const quickActions = [
  { label: 'Send SMS', icon: <Smartphone size={24} className="text-blue-600" /> },
  { label: 'Send Email', icon: <Mail size={24} className="text-green-600" /> },
  { label: 'Send WhatsApp', icon: <MessageCircle size={24} className="text-emerald-600" /> },
  { label: 'Push Notification', icon: <Bell size={24} className="text-amber-600" /> },
  { label: 'Create Circular', icon: <FileText size={24} className="text-purple-600" /> },
];

const keyBenefits = [
  { title: 'Instant Communication', desc: 'Reach everyone in seconds', icon: <MessageSquare size={16} className="text-blue-600" />, bg: 'bg-blue-50' },
  { title: 'Multi-Channel Messaging', desc: 'SMS, Email, WhatsApp, Push', icon: <Smartphone size={16} className="text-purple-600" />, bg: 'bg-purple-50' },
  { title: 'Automated Reminders', desc: 'Never miss important updates', icon: <Bell size={16} className="text-red-600" />, bg: 'bg-red-50' },
  { title: 'Better Engagement', desc: 'Increase parent & student engagement', icon: <TrendingUp size={16} className="text-green-600" />, bg: 'bg-green-50' },
  { title: 'Time & Cost Saving', desc: 'Automate & streamline communication', icon: <History size={16} className="text-blue-600" />, bg: 'bg-blue-50' },
  { title: 'Track & Analyze', desc: 'Measure performance & improve', icon: <BarChart2 size={16} className="text-indigo-600" />, bg: 'bg-indigo-50' },
];

import { SubModuleView } from './shared/SubModuleView';

export function CommunicationManagementCRM({ currentView = 'Communication Dashboard' }: { currentView?: string }) {
  if (currentView && currentView !== 'Communication Dashboard') {
    return <SubModuleView module="Communication Management" title={currentView} />;
  }

  const [activeTab, setActiveTab] = useState('Total Sent');

  return (
    <div className="flex flex-col space-y-4 h-full relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Communication Management CRM</h2>
          <p className="text-xs text-slate-500 mt-0.5">Connect • Inform • Engage • Everything in One Place</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded px-3 py-1.5 shadow-sm cursor-pointer hover:bg-slate-50">
            <span className="text-slate-700">This Month</span>
            <ChevronDown size={14} className="ml-2 text-slate-400" />
          </div>
          <div className="flex items-center text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded px-3 py-1.5 shadow-sm cursor-pointer hover:bg-slate-50">
            <span className="text-slate-700">All Channels</span>
            <ChevronDown size={14} className="ml-2 text-slate-400" />
          </div>
          <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded flex items-center gap-2 shadow-sm transition-colors">
            <Plus size={14} />
            <span>Create New Message</span>
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
              <div className="text-[8px] flex items-center gap-1 font-bold text-green-600">
                {kpi.subtitle}
              </div>
            )}
            <div className={`absolute bottom-0 left-0 w-full h-0.5 ${kpi.color}`}></div>
          </div>
        ))}
      </div>

      {/* First Row Workspace */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4">
        
        {/* Message Delivery Overview */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[11px] font-bold text-slate-800">Message Delivery Overview</h3>
          </div>
          <div className="flex items-center justify-center gap-4 flex-1">
             <div className="w-24 h-24 relative shrink-0">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie data={deliveryOverview} cx="50%" cy="50%" innerRadius={28} outerRadius={40} dataKey="value" stroke="none">
                     {deliveryOverview.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={entry.color} />
                     ))}
                   </Pie>
                 </PieChart>
               </ResponsiveContainer>
               <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-[12px] font-bold text-slate-800">25,684</span>
                  <span className="text-[6px] text-slate-500 leading-tight">Total Sent</span>
               </div>
             </div>
             <div className="flex flex-col gap-1.5 text-[9px] flex-1">
               {deliveryOverview.map((item, i) => (
                 <div key={i} className="flex items-center justify-between">
                   <div className="flex items-center gap-1.5">
                     <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                     <span className="text-slate-600 text-[9px] font-medium whitespace-nowrap">{item.name}</span>
                   </div>
                   <div className="flex items-center gap-1 text-[8px]">
                      <span className="font-bold text-slate-800">{item.value.toLocaleString()}</span>
                      <span className="text-slate-400">({item.percent})</span>
                   </div>
                 </div>
               ))}
             </div>
          </div>
          
          <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 text-center">
            <div>
               <span className="text-[8px] text-slate-500 block mb-0.5 font-medium">Delivery Rate</span>
               <span className="text-[12px] font-bold text-green-600">90.5%</span>
            </div>
            <div>
               <span className="text-[8px] text-slate-500 block mb-0.5 font-medium">Read Rate</span>
               <span className="text-[12px] font-bold text-blue-600">72.9%</span>
            </div>
            <div>
               <span className="text-[8px] text-slate-500 block mb-0.5 font-medium">Failure Rate</span>
               <span className="text-[12px] font-bold text-red-500">4.8%</span>
            </div>
          </div>
        </div>

        {/* Channel Wise Performance */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-5 flex flex-col relative">
          <div className="flex justify-between items-center mb-1">
            <h3 className="text-[11px] font-bold text-slate-800">Channel Wise Performance</h3>
          </div>
          <div className="flex gap-2 border-b border-slate-100 pb-2 mb-2 mt-2">
             {['Total Sent', 'Delivered', 'Read', 'Failed'].map((tab) => (
               <button 
                 key={tab}
                 onClick={() => setActiveTab(tab)}
                 className={`text-[9px] font-bold py-1 px-3 rounded-full transition-colors ${activeTab === tab ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-slate-500 hover:bg-slate-50'}`}
               >
                 {tab}
               </button>
             ))}
          </div>
          <div className="flex-1 w-full h-full min-h-[140px] relative">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={channelPerformance} margin={{ top: 15, right: 0, left: -20, bottom: 0 }} barSize={24}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                 <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b' }} dy={10} />
                 <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#64748b' }} tickFormatter={(val) => val >= 1000 ? `${val/1000}K` : val} />
                 <RechartsTooltip cursor={{fill: '#f1f5f9'}} contentStyle={{ fontSize: '9px', borderRadius: '4px', padding: '4px' }} />
                 <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                   {channelPerformance.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={entry.color} />
                   ))}
                 </Bar>
               </BarChart>
             </ResponsiveContainer>
          </div>
          {/* Custom Labels on top of bars to mimic design */}
          <div className="absolute inset-0 pointer-events-none" style={{ left: '50px', right: '10px', top: '70px', bottom: '30px' }}>
             <div className="relative w-full h-full">
                <span className="absolute text-[8px] font-bold text-slate-800" style={{ left: '10%', top: '5%' }}>15,420</span>
                <span className="absolute text-[8px] font-bold text-slate-800" style={{ left: '35%', top: '45%' }}>7,842</span>
                <span className="absolute text-[8px] font-bold text-slate-800" style={{ left: '60%', top: '70%' }}>2,422</span>
                <span className="absolute text-[8px] font-bold text-slate-800" style={{ left: '85%', top: '65%' }}>4,125</span>
             </div>
          </div>
        </div>

        {/* Recent Communications */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-4 flex flex-col">
          <div className="flex justify-between items-center mb-4">
             <h3 className="text-[11px] font-bold text-slate-800">Recent Communications</h3>
             <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View All</a>
          </div>
          <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
             {recentComms.map((comm, i) => (
                <div key={i} className="flex gap-3">
                   <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${comm.bg} shadow-sm`}>
                      {comm.icon}
                   </div>
                   <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                         <p className="text-[9px] font-bold text-slate-800 leading-tight">{comm.title}</p>
                         <span className="text-[7px] font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded border border-green-200 shrink-0">{comm.status}</span>
                      </div>
                      <p className="text-[8px] text-slate-500 mt-0.5 leading-snug truncate pr-4">{comm.desc}</p>
                      <div className="flex justify-between items-center mt-1">
                         <span className="text-[7px] font-medium text-slate-400">{comm.channel}</span>
                         <span className="text-[7px] text-slate-400">{comm.time}</span>
                      </div>
                   </div>
                </div>
             ))}
          </div>
        </div>

      </div>

      {/* Second Row Workspace */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4">
        
        {/* Quick Compose */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-800 mb-3">Quick Compose</h3>
          <div className="grid grid-cols-3 gap-2 flex-1 content-start">
            {quickActions.map((action, i) => (
              <button key={i} className="flex flex-col items-center justify-center text-center p-2 rounded-xl border border-slate-100 hover:bg-slate-50 hover:border-slate-200 transition-colors group">
                <div className="mb-2 group-hover:scale-110 transition-transform bg-white rounded-full p-1.5 shadow-sm border border-slate-100">
                  {action.icon}
                </div>
                <span className="text-[7.5px] text-slate-700 font-bold leading-tight px-0.5 whitespace-normal">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Message Templates */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <div className="flex justify-between items-center mb-4">
             <h3 className="text-[11px] font-bold text-slate-800">Message Templates</h3>
             <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View All</a>
          </div>
          <div className="flex flex-col gap-3 flex-1 overflow-y-auto">
             {templates.map((tpl, i) => (
                <div key={i} className="flex items-center justify-between group cursor-pointer">
                   <div className="flex items-center gap-2">
                     <FileText size={14} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                     <span className="text-[9px] font-medium text-slate-700 group-hover:text-blue-600 transition-colors">{tpl.name}</span>
                   </div>
                   <span className={`text-[7px] font-bold px-1.5 py-0.5 rounded border ${tpl.color}`}>{tpl.type}</span>
                </div>
             ))}
          </div>
        </div>

        {/* Automation & Reminders */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <div className="flex justify-between items-center mb-4">
             <h3 className="text-[11px] font-bold text-slate-800">Automation & Reminders</h3>
          </div>
          <div className="flex flex-col gap-3 flex-1 overflow-y-auto">
             {automations.map((auto, i) => (
                <div key={i} className="flex items-center justify-between group">
                   <div className="flex items-center gap-2">
                     <div className="w-5 h-5 rounded bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                        <RefreshCcw size={12} />
                     </div>
                     <span className="text-[9px] font-medium text-slate-700 truncate w-32">{auto.name}</span>
                   </div>
                   <div className="w-7 h-4 bg-green-500 rounded-full flex items-center justify-end p-0.5 cursor-pointer shrink-0">
                      <div className="w-3 h-3 bg-white rounded-full shadow-sm"></div>
                   </div>
                </div>
             ))}
          </div>
        </div>

        {/* Recipient Groups */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <div className="flex justify-between items-center mb-4">
             <h3 className="text-[11px] font-bold text-slate-800">Recipient Groups</h3>
             <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View All</a>
          </div>
          <div className="flex flex-col gap-3 flex-1 overflow-y-auto">
             {recipientGroups.map((group, i) => (
                <div key={i} className="flex items-center justify-between group cursor-pointer hover:bg-slate-50 p-1 -mx-1 rounded">
                   <span className="text-[9px] font-medium text-slate-700">{group.name}</span>
                   <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-bold text-slate-900">{group.count.toLocaleString()}</span>
                      <Users size={10} className="text-slate-400" />
                   </div>
                </div>
             ))}
          </div>
        </div>

      </div>

      {/* Third Row Workspace */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        
        {/* Scheduled Messages */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-5 flex flex-col">
          <div className="flex justify-between items-center mb-3">
             <h3 className="text-[11px] font-bold text-slate-800">Scheduled Messages</h3>
             <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View All</a>
          </div>
          <div className="flex-1 overflow-x-auto">
             <table className="w-full text-[8px] text-left">
                <thead>
                   <tr className="text-slate-500 border-b border-slate-100">
                      <th className="pb-2 font-medium">Message Title</th>
                      <th className="pb-2 font-medium">Channel</th>
                      <th className="pb-2 font-medium">Scheduled On</th>
                      <th className="pb-2 font-medium">Scheduled Time</th>
                      <th className="pb-2 font-medium text-right">Recipients</th>
                      <th className="pb-2 font-medium text-center">Status</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                   {scheduledMessages.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                         <td className="py-2 text-slate-800 font-medium truncate max-w-[100px]">{row.title}</td>
                         <td className="py-2 text-slate-600">{row.channel}</td>
                         <td className="py-2 text-slate-600 whitespace-nowrap">{row.date}</td>
                         <td className="py-2 text-slate-600 whitespace-nowrap">{row.time}</td>
                         <td className="py-2 text-right font-bold text-slate-700">{row.recipients}</td>
                         <td className="py-2 text-center">
                            <span className="text-[7px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">{row.status}</span>
                         </td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
        </div>

        {/* Feedback & Surveys */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-3 flex flex-col">
          <div className="flex justify-between items-center mb-3">
             <h3 className="text-[11px] font-bold text-slate-800">Feedback & Surveys</h3>
             <a href="#" className="text-[9px] text-blue-600 font-medium hover:underline">View All</a>
          </div>
          
          <div className="grid grid-cols-3 gap-2 mb-4">
             <div className="border border-slate-100 rounded-lg p-2 text-center bg-slate-50">
                <span className="text-[7px] text-slate-500 block mb-0.5">Active Surveys</span>
                <span className="text-[14px] font-bold text-blue-600">5</span>
             </div>
             <div className="border border-slate-100 rounded-lg p-2 text-center bg-slate-50">
                <span className="text-[7px] text-slate-500 block mb-0.5">Total Responses</span>
                <span className="text-[14px] font-bold text-slate-900">1,248</span>
             </div>
             <div className="border border-slate-100 rounded-lg p-2 text-center bg-slate-50">
                <span className="text-[7px] text-slate-500 block mb-0.5">Response Rate</span>
                <span className="text-[14px] font-bold text-slate-900">82.6%</span>
             </div>
          </div>

          <div className="mt-auto">
             <h4 className="text-[8px] font-medium text-slate-500 mb-1">Recent Survey</h4>
             <div className="flex justify-between items-end mb-1">
                <span className="text-[9px] font-bold text-slate-800">PTM Feedback Survey</span>
                <span className="text-[7px] text-slate-500">812 / 1,000 responses</span>
             </div>
             <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mb-1">
                <div className="bg-blue-600 h-full rounded-full" style={{ width: '81.2%' }}></div>
             </div>
             <div className="text-right text-[7px] font-bold text-slate-700">81.2%</div>
          </div>
        </div>

        {/* Communication Analytics */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm xl:col-span-4 flex flex-col relative">
           <div className="flex justify-between items-center mb-3">
             <h3 className="text-[11px] font-bold text-slate-800">Communication Analytics</h3>
             <select className="text-[8px] border border-slate-200 rounded text-slate-600 focus:outline-none">
               <option>This Month</option>
             </select>
           </div>
           
           <div className="grid grid-cols-4 gap-2 mb-2">
              <div className="text-center">
                 <span className="text-[7px] text-slate-500 font-medium block mb-0.5">Engagement Rate</span>
                 <span className="text-[12px] font-bold text-slate-900 block">73.2%</span>
                 <span className="text-[7px] text-green-600 font-bold flex items-center justify-center gap-0.5"><TrendingUp size={8}/> 12.4%</span>
              </div>
              <div className="text-center">
                 <span className="text-[7px] text-slate-500 font-medium block mb-0.5">Open Rate <span className="text-[6px]">(Email)</span></span>
                 <span className="text-[12px] font-bold text-slate-900 block">68.7%</span>
                 <span className="text-[7px] text-green-600 font-bold flex items-center justify-center gap-0.5"><TrendingUp size={8}/> 10.8%</span>
              </div>
              <div className="text-center">
                 <span className="text-[7px] text-slate-500 font-medium block mb-0.5">Click Rate <span className="text-[6px]">(Email)</span></span>
                 <span className="text-[12px] font-bold text-slate-900 block">12.9%</span>
                 <span className="text-[7px] text-green-600 font-bold flex items-center justify-center gap-0.5"><TrendingUp size={8}/> 8.3%</span>
              </div>
              <div className="text-center">
                 <span className="text-[7px] text-slate-500 font-medium block mb-0.5">Reply Rate</span>
                 <span className="text-[12px] font-bold text-slate-900 block">8.6%</span>
                 <span className="text-[7px] text-green-600 font-bold flex items-center justify-center gap-0.5"><TrendingUp size={8}/> 6.2%</span>
              </div>
           </div>

           <div className="flex-1 w-full min-h-[100px] relative mt-2">
              <span className="absolute top-0 right-4 text-[7px] text-slate-500 font-medium flex items-center gap-1 z-10"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Engagement Rate (%)</span>
              <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={analyticsData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                    <defs>
                       <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                       </linearGradient>
                    </defs>
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 7, fill: '#64748b' }} dy={5} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 7, fill: '#64748b' }} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(val) => `${val}%`} />
                    <RechartsTooltip contentStyle={{ fontSize: '9px', borderRadius: '4px', padding: '4px' }} />
                    <Area type="monotone" dataKey="rate" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorRate)" dot={{ r: 3, fill: '#3b82f6', strokeWidth: 1, stroke: '#fff' }} />
                 </AreaChart>
              </ResponsiveContainer>
           </div>
        </div>

      </div>

      {/* Bottom Banner - Key Benefits */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mt-2">
         {keyBenefits.map((benefit, i) => (
            <div key={i} className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm flex items-center gap-2">
               <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${benefit.bg}`}>
                  {benefit.icon}
               </div>
               <div className="min-w-0">
                  <p className="text-[8px] font-bold text-slate-800 leading-tight truncate">{benefit.title}</p>
                  <p className="text-[7px] text-slate-500 truncate leading-snug">{benefit.desc}</p>
               </div>
            </div>
         ))}
      </div>

    </div>
  );
}
