import { useState } from 'react';
import { 
  Building2, Calendar, Users, Building, ShieldCheck, CheckCircle2,
  MapPin, Phone, Link2, Info, GraduationCap, Layout, Book, List, 
  Layers, FileText, Briefcase, CreditCard, Shield, Database, Settings, Mail, Lock,
  DownloadCloud, Eye, Save, BookOpen, Clock, Activity, 
  CreditCard as CardIcon, FileBox, Fingerprint, CalendarDays, 
  ToggleRight, Globe, Smartphone, Key, UploadCloud, ChevronRight, Play, Zap
} from 'lucide-react';

const kpis = [
  { title: 'Institution Status', value: 'Active', subtitle: 'Since 01 Jan 2025', subtitleColor: 'text-slate-500', icon: <CheckCircle2 size={20} />, color: 'text-green-600', bg: 'bg-green-100', valueColor: 'text-green-600' },
  { title: 'Academic Session', value: '2025-26', subtitle: 'Current Session', subtitleColor: 'text-slate-500', icon: <Calendar size={20} />, color: 'text-blue-600', bg: 'bg-blue-100', valueColor: 'text-slate-900' },
  { title: 'Total Classes', value: '45', subtitle: '15 Active Sections', subtitleColor: 'text-slate-500', icon: <Users size={20} />, color: 'text-purple-600', bg: 'bg-purple-100', valueColor: 'text-slate-900' },
  { title: 'Total Departments', value: '12', subtitle: '8 Active Departments', subtitleColor: 'text-slate-500', icon: <Building size={20} />, color: 'text-orange-600', bg: 'bg-orange-100', valueColor: 'text-slate-900' },
  { title: 'Total Users', value: '1,248', subtitle: 'Active Users', subtitleColor: 'text-slate-500', icon: <Users size={20} />, color: 'text-teal-600', bg: 'bg-teal-100', valueColor: 'text-slate-900' },
  { title: 'Setup Completion', value: '92%', subtitle: 'Excellent', subtitleColor: 'text-green-600', icon: <ShieldCheck size={20} />, color: 'text-red-600', bg: 'bg-red-100', valueColor: 'text-slate-900' },
];

import { ExpressSetupView } from './InstitutionSetup/ExpressSetupView';
import { ModuleConfigView } from './InstitutionSetup/ModuleConfigView';

const setupModules = [
  {
    id: 1,
    title: 'Basic Information',
    desc: 'Manage institution identity and contact details',
    icon: <Building2 size={16} className="text-blue-600" />,
    items: ['Institution Profile', 'Address & Contact', 'Logo & Branding', 'Social Media Links', 'About Institution']
  },
  {
    id: 2,
    title: 'Academic Setup',
    desc: 'Configure academic hierarchy and study system',
    icon: <GraduationCap size={16} className="text-indigo-600" />,
    items: ['Education Board', 'Medium of Instruction', 'Academic Structure', 'Stream & Group', 'Promotion Criteria']
  },
  {
    id: 3,
    title: 'Classes & Sections',
    desc: 'Create and manage classes and sections',
    icon: <Layers size={16} className="text-pink-600" />,
    items: ['Class Management', 'Section Management', 'Class Teacher Assign', 'Section Capacity', 'Section Room Mapping']
  },
  {
    id: 4,
    title: 'Subjects Setup',
    desc: 'Manage subjects for different classes',
    icon: <BookOpen size={16} className="text-blue-600" />,
    items: ['Subject Master', 'Subject Code', 'Subject Type', 'Subject Group', 'Elective Subjects']
  },
  {
    id: 5,
    title: 'Departments Setup',
    desc: 'Create and manage departments',
    icon: <Briefcase size={16} className="text-purple-600" />,
    items: ['Department List', 'HOD / Incharge', 'Department Staff', 'Department Location', 'Department Budget']
  },
  {
    id: 6,
    title: 'Session & Term Setup',
    desc: 'Manage academic terms and holidays',
    icon: <Clock size={16} className="text-orange-600" />,
    items: ['Academic Session', 'Terms / Semesters', 'Important Dates', 'Holidays', 'Examination Periods']
  },
  {
    id: 7,
    title: 'Grade & Marks Setup',
    desc: 'Setup grading and evaluation system',
    icon: <Activity size={16} className="text-green-600" />,
    items: ['Grading System', 'Marks Configuration', 'Pass / Fail Criteria', 'GPA / CGPA Settings', 'Rank Configuration']
  },
  {
    id: 8,
    title: 'Fee Group Setup',
    desc: 'Define fee structures and policies',
    icon: <CardIcon size={16} className="text-teal-600" />,
    items: ['Fee Group Master', 'Fee Type Setup', 'Installment Setup', 'Concession & Discount', 'Late Fee Configuration']
  },
  {
    id: 9,
    title: 'Document Setup',
    desc: 'Upload and manage important documents',
    icon: <FileBox size={16} className="text-amber-600" />,
    items: ['Document Categories', 'Document Types', 'Document Templates', 'Required Documents', 'Document Numbering']
  },
  {
    id: 10,
    title: 'ID Card & Numbering',
    desc: 'Configure identity cards and auto-numbering',
    icon: <Fingerprint size={16} className="text-blue-600" />,
    items: ['ID Card Templates', 'Roll Number Format', 'Admission Number', 'Employee Code Format', 'Invoice Numbering']
  },
  {
    id: 11,
    title: 'Calendar Setup',
    desc: 'Manage institution events and calendars',
    icon: <CalendarDays size={16} className="text-red-500" />,
    items: ['Academic Calendar', 'Event Calendar', 'Exam Calendar', 'Holiday Calendar', 'Custom Events']
  },
  {
    id: 12,
    title: 'Custom Fields Setup',
    desc: 'Create custom fields for data management',
    icon: <ToggleRight size={16} className="text-indigo-500" />,
    items: ['Student Custom Fields', 'Employee Custom Fields', 'Parent Custom Fields', 'Admission Custom Fields', 'Custom Field Types']
  },
  {
    id: 13,
    title: 'Notification Setup',
    desc: 'Configure automated alerts and messaging',
    icon: <Mail size={16} className="text-purple-500" />,
    items: ['Email Notifications', 'SMS Notifications', 'Push Notifications', 'Notification Templates', 'Notification Preferences']
  },
  {
    id: 14,
    title: 'Other Preferences',
    desc: 'Configure system-wide preferences',
    icon: <Settings size={16} className="text-slate-600" />,
    items: ['Language Settings', 'Currency Settings', 'Time Zone Settings', 'System Preferences', 'Display Preferences']
  },
  {
    id: 15,
    title: 'Integration Setup',
    desc: 'Integrate with third-party services',
    icon: <Globe size={16} className="text-blue-500" />,
    items: ['Payment Gateway', 'SMS Gateway', 'Email Gateway', 'API Integrations', 'Single Sign-On (SSO)']
  },
  {
    id: 16,
    title: 'Backup & Recovery',
    desc: 'Manage data safety and restoration',
    icon: <Database size={16} className="text-green-600" />,
    items: ['Auto Backup Settings', 'Backup Schedule', 'Restore Data', 'Backup History', 'Backup Location']
  },
  {
    id: 17,
    title: 'Security Settings',
    desc: 'Define access and security policies',
    icon: <Lock size={16} className="text-red-600" />,
    items: ['Password Policy', 'Login Restrictions', 'Session Timeout', 'IP Restrictions', 'Two Factor Authentication']
  },
  {
    id: 18,
    title: 'Data Import / Export',
    desc: 'Migrate system data efficiently',
    icon: <DownloadCloud size={16} className="text-teal-600" />,
    items: ['Import Students', 'Import Employees', 'Import Parents', 'Export Data', 'Data Mapping']
  }
];

const keyBenefits = [
  { title: 'Centralized Management', desc: 'Manage entire setup from one place', icon: <Layout size={14} className="text-blue-600" />, bg: 'bg-blue-50' },
  { title: 'Data Consistency', desc: 'Ensure uniform data structures', icon: <Database size={14} className="text-green-600" />, bg: 'bg-green-50' },
  { title: 'Time Saving', desc: 'Automated & structured workflows', icon: <Clock size={14} className="text-purple-600" />, bg: 'bg-purple-50' },
  { title: 'Better Control', desc: 'Granular configuration options', icon: <Settings size={14} className="text-orange-600" />, bg: 'bg-orange-50' },
  { title: 'Scalability', desc: 'Grow your system with institution', icon: <Activity size={14} className="text-teal-600" />, bg: 'bg-teal-50' },
  { title: 'Accuracy & Compliance', desc: 'Track activities and ensure rules', icon: <CheckCircle2 size={14} className="text-indigo-600" />, bg: 'bg-indigo-50' },
];

export function InstitutionSetupCRM() {
  const [currentView, setCurrentView] = useState('Overview');

  if (currentView === 'Express Setup') {
    return <ExpressSetupView onBack={() => setCurrentView('Overview')} />;
  }

  const activeModule = setupModules.find(m => m.title === currentView);
  if (activeModule) {
    return <ModuleConfigView module={activeModule} onBack={() => setCurrentView('Overview')} />;
  }

  return (
    <div className="flex flex-col space-y-4 h-full relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Institution Setup</h2>
          <p className="text-xs text-slate-500 mt-0.5">Configure and manage your institution's basic settings and preferences</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={() => setCurrentView('Express Setup')}
            className="bg-indigo-600 text-white hover:bg-indigo-700 font-bold text-xs px-4 py-2 rounded flex items-center gap-2 shadow-sm transition-colors">
            <Zap size={14} />
            <span>Express Setup Engine</span>
          </button>
          <button className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs px-4 py-2 rounded flex items-center gap-2 shadow-sm transition-colors">
            <Eye size={14} className="text-blue-600" />
            <span>View Institution Profile</span>
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
              <p className={`text-[15px] font-bold ${kpi.valueColor} truncate leading-tight mt-0.5`}>{kpi.value}</p>
              <p className={`text-[8px] font-medium mt-0.5 truncate ${kpi.subtitleColor}`}>{kpi.subtitle}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-2">
         <h3 className="text-[13px] font-bold text-slate-800 mb-3">Institution Setup Modules</h3>
      </div>

      {/* Configuration Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5 3xl:grid-cols-6 gap-4 flex-1 pb-4">
         {setupModules.map((card) => (
            <div key={card.id} className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col hover:shadow-md transition-shadow h-full">
               <div className="p-4 border-b border-slate-100 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 text-[12px] font-bold text-blue-600">
                     {card.id}
                  </div>
                  <div>
                     <h3 className="text-[12px] font-bold text-slate-800 leading-tight">{card.title}</h3>
                     <p className="text-[9px] text-slate-500 mt-1 leading-snug">{card.desc}</p>
                  </div>
               </div>
               
               <div className="flex-1 p-4">
                  <ul className="flex flex-col gap-2">
                     {card.items.map((item, j) => (
                        <li key={j} className="flex items-start gap-2 text-[10px] text-slate-600">
                           <div className="mt-1 shrink-0">
                              <div className="w-1.5 h-1.5 rounded bg-blue-400"></div>
                           </div>
                           <span className="leading-snug font-medium">{item}</span>
                        </li>
                     ))}
                  </ul>
               </div>

               <div className="p-4 pt-0 mt-auto">
                  <button 
                    onClick={() => {
                      if (card.id === 18) {
                        setCurrentView('Express Setup');
                      } else {
                        setCurrentView(card.title);
                      }
                    }}
                    className="w-full border border-blue-600 text-blue-600 hover:bg-blue-50 hover:text-blue-700 font-bold text-[10px] py-2 rounded transition-colors flex items-center justify-center gap-1.5">
                     <Settings size={12} /> Configure
                  </button>
               </div>
            </div>
         ))}
      </div>

      {/* Bottom Banner - Key Benefits */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2 mt-auto">
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
