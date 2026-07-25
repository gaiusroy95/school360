import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Search, RefreshCw, Plus, Play, Pause, Square, CheckCircle2, AlertTriangle,
  FileText, Smartphone, Shield, Calendar, Bus, MapPin, Clock, Fuel, Route,
  ShieldAlert, Star,
} from 'lucide-react';
import {
  addTripIncident, approveTrip, cancelTrip, completeTrip, fetchTransportTripManagement,
  pauseTripMgmt, resumeTripMgmt, scheduleTrip, startTrip,
  type TransportTripManagement,
} from '../../../lib/transportServices';
import {
  am, AcademicLoading, AcademicModal, AcademicPageHeader, AcademicPageShell,
  FeeTabs, StatusBadge,
} from '../FeeFinanceManagement/FeeFinanceUi';

const TABS = [
  'Dashboard', 'Schedule', 'Running Trips', 'Completed', 'Reconciliation',
  'Incidents', 'Expenses', 'Calendar', 'Reports', 'Mobile Sync', 'Audit', 'Settings',
] as const;
type TabId = (typeof TABS)[number];

type Trip = {
  id: string; tripNumber: string; busLabel: string; routeCode: string; routeName: string;
  driverName: string; vehicleNumber: string; attendantName: string;
  tripType: string; tripCategory: string; tripDirection: string; scheduleType: string;
  status: string; workflowStage: string; plannedDeparture: string; plannedArrival: string;
  stopsCompleted: number; stopsTotal: number; progressPct: number;
  studentsBoarded: number; studentsDropped: number; studentsTotal: number;
  delayMinutes: number; isDelayed: boolean; mileageKm: number; fuelConsumption: number;
  tripCost: number; totalExpense: number; tollExpense: number;
  approvalStatus: string; driverHealthDeclared: boolean; routeValidated: boolean;
  tripDate: string; rating: number | null; tripNotes: string; reconciliationNotes: string;
  stops: { stopName: string; sequenceOrder: number; plannedTime: string; status: string; studentsBoarded: number }[];
  incidents: { incidentType: string; severity: string; description: string }[];
  expenses: { expenseType: string; amount: number }[];
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

export function TripManagementView() {
  const [data, setData] = useState<TransportTripManagement | null>(null);
  const [tab, setTab] = useState<TabId>('Dashboard');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState<Trip | null>(null);
  const [showSchedule, setShowSchedule] = useState(false);
  const [schedForm, setSchedForm] = useState({
    tripCategory: 'Morning Pickup', tripType: 'MORNING', tripDirection: 'Round Trip',
    scheduleType: 'DAILY', plannedDeparture: '07:00', plannedArrival: '08:30',
    routeId: '', vehicleId: '', driverId: '',
  });

  const load = useCallback(async (seed = false) => {
    setLoading(true);
    try { setData(await fetchTransportTripManagement(seed, academicYear)); }
    finally { setLoading(false); }
  }, [academicYear]);

  useEffect(() => { void load(true); }, [load]);

  const trips = useMemo(() => (data?.trips ?? []) as Trip[], [data]);
  const q = search.toLowerCase();
  const filtered = useMemo(() => trips.filter((t) => {
    const matchQ = !q || t.tripNumber.toLowerCase().includes(q) || t.routeName.toLowerCase().includes(q)
      || t.driverName.toLowerCase().includes(q) || t.vehicleNumber.toLowerCase().includes(q);
    const matchS = statusFilter === 'ALL' || t.status === statusFilter;
    return matchQ && matchS;
  }), [trips, q, statusFilter]);

  const act = async (fn: () => Promise<TransportTripManagement>, msg: string) => {
    setBusy(true); setMessage('');
    try {
      const res = await fn();
      setData(res);
      setMessage(msg);
      if (selected) {
        const u = (res.trips as Trip[]).find((t) => t.id === selected.id);
        if (u) setSelected(u);
      }
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Action failed'); }
    finally { setBusy(false); }
  };

  const roleMatrix = (data?.settings as { roleMatrix?: { role: string; permissions: string }[] })?.roleMatrix ?? [];
  const mobileSync = (data?.settings as { mobileSyncRules?: Record<string, string[]> })?.mobileSyncRules ?? {};

  if (loading && !data) return <AcademicLoading />;

  const TripActions = ({ t }: { t: Trip }) => (
    <div className="flex gap-1">
      {t.status === 'SCHEDULED' && t.approvalStatus !== 'APPROVED' && (
        <button type="button" title="Approve" disabled={busy} onClick={() => void act(() => approveTrip(t.id), 'Approved')} className="p-1 rounded hover:bg-violet-50 text-violet-600"><CheckCircle2 className="w-3.5 h-3.5" /></button>
      )}
      {t.status === 'SCHEDULED' && t.approvalStatus === 'APPROVED' && (
        <button type="button" title="Start" disabled={busy} onClick={() => void act(() => startTrip(t.id, { healthDeclared: true, odometerStart: 10000 }), 'Started')} className="p-1 rounded hover:bg-green-50 text-green-600"><Play className="w-3.5 h-3.5" /></button>
      )}
      {t.status === 'RUNNING' && (
        <button type="button" title="Pause" disabled={busy} onClick={() => void act(() => pauseTripMgmt(t.id), 'Paused')} className="p-1 rounded hover:bg-amber-50 text-amber-600"><Pause className="w-3.5 h-3.5" /></button>
      )}
      {t.status === 'PAUSED' && (
        <button type="button" title="Resume" disabled={busy} onClick={() => void act(() => resumeTripMgmt(t.id), 'Resumed')} className="p-1 rounded hover:bg-green-50 text-green-600"><Play className="w-3.5 h-3.5" /></button>
      )}
      {['RUNNING', 'PAUSED'].includes(t.status) && (
        <button type="button" title="Complete" disabled={busy} onClick={() => void act(() => completeTrip(t.id, { odometerEnd: 10020, tollExpense: 50 }), 'Completed')} className="p-1 rounded hover:bg-blue-50 text-blue-600"><Square className="w-3.5 h-3.5" /></button>
      )}
      {t.status === 'RUNNING' && (
        <button type="button" title="SOS" disabled={busy} onClick={() => void act(() => addTripIncident(t.id, { incidentType: 'EMERGENCY', severity: 'CRITICAL', description: 'SOS triggered' }), 'SOS logged')} className="p-1 rounded hover:bg-red-50 text-red-600"><ShieldAlert className="w-3.5 h-3.5" /></button>
      )}
    </div>
  );

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="Transport Management › Trip Management"
        title="Trip Management"
        subtitle="Schedule, execute, monitor, reconcile & analyze transport trips — GPS, attendance, expenses & mobile sync"
        actions={(
          <div className="flex gap-2 flex-wrap">
            <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className={`${am.input} text-xs`}>
              {(data?.academicYears ?? ['2025-26']).map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <button type="button" onClick={() => void load(true)} disabled={busy} className={am.btnSecondary}>
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
            <button type="button" onClick={() => setShowSchedule(true)} className={am.btnPrimary}>
              <Plus className="w-3.5 h-3.5" /> Schedule Trip
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

      {tab === 'Dashboard' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
            <Kpi label="Total Trips" value={data?.kpis.totalTrips ?? 0} />
            <Kpi label="Running" value={data?.kpis.running ?? 0} color="text-emerald-600" />
            <Kpi label="Scheduled" value={data?.kpis.scheduled ?? 0} color="text-blue-600" />
            <Kpi label="Completed" value={data?.kpis.completed ?? 0} />
            <Kpi label="Delayed" value={data?.kpis.delayed ?? 0} color="text-amber-600" />
            <Kpi label="Emergency" value={data?.kpis.emergency ?? 0} color="text-red-600" />
            <Kpi label="Today" value={data?.kpis.todayTrips ?? 0} />
            <Kpi label="Avg Delay" value={`${data?.kpis.avgDelay ?? 0}m`} />
            <Kpi label="Mileage" value={`${data?.kpis.totalMileage ?? 0} km`} />
            <Kpi label="Total Cost" value={`₹${(data?.kpis.totalCost ?? 0).toLocaleString()}`} />
            <Kpi label="Students" value={data?.kpis.studentsTransported ?? 0} />
            <Kpi label="Cancelled" value={data?.kpis.cancelled ?? 0} color="text-slate-500" />
          </div>

          <div className={`${am.card} p-3`}>
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Trip Workflow</p>
            <div className="flex flex-wrap gap-1">
              {(data?.workflow ?? []).map((w, i) => (
                <span key={w} className="flex items-center gap-1">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 font-semibold">{w}</span>
                  {i < (data?.workflow.length ?? 0) - 1 && <span className="text-slate-300">→</span>}
                </span>
              ))}
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search trip, route, driver…" className={`${am.input} pl-8 text-xs w-full`} />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`${am.input} text-xs`}>
              <option value="ALL">All Statuses</option>
              {(data?.tripStatuses ?? []).map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className={`${am.card} overflow-hidden`}>
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b">
                <tr>
                  {['Trip #', 'Route', 'Vehicle', 'Driver', 'Category', 'Time', 'Progress', 'Students', 'Delay', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-bold text-slate-500 uppercase text-[10px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} className="border-b hover:bg-slate-50/80 cursor-pointer" onClick={() => setSelected(t)}>
                    <td className="px-3 py-2 font-mono font-bold">{t.tripNumber}</td>
                    <td className="px-3 py-2">{t.routeCode} — {t.routeName}</td>
                    <td className="px-3 py-2">{t.vehicleNumber}</td>
                    <td className="px-3 py-2">{t.driverName}</td>
                    <td className="px-3 py-2"><StatusBadge status={t.tripCategory} /></td>
                    <td className="px-3 py-2">{t.plannedDeparture}–{t.plannedArrival}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <div className="w-12 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-teal-500" style={{ width: `${t.progressPct}%` }} />
                        </div>
                        <span>{t.stopsCompleted}/{t.stopsTotal}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2">{t.studentsBoarded}/{t.studentsTotal}</td>
                    <td className={`px-3 py-2 ${t.isDelayed ? 'text-amber-600 font-bold' : ''}`}>
                      {t.delayMinutes > 0 ? `+${t.delayMinutes}m` : 'On time'}
                    </td>
                    <td className="px-3 py-2"><StatusBadge status={t.status} /></td>
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}><TripActions t={t} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'Schedule' && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {trips.filter((t) => t.status === 'SCHEDULED').map((t) => (
            <div key={t.id} className={`${am.card} p-4`}>
              <span className="font-mono text-[10px] text-teal-600 font-bold">{t.tripNumber}</span>
              <h4 className="font-bold mt-1">{t.routeName}</h4>
              <p className="text-[10px] text-slate-500">{t.tripCategory} · {t.tripDate} · {t.plannedDeparture}</p>
              <p className="text-xs mt-2">{t.vehicleNumber} · {t.driverName}</p>
              <div className="flex gap-2 mt-3">
                {t.approvalStatus !== 'APPROVED' && (
                  <button type="button" disabled={busy} onClick={() => void act(() => approveTrip(t.id), 'Approved')} className={am.btnPrimary}>Approve</button>
                )}
                {t.approvalStatus === 'APPROVED' && (
                  <button type="button" disabled={busy} onClick={() => void act(() => startTrip(t.id), 'Started')} className={am.btnPrimary}>Start Trip</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'Running Trips' && (
        <div className="grid md:grid-cols-2 gap-3">
          {((data?.runningTrips ?? []) as Trip[]).map((t) => (
            <div key={t.id} className={`${am.card} p-4 cursor-pointer hover:shadow-md`} onClick={() => setSelected(t)}>
              <div className="flex justify-between">
                <span className="font-mono text-[10px] text-emerald-600 font-bold">{t.tripNumber}</span>
                <StatusBadge status={t.status} />
              </div>
              <h4 className="font-bold mt-1">{t.routeName}</h4>
              <p className="text-[10px] text-slate-500">{t.vehicleNumber} · {t.driverName}</p>
              <div className="w-full h-2 bg-slate-200 rounded-full mt-3 overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: `${t.progressPct}%` }} />
              </div>
              <div className="flex gap-4 mt-2 text-[10px] text-slate-600">
                <span><MapPin className="w-3 h-3 inline" /> {t.stopsCompleted}/{t.stopsTotal} stops</span>
                <span><Clock className="w-3 h-3 inline" /> +{t.delayMinutes}m</span>
                <span>{t.studentsBoarded} boarded</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'Completed' && (
        <div className={`${am.card} overflow-hidden`}>
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b">
              <tr>{['Trip #', 'Route', 'Date', 'Mileage', 'Fuel', 'Cost', 'Students', 'Rating', 'Reconciliation'].map((h) => (
                <th key={h} className="px-3 py-2 text-left font-bold text-slate-500 uppercase text-[10px]">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {trips.filter((t) => t.status === 'COMPLETED').map((t) => (
                <tr key={t.id} className="border-b hover:bg-slate-50 cursor-pointer" onClick={() => setSelected(t)}>
                  <td className="px-3 py-2 font-mono">{t.tripNumber}</td>
                  <td className="px-3 py-2">{t.routeName}</td>
                  <td className="px-3 py-2">{t.tripDate}</td>
                  <td className="px-3 py-2">{t.mileageKm.toFixed(1)} km</td>
                  <td className="px-3 py-2">{t.fuelConsumption.toFixed(1)} L</td>
                  <td className="px-3 py-2">₹{Math.round(t.tripCost + t.totalExpense)}</td>
                  <td className="px-3 py-2">{t.studentsDropped}/{t.studentsTotal}</td>
                  <td className="px-3 py-2">{t.rating ? <><Star className="w-3 h-3 inline text-amber-400" /> {t.rating.toFixed(1)}</> : '—'}</td>
                  <td className="px-3 py-2 text-emerald-600 text-[10px]">{t.reconciliationNotes ? '✓ Reconciled' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'Reconciliation' && (
        <div className="space-y-3">
          {trips.filter((t) => t.status === 'COMPLETED').map((t) => (
            <div key={t.id} className={`${am.card} p-4 text-xs`}>
              <div className="flex justify-between mb-2">
                <h4 className="font-bold">{t.tripNumber} — {t.routeName}</h4>
                <StatusBadge status="COMPLETED" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div><p className="text-slate-400">Planned</p><p>{t.plannedDeparture}–{t.plannedArrival}</p></div>
                <div><p className="text-slate-400">Mileage</p><p>{t.mileageKm.toFixed(1)} km</p></div>
                <div><p className="text-slate-400">Fuel</p><p>{t.fuelConsumption.toFixed(1)} L</p></div>
                <div><p className="text-slate-400">Total Cost</p><p className="font-bold">₹{Math.round(t.tripCost + t.totalExpense)}</p></div>
              </div>
              <p className="text-emerald-600 mt-2">{t.reconciliationNotes}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'Incidents' && (
        <div className="space-y-2">
          {trips.filter((t) => t.incidents.length > 0).map((t) => (
            t.incidents.map((inc, i) => (
              <div key={`${t.id}-${i}`} className={`${am.card} p-4 border-l-4 ${inc.severity === 'CRITICAL' || inc.severity === 'HIGH' ? 'border-l-red-400' : 'border-l-amber-400'} text-xs`}>
                <p className="font-bold">{t.tripNumber} — {inc.incidentType.replace(/_/g, ' ')}</p>
                <p className="text-slate-600 mt-1">{inc.description}</p>
                <p className="text-slate-400 mt-1">{t.routeName} · Severity: {inc.severity}</p>
              </div>
            ))
          ))}
        </div>
      )}

      {tab === 'Expenses' && (
        <div className="space-y-2">
          {trips.filter((t) => t.expenses.length > 0).map((t) => (
            <div key={t.id} className={`${am.card} p-3 text-xs`}>
              <p className="font-bold">{t.tripNumber} — {t.routeName}</p>
              <div className="flex gap-4 mt-2">
                {t.expenses.map((e, i) => (
                  <span key={i}>{e.expenseType}: ₹{e.amount.toFixed(0)}</span>
                ))}
                <span className="font-bold">Total: ₹{t.totalExpense.toFixed(0)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'Calendar' && (
        <div className={`${am.card} p-4`}>
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2"><Calendar className="w-4 h-4" /> Today&apos;s Trips</h3>
          <div className="space-y-2">
            {((data?.todayTrips ?? []) as Trip[]).map((t) => (
              <div key={t.id} className="flex items-center gap-3 p-2 bg-slate-50 rounded text-xs">
                <span className="font-mono font-bold w-24">{t.plannedDeparture}</span>
                <span className="font-medium flex-1">{t.routeName}</span>
                <span className="text-slate-500">{t.vehicleNumber}</span>
                <StatusBadge status={t.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'Reports' && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {(data?.reports ?? []).map((r) => (
            <div key={r} className={`${am.card} p-3 hover:shadow-md cursor-pointer`}>
              <FileText className="w-4 h-4 text-teal-500 mb-2" />
              <p className="text-xs font-bold text-slate-700">{r}</p>
            </div>
          ))}
        </div>
      )}

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
        </div>
      )}

      {tab === 'Audit' && (
        <div className={`${am.card} overflow-hidden`}>
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b">
              <tr>{['Time', 'Entity', 'Action', 'Details', 'By'].map((h) => (
                <th key={h} className="px-3 py-2 text-left font-bold text-slate-500 uppercase text-[10px]">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {(data?.auditLogs ?? []).map((l) => (
                <tr key={String(l.id)} className="border-b">
                  <td className="px-3 py-2 text-slate-400">{String(l.relativeTime)}</td>
                  <td className="px-3 py-2">{String(l.entityType)}</td>
                  <td className="px-3 py-2 font-bold">{String(l.action)}</td>
                  <td className="px-3 py-2">{String(l.details)}</td>
                  <td className="px-3 py-2">{String(l.performedBy)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'Settings' && (
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
      )}

      <AcademicModal open={!!selected} onClose={() => setSelected(null)} title={selected ? `${selected.tripNumber} — ${selected.routeName}` : ''} large>
        {selected && (
          <div className="space-y-4 text-xs max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Kpi label="Status" value={selected.status} />
              <Kpi label="Progress" value={`${selected.progressPct}%`} />
              <Kpi label="Delay" value={selected.delayMinutes > 0 ? `+${selected.delayMinutes}m` : 'On time'} />
              <Kpi label="Students" value={`${selected.studentsBoarded}/${selected.studentsTotal}`} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div><p className="text-slate-400">Vehicle</p><p className="font-bold">{selected.vehicleNumber}</p></div>
              <div><p className="text-slate-400">Driver</p><p className="font-bold">{selected.driverName}</p></div>
              <div><p className="text-slate-400">Category</p><p className="font-bold">{selected.tripCategory}</p></div>
            </div>
            {selected.stops.length > 0 && (
              <div>
                <p className="font-bold mb-2 flex items-center gap-1"><Route className="w-3.5 h-3.5" /> Stops</p>
                {selected.stops.map((s) => (
                  <div key={s.sequenceOrder} className="flex justify-between py-1 border-b border-slate-100">
                    <span>{s.sequenceOrder}. {s.stopName}</span>
                    <span>{s.plannedTime} · <StatusBadge status={s.status} /> · {s.studentsBoarded} students</span>
                  </div>
                ))}
              </div>
            )}
            {selected.mileageKm > 0 && (
              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded">
                <div><Fuel className="w-3 h-3 inline text-amber-500" /> {selected.fuelConsumption.toFixed(1)} L</div>
                <div><Bus className="w-3 h-3 inline" /> {selected.mileageKm.toFixed(1)} km</div>
                <div>₹{Math.round(selected.tripCost + selected.totalExpense)}</div>
              </div>
            )}
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              <TripActions t={selected} />
              {!['COMPLETED', 'CANCELLED'].includes(selected.status) && (
                <button type="button" disabled={busy} onClick={() => void act(() => cancelTrip(selected.id, 'Cancelled by manager'), 'Cancelled')} className={am.btnSecondary}>Cancel</button>
              )}
            </div>
          </div>
        )}
      </AcademicModal>

      <AcademicModal open={showSchedule} onClose={() => setShowSchedule(false)} title="Schedule New Trip">
        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <label className="block">Category<select value={schedForm.tripCategory} onChange={(e) => setSchedForm({ ...schedForm, tripCategory: e.target.value })} className={`${am.input} w-full mt-1`}>{(data?.tripCategories ?? []).map((c) => <option key={c}>{c}</option>)}</select></label>
            <label className="block">Schedule<select value={schedForm.scheduleType} onChange={(e) => setSchedForm({ ...schedForm, scheduleType: e.target.value })} className={`${am.input} w-full mt-1`}>{(data?.scheduleTypes ?? []).map((s) => <option key={s}>{s}</option>)}</select></label>
          </div>
          <label className="block">Route<select value={schedForm.routeId} onChange={(e) => setSchedForm({ ...schedForm, routeId: e.target.value })} className={`${am.input} w-full mt-1`}>
            <option value="">Select route…</option>
            {(data?.routes ?? []).map((r) => <option key={String(r.id)} value={String(r.id)}>{String(r.routeCode)} — {String(r.routeName)}</option>)}
          </select></label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">Vehicle<select value={schedForm.vehicleId} onChange={(e) => setSchedForm({ ...schedForm, vehicleId: e.target.value })} className={`${am.input} w-full mt-1`}>
              <option value="">Select…</option>
              {(data?.vehicles ?? []).map((v) => <option key={String(v.id)} value={String(v.id)}>{String(v.vehicleNumber)}</option>)}
            </select></label>
            <label className="block">Driver<select value={schedForm.driverId} onChange={(e) => setSchedForm({ ...schedForm, driverId: e.target.value })} className={`${am.input} w-full mt-1`}>
              <option value="">Select…</option>
              {(data?.drivers ?? []).filter((d) => String(d.role).toLowerCase().includes('driver')).map((d) => (
                <option key={String(d.id)} value={String(d.id)}>{String(d.name)}</option>
              ))}
            </select></label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">Departure<input type="time" value={schedForm.plannedDeparture} onChange={(e) => setSchedForm({ ...schedForm, plannedDeparture: e.target.value })} className={`${am.input} w-full mt-1`} /></label>
            <label className="block">Arrival<input type="time" value={schedForm.plannedArrival} onChange={(e) => setSchedForm({ ...schedForm, plannedArrival: e.target.value })} className={`${am.input} w-full mt-1`} /></label>
          </div>
          <button type="button" disabled={busy || !schedForm.routeId} onClick={() => void act(async () => {
            await scheduleTrip({ ...schedForm, academicYear, tripDate: new Date().toISOString().slice(0, 10) });
            setShowSchedule(false);
            return fetchTransportTripManagement(false, academicYear);
          }, 'Trip scheduled')} className={`${am.btnPrimary} w-full`}>Schedule Trip</button>
        </div>
      </AcademicModal>
    </AcademicPageShell>
  );
}
