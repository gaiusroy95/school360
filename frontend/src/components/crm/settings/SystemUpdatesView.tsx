import { useCallback, useEffect, useState, type ComponentType } from 'react';
import { Play, RefreshCw } from 'lucide-react';
import { executeSystemUpdate, fetchSystemUpdates } from '../../../lib/settingsCoreSystemsServices';
import { checkSystemUpdates } from '../../../lib/settingsIntegrationsApiUpdatesServices';
import { CoreSystemsPage, cs, Field } from './CoreSystemsUi';

export function SystemUpdatesView() {
  const [currentVersion, setCurrentVersion] = useState('1.0.0');
  const [updates, setUpdates] = useState<Awaited<ReturnType<typeof fetchSystemUpdates>>['updates']>([]);
  const [form, setForm] = useState({ versionTo: '', packageName: '', updateType: 'PATCH', notes: '' });
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [remoteVersion, setRemoteVersion] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchSystemUpdates();
      setCurrentVersion(res.currentVersion);
      setUpdates(res.updates);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed to load');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleCheckUpdates = async () => {
    setChecking(true);
    try {
      const res = await checkSystemUpdates();
      setRemoteVersion(res.remoteVersion);
      setMessage(res.message);
      setMessageType(res.updateAvailable ? 'info' : 'success');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Check failed');
      setMessageType('error');
    } finally {
      setChecking(false);
    }
  };

  const handleExecute = async () => {
    setExecuting(true);
    try {
      const res = await executeSystemUpdate(form);
      setCurrentVersion(res.currentVersion);
      setUpdates(res.updates);
      setMessage(res.message);
      setMessageType('success');
      setForm({ versionTo: '', packageName: '', updateType: 'PATCH', notes: '' });
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Update failed');
      setMessageType('error');
    } finally {
      setExecuting(false);
    }
  };

  return (
    <CoreSystemsPage
      title="System Updates"
      objective="Manage application patch deployments, hotfixes, and version releases across ERP modules."
      loading={loading}
      message={message}
      messageType={messageType}
    >
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className={cs.card}>
          <div className="text-xs font-bold text-slate-700 mb-2">
            Current version: v{currentVersion}
            {remoteVersion && <span className="font-normal text-slate-500"> · Registry: v{remoteVersion}</span>}
          </div>
          <button type="button" onClick={() => void handleCheckUpdates()} disabled={checking} className={`${cs.btnSecondary} flex items-center gap-1 mb-3`}>
            <RefreshCw size={12} /> {checking ? 'Checking…' : 'Check for Updates'}
          </button>
          <div className="grid grid-cols-1 gap-2">
            <Field label="Target version" required>
              <input className={cs.input} value={form.versionTo} onChange={(e) => setForm((f) => ({ ...f, versionTo: e.target.value }))} placeholder="e.g. 1.1.0" />
            </Field>
            <Field label="Package name" required>
              <input className={cs.input} value={form.packageName} onChange={(e) => setForm((f) => ({ ...f, packageName: e.target.value }))} placeholder="erp-core-patch-1.1.0" />
            </Field>
            <Field label="Update type">
              <select className={cs.input} value={form.updateType} onChange={(e) => setForm((f) => ({ ...f, updateType: e.target.value }))}>
                <option value="PATCH">Patch</option>
                <option value="MINOR">Minor</option>
                <option value="MAJOR">Major</option>
                <option value="HOTFIX">Hotfix</option>
              </select>
            </Field>
            <Field label="Release notes">
              <textarea className={cs.input} rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </Field>
            <button type="button" onClick={() => void handleExecute()} disabled={executing} className={`${cs.btnPrimary} flex items-center gap-1 w-fit`}>
              <Play size={12} /> {executing ? 'Executing…' : 'Execute Update'}
            </button>
          </div>
        </div>

        <div className={`${cs.card} overflow-hidden`}>
          <div className="text-xs font-bold text-slate-700 mb-2">Update history</div>
          <div className="overflow-x-auto max-h-80">
            <table className={cs.table}>
              <thead>
                <tr>
                  <th className={cs.th}>Version</th>
                  <th className={cs.th}>Type</th>
                  <th className={cs.th}>Status</th>
                  <th className={cs.th}>Date</th>
                </tr>
              </thead>
              <tbody>
                {updates.map((u) => (
                  <tr key={u.id}>
                    <td className={cs.td}>{u.versionFrom} → {u.versionTo}</td>
                    <td className={cs.td}>{u.updateType}</td>
                    <td className={cs.td}>{u.status}</td>
                    <td className={cs.td}>{new Date(u.createdAt).toLocaleDateString('en-IN')}</td>
                  </tr>
                ))}
                {updates.length === 0 && (
                  <tr><td colSpan={4} className={`${cs.td} text-center text-slate-400 py-6`}>No updates recorded</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </CoreSystemsPage>
  );
}
