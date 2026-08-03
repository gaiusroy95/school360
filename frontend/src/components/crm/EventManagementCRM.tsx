import { lazy, Suspense, type ReactNode } from 'react';
import { SubModuleView } from './shared/SubModuleView';

const EventInvitationsView = lazy(() =>
  import('./communication/EventInvitationsView').then((m) => ({ default: m.EventInvitationsView })),
);
const SurveysFeedbackView = lazy(() =>
  import('./communication/SurveysFeedbackView').then((m) => ({ default: m.SurveysFeedbackView })),
);
const EventDashboardView = lazy(() =>
  import('./events/EventDashboardView').then((m) => ({ default: m.EventDashboardView })),
);
const EventCalendarView = lazy(() =>
  import('./events/EventCalendarView').then((m) => ({ default: m.EventCalendarView })),
);
const EventAttendeesView = lazy(() =>
  import('./events/EventAttendeesView').then((m) => ({ default: m.EventAttendeesView })),
);
const EventReportsView = lazy(() =>
  import('./events/EventReportsView').then((m) => ({ default: m.EventReportsView })),
);
const WardensStaffView = lazy(() =>
  import('./hostel/WardensStaffView').then((m) => ({ default: m.WardensStaffView })),
);

function wrap(node: ReactNode) {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[30vh] text-sm text-slate-400">Loading page…</div>}>
      {node}
    </Suspense>
  );
}

export function EventManagementCRM({
  currentView = 'Event Dashboard',
  onNavigate,
}: {
  currentView?: string;
  onNavigate?: (view: string) => void;
}) {
  if (currentView === 'Event Dashboard' || !currentView) {
    return wrap(<EventDashboardView onNavigate={onNavigate} />);
  }
  if (currentView === 'Events List') {
    return wrap(<EventInvitationsView />);
  }
  if (currentView === 'Create Event') {
    return wrap(<EventInvitationsView initialComposeOpen headerTitle="Create Event" headerSubtitle="Set up a new school event with invitations and RSVP tracking" />);
  }
  if (currentView === 'Event Calendar') {
    return wrap(<EventCalendarView />);
  }
  if (currentView === 'Registrations') {
    return wrap(<EventAttendeesView mode="registrations" />);
  }
  if (currentView === 'Tickets & Passes') {
    return wrap(<EventAttendeesView mode="tickets" />);
  }
  if (currentView === 'Volunteers') {
    return wrap(<WardensStaffView />);
  }
  if (currentView === 'Feedback & Surveys') {
    return wrap(<SurveysFeedbackView />);
  }
  if (currentView === 'Reports & Analytics') {
    return wrap(<EventReportsView />);
  }
  if (currentView === 'Vendors & Sponsors' || currentView === 'Task Management' || currentView === 'Certificates') {
    return <SubModuleView module="Event Management" title={currentView} />;
  }
  if (currentView) {
    return <SubModuleView module="Event Management" title={currentView} />;
  }
  return wrap(<EventDashboardView onNavigate={onNavigate} />);
}
