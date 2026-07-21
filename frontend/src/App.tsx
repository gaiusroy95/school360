import { useEffect, useState, type ReactNode } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { KPICards } from './components/dashboard/KPICards';
import { ChartsRow } from './components/dashboard/ChartsRow';
import { QuickAccess } from './components/dashboard/QuickAccess';
import { BottomRow } from './components/dashboard/BottomRow';
import { AdmissionCRM } from './components/crm/AdmissionCRM';
import { StudentManagementCRM } from './components/crm/StudentManagementCRM';
import { ParentManagementCRM } from './components/crm/ParentManagementCRM';
import { AcademicManagementCRM } from './components/crm/AcademicManagementCRM';
import { AttendanceManagementCRM } from './components/crm/AttendanceManagementCRM';
import { ExaminationManagementCRM } from './components/crm/ExaminationManagementCRM';
import { FeeFinanceManagementCRM } from './components/crm/FeeFinanceManagementCRM';
import { HrPayrollManagementCRM } from './components/crm/HrPayrollManagementCRM';
import { TransportManagementCRM } from './components/crm/TransportManagementCRM';
import { LibraryManagementCRM } from './components/crm/LibraryManagementCRM';
import { HostelManagementCRM } from './components/crm/HostelManagementCRM';
import { InventoryManagementCRM } from './components/crm/InventoryManagementCRM';
import { CommunicationManagementCRM } from './components/crm/CommunicationManagementCRM';
import { EventManagementCRM } from './components/crm/EventManagementCRM';
import { WebsiteCMSManagementCRM } from './components/crm/WebsiteCMSManagementCRM';
import { ReportsAnalyticsCRM } from './components/crm/ReportsAnalyticsCRM';
import { SettingsManagementCRM } from './components/crm/SettingsManagementCRM';
import { SystemAdministrationCRM } from './components/crm/SystemAdministrationCRM';
import { InstitutionSetupCRM } from './components/crm/InstitutionSetupCRM';
import { Plus, GraduationCap } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import { parseViewKey } from './lib/navigation';
import { pathToViewKey, viewKeyToPath } from './lib/urlRoutes';
import { EntranceExamPortal } from './components/entrance/EntranceExamPortal';

function isEntranceExamPath(pathname: string) {
  return pathname === '/entrance-exam' || pathname.startsWith('/entrance-exam/');
}

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState(() => pathToViewKey(window.location.pathname));
  const [isEntranceExam] = useState(() => isEntranceExamPath(window.location.pathname));
  const { user, login, loading } = useAuth();
  const { module, page } = parseViewKey(currentView);
  const [email, setEmail] = useState('admin@360schoolerp.com');
  const [password, setPassword] = useState('Admin@12345');
  const [authError, setAuthError] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);

  useEffect(() => {
    const desired = viewKeyToPath(currentView);
    if (window.location.pathname !== desired) {
      window.history.pushState({}, '', desired);
    }
  }, [currentView]);

  useEffect(() => {
    const onPop = () => setCurrentView(pathToViewKey(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  if (isEntranceExam) {
    return <EntranceExamPortal />;
  }

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-slate-50"><p>Loading...</p></div>;
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <form
          className="bg-white p-8 rounded-xl shadow-lg border border-slate-200 max-w-sm w-full flex flex-col"
          onSubmit={async (e) => {
            e.preventDefault();
            setAuthError('');
            setAuthSubmitting(true);
            try {
              await login(email, password);
            } catch (err) {
              setAuthError(err instanceof Error ? err.message : 'Login failed');
            } finally {
              setAuthSubmitting(false);
            }
          }}
        >
          <div className="bg-blue-600 p-3 rounded-lg mb-4 self-center">
            <GraduationCap className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2 text-center">360schoolERP</h1>
          <p className="text-slate-500 text-sm text-center mb-6">Sign in with your account</p>
          <label className="text-xs font-bold text-slate-600 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mb-3 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            required
          />
          <label className="text-xs font-bold text-slate-600 mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mb-4 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            required
          />
          {authError && <p className="text-xs text-red-600 mb-3">{authError}</p>}
          <button
            type="submit"
            disabled={authSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
          >
            {authSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} currentView={currentView} setCurrentView={setCurrentView} />
      
      <div className="flex-1 flex flex-col lg:ml-56 h-full overflow-hidden w-full">
        <TopBar onMenuClick={() => setIsSidebarOpen(true)} />
        
        <main className="flex-1 overflow-y-auto p-5 custom-scrollbar flex flex-col space-y-5">
          {(() => {
            if (module === 'Dashboard') {
              return (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">
                      Welcome Back, Super Admin! <span className="text-xl">👋</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Real-time insights for <span className="font-bold">Greenwood International School</span>
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <select className="bg-white border border-slate-200 text-xs px-3 py-2 rounded focus:outline-none text-slate-700 shadow-sm">
                      <option>Academic Year: 2025-26</option>
                      <option>Academic Year: 2024-25</option>
                    </select>
                    
                    <button className="bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold text-xs px-4 py-2 rounded flex items-center gap-2 shadow-sm transition-colors uppercase">
                      <Plus size={14} strokeWidth={3} />
                      <span>Add New</span>
                    </button>
                  </div>
                </div>

                <KPICards />
                <ChartsRow />
                <QuickAccess onNavigate={setCurrentView} />
                <BottomRow />
              </>
              );
            }

            const routes: Record<string, ReactNode> = {
              'Admission CRM': <AdmissionCRM currentView={page} />,
              'Student Management': <StudentManagementCRM currentView={page} />,
              'Parent Management': <ParentManagementCRM currentView={page} />,
              'Academic Management': <AcademicManagementCRM currentView={page} />,
              'Attendance Management': <AttendanceManagementCRM currentView={page} />,
              'Examination Management': <ExaminationManagementCRM currentView={page} />,
              'Fees & Finance': <FeeFinanceManagementCRM currentView={page} />,
              'HR & Payroll Management': <HrPayrollManagementCRM currentView={page} />,
              'Transport Management': <TransportManagementCRM currentView={page} />,
              'Library Management': <LibraryManagementCRM currentView={page} />,
              'Hostel Management': <HostelManagementCRM currentView={page} />,
              'Inventory Management': <InventoryManagementCRM currentView={page} />,
              'Communication Management': <CommunicationManagementCRM currentView={page} />,
              'Event Management': <EventManagementCRM currentView={page} />,
              'Website & CMS Management': <WebsiteCMSManagementCRM currentView={page} />,
              'Reports & Analytics': <ReportsAnalyticsCRM currentView={page} />,
              'Settings Management': <SettingsManagementCRM currentView={page} />,
              'System Administration': <SystemAdministrationCRM currentView={page} />,
              'Institution Setup': <InstitutionSetupCRM currentView={page} />,
            };

            if (routes[module]) return routes[module];

            return (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-4 mt-20">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                  <span className="text-2xl">🚧</span>
                </div>
                <h2 className="text-xl font-bold text-slate-700">{page} Module</h2>
                <p className="text-sm">This module is currently under construction.</p>
              </div>
            );
          })()}
        </main>
        
        {/* SYSTEM STATUS BAR */}
        <footer className="bg-white border-t border-slate-200 h-10 px-6 flex items-center justify-between shrink-0 hidden sm:flex">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
              <p className="text-[10px] text-slate-500">System Health: Good</p>
            </div>
            <p className="text-[10px] text-slate-500">Storage Used: <span className="text-slate-700 font-bold">42% (2.1GB / 5GB)</span></p>
            <p className="text-[10px] text-slate-500">SMS Balance: <span className="text-slate-700 font-bold">12,402 Credits</span></p>
          </div>
          <div className="flex items-center gap-4">
            <p className="text-[10px] text-slate-500 italic">Build v4.2.0-stable</p>
            <p className="text-[10px] font-bold text-slate-900 px-2 py-0.5 bg-amber-100 rounded">SUPER ADMIN PRIVILEGES</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
