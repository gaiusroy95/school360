import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  MapPin, Navigation, RefreshCw, Search, Play, Pause, Square, AlertTriangle,
  ShieldAlert, Gauge, Clock, Radio, Smartphone, FileText, Shield, Activity,
  Bus, CheckCircle2, Zap, Map as MapIcon, History, Settings,
} from 'lucide-react';
import {
  acknowledgeTrackingAlert, endLiveTrip, fetchTransportLiveTracking,
  pauseLiveTrip, resumeLiveTrip, startLiveTrip, triggerLiveSos,
  type TransportLiveTracking,
} from '../../../lib/transportServices';
import {
  am, AcademicLoading, AcademicModal, AcademicPageHeader, AcademicPageShell,
  FeeTabs, StatusBadge,
} from '../FeeFinanceManagement/FeeFinanceUi';

const TABS = [
  'Live Dashboard', 'Map View', 'Active Trips', 'Alerts', 'Geofencing',
  'Trip Timeline', 'Trip History', 'Reports', 'Mobile Sync', 'Audit', 'Settings',
] as const;
type TabId = (typeof TABS)[number];

type LiveTrip = {
  id: string; tripNumber: string; status: string; gpsSource: string;
  vehicleNumber: string; routeName: string; routeCode: string;
  driverName: string; attendantName: string;
  progressPct: number; completedStops: number; totalStops: number;
  currentSpeedKmh: number; avgSpeedKmh: number; direction: string;
  distanceCoveredKm: number; remainingDistanceKm: number; totalDistanceKm: number;
  etaNextStop: string; delayMinutes: number;
  fuelLevelPct: number | null; engineOn: boolean; gpsSignalHealth: string;
  studentsBoarded: number; studentsTotal: number;
  speedViolation: boolean; speedLimitKmh: number;
  mapTopPct: number; mapLeftPct: number;
  timeline: { eventType: string; stopName: string; relativeTime: string }[];
};

function Kpi({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className={`${am.card} p-3`}>
      <p className="text-[10px] font-bold text-slate-400 uppercase">{label}</p>
      <p className={`text-xl font-black mt-1 ${color ?? 'text-slate-900'}`}>{value}</p>
      {sub && <p className="text-[10px] text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function statusColor(status: string) {
  if (status === 'RUNNING') return 'bg-green-500';
  if (status === 'EMERGENCY') return 'bg-red-500 animate-pulse';
  if (status === 'PAUSED') return 'bg-amber-500';
  if (status === 'COMPLETED') return 'bg-blue-500';
  return 'bg-slate-400';
}

function severityColor(s: string) {
  if (s === 'CRITICAL') return 'border-red-300 bg-red-50';
  if (s === 'HIGH') return 'border-orange-300 bg-orange-50';
  if (s === 'MEDIUM') return 'border-amber-300 bg-amber-50';
  return 'border-slate-200 bg-slate-50';
}

export function LiveVehicleTrackingView() {
  const [data, setData] = useState<TransportLiveTracking | null>(null);
  const [tab, setTab] = useState<TabId>('Live Dashboard');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedTrip, setSelectedTrip] = useState<LiveTrip | null>(null);
  const [message, setMessage] = useState('');
  const [refreshSec, setRefreshSec] = useState(10);

  const load = useCallback(async (seed = false) => {
    try {
      const res = await fetchTransportLiveTracking(seed);
      setData(res);
      setRefreshSec(res.refreshIntervalSec);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!data?.isLive) return;
    const id = setInterval(() => { void load(false); }, refreshSec * 1000);
    return () => clearInterval(id);
  }, [data?.isLive, refreshSec, load]);

  const trips = useMemo(() => (data?.trips ?? []) as LiveTrip[], [data]);
  const q = search.toLowerCase();
  const filtered = useMemo(() => trips.filter((t) => {
    const matchQ = !q || t.vehicleNumber.toLowerCase().includes(q)
      || t.routeName.toLowerCase().includes(q) || t.driverName.toLowerCase().includes(q);
    const matchS = statusFilter === 'ALL' || t.status === statusFilter;
    return matchQ && matchS;
  }), [trips, q, statusFilter]);

  const act = async (fn: () => Promise<TransportLiveTracking>, msg: string) => {
    setBusy(true); setMessage('');
    try {
      const res = await fn();
      setData(res);
      setMessage(msg);
      if (selectedTrip) {
        const updated = (res.trips as LiveTrip[]).find((t) => t.id === selectedTrip.id);
        if (updated) setSelectedTrip(updated);
      }
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Action failed'); }
    finally { setBusy(false); }
  };

  const roleMatrix = (data?.settings as { roleMatrix?: { role: string; permissions: string }[] })?.roleMatrix ?? [];
  const mobileSync = (data?.settings as { mobileSyncRules?: Record<string, string[]> })?.mobileSyncRules ?? {};

  if (loading && !data) return <AcademicLoading />;

  const mapVehicles = data?.map.vehicles ?? [];

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="Transport Management › Live Vehicle Tracking"
        title="Live Vehicle Tracking"
        subtitle="Real-time GPS tracking — route progress, ETA, speed monitoring, geofencing, SOS & mobile app sync"
        actions={(
          <div className="flex gap-2 flex-wrap items-center">
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> LIVE
            </span>
            <select value={refreshSec} onChange={(e) => setRefreshSec(Number(e.target.value))} className={`${am.input} text-xs`}>
              {[5, 10, 15, 30].map((s) => <option key={s} value={s}>Refresh {s}s</option>)}
            </select>
            <button type="button" onClick={() => void load(true)} disabled={busy} className={am.btnSecondary}>
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>
        )}
      />

      {message && (
        <div className={`mb-3 px-3 py-2 rounded-lg text-xs font-medium ${message.includes('fail') ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
          {message}
        </div>
      )}

      <FeeTabs tabs={[...TABS]} active={tab} onChange={(t) => setTab(t as TabId)} />

      {/* ── Live Dashboard ── */}
      {tab === 'Live Dashboard' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-10 gap-2">
            <Kpi label="Active" value={data?.kpis.activeVehicles ?? 0} color="text-emerald-600" />
            <Kpi label="Running" value={data?.kpis.running ?? 0} color="text-green-600" />
            <Kpi label="Delayed" value={data?.kpis.delayed ?? 0} color="text-amber-600" />
            <Kpi label="Emergency" value={data?.kpis.emergencies ?? 0} color="text-red-600" />
            <Kpi label="Speed Alerts" value={data?.kpis.speedViolations ?? 0} color="text-orange-600" />
            <Kpi label="GPS Online" value={`${data?.kpis.gpsOnline ?? 0}/${data?.kpis.gpsTotal ?? 0}`} />
            <Kpi label="Open Alerts" value={data?.kpis.unacknowledgedAlerts ?? 0} color="text-violet-600" />
            <Kpi label="Avg Speed" value={`${data?.kpis.avgSpeed ?? 0} km/h`} />
            <Kpi label="Tracked" value={data?.kpis.totalTracked ?? 0} />
            <Kpi label="Refresh" value={`${refreshSec}s`} sub="auto-refresh" />
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            {/* Mini map */}
            <div className={`lg:col-span-2 ${am.card} p-0 overflow-hidden relative`} style={{ minHeight: 320 }}>
              <div className="absolute inset-0 bg-gradient-to-br from-sky-100 via-emerald-50 to-blue-100">
                <div className="absolute inset-0 opacity-30" style={{
                  backgroundImage: 'linear-gradient(#94a3b8 1px, transparent 1px), linear-gradient(90deg, #94a3b8 1px, transparent 1px)',
                  backgroundSize: '40px 40px',
                }} />
                {mapVehicles.map((v) => (
                  <div key={v.id} className="absolute z-10 -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
                    style={{ top: `${v.topPct}%`, left: `${v.leftPct}%` }}
                    onClick={() => { const t = trips.find((x) => x.id === v.id); if (t) setSelectedTrip(t); }}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg text-white text-[9px] font-bold ${statusColor(v.status)}`}>
                      <Bus className="w-4 h-4" />
                    </div>
                    <div className="hidden group-hover:block absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-white rounded shadow-lg px-2 py-1 text-[10px] whitespace-nowrap z-20">
                      {v.vehicleNumber} · {v.speedKmh} km/h {v.direction}
                    </div>
                  </div>
                ))}
                {(data?.map.geofences ?? []).map((g) => (
                  <div key={String(g.id)} className="absolute border-2 border-dashed border-blue-400/50 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ top: `${Number(g.topPct)}%`, left: `${Number(g.leftPct)}%`, width: 40, height: 40 }} />
                ))}
              </div>
              <div className="absolute top-2 left-2 bg-white/90 rounded px-2 py-1 text-[10px] font-bold text-slate-600 flex items-center gap-1">
                <MapIcon className="w-3 h-3" /> {data?.map.provider} · {mapVehicles.length} vehicles
              </div>
            </div>

            {/* Recent alerts */}
            <div className={`${am.card} p-4`}>
              <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" /> Live Alerts
              </h3>
              <div className="space-y-2 max-h-[280px] overflow-y-auto">
                {(data?.alerts ?? []).slice(0, 8).map((a) => (
                  <div key={String(a.id)} className={`p-2 rounded-lg border text-xs ${severityColor(String(a.severity))}`}>
                    <div className="flex justify-between">
                      <span className="font-bold">{String(a.alertType).replace(/_/g, ' ')}</span>
                      <span className="text-slate-400">{String(a.relativeTime)}</span>
                    </div>
                    <p className="text-slate-600 mt-0.5">{String(a.message)}</p>
                    {!a.acknowledged && (
                      <button type="button" disabled={busy} onClick={() => void act(() => acknowledgeTrackingAlert(String(a.id)), 'Acknowledged')}
                        className="mt-1 text-[10px] text-blue-600 font-bold">Acknowledge</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Workflow */}
          <div className={`${am.card} p-3`}>
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Tracking Workflow</p>
            <div className="flex flex-wrap gap-1">
              {(data?.workflow ?? []).map((w, i) => (
                <span key={w} className="flex items-center gap-1">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 font-semibold">{w}</span>
                  {i < (data?.workflow.length ?? 0) - 1 && <span className="text-slate-300">→</span>}
                </span>
              ))}
            </div>
          </div>

          {/* Vehicle table */}
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search vehicle, route, driver…" className={`${am.input} pl-8 text-xs w-full`} />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`${am.input} text-xs`}>
              <option value="ALL">All Statuses</option>
              {['RUNNING', 'PAUSED', 'IDLE', 'EMERGENCY', 'COMPLETED', 'OFFLINE'].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className={`${am.card} overflow-hidden`}>
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b">
                <tr>
                  {['Vehicle', 'Route', 'Driver', 'Status', 'Progress', 'Speed', 'ETA', 'Delay', 'GPS', 'Students', 'Actions'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-bold text-slate-500 uppercase text-[10px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} className="border-b hover:bg-slate-50/80 cursor-pointer" onClick={() => setSelectedTrip(t)}>
                    <td className="px-3 py-2 font-bold">{t.vehicleNumber}</td>
                    <td className="px-3 py-2">{t.routeCode} — {t.routeName}</td>
                    <td className="px-3 py-2">{t.driverName}</td>
                    <td className="px-3 py-2"><StatusBadge status={t.status} /></td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${t.progressPct}%` }} />
                        </div>
                        <span>{t.completedStops}/{t.totalStops}</span>
                      </div>
                    </td>
                    <td className={`px-3 py-2 font-bold ${t.speedViolation ? 'text-red-600' : ''}`}>
                      {Math.round(t.currentSpeedKmh)} km/h {t.speedViolation && '⚠'}
                    </td>
                    <td className="px-3 py-2">{t.etaNextStop || '—'}</td>
                    <td className={`px-3 py-2 ${t.delayMinutes > 5 ? 'text-amber-600 font-bold' : ''}`}>
                      {t.delayMinutes > 0 ? `+${t.delayMinutes}m` : 'On time'}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`text-[10px] font-bold ${t.gpsSignalHealth === 'ONLINE' ? 'text-emerald-600' : t.gpsSignalHealth === 'WEAK' ? 'text-amber-600' : 'text-red-600'}`}>
                        {t.gpsSource} · {t.gpsSignalHealth}
                      </span>
                    </td>
                    <td className="px-3 py-2">{t.studentsBoarded}/{t.studentsTotal}</td>
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        {t.status === 'IDLE' && <button type="button" title="Start" disabled={busy} onClick={() => void act(() => startLiveTrip(t.id), 'Trip started')} className="p-1 rounded hover:bg-green-50 text-green-600"><Play className="w-3.5 h-3.5" /></button>}
                        {t.status === 'RUNNING' && <button type="button" title="Pause" disabled={busy} onClick={() => void act(() => pauseLiveTrip(t.id), 'Paused')} className="p-1 rounded hover:bg-amber-50 text-amber-600"><Pause className="w-3.5 h-3.5" /></button>}
                        {t.status === 'PAUSED' && <button type="button" title="Resume" disabled={busy} onClick={() => void act(() => resumeLiveTrip(t.id), 'Resumed')} className="p-1 rounded hover:bg-green-50 text-green-600"><Play className="w-3.5 h-3.5" /></button>}
                        {['RUNNING', 'PAUSED'].includes(t.status) && <button type="button" title="End" disabled={busy} onClick={() => void act(() => endLiveTrip(t.id), 'Trip ended')} className="p-1 rounded hover:bg-slate-100 text-slate-600"><Square className="w-3.5 h-3.5" /></button>}
                        <button type="button" title="SOS" disabled={busy} onClick={() => void act(() => triggerLiveSos(t.id, 'Emergency SOS'), 'SOS sent')} className="p-1 rounded hover:bg-red-50 text-red-600"><ShieldAlert className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Map View ── */}
      {tab === 'Map View' && (
        <div className="space-y-4">
          <div className={`${am.card} p-0 overflow-hidden relative`} style={{ minHeight: 480 }}>
            <iframe title="OpenStreetMap" src={data?.map.osmTileUrl} className="w-full h-[480px] border-0" />
            <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-2">
              {mapVehicles.map((v) => (
                <button key={v.id} type="button" onClick={() => { const t = trips.find((x) => x.id === v.id); if (t) setSelectedTrip(t); }}
                  className="bg-white/95 shadow rounded-lg px-2 py-1 text-[10px] font-bold flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${statusColor(v.status)}`} />
                  {v.vehicleNumber} · {v.speedKmh} km/h {v.direction}
                </button>
              ))}
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            {(data?.geofences ?? []).map((g) => (
              <div key={String(g.id)} className={`${am.card} p-3 text-xs`}>
                <p className="font-bold">{String(g.name)}</p>
                <p className="text-slate-500">{String(g.fenceType)} · {Number(g.radiusMeters)}m radius</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Active Trips ── */}
      {tab === 'Active Trips' && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {((data?.activeTrips ?? []) as LiveTrip[]).map((t) => (
            <div key={t.id} className={`${am.card} p-4 cursor-pointer hover:shadow-md`} onClick={() => setSelectedTrip(t)}>
              <div className="flex justify-between mb-2">
                <span className="font-mono text-[10px] font-bold text-teal-600">{t.tripNumber}</span>
                <StatusBadge status={t.status} />
              </div>
              <h4 className="font-bold">{t.vehicleNumber}</h4>
              <p className="text-[10px] text-slate-500">{t.routeName} · {t.driverName}</p>
              <div className="grid grid-cols-3 gap-2 mt-3 text-[10px]">
                <div><Gauge className="w-3 h-3 inline text-blue-500" /> {Math.round(t.currentSpeedKmh)} km/h</div>
                <div><Navigation className="w-3 h-3 inline text-green-500" /> {t.direction}</div>
                <div><Clock className="w-3 h-3 inline text-amber-500" /> ETA {t.etaNextStop}</div>
              </div>
              <div className="mt-2 w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: `${t.progressPct}%` }} />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">{t.distanceCoveredKm.toFixed(1)} / {t.totalDistanceKm.toFixed(1)} km · {t.studentsBoarded}/{t.studentsTotal} students</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Alerts ── */}
      {tab === 'Alerts' && (
        <div className="space-y-2">
          {(data?.alerts ?? []).map((a) => (
            <div key={String(a.id)} className={`${am.card} p-3 flex justify-between items-start text-xs border-l-4 ${a.severity === 'CRITICAL' ? 'border-l-red-500' : a.severity === 'HIGH' ? 'border-l-orange-500' : 'border-l-amber-400'}`}>
              <div>
                <p className="font-bold">{String(a.alertType).replace(/_/g, ' ')} — {String(a.vehicleNumber)}</p>
                <p className="text-slate-600 mt-0.5">{String(a.message)}</p>
                <p className="text-slate-400 mt-1">{String(a.relativeTime)}</p>
              </div>
              {!a.acknowledged && (
                <button type="button" disabled={busy} onClick={() => void act(() => acknowledgeTrackingAlert(String(a.id)), 'Acknowledged')} className={am.btnSecondary}>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Ack
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Geofencing ── */}
      {tab === 'Geofencing' && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {(data?.geofences ?? []).map((g) => (
            <div key={String(g.id)} className={`${am.card} p-4`}>
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-blue-500" />
                <h4 className="font-bold text-sm">{String(g.name)}</h4>
              </div>
              <StatusBadge status={String(g.fenceType)} />
              <p className="text-xs text-slate-500 mt-2">Radius: {Number(g.radiusMeters)}m</p>
              <p className="text-[10px] text-slate-400 mt-1">{Number(g.latitude).toFixed(4)}, {Number(g.longitude).toFixed(4)}</p>
              <p className="text-[10px] text-emerald-600 mt-2">Entry/exit alerts enabled</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Trip Timeline ── */}
      {tab === 'Trip Timeline' && (
        <div className="space-y-4">
          {trips.filter((t) => t.status === 'RUNNING' || t.status === 'PAUSED').slice(0, 5).map((t) => (
            <div key={t.id} className={`${am.card} p-4`}>
              <h4 className="font-bold text-sm mb-3">{t.vehicleNumber} — {t.routeName}</h4>
              <div className="space-y-2">
                {(t.timeline ?? []).map((ev, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs">
                    <span className="w-20 text-slate-400 shrink-0">{ev.relativeTime}</span>
                    <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                    <span className="font-medium">{ev.eventType.replace(/_/g, ' ')}</span>
                    {ev.stopName && <span className="text-slate-500">@ {ev.stopName}</span>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Trip History ── */}
      {tab === 'Trip History' && (
        <div className={`${am.card} overflow-hidden`}>
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b">
              <tr>
                {['Trip #', 'Vehicle', 'Route', 'Status', 'Distance', 'Stops', 'Students', 'Avg Speed'].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-bold text-slate-500 uppercase text-[10px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trips.map((t) => (
                <tr key={t.id} className="border-b hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedTrip(t)}>
                  <td className="px-3 py-2 font-mono">{t.tripNumber}</td>
                  <td className="px-3 py-2 font-bold">{t.vehicleNumber}</td>
                  <td className="px-3 py-2">{t.routeName}</td>
                  <td className="px-3 py-2"><StatusBadge status={t.status} /></td>
                  <td className="px-3 py-2">{t.distanceCoveredKm.toFixed(1)} / {t.totalDistanceKm.toFixed(1)} km</td>
                  <td className="px-3 py-2">{t.completedStops}/{t.totalStops}</td>
                  <td className="px-3 py-2">{t.studentsBoarded}/{t.studentsTotal}</td>
                  <td className="px-3 py-2">{Math.round(t.avgSpeedKmh)} km/h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Reports ── */}
      {tab === 'Reports' && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {(data?.reports ?? []).map((r) => (
            <div key={r} className={`${am.card} p-3 hover:shadow-md cursor-pointer`}>
              <FileText className="w-4 h-4 text-teal-500 mb-2" />
              <p className="text-xs font-bold text-slate-700">{r}</p>
              <p className="text-[10px] text-slate-400 mt-1">Export CSV / PDF</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Mobile Sync ── */}
      {tab === 'Mobile Sync' && (
        <div className="grid md:grid-cols-2 gap-4">
          {Object.entries(mobileSync).map(([app, features]) => (
            <div key={app} className={`${am.card} p-4`}>
              <h4 className="text-sm font-bold flex items-center gap-2 mb-3">
                <Smartphone className="w-4 h-4 text-teal-500" /> {app.replace(/([A-Z])/g, ' $1').trim()}
              </h4>
              <ul className="space-y-1">
                {(features as string[]).map((f) => (
                  <li key={f} className="text-xs text-slate-600 flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />{f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className={`${am.card} p-4 md:col-span-2`}>
            <h4 className="text-sm font-bold mb-2">Notification Channels</h4>
            <div className="flex flex-wrap gap-1">
              {(data?.notificationChannels ?? []).map((c) => <StatusBadge key={c} status={c} />)}
            </div>
          </div>
        </div>
      )}

      {/* ── Audit ── */}
      {tab === 'Audit' && (
        <div className={`${am.card} overflow-hidden`}>
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b">
              <tr>
                {['Time', 'Entity', 'Action', 'Details', 'By'].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-bold text-slate-500 uppercase text-[10px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data?.auditLogs ?? []).map((l) => (
                <tr key={String(l.id)} className="border-b">
                  <td className="px-3 py-2 text-slate-400">{String(l.relativeTime)}</td>
                  <td className="px-3 py-2">{String(l.entityType)}</td>
                  <td className="px-3 py-2 font-bold">{String(l.action)}</td>
                  <td className="px-3 py-2 text-slate-600">{String(l.details)}</td>
                  <td className="px-3 py-2">{String(l.performedBy)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Settings ── */}
      {tab === 'Settings' && (
        <div className="space-y-4">
          <div className={`${am.card} p-4 grid md:grid-cols-4 gap-3`}>
            <label className="text-xs">Refresh Interval (sec)
              <select value={refreshSec} onChange={(e) => setRefreshSec(Number(e.target.value))} className={`${am.input} w-full mt-1`}>
                {[5, 10, 15, 30].map((s) => <option key={s} value={s}>{s} seconds</option>)}
              </select>
            </label>
            <label className="text-xs">Speed Limit (km/h)
              <input type="number" defaultValue={60} className={`${am.input} w-full mt-1`} />
            </label>
            <label className="text-xs">Idle Threshold (min)
              <input type="number" defaultValue={10} className={`${am.input} w-full mt-1`} />
            </label>
            <label className="text-xs">Long Halt (min)
              <input type="number" defaultValue={15} className={`${am.input} w-full mt-1`} />
            </label>
          </div>
          <div className={`${am.card} p-4`}>
            <h3 className="text-sm font-bold flex items-center gap-2 mb-3"><Shield className="w-4 h-4" /> Role-Based Access</h3>
            <table className="w-full text-xs">
              <thead><tr className="border-b"><th className="py-2 text-left">Role</th><th className="py-2 text-left">Permissions</th></tr></thead>
              <tbody>
                {roleMatrix.map((r) => (
                  <tr key={r.role} className="border-b"><td className="py-2 font-bold">{r.role}</td><td className="py-2 text-slate-600">{r.permissions}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Trip Detail Modal ── */}
      <AcademicModal open={!!selectedTrip} onClose={() => setSelectedTrip(null)} title={selectedTrip ? `${selectedTrip.vehicleNumber} — Live Trip` : ''} large>
        {selectedTrip && (
          <div className="space-y-4 text-xs max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Kpi label="Status" value={selectedTrip.status} />
              <Kpi label="Speed" value={`${Math.round(selectedTrip.currentSpeedKmh)} km/h`} color={selectedTrip.speedViolation ? 'text-red-600' : undefined} />
              <Kpi label="Direction" value={selectedTrip.direction} />
              <Kpi label="GPS" value={`${selectedTrip.gpsSource} · ${selectedTrip.gpsSignalHealth}`} />
              <Kpi label="Distance" value={`${selectedTrip.distanceCoveredKm.toFixed(1)} / ${selectedTrip.totalDistanceKm.toFixed(1)} km`} />
              <Kpi label="Remaining" value={`${selectedTrip.remainingDistanceKm.toFixed(1)} km`} />
              <Kpi label="ETA" value={selectedTrip.etaNextStop || '—'} />
              <Kpi label="Delay" value={selectedTrip.delayMinutes > 0 ? `+${selectedTrip.delayMinutes}m` : 'On time'} />
            </div>

            {selectedTrip.fuelLevelPct != null && (
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>Fuel: {selectedTrip.fuelLevelPct}% · Engine: {selectedTrip.engineOn ? 'On' : 'Off'}</span>
              </div>
            )}

            <div>
              <p className="font-bold mb-2 flex items-center gap-1"><Activity className="w-3.5 h-3.5" /> Route Progress — {selectedTrip.completedStops}/{selectedTrip.totalStops} stops</p>
              <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-500" style={{ width: `${selectedTrip.progressPct}%` }} />
              </div>
            </div>

            <div>
              <p className="font-bold mb-2 flex items-center gap-1"><History className="w-3.5 h-3.5" /> Trip Timeline</p>
              {(selectedTrip.timeline ?? []).map((ev, i) => (
                <div key={i} className="flex gap-2 py-1 border-b border-slate-100">
                  <span className="text-slate-400 w-16 shrink-0">{ev.relativeTime}</span>
                  <span>{ev.eventType.replace(/_/g, ' ')}{ev.stopName ? ` @ ${ev.stopName}` : ''}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t">
              {selectedTrip.status === 'IDLE' && <button type="button" disabled={busy} onClick={() => void act(() => startLiveTrip(selectedTrip.id), 'Started')} className={am.btnPrimary}><Play className="w-3.5 h-3.5" /> Start Trip</button>}
              {selectedTrip.status === 'RUNNING' && <button type="button" disabled={busy} onClick={() => void act(() => pauseLiveTrip(selectedTrip.id), 'Paused')} className={am.btnSecondary}><Pause className="w-3.5 h-3.5" /> Pause</button>}
              {selectedTrip.status === 'PAUSED' && <button type="button" disabled={busy} onClick={() => void act(() => resumeLiveTrip(selectedTrip.id), 'Resumed')} className={am.btnPrimary}><Play className="w-3.5 h-3.5" /> Resume</button>}
              {['RUNNING', 'PAUSED'].includes(selectedTrip.status) && <button type="button" disabled={busy} onClick={() => void act(() => endLiveTrip(selectedTrip.id), 'Ended')} className={am.btnSecondary}><Square className="w-3.5 h-3.5" /> End Trip</button>}
              <button type="button" disabled={busy} onClick={() => void act(() => triggerLiveSos(selectedTrip.id, 'Emergency SOS'), 'SOS sent')} className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"><ShieldAlert className="w-3.5 h-3.5" /> SOS</button>
            </div>
          </div>
        )}
      </AcademicModal>
    </AcademicPageShell>
  );
}
