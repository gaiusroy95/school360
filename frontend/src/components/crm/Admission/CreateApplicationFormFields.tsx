import { useEffect, useMemo, useState } from 'react';
import type { Enquiry, EnquiryMeta } from '../../../lib/admissionServices';

type ApplicationDraft = {
  studentName: string;
  classApplied: string;
  mobile: string;
  email: string;
  dateOfBirth: string;
  fatherName: string;
  motherName: string;
  placeOfBirth: string;
  address: string;
  notes: string;
};

function draftFromEnquiry(enq?: Enquiry | null): ApplicationDraft {
  return {
    studentName: enq?.enquirerName || '',
    classApplied: enq?.classInterested || '',
    mobile: enq?.mobile || '',
    email: enq?.email || '',
    dateOfBirth: '',
    fatherName: '',
    motherName: '',
    placeOfBirth: '',
    address: '',
    notes: '',
  };
}

export function CreateApplicationFormFields({
  enquiries,
  meta,
  defaultEnquiryId,
}: {
  enquiries: Enquiry[];
  meta: EnquiryMeta;
  defaultEnquiryId?: string;
}) {
  const [enquiryDbId, setEnquiryDbId] = useState(defaultEnquiryId || enquiries[0]?.id || '');
  const [draft, setDraft] = useState<ApplicationDraft>(() => {
    const initial = enquiries.find((e) => e.id === (defaultEnquiryId || enquiries[0]?.id));
    return draftFromEnquiry(initial);
  });

  const selectedEnquiry = useMemo(
    () => enquiries.find((e) => e.id === enquiryDbId),
    [enquiries, enquiryDbId],
  );

  useEffect(() => {
    if (defaultEnquiryId) setEnquiryDbId(defaultEnquiryId);
  }, [defaultEnquiryId]);

  useEffect(() => {
    setDraft(draftFromEnquiry(selectedEnquiry));
  }, [selectedEnquiry]);

  const classOptions = useMemo(() => {
    const options = [...meta.classes];
    if (draft.classApplied && !options.includes(draft.classApplied)) {
      options.unshift(draft.classApplied);
    }
    return options;
  }, [meta.classes, draft.classApplied]);

  const update = (key: keyof ApplicationDraft, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <>
      <input type="hidden" name="enquiryDbId" value={enquiryDbId} />
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">Select Enquiry *</label>
        <select
          required
          value={enquiryDbId}
          onChange={(e) => setEnquiryDbId(e.target.value)}
          className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="">Choose enquiry...</option>
          {enquiries.map((e) => (
            <option key={e.id || e.enquiryId} value={e.id || ''}>
              {e.enquiryId} — {e.enquirerName}
            </option>
          ))}
        </select>
      </div>

      {selectedEnquiry && (
        <p className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
          Class Interested: <strong>{selectedEnquiry.classInterested || '—'}</strong>
          {' '}— autofilled into Class Applied below. You can change it if needed.
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Student Name *</label>
          <input
            name="studentName"
            required
            value={draft.studentName}
            onChange={(e) => update('studentName', e.target.value)}
            className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Date of Birth</label>
          <input
            name="dateOfBirth"
            type="date"
            value={draft.dateOfBirth}
            onChange={(e) => update('dateOfBirth', e.target.value)}
            className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Father&apos;s Name</label>
          <input
            name="fatherName"
            value={draft.fatherName}
            onChange={(e) => update('fatherName', e.target.value)}
            className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Mother&apos;s Name</label>
          <input
            name="motherName"
            value={draft.motherName}
            onChange={(e) => update('motherName', e.target.value)}
            className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Place of Birth</label>
          <input
            name="placeOfBirth"
            value={draft.placeOfBirth}
            onChange={(e) => update('placeOfBirth', e.target.value)}
            className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Class Applied *</label>
          <select
            name="classApplied"
            required
            value={draft.classApplied}
            onChange={(e) => update('classApplied', e.target.value)}
            className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">Select Class</option>
            {classOptions.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile</label>
          <input
            name="mobile"
            value={draft.mobile}
            onChange={(e) => update('mobile', e.target.value)}
            className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
          <input
            name="email"
            type="email"
            value={draft.email}
            onChange={(e) => update('email', e.target.value)}
            className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>
      <div className="mt-3">
        <label className="block text-xs font-semibold text-slate-700 mb-1">Address</label>
        <input
          name="address"
          value={draft.address}
          onChange={(e) => update('address', e.target.value)}
          className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>
      <div className="mt-3">
        <label className="block text-xs font-semibold text-slate-700 mb-1">Application Notes</label>
        <textarea
          name="notes"
          value={draft.notes}
          onChange={(e) => update('notes', e.target.value)}
          rows={3}
          placeholder="Optional notes for the application"
          className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>
    </>
  );
}
