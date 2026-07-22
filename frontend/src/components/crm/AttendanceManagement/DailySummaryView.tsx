import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AlertCircle,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  GraduationCap,
  Loader2,
  RefreshCw,
  Search,
  UserCheck,
  Users,
  UserX,
} from 'lucide-react';
import {
  fetchDailySummary,
  fetchDailySummaryMeta,
  type DailySummary,
  type DailySummaryBucket,
  type DailySummaryDesignationRow,
  type DailySummaryPersonRow,
} from '../../../lib/attendanceServices';

type Tab = 'All' | 'Students' | 'Teachers' | 'Staff';

function statusBadgeClass(label: string) {
  const l = label.toLowerCase();
  if (l === 'present') return 'bg-green-100 text-green-700';
  if (l === 'late') return 'bg-amber-100 text-amber-700';
  if (l === 'absent' || l === 'not intimated') return 'bg-red-100 text-red-700';
  if (l === 'on leave' || l === 'medical leave' || l === 'half day') return 'bg-blue-100 text-blue-700';
  if (l === 'unmarked') return 'bg-slate-100 text-slate-500';
  return 'bg-slate-100 text-slate-600';
}

function OverviewCard({
  title,
  icon,
  bucket,
  color,
}: {
  title: string;
  icon: ReactNode;
  bucket: DailySummaryBucket;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="text-2xl font-bold text-slate-900">{bucket.total}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-500">Present</span>
          <span className="font-medium text-green-600">{bucket.present}{bucket.late ? ` (+${bucket.late} late)` : ''}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Absent</span>
          <span className="font-medium text-red-600">{bucket.absent + bucket.notIntimated}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">On Leave</span>
          <span className="font-medium text-blue-600">{bucket.onLeave + bucket.medical}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Unmarked</span>
          <span className="font-medium text-slate-500">{bucket.unmarked}</span>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between text-xs">
        <span className="text-green-600 font-medium">{bucket.presentPercent}% present</span>
        <span className="text-slate-400">{bucket.marked} marked</span>
      </div>
    </div>
  );
}

function DesignationSummaryTable({ rows, showLate = false }: { rows: DailySummaryDesignationRow[]; showLate?: boolean }) {
  if (!rows.length) {
    return <p className="text-sm text-slate-400 p-4">No designation data available.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
          <tr>
            <th className="text-left px-4 py-3">Designation</th>
            <th className="text-right px-4 py-3">Total</th>
            <th className="text-right px-4 py-3">Present</th>
            {showLate && <th className="text-right px-4 py-3">Late</th>}
            <th className="text-right px-4 py-3">Absent</th>
            <th className="text-right px-4 py-3">On Leave</th>
            <th className="text-right px-4 py-3">Medical</th>
            <th className="text-right px-4 py-3">Unmarked</th>
            <th className="text-right px-4 py-3">Present %</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row.designation} className="hover:bg-slate-50">
              <td className="px-4 py-3 font-medium text-slate-800">{row.designation}</td>
              <td className="px-4 py-3 text-right">{row.total}</td>
              <td className="px-4 py-3 text-right text-green-600 font-medium">{row.present}</td>
              {showLate && <td className="px-4 py-3 text-right text-amber-600">{row.late}</td>}
              <td className="px-4 py-3 text-right text-red-600">{row.absent + row.notIntimated}</td>
              <td className="px-4 py-3 text-right text-blue-600">{row.onLeave}</td>
              <td className="px-4 py-3 text-right text-purple-600">{row.medical}</td>
              <td className="px-4 py-3 text-right text-slate-400">{row.unmarked}</td>
              <td className="px-4 py-3 text-right font-medium">{row.presentPercent}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PersonTable({
  rows,
  type,
}: {
  rows: DailySummaryPersonRow[];
  type: Tab;
}) {
  if (!rows.length) {
    return <p className="text-sm text-slate-400 p-6 text-center">No records for this date.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
          <tr>
            <th className="text-left px-4 py-3">Name</th>
            {type === 'Students' && <th className="text-left px-4 py-3">Admission No.</th>}
            {type !== 'Students' && <th className="text-left px-4 py-3">Employee Code</th>}
            {type === 'All' && <th className="text-left px-4 py-3">Category</th>}
            <th className="text-left px-4 py-3">Designation</th>
            {type !== 'Students' && <th className="text-left px-4 py-3">Department</th>}
            <th className="text-left px-4 py-3">Status</th>
            <th className="text-left px-4 py-3">Check-in</th>
            <th className="text-left px-4 py-3">Remarks</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 font-medium text-slate-800">{row.name}</td>
              {type === 'Students' && (
                <td className="px-4 py-3 text-slate-500">{row.admissionNumber || '—'}</td>
              )}
              {type !== 'Students' && (
                <td className="px-4 py-3 text-slate-500">{row.employeeCode || '—'}</td>
              )}
              {type === 'All' && (
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    row.category === 'Teacher' ? 'bg-indigo-100 text-indigo-700' : 'bg-orange-100 text-orange-700'
                  }`}>
                    {row.category}
                  </span>
                </td>
              )}
              <td className="px-4 py-3 text-slate-700">{row.designation}</td>
              {type !== 'Students' && (
                <td className="px-4 py-3 text-slate-500">{row.department || '—'}</td>
              )}
              <td className="px-4 py-3">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusBadgeClass(row.statusLabel)}`}>
                  {row.statusLabel}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-500">{row.checkInTime}</td>
              <td className="px-4 py-3 text-slate-400 max-w-[200px] truncate">{row.remarks}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DailySummaryView() {
  const [meta, setMeta] = useState<Awaited<ReturnType<typeof fetchDailySummaryMeta>> | null>(null);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [selectedDate, setSelectedDate] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('All');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const m = await fetchDailySummaryMeta(academicYear);
      setMeta(m);
      const date = selectedDate || m.latestDate;
      if (!selectedDate) setSelectedDate(m.latestDate);
      const data = await fetchDailySummary({ academicYear, date });
      setSummary(data);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load daily summary');
    } finally {
      setLoading(false);
    }
  }, [academicYear, selectedDate]);

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    if (!selectedDate) return;
    void (async () => {
      setErrorMsg(null);
      try {
        const data = await fetchDailySummary({ academicYear, date: selectedDate });
        setSummary(data);
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Failed to refresh');
      }
    })();
  }, [selectedDate, academicYear]);

  const currentRows = useMemo(() => {
    if (!summary) return [];
    let rows: DailySummaryPersonRow[] = [];
    if (activeTab === 'Students') rows = summary.students.rows;
    else if (activeTab === 'Teachers') rows = summary.teachers.rows;
    else if (activeTab === 'Staff') rows = summary.staff.rows;
    else rows = summary.allStaff.rows;

    if (statusFilter !== 'all') {
      rows = rows.filter((r) => r.statusLabel.toLowerCase() === statusFilter.toLowerCase());
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((r) =>
        r.name.toLowerCase().includes(q)
        || r.designation.toLowerCase().includes(q)
        || (r.department || '').toLowerCase().includes(q)
        || (r.admissionNumber || '').toLowerCase().includes(q)
        || (r.employeeCode || '').toLowerCase().includes(q),
      );
    }
    return rows;
  }, [summary, activeTab, search, statusFilter]);

  const currentByDesignation = useMemo(() => {
    if (!summary) return [];
    if (activeTab === 'Students') return summary.students.byDesignation;
    if (activeTab === 'Teachers') return summary.teachers.byDesignation;
    if (activeTab === 'Staff') return summary.staff.byDesignation;
    return summary.allStaff.byDesignation;
  }, [summary, activeTab]);

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-slate-500">
        <Loader2 className="animate-spin mr-2" size={20} />
        Loading daily summary...
      </div>
    );
  }

  return (
    <div className="space-y-6 p-1">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Daily Summary</h1>
          <p className="text-slate-500 text-sm mt-1">
            Complete student and staff attendance summary with designation breakdown
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
            onClick={() => void load()}
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

      <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white rounded-xl p-5">
        <p className="text-slate-300 text-xs uppercase tracking-wide">Attendance Date</p>
        <p className="text-xl font-semibold mt-1">{summary?.dateLabel}</p>
        <p className="text-sm text-slate-300 mt-1">
          {summary?.overview.grandTotal ?? 0} total individuals tracked across students, teachers & staff
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {summary && (
          <>
            <OverviewCard
              title="Students"
              icon={<GraduationCap size={20} className="text-blue-600" />}
              bucket={summary.overview.students}
              color="bg-blue-50"
            />
            <OverviewCard
              title="Teachers"
              icon={<UserCheck size={20} className="text-indigo-600" />}
              bucket={summary.overview.teachers}
              color="bg-indigo-50"
            />
            <OverviewCard
              title="Staff"
              icon={<Briefcase size={20} className="text-orange-600" />}
              bucket={summary.overview.staff}
              color="bg-orange-50"
            />
            <OverviewCard
              title="All Staff (Teachers + Staff)"
              icon={<Users size={20} className="text-purple-600" />}
              bucket={summary.overview.allStaff}
              color="bg-purple-50"
            />
          </>
        )}
      </div>

      <div className="border-b border-slate-200">
        <div className="flex gap-1 overflow-x-auto">
          {(['All', 'Students', 'Teachers', 'Staff'] as Tab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => { setActiveTab(tab); setStatusFilter('all'); }}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Summary by Designation</h2>
          <p className="text-sm text-slate-500">
            {activeTab === 'Students'
              ? 'Class-wise student attendance breakdown'
              : 'Attendance grouped by job designation'}
          </p>
        </div>
        <DesignationSummaryTable
          rows={currentByDesignation}
          showLate={activeTab === 'Students' || activeTab === 'All'}
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="font-semibold text-slate-900">Detailed Records</h2>
            <p className="text-sm text-slate-500">{currentRows.length} record(s) shown</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search name, designation..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg w-48"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">All Status</option>
              <option value="Present">Present</option>
              <option value="Absent">Absent</option>
              <option value="Late">Late</option>
              <option value="On Leave">On Leave</option>
              <option value="Medical Leave">Medical Leave</option>
              <option value="Not Intimated">Not Intimated</option>
              <option value="Unmarked">Unmarked</option>
            </select>
          </div>
        </div>
        <PersonTable rows={currentRows} type={activeTab} />
      </div>

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickStat
            icon={<CheckCircle2 size={16} className="text-green-500" />}
            label="Total Present Today"
            value={
              summary.overview.students.present
              + summary.overview.students.late
              + summary.overview.allStaff.present
            }
          />
          <QuickStat
            icon={<UserX size={16} className="text-red-500" />}
            label="Total Absent Today"
            value={
              summary.overview.students.absent
              + summary.overview.allStaff.absent
              + summary.overview.allStaff.notIntimated
            }
          />
          <QuickStat
            icon={<Clock size={16} className="text-amber-500" />}
            label="Total Unmarked"
            value={
              summary.overview.students.unmarked
              + summary.overview.allStaff.unmarked
            }
          />
        </div>
      )}
    </div>
  );
}

function QuickStat({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
      {icon}
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}
