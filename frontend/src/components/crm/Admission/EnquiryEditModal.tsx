import React, { useEffect, useState } from 'react';
import { Edit, X } from 'lucide-react';
import {
  fetchEnquiryMeta,
  updateEnquiry,
  type Enquiry,
  type EnquiryMeta,
} from '../../../lib/admissionServices';
import { enquiryInputFromForm, normalizeIndiaMobile } from '../../../lib/enquiryFormUtils';

type Props = {
  enquiry: Enquiry;
  performer: string;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
};

export function EnquiryEditModal({ enquiry, performer, onClose, onSaved }: Props) {
  const [meta, setMeta] = useState<EnquiryMeta>({ classes: [], sources: [], statuses: [] });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchEnquiryMeta()
      .then(setMeta)
      .catch(() => {
        /* keep defaults */
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!enquiry.id) {
      setError('Cannot update: missing enquiry id');
      return;
    }
    setSubmitting(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    const mobile = normalizeIndiaMobile(String(formData.get('mobile') || ''));
    if (!/^\+91\d{10}$/.test(mobile)) {
      setError('Mobile number must be +91 followed by 10 digits.');
      setSubmitting(false);
      return;
    }
    const payload = enquiryInputFromForm(formData, {
      status: enquiry.status,
      performer,
    });
    try {
      await updateEnquiry(enquiry.id, payload);
      await onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update enquiry');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Edit size={20} className="text-indigo-600" />
            Edit Lead — {enquiry.enquiryId}
          </h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:bg-slate-200 p-2 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>
          )}
          <EnquiryFormFields meta={meta} performer={performer} enquiry={enquiry} />
          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
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
              {submitting ? 'Saving...' : 'Update Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  type = 'text',
  required,
  placeholder,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1">{label}</label>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
      />
    </div>
  );
}

function MobileNumberField({ defaultValue }: { defaultValue?: string }) {
  const initial = defaultValue?.trim() ? normalizeIndiaMobile(defaultValue) : '+91';
  const [value, setValue] = useState(initial);

  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Number *</label>
      <div className="flex rounded-lg border border-slate-300 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500">
        <span className="px-3 py-2 bg-slate-50 text-sm font-semibold text-slate-600 border-r border-slate-300 select-none">
          +91
        </span>
        <input
          type="tel"
          inputMode="numeric"
          required
          placeholder="9876543210"
          value={value.startsWith('+91') ? value.slice(3) : value.replace(/^\+?91/, '')}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
            setValue(`+91${digits}`);
          }}
          className="flex-1 p-2 text-sm focus:outline-none"
        />
      </div>
      <input type="hidden" name="mobile" value={value} />
    </div>
  );
}

function EnquiryFormFields({
  meta,
  performer,
  enquiry,
}: {
  meta: EnquiryMeta;
  performer: string;
  enquiry: Enquiry;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Field label="Enquirer Name *" name="enquirerName" required defaultValue={enquiry.enquirerName} />
      <MobileNumberField defaultValue={enquiry.mobile} />
      <Field label="Email Address" name="email" type="email" defaultValue={enquiry.email} />
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">Class Interested *</label>
        <select
          name="classInterested"
          required
          defaultValue={enquiry.classInterested || ''}
          className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="">Select Class</option>
          {meta.classes.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">Source *</label>
        <select
          name="source"
          required
          defaultValue={enquiry.source || meta.sources[0] || 'Website'}
          className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          {meta.sources.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
        <select
          name="status"
          defaultValue={enquiry.status}
          className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          {meta.statuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <Field label="Assigned To" name="assignedTo" defaultValue={enquiry.assignedTo || performer} />
      <Field
        label="Next Follow Up Date"
        name="nextFollowUp"
        type="date"
        defaultValue={enquiry.nextFollowUp?.slice(0, 10)}
      />
      <div className="md:col-span-2">
        <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
        <textarea
          name="notes"
          rows={3}
          defaultValue={enquiry.notes}
          className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Additional notes..."
        />
      </div>
    </div>
  );
}
