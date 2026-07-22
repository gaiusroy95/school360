import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Bell,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  Loader2,
  RefreshCw,
  Stethoscope,
  UserCheck,
  UserMinus,
  UserX,
  Users,
} from 'lucide-react';
import {
  assignSubstituteTeacher,
  fetchAttendanceByDateMeta,
  fetchAttendanceByDateSummary,
  fetchAttendanceByDateTeachers,
  fetchSubstituteAssignmentBoard,
  type AttendanceByDateFilter,
  type AttendanceByDateSummary,
  type AttendanceByDateTeacher,
  type SubstituteAssignmentBoard,
} from '../../../lib/attendanceServices';

const TILE_CONFIG: Record<
  AttendanceByDateFilter,
  { icon: typeof UserCheck; color: string; bg: string; border: string }
> = {
  present: {
    icon: UserCheck,
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-200 ring-green-500',
  },
  absent: {
    icon: UserX,
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200 ring-red-500',
  },
  onLeave: {
    icon: UserMinus,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200 ring-blue-500',
  },
  medicalLeave: {
    icon: Stethoscope,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-200 ring-purple-500',
  },
};

type MainTab = 'Teacher Details' | 'Class Assigned';

export function AttendanceByDateView() {
  const [meta, setMeta] = useState<Awaited<ReturnType<typeof fetchAttendanceByDateMeta>> | null>(null);
  const [summary, setSummary] = useState<AttendanceByDateSummary | null>(null);
  const [teachersData, setTeachersData] = useState<Awaited<ReturnType<typeof fetchAttendanceByDateTeachers>> | null>(null);
  const [assignmentBoard, setAssignmentBoard] = useState<SubstituteAssignmentBoard | null>(null);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [selectedDate, setSelectedDate] = useState('');
  const [activeFilter, setActiveFilter] = useState<AttendanceByDateFilter>('present');
  const [mainTab, setMainTab] = useState<MainTab>('Teacher Details');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [substitutePick, setSubstitutePick] = useState<Record<string, string>>({});
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadMeta = useCallback(async () => {
    const m = await fetchAttendanceByDateMeta(academicYear);
    setMeta(m);
    if (!selectedDate) setSelectedDate(m.latestDate);
    return m;
  }, [academicYear, selectedDate]);

  const loadSummary = useCallback(async (date: string) => {
    const s = await fetchAttendanceByDateSummary({ academicYear, date });
    setSummary(s);
    return s;
  }, [academicYear]);

  const loadTeachers = useCallback(async (date: string, filter: AttendanceByDateFilter) => {
    setDetailLoading(true);
    try {
      const data = await fetchAttendanceByDateTeachers({ academicYear, date, filter });
      setTeachersData(data);
    } finally {
      setDetailLoading(false);
    }
  }, [academicYear]);

  const loadAssignments = useCallback(async (date: string) => {
    const board = await fetchSubstituteAssignmentBoard({ academicYear, date });
    setAssignmentBoard(board);
    return board;
  }, [academicYear]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const m = await loadMeta();
      const date = selectedDate || m.latestDate;
      await Promise.all([
        loadSummary(date),
        loadTeachers(date, activeFilter),
        loadAssignments(date),
      ]);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load attendance by date');
    } finally {
      setLoading(false);
    }
  }, [loadMeta, loadSummary, loadTeachers, loadAssignments, selectedDate, activeFilter]);

  useEffect(() => { void loadAll(); }, []);

  useEffect(() => {
    if (!selectedDate || loading) return;
    void (async () => {
      setErrorMsg(null);
      try {
        await Promise.all([
          loadSummary(selectedDate),
          loadTeachers(selectedDate, activeFilter),
          loadAssignments(selectedDate),
        ]);
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Failed to refresh');
      }
    })();
  }, [selectedDate, academicYear, activeFilter]);

  const activeTile = useMemo(
    () => summary?.tiles.find((t) => t.id === activeFilter),
    [summary, activeFilter],
  );

  const handleTileClick = (filter: AttendanceByDateFilter) => {
    setActiveFilter(filter);
    setMainTab('Teacher Details');
  };

  const handleAssign = async (absentTeacherId: string, slotIds?: string[]) => {
    const substituteId = substitutePick[absentTeacherId];
    if (!substituteId) {
      setErrorMsg('Please select a substitute teacher');
      return;
    }
    setAssigningId(absentTeacherId);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const result = await assignSubstituteTeacher({
        academicYear,
        date: selectedDate,
        absentTeacherProfileId: absentTeacherId,
        substituteTeacherProfileId: substituteId,
        timetableSlotIds: slotIds,
        notify: true,
      });
      setSuccessMsg(
        `Assigned ${result.assigned} class(es) to ${result.substituteTeacherName}. Push notification sent to mobile.`,
      );
      await loadAssignments(selectedDate);
      if (mainTab === 'Teacher Details') {
        await loadTeachers(selectedDate, activeFilter);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Assignment failed');
    } finally {
      setAssigningId(null);
    }
  };

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-slate-500">
        <Loader2 className="animate-spin mr-2" size={20} />
        Loading attendance by date...
      </div>
    );
  }

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Attendance By Date</h1>
          <p className="text-slate-500 text-sm mt-1">
            Teacher attendance snapshot with class substitute assignment
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
          >
            {(meta?.academicYears || ['2025-26']).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2 bg-white">
            <Calendar size={16} className="text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-sm outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => void loadAll()}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle size={16} />
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          <CheckCircle2 size={16} />
          {successMsg}
        </div>
      )}

      {/* Date banner */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white rounded-xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-slate-300 text-xs uppercase tracking-wide">Latest Attendance Date</p>
          <p className="text-xl font-semibold mt-1">{summary?.dateLabel || selectedDate}</p>
        </div>
        <div className="flex gap-6 text-sm">
          <div>
            <p className="text-slate-300">Total Teachers</p>
            <p className="text-lg font-bold">{summary?.totalTeachers ?? 0}</p>
          </div>
          <div>
            <p className="text-slate-300">Marked</p>
            <p className="text-lg font-bold text-green-300">{summary?.markedCount ?? 0}</p>
          </div>
          <div>
            <p className="text-slate-300">Unmarked</p>
            <p className="text-lg font-bold text-amber-300">{summary?.unmarkedCount ?? 0}</p>
          </div>
        </div>
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {(summary?.tiles || []).map((tile) => {
          const cfg = TILE_CONFIG[tile.id];
          const Icon = cfg.icon;
          const isActive = activeFilter === tile.id;
          return (
            <button
              key={tile.id}
              type="button"
              onClick={() => handleTileClick(tile.id)}
              className={`text-left rounded-xl border p-5 transition-all hover:shadow-md ${cfg.bg} ${cfg.border} ${
                isActive ? 'ring-2 shadow-md' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className={`p-2 rounded-lg bg-white/80 ${cfg.color}`}>
                  <Icon size={20} />
                </div>
                <ChevronDown size={16} className={`text-slate-400 transition-transform ${isActive ? 'rotate-180' : ''}`} />
              </div>
              <p className="text-sm font-medium text-slate-600 mt-3">{tile.title}</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{tile.count}</p>
              <p className="text-sm text-slate-500 mt-1">
                {tile.percent}% of {tile.totalTeachers} teachers
              </p>
            </button>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-1">
          {(['Teacher Details', 'Class Assigned'] as MainTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setMainTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                mainTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab}
              {tab === 'Class Assigned' && assignmentBoard?.absentTeachers.length ? (
                <span className="ml-2 px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">
                  {assignmentBoard.absentTeachers.length}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {/* Teacher Details Tab */}
      {mainTab === 'Teacher Details' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">
                {activeTile?.title || 'Teachers'} — {summary?.dateLabel}
              </h2>
              <p className="text-sm text-slate-500">
                {activeTile?.count ?? 0} teacher(s) · {activeTile?.percent ?? 0}% of all teachers
              </p>
            </div>
            {detailLoading && <Loader2 className="animate-spin text-slate-400" size={18} />}
          </div>

          {!teachersData?.teachers.length ? (
            <div className="p-10 text-center text-slate-500">
              <Users size={32} className="mx-auto mb-2 opacity-40" />
              No teachers in this category for the selected date.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {teachersData.teachers.map((teacher) => (
                <TeacherDetailCard key={teacher.id} teacher={teacher} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Class Assigned Tab */}
      {mainTab === 'Class Assigned' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800 flex items-start gap-2">
            <Bell size={16} className="mt-0.5 shrink-0" />
            <p>
              Assign absent teachers&apos; scheduled classes to present teachers. A push notification is
              automatically sent to the substitute teacher&apos;s registered mobile number.
            </p>
          </div>

          {!assignmentBoard?.absentTeachers.length ? (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-500">
              <CheckCircle2 size={32} className="mx-auto mb-2 text-green-400" />
              No absent teachers requiring class assignment on this date.
            </div>
          ) : (
            assignmentBoard.absentTeachers.map((absent) => {
              const unassigned = absent.scheduledPeriods.filter((p) => !p.isAssigned);
              const allAssigned = unassigned.length === 0 && absent.scheduledPeriods.length > 0;
              return (
                <div key={absent.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900">{absent.teacherName}</h3>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                          {absent.statusLabel}
                        </span>
                        {allAssigned && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                            All Assigned
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500">{absent.employeeCode}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={substitutePick[absent.id] || ''}
                        onChange={(e) => setSubstitutePick((prev) => ({ ...prev, [absent.id]: e.target.value }))}
                        className="border border-slate-200 rounded-lg px-3 py-2 text-sm min-w-[200px]"
                      >
                        <option value="">Select present teacher...</option>
                        {assignmentBoard.presentTeachers.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.teacherName} ({p.department})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={assigningId === absent.id || !substitutePick[absent.id]}
                        onClick={() => void handleAssign(absent.id)}
                        className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                      >
                        {assigningId === absent.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Bell size={14} />
                        )}
                        Assign All & Notify
                      </button>
                    </div>
                  </div>

                  <div className="p-5">
                    <p className="text-xs font-medium text-slate-500 uppercase mb-3">Scheduled Classes</p>
                    {absent.scheduledPeriods.length === 0 ? (
                      <p className="text-sm text-slate-400">No scheduled periods for this day.</p>
                    ) : (
                      <div className="grid gap-2">
                        {absent.scheduledPeriods.map((period) => (
                          <div
                            key={period.id}
                            className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-lg border ${
                              period.isAssigned ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-bold px-2 py-1 bg-white rounded border border-slate-200">
                                {period.periodLabel}
                              </span>
                              <div>
                                <p className="text-sm font-medium text-slate-800">{period.subjectName}</p>
                                <p className="text-xs text-slate-500">
                                  {period.classGroup} · {period.timeRange}
                                  {period.room ? ` · ${period.room}` : ''}
                                </p>
                              </div>
                            </div>
                            {period.isAssigned ? (
                              <div className="flex items-center gap-2 text-sm text-green-700">
                                <CheckCircle2 size={14} />
                                Cover: {period.assignment?.substituteTeacherName}
                                {absent.assignments.find((a) => a.periodLabel === period.periodLabel)?.notificationSentAt && (
                                  <span className="text-xs text-green-600 flex items-center gap-1">
                                    <Bell size={12} /> Notified
                                  </span>
                                )}
                              </div>
                            ) : (
                              <button
                                type="button"
                                disabled={assigningId === absent.id || !substitutePick[absent.id]}
                                onClick={() => void handleAssign(absent.id, [period.id])}
                                className="text-xs px-3 py-1.5 border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-50 disabled:opacity-50"
                              >
                                Assign This Period
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {absent.assignments.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-100">
                        <p className="text-xs font-medium text-slate-500 uppercase mb-2">Assignment Log</p>
                        <div className="space-y-1">
                          {absent.assignments.map((a) => (
                            <div key={a.id} className="text-sm text-slate-600 flex items-center gap-2">
                              <CheckCircle2 size={14} className="text-green-500" />
                              {a.periodLabel} {a.subjectName} ({a.classGroup}) → {a.substituteTeacherName}
                              {a.notificationSentAt && (
                                <span className="text-xs text-green-600 flex items-center gap-1">
                                  <Bell size={11} /> Sent
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {assignmentBoard && assignmentBoard.assignments.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-900">All Substitute Assignments — {summary?.dateLabel}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                    <tr>
                      <th className="text-left px-4 py-3">Absent Teacher</th>
                      <th className="text-left px-4 py-3">Substitute</th>
                      <th className="text-left px-4 py-3">Class</th>
                      <th className="text-left px-4 py-3">Subject</th>
                      <th className="text-left px-4 py-3">Period</th>
                      <th className="text-left px-4 py-3">Time</th>
                      <th className="text-left px-4 py-3">Notified</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {assignmentBoard.assignments.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium">{a.absentTeacherName}</td>
                        <td className="px-4 py-3 text-blue-700">{a.substituteTeacherName}</td>
                        <td className="px-4 py-3">{a.classGroup}</td>
                        <td className="px-4 py-3">{a.subjectName}</td>
                        <td className="px-4 py-3">{a.periodLabel}</td>
                        <td className="px-4 py-3 text-slate-500">{a.timeRange}</td>
                        <td className="px-4 py-3">
                          {a.notificationSentAt ? (
                            <span className="flex items-center gap-1 text-green-600 text-xs">
                              <Bell size={12} /> Yes
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TeacherDetailCard({ teacher }: { teacher: AttendanceByDateTeacher }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="p-5">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-start justify-between text-left"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-semibold text-sm">
            {teacher.teacherName.split(' ').map((n) => n[0]).slice(0, 2).join('')}
          </div>
          <div>
            <p className="font-semibold text-slate-900">{teacher.teacherName}</p>
            <p className="text-sm text-slate-500">
              {teacher.employeeCode} · {teacher.department}
            </p>
            {teacher.checkInTime && (
              <p className="text-xs text-green-600 flex items-center gap-1 mt-0.5">
                <Clock size={11} /> Check-in: {teacher.checkInTime}
              </p>
            )}
          </div>
        </div>
        <ChevronDown
          size={16}
          className={`text-slate-400 mt-1 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {expanded && (
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4 ml-12">
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-xs font-medium text-slate-500 uppercase flex items-center gap-1 mb-2">
              <Users size={12} /> Class Teacher
            </p>
            {teacher.classTeacherOf.length === 0 ? (
              <p className="text-sm text-slate-400">Not a class teacher</p>
            ) : (
              <ul className="space-y-1">
                {teacher.classTeacherOf.map((c) => (
                  <li key={`${c.className}-${c.sectionName}`} className="text-sm text-slate-700">
                    {c.classGroup}
                    {c.room ? <span className="text-slate-400"> · {c.room}</span> : null}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-xs font-medium text-slate-500 uppercase flex items-center gap-1 mb-2">
              <BookOpen size={12} /> Subjects
            </p>
            {teacher.subjects.length === 0 ? (
              <p className="text-sm text-slate-400">No subjects allocated</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {teacher.subjects.map((s) => (
                  <span key={s} className="text-xs px-2 py-1 bg-white border border-slate-200 rounded-full text-slate-700">
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="bg-slate-50 rounded-lg p-4 lg:col-span-1">
            <p className="text-xs font-medium text-slate-500 uppercase flex items-center gap-1 mb-2">
              <Clock size={12} /> Scheduled Periods ({teacher.periodCount})
            </p>
            {teacher.scheduledPeriods.length === 0 ? (
              <p className="text-sm text-slate-400">No classes scheduled today</p>
            ) : (
              <ul className="space-y-2">
                {teacher.scheduledPeriods.map((p) => (
                  <li key={p.id} className="text-sm flex items-center gap-2">
                    <span className="text-xs font-bold px-1.5 py-0.5 bg-white border border-slate-200 rounded">
                      {p.periodLabel}
                    </span>
                    <span className="text-slate-700">{p.subjectName}</span>
                    <span className="text-slate-400 text-xs">{p.classGroup}</span>
                    <span className="text-slate-400 text-xs ml-auto">{p.timeRange}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
