import { useCallback, useEffect, useState } from 'react';
import {
  Package, RefreshCw, Search, Plus, Download, Edit3, Trash2,
  Barcode, CheckCircle2, AlertTriangle, Box,
} from 'lucide-react';
import {
  fetchItemsManagement,
  fetchItemDetail,
  previewItemSku,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  approveInventoryItem,
  requestNewInventoryItem,
  exportItemMaster,
  type ItemsManagement,
  type ItemDetail,
} from '../../../lib/inventoryServices';
import { AcademicLoading, AcademicModal, FeeMessage, FeeTabs } from '../FeeFinanceManagement/FeeFinanceUi';

const STOCK_STYLE: Record<string, string> = {
  IN_STOCK: 'bg-green-50 text-green-700 border-green-200',
  LOW_STOCK: 'bg-amber-50 text-amber-700 border-amber-200',
  OUT_OF_STOCK: 'bg-red-50 text-red-700 border-red-200',
};

const TYPE_STYLE: Record<string, string> = {
  ASSET: 'bg-purple-50 text-purple-700',
  CONSUMABLE: 'bg-blue-50 text-blue-700',
  SERVICE: 'bg-slate-50 text-slate-700',
};

const FORM_TABS = ['General Info', 'Purchasing', 'Inventory', 'Attributes'] as const;

const emptyForm = () => ({
  itemName: '',
  brand: '',
  categoryId: '',
  storeId: '',
  itemType: 'CONSUMABLE',
  unit: 'Pcs',
  unitId: '',
  itemCode: '',
  autoSku: true,
  valuationMethod: 'WAC',
  reorderLevel: 10,
  minLevel: 5,
  maxLevel: 1000,
  weightedAvgCost: 0,
  taxRate: 0,
  description: '',
  defaultSupplierId: '',
  color: '',
  size: '',
  customFieldLabel: '',
  customFieldValue: '',
});

export function ItemsProductsView() {
  const [data, setData] = useState<ItemsManagement | null>(null);
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [storeFilter, setStoreFilter] = useState('ALL');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [formOpen, setFormOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ItemDetail | null>(null);
  const [formTab, setFormTab] = useState<string>('General Info');
  const [form, setForm] = useState(emptyForm());
  const [requestForm, setRequestForm] = useState({ itemName: '', brand: '', categoryId: '', itemType: 'CONSUMABLE', unit: 'Pcs', notes: '' });

  const load = useCallback(async (seed = false) => {
    setLoading(true);
    try {
      const result = await fetchItemsManagement(seed, academicYear, {
        q: search || undefined,
        categoryId: categoryFilter !== 'ALL' ? categoryFilter : undefined,
        itemType: typeFilter !== 'ALL' ? typeFilter : undefined,
        storeId: storeFilter !== 'ALL' ? storeFilter : undefined,
      });
      setData(result);
      setForm((f) => ({
        ...f,
        categoryId: f.categoryId || result.categories[0]?.id || '',
        storeId: f.storeId || result.stores[0]?.id || '',
        unitId: f.unitId || result.units[0]?.id || '',
      }));
      setRequestForm((r) => ({ ...r, categoryId: r.categoryId || result.categories[0]?.id || '' }));
    } finally {
      setLoading(false);
    }
  }, [academicYear, search, categoryFilter, typeFilter, storeFilter]);

  useEffect(() => { void load(true); }, [load]);

  const flash = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 6000);
  };

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm());
    setFormTab('General Info');
    setForm((f) => ({
      ...emptyForm(),
      categoryId: data?.categories[0]?.id ?? '',
      storeId: data?.stores[0]?.id ?? '',
      unitId: data?.units[0]?.id ?? '',
      unit: data?.units[0]?.name ?? 'Pcs',
    }));
    setFormOpen(true);
  };

  const openEdit = async (id: string) => {
    try {
      const d = await fetchItemDetail(id);
      setDetail(d);
      setEditId(id);
      setForm({
        itemName: d.name,
        brand: d.brand === '—' ? '' : d.brand,
        categoryId: d.categoryId,
        storeId: d.storeId,
        itemType: d.itemType,
        unit: d.baseUnit,
        unitId: d.unitId ?? '',
        itemCode: d.sku,
        autoSku: false,
        valuationMethod: d.valuationMethod,
        reorderLevel: d.reorderLevel,
        minLevel: d.minLevel,
        maxLevel: d.maxLevel,
        weightedAvgCost: d.weightedAvgCost,
        taxRate: d.taxRate,
        description: d.description,
        defaultSupplierId: d.defaultSupplierId ?? '',
        color: d.color,
        size: d.size,
        customFieldLabel: d.customFields[0]?.label ?? '',
        customFieldValue: d.customFields[0]?.value ?? '',
      });
      setFormTab('General Info');
      setFormOpen(true);
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Failed to load item', 'error');
    }
  };

  const onCategoryChange = async (categoryId: string) => {
    setForm((f) => ({ ...f, categoryId }));
    if (form.autoSku && !editId) {
      try {
        const { sku } = await previewItemSku(categoryId);
        setForm((f) => ({ ...f, categoryId, itemCode: sku }));
      } catch { /* ignore */ }
    }
  };

  const handleSave = async () => {
    if (!form.itemName || !form.categoryId || !form.storeId) {
      flash('Name, category, and store are required', 'error');
      return;
    }
    try {
      const payload = {
        ...form,
        academicYear,
        performedBy: 'Inventory Manager',
        customFields: form.customFieldLabel
          ? [{ key: form.customFieldLabel.toLowerCase().replace(/\s/g, '_'), label: form.customFieldLabel, value: form.customFieldValue }]
          : [],
        itemCode: form.autoSku ? undefined : form.itemCode,
      };
      if (editId) {
        const r = await updateInventoryItem(editId, payload);
        flash(r.message, 'success');
      } else {
        const r = await createInventoryItem(payload);
        flash(r.message, 'success');
      }
      setFormOpen(false);
      await load();
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Save failed', 'error');
    }
  };

  const handleDelete = async (id: string, sku: string) => {
    if (!confirm(`Delete item ${sku}?`)) return;
    try {
      const r = await deleteInventoryItem(id);
      flash(r.message, 'success');
      await load();
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Delete failed', 'error');
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const r = await approveInventoryItem(id);
      flash(r.message, 'success');
      await load();
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Approve failed', 'error');
    }
  };

  const handleRequest = async () => {
    if (!requestForm.itemName || !requestForm.categoryId) {
      flash('Name and category required', 'error');
      return;
    }
    try {
      const r = await requestNewInventoryItem({ ...requestForm, academicYear });
      flash(r.message, 'success');
      setRequestOpen(false);
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Request failed', 'error');
    }
  };

  if (loading && !data) return <AcademicLoading />;

  const perms = data?.permissions;

  return (
    <div className="flex flex-col h-full gap-4">
      <FeeMessage message={message} type={messageType} />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Items / Products</h2>
          <p className="text-xs text-slate-500">
            Master catalog — {data?.totalItems.toLocaleString('en-IN')} items
            {data?.pendingRequests ? ` · ${data.pendingRequests} pending requests` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className="text-xs border rounded-lg px-2 py-1.5">
            {(data?.academicYears ?? ['2025-26']).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <div className="relative">
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search SKU, name, barcode..." className="text-xs border rounded-lg pl-7 pr-2 py-1.5 w-44" />
          </div>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="text-xs border rounded-lg px-2 py-1.5">
            <option value="ALL">All Categories</option>
            {(data?.categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="text-xs border rounded-lg px-2 py-1.5">
            <option value="ALL">All Types</option>
            {(data?.itemTypes ?? []).map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select value={storeFilter} onChange={(e) => setStoreFilter(e.target.value)} className="text-xs border rounded-lg px-2 py-1.5">
            <option value="ALL">All Stores</option>
            {(data?.stores ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button type="button" onClick={() => void load()} className="p-2 border rounded-lg"><RefreshCw size={14} /></button>
          <button type="button" onClick={() => void exportItemMaster(academicYear).then((r) => flash(r.message, 'success'))} className="px-3 py-1.5 text-xs border rounded-lg flex items-center gap-1">
            <Download size={12} /> Export
          </button>
          {perms?.canRequest && (
            <button type="button" onClick={() => setRequestOpen(true)} className="px-3 py-1.5 text-xs border border-blue-300 text-blue-700 rounded-lg">Request Item</button>
          )}
          {perms?.canCreate && (
            <button type="button" onClick={openCreate} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg flex items-center gap-1">
              <Plus size={12} /> Add Item
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-[9px]">
        {(data?.typeBreakdown ?? []).map((t) => (
          <div key={t.type} className={`rounded-lg p-2 border ${TYPE_STYLE[t.type] ?? 'bg-slate-50'}`}>
            <p className="font-bold text-lg">{t.count}</p>
            <span>{t.type}</span>
          </div>
        ))}
      </div>

      <div className="bg-white border rounded-xl shadow-sm overflow-hidden flex-1">
        <div className="overflow-auto max-h-[60vh]">
          <table className="w-full text-[10px] text-left">
            <thead className="bg-slate-50 sticky top-0">
              <tr className="text-slate-500 border-b">
                <th className="p-2 w-10" />
                <th className="p-2">SKU</th>
                <th>Name / Brand</th>
                <th>Category</th>
                <th>Type</th>
                <th>Base Unit</th>
                <th>Current Stock</th>
                <th>Value</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(data?.items ?? []).map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="p-2">
                    <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center">
                      {item.thumbnailUrl ? <img src={item.thumbnailUrl} alt="" className="w-8 h-8 rounded object-cover" /> : <Package size={14} className="text-slate-400" />}
                    </div>
                  </td>
                  <td className="p-2">
                    <p className="font-mono font-bold text-blue-600">{item.sku}</p>
                    <p className="text-[8px] text-slate-400 flex items-center gap-0.5"><Barcode size={8} />{item.barcode || '—'}</p>
                  </td>
                  <td>
                    <p className="font-bold">{item.name}</p>
                    <p className="text-slate-500">{item.brand}</p>
                    <p className="text-[8px] text-slate-400">{item.store}</p>
                  </td>
                  <td>{item.category}</td>
                  <td><span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${TYPE_STYLE[item.itemType] ?? ''}`}>{item.itemTypeLabel}</span></td>
                  <td>{item.baseUnit}</td>
                  <td className="font-bold">{item.stockLabel}</td>
                  <td>{item.stockValue}</td>
                  <td>
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${STOCK_STYLE[item.stockStatus] ?? ''}`}>{item.stockStatus.replace(/_/g, ' ')}</span>
                    {item.approvalStatus === 'PENDING' && (
                      <span className="block text-[8px] text-amber-600 mt-0.5">Pending Approval</span>
                    )}
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {perms?.canEdit && (
                        <button type="button" onClick={() => void openEdit(item.id)} className="text-[8px] border px-1.5 py-0.5 rounded flex items-center gap-0.5">
                          <Edit3 size={9} /> Edit
                        </button>
                      )}
                      {item.approvalStatus === 'PENDING' && perms?.canApprove && (
                        <button type="button" onClick={() => void handleApprove(item.id)} className="text-[8px] bg-green-600 text-white px-1.5 py-0.5 rounded flex items-center gap-0.5">
                          <CheckCircle2 size={9} /> Approve
                        </button>
                      )}
                      {perms?.canDelete && (
                        <button type="button" onClick={() => void handleDelete(item.id, item.sku)} className="text-[8px] text-red-600 border border-red-200 px-1.5 py-0.5 rounded">
                          <Trash2 size={9} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {(data?.items ?? []).length === 0 && (
                <tr><td colSpan={10} className="p-12 text-center text-slate-400">No items found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-slate-50 border rounded-lg p-3 text-[9px] text-slate-600">
        <p className="font-bold mb-1">Automation & Rules</p>
        <ul className="space-y-0.5">
          {(data?.automationRules ?? []).map((r, i) => <li key={i}>• {r}</li>)}
        </ul>
      </div>

      <AcademicModal open={formOpen} onClose={() => setFormOpen(false)} title={editId ? 'Edit Item' : 'Add New Item'} wide>
        <FeeTabs tabs={[...FORM_TABS]} active={formTab} onChange={setFormTab} />
        <div className="mt-4 space-y-3 text-sm">
          {formTab === 'General Info' && (
            <>
              <input value={form.itemName} onChange={(e) => setForm((f) => ({ ...f, itemName: e.target.value }))} placeholder="Item Name *" className="w-full border rounded px-2 py-1.5 text-xs" />
              <input value={form.brand} onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))} placeholder="Brand" className="w-full border rounded px-2 py-1.5 text-xs" />
              <div className="grid grid-cols-2 gap-2">
                <select value={form.categoryId} onChange={(e) => void onCategoryChange(e.target.value)} className="border rounded px-2 py-1.5 text-xs">
                  {(data?.categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select value={form.storeId} onChange={(e) => setForm((f) => ({ ...f, storeId: e.target.value }))} className="border rounded px-2 py-1.5 text-xs">
                  {(data?.stores ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select value={form.itemType} onChange={(e) => setForm((f) => ({ ...f, itemType: e.target.value }))} className="border rounded px-2 py-1.5 text-xs">
                  {(data?.itemTypes ?? []).map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <select value={form.unitId} onChange={(e) => {
                  const u = data?.units.find((x) => x.id === e.target.value);
                  setForm((f) => ({ ...f, unitId: e.target.value, unit: u?.name ?? f.unit }));
                }} className="border rounded px-2 py-1.5 text-xs">
                  {(data?.units ?? []).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs flex items-center gap-1">
                  <input type="checkbox" checked={form.autoSku} onChange={(e) => setForm((f) => ({ ...f, autoSku: e.target.checked }))} />
                  Auto-generate SKU
                </label>
                {!form.autoSku && (
                  <input value={form.itemCode} onChange={(e) => setForm((f) => ({ ...f, itemCode: e.target.value }))} placeholder="Manual SKU" className="flex-1 border rounded px-2 py-1 text-xs" />
                )}
                {form.autoSku && form.itemCode && (
                  <span className="text-xs font-mono text-blue-600">{form.itemCode}</span>
                )}
              </div>
              <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Description" rows={2} className="w-full border rounded px-2 py-1.5 text-xs" />
            </>
          )}
          {formTab === 'Purchasing' && (
            <>
              <select value={form.defaultSupplierId} onChange={(e) => setForm((f) => ({ ...f, defaultSupplierId: e.target.value }))} className="w-full border rounded px-2 py-1.5 text-xs">
                <option value="">Default Vendor (optional)</option>
                {(data?.suppliers ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <input type="number" value={form.weightedAvgCost} onChange={(e) => setForm((f) => ({ ...f, weightedAvgCost: Number(e.target.value) }))} placeholder="Unit Cost (₹)" className="border rounded px-2 py-1.5 text-xs" />
                <input type="number" value={form.taxRate} onChange={(e) => setForm((f) => ({ ...f, taxRate: Number(e.target.value) }))} placeholder="Tax Rate %" className="border rounded px-2 py-1.5 text-xs" />
              </div>
            </>
          )}
          {formTab === 'Inventory' && (
            <>
              <select value={form.valuationMethod} onChange={(e) => setForm((f) => ({ ...f, valuationMethod: e.target.value }))} className="w-full border rounded px-2 py-1.5 text-xs">
                {(data?.valuationMethods ?? []).map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
              </select>
              <div className="grid grid-cols-3 gap-2">
                <input type="number" value={form.minLevel} onChange={(e) => setForm((f) => ({ ...f, minLevel: Number(e.target.value) }))} placeholder="Min Level" className="border rounded px-2 py-1.5 text-xs" />
                <input type="number" value={form.reorderLevel} onChange={(e) => setForm((f) => ({ ...f, reorderLevel: Number(e.target.value) }))} placeholder="Reorder Level" className="border rounded px-2 py-1.5 text-xs" />
                <input type="number" value={form.maxLevel} onChange={(e) => setForm((f) => ({ ...f, maxLevel: Number(e.target.value) }))} placeholder="Max Level" className="border rounded px-2 py-1.5 text-xs" />
              </div>
              {detail?.hasTransactions && (
                <p className="text-[10px] text-amber-600 flex items-center gap-1"><AlertTriangle size={12} /> Base unit locked — transaction history exists</p>
              )}
            </>
          )}
          {formTab === 'Attributes' && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <input value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} placeholder="Color (e.g. Navy)" className="border rounded px-2 py-1.5 text-xs" />
                <input value={form.size} onChange={(e) => setForm((f) => ({ ...f, size: e.target.value }))} placeholder="Size (e.g. M, XL)" className="border rounded px-2 py-1.5 text-xs" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input value={form.customFieldLabel} onChange={(e) => setForm((f) => ({ ...f, customFieldLabel: e.target.value }))} placeholder="Custom Field Label" className="border rounded px-2 py-1.5 text-xs" />
                <input value={form.customFieldValue} onChange={(e) => setForm((f) => ({ ...f, customFieldValue: e.target.value }))} placeholder="Custom Field Value" className="border rounded px-2 py-1.5 text-xs" />
              </div>
            </>
          )}
          <button type="button" onClick={() => void handleSave()} className="w-full bg-blue-600 text-white py-2 rounded-lg text-xs font-bold">
            {editId ? 'Update Item' : 'Save to Master Catalog'}
          </button>
        </div>
      </AcademicModal>

      <AcademicModal open={requestOpen} onClose={() => setRequestOpen(false)} title="Request New Item">
        <div className="space-y-3 text-sm">
          <input value={requestForm.itemName} onChange={(e) => setRequestForm((f) => ({ ...f, itemName: e.target.value }))} placeholder="Item Name *" className="w-full border rounded px-2 py-1.5 text-xs" />
          <input value={requestForm.brand} onChange={(e) => setRequestForm((f) => ({ ...f, brand: e.target.value }))} placeholder="Brand" className="w-full border rounded px-2 py-1.5 text-xs" />
          <select value={requestForm.categoryId} onChange={(e) => setRequestForm((f) => ({ ...f, categoryId: e.target.value }))} className="w-full border rounded px-2 py-1.5 text-xs">
            {(data?.categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <textarea value={requestForm.notes} onChange={(e) => setRequestForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Notes for Inventory Manager" rows={2} className="w-full border rounded px-2 py-1.5 text-xs" />
          <button type="button" onClick={() => void handleRequest()} className="w-full bg-blue-600 text-white py-2 rounded-lg text-xs font-bold">Submit Request</button>
        </div>
      </AcademicModal>
    </div>
  );
}
