import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { getDefaultInstitutionId } from '../lib/institution.js';
import {
  acknowledgeSystemAlert,
  buildMetricsReportHtml,
  getAdminDashboardMetrics,
  getAdminDashboardOverview,
  resolveSystemAlert,
} from '../lib/adminDashboard.js';

export const settingsAdminDashboardRouter = Router();
settingsAdminDashboardRouter.use(requireAuth);

function requireAdmin(req: { user?: { role: string } }, res: { status: (n: number) => { json: (b: unknown) => void } }, next: () => void) {
  if (!req.user || (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN')) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  return next();
}

settingsAdminDashboardRouter.use(requireAdmin);

settingsAdminDashboardRouter.get(
  '/overview',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const range = typeof req.query.range === 'string' ? req.query.range : '24h';
    return res.json(await getAdminDashboardOverview(institutionId, range));
  }),
);

settingsAdminDashboardRouter.get(
  '/metrics',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const range = typeof req.query.range === 'string' ? req.query.range : '24h';
    return res.json(await getAdminDashboardMetrics(institutionId, range));
  }),
);

settingsAdminDashboardRouter.get(
  '/metrics/export',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const range = typeof req.query.range === 'string' ? req.query.range : '24h';
    const metrics = await getAdminDashboardMetrics(institutionId, range);
    const html = buildMetricsReportHtml(metrics);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="admin-dashboard-report.html"');
    return res.send(html);
  }),
);

settingsAdminDashboardRouter.get(
  '/alerts',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const overview = await getAdminDashboardOverview(institutionId);
    if (status) {
      return res.json({
        alerts: overview.alerts.filter((a) => a.status === status),
      });
    }
    return res.json({ alerts: overview.alerts });
  }),
);

settingsAdminDashboardRouter.put(
  '/alerts/:id/ack',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const alert = await acknowledgeSystemAlert(institutionId, req.params.id, req.user?.email ?? 'admin');
    return res.json({ alert, message: 'Alert acknowledged' });
  }),
);

settingsAdminDashboardRouter.put(
  '/alerts/:id/resolve',
  asyncHandler(async (req, res) => {
    const institutionId = await getDefaultInstitutionId();
    const alert = await resolveSystemAlert(institutionId, req.params.id, req.user?.email ?? 'admin');
    return res.json({ alert, message: 'Alert resolved' });
  }),
);
