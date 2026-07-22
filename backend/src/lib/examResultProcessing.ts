import {
  ExamMarkingSheetStatus,
  ExamResultBatchStatus,
  ExamResultPublishMode,
  ParentRelationship,
  StudentStatus,
} from '@prisma/client';
import { prisma } from './prisma.js';
import { getInstitutionFilterMeta } from './students.js';
import { dispatchPushNotifications } from './notifications.js';
import { autoRecordCommunication } from './parentCommunications.js';
import { assertClassReadyForPublication, resolveReportCardTemplate } from './examReportCards.js';
import { ExamReportCardStatus, ExamReportCardTemplate } from '@prisma/client';

function computeGrade(pct: number) {
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B+';
  if (pct >= 60) return 'B';
  if (pct >= 50) return 'C';
  if (pct >= 36) return 'D';
  return 'F';
}

function computeGpa(pct: number) {
  if (pct >= 90) return 10;
  if (pct >= 80) return 9;
  if (pct >= 70) return 8;
  if (pct >= 60) return 7;
  if (pct >= 50) return 6;
  if (pct >= 36) return 5;
  return 0;
}

function overallPerformance(pct: number) {
  if (pct >= 90) return 'Outstanding';
  if (pct >= 75) return 'Excellent';
  if (pct >= 60) return 'Good';
  if (pct >= 36) return 'Satisfactory';
  return 'Needs Improvement';
}

async function nextBatchRecordId(institutionId: string) {
  const count = await prisma.examResultBatch.count({ where: { institutionId } });
  return `ERB-${String(1000 + count + 1)}`;
}

async function logAudit(
  institutionId: string,
  data: {
    entityType: string;
    entityId: string;
    action: string;
    actor: string;
    details?: string;
    sheetId?: string;
    batchId?: string;
  },
) {
  await prisma.examResultAuditLog.create({
    data: {
      institutionId,
      entityType: data.entityType,
      entityId: data.entityId,
      action: data.action,
      actor: data.actor,
      details: data.details || '',
      sheetId: data.sheetId,
      batchId: data.batchId,
    },
  });
}

function serializeSheet(s: {
  id: string;
  recordId: string;
  academicYear: string;
  examinationName: string;
  className: string;
  sectionName: string;
  subjectName: string;
  teacherName: string;
  status: ExamMarkingSheetStatus;
  submittedAt: Date | null;
  submittedBy: string;
  principalApprovedAt: Date | null;
  principalApprovedBy: string;
  principalRemarks: string;
  returnedAt: Date | null;
  returnReason: string;
  lockedAt: Date | null;
  _count?: { cells: number };
}) {
  return {
    id: s.id,
    recordId: s.recordId,
    academicYear: s.academicYear,
    examinationName: s.examinationName,
    className: s.className,
    sectionName: s.sectionName,
    classGroup: s.sectionName ? `${s.className} — ${s.sectionName}` : s.className,
    subjectName: s.subjectName,
    teacherName: s.teacherName,
    status: s.status,
    submittedAt: s.submittedAt?.toISOString() ?? null,
    submittedBy: s.submittedBy,
    principalApprovedAt: s.principalApprovedAt?.toISOString() ?? null,
    principalApprovedBy: s.principalApprovedBy,
    principalRemarks: s.principalRemarks,
    returnedAt: s.returnedAt?.toISOString() ?? null,
    returnReason: s.returnReason,
    lockedAt: s.lockedAt?.toISOString() ?? null,
    isLocked: s.status === ExamMarkingSheetStatus.LOCKED || s.status === ExamMarkingSheetStatus.APPROVED,
    canApprove: s.status === ExamMarkingSheetStatus.SUBMITTED,
    canReturn: s.status === ExamMarkingSheetStatus.SUBMITTED,
    canReopen: s.status === ExamMarkingSheetStatus.APPROVED || s.status === ExamMarkingSheetStatus.LOCKED,
    cellCount: s._count?.cells ?? 0,
  };
}

function serializeBatch(b: {
  id: string;
  recordId: string;
  academicYear: string;
  examinationName: string;
  className: string;
  sectionName: string;
  status: ExamResultBatchStatus;
  publishMode: ExamResultPublishMode;
  scheduledPublishAt: Date | null;
  compiledAt: Date | null;
  publishedAt: Date | null;
  publishedBy: string;
  totalStudents: number;
  subjectsTotal: number;
  subjectsApproved: number;
  averagePercent: number;
  passPercent: number;
  _count?: { studentResults: number };
}) {
  return {
    id: b.id,
    recordId: b.recordId,
    academicYear: b.academicYear,
    examinationName: b.examinationName,
    className: b.className,
    sectionName: b.sectionName,
    classGroup: b.sectionName ? `${b.className} — ${b.sectionName}` : b.className,
    status: b.status,
    publishMode: b.publishMode,
    scheduledPublishAt: b.scheduledPublishAt?.toISOString() ?? null,
    compiledAt: b.compiledAt?.toISOString() ?? null,
    publishedAt: b.publishedAt?.toISOString() ?? null,
    publishedBy: b.publishedBy,
    totalStudents: b.totalStudents,
    subjectsTotal: b.subjectsTotal,
    subjectsApproved: b.subjectsApproved,
    averagePercent: b.averagePercent,
    passPercent: b.passPercent,
    resultCount: b._count?.studentResults ?? b.totalStudents,
    canPublish: b.status === ExamResultBatchStatus.COMPILED || b.status === ExamResultBatchStatus.SCHEDULED,
    isPublished: b.status === ExamResultBatchStatus.PUBLISHED,
  };
}

export async function getResultProcessingMeta(institutionId: string) {
  const filters = await getInstitutionFilterMeta(institutionId);
  const [pendingCount, compiledCount, publishedCount] = await Promise.all([
    prisma.examMarkingSheet.count({
      where: { institutionId, academicYear: filters.defaultAcademicYear, status: ExamMarkingSheetStatus.SUBMITTED },
    }),
    prisma.examResultBatch.count({
      where: { institutionId, academicYear: filters.defaultAcademicYear, status: ExamResultBatchStatus.COMPILED },
    }),
    prisma.examResultBatch.count({
      where: { institutionId, academicYear: filters.defaultAcademicYear, status: ExamResultBatchStatus.PUBLISHED },
    }),
  ]);

  return {
    defaultAcademicYear: filters.defaultAcademicYear,
    academicYears: filters.academicYears,
    classes: filters.classes,
    sectionsByClass: filters.sectionsByClass,
    summary: { pendingApproval: pendingCount, compiled: compiledCount, published: publishedCount },
  };
}

export async function listPendingApprovals(institutionId: string, academicYear?: string) {
  const year = academicYear || '2025-26';
  const sheets = await prisma.examMarkingSheet.findMany({
    where: {
      institutionId,
      academicYear: year,
      status: { in: [ExamMarkingSheetStatus.SUBMITTED, ExamMarkingSheetStatus.APPROVED, ExamMarkingSheetStatus.LOCKED, ExamMarkingSheetStatus.RETURNED] },
    },
    orderBy: [{ submittedAt: 'desc' }],
    include: { _count: { select: { cells: true } } },
  });
  return {
    academicYear: year,
    sheets: sheets.map(serializeSheet),
    pending: sheets.filter((s) => s.status === ExamMarkingSheetStatus.SUBMITTED).length,
    approved: sheets.filter((s) => s.status === ExamMarkingSheetStatus.APPROVED || s.status === ExamMarkingSheetStatus.LOCKED).length,
  };
}

export async function approveMarks(institutionId: string, sheetId: string, actor: string, remarks?: string) {
  const sheet = await prisma.examMarkingSheet.findFirst({ where: { institutionId, id: sheetId } });
  if (!sheet) throw new Error('Marking sheet not found');
  if (sheet.status !== ExamMarkingSheetStatus.SUBMITTED) {
    throw new Error('Only submitted marks can be approved');
  }

  const now = new Date();
  await prisma.examMarkingSheet.update({
    where: { id: sheet.id },
    data: {
      status: ExamMarkingSheetStatus.LOCKED,
      principalApprovedAt: now,
      principalApprovedBy: actor,
      principalRemarks: remarks?.trim() || '',
      lockedAt: now,
    },
  });

  await logAudit(institutionId, {
    entityType: 'MARKING_SHEET',
    entityId: sheet.id,
    action: 'PRINCIPAL_APPROVED',
    actor,
    details: remarks || 'Marks approved and locked',
    sheetId: sheet.id,
  });

  await tryCompileClassResults(institutionId, sheet.academicYear, sheet.examinationName, sheet.className, sheet.sectionName);

  return {
    sheet: serializeSheet(await prisma.examMarkingSheet.findFirstOrThrow({
      where: { id: sheet.id },
      include: { _count: { select: { cells: true } } },
    })),
    message: 'Marks approved and locked',
  };
}

export async function returnToTeacher(
  institutionId: string,
  sheetId: string,
  actor: string,
  reason: string,
) {
  const sheet = await prisma.examMarkingSheet.findFirst({ where: { institutionId, id: sheetId } });
  if (!sheet) throw new Error('Marking sheet not found');
  if (sheet.status !== ExamMarkingSheetStatus.SUBMITTED) {
    throw new Error('Only submitted marks can be returned');
  }

  const now = new Date();
  await prisma.examMarkingSheet.update({
    where: { id: sheet.id },
    data: {
      status: ExamMarkingSheetStatus.RETURNED,
      returnedAt: now,
      returnedBy: actor,
      returnReason: reason.trim(),
    },
  });

  await logAudit(institutionId, {
    entityType: 'MARKING_SHEET',
    entityId: sheet.id,
    action: 'RETURNED_TO_TEACHER',
    actor,
    details: reason,
    sheetId: sheet.id,
  });

  return {
    sheet: serializeSheet(await prisma.examMarkingSheet.findFirstOrThrow({
      where: { id: sheet.id },
      include: { _count: { select: { cells: true } } },
    })),
    message: 'Marks returned to teacher for correction',
  };
}

export async function reopenMarks(
  institutionId: string,
  sheetId: string,
  actor: string,
  reason: string,
) {
  const sheet = await prisma.examMarkingSheet.findFirst({ where: { institutionId, id: sheetId } });
  if (!sheet) throw new Error('Marking sheet not found');
  if (sheet.status !== ExamMarkingSheetStatus.LOCKED && sheet.status !== ExamMarkingSheetStatus.APPROVED) {
    throw new Error('Only locked/approved marks can be reopened');
  }

  const now = new Date();
  await prisma.examMarkingSheet.update({
    where: { id: sheet.id },
    data: {
      status: ExamMarkingSheetStatus.RETURNED,
      reopenedAt: now,
      reopenedBy: actor,
      reopenReason: reason.trim(),
      lockedAt: null,
    },
  });

  await logAudit(institutionId, {
    entityType: 'MARKING_SHEET',
    entityId: sheet.id,
    action: 'REOPENED',
    actor,
    details: reason,
    sheetId: sheet.id,
  });

  return {
    sheet: serializeSheet(await prisma.examMarkingSheet.findFirstOrThrow({
      where: { id: sheet.id },
      include: { _count: { select: { cells: true } } },
    })),
    message: 'Marks reopened for correction — audit trail recorded',
  };
}

async function tryCompileClassResults(
  institutionId: string,
  academicYear: string,
  examinationName: string,
  className: string,
  sectionName: string,
) {
  const assignments = await prisma.examSubjectTeacherAssignment.findMany({
    where: { institutionId, academicYear, className, sectionName, examinationName },
    include: { markingSheets: true },
  });
  if (!assignments.length) return null;

  const allApproved = assignments.every((a) => {
    const sheet = a.markingSheets[0];
    return sheet && (sheet.status === ExamMarkingSheetStatus.LOCKED || sheet.status === ExamMarkingSheetStatus.APPROVED);
  });
  if (!allApproved) return null;

  return compileClassResults(institutionId, academicYear, examinationName, className, sectionName);
}

export async function compileClassResults(
  institutionId: string,
  academicYear: string,
  examinationName: string,
  className: string,
  sectionName: string,
) {
  await assertClassReadyForPublication(institutionId, academicYear, className, sectionName, examinationName);

  const assignments = await prisma.examSubjectTeacherAssignment.findMany({
    where: { institutionId, academicYear, className, sectionName, examinationName },
    include: { markingSheets: { include: { cells: true } } },
  });

  const sheets = assignments.map((a) => a.markingSheets[0]).filter(Boolean);
  const approvedCount = sheets.filter((s) =>
    s.status === ExamMarkingSheetStatus.LOCKED || s.status === ExamMarkingSheetStatus.APPROVED,
  ).length;

  const students = await prisma.student.findMany({
    where: { institutionId, academicYear, className, sectionName, status: StudentStatus.ACTIVE },
    orderBy: [{ admissionNumber: 'asc' }],
  });

  let batch = await prisma.examResultBatch.findFirst({
    where: { institutionId, academicYear, examinationName, className, sectionName },
  });

  const recordId = batch?.recordId || await nextBatchRecordId(institutionId);
  if (!batch) {
    batch = await prisma.examResultBatch.create({
      data: {
        institutionId,
        recordId,
        academicYear,
        examinationName,
        className,
        sectionName,
        subjectsTotal: assignments.length,
        subjectsApproved: approvedCount,
        totalStudents: students.length,
        status: ExamResultBatchStatus.COMPILING,
      },
    });
  }

  await prisma.examStudentResult.deleteMany({ where: { batchId: batch.id } });

  const studentScores: {
    studentId: string;
    studentName: string;
    admissionNumber: string;
    subjectScores: { subjectName: string; obtained: number; max: number; grade: string }[];
    totalObtained: number;
    totalMax: number;
  }[] = [];

  for (const student of students) {
    const subjectScores: { subjectName: string; obtained: number; max: number; grade: string }[] = [];
    let totalObtained = 0;
    let totalMax = 0;

    for (const assignment of assignments) {
      const sheet = assignment.markingSheets[0];
      if (!sheet) continue;
      const cells = sheet.cells.filter((c) => c.studentId === student.id);
      const obtained = cells.reduce((sum, c) => {
        if (c.isAbsent) return sum;
        return sum + (c.marksObtained ?? 0) + c.graceMarks;
      }, 0);
      const max = cells.reduce((sum, c) => sum + c.maxMarks, 0);
      const pct = max > 0 ? (obtained / max) * 100 : 0;
      subjectScores.push({
        subjectName: assignment.subjectName,
        obtained: Math.round(obtained * 100) / 100,
        max,
        grade: computeGrade(pct),
      });
      totalObtained += obtained;
      totalMax += max;
    }

    studentScores.push({
      studentId: student.id,
      studentName: [student.firstName, student.lastName].filter(Boolean).join(' '),
      admissionNumber: student.admissionNumber,
      subjectScores,
      totalObtained: Math.round(totalObtained * 100) / 100,
      totalMax,
    });
  }

  studentScores.sort((a, b) => b.totalObtained - a.totalObtained);
  const results = studentScores.map((s, idx) => {
    const pct = s.totalMax > 0 ? (s.totalObtained / s.totalMax) * 100 : 0;
    const grade = computeGrade(pct);
    return {
      institutionId,
      batchId: batch!.id,
      studentId: s.studentId,
      studentName: s.studentName,
      admissionNumber: s.admissionNumber,
      totalObtained: s.totalObtained,
      totalMax: s.totalMax,
      percentage: Math.round(pct * 100) / 100,
      grade,
      gpa: computeGpa(pct),
      rank: idx + 1,
      remarks: pct >= 36 ? 'Pass' : 'Fail',
      overallPerformance: overallPerformance(pct),
      subjectScores: s.subjectScores,
      templateType: resolveReportCardTemplate(className),
    };
  });

  if (results.length) {
    await prisma.examStudentResult.createMany({ data: results });
  }

  const avgPct = results.length
    ? results.reduce((s, r) => s + r.percentage, 0) / results.length
    : 0;
  const passPct = results.length
    ? (results.filter((r) => r.percentage >= 36).length / results.length) * 100
    : 0;

  const now = new Date();
  const updated = await prisma.examResultBatch.update({
    where: { id: batch.id },
    data: {
      status: ExamResultBatchStatus.COMPILED,
      compiledAt: now,
      subjectsTotal: assignments.length,
      subjectsApproved: approvedCount,
      totalStudents: students.length,
      averagePercent: Math.round(avgPct * 100) / 100,
      passPercent: Math.round(passPct * 100) / 100,
    },
    include: { _count: { select: { studentResults: true } } },
  });

  await logAudit(institutionId, {
    entityType: 'RESULT_BATCH',
    entityId: batch.id,
    action: 'COMPILED',
    actor: 'System',
    details: `Compiled results for ${className} ${sectionName} — ${results.length} students`,
    batchId: batch.id,
  });

  return { batch: serializeBatch(updated), studentCount: results.length };
}

export async function listResultBatches(institutionId: string, academicYear?: string) {
  const year = academicYear || '2025-26';
  const batches = await prisma.examResultBatch.findMany({
    where: { institutionId, academicYear: year },
    orderBy: [{ className: 'asc' }, { sectionName: 'asc' }],
    include: { _count: { select: { studentResults: true } } },
  });
  return { academicYear: year, batches: batches.map(serializeBatch) };
}

export async function getResultBatch(institutionId: string, batchId: string) {
  const batch = await prisma.examResultBatch.findFirst({
    where: { institutionId, id: batchId },
    include: {
      studentResults: { orderBy: [{ rank: 'asc' }] },
      _count: { select: { studentResults: true } },
    },
  });
  if (!batch) throw new Error('Result batch not found');

  const notifications = await prisma.examResultNotification.groupBy({
    by: ['channel'],
    where: { batchId: batch.id },
    _count: { _all: true },
  });

  return {
    batch: serializeBatch(batch),
    results: batch.studentResults.map((r) => ({
      id: r.id,
      studentId: r.studentId,
      studentName: r.studentName,
      admissionNumber: r.admissionNumber,
      totalObtained: r.totalObtained,
      totalMax: r.totalMax,
      percentage: r.percentage,
      grade: r.grade,
      gpa: r.gpa,
      rank: r.rank,
      remarks: r.remarks,
      overallPerformance: r.overallPerformance,
      subjectScores: r.subjectScores,
      reportCardToken: r.reportCardToken,
    })),
    notificationSummary: notifications.map((n) => ({ channel: n.channel, count: n._count._all })),
  };
}

export async function scheduleResultPublication(
  institutionId: string,
  batchId: string,
  scheduledAt: string,
  actor: string,
) {
  const batch = await prisma.examResultBatch.findFirst({
    where: { institutionId, id: batchId },
    include: { studentResults: true },
  });
  if (!batch) throw new Error('Result batch not found');
  if (batch.status !== ExamResultBatchStatus.COMPILED) {
    throw new Error('Only compiled results can be scheduled');
  }

  await assertClassReadyForPublication(
    institutionId, batch.academicYear, batch.className, batch.sectionName, batch.examinationName,
  );

  const templateType = resolveReportCardTemplate(batch.className);
  if (templateType !== ExamReportCardTemplate.BOARD) {
    const ungenerated = batch.studentResults.filter((r) => r.reportCardStatus === ExamReportCardStatus.PENDING);
    if (ungenerated.length) {
      throw new Error(
        `Cannot schedule publication: ${ungenerated.length} report card(s) not yet generated. Generate report cards first.`,
      );
    }
  }

  const scheduled = new Date(scheduledAt);
  const updated = await prisma.examResultBatch.update({
    where: { id: batch.id },
    data: {
      status: ExamResultBatchStatus.SCHEDULED,
      publishMode: ExamResultPublishMode.AUTOMATIC,
      scheduledPublishAt: scheduled,
    },
    include: { _count: { select: { studentResults: true } } },
  });

  await logAudit(institutionId, {
    entityType: 'RESULT_BATCH',
    entityId: batch.id,
    action: 'SCHEDULED',
    actor,
    details: `Scheduled for ${scheduled.toISOString()}`,
    batchId: batch.id,
  });

  return { batch: serializeBatch(updated), message: `Publication scheduled for ${scheduled.toLocaleString('en-IN')}` };
}

async function dispatchResultNotifications(
  institutionId: string,
  batch: { id: string; examinationName: string; className: string; sectionName: string },
  results: { studentId: string; studentName: string; percentage: number; grade: string; reportCardToken: string }[],
) {
  let pushCount = 0;
  let whatsappCount = 0;
  let smsCount = 0;
  let emailCount = 0;
  const pushRecipients: { type: 'parent'; name: string; mobile?: string; email?: string }[] = [];

  const students = await prisma.student.findMany({
    where: { institutionId, id: { in: results.map((r) => r.studentId) } },
    select: {
      id: true, firstName: true, lastName: true, fatherName: true, fatherMobile: true,
      motherMobile: true, email: true,
    },
  });
  const studentMap = new Map(students.map((s) => [s.id, s]));
  const resultMap = new Map(results.map((r) => [r.studentId, r]));

  for (const student of students) {
    const result = resultMap.get(student.id);
    if (!result) continue;

    const portalLink = `/parent/results/${result.reportCardToken}`;
    const body = `Exam Results Published: ${student.firstName} ${student.lastName} scored ${result.percentage}% (Grade ${result.grade}) in ${batch.examinationName}. View report card: ${portalLink}`;

    if (student.fatherMobile) {
      await autoRecordCommunication(institutionId, {
        studentId: student.id,
        parentRelationship: ParentRelationship.FATHER,
        channel: 'WHATSAPP',
        subject: `Results — ${batch.examinationName}`,
        body,
        category: 'exam_results',
        academicData: { batchId: batch.id, reportCardToken: result.reportCardToken, channel: 'WHATSAPP' },
      });
      await prisma.examResultNotification.create({
        data: {
          institutionId, batchId: batch.id, studentId: student.id,
          channel: 'WHATSAPP', recipientName: student.fatherName || 'Parent',
          recipientMobile: student.fatherMobile, message: body,
        },
      });
      whatsappCount += 1;
    }

    if (student.email) {
      await prisma.examResultNotification.create({
        data: {
          institutionId, batchId: batch.id, studentId: student.id,
          channel: 'EMAIL', recipientName: student.fatherName || 'Parent',
          recipientEmail: student.email, message: body,
        },
      });
      emailCount += 1;
    }

    if (student.fatherMobile) {
      await prisma.examResultNotification.create({
        data: {
          institutionId, batchId: batch.id, studentId: student.id,
          channel: 'SMS', recipientName: student.fatherName || 'Parent',
          recipientMobile: student.fatherMobile, message: body.slice(0, 160),
        },
      });
      smsCount += 1;
    }

    pushRecipients.push({ type: 'parent', name: student.fatherName || 'Parent', mobile: student.fatherMobile, email: student.email });
    await autoRecordCommunication(institutionId, {
      studentId: student.id,
      parentRelationship: ParentRelationship.FATHER,
      channel: 'APP',
      subject: `Results — ${batch.examinationName}`,
      body,
      category: 'exam_results',
      academicData: { batchId: batch.id, reportCardToken: result.reportCardToken, channel: 'PUSH' },
    });
    await prisma.examResultNotification.create({
      data: {
        institutionId, batchId: batch.id, studentId: student.id,
        channel: 'PUSH', recipientName: student.fatherName || 'Parent',
        recipientMobile: student.fatherMobile || '', message: body,
      },
    });
    pushCount += 1;
  }

  await dispatchPushNotifications({
    institutionId,
    event: 'Exam Results Published',
    title: `Results — ${batch.examinationName}`,
    body: `Results for ${batch.className} ${batch.sectionName} are now available on the mobile app.`,
    recipients: pushRecipients,
  });

  return { pushCount, whatsappCount, smsCount, emailCount, total: pushCount + whatsappCount + smsCount + emailCount };
}

export async function publishResults(
  institutionId: string,
  batchId: string,
  actor: string,
) {
  const batch = await prisma.examResultBatch.findFirst({
    where: { institutionId, id: batchId },
    include: { studentResults: true },
  });
  if (!batch) throw new Error('Result batch not found');
  if (batch.status === ExamResultBatchStatus.PUBLISHED) {
    throw new Error('Results already published');
  }
  if (batch.status !== ExamResultBatchStatus.COMPILED && batch.status !== ExamResultBatchStatus.SCHEDULED) {
    throw new Error('Compile results before publishing');
  }

  await assertClassReadyForPublication(
    institutionId, batch.academicYear, batch.className, batch.sectionName, batch.examinationName,
  );

  const templateType = resolveReportCardTemplate(batch.className);
  if (templateType !== ExamReportCardTemplate.BOARD) {
    const ungenerated = batch.studentResults.filter((r) => r.reportCardStatus === ExamReportCardStatus.PENDING);
    if (ungenerated.length) {
      throw new Error(
        `Cannot publish: ${ungenerated.length} report card(s) not yet generated. Generate report cards first.`,
      );
    }
  }

  const now = new Date();
  const updated = await prisma.examResultBatch.update({
    where: { id: batch.id },
    data: {
      status: ExamResultBatchStatus.PUBLISHED,
      publishedAt: now,
      publishedBy: actor,
      publishMode: ExamResultPublishMode.MANUAL,
    },
    include: { _count: { select: { studentResults: true } } },
  });

  const notifications = await dispatchResultNotifications(
    institutionId,
    batch,
    batch.studentResults.map((r) => ({
      studentId: r.studentId,
      studentName: r.studentName,
      percentage: r.percentage,
      grade: r.grade,
      reportCardToken: r.reportCardToken,
    })),
  );

  await prisma.examStudentResult.updateMany({
    where: { batchId: batch.id },
    data: {
      reportCardStatus: ExamReportCardStatus.PUBLISHED,
      reportCardPublishedAt: now,
    },
  });

  await prisma.examDashboardStats.updateMany({
    where: { institutionId, academicYear: batch.academicYear },
    data: { reportCardsPublished: { increment: batch.studentResults.length } },
  });

  await logAudit(institutionId, {
    entityType: 'RESULT_BATCH',
    entityId: batch.id,
    action: 'PUBLISHED',
    actor,
    details: `Published — ${notifications.total} notifications sent`,
    batchId: batch.id,
  });

  await prisma.examDashboardStats.updateMany({
    where: { institutionId, academicYear: batch.academicYear },
    data: { resultsDeclared: { increment: 1 } },
  });

  return {
    batch: serializeBatch(updated),
    notifications,
    message: `Results published — ${notifications.pushCount} push, ${notifications.whatsappCount} WhatsApp sent`,
  };
}

export async function publishAllCompiledResults(institutionId: string, academicYear: string, actor: string) {
  const batches = await prisma.examResultBatch.findMany({
    where: {
      institutionId,
      academicYear,
      status: { in: [ExamResultBatchStatus.COMPILED, ExamResultBatchStatus.SCHEDULED] },
    },
  });

  const results = [];
  for (const batch of batches) {
    results.push(await publishResults(institutionId, batch.id, actor));
  }

  return {
    published: results.length,
    results,
    message: `${results.length} class result(s) published`,
  };
}

export async function runScheduledResultPublications(institutionId: string) {
  const now = new Date();
  const due = await prisma.examResultBatch.findMany({
    where: {
      institutionId,
      status: ExamResultBatchStatus.SCHEDULED,
      scheduledPublishAt: { lte: now },
    },
  });

  const results = [];
  for (const batch of due) {
    results.push(await publishResults(institutionId, batch.id, 'Auto Scheduler'));
  }

  return { published: results.length, batches: due.map((b) => b.id) };
}

export async function getAuditTrail(institutionId: string, opts?: { limit?: number; entityType?: string }) {
  const logs = await prisma.examResultAuditLog.findMany({
    where: {
      institutionId,
      ...(opts?.entityType ? { entityType: opts.entityType } : {}),
    },
    orderBy: [{ createdAt: 'desc' }],
    take: opts?.limit ?? 50,
  });

  return {
    logs: logs.map((l) => ({
      id: l.id,
      entityType: l.entityType,
      entityId: l.entityId,
      action: l.action,
      actor: l.actor,
      details: l.details,
      createdAt: l.createdAt.toISOString(),
    })),
  };
}

export async function getMobilePublishedResult(institutionId: string, token: string) {
  const result = await prisma.examStudentResult.findFirst({
    where: { institutionId, reportCardToken: token },
    include: { batch: true },
  });
  if (!result) throw new Error('Result not found');
  if (result.batch.status !== ExamResultBatchStatus.PUBLISHED) {
    throw new Error('Results not yet published');
  }

  return {
    studentName: result.studentName,
    admissionNumber: result.admissionNumber,
    examinationName: result.batch.examinationName,
    classGroup: `${result.batch.className} — ${result.batch.sectionName}`,
    academicYear: result.batch.academicYear,
    totalObtained: result.totalObtained,
    totalMax: result.totalMax,
    percentage: result.percentage,
    grade: result.grade,
    gpa: result.gpa,
    rank: result.rank,
    remarks: result.remarks,
    overallPerformance: result.overallPerformance,
    subjectScores: result.subjectScores,
    publishedAt: result.batch.publishedAt?.toISOString(),
  };
}

export async function compileBatchById(institutionId: string, batchId: string) {
  const batch = await prisma.examResultBatch.findFirst({ where: { institutionId, id: batchId } });
  if (!batch) throw new Error('Result batch not found');
  return compileClassResults(
    institutionId, batch.academicYear, batch.examinationName, batch.className, batch.sectionName,
  );
}

export async function seedResultProcessingDemo(institutionId: string, academicYear = '2025-26') {
  const submitted = await prisma.examMarkingSheet.findFirst({
    where: { institutionId, academicYear, status: ExamMarkingSheetStatus.SUBMITTED },
  });
  if (submitted) {
    await approveMarks(institutionId, submitted.id, 'Principal', 'Verified and approved');
    return { seeded: true, action: 'approved_existing' };
  }

  const locked = await prisma.examMarkingSheet.findFirst({
    where: { institutionId, academicYear, status: ExamMarkingSheetStatus.LOCKED },
  });
  if (locked) {
    await tryCompileClassResults(institutionId, locked.academicYear, locked.examinationName, locked.className, locked.sectionName);
    return { seeded: true, action: 'compiled_existing' };
  }

  return { seeded: false, reason: 'Submit marks from Marks Entry first' };
}
