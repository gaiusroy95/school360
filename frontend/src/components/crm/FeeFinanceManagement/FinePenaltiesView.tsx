import { useCallback, useEffect, useMemo, useState } from 'react';
import { Ban, Check, Plus, RefreshCcw, Send, Sparkles, X } from 'lucide-react';
import {
  fetchFeeCollectionMeta,
  feeStudentOptionKey,
  type FeeStudent,
} from '../../../lib/feeCollectionServices';
import {
  approveFeeFineLevy,
  createFeeFineType,
  fetchFeeDashboardMeta,
  formatInr,
  levyFeeFine,
  listFeeFineLevies,
  listFeeFineTypes,
  markFinePaid,
  rejectFeeFineLevy,
  seedFeeFineTypes,
  waiveFeeFine,
  type FeeFineCategory,
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

const FINE_CATEGORIES: FeeFineCategory[] = [
  'LATE_FEE',
  'LATE_EXAM_FEE',
  'PROPERTY_DAMAGE',
  'LAB_EQUIPMENT',
  'LIBRARY_BOOK',
  'COMPUTER_LAB',
  'OTHER',
];

export function FinePenaltiesView() {
  const [tab, setTab] = useState('Applied Fines');
  const [types, setTypes] = useState<FeeFineType[]>([]);
  const [levies, setLevies] = useState<FeeFineLevy[]>([]);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showLevyModal, setShowLevyModal] = useState(false);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [saving, setSaving] = useState(false);

  const [students, setStudents] = useState<FeeStudent[]>([]);
  const [className, setClassName] = useState('');
  const [sectionName, setSectionName] = useState('');
  const [studentKey, setStudentKey] = useState('');

  const [typeForm, setTypeForm] = useState({
    code: '',
    name: '',
    category: 'OTHER' as FeeFineCategory,
    defaultAmount: '',
    description: '',
  });
  const [levyForm, setLevyForm] = useState({
    category: 'OTHER' as FeeFineCategory,
    amount: '',
    reason: '',
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

  const classOptions = useMemo(() => {
    const set = new Set(students.map((s) => s.className).filter(Boolean));
    return [...set].sort();
  }, [students]);

  const sectionOptions = useMemo(() => {
    const set = new Set(
      students
        .filter((s) => !className || s.className === className)
        .map((s) => s.sectionName)
        .filter(Boolean),
    );
    return [...set].sort();
  }, [students, className]);

  const studentOptions = useMemo(
    () =>
      students.filter(
        (s) =>
          (!className || s.className === className) &&
          (!sectionName || s.sectionName === sectionName),
      ),
    [students, className, sectionName],
  );

  const selectedStudent = useMemo(
    () => studentOptions.find((s) => feeStudentOptionKey(s) === studentKey) || null,
    [studentOptions, studentKey],
  );

  const categoryDefaultAmount = useMemo(() => {
    const match = types.find((t) => t.category === levyForm.category && t.status === 'ACTIVE');
    return match?.defaultAmount ?? 0;
  }, [types, levyForm.category]);

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

  const openAddFine = async () => {
    setLevyForm({ category: 'OTHER', amount: '', reason: '' });
    setClassName('');
    setSectionName('');
    setStudentKey('');
    setShowLevyModal(true);
    try {
      const meta = await fetchFeeCollectionMeta();
      setStudents(meta.students || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load students');
    }
  };

  useEffect(() => {
    if (!showLevyModal) return;
    if (levyForm.amount) return;
    if (categoryDefaultAmount > 0) {
      setLevyForm((f) => ({ ...f, amount: String(categoryDefaultAmount) }));
    }
  }, [showLevyModal, levyForm.category, categoryDefaultAmount, levyForm.amount]);

  const handleLevy = async () => {
    setError('');
    if (!selectedStudent) {
      setError('Select class, section and student');
      return;
    }
    if (!levyForm.amount || Number(levyForm.amount) <= 0) {
      setError('Enter a valid fine amount');
      return;
    }
    if (!levyForm.reason.trim()) {
      setError('Reason for fine is required');
      return;
    }
    setSaving(true);
    try {
      await levyFeeFine({
        category: levyForm.category,
        academicYear,
        studentId: selectedStudent.studentId || undefined,
        studentName: selectedStudent.studentName,
        admissionNumber: selectedStudent.admissionNumber,
        className: selectedStudent.className,
        sectionName: selectedStudent.sectionName,
        amount: Number(levyForm.amount),
        reason: levyForm.reason.trim(),
        submitForApproval: true,
      });
      setMessage('Fine saved and sent for approval (HOD of Finance)');
      setShowLevyModal(false);
      setTab('Applied Fines');
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Levy failed');
    } finally {
      setSaving(false);
    }
  };

  const handleLevyAction = async (
    action: 'pay' | 'waive' | 'approve' | 'reject',
    id: string,
  ) => {
    setError('');
    try {
      if (action === 'pay') await markFinePaid(id);
      else if (action === 'waive') await waiveFeeFine(id);
      else if (action === 'approve') await approveFeeFineLevy(id);
      else if (action === 'reject') {
        if (!rejectReason.trim()) {
          setError('Rejection reason required');
          return;
        }
        await rejectFeeFineLevy(id, rejectReason);
        setRejectId(null);
        setRejectReason('');
      }
      setMessage(
        action === 'pay'
          ? 'Fine marked paid'
          : action === 'waive'
            ? 'Fine waived'
            : action === 'approve'
              ? 'Fine approved — now due for collection'
              : 'Fine rejected',
      );
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    }
  };

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="Fees & Finance › Fine / Penalties"
        title="Fine / Penalties"
        subtitle="Apply student fines with approval — Class / Section / Student from system records."
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
              <button type="button" onClick={() => void openAddFine()} className={am.btnPrimary}>
                <Plus size={14} /> Add Fine
              </button>
            )}
          </>
        }
      />
      <div className={am.content}>
        <FeeTabs tabs={['Applied Fines', 'Fine Types']} active={tab} onChange={setTab} />
        <FeeMessage message={message} type="success" />
        <FeeMessage message={error} type="error" />

        {loading ? (
          <AcademicLoading />
        ) : tab === 'Fine Types' ? (
          types.length === 0 ? (
            <EmptyState>No fine types. Seed defaults or add custom types.</EmptyState>
          ) : (
            <div className={am.tableWrap}>
              <table className="w-full">
                <thead>
                  <tr>
                    <th className={am.th}>Code</th>
                    <th className={am.th}>Name</th>
                    <th className={am.th}>Category</th>
                    <th className={`${am.th} text-right`}>Default</th>
                    <th className={am.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {types.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/80">
                      <td className={`${am.td} font-mono text-xs`}>{row.code}</td>
                      <td className={`${am.td} font-semibold`}>{row.name}</td>
                      <td className={am.td}>{row.category.replace(/_/g, ' ')}</td>
                      <td className={`${am.td} text-right`}>{formatInr(row.defaultAmount)}</td>
                      <td className={am.td}>
                        <StatusBadge status={row.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : levies.length === 0 ? (
          <EmptyState>No fines applied yet. Use Add Fine to create one.</EmptyState>
        ) : (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead>
                <tr>
                  <th className={am.th}>Fine / Category</th>
                  <th className={am.th}>Student</th>
                  <th className={`${am.th} text-right`}>Amount</th>
                  <th className={am.th}>Reason</th>
                  <th className={am.th}>Status</th>
                  <th className={am.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {levies.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80">
                    <td className={am.td}>
                      <p className="font-semibold">{row.fineTypeName}</p>
                      <p className="text-[10px] text-slate-400">
                        {(row.fineCategory || '').replace(/_/g, ' ')}
                      </p>
                    </td>
                    <td className={am.td}>
                      <p className="font-semibold">{row.studentName}</p>
                      <p className="text-xs text-slate-500">
                        {row.className}
                        {row.sectionName ? `-${row.sectionName}` : ''}
                        {row.admissionNumber ? ` · ${row.admissionNumber}` : ''}
                      </p>
                      {row.status === 'PENDING_APPROVAL' && (
                        <p className="text-[10px] text-indigo-600 mt-0.5">
                          Approver: {row.pendingApproverRole || 'HOD of Finance'}
                          {row.pendingApproverName ? ` — ${row.pendingApproverName}` : ''}
                        </p>
                      )}
                    </td>
                    <td className={`${am.td} text-right font-bold`}>{formatInr(row.amount)}</td>
                    <td className={`${am.td} text-xs text-slate-600 max-w-[180px]`}>
                      <span className="line-clamp-2">{row.reason || '—'}</span>
                    </td>
                    <td className={am.td}>
                      <StatusBadge status={row.status} />
                    </td>
                    <td className={am.td}>
                      <div className="flex flex-wrap gap-1">
                        {row.status === 'PENDING_APPROVAL' && (
                          <>
                            <button
                              type="button"
                              onClick={() => void handleLevyAction('approve', row.id)}
                              className={`${am.btnSecondary} text-[10px] py-1 px-2 text-green-700`}
                            >
                              <Check size={10} /> Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => setRejectId(row.id)}
                              className={`${am.btnSecondary} text-[10px] py-1 px-2 text-red-700`}
                            >
                              <X size={10} /> Reject
                            </button>
                          </>
                        )}
                        {row.status === 'PENDING' && (
                          <>
                            <button
                              type="button"
                              onClick={() => void handleLevyAction('pay', row.id)}
                              className={`${am.btnSecondary} text-[10px] py-1 px-2 text-green-700`}
                            >
                              <Check size={10} /> Paid
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleLevyAction('waive', row.id)}
                              className={`${am.btnSecondary} text-[10px] py-1 px-2 text-purple-700`}
                            >
                              <Ban size={10} /> Waive
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Catalog: fine type definition */}
      <AcademicModal open={showTypeModal} onClose={() => setShowTypeModal(false)} title="Add Fine Type" large>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">Code</label>
              <input
                className={am.input}
                value={typeForm.code}
                onChange={(e) => setTypeForm((f) => ({ ...f, code: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Name</label>
              <input
                className={am.input}
                value={typeForm.name}
                onChange={(e) => setTypeForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">Category</label>
              <select
                className={`${am.select} w-full`}
                value={typeForm.category}
                onChange={(e) =>
                  setTypeForm((f) => ({ ...f, category: e.target.value as FeeFineCategory }))
                }
              >
                {FINE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Default Amount</label>
              <input
                type="number"
                className={am.input}
                value={typeForm.defaultAmount}
                onChange={(e) => setTypeForm((f) => ({ ...f, defaultAmount: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowTypeModal(false)} className={am.btnSecondary}>
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleCreateType()}
              className={am.btnPrimary}
              disabled={!typeForm.code || !typeForm.name}
            >
              Save
            </button>
          </div>
        </div>
      </AcademicModal>

      {/* Student fine — Save & Send for Approval */}
      <AcademicModal open={showLevyModal} onClose={() => setShowLevyModal(false)} title="Add Fine" large>
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">Class *</label>
              <select
                className={`${am.select} w-full`}
                value={className}
                onChange={(e) => {
                  setClassName(e.target.value);
                  setSectionName('');
                  setStudentKey('');
                }}
              >
                <option value="">Select class</option>
                {classOptions.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Section *</label>
              <select
                className={`${am.select} w-full`}
                value={sectionName}
                disabled={!className}
                onChange={(e) => {
                  setSectionName(e.target.value);
                  setStudentKey('');
                }}
              >
                <option value="">Select section</option>
                {sectionOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Student Name *</label>
              <select
                className={`${am.select} w-full`}
                value={studentKey}
                disabled={!className || !sectionName}
                onChange={(e) => setStudentKey(e.target.value)}
              >
                <option value="">Select student</option>
                {studentOptions.map((s) => (
                  <option key={feeStudentOptionKey(s)} value={feeStudentOptionKey(s)}>
                    {s.studentName}
                    {s.admissionNumber ? ` (${s.admissionNumber})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">Category *</label>
            <select
              className={`${am.select} w-full`}
              value={levyForm.category}
              onChange={(e) => {
                const category = e.target.value as FeeFineCategory;
                const match = types.find((t) => t.category === category && t.status === 'ACTIVE');
                setLevyForm((f) => ({
                  ...f,
                  category,
                  amount: match ? String(match.defaultAmount) : f.amount,
                }));
              }}
            >
              {FINE_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">Fine Amount *</label>
            <input
              type="number"
              min={0}
              className={am.input}
              value={levyForm.amount}
              onChange={(e) => setLevyForm((f) => ({ ...f, amount: e.target.value }))}
              placeholder="Enter fine amount"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">Reason for fine *</label>
            <input
              className={am.input}
              value={levyForm.reason}
              onChange={(e) => setLevyForm((f) => ({ ...f, reason: e.target.value }))}
              placeholder="Why is this fine being applied?"
            />
          </div>

          <p className="text-[11px] text-slate-400">
            On submit, approval is routed to the person mapped as HOD of Finance under HR → Approval Hierarchy.
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowLevyModal(false)} className={am.btnSecondary}>
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleLevy()}
              className={am.btnPrimary}
              disabled={saving || !studentKey || !levyForm.amount || !levyForm.reason.trim()}
            >
              <Send size={14} /> Save &amp; Send for Approval
            </button>
          </div>
        </div>
      </AcademicModal>

      <AcademicModal open={!!rejectId} onClose={() => setRejectId(null)} title="Reject Fine">
        <div className="space-y-3">
          <textarea
            className={am.input}
            rows={3}
            placeholder="Rejection reason"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setRejectId(null)} className={am.btnSecondary}>
              Cancel
            </button>
            <button
              type="button"
              onClick={() => rejectId && void handleLevyAction('reject', rejectId)}
              className={am.btnPrimary}
            >
              Reject
            </button>
          </div>
        </div>
      </AcademicModal>
    </AcademicPageShell>
  );
}
