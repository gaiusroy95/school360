import { SubModuleView } from './shared/SubModuleView';
import { CommunicationDashboardView } from './communication/CommunicationDashboardView';
import { ComposeMessageView } from './communication/ComposeMessageView';
import { MessageTemplatesView } from './communication/MessageTemplatesView';
import { SmsManagementView } from './communication/SmsManagementView';
import { EmailManagementView } from './communication/EmailManagementView';
import { WhatsAppManagementView } from './communication/WhatsAppManagementView';
import { PushNotificationsView } from './communication/PushNotificationsView';
import { CircularsNoticesView } from './communication/CircularsNoticesView';
import { EventInvitationsView } from './communication/EventInvitationsView';
import { SurveysFeedbackView } from './communication/SurveysFeedbackView';
import { AutoRemindersView } from './communication/AutoRemindersView';
import { MessageHistoryView } from './communication/MessageHistoryView';
import { CommunicationReportsAnalyticsView } from './communication/CommunicationReportsAnalyticsView';

export function CommunicationManagementCRM({
  currentView = 'Communication Dashboard',
  onNavigate,
}: {
  currentView?: string;
  onNavigate?: (view: string) => void;
}) {
  if (currentView === 'Communication Dashboard' || !currentView) {
    return <CommunicationDashboardView onNavigate={onNavigate} />;
  }
  if (currentView === 'Compose Message') {
    return <ComposeMessageView />;
  }
  if (currentView === 'Message Templates') {
    return <MessageTemplatesView />;
  }
  if (currentView === 'SMS Management') {
    return <SmsManagementView />;
  }
  if (currentView === 'Email Management') {
    return <EmailManagementView />;
  }
  if (currentView === 'WhatsApp Management') {
    return <WhatsAppManagementView />;
  }
  if (currentView === 'Push Notifications') {
    return <PushNotificationsView />;
  }
  if (currentView === 'Circulars / Notices') {
    return <CircularsNoticesView />;
  }
  if (currentView === 'Event Invitations') {
    return <EventInvitationsView />;
  }
  if (currentView === 'Surveys & Feedback') {
    return <SurveysFeedbackView />;
  }
  if (currentView === 'Auto Reminders') {
    return <AutoRemindersView />;
  }
  if (currentView === 'Message History') {
    return <MessageHistoryView />;
  }
  if (currentView === 'Reports & Analytics') {
    return <CommunicationReportsAnalyticsView />;
  }
  if (currentView) {
    return <SubModuleView module="Communication Management" title={currentView} />;
  }
  return <CommunicationDashboardView onNavigate={onNavigate} />;
}
