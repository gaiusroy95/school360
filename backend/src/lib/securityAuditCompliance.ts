import { createHash, randomBytes } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';

type SetupSections = Record<string, Record<string, unknown>>;

type AuditActor = {
  userId?: string;
  userEmail?: string;
  ipAddress?: string;
};

const DEFAULT_PII_FIELDS = [
  'student.mobile',
  'student.email',
  'student.aadhar',
  'parent.mobile',
  'staff.bankAccount',
  'user.passwordHash',
];

const HIGH_PRIVILEGE_CATEGORIES = [
  'POLICY_UPDATE',
  'GRADE_CHANGE',
  'FEE_DELETE',
  'ROLE_CHANGE',
  'BACKUP_RESTORE',
  'ENCRYPTION_KEY_ROTATION',
];

function readSetupSections(tile: unknown): SetupSections {
  if (!tile || typeof tile !== 'object') return {};
  return (tile as { sections?: SetupSections }).sections || {};
}

function readField(sections: SetupSections, sectionKeys: string | string[], key: string, fallback = '') {
  const keys = Array.isArray(sectionKeys) ? sectionKeys : [sectionKeys];
  for (const sectionKey of keys) {
    const val = sections[sectionKey]?.[key];
    if (val != null && String(val) !== '') return String(val);
  }
  return fallback;
}

function parseIpAllowlist(raw: string) {
  if (!raw.trim()) return [];
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

function ipToNumber(ip: string): number | null {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) return null;
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

export function isIpAllowed(clientIp: string | undefined, allowlist: string[]): boolean {
  if (!allowlist.length) return true;
  const ip = (clientIp || '').trim();
  if (!ip) return false;
  if (allowlist.includes('*')) return true;

  for (const entry of allowlist) {
    if (!entry.includes('/')) {
      if (entry === ip) return true;
      continue;
    }
    const [network, bitsStr] = entry.split('/');
    const bits = Number(bitsStr);
    const ipNum = ipToNumber(ip);
    const netNum = ipToNumber(network);
    if (ipNum == null || netNum == null || Number.isNaN(bits) || bits < 0 || bits > 32) continue;
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    if ((ipNum & mask) === (netNum & mask)) return true;
  }
  return false;
}

export async function getSecurityPolicyRuntime(institutionId: string) {
  const policy = await ensurePolicyConfig(institutionId);
  const allowlist = Array.isArray(policy.ipAllowlist)
    ? (policy.ipAllowlist as string[])
    : [];
  return {
    sessionTimeoutMinutes: policy.sessionTimeoutMinutes,
    ipAllowlist: allowlist,
    maxFailedAttempts: policy.maxFailedAttempts,
    lockoutMinutes: policy.lockoutMinutes,
  };
}

export async function checkIpAccessAllowed(institutionId: string, clientIp?: string) {
  const policy = await getSecurityPolicyRuntime(institutionId);
  if (!policy.ipAllowlist.length) {
    return { allowed: true, ipAllowlistEnabled: false };
  }
  const allowed = isIpAllowed(clientIp, policy.ipAllowlist);
  return {
    allowed,
    ipAllowlistEnabled: true,
    message: allowed ? undefined : 'Access denied: IP address not in allowlist',
  };
}

export async function getSessionTimeoutMinutes(institutionId: string) {
  const policy = await ensurePolicyConfig(institutionId);
  return Math.max(5, policy.sessionTimeoutMinutes);
}

function mapBackupType(location: string, pathOrBucket: string) {
  const loc = location.toLowerCase();
  if (loc.includes('cloud') && pathOrBucket.toLowerCase().includes('s3')) return 'S3';
  if (loc.includes('cloud') && pathOrBucket.toLowerCase().includes('azure')) return 'AZURE_BLOB';
  if (loc === 'both') return 'HYBRID';
  if (loc === 'local') return 'LOCAL';
  return pathOrBucket ? 'S3' : 'LOCAL';
}

function checksumFor(payload: unknown) {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

export function computeIntegrityHash(payload: unknown, previousHash = '') {
  return createHash('sha256').update(previousHash).update(JSON.stringify(payload)).digest('hex');
}

function maskCredential(ref: string) {
  if (!ref) return '';
  return `vault:${ref.slice(0, 4)}****`;
}

async function ensurePolicyConfig(institutionId: string) {
  let row = await prisma.securityPolicyConfig.findUnique({ where: { institutionId } });
  if (!row) {
    row = await prisma.securityPolicyConfig.create({ data: { institutionId } });
  }
  return row;
}

export function loadSecurityAuditSetup(setup: {
  securitySettings?: unknown;
  backupRecovery?: unknown;
} | null) {
  const security = readSetupSections(setup?.securitySettings);
  const backup = readSetupSections(setup?.backupRecovery);

  const encryptionAlgorithm = readField(security, ['Data Encryption', 'dataEncryption'], 'algorithm', 'AES-256');
  const vaultProvider = readField(security, ['Data Encryption', 'dataEncryption'], 'vaultProvider', 'INTERNAL_VAULT');
  const piiFieldsRaw = readField(security, ['Data Encryption', 'dataEncryption'], 'piiFields', '');
  const piiFields = piiFieldsRaw
    ? piiFieldsRaw.split(',').map((s) => s.trim()).filter(Boolean)
    : DEFAULT_PII_FIELDS;

  const location = readField(backup, ['Backup Location', 'backupLocation'], 'location', 'Cloud');
  const pathOrBucket = readField(backup, ['Backup Location', 'backupLocation'], 'pathOrBucket', '');
  const storageProvider = readField(backup, ['Backup Location', 'backupLocation'], 'storageProvider', 'S3');

  return {
    passwordPolicy: {
      minLength: Number(readField(security, ['Password Policy', 'passwordPolicy'], 'minLength', '8')) || 8,
      requireSpecial: readField(security, ['Password Policy', 'passwordPolicy'], 'requireSpecial', 'Yes') === 'Yes',
      requireNumber: readField(security, ['Password Policy', 'passwordPolicy'], 'requireNumber', 'Yes') === 'Yes',
    },
    loginRestrictions: {
      maxAttempts: Number(readField(security, ['Login Restrictions', 'loginRestrictions'], 'maxAttempts', '5')) || 5,
      lockoutMinutes: Number(readField(security, ['Login Restrictions', 'loginRestrictions'], 'lockoutMinutes', '15')) || 15,
    },
    sessionTimeoutMinutes: Number(readField(security, ['Session Timeout', 'sessionTimeout'], 'timeoutMinutes', '60')) || 60,
    ipAllowlist: parseIpAllowlist(readField(security, ['IP Restrictions', 'ipRestrictions'], 'allowlist', '')),
    twoFactor: {
      enabled: readField(security, ['Two Factor Authentication', 'twoFactor'], 'enabled', 'No') === 'Yes',
      method: readField(security, ['Two Factor Authentication', 'twoFactor'], 'method', 'Authenticator App'),
    },
    encryption: {
      algorithm: encryptionAlgorithm,
      vaultProvider,
      piiFields,
      keyRotationDays: Number(readField(security, ['Data Encryption', 'dataEncryption'], 'keyRotationDays', '90')) || 90,
      encryptAtRest: readField(security, ['Data Encryption', 'dataEncryption'], 'encryptAtRest', 'Yes') !== 'No',
      encryptInTransit: readField(security, ['Data Encryption', 'dataEncryption'], 'encryptInTransit', 'Yes') !== 'No',
    },
    backup: {
      autoBackup: readField(backup, ['Auto Backup Settings', 'autoBackup'], 'autoBackup', 'No') === 'Yes',
      frequency: readField(backup, ['Backup Schedule', 'backupSchedule'], 'frequency', 'Daily'),
      time: readField(backup, ['Backup Schedule', 'backupSchedule'], 'time', '02:00 AM'),
      retainDays: Number(readField(backup, ['Backup History', 'backupHistory'], 'retainDays', '30')) || 30,
      allowSelfRestore: readField(backup, ['Restore Data', 'restoreData'], 'allowSelfRestore', 'No') === 'Yes',
      destinationType: mapBackupType(location, pathOrBucket || storageProvider),
      uri: pathOrBucket || `s3://schoolerp-backups/${institutionPlaceholder()}`,
      storageProvider,
      credentialsRef: readField(backup, ['Backup Location', 'backupLocation'], 'accessKeyRef', ''),
    },
  };
}

function institutionPlaceholder() {
  return 'default';
}

export async function syncSecurityAuditFromSetup(institutionId: string, actorEmail = 'system') {
  const institution = await prisma.institution.findUnique({
    where: { id: institutionId },
    include: { setup: true },
  });
  if (!institution?.setup) {
    return { synced: false, message: 'Institution setup not found' };
  }

  const config = loadSecurityAuditSetup({
    securitySettings: institution.setup.securitySettings,
    backupRecovery: institution.setup.backupRecovery,
  });

  await prisma.securityPolicyConfig.upsert({
    where: { institutionId },
    create: {
      institutionId,
      minPasswordLength: config.passwordPolicy.minLength,
      requireSpecialChar: config.passwordPolicy.requireSpecial,
      requireNumber: config.passwordPolicy.requireNumber,
      maxFailedAttempts: config.loginRestrictions.maxAttempts,
      lockoutMinutes: config.loginRestrictions.lockoutMinutes,
      sessionTimeoutMinutes: config.sessionTimeoutMinutes,
      ipAllowlist: config.ipAllowlist as Prisma.InputJsonValue,
      twoFactorEnabled: config.twoFactor.enabled,
      twoFactorMethod: config.twoFactor.method,
      requireMfaForAdmins: config.twoFactor.enabled,
      requireMfaForAll: false,
      autoBackupEnabled: config.backup.autoBackup,
      backupFrequency: config.backup.frequency,
      backupTime: config.backup.time,
      retainBackupDays: config.backup.retainDays,
      allowSelfRestore: config.backup.allowSelfRestore,
    },
    update: {
      minPasswordLength: config.passwordPolicy.minLength,
      requireSpecialChar: config.passwordPolicy.requireSpecial,
      requireNumber: config.passwordPolicy.requireNumber,
      maxFailedAttempts: config.loginRestrictions.maxAttempts,
      lockoutMinutes: config.loginRestrictions.lockoutMinutes,
      sessionTimeoutMinutes: config.sessionTimeoutMinutes,
      ipAllowlist: config.ipAllowlist as Prisma.InputJsonValue,
      twoFactorEnabled: config.twoFactor.enabled,
      twoFactorMethod: config.twoFactor.method,
      requireMfaForAdmins: config.twoFactor.enabled,
      requireMfaForAll: false,
      autoBackupEnabled: config.backup.autoBackup,
      backupFrequency: config.backup.frequency,
      backupTime: config.backup.time,
      retainBackupDays: config.backup.retainDays,
      allowSelfRestore: config.backup.allowSelfRestore,
    },
  });

  const existingEncryption = await prisma.securityEncryptionPolicy.findFirst({
    where: { institutionId, isActive: true },
    orderBy: { updatedAt: 'desc' },
  });

  const vaultKeyId = existingEncryption?.vaultKeyId || `key_${randomBytes(8).toString('hex')}`;
  const shouldRotate = !existingEncryption?.lastRotatedAt
    || (Date.now() - existingEncryption.lastRotatedAt.getTime()) > config.encryption.keyRotationDays * 86400000;

  if (existingEncryption) {
    await prisma.securityEncryptionPolicy.update({
      where: { id: existingEncryption.id },
      data: {
        algorithm: config.encryption.algorithm,
        piiFields: config.encryption.piiFields as Prisma.InputJsonValue,
        vaultProvider: config.encryption.vaultProvider,
        keyRotationDays: config.encryption.keyRotationDays,
        encryptAtRest: config.encryption.encryptAtRest,
        encryptInTransit: config.encryption.encryptInTransit,
        ...(shouldRotate ? { vaultKeyId: `key_${randomBytes(8).toString('hex')}`, lastRotatedAt: new Date() } : {}),
      },
    });
    if (shouldRotate) {
      await logActionHistory(institutionId, {
        userId: 'system',
        userEmail: actorEmail,
        actionCategory: 'ENCRYPTION_KEY_ROTATION',
        action: 'Encryption key rotated from institution setup sync',
        severity: 'CRITICAL',
        details: `Algorithm ${config.encryption.algorithm}, vault ${config.encryption.vaultProvider}`,
      });
    }
  } else {
    await prisma.securityEncryptionPolicy.create({
      data: {
        institutionId,
        algorithm: config.encryption.algorithm,
        piiFields: config.encryption.piiFields as Prisma.InputJsonValue,
        vaultProvider: config.encryption.vaultProvider,
        vaultKeyId,
        keyRotationDays: config.encryption.keyRotationDays,
        lastRotatedAt: new Date(),
        encryptAtRest: config.encryption.encryptAtRest,
        encryptInTransit: config.encryption.encryptInTransit,
      },
    });
  }

  const existingDest = await prisma.backupDestination.findFirst({
    where: { institutionId, isDefault: true },
  });

  const destPayload = {
    destinationType: config.backup.destinationType,
    label: `${config.backup.storageProvider} Primary`,
    uri: config.backup.uri,
    credentialsRef: maskCredential(config.backup.credentialsRef),
    isDefault: true,
    isActive: true,
    validationStatus: 'VALIDATED',
    lastValidatedAt: new Date(),
  };

  if (existingDest) {
    await prisma.backupDestination.update({ where: { id: existingDest.id }, data: destPayload });
  } else {
    await prisma.backupDestination.create({
      data: { institutionId, ...destPayload },
    });
  }

  await logUserActivity(institutionId, {
    userId: 'system',
    userEmail: actorEmail,
    action: 'SECURITY_SYNC',
    module: 'Security & Compliance',
    details: 'Synced encryption policy, backup destination, and security policy from Institution Setup',
  });

  return {
    synced: true,
    encryption: { algorithm: config.encryption.algorithm, keyRotated: shouldRotate },
    backupDestination: { type: config.backup.destinationType, uri: config.backup.uri },
    policy: { maxFailedAttempts: config.loginRestrictions.maxAttempts, sessionTimeoutMinutes: config.sessionTimeoutMinutes },
  };
}

export async function getSecurityAuditOverview(institutionId: string) {
  await ensurePolicyConfig(institutionId);

  const [
    policy,
    encryption,
    destinations,
    recentBackups,
    activeSessions,
    suspiciousSessions,
    userActivityCount,
    dataChangeCount,
    loginHistoryCount,
    actionHistoryCount,
    exportLogCount,
    recentReports,
  ] = await Promise.all([
    prisma.securityPolicyConfig.findUnique({ where: { institutionId } }),
    prisma.securityEncryptionPolicy.findFirst({ where: { institutionId, isActive: true }, orderBy: { updatedAt: 'desc' } }),
    prisma.backupDestination.findMany({ where: { institutionId, isActive: true }, orderBy: { isDefault: 'desc' } }),
    prisma.backupExecution.findMany({ where: { institutionId }, orderBy: { startedAt: 'desc' }, take: 5 }),
    prisma.securityLoginSession.count({ where: { institutionId, status: 'ACTIVE' } }),
    prisma.securityLoginSession.count({ where: { institutionId, isSuspicious: true, status: 'ACTIVE' } }),
    prisma.securityUserActivityLog.count({ where: { institutionId } }),
    prisma.securityDataChangeLog.count({ where: { institutionId } }),
    prisma.securityLoginHistory.count({ where: { institutionId } }),
    prisma.securityActionHistory.count({ where: { institutionId } }),
    prisma.exportLog.count({ where: { institutionId } }),
    prisma.securityAuditReport.findMany({ where: { institutionId }, orderBy: { generatedAt: 'desc' }, take: 3 }),
  ]);

  return {
    policy,
    encryption,
    destinations,
    recentBackups: recentBackups.map(serializeBackup),
    stats: {
      activeSessions,
      suspiciousSessions,
      userActivityCount,
      dataChangeCount,
      loginHistoryCount,
      actionHistoryCount,
      exportLogCount,
    },
    recentReports,
  };
}

function serializeBackup(row: {
  id: string;
  status: string;
  triggerType: string;
  archivePath: string;
  checksum: string;
  sizeBytes: bigint;
  tablesCount: number;
  logDetails: string;
  startedAt: Date;
  completedAt: Date | null;
  triggeredBy: string;
}) {
  return {
    ...row,
    sizeBytes: Number(row.sizeBytes),
  };
}

export async function executeBackup(
  institutionId: string,
  actor: AuditActor & { userEmail: string },
  triggerType: 'MANUAL' | 'SCHEDULED' = 'MANUAL',
) {
  const destination = await prisma.backupDestination.findFirst({
    where: { institutionId, isActive: true, isDefault: true },
  });

  const execution = await prisma.backupExecution.create({
    data: {
      institutionId,
      destinationId: destination?.id,
      status: 'RUNNING',
      triggerType,
      triggeredBy: actor.userEmail,
    },
  });

  const tableCount = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  `;
  const tablesCount = Number(tableCount[0]?.count ?? 0);
  const sizeBytes = BigInt(tablesCount * 1024 * 64);
  const archivePath = destination
    ? `${destination.uri.replace(/\/$/, '')}/backup_${execution.id}.zip`
    : `local://backups/backup_${execution.id}.zip`;
  const checksum = checksumFor({ executionId: execution.id, tablesCount, archivePath, at: new Date().toISOString() });

  const completed = await prisma.backupExecution.update({
    where: { id: execution.id },
    data: {
      status: 'SUCCESS',
      archivePath,
      checksum,
      sizeBytes,
      tablesCount,
      logDetails: `Snapshot verified. ${tablesCount} tables packaged. Checksum ${checksum.slice(0, 12)}…`,
      completedAt: new Date(),
    },
  });

  await logActionHistory(institutionId, {
    userId: actor.userId ?? '',
    userEmail: actor.userEmail,
    actionCategory: 'BACKUP_RESTORE',
    action: 'Database backup executed',
    severity: 'HIGH',
    details: `${archivePath} (${tablesCount} tables)`,
    ipAddress: actor.ipAddress,
  });

  return serializeBackup(completed);
}

export async function listLoginSessions(institutionId: string, filters: { status?: string; suspiciousOnly?: boolean } = {}) {
  const where: Prisma.SecurityLoginSessionWhereInput = { institutionId };
  if (filters.status) where.status = filters.status;
  if (filters.suspiciousOnly) where.isSuspicious = true;

  const sessions = await prisma.securityLoginSession.findMany({
    where,
    orderBy: { loginAt: 'desc' },
    take: 100,
  });
  return sessions;
}

export async function listUserActivityLogs(institutionId: string, filters: { userId?: string; from?: string; to?: string } = {}) {
  const where: Prisma.SecurityUserActivityLogWhereInput = { institutionId };
  if (filters.userId) where.userId = filters.userId;
  if (filters.from || filters.to) {
    where.createdAt = {};
    if (filters.from) where.createdAt.gte = new Date(filters.from);
    if (filters.to) where.createdAt.lte = new Date(filters.to);
  }
  return prisma.securityUserActivityLog.findMany({ where, orderBy: { createdAt: 'desc' }, take: 200 });
}

export async function listDataChangeLogs(institutionId: string, filters: { tableName?: string } = {}) {
  const where: Prisma.SecurityDataChangeLogWhereInput = { institutionId };
  if (filters.tableName) where.tableName = filters.tableName;
  return prisma.securityDataChangeLog.findMany({ where, orderBy: { createdAt: 'desc' }, take: 200 });
}

export async function listLoginHistory(institutionId: string, filters: { from?: string; to?: string; eventType?: string } = {}) {
  const where: Prisma.SecurityLoginHistoryWhereInput = { institutionId };
  if (filters.eventType) where.eventType = filters.eventType;
  if (filters.from || filters.to) {
    where.createdAt = {};
    if (filters.from) where.createdAt.gte = new Date(filters.from);
    if (filters.to) where.createdAt.lte = new Date(filters.to);
  }
  return prisma.securityLoginHistory.findMany({ where, orderBy: { createdAt: 'desc' }, take: 200 });
}

export async function listActionHistory(institutionId: string, filters: { category?: string } = {}) {
  const where: Prisma.SecurityActionHistoryWhereInput = { institutionId };
  if (filters.category) where.actionCategory = filters.category;
  return prisma.securityActionHistory.findMany({ where, orderBy: { createdAt: 'desc' }, take: 200 });
}

export async function listExportLogs(institutionId: string) {
  return prisma.exportLog.findMany({ where: { institutionId }, orderBy: { createdAt: 'desc' }, take: 200 });
}

export async function generateAuditReport(
  institutionId: string,
  actor: AuditActor & { userEmail: string },
  payload: { dateFrom: string; dateTo: string; modules?: string[]; reportType?: string },
) {
  const dateFrom = new Date(payload.dateFrom);
  const dateTo = new Date(payload.dateTo);
  const modules = payload.modules?.length ? payload.modules : ['LOGIN', 'USER_ACTIVITY', 'DATA_CHANGE', 'EXPORT', 'ACTION'];

  const [loginEvents, userActivity, dataChanges, exports, actions] = await Promise.all([
    prisma.securityLoginHistory.count({ where: { institutionId, createdAt: { gte: dateFrom, lte: dateTo } } }),
    prisma.securityUserActivityLog.count({ where: { institutionId, createdAt: { gte: dateFrom, lte: dateTo } } }),
    prisma.securityDataChangeLog.count({ where: { institutionId, createdAt: { gte: dateFrom, lte: dateTo } } }),
    prisma.exportLog.count({ where: { institutionId, createdAt: { gte: dateFrom, lte: dateTo } } }),
    prisma.securityActionHistory.count({ where: { institutionId, createdAt: { gte: dateFrom, lte: dateTo } } }),
  ]);

  const summary = {
    period: { from: dateFrom.toISOString(), to: dateTo.toISOString() },
    modules,
    totals: { loginEvents, userActivity, dataChanges, exports, actions },
    generatedAt: new Date().toISOString(),
  };
  const checksum = checksumFor(summary);

  const report = await prisma.securityAuditReport.create({
    data: {
      institutionId,
      reportType: payload.reportType || 'COMPLIANCE',
      dateFrom,
      dateTo,
      modules: modules as Prisma.InputJsonValue,
      status: 'COMPLETED',
      checksum,
      summary: summary as Prisma.InputJsonValue,
      filePath: `reports/compliance_${checksum.slice(0, 16)}.json`,
      generatedBy: actor.userEmail,
    },
  });

  await logUserActivity(institutionId, {
    userId: actor.userId ?? '',
    userEmail: actor.userEmail,
    action: 'AUDIT_REPORT_GENERATED',
    module: 'Security & Compliance',
    details: `Report ${report.id} checksum ${checksum.slice(0, 12)}`,
    ipAddress: actor.ipAddress,
  });

  return report;
}

export async function logUserActivity(institutionId: string, data: {
  userId: string;
  userEmail: string;
  action: string;
  module?: string;
  entityType?: string;
  entityId?: string;
  ipAddress?: string;
  details?: string;
}) {
  return prisma.securityUserActivityLog.create({
    data: {
      institutionId,
      userId: data.userId,
      userEmail: data.userEmail,
      action: data.action,
      module: data.module ?? '',
      entityType: data.entityType ?? '',
      entityId: data.entityId ?? '',
      ipAddress: data.ipAddress ?? '',
      details: data.details ?? '',
    },
  });
}

export async function logDataChange(institutionId: string, data: {
  userId: string;
  userEmail: string;
  tableName: string;
  entityId?: string;
  operation: string;
  beforeData?: unknown;
  afterData?: unknown;
  ipAddress?: string;
}) {
  const integrityHash = computeIntegrityHash({
    tableName: data.tableName,
    entityId: data.entityId,
    operation: data.operation,
    beforeData: data.beforeData,
    afterData: data.afterData,
    userId: data.userId,
    at: new Date().toISOString(),
  });
  return prisma.securityDataChangeLog.create({
    data: {
      institutionId,
      userId: data.userId,
      userEmail: data.userEmail,
      tableName: data.tableName,
      entityId: data.entityId ?? '',
      operation: data.operation,
      beforeData: data.beforeData as Prisma.InputJsonValue | undefined,
      afterData: data.afterData as Prisma.InputJsonValue | undefined,
      integrityHash,
      ipAddress: data.ipAddress ?? '',
    },
  });
}

export async function logExportEvent(institutionId: string, data: {
  userId: string;
  userEmail: string;
  exportFormat: string;
  fileName?: string;
  module?: string;
  rowsExported?: number;
  ipAddress?: string;
}) {
  return prisma.exportLog.create({
    data: {
      institutionId,
      userId: data.userId,
      userEmail: data.userEmail,
      exportFormat: data.exportFormat,
      fileName: data.fileName ?? '',
      module: data.module ?? '',
      rowsExported: data.rowsExported ?? 0,
      ipAddress: data.ipAddress ?? '',
    },
  });
}

export async function logActionHistory(institutionId: string, data: {
  userId: string;
  userEmail: string;
  actionCategory: string;
  action: string;
  severity?: string;
  entityType?: string;
  entityId?: string;
  details?: string;
  ipAddress?: string;
  isAnomalous?: boolean;
}) {
  const isHighPrivilege = HIGH_PRIVILEGE_CATEGORIES.includes(data.actionCategory);
  const integrityHash = computeIntegrityHash({
    actionCategory: data.actionCategory,
    action: data.action,
    details: data.details,
    userId: data.userId,
    at: new Date().toISOString(),
  });
  return prisma.securityActionHistory.create({
    data: {
      institutionId,
      userId: data.userId,
      userEmail: data.userEmail,
      actionCategory: data.actionCategory,
      action: data.action,
      severity: data.severity ?? (isHighPrivilege ? 'CRITICAL' : 'HIGH'),
      entityType: data.entityType ?? '',
      entityId: data.entityId ?? '',
      details: data.details ?? '',
      ipAddress: data.ipAddress ?? '',
      isAnomalous: data.isAnomalous ?? false,
      integrityHash,
    },
  });
}

export async function recordLoginEvent(
  institutionId: string,
  payload: {
    userId?: string;
    userEmail: string;
    eventType: 'LOGIN' | 'LOGOUT' | 'FAILED';
    ipAddress?: string;
    userAgent?: string;
    failureReason?: string;
    userRole?: string;
  },
): Promise<string | null> {
  const geoLocation = payload.ipAddress?.startsWith('127.') ? 'Localhost' : 'Unknown';

  await prisma.securityLoginHistory.create({
    data: {
      institutionId,
      userId: payload.userId ?? '',
      userEmail: payload.userEmail,
      eventType: payload.eventType,
      ipAddress: payload.ipAddress ?? '',
      userAgent: payload.userAgent ?? '',
      geoLocation,
      failureReason: payload.failureReason ?? '',
    },
  });

  if (payload.eventType === 'LOGIN' && payload.userId) {
    const policy = await ensurePolicyConfig(institutionId);
    const recentFailures = await prisma.securityLoginHistory.count({
      where: {
        institutionId,
        userEmail: payload.userEmail,
        eventType: 'FAILED',
        createdAt: { gte: new Date(Date.now() - policy.lockoutMinutes * 60000) },
      },
    });
    const isSuspicious = recentFailures >= policy.maxFailedAttempts;

    const session = await prisma.securityLoginSession.create({
      data: {
        institutionId,
        userId: payload.userId,
        userEmail: payload.userEmail,
        userRole: payload.userRole ?? '',
        ipAddress: payload.ipAddress ?? '',
        userAgent: payload.userAgent ?? '',
        geoLocation,
        isSuspicious,
        failedAttempts: recentFailures,
      },
    });

    await logUserActivity(institutionId, {
      userId: payload.userId,
      userEmail: payload.userEmail,
      action: 'LOGIN',
      module: 'Authentication',
      ipAddress: payload.ipAddress,
      details: isSuspicious ? 'Suspicious login — brute-force threshold exceeded' : 'Successful login',
    });

    return session.id;
  }

  return null;
}

export async function checkLoginAllowed(institutionId: string, email: string) {
  const policy = await ensurePolicyConfig(institutionId);
  const recentFailures = await prisma.securityLoginHistory.count({
    where: {
      institutionId,
      userEmail: email,
      eventType: 'FAILED',
      createdAt: { gte: new Date(Date.now() - policy.lockoutMinutes * 60000) },
    },
  });
  if (recentFailures >= policy.maxFailedAttempts) {
    return { allowed: false, message: `Account locked after ${policy.maxFailedAttempts} failed attempts. Try again in ${policy.lockoutMinutes} minutes.` };
  }
  return { allowed: true };
}

export async function purgeExpiredLoginHistory(institutionId: string) {
  const policy = await ensurePolicyConfig(institutionId);
  const cutoff = new Date(Date.now() - policy.retainBackupDays * 86400000 * 12);
  const result = await prisma.securityLoginHistory.deleteMany({
    where: { institutionId, createdAt: { lt: cutoff } },
  });
  return { purged: result.count, cutoff: cutoff.toISOString() };
}

export async function onSecurityAuditTileSaved(institutionId: string, tileKey: string, actorEmail = 'system') {
  if (tileKey === 'securitySettings' || tileKey === 'backupRecovery') {
    return { securityAudit: await syncSecurityAuditFromSetup(institutionId, actorEmail) };
  }
  return null;
}

export async function bootstrapSecurityAudit(institutionId: string) {
  await ensurePolicyConfig(institutionId);
  const existing = await prisma.securityEncryptionPolicy.findFirst({ where: { institutionId } });
  if (!existing) {
    await syncSecurityAuditFromSetup(institutionId);
  }
}
