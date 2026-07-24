import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Banknote,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit2,
  Eye,
  FileText,
  IndianRupee,
  Loader2,
  MoreHorizontal,
  Play,
  RefreshCcw,
  Search,
  Trash2,
  User,
} from 'lucide-react';
import {
  approveHrPayRun,
  fetchHrPayrollDashboard,
  formatInr,
  generateHrPayRun,
  type HrPayrollDashboard,
} from '../../../lib/hrServices';
import {
  generatePayrollSlips,
  markPayrollSlipPaid,
} from '../../../lib/feeFinanceServices';
import { toViewKey } from '../../../lib/navigation';
import {
  am,
  AcademicLoading,
  AcademicPageHeader,
  AcademicPageShell,
  StatusBadge,
} from '../FeeFinanceManagement/FeeFinanceUi';

const ACADEMIC_YEARS = ['2025-26', '2024-25', '2023-24'];
const BRANCHES = ['Main Branch', 'North Branch', 'South Branch', 'Junior Wing Branch'];

const DEFAULT_SUB_MODULES = [
  'Payroll Dashboard',
  'Employees',
  'Salary Structure',
  'Attendance',
  'Leaves',
  'Holidays',
  'Pay Runs',
  'Payslips',
  'Reports',
  'Settings',
] as const;

const SUB_MODULE_NAV: Record<string, string> = {
  Employees: 'Employees Directory',
  'Salary Structure': 'Salary Structure',
  Attendance: 'Attendance & Leave',
  Leaves: 'Leave Management',
  Holidays: 'Leave Management',
  'Pay Runs': 'Payroll Management',
  Payslips: 'Payroll Management',
  Reports: 'Reports',
  Settings: 'Attendance Policy',
};

const LEAVE_CARD_STYLES: Record<string, { bg: string; border: string; text: string; accent: string }> = {
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-800', accent: 'text-purple-600' },
  green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', accent: 'text-green-600' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800', accent: 'text-orange-600' },
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', accent: 'text-blue-600' },
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

type SalaryComponent = { name: string; amount: number; type?: string; taxable?: boolean; pfApplicable?: boolean };
type LeaveCard = { code: string; label: string; color: string; entitled: number; available: number };
type PayRunRow = {
  id: string;
  employeeCode: string;
  employeeName: string;
  netPay: number;
  payDays: number;
  lopDays: number;
  status: string;
  statusLabel: string;
  slipNumber?: string;
  department?: string;
};
type PayslipPreview = {
  schoolName: string;
  payPeriod: string;
  employeeName: string;
  employeeCode: string;
  department: string;
  designation: string;
  workingDays: number;
  presentDays: number;
  leaveDays: number;
  earnings: SalaryComponent[];
  deductions: SalaryComponent[];
  grossEarnings: number;
  totalDeductions: number;
  netPay: number;
  status: string;
};
type SelectedEmployeeMaster = {
  employee: {
    id: string;
    employeeCode: string;
    fullName: string;
    designation: string;
    department: string;
    joinDate: string;
    payrollType: string;
    bankAccount: string;
    panNumber: string;
    uanNumber: string;
    esiNumber: string;
    pfNumber: string;
    workLocation: string;
    annualCtc: number;
    basicSalary: number;
    payGrade: string;
  };
  salarySummary: {
    basicSalary: number;
    grossSalary: number;
    totalEarnings: number;
    totalDeductions: number;
    netSalary: number;
    payFrequency: string;
    payrollStatus: string;
  };
  salaryStructure: {
    structureCode: string;
    structureName: string;
    effectiveFrom: string;
    earnings: SalaryComponent[];
    deductions: SalaryComponent[];
    totalEarnings: number;
    totalDeductions: number;
    netPay: number;
  };
  leaveSummary: LeaveCard[];
  currentSlip: { id: string; slipNumber: string; netPay: number; status: string } | null;
};

function currentPayPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

function avatarColor(name: string) {
  const palette = [
    'bg-blue-500',
    'bg-indigo-500',
    'bg-violet-500',
    'bg-purple-500',
    'bg-teal-500',
    'bg-emerald-500',
    'bg-amber-500',
    'bg-rose-500',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

function InfoField({ label, value }: { label: string; value?: string | number }) {
  const display = value === undefined || value === null || value === '' ? '—' : String(value);
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="text-xs font-semibold text-slate-800 mt-0.5 break-words">{display}</p>
    </div>
  );
}

function WidgetCard({
  title,
  children,
  className = '',
  action,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm p-4 ${className}`}>
      <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-100">
        <h3 className="text-xs font-bold text-slate-800">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function SummaryKpi({
  label,
  value,
  sub,
  valueClass = 'text-slate-900',
}: {
  label: string;
  value: string | number;
  sub?: string;
  valueClass?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 min-w-0">
      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={`text-lg font-bold tabular-nums mt-0.5 ${valueClass}`}>{value}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function LeaveMiniCard({ card }: { card: LeaveCard }) {
  const style = LEAVE_CARD_STYLES[card.color] ?? LEAVE_CARD_STYLES.blue;
  return (
    <div className={`rounded-lg border p-3 ${style.bg} ${style.border}`}>
      <p className={`text-[10px] font-bold uppercase tracking-wide ${style.accent}`}>{card.code}</p>
      <p className={`text-[11px] font-semibold mt-1 ${style.text}`}>{card.label}</p>
      <div className="mt-2 space-y-0.5">
        <div className="flex justify-between text-[10px]">
          <span className="text-slate-500">Entitled</span>
          <span className={`font-bold tabular-nums ${style.text}`}>{card.entitled}</span>
        </div>
        <div className="flex justify-between text-[10px]">
          <span className="text-slate-500">Available</span>
          <span className={`font-bold tabular-nums ${style.accent}`}>{card.available}</span>
        </div>
      </div>
    </div>
  );
}

function PayslipPreviewCard({ preview }: { preview: PayslipPreview }) {
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm text-[10px]">
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white px-3 py-2 text-center">
        <p className="font-bold text-xs tracking-wide">{preview.schoolName}</p>
        <p className="text-[9px] opacity-90 mt-0.5">Salary Slip — {preview.payPeriod}</p>
      </div>
      <div className="px-3 py-2 border-b border-slate-100 bg-slate-50">
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          <p><span className="text-slate-500">Name:</span> <span className="font-semibold">{preview.employeeName}</span></p>
          <p><span className="text-slate-500">Code:</span> <span className="font-semibold">{preview.employeeCode}</span></p>
          <p><span className="text-slate-500">Dept:</span> {preview.department}</p>
          <p><span className="text-slate-500">Desig:</span> {preview.designation}</p>
        </div>
        <div className="flex gap-3 mt-1.5 text-[9px] text-slate-500">
          <span>WD: {preview.workingDays}</span>
          <span>Present: {preview.presentDays}</span>
          <span>Leave: {preview.leaveDays}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 divide-x divide-slate-100">
        <div className="p-2">
          <p className="font-bold text-green-700 mb-1">Earnings</p>
          {preview.earnings.slice(0, 4).map((e) => (
            <div key={e.name} className="flex justify-between gap-1 py-0.5">
              <span className="text-slate-600 truncate">{e.name}</span>
              <span className="font-semibold tabular-nums shrink-0">{formatInr(e.amount)}</span>
            </div>
          ))}
          {preview.earnings.length > 4 && (
            <p className="text-[9px] text-slate-400 mt-0.5">+{preview.earnings.length - 4} more</p>
          )}
        </div>
        <div className="p-2">
          <p className="font-bold text-red-700 mb-1">Deductions</p>
          {preview.deductions.slice(0, 4).map((d) => (
            <div key={d.name} className="flex justify-between gap-1 py-0.5">
              <span className="text-slate-600 truncate">{d.name}</span>
              <span className="font-semibold tabular-nums shrink-0">{formatInr(d.amount)}</span>
            </div>
          ))}
          {preview.deductions.length === 0 && (
            <p className="text-slate-400">—</p>
          )}
        </div>
      </div>
      <div className="px-3 py-2 bg-green-50 border-t border-green-100 flex justify-between items-center">
        <span className="font-bold text-green-800">Net Pay</span>
        <span className="font-bold text-green-700 tabular-nums">{formatInr(preview.netPay)}</span>
      </div>
    </div>
  );
}

type Props = {
  onNavigate?: (view: string) => void;
};

export function PayrollManagementView({ onNavigate }: Props) {
  const now = new Date();
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [branch, setBranch] = useState('Main Branch');
  const [payPeriod, setPayPeriod] = useState(currentPayPeriod());
  const [activeSubModule, setActiveSubModule] = useState('Payroll Dashboard');
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  const [data, setData] = useState<HrPayrollDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [payRunMonth, setPayRunMonth] = useState(now.getMonth() + 1);
  const [payRunYear, setPayRunYear] = useState(now.getFullYear());
  const [payRunBranch, setPayRunBranch] = useState('Main Branch');

  const [selectedPayRun, setSelectedPayRun] = useState('');
  const [payslipEmployeeId, setPayslipEmployeeId] = useState('');
  const [payslipOptions, setPayslipOptions] = useState({
    includeEarnings: true,
    includeDeductions: true,
    includeLeaveSummary: true,
    includeAttendanceSummary: true,
    includeCompanyDetails: true,
  });

  const [structureName, setStructureName] = useState('');

  const initialLoad = useRef(true);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const go = useCallback(
    (pageName: string) => {
      if (onNavigate) onNavigate(toViewKey('HR & Payroll Management', pageName));
    },
    [onNavigate],
  );

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setSearchDebounced(search.trim());
      setPage(1);
    }, 350);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [search]);

  const loadDashboard = useCallback(
    async (opts?: { seed?: boolean; employeeId?: string | null }) => {
      setLoading(true);
      setError('');
      try {
        const res = await fetchHrPayrollDashboard({
          academicYear,
          branch,
          payPeriod,
          q: searchDebounced || undefined,
          page,
          pageSize: 10,
          employeeId: opts?.employeeId ?? selectedEmployeeId ?? undefined,
          seed: opts?.seed,
        });
        setData(res);
        if (res.selectedEmployeeId) {
          setSelectedEmployeeId(res.selectedEmployeeId);
        } else if (!selectedEmployeeId && res.employees.length) {
          setSelectedEmployeeId(res.employees[0].id);
        }
        if (res.month) setPayRunMonth(res.month);
        if (res.year) setPayRunYear(res.year);
        if (res.branch) setPayRunBranch(res.branch);
        if (!selectedPayRun && res.payslipGeneration?.payRuns) {
          const runs = res.payslipGeneration.payRuns as Array<{ value: string; label: string }>;
          if (runs[0]) setSelectedPayRun(runs[0].value);
        }
        if (opts?.seed) setMessage('Payroll demo data loaded');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load payroll dashboard');
      } finally {
        setLoading(false);
      }
    },
    [academicYear, branch, payPeriod, searchDebounced, page, selectedEmployeeId, selectedPayRun],
  );

  useEffect(() => {
    const seed = initialLoad.current;
    initialLoad.current = false;
    void loadDashboard({ seed });
  }, [academicYear, branch, payPeriod, searchDebounced, page, selectedEmployeeId, loadDashboard]);

  const subModules = data?.subModules ?? [...DEFAULT_SUB_MODULES];

  const master = useMemo(() => {
    if (!data?.selectedEmployee) return null;
    return data.selectedEmployee as unknown as SelectedEmployeeMaster;
  }, [data]);

  useEffect(() => {
    if (master?.salaryStructure?.structureName) {
      setStructureName(master.salaryStructure.structureName);
    }
  }, [master?.salaryStructure?.structureName]);

  useEffect(() => {
    if (selectedEmployeeId) setPayslipEmployeeId(selectedEmployeeId);
  }, [selectedEmployeeId]);

  const payRunRows = useMemo(() => {
    return (data?.payRun?.rows ?? []) as PayRunRow[];
  }, [data]);

  const payslipGen = data?.payslipGeneration as {
    payPeriod?: string;
    employees?: Array<{ id: string; label: string }>;
    payRuns?: Array<{ value: string; label: string }>;
    options?: Record<string, boolean>;
    preview?: PayslipPreview | null;
    stats?: Record<string, number>;
  } | undefined;

  const preview = payslipGen?.preview ?? null;
  const pagination = data?.pagination ?? { page: 1, pageSize: 10, total: 0, totalPages: 1 };

  const handleRefresh = () => {
    void loadDashboard();
  };

  const handleEmployeeSelect = (id: string) => {
    setSelectedEmployeeId(id);
  };

  const handleSubModuleClick = (tab: string) => {
    setActiveSubModule(tab);
    const target = SUB_MODULE_NAV[tab];
    if (target && tab !== 'Payroll Dashboard' && tab !== 'Pay Runs' && tab !== 'Payslips') {
      go(target);
    }
  };

  const handleGeneratePayRun = async () => {
    setActionLoading(true);
    setError('');
    try {
      const period = `${payRunYear}-${String(payRunMonth).padStart(2, '0')}`;
      const result = await generateHrPayRun(period, 30, 28);
      setPayPeriod(period);
      setMessage(
        typeof result === 'object' && result && 'message' in result
          ? String((result as { message?: string }).message)
          : `Pay run generated for ${MONTH_NAMES[payRunMonth - 1]} ${payRunYear}`,
      );
      void loadDashboard();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate pay run');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprovePayRun = async () => {
    setActionLoading(true);
    setError('');
    try {
      const period = `${payRunYear}-${String(payRunMonth).padStart(2, '0')}`;
      await approveHrPayRun(period);
      setMessage(`Pay run approved for ${MONTH_NAMES[payRunMonth - 1]} ${payRunYear}`);
      void loadDashboard();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to approve pay run');
    } finally {
      setActionLoading(false);
    }
  };

  const handleGeneratePayslip = async () => {
    if (!payslipEmployeeId) {
      setError('Select an employee for payslip generation');
      return;
    }
    setActionLoading(true);
    setError('');
    try {
      const period = selectedPayRun || payPeriod;
      const result = await generatePayrollSlips({
        payPeriod: period,
        employeeIds: [payslipEmployeeId],
        workingDays: 30,
        presentDays: 28,
        ...payslipOptions,
      });
      setMessage(result.message || 'Payslip generated successfully');
      void loadDashboard();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate payslip');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkPaid = async (slipId: string) => {
    setActionLoading(true);
    setError('');
    try {
      const res = await markPayrollSlipPaid(slipId);
      setMessage(res.message);
      void loadDashboard();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to mark slip as paid');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadPdf = () => {
    setMessage('Payslip PDF download queued — check Documents module for the generated file.');
  };

  if (loading && !data) {
    return <AcademicLoading label="Loading payroll management…" />;
  }

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="HR & Payroll › Payroll Management"
        title="Payroll Management"
        subtitle="Employee salary structures, pay runs, payslips, and statutory compliance in one workspace"
        actions={
          <>
            <select
              value={academicYear}
              onChange={(e) => {
                setAcademicYear(e.target.value);
                setPage(1);
              }}
              className={am.select}
            >
              {ACADEMIC_YEARS.map((y) => (
                <option key={y} value={y}>
                  Academic Year {y}
                </option>
              ))}
            </select>
            <select
              value={branch}
              onChange={(e) => {
                setBranch(e.target.value);
                setPage(1);
              }}
              className={am.select}
            >
              {BRANCHES.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
            <button type="button" onClick={handleRefresh} className={am.btnSecondary} disabled={loading}>
              {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
              Refresh
            </button>
          </>
        }
      />

      {/* Sub-module navigation */}
      <div className="px-4 md:px-6 bg-white border-b border-slate-200 shrink-0">
        <div className="overflow-x-auto scrollbar-thin">
          <div className="flex gap-0 min-w-max">
            {subModules.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => handleSubModuleClick(tab)}
                className={`px-4 py-2.5 text-[11px] font-semibold whitespace-nowrap border-b-2 transition-colors ${
                  activeSubModule === tab
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={am.content}>
        {message && (
          <div className="text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            {message}
          </div>
        )}
        {error && (
          <div className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-4 min-h-[600px]">
          {/* LEFT SIDEBAR */}
          <aside className="w-full lg:w-72 shrink-0 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-3 border-b border-slate-100">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search employee…"
                  className={`${am.input} pl-8 py-1.5 text-xs`}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0">
              {loading && !data?.employees.length ? (
                <div className="flex items-center justify-center py-12 text-slate-400">
                  <Loader2 size={20} className="animate-spin" />
                </div>
              ) : data?.employees.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-10 px-3">No employees found</p>
              ) : (
                <ul className="divide-y divide-slate-50">
                  {data?.employees.map((emp) => {
                    const selected = emp.id === selectedEmployeeId;
                    return (
                      <li key={emp.id}>
                        <button
                          type="button"
                          onClick={() => handleEmployeeSelect(emp.id)}
                          className={`w-full text-left px-3 py-2.5 flex items-start gap-2.5 transition-colors ${
                            selected
                              ? 'bg-blue-50 border-l-2 border-l-blue-600'
                              : 'hover:bg-slate-50 border-l-2 border-l-transparent'
                          }`}
                        >
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0 ${avatarColor(emp.fullName)}`}
                          >
                            {initials(emp.fullName)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={`text-xs font-bold truncate ${selected ? 'text-blue-800' : 'text-slate-800'}`}>
                              {emp.fullName}
                            </p>
                            <p className="text-[10px] text-slate-500 truncate">{emp.designation}</p>
                            <p className="text-[10px] text-slate-400 truncate">{emp.department}</p>
                            <p className="text-[9px] font-mono text-slate-400 mt-0.5">{emp.employeeCode}</p>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Pagination */}
            <div className="p-2 border-t border-slate-100 flex items-center justify-between gap-2 bg-slate-50/80">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className={`${am.btnSecondary} !px-2 !py-1.5 text-xs disabled:opacity-40`}
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-[10px] text-slate-500 font-medium tabular-nums">
                Page {pagination.page} of {pagination.totalPages}
                <span className="text-slate-400"> · {pagination.total} total</span>
              </span>
              <button
                type="button"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className={`${am.btnSecondary} !px-2 !py-1.5 text-xs disabled:opacity-40`}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </aside>

          {/* RIGHT MAIN */}
          <main className="flex-1 min-w-0 space-y-4">
            {!selectedEmployeeId || !master ? (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
                <User size={40} className="mx-auto text-slate-300 mb-3" />
                <p className="text-sm text-slate-500">Select an employee from the list to view payroll details</p>
              </div>
            ) : (
              <>
                {/* Summary KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
                  <SummaryKpi label="Total Staff" value={data?.summary.totalEmployees ?? 0} />
                  <SummaryKpi
                    label="Processed"
                    value={data?.summary.processed ?? 0}
                    valueClass="text-green-600"
                  />
                  <SummaryKpi
                    label="Pending"
                    value={data?.summary.pending ?? 0}
                    valueClass="text-amber-600"
                  />
                  <SummaryKpi label="Gross" value={formatInr(data?.summary.grossSalary ?? 0)} />
                  <SummaryKpi label="Deductions" value={formatInr(data?.summary.deductions ?? 0)} valueClass="text-red-600" />
                  <SummaryKpi label="Net Payroll" value={formatInr(data?.summary.netSalary ?? 0)} valueClass="text-green-700" />
                </div>

                {/* Widget A + B row */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                  {/* A. Employee Salary Information */}
                  <WidgetCard title="Employee Salary Information" className="xl:col-span-2">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-3">
                      <InfoField label="Employee Name" value={master.employee.fullName} />
                      <InfoField label="Designation" value={master.employee.designation} />
                      <InfoField label="Department" value={master.employee.department} />
                      <InfoField label="DOJ" value={master.employee.joinDate} />
                      <InfoField label="Employee Code" value={master.employee.employeeCode} />
                      <InfoField label="Payroll Type" value={master.employee.payrollType} />
                      <InfoField label="Bank Account" value={master.employee.bankAccount} />
                      <InfoField label="PAN" value={master.employee.panNumber} />
                      <InfoField label="UAN" value={master.employee.uanNumber} />
                      <InfoField label="ESI" value={master.employee.esiNumber} />
                      <InfoField label="PF" value={master.employee.pfNumber} />
                      <InfoField label="Work Location" value={master.employee.workLocation} />
                      <InfoField label="CTC Annual" value={formatInr(master.employee.annualCtc)} />
                      <InfoField label="Basic Salary" value={formatInr(master.employee.basicSalary)} />
                      <InfoField label="Pay Grade" value={master.employee.payGrade} />
                    </div>
                  </WidgetCard>

                  {/* B. Salary Structure */}
                  <WidgetCard
                    title="Salary Structure"
                    action={
                      <select
                        value={structureName}
                        onChange={(e) => setStructureName(e.target.value)}
                        className={`${am.select} !py-1 !text-[11px] max-w-[160px]`}
                      >
                        <option value={master.salaryStructure.structureName}>
                          {master.salaryStructure.structureName}
                        </option>
                      </select>
                    }
                  >
                    <div className="space-y-3">
                      <div>
                        <p className="text-[10px] font-bold text-green-700 uppercase mb-1.5">Earnings</p>
                        <div className="border border-slate-100 rounded-lg overflow-hidden">
                          <table className="w-full text-[11px]">
                            <thead>
                              <tr className="bg-slate-50 text-slate-500">
                                <th className="text-left px-2 py-1.5 font-semibold">Component</th>
                                <th className="text-right px-2 py-1.5 font-semibold">Amount</th>
                                <th className="w-14 px-1 py-1.5" />
                              </tr>
                            </thead>
                            <tbody>
                              {master.salaryStructure.earnings.map((row) => (
                                <tr key={row.name} className="border-t border-slate-50">
                                  <td className="px-2 py-1.5 text-slate-700">{row.name}</td>
                                  <td className="px-2 py-1.5 text-right font-semibold tabular-nums">
                                    {formatInr(row.amount)}
                                  </td>
                                  <td className="px-1 py-1.5">
                                    <div className="flex justify-end gap-0.5">
                                      <button type="button" className="p-0.5 text-slate-400 hover:text-blue-600" title="Edit">
                                        <Edit2 size={12} />
                                      </button>
                                      <button type="button" className="p-0.5 text-slate-400 hover:text-red-600" title="Remove">
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                              {master.salaryStructure.earnings.length === 0 && (
                                <tr>
                                  <td colSpan={3} className="px-2 py-3 text-center text-slate-400">
                                    No earnings configured
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div>
                        <p className="text-[10px] font-bold text-red-700 uppercase mb-1.5">Deductions</p>
                        <div className="border border-slate-100 rounded-lg overflow-hidden">
                          <table className="w-full text-[11px]">
                            <thead>
                              <tr className="bg-slate-50 text-slate-500">
                                <th className="text-left px-2 py-1.5 font-semibold">Component</th>
                                <th className="text-right px-2 py-1.5 font-semibold">Amount</th>
                                <th className="w-14 px-1 py-1.5" />
                              </tr>
                            </thead>
                            <tbody>
                              {master.salaryStructure.deductions.map((row) => (
                                <tr key={row.name} className="border-t border-slate-50">
                                  <td className="px-2 py-1.5 text-slate-700">{row.name}</td>
                                  <td className="px-2 py-1.5 text-right font-semibold tabular-nums text-red-600">
                                    {formatInr(row.amount)}
                                  </td>
                                  <td className="px-1 py-1.5">
                                    <div className="flex justify-end gap-0.5">
                                      <button type="button" className="p-0.5 text-slate-400 hover:text-blue-600" title="Edit">
                                        <Edit2 size={12} />
                                      </button>
                                      <button type="button" className="p-0.5 text-slate-400 hover:text-red-600" title="Remove">
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                              {master.salaryStructure.deductions.length === 0 && (
                                <tr>
                                  <td colSpan={3} className="px-2 py-3 text-center text-slate-400">
                                    No deductions configured
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="bg-slate-50 rounded-lg px-3 py-2 space-y-1 text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Total Earnings</span>
                          <span className="font-bold tabular-nums">{formatInr(master.salaryStructure.totalEarnings)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Total Deductions</span>
                          <span className="font-bold tabular-nums text-red-600">
                            {formatInr(master.salaryStructure.totalDeductions)}
                          </span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-slate-200">
                          <span className="font-bold text-slate-700">Net Pay</span>
                          <span className="font-bold tabular-nums text-green-600">
                            {formatInr(master.salaryStructure.netPay)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </WidgetCard>
                </div>

                {/* Widget C + D row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* C. Leave Summary */}
                  <WidgetCard
                    title="Leave Summary"
                    action={
                      <button
                        type="button"
                        onClick={() => go('Leave Management')}
                        className="text-[10px] font-semibold text-blue-600 hover:underline"
                      >
                        View Leave History
                      </button>
                    }
                  >
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {master.leaveSummary.map((card) => (
                        <LeaveMiniCard key={card.code} card={card} />
                      ))}
                    </div>
                  </WidgetCard>

                  {/* D. Upcoming Holidays */}
                  <WidgetCard
                    title="Upcoming Holidays"
                    action={
                      <button
                        type="button"
                        onClick={() => go('Leave Management')}
                        className="text-[10px] font-semibold text-blue-600 hover:underline"
                      >
                        View Holiday Calendar
                      </button>
                    }
                  >
                    <div className="space-y-0 divide-y divide-slate-50 max-h-[180px] overflow-y-auto">
                      {(data?.upcomingHolidays ?? []).length === 0 ? (
                        <p className="text-xs text-slate-400 py-4 text-center">No upcoming holidays</p>
                      ) : (
                        data?.upcomingHolidays.map((h) => (
                          <div key={h.id} className="flex items-center gap-3 py-2 first:pt-0">
                            <div className="w-12 text-center shrink-0">
                              <p className="text-[10px] font-bold text-blue-600">
                                {new Date(h.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                              </p>
                              <p className="text-[9px] text-slate-400">{h.day?.slice(0, 3)}</p>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-slate-800 truncate">{h.name}</p>
                              <p className="text-[10px] text-slate-400">{h.type}</p>
                            </div>
                            <Calendar size={14} className="text-slate-300 shrink-0" />
                          </div>
                        ))
                      )}
                    </div>
                  </WidgetCard>
                </div>

                {/* E. Pay Run Management */}
                <WidgetCard title="Pay Run Management">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <select
                      value={payRunMonth}
                      onChange={(e) => setPayRunMonth(Number(e.target.value))}
                      className={`${am.select} !py-1.5 !text-xs`}
                    >
                      {MONTH_NAMES.map((m, i) => (
                        <option key={m} value={i + 1}>
                          {m}
                        </option>
                      ))}
                    </select>
                    <select
                      value={payRunYear}
                      onChange={(e) => setPayRunYear(Number(e.target.value))}
                      className={`${am.select} !py-1.5 !text-xs`}
                    >
                      {[payRunYear - 1, payRunYear, payRunYear + 1].map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                    <select
                      value={payRunBranch}
                      onChange={(e) => setPayRunBranch(e.target.value)}
                      className={`${am.select} !py-1.5 !text-xs`}
                    >
                      {BRANCHES.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                    <div className="flex-1" />
                    <button
                      type="button"
                      onClick={() => void handleGeneratePayRun()}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm disabled:opacity-50"
                    >
                      {actionLoading ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
                      Generate Pay Run
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleApprovePayRun()}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold shadow-sm disabled:opacity-50"
                    >
                      {actionLoading ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                      Approve Pay Run
                    </button>
                  </div>

                  <div className="border border-slate-100 rounded-lg overflow-x-auto">
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500">
                          <th className="text-left px-3 py-2 font-semibold">Employee Code</th>
                          <th className="text-left px-3 py-2 font-semibold">Name</th>
                          <th className="text-right px-3 py-2 font-semibold">Net Pay</th>
                          <th className="text-center px-3 py-2 font-semibold">Pay Days</th>
                          <th className="text-center px-3 py-2 font-semibold">LOP Days</th>
                          <th className="text-center px-3 py-2 font-semibold">Status</th>
                          <th className="text-center px-3 py-2 font-semibold w-24">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payRunRows.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-3 py-8 text-center text-slate-400">
                              No pay run records for this period. Click Generate Pay Run to create slips.
                            </td>
                          </tr>
                        ) : (
                          payRunRows.map((row) => (
                            <tr key={row.id} className="border-t border-slate-50 hover:bg-slate-50/50">
                              <td className="px-3 py-2 font-mono text-slate-600">{row.employeeCode}</td>
                              <td className="px-3 py-2 font-medium text-slate-800">{row.employeeName}</td>
                              <td className="px-3 py-2 text-right font-semibold tabular-nums text-green-700">
                                {formatInr(row.netPay)}
                              </td>
                              <td className="px-3 py-2 text-center tabular-nums">{row.payDays}</td>
                              <td className="px-3 py-2 text-center tabular-nums text-red-600">{row.lopDays}</td>
                              <td className="px-3 py-2 text-center">
                                <StatusBadge status={row.status} />
                              </td>
                              <td className="px-3 py-2">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    className="p-1 text-slate-400 hover:text-blue-600 rounded"
                                    title="View slip"
                                    onClick={() => handleEmployeeSelect(
                                      data?.employees.find((e) => e.employeeCode === row.employeeCode)?.id ?? selectedEmployeeId ?? '',
                                    )}
                                  >
                                    <Eye size={14} />
                                  </button>
                                  {row.status === 'GENERATED' && (
                                    <button
                                      type="button"
                                      className="p-1 text-slate-400 hover:text-green-600 rounded"
                                      title="Mark paid"
                                      onClick={() => void handleMarkPaid(row.id)}
                                    >
                                      <Banknote size={14} />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    className="p-1 text-slate-400 hover:text-slate-600 rounded"
                                    title="More"
                                  >
                                    <MoreHorizontal size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {data?.payRun?.summary && (
                    <div className="mt-2 flex flex-wrap gap-4 text-[10px] text-slate-500">
                      <span>
                        Employees:{' '}
                        <strong className="text-slate-700">
                          {String((data.payRun.summary as Record<string, unknown>).employees ?? payRunRows.length)}
                        </strong>
                      </span>
                      <span>
                        Approved:{' '}
                        <strong className="text-green-600">
                          {String((data.payRun.summary as Record<string, unknown>).approved ?? 0)}
                        </strong>
                      </span>
                      <span>
                        Draft:{' '}
                        <strong className="text-amber-600">
                          {String((data.payRun.summary as Record<string, unknown>).draft ?? 0)}
                        </strong>
                      </span>
                      <span>
                        Total Net:{' '}
                        <strong className="text-green-700">
                          {formatInr(Number((data.payRun.summary as Record<string, unknown>).totalNet ?? 0))}
                        </strong>
                      </span>
                    </div>
                  )}
                </WidgetCard>

                {/* F. Payslip Generation */}
                <WidgetCard title="Payslip Generation">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-medium text-slate-500 uppercase">Pay Run</label>
                          <select
                            value={selectedPayRun || payPeriod}
                            onChange={(e) => setSelectedPayRun(e.target.value)}
                            className={`${am.select} w-full mt-1 !text-xs`}
                          >
                            {(payslipGen?.payRuns ?? [{ value: payPeriod, label: data?.payPeriodLabel ?? payPeriod }]).map(
                              (pr) => (
                                <option key={pr.value} value={pr.value}>
                                  {pr.label}
                                </option>
                              ),
                            )}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-medium text-slate-500 uppercase">Employee</label>
                          <select
                            value={payslipEmployeeId}
                            onChange={(e) => setPayslipEmployeeId(e.target.value)}
                            className={`${am.select} w-full mt-1 !text-xs`}
                          >
                            <option value="">Select employee…</option>
                            {(payslipGen?.employees ?? data?.employees.map((e) => ({
                              id: e.id,
                              label: `${e.fullName} (${e.employeeCode})`,
                            })) ?? []).map((emp) => (
                              <option key={emp.id} value={emp.id}>
                                {emp.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void handleGeneratePayslip()}
                          disabled={actionLoading || !payslipEmployeeId}
                          className={`${am.btnPrimary} !text-xs !py-1.5`}
                        >
                          {actionLoading ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
                          Generate Payslip
                        </button>
                        <button
                          type="button"
                          onClick={handleDownloadPdf}
                          className={`${am.btnSecondary} !text-xs !py-1.5`}
                        >
                          <Download size={13} />
                          Download PDF
                        </button>
                      </div>

                      <div className="border border-slate-100 rounded-lg p-3 bg-slate-50/50">
                        <p className="text-[10px] font-bold text-slate-600 uppercase mb-2">Payslip Options</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {(
                            [
                              ['includeEarnings', 'Include Earnings Breakdown'],
                              ['includeDeductions', 'Include Deductions Breakdown'],
                              ['includeLeaveSummary', 'Include Leave Summary'],
                              ['includeAttendanceSummary', 'Include Attendance Summary'],
                              ['includeCompanyDetails', 'Include Company Letterhead'],
                            ] as const
                          ).map(([key, label]) => (
                            <label key={key} className="flex items-center gap-2 text-[11px] text-slate-700 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={payslipOptions[key]}
                                onChange={(e) =>
                                  setPayslipOptions((prev) => ({ ...prev, [key]: e.target.checked }))
                                }
                                className="rounded border-slate-300 text-amber-500 focus:ring-amber-400"
                              />
                              {label}
                            </label>
                          ))}
                        </div>
                      </div>

                      {payslipGen?.stats && (
                        <div className="flex flex-wrap gap-3 text-[10px] text-slate-500">
                          <span>
                            Generated:{' '}
                            <strong className="text-slate-700">{payslipGen.stats.generated ?? 0}</strong>
                          </span>
                          <span>
                            Pending:{' '}
                            <strong className="text-amber-600">{payslipGen.stats.pending ?? 0}</strong>
                          </span>
                          <span>
                            Net Pay:{' '}
                            <strong className="text-green-700">{formatInr(payslipGen.stats.netPay ?? 0)}</strong>
                          </span>
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="text-[10px] font-bold text-slate-600 uppercase mb-2">Preview</p>
                      {preview ? (
                        <PayslipPreviewCard preview={preview} />
                      ) : (
                        <div className="border border-dashed border-slate-200 rounded-lg p-8 text-center bg-slate-50/50">
                          <IndianRupee size={28} className="mx-auto text-slate-300 mb-2" />
                          <p className="text-xs text-slate-400">
                            Select an employee to preview payslip layout
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </WidgetCard>
              </>
            )}
          </main>
        </div>
      </div>
    </AcademicPageShell>
  );
}
