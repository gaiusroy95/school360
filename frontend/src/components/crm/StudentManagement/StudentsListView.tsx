import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Search, Download, List, Clock, CheckCircle, PlusCircle, MoreVertical, Upload, Eye, FileText,
  ChevronDown, Edit, Briefcase, Calendar as CalendarIcon, Grid, BarChart3, Users, User, Loader2,
  RefreshCw,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { toViewKey } from '../../../lib/navigation';
import {
  fetchStudentAnalytics,
  fetchStudents,
  fetchStudentsMeta,
  fetchStudent,
  importStudents,
  setProfileStudentId,
  syncStudentsFromAdmissions,
  exportStudentsData,
  type Student,
  type StudentAnalytics,
  type StudentFilters,
  type StudentSummary,
} from '../../../lib/studentServices';
import { downloadStudentTemplate, parseStudentWorkbook } from '../../../lib/studentExcel';
import { StudentsListSkeleton } from './StudentsListSkeleton';
import { RosterInsightsPanel, StudentSidebarPanel } from './StudentsDashboardPanels';

type Props = {
  onNavigate?: (view: string) => void;
};

type FilterState = {
  academicYear: string;
  className: string;
  sectionName: string;
  house: string;
  gender: string;
  status: string;
  category: string;
  q: string;
};

const defaultFilters = (year: string): FilterState => ({
  academicYear: year,
  className: '',
  sectionName: '',
  house: '',
  gender: 'All',
  status: 'All',
  category: 'All Categories',
  q: '',
});

function formatNum(n: number) {
  return n.toLocaleString('en-IN');
}

function avatarUrl(student: Student) {
  if (student.photoUrl) return student.photoUrl;
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(student.fullName)}`;
}

export function StudentsListView({ onNavigate }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [filters, setFilters] = useState<FilterState>(defaultFilters('2025-26'));
  const [applied, setApplied] = useState<FilterState>(defaultFilters('2025-26'));
  const [filterMeta, setFilterMeta] = useState<StudentFilters | null>(null);
  const [summary, setSummary] = useState<StudentSummary | null>(null);
  const [analytics, setAnalytics] = useState<StudentAnalytics | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'inactive' | 'passout' | 'transferred'>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [tabCounts, setTabCounts] = useState({ all: 0, active: 0, inactive: 0, passout: 0, transferred: 0 });
  const [viewAllMode, setViewAllMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState('');
  const [showToppers, setShowToppers] = useState(false);
  const [studentAlerts, setStudentAlerts] = useState<{ icon: string; title: string; desc: string; time: string; color: string }[]>([]);
  const [studentActivities, setStudentActivities] = useState<{ title: string; time: string; type: string }[]>([]);

  const nav = useCallback(
    (pageName: string) => onNavigate?.(toViewKey('Student Management', pageName)),
    [onNavigate],
  );

  const statusForTab = useMemo(() => {
    if (activeTab === 'active') return 'Active';
    if (activeTab === 'inactive') return 'Inactive';
    if (activeTab === 'passout') return 'Passout';
    if (activeTab === 'transferred') return 'Transferred';
    return applied.status;
  }, [activeTab, applied.status]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setMessage('');
    try {
      const [metaRes, listRes, analyticsRes] = await Promise.all([
        fetchStudentsMeta(),
        fetchStudents({
          academicYear: applied.academicYear,
          className: applied.className || undefined,
          sectionName: applied.sectionName || undefined,
          house: applied.house || undefined,
          gender: applied.gender,
          status: statusForTab !== 'All' ? statusForTab : applied.status,
          category: applied.category,
          q: applied.q || undefined,
          page: viewAllMode ? 1 : page,
          pageSize: viewAllMode ? 5000 : 50,
          viewAll: viewAllMode,
        }),
        fetchStudentAnalytics(applied.academicYear),
      ]);
      setFilterMeta(metaRes.filters);
      setSummary(metaRes.summary);
      setAnalytics(analyticsRes);
      setStudents(listRes.students);
      setTotal(listRes.pagination.total);
      setTotalPages(listRes.pagination.totalPages);
      setTabCounts(listRes.tabCounts);
      if (listRes.students.length > 0) {
        setSelectedStudent((prev) =>
          prev && listRes.students.some((s) => s.id === prev.id) ? prev : listRes.students[0],
        );
      } else {
        setSelectedStudent(null);
      }
      if (!applied.academicYear && metaRes.filters.defaultAcademicYear) {
        const y = metaRes.filters.defaultAcademicYear;
        setApplied((f) => ({ ...f, academicYear: y }));
        setFilters((f) => ({ ...f, academicYear: y }));
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed to load students');
    } finally {
      setLoading(false);
    }
  }, [applied, page, statusForTab, viewAllMode]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!selectedStudent?.id) {
      setStudentAlerts([]);
      setStudentActivities([]);
      return;
    }
    void fetchStudent(selectedStudent.id).then((res) => {
      setStudentAlerts(res.alerts);
      setStudentActivities(res.activities);
    }).catch(() => {
      setStudentAlerts([]);
      setStudentActivities([]);
    });
  }, [selectedStudent?.id]);

  const sections = useMemo(() => {
    if (!filterMeta) return [];
    if (applied.className && filterMeta.sectionsByClass[applied.className]) {
      return filterMeta.sectionsByClass[applied.className];
    }
    const all = new Set<string>();
    Object.values(filterMeta.sectionsByClass).forEach((arr) => arr.forEach((s) => all.add(s)));
    return [...all].sort();
  }, [filterMeta, applied.className]);

  const kpis = useMemo(() => {
    const s = summary || analytics?.summary;
    if (!s) return [];
    const totalN = s.total;
    const activePct = totalN > 0 ? ((s.active / totalN) * 100).toFixed(1) : '0';
    const malePct = totalN > 0 ? ((s.male / totalN) * 100).toFixed(1) : '0';
    const femalePct = totalN > 0 ? ((s.female / totalN) * 100).toFixed(1) : '0';
    return [
      { title: 'Total Students', value: formatNum(s.total), color: 'bg-indigo-600', icon: <Users size={20} />, onClick: () => setActiveTab('all') },
      { title: 'Active Students', value: formatNum(s.active), subtitle: `${activePct}% of total`, color: 'bg-blue-500', icon: <User size={20} />, onClick: () => setActiveTab('active') },
      { title: 'New Admissions', value: formatNum(s.newAdmissions), badge: '(This Year)', color: 'bg-green-500', icon: <User size={20} />, onClick: () => nav('Add New Student') },
      { title: 'Male Students', value: formatNum(s.male), subtitle: `${malePct}% of total`, color: 'bg-orange-500', icon: <User size={20} />, onClick: () => { setFilters((f) => ({ ...f, gender: 'Male' })); setApplied((f) => ({ ...f, gender: 'Male' })); } },
      { title: 'Female Students', value: formatNum(s.female), subtitle: `${femalePct}% of total`, color: 'bg-pink-500', icon: <User size={20} />, onClick: () => { setFilters((f) => ({ ...f, gender: 'Female' })); setApplied((f) => ({ ...f, gender: 'Female' })); } },
      { title: 'Average Attendance', value: `${s.averageAttendance}%`, trend: '▲ synced', trendText: 'from roster', color: 'bg-yellow-500', icon: <CalendarIcon size={20} />, onClick: () => nav('Student Analytics') },
    ];
  }, [summary, analytics, nav]);

  const handleImport = async (file: File) => {
    setImporting(true);
    setMessage('');
    try {
      const buf = await file.arrayBuffer();
      const rows = parseStudentWorkbook(buf);
      if (rows.length === 0) {
        setMessage('No student rows found in the uploaded file.');
        return;
      }
      const result = await importStudents(rows, { academicYear: applied.academicYear, updateExisting: true });
      setMessage(
        `Import complete: ${result.created} created, ${result.updated} updated` +
          (result.errors.length ? `, ${result.errors.length} error(s).` : '.'),
      );
      await loadData();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleExport = async () => {
    try {
      const { students: rows } = await exportStudentsData({
        academicYear: applied.academicYear,
        className: applied.className || undefined,
        sectionName: applied.sectionName || undefined,
        status: statusForTab !== 'All' ? statusForTab : undefined,
      });
      downloadStudentTemplate(rows);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Export failed');
    }
  };

  const openProfile = (student: Student) => {
    setProfileStudentId(student.id);
    nav('Student Profiles');
  };

  const tabs = [
    { key: 'all' as const, label: `All Students (${formatNum(tabCounts.all)})` },
    { key: 'active' as const, label: `Active (${formatNum(tabCounts.active)})` },
    { key: 'inactive' as const, label: `Inactive (${formatNum(tabCounts.inactive)})` },
    { key: 'passout' as const, label: `Passout (${formatNum(tabCounts.passout)})` },
    { key: 'transferred' as const, label: `Transferred (${formatNum(tabCounts.transferred)})` },
  ];

  const classStats = analytics?.classStats || [];
  const genderStats = analytics?.genderStats || [];
  const topPerformers = analytics?.topPerformers || [];
  const documents = analytics?.documents || [];
  const attendance = analytics?.attendance;

  const isInitialLoad = loading && summary === null;
  const isRefreshing = loading && summary !== null;

  const dashboardBody = isInitialLoad ? (
    <StudentsListSkeleton />
  ) : (
    <>
      <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 ${isRefreshing ? 'opacity-70' : ''}`}>
        {kpis.map((kpi, i) => (
          <button
            key={i}
            type="button"
            onClick={kpi.onClick}
            className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow text-left"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-10 h-10 rounded-full ${kpi.color} text-white flex items-center justify-center shadow-sm shrink-0`}>
                {kpi.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <p className="text-[10px] text-slate-500 font-bold truncate">{kpi.title}</p>
                  {'badge' in kpi && kpi.badge && <span className="text-[8px] text-slate-400">{kpi.badge}</span>}
                </div>
                <p className="text-lg font-bold text-slate-900 truncate">{kpi.value}</p>
              </div>
            </div>
            {'trend' in kpi && kpi.trend && (
              <div className="text-[9px] font-bold text-green-500">
                {kpi.trend} <span className="text-slate-400 font-normal">{kpi.trendText}</span>
              </div>
            )}
            {'subtitle' in kpi && kpi.subtitle && <div className="text-[9px] text-slate-500">{kpi.subtitle}</div>}
          </button>
        ))}
      </div>

      <div className={`relative grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 items-stretch ${isRefreshing ? 'opacity-70' : ''}`}>
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-3">Filter Students</h3>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1">Academic Year</label>
                <select
                  value={filters.academicYear}
                  onChange={(e) => setFilters((f) => ({ ...f, academicYear: e.target.value }))}
                  className="w-full text-xs border border-slate-200 rounded p-1.5"
                >
                  {(filterMeta?.academicYears || [filters.academicYear]).map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1">Class / Grade</label>
                <select
                  value={filters.className}
                  onChange={(e) => setFilters((f) => ({ ...f, className: e.target.value, sectionName: '' }))}
                  className="w-full text-xs border border-slate-200 rounded p-1.5"
                >
                  <option value="">All Classes</option>
                  {(filterMeta?.classes || []).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1">Section</label>
                <select
                  value={filters.sectionName}
                  onChange={(e) => setFilters((f) => ({ ...f, sectionName: e.target.value }))}
                  className="w-full text-xs border border-slate-200 rounded p-1.5"
                >
                  <option value="">All Sections</option>
                  {sections.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1">House</label>
                <select
                  value={filters.house}
                  onChange={(e) => setFilters((f) => ({ ...f, house: e.target.value }))}
                  className="w-full text-xs border border-slate-200 rounded p-1.5"
                >
                  <option value="">All Houses</option>
                  {(filterMeta?.houses || []).map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1">Gender</label>
                <select
                  value={filters.gender}
                  onChange={(e) => setFilters((f) => ({ ...f, gender: e.target.value }))}
                  className="w-full text-xs border border-slate-200 rounded p-1.5"
                >
                  <option>All</option>
                  {(filterMeta?.genders || ['Male', 'Female', 'Other']).map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
                  className="w-full text-xs border border-slate-200 rounded p-1.5"
                >
                  <option>All</option>
                  {(filterMeta?.statuses || []).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1">Category</label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
                  className="w-full text-xs border border-slate-200 rounded p-1.5"
                >
                  <option>All Categories</option>
                  {(filterMeta?.categories || []).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1">Search</label>
                <input
                  type="text"
                  value={filters.q}
                  onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
                  placeholder="Search by name, roll no..."
                  className="w-full text-xs border border-slate-200 rounded p-1.5"
                />
              </div>
              <button
                type="button"
                onClick={() => { setApplied({ ...filters }); setPage(1); setActiveTab('all'); }}
                className="w-full bg-[#0a1930] text-white text-xs font-bold py-2 rounded mt-2 hover:bg-slate-800"
              >
                Apply Filters
              </button>
              <button
                type="button"
                onClick={() => {
                  const y = filterMeta?.defaultAcademicYear || '2025-26';
                  const reset = defaultFilters(y);
                  setFilters(reset);
                  setApplied(reset);
                  setActiveTab('all');
                  setPage(1);
                }}
                className="w-full text-blue-600 text-xs text-center hover:underline mt-1"
              >
                Reset Filters
              </button>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-3">Quick Links</h3>
            <div className="flex flex-col gap-1 text-[11px]">
              {[
                { label: 'Add New Student', icon: <PlusCircle size={14} />, action: () => nav('Add New Student') },
                { label: 'Bulk Import Students', icon: <Upload size={14} />, action: () => nav('Bulk Import') },
                { label: 'Student Categories', icon: <List size={14} />, action: () => nav('Student Categories') },
                { label: 'Generate ID Cards', icon: <User size={14} />, action: () => nav('Student ID Cards') },
                { label: 'Export Student Data', icon: <Download size={14} />, action: () => void handleExport() },
                { label: 'Student Reports', icon: <FileText size={14} />, action: () => nav('Student Reports') },
                { label: 'Student Analytics', icon: <BarChart3 size={14} />, action: () => nav('Student Analytics') },
                { label: 'Sync from Admissions', icon: <Clock size={14} />, action: async () => {
                  const r = await syncStudentsFromAdmissions();
                  setMessage(r.message);
                  void loadData();
                }},
              ].map((link, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={link.action}
                  className="flex items-center gap-2 p-1.5 hover:bg-slate-50 text-slate-600 hover:text-slate-900 rounded text-left"
                >
                  {link.icon} <span>{link.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-3 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">Students List</h3>
              <div className="flex items-center gap-2 text-slate-400">
                <button type="button" onClick={() => setViewAllMode(false)} className={`p-1 rounded ${!viewAllMode ? 'bg-slate-100 text-slate-800' : 'hover:bg-slate-100'}`}><List size={14}/></button>
                <button type="button" onClick={() => setViewAllMode(true)} className={`p-1 rounded ${viewAllMode ? 'bg-slate-100 text-slate-800' : 'hover:bg-slate-100'}`} title="View all data for validation"><Grid size={14}/></button>
                <button type="button" onClick={() => void handleExport()} className="p-1 hover:bg-slate-100 rounded text-slate-600"><Download size={14}/></button>
              </div>
            </div>
            <div className="flex border-b border-slate-200 px-3 overflow-x-auto text-[11px] font-medium text-slate-500">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => { setActiveTab(tab.key); setPage(1); }}
                  className={`px-3 py-2 whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.key ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent hover:text-slate-700'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {students.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                No students found. Confirm admissions in Admission CRM or add students manually.
              </div>
            ) : (
              <div className="overflow-x-auto min-h-[140px]">
                <table className="w-full text-left border-collapse min-w-[800px] text-[10px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                      <th className="p-3 w-8"><input type="checkbox" className="rounded border-slate-300" readOnly /></th>
                      <th className="p-3">Photo</th>
                      <th className="p-3">Admission No.</th>
                      <th className="p-3">Name</th>
                      <th className="p-3">Class - Section</th>
                      <th className="p-3">Roll No.</th>
                      <th className="p-3">Date of Birth</th>
                      <th className="p-3">Mobile</th>
                      <th className="p-3">Status</th>
                      {viewAllMode && (
                        <>
                          <th className="p-3">Gender</th>
                          <th className="p-3">Category</th>
                          <th className="p-3">Email</th>
                          <th className="p-3">Address</th>
                        </>
                      )}
                      <th className="p-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {students.map((student) => (
                      <tr
                        key={student.id}
                        className={`hover:bg-slate-50 cursor-pointer ${selectedStudent?.id === student.id ? 'bg-blue-50/50' : ''}`}
                        onClick={() => setSelectedStudent(student)}
                      >
                        <td className="p-3" onClick={(e) => e.stopPropagation()}><input type="checkbox" className="rounded border-slate-300" /></td>
                        <td className="p-3">
                          <div className="w-6 h-6 bg-slate-200 rounded-full overflow-hidden">
                            <img src={avatarUrl(student)} alt={student.fullName} />
                          </div>
                        </td>
                        <td className="p-3 text-slate-600">{student.admissionNumber}</td>
                        <td className="p-3 font-semibold text-slate-800">{student.fullName}</td>
                        <td className="p-3 text-slate-600">{student.classSection}</td>
                        <td className="p-3 text-slate-600">{student.rollNumber || '—'}</td>
                        <td className="p-3 text-slate-600">{student.dob || '—'}</td>
                        <td className="p-3 text-slate-600">{student.mobile || '—'}</td>
                        <td className="p-3">
                          <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold border ${student.status === 'Active' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                            {student.status}
                          </span>
                        </td>
                        {viewAllMode && (
                          <>
                            <td className="p-3">{student.gender}</td>
                            <td className="p-3">{student.category}</td>
                            <td className="p-3">{student.email}</td>
                            <td className="p-3 max-w-[120px] truncate">{student.address}</td>
                          </>
                        )}
                        <td className="p-3 text-slate-400 flex justify-center gap-1.5">
                          <Eye size={14} className="hover:text-blue-500 cursor-pointer" onClick={(e) => { e.stopPropagation(); openProfile(student); }} />
                        </td>
                      </tr>
                    ))}
                    {students.length < 5 &&
                      Array.from({ length: 5 - students.length }).map((_, i) => (
                        <tr key={`pad-${i}`} className="h-10 border-b border-slate-50/80">
                          <td colSpan={viewAllMode ? 14 : 10} className="p-0" />
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
            {!viewAllMode && total > 0 && (
              <div className="p-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
                <span>Showing {(page - 1) * 50 + 1} to {Math.min(page * 50, total)} of {formatNum(total)} entries</span>
                <div className="flex gap-1">
                  <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-2 py-1 border rounded disabled:opacity-40">&lt;</button>
                  <span className="px-2 py-1 bg-[#0a1930] text-white rounded">{page}</span>
                  <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="px-2 py-1 border rounded disabled:opacity-40">&gt;</button>
                </div>
              </div>
            )}
            {viewAllMode && (
              <div className="p-2 border-t border-slate-200 text-[10px] text-slate-500 text-center">
                View All mode — showing {students.length} rows for data validation
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-h-[148px]">
            <ChartCard title="Student Statistics" total={summary?.total || 0} data={classStats} />
            <ChartCard title="Gender Distribution" total={summary?.total || 0} data={genderStats} />
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col">
              <h3 className="text-[11px] font-bold text-slate-800 mb-2">Attendance Overview</h3>
              <div className="flex flex-col items-center justify-center flex-1">
                <span className="text-lg font-bold text-slate-800">{attendance?.average ?? 0}%</span>
                <span className="text-[8px] text-slate-500">Average Attendance</span>
                <div className="flex gap-4 mt-3 text-[10px]">
                  <div className="text-center"><span className="text-green-500 block">Present</span><span className="font-bold">{attendance?.present ?? 0}</span></div>
                  <div className="text-center"><span className="text-red-500 block">Absent</span><span className="font-bold">{attendance?.absent ?? 0}</span></div>
                  <div className="text-center"><span className="text-amber-500 block">On Leave</span><span className="font-bold">{attendance?.onLeave ?? 0}</span></div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm min-h-[180px]">
              <h3 className="text-[11px] font-bold text-slate-800 mb-4">Document Summary</h3>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {documents.map((doc, i) => (
                  <div key={i} className="flex flex-col items-center text-center">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-1"><FileText size={16} /></div>
                    <span className="text-[8px] text-slate-600 leading-tight h-6 flex items-center">{doc.name}</span>
                    <span className="text-[8px] font-bold text-slate-800">{doc.uploaded} / {doc.total}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm min-h-[180px] flex flex-col">
              <h3 className="text-[11px] font-bold text-slate-800 mb-3">Top Performing Students</h3>
              <table className="w-full text-left text-[9px]">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-100">
                    <th className="pb-1 w-8 text-center">Rank</th>
                    <th className="pb-1">Student Name</th>
                    <th className="pb-1">Class</th>
                    <th className="pb-1 text-right">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {topPerformers.slice(0, 3).map((p) => (
                    <tr key={p.rank}>
                      <td className="py-1.5 text-center"><span className="w-4 h-4 mx-auto rounded-full bg-amber-400 text-[8px] flex items-center justify-center font-bold text-white">{p.rank}</span></td>
                      <td className="py-1.5 font-semibold">{p.name}</td>
                      <td className="py-1.5 text-slate-600">{p.class}</td>
                      <td className="py-1.5 text-right font-bold text-green-600">{p.percentage}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button type="button" onClick={() => setShowToppers(true)} className="w-full text-center mt-2 text-[9px] text-blue-600 font-medium hover:underline">
                View Full Topper List
              </button>
            </div>
          </div>

          <RosterInsightsPanel
            summary={summary}
            analytics={analytics}
            students={students}
            onNavigate={nav}
            onSync={async () => {
              const r = await syncStudentsFromAdmissions();
              setMessage(r.message);
              void loadData();
            }}
          />
        </div>

        <div className="lg:col-span-3 flex flex-col min-h-0">
          {selectedStudent ? (
            <StudentSidebarPanel
              student={selectedStudent}
              alerts={studentAlerts}
              activities={studentActivities}
              onViewProfile={() => openProfile(selectedStudent)}
            />
          ) : (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center flex-1 min-h-[320px]">
              <Users size={32} className="text-slate-300 mb-3" />
              <p className="text-sm font-medium text-slate-600">Select a student</p>
              <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
                Click a row in the list to view profile, alerts, and recent activity here.
              </p>
            </div>
          )}
        </div>
      </div>

      {isRefreshing && (
        <div className="fixed bottom-20 right-6 z-40 flex items-center gap-2 bg-slate-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg">
          <Loader2 size={14} className="animate-spin" />
          Updating…
        </div>
      )}
    </>
  );

  return (
    <div className="flex flex-col space-y-4 h-full">
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleImport(f);
          e.target.value = '';
        }}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Student Management CRM</h2>
          <p className="text-xs text-slate-500 mt-0.5">Live student roster synced with confirmed admissions</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={importing || isInitialLoad}
            className="bg-white border border-slate-200 text-slate-700 font-medium text-xs px-3 py-2 rounded flex items-center gap-2 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            {importing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            <span>Import Students</span>
          </button>
          <button
            type="button"
            onClick={() => void handleExport()}
            disabled={isInitialLoad}
            className="bg-white border border-slate-200 text-slate-700 font-medium text-xs px-3 py-2 rounded flex items-center gap-2 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            <Download size={14} />
            <span>Export</span>
          </button>
          <button
            type="button"
            onClick={() => void loadData()}
            disabled={loading}
            className="bg-white border border-slate-300 text-slate-700 font-medium text-xs px-3 py-2 rounded-lg flex items-center gap-2 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={() => nav('Bulk Import')}
            className="bg-white border border-slate-200 text-slate-700 font-medium text-xs px-3 py-2 rounded flex items-center gap-2 shadow-sm hover:bg-slate-50"
          >
            <span>Bulk Actions</span>
            <ChevronDown size={14} />
          </button>
          <button
            type="button"
            onClick={() => nav('Add New Student')}
            className="bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold text-xs px-4 py-2 rounded flex items-center gap-2 shadow-sm"
          >
            <PlusCircle size={14} />
            <span>Add New Student</span>
          </button>
        </div>
      </div>

      {message && (
        <div className="text-xs px-3 py-2 rounded-lg border border-blue-200 bg-blue-50 text-blue-800">{message}</div>
      )}

      {dashboardBody}

      {showToppers && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4" onClick={() => setShowToppers(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-auto p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">Full Topper List (Entrance Score)</h3>
            <table className="w-full text-sm">
              <thead><tr className="text-slate-500 border-b"><th className="py-2">Rank</th><th>Name</th><th>Class</th><th className="text-right">Score</th></tr></thead>
              <tbody>
                {topPerformers.map((p) => (
                  <tr key={p.rank} className="border-b border-slate-50">
                    <td className="py-2">{p.rank}</td>
                    <td className="font-medium">{p.name}</td>
                    <td>{p.class}</td>
                    <td className="text-right text-green-600 font-bold">{p.percentage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-slate-500 mt-4">Subject-wise toppers will sync when Examination Management marks are connected.</p>
            <button type="button" onClick={() => setShowToppers(false)} className="mt-4 px-4 py-2 bg-slate-800 text-white rounded text-sm">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ChartCard({ title, total, data }: { title: string; total: number; data: { name: string; value: number; percent: string; color: string }[] }) {
  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col">
      <h3 className="text-[11px] font-bold text-slate-800 mb-2">{title}</h3>
      <div className="flex items-center flex-1">
        <div className="w-20 h-20 relative shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data.length ? data : [{ name: 'None', value: 1, color: '#e2e8f0' }]} cx="50%" cy="50%" innerRadius={22} outerRadius={35} paddingAngle={2} dataKey="value" stroke="none">
                {(data.length ? data : [{ color: '#e2e8f0' }]).map((entry, index) => (
                  <Cell key={index} fill={entry.color || '#e2e8f0'} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[8px] text-slate-500">Total</span>
            <span className="text-[10px] font-bold">{formatNum(total)}</span>
          </div>
        </div>
        <div className="flex-1 ml-3 flex flex-col gap-1 max-h-24 overflow-y-auto">
          {data.map((item, i) => (
            <div key={i} className="flex items-center text-[9px]">
              <div className="w-1.5 h-1.5 rounded-full mr-1.5" style={{ backgroundColor: item.color }} />
              <span className="text-slate-600 flex-1 truncate">{item.name}</span>
              <span className="font-medium mr-1">{item.value}</span>
              <span className="text-slate-400">({item.percent})</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
