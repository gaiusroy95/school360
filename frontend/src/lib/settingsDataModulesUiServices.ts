import { api } from './api';

export type DataModulesUiOverview = {
  stats: Record<string, number>;
  config: Record<string, unknown>;
  importLogs: Array<Record<string, unknown>>;
  exportHistory: Array<Record<string, unknown>>;
  scheduledExports: Array<Record<string, unknown>>;
  systemModules: Array<Record<string, unknown>>;
  workflowRules: Array<Record<string, unknown>>;
  featurePermissions: Array<Record<string, unknown>>;
  menuStructures: Array<Record<string, unknown>>;
  uiMenus: Array<Record<string, unknown>>;
  dashboardPreferences: Array<Record<string, unknown>>;
  themeSettings: Record<string, unknown> | null;
  colorSchemes: Array<Record<string, unknown>>;
  customCss: Array<Record<string, unknown>>;
};

export async function fetchDataModulesUiOverview() {
  return api<DataModulesUiOverview>(`/api/settings/data-modules-ui/overview`);
}

export async function syncDataModulesUi() {
  return api<{ message: string; synced?: boolean }>(`/api/settings/data-modules-ui/sync`, { method: 'POST' });
}

export async function importEmployees(rows: Array<Record<string, string>>, fileName?: string) {
  return api<{ logId: string; successCount: number; errorCount: number; errors: unknown[] }>(
    `/api/settings/data-modules-ui/import/employees`,
    { method: 'POST', body: JSON.stringify({ rows, fileName }) },
  );
}

export async function importParents(rows: Array<Record<string, string>>, fileName?: string) {
  return api<{ logId: string; successCount: number; errorCount: number; errors: unknown[] }>(
    `/api/settings/data-modules-ui/import/parents`,
    { method: 'POST', body: JSON.stringify({ rows, fileName }) },
  );
}

export async function fetchImportLogDetail(logId: string) {
  return api<Record<string, unknown>>(`/api/settings/data-modules-ui/import-history/${logId}`);
}
