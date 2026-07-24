import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Briefcase,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Loader2,
  MoreVertical,
  Pencil,
  PieChart,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  Upload,
  Users,
  UserCheck,
  UserX,
} from 'lucide-react';
import {
  createHrDesignation,
  deleteHrDesignation,
  fetchDesignationReference,
  fetchDesignationsDashboard,
  updateHrDesignation,
  type DesignationRow,
  type DesignationsDashboard,
} from '../../../lib/hrServices';
import {
  am,
  AcademicLoading,
  AcademicModal,
  AcademicPageHeader,
  AcademicPageShell,
  StatusBadge,
} from '../FeeFinanceManagement/FeeFinanceUi';

const DESIGNATION_TYPES = [
  'Management',
  'Teaching',
  'Support Staff',
  'Finance',
  'IT',
  'Non Teaching',
  'Administration',
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
];

function UtilizationBar({ pct }: { pct: number }) {
  const color = pct >= 90 ? 'bg-green-500' : pct >= 70 ? 'bg-amber-500' : 'bg-orange-500';
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <span className="text-[10px] font-semibold text-slate-600 tabular-nums w-10 text-right">{pct.toFixed(2)}%</span>
    </div>
  );
}

function KpiCard({
  title,
  value,
  subtitle,
  valueClass = 'text-slate-900',
  icon,
  iconBg,
}: {
  title: string;
  value: string;
  subtitle: string;
  valueClass?: string;
  icon: React.ReactNode;
  iconBg: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-start gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{title}</p>
        <p className={`text-xl font-bold mt-0.5 ${valueClass}`}>{value}</p>
        <p className="text-[10px] text-slate-400 mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

type FormState = {
  name: string;
  department: string;
  designationType: string;
  totalPositions: string;
  filledPositions: string;
  status: string;
};

const emptyForm = (): FormState => ({
  name: '',
  department: '',
  designationType: 'Teaching',
  totalPositions: '1',
  filledPositions: '0',
  status: 'ACTIVE',
});

export function DesignationsView() {
  const [data, setData] = useState<DesignationsDashboard | null>(null);
  const [reference, setReference] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [filterDept, setFilterDept] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterQ, setFilterQ] = useState('');
  const [tableQ, setTableQ] = useState('');
  const [tableDept, setTableDept] = useState('');
  const [tableStatus, setTableStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DesignationRow | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [dashboard, ref] = await Promise.all([
        fetchDesignationsDashboard({
          q: tableQ.trim() || filterQ.trim() || undefined,
          department: tableDept || filterDept || undefined,
          designationType: filterType || undefined,
          status: tableStatus || filterStatus || undefined,
          page,
          pageSize,
          seed: true,
        }),
        fetchDesignationReference(),
      ]);
      setData(dashboard);
      setReference(ref.categories);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load designations');
    } finally {
      setLoading(false);
    }
  }, [filterDept, filterType, filterStatus, filterQ, tableQ, tableDept, tableStatus, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  const deptTotals = useMemo(() => {
    if (!data) return { totalPositions: 0, filled: 0, vacant: 0 };
    return data.departmentSummary.reduce(
      (acc, row) => ({
        totalPositions: acc.totalPositions + row.totalPositions,
        filled: acc.filled + row.filled,
        vacant: acc.vacant + row.vacant,
      }),
      { totalPositions: 0, filled: 0, vacant: 0 },
    );
  }, [data]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  const applyFilters = () => {
    setTableQ(filterQ);
    setTableDept(filterDept);
    setTableStatus(filterStatus);
    setPage(1);
  };

  const resetFilters = () => {
    setFilterDept('');
    setFilterType('');
    setFilterStatus('');
    setFilterQ('');
    setTableQ('');
    setTableDept('');
    setTableStatus('');
    setPage(1);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setModalOpen(true);
  };

  const openEdit = (row: DesignationRow) => {
    setEditing(row);
    setForm({
      name: row.name,
      department: row.department,
      designationType: row.designationType,
      totalPositions: String(row.totalPositions),
      filledPositions: String(row.filledPositions),
      status: row.status,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: form.name.trim(),
        department: form.department.trim(),
        designationType: form.designationType,
        totalPositions: Number(form.totalPositions) || 0,
        filledPositions: Number(form.filledPositions) || 0,
        status: form.status,
      };
      if (editing) {
        await updateHrDesignation(editing.id, payload);
        setMessage('Designation updated successfully');
      } else {
        await createHrDesignation(payload);
        setMessage('Designation created successfully');
      }
      setModalOpen(false);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: DesignationRow) => {
    if (!window.confirm(`Delete designation "${row.name}"?`)) return;
    try {
      await deleteHrDesignation(row.id);
      setMessage('Designation deleted');
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  const exportCsv = () => {
    if (!data?.records.length) return;
    const headers = ['#', 'Designation Name', 'Department', 'Type', 'Total Positions', 'Filled', 'Vacant', 'Utilization %', 'Status'];
    const rows = data.records.map((r, i) => [
      String((page - 1) * pageSize + i + 1),
      r.name,
      r.department,
      r.designationType,
      String(r.totalPositions),
      String(r.filledPositions),
      String(r.vacantPositions),
      String(r.utilizationPct),
      r.statusLabel,
    ]);
    const csv = [headers, ...rows].map((row) => row.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'designations.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading && !data) {
    return (
      <AcademicPageShell>
        <AcademicLoading label="Loading designations…" />
      </AcademicPageShell>
    );
  }

  const summary = data?.summary;

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="HR & Payroll Management › Designations"
        title="Designations"
        subtitle="Manage designation master, position mapping and utilization"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={`${am.btnSecondary} bg-white`}>
              <FileText size={14} /> Report
            </button>
            <button type="button" className={`${am.btnSecondary} bg-white`}>
              <Upload size={14} /> Import
            </button>
            <button type="button" onClick={openCreate} className={am.btnPrimary}>
              <Plus size={14} /> Add New Designation
            </button>
            <button type="button" className={`${am.btnSecondary} bg-white`}>
              <MoreVertical size={14} /> More <ChevronDown size={14} />
            </button>
          </div>
        }
      />

      <div className={am.content}>
        {message && (
          <div className="text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            {message}
          </div>
        )}
        {error && (
          <div className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            <KpiCard
              title="Total Designations"
              value={String(summary.totalDesignations)}
              subtitle="All Active Designations"
              icon={<Briefcase size={18} className="text-blue-600" />}
              iconBg="bg-blue-50"
            />
            <KpiCard
              title="Total Positions"
              value={String(summary.totalPositions)}
              subtitle="Sanctioned Positions"
              icon={<Users size={18} className="text-indigo-600" />}
              iconBg="bg-indigo-50"
            />
            <KpiCard
              title="Filled Positions"
              value={String(summary.filledPositions)}
              subtitle="Employees Mapped"
              valueClass="text-green-600"
              icon={<UserCheck size={18} className="text-green-600" />}
              iconBg="bg-green-50"
            />
            <KpiCard
              title="Vacant Positions"
              value={String(summary.vacantPositions)}
              subtitle="Positions Vacant"
              valueClass="text-red-600"
              icon={<UserX size={18} className="text-red-600" />}
              iconBg="bg-red-50"
            />
            <KpiCard
              title="Department Coverage"
              value={String(summary.departmentCoverage)}
              subtitle="Departments"
              icon={<Building2 size={18} className="text-purple-600" />}
              iconBg="bg-purple-50"
            />
            <KpiCard
              title="Utilization Rate"
              value={`${summary.utilizationRate.toFixed(2)}%`}
              subtitle="Filled vs Sanctioned"
              valueClass="text-orange-600"
              icon={<PieChart size={18} className="text-orange-600" />}
              iconBg="bg-orange-50"
            />
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          <div className="xl:col-span-4 space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <h3 className="text-sm font-bold text-slate-800 mb-3">Designation Filter</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600">Department</label>
                  <select className={`${am.select} w-full`} value={filterDept} onChange={(e) => setFilterDept(e.target.value)}>
                    <option value="">All Departments</option>
                    {(data?.filterOptions.departments || []).map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Designation Type</label>
                  <select className={`${am.select} w-full`} value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                    <option value="">All Types</option>
                    {DESIGNATION_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Status</label>
                  <select className={`${am.select} w-full`} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Search Designation</label>
                  <input
                    className={am.input}
                    placeholder="Search designation…"
                    value={filterQ}
                    onChange={(e) => setFilterQ(e.target.value)}
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={applyFilters} className={`${am.btnPrimary} flex-1`}>
                    Filter
                  </button>
                  <button type="button" onClick={resetFilters} className={`${am.btnSecondary} flex-1 bg-white`}>
                    Reset
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <h3 className="text-sm font-bold text-slate-800 mb-3">Department Wise Summary</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500">
                      <th className="px-2 py-2 text-left font-semibold">Department</th>
                      <th className="px-2 py-2 text-right font-semibold">Total Pos.</th>
                      <th className="px-2 py-2 text-right font-semibold">Filled</th>
                      <th className="px-2 py-2 text-right font-semibold">Vacant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.departmentSummary || []).map((row) => (
                      <tr key={row.department} className="border-t border-slate-100">
                        <td className="px-2 py-2 font-medium text-slate-700">{row.department}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{row.totalPositions}</td>
                        <td className="px-2 py-2 text-right tabular-nums text-green-700">{row.filled}</td>
                        <td className="px-2 py-2 text-right tabular-nums text-red-600">{row.vacant}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 bg-slate-50 font-bold">
                      <td className="px-2 py-2">Total</td>
                      <td className="px-2 py-2 text-right tabular-nums">{deptTotals.totalPositions}</td>
                      <td className="px-2 py-2 text-right tabular-nums text-green-700">{deptTotals.filled}</td>
                      <td className="px-2 py-2 text-right tabular-nums text-red-600">{deptTotals.vacant}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>

          <div className="xl:col-span-8">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h3 className="text-sm font-bold text-slate-800">Designation List & Employee Mapping</h3>
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => void load()} className={am.btnSecondary}>
                    <RefreshCcw size={14} />
                  </button>
                  <button type="button" onClick={exportCsv} className={`${am.btnSecondary} bg-white`}>
                    <Download size={14} /> Export
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                <div className="relative flex-1 min-w-[180px]">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    className={`${am.input} pl-8 text-xs py-1.5`}
                    placeholder="Search designation…"
                    value={tableQ}
                    onChange={(e) => { setTableQ(e.target.value); setPage(1); }}
                  />
                </div>
                <select
                  className={`${am.select} text-xs`}
                  value={tableDept}
                  onChange={(e) => { setTableDept(e.target.value); setPage(1); }}
                >
                  <option value="">All Departments</option>
                  {(data?.filterOptions.departments || []).map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <select
                  className={`${am.select} text-xs`}
                  value={tableStatus}
                  onChange={(e) => { setTableStatus(e.target.value); setPage(1); }}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500">
                      <th className="px-2 py-2 text-left font-semibold">#</th>
                      <th className="px-2 py-2 text-left font-semibold">Designation Name</th>
                      <th className="px-2 py-2 text-left font-semibold">Department</th>
                      <th className="px-2 py-2 text-left font-semibold">Designation Type</th>
                      <th className="px-2 py-2 text-right font-semibold">Total Positions</th>
                      <th className="px-2 py-2 text-right font-semibold">Filled</th>
                      <th className="px-2 py-2 text-right font-semibold">Vacant</th>
                      <th className="px-2 py-2 text-left font-semibold min-w-[130px]">Utilization %</th>
                      <th className="px-2 py-2 text-left font-semibold">Status</th>
                      <th className="px-2 py-2 text-left font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.records || []).map((row, idx) => (
                      <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                        <td className="px-2 py-2">{(page - 1) * pageSize + idx + 1}</td>
                        <td className="px-2 py-2 font-medium text-slate-800">{row.name}</td>
                        <td className="px-2 py-2">{row.department}</td>
                        <td className="px-2 py-2">{row.designationType}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{row.totalPositions}</td>
                        <td className="px-2 py-2 text-right tabular-nums text-green-700">{row.filledPositions}</td>
                        <td className="px-2 py-2 text-right tabular-nums text-red-600">{row.vacantPositions}</td>
                        <td className="px-2 py-2">
                          <UtilizationBar pct={row.utilizationPct} />
                        </td>
                        <td className="px-2 py-2">
                          <StatusBadge status={row.status} />
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => openEdit(row)} className="p-1 text-slate-500 hover:text-blue-600" title="View">
                              <Eye size={12} />
                            </button>
                            <button type="button" onClick={() => openEdit(row)} className="p-1 text-slate-500 hover:text-amber-600" title="Edit">
                              <Pencil size={12} />
                            </button>
                            <button type="button" onClick={() => void handleDelete(row)} className="p-1 text-slate-500 hover:text-red-600" title="Delete">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2 border-t border-slate-100">
                <p className="text-[10px] text-slate-500">
                  Showing {data ? (page - 1) * pageSize + 1 : 0} to{' '}
                  {data ? Math.min(page * pageSize, data.total) : 0} of {data?.total ?? 0} entries
                </p>
                <div className="flex items-center gap-2">
                  <select
                    className={`${am.select} text-xs py-1`}
                    value={pageSize}
                    onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                  >
                    {[10, 20, 50].map((n) => (
                      <option key={n} value={n}>{n}/page</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="p-1 rounded border border-slate-200 text-slate-500 disabled:opacity-40 hover:bg-slate-50"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                    const pageNum = start + i;
                    if (pageNum > totalPages) return null;
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setPage(pageNum)}
                        className={`min-w-[28px] h-7 rounded text-[10px] font-semibold ${
                          pageNum === page
                            ? 'bg-blue-600 text-white'
                            : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1 rounded border border-slate-200 text-slate-500 disabled:opacity-40 hover:bg-slate-50"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <h3 className="text-sm font-bold text-slate-800 mb-4">
            Common Designations in Schools/Colleges (Reference List)
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-4">
            {Object.entries(reference).map(([category, items]) => (
              <div key={category}>
                <p className="text-[10px] font-bold text-blue-700 uppercase mb-2">{category}</p>
                <ul className="space-y-1">
                  {items.map((item) => (
                    <li key={item} className="text-[11px] text-slate-600 flex items-start gap-1">
                      <span className="text-slate-300 mt-0.5">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      <AcademicModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Designation' : 'Add New Designation'}
      >
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-600">Designation Name *</label>
            <input className={am.input} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Department *</label>
            <input
              className={am.input}
              list="dept-options"
              value={form.department}
              onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
            />
            <datalist id="dept-options">
              {(data?.filterOptions.departments || []).map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Designation Type</label>
            <select className={`${am.select} w-full`} value={form.designationType} onChange={(e) => setForm((f) => ({ ...f, designationType: e.target.value }))}>
              {DESIGNATION_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">Total Positions</label>
              <input type="number" className={am.input} value={form.totalPositions} onChange={(e) => setForm((f) => ({ ...f, totalPositions: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Filled Positions</label>
              <input type="number" className={am.input} value={form.filledPositions} onChange={(e) => setForm((f) => ({ ...f, filledPositions: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Status</label>
            <select className={`${am.select} w-full`} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className={am.btnSecondary}>
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              className={am.btnPrimary}
              disabled={saving || !form.name.trim() || !form.department.trim()}
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              {editing ? 'Save Changes' : 'Create Designation'}
            </button>
          </div>
        </div>
      </AcademicModal>
    </AcademicPageShell>
  );
}
