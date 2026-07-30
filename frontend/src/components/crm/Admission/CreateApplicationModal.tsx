import { useEffect, useState } from 'react';
import { Target, X } from 'lucide-react';
import {
  fetchEnquiries,
  fetchEnquiryMeta,
  type Enquiry,
  type EnquiryMeta,
} from '../../../lib/admissionServices';
import { createApplicationFromEnquiry } from '../../../lib/applicationServices';
import { CreateApplicationFormFields } from './CreateApplicationFormFields';

type CreateApplicationModalProps = {
  open: boolean;
  onClose: () => void;
  performer: string;
  onCreated?: (applicationId?: string, studentName?: string) => void;
  defaultEnquiryId?: string;
};

export function CreateApplicationModal({
  open,
  onClose,
  performer,
  onCreated,
  defaultEnquiryId,
}: CreateApplicationModalProps) {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [meta, setMeta] = useState<EnquiryMeta>({
    classes: [],
    sources: [],
    statuses: [],
    counselors: [],
  });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    void Promise.all([fetchEnquiries(), fetchEnquiryMeta()])
      .then(([enqRes, metaRes]) => {
        setEnquiries(enqRes.enquiries);
        setMeta(metaRes);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load enquiries');
      })
      .finally(() => setLoading(false));
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const enquiryDbId = String(formData.get('enquiryDbId') || '');
    if (!enquiryDbId) {
      setError('Select an enquiry');
      return;
    }
    const enq = enquiries.find((x) => x.id === enquiryDbId);
    setSubmitting(true);
    setError(null);
    try {
      const res = await createApplicationFromEnquiry(enquiryDbId, {
        notes: String(formData.get('notes') || '').trim(),
        submittedBy: performer,
        studentName: String(formData.get('studentName') || enq?.enquirerName || ''),
        dateOfBirth: String(formData.get('dateOfBirth') || '') || undefined,
        fatherName: String(formData.get('fatherName') || '') || undefined,
        motherName: String(formData.get('motherName') || '') || undefined,
        placeOfBirth: String(formData.get('placeOfBirth') || '') || undefined,
        classApplied: String(formData.get('classApplied') || enq?.classInterested || '') || undefined,
        mobile: String(formData.get('mobile') || enq?.mobile || '') || undefined,
        email: String(formData.get('email') || enq?.email || '') || undefined,
        address: String(formData.get('address') || '') || undefined,
      });
      onCreated?.(res.application?.id, res.application?.studentName || enq?.enquirerName);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create application');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Target size={20} className="text-indigo-600" />
            Create Application
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:bg-slate-200 p-2 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {error && (
            <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <p className="text-sm text-slate-500 text-center py-8">Loading enquiries...</p>
          ) : enquiries.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">
              No enquiries available. Add an enquiry first, then create an application from it.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-slate-600">
                Complete the application form. Fields are pre-filled from the enquiry where possible.
              </p>
              <CreateApplicationFormFields
                key={`create-app-modal-${defaultEnquiryId || 'default'}`}
                enquiries={enquiries}
                meta={meta}
                defaultEnquiryId={defaultEnquiryId}
              />
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Confirm'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
