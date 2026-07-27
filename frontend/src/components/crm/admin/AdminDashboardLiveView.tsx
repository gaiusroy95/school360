import { useCallback, useEffect, useState } from 'react';
import {
  Activity, Users, Package, ShieldCheck, Database, RefreshCw, Download,
  CheckCircle2, AlertTriangle, Clock,
} from 'lucide-react';
import {
  acknowledgeAlert,
  adminDashboardExportUrl,
  fetchAdminDashboardOverview,
  resolveAlert,
  type AdminDashboardOverview,
} from '../../../lib/settingsAdminDashboardServices';

export function AdminDashboardLiveView() {
  const [data, setData] = useState<AdminDashboardOverview | null>(null);
  const [range, setRange] = useState('24h');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchAdminDashboardOverview(range));
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { void load(); }, [load]);

  const kpis = data?.metrics.kpis ?? {};
  const kpiCards = [
    { title: 'Total Users', value: String(kpis.totalUsers ?? '—'), icon: <Users size={18} />, color: 'text-blue-600', bg: 'bg-blue-100' },
    { title: 'Active Sessions', value: String(kpis.activeSessions ?? '—'), icon: <Activity size={18} />, color: 'text-green-600', bg: 'bg-green-100' },
    { title: 'Active Modules', value: String(kpis.activeModules ?? '—'), icon: <Package size={18} />, color: 'text-purple-600', bg: 'bg-purple-100' },
    { title: 'Failed Logins', value: String(kpis.failedLogins24h ?? '—'), icon: <AlertTriangle size={18} />, color: 'text-orange-600', bg: 'bg-orange-100' },
    { title: 'DB Tables', value: String(kpis.dbTables ?? '—'), icon: <Database size={18} />, color: 'text-teal-600', bg: 'bg-teal-100' },
    { title: 'Security Score', value: `${kpis.securityScore ?? '—'} / 100`, icon: <ShieldCheck size={18} />, color: 'text-red-600', bg: 'bg-red-100' },
  ];

  const handleAck = async (id: string) => {
    const res = await acknowledgeAlert(id);
    setMessage(res.message);
    void load();
  };

  const handleResolve = async (id: string) => {
    const res = await resolveAlert(id);
    setMessage(res.message);
    void load();
  };

  return (
    <div className="flex flex-col space-y-4 h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Admin Dashboard</h2>
          <p className="text-xs text-slate-500 mt-0.5">Real-time telemetry, alerts, and session monitoring (E2E Image 1)</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={range} onChange={(e) => setRange(e.target.value)} className="text-xs border border-slate-200 rounded px-2 py-1.5">
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>
          <button type="button" onClick={() => void load()} className="bg-white border border-slate-200 text-slate-700 font-bold text-xs px-3 py-2 rounded flex items-center gap-1">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <a href={adminDashboardExportUrl(range)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3 py-2 rounded flex items-center gap-1">
            <Download size={14} /> Export Report
          </a>
        </div>
      </div>

      {message && (
        <div className="px-4 py-2 bg-teal-50 text-teal-800 text-sm rounded-lg border border-teal-200 flex items-center gap-2">
          <CheckCircle2 size={16} />{message}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {kpiCards.map((kpi) => (
          <div key={kpi.title} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full ${kpi.bg} ${kpi.color} flex items-center justify-center shrink-0`}>{kpi.icon}</div>
            <div className="min-w-0">
              <p className="text-[9px] text-slate-500 font-bold">{kpi.title}</p>
              <p className="text-sm font-bold text-slate-900">{kpi.value}</p>
              {data?.metrics.cached && <p className="text-[8px] text-slate-400">Cached 60s</p>}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-3">Active Alerts</h3>
          {!data?.alerts.length ? (
            <p className="text-xs text-slate-500">No active alerts.</p>
          ) : (
            <div className="space-y-2">
              {data.alerts.map((a) => (
                <div key={a.id} className="border border-slate-100 rounded-lg p-3">
                  <div className="flex justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold text-slate-800">{a.title}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{a.description}</p>
                      <p className="text-[9px] text-slate-400 mt-1">{a.severity} · {a.category}</p>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <button type="button" onClick={() => void handleAck(a.id)} className="text-[9px] px-2 py-1 bg-amber-50 text-amber-800 rounded border border-amber-200">Acknowledge</button>
                      <button type="button" onClick={() => void handleResolve(a.id)} className="text-[9px] px-2 py-1 bg-green-50 text-green-800 rounded border border-green-200">Resolve</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-3">Active Sessions (Live)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px]">
              <thead><tr className="text-slate-500 border-b"><th className="text-left py-1">User</th><th className="text-left py-1">Role</th><th className="text-left py-1">IP</th><th className="text-right py-1">Last Activity</th></tr></thead>
              <tbody>
                {(data?.activeSessions ?? []).map((s) => (
                  <tr key={s.id} className="border-b border-slate-50">
                    <td className="py-1.5">{s.userEmail}</td>
                    <td className="py-1.5">{s.userRole}</td>
                    <td className="py-1.5">{s.ipAddress || '—'}</td>
                    <td className="py-1.5 text-right">{new Date(s.lastActivityAt).toLocaleTimeString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-3">System Health</h3>
          {(data?.metrics.systemHealth ?? []).map((h) => (
            <div key={h.name} className="flex justify-between text-xs py-1 border-b border-slate-50 last:border-0">
              <span>{h.name}</span>
              <span className={h.status === 'Healthy' ? 'text-green-600 font-semibold' : 'text-amber-600 font-semibold'}>{h.status}</span>
            </div>
          ))}
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-1"><Clock size={14} /> Recent Activity</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {(data?.metrics.recentActivities ?? []).map((a) => (
              <div key={a.id} className="text-[10px] border-b border-slate-50 pb-1">
                <span className="font-semibold text-slate-800">{a.action}</span>
                <span className="text-slate-500"> · {a.userEmail} · {a.module}</span>
                <div className="text-slate-400">{new Date(a.createdAt).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
