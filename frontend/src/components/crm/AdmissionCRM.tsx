import { LeadsKanban } from './Admission/LeadsKanban';
import { ApplicationsView } from './Admission/ApplicationsView';
import { FollowUpsView } from './Admission/FollowUpsView';
import { AdmissionTestView } from './Admission/AdmissionTestView';
import { CounsellingView } from './Admission/CounsellingView';
import { EnquiriesManagementView } from './Admission/EnquiriesManagementView';
import { SubModuleView } from './shared/SubModuleView';
import { useAuth } from '../../contexts/AuthContext';
import { useEffect, useState } from 'react';
import {
  fetchEnquiries,
  updateEnquiryStatus,
  type Enquiry,
  type EnquiryStatus,
} from '../../lib/admissionServices';

export function AdmissionCRM({ currentView = 'Enquiries' }: { currentView?: string }) {
  const { user } = useAuth();
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);

  useEffect(() => {
    if (currentView !== 'Leads Pipeline') return;
    let cancelled = false;
    void fetchEnquiries()
      .then((res) => {
        if (!cancelled) setEnquiries(res.enquiries);
      })
      .catch(() => {
        if (!cancelled) setEnquiries([]);
      });
    return () => {
      cancelled = true;
    };
  }, [currentView]);

  const handleStatusChange = async (id: string, newStatus: EnquiryStatus) => {
    await updateEnquiryStatus(id, newStatus, undefined, user?.displayName || user?.email);
    const res = await fetchEnquiries();
    setEnquiries(res.enquiries);
  };

  if (currentView === 'Leads Pipeline') {
    return (
      <LeadsKanban
        enquiries={enquiries}
        onStatusUpdate={handleStatusChange}
        onEdit={() => undefined}
      />
    );
  }

  if (currentView === 'Applications') return <ApplicationsView />;
  if (currentView === 'Follow-ups') return <FollowUpsView />;
  if (currentView === 'Admission Test') return <AdmissionTestView />;
  if (currentView === 'Counselling') return <CounsellingView />;

  if (currentView === 'Enquiries' || !currentView) {
    return <EnquiriesManagementView />;
  }

  return <SubModuleView module="Admission CRM" title={currentView} />;
}
