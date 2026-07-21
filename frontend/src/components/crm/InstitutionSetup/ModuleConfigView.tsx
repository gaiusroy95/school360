import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react';
import { fetchInstitutionSetup, updateInstitutionTile } from '../../../lib/institutionApi';
import {
  emptyTileData,
  getTileByTitle,
  type SetupField,
  type SetupSection,
} from '../../../lib/institutionSetupSchema';
import { HolidayManager } from './HolidayManager';
import { AcademicCalendarView } from './AcademicCalendarView';
import { ComprehensiveCalendarView } from './ComprehensiveCalendarView';
import { IdCardTemplatesView } from './IdCardTemplatesView';
import { NotificationPreferencesView } from './NotificationPreferencesView';
import { SetupFieldInput } from './SetupFieldInput';
import { ID_CARD_TEMPLATES } from './idCardTypes';
import type { RecordColumn } from './masterListExcel';
import { RecordsEditor } from './RecordsEditor';
import type { CalendarSectionKey } from './calendarTypes';

const CALENDAR_SECTION_MAP: Record<string, CalendarSectionKey> = {
  'Academic Calendar': 'ACADEMIC',
  'Event Calendar': 'EVENTS',
  'Exam Calendar': 'EXAMINATION',
  'Holiday Calendar': 'HOLIDAYS',
  'Custom Events': 'CUSTOM',
};

type TileData = {
  sections: Record<string, Record<string, string>>;
  records?: Record<string, string>[];
  /** When set (e.g. after Excel upload), these headers drive the Master List table. */
  recordColumns?: RecordColumn[];
};

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
          const sections = { ...base.sections, ...(raw?.sections || {}) };
          for (const section of schema.sections) {
            const vals = { ...(sections[section.title] || {}) };
            for (const field of section.fields) {
              if (!vals[field.key] && field.defaultValue) {
                vals[field.key] = field.defaultValue;
              }
            }
            if (section.dynamicList) {
              const key = section.dynamicList.storageKey;
              const current = vals[key];
              const empty = !current || current === '[]';
              if (empty && (vals.admissionRequired || vals.staffRequired)) {
                vals[key] = JSON.stringify(
                  parseDynamicListItems(undefined, vals),
                );
                delete vals.admissionRequired;
                delete vals.staffRequired;
              } else if (!vals[key]) {
                vals[key] = '[]';
              }
            }
            sections[section.title] = vals;
          }
          setData({
            sections,
            records: schema.hasRecords ? raw?.records || [] : undefined,
            recordColumns: schema.hasRecords
              ? raw?.recordColumns?.length
                ? raw.recordColumns
                : schema.recordColumns
              : undefined,
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

  const activeColumns: RecordColumn[] =
    data.recordColumns && data.recordColumns.length > 0
      ? data.recordColumns
      : schema.recordColumns || [];

  const addRecord = () => {
    if (!activeColumns.length) return;
    const blank: Record<string, string> = {};
    for (const col of activeColumns) blank[col.key] = '';
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

  const replaceMasterList = (nextColumns: RecordColumn[], nextRecords: Record<string, string>[]) => {
    setData((prev) => ({
      ...prev,
      records: nextRecords,
      recordColumns: nextColumns,
    }));
    setMessage(
      `Master list updated from Excel (${nextColumns.length} columns, ${nextRecords.length} rows). Click Save Configuration to keep these changes.`,
    );
    setError('');
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      let payload: Record<string, unknown> = data as unknown as Record<string, unknown>;
      // Preserve calendar events managed by AcademicCalendarView (not in form state)
      if (schema.key === 'calendarSetup') {
        const { setup } = await fetchInstitutionSetup();
        const existing = (setup.calendarSetup || {}) as {
          events?: unknown[];
          sections?: unknown;
          publish?: unknown;
          publishedEvents?: unknown;
        };
        payload = {
          sections: data.sections,
          events: Array.isArray(existing.events) ? existing.events : [],
          publish: existing.publish,
          publishedEvents: existing.publishedEvents,
        };
      }
      await updateInstitutionTile(schema.key, payload);
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
            <div className="max-w-6xl space-y-4">
              {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
              {message && (
                <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">{message}</p>
              )}

              {activeSection === '__records__' && schema.hasRecords ? (
                <RecordsEditor
                  schema={schema}
                  columns={activeColumns}
                  records={data.records || []}
                  onAdd={addRecord}
                  onChange={updateRecord}
                  onRemove={removeRecord}
                  onReplaceMasterList={replaceMasterList}
                />
              ) : currentSection?.title === 'Comprehensive View' ? (
                <ComprehensiveCalendarView />
              ) : currentSection && CALENDAR_SECTION_MAP[currentSection.title] ? (
                <AcademicCalendarView
                  section={CALENDAR_SECTION_MAP[currentSection.title]}
                  title={currentSection.title}
                />
              ) : currentSection?.title === 'Holidays' ? (
                <HolidayManager
                  title={currentSection.title}
                  description="Upload Excel holiday list or add rows manually. This list is shared with HR & Payroll calendar for working-day calculation."
                />
              ) : currentSection?.title === 'ID Card Templates' ? (
                <IdCardTemplatesView
                  selectedTemplate={
                    data.sections[currentSection.title]?.studentTemplate || ID_CARD_TEMPLATES[0].name
                  }
                  onSelectTemplate={(name) => setField(currentSection.title, 'studentTemplate', name)}
                />
              ) : currentSection?.title === 'Notification Preferences' ? (
                <NotificationPreferencesView
                  fields={currentSection.fields}
                  values={data.sections[currentSection.title] || {}}
                  onChange={(key, value) => setField(currentSection.title, key, value)}
                />
              ) : currentSection?.dynamicList ? (
                <>
                  {schema.key === 'documentSetup' &&
                    (currentSection.title === 'Application Form Documents' ||
                      currentSection.title === 'Required Documents') && (
                      <DocumentSetupWorkflowNote sectionTitle={currentSection.title} />
                    )}
                  <DynamicListEditor
                    sectionTitle={currentSection.title}
                    description={currentSection.description}
                    config={currentSection.dynamicList}
                    sectionValues={data.sections[currentSection.title] || {}}
                    onChange={(storageKey, json) => setField(currentSection.title, storageKey, json)}
                  />
                </>
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
                        className={
                          field.type === 'textarea' ||
                          field.type === 'multiselect' ||
                          field.type === 'eventMultiselect'
                            ? 'md:col-span-2 space-y-1.5'
                            : 'space-y-1.5'
                        }
                      >
                        <label className="block text-xs font-bold text-slate-700">
                          {field.label}
                          {field.required ? <span className="text-red-500"> *</span> : null}
                        </label>
                        <SetupFieldInput
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

function DocumentSetupWorkflowNote({ sectionTitle }: { sectionTitle: string }) {
  return (
    <div className="mb-4 p-4 bg-sky-50 border border-sky-100 rounded-xl text-sm text-sky-900">
      <p className="font-semibold">How document upload works</p>
      <ol className="mt-2 space-y-1.5 text-xs text-sky-800 list-decimal list-inside">
        <li>
          On <span className="font-semibold">{sectionTitle}</span>, click{' '}
          <span className="font-semibold">Add Document Type</span> and enter the document name (e.g.
          Transfer Certificate).
        </li>
        <li>
          Click <span className="font-semibold">Save Configuration</span> at the top of this page.
        </li>
        <li>
          Go to <span className="font-semibold">Admission CRM → Applications</span>, open a student
          application, and use <span className="font-semibold">Upload</span> in the Required Documents
          panel to attach the actual file.
        </li>
      </ol>
    </div>
  );
}

function parseDynamicListItems(
  raw: string | undefined,
  legacy?: Record<string, string>,
): Record<string, string>[] {
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.map((row) => {
          if (row && typeof row === 'object') {
            const out: Record<string, string> = {};
            for (const [k, v] of Object.entries(row as Record<string, unknown>)) {
              out[k] = v == null ? '' : String(v);
            }
            return out;
          }
          return {};
        });
      }
    } catch {
      /* fall through to legacy */
    }
  }
  const items: Record<string, string>[] = [];
  if (legacy?.admissionRequired) {
    for (const name of legacy.admissionRequired.split(',').map((s) => s.trim()).filter(Boolean)) {
      items.push({ name, requiredFor: 'Admission', mandatory: 'Yes' });
    }
  }
  if (legacy?.staffRequired) {
    for (const name of legacy.staffRequired.split(',').map((s) => s.trim()).filter(Boolean)) {
      items.push({ name, requiredFor: 'Staff', mandatory: 'Yes' });
    }
  }
  return items;
}

function DynamicListEditor({
  sectionTitle,
  description,
  config,
  sectionValues,
  onChange,
}: {
  sectionTitle: string;
  description?: string;
  config: NonNullable<SetupSection['dynamicList']>;
  sectionValues: Record<string, string>;
  onChange: (storageKey: string, json: string) => void;
}) {
  const items = parseDynamicListItems(sectionValues[config.storageKey], sectionValues);

  const commit = (next: Record<string, string>[]) => {
    onChange(config.storageKey, JSON.stringify(next));
  };

  const addItem = () => {
    const blank: Record<string, string> = {};
    for (const field of config.fields) {
      blank[field.key] = field.defaultValue ?? '';
    }
    commit([...items, blank]);
  };

  const updateItem = (index: number, key: string, value: string) => {
    const next = items.map((row, i) => (i === index ? { ...row, [key]: value } : row));
    commit(next);
  };

  const removeItem = (index: number) => {
    commit(items.filter((_, i) => i !== index));
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-bold text-slate-800">{sectionTitle}</h2>
          {description && <p className="text-xs text-slate-500 mt-1">{description}</p>}
        </div>
        <button
          type="button"
          onClick={addItem}
          className="px-3 py-2 bg-amber-400 hover:bg-amber-500 text-slate-900 rounded-lg text-xs font-bold flex items-center gap-1 shrink-0"
        >
          <Plus size={14} /> {config.addLabel}
        </button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8 border border-dashed border-slate-200 rounded-lg">
          No {config.itemLabel?.toLowerCase() || 'items'} yet. Click &ldquo;{config.addLabel}&rdquo; to
          define a document type, then save configuration.
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((row, index) => (
            <div
              key={index}
              className="border border-slate-200 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-3 relative"
            >
              <div className="md:col-span-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">
                    {row.templateName || `${config.itemLabel || 'Item'} ${index + 1}`}
                  </p>
                  {row.medium && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-semibold shrink-0">
                      {row.medium}
                    </span>
                  )}
                  {row.active === 'No' && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-semibold shrink-0">
                      Inactive
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="text-red-500 hover:text-red-700 p-1"
                  title="Remove"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              {config.fields.map((field) => (
                <div
                  key={field.key}
                  className={
                    field.type === 'textarea' ||
                    field.type === 'multiselect' ||
                    field.type === 'eventMultiselect'
                      ? 'md:col-span-2 space-y-1.5'
                      : 'space-y-1.5'
                  }
                >
                  <label className="block text-xs font-bold text-slate-700">
                    {field.label}
                    {field.required ? <span className="text-red-500"> *</span> : null}
                  </label>
                  <SetupFieldInput
                    field={field}
                    value={row[field.key] || ''}
                    onChange={(v) => updateItem(index, field.key, v)}
                  />
                  {field.help && <p className="text-[10px] text-slate-400">{field.help}</p>}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
