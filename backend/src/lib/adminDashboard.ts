import { prisma } from './prisma.js';
import { logUserActivity } from './securityAuditCompliance.js';

const METRICS_CACHE_TTL_MS = 60_000;
const metricsCache = new Map<string, { data: unknown; cachedAt: number }>();

function parseRangeHours(range?: string): number {
  if (!range) return 24;
  const m = range.match(/^(\d+)h$/i);
  if (m) return Number(m[1]);
  if (range === '7d') return 24 * 7;
  if (range === '30d') return 24 * 30;
  return 24;
}

export async function getAdminDashboardMetrics(institutionId: string, range = '24h') {
  const cacheKey = `${institutionId}:${range}`;
  const cached = metricsCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < METRICS_CACHE_TTL_MS) {
    return { ...(cached.data as object), cached: true, cachedAt: new Date(cached.cachedAt).toISOString() };
  }

  const hours = parseRangeHours(range);
  const since = new Date(Date.now() - hours * 3600_000);

  const [
    totalUsers,
    activeSessions,
    activeModules,
    failedLogins,
    recentActivities,
    sessionTrend,
    tableCount,
    students,
    employees,
    securityPolicy,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.securityLoginSession.count({ where: { institutionId, status: 'ACTIVE' } }),
    prisma.systemModule.count({ where: { institutionId, isActive: true } }),
    prisma.securityLoginHistory.count({
      where: { institutionId, eventType: 'FAILED', createdAt: { gte: since } },
    }),
    prisma.securityUserActivityLog.findMany({
      where: { institutionId, createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.securityLoginSession.groupBy({
      by: ['status'],
      where: { institutionId, loginAt: { gte: since } },
      _count: { id: true },
    }),
    prisma.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*)::bigint AS count FROM information_schema.tables WHERE table_schema = 'public'`,
    prisma.student.count({ where: { institutionId, status: 'ACTIVE' } }),
    prisma.payrollEmployee.count({ where: { institutionId } }),
    prisma.securityPolicyConfig.findUnique({ where: { institutionId } }),
  ]);

  const dbTables = Number(tableCount[0]?.count ?? 0);
  const securityScore = Math.max(0, Math.min(100, 100 - failedLogins * 2));

  const payload = {
    range,
    generatedAt: new Date().toISOString(),
    kpis: {
      totalUsers,
      activeSessions,
      activeModules,
      failedLogins24h: failedLogins,
      activeStudents: students,
      employees,
      securityScore,
      dbTables,
      twoFactorEnabled: securityPolicy?.twoFactorEnabled ?? false,
    },
    sessionTrend: sessionTrend.map((s) => ({ status: s.status, count: s._count.id })),
    recentActivities: recentActivities.map((a) => ({
      id: a.id,
      action: a.action,
      module: a.module,
      userEmail: a.userEmail,
      createdAt: a.createdAt.toISOString(),
    })),
    systemHealth: [
      { name: 'Web Server', status: 'Healthy' },
      { name: 'Database Server', status: 'Healthy' },
      { name: 'Authentication', status: failedLogins > 20 ? 'Degraded' : 'Healthy' },
      { name: 'Session Store', status: 'Healthy' },
      { name: 'Backup Process', status: securityPolicy?.autoBackupEnabled ? 'Healthy' : 'Warning' },
    ],
    cached: false,
  };

  metricsCache.set(cacheKey, { data: payload, cachedAt: Date.now() });
  return payload;
}

export async function bootstrapSystemAlerts(institutionId: string) {
  const count = await prisma.systemAlert.count({ where: { institutionId } });
  if (count > 0) return;

  const failed = await prisma.securityLoginHistory.count({
    where: {
      institutionId,
      eventType: 'FAILED',
      createdAt: { gte: new Date(Date.now() - 86400000) },
    },
  });

  const seeds = [
    {
      title: 'System Monitoring Active',
      description: 'Admin dashboard telemetry is collecting session and activity metrics.',
      severity: 'INFO',
      category: 'SYSTEM',
      sourceModule: 'Admin Dashboard',
    },
  ];

  if (failed >= 5) {
    seeds.push({
      title: 'Elevated Failed Login Attempts',
      description: `${failed} failed login attempts in the last 24 hours.`,
      severity: 'WARNING',
      category: 'SECURITY',
      sourceModule: 'Authentication',
    });
  }

  for (const s of seeds) {
    await prisma.systemAlert.create({ data: { institutionId, ...s } });
  }
}

export async function listSystemAlerts(institutionId: string, status?: string) {
  return prisma.systemAlert.findMany({
    where: {
      institutionId,
      ...(status ? { status } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
}

export async function acknowledgeSystemAlert(
  institutionId: string,
  alertId: string,
  actorEmail: string,
) {
  const existing = await prisma.systemAlert.findFirst({ where: { id: alertId, institutionId } });
  if (!existing) throw new Error('Alert not found');
  return prisma.systemAlert.update({
    where: { id: alertId },
    data: {
      status: 'ACKNOWLEDGED',
      acknowledgedBy: actorEmail,
      acknowledgedAt: new Date(),
    },
  });
}

export async function resolveSystemAlert(
  institutionId: string,
  alertId: string,
  actorEmail: string,
) {
  const existing = await prisma.systemAlert.findFirst({ where: { id: alertId, institutionId } });
  if (!existing) throw new Error('Alert not found');
  return prisma.systemAlert.update({
    where: { id: alertId },
    data: {
      status: 'RESOLVED',
      resolvedBy: actorEmail,
      resolvedAt: new Date(),
    },
  });
}

export async function createSystemAlert(
  institutionId: string,
  data: {
    title: string;
    description?: string;
    severity?: string;
    category?: string;
    sourceModule?: string;
  },
) {
  return prisma.systemAlert.create({
    data: {
      institutionId,
      title: data.title,
      description: data.description ?? '',
      severity: data.severity ?? 'WARNING',
      category: data.category ?? 'SYSTEM',
      sourceModule: data.sourceModule ?? '',
    },
  });
}

export function buildMetricsReportHtml(metrics: Record<string, unknown>) {
  const k = (metrics.kpis ?? {}) as Record<string, unknown>;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Admin Dashboard Report</title>
<style>body{font-family:Inter,sans-serif;padding:24px;color:#1e293b}h1{font-size:20px}table{border-collapse:collapse;width:100%;margin-top:16px}td,th{border:1px solid #e2e8f0;padding:8px;text-align:left}th{background:#f8fafc}</style></head>
<body><h1>Admin Dashboard Telemetry Report</h1><p>Range: ${String(metrics.range ?? '')} · Generated: ${String(metrics.generatedAt ?? '')}</p>
<table><tr><th>Metric</th><th>Value</th></tr>
${Object.entries(k).map(([key, val]) => `<tr><td>${key}</td><td>${String(val)}</td></tr>`).join('')}
</table></body></html>`;
}

export async function getAdminDashboardOverview(institutionId: string, range = '24h') {
  await bootstrapSystemAlerts(institutionId);
  const [metrics, alerts, activeSessions] = await Promise.all([
    getAdminDashboardMetrics(institutionId, range),
    listSystemAlerts(institutionId, 'ACTIVE'),
    prisma.securityLoginSession.findMany({
      where: { institutionId, status: 'ACTIVE' },
      orderBy: { lastActivityAt: 'desc' },
      take: 25,
    }),
  ]);

  return {
    metrics,
    alerts: alerts.map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      severity: a.severity,
      category: a.category,
      status: a.status,
      createdAt: a.createdAt.toISOString(),
    })),
    activeSessions: activeSessions.map((s) => ({
      id: s.id,
      userEmail: s.userEmail,
      userRole: s.userRole,
      ipAddress: s.ipAddress,
      loginAt: s.loginAt.toISOString(),
      lastActivityAt: s.lastActivityAt.toISOString(),
    })),
  };
}
