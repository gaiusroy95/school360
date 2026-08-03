import { lazy, Suspense, type ReactNode } from 'react';
import { VIEW_TO_CATEGORY } from '../../lib/reportsAnalyticsServices';

const ReportsDashboardView = lazy(() =>
  import('./ReportsAnalytics/ReportsDashboardView').then((m) => ({ default: m.ReportsDashboardView })),
);
const CategoryReportsView = lazy(() =>
  import('./ReportsAnalytics/CategoryReportsView').then((m) => ({ default: m.CategoryReportsView })),
);
const CustomReportsView = lazy(() =>
  import('./ReportsAnalytics/CustomReportsView').then((m) => ({ default: m.CustomReportsView })),
);

function wrap(node: ReactNode) {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[30vh] text-sm text-slate-400">Loading page…</div>}>
      {node}
    </Suspense>
  );
}

export function ReportsAnalyticsCRM({
  currentView = 'Reports Dashboard',
  onNavigate,
}: {
  currentView?: string;
  onNavigate?: (view: string) => void;
}) {
  if (currentView === 'Custom Reports') {
    return wrap(<CustomReportsView />);
  }

  const category = VIEW_TO_CATEGORY[currentView];
  if (category && category !== 'custom') {
    return wrap(<CategoryReportsView category={category} title={currentView} />);
  }

  return wrap(<ReportsDashboardView onNavigate={onNavigate} />);
}
