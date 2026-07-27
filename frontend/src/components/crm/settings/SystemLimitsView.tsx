import { useCallback, useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { fetchSystemLimits, updateSystemLimits } from '../../../lib/settingsCoreSystemsServices';
import { CoreSystemsPage, cs, Field } from './CoreSystemsUi';

export function SystemLimitsView() {
  const [form, setForm] = useState({
    maxConcurrentSessions: 500,
    maxStorageGb: 1000,
    maxUploadMb: 25,
    maxApiRequestsPerMinute: 120,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchSystemLimits();
      setForm(res);
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
      const res = await updateSystemLimits(form);
      setForm(res.limits);
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
      title="System Limits"
      objective="Define operational boundaries including maximum concurrent user sessions, storage caps, and file upload sizes."
      loading={loading}
      message={message}
      messageType={messageType}
    >
      <div className={`${cs.card} max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-3`}>
        <Field label="Max concurrent sessions">
          <input type="number" className={cs.input} value={form.maxConcurrentSessions} onChange={(e) => setForm((f) => ({ ...f, maxConcurrentSessions: Number(e.target.value) }))} />
        </Field>
        <Field label="Max storage (GB)">
          <input type="number" className={cs.input} value={form.maxStorageGb} onChange={(e) => setForm((f) => ({ ...f, maxStorageGb: Number(e.target.value) }))} />
        </Field>
        <Field label="Max upload size (MB)">
          <input type="number" className={cs.input} value={form.maxUploadMb} onChange={(e) => setForm((f) => ({ ...f, maxUploadMb: Number(e.target.value) }))} />
        </Field>
        <Field label="API requests / minute">
          <input type="number" className={cs.input} value={form.maxApiRequestsPerMinute} onChange={(e) => setForm((f) => ({ ...f, maxApiRequestsPerMinute: Number(e.target.value) }))} />
        </Field>
        <button type="button" onClick={() => void handleSave()} disabled={saving} className={`${cs.btnPrimary} flex items-center gap-1 w-fit md:col-span-2`}>
          <Save size={12} /> {saving ? 'Saving…' : 'Save Limits'}
        </button>
      </div>
    </CoreSystemsPage>
  );
}
