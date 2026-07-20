import { 
  ShieldCheck, Users, Package, Cloud, Database, Lock, Eye,
  Settings, Building2, GraduationCap, UsersIcon, Box, Laptop, 
  BellRing, CreditCard, Shield, Webhook, Mail, 
  Palette, FileClock, ArrowRightLeft, ChevronRight, Building, 
  Calendar, Clock, Globe, IndianRupee, Image as ImageIcon, 
  Phone, MapPin, Link2, Info, Layers, Book, List, TrendingUp, 
  CheckSquare, Key, Network, UserPlus, Activity, Power, Settings2, 
  PlusSquare, GitMerge, ToggleRight, ListOrdered, Wrench, 
  Maximize, Zap, DownloadCloud, MessageSquare, Bell, MessageCircle, 
  FileText, Sliders, Wallet, RefreshCcw, AlertOctagon, UploadCloud, 
  History, CalendarClock, Link, GitPullRequest, Layout, Folder, 
  Braces, Code, Menu, LayoutDashboard, FileBarChart, Upload, Map,
  CheckCircle2, CloudBackup
} from 'lucide-react';

const kpis = [
  { title: 'System Status', value: 'Healthy', subtitle: 'All systems operational', subtitleColor: 'text-green-600', icon: <ShieldCheck size={20} />, color: 'text-green-600', bg: 'bg-green-100', valueColor: 'text-green-600' },
  { title: 'Active Users', value: '156', subtitle: 'Currently Online', subtitleColor: 'text-slate-500', icon: <Users size={20} />, color: 'text-blue-600', bg: 'bg-blue-100', valueColor: 'text-slate-900' },
  { title: 'Modules Active', value: '24 / 28', subtitle: 'Modules Enabled', subtitleColor: 'text-slate-500', icon: <Package size={20} />, color: 'text-purple-600', bg: 'bg-purple-100', valueColor: 'text-slate-900' },
  { title: 'Last Backup', value: '16 May 2025, 11:45 PM', subtitle: 'Automated Backup', subtitleColor: 'text-slate-500', icon: <Cloud size={20} />, color: 'text-orange-600', bg: 'bg-orange-100', valueColor: 'text-slate-900' },
  { title: 'Storage Used', value: '245.6 GB / 1 TB', subtitle: '24.56% Used', subtitleColor: 'text-slate-500', icon: <Database size={20} />, color: 'text-teal-600', bg: 'bg-teal-100', valueColor: 'text-slate-900' },
  { title: 'Security Score', value: '95 / 100', subtitle: 'Excellent', subtitleColor: 'text-green-600', icon: <Lock size={20} />, color: 'text-red-600', bg: 'bg-red-100', valueColor: 'text-slate-900' },
];

const configCards = [
  {
    icon: <Settings size={20} className="text-blue-600" />,
    title: 'General Settings',
    desc: 'Configure basic system settings and preferences.',
    links: [
      { label: 'School / Institute Details', icon: <Building size={12} /> },
      { label: 'Session & Academic Year', icon: <Calendar size={12} /> },
      { label: 'Date Format & Time Zone', icon: <Clock size={12} /> },
      { label: 'Language Settings', icon: <Globe size={12} /> },
      { label: 'Currency Settings', icon: <IndianRupee size={12} /> },
      { label: 'System Preferences', icon: <Settings size={12} /> },
    ]
  },
  {
    icon: <Building2 size={20} className="text-blue-600" />,
    title: 'School Settings',
    desc: 'Manage your school information and branding.',
    links: [
      { label: 'School Profile', icon: <Building2 size={12} /> },
      { label: 'Logo & Branding', icon: <ImageIcon size={12} /> },
      { label: 'Contact Information', icon: <Phone size={12} /> },
      { label: 'Address & Location', icon: <MapPin size={12} /> },
      { label: 'Social Media Links', icon: <Link2 size={12} /> },
      { label: 'About Us / Description', icon: <Info size={12} /> },
    ]
  },
  {
    icon: <GraduationCap size={20} className="text-blue-600" />,
    title: 'Academic Settings',
    desc: 'Configure academic structure and rules.',
    links: [
      { label: 'Classes / Grades Setup', icon: <Layers size={12} /> },
      { label: 'Sections / Groups', icon: <Users size={12} /> },
      { label: 'Subjects Management', icon: <Book size={12} /> },
      { label: 'Subject Allocation', icon: <List size={12} /> },
      { label: 'Promotion Criteria', icon: <TrendingUp size={12} /> },
      { label: 'Grading System', icon: <CheckSquare size={12} /> },
    ]
  },
  {
    icon: <UsersIcon size={20} className="text-blue-600" />,
    title: 'User & Role Settings',
    desc: 'Manage users, roles and permissions.',
    links: [
      { label: 'User Management', icon: <Users size={12} /> },
      { label: 'Role Management', icon: <Shield size={12} /> },
      { label: 'Permissions & Access Control', icon: <Key size={12} /> },
      { label: 'Role Permissions Mapping', icon: <Network size={12} /> },
      { label: 'User Role Assignment', icon: <UserPlus size={12} /> },
      { label: 'Login Activity', icon: <Activity size={12} /> },
    ]
  },
  {
    icon: <Box size={20} className="text-blue-600" />,
    title: 'Module Settings',
    desc: 'Enable / disable and configure modules.',
    links: [
      { label: 'Module Activation', icon: <Power size={12} /> },
      { label: 'Module Configuration', icon: <Settings2 size={12} /> },
      { label: 'Custom Fields', icon: <PlusSquare size={12} /> },
      { label: 'Workflow Settings', icon: <GitMerge size={12} /> },
      { label: 'Feature Permissions', icon: <ToggleRight size={12} /> },
      { label: 'Module Order', icon: <ListOrdered size={12} /> },
    ]
  },
  {
    icon: <Laptop size={20} className="text-blue-600" />,
    title: 'System Settings',
    desc: 'Configure system behavior and performance.',
    links: [
      { label: 'System Preferences', icon: <Settings size={12} /> },
      { label: 'Maintenance Mode', icon: <Wrench size={12} /> },
      { label: 'System Limits', icon: <Maximize size={12} /> },
      { label: 'Cache Settings', icon: <Database size={12} /> },
      { label: 'Performance Settings', icon: <Zap size={12} /> },
      { label: 'System Updates', icon: <DownloadCloud size={12} /> },
    ]
  },
  {
    icon: <BellRing size={20} className="text-blue-600" />,
    title: 'Notifications Settings',
    desc: 'Manage all notification preferences.',
    links: [
      { label: 'Email Notifications', icon: <Mail size={12} /> },
      { label: 'SMS Notifications', icon: <MessageSquare size={12} /> },
      { label: 'Push Notifications', icon: <Bell size={12} /> },
      { label: 'WhatsApp Notifications', icon: <MessageCircle size={12} /> },
      { label: 'Notification Templates', icon: <FileText size={12} /> },
      { label: 'Notification Preferences', icon: <Sliders size={12} /> },
    ]
  },
  {
    icon: <CreditCard size={20} className="text-blue-600" />,
    title: 'Payment Settings',
    desc: 'Configure payment gateways and methods.',
    links: [
      { label: 'Payment Gateways', icon: <CreditCard size={12} /> },
      { label: 'Fee Payment Methods', icon: <Wallet size={12} /> },
      { label: 'Online Payment Settings', icon: <Globe size={12} /> },
      { label: 'Invoice Settings', icon: <FileText size={12} /> },
      { label: 'Refund & Cancellation', icon: <RefreshCcw size={12} /> },
      { label: 'Payment Reminders', icon: <BellRing size={12} /> },
    ]
  },
  {
    icon: <ShieldCheck size={20} className="text-blue-600" />,
    title: 'Security Settings',
    desc: 'Manage security and access policies.',
    links: [
      { label: 'Password Policy', icon: <Key size={12} /> },
      { label: 'Two Factor Authentication', icon: <ShieldCheck size={12} /> },
      { label: 'IP Restrictions', icon: <MapPin size={12} /> },
      { label: 'Login Attempts Limit', icon: <AlertOctagon size={12} /> },
      { label: 'Session Management', icon: <Clock size={12} /> },
      { label: 'Data Encryption', icon: <Lock size={12} /> },
    ]
  },
  {
    icon: <Cloud size={20} className="text-blue-600" />,
    title: 'Backup & Restore',
    desc: 'Backup your data and restore when needed.',
    links: [
      { label: 'Create Backup', icon: <UploadCloud size={12} /> },
      { label: 'Backup History', icon: <History size={12} /> },
      { label: 'Schedule Backup', icon: <Calendar size={12} /> },
      { label: 'Restore Data', icon: <DownloadCloud size={12} /> },
      { label: 'Database Optimization', icon: <Database size={12} /> },
      { label: 'Backup Settings', icon: <Settings size={12} /> },
    ]
  },
  {
    icon: <Webhook size={20} className="text-blue-600" />,
    title: 'API & Integrations',
    desc: 'Manage third-party integrations and APIs.',
    links: [
      { label: 'API Settings', icon: <Webhook size={12} /> },
      { label: 'Third Party Integrations', icon: <Link size={12} /> },
      { label: 'Webhook Settings', icon: <GitPullRequest size={12} /> },
      { label: 'SSO / OAuth Settings', icon: <Key size={12} /> },
      { label: 'Google Workspace', icon: <Mail size={12} /> },
      { label: 'Microsoft 365 Integration', icon: <Layout size={12} /> },
    ]
  },
  {
    icon: <Mail size={20} className="text-blue-600" />,
    title: 'Email / SMS Templates',
    desc: 'Create and manage templates for messages.',
    links: [
      { label: 'Email Templates', icon: <Mail size={12} /> },
      { label: 'SMS Templates', icon: <MessageSquare size={12} /> },
      { label: 'WhatsApp Templates', icon: <MessageCircle size={12} /> },
      { label: 'Template Categories', icon: <Folder size={12} /> },
      { label: 'Dynamic Fields', icon: <Braces size={12} /> },
      { label: 'Template Settings', icon: <Settings size={12} /> },
    ]
  },
  {
    icon: <Palette size={20} className="text-blue-600" />,
    title: 'Theme & Appearance',
    desc: 'Customize look and feel of the system.',
    links: [
      { label: 'Theme Settings', icon: <Palette size={12} /> },
      { label: 'Color Schemes', icon: <Palette size={12} /> },
      { label: 'Custom CSS', icon: <Code size={12} /> },
      { label: 'Menu Management', icon: <Menu size={12} /> },
      { label: 'Dashboard Widgets', icon: <LayoutDashboard size={12} /> },
      { label: 'UI Preferences', icon: <Sliders size={12} /> },
    ]
  },
  {
    icon: <FileClock size={20} className="text-blue-600" />,
    title: 'Audit Log',
    desc: 'Track all system activities and changes.',
    links: [
      { label: 'User Activity Log', icon: <Activity size={12} /> },
      { label: 'Data Change Log', icon: <Database size={12} /> },
      { label: 'Login History', icon: <History size={12} /> },
      { label: 'Action History', icon: <List size={12} /> },
      { label: 'Export Logs', icon: <DownloadCloud size={12} /> },
      { label: 'Audit Log Reports', icon: <FileBarChart size={12} /> },
    ]
  },
  {
    icon: <ArrowRightLeft size={20} className="text-blue-600" />,
    title: 'Import / Export',
    desc: 'Import or export system data.',
    links: [
      { label: 'Import Data', icon: <Upload size={12} /> },
      { label: 'Export Data', icon: <DownloadCloud size={12} /> },
      { label: 'Data Mapping', icon: <Map size={12} /> },
      { label: 'Import History', icon: <History size={12} /> },
      { label: 'Export History', icon: <History size={12} /> },
      { label: 'Scheduled Exports', icon: <Calendar size={12} /> },
    ]
  }
];

const keyBenefits = [
  { title: 'Centralized Control', desc: 'Manage all system settings from one place.', icon: <Settings size={14} className="text-green-600" />, bg: 'bg-green-50' },
  { title: 'Customizable', desc: 'Tailor the system to match your institution.', icon: <Sliders size={14} className="text-blue-600" />, bg: 'bg-blue-50' },
  { title: 'Secure & Reliable', desc: 'Advanced security ensures data safety.', icon: <ShieldCheck size={14} className="text-indigo-600" />, bg: 'bg-indigo-50' },
  { title: 'Scalable', desc: 'Grow your system with flexible settings.', icon: <TrendingUp size={14} className="text-purple-600" />, bg: 'bg-purple-50' },
  { title: 'Time Saving', desc: 'Automate tasks and reduce manual work.', icon: <Clock size={14} className="text-orange-600" />, bg: 'bg-orange-50' },
  { title: 'Better Experience', desc: 'Enhance productivity for all users.', icon: <CheckCircle2 size={14} className="text-pink-600" />, bg: 'bg-pink-50' },
];

export function SettingsManagementCRM() {
  return (
    <div className="flex flex-col space-y-4 h-full relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Settings Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">Manage and customize your system preferences and configurations</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded flex items-center gap-2 shadow-sm transition-colors">
            <Eye size={14} />
            <span>View School Profile</span>
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

      {/* Configuration Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5 gap-4 flex-1">
         {configCards.map((card, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col hover:shadow-md transition-shadow">
               <div className="p-4 border-b border-slate-100 flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                     {card.icon}
                  </div>
                  <div>
                     <h3 className="text-[12px] font-bold text-slate-800 leading-tight">{card.title}</h3>
                     <p className="text-[9px] text-slate-500 mt-1 leading-snug">{card.desc}</p>
                  </div>
               </div>
               <div className="flex flex-col p-2">
                  {card.links.map((link, j) => (
                     <a key={j} href="#" className="flex items-center justify-between p-2 hover:bg-slate-50 rounded text-slate-700 transition-colors group">
                        <div className="flex items-center gap-2">
                           <div className="text-slate-400 group-hover:text-blue-600 transition-colors">
                              {link.icon}
                           </div>
                           <span className="text-[10px] font-medium group-hover:text-blue-700 transition-colors">{link.label}</span>
                        </div>
                        <ChevronRight size={12} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                     </a>
                  ))}
               </div>
            </div>
         ))}
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
