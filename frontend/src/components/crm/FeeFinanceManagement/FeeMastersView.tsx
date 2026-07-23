import { useCallback, useEffect, useState } from 'react';
import { Plus, RefreshCcw, Sparkles } from 'lucide-react';
import {
  createFeeMaster,
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

export function FeeMastersView() {
  const [records, setRecords] = useState<FeeMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    code: '',
    name: '',
    category: 'TUITION',
    defaultAmount: '',
    description: '',
  });

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

  const handleCreate = async () => {
    setMessage('');
    setError('');
    try {
      await createFeeMaster({
        code: form.code.trim(),
        name: form.name.trim(),
        category: form.category,
        defaultAmount: form.defaultAmount ? Number(form.defaultAmount) : 0,
        description: form.description,
      });
      setMessage('Fee master created');
      setShowModal(false);
      setForm({ code: '', name: '', category: 'TUITION', defaultAmount: '', description: '' });
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed');
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
        subtitle="Configure fee headers used across collection, invoices, and payments."
        actions={
          <>
            <button type="button" onClick={() => void load()} className={am.btnSecondary}>
              <RefreshCcw size={14} /> Refresh
            </button>
            <button type="button" onClick={() => void handleSeed()} className={am.btnSecondary}>
              <Sparkles size={14} /> Seed Defaults
            </button>
            <button type="button" onClick={() => setShowModal(true)} className={am.btnPrimary}>
              <Plus size={14} /> Add Master
            </button>
          </>
        }
      />
      <div className={am.content}>
        <FeeMessage message={message} type="success" />
        <FeeMessage message={error} type="error" />
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
          School-specific details (bank, GST, receipt footer) can be stored per fee master under <strong>schoolDetails</strong> JSON — configure via Institution Setup for global defaults.
        </div>
        {loading ? (
          <AcademicLoading label="Loading fee masters…" />
        ) : records.length === 0 ? (
          <EmptyState>No fee masters yet. Click &quot;Seed Defaults&quot; or add a custom master.</EmptyState>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AcademicModal open={showModal} onClose={() => setShowModal(false)} title="Add Fee Master" large>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-600">Code</label>
            <input className={am.input} value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="TUITION_FEE" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Name</label>
            <input className={am.input} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Tuition Fee" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">Category</label>
              <select className={am.select + ' w-full'} value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                {['TUITION', 'TRANSPORT', 'HOSTEL', 'EXAM', 'LIBRARY', 'LAB', 'ACTIVITY', 'ADMIN', 'FINE', 'OTHER'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Default Amount</label>
              <input type="number" className={am.input} value={form.defaultAmount} onChange={(e) => setForm((f) => ({ ...f, defaultAmount: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Description</label>
            <textarea className={am.input} rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className={am.btnSecondary}>Cancel</button>
            <button type="button" onClick={() => void handleCreate()} className={am.btnPrimary} disabled={!form.code || !form.name}>Save</button>
          </div>
        </div>
      </AcademicModal>
    </AcademicPageShell>
  );
}
