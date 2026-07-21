import { AdmissionRecordStatus, ApplicationStatus, SeatAllocationStatus } from '@prisma/client';
import { prisma } from './prisma.js';

const DEFAULT_YEAR = '2025-26';

export async function generateAdmissionNumber(institutionId: string): Promise<string> {
  const setup = await prisma.institutionSetup.findUnique({ where: { institutionId } });
  const numbering = (setup?.idCardNumbering || {}) as {
    sections?: {
      admissionNumber?: { admissionPrefix?: string; admissionNext?: string };
    };
    admissionNumber?: { admissionPrefix?: string; admissionNext?: string };
  };

  const admissionSection =
    numbering.sections?.admissionNumber ||
    numbering.admissionNumber ||
    ({} as { admissionPrefix?: string; admissionNext?: string });

  const year = new Date().getFullYear();
  const prefix = admissionSection.admissionPrefix?.trim() || `ADM-${year}-`;
  const existing = await prisma.admissionRecord.count({
    where: { institutionId, admissionNumber: { not: null } },
  });
  const nextFromSetup = Number.parseInt(String(admissionSection.admissionNext || ''), 10);
  const seq = Number.isFinite(nextFromSetup) && nextFromSetup > 0 ? nextFromSetup + existing : existing + 1;

  for (let i = 0; i < 50; i++) {
    const num = seq + i;
    const padded = String(num).padStart(4, '0');
    const candidate = prefix.endsWith('-') ? `${prefix}${padded}` : `${prefix}${padded}`;
    const taken = await prisma.admissionRecord.findFirst({
      where: { institutionId, admissionNumber: candidate },
    });
    if (!taken) return candidate;
  }

  return `ADM-${year}-${Date.now().toString().slice(-6)}`;
}

export async function ensureAdmissionRecordForApprovedApp(
  applicationId: string,
  institutionId: string,
) {
  const app = await prisma.application.findFirst({
    where: { id: applicationId, institutionId, status: ApplicationStatus.APPROVED },
    include: { seatAllocation: true, admissionRecord: true },
  });
  if (!app) return null;
  if (app.admissionRecord) return app.admissionRecord;

  const seat = app.seatAllocation;
  const allocated = seat?.status === SeatAllocationStatus.ALLOCATED;

  return prisma.admissionRecord.create({
    data: {
      institutionId,
      applicationId: app.id,
      className: allocated && seat.className ? seat.className : app.classApplied || 'Unspecified',
      sectionName: allocated && seat.sectionName ? seat.sectionName : '',
      academicYear: seat?.academicYear || DEFAULT_YEAR,
      principalApprovedBy: app.reviewedBy || '',
      principalApprovedAt: app.reviewedAt,
      status: AdmissionRecordStatus.PENDING_CONFIRMATION,
    },
  });
}

export async function syncAdmissionRecordsForInstitution(institutionId: string) {
  const approved = await prisma.application.findMany({
    where: { institutionId, status: ApplicationStatus.APPROVED },
    select: { id: true },
  });
  let created = 0;
  for (const app of approved) {
    const before = await prisma.admissionRecord.findUnique({
      where: { applicationId: app.id },
    });
    if (!before) {
      await ensureAdmissionRecordForApprovedApp(app.id, institutionId);
      created += 1;
    }
  }
  return created;
}

export function serializeAdmissionRecord(
  record: {
    id: string;
    admissionNumber: string | null;
    className: string;
    sectionName: string;
    academicYear: string;
    status: AdmissionRecordStatus;
    principalApprovedBy: string;
    principalApprovedAt: Date | null;
    confirmedAt: Date | null;
    confirmedBy: string;
    notes: string;
    createdAt: Date;
    updatedAt: Date;
    application: {
      id: string;
      applicationId: string;
      studentName: string;
      classApplied: string;
      fatherName: string;
      motherName: string;
      mobile: string;
      email: string;
      entranceTestScore: number | null;
      reviewedBy: string | null;
      reviewedAt: Date | null;
      approvalRemarks: string | null;
      status: ApplicationStatus;
    };
  },
  seat?: {
    meritRank: number;
    classMeritRank: number;
    entranceScore: number;
    status: SeatAllocationStatus;
  } | null,
) {
  return {
    id: record.id,
    admissionNumber: record.admissionNumber,
    className: record.className,
    sectionName: record.sectionName,
    academicYear: record.academicYear,
    status: record.status === AdmissionRecordStatus.CONFIRMED ? 'Confirmed' : 'Pending Confirmation',
    statusKey: record.status,
    principalApprovedBy: record.principalApprovedBy || record.application.reviewedBy || '',
    principalApprovedAt: (record.principalApprovedAt || record.application.reviewedAt)?.toISOString() || '',
    confirmedAt: record.confirmedAt?.toISOString() || '',
    confirmedBy: record.confirmedBy,
    notes: record.notes,
    applicationDbId: record.application.id,
    applicationId: record.application.applicationId,
    studentName: record.application.studentName,
    classApplied: record.application.classApplied,
    fatherName: record.application.fatherName,
    motherName: record.application.motherName,
    mobile: record.application.mobile,
    email: record.application.email,
    entranceTestScore: record.application.entranceTestScore,
    approvalRemarks: record.application.approvalRemarks || '',
    seatMeritRank: seat?.meritRank ?? null,
    seatClassRank: seat?.classMeritRank ?? null,
    seatStatus: seat
      ? seat.status === SeatAllocationStatus.ALLOCATED
        ? 'Allocated'
        : 'Waitlisted'
      : null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}
