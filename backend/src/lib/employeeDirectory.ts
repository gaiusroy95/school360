import { FeeMasterStatus, PayrollEmploymentType, Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { syncEmployeeToDepartment } from './employeeDepartmentSync.js';

export type EmployeeEducation = { degree: string; year: string; institution: string };
export type EmployeeExperience = { company: string; role: string; from: string; to: string };
export type EmployeeDocument = { name: string; fileName: string };
export type EmployeeFamilyMember = { relation: string; name: string; dob?: string };

export type EmployeeProfileData = {
  photoUrl?: string;
  school?: string;
  reportingTo?: string;
  workLocation?: string;
  probationEnds?: string;
  confirmationDate?: string;
  dateOfBirth?: string;
  gender?: string;
  maritalStatus?: string;
  bloodGroup?: string;
  nationality?: string;
  aadhaarNumber?: string;
  fatherName?: string;
  motherName?: string;
  spouseName?: string;
  personalEmail?: string;
  emergencyContact?: string;
  emergencyMobile?: string;
  presentAddress?: string;
  permanentAddress?: string;
  languagesKnown?: string;
  hobbies?: string;
  linkedIn?: string;
  idCardNumber?: string;
  subject?: string;
  classTeacher?: string;
  employmentStatus?: string;
  noticePeriod?: string;
  payScale?: string;
  bankName?: string;
  paymentMode?: string;
  professionalTaxNo?: string;
  marriageAnniversary?: string;
  contractEndDate?: string;
  education?: EmployeeEducation[];
  experience?: EmployeeExperience[];
  documents?: EmployeeDocument[];
  family?: EmployeeFamilyMember[];
  skills?: string[];
};

function employmentLabel(type: PayrollEmploymentType) {
  const map: Record<PayrollEmploymentType, string> = {
    TEACHING: 'Teaching',
    NON_TEACHING: 'Non Teaching',
    ADMIN: 'Admin',
    SUPPORT: 'Support',
  };
  return map[type] || type;
}

function parseProfile(raw: unknown): EmployeeProfileData {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return raw as EmployeeProfileData;
}

function formatDate(d: Date | null | undefined) {
  if (!d) return '';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const DEMO_PROFILE: EmployeeProfileData = {
  school: 'Sunrise International School',
  reportingTo: 'Mr. Amit Verma',
  workLocation: 'Main Campus',
  probationEnds: '2025-08-15',
  confirmationDate: '2025-09-01',
  dateOfBirth: '1988-04-12',
  gender: 'Male',
  maritalStatus: 'Married',
  bloodGroup: 'B+',
  nationality: 'Indian',
  aadhaarNumber: 'XXXX-XXXX-4521',
  fatherName: 'Mr. Ramesh Sharma',
  motherName: 'Mrs. Sunita Sharma',
  spouseName: 'Mrs. Priya Sharma',
  personalEmail: 'rahul.sharma.personal@gmail.com',
  emergencyContact: 'Mrs. Priya Sharma',
  emergencyMobile: '+91 98765 43210',
  presentAddress: '42, Green Park, New Delhi - 110016',
  permanentAddress: 'Village Rampur, Meerut, UP - 250001',
  languagesKnown: 'Hindi, English',
  hobbies: 'Reading, Chess',
  linkedIn: 'linkedin.com/in/rahulsharma',
  idCardNumber: 'ID-2025-007',
  subject: 'Mathematics',
  classTeacher: 'Class 11 - A',
  employmentStatus: 'Active',
  noticePeriod: '60 Days',
  payScale: 'PGT Scale',
  bankName: 'HDFC Bank',
  paymentMode: 'Bank Transfer',
  professionalTaxNo: 'PT-DL-4521',
  marriageAnniversary: '2015-11-20',
  contractEndDate: '2028-03-31',
  education: [
    { degree: 'Ph.D. Mathematics', year: '2018', institution: 'Delhi University' },
    { degree: 'M.Sc. Mathematics', year: '2012', institution: 'Delhi University' },
    { degree: 'B.Sc. Mathematics', year: '2010', institution: 'Meerut University' },
  ],
  experience: [
    { company: 'Sunrise International School', role: 'PGT Mathematics', from: 'Jul 2020', to: 'Present' },
    { company: 'Bright Future Public School', role: 'TGT Mathematics', from: 'Jun 2015', to: 'Jun 2020' },
  ],
  documents: [
    { name: 'Aadhaar Card', fileName: 'aadhaar.pdf' },
    { name: 'PAN Card', fileName: 'pan.pdf' },
    { name: 'M.Sc. Marksheet', fileName: 'msc_marksheet.pdf' },
    { name: 'Appointment Letter', fileName: 'appointment.pdf' },
    { name: 'Experience Certificate', fileName: 'experience.pdf' },
  ],
  family: [
    { relation: 'Spouse', name: 'Mrs. Priya Sharma', dob: '1990-06-15' },
    { relation: 'Son', name: 'Aarav Sharma', dob: '2018-03-22' },
    { relation: 'Daughter', name: 'Ananya Sharma', dob: '2020-09-10' },
  ],
  skills: [
    'Advanced Mathematics',
    'Classroom Management',
    'CBSE Curriculum',
    'Educational Technology',
    'Communication Skills',
    'Time Management',
  ],
};

async function institutionName(institutionId: string) {
  const inst = await prisma.institution.findUnique({
    where: { id: institutionId },
    select: { name: true },
  });
  return inst?.name || 'School';
}

function buildDirectoryRow(row: {
  id: string;
  employeeCode: string;
  fullName: string;
  classGroup: string;
  department: string;
  designation: string;
  status: FeeMasterStatus;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    recordId: row.employeeCode,
    name: row.fullName,
    department: row.department || '',
    classGroup: row.classGroup || '',
    designation: row.designation || '',
    details: [row.designation, row.department].filter(Boolean).join(' · ') || '—',
    mapping: [row.department, row.classGroup].filter(Boolean).join(' / ') || 'Unmapped',
    updated: formatDate(row.updatedAt),
    status: row.status,
  };
}

function buildDetail(
  row: Awaited<ReturnType<typeof loadEmployeeRow>>,
  school: string,
) {
  const profile = parseProfile(row.profileData);
  const structure = row.salaryStructures[0];
  const merged: EmployeeProfileData = {
    ...profile,
    school: profile.school || school,
    employmentStatus: profile.employmentStatus || (row.status === FeeMasterStatus.ACTIVE ? 'Active' : row.status),
  };

  return {
    id: row.id,
    recordId: row.employeeCode,
    employeeCode: row.employeeCode,
    fullName: row.fullName,
    status: row.status,
    employmentType: row.employmentType,
    employmentTypeLabel: employmentLabel(row.employmentType),
    department: row.department,
    designation: row.designation,
    classGroup: row.classGroup,
    mobile: row.mobile,
    email: row.email,
    joinDate: row.joinDate ? row.joinDate.toISOString().slice(0, 10) : null,
    joinDateDisplay: formatDate(row.joinDate),
    bankAccount: row.bankAccount,
    bankIfsc: row.bankIfsc,
    panNumber: row.panNumber,
    uanNumber: row.uanNumber,
    pfNumber: row.pfNumber,
    esicNumber: row.esicNumber,
    epfApplicable: row.epfApplicable,
    esicApplicable: row.esicApplicable,
    remarks: row.remarks,
    updatedAt: row.updatedAt.toISOString(),
    updatedDisplay: formatDate(row.updatedAt),
    profile: merged,
    salary: structure
      ? {
          basicSalary: structure.basicSalary,
          grossSalary: structure.grossSalary,
          netSalary: structure.netSalary,
          hra: structure.hra,
          da: structure.da,
          specialAllowance: structure.specialAllowance,
          conveyanceAllowance: structure.conveyanceAllowance,
          otherAllowances: structure.otherAllowances,
          totalDeductions: structure.totalDeductions,
        }
      : null,
  };
}

async function loadEmployeeRow(institutionId: string, id: string) {
  const row = await prisma.payrollEmployee.findFirst({
    where: { id, institutionId },
    include: {
      salaryStructures: {
        where: { status: FeeMasterStatus.ACTIVE },
        take: 1,
      },
    },
  });
  if (!row) throw new Error('Employee not found');
  return row;
}

export async function listEmployeeDirectory(
  institutionId: string,
  filters?: { q?: string; status?: FeeMasterStatus; department?: string; classGroup?: string },
) {
  const where: Prisma.PayrollEmployeeWhereInput = { institutionId };
  if (filters?.status) where.status = filters.status;
  if (filters?.department?.trim()) {
    where.department = { equals: filters.department.trim(), mode: 'insensitive' };
  }
  if (filters?.classGroup?.trim()) {
    where.classGroup = { equals: filters.classGroup.trim(), mode: 'insensitive' };
  }
  if (filters?.q?.trim()) {
    const q = filters.q.trim();
    where.OR = [
      { fullName: { contains: q, mode: 'insensitive' } },
      { employeeCode: { contains: q, mode: 'insensitive' } },
      { department: { contains: q, mode: 'insensitive' } },
      { designation: { contains: q, mode: 'insensitive' } },
      { classGroup: { contains: q, mode: 'insensitive' } },
    ];
  }

  const rows = await prisma.payrollEmployee.findMany({
    where,
    orderBy: [{ updatedAt: 'desc' }, { fullName: 'asc' }],
    select: {
      id: true,
      employeeCode: true,
      fullName: true,
      classGroup: true,
      department: true,
      designation: true,
      status: true,
      updatedAt: true,
    },
  });

  return rows.map(buildDirectoryRow);
}

/** Teaching staff options for Academic Subject Management (HR-synced). */
export async function listTeachingStaffForAcademic(institutionId: string) {
  const rows = await prisma.payrollEmployee.findMany({
    where: {
      institutionId,
      status: FeeMasterStatus.ACTIVE,
      OR: [
        { employmentType: PayrollEmploymentType.TEACHING },
        { designation: { contains: 'Teacher', mode: 'insensitive' } },
        { designation: { contains: 'PGT', mode: 'insensitive' } },
        { designation: { contains: 'TGT', mode: 'insensitive' } },
        { designation: { contains: 'PRT', mode: 'insensitive' } },
      ],
    },
    orderBy: { fullName: 'asc' },
    select: {
      id: true,
      employeeCode: true,
      fullName: true,
      email: true,
      mobile: true,
      department: true,
      designation: true,
      profileData: true,
    },
  });

  return rows.map((r) => {
    const profile = parseProfile(r.profileData);
    const subject = String(profile.subject || '').trim();
    return {
      id: r.id,
      employeeCode: r.employeeCode,
      teacherName: r.fullName,
      email: r.email || '',
      mobile: r.mobile || '',
      department: r.department || '',
      designation: r.designation || '',
      subjectSpecialization: subject,
      label: subject
        ? `${r.fullName} — ${subject}`
        : `${r.fullName}${r.designation ? ` (${r.designation})` : ''}`,
    };
  });
}

export async function getEmployeeDirectoryDetail(institutionId: string, id: string) {
  const school = await institutionName(institutionId);
  const row = await loadEmployeeRow(institutionId, id);
  return buildDetail(row, school);
}

export async function updateEmployeeDirectoryProfile(
  institutionId: string,
  id: string,
  data: {
    fullName?: string;
    employeeCode?: string;
    employmentType?: PayrollEmploymentType;
    department?: string;
    designation?: string;
    classGroup?: string;
    mobile?: string;
    email?: string;
    joinDate?: string | null;
    bankAccount?: string;
    bankIfsc?: string;
    panNumber?: string;
    uanNumber?: string;
    pfNumber?: string;
    esicNumber?: string;
    status?: FeeMasterStatus;
    profile?: Partial<EmployeeProfileData> | Record<string, unknown>;
  },
) {
  const existing = await loadEmployeeRow(institutionId, id);
  const currentProfile = parseProfile(existing.profileData);
  const nextProfile = data.profile ? { ...currentProfile, ...data.profile } : currentProfile;

  if (data.employeeCode?.trim() && data.employeeCode.trim() !== existing.employeeCode) {
    const taken = await prisma.payrollEmployee.findFirst({
      where: { institutionId, employeeCode: data.employeeCode.trim(), NOT: { id } },
    });
    if (taken) throw new Error(`Employee code ${data.employeeCode.trim()} already exists`);
  }

  const row = await prisma.payrollEmployee.update({
    where: { id },
    data: {
      fullName: data.fullName?.trim() || undefined,
      employeeCode: data.employeeCode?.trim() || undefined,
      employmentType: data.employmentType,
      department: data.department?.trim(),
      designation: data.designation?.trim(),
      classGroup: data.classGroup?.trim(),
      mobile: data.mobile,
      email: data.email,
      joinDate: data.joinDate === null ? null : data.joinDate ? new Date(data.joinDate) : undefined,
      bankAccount: data.bankAccount,
      bankIfsc: data.bankIfsc,
      panNumber: data.panNumber,
      uanNumber: data.uanNumber,
      pfNumber: data.pfNumber,
      esicNumber: data.esicNumber,
      status: data.status,
      profileData: nextProfile as Prisma.InputJsonValue,
    },
    include: {
      salaryStructures: {
        where: { status: FeeMasterStatus.ACTIVE },
        take: 1,
      },
    },
  });

  await syncDirectoryEmployee(institutionId, row.id);
  const school = await institutionName(institutionId);
  return buildDetail(row, school);
}

async function syncDirectoryEmployee(institutionId: string, employeeId: string) {
  const emp = await prisma.payrollEmployee.findFirst({
    where: { institutionId, id: employeeId },
    select: { id: true, department: true, designation: true, profileData: true },
  });
  if (!emp) return;
  const profile = emp.profileData && typeof emp.profileData === 'object' && !Array.isArray(emp.profileData)
    ? (emp.profileData as { reportingTo?: string })
    : {};
  await syncEmployeeToDepartment(institutionId, {
    id: emp.id,
    department: emp.department,
    designation: emp.designation,
    profileReportingTo: profile.reportingTo,
  });
}

export async function createEmployeeDirectoryEntry(
  institutionId: string,
  data: {
    fullName: string;
    employeeCode?: string;
    employmentType?: PayrollEmploymentType;
    department?: string;
    designation?: string;
    classGroup?: string;
    mobile?: string;
    email?: string;
    joinDate?: string | null;
    profile?: Partial<EmployeeProfileData> | Record<string, unknown>;
  },
) {
  const count = await prisma.payrollEmployee.count({ where: { institutionId } });
  const employeeCode = data.employeeCode?.trim() || `EMP-${5460 + count}`;
  const exists = await prisma.payrollEmployee.findFirst({
    where: { institutionId, employeeCode },
  });
  if (exists) throw new Error(`Employee code ${employeeCode} already exists`);

  const school = await institutionName(institutionId);
  const row = await prisma.payrollEmployee.create({
    data: {
      institutionId,
      employeeCode,
      fullName: data.fullName.trim(),
      employmentType: data.employmentType ?? PayrollEmploymentType.TEACHING,
      department: data.department?.trim() || 'General',
      designation: data.designation?.trim() || 'Staff',
      classGroup: data.classGroup?.trim() || '',
      mobile: data.mobile ?? '',
      email: data.email ?? '',
      joinDate: data.joinDate ? new Date(data.joinDate) : new Date(),
      profileData: (data.profile || {}) as Prisma.InputJsonValue,
      status: FeeMasterStatus.ACTIVE,
    },
    include: {
      salaryStructures: {
        where: { status: FeeMasterStatus.ACTIVE },
        take: 1,
      },
    },
  });

  await syncDirectoryEmployee(institutionId, row.id);
  return buildDetail(row, school);
}

function parseEmploymentType(raw?: string): PayrollEmploymentType {
  const u = String(raw || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (u === 'NON_TEACHING' || u === 'NONTEACHING') return PayrollEmploymentType.NON_TEACHING;
  if (u === 'ADMIN' || u === 'ADMINISTRATION') return PayrollEmploymentType.ADMIN;
  if (u === 'SUPPORT') return PayrollEmploymentType.SUPPORT;
  if (u === 'TEACHING') return PayrollEmploymentType.TEACHING;
  return PayrollEmploymentType.TEACHING;
}

export type EmployeeBulkUploadRow = {
  employeeCode?: string;
  fullName: string;
  employmentType?: string;
  department?: string;
  designation?: string;
  classGroup?: string;
  mobile?: string;
  email?: string;
  joinDate?: string;
  gender?: string;
  dateOfBirth?: string;
  reportingTo?: string;
  workLocation?: string;
  subject?: string;
  bankAccount?: string;
  bankIfsc?: string;
  panNumber?: string;
  uanNumber?: string;
  pfNumber?: string;
  esicNumber?: string;
  bankName?: string;
  paymentMode?: string;
  basicSalary?: number;
  hra?: number;
  da?: number;
  specialAllowance?: number;
  conveyanceAllowance?: number;
  otherAllowances?: number;
  epfEmployee?: number;
  professionalTax?: number;
  otherDeductions?: number;
  structureCode?: string;
  effectiveFrom?: string;
};

function hasSalaryPayload(row: EmployeeBulkUploadRow) {
  return [
    row.basicSalary, row.hra, row.da, row.specialAllowance, row.conveyanceAllowance,
    row.otherAllowances, row.epfEmployee, row.professionalTax, row.otherDeductions,
  ].some((v) => v != null && Number.isFinite(Number(v)));
}

async function upsertEmployeeSalaryStructure(
  institutionId: string,
  employeeId: string,
  employeeCode: string,
  row: EmployeeBulkUploadRow,
) {
  const basic = Number(row.basicSalary || 0);
  const hra = Number(row.hra || 0);
  const da = Number(row.da || 0);
  const specialAllowance = Number(row.specialAllowance || 0);
  const conveyanceAllowance = Number(row.conveyanceAllowance || 0);
  const otherAllowances = Number(row.otherAllowances || 0);
  const grossSalary = basic + hra + da + specialAllowance + conveyanceAllowance + otherAllowances;
  const epfEmployee = Number(row.epfEmployee || 0);
  const professionalTax = Number(row.professionalTax || 0);
  const otherDeductions = Number(row.otherDeductions || 0);
  const totalDeductions = epfEmployee + professionalTax + otherDeductions;
  const netSalary = Math.max(0, grossSalary - totalDeductions);
  const effectiveFrom = row.effectiveFrom ? new Date(row.effectiveFrom) : new Date();
  const structureCode = (row.structureCode || `SS-${employeeCode}`).trim();

  await prisma.payrollSalaryStructure.updateMany({
    where: { institutionId, employeeId, status: FeeMasterStatus.ACTIVE },
    data: { status: FeeMasterStatus.INACTIVE },
  });

  const existingByCode = await prisma.payrollSalaryStructure.findFirst({
    where: { institutionId, structureCode },
  });

  if (existingByCode) {
    await prisma.payrollSalaryStructure.update({
      where: { id: existingByCode.id },
      data: {
        employeeId,
        effectiveFrom,
        basicSalary: basic,
        hra,
        da,
        specialAllowance,
        conveyanceAllowance,
        otherAllowances,
        grossSalary,
        pfWages: basic,
        epfEmployee,
        epfEmployer: epfEmployee,
        professionalTax,
        otherDeductions,
        totalDeductions,
        netSalary,
        status: FeeMasterStatus.ACTIVE,
        remarks: 'Bulk upload',
      },
    });
    return;
  }

  await prisma.payrollSalaryStructure.create({
    data: {
      institutionId,
      employeeId,
      structureCode,
      effectiveFrom,
      basicSalary: basic,
      hra,
      da,
      specialAllowance,
      conveyanceAllowance,
      otherAllowances,
      grossSalary,
      pfWages: basic,
      epfEmployee,
      epfEmployer: epfEmployee,
      professionalTax,
      otherDeductions,
      totalDeductions,
      netSalary,
      status: FeeMasterStatus.ACTIVE,
      remarks: 'Bulk upload',
    },
  });
}

/** Bulk create/update employees + per-staff salary structures from Excel rows. */
export async function bulkUpsertEmployeeDirectory(
  institutionId: string,
  rows: EmployeeBulkUploadRow[],
) {
  if (!rows.length) throw new Error('No employee rows to import');

  let created = 0;
  let updated = 0;
  let salaryUpserted = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const line = i + 2;
    try {
      const fullName = String(row.fullName || '').trim();
      if (!fullName) {
        errors.push(`Row ${line}: fullName is required`);
        continue;
      }

      const employmentType = parseEmploymentType(row.employmentType);
      const profile: Partial<EmployeeProfileData> = {
        ...(row.gender ? { gender: row.gender } : {}),
        ...(row.dateOfBirth ? { dateOfBirth: row.dateOfBirth } : {}),
        ...(row.reportingTo ? { reportingTo: row.reportingTo } : {}),
        ...(row.workLocation ? { workLocation: row.workLocation } : {}),
        ...(row.subject ? { subject: row.subject } : {}),
        ...(row.bankName ? { bankName: row.bankName } : {}),
        ...(row.paymentMode ? { paymentMode: row.paymentMode } : {}),
        employmentStatus: 'Active',
      };

      let employee = row.employeeCode?.trim()
        ? await prisma.payrollEmployee.findFirst({
            where: { institutionId, employeeCode: row.employeeCode.trim() },
          })
        : null;

      if (employee) {
        const currentProfile = parseProfile(employee.profileData);
        employee = await prisma.payrollEmployee.update({
          where: { id: employee.id },
          data: {
            fullName,
            employmentType,
            department: row.department?.trim() || employee.department,
            designation: row.designation?.trim() || employee.designation,
            classGroup: row.classGroup?.trim() ?? employee.classGroup,
            mobile: row.mobile?.trim() ?? employee.mobile,
            email: row.email?.trim() ?? employee.email,
            joinDate: row.joinDate ? new Date(row.joinDate) : employee.joinDate,
            bankAccount: row.bankAccount?.trim() ?? employee.bankAccount,
            bankIfsc: row.bankIfsc?.trim() ?? employee.bankIfsc,
            panNumber: row.panNumber?.trim() ?? employee.panNumber,
            uanNumber: row.uanNumber?.trim() ?? employee.uanNumber,
            pfNumber: row.pfNumber?.trim() ?? employee.pfNumber,
            esicNumber: row.esicNumber?.trim() ?? employee.esicNumber,
            profileData: { ...currentProfile, ...profile } as Prisma.InputJsonValue,
            status: FeeMasterStatus.ACTIVE,
          },
        });
        updated += 1;
      } else {
        const count = await prisma.payrollEmployee.count({ where: { institutionId } });
        const employeeCode = row.employeeCode?.trim() || `EMP-${5460 + count + created + 1}`;
        const codeTaken = await prisma.payrollEmployee.findFirst({
          where: { institutionId, employeeCode },
        });
        if (codeTaken) {
          errors.push(`Row ${line}: employeeCode ${employeeCode} already exists`);
          continue;
        }
        employee = await prisma.payrollEmployee.create({
          data: {
            institutionId,
            employeeCode,
            fullName,
            employmentType,
            department: row.department?.trim() || 'General',
            designation: row.designation?.trim() || 'Staff',
            classGroup: row.classGroup?.trim() || '',
            mobile: row.mobile?.trim() || '',
            email: row.email?.trim() || '',
            joinDate: row.joinDate ? new Date(row.joinDate) : new Date(),
            bankAccount: row.bankAccount?.trim() || '',
            bankIfsc: row.bankIfsc?.trim() || '',
            panNumber: row.panNumber?.trim() || '',
            uanNumber: row.uanNumber?.trim() || '',
            pfNumber: row.pfNumber?.trim() || '',
            esicNumber: row.esicNumber?.trim() || '',
            profileData: profile as Prisma.InputJsonValue,
            status: FeeMasterStatus.ACTIVE,
          },
        });
        created += 1;
      }

      if (hasSalaryPayload(row)) {
        await upsertEmployeeSalaryStructure(institutionId, employee.id, employee.employeeCode, row);
        salaryUpserted += 1;
      }
      await syncDirectoryEmployee(institutionId, employee.id);
    } catch (err) {
      errors.push(`Row ${line}: ${err instanceof Error ? err.message : 'Failed'}`);
    }
  }

  return {
    created,
    updated,
    salaryUpserted,
    total: rows.length,
    errors,
    message: `Imported ${created + updated} staff (${created} created, ${updated} updated, ${salaryUpserted} salary structures)${
      errors.length ? ` · ${errors.length} row error(s)` : ''
    }`,
  };
}

export async function seedEmployeeDirectoryDemo(institutionId: string) {
  const existing = await prisma.payrollEmployee.findFirst({
    where: { institutionId, employeeCode: 'EMP2025007' },
  });
  if (existing) return getEmployeeDirectoryDetail(institutionId, existing.id);

  const school = await institutionName(institutionId);
  const row = await prisma.payrollEmployee.create({
    data: {
      institutionId,
      employeeCode: 'EMP2025007',
      fullName: 'Mr. Rahul Sharma',
      employmentType: PayrollEmploymentType.TEACHING,
      department: 'Academics',
      designation: 'PGT - Mathematics',
      classGroup: 'Class 11-A',
      mobile: '+91 98765 12345',
      email: 'rahul.sharma@school.edu',
      joinDate: new Date('2020-07-01'),
      bankAccount: 'XXXX-XXXX-7890',
      bankIfsc: 'HDFC0001234',
      panNumber: 'ABCDE1234F',
      uanNumber: '100123456789',
      pfNumber: 'DL/EPF/4521',
      esicNumber: 'ESIC452178',
      profileData: { ...DEMO_PROFILE, school } as Prisma.InputJsonValue,
      status: FeeMasterStatus.ACTIVE,
    },
    include: {
      salaryStructures: {
        where: { status: FeeMasterStatus.ACTIVE },
        take: 1,
      },
    },
  });

  await prisma.payrollSalaryStructure.create({
    data: {
      institutionId,
      employeeId: row.id,
      structureCode: 'SS-EMP2025007',
      effectiveFrom: new Date('2020-07-01'),
      basicSalary: 38000,
      hra: 12000,
      da: 3500,
      specialAllowance: 3000,
      conveyanceAllowance: 2000,
      otherAllowances: 0,
      grossSalary: 58500,
      pfWages: 38000,
      epfEmployee: 4560,
      epfEmployer: 4560,
      esicEmployee: 0,
      esicEmployer: 0,
      professionalTax: 200,
      tds: 0,
      otherDeductions: 0,
      totalDeductions: 4760,
      netSalary: 53740,
      status: FeeMasterStatus.ACTIVE,
    },
  });

  return getEmployeeDirectoryDetail(institutionId, row.id);
}
