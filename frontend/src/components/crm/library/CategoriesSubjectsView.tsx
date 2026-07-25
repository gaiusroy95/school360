import { useCallback, useEffect, useState } from 'react';
import {
  FolderTree, Plus, RefreshCw, GripVertical, ChevronRight, ChevronDown,
  BookOpen, Trash2, Edit2, Link2, Ban, BarChart3,
} from 'lucide-react';
import {
  fetchCategoriesSubjects,
  createLibraryCategory,
  updateLibraryCategory,
  deleteLibraryCategory,
  reorderLibraryCategory,
  createLibrarySubject,
  deleteLibrarySubject,
  type CategoriesSubjects,
  type LibCategoryNode,
  type CreateCategoryPayload,
} from '../../../lib/libraryServices';
import { AcademicLoading, AcademicModal, StatusBadge, FeeMessage } from '../FeeFinanceManagement/FeeFinanceUi';

type CategoryForm = CreateCategoryPayload & { id?: string };

const emptyCategory = (parentId?: string): CategoryForm => ({
  categoryCode: '',
  categoryName: '',
  parentId: parentId || undefined,
  description: '',
  ddcRangeStart: '',
  ddcRangeEnd: '',
  color: '#3b82f6',
  issuable: true,
});

const emptySubject = (categoryId: string) => ({
  categoryId,
  subjectCode: '',
  subjectName: '',
  academicSubjectId: '',
  description: '',
});

function flattenTree(nodes: LibCategoryNode[], depth = 0): Array<LibCategoryNode & { depth: number }> {
  const out: Array<LibCategoryNode & { depth: number }> = [];
  for (const n of nodes) {
    out.push({ ...n, depth });
    out.push(...flattenTree(n.children, depth + 1));
  }
  return out;
}

function CategoryTreeNode({
  node,
  depth,
  expanded,
  selectedId,
  dragOverId,
  onToggle,
  onSelect,
  onEdit,
  onDelete,
  onAddChild,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  node: LibCategoryNode;
  depth: number;
  expanded: Set<string>;
  selectedId: string | null;
  dragOverId: string | null;
  onToggle: (id: string) => void;
  onSelect: (node: LibCategoryNode) => void;
  onEdit: (node: LibCategoryNode) => void;
  onDelete: (id: string) => void;
  onAddChild: (parentId: string) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, targetId: string) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isOpen = expanded.has(node.id);
  const isSelected = selectedId === node.id;
  const isDragOver = dragOverId === node.id;

  return (
    <div>
      <div
        draggable
        onDragStart={(e) => onDragStart(e, node.id)}
        onDragOver={(e) => onDragOver(e, node.id)}
        onDragLeave={onDragLeave}
        onDrop={(e) => onDrop(e, node.id)}
        className={`flex items-center gap-1.5 py-1.5 px-2 rounded-lg cursor-pointer group transition-colors ${
          isSelected ? 'bg-purple-50 border border-purple-200' : 'hover:bg-slate-50 border border-transparent'
        } ${isDragOver ? 'ring-2 ring-purple-400 bg-purple-50' : ''}`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => onSelect(node)}
      >
        <GripVertical size={12} className="text-slate-300 shrink-0 cursor-grab" />
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggle(node.id); }}
            className="p-0.5 text-slate-400 hover:text-slate-600"
          >
            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : (
          <span className="w-5" />
        )}
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: node.color }} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-800 truncate">{node.categoryName}</p>
          <p className="text-[10px] text-slate-500">{node.categoryCode}{node.ddcRangeStart ? ` · DDC ${node.ddcRangeStart}${node.ddcRangeEnd ? `–${node.ddcRangeEnd}` : ''}` : ''}</p>
        </div>
        <span className="text-[10px] text-slate-400">{node.bookCount} books</span>
        {!node.issuable && <span title="Non-issuable"><Ban size={12} className="text-red-500 shrink-0" /></span>}
        <div className="hidden group-hover:flex items-center gap-0.5">
          <button type="button" onClick={(e) => { e.stopPropagation(); onAddChild(node.id); }} className="p-1 text-slate-400 hover:text-purple-600" title="Add sub-category">
            <Plus size={12} />
          </button>
          <button type="button" onClick={(e) => { e.stopPropagation(); onEdit(node); }} className="p-1 text-slate-400 hover:text-blue-600">
            <Edit2 size={12} />
          </button>
          <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(node.id); }} className="p-1 text-slate-400 hover:text-red-600">
            <Trash2 size={12} />
          </button>
        </div>
      </div>
      {hasChildren && isOpen && node.children.map((child) => (
        <CategoryTreeNode
          key={child.id}
          node={child}
          depth={depth + 1}
          expanded={expanded}
          selectedId={selectedId}
          dragOverId={dragOverId}
          onToggle={onToggle}
          onSelect={onSelect}
          onEdit={onEdit}
          onDelete={onDelete}
          onAddChild={onAddChild}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        />
      ))}
    </div>
  );
}

export function CategoriesSubjectsView() {
  const [data, setData] = useState<CategoriesSubjects | null>(null);
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<LibCategoryNode | null>(null);
  const [categoryModal, setCategoryModal] = useState(false);
  const [categoryForm, setCategoryForm] = useState<CategoryForm>(emptyCategory());
  const [subjectModal, setSubjectModal] = useState(false);
  const [subjectForm, setSubjectForm] = useState(emptySubject(''));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const load = useCallback(async (seed = false) => {
    setLoading(true);
    try {
      const result = await fetchCategoriesSubjects(seed, academicYear);
      setData(result);
      if (result.tree.length && expanded.size === 0) {
        setExpanded(new Set(result.tree.map((t) => t.id)));
      }
    } finally {
      setLoading(false);
    }
  }, [academicYear, expanded.size]);

  useEffect(() => { void load(true); }, [academicYear]);

  const flash = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 6000);
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openCreate = (parentId?: string) => {
    setCategoryForm(emptyCategory(parentId));
    setCategoryModal(true);
  };

  const openEdit = (node: LibCategoryNode) => {
    setCategoryForm({
      id: node.id,
      categoryCode: node.categoryCode,
      categoryName: node.categoryName,
      parentId: node.parentId ?? undefined,
      description: node.description,
      ddcRangeStart: node.ddcRangeStart,
      ddcRangeEnd: node.ddcRangeEnd,
      color: node.color,
      issuable: node.issuable,
      issueDaysOverride: node.issueDaysOverride ?? undefined,
      maxBooksOverride: node.maxBooksOverride ?? undefined,
    });
    setCategoryModal(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.categoryCode.trim() || !categoryForm.categoryName.trim()) {
      flash('Category code and name are required', 'error');
      return;
    }
    setSaving(true);
    try {
      if (categoryForm.id) {
        const { id, categoryCode, ...rest } = categoryForm;
        await updateLibraryCategory(id, rest);
        flash('Category updated', 'success');
      } else {
        await createLibraryCategory(categoryForm);
        flash('Category created', 'success');
      }
      setCategoryModal(false);
      const result = await fetchCategoriesSubjects(false, academicYear);
      setData(result);
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm('Delete this category? Books must be unassigned first.')) return;
    try {
      const result = await deleteLibraryCategory(id);
      setData(result);
      if (selected?.id === id) setSelected(null);
      flash('Category deleted', 'success');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Delete failed', 'error');
    }
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (dragId && dragId !== id) setDragOverId(id);
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDragOverId(null);
    if (!dragId || dragId === targetId) return;

    const flat = flattenTree(data?.tree ?? []);
    const dragged = flat.find((n) => n.id === dragId);
    const target = flat.find((n) => n.id === targetId);
    if (!dragged || !target) return;

    const isDescendant = (parentId: string, childId: string): boolean => {
      const child = flat.find((n) => n.id === childId);
      if (!child?.parentId) return false;
      if (child.parentId === parentId) return true;
      return isDescendant(parentId, child.parentId);
    };
    if (isDescendant(dragId, targetId)) {
      flash('Cannot move a category into its own descendant', 'error');
      setDragId(null);
      return;
    }

    try {
      const result = await reorderLibraryCategory(dragId, targetId, target.sortOrder + 1);
      setData(result);
      flash(`Moved "${dragged.categoryName}" under "${target.categoryName}"`, 'success');
    } catch (err) {
      flash(err instanceof Error ? err.message : 'Reorder failed', 'error');
    }
    setDragId(null);
  };

  const handleDropRoot = async (e: React.DragEvent) => {
    e.preventDefault();
    if (!dragId) return;
    try {
      const result = await reorderLibraryCategory(dragId, null, 0);
      setData(result);
      flash('Moved to root level', 'success');
    } catch (err) {
      flash(err instanceof Error ? err.message : 'Reorder failed', 'error');
    }
    setDragId(null);
  };

  const handleSaveSubject = async () => {
    if (!subjectForm.subjectCode.trim() || !subjectForm.subjectName.trim()) {
      flash('Subject code and name are required', 'error');
      return;
    }
    setSaving(true);
    try {
      const ac = data?.academicSubjects.find((s) => s.id === subjectForm.academicSubjectId);
      await createLibrarySubject({
        ...subjectForm,
        academicSubjectId: subjectForm.academicSubjectId || undefined,
        subjectName: ac?.name || subjectForm.subjectName,
        academicYear,
      });
      setSubjectModal(false);
      const result = await fetchCategoriesSubjects(false, academicYear);
      setData(result);
      flash('Academic subject mapped', 'success');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Mapping failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSubject = async (subjectId: string) => {
    if (!window.confirm('Remove this subject mapping?')) return;
    try {
      const result = await deleteLibrarySubject(subjectId);
      setData(result);
      flash('Subject mapping removed', 'success');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Delete failed', 'error');
    }
  };

  const handleAcademicPick = (academicSubjectId: string) => {
    const ac = data?.academicSubjects.find((s) => s.id === academicSubjectId);
    if (!ac) return;
    setSubjectForm((f) => ({
      ...f,
      academicSubjectId,
      subjectCode: `LIB-${ac.code}`.slice(0, 20),
      subjectName: ac.name,
    }));
  };

  if (loading && !data) return <AcademicLoading />;

  const totalBooks = data?.inventoryByCategory.reduce((s, c) => s + c.bookCount, 0) ?? 0;

  return (
    <div className="flex flex-col space-y-4 h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Categories & Subjects</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Hierarchical taxonomy (DDC + custom) · map to academic syllabus · circulation rules per category
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            className="text-xs border border-slate-200 rounded px-3 py-1.5"
          >
            <option value="2025-26">2025-26</option>
            <option value="2024-25">2024-25</option>
          </select>
          <button type="button" onClick={() => openCreate()} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-lg hover:bg-purple-700">
            <Plus size={14} /> Parent Category
          </button>
          <button type="button" onClick={() => void load()} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {message && <FeeMessage message={message} type={messageType} />}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Categories', value: data?.flatCategories.length ?? 0, icon: <FolderTree size={16} /> },
          { label: 'Books Catalogued', value: totalBooks, icon: <BookOpen size={16} /> },
          { label: 'Subject Mappings', value: flattenTree(data?.tree ?? []).reduce((s, n) => s + n.subjects.length, 0), icon: <Link2 size={16} /> },
          { label: 'Non-Issuable', value: data?.flatCategories.filter((c) => !c.issuable).length ?? 0, icon: <Ban size={16} /> },
        ].map((k) => (
          <div key={k.label} className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">{k.icon}</div>
            <div>
              <p className="text-[9px] text-slate-500">{k.label}</p>
              <p className="font-bold text-slate-900 text-lg">{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4 flex-1 min-h-0">
        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-xl p-4 flex flex-col min-h-[420px]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <FolderTree size={16} className="text-purple-600" /> Category Hierarchy
            </h3>
            <span className="text-[10px] text-slate-400">Drag to reparent</span>
          </div>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDropRoot}
            className="mb-2 py-2 px-3 border border-dashed border-slate-200 rounded-lg text-[10px] text-slate-400 text-center hover:border-purple-300 hover:bg-purple-50/50"
          >
            Drop here for root-level category
          </div>
          <div className="flex-1 overflow-y-auto space-y-0.5">
            {(data?.tree ?? []).map((node) => (
              <CategoryTreeNode
                key={node.id}
                node={node}
                depth={0}
                expanded={expanded}
                selectedId={selected?.id ?? null}
                dragOverId={dragOverId}
                onToggle={toggleExpand}
                onSelect={setSelected}
                onEdit={openEdit}
                onDelete={handleDeleteCategory}
                onAddChild={(pid) => openCreate(pid)}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragLeave={() => setDragOverId(null)}
                onDrop={handleDrop}
              />
            ))}
            {!data?.tree.length && (
              <p className="text-xs text-slate-400 text-center py-8">No categories yet — create a parent category to start</p>
            )}
          </div>
        </div>

        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-xl p-4 flex flex-col min-h-[420px]">
          <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
            <Link2 size={16} className="text-purple-600" /> Academic Subject Mapping
          </h3>
          {selected ? (
            <div className="flex-1 flex flex-col">
              <div className="mb-3 p-3 bg-slate-50 rounded-lg">
                <p className="text-xs font-semibold text-slate-800">{selected.categoryName}</p>
                <p className="text-[10px] text-slate-500">{selected.categoryCode} · {selected.bookCount} books assigned</p>
                {!selected.issuable && (
                  <p className="text-[10px] text-red-600 mt-1 flex items-center gap-1"><Ban size={10} /> Non-issuable (reference)</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => { setSubjectForm(emptySubject(selected.id)); setSubjectModal(true); }}
                className="mb-3 flex items-center justify-center gap-1.5 py-2 border border-purple-200 text-purple-700 text-xs font-semibold rounded-lg hover:bg-purple-50"
              >
                <Plus size={14} /> Map Academic Subject
              </button>
              <div className="flex-1 overflow-y-auto space-y-2">
                {selected.subjects.map((s) => (
                  <div key={s.id} className="flex items-start justify-between gap-2 p-2 border border-slate-100 rounded-lg">
                    <div>
                      <p className="text-xs font-semibold text-slate-800">{s.subjectName}</p>
                      <p className="text-[10px] text-slate-500">{s.subjectCode}</p>
                      {s.academicSubjectName && (
                        <p className="text-[10px] text-emerald-600 mt-0.5">Syllabus: {s.academicSubjectName}</p>
                      )}
                    </div>
                    <button type="button" onClick={() => void handleDeleteSubject(s.id)} className="p-1 text-slate-400 hover:text-red-600">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
                {!selected.subjects.length && (
                  <p className="text-xs text-slate-400 text-center py-4">No subjects mapped — link to academic syllabus for reading recommendations</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-12">Select a category to map academic subjects</p>
          )}
        </div>

        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <BarChart3 size={16} className="text-purple-600" /> Inventory by Category
            </h3>
            <div className="space-y-2">
              {(data?.inventoryByCategory ?? []).slice(0, 8).map((row) => (
                <div key={row.categoryId ?? row.categoryName} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: row.color }} />
                  <span className="text-xs text-slate-700 flex-1 truncate">{row.categoryName}</span>
                  <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${totalBooks ? (row.bookCount / totalBooks) * 100 : 0}%`,
                        backgroundColor: row.color,
                      }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-slate-800 w-8 text-right">{row.bookCount}</span>
                </div>
              ))}
              {!data?.inventoryByCategory.length && (
                <p className="text-xs text-slate-400">No books assigned to categories yet</p>
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-3">Feeds Library Dashboard &quot;Top Book Categories&quot; donut chart</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h3 className="text-sm font-bold text-slate-800 mb-3">Circulation Rules</h3>
            <p className="text-[10px] text-slate-500 mb-2">Books inherit issue rules from their assigned category</p>
            <div className="space-y-2">
              {(data?.circulationRules ?? []).map((r) => (
                <div key={r.category} className="flex items-center justify-between text-xs p-2 bg-slate-50 rounded-lg">
                  <span className="font-medium text-slate-700">{r.category}</span>
                  <StatusBadge status={r.issuable ? 'ACTIVE' : 'INACTIVE'} />
                </div>
              ))}
              {!data?.circulationRules.length && (
                <p className="text-xs text-slate-400">All categories use default circulation rules</p>
              )}
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 text-[10px] text-purple-800 space-y-1">
            <p className="font-semibold">ERP Integration</p>
            <p>{data?.erpIntegration}</p>
            <p className="text-purple-600 mt-1">Mobile OPAC: {data?.mobileSync.join(' · ')}</p>
          </div>
        </div>
      </div>

      <AcademicModal open={categoryModal} onClose={() => setCategoryModal(false)} title={categoryForm.id ? 'Edit Category' : 'Create Category'}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-600">Category Code *</span>
              <input
                value={categoryForm.categoryCode}
                onChange={(e) => setCategoryForm((f) => ({ ...f, categoryCode: e.target.value }))}
                disabled={!!categoryForm.id}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2"
                placeholder="e.g. SCI-PHY"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-600">Category Name *</span>
              <input
                value={categoryForm.categoryName}
                onChange={(e) => setCategoryForm((f) => ({ ...f, categoryName: e.target.value }))}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2"
                placeholder="e.g. Physics"
              />
            </label>
          </div>
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-slate-600">Parent Category</span>
            <select
              value={categoryForm.parentId ?? ''}
              onChange={(e) => setCategoryForm((f) => ({ ...f, parentId: e.target.value || undefined }))}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2"
            >
              <option value="">— Root (no parent) —</option>
              {data?.flatCategories
                .filter((c) => c.id !== categoryForm.id)
                .map((c) => (
                  <option key={c.id} value={c.id}>{c.categoryName} ({c.categoryCode})</option>
                ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-slate-600">Description</span>
            <textarea
              value={categoryForm.description ?? ''}
              onChange={(e) => setCategoryForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2"
            />
          </label>
          <div className="grid grid-cols-3 gap-3">
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-600">DDC Start</span>
              <input
                value={categoryForm.ddcRangeStart ?? ''}
                onChange={(e) => setCategoryForm((f) => ({ ...f, ddcRangeStart: e.target.value }))}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2"
                placeholder="530"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-600">DDC End</span>
              <input
                value={categoryForm.ddcRangeEnd ?? ''}
                onChange={(e) => setCategoryForm((f) => ({ ...f, ddcRangeEnd: e.target.value }))}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2"
                placeholder="539"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-600">Color</span>
              <input
                type="color"
                value={categoryForm.color ?? '#3b82f6'}
                onChange={(e) => setCategoryForm((f) => ({ ...f, color: e.target.value }))}
                className="w-full h-9 border border-slate-200 rounded-lg cursor-pointer"
              />
            </label>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={categoryForm.issuable ?? true}
                onChange={(e) => setCategoryForm((f) => ({ ...f, issuable: e.target.checked }))}
              />
              Issuable (uncheck for Reference / non-circulating)
            </label>
          </div>
          {categoryForm.issuable && (
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-600">Issue Days Override</span>
                <input
                  type="number"
                  value={categoryForm.issueDaysOverride ?? ''}
                  onChange={(e) => setCategoryForm((f) => ({ ...f, issueDaysOverride: e.target.value ? Number(e.target.value) : undefined }))}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2"
                  placeholder="Default"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-600">Max Books Override</span>
                <input
                  type="number"
                  value={categoryForm.maxBooksOverride ?? ''}
                  onChange={(e) => setCategoryForm((f) => ({ ...f, maxBooksOverride: e.target.value ? Number(e.target.value) : undefined }))}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2"
                  placeholder="Default"
                />
              </label>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setCategoryModal(false)} className="px-4 py-2 text-xs border border-slate-200 rounded-lg">Cancel</button>
            <button type="button" onClick={() => void handleSaveCategory()} disabled={saving} className="px-4 py-2 text-xs bg-purple-600 text-white rounded-lg font-semibold disabled:opacity-50">
              {saving ? 'Saving…' : categoryForm.id ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </AcademicModal>

      <AcademicModal open={subjectModal} onClose={() => setSubjectModal(false)} title="Map Academic Subject">
        <div className="space-y-3">
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-slate-600">Academic Syllabus Subject</span>
            <select
              value={subjectForm.academicSubjectId}
              onChange={(e) => handleAcademicPick(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2"
            >
              <option value="">— Select or enter manually —</option>
              {(data?.academicSubjects ?? []).map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.code}) — {s.group}</option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-600">Library Subject Code *</span>
              <input
                value={subjectForm.subjectCode}
                onChange={(e) => setSubjectForm((f) => ({ ...f, subjectCode: e.target.value }))}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-600">Subject Name *</span>
              <input
                value={subjectForm.subjectName}
                onChange={(e) => setSubjectForm((f) => ({ ...f, subjectName: e.target.value }))}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2"
              />
            </label>
          </div>
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-slate-600">Description</span>
            <textarea
              value={subjectForm.description}
              onChange={(e) => setSubjectForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2"
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setSubjectModal(false)} className="px-4 py-2 text-xs border border-slate-200 rounded-lg">Cancel</button>
            <button type="button" onClick={() => void handleSaveSubject()} disabled={saving} className="px-4 py-2 text-xs bg-purple-600 text-white rounded-lg font-semibold disabled:opacity-50">
              {saving ? 'Saving…' : 'Map Subject'}
            </button>
          </div>
        </div>
      </AcademicModal>
    </div>
  );
}
