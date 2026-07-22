import { api } from './api';

export type BulkImportBatch = {
  id: string;
  recordId: string;
  fileName: string;
  name: string;
  className: string;
  sectionName: string;
  classGroup: string;
  academicYear: string;
  status: string;
  statusLabel: string;
  totalRows: number;
  createdCount: number;
  updatedCount: number;
  errorCount: number;
  details: string;
  updateExisting: boolean;
  errors: { row: number; message: string }[];
  updatedAt: string;
  createdAt: string;
};

export type BulkImportRow = {
  id: string;
  rowNumber: number;
  studentName: string;
  className: string;
  sectionName: string;
  classGroup: string;
  admissionNumber: string;
  mobile: string;
  status: string;
  message: string;
  studentId: string | null;
  updatedAt: string;
};

export type BulkImportSummary = {
  total: number;
  activeOpen: number;
  pending: number;
  thisMonth: number;
};

export const BULK_IMPORT_STATUSES = ['DRAFT', 'PENDING', 'OPEN', 'ACTIVE', 'COMPLETED', 'APPROVED', 'PAID', 'DUE'];

export async function fetchBulkImportMeta() {
  return api<{ summary: BulkImportSummary }>('/api/student-bulk-imports/meta');
}

export async function fetchBulkImportBatches(params?: {
  q?: string;
  status?: string;
  className?: string;
  sectionName?: string;
  academicYear?: string;
}) {
  const q = new URLSearchParams();
  if (params?.q) q.set('q', params.q);
  if (params?.status) q.set('status', params.status);
  if (params?.className) q.set('className', params.className);
  if (params?.sectionName) q.set('sectionName', params.sectionName);
  if (params?.academicYear) q.set('academicYear', params.academicYear);
  const qs = q.toString();
  return api<{ batches: BulkImportBatch[] }>(`/api/student-bulk-imports${qs ? `?${qs}` : ''}`);
}

export async function fetchBulkImportBatch(id: string) {
  return api<{ batch: BulkImportBatch; rows: BulkImportRow[] }>(`/api/student-bulk-imports/${id}`);
}

export async function createBulkImportBatch(payload: {
  fileName?: string;
  className?: string;
  sectionName?: string;
  academicYear?: string;
  updateExisting?: boolean;
  rows: Record<string, unknown>[];
}) {
  return api<{
    batch: BulkImportBatch;
    created: number;
    updated: number;
    errors: { row: number; message: string }[];
  }>('/api/student-bulk-imports', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function exportBulkImportData(params?: {
  className?: string;
  sectionName?: string;
  academicYear?: string;
}) {
  const q = new URLSearchParams();
  if (params?.className) q.set('className', params.className);
  if (params?.sectionName) q.set('sectionName', params.sectionName);
  if (params?.academicYear) q.set('academicYear', params.academicYear);
  const qs = q.toString();
  return api<{ batches: BulkImportBatch[]; students: import('./studentServices').Student[] }>(
    `/api/student-bulk-imports/export${qs ? `?${qs}` : ''}`,
  );
}

export async function updateBulkImportStatus(id: string, status: string) {
  return api<{ batch: BulkImportBatch }>(`/api/student-bulk-imports/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}
