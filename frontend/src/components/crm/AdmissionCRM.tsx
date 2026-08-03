import { lazy, Suspense, type ReactNode } from 'react';
import { SubModuleView } from './shared/SubModuleView';

const LeadsPipelineView = lazy(() =>
  import('./Admission/LeadsPipelineView').then((m) => ({ default: m.LeadsPipelineView })),
);
const ApplicationsView = lazy(() =>
  import('./Admission/ApplicationsView').then((m) => ({ default: m.ApplicationsView })),
);
const FollowUpsView = lazy(() =>
  import('./Admission/FollowUpsView').then((m) => ({ default: m.FollowUpsView })),
);
const AdmissionTestView = lazy(() =>
  import('./Admission/AdmissionTestView').then((m) => ({ default: m.AdmissionTestView })),
);
const MeritListView = lazy(() =>
  import('./Admission/MeritListView').then((m) => ({ default: m.MeritListView })),
);
const SeatAllocationView = lazy(() =>
  import('./Admission/SeatAllocationView').then((m) => ({ default: m.SeatAllocationView })),
);
const AdmissionsView = lazy(() =>
  import('./Admission/AdmissionsView').then((m) => ({ default: m.AdmissionsView })),
);
const FeeCollectionView = lazy(() =>
  import('./Admission/FeeCollectionView').then((m) => ({ default: m.FeeCollectionView })),
);
const AdmissionReportsView = lazy(() =>
  import('./Admission/AdmissionReportsView').then((m) => ({ default: m.AdmissionReportsView })),
);
const CounsellingView = lazy(() =>
  import('./Admission/CounsellingView').then((m) => ({ default: m.CounsellingView })),
);
const EnquiriesManagementView = lazy(() =>
  import('./Admission/EnquiriesManagementView').then((m) => ({ default: m.EnquiriesManagementView })),
);

function isLeadsView(view: string) {
  return view === 'Leads' || view === 'Leads Pipeline';
}

function isFollowUpsView(view: string) {
  return view === 'Follow Ups' || view === 'Follow-ups';
}

function wrap(node: ReactNode) {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[30vh] text-sm text-slate-400">Loading page…</div>}>
      {node}
    </Suspense>
  );
}

export function AdmissionCRM({ currentView = 'Enquiries' }: { currentView?: string }) {
  if (isLeadsView(currentView)) {
    return wrap(<LeadsPipelineView />);
  }

  if (currentView === 'Applications') return wrap(<ApplicationsView />);
  if (isFollowUpsView(currentView)) return wrap(<FollowUpsView />);
  if (currentView === 'Admission Test') return wrap(<AdmissionTestView />);
  if (currentView === 'Merit List') return wrap(<MeritListView />);
  if (currentView === 'Seat Allocation') return wrap(<SeatAllocationView />);
  if (currentView === 'Admissions') return wrap(<AdmissionsView />);
  if (currentView === 'Fee Collection') return wrap(<FeeCollectionView />);
  if (currentView === 'Reports') return wrap(<AdmissionReportsView />);
  if (currentView === 'Counselling') return wrap(<CounsellingView />);

  if (currentView === 'Enquiries' || !currentView) {
    return wrap(<EnquiriesManagementView />);
  }

  return <SubModuleView module="Admission CRM" title={currentView} />;
}
