import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Save } from 'lucide-react';
import { fetchCacheSettings, updateCacheSettings } from '../../../lib/settingsCoreSystemsServices';
import { CoreSystemsPage, cs, Field } from './CoreSystemsUi';

export function CacheSettingsView() {
  const [form, setForm] = useState({
    cacheEnabled: true,
    cacheTtlSeconds: 300,
    cacheInvalidationMode: 'TTL',
    cacheLastFlushedAt: null as string | null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchCacheSettings();
      setForm(res);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed to load');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleSave = async (flush = false) => {
    setSaving(true);
    try {
      const res = await updateCacheSettings({ ...form, flushCache: flush });
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
      title="Cache Settings"
      objective="Configure in-memory key-value caching policies (TTLs, invalidation strategies) to accelerate data retrieval."
      loading={loading}
      message={message}
      messageType={messageType}
    >
      <div className={`${cs.card} max-w-2xl space-y-3`}>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={form.cacheEnabled} onChange={(e) => setForm((f) => ({ ...f, cacheEnabled: e.target.checked }))} />
          Enable application cache
        </label>
        <Field label="TTL (seconds)">
          <input type="number" className={cs.input} value={form.cacheTtlSeconds} onChange={(e) => setForm((f) => ({ ...f, cacheTtlSeconds: Number(e.target.value) }))} />
        </Field>
        <Field label="Invalidation mode">
          <select className={cs.input} value={form.cacheInvalidationMode} onChange={(e) => setForm((f) => ({ ...f, cacheInvalidationMode: e.target.value }))}>
            <option value="TTL">TTL expiry</option>
            <option value="WRITE_THROUGH">Write-through</option>
            <option value="EVENT">Event-driven</option>
          </select>
        </Field>
        {form.cacheLastFlushedAt && (
          <p className="text-[10px] text-slate-500">Last flushed: {new Date(form.cacheLastFlushedAt).toLocaleString('en-IN')}</p>
        )}
        <div className="flex gap-2">
          <button type="button" onClick={() => void handleSave(false)} disabled={saving} className={`${cs.btnPrimary} flex items-center gap-1`}>
            <Save size={12} /> Save
          </button>
          <button type="button" onClick={() => void handleSave(true)} disabled={saving} className={`${cs.btnSecondary} flex items-center gap-1`}>
            <RefreshCw size={12} /> Flush & Save
          </button>
        </div>
      </div>
    </CoreSystemsPage>
  );
}
