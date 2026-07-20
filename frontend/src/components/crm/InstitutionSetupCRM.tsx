import { useState, useEffect } from 'react';
import {
  Building2, Calendar, Users, Building, ShieldCheck, CheckCircle2,
  GraduationCap, Layout, Layers, Briefcase, Database, Settings, Mail, Lock,
  DownloadCloud, Eye, BookOpen, Clock, Activity,
  CreditCard as CardIcon, FileBox, Fingerprint, CalendarDays,
  ToggleRight, Globe, Zap
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
import { INSTITUTION_SETUP_TILES } from '../../lib/institutionSetupSchema';
import { TILE_KEY_BY_TITLE } from '../../lib/institutionApi';

const setupModules = INSTITUTION_SETUP_TILES.map((tile, index) => ({
  id: index + 1,
  title: tile.title,
  desc: tile.desc,
  icon:
    tile.key === 'basicInformation' ? <Building2 size={16} className="text-blue-600" /> :
    tile.key === 'academicSetup' ? <GraduationCap size={16} className="text-indigo-600" /> :
    tile.key === 'classesSections' ? <Layers size={16} className="text-pink-600" /> :
    tile.key === 'subjectsSetup' ? <BookOpen size={16} className="text-blue-600" /> :
    tile.key === 'departmentsSetup' ? <Briefcase size={16} className="text-purple-600" /> :
    tile.key === 'sessionTermSetup' ? <Clock size={16} className="text-orange-600" /> :
    tile.key === 'gradeMarksSetup' ? <Activity size={16} className="text-green-600" /> :
    tile.key === 'feeGroupSetup' ? <CardIcon size={16} className="text-teal-600" /> :
    tile.key === 'documentSetup' ? <FileBox size={16} className="text-amber-600" /> :
    tile.key === 'idCardNumbering' ? <Fingerprint size={16} className="text-blue-600" /> :
    tile.key === 'calendarSetup' ? <CalendarDays size={16} className="text-red-500" /> :
    tile.key === 'customFieldsSetup' ? <ToggleRight size={16} className="text-indigo-500" /> :
    tile.key === 'notificationSetup' ? <Mail size={16} className="text-purple-500" /> :
    tile.key === 'otherPreferences' ? <Settings size={16} className="text-slate-600" /> :
    tile.key === 'integrationSetup' ? <Globe size={16} className="text-blue-500" /> :
    tile.key === 'backupRecovery' ? <Database size={16} className="text-green-600" /> :
    tile.key === 'securitySettings' ? <Lock size={16} className="text-red-600" /> :
    <DownloadCloud size={16} className="text-teal-600" />,
  items: tile.sections.map((s) => s.title),
  apiKey: TILE_KEY_BY_TITLE[tile.title] || tile.key,
}));

const keyBenefits = [
  { title: 'Centralized Management', desc: 'Manage entire setup from one place', icon: <Layout size={14} className="text-blue-600" />, bg: 'bg-blue-50' },
  { title: 'Data Consistency', desc: 'Ensure uniform data structures', icon: <Database size={14} className="text-green-600" />, bg: 'bg-green-50' },
  { title: 'Time Saving', desc: 'Automated & structured workflows', icon: <Clock size={14} className="text-purple-600" />, bg: 'bg-purple-50' },
  { title: 'Better Control', desc: 'Granular configuration options', icon: <Settings size={14} className="text-orange-600" />, bg: 'bg-orange-50' },
  { title: 'Scalability', desc: 'Grow your system with institution', icon: <Activity size={14} className="text-teal-600" />, bg: 'bg-teal-50' },
  { title: 'Accuracy & Compliance', desc: 'Track activities and ensure rules', icon: <CheckCircle2 size={14} className="text-indigo-600" />, bg: 'bg-indigo-50' },
];

export function InstitutionSetupCRM({ currentView: externalView }: { currentView?: string }) {
  const [override, setOverride] = useState<string | null>(null);

  useEffect(() => {
    setOverride(null);
  }, [externalView]);

  const view = override ?? externalView ?? 'Overview';

  if (view === 'Express Setup') {
    return <ExpressSetupView onBack={() => setOverride('Overview')} />;
  }

  const activeModule = setupModules.find((m) => m.title === view);
  if (activeModule) {
    return <ModuleConfigView module={activeModule} onBack={() => setOverride('Overview')} />;
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
            onClick={() => setOverride('Express Setup')}
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
                        setOverride('Express Setup');
                      } else {
                        setOverride(card.title);
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
