import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Banknote,
  Check,
  FileText,
  Plus,
  RefreshCcw,
  Settings2,
  X,
} from 'lucide-react';
import {
  cancelPayrollSlip,
  createPayrollEmployee,
  createPayrollSalaryStructure,
  formatInr,
  generatePayrollSlips,
  getPayrollStatutoryConfig,
  getPayrollStatutoryReport,
  getPayrollSummary,
  listPayrollEmployees,
  listPayrollSalaryStructures,
  listPayrollSlips,
  markPayrollSlipPaid,
  previewPayrollSalaryStructure,
  updatePayrollStatutoryConfig,
  type PayrollEmployee,
  type PayrollEmploymentType,
  type PayrollSalaryStructure,
  type PayrollSlip,
  type PayrollStatutoryConfig,
  type PayrollStatutoryReport,
  type PayrollSummary,
  type SalaryPreview,
} from '../../../lib/feeFinanceServices';
import {
  AcademicLoading,
  AcademicModal,
  AcademicPageHeader,
  AcademicPageShell,
  am,
  EmptyState,
  FeeMessage,
  FeeTabs,
  StatusBadge,
} from './FeeFinanceUi';

const EMPLOYMENT_LABELS: Record<PayrollEmploymentType, string> = {
  TEACHING: 'Teaching',
  NON_TEACHING: 'Non-Teaching',
  ADMIN: 'Admin',
  SUPPORT: 'Support',
};

function currentPayPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const emptyEmployeeForm = {
  employeeCode: '',
  fullName: '',
  employmentType: 'TEACHING' as PayrollEmploymentType,
  department: '',
  designation: '',
  mobile: '',
  email: '',
  joinDate: '',
  bankAccount: '',
  bankIfsc: '',
  panNumber: '',
  uanNumber: '',
  pfNumber: '',
  esicNumber: '',
  epfApplicable: true,
  esicApplicable: true,
  remarks: '',
};

const emptyStructureForm = {
  employeeId: '',
  effectiveFrom: new Date().toISOString().slice(0, 10),
  basicSalary: '',
  hra: '',
  da: '',
  specialAllowance: '',
  conveyanceAllowance: '',
  otherAllowances: '',
  tds: '',
  otherDeductions: '',
  remarks: '',
};

export function PayrollView() {
  const [tab, setTab] = useState('Employees');
  const [payPeriod, setPayPeriod] = useState(currentPayPeriod());
  const [employees, setEmployees] = useState<PayrollEmployee[]>([]);
  const [structures, setStructures] = useState<PayrollSalaryStructure[]>([]);
  const [slips, setSlips] = useState<PayrollSlip[]>([]);
  const [summary, setSummary] = useState<PayrollSummary | null>(null);
  const [statutory, setStatutory] = useState<PayrollStatutoryConfig | null>(null);
  const [statutoryReport, setStatutoryReport] = useState<PayrollStatutoryReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [showEmpModal, setShowEmpModal] = useState(false);
  const [empForm, setEmpForm] = useState(emptyEmployeeForm);

  const [showStructModal, setShowStructModal] = useState(false);
  const [structForm, setStructForm] = useState(emptyStructureForm);
  const [preview, setPreview] = useState<SalaryPreview | null>(null);

  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [genForm, setGenForm] = useState({
    payPeriod: currentPayPeriod(),
    workingDays: '30',
    presentDays: '30',
  });

  const [showSlipModal, setShowSlipModal] = useState<PayrollSlip | null>(null);
  const [statForm, setStatForm] = useState({
    epfEmployeePercent: '12',
    epfEmployerPercent: '12',
    epfWageCeiling: '15000',
    esicEmployeePercent: '0.75',
    esicEmployerPercent: '3.25',
    esicWageCeiling: '21000',
    professionalTaxAmount: '200',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [emps, structs, slipRows, sum, config] = await Promise.all([
        listPayrollEmployees(),
        listPayrollSalaryStructures(),
        listPayrollSlips({ payPeriod }),
        getPayrollSummary(payPeriod),
        getPayrollStatutoryConfig(),
      ]);
      setEmployees(emps);
      setStructures(structs);
      setSlips(slipRows);
      setSummary(sum);
      setStatutory(config);
      setStatForm({
        epfEmployeePercent: String(config.epfEmployeePercent),
        epfEmployerPercent: String(config.epfEmployerPercent),
        epfWageCeiling: String(config.epfWageCeiling),
        esicEmployeePercent: String(config.esicEmployeePercent),
        esicEmployerPercent: String(config.esicEmployerPercent),
        esicWageCeiling: String(config.esicWageCeiling),
        professionalTaxAmount: String(config.professionalTaxAmount),
      });
      if (tab === 'EPF & ESIC') {
        try {
          setStatutoryReport(await getPayrollStatutoryReport(payPeriod));
        } catch {
          setStatutoryReport(null);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load payroll');
    } finally {
      setLoading(false);
    }
  }, [payPeriod, tab]);

  useEffect(() => {
    void load();
  }, [load]);

  const activeEmployees = useMemo(
    () => employees.filter((e) => e.status === 'ACTIVE'),
    [employees],
  );

  const refreshPreview = async (form = structForm) => {
    if (!form.employeeId && !form.basicSalary) {
      setPreview(null);
      return;
    }
    try {
      const p = await previewPayrollSalaryStructure({
        employeeId: form.employeeId || undefined,
        basicSalary: Number(form.basicSalary) || 0,
        hra: Number(form.hra) || 0,
        da: Number(form.da) || 0,
        specialAllowance: Number(form.specialAllowance) || 0,
        conveyanceAllowance: Number(form.conveyanceAllowance) || 0,
        otherAllowances: Number(form.otherAllowances) || 0,
        tds: Number(form.tds) || 0,
        otherDeductions: Number(form.otherDeductions) || 0,
      });
      setPreview(p);
    } catch {
      setPreview(null);
    }
  };

  const handleCreateEmployee = async () => {
    setError('');
    try {
      const record = await createPayrollEmployee({
        employeeCode: empForm.employeeCode.trim() || undefined,
        fullName: empForm.fullName.trim(),
        employmentType: empForm.employmentType,
        department: empForm.department.trim() || undefined,
        designation: empForm.designation.trim() || undefined,
        mobile: empForm.mobile.trim() || undefined,
        email: empForm.email.trim() || undefined,
        joinDate: empForm.joinDate || undefined,
        bankAccount: empForm.bankAccount.trim() || undefined,
        bankIfsc: empForm.bankIfsc.trim() || undefined,
        panNumber: empForm.panNumber.trim() || undefined,
        uanNumber: empForm.uanNumber.trim() || undefined,
        pfNumber: empForm.pfNumber.trim() || undefined,
        esicNumber: empForm.esicNumber.trim() || undefined,
        epfApplicable: empForm.epfApplicable,
        esicApplicable: empForm.esicApplicable,
        remarks: empForm.remarks.trim() || undefined,
      });
      setMessage(`Employee ${record.employeeCode} created`);
      setShowEmpModal(false);
      setEmpForm(emptyEmployeeForm);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create employee failed');
    }
  };

  const handleCreateStructure = async () => {
    setError('');
    try {
      const record = await createPayrollSalaryStructure({
        employeeId: structForm.employeeId,
        effectiveFrom: structForm.effectiveFrom,
        basicSalary: Number(structForm.basicSalary) || 0,
        hra: Number(structForm.hra) || 0,
        da: Number(structForm.da) || 0,
        specialAllowance: Number(structForm.specialAllowance) || 0,
        conveyanceAllowance: Number(structForm.conveyanceAllowance) || 0,
        otherAllowances: Number(structForm.otherAllowances) || 0,
        tds: Number(structForm.tds) || 0,
        otherDeductions: Number(structForm.otherDeductions) || 0,
        remarks: structForm.remarks.trim() || undefined,
      });
      setMessage(`Salary structure ${record.structureCode} created for ${record.employeeName}`);
      setShowStructModal(false);
      setStructForm(emptyStructureForm);
      setPreview(null);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create structure failed');
    }
  };

  const handleGenerate = async () => {
    setError('');
    try {
      const result = await generatePayrollSlips({
        payPeriod: genForm.payPeriod,
        workingDays: Number(genForm.workingDays) || 30,
        presentDays: Number(genForm.presentDays) || Number(genForm.workingDays) || 30,
      });
      setPayPeriod(genForm.payPeriod);
      setMessage(
        `${result.message}${result.skipped.length ? ` · ${result.skipped.length} skipped` : ''}`,
      );
      setShowGenerateModal(false);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generate slips failed');
    }
  };

  const handleSaveStatutory = async () => {
    setError('');
    try {
      const res = await updatePayrollStatutoryConfig({
        epfEmployeePercent: Number(statForm.epfEmployeePercent),
        epfEmployerPercent: Number(statForm.epfEmployerPercent),
        epfWageCeiling: Number(statForm.epfWageCeiling),
        esicEmployeePercent: Number(statForm.esicEmployeePercent),
        esicEmployerPercent: Number(statForm.esicEmployerPercent),
        esicWageCeiling: Number(statForm.esicWageCeiling),
        professionalTaxAmount: Number(statForm.professionalTaxAmount),
      });
      setMessage(res.message);
      setStatutory(res.config);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update statutory rates failed');
    }
  };

  const runSlipAction = async (action: 'pay' | 'cancel', id: string) => {
    setError('');
    try {
      if (action === 'pay') {
        const res = await markPayrollSlipPaid(id);
        setMessage(res.message);
      } else {
        const res = await cancelPayrollSlip(id);
        setMessage(res.message);
      }
      setShowSlipModal(null);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    }
  };

  if (loading && !employees.length && !summary) {
    return <AcademicLoading label="Loading payroll…" />;
  }

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="Fees & Finance › Payroll"
        title="Payroll"
        subtitle="Employee salary structures, monthly payroll slips, and EPF / ESIC statutory processing"
        actions={
          <>
            <input
              type="month"
              value={payPeriod}
              onChange={(e) => setPayPeriod(e.target.value)}
              className={am.select}
            />
            <button type="button" onClick={() => void load()} className={am.btnSecondary}>
              <RefreshCcw size={14} /> Refresh
            </button>
            {tab === 'Employees' && (
              <button
                type="button"
                onClick={() => {
                  setEmpForm(emptyEmployeeForm);
                  setShowEmpModal(true);
                }}
                className={am.btnPrimary}
              >
                <Plus size={14} /> Add Employee
              </button>
            )}
            {tab === 'Salary Structure' && (
              <button
                type="button"
                onClick={() => {
                  setStructForm(emptyStructureForm);
                  setPreview(null);
                  setShowStructModal(true);
                }}
                className={am.btnPrimary}
              >
                <Plus size={14} /> Create Structure
              </button>
            )}
            {tab === 'Payroll Slips' && (
              <button
                type="button"
                onClick={() => {
                  setGenForm({
                    payPeriod,
                    workingDays: '30',
                    presentDays: '30',
                  });
                  setShowGenerateModal(true);
                }}
                className={am.btnPrimary}
              >
                <FileText size={14} /> Generate Slips
              </button>
            )}
          </>
        }
      />

      <div className={am.content}>
        {message && <FeeMessage message={message} type="success" />}
        {error && <FeeMessage message={error} type="error" />}

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className={`${am.card} ${am.cardPad}`}>
            <p className="text-[10px] text-slate-500 font-bold uppercase">Active Staff</p>
            <p className="text-xl font-bold text-slate-900 mt-1">{summary?.employeeCount ?? 0}</p>
          </div>
          <div className={`${am.card} ${am.cardPad}`}>
            <p className="text-[10px] text-slate-500 font-bold uppercase">Salary Structures</p>
            <p className="text-xl font-bold text-slate-900 mt-1">{summary?.structureCount ?? 0}</p>
          </div>
          <div className={`${am.card} ${am.cardPad}`}>
            <p className="text-[10px] text-slate-500 font-bold uppercase">Period Gross</p>
            <p className="text-xl font-bold text-slate-900 mt-1">{formatInr(summary?.totalGross ?? 0)}</p>
          </div>
          <div className={`${am.card} ${am.cardPad}`}>
            <p className="text-[10px] text-slate-500 font-bold uppercase">Period Net</p>
            <p className="text-xl font-bold text-green-700 mt-1">{formatInr(summary?.totalNet ?? 0)}</p>
          </div>
          <div className={`${am.card} ${am.cardPad}`}>
            <p className="text-[10px] text-slate-500 font-bold uppercase">EPF (EE+ER)</p>
            <p className="text-xl font-bold text-amber-700 mt-1">{formatInr(summary?.totalEpf ?? 0)}</p>
          </div>
          <div className={`${am.card} ${am.cardPad}`}>
            <p className="text-[10px] text-slate-500 font-bold uppercase">ESIC (EE+ER)</p>
            <p className="text-xl font-bold text-indigo-700 mt-1">{formatInr(summary?.totalEsic ?? 0)}</p>
          </div>
        </div>

        <FeeTabs
          tabs={['Employees', 'Salary Structure', 'Payroll Slips', 'EPF & ESIC']}
          active={tab}
          onChange={setTab}
        />

        {loading ? (
          <AcademicLoading />
        ) : tab === 'Employees' ? (
          employees.length === 0 ? (
            <EmptyState>No employees yet. Add teaching / non-teaching staff to start payroll.</EmptyState>
          ) : (
            <div className={am.tableWrap}>
              <table className="w-full">
                <thead>
                  <tr>
                    <th className={am.th}>Code</th>
                    <th className={am.th}>Name</th>
                    <th className={am.th}>Type</th>
                    <th className={am.th}>Dept / Designation</th>
                    <th className={am.th}>UAN / PF / ESIC</th>
                    <th className={am.th}>Statutory</th>
                    <th className={am.th}>Active Net</th>
                    <th className={am.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/80">
                      <td className={`${am.td} font-mono text-xs`}>{row.employeeCode}</td>
                      <td className={`${am.td} font-semibold`}>{row.fullName}</td>
                      <td className={am.td}>
                        <span className="text-[10px] font-bold uppercase text-slate-600">
                          {EMPLOYMENT_LABELS[row.employmentType]}
                        </span>
                      </td>
                      <td className={am.td}>
                        <div>{row.department}</div>
                        <div className="text-[11px] text-slate-500">{row.designation}</div>
                      </td>
                      <td className={`${am.td} text-[11px] text-slate-600`}>
                        <div>UAN: {row.uanNumber || '—'}</div>
                        <div>PF: {row.pfNumber || '—'}</div>
                        <div>ESIC: {row.esicNumber || '—'}</div>
                      </td>
                      <td className={am.td}>
                        <div className="flex flex-wrap gap-1">
                          {row.epfApplicable && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800">EPF</span>
                          )}
                          {row.esicApplicable && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-800">ESIC</span>
                          )}
                        </div>
                      </td>
                      <td className={am.td}>
                        {row.hasActiveStructure ? formatInr(row.activeNet) : (
                          <span className="text-amber-600 text-xs">No structure</span>
                        )}
                      </td>
                      <td className={am.td}><StatusBadge status={row.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : tab === 'Salary Structure' ? (
          structures.length === 0 ? (
            <EmptyState>No salary structures yet. Create one against an employee.</EmptyState>
          ) : (
            <div className={am.tableWrap}>
              <table className="w-full">
                <thead>
                  <tr>
                    <th className={am.th}>Code</th>
                    <th className={am.th}>Employee</th>
                    <th className={am.th}>Effective</th>
                    <th className={am.th}>Basic</th>
                    <th className={am.th}>Gross</th>
                    <th className={am.th}>EPF EE</th>
                    <th className={am.th}>ESIC EE</th>
                    <th className={am.th}>Net</th>
                    <th className={am.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {structures.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/80">
                      <td className={`${am.td} font-mono text-xs`}>{row.structureCode}</td>
                      <td className={am.td}>
                        <div className="font-semibold">{row.employeeName}</div>
                        <div className="text-[11px] text-slate-500">{row.employeeCode} · {row.designation}</div>
                      </td>
                      <td className={`${am.td} text-xs`}>{row.effectiveFrom}</td>
                      <td className={am.td}>{formatInr(row.basicSalary)}</td>
                      <td className={am.td}>{formatInr(row.grossSalary)}</td>
                      <td className={am.td}>{formatInr(row.epfEmployee)}</td>
                      <td className={am.td}>{formatInr(row.esicEmployee)}</td>
                      <td className={`${am.td} font-semibold text-green-700`}>{formatInr(row.netSalary)}</td>
                      <td className={am.td}><StatusBadge status={row.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : tab === 'Payroll Slips' ? (
          slips.length === 0 ? (
            <EmptyState>
              No payroll slips for {payPeriod}. Click Generate Slips to create monthly payslips from active salary structures.
            </EmptyState>
          ) : (
            <div className={am.tableWrap}>
              <table className="w-full">
                <thead>
                  <tr>
                    <th className={am.th}>Slip No</th>
                    <th className={am.th}>Employee</th>
                    <th className={am.th}>Period</th>
                    <th className={am.th}>Days</th>
                    <th className={am.th}>Gross</th>
                    <th className={am.th}>Deductions</th>
                    <th className={am.th}>Net Pay</th>
                    <th className={am.th}>Status</th>
                    <th className={am.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {slips.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/80">
                      <td className={`${am.td} font-mono text-xs`}>{row.slipNumber}</td>
                      <td className={am.td}>
                        <div className="font-semibold">{row.employeeName}</div>
                        <div className="text-[11px] text-slate-500">{row.employeeCode}</div>
                      </td>
                      <td className={am.td}>{row.payPeriodLabel}</td>
                      <td className={`${am.td} text-xs`}>{row.presentDays}/{row.workingDays}</td>
                      <td className={am.td}>{formatInr(row.grossEarnings)}</td>
                      <td className={am.td}>{formatInr(row.totalDeductions)}</td>
                      <td className={`${am.td} font-semibold text-green-700`}>{formatInr(row.netPay)}</td>
                      <td className={am.td}><StatusBadge status={row.status} /></td>
                      <td className={am.td}>
                        <div className="flex flex-wrap gap-1">
                          <button
                            type="button"
                            onClick={() => setShowSlipModal(row)}
                            className={`${am.btnSecondary} text-[10px] py-1 px-2`}
                          >
                            View
                          </button>
                          {row.status === 'GENERATED' && (
                            <button
                              type="button"
                              onClick={() => void runSlipAction('pay', row.id)}
                              className={`${am.btnSecondary} text-[10px] py-1 px-2 text-green-700`}
                            >
                              <Check size={10} /> Mark Paid
                            </button>
                          )}
                          {(row.status === 'DRAFT' || row.status === 'GENERATED') && (
                            <button
                              type="button"
                              onClick={() => void runSlipAction('cancel', row.id)}
                              className={`${am.btnSecondary} text-[10px] py-1 px-2 text-red-700`}
                            >
                              <X size={10} /> Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <div className="space-y-4">
            <div className={`${am.card} ${am.cardPad} space-y-3`}>
              <div className="flex items-center gap-2">
                <Settings2 size={16} className="text-amber-700" />
                <h3 className="text-sm font-bold text-slate-800">Statutory Rates (EPF / ESIC / PT)</h3>
              </div>
              <p className="text-xs text-slate-500">
                Defaults follow common Indian payroll rules: EPF on PF wages (Basic+DA) capped at wage ceiling;
                ESIC on gross when gross ≤ wage ceiling. Employer contributions are tracked separately and do not reduce net pay.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {(
                  [
                    ['epfEmployeePercent', 'EPF Employee %'],
                    ['epfEmployerPercent', 'EPF Employer %'],
                    ['epfWageCeiling', 'EPF Wage Ceiling ₹'],
                    ['professionalTaxAmount', 'Professional Tax ₹'],
                    ['esicEmployeePercent', 'ESIC Employee %'],
                    ['esicEmployerPercent', 'ESIC Employer %'],
                    ['esicWageCeiling', 'ESIC Wage Ceiling ₹'],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key}>
                    <label className="text-xs font-semibold text-slate-600">{label}</label>
                    <input
                      type="number"
                      step="any"
                      className={am.input}
                      value={statForm[key]}
                      onChange={(e) => setStatForm((f) => ({ ...f, [key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-end">
                <button type="button" onClick={() => void handleSaveStatutory()} className={am.btnPrimary}>
                  Save Statutory Rates
                </button>
              </div>
              {statutory && (
                <p className="text-[11px] text-slate-400">
                  Last updated by {statutory.updatedBy || '—'} · {new Date(statutory.updatedAt).toLocaleString()}
                </p>
              )}
            </div>

            <div className={`${am.card} ${am.cardPad}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Banknote size={16} className="text-indigo-700" />
                  <h3 className="text-sm font-bold text-slate-800">
                    EPF / ESIC Contribution Report — {payPeriod}
                  </h3>
                </div>
                <button
                  type="button"
                  className={am.btnSecondary}
                  onClick={async () => {
                    try {
                      setStatutoryReport(await getPayrollStatutoryReport(payPeriod));
                    } catch (e) {
                      setError(e instanceof Error ? e.message : 'Failed to load report');
                    }
                  }}
                >
                  Refresh Report
                </button>
              </div>

              {!statutoryReport || statutoryReport.rows.length === 0 ? (
                <EmptyState>No generated/paid slips for this period. Generate payroll slips first.</EmptyState>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <div className="bg-amber-50 rounded-lg px-3 py-2">
                      <p className="text-[10px] font-bold text-amber-800 uppercase">EPF Total</p>
                      <p className="text-lg font-bold text-amber-900">{formatInr(statutoryReport.totals.epfTotal)}</p>
                      <p className="text-[10px] text-amber-700">
                        EE {formatInr(statutoryReport.totals.epfEmployee)} · ER {formatInr(statutoryReport.totals.epfEmployer)}
                      </p>
                    </div>
                    <div className="bg-indigo-50 rounded-lg px-3 py-2">
                      <p className="text-[10px] font-bold text-indigo-800 uppercase">ESIC Total</p>
                      <p className="text-lg font-bold text-indigo-900">{formatInr(statutoryReport.totals.esicTotal)}</p>
                      <p className="text-[10px] text-indigo-700">
                        EE {formatInr(statutoryReport.totals.esicEmployee)} · ER {formatInr(statutoryReport.totals.esicEmployer)}
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-lg px-3 py-2">
                      <p className="text-[10px] font-bold text-slate-600 uppercase">Professional Tax</p>
                      <p className="text-lg font-bold text-slate-900">{formatInr(statutoryReport.totals.professionalTax)}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg px-3 py-2">
                      <p className="text-[10px] font-bold text-green-800 uppercase">Gross Wages</p>
                      <p className="text-lg font-bold text-green-900">{formatInr(statutoryReport.totals.gross)}</p>
                    </div>
                  </div>
                  <div className={am.tableWrap}>
                    <table className="w-full">
                      <thead>
                        <tr>
                          <th className={am.th}>Employee</th>
                          <th className={am.th}>UAN / PF</th>
                          <th className={am.th}>ESIC No</th>
                          <th className={am.th}>Gross</th>
                          <th className={am.th}>EPF EE</th>
                          <th className={am.th}>EPF ER</th>
                          <th className={am.th}>ESIC EE</th>
                          <th className={am.th}>ESIC ER</th>
                          <th className={am.th}>PT</th>
                        </tr>
                      </thead>
                      <tbody>
                        {statutoryReport.rows.map((row) => (
                          <tr key={row.slipNumber} className="hover:bg-slate-50/80">
                            <td className={am.td}>
                              <div className="font-semibold">{row.employeeName}</div>
                              <div className="text-[11px] text-slate-500">{row.employeeCode}</div>
                            </td>
                            <td className={`${am.td} text-[11px]`}>
                              <div>{row.uanNumber || '—'}</div>
                              <div className="text-slate-500">{row.pfNumber || '—'}</div>
                            </td>
                            <td className={`${am.td} text-xs`}>{row.esicNumber || '—'}</td>
                            <td className={am.td}>{formatInr(row.grossEarnings)}</td>
                            <td className={am.td}>{formatInr(row.epfEmployee)}</td>
                            <td className={am.td}>{formatInr(row.epfEmployer)}</td>
                            <td className={am.td}>{formatInr(row.esicEmployee)}</td>
                            <td className={am.td}>{formatInr(row.esicEmployer)}</td>
                            <td className={am.td}>{formatInr(row.professionalTax)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Employee Modal */}
      <AcademicModal open={showEmpModal} onClose={() => setShowEmpModal(false)} title="Add Employee / Staff" large>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">Full Name *</label>
              <input
                className={am.input}
                value={empForm.fullName}
                onChange={(e) => setEmpForm((f) => ({ ...f, fullName: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Employee Code</label>
              <input
                className={am.input}
                value={empForm.employeeCode}
                onChange={(e) => setEmpForm((f) => ({ ...f, employeeCode: e.target.value }))}
                placeholder="Auto if blank"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">Employment Type</label>
              <select
                className={`${am.select} w-full`}
                value={empForm.employmentType}
                onChange={(e) =>
                  setEmpForm((f) => ({ ...f, employmentType: e.target.value as PayrollEmploymentType }))
                }
              >
                {Object.entries(EMPLOYMENT_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Department</label>
              <input
                className={am.input}
                value={empForm.department}
                onChange={(e) => setEmpForm((f) => ({ ...f, department: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Designation</label>
              <input
                className={am.input}
                value={empForm.designation}
                onChange={(e) => setEmpForm((f) => ({ ...f, designation: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">Join Date</label>
              <input
                type="date"
                className={am.input}
                value={empForm.joinDate}
                onChange={(e) => setEmpForm((f) => ({ ...f, joinDate: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Mobile</label>
              <input
                className={am.input}
                value={empForm.mobile}
                onChange={(e) => setEmpForm((f) => ({ ...f, mobile: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Email</label>
              <input
                className={am.input}
                value={empForm.email}
                onChange={(e) => setEmpForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">Bank Account</label>
              <input
                className={am.input}
                value={empForm.bankAccount}
                onChange={(e) => setEmpForm((f) => ({ ...f, bankAccount: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">IFSC</label>
              <input
                className={am.input}
                value={empForm.bankIfsc}
                onChange={(e) => setEmpForm((f) => ({ ...f, bankIfsc: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">PAN</label>
              <input
                className={am.input}
                value={empForm.panNumber}
                onChange={(e) => setEmpForm((f) => ({ ...f, panNumber: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">UAN</label>
              <input
                className={am.input}
                value={empForm.uanNumber}
                onChange={(e) => setEmpForm((f) => ({ ...f, uanNumber: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">PF Number</label>
              <input
                className={am.input}
                value={empForm.pfNumber}
                onChange={(e) => setEmpForm((f) => ({ ...f, pfNumber: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">ESIC Number</label>
              <input
                className={am.input}
                value={empForm.esicNumber}
                onChange={(e) => setEmpForm((f) => ({ ...f, esicNumber: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex gap-4 text-xs font-semibold text-slate-700">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={empForm.epfApplicable}
                onChange={(e) => setEmpForm((f) => ({ ...f, epfApplicable: e.target.checked }))}
              />
              EPF Applicable
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={empForm.esicApplicable}
                onChange={(e) => setEmpForm((f) => ({ ...f, esicApplicable: e.target.checked }))}
              />
              ESIC Applicable
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowEmpModal(false)} className={am.btnSecondary}>Cancel</button>
            <button
              type="button"
              onClick={() => void handleCreateEmployee()}
              className={am.btnPrimary}
              disabled={!empForm.fullName.trim()}
            >
              Save Employee
            </button>
          </div>
        </div>
      </AcademicModal>

      {/* Salary Structure Modal */}
      <AcademicModal
        open={showStructModal}
        onClose={() => setShowStructModal(false)}
        title="Create Salary Structure"
        large
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">Employee *</label>
              <select
                className={`${am.select} w-full`}
                value={structForm.employeeId}
                onChange={(e) => {
                  const next = { ...structForm, employeeId: e.target.value };
                  setStructForm(next);
                  void refreshPreview(next);
                }}
              >
                <option value="">Select employee</option>
                {activeEmployees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.employeeCode} — {e.fullName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Effective From *</label>
              <input
                type="date"
                className={am.input}
                value={structForm.effectiveFrom}
                onChange={(e) => setStructForm((f) => ({ ...f, effectiveFrom: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {(
              [
                ['basicSalary', 'Basic Salary *'],
                ['hra', 'HRA'],
                ['da', 'DA'],
                ['specialAllowance', 'Special Allowance'],
                ['conveyanceAllowance', 'Conveyance'],
                ['otherAllowances', 'Other Allowances'],
                ['tds', 'TDS'],
                ['otherDeductions', 'Other Deductions'],
              ] as const
            ).map(([key, label]) => (
              <div key={key}>
                <label className="text-xs font-semibold text-slate-600">{label}</label>
                <input
                  type="number"
                  className={am.input}
                  value={structForm[key]}
                  onChange={(e) => {
                    const next = { ...structForm, [key]: e.target.value };
                    setStructForm(next);
                    void refreshPreview(next);
                  }}
                />
              </div>
            ))}
          </div>

          {preview && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div><span className="text-slate-500">Gross</span><p className="font-bold">{formatInr(preview.grossSalary)}</p></div>
              <div><span className="text-slate-500">PF Wages</span><p className="font-bold">{formatInr(preview.pfWages)}</p></div>
              <div><span className="text-slate-500">EPF EE / ER</span><p className="font-bold">{formatInr(preview.epfEmployee)} / {formatInr(preview.epfEmployer)}</p></div>
              <div><span className="text-slate-500">ESIC EE / ER</span><p className="font-bold">{formatInr(preview.esicEmployee)} / {formatInr(preview.esicEmployer)}</p></div>
              <div><span className="text-slate-500">Prof. Tax</span><p className="font-bold">{formatInr(preview.professionalTax)}</p></div>
              <div><span className="text-slate-500">Total Ded.</span><p className="font-bold">{formatInr(preview.totalDeductions)}</p></div>
              <div className="md:col-span-2"><span className="text-slate-500">Net Salary</span><p className="font-bold text-green-700 text-sm">{formatInr(preview.netSalary)}</p></div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowStructModal(false)} className={am.btnSecondary}>Cancel</button>
            <button
              type="button"
              onClick={() => void handleCreateStructure()}
              className={am.btnPrimary}
              disabled={!structForm.employeeId || !structForm.basicSalary || Number(structForm.basicSalary) <= 0}
            >
              Save Structure
            </button>
          </div>
        </div>
      </AcademicModal>

      {/* Generate Slips Modal */}
      <AcademicModal open={showGenerateModal} onClose={() => setShowGenerateModal(false)} title="Generate Payroll Slips">
        <div className="space-y-3">
          <p className="text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
            Generates payslips for all active employees who have an active salary structure for the selected month.
            Amounts are prorated by present days / working days. EPF & ESIC follow each structure.
          </p>
          <div>
            <label className="text-xs font-semibold text-slate-600">Pay Period</label>
            <input
              type="month"
              className={am.input}
              value={genForm.payPeriod}
              onChange={(e) => setGenForm((f) => ({ ...f, payPeriod: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">Working Days</label>
              <input
                type="number"
                className={am.input}
                value={genForm.workingDays}
                onChange={(e) => setGenForm((f) => ({ ...f, workingDays: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Present Days (default)</label>
              <input
                type="number"
                className={am.input}
                value={genForm.presentDays}
                onChange={(e) => setGenForm((f) => ({ ...f, presentDays: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowGenerateModal(false)} className={am.btnSecondary}>Cancel</button>
            <button type="button" onClick={() => void handleGenerate()} className={am.btnPrimary}>
              Generate
            </button>
          </div>
        </div>
      </AcademicModal>

      {/* Slip Detail Modal */}
      <AcademicModal
        open={!!showSlipModal}
        onClose={() => setShowSlipModal(null)}
        title={showSlipModal ? `Payslip ${showSlipModal.slipNumber}` : 'Payslip'}
        large
      >
        {showSlipModal && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <p className="text-slate-500">Employee</p>
                <p className="font-bold">{showSlipModal.employeeName}</p>
                <p className="text-slate-500">{showSlipModal.employeeCode}</p>
              </div>
              <div>
                <p className="text-slate-500">Period</p>
                <p className="font-bold">{showSlipModal.payPeriodLabel}</p>
              </div>
              <div>
                <p className="text-slate-500">Department</p>
                <p className="font-bold">{showSlipModal.department}</p>
                <p className="text-slate-500">{showSlipModal.designation}</p>
              </div>
              <div>
                <p className="text-slate-500">Status</p>
                <StatusBadge status={showSlipModal.status} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-green-50 px-3 py-2 text-xs font-bold text-green-800 uppercase">Earnings</div>
                <div className="p-3 space-y-1.5 text-xs">
                  {[
                    ['Basic', showSlipModal.basicSalary],
                    ['HRA', showSlipModal.hra],
                    ['DA', showSlipModal.da],
                    ['Special Allowance', showSlipModal.specialAllowance],
                    ['Conveyance', showSlipModal.conveyanceAllowance],
                    ['Other Allowances', showSlipModal.otherAllowances],
                  ].map(([label, amt]) => (
                    <div key={String(label)} className="flex justify-between">
                      <span className="text-slate-600">{label}</span>
                      <span className="font-medium">{formatInr(Number(amt))}</span>
                    </div>
                  ))}
                  <div className="flex justify-between border-t pt-2 font-bold">
                    <span>Gross Earnings</span>
                    <span>{formatInr(showSlipModal.grossEarnings)}</span>
                  </div>
                </div>
              </div>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-red-50 px-3 py-2 text-xs font-bold text-red-800 uppercase">Deductions</div>
                <div className="p-3 space-y-1.5 text-xs">
                  {[
                    ['EPF (Employee)', showSlipModal.epfEmployee],
                    ['ESIC (Employee)', showSlipModal.esicEmployee],
                    ['Professional Tax', showSlipModal.professionalTax],
                    ['TDS', showSlipModal.tds],
                    ['Other Deductions', showSlipModal.otherDeductions],
                  ].map(([label, amt]) => (
                    <div key={String(label)} className="flex justify-between">
                      <span className="text-slate-600">{label}</span>
                      <span className="font-medium">{formatInr(Number(amt))}</span>
                    </div>
                  ))}
                  <div className="flex justify-between border-t pt-2 font-bold">
                    <span>Total Deductions</span>
                    <span>{formatInr(showSlipModal.totalDeductions)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs bg-slate-50 rounded-lg p-3">
              <div>
                <p className="text-slate-500">Net Pay</p>
                <p className="text-lg font-bold text-green-700">{formatInr(showSlipModal.netPay)}</p>
              </div>
              <div>
                <p className="text-slate-500">Employer EPF</p>
                <p className="font-bold">{formatInr(showSlipModal.epfEmployer)}</p>
              </div>
              <div>
                <p className="text-slate-500">Employer ESIC</p>
                <p className="font-bold">{formatInr(showSlipModal.esicEmployer)}</p>
              </div>
              <div>
                <p className="text-slate-500">Attendance</p>
                <p className="font-bold">{showSlipModal.presentDays} / {showSlipModal.workingDays} days</p>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowSlipModal(null)} className={am.btnSecondary}>Close</button>
              {showSlipModal.status === 'GENERATED' && (
                <button
                  type="button"
                  onClick={() => void runSlipAction('pay', showSlipModal.id)}
                  className={am.btnPrimary}
                >
                  Mark Paid
                </button>
              )}
            </div>
          </div>
        )}
      </AcademicModal>
    </AcademicPageShell>
  );
}
