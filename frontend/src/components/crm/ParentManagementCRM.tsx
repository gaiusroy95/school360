import { ParentsListView } from './ParentManagement/ParentsListView';
import { ParentProfilesView } from './ParentManagement/ParentProfilesView';
import { ParentsEngagementView } from './ParentManagement/ParentsEngagementView';
import { CommunicationLogView } from './ParentManagement/CommunicationLogView';
import { ParentCategoriesView } from './ParentManagement/ParentCategoriesView';
import { ParentFeedbackView } from './ParentManagement/ParentFeedbackView';
import { ParentMeetingsView } from './ParentManagement/ParentMeetingsView';
import { ConsentManagementView } from './ParentManagement/ConsentManagementView';

type Props = {
  currentView?: string;
  onNavigate?: (view: string) => void;
};

export function ParentManagementCRM({ currentView = 'Parents List', onNavigate }: Props) {
  switch (currentView) {
    case 'Parent Profiles':
      return <ParentProfilesView />;
    case 'Parents Engagement':
      return <ParentsEngagementView />;
    case 'Communication Log':
      return <CommunicationLogView />;
    case 'Parent Categories':
      return <ParentCategoriesView onNavigate={onNavigate} />;
    case 'Parent Feedback':
      return <ParentFeedbackView />;
    case 'Parent Meetings (PTM)':
      return <ParentMeetingsView />;
    case 'Consent Management':
      return <ConsentManagementView />;
    case 'Parents List':
    default:
      return <ParentsListView onNavigate={onNavigate} />;
  }
}
