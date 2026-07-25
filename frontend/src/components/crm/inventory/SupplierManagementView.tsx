import { useCallback, useEffect, useState } from 'react';
import {
  Building2, RefreshCw, Plus, Search, Star, CheckCircle2, XCircle,
  FileText, Trash2, Edit3, Upload, BarChart3,
} from 'lucide-react';
import {
  fetchSupplierManagement,
  fetchSupplierDetail,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  approveSupplier,
  rejectSupplier,
  addSupplierDocument,
  deleteSupplierDocument,
  type SupplierManagement,
  type SupplierDetail,
} from '../../../lib/inventoryServices';
import { AcademicLoading, AcademicModal, FeeMessage, FeeTabs } from '../FeeFinanceManagement/FeeFinanceUi';

const STATUS_STYLE: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
};

const DETAIL_TABS = ['Contact Details', 'Financials', 'Documents', 'Performance'] as const;

function StarRating({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} size={12} className={s <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'} />
      ))}
    </div>
  );
}

const emptyForm = () => ({
  supplierName: '',
  contactPerson: '',
  mobile: '',
  email: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  taxId: '',
  gstId: '',
  bankName: '',
  bankAccount: '',
  ifscCode: '',
  apLedgerAccount: '',
  onboardingNotes: '',
  categoryIds: [] as string[],
});

export function SupplierManagementView() {
  const [data, setData] = useState<SupplierManagement | null>(null);
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<SupplierDetail | null>(null);
  const [detailTab, setDetailTab] = useState<string>('Contact Details');
  const [form, setForm] = useState(emptyForm());
  const [docForm, setDocForm] = useState({ docType: 'GST', docName: '' });

  const load = useCallback(async (seed = false) => {
    setLoading(true);
    try {
      const result = await fetchSupplierManagement(seed, academicYear, {
        approvalStatus: statusFilter !== 'ALL' ? statusFilter : undefined,
        q: search || undefined,
      });
      setData(result);
    } finally {
      setLoading(false);
    }
  }, [academicYear, statusFilter, search]);

  useEffect(() => { void load(); }, [academicYear]);

  const flash = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(msg);
    setMessageType(type);
    if (type === 'success') void load();
    setTimeout(() => setMessage(''), 6000);
  };

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm());
    setFormOpen(true);
  };

  const openEdit = async (id: string) => {
    try {
      const d = await fetchSupplierDetail(id);
      setDetail(d);
      setEditId(id);
      setForm({
        supplierName: d.name,
        contactPerson: d.contactPerson === '—' ? '' : d.contactPerson,
        mobile: d.mobile === '—' ? '' : d.mobile,
        email: d.email === '—' ? '' : d.email,
        address: d.address,
        city: d.city === '—' ? '' : d.city,
        state: d.state,
        pincode: d.pincode,
        taxId: d.taxId === '—' ? '' : d.taxId,
        gstId: d.gstId === '—' ? '' : d.gstId,
        bankName: d.bankName,
        bankAccount: d.bankAccount,
        ifscCode: d.ifscCode,
        apLedgerAccount: d.apLedgerAccount === '—' ? '' : d.apLedgerAccount,
        onboardingNotes: d.onboardingNotes,
        categoryIds: d.categories.map((c) => c.id),
      });
      setFormOpen(true);
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Load failed', 'error');
    }
  };

  const openDetail = async (id: string) => {
    try {
      const d = await fetchSupplierDetail(id);
      setDetail(d);
      setDetailTab('Contact Details');
      setDetailOpen(true);
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Load failed', 'error');
    }
  };

  const handleSave = async () => {
    if (!form.supplierName.trim()) {
      flash('Supplier name is required', 'error');
      return;
    }
    try {
      const payload = { ...form, academicYear };
      if (editId) {
        await updateSupplier(editId, payload);
        flash('Supplier updated', 'success');
      } else {
        await createSupplier(payload);
        flash('Vendor onboarded — pending approval', 'success');
      }
      setFormOpen(false);
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Save failed', 'error');
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const r = await approveSupplier(id);
      flash(r.message, 'success');
      if (detailOpen) {
        const d = await fetchSupplierDetail(id);
        setDetail(d);
      }
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Approve failed', 'error');
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Rejection reason:');
    if (!reason) return;
    try {
      const r = await rejectSupplier(id, reason);
      flash(r.message, 'success');
      setDetailOpen(false);
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Reject failed', 'error');
    }
  };

  const handleUploadDoc = async () => {
    if (!detail || !docForm.docName.trim()) return;
    try {
      await addSupplierDocument(detail.id, docForm);
      flash('Document uploaded', 'success');
      setDocForm({ docType: 'GST', docName: '' });
      const d = await fetchSupplierDetail(detail.id);
      setDetail(d);
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Upload failed', 'error');
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!detail || !confirm('Remove document?')) return;
    try {
      await deleteSupplierDocument(docId);
      flash('Document removed', 'success');
      const d = await fetchSupplierDetail(detail.id);
      setDetail(d);
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Delete failed', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this supplier?')) return;
    try {
      await deleteSupplier(id);
      flash('Supplier deleted', 'success');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Delete failed', 'error');
    }
  };

  const toggleCategory = (catId: string) => {
    setForm((f) => ({
      ...f,
      categoryIds: f.categoryIds.includes(catId)
        ? f.categoryIds.filter((c) => c !== catId)
        : [...f.categoryIds, catId],
    }));
  };

  if (loading && !data) return <AcademicLoading />;

  const perms = data?.permissions;

  return (
    <div className="flex flex-col h-full gap-4">
      <FeeMessage message={message} type={messageType} />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Supplier Management</h2>
          <p className="text-xs text-slate-500">Vendor database — compliance, categories, PO/GRN performance</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className="text-xs border rounded-lg px-2 py-1.5">
            {(data?.academicYears ?? ['2025-26']).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-xs border rounded-lg px-2 py-1.5">
            <option value="ALL">All Status</option>
            {(data?.statusBreakdown ?? []).map((s) => <option key={s.status} value={s.status}>{s.status}</option>)}
          </select>
          <div className="relative">
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search vendors..." className="text-xs border rounded-lg pl-7 pr-2 py-1.5 w-36" />
          </div>
          <button type="button" onClick={() => void load()} className="p-2 border rounded-lg"><RefreshCw size={14} /></button>
          {perms?.canCreate && (
            <button type="button" onClick={openCreate} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg flex items-center gap-1">
              <Plus size={12} /> Onboard Vendor
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-[9px]">
        <div className="bg-white border rounded-xl p-3">
          <p className="text-slate-500">Total Vendors</p>
          <p className="font-bold text-2xl">{data?.totalSuppliers}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-3">
          <p className="text-green-600">Approved</p>
          <p className="font-bold text-2xl text-green-800">{data?.approvedCount}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <p className="text-amber-600">Pending</p>
          <p className="font-bold text-2xl text-amber-800">{data?.pendingCount}</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 flex-1 overflow-auto">
        {(data?.suppliers ?? []).map((s) => (
          <div key={s.id} className="bg-white border rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => void openDetail(s.id)}>
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Building2 size={18} className="text-blue-600" />
                </div>
                <div>
                  <p className="font-bold text-sm text-slate-800">{s.name}</p>
                  <p className="text-[10px] text-slate-400 font-mono">{s.code}</p>
                </div>
              </div>
              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${STATUS_STYLE[s.approvalStatus] ?? ''}`}>{s.approvalStatus}</span>
            </div>
            <StarRating value={s.rating} />
            <p className="text-[10px] text-slate-500 mt-1">{s.ratingLabel}</p>
            <div className="mt-3 grid grid-cols-2 gap-1 text-[9px] text-slate-600">
              <span>{s.city}</span>
              <span>GST: {s.gstId}</span>
              <span>{s.poCount} POs</span>
              <span>{s.grnCount} GRNs</span>
            </div>
            <div className="mt-3 flex gap-1" onClick={(e) => e.stopPropagation()}>
              {perms?.canEdit && (
                <button type="button" onClick={() => void openEdit(s.id)} className="text-[8px] border px-2 py-1 rounded flex items-center gap-0.5">
                  <Edit3 size={9} /> Edit
                </button>
              )}
              {s.approvalStatus === 'PENDING' && perms?.canApprove && (
                <button type="button" onClick={() => void handleApprove(s.id)} className="text-[8px] bg-green-600 text-white px-2 py-1 rounded flex items-center gap-0.5">
                  <CheckCircle2 size={9} /> Approve
                </button>
              )}
            </div>
          </div>
        ))}
        {(data?.suppliers ?? []).length === 0 && (
          <div className="col-span-full p-12 text-center text-slate-400">No suppliers — onboard a vendor</div>
        )}
      </div>

      <div className="bg-slate-50 border rounded-lg p-3 text-[9px] text-slate-600">
        <p className="font-bold mb-1">Workflow</p>
        <p>{(data?.workflow ?? []).join(' → ')}</p>
        <p className="mt-1 text-slate-500">{(data?.erpIntegration ?? []).join(' · ')}</p>
      </div>

      <AcademicModal open={formOpen} onClose={() => setFormOpen(false)} title={editId ? 'Edit Vendor' : 'Onboard Vendor'} wide>
        <div className="space-y-3 text-sm">
          <input value={form.supplierName} onChange={(e) => setForm((f) => ({ ...f, supplierName: e.target.value }))} placeholder="Vendor Name *" className="w-full border rounded px-2 py-1.5 text-xs" />
          <div className="grid grid-cols-2 gap-2">
            <input value={form.contactPerson} onChange={(e) => setForm((f) => ({ ...f, contactPerson: e.target.value }))} placeholder="Contact Person" className="border rounded px-2 py-1.5 text-xs" />
            <input value={form.mobile} onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))} placeholder="Mobile" className="border rounded px-2 py-1.5 text-xs" />
          </div>
          <input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="Email" className="w-full border rounded px-2 py-1.5 text-xs" />
          <div className="grid grid-cols-2 gap-2">
            <input value={form.gstId} onChange={(e) => setForm((f) => ({ ...f, gstId: e.target.value }))} placeholder="GST ID (unique)" className="border rounded px-2 py-1.5 text-xs font-mono" />
            <input value={form.taxId} onChange={(e) => setForm((f) => ({ ...f, taxId: e.target.value }))} placeholder="Tax ID (unique)" className="border rounded px-2 py-1.5 text-xs font-mono" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input value={form.bankName} onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))} placeholder="Bank" className="border rounded px-2 py-1.5 text-xs" />
            <input value={form.bankAccount} onChange={(e) => setForm((f) => ({ ...f, bankAccount: e.target.value }))} placeholder="Account" className="border rounded px-2 py-1.5 text-xs" />
            <input value={form.ifscCode} onChange={(e) => setForm((f) => ({ ...f, ifscCode: e.target.value }))} placeholder="IFSC" className="border rounded px-2 py-1.5 text-xs" />
          </div>
          <input value={form.apLedgerAccount} onChange={(e) => setForm((f) => ({ ...f, apLedgerAccount: e.target.value }))} placeholder="AP Ledger Account" className="w-full border rounded px-2 py-1.5 text-xs" />
          <div>
            <p className="text-[10px] text-slate-500 mb-1">Link to Item Categories</p>
            <div className="flex flex-wrap gap-1">
              {(data?.categories ?? []).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleCategory(c.id)}
                  className={`text-[9px] px-2 py-0.5 rounded border ${form.categoryIds.includes(c.id) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white'}`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
          <button type="button" onClick={() => void handleSave()} className="w-full bg-blue-600 text-white py-2 rounded-lg text-xs font-bold">
            {editId ? 'Update Vendor' : 'Onboard Vendor'}
          </button>
        </div>
      </AcademicModal>

      <AcademicModal open={detailOpen} onClose={() => setDetailOpen(false)} title={detail?.name ?? 'Vendor Profile'} wide>
        {detail && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <StarRating value={detail.rating} />
                <p className="text-xs text-slate-500">{detail.code} · AP: {detail.apLedgerAccount}</p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-1 rounded ${STATUS_STYLE[detail.approvalStatus] ?? ''}`}>{detail.approvalStatus}</span>
            </div>

            <FeeTabs tabs={[...DETAIL_TABS]} active={detailTab} onChange={setDetailTab} />

            {detailTab === 'Contact Details' && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-slate-50 rounded"><span className="text-slate-500">Contact</span><p className="font-bold">{detail.contactPerson}</p></div>
                <div className="p-2 bg-slate-50 rounded"><span className="text-slate-500">Mobile</span><p className="font-bold">{detail.mobile}</p></div>
                <div className="p-2 bg-slate-50 rounded col-span-2"><span className="text-slate-500">Email</span><p className="font-bold">{detail.email}</p></div>
                <div className="p-2 bg-slate-50 rounded col-span-2"><span className="text-slate-500">Address</span><p>{detail.address}, {detail.city}, {detail.state} {detail.pincode}</p></div>
                <div className="col-span-2">
                  <p className="text-[10px] text-slate-500 mb-1">Linked Categories</p>
                  <div className="flex flex-wrap gap-1">
                    {detail.categories.map((c) => (
                      <span key={c.id} className="text-[9px] px-2 py-0.5 rounded border" style={{ borderColor: c.color }}>{c.name}</span>
                    ))}
                    {!detail.categories.length && <span className="text-slate-400 text-[10px]">No categories linked</span>}
                  </div>
                </div>
              </div>
            )}

            {detailTab === 'Financials' && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-slate-50 rounded"><span className="text-slate-500">GST ID</span><p className="font-mono font-bold">{detail.gstId}</p></div>
                <div className="p-2 bg-slate-50 rounded"><span className="text-slate-500">Tax ID</span><p className="font-mono font-bold">{detail.taxId}</p></div>
                <div className="p-2 bg-slate-50 rounded"><span className="text-slate-500">Bank</span><p className="font-bold">{detail.bankName}</p></div>
                <div className="p-2 bg-slate-50 rounded"><span className="text-slate-500">Account</span><p className="font-bold">{detail.bankAccount}</p></div>
                <div className="p-2 bg-slate-50 rounded"><span className="text-slate-500">IFSC</span><p className="font-mono">{detail.ifscCode}</p></div>
                <div className="p-2 bg-blue-50 rounded"><span className="text-blue-600">AP Ledger</span><p className="font-bold text-blue-800">{detail.apLedgerAccount}</p></div>
              </div>
            )}

            {detailTab === 'Documents' && (
              <div className="space-y-3">
                {perms?.canEdit && (
                  <div className="flex gap-2">
                    <select value={docForm.docType} onChange={(e) => setDocForm((d) => ({ ...d, docType: e.target.value }))} className="text-xs border rounded px-2 py-1.5">
                      {(data?.docTypes ?? []).map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <input value={docForm.docName} onChange={(e) => setDocForm((d) => ({ ...d, docName: e.target.value }))} placeholder="Document name" className="flex-1 text-xs border rounded px-2 py-1.5" />
                    <button type="button" onClick={() => void handleUploadDoc()} className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg flex items-center gap-1">
                      <Upload size={12} /> Upload
                    </button>
                  </div>
                )}
                <div className="space-y-2">
                  {detail.documents.map((d) => (
                    <div key={d.id} className="flex items-center justify-between p-2 border rounded-lg text-xs">
                      <div className="flex items-center gap-2">
                        <FileText size={14} className="text-slate-400" />
                        <div>
                          <p className="font-bold">{d.docName}</p>
                          <p className="text-[10px] text-slate-500">{d.docType} · {d.uploadedAt}</p>
                        </div>
                      </div>
                      {perms?.canEdit && (
                        <button type="button" onClick={() => void handleDeleteDoc(d.id)} className="text-red-500 p-1"><Trash2 size={12} /></button>
                      )}
                    </div>
                  ))}
                  {!detail.documents.length && <p className="text-center text-slate-400 text-xs py-4">No compliance documents uploaded</p>}
                </div>
              </div>
            )}

            {detailTab === 'Performance' && (
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Purchase Orders', value: detail.performance.totalPurchaseOrders, icon: <BarChart3 size={14} /> },
                  { label: 'GRNs Received', value: detail.performance.totalGrns, icon: <CheckCircle2 size={14} /> },
                  { label: 'PO Value', value: detail.performance.totalPoValue, icon: null },
                  { label: 'GRN Value', value: detail.performance.totalGrnValue, icon: null },
                  { label: 'On-Time Delivery', value: detail.performance.onTimeDeliveryPct, icon: null },
                  { label: 'Quality Score', value: detail.performance.qualityScorePct, icon: null },
                ].map((m) => (
                  <div key={m.label} className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-[10px] text-slate-500 flex items-center gap-1">{m.icon}{m.label}</p>
                    <p className="font-bold text-lg text-slate-800">{m.value}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              {detail.approvalStatus === 'PENDING' && perms?.canApprove && (
                <>
                  <button type="button" onClick={() => void handleApprove(detail.id)} className="flex-1 bg-green-600 text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1">
                    <CheckCircle2 size={14} /> Approve Vendor
                  </button>
                  <button type="button" onClick={() => void handleReject(detail.id)} className="px-4 border border-red-200 text-red-600 py-2 rounded-lg text-xs flex items-center gap-1">
                    <XCircle size={14} /> Reject
                  </button>
                </>
              )}
              {perms?.canDelete && detail.poCount === 0 && detail.grnCount === 0 && (
                <button type="button" onClick={() => void handleDelete(detail.id)} className="text-xs text-red-600 border border-red-200 px-3 py-2 rounded-lg">Delete</button>
              )}
            </div>
          </div>
        )}
      </AcademicModal>
    </div>
  );
}
