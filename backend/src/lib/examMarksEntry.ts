import {
  ExamMarksColumnKey,
  ExamMarkingSheetStatus,
  ExamTypeFilter,
  StudentStatus,
} from '@prisma/client';
import { prisma } from './prisma.js';
import { getInstitutionFilterMeta } from './students.js';

export const MARKS_COLUMNS: {
  key: ExamMarksColumnKey;
  label: string;
  maxMarks: number;
  sortOrder: number;
}[] = [
  { key: ExamMarksColumnKey.UNIT_1, label: 'Unit - 1', maxMarks: 20, sortOrder: 1 },
  { key: ExamMarksColumnKey.UNIT_2, label: 'Unit - 2', maxMarks: 20, sortOrder: 2 },
  { key: ExamMarksColumnKey.UNIT_3, label: 'Unit - 3', maxMarks: 20, sortOrder: 3 },
  { key: ExamMarksColumnKey.HALF_YEARLY, label: 'Half yearly', maxMarks: 100, sortOrder: 4 },
  { key: ExamMarksColumnKey.YEARLY, label: 'Yearly', maxMarks: 100, sortOrder: 5 },
  { key: ExamMarksColumnKey.PRACTICAL_VIVA, label: 'Practical/Viva Score', maxMarks: 150, sortOrder: 6 },
];

const COLUMN_MAP = new Map(MARKS_COLUMNS.map((c) => [c.key, c]));
const TOTAL_MAX_MARKS = MARKS_COLUMNS.reduce((s, c) => s + c.maxMarks, 0);

const LOCKED_STATUSES: ExamMarkingSheetStatus[] = [
  ExamMarkingSheetStatus.SUBMITTED,
  ExamMarkingSheetStatus.LOCKED,
  ExamMarkingSheetStatus.APPROVED,
];

function parseColumnKeys(raw: unknown): ExamMarksColumnKey[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((k): k is ExamMarksColumnKey =>
    Object.values(ExamMarksColumnKey).includes(k as ExamMarksColumnKey),
  );
}

function parseColumnKeysFromString(raw: string): ExamMarksColumnKey[] {
  const parts = raw.split(/[,;|]/).map((s) => s.trim().toUpperCase().replace(/\s+/g, '_'));
  const aliases: Record<string, ExamMarksColumnKey> = {
    UNIT_1: ExamMarksColumnKey.UNIT_1,
    'UNIT-1': ExamMarksColumnKey.UNIT_1,
    UNIT_2: ExamMarksColumnKey.UNIT_2,
    'UNIT-2': ExamMarksColumnKey.UNIT_2,
    UNIT_3: ExamMarksColumnKey.UNIT_3,
    'UNIT-3': ExamMarksColumnKey.UNIT_3,
    HALF_YEARLY: ExamMarksColumnKey.HALF_YEARLY,
    HALFYEARLY: ExamMarksColumnKey.HALF_YEARLY,
    'HALF YEARLY': ExamMarksColumnKey.HALF_YEARLY,
    YEARLY: ExamMarksColumnKey.YEARLY,
    PRACTICAL_VIVA: ExamMarksColumnKey.PRACTICAL_VIVA,
    PRACTICAL: ExamMarksColumnKey.PRACTICAL_VIVA,
    VIVA: ExamMarksColumnKey.PRACTICAL_VIVA,
  };
  const keys: ExamMarksColumnKey[] = [];
  for (const p of parts) {
    const key = aliases[p] || (Object.values(ExamMarksColumnKey).includes(p as ExamMarksColumnKey) ? p as ExamMarksColumnKey : null);
    if (key && !keys.includes(key)) keys.push(key);
  }
  return keys;
}

function computeGrade(pct: number) {
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B+';
  if (pct >= 60) return 'B';
  if (pct >= 50) return 'C';
  if (pct >= 36) return 'D';
  return 'F';
}

async function nextAssignmentRecordId(institutionId: string) {
  const count = await prisma.examSubjectTeacherAssignment.count({ where: { institutionId } });
  return `STA-${String(1000 + count + 1)}`;
}

async function nextSheetRecordId(institutionId: string) {
  const count = await prisma.examMarkingSheet.count({ where: { institutionId } });
  return `EMS-${String(1000 + count + 1)}`;
}

function studentFullName(s: { firstName: string; lastName: string }) {
  return [s.firstName, s.lastName].filter(Boolean).join(' ').trim();
}

async function resolveTeacherProfile(institutionId: string, academicYear: string, teacherName: string) {
  return prisma.teacherAttendanceProfile.findFirst({
    where: { institutionId, academicYear, teacherName, isActive: true },
  });
}

async function syncMarkingSheetCells(
  institutionId: string,
  sheetId: string,
  assignedColumns: ExamMarksColumnKey[],
  academicYear: string,
  className: string,
  sectionName: string,
) {
  const students = await prisma.student.findMany({
    where: {
      institutionId,
      academicYear,
      className,
      sectionName,
      status: StudentStatus.ACTIVE,
    },
    orderBy: [{ admissionNumber: 'asc' }],
  });

  const existing = await prisma.examStudentMarkCell.findMany({ where: { sheetId } });
  const existingKeys = new Set(existing.map((e) => `${e.studentId}:${e.columnKey}`));

  const toCreate: {
    institutionId: string;
    sheetId: string;
    studentId: string;
    columnKey: ExamMarksColumnKey;
    maxMarks: number;
  }[] = [];

  for (const student of students) {
    for (const col of assignedColumns) {
      const key = `${student.id}:${col}`;
      if (existingKeys.has(key)) continue;
      const def = COLUMN_MAP.get(col);
      if (!def) continue;
      toCreate.push({
        institutionId,
        sheetId,
        studentId: student.id,
        columnKey: col,
        maxMarks: def.maxMarks,
      });
    }
  }

  if (toCreate.length) {
    await prisma.examStudentMarkCell.createMany({ data: toCreate });
  }

  return students.length;
}

async function createMarkingSheetForAssignment(
  institutionId: string,
  assignment: {
    id: string;
    academicYear: string;
    examinationName: string;
    className: string;
    sectionName: string;
    subjectName: string;
    teacherName: string;
    assignedColumns: ExamMarksColumnKey[];
  },
) {
  const existing = await prisma.examMarkingSheet.findUnique({ where: { assignmentId: assignment.id } });
  if (existing) {
    const count = await syncMarkingSheetCells(
      institutionId,
      existing.id,
      assignment.assignedColumns,
      assignment.academicYear,
      assignment.className,
      assignment.sectionName,
    );
    return { sheet: existing, studentCount: count };
  }

  const recordId = await nextSheetRecordId(institutionId);
  const sheet = await prisma.examMarkingSheet.create({
    data: {
      institutionId,
      recordId,
      assignmentId: assignment.id,
      academicYear: assignment.academicYear,
      examinationName: assignment.examinationName,
      className: assignment.className,
      sectionName: assignment.sectionName,
      subjectName: assignment.subjectName,
      teacherName: assignment.teacherName,
    },
  });

  const studentCount = await syncMarkingSheetCells(
    institutionId,
    sheet.id,
    assignment.assignedColumns,
    assignment.academicYear,
    assignment.className,
    assignment.sectionName,
  );

  return { sheet, studentCount };
}

function serializeAssignment(a: {
  id: string;
  recordId: string;
  academicYear: string;
  className: string;
  sectionName: string;
  subjectName: string;
  teacherName: string;
  teacherEmail: string;
  teacherPhone: string;
  assignedColumns: ExamMarksColumnKey[];
  examinationName: string;
  studentCount: number;
  createdAt: Date;
  markingSheets?: { id: string; status: ExamMarkingSheetStatus; submittedAt: Date | null }[];
}) {
  const sheet = a.markingSheets?.[0];
  return {
    id: a.id,
    recordId: a.recordId,
    academicYear: a.academicYear,
    className: a.className,
    sectionName: a.sectionName,
    classGroup: a.sectionName ? `${a.className} — ${a.sectionName}` : a.className,
    subjectName: a.subjectName,
    teacherName: a.teacherName,
    teacherEmail: a.teacherEmail,
    teacherPhone: a.teacherPhone,
    assignedColumns: a.assignedColumns,
    assignedColumnLabels: a.assignedColumns.map((k) => COLUMN_MAP.get(k)?.label || k),
    examinationName: a.examinationName,
    studentCount: a.studentCount,
    sheetId: sheet?.id ?? null,
    sheetStatus: sheet?.status ?? null,
    submittedAt: sheet?.submittedAt?.toISOString() ?? null,
    createdAt: a.createdAt.toISOString(),
  };
}

export async function getMarksEntryMeta(institutionId: string) {
  const filters = await getInstitutionFilterMeta(institutionId);
  const [teachers, subjects] = await Promise.all([
    prisma.teacherAttendanceProfile.findMany({
      where: { institutionId, academicYear: filters.defaultAcademicYear, isActive: true },
      orderBy: [{ teacherName: 'asc' }],
      select: { id: true, teacherName: true, email: true, mobile: true, department: true },
    }),
    prisma.academicSubject.findMany({
      where: { institutionId },
      orderBy: [{ subjectName: 'asc' }],
      select: { subjectName: true },
    }),
  ]);

  return {
    defaultAcademicYear: filters.defaultAcademicYear,
    academicYears: filters.academicYears,
    classes: filters.classes,
    sectionsByClass: filters.sectionsByClass,
    subjects: [...new Set(subjects.map((s) => s.subjectName))],
    teachers,
    columns: MARKS_COLUMNS,
    totalMaxMarks: TOTAL_MAX_MARKS,
    bulkTemplateColumns: [
      'academicYear', 'className', 'sectionName', 'subjectName',
      'teacherName', 'teacherEmail', 'teacherPhone', 'examinationName', 'assignedColumns',
    ],
  };
}

export async function listSubjectTeacherAssignments(institutionId: string, academicYear?: string) {
  const year = academicYear || '2025-26';
  const rows = await prisma.examSubjectTeacherAssignment.findMany({
    where: { institutionId, academicYear: year },
    orderBy: [{ className: 'asc' }, { sectionName: 'asc' }, { subjectName: 'asc' }],
    include: { markingSheets: { select: { id: true, status: true, submittedAt: true } } },
  });
  return { academicYear: year, assignments: rows.map(serializeAssignment) };
}

export async function createSubjectTeacherAssignment(
  institutionId: string,
  data: {
    academicYear: string;
    className: string;
    sectionName: string;
    subjectName: string;
    teacherName: string;
    teacherEmail?: string;
    teacherPhone?: string;
    assignedColumns: ExamMarksColumnKey[];
    examinationName?: string;
    createdBy?: string;
  },
) {
  if (!data.assignedColumns.length) throw new Error('At least one marks column must be assigned');

  const teacher = await resolveTeacherProfile(institutionId, data.academicYear, data.teacherName);
  const recordId = await nextAssignmentRecordId(institutionId);

  const assignment = await prisma.examSubjectTeacherAssignment.create({
    data: {
      institutionId,
      recordId,
      academicYear: data.academicYear,
      className: data.className.trim(),
      sectionName: data.sectionName.trim(),
      subjectName: data.subjectName.trim(),
      teacherProfileId: teacher?.id ?? null,
      teacherName: data.teacherName.trim(),
      teacherEmail: data.teacherEmail?.trim() || teacher?.email || '',
      teacherPhone: data.teacherPhone?.trim() || teacher?.mobile || '',
      assignedColumns: data.assignedColumns,
      examinationName: data.examinationName?.trim() || 'Annual Examination',
      createdBy: data.createdBy || 'Admin',
    },
  });

  const { studentCount } = await createMarkingSheetForAssignment(institutionId, assignment);
  await prisma.examSubjectTeacherAssignment.update({
    where: { id: assignment.id },
    data: { studentCount },
  });

  return getSubjectTeacherAssignment(institutionId, assignment.id);
}

export async function updateSubjectTeacherAssignment(
  institutionId: string,
  assignmentId: string,
  data: {
    teacherName?: string;
    teacherEmail?: string;
    teacherPhone?: string;
    assignedColumns?: ExamMarksColumnKey[];
    examinationName?: string;
  },
) {
  const assignment = await prisma.examSubjectTeacherAssignment.findFirst({
    where: { institutionId, id: assignmentId },
    include: { markingSheets: true },
  });
  if (!assignment) throw new Error('Assignment not found');
  if (assignment.markingSheets[0]?.status === ExamMarkingSheetStatus.SUBMITTED) {
    throw new Error('Cannot modify assignment after marks are submitted');
  }

  const teacherName = data.teacherName?.trim() || assignment.teacherName;
  const teacher = await resolveTeacherProfile(institutionId, assignment.academicYear, teacherName);
  const assignedColumns = data.assignedColumns ?? assignment.assignedColumns;

  const updated = await prisma.examSubjectTeacherAssignment.update({
    where: { id: assignment.id },
    data: {
      teacherName,
      teacherProfileId: teacher?.id ?? assignment.teacherProfileId,
      teacherEmail: data.teacherEmail?.trim() ?? assignment.teacherEmail,
      teacherPhone: data.teacherPhone?.trim() ?? assignment.teacherPhone,
      assignedColumns,
      examinationName: data.examinationName?.trim() ?? assignment.examinationName,
    },
  });

  const sheet = assignment.markingSheets[0];
  if (sheet) {
    const studentCount = await syncMarkingSheetCells(
      institutionId,
      sheet.id,
      assignedColumns,
      updated.academicYear,
      updated.className,
      updated.sectionName,
    );
    await prisma.examSubjectTeacherAssignment.update({
      where: { id: updated.id },
      data: { studentCount },
    });
  } else {
    await createMarkingSheetForAssignment(institutionId, updated);
  }

  return getSubjectTeacherAssignment(institutionId, assignmentId);
}

export async function getSubjectTeacherAssignment(institutionId: string, assignmentId: string) {
  const row = await prisma.examSubjectTeacherAssignment.findFirst({
    where: { institutionId, id: assignmentId },
    include: { markingSheets: { select: { id: true, status: true, submittedAt: true } } },
  });
  if (!row) throw new Error('Assignment not found');
  return { assignment: serializeAssignment(row) };
}

export type BulkAssignmentRow = {
  academicYear: string;
  className: string;
  sectionName: string;
  subjectName: string;
  teacherName: string;
  teacherEmail?: string;
  teacherPhone?: string;
  examinationName?: string;
  assignedColumns: string;
};

export async function bulkUploadSubjectTeacherAssignments(
  institutionId: string,
  rows: BulkAssignmentRow[],
  createdBy?: string,
) {
  const errors: { row: number; message: string }[] = [];
  let created = 0;
  let updated = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;
    try {
      if (!row.className?.trim()) throw new Error('className is required');
      if (!row.sectionName?.trim()) throw new Error('sectionName is required');
      if (!row.subjectName?.trim()) throw new Error('subjectName is required');
      if (!row.teacherName?.trim()) throw new Error('teacherName is required');
      const cols = parseColumnKeysFromString(row.assignedColumns || '');
      if (!cols.length) throw new Error('assignedColumns is invalid or empty');

      const existing = await prisma.examSubjectTeacherAssignment.findFirst({
        where: {
          institutionId,
          academicYear: row.academicYear || '2025-26',
          className: row.className.trim(),
          sectionName: row.sectionName.trim(),
          subjectName: row.subjectName.trim(),
          teacherName: row.teacherName.trim(),
        },
      });

      if (existing) {
        await updateSubjectTeacherAssignment(institutionId, existing.id, {
          teacherEmail: row.teacherEmail,
          teacherPhone: row.teacherPhone,
          assignedColumns: cols,
          examinationName: row.examinationName,
        });
        updated += 1;
      } else {
        await createSubjectTeacherAssignment(institutionId, {
          academicYear: row.academicYear || '2025-26',
          className: row.className,
          sectionName: row.sectionName,
          subjectName: row.subjectName,
          teacherName: row.teacherName,
          teacherEmail: row.teacherEmail,
          teacherPhone: row.teacherPhone,
          assignedColumns: cols,
          examinationName: row.examinationName,
          createdBy,
        });
        created += 1;
      }
    } catch (e) {
      errors.push({ row: rowNum, message: e instanceof Error ? e.message : 'Invalid row' });
    }
  }

  return { created, updated, errors, total: rows.length };
}

function buildStudentRow(
  student: { id: string; firstName: string; lastName: string; admissionNumber: string },
  cells: {
    columnKey: ExamMarksColumnKey;
    maxMarks: number;
    marksObtained: number | null;
    isAbsent: boolean;
    graceMarks: number;
    remarks: string;
    grade: string;
    examinerObservations: string;
  }[],
  enabledColumns: ExamMarksColumnKey[],
) {
  const cellMap = new Map(cells.map((c) => [c.columnKey, c]));
  const columnValues = MARKS_COLUMNS.map((col) => {
    const enabled = enabledColumns.includes(col.key);
    const cell = cellMap.get(col.key);
    return {
      key: col.key,
      label: col.label,
      maxMarks: col.maxMarks,
      enabled,
      marksObtained: cell?.marksObtained ?? null,
      isAbsent: cell?.isAbsent ?? false,
      graceMarks: cell?.graceMarks ?? 0,
      remarks: cell?.remarks ?? '',
      grade: cell?.grade ?? '',
      examinerObservations: cell?.examinerObservations ?? '',
    };
  });

  const totalObtained = columnValues.reduce((sum, c) => {
    if (!c.enabled || c.isAbsent) return sum;
    return sum + (c.marksObtained ?? 0) + c.graceMarks;
  }, 0);

  const totalMax = columnValues.filter((c) => c.enabled).reduce((s, c) => s + c.maxMarks, 0);
  const pct = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;

  return {
    studentId: student.id,
    studentName: studentFullName(student),
    admissionNumber: student.admissionNumber,
    columns: columnValues,
    totalObtained: Math.round(totalObtained * 100) / 100,
    totalMax,
    overallGrade: computeGrade(pct),
  };
}

export async function getMarkingSheet(institutionId: string, sheetId: string) {
  const sheet = await prisma.examMarkingSheet.findFirst({
    where: { institutionId, id: sheetId },
    include: {
      assignment: true,
      cells: true,
    },
  });
  if (!sheet) throw new Error('Marking sheet not found');

  const students = await prisma.student.findMany({
    where: {
      institutionId,
      academicYear: sheet.academicYear,
      className: sheet.className,
      sectionName: sheet.sectionName,
      status: StudentStatus.ACTIVE,
    },
    orderBy: [{ admissionNumber: 'asc' }],
  });

  const cellsByStudent = new Map<string, typeof sheet.cells>();
  for (const cell of sheet.cells) {
    const list = cellsByStudent.get(cell.studentId) || [];
    list.push(cell);
    cellsByStudent.set(cell.studentId, list);
  }

  const enabledColumns = sheet.assignment.assignedColumns;
  const enabledColumnDefs = MARKS_COLUMNS.filter((c) => enabledColumns.includes(c.key));
  const enabledMaxTotal = enabledColumnDefs.reduce((s, c) => s + c.maxMarks, 0);

  const rows = students.map((s) =>
    buildStudentRow(s, cellsByStudent.get(s.id) || [], enabledColumns),
  );

  return {
    sheet: {
      id: sheet.id,
      recordId: sheet.recordId,
      assignmentId: sheet.assignmentId,
      examinationName: sheet.examinationName,
      academicYear: sheet.academicYear,
      className: sheet.className,
      sectionName: sheet.sectionName,
      classGroup: sheet.sectionName ? `${sheet.className} — ${sheet.sectionName}` : sheet.className,
      subjectName: sheet.subjectName,
      teacherName: sheet.teacherName,
      status: sheet.status,
      submittedAt: sheet.submittedAt?.toISOString() ?? null,
      pdfGeneratedAt: sheet.pdfGeneratedAt?.toISOString() ?? null,
      isSubmitted: LOCKED_STATUSES.includes(sheet.status),
      isLocked: sheet.status === ExamMarkingSheetStatus.LOCKED || sheet.status === ExamMarkingSheetStatus.APPROVED,
      isReturned: sheet.status === ExamMarkingSheetStatus.RETURNED,
    },
    assignment: serializeAssignment(sheet.assignment),
    columns: MARKS_COLUMNS.map((c) => ({
      ...c,
      enabled: enabledColumns.includes(c.key),
    })),
    enabledMaxTotal,
    allMaxTotal: TOTAL_MAX_MARKS,
    rows,
  };
}

export async function saveMarkingDraft(
  institutionId: string,
  sheetId: string,
  entries: {
    studentId: string;
    columnKey: ExamMarksColumnKey;
    marksObtained?: number | null;
    isAbsent?: boolean;
    graceMarks?: number;
    remarks?: string;
    grade?: string;
    examinerObservations?: string;
  }[],
) {
  const sheet = await prisma.examMarkingSheet.findFirst({
    where: { institutionId, id: sheetId },
    include: { assignment: true },
  });
  if (!sheet) throw new Error('Marking sheet not found');
  if (LOCKED_STATUSES.includes(sheet.status)) {
    throw new Error('Marks are locked — contact principal to reopen');
  }

  const allowed = new Set(sheet.assignment.assignedColumns);
  let updated = 0;

  for (const entry of entries) {
    if (!allowed.has(entry.columnKey)) continue;
    const col = COLUMN_MAP.get(entry.columnKey);
    if (!col) continue;

    const marks = entry.marksObtained;
    if (marks != null && marks > col.maxMarks) {
      throw new Error(`Marks for ${col.label} cannot exceed ${col.maxMarks}`);
    }

    await prisma.examStudentMarkCell.upsert({
      where: {
        sheetId_studentId_columnKey: {
          sheetId,
          studentId: entry.studentId,
          columnKey: entry.columnKey,
        },
      },
      create: {
        institutionId,
        sheetId,
        studentId: entry.studentId,
        columnKey: entry.columnKey,
        maxMarks: col.maxMarks,
        marksObtained: entry.isAbsent ? null : marks ?? null,
        isAbsent: entry.isAbsent ?? false,
        graceMarks: entry.graceMarks ?? 0,
        remarks: entry.remarks ?? '',
        grade: entry.grade ?? '',
        examinerObservations: entry.examinerObservations ?? '',
      },
      update: {
        marksObtained: entry.isAbsent ? null : marks ?? null,
        isAbsent: entry.isAbsent ?? false,
        graceMarks: entry.graceMarks ?? 0,
        remarks: entry.remarks ?? '',
        grade: entry.grade ?? '',
        examinerObservations: entry.examinerObservations ?? '',
      },
    });
    updated += 1;
  }

  return {
    sheet: (await getMarkingSheet(institutionId, sheetId)).sheet,
    updated,
    message: `Draft saved — ${updated} cell(s) updated`,
  };
}

async function updateMarksEntryProgress(institutionId: string, academicYear: string, className: string) {
  const totalStudents = await prisma.student.count({
    where: { institutionId, academicYear, className, status: StudentStatus.ACTIVE },
  });
  const sheets = await prisma.examMarkingSheet.findMany({
    where: { institutionId, academicYear, className, status: ExamMarkingSheetStatus.SUBMITTED },
  });
  const marksEntered = sheets.length > 0 ? totalStudents : 0;

  await prisma.examMarksEntryProgress.upsert({
    where: {
      institutionId_academicYear_examType_className: {
        institutionId,
        academicYear,
        examType: ExamTypeFilter.FINAL_EXAMINATION,
        className,
      },
    },
    create: {
      institutionId,
      academicYear,
      examType: ExamTypeFilter.FINAL_EXAMINATION,
      className,
      totalStudents,
      marksEntered,
    },
    update: { totalStudents, marksEntered },
  });
}

export async function submitMarkingSheet(
  institutionId: string,
  sheetId: string,
  submittedBy: string,
) {
  const sheet = await prisma.examMarkingSheet.findFirst({
    where: { institutionId, id: sheetId },
    include: { assignment: true, cells: true },
  });
  if (!sheet) throw new Error('Marking sheet not found');
  if (LOCKED_STATUSES.includes(sheet.status)) {
    throw new Error('Marks already submitted — contact principal to reopen');
  }

  const now = new Date();
  await prisma.examMarkingSheet.update({
    where: { id: sheet.id },
    data: {
      status: ExamMarkingSheetStatus.SUBMITTED,
      submittedAt: now,
      submittedBy,
      pdfGeneratedAt: now,
      returnedAt: null,
      returnReason: '',
    },
  });

  await updateMarksEntryProgress(institutionId, sheet.academicYear, sheet.className);

  const full = await getMarkingSheet(institutionId, sheetId);
  return {
    ...full,
    pdfData: buildPdfPayload(full, submittedBy, now),
    message: 'Marks submitted — examiner PDF ready for download',
  };
}

function buildPdfPayload(
  sheet: Awaited<ReturnType<typeof getMarkingSheet>>,
  examinerName: string,
  submittedAt: Date,
) {
  return {
    examinationName: sheet.sheet.examinationName,
    className: sheet.sheet.className,
    sectionName: sheet.sheet.sectionName,
    subjectName: sheet.sheet.subjectName,
    examinerName,
    submittedAt: submittedAt.toISOString(),
    submittedAtDisplay: submittedAt.toLocaleString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    }),
    columns: sheet.columns.filter((c) => c.enabled),
    enabledMaxTotal: sheet.enabledMaxTotal,
    rows: sheet.rows.map((r) => ({
      studentName: r.studentName,
      admissionNumber: r.admissionNumber,
      columns: r.columns.filter((c) => c.enabled).map((c) => ({
        label: c.label,
        maxMarks: c.maxMarks,
        marksObtained: c.isAbsent ? 'AB' : (c.marksObtained ?? '—'),
        graceMarks: c.graceMarks,
      })),
      totalObtained: r.totalObtained,
      totalMax: r.totalMax,
      overallGrade: r.overallGrade,
    })),
  };
}

export async function getMobileMarkingForTeacher(
  institutionId: string,
  teacherName: string,
  academicYear?: string,
) {
  const year = academicYear || '2025-26';
  const assignments = await prisma.examSubjectTeacherAssignment.findMany({
    where: { institutionId, academicYear: year, teacherName },
    include: { markingSheets: true },
    orderBy: [{ className: 'asc' }, { subjectName: 'asc' }],
  });

  const result = [];
  for (const a of assignments) {
    const sheet = a.markingSheets[0];
    if (!sheet) continue;
    const detail = await getMarkingSheet(institutionId, sheet.id);
    result.push({
      assignment: serializeAssignment(a),
      sheet: detail.sheet,
      studentCount: detail.rows.length,
      enabledColumns: detail.columns.filter((c) => c.enabled).map((c) => c.label),
    });
  }

  return { teacherName, academicYear: year, assignments: result };
}

export async function seedMarksEntryDemo(institutionId: string, academicYear = '2025-26') {
  const existing = await prisma.examSubjectTeacherAssignment.count({ where: { institutionId, academicYear } });
  if (existing > 0) return { seeded: false, assignments: existing };

  const classSection = await prisma.academicClassSection.findFirst({
    where: { institutionId, isActive: true },
    orderBy: [{ className: 'asc' }],
  });
  if (!classSection) return { seeded: false, reason: 'No class sections found' };

  const subject = await prisma.academicSubject.findFirst({ where: { institutionId } });
  const teacher = await prisma.teacherAttendanceProfile.findFirst({
    where: { institutionId, academicYear, isActive: true },
  }) || { teacherName: classSection.classTeacher || 'Demo Teacher', email: '', mobile: '' };

  const result = await createSubjectTeacherAssignment(institutionId, {
    academicYear,
    className: classSection.className,
    sectionName: classSection.sectionName,
    subjectName: subject?.subjectName || 'Mathematics',
    teacherName: teacher.teacherName,
    teacherEmail: 'email' in teacher ? teacher.email : '',
    teacherPhone: 'mobile' in teacher ? teacher.mobile : '',
    assignedColumns: [
      ExamMarksColumnKey.UNIT_1,
      ExamMarksColumnKey.UNIT_2,
      ExamMarksColumnKey.HALF_YEARLY,
    ],
    examinationName: 'Annual Examination 2025-26',
    createdBy: 'System',
  });

  const sheetId = result.assignment.sheetId;
  if (sheetId) {
    const sheet = await getMarkingSheet(institutionId, sheetId);
    const draftEntries = sheet.rows.slice(0, 3).flatMap((row) =>
      row.columns.filter((c) => c.enabled).map((c) => ({
        studentId: row.studentId,
        columnKey: c.key as ExamMarksColumnKey,
        marksObtained: Math.round(c.maxMarks * 0.7),
      })),
    );
    if (draftEntries.length) await saveMarkingDraft(institutionId, sheetId, draftEntries);
  }

  return { seeded: true, assignmentId: result.assignment.id };
}

export { parseColumnKeys, parseColumnKeysFromString, TOTAL_MAX_MARKS };
