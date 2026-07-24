import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowDown,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Fingerprint,
  Loader2,
  Lock,
  MapPin,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Timer,
  UserCheck,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import {
  advanceHrAttendancePeriodLock,
  advanceHrCorrectionWorkflow,
  approveHrDailyAttendance,
  createHrAttendanceCorrection,
  fetchHrAttendanceCorrections,
  fetchHrAttendanceDashboard,
  fetchHrAttendanceMeta,
  fetchHrAttendancePeriodLock,
  fetchHrBiometricSummary,
  fetchHrDailyAttendance,
  fetchHrEmployeeAttendanceCard,
  fetchHrMonthlyRegister,
  fetchHrPayrollAttendancePreview,
  formatInr,
  saveHrDailyAttendance,
  submitHrDailyAttendance,
  updateHrAttendanceSettings,
  type HrAttendanceMeta,
  type HrDailyAttendanceRow,
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
  'Daily Entry',
  'Monthly Register',
  'Corrections',
  'Payroll Mapping',
  'Biometric',
  'Shifts & Rules',
  'Settings',
] as const;

type TabId = (typeof TABS)[number];

const SUMMARY_CARDS: Array<{
  key: string;
  label: string;
  icon: React.ReactNode;
  iconBg: string;
  valueClass?: string;
}> = [
  { key: 'totalEmployees', label: 'Total Employees', icon: <Users size={18} className="text-blue-600" />, iconBg: 'bg-blue-50' },
  { key: 'present', label: 'Present', icon: <UserCheck size={18} className="text-green-600" />, iconBg: 'bg-green-50', valueClass: 'text-green-600' },
  { key: 'absent', label: 'Absent', icon: <XCircle size={18} className="text-red-600" />, iconBg: 'bg-red-50', valueClass: 'text-red-600' },
  { key: 'onLeave', label: 'On Leave', icon: <Calendar size={18} className="text-orange-600" />, iconBg: 'bg-orange-50', valueClass: 'text-orange-600' },
  { key: 'halfDay', label: 'Half Day', icon: <Clock size={18} className="text-amber-600" />, iconBg: 'bg-amber-50' },
  { key: 'lateArrivals', label: 'Late Arrivals', icon: <Timer size={18} className="text-yellow-600" />, iconBg: 'bg-yellow-50' },
  { key: 'earlyDepartures', label: 'Early Departures', icon: <ArrowDown size={18} className="text-rose-600" />, iconBg: 'bg-rose-50' },
  { key: 'workFromHome', label: 'Work From Home', icon: <MapPin size={18} className="text-indigo-600" />, iconBg: 'bg-indigo-50' },
  { key: 'fieldDuty', label: 'Field Duty', icon: <MapPin size={18} className="text-teal-600" />, iconBg: 'bg-teal-50' },
  { key: 'outdoorDuty', label: 'Outdoor Duty', icon: <MapPin size={18} className="text-cyan-600" />, iconBg: 'bg-cyan-50' },
  { key: 'onTraining', label: 'On Training', icon: <ShieldCheck size={18} className="text-violet-600" />, iconBg: 'bg-violet-50' },
  { key: 'holiday', label: 'Holiday', icon: <Calendar size={18} className="text-pink-600" />, iconBg: 'bg-pink-50' },
  { key: 'weeklyOff', label: 'Weekly Off', icon: <Calendar size={18} className="text-slate-600" />, iconBg: 'bg-slate-100' },
  { key: 'missingPunch', label: 'Missing Punch', icon: <AlertCircle size={18} className="text-red-500" />, iconBg: 'bg-red-50', valueClass: 'text-red-600' },
  { key: 'overtimeEmployees', label: 'Overtime', icon: <Timer size={18} className="text-purple-600" />, iconBg: 'bg-purple-50' },
  { key: 'pendingApproval', label: 'Pending Approval', icon: <Send size={18} className="text-amber-600" />, iconBg: 'bg-amber-50', valueClass: 'text-amber-600' },
];

const HOLIDAY_TOGGLES: Array<{ key: string; label: string }> = [
  { key: 'mapApprovedLeave', label: 'Map Approved Leave' },
  { key: 'mapPublicHoliday', label: 'Map Public Holiday' },
  { key: 'mapRestrictedHoliday', label: 'Map Restricted Holiday' },
  { key: 'mapWeeklyOff', label: 'Map Weekly Off' },
  { key: 'mapSchoolHoliday', label: 'Map School Holiday' },
  { key: 'mapVacation', label: 'Map Vacation' },
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function KpiCard({
  title,
  value,
  icon,
  iconBg,
  valueClass = 'text-slate-900',
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  iconBg: string;
  valueClass?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 flex items-start gap-2.5">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wide leading-tight">{title}</p>
        <p className={`text-lg font-bold mt-0.5 tabular-nums ${valueClass}`}>{value}</p>
      </div>
    </div>
  );
}

function VerticalSteps({ steps, values }: { steps: string[]; values?: Array<{ step: string; value: number; type: string }> }) {
  const valueMap = new Map(values?.map((v) => [v.step, v]) ?? []);
  return (
    <div className="space-y-0">
      {steps.map((step, idx) => {
        const val = valueMap.get(step);
        const isFinal = val?.type === 'final';
        const isDeduction = val && val.value < 0;
        const isAddition = val?.type === 'addition';
        return (
          <div key={step} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                  isFinal
                    ? 'bg-green-600 text-white'
                    : isDeduction
                      ? 'bg-red-100 text-red-700'
                      : isAddition
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-slate-100 text-slate-600'
                }`}
              >
                {idx + 1}
              </div>
              {idx < steps.length - 1 && <div className="w-0.5 flex-1 bg-slate-200 min-h-[20px] my-0.5" />}
            </div>
            <div className="pb-4 min-w-0">
              <p className={`text-xs font-semibold ${isFinal ? 'text-green-800' : 'text-slate-800'}`}>{step}</p>
              {val !== undefined && (
                <p
                  className={`text-[11px] font-bold tabular-nums mt-0.5 ${
                    isFinal ? 'text-green-700' : isDeduction ? 'text-red-600' : isAddition ? 'text-blue-600' : 'text-slate-500'
                  }`}
                >
                  {val.type === 'info' ? String(val.value) : formatInr(Math.abs(val.value))}
                  {isDeduction ? ' (deduction)' : ''}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WorkflowDiagram({ steps, activeIndex }: { steps: string[]; activeIndex?: number }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {steps.map((step, idx) => (
        <div key={step} className="flex items-center gap-1">
          <div
            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold border ${
              activeIndex !== undefined && idx <= activeIndex
                ? 'bg-blue-50 border-blue-200 text-blue-800'
                : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}
          >
            {step.replace(/_/g, ' ')}
          </div>
          {idx < steps.length - 1 && <span className="text-slate-300 text-xs">→</span>}
        </div>
      ))}
    </div>
  );
}

type SettingsForm = Record<string, string | number | boolean>;

function settingsToForm(settings: Record<string, unknown>): SettingsForm {
  const form: SettingsForm = {};
  for (const [k, v] of Object.entries(settings)) {
    if (typeof v === 'boolean' || typeof v === 'number') form[k] = v;
    else if (v != null) form[k] = String(v);
    else form[k] = '';
  }
  return form;
}

type CorrectionRow = Record<string, unknown>;
type MonthlyRow = Record<string, unknown>;
type BiometricDevice = Record<string, unknown>;

export function AttendanceLeaveView() {
  const [tab, setTab] = useState<TabId>('Dashboard');
  const [meta, setMeta] = useState<HrAttendanceMeta | null>(null);
  const [dashboard, setDashboard] = useState<{
    date: string;
    summary: Record<string, number>;
    payrollFormula: string[];
    payrollMappingFields: string[];
    approvalWorkflow: string[];
    correctionWorkflow: string[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Daily entry state
  const [dailyDate, setDailyDate] = useState(todayIso());
  const [dailyFilters, setDailyFilters] = useState({
    campus: '',
    branch: '',
    department: '',
    designation: '',
    shift: '',
    employmentType: '',
    q: '',
  });
  const [dailyRows, setDailyRows] = useState<HrDailyAttendanceRow[]>([]);
  const [dailyLock, setDailyLock] = useState<{ workflowStatus: string; lockedAt: string | null } | null>(null);
  const [dailyIsLocked, setDailyIsLocked] = useState(false);
  const [dailyLoading, setDailyLoading] = useState(false);

  // Monthly register
  const now = new Date();
  const [regYear, setRegYear] = useState(now.getFullYear());
  const [regMonth, setRegMonth] = useState(now.getMonth() + 1);
  const [monthlyRows, setMonthlyRows] = useState<MonthlyRow[]>([]);
  const [monthlyWorkingDays, setMonthlyWorkingDays] = useState(0);
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const [employeeCardOpen, setEmployeeCardOpen] = useState(false);
  const [employeeCard, setEmployeeCard] = useState<Record<string, unknown> | null>(null);
  const [employeeCardLoading, setEmployeeCardLoading] = useState(false);

  // Corrections
  const [corrections, setCorrections] = useState<CorrectionRow[]>([]);
  const [correctionsLoading, setCorrectionsLoading] = useState(false);
  const [correctionForm, setCorrectionForm] = useState({
    employeeId: '',
    attendanceDate: todayIso(),
    originalInTime: '',
    originalOutTime: '',
    correctedInTime: '',
    correctedOutTime: '',
    reason: '',
  });

  // Payroll mapping
  const [payrollEmployeeId, setPayrollEmployeeId] = useState('');
  const [payrollPreview, setPayrollPreview] = useState<{
    employee: { id: string; employeeCode: string; fullName: string };
    formula: Array<{ step: string; value: number; type: string }>;
    payrollMapping: Record<string, number>;
  } | null>(null);
  const [payrollLoading, setPayrollLoading] = useState(false);

  // Biometric
  const [biometric, setBiometric] = useState<{
    supportedVendors: string[];
    supportedModes: string[];
    devices: BiometricDevice[];
    functions: string[];
  } | null>(null);
  const [biometricLoading, setBiometricLoading] = useState(false);

  // Settings
  const [settingsForm, setSettingsForm] = useState<SettingsForm>({});
  const [settingsSaving, setSettingsSaving] = useState(false);

  // Period lock
  const [periodLock, setPeriodLock] = useState<Record<string, unknown> | null>(null);

  const loadMetaAndDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [metaRes, dashRes] = await Promise.all([
        fetchHrAttendanceMeta(true),
        fetchHrAttendanceDashboard(dailyDate, true),
      ]);
      setMeta(metaRes);
      setDashboard(dashRes);
      setSettingsForm(settingsToForm(metaRes.settings));
      if (!payrollEmployeeId && metaRes.employees.length > 0) {
        setPayrollEmployeeId(metaRes.employees[0].id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  }, [dailyDate, payrollEmployeeId]);

  useEffect(() => {
    void loadMetaAndDashboard();
  }, [loadMetaAndDashboard]);

  const loadDaily = useCallback(async () => {
    setDailyLoading(true);
    try {
      const res = await fetchHrDailyAttendance({
        date: dailyDate,
        campus: dailyFilters.campus || undefined,
        branch: dailyFilters.branch || undefined,
        department: dailyFilters.department || undefined,
        designation: dailyFilters.designation || undefined,
        shift: dailyFilters.shift || undefined,
        employmentType: dailyFilters.employmentType || undefined,
        q: dailyFilters.q.trim() || undefined,
      });
      setDailyRows(res.records);
      setDailyLock(res.periodLock);
      setDailyIsLocked(res.isLocked);
      const d = new Date(dailyDate);
      const lockRes = await fetchHrAttendancePeriodLock(d.getFullYear(), d.getMonth() + 1);
      setPeriodLock(lockRes as Record<string, unknown>);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load daily attendance');
    } finally {
      setDailyLoading(false);
    }
  }, [dailyDate, dailyFilters]);

  const loadMonthly = useCallback(async () => {
    setMonthlyLoading(true);
    try {
      const res = await fetchHrMonthlyRegister(regYear, regMonth);
      setMonthlyRows(res.rows);
      setMonthlyWorkingDays(res.workingDays);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load monthly register');
    } finally {
      setMonthlyLoading(false);
    }
  }, [regYear, regMonth]);

  const loadCorrections = useCallback(async () => {
    setCorrectionsLoading(true);
    try {
      const res = await fetchHrAttendanceCorrections();
      setCorrections(res.records);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load corrections');
    } finally {
      setCorrectionsLoading(false);
    }
  }, []);

  const loadPayrollPreview = useCallback(async () => {
    if (!payrollEmployeeId) return;
    setPayrollLoading(true);
    try {
      const res = await fetchHrPayrollAttendancePreview(payrollEmployeeId, regYear, regMonth);
      setPayrollPreview(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load payroll preview');
    } finally {
      setPayrollLoading(false);
    }
  }, [payrollEmployeeId, regYear, regMonth]);

  const loadBiometric = useCallback(async () => {
    setBiometricLoading(true);
    try {
      const res = await fetchHrBiometricSummary();
      setBiometric(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load biometric summary');
    } finally {
      setBiometricLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'Daily Entry') void loadDaily();
  }, [tab, loadDaily]);

  useEffect(() => {
    if (tab === 'Monthly Register') void loadMonthly();
  }, [tab, loadMonthly]);

  useEffect(() => {
    if (tab === 'Corrections') void loadCorrections();
  }, [tab, loadCorrections]);

  useEffect(() => {
    if (tab === 'Payroll Mapping') void loadPayrollPreview();
  }, [tab, loadPayrollPreview]);

  useEffect(() => {
    if (tab === 'Biometric') void loadBiometric();
  }, [tab, loadBiometric]);

  const updateDailyRow = (employeeId: string, patch: Partial<HrDailyAttendanceRow>) => {
    setDailyRows((rows) =>
      rows.map((r) => (r.employeeId === employeeId ? { ...r, ...patch } : r)),
    );
  };

  const handleSaveDaily = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await saveHrDailyAttendance(dailyDate, dailyRows);
      setDailyRows(res.records);
      setMessage('Attendance saved successfully');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitDaily = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await submitHrDailyAttendance(dailyDate);
      setDailyRows((res as { records: HrDailyAttendanceRow[] }).records);
      setMessage('Attendance submitted for approval');
      void loadDaily();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submit failed');
    } finally {
      setSaving(false);
    }
  };

  const handleApproveDaily = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await approveHrDailyAttendance(dailyDate);
      setDailyRows((res as { records: HrDailyAttendanceRow[] }).records);
      setMessage('Attendance approved');
      void loadDaily();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Approve failed');
    } finally {
      setSaving(false);
    }
  };

  const handleLockPeriod = async () => {
    const d = new Date(dailyDate);
    setSaving(true);
    setError('');
    try {
      const res = await advanceHrAttendancePeriodLock(d.getFullYear(), d.getMonth() + 1);
      setPeriodLock(res as Record<string, unknown>);
      setMessage(`Period lock advanced to ${(res as { workflowStatus: string }).workflowStatus.replace(/_/g, ' ')}`);
      void loadDaily();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lock advance failed');
    } finally {
      setSaving(false);
    }
  };

  const openEmployeeCard = async (employeeId: string) => {
    setEmployeeCardOpen(true);
    setEmployeeCardLoading(true);
    try {
      const res = await fetchHrEmployeeAttendanceCard(employeeId, regYear, regMonth);
      setEmployeeCard(res as Record<string, unknown>);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load employee card');
      setEmployeeCard(null);
    } finally {
      setEmployeeCardLoading(false);
    }
  };

  const handleCreateCorrection = async () => {
    if (!correctionForm.employeeId || !correctionForm.reason.trim()) return;
    setSaving(true);
    setError('');
    try {
      await createHrAttendanceCorrection(correctionForm);
      setMessage('Correction request submitted');
      setCorrectionForm({
        employeeId: '',
        attendanceDate: todayIso(),
        originalInTime: '',
        originalOutTime: '',
        correctedInTime: '',
        correctedOutTime: '',
        reason: '',
      });
      void loadCorrections();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create correction');
    } finally {
      setSaving(false);
    }
  };

  const handleCorrectionAction = async (id: string, action: 'approve' | 'reject') => {
    try {
      await advanceHrCorrectionWorkflow(id, action);
      setMessage(`Correction ${action === 'approve' ? 'approved' : 'rejected'}`);
      void loadCorrections();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Workflow action failed');
    }
  };

  const handleSaveSettings = async () => {
    setSettingsSaving(true);
    setError('');
    try {
      const payload: Record<string, unknown> = { ...settingsForm };
      if (typeof payload.graceMinutes === 'string') payload.graceMinutes = Number(payload.graceMinutes) || 0;
      if (typeof payload.monthlyAllowedLate === 'string') payload.monthlyAllowedLate = Number(payload.monthlyAllowedLate) || 0;
      if (typeof payload.biometricSyncMinutes === 'string') payload.biometricSyncMinutes = Number(payload.biometricSyncMinutes) || 0;
      if (typeof payload.payrollCutoffDate === 'string') payload.payrollCutoffDate = Number(payload.payrollCutoffDate) || 0;
      if (typeof payload.attendanceLockDate === 'string') payload.attendanceLockDate = Number(payload.attendanceLockDate) || 0;
      const updated = await updateHrAttendanceSettings(payload);
      setSettingsForm(settingsToForm(updated as Record<string, unknown>));
      setMessage('Attendance settings saved');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Settings save failed');
    } finally {
      setSettingsSaving(false);
    }
  };

  const periodLockIndex = useMemo(() => {
    const steps = (periodLock?.workflowSteps as string[]) ?? meta?.workflowSteps ?? [];
    const status = (periodLock?.workflowStatus as string) ?? dailyLock?.workflowStatus ?? 'OPEN';
    return steps.indexOf(status);
  }, [periodLock, dailyLock, meta]);

  const employmentTypes = useMemo(() => {
    if (!meta) return [];
    return [...new Set(meta.employees.map((e) => e.employmentType))].sort();
  }, [meta]);

  if (loading && !meta) {
    return (
      <AcademicPageShell>
        <AcademicLoading label="Loading attendance & leave…" />
      </AcademicPageShell>
    );
  }

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="HR & Payroll Management › Attendance & Leave"
        title="Attendance & Leave"
        subtitle="Daily attendance entry, monthly register, corrections, payroll mapping and biometric integration"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => void loadMetaAndDashboard()} className={am.btnSecondary}>
              <RefreshCcw size={14} /> Refresh
            </button>
          </div>
        }
      />

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

        <FeeTabs tabs={[...TABS]} active={tab} onChange={(t) => setTab(t as TabId)} />

        {/* ─── Dashboard ─── */}
        {tab === 'Dashboard' && dashboard && (
          <div className="space-y-4 mt-4">
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-xs font-semibold text-slate-600">As of date</label>
              <input
                type="date"
                className={am.input}
                value={dailyDate}
                onChange={(e) => {
                  setDailyDate(e.target.value);
                  void fetchHrAttendanceDashboard(e.target.value, true).then(setDashboard).catch(() => {});
                }}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-8 gap-2">
              {SUMMARY_CARDS.map((card) => (
                <KpiCard
                  key={card.key}
                  title={card.label}
                  value={String(dashboard.summary[card.key] ?? 0)}
                  icon={card.icon}
                  iconBg={card.iconBg}
                  valueClass={card.valueClass}
                />
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <h3 className="text-sm font-bold text-slate-800 mb-3">Payroll Formula Flow</h3>
                <VerticalSteps steps={dashboard.payrollFormula} />
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <h3 className="text-sm font-bold text-slate-800 mb-3">Payroll Mapping Fields</h3>
                <ul className="space-y-1.5">
                  {dashboard.payrollMappingFields.map((field) => (
                    <li key={field} className="flex items-center gap-2 text-xs text-slate-700">
                      <Check size={12} className="text-green-600 shrink-0" />
                      {field}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 lg:col-span-2 xl:col-span-1">
                <h3 className="text-sm font-bold text-slate-800 mb-3">Approval Workflow</h3>
                <WorkflowDiagram steps={dashboard.approvalWorkflow} activeIndex={3} />
                <h3 className="text-sm font-bold text-slate-800 mb-3 mt-5">Correction Workflow</h3>
                <WorkflowDiagram steps={dashboard.correctionWorkflow} activeIndex={1} />
              </div>
            </div>
          </div>
        )}

        {/* ─── Daily Entry ─── */}
        {tab === 'Daily Entry' && (
          <div className="space-y-4 mt-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <h3 className="text-sm font-bold text-slate-800 mb-3">Filters</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-slate-500">Date</label>
                  <input type="date" className={am.input} value={dailyDate} onChange={(e) => setDailyDate(e.target.value)} />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500">Campus</label>
                  <select className={`${am.select} w-full`} value={dailyFilters.campus} onChange={(e) => setDailyFilters((f) => ({ ...f, campus: e.target.value }))}>
                    <option value="">All</option>
                    {(meta?.campuses ?? []).map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500">Branch</label>
                  <select className={`${am.select} w-full`} value={dailyFilters.branch} onChange={(e) => setDailyFilters((f) => ({ ...f, branch: e.target.value }))}>
                    <option value="">All</option>
                    {(meta?.branches ?? []).map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500">Department</label>
                  <select className={`${am.select} w-full`} value={dailyFilters.department} onChange={(e) => setDailyFilters((f) => ({ ...f, department: e.target.value }))}>
                    <option value="">All</option>
                    {(meta?.departments ?? []).map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500">Designation</label>
                  <select className={`${am.select} w-full`} value={dailyFilters.designation} onChange={(e) => setDailyFilters((f) => ({ ...f, designation: e.target.value }))}>
                    <option value="">All</option>
                    {(meta?.designations ?? []).map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500">Shift</label>
                  <select className={`${am.select} w-full`} value={dailyFilters.shift} onChange={(e) => setDailyFilters((f) => ({ ...f, shift: e.target.value }))}>
                    <option value="">All</option>
                    {(meta?.shifts ?? []).map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500">Employment Type</label>
                  <select className={`${am.select} w-full`} value={dailyFilters.employmentType} onChange={(e) => setDailyFilters((f) => ({ ...f, employmentType: e.target.value }))}>
                    <option value="">All</option>
                    {employmentTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500">Employee Search</label>
                  <div className="relative">
                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      className={`${am.input} pl-8`}
                      placeholder="Name or ID…"
                      value={dailyFilters.q}
                      onChange={(e) => setDailyFilters((f) => ({ ...f, q: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <button type="button" onClick={() => void loadDaily()} className={am.btnSecondary}>
                  <Search size={14} /> Apply Filters
                </button>
              </div>
            </div>

            {/* Period lock status */}
            <div className={`rounded-xl border p-3 flex flex-wrap items-center justify-between gap-3 ${
              dailyIsLocked ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
            }`}>
              <div className="flex items-center gap-2">
                <Lock size={16} className={dailyIsLocked ? 'text-red-600' : 'text-amber-600'} />
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    Period Lock: <StatusBadge status={(periodLock?.workflowStatus as string) ?? dailyLock?.workflowStatus ?? 'OPEN'} />
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {dailyLock?.lockedAt
                      ? `Locked at ${new Date(dailyLock.lockedAt).toLocaleString()}`
                      : 'Attendance period is open for editing'}
                  </p>
                </div>
              </div>
              {periodLock && (
                <WorkflowDiagram
                  steps={(periodLock.workflowSteps as string[]) ?? meta?.workflowSteps ?? []}
                  activeIndex={periodLockIndex}
                />
              )}
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h3 className="text-sm font-bold text-slate-800">
                  Attendance Grid ({dailyRows.length} employees)
                </h3>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => void handleSaveDaily()} className={am.btnPrimary} disabled={saving || dailyIsLocked}>
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    Save
                  </button>
                  <button type="button" onClick={() => void handleSubmitDaily()} className={`${am.btnSecondary} bg-white`} disabled={saving || dailyIsLocked}>
                    <Send size={14} /> Submit
                  </button>
                  <button type="button" onClick={() => void handleApproveDaily()} className={`${am.btnSecondary} bg-green-50 text-green-800 border-green-200`} disabled={saving || dailyIsLocked}>
                    <CheckCircle2 size={14} /> Approve
                  </button>
                  <button type="button" onClick={() => void handleLockPeriod()} className={`${am.btnSecondary} bg-amber-50 text-amber-800 border-amber-200`} disabled={saving}>
                    <Lock size={14} /> Lock Attendance
                  </button>
                </div>
              </div>

              {dailyLoading ? (
                <AcademicLoading label="Loading attendance grid…" />
              ) : (
                <div className={am.tableWrap}>
                  <table className="w-full min-w-[1100px]">
                    <thead>
                      <tr>
                        <th className={am.th}>Code</th>
                        <th className={am.th}>Employee</th>
                        <th className={am.th}>Dept</th>
                        <th className={am.th}>Status</th>
                        <th className={am.th}>In Time</th>
                        <th className={am.th}>Out Time</th>
                        <th className={am.th}>OT (hrs)</th>
                        <th className={am.th}>Remarks</th>
                        <th className={am.th}>Approval</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyRows.map((row) => (
                        <tr key={row.employeeId} className="hover:bg-slate-50/80">
                          <td className={`${am.td} font-mono text-[10px]`}>{row.employeeCode}</td>
                          <td className={`${am.td} text-xs font-medium`}>{row.employeeName}</td>
                          <td className={`${am.td} text-[10px]`}>{row.department}</td>
                          <td className={am.td}>
                            <select
                              className={`${am.select} text-[10px] py-1 min-w-[120px]`}
                              value={row.status}
                              disabled={dailyIsLocked}
                              onChange={(e) => updateDailyRow(row.employeeId, { status: e.target.value })}
                            >
                              {(meta?.statuses ?? []).map((s) => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                              ))}
                            </select>
                          </td>
                          <td className={am.td}>
                            <input
                              type="time"
                              className={`${am.input} text-[10px] py-1 w-24`}
                              value={row.inTime}
                              disabled={dailyIsLocked}
                              onChange={(e) => updateDailyRow(row.employeeId, { inTime: e.target.value })}
                            />
                          </td>
                          <td className={am.td}>
                            <input
                              type="time"
                              className={`${am.input} text-[10px] py-1 w-24`}
                              value={row.outTime}
                              disabled={dailyIsLocked}
                              onChange={(e) => updateDailyRow(row.employeeId, { outTime: e.target.value })}
                            />
                          </td>
                          <td className={am.td}>
                            <input
                              type="number"
                              step="0.5"
                              className={`${am.input} text-[10px] py-1 w-16`}
                              value={row.overtimeHours}
                              disabled={dailyIsLocked}
                              onChange={(e) => updateDailyRow(row.employeeId, { overtimeHours: Number(e.target.value) })}
                            />
                          </td>
                          <td className={am.td}>
                            <input
                              className={`${am.input} text-[10px] py-1 min-w-[100px]`}
                              value={row.remarks}
                              disabled={dailyIsLocked}
                              onChange={(e) => updateDailyRow(row.employeeId, { remarks: e.target.value })}
                            />
                          </td>
                          <td className={am.td}>
                            <StatusBadge status={row.approvalStatus} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── Monthly Register ─── */}
        {tab === 'Monthly Register' && (
          <div className="space-y-4 mt-4">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600">Year</label>
                <select className={am.select} value={regYear} onChange={(e) => setRegYear(Number(e.target.value))}>
                  {[regYear - 1, regYear, regYear + 1].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Month</label>
                <select className={am.select} value={regMonth} onChange={(e) => setRegMonth(Number(e.target.value))}>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {new Date(2000, m - 1).toLocaleString('en', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>
              <button type="button" onClick={() => void loadMonthly()} className={`${am.btnSecondary} self-end`}>
                <RefreshCcw size={14} /> Load
              </button>
              <span className="text-xs text-slate-500 self-end">Working days: {monthlyWorkingDays}</span>
            </div>

            {monthlyLoading ? (
              <AcademicLoading label="Loading monthly register…" />
            ) : (
              <div className={am.tableWrap}>
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className={am.th}>Employee</th>
                      <th className={am.th}>Code</th>
                      <th className={am.th}>Department</th>
                      <th className={`${am.th} text-right`}>Working Days</th>
                      <th className={`${am.th} text-right`}>Present</th>
                      <th className={`${am.th} text-right`}>Leave</th>
                      <th className={`${am.th} text-right`}>LWP</th>
                      <th className={`${am.th} text-right`}>OT Hours</th>
                      <th className={`${am.th} text-right`}>Late</th>
                      <th className={`${am.th} text-right`}>Salary Days</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyRows.map((row) => (
                      <tr
                        key={String(row.employeeId)}
                        className="hover:bg-blue-50/50 cursor-pointer"
                        onClick={() => void openEmployeeCard(String(row.employeeId))}
                      >
                        <td className={`${am.td} font-medium text-blue-700`}>{String(row.employeeName)}</td>
                        <td className={`${am.td} font-mono text-xs`}>{String(row.employeeCode)}</td>
                        <td className={am.td}>{String(row.department)}</td>
                        <td className={`${am.td} text-right tabular-nums`}>{String(row.workingDays)}</td>
                        <td className={`${am.td} text-right tabular-nums text-green-700`}>{String(row.present)}</td>
                        <td className={`${am.td} text-right tabular-nums`}>{String(row.leave)}</td>
                        <td className={`${am.td} text-right tabular-nums text-red-600`}>{String(row.lwp)}</td>
                        <td className={`${am.td} text-right tabular-nums`}>{String(row.otHours)}</td>
                        <td className={`${am.td} text-right tabular-nums`}>{String(row.late)}</td>
                        <td className={`${am.td} text-right tabular-nums font-semibold`}>{String(row.salaryDays)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ─── Corrections ─── */}
        {tab === 'Corrections' && (
          <div className="space-y-4 mt-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <h3 className="text-sm font-bold text-slate-800 mb-3">New Correction Request</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600">Employee</label>
                  <select
                    className={`${am.select} w-full`}
                    value={correctionForm.employeeId}
                    onChange={(e) => setCorrectionForm((f) => ({ ...f, employeeId: e.target.value }))}
                  >
                    <option value="">Select employee…</option>
                    {(meta?.employees ?? []).map((e) => (
                      <option key={e.id} value={e.id}>{e.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Date</label>
                  <input
                    type="date"
                    className={am.input}
                    value={correctionForm.attendanceDate}
                    onChange={(e) => setCorrectionForm((f) => ({ ...f, attendanceDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Original In / Out</label>
                  <div className="flex gap-1">
                    <input type="time" className={am.input} value={correctionForm.originalInTime} onChange={(e) => setCorrectionForm((f) => ({ ...f, originalInTime: e.target.value }))} />
                    <input type="time" className={am.input} value={correctionForm.originalOutTime} onChange={(e) => setCorrectionForm((f) => ({ ...f, originalOutTime: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Corrected In / Out</label>
                  <div className="flex gap-1">
                    <input type="time" className={am.input} value={correctionForm.correctedInTime} onChange={(e) => setCorrectionForm((f) => ({ ...f, correctedInTime: e.target.value }))} />
                    <input type="time" className={am.input} value={correctionForm.correctedOutTime} onChange={(e) => setCorrectionForm((f) => ({ ...f, correctedOutTime: e.target.value }))} />
                  </div>
                </div>
                <div className="md:col-span-2 xl:col-span-3">
                  <label className="text-xs font-semibold text-slate-600">Reason</label>
                  <input className={am.input} value={correctionForm.reason} onChange={(e) => setCorrectionForm((f) => ({ ...f, reason: e.target.value }))} placeholder="Reason for correction…" />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => void handleCreateCorrection()}
                    className={am.btnPrimary}
                    disabled={saving || !correctionForm.employeeId || !correctionForm.reason.trim()}
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    Submit Request
                  </button>
                </div>
              </div>
            </div>

            {correctionsLoading ? (
              <AcademicLoading label="Loading corrections…" />
            ) : (
              <div className={am.tableWrap}>
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className={am.th}>Employee</th>
                      <th className={am.th}>Date</th>
                      <th className={am.th}>Original</th>
                      <th className={am.th}>Corrected</th>
                      <th className={am.th}>Reason</th>
                      <th className={am.th}>Status</th>
                      <th className={am.th}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {corrections.map((row) => (
                      <tr key={String(row.id)} className="hover:bg-slate-50/80">
                        <td className={am.td}>
                          <p className="text-xs font-medium">{String(row.employeeName)}</p>
                          <p className="text-[10px] text-slate-500 font-mono">{String(row.employeeCode)}</p>
                        </td>
                        <td className={am.td}>{String(row.attendanceDate)}</td>
                        <td className={`${am.td} text-xs`}>
                          {String(row.originalInTime)} – {String(row.originalOutTime)}
                        </td>
                        <td className={`${am.td} text-xs`}>
                          {String(row.correctedInTime)} – {String(row.correctedOutTime)}
                        </td>
                        <td className={`${am.td} text-xs max-w-[200px] truncate`}>{String(row.reason)}</td>
                        <td className={am.td}>
                          <StatusBadge status={String(row.workflowStatus)} />
                        </td>
                        <td className={am.td}>
                          {row.workflowStatus !== 'APPROVED' && row.workflowStatus !== 'REJECTED' && (
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => void handleCorrectionAction(String(row.id), 'approve')}
                                className="p-1 text-green-600 hover:bg-green-50 rounded"
                                title="Approve"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleCorrectionAction(String(row.id), 'reject')}
                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                                title="Reject"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {dashboard && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <h3 className="text-sm font-bold text-slate-800 mb-2">Correction Workflow</h3>
                <WorkflowDiagram steps={dashboard.correctionWorkflow} />
              </div>
            )}
          </div>
        )}

        {/* ─── Payroll Mapping ─── */}
        {tab === 'Payroll Mapping' && (
          <div className="space-y-4 mt-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[240px]">
                <label className="text-xs font-semibold text-slate-600">Employee</label>
                <select className={`${am.select} w-full`} value={payrollEmployeeId} onChange={(e) => setPayrollEmployeeId(e.target.value)}>
                  {(meta?.employees ?? []).map((e) => (
                    <option key={e.id} value={e.id}>{e.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Year / Month</label>
                <div className="flex gap-1">
                  <select className={am.select} value={regYear} onChange={(e) => setRegYear(Number(e.target.value))}>
                    {[regYear - 1, regYear, regYear + 1].map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <select className={am.select} value={regMonth} onChange={(e) => setRegMonth(Number(e.target.value))}>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>{new Date(2000, m - 1).toLocaleString('en', { month: 'short' })}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button type="button" onClick={() => void loadPayrollPreview()} className={am.btnPrimary}>
                <RefreshCcw size={14} /> Calculate
              </button>
            </div>

            {payrollLoading ? (
              <AcademicLoading label="Calculating payroll preview…" />
            ) : payrollPreview ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                  <h3 className="text-sm font-bold text-slate-800 mb-1">
                    Payroll Formula — {payrollPreview.employee.fullName}
                  </h3>
                  <p className="text-[10px] text-slate-500 mb-3 font-mono">{payrollPreview.employee.employeeCode}</p>
                  <VerticalSteps
                    steps={payrollPreview.formula.map((f) => f.step)}
                    values={payrollPreview.formula}
                  />
                </div>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                  <h3 className="text-sm font-bold text-slate-800 mb-3">Payroll Mapping</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(payrollPreview.payrollMapping).map(([key, val]) => (
                      <div key={key} className="border border-slate-100 rounded-lg px-3 py-2 bg-slate-50/50">
                        <p className="text-[9px] font-bold text-slate-500 uppercase">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </p>
                        <p className="text-sm font-bold text-slate-800 tabular-nums mt-0.5">
                          {typeof val === 'number' && key.toLowerCase().includes('allowance')
                            ? formatInr(val)
                            : String(val)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-8">Select an employee and click Calculate</p>
            )}
          </div>
        )}

        {/* ─── Biometric ─── */}
        {tab === 'Biometric' && (
          <div className="space-y-4 mt-4">
            {biometricLoading ? (
              <AcademicLoading label="Loading biometric devices…" />
            ) : biometric ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                    <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                      <Fingerprint size={16} className="text-blue-600" /> Supported Vendors
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {biometric.supportedVendors.map((v) => (
                        <span key={v} className="px-2.5 py-1 bg-blue-50 text-blue-800 text-[10px] font-semibold rounded-full border border-blue-100">
                          {v}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                    <h3 className="text-sm font-bold text-slate-800 mb-3">Attendance Modes</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {biometric.supportedModes.map((m) => (
                        <span key={m} className="px-2.5 py-1 bg-indigo-50 text-indigo-800 text-[10px] font-semibold rounded-full border border-indigo-100">
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                  <h3 className="text-sm font-bold text-slate-800 mb-3">Device Functions</h3>
                  <div className="flex flex-wrap gap-2">
                    {biometric.functions.map((fn) => (
                      <button key={fn} type="button" className={`${am.btnSecondary} bg-white text-xs`}>
                        {fn}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={am.tableWrap}>
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className={am.th}>Device Name</th>
                        <th className={am.th}>Device ID</th>
                        <th className={am.th}>Campus</th>
                        <th className={am.th}>Branch</th>
                        <th className={am.th}>IP Address</th>
                        <th className={am.th}>Vendor</th>
                        <th className={am.th}>Type</th>
                        <th className={am.th}>Sync</th>
                        <th className={am.th}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {biometric.devices.map((d) => (
                        <tr key={String(d.id)} className="hover:bg-slate-50/80">
                          <td className={`${am.td} font-medium`}>{String(d.deviceName)}</td>
                          <td className={`${am.td} font-mono text-xs`}>{String(d.deviceId)}</td>
                          <td className={am.td}>{String(d.campus)}</td>
                          <td className={am.td}>{String(d.branch)}</td>
                          <td className={`${am.td} font-mono text-xs`}>{String(d.ipAddress)}</td>
                          <td className={am.td}>{String(d.vendor)}</td>
                          <td className={am.td}>{String(d.deviceType)}</td>
                          <td className={am.td}>
                            <span className={`text-[10px] font-bold ${d.syncStatus === 'Synced' ? 'text-green-700' : 'text-amber-700'}`}>
                              {String(d.syncStatus)}
                            </span>
                          </td>
                          <td className={am.td}>
                            <StatusBadge status={String(d.status)} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-400 text-center py-8">No biometric data available</p>
            )}
          </div>
        )}

        {/* ─── Shifts & Rules ─── */}
        {tab === 'Shifts & Rules' && meta && (
          <div className="space-y-4 mt-4">
            <div className={am.tableWrap}>
              <table className="w-full">
                <thead>
                  <tr>
                    <th className={am.th}>Code</th>
                    <th className={am.th}>Shift Name</th>
                    <th className={am.th}>Start</th>
                    <th className={am.th}>End</th>
                    <th className={am.th}>Break (min)</th>
                    <th className={am.th}>Grace (min)</th>
                    <th className={am.th}>Weekly Off</th>
                    <th className={am.th}>Night</th>
                    <th className={am.th}>Flexible</th>
                    <th className={am.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {meta.shifts.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/80">
                      <td className={`${am.td} font-mono text-xs font-bold`}>{s.code}</td>
                      <td className={`${am.td} font-medium`}>{s.name}</td>
                      <td className={am.td}>{s.startTime}</td>
                      <td className={am.td}>{s.endTime}</td>
                      <td className={`${am.td} text-right tabular-nums`}>{s.breakMinutes}</td>
                      <td className={`${am.td} text-right tabular-nums`}>{s.graceMinutes}</td>
                      <td className={`${am.td} text-xs`}>{s.weeklyOff.join(', ')}</td>
                      <td className={am.td}>{s.isNightShift ? '✓' : '—'}</td>
                      <td className={am.td}>{s.isFlexible ? '✓' : '—'}</td>
                      <td className={am.td}><StatusBadge status={s.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <h3 className="text-sm font-bold text-slate-800 mb-3">Late / Early / Attendance Rules</h3>
                <div className="space-y-2">
                  {['lateRule', 'earlyExitRule', 'halfDayRule', 'missingPunchRule', 'overtimeRule', 'nightShiftRule'].map((key) => (
                    <div key={key} className="flex justify-between gap-2 text-xs border-b border-slate-100 pb-2">
                      <span className="font-semibold text-slate-600 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                      <span className="text-slate-800 text-right max-w-[60%]">{String(settingsForm[key] ?? '—')}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <h3 className="text-sm font-bold text-slate-800 mb-3">Holiday Mapping</h3>
                <div className="space-y-2">
                  {HOLIDAY_TOGGLES.map((toggle) => (
                    <label key={toggle.key} className="flex items-center justify-between gap-2 text-xs cursor-pointer">
                      <span className="font-semibold text-slate-700">{toggle.label}</span>
                      <input
                        type="checkbox"
                        checked={Boolean(settingsForm[toggle.key])}
                        onChange={(e) => setSettingsForm((f) => ({ ...f, [toggle.key]: e.target.checked }))}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600"
                      />
                    </label>
                  ))}
                </div>
                <button type="button" onClick={() => void handleSaveSettings()} className={`${am.btnPrimary} mt-4`} disabled={settingsSaving}>
                  {settingsSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Save Holiday Mapping
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Settings ─── */}
        {tab === 'Settings' && (
          <div className="space-y-4 mt-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Settings size={16} className="text-slate-600" /> Attendance Settings
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {[
                  { key: 'officeStartTime', label: 'Office Start Time', type: 'time' },
                  { key: 'officeEndTime', label: 'Office End Time', type: 'time' },
                  { key: 'graceMinutes', label: 'Grace Minutes', type: 'number' },
                  { key: 'monthlyAllowedLate', label: 'Monthly Allowed Late', type: 'number' },
                  { key: 'payrollCutoffDate', label: 'Payroll Cutoff Date', type: 'number' },
                  { key: 'attendanceLockDate', label: 'Attendance Lock Date', type: 'number' },
                  { key: 'biometricSyncMinutes', label: 'Biometric Sync (min)', type: 'number' },
                  { key: 'halfDayRule', label: 'Half Day Rule', type: 'text' },
                  { key: 'lateRule', label: 'Late Rule', type: 'text' },
                  { key: 'earlyExitRule', label: 'Early Exit Rule', type: 'text' },
                  { key: 'missingPunchRule', label: 'Missing Punch Rule', type: 'text' },
                  { key: 'nightShiftRule', label: 'Night Shift Rule', type: 'text' },
                  { key: 'overtimeRule', label: 'Overtime Rule', type: 'text' },
                  { key: 'holidayRule', label: 'Holiday Rule', type: 'text' },
                  { key: 'weeklyOffRule', label: 'Weekly Off Rule', type: 'text' },
                  { key: 'autoLwpRules', label: 'Auto LWP Rules', type: 'text' },
                  { key: 'deductionRules', label: 'Deduction Rules', type: 'text' },
                ].map((field) => (
                  <div key={field.key}>
                    <label className="text-xs font-semibold text-slate-600">{field.label}</label>
                    <input
                      type={field.type}
                      className={am.input}
                      value={String(settingsForm[field.key] ?? '')}
                      onChange={(e) =>
                        setSettingsForm((f) => ({
                          ...f,
                          [field.key]: field.type === 'number' ? e.target.value : e.target.value,
                        }))
                      }
                    />
                  </div>
                ))}

                {HOLIDAY_TOGGLES.map((toggle) => (
                  <div key={toggle.key} className="flex items-center gap-2 pt-5">
                    <input
                      type="checkbox"
                      id={toggle.key}
                      checked={Boolean(settingsForm[toggle.key])}
                      onChange={(e) => setSettingsForm((f) => ({ ...f, [toggle.key]: e.target.checked }))}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600"
                    />
                    <label htmlFor={toggle.key} className="text-xs font-semibold text-slate-700">{toggle.label}</label>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => meta && setSettingsForm(settingsToForm(meta.settings))} className={am.btnSecondary}>
                  Reset
                </button>
                <button type="button" onClick={() => void handleSaveSettings()} className={am.btnPrimary} disabled={settingsSaving}>
                  {settingsSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Employee attendance card modal */}
      <AcademicModal
        open={employeeCardOpen}
        onClose={() => { setEmployeeCardOpen(false); setEmployeeCard(null); }}
        title="Employee Attendance Card"
      >
        {employeeCardLoading ? (
          <AcademicLoading label="Loading employee card…" />
        ) : employeeCard ? (
          <div className="space-y-4">
            {(() => {
              const emp = employeeCard.employee as { fullName: string; employeeCode: string; department: string; designation: string };
              const summary = employeeCard.summary as Record<string, number>;
              const calendar = (employeeCard.calendar as Array<Record<string, unknown>>) ?? [];
              return (
                <>
                  <div className="flex flex-wrap gap-4">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{emp.fullName}</p>
                      <p className="text-xs text-slate-500 font-mono">{emp.employeeCode} · {emp.department}</p>
                      <p className="text-[10px] text-slate-400">{emp.designation}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(summary).map(([k, v]) => (
                        <div key={k} className="px-2 py-1 bg-slate-50 rounded border border-slate-100 text-center">
                          <p className="text-[9px] font-bold text-slate-500 uppercase">{k.replace(/([A-Z])/g, ' $1')}</p>
                          <p className="text-sm font-bold text-slate-800">{v}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500">
                          <th className="px-2 py-1.5 text-left">Date</th>
                          <th className="px-2 py-1.5 text-left">Status</th>
                          <th className="px-2 py-1.5 text-left">In</th>
                          <th className="px-2 py-1.5 text-left">Out</th>
                          <th className="px-2 py-1.5 text-right">Hours</th>
                          <th className="px-2 py-1.5 text-right">OT</th>
                        </tr>
                      </thead>
                      <tbody>
                        {calendar.map((day) => (
                          <tr key={String(day.date)} className="border-t border-slate-100">
                            <td className="px-2 py-1">{String(day.date)}</td>
                            <td className="px-2 py-1">{String(day.statusLabel)}</td>
                            <td className="px-2 py-1">{String(day.inTime) || '—'}</td>
                            <td className="px-2 py-1">{String(day.outTime) || '—'}</td>
                            <td className="px-2 py-1 text-right tabular-nums">{String(day.workingHours)}</td>
                            <td className="px-2 py-1 text-right tabular-nums">{String(day.overtimeHours)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              );
            })()}
          </div>
        ) : (
          <p className="text-sm text-slate-400">No data available</p>
        )}
      </AcademicModal>
    </AcademicPageShell>
  );
}
