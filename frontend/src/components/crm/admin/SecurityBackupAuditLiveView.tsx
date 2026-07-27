import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  Shield, Cloud, FileText, RefreshCw, Download, Lock, Play, RotateCcw,
} from 'lucide-react';
import {
  createFirewallRule,
  deployFirewallRule,
  executeSecurityBackup,
  exportForensicLogs,
  fetchBackupHistory,
  fetchBackupSchedule,
  fetchFirewallRules,
  fetchMfaPolicy,
  restoreBackupSnapshot,
  searchForensicLogs,
  updateBackupSchedule,
  updateMfaPolicy,
  type ForensicLog,
} from '../../../lib/settingsSecurityAuditServices';
import { CoreSystemsPage, cs, Field } from '../settings/CoreSystemsUi';

type Tab = 'firewall' | 'mfa' | 'backup' | 'restore' | 'forensics';

export function SecurityBackupAuditLiveView({ initialTab = 'firewall' }: { initialTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');

  const [firewallRules, setFirewallRules] = useState<Array<Record<string, unknown>>>([]);
  const [newCidr, setNewCidr] = useState('192.168.1.0/24');
  const [mfaPolicy, setMfaPolicy] = useState({ requireMfaForAdmins: false, requireMfaForAll: false });
  const [schedule, setSchedule] = useState({
    autoBackupEnabled: false,
    backupFrequency: 'Daily',
    backupTime: '02:00 AM',
    retainBackupDays: 30,
    s3BucketUri: '',
  });
  const [backups, setBackups] = useState<Awaited<ReturnType<typeof fetchBackupHistory>>['backups']>([]);
  const [restorePassword, setRestorePassword] = useState('');
  const [selectedBackupId, setSelectedBackupId] = useState('');

  const [forensicFilters, setForensicFilters] = useState({ userEmail: '', action: '', from: '', to: '' });
  const [forensicLogs, setForensicLogs] = useState<ForensicLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<ForensicLog | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [fw, mfa, sched, hist, forensics] = await Promise.all([
        fetchFirewallRules(),
        fetchMfaPolicy(),
        fetchBackupSchedule(),
        fetchBackupHistory(),
        searchForensicLogs(),
      ]);
      setFirewallRules(fw.rules);
      setMfaPolicy({ requireMfaForAdmins: mfa.requireMfaForAdmins, requireMfaForAll: mfa.requireMfaForAll });
      setSchedule({
        autoBackupEnabled: sched.autoBackupEnabled,
        backupFrequency: sched.backupFrequency,
        backupTime: sched.backupTime,
        retainBackupDays: sched.retainBackupDays,
        s3BucketUri: sched.s3BucketUri,
      });
      setBackups(hist.backups);
      setForensicLogs(forensics.logs);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed to load');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleCreateFirewall = async () => {
    setRunning(true);
    try {
      const res = await createFirewallRule({ cidr: newCidr, action: 'BLOCK' });
      setMessage(res.message);
      setMessageType('success');
      void load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed');
      setMessageType('error');
    } finally {
      setRunning(false);
    }
  };

  const handleDeployFirewall = async (id: string) => {
    setRunning(true);
    try {
      const res = await deployFirewallRule(id);
      setMessage(res.message);
      setMessageType('success');
      setFirewallRules(res.rules);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Deploy failed');
      setMessageType('error');
    } finally {
      setRunning(false);
    }
  };

  const handleSaveMfa = async () => {
    setRunning(true);
    try {
      const res = await updateMfaPolicy(mfaPolicy);
      setMessage(res.message);
      setMessageType('success');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Save failed');
      setMessageType('error');
    } finally {
      setRunning(false);
    }
  };

  const handleSaveSchedule = async () => {
    setRunning(true);
    try {
      const res = await updateBackupSchedule(schedule);
      setMessage(res.message);
      setMessageType('success');
      setSchedule({
        autoBackupEnabled: res.schedule.autoBackupEnabled,
        backupFrequency: res.schedule.backupFrequency,
        backupTime: res.schedule.backupTime,
        retainBackupDays: res.schedule.retainBackupDays,
        s3BucketUri: res.schedule.s3BucketUri,
      });
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Save failed');
      setMessageType('error');
    } finally {
      setRunning(false);
    }
  };

  const handleRunBackup = async () => {
    setRunning(true);
    try {
      const res = await executeSecurityBackup();
      setMessage(res.message);
      setMessageType('success');
      void load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Backup failed');
      setMessageType('error');
    } finally {
      setRunning(false);
    }
  };

  const handleRestore = async () => {
    if (!selectedBackupId || !restorePassword) return;
    if (!confirm('Restore will enable maintenance mode and overwrite database state. Continue?')) return;
    setRunning(true);
    try {
      const res = await restoreBackupSnapshot(selectedBackupId, restorePassword);
      setMessage(res.message);
      setMessageType('success');
      setRestorePassword('');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Restore failed');
      setMessageType('error');
    } finally {
      setRunning(false);
    }
  };

  const handleSearchForensics = async () => {
    setRunning(true);
    try {
      const res = await searchForensicLogs(forensicFilters);
      setForensicLogs(res.logs);
      setMessage(`Found ${res.total} forensic events`);
      setMessageType('info');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Search failed');
      setMessageType('error');
    } finally {
      setRunning(false);
    }
  };

  const handleExportForensics = async () => {
    setRunning(true);
    try {
      const res = await exportForensicLogs(forensicFilters);
      if (res.mode === 'inline' && res.csv) {
        const blob = new Blob([res.csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'forensic-audit-logs.csv';
        a.click();
        URL.revokeObjectURL(url);
      }
      setMessage(res.message);
      setMessageType('success');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Export failed');
      setMessageType('error');
    } finally {
      setRunning(false);
    }
  };

  const tabs: Array<{ id: Tab; label: string; icon: ReactNode }> = [
    { id: 'firewall', label: 'WAF / Firewall', icon: <Shield size={14} /> },
    { id: 'mfa', label: 'MFA Policy', icon: <Lock size={14} /> },
    { id: 'backup', label: 'Backup Schedule', icon: <Cloud size={14} /> },
    { id: 'restore', label: 'Restore', icon: <RotateCcw size={14} /> },
    { id: 'forensics', label: 'Audit Forensics', icon: <FileText size={14} /> },
  ];

  return (
    <CoreSystemsPage
      title="Security, Backup & Audit"
      objective="Network WAF rules, MFA enforcement, automated backups, point-in-time restore, and immutable forensic audit logs (E2E Image 3)"
      loading={loading}
      message={message}
      messageType={messageType}
      actions={(
        <button type="button" onClick={() => void load()} className={`${cs.btnSecondary} flex items-center gap-1`}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      )}
    >
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg border ${
              tab === t.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'firewall' && (
        <div className={`${cs.card} space-y-3`}>
          <div className="flex flex-wrap gap-2 items-end">
            <Field label="IP CIDR">
              <input className={cs.input} value={newCidr} onChange={(e) => setNewCidr(e.target.value)} placeholder="192.168.1.0/24" />
            </Field>
            <button type="button" onClick={() => void handleCreateFirewall()} disabled={running} className={cs.btnPrimary}>
              Add BLOCK Rule
            </button>
          </div>
          <table className={cs.table}>
            <thead>
              <tr>
                <th className={cs.th}>CIDR</th>
                <th className={cs.th}>Action</th>
                <th className={cs.th}>Deployed</th>
                <th className={cs.th}></th>
              </tr>
            </thead>
            <tbody>
              {firewallRules.map((r) => (
                <tr key={String(r.id)}>
                  <td className={cs.td}>{String(r.cidr)}</td>
                  <td className={cs.td}>{String(r.action)}</td>
                  <td className={cs.td}>{r.isDeployed ? 'Yes' : 'No'}</td>
                  <td className={cs.td}>
                    {!r.isDeployed && (
                      <button type="button" onClick={() => void handleDeployFirewall(String(r.id))} className="text-blue-600 text-xs font-bold">
                        Deploy Rule
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {firewallRules.length === 0 && (
                <tr><td colSpan={4} className={`${cs.td} text-center text-slate-400`}>No firewall rules</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'mfa' && (
        <div className={`${cs.card} max-w-md space-y-3`}>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={mfaPolicy.requireMfaForAdmins} onChange={(e) => setMfaPolicy((p) => ({ ...p, requireMfaForAdmins: e.target.checked }))} />
            Require MFA for Admins
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={mfaPolicy.requireMfaForAll} onChange={(e) => setMfaPolicy((p) => ({ ...p, requireMfaForAll: e.target.checked }))} />
            Require MFA for All Users
          </label>
          <button type="button" onClick={() => void handleSaveMfa()} disabled={running} className={cs.btnPrimary}>Save Policies</button>
        </div>
      )}

      {tab === 'backup' && (
        <div className={`${cs.card} max-w-xl space-y-3`}>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={schedule.autoBackupEnabled} onChange={(e) => setSchedule((s) => ({ ...s, autoBackupEnabled: e.target.checked }))} />
            Activate automated backup schedule
          </label>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Frequency">
              <select className={cs.input} value={schedule.backupFrequency} onChange={(e) => setSchedule((s) => ({ ...s, backupFrequency: e.target.value }))}>
                <option value="Daily">Daily</option>
                <option value="Weekly">Weekly</option>
              </select>
            </Field>
            <Field label="Time">
              <input className={cs.input} value={schedule.backupTime} onChange={(e) => setSchedule((s) => ({ ...s, backupTime: e.target.value }))} />
            </Field>
            <Field label="S3 Bucket URI">
              <input className={cs.input} value={schedule.s3BucketUri} onChange={(e) => setSchedule((s) => ({ ...s, s3BucketUri: e.target.value }))} placeholder="s3://bucket/path" />
            </Field>
            <Field label="Retain (days)">
              <input type="number" className={cs.input} value={schedule.retainBackupDays} onChange={(e) => setSchedule((s) => ({ ...s, retainBackupDays: Number(e.target.value) }))} />
            </Field>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => void handleSaveSchedule()} disabled={running} className={cs.btnPrimary}>Activate Schedule</button>
            <button type="button" onClick={() => void handleRunBackup()} disabled={running} className={`${cs.btnSecondary} flex items-center gap-1`}>
              <Play size={12} /> Run Backup Now
            </button>
          </div>
        </div>
      )}

      {tab === 'restore' && (
        <div className={`${cs.card} space-y-3`}>
          <table className={cs.table}>
            <thead>
              <tr>
                <th className={cs.th}>Select</th>
                <th className={cs.th}>Started</th>
                <th className={cs.th}>Tables</th>
                <th className={cs.th}>Checksum</th>
                <th className={cs.th}>Path</th>
              </tr>
            </thead>
            <tbody>
              {backups.map((b) => (
                <tr key={b.id}>
                  <td className={cs.td}>
                    <input type="radio" name="backup" checked={selectedBackupId === b.id} onChange={() => setSelectedBackupId(b.id)} />
                  </td>
                  <td className={cs.td}>{new Date(b.startedAt).toLocaleString('en-IN')}</td>
                  <td className={cs.td}>{b.tablesCount}</td>
                  <td className={cs.td}>{b.checksum.slice(0, 12)}…</td>
                  <td className={`${cs.td} max-w-xs truncate`}>{b.archivePath}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Field label="Admin password confirmation">
            <input type="password" className={cs.input} value={restorePassword} onChange={(e) => setRestorePassword(e.target.value)} />
          </Field>
          <button type="button" onClick={() => void handleRestore()} disabled={running || !selectedBackupId} className={`${cs.btnPrimary} flex items-center gap-1`}>
            <RotateCcw size={14} /> Restore Snapshot
          </button>
        </div>
      )}

      {tab === 'forensics' && (
        <div className="space-y-4">
          <div className={`${cs.card} grid grid-cols-2 md:grid-cols-4 gap-3`}>
            <Field label="User email">
              <input className={cs.input} value={forensicFilters.userEmail} onChange={(e) => setForensicFilters((f) => ({ ...f, userEmail: e.target.value }))} />
            </Field>
            <Field label="Action">
              <input className={cs.input} value={forensicFilters.action} onChange={(e) => setForensicFilters((f) => ({ ...f, action: e.target.value }))} />
            </Field>
            <Field label="From">
              <input type="date" className={cs.input} value={forensicFilters.from} onChange={(e) => setForensicFilters((f) => ({ ...f, from: e.target.value }))} />
            </Field>
            <Field label="To">
              <input type="date" className={cs.input} value={forensicFilters.to} onChange={(e) => setForensicFilters((f) => ({ ...f, to: e.target.value }))} />
            </Field>
            <div className="col-span-full flex gap-2">
              <button type="button" onClick={() => void handleSearchForensics()} disabled={running} className={cs.btnPrimary}>Search Logs</button>
              <button type="button" onClick={() => void handleExportForensics()} disabled={running} className={`${cs.btnSecondary} flex items-center gap-1`}>
                <Download size={12} /> Export CSV
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className={`${cs.card} overflow-auto max-h-96`}>
              <table className={cs.table}>
                <thead>
                  <tr>
                    <th className={cs.th}>Time</th>
                    <th className={cs.th}>User</th>
                    <th className={cs.th}>Action</th>
                    <th className={cs.th}></th>
                  </tr>
                </thead>
                <tbody>
                  {forensicLogs.map((log) => (
                    <tr key={log.id}>
                      <td className={cs.td}>{new Date(log.createdAt).toLocaleString('en-IN')}</td>
                      <td className={cs.td}>{log.userEmail}</td>
                      <td className={cs.td}>{log.action}</td>
                      <td className={cs.td}>
                        <button type="button" className="text-blue-600 text-xs" onClick={() => setSelectedLog(log)}>View JSON</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {selectedLog && (
              <div className={cs.card}>
                <h3 className="text-xs font-bold mb-2">Diff / JSON — {selectedLog.action}</h3>
                <p className="text-[10px] text-slate-500 mb-2">Integrity: {selectedLog.integrityHash || '—'}</p>
                <pre className="text-[10px] bg-slate-50 p-2 rounded overflow-auto max-h-80">
                  {JSON.stringify({ before: selectedLog.beforeState, after: selectedLog.afterState }, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </CoreSystemsPage>
  );
}
