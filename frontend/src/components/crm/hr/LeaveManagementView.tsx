import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Ban,
  Calendar,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Download,
  Eye,
  FileText,
  Loader2,
  Plus,
  RefreshCcw,
  Settings,
  UserCheck,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import {
  advanceHrLeaveWorkflow,
  createHrLeaveApplication,
  fetchDepartmentEmployeeOptions,
  fetchHrLeaveBalances,
  fetchHrLeaveDashboard,
  fetchHrLeavePolicies,
  fetchHrLeavePolicy,
  fetchHrLeaveSettings,
  type EmployeeOption,
  type HrLeaveDashboard,
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

const ACADEMIC_YEARS = ['2025-26', '2024-25', '2023-24'];
const CAMPUSES = ['Main Campus', 'North Campus', 'South Campus', 'Junior Wing'];
const LEAVE_TABS = [
  'Leave Requests',
  'My Team Leaves',
  'Leave Calendar View',
  'Leave Approval',
  'Leave History',
] as const;
type LeaveTab = (typeof LEAVE_TABS)[number];

const LEAVE_TYPES = [
  { code: 'CL', label: 'Casual Leave' },
  { code: 'EL', label: 'Earned Leave' },
  { code: 'SL', label: 'Sick Leave' },
  { code: 'ML', label: 'Maternity Leave' },
  { code: 'PL', label: 'Paternity Leave' },
  { code: 'CO', label: 'Compensatory Off' },
  { code: 'AL', label: 'Academic Leave' },
  { code: 'LWP', label: 'Leave Without Pay' },
  { code: 'HD', label: 'Half Day Leave' },
];

const SESSIONS = [
  { value: 'FULL', label: 'Full Day' },
  { value: 'FIRST_HALF', label: 'First Half' },
  { value: 'SECOND_HALF', label: 'Second Half' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'RETURNED', label: 'Returned' },
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const LEGEND_COLORS: Record<string, string> = {
  green: 'bg-green-500',
  orange: 'bg-orange-500',
  pink: 'bg-pink-500',
  purple: 'bg-purple-500',
  blue: 'bg-blue-500',
};

const EVENT_DOT_COLORS: Record<string, string> = {
  'Gazetted Holiday': 'bg-green-500',
  'Restricted Holiday': 'bg-orange-500',
  'School Holiday': 'bg-pink-500',
  Weekend: 'bg-purple-500',
  'Employee Leave': 'bg-blue-500',
};

type LeaveRequest = {
  id: string;
  recordId: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  department: string;
  designation: string;
  leaveType: string;
  leaveTypeLabel: string;
  fromDate: string;
  toDate: string;
  dateRange: string;
  totalDays: number;
  session: string;
  reason: string;
  status: string;
  statusLabel: string;
  remarks: string;
  reviewerRemarks: string;
};

type PolicyRow = Record<string, unknown>;
type PolicyDetail = Record<string, unknown>;

const PAGE_SIZE = 8;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const csv = [headers, ...rows]
    .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function KpiCard({
  title,
  value,
  icon,
  iconBg,
  valueClass = 'text-slate-900',
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  iconBg: string;
  valueClass?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 flex items-start gap-2.5 min-w-0">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wide leading-tight">{title}</p>
        <p className={`text-lg font-bold mt-0.5 tabular-nums ${valueClass}`}>{value}</p>
      </div>
    </div>
  );
}

function UtilizationBar({ pct }: { pct: number }) {
  const color = pct >= 80 ? 'bg-red-500' : pct >= 50 ? 'bg-amber-500' : 'bg-green-500';
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <span className="text-[10px] font-bold tabular-nums text-slate-600 w-8 text-right">{pct}%</span>
    </div>
  );
}

export function LeaveManagementView() {
  const now = new Date();
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [campus, setCampus] = useState('Main Campus');
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth() + 1);

  const [data, setData] = useState<HrLeaveDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [activeTab, setActiveTab] = useState<LeaveTab>('Leave Requests');
  const [filterDept, setFilterDept] = useState('');
  const [filterDesignation, setFilterDesignation] = useState('');
  const [filterLeaveType, setFilterLeaveType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [page, setPage] = useState(1);

  const [balanceDeptFilter, setBalanceDeptFilter] = useState('');

  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [leaveSettings, setLeaveSettings] = useState<Record<string, unknown> | null>(null);

  // Modals
  const [applyOpen, setApplyOpen] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [holidayModalOpen, setHolidayModalOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [workflowOpen, setWorkflowOpen] = useState(false);
  const [workflowAction, setWorkflowAction] = useState<'approve' | 'reject'>('approve');

  const [applyForm, setApplyForm] = useState({
    employeeId: '',
    leaveType: 'CL',
    fromDate: todayIso(),
    toDate: todayIso(),
    session: 'FULL',
    reason: '',
  });
  const [applySaving, setApplySaving] = useState(false);

  const [policies, setPolicies] = useState<PolicyRow[]>([]);
  const [leaveTypeDefs, setLeaveTypeDefs] = useState<Array<Record<string, unknown>>>([]);
  const [policyDetail, setPolicyDetail] = useState<PolicyDetail | null>(null);
  const [policyLoading, setPolicyLoading] = useState(false);
  const [selectedPolicyId, setSelectedPolicyId] = useState<string | null>(null);

  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [workflowRemarks, setWorkflowRemarks] = useState('');
  const [workflowSaving, setWorkflowSaving] = useState(false);

  const loadDashboard = useCallback(
    async (seed = false) => {
      setLoading(true);
      setError('');
      try {
        const res = await fetchHrLeaveDashboard({
          academicYear,
          campus,
          year: calYear,
          month: calMonth,
          seed,
        });
        setData(res);
        if (seed) setMessage('Leave management demo data loaded');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load leave dashboard');
      } finally {
        setLoading(false);
      }
    },
    [academicYear, campus, calYear, calMonth],
  );

  const initialLoad = useRef(true);

  useEffect(() => {
    const seed = initialLoad.current;
    initialLoad.current = false;
    void loadDashboard(seed);
  }, [academicYear, campus, calYear, calMonth, loadDashboard]);

  useEffect(() => {
    void fetchDepartmentEmployeeOptions()
      .then((r) => setEmployees(r.records))
      .catch(() => {});
    void fetchHrLeaveSettings()
      .then((r) => setLeaveSettings(r.settings))
      .catch(() => {});
    void fetchHrLeaveBalances(academicYear)
      .then(() => {})
      .catch(() => {});
  }, [academicYear]);

  const leaveRequests = useMemo(() => {
    const raw = (data?.leaveRequests ?? []) as LeaveRequest[];
    let rows = raw;

    if (activeTab === 'Leave Approval') rows = rows.filter((r) => r.status === 'PENDING');
    else if (activeTab === 'Leave History') rows = rows.filter((r) => ['APPROVED', 'REJECTED', 'CANCELLED'].includes(r.status));
    else if (activeTab === 'My Team Leaves') rows = rows.filter((r) => r.department === 'Academics' || r.department === 'Administration');

    if (filterDept) rows = rows.filter((r) => r.department === filterDept);
    if (filterDesignation) rows = rows.filter((r) => r.designation === filterDesignation);
    if (filterLeaveType) rows = rows.filter((r) => r.leaveType === filterLeaveType);
    if (filterStatus) rows = rows.filter((r) => r.status === filterStatus);
    if (filterFrom) rows = rows.filter((r) => r.fromDate >= filterFrom);
    if (filterTo) rows = rows.filter((r) => r.toDate <= filterTo);

    return rows;
  }, [data, activeTab, filterDept, filterDesignation, filterLeaveType, filterStatus, filterFrom, filterTo]);

  const departments = useMemo(() => {
    const set = new Set<string>();
    for (const r of (data?.leaveRequests ?? []) as LeaveRequest[]) {
      if (r.department) set.add(r.department);
    }
    for (const b of data?.balanceSummary ?? []) {
      if (b.department) set.add(b.department);
    }
    return [...set].sort();
  }, [data]);

  const designations = useMemo(() => {
    const set = new Set<string>();
    for (const r of (data?.leaveRequests ?? []) as LeaveRequest[]) {
      if (r.designation) set.add(r.designation);
    }
    return [...set].sort();
  }, [data]);

  const totalPages = Math.max(1, Math.ceil(leaveRequests.length / PAGE_SIZE));
  const pagedRequests = leaveRequests.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const filteredBalances = useMemo(() => {
    const rows = data?.balanceSummary ?? [];
    if (!balanceDeptFilter) return rows;
    return rows.filter((r) => r.department === balanceDeptFilter);
  }, [data, balanceDeptFilter]);

  const calendarDays = data?.holidayCalendar?.days ?? [];
  const firstDow = new Date(Date.UTC(calYear, calMonth - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(calYear, calMonth, 0)).getUTCDate();
  const calPadding = Array.from({ length: firstDow }, (_, i) => i);
  const calCells = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const openPolicies = async () => {
    setPolicyOpen(true);
    setPolicyLoading(true);
    setSelectedPolicyId(null);
    setPolicyDetail(null);
    try {
      const res = await fetchHrLeavePolicies();
      setPolicies(res.records);
      setLeaveTypeDefs(res.leaveTypeDefs);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load policies');
    } finally {
      setPolicyLoading(false);
    }
  };

  const loadPolicyDetail = async (id: string) => {
    setSelectedPolicyId(id);
    setPolicyLoading(true);
    try {
      const res = await fetchHrLeavePolicy(id);
      setPolicyDetail(res.record);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load policy');
    } finally {
      setPolicyLoading(false);
    }
  };

  const handleApplyLeave = async (asDraft: boolean) => {
    if (!applyForm.employeeId) {
      setError('Please select an employee');
      return;
    }
    setApplySaving(true);
    setError('');
    try {
      await createHrLeaveApplication({
        ...applyForm,
        academicYear,
        status: asDraft ? 'DRAFT' : 'PENDING',
      });
      setMessage(asDraft ? 'Leave saved as draft' : 'Leave application submitted');
      setApplyOpen(false);
      setApplyForm({ employeeId: '', leaveType: 'CL', fromDate: todayIso(), toDate: todayIso(), session: 'FULL', reason: '' });
      void loadDashboard(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit leave');
    } finally {
      setApplySaving(false);
    }
  };

  const openWorkflow = (row: LeaveRequest, action: 'approve' | 'reject') => {
    setSelectedLeave(row);
    setWorkflowAction(action);
    setWorkflowRemarks('');
    setWorkflowOpen(true);
  };

  const handleWorkflow = async () => {
    if (!selectedLeave) return;
    setWorkflowSaving(true);
    setError('');
    try {
      await advanceHrLeaveWorkflow(selectedLeave.id, workflowAction, workflowRemarks);
      setMessage(`Leave ${workflowAction === 'approve' ? 'approved' : 'rejected'} successfully`);
      setWorkflowOpen(false);
      setSelectedLeave(null);
      void loadDashboard(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Workflow action failed');
    } finally {
      setWorkflowSaving(false);
    }
  };

  const prevMonth = () => {
    if (calMonth === 1) {
      setCalMonth(12);
      setCalYear((y) => y - 1);
    } else setCalMonth((m) => m - 1);
    setPage(1);
  };

  const nextMonth = () => {
    if (calMonth === 12) {
      setCalMonth(1);
      setCalYear((y) => y + 1);
    } else setCalMonth((m) => m + 1);
    setPage(1);
  };

  const exportLeaveRequests = () => {
    downloadCsv(
      'leave-requests.csv',
      ['Leave ID', 'Employee', 'Department', 'Leave Type', 'Date Range', 'Days', 'Reason', 'Status'],
      leaveRequests.map((r) => [
        r.recordId,
        r.employeeName,
        r.department,
        r.leaveTypeLabel,
        r.dateRange,
        String(r.totalDays),
        r.reason,
        r.statusLabel,
      ]),
    );
  };

  const exportBalances = () => {
    downloadCsv(
      'leave-balances.csv',
      ['Employee', 'Department', 'CL', 'EL', 'SL', 'Comp Off', 'LWP'],
      filteredBalances.map((r) => [
        r.employeeName,
        r.department,
        String(r.cl),
        String(r.el),
        String(r.sl),
        String(r.compOff),
        String(r.lwp),
      ]),
    );
  };

  const exportDeptOverview = () => {
    downloadCsv(
      'department-leave-overview.csv',
      ['Department', 'Total Employees', 'On Leave', 'Available', 'Utilization %'],
      (data?.departmentOverview ?? []).map((r) => [
        r.department,
        String(r.totalEmployees),
        String(r.onLeave),
        String(r.available),
        String(r.utilization),
      ]),
    );
  };

  const exportHolidays = () => {
    downloadCsv(
      `holidays-${academicYear}.csv`,
      ['Date', 'Day', 'Holiday Name', 'Type', 'Applicable To', 'Status'],
      (data?.holidayList ?? []).map((h) => [h.date, h.day, h.name, h.type, h.applicableTo, h.status]),
    );
  };

  const summary = data?.summary;

  if (loading && !data) {
    return (
      <AcademicPageShell>
        <AcademicLoading label="Loading leave management…" />
      </AcademicPageShell>
    );
  }

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="HR & Payroll Management › Leave Management"
        title="Leave Management & Holiday Mapping"
        subtitle="Manage employee leave applications, balances, holiday calendar, and leave policies across campuses."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <select
              className={`${am.select} text-xs py-1.5`}
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
            >
              {ACADEMIC_YEARS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <select
              className={`${am.select} text-xs py-1.5`}
              value={campus}
              onChange={(e) => setCampus(e.target.value)}
            >
              {CAMPUSES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <button type="button" onClick={() => void openPolicies()} className={am.btnSecondary}>
              <Settings size={14} /> Leave Policy Setup
            </button>
            <button type="button" onClick={() => setHolidayModalOpen(true)} className={am.btnSecondary}>
              <CalendarDays size={14} /> Holiday Calendar
            </button>
            <button type="button" onClick={() => setApplyOpen(true)} className={am.btnPrimary}>
              <Plus size={14} /> Apply Leave
            </button>
            <button type="button" onClick={() => void loadDashboard(false)} className={am.btnSecondary} title="Refresh">
              <RefreshCcw size={14} />
            </button>
          </div>
        }
      />

      <div className={am.content}>
        {error && (
          <div className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center justify-between gap-2">
            <span>{error}</span>
            <button type="button" onClick={() => setError('')} className="text-red-500 hover:text-red-700"><X size={14} /></button>
          </div>
        )}
        {message && (
          <div className="text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 flex items-center justify-between gap-2">
            <span>{message}</span>
            <button type="button" onClick={() => setMessage('')} className="text-green-500 hover:text-green-700"><X size={14} /></button>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard title="Total Employees" value={summary?.totalEmployees ?? 0} icon={<Users size={18} className="text-blue-600" />} iconBg="bg-blue-50" />
          <KpiCard title="On Leave Today" value={summary?.onLeaveToday ?? 0} icon={<Calendar size={18} className="text-orange-600" />} iconBg="bg-orange-50" valueClass="text-orange-600" />
          <KpiCard title="Leave Requests (Pending)" value={summary?.pendingRequests ?? 0} icon={<ClipboardList size={18} className="text-amber-600" />} iconBg="bg-amber-50" valueClass="text-amber-600" />
          <KpiCard title="Approved Leaves (This Month)" value={summary?.approvedThisMonth ?? 0} icon={<CheckCircle2 size={18} className="text-green-600" />} iconBg="bg-green-50" valueClass="text-green-600" />
          <KpiCard title="Rejected Leaves (This Month)" value={summary?.rejectedThisMonth ?? 0} icon={<XCircle size={18} className="text-red-600" />} iconBg="bg-red-50" valueClass="text-red-600" />
          <KpiCard title="LWP (This Month)" value={summary?.lwpThisMonth ?? 0} icon={<Ban size={18} className="text-slate-600" />} iconBg="bg-slate-100" />
        </div>

        {/* Middle Section */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          {/* Left - Leave Requests Table */}
          <div className="xl:col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <FeeTabs tabs={[...LEAVE_TABS]} active={activeTab} onChange={(t) => { setActiveTab(t as LeaveTab); setPage(1); }} />

            <div className="flex flex-wrap gap-2 mt-3 mb-3">
              <select className={`${am.select} text-xs flex-1 min-w-[120px]`} value={filterDept} onChange={(e) => { setFilterDept(e.target.value); setPage(1); }}>
                <option value="">All Departments</option>
                {departments.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <select className={`${am.select} text-xs flex-1 min-w-[120px]`} value={filterDesignation} onChange={(e) => { setFilterDesignation(e.target.value); setPage(1); }}>
                <option value="">All Designations</option>
                {designations.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <select className={`${am.select} text-xs flex-1 min-w-[100px]`} value={filterLeaveType} onChange={(e) => { setFilterLeaveType(e.target.value); setPage(1); }}>
                <option value="">All Leave Types</option>
                {LEAVE_TYPES.map((t) => <option key={t.code} value={t.code}>{t.label}</option>)}
              </select>
              <select className={`${am.select} text-xs flex-1 min-w-[100px]`} value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}>
                {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <input type="date" className={`${am.input} text-xs py-1.5 flex-1 min-w-[120px]`} value={filterFrom} onChange={(e) => { setFilterFrom(e.target.value); setPage(1); }} />
              <input type="date" className={`${am.input} text-xs py-1.5 flex-1 min-w-[120px]`} value={filterTo} onChange={(e) => { setFilterTo(e.target.value); setPage(1); }} />
              <button type="button" onClick={exportLeaveRequests} className={`${am.btnSecondary} text-xs`}>
                <Download size={12} /> Export
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500">
                    <th className="px-2 py-2 text-left font-semibold">Leave ID</th>
                    <th className="px-2 py-2 text-left font-semibold">Employee Name</th>
                    <th className="px-2 py-2 text-left font-semibold">Department</th>
                    <th className="px-2 py-2 text-left font-semibold">Leave Type</th>
                    <th className="px-2 py-2 text-left font-semibold">Date Range</th>
                    <th className="px-2 py-2 text-right font-semibold">Total Days</th>
                    <th className="px-2 py-2 text-left font-semibold">Reason</th>
                    <th className="px-2 py-2 text-left font-semibold">Status</th>
                    <th className="px-2 py-2 text-center font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRequests.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-2 py-8 text-center text-slate-400">No leave requests found</td>
                    </tr>
                  ) : (
                    pagedRequests.map((row) => (
                      <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                        <td className="px-2 py-2 font-mono text-[10px] text-slate-600">{row.recordId}</td>
                        <td className="px-2 py-2">
                          <div className="font-semibold text-slate-800">{row.employeeName}</div>
                          <div className="text-[10px] text-slate-400">{row.employeeCode}</div>
                        </td>
                        <td className="px-2 py-2 text-slate-600">{row.department}</td>
                        <td className="px-2 py-2">
                          <span className="font-medium text-slate-700">{row.leaveType}</span>
                          <div className="text-[10px] text-slate-400">{row.leaveTypeLabel}</div>
                        </td>
                        <td className="px-2 py-2 text-slate-600 whitespace-nowrap">{row.dateRange}</td>
                        <td className="px-2 py-2 text-right tabular-nums font-semibold">{row.totalDays}</td>
                        <td className="px-2 py-2 text-slate-600 max-w-[140px] truncate" title={row.reason}>{row.reason}</td>
                        <td className="px-2 py-2"><StatusBadge status={row.status} /></td>
                        <td className="px-2 py-2">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              title="View"
                              onClick={() => { setSelectedLeave(row); setViewOpen(true); }}
                              className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-blue-600"
                            >
                              <Eye size={14} />
                            </button>
                            {row.status === 'PENDING' && (
                              <>
                                <button
                                  type="button"
                                  title="Approve"
                                  onClick={() => openWorkflow(row, 'approve')}
                                  className="p-1 rounded hover:bg-green-50 text-slate-500 hover:text-green-600"
                                >
                                  <Check size={14} />
                                </button>
                                <button
                                  type="button"
                                  title="Reject"
                                  onClick={() => openWorkflow(row, 'reject')}
                                  className="p-1 rounded hover:bg-red-50 text-slate-500 hover:text-red-600"
                                >
                                  <X size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
              <p className="text-[10px] text-slate-500">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, leaveRequests.length)} of {leaveRequests.length}
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className={`${am.btnSecondary} text-xs py-1 px-2 disabled:opacity-40`}
                >
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const pg = i + 1;
                  return (
                    <button
                      key={pg}
                      type="button"
                      onClick={() => setPage(pg)}
                      className={`px-2.5 py-1 rounded text-xs font-semibold ${
                        page === pg ? 'bg-amber-400 text-slate-900' : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {pg}
                    </button>
                  );
                })}
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className={`${am.btnSecondary} text-xs py-1 px-2 disabled:opacity-40`}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Right - Holiday Calendar Widget */}
          <div className="xl:col-span-4 bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-800">Holiday Calendar</h3>
              <div className="flex items-center gap-1">
                <button type="button" onClick={prevMonth} className="p-1 rounded hover:bg-slate-100 text-slate-500">
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs font-bold text-slate-700 min-w-[120px] text-center">
                  {MONTH_NAMES[calMonth - 1]} {calYear}
                </span>
                <button type="button" onClick={nextMonth} className="p-1 rounded hover:bg-slate-100 text-slate-500">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-0.5 mb-1">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} className="text-[9px] font-bold text-slate-400 text-center py-1">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-0.5">
              {calPadding.map((i) => (
                <div key={`pad-${i}`} className="aspect-square" />
              ))}
              {calCells.map((day) => {
                const dayData = calendarDays.find((d) => d.day === day);
                const events = dayData?.events ?? [];
                const isToday =
                  day === now.getDate() && calMonth === now.getMonth() + 1 && calYear === now.getFullYear();
                return (
                  <div
                    key={day}
                    className={`aspect-square rounded-lg border text-center flex flex-col items-center justify-start pt-1 ${
                      isToday ? 'border-amber-400 bg-amber-50' : 'border-slate-100 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`text-[10px] font-semibold ${isToday ? 'text-amber-700' : 'text-slate-700'}`}>{day}</span>
                    <div className="flex flex-wrap gap-0.5 justify-center mt-0.5 px-0.5">
                      {events.slice(0, 3).map((ev, idx) => (
                        <span
                          key={idx}
                          className={`w-1.5 h-1.5 rounded-full ${EVENT_DOT_COLORS[ev.type] ?? 'bg-slate-400'}`}
                          title={ev.label}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
              {(data?.legend ?? []).map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${LEGEND_COLORS[item.color] ?? 'bg-slate-400'}`} />
                  <span className="text-[10px] text-slate-600">{item.label}</span>
                </div>
              ))}
            </div>

            <button type="button" onClick={() => setHolidayModalOpen(true)} className={`${am.btnPrimary} w-full mt-3 text-xs`}>
              <Plus size={14} /> Add Holiday
            </button>
          </div>
        </div>

        {/* Bottom 3 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Leave Balance Summary */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="text-sm font-bold text-slate-800">Leave Balance Summary</h3>
              <button type="button" onClick={exportBalances} className={`${am.btnSecondary} text-xs py-1`}>
                <Download size={12} /> Export
              </button>
            </div>
            <select
              className={`${am.select} text-xs w-full mb-2`}
              value={balanceDeptFilter}
              onChange={(e) => setBalanceDeptFilter(e.target.value)}
            >
              <option value="">All Departments</option>
              {departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <div className="overflow-x-auto max-h-[280px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-white">
                  <tr className="bg-slate-50 text-slate-500">
                    <th className="px-2 py-2 text-left font-semibold">Employee</th>
                    <th className="px-2 py-2 text-right font-semibold">CL</th>
                    <th className="px-2 py-2 text-right font-semibold">EL</th>
                    <th className="px-2 py-2 text-right font-semibold">SL</th>
                    <th className="px-2 py-2 text-right font-semibold">Comp Off</th>
                    <th className="px-2 py-2 text-right font-semibold">LWP</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBalances.map((row) => (
                    <tr key={row.employeeId} className="border-t border-slate-100">
                      <td className="px-2 py-1.5">
                        <div className="font-medium text-slate-700 truncate max-w-[100px]" title={row.employeeName}>{row.employeeName}</div>
                        <div className="text-[9px] text-slate-400">{row.department}</div>
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{row.cl}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{row.el}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{row.sl}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{row.compOff}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-red-600">{row.lwp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Departmentwise Leave Overview */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="text-sm font-bold text-slate-800">Departmentwise Leave Overview</h3>
              <button type="button" onClick={exportDeptOverview} className={`${am.btnSecondary} text-xs py-1`}>
                <Download size={12} /> Export
              </button>
            </div>
            <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-white">
                  <tr className="bg-slate-50 text-slate-500">
                    <th className="px-2 py-2 text-left font-semibold">Department</th>
                    <th className="px-2 py-2 text-right font-semibold">Total</th>
                    <th className="px-2 py-2 text-right font-semibold">On Leave</th>
                    <th className="px-2 py-2 text-right font-semibold">Available</th>
                    <th className="px-2 py-2 text-left font-semibold min-w-[120px]">Utilization</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.departmentOverview ?? []).map((row) => (
                    <tr key={row.department} className="border-t border-slate-100">
                      <td className="px-2 py-2 font-medium text-slate-700">{row.department}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{row.totalEmployees}</td>
                      <td className="px-2 py-2 text-right tabular-nums text-orange-600">{row.onLeave}</td>
                      <td className="px-2 py-2 text-right tabular-nums text-green-600">{row.available}</td>
                      <td className="px-2 py-2"><UtilizationBar pct={row.utilization} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Holiday List */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="text-sm font-bold text-slate-800">Holiday List {academicYear}</h3>
              <button type="button" onClick={exportHolidays} className={`${am.btnSecondary} text-xs py-1`}>
                <Download size={12} /> Export
              </button>
            </div>
            <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-white">
                  <tr className="bg-slate-50 text-slate-500">
                    <th className="px-2 py-2 text-left font-semibold">Date</th>
                    <th className="px-2 py-2 text-left font-semibold">Day</th>
                    <th className="px-2 py-2 text-left font-semibold">Holiday Name</th>
                    <th className="px-2 py-2 text-left font-semibold">Type</th>
                    <th className="px-2 py-2 text-left font-semibold">Applicable To</th>
                    <th className="px-2 py-2 text-left font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.holidayList ?? []).map((h) => (
                    <tr key={h.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                      <td className="px-2 py-2 whitespace-nowrap text-slate-600">{h.date}</td>
                      <td className="px-2 py-2 text-slate-500">{h.day}</td>
                      <td className="px-2 py-2 font-medium text-slate-700">{h.name}</td>
                      <td className="px-2 py-2">
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          h.type.includes('Gazetted') ? 'bg-green-100 text-green-800'
                            : h.type.includes('Restricted') ? 'bg-orange-100 text-orange-800'
                              : 'bg-pink-100 text-pink-800'
                        }`}>
                          {h.type}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-slate-600">{h.applicableTo}</td>
                      <td className="px-2 py-2"><StatusBadge status="ACTIVE" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Apply Leave Modal */}
      <AcademicModal open={applyOpen} onClose={() => setApplyOpen(false)} title="Apply Leave">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-600">Employee</label>
            <select
              className={`${am.select} w-full mt-1`}
              value={applyForm.employeeId}
              onChange={(e) => setApplyForm((f) => ({ ...f, employeeId: e.target.value }))}
            >
              <option value="">Select employee…</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.label}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">Leave Type</label>
              <select
                className={`${am.select} w-full mt-1`}
                value={applyForm.leaveType}
                onChange={(e) => setApplyForm((f) => ({ ...f, leaveType: e.target.value }))}
              >
                {LEAVE_TYPES.map((t) => (
                  <option key={t.code} value={t.code}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Session</label>
              <select
                className={`${am.select} w-full mt-1`}
                value={applyForm.session}
                onChange={(e) => setApplyForm((f) => ({ ...f, session: e.target.value }))}
              >
                {SESSIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">From Date</label>
              <input
                type="date"
                className={`${am.input} w-full mt-1`}
                value={applyForm.fromDate}
                onChange={(e) => setApplyForm((f) => ({ ...f, fromDate: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">To Date</label>
              <input
                type="date"
                className={`${am.input} w-full mt-1`}
                value={applyForm.toDate}
                onChange={(e) => setApplyForm((f) => ({ ...f, toDate: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Reason</label>
            <textarea
              className={`${am.input} w-full mt-1 min-h-[80px] resize-y`}
              placeholder="Enter reason for leave…"
              value={applyForm.reason}
              onChange={(e) => setApplyForm((f) => ({ ...f, reason: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setApplyOpen(false)} className={am.btnSecondary}>Cancel</button>
            <button
              type="button"
              disabled={applySaving}
              onClick={() => void handleApplyLeave(true)}
              className={am.btnSecondary}
            >
              {applySaving ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
              Save Draft
            </button>
            <button
              type="button"
              disabled={applySaving}
              onClick={() => void handleApplyLeave(false)}
              className={am.btnPrimary}
            >
              {applySaving ? <Loader2 size={14} className="animate-spin" /> : <UserCheck size={14} />}
              Submit
            </button>
          </div>
        </div>
      </AcademicModal>

      {/* Policy Setup Modal */}
      <AcademicModal open={policyOpen} onClose={() => setPolicyOpen(false)} title="Leave Policy Setup" large>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 min-h-[400px]">
          <div className="md:col-span-2 border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-slate-50 px-3 py-2 border-b border-slate-200">
              <p className="text-xs font-bold text-slate-700">Policies</p>
            </div>
            <div className="max-h-[380px] overflow-y-auto">
              {policyLoading && !policies.length ? (
                <div className="flex items-center justify-center py-10 text-slate-400">
                  <Loader2 size={20} className="animate-spin" />
                </div>
              ) : (
                policies.map((p) => (
                  <button
                    key={String(p.id)}
                    type="button"
                    onClick={() => void loadPolicyDetail(String(p.id))}
                    className={`w-full text-left px-3 py-2.5 border-b border-slate-100 hover:bg-amber-50 transition-colors ${
                      selectedPolicyId === p.id ? 'bg-amber-50 border-l-2 border-l-amber-400' : ''
                    }`}
                  >
                    <p className="text-xs font-bold text-slate-800">{String(p.name)}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{String(p.policyCode)} · {String(p.leaveCategory)}</p>
                    <p className="text-[10px] text-slate-400">{String(p.academicSession)} · {String(p.campus)}</p>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="md:col-span-3 border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-slate-50 px-3 py-2 border-b border-slate-200">
              <p className="text-xs font-bold text-slate-700">Policy Details</p>
            </div>
            <div className="p-3 max-h-[380px] overflow-y-auto">
              {policyLoading && selectedPolicyId ? (
                <div className="flex items-center justify-center py-10 text-slate-400">
                  <Loader2 size={20} className="animate-spin" />
                </div>
              ) : policyDetail ? (
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">{String(policyDetail.name)}</h4>
                    <p className="text-xs text-slate-500 mt-1">{String(policyDetail.description)}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-slate-500">Code:</span> <span className="font-semibold">{String(policyDetail.policyCode)}</span></div>
                    <div><span className="text-slate-500">Category:</span> <span className="font-semibold">{String(policyDetail.leaveCategory)}</span></div>
                    <div><span className="text-slate-500">Session:</span> <span className="font-semibold">{String(policyDetail.academicSession)}</span></div>
                    <div><span className="text-slate-500">Campus:</span> <span className="font-semibold">{String(policyDetail.campus)}</span></div>
                  </div>

                  {Array.isArray(policyDetail.approvalWorkflow) && (
                    <div>
                      <p className="text-xs font-bold text-slate-700 mb-1">Approval Workflow</p>
                      <div className="flex flex-wrap gap-1">
                        {(policyDetail.approvalWorkflow as string[]).map((step, i) => (
                          <span key={step} className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-semibold">
                            {i + 1}. {step}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-bold text-slate-700 mb-2">Leave Types</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-[10px]">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500">
                            <th className="px-2 py-1.5 text-left font-semibold">Code</th>
                            <th className="px-2 py-1.5 text-left font-semibold">Name</th>
                            <th className="px-2 py-1.5 text-right font-semibold">Allocation</th>
                            <th className="px-2 py-1.5 text-center font-semibold">Paid</th>
                            <th className="px-2 py-1.5 text-center font-semibold">Carry Fwd</th>
                            <th className="px-2 py-1.5 text-center font-semibold">Doc Req</th>
                          </tr>
                        </thead>
                        <tbody>
                          {((policyDetail.leaveTypes as Array<Record<string, unknown>>) ?? []).map((lt) => (
                            <tr key={String(lt.code)} className="border-t border-slate-100">
                              <td className="px-2 py-1.5 font-mono font-bold">{String(lt.code)}</td>
                              <td className="px-2 py-1.5">{String(lt.name)}</td>
                              <td className="px-2 py-1.5 text-right tabular-nums">{String(lt.annualAllocation)}</td>
                              <td className="px-2 py-1.5 text-center">{lt.paid ? '✓' : '—'}</td>
                              <td className="px-2 py-1.5 text-center">{lt.carryForwardAllowed ? '✓' : '—'}</td>
                              <td className="px-2 py-1.5 text-center">{lt.documentRequired ? '✓' : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {policyDetail.generalRules && typeof policyDetail.generalRules === 'object' && (
                    <div>
                      <p className="text-xs font-bold text-slate-700 mb-1">General Rules</p>
                      <div className="bg-slate-50 rounded-lg p-2 space-y-1">
                        {Object.entries(policyDetail.generalRules as Record<string, string>).map(([k, v]) => (
                          <p key={k} className="text-[10px] text-slate-600">
                            <span className="font-semibold capitalize">{k.replace(/([A-Z])/g, ' $1').trim()}:</span> {v}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : leaveSettings ? (
                <div className="space-y-2 text-xs">
                  <p className="font-bold text-slate-700">Global Leave Settings</p>
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 rounded-lg p-2">
                    <div><span className="text-slate-500">Sandwich Rule:</span> {leaveSettings.sandwichRule ? 'Enabled' : 'Disabled'}</div>
                    <div><span className="text-slate-500">Min Notice:</span> {String(leaveSettings.minimumNoticeDays ?? '—')} days</div>
                    <div><span className="text-slate-500">Max Consecutive:</span> {String(leaveSettings.maxConsecutiveLeave ?? '—')} days</div>
                    <div><span className="text-slate-500">Carry Forward:</span> {leaveSettings.carryForwardEnabled ? 'Enabled' : 'Disabled'}</div>
                  </div>
                  <p className="text-slate-400 text-center pt-4">Select a policy to view full details</p>
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-10">Select a policy to view details</p>
              )}
            </div>
          </div>
        </div>
      </AcademicModal>

      {/* View Leave Detail Modal */}
      <AcademicModal open={viewOpen} onClose={() => setViewOpen(false)} title="Leave Application Details">
        {selectedLeave && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase">Leave ID</p>
                <p className="font-mono text-xs font-semibold">{selectedLeave.recordId}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase">Status</p>
                <StatusBadge status={selectedLeave.status} />
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase">Employee</p>
              <p className="font-semibold text-slate-800">{selectedLeave.employeeName}</p>
              <p className="text-xs text-slate-500">{selectedLeave.employeeCode} · {selectedLeave.department} · {selectedLeave.designation}</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase">Leave Type</p>
                <p className="text-xs font-semibold">{selectedLeave.leaveTypeLabel}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase">Date Range</p>
                <p className="text-xs">{selectedLeave.dateRange}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase">Total Days</p>
                <p className="text-xs font-bold tabular-nums">{selectedLeave.totalDays}</p>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase">Reason</p>
              <p className="text-xs text-slate-700">{selectedLeave.reason || '—'}</p>
            </div>
            {selectedLeave.reviewerRemarks && (
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase">Reviewer Remarks</p>
                <p className="text-xs text-slate-700">{selectedLeave.reviewerRemarks}</p>
              </div>
            )}
            {selectedLeave.status === 'PENDING' && (
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => { setViewOpen(false); openWorkflow(selectedLeave, 'reject'); }} className={`${am.btnSecondary} text-red-600 border-red-200`}>
                  <X size={14} /> Reject
                </button>
                <button type="button" onClick={() => { setViewOpen(false); openWorkflow(selectedLeave, 'approve'); }} className={am.btnPrimary}>
                  <Check size={14} /> Approve
                </button>
              </div>
            )}
          </div>
        )}
      </AcademicModal>

      {/* Approve/Reject Workflow Modal */}
      <AcademicModal
        open={workflowOpen}
        onClose={() => setWorkflowOpen(false)}
        title={workflowAction === 'approve' ? 'Approve Leave' : 'Reject Leave'}
      >
        {selectedLeave && (
          <div className="space-y-3">
            <div className="bg-slate-50 rounded-lg p-3 text-xs">
              <p className="font-semibold text-slate-800">{selectedLeave.employeeName}</p>
              <p className="text-slate-500 mt-0.5">{selectedLeave.leaveTypeLabel} · {selectedLeave.dateRange} · {selectedLeave.totalDays} day(s)</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Remarks</label>
              <textarea
                className={`${am.input} w-full mt-1 min-h-[70px]`}
                placeholder={workflowAction === 'approve' ? 'Optional approval remarks…' : 'Reason for rejection…'}
                value={workflowRemarks}
                onChange={(e) => setWorkflowRemarks(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setWorkflowOpen(false)} className={am.btnSecondary}>Cancel</button>
              <button
                type="button"
                disabled={workflowSaving}
                onClick={() => void handleWorkflow()}
                className={workflowAction === 'approve' ? am.btnPrimary : `${am.btnSecondary} text-red-600 border-red-200`}
              >
                {workflowSaving ? <Loader2 size={14} className="animate-spin" /> : workflowAction === 'approve' ? <Check size={14} /> : <X size={14} />}
                {workflowAction === 'approve' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        )}
      </AcademicModal>

      {/* Holiday Calendar Modal */}
      <AcademicModal open={holidayModalOpen} onClose={() => setHolidayModalOpen(false)} title={`Holiday Calendar ${academicYear}`} large>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button type="button" onClick={prevMonth} className={am.btnSecondary}>
              <ChevronLeft size={14} /> Prev
            </button>
            <span className="text-sm font-bold text-slate-800">{MONTH_NAMES[calMonth - 1]} {calYear}</span>
            <button type="button" onClick={nextMonth} className={am.btnSecondary}>
              Next <ChevronRight size={14} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="text-[10px] font-bold text-slate-400 text-center py-1">{d}</div>
            ))}
            {calPadding.map((i) => <div key={`mp-${i}`} />)}
            {calCells.map((day) => {
              const dayData = calendarDays.find((d) => d.day === day);
              const events = dayData?.events ?? [];
              return (
                <div key={`m-${day}`} className="border border-slate-100 rounded-lg p-1.5 min-h-[60px]">
                  <span className="text-xs font-bold text-slate-700">{day}</span>
                  {events.map((ev, idx) => (
                    <p key={idx} className="text-[8px] text-slate-500 truncate mt-0.5" title={ev.label}>
                      <span className={`inline-block w-1.5 h-1.5 rounded-full mr-0.5 ${EVENT_DOT_COLORS[ev.type] ?? 'bg-slate-400'}`} />
                      {ev.label}
                    </p>
                  ))}
                </div>
              );
            })}
          </div>

          <div className="border-t border-slate-200 pt-3">
            <h4 className="text-xs font-bold text-slate-700 mb-2">All Holidays ({academicYear})</h4>
            <div className="max-h-[200px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500">
                    <th className="px-2 py-1.5 text-left font-semibold">Date</th>
                    <th className="px-2 py-1.5 text-left font-semibold">Name</th>
                    <th className="px-2 py-1.5 text-left font-semibold">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.holidayList ?? []).map((h) => (
                    <tr key={h.id} className="border-t border-slate-100">
                      <td className="px-2 py-1.5">{h.date}</td>
                      <td className="px-2 py-1.5 font-medium">{h.name}</td>
                      <td className="px-2 py-1.5">{h.type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </AcademicModal>
    </AcademicPageShell>
  );
}
