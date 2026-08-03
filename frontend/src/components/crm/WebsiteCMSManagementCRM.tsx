import { lazy, Suspense, type ReactNode } from 'react';
import { SubModuleView } from './shared/SubModuleView';

const WebsiteDashboardView = lazy(() =>
  import('./website/WebsiteDashboardView').then((m) => ({ default: m.WebsiteDashboardView })),
);
const PagesManagementView = lazy(() =>
  import('./website/PagesManagementView').then((m) => ({ default: m.PagesManagementView })),
);
const BlogManagementView = lazy(() =>
  import('./website/BlogManagementView').then((m) => ({ default: m.BlogManagementView })),
);
const MediaLibraryView = lazy(() =>
  import('./website/MediaLibraryView').then((m) => ({ default: m.MediaLibraryView })),
);
const MenusNavigationView = lazy(() =>
  import('./website/MenusNavigationView').then((m) => ({ default: m.MenusNavigationView })),
);
const SlidersBannersView = lazy(() =>
  import('./website/SlidersBannersView').then((m) => ({ default: m.SlidersBannersView })),
);
const TestimonialsView = lazy(() =>
  import('./website/TestimonialsView').then((m) => ({ default: m.TestimonialsView })),
);
const FormsManagementView = lazy(() =>
  import('./website/FormsManagementView').then((m) => ({ default: m.FormsManagementView })),
);
const PopupsNoticesView = lazy(() =>
  import('./website/PopupsNoticesView').then((m) => ({ default: m.PopupsNoticesView })),
);
const SeoManagementView = lazy(() =>
  import('./website/SeoManagementView').then((m) => ({ default: m.SeoManagementView })),
);
const ThemeAppearanceView = lazy(() =>
  import('./website/ThemeAppearanceView').then((m) => ({ default: m.ThemeAppearanceView })),
);
const BackupRestoreView = lazy(() =>
  import('./website/BackupRestoreView').then((m) => ({ default: m.BackupRestoreView })),
);
const AnalyticsReportsView = lazy(() =>
  import('./website/AnalyticsReportsView').then((m) => ({ default: m.AnalyticsReportsView })),
);

function wrap(node: ReactNode) {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[30vh] text-sm text-slate-400">Loading page…</div>}>
      {node}
    </Suspense>
  );
}

export function WebsiteCMSManagementCRM({
  currentView = 'Website Dashboard',
  onNavigate,
}: {
  currentView?: string;
  onNavigate?: (view: string) => void;
}) {
  if (currentView === 'Website Dashboard' || !currentView) {
    return wrap(<WebsiteDashboardView onNavigate={onNavigate} />);
  }
  if (currentView === 'Pages Management') {
    return wrap(<PagesManagementView />);
  }
  if (currentView === 'Blog Management') {
    return wrap(<BlogManagementView />);
  }
  if (currentView === 'Media Library') {
    return wrap(<MediaLibraryView />);
  }
  if (currentView === 'Menus & Navigation') {
    return wrap(<MenusNavigationView />);
  }
  if (currentView === 'Sliders & Banners') {
    return wrap(<SlidersBannersView />);
  }
  if (currentView === 'Testimonials') {
    return wrap(<TestimonialsView />);
  }
  if (currentView === 'Forms Management') {
    return wrap(<FormsManagementView />);
  }
  if (currentView === 'Popups & Notices') {
    return wrap(<PopupsNoticesView />);
  }
  if (currentView === 'SEO Management') {
    return wrap(<SeoManagementView />);
  }
  if (currentView === 'Theme & Appearance') {
    return wrap(<ThemeAppearanceView />);
  }
  if (currentView === 'Backup & Restore') {
    return wrap(<BackupRestoreView />);
  }
  if (currentView === 'Analytics & Reports') {
    return wrap(<AnalyticsReportsView />);
  }
  if (currentView) {
    return <SubModuleView module="Website & CMS Management" title={currentView} />;
  }
  return wrap(<WebsiteDashboardView onNavigate={onNavigate} />);
}
