import type { UserRole } from '@prisma/client';
import { prisma } from './prisma.js';
import { getDefaultInstitutionId } from './institution.js';
import { flushAppCache } from './appCache.js';

type AuditActor = { userId?: string; userEmail?: string; role?: UserRole };

const runtimeState = new Map<string, {
  maintenanceEnabled: boolean;
  maintenanceAllowAdmins: boolean;
  cacheTtlSeconds: number;
  cacheEnabled: boolean;
  maxApiRequestsPerMinute: number;
  maxUploadMb: number;
  queryTimeoutMs: number;
  workerConcurrency: number;
  lastCacheFlushAt: string | null;
}>();

export function getRuntimeState(institutionId: string) {
  return runtimeState.get(institutionId);
}

export function isMaintenanceActive(institutionId: string, role?: UserRole) {
  const state = runtimeState.get(institutionId);
  if (!state?.maintenanceEnabled) return false;
  if (state.maintenanceAllowAdmins && (role === 'SUPER_ADMIN' || role === 'ADMIN')) {
    return false;
  }
  return true;
}

async function logAudit(
  institutionId: string,
  category: string,
  action: string,
  details: string,
  actor?: AuditActor,
) {
  await prisma.systemSettingsAuditLog.create({
    data: {
      institutionId,
      category,
      action,
      details,
      userId: actor?.userId ?? '',
      userEmail: actor?.userEmail ?? 'system',
    },
  });
}

async function ensureCoreConfig(institutionId: string) {
  let row = await prisma.systemCoreConfig.findUnique({ where: { institutionId } });
  if (!row) {
    row = await prisma.systemCoreConfig.create({ data: { institutionId } });
  }
  syncRuntimeFromConfig(institutionId, row);
  return row;
}

function syncRuntimeFromConfig(institutionId: string, config: {
  maintenanceEnabled: boolean;
  maintenanceAllowAdmins: boolean;
  cacheTtlSeconds: number;
  cacheEnabled: boolean;
  maxApiRequestsPerMinute: number;
  maxUploadMb: number;
  queryTimeoutMs: number;
  workerConcurrency: number;
  cacheLastFlushedAt: Date | null;
}) {
  runtimeState.set(institutionId, {
    maintenanceEnabled: config.maintenanceEnabled,
    maintenanceAllowAdmins: config.maintenanceAllowAdmins,
    cacheTtlSeconds: config.cacheTtlSeconds,
    cacheEnabled: config.cacheEnabled,
    maxApiRequestsPerMinute: config.maxApiRequestsPerMinute,
    maxUploadMb: config.maxUploadMb,
    queryTimeoutMs: config.queryTimeoutMs,
    workerConcurrency: config.workerConcurrency,
    lastCacheFlushAt: config.cacheLastFlushedAt?.toISOString() ?? null,
  });
}

function serializeLocation(row: {
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
  updatedAt: Date;
}) {
  return {
    id: row.id,
    branchCode: row.branchCode,
    branchName: row.branchName,
    addressLine1: row.addressLine1,
    addressLine2: row.addressLine2,
    city: row.city,
    state: row.state,
    country: row.country,
    pincode: row.pincode,
    latitude: row.latitude,
    longitude: row.longitude,
    timezone: row.timezone,
    isPrimary: row.isPrimary,
    isActive: row.isActive,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getCoreSystemsOverview(institutionId: string) {
  const [config, locationCount, updateCount, lastOptimization, recentAudit] = await Promise.all([
    ensureCoreConfig(institutionId),
    prisma.systemLocation.count({ where: { institutionId, isActive: true } }),
    prisma.systemUpdateRecord.count({ where: { institutionId } }),
    prisma.systemDbOptimizationRun.findFirst({
      where: { institutionId, status: 'COMPLETED' },
      orderBy: { completedAt: 'desc' },
    }),
    prisma.systemSettingsAuditLog.findMany({
      where: { institutionId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  return {
    config: {
      maintenanceEnabled: config.maintenanceEnabled,
      currentAppVersion: config.currentAppVersion,
      cacheEnabled: config.cacheEnabled,
      cacheTtlSeconds: config.cacheTtlSeconds,
      maxConcurrentSessions: config.maxConcurrentSessions,
      maxUploadMb: config.maxUploadMb,
      queryTimeoutMs: config.queryTimeoutMs,
      workerConcurrency: config.workerConcurrency,
    },
    summary: {
      activeLocations: locationCount,
      totalUpdates: updateCount,
      lastOptimizationAt: lastOptimization?.completedAt?.toISOString() ?? null,
      runtimeState: runtimeState.get(institutionId) ?? null,
    },
    recentAudit,
  };
}

export async function listSystemLocations(institutionId: string) {
  const rows = await prisma.systemLocation.findMany({
    where: { institutionId },
    orderBy: [{ isPrimary: 'desc' }, { branchName: 'asc' }],
  });
  return { locations: rows.map(serializeLocation) };
}

export async function upsertSystemLocation(
  institutionId: string,
  body: Record<string, unknown>,
  actor?: AuditActor,
) {
  const branchCode = String(body.branchCode ?? '').trim().toUpperCase();
  const branchName = String(body.branchName ?? '').trim();
  const addressLine1 = String(body.addressLine1 ?? '').trim();
  const city = String(body.city ?? '').trim();

  if (!branchCode || !branchName || !addressLine1 || !city) {
    throw new Error('Branch code, name, address and city are required');
  }

  const lat = body.latitude === '' || body.latitude == null ? null : Number(body.latitude);
  const lng = body.longitude === '' || body.longitude == null ? null : Number(body.longitude);
  if (lat != null && (Number.isNaN(lat) || lat < -90 || lat > 90)) throw new Error('Invalid latitude');
  if (lng != null && (Number.isNaN(lng) || lng < -180 || lng > 180)) throw new Error('Invalid longitude');

  const isPrimary = body.isPrimary === true;
  if (isPrimary) {
    await prisma.systemLocation.updateMany({
      where: { institutionId, isPrimary: true },
      data: { isPrimary: false },
    });
  }

  const data = {
    branchName,
    addressLine1,
    addressLine2: String(body.addressLine2 ?? ''),
    city,
    state: String(body.state ?? ''),
    country: String(body.country ?? 'India'),
    pincode: String(body.pincode ?? ''),
    latitude: lat,
    longitude: lng,
    timezone: String(body.timezone ?? 'Asia/Kolkata'),
    isPrimary,
    isActive: body.isActive !== false,
  };

  const id = typeof body.id === 'string' ? body.id : '';
  const location = id
    ? await prisma.systemLocation.update({ where: { id }, data })
    : await prisma.systemLocation.create({
        data: { institutionId, branchCode, ...data },
      });

  await logAudit(
    institutionId,
    'ADDRESS_LOCATION',
    id ? 'UPDATE' : 'CREATE',
    `${location.branchName} (${location.branchCode}) saved`,
    actor,
  );

  return {
    message: 'Location saved; cache refreshed',
    location: serializeLocation(location),
    locations: (await listSystemLocations(institutionId)).locations,
  };
}

export async function deleteSystemLocation(
  institutionId: string,
  id: string,
  actor?: AuditActor,
) {
  const row = await prisma.systemLocation.findFirst({ where: { id, institutionId } });
  if (!row) throw new Error('Location not found');
  await prisma.systemLocation.delete({ where: { id } });
  await logAudit(institutionId, 'ADDRESS_LOCATION', 'DELETE', `Deleted ${row.branchName}`, actor);
  return { message: 'Location deleted', locations: (await listSystemLocations(institutionId)).locations };
}

export async function getMaintenanceConfig(institutionId: string) {
  const config = await ensureCoreConfig(institutionId);
  return {
    maintenanceEnabled: config.maintenanceEnabled,
    maintenanceMessage: config.maintenanceMessage,
    maintenanceAllowAdmins: config.maintenanceAllowAdmins,
    maintenanceScheduledAt: config.maintenanceScheduledAt?.toISOString() ?? null,
    maintenanceEndsAt: config.maintenanceEndsAt?.toISOString() ?? null,
    runtimeActive: isMaintenanceActive(institutionId),
  };
}

export async function updateMaintenanceConfig(
  institutionId: string,
  body: Record<string, unknown>,
  actor?: AuditActor,
) {
  const config = await ensureCoreConfig(institutionId);
  const updated = await prisma.systemCoreConfig.update({
    where: { institutionId },
    data: {
      maintenanceEnabled: body.maintenanceEnabled === true,
      maintenanceMessage: String(body.maintenanceMessage ?? config.maintenanceMessage),
      maintenanceAllowAdmins: body.maintenanceAllowAdmins !== false,
      maintenanceScheduledAt: body.maintenanceScheduledAt
        ? new Date(String(body.maintenanceScheduledAt))
        : null,
      maintenanceEndsAt: body.maintenanceEndsAt
        ? new Date(String(body.maintenanceEndsAt))
        : null,
    },
  });

  syncRuntimeFromConfig(institutionId, updated);
  await logAudit(
    institutionId,
    'MAINTENANCE_MODE',
    updated.maintenanceEnabled ? 'ENABLED' : 'DISABLED',
    updated.maintenanceMessage,
    actor,
  );

  return {
    message: updated.maintenanceEnabled
      ? 'Maintenance mode enabled; non-admin sessions will be redirected'
      : 'Maintenance mode disabled',
    config: await getMaintenanceConfig(institutionId),
  };
}

export async function getSystemLimits(institutionId: string) {
  const config = await ensureCoreConfig(institutionId);
  return {
    maxConcurrentSessions: config.maxConcurrentSessions,
    maxStorageGb: config.maxStorageGb,
    maxUploadMb: config.maxUploadMb,
    maxApiRequestsPerMinute: config.maxApiRequestsPerMinute,
    runtime: runtimeState.get(institutionId) ?? null,
  };
}

export async function updateSystemLimits(
  institutionId: string,
  body: Record<string, unknown>,
  actor?: AuditActor,
) {
  const config = await ensureCoreConfig(institutionId);
  const updated = await prisma.systemCoreConfig.update({
    where: { institutionId },
    data: {
      maxConcurrentSessions: Math.max(1, Number(body.maxConcurrentSessions ?? config.maxConcurrentSessions)),
      maxStorageGb: Math.max(1, Number(body.maxStorageGb ?? config.maxStorageGb)),
      maxUploadMb: Math.max(1, Number(body.maxUploadMb ?? config.maxUploadMb)),
      maxApiRequestsPerMinute: Math.max(10, Number(body.maxApiRequestsPerMinute ?? config.maxApiRequestsPerMinute)),
    },
  });

  syncRuntimeFromConfig(institutionId, updated);
  await logAudit(institutionId, 'SYSTEM_LIMITS', 'UPDATE', 'System limits updated', actor);

  return {
    message: 'System limits saved; middleware thresholds reloaded',
    limits: await getSystemLimits(institutionId),
  };
}

export async function getCacheSettings(institutionId: string) {
  const config = await ensureCoreConfig(institutionId);
  return {
    cacheEnabled: config.cacheEnabled,
    cacheTtlSeconds: config.cacheTtlSeconds,
    cacheInvalidationMode: config.cacheInvalidationMode,
    cacheLastFlushedAt: config.cacheLastFlushedAt?.toISOString() ?? null,
    runtime: runtimeState.get(institutionId) ?? null,
  };
}

export async function updateCacheSettings(
  institutionId: string,
  body: Record<string, unknown>,
  actor?: AuditActor,
) {
  const config = await ensureCoreConfig(institutionId);
  const flush = body.flushCache === true;
  const updated = await prisma.systemCoreConfig.update({
    where: { institutionId },
    data: {
      cacheEnabled: body.cacheEnabled !== false,
      cacheTtlSeconds: Math.max(30, Number(body.cacheTtlSeconds ?? config.cacheTtlSeconds)),
      cacheInvalidationMode: String(body.cacheInvalidationMode ?? config.cacheInvalidationMode),
      ...(flush ? { cacheLastFlushedAt: new Date() } : {}),
    },
  });

  syncRuntimeFromConfig(institutionId, updated);
  if (flush) {
    flushAppCache();
  }
  await logAudit(
    institutionId,
    'CACHE_SETTINGS',
    flush ? 'FLUSH' : 'UPDATE',
    flush ? 'Cache flushed and TTL rules reapplied' : 'Cache settings updated',
    actor,
  );

  return {
    message: flush ? 'Cache flushed and configuration saved' : 'Cache settings saved',
    settings: await getCacheSettings(institutionId),
  };
}

export async function getPerformanceSettings(institutionId: string) {
  const config = await ensureCoreConfig(institutionId);
  return {
    queryTimeoutMs: config.queryTimeoutMs,
    workerConcurrency: config.workerConcurrency,
    backgroundQueueSize: config.backgroundQueueSize,
    apmThresholdMs: config.apmThresholdMs,
    runtime: runtimeState.get(institutionId) ?? null,
  };
}

export async function updatePerformanceSettings(
  institutionId: string,
  body: Record<string, unknown>,
  actor?: AuditActor,
) {
  const config = await ensureCoreConfig(institutionId);
  const updated = await prisma.systemCoreConfig.update({
    where: { institutionId },
    data: {
      queryTimeoutMs: Math.max(1000, Number(body.queryTimeoutMs ?? config.queryTimeoutMs)),
      workerConcurrency: Math.max(1, Number(body.workerConcurrency ?? config.workerConcurrency)),
      backgroundQueueSize: Math.max(10, Number(body.backgroundQueueSize ?? config.backgroundQueueSize)),
      apmThresholdMs: Math.max(100, Number(body.apmThresholdMs ?? config.apmThresholdMs)),
    },
  });

  syncRuntimeFromConfig(institutionId, updated);
  await logAudit(institutionId, 'PERFORMANCE_SETTINGS', 'UPDATE', 'Performance settings reloaded', actor);

  return {
    message: 'Performance settings saved; worker concurrency reloaded',
    settings: await getPerformanceSettings(institutionId),
  };
}

export async function listSystemUpdates(institutionId: string) {
  const [config, updates] = await Promise.all([
    ensureCoreConfig(institutionId),
    prisma.systemUpdateRecord.findMany({
      where: { institutionId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
  ]);

  return {
    currentVersion: config.currentAppVersion,
    updates: updates.map((u) => ({
      id: u.id,
      versionFrom: u.versionFrom,
      versionTo: u.versionTo,
      updateType: u.updateType,
      status: u.status,
      packageName: u.packageName,
      notes: u.notes,
      executedAt: u.executedAt?.toISOString() ?? null,
      executedBy: u.executedBy,
      createdAt: u.createdAt.toISOString(),
    })),
  };
}

export async function executeSystemUpdate(
  institutionId: string,
  body: Record<string, unknown>,
  actor?: AuditActor,
) {
  const config = await ensureCoreConfig(institutionId);
  const versionTo = String(body.versionTo ?? '').trim();
  const packageName = String(body.packageName ?? '').trim();
  const updateType = String(body.updateType ?? 'PATCH').toUpperCase();
  const notes = String(body.notes ?? '');

  if (!versionTo) throw new Error('Target version is required');
  if (!packageName) throw new Error('Package name is required');

  const record = await prisma.systemUpdateRecord.create({
    data: {
      institutionId,
      versionFrom: config.currentAppVersion,
      versionTo,
      updateType,
      packageName,
      notes,
      status: 'EXECUTING',
    },
  });

  await prisma.systemCoreConfig.update({
    where: { institutionId },
    data: { currentAppVersion: versionTo },
  });

  const completed = await prisma.systemUpdateRecord.update({
    where: { id: record.id },
    data: {
      status: 'COMPLETED',
      executedAt: new Date(),
      executedBy: actor?.userEmail ?? 'Admin',
    },
  });

  await logAudit(
    institutionId,
    'SYSTEM_UPDATES',
    'EXECUTE',
    `Updated ${config.currentAppVersion} → ${versionTo} (${packageName})`,
    actor,
  );

  return {
    message: `System updated to v${versionTo}`,
    update: completed,
    ...(await listSystemUpdates(institutionId)),
  };
}

export async function listDbOptimizationRuns(institutionId: string) {
  const runs = await prisma.systemDbOptimizationRun.findMany({
    where: { institutionId },
    orderBy: { startedAt: 'desc' },
    take: 30,
  });

  return {
    runs: runs.map((r) => ({
      id: r.id,
      status: r.status,
      tablesProcessed: r.tablesProcessed,
      indexesRebuilt: r.indexesRebuilt,
      durationMs: r.durationMs,
      details: r.details,
      triggeredBy: r.triggeredBy,
      startedAt: r.startedAt.toISOString(),
      completedAt: r.completedAt?.toISOString() ?? null,
    })),
  };
}

export async function runDatabaseOptimization(institutionId: string, actor?: AuditActor) {
  const { runVacuumOptimization } = await import('./systemOperationsE2E.js');
  const vacuumResult = await runVacuumOptimization(institutionId, actor);
  return {
    ...vacuumResult,
    ...(await listDbOptimizationRuns(institutionId)),
  };
}

export async function listSettingsAuditLog(institutionId: string, category?: string) {
  const logs = await prisma.systemSettingsAuditLog.findMany({
    where: { institutionId, ...(category ? { category } : {}) },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return { logs };
}

export async function bootstrapCoreSystems(institutionId?: string) {
  const id = institutionId ?? await getDefaultInstitutionId();
  await ensureCoreConfig(id);
  return getCoreSystemsOverview(id);
}
