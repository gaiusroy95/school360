import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Briefcase,
  CheckCircle2,
  Clock,
  GraduationCap,
  Loader2,
  LogOut,
  RefreshCw,
  Save,
  Search,
  Settings,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import {
  fetchLateEarlyExitMeta,
  fetchLateEarlyExitReport,
  syncLateEarlyMetrics,
  updateLateEarlyTimeline,
  type LateEarlyCategory,
  type LateEarlyRow,
  type LateEarlyTypeFilter,
  type TimelineConfig,
} from '../../../lib/attendanceServices';

function violationClass(type: LateEarlyRow['violationType']) {
  if (type === 'Late Coming') return 'bg-amber-100 text-amber-700';
  if (type === 'Early Exit') return 'bg-orange-100 text-orange-700';
  if (type === 'Late & Early Exit') return 'bg-red-100 text-red-700';
  return 'bg-green-100 text-green-700';
}

function categoryIcon(category: LateEarlyRow['category']) {
  if (category === 'student') return <GraduationCap size={14} />;
  if (category === 'teacher') return <UserCheck size={14} />;
  return <Briefcase size={14} />;
}

function canEditTimeline(role?: string) {
  return role === 'SUPER_ADMIN' || role === 'ADMIN';
}

export function LateEarlyExitView() {
  const { user } = useAuth();
  const isAdmin = canEditTimeline(user?.role);

  const [meta, setMeta] = useState<Awaited<ReturnType<typeof fetchLateEarlyExitMeta>> | null>(null);
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchLateEarlyExitReport>> | null>(null);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState<LateEarlyCategory>('all');
  const [type, setType] = useState<LateEarlyTypeFilter>('all');
  const [className, setClassName] = useState('');
  const [search, setSearch] = useState('');
  const [violationsOnly, setViolationsOnly] = useState(true);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [timelineForm, setTimelineForm] = useState<TimelineConfig | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const m = await fetchLateEarlyExitMeta();
      setMeta(m);
      setAcademicYear(m.defaultAcademicYear);
      setTimelineForm(m.timeline);
      const res = await fetchLateEarlyExitReport({
        academicYear: m.defaultAcademicYear,
        date,
        category,
        type,
        className: className || undefined,
        q: search || undefined,
        violationsOnly,
      });
      setData(res);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load late/early exit data');
    } finally {
      setLoading(false);
    }
  }, [date, category, type, className, search, violationsOnly]);

  const refresh = useCallback(async () => {
    try {
      const res = await fetchLateEarlyExitReport({
        academicYear,
        date,
        category,
        type,
        className: className || undefined,
        q: search || undefined,
        violationsOnly,
      });
      setData(res);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to refresh');
    }
  }, [academicYear, date, category, type, className, search, violationsOnly]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!meta) return;
    void refresh();
  }, [academicYear, date, category, type, className, violationsOnly]);

  const handleSaveTimeline = async () => {
    if (!timelineForm) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const updated = await updateLateEarlyTimeline(timelineForm);
      setSuccessMsg('Timeline settings saved');
      setTimelineForm(updated);
      setSettingsOpen(false);
      await refresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save timeline');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSync = async () => {
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await syncLateEarlyMetrics(date);
      setSuccessMsg(`Recalculated late/early metrics for ${res.updated} records`);
      await refresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredItems = useMemo(() => data?.items || [], [data]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-slate-500">
        <Loader2 className="animate-spin mr-2" size={20} />
        Loading late coming / early exit...
      </div>
    );
  }

  return (
    <div className="space-y-4 p-1">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Late Coming / Early Exit</h1>
          <p className="text-slate-500 text-sm mt-1">
            Capture all students and staff late arrivals and early departures against defined timelines
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isAdmin && (
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              <Settings size={16} />
              Timeline Settings
            </button>
          )}
          <button
            type="button"
            onClick={() => void handleSync()}
            disabled={submitting}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            Recalculate
          </button>
          <button
            type="button"
            onClick={() => void refresh()}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          <CheckCircle2 size={16} />
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle size={16} />
          {errorMsg}
        </div>
      )}

      {meta && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {meta.timelineLegend.map((legend) => (
            <div key={legend.group} className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-800 mb-2">{legend.group} Timeline</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-slate-500">School Start</span><p className="font-medium">{legend.start}</p></div>
                <div><span className="text-slate-500">Late After</span><p className="font-medium text-amber-600">{legend.lateAfter}</p></div>
                <div><span className="text-slate-500">School End</span><p className="font-medium">{legend.end}</p></div>
                <div><span className="text-slate-500">Early Exit Before</span><p className="font-medium text-orange-600">{legend.earlyBefore}</p></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { label: 'Total', value: data.summary.total, color: 'text-slate-900', filter: 'all' as LateEarlyTypeFilter },
            { label: 'Late Coming', value: data.summary.lateComing, color: 'text-amber-600', filter: 'late' as LateEarlyTypeFilter },
            { label: 'Early Exit', value: data.summary.earlyExit, color: 'text-orange-600', filter: 'early' as LateEarlyTypeFilter },
            { label: 'Both', value: data.summary.both, color: 'text-red-600', filter: 'both' as LateEarlyTypeFilter },
            { label: 'Students', value: data.summary.students, color: 'text-blue-600', filter: null },
            { label: 'Staff + Teachers', value: data.summary.teachers + data.summary.staff, color: 'text-purple-600', filter: null },
          ].map((kpi) => (
            <button
              key={kpi.label}
              type="button"
              onClick={() => { if (kpi.filter) setType(kpi.filter); }}
              className={`bg-white rounded-xl border border-slate-200 p-3 text-left hover:border-blue-200 transition-colors ${
                kpi.filter && type === kpi.filter ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              <p className="text-xs text-slate-500 uppercase">{kpi.label}</p>
              <p className={`text-xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
            </button>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs text-slate-500 block mb-1">Academic Year</label>
          <select
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
          >
            {(meta?.academicYears || ['2025-26']).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as LateEarlyCategory)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All</option>
            <option value="students">Students</option>
            <option value="teachers">Teachers</option>
            <option value="staff">Staff</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">Class (Students)</label>
          <select
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All Classes</option>
            {(meta?.classes || []).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as LateEarlyTypeFilter)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All Types</option>
            <option value="late">Late Coming</option>
            <option value="early">Early Exit</option>
            <option value="both">Late & Early</option>
          </select>
        </div>
        <div className="flex items-center gap-2 pb-2">
          <input
            id="violationsOnly"
            type="checkbox"
            checked={violationsOnly}
            onChange={(e) => setViolationsOnly(e.target.checked)}
            className="rounded border-slate-300"
          />
          <label htmlFor="violationsOnly" className="text-sm text-slate-600">Violations only</label>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs text-slate-500 block mb-1">Search</label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void refresh(); }}
              placeholder="Name, ID, class, department..."
              className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 font-semibold text-sm text-slate-800 flex items-center gap-2">
          <Clock size={16} className="text-amber-600" />
          <LogOut size={16} className="text-orange-600" />
          Records for {data?.date} ({filteredItems.length})
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Category</th>
                <th className="text-left px-4 py-3">Class / Dept</th>
                <th className="text-left px-4 py-3">Check-in</th>
                <th className="text-left px-4 py-3">Check-out</th>
                <th className="text-right px-4 py-3">Late (min)</th>
                <th className="text-right px-4 py-3">Early (min)</th>
                <th className="text-left px-4 py-3">Violation</th>
                <th className="text-left px-4 py-3">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!filteredItems.length ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                    No late coming or early exit records for selected filters
                  </td>
                </tr>
              ) : filteredItems.map((row) => (
                <tr key={`${row.category}-${row.id}`} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">{categoryIcon(row.category)}</span>
                      <div>
                        <p className="font-medium text-slate-900">{row.name}</p>
                        <p className="text-xs text-slate-400">{row.code}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{row.categoryLabel}</td>
                  <td className="px-4 py-3">
                    <p className="text-slate-800">{row.classGroup}</p>
                    <p className="text-xs text-slate-400">{row.designation}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={row.isLateComing ? 'text-amber-700 font-medium' : 'text-slate-700'}>
                      {row.checkInTime}
                    </span>
                    <p className="text-xs text-slate-400">After {row.lateAfter}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={row.isEarlyExit ? 'text-orange-700 font-medium' : 'text-slate-700'}>
                      {row.checkOutTime}
                    </span>
                    <p className="text-xs text-slate-400">Before {row.earlyExitBefore}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-amber-600">
                    {row.lateMinutes > 0 ? row.lateMinutes : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-orange-600">
                    {row.earlyExitMinutes > 0 ? row.earlyExitMinutes : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${violationClass(row.violationType)}`}>
                      {row.violationType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{row.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {settingsOpen && timelineForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 my-8">
            <h3 className="font-semibold text-slate-900 mb-4">Timeline Settings</h3>
            <p className="text-sm text-slate-500 mb-6">
              Define when late coming and early exit violations are recorded for each group.
            </p>
            <div className="space-y-6">
              {([
                { key: 'student', label: 'Students', prefix: 'student' },
                { key: 'teacher', label: 'Teachers', prefix: 'teacher' },
                { key: 'staff', label: 'Staff', prefix: 'staff' },
              ] as const).map((group) => (
                <div key={group.key} className="border border-slate-200 rounded-lg p-4">
                  <p className="text-sm font-semibold text-slate-800 mb-3">{group.label}</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {([
                      { field: `${group.prefix}SchoolStart`, label: 'School Start' },
                      { field: `${group.prefix}LateAfter`, label: 'Late After' },
                      { field: `${group.prefix}SchoolEnd`, label: 'School End' },
                      { field: `${group.prefix}EarlyExitBefore`, label: 'Early Exit Before' },
                    ] as const).map((f) => (
                      <div key={f.field}>
                        <label className="text-xs text-slate-500 block mb-1">{f.label}</label>
                        <input
                          type="text"
                          value={timelineForm[f.field as keyof TimelineConfig] as string}
                          onChange={(e) => setTimelineForm((prev) => prev ? { ...prev, [f.field]: e.target.value } : prev)}
                          placeholder="08:00"
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSaveTimeline()}
                disabled={submitting}
                className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save Timeline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
