import {
  ExamBackPaperStatus,
  ExamReportCardStatus,
  ExamResultBatchStatus,
  ExamRevaluationRequestType,
  ExamRevaluationStatus,
} from '@prisma/client';
import { prisma } from './prisma.js';
import { getInstitutionFilterMeta } from './students.js';

const GRACE_PERIOD_DAYS = 30;

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

async function nextRevaluationRecordId(institutionId: string) {
  const count = await prisma.examRevaluationRequest.count({ where: { institutionId } });
  return `REV-${String(1000 + count + 1)}`;
}

async function nextBackPaperRecordId(institutionId: string) {
  const count = await prisma.examBackPaperExam.count({ where: { institutionId } });
  return `BKP-${String(1000 + count + 1)}`;
}

async function getOrCreateConfig(institutionId: string, academicYear: string) {
  return prisma.examRevaluationConfig.upsert({
    where: { institutionId_academicYear: { institutionId, academicYear } },
    create: { institutionId, academicYear },
    update: {},
  });
}

async function logAudit(
  institutionId: string,
  data: { entityType: string; entityId: string; action: string; actor: string; details?: string; batchId?: string },
) {
  await prisma.examResultAuditLog.create({
    data: {
      institutionId,
      entityType: data.entityType,
      entityId: data.entityId,
      action: data.action,
      actor: data.actor,
      details: data.details || '',
      batchId: data.batchId,
    },
  });
}

function serializeRequest(r: {
  id: string;
  recordId: string;
  academicYear: string;
  examinationName: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  className: string;
  sectionName: string;
  subjectName: string;
  requestType: ExamRevaluationRequestType;
  status: ExamRevaluationStatus;
  originalMarks: number;
  originalMaxMarks: number;
  originalGrade: string;
  revisedMarks: number | null;
  revisedMaxMarks: number | null;
  revisedGrade: string;
  feeAmount: number;
  feePaid: boolean;
  feeReceiptNumber: string;
  feePaymentMode: string;
  feePaidAt: Date | null;
  gracePeriodEndsAt: Date;
  resultPublishedAt: Date | null;
  requestedAt: Date;
  requestedBy: string;
  reviewedAt: Date | null;
  reviewedBy: string;
  completedAt: Date | null;
  publishedAt: Date | null;
  remarks: string;
  rejectionReason: string;
}) {
  const now = new Date();
  const withinGrace = now <= r.gracePeriodEndsAt;
  const daysLeft = Math.max(0, Math.ceil((r.gracePeriodEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  return {
    id: r.id,
    recordId: r.recordId,
    academicYear: r.academicYear,
    examinationName: r.examinationName,
    studentId: r.studentId,
    studentName: r.studentName,
    admissionNumber: r.admissionNumber,
    className: r.className,
    sectionName: r.sectionName,
    classGroup: r.sectionName ? `${r.className} — ${r.sectionName}` : r.className,
    subjectName: r.subjectName,
    requestType: r.requestType,
    status: r.status,
    originalMarks: r.originalMarks,
    originalMaxMarks: r.originalMaxMarks,
    originalGrade: r.originalGrade,
    revisedMarks: r.revisedMarks,
    revisedMaxMarks: r.revisedMaxMarks,
    revisedGrade: r.revisedGrade,
    feeAmount: r.feeAmount,
    feePaid: r.feePaid,
    feeReceiptNumber: r.feeReceiptNumber,
    feePaymentMode: r.feePaymentMode,
    feePaidAt: r.feePaidAt?.toISOString() ?? null,
    gracePeriodEndsAt: r.gracePeriodEndsAt.toISOString(),
    resultPublishedAt: r.resultPublishedAt?.toISOString() ?? null,
    withinGracePeriod: withinGrace,
    daysLeftInGrace: daysLeft,
    requestedAt: r.requestedAt.toISOString(),
    requestedBy: r.requestedBy,
    reviewedAt: r.reviewedAt?.toISOString() ?? null,
    reviewedBy: r.reviewedBy,
    completedAt: r.completedAt?.toISOString() ?? null,
    publishedAt: r.publishedAt?.toISOString() ?? null,
    remarks: r.remarks,
    rejectionReason: r.rejectionReason,
    canPayFee: r.status === ExamRevaluationStatus.RECEIVED || r.status === ExamRevaluationStatus.FEE_PENDING,
    canReview: r.status === ExamRevaluationStatus.FEE_PAID || r.status === ExamRevaluationStatus.UNDER_REVIEW,
    canComplete: r.status === ExamRevaluationStatus.UNDER_REVIEW || r.status === ExamRevaluationStatus.APPROVED,
    canPublish: r.status === ExamRevaluationStatus.COMPLETED,
  };
}

function serializeBackPaper(b: {
  id: string;
  recordId: string;
  academicYear: string;
  examinationName: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  className: string;
  sectionName: string;
  subjectName: string;
  status: ExamBackPaperStatus;
  originalMarks: number;
  originalMaxMarks: number;
  originalGrade: string;
  passingMarks: number;
  examDate: Date | null;
  newMarks: number | null;
  newMaxMarks: number | null;
  newGrade: string;
  marksEnteredAt: Date | null;
  marksEnteredBy: string;
  publishedAt: Date | null;
  remarks: string;
  createdBy: string;
  createdAt: Date;
}) {
  return {
    id: b.id,
    recordId: b.recordId,
    academicYear: b.academicYear,
    examinationName: b.examinationName,
    studentId: b.studentId,
    studentName: b.studentName,
    admissionNumber: b.admissionNumber,
    className: b.className,
    sectionName: b.sectionName,
    classGroup: b.sectionName ? `${b.className} — ${b.sectionName}` : b.className,
    subjectName: b.subjectName,
    status: b.status,
    originalMarks: b.originalMarks,
    originalMaxMarks: b.originalMaxMarks,
    originalGrade: b.originalGrade,
    passingMarks: b.passingMarks,
    examDate: b.examDate?.toISOString().slice(0, 10) ?? null,
    newMarks: b.newMarks,
    newMaxMarks: b.newMaxMarks,
    newGrade: b.newGrade,
    marksEnteredAt: b.marksEnteredAt?.toISOString() ?? null,
    marksEnteredBy: b.marksEnteredBy,
    publishedAt: b.publishedAt?.toISOString() ?? null,
    remarks: b.remarks,
    createdBy: b.createdBy,
    createdAt: b.createdAt.toISOString(),
    canEnterMarks: b.status === ExamBackPaperStatus.CREATED || b.status === ExamBackPaperStatus.MARKS_ENTRY,
    canPublish: b.status === ExamBackPaperStatus.COMPLETED,
  };
}

export async function getRevaluationMeta(institutionId: string) {
  const filters = await getInstitutionFilterMeta(institutionId);
  const config = await getOrCreateConfig(institutionId, filters.defaultAcademicYear);

  const [received, underReview, approved, rejected, published, backPapers] = await Promise.all([
    prisma.examRevaluationRequest.count({
      where: { institutionId, academicYear: filters.defaultAcademicYear, status: { in: [ExamRevaluationStatus.RECEIVED, ExamRevaluationStatus.FEE_PENDING, ExamRevaluationStatus.FEE_PAID] } },
    }),
    prisma.examRevaluationRequest.count({
      where: { institutionId, academicYear: filters.defaultAcademicYear, status: ExamRevaluationStatus.UNDER_REVIEW },
    }),
    prisma.examRevaluationRequest.count({
      where: { institutionId, academicYear: filters.defaultAcademicYear, status: { in: [ExamRevaluationStatus.APPROVED, ExamRevaluationStatus.COMPLETED] } },
    }),
    prisma.examRevaluationRequest.count({
      where: { institutionId, academicYear: filters.defaultAcademicYear, status: ExamRevaluationStatus.REJECTED },
    }),
    prisma.examRevaluationRequest.count({
      where: { institutionId, academicYear: filters.defaultAcademicYear, status: ExamRevaluationStatus.PUBLISHED },
    }),
    prisma.examBackPaperExam.count({
      where: { institutionId, academicYear: filters.defaultAcademicYear },
    }),
  ]);

  return {
    defaultAcademicYear: filters.defaultAcademicYear,
    academicYears: filters.academicYears,
    classes: filters.classes,
    sectionsByClass: filters.sectionsByClass,
    config: {
      revaluationFee: config.revaluationFee,
      recheckFee: config.recheckFee,
      gracePeriodDays: config.gracePeriodDays,
      passingPercent: config.passingPercent,
    },
    summary: { received, underReview, approved, rejected, published, backPapers },
  };
}

export async function listRevaluationRequests(
  institutionId: string,
  opts?: { academicYear?: string; status?: string; requestType?: string },
) {
  const year = opts?.academicYear || '2025-26';
  const where: {
    institutionId: string;
    academicYear: string;
    status?: ExamRevaluationStatus | { in: ExamRevaluationStatus[] };
    requestType?: ExamRevaluationRequestType;
  } = { institutionId, academicYear: year };

  if (opts?.status && opts.status !== 'all') {
    if (opts.status === 'pending') {
      where.status = { in: [ExamRevaluationStatus.RECEIVED, ExamRevaluationStatus.FEE_PENDING, ExamRevaluationStatus.FEE_PAID] };
    } else {
      where.status = opts.status as ExamRevaluationStatus;
    }
  }
  if (opts?.requestType && opts.requestType !== 'all') {
    where.requestType = opts.requestType as ExamRevaluationRequestType;
  }

  const requests = await prisma.examRevaluationRequest.findMany({
    where,
    orderBy: [{ requestedAt: 'desc' }],
  });

  return {
    academicYear: year,
    requests: requests.map(serializeRequest),
    summary: {
      total: requests.length,
      received: requests.filter((r) =>
        r.status === ExamRevaluationStatus.RECEIVED
        || r.status === ExamRevaluationStatus.FEE_PENDING
        || r.status === ExamRevaluationStatus.FEE_PAID,
      ).length,
      underReview: requests.filter((r) => r.status === ExamRevaluationStatus.UNDER_REVIEW).length,
      completed: requests.filter((r) => r.status === ExamRevaluationStatus.COMPLETED).length,
      published: requests.filter((r) => r.status === ExamRevaluationStatus.PUBLISHED).length,
      rejected: requests.filter((r) => r.status === ExamRevaluationStatus.REJECTED).length,
    },
  };
}

export async function getEligibleStudentsForRevaluation(
  institutionId: string,
  academicYear: string,
  className?: string,
  sectionName?: string,
) {
  const batches = await prisma.examResultBatch.findMany({
    where: {
      institutionId,
      academicYear,
      status: ExamResultBatchStatus.PUBLISHED,
      ...(className ? { className } : {}),
      ...(sectionName ? { sectionName } : {}),
    },
    include: { studentResults: true },
  });

  const config = await getOrCreateConfig(institutionId, academicYear);
  const eligible: {
    studentId: string;
    studentResultId: string;
    batchId: string;
    studentName: string;
    admissionNumber: string;
    className: string;
    sectionName: string;
    examinationName: string;
    subjectName: string;
    obtained: number;
    max: number;
    grade: string;
    resultPublishedAt: string;
    gracePeriodEndsAt: string;
    withinGracePeriod: boolean;
    revaluationFee: number;
    recheckFee: number;
  }[] = [];

  const now = new Date();

  for (const batch of batches) {
    if (!batch.publishedAt) continue;
    const graceEnds = new Date(batch.publishedAt);
    graceEnds.setDate(graceEnds.getDate() + config.gracePeriodDays);

    for (const result of batch.studentResults) {
      const scores = result.subjectScores as { subjectName: string; obtained: number; max: number; grade: string }[];
      for (const sub of scores) {
        eligible.push({
          studentId: result.studentId,
          studentResultId: result.id,
          batchId: batch.id,
          studentName: result.studentName,
          admissionNumber: result.admissionNumber,
          className: batch.className,
          sectionName: batch.sectionName,
          examinationName: batch.examinationName,
          subjectName: sub.subjectName,
          obtained: sub.obtained,
          max: sub.max,
          grade: sub.grade,
          resultPublishedAt: batch.publishedAt.toISOString(),
          gracePeriodEndsAt: graceEnds.toISOString(),
          withinGracePeriod: now <= graceEnds,
          revaluationFee: config.revaluationFee,
          recheckFee: config.recheckFee,
        });
      }
    }
  }

  return { eligible: eligible.filter((e) => e.withinGracePeriod) };
}

export async function createRevaluationRequest(
  institutionId: string,
  data: {
    studentResultId: string;
    subjectName: string;
    requestType: ExamRevaluationRequestType;
    remarks?: string;
  },
  actor: string,
) {
  const result = await prisma.examStudentResult.findFirst({
    where: { institutionId, id: data.studentResultId },
    include: { batch: true },
  });
  if (!result) throw new Error('Student result not found');
  if (result.batch.status !== ExamResultBatchStatus.PUBLISHED) {
    throw new Error('Revaluation is only allowed for published results');
  }
  if (!result.batch.publishedAt) throw new Error('Result publication date not found');

  const config = await getOrCreateConfig(institutionId, result.batch.academicYear);
  const graceEnds = new Date(result.batch.publishedAt);
  graceEnds.setDate(graceEnds.getDate() + config.gracePeriodDays);

  if (new Date() > graceEnds) {
    throw new Error(`Grace period of ${config.gracePeriodDays} days has expired. Last date was ${graceEnds.toLocaleDateString('en-IN')}`);
  }

  const scores = result.subjectScores as { subjectName: string; obtained: number; max: number; grade: string }[];
  const subject = scores.find((s) => s.subjectName === data.subjectName);
  if (!subject) throw new Error('Subject not found in student result');

  const existing = await prisma.examRevaluationRequest.findFirst({
    where: {
      institutionId,
      studentId: result.studentId,
      subjectName: data.subjectName,
      examinationName: result.batch.examinationName,
      status: { notIn: [ExamRevaluationStatus.REJECTED, ExamRevaluationStatus.PUBLISHED] },
    },
  });
  if (existing) throw new Error('An active revaluation request already exists for this subject');

  const feeAmount = data.requestType === ExamRevaluationRequestType.REVALUATION
    ? config.revaluationFee
    : config.recheckFee;

  const recordId = await nextRevaluationRecordId(institutionId);
  const request = await prisma.examRevaluationRequest.create({
    data: {
      institutionId,
      recordId,
      academicYear: result.batch.academicYear,
      examinationName: result.batch.examinationName,
      studentId: result.studentId,
      studentResultId: result.id,
      batchId: result.batchId,
      studentName: result.studentName,
      admissionNumber: result.admissionNumber,
      className: result.batch.className,
      sectionName: result.batch.sectionName,
      subjectName: data.subjectName,
      requestType: data.requestType,
      status: ExamRevaluationStatus.FEE_PENDING,
      originalMarks: subject.obtained,
      originalMaxMarks: subject.max,
      originalGrade: subject.grade,
      feeAmount,
      gracePeriodEndsAt: graceEnds,
      resultPublishedAt: result.batch.publishedAt,
      requestedBy: actor,
      remarks: data.remarks?.trim() || '',
    },
  });

  await logAudit(institutionId, {
    entityType: 'REVALUATION_REQUEST',
    entityId: request.id,
    action: 'CREATED',
    actor,
    details: `${data.requestType} request for ${data.subjectName} — fee ₹${feeAmount}`,
    batchId: result.batchId,
  });

  await prisma.examDashboardStats.updateMany({
    where: { institutionId, academicYear: result.batch.academicYear },
    data: { revaluationReceived: { increment: 1 } },
  });

  return { request: serializeRequest(request), message: 'Revaluation request created — fee payment required' };
}

export async function recordRevaluationFeePayment(
  institutionId: string,
  requestId: string,
  data: { feeReceiptNumber: string; feePaymentMode: string },
  actor: string,
) {
  const request = await prisma.examRevaluationRequest.findFirst({ where: { institutionId, id: requestId } });
  if (!request) throw new Error('Request not found');
  if (request.feePaid) throw new Error('Fee already paid');
  if (new Date() > request.gracePeriodEndsAt) {
    throw new Error('Grace period has expired');
  }

  const now = new Date();
  const updated = await prisma.examRevaluationRequest.update({
    where: { id: request.id },
    data: {
      feePaid: true,
      feePaidAt: now,
      feeReceiptNumber: data.feeReceiptNumber.trim(),
      feePaymentMode: data.feePaymentMode.trim(),
      status: ExamRevaluationStatus.FEE_PAID,
    },
  });

  await logAudit(institutionId, {
    entityType: 'REVALUATION_REQUEST',
    entityId: request.id,
    action: 'FEE_PAID',
    actor,
    details: `₹${request.feeAmount} paid — Receipt ${data.feeReceiptNumber}`,
    batchId: request.batchId ?? undefined,
  });

  return { request: serializeRequest(updated), message: 'Fee payment recorded — ready for review' };
}

export async function startRevaluationReview(institutionId: string, requestId: string, actor: string) {
  const request = await prisma.examRevaluationRequest.findFirst({ where: { institutionId, id: requestId } });
  if (!request) throw new Error('Request not found');
  if (!request.feePaid) throw new Error('Fee must be paid before review');
  if (request.status !== ExamRevaluationStatus.FEE_PAID) {
    throw new Error('Request is not in fee-paid status');
  }

  const updated = await prisma.examRevaluationRequest.update({
    where: { id: request.id },
    data: { status: ExamRevaluationStatus.UNDER_REVIEW, reviewedAt: new Date(), reviewedBy: actor },
  });

  await prisma.examDashboardStats.updateMany({
    where: { institutionId, academicYear: request.academicYear },
    data: { revaluationUnderReview: { increment: 1 } },
  });

  return { request: serializeRequest(updated), message: 'Request moved to under review' };
}

export async function completeRevaluationReview(
  institutionId: string,
  requestId: string,
  data: { revisedMarks: number; revisedMaxMarks?: number; approved: boolean; rejectionReason?: string },
  actor: string,
) {
  const request = await prisma.examRevaluationRequest.findFirst({ where: { institutionId, id: requestId } });
  if (!request) throw new Error('Request not found');
  if (request.status !== ExamRevaluationStatus.UNDER_REVIEW) {
    throw new Error('Request must be under review');
  }

  const now = new Date();
  const maxMarks = data.revisedMaxMarks ?? request.originalMaxMarks;
  const pct = maxMarks > 0 ? (data.revisedMarks / maxMarks) * 100 : 0;
  const revisedGrade = computeGrade(pct);

  if (!data.approved) {
    const updated = await prisma.examRevaluationRequest.update({
      where: { id: request.id },
      data: {
        status: ExamRevaluationStatus.REJECTED,
        rejectionReason: data.rejectionReason?.trim() || 'No change in marks',
        reviewedAt: now,
        reviewedBy: actor,
      },
    });

    await prisma.examDashboardStats.updateMany({
      where: { institutionId, academicYear: request.academicYear },
      data: { revaluationRejected: { increment: 1 }, revaluationUnderReview: { decrement: 1 } },
    });

    return { request: serializeRequest(updated), message: 'Revaluation request rejected' };
  }

  const updated = await prisma.examRevaluationRequest.update({
    where: { id: request.id },
    data: {
      status: ExamRevaluationStatus.COMPLETED,
      revisedMarks: data.revisedMarks,
      revisedMaxMarks: maxMarks,
      revisedGrade,
      completedAt: now,
      reviewedAt: now,
      reviewedBy: actor,
    },
  });

  await prisma.examDashboardStats.updateMany({
    where: { institutionId, academicYear: request.academicYear },
    data: { revaluationApproved: { increment: 1 }, revaluationUnderReview: { decrement: 1 } },
  });

  return { request: serializeRequest(updated), message: 'Revaluation completed — publish revised result from this module' };
}

export async function publishRevaluationResult(institutionId: string, requestId: string, actor: string) {
  const request = await prisma.examRevaluationRequest.findFirst({ where: { institutionId, id: requestId } });
  if (!request) throw new Error('Request not found');
  if (request.status !== ExamRevaluationStatus.COMPLETED) {
    throw new Error('Only completed revaluations can be published');
  }
  if (request.revisedMarks === null) throw new Error('Revised marks not set');

  const result = await prisma.examStudentResult.findFirst({
    where: { institutionId, id: request.studentResultId ?? '' },
    include: { batch: true },
  });
  if (!result) throw new Error('Student result not found');

  const scores = [...(result.subjectScores as { subjectName: string; obtained: number; max: number; grade: string }[])];
  const idx = scores.findIndex((s) => s.subjectName === request.subjectName);
  if (idx >= 0) {
    scores[idx] = {
      subjectName: request.subjectName,
      obtained: request.revisedMarks,
      max: request.revisedMaxMarks ?? scores[idx].max,
      grade: request.revisedGrade,
    };
  }

  const totalObtained = scores.reduce((s, sc) => s + sc.obtained, 0);
  const totalMax = scores.reduce((s, sc) => s + sc.max, 0);
  const pct = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
  const grade = computeGrade(pct);
  const gpa = computeGpa(pct);
  const now = new Date();

  await prisma.examStudentResult.update({
    where: { id: result.id },
    data: {
      subjectScores: scores,
      totalObtained: Math.round(totalObtained * 100) / 100,
      totalMax,
      percentage: Math.round(pct * 100) / 100,
      grade,
      gpa,
      remarks: pct >= 36 ? 'Pass' : 'Fail',
      reportCardStatus: ExamReportCardStatus.GENERATED,
    },
  });

  const updated = await prisma.examRevaluationRequest.update({
    where: { id: request.id },
    data: { status: ExamRevaluationStatus.PUBLISHED, publishedAt: now, publishedBy: actor },
  });

  await logAudit(institutionId, {
    entityType: 'REVALUATION_REQUEST',
    entityId: request.id,
    action: 'PUBLISHED',
    actor,
    details: `${request.subjectName}: ${request.originalMarks} → ${request.revisedMarks} (${request.revisedGrade})`,
    batchId: request.batchId ?? undefined,
  });

  return {
    request: serializeRequest(updated),
    updatedResult: { percentage: Math.round(pct * 100) / 100, grade, gpa },
    message: 'Revised result published successfully',
  };
}

export async function listBackPaperExams(
  institutionId: string,
  opts?: { academicYear?: string; status?: string },
) {
  const year = opts?.academicYear || '2025-26';
  const where: {
    institutionId: string;
    academicYear: string;
    status?: ExamBackPaperStatus;
  } = { institutionId, academicYear: year };
  if (opts?.status && opts.status !== 'all') {
    where.status = opts.status as ExamBackPaperStatus;
  }

  const exams = await prisma.examBackPaperExam.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }],
  });

  return {
    academicYear: year,
    exams: exams.map(serializeBackPaper),
    summary: {
      total: exams.length,
      created: exams.filter((e) => e.status === ExamBackPaperStatus.CREATED).length,
      marksEntry: exams.filter((e) => e.status === ExamBackPaperStatus.MARKS_ENTRY).length,
      completed: exams.filter((e) => e.status === ExamBackPaperStatus.COMPLETED).length,
      published: exams.filter((e) => e.status === ExamBackPaperStatus.PUBLISHED).length,
    },
  };
}

export async function getFailedStudentsForBackPaper(
  institutionId: string,
  academicYear: string,
  className?: string,
  sectionName?: string,
) {
  const config = await getOrCreateConfig(institutionId, academicYear);
  const batches = await prisma.examResultBatch.findMany({
    where: {
      institutionId,
      academicYear,
      status: ExamResultBatchStatus.PUBLISHED,
      ...(className ? { className } : {}),
      ...(sectionName ? { sectionName } : {}),
    },
    include: { studentResults: true },
  });

  const failed: {
    studentId: string;
    studentResultId: string;
    studentName: string;
    admissionNumber: string;
    className: string;
    sectionName: string;
    examinationName: string;
    subjectName: string;
    obtained: number;
    max: number;
    grade: string;
    passingMarks: number;
  }[] = [];

  for (const batch of batches) {
    for (const result of batch.studentResults) {
      if (result.percentage >= config.passingPercent && result.remarks === 'Pass') continue;
      const scores = result.subjectScores as { subjectName: string; obtained: number; max: number; grade: string }[];
      for (const sub of scores) {
        const pct = sub.max > 0 ? (sub.obtained / sub.max) * 100 : 0;
        if (pct < config.passingPercent || sub.grade === 'F') {
          failed.push({
            studentId: result.studentId,
            studentResultId: result.id,
            studentName: result.studentName,
            admissionNumber: result.admissionNumber,
            className: batch.className,
            sectionName: batch.sectionName,
            examinationName: batch.examinationName,
            subjectName: sub.subjectName,
            obtained: sub.obtained,
            max: sub.max,
            grade: sub.grade,
            passingMarks: Math.ceil((config.passingPercent / 100) * sub.max),
          });
        }
      }
    }
  }

  return { failed };
}

export async function createBackPaperExam(
  institutionId: string,
  data: {
    studentResultId: string;
    subjectName: string;
    examDate?: string;
    remarks?: string;
  },
  actor: string,
) {
  const result = await prisma.examStudentResult.findFirst({
    where: { institutionId, id: data.studentResultId },
    include: { batch: true },
  });
  if (!result) throw new Error('Student result not found');

  const config = await getOrCreateConfig(institutionId, result.batch.academicYear);
  const scores = result.subjectScores as { subjectName: string; obtained: number; max: number; grade: string }[];
  const subject = scores.find((s) => s.subjectName === data.subjectName);
  if (!subject) throw new Error('Subject not found');

  const recordId = await nextBackPaperRecordId(institutionId);
  const exam = await prisma.examBackPaperExam.create({
    data: {
      institutionId,
      recordId,
      academicYear: result.batch.academicYear,
      examinationName: `Back Paper — ${data.subjectName}`,
      studentId: result.studentId,
      studentResultId: result.id,
      studentName: result.studentName,
      admissionNumber: result.admissionNumber,
      className: result.batch.className,
      sectionName: result.batch.sectionName,
      subjectName: data.subjectName,
      status: ExamBackPaperStatus.CREATED,
      originalMarks: subject.obtained,
      originalMaxMarks: subject.max,
      originalGrade: subject.grade,
      passingMarks: Math.ceil((config.passingPercent / 100) * subject.max),
      examDate: data.examDate ? new Date(data.examDate) : null,
      remarks: data.remarks?.trim() || '',
      createdBy: actor,
    },
  });

  await logAudit(institutionId, {
    entityType: 'BACK_PAPER_EXAM',
    entityId: exam.id,
    action: 'CREATED',
    actor,
    details: `Back paper exam for ${data.subjectName} — ${result.studentName}`,
    batchId: result.batchId,
  });

  return { exam: serializeBackPaper(exam), message: 'Back paper exam created' };
}

export async function enterBackPaperMarks(
  institutionId: string,
  examId: string,
  data: { newMarks: number; newMaxMarks?: number },
  actor: string,
) {
  const exam = await prisma.examBackPaperExam.findFirst({ where: { institutionId, id: examId } });
  if (!exam) throw new Error('Back paper exam not found');
  if (exam.status === ExamBackPaperStatus.PUBLISHED) {
    throw new Error('Back paper result already published');
  }

  const maxMarks = data.newMaxMarks ?? exam.originalMaxMarks;
  const pct = maxMarks > 0 ? (data.newMarks / maxMarks) * 100 : 0;
  const newGrade = computeGrade(pct);
  const now = new Date();

  const updated = await prisma.examBackPaperExam.update({
    where: { id: exam.id },
    data: {
      newMarks: data.newMarks,
      newMaxMarks: maxMarks,
      newGrade,
      status: ExamBackPaperStatus.COMPLETED,
      marksEnteredAt: now,
      marksEnteredBy: actor,
    },
  });

  await logAudit(institutionId, {
    entityType: 'BACK_PAPER_EXAM',
    entityId: exam.id,
    action: 'MARKS_ENTERED',
    actor,
    details: `${exam.subjectName}: ${data.newMarks}/${maxMarks} (${newGrade})`,
  });

  return { exam: serializeBackPaper(updated), message: 'Back paper marks entered — ready to publish' };
}

export async function publishBackPaperResult(institutionId: string, examId: string, actor: string) {
  const exam = await prisma.examBackPaperExam.findFirst({ where: { institutionId, id: examId } });
  if (!exam) throw new Error('Back paper exam not found');
  if (exam.status !== ExamBackPaperStatus.COMPLETED) {
    throw new Error('Enter marks before publishing back paper result');
  }
  if (exam.newMarks === null) throw new Error('Marks not entered');

  const result = await prisma.examStudentResult.findFirst({
    where: { institutionId, id: exam.studentResultId ?? '' },
    include: { batch: true },
  });
  if (!result) throw new Error('Student result not found');

  const scores = [...(result.subjectScores as { subjectName: string; obtained: number; max: number; grade: string }[])];
  const idx = scores.findIndex((s) => s.subjectName === exam.subjectName);
  if (idx >= 0) {
    scores[idx] = {
      subjectName: exam.subjectName,
      obtained: exam.newMarks,
      max: exam.newMaxMarks ?? scores[idx].max,
      grade: exam.newGrade,
    };
  }

  const totalObtained = scores.reduce((s, sc) => s + sc.obtained, 0);
  const totalMax = scores.reduce((s, sc) => s + sc.max, 0);
  const pct = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
  const grade = computeGrade(pct);
  const gpa = computeGpa(pct);
  const now = new Date();

  await prisma.examStudentResult.update({
    where: { id: result.id },
    data: {
      subjectScores: scores,
      totalObtained: Math.round(totalObtained * 100) / 100,
      totalMax,
      percentage: Math.round(pct * 100) / 100,
      grade,
      gpa,
      remarks: pct >= 36 ? 'Pass' : 'Fail',
      reportCardStatus: ExamReportCardStatus.GENERATED,
    },
  });

  const updated = await prisma.examBackPaperExam.update({
    where: { id: exam.id },
    data: { status: ExamBackPaperStatus.PUBLISHED, publishedAt: now, publishedBy: actor },
  });

  await logAudit(institutionId, {
    entityType: 'BACK_PAPER_EXAM',
    entityId: exam.id,
    action: 'PUBLISHED',
    actor,
    details: `Back paper result published — ${exam.subjectName}: ${exam.newMarks}/${exam.newMaxMarks}`,
    batchId: result.batchId,
  });

  return {
    exam: serializeBackPaper(updated),
    updatedResult: { percentage: Math.round(pct * 100) / 100, grade, gpa },
    message: 'Back paper result published successfully',
  };
}

export async function updateRevaluationConfig(
  institutionId: string,
  academicYear: string,
  data: { revaluationFee?: number; recheckFee?: number; gracePeriodDays?: number; passingPercent?: number },
) {
  const config = await prisma.examRevaluationConfig.upsert({
    where: { institutionId_academicYear: { institutionId, academicYear } },
    create: { institutionId, academicYear, ...data },
    update: data,
  });
  return {
    config: {
      revaluationFee: config.revaluationFee,
      recheckFee: config.recheckFee,
      gracePeriodDays: config.gracePeriodDays,
      passingPercent: config.passingPercent,
    },
    message: 'Revaluation configuration updated',
  };
}

export async function seedRevaluationDemo(institutionId: string, academicYear = '2025-26') {
  await getOrCreateConfig(institutionId, academicYear);

  const published = await prisma.examResultBatch.findFirst({
    where: { institutionId, academicYear, status: ExamResultBatchStatus.PUBLISHED },
    include: { studentResults: true },
  });

  if (!published || !published.studentResults.length) {
    return { seeded: false, reason: 'No published results found — publish results first' };
  }

  const result = published.studentResults[0];
  const scores = result.subjectScores as { subjectName: string; obtained: number; max: number; grade: string }[];
  if (!scores.length) return { seeded: false, reason: 'No subject scores' };

  const existing = await prisma.examRevaluationRequest.findFirst({
    where: { institutionId, academicYear },
  });
  if (existing) return { seeded: true, message: 'Demo data already exists' };

  const config = await getOrCreateConfig(institutionId, academicYear);
  const graceEnds = new Date(published.publishedAt || new Date());
  graceEnds.setDate(graceEnds.getDate() + config.gracePeriodDays);

  const recordId = await nextRevaluationRecordId(institutionId);
  await prisma.examRevaluationRequest.create({
    data: {
      institutionId,
      recordId,
      academicYear,
      examinationName: published.examinationName,
      studentId: result.studentId,
      studentResultId: result.id,
      batchId: published.id,
      studentName: result.studentName,
      admissionNumber: result.admissionNumber,
      className: published.className,
      sectionName: published.sectionName,
      subjectName: scores[0].subjectName,
      requestType: ExamRevaluationRequestType.REVALUATION,
      status: ExamRevaluationStatus.FEE_PAID,
      originalMarks: scores[0].obtained,
      originalMaxMarks: scores[0].max,
      originalGrade: scores[0].grade,
      feeAmount: config.revaluationFee,
      feePaid: true,
      feeReceiptNumber: 'DEMO-REV-001',
      feePaymentMode: 'CASH',
      feePaidAt: new Date(),
      gracePeriodEndsAt: graceEnds,
      resultPublishedAt: published.publishedAt,
      requestedBy: 'Demo',
    },
  });

  const failedSubject = scores.find((s) => {
    const pct = s.max > 0 ? (s.obtained / s.max) * 100 : 0;
    return pct < config.passingPercent;
  }) || scores[scores.length - 1];

  const bkpId = await nextBackPaperRecordId(institutionId);
  await prisma.examBackPaperExam.create({
    data: {
      institutionId,
      recordId: bkpId,
      academicYear,
      examinationName: `Back Paper — ${failedSubject.subjectName}`,
      studentId: result.studentId,
      studentResultId: result.id,
      studentName: result.studentName,
      admissionNumber: result.admissionNumber,
      className: published.className,
      sectionName: published.sectionName,
      subjectName: failedSubject.subjectName,
      status: ExamBackPaperStatus.CREATED,
      originalMarks: failedSubject.obtained,
      originalMaxMarks: failedSubject.max,
      originalGrade: failedSubject.grade,
      passingMarks: Math.ceil((config.passingPercent / 100) * failedSubject.max),
      createdBy: 'Demo',
    },
  });

  return { seeded: true, message: 'Demo revaluation request and back paper exam created' };
}
