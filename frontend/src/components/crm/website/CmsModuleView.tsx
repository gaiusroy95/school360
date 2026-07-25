import { useCallback, useEffect, useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import {
  fetchCmsModule,
  createCmsItem,
  type CmsModuleName,
  type CmsModuleManagement,
  type CmsModuleField,
} from '../../../lib/websiteCmsServices';
import { AcademicLoading, FeeMessage } from '../FeeFinanceManagement/FeeFinanceUi';

type CmsModuleViewProps = {
  module: CmsModuleName;
  title: string;
  subtitle: string;
};

function formatCell(value: unknown): string {
  if (value == null) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return value.toLocaleString('en-IN');
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    }
  }
  return String(value);
}

function emptyForm(fields: CmsModuleField[]): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  for (const f of fields) {
    if (f.type === 'checkbox') out[f.key] = false;
    else if (f.type === 'select' && f.options?.[0]) out[f.key] = f.options[0].value;
    else out[f.key] = '';
  }
  return out;
}

export function CmsModuleView({ module, title, subtitle }: CmsModuleViewProps) {
  const [data, setData] = useState<CmsModuleManagement | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [form, setForm] = useState<Record<string, string | boolean>>({});

  const load = useCallback(async (seed = false) => {
    setLoading(true);
    try {
      const result = await fetchCmsModule(module, seed);
      setData(result);
      setForm(emptyForm(result.createFields));
    } finally {
      setLoading(false);
    }
  }, [module]);

  useEffect(() => { void load(true); }, [load]);

  const flash = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 7000);
  };

  const handleCreate = async () => {
    if (!data) return;
    const missing = data.createFields.filter((f) => f.required && !form[f.key]);
    if (missing.length > 0) {
      flash(`${missing[0].label} is required`, 'error');
      return;
    }
    setSaving(true);
    try {
      const result = await createCmsItem(module, form);
      if (result.data) setData(result.data);
      else await load();
      setForm(emptyForm(data.createFields));
      flash(result.message || 'Created successfully', 'success');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Create failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !data) return <AcademicLoading label={`Loading ${title.toLowerCase()}…`} />;

  const canCreate = data?.permissions.canCreate ?? false;
  const columns = data?.columns ?? [];
  const items = data?.items ?? [];
  const fields = data?.createFields ?? [];

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">{title}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void load(false)}
            className="p-1.5 border border-slate-200 rounded hover:bg-slate-50"
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {message && <FeeMessage message={message} type={messageType} />}

      {(data?.kpis?.length ?? 0) > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {data!.kpis!.map((k) => (
            <div key={k.label} className="bg-white rounded-lg border border-slate-200 p-2 text-center">
              <div className="text-lg font-bold text-slate-800">{k.value}</div>
              <div className="text-[10px] text-slate-500">{k.label}</div>
            </div>
          ))}
        </div>
      )}

      {canCreate && fields.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 space-y-3">
          <div className="flex items-center gap-2">
            <Plus size={14} className="text-blue-600" />
            <span className="text-xs font-bold text-slate-700">Create New</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {fields.map((field) => (
              <div key={field.key}>
                <label className="text-[10px] font-semibold text-slate-600 block mb-1">
                  {field.label}{field.required ? ' *' : ''}
                </label>
                {field.type === 'textarea' ? (
                  <textarea
                    value={String(form[field.key] ?? '')}
                    onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    rows={2}
                    className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5"
                  />
                ) : field.type === 'select' ? (
                  <select
                    value={String(form[field.key] ?? '')}
                    onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
                    className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white"
                  >
                    {(field.options ?? []).map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                ) : field.type === 'checkbox' ? (
                  <label className="flex items-center gap-2 text-xs text-slate-700">
                    <input
                      type="checkbox"
                      checked={Boolean(form[field.key])}
                      onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.checked }))}
                    />
                    {field.placeholder || 'Enabled'}
                  </label>
                ) : (
                  <input
                    type={field.type === 'number' ? 'number' : 'text'}
                    value={String(form[field.key] ?? '')}
                    onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5"
                  />
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={saving}
            className="flex items-center gap-1 px-4 py-2 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Plus size={12} /> {saving ? 'Creating…' : 'Create'}
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1">
        <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700">{title} List</span>
          <span className="text-[10px] text-slate-400">{data?.totalItems ?? items.length} items</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {columns.map((col) => (
                  <th key={col.key} className="text-left px-3 py-2 font-bold text-slate-600">{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  {columns.map((col) => (
                    <td key={col.key} className="px-3 py-2 text-slate-700 max-w-[200px] truncate">
                      {formatCell(row[col.key])}
                    </td>
                  ))}
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={columns.length || 1} className="px-3 py-8 text-center text-slate-400">
                    No records yet. Use the form above to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
