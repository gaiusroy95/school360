import { useCallback, useEffect, useMemo, useState } from 'react';
import { Award, Check, Plus, RefreshCcw, Send, X } from 'lucide-react';
import {
  fetchFeeCollectionMeta,
  feeStudentOptionKey,
  type FeeStudent,
} from '../../../lib/feeCollectionServices';
import {
  approveFeeScholarship,
  approveScholarshipAward,
  awardScholarship,
  createFeeScholarship,
  fetchFeeDashboardMeta,
  fetchStudentScholarshipContext,
  formatInr,
  listFeeScholarships,
  listScholarshipAwards,
  rejectFeeScholarship,
  rejectScholarshipAward,
  submitFeeScholarship,
  type FeeScholarship,
  type FeeScholarshipAward,
  type StudentScholarshipContext,
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

function computeSuggestedAmount(
  scholarship: FeeScholarship | undefined,
  totalDueFees: number,
): number {
  if (!scholarship) return 0;
  const waiverType = (scholarship.waiverType || '').toUpperCase();
  let amount = 0;
  if (waiverType === 'PERCENT' || waiverType === 'PERCENTAGE') {
    amount = Math.round(((Math.max(totalDueFees, 0) * scholarship.waiverValue) / 100) * 100) / 100;
  } else {
    amount = scholarship.waiverValue;
  }
  if (scholarship.budgetRemaining > 0 && amount > scholarship.budgetRemaining) {
    amount = scholarship.budgetRemaining;
  }
  return amount;
}

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
  const [saving, setSaving] = useState(false);
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

  const [students, setStudents] = useState<FeeStudent[]>([]);
  const [className, setClassName] = useState('');
  const [sectionName, setSectionName] = useState('');
  const [studentKey, setStudentKey] = useState('');
  const [contextLoading, setContextLoading] = useState(false);
  const [studentContext, setStudentContext] = useState<StudentScholarshipContext | null>(null);
  const [awardForm, setAwardForm] = useState({
    scholarshipId: '',
    amount: '',
    reason: '',
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

  const approvedScholarships = scholarships.filter(
    (s) => s.status === 'APPROVED' || s.status === 'ACTIVE',
  );

  const selectedScholarship = useMemo(
    () => approvedScholarships.find((s) => s.id === awardForm.scholarshipId),
    [approvedScholarships, awardForm.scholarshipId],
  );

  const openAwardModal = async () => {
    setAwardForm({ scholarshipId: '', amount: '', reason: '' });
    setClassName('');
    setSectionName('');
    setStudentKey('');
    setStudentContext(null);
    setShowAwardModal(true);
    try {
      const meta = await fetchFeeCollectionMeta();
      setStudents(meta.students || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load students');
    }
  };

  useEffect(() => {
    if (!showAwardModal || !selectedStudent) {
      setStudentContext(null);
      return;
    }
    let cancelled = false;
    setContextLoading(true);
    void fetchStudentScholarshipContext({
      academicYear,
      studentId: selectedStudent.studentId || undefined,
      admissionNumber: selectedStudent.admissionNumber || undefined,
    })
      .then((data) => {
        if (cancelled) return;
        setStudentContext(data);
      })
      .catch((e) => {
        if (!cancelled) {
          setStudentContext(null);
          setError(e instanceof Error ? e.message : 'Failed to load student scholarship context');
        }
      })
      .finally(() => {
        if (!cancelled) setContextLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showAwardModal, selectedStudent, academicYear]);

  useEffect(() => {
    if (!showAwardModal || !selectedScholarship || !studentContext) return;
    const suggested = computeSuggestedAmount(selectedScholarship, studentContext.totalDueFees);
    if (suggested > 0) {
      setAwardForm((f) => ({ ...f, amount: String(suggested) }));
    }
  }, [showAwardModal, selectedScholarship, studentContext]);

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
    if (!selectedStudent) {
      setError('Select class, section and student');
      return;
    }
    if (!awardForm.scholarshipId) {
      setError('Select a scholarship');
      return;
    }
    if (!awardForm.reason.trim()) {
      setError('Reason for scholarship is required');
      return;
    }
    setSaving(true);
    try {
      await awardScholarship({
        scholarshipId: awardForm.scholarshipId,
        academicYear,
        studentId: selectedStudent.studentId || undefined,
        studentName: selectedStudent.studentName,
        admissionNumber: selectedStudent.admissionNumber,
        className: selectedStudent.className,
        sectionName: selectedStudent.sectionName,
        amount: awardForm.amount ? Number(awardForm.amount) : undefined,
        reason: awardForm.reason.trim(),
        totalDueFees: studentContext?.totalDueFees ?? 0,
        entranceTestResult: studentContext?.entranceTestResult || '',
        lastClassPercent: studentContext?.lastClassPercent ?? 0,
        lastClassTotal: studentContext?.lastClassTotal ?? 0,
        lastClassObtain: studentContext?.lastClassObtain ?? 0,
      });
      setMessage('Scholarship award saved and sent for Principal approval');
      setShowAwardModal(false);
      setTab('Awards');
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Award failed');
    } finally {
      setSaving(false);
    }
  };

  const runScholarshipAction = async (action: 'submit' | 'approve' | 'reject', id: string) => {
    setError('');
    try {
      if (action === 'submit') await submitFeeScholarship(id);
      else if (action === 'approve') await approveFeeScholarship(id);
      else {
        if (!rejectReason.trim()) {
          setError('Rejection reason required');
          return;
        }
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
        if (!rejectReason.trim()) {
          setError('Rejection reason required');
          return;
        }
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

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="Fees & Finance"
        title="Scholarship"
        subtitle="Award scholarships from student records — due fees, entrance results, and marks auto-filled. Principal approval required."
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
              <button
                type="button"
                onClick={() => void openAwardModal()}
                className={am.btnPrimary}
                disabled={approvedScholarships.length === 0}
              >
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

        {loading ? (
          <AcademicLoading />
        ) : tab === 'Scholarship Accounts' ? (
          scholarships.length === 0 ? (
            <EmptyState>No scholarship accounts yet.</EmptyState>
          ) : (
            <div className={am.tableWrap}>
              <table className="w-full">
                <thead>
                  <tr>
                    <th className={am.th}>Code</th>
                    <th className={am.th}>Name</th>
                    <th className={am.th}>Waiver</th>
                    <th className={`${am.th} text-right`}>Budget</th>
                    <th className={`${am.th} text-right`}>Used</th>
                    <th className={`${am.th} text-right`}>Remaining</th>
                    <th className={am.th}>Status</th>
                    <th className={am.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {scholarships.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/80">
                      <td className={`${am.td} font-mono text-xs`}>{row.code}</td>
                      <td className={`${am.td} font-semibold`}>{row.name}</td>
                      <td className={am.td}>
                        {row.waiverType === 'PERCENT' || row.waiverType === 'PERCENTAGE'
                          ? `${row.waiverValue}%`
                          : formatInr(row.waiverValue)}
                      </td>
                      <td className={`${am.td} text-right`}>{formatInr(row.budgetAllocated)}</td>
                      <td className={`${am.td} text-right text-orange-600`}>{formatInr(row.budgetUsed)}</td>
                      <td className={`${am.td} text-right text-green-700 font-bold`}>
                        {formatInr(row.budgetRemaining)}
                      </td>
                      <td className={am.td}>
                        <StatusBadge status={row.status} />
                      </td>
                      <td className={am.td}>
                        <div className="flex flex-wrap gap-1">
                          {row.status === 'DRAFT' && (
                            <button
                              type="button"
                              onClick={() => void runScholarshipAction('submit', row.id)}
                              className={`${am.btnSecondary} text-[10px] py-1 px-2`}
                            >
                              <Send size={10} /> Submit
                            </button>
                          )}
                          {row.status === 'PENDING_APPROVAL' && (
                            <>
                              <button
                                type="button"
                                onClick={() => void runScholarshipAction('approve', row.id)}
                                className={`${am.btnSecondary} text-[10px] py-1 px-2 text-green-700`}
                              >
                                <Check size={10} /> Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => setRejectId({ type: 'scholarship', id: row.id })}
                                className={`${am.btnSecondary} text-[10px] py-1 px-2 text-red-700`}
                              >
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
                  <th className={`${am.th} text-right`}>Amount</th>
                  <th className={am.th}>Approver</th>
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
                      <p className="text-xs text-slate-500">
                        {[row.className, row.sectionName].filter(Boolean).join(' · ')}
                      </p>
                    </td>
                    <td className={`${am.td} text-right font-bold`}>{formatInr(row.amount)}</td>
                    <td className={am.td}>
                      {row.status === 'PENDING_APPROVAL' ? (
                        <div className="text-xs text-slate-600">
                          <p className="font-semibold">{row.pendingApproverRole || 'Principal'}</p>
                          {row.pendingApproverName ? <p>{row.pendingApproverName}</p> : null}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className={am.td}>
                      <StatusBadge status={row.status} />
                    </td>
                    <td className={am.td}>
                      {row.status === 'PENDING_APPROVAL' && (
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => void runAwardAction('approve', row.id)}
                            className={`${am.btnSecondary} text-[10px] py-1 px-2 text-green-700`}
                          >
                            <Check size={10} /> Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => setRejectId({ type: 'award', id: row.id })}
                            className={`${am.btnSecondary} text-[10px] py-1 px-2 text-red-700`}
                          >
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
              <input
                className={am.input}
                value={schForm.name}
                onChange={(e) => setSchForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Code</label>
              <input
                className={am.input}
                value={schForm.code}
                onChange={(e) => setSchForm((f) => ({ ...f, code: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">Waiver Type</label>
              <select
                className={`${am.select} w-full`}
                value={schForm.waiverType}
                onChange={(e) => setSchForm((f) => ({ ...f, waiverType: e.target.value }))}
              >
                <option value="PERCENT">Percent</option>
                <option value="FLAT">Flat Amount</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Waiver Value</label>
              <input
                type="number"
                className={am.input}
                value={schForm.waiverValue}
                onChange={(e) => setSchForm((f) => ({ ...f, waiverValue: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Budget Allocated</label>
            <input
              type="number"
              className={am.input}
              value={schForm.budgetAllocated}
              onChange={(e) => setSchForm((f) => ({ ...f, budgetAllocated: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowScholarshipModal(false)} className={am.btnSecondary}>
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleCreateScholarship()}
              className={am.btnPrimary}
              disabled={!schForm.name}
            >
              Save
            </button>
          </div>
        </div>
      </AcademicModal>

      <AcademicModal open={showAwardModal} onClose={() => setShowAwardModal(false)} title="Award Scholarship" large>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
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
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Section *</label>
              <select
                className={`${am.select} w-full`}
                value={sectionName}
                onChange={(e) => {
                  setSectionName(e.target.value);
                  setStudentKey('');
                }}
                disabled={!className}
              >
                <option value="">Select section</option>
                {sectionOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Student Name *</label>
              <select
                className={`${am.select} w-full`}
                value={studentKey}
                onChange={(e) => setStudentKey(e.target.value)}
                disabled={!className || !sectionName}
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

          <p className="text-sm text-slate-700">
            Total Due Fees:{' '}
            <span className="font-bold text-indigo-700 underline decoration-indigo-300">
              {contextLoading
                ? 'Loading…'
                : selectedStudent
                  ? formatInr(studentContext?.totalDueFees ?? 0)
                  : 'Select a student'}
            </span>
            <span className="ml-2 text-[11px] text-slate-400">Auto populated from accounts</span>
          </p>

          <p className="text-sm text-slate-700">
            Entrance Test Result:{' '}
            <span className="font-bold text-indigo-700 underline decoration-indigo-300">
              {contextLoading
                ? 'Loading…'
                : selectedStudent
                  ? studentContext?.entranceTestResult || 'Not available'
                  : 'Select a student'}
            </span>
            <span className="ml-2 text-[11px] text-slate-400">Auto populated from entrance Test</span>
          </p>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Last Class Marks</label>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <input
                  className={am.input}
                  readOnly
                  value={
                    selectedStudent && !contextLoading
                      ? studentContext?.lastClassPercent
                        ? `${studentContext.lastClassPercent}% score`
                        : '% score'
                      : '% score'
                  }
                />
              </div>
              <div>
                <input
                  className={am.input}
                  readOnly
                  value={
                    selectedStudent && !contextLoading
                      ? studentContext?.lastClassTotal
                        ? `Total ${studentContext.lastClassTotal}`
                        : 'Total'
                      : 'Total'
                  }
                />
              </div>
              <div>
                <input
                  className={am.input}
                  readOnly
                  value={
                    selectedStudent && !contextLoading
                      ? studentContext?.lastClassObtain
                        ? `Obtain ${studentContext.lastClassObtain}`
                        : 'Obtain'
                      : 'Obtain'
                  }
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">Scholarship *</label>
            <select
              className={`${am.select} w-full`}
              value={awardForm.scholarshipId}
              onChange={(e) => setAwardForm((f) => ({ ...f, scholarshipId: e.target.value }))}
            >
              <option value="">Select scholarship</option>
              {approvedScholarships.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} (remaining: {formatInr(s.budgetRemaining)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">Award Amount</label>
            <input
              type="number"
              min={0}
              className={am.input}
              value={awardForm.amount}
              onChange={(e) => setAwardForm((f) => ({ ...f, amount: e.target.value }))}
              placeholder="Auto from scholarship waiver × due fees"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">Reason for Scholarship *</label>
            <textarea
              className={am.input}
              rows={3}
              value={awardForm.reason}
              onChange={(e) => setAwardForm((f) => ({ ...f, reason: e.target.value }))}
              placeholder="Justify why this scholarship should be awarded"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowAwardModal(false)} className={am.btnSecondary}>
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleAward()}
              className={am.btnPrimary}
              disabled={
                saving ||
                !studentKey ||
                !awardForm.scholarshipId ||
                !awardForm.reason.trim()
              }
            >
              <Send size={14} /> Save &amp; Send for Approval
            </button>
          </div>
        </div>
      </AcademicModal>

      <AcademicModal open={!!rejectId} onClose={() => setRejectId(null)} title="Reject">
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
