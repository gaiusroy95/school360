import { lazy, Suspense, type ReactNode } from 'react';

const ParentsListView = lazy(() =>
  import('./ParentManagement/ParentsListView').then((m) => ({ default: m.ParentsListView })),
);
const ParentProfilesView = lazy(() =>
  import('./ParentManagement/ParentProfilesView').then((m) => ({ default: m.ParentProfilesView })),
);
const ParentsEngagementView = lazy(() =>
  import('./ParentManagement/ParentsEngagementView').then((m) => ({ default: m.ParentsEngagementView })),
);
const CommunicationLogView = lazy(() =>
  import('./ParentManagement/CommunicationLogView').then((m) => ({ default: m.CommunicationLogView })),
);
const ParentCategoriesView = lazy(() =>
  import('./ParentManagement/ParentCategoriesView').then((m) => ({ default: m.ParentCategoriesView })),
);
const ParentFeedbackView = lazy(() =>
  import('./ParentManagement/ParentFeedbackView').then((m) => ({ default: m.ParentFeedbackView })),
);
const ParentMeetingsView = lazy(() =>
  import('./ParentManagement/ParentMeetingsView').then((m) => ({ default: m.ParentMeetingsView })),
);
const ConsentManagementView = lazy(() =>
  import('./ParentManagement/ConsentManagementView').then((m) => ({ default: m.ConsentManagementView })),
);

type Props = {
  currentView?: string;
  onNavigate?: (view: string) => void;
};

function wrap(node: ReactNode) {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[30vh] text-sm text-slate-400">Loading page…</div>}>
      {node}
    </Suspense>
  );
}

export function ParentManagementCRM({ currentView = 'Parents List', onNavigate }: Props) {
  switch (currentView) {
    case 'Parent Profiles':
      return wrap(<ParentProfilesView />);
    case 'Parents Engagement':
      return wrap(<ParentsEngagementView />);
    case 'Communication Log':
      return wrap(<CommunicationLogView />);
    case 'Parent Categories':
      return wrap(<ParentCategoriesView onNavigate={onNavigate} />);
    case 'Parent Feedback':
      return wrap(<ParentFeedbackView />);
    case 'Parent Meetings (PTM)':
      return wrap(<ParentMeetingsView />);
    case 'Consent Management':
      return wrap(<ConsentManagementView />);
    case 'Parents List':
    default:
      return wrap(<ParentsListView onNavigate={onNavigate} />);
  }
}
