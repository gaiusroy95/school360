import { api } from './api';

export type InstitutionProfile = {
  name: string;
  shortName: string;
  registrationNo: string;
  affiliationNo: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  phone: string;
  email: string;
  website: string;
  logoUrl: string;
  currency: string;
  receiptFooter: string;
};

export type FeeHead = {
  key: string;
  label: string;
  amount: number;
};

export type FeeSchedule = {
  class: string;
  section: string;
  frequency: string;
  refundable: string;
  heads: FeeHead[];
  total: number;
};

export type FeeStudent = {
  admissionRecordId: string;
  admissionNumber: string;
  studentName: string;
  fatherName: string;
  mobile: string;
  email: string;
  className: string;
  sectionName: string;
  academicYear: string;
};

export type FeeReceipt = {
  id: string;
  receiptNumber: string;
  admissionRecordId: string | null;
  studentName: string;
  admissionNumber: string;
  className: string;
  sectionName: string;
  academicYear: string;
  paymentMode: string;
  paymentModeKey: string;
  amountPaid: number;
  feeBreakdown: FeeHead[];
  remarks: string;
  collectedBy: string;
  collectedAt: string;
  institution: InstitutionProfile;
};

export async function fetchFeeCollectionMeta() {
  return api<{
    institution: InstitutionProfile;
    currency: string;
    feeConfigured: boolean;
    schedules: FeeSchedule[];
    feeHeadLabels: Record<string, string>;
    paymentModes: Array<{ key: string; label: string }>;
    students: FeeStudent[];
    summary: {
      confirmedAdmissions: number;
      totalReceipts: number;
      totalCollected: number;
    };
    setupHint: string;
  }>('/api/fee-collection/meta');
}

export async function fetchFeeSchedule(className: string, sectionName: string) {
  const q = new URLSearchParams({ className, sectionName });
  return api<{ schedule: FeeSchedule; currency: string }>(`/api/fee-collection/schedule?${q}`);
}

export async function fetchFeeReceipts(params?: { q?: string }) {
  const q = new URLSearchParams();
  if (params?.q) q.set('q', params.q);
  const qs = q.toString();
  return api<{ receipts: FeeReceipt[] }>(`/api/fee-collection${qs ? `?${qs}` : ''}`);
}

export async function fetchFeeReceipt(id: string) {
  return api<{ receipt: FeeReceipt }>(`/api/fee-collection/${id}`);
}

export async function collectFee(payload: {
  admissionRecordId: string;
  paymentMode: string;
  feeItems: Array<{ key: string; label?: string; amount: number }>;
  remarks?: string;
  amountPaid?: number;
}) {
  return api<{ receipt: FeeReceipt; message: string }>('/api/fee-collection', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
