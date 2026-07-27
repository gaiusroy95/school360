import { api } from './api';

export type AdminDashboardOverview = {
  metrics: {
    range: string;
    generatedAt: string;
    kpis: Record<string, number | boolean>;
    sessionTrend: Array<{ status: string; count: number }>;
    recentActivities: Array<{ id: string; action: string; module: string; userEmail: string; createdAt: string }>;
    systemHealth: Array<{ name: string; status: string }>;
    cached?: boolean;
  };
  alerts: Array<{
    id: string;
    title: string;
    description: string;
    severity: string;
    category: string;
    status: string;
    createdAt: string;
  }>;
  activeSessions: Array<{
    id: string;
    userEmail: string;
    userRole: string;
    ipAddress: string;
    loginAt: string;
    lastActivityAt: string;
  }>;
};

export async function fetchAdminDashboardOverview(range = '24h') {
  return api<AdminDashboardOverview>(`/api/settings/admin-dashboard/overview?range=${encodeURIComponent(range)}`);
}

export async function acknowledgeAlert(alertId: string) {
  return api<{ alert: unknown; message: string }>(`/api/settings/admin-dashboard/alerts/${alertId}/ack`, { method: 'PUT' });
}

export async function resolveAlert(alertId: string) {
  return api<{ alert: unknown; message: string }>(`/api/settings/admin-dashboard/alerts/${alertId}/resolve`, { method: 'PUT' });
}

export function adminDashboardExportUrl(range = '24h') {
  return `/api/settings/admin-dashboard/metrics/export?range=${encodeURIComponent(range)}`;
}
