import { useCallback, useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { fetchPerformanceSettings, updatePerformanceSettings } from '../../../lib/settingsCoreSystemsServices';
import { CoreSystemsPage, cs, Field } from './CoreSystemsUi';

export function PerformanceSettingsView() {
  const [form, setForm] = useState({
    queryTimeoutMs: 30000,
    workerConcurrency: 4,
    backgroundQueueSize: 100,
    apmThresholdMs: 2000,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchPerformanceSettings();
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
      const res = await updatePerformanceSettings(form);
      setForm(res.settings);
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
      title="Performance Settings"
      objective="Tune application thread pools, query timeout thresholds, and asynchronous background worker queues."
      loading={loading}
      message={message}
      messageType={messageType}
    >
      <div className={`${cs.card} max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-3`}>
        <Field label="Query timeout (ms)">
          <input type="number" className={cs.input} value={form.queryTimeoutMs} onChange={(e) => setForm((f) => ({ ...f, queryTimeoutMs: Number(e.target.value) }))} />
        </Field>
        <Field label="Worker concurrency">
          <input type="number" className={cs.input} value={form.workerConcurrency} onChange={(e) => setForm((f) => ({ ...f, workerConcurrency: Number(e.target.value) }))} />
        </Field>
        <Field label="Background queue size">
          <input type="number" className={cs.input} value={form.backgroundQueueSize} onChange={(e) => setForm((f) => ({ ...f, backgroundQueueSize: Number(e.target.value) }))} />
        </Field>
        <Field label="APM threshold (ms)">
          <input type="number" className={cs.input} value={form.apmThresholdMs} onChange={(e) => setForm((f) => ({ ...f, apmThresholdMs: Number(e.target.value) }))} />
        </Field>
        <button type="button" onClick={() => void handleSave()} disabled={saving} className={`${cs.btnPrimary} flex items-center gap-1 w-fit md:col-span-2`}>
          <Save size={12} /> {saving ? 'Saving…' : 'Reload Middleware'}
        </button>
      </div>
    </CoreSystemsPage>
  );
}
