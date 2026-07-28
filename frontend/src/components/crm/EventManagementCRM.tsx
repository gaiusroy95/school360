import { EventInvitationsView } from './communication/EventInvitationsView';
import { SurveysFeedbackView } from './communication/SurveysFeedbackView';
import { SubModuleView } from './shared/SubModuleView';
import { EventDashboardView } from './events/EventDashboardView';
import { EventCalendarView } from './events/EventCalendarView';
import { EventAttendeesView } from './events/EventAttendeesView';
import { EventReportsView } from './events/EventReportsView';
import { WardensStaffView } from './hostel/WardensStaffView';

export function EventManagementCRM({
  currentView = 'Event Dashboard',
  onNavigate,
}: {
  currentView?: string;
  onNavigate?: (view: string) => void;
}) {
  if (currentView === 'Event Dashboard' || !currentView) {
    return <EventDashboardView onNavigate={onNavigate} />;
  }
  if (currentView === 'Events List') {
    return <EventInvitationsView />;
  }
  if (currentView === 'Create Event') {
    return <EventInvitationsView initialComposeOpen headerTitle="Create Event" headerSubtitle="Set up a new school event with invitations and RSVP tracking" />;
  }
  if (currentView === 'Event Calendar') {
    return <EventCalendarView />;
  }
  if (currentView === 'Registrations') {
    return <EventAttendeesView mode="registrations" />;
  }
  if (currentView === 'Tickets & Passes') {
    return <EventAttendeesView mode="tickets" />;
  }
  if (currentView === 'Volunteers') {
    return <WardensStaffView />;
  }
  if (currentView === 'Feedback & Surveys') {
    return <SurveysFeedbackView />;
  }
  if (currentView === 'Reports & Analytics') {
    return <EventReportsView />;
  }
  if (currentView === 'Vendors & Sponsors' || currentView === 'Task Management' || currentView === 'Certificates') {
    return <SubModuleView module="Event Management" title={currentView} />;
  }
  if (currentView) {
    return <SubModuleView module="Event Management" title={currentView} />;
  }
  return <EventDashboardView onNavigate={onNavigate} />;
}
