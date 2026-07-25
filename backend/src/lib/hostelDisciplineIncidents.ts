import { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { seedHostelStudents } from './hostelStudents.js';

const ACADEMIC_YEARS = ['2023-24', '2024-25', '2025-26', '2026-27'];
const INCIDENT_TYPES = ['NOISE', 'CURFEW_VIOLATION', 'RAGGING', 'DAMAGE', 'FIGHTING', 'SUBSTANCE', 'MISCONDUCT', 'OTHER'] as const;
const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
const OPEN_STATUSES = ['OPEN', 'UNDER_REVIEW', 'ESCALATED'];

type IncidentType = typeof INCIDENT_TYPES[number];
type Severity = typeof SEVERITIES[number];

const DEFAULT_PENALTY: Record<Severity, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 4,
  CRITICAL: 6,
};

function formatDateTime(d: Date) {
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatDate(d: Date) {
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function monthLabel(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

async function getSettings(institutionId: string, academicYear: string) {
  let settings = await prisma.hostelDisciplineSettings.findUnique({ where: { institutionId } });
  if (!settings) {
    settings = await prisma.hostelDisciplineSettings.create({
      data: { institutionId, academicYear },
    });
  }
  return settings;
}

async function logDisciplineAudit(
  institutionId: string,
  incidentId: string,
  action: string,
  fromStatus: string,
  toStatus: string,
  performedBy: string,
  details = '',
) {
  await prisma.hostelDisciplineAuditLog.create({
    data: { institutionId, incidentId, action, fromStatus, toStatus, performedBy, details },
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

function mapIncidentRow(i: {
  id: string;
  studentName: string;
  incidentType: string;
  severity: string;
  title: string;
  description: string;
  penaltyPoints: number;
  status: string;
  incidentDate: Date;
  reportedBy: string;
  resolutionNotes: string;
  resolvedBy: string;
  resolvedAt: Date | null;
  parentNotified: boolean;
  managementEscalated: boolean;
  leaveSuspended: boolean;
  monthLabel: string;
  hostel: { hostelName: string } | null;
}) {
  return {
    id: i.id,
    studentName: i.studentName,
    hostel: i.hostel?.hostelName ?? '—',
    incidentType: i.incidentType.replace(/_/g, ' '),
    incidentTypeCode: i.incidentType,
    severity: i.severity,
    title: i.title,
    description: i.description,
    penaltyPoints: i.penaltyPoints,
    status: i.status,
    statusLabel: i.status.replace(/_/g, ' '),
    incidentDate: formatDateTime(i.incidentDate),
    reportedBy: i.reportedBy,
    resolutionNotes: i.resolutionNotes,
    resolvedBy: i.resolvedBy,
    resolvedAt: i.resolvedAt ? formatDateTime(i.resolvedAt) : null,
    parentNotified: i.parentNotified,
    managementEscalated: i.managementEscalated,
    leaveSuspended: i.leaveSuspended,
    monthLabel: i.monthLabel,
  };
}

export function countDisciplineKpis(incidents: { status: string; monthLabel?: string }[], month?: string) {
  const filtered = month ? incidents.filter((i) => i.monthLabel === month) : incidents;

  let open = 0;
  let resolved = 0;
  let escalated = 0;

  for (const i of filtered) {
    if (i.status === 'RESOLVED') resolved += 1;
    else if (i.status === 'ESCALATED') { escalated += 1; open += 1; }
    else if (OPEN_STATUSES.includes(i.status)) open += 1;
  }

  return { total: filtered.length, resolved, open, escalated };
}

export function countMonthIncidentSummary(incidents: { status: string; monthLabel: string }[], month: string) {
  return countDisciplineKpis(incidents, month);
}

export async function getDisciplineManagement(
  institutionId: string,
  academicYear = '2025-26',
  filters: { status?: string; severity?: string; monthLabel?: string } = {},
) {
  const month = filters.monthLabel ?? monthLabel();
  const settings = await getSettings(institutionId, academicYear);

  const where: Prisma.HostelDisciplineIncidentWhereInput = { institutionId, academicYear };
  if (filters.status && filters.status !== 'ALL') where.status = filters.status;
  if (filters.severity && filters.severity !== 'ALL') where.severity = filters.severity;
  if (filters.monthLabel) where.monthLabel = filters.monthLabel;

  const [incidents, monthIncidents, allIncidents, students, hostels] = await Promise.all([
    prisma.hostelDisciplineIncident.findMany({
      where,
      include: { hostel: true },
      orderBy: { incidentDate: 'desc' },
      take: 100,
    }),
    prisma.hostelDisciplineIncident.findMany({ where: { institutionId, academicYear, monthLabel: month } }),
    prisma.hostelDisciplineIncident.findMany({ where: { institutionId, academicYear } }),
    prisma.hostelStudentProfile.findMany({
      where: { institutionId, academicYear, residentStatus: 'ACTIVE' },
      include: { student: true },
      take: 50,
    }),
    prisma.hostelMaster.findMany({ where: { institutionId, academicYear, status: 'ACTIVE' }, orderBy: { hostelName: 'asc' } }),
  ]);

  const monthKpis = countDisciplineKpis(monthIncidents);
  const yearKpis = countDisciplineKpis(allIncidents);

  const severityChart = SEVERITIES.map((sev) => {
    const count = monthIncidents.filter((i) => i.severity === sev).length;
    const colors: Record<string, string> = { LOW: '#94a3b8', MEDIUM: '#f59e0b', HIGH: '#f97316', CRITICAL: '#ef4444' };
    return {
      name: sev,
      value: count,
      color: colors[sev],
      percent: monthKpis.total ? `${Math.round((count / monthKpis.total) * 100)}%` : '0%',
    };
  }).filter((c) => c.value > 0);

  const suspendedStudents = students.filter((s) => s.disciplinaryPoints >= settings.leaveSuspensionPoints);

  await logActivity(institutionId, 'VIEW_DISCIPLINE', 'Discipline & incidents accessed', { academicYear, month });

  return {
    academicYear,
    academicYears: ACADEMIC_YEARS,
    currentMonth: month,
    settings: {
      leaveSuspensionPoints: settings.leaveSuspensionPoints,
      parentNotifyPoints: settings.parentNotifyPoints,
      parentNotifySeverities: settings.parentNotifySeverities.split(','),
      managementSeverities: settings.managementSeverities.split(','),
    },
    monthSummary: monthKpis,
    yearKpis,
    severityChart,
    incidents: incidents.map((i) => mapIncidentRow(i)),
    students: students.map((s) => ({
      profileId: s.id,
      studentId: s.studentId,
      studentName: `${s.student.firstName} ${s.student.lastName}`.trim(),
      hostelId: s.hostelId,
      disciplinaryPoints: s.disciplinaryPoints,
      leaveSuspended: s.disciplinaryPoints >= settings.leaveSuspensionPoints,
    })),
    suspendedStudents: suspendedStudents.map((s) => ({
      studentName: `${s.student.firstName} ${s.student.lastName}`.trim(),
      disciplinaryPoints: s.disciplinaryPoints,
    })),
    hostels: hostels.map((h) => ({ id: h.id, name: h.hostelName })),
    incidentTypes: INCIDENT_TYPES.map((t) => ({ value: t, label: t.replace(/_/g, ' ') })),
    severities: SEVERITIES.map((s) => ({ value: s, label: s, defaultPoints: DEFAULT_PENALTY[s] })),
    permissions: { canLog: true, canResolve: true, canEscalate: true, canExport: true },
    statusFlow: ['OPEN', 'UNDER_REVIEW', 'ESCALATED', 'RESOLVED'],
    automationRules: [
      `Auto-suspend leave privileges when penalty points ≥ ${settings.leaveSuspensionPoints}`,
      'Auto-notify parents on MEDIUM+ severity or cumulative points threshold',
      'Auto-escalate HIGH/CRITICAL incidents to management',
    ],
    reports: ['Disciplinary Register', 'Penalty Points Summary', 'Escalation Report'],
    exportFormats: ['PDF', 'Excel', 'CSV'],
  };
}

export async function logDisciplineIncident(
  institutionId: string,
  body: {
    studentProfileId: string;
    incidentType: IncidentType;
    severity: Severity;
    title: string;
    description: string;
    penaltyPoints?: number;
    reportedBy?: string;
    incidentDate?: string;
    academicYear?: string;
  },
) {
  const academicYear = body.academicYear ?? '2025-26';
  const settings = await getSettings(institutionId, academicYear);
  const month = monthLabel(body.incidentDate ? new Date(body.incidentDate) : new Date());

  const profile = await prisma.hostelStudentProfile.findFirst({
    where: { id: body.studentProfileId, institutionId },
    include: { student: true },
  });
  if (!profile) throw new Error('Student profile not found');

  const penaltyPoints = body.penaltyPoints ?? DEFAULT_PENALTY[body.severity];
  const studentName = `${profile.student.firstName} ${profile.student.lastName}`.trim();

  const parentSeverities = settings.parentNotifySeverities.split(',');
  const mgmtSeverities = settings.managementSeverities.split(',');
  const newTotalPoints = profile.disciplinaryPoints + penaltyPoints;

  const parentNotify = parentSeverities.includes(body.severity) || newTotalPoints >= settings.parentNotifyPoints;
  const mgmtEscalate = mgmtSeverities.includes(body.severity);
  const leaveSuspend = newTotalPoints >= settings.leaveSuspensionPoints;

  let status = 'OPEN';
  if (mgmtEscalate) status = 'ESCALATED';

  const incident = await prisma.hostelDisciplineIncident.create({
    data: {
      institutionId,
      hostelId: profile.hostelId,
      studentProfileId: body.studentProfileId,
      studentId: profile.studentId,
      studentName,
      incidentType: body.incidentType,
      severity: body.severity,
      title: body.title,
      description: body.description,
      penaltyPoints,
      status,
      incidentDate: body.incidentDate ? new Date(body.incidentDate) : new Date(),
      reportedBy: body.reportedBy ?? 'Warden',
      monthLabel: month,
      academicYear,
      parentNotified: parentNotify,
      parentNotifiedAt: parentNotify ? new Date() : null,
      managementEscalated: mgmtEscalate,
      managementEscalatedAt: mgmtEscalate ? new Date() : null,
      leaveSuspended: leaveSuspend,
    },
    include: { hostel: true },
  });

  await prisma.hostelStudentProfile.update({
    where: { id: body.studentProfileId },
    data: { disciplinaryPoints: newTotalPoints },
  });

  await logDisciplineAudit(institutionId, incident.id, 'INCIDENT_LOGGED', '', status, body.reportedBy ?? 'Warden', `${penaltyPoints} pts`);

  const notifications: string[] = [];
  if (parentNotify) {
    notifications.push(`SMS/Email to Parent: ${studentName} — ${body.title} (${penaltyPoints} penalty points)`);
    await logActivity(institutionId, 'DISCIPLINE_PARENT_NOTIFY', `Parent notified for ${studentName}`, { incidentId: incident.id });
  }
  if (mgmtEscalate) {
    notifications.push(`Escalation email to Management: ${body.severity} incident — ${body.title}`);
    await logDisciplineAudit(institutionId, incident.id, 'ESCALATED_TO_MANAGEMENT', 'OPEN', 'ESCALATED', 'System');
  }
  if (leaveSuspend) {
    notifications.push(`Leave privileges suspended for ${studentName} (${newTotalPoints} pts ≥ ${settings.leaveSuspensionPoints})`);
    await logActivity(institutionId, 'LEAVE_PRIVILEGES_SUSPENDED', `Auto-suspended leave for ${studentName}`, { points: newTotalPoints });
  }

  return {
    success: true,
    incident: mapIncidentRow(incident),
    totalPenaltyPoints: newTotalPoints,
    leaveSuspended: leaveSuspend,
    message: `Incident logged — ${penaltyPoints} penalty points assigned`,
    notifications,
  };
}

export async function resolveDisciplineIncident(
  institutionId: string,
  incidentId: string,
  body: { resolutionNotes: string; resolvedBy?: string },
) {
  const incident = await prisma.hostelDisciplineIncident.findFirst({ where: { id: incidentId, institutionId } });
  if (!incident || incident.status === 'RESOLVED') {
    throw new Error('Incident not found or already resolved');
  }

  const updated = await prisma.hostelDisciplineIncident.update({
    where: { id: incidentId },
    data: {
      status: 'RESOLVED',
      resolutionNotes: body.resolutionNotes,
      resolvedBy: body.resolvedBy ?? 'Warden',
      resolvedAt: new Date(),
    },
    include: { hostel: true },
  });

  await logDisciplineAudit(institutionId, incidentId, 'INCIDENT_RESOLVED', incident.status, 'RESOLVED', body.resolvedBy ?? 'Warden', body.resolutionNotes);

  return {
    success: true,
    incident: mapIncidentRow(updated),
    message: 'Incident marked resolved',
  };
}

export async function escalateDisciplineIncident(
  institutionId: string,
  incidentId: string,
  performedBy = 'Warden',
) {
  const incident = await prisma.hostelDisciplineIncident.findFirst({ where: { id: incidentId, institutionId } });
  if (!incident || incident.status === 'RESOLVED') throw new Error('Cannot escalate this incident');

  const updated = await prisma.hostelDisciplineIncident.update({
    where: { id: incidentId },
    data: {
      status: 'ESCALATED',
      managementEscalated: true,
      managementEscalatedAt: new Date(),
    },
    include: { hostel: true },
  });

  await logDisciplineAudit(institutionId, incidentId, 'MANUAL_ESCALATION', incident.status, 'ESCALATED', performedBy);
  await logActivity(institutionId, 'DISCIPLINE_ESCALATION', `Incident escalated: ${incident.title}`, { incidentId });

  return {
    success: true,
    incident: mapIncidentRow(updated),
    message: 'Incident escalated to management',
    notifications: [`Email to Management: ${incident.studentName} — ${incident.title}`],
  };
}

export async function getDisciplineIncidentDetail(institutionId: string, incidentId: string) {
  const incident = await prisma.hostelDisciplineIncident.findFirst({
    where: { id: incidentId, institutionId },
    include: { hostel: true, auditLogs: { orderBy: { createdAt: 'asc' } } },
  });
  if (!incident) throw new Error('Incident not found');

  return {
    ...mapIncidentRow(incident),
    auditTrail: incident.auditLogs.map((a) => ({
      action: a.action,
      fromStatus: a.fromStatus,
      toStatus: a.toStatus,
      performedBy: a.performedBy,
      details: a.details,
      at: formatDateTime(a.createdAt),
    })),
  };
}

export async function exportDisciplineReport(
  institutionId: string,
  academicYear: string,
  format: 'PDF' | 'Excel' | 'CSV',
  reportType = 'Disciplinary Register',
) {
  const data = await getDisciplineManagement(institutionId, academicYear);
  const fileName = `hostel_discipline_${Date.now()}.${format.toLowerCase()}`;
  await logActivity(institutionId, 'EXPORT_DISCIPLINE', `Exported ${reportType}`, { format });
  return { success: true, format, fileName, message: `${reportType} exported`, snapshot: data };
}

export async function seedDisciplineManagement(institutionId: string) {
  await seedHostelStudents(institutionId);
  const academicYear = '2025-26';
  const month = monthLabel();

  const existing = await prisma.hostelDisciplineIncident.count({ where: { institutionId, academicYear, monthLabel: month } });
  if (existing >= 12) return getDisciplineManagement(institutionId, academicYear);

  await prisma.hostelDisciplineAuditLog.deleteMany({ where: { institutionId } });
  await prisma.hostelDisciplineIncident.deleteMany({ where: { institutionId } });

  await getSettings(institutionId, academicYear);

  const profiles = await prisma.hostelStudentProfile.findMany({
    where: { institutionId, residentStatus: 'ACTIVE' },
    include: { student: true },
    take: 30,
  });

  const defs: [string, string, string, number, string][] = [
    ['NOISE', 'MEDIUM', 'Loud music after curfew', 2, 'RESOLVED'],
    ['CURFEW_VIOLATION', 'LOW', 'Late return to hostel', 1, 'RESOLVED'],
    ['DAMAGE', 'HIGH', 'Broken window in common room', 4, 'OPEN'],
    ['FIGHTING', 'CRITICAL', 'Altercation with roommate', 6, 'ESCALATED'],
    ['MISCONDUCT', 'MEDIUM', 'Unauthorized guest in room', 2, 'RESOLVED'],
    ['NOISE', 'LOW', 'Shouting in corridor', 1, 'RESOLVED'],
    ['CURFEW_VIOLATION', 'MEDIUM', 'Missed roll call', 2, 'RESOLVED'],
    ['DAMAGE', 'MEDIUM', 'Graffiti on wall', 2, 'RESOLVED'],
    ['MISCONDUCT', 'HIGH', 'Smoking in hostel premises', 4, 'OPEN'],
    ['RAGGING', 'CRITICAL', 'Bullying junior student', 6, 'ESCALATED'],
    ['NOISE', 'LOW', 'TV volume disturbance', 1, 'RESOLVED'],
    ['CURFEW_VIOLATION', 'MEDIUM', 'Out after 10 PM without pass', 2, 'OPEN'],
  ];

  let totalPoints: Record<string, number> = {};

  for (let i = 0; i < defs.length && i < profiles.length; i += 1) {
    const [type, severity, title, points, status] = defs[i];
    const profile = profiles[i % profiles.length];
    const name = `${profile.student.firstName} ${profile.student.lastName}`.trim();

    const incident = await prisma.hostelDisciplineIncident.create({
      data: {
        institutionId,
        hostelId: profile.hostelId,
        studentProfileId: profile.id,
        studentId: profile.studentId,
        studentName: name,
        incidentType: type,
        severity,
        title,
        description: `${title} — reported by warden on duty.`,
        penaltyPoints: points,
        status,
        incidentDate: new Date(Date.now() - (defs.length - i) * 86400000),
        reportedBy: 'Warden',
        monthLabel: month,
        academicYear,
        parentNotified: ['MEDIUM', 'HIGH', 'CRITICAL'].includes(severity),
        parentNotifiedAt: ['MEDIUM', 'HIGH', 'CRITICAL'].includes(severity) ? new Date() : null,
        managementEscalated: ['HIGH', 'CRITICAL'].includes(severity),
        managementEscalatedAt: ['HIGH', 'CRITICAL'].includes(severity) ? new Date() : null,
        resolvedAt: status === 'RESOLVED' ? new Date() : null,
        resolvedBy: status === 'RESOLVED' ? 'Warden' : '',
        resolutionNotes: status === 'RESOLVED' ? 'Counseling completed and warning issued' : '',
        leaveSuspended: false,
      },
    });

    totalPoints[profile.id] = (totalPoints[profile.id] ?? 0) + points;
    await logDisciplineAudit(institutionId, incident.id, 'SEED', '', status, 'System');
  }

  for (const [profileId, pts] of Object.entries(totalPoints)) {
    await prisma.hostelStudentProfile.update({
      where: { id: profileId },
      data: { disciplinaryPoints: pts },
    });
  }

  const highPointsProfile = profiles[0];
  if (highPointsProfile) {
    await prisma.hostelStudentProfile.update({
      where: { id: highPointsProfile.id },
      data: { disciplinaryPoints: 4 },
    });
    const lastOpen = await prisma.hostelDisciplineIncident.findFirst({
      where: { institutionId, status: 'OPEN' },
    });
    if (lastOpen) {
      await prisma.hostelDisciplineIncident.update({
        where: { id: lastOpen.id },
        data: { leaveSuspended: true, studentProfileId: highPointsProfile.id, studentName: `${highPointsProfile.student.firstName} ${highPointsProfile.student.lastName}`.trim() },
      });
    }
  }

  await logActivity(institutionId, 'SEED_DISCIPLINE', 'Discipline & incidents demo seeded');
  return getDisciplineManagement(institutionId, academicYear);
}
