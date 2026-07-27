import { useCallback, useEffect, useState } from 'react';
import {
  Mail, MessageSquare, Key, Webhook, Download, RefreshCw, Play, Copy, CheckCircle2, X,
} from 'lucide-react';
import {
  applyAutomatedPatch,
  checkSystemUpdates,
  createB2bApiKey,
  createWebhookSubscription,
  downloadUpdatePackage,
  fetchIntegrationsApiUpdatesOverview,
  revokeB2bApiKey,
  saveEmailGatewayConfig,
  saveSmsGatewayConfig,
  testEmailGatewayConfig,
  testSmsGatewayConfig,
  testWebhookDelivery,
  type IntegrationsApiUpdatesOverview,
} from '../../../lib/settingsIntegrationsApiUpdatesServices';
import { CoreSystemsPage, cs, Field } from '../settings/CoreSystemsUi';

type Tab = 'gateways' | 'api' | 'updates';

function SimulatedBadge({ label = 'Simulated — no external delivery' }: { label?: string }) {
  return (
    <span className="inline-flex items-center rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-800">
      {label}
    </span>
  );
}

export function IntegrationsApiUpdatesLiveView({ initialTab = 'gateways' }: { initialTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [data, setData] = useState<IntegrationsApiUpdatesOverview | null>(null);

  const [emailForm, setEmailForm] = useState({
    host: '', port: 587, user: '', password: '', fromEmail: 'noreply@school.edu', provider: 'SMTP', useStartTls: true,
  });
  const [smsForm, setSmsForm] = useState({
    accountSid: '', authToken: '', senderId: 'SCHOOL', provider: 'Twilio', mobile: '',
  });
  const [apiKeyForm, setApiKeyForm] = useState({ keyName: '', scopes: [] as string[], expiresInDays: 365 });
  const [rawKeyModal, setRawKeyModal] = useState<string | null>(null);
  const [webhookForm, setWebhookForm] = useState({ targetUrl: '', events: [] as string[] });
  const [updateCheck, setUpdateCheck] = useState<{
    localVersion: string;
    remoteVersion: string;
    updateAvailable: boolean;
    changelogHtml: string;
    packageChecksum: string;
    packageUrl: string;
  } | null>(null);
  const [showChangelog, setShowChangelog] = useState(false);
  const [deployProgress, setDeployProgress] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const overview = await fetchIntegrationsApiUpdatesOverview();
      setData(overview);
      const email = overview.emailGateways[0];
      if (email) {
        setEmailForm((f) => ({
          ...f,
          host: email.smtpHost,
          port: email.smtpPort,
          user: email.smtpUser,
          fromEmail: email.fromEmail,
          provider: email.provider,
          useStartTls: email.useStartTls,
        }));
      }
      const sms = overview.smsGateways[0];
      if (sms) {
        setSmsForm((f) => ({
          ...f,
          accountSid: sms.accountSid,
          senderId: sms.senderId,
          provider: sms.provider,
        }));
      }
      if (overview.updates.latestCheck) {
        setUpdateCheck({
          localVersion: overview.updates.latestCheck.localVersion,
          remoteVersion: overview.updates.latestCheck.remoteVersion,
          updateAvailable: overview.updates.latestCheck.updateAvailable,
          changelogHtml: overview.updates.latestCheck.changelogHtml,
          packageChecksum: overview.updates.latestCheck.packageChecksum,
          packageUrl: overview.updates.latestCheck.packageUrl,
        });
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed to load');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'gateways', label: 'Email & SMS Gateway', icon: <Mail size={14} /> },
    { key: 'api', label: 'API Management', icon: <Key size={14} /> },
    { key: 'updates', label: 'System Updates', icon: <Download size={14} /> },
  ];

  const handleTestEmail = async () => {
    setRunning(true);
    try {
      const res = await testEmailGatewayConfig(emailForm);
      setMessage(res.simulated ? `${res.message}` : res.message);
      setMessageType('success');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Test failed');
      setMessageType('error');
    } finally {
      setRunning(false);
    }
  };

  const handleSaveEmail = async () => {
    setRunning(true);
    try {
      const res = await saveEmailGatewayConfig(emailForm);
      setMessage(res.message);
      setMessageType('success');
      void load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Save failed');
      setMessageType('error');
    } finally {
      setRunning(false);
    }
  };

  const handleTestSms = async () => {
    setRunning(true);
    try {
      const res = await testSmsGatewayConfig(smsForm);
      setMessage(res.simulated ? `${res.message}` : `${res.message} (SID: ${res.messageSid ?? '—'})`);
      setMessageType('success');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Test failed');
      setMessageType('error');
    } finally {
      setRunning(false);
    }
  };

  const handleSaveSms = async () => {
    setRunning(true);
    try {
      const res = await saveSmsGatewayConfig(smsForm);
      setMessage(res.message);
      setMessageType('success');
      void load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Save failed');
      setMessageType('error');
    } finally {
      setRunning(false);
    }
  };

  const handleCreateApiKey = async () => {
    setRunning(true);
    try {
      const res = await createB2bApiKey(apiKeyForm);
      setRawKeyModal(res.rawKey);
      setMessage(res.message);
      setMessageType('success');
      void load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Create failed');
      setMessageType('error');
    } finally {
      setRunning(false);
    }
  };

  const handleRevokeKey = async (id: string) => {
    if (!confirm('Revoke this API key? Third-party integrations using it will stop working.')) return;
    setRunning(true);
    try {
      const res = await revokeB2bApiKey(id);
      setMessage(res.message);
      setMessageType('success');
      void load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Revoke failed');
      setMessageType('error');
    } finally {
      setRunning(false);
    }
  };

  const handleCreateWebhook = async () => {
    setRunning(true);
    try {
      const res = await createWebhookSubscription(webhookForm);
      setMessage(res.message);
      setMessageType('success');
      setWebhookForm({ targetUrl: '', events: [] });
      void load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Save failed');
      setMessageType('error');
    } finally {
      setRunning(false);
    }
  };

  const handleCheckUpdates = async () => {
    setRunning(true);
    try {
      const res = await checkSystemUpdates();
      setUpdateCheck({
        localVersion: res.localVersion,
        remoteVersion: res.remoteVersion,
        updateAvailable: res.updateAvailable,
        changelogHtml: res.changelogHtml,
        packageChecksum: res.packageChecksum,
        packageUrl: res.packageUrl,
      });
      setMessage(res.message);
      setMessageType(res.updateAvailable ? 'info' : 'success');
      if (res.updateAvailable) setShowChangelog(true);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Check failed');
      setMessageType('error');
    } finally {
      setRunning(false);
    }
  };

  const handleDownloadPackage = async () => {
    if (!updateCheck?.remoteVersion) return;
    setRunning(true);
    try {
      const res = await downloadUpdatePackage(updateCheck.remoteVersion);
      setMessage(res.message);
      setMessageType('success');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Download failed');
      setMessageType('error');
    } finally {
      setRunning(false);
    }
  };

  const handleApplyUpdate = async () => {
    if (!updateCheck?.updateAvailable) return;
    if (!confirm(`Apply update to v${updateCheck.remoteVersion}? Maintenance mode will be enabled.`)) return;
    setRunning(true);
    setDeployProgress(0);
    const interval = setInterval(() => {
      setDeployProgress((p) => Math.min(p + 8, 95));
    }, 400);
    try {
      const res = await applyAutomatedPatch({
        versionTo: updateCheck.remoteVersion,
        packageChecksum: updateCheck.packageChecksum,
      });
      setDeployProgress(100);
      setMessage(res.message);
      setMessageType('success');
      void load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Apply failed');
      setMessageType('error');
    } finally {
      clearInterval(interval);
      setRunning(false);
    }
  };

  const toggleScope = (scope: string) => {
    setApiKeyForm((f) => ({
      ...f,
      scopes: f.scopes.includes(scope) ? f.scopes.filter((s) => s !== scope) : [...f.scopes, scope],
    }));
  };

  const toggleEvent = (event: string) => {
    setWebhookForm((f) => ({
      ...f,
      events: f.events.includes(event) ? f.events.filter((e) => e !== event) : [...f.events, event],
    }));
  };

  return (
    <CoreSystemsPage
      title="Integrations, API & Updates"
      objective="SMTP/SMS gateways, B2B API tokens, event webhooks, version checking, and automated patch deployment."
      loading={loading}
      message={message}
      messageType={messageType}
      actions={(
        <button type="button" onClick={() => void load()} className={`${cs.btnSecondary} flex items-center gap-1`}>
          <RefreshCw size={12} /> Refresh
        </button>
      )}
    >
      <div className="flex flex-wrap gap-1 mb-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1 px-3 py-1.5 text-[10px] font-medium rounded-lg border ${
              tab === t.key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {tab === 'gateways' && (
        <div className="space-y-3">
          <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <strong>Delivery mode:</strong> Test actions validate configuration and write audit logs only.
            {' '}<SimulatedBadge /> — configure credentials, then wire a real SMTP/SMS provider for production sends.
          </p>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className={cs.card}>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800 mb-3">
              <Mail size={16} className="text-blue-600" /> SMTP Mailer Configuration
            </div>
            <div className="grid grid-cols-1 gap-2">
              <Field label="SMTP Host" required>
                <input className={cs.input} value={emailForm.host} onChange={(e) => setEmailForm((f) => ({ ...f, host: e.target.value }))} placeholder="smtp.sendgrid.net" />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Port">
                  <input type="number" className={cs.input} value={emailForm.port} onChange={(e) => setEmailForm((f) => ({ ...f, port: Number(e.target.value) }))} />
                </Field>
                <Field label="From Email">
                  <input className={cs.input} value={emailForm.fromEmail} onChange={(e) => setEmailForm((f) => ({ ...f, fromEmail: e.target.value }))} />
                </Field>
              </div>
              <Field label="Username">
                <input className={cs.input} value={emailForm.user} onChange={(e) => setEmailForm((f) => ({ ...f, user: e.target.value }))} />
              </Field>
              <Field label="Password">
                <input type="password" className={cs.input} value={emailForm.password} onChange={(e) => setEmailForm((f) => ({ ...f, password: e.target.value }))} placeholder={data?.emailGateways[0]?.hasPassword ? '•••••••• (saved)' : ''} />
              </Field>
              <label className="flex items-center gap-2 text-xs text-slate-600">
                <input type="checkbox" checked={emailForm.useStartTls} onChange={(e) => setEmailForm((f) => ({ ...f, useStartTls: e.target.checked }))} />
                STARTTLS enabled
              </label>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => void handleTestEmail()} disabled={running} className={cs.btnSecondary}>Test Connection</button>
                <button type="button" onClick={() => void handleSaveEmail()} disabled={running} className={cs.btnPrimary}>Save</button>
              </div>
              {data?.emailGateways[0]?.mailerReloadedAt && (
                <p className="text-[10px] text-teal-700 flex items-center gap-1">
                  <CheckCircle2 size={12} /> Mailer singleton reloaded at {new Date(data.emailGateways[0].mailerReloadedAt).toLocaleString('en-IN')}
                </p>
              )}
            </div>
          </div>

          <div className={cs.card}>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800 mb-3">
              <MessageSquare size={16} className="text-green-600" /> SMS Broker Setup
            </div>
            <div className="grid grid-cols-1 gap-2">
              <Field label="Provider">
                <input className={cs.input} value={smsForm.provider} onChange={(e) => setSmsForm((f) => ({ ...f, provider: e.target.value }))} />
              </Field>
              <Field label="Account SID" required>
                <input className={cs.input} value={smsForm.accountSid} onChange={(e) => setSmsForm((f) => ({ ...f, accountSid: e.target.value }))} />
              </Field>
              <Field label="Auth Token">
                <input type="password" className={cs.input} value={smsForm.authToken} onChange={(e) => setSmsForm((f) => ({ ...f, authToken: e.target.value }))} placeholder={data?.smsGateways[0]?.hasAuthToken ? '•••••••• (saved)' : ''} />
              </Field>
              <Field label="Sender ID">
                <input className={cs.input} value={smsForm.senderId} onChange={(e) => setSmsForm((f) => ({ ...f, senderId: e.target.value }))} />
              </Field>
              <Field label="Test mobile">
                <input className={cs.input} value={smsForm.mobile} onChange={(e) => setSmsForm((f) => ({ ...f, mobile: e.target.value }))} placeholder="+91XXXXXXXXXX" />
              </Field>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => void handleTestSms()} disabled={running} className={cs.btnSecondary}>Test SMS</button>
                <button type="button" onClick={() => void handleSaveSms()} disabled={running} className={cs.btnPrimary}>Save</button>
              </div>
            </div>
          </div>
        </div>
        </div>
      )}

      {tab === 'api' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className={cs.card}>
              <div className="flex items-center gap-2 text-sm font-bold text-slate-800 mb-3">
                <Key size={16} className="text-amber-600" /> B2B API Token Generation
              </div>
              <Field label="Key name">
                <input className={cs.input} value={apiKeyForm.keyName} onChange={(e) => setApiKeyForm((f) => ({ ...f, keyName: e.target.value }))} placeholder="Partner CRM Integration" />
              </Field>
              <Field label="Scopes">
                <div className="flex flex-wrap gap-1 mt-1">
                  {(data?.availableScopes ?? []).map((scope) => (
                    <button
                      key={scope}
                      type="button"
                      onClick={() => toggleScope(scope)}
                      className={`px-2 py-0.5 text-[10px] rounded border ${
                        apiKeyForm.scopes.includes(scope) ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}
                    >
                      {scope}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Expiry (days)">
                <input type="number" className={cs.input} value={apiKeyForm.expiresInDays} onChange={(e) => setApiKeyForm((f) => ({ ...f, expiresInDays: Number(e.target.value) }))} />
              </Field>
              <button type="button" onClick={() => void handleCreateApiKey()} disabled={running} className={`${cs.btnPrimary} flex items-center gap-1 w-fit`}>
                <Key size={12} /> Generate Key
              </button>
            </div>

            <div className={cs.card}>
              <div className="flex items-center gap-2 text-sm font-bold text-slate-800 mb-3">
                <Webhook size={16} className="text-purple-600" /> Event Webhooks Subscription
              </div>
              <Field label="Target URL" required>
                <input className={cs.input} value={webhookForm.targetUrl} onChange={(e) => setWebhookForm((f) => ({ ...f, targetUrl: e.target.value }))} placeholder="https://partner.example.com/webhooks" />
              </Field>
              <Field label="Trigger events">
                <div className="flex flex-wrap gap-1 mt-1">
                  {(data?.webhookEventTypes ?? []).map((event) => (
                    <button
                      key={event}
                      type="button"
                      onClick={() => toggleEvent(event)}
                      className={`px-2 py-0.5 text-[10px] rounded border ${
                        webhookForm.events.includes(event) ? 'bg-purple-600 text-white border-purple-600' : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}
                    >
                      {event}
                    </button>
                  ))}
                </div>
              </Field>
              <button type="button" onClick={() => void handleCreateWebhook()} disabled={running} className={`${cs.btnPrimary} flex items-center gap-1 w-fit`}>
                Add Webhook
              </button>
            </div>
          </div>

          <div className={`${cs.card} overflow-hidden`}>
            <div className="text-xs font-bold text-slate-700 mb-2">Active API Keys</div>
            <table className={cs.table}>
              <thead>
                <tr>
                  <th className={cs.th}>Name</th>
                  <th className={cs.th}>Prefix</th>
                  <th className={cs.th}>Scopes</th>
                  <th className={cs.th}>Status</th>
                  <th className={cs.th}></th>
                </tr>
              </thead>
              <tbody>
                {(data?.apiKeys ?? []).map((k) => (
                  <tr key={String(k.id)}>
                    <td className={cs.td}>{String(k.keyName)}</td>
                    <td className={cs.td}><code>{String(k.keyPrefix)}…</code></td>
                    <td className={cs.td}>{Array.isArray(k.scopes) ? (k.scopes as string[]).join(', ') : '—'}</td>
                    <td className={cs.td}>{k.isActive ? 'Active' : 'Revoked'}</td>
                    <td className={cs.td}>
                      {k.isActive && (
                        <button type="button" onClick={() => void handleRevokeKey(String(k.id))} className="text-red-600 text-[10px] font-bold">Revoke</button>
                      )}
                    </td>
                  </tr>
                ))}
                {(data?.apiKeys ?? []).length === 0 && (
                  <tr><td colSpan={5} className={`${cs.td} text-center text-slate-400 py-4`}>No API keys yet</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className={`${cs.card} overflow-hidden`}>
            <div className="text-xs font-bold text-slate-700 mb-2">Webhooks & Delivery Log</div>
            <table className={cs.table}>
              <thead>
                <tr>
                  <th className={cs.th}>URL</th>
                  <th className={cs.th}>Events</th>
                  <th className={cs.th}>Last test</th>
                  <th className={cs.th}></th>
                </tr>
              </thead>
              <tbody>
                {(data?.webhooks ?? []).map((w) => (
                  <tr key={String(w.id)}>
                    <td className={cs.td}>{String(w.targetUrl)}</td>
                    <td className={cs.td}>{Array.isArray(w.eventSubscriptions) ? (w.eventSubscriptions as string[]).join(', ') : '—'}</td>
                    <td className={cs.td}>{w.lastTestStatus ? String(w.lastTestStatus) : '—'}</td>
                    <td className={cs.td}>
                      <button type="button" onClick={() => void testWebhookDelivery(String(w.id)).then((r) => { setMessage(r.success ? 'Webhook delivered' : 'Delivery failed'); setMessageType(r.success ? 'success' : 'error'); void load(); })} className="text-blue-600 text-[10px] font-bold">Test</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(data?.deliveries ?? []).length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <p className="text-[10px] font-bold text-slate-600 mb-2">Recent deliveries (HMAC-SHA256)</p>
                {(data?.deliveries ?? []).slice(0, 5).map((d) => (
                  <div key={String(d.id)} className="text-[10px] text-slate-600 flex justify-between py-1">
                    <span>{String(d.eventType)} → {String(d.targetUrl)}</span>
                    <span className={d.status === 'SUCCESS' ? 'text-green-600' : 'text-amber-600'}>{String(d.status)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'updates' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className={cs.card}>
            <div className="text-sm font-bold text-slate-800 mb-3">Version Checking Engine</div>
            <p className="text-xs text-slate-600 mb-3">
              Current version: <strong>v{data?.updates.currentVersion ?? '1.0.0'}</strong>
              {updateCheck && (
                <> · Remote: <strong>v{updateCheck.remoteVersion}</strong>
                  {updateCheck.updateAvailable ? <span className="text-amber-600 font-bold"> — Update available</span> : <span className="text-green-600"> — Up to date</span>}
                </>
              )}
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void handleCheckUpdates()} disabled={running} className={`${cs.btnSecondary} flex items-center gap-1`}>
                <RefreshCw size={12} /> Check for Updates
              </button>
              {updateCheck?.updateAvailable && (
                <>
                  <button type="button" onClick={() => setShowChangelog(true)} className={cs.btnSecondary}>View Changelog</button>
                  <button type="button" onClick={() => void handleDownloadPackage()} disabled={running} className={`${cs.btnSecondary} flex items-center gap-1`}>
                    <Download size={12} /> Download Package
                  </button>
                </>
              )}
            </div>
          </div>

          <div className={cs.card}>
            <div className="text-sm font-bold text-slate-800 mb-3">Automated Patch Deployment</div>
            {updateCheck?.updateAvailable ? (
              <>
                <p className="text-xs text-slate-600 mb-3">
                  Package: <code>erp-core-{updateCheck.remoteVersion}.tar.gz</code><br />
                  SHA-256: <code className="text-[10px]">{updateCheck.packageChecksum.slice(0, 24)}…</code>
                </p>
                {deployProgress > 0 && deployProgress < 100 && (
                  <div className="mb-3">
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 transition-all" style={{ width: `${deployProgress}%` }} />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">Deploying… {deployProgress}%</p>
                  </div>
                )}
                <button type="button" onClick={() => void handleApplyUpdate()} disabled={running} className={`${cs.btnPrimary} flex items-center gap-1`}>
                  <Play size={12} /> Apply Update & Restart
                </button>
              </>
            ) : (
              <p className="text-xs text-slate-500">Check for updates to see available patches.</p>
            )}
          </div>
        </div>
      )}

      {rawKeyModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-5 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-800">Copy your API key</h3>
              <button type="button" onClick={() => setRawKeyModal(null)}><X size={18} /></button>
            </div>
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
              This key is shown only once. Store it securely — we store only the SHA-256 hash.
            </p>
            <code className="block text-xs bg-slate-100 p-3 rounded break-all">{rawKeyModal}</code>
            <button
              type="button"
              onClick={() => { void navigator.clipboard.writeText(rawKeyModal); setMessage('Copied to clipboard'); setMessageType('success'); }}
              className={`${cs.btnPrimary} flex items-center gap-1 w-fit`}
            >
              <Copy size={12} /> Copy Key
            </button>
          </div>
        </div>
      )}

      {showChangelog && updateCheck && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-5 space-y-3 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-800">Changelog — v{updateCheck.remoteVersion}</h3>
              <button type="button" onClick={() => setShowChangelog(false)}><X size={18} /></button>
            </div>
            <div className="text-sm text-slate-700 prose prose-sm" dangerouslySetInnerHTML={{ __html: updateCheck.changelogHtml }} />
          </div>
        </div>
      )}
    </CoreSystemsPage>
  );
}
