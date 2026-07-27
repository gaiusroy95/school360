import { useCallback, useEffect, useState } from 'react';
import {
  RefreshCw, MessageSquare, Mail, Link, GitPullRequest, Globe, Layout,
  MessageCircle, FileText, Folder, Braces, Settings, CheckCircle2, Send,
} from 'lucide-react';
import {
  fetchIntegrationsOverview,
  syncIntegrationsNotifications,
  testEmailIntegration,
  testSmsIntegration,
  testWebhookIntegration,
  type IntegrationsOverview,
} from '../../../lib/settingsIntegrationsNotificationServices';
import { AcademicLoading, AcademicPageHeader, AcademicPageShell, am } from '../AcademicManagement/AcademicManagementUi';

type TabKey =
  | 'sms' | 'email' | 'third-party' | 'webhooks' | 'google' | 'microsoft' | 'whatsapp'
  | 'email-templates' | 'sms-templates' | 'wa-templates' | 'categories' | 'dynamic-fields' | 'settings';

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'sms', label: 'SMS Gateway', icon: <MessageSquare size={14} /> },
  { key: 'email', label: 'Email Gateway', icon: <Mail size={14} /> },
  { key: 'third-party', label: 'Third Party', icon: <Link size={14} /> },
  { key: 'webhooks', label: 'Webhooks', icon: <GitPullRequest size={14} /> },
  { key: 'google', label: 'Google Workspace', icon: <Globe size={14} /> },
  { key: 'microsoft', label: 'Microsoft 365', icon: <Layout size={14} /> },
  { key: 'whatsapp', label: 'WhatsApp', icon: <MessageCircle size={14} /> },
  { key: 'email-templates', label: 'Email Templates', icon: <Mail size={14} /> },
  { key: 'sms-templates', label: 'SMS Templates', icon: <FileText size={14} /> },
  { key: 'wa-templates', label: 'WhatsApp Templates', icon: <MessageCircle size={14} /> },
  { key: 'categories', label: 'Categories', icon: <Folder size={14} /> },
  { key: 'dynamic-fields', label: 'Dynamic Fields', icon: <Braces size={14} /> },
  { key: 'settings', label: 'Template Settings', icon: <Settings size={14} /> },
];

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={`${am.card} p-4 space-y-2`}>
      <h3 className="text-sm font-bold text-slate-800">{title}</h3>
      <div className="text-xs text-slate-600 space-y-1">{children}</div>
    </div>
  );
}

export function IntegrationsNotificationsView() {
  const [data, setData] = useState<IntegrationsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [tab, setTab] = useState<TabKey>('sms');
  const [testMobile, setTestMobile] = useState('');
  const [testEmail, setTestEmail] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchIntegrationsOverview());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleSync = async () => {
    const res = await syncIntegrationsNotifications();
    setMessage(res.message + (res.templatesSynced != null ? ` (${res.templatesSynced} templates)` : ''));
    void load();
  };

  if (loading && !data) return <AcademicLoading label="Loading integrations & notifications…" />;

  const google = data?.workspace.find((w) => w.provider === 'GOOGLE_WORKSPACE');
  const microsoft = data?.workspace.find((w) => w.provider === 'MICROSOFT_365');
  const cs = data?.channelSettings;

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="Settings Management › Integrations, APIs & Notifications"
        title="Integrations, APIs & Notification"
        subtitle="SMS/Email gateways, third-party integrations, webhooks, workspace SSO, WhatsApp, templates, and delivery settings"
        actions={(
          <button type="button" onClick={() => void handleSync()} className={am.btnSecondary}>
            <RefreshCw size={14} /> Sync from Setup
          </button>
        )}
      />

      <div className={am.content}>
        {message && (
          <div className="mb-4 px-4 py-2 bg-teal-50 text-teal-800 text-sm rounded-lg border border-teal-200 flex items-center gap-2">
            <CheckCircle2 size={16} />{message}
          </div>
        )}

        <p className="text-xs text-slate-500 mb-4">
          Configure in <strong>Institution Setup → Integration Setup</strong> and <strong>Notification Setup</strong>, then save or sync.
        </p>

        <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
          <strong>Email/SMS tests are queue-only:</strong> messages are recorded in the outbound queue and audit log — no carrier or SMTP send is performed until a real provider transport is connected.
        </p>

        <div className="flex flex-wrap gap-1 mb-4">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1 px-2 py-1.5 text-[10px] font-medium rounded-lg border ${
                tab === t.key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {tab === 'sms' && (
          <div className="space-y-4">
            {data?.smsGateways.map((g) => (
              <Card key={String(g.id)} title={String(g.gatewayName)}>
                <p>Provider: <strong>{String(g.provider)}</strong></p>
                <p>Sender: <strong>{String(g.senderId)}</strong> · Status: <strong>{String(g.status)}</strong></p>
                <p>API Key: <strong>{String(g.apiKeyMasked || '—')}</strong></p>
              </Card>
            ))}
            <div className="flex gap-2 items-end">
              <input className={am.input} placeholder="Test mobile" value={testMobile} onChange={(e) => setTestMobile(e.target.value)} />
              <button type="button" className={am.btnPrimary} onClick={() => void testSmsIntegration(testMobile).then((r) => setMessage(r.message))}>
                <Send size={12} /> Test SMS
              </button>
            </div>
          </div>
        )}

        {tab === 'email' && (
          <div className="space-y-4">
            {data?.emailGateways.map((g) => (
              <Card key={String(g.id)} title={String(g.gatewayName)}>
                <p>Provider: <strong>{String(g.provider)}</strong></p>
                <p>SMTP: <strong>{String(g.smtpHost)}:{String(g.smtpPort)}</strong></p>
                <p>From: <strong>{String(g.fromEmail)}</strong> · Status: <strong>{String(g.status)}</strong></p>
              </Card>
            ))}
            <div className="flex gap-2 items-end">
              <input className={am.input} placeholder="Test email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} />
              <button type="button" className={am.btnPrimary} onClick={() => void testEmailIntegration(testEmail).then((r) => setMessage(r.message))}>
                <Send size={12} /> Test Email
              </button>
            </div>
          </div>
        )}

        {tab === 'third-party' && data?.connectors.map((c) => (
          <Card key={String(c.id)} title={String(c.connectorName)}>
            <p>Type: <strong>{String(c.connectorType)}</strong></p>
            <p>Endpoint: <strong>{String(c.apiEndpoint) || '—'}</strong></p>
            <p>Sync: <strong>{String(c.syncSchedule)}</strong> · Validated: <strong>{c.webhookValidated ? 'Yes' : 'No'}</strong></p>
          </Card>
        ))}

        {tab === 'webhooks' && (
          <div className="space-y-3">
            {data?.webhooks.map((w) => (
              <Card key={String(w.id)} title={String(w.webhookCode)}>
                <p>URL: <strong>{String(w.targetUrl)}</strong></p>
                <p>Events: <strong>{JSON.stringify(w.eventSubscriptions)}</strong></p>
                <p>Signing key: <code className="text-[10px]">{String(w.signingKey).slice(0, 12)}…</code></p>
                <button type="button" className={am.btnSecondary} onClick={() => void testWebhookIntegration(String(w.id)).then((r) => setMessage(`Webhook test OK — signature ${r.signature}`))}>
                  Test Payload
                </button>
              </Card>
            ))}
          </div>
        )}

        {tab === 'google' && google && (
          <Card title="Google Workspace">
            <p>Client ID: <strong>{String(google.clientId) || '—'}</strong></p>
            <p>Directory sync: <strong>{google.directorySync ? 'Enabled' : 'Disabled'}</strong></p>
            <p>Status: <strong>{String(google.connectionStatus)}</strong></p>
          </Card>
        )}

        {tab === 'microsoft' && microsoft && (
          <Card title="Microsoft 365 / Entra ID">
            <p>Tenant: <strong>{String(microsoft.tenantId) || '—'}</strong></p>
            <p>Client ID: <strong>{String(microsoft.clientId) || '—'}</strong></p>
            <p>Status: <strong>{String(microsoft.connectionStatus)}</strong></p>
          </Card>
        )}

        {tab === 'whatsapp' && data?.waGateways.map((g) => (
          <Card key={String(g.id)} title={String(g.gatewayName)}>
            <p>Provider: <strong>{String(g.provider)}</strong></p>
            <p>Phone ID: <strong>{String(g.phoneNumberId)}</strong></p>
            <p>Status: <strong>{String(g.status)}</strong></p>
          </Card>
        ))}

        {tab === 'email-templates' && (
          <ul className="text-xs space-y-1">
            {data?.templates.email.map((t) => <li key={String(t.id)} className={`${am.card} p-2`}><strong>{String(t.templateName)}</strong> — {String(t.gatewayStatus)}</li>)}
          </ul>
        )}

        {tab === 'sms-templates' && (
          <ul className="text-xs space-y-1">
            {data?.templates.sms.map((t) => <li key={String(t.id)} className={`${am.card} p-2`}><strong>{String(t.templateName)}</strong> — DLT: {String(t.gatewayTemplateId || 'pending')}</li>)}
          </ul>
        )}

        {tab === 'wa-templates' && (
          <ul className="text-xs space-y-1">
            {data?.templates.whatsapp.map((t) => <li key={String(t.id)} className={`${am.card} p-2`}><strong>{String(t.templateName)}</strong> — Meta: {String(t.gatewayTemplateId || 'pending')}</li>)}
          </ul>
        )}

        {tab === 'categories' && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {data?.categories.map((c) => (
              <div key={String(c.id)} className={`${am.card} p-3`}>
                <p className="font-bold text-sm">{String(c.categoryLabel)}</p>
                <p className="text-[10px] text-slate-500">{String(c.moduleTag)}</p>
              </div>
            ))}
          </div>
        )}

        {tab === 'dynamic-fields' && (
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-xs">
              <thead><tr className="bg-slate-50">{['Key', 'Label', 'Schema', 'Placeholder'].map((h) => <th key={h} className="text-left px-3 py-2 font-bold">{h}</th>)}</tr></thead>
              <tbody>
                {data?.dynamicFields.map((f) => (
                  <tr key={String(f.id)} className="border-t border-slate-100">
                    <td className="px-3 py-2">{String(f.fieldKey)}</td>
                    <td className="px-3 py-2">{String(f.fieldLabel)}</td>
                    <td className="px-3 py-2">{String(f.schemaTable)}.{String(f.schemaColumn)}</td>
                    <td className="px-3 py-2"><code>{String(f.placeholder)}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'settings' && cs && (
          <Card title="Template & Delivery Settings">
            <p>Default channel: <strong>{String(cs.defaultChannel)}</strong> · Fallback: <strong>{String(cs.fallbackChannel)}</strong></p>
            <p>Retry: <strong>{String(cs.retryMaxAttempts)}</strong> attempts, backoff <strong>{String(cs.retryBackoffSeconds)}s</strong></p>
            <p>Throttle: <strong>{String(cs.throttlePerMinute)}</strong>/min</p>
            <p>Channels: Email {cs.emailEnabled ? '✓' : '✗'} · SMS {cs.smsEnabled ? '✓' : '✗'} · WhatsApp {cs.whatsappEnabled ? '✓' : '✗'} · Push {cs.pushEnabled ? '✓' : '✗'}</p>
          </Card>
        )}
      </div>
    </AcademicPageShell>
  );
}
