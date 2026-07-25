import { useCallback, useEffect, useState } from 'react';
import {
  FolderTree, Plus, RefreshCw, GripVertical, ChevronRight, ChevronDown,
  Ruler, Trash2, Edit2, ArrowLeftRight, Layers,
} from 'lucide-react';
import {
  fetchCategoriesUnits,
  suggestInvCategoryCode,
  createInvCategory,
  updateInvCategory,
  deleteInvCategory,
  moveInvCategory,
  createInvUnit,
  updateInvUnit,
  deleteInvUnit,
  createInvUnitConversion,
  updateInvUnitConversion,
  deleteInvUnitConversion,
  type CategoriesUnits,
  type InvCategoryNode,
} from '../../../lib/inventoryServices';
import { AcademicLoading, AcademicModal, FeeMessage } from '../FeeFinanceManagement/FeeFinanceUi';

type CategoryForm = {
  id?: string;
  categoryCode: string;
  categoryName: string;
  parentId?: string;
  baseUnit: string;
  ledgerCode: string;
  description: string;
  color: string;
  skuPrefix: string;
};

type UnitForm = { id?: string; unitCode: string; unitName: string; isBase: boolean };
type ConversionForm = { baseUnitId: string; alternateUnitId: string; conversionFactor: number };

const emptyCategory = (parentId?: string): CategoryForm => ({
  categoryCode: '',
  categoryName: '',
  parentId: parentId || undefined,
  baseUnit: 'Pcs',
  ledgerCode: '',
  description: '',
  color: '#3b82f6',
  skuPrefix: '',
});

const emptyUnit = (isBase = true): UnitForm => ({ unitCode: '', unitName: '', isBase });
const emptyConversion = (): ConversionForm => ({ baseUnitId: '', alternateUnitId: '', conversionFactor: 1 });

function flattenTree(nodes: InvCategoryNode[], depth = 0): Array<InvCategoryNode & { depth: number }> {
  const out: Array<InvCategoryNode & { depth: number }> = [];
  for (const n of nodes) {
    out.push({ ...n, depth });
    out.push(...flattenTree(n.children, depth + 1));
  }
  return out;
}

function CategoryTreeNode({
  node, depth, expanded, selectedId, dragOverId,
  onToggle, onSelect, onEdit, onDelete, onAddChild,
  onDragStart, onDragOver, onDragLeave, onDrop,
}: {
  node: InvCategoryNode;
  depth: number;
  expanded: Set<string>;
  selectedId: string | null;
  dragOverId: string | null;
  onToggle: (id: string) => void;
  onSelect: (node: InvCategoryNode) => void;
  onEdit: (node: InvCategoryNode) => void;
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
          isSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-slate-50 border border-transparent'
        } ${isDragOver ? 'ring-2 ring-blue-400 bg-blue-50' : ''}`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => onSelect(node)}
      >
        <GripVertical size={12} className="text-slate-300 shrink-0 cursor-grab" />
        {hasChildren ? (
          <button type="button" onClick={(e) => { e.stopPropagation(); onToggle(node.id); }} className="p-0.5 text-slate-400">
            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : <span className="w-5" />}
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: node.color }} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-800 truncate">{node.categoryName}</p>
          <p className="text-[10px] text-slate-500">{node.categoryCode} · {node.baseUnit}{node.ledgerCode ? ` · ${node.ledgerCode}` : ''}</p>
        </div>
        <span className="text-[10px] text-slate-400">{node.itemCount} items</span>
        <div className="hidden group-hover:flex items-center gap-0.5">
          <button type="button" onClick={(e) => { e.stopPropagation(); onAddChild(node.id); }} className="p-1 text-slate-400 hover:text-blue-600" title="Add child">
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

export function CategoriesUnitsView() {
  const [data, setData] = useState<CategoriesUnits | null>(null);
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<InvCategoryNode | null>(null);
  const [categoryModal, setCategoryModal] = useState(false);
  const [categoryForm, setCategoryForm] = useState<CategoryForm>(emptyCategory());
  const [unitModal, setUnitModal] = useState(false);
  const [unitForm, setUnitForm] = useState<UnitForm>(emptyUnit());
  const [conversionModal, setConversionModal] = useState(false);
  const [conversionForm, setConversionForm] = useState<ConversionForm>(emptyConversion());
  const [editConversionId, setEditConversionId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const load = useCallback(async (seed = false) => {
    setLoading(true);
    try {
      const result = await fetchCategoriesUnits(seed, academicYear);
      setData(result);
      if (result.tree.length && expanded.size === 0) {
        setExpanded(new Set(result.tree.map((t) => t.id)));
      }
    } finally {
      setLoading(false);
    }
  }, [academicYear, expanded.size]);

  useEffect(() => { void load(); }, [academicYear]);

  const flash = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 6000);
  };

  const reload = async () => {
    const result = await fetchCategoriesUnits(false, academicYear);
    setData(result);
    return result;
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openCreateCategory = (parentId?: string) => {
    setCategoryForm(emptyCategory(parentId));
    setCategoryModal(true);
  };

  const openEditCategory = (node: InvCategoryNode) => {
    setCategoryForm({
      id: node.id,
      categoryCode: node.categoryCode,
      categoryName: node.categoryName,
      parentId: node.parentId ?? undefined,
      baseUnit: node.baseUnit,
      ledgerCode: node.ledgerCode,
      description: node.description,
      color: node.color,
      skuPrefix: node.skuPrefix,
    });
    setCategoryModal(true);
  };

  const handleCategoryNameBlur = async () => {
    if (categoryForm.id || !categoryForm.categoryName.trim()) return;
    try {
      const { categoryCode, skuPrefix } = await suggestInvCategoryCode(
        categoryForm.categoryName,
        categoryForm.parentId,
      );
      setCategoryForm((f) => ({ ...f, categoryCode, skuPrefix }));
    } catch { /* ignore */ }
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.categoryName.trim() || !categoryForm.baseUnit.trim()) {
      flash('Category name and base unit are required', 'error');
      return;
    }
    setSaving(true);
    try {
      if (categoryForm.id) {
        const { id, categoryCode, ...rest } = categoryForm;
        await updateInvCategory(id, { ...rest, academicYear });
        flash('Category updated', 'success');
      } else {
        await createInvCategory({ ...categoryForm, academicYear });
        flash('Category created', 'success');
      }
      setCategoryModal(false);
      await reload();
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm('Delete this category? Items must be unassigned first.')) return;
    try {
      await deleteInvCategory(id);
      if (selected?.id === id) setSelected(null);
      await reload();
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

    const isDesc = (parentId: string, childId: string): boolean => {
      const child = flat.find((n) => n.id === childId);
      if (!child?.parentId) return false;
      if (child.parentId === parentId) return true;
      return isDesc(parentId, child.parentId);
    };
    if (isDesc(dragId, targetId)) {
      flash('Cannot move a category into its own descendant', 'error');
      setDragId(null);
      return;
    }

    try {
      const result = await moveInvCategory(dragId, targetId, target.sortOrder + 1);
      setData(result);
      flash(`Moved "${dragged.categoryName}" under "${target.categoryName}"`, 'success');
    } catch (err) {
      flash(err instanceof Error ? err.message : 'Move failed', 'error');
    }
    setDragId(null);
  };

  const handleDropRoot = async (e: React.DragEvent) => {
    e.preventDefault();
    if (!dragId) return;
    try {
      const result = await moveInvCategory(dragId, null, 0);
      setData(result);
      flash('Moved to root level', 'success');
    } catch (err) {
      flash(err instanceof Error ? err.message : 'Move failed', 'error');
    }
    setDragId(null);
  };

  const openCreateUnit = (isBase = true) => {
    setUnitForm(emptyUnit(isBase));
    setUnitModal(true);
  };

  const openEditUnit = (u: CategoriesUnits['units'][0]) => {
    setUnitForm({ id: u.id, unitCode: u.code, unitName: u.name, isBase: u.isBase });
    setUnitModal(true);
  };

  const handleSaveUnit = async () => {
    if (!unitForm.unitName.trim()) {
      flash('Unit name is required', 'error');
      return;
    }
    setSaving(true);
    try {
      if (unitForm.id) {
        await updateInvUnit(unitForm.id, { unitName: unitForm.unitName, isBase: unitForm.isBase });
        flash('Unit updated', 'success');
      } else {
        await createInvUnit({ ...unitForm, academicYear });
        flash('Unit created', 'success');
      }
      setUnitModal(false);
      await reload();
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUnit = async (id: string) => {
    if (!window.confirm('Delete this unit?')) return;
    try {
      await deleteInvUnit(id);
      await reload();
      flash('Unit deleted', 'success');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Delete failed', 'error');
    }
  };

  const openCreateConversion = () => {
    setEditConversionId(null);
    setConversionForm({
      ...emptyConversion(),
      baseUnitId: data?.baseUnits[0]?.id ?? '',
      alternateUnitId: data?.alternateUnits[0]?.id ?? '',
      conversionFactor: 50,
    });
    setConversionModal(true);
  };

  const openEditConversion = (c: CategoriesUnits['conversions'][0]) => {
    setEditConversionId(c.id);
    setConversionForm({
      baseUnitId: c.baseUnitId,
      alternateUnitId: c.alternateUnitId,
      conversionFactor: c.conversionFactor,
    });
    setConversionModal(true);
  };

  const handleSaveConversion = async () => {
    if (!conversionForm.baseUnitId || !conversionForm.alternateUnitId) {
      flash('Select base and alternate units', 'error');
      return;
    }
    setSaving(true);
    try {
      if (editConversionId) {
        await updateInvUnitConversion(editConversionId, conversionForm.conversionFactor);
        flash('Conversion updated', 'success');
      } else {
        await createInvUnitConversion({ ...conversionForm, academicYear });
        flash('Conversion added', 'success');
      }
      setConversionModal(false);
      await reload();
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConversion = async (id: string) => {
    if (!window.confirm('Remove this conversion?')) return;
    try {
      await deleteInvUnitConversion(id);
      await reload();
      flash('Conversion removed', 'success');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Delete failed', 'error');
    }
  };

  if (loading && !data) return <AcademicLoading />;

  const perms = data?.permissions;

  return (
    <div className="flex flex-col h-full gap-4">
      <FeeMessage message={message} type={messageType} />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Categories & Units</h2>
          <p className="text-xs text-slate-500">
            Hierarchical taxonomy & UOM conversion matrix — {data?.totalCategories} categories · {data?.totalUnits} units · {data?.totalConversions} conversions
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className="text-xs border rounded-lg px-2 py-1.5">
            {(data?.academicYears ?? ['2025-26']).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <button type="button" onClick={() => void load()} className="p-2 border rounded-lg"><RefreshCw size={14} /></button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center text-[9px]">
        {[
          { label: 'Categories', value: data?.totalCategories ?? 0, icon: <FolderTree size={14} /> },
          { label: 'Base Units', value: data?.baseUnits.length ?? 0, icon: <Ruler size={14} /> },
          { label: 'Alternate Units', value: data?.alternateUnits.length ?? 0, icon: <Layers size={14} /> },
          { label: 'Conversions', value: data?.totalConversions ?? 0, icon: <ArrowLeftRight size={14} /> },
        ].map((k) => (
          <div key={k.label} className="bg-white border rounded-xl p-3 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">{k.icon}</div>
            <div className="text-left">
              <p className="text-[9px] text-slate-500">{k.label}</p>
              <p className="font-bold text-lg text-slate-900">{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4 flex-1 min-h-0">
        {/* Left: Category Tree */}
        <div className="bg-white border rounded-xl p-4 flex flex-col min-h-[480px]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <FolderTree size={16} className="text-blue-600" /> Category Hierarchy
            </h3>
            {perms?.canCreate && (
              <button type="button" onClick={() => openCreateCategory()} className="text-[10px] px-2 py-1 bg-blue-600 text-white rounded-lg flex items-center gap-1">
                <Plus size={10} /> Parent
              </button>
            )}
          </div>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDropRoot}
            className="mb-2 py-2 px-3 border border-dashed border-slate-200 rounded-lg text-[10px] text-slate-400 text-center hover:border-blue-300"
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
                onEdit={openEditCategory}
                onDelete={handleDeleteCategory}
                onAddChild={openCreateCategory}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragLeave={() => setDragOverId(null)}
                onDrop={handleDrop}
              />
            ))}
            {!data?.tree.length && (
              <p className="text-xs text-slate-400 text-center py-8">No categories — create a parent category</p>
            )}
          </div>
          {selected && (
            <div className="mt-3 p-3 bg-slate-50 rounded-lg text-[10px]">
              <p className="font-bold text-slate-800">{selected.categoryName}</p>
              <p className="text-slate-500">Ledger: {selected.ledgerCode || '—'} · SKU Prefix: {selected.skuPrefix}</p>
              <p className="text-slate-500">{selected.itemCount} items · {selected.childCount} children</p>
            </div>
          )}
        </div>

        {/* Right: UOM Grid */}
        <div className="bg-white border rounded-xl p-4 flex flex-col min-h-[480px]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Ruler size={16} className="text-blue-600" /> Units of Measure
            </h3>
            {perms?.canCreate && (
              <div className="flex gap-1">
                <button type="button" onClick={() => openCreateUnit(true)} className="text-[10px] px-2 py-1 border border-blue-300 text-blue-700 rounded-lg">+ Base</button>
                <button type="button" onClick={() => openCreateUnit(false)} className="text-[10px] px-2 py-1 border rounded-lg">+ Alternate</button>
                <button type="button" onClick={openCreateConversion} className="text-[10px] px-2 py-1 bg-blue-600 text-white rounded-lg flex items-center gap-1">
                  <ArrowLeftRight size={10} /> Conversion
                </button>
              </div>
            )}
          </div>

          <div className="overflow-auto flex-1">
            <table className="w-full text-[10px] text-left mb-4">
              <thead className="bg-slate-50 sticky top-0">
                <tr className="text-slate-500 border-b">
                  <th className="p-2">Code</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Items</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(data?.units ?? []).map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="p-2 font-mono font-bold">{u.code}</td>
                    <td>{u.name}</td>
                    <td>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${u.isBase ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                        {u.typeLabel}
                      </span>
                    </td>
                    <td>{u.itemCount}</td>
                    <td>
                      {perms?.canEdit && (
                        <div className="flex gap-1">
                          <button type="button" onClick={() => openEditUnit(u)} className="text-blue-600"><Edit2 size={10} /></button>
                          {perms.canDelete && (
                            <button type="button" onClick={() => void handleDeleteUnit(u.id)} className="text-red-600"><Trash2 size={10} /></button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h4 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1">
              <ArrowLeftRight size={12} /> Conversion Matrix
            </h4>
            <table className="w-full text-[10px] text-left">
              <thead className="bg-slate-50">
                <tr className="text-slate-500 border-b">
                  <th className="p-2">Alternate Unit</th>
                  <th className="p-2">Factor</th>
                  <th className="p-2">Base Unit</th>
                  <th className="p-2">Formula</th>
                  <th className="p-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(data?.conversions ?? []).map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="p-2 font-semibold">{c.alternateUnitName}</td>
                    <td className="p-2 font-bold text-blue-600">{c.conversionFactor}</td>
                    <td className="p-2">{c.baseUnitName}</td>
                    <td className="p-2 text-slate-500">{c.formula}</td>
                    <td>
                      {perms?.canEdit && (
                        <div className="flex gap-1">
                          <button type="button" onClick={() => openEditConversion(c)} className="text-blue-600"><Edit2 size={10} /></button>
                          {perms.canDelete && (
                            <button type="button" onClick={() => void handleDeleteConversion(c.id)} className="text-red-600"><Trash2 size={10} /></button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {!data?.conversions.length && (
                  <tr><td colSpan={5} className="p-6 text-center text-slate-400">No conversions — e.g. 1 Box = 50 Pcs</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3 text-[9px] text-slate-600">
        <div className="bg-slate-50 border rounded-lg p-3">
          <p className="font-bold mb-1">Workflow</p>
          <ul className="space-y-0.5">{(data?.workflow ?? []).map((w, i) => <li key={i}>• {w}</li>)}</ul>
        </div>
        <div className="bg-slate-50 border rounded-lg p-3">
          <p className="font-bold mb-1">Validation Rules</p>
          <ul className="space-y-0.5">{(data?.validationRules ?? []).map((r, i) => <li key={i}>• {r}</li>)}</ul>
        </div>
      </div>

      <AcademicModal open={categoryModal} onClose={() => setCategoryModal(false)} title={categoryForm.id ? 'Edit Category' : 'Create Category'} wide>
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <input value={categoryForm.categoryName} onChange={(e) => setCategoryForm((f) => ({ ...f, categoryName: e.target.value }))} onBlur={() => void handleCategoryNameBlur()} placeholder="Category Name *" className="border rounded px-2 py-1.5 text-xs" />
            <input value={categoryForm.categoryCode} onChange={(e) => setCategoryForm((f) => ({ ...f, categoryCode: e.target.value }))} disabled={!!categoryForm.id} placeholder="Category Code (auto-suggested)" className="border rounded px-2 py-1.5 text-xs font-mono" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input value={categoryForm.baseUnit} onChange={(e) => setCategoryForm((f) => ({ ...f, baseUnit: e.target.value }))} placeholder="Base Unit * (e.g. Pcs)" className="border rounded px-2 py-1.5 text-xs" />
            <input value={categoryForm.ledgerCode} onChange={(e) => setCategoryForm((f) => ({ ...f, ledgerCode: e.target.value }))} placeholder="Ledger Code" className="border rounded px-2 py-1.5 text-xs" />
          </div>
          <select value={categoryForm.parentId ?? ''} onChange={(e) => setCategoryForm((f) => ({ ...f, parentId: e.target.value || undefined }))} className="w-full border rounded px-2 py-1.5 text-xs">
            <option value="">— Root (no parent) —</option>
            {(data?.flatCategories ?? []).filter((c) => c.id !== categoryForm.id).map((c) => (
              <option key={c.id} value={c.id}>{c.categoryName} ({c.categoryCode})</option>
            ))}
          </select>
          <textarea value={categoryForm.description} onChange={(e) => setCategoryForm((f) => ({ ...f, description: e.target.value }))} placeholder="Description" rows={2} className="w-full border rounded px-2 py-1.5 text-xs" />
          <div className="grid grid-cols-2 gap-2">
            <input value={categoryForm.skuPrefix} onChange={(e) => setCategoryForm((f) => ({ ...f, skuPrefix: e.target.value }))} placeholder="SKU Prefix" className="border rounded px-2 py-1.5 text-xs" />
            <input type="color" value={categoryForm.color} onChange={(e) => setCategoryForm((f) => ({ ...f, color: e.target.value }))} className="w-full h-9 border rounded cursor-pointer" />
          </div>
          <button type="button" onClick={() => void handleSaveCategory()} disabled={saving} className="w-full bg-blue-600 text-white py-2 rounded-lg text-xs font-bold disabled:opacity-50">
            {saving ? 'Saving…' : categoryForm.id ? 'Update Category' : 'Create Category'}
          </button>
        </div>
      </AcademicModal>

      <AcademicModal open={unitModal} onClose={() => setUnitModal(false)} title={unitForm.id ? 'Edit Unit' : 'Create Unit'}>
        <div className="space-y-3 text-sm">
          <input value={unitForm.unitName} onChange={(e) => setUnitForm((f) => ({ ...f, unitName: e.target.value }))} placeholder="Unit Name * (e.g. Pieces)" className="w-full border rounded px-2 py-1.5 text-xs" />
          {!unitForm.id && (
            <input value={unitForm.unitCode} onChange={(e) => setUnitForm((f) => ({ ...f, unitCode: e.target.value }))} placeholder="Unit Code (auto if blank)" className="w-full border rounded px-2 py-1.5 text-xs font-mono" />
          )}
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={unitForm.isBase} onChange={(e) => setUnitForm((f) => ({ ...f, isBase: e.target.checked }))} />
            Base unit (smallest measure)
          </label>
          <button type="button" onClick={() => void handleSaveUnit()} disabled={saving} className="w-full bg-blue-600 text-white py-2 rounded-lg text-xs font-bold disabled:opacity-50">
            {saving ? 'Saving…' : unitForm.id ? 'Update Unit' : 'Create Unit'}
          </button>
        </div>
      </AcademicModal>

      <AcademicModal open={conversionModal} onClose={() => setConversionModal(false)} title={editConversionId ? 'Edit Conversion' : 'Add Conversion'}>
        <div className="space-y-3 text-sm">
          <select value={conversionForm.alternateUnitId} disabled={!!editConversionId} onChange={(e) => setConversionForm((f) => ({ ...f, alternateUnitId: e.target.value }))} className="w-full border rounded px-2 py-1.5 text-xs">
            <option value="">Alternate Unit</option>
            {(data?.alternateUnits ?? []).map((u) => <option key={u.id} value={u.id}>{u.name} ({u.code})</option>)}
          </select>
          <input type="number" min={0.0001} step="any" value={conversionForm.conversionFactor} onChange={(e) => setConversionForm((f) => ({ ...f, conversionFactor: Number(e.target.value) }))} placeholder="Conversion Factor" className="w-full border rounded px-2 py-1.5 text-xs" />
          <select value={conversionForm.baseUnitId} disabled={!!editConversionId} onChange={(e) => setConversionForm((f) => ({ ...f, baseUnitId: e.target.value }))} className="w-full border rounded px-2 py-1.5 text-xs">
            <option value="">Base Unit</option>
            {(data?.baseUnits ?? []).map((u) => <option key={u.id} value={u.id}>{u.name} ({u.code})</option>)}
          </select>
          <p className="text-[10px] text-slate-500">1 Alternate = Factor × Base (e.g. 1 Box = 50 Pcs)</p>
          <button type="button" onClick={() => void handleSaveConversion()} disabled={saving} className="w-full bg-blue-600 text-white py-2 rounded-lg text-xs font-bold disabled:opacity-50">
            {saving ? 'Saving…' : editConversionId ? 'Update Conversion' : 'Add Conversion'}
          </button>
        </div>
      </AcademicModal>
    </div>
  );
}
