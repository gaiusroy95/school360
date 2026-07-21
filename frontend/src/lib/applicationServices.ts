import { api, getToken, API_URL } from './api';

export type ApplicationStatus =
  | 'Pending Verification'
  | 'Verified'
  | 'Approved'
  | 'Rejected';

export type ApplicationDocumentType =
  | 'Birth Certificate'
  | 'Previous Marksheet'
  | 'Address Proof'
  | 'Other';

export type VerificationField = {
  key: string;
  label: string;
  formValue: string;
  documentValue: string;
  match: boolean;
};

export interface ApplicationDocument {
  id: string;
  type: ApplicationDocumentType | string;
  fileName: string;
  mimeType: string;
  extractedFields: Record<string, string>;
  uploadedAt: string;
  uploadedBy: string;
}

export interface Application {
  id: string;
  applicationId: string;
  enquiryId?: string | null;
  enquiryCode?: string;
  enquiryName?: string;
  submittedAt: string;
  submittedBy: string;
  studentName: string;
  dateOfBirth: string;
  fatherName: string;
  motherName: string;
  placeOfBirth: string;
  classApplied: string;
  mobile: string;
  email: string;
  address: string;
  entranceTestScore: number | null;
  entranceTestMax: number | null;
  status: ApplicationStatus;
  reviewedBy: string;
  reviewedAt: string;
  approvalRemarks: string;
  rejectionRemarks: string;
  notes: string;
  verificationScore: number;
  verificationFields: VerificationField[];
  mismatches: VerificationField[];
  documents: ApplicationDocument[];
  createdAt: string;
  updatedAt: string;
}

export type ApplicationInput = {
  enquiryId?: string;
  studentName: string;
  dateOfBirth?: string;
  fatherName?: string;
  motherName?: string;
  placeOfBirth?: string;
  classApplied?: string;
  mobile?: string;
  email?: string;
  address?: string;
  entranceTestScore?: number | null;
  entranceTestMax?: number | null;
  notes?: string;
  submittedBy?: string;
};

export async function fetchApplications(params?: { status?: string; q?: string }) {
  const q = new URLSearchParams();
  if (params?.status) q.set('status', params.status);
  if (params?.q) q.set('q', params.q);
  const qs = q.toString();
  return api<{ applications: Application[]; total: number }>(
    `/api/applications${qs ? `?${qs}` : ''}`,
  );
}

export async function fetchApplication(id: string) {
  return api<{ application: Application }>(`/api/applications/${id}`);
}

export type ApplicationFormDocument = {
  name: string;
  description: string;
  mandatory: boolean;
  acceptedFormats: string;
};

export async function fetchApplicationMeta() {
  return api<{
    statuses: string[];
    documentTypes: string[];
    applicationDocuments: ApplicationFormDocument[];
    comparisonFields: { key: string; label: string }[];
  }>('/api/applications/meta');
}

export async function createApplication(data: ApplicationInput) {
  return api<{ application: Application }>('/api/applications', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function createApplicationFromEnquiry(
  enquiryId: string,
  data?: Partial<ApplicationInput> & { notes?: string; submittedBy?: string },
) {
  return api<{ application: Application }>(`/api/applications/from-enquiry/${enquiryId}`, {
    method: 'POST',
    body: JSON.stringify(data || {}),
  });
}

export async function updateApplication(id: string, data: Partial<ApplicationInput>) {
  return api<{ application: Application }>(`/api/applications/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function uploadApplicationDocument(
  applicationId: string,
  payload: {
    type: string;
    fileName: string;
    mimeType: string;
    fileData: string;
    extractedFields?: Record<string, string>;
  },
) {
  return api<{ document: ApplicationDocument }>(`/api/applications/${applicationId}/documents`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateDocumentExtractedFields(
  applicationId: string,
  docId: string,
  extractedFields: Record<string, string>,
) {
  return api<{ document: ApplicationDocument; application: Application | null }>(
    `/api/applications/${applicationId}/documents/${docId}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ extractedFields }),
    },
  );
}

export async function verifyApplication(id: string) {
  return api<{ application: Application }>(`/api/applications/${id}/verify`, {
    method: 'PATCH',
    body: JSON.stringify({}),
  });
}

export async function approveApplication(id: string, remarks?: string) {
  return api<{ application: Application }>(`/api/applications/${id}/approve`, {
    method: 'PATCH',
    body: JSON.stringify({ remarks }),
  });
}

export async function rejectApplication(id: string, remarks: string) {
  return api<{ application: Application }>(`/api/applications/${id}/reject`, {
    method: 'PATCH',
    body: JSON.stringify({ remarks }),
  });
}

export async function deleteApplicationDocument(applicationId: string, docId: string) {
  return api<{ ok: boolean; application: Application | null }>(
    `/api/applications/${applicationId}/documents/${docId}`,
    { method: 'DELETE' },
  );
}

export async function fetchDocumentBlobUrl(
  applicationId: string,
  docId: string,
): Promise<{ url: string; invalidPdf?: boolean }> {
  const token = getToken();
  const url = `${API_URL}/api/applications/${applicationId}/documents/${docId}/file`;
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Failed to load document');
  const mimeType = res.headers.get('Content-Type') || 'application/octet-stream';
  const arrayBuffer = await res.arrayBuffer();
  if (mimeType === 'application/pdf' || mimeType.includes('pdf')) {
    const header = new TextDecoder().decode(arrayBuffer.slice(0, 5));
    if (!header.startsWith('%PDF-')) {
      const blob = new Blob([arrayBuffer], { type: mimeType });
      return { url: URL.createObjectURL(blob), invalidPdf: true };
    }
  }
  const blob = new Blob([arrayBuffer], { type: mimeType });
  return { url: URL.createObjectURL(blob) };
}

export async function validatePdfFile(file: File): Promise<boolean> {
  if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) return true;
  const header = await file.slice(0, 5).text();
  return header.startsWith('%PDF-');
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      resolve(result.includes(',') ? result.split(',')[1] : result);
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}
