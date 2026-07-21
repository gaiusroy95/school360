import { LeadsPipelineView } from './Admission/LeadsPipelineView';
import { ApplicationsView } from './Admission/ApplicationsView';
import { FollowUpsView } from './Admission/FollowUpsView';
import { AdmissionTestView } from './Admission/AdmissionTestView';
import { MeritListView } from './Admission/MeritListView';
import { SeatAllocationView } from './Admission/SeatAllocationView';
import { AdmissionsView } from './Admission/AdmissionsView';
import { FeeCollectionView } from './Admission/FeeCollectionView';
import { AdmissionReportsView } from './Admission/AdmissionReportsView';
import { CounsellingView } from './Admission/CounsellingView';
import { EnquiriesManagementView } from './Admission/EnquiriesManagementView';
import { SubModuleView } from './shared/SubModuleView';

function isLeadsView(view: string) {
  return view === 'Leads' || view === 'Leads Pipeline';
}

function isFollowUpsView(view: string) {
  return view === 'Follow Ups' || view === 'Follow-ups';
}

export function AdmissionCRM({ currentView = 'Enquiries' }: { currentView?: string }) {
  if (isLeadsView(currentView)) {
    return <LeadsPipelineView />;
  }

  if (currentView === 'Applications') return <ApplicationsView />;
  if (isFollowUpsView(currentView)) return <FollowUpsView />;
  if (currentView === 'Admission Test') return <AdmissionTestView />;
  if (currentView === 'Merit List') return <MeritListView />;
  if (currentView === 'Seat Allocation') return <SeatAllocationView />;
  if (currentView === 'Admissions') return <AdmissionsView />;
  if (currentView === 'Fee Collection') return <FeeCollectionView />;
  if (currentView === 'Reports') return <AdmissionReportsView />;
  if (currentView === 'Counselling') return <CounsellingView />;

  if (currentView === 'Enquiries' || !currentView) {
    return <EnquiriesManagementView />;
  }

  return <SubModuleView module="Admission CRM" title={currentView} />;
}
