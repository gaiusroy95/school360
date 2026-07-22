import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AlertCircle,
  Briefcase,
  Download,
  FileSpreadsheet,
  GraduationCap,
  Loader2,
  RefreshCw,
  UserCheck,
} from 'lucide-react';
import {
  fetchAllAttendanceReports,
  fetchAttendanceReportsMeta,
  type AllAttendanceReports,
  type StudentPeriod,
} from '../../../lib/attendanceServices';
import {
  downloadAllAttendanceReportsExcel,
  downloadStudentAttendanceReportExcel,
} from '../../../lib/attendanceReportExcel';
import { downloadTeacherAttendanceReportExcel } from '../../../lib/teacherAttendanceExcel';
import { downloadStaffAttendanceReportExcel } from '../../../lib/staffAttendanceExcel';

const PERIODS: { id: StudentPeriod; label: string }[] = [
  { id: 'monthly', label: 'Monthly' },
  { id: 'quarterly', label: 'Quarterly' },
  { id: 'half_yearly', label: 'Half Yearly' },
  { id: 'yearly', label: 'Yearly' },
];

export function AttendanceReportView() {
  const now = new Date();
  const [meta, setMeta] = useState<Awaited<ReturnType<typeof fetchAttendanceReportsMeta>> | null>(null);
  const [reports, setReports] = useState<AllAttendanceReports | null>(null);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [period, setPeriod] = useState<StudentPeriod>('monthly');
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth() + 1);
  const [quarter, setQuarter] = useState(1);
  const [half, setHalf] = useState<1 | 2>(1);
  const [section, setSection] = useState('All Sections');
  const [classFilter, setClassFilter] = useState('All Classes');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const reportParams = useMemo(() => ({
    academicYear,
    period,
    year: calYear,
    month: calMonth,
    quarter,
    half,
    sectionName: section !== 'All Sections' ? section : undefined,
    className: classFilter !== 'All Classes' ? classFilter : undefined,
  }), [academicYear, period, calYear, calMonth, quarter, half, section, classFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const m = await fetchAttendanceReportsMeta();
      setMeta(m);
      setAcademicYear(m.defaultAcademicYear);
      const data = await fetchAllAttendanceReports({
        academicYear: m.defaultAcademicYear,
        period,
        year: calYear,
        month: calMonth,
        quarter,
        half,
      });
      setReports(data);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load attendance reports');
    } finally {
      setLoading(false);
    }
  }, [period, calYear, calMonth, quarter, half]);

  const refreshReports = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await fetchAllAttendanceReports(reportParams);
      setReports(data);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to refresh reports');
    } finally {
      setLoading(false);
    }
  }, [reportParams]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!meta) return;
    void refreshReports();
  }, [academicYear, period, quarter, half, calYear, calMonth, section, classFilter]);

  const handleDownload = async (type: 'all' | 'students' | 'teachers' | 'staff') => {
    if (!reports) return;
    setDownloading(type);
    try {
      if (type === 'all') downloadAllAttendanceReportsExcel(reports);
      else if (type === 'students') downloadStudentAttendanceReportExcel(reports.students);
      else if (type === 'teachers') downloadTeacherAttendanceReportExcel(reports.teachers);
      else if (type === 'staff') downloadStaffAttendanceReportExcel(reports.staff);
    } finally {
      setDownloading(null);
    }
  };

  if (loading && !reports) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-slate-500">
        <Loader2 className="animate-spin mr-2" size={20} />
        Loading attendance reports...
      </div>
    );
  }

  return (
    <div className="space-y-6 p-1">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Attendance Report</h1>
          <p className="text-slate-500 text-sm mt-1">
            Download complete student and staff attendance data in Excel format
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refreshReports()}
          className="flex items-center gap-2 px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 self-start"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle size={16} />
          {errorMsg}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-900 mb-4">Report Filters</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-xs text-slate-500 block mb-1">Academic Year</label>
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            >
              {(meta?.academicYears || ['2025-26']).map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Period</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as StudentPeriod)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            >
              {PERIODS.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>
          {period === 'monthly' && (
            <>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Year</label>
                <input
                  type="number"
                  value={calYear}
                  onChange={(e) => setCalYear(Number(e.target.value))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Month</label>
                <select
                  value={calMonth}
                  onChange={(e) => setCalMonth(Number(e.target.value))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {new Date(2000, m - 1, 1).toLocaleDateString('en-IN', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
          {period === 'quarterly' && (
            <div>
              <label className="text-xs text-slate-500 block mb-1">Quarter</label>
              <select
                value={quarter}
                onChange={(e) => setQuarter(Number(e.target.value))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              >
                {[1, 2, 3, 4].map((q) => (
                  <option key={q} value={q}>Quarter {q}</option>
                ))}
              </select>
            </div>
          )}
          {period === 'half_yearly' && (
            <div>
              <label className="text-xs text-slate-500 block mb-1">Half Year</label>
              <select
                value={half}
                onChange={(e) => setHalf(Number(e.target.value) as 1 | 2)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value={1}>Half Year 1 (Apr–Sep)</option>
                <option value={2}>Half Year 2 (Oct–Mar)</option>
              </select>
            </div>
          )}
          <div>
            <label className="text-xs text-slate-500 block mb-1">Section (Students)</label>
            <select
              value={section}
              onChange={(e) => setSection(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            >
              <option value="All Sections">All Sections</option>
              {(meta?.sections || []).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Class (Students)</label>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            >
              <option value="All Classes">All Classes</option>
              {(meta?.classes || []).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
        {reports && (
          <p className="text-sm text-slate-500 mt-4">
            Showing: <span className="font-medium text-slate-700">{reports.filters.periodLabel}</span>
            {' '}({reports.filters.from} to {reports.filters.to}) · {reports.students.workingDays} working days
          </p>
        )}
      </div>

      {/* Summary cards */}
      {reports && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SummaryCard
            title="Students"
            icon={<GraduationCap size={20} className="text-blue-600" />}
            total={reports.summary.totalStudents}
            avg={reports.summary.studentAvgAttendance}
            color="bg-blue-50"
          />
          <SummaryCard
            title="Teachers"
            icon={<UserCheck size={20} className="text-indigo-600" />}
            total={reports.summary.totalTeachers}
            avg={reports.summary.teacherAvgAttendance}
            color="bg-indigo-50"
          />
          <SummaryCard
            title="Staff"
            icon={<Briefcase size={20} className="text-orange-600" />}
            total={reports.summary.totalStaff}
            avg={reports.summary.staffAvgAttendance}
            color="bg-orange-50"
          />
        </div>
      )}

      {/* Download section */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet size={18} className="text-green-600" />
            Download Excel Reports
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Export date-wise attendance with summary sheets, category breakdowns, and designation details
          </p>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DownloadCard
            title="Download All Attendance Data"
            description="Single Excel workbook with student, teacher, and staff sheets — overview, date-wise records, and category exports"
            highlight
            loading={downloading === 'all'}
            onClick={() => void handleDownload('all')}
          />
          <DownloadCard
            title="Student Attendance"
            description={`${reports?.summary.totalStudents ?? 0} students — class summary, date-wise marks, present/absent/late/leave sheets`}
            loading={downloading === 'students'}
            onClick={() => void handleDownload('students')}
          />
          <DownloadCard
            title="Teacher Attendance"
            description={`${reports?.summary.totalTeachers ?? 0} teachers — date-wise scores, leave usage, designation & department`}
            loading={downloading === 'teachers'}
            onClick={() => void handleDownload('teachers')}
          />
          <DownloadCard
            title="Staff Attendance"
            description={`${reports?.summary.totalStaff ?? 0} staff — date-wise scores, leave usage, designation & department`}
            loading={downloading === 'staff'}
            onClick={() => void handleDownload('staff')}
          />
        </div>
      </div>

      {/* Preview tables */}
      {reports && (
        <div className="space-y-4">
          <PreviewSection
            title="Student Class Summary"
            headers={['Class', 'Students', 'Avg %', 'Present', 'Absent', 'Late', 'On Leave']}
            rows={reports.students.classSummary.map((c) => [
              c.classGroup,
              c.totalStudents,
              `${c.avgAttendance}%`,
              c.totalPresent,
              c.totalAbsent,
              c.totalLate,
              c.totalOnLeave,
            ])}
          />
          <PreviewSection
            title="Teacher Attendance Preview"
            headers={['Employee Code', 'Name', 'Department', 'Designation', 'Present Days', 'Score %']}
            rows={reports.teachers.rows.slice(0, 10).map((r) => [
              r.teacher.employeeCode,
              r.teacher.teacherName,
              r.teacher.department,
              r.teacher.designation,
              r.totals.daysPresent,
              `${r.totals.attendanceScore}%`,
            ])}
            footer={reports.teachers.rows.length > 10 ? `Showing 10 of ${reports.teachers.rows.length} teachers — download Excel for full data` : undefined}
          />
          <PreviewSection
            title="Staff Attendance Preview"
            headers={['Employee Code', 'Name', 'Department', 'Designation', 'Present Days', 'Score %']}
            rows={reports.staff.rows.slice(0, 10).map((r) => [
              r.staff.employeeCode,
              r.staff.staffName,
              r.staff.department,
              r.staff.designation,
              r.totals.daysPresent,
              `${r.totals.attendanceScore}%`,
            ])}
            footer={reports.staff.rows.length > 10 ? `Showing 10 of ${reports.staff.rows.length} staff — download Excel for full data` : undefined}
          />
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  title,
  icon,
  total,
  avg,
  color,
}: {
  title: string;
  icon: ReactNode;
  total: number;
  avg: number;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="text-2xl font-bold text-slate-900">{total}</p>
        </div>
      </div>
      <p className="text-sm text-green-600 mt-3 font-medium">{avg}% avg attendance</p>
    </div>
  );
}

function DownloadCard({
  title,
  description,
  highlight,
  loading,
  onClick,
}: {
  title: string;
  description: string;
  highlight?: boolean;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={`text-left p-5 rounded-xl border transition-all hover:shadow-md disabled:opacity-60 ${
        highlight
          ? 'border-green-300 bg-green-50 ring-1 ring-green-200'
          : 'border-slate-200 bg-white hover:border-blue-200'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`font-semibold ${highlight ? 'text-green-800' : 'text-slate-900'}`}>{title}</p>
          <p className="text-sm text-slate-500 mt-1">{description}</p>
        </div>
        {loading ? (
          <Loader2 size={20} className="animate-spin text-slate-400 shrink-0" />
        ) : (
          <Download size={20} className={highlight ? 'text-green-600' : 'text-blue-600'} />
        )}
      </div>
    </button>
  );
}

function PreviewSection({
  title,
  headers,
  rows,
  footer,
}: {
  title: string;
  headers: string[];
  rows: (string | number)[][];
  footer?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100">
        <h3 className="font-semibold text-slate-900 text-sm">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              {headers.map((h) => (
                <th key={h} className="text-left px-4 py-2">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={headers.length} className="px-4 py-6 text-center text-slate-400">
                  No data for selected period
                </td>
              </tr>
            ) : rows.map((row, i) => (
              <tr key={i} className="hover:bg-slate-50">
                {row.map((cell, j) => (
                  <td key={j} className="px-4 py-2 text-slate-700">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {footer && (
        <p className="px-5 py-2 text-xs text-slate-400 border-t border-slate-100">{footer}</p>
      )}
    </div>
  );
}
