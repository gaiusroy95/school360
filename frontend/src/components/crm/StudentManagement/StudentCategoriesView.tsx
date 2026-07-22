import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Upload, Download, Plus, Search, Filter, Loader2, Pencil, Trash2, Eye, X, Users, Tags,
} from 'lucide-react';
import {
  ASSIGNMENT_STATUSES,
  CATEGORY_GROUPS,
  createCategory,
  createCategoryAssignment,
  deleteCategory,
  deleteCategoryAssignment,
  exportCategoryData,
  fetchCategories,
  fetchCategoryAssignments,
  fetchCategoryMeta,
  importCategoryData,
  seedDefaultCategories,
  updateCategory,
  updateCategoryAssignment,
  type CategoryInput,
  type CategorySummary,
  type StudentCategory,
  type StudentCategoryAssignment,
} from '../../../lib/studentCategoryServices';
import { downloadCategoriesExcel, parseCategoriesImport } from '../../../lib/studentCategoryExcel';
import { fetchStudents } from '../../../lib/studentServices';

const STATUS_BADGE: Record<string, string> = {
  Active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Inactive: 'bg-slate-100 text-slate-600 border-slate-200',
  Pending: 'bg-amber-100 text-amber-700 border-amber-200',
  Draft: 'bg-slate-100 text-slate-500 border-slate-200',
  Due: 'bg-red-100 text-red-700 border-red-200',
  Open: 'bg-blue-100 text-blue-700 border-blue-200',
  Completed: 'bg-purple-100 text-purple-700 border-purple-200',
  Approved: 'bg-green-100 text-green-800 border-green-200',
  Paid: 'bg-cyan-100 text-cyan-700 border-cyan-200',
};

export function StudentCategoriesView() {
  const [tab, setTab] = useState<'master' | 'assignments'>('master');
  const [summary, setSummary] = useState<CategorySummary | null>(null);
  const [categories, setCategories] = useState<StudentCategory[]>([]);
  const [assignments, setAssignments] = useState<StudentCategoryAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [message, setMessage] = useState('');
  const [categoryModal, setCategoryModal] = useState<StudentCategory | null | 'new'>(null);
  const [assignmentModal, setAssignmentModal] = useState<StudentCategoryAssignment | null | 'new'>(null);
  const [viewAssignment, setViewAssignment] = useState<StudentCategoryAssignment | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [meta, cats, asg] = await Promise.all([
        fetchCategoryMeta(),
        fetchCategories({ q: search || undefined, categoryGroup: filterGroup || undefined, status: filterStatus || undefined }),
        fetchCategoryAssignments({ q: search || undefined, categoryGroup: filterGroup || undefined, status: filterStatus || undefined }),
      ]);
      setSummary(meta.summary);
      setCategories(cats.categories);
      setAssignments(asg.assignments);
      if (cats.categories.length === 0) {
        await seedDefaultCategories();
        const refreshed = await fetchCategories();
        setCategories(refreshed.categories);
      }
    } finally {
      setLoading(false);
    }
  }, [search, filterGroup, filterStatus]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleExport = async () => {
    const data = await exportCategoryData();
    downloadCategoriesExcel(data.categories, data.assignments);
    setMessage('Exported categories and assignments to Excel.');
  };

  const handleImport = async (file: File) => {
    const parsed = await parseCategoriesImport(file);
    const res = await importCategoryData(parsed);
    setMessage(`Imported ${res.categoriesCreated} categories, ${res.assignmentsCreated} assignments.`);
    await load();
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Delete this category? Linked assignments will also be removed.')) return;
    await deleteCategory(id);
    await load();
  };

  const handleDeleteAssignment = async (id: string) => {
    if (!confirm('Remove this student category assignment?')) return;
    await deleteCategoryAssignment(id);
    await load();
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      <div className="p-4 md:p-6 bg-white border-b border-slate-200 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-[10px] text-slate-400 font-medium">Student Management &gt; Student Categories</p>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800 mt-0.5">Student Categories</h1>
            <p className="text-xs text-slate-500 mt-1">Manage category master data and student assignments</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => fileRef.current?.click()} className="px-3 py-2 border border-slate-300 rounded-lg text-sm flex items-center gap-1.5 hover:bg-slate-50">
              <Upload size={14} /> Import
            </button>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleImport(f); e.target.value = ''; }} />
            <button type="button" onClick={() => void handleExport()} className="px-3 py-2 border border-slate-300 rounded-lg text-sm flex items-center gap-1.5 hover:bg-slate-50">
              <Download size={14} /> Export
            </button>
            <button
              type="button"
              onClick={() => (tab === 'master' ? setCategoryModal('new') : setAssignmentModal('new'))}
              className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-slate-900 rounded-lg text-sm font-bold flex items-center gap-1.5"
            >
              <Plus size={14} /> ADD NEW
            </button>
          </div>
        </div>

        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            {[
              { label: 'Total Student Categories', value: summary.totalCategories, color: 'text-slate-800' },
              { label: 'Active / Open', value: summary.activeOpen, color: 'text-emerald-600' },
              { label: 'Pending', value: summary.pending, color: 'text-amber-600' },
              { label: 'This Month', value: summary.thisMonth, color: 'text-indigo-600' },
            ].map((k) => (
              <div key={k.label} className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <p className="text-[10px] font-bold text-slate-500 uppercase">{k.label}</p>
                <p className={`text-2xl font-bold ${k.color}`}>{k.value.toLocaleString('en-IN')}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
          <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-100 w-fit">
            <button type="button" onClick={() => setTab('master')} className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1 ${tab === 'master' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>
              <Tags size={12} /> Category Master
            </button>
            <button type="button" onClick={() => setTab('assignments')} className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1 ${tab === 'assignments' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>
              <Users size={12} /> Student Assignments
            </button>
          </div>
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={tab === 'master' ? 'Search student categories...' : 'Search assignments...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <button type="button" onClick={() => setShowFilters((v) => !v)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm flex items-center gap-1.5 hover:bg-slate-50">
            <Filter size={14} /> Filters
          </button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-2 mt-3 p-3 bg-slate-50 rounded-lg border">
            <select value={filterGroup} onChange={(e) => setFilterGroup(e.target.value)} className="border rounded-lg px-2 py-1.5 text-sm">
              <option value="">All Groups</option>
              {CATEGORY_GROUPS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="border rounded-lg px-2 py-1.5 text-sm">
              <option value="">All Statuses</option>
              {tab === 'master' ? (
                <>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </>
              ) : (
                ASSIGNMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)
              )}
            </select>
            <button type="button" onClick={() => { setFilterGroup(''); setFilterStatus(''); }} className="text-xs text-indigo-600 font-medium px-2">Clear filters</button>
          </div>
        )}
        {message && <p className="text-xs text-indigo-600 mt-2">{message}</p>}
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6">
        {loading ? (
          <div className="flex justify-center p-12"><Loader2 className="animate-spin text-slate-400" /></div>
        ) : tab === 'master' ? (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="p-3 text-left text-xs font-bold text-slate-500">Category ID</th>
                  <th className="p-3 text-left text-xs font-bold text-slate-500">Name</th>
                  <th className="p-3 text-left text-xs font-bold text-slate-500">Group</th>
                  <th className="p-3 text-left text-xs font-bold text-slate-500">Short Code</th>
                  <th className="p-3 text-left text-xs font-bold text-slate-500">Type</th>
                  <th className="p-3 text-left text-xs font-bold text-slate-500">Updated</th>
                  <th className="p-3 text-left text-xs font-bold text-slate-500">Status</th>
                  <th className="p-3 text-right text-xs font-bold text-slate-500">Action</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c.id} className="border-t hover:bg-slate-50">
                    <td className="p-3 font-mono text-xs text-slate-500">{c.shortCode}-{c.id.slice(-4).toUpperCase()}</td>
                    <td className="p-3 font-medium text-slate-800">
                      <span className="mr-1.5">{c.icon}</span>
                      <span style={{ color: c.colorCode }}>{c.name}</span>
                    </td>
                    <td className="p-3 text-slate-600 text-xs">{c.categoryGroupLabel}</td>
                    <td className="p-3 font-mono text-xs">{c.shortCode}</td>
                    <td className="p-3 text-xs">{c.categoryTypeLabel}</td>
                    <td className="p-3 text-xs text-slate-500">{new Date(c.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td className="p-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${STATUS_BADGE[c.statusLabel] || STATUS_BADGE.Active}`}>{c.statusLabel}</span>
                    </td>
                    <td className="p-3 text-right">
                      <button type="button" onClick={() => setCategoryModal(c)} className="text-indigo-600 text-xs font-bold hover:underline mr-2">Edit</button>
                      <button type="button" onClick={() => void handleDeleteCategory(c.id)} className="text-red-500 text-xs"><Trash2 size={12} className="inline" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {categories.length === 0 && <p className="p-8 text-center text-slate-500 text-sm">No categories yet. Click ADD NEW or import defaults.</p>}
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="p-3 text-left text-xs font-bold text-slate-500">Record ID</th>
                  <th className="p-3 text-left text-xs font-bold text-slate-500">Name</th>
                  <th className="p-3 text-left text-xs font-bold text-slate-500">Class / Group</th>
                  <th className="p-3 text-left text-xs font-bold text-slate-500">Details</th>
                  <th className="p-3 text-left text-xs font-bold text-slate-500">Updated</th>
                  <th className="p-3 text-left text-xs font-bold text-slate-500">Status</th>
                  <th className="p-3 text-right text-xs font-bold text-slate-500">Action</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((a) => (
                  <tr key={a.id} className="border-t hover:bg-slate-50">
                    <td className="p-3 font-mono text-xs text-slate-600">{a.recordId}</td>
                    <td className="p-3 font-medium text-slate-800">{a.name}</td>
                    <td className="p-3 text-slate-600">{a.classGroup}</td>
                    <td className="p-3 text-slate-600 text-xs max-w-[200px] truncate">{a.details}</td>
                    <td className="p-3 text-xs text-slate-500">{new Date(a.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td className="p-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${STATUS_BADGE[a.statusLabel] || STATUS_BADGE.Active}`}>{a.statusLabel}</span>
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <button type="button" onClick={() => setViewAssignment(a)} className="text-indigo-600 text-xs font-bold hover:underline mr-2">View</button>
                      <button type="button" onClick={() => setAssignmentModal(a)} className="text-slate-600 text-xs mr-2"><Pencil size={12} className="inline" /></button>
                      <button type="button" onClick={() => void handleDeleteAssignment(a.id)} className="text-red-500 text-xs"><Trash2 size={12} className="inline" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {assignments.length === 0 && <p className="p-8 text-center text-slate-500 text-sm">No student assignments yet. Assign students to categories using ADD NEW.</p>}
          </div>
        )}
      </div>

      {categoryModal !== null && (
        <CategoryFormModal
          initial={categoryModal === 'new' ? null : categoryModal}
          onClose={() => setCategoryModal(null)}
          onSaved={() => { setCategoryModal(null); void load(); setMessage('Category saved.'); }}
        />
      )}

      {assignmentModal !== null && (
        <AssignmentFormModal
          initial={assignmentModal === 'new' ? null : assignmentModal}
          categories={categories}
          onClose={() => setAssignmentModal(null)}
          onSaved={() => { setAssignmentModal(null); void load(); setMessage('Assignment saved.'); }}
        />
      )}

      {viewAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-bold text-slate-800">Assignment Details</h3>
              <button type="button" onClick={() => setViewAssignment(null)}><X size={18} /></button>
            </div>
            <dl className="space-y-2 text-sm">
              <Row label="Record ID" value={viewAssignment.recordId} />
              <Row label="Student" value={viewAssignment.name} />
              <Row label="Class" value={viewAssignment.classGroup} />
              <Row label="Category" value={`${viewAssignment.categoryIcon} ${viewAssignment.categoryName}`} />
              <Row label="Group" value={viewAssignment.categoryGroupLabel} />
              <Row label="Details" value={viewAssignment.details} />
              <Row label="Status" value={viewAssignment.statusLabel} />
              <Row label="Updated" value={new Date(viewAssignment.updatedAt).toLocaleString('en-IN')} />
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-50 pb-2">
      <dt className="text-slate-500 text-xs font-bold">{label}</dt>
      <dd className="text-slate-800 text-right">{value}</dd>
    </div>
  );
}

function CategoryFormModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: StudentCategory | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<CategoryInput>({
    categoryGroup: initial?.categoryGroup || 'ADMISSION',
    name: initial?.name || '',
    shortCode: initial?.shortCode || '',
    categoryType: initial?.categoryType || 'INTERNAL',
    description: initial?.description || '',
    status: initial?.status || 'ACTIVE',
    displayOrder: initial?.displayOrder ?? 0,
    colorCode: initial?.colorCode || '#6366f1',
    icon: initial?.icon || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    if (!form.name.trim() || !form.shortCode.trim()) { setError('Name and short code are required'); return; }
    setSaving(true);
    try {
      if (initial) await updateCategory(initial.id, form);
      else await createCategory(form);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title={initial ? 'Edit Category' : 'Add Category'} onClose={onClose} onSave={() => void save()} saving={saving} error={error}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Category Group *">
          <select value={form.categoryGroup} onChange={(e) => setForm({ ...form, categoryGroup: e.target.value })} className="w-full border rounded-lg p-2 text-sm">
            {CATEGORY_GROUPS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
          </select>
        </Field>
        <Field label="Category Name *">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border rounded-lg p-2 text-sm" />
        </Field>
        <Field label="Short Code *">
          <input value={form.shortCode} onChange={(e) => setForm({ ...form, shortCode: e.target.value.toUpperCase() })} className="w-full border rounded-lg p-2 text-sm font-mono" maxLength={12} />
        </Field>
        <Field label="Category Type">
          <select value={form.categoryType} onChange={(e) => setForm({ ...form, categoryType: e.target.value })} className="w-full border rounded-lg p-2 text-sm">
            <option value="INTERNAL">Internal</option>
            <option value="GOVERNMENT">Government</option>
          </select>
        </Field>
        <Field label="Status">
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full border rounded-lg p-2 text-sm">
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </Field>
        <Field label="Display Order">
          <input type="number" value={form.displayOrder} onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })} className="w-full border rounded-lg p-2 text-sm" />
        </Field>
        <Field label="Color Code">
          <input type="color" value={form.colorCode} onChange={(e) => setForm({ ...form, colorCode: e.target.value })} className="w-full h-10 border rounded-lg" />
        </Field>
        <Field label="Icon (emoji)">
          <input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} className="w-full border rounded-lg p-2 text-sm" placeholder="🎓" />
        </Field>
        <Field label="Description" className="sm:col-span-2">
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full border rounded-lg p-2 text-sm min-h-[72px]" />
        </Field>
      </div>
    </ModalShell>
  );
}

function AssignmentFormModal({
  initial,
  categories,
  onClose,
  onSaved,
}: {
  initial: StudentCategoryAssignment | null;
  categories: StudentCategory[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [students, setStudents] = useState<{ id: string; fullName: string; admissionNumber: string; classSection: string }[]>([]);
  const [form, setForm] = useState({
    studentId: initial?.studentId || '',
    categoryId: initial?.categoryId || '',
    details: initial?.details || '',
    status: initial?.status || 'ACTIVE',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void fetchStudents({ pageSize: 500, viewAll: true }).then((r) => setStudents(r.students));
  }, []);

  const save = async () => {
    if (!form.studentId || !form.categoryId) { setError('Student and category are required'); return; }
    setSaving(true);
    try {
      if (initial) await updateCategoryAssignment(initial.id, { details: form.details, status: form.status, categoryId: form.categoryId });
      else await createCategoryAssignment(form);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title={initial ? 'Edit Assignment' : 'Assign Student to Category'} onClose={onClose} onSave={() => void save()} saving={saving} error={error}>
      <div className="space-y-3">
        <Field label="Student *">
          <select value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} className="w-full border rounded-lg p-2 text-sm" disabled={!!initial}>
            <option value="">Select student...</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.fullName} — {s.classSection} ({s.admissionNumber})</option>)}
          </select>
        </Field>
        <Field label="Category *">
          <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="w-full border rounded-lg p-2 text-sm">
            <option value="">Select category...</option>
            {categories.filter((c) => c.status === 'ACTIVE').map((c) => (
              <option key={c.id} value={c.id}>{c.icon} {c.categoryGroupLabel} — {c.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Details">
          <input value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} className="w-full border rounded-lg p-2 text-sm" placeholder="Student Categories item..." />
        </Field>
        <Field label="Status">
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full border rounded-lg p-2 text-sm">
            {ASSIGNMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
      </div>
    </ModalShell>
  );
}

function ModalShell({
  title, children, onClose, onSave, saving, error,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
  error: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="font-bold text-slate-800">{title}</h3>
          <button type="button" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
          {children}
        </div>
        <div className="p-4 border-t flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
          <button type="button" disabled={saving} onClick={onSave} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2">
            {saving && <Loader2 size={14} className="animate-spin" />} Save
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-xs font-bold text-slate-600 mb-1">{label}</label>
      {children}
    </div>
  );
}
