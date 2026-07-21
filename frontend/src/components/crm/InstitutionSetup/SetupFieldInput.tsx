import { useEffect, useRef, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import type { SetupField } from '../../../lib/institutionSetupSchema';

export const inputBase =
  'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white';

export function EventMultiselectInput({
  options,
  value,
  onChange,
  placeholder = 'Select trigger events…',
  headerLabel = 'System trigger events',
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  headerLabel?: string;
}) {
  const selected = value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const toggle = (opt: string) => {
    const next = selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt];
    onChange(next.join(', '));
  };

  const selectAll = () => onChange(options.join(', '));
  const clearAll = () => onChange('');

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`${inputBase} flex items-center justify-between gap-2 text-left`}
      >
        <span className={selected.length ? 'text-slate-800' : 'text-slate-400'}>
          {selected.length
            ? `${selected.length} selected`
            : placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-slate-100 bg-slate-50">
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
              {headerLabel}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800"
              >
                Select all
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="text-[10px] font-semibold text-slate-500 hover:text-slate-700"
              >
                Clear
              </button>
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto p-2 space-y-0.5">
            {options.map((opt) => {
              const checked = selected.includes(opt);
              return (
                <label
                  key={opt}
                  className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm cursor-pointer ${
                    checked ? 'bg-indigo-50 text-indigo-900' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    checked={checked}
                    onChange={() => toggle(opt)}
                  />
                  <span>{opt}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selected.map((opt) => (
            <span
              key={opt}
              className="inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-100 px-2 py-0.5 text-[11px] font-medium text-indigo-800"
            >
              {opt}
              <button
                type="button"
                onClick={() => toggle(opt)}
                className="text-indigo-400 hover:text-indigo-700"
                aria-label={`Remove ${opt}`}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function SetupFieldInput({
  field,
  value,
  onChange,
}: {
  field: SetupField;
  value: string;
  onChange: (v: string) => void;
}) {
  const base = inputBase;

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

  if (field.type === 'eventMultiselect') {
    return (
      <EventMultiselectInput
        options={field.options || []}
        value={value}
        onChange={onChange}
      />
    );
  }

  if (field.type === 'multiselect') {
    const selected = value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const toggle = (opt: string) => {
      const next = selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt];
      onChange(next.join(', '));
    };
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {(field.options || []).map((opt) => {
          const checked = selected.includes(opt);
          return (
            <label
              key={opt}
              className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm cursor-pointer transition-colors ${
                checked
                  ? 'border-indigo-400 bg-indigo-50/60 text-slate-800'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
              }`}
            >
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                checked={checked}
                onChange={() => toggle(opt)}
              />
              <span className="font-medium">{opt}</span>
            </label>
          );
        })}
      </div>
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
