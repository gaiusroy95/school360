import { useCallback, useEffect, useState } from 'react';
import {
  BadgeCheck, LifeBuoy, Wrench, RefreshCw, CheckCircle2, AlertTriangle, Play,
} from 'lucide-react';
import {
  activateLicenseKey,
  createSupportTicket,
  fetchLicenseSupportOverview,
  runSystemHealthCheck,
  scheduleMaintenanceWindow,
  updateSupportTicket,
  validateLicenseKey,
  type LicenseSupportOverview,
} from '../../../lib/settingsLicenseSupportServices';
import { CoreSystemsPage, cs, Field } from '../settings/CoreSystemsUi';

type Tab = 'license' | 'support' | 'maintenance';

export function LicenseSupportLiveView({ initialTab = 'license' }: { initialTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [data, setData] = useState<LicenseSupportOverview | null>(null);

  const [licenseForm, setLicenseForm] = useState({ licenseKey: '', licensedTo: '' });
  const [ticketForm, setTicketForm] = useState({ subject: '', description: '', category: 'GENERAL', priority: 'NORMAL' });
  const [healthChecks, setHealthChecks] = useState<Array<{ name: string; status: string; detail: string }>>([]);
  const [maintenanceForm, setMaintenanceForm] = useState({
    enabled: false,
    message: 'Scheduled maintenance in progress',
    allowAdmins: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const overview = await fetchLicenseSupportOverview();
      setData(overview);
      setMaintenanceForm({
        enabled: overview.maintenance.maintenanceEnabled,
        message: overview.maintenance.maintenanceMessage || 'Scheduled maintenance in progress',
        allowAdmins: overview.maintenance.maintenanceAllowAdmins,
      });
      setLicenseForm((f) => (f.licensedTo ? f : { ...f, licensedTo: overview.license.licensedTo }));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed to load');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => { setTab(initialTab); }, [initialTab]);

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'license', label: 'License Management', icon: <BadgeCheck size={14} /> },
    { key: 'support', label: 'Support Tickets', icon: <LifeBuoy size={14} /> },
    { key: 'maintenance', label: 'Maintenance', icon: <Wrench size={14} /> },
  ];

  const handleActivateLicense = async () => {
    setRunning(true);
    try {
      const res = await activateLicenseKey(licenseForm);
      setMessage(res.message);
      setMessageType('success');
      setLicenseForm((f) => ({ ...f, licenseKey: '' }));
      void load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Activation failed');
      setMessageType('error');
    } finally {
      setRunning(false);
    }
  };

  const handleValidateLicense = async () => {
    setRunning(true);
    try {
      const res = await validateLicenseKey();
      setMessage(`${res.message} (${res.daysRemaining} days remaining)`);
      setMessageType(res.status === 'ACTIVE' ? 'success' : 'info');
      void load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Validation failed');
      setMessageType('error');
    } finally {
      setRunning(false);
    }
  };

  const handleCreateTicket = async () => {
    setRunning(true);
    try {
      const res = await createSupportTicket(ticketForm);
      setMessage(res.message);
      setMessageType('success');
      setTicketForm({ subject: '', description: '', category: 'GENERAL', priority: 'NORMAL' });
      void load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed to create ticket');
      setMessageType('error');
    } finally {
      setRunning(false);
    }
  };

  const handleResolveTicket = async (id: string, ticketNumber: string) => {
    setRunning(true);
    try {
      const res = await updateSupportTicket(id, { status: 'RESOLVED', resolutionNotes: 'Resolved by administrator' });
      setMessage(res.message);
      setMessageType('success');
      void load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Update failed');
      setMessageType('error');
    } finally {
      setRunning(false);
    }
  };

  const handleHealthCheck = async () => {
    setRunning(true);
    try {
      const res = await runSystemHealthCheck();
      setHealthChecks(res.checks);
      setMessage(res.message);
      setMessageType(res.overall === 'HEALTHY' ? 'success' : 'info');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Health check failed');
      setMessageType('error');
    } finally {
      setRunning(false);
    }
  };

  const handleSaveMaintenance = async () => {
    setRunning(true);
    try {
      const res = await scheduleMaintenanceWindow(maintenanceForm);
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

  const license = data?.license;
  const statusColor = (status: string) => {
    if (status === 'ACTIVE' || status === 'PASS') return 'text-green-600';
    if (status === 'EXPIRING_SOON' || status === 'WARN' || status === 'WARNING') return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <CoreSystemsPage
      title="License & Support"
      objective="Manage ERP license entitlements, raise support tickets, run health checks, and schedule maintenance windows."
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

      {tab === 'license' && license && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className={cs.card}>
            <div className="text-sm font-bold text-slate-800 mb-3">Current License</div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><span className="text-slate-500 block">Edition</span><strong>{license.edition}</strong></div>
              <div><span className="text-slate-500 block">Status</span><strong className={statusColor(license.status)}>{license.status}</strong></div>
              <div><span className="text-slate-500 block">Licensed To</span><strong>{license.licensedTo}</strong></div>
              <div><span className="text-slate-500 block">Valid Until</span><strong>{new Date(license.validUntil).toLocaleDateString('en-IN')}</strong></div>
              <div><span className="text-slate-500 block">Days Remaining</span><strong>{license.daysRemaining}</strong></div>
              <div><span className="text-slate-500 block">License Key</span><code className="text-[10px]">{license.licenseKeyMasked}</code></div>
            </div>
            <div className="mt-4 space-y-2">
              <div>
                <div className="flex justify-between text-[10px] text-slate-600 mb-1">
                  <span>Users ({license.currentUsers}/{license.maxUsers})</span>
                  <span>{license.usage.usersPercent}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600" style={{ width: `${license.usage.usersPercent}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] text-slate-600 mb-1">
                  <span>Students ({license.currentStudents}/{license.maxStudents})</span>
                  <span>{license.usage.studentsPercent}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-teal-600" style={{ width: `${license.usage.studentsPercent}%` }} />
                </div>
              </div>
            </div>
            <button type="button" onClick={() => void handleValidateLicense()} disabled={running} className={`${cs.btnSecondary} mt-3 flex items-center gap-1`}>
              <CheckCircle2 size={12} /> Validate License
            </button>
          </div>

          <div className={cs.card}>
            <div className="text-sm font-bold text-slate-800 mb-3">Activate / Renew License</div>
            <div className="space-y-2">
              <Field label="License key" required>
                <input className={cs.input} value={licenseForm.licenseKey} onChange={(e) => setLicenseForm((f) => ({ ...f, licenseKey: e.target.value }))} placeholder="ERP-ENT-XXXX-XXXX" />
              </Field>
              <Field label="Licensed to">
                <input className={cs.input} value={licenseForm.licensedTo} onChange={(e) => setLicenseForm((f) => ({ ...f, licensedTo: e.target.value }))} />
              </Field>
              <p className="text-[10px] text-slate-500">Format: ERP-ENT-XXXX-XXXX (Enterprise), ERP-PRO-…, ERP-STD-…</p>
              <button type="button" onClick={() => void handleActivateLicense()} disabled={running} className={`${cs.btnPrimary} flex items-center gap-1 w-fit`}>
                <BadgeCheck size={12} /> Activate License
              </button>
            </div>
          </div>

          <div className={`${cs.card} xl:col-span-2 overflow-hidden`}>
            <div className="text-xs font-bold text-slate-700 mb-2">Module Entitlements</div>
            <table className={cs.table}>
              <thead>
                <tr>
                  <th className={cs.th}>Module</th>
                  <th className={cs.th}>Code</th>
                  <th className={cs.th}>Licensed</th>
                  <th className={cs.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {(data?.modules ?? []).map((m) => (
                  <tr key={m.id}>
                    <td className={cs.td}>{m.moduleLabel}</td>
                    <td className={cs.td}><code>{m.moduleCode}</code></td>
                    <td className={cs.td}>{m.hasLicenseKey ? 'Yes' : '—'}</td>
                    <td className={cs.td}>{m.isActive ? <span className="text-green-600">Active</span> : <span className="text-slate-400">Inactive</span>}</td>
                  </tr>
                ))}
                {(data?.modules ?? []).length === 0 && (
                  <tr><td colSpan={4} className={`${cs.td} text-center text-slate-400 py-4`}>No modules configured — sync from Institution Setup</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'support' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className={cs.card}>
              <div className="text-sm font-bold text-slate-800 mb-3">Raise Support Ticket</div>
              <div className="space-y-2">
                <Field label="Subject" required>
                  <input className={cs.input} value={ticketForm.subject} onChange={(e) => setTicketForm((f) => ({ ...f, subject: e.target.value }))} />
                </Field>
                <Field label="Description" required>
                  <textarea className={cs.input} rows={3} value={ticketForm.description} onChange={(e) => setTicketForm((f) => ({ ...f, description: e.target.value }))} />
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Category">
                    <select className={cs.input} value={ticketForm.category} onChange={(e) => setTicketForm((f) => ({ ...f, category: e.target.value }))}>
                      {(data?.ticketCategories ?? []).map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </Field>
                  <Field label="Priority">
                    <select className={cs.input} value={ticketForm.priority} onChange={(e) => setTicketForm((f) => ({ ...f, priority: e.target.value }))}>
                      {(data?.priorities ?? []).map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </Field>
                </div>
                <button type="button" onClick={() => void handleCreateTicket()} disabled={running} className={`${cs.btnPrimary} flex items-center gap-1 w-fit`}>
                  Submit Ticket
                </button>
              </div>
            </div>

            <div className={cs.card}>
              <div className="flex justify-between items-center mb-3">
                <div className="text-sm font-bold text-slate-800">System Health Check</div>
                <button type="button" onClick={() => void handleHealthCheck()} disabled={running} className={`${cs.btnSecondary} flex items-center gap-1`}>
                  <Play size={12} /> Run Check
                </button>
              </div>
              {healthChecks.length > 0 ? (
                <div className="space-y-2">
                  {healthChecks.map((c) => (
                    <div key={c.name} className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded border border-slate-100">
                      <span className="font-medium">{c.name}</span>
                      <span className={statusColor(c.status)}>{c.status}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">Run a health check to verify database, auth, sessions, and license status.</p>
              )}
              {(data?.alerts ?? []).length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <p className="text-[10px] font-bold text-slate-600 mb-2">Recent Alerts</p>
                  {data!.alerts.slice(0, 4).map((a) => (
                    <div key={a.id} className="flex items-start gap-2 text-[10px] py-1">
                      <AlertTriangle size={12} className={a.severity === 'WARNING' ? 'text-amber-500' : 'text-blue-500'} />
                      <span>{a.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className={`${cs.card} overflow-hidden`}>
            <div className="text-xs font-bold text-slate-700 mb-2">Support Tickets</div>
            <table className={cs.table}>
              <thead>
                <tr>
                  <th className={cs.th}>Ticket</th>
                  <th className={cs.th}>Subject</th>
                  <th className={cs.th}>Priority</th>
                  <th className={cs.th}>Status</th>
                  <th className={cs.th}>Created</th>
                  <th className={cs.th}></th>
                </tr>
              </thead>
              <tbody>
                {(data?.tickets ?? []).map((t) => (
                  <tr key={t.id}>
                    <td className={cs.td}><code>{t.ticketNumber}</code></td>
                    <td className={cs.td}>{t.subject}</td>
                    <td className={cs.td}>{t.priority}</td>
                    <td className={cs.td}>{t.status}</td>
                    <td className={cs.td}>{new Date(t.createdAt).toLocaleDateString('en-IN')}</td>
                    <td className={cs.td}>
                      {t.status !== 'RESOLVED' && t.status !== 'CLOSED' && (
                        <button type="button" onClick={() => void handleResolveTicket(t.id, t.ticketNumber)} className="text-green-600 text-[10px] font-bold">Resolve</button>
                      )}
                    </td>
                  </tr>
                ))}
                {(data?.tickets ?? []).length === 0 && (
                  <tr><td colSpan={6} className={`${cs.td} text-center text-slate-400 py-4`}>No support tickets yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'maintenance' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className={cs.card}>
            <div className="text-sm font-bold text-slate-800 mb-3">Maintenance Mode</div>
            <label className="flex items-center gap-2 text-xs text-slate-700 mb-3">
              <input type="checkbox" checked={maintenanceForm.enabled} onChange={(e) => setMaintenanceForm((f) => ({ ...f, enabled: e.target.checked }))} />
              Enable maintenance mode
            </label>
            <Field label="Message shown to users">
              <textarea className={cs.input} rows={2} value={maintenanceForm.message} onChange={(e) => setMaintenanceForm((f) => ({ ...f, message: e.target.value }))} />
            </Field>
            <label className="flex items-center gap-2 text-xs text-slate-700 mb-3">
              <input type="checkbox" checked={maintenanceForm.allowAdmins} onChange={(e) => setMaintenanceForm((f) => ({ ...f, allowAdmins: e.target.checked }))} />
              Allow admin access during maintenance
            </label>
            {data?.maintenance.runtimeActive && (
              <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 mb-2 flex items-center gap-1">
                <AlertTriangle size={12} /> Maintenance mode is currently active
              </p>
            )}
            <button type="button" onClick={() => void handleSaveMaintenance()} disabled={running} className={`${cs.btnPrimary} flex items-center gap-1 w-fit`}>
              <Wrench size={12} /> Save Maintenance Settings
            </button>
          </div>

          <div className={cs.card}>
            <div className="text-sm font-bold text-slate-800 mb-3">Maintenance Schedule</div>
            <div className="text-xs text-slate-600 space-y-2">
              <p>Scheduled start: <strong>{data?.maintenance.maintenanceScheduledAt ? new Date(data.maintenance.maintenanceScheduledAt).toLocaleString('en-IN') : 'Not scheduled'}</strong></p>
              <p>Scheduled end: <strong>{data?.maintenance.maintenanceEndsAt ? new Date(data.maintenance.maintenanceEndsAt).toLocaleString('en-IN') : 'Not scheduled'}</strong></p>
              <p className="text-slate-500 pt-2">Use maintenance mode during system updates, database restores, or planned downtime. Admins can still access the system when allowed.</p>
            </div>
          </div>
        </div>
      )}
    </CoreSystemsPage>
  );
}
