import { api } from './api';

export type DocumentIdentityOverview = {
  stats: {
    categories: number;
    documentTypes: number;
    templates: number;
    applicationDocs: number;
    requiredDocs: number;
    customFields: number;
    fieldTypes: number;
  };
  categories: Array<Record<string, unknown>>;
  documentTypes: Array<Record<string, unknown>>;
  templates: Array<Record<string, unknown>>;
  applicationDocs: Array<Record<string, unknown>>;
  requiredDocs: Array<Record<string, unknown>>;
  numbering: Record<string, unknown> | null;
  idCards: Array<Record<string, unknown>>;
  rollRule: Record<string, unknown> | null;
  admissionSeq: Record<string, unknown> | null;
  employeeRule: Record<string, unknown> | null;
  customFields: Array<Record<string, unknown>>;
  fieldTypes: Array<Record<string, unknown>>;
};

export async function fetchDocumentIdentityOverview() {
  return api<DocumentIdentityOverview>(`/api/settings/document-identity/overview`);
}

export async function syncDocumentIdentity() {
  return api<{ message: string; synced?: boolean }>(`/api/settings/document-identity/sync`, { method: 'POST' });
}

export async function testDocumentNumber() {
  return api<{ documentNumber: string }>(`/api/settings/document-identity/allocate-document-number`, { method: 'POST' });
}
