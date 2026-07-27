import { createHash, randomBytes } from 'node:crypto';
import { prisma } from './prisma.js';
import { logUserActivity } from './securityAuditCompliance.js';
import { getMaintenanceConfig, updateMaintenanceConfig } from './coreSystemsSettings.js';
import { getAdminDashboardMetrics, listSystemAlerts } from './adminDashboard.js';

type AuditActor = { userEmail?: string; userId?: string };

function hashLicenseKey(key: string) {
  return createHash('sha256').update(key.trim().toUpperCase()).digest('hex');
}

function maskLicenseKey(key: string) {
  const k = key.trim();
  if (k.length <= 8) return '****';
  return `${k.slice(0, 4)}…${k.slice(-4)}`;
}

function parseEdition(key: string): string {
  const upper = key.toUpperCase();
  if (upper.includes('ENT')) return 'Enterprise';
  if (upper.includes('PRO')) return 'Professional';
  if (upper.includes('STD')) return 'Standard';
  return 'Enterprise';
}

function licenseStatus(validUntil: Date): string {
  if (validUntil < new Date()) return 'EXPIRED';
  const daysLeft = Math.ceil((validUntil.getTime() - Date.now()) / 86400000);
  if (daysLeft <= 30) return 'EXPIRING_SOON';
  return 'ACTIVE';
}

async function ensureSystemLicense(institutionId: string) {
  const existing = await prisma.systemLicense.findUnique({ where: { institutionId } });
  if (existing) return existing;

  const institution = await prisma.institution.findUnique({ where: { id: institutionId } });
  const validUntil = new Date();
  validUntil.setFullYear(validUntil.getFullYear() + 1);

  return prisma.systemLicense.create({
    data: {
      institutionId,
      edition: 'Enterprise',
      licensedTo: institution?.name ?? 'Institution',
      validUntil,
      maxUsers: 500,
      maxStudents: 5000,
      status: 'ACTIVE',
      lastValidatedAt: new Date(),
    },
  });
}

export async function getLicenseSupportOverview(institutionId: string) {
  const [license, modules, userCount, studentCount, tickets, maintenance, alerts] = await Promise.all([
    ensureSystemLicense(institutionId),
    prisma.systemModule.findMany({
      where: { institutionId },
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.user.count(),
    prisma.student.count({ where: { institutionId } }),
    prisma.supportTicket.findMany({
      where: { institutionId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    getMaintenanceConfig(institutionId),
    listSystemAlerts(institutionId),
  ]);

  const daysRemaining = Math.max(0, Math.ceil((license.validUntil.getTime() - Date.now()) / 86400000));
  const computedStatus = licenseStatus(license.validUntil);

  return {
    license: {
      id: license.id,
      edition: license.edition,
      licensedTo: license.licensedTo,
      licenseKeyMasked: license.licenseKeyMasked || 'Not activated',
      validFrom: license.validFrom.toISOString(),
      validUntil: license.validUntil.toISOString(),
      daysRemaining,
      status: computedStatus,
      maxUsers: license.maxUsers,
      maxStudents: license.maxStudents,
      currentUsers: userCount,
      currentStudents: studentCount,
      lastValidatedAt: license.lastValidatedAt?.toISOString() ?? null,
      usage: {
        usersPercent: Math.min(100, Math.round((userCount / license.maxUsers) * 100)),
        studentsPercent: Math.min(100, Math.round((studentCount / license.maxStudents) * 100)),
      },
    },
    modules: modules.map((m) => ({
      id: m.id,
      moduleCode: m.moduleCode,
      moduleLabel: m.moduleLabel,
      isActive: m.isActive,
      hasLicenseKey: !!m.licenseKey,
    })),
    tickets: tickets.map((t) => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      subject: t.subject,
      category: t.category,
      priority: t.priority,
      status: t.status,
      reportedBy: t.reportedBy,
      assignedTo: t.assignedTo,
      createdAt: t.createdAt.toISOString(),
      resolvedAt: t.resolvedAt?.toISOString() ?? null,
    })),
    maintenance,
    alerts: alerts.slice(0, 10).map((a) => ({
      id: a.id,
      title: a.title,
      severity: a.severity,
      status: a.status,
      category: a.category,
      createdAt: a.createdAt.toISOString(),
    })),
    ticketCategories: ['GENERAL', 'BUG', 'FEATURE', 'BILLING', 'INTEGRATION', 'PERFORMANCE'],
    priorities: ['LOW', 'NORMAL', 'HIGH', 'CRITICAL'],
  };
}

export async function activateLicenseKey(
  institutionId: string,
  body: Record<string, unknown>,
  actor?: AuditActor,
) {
  const licenseKey = String(body.licenseKey || '').trim();
  const licensedTo = String(body.licensedTo || '').trim();

  if (!licenseKey || licenseKey.length < 12) {
    throw new Error('Invalid license key format (minimum 12 characters)');
  }
  if (!/^ERP-[A-Z0-9-]+$/i.test(licenseKey)) {
    throw new Error('License key must match format ERP-XXX-XXXX-XXXX');
  }

  const edition = parseEdition(licenseKey);
  const validUntil = new Date();
  validUntil.setFullYear(validUntil.getFullYear() + 1);

  const institution = await prisma.institution.findUnique({ where: { id: institutionId } });
  const license = await prisma.systemLicense.upsert({
    where: { institutionId },
    create: {
      institutionId,
      edition,
      licensedTo: licensedTo || institution?.name || 'Institution',
      licenseKeyHash: hashLicenseKey(licenseKey),
      licenseKeyMasked: maskLicenseKey(licenseKey),
      validUntil,
      maxUsers: edition === 'Enterprise' ? 1000 : edition === 'Professional' ? 500 : 200,
      maxStudents: edition === 'Enterprise' ? 10000 : edition === 'Professional' ? 5000 : 2000,
      status: 'ACTIVE',
      lastValidatedAt: new Date(),
    },
    update: {
      edition,
      licensedTo: licensedTo || institution?.name || 'Institution',
      licenseKeyHash: hashLicenseKey(licenseKey),
      licenseKeyMasked: maskLicenseKey(licenseKey),
      validUntil,
      maxUsers: edition === 'Enterprise' ? 1000 : edition === 'Professional' ? 500 : 200,
      maxStudents: edition === 'Enterprise' ? 10000 : edition === 'Professional' ? 5000 : 2000,
      status: 'ACTIVE',
      lastValidatedAt: new Date(),
    },
  });

  await prisma.systemModule.updateMany({
    where: { institutionId },
    data: { licenseKey: maskLicenseKey(licenseKey) },
  });

  await logUserActivity(institutionId, {
    userId: actor?.userId ?? 'system',
    userEmail: actor?.userEmail ?? 'Admin',
    action: 'LICENSE_ACTIVATE',
    module: 'License Management',
    details: `${edition} license activated — valid until ${validUntil.toISOString().slice(0, 10)}`,
  });

  return {
    message: `${edition} license activated successfully`,
    license: {
      edition: license.edition,
      licensedTo: license.licensedTo,
      validUntil: license.validUntil.toISOString(),
      status: licenseStatus(license.validUntil),
    },
  };
}

export async function validateLicenseKey(institutionId: string, actor?: AuditActor) {
  const license = await ensureSystemLicense(institutionId);
  const status = licenseStatus(license.validUntil);

  const updated = await prisma.systemLicense.update({
    where: { institutionId },
    data: { lastValidatedAt: new Date(), status: status === 'EXPIRED' ? 'EXPIRED' : 'ACTIVE' },
  });

  await logUserActivity(institutionId, {
    userId: actor?.userId ?? 'system',
    userEmail: actor?.userEmail ?? 'Admin',
    action: 'LICENSE_VALIDATE',
    module: 'License Management',
    details: `License validation: ${status}`,
  });

  return {
    message: status === 'ACTIVE' ? 'License is valid' : status === 'EXPIRING_SOON' ? 'License expiring within 30 days' : 'License has expired',
    status,
    validUntil: updated.validUntil.toISOString(),
    daysRemaining: Math.max(0, Math.ceil((updated.validUntil.getTime() - Date.now()) / 86400000)),
  };
}

export async function createSupportTicket(
  institutionId: string,
  body: Record<string, unknown>,
  actor?: AuditActor,
) {
  const subject = String(body.subject || '').trim();
  const description = String(body.description || '').trim();
  const category = String(body.category || 'GENERAL').toUpperCase();
  const priority = String(body.priority || 'NORMAL').toUpperCase();

  if (!subject) throw new Error('Subject is required');
  if (!description) throw new Error('Description is required');

  const ticketNumber = `TKT-${randomBytes(3).toString('hex').toUpperCase()}`;

  const ticket = await prisma.supportTicket.create({
    data: {
      institutionId,
      ticketNumber,
      subject,
      description,
      category,
      priority,
      reportedBy: actor?.userEmail ?? 'Admin',
      status: 'OPEN',
    },
  });

  await logUserActivity(institutionId, {
    userId: actor?.userId ?? 'system',
    userEmail: actor?.userEmail ?? 'Admin',
    action: 'SUPPORT_TICKET_CREATE',
    module: 'Support & Maintenance',
    details: `Ticket ${ticketNumber}: ${subject}`,
  });

  return {
    message: `Support ticket ${ticketNumber} created`,
    ticket: {
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      subject: ticket.subject,
      status: ticket.status,
      priority: ticket.priority,
      createdAt: ticket.createdAt.toISOString(),
    },
  };
}

export async function updateSupportTicket(
  institutionId: string,
  ticketId: string,
  body: Record<string, unknown>,
  actor?: AuditActor,
) {
  const ticket = await prisma.supportTicket.findFirst({ where: { id: ticketId, institutionId } });
  if (!ticket) throw new Error('Ticket not found');

  const status = body.status ? String(body.status).toUpperCase() : ticket.status;
  const resolutionNotes = body.resolutionNotes != null ? String(body.resolutionNotes) : ticket.resolutionNotes;

  const updated = await prisma.supportTicket.update({
    where: { id: ticketId },
    data: {
      status,
      resolutionNotes,
      resolvedAt: status === 'RESOLVED' || status === 'CLOSED' ? new Date() : null,
    },
  });

  await logUserActivity(institutionId, {
    userId: actor?.userId ?? 'system',
    userEmail: actor?.userEmail ?? 'Admin',
    action: 'SUPPORT_TICKET_UPDATE',
    module: 'Support & Maintenance',
    details: `Ticket ${ticket.ticketNumber} → ${status}`,
  });

  return {
    message: `Ticket ${ticket.ticketNumber} updated`,
    ticket: {
      id: updated.id,
      ticketNumber: updated.ticketNumber,
      status: updated.status,
      resolutionNotes: updated.resolutionNotes,
      resolvedAt: updated.resolvedAt?.toISOString() ?? null,
    },
  };
}

export async function runSystemHealthCheck(institutionId: string, actor?: AuditActor) {
  const metrics = await getAdminDashboardMetrics(institutionId, '24h') as {
    kpis?: { dbTables: number; failedLogins24h: number; activeSessions: number };
  };
  const maintenance = await getMaintenanceConfig(institutionId);
  const license = await ensureSystemLicense(institutionId);

  const kpis = metrics.kpis ?? { dbTables: 0, failedLogins24h: 0, activeSessions: 0 };

  const checks = [
    { name: 'Database', status: 'PASS', detail: `${kpis.dbTables} tables accessible` },
    { name: 'Authentication', status: kpis.failedLogins24h > 20 ? 'WARN' : 'PASS', detail: `${kpis.failedLogins24h} failed logins (24h)` },
    { name: 'Active Sessions', status: 'PASS', detail: `${kpis.activeSessions} active sessions` },
    { name: 'License', status: licenseStatus(license.validUntil) === 'EXPIRED' ? 'FAIL' : 'PASS', detail: `Valid until ${license.validUntil.toISOString().slice(0, 10)}` },
    { name: 'Maintenance Mode', status: maintenance.maintenanceEnabled ? 'WARN' : 'PASS', detail: maintenance.maintenanceEnabled ? 'Enabled' : 'Disabled' },
  ];

  const overall = checks.some((c) => c.status === 'FAIL') ? 'CRITICAL' : checks.some((c) => c.status === 'WARN') ? 'WARNING' : 'HEALTHY';

  await logUserActivity(institutionId, {
    userId: actor?.userId ?? 'system',
    userEmail: actor?.userEmail ?? 'Admin',
    action: 'HEALTH_CHECK',
    module: 'Support & Maintenance',
    details: `System health check: ${overall}`,
  });

  return {
    message: `System health: ${overall}`,
    overall,
    checks,
    checkedAt: new Date().toISOString(),
  };
}

export async function scheduleMaintenanceWindow(
  institutionId: string,
  body: Record<string, unknown>,
  actor?: AuditActor,
) {
  const result = await updateMaintenanceConfig(institutionId, {
    maintenanceEnabled: body.enabled === true,
    maintenanceMessage: String(body.message || 'Scheduled maintenance in progress'),
    maintenanceAllowAdmins: body.allowAdmins !== false,
    maintenanceScheduledAt: body.scheduledAt || null,
    maintenanceEndsAt: body.endsAt || null,
  }, actor);

  await logUserActivity(institutionId, {
    userId: actor?.userId ?? 'system',
    userEmail: actor?.userEmail ?? 'Admin',
    action: 'MAINTENANCE_SCHEDULE',
    module: 'Support & Maintenance',
    details: body.enabled ? 'Maintenance window scheduled' : 'Maintenance mode disabled',
  });

  return result;
}

export async function bootstrapLicenseSupport(institutionId: string) {
  await ensureSystemLicense(institutionId);
}
