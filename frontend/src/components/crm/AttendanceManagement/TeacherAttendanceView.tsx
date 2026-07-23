import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Plus,
  RefreshCw,
  Smartphone,
  UserPlus,
  Users,
} from 'lucide-react';
import {
  fetchTeacherAttendanceCalendar,
  fetchTeacherAttendanceMeta,
  fetchTeacherAttendanceReport,
  fetchTeachers,
  registerTeacher,
  seedTeacherAttendanceDemo,
  syncTeacherProfiles,
  type TeacherAttendanceReport,
  type TeacherCalendar,
  type TeacherPeriod,
  type TeacherProfile,
} from '../../../lib/attendanceServices';
import { downloadTeacherAttendanceReportExcel } from '../../../lib/teacherAttendanceExcel';
import { TeacherAttendanceDayModal } from './TeacherAttendanceDayModal';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const STATUS_LEGEND = [
  { key: 'present', label: 'Present', color: 'bg-green-500' },
  { key: 'plannedLeaveAbsent', label: 'Planned Leave', color: 'bg-blue-500' },
  { key: 'medicalLeaveAbsent', label: 'Medical Leave', color: 'bg-purple-500' },
  { key: 'unplannedAbsent', label: 'Unplanned Absent', color: 'bg-amber-500' },
  { key: 'unplannedNotIntimated', label: 'Not Intimated', color: 'bg-red-500' },
];

function cellScoreClass(code: string) {
  if (code === 'P') return 'bg-green-100 text-green-800';
  if (code === 'PL') return 'bg-blue-100 text-blue-800';
  if (code === 'ML') return 'bg-purple-100 text-purple-800';
  if (code === 'UA') return 'bg-amber-100 text-amber-800';
  if (code === 'NI') return 'bg-red-100 text-red-800';
  return 'bg-slate-50 text-slate-400';
}

export function TeacherAttendanceView() {
  const now = new Date();
  const [meta, setMeta] = useState<Awaited<ReturnType<typeof fetchTeacherAttendanceMeta>> | null>(null);
  const [calendar, setCalendar] = useState<TeacherCalendar | null>(null);
  const [report, setReport] = useState<TeacherAttendanceReport | null>(null);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [period, setPeriod] = useState<TeacherPeriod>('monthly');
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth() + 1);
  const [quarter, setQuarter] = useState(1);
  const [half, setHalf] = useState<1 | 2>(1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [teachers, setTeachers] = useState<TeacherProfile[]>([]);
  const [showRegister, setShowRegister] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    teacherName: '', department: 'General', mobile: '', email: '', employeeCode: '',
  });
  const [registering, setRegistering] = useState(false);

  const reportParams = useMemo(() => ({
    academicYear,
    period,
    year: calYear,
    month: calMonth,
    quarter,
    half,
  }), [academicYear, period, calYear, calMonth, quarter, half]);

  const loadTeachers = useCallback(async (year?: string) => {
    const data = await fetchTeachers(year || academicYear);
    setTeachers(data.teachers);
    return data;
  }, [academicYear]);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const m = await fetchTeacherAttendanceMeta();
      setMeta(m);
      setAcademicYear(m.defaultAcademicYear);
      const [cal, rep] = await Promise.all([
        fetchTeacherAttendanceCalendar({ academicYear: m.defaultAcademicYear, year: calYear, month: calMonth }),
        fetchTeacherAttendanceReport({
          academicYear: m.defaultAcademicYear,
          period,
          year: calYear,
          month: calMonth,
          quarter,
          half,
        }),
      ]);
      setCalendar(cal);
      setReport(rep);
      await loadTeachers(m.defaultAcademicYear);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load teacher attendance');
    } finally {
      setLoading(false);
    }
  }, [calYear, calMonth, period, quarter, half, loadTeachers]);

  const refreshData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [cal, rep] = await Promise.all([
        fetchTeacherAttendanceCalendar({ academicYear, year: calYear, month: calMonth }),
        fetchTeacherAttendanceReport(reportParams),
      ]);
      setCalendar(cal);
      setReport(rep);
      await loadTeachers(academicYear);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to refresh');
    } finally {
      setLoading(false);
    }
  }, [academicYear, calYear, calMonth, reportParams, loadTeachers]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!meta) return;
    void refreshData();
  }, [academicYear, period, quarter, half, calYear, calMonth]);

  const shiftMonth = (delta: number) => {
    const d = new Date(Date.UTC(calYear, calMonth - 1 + delta, 1));
    setCalYear(d.getUTCFullYear());
    setCalMonth(d.getUTCMonth() + 1);
  };

  const handleSync = async () => {
    setSyncing(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const result = await syncTeacherProfiles(academicYear);
      setSuccessMsg(result.message);
      await refreshData();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleRegister = async () => {
    if (!registerForm.teacherName.trim()) return;
    setRegistering(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const result = await registerTeacher({ academicYear, ...registerForm });
      setSuccessMsg(result.message);
      setShowRegister(false);
      setRegisterForm({ teacherName: '', department: 'General', mobile: '', email: '', employeeCode: '' });
      await refreshData();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setRegistering(false);
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await syncTeacherProfiles(academicYear);
      await seedTeacherAttendanceDemo(academicYear);
      await refreshData();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Seed failed');
    } finally {
      setSeeding(false);
    }
  };

  const calendarCells = useMemo(() => {
    if (!calendar) return [];
    const first = new Date(Date.UTC(calYear, calMonth - 1, 1));
    const startPad = first.getUTCDay();
    const cells: (TeacherCalendar['days'][0] | null)[] = Array(startPad).fill(null);
    cells.push(...calendar.days);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [calendar, calYear, calMonth]);

  return (
    <div className="flex flex-col h-full min-h-0 bg-gradient-to-b from-slate-50 to-slate-100/90">
      <div className="px-4 md:px-6 py-4 bg-white border-b border-slate-200/90 shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Attendance Management › Teacher Attendance</p>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 mt-0.5">Teacher Attendance</h1>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
              <Smartphone size={12} className="text-indigo-500" />
              {meta?.captureNote || 'Attendance and leave captured from teacher mobile app only'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 items-end">
            <div>
              <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Academic Year</label>
              <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white">
                {(meta?.academicYears || [academicYear]).map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Report Period</label>
              <select value={period} onChange={(e) => setPeriod(e.target.value as TeacherPeriod)} className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white">
                {(meta?.periods || []).map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
            {period === 'monthly' && (
              <div>
                <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Month</label>
                <input type="month" value={`${calYear}-${String(calMonth).padStart(2, '0')}`} onChange={(e) => {
                  const [y, m] = e.target.value.split('-');
                  setCalYear(Number(y));
                  setCalMonth(Number(m));
                }} className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white" />
              </div>
            )}
            {period === 'quarterly' && (
              <div>
                <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Quarter</label>
                <select value={quarter} onChange={(e) => setQuarter(Number(e.target.value))} className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white">
                  {[1, 2, 3, 4].map((q) => <option key={q} value={q}>Q{q}</option>)}
                </select>
              </div>
            )}
            {period === 'half_yearly' && (
              <div>
                <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Half Year</label>
                <select value={half} onChange={(e) => setHalf(Number(e.target.value) === 2 ? 2 : 1)} className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white">
                  <option value={1}>Apr – Sep</option>
                  <option value={2}>Oct – Mar</option>
                </select>
              </div>
            )}
            <button type="button" onClick={() => void refreshData()} disabled={loading} className="p-2 border border-slate-200 rounded-lg bg-white hover:bg-slate-50" title="Refresh">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <button type="button" disabled={syncing} onClick={() => void handleSync()} className="px-3 py-2 border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg flex items-center gap-1.5">
              <UserPlus size={14} />
              {syncing ? 'Syncing…' : 'Sync Teachers'}
            </button>
            <button type="button" onClick={() => setShowRegister(true)} className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5">
              <Plus size={14} />
              Register Teacher
            </button>
            {(meta?.teacherCount === 0 || !calendar?.days.some((d) => d.hasData)) && (
              <button type="button" disabled={seeding} onClick={() => void handleSeed()} className="px-3 py-2 bg-slate-800 text-white text-xs font-bold rounded-lg">
                {seeding ? 'Loading…' : 'Load Demo Data'}
              </button>
            )}
            {report && (
              <button type="button" onClick={() => downloadTeacherAttendanceReportExcel(report)} className="px-3 py-2 bg-amber-400 hover:bg-amber-500 text-slate-900 text-xs font-bold rounded-lg flex items-center gap-1.5">
                <Download size={14} />
                Export Full Report
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-5">
        {errorMsg && (
          <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            <AlertCircle size={16} />
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
            {successMsg}
            <button type="button" onClick={() => setSuccessMsg(null)} className="ml-auto text-xs underline">Dismiss</button>
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Registered Teachers</h2>
              <p className="text-[10px] text-slate-500">Teachers must be registered here before attendance & mobile app login</p>
            </div>
            <span className="text-xs font-semibold text-indigo-600">{teachers.length} registered</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-[10px] uppercase text-slate-500">
                  <th className="px-4 py-2 text-left">Name</th>
                  <th className="px-4 py-2 text-left">Employee Code</th>
                  <th className="px-4 py-2 text-left">Department</th>
                  <th className="px-4 py-2 text-left">Mobile</th>
                  <th className="px-4 py-2 text-left">Email</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map((t) => (
                  <tr key={t.id} className="border-t border-slate-100">
                    <td className="px-4 py-2 font-medium text-slate-800">{t.teacherName}</td>
                    <td className="px-4 py-2 text-slate-600">{t.employeeCode || '—'}</td>
                    <td className="px-4 py-2 text-slate-600">{t.department}</td>
                    <td className="px-4 py-2 text-slate-600">{t.mobile || '—'}</td>
                    <td className="px-4 py-2 text-slate-600">{t.email || '—'}</td>
                  </tr>
                ))}
                {!teachers.length && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-sm">
                      No teachers registered yet. Click <strong>Register Teacher</strong> or <strong>Sync Teachers</strong> to pull from Institution Setup / Subject Management.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {showRegister && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45" onClick={() => setShowRegister(false)}>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-slate-900">Register Teacher</h3>
              <p className="text-xs text-slate-500">Creates a teacher profile for attendance tracking and staff mobile app login.</p>
              <input placeholder="Full Name *" value={registerForm.teacherName} onChange={(e) => setRegisterForm((f) => ({ ...f, teacherName: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              <input placeholder="Department" value={registerForm.department} onChange={(e) => setRegisterForm((f) => ({ ...f, department: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              <input placeholder="Mobile (for app login)" value={registerForm.mobile} onChange={(e) => setRegisterForm((f) => ({ ...f, mobile: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              <input placeholder="Email" value={registerForm.email} onChange={(e) => setRegisterForm((f) => ({ ...f, email: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              <input placeholder="Employee Code (optional — auto-generated if blank)" value={registerForm.employeeCode} onChange={(e) => setRegisterForm((f) => ({ ...f, employeeCode: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => void handleRegister()} disabled={registering || !registerForm.teacherName.trim()} className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg disabled:opacity-50">
                  {registering ? 'Registering…' : 'Register'}
                </button>
                <button type="button" onClick={() => setShowRegister(false)} className="px-4 py-2 border border-slate-200 text-sm rounded-lg">Cancel</button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center"><Users size={18} /></div>
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase">Total Teachers</p>
              <p className="text-2xl font-bold text-slate-900">{calendar?.totalTeachers ?? meta?.teacherCount ?? 0}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-[10px] text-slate-500 font-bold uppercase">Report Period</p>
            <p className="text-sm font-bold text-slate-800 mt-1">{report?.periodLabel || '—'}</p>
            <p className="text-[10px] text-slate-400">{report?.workingDays ?? 0} working days</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-[10px] text-slate-500 font-bold uppercase">Avg Attendance Score</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{report?.summary.avgAttendanceScore ?? 0}%</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-[10px] text-slate-500 font-bold uppercase mb-2">Category Export</p>
            <div className="flex flex-wrap gap-1">
              {(report?.categoryExports || []).map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => report && downloadTeacherAttendanceReportExcel(report, cat.key)}
                  className="text-[9px] px-2 py-0.5 rounded border border-slate-200 hover:bg-slate-50 font-semibold"
                  title={`Export ${cat.title}`}
                >
                  {cat.title.split('–')[0].trim()}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Attendance Calendar</h2>
              <p className="text-[10px] text-slate-500">Click any date to view teachers in all five categories</p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => shiftMonth(-1)} className="p-1.5 rounded border border-slate-200 hover:bg-slate-50"><ChevronLeft size={16} /></button>
              <span className="text-sm font-bold text-slate-800 min-w-[120px] text-center">{calendar?.monthLabel}</span>
              <button type="button" onClick={() => shiftMonth(1)} className="p-1.5 rounded border border-slate-200 hover:bg-slate-50"><ChevronRight size={16} /></button>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mb-3 text-[9px]">
            {STATUS_LEGEND.map((s) => (
              <span key={s.key} className="flex items-center gap-1 text-slate-600">
                <span className={`w-2 h-2 rounded-full ${s.color}`} />
                {s.label}
              </span>
            ))}
          </div>

          {loading && !calendar ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" /></div>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-1 mb-1">
                {WEEKDAYS.map((d) => (
                  <div key={d} className="text-center text-[10px] font-bold text-slate-400 py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {calendarCells.map((day, idx) => {
                  if (!day) return <div key={`empty-${idx}`} className="min-h-[72px]" />;
                  const total = day.counts.total || 0;
                  const presentPct = total ? Math.round((day.counts.present / total) * 100) : 0;
                  return (
                    <button
                      key={day.date}
                      type="button"
                      disabled={day.isWeekend}
                      onClick={() => !day.isWeekend && setSelectedDate(day.date)}
                      className={`min-h-[72px] rounded-lg border p-1.5 text-left transition-all ${
                        day.isWeekend
                          ? 'bg-slate-50 border-slate-100 cursor-default opacity-60'
                          : day.isHoliday
                            ? 'bg-rose-50 border-rose-100 hover:border-rose-300'
                            : day.hasData
                              ? 'bg-white border-slate-200 hover:border-indigo-400 hover:shadow-sm cursor-pointer'
                              : 'bg-white border-dashed border-slate-200 hover:border-slate-300 cursor-pointer'
                      } ${selectedDate === day.date ? 'ring-2 ring-indigo-400' : ''}`}
                    >
                      <div className="flex justify-between items-start">
                        <span className={`text-xs font-bold ${day.isHoliday ? 'text-rose-600' : 'text-slate-700'}`}>{day.day}</span>
                        {day.hasData && <span className="text-[8px] font-bold text-green-600">{presentPct}%</span>}
                      </div>
                      {day.hasData && (
                        <div className="mt-1 space-y-0.5">
                          <div className="flex h-1 rounded-full overflow-hidden bg-slate-100">
                            {total > 0 && (
                              <>
                                <div className="bg-green-500" style={{ width: `${(day.counts.present / total) * 100}%` }} />
                                <div className="bg-blue-500" style={{ width: `${(day.counts.plannedLeaveAbsent / total) * 100}%` }} />
                                <div className="bg-purple-500" style={{ width: `${(day.counts.medicalLeaveAbsent / total) * 100}%` }} />
                                <div className="bg-amber-500" style={{ width: `${(day.counts.unplannedAbsent / total) * 100}%` }} />
                                <div className="bg-red-500" style={{ width: `${(day.counts.unplannedNotIntimated / total) * 100}%` }} />
                              </>
                            )}
                          </div>
                          <p className="text-[8px] text-slate-500">{day.counts.present}P · {total - day.counts.present} absent</p>
                        </div>
                      )}
                      {day.isHoliday && <p className="text-[7px] text-rose-500 mt-1">Holiday</p>}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Date-wise Attendance Scoring</h2>
              <p className="text-[10px] text-slate-500">
                P=Present · PL=Planned Leave · ML=Medical · UA=Unplanned Absent · NI=Not Intimated · Leave used vs granted
              </p>
            </div>
          </div>
          <div className="overflow-x-auto max-h-[480px]">
            {loading && !report ? (
              <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" /></div>
            ) : (
              <table className="w-full text-[10px] min-w-[900px]">
                <thead className="sticky top-0 bg-slate-50 z-10">
                  <tr className="text-slate-500 border-b border-slate-200">
                    <th className="px-3 py-2 text-left font-semibold sticky left-0 bg-slate-50 z-20 min-w-[140px]">Teacher</th>
                    <th className="px-2 py-2 text-left font-semibold">Dept</th>
                    {(report?.dateColumns || []).map((d) => (
                      <th key={d.date} className="px-1 py-2 text-center font-semibold whitespace-nowrap">{d.label}</th>
                    ))}
                    <th className="px-2 py-2 text-center font-semibold text-green-700">Present</th>
                    <th className="px-2 py-2 text-center font-semibold text-blue-700">PL</th>
                    <th className="px-2 py-2 text-center font-semibold text-purple-700">ML</th>
                    <th className="px-2 py-2 text-center font-semibold text-amber-700">UA</th>
                    <th className="px-2 py-2 text-center font-semibold text-red-700">NI</th>
                    <th className="px-2 py-2 text-center font-semibold">Leave Used</th>
                    <th className="px-2 py-2 text-center font-semibold">Granted</th>
                    <th className="px-2 py-2 text-center font-semibold">Balance</th>
                    <th className="px-2 py-2 text-center font-semibold">Score %</th>
                  </tr>
                </thead>
                <tbody>
                  {(report?.rows || []).map((row) => (
                    <tr key={row.teacher.id} className="border-b border-slate-50 hover:bg-slate-50/80">
                      <td className="px-3 py-2 sticky left-0 bg-white z-10">
                        <p className="font-semibold text-slate-800">{row.teacher.teacherName}</p>
                        <p className="text-[9px] text-slate-400">{row.teacher.employeeCode}</p>
                      </td>
                      <td className="px-2 py-2 text-slate-600">{row.teacher.department}</td>
                      {(report?.dateColumns || []).map((d) => (
                        <td key={d.date} className="px-1 py-2 text-center">
                          <span className={`inline-block min-w-[22px] px-1 py-0.5 rounded font-bold ${cellScoreClass(row.daily[d.date])}`}>
                            {row.daily[d.date]}
                          </span>
                        </td>
                      ))}
                      <td className="px-2 py-2 text-center font-semibold">{row.totals.daysPresent}</td>
                      <td className="px-2 py-2 text-center">{row.totals.daysPlannedLeave}</td>
                      <td className="px-2 py-2 text-center">{row.totals.daysMedicalLeave}</td>
                      <td className="px-2 py-2 text-center">{row.totals.daysUnplannedAbsent}</td>
                      <td className="px-2 py-2 text-center">{row.totals.daysNotIntimated}</td>
                      <td className="px-2 py-2 text-center font-semibold">{row.totals.totalLeaveUsed}</td>
                      <td className="px-2 py-2 text-center">{row.leaveGrants.totalGranted}</td>
                      <td className="px-2 py-2 text-center text-green-700 font-semibold">{row.leaveGrants.balance}</td>
                      <td className="px-2 py-2 text-center font-bold">{row.totals.attendanceScore}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {selectedDate && (
        <TeacherAttendanceDayModal
          open
          date={selectedDate}
          academicYear={academicYear}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </div>
  );
}
