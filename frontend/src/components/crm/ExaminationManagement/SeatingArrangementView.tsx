import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bell, CheckCircle2, DoorOpen, Loader2, MapPin, Play, Plus, RefreshCw,
  Send, Shuffle, Trash2, Users,
} from 'lucide-react';
import {
  completeExam,
  createSeatingPlan,
  fetchSeatingMeta,
  fetchSeatingPlan,
  fetchSeatingPlans,
  finalizeSeatingPlan,
  issueExamCall,
  seedSeating,
  startExam,
  updateAssignmentRoom,
  type SeatingPlanDetail,
  type SeatingPlanSummary,
  type SeatingRoomInput,
} from '../../../lib/examinationServices';
import { AcademicLoading, AcademicModal, AcademicPageHeader, AcademicPageShell, am } from '../AcademicManagement/AcademicManagementUi';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  FINALIZED: 'bg-blue-100 text-blue-800',
  EXAM_CALL_ISSUED: 'bg-amber-100 text-amber-800',
  IN_PROGRESS: 'bg-orange-100 text-orange-800',
  COMPLETED: 'bg-emerald-100 text-emerald-800',
};

function emptyRoom(): SeatingRoomInput {
  return { roomNumber: '', buildingName: '', capacity: 40, invigilatorName: '' };
}

export function SeatingArrangementView() {
  const [meta, setMeta] = useState<Awaited<ReturnType<typeof fetchSeatingMeta>> | null>(null);
  const [plans, setPlans] = useState<SeatingPlanSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SeatingPlanDetail | null>(null);
  const [notificationSummary, setNotificationSummary] = useState<
    { channel: string; recipientType: string; count: number }[]
  >([]);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [examCallResult, setExamCallResult] = useState<Awaited<ReturnType<typeof issueExamCall>> | null>(null);
  const [examCallOpen, setExamCallOpen] = useState(false);

  const [title, setTitle] = useState('Unit Test — Seating Arrangement');
  const [examDate, setExamDate] = useState(new Date().toISOString().slice(0, 10));
  const [seriesPrefix, setSeriesPrefix] = useState('SER');
  const [rooms, setRooms] = useState<SeatingRoomInput[]>([]);
  const [selectedRoomIds, setSelectedRoomIds] = useState<Set<number>>(new Set());

  const totalCapacity = useMemo(
    () => rooms.filter((_, i) => selectedRoomIds.has(i)).reduce((sum, r) => sum + (r.capacity || 0), 0),
    [rooms, selectedRoomIds],
  );

  const assignmentsByRoom = useMemo(() => {
    if (!detail) return [];
    const map = new Map<string, { room: typeof detail.rooms[0]; students: typeof detail.assignments }>();
    for (const room of detail.rooms) {
      map.set(room.id, { room, students: [] });
    }
    for (const a of detail.assignments) {
      const group = map.get(a.roomId);
      if (group) group.students.push(a);
    }
    return [...map.values()].filter((g) => g.students.length > 0 || detail.status === 'DRAFT');
  }, [detail]);

  const loadPlans = useCallback(async (year?: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      let m = meta;
      if (!m) {
        m = await fetchSeatingMeta();
        setMeta(m);
        setAcademicYear(m.defaultAcademicYear);
        setRooms(m.suggestedRooms.map((r) => ({ ...r })));
        setSelectedRoomIds(new Set(m.suggestedRooms.map((_, i) => i)));
      }
      const yearFilter = year || academicYear || m.defaultAcademicYear;
      let data = await fetchSeatingPlans(yearFilter);
      if (!data.plans.length) {
        await seedSeating(yearFilter);
        data = await fetchSeatingPlans(yearFilter);
      }
      setPlans(data.plans);
      if (!selectedId && data.plans.length) setSelectedId(data.plans[0].id);
      else if (selectedId && !data.plans.find((p) => p.id === selectedId) && data.plans.length) {
        setSelectedId(data.plans[0].id);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load seating plans');
    } finally {
      setLoading(false);
    }
  }, [meta, academicYear, selectedId]);

  const loadDetail = useCallback(async (planId: string) => {
    setDetailLoading(true);
    try {
      const data = await fetchSeatingPlan(planId);
      setDetail(data.plan);
      setNotificationSummary(data.notificationSummary);
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
      setNotificationSummary([]);
    }
  }, [selectedId, loadDetail]);

  const handleCreate = async () => {
    const selectedRooms = rooms.filter((_, i) => selectedRoomIds.has(i));
    if (!title.trim()) return setErrorMsg('Title is required');
    if (!selectedRooms.length) return setErrorMsg('Select at least one room');
    if (meta && totalCapacity < meta.activeStudentCount) {
      return setErrorMsg(`Total capacity (${totalCapacity}) is less than active students (${meta.activeStudentCount})`);
    }
    setActionLoading(true);
    setErrorMsg(null);
    try {
      const result = await createSeatingPlan({
        academicYear,
        title: title.trim(),
        examDate,
        seriesPrefix,
        rooms: selectedRooms,
      });
      setCreateOpen(false);
      setSuccessMsg(`Seating plan created — ${result.plan.totalStudents} students assigned across ${result.plan.totalRooms} rooms`);
      await loadPlans(academicYear);
      setSelectedId(result.plan.id);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create seating plan');
    } finally {
      setActionLoading(false);
    }
  };

  const runAction = async (action: () => Promise<{ message?: string; plan?: SeatingPlanDetail }>) => {
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

  const handleIssueExamCall = async () => {
    if (!selectedId) return;
    setActionLoading(true);
    try {
      const result = await issueExamCall(selectedId);
      setExamCallResult(result);
      setExamCallOpen(true);
      setSuccessMsg(result.message);
      await loadPlans(academicYear);
      await loadDetail(selectedId);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to issue exam call');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRoomChange = async (assignmentId: string, roomId: string) => {
    if (!selectedId || !detail) return;
    setActionLoading(true);
    try {
      const result = await updateAssignmentRoom(selectedId, assignmentId, roomId);
      setSuccessMsg(result.message);
      await loadDetail(selectedId);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update room');
    } finally {
      setActionLoading(false);
    }
  };

  const toggleRoom = (index: number) => {
    setSelectedRoomIds((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const addCustomRoom = () => {
    const next = [...rooms, emptyRoom()];
    setRooms(next);
    setSelectedRoomIds((prev) => new Set([...prev, next.length - 1]));
  };

  const updateRoomField = (index: number, field: keyof SeatingRoomInput, value: string | number) => {
    setRooms((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  };

  const removeRoom = (index: number) => {
    setRooms((prev) => prev.filter((_, i) => i !== index));
    setSelectedRoomIds((prev) => {
      const next = new Set<number>();
      for (const i of prev) {
        if (i < index) next.add(i);
        else if (i > index) next.add(i - 1);
      }
      return next;
    });
  };

  if (loading && !plans.length) {
    return (
      <AcademicPageShell>
        <AcademicLoading label="Loading seating arrangement…" />
      </AcademicPageShell>
    );
  }

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="Examination Management › Seating Arrangement"
        title="Seating Arrangement"
        subtitle="Auto-assign all active students to rooms with random series. Issue exam call via push & WhatsApp."
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
              <Plus size={14} /> Auto Generate
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

      {meta && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className={`${am.card} ${am.cardPad} flex items-center gap-3`}>
            <Users size={18} className="text-blue-600 shrink-0" />
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase">Active Students</p>
              <p className="text-2xl font-bold">{meta.activeStudentCount}</p>
            </div>
          </div>
          <div className={`${am.card} ${am.cardPad} flex items-center gap-3`}>
            <DoorOpen size={18} className="text-emerald-600 shrink-0" />
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase">Suggested Rooms</p>
              <p className="text-2xl font-bold">{meta.suggestedRooms.length}</p>
            </div>
          </div>
          <div className={`${am.card} ${am.cardPad} flex items-center gap-3`}>
            <MapPin size={18} className="text-amber-600 shrink-0" />
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase">Plans</p>
              <p className="text-2xl font-bold">{plans.length}</p>
            </div>
          </div>
          <div className={`${am.card} ${am.cardPad} flex items-center gap-3`}>
            <Shuffle size={18} className="text-purple-600 shrink-0" />
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase">Random Series</p>
              <p className="text-2xl font-bold">Auto</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-4 space-y-2">
          <h3 className="text-sm font-semibold text-slate-700">Seating Plans</h3>
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
              <p className="text-xs text-slate-500">{plan.totalStudents} students · {plan.totalRooms} rooms</p>
            </button>
          ))}
          {!plans.length && (
            <p className="text-sm text-slate-500 p-4 border rounded-lg">No plans yet. Click Auto Generate to create one.</p>
          )}
        </div>

        <div className="lg:col-span-8">
          {!detail && !detailLoading && (
            <div className="border rounded-lg p-8 text-center text-slate-500">Select a seating plan to view details</div>
          )}
          {detailLoading && <AcademicLoading label="Loading plan…" />}
          {detail && !detailLoading && (
            <div className="space-y-4">
              <div className="border rounded-lg p-4 bg-white">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">{detail.title}</h3>
                    <p className="text-sm text-slate-500">
                      {detail.recordId} · {detail.examDateDisplay} · Prefix {detail.seriesPrefix}
                    </p>
                    <span className={`inline-block mt-2 text-xs px-2 py-1 rounded-full ${STATUS_COLORS[detail.status]}`}>
                      {detail.statusLabel}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {detail.canFinalize && (
                      <button
                        type="button"
                        className={am.btnSecondary}
                        disabled={actionLoading}
                        onClick={() => void runAction(() => finalizeSeatingPlan(detail.id))}
                      >
                        <CheckCircle2 size={14} /> Finalize
                      </button>
                    )}
                    {detail.canIssueExamCall && (
                      <button
                        type="button"
                        className={am.btnPrimary}
                        disabled={actionLoading}
                        onClick={() => void handleIssueExamCall()}
                      >
                        {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                        Issue Exam Call
                      </button>
                    )}
                    {detail.canStartExam && (
                      <button
                        type="button"
                        className={am.btnPrimary}
                        disabled={actionLoading}
                        onClick={() => void runAction(() => startExam(detail.id))}
                      >
                        <Play size={14} /> Start Exam
                      </button>
                    )}
                    {detail.status === 'IN_PROGRESS' && (
                      <button
                        type="button"
                        className={am.btnSecondary}
                        disabled={actionLoading}
                        onClick={() => void runAction(() => completeExam(detail.id))}
                      >
                        <CheckCircle2 size={14} /> Complete Exam
                      </button>
                    )}
                  </div>
                </div>

                {detail.canEditRoomOnly && (
                  <div className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                    Exam in progress — only room number can be edited. Series, seat, and student details are locked.
                  </div>
                )}

                {notificationSummary.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {notificationSummary.map((n) => (
                      <span key={`${n.channel}-${n.recipientType}`} className="text-xs bg-slate-100 px-2 py-1 rounded">
                        {n.channel} → {n.recipientType}: {n.count}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {detail.rooms.map((room) => (
                  <div key={room.id} className="border rounded-lg p-3 bg-white">
                    <p className="font-medium text-sm">{room.roomNumber}</p>
                    <p className="text-xs text-slate-500">{room.buildingName || '—'}</p>
                    <p className="text-xs mt-1">{room.assignedCount}/{room.capacity} seats</p>
                    {room.invigilatorName && (
                      <p className="text-xs text-slate-500">Invigilator: {room.invigilatorName}</p>
                    )}
                  </div>
                ))}
              </div>

              {assignmentsByRoom.map(({ room, students }) => (
                <div key={room.id} className="border rounded-lg overflow-hidden bg-white">
                  <div className="px-4 py-2 bg-slate-50 border-b flex justify-between items-center">
                    <span className="font-medium text-sm">
                      {room.roomNumber}
                      {room.buildingName ? ` — ${room.buildingName}` : ''}
                    </span>
                    <span className="text-xs text-slate-500">{students.length} students</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-slate-500 border-b">
                          <th className="px-3 py-2">Series</th>
                          <th className="px-3 py-2">Student</th>
                          <th className="px-3 py-2">Class</th>
                          <th className="px-3 py-2">Seat</th>
                          <th className="px-3 py-2">Room</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((a) => (
                          <tr key={a.id} className="border-b last:border-0">
                            <td className="px-3 py-2 font-mono text-xs">{a.seriesNumber}</td>
                            <td className="px-3 py-2">
                              <div>{a.studentName}</div>
                              <div className="text-xs text-slate-500">{a.admissionNumber}</div>
                            </td>
                            <td className="px-3 py-2 text-xs">{a.classGroup}</td>
                            <td className="px-3 py-2 font-mono text-xs">{a.rollLabel}</td>
                            <td className="px-3 py-2">
                              {detail.canEditRoomOnly ? (
                                <select
                                  className="text-xs border rounded px-1 py-0.5"
                                  value={a.roomId}
                                  disabled={actionLoading}
                                  onChange={(e) => void handleRoomChange(a.id, e.target.value)}
                                >
                                  {detail.rooms.map((r) => (
                                    <option key={r.id} value={r.id}>
                                      {r.roomNumber} ({r.assignedCount}/{r.capacity})
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <span className="text-xs">{a.roomNumber}</span>
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

      <AcademicModal open={createOpen} onClose={() => setCreateOpen(false)} title="Auto Seating Arrangement">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            All active students across all classes will be shuffled and assigned random series numbers.
            Select rooms with sufficient total capacity ({meta?.activeStudentCount ?? 0} students).
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-slate-600">Exam Title</span>
              <input className={am.input} value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <label className="block">
              <span className="text-xs text-slate-600">Exam Date</span>
              <input type="date" className={am.input} value={examDate} onChange={(e) => setExamDate(e.target.value)} />
            </label>
            <label className="block">
              <span className="text-xs text-slate-600">Series Prefix</span>
              <input className={am.input} value={seriesPrefix} onChange={(e) => setSeriesPrefix(e.target.value)} maxLength={6} />
            </label>
            <div className="flex items-end">
              <p className="text-sm">
                Capacity: <strong>{totalCapacity}</strong> / {meta?.activeStudentCount ?? 0} students
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Rooms</h4>
            <button type="button" className={am.btnSecondary} onClick={addCustomRoom}>
              <Plus size={14} /> Add Room
            </button>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {rooms.map((room, i) => (
              <div key={i} className="flex flex-wrap gap-2 items-center border rounded p-2">
                <input
                  type="checkbox"
                  checked={selectedRoomIds.has(i)}
                  onChange={() => toggleRoom(i)}
                  className="mr-1"
                />
                <input
                  className={`${am.input} flex-1 min-w-[100px]`}
                  placeholder="Room No."
                  value={room.roomNumber}
                  onChange={(e) => updateRoomField(i, 'roomNumber', e.target.value)}
                />
                <input
                  className={`${am.input} flex-1 min-w-[100px]`}
                  placeholder="Building"
                  value={room.buildingName || ''}
                  onChange={(e) => updateRoomField(i, 'buildingName', e.target.value)}
                />
                <input
                  type="number"
                  className={`${am.input} w-20`}
                  min={1}
                  value={room.capacity}
                  onChange={(e) => updateRoomField(i, 'capacity', Number(e.target.value) || 1)}
                />
                <input
                  className={`${am.input} flex-1 min-w-[100px]`}
                  placeholder="Invigilator"
                  value={room.invigilatorName || ''}
                  onChange={(e) => updateRoomField(i, 'invigilatorName', e.target.value)}
                />
                <button type="button" className="text-red-500 p-1" onClick={() => removeRoom(i)}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className={am.btnSecondary} onClick={() => setCreateOpen(false)}>Cancel</button>
            <button type="button" className={am.btnPrimary} disabled={actionLoading} onClick={() => void handleCreate()}>
              {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Shuffle size={14} />}
              Generate Seating
            </button>
          </div>
        </div>
      </AcademicModal>

      <AcademicModal open={examCallOpen} onClose={() => setExamCallOpen(false)} title="Exam Call Issued">
        {examCallResult && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-emerald-700">
              <Bell size={18} />
              <span className="font-medium">{examCallResult.message}</span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="border rounded p-3">
                <p className="text-2xl font-bold">{examCallResult.notifications.pushCount}</p>
                <p className="text-xs text-slate-500">Push Notifications</p>
              </div>
              <div className="border rounded p-3">
                <p className="text-2xl font-bold">{examCallResult.notifications.whatsappCount}</p>
                <p className="text-xs text-slate-500">WhatsApp Messages</p>
              </div>
              <div className="border rounded p-3">
                <p className="text-2xl font-bold">{examCallResult.notifications.total}</p>
                <p className="text-xs text-slate-500">Total Sent</p>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Parents, class teachers, and staff linked to the mobile app have been notified with room, series, and seat details.
            </p>
            <div className="flex justify-end">
              <button type="button" className={am.btnPrimary} onClick={() => setExamCallOpen(false)}>Done</button>
            </div>
          </div>
        )}
      </AcademicModal>
      </div>
    </AcademicPageShell>
  );
}
