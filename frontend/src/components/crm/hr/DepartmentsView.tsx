import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Building2,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  FolderTree,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  Upload,
  User,
  X,
} from 'lucide-react';
import {
  createHrDepartment,
  fetchDepartmentEmployeeOptions,
  fetchHrDepartment,
  formatInr,
  listHrDepartments,
  updateHrDepartment,
  type EmployeeOption,
  type HrDepartmentDetail,
  type HrDepartmentSummary,
} from '../../../lib/hrServices';
import { toViewKey } from '../../../lib/navigation';
import {
  am,
  AcademicLoading,
  AcademicPageHeader,
  AcademicPageShell,
} from '../FeeFinanceManagement/FeeFinanceUi';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const CAMPUSES = ['Main Campus', 'North Campus', 'South Campus', 'Junior Wing'];
const STATUSES = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
];

const SETTINGS_META = [
  { key: 'leavePolicy', label: 'Leave Policy', icon: '📋' },
  { key: 'workingHours', label: 'Working Hours', icon: '🕘' },
  { key: 'overtimePolicy', label: 'Overtime Policy', icon: '⏱️' },
  { key: 'holidayCalendar', label: 'Holiday Calendar', icon: '📅' },
  { key: 'approvalAuthority', label: 'Approval Authority', icon: '✅' },
  { key: 'documentAccess', label: 'Document Access', icon: '📁' },
  { key: 'budgetControl', label: 'Budget Control', icon: '💰' },
] as const;

type FormState = {
  code: string;
  name: string;
  parentId: string;
  headEmployeeId: string;
  reportsToEmployeeId: string;
  shortDescription: string;
  detailedDescription: string;
  campus: string;
  status: string;
  budgetAllocation: string;
  costCenter: string;
  email: string;
  phone: string;
  workingDays: string[];
  notes: string;
};

const emptyForm = (): FormState => ({
  code: '',
  name: '',
  parentId: '',
  headEmployeeId: '',
  reportsToEmployeeId: '',
  shortDescription: '',
  detailedDescription: '',
  campus: 'Main Campus',
  status: 'ACTIVE',
  budgetAllocation: '',
  costCenter: '',
  email: '',
  phone: '',
  workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  notes: '',
});

function deptToForm(d: HrDepartmentDetail): FormState {
  return {
    code: d.code,
    name: d.name,
    parentId: d.parentId || '',
    headEmployeeId: d.headEmployeeId,
    reportsToEmployeeId: d.reportsToEmployeeId,
    shortDescription: d.shortDescription,
    detailedDescription: d.detailedDescription,
    campus: d.campus,
    status: d.status,
    budgetAllocation: d.budgetAllocation ? String(d.budgetAllocation) : '',
    costCenter: d.costCenter,
    email: d.email,
    phone: d.phone,
    workingDays: d.workingDays?.length ? d.workingDays : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    notes: d.notes,
  };
}

function EmployeeHeadSelect({
  value,
  options,
  disabled,
  onChange,
}: {
  value: string;
  options: EmployeeOption[];
  disabled?: boolean;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = options.find((o) => o.id === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        o.fullName.toLowerCase().includes(q) ||
        o.employeeCode.toLowerCase().includes(q),
    );
  }, [options, query]);

  if (disabled && selected) {
    return (
      <div className={`${am.input} flex items-center justify-between bg-slate-50 text-slate-700`}>
        <span className="text-xs truncate">{selected.label}</span>
      </div>
    );
  }

  return (
    <div className="relative">
      {selected && !open ? (
        <div className={`${am.input} flex items-center justify-between gap-2 pr-2`}>
          <span className="text-xs truncate">{selected.label}</span>
          <button
            type="button"
            onClick={() => onChange('')}
            className="p-0.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600"
            aria-label="Clear department head"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <input
          className={am.input}
          placeholder="Search employee by name or ID…"
          value={open ? query : query || (selected?.label ?? '')}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
        />
      )}
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <ul className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg text-xs">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-slate-400">No employees found</li>
            ) : (
              filtered.map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-blue-50 hover:text-blue-800"
                    onClick={() => {
                      onChange(o.id);
                      setQuery('');
                      setOpen(false);
                    }}
                  >
                    {o.label}
                  </button>
                </li>
              ))
            )}
          </ul>
        </>
      )}
    </div>
  );
}

function StructureTree({
  nodes,
  selectedId,
}: {
  nodes: HrDepartmentDetail['structureTree'];
  selectedId?: string;
}) {
  return (
    <ul className="space-y-1 text-xs">
      {nodes.map((node) => (
        <li key={node.id}>
          <div
            className={`flex items-center gap-1.5 py-1 px-2 rounded ${
              selectedId === node.id ? 'bg-blue-50 text-blue-800 font-semibold' : 'text-slate-700'
            }`}
          >
            <FolderTree size={12} className="text-amber-600 shrink-0" />
            {node.label}
          </div>
          {node.children?.length ? (
            <ul className="ml-4 border-l border-slate-200 pl-2 mt-0.5">
              {node.children.map((child) => (
                <li key={child.id} className="flex items-center gap-1.5 py-0.5 text-slate-600">
                  <span className="text-slate-300">└</span>
                  {child.label}
                </li>
              ))}
            </ul>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function PersonCard({ title, person }: { title: string; person: HrDepartmentDetail['head'] }) {
  return (
    <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50">
      <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">{title}</p>
      {person ? (
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
            <User size={18} className="text-slate-500" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800">{person.fullName}</p>
            <p className="text-[10px] text-slate-500">{person.designation}</p>
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-400">Not assigned</p>
      )}
    </div>
  );
}

type Props = {
  onNavigate?: (view: string) => void;
};

export function DepartmentsView({ onNavigate }: Props) {
  const [list, setList] = useState<HrDepartmentSummary[]>([]);
  const [detail, setDetail] = useState<HrDepartmentDetail | null>(null);
  const [employeeOptions, setEmployeeOptions] = useState<EmployeeOption[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<'list' | 'detail' | 'create'>('list');
  const [form, setForm] = useState<FormState>(emptyForm());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [empSearch, setEmpSearch] = useState('');
  const [empStatus, setEmpStatus] = useState('');
  const [empDesignation, setEmpDesignation] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [empPage, setEmpPage] = useState(1);
  const initialAutoOpen = useRef(false);
  const EMP_PAGE_SIZE = 12;

  const goEmployees = useCallback(() => {
    if (onNavigate) onNavigate(toViewKey('HR & Payroll Management', 'Employees Directory'));
  }, [onNavigate]);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listHrDepartments({ q: search.trim() || undefined, seed: true });
      setList(data.records);
      if (!initialAutoOpen.current && data.records.length > 0) {
        initialAutoOpen.current = true;
        const preferred = data.records.find((r) => r.code === 'ACD001') ?? data.records[0];
        setSelectedId(preferred.id);
        setMode('detail');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load departments');
    } finally {
      setLoading(false);
    }
  }, [search]);

  const loadDetail = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const [deptRes, optsRes] = await Promise.all([
        fetchHrDepartment(id),
        fetchDepartmentEmployeeOptions(),
      ]);
      setDetail(deptRes.record);
      setForm(deptToForm(deptRes.record));
      setEmployeeOptions(optsRes.records);
      setEditMode(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load department');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (selectedId && mode === 'detail') void loadDetail(selectedId);
  }, [selectedId, mode, loadDetail]);

  const designations = useMemo(() => {
    if (!detail) return [];
    return [...new Set(detail.employees.map((e) => e.designation))].sort();
  }, [detail]);

  const filteredEmployees = useMemo(() => {
    if (!detail) return [];
    return detail.employees.filter((e) => {
      if (empStatus && e.status !== empStatus) return false;
      if (empDesignation && e.designation !== empDesignation) return false;
      if (empSearch.trim()) {
        const q = empSearch.trim().toLowerCase();
        return (
          e.fullName.toLowerCase().includes(q) ||
          e.employeeCode.toLowerCase().includes(q) ||
          e.designation.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [detail, empSearch, empStatus, empDesignation]);

  const empTotalPages = Math.max(1, Math.ceil(filteredEmployees.length / EMP_PAGE_SIZE));
  const pagedEmployees = useMemo(() => {
    const start = (empPage - 1) * EMP_PAGE_SIZE;
    return filteredEmployees.slice(start, start + EMP_PAGE_SIZE);
  }, [filteredEmployees, empPage]);

  useEffect(() => {
    setEmpPage(1);
  }, [empSearch, empStatus, empDesignation, detail?.id]);

  const openDetail = (id: string) => {
    setSelectedId(id);
    setMode('detail');
  };

  const openCreate = async () => {
    setMode('create');
    setSelectedId(null);
    setDetail(null);
    setForm(emptyForm());
    setEditMode(true);
    try {
      const optsRes = await fetchDepartmentEmployeeOptions();
      setEmployeeOptions(optsRes.records);
    } catch {
      /* ignore */
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        parentId: form.parentId || null,
        budgetAllocation: form.budgetAllocation ? Number(form.budgetAllocation) : 0,
      };
      if (mode === 'create') {
        const { record } = await createHrDepartment(payload);
        setMessage(`Department ${record.name} created`);
        setSelectedId(record.id);
        setMode('detail');
        setDetail(record);
        void loadList();
      } else if (selectedId) {
        const { record } = await updateHrDepartment(selectedId, payload);
        setDetail(record);
        setForm(deptToForm(record));
        setMessage('Department saved successfully');
        setEditMode(false);
        void loadList();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const toggleWorkingDay = (day: string) => {
    setForm((f) => ({
      ...f,
      workingDays: f.workingDays.includes(day)
        ? f.workingDays.filter((d) => d !== day)
        : [...f.workingDays, day],
    }));
  };

  if (loading && ((mode === 'list' && !selectedId) || (mode === 'detail' && !detail && !!selectedId))) {
    return (
      <AcademicPageShell>
        <AcademicLoading label="Loading departments…" />
      </AcademicPageShell>
    );
  }

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="HR & Payroll Management › Departments"
        title="Departments"
        subtitle="Manage department structure, personnel mapping and settings"
        actions={
          mode !== 'list' ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => { setMode('list'); setSelectedId(null); setDetail(null); setEditMode(false); }}
                className={`${am.btnSecondary} bg-white`}
              >
                <ArrowLeft size={14} /> Back to Departments
              </button>
              {mode === 'detail' && !editMode && (
                <button
                  type="button"
                  onClick={() => setEditMode(true)}
                  className={`${am.btnPrimary} bg-blue-600 hover:bg-blue-700`}
                >
                  <Pencil size={14} /> Edit Department
                </button>
              )}
              <button type="button" onClick={() => void openCreate()} className={`${am.btnPrimary} bg-green-600 hover:bg-green-700`}>
                <Plus size={14} /> Add New Department
              </button>
              <button type="button" className={`${am.btnSecondary} bg-white`}>
                <MoreVertical size={14} /> More <ChevronDown size={14} />
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => void openCreate()} className={am.btnPrimary}>
              <Plus size={14} /> Add New Department
            </button>
          )
        }
      />

      <div className={am.content}>
        {message && <div className="text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{message}</div>}
        {error && <div className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}

        {mode === 'list' && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  className={`${am.input} pl-9`}
                  placeholder="Search departments…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <button type="button" onClick={() => void loadList()} className={am.btnSecondary}>
                <RefreshCcw size={14} />
              </button>
            </div>
            <div className={am.tableWrap}>
              <table className="w-full">
                <thead>
                  <tr>
                    <th className={am.th}>Code</th>
                    <th className={am.th}>Department</th>
                    <th className={am.th}>Campus</th>
                    <th className={am.th}>Budget</th>
                    <th className={am.th}>Status</th>
                    <th className={am.th}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/80">
                      <td className={`${am.td} font-mono text-xs`}>{row.code}</td>
                      <td className={`${am.td} font-medium`}>{row.name}</td>
                      <td className={am.td}>{row.campus}</td>
                      <td className={am.td}>{formatInr(row.budgetAllocation)}</td>
                      <td className={am.td}>
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase ${row.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'}`}>
                          {row.status === 'ACTIVE' ? 'Active' : row.status}
                        </span>
                      </td>
                      <td className={am.td}>
                        <button type="button" onClick={() => openDetail(row.id)} className="text-xs font-semibold text-blue-600 hover:underline">
                          Open
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {(mode === 'detail' || mode === 'create') && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
            <div className="xl:col-span-5 bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Building2 size={16} className="text-blue-600" />
                Department Information
              </h3>
              <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600">
                      Department Name <span className="text-red-500">*</span>
                    </label>
                    <input className={am.input} value={form.name} disabled={!editMode} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600">
                      Department Code <span className="text-red-500">*</span>
                    </label>
                    <input className={am.input} value={form.code} disabled={!editMode} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Parent Department</label>
                  <select className={`${am.select} w-full`} disabled={!editMode} value={form.parentId} onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value }))}>
                    <option value="">-- Select Parent Department --</option>
                    {(detail?.parentOptions || list).map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({'code' in p ? p.code : ''})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Department Head</label>
                  <EmployeeHeadSelect
                    value={form.headEmployeeId}
                    options={employeeOptions}
                    disabled={!editMode}
                    onChange={(id) => setForm((f) => ({ ...f, headEmployeeId: id }))}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Short Description</label>
                  <textarea className={`${am.input} min-h-[60px]`} disabled={!editMode} value={form.shortDescription} onChange={(e) => setForm((f) => ({ ...f, shortDescription: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Detailed Description</label>
                  <textarea className={`${am.input} min-h-[80px]`} disabled={!editMode} value={form.detailedDescription} onChange={(e) => setForm((f) => ({ ...f, detailedDescription: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600">Location / Campus</label>
                    <select className={`${am.select} w-full`} disabled={!editMode} value={form.campus} onChange={(e) => setForm((f) => ({ ...f, campus: e.target.value }))}>
                      {CAMPUSES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600">Status</label>
                    <select className={`${am.select} w-full`} disabled={!editMode} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                      {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600">Budget Allocation (Annual) ₹</label>
                    <input type="number" className={am.input} disabled={!editMode} value={form.budgetAllocation} onChange={(e) => setForm((f) => ({ ...f, budgetAllocation: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600">Cost Center</label>
                    <input className={am.input} disabled={!editMode} value={form.costCenter} onChange={(e) => setForm((f) => ({ ...f, costCenter: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600">Department Email</label>
                    <input className={am.input} disabled={!editMode} value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600">Department Phone</label>
                    <input className={am.input} disabled={!editMode} value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Working Days</label>
                  <div className="flex flex-wrap gap-1.5">
                    {WEEKDAYS.map((day) => (
                      <button
                        key={day}
                        type="button"
                        disabled={!editMode}
                        onClick={() => toggleWorkingDay(day)}
                        className={`px-2 py-1 rounded-full text-[10px] font-semibold border transition-colors ${
                          form.workingDays.includes(day)
                            ? 'bg-blue-100 text-blue-800 border-blue-200'
                            : 'bg-slate-50 text-slate-500 border-slate-200'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Department Logo</label>
                  <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center text-xs text-slate-500">
                    <Upload size={20} className="mx-auto mb-2 text-slate-400" />
                    Click or drag file to upload (PNG, JPG, SVG — Max 2MB)
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Notes</label>
                  <textarea className={`${am.input} min-h-[60px]`} disabled={!editMode} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => { if (mode === 'create') setMode('list'); else setEditMode(false); }} className={am.btnSecondary}>
                  Cancel
                </button>
                <button type="button" onClick={() => void handleSave()} className={am.btnPrimary} disabled={saving || !editMode || !form.name || !form.code}>
                  {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                  Save Department
                </button>
              </div>
            </div>

            <div className="xl:col-span-7 space-y-4">
              {mode === 'detail' && detail && (
                <>
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <h3 className="text-sm font-bold text-slate-800">
                        Employees in Department ({detail.employees.length})
                      </h3>
                      <button type="button" onClick={goEmployees} className={`${am.btnPrimary} text-xs py-1.5`}>
                        <Plus size={12} /> Add / Assign Employees
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <div className="relative flex-1 min-w-[180px]">
                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          className={`${am.input} pl-8 text-xs py-1.5`}
                          placeholder="Search by Name, Employee ID, Designation…"
                          value={empSearch}
                          onChange={(e) => setEmpSearch(e.target.value)}
                        />
                      </div>
                      <select className={`${am.select} text-xs`} value={empStatus} onChange={(e) => setEmpStatus(e.target.value)}>
                        <option value="">All Status</option>
                        <option value="ACTIVE">Active</option>
                        <option value="ON_LEAVE">On Leave</option>
                      </select>
                      <select className={`${am.select} text-xs`} value={empDesignation} onChange={(e) => setEmpDesignation(e.target.value)}>
                        <option value="">All Designations</option>
                        {designations.map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500">
                            <th className="px-2 py-2 text-left font-semibold">#</th>
                            <th className="px-2 py-2 text-left font-semibold">Employee ID</th>
                            <th className="px-2 py-2 text-left font-semibold">Employee Name</th>
                            <th className="px-2 py-2 text-left font-semibold">Designation</th>
                            <th className="px-2 py-2 text-left font-semibold">Mobile</th>
                            <th className="px-2 py-2 text-left font-semibold">Email</th>
                            <th className="px-2 py-2 text-left font-semibold">Status</th>
                            <th className="px-2 py-2 text-left font-semibold">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pagedEmployees.map((emp, idx) => (
                            <tr key={emp.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                              <td className="px-2 py-2">{(empPage - 1) * EMP_PAGE_SIZE + idx + 1}</td>
                              <td className="px-2 py-2 font-mono">{emp.employeeCode}</td>
                              <td className="px-2 py-2">
                                <button type="button" onClick={goEmployees} className="text-blue-600 font-medium hover:underline">
                                  {emp.fullName}
                                </button>
                              </td>
                              <td className="px-2 py-2">{emp.designation}</td>
                              <td className="px-2 py-2">{emp.mobile || '—'}</td>
                              <td className="px-2 py-2">{emp.email || '—'}</td>
                              <td className="px-2 py-2">
                                <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                  emp.status === 'ON_LEAVE' ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'
                                }`}>
                                  {emp.statusLabel}
                                </span>
                              </td>
                              <td className="px-2 py-2">
                                <div className="flex items-center gap-1">
                                  <button type="button" onClick={goEmployees} className="p-1 text-slate-500 hover:text-blue-600"><Eye size={12} /></button>
                                  <button type="button" className="p-1 text-slate-500 hover:text-amber-600"><Pencil size={12} /></button>
                                  <button type="button" className="p-1 text-slate-500 hover:text-red-600"><Trash2 size={12} /></button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 mt-2">
                      <p className="text-[10px] text-slate-500">
                        Showing {(empPage - 1) * EMP_PAGE_SIZE + 1} to{' '}
                        {Math.min(empPage * EMP_PAGE_SIZE, filteredEmployees.length)} of {filteredEmployees.length} entries
                      </p>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={empPage <= 1}
                          onClick={() => setEmpPage((p) => Math.max(1, p - 1))}
                          className="p-1 rounded border border-slate-200 text-slate-500 disabled:opacity-40 hover:bg-slate-50"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        {Array.from({ length: empTotalPages }, (_, i) => i + 1).slice(0, 5).map((page) => (
                          <button
                            key={page}
                            type="button"
                            onClick={() => setEmpPage(page)}
                            className={`min-w-[28px] h-7 rounded text-[10px] font-semibold ${
                              page === empPage ? 'bg-blue-600 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                        <button
                          type="button"
                          disabled={empPage >= empTotalPages}
                          onClick={() => setEmpPage((p) => Math.min(empTotalPages, p + 1))}
                          className="p-1 rounded border border-slate-200 text-slate-500 disabled:opacity-40 hover:bg-slate-50"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                    <h3 className="text-sm font-bold text-slate-800 mb-3">Department Mapping & Structure</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Organization Structure</p>
                        <StructureTree nodes={detail.structureTree} selectedId="academics" />
                      </div>
                      <div className="space-y-3">
                        <PersonCard title="Reports To" person={detail.reportsTo} />
                        <PersonCard title="Department Head" person={detail.head} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Department Functions / Responsibilities</p>
                        <ul className="space-y-1.5">
                          {detail.functions.map((fn, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
                              <Check size={12} className="text-green-600 mt-0.5 shrink-0" />
                              {fn}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {mode === 'detail' && detail && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mt-2">
            {SETTINGS_META.map((item) => (
              <div key={item.key} className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-center shadow-sm">
                <span className="text-lg">{item.icon}</span>
                <p className="text-[9px] font-bold text-slate-500 uppercase mt-1">{item.label}</p>
                <p className="text-[10px] font-semibold text-slate-800 mt-0.5">
                  {detail.settings[item.key] || '—'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </AcademicPageShell>
  );
}
