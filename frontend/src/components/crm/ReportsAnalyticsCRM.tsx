import { VIEW_TO_CATEGORY } from '../../lib/reportsAnalyticsServices';
import { ReportsDashboardView } from './ReportsAnalytics/ReportsDashboardView';
import { CategoryReportsView } from './ReportsAnalytics/CategoryReportsView';
import { CustomReportsView } from './ReportsAnalytics/CustomReportsView';

export function ReportsAnalyticsCRM({
  currentView = 'Reports Dashboard',
  onNavigate,
}: {
  currentView?: string;
  onNavigate?: (view: string) => void;
}) {
  if (currentView === 'Custom Reports') {
    return <CustomReportsView />;
  }

  const category = VIEW_TO_CATEGORY[currentView];
  if (category && category !== 'custom') {
    return <CategoryReportsView category={category} title={currentView} />;
  }

  return <ReportsDashboardView onNavigate={onNavigate} />;
}
