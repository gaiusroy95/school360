import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Loader2,
  MapPin,
  Plus,
  RefreshCcw,
  Save,
} from 'lucide-react';
import {
  advanceShiftChangeRequest,
  advanceShiftOvertime,
  assignEmployeeShift,
  createHrShiftMaster,
  fetchShiftManagement,
  mapDepartmentShift,
  updateHrShiftMaster,
  updateShiftSettings,
  updateShiftWorkingHours,
  type ShiftManagementDashboard,
} from '../../../lib/hrServices';
import {
  am,
  AcademicLoading,
  AcademicModal,
  AcademicPageHeader,
  AcademicPageShell,
  FeeTabs,
  StatusBadge,
} from '../FeeFinanceManagement/FeeFinanceUi';

const TABS = [
  'Dashboard',
  'Working Hours',
  'Shift Master',
  'Weekly Planner',
  'Assignments',
  'Timetable',
  'Rules',
  'Requests & OT',
  'Duty',
  'Settings',
] as const;
type TabId = (typeof TABS)[number];

const COLOR_MAP: Record<string, string> = {
  green: 'bg-green-100 border-green-300 text-green-800',
  blue: 'bg-blue-100 border-blue-300 text-blue-800',
  orange: 'bg-orange-100 border-orange-300 text-orange-800',
  red: 'bg-red-100 border-red-300 text-red-800',
  grey: 'bg-slate-100 border-slate-300 text-slate-600',
};

const INSTITUTION_TYPES = ['School', 'College', 'Coaching', 'University'];

function Kpi({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <p className="text-[10px] font-bold text-slate-500 uppercase">{label}</p>
      <p className="text-xl font-bold text-slate-900 mt-1">{value}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export function ShiftManagementView() {
  const [data, setData] = useState<ShiftManagementDashboard | null>(null);
  const [tab, setTab] = useState<TabId>('Dashboard');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [shiftModal, setShiftModal] = useState(false);
  const [editingShift, setEditingShift] = useState<Record<string, unknown> | null>(null);
  const [shiftForm, setShiftForm] = useState({
    code: '', name: '', shiftType: 'REGULAR', description: '', startTime: '09:00', endTime: '17:00',
    breakStart: '', breakEnd: '', totalHours: '8', graceMinutes: '15', overtimeEligible: true, status: 'ACTIVE',
  });

  const [whForm, setWhForm] = useState<Record<string, unknown>>({});
  const [assignForm, setAssignForm] = useState({ employeeId: '', shiftId: '', effectiveDate: new Date().toISOString().slice(0, 10), remarks: '' });
  const [deptMapForm, setDeptMapForm] = useState({ department: '', shiftId: '' });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchShiftManagement(true);
      setData(res);
      setWhForm(res.workingHours);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const plannerGrid = useMemo(() => {
    if (!data) return {};
    const grid: Record<string, Record<string, Record<string, unknown>>> = {};
    for (const day of data.planner.days) {
      grid[day] = {};
      for (const slot of data.planner.timeSlots) {
        const entry = data.planner.entries.find((e) => e.dayOfWeek === day && e.timeSlot === slot);
        grid[day][slot] = entry ?? { label: slot, colorCode: 'grey', entryType: 'OFF' };
      }
    }
    return grid;
  }, [data]);

  const handleSaveShift = async () => {
    setSaving(true);
    try {
      const body = { ...shiftForm, totalHours: Number(shiftForm.totalHours), graceMinutes: Number(shiftForm.graceMinutes) };
      if (editingShift?.id) {
        await updateHrShiftMaster(String(editingShift.id), body);
        setMessage('Shift updated');
      } else {
        await createHrShiftMaster(body);
        setMessage('Shift created');
      }
      setShiftModal(false);
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveWorkingHours = async () => {
    setSaving(true);
    try {
      const res = await updateShiftWorkingHours(whForm);
      setData(res);
      setMessage('Working hours saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleAssign = async () => {
    if (!assignForm.employeeId || !assignForm.shiftId) return;
    setSaving(true);
    try {
      const res = await assignEmployeeShift(assignForm);
      setData(res);
      setMessage('Shift assigned');
      setAssignForm({ ...assignForm, employeeId: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Assign failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !data) {
    return <AcademicPageShell><AcademicLoading label="Loading shift management…" /></AcademicPageShell>;
  }

  const kpis = data?.kpis;

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="HR & Payroll Management › Shift Management"
        title="Shift Management"
        subtitle="Centrally manage working shifts, schedules, attendance rules, substitutions, overtime & payroll sync"
        actions={
          <button type="button" onClick={() => void load()} className={am.btnSecondary}>
            <RefreshCcw className="w-3.5 h-3.5" /> Refresh
          </button>
        }
      />

      {error && <div className="mx-4 md:mx-6 mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}
      {message && <div className="mx-4 md:mx-6 mb-3 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">{message}</div>}

      <div className={am.content}>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 pt-3 border-b border-slate-100 overflow-x-auto">
            <FeeTabs tabs={[...TABS]} active={tab} onChange={(t) => setTab(t as TabId)} />
          </div>

          <div className="p-4">
            {tab === 'Dashboard' && kpis && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  <Kpi label="Total Employees" value={kpis.totalEmployees} />
                  <Kpi label="Morning Shift" value={kpis.shiftWiseEmployees.morning} />
                  <Kpi label="Evening Shift" value={kpis.shiftWiseEmployees.evening} />
                  <Kpi label="Night Shift" value={kpis.shiftWiseEmployees.night} />
                  <Kpi label="Late Arrival %" value={`${kpis.lateArrivalPct}%`} />
                  <Kpi label="Overtime Hours" value={kpis.overtimeHours} />
                  <Kpi label="Holiday Duty" value={kpis.holidayDuty} />
                  <Kpi label="Substitute Classes" value={kpis.substituteClasses} />
                  <Kpi label="Attendance %" value={`${kpis.attendancePct}%`} />
                  <Kpi label="Shift Utilization" value={`${kpis.shiftUtilization}%`} />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className={`${am.card} ${am.cardPad}`}>
                    <h4 className="text-xs font-bold text-slate-700 mb-2">Workflow Overview</h4>
                    {data?.workflows && Object.entries(data.workflows).map(([key, steps]) => (
                      <div key={key} className="mb-2">
                        <p className="text-[10px] font-bold text-slate-500 uppercase">{key.replace(/([A-Z])/g, ' $1')}</p>
                        <p className="text-xs text-slate-600">{steps.join(' → ')}</p>
                      </div>
                    ))}
                  </div>
                  <div className={`${am.card} ${am.cardPad}`}>
                    <h4 className="text-xs font-bold text-slate-700 mb-2">Role-Based Access</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {data?.roles.map((r) => (
                        <div key={r.role} className="text-xs">
                          <span className="font-bold text-slate-800">{r.role}:</span>{' '}
                          <span className="text-slate-600">{r.responsibilities}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {tab === 'Working Hours' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <label className="block space-y-1">
                    <span className="text-xs font-semibold text-slate-600">Academic Year</span>
                    <input value={String(whForm.academicYear ?? '')} onChange={(e) => setWhForm({ ...whForm, academicYear: e.target.value })} className={am.input} />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs font-semibold text-slate-600">Branch</span>
                    <input value={String(whForm.branch ?? '')} onChange={(e) => setWhForm({ ...whForm, branch: e.target.value })} className={am.input} />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs font-semibold text-slate-600">Institution Type</span>
                    <select value={String(whForm.institutionType ?? 'School')} onChange={(e) => setWhForm({ ...whForm, institutionType: e.target.value })} className={am.input}>
                      {INSTITUTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs font-semibold text-slate-600">Working Hours Start</span>
                    <input value={String(whForm.workingHoursStart ?? '')} onChange={(e) => setWhForm({ ...whForm, workingHoursStart: e.target.value })} className={am.input} />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs font-semibold text-slate-600">Working Hours End</span>
                    <input value={String(whForm.workingHoursEnd ?? '')} onChange={(e) => setWhForm({ ...whForm, workingHoursEnd: e.target.value })} className={am.input} />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs font-semibold text-slate-600">Break Duration (min)</span>
                    <input type="number" value={String(whForm.breakDuration ?? '')} onChange={(e) => setWhForm({ ...whForm, breakDuration: Number(e.target.value) })} className={am.input} />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs font-semibold text-slate-600">Prayer / Assembly</span>
                    <input value={String(whForm.prayerAssembly ?? '')} onChange={(e) => setWhForm({ ...whForm, prayerAssembly: e.target.value })} className={am.input} />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs font-semibold text-slate-600">Lunch Break</span>
                    <input value={String(whForm.lunchBreak ?? '')} onChange={(e) => setWhForm({ ...whForm, lunchBreak: e.target.value })} className={am.input} />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs font-semibold text-slate-600">Tea Break</span>
                    <input value={String(whForm.teaBreak ?? '')} onChange={(e) => setWhForm({ ...whForm, teaBreak: e.target.value })} className={am.input} />
                  </label>
                  <label className="block space-y-1 md:col-span-2">
                    <span className="text-xs font-semibold text-slate-600">Half Day Rules</span>
                    <input value={String(whForm.halfDayRules ?? '')} onChange={(e) => setWhForm({ ...whForm, halfDayRules: e.target.value })} className={am.input} />
                  </label>
                </div>
                <button type="button" onClick={() => void handleSaveWorkingHours()} disabled={saving} className={am.btnPrimary}>
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save Working Hours
                </button>
              </div>
            )}

            {tab === 'Shift Master' && (
              <div className="space-y-3">
                <div className="flex justify-end">
                  <button type="button" onClick={() => { setEditingShift(null); setShiftForm({ code: '', name: '', shiftType: 'REGULAR', description: '', startTime: '09:00', endTime: '17:00', breakStart: '', breakEnd: '', totalHours: '8', graceMinutes: '15', overtimeEligible: true, status: 'ACTIVE' }); setShiftModal(true); }} className={am.btnPrimary}>
                    <Plus className="w-3.5 h-3.5" /> Add Shift
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 uppercase text-[10px]">
                        <th className="text-left px-3 py-2">Code</th>
                        <th className="text-left px-3 py-2">Name</th>
                        <th className="text-left px-3 py-2">Type</th>
                        <th className="text-left px-3 py-2">Timing</th>
                        <th className="text-right px-3 py-2">Hours</th>
                        <th className="text-center px-3 py-2">OT</th>
                        <th className="text-left px-3 py-2">Status</th>
                        <th className="px-3 py-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {data?.shifts.map((s) => (
                        <tr key={String(s.id)} className="hover:bg-slate-50/60">
                          <td className="px-3 py-2 font-mono">{String(s.code)}</td>
                          <td className="px-3 py-2 font-semibold">{String(s.name)}</td>
                          <td className="px-3 py-2">{String(s.shiftTypeLabel)}</td>
                          <td className="px-3 py-2">{String(s.startTime)} – {String(s.endTime)}</td>
                          <td className="px-3 py-2 text-right">{String(s.totalHours)}</td>
                          <td className="px-3 py-2 text-center">{s.overtimeEligible ? '✓' : '—'}</td>
                          <td className="px-3 py-2"><StatusBadge status={String(s.status)} /></td>
                          <td className="px-3 py-2">
                            <button type="button" onClick={() => { setEditingShift(s); setShiftForm({ code: String(s.code), name: String(s.name), shiftType: String(s.shiftType), description: String(s.description || ''), startTime: String(s.startTime), endTime: String(s.endTime), breakStart: String(s.breakStart || ''), breakEnd: String(s.breakEnd || ''), totalHours: String(s.totalHours), graceMinutes: String(s.graceMinutes), overtimeEligible: Boolean(s.overtimeEligible), status: String(s.status) }); setShiftModal(true); }} className="text-blue-600 text-[10px] font-bold">Edit</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {tab === 'Weekly Planner' && data && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2 text-[10px]">
                  {data.planner.colorLegend.map((c) => (
                    <span key={c.code} className={`px-2 py-1 rounded border ${COLOR_MAP[c.code]}`}>{c.label}</span>
                  ))}
                </div>
                <p className="text-xs text-slate-500">Week starting {data.planner.weekStart}</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-[10px] border-collapse">
                    <thead>
                      <tr>
                        <th className="border border-slate-200 bg-slate-50 px-2 py-1.5 text-left">Slot</th>
                        {data.planner.days.map((d) => (
                          <th key={d} className="border border-slate-200 bg-slate-50 px-2 py-1.5 text-center min-w-[90px]">{d.slice(0, 3)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.planner.timeSlots.filter((s) => !['Holiday', 'Weekly Off'].includes(s)).map((slot) => (
                        <tr key={slot}>
                          <td className="border border-slate-200 px-2 py-1.5 font-bold bg-slate-50">{slot}</td>
                          {data.planner.days.map((day) => {
                            const entry = plannerGrid[day]?.[slot] as { label?: string; colorCode?: string } | undefined;
                            const color = COLOR_MAP[entry?.colorCode ?? 'grey'] ?? COLOR_MAP.grey;
                            return (
                              <td key={day} className={`border border-slate-200 px-1 py-1 text-center ${color}`}>
                                {entry?.label ?? '—'}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {tab === 'Assignments' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-lg">
                  <select value={assignForm.employeeId} onChange={(e) => setAssignForm({ ...assignForm, employeeId: e.target.value })} className={am.input}>
                    <option value="">Employee…</option>
                    {data?.employees.map((e) => <option key={e.id} value={e.id}>{e.fullName}</option>)}
                  </select>
                  <select value={assignForm.shiftId} onChange={(e) => setAssignForm({ ...assignForm, shiftId: e.target.value })} className={am.input}>
                    <option value="">Shift…</option>
                    {data?.shifts.map((s) => <option key={String(s.id)} value={String(s.id)}>{String(s.code)} — {String(s.name)}</option>)}
                  </select>
                  <input type="date" value={assignForm.effectiveDate} onChange={(e) => setAssignForm({ ...assignForm, effectiveDate: e.target.value })} className={am.input} />
                  <button type="button" onClick={() => void handleAssign()} className={am.btnPrimary}>Assign Shift</button>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-700 mb-2">Department Shift Mapping</h4>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <select value={deptMapForm.department} onChange={(e) => setDeptMapForm({ ...deptMapForm, department: e.target.value })} className={am.input}>
                      <option value="">Department…</option>
                      {data?.departments.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <select value={deptMapForm.shiftId} onChange={(e) => setDeptMapForm({ ...deptMapForm, shiftId: e.target.value })} className={am.input}>
                      <option value="">Shift…</option>
                      {data?.shifts.map((s) => <option key={String(s.id)} value={String(s.id)}>{String(s.name)}</option>)}
                    </select>
                    <button type="button" onClick={() => void mapDepartmentShift(deptMapForm).then((r) => { setData(r); setMessage('Department mapped'); })} className={am.btnSecondary}>Map</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead><tr className="bg-slate-50 text-[10px] uppercase text-slate-500">
                        <th className="text-left px-3 py-2">Employee</th><th className="text-left px-3 py-2">Department</th>
                        <th className="text-left px-3 py-2">Shift</th><th className="text-left px-3 py-2">Type</th>
                        <th className="text-left px-3 py-2">Effective</th><th className="text-left px-3 py-2">Status</th>
                      </tr></thead>
                      <tbody className="divide-y divide-slate-50">
                        {data?.assignments.map((a) => (
                          <tr key={String(a.id)}>
                            <td className="px-3 py-2"><p className="font-semibold">{String(a.employeeName)}</p><p className="text-[10px] text-slate-400">{String(a.employeeCode)}</p></td>
                            <td className="px-3 py-2">{String(a.department)}</td>
                            <td className="px-3 py-2">{String(a.shiftName)}</td>
                            <td className="px-3 py-2">{String(a.employmentType)}</td>
                            <td className="px-3 py-2">{String(a.effectiveDate)}</td>
                            <td className="px-3 py-2"><StatusBadge status={String(a.status)} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {tab === 'Timetable' && data && (
              <div className={`${am.card} ${am.cardPad} space-y-3`}>
                <p className="text-sm font-bold text-slate-800">Timetable Integration</p>
                <p className="text-xs text-slate-600">Teaching staff shifts synchronize with subject allocation, class timetable, lecture/practical/lab timing, sports, exam schedule and coaching batches.</p>
                <div className="flex items-center gap-2">
                  <StatusBadge status={data.timetable.syncEnabled ? 'ACTIVE' : 'INACTIVE'} />
                  <span className="text-xs text-slate-500">Auto-update on timetable changes: {data.timetable.autoUpdate ? 'Enabled' : 'Disabled'}</span>
                </div>
                <ul className="text-xs text-slate-600 list-disc pl-5">
                  {(data.timetable.integrations as string[]).map((i) => <li key={i}>{i}</li>)}
                </ul>
                <p className="text-[10px] text-slate-400">Last sync: {new Date(String(data.timetable.lastSync)).toLocaleString()}</p>
              </div>
            )}

            {tab === 'Rules' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className={`${am.card} ${am.cardPad}`}>
                  <h4 className="font-bold text-slate-800 mb-2">Attendance Rules</h4>
                  <ul className="space-y-1 text-slate-600">
                    {['Late Entry & Grace Time', 'Early Exit', 'Minimum Hours', 'Half Day', 'Missing Punch', 'Auto Present/Absent', 'Shift Crossing Midnight', 'Holiday & Weekend Attendance', 'Official/Outdoor Duty'].map((r) => (
                      <li key={r}>• {r}</li>
                    ))}
                  </ul>
                </div>
                <div className={`${am.card} ${am.cardPad}`}>
                  <h4 className="font-bold text-slate-800 mb-2">Flexible & Rotation</h4>
                  <p className="text-slate-600 mb-2">Core hours, flexible start/end, remote work, hybrid schedule, WFH with Employee → Manager → HR approval.</p>
                  <p className="text-slate-600">Rotation: Morning → Evening → Night (Weekly/Monthly/Quarterly/Custom auto-assignment).</p>
                </div>
              </div>
            )}

            {tab === 'Requests & OT' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-bold text-slate-700 mb-2">Shift Change Requests</h4>
                  <table className="w-full text-xs">
                    <thead><tr className="bg-slate-50 text-[10px] uppercase"><th className="px-3 py-2 text-left">Employee</th><th className="px-3 py-2 text-left">Reason</th><th className="px-3 py-2 text-left">Date</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2" /></tr></thead>
                    <tbody className="divide-y divide-slate-50">
                      {data?.changeRequests.map((r) => (
                        <tr key={String(r.id)}>
                          <td className="px-3 py-2">{String(r.employeeName)}</td>
                          <td className="px-3 py-2">{String(r.reasonCategory)}: {String(r.reason)}</td>
                          <td className="px-3 py-2">{String(r.effectiveDate)}</td>
                          <td className="px-3 py-2"><StatusBadge status={String(r.status)} /></td>
                          <td className="px-3 py-2">
                            {r.status === 'PENDING' && (
                              <div className="flex gap-1">
                                <button type="button" onClick={() => void advanceShiftChangeRequest(String(r.id), 'approve').then(setData)} className="text-green-600 text-[10px] font-bold">Approve</button>
                                <button type="button" onClick={() => void advanceShiftChangeRequest(String(r.id), 'reject').then(setData)} className="text-red-600 text-[10px] font-bold">Reject</button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-700 mb-2">Substitute Management</h4>
                  <table className="w-full text-xs">
                    <thead><tr className="bg-slate-50 text-[10px] uppercase"><th className="px-3 py-2 text-left">Absent</th><th className="px-3 py-2 text-left">Substitute</th><th className="px-3 py-2 text-left">Class</th><th className="px-3 py-2 text-left">Date</th><th className="px-3 py-2 text-left">Status</th></tr></thead>
                    <tbody className="divide-y divide-slate-50">
                      {data?.substitutes.map((s) => (
                        <tr key={String(s.id)}>
                          <td className="px-3 py-2">{String(s.absentEmployeeName)}</td>
                          <td className="px-3 py-2">{String(s.substituteEmployeeName)}</td>
                          <td className="px-3 py-2">{String(s.classInfo)} {String(s.subject)}</td>
                          <td className="px-3 py-2">{String(s.dutyDate)}</td>
                          <td className="px-3 py-2"><StatusBadge status={String(s.status)} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-700 mb-2">Overtime</h4>
                  <table className="w-full text-xs">
                    <thead><tr className="bg-slate-50 text-[10px] uppercase"><th className="px-3 py-2 text-left">Employee</th><th className="px-3 py-2 text-left">Date</th><th className="px-3 py-2 text-right">Hours</th><th className="px-3 py-2 text-left">Type</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2" /></tr></thead>
                    <tbody className="divide-y divide-slate-50">
                      {data?.overtime.map((o) => (
                        <tr key={String(o.id)}>
                          <td className="px-3 py-2">{String(o.employeeName)}</td>
                          <td className="px-3 py-2">{String(o.otDate)}</td>
                          <td className="px-3 py-2 text-right">{String(o.hours)}</td>
                          <td className="px-3 py-2">{String(o.otType)}</td>
                          <td className="px-3 py-2"><StatusBadge status={String(o.status)} /></td>
                          <td className="px-3 py-2">
                            {o.status === 'PENDING' && (
                              <button type="button" onClick={() => void advanceShiftOvertime(String(o.id), 'approve').then(setData)} className="text-green-600 text-[10px] font-bold">Approve</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {tab === 'Duty' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-600">Weekend, Holiday, Examination, Event and GPS duty assignments with compensation (Comp Off / OT / Extra Pay).</p>
                <table className="w-full text-xs">
                  <thead><tr className="bg-slate-50 text-[10px] uppercase">
                    <th className="px-3 py-2 text-left">Type</th><th className="px-3 py-2 text-left">Employee</th>
                    <th className="px-3 py-2 text-left">Date</th><th className="px-3 py-2 text-left">Timing</th>
                    <th className="px-3 py-2 text-left">Compensation</th><th className="px-3 py-2 text-center">GPS</th><th className="px-3 py-2 text-left">Status</th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-50">
                    {data?.duties.map((d) => (
                      <tr key={String(d.id)}>
                        <td className="px-3 py-2"><StatusBadge status={String(d.dutyType)} /></td>
                        <td className="px-3 py-2">{String(d.employeeName)}</td>
                        <td className="px-3 py-2">{String(d.dutyDate)}</td>
                        <td className="px-3 py-2">{String(d.reportingTime)} – {String(d.completionTime)}</td>
                        <td className="px-3 py-2">{String(d.compensation)}</td>
                        <td className="px-3 py-2 text-center">{d.gpsEnabled ? <MapPin className="w-3.5 h-3.5 inline text-blue-600" /> : '—'}</td>
                        <td className="px-3 py-2"><StatusBadge status={String(d.status)} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {tab === 'Settings' && data && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`${am.card} ${am.cardPad} space-y-3`}>
                  <h4 className="text-xs font-bold text-slate-800">Module Settings</h4>
                  {[
                    ['rotationEnabled', 'Shift Rotation'],
                    ['flexibleShiftEnabled', 'Flexible Shifts'],
                    ['gpsAttendanceEnabled', 'GPS Attendance'],
                    ['timetableSyncEnabled', 'Timetable Sync'],
                  ].map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 text-xs">
                      <input type="checkbox" defaultChecked={Boolean(data.settings[key])} onChange={(e) => void updateShiftSettings({ [key]: e.target.checked }).then(setData)} />
                      {label}
                    </label>
                  ))}
                  <p className="text-[10px] text-slate-500">Max weekly hours: {String(data.settings.maxWeeklyHours)} · Min rest: {String(data.settings.minRestBetweenShifts)}h · OT limit: {String(data.settings.overtimeLimitHours)}h</p>
                </div>
                <div className={`${am.card} ${am.cardPad}`}>
                  <h4 className="text-xs font-bold text-slate-800 mb-2">Notifications</h4>
                  <p className="text-xs text-slate-600">Channels: {(data.settings.notificationChannels as string[])?.join(', ')}</p>
                  <p className="text-xs text-slate-600 mt-2">Auto-notify: Shift Assigned, Changed, OT Approved, Substitute, Late Arrival, Missing Punch, Holiday/Event/Exam Duty</p>
                  <p className="text-xs text-slate-600 mt-2">Payroll sync: Late penalty, Half day, OT, Holiday/Weekend pay, Comp Off, Night shift allowance, Attendance bonus</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <AcademicModal open={shiftModal} onClose={() => setShiftModal(false)} title={editingShift ? 'Edit Shift' : 'Add Shift'} large>
        <div className="grid grid-cols-2 gap-3 mt-2">
          <label className="block space-y-1"><span className="text-xs font-semibold">Code</span><input value={shiftForm.code} onChange={(e) => setShiftForm({ ...shiftForm, code: e.target.value })} className={am.input} /></label>
          <label className="block space-y-1"><span className="text-xs font-semibold">Name</span><input value={shiftForm.name} onChange={(e) => setShiftForm({ ...shiftForm, name: e.target.value })} className={am.input} /></label>
          <label className="block space-y-1"><span className="text-xs font-semibold">Shift Type</span>
            <select value={shiftForm.shiftType} onChange={(e) => setShiftForm({ ...shiftForm, shiftType: e.target.value })} className={am.input}>
              {data?.shiftTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </label>
          <label className="block space-y-1"><span className="text-xs font-semibold">Total Hours</span><input value={shiftForm.totalHours} onChange={(e) => setShiftForm({ ...shiftForm, totalHours: e.target.value })} className={am.input} /></label>
          <label className="block space-y-1"><span className="text-xs font-semibold">Start</span><input value={shiftForm.startTime} onChange={(e) => setShiftForm({ ...shiftForm, startTime: e.target.value })} className={am.input} /></label>
          <label className="block space-y-1"><span className="text-xs font-semibold">End</span><input value={shiftForm.endTime} onChange={(e) => setShiftForm({ ...shiftForm, endTime: e.target.value })} className={am.input} /></label>
          <label className="block space-y-1 col-span-2"><span className="text-xs font-semibold">Description</span><textarea value={shiftForm.description} onChange={(e) => setShiftForm({ ...shiftForm, description: e.target.value })} className={am.input} rows={2} /></label>
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <button type="button" onClick={() => setShiftModal(false)} className={am.btnSecondary}>Cancel</button>
          <button type="button" onClick={() => void handleSaveShift()} disabled={saving} className={am.btnPrimary}>Save</button>
        </div>
      </AcademicModal>
    </AcademicPageShell>
  );
}
