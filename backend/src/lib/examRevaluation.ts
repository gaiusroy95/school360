import {
  ExamBackPaperStatus,
  ExamReportCardStatus,
  ExamResultBatchStatus,
  ExamRevaluationRequestType,
  ExamRevaluationStatus,
  FeeDueStatus,
} from '@prisma/client';
import { prisma } from './prisma.js';
import { getInstitutionFilterMeta } from './students.js';
import { isRazorpayConfigured, createRazorpayOrder } from './razorpay.js';

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
  feeDueId?: string | null;
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
    feeDueId: r.feeDueId ?? null,
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
  feeAmount?: number;
  feePaid?: boolean;
  feeReceiptNumber?: string;
  feePaymentMode?: string;
  feePaidAt?: Date | null;
  feeDueId?: string | null;
  marksEnteredAt: Date | null;
  marksEnteredBy: string;
  publishedAt: Date | null;
  remarks: string;
  createdBy: string;
  createdAt: Date;
}) {
  const feeAmount = b.feeAmount ?? 0;
  const feePaid = Boolean(b.feePaid);
  const feeCleared = feeAmount <= 0 || feePaid;
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
    feeAmount,
    feePaid,
    feeReceiptNumber: b.feeReceiptNumber || '',
    feePaymentMode: b.feePaymentMode || '',
    feePaidAt: b.feePaidAt?.toISOString() ?? null,
    feeDueId: b.feeDueId ?? null,
    marksEnteredAt: b.marksEnteredAt?.toISOString() ?? null,
    marksEnteredBy: b.marksEnteredBy,
    publishedAt: b.publishedAt?.toISOString() ?? null,
    remarks: b.remarks,
    createdBy: b.createdBy,
    createdAt: b.createdAt.toISOString(),
    canPayFee: !feePaid && feeAmount > 0 && b.status !== ExamBackPaperStatus.PUBLISHED,
    canEnterMarks:
      feeCleared
      && (b.status === ExamBackPaperStatus.CREATED || b.status === ExamBackPaperStatus.MARKS_ENTRY),
    canPublish: b.status === ExamBackPaperStatus.COMPLETED,
  };
}

async function createLinkedFeeDue(opts: {
  institutionId: string;
  studentId: string;
  admissionNumber: string;
  academicYear: string;
  title: string;
  amount: number;
  remarks: string;
}) {
  if (opts.amount <= 0) return null;
  const dueDate = new Date();
  dueDate.setUTCDate(dueDate.getUTCDate() + 7);
  return prisma.feeDue.create({
    data: {
      institutionId: opts.institutionId,
      studentId: opts.studentId,
      admissionNumber: opts.admissionNumber,
      academicYear: opts.academicYear,
      title: opts.title,
      feeHead: 'examinationFee',
      amount: opts.amount,
      dueDate,
      status: FeeDueStatus.PENDING,
      remarks: opts.remarks,
    },
  });
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
      backPaperFee: (config as { backPaperFee?: number }).backPaperFee ?? 400,
      gracePeriodDays: config.gracePeriodDays,
      passingPercent: config.passingPercent,
    },
    summary: { received, underReview, approved, rejected, published, backPapers },
    mobileSync: true,
    paymentsEnabled: isRazorpayConfigured(),
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

  const feeDue = await createLinkedFeeDue({
    institutionId,
    studentId: result.studentId,
    admissionNumber: result.admissionNumber,
    academicYear: result.batch.academicYear,
    title: `${data.requestType === ExamRevaluationRequestType.RECHECK ? 'Recheck' : 'Revaluation'} fee — ${data.subjectName}`,
    amount: feeAmount,
    remarks: `REVAL:${request.id}`,
  });

  const withDue = feeDue
    ? await prisma.examRevaluationRequest.update({
      where: { id: request.id },
      data: { feeDueId: feeDue.id },
    })
    : request;

  await logAudit(institutionId, {
    entityType: 'REVALUATION_REQUEST',
    entityId: request.id,
    action: 'CREATED',
    actor,
    details: `${data.requestType} request for ${data.subjectName} — fee ₹${feeAmount}${feeDue ? ` · FeeDue ${feeDue.id}` : ''}`,
    batchId: result.batchId,
  });

  await prisma.examDashboardStats.updateMany({
    where: { institutionId, academicYear: result.batch.academicYear },
    data: { revaluationReceived: { increment: 1 } },
  });

  return {
    request: serializeRequest(withDue),
    feeDueId: feeDue?.id ?? null,
    message: feeDue
      ? 'Request created — pay fee on mobile app (Fees / Revaluation) or record payment here'
      : 'Revaluation request created — fee payment required',
  };
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

  if (request.feeDueId) {
    await prisma.feeDue.updateMany({
      where: { id: request.feeDueId, institutionId, status: { not: FeeDueStatus.PAID } },
      data: { status: FeeDueStatus.PAID },
    });
  }

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

  return { failed: failed.map((f) => ({
    ...f,
    backPaperFee: (config as { backPaperFee?: number }).backPaperFee ?? 400,
  })) };
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
  const feeAmount = (config as { backPaperFee?: number }).backPaperFee ?? 400;
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
      feeAmount,
      feePaid: feeAmount <= 0,
      remarks: data.remarks?.trim() || '',
      createdBy: actor,
    },
  });

  const feeDue = await createLinkedFeeDue({
    institutionId,
    studentId: result.studentId,
    admissionNumber: result.admissionNumber,
    academicYear: result.batch.academicYear,
    title: `Back paper fee — ${data.subjectName}`,
    amount: feeAmount,
    remarks: `BKP:${exam.id}`,
  });

  const withDue = feeDue
    ? await prisma.examBackPaperExam.update({
      where: { id: exam.id },
      data: { feeDueId: feeDue.id },
    })
    : exam;

  await logAudit(institutionId, {
    entityType: 'BACK_PAPER_EXAM',
    entityId: exam.id,
    action: 'CREATED',
    actor,
    details: `Back paper exam for ${data.subjectName} — ${result.studentName} · fee ₹${feeAmount}`,
    batchId: result.batchId,
  });

  return {
    exam: serializeBackPaper(withDue),
    feeDueId: feeDue?.id ?? null,
    message: feeAmount > 0
      ? `Back paper created — pay ₹${feeAmount} fee on mobile or record payment here before marks entry`
      : 'Back paper exam created',
  };
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
  const feeAmount = (exam as { feeAmount?: number }).feeAmount ?? 0;
  const feePaid = Boolean((exam as { feePaid?: boolean }).feePaid);
  if (feeAmount > 0 && !feePaid) {
    throw new Error('Back paper fee must be paid before entering marks');
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
  data: {
    revaluationFee?: number;
    recheckFee?: number;
    backPaperFee?: number;
    gracePeriodDays?: number;
    passingPercent?: number;
  },
) {
  const config = await prisma.examRevaluationConfig.upsert({
    where: { institutionId_academicYear: { institutionId, academicYear } },
    create: {
      institutionId,
      academicYear,
      revaluationFee: data.revaluationFee ?? 500,
      recheckFee: data.recheckFee ?? 300,
      backPaperFee: data.backPaperFee ?? 400,
      gracePeriodDays: data.gracePeriodDays ?? GRACE_PERIOD_DAYS,
      passingPercent: data.passingPercent ?? 36,
    },
    update: {
      ...(data.revaluationFee !== undefined ? { revaluationFee: data.revaluationFee } : {}),
      ...(data.recheckFee !== undefined ? { recheckFee: data.recheckFee } : {}),
      ...(data.backPaperFee !== undefined ? { backPaperFee: data.backPaperFee } : {}),
      ...(data.gracePeriodDays !== undefined ? { gracePeriodDays: data.gracePeriodDays } : {}),
      ...(data.passingPercent !== undefined ? { passingPercent: data.passingPercent } : {}),
    },
  });
  return {
    config: {
      revaluationFee: config.revaluationFee,
      recheckFee: config.recheckFee,
      backPaperFee: (config as { backPaperFee?: number }).backPaperFee ?? 400,
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

/** Called when a linked FeeDue is paid via Razorpay / Fees module. */
export async function applyExamFeeDuePayment(
  institutionId: string,
  feeDueId: string,
  opts: { receiptNumber?: string; paymentMode?: string; actor?: string } = {},
) {
  const now = new Date();
  const receipt = opts.receiptNumber || `ONLINE-${feeDueId.slice(-8).toUpperCase()}`;
  const mode = opts.paymentMode || 'ONLINE';
  const actor = opts.actor || 'Online Payment';

  const request = await prisma.examRevaluationRequest.findFirst({
    where: { institutionId, feeDueId, feePaid: false },
  });
  if (request) {
    if (new Date() > request.gracePeriodEndsAt) {
      return { synced: false, reason: 'grace_expired', kind: 'REVALUATION' as const };
    }
    await prisma.examRevaluationRequest.update({
      where: { id: request.id },
      data: {
        feePaid: true,
        feePaidAt: now,
        feeReceiptNumber: receipt,
        feePaymentMode: mode,
        status: ExamRevaluationStatus.FEE_PAID,
      },
    });
    await logAudit(institutionId, {
      entityType: 'REVALUATION_REQUEST',
      entityId: request.id,
      action: 'FEE_PAID',
      actor,
      details: `₹${request.feeAmount} paid online — ${receipt}`,
      batchId: request.batchId ?? undefined,
    });
    return { synced: true, kind: 'REVALUATION' as const, id: request.id };
  }

  const backPaper = await prisma.examBackPaperExam.findFirst({
    where: { institutionId, feeDueId, feePaid: false },
  });
  if (backPaper) {
    await prisma.examBackPaperExam.update({
      where: { id: backPaper.id },
      data: {
        feePaid: true,
        feePaidAt: now,
        feeReceiptNumber: receipt,
        feePaymentMode: mode,
      },
    });
    await logAudit(institutionId, {
      entityType: 'BACK_PAPER_EXAM',
      entityId: backPaper.id,
      action: 'FEE_PAID',
      actor,
      details: `₹${(backPaper as { feeAmount?: number }).feeAmount ?? 0} paid online — ${receipt}`,
    });
    return { synced: true, kind: 'BACK_PAPER' as const, id: backPaper.id };
  }

  return { synced: false, reason: 'not_exam_fee', kind: null };
}

export async function recordBackPaperFeePayment(
  institutionId: string,
  examId: string,
  data: { feeReceiptNumber: string; feePaymentMode: string },
  actor: string,
) {
  const exam = await prisma.examBackPaperExam.findFirst({ where: { institutionId, id: examId } });
  if (!exam) throw new Error('Back paper exam not found');
  if ((exam as { feePaid?: boolean }).feePaid) throw new Error('Fee already paid');

  const now = new Date();
  const updated = await prisma.examBackPaperExam.update({
    where: { id: exam.id },
    data: {
      feePaid: true,
      feePaidAt: now,
      feeReceiptNumber: data.feeReceiptNumber.trim(),
      feePaymentMode: data.feePaymentMode.trim(),
    },
  });

  const feeDueId = (exam as { feeDueId?: string | null }).feeDueId;
  if (feeDueId) {
    await prisma.feeDue.updateMany({
      where: { id: feeDueId, institutionId, status: { not: FeeDueStatus.PAID } },
      data: { status: FeeDueStatus.PAID },
    });
  }

  await logAudit(institutionId, {
    entityType: 'BACK_PAPER_EXAM',
    entityId: exam.id,
    action: 'FEE_PAID',
    actor,
    details: `₹${(exam as { feeAmount?: number }).feeAmount ?? 0} paid — Receipt ${data.feeReceiptNumber}`,
  });

  return { exam: serializeBackPaper(updated), message: 'Back paper fee recorded — marks entry unlocked' };
}

async function ensureFeeDueForRequest(request: {
  id: string;
  institutionId: string;
  studentId: string;
  admissionNumber: string;
  academicYear: string;
  subjectName: string;
  requestType: ExamRevaluationRequestType;
  feeAmount: number;
  feeDueId: string | null;
}) {
  if (request.feeDueId) {
    const existing = await prisma.feeDue.findFirst({ where: { id: request.feeDueId } });
    if (existing) return existing;
  }
  const due = await createLinkedFeeDue({
    institutionId: request.institutionId,
    studentId: request.studentId,
    admissionNumber: request.admissionNumber,
    academicYear: request.academicYear,
    title: `${request.requestType === 'RECHECK' ? 'Recheck' : 'Revaluation'} fee — ${request.subjectName}`,
    amount: request.feeAmount,
    remarks: `REVAL:${request.id}`,
  });
  if (due) {
    await prisma.examRevaluationRequest.update({ where: { id: request.id }, data: { feeDueId: due.id } });
  }
  return due;
}

export async function createRevaluationPaymentOrder(
  institutionId: string,
  requestId: string,
  opts: { accountId?: string } = {},
) {
  const request = await prisma.examRevaluationRequest.findFirst({ where: { institutionId, id: requestId } });
  if (!request) throw new Error('Request not found');
  if (request.feePaid) throw new Error('Fee already paid');
  if (new Date() > request.gracePeriodEndsAt) throw new Error('Grace period has expired');

  const due = await ensureFeeDueForRequest(request);
  if (!due) throw new Error('Could not create fee due');

  const order = await prisma.paymentOrder.create({
    data: {
      institutionId,
      feeDueId: due.id,
      accountId: opts.accountId || '',
      amount: due.amount,
      status: 'CREATED',
      provider: 'RAZORPAY',
    },
  });

  if (!isRazorpayConfigured()) {
    await prisma.paymentOrder.update({
      where: { id: order.id },
      data: { providerOrderId: `stub_${order.id}` },
    });
    // Dev / unconfigured: complete payment immediately so mobile flow works
    await prisma.feeDue.update({ where: { id: due.id }, data: { status: FeeDueStatus.PAID } });
    await applyExamFeeDuePayment(institutionId, due.id, {
      receiptNumber: `STUB-${order.id.slice(-6).toUpperCase()}`,
      paymentMode: 'ONLINE',
      actor: 'Mobile Stub Payment',
    });
    await prisma.paymentOrder.update({
      where: { id: order.id },
      data: { status: 'PAID', providerPaymentId: `stub_pay_${order.id}` },
    });
    return {
      orderId: order.id,
      feeDueId: due.id,
      amount: due.amount,
      currency: 'INR',
      stub: true,
      paid: true,
      message: 'Payment recorded (gateway not configured). Request marked fee paid.',
    };
  }

  const razorpayOrder = await createRazorpayOrder({
    amountInr: due.amount,
    receipt: order.id,
    notes: { feeDueId: due.id, revaluationRequestId: request.id, institutionId },
  });
  await prisma.paymentOrder.update({
    where: { id: order.id },
    data: { providerOrderId: razorpayOrder.id },
  });

  return {
    orderId: order.id,
    feeDueId: due.id,
    amount: due.amount,
    amountPaise: razorpayOrder.amount,
    currency: razorpayOrder.currency,
    razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    providerOrderId: razorpayOrder.id,
    stub: false,
    paid: false,
  };
}

export async function createBackPaperPaymentOrder(
  institutionId: string,
  examId: string,
  opts: { accountId?: string } = {},
) {
  const exam = await prisma.examBackPaperExam.findFirst({ where: { institutionId, id: examId } });
  if (!exam) throw new Error('Back paper exam not found');
  if ((exam as { feePaid?: boolean }).feePaid) throw new Error('Fee already paid');
  const feeAmount = (exam as { feeAmount?: number }).feeAmount ?? 0;
  if (feeAmount <= 0) throw new Error('No fee due for this back paper');

  let feeDueId = (exam as { feeDueId?: string | null }).feeDueId;
  let due = feeDueId ? await prisma.feeDue.findFirst({ where: { id: feeDueId } }) : null;
  if (!due) {
    due = await createLinkedFeeDue({
      institutionId,
      studentId: exam.studentId,
      admissionNumber: exam.admissionNumber,
      academicYear: exam.academicYear,
      title: `Back paper fee — ${exam.subjectName}`,
      amount: feeAmount,
      remarks: `BKP:${exam.id}`,
    });
    if (due) {
      feeDueId = due.id;
      await prisma.examBackPaperExam.update({ where: { id: exam.id }, data: { feeDueId: due.id } });
    }
  }
  if (!due) throw new Error('Could not create fee due');

  const order = await prisma.paymentOrder.create({
    data: {
      institutionId,
      feeDueId: due.id,
      accountId: opts.accountId || '',
      amount: due.amount,
      status: 'CREATED',
      provider: 'RAZORPAY',
    },
  });

  if (!isRazorpayConfigured()) {
    await prisma.paymentOrder.update({
      where: { id: order.id },
      data: { providerOrderId: `stub_${order.id}`, status: 'PAID', providerPaymentId: `stub_pay_${order.id}` },
    });
    await prisma.feeDue.update({ where: { id: due.id }, data: { status: FeeDueStatus.PAID } });
    await applyExamFeeDuePayment(institutionId, due.id, {
      receiptNumber: `STUB-${order.id.slice(-6).toUpperCase()}`,
      paymentMode: 'ONLINE',
      actor: 'Mobile Stub Payment',
    });
    return {
      orderId: order.id,
      feeDueId: due.id,
      amount: due.amount,
      currency: 'INR',
      stub: true,
      paid: true,
      message: 'Payment recorded (gateway not configured). Back paper fee marked paid.',
    };
  }

  const razorpayOrder = await createRazorpayOrder({
    amountInr: due.amount,
    receipt: order.id,
    notes: { feeDueId: due.id, backPaperExamId: exam.id, institutionId },
  });
  await prisma.paymentOrder.update({
    where: { id: order.id },
    data: { providerOrderId: razorpayOrder.id },
  });

  return {
    orderId: order.id,
    feeDueId: due.id,
    amount: due.amount,
    amountPaise: razorpayOrder.amount,
    currency: razorpayOrder.currency,
    razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    providerOrderId: razorpayOrder.id,
    stub: false,
    paid: false,
  };
}

// ── Mobile student/parent APIs ───────────────────────────────────────────────

export async function getMobileRevaluationOverview(
  institutionId: string,
  studentId: string,
  academicYear?: string,
) {
  const student = await prisma.student.findFirst({ where: { id: studentId, institutionId } });
  if (!student) throw new Error('Student not found');
  const year = academicYear || student.academicYear;
  const config = await getOrCreateConfig(institutionId, year);

  const [requests, backPapers, eligibleAll, failedAll] = await Promise.all([
    prisma.examRevaluationRequest.findMany({
      where: { institutionId, studentId, academicYear: year },
      orderBy: [{ requestedAt: 'desc' }],
    }),
    prisma.examBackPaperExam.findMany({
      where: { institutionId, studentId, academicYear: year },
      orderBy: [{ createdAt: 'desc' }],
    }),
    getEligibleStudentsForRevaluation(institutionId, year, student.className, student.sectionName || undefined),
    getFailedStudentsForBackPaper(institutionId, year, student.className, student.sectionName || undefined),
  ]);

  const eligible = eligibleAll.eligible.filter((e) => e.studentId === studentId);
  const failed = failedAll.failed.filter((f) => f.studentId === studentId);

  return {
    studentId,
    academicYear: year,
    paymentsEnabled: isRazorpayConfigured(),
    config: {
      revaluationFee: config.revaluationFee,
      recheckFee: config.recheckFee,
      backPaperFee: (config as { backPaperFee?: number }).backPaperFee ?? 400,
      gracePeriodDays: config.gracePeriodDays,
      passingPercent: config.passingPercent,
    },
    requests: requests.map(serializeRequest),
    backPapers: backPapers.map(serializeBackPaper),
    eligible,
    failed,
  };
}

