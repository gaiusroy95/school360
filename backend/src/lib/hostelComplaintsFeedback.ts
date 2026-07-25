import { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { seedHostelStudents } from './hostelStudents.js';

const ACADEMIC_YEARS = ['2023-24', '2024-25', '2025-26', '2026-27'];
const ESCALATION_HOURS = 48;

const CATEGORIES = ['ROOMMATE', 'MESS_FOOD', 'ADMINISTRATION', 'GENERAL'] as const;
const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;
const OPEN_STATUSES = ['SUBMITTED', 'ASSIGNED', 'IN_PROGRESS'];
const CLOSED_STATUSES = ['CONFIRMED', 'CLOSED'];

type Category = typeof CATEGORIES[number];
type Severity = typeof SEVERITIES[number];

function formatDateTime(d: Date) {
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatDate(d: Date) {
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function hoursSince(d: Date) {
  return (Date.now() - d.getTime()) / 3600000;
}

async function logComplaintAudit(
  institutionId: string,
  complaintId: string,
  action: string,
  fromStatus: string,
  toStatus: string,
  performedBy: string,
  details = '',
) {
  await prisma.hostelComplaintAuditLog.create({
    data: { institutionId, complaintId, action, fromStatus, toStatus, performedBy, details },
  });
}

async function logActivity(
  institutionId: string,
  action: string,
  details: string,
  snapshot: Record<string, unknown> = {},
  performedBy = 'System',
) {
  await prisma.hostelActivityLog.create({
    data: {
      institutionId,
      action,
      details,
      filterSnapshot: snapshot as Prisma.InputJsonValue,
      performedBy,
    },
  });
}

async function findWardenForHostel(institutionId: string, hostelId: string | null) {
  const warden = await prisma.hostelStaff.findFirst({
    where: {
      institutionId,
      status: 'ACTIVE',
      role: { in: ['WARDEN', 'Warden'] },
      ...(hostelId ? { hostelId } : {}),
    },
    orderBy: { createdAt: 'asc' },
  });
  if (warden) return { id: warden.id, name: warden.staffName };
  const fallback = await prisma.hostelStaff.findFirst({
    where: { institutionId, status: 'ACTIVE' },
    orderBy: { createdAt: 'asc' },
  });
  return fallback ? { id: fallback.id, name: fallback.staffName } : { id: '', name: 'Hostel Warden' };
}

function mapComplaintRow(c: {
  id: string;
  studentName: string;
  category: string;
  complaintType: string;
  subject: string;
  description: string;
  severity: string;
  status: string;
  assignedWardenName: string;
  assignedAt: Date | null;
  actionTaken: string;
  actionTakenAt: Date | null;
  actionTakenBy: string;
  resolvedAt: Date | null;
  resolvedBy: string;
  resolutionNotes: string;
  studentConfirmed: boolean;
  studentConfirmedAt: Date | null;
  studentRating: number;
  studentFeedbackNote: string;
  escalatedAt: Date | null;
  escalationEmailSent: boolean;
  createdAt: Date;
  hostel: { hostelName: string } | null;
}) {
  const ageHours = hoursSince(c.createdAt);
  const isEscalated = !!c.escalatedAt || (OPEN_STATUSES.includes(c.status) && ageHours > ESCALATION_HOURS);

  return {
    id: c.id,
    studentName: c.studentName,
    hostel: c.hostel?.hostelName ?? '—',
    category: c.category.replace('_', ' '),
    categoryCode: c.category,
    complaintType: c.complaintType,
    subject: c.subject,
    description: c.description,
    severity: c.severity,
    status: isEscalated && OPEN_STATUSES.includes(c.status) ? 'ESCALATED' : c.status,
    rawStatus: c.status,
    assignedWarden: c.assignedWardenName || '—',
    assignedAt: c.assignedAt ? formatDateTime(c.assignedAt) : null,
    actionTaken: c.actionTaken,
    actionTakenAt: c.actionTakenAt ? formatDateTime(c.actionTakenAt) : null,
    actionTakenBy: c.actionTakenBy,
    resolvedAt: c.resolvedAt ? formatDateTime(c.resolvedAt) : null,
    resolvedBy: c.resolvedBy,
    resolutionNotes: c.resolutionNotes,
    studentConfirmed: c.studentConfirmed,
    studentConfirmedAt: c.studentConfirmedAt ? formatDateTime(c.studentConfirmedAt) : null,
    studentRating: c.studentRating,
    studentFeedbackNote: c.studentFeedbackNote,
    isEscalated,
    escalationEmailSent: c.escalationEmailSent,
    escalatedAt: c.escalatedAt ? formatDateTime(c.escalatedAt) : null,
    ageHours: Math.round(ageHours),
    loggedOn: formatDate(c.createdAt),
    createdAt: formatDateTime(c.createdAt),
  };
}

export function countComplaintKpis(complaints: { status: string; escalatedAt?: Date | null; createdAt: Date; complaintType: string }[]) {
  let open = 0;
  let inProgress = 0;
  let resolved = 0;
  let confirmed = 0;
  let escalated = 0;
  let feedback = 0;

  for (const c of complaints) {
    if (c.complaintType === 'FEEDBACK') feedback += 1;
    if (c.status === 'SUBMITTED' || c.status === 'ASSIGNED') open += 1;
    else if (c.status === 'IN_PROGRESS') inProgress += 1;
    else if (c.status === 'RESOLVED') resolved += 1;
    else if (CLOSED_STATUSES.includes(c.status)) confirmed += 1;
    if (c.escalatedAt || (OPEN_STATUSES.includes(c.status) && hoursSince(c.createdAt) > ESCALATION_HOURS)) {
      escalated += 1;
    }
  }

  return { open, inProgress, resolved, confirmed, escalated, feedback, total: complaints.length };
}

async function processEscalations(institutionId: string) {
  const cutoff = new Date(Date.now() - ESCALATION_HOURS * 3600000);
  const stale = await prisma.hostelComplaint.findMany({
    where: {
      institutionId,
      status: { in: OPEN_STATUSES },
      createdAt: { lt: cutoff },
      escalationEmailSent: false,
    },
  });

  const escalated: string[] = [];
  for (const c of stale) {
    await prisma.hostelComplaint.update({
      where: { id: c.id },
      data: { escalatedAt: new Date(), escalationEmailSent: true },
    });
    await logComplaintAudit(
      institutionId,
      c.id,
      'ESCALATED_TO_PRINCIPAL',
      c.status,
      c.status,
      'System',
      `Unresolved >${ESCALATION_HOURS}h — escalation email sent to Principal`,
    );
    await logActivity(
      institutionId,
      'COMPLAINT_ESCALATION_EMAIL',
      `Email to Principal: Complaint "${c.subject}" from ${c.studentName} unresolved for >${ESCALATION_HOURS} hours`,
      { complaintId: c.id, studentName: c.studentName, subject: c.subject },
    );
    escalated.push(c.id);
  }
  return escalated;
}

function rolePermissions(role: string) {
  if (role === 'Student') {
    return { canSubmit: true, canTakeAction: false, canResolve: false, canConfirm: true, canExport: false };
  }
  if (role === 'Warden') {
    return { canSubmit: false, canTakeAction: true, canResolve: true, canConfirm: false, canExport: true };
  }
  return { canSubmit: true, canTakeAction: true, canResolve: true, canConfirm: true, canExport: true };
}

export async function getComplaintsManagement(
  institutionId: string,
  academicYear = '2025-26',
  filters: { status?: string; category?: string; userRole?: string } = {},
) {
  await processEscalations(institutionId);

  const where: Prisma.HostelComplaintWhereInput = { institutionId, academicYear };
  if (filters.category && filters.category !== 'ALL') where.category = filters.category;
  if (filters.status && filters.status !== 'ALL') {
    if (filters.status === 'ESCALATED') {
      where.OR = [
        { escalatedAt: { not: null } },
        { status: { in: OPEN_STATUSES }, createdAt: { lt: new Date(Date.now() - ESCALATION_HOURS * 3600000) } },
      ];
    } else if (filters.status === 'OPEN') {
      where.status = { in: OPEN_STATUSES };
    } else {
      where.status = filters.status;
    }
  }

  const [complaints, allComplaints, hostels, students, wardens] = await Promise.all([
    prisma.hostelComplaint.findMany({
      where,
      include: { hostel: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.hostelComplaint.findMany({ where: { institutionId, academicYear } }),
    prisma.hostelMaster.findMany({ where: { institutionId, academicYear, status: 'ACTIVE' }, orderBy: { hostelName: 'asc' } }),
    prisma.hostelStudentProfile.findMany({
      where: { institutionId, academicYear, residentStatus: 'ACTIVE' },
      include: { student: true },
      take: 50,
    }),
    prisma.hostelStaff.findMany({
      where: { institutionId, status: 'ACTIVE', role: { in: ['WARDEN', 'Warden'] } },
      orderBy: { staffName: 'asc' },
    }),
  ]);

  const kpis = countComplaintKpis(allComplaints);
  const categoryChart = CATEGORIES.map((cat) => {
    const count = allComplaints.filter((c) => c.category === cat).length;
    const colors: Record<string, string> = {
      ROOMMATE: '#8b5cf6',
      MESS_FOOD: '#f59e0b',
      ADMINISTRATION: '#3b82f6',
      GENERAL: '#64748b',
    };
    return {
      name: cat.replace('_', ' '),
      value: count,
      color: colors[cat],
      percent: kpis.total ? `${Math.round((count / kpis.total) * 100)}%` : '0%',
    };
  }).filter((c) => c.value > 0);

  const statusChart = [
    { name: 'Open', value: kpis.open, color: '#f59e0b' },
    { name: 'In Progress', value: kpis.inProgress, color: '#3b82f6' },
    { name: 'Resolved', value: kpis.resolved, color: '#10b981' },
    { name: 'Confirmed', value: kpis.confirmed, color: '#22c55e' },
    { name: 'Escalated', value: kpis.escalated, color: '#ef4444' },
  ].map((c) => ({
    ...c,
    percent: kpis.total ? `${Math.round((c.value / kpis.total) * 100)}%` : '0%',
  }));

  await logActivity(institutionId, 'VIEW_COMPLAINTS', 'Complaints/feedback management accessed', { academicYear }, filters.userRole);

  return {
    academicYear,
    academicYears: ACADEMIC_YEARS,
    categories: CATEGORIES.map((c) => ({ value: c, label: c.replace('_', ' ') })),
    severities: SEVERITIES.map((s) => ({ value: s, label: s })),
    escalationHours: ESCALATION_HOURS,
    kpis,
    categoryChart,
    statusChart,
    complaints: complaints.map((c) => mapComplaintRow(c)),
    students: students.map((s) => ({
      profileId: s.id,
      studentId: s.studentId,
      studentName: `${s.student.firstName} ${s.student.lastName}`.trim(),
      hostelId: s.hostelId,
    })),
    wardens: wardens.map((w) => ({ id: w.id, name: w.staffName, hostelId: w.hostelId })),
    hostels: hostels.map((h) => ({ id: h.id, name: h.hostelName })),
    permissions: rolePermissions(filters.userRole ?? 'Warden'),
    statusFlow: ['SUBMITTED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CONFIRMED'],
    reports: ['Complaint Register', 'Escalation Report', 'Feedback Summary'],
    exportFormats: ['PDF', 'Excel', 'CSV'],
    erpIntegration: [`Communication — auto-escalation email to Principal after ${ESCALATION_HOURS}h`],
    scopeNote: 'Roommates, mess food, and administration only — physical maintenance is handled separately',
  };
}

export async function submitComplaint(
  institutionId: string,
  body: {
    studentProfileId: string;
    category: Category;
    complaintType?: 'COMPLAINT' | 'FEEDBACK';
    subject: string;
    description: string;
    severity?: Severity;
    academicYear?: string;
  },
) {
  if (!CATEGORIES.includes(body.category)) {
    throw new Error('Invalid category — maintenance issues should be logged under Maintenance module');
  }

  const profile = await prisma.hostelStudentProfile.findFirst({
    where: { id: body.studentProfileId, institutionId },
  });
  if (!profile) throw new Error('Student profile not found');

  const studentName = await prisma.student.findUnique({ where: { id: profile.studentId } }).then(
    (s) => (s ? `${s.firstName} ${s.lastName}`.trim() : 'Student'),
  );

  const warden = await findWardenForHostel(institutionId, profile.hostelId);
  const now = new Date();
  const academicYear = body.academicYear ?? '2025-26';

  const complaint = await prisma.hostelComplaint.create({
    data: {
      institutionId,
      hostelId: profile.hostelId,
      studentId: profile.studentId,
      studentProfileId: body.studentProfileId,
      studentName,
      category: body.category,
      complaintType: body.complaintType ?? 'COMPLAINT',
      subject: body.subject,
      description: body.description,
      severity: body.severity ?? 'MEDIUM',
      status: 'ASSIGNED',
      assignedWardenId: warden.id,
      assignedWardenName: warden.name,
      assignedAt: now,
      academicYear,
    },
  });

  await logComplaintAudit(institutionId, complaint.id, 'COMPLAINT_SUBMITTED', '', 'ASSIGNED', studentName, body.subject);
  await logComplaintAudit(institutionId, complaint.id, 'ASSIGNED_TO_WARDEN', 'SUBMITTED', 'ASSIGNED', 'System', warden.name);

  return {
    success: true,
    complaint,
    message: `Complaint logged and assigned to ${warden.name}`,
    notifications: [`Push notify Warden: New ${body.category.replace('_', ' ')} complaint from ${studentName}`],
  };
}

export async function takeComplaintAction(
  institutionId: string,
  complaintId: string,
  body: { wardenName?: string; actionTaken: string },
) {
  const complaint = await prisma.hostelComplaint.findFirst({ where: { id: complaintId, institutionId } });
  if (!complaint || !['ASSIGNED', 'IN_PROGRESS', 'SUBMITTED'].includes(complaint.status)) {
    throw new Error('Complaint not found or cannot be updated');
  }

  const fromStatus = complaint.status === 'SUBMITTED' ? 'ASSIGNED' : complaint.status;
  const updated = await prisma.hostelComplaint.update({
    where: { id: complaintId },
    data: {
      status: 'IN_PROGRESS',
      actionTaken: body.actionTaken,
      actionTakenAt: new Date(),
      actionTakenBy: body.wardenName ?? complaint.assignedWardenName ?? 'Warden',
    },
  });

  await logComplaintAudit(
    institutionId,
    complaintId,
    'ACTION_TAKEN',
    fromStatus,
    'IN_PROGRESS',
    body.wardenName ?? 'Warden',
    body.actionTaken,
  );

  return {
    success: true,
    complaint: updated,
    message: 'Action recorded — complaint in progress',
    notifications: [`Push to Student: Warden is working on your complaint`],
  };
}

export async function resolveComplaint(
  institutionId: string,
  complaintId: string,
  body: { wardenName?: string; resolutionNotes: string },
) {
  const complaint = await prisma.hostelComplaint.findFirst({ where: { id: complaintId, institutionId } });
  if (!complaint || !['ASSIGNED', 'IN_PROGRESS'].includes(complaint.status)) {
    throw new Error('Complaint must be in progress before resolving');
  }

  const updated = await prisma.hostelComplaint.update({
    where: { id: complaintId },
    data: {
      status: 'RESOLVED',
      resolvedAt: new Date(),
      resolvedBy: body.wardenName ?? complaint.assignedWardenName ?? 'Warden',
      resolutionNotes: body.resolutionNotes,
    },
  });

  await logComplaintAudit(
    institutionId,
    complaintId,
    'RESOLVED',
    complaint.status,
    'RESOLVED',
    body.wardenName ?? 'Warden',
    body.resolutionNotes,
  );

  return {
    success: true,
    complaint: updated,
    message: 'Complaint marked resolved — awaiting student confirmation',
    notifications: [`Push to Student: Please confirm resolution of "${complaint.subject}"`],
  };
}

export async function confirmComplaintResolution(
  institutionId: string,
  complaintId: string,
  body: { studentRating?: number; studentFeedbackNote?: string },
) {
  const complaint = await prisma.hostelComplaint.findFirst({ where: { id: complaintId, institutionId } });
  if (!complaint || complaint.status !== 'RESOLVED') {
    throw new Error('Complaint must be resolved before student confirmation');
  }

  const updated = await prisma.hostelComplaint.update({
    where: { id: complaintId },
    data: {
      status: 'CONFIRMED',
      studentConfirmed: true,
      studentConfirmedAt: new Date(),
      studentRating: body.studentRating ?? 0,
      studentFeedbackNote: body.studentFeedbackNote ?? '',
    },
  });

  await logComplaintAudit(
    institutionId,
    complaintId,
    'STUDENT_CONFIRMED',
    'RESOLVED',
    'CONFIRMED',
    complaint.studentName,
    body.studentFeedbackNote ?? 'Resolution confirmed',
  );

  return {
    success: true,
    complaint: updated,
    message: 'Thank you — complaint closed with your confirmation',
  };
}

export async function getComplaintDetail(institutionId: string, complaintId: string) {
  const complaint = await prisma.hostelComplaint.findFirst({
    where: { id: complaintId, institutionId },
    include: { hostel: true, auditLogs: { orderBy: { createdAt: 'asc' } } },
  });
  if (!complaint) throw new Error('Complaint not found');

  return {
    ...mapComplaintRow(complaint),
    auditTrail: complaint.auditLogs.map((a) => ({
      action: a.action,
      fromStatus: a.fromStatus,
      toStatus: a.toStatus,
      performedBy: a.performedBy,
      details: a.details,
      at: formatDateTime(a.createdAt),
    })),
  };
}

export async function exportComplaintsReport(
  institutionId: string,
  academicYear: string,
  format: 'PDF' | 'Excel' | 'CSV',
  reportType = 'Complaint Register',
) {
  const data = await getComplaintsManagement(institutionId, academicYear);
  const fileName = `hostel_complaints_${Date.now()}.${format.toLowerCase()}`;
  await logActivity(institutionId, 'EXPORT_COMPLAINTS', `Exported ${reportType}`, { format });
  return { success: true, format, fileName, message: `${reportType} exported`, snapshot: data };
}

export async function seedComplaintsManagement(institutionId: string) {
  await seedHostelStudents(institutionId);
  const academicYear = '2025-26';

  const existing = await prisma.hostelComplaint.count({ where: { institutionId, academicYear } });
  if (existing >= 40) return getComplaintsManagement(institutionId, academicYear);

  await prisma.hostelComplaintAuditLog.deleteMany({ where: { institutionId } });
  await prisma.hostelComplaint.deleteMany({ where: { institutionId } });

  let wardens = await prisma.hostelStaff.findMany({
    where: { institutionId, status: 'ACTIVE', role: { in: ['WARDEN', 'Warden'] } },
    take: 5,
  });
  if (wardens.length === 0) {
    const hostels = await prisma.hostelMaster.findMany({ where: { institutionId, status: 'ACTIVE' }, take: 2 });
    for (const h of hostels) {
      await prisma.hostelStaff.create({
        data: { institutionId, hostelId: h.id, staffName: `Warden ${h.hostelName}`, role: 'WARDEN', mobile: '9876543210' },
      });
    }
    wardens = await prisma.hostelStaff.findMany({
      where: { institutionId, status: 'ACTIVE', role: { in: ['WARDEN', 'Warden'] } },
      take: 5,
    });
  }

  const profiles = await prisma.hostelStudentProfile.findMany({
    where: { institutionId, residentStatus: 'ACTIVE' },
    include: { student: true },
    take: 50,
  });

  const subjects: Record<string, string[]> = {
    ROOMMATE: ['Noisy roommate at night', 'Roommate using my belongings', 'Conflict over study hours', 'Untidy roommate'],
    MESS_FOOD: ['Food quality below standard', 'Insufficient vegetarian options', 'Cold meals served', 'Hygiene concern in mess'],
    ADMINISTRATION: ['Wi-Fi not working in block', 'Laundry schedule conflict', 'Fee receipt not received', 'Notice board not updated'],
    GENERAL: ['Water cooler empty frequently', 'Common room TV broken', 'Suggestion for weekend activities', 'Positive feedback on new rules'],
  };

  const now = new Date();

  async function createComplaint(
    profile: typeof profiles[0],
    category: Category,
    status: string,
    daysAgo: number,
    opts: { escalated?: boolean; complaintType?: string; rating?: number } = {},
  ) {
    const name = `${profile.student.firstName} ${profile.student.lastName}`.trim();
    const warden = wardens[Math.abs(daysAgo) % wardens.length];
    const createdAt = new Date(now.getTime() - daysAgo * 86400000);
    const subjectList = subjects[category];
    const subject = subjectList[Math.abs(daysAgo) % subjectList.length];

    const complaint = await prisma.hostelComplaint.create({
      data: {
        institutionId,
        hostelId: profile.hostelId,
        studentId: profile.studentId,
        studentProfileId: profile.id,
        studentName: name,
        category,
        complaintType: opts.complaintType ?? (category === 'GENERAL' && daysAgo % 7 === 0 ? 'FEEDBACK' : 'COMPLAINT'),
        subject,
        description: `${subject} — reported by ${name}. Please look into this at the earliest.`,
        severity: daysAgo % 3 === 0 ? 'HIGH' : daysAgo % 2 === 0 ? 'MEDIUM' : 'LOW',
        status,
        assignedWardenId: warden?.id ?? '',
        assignedWardenName: warden?.staffName ?? 'Warden',
        assignedAt: createdAt,
        actionTaken: ['IN_PROGRESS', 'RESOLVED', 'CONFIRMED'].includes(status) ? 'Spoke with concerned parties and initiated corrective steps' : '',
        actionTakenAt: ['IN_PROGRESS', 'RESOLVED', 'CONFIRMED'].includes(status) ? new Date(createdAt.getTime() + 3600000) : null,
        actionTakenBy: warden?.staffName ?? 'Warden',
        resolvedAt: ['RESOLVED', 'CONFIRMED'].includes(status) ? new Date(createdAt.getTime() + 86400000) : null,
        resolvedBy: warden?.staffName ?? 'Warden',
        resolutionNotes: ['RESOLVED', 'CONFIRMED'].includes(status) ? 'Issue addressed and corrective action taken' : '',
        studentConfirmed: status === 'CONFIRMED',
        studentConfirmedAt: status === 'CONFIRMED' ? new Date(createdAt.getTime() + 2 * 86400000) : null,
        studentRating: status === 'CONFIRMED' ? (opts.rating ?? 4) : 0,
        studentFeedbackNote: status === 'CONFIRMED' ? 'Satisfied with resolution' : '',
        escalatedAt: opts.escalated ? new Date(createdAt.getTime() + ESCALATION_HOURS * 3600000 + 1000) : null,
        escalationEmailSent: !!opts.escalated,
        academicYear,
        createdAt,
      },
    });

    await logComplaintAudit(institutionId, complaint.id, 'SEED', '', status, 'System');
    if (opts.escalated) {
      await logComplaintAudit(institutionId, complaint.id, 'ESCALATED_TO_PRINCIPAL', status, status, 'System', 'Demo escalation');
    }
    return complaint;
  }

  const cats: Category[] = ['ROOMMATE', 'MESS_FOOD', 'ADMINISTRATION', 'GENERAL'];
  let idx = 0;

  for (let i = 0; i < 8 && idx < profiles.length; i += 1, idx += 1) {
    await createComplaint(profiles[idx % profiles.length], cats[i % cats.length], 'ASSIGNED', 1);
  }
  for (let i = 0; i < 10 && idx < profiles.length; i += 1, idx += 1) {
    await createComplaint(profiles[idx % profiles.length], cats[i % cats.length], 'IN_PROGRESS', 2);
  }
  for (let i = 0; i < 6 && idx < profiles.length; i += 1, idx += 1) {
    await createComplaint(profiles[idx % profiles.length], cats[i % cats.length], 'RESOLVED', 3);
  }
  for (let i = 0; i < 12 && idx < profiles.length; i += 1, idx += 1) {
    await createComplaint(profiles[idx % profiles.length], cats[i % cats.length], 'CONFIRMED', 5 + i, { rating: 3 + (i % 3) });
  }
  for (let i = 0; i < 4 && idx < profiles.length; i += 1, idx += 1) {
    await createComplaint(profiles[idx % profiles.length], cats[i % cats.length], 'IN_PROGRESS', 3, { escalated: true });
  }
  for (let i = 0; i < 5 && idx < profiles.length; i += 1, idx += 1) {
    await createComplaint(profiles[idx % profiles.length], 'GENERAL', 'CONFIRMED', 1, { complaintType: 'FEEDBACK', rating: 5 });
  }

  await logActivity(institutionId, 'SEED_COMPLAINTS', 'Complaints/feedback demo seeded');
  return getComplaintsManagement(institutionId, academicYear);
}
