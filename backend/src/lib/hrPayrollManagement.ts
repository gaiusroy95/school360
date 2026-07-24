import { FeeMasterStatus, PayrollSlipStatus, Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import {
  generatePayrollSlips,
  getPayrollSummary,
  listPayrollEmployees,
  listPayrollSlips,
} from './payroll.js';
import { seedHrLeaveManagementDemo } from './hrLeaveManagement.js';
import { seedHrAttendanceLeaveDemo } from './hrAttendanceLeave.js';
import { getInstitutionFilterMeta } from './students.js';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatDateIso(d: Date) {
  return d.toISOString().slice(0, 10);
}

function dayName(d: Date) {
  return d.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
}

function maskAccount(account: string) {
  if (!account || account.length < 4) return account || '—';
  return `XXXX${account.slice(-4)}`;
}

function parseProfileData(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === 'string' || typeof v === 'number') out[k] = String(v);
  }
  return out;
}

function currentPayPeriod() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function parsePayPeriod(payPeriod: string) {
  const m = payPeriod.match(/^(\d{4})-(\d{2})$/);
  if (!m) throw new Error('Invalid pay period');
  return { payYear: Number(m[1]), payMonth: Number(m[2]) };
}

export async function getHrPayrollEmployeeMaster(
  institutionId: string,
  employeeId: string,
  payPeriod?: string,
) {
  const period = payPeriod || currentPayPeriod();
  const { payYear, payMonth } = parsePayPeriod(period);

  const employee = await prisma.payrollEmployee.findFirst({
    where: { id: employeeId, institutionId },
    include: {
      salaryStructures: {
        where: { status: FeeMasterStatus.ACTIVE },
        orderBy: { effectiveFrom: 'desc' },
        take: 1,
      },
      slips: {
        where: { payPeriod: period },
        take: 1,
      },
      leaveBalances: { where: { academicYear: '2025-26' } },
    },
  });
  if (!employee) throw new Error('Employee not found');

  const profile = parseProfileData(employee.profileData);
  const structure = employee.salaryStructures[0];
  const slip = employee.slips[0];

  const earnings = structure
    ? [
        { name: 'Basic Salary', amount: structure.basicSalary, type: 'EARNING', taxable: true, pfApplicable: true },
        { name: 'HRA', amount: structure.hra, type: 'EARNING', taxable: true, pfApplicable: false },
        { name: 'DA', amount: structure.da, type: 'EARNING', taxable: true, pfApplicable: true },
        { name: 'Special Allowance', amount: structure.specialAllowance, type: 'EARNING', taxable: true, pfApplicable: false },
        { name: 'Conveyance', amount: structure.conveyanceAllowance, type: 'EARNING', taxable: false, pfApplicable: false },
        { name: 'Other Allowances', amount: structure.otherAllowances, type: 'EARNING', taxable: true, pfApplicable: false },
      ].filter((e) => e.amount > 0)
    : [];

  const deductions = structure
    ? [
        { name: 'PF (Employee)', amount: structure.epfEmployee, type: 'DEDUCTION' },
        { name: 'ESI (Employee)', amount: structure.esicEmployee, type: 'DEDUCTION' },
        { name: 'Professional Tax', amount: structure.professionalTax, type: 'DEDUCTION' },
        { name: 'TDS', amount: structure.tds, type: 'DEDUCTION' },
        { name: 'Other Deductions', amount: structure.otherDeductions, type: 'DEDUCTION' },
      ].filter((d) => d.amount > 0)
    : [];

  const leaveCards = [
    { code: 'CL', label: 'Casual Leave', color: 'purple' },
    { code: 'EL', label: 'Earned Leave', color: 'green' },
    { code: 'SL', label: 'Sick Leave', color: 'orange' },
    { code: 'CO', label: 'Comp Off', color: 'blue' },
  ].map((c) => {
    const bal = employee.leaveBalances.find((b) => b.leaveType === c.code);
    const entitled = bal?.annualAllocation ?? (c.code === 'CL' ? 12 : c.code === 'EL' ? 15 : c.code === 'SL' ? 10 : 0);
    const available = bal?.available ?? entitled;
    return { ...c, entitled, available };
  });

  const annualCtc = structure ? structure.grossSalary * 12 : 0;

  return {
    employee: {
      id: employee.id,
      employeeCode: employee.employeeCode,
      fullName: employee.fullName,
      designation: employee.designation,
      department: employee.department,
      employmentType: employee.employmentType,
      joinDate: employee.joinDate ? formatDateIso(employee.joinDate) : '—',
      payrollType: 'Monthly',
      bankAccount: maskAccount(employee.bankAccount),
      panNumber: employee.panNumber || profile.panNumber || '—',
      uanNumber: employee.uanNumber || '—',
      esiNumber: employee.esicNumber || '—',
      pfNumber: employee.pfNumber || '—',
      workLocation: profile.workLocation || 'Main Campus',
      annualCtc,
      basicSalary: structure?.basicSalary ?? 0,
      payGrade: profile.payGrade || 'Grade B',
      grade: profile.grade || '—',
      gender: profile.gender || '—',
      dob: profile.dob || '—',
      maritalStatus: profile.maritalStatus || '—',
      aadhaar: profile.aadhaar ? `XXXX XXXX ${profile.aadhaar.slice(-4)}` : '—',
      ifsc: employee.bankIfsc || '—',
      branch: profile.branch || 'Main Branch',
      costCenter: profile.costCenter || `CC-${employee.department.slice(0, 3).toUpperCase()}`,
      recruitmentSource: profile.recruitmentSource || 'Direct',
      employeeCategory: profile.employeeCategory || employee.employmentType,
      status: employee.status,
      createdAt: employee.createdAt.toISOString(),
      updatedAt: employee.updatedAt.toISOString(),
    },
    salarySummary: {
      basicSalary: structure?.basicSalary ?? 0,
      grossSalary: structure?.grossSalary ?? 0,
      totalEarnings: structure?.grossSalary ?? 0,
      totalDeductions: structure?.totalDeductions ?? 0,
      netSalary: structure?.netSalary ?? 0,
      payFrequency: 'Monthly',
      nextPayrollDate: `${payYear}-${String(payMonth).padStart(2, '0')}-28`,
      payrollStatus: slip?.status ?? (structure ? 'CONFIGURED' : 'PENDING_SETUP'),
      createdBy: structure?.createdBy || 'HR Admin',
      createdDate: structure?.createdAt.toISOString() ?? employee.createdAt.toISOString(),
      updatedBy: 'HR Admin',
      updatedDate: structure?.updatedAt.toISOString() ?? employee.updatedAt.toISOString(),
    },
    salaryStructure: {
      structureCode: structure?.structureCode ?? '—',
      structureName: structure ? `${employee.designation} Structure` : 'Not Assigned',
      effectiveFrom: structure ? formatDateIso(structure.effectiveFrom) : '—',
      annualCtc,
      monthlySalary: structure?.grossSalary ?? 0,
      payFrequency: 'Monthly',
      earnings,
      deductions,
      totalEarnings: structure?.grossSalary ?? 0,
      totalDeductions: structure?.totalDeductions ?? 0,
      netPay: structure?.netSalary ?? 0,
      components: [...earnings, ...deductions],
    },
    leaveSummary: leaveCards,
    currentSlip: slip
      ? {
          id: slip.id,
          slipNumber: slip.slipNumber,
          netPay: slip.netPay,
          status: slip.status,
          workingDays: slip.workingDays,
          presentDays: slip.presentDays,
          leaveDays: slip.leaveDays,
        }
      : null,
  };
}

export async function getHrPayrollDashboard(
  institutionId: string,
  opts: {
    employeeId?: string;
    payPeriod?: string;
    academicYear?: string;
    branch?: string;
    month?: number;
    year?: number;
    q?: string;
    page?: number;
    pageSize?: number;
  } = {},
) {
  const filters = await getInstitutionFilterMeta(institutionId);
  const academicYear = opts.academicYear || filters.defaultAcademicYear;
  const payPeriod = opts.payPeriod || currentPayPeriod();
  const { payYear, payMonth } = parsePayPeriod(payPeriod);
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, opts.pageSize ?? 10));

  const [allEmployees, summary, slips, holidays, draftCount] = await Promise.all([
    listPayrollEmployees(institutionId, { status: FeeMasterStatus.ACTIVE, q: opts.q }),
    getPayrollSummary(institutionId, payPeriod),
    listPayrollSlips(institutionId, { payPeriod }),
    prisma.holiday.findMany({
      where: {
        institutionId,
        date: { gte: new Date() },
      },
      orderBy: { date: 'asc' },
      take: 8,
    }),
    prisma.payrollSlip.count({
      where: { institutionId, payPeriod, status: PayrollSlipStatus.DRAFT },
    }),
  ]);

  const total = allEmployees.length;
  const start = (page - 1) * pageSize;
  const employeePage = allEmployees.slice(start, start + pageSize);

  const selectedId = opts.employeeId || employeePage[0]?.id;
  let selectedMaster = null;
  if (selectedId) {
    try {
      selectedMaster = await getHrPayrollEmployeeMaster(institutionId, selectedId, payPeriod);
    } catch {
      selectedMaster = null;
    }
  }

  const payRunRows = slips.map((s) => ({
    id: s.id,
    employeeCode: s.employeeCode,
    employeeName: s.employeeName,
    netPay: s.netPay,
    payDays: s.presentDays,
    lopDays: Math.max(0, s.workingDays - s.presentDays - s.leaveDays),
    status: s.status,
    statusLabel: s.status === PayrollSlipStatus.PAID ? 'Approved' : s.status === PayrollSlipStatus.GENERATED ? 'Approved' : 'Draft',
    slipNumber: s.slipNumber,
    department: s.department,
  }));

  const payslipPreview = selectedMaster?.currentSlip
    ? buildPayslipPreview(selectedMaster, payPeriod, payYear, payMonth)
    : selectedMaster
      ? buildPayslipPreviewFromStructure(selectedMaster, payPeriod, payYear, payMonth)
      : null;

  return {
    academicYear,
    branch: opts.branch || 'Main Branch',
    payPeriod,
    payPeriodLabel: `${MONTH_NAMES[payMonth - 1]} ${payYear}`,
    month: payMonth,
    year: payYear,
    summary: {
      totalEmployees: summary.employeeCount || total,
      processed: summary.generatedCount + summary.paidCount,
      pending: draftCount || Math.max(0, total - slips.length),
      grossSalary: summary.totalGross,
      netSalary: summary.totalNet,
      deductions: summary.totalDeductions,
    },
    employees: employeePage.map((e) => ({
      id: e.id,
      employeeCode: e.employeeCode,
      fullName: e.fullName,
      designation: e.designation,
      department: e.department,
      activeNet: e.activeNet,
      hasActiveStructure: e.hasActiveStructure,
    })),
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    selectedEmployeeId: selectedId ?? null,
    selectedEmployee: selectedMaster,
    upcomingHolidays: holidays.map((h) => ({
      id: h.id,
      date: formatDateIso(h.date),
      day: dayName(h.date),
      name: h.name,
      type: h.type,
    })),
    payRun: {
      month: payMonth,
      year: payYear,
      branch: opts.branch || 'Main Branch',
      rows: payRunRows,
      summary: {
        employees: payRunRows.length,
        approved: payRunRows.filter((r) => r.statusLabel === 'Approved').length,
        draft: payRunRows.filter((r) => r.statusLabel === 'Draft').length,
        totalNet: payRunRows.reduce((s, r) => s + r.netPay, 0),
      },
    },
    payslipGeneration: {
      payPeriod,
      employees: allEmployees.map((e) => ({ id: e.id, label: `${e.fullName} (${e.employeeCode})` })),
      payRuns: [{ value: payPeriod, label: `${MONTH_NAMES[payMonth - 1]} ${payYear}` }],
      options: {
        includeEarnings: true,
        includeDeductions: true,
        includeLeaveSummary: true,
        includeAttendanceSummary: true,
        includeCompanyDetails: true,
      },
      preview: payslipPreview,
      stats: {
        totalEmployees: allEmployees.length,
        generated: slips.filter((s) => s.status !== PayrollSlipStatus.DRAFT).length,
        pending: allEmployees.length - slips.length,
        failed: 0,
        netPay: summary.totalNet,
      },
    },
    subModules: [
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
    ],
  };
}

function buildPayslipPreview(
  master: Awaited<ReturnType<typeof getHrPayrollEmployeeMaster>>,
  payPeriod: string,
  payYear: number,
  payMonth: number,
) {
  const slip = master.currentSlip!;
  return {
    schoolName: 'Sunrise Public School',
    payPeriod: `${MONTH_NAMES[payMonth - 1]} ${payYear}`,
    employeeName: master.employee.fullName,
    employeeCode: master.employee.employeeCode,
    department: master.employee.department,
    designation: master.employee.designation,
    workingDays: slip.workingDays,
    presentDays: slip.presentDays,
    leaveDays: slip.leaveDays,
    earnings: master.salaryStructure.earnings,
    deductions: master.salaryStructure.deductions,
    grossEarnings: master.salaryStructure.totalEarnings,
    totalDeductions: master.salaryStructure.totalDeductions,
    netPay: slip.netPay,
    status: slip.status,
  };
}

function buildPayslipPreviewFromStructure(
  master: Awaited<ReturnType<typeof getHrPayrollEmployeeMaster>>,
  _payPeriod: string,
  payYear: number,
  payMonth: number,
) {
  return {
    schoolName: 'Sunrise Public School',
    payPeriod: `${MONTH_NAMES[payMonth - 1]} ${payYear}`,
    employeeName: master.employee.fullName,
    employeeCode: master.employee.employeeCode,
    department: master.employee.department,
    designation: master.employee.designation,
    workingDays: 30,
    presentDays: 30,
    leaveDays: 0,
    earnings: master.salaryStructure.earnings,
    deductions: master.salaryStructure.deductions,
    grossEarnings: master.salaryStructure.totalEarnings,
    totalDeductions: master.salaryStructure.totalDeductions,
    netPay: master.salaryStructure.netPay,
    status: 'DRAFT',
  };
}

export async function seedHrPayrollManagementDemo(institutionId: string) {
  await seedHrLeaveManagementDemo(institutionId);
  await seedHrAttendanceLeaveDemo(institutionId);

  const employees = await prisma.payrollEmployee.findMany({
    where: { institutionId, status: FeeMasterStatus.ACTIVE },
  });

  const rates = await prisma.payrollStatutoryConfig.findUnique({ where: { institutionId } });
  if (!rates) {
    await prisma.payrollStatutoryConfig.create({ data: { institutionId } });
  }

  const salaryTemplates = [
    { basic: 25000, hra: 10000, da: 5000, special: 8000, conveyance: 1600, other: 2000 },
    { basic: 18000, hra: 7200, da: 3600, special: 5000, conveyance: 1600, other: 1000 },
    { basic: 35000, hra: 14000, da: 7000, special: 12000, conveyance: 1600, other: 3000 },
    { basic: 15000, hra: 6000, da: 3000, special: 4000, conveyance: 1600, other: 800 },
  ];

  for (let i = 0; i < employees.length; i++) {
    const emp = employees[i];
    const tpl = salaryTemplates[i % salaryTemplates.length];
    const existing = await prisma.payrollSalaryStructure.findFirst({
      where: { institutionId, employeeId: emp.id, status: FeeMasterStatus.ACTIVE },
    });
    if (!existing) {
      const gross = tpl.basic + tpl.hra + tpl.da + tpl.special + tpl.conveyance + tpl.other;
      const pfWages = Math.min(tpl.basic + tpl.da, 15000);
      const epfEmployee = Math.round(pfWages * 0.12);
      const professionalTax = gross > 0 ? 200 : 0;
      const totalDeductions = epfEmployee + professionalTax;
      const net = gross - totalDeductions;
      const count = await prisma.payrollSalaryStructure.count({ where: { institutionId } });
      await prisma.payrollSalaryStructure.create({
        data: {
          institutionId,
          employeeId: emp.id,
          structureCode: `SAL${String(count + 1).padStart(4, '0')}`,
          effectiveFrom: new Date('2025-04-01'),
          basicSalary: tpl.basic,
          hra: tpl.hra,
          da: tpl.da,
          specialAllowance: tpl.special,
          conveyanceAllowance: tpl.conveyance,
          otherAllowances: tpl.other,
          grossSalary: gross,
          pfWages,
          epfEmployee,
          epfEmployer: epfEmployee,
          esicEmployee: 0,
          esicEmployer: 0,
          professionalTax,
          tds: 0,
          otherDeductions: 0,
          totalDeductions,
          netSalary: net,
          status: FeeMasterStatus.ACTIVE,
          createdBy: 'HR Admin',
        },
      });
    }

    await prisma.payrollEmployee.update({
      where: { id: emp.id },
      data: {
        profileData: {
          payGrade: i % 3 === 0 ? 'Grade A' : i % 3 === 1 ? 'Grade B' : 'Grade C',
          grade: `G${(i % 5) + 1}`,
          workLocation: 'Main Campus',
          branch: 'Main Branch',
          costCenter: `CC-${emp.department.slice(0, 3).toUpperCase()}`,
          gender: i % 2 === 0 ? 'Female' : 'Male',
          employeeCategory: emp.employmentType,
        },
      },
    });
  }

  const payPeriod = currentPayPeriod();
  const existingSlips = await prisma.payrollSlip.count({ where: { institutionId, payPeriod } });
  if (existingSlips === 0 && employees.length > 0) {
    await generatePayrollSlips(
      institutionId,
      { payPeriod, workingDays: 30, presentDays: 28 },
      'HR System',
    );
  }

  return getHrPayrollDashboard(institutionId, { payPeriod });
}

// Fix: getPayrollSummary signature - check payroll.ts
export async function approveHrPayRun(institutionId: string, payPeriod: string) {
  await prisma.payrollSlip.updateMany({
    where: { institutionId, payPeriod, status: PayrollSlipStatus.DRAFT },
    data: { status: PayrollSlipStatus.GENERATED },
  });
  return getHrPayrollDashboard(institutionId, { payPeriod });
}

export async function generateHrPayRun(
  institutionId: string,
  payPeriod: string,
  workingDays = 30,
  presentDays = 28,
) {
  const result = await generatePayrollSlips(
    institutionId,
    { payPeriod, workingDays, presentDays },
    'HR Admin',
  );
  return { ...result, dashboard: await getHrPayrollDashboard(institutionId, { payPeriod }) };
}
