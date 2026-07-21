import {
  AdmissionRecordStatus,
  ApplicationStatus,
  EnquiryStatus,
  FeePaymentMode,
  FollowUpMode,
  SeatAllocationStatus,
} from '@prisma/client';
import { prisma } from './prisma.js';
import { loadFeeCollectionContext } from './feeConfig.js';

const DEFAULT_YEAR = '2025-26';

const ENQUIRY_STATUS: Record<EnquiryStatus, string> = {
  NEW: 'New',
  IN_PROCESS: 'In Process',
  FOLLOW_UP: 'Follow Up',
  CONVERTED: 'Converted',
  NOT_INTERESTED: 'Not Interested',
};

const APPLICATION_STATUS: Record<ApplicationStatus, string> = {
  PENDING_VERIFICATION: 'Pending Verification',
  VERIFIED: 'Verified',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

const FOLLOW_UP_MODE: Record<FollowUpMode, string> = {
  PHONE: 'Phone',
  CAMPUS_VISIT: 'Campus Visit',
  VIDEO_CALL: 'Video Call',
  EMAIL: 'Email',
  IN_PERSON_COUNSELLING: 'In Person Counselling',
};

const PAYMENT_MODE: Record<FeePaymentMode, string> = {
  CASH: 'Cash',
  UPI: 'UPI',
  CARD: 'Card',
  CHEQUE: 'Cheque',
  BANK_TRANSFER: 'Bank Transfer',
};

const SEAT_STATUS: Record<SeatAllocationStatus, string> = {
  ALLOCATED: 'Allocated',
  WAITLISTED: 'Waitlisted',
};

const ADMISSION_STATUS: Record<AdmissionRecordStatus, string> = {
  PENDING_CONFIRMATION: 'Pending Confirmation',
  CONFIRMED: 'Confirmed',
};

function isoDate(d: Date | null | undefined): string {
  if (!d) return '';
  return d.toISOString();
}

function isoDateOnly(d: Date | null | undefined): string {
  if (!d) return '';
  return d.toISOString().slice(0, 10);
}

function parseDateRange(dateFrom?: string, dateTo?: string) {
  const from = dateFrom ? new Date(`${dateFrom}T00:00:00.000Z`) : null;
  const to = dateTo ? new Date(`${dateTo}T23:59:59.999Z`) : null;
  return { from, to };
}

function inDateRange(d: Date, from: Date | null, to: Date | null): boolean {
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}

export type AdmissionReportFilters = {
  academicYear?: string;
  dateFrom?: string;
  dateTo?: string;
};

export async function buildAdmissionReports(institutionId: string, filters: AdmissionReportFilters) {
  const academicYear = filters.academicYear || DEFAULT_YEAR;
  const { from, to } = parseDateRange(filters.dateFrom, filters.dateTo);

  const institution = await prisma.institution.findUnique({
    where: { id: institutionId },
    select: { name: true },
  });

  const feeCtx = await loadFeeCollectionContext(institutionId);

  const [
    enquiries,
    applications,
    followUps,
    counsellingLogs,
    meritAttempts,
    seatAllocations,
    admissionRecords,
    feeReceipts,
  ] = await Promise.all([
    prisma.enquiry.findMany({
      where: { institutionId },
      orderBy: { enquiryDate: 'desc' },
    }),
    prisma.application.findMany({
      where: { institutionId },
      include: {
        enquiry: { select: { enquiryId: true, enquirerName: true, source: true } },
      },
      orderBy: { submittedAt: 'desc' },
    }),
    prisma.followUpTask.findMany({
      where: { enquiry: { institutionId } },
      include: {
        enquiry: { select: { enquiryId: true, enquirerName: true, mobile: true } },
      },
      orderBy: { dueDate: 'desc' },
    }),
    prisma.counselingLog.findMany({
      where: { enquiry: { institutionId } },
      include: {
        enquiry: { select: { enquiryId: true, enquirerName: true, mobile: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.entranceExamAttempt.findMany({
      where: {
        credential: { publication: { institutionId } },
      },
      include: {
        credential: {
          include: {
            publication: { include: { test: { select: { title: true } } } },
            application: {
              select: {
                id: true,
                applicationId: true,
                studentName: true,
                classApplied: true,
                mobile: true,
                email: true,
                entranceTestScore: true,
              },
            },
          },
        },
      },
      orderBy: [{ percentScore: 'desc' }, { submittedAt: 'desc' }],
    }),
    prisma.seatAllocation.findMany({
      where: { institutionId, academicYear },
      include: {
        application: {
          select: {
            applicationId: true,
            studentName: true,
            mobile: true,
            email: true,
            classApplied: true,
          },
        },
      },
      orderBy: [{ className: 'asc' }, { meritRank: 'asc' }],
    }),
    prisma.admissionRecord.findMany({
      where: { institutionId, academicYear },
      include: {
        application: {
          select: {
            applicationId: true,
            studentName: true,
            fatherName: true,
            motherName: true,
            mobile: true,
            email: true,
            classApplied: true,
            status: true,
            submittedAt: true,
            entranceTestScore: true,
            enquiryId: true,
            enquiry: { select: { enquiryId: true, source: true, enquirerName: true } },
          },
        },
        feeReceipts: { orderBy: { collectedAt: 'asc' } },
      },
      orderBy: [{ status: 'asc' }, { confirmedAt: 'desc' }],
    }),
    prisma.feeReceipt.findMany({
      where: { institutionId, academicYear },
      orderBy: { collectedAt: 'desc' },
    }),
  ]);

  const filteredEnquiries = enquiries.filter((e) => inDateRange(e.enquiryDate, from, to));
  const filteredApplications = applications.filter((a) => inDateRange(a.submittedAt, from, to));
  const filteredFollowUps = followUps.filter((f) => inDateRange(f.dueDate, from, to));
  const filteredCounselling = counsellingLogs.filter((c) => inDateRange(c.createdAt, from, to));
  const filteredFees = feeReceipts.filter((f) => inDateRange(f.collectedAt, from, to));

  const enquiryRows = filteredEnquiries.map((e) => ({
    enquiryId: e.enquiryId,
    enquiryDate: isoDateOnly(e.enquiryDate),
    enquirerName: e.enquirerName,
    mobile: e.mobile,
    email: e.email,
    classInterested: e.classInterested,
    source: e.source,
    status: ENQUIRY_STATUS[e.status],
    assignedTo: e.assignedTo,
    nextFollowUp: isoDateOnly(e.nextFollowUp),
    notes: e.notes || '',
    lastContactedAt: isoDateOnly(e.lastContactedAt),
  }));

  const applicationRows = filteredApplications.map((a) => ({
    applicationId: a.applicationId,
    submittedAt: isoDate(a.submittedAt),
    studentName: a.studentName,
    fatherName: a.fatherName,
    motherName: a.motherName,
    classApplied: a.classApplied,
    mobile: a.mobile,
    email: a.email,
    status: APPLICATION_STATUS[a.status],
    enquiryId: a.enquiry?.enquiryId || '',
    submittedBy: a.submittedBy,
    entranceTestScore: a.entranceTestScore,
    reviewedBy: a.reviewedBy || '',
    reviewedAt: isoDate(a.reviewedAt),
  }));

  const followUpRows = filteredFollowUps.map((f) => ({
    enquiryId: f.enquiry.enquiryId,
    enquirerName: f.enquiry.enquirerName,
    mobile: f.enquiry.mobile,
    title: f.title,
    mode: FOLLOW_UP_MODE[f.mode],
    subject: f.subject,
    assignedTo: f.assignedTo,
    dueDate: isoDateOnly(f.dueDate),
    status: f.status,
    discussionNotes: f.discussionNotes || '',
  }));

  const counsellingRows = filteredCounselling.map((c) => ({
    enquiryId: c.enquiry.enquiryId,
    enquirerName: c.enquiry.enquirerName,
    mobile: c.enquiry.mobile,
    interactionType: c.interactionType,
    sentiment: c.sentiment,
    engagement: c.engagement,
    riskFactor: c.riskFactor,
    riskDetails: c.riskDetails || '',
    remarks: c.remarks,
    actionIntent: c.actionIntent,
    counselorName: c.counselorName,
    nextFollowUp: isoDateOnly(c.nextFollowUp),
    createdAt: isoDate(c.createdAt),
  }));

  const meritRows = meritAttempts.map((attempt, index) => {
    const app = attempt.credential.application;
    const test = attempt.credential.publication.test;
    return {
      rank: index + 1,
      applicationId: app.applicationId,
      studentName: app.studentName,
      classApplied: app.classApplied,
      mobile: app.mobile,
      email: app.email,
      testTitle: test.title,
      scorePercent: attempt.percentScore,
      rawScore: attempt.score,
      maxScore: attempt.maxScore,
      passed: attempt.passed == null ? '' : attempt.passed ? 'Yes' : 'No',
      submittedAt: isoDate(attempt.submittedAt),
    };
  });

  const seatRows = seatAllocations.map((s) => ({
    applicationId: s.application.applicationId,
    studentName: s.application.studentName,
    className: s.className,
    sectionName: s.sectionName,
    meritRank: s.meritRank,
    classMeritRank: s.classMeritRank,
    entranceScore: s.entranceScore,
    status: SEAT_STATUS[s.status],
    academicYear: s.academicYear,
    allocatedAt: isoDate(s.allocatedAt),
    allocatedBy: s.allocatedBy,
  }));

  const admissionRows = admissionRecords.map((r) => {
    const feeTotal = r.feeReceipts.reduce((sum, fr) => sum + fr.amountPaid, 0);
    return {
      admissionNumber: r.admissionNumber || '',
      applicationId: r.application.applicationId,
      studentName: r.application.studentName,
      fatherName: r.application.fatherName,
      mobile: r.application.mobile,
      email: r.application.email,
      className: r.className,
      sectionName: r.sectionName,
      academicYear: r.academicYear,
      status: ADMISSION_STATUS[r.status],
      enquiryId: r.application.enquiry?.enquiryId || '',
      enquirySource: r.application.enquiry?.source || '',
      principalApprovedAt: isoDate(r.principalApprovedAt),
      confirmedAt: isoDate(r.confirmedAt),
      confirmedBy: r.confirmedBy,
      feeReceiptCount: r.feeReceipts.length,
      totalFeeCollected: feeTotal,
    };
  });

  const feeRows = filteredFees.map((f) => {
    const breakdown = Array.isArray(f.feeBreakdown)
      ? (f.feeBreakdown as { key?: string; label?: string; amount?: number }[])
      : [];
    const breakdownText = breakdown
      .map((b) => `${b.label || b.key || 'Fee'}: ${b.amount ?? 0}`)
      .join('; ');
    return {
      receiptNumber: f.receiptNumber,
      studentName: f.studentName,
      admissionNumber: f.admissionNumber,
      className: f.className,
      sectionName: f.sectionName,
      academicYear: f.academicYear,
      paymentMode: PAYMENT_MODE[f.paymentMode],
      amountPaid: f.amountPaid,
      feeBreakdown: breakdownText,
      remarks: f.remarks,
      collectedBy: f.collectedBy,
      collectedAt: isoDate(f.collectedAt),
    };
  });

  const seatByAppDbId = new Map(seatAllocations.map((s) => [s.applicationId, s]));
  const meritByAppDbId = new Map(meritAttempts.map((m) => [m.credential.applicationId, m]));

  const consolidatedRows = admissionRecords.map((r) => {
    const app = r.application;
    const seat = seatByAppDbId.get(r.applicationId);
    const merit = meritByAppDbId.get(r.applicationId);
    const feeTotal = r.feeReceipts.reduce((sum, fr) => sum + fr.amountPaid, 0);
    const lastReceipt = r.feeReceipts[r.feeReceipts.length - 1];
    const enquiry = app.enquiry;

    return {
      admissionNumber: r.admissionNumber || '',
      studentName: app.studentName,
      fatherName: app.fatherName,
      motherName: app.motherName,
      mobile: app.mobile,
      email: app.email,
      className: r.className,
      sectionName: r.sectionName,
      academicYear: r.academicYear,
      admissionStatus: ADMISSION_STATUS[r.status],
      applicationId: app.applicationId,
      applicationStatus: APPLICATION_STATUS[app.status],
      enquiryId: enquiry?.enquiryId || '',
      enquirySource: enquiry?.source || '',
      entranceTestTitle: merit?.credential.publication.test.title || '',
      entranceScorePercent: merit?.percentScore ?? app.entranceTestScore ?? '',
      meritRank: seat?.meritRank ?? '',
      seatStatus: seat ? SEAT_STATUS[seat.status] : '',
      principalApprovedAt: isoDateOnly(r.principalApprovedAt),
      confirmedAt: isoDateOnly(r.confirmedAt),
      feeReceiptCount: r.feeReceipts.length,
      totalFeeCollected: feeTotal,
      lastReceiptNumber: lastReceipt?.receiptNumber || '',
      lastPaymentMode: lastReceipt ? PAYMENT_MODE[lastReceipt.paymentMode] : '',
      lastFeeCollectedAt: lastReceipt ? isoDate(lastReceipt.collectedAt) : '',
    };
  });

  const totalFeeCollected = filteredFees.reduce((s, f) => s + f.amountPaid, 0);
  const confirmedCount = admissionRecords.filter(
    (r) => r.status === AdmissionRecordStatus.CONFIRMED,
  ).length;

  const summary = {
    institutionName: institution?.name || 'Institution',
    academicYear,
    dateFrom: filters.dateFrom || '',
    dateTo: filters.dateTo || '',
    generatedAt: new Date().toISOString(),
    enquiries: filteredEnquiries.length,
    applications: filteredApplications.length,
    followUps: filteredFollowUps.length,
    counsellingSessions: filteredCounselling.length,
    meritEntries: meritRows.length,
    seatAllocations: seatAllocations.length,
    admissionsTotal: admissionRecords.length,
    admissionsConfirmed: confirmedCount,
    feeReceipts: filteredFees.length,
    totalFeeCollected,
    currency: feeCtx.currency,
  };

  return {
    summary,
    sheets: {
      summary: [summary],
      enquiries: enquiryRows,
      applications: applicationRows,
      followUps: followUpRows,
      counselling: counsellingRows,
      meritList: meritRows,
      seatAllocation: seatRows,
      admissions: admissionRows,
      feeCollection: feeRows,
      consolidatedNewAdmissions: consolidatedRows,
    },
  };
}

export async function getAdmissionReportMeta(institutionId: string) {
  const [yearsFromAdmissions, yearsFromSeats, yearsFromFees] = await Promise.all([
    prisma.admissionRecord.findMany({
      where: { institutionId },
      select: { academicYear: true },
      distinct: ['academicYear'],
      orderBy: { academicYear: 'desc' },
    }),
    prisma.seatAllocation.findMany({
      where: { institutionId },
      select: { academicYear: true },
      distinct: ['academicYear'],
      orderBy: { academicYear: 'desc' },
    }),
    prisma.feeReceipt.findMany({
      where: { institutionId },
      select: { academicYear: true },
      distinct: ['academicYear'],
      orderBy: { academicYear: 'desc' },
    }),
  ]);

  const academicYears = [
    ...new Set([
      DEFAULT_YEAR,
      ...yearsFromAdmissions.map((y) => y.academicYear),
      ...yearsFromSeats.map((y) => y.academicYear),
      ...yearsFromFees.map((y) => y.academicYear),
    ]),
  ];

  return {
    defaultAcademicYear: DEFAULT_YEAR,
    academicYears,
    reportSheets: [
      { key: 'summary', label: 'Summary' },
      { key: 'consolidatedNewAdmissions', label: 'Consolidated New Admissions' },
      { key: 'enquiries', label: 'Enquiries' },
      { key: 'applications', label: 'Applications' },
      { key: 'followUps', label: 'Follow Ups' },
      { key: 'counselling', label: 'Counselling' },
      { key: 'meritList', label: 'Merit List' },
      { key: 'seatAllocation', label: 'Seat Allocation' },
      { key: 'admissions', label: 'Admissions' },
      { key: 'feeCollection', label: 'Fee Collection' },
    ],
  };
}
