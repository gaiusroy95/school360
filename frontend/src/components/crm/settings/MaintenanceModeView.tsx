import { useCallback, useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { fetchMaintenanceConfig, updateMaintenanceConfig } from '../../../lib/settingsCoreSystemsServices';
import { CoreSystemsPage, cs, Field } from './CoreSystemsUi';

export function MaintenanceModeView() {
  const [form, setForm] = useState({
    maintenanceEnabled: false,
    maintenanceMessage: '',
    maintenanceAllowAdmins: true,
    maintenanceScheduledAt: '',
    maintenanceEndsAt: '',
    runtimeActive: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchMaintenanceConfig();
      setForm({
        maintenanceEnabled: res.maintenanceEnabled,
        maintenanceMessage: res.maintenanceMessage,
        maintenanceAllowAdmins: res.maintenanceAllowAdmins,
        maintenanceScheduledAt: res.maintenanceScheduledAt?.slice(0, 16) ?? '',
        maintenanceEndsAt: res.maintenanceEndsAt?.slice(0, 16) ?? '',
        runtimeActive: res.runtimeActive,
      });
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed to load');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await updateMaintenanceConfig({
        ...form,
        maintenanceScheduledAt: form.maintenanceScheduledAt || null,
        maintenanceEndsAt: form.maintenanceEndsAt || null,
      });
      setForm((f) => ({ ...f, runtimeActive: res.config.runtimeActive }));
      setMessage(res.message);
      setMessageType('success');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Save failed');
      setMessageType('error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <CoreSystemsPage
      title="Maintenance Mode"
      objective="Enable controlled downtime or feature lockouts for scheduled upgrades and database schema migrations."
      loading={loading}
      message={message}
      messageType={messageType}
    >
      <div className={`${cs.card} max-w-2xl`}>
        <div className={`text-xs font-semibold px-2 py-1 rounded ${form.runtimeActive ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>
          Runtime status: {form.runtimeActive ? 'Maintenance ACTIVE for non-admins' : 'Normal operations'}
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={form.maintenanceEnabled} onChange={(e) => setForm((f) => ({ ...f, maintenanceEnabled: e.target.checked }))} />
          Enable maintenance mode
        </label>
        <Field label="Maintenance message">
          <textarea className={cs.input} rows={3} value={form.maintenanceMessage} onChange={(e) => setForm((f) => ({ ...f, maintenanceMessage: e.target.value }))} />
        </Field>
        <label className="flex items-center gap-2 text-xs text-slate-700">
          <input type="checkbox" checked={form.maintenanceAllowAdmins} onChange={(e) => setForm((f) => ({ ...f, maintenanceAllowAdmins: e.target.checked }))} />
          Allow administrators to access during maintenance
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <Field label="Scheduled start">
            <input type="datetime-local" className={cs.input} value={form.maintenanceScheduledAt} onChange={(e) => setForm((f) => ({ ...f, maintenanceScheduledAt: e.target.value }))} />
          </Field>
          <Field label="Scheduled end">
            <input type="datetime-local" className={cs.input} value={form.maintenanceEndsAt} onChange={(e) => setForm((f) => ({ ...f, maintenanceEndsAt: e.target.value }))} />
          </Field>
        </div>
        <button type="button" onClick={() => void handleSave()} disabled={saving} className={`${cs.btnPrimary} flex items-center gap-1 w-fit`}>
          <Save size={12} /> {saving ? 'Saving…' : 'Save & Broadcast State'}
        </button>
      </div>
    </CoreSystemsPage>
  );
}
