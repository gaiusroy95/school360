import {
  BulkImportRowStatus,
  BulkImportStatus,
  Prisma,
  StudentBulkImport,
  StudentBulkImportRow,
  StudentGender,
  StudentStatus,
} from '@prisma/client';
import { prisma } from './prisma.js';
import {
  formatClassSection,
  generateStudentAdmissionNumber,
  parseStudentGender,
  parseStudentStatus,
  splitFullName,
} from './students.js';

export const BULK_IMPORT_STATUS_UI: Record<BulkImportStatus, string> = {
  DRAFT: 'Draft',
  PENDING: 'Pending',
  OPEN: 'Open',
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  APPROVED: 'Approved',
  PAID: 'Paid',
  DUE: 'Due',
};

export type ImportRowInput = Record<string, unknown>;

function parseDateInput(v?: string): Date | undefined {
  if (!v?.trim()) return undefined;
  const d = new Date(v.trim());
  if (!Number.isNaN(d.getTime())) return d;
  const m = v.trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (m) {
    const parsed = new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1])));
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return undefined;
}

export async function generateBulkRecordId(institutionId: string): Promise<string> {
  const count = await prisma.studentBulkImport.count({ where: { institutionId } });
  for (let i = 0; i < 50; i++) {
    const candidate = `BUL-${String(6500 + count + i + 1)}`;
    const taken = await prisma.studentBulkImport.findFirst({
      where: { institutionId, recordId: candidate },
    });
    if (!taken) return candidate;
  }
  return `BUL-${Date.now().toString().slice(-6)}`;
}

export function serializeBulkImport(batch: StudentBulkImport) {
  const classGroup =
    batch.className && batch.sectionName
      ? formatClassSection(batch.className, batch.sectionName)
      : batch.className || 'All Classes';

  return {
    id: batch.id,
    recordId: batch.recordId,
    fileName: batch.fileName,
    name: batch.fileName || `Import ${batch.recordId}`,
    className: batch.className,
    sectionName: batch.sectionName,
    classGroup,
    academicYear: batch.academicYear,
    status: batch.status,
    statusLabel: BULK_IMPORT_STATUS_UI[batch.status],
    totalRows: batch.totalRows,
    createdCount: batch.createdCount,
    updatedCount: batch.updatedCount,
    errorCount: batch.errorCount,
    details:
      batch.details ||
      `Bulk Import — ${batch.createdCount} created, ${batch.updatedCount} updated, ${batch.errorCount} errors`,
    updateExisting: batch.updateExisting,
    errors: batch.errors,
    updatedAt: batch.updatedAt.toISOString(),
    createdAt: batch.createdAt.toISOString(),
  };
}

export function serializeBulkImportRow(row: StudentBulkImportRow) {
  return {
    id: row.id,
    rowNumber: row.rowNumber,
    studentName: row.studentName,
    className: row.className,
    sectionName: row.sectionName,
    classGroup: formatClassSection(row.className, row.sectionName),
    admissionNumber: row.admissionNumber,
    mobile: row.mobile,
    status: row.status,
    message: row.message,
    studentId: row.studentId,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getBulkImportDashboard(institutionId: string) {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [total, activeOpen, pending, thisMonth] = await Promise.all([
    prisma.studentBulkImport.count({ where: { institutionId } }),
    prisma.studentBulkImport.count({
      where: {
        institutionId,
        status: { in: [BulkImportStatus.ACTIVE, BulkImportStatus.OPEN, BulkImportStatus.COMPLETED] },
      },
    }),
    prisma.studentBulkImport.count({
      where: { institutionId, status: BulkImportStatus.PENDING },
    }),
    prisma.studentBulkImport.count({
      where: { institutionId, createdAt: { gte: startOfMonth } },
    }),
  ]);

  return { total, activeOpen, pending, thisMonth };
}

function resolveBatchStatus(
  created: number,
  updated: number,
  errors: number,
  total: number,
): BulkImportStatus {
  if (errors === total) return BulkImportStatus.DUE;
  if (errors > 0) return BulkImportStatus.PENDING;
  if (created + updated === total) return BulkImportStatus.COMPLETED;
  if (created + updated > 0) return BulkImportStatus.ACTIVE;
  return BulkImportStatus.OPEN;
}

export async function runBulkImportBatch(opts: {
  institutionId: string;
  fileName: string;
  className: string;
  sectionName: string;
  academicYear: string;
  updateExisting: boolean;
  rows: ImportRowInput[];
}) {
  const recordId = await generateBulkRecordId(opts.institutionId);
  const batchErrors: { row: number; message: string }[] = [];
  let created = 0;
  let updated = 0;
  let errorCount = 0;

  const batch = await prisma.studentBulkImport.create({
    data: {
      institutionId: opts.institutionId,
      recordId,
      fileName: opts.fileName,
      className: opts.className,
      sectionName: opts.sectionName,
      academicYear: opts.academicYear,
      status: BulkImportStatus.OPEN,
      totalRows: opts.rows.length,
      updateExisting: opts.updateExisting,
      details: `Bulk Import item — ${opts.rows.length} row(s)`,
    },
  });

  const importRows: Prisma.StudentBulkImportRowCreateManyInput[] = [];

  for (let i = 0; i < opts.rows.length; i++) {
    const row = opts.rows[i];
    const excelRow = i + 2;
    let rowStatus: BulkImportRowStatus = BulkImportRowStatus.PENDING;
    let message = '';
    let studentId: string | undefined;

    try {
      const full =
        String(row.fullName || '').trim() ||
        String(row.studentName || '').trim() ||
        [row.firstName, row.lastName].filter(Boolean).join(' ').trim();

      if (!full && !String(row.firstName || '').trim()) {
        throw new Error('Student name is required');
      }

      const { firstName, lastName } = String(row.firstName || '').trim()
        ? { firstName: String(row.firstName).trim(), lastName: String(row.lastName || '').trim() }
        : splitFullName(full || '');

      const className =
        String(row.className || row.class || '').trim() || opts.className;
      if (!className) throw new Error('Class is required');

      const sectionName =
        String(row.sectionName || row.section || '').trim() || opts.sectionName;

      if (opts.className && className !== opts.className) {
        throw new Error(`Row class ${className} does not match batch filter ${opts.className}`);
      }
      if (opts.sectionName && sectionName && sectionName !== opts.sectionName) {
        throw new Error(`Row section ${sectionName} does not match batch filter ${opts.sectionName}`);
      }

      const admissionNumber =
        String(row.admissionNumber || '').trim() ||
        (await generateStudentAdmissionNumber(opts.institutionId));

      const data = {
        firstName,
        lastName,
        dateOfBirth: parseDateInput(String(row.dateOfBirth || '')),
        gender: parseStudentGender(String(row.gender || '')) || StudentGender.OTHER,
        bloodGroup: String(row.bloodGroup || '').trim(),
        aadhaarNumber: String(row.aadhaarNumber || '').trim(),
        religion: String(row.religion || '').trim(),
        nationality: String(row.nationality || '').trim() || 'Indian',
        category: String(row.category || '').trim() || 'General',
        address: String(row.address || '').trim(),
        mobile: String(row.mobile || '').trim(),
        email: String(row.email || '').trim(),
        className,
        sectionName,
        academicYear: String(row.academicYear || '').trim() || opts.academicYear,
        house: String(row.house || '').trim(),
        rollNumber: String(row.rollNumber || row.rollNo || '').trim(),
        rfidTag: String(row.rfidTag || '').trim(),
        fatherName: String(row.fatherName || '').trim(),
        fatherMobile: String(row.fatherMobile || '').trim(),
        motherName: String(row.motherName || '').trim(),
        motherMobile: String(row.motherMobile || '').trim(),
        status: parseStudentStatus(String(row.status || '')) || StudentStatus.ACTIVE,
        entranceScore:
          row.entranceScore != null && row.entranceScore !== ''
            ? Number(row.entranceScore)
            : undefined,
      };

      const existing = await prisma.student.findFirst({
        where: { institutionId: opts.institutionId, admissionNumber },
      });

      if (existing) {
        if (opts.updateExisting) {
          const updatedStudent = await prisma.student.update({ where: { id: existing.id }, data });
          studentId = updatedStudent.id;
          rowStatus = BulkImportRowStatus.UPDATED;
          message = 'Updated existing student';
          updated += 1;
        } else {
          throw new Error(`Admission number ${admissionNumber} already exists`);
        }
      } else {
        const newStudent = await prisma.student.create({
          data: { institutionId: opts.institutionId, admissionNumber, ...data },
        });
        studentId = newStudent.id;
        rowStatus = BulkImportRowStatus.SUCCESS;
        message = 'Created new student';
        created += 1;
      }
    } catch (e) {
      rowStatus = BulkImportRowStatus.ERROR;
      message = e instanceof Error ? e.message : 'Import failed';
      batchErrors.push({ row: excelRow, message });
      errorCount += 1;
    }

    importRows.push({
      batchId: batch.id,
      rowNumber: excelRow,
      studentName:
        String(row.fullName || row.studentName || row.firstName || '').trim() || '—',
      className: String(row.className || row.class || opts.className || ''),
      sectionName: String(row.sectionName || row.section || opts.sectionName || ''),
      admissionNumber: String(row.admissionNumber || ''),
      mobile: String(row.mobile || ''),
      status: rowStatus,
      message,
      studentId: studentId || null,
      rawData: row as Prisma.InputJsonValue,
    });
  }

  if (importRows.length) {
    await prisma.studentBulkImportRow.createMany({ data: importRows });
  }

  const finalStatus = resolveBatchStatus(created, updated, errorCount, opts.rows.length);
  const updatedBatch = await prisma.studentBulkImport.update({
    where: { id: batch.id },
    data: {
      status: finalStatus,
      createdCount: created,
      updatedCount: updated,
      errorCount,
      errors: batchErrors as Prisma.InputJsonValue,
      details: `Bulk Import item — ${created} created, ${updated} updated, ${errorCount} errors`,
    },
  });

  return { batch: updatedBatch, created, updated, errors: batchErrors };
}

export function parseBulkImportStatus(input?: string): BulkImportStatus | undefined {
  if (!input) return undefined;
  const upper = input.toUpperCase().replace(/\s+/g, '_') as BulkImportStatus;
  if (Object.values(BulkImportStatus).includes(upper)) return upper;
  return undefined;
}
