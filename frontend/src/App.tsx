import { useEffect, useState, type ReactNode } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { DashboardPage } from './components/dashboard/DashboardPage';
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
import { BrandLogo } from './components/shared/BrandLogo';
import { APP_NAME } from './lib/branding';
import { useAuth } from './contexts/AuthContext';
import { parseViewKey } from './lib/navigation';
import { pathToViewKey, viewKeyToPath } from './lib/urlRoutes';
import { EntranceExamPortal } from './components/entrance/EntranceExamPortal';
import { SystemStatusBar } from './components/SystemStatusBar';

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
          <div className="mb-4 self-center">
            <BrandLogo className="h-16 w-auto object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2 text-center">{APP_NAME}</h1>
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
        <TopBar onMenuClick={() => setIsSidebarOpen(true)} onNavigate={setCurrentView} />
        
        <main className="flex-1 overflow-y-auto p-5 custom-scrollbar flex flex-col space-y-5">
          {(() => {
            if (module === 'Dashboard') {
              return <DashboardPage onNavigate={setCurrentView} />;
            }

            const routes: Record<string, ReactNode> = {
              'Admission CRM': <AdmissionCRM currentView={page} />,
              'Student Management': <StudentManagementCRM currentView={page} onNavigate={setCurrentView} />,
              'Parent Management': <ParentManagementCRM currentView={page} onNavigate={setCurrentView} />,
              'Academic Management': <AcademicManagementCRM currentView={page} />,
              'Attendance Management': <AttendanceManagementCRM currentView={page} onNavigate={setCurrentView} />,
              'Examination Management': <ExaminationManagementCRM currentView={page} onNavigate={setCurrentView} />,
              'Fees & Finance': <FeeFinanceManagementCRM currentView={page} onNavigate={setCurrentView} />,
              'HR & Payroll Management': <HrPayrollManagementCRM currentView={page} onNavigate={setCurrentView} />,
              'Transport Management': <TransportManagementCRM currentView={page} onNavigate={setCurrentView} />,
              'Library Management': <LibraryManagementCRM currentView={page} onNavigate={setCurrentView} />,
              'Hostel Management': <HostelManagementCRM currentView={page} onNavigate={setCurrentView} />,
              'Inventory Management': <InventoryManagementCRM currentView={page} onNavigate={setCurrentView} />,
              'Communication Management': <CommunicationManagementCRM currentView={page} onNavigate={setCurrentView} />,
              'Event Management': <EventManagementCRM currentView={page} onNavigate={setCurrentView} />,
              'Website & CMS Management': <WebsiteCMSManagementCRM currentView={page} onNavigate={setCurrentView} />,
              'Reports & Analytics': <ReportsAnalyticsCRM currentView={page} onNavigate={setCurrentView} />,
              'Settings Management': <SettingsManagementCRM currentView={page} onNavigate={setCurrentView} />,
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
        
        <SystemStatusBar />
      </div>
    </div>
  );
}
