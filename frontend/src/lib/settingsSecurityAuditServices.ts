import { api } from './api';

export type SecurityAuditOverview = {
  policy: {
    maxFailedAttempts: number;
    lockoutMinutes: number;
    sessionTimeoutMinutes: number;
    twoFactorEnabled: boolean;
    autoBackupEnabled: boolean;
    backupFrequency: string;
    retainBackupDays: number;
  } | null;
  encryption: {
    algorithm: string;
    vaultProvider: string;
    vaultKeyId: string;
    encryptAtRest: boolean;
    encryptInTransit: boolean;
    piiFields: unknown;
    lastRotatedAt: string | null;
  } | null;
  destinations: Array<{
    id: string;
    destinationType: string;
    label: string;
    uri: string;
    validationStatus: string;
    isDefault: boolean;
  }>;
  recentBackups: Array<{
    id: string;
    status: string;
    checksum: string;
    tablesCount: number;
    archivePath: string;
    startedAt: string;
    triggeredBy: string;
  }>;
  stats: {
    activeSessions: number;
    suspiciousSessions: number;
    userActivityCount: number;
    dataChangeCount: number;
    loginHistoryCount: number;
    actionHistoryCount: number;
    exportLogCount: number;
  };
  recentReports: Array<{
    id: string;
    reportType: string;
    checksum: string;
    status: string;
    generatedAt: string;
    generatedBy: string;
  }>;
};

export async function fetchSecurityAuditOverview() {
  return api<SecurityAuditOverview>(`/api/settings/security-audit/overview`);
}

export async function syncSecurityAudit() {
  return api<{ message: string; synced?: boolean }>(`/api/settings/security-audit/sync`, { method: 'POST' });
}

export async function executeSecurityBackup() {
  return api<{ message: string; backup: Record<string, unknown> }>(`/api/settings/security-audit/backups/execute`, {
    method: 'POST',
    body: JSON.stringify({ triggerType: 'MANUAL' }),
  });
}

export async function fetchLoginSessions(params?: { status?: string; suspicious?: boolean }) {
  const q = new URLSearchParams();
  if (params?.status) q.set('status', params.status);
  if (params?.suspicious) q.set('suspicious', 'true');
  const suffix = q.toString() ? `?${q}` : '';
  return api<{ sessions: Array<Record<string, unknown>> }>(`/api/settings/security-audit/login-sessions${suffix}`);
}

export async function fetchUserActivityLogs(params?: { userId?: string; from?: string; to?: string }) {
  const q = new URLSearchParams();
  if (params?.userId) q.set('userId', params.userId);
  if (params?.from) q.set('from', params.from);
  if (params?.to) q.set('to', params.to);
  const suffix = q.toString() ? `?${q}` : '';
  return api<{ logs: Array<Record<string, unknown>> }>(`/api/settings/security-audit/user-activity${suffix}`);
}

export async function fetchDataChangeLogs(tableName?: string) {
  const suffix = tableName ? `?tableName=${encodeURIComponent(tableName)}` : '';
  return api<{ logs: Array<Record<string, unknown>> }>(`/api/settings/security-audit/data-changes${suffix}`);
}

export async function fetchLoginHistory(params?: { from?: string; to?: string; eventType?: string }) {
  const q = new URLSearchParams();
  if (params?.from) q.set('from', params.from);
  if (params?.to) q.set('to', params.to);
  if (params?.eventType) q.set('eventType', params.eventType);
  const suffix = q.toString() ? `?${q}` : '';
  return api<{ logs: Array<Record<string, unknown>> }>(`/api/settings/security-audit/login-history${suffix}`);
}

export async function fetchActionHistory(category?: string) {
  const suffix = category ? `?category=${encodeURIComponent(category)}` : '';
  return api<{ logs: Array<Record<string, unknown>> }>(`/api/settings/security-audit/action-history${suffix}`);
}

export async function fetchExportLogs() {
  return api<{ logs: Array<Record<string, unknown>> }>(`/api/settings/security-audit/export-logs`);
}

export async function generateAuditReport(payload: { dateFrom: string; dateTo: string; modules?: string[] }) {
  return api<{ message: string; report: Record<string, unknown> }>(`/api/settings/security-audit/reports`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchFirewallRules() {
  return api<{ rules: Array<Record<string, unknown>> }>(`/api/settings/security-audit/firewall`);
}

export async function createFirewallRule(payload: { cidr: string; action?: string; label?: string }) {
  return api<{ message: string; rule: Record<string, unknown> }>(`/api/settings/security-audit/firewall`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function deployFirewallRule(id: string) {
  return api<{ message: string; rules: Array<Record<string, unknown>> }>(`/api/settings/security-audit/firewall/${id}/deploy`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function fetchMfaPolicy() {
  return api<{
    requireMfaForAdmins: boolean;
    requireMfaForAll: boolean;
    twoFactorEnabled: boolean;
    twoFactorMethod: string;
  }>(`/api/settings/security-audit/mfa-policy`);
}

export async function updateMfaPolicy(payload: { requireMfaForAdmins?: boolean; requireMfaForAll?: boolean }) {
  return api<{ message: string; policy: Awaited<ReturnType<typeof fetchMfaPolicy>> }>(
    `/api/settings/security-audit/mfa-policy`,
    { method: 'PUT', body: JSON.stringify(payload) },
  );
}

export async function fetchBackupSchedule() {
  return api<{
    autoBackupEnabled: boolean;
    backupFrequency: string;
    backupTime: string;
    retainBackupDays: number;
    s3BucketUri: string;
    destinationType: string;
    nextScheduledRunHint: string | null;
  }>(`/api/settings/security-audit/backup-schedule`);
}

export async function updateBackupSchedule(payload: Record<string, unknown>) {
  return api<{ message: string; schedule: Awaited<ReturnType<typeof fetchBackupSchedule>> }>(
    `/api/settings/security-audit/backup-schedule`,
    { method: 'PUT', body: JSON.stringify(payload) },
  );
}

export async function fetchBackupHistory() {
  return api<{
    backups: Array<{
      id: string;
      status: string;
      triggerType: string;
      archivePath: string;
      checksum: string;
      tablesCount: number;
      sizeBytes: number;
      startedAt: string;
      completedAt: string | null;
      triggeredBy: string;
    }>;
  }>(`/api/settings/security-audit/backups/history`);
}

export async function restoreBackupSnapshot(id: string, password: string) {
  return api<{ message: string; job: Record<string, unknown> }>(
    `/api/settings/security-audit/backups/${id}/restore`,
    { method: 'POST', body: JSON.stringify({ password }) },
  );
}

export type ForensicLog = {
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

export async function searchForensicLogs(params?: {
  userId?: string;
  userEmail?: string;
  action?: string;
  from?: string;
  to?: string;
}) {
  const q = new URLSearchParams();
  if (params?.userId) q.set('userId', params.userId);
  if (params?.userEmail) q.set('userEmail', params.userEmail);
  if (params?.action) q.set('action', params.action);
  if (params?.from) q.set('from', params.from);
  if (params?.to) q.set('to', params.to);
  const suffix = q.toString() ? `?${q}` : '';
  return api<{ logs: ForensicLog[]; total: number }>(`/api/settings/security-audit/forensics${suffix}`);
}

export async function exportForensicLogs(params?: {
  userId?: string;
  userEmail?: string;
  action?: string;
  from?: string;
  to?: string;
}) {
  const q = new URLSearchParams();
  if (params?.userId) q.set('userId', params.userId);
  if (params?.userEmail) q.set('userEmail', params.userEmail);
  if (params?.action) q.set('action', params.action);
  if (params?.from) q.set('from', params.from);
  if (params?.to) q.set('to', params.to);
  const suffix = q.toString() ? `?${q}` : '';
  return api<{ mode: 'inline' | 'background'; message: string; csv?: string; jobId?: string; rowCount?: number }>(
    `/api/settings/security-audit/forensics/export${suffix}`,
  );
}
