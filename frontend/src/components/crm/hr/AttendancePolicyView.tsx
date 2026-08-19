import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarDays,
  Check,
  ChevronDown,
  ClipboardList,
  Loader2,
  RefreshCcw,
  Save,
  Search,
  Settings2,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  assignLeavePolicy,
  fetchAttendancePolicy,
  removeLeavePolicyAssignment,
  updateAttendancePolicy,
  type AttendancePolicyDashboard,
} from '../../../lib/hrServices';
import {
  am,
  AcademicLoading,
  AcademicPageHeader,
  AcademicPageShell,
  StatusBadge,
} from '../FeeFinanceManagement/FeeFinanceUi';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function RuleToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 rounded" />
      <div>
        <p className="text-xs font-bold text-slate-800">{label}</p>
        {description && <p className="text-[10px] text-slate-500 mt-0.5">{description}</p>}
      </div>
    </label>
  );
}

function EmployeeMultiSelect({
  employees,
  selectedIds,
  onChange,
}: {
  employees: Array<{ id: string; employeeCode: string; fullName: string; department: string }>;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);

  useEffect(() => {
    const onDoc = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter(
      (e) =>
        e.fullName.toLowerCase().includes(q) ||
        e.employeeCode.toLowerCase().includes(q) ||
        e.department.toLowerCase().includes(q),
    );
  }, [employees, query]);

  const toggle = (id: string) => {
    onChange(selected.has(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  };

  const allVisibleSelected = filtered.length > 0 && filtered.every((e) => selected.has(e.id));
  const label =
    selectedIds.length === 0
      ? 'Select employees…'
      : selectedIds.length === 1
        ? (employees.find((e) => e.id === selectedIds[0])?.fullName ?? '1 employee selected')
        : `${selectedIds.length} employees selected`;

  return (
    <div ref={wrapRef} className="relative min-w-[220px] w-64">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`${am.input} w-full text-xs text-left flex items-center justify-between gap-2 ${
          selectedIds.length ? 'text-slate-800' : 'text-slate-400'
        }`}
      >
        <span className="truncate">{label}</span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-[min(100vw-2rem,22rem)] right-0 sm:right-auto sm:left-0 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b border-slate-100 space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, code or department…"
                className={`${am.input} pl-8 text-xs py-1.5`}
                autoFocus
              />
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <button
                type="button"
                className="font-semibold text-blue-600 hover:underline"
                onClick={() => {
                  const ids = filtered.map((e) => e.id);
                  if (allVisibleSelected) {
                    onChange(selectedIds.filter((id) => !ids.includes(id)));
                  } else {
                    onChange([...new Set([...selectedIds, ...ids])]);
                  }
                }}
              >
                {allVisibleSelected ? 'Clear visible' : 'Select all visible'}
              </button>
              <span className="text-slate-400">{selectedIds.length} selected</span>
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-slate-400">No employees match</p>
            ) : (
              filtered.map((emp) => {
                const checked = selected.has(emp.id);
                return (
                  <label
                    key={emp.id}
                    className="flex items-start gap-2 px-3 py-2 text-xs hover:bg-slate-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(emp.id)}
                      className="mt-0.5 rounded border-slate-300"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1 font-semibold text-slate-800">
                        {emp.fullName}
                        {checked && <Check className="w-3 h-3 text-blue-600 shrink-0" />}
                      </span>
                      <span className="block text-[10px] text-slate-400">
                        {emp.employeeCode} · {emp.department || '—'}
                      </span>
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function HolidayList({ title, items, color }: { title: string; items: Array<{ id: string; date: string; name: string }>; color: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className={`px-3 py-2 border-b border-slate-100 ${color}`}>
        <p className="text-xs font-bold">{title}</p>
        <p className="text-[10px] opacity-80">{items.length} holiday(s)</p>
      </div>
      <div className="max-h-40 overflow-y-auto divide-y divide-slate-50">
        {items.map((h) => (
          <div key={h.id} className="px-3 py-2 flex justify-between gap-2 text-xs">
            <span className="text-slate-700 truncate">{h.name}</span>
            <span className="text-slate-400 shrink-0 tabular-nums">{h.date}</span>
          </div>
        ))}
        {items.length === 0 && <p className="px-3 py-4 text-center text-slate-400 text-xs">None configured</p>}
      </div>
    </div>
  );
}

export function AttendancePolicyView() {
  const [data, setData] = useState<AttendancePolicyDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [selectedPolicyId, setSelectedPolicyId] = useState('');
  const [policyForm, setPolicyForm] = useState({
    description: '',
    effectiveFrom: '',
    applicableEmployeeTypes: '',
    applicableDepartments: '',
    applicableDesignations: '',
  });

  const [calendarName, setCalendarName] = useState('');
  const [workingDays, setWorkingDays] = useState<string[]>([]);
  const [weekendDays, setWeekendDays] = useState<string[]>([]);

  const [rules, setRules] = useState({
    carryForward: true,
    encashment: true,
    negativeBalance: false,
    autoApproval: false,
    managerApproval: true,
    lopCalculation: '',
  });

  const [assignEmployeeIds, setAssignEmployeeIds] = useState<string[]>([]);
  const [assignEffectiveDate, setAssignEffectiveDate] = useState(new Date().toISOString().slice(0, 10));

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchAttendancePolicy({ seed: true });
      setData(res);
      const policy = res.selectedPolicy ?? res.policies[0];
      if (policy) {
        setSelectedPolicyId(policy.id);
        setPolicyForm({
          description: policy.description,
          effectiveFrom: policy.effectiveFrom ?? '',
          applicableEmployeeTypes: policy.applicableTo.employeeTypes.join(', '),
          applicableDepartments: policy.applicableTo.departments.join(', '),
          applicableDesignations: policy.applicableTo.designations.join(', '),
        });
      }
      setCalendarName(res.calendar.calendarName);
      setWorkingDays(res.calendar.workingDays);
      setWeekendDays(res.calendar.weekendDays);
      setRules({
        carryForward: res.rules.carryForward,
        encashment: res.rules.encashment,
        negativeBalance: res.rules.negativeBalance,
        autoApproval: res.rules.autoApproval,
        managerApproval: res.rules.managerApproval,
        lopCalculation: res.rules.lopCalculation,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load attendance policy');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedPolicy = useMemo(
    () => data?.policies.find((p) => p.id === selectedPolicyId) ?? data?.selectedPolicy ?? null,
    [data, selectedPolicyId],
  );

  const onPolicyChange = (id: string) => {
    setSelectedPolicyId(id);
    const policy = data?.policies.find((p) => p.id === id);
    if (policy) {
      setPolicyForm({
        description: policy.description,
        effectiveFrom: policy.effectiveFrom ?? '',
        applicableEmployeeTypes: policy.applicableTo.employeeTypes.join(', '),
        applicableDepartments: policy.applicableTo.departments.join(', '),
        applicableDesignations: policy.applicableTo.designations.join(', '),
      });
    }
  };

  const toggleDay = (day: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.includes(day) ? list.filter((d) => d !== day) : [...list, day]);
  };

  const handleSave = async () => {
    if (!selectedPolicyId) return;
    setSaving(true);
    setError('');
    try {
      const res = await updateAttendancePolicy({
        policyId: selectedPolicyId,
        policy: {
          description: policyForm.description,
          effectiveFrom: policyForm.effectiveFrom || null,
          applicableTo: {
            employeeTypes: policyForm.applicableEmployeeTypes.split(',').map((s) => s.trim()).filter(Boolean),
            departments: policyForm.applicableDepartments.split(',').map((s) => s.trim()).filter(Boolean),
            designations: policyForm.applicableDesignations.split(',').map((s) => s.trim()).filter(Boolean),
            campuses: selectedPolicy?.applicableTo.campuses ?? [],
            branches: selectedPolicy?.applicableTo.branches ?? [],
          },
        },
        calendar: { calendarName, workingDays, weekendDays },
        rules: {
          carryForward: rules.carryForward,
          encashment: rules.encashment,
          negativeBalance: rules.negativeBalance,
          autoApproval: rules.autoApproval,
          managerApproval: rules.managerApproval,
          lopCalculation: rules.lopCalculation,
        },
      });
      setData(res);
      setMessage('Attendance policy saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedPolicyId || assignEmployeeIds.length === 0) {
      setError('Select a policy and at least one employee');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await assignLeavePolicy({
        policyId: selectedPolicyId,
        employeeIds: assignEmployeeIds,
        effectiveDate: assignEffectiveDate,
      });
      const incoming = res.assignments?.length ? res.assignments : res.assignment ? [res.assignment] : [];
      setData((prev) => {
        if (!prev) return prev;
        const incomingEmp = new Set(incoming.map((a) => a.employeeId));
        return {
          ...prev,
          assignments: [...incoming, ...prev.assignments.filter((a) => !incomingEmp.has(a.employeeId))],
          policies: prev.policies.map((p) =>
            p.id === selectedPolicyId
              ? {
                  ...p,
                  assignmentCount: new Set([
                    ...prev.assignments.filter((a) => a.policyId === p.id && !incomingEmp.has(a.employeeId)).map((a) => a.employeeId),
                    ...incoming.map((a) => a.employeeId),
                  ]).size,
                }
              : p,
          ),
        };
      });
      setAssignEmployeeIds([]);
      const count = res.assigned || incoming.length;
      setMessage(
        count === 1
          ? `Policy assigned to ${incoming[0]?.employeeName || 'employee'}`
          : `Policy assigned to ${count} employees`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Assignment failed');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveAssignment = async (id: string) => {
    if (!confirm('Remove this policy assignment?')) return;
    try {
      await removeLeavePolicyAssignment(id);
      setData((prev) => (prev ? { ...prev, assignments: prev.assignments.filter((a) => a.id !== id) } : prev));
      setMessage('Assignment removed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Remove failed');
    }
  };

  if (loading && !data) {
    return (
      <AcademicPageShell>
        <AcademicLoading label="Loading attendance policy…" />
      </AcademicPageShell>
    );
  }

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="HR & Payroll Management › Attendance Policy"
        title="Attendance Policy"
        subtitle={data?.purpose ?? 'Payroll leave calculations'}
        actions={
          <div className="flex gap-2">
            <button type="button" onClick={() => void load()} className={am.btnSecondary}>
              <RefreshCcw className="w-3.5 h-3.5" />
              Refresh
            </button>
            <button type="button" onClick={() => void handleSave()} disabled={saving} className={am.btnPrimary}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save Policy
            </button>
          </div>
        }
      />

      {error && <div className="mx-4 md:mx-6 mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}
      {message && <div className="mx-4 md:mx-6 mb-3 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">{message}</div>}

      <div className={`${am.content} space-y-5`}>
        {/* 1. Leave Policy */}
        <section className={`${am.card} ${am.cardPad}`}>
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
            <ClipboardList className="w-4 h-4 text-indigo-600" />
            Leave Policy
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-600">Assign Policy</span>
              <select value={selectedPolicyId} onChange={(e) => onPolicyChange(e.target.value)} className={am.input}>
                {data?.policies.map((p) => (
                  <option key={p.id} value={p.id}>{p.policyCode} — {p.name}</option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-600">Effective Date</span>
              <input type="date" value={policyForm.effectiveFrom} onChange={(e) => setPolicyForm({ ...policyForm, effectiveFrom: e.target.value })} className={am.input} />
            </label>
            <label className="block space-y-1 md:col-span-2">
              <span className="text-xs font-semibold text-slate-600">Policy Details</span>
              <textarea value={policyForm.description} onChange={(e) => setPolicyForm({ ...policyForm, description: e.target.value })} rows={2} className={am.input} placeholder="Policy description for payroll leave calculations" />
            </label>
            <label className="block space-y-1 md:col-span-2">
              <span className="text-xs font-semibold text-slate-600">Applicable To — Employee Types</span>
              <input value={policyForm.applicableEmployeeTypes} onChange={(e) => setPolicyForm({ ...policyForm, applicableEmployeeTypes: e.target.value })} placeholder="Permanent, Probation" className={am.input} />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-600">Departments</span>
              <input value={policyForm.applicableDepartments} onChange={(e) => setPolicyForm({ ...policyForm, applicableDepartments: e.target.value })} placeholder="Academics, Admin" className={am.input} />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-600">Designations</span>
              <input value={policyForm.applicableDesignations} onChange={(e) => setPolicyForm({ ...policyForm, applicableDesignations: e.target.value })} placeholder="Teacher, Accountant" className={am.input} />
            </label>
          </div>
          {selectedPolicy && (
            <p className="text-[10px] text-slate-500 mt-3">
              {selectedPolicy.assignmentCount} employee(s) assigned · Status: <StatusBadge status={selectedPolicy.status} />
            </p>
          )}
        </section>

        {/* 2. Holiday Calendar */}
        <section className={`${am.card} ${am.cardPad}`}>
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
            <CalendarDays className="w-4 h-4 text-amber-600" />
            Holiday Calendar
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            <label className="block space-y-1 lg:col-span-3">
              <span className="text-xs font-semibold text-slate-600">Calendar</span>
              <input value={calendarName} onChange={(e) => setCalendarName(e.target.value)} className={am.input} />
            </label>
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-2">Working Days</p>
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAYS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDay(d, workingDays, setWorkingDays)}
                    className={`px-2 py-1 rounded text-[10px] font-bold border ${
                      workingDays.includes(d) ? 'bg-green-100 border-green-300 text-green-800' : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}
                  >
                    {d.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-2">Weekend</p>
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAYS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDay(d, weekendDays, setWeekendDays)}
                    className={`px-2 py-1 rounded text-[10px] font-bold border ${
                      weekendDays.includes(d) ? 'bg-slate-200 border-slate-400 text-slate-800' : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}
                  >
                    {d.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>
            <div className="text-xs text-slate-500 space-y-1">
              <p><strong>Rule:</strong> {data?.calendar.holidayRule}</p>
              <p><strong>Weekly Off:</strong> {data?.calendar.weeklyOffRule}</p>
              <p><strong>Total holidays:</strong> {data?.calendar.totalHolidays}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <HolidayList title="Gazetted Holidays" items={data?.calendar.gazettedHolidays ?? []} color="bg-red-50 text-red-800" />
            <HolidayList title="Restricted Holidays" items={data?.calendar.restrictedHolidays ?? []} color="bg-amber-50 text-amber-800" />
            <HolidayList title="Branch Holidays" items={data?.calendar.branchHolidays ?? []} color="bg-blue-50 text-blue-800" />
          </div>
        </section>

        {/* 3. Leave Types */}
        <section className={`${am.card} overflow-hidden`}>
          <div className="px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Users className="w-4 h-4 text-green-600" />
              Leave Types
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase text-[10px]">
                  <th className="text-left px-4 py-2 font-bold">Code</th>
                  <th className="text-left px-4 py-2 font-bold">Leave Type</th>
                  <th className="text-right px-4 py-2 font-bold">Annual Allocation</th>
                  <th className="text-center px-4 py-2 font-bold">Paid</th>
                  <th className="text-center px-4 py-2 font-bold">Carry Forward</th>
                  <th className="text-center px-4 py-2 font-bold">Encashment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(data?.leaveTypes ?? []).map((lt) => (
                  <tr key={String(lt.code)} className="hover:bg-slate-50/60">
                    <td className="px-4 py-2.5 font-mono font-semibold">{String(lt.code)}</td>
                    <td className="px-4 py-2.5">{String(lt.name ?? lt.code)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{Number(lt.annualAllocation ?? 0)}</td>
                    <td className="px-4 py-2.5 text-center">{lt.paid ? '✓' : '—'}</td>
                    <td className="px-4 py-2.5 text-center">{lt.carryForwardAllowed ? '✓' : '—'}</td>
                    <td className="px-4 py-2.5 text-center">{lt.encashmentAllowed ? '✓' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 4. Rules */}
        <section className={`${am.card} ${am.cardPad}`}>
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
            <Settings2 className="w-4 h-4 text-purple-600" />
            Rules
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <RuleToggle label="Carry Forward" description="Allow unused leave to carry to next year" checked={rules.carryForward} onChange={(v) => setRules({ ...rules, carryForward: v })} />
            <RuleToggle label="Encashment" description="Allow leave encashment at year end" checked={rules.encashment} onChange={(v) => setRules({ ...rules, encashment: v })} />
            <RuleToggle label="Negative Balance" description="Allow leave beyond available balance" checked={rules.negativeBalance} onChange={(v) => setRules({ ...rules, negativeBalance: v })} />
            <RuleToggle label="Auto Approval" description="Auto-approve eligible leave requests" checked={rules.autoApproval} onChange={(v) => setRules({ ...rules, autoApproval: v })} />
            <RuleToggle label="Manager Approval" description="Require manager sign-off on leave" checked={rules.managerApproval} onChange={(v) => setRules({ ...rules, managerApproval: v })} />
            <label className="block space-y-1 sm:col-span-2 lg:col-span-3">
              <span className="text-xs font-semibold text-slate-600">LOP Calculation</span>
              <input value={rules.lopCalculation} onChange={(e) => setRules({ ...rules, lopCalculation: e.target.value })} className={am.input} placeholder="Per day salary ÷ working days × LOP days" />
            </label>
          </div>
        </section>

        {/* 5. Employee Assignment */}
        <section className={`${am.card} overflow-hidden`}>
          <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-blue-600" />
              Employee Assignment
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              <EmployeeMultiSelect
                employees={data?.employees ?? []}
                selectedIds={assignEmployeeIds}
                onChange={setAssignEmployeeIds}
              />
              <input type="date" value={assignEffectiveDate} onChange={(e) => setAssignEffectiveDate(e.target.value)} className={`${am.input} w-36 text-xs`} />
              <button type="button" onClick={() => void handleAssign()} disabled={saving || assignEmployeeIds.length === 0} className={am.btnPrimary}>
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                Assign{assignEmployeeIds.length ? ` (${assignEmployeeIds.length})` : ''}
              </button>
            </div>
          </div>
          {assignEmployeeIds.length > 0 && (
            <div className="px-4 py-2 border-b border-slate-100 flex flex-wrap items-center gap-1.5">
              {assignEmployeeIds.map((id) => {
                const emp = data?.employees.find((e) => e.id === id);
                if (!emp) return null;
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 text-[10px] font-semibold border border-blue-100"
                  >
                    {emp.fullName}
                    <button
                      type="button"
                      onClick={() => setAssignEmployeeIds((prev) => prev.filter((x) => x !== id))}
                      className="text-blue-500 hover:text-blue-800"
                      aria-label={`Remove ${emp.fullName}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                );
              })}
              <button
                type="button"
                onClick={() => setAssignEmployeeIds([])}
                className="text-[10px] font-semibold text-slate-500 hover:text-slate-800 ml-1"
              >
                Clear all
              </button>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase text-[10px]">
                  <th className="text-left px-4 py-2 font-bold">Employee</th>
                  <th className="text-left px-4 py-2 font-bold">Department</th>
                  <th className="text-left px-4 py-2 font-bold">Policy</th>
                  <th className="text-left px-4 py-2 font-bold">Effective Date</th>
                  <th className="text-left px-4 py-2 font-bold">Status</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data?.assignments.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-2.5">
                      <p className="font-semibold text-slate-800">{a.employeeName}</p>
                      <p className="text-[10px] text-slate-400">{a.employeeCode}</p>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{a.department}</td>
                    <td className="px-4 py-2.5">
                      <p className="font-medium">{a.policyName}</p>
                      <p className="text-[10px] text-slate-400">{a.policyCode}</p>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{a.effectiveDate}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={a.status} /></td>
                    <td className="px-4 py-2.5">
                      <button type="button" onClick={() => void handleRemoveAssignment(a.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {!data?.assignments.length && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No employee assignments yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AcademicPageShell>
  );
}
