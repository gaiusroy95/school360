import {
  ExamResultBatchStatus,
  Prisma,
  StudentPromotionType,
  StudentStatus,
} from '@prisma/client';
import { prisma } from './prisma.js';
import { getInstitutionFilterMeta } from './students.js';

const PRE_PRIMARY_ORDER = ['Playgroup', 'Nursery', 'LKG', 'UKG', 'Pre-Primary', 'Prep'];
const PASSING_PERCENT = 36;

function extractClassNumber(className: string): number | null {
  const match = className.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

export function resolveNextAcademicYear(currentYear: string): string {
  const match = currentYear.match(/^(\d{4})-(\d{2,4})$/);
  if (!match) return currentYear;
  const start = parseInt(match[1], 10);
  const endPart = match[2];
  const end = endPart.length === 2 ? 2000 + parseInt(endPart, 10) : parseInt(endPart, 10);
  return `${start + 1}-${String(end + 1).slice(-2)}`;
}

export function resolveNextClass(className: string, allClasses: string[]): {
  nextClass: string;
  promotionType: StudentPromotionType;
} {
  const num = extractClassNumber(className);
  if (num === 12) {
    return { nextClass: 'Passout', promotionType: StudentPromotionType.PASSED_OUT };
  }

  if (num !== null) {
    const nextNum = num + 1;
    const exact = allClasses.find((c) => extractClassNumber(c) === nextNum);
    if (exact) return { nextClass: exact, promotionType: StudentPromotionType.PROMOTED };
    return { nextClass: `Class ${nextNum}`, promotionType: StudentPromotionType.PROMOTED };
  }

  const lower = className.toLowerCase();
  const preIdx = PRE_PRIMARY_ORDER.findIndex((p) => lower.includes(p.toLowerCase()));
  if (preIdx >= 0 && preIdx < PRE_PRIMARY_ORDER.length - 1) {
    const next = PRE_PRIMARY_ORDER[preIdx + 1];
    const match = allClasses.find((c) => c.toLowerCase().includes(next.toLowerCase()));
    return { nextClass: match || next, promotionType: StudentPromotionType.PROMOTED };
  }
  if (preIdx === PRE_PRIMARY_ORDER.length - 1) {
    const class1 = allClasses.find((c) => extractClassNumber(c) === 1) || 'Class 1';
    return { nextClass: class1, promotionType: StudentPromotionType.PROMOTED };
  }

  return { nextClass: className, promotionType: StudentPromotionType.RETAINED };
}

async function nextPromotionBatchRecordId(institutionId: string) {
  const count = await prisma.examGradePromotionBatch.count({ where: { institutionId } });
  return `GPB-${String(1000 + count + 1)}`;
}

function serializeEligibleStudent(row: {
  studentId: string;
  studentResultId: string;
  batchId: string;
  studentName: string;
  admissionNumber: string;
  rollNumber: string;
  className: string;
  sectionName: string;
  academicYear: string;
  examinationName: string;
  percentage: number;
  grade: string;
  remarks: string;
  fatherName: string;
  motherName: string;
  alreadyPromoted: boolean;
  nextClass: string;
  nextSection: string;
  promotionType: StudentPromotionType;
}) {
  return {
    studentId: row.studentId,
    studentResultId: row.studentResultId,
    batchId: row.batchId,
    studentName: row.studentName,
    admissionNumber: row.admissionNumber,
    rollNumber: row.rollNumber,
    className: row.className,
    sectionName: row.sectionName,
    classGroup: row.sectionName ? `${row.className} — ${row.sectionName}` : row.className,
    academicYear: row.academicYear,
    examinationName: row.examinationName,
    percentage: row.percentage,
    grade: row.grade,
    remarks: row.remarks,
    fatherName: row.fatherName,
    motherName: row.motherName,
    alreadyPromoted: row.alreadyPromoted,
    nextClass: row.nextClass,
    nextSection: row.nextSection,
    promotionType: row.promotionType,
    status: row.alreadyPromoted ? 'PROMOTED' : row.remarks === 'Pass' || row.percentage >= PASSING_PERCENT ? 'PASSED' : 'FAILED',
  };
}

export async function getGradePromotionMeta(institutionId: string) {
  const filters = await getInstitutionFilterMeta(institutionId);
  const nextSession = resolveNextAcademicYear(filters.defaultAcademicYear);

  const [passedCount, promotedCount, batches] = await Promise.all([
    prisma.examStudentResult.count({
      where: {
        institutionId,
        batch: { academicYear: filters.defaultAcademicYear, status: ExamResultBatchStatus.PUBLISHED },
        percentage: { gte: PASSING_PERCENT },
      },
    }),
    prisma.studentSessionHistory.count({
      where: { institutionId, fromAcademicYear: filters.defaultAcademicYear },
    }),
    prisma.examGradePromotionBatch.count({
      where: { institutionId, fromAcademicYear: filters.defaultAcademicYear },
    }),
  ]);

  return {
    defaultAcademicYear: filters.defaultAcademicYear,
    nextAcademicYear: nextSession,
    academicYears: filters.academicYears,
    classes: filters.classes,
    sectionsByClass: filters.sectionsByClass,
    summary: { passedStudents: passedCount, promotedStudents: promotedCount, promotionBatches: batches },
  };
}

export async function listEligiblePassedStudents(
  institutionId: string,
  opts?: { academicYear?: string; className?: string; sectionName?: string },
) {
  const year = opts?.academicYear || '2025-26';
  const filters = await getInstitutionFilterMeta(institutionId);

  const batches = await prisma.examResultBatch.findMany({
    where: {
      institutionId,
      academicYear: year,
      status: ExamResultBatchStatus.PUBLISHED,
      ...(opts?.className ? { className: opts.className } : {}),
      ...(opts?.sectionName ? { sectionName: opts.sectionName } : {}),
    },
    include: {
      studentResults: {
        include: {
          student: {
            select: {
              id: true, rollNumber: true, fatherName: true, motherName: true,
              fatherMobile: true, motherMobile: true, className: true, sectionName: true,
            },
          },
        },
      },
    },
  });

  const promotedStudentIds = new Set(
    (await prisma.studentSessionHistory.findMany({
      where: { institutionId, fromAcademicYear: year },
      select: { studentId: true },
    })).map((h) => h.studentId),
  );

  const eligible: ReturnType<typeof serializeEligibleStudent>[] = [];

  for (const batch of batches) {
    for (const result of batch.studentResults) {
      if (result.percentage < PASSING_PERCENT && result.remarks !== 'Pass') continue;

      const { nextClass, promotionType } = resolveNextClass(batch.className, filters.classes);
      eligible.push(serializeEligibleStudent({
        studentId: result.studentId,
        studentResultId: result.id,
        batchId: batch.id,
        studentName: result.studentName,
        admissionNumber: result.admissionNumber,
        rollNumber: result.student.rollNumber,
        className: batch.className,
        sectionName: batch.sectionName,
        academicYear: year,
        examinationName: batch.examinationName,
        percentage: result.percentage,
        grade: result.grade,
        remarks: result.remarks,
        fatherName: result.student.fatherName,
        motherName: result.student.motherName,
        alreadyPromoted: promotedStudentIds.has(result.studentId),
        nextClass,
        nextSection: batch.sectionName,
        promotionType,
      }));
    }
  }

  eligible.sort((a, b) => a.studentName.localeCompare(b.studentName));

  return {
    academicYear: year,
    nextAcademicYear: resolveNextAcademicYear(year),
    students: eligible,
    summary: {
      total: eligible.length,
      passed: eligible.filter((s) => s.status === 'PASSED').length,
      alreadyPromoted: eligible.filter((s) => s.alreadyPromoted).length,
      pending: eligible.filter((s) => !s.alreadyPromoted).length,
    },
  };
}

export async function promoteStudents(
  institutionId: string,
  data: {
    studentIds: string[];
    fromAcademicYear: string;
    toAcademicYear: string;
    fromClassName: string;
    fromSectionName: string;
    toClassName?: string;
    toSectionName?: string;
    remarks?: string;
  },
  actor: string,
) {
  if (!data.studentIds.length) throw new Error('Select at least one student to promote');

  const filters = await getInstitutionFilterMeta(institutionId);
  const eligible = await listEligiblePassedStudents(institutionId, {
    academicYear: data.fromAcademicYear,
    className: data.fromClassName,
    sectionName: data.fromSectionName,
  });

  const toPromote = eligible.students.filter(
    (s) => data.studentIds.includes(s.studentId) && !s.alreadyPromoted,
  );

  if (!toPromote.length) {
    throw new Error('No eligible students to promote (already promoted or not passed)');
  }

  const defaultNext = resolveNextClass(data.fromClassName, filters.classes);
  const toClassName = data.toClassName || defaultNext.nextClass;
  const toSectionName = data.toSectionName || data.fromSectionName;
  const recordId = await nextPromotionBatchRecordId(institutionId);
  const now = new Date();

  const promotionBatch = await prisma.examGradePromotionBatch.create({
    data: {
      institutionId,
      recordId,
      fromAcademicYear: data.fromAcademicYear,
      toAcademicYear: data.toAcademicYear,
      fromClassName: data.fromClassName,
      fromSectionName: data.fromSectionName,
      toClassName,
      toSectionName,
      studentCount: toPromote.length,
      promotedBy: actor,
      remarks: data.remarks?.trim() || '',
    },
  });

  const promoted: string[] = [];

  for (const item of toPromote) {
    const student = await prisma.student.findFirst({ where: { institutionId, id: item.studentId } });
    if (!student) continue;

    const result = await prisma.examStudentResult.findFirst({
      where: { institutionId, id: item.studentResultId },
      include: { batch: true },
    });

    const itemNext = resolveNextClass(student.className, filters.classes);
    const studentToClass = data.toClassName || itemNext.nextClass;
    const promotionType = itemNext.promotionType;

    const parentSnapshot = {
      fatherName: student.fatherName,
      fatherMobile: student.fatherMobile,
      motherName: student.motherName,
      motherMobile: student.motherMobile,
    };

    const resultSnapshot = result ? {
      examinationName: result.batch.examinationName,
      percentage: result.percentage,
      grade: result.grade,
      gpa: result.gpa,
      rank: result.rank,
      subjectScores: result.subjectScores,
    } : {};

    await prisma.studentSessionHistory.create({
      data: {
        institutionId,
        studentId: student.id,
        batchId: item.batchId,
        promotionBatchId: promotionBatch.id,
        fromAcademicYear: data.fromAcademicYear,
        toAcademicYear: data.toAcademicYear,
        fromClassName: student.className,
        fromSectionName: student.sectionName,
        toClassName: studentToClass,
        toSectionName: toSectionName,
        promotionType,
        finalPercentage: item.percentage,
        finalGrade: item.grade,
        resultSnapshot,
        parentSnapshot,
        remarks: data.remarks?.trim() || `Promoted from ${student.className} to ${studentToClass}`,
        promotedBy: actor,
        promotedAt: now,
      },
    });

    const customFields = (student.customFields || {}) as Record<string, unknown>;
    const existingHistory = Array.isArray(customFields.sessionHistory)
      ? customFields.sessionHistory as Record<string, unknown>[]
      : [];

    existingHistory.unshift({
      fromAcademicYear: data.fromAcademicYear,
      toAcademicYear: data.toAcademicYear,
      fromClass: student.className,
      fromSection: student.sectionName,
      toClass: studentToClass,
      toSection: toSectionName,
      percentage: item.percentage,
      grade: item.grade,
      promotedAt: now.toISOString(),
      promotedBy: actor,
    });

    const updatedCustomFields = JSON.parse(JSON.stringify({
      ...customFields,
      sessionHistory: existingHistory,
    })) as Prisma.InputJsonValue;

    if (promotionType === StudentPromotionType.PASSED_OUT) {
      await prisma.student.update({
        where: { id: student.id },
        data: {
          status: StudentStatus.PASSOUT,
          academicYear: data.toAcademicYear,
          className: 'Passout',
          sectionName: '',
          customFields: updatedCustomFields,
        },
      });
    } else {
      await prisma.student.update({
        where: { id: student.id },
        data: {
          academicYear: data.toAcademicYear,
          className: studentToClass,
          sectionName: toSectionName,
          customFields: updatedCustomFields,
        },
      });
    }

    promoted.push(student.id);
  }

  await prisma.examResultAuditLog.create({
    data: {
      institutionId,
      entityType: 'GRADE_PROMOTION',
      entityId: promotionBatch.id,
      action: 'PROMOTED',
      actor,
      details: `Promoted ${promoted.length} students from ${data.fromClassName} ${data.fromSectionName} to ${toClassName} (${data.toAcademicYear})`,
    },
  });

  return {
    batch: {
      id: promotionBatch.id,
      recordId: promotionBatch.recordId,
      fromAcademicYear: data.fromAcademicYear,
      toAcademicYear: data.toAcademicYear,
      fromClassName: data.fromClassName,
      fromSectionName: data.fromSectionName,
      toClassName,
      toSectionName,
      studentCount: promoted.length,
      promotedAt: now.toISOString(),
    },
    promoted: promoted.length,
    studentIds: promoted,
    message: `${promoted.length} student(s) promoted to ${toClassName} for session ${data.toAcademicYear}`,
  };
}

export async function listPromotionBatches(institutionId: string, academicYear?: string) {
  const year = academicYear || '2025-26';
  const batches = await prisma.examGradePromotionBatch.findMany({
    where: { institutionId, fromAcademicYear: year },
    orderBy: [{ promotedAt: 'desc' }],
    include: { _count: { select: { sessionHistories: true } } },
  });

  return {
    academicYear: year,
    batches: batches.map((b) => ({
      id: b.id,
      recordId: b.recordId,
      fromAcademicYear: b.fromAcademicYear,
      toAcademicYear: b.toAcademicYear,
      fromClassName: b.fromClassName,
      fromSectionName: b.fromSectionName,
      toClassName: b.toClassName,
      toSectionName: b.toSectionName,
      classGroup: `${b.fromClassName} — ${b.fromSectionName} → ${b.toClassName} — ${b.toSectionName}`,
      studentCount: b.studentCount,
      promotedBy: b.promotedBy,
      promotedAt: b.promotedAt.toISOString(),
      remarks: b.remarks,
    })),
  };
}

export async function getStudentSessionHistory(institutionId: string, studentId: string) {
  const records = await prisma.studentSessionHistory.findMany({
    where: { institutionId, studentId },
    orderBy: [{ promotedAt: 'desc' }],
  });

  return {
    history: records.map((r) => ({
      id: r.id,
      fromAcademicYear: r.fromAcademicYear,
      toAcademicYear: r.toAcademicYear,
      fromClassName: r.fromClassName,
      fromSectionName: r.fromSectionName,
      toClassName: r.toClassName,
      toSectionName: r.toSectionName,
      classGroup: `${r.fromClassName} ${r.fromSectionName} → ${r.toClassName} ${r.toSectionName}`,
      promotionType: r.promotionType,
      finalPercentage: r.finalPercentage,
      finalGrade: r.finalGrade,
      resultSnapshot: r.resultSnapshot,
      parentSnapshot: r.parentSnapshot,
      remarks: r.remarks,
      promotedAt: r.promotedAt.toISOString(),
      promotedBy: r.promotedBy,
    })),
  };
}

export async function seedGradePromotionDemo(institutionId: string, academicYear = '2025-26') {
  const eligible = await listEligiblePassedStudents(institutionId, { academicYear });
  if (!eligible.students.length) {
    return { seeded: false, reason: 'No passed students with published results' };
  }

  const pending = eligible.students.filter((s) => !s.alreadyPromoted);
  if (!pending.length) {
    return { seeded: true, message: 'Demo data already exists — all passed students promoted' };
  }

  const first = pending[0];
  return {
    seeded: true,
    message: `${pending.length} students ready for promotion`,
    sample: first,
  };
}
