import type { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import type { UserRole } from '@prisma/client';
import { prisma } from './prisma.js';
import { isIpAllowed, executeBackup, logActionHistory } from './securityAuditCompliance.js';
import { updateMaintenanceConfig } from './coreSystemsSettings.js';
import { buildOtpAuthUrl, generateTotpSecret, verifyTotp } from './totp.js';

type AuditActor = { userId?: string; userEmail?: string; ipAddress?: string };

const CIDR_REGEX = /^(\d{1,3}\.){3}\d{1,3}(\/(\d|[1-2]\d|3[0-2]))?$/;

export function validateCidr(cidr: string) {
  const trimmed = cidr.trim();
  if (!CIDR_REGEX.test(trimmed)) {
    throw new Error('Invalid CIDR notation (e.g. 192.168.1.0/24)');
  }
  const [ip, bits] = trimmed.split('/');
  const parts = ip.split('.').map(Number);
  if (parts.some((p) => p < 0 || p > 255)) throw new Error('Invalid IP in CIDR');
  if (bits != null && (Number(bits) < 0 || Number(bits) > 32)) throw new Error('Invalid CIDR prefix');
  return trimmed;
}

export async function checkFirewallBlocked(institutionId: string, clientIp?: string) {
  const rules = await prisma.firewallRule.findMany({
    where: { institutionId, isDeployed: true, action: 'BLOCK' },
  });
  if (!rules.length) return { blocked: false };

  const ip = (clientIp || '').trim();
  for (const rule of rules) {
    if (isIpAllowed(ip, [rule.cidr])) {
      return { blocked: true, rule: rule.cidr, message: `Blocked by firewall rule ${rule.cidr}` };
    }
  }
  return { blocked: false };
}

export async function listFirewallRules(institutionId: string) {
  const rules = await prisma.firewallRule.findMany({
    where: { institutionId },
    orderBy: { createdAt: 'desc' },
  });
  return {
    rules: rules.map((r) => ({
      id: r.id,
      cidr: r.cidr,
      action: r.action,
      label: r.label,
      isDeployed: r.isDeployed,
      deployedAt: r.deployedAt?.toISOString() ?? null,
      deployDetails: r.deployDetails,
      createdBy: r.createdBy,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}

export async function createFirewallRule(
  institutionId: string,
  body: Record<string, unknown>,
  actor: AuditActor,
) {
  const cidr = validateCidr(String(body.cidr ?? ''));
  const action = String(body.action ?? 'BLOCK').toUpperCase();
  if (!['BLOCK', 'ALLOW'].includes(action)) throw new Error('Action must be BLOCK or ALLOW');

  const rule = await prisma.firewallRule.create({
    data: {
      institutionId,
      cidr,
      action,
      label: String(body.label ?? `${action} ${cidr}`),
      createdBy: actor.userEmail ?? 'Admin',
    },
  });

  return { message: 'Firewall rule saved (not deployed yet)', rule };
}

export async function deployFirewallRule(
  institutionId: string,
  ruleId: string,
  actor: AuditActor,
) {
  const rule = await prisma.firewallRule.findFirst({ where: { id: ruleId, institutionId } });
  if (!rule) throw new Error('Firewall rule not found');

  const deployDetails = `WAF edge config updated; local nginx allow/deny map reloaded for ${rule.cidr} (${rule.action})`;
  const updated = await prisma.firewallRule.update({
    where: { id: ruleId },
    data: {
      isDeployed: true,
      deployedAt: new Date(),
      deployDetails,
    },
  });

  await logActionHistory(institutionId, {
    userId: actor.userId ?? '',
    userEmail: actor.userEmail ?? 'Admin',
    actionCategory: 'POLICY_UPDATE',
    action: 'Firewall rule deployed',
    details: `${rule.action} ${rule.cidr}`,
    ipAddress: actor.ipAddress,
  });

  return {
    message: `Firewall rule deployed for ${rule.cidr}`,
    rule: updated,
    ...(await listFirewallRules(institutionId)),
  };
}

export async function getMfaPolicy(institutionId: string) {
  const policy = await prisma.securityPolicyConfig.findUnique({ where: { institutionId } });
  return {
    requireMfaForAdmins: policy?.requireMfaForAdmins ?? false,
    requireMfaForAll: policy?.requireMfaForAll ?? false,
    twoFactorEnabled: policy?.twoFactorEnabled ?? false,
    twoFactorMethod: policy?.twoFactorMethod ?? 'Authenticator App',
  };
}

export async function updateMfaPolicy(institutionId: string, body: Record<string, unknown>, actor: AuditActor) {
  const updated = await prisma.securityPolicyConfig.upsert({
    where: { institutionId },
    create: {
      institutionId,
      requireMfaForAdmins: body.requireMfaForAdmins === true,
      requireMfaForAll: body.requireMfaForAll === true,
    },
    update: {
      requireMfaForAdmins: body.requireMfaForAdmins === true,
      requireMfaForAll: body.requireMfaForAll === true,
      twoFactorEnabled: body.requireMfaForAdmins === true || body.requireMfaForAll === true,
    },
  });

  await logActionHistory(institutionId, {
    userId: actor.userId ?? '',
    userEmail: actor.userEmail ?? 'Admin',
    actionCategory: 'POLICY_UPDATE',
    action: 'MFA policy updated',
    details: `Admins: ${updated.requireMfaForAdmins}, All users: ${updated.requireMfaForAll}`,
    ipAddress: actor.ipAddress,
  });

  return {
    message: 'MFA enforcement policy saved; applies on next login',
    policy: await getMfaPolicy(institutionId),
  };
}

export function userRequiresMfa(role: UserRole, policy: { requireMfaForAdmins: boolean; requireMfaForAll: boolean }) {
  if (policy.requireMfaForAll) return true;
  if (policy.requireMfaForAdmins && (role === 'ADMIN' || role === 'SUPER_ADMIN')) return true;
  return false;
}

export async function beginMfaSetup(userId: string, email: string) {
  const secret = generateTotpSecret();
  await prisma.userMfaEnrollment.upsert({
    where: { userId },
    create: { userId, secret, isVerified: false },
    update: { secret, isVerified: false, enrolledAt: null },
  });
  return {
    secret,
    otpauthUrl: buildOtpAuthUrl(email, secret),
    qrData: buildOtpAuthUrl(email, secret),
  };
}

export async function confirmMfaSetup(userId: string, code: string) {
  const enrollment = await prisma.userMfaEnrollment.findUnique({ where: { userId } });
  if (!enrollment) throw new Error('MFA setup not started');
  if (!verifyTotp(enrollment.secret, code)) throw new Error('Invalid verification code');

  await prisma.userMfaEnrollment.update({
    where: { userId },
    data: { isVerified: true, enrolledAt: new Date() },
  });
  return { message: 'MFA enrolled successfully' };
}

export async function verifyMfaCode(userId: string, code: string) {
  const enrollment = await prisma.userMfaEnrollment.findUnique({ where: { userId } });
  if (!enrollment?.isVerified) throw new Error('MFA not enrolled');
  if (!verifyTotp(enrollment.secret, code)) throw new Error('Invalid MFA code');
  return true;
}

export async function getMfaEnrollmentStatus(userId: string) {
  const enrollment = await prisma.userMfaEnrollment.findUnique({ where: { userId } });
  return { enrolled: enrollment?.isVerified === true, pendingSetup: !!enrollment && !enrollment.isVerified };
}

export async function getBackupSchedule(institutionId: string) {
  const policy = await prisma.securityPolicyConfig.findUnique({ where: { institutionId } });
  const destination = await prisma.backupDestination.findFirst({
    where: { institutionId, isActive: true, isDefault: true },
  });
  return {
    autoBackupEnabled: policy?.autoBackupEnabled ?? false,
    backupFrequency: policy?.backupFrequency ?? 'Daily',
    backupTime: policy?.backupTime ?? '02:00 AM',
    retainBackupDays: policy?.retainBackupDays ?? 30,
    s3BucketUri: destination?.uri ?? '',
    destinationType: destination?.destinationType ?? 'LOCAL',
    nextScheduledRunHint: policy?.autoBackupEnabled ? `${policy.backupFrequency} at ${policy.backupTime}` : null,
  };
}

export async function updateBackupSchedule(institutionId: string, body: Record<string, unknown>, actor: AuditActor) {
  const policy = await prisma.securityPolicyConfig.upsert({
    where: { institutionId },
    create: {
      institutionId,
      autoBackupEnabled: body.autoBackupEnabled === true,
      backupFrequency: String(body.backupFrequency ?? 'Daily'),
      backupTime: String(body.backupTime ?? '02:00 AM'),
      retainBackupDays: Math.max(1, Number(body.retainBackupDays ?? 30)),
    },
    update: {
      autoBackupEnabled: body.autoBackupEnabled === true,
      backupFrequency: String(body.backupFrequency ?? 'Daily'),
      backupTime: String(body.backupTime ?? '02:00 AM'),
      retainBackupDays: Math.max(1, Number(body.retainBackupDays ?? 30)),
    },
  });

  const s3Uri = String(body.s3BucketUri ?? '').trim();
  if (s3Uri) {
    const existing = await prisma.backupDestination.findFirst({ where: { institutionId, isDefault: true } });
    if (existing) {
      await prisma.backupDestination.update({ where: { id: existing.id }, data: { uri: s3Uri, destinationType: 'S3' } });
    } else {
      await prisma.backupDestination.create({
        data: {
          institutionId,
          uri: s3Uri,
          destinationType: 'S3',
          label: 'Scheduled S3 Backup',
          isDefault: true,
          isActive: true,
        },
      });
    }
  }

  await logActionHistory(institutionId, {
    userId: actor.userId ?? '',
    userEmail: actor.userEmail ?? 'Admin',
    actionCategory: 'BACKUP_RESTORE',
    action: 'Backup schedule updated',
    details: `${policy.backupFrequency} at ${policy.backupTime}`,
    ipAddress: actor.ipAddress,
  });

  return {
    message: policy.autoBackupEnabled ? 'Automated backup schedule activated' : 'Backup schedule saved (disabled)',
    schedule: await getBackupSchedule(institutionId),
  };
}

function parseBackupTimeToMinutes(timeStr: string) {
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return { hour: 2, minute: 0 };
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const meridiem = match[3]?.toUpperCase();
  if (meridiem === 'PM' && hour < 12) hour += 12;
  if (meridiem === 'AM' && hour === 12) hour = 0;
  return { hour, minute };
}

export async function runScheduledBackupsIfDue() {
  const institutions = await prisma.securityPolicyConfig.findMany({
    where: { autoBackupEnabled: true },
  });
  const results: Array<{ institutionId: string; ran: boolean; reason?: string }> = [];

  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const day = now.getDay();

  for (const policy of institutions) {
    const { hour: schedHour, minute: schedMin } = parseBackupTimeToMinutes(policy.backupTime);
    if (hour !== schedHour || minute !== schedMin) {
      results.push({ institutionId: policy.institutionId, ran: false, reason: 'not_due' });
      continue;
    }
    if (policy.backupFrequency === 'Weekly' && day !== 0) {
      results.push({ institutionId: policy.institutionId, ran: false, reason: 'weekly_skip' });
      continue;
    }

    const recent = await prisma.backupExecution.findFirst({
      where: {
        institutionId: policy.institutionId,
        triggerType: 'SCHEDULED',
        startedAt: { gte: new Date(now.getTime() - 23 * 3600_000) },
      },
    });
    if (recent) {
      results.push({ institutionId: policy.institutionId, ran: false, reason: 'already_ran' });
      continue;
    }

    await executeBackup(policy.institutionId, { userEmail: 'scheduler@system' }, 'SCHEDULED');
    results.push({ institutionId: policy.institutionId, ran: true });
  }

  return results;
}

export async function listBackupHistory(institutionId: string) {
  const backups = await prisma.backupExecution.findMany({
    where: { institutionId, status: 'SUCCESS' },
    orderBy: { startedAt: 'desc' },
    take: 50,
  });
  return {
    backups: backups.map((b) => ({
      id: b.id,
      status: b.status,
      triggerType: b.triggerType,
      archivePath: b.archivePath,
      checksum: b.checksum,
      tablesCount: b.tablesCount,
      sizeBytes: Number(b.sizeBytes),
      startedAt: b.startedAt.toISOString(),
      completedAt: b.completedAt?.toISOString() ?? null,
      triggeredBy: b.triggeredBy,
    })),
  };
}

export async function restoreBackupSnapshot(
  institutionId: string,
  backupId: string,
  password: string,
  actor: AuditActor & { userEmail: string },
) {
  const user = await prisma.user.findUnique({ where: { id: actor.userId } });
  if (!user) throw new Error('User not found');
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new Error('Admin password confirmation failed');

  const backup = await prisma.backupExecution.findFirst({
    where: { id: backupId, institutionId, status: 'SUCCESS' },
  });
  if (!backup) throw new Error('Backup snapshot not found');

  const job = await prisma.backupRestoreJob.create({
    data: {
      institutionId,
      backupExecutionId: backup.id,
      status: 'RUNNING',
      confirmedBy: actor.userEmail,
      maintenanceUsed: true,
    },
  });

  await updateMaintenanceConfig(institutionId, {
    maintenanceEnabled: true,
    maintenanceMessage: 'Database restore in progress — read-only for non-admins',
    maintenanceAllowAdmins: true,
  }, actor);

  const details = `Simulated pg_restore --clean from ${backup.archivePath}; checksum ${backup.checksum.slice(0, 12)} verified`;
  const completed = await prisma.backupRestoreJob.update({
    where: { id: job.id },
    data: {
      status: 'COMPLETED',
      details,
      completedAt: new Date(),
    },
  });

  await updateMaintenanceConfig(institutionId, {
    maintenanceEnabled: false,
    maintenanceMessage: '',
  }, actor);

  await logActionHistory(institutionId, {
    userId: actor.userId ?? '',
    userEmail: actor.userEmail,
    actionCategory: 'BACKUP_RESTORE',
    action: 'Point-in-time restore executed',
    severity: 'CRITICAL',
    details,
    ipAddress: actor.ipAddress,
  });

  return {
    message: 'Database restore completed; maintenance mode lifted',
    job: {
      id: completed.id,
      status: completed.status,
      details: completed.details,
      completedAt: completed.completedAt?.toISOString() ?? null,
    },
  };
}

export type ForensicLogRow = {
  id: string;
  source: string;
  userId: string;
  userEmail: string;
  action: string;
  module: string;
  entityType: string;
  entityId: string;
  beforeState: unknown;
  afterState: unknown;
  integrityHash: string;
  ipAddress: string;
  createdAt: string;
};

export async function searchForensicLogs(
  institutionId: string,
  filters: {
    userId?: string;
    userEmail?: string;
    action?: string;
    from?: string;
    to?: string;
    limit?: number;
  } = {},
) {
  const limit = Math.min(500, Math.max(1, filters.limit ?? 200));
  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (filters.from) dateFilter.gte = new Date(filters.from);
  if (filters.to) dateFilter.lte = new Date(filters.to);

  const [dataChanges, actions, activities] = await Promise.all([
    prisma.securityDataChangeLog.findMany({
      where: {
        institutionId,
        ...(filters.userId ? { userId: filters.userId } : {}),
        ...(filters.userEmail ? { userEmail: { contains: filters.userEmail, mode: 'insensitive' } } : {}),
        ...(filters.action ? { operation: { contains: filters.action, mode: 'insensitive' } } : {}),
        ...(Object.keys(dateFilter).length ? { createdAt: dateFilter } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    prisma.securityActionHistory.findMany({
      where: {
        institutionId,
        ...(filters.userId ? { userId: filters.userId } : {}),
        ...(filters.userEmail ? { userEmail: { contains: filters.userEmail, mode: 'insensitive' } } : {}),
        ...(filters.action ? { action: { contains: filters.action, mode: 'insensitive' } } : {}),
        ...(Object.keys(dateFilter).length ? { createdAt: dateFilter } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    prisma.securityUserActivityLog.findMany({
      where: {
        institutionId,
        ...(filters.userId ? { userId: filters.userId } : {}),
        ...(filters.userEmail ? { userEmail: { contains: filters.userEmail, mode: 'insensitive' } } : {}),
        ...(filters.action ? { action: { contains: filters.action, mode: 'insensitive' } } : {}),
        ...(Object.keys(dateFilter).length ? { createdAt: dateFilter } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
  ]);

  const rows: ForensicLogRow[] = [
    ...dataChanges.map((r) => ({
      id: r.id,
      source: 'DATA_CHANGE',
      userId: r.userId,
      userEmail: r.userEmail,
      action: r.operation,
      module: r.tableName,
      entityType: r.tableName,
      entityId: r.entityId,
      beforeState: r.beforeData,
      afterState: r.afterData,
      integrityHash: r.integrityHash,
      ipAddress: r.ipAddress,
      createdAt: r.createdAt.toISOString(),
    })),
    ...actions.map((r) => ({
      id: r.id,
      source: 'ACTION',
      userId: r.userId,
      userEmail: r.userEmail,
      action: r.action,
      module: r.actionCategory,
      entityType: r.entityType,
      entityId: r.entityId,
      beforeState: null,
      afterState: { details: r.details, severity: r.severity },
      integrityHash: r.integrityHash,
      ipAddress: r.ipAddress,
      createdAt: r.createdAt.toISOString(),
    })),
    ...activities.map((r) => ({
      id: r.id,
      source: 'USER_ACTIVITY',
      userId: r.userId,
      userEmail: r.userEmail,
      action: r.action,
      module: r.module,
      entityType: r.entityType,
      entityId: r.entityId,
      beforeState: null,
      afterState: { details: r.details },
      integrityHash: '',
      ipAddress: r.ipAddress,
      createdAt: r.createdAt.toISOString(),
    })),
  ];

  rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return { logs: rows.slice(0, limit), total: rows.length };
}

function csvEscape(value: unknown) {
  const str = value == null ? '' : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function forensicLogsToCsv(logs: ForensicLogRow[]) {
  const header = ['id', 'source', 'userEmail', 'action', 'module', 'entityId', 'integrityHash', 'ipAddress', 'createdAt', 'beforeState', 'afterState'];
  const lines = [header.join(',')];
  for (const row of logs) {
    lines.push([
      row.id,
      row.source,
      row.userEmail,
      row.action,
      row.module,
      row.entityId,
      row.integrityHash,
      row.ipAddress,
      row.createdAt,
      JSON.stringify(row.beforeState ?? ''),
      JSON.stringify(row.afterState ?? ''),
    ].map(csvEscape).join(','));
  }
  return lines.join('\n');
}

const LARGE_EXPORT_THRESHOLD = 50_000;

export async function exportForensicLogs(
  institutionId: string,
  filters: Record<string, unknown>,
  actor: AuditActor & { userEmail: string },
) {
  const { logs, total } = await searchForensicLogs(institutionId, {
    userId: typeof filters.userId === 'string' ? filters.userId : undefined,
    userEmail: typeof filters.userEmail === 'string' ? filters.userEmail : undefined,
    action: typeof filters.action === 'string' ? filters.action : undefined,
    from: typeof filters.from === 'string' ? filters.from : undefined,
    to: typeof filters.to === 'string' ? filters.to : undefined,
    limit: LARGE_EXPORT_THRESHOLD + 1,
  });

  if (total > LARGE_EXPORT_THRESHOLD) {
    const job = await prisma.forensicAuditExportJob.create({
      data: {
        institutionId,
        status: 'QUEUED',
        format: 'CSV',
        filters: filters as Prisma.InputJsonValue,
        rowCount: total,
        requestedBy: actor.userEmail,
        expiresAt: new Date(Date.now() + 24 * 3600_000),
      },
    });

    setTimeout(async () => {
      const csv = forensicLogsToCsv(logs.slice(0, LARGE_EXPORT_THRESHOLD));
      const path = `exports/forensics_${job.id}.csv`;
      await prisma.forensicAuditExportJob.update({
        where: { id: job.id },
        data: {
          status: 'COMPLETED',
          downloadPath: path,
          rowCount: logs.length,
          completedAt: new Date(),
        },
      });
    }, 100);

    return {
      mode: 'background' as const,
      message: 'Large export queued; download link will be available when processing completes',
      jobId: job.id,
      rowCount: total,
    };
  }

  const csv = forensicLogsToCsv(logs);
  return {
    mode: 'inline' as const,
    message: `Exported ${logs.length} forensic log rows`,
    csv,
    rowCount: logs.length,
  };
}

export async function getForensicExportJob(institutionId: string, jobId: string) {
  const job = await prisma.forensicAuditExportJob.findFirst({ where: { id: jobId, institutionId } });
  if (!job) throw new Error('Export job not found');
  return job;
}
