import { GatePassStatus, GatePassType, Prisma, StudentStatus } from '@prisma/client';
import { prisma } from './prisma.js';
import { dispatchPushNotifications } from './notifications.js';
import { formatClassSection, getInstitutionFilterMeta } from './students.js';

export type GatePassStatusFilter =
  | 'all'
  | 'pending'
  | 'awaiting_principal'
  | 'approved'
  | 'rejected'
  | 'issued'
  | 'completed';

const STATUS_LABELS: Record<GatePassStatus, string> = {
  PENDING: 'Pending Review',
  AWAITING_PRINCIPAL: 'Awaiting Principal',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  ISSUED: 'Gate Pass Issued',
  COMPLETED: 'Student Exited',
};

const PASS_TYPE_LABELS: Record<GatePassType, string> = {
  HALF_DAY: 'Half Day Leave',
  MID_CLASS: 'Mid-Class Exit',
};

function statusFilterWhere(status?: GatePassStatusFilter): GatePassStatus | undefined {
  if (!status || status === 'all') return undefined;
  const map: Record<string, GatePassStatus> = {
    pending: GatePassStatus.PENDING,
    awaiting_principal: GatePassStatus.AWAITING_PRINCIPAL,
    approved: GatePassStatus.APPROVED,
    rejected: GatePassStatus.REJECTED,
    issued: GatePassStatus.ISSUED,
    completed: GatePassStatus.COMPLETED,
  };
  return map[status];
}

async function nextPassNumber(institutionId: string) {
  const count = await prisma.studentGatePass.count({ where: { institutionId } });
  return `GP-${String(1000 + count + 1)}`;
}

function serializeGatePass(row: {
  id: string;
  recordId: string;
  passNumber: string;
  studentId: string;
  academicYear: string;
  className: string;
  sectionName: string;
  passType: GatePassType;
  reason: string;
  remarks: string;
  parentName: string;
  parentMobile: string;
  parentRelation: string;
  status: GatePassStatus;
  createdBy: string;
  submittedBy: string;
  submittedAt: Date | null;
  approvedBy: string;
  approvedAt: Date | null;
  rejectedBy: string;
  rejectedAt: Date | null;
  rejectionReason: string;
  principalRemarks: string;
  issuedBy: string;
  issuedAt: Date | null;
  exitTime: string;
  completedAt: Date | null;
  principalNotifiedAt: Date | null;
  source: string;
  createdAt: Date;
  updatedAt: Date;
  student: {
    id: string;
    admissionNumber: string;
    rollNumber: string;
    firstName: string;
    lastName: string;
    className: string;
    sectionName: string;
    fatherName: string;
    fatherMobile: string;
    motherName: string;
    motherMobile: string;
  };
}) {
  return {
    id: row.id,
    recordId: row.recordId,
    passNumber: row.passNumber,
    studentId: row.studentId,
    studentName: `${row.student.firstName} ${row.student.lastName}`.trim(),
    admissionNumber: row.student.admissionNumber,
    rollNumber: row.student.rollNumber,
    className: row.className,
    sectionName: row.sectionName,
    classGroup: formatClassSection(row.className, row.sectionName),
    academicYear: row.academicYear,
    passType: row.passType,
    passTypeLabel: PASS_TYPE_LABELS[row.passType],
    reason: row.reason,
    remarks: row.remarks,
    parentName: row.parentName,
    parentMobile: row.parentMobile,
    parentRelation: row.parentRelation,
    status: row.status,
    statusLabel: STATUS_LABELS[row.status],
    createdBy: row.createdBy,
    submittedBy: row.submittedBy,
    submittedAt: row.submittedAt?.toISOString() ?? null,
    approvedBy: row.approvedBy,
    approvedAt: row.approvedAt?.toISOString() ?? null,
    rejectedBy: row.rejectedBy,
    rejectedAt: row.rejectedAt?.toISOString() ?? null,
    rejectionReason: row.rejectionReason,
    principalRemarks: row.principalRemarks,
    issuedBy: row.issuedBy,
    issuedAt: row.issuedAt?.toISOString() ?? null,
    exitTime: row.exitTime,
    completedAt: row.completedAt?.toISOString() ?? null,
    principalNotifiedAt: row.principalNotifiedAt?.toISOString() ?? null,
    source: row.source,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    fatherName: row.student.fatherName,
    fatherMobile: row.student.fatherMobile,
    motherName: row.student.motherName,
    motherMobile: row.student.motherMobile,
    canSubmitToPrincipal: row.status === GatePassStatus.PENDING,
    canApprove: row.status === GatePassStatus.AWAITING_PRINCIPAL,
    canReject: row.status === GatePassStatus.PENDING || row.status === GatePassStatus.AWAITING_PRINCIPAL,
    canIssue: row.status === GatePassStatus.APPROVED,
    canComplete: row.status === GatePassStatus.ISSUED,
    isPrintable: row.status === GatePassStatus.APPROVED || row.status === GatePassStatus.ISSUED || row.status === GatePassStatus.COMPLETED,
  };
}

const studentInclude = {
  student: {
    select: {
      id: true,
      admissionNumber: true,
      rollNumber: true,
      firstName: true,
      lastName: true,
      className: true,
      sectionName: true,
      fatherName: true,
      fatherMobile: true,
      motherName: true,
      motherMobile: true,
    },
  },
} as const;

export async function getGatePassMeta(institutionId: string, academicYear?: string) {
  const filters = await getInstitutionFilterMeta(institutionId);
  const year = academicYear || filters.defaultAcademicYear;

  const classOptions = await prisma.student.findMany({
    where: { institutionId, academicYear: year, status: StudentStatus.ACTIVE },
    select: { className: true, sectionName: true },
    distinct: ['className', 'sectionName'],
    orderBy: [{ className: 'asc' }, { sectionName: 'asc' }],
  });

  const classGroups = classOptions.map((r) => ({
    className: r.className,
    sectionName: r.sectionName,
    label: formatClassSection(r.className, r.sectionName),
  }));

  const sections = [...new Set(classOptions.map((c) => c.sectionName).filter(Boolean))].sort();

  return {
    defaultAcademicYear: year,
    academicYears: filters.academicYears,
    classes: filters.classes,
    sections,
    classGroups,
    passTypes: [
      { id: 'HALF_DAY', label: 'Half Day Leave', description: 'Parent taking child for remainder of the day' },
      { id: 'MID_CLASS', label: 'Mid-Class Exit', description: 'Parent taking child during an ongoing class due to unexpected event' },
    ],
    statusLegend: Object.entries(STATUS_LABELS).map(([id, label]) => ({ id, label })),
    workflowNote: 'Parent visit → Admin creates request → Submit to Principal → Principal approves via mobile app → Issue gate pass',
  };
}

export async function listStudentsForGatePass(
  institutionId: string,
  opts: { academicYear?: string; className?: string; sectionName?: string; q?: string },
) {
  const academicYear = opts.academicYear || '2025-26';
  const students = await prisma.student.findMany({
    where: {
      institutionId,
      academicYear,
      status: StudentStatus.ACTIVE,
      ...(opts.className ? { className: opts.className } : {}),
      ...(opts.sectionName ? { sectionName: opts.sectionName } : {}),
      ...(opts.q
        ? {
            OR: [
              { firstName: { contains: opts.q, mode: 'insensitive' } },
              { lastName: { contains: opts.q, mode: 'insensitive' } },
              { admissionNumber: { contains: opts.q, mode: 'insensitive' } },
              { rollNumber: { contains: opts.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      admissionNumber: true,
      rollNumber: true,
      firstName: true,
      lastName: true,
      className: true,
      sectionName: true,
      fatherName: true,
      fatherMobile: true,
      motherName: true,
      motherMobile: true,
    },
    orderBy: [{ firstName: 'asc' }],
    take: 200,
  });

  return students.map((s) => ({
    id: s.id,
    name: `${s.firstName} ${s.lastName}`.trim(),
    admissionNumber: s.admissionNumber,
    rollNumber: s.rollNumber,
    classGroup: formatClassSection(s.className, s.sectionName),
    className: s.className,
    sectionName: s.sectionName,
    fatherName: s.fatherName,
    fatherMobile: s.fatherMobile,
    motherName: s.motherName,
    motherMobile: s.motherMobile,
  }));
}

export async function listGatePasses(
  institutionId: string,
  opts: { academicYear?: string; status?: GatePassStatusFilter; date?: string; className?: string; q?: string },
) {
  const academicYear = opts.academicYear || '2025-26';
  const status = statusFilterWhere(opts.status);

  const where: Prisma.StudentGatePassWhereInput = {
    institutionId,
    academicYear,
    ...(status ? { status } : {}),
    ...(opts.className ? { className: opts.className } : {}),
    ...(opts.q
      ? {
          OR: [
            { passNumber: { contains: opts.q, mode: 'insensitive' } },
            { parentName: { contains: opts.q, mode: 'insensitive' } },
            { reason: { contains: opts.q, mode: 'insensitive' } },
            { student: { firstName: { contains: opts.q, mode: 'insensitive' } } },
            { student: { lastName: { contains: opts.q, mode: 'insensitive' } } },
            { student: { admissionNumber: { contains: opts.q, mode: 'insensitive' } } },
          ],
        }
      : {}),
  };

  if (opts.date) {
    const d = new Date(opts.date);
    const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
    where.createdAt = { gte: start, lte: end };
  }

  const rows = await prisma.studentGatePass.findMany({
    where,
    include: studentInclude,
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  const items = rows.map(serializeGatePass);
  const summary = {
    total: items.length,
    pending: items.filter((i) => i.status === GatePassStatus.PENDING).length,
    awaitingPrincipal: items.filter((i) => i.status === GatePassStatus.AWAITING_PRINCIPAL).length,
    approved: items.filter((i) => i.status === GatePassStatus.APPROVED).length,
    rejected: items.filter((i) => i.status === GatePassStatus.REJECTED).length,
    issued: items.filter((i) => i.status === GatePassStatus.ISSUED).length,
    completed: items.filter((i) => i.status === GatePassStatus.COMPLETED).length,
  };

  return { academicYear, items, summary };
}

export async function getGatePassById(institutionId: string, id: string) {
  const row = await prisma.studentGatePass.findFirst({
    where: { id, institutionId },
    include: studentInclude,
  });
  if (!row) throw new Error('Gate pass not found');
  return serializeGatePass(row);
}

export async function createGatePass(
  institutionId: string,
  input: {
    studentId: string;
    academicYear?: string;
    passType: GatePassType;
    reason: string;
    remarks?: string;
    parentName: string;
    parentMobile?: string;
    parentRelation?: string;
    createdBy?: string;
    source?: string;
  },
) {
  const student = await prisma.student.findFirst({
    where: { id: input.studentId, institutionId, status: StudentStatus.ACTIVE },
  });
  if (!student) throw new Error('Student not found');

  const passNumber = await nextPassNumber(institutionId);
  const row = await prisma.studentGatePass.create({
    data: {
      institutionId,
      recordId: passNumber,
      passNumber,
      studentId: student.id,
      academicYear: input.academicYear || student.academicYear,
      className: student.className,
      sectionName: student.sectionName,
      passType: input.passType,
      reason: input.reason.trim(),
      remarks: input.remarks?.trim() || '',
      parentName: input.parentName.trim(),
      parentMobile: input.parentMobile?.trim() || '',
      parentRelation: input.parentRelation?.trim() || 'Parent',
      createdBy: input.createdBy || 'Front Desk',
      source: input.source || 'FRONT_DESK',
    },
    include: studentInclude,
  });

  return serializeGatePass(row);
}

async function notifyPrincipalForApproval(
  institutionId: string,
  pass: ReturnType<typeof serializeGatePass>,
) {
  const admins = await prisma.user.findMany({
    where: { role: { in: ['SUPER_ADMIN', 'ADMIN'] } },
    select: { displayName: true, email: true },
  });

  return dispatchPushNotifications({
    institutionId,
    event: 'Gate Pass Principal Approval',
    title: 'Gate Pass Approval Required',
    body: `Principal approval needed for ${pass.studentName} (${pass.classGroup}) — ${pass.passTypeLabel}. Parent: ${pass.parentName}. Pass #${pass.passNumber}`,
    recipients: admins.map((u) => ({
      type: 'staff' as const,
      name: u.displayName,
      email: u.email,
    })),
  });
}

export async function submitGatePassToPrincipal(
  institutionId: string,
  id: string,
  submittedBy: string,
  adminRemarks?: string,
) {
  const existing = await prisma.studentGatePass.findFirst({ where: { id, institutionId } });
  if (!existing) throw new Error('Gate pass not found');
  if (existing.status !== GatePassStatus.PENDING) {
    throw new Error('Only pending gate pass requests can be submitted to principal');
  }

  const row = await prisma.studentGatePass.update({
    where: { id },
    data: {
      status: GatePassStatus.AWAITING_PRINCIPAL,
      submittedBy,
      submittedAt: new Date(),
      remarks: adminRemarks?.trim() ? `${existing.remarks}\n[Admin]: ${adminRemarks.trim()}`.trim() : existing.remarks,
      principalNotifiedAt: new Date(),
    },
    include: studentInclude,
  });

  const serialized = serializeGatePass(row);
  const notification = await notifyPrincipalForApproval(institutionId, serialized);

  return { ...serialized, notification };
}

export async function approveGatePass(
  institutionId: string,
  id: string,
  approvedBy: string,
  principalRemarks?: string,
) {
  const existing = await prisma.studentGatePass.findFirst({ where: { id, institutionId } });
  if (!existing) throw new Error('Gate pass not found');
  if (existing.status !== GatePassStatus.AWAITING_PRINCIPAL) {
    throw new Error('Only requests awaiting principal approval can be approved');
  }

  const row = await prisma.studentGatePass.update({
    where: { id },
    data: {
      status: GatePassStatus.APPROVED,
      approvedBy,
      approvedAt: new Date(),
      principalRemarks: principalRemarks?.trim() || '',
    },
    include: studentInclude,
  });

  return serializeGatePass(row);
}

export async function rejectGatePass(
  institutionId: string,
  id: string,
  rejectedBy: string,
  rejectionReason: string,
) {
  if (!rejectionReason.trim()) throw new Error('Rejection reason is required');

  const existing = await prisma.studentGatePass.findFirst({ where: { id, institutionId } });
  if (!existing) throw new Error('Gate pass not found');
  if (existing.status !== GatePassStatus.PENDING && existing.status !== GatePassStatus.AWAITING_PRINCIPAL) {
    throw new Error('This gate pass cannot be rejected in its current status');
  }

  const row = await prisma.studentGatePass.update({
    where: { id },
    data: {
      status: GatePassStatus.REJECTED,
      rejectedBy,
      rejectedAt: new Date(),
      rejectionReason: rejectionReason.trim(),
    },
    include: studentInclude,
  });

  return serializeGatePass(row);
}

export async function issueGatePass(
  institutionId: string,
  id: string,
  issuedBy: string,
  exitTime?: string,
) {
  const existing = await prisma.studentGatePass.findFirst({ where: { id, institutionId } });
  if (!existing) throw new Error('Gate pass not found');
  if (existing.status !== GatePassStatus.APPROVED) {
    throw new Error('Only approved gate passes can be issued');
  }

  const now = new Date();
  const time = exitTime || now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  const row = await prisma.studentGatePass.update({
    where: { id },
    data: {
      status: GatePassStatus.ISSUED,
      issuedBy,
      issuedAt: now,
      exitTime: time,
    },
    include: studentInclude,
  });

  return serializeGatePass(row);
}

export async function completeGatePass(institutionId: string, id: string) {
  const existing = await prisma.studentGatePass.findFirst({ where: { id, institutionId } });
  if (!existing) throw new Error('Gate pass not found');
  if (existing.status !== GatePassStatus.ISSUED) {
    throw new Error('Only issued gate passes can be marked as completed');
  }

  const row = await prisma.studentGatePass.update({
    where: { id },
    data: {
      status: GatePassStatus.COMPLETED,
      completedAt: new Date(),
    },
    include: studentInclude,
  });

  return serializeGatePass(row);
}

export async function seedGatePassDemo(institutionId: string, academicYear = '2025-26') {
  const students = await prisma.student.findMany({
    where: { institutionId, academicYear, status: StudentStatus.ACTIVE },
    take: 6,
  });
  if (!students.length) return { created: 0 };

  const demos = [
    { passType: GatePassType.MID_CLASS, reason: 'Family emergency — parent arrived unexpectedly', parentName: 'Mr. Sharma', status: GatePassStatus.PENDING },
    { passType: GatePassType.HALF_DAY, reason: 'Medical appointment scheduled urgently', parentName: 'Mrs. Patel', status: GatePassStatus.AWAITING_PRINCIPAL },
    { passType: GatePassType.MID_CLASS, reason: 'Sibling accident — parent needs to take student home', parentName: 'Mr. Kumar', status: GatePassStatus.APPROVED },
    { passType: GatePassType.HALF_DAY, reason: 'Grandparent hospitalised', parentName: 'Mrs. Reddy', status: GatePassStatus.ISSUED },
    { passType: GatePassType.MID_CLASS, reason: 'Court summons for parent with child', parentName: 'Mr. Singh', status: GatePassStatus.COMPLETED },
    { passType: GatePassType.HALF_DAY, reason: 'Travel — flight rescheduled', parentName: 'Mrs. Nair', status: GatePassStatus.REJECTED },
  ];

  let created = 0;
  for (let i = 0; i < Math.min(students.length, demos.length); i++) {
    const s = students[i];
    const d = demos[i];
    const passNumber = `GP-DEMO-${i + 1}`;
    await prisma.studentGatePass.upsert({
      where: { institutionId_recordId: { institutionId, recordId: passNumber } },
      create: {
        institutionId,
        recordId: passNumber,
        passNumber,
        studentId: s.id,
        academicYear,
        className: s.className,
        sectionName: s.sectionName,
        passType: d.passType,
        reason: d.reason,
        remarks: 'Demo gate pass request',
        parentName: d.parentName,
        parentMobile: s.fatherMobile || s.motherMobile || '9876543210',
        parentRelation: 'Parent',
        status: d.status,
        createdBy: 'Demo Seed',
        ...(d.status !== GatePassStatus.PENDING
          ? { submittedBy: 'Admin', submittedAt: new Date() }
          : {}),
        ...(d.status === GatePassStatus.APPROVED || d.status === GatePassStatus.ISSUED || d.status === GatePassStatus.COMPLETED
          ? { approvedBy: 'Principal', approvedAt: new Date(), principalRemarks: 'Approved — genuine emergency' }
          : {}),
        ...(d.status === GatePassStatus.ISSUED || d.status === GatePassStatus.COMPLETED
          ? { issuedBy: 'Front Desk', issuedAt: new Date(), exitTime: '11:30 AM' }
          : {}),
        ...(d.status === GatePassStatus.COMPLETED ? { completedAt: new Date() } : {}),
        ...(d.status === GatePassStatus.REJECTED
          ? { rejectedBy: 'Principal', rejectedAt: new Date(), rejectionReason: 'Insufficient documentation provided' }
          : {}),
      },
      update: {},
    });
    created += 1;
  }

  return { created };
}
