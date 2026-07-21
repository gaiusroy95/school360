import type { EnquiryInput, EnquiryStatus } from './admissionServices';

/** Ensure Indian mobile numbers are stored with +91 prefix. */
export function normalizeIndiaMobile(raw: string): string {
  let v = String(raw || '').trim().replace(/[\s()-]/g, '');
  if (!v) return '+91';
  if (v.startsWith('+91')) {
    const rest = v.slice(3).replace(/\D/g, '');
    return `+91${rest}`;
  }
  if (v.startsWith('91') && v.length >= 12) {
    return `+${v.replace(/\D/g, '')}`;
  }
  if (v.startsWith('0') && v.length === 11) {
    return `+91${v.slice(1).replace(/\D/g, '')}`;
  }
  const digits = v.replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.startsWith('91') && digits.length >= 12) return `+${digits}`;
  return v.startsWith('+') ? v : `+91${digits || v}`;
}

export function enquiryInputFromForm(
  formData: FormData,
  defaults: { status?: EnquiryStatus; performer?: string },
): EnquiryInput {
  const mobile = normalizeIndiaMobile(String(formData.get('mobile') || ''));
  return {
    enquirerName: String(formData.get('enquirerName') || ''),
    mobile,
    email: String(formData.get('email') || ''),
    classInterested: String(formData.get('classInterested') || ''),
    source: String(formData.get('source') || ''),
    status: String(formData.get('status') || defaults.status || 'New') as EnquiryStatus,
    assignedTo: String(formData.get('assignedTo') || defaults.performer || ''),
    nextFollowUp: String(formData.get('nextFollowUp') || '') || undefined,
    notes: String(formData.get('notes') || '') || undefined,
  };
}
