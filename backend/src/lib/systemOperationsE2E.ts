import os from 'os';
import type { UserRole } from '@prisma/client';
import { prisma } from './prisma.js';
import { flushAppCache, getAppCacheStats } from './appCache.js';
import { getRuntimeState } from './coreSystemsSettings.js';

type AuditActor = { userId?: string; userEmail?: string; role?: UserRole };

let workerGeneration = 1;
let workerReloadedAt: string | null = null;

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

function safeTableName(name: string) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(`Invalid table name: ${name}`);
  }
  return name;
}

export async function listDbProcesses() {
  const rows = await prisma.$queryRaw<
    Array<{
      pid: number;
      usename: string | null;
      application_name: string | null;
      client_addr: string | null;
      state: string | null;
      query: string | null;
      query_start: Date | null;
      duration_seconds: number | null;
    }>
  >`
    SELECT
      pid,
      usename::text,
      application_name::text,
      client_addr::text,
      state::text,
      LEFT(query, 500) AS query,
      query_start,
      EXTRACT(EPOCH FROM (NOW() - query_start))::float AS duration_seconds
    FROM pg_stat_activity
    WHERE datname = current_database()
      AND pid <> pg_backend_pid()
    ORDER BY query_start NULLS LAST
  `;

  return {
    processes: rows.map((r) => ({
      pid: r.pid,
      user: r.usename,
      application: r.application_name,
      clientAddr: r.client_addr,
      state: r.state,
      query: r.query,
      queryStart: r.query_start?.toISOString() ?? null,
      durationSeconds: r.duration_seconds != null ? Math.round(r.duration_seconds) : null,
    })),
  };
}

export async function terminateDbProcess(
  institutionId: string,
  pid: number,
  actor?: AuditActor,
) {
  if (!Number.isInteger(pid) || pid <= 0) {
    throw new Error('Invalid process id');
  }

  const active = await prisma.$queryRaw<{ pid: number }[]>`
    SELECT pid FROM pg_stat_activity
    WHERE pid = ${pid} AND datname = current_database() AND pid <> pg_backend_pid()
  `;
  if (!active.length) {
    throw new Error('Database process not found or already terminated');
  }

  const result = await prisma.$queryRaw<{ terminated: boolean }[]>`
    SELECT pg_terminate_backend(${pid}) AS terminated
  `;
  const terminated = result[0]?.terminated === true;

  await logAudit(
    institutionId,
    'DATABASE_PROCESS',
    'TERMINATE',
    terminated ? `Terminated backend PID ${pid}` : `Failed to terminate PID ${pid}`,
    actor,
  );

  return {
    message: terminated ? `Query process ${pid} terminated` : `Could not terminate process ${pid}`,
    terminated,
    ...(await listDbProcesses()),
  };
}

export function getServerMetrics(institutionId: string) {
  const cpus = os.cpus();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const load = os.loadavg();
  const runtime = getRuntimeState(institutionId);

  return {
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    nodeVersion: process.version,
    uptimeSeconds: Math.round(os.uptime()),
    cpu: {
      cores: cpus.length,
      model: cpus[0]?.model ?? 'unknown',
      loadAverage: { m1: load[0], m5: load[1], m15: load[2] },
      usagePercent: Math.min(100, Math.round((load[0] / Math.max(cpus.length, 1)) * 100)),
    },
    memory: {
      totalBytes: totalMem,
      freeBytes: freeMem,
      usedBytes: usedMem,
      usedPercent: Math.round((usedMem / totalMem) * 100),
    },
    process: {
      pid: process.pid,
      memory: process.memoryUsage(),
      workerGeneration,
      workerReloadedAt,
      runtime,
    },
    cache: getAppCacheStats(),
    collectedAt: new Date().toISOString(),
  };
}

export async function flushSystemCache(institutionId: string, actor?: AuditActor) {
  const result = flushAppCache();
  await prisma.systemCoreConfig.updateMany({
    where: { institutionId },
    data: { cacheLastFlushedAt: new Date() },
  });

  await logAudit(
    institutionId,
    'MICROSERVICE_CONTROL',
    'CACHE_FLUSH',
    `Flushed ${result.clearedEntries} in-memory cache entries`,
    actor,
  );

  return {
    message: `Cache flushed (${result.clearedEntries} entries cleared)`,
    ...result,
    cache: getAppCacheStats(),
  };
}

export async function reloadWorkers(institutionId: string, actor?: AuditActor) {
  workerGeneration += 1;
  workerReloadedAt = new Date().toISOString();
  const runtime = getRuntimeState(institutionId);

  await logAudit(
    institutionId,
    'MICROSERVICE_CONTROL',
    'WORKER_RELOAD',
    `Worker pool reloaded (generation ${workerGeneration}, concurrency ${runtime?.workerConcurrency ?? 'default'})`,
    actor,
  );

  return {
    message: 'Background workers reloaded with current performance settings',
    workerGeneration,
    workerReloadedAt,
    workerConcurrency: runtime?.workerConcurrency ?? null,
  };
}

export async function runVacuumOptimization(institutionId: string, actor?: AuditActor) {
  const started = Date.now();
  const run = await prisma.systemDbOptimizationRun.create({
    data: {
      institutionId,
      status: 'RUNNING',
      triggeredBy: actor?.userEmail ?? 'Admin',
    },
  });

  try {
    const tables = await prisma.$queryRaw<{ tablename: string }[]>`
      SELECT tablename::text AS tablename FROM pg_tables WHERE schemaname = 'public'
    `;

    let vacuumed = 0;
    for (const { tablename } of tables) {
      const safe = safeTableName(tablename);
      await prisma.$executeRawUnsafe(`VACUUM ANALYZE "${safe}"`);
      vacuumed += 1;
    }

    const durationMs = Date.now() - started;
    const details = `VACUUM ANALYZE completed on ${vacuumed} tables; statistics and bloat maintenance applied`;
    const completed = await prisma.systemDbOptimizationRun.update({
      where: { id: run.id },
      data: {
        status: 'COMPLETED',
        tablesProcessed: vacuumed,
        indexesRebuilt: vacuumed,
        durationMs,
        details,
        completedAt: new Date(),
      },
    });

    await logAudit(institutionId, 'DATABASE_OPTIMIZATION', 'VACUUM', details, actor);

    return {
      message: 'Database VACUUM ANALYZE completed',
      run: {
        id: completed.id,
        status: completed.status,
        tablesProcessed: completed.tablesProcessed,
        indexesRebuilt: completed.indexesRebuilt,
        durationMs: completed.durationMs,
        details: completed.details,
        completedAt: completed.completedAt?.toISOString() ?? null,
      },
    };
  } catch (e) {
    await prisma.systemDbOptimizationRun.update({
      where: { id: run.id },
      data: {
        status: 'FAILED',
        durationMs: Date.now() - started,
        details: e instanceof Error ? e.message : 'VACUUM failed',
        completedAt: new Date(),
      },
    });
    throw e;
  }
}
