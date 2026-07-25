import { SubModuleView } from './shared/SubModuleView';
import { LibraryDashboardView } from './library/LibraryDashboardView';
import { BookCatalogueView } from './library/BookCatalogueView';
import { BookIssueReturnView } from './library/BookIssueReturnView';
import { MembersView } from './library/MembersView';
import { AddManageBooksView } from './library/AddManageBooksView';
import { CategoriesSubjectsView } from './library/CategoriesSubjectsView';
import { RackManagementView } from './library/RackManagementView';
import { StockVerificationView } from './library/StockVerificationView';
import { FineManagementView } from './library/FineManagementView';
import { LibraryAttendanceView } from './library/LibraryAttendanceView';
import { ReadingRoomView } from './library/ReadingRoomView';
import { EResourcesView } from './library/EResourcesView';
import { LibraryReportsAnalyticsView } from './library/LibraryReportsAnalyticsView';

export function LibraryManagementCRM({
  currentView = 'Library Dashboard',
  onNavigate,
}: {
  currentView?: string;
  onNavigate?: (view: string) => void;
}) {
  if (currentView === 'Library Dashboard' || !currentView) {
    return <LibraryDashboardView onNavigate={onNavigate} />;
  }
  if (currentView === 'Book Catalogue') {
    return <BookCatalogueView />;
  }
  if (currentView === 'Book Issue / Return') {
    return <BookIssueReturnView />;
  }
  if (currentView === 'Members') {
    return <MembersView />;
  }
  if (currentView === 'Add / Manage Books') {
    return <AddManageBooksView />;
  }
  if (currentView === 'Categories & Subjects') {
    return <CategoriesSubjectsView />;
  }
  if (currentView === 'Rack Management') {
    return <RackManagementView />;
  }
  if (currentView === 'Stock Verification') {
    return <StockVerificationView />;
  }
  if (currentView === 'Fine Management') {
    return <FineManagementView />;
  }
  if (currentView === 'Library Attendance') {
    return <LibraryAttendanceView />;
  }
  if (currentView === 'Reading Room') {
    return <ReadingRoomView />;
  }
  if (currentView === 'E-Resources') {
    return <EResourcesView />;
  }
  if (currentView === 'Reports & Analytics') {
    return <LibraryReportsAnalyticsView />;
  }
  if (currentView) {
    return <SubModuleView module="Library Management" title={currentView} />;
  }
  return <LibraryDashboardView onNavigate={onNavigate} />;
}
