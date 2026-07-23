import { useCallback, useEffect, useState } from 'react';
import { Award, Check, Plus, RefreshCcw, Send, X } from 'lucide-react';
import {
  approveFeeScholarship,
  approveScholarshipAward,
  awardScholarship,
  createFeeScholarship,
  fetchFeeDashboardMeta,
  formatInr,
  listFeeScholarships,
  listScholarshipAwards,
  rejectFeeScholarship,
  rejectScholarshipAward,
  submitFeeScholarship,
  type FeeScholarship,
  type FeeScholarshipAward,
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

export function ScholarshipView() {
  const [tab, setTab] = useState('Scholarship Accounts');
  const [scholarships, setScholarships] = useState<FeeScholarship[]>([]);
  const [awards, setAwards] = useState<FeeScholarshipAward[]>([]);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showScholarshipModal, setShowScholarshipModal] = useState(false);
  const [showAwardModal, setShowAwardModal] = useState(false);
  const [rejectId, setRejectId] = useState<{ type: 'scholarship' | 'award'; id: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [schForm, setSchForm] = useState({
    name: '',
    code: '',
    waiverType: 'PERCENT',
    waiverValue: '',
    budgetAllocated: '',
    applicableFor: '',
    description: '',
  });
  const [awardForm, setAwardForm] = useState({
    scholarshipId: '',
    studentName: '',
    admissionNumber: '',
    className: '',
    amount: '',
    remarks: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const meta = await fetchFeeDashboardMeta();
      if (meta.defaultAcademicYear) setAcademicYear((y) => y || meta.defaultAcademicYear);
      const [s, a] = await Promise.all([
        listFeeScholarships({ academicYear }),
        listScholarshipAwards({ academicYear }),
      ]);
      setScholarships(s);
      setAwards(a);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load scholarships');
    } finally {
      setLoading(false);
    }
  }, [academicYear]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreateScholarship = async () => {
    setError('');
    try {
      await createFeeScholarship({
        name: schForm.name,
        code: schForm.code || undefined,
        academicYear,
        waiverType: schForm.waiverType,
        waiverValue: schForm.waiverValue ? Number(schForm.waiverValue) : undefined,
        budgetAllocated: schForm.budgetAllocated ? Number(schForm.budgetAllocated) : undefined,
        applicableFor: schForm.applicableFor || undefined,
        description: schForm.description || undefined,
      });
      setMessage('Scholarship account created');
      setShowScholarshipModal(false);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed');
    }
  };

  const handleAward = async () => {
    setError('');
    try {
      await awardScholarship({
        scholarshipId: awardForm.scholarshipId,
        academicYear,
        studentName: awardForm.studentName,
        admissionNumber: awardForm.admissionNumber || undefined,
        className: awardForm.className || undefined,
        amount: awardForm.amount ? Number(awardForm.amount) : undefined,
        remarks: awardForm.remarks || undefined,
      });
      setMessage('Scholarship awarded to student');
      setShowAwardModal(false);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Award failed');
    }
  };

  const runScholarshipAction = async (action: 'submit' | 'approve' | 'reject', id: string) => {
    setError('');
    try {
      if (action === 'submit') await submitFeeScholarship(id);
      else if (action === 'approve') await approveFeeScholarship(id);
      else {
        if (!rejectReason.trim()) { setError('Rejection reason required'); return; }
        await rejectFeeScholarship(id, rejectReason);
        setRejectId(null);
        setRejectReason('');
      }
      setMessage(`Scholarship ${action === 'submit' ? 'submitted' : action + 'd'}`);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    }
  };

  const runAwardAction = async (action: 'approve' | 'reject', id: string) => {
    setError('');
    try {
      if (action === 'approve') await approveScholarshipAward(id);
      else {
        if (!rejectReason.trim()) { setError('Rejection reason required'); return; }
        await rejectScholarshipAward(id, rejectReason);
        setRejectId(null);
        setRejectReason('');
      }
      setMessage(`Award ${action}d`);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    }
  };

  const approvedScholarships = scholarships.filter((s) => s.status === 'APPROVED' || s.status === 'ACTIVE');

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="Fees & Finance"
        title="Scholarship"
        subtitle="Manage scholarship budgets and student awards."
        actions={
          <>
            <button type="button" onClick={() => void load()} className={am.btnSecondary}>
              <RefreshCcw size={14} /> Refresh
            </button>
            {tab === 'Scholarship Accounts' ? (
              <button type="button" onClick={() => setShowScholarshipModal(true)} className={am.btnPrimary}>
                <Plus size={14} /> Create Scholarship
              </button>
            ) : (
              <button type="button" onClick={() => setShowAwardModal(true)} className={am.btnPrimary} disabled={approvedScholarships.length === 0}>
                <Award size={14} /> Award Student
              </button>
            )}
          </>
        }
      />
      <div className={am.content}>
        <FeeTabs tabs={['Scholarship Accounts', 'Awards']} active={tab} onChange={setTab} />
        <FeeMessage message={message} type="success" />
        <FeeMessage message={error} type="error" />

        {loading ? <AcademicLoading /> : tab === 'Scholarship Accounts' ? (
          scholarships.length === 0 ? <EmptyState>No scholarship accounts yet.</EmptyState> : (
            <div className={am.tableWrap}>
              <table className="w-full">
                <thead>
                  <tr>
                    <th className={am.th}>Code</th>
                    <th className={am.th}>Name</th>
                    <th className={am.th}>Waiver</th>
                    <th className={am.th + ' text-right'}>Budget</th>
                    <th className={am.th + ' text-right'}>Used</th>
                    <th className={am.th + ' text-right'}>Remaining</th>
                    <th className={am.th}>Status</th>
                    <th className={am.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {scholarships.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/80">
                      <td className={am.td + ' font-mono text-xs'}>{row.code}</td>
                      <td className={am.td + ' font-semibold'}>{row.name}</td>
                      <td className={am.td}>
                        {row.waiverType === 'PERCENT' ? `${row.waiverValue}%` : formatInr(row.waiverValue)}
                      </td>
                      <td className={am.td + ' text-right'}>{formatInr(row.budgetAllocated)}</td>
                      <td className={am.td + ' text-right text-orange-600'}>{formatInr(row.budgetUsed)}</td>
                      <td className={am.td + ' text-right text-green-700 font-bold'}>{formatInr(row.budgetRemaining)}</td>
                      <td className={am.td}><StatusBadge status={row.status} /></td>
                      <td className={am.td}>
                        <div className="flex flex-wrap gap-1">
                          {row.status === 'DRAFT' && (
                            <button type="button" onClick={() => void runScholarshipAction('submit', row.id)} className={am.btnSecondary + ' text-[10px] py-1 px-2'}>
                              <Send size={10} /> Submit
                            </button>
                          )}
                          {row.status === 'PENDING_APPROVAL' && (
                            <>
                              <button type="button" onClick={() => void runScholarshipAction('approve', row.id)} className={am.btnSecondary + ' text-[10px] py-1 px-2 text-green-700'}>
                                <Check size={10} /> Approve
                              </button>
                              <button type="button" onClick={() => setRejectId({ type: 'scholarship', id: row.id })} className={am.btnSecondary + ' text-[10px] py-1 px-2 text-red-700'}>
                                <X size={10} /> Reject
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
          )
        ) : awards.length === 0 ? (
          <EmptyState>No scholarship awards yet.</EmptyState>
        ) : (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead>
                <tr>
                  <th className={am.th}>Scholarship</th>
                  <th className={am.th}>Student</th>
                  <th className={am.th + ' text-right'}>Amount</th>
                  <th className={am.th}>Status</th>
                  <th className={am.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {awards.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80">
                    <td className={am.td}>{row.scholarshipName}</td>
                    <td className={am.td}>
                      <p className="font-semibold">{row.studentName}</p>
                      <p className="text-xs text-slate-500">{row.className}</p>
                    </td>
                    <td className={am.td + ' text-right font-bold'}>{formatInr(row.amount)}</td>
                    <td className={am.td}><StatusBadge status={row.status} /></td>
                    <td className={am.td}>
                      {row.status === 'PENDING_APPROVAL' && (
                        <div className="flex gap-1">
                          <button type="button" onClick={() => void runAwardAction('approve', row.id)} className={am.btnSecondary + ' text-[10px] py-1 px-2 text-green-700'}>
                            <Check size={10} /> Approve
                          </button>
                          <button type="button" onClick={() => setRejectId({ type: 'award', id: row.id })} className={am.btnSecondary + ' text-[10px] py-1 px-2 text-red-700'}>
                            <X size={10} /> Reject
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

      <AcademicModal open={showScholarshipModal} onClose={() => setShowScholarshipModal(false)} title="Create Scholarship" large>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">Name *</label>
              <input className={am.input} value={schForm.name} onChange={(e) => setSchForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Code</label>
              <input className={am.input} value={schForm.code} onChange={(e) => setSchForm((f) => ({ ...f, code: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">Waiver Type</label>
              <select className={am.select + ' w-full'} value={schForm.waiverType} onChange={(e) => setSchForm((f) => ({ ...f, waiverType: e.target.value }))}>
                <option value="PERCENT">Percent</option>
                <option value="FLAT">Flat Amount</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Waiver Value</label>
              <input type="number" className={am.input} value={schForm.waiverValue} onChange={(e) => setSchForm((f) => ({ ...f, waiverValue: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Budget Allocated</label>
            <input type="number" className={am.input} value={schForm.budgetAllocated} onChange={(e) => setSchForm((f) => ({ ...f, budgetAllocated: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowScholarshipModal(false)} className={am.btnSecondary}>Cancel</button>
            <button type="button" onClick={() => void handleCreateScholarship()} className={am.btnPrimary} disabled={!schForm.name}>Save</button>
          </div>
        </div>
      </AcademicModal>

      <AcademicModal open={showAwardModal} onClose={() => setShowAwardModal(false)} title="Award Scholarship" large>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-600">Scholarship</label>
            <select className={am.select + ' w-full'} value={awardForm.scholarshipId} onChange={(e) => setAwardForm((f) => ({ ...f, scholarshipId: e.target.value }))}>
              <option value="">Select scholarship</option>
              {approvedScholarships.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} (remaining: {formatInr(s.budgetRemaining)})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">Student Name *</label>
              <input className={am.input} value={awardForm.studentName} onChange={(e) => setAwardForm((f) => ({ ...f, studentName: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Amount</label>
              <input type="number" className={am.input} value={awardForm.amount} onChange={(e) => setAwardForm((f) => ({ ...f, amount: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowAwardModal(false)} className={am.btnSecondary}>Cancel</button>
            <button type="button" onClick={() => void handleAward()} className={am.btnPrimary} disabled={!awardForm.scholarshipId || !awardForm.studentName}>Award</button>
          </div>
        </div>
      </AcademicModal>

      <AcademicModal open={!!rejectId} onClose={() => setRejectId(null)} title="Reject">
        <div className="space-y-3">
          <textarea className={am.input} rows={3} placeholder="Rejection reason" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setRejectId(null)} className={am.btnSecondary}>Cancel</button>
            <button
              type="button"
              onClick={() => {
                if (!rejectId) return;
                if (rejectId.type === 'scholarship') void runScholarshipAction('reject', rejectId.id);
                else void runAwardAction('reject', rejectId.id);
              }}
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
