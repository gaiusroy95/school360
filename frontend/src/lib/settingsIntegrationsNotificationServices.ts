import { api } from './api';

export type IntegrationsOverview = {
  smsGateways: Array<Record<string, unknown>>;
  emailGateways: Array<Record<string, unknown>>;
  waGateways: Array<Record<string, unknown>>;
  connectors: Array<Record<string, unknown>>;
  webhooks: Array<Record<string, unknown>>;
  workspace: Array<Record<string, unknown>>;
  categories: Array<Record<string, unknown>>;
  dynamicFields: Array<Record<string, unknown>>;
  channelSettings: Record<string, unknown> | null;
  templates: { email: Array<Record<string, unknown>>; sms: Array<Record<string, unknown>>; whatsapp: Array<Record<string, unknown>> };
};

export async function fetchIntegrationsOverview() {
  return api<IntegrationsOverview>(`/api/settings/integrations-notifications/overview`);
}

export async function syncIntegrationsNotifications() {
  return api<{ message: string; synced?: boolean; templatesSynced?: number }>(
    `/api/settings/integrations-notifications/sync`,
    { method: 'POST' },
  );
}

export async function testSmsIntegration(mobile: string) {
  return api<{ success: boolean; simulated?: boolean; deliveryMode?: string; message: string }>(`/api/settings/integrations-notifications/test/sms`, {
    method: 'POST',
    body: JSON.stringify({ mobile }),
  });
}

export async function testEmailIntegration(email: string) {
  return api<{ success: boolean; simulated?: boolean; deliveryMode?: string; message: string }>(`/api/settings/integrations-notifications/test/email`, {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function testWebhookIntegration(webhookId: string) {
  return api<{ success: boolean; signature: string }>(`/api/settings/integrations-notifications/test/webhook/${webhookId}`, {
    method: 'POST',
  });
}
