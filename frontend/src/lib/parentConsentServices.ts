import { api } from './api';

export type ConsentTemplate = {
  id: string;
  recordId: string;
  title: string;
  description: string;
  category: string;
  formFields: unknown[];
  academicYear: string;
  validUntil: string | null;
  status: string;
  statusLabel: string;
  responseCount: number;
};

export type ConsentResponse = {
  id: string;
  templateId: string;
  studentId: string;
  parentRelationship: string;
  status: string;
  statusLabel: string;
  sharedAt: string;
  remarks: string;
};

export async function fetchConsentTemplates() {
  return api<{ templates: ConsentTemplate[] }>('/api/parent-consents');
}

export async function createConsentTemplate(payload: {
  title: string;
  description?: string;
  category?: string;
  formFields?: unknown[];
  academicYear?: string;
  validUntil?: string;
  status?: string;
}) {
  return api<{ template: ConsentTemplate }>('/api/parent-consents', { method: 'POST', body: JSON.stringify(payload) });
}

export async function shareConsent(templateId: string, studentIds: string[], parentRelationship?: string) {
  return api<{ created: number; message: string }>(`/api/parent-consents/${templateId}/share`, {
    method: 'POST',
    body: JSON.stringify({ studentIds, parentRelationship }),
  });
}

export async function fetchConsentResponses(templateId: string) {
  return api<{ responses: ConsentResponse[] }>(`/api/parent-consents/${templateId}/responses`);
}
