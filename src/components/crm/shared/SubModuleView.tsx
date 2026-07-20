import { useMemo, useState } from 'react';
import { Download, Filter, Plus, Search, UploadCloud } from 'lucide-react';

type Column = { key: string; label: string };

const STATUS_STYLES: Record<string, string> = {
  Active: 'bg-green-50 text-green-700 border-green-200',
  Pending: 'bg-amber-50 text-amber-700 border-amber-200',
  Completed: 'bg-blue-50 text-blue-700 border-blue-200',
  Approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Paid: 'bg-green-50 text-green-700 border-green-200',
  Due: 'bg-red-50 text-red-700 border-red-200',
  Draft: 'bg-slate-50 text-slate-600 border-slate-200',
  Open: 'bg-indigo-50 text-indigo-700 border-indigo-200',
};

const FIRST = ['Aarav', 'Myra', 'Vihaan', 'Ananya', 'Kabir', 'Diya', 'Rohan', 'Sara', 'Ishaan', 'Pooja'];
const LAST = ['Sharma', 'Singh', 'Patel', 'Gupta', 'Mehra', 'Joshi', 'Khan', 'Verma', 'Nair', 'Reddy'];
const CLASSES = ['Class 5-A', 'Class 6-B', 'Class 7-A', 'Class 8-C', 'Class 9-B', 'Class 10-A'];
const STATUSES = ['Active', 'Pending', 'Completed', 'Approved', 'Paid', 'Due', 'Draft', 'Open'];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function columnsFor(title: string): Column[] {
  const t = title.toLowerCase();
  if (t.includes('fee') || t.includes('invoice') || t.includes('payment') || t.includes('refund')) {
    return [
      { key: 'id', label: 'Ref ID' },
      { key: 'name', label: 'Student / Party' },
      { key: 'class', label: 'Class' },
      { key: 'amount', label: 'Amount' },
      { key: 'date', label: 'Date' },
      { key: 'status', label: 'Status' },
    ];
  }
  if (t.includes('attendance') || t.includes('leave') || t.includes('gate')) {
    return [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Name' },
      { key: 'class', label: 'Class / Dept' },
      { key: 'detail', label: 'Detail' },
      { key: 'date', label: 'Date' },
      { key: 'status', label: 'Status' },
    ];
  }
  if (t.includes('report') || t.includes('analytics')) {
    return [
      { key: 'id', label: 'Report ID' },
      { key: 'name', label: 'Report Name' },
      { key: 'detail', label: 'Period' },
      { key: 'date', label: 'Generated' },
      { key: 'status', label: 'Status' },
    ];
  }
  if (t.includes('exam') || t.includes('mark') || t.includes('result') || t.includes('certificate')) {
    return [
      { key: 'id', label: 'Exam ID' },
      { key: 'name', label: 'Student' },
      { key: 'class', label: 'Class' },
      { key: 'detail', label: 'Subject / Exam' },
      { key: 'amount', label: 'Score' },
      { key: 'status', label: 'Status' },
    ];
  }
  return [
    { key: 'id', label: 'Record ID' },
    { key: 'name', label: 'Name' },
    { key: 'class', label: 'Class / Group' },
    { key: 'detail', label: 'Details' },
    { key: 'date', label: 'Updated' },
    { key: 'status', label: 'Status' },
  ];
}

function buildRows(module: string, title: string, count = 8) {
  const seed = hash(`${module}|${title}`);
  const cols = columnsFor(title);
  return Array.from({ length: count }, (_, i) => {
    const n = seed + i * 17;
    const name = `${FIRST[n % FIRST.length]} ${LAST[(n >> 3) % LAST.length]}`;
    const status = STATUSES[n % STATUSES.length];
    const row: Record<string, string> = {
      id: `${title.slice(0, 3).toUpperCase().replace(/\s/g, '')}-${String(1000 + (n % 9000))}`,
      name,
      class: CLASSES[n % CLASSES.length],
      detail: `${title} item ${(n % 40) + 1}`,
      amount: `₹${(((n % 80) + 12) * 500).toLocaleString('en-IN')}`,
      date: `${((n % 27) + 1).toString().padStart(2, '0')} May 2026`,
      status,
    };
    return { cols, row, status };
  });
}

function kpiFor(title: string, seed: number) {
  const base = (seed % 900) + 100;
  return [
    { label: `Total ${title}`, value: String(base + 42) },
    { label: 'Active / Open', value: String(Math.floor(base * 0.72)) },
    { label: 'Pending', value: String(Math.floor(base * 0.18)) },
    { label: 'This Month', value: String(Math.floor(base * 0.24)) },
  ];
}

interface SubModuleViewProps {
  module: string;
  title: string;
}

/**
 * Shared list/KPI screen used for submenu pages that did not yet have a dedicated view.
 * Matches existing slate / amber ERP visual language (no theme change).
 */
export function SubModuleView({ module, title }: SubModuleViewProps) {
  const [query, setQuery] = useState('');
  const seed = hash(`${module}|${title}`);
  const kpis = useMemo(() => kpiFor(title, seed), [title, seed]);
  const rows = useMemo(() => buildRows(module, title), [module, title]);
  const columns = rows[0]?.cols ?? columnsFor(title);

  const filtered = rows.filter(({ row }) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return Object.values(row).some((v) => String(v).toLowerCase().includes(q));
  });

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-y-auto">
      <div className="p-5 space-y-4 max-w-[1600px] mx-auto w-full">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-800">{title}</h1>
            <p className="text-xs text-slate-500 mt-1">
              {module} &gt; {title}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded text-xs font-medium hover:bg-slate-50 flex items-center gap-1.5 shadow-sm"
            >
              <UploadCloud size={14} /> Import
            </button>
            <button
              type="button"
              className="px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded text-xs font-medium hover:bg-slate-50 flex items-center gap-1.5 shadow-sm"
            >
              <Download size={14} /> Export
            </button>
            <button
              type="button"
              className="px-3 py-2 bg-amber-400 hover:bg-amber-500 text-slate-900 rounded text-xs font-bold flex items-center gap-1.5 shadow-sm uppercase"
            >
              <Plus size={14} strokeWidth={3} /> Add New
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpis.map((k) => (
            <div key={k.label} className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">{k.label}</p>
              <p className="text-lg font-bold text-slate-800 mt-1">{k.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 border-b border-slate-100">
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 w-full sm:max-w-xs">
              <Search size={14} className="text-slate-400 shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${title.toLowerCase()}...`}
                className="bg-transparent border-none focus:outline-none text-xs ml-2 w-full text-slate-700"
              />
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-xs text-slate-600 border border-slate-200 rounded px-2.5 py-1.5 hover:bg-slate-50"
            >
              <Filter size={14} /> Filters
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                <tr>
                  {columns.map((c) => (
                    <th key={c.key} className="px-4 py-2.5 font-semibold whitespace-nowrap">
                      {c.label}
                    </th>
                  ))}
                  <th className="px-4 py-2.5 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(({ row, status }, i) => (
                  <tr key={row.id + i} className="border-b border-slate-50 hover:bg-slate-50/80">
                    {columns.map((c) => (
                      <td key={c.key} className="px-4 py-2.5 text-slate-700 whitespace-nowrap">
                        {c.key === 'status' ? (
                          <span
                            className={`inline-flex px-2 py-0.5 rounded border text-[10px] font-bold ${
                              STATUS_STYLES[status] || 'bg-slate-50 text-slate-600 border-slate-200'
                            }`}
                          >
                            {row.status}
                          </span>
                        ) : (
                          row[c.key]
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-2.5">
                      <button type="button" className="text-blue-600 font-semibold hover:underline">
                        View
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={columns.length + 1} className="px-4 py-8 text-center text-slate-400">
                      No records match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
