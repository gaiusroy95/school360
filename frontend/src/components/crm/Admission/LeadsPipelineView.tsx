import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { LeadsKanban } from './LeadsKanban';
import { EnquiryEditModal } from './EnquiryEditModal';
import { useAuth } from '../../../contexts/AuthContext';
import {
  fetchEnquiries,
  updateEnquiryStatus,
  type Enquiry,
  type EnquiryStatus,
} from '../../../lib/admissionServices';

export function LeadsPipelineView() {
  const { user } = useAuth();
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);

  const performer = user?.displayName || user?.email || 'Admin';

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetchEnquiries();
      setEnquiries(res.enquiries);
      setErrorMsg(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load leads');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleStatusChange = async (id: string, newStatus: EnquiryStatus) => {
    try {
      await updateEnquiryStatus(id, newStatus, undefined, performer);
      await refresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-50 text-sm text-slate-500">
        Loading leads...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="px-4 py-3 border-b border-slate-200 bg-white flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Leads Pipeline</h1>
          <p className="text-xs text-slate-500">Admission CRM &gt; Leads — drag cards to update status</p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={refreshing}
          className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50 flex items-center gap-1.5 disabled:opacity-50"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {errorMsg && (
        <div className="mx-4 mt-3 flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm">
          <AlertCircle size={16} />
          {errorMsg}
        </div>
      )}

      <LeadsKanban
        enquiries={enquiries}
        onStatusUpdate={handleStatusChange}
        onEdit={(enq) => setSelectedEnquiry(enq)}
      />

      {selectedEnquiry && (
        <EnquiryEditModal
          enquiry={selectedEnquiry}
          performer={performer}
          onClose={() => setSelectedEnquiry(null)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}
