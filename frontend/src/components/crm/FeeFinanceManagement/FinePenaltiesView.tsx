import { useCallback, useEffect, useState } from 'react';
import { Ban, Check, Plus, RefreshCcw, Sparkles } from 'lucide-react';
import {
  createFeeFineType,
  fetchFeeDashboardMeta,
  formatInr,
  levyFeeFine,
  listFeeFineLevies,
  listFeeFineTypes,
  markFinePaid,
  seedFeeFineTypes,
  waiveFeeFine,
  type FeeFineLevy,
  type FeeFineType,
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

export function FinePenaltiesView() {
  const [tab, setTab] = useState('Fine Types');
  const [types, setTypes] = useState<FeeFineType[]>([]);
  const [levies, setLevies] = useState<FeeFineLevy[]>([]);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showLevyModal, setShowLevyModal] = useState(false);
  const [typeForm, setTypeForm] = useState({ code: '', name: '', category: 'OTHER', defaultAmount: '', description: '' });
  const [levyForm, setLevyForm] = useState({
    fineTypeId: '',
    studentName: '',
    admissionNumber: '',
    className: '',
    amount: '',
    reason: '',
    dueDate: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const meta = await fetchFeeDashboardMeta();
      if (meta.defaultAcademicYear) setAcademicYear((y) => y || meta.defaultAcademicYear);
      const [t, l] = await Promise.all([
        listFeeFineTypes(),
        listFeeFineLevies({ academicYear }),
      ]);
      setTypes(t);
      setLevies(l);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load fines');
    } finally {
      setLoading(false);
    }
  }, [academicYear]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSeed = async () => {
    setError('');
    try {
      const result = await seedFeeFineTypes();
      setMessage(`Seeded ${result.created} fine type(s)`);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Seed failed');
    }
  };

  const handleCreateType = async () => {
    setError('');
    try {
      await createFeeFineType({
        code: typeForm.code,
        name: typeForm.name,
        category: typeForm.category,
        defaultAmount: typeForm.defaultAmount ? Number(typeForm.defaultAmount) : 0,
        description: typeForm.description,
      });
      setMessage('Fine type created');
      setShowTypeModal(false);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed');
    }
  };

  const handleLevy = async () => {
    setError('');
    try {
      await levyFeeFine({
        fineTypeId: levyForm.fineTypeId,
        academicYear,
        studentName: levyForm.studentName,
        admissionNumber: levyForm.admissionNumber || undefined,
        className: levyForm.className || undefined,
        amount: Number(levyForm.amount),
        reason: levyForm.reason || undefined,
        dueDate: levyForm.dueDate || undefined,
      });
      setMessage('Fine levied on student');
      setShowLevyModal(false);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Levy failed');
    }
  };

  const handleLevyAction = async (action: 'pay' | 'waive', id: string) => {
    setError('');
    try {
      if (action === 'pay') await markFinePaid(id);
      else await waiveFeeFine(id);
      setMessage(action === 'pay' ? 'Fine marked paid' : 'Fine waived');
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    }
  };

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="Fees & Finance"
        title="Fine / Penalties"
        subtitle="Manage fine types and apply penalties to students."
        actions={
          <>
            <button type="button" onClick={() => void load()} className={am.btnSecondary}>
              <RefreshCcw size={14} /> Refresh
            </button>
            {tab === 'Fine Types' ? (
              <>
                <button type="button" onClick={() => void handleSeed()} className={am.btnSecondary}>
                  <Sparkles size={14} /> Seed Types
                </button>
                <button type="button" onClick={() => setShowTypeModal(true)} className={am.btnPrimary}>
                  <Plus size={14} /> Add Type
                </button>
              </>
            ) : (
              <button type="button" onClick={() => setShowLevyModal(true)} className={am.btnPrimary} disabled={types.length === 0}>
                <Plus size={14} /> Levy Fine
              </button>
            )}
          </>
        }
      />
      <div className={am.content}>
        <FeeTabs tabs={['Fine Types', 'Applied Fines']} active={tab} onChange={setTab} />
        <FeeMessage message={message} type="success" />
        <FeeMessage message={error} type="error" />

        {loading ? <AcademicLoading /> : tab === 'Fine Types' ? (
          types.length === 0 ? <EmptyState>No fine types. Seed defaults or add custom types.</EmptyState> : (
            <div className={am.tableWrap}>
              <table className="w-full">
                <thead>
                  <tr>
                    <th className={am.th}>Code</th>
                    <th className={am.th}>Name</th>
                    <th className={am.th}>Category</th>
                    <th className={am.th + ' text-right'}>Default</th>
                    <th className={am.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {types.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/80">
                      <td className={am.td + ' font-mono text-xs'}>{row.code}</td>
                      <td className={am.td + ' font-semibold'}>{row.name}</td>
                      <td className={am.td}>{row.category.replace(/_/g, ' ')}</td>
                      <td className={am.td + ' text-right'}>{formatInr(row.defaultAmount)}</td>
                      <td className={am.td}><StatusBadge status={row.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : levies.length === 0 ? (
          <EmptyState>No fines applied yet.</EmptyState>
        ) : (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead>
                <tr>
                  <th className={am.th}>Fine Type</th>
                  <th className={am.th}>Student</th>
                  <th className={am.th + ' text-right'}>Amount</th>
                  <th className={am.th}>Due</th>
                  <th className={am.th}>Status</th>
                  <th className={am.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {levies.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80">
                    <td className={am.td}>{row.fineTypeName}</td>
                    <td className={am.td}>
                      <p className="font-semibold">{row.studentName}</p>
                      <p className="text-xs text-slate-500">{row.className}</p>
                    </td>
                    <td className={am.td + ' text-right font-bold'}>{formatInr(row.amount)}</td>
                    <td className={am.td}>{row.dueDate || '—'}</td>
                    <td className={am.td}><StatusBadge status={row.status} /></td>
                    <td className={am.td}>
                      {row.status === 'PENDING' && (
                        <div className="flex gap-1">
                          <button type="button" onClick={() => void handleLevyAction('pay', row.id)} className={am.btnSecondary + ' text-[10px] py-1 px-2 text-green-700'}>
                            <Check size={10} /> Paid
                          </button>
                          <button type="button" onClick={() => void handleLevyAction('waive', row.id)} className={am.btnSecondary + ' text-[10px] py-1 px-2 text-purple-700'}>
                            <Ban size={10} /> Waive
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AcademicModal open={showTypeModal} onClose={() => setShowTypeModal(false)} title="Add Fine Type" large>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">Code</label>
              <input className={am.input} value={typeForm.code} onChange={(e) => setTypeForm((f) => ({ ...f, code: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Name</label>
              <input className={am.input} value={typeForm.name} onChange={(e) => setTypeForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">Category</label>
              <select className={am.select + ' w-full'} value={typeForm.category} onChange={(e) => setTypeForm((f) => ({ ...f, category: e.target.value }))}>
                {['LATE_FEE', 'LATE_EXAM_FEE', 'PROPERTY_DAMAGE', 'LAB_EQUIPMENT', 'LIBRARY_BOOK', 'COMPUTER_LAB', 'OTHER'].map((c) => (
                  <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Default Amount</label>
              <input type="number" className={am.input} value={typeForm.defaultAmount} onChange={(e) => setTypeForm((f) => ({ ...f, defaultAmount: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowTypeModal(false)} className={am.btnSecondary}>Cancel</button>
            <button type="button" onClick={() => void handleCreateType()} className={am.btnPrimary} disabled={!typeForm.code || !typeForm.name}>Save</button>
          </div>
        </div>
      </AcademicModal>

      <AcademicModal open={showLevyModal} onClose={() => setShowLevyModal(false)} title="Levy Fine on Student" large>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-600">Fine Type</label>
            <select className={am.select + ' w-full'} value={levyForm.fineTypeId} onChange={(e) => {
              const ft = types.find((t) => t.id === e.target.value);
              setLevyForm((f) => ({
                ...f,
                fineTypeId: e.target.value,
                amount: ft ? String(ft.defaultAmount) : f.amount,
              }));
            }}>
              <option value="">Select type</option>
              {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">Student Name *</label>
              <input className={am.input} value={levyForm.studentName} onChange={(e) => setLevyForm((f) => ({ ...f, studentName: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Class</label>
              <input className={am.input} value={levyForm.className} onChange={(e) => setLevyForm((f) => ({ ...f, className: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">Amount *</label>
              <input type="number" className={am.input} value={levyForm.amount} onChange={(e) => setLevyForm((f) => ({ ...f, amount: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Due Date</label>
              <input type="date" className={am.input} value={levyForm.dueDate} onChange={(e) => setLevyForm((f) => ({ ...f, dueDate: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Reason</label>
            <textarea className={am.input} rows={2} value={levyForm.reason} onChange={(e) => setLevyForm((f) => ({ ...f, reason: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowLevyModal(false)} className={am.btnSecondary}>Cancel</button>
            <button type="button" onClick={() => void handleLevy()} className={am.btnPrimary} disabled={!levyForm.fineTypeId || !levyForm.studentName || !levyForm.amount}>Levy</button>
          </div>
        </div>
      </AcademicModal>
    </AcademicPageShell>
  );
}
