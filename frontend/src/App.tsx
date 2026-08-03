import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { BrandLogo } from './components/shared/BrandLogo';
import { APP_NAME } from './lib/branding';
import { useAuth } from './contexts/AuthContext';
import { parseViewKey } from './lib/navigation';
import { pathToViewKey, viewKeyToPath } from './lib/urlRoutes';
import { SystemStatusBar } from './components/SystemStatusBar';

const EntranceExamPortal = lazy(() =>
  import('./components/entrance/EntranceExamPortal').then((m) => ({ default: m.EntranceExamPortal })),
);
const DigitalExamTakePortal = lazy(() =>
  import('./components/examination/DigitalExamTakePortal').then((m) => ({ default: m.DigitalExamTakePortal })),
);
const PaperExamPortal = lazy(() =>
  import('./components/examination/PaperExamPortal').then((m) => ({ default: m.PaperExamPortal })),
);
const DashboardPage = lazy(() =>
  import('./components/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const AdmissionCRM = lazy(() =>
  import('./components/crm/AdmissionCRM').then((m) => ({ default: m.AdmissionCRM })),
);
const StudentManagementCRM = lazy(() =>
  import('./components/crm/StudentManagementCRM').then((m) => ({ default: m.StudentManagementCRM })),
);
const ParentManagementCRM = lazy(() =>
  import('./components/crm/ParentManagementCRM').then((m) => ({ default: m.ParentManagementCRM })),
);
const AcademicManagementCRM = lazy(() =>
  import('./components/crm/AcademicManagementCRM').then((m) => ({ default: m.AcademicManagementCRM })),
);
const AttendanceManagementCRM = lazy(() =>
  import('./components/crm/AttendanceManagementCRM').then((m) => ({ default: m.AttendanceManagementCRM })),
);
const ExaminationManagementCRM = lazy(() =>
  import('./components/crm/ExaminationManagementCRM').then((m) => ({ default: m.ExaminationManagementCRM })),
);
const FeeFinanceManagementCRM = lazy(() =>
  import('./components/crm/FeeFinanceManagementCRM').then((m) => ({ default: m.FeeFinanceManagementCRM })),
);
const HrPayrollManagementCRM = lazy(() =>
  import('./components/crm/HrPayrollManagementCRM').then((m) => ({ default: m.HrPayrollManagementCRM })),
);
const TransportManagementCRM = lazy(() =>
  import('./components/crm/TransportManagementCRM').then((m) => ({ default: m.TransportManagementCRM })),
);
const LibraryManagementCRM = lazy(() =>
  import('./components/crm/LibraryManagementCRM').then((m) => ({ default: m.LibraryManagementCRM })),
);
const HostelManagementCRM = lazy(() =>
  import('./components/crm/HostelManagementCRM').then((m) => ({ default: m.HostelManagementCRM })),
);
const InventoryManagementCRM = lazy(() =>
  import('./components/crm/InventoryManagementCRM').then((m) => ({ default: m.InventoryManagementCRM })),
);
const CommunicationManagementCRM = lazy(() =>
  import('./components/crm/CommunicationManagementCRM').then((m) => ({ default: m.CommunicationManagementCRM })),
);
const EventManagementCRM = lazy(() =>
  import('./components/crm/EventManagementCRM').then((m) => ({ default: m.EventManagementCRM })),
);
const WebsiteCMSManagementCRM = lazy(() =>
  import('./components/crm/WebsiteCMSManagementCRM').then((m) => ({ default: m.WebsiteCMSManagementCRM })),
);
const ReportsAnalyticsCRM = lazy(() =>
  import('./components/crm/ReportsAnalyticsCRM').then((m) => ({ default: m.ReportsAnalyticsCRM })),
);
const SettingsManagementCRM = lazy(() =>
  import('./components/crm/SettingsManagementCRM').then((m) => ({ default: m.SettingsManagementCRM })),
);
const SystemAdministrationCRM = lazy(() =>
  import('./components/crm/SystemAdministrationCRM').then((m) => ({ default: m.SystemAdministrationCRM })),
);
const InstitutionSetupCRM = lazy(() =>
  import('./components/crm/InstitutionSetupCRM').then((m) => ({ default: m.InstitutionSetupCRM })),
);

function isEntranceExamPath(pathname: string) {
  return pathname === '/entrance-exam' || pathname.startsWith('/entrance-exam/');
}

function isDigitalExamPath(pathname: string) {
  return pathname.startsWith('/exam/');
}

function isPaperExamPath(pathname: string) {
  return pathname.startsWith('/paper-exam/');
}

function PageLoadingFallback() {
  return (
    <div className="flex flex-1 items-center justify-center min-h-[40vh]">
      <div className="flex flex-col items-center gap-3 text-slate-500">
        <div className="h-8 w-8 border-2 border-slate-300 border-t-amber-500 rounded-full animate-spin" />
        <p className="text-sm font-medium">Loading module…</p>
      </div>
    </div>
  );
}

function withSuspense(node: ReactNode) {
  return <Suspense fallback={<PageLoadingFallback />}>{node}</Suspense>;
}

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState(() => pathToViewKey(window.location.pathname));
  const [isEntranceExam] = useState(() => isEntranceExamPath(window.location.pathname));
  const [isDigitalExam] = useState(() => isDigitalExamPath(window.location.pathname));
  const [isPaperExam] = useState(() => isPaperExamPath(window.location.pathname));
  const { user, login, loading } = useAuth();
  const { module, page } = parseViewKey(currentView);
  const [email, setEmail] = useState('admin@360schoolerp.com');
  const [password, setPassword] = useState('Admin@12345');
  const [authError, setAuthError] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);

  useEffect(() => {
    if (isEntranceExam || isDigitalExam || isPaperExam) return;
    const desired = viewKeyToPath(currentView);
    if (window.location.pathname !== desired) {
      window.history.pushState({}, '', desired);
    }
  }, [currentView, isEntranceExam, isDigitalExam, isPaperExam]);

  useEffect(() => {
    const onPop = () => setCurrentView(pathToViewKey(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  if (isEntranceExam) {
    return withSuspense(<EntranceExamPortal />);
  }

  if (isDigitalExam) {
    return withSuspense(<DigitalExamTakePortal />);
  }

  if (isPaperExam) {
    return withSuspense(<PaperExamPortal />);
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <div className="h-8 w-8 border-2 border-slate-300 border-t-amber-500 rounded-full animate-spin" />
          <p className="text-sm font-medium">Starting…</p>
        </div>
      </div>
    );
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

  const renderModule = () => {
    if (module === 'Dashboard') {
      return withSuspense(<DashboardPage onNavigate={setCurrentView} />);
    }

    const routes: Record<string, ReactNode> = {
      'Admission CRM': withSuspense(<AdmissionCRM currentView={page} />),
      'Student Management': withSuspense(<StudentManagementCRM currentView={page} onNavigate={setCurrentView} />),
      'Parent Management': withSuspense(<ParentManagementCRM currentView={page} onNavigate={setCurrentView} />),
      'Academic Management': withSuspense(<AcademicManagementCRM currentView={page} />),
      'Attendance Management': withSuspense(<AttendanceManagementCRM currentView={page} onNavigate={setCurrentView} />),
      'Examination Management': withSuspense(<ExaminationManagementCRM currentView={page} onNavigate={setCurrentView} />),
      'Fees & Finance': withSuspense(<FeeFinanceManagementCRM currentView={page} onNavigate={setCurrentView} />),
      'HR & Payroll Management': withSuspense(<HrPayrollManagementCRM currentView={page} onNavigate={setCurrentView} />),
      'Transport Management': withSuspense(<TransportManagementCRM currentView={page} onNavigate={setCurrentView} />),
      'Library Management': withSuspense(<LibraryManagementCRM currentView={page} onNavigate={setCurrentView} />),
      'Hostel Management': withSuspense(<HostelManagementCRM currentView={page} onNavigate={setCurrentView} />),
      'Inventory Management': withSuspense(<InventoryManagementCRM currentView={page} onNavigate={setCurrentView} />),
      'Communication Management': withSuspense(<CommunicationManagementCRM currentView={page} onNavigate={setCurrentView} />),
      'Event Management': withSuspense(<EventManagementCRM currentView={page} onNavigate={setCurrentView} />),
      'Website & CMS Management': withSuspense(<WebsiteCMSManagementCRM currentView={page} onNavigate={setCurrentView} />),
      'Reports & Analytics': withSuspense(<ReportsAnalyticsCRM currentView={page} onNavigate={setCurrentView} />),
      'Settings Management': withSuspense(<SettingsManagementCRM currentView={page} onNavigate={setCurrentView} />),
      'System Administration': withSuspense(<SystemAdministrationCRM currentView={page} />),
      'Institution Setup': withSuspense(<InstitutionSetupCRM currentView={page} />),
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
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
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
          {renderModule()}
        </main>

        <SystemStatusBar />
      </div>
    </div>
  );
}
