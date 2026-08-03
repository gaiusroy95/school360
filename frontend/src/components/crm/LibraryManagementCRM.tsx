import { lazy, Suspense, type ReactNode } from 'react';
import { SubModuleView } from './shared/SubModuleView';

const LibraryDashboardView = lazy(() =>
  import('./library/LibraryDashboardView').then((m) => ({ default: m.LibraryDashboardView })),
);
const BookCatalogueView = lazy(() =>
  import('./library/BookCatalogueView').then((m) => ({ default: m.BookCatalogueView })),
);
const BookIssueReturnView = lazy(() =>
  import('./library/BookIssueReturnView').then((m) => ({ default: m.BookIssueReturnView })),
);
const MembersView = lazy(() =>
  import('./library/MembersView').then((m) => ({ default: m.MembersView })),
);
const AddManageBooksView = lazy(() =>
  import('./library/AddManageBooksView').then((m) => ({ default: m.AddManageBooksView })),
);
const CategoriesSubjectsView = lazy(() =>
  import('./library/CategoriesSubjectsView').then((m) => ({ default: m.CategoriesSubjectsView })),
);
const RackManagementView = lazy(() =>
  import('./library/RackManagementView').then((m) => ({ default: m.RackManagementView })),
);
const StockVerificationView = lazy(() =>
  import('./library/StockVerificationView').then((m) => ({ default: m.StockVerificationView })),
);
const FineManagementView = lazy(() =>
  import('./library/FineManagementView').then((m) => ({ default: m.FineManagementView })),
);
const LibraryAttendanceView = lazy(() =>
  import('./library/LibraryAttendanceView').then((m) => ({ default: m.LibraryAttendanceView })),
);
const ReadingRoomView = lazy(() =>
  import('./library/ReadingRoomView').then((m) => ({ default: m.ReadingRoomView })),
);
const EResourcesView = lazy(() =>
  import('./library/EResourcesView').then((m) => ({ default: m.EResourcesView })),
);
const LibraryReportsAnalyticsView = lazy(() =>
  import('./library/LibraryReportsAnalyticsView').then((m) => ({ default: m.LibraryReportsAnalyticsView })),
);

function wrap(node: ReactNode) {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[30vh] text-sm text-slate-400">Loading page…</div>}>
      {node}
    </Suspense>
  );
}

export function LibraryManagementCRM({
  currentView = 'Library Dashboard',
  onNavigate,
}: {
  currentView?: string;
  onNavigate?: (view: string) => void;
}) {
  if (currentView === 'Library Dashboard' || !currentView) {
    return wrap(<LibraryDashboardView onNavigate={onNavigate} />);
  }
  if (currentView === 'Book Catalogue') {
    return wrap(<BookCatalogueView />);
  }
  if (currentView === 'Book Issue / Return') {
    return wrap(<BookIssueReturnView />);
  }
  if (currentView === 'Members') {
    return wrap(<MembersView />);
  }
  if (currentView === 'Add / Manage Books') {
    return wrap(<AddManageBooksView />);
  }
  if (currentView === 'Categories & Subjects') {
    return wrap(<CategoriesSubjectsView />);
  }
  if (currentView === 'Rack Management') {
    return wrap(<RackManagementView />);
  }
  if (currentView === 'Stock Verification') {
    return wrap(<StockVerificationView />);
  }
  if (currentView === 'Fine Management') {
    return wrap(<FineManagementView />);
  }
  if (currentView === 'Library Attendance') {
    return wrap(<LibraryAttendanceView />);
  }
  if (currentView === 'Reading Room') {
    return wrap(<ReadingRoomView />);
  }
  if (currentView === 'E-Resources') {
    return wrap(<EResourcesView />);
  }
  if (currentView === 'Reports & Analytics') {
    return wrap(<LibraryReportsAnalyticsView />);
  }
  if (currentView) {
    return <SubModuleView module="Library Management" title={currentView} />;
  }
  return wrap(<LibraryDashboardView onNavigate={onNavigate} />);
}
