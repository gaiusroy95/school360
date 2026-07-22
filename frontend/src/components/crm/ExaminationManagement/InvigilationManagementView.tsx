import { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2, Clock, Loader2, Play, Plus, RefreshCw, RotateCw,
  Send, Smartphone, UserCheck, Users,
} from 'lucide-react';
import {
  completeInvigilation,
  createInvigilationPlan,
  fetchInvigilationMeta,
  fetchInvigilationPlan,
  fetchInvigilationPlans,
  publishInvigilationToMobile,
  rotateInvigilationPlan,
  seedInvigilation,
  startInvigilation,
  updateInvigilationDuty,
  type InvigilationPlanDetail,
  type InvigilationPlanSummary,
} from '../../../lib/examinationServices';
import { AcademicLoading, AcademicModal, AcademicPageHeader, AcademicPageShell, am } from '../AcademicManagement/AcademicManagementUi';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  SCHEDULED: 'bg-blue-100 text-blue-800',
  ROTATED: 'bg-purple-100 text-purple-800',
  PUBLISHED: 'bg-emerald-100 text-emerald-800',
  IN_PROGRESS: 'bg-orange-100 text-orange-800',
  COMPLETED: 'bg-slate-200 text-slate-600',
};

const ROLE_COLORS: Record<string, string> = {
  PRIMARY: 'bg-blue-50 text-blue-800 border-blue-200',
  CO_INVIGILATOR: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  FLOOR_SUPERVISOR: 'bg-amber-50 text-amber-800 border-amber-200',
  RELIEF: 'bg-slate-50 text-slate-700 border-slate-200',
};

export function InvigilationManagementView() {
  const [meta, setMeta] = useState<Awaited<ReturnType<typeof fetchInvigilationMeta>> | null>(null);
  const [plans, setPlans] = useState<InvigilationPlanSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<InvigilationPlanDetail | null>(null);
  const [dutiesByRoom, setDutiesByRoom] = useState<
    { roomNumber: string; buildingName: string; areaLabel: string; duties: InvigilationPlanDetail['duties'] }[]
  >([]);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [publishResult, setPublishResult] = useState<Awaited<ReturnType<typeof publishInvigilationToMobile>> | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);

  const [title, setTitle] = useState('Exam Invigilation Duty');
  const [examDate, setExamDate] = useState(new Date().toISOString().slice(0, 10));
  const [seatingPlanId, setSeatingPlanId] = useState('');
  const [teamSize, setTeamSize] = useState(2);
  const [autoRotate, setAutoRotate] = useState(true);

  const loadPlans = useCallback(async (year?: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      let m = meta;
      if (!m) {
        m = await fetchInvigilationMeta();
        setMeta(m);
        setAcademicYear(m.defaultAcademicYear);
        setTeamSize(m.teamSizeDefault);
        if (m.upcomingExamDates.length) setExamDate(m.upcomingExamDates[0].date);
      }
      const yearFilter = year || academicYear || m.defaultAcademicYear;
      let data = await fetchInvigilationPlans(yearFilter);
      if (!data.plans.length) {
        await seedInvigilation(yearFilter);
        data = await fetchInvigilationPlans(yearFilter);
      }
      setPlans(data.plans);
      if (!selectedId && data.plans.length) setSelectedId(data.plans[0].id);
      else if (selectedId && !data.plans.find((p) => p.id === selectedId) && data.plans.length) {
        setSelectedId(data.plans[0].id);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load invigilation plans');
    } finally {
      setLoading(false);
    }
  }, [meta, academicYear, selectedId]);

  const loadDetail = useCallback(async (planId: string) => {
    setDetailLoading(true);
    try {
      const data = await fetchInvigilationPlan(planId);
      setDetail(data.plan);
      setDutiesByRoom(data.dutiesByRoom);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load plan detail');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => { void loadPlans(); }, [loadPlans]);
  useEffect(() => {
    if (selectedId) void loadDetail(selectedId);
    else {
      setDetail(null);
      setDutiesByRoom([]);
    }
  }, [selectedId, loadDetail]);

  const handleCreate = async () => {
    if (!title.trim()) return setErrorMsg('Title is required');
    setActionLoading(true);
    try {
      const result = await createInvigilationPlan({
        academicYear,
        title: title.trim(),
        examDate,
        seatingPlanId: seatingPlanId || undefined,
        teamSize,
        autoRotateEnabled: autoRotate,
      });
      setCreateOpen(false);
      setSuccessMsg(`Invigilation created — ${result.plan.dutyCount} duties assigned in teams of ${teamSize}`);
      await loadPlans(academicYear);
      setSelectedId(result.plan.id);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create invigilation plan');
    } finally {
      setActionLoading(false);
    }
  };

  const runAction = async (action: () => Promise<{ message?: string }>) => {
    if (!selectedId) return;
    setActionLoading(true);
    setErrorMsg(null);
    try {
      const result = await action();
      if (result.message) setSuccessMsg(result.message);
      await loadPlans(academicYear);
      await loadDetail(selectedId);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!selectedId) return;
    setActionLoading(true);
    try {
      const result = await publishInvigilationToMobile(selectedId);
      setPublishResult(result);
      setPublishOpen(true);
      setSuccessMsg(result.message);
      await loadPlans(academicYear);
      await loadDetail(selectedId);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Publish failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusChange = async (dutyId: string, status: string) => {
    if (!selectedId) return;
    setActionLoading(true);
    try {
      const result = await updateInvigilationDuty(selectedId, dutyId, { status });
      setSuccessMsg(result.message);
      await loadDetail(selectedId);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !plans.length) {
    return (
      <AcademicPageShell>
        <AcademicLoading label="Loading invigilation management…" />
      </AcademicPageShell>
    );
  }

  const staffPool = (meta?.teachers.length || 0) + (meta?.staff.length || 0);

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="Examination Management › Invigilation Management"
        title="Invigilation Management"
        subtitle="Schedule exam duties for all staff. Teams auto-rotate by area every morning at 5:00 AM on exam dates and sync to mobile app."
        actions={(
          <div className="flex flex-wrap gap-2">
            <select
              className={am.select}
              value={academicYear}
              onChange={(e) => { setAcademicYear(e.target.value); void loadPlans(e.target.value); }}
            >
              {(meta?.academicYears || [academicYear]).map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <button type="button" className={am.btnSecondary} onClick={() => void loadPlans(academicYear)}>
              <RefreshCw size={14} /> Refresh
            </button>
            <button type="button" className={am.btnPrimary} onClick={() => setCreateOpen(true)}>
              <Plus size={14} /> Create Invigilation
            </button>
          </div>
        )}
      />

      <div className={am.content}>
        {errorMsg && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{errorMsg}</p>}
        {successMsg && (
          <p className="text-xs text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
            {successMsg}
            <button type="button" className="ml-2 underline" onClick={() => setSuccessMsg(null)}>Dismiss</button>
          </p>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className={`${am.card} ${am.cardPad} flex items-center gap-3`}>
            <Users size={18} className="text-blue-600 shrink-0" />
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase">Staff Pool</p>
              <p className="text-2xl font-bold">{staffPool}</p>
            </div>
          </div>
          <div className={`${am.card} ${am.cardPad} flex items-center gap-3`}>
            <Clock size={18} className="text-amber-600 shrink-0" />
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase">Auto Rotation</p>
              <p className="text-sm font-bold">5:00 AM IST</p>
            </div>
          </div>
          <div className={`${am.card} ${am.cardPad} flex items-center gap-3`}>
            <Smartphone size={18} className="text-emerald-600 shrink-0" />
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase">Mobile Sync</p>
              <p className="text-sm font-bold">On Publish</p>
            </div>
          </div>
          <div className={`${am.card} ${am.cardPad} flex items-center gap-3`}>
            <UserCheck size={18} className="text-purple-600 shrink-0" />
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase">Plans</p>
              <p className="text-2xl font-bold">{plans.length}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-4 space-y-2">
            <h3 className="text-sm font-semibold text-slate-700">Invigilation Plans</h3>
            {plans.map((plan) => (
              <button
                key={plan.id}
                type="button"
                onClick={() => setSelectedId(plan.id)}
                className={`w-full text-left p-3 rounded-lg border transition ${
                  selectedId === plan.id ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm">{plan.title}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${STATUS_COLORS[plan.status] || ''}`}>
                    {plan.statusLabel}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">{plan.recordId} · {plan.examDateDisplay}</p>
                <p className="text-xs text-slate-500">
                  {plan.dutyCount} duties · Teams of {plan.teamSize}
                  {plan.publishedToMobile && ' · On Mobile'}
                </p>
              </button>
            ))}
          </div>

          <div className="lg:col-span-8">
            {!detail && !detailLoading && (
              <div className="border rounded-lg p-8 text-center text-slate-500">Select an invigilation plan</div>
            )}
            {detailLoading && <AcademicLoading label="Loading duties…" />}
            {detail && !detailLoading && (
              <div className="space-y-4">
                <div className="border rounded-lg p-4 bg-white">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold">{detail.title}</h3>
                      <p className="text-sm text-slate-500">
                        {detail.recordId} · {detail.examDateDisplay} · Rotation #{detail.rotationOffset}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[detail.status]}`}>
                          {detail.statusLabel}
                        </span>
                        {detail.autoRotateEnabled && (
                          <span className="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-800">
                            Auto 5 AM rotation
                          </span>
                        )}
                        {detail.publishedToMobile && (
                          <span className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-800">
                            Published to Mobile
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {detail.canRotate && (
                        <button
                          type="button"
                          className={am.btnSecondary}
                          disabled={actionLoading}
                          onClick={() => void runAction(() => rotateInvigilationPlan(detail.id))}
                        >
                          <RotateCw size={14} /> Rotate Teams
                        </button>
                      )}
                      {detail.canPublish && (
                        <button
                          type="button"
                          className={am.btnPrimary}
                          disabled={actionLoading}
                          onClick={() => void handlePublish()}
                        >
                          {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                          Publish to Mobile
                        </button>
                      )}
                      {detail.canStart && (
                        <button
                          type="button"
                          className={am.btnPrimary}
                          disabled={actionLoading}
                          onClick={() => void runAction(() => startInvigilation(detail.id))}
                        >
                          <Play size={14} /> Start
                        </button>
                      )}
                      {detail.status === 'IN_PROGRESS' && (
                        <button
                          type="button"
                          className={am.btnSecondary}
                          disabled={actionLoading}
                          onClick={() => void runAction(() => completeInvigilation(detail.id))}
                        >
                          <CheckCircle2 size={14} /> Complete
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {dutiesByRoom.map(({ roomNumber, buildingName, areaLabel, duties }) => (
                  <div key={roomNumber} className="border rounded-lg overflow-hidden bg-white">
                    <div className="px-4 py-2 bg-slate-50 border-b">
                      <span className="font-medium text-sm">{areaLabel || roomNumber}</span>
                      {buildingName && <span className="text-xs text-slate-500 ml-2">({buildingName})</span>}
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs text-slate-500 border-b">
                            <th className="px-3 py-2">Teacher / Staff</th>
                            <th className="px-3 py-2">Role</th>
                            <th className="px-3 py-2">Room</th>
                            <th className="px-3 py-2">Team</th>
                            <th className="px-3 py-2">Shift</th>
                            <th className="px-3 py-2">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {duties.map((d) => (
                            <tr key={d.id} className="border-b last:border-0">
                              <td className="px-3 py-2">
                                <div className="font-medium">{d.personName}</div>
                                <div className="text-xs text-slate-500">{d.designation} · {d.department}</div>
                                <div className="text-xs text-slate-400">{d.employeeCode}</div>
                              </td>
                              <td className="px-3 py-2">
                                <span className={`text-[10px] px-2 py-0.5 rounded border ${ROLE_COLORS[d.role]}`}>
                                  {d.roleLabel}
                                </span>
                              </td>
                              <td className="px-3 py-2 font-mono text-xs">{d.roomNumber}</td>
                              <td className="px-3 py-2 text-xs">Team {d.teamNumber}</td>
                              <td className="px-3 py-2 text-xs">{d.shiftStart}–{d.shiftEnd}</td>
                              <td className="px-3 py-2">
                                {detail.status === 'IN_PROGRESS' ? (
                                  <select
                                    className="text-xs border rounded px-1 py-0.5"
                                    value={d.status}
                                    disabled={actionLoading}
                                    onChange={(e) => void handleStatusChange(d.id, e.target.value)}
                                  >
                                    <option value="ASSIGNED">Assigned</option>
                                    <option value="PRESENT">Present</option>
                                    <option value="ABSENT">Absent</option>
                                    <option value="REPLACED">Replaced</option>
                                  </select>
                                ) : (
                                  <span className="text-xs">{d.status}</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <AcademicModal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Invigilation Plan" large>
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Assign teachers and staff to exam rooms in rotating teams. Duties auto-rotate every morning at 5:00 AM on scheduled exam dates.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-slate-600">Title</span>
              <input className={am.input} value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <label className="block">
              <span className="text-xs text-slate-600">Exam Date</span>
              <input type="date" className={am.input} value={examDate} onChange={(e) => setExamDate(e.target.value)} />
            </label>
            <label className="block">
              <span className="text-xs text-slate-600">Link Seating Plan</span>
              <select className={am.select} value={seatingPlanId} onChange={(e) => setSeatingPlanId(e.target.value)}>
                <option value="">Auto-detect rooms</option>
                {(meta?.seatingPlans || []).map((p) => (
                  <option key={p.id} value={p.id}>{p.title} ({p.examDate})</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-slate-600">Team Size</span>
              <select className={am.select} value={teamSize} onChange={(e) => setTeamSize(Number(e.target.value))}>
                {[2, 3, 4].map((n) => <option key={n} value={n}>{n} per team</option>)}
              </select>
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={autoRotate} onChange={(e) => setAutoRotate(e.target.checked)} />
            Enable auto rotation at 5:00 AM on exam dates
          </label>
          <p className="text-xs text-slate-500">
            Available staff: {meta?.teachers.length || 0} teachers, {meta?.staff.length || 0} staff members
          </p>
          <div className="flex justify-end gap-2">
            <button type="button" className={am.btnSecondary} onClick={() => setCreateOpen(false)}>Cancel</button>
            <button type="button" className={am.btnPrimary} disabled={actionLoading} onClick={() => void handleCreate()}>
              {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Create & Assign Duties
            </button>
          </div>
        </div>
      </AcademicModal>

      <AcademicModal open={publishOpen} onClose={() => setPublishOpen(false)} title="Published to Mobile App">
        {publishResult && (
          <div className="space-y-3">
            <p className="text-sm text-emerald-700 font-medium">{publishResult.message}</p>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="border rounded p-3">
                <p className="text-2xl font-bold">{publishResult.notifications.pushCount}</p>
                <p className="text-xs text-slate-500">Push</p>
              </div>
              <div className="border rounded p-3">
                <p className="text-2xl font-bold">{publishResult.notifications.whatsappCount}</p>
                <p className="text-xs text-slate-500">WhatsApp</p>
              </div>
              <div className="border rounded p-3">
                <p className="text-2xl font-bold">{publishResult.notifications.total}</p>
                <p className="text-xs text-slate-500">Total</p>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Teachers and staff can view their room, role, and area on the mobile app.
            </p>
            <div className="flex justify-end">
              <button type="button" className={am.btnPrimary} onClick={() => setPublishOpen(false)}>Done</button>
            </div>
          </div>
        )}
      </AcademicModal>
    </AcademicPageShell>
  );
}
