import { useCallback, useEffect, useState } from 'react';
import { BedDouble, Plus, RefreshCcw, Sparkles } from 'lucide-react';
import {
  collectHostelFee,
  createHostelFeeCategory,
  fetchFeeDashboardMeta,
  formatInr,
  getHostelFeeSummary,
  listHostelFeeCategories,
  listHostelFeeCollections,
  seedHostelFeeCategories,
  updateHostelFeeCategory,
  type HostelFeeCategory,
  type HostelFeeCollection,
  type HostelFeeSummary,
} from '../../../lib/feeFinanceServices';
import {
  AcademicLoading,
  AcademicModal,
  AcademicPageHeader,
  AcademicPageShell,
  am,
  EmptyState,
  FeeMessage,
  FeeTabs,
  StatusBadge,
} from './FeeFinanceUi';

const FREQUENCY_OPTIONS = [
  'One-Time',
  'Monthly',
  'Monthly/Quarterly',
  'Monthly (Actual/Fixed)',
  'Annual',
  'As Applicable',
];

export function HostelFeeView() {
  const [tab, setTab] = useState('Fee Categories');
  const [categories, setCategories] = useState<HostelFeeCategory[]>([]);
  const [collections, setCollections] = useState<HostelFeeCollection[]>([]);
  const [summary, setSummary] = useState<HostelFeeSummary | null>(null);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [years, setYears] = useState<string[]>(['2025-26']);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [editRow, setEditRow] = useState<HostelFeeCategory | null>(null);
  const [form, setForm] = useState({
    code: '',
    name: '',
    frequency: 'Monthly',
    refundable: false,
    gstMode: 'CONFIGURABLE' as 'CONFIGURABLE' | 'NO',
    defaultAmount: '',
    description: '',
  });
  const [collectForm, setCollectForm] = useState({
    categoryId: '',
    studentName: '',
    admissionNumber: '',
    className: '',
    roomNumber: '',
    periodLabel: '',
    amount: '',
    paymentMode: 'CASH',
    remarks: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const meta = await fetchFeeDashboardMeta();
      if (meta.academicYears?.length) setYears(meta.academicYears);
      const year = academicYear || meta.defaultAcademicYear || '2025-26';
      if (!academicYear && meta.defaultAcademicYear) setAcademicYear(meta.defaultAcademicYear);

      const [cats, cols, sum] = await Promise.all([
        listHostelFeeCategories({ ensure: '1' }),
        listHostelFeeCollections({ academicYear: year }),
        getHostelFeeSummary(year),
      ]);
      setCategories(cats);
      setCollections(cols);
      setSummary(sum);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load hostel fees');
    } finally {
      setLoading(false);
    }
  }, [academicYear]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSeed = async () => {
    setMessage('');
    setError('');
    try {
      const result = await seedHostelFeeCategories();
      setMessage(
        result.created > 0
          ? `Loaded ${result.created} hostel fee categor${result.created === 1 ? 'y' : 'ies'}`
          : 'All default hostel fee categories already exist',
      );
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Seed failed');
    }
  };

  const handleCreate = async () => {
    setError('');
    try {
      await createHostelFeeCategory({
        code: form.code.trim(),
        name: form.name.trim(),
        frequency: form.frequency,
        refundable: form.refundable,
        gstMode: form.gstMode,
        defaultAmount: form.defaultAmount ? Number(form.defaultAmount) : 0,
        description: form.description,
      });
      setMessage('Hostel fee category created');
      setShowAddModal(false);
      setForm({
        code: '',
        name: '',
        frequency: 'Monthly',
        refundable: false,
        gstMode: 'CONFIGURABLE',
        defaultAmount: '',
        description: '',
      });
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed');
    }
  };

  const handleUpdate = async () => {
    if (!editRow) return;
    setError('');
    try {
      await updateHostelFeeCategory(editRow.id, {
        name: form.name.trim(),
        frequency: form.frequency,
        refundable: form.refundable,
        gstMode: form.gstMode,
        defaultAmount: form.defaultAmount ? Number(form.defaultAmount) : 0,
        description: form.description,
      });
      setMessage('Category updated');
      setEditRow(null);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    }
  };

  const toggleStatus = async (row: HostelFeeCategory) => {
    try {
      await updateHostelFeeCategory(row.id, {
        status: row.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
      });
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Status update failed');
    }
  };

  const openEdit = (row: HostelFeeCategory) => {
    setEditRow(row);
    setForm({
      code: row.code,
      name: row.name,
      frequency: row.frequency,
      refundable: row.refundable,
      gstMode: row.gstMode === 'NO' ? 'NO' : 'CONFIGURABLE',
      defaultAmount: String(row.defaultAmount || ''),
      description: row.description || '',
    });
  };

  const handleCollect = async () => {
    setError('');
    try {
      await collectHostelFee({
        academicYear,
        categoryId: collectForm.categoryId || undefined,
        studentName: collectForm.studentName.trim(),
        admissionNumber: collectForm.admissionNumber.trim(),
        className: collectForm.className.trim(),
        roomNumber: collectForm.roomNumber.trim(),
        periodLabel: collectForm.periodLabel.trim(),
        amount: Number(collectForm.amount),
        paymentMode: collectForm.paymentMode,
        remarks: collectForm.remarks,
      });
      setMessage('Hostel fee collected');
      setShowCollectModal(false);
      setCollectForm({
        categoryId: '',
        studentName: '',
        admissionNumber: '',
        className: '',
        roomNumber: '',
        periodLabel: '',
        amount: '',
        paymentMode: 'CASH',
        remarks: '',
      });
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Collection failed');
    }
  };

  if (loading && !categories.length) {
    return <AcademicLoading label="Loading hostel fees…" />;
  }

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="Fees & Finance › Hostel Fee"
        title="Hostel Fee"
        subtitle="Hostel fee categories, GST & refund rules — collect and manage hostel charges"
        actions={
          <>
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className={am.select}
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <button type="button" onClick={() => void load()} className={am.btnSecondary}>
              <RefreshCcw size={14} /> Refresh
            </button>
            <button type="button" onClick={() => void handleSeed()} className={am.btnSecondary}>
              <Sparkles size={14} /> Seed Defaults
            </button>
            <button type="button" onClick={() => setShowCollectModal(true)} className={am.btnSecondary}>
              <BedDouble size={14} /> Collect Fee
            </button>
            <button type="button" onClick={() => setShowAddModal(true)} className={am.btnPrimary}>
              <Plus size={14} /> Add Category
            </button>
          </>
        }
      />

      <div className={am.content}>
        {message && <FeeMessage message={message} type="success" />}
        {error && <FeeMessage message={error} type="error" />}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className={`${am.card} ${am.cardPad}`}>
            <p className="text-[10px] text-slate-500 font-bold uppercase">Fee Categories</p>
            <p className="text-xl font-bold text-slate-900 mt-1">{summary?.categoryCount ?? categories.filter((c) => c.status === 'ACTIVE').length}</p>
          </div>
          <div className={`${am.card} ${am.cardPad}`}>
            <p className="text-[10px] text-slate-500 font-bold uppercase">Collections ({academicYear})</p>
            <p className="text-xl font-bold text-slate-900 mt-1">{summary?.collectionCount ?? 0}</p>
          </div>
          <div className={`${am.card} ${am.cardPad}`}>
            <p className="text-[10px] text-slate-500 font-bold uppercase">Total Collected</p>
            <p className="text-xl font-bold text-green-700 mt-1">{formatInr(summary?.totalCollections ?? 0)}</p>
          </div>
          <div className={`${am.card} ${am.cardPad}`}>
            <p className="text-[10px] text-slate-500 font-bold uppercase">Refundable Heads</p>
            <p className="text-xl font-bold text-slate-900 mt-1">{categories.filter((c) => c.refundable && c.status === 'ACTIVE').length}</p>
          </div>
        </div>

        <FeeTabs
          tabs={['Fee Categories', 'Collections']}
          active={tab}
          onChange={setTab}
        />

        {tab === 'Fee Categories' && (
          <div className={am.tableWrap}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    <th className={am.th}>Fee Category</th>
                    <th className={am.th}>Frequency</th>
                    <th className={am.th}>Refundable</th>
                    <th className={am.th}>GST (if applicable)</th>
                    <th className={`${am.th} text-right`}>Default Amount</th>
                    <th className={am.th}>Status</th>
                    <th className={am.th}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.length === 0 ? (
                    <tr>
                      <td colSpan={7} className={am.td}>
                        <EmptyState>
                          No hostel fee categories yet. Click <strong>Seed Defaults</strong> to load the standard table.
                        </EmptyState>
                      </td>
                    </tr>
                  ) : (
                    categories.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/80">
                        <td className={`${am.td} font-semibold text-slate-800`}>{row.feeCategory || row.name}</td>
                        <td className={am.td}>{row.frequency}</td>
                        <td className={am.td}>
                          <span className={row.refundable ? 'text-green-700 font-semibold' : 'text-slate-600'}>
                            {row.refundableLabel}
                          </span>
                        </td>
                        <td className={am.td}>{row.gstLabel}</td>
                        <td className={`${am.td} text-right font-medium`}>
                          {row.defaultAmount > 0 ? formatInr(row.defaultAmount) : '—'}
                        </td>
                        <td className={am.td}><StatusBadge status={row.status} /></td>
                        <td className={am.td}>
                          <div className="flex gap-2">
                            <button type="button" className="text-blue-600 font-semibold text-xs hover:underline" onClick={() => openEdit(row)}>
                              Edit
                            </button>
                            <button type="button" className="text-slate-500 font-semibold text-xs hover:underline" onClick={() => void toggleStatus(row)}>
                              {row.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'Collections' && (
          <div className={am.tableWrap}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    <th className={am.th}>Receipt</th>
                    <th className={am.th}>Student</th>
                    <th className={am.th}>Category</th>
                    <th className={am.th}>Room</th>
                    <th className={am.th}>Period</th>
                    <th className={`${am.th} text-right`}>Amount</th>
                    <th className={am.th}>Mode</th>
                    <th className={am.th}>Collected</th>
                  </tr>
                </thead>
                <tbody>
                  {collections.length === 0 ? (
                    <tr>
                      <td colSpan={8} className={am.td}>
                        <EmptyState>No hostel fee collections for {academicYear}</EmptyState>
                      </td>
                    </tr>
                  ) : (
                    collections.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/80">
                        <td className={`${am.td} font-mono text-xs`}>{row.receiptNumber}</td>
                        <td className={am.td}>
                          <div className="font-semibold text-slate-800">{row.studentName}</div>
                          <div className="text-[11px] text-slate-500">{row.admissionNumber || row.className}</div>
                        </td>
                        <td className={am.td}>{row.categoryName || '—'}</td>
                        <td className={am.td}>{row.roomNumber || '—'}</td>
                        <td className={am.td}>{row.periodLabel || '—'}</td>
                        <td className={`${am.td} text-right font-semibold text-green-700`}>{formatInr(row.amount)}</td>
                        <td className={am.td}>{row.paymentMode}</td>
                        <td className={am.td}>{new Date(row.collectedAt).toLocaleString('en-IN')}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <AcademicModal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add Hostel Fee Category">
        <div className="space-y-3">
          <input className={am.input} placeholder="Code (e.g. HOSTEL_GYM)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          <input className={am.input} placeholder="Fee Category name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <select className={am.select + ' w-full'} value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}>
            {FREQUENCY_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <select className={am.select} value={form.refundable ? 'Yes' : 'No'} onChange={(e) => setForm({ ...form, refundable: e.target.value === 'Yes' })}>
              <option value="No">Refundable: No</option>
              <option value="Yes">Refundable: Yes</option>
            </select>
            <select className={am.select} value={form.gstMode} onChange={(e) => setForm({ ...form, gstMode: e.target.value as 'CONFIGURABLE' | 'NO' })}>
              <option value="CONFIGURABLE">GST: Configurable</option>
              <option value="NO">GST: No</option>
            </select>
          </div>
          <input className={am.input} type="number" placeholder="Default amount (optional)" value={form.defaultAmount} onChange={(e) => setForm({ ...form, defaultAmount: e.target.value })} />
          <textarea className={am.input} placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          <button type="button" className={am.btnPrimary + ' w-full'} onClick={() => void handleCreate()} disabled={!form.code.trim() || !form.name.trim()}>
            Create Category
          </button>
        </div>
      </AcademicModal>

      <AcademicModal open={!!editRow} onClose={() => setEditRow(null)} title={`Edit — ${editRow?.name || ''}`}>
        <div className="space-y-3">
          <input className={am.input} value={form.code} disabled />
          <input className={am.input} placeholder="Fee Category name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <select className={am.select + ' w-full'} value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}>
            {FREQUENCY_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <select className={am.select} value={form.refundable ? 'Yes' : 'No'} onChange={(e) => setForm({ ...form, refundable: e.target.value === 'Yes' })}>
              <option value="No">Refundable: No</option>
              <option value="Yes">Refundable: Yes</option>
            </select>
            <select className={am.select} value={form.gstMode} onChange={(e) => setForm({ ...form, gstMode: e.target.value as 'CONFIGURABLE' | 'NO' })}>
              <option value="CONFIGURABLE">GST: Configurable</option>
              <option value="NO">GST: No</option>
            </select>
          </div>
          <input className={am.input} type="number" placeholder="Default amount" value={form.defaultAmount} onChange={(e) => setForm({ ...form, defaultAmount: e.target.value })} />
          <textarea className={am.input} placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          <button type="button" className={am.btnPrimary + ' w-full'} onClick={() => void handleUpdate()}>
            Save Changes
          </button>
        </div>
      </AcademicModal>

      <AcademicModal open={showCollectModal} onClose={() => setShowCollectModal(false)} title="Collect Hostel Fee" large>
        <div className="space-y-3">
          <select
            className={am.select + ' w-full'}
            value={collectForm.categoryId}
            onChange={(e) => {
              const cat = categories.find((c) => c.id === e.target.value);
              setCollectForm({
                ...collectForm,
                categoryId: e.target.value,
                amount: cat && cat.defaultAmount > 0 ? String(cat.defaultAmount) : collectForm.amount,
              });
            }}
          >
            <option value="">Select fee category</option>
            {categories.filter((c) => c.status === 'ACTIVE').map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({c.frequency})</option>
            ))}
          </select>
          <input className={am.input} placeholder="Student name *" value={collectForm.studentName} onChange={(e) => setCollectForm({ ...collectForm, studentName: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <input className={am.input} placeholder="Admission No" value={collectForm.admissionNumber} onChange={(e) => setCollectForm({ ...collectForm, admissionNumber: e.target.value })} />
            <input className={am.input} placeholder="Class" value={collectForm.className} onChange={(e) => setCollectForm({ ...collectForm, className: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input className={am.input} placeholder="Room No" value={collectForm.roomNumber} onChange={(e) => setCollectForm({ ...collectForm, roomNumber: e.target.value })} />
            <input className={am.input} placeholder="Period (e.g. Apr 2026)" value={collectForm.periodLabel} onChange={(e) => setCollectForm({ ...collectForm, periodLabel: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input className={am.input} type="number" placeholder="Amount *" value={collectForm.amount} onChange={(e) => setCollectForm({ ...collectForm, amount: e.target.value })} />
            <select className={am.select} value={collectForm.paymentMode} onChange={(e) => setCollectForm({ ...collectForm, paymentMode: e.target.value })}>
              <option value="CASH">Cash</option>
              <option value="UPI">UPI</option>
              <option value="CARD">Card</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="CHEQUE">Cheque</option>
            </select>
          </div>
          <textarea className={am.input} placeholder="Remarks" value={collectForm.remarks} onChange={(e) => setCollectForm({ ...collectForm, remarks: e.target.value })} rows={2} />
          <button
            type="button"
            className={am.btnPrimary + ' w-full'}
            onClick={() => void handleCollect()}
            disabled={!collectForm.studentName.trim() || !collectForm.amount || Number(collectForm.amount) <= 0}
          >
            Collect & Generate Receipt
          </button>
        </div>
      </AcademicModal>
    </AcademicPageShell>
  );
}
