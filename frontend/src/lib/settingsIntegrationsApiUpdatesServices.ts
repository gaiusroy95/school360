import { api } from './api';

export type IntegrationsApiUpdatesOverview = {
  emailGateways: Array<{
    id: string;
    gatewayName: string;
    provider: string;
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    fromEmail: string;
    useStartTls: boolean;
    status: string;
    hasPassword: boolean;
    lastHealthCheck: string | null;
    mailerReloadedAt: string | null;
  }>;
  smsGateways: Array<{
    id: string;
    gatewayName: string;
    provider: string;
    accountSid: string;
    senderId: string;
    status: string;
    hasAuthToken: boolean;
    lastHealthCheck: string | null;
  }>;
  apiKeys: Array<Record<string, unknown>>;
  webhooks: Array<Record<string, unknown>>;
  deliveries: Array<Record<string, unknown>>;
  updates: {
    currentVersion: string;
    latestCheck: {
      localVersion: string;
      remoteVersion: string;
      updateAvailable: boolean;
      changelogHtml: string;
      packageUrl: string;
      packageChecksum: string;
      checkedAt: string;
    } | null;
  };
  webhookEventTypes: string[];
  availableScopes: string[];
};

export async function fetchIntegrationsApiUpdatesOverview() {
  return api<IntegrationsApiUpdatesOverview>(`/api/settings/integrations-api-updates/overview`);
}

export async function testEmailGatewayConfig(payload: Record<string, unknown>) {
  return api<{ success: boolean; simulated?: boolean; message: string }>(`/api/settings/integrations-api-updates/gateways/email/test`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function saveEmailGatewayConfig(payload: Record<string, unknown>) {
  return api<{ message: string }>(`/api/settings/integrations-api-updates/gateways/email`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function testSmsGatewayConfig(payload: Record<string, unknown>) {
  return api<{ success: boolean; simulated?: boolean; message: string; messageSid?: string }>(
    `/api/settings/integrations-api-updates/gateways/sms/test`,
    { method: 'POST', body: JSON.stringify(payload) },
  );
}

export async function saveSmsGatewayConfig(payload: Record<string, unknown>) {
  return api<{ message: string }>(`/api/settings/integrations-api-updates/gateways/sms`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function fetchB2bApiKeys() {
  return api<{ keys: Array<Record<string, unknown>> }>(`/api/settings/integrations-api-updates/api-keys`);
}

export async function createB2bApiKey(payload: { keyName: string; scopes: string[]; expiresInDays?: number }) {
  return api<{ message: string; rawKey: string; apiKey: Record<string, unknown> }>(
    `/api/settings/integrations-api-updates/api-keys`,
    { method: 'POST', body: JSON.stringify(payload) },
  );
}

export async function revokeB2bApiKey(id: string) {
  return api<{ message: string; keys: Array<Record<string, unknown>> }>(
    `/api/settings/integrations-api-updates/api-keys/${id}`,
    { method: 'DELETE' },
  );
}

export async function createWebhookSubscription(payload: { targetUrl: string; events: string[] }) {
  return api<{ message: string; webhook: Record<string, unknown> }>(
    `/api/settings/integrations-api-updates/webhooks`,
    { method: 'POST', body: JSON.stringify(payload) },
  );
}

export async function testWebhookDelivery(id: string) {
  return api<{ success: boolean; signature: string; status?: string }>(
    `/api/settings/integrations-api-updates/webhooks/${id}/test`,
    { method: 'POST' },
  );
}

export async function checkSystemUpdates() {
  return api<{
    message: string;
    localVersion: string;
    remoteVersion: string;
    updateAvailable: boolean;
    changelogHtml: string;
    packageUrl: string;
    packageChecksum: string;
    packageSizeBytes?: number;
    checkedAt: string;
  }>(`/api/settings/integrations-api-updates/updates/check`);
}

export async function downloadUpdatePackage(version: string) {
  return api<{ message: string; packageChecksum: string; stagedAt: string }>(
    `/api/settings/integrations-api-updates/updates/download`,
    { method: 'POST', body: JSON.stringify({ version }) },
  );
}

export async function applyAutomatedPatch(payload: { versionTo: string; packageChecksum: string }) {
  return api<{ message: string; update: Record<string, unknown> }>(
    `/api/settings/integrations-api-updates/updates/apply`,
    { method: 'POST', body: JSON.stringify(payload) },
  );
}

export async function fetchDeploymentProgress() {
  return api<{ progress: { percent: number; phase: string; updateId: string } | null }>(
    `/api/settings/integrations-api-updates/updates/progress`,
  );
}
