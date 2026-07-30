import { useCallback, useEffect, useState } from 'react';
import { Pencil, RefreshCcw, Sparkles } from 'lucide-react';
import {
  listFeeMasters,
  seedFeeMasters,
  updateFeeMaster,
  type FeeMaster,
  type FeeMasterStatus,
} from '../../../lib/feeFinanceServices';
import {
  AcademicLoading,
  AcademicModal,
  AcademicPageHeader,
  AcademicPageShell,
  am,
  EmptyState,
  FeeMessage,
} from './FeeFinanceUi';

const EMPTY_FORM = {
  code: '',
  name: '',
  category: 'TUITION',
  defaultAmount: '',
  description: '',
  isRefundable: false,
  isTaxable: false,
  status: 'ACTIVE' as FeeMasterStatus,
  showInCollection: true,
  showInInvoice: true,
  showInPayment: true,
};

const CATEGORIES = [
  'TUITION',
  'TRANSPORT',
  'HOSTEL',
  'EXAM',
  'LIBRARY',
  'LAB',
  'ACTIVITY',
  'ADMIN',
  'ADMISSION',
  'FINE',
  'OTHER',
];

export function FeeMastersView() {
  const [records, setRecords] = useState<FeeMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editRow, setEditRow] = useState<FeeMaster | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const rows = await listFeeMasters();
      setRecords(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load fee masters');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSeed = async () => {
    setMessage('');
    setError('');
    try {
      const result = await seedFeeMasters();
      setMessage(`Seeded ${result.created} fee master(s)${result.skipped ? `, ${result.skipped} skipped` : ''}`);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Seed failed');
    }
  };

  const openEdit = (row: FeeMaster) => {
    setEditRow(row);
    setForm({
      code: row.code,
      name: row.name,
      category: row.category || 'TUITION',
      defaultAmount: row.defaultAmount ? String(row.defaultAmount) : '',
      description: row.description || '',
      isRefundable: row.isRefundable,
      isTaxable: row.isTaxable,
      status: row.status,
      showInCollection: row.showInCollection,
      showInInvoice: row.showInInvoice,
      showInPayment: row.showInPayment,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditRow(null);
    setForm(EMPTY_FORM);
  };

  const handleUpdate = async () => {
    if (!editRow) return;
    setMessage('');
    setError('');
    try {
      await updateFeeMaster(editRow.id, {
        name: form.name.trim(),
        category: form.category,
        description: form.description,
        isRefundable: form.isRefundable,
        isTaxable: form.isTaxable,
        status: form.status,
        showInCollection: form.showInCollection,
        showInInvoice: form.showInInvoice,
        showInPayment: form.showInPayment,
      });
      setMessage(`Fee master "${editRow.code}" updated`);
      closeModal();
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    }
  };

  const patchMaster = async (id: string, patch: Partial<FeeMaster>) => {
    setError('');
    try {
      await updateFeeMaster(id, patch);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    }
  };

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="Fees & Finance"
        title="Fee Masters"
        subtitle="Manage visibility & permissions for fee headers synced from Fee Structure."
        actions={
          <>
            <button type="button" onClick={() => void load()} className={am.btnSecondary}>
              <RefreshCcw size={14} /> Refresh
            </button>
            <button type="button" onClick={() => void handleSeed()} className={am.btnSecondary}>
              <Sparkles size={14} /> Seed Defaults
            </button>
          </>
        }
      />
      <div className={am.content}>
        <FeeMessage message={message} type="success" />
        <FeeMessage message={error} type="error" />
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
          Fee headers and default amounts are created from <strong>Fee Structure</strong>. Use this page to control status, visibility (Collection / Invoice / Payment), and refundable/taxable flags.
        </div>
        {loading ? (
          <AcademicLoading label="Loading fee masters…" />
        ) : records.length === 0 ? (
          <EmptyState>No fee masters yet. Create fee structures in <strong>Fee Structure</strong> or click &quot;Seed Defaults&quot; for standard headers.</EmptyState>
        ) : (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead>
                <tr>
                  <th className={am.th}>Code</th>
                  <th className={am.th}>Name</th>
                  <th className={am.th}>Category</th>
                  <th className={am.th + ' text-right'}>Default</th>
                  <th className={am.th}>Flags</th>
                  <th className={am.th}>Status</th>
                  <th className={am.th}>Visibility</th>
                  <th className={am.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {records.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80">
                    <td className={am.td + ' font-mono text-xs'}>{row.code}</td>
                    <td className={am.td + ' font-semibold'}>{row.name}</td>
                    <td className={am.td}>{row.category}</td>
                    <td className={am.td + ' text-right'}>₹ {row.defaultAmount.toLocaleString('en-IN')}</td>
                    <td className={am.td + ' text-xs text-slate-500'}>
                      {row.isRefundable && <span className="mr-1">Refundable</span>}
                      {row.isTaxable && <span>Taxable</span>}
                      {!row.isRefundable && !row.isTaxable && '—'}
                    </td>
                    <td className={am.td}>
                      <select
                        value={row.status}
                        onChange={(e) => void patchMaster(row.id, { status: e.target.value as FeeMasterStatus })}
                        className={am.select + ' text-xs py-1'}
                      >
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="INACTIVE">INACTIVE</option>
                      </select>
                    </td>
                    <td className={am.td}>
                      <div className="flex flex-col gap-1 text-[10px]">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={row.showInCollection}
                            onChange={(e) => void patchMaster(row.id, { showInCollection: e.target.checked })}
                          />
                          Collection
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={row.showInInvoice}
                            onChange={(e) => void patchMaster(row.id, { showInInvoice: e.target.checked })}
                          />
                          Invoice
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={row.showInPayment}
                            onChange={(e) => void patchMaster(row.id, { showInPayment: e.target.checked })}
                          />
                          Payment
                        </label>
                      </div>
                    </td>
                    <td className={am.td}>
                      <button
                        type="button"
                        onClick={() => openEdit(row)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:underline"
                      >
                        <Pencil size={12} />
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AcademicModal
        open={showModal}
        onClose={closeModal}
        title={editRow ? `Edit Fee Master — ${editRow.code}` : 'Fee Master'}
        large
      >
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-600">Code</label>
            <input
              className={`${am.input} bg-slate-100 text-slate-500`}
              value={form.code}
              readOnly
            />
            <p className="text-[10px] text-slate-500 mt-1">Codes are managed from Fee Structure.</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Name</label>
            <input className={am.input} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Tuition Fee" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">Category</label>
              <select className={am.select + ' w-full'} value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Default Amount</label>
              <input
                type="number"
                className={`${am.input} bg-slate-100 text-slate-500`}
                value={form.defaultAmount}
                readOnly
              />
              <p className="text-[10px] text-slate-500 mt-1">Synced from Fee Structure saves.</p>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Description</label>
            <textarea className={am.input} rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">Status</label>
              <select
                className={am.select + ' w-full'}
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as FeeMasterStatus }))}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>
            <div className="flex flex-col gap-2 pt-5">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isRefundable}
                  onChange={(e) => setForm((f) => ({ ...f, isRefundable: e.target.checked }))}
                />
                Refundable
              </label>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isTaxable}
                  onChange={(e) => setForm((f) => ({ ...f, isTaxable: e.target.checked }))}
                />
                Taxable
              </label>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Visibility</label>
            <div className="flex flex-wrap gap-4 mt-1">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.showInCollection}
                  onChange={(e) => setForm((f) => ({ ...f, showInCollection: e.target.checked }))}
                />
                Collection
              </label>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.showInInvoice}
                  onChange={(e) => setForm((f) => ({ ...f, showInInvoice: e.target.checked }))}
                />
                Invoice
              </label>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.showInPayment}
                  onChange={(e) => setForm((f) => ({ ...f, showInPayment: e.target.checked }))}
                />
                Payment
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={closeModal} className={am.btnSecondary}>Cancel</button>
            <button
              type="button"
              onClick={() => void handleUpdate()}
              className={am.btnPrimary}
              disabled={!form.name || !editRow}
            >
              Save Changes
            </button>
          </div>
        </div>
      </AcademicModal>
    </AcademicPageShell>
  );
}
