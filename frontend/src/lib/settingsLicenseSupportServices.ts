import { api } from './api';

export type LicenseSupportOverview = {
  license: {
    id: string;
    edition: string;
    licensedTo: string;
    licenseKeyMasked: string;
    validFrom: string;
    validUntil: string;
    daysRemaining: number;
    status: string;
    maxUsers: number;
    maxStudents: number;
    currentUsers: number;
    currentStudents: number;
    lastValidatedAt: string | null;
    usage: { usersPercent: number; studentsPercent: number };
  };
  modules: Array<{
    id: string;
    moduleCode: string;
    moduleLabel: string;
    isActive: boolean;
    hasLicenseKey: boolean;
  }>;
  tickets: Array<{
    id: string;
    ticketNumber: string;
    subject: string;
    category: string;
    priority: string;
    status: string;
    reportedBy: string;
    assignedTo: string;
    createdAt: string;
    resolvedAt: string | null;
  }>;
  maintenance: {
    maintenanceEnabled: boolean;
    maintenanceMessage: string;
    maintenanceAllowAdmins: boolean;
    maintenanceScheduledAt: string | null;
    maintenanceEndsAt: string | null;
    runtimeActive: boolean;
  };
  alerts: Array<{
    id: string;
    title: string;
    severity: string;
    status: string;
    category: string;
    createdAt: string;
  }>;
  ticketCategories: string[];
  priorities: string[];
};

export async function fetchLicenseSupportOverview() {
  return api<LicenseSupportOverview>(`/api/settings/license-support/overview`);
}

export async function activateLicenseKey(payload: { licenseKey: string; licensedTo?: string }) {
  return api<{ message: string; license: Record<string, unknown> }>(
    `/api/settings/license-support/license/activate`,
    { method: 'POST', body: JSON.stringify(payload) },
  );
}

export async function validateLicenseKey() {
  return api<{ message: string; status: string; validUntil: string; daysRemaining: number }>(
    `/api/settings/license-support/license/validate`,
    { method: 'POST' },
  );
}

export async function createSupportTicket(payload: {
  subject: string;
  description: string;
  category?: string;
  priority?: string;
}) {
  return api<{ message: string; ticket: Record<string, unknown> }>(
    `/api/settings/license-support/tickets`,
    { method: 'POST', body: JSON.stringify(payload) },
  );
}

export async function updateSupportTicket(id: string, payload: { status?: string; resolutionNotes?: string }) {
  return api<{ message: string; ticket: Record<string, unknown> }>(
    `/api/settings/license-support/tickets/${id}`,
    { method: 'PATCH', body: JSON.stringify(payload) },
  );
}

export async function runSystemHealthCheck() {
  return api<{
    message: string;
    overall: string;
    checks: Array<{ name: string; status: string; detail: string }>;
    checkedAt: string;
  }>(`/api/settings/license-support/health-check`, { method: 'POST' });
}

export async function scheduleMaintenanceWindow(payload: Record<string, unknown>) {
  return api<{ message: string }>(`/api/settings/license-support/maintenance`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}
