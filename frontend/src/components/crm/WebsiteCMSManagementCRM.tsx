import { SubModuleView } from './shared/SubModuleView';
import { WebsiteDashboardView } from './website/WebsiteDashboardView';
import { PagesManagementView } from './website/PagesManagementView';
import { BlogManagementView } from './website/BlogManagementView';
import { MediaLibraryView } from './website/MediaLibraryView';
import { MenusNavigationView } from './website/MenusNavigationView';
import { SlidersBannersView } from './website/SlidersBannersView';
import { TestimonialsView } from './website/TestimonialsView';
import { FormsManagementView } from './website/FormsManagementView';
import { PopupsNoticesView } from './website/PopupsNoticesView';
import { SeoManagementView } from './website/SeoManagementView';
import { ThemeAppearanceView } from './website/ThemeAppearanceView';
import { BackupRestoreView } from './website/BackupRestoreView';
import { AnalyticsReportsView } from './website/AnalyticsReportsView';

export function WebsiteCMSManagementCRM({
  currentView = 'Website Dashboard',
  onNavigate,
}: {
  currentView?: string;
  onNavigate?: (view: string) => void;
}) {
  if (currentView === 'Website Dashboard' || !currentView) {
    return <WebsiteDashboardView onNavigate={onNavigate} />;
  }
  if (currentView === 'Pages Management') {
    return <PagesManagementView />;
  }
  if (currentView === 'Blog Management') {
    return <BlogManagementView />;
  }
  if (currentView === 'Media Library') {
    return <MediaLibraryView />;
  }
  if (currentView === 'Menus & Navigation') {
    return <MenusNavigationView />;
  }
  if (currentView === 'Sliders & Banners') {
    return <SlidersBannersView />;
  }
  if (currentView === 'Testimonials') {
    return <TestimonialsView />;
  }
  if (currentView === 'Forms Management') {
    return <FormsManagementView />;
  }
  if (currentView === 'Popups & Notices') {
    return <PopupsNoticesView />;
  }
  if (currentView === 'SEO Management') {
    return <SeoManagementView />;
  }
  if (currentView === 'Theme & Appearance') {
    return <ThemeAppearanceView />;
  }
  if (currentView === 'Backup & Restore') {
    return <BackupRestoreView />;
  }
  if (currentView === 'Analytics & Reports') {
    return <AnalyticsReportsView />;
  }
  if (currentView) {
    return <SubModuleView module="Website & CMS Management" title={currentView} />;
  }
  return <WebsiteDashboardView onNavigate={onNavigate} />;
}
