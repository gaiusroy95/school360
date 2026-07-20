import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react';
import { fetchInstitutionSetup, updateInstitutionTile } from '../../../lib/institutionApi';
import {
  emptyTileData,
  getTileByTitle,
  type SetupField,
  type SetupTileSchema,
} from '../../../lib/institutionSetupSchema';

type TileData = {
  sections: Record<string, Record<string, string>>;
  records?: Record<string, string>[];
};

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: SetupField;
  value: string;
  onChange: (v: string) => void;
}) {
  const base =
    'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white';

  if (field.type === 'textarea') {
    return (
      <textarea
        className={`${base} min-h-[88px]`}
        value={value}
        placeholder={field.placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  if (field.type === 'select') {
    return (
      <select className={base} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select...</option>
        {(field.options || []).map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === 'checkbox') {
    return (
      <label className="inline-flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={value === 'Yes' || value === 'true'}
          onChange={(e) => onChange(e.target.checked ? 'Yes' : 'No')}
        />
        Enabled
      </label>
    );
  }

  return (
    <input
      type={field.type === 'password' ? 'password' : field.type}
      className={base}
      value={value}
      placeholder={field.placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function ModuleConfigView({
  module,
  onBack,
}: {
  module: { title: string; desc: string; icon?: ReactNode };
  onBack: () => void;
}) {
  const schema = useMemo(() => getTileByTitle(module.title), [module.title]);
  const [data, setData] = useState<TileData>(() =>
    schema ? (emptyTileData(schema) as TileData) : { sections: {} },
  );
  const [activeSection, setActiveSection] = useState(schema?.sections[0]?.title || '');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!schema) return;
    setActiveSection(schema.sections[0]?.title || '');
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const { setup } = await fetchInstitutionSetup();
        const raw = (setup[schema.key] as TileData) || null;
        if (!cancelled) {
          const base = emptyTileData(schema) as TileData;
          setData({
            sections: { ...base.sections, ...(raw?.sections || {}) },
            records: schema.hasRecords ? raw?.records || [] : undefined,
          });
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [schema]);

  if (!schema) {
    return (
      <div className="p-6">
        <button onClick={onBack} className="text-sm text-indigo-600 mb-4">
          ← Back
        </button>
        <p className="text-slate-600">No configuration schema found for “{module.title}”.</p>
      </div>
    );
  }

  const currentSection = schema.sections.find((s) => s.title === activeSection) || schema.sections[0];

  const setField = (sectionTitle: string, key: string, value: string) => {
    setData((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        [sectionTitle]: {
          ...(prev.sections[sectionTitle] || {}),
          [key]: value,
        },
      },
    }));
  };

  const addRecord = () => {
    if (!schema.recordColumns) return;
    const blank: Record<string, string> = {};
    for (const col of schema.recordColumns) blank[col.key] = '';
    setData((prev) => ({ ...prev, records: [...(prev.records || []), blank] }));
  };

  const updateRecord = (index: number, key: string, value: string) => {
    setData((prev) => {
      const records = [...(prev.records || [])];
      records[index] = { ...records[index], [key]: value };
      return { ...prev, records };
    });
  };

  const removeRecord = (index: number) => {
    setData((prev) => ({
      ...prev,
      records: (prev.records || []).filter((_, i) => i !== index),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await updateInstitutionTile(schema.key, data as unknown as Record<string, unknown>);
      setMessage('Configuration saved to database.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      <div className="p-5 pb-4 border-b border-slate-200 bg-white shrink-0 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div className="flex items-start gap-3">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 mt-0.5">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              {module.icon}
              {schema.title}
            </h1>
            <p className="text-xs text-slate-500 mt-1">{schema.desc}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onBack}
            className="px-4 py-2 border border-slate-300 text-slate-700 bg-white rounded-lg text-sm font-medium hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 flex items-center gap-2"
          >
            <Save size={16} /> {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
        <aside className="lg:w-64 border-b lg:border-b-0 lg:border-r border-slate-200 bg-white p-3 overflow-x-auto lg:overflow-y-auto shrink-0">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 px-2 mb-2">Functionalities</p>
          <div className="flex lg:flex-col gap-1">
            {schema.sections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.title)}
                className={`text-left px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap ${
                  activeSection === section.title
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {section.title}
              </button>
            ))}
            {schema.hasRecords && (
              <button
                type="button"
                onClick={() => setActiveSection('__records__')}
                className={`text-left px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap ${
                  activeSection === '__records__'
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Records / Master List
              </button>
            )}
          </div>
        </aside>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <p className="text-sm text-slate-500">Loading configuration...</p>
          ) : (
            <div className="max-w-4xl space-y-4">
              {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
              {message && (
                <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">{message}</p>
              )}

              {activeSection === '__records__' && schema.hasRecords ? (
                <RecordsEditor
                  schema={schema}
                  records={data.records || []}
                  onAdd={addRecord}
                  onChange={updateRecord}
                  onRemove={removeRecord}
                />
              ) : (
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
                  <h2 className="text-base font-bold text-slate-800 mb-1">{currentSection.title}</h2>
                  {currentSection.description && (
                    <p className="text-xs text-slate-500 mb-4">{currentSection.description}</p>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {currentSection.fields.map((field) => (
                      <div
                        key={field.key}
                        className={field.type === 'textarea' ? 'md:col-span-2 space-y-1.5' : 'space-y-1.5'}
                      >
                        <label className="block text-xs font-bold text-slate-700">
                          {field.label}
                          {field.required ? <span className="text-red-500"> *</span> : null}
                        </label>
                        <FieldInput
                          field={field}
                          value={data.sections[currentSection.title]?.[field.key] || ''}
                          onChange={(v) => setField(currentSection.title, field.key, v)}
                        />
                        {field.help && <p className="text-[10px] text-slate-400">{field.help}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RecordsEditor({
  schema,
  records,
  onAdd,
  onChange,
  onRemove,
}: {
  schema: SetupTileSchema;
  records: Record<string, string>[];
  onAdd: () => void;
  onChange: (index: number, key: string, value: string) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-slate-800">Records / Master List</h2>
          <p className="text-xs text-slate-500 mt-1">
            Manage list data for this module. These rows are also filled by Express Setup Excel upload.
          </p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="px-3 py-2 bg-amber-400 hover:bg-amber-500 text-slate-900 rounded-lg text-xs font-bold flex items-center gap-1"
        >
          <Plus size={14} /> Add Row
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
            <tr>
              {(schema.recordColumns || []).map((col) => (
                <th key={col.key} className="px-3 py-2 font-semibold whitespace-nowrap">
                  {col.label}
                </th>
              ))}
              <th className="px-3 py-2 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 && (
              <tr>
                <td colSpan={(schema.recordColumns?.length || 0) + 1} className="px-3 py-6 text-center text-slate-400">
                  No records yet. Add a row or import via Express Setup Engine.
                </td>
              </tr>
            )}
            {records.map((row, i) => (
              <tr key={i} className="border-b border-slate-50">
                {(schema.recordColumns || []).map((col) => (
                  <td key={col.key} className="px-2 py-2">
                    <input
                      className="w-full min-w-[120px] border border-slate-200 rounded px-2 py-1.5"
                      value={row[col.key] || ''}
                      onChange={(e) => onChange(i, col.key, e.target.value)}
                    />
                  </td>
                ))}
                <td className="px-2 py-2">
                  <button type="button" onClick={() => onRemove(i)} className="text-red-500 hover:text-red-700 p-1">
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
