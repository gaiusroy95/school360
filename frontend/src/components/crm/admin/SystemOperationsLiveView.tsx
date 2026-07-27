import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  Activity, Database, Globe, RefreshCw, Server, Shield, Trash2, Zap,
  CheckCircle2, Power,
} from 'lucide-react';
import {
  fetchDbOptimizationRuns,
  fetchDbProcesses,
  fetchGlobalConfig,
  fetchSecurityPolicyRuntime,
  fetchServerMetrics,
  flushSystemCache,
  killDbProcess,
  reloadWorkers,
  runDbOptimization,
  syncGlobalConfigFromSetup,
  updateGlobalConfig,
  type DbProcess,
  type GlobalConfig,
} from '../../../lib/settingsCoreSystemsServices';
import { CoreSystemsPage, cs, Field } from '../settings/CoreSystemsUi';

function formatBytes(bytes: number) {
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

type Tab = 'environment' | 'security' | 'database' | 'server' | 'microservices';

export function SystemOperationsLiveView({ initialTab = 'database' }: { initialTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');

  const [globalConfig, setGlobalConfig] = useState<GlobalConfig | null>(null);
  const [policy, setPolicy] = useState<Awaited<ReturnType<typeof fetchSecurityPolicyRuntime>> | null>(null);
  const [processes, setProcesses] = useState<DbProcess[]>([]);
  const [runs, setRuns] = useState<Awaited<ReturnType<typeof fetchDbOptimizationRuns>>['runs']>([]);
  const [metrics, setMetrics] = useState<Awaited<ReturnType<typeof fetchServerMetrics>> | null>(null);
  const [running, setRunning] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [globalRes, policyRes, procRes, runsRes, metricsRes] = await Promise.all([
        fetchGlobalConfig(),
        fetchSecurityPolicyRuntime(),
        fetchDbProcesses(),
        fetchDbOptimizationRuns(),
        fetchServerMetrics(),
      ]);
      setGlobalConfig(globalRes.config);
      setPolicy(policyRes);
      setProcesses(procRes.processes);
      setRuns(runsRes.runs);
      setMetrics(metricsRes);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed to load system operations');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleSaveGlobal = async () => {
    if (!globalConfig) return;
    setRunning(true);
    try {
      const res = await updateGlobalConfig(globalConfig);
      setGlobalConfig(res.config);
      setMessage(res.message);
      setMessageType('success');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Save failed');
      setMessageType('error');
    } finally {
      setRunning(false);
    }
  };

  const handleSyncSetup = async () => {
    setRunning(true);
    try {
      const res = await syncGlobalConfigFromSetup();
      if (res.config) setGlobalConfig(res.config);
      setMessage(res.message);
      setMessageType('success');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Sync failed');
      setMessageType('error');
    } finally {
      setRunning(false);
    }
  };

  const handleOptimize = async () => {
    if (!confirm('Run VACUUM ANALYZE on all public tables? This may take several minutes.')) return;
    setRunning(true);
    try {
      const res = await runDbOptimization();
      setRuns(res.runs);
      setMessage(res.message);
      setMessageType('success');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Optimization failed');
      setMessageType('error');
    } finally {
      setRunning(false);
    }
  };

  const handleKill = async (pid: number) => {
    if (!confirm(`Terminate database process ${pid}?`)) return;
    setRunning(true);
    try {
      const res = await killDbProcess(pid);
      setProcesses(res.processes);
      setMessage(res.message);
      setMessageType(res.terminated ? 'success' : 'error');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Terminate failed');
      setMessageType('error');
    } finally {
      setRunning(false);
    }
  };

  const handleFlushCache = async () => {
    setRunning(true);
    try {
      const res = await flushSystemCache();
      setMessage(res.message);
      setMessageType('success');
      void load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Cache flush failed');
      setMessageType('error');
    } finally {
      setRunning(false);
    }
  };

  const handleReloadWorkers = async () => {
    setRunning(true);
    try {
      const res = await reloadWorkers();
      setMessage(res.message);
      setMessageType('success');
      void load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Worker reload failed');
      setMessageType('error');
    } finally {
      setRunning(false);
    }
  };

  const tabs: Array<{ id: Tab; label: string; icon: ReactNode }> = [
    { id: 'environment', label: 'Global Environment', icon: <Globe size={14} /> },
    { id: 'security', label: 'Security Policy', icon: <Shield size={14} /> },
    { id: 'database', label: 'Database Manager', icon: <Database size={14} /> },
    { id: 'server', label: 'Server Monitor', icon: <Server size={14} /> },
    { id: 'microservices', label: 'Microservice Control', icon: <Zap size={14} /> },
  ];

  return (
    <CoreSystemsPage
      title="System Operations"
      objective="Global environment, security enforcement, database processes, hardware metrics, and microservice control (E2E Image 2)"
      loading={loading}
      message={message}
      messageType={messageType}
      actions={(
        <button type="button" onClick={() => void load()} disabled={running} className={`${cs.btnSecondary} flex items-center gap-1`}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      )}
    >
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg border ${
              tab === t.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'environment' && globalConfig && (
        <div className={`${cs.card} max-w-3xl space-y-3`}>
          <div className="flex gap-2 mb-2">
            <button type="button" onClick={() => void handleSyncSetup()} disabled={running} className={cs.btnSecondary}>
              Sync from Setup
            </button>
            <button type="button" onClick={() => void handleSaveGlobal()} disabled={running} className={cs.btnPrimary}>
              Save Global Config
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Company / Institution Name">
              <input className={cs.input} value={globalConfig.companyName} onChange={(e) => setGlobalConfig((c) => c && ({ ...c, companyName: e.target.value }))} />
            </Field>
            <Field label="Timezone">
              <input className={cs.input} value={globalConfig.timezone} onChange={(e) => setGlobalConfig((c) => c && ({ ...c, timezone: e.target.value }))} />
            </Field>
            <Field label="Currency">
              <input className={cs.input} value={globalConfig.currency} onChange={(e) => setGlobalConfig((c) => c && ({ ...c, currency: e.target.value }))} />
            </Field>
            <Field label="Currency Symbol">
              <input className={cs.input} value={globalConfig.currencySymbol} onChange={(e) => setGlobalConfig((c) => c && ({ ...c, currencySymbol: e.target.value }))} />
            </Field>
            <Field label="Date Format">
              <select className={cs.input} value={globalConfig.dateFormat} onChange={(e) => setGlobalConfig((c) => c && ({ ...c, dateFormat: e.target.value }))}>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </Field>
            <Field label="Language">
              <input className={cs.input} value={globalConfig.language} onChange={(e) => setGlobalConfig((c) => c && ({ ...c, language: e.target.value }))} />
            </Field>
            <Field label="Week Starts On">
              <select className={cs.input} value={globalConfig.weekStartsOn} onChange={(e) => setGlobalConfig((c) => c && ({ ...c, weekStartsOn: e.target.value }))}>
                <option value="Monday">Monday</option>
                <option value="Sunday">Sunday</option>
              </select>
            </Field>
            <Field label="Branding Logo URL">
              <input className={cs.input} value={globalConfig.brandingLogoUrl} onChange={(e) => setGlobalConfig((c) => c && ({ ...c, brandingLogoUrl: e.target.value }))} />
            </Field>
          </div>
        </div>
      )}

      {tab === 'security' && policy && (
        <div className={`${cs.card} max-w-2xl space-y-2`}>
          <p className="text-xs text-slate-600">Enforced at login and on every API request (rate limit, session timeout, IP allowlist).</p>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div><span className="text-slate-500">Session timeout</span><p className="font-bold">{policy.sessionTimeoutMinutes} min</p></div>
            <div><span className="text-slate-500">API rate limit</span><p className="font-bold">{policy.maxApiRequestsPerMinute} req/min</p></div>
            <div><span className="text-slate-500">Max failed logins</span><p className="font-bold">{policy.maxFailedAttempts}</p></div>
            <div><span className="text-slate-500">Lockout duration</span><p className="font-bold">{policy.lockoutMinutes} min</p></div>
          </div>
          <div>
            <span className="text-[10px] font-semibold text-slate-600">IP Allowlist</span>
            {policy.ipAllowlist.length === 0 ? (
              <p className="text-xs text-slate-500 mt-1">No restrictions (all IPs allowed)</p>
            ) : (
              <ul className="text-xs mt-1 list-disc pl-4 text-slate-700">
                {policy.ipAllowlist.map((ip) => <li key={ip}>{ip}</li>)}
              </ul>
            )}
          </div>
        </div>
      )}

      {tab === 'database' && (
        <div className="space-y-4">
          <div className={`${cs.card}`}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-bold text-slate-800">VACUUM ANALYZE Optimization</h3>
              <button type="button" onClick={() => void handleOptimize()} disabled={running} className={`${cs.btnPrimary} flex items-center gap-1`}>
                <Database size={14} /> {running ? 'Running…' : 'Run VACUUM ANALYZE'}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className={cs.table}>
                <thead>
                  <tr>
                    <th className={cs.th}>Status</th>
                    <th className={cs.th}>Tables</th>
                    <th className={cs.th}>Duration</th>
                    <th className={cs.th}>Details</th>
                    <th className={cs.th}>Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((r) => (
                    <tr key={r.id}>
                      <td className={cs.td}>{r.status}</td>
                      <td className={cs.td}>{r.tablesProcessed}</td>
                      <td className={cs.td}>{r.durationMs} ms</td>
                      <td className={cs.td}>{r.details}</td>
                      <td className={cs.td}>{r.completedAt ? new Date(r.completedAt).toLocaleString('en-IN') : '—'}</td>
                    </tr>
                  ))}
                  {runs.length === 0 && (
                    <tr><td colSpan={5} className={`${cs.td} text-center text-slate-400 py-4`}>No optimization runs yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className={`${cs.card} overflow-hidden`}>
            <h3 className="text-xs font-bold text-slate-800 mb-2">Active Database Processes</h3>
            <div className="overflow-x-auto">
              <table className={cs.table}>
                <thead>
                  <tr>
                    <th className={cs.th}>PID</th>
                    <th className={cs.th}>User</th>
                    <th className={cs.th}>State</th>
                    <th className={cs.th}>Duration</th>
                    <th className={cs.th}>Query</th>
                    <th className={cs.th}></th>
                  </tr>
                </thead>
                <tbody>
                  {processes.map((p) => (
                    <tr key={p.pid}>
                      <td className={cs.td}>{p.pid}</td>
                      <td className={cs.td}>{p.user ?? '—'}</td>
                      <td className={cs.td}>{p.state ?? '—'}</td>
                      <td className={cs.td}>{p.durationSeconds != null ? `${p.durationSeconds}s` : '—'}</td>
                      <td className={`${cs.td} max-w-xs truncate`} title={p.query ?? ''}>{p.query ?? '—'}</td>
                      <td className={cs.td}>
                        <button type="button" onClick={() => void handleKill(p.pid)} disabled={running} className="text-red-600 hover:text-red-800" title="Terminate">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {processes.length === 0 && (
                    <tr><td colSpan={6} className={`${cs.td} text-center text-slate-400 py-4`}>No active queries</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'server' && metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <div className={cs.card}>
            <div className="flex items-center gap-2 mb-2"><Server size={16} className="text-blue-600" /><h3 className="text-xs font-bold">Host</h3></div>
            <p className="text-xs text-slate-600">{metrics.hostname} · {metrics.platform}</p>
            <p className="text-xs text-slate-500 mt-1">Uptime: {Math.floor(metrics.uptimeSeconds / 3600)}h · Node {metrics.process?.pid ? '' : ''}</p>
          </div>
          <div className={cs.card}>
            <div className="flex items-center gap-2 mb-2"><Activity size={16} className="text-green-600" /><h3 className="text-xs font-bold">CPU</h3></div>
            <p className="text-2xl font-bold text-slate-800">{metrics.cpu.usagePercent}%</p>
            <p className="text-[10px] text-slate-500">{metrics.cpu.cores} cores · load {metrics.cpu.loadAverage.m1.toFixed(2)}</p>
          </div>
          <div className={cs.card}>
            <div className="flex items-center gap-2 mb-2"><Activity size={16} className="text-purple-600" /><h3 className="text-xs font-bold">Memory</h3></div>
            <p className="text-2xl font-bold text-slate-800">{metrics.memory.usedPercent}%</p>
            <p className="text-[10px] text-slate-500">{formatBytes(metrics.memory.usedBytes)} / {formatBytes(metrics.memory.totalBytes)}</p>
          </div>
          <div className={cs.card}>
            <p className="text-[10px] text-slate-500">Cache entries</p>
            <p className="text-lg font-bold">{metrics.cache.entries}</p>
            {metrics.cache.lastFlushedAt && (
              <p className="text-[10px] text-slate-500">Last flush: {new Date(metrics.cache.lastFlushedAt).toLocaleString('en-IN')}</p>
            )}
          </div>
          <div className={cs.card}>
            <p className="text-[10px] text-slate-500">Worker generation</p>
            <p className="text-lg font-bold">{metrics.process.workerGeneration}</p>
            {metrics.process.workerReloadedAt && (
              <p className="text-[10px] text-slate-500">Reloaded: {new Date(metrics.process.workerReloadedAt).toLocaleString('en-IN')}</p>
            )}
          </div>
          <div className={cs.card}>
            <p className="text-[10px] text-slate-500">Collected</p>
            <p className="text-xs font-medium">{new Date(metrics.collectedAt).toLocaleString('en-IN')}</p>
          </div>
        </div>
      )}

      {tab === 'microservices' && (
        <div className={`${cs.card} max-w-xl space-y-3`}>
          <p className="text-xs text-slate-600">Flush in-memory cache and reload background worker pool with current performance settings.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void handleFlushCache()} disabled={running} className={`${cs.btnPrimary} flex items-center gap-1`}>
              <RefreshCw size={14} /> Flush Cache
            </button>
            <button type="button" onClick={() => void handleReloadWorkers()} disabled={running} className={`${cs.btnSecondary} flex items-center gap-1`}>
              <Power size={14} /> Reload Workers
            </button>
          </div>
          {metrics && (
            <div className="text-[10px] text-slate-500 flex items-center gap-1">
              <CheckCircle2 size={12} className="text-green-600" />
              Worker gen {metrics.process.workerGeneration} · Cache {metrics.cache.entries} entries
            </div>
          )}
        </div>
      )}
    </CoreSystemsPage>
  );
}
