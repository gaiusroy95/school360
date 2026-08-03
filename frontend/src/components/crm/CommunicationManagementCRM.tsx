import { lazy, Suspense, type ReactNode } from 'react';
import { SubModuleView } from './shared/SubModuleView';

const CommunicationDashboardView = lazy(() =>
  import('./communication/CommunicationDashboardView').then((m) => ({ default: m.CommunicationDashboardView })),
);
const ComposeMessageView = lazy(() =>
  import('./communication/ComposeMessageView').then((m) => ({ default: m.ComposeMessageView })),
);
const MessageTemplatesView = lazy(() =>
  import('./communication/MessageTemplatesView').then((m) => ({ default: m.MessageTemplatesView })),
);
const SmsManagementView = lazy(() =>
  import('./communication/SmsManagementView').then((m) => ({ default: m.SmsManagementView })),
);
const EmailManagementView = lazy(() =>
  import('./communication/EmailManagementView').then((m) => ({ default: m.EmailManagementView })),
);
const WhatsAppManagementView = lazy(() =>
  import('./communication/WhatsAppManagementView').then((m) => ({ default: m.WhatsAppManagementView })),
);
const PushNotificationsView = lazy(() =>
  import('./communication/PushNotificationsView').then((m) => ({ default: m.PushNotificationsView })),
);
const CircularsNoticesView = lazy(() =>
  import('./communication/CircularsNoticesView').then((m) => ({ default: m.CircularsNoticesView })),
);
const EventInvitationsView = lazy(() =>
  import('./communication/EventInvitationsView').then((m) => ({ default: m.EventInvitationsView })),
);
const SurveysFeedbackView = lazy(() =>
  import('./communication/SurveysFeedbackView').then((m) => ({ default: m.SurveysFeedbackView })),
);
const AutoRemindersView = lazy(() =>
  import('./communication/AutoRemindersView').then((m) => ({ default: m.AutoRemindersView })),
);
const MessageHistoryView = lazy(() =>
  import('./communication/MessageHistoryView').then((m) => ({ default: m.MessageHistoryView })),
);
const CommunicationReportsAnalyticsView = lazy(() =>
  import('./communication/CommunicationReportsAnalyticsView').then((m) => ({ default: m.CommunicationReportsAnalyticsView })),
);

function wrap(node: ReactNode) {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[30vh] text-sm text-slate-400">Loading page…</div>}>
      {node}
    </Suspense>
  );
}

export function CommunicationManagementCRM({
  currentView = 'Communication Dashboard',
  onNavigate,
}: {
  currentView?: string;
  onNavigate?: (view: string) => void;
}) {
  if (currentView === 'Communication Dashboard' || !currentView) {
    return wrap(<CommunicationDashboardView onNavigate={onNavigate} />);
  }
  if (currentView === 'Compose Message') {
    return wrap(<ComposeMessageView />);
  }
  if (currentView === 'Message Templates') {
    return wrap(<MessageTemplatesView />);
  }
  if (currentView === 'SMS Management') {
    return wrap(<SmsManagementView />);
  }
  if (currentView === 'Email Management') {
    return wrap(<EmailManagementView />);
  }
  if (currentView === 'WhatsApp Management') {
    return wrap(<WhatsAppManagementView />);
  }
  if (currentView === 'Push Notifications') {
    return wrap(<PushNotificationsView />);
  }
  if (currentView === 'Circulars / Notices') {
    return wrap(<CircularsNoticesView />);
  }
  if (currentView === 'Event Invitations') {
    return wrap(<EventInvitationsView />);
  }
  if (currentView === 'Surveys & Feedback') {
    return wrap(<SurveysFeedbackView />);
  }
  if (currentView === 'Auto Reminders') {
    return wrap(<AutoRemindersView />);
  }
  if (currentView === 'Message History') {
    return wrap(<MessageHistoryView />);
  }
  if (currentView === 'Reports & Analytics') {
    return wrap(<CommunicationReportsAnalyticsView />);
  }
  if (currentView) {
    return <SubModuleView module="Communication Management" title={currentView} />;
  }
  return wrap(<CommunicationDashboardView onNavigate={onNavigate} />);
}
