import { api } from './api';

export type SystemLocation = {
  id: string;
  branchCode: string;
  branchName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  latitude: number | null;
  longitude: number | null;
  timezone: string;
  isPrimary: boolean;
  isActive: boolean;
  updatedAt: string;
};

export type SettingsAuditLog = {
  id: string;
  category: string;
  action: string;
  details: string;
  userEmail: string;
  createdAt: string;
};

export async function fetchCoreSystemsOverview() {
  return api<{
    config: Record<string, unknown>;
    summary: Record<string, unknown>;
    recentAudit: SettingsAuditLog[];
  }>(`/api/settings/core-systems/overview`);
}

export async function fetchSystemLocations() {
  return api<{ locations: SystemLocation[] }>(`/api/settings/core-systems/locations`);
}

export async function saveSystemLocation(payload: Record<string, unknown>) {
  return api<{ message: string; locations: SystemLocation[] }>(`/api/settings/core-systems/locations`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function deleteSystemLocation(id: string) {
  return api<{ message: string; locations: SystemLocation[] }>(`/api/settings/core-systems/locations/${id}`, {
    method: 'DELETE',
  });
}

export async function fetchMaintenanceConfig() {
  return api<{
    maintenanceEnabled: boolean;
    maintenanceMessage: string;
    maintenanceAllowAdmins: boolean;
    maintenanceScheduledAt: string | null;
    maintenanceEndsAt: string | null;
    runtimeActive: boolean;
  }>(`/api/settings/core-systems/maintenance`);
}

export async function updateMaintenanceConfig(payload: Record<string, unknown>) {
  return api<{ message: string; config: Awaited<ReturnType<typeof fetchMaintenanceConfig>> }>(
    `/api/settings/core-systems/maintenance`,
    { method: 'PUT', body: JSON.stringify(payload) },
  );
}

export async function fetchSystemLimits() {
  return api<{
    maxConcurrentSessions: number;
    maxStorageGb: number;
    maxUploadMb: number;
    maxApiRequestsPerMinute: number;
  }>(`/api/settings/core-systems/limits`);
}

export async function updateSystemLimits(payload: Record<string, unknown>) {
  return api<{ message: string; limits: Awaited<ReturnType<typeof fetchSystemLimits>> }>(
    `/api/settings/core-systems/limits`,
    { method: 'PUT', body: JSON.stringify(payload) },
  );
}

export async function fetchCacheSettings() {
  return api<{
    cacheEnabled: boolean;
    cacheTtlSeconds: number;
    cacheInvalidationMode: string;
    cacheLastFlushedAt: string | null;
  }>(`/api/settings/core-systems/cache`);
}

export async function updateCacheSettings(payload: Record<string, unknown>) {
  return api<{ message: string; settings: Awaited<ReturnType<typeof fetchCacheSettings>> }>(
    `/api/settings/core-systems/cache`,
    { method: 'PUT', body: JSON.stringify(payload) },
  );
}

export async function fetchPerformanceSettings() {
  return api<{
    queryTimeoutMs: number;
    workerConcurrency: number;
    backgroundQueueSize: number;
    apmThresholdMs: number;
  }>(`/api/settings/core-systems/performance`);
}

export async function updatePerformanceSettings(payload: Record<string, unknown>) {
  return api<{ message: string; settings: Awaited<ReturnType<typeof fetchPerformanceSettings>> }>(
    `/api/settings/core-systems/performance`,
    { method: 'PUT', body: JSON.stringify(payload) },
  );
}

export async function fetchSystemUpdates() {
  return api<{
    currentVersion: string;
    updates: Array<{
      id: string;
      versionFrom: string;
      versionTo: string;
      updateType: string;
      status: string;
      packageName: string;
      notes: string;
      executedAt: string | null;
      executedBy: string;
      createdAt: string;
    }>;
  }>(`/api/settings/core-systems/updates`);
}

export async function executeSystemUpdate(payload: Record<string, unknown>) {
  return api<{ message: string } & Awaited<ReturnType<typeof fetchSystemUpdates>>>(
    `/api/settings/core-systems/updates/execute`,
    { method: 'POST', body: JSON.stringify(payload) },
  );
}

export async function fetchDbOptimizationRuns() {
  return api<{
    runs: Array<{
      id: string;
      status: string;
      tablesProcessed: number;
      indexesRebuilt: number;
      durationMs: number;
      details: string;
      triggeredBy: string;
      startedAt: string;
      completedAt: string | null;
    }>;
  }>(`/api/settings/core-systems/db-optimization`);
}

export async function runDbOptimization() {
  return api<{ message: string; runs: Awaited<ReturnType<typeof fetchDbOptimizationRuns>>['runs'] }>(
    `/api/settings/core-systems/db-optimization/run`,
    { method: 'POST', body: JSON.stringify({}) },
  );
}

export async function fetchSettingsAuditLog(category?: string) {
  const qs = category ? `?category=${encodeURIComponent(category)}` : '';
  return api<{ logs: SettingsAuditLog[] }>(`/api/settings/core-systems/audit-log${qs}`);
}

export type GlobalConfig = {
  companyName: string;
  timezone: string;
  currency: string;
  currencySymbol: string;
  dateFormat: string;
  language: string;
  weekStartsOn: string;
  brandingLogoUrl: string;
  updatedAt: string;
};

export async function fetchGlobalConfig() {
  return api<{ config: GlobalConfig }>(`/api/settings/core-systems/global-config`);
}

export async function updateGlobalConfig(payload: Partial<GlobalConfig>) {
  return api<{ message: string; config: GlobalConfig }>(`/api/settings/core-systems/global-config`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function syncGlobalConfigFromSetup() {
  return api<{ synced: boolean; message: string; config?: GlobalConfig }>(
    `/api/settings/core-systems/global-config/sync-from-setup`,
    { method: 'POST', body: JSON.stringify({}) },
  );
}

export async function fetchSecurityPolicyRuntime() {
  return api<{
    sessionTimeoutMinutes: number;
    ipAllowlist: string[];
    maxFailedAttempts: number;
    lockoutMinutes: number;
    maxApiRequestsPerMinute: number;
  }>(`/api/settings/core-systems/security-policy-runtime`);
}

export type DbProcess = {
  pid: number;
  user: string | null;
  application: string | null;
  clientAddr: string | null;
  state: string | null;
  query: string | null;
  queryStart: string | null;
  durationSeconds: number | null;
};

export async function fetchDbProcesses() {
  return api<{ processes: DbProcess[] }>(`/api/settings/core-systems/db/processes`);
}

export async function killDbProcess(pid: number) {
  return api<{ message: string; terminated: boolean; processes: DbProcess[] }>(
    `/api/settings/core-systems/db/processes/${pid}/kill`,
    { method: 'POST', body: JSON.stringify({}) },
  );
}

export async function fetchServerMetrics() {
  return api<{
    hostname: string;
    platform: string;
    uptimeSeconds: number;
    cpu: { cores: number; model: string; loadAverage: { m1: number; m5: number; m15: number }; usagePercent: number };
    memory: { totalBytes: number; freeBytes: number; usedBytes: number; usedPercent: number };
    process: { pid: number; workerGeneration: number; workerReloadedAt: string | null };
    cache: { entries: number; lastFlushedAt: string | null };
    collectedAt: string;
  }>(`/api/settings/core-systems/server/metrics`);
}

export async function flushSystemCache() {
  return api<{ message: string; clearedEntries: number; flushedAt: string }>(
    `/api/settings/core-systems/microservices/flush-cache`,
    { method: 'POST', body: JSON.stringify({}) },
  );
}

export async function reloadWorkers() {
  return api<{ message: string; workerGeneration: number; workerReloadedAt: string }>(
    `/api/settings/core-systems/microservices/reload-workers`,
    { method: 'POST', body: JSON.stringify({}) },
  );
}
