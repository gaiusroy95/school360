import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { getDefaultInstitutionId } from '../lib/institution.js';
import {
  bootstrapSecurityAudit,
  executeBackup,
  generateAuditReport,
  getSecurityAuditOverview,
  listActionHistory,
  listDataChangeLogs,
  listExportLogs,
  listLoginHistory,
  listLoginSessions,
  listUserActivityLogs,
  logExportEvent,
  purgeExpiredLoginHistory,
  syncSecurityAuditFromSetup,
} from '../lib/securityAuditCompliance.js';
import {
  createFirewallRule,
  deployFirewallRule,
  exportForensicLogs,
  getBackupSchedule,
  getForensicExportJob,
  getMfaPolicy,
  listBackupHistory,
  listFirewallRules,
  restoreBackupSnapshot,
  searchForensicLogs,
  updateBackupSchedule,
  updateMfaPolicy,
} from '../lib/securityBackupAuditE2E.js';

export const settingsSecurityAuditRouter = Router();
settingsSecurityAuditRouter.use(requireAuth);

function actor(req: { user?: { userId: string; email: string }; ip?: string; headers?: Record<string, string | string[] | undefined> }) {
  const forwarded = req.headers?.['x-forwarded-for'];
  const ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.ip;
  return {
    userId: req.user?.userId,
    userEmail: req.user?.email ?? 'unknown',
    ipAddress: ip,
  };
}

settingsSecurityAuditRouter.get(
  '/overview',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    await bootstrapSecurityAudit(institutionId);
    return res.json(await getSecurityAuditOverview(institutionId));
  }),
);

settingsSecurityAuditRouter.post(
  '/sync',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const result = await syncSecurityAuditFromSetup(institutionId, actor(req).userEmail);
    return res.json({ message: 'Security & compliance synced from Institution Setup', ...result });
  }),
);

settingsSecurityAuditRouter.post(
  '/backups/execute',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const backup = await executeBackup(institutionId, actor(req), req.body?.triggerType === 'SCHEDULED' ? 'SCHEDULED' : 'MANUAL');
    return res.status(201).json({ message: 'Backup completed and verified', backup });
  }),
);

settingsSecurityAuditRouter.get(
  '/login-sessions',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const sessions = await listLoginSessions(institutionId, {
      status: typeof req.query.status === 'string' ? req.query.status : undefined,
      suspiciousOnly: req.query.suspicious === 'true',
    });
    return res.json({ sessions });
  }),
);

settingsSecurityAuditRouter.get(
  '/user-activity',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const logs = await listUserActivityLogs(institutionId, {
      userId: typeof req.query.userId === 'string' ? req.query.userId : undefined,
      from: typeof req.query.from === 'string' ? req.query.from : undefined,
      to: typeof req.query.to === 'string' ? req.query.to : undefined,
    });
    return res.json({ logs });
  }),
);

settingsSecurityAuditRouter.get(
  '/data-changes',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const logs = await listDataChangeLogs(institutionId, {
      tableName: typeof req.query.tableName === 'string' ? req.query.tableName : undefined,
    });
    return res.json({ logs });
  }),
);

settingsSecurityAuditRouter.get(
  '/login-history',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const logs = await listLoginHistory(institutionId, {
      from: typeof req.query.from === 'string' ? req.query.from : undefined,
      to: typeof req.query.to === 'string' ? req.query.to : undefined,
      eventType: typeof req.query.eventType === 'string' ? req.query.eventType : undefined,
    });
    return res.json({ logs });
  }),
);

settingsSecurityAuditRouter.get(
  '/action-history',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const logs = await listActionHistory(institutionId, {
      category: typeof req.query.category === 'string' ? req.query.category : undefined,
    });
    return res.json({ logs });
  }),
);

settingsSecurityAuditRouter.get(
  '/export-logs',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json({ logs: await listExportLogs(institutionId) });
  }),
);

settingsSecurityAuditRouter.post(
  '/export-logs',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const act = actor(req);
    const log = await logExportEvent(institutionId, {
      userId: act.userId ?? '',
      userEmail: act.userEmail,
      exportFormat: String(req.body?.exportFormat || 'CSV'),
      fileName: String(req.body?.fileName || ''),
      module: String(req.body?.module || ''),
      rowsExported: Number(req.body?.rowsExported || 0),
      ipAddress: act.ipAddress,
    });
    return res.status(201).json({ log });
  }),
);

settingsSecurityAuditRouter.post(
  '/reports',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const report = await generateAuditReport(institutionId, actor(req), {
      dateFrom: String(req.body?.dateFrom || new Date(Date.now() - 30 * 86400000).toISOString()),
      dateTo: String(req.body?.dateTo || new Date().toISOString()),
      modules: Array.isArray(req.body?.modules) ? req.body.modules.map(String) : undefined,
      reportType: req.body?.reportType ? String(req.body.reportType) : undefined,
    });
    return res.status(201).json({ message: 'Compliance report generated', report });
  }),
);

settingsSecurityAuditRouter.post(
  '/login-history/purge',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await purgeExpiredLoginHistory(institutionId));
  }),
);

settingsSecurityAuditRouter.get(
  '/firewall',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await listFirewallRules(institutionId));
  }),
);

settingsSecurityAuditRouter.post(
  '/firewall',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.status(201).json(await createFirewallRule(institutionId, req.body, actor(req)));
  }),
);

settingsSecurityAuditRouter.post(
  '/firewall/:id/deploy',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await deployFirewallRule(institutionId, req.params.id, actor(req)));
  }),
);

settingsSecurityAuditRouter.get(
  '/mfa-policy',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await getMfaPolicy(institutionId));
  }),
);

settingsSecurityAuditRouter.put(
  '/mfa-policy',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await updateMfaPolicy(institutionId, req.body, actor(req)));
  }),
);

settingsSecurityAuditRouter.get(
  '/backup-schedule',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await getBackupSchedule(institutionId));
  }),
);

settingsSecurityAuditRouter.put(
  '/backup-schedule',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await updateBackupSchedule(institutionId, req.body, actor(req)));
  }),
);

settingsSecurityAuditRouter.get(
  '/backups/history',
  asyncHandler(async (_req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await listBackupHistory(institutionId));
  }),
);

settingsSecurityAuditRouter.post(
  '/backups/:id/restore',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const act = actor(req);
    const password = String(req.body?.password ?? '');
    return res.json(await restoreBackupSnapshot(institutionId, req.params.id, password, act));
  }),
);

settingsSecurityAuditRouter.get(
  '/forensics',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    return res.json(await searchForensicLogs(institutionId, {
      userId: typeof req.query.userId === 'string' ? req.query.userId : undefined,
      userEmail: typeof req.query.userEmail === 'string' ? req.query.userEmail : undefined,
      action: typeof req.query.action === 'string' ? req.query.action : undefined,
      from: typeof req.query.from === 'string' ? req.query.from : undefined,
      to: typeof req.query.to === 'string' ? req.query.to : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    }));
  }),
);

settingsSecurityAuditRouter.get(
  '/forensics/export',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const act = actor(req);
    const result = await exportForensicLogs(institutionId, {
      userId: req.query.userId,
      userEmail: req.query.userEmail,
      action: req.query.action,
      from: req.query.from,
      to: req.query.to,
    }, act);
    return res.json(result);
  }),
);

settingsSecurityAuditRouter.get(
  '/forensics/export-jobs/:id',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const job = await getForensicExportJob(institutionId, req.params.id);
    return res.json({
      id: job.id,
      status: job.status,
      rowCount: job.rowCount,
      downloadPath: job.downloadPath,
      expiresAt: job.expiresAt?.toISOString() ?? null,
      completedAt: job.completedAt?.toISOString() ?? null,
    });
  }),
);
