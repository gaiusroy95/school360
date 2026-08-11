import {
  FeeDueStatus,
  FeeMasterStatus,
  PayrollEmploymentType,
  Prisma,
  StudentGender,
  StudentStatus,
  ExamResultBatchStatus,
  ExamReportCardStatus,
  ExamReportCardTemplate,
} from '@prisma/client';
import { prisma } from './prisma.js';
import {
  generateStudentAdmissionNumber,
  generateStudentSoftId,
  parseStudentGender,
  parseStudentStatus,
  splitFullName,
} from './students.js';

export type MigrationSheetKey = 'students' | 'teachers' | 'accounts' | 'results';

export type MigrationRow = Record<string, unknown>;

export type SheetImportResult = {
  sheet: MigrationSheetKey;
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
};

function cell(v: unknown): string {
  if (v == null) return '';
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  if (typeof v === 'number' && Number.isFinite(v)) {
    // Excel serial date
    if (v > 20000 && v < 80000) {
      const utc = Math.round((v - 25569) * 86400 * 1000);
      return new Date(utc).toISOString().slice(0, 10);
    }
    return String(v);
  }
  return String(v).replace(/^\uFEFF/, '').trim();
}

function num(v: unknown, fallback = 0): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const n = Number(String(v ?? '').replace(/[₹,\s]/g, ''));
  return Number.isFinite(n) ? n : fallback;
}

function parseDate(v: unknown): Date | undefined {
  const s = cell(v);
  if (!s) return undefined;
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d;
  const m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (m) {
    const parsed = new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1])));
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return undefined;
}

/** Normalize Excel header keys → camelCase field names used below */
export function normalizeMigrationRow(raw: Record<string, unknown>): MigrationRow {
  const out: MigrationRow = {};
  for (const [k, v] of Object.entries(raw)) {
    const key = k
      .toLowerCase()
      .replace(/[_./-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const map: Record<string, string> = {
      'admission no': 'admissionNumber',
      'admission number': 'admissionNumber',
      'admissionno': 'admissionNumber',
      'soft id': 'softId',
      'sr no': 'srNo',
      'roll no': 'rollNumber',
      'roll number': 'rollNumber',
      'first name': 'firstName',
      'last name': 'lastName',
      'student name': 'studentName',
      'full name': 'fullName',
      'date of birth': 'dateOfBirth',
      dob: 'dateOfBirth',
      gender: 'gender',
      'blood group': 'bloodGroup',
      aadhaar: 'aadhaarNumber',
      'aadhaar number': 'aadhaarNumber',
      category: 'category',
      class: 'className',
      classname: 'className',
      section: 'sectionName',
      sectionname: 'sectionName',
      'academic year': 'academicYear',
      academicyear: 'academicYear',
      house: 'house',
      mobile: 'mobile',
      email: 'email',
      address: 'address',
      'father name': 'fatherName',
      'father mobile': 'fatherMobile',
      'mother name': 'motherName',
      'mother mobile': 'motherMobile',
      status: 'status',
      'employee code': 'employeeCode',
      employeecode: 'employeeCode',
      'teacher name': 'fullName',
      'staff name': 'fullName',
      department: 'department',
      designation: 'designation',
      'employment type': 'employmentType',
      'join date': 'joinDate',
      'class group': 'classGroup',
      'bank account': 'bankAccount',
      'bank ifsc': 'bankIfsc',
      pan: 'panNumber',
      'pan number': 'panNumber',
      'fee head': 'feeHead',
      feehead: 'feeHead',
      title: 'title',
      amount: 'amount',
      'due date': 'dueDate',
      duedate: 'dueDate',
      'amount paid': 'amountPaid',
      balance: 'balance',
      remarks: 'remarks',
      'exam name': 'examinationName',
      examination: 'examinationName',
      'examination name': 'examinationName',
      'total obtained': 'totalObtained',
      obtained: 'totalObtained',
      'total max': 'totalMax',
      'max marks': 'totalMax',
      percentage: 'percentage',
      grade: 'grade',
      gpa: 'gpa',
      rank: 'rank',
      'subject scores': 'subjectScores',
    };

    out[map[key] || key.replace(/\s+(\w)/g, (_, c: string) => c.toUpperCase())] = v;
  }
  return out;
}

function detectSheetKey(name: string): MigrationSheetKey | null {
  const n = name.toLowerCase().replace(/[^a-z]/g, '');
  if (n.includes('student')) return 'students';
  if (n.includes('teacher') || n.includes('staff') || n.includes('employee')) return 'teachers';
  if (n.includes('account') || n.includes('fee') || n.includes('due')) return 'accounts';
  if (n.includes('result') || n.includes('mark') || n.includes('exam')) return 'results';
  return null;
}

async function importStudents(
  institutionId: string,
  rows: MigrationRow[],
  updateExisting: boolean,
): Promise<SheetImportResult> {
  const errors: SheetImportResult['errors'] = [];
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const excelRow = i + 2;
    try {
      const full =
        cell(row.fullName) ||
        cell(row.studentName) ||
        [cell(row.firstName), cell(row.lastName)].filter(Boolean).join(' ');
      const { firstName, lastName } = cell(row.firstName)
        ? { firstName: cell(row.firstName), lastName: cell(row.lastName) }
        : splitFullName(full);
      if (!firstName) throw new Error('Student name is required');

      const className = cell(row.className);
      if (!className) throw new Error('Class is required');
      const sectionName = cell(row.sectionName);
      const academicYear = cell(row.academicYear) || '2025-26';

      const admissionNumber =
        cell(row.admissionNumber) || (await generateStudentAdmissionNumber(institutionId));

      const existing = await prisma.student.findFirst({
        where: { institutionId, admissionNumber },
      });

      if (existing && !updateExisting) {
        skipped += 1;
        continue;
      }

      let softId = cell(row.softId);
      if (!softId) softId = existing?.softId || (await generateStudentSoftId(institutionId));

      const data = {
        softId,
        srNo: cell(row.srNo),
        portalNicCode: cell(row.portalNicCode),
        rollNumber: cell(row.rollNumber),
        firstName,
        lastName,
        dateOfBirth: parseDate(row.dateOfBirth) ?? null,
        gender: parseStudentGender(cell(row.gender)) || StudentGender.OTHER,
        bloodGroup: cell(row.bloodGroup),
        aadhaarNumber: cell(row.aadhaarNumber),
        category: cell(row.category) || 'General',
        address: cell(row.address),
        mobile: cell(row.mobile),
        email: cell(row.email),
        className,
        sectionName,
        academicYear,
        house: cell(row.house),
        fatherName: cell(row.fatherName),
        fatherMobile: cell(row.fatherMobile),
        motherName: cell(row.motherName),
        motherMobile: cell(row.motherMobile),
        status: parseStudentStatus(cell(row.status)) || StudentStatus.ACTIVE,
      };

      if (existing) {
        await prisma.student.update({ where: { id: existing.id }, data });
        updated += 1;
      } else {
        await prisma.student.create({
          data: { institutionId, admissionNumber, ...data },
        });
        created += 1;
      }
    } catch (err) {
      errors.push({ row: excelRow, message: err instanceof Error ? err.message : 'Failed' });
    }
  }

  return { sheet: 'students', total: rows.length, created, updated, skipped, errors };
}

async function importTeachers(
  institutionId: string,
  rows: MigrationRow[],
  updateExisting: boolean,
): Promise<SheetImportResult> {
  const errors: SheetImportResult['errors'] = [];
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const excelRow = i + 2;
    try {
      const fullName = cell(row.fullName) || cell(row.studentName);
      if (!fullName) throw new Error('Teacher / staff name is required');

      let employeeCode = cell(row.employeeCode);
      let existing = employeeCode
        ? await prisma.payrollEmployee.findFirst({ where: { institutionId, employeeCode } })
        : null;

      if (!employeeCode) {
        const count = await prisma.payrollEmployee.count({ where: { institutionId } });
        employeeCode = `EMP-${String(1000 + count + i + 1)}`;
      }

      if (existing && !updateExisting) {
        skipped += 1;
        continue;
      }

      const empTypeRaw = cell(row.employmentType).toUpperCase();
      let employmentType: PayrollEmploymentType = PayrollEmploymentType.TEACHING;
      if (empTypeRaw.includes('ADMIN')) employmentType = PayrollEmploymentType.ADMIN;
      else if (empTypeRaw.includes('SUPPORT')) employmentType = PayrollEmploymentType.SUPPORT;
      else if (empTypeRaw.includes('NON') || empTypeRaw.includes('STAFF')) {
        employmentType = PayrollEmploymentType.NON_TEACHING;
      }

      const data = {
        fullName,
        employmentType,
        department: cell(row.department) || 'Academics',
        designation: cell(row.designation) || (employmentType === PayrollEmploymentType.TEACHING ? 'Teacher' : 'Staff'),
        classGroup: cell(row.classGroup),
        mobile: cell(row.mobile),
        email: cell(row.email),
        joinDate: parseDate(row.joinDate) ?? null,
        bankAccount: cell(row.bankAccount),
        bankIfsc: cell(row.bankIfsc),
        panNumber: cell(row.panNumber),
        status: FeeMasterStatus.ACTIVE,
        remarks: cell(row.remarks),
      };

      if (existing) {
        await prisma.payrollEmployee.update({ where: { id: existing.id }, data });
        updated += 1;
      } else {
        // Re-check code uniqueness after auto-generate
        existing = await prisma.payrollEmployee.findFirst({ where: { institutionId, employeeCode } });
        if (existing) {
          if (!updateExisting) {
            skipped += 1;
            continue;
          }
          await prisma.payrollEmployee.update({ where: { id: existing.id }, data });
          updated += 1;
        } else {
          await prisma.payrollEmployee.create({
            data: { institutionId, employeeCode, ...data },
          });
          created += 1;
        }
      }
    } catch (err) {
      errors.push({ row: excelRow, message: err instanceof Error ? err.message : 'Failed' });
    }
  }

  return { sheet: 'teachers', total: rows.length, created, updated, skipped, errors };
}

async function importAccounts(
  institutionId: string,
  rows: MigrationRow[],
  updateExisting: boolean,
): Promise<SheetImportResult> {
  const errors: SheetImportResult['errors'] = [];
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const excelRow = i + 2;
    try {
      const admissionNumber = cell(row.admissionNumber);
      if (!admissionNumber) throw new Error('Admission Number is required');

      const student = await prisma.student.findFirst({
        where: { institutionId, admissionNumber },
      });
      if (!student) throw new Error(`Student not found for admission ${admissionNumber}`);

      const academicYear = cell(row.academicYear) || student.academicYear || '2025-26';
      const feeHead = cell(row.feeHead) || 'tuitionFee';
      const title = cell(row.title) || feeHead;
      const amount = num(row.amount);
      if (amount <= 0) throw new Error('Amount must be > 0');

      const dueDate = parseDate(row.dueDate) || new Date();
      const statusRaw = cell(row.status).toUpperCase();
      const status =
        statusRaw === 'PAID'
          ? FeeDueStatus.PAID
          : statusRaw === 'OVERDUE'
            ? FeeDueStatus.OVERDUE
            : FeeDueStatus.PENDING;

      const existing = await prisma.feeDue.findFirst({
        where: {
          institutionId,
          studentId: student.id,
          academicYear,
          feeHead,
          title,
        },
      });

      if (existing && !updateExisting) {
        skipped += 1;
        continue;
      }

      const data = {
        admissionNumber,
        academicYear,
        title,
        feeHead,
        amount,
        dueDate,
        status,
        remarks: cell(row.remarks) || 'Migrated via Master Excel',
      };

      if (existing) {
        await prisma.feeDue.update({ where: { id: existing.id }, data });
        updated += 1;
      } else {
        await prisma.feeDue.create({
          data: { institutionId, studentId: student.id, ...data },
        });
        created += 1;
      }
    } catch (err) {
      errors.push({ row: excelRow, message: err instanceof Error ? err.message : 'Failed' });
    }
  }

  return { sheet: 'accounts', total: rows.length, created, updated, skipped, errors };
}

async function importResults(
  institutionId: string,
  rows: MigrationRow[],
  updateExisting: boolean,
): Promise<SheetImportResult> {
  const errors: SheetImportResult['errors'] = [];
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const excelRow = i + 2;
    try {
      const admissionNumber = cell(row.admissionNumber);
      if (!admissionNumber) throw new Error('Admission Number is required');

      const student = await prisma.student.findFirst({
        where: { institutionId, admissionNumber },
      });
      if (!student) throw new Error(`Student not found for admission ${admissionNumber}`);

      const academicYear = cell(row.academicYear) || student.academicYear || '2025-26';
      const examinationName = cell(row.examinationName) || 'Annual Exam';
      const className = cell(row.className) || student.className;
      const sectionName = cell(row.sectionName) || student.sectionName;

      let batch = await prisma.examResultBatch.findFirst({
        where: {
          institutionId,
          academicYear,
          examinationName,
          className,
          sectionName,
        },
      });

      if (!batch) {
        const count = await prisma.examResultBatch.count({ where: { institutionId } });
        batch = await prisma.examResultBatch.create({
          data: {
            institutionId,
            recordId: `MIG-RES-${String(count + 1).padStart(4, '0')}`,
            academicYear,
            examinationName,
            className,
            sectionName,
            status: ExamResultBatchStatus.COMPILED,
            compiledAt: new Date(),
            totalStudents: 0,
          },
        });
      }

      const existing = await prisma.examStudentResult.findFirst({
        where: { batchId: batch.id, studentId: student.id },
      });

      if (existing && !updateExisting) {
        skipped += 1;
        continue;
      }

      const totalObtained = num(row.totalObtained);
      const totalMax = num(row.totalMax, 100);
      const percentage =
        num(row.percentage) ||
        (totalMax > 0 ? Math.round((totalObtained / totalMax) * 10000) / 100 : 0);
      const grade = cell(row.grade);
      const gpa = num(row.gpa);
      const rank = Math.round(num(row.rank));

      let subjectScores: Prisma.InputJsonValue = [];
      const rawScores = cell(row.subjectScores);
      if (rawScores) {
        try {
          subjectScores = JSON.parse(rawScores) as Prisma.InputJsonValue;
        } catch {
          subjectScores = rawScores.split('|').map((part) => {
            const [subject, marks] = part.split(':').map((s) => s.trim());
            return { subject: subject || 'Subject', obtained: num(marks) };
          }) as unknown as Prisma.InputJsonValue;
        }
      }

      const data = {
        institutionId,
        studentName: [student.firstName, student.lastName].filter(Boolean).join(' '),
        admissionNumber,
        totalObtained,
        totalMax,
        percentage,
        grade,
        gpa,
        rank,
        remarks: cell(row.remarks) || 'Migrated via Master Excel',
        overallPerformance: percentage >= 75 ? 'Excellent' : percentage >= 50 ? 'Good' : 'Average',
        subjectScores,
        reportCardStatus: ExamReportCardStatus.PENDING,
        templateType: ExamReportCardTemplate.PRIMARY,
        generatedAt: new Date(),
      };

      if (existing) {
        await prisma.examStudentResult.update({ where: { id: existing.id }, data });
        updated += 1;
      } else {
        await prisma.examStudentResult.create({
          data: { batchId: batch.id, studentId: student.id, ...data },
        });
        created += 1;
        await prisma.examResultBatch.update({
          where: { id: batch.id },
          data: { totalStudents: { increment: 1 } },
        });
      }
    } catch (err) {
      errors.push({ row: excelRow, message: err instanceof Error ? err.message : 'Failed' });
    }
  }

  return { sheet: 'results', total: rows.length, created, updated, skipped, errors };
}

export type MasterMigrationPayload = {
  fileName?: string;
  updateExisting?: boolean;
  sheets: Partial<Record<MigrationSheetKey, MigrationRow[]>>;
};

export async function runMasterDataMigration(
  institutionId: string,
  payload: MasterMigrationPayload,
) {
  const updateExisting = payload.updateExisting !== false;
  const results: SheetImportResult[] = [];

  const order: MigrationSheetKey[] = ['students', 'teachers', 'accounts', 'results'];
  for (const key of order) {
    const rawRows = payload.sheets[key];
    if (!rawRows?.length) continue;
    const rows = rawRows.map((r) => normalizeMigrationRow(r as Record<string, unknown>));

    if (key === 'students') results.push(await importStudents(institutionId, rows, updateExisting));
    if (key === 'teachers') results.push(await importTeachers(institutionId, rows, updateExisting));
    if (key === 'accounts') results.push(await importAccounts(institutionId, rows, updateExisting));
    if (key === 'results') results.push(await importResults(institutionId, rows, updateExisting));
  }

  const summary = {
    fileName: payload.fileName || 'Master_Data_Migration.xlsx',
    updateExisting,
    sheets: results,
    totals: {
      created: results.reduce((s, r) => s + r.created, 0),
      updated: results.reduce((s, r) => s + r.updated, 0),
      skipped: results.reduce((s, r) => s + r.skipped, 0),
      errors: results.reduce((s, r) => s + r.errors.length, 0),
    },
    syncedAt: new Date().toISOString(),
    note:
      'Students sync first, then teachers, accounts (fee dues linked by admission no.), and results (exam batches by class/exam).',
  };

  return summary;
}

export function resolveSheetKeyFromName(sheetName: string): MigrationSheetKey | null {
  return detectSheetKey(sheetName);
}

export const MASTER_TEMPLATE_HEADERS: Record<MigrationSheetKey, string[]> = {
  students: [
    'Admission No.',
    'Soft ID',
    'SR No',
    'Roll No.',
    'First Name',
    'Last Name',
    'Date of Birth',
    'Gender',
    'Blood Group',
    'Aadhaar Number',
    'Category',
    'Class',
    'Section',
    'Academic Year',
    'House',
    'Mobile',
    'Email',
    'Address',
    'Father Name',
    'Father Mobile',
    'Mother Name',
    'Mother Mobile',
    'Status',
  ],
  teachers: [
    'Employee Code',
    'Full Name',
    'Employment Type',
    'Department',
    'Designation',
    'Class Group',
    'Mobile',
    'Email',
    'Join Date',
    'Bank Account',
    'Bank IFSC',
    'PAN Number',
    'Remarks',
  ],
  accounts: [
    'Admission No.',
    'Academic Year',
    'Fee Head',
    'Title',
    'Amount',
    'Due Date',
    'Status',
    'Remarks',
  ],
  results: [
    'Admission No.',
    'Academic Year',
    'Examination Name',
    'Class',
    'Section',
    'Total Obtained',
    'Total Max',
    'Percentage',
    'Grade',
    'GPA',
    'Rank',
    'Subject Scores',
    'Remarks',
  ],
};
