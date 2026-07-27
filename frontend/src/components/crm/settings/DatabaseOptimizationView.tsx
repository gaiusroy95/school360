import { useCallback, useEffect, useState } from 'react';
import { Database } from 'lucide-react';
import { fetchDbOptimizationRuns, runDbOptimization } from '../../../lib/settingsCoreSystemsServices';
import { CoreSystemsPage, cs } from './CoreSystemsUi';

export function DatabaseOptimizationView() {
  const [runs, setRuns] = useState<Awaited<ReturnType<typeof fetchDbOptimizationRuns>>['runs']>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchDbOptimizationRuns();
      setRuns(res.runs);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed to load');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleRun = async () => {
    if (!confirm('Run database optimization now? This may take a few moments.')) return;
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

  return (
    <CoreSystemsPage
      title="Database Optimization"
      objective="Execute VACUUM ANALYZE on all public tables, update statistics, and maintain query planner health."
      loading={loading}
      message={message}
      messageType={messageType}
      actions={(
        <button type="button" onClick={() => void handleRun()} disabled={running} className={`${cs.btnPrimary} flex items-center gap-1`}>
          <Database size={14} /> {running ? 'Running…' : 'Run Optimization'}
        </button>
      )}
    >
      <div className={`${cs.card} overflow-hidden`}>
        <div className="text-xs font-bold text-slate-700 mb-2">Optimization history</div>
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
                <tr><td colSpan={5} className={`${cs.td} text-center text-slate-400 py-6`}>No optimization runs yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </CoreSystemsPage>
  );
}
