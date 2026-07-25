import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RefreshCw, Fuel, AlertTriangle, Map, Activity, FileText, Calendar, Download, Building2, Zap, Bus,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend,
} from 'recharts';
import {
  fetchTransportReportsAnalytics, formatInr, scheduleTransportReport,
  type TransportReportsAnalytics,
} from '../../../lib/transportServices';
import {
  am, AcademicLoading, AcademicModal, AcademicPageHeader, AcademicPageShell,
  FeeTabs, StatusBadge,
} from '../FeeFinanceManagement/FeeFinanceUi';

const TABS = [
  'Command Centre', 'Executive', 'Fleet & Operations', 'Student Safety', 'Driver KPIs',
  'Fuel & Expenses', 'Revenue & Fees', 'Safety Analytics', 'Predictive AI',
  'Heat Map', 'Digital Twin', 'Reports', 'Scheduler', 'Audit', 'Settings',
] as const;
type TabId = (typeof TABS)[number];

function Kpi({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className={`${am.card} p-3`}>
      <p className="text-[10px] font-bold text-slate-400 uppercase">{label}</p>
      <p className={`text-xl font-black mt-1 ${color ?? 'text-slate-900'}`}>{value}</p>
      {sub && <p className="text-[10px] text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

export function TransportReportsAnalyticsView() {
  const [data, setData] = useState<TransportReportsAnalytics | null>(null);
  const [tab, setTab] = useState<TabId>('Command Centre');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [message, setMessage] = useState('');
  const [showSchedule, setShowSchedule] = useState(false);
  const [schedForm, setSchedForm] = useState({ reportName: '', frequency: 'DAILY', channel: 'EMAIL', recipients: '' });

  const load = useCallback(async (seed = false) => {
    setLoading(true);
    try { setData(await fetchTransportReportsAnalytics(seed, academicYear)); }
    finally { setLoading(false); }
  }, [academicYear]);

  useEffect(() => { void load(); }, [load]);

  const exec = data?.kpis.executive ?? {};
  const ops = data?.kpis.operational ?? {};
  const fin = data?.kpis.financial ?? {};
  const safety = data?.kpis.safety ?? {};
  const mgmt = data?.kpis.management ?? {};

  const fuelTrend = useMemo(() => {
    const trend = (data?.dashboards?.fuel as { trend?: { month: string; fuel: number; revenue: number }[] })?.trend ?? [];
    return trend;
  }, [data]);

  const act = async (fn: () => Promise<TransportReportsAnalytics>, msg: string) => {
    setBusy(true); setMessage('');
    try { setData(await fn()); setMessage(msg); }
    catch (e) { setMessage(e instanceof Error ? e.message : 'Failed'); }
    finally { setBusy(false); }
  };

  const roleMatrix = (data?.settings as { roleMatrix?: { role: string; permissions: string }[] })?.roleMatrix ?? [];
  const mobileSync = (data?.settings as { mobileSyncRules?: Record<string, string[]> })?.mobileSyncRules ?? {};

  if (loading && !data) return <AcademicLoading />;

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="Transport Management › Reports & Analytics"
        title="Transport Analytics & MIS Dashboard"
        subtitle="Enterprise command centre — consolidated KPIs, predictive analytics, BI dashboards & executive MIS"
        actions={(
          <div className="flex gap-2 flex-wrap">
            <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className={`${am.input} text-xs`}>
              <option value="2025-26">2025-26</option>
              <option value="2024-25">2024-25</option>
            </select>
            <button type="button" onClick={() => void load()} disabled={busy} className={am.btnSecondary}>
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
            <button type="button" onClick={() => setShowSchedule(true)} className={am.btnPrimary}>
              <Calendar className="w-3.5 h-3.5" /> Schedule Report
            </button>
          </div>
        )}
      />

      {message && (
        <div className={`mb-3 p-2 rounded-lg text-xs font-medium ${message.includes('fail') ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
          {message}
        </div>
      )}

      <div className={`${am.card} p-2 mb-3 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-slate-700">Overall Transport Performance Index</span>
        </div>
        <span className="text-2xl font-black text-teal-600">{mgmt.overallTransportPerformanceIndex ?? 0}%</span>
      </div>

      <FeeTabs tabs={[...TABS]} active={tab} onChange={(t) => setTab(t as TabId)} />

      {tab === 'Command Centre' && (
        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
            <Kpi label="Running" value={data?.commandCentre.stats.running ?? 0} color="text-emerald-600" />
            <Kpi label="Delayed" value={data?.commandCentre.stats.delayed ?? 0} color="text-amber-600" />
            <Kpi label="Emergencies" value={data?.commandCentre.stats.emergencies ?? 0} color="text-red-600" />
            <Kpi label="GPS Online" value={data?.commandCentre.stats.gpsOnline ?? 0} color="text-blue-600" />
            <Kpi label="Fleet" value={exec.totalVehicles ?? 0} />
            <Kpi label="Students" value={exec.totalStudents ?? 0} />
            <Kpi label="Revenue" value={formatInr(exec.revenue ?? 0)} />
            <Kpi label="Alerts" value={exec.safetyAlerts ?? 0} color="text-red-600" />
          </div>

          <div className="grid lg:grid-cols-3 gap-3">
            <div className={`${am.card} lg:col-span-2 relative h-72 bg-slate-900 overflow-hidden`}>
              <p className="absolute top-2 left-2 text-[10px] font-bold text-slate-400 uppercase z-10 flex items-center gap-1">
                <Map className="w-3 h-3" /> Live Transport Wall — Command Centre
              </p>
              <div className="absolute inset-0 opacity-20"
                style={{ backgroundImage: 'linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
              {(data?.commandCentre.liveVehicles ?? []).map((v) => {
                const row = v as Record<string, unknown>;
                return (
                  <div key={String(row.tripNumber)} className="absolute z-10 transform -translate-x-1/2 -translate-y-1/2"
                    style={{ top: `${row.topPct}%`, left: `${row.leftPct}%` }}>
                    <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/50">
                      <Bus className="w-3.5 h-3.5 text-white" />
                    </div>
                    <p className="text-[8px] text-emerald-300 text-center font-bold">{String(row.vehicleNumber)}</p>
                  </div>
                );
              })}
            </div>
            <div className={`${am.card} p-3 max-h-72 overflow-y-auto`}>
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-red-500" /> Live Alerts Panel
              </p>
              {(data?.commandCentre.alerts ?? []).map((a) => {
                const row = a as Record<string, unknown>;
                return (
                  <div key={String(row.id)} className="border-b border-slate-50 py-1.5 text-xs">
                    <div className="flex justify-between">
                      <StatusBadge status={String(row.type)} />
                      <span className="text-slate-400">{String(row.relativeTime)}</span>
                    </div>
                    <p className="text-slate-600 mt-0.5 truncate">{String(row.message)}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className={`${am.card} p-3`}>
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Notification Center</p>
            <div className="grid md:grid-cols-2 gap-2">
              {(data?.commandCentre.notifications ?? []).map((n, i) => {
                const row = n as Record<string, unknown>;
                return (
                  <div key={i} className="flex gap-2 text-xs p-2 rounded bg-slate-50">
                    <StatusBadge status={String(row.type)} />
                    <div><p className="font-semibold">{String(row.title)}</p><p className="text-slate-500">{String(row.message)}</p></div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {tab === 'Executive' && (
        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
            <Kpi label="Total Vehicles" value={exec.totalVehicles ?? 0} />
            <Kpi label="Active" value={exec.activeVehicles ?? 0} color="text-emerald-600" />
            <Kpi label="Maintenance" value={exec.maintenanceVehicles ?? 0} color="text-amber-600" />
            <Kpi label="Live Trips" value={exec.runningTrips ?? 0} color="text-blue-600" />
            <Kpi label="Students" value={exec.totalStudents ?? 0} />
            <Kpi label="Drivers" value={exec.totalDrivers ?? 0} />
            <Kpi label="Fleet Health" value={`${exec.fleetHealth ?? 0}%`} color="text-teal-600" />
            <Kpi label="Revenue" value={formatInr(exec.revenue ?? 0)} />
            <Kpi label="Outstanding" value={formatInr(exec.outstanding ?? 0)} color="text-red-600" />
            <Kpi label="Safety Alerts" value={exec.safetyAlerts ?? 0} color="text-orange-600" />
            <Kpi label="Emergency" value={exec.emergencyAlerts ?? 0} color="text-red-700" />
            <Kpi label="Performance Index" value={`${exec.overallPerformanceIndex ?? 0}%`} color="text-violet-600" />
          </div>

          <div className={`${am.card} p-3`}>
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Analytics Workflow</p>
            <div className="flex flex-wrap gap-1">
              {(data?.workflow ?? []).map((w, i) => (
                <span key={w} className="flex items-center gap-1">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 font-semibold">{w}</span>
                  {i < (data?.workflow?.length ?? 0) - 1 && <span className="text-slate-300">→</span>}
                </span>
              ))}
            </div>
          </div>

          <div className={`${am.card} p-3`}>
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-3 flex items-center gap-1">
              <Building2 className="w-3 h-3" /> Multi-Branch Comparison
            </p>
            <table className="w-full text-xs">
              <thead><tr className="border-b text-left text-[10px] text-slate-400 uppercase">
                <th className="p-2">Branch</th><th className="p-2">Vehicles</th><th className="p-2">Students</th>
                <th className="p-2">Revenue</th><th className="p-2">Utilization</th>
              </tr></thead>
              <tbody>
                {(data?.branchComparison ?? []).map((b) => {
                  const row = b as Record<string, unknown>;
                  return (
                    <tr key={String(row.branch)} className="border-b border-slate-50">
                      <td className="p-2 font-bold">{String(row.branch)}</td>
                      <td className="p-2">{String(row.vehicles)}</td>
                      <td className="p-2">{String(row.students)}</td>
                      <td className="p-2">{formatInr(Number(row.revenue))}</td>
                      <td className="p-2 font-semibold text-teal-600">{String(row.utilization)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(tab === 'Fleet & Operations' || tab === 'Driver KPIs') && (
        <div className="space-y-4 mt-4">
          {tab === 'Fleet & Operations' && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Kpi label="Fleet Utilization" value={`${ops.fleetUtilization ?? 0}%`} color="text-teal-600" />
              <Kpi label="On-Time %" value={`${ops.onTimeArrivalPct ?? 0}%`} />
              <Kpi label="Trip Success" value={`${ops.tripSuccessRate ?? 0}%`} />
              <Kpi label="GPS Availability" value={`${ops.gpsAvailabilityPct ?? 0}%`} />
              <Kpi label="Seat Occupancy" value={`${ops.seatOccupancyPct ?? 0}%`} />
              <Kpi label="Downtime" value={`${ops.vehicleDowntimePct ?? 0}%`} color="text-red-600" />
            </div>
          )}
          <div className={`${am.card} overflow-x-auto`}>
            <p className="text-[10px] font-bold text-slate-400 uppercase p-2">
              {tab === 'Driver KPIs' ? 'Driver Performance & Safety Score' : 'Route Performance & Profitability'}
            </p>
            <table className="w-full text-xs">
              <thead><tr className="border-b text-left text-[10px] text-slate-400 uppercase">
                {tab === 'Driver KPIs'
                  ? <><th className="p-2">Driver</th><th className="p-2">Trips</th><th className="p-2">Rating</th><th className="p-2">Safety Score</th><th className="p-2">Violations</th><th className="p-2">Status</th></>
                  : <><th className="p-2">Route</th><th className="p-2">Students</th><th className="p-2">On-Time</th><th className="p-2">Revenue</th><th className="p-2">Cost</th><th className="p-2">Profit</th></>}
              </tr></thead>
              <tbody>
                {tab === 'Driver KPIs'
                  ? ((data?.dashboards?.driver as Record<string, unknown>[]) ?? []).map((d) => (
                    <tr key={String(d.id)} className="border-b border-slate-50">
                      <td className="p-2 font-bold">{String(d.name)}</td>
                      <td className="p-2">{String(d.trips)}</td>
                      <td className="p-2">★ {String(d.rating)}</td>
                      <td className="p-2 font-semibold text-emerald-600">{String(d.safetyScore)}</td>
                      <td className="p-2">{String(d.violations)}</td>
                      <td className="p-2"><StatusBadge status={d.onDuty ? 'ON_DUTY' : 'OFF_DUTY'} /></td>
                    </tr>
                  ))
                  : (data?.routeProfitability ?? []).map((r) => {
                    const row = r as Record<string, unknown>;
                    return (
                      <tr key={String(row.routeCode)} className="border-b border-slate-50">
                        <td className="p-2 font-bold">{String(row.routeName)}</td>
                        <td className="p-2">{String(row.studentCount)}</td>
                        <td className="p-2">{String(row.onTimePct)}%</td>
                        <td className="p-2">{formatInr(Number(row.revenue))}</td>
                        <td className="p-2">{formatInr(Number(row.cost))}</td>
                        <td className={`p-2 font-bold ${Number(row.profit) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {formatInr(Number(row.profit))}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'Student Safety' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
          <Kpi label="Enrolled" value={(data?.dashboards?.studentSafety as { enrolled?: number })?.enrolled ?? 0} />
          <Kpi label="Sessions" value={(data?.dashboards?.studentSafety as { sessionsToday?: number })?.sessionsToday ?? 0} />
          <Kpi label="Exceptions" value={(data?.dashboards?.studentSafety as { exceptions?: number })?.exceptions ?? 0} color="text-red-600" />
          <Kpi label="Safety Index" value={`${safety.studentSafetyIndex ?? 0}`} color="text-emerald-600" />
          <Kpi label="Safe Boarding %" value={`${safety.safeBoardingPct ?? 0}%`} />
          <Kpi label="Accidents" value={safety.accidentRate ?? 0} color="text-red-600" />
          <Kpi label="Response Time" value={`${safety.emergencyResponseMins ?? 0}m`} />
          <Kpi label="Speed Violations" value={safety.speedViolations ?? 0} color="text-amber-600" />
        </div>
      )}

      {tab === 'Fuel & Expenses' && (
        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Kpi label="Fuel Cost" value={formatInr(fin.totalFuelCost ?? 0)} />
            <Kpi label="Maintenance" value={formatInr(fin.totalMaintenanceCost ?? 0)} />
            <Kpi label="Total Expenses" value={formatInr(fin.totalExpenses ?? 0)} color="text-red-600" />
            <Kpi label="Cost/KM" value={formatInr(fin.costPerKm ?? 0)} />
            <Kpi label="Cost/Student" value={formatInr(fin.costPerStudent ?? 0)} />
            <Kpi label="Fuel/KM" value={formatInr(fin.fuelCostPerKm ?? 0)} />
          </div>
          <div className={`${am.card} p-4 h-64`}>
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Fuel vs Revenue Trend</p>
            <ResponsiveContainer width="100%" height="90%">
              <BarChart data={fuelTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="fuel" fill="#f59e0b" name="Fuel" />
                <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {tab === 'Revenue & Fees' && (
        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Kpi label="Total Revenue" value={formatInr(fin.totalRevenue ?? 0)} color="text-emerald-600" />
            <Kpi label="Collection %" value={`${fin.revenueCollectionPct ?? 0}%`} />
            <Kpi label="Outstanding %" value={`${fin.outstandingPct ?? 0}%`} color="text-red-600" />
            <Kpi label="Route Profitability" value={formatInr((data?.routeProfitability?.[0] as { profit?: number })?.profit ?? 0)} />
          </div>
        </div>
      )}

      {tab === 'Safety Analytics' && (
        <div className="grid md:grid-cols-2 gap-3 mt-4">
          <div className={`${am.card} p-3`}>
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Safety KPIs</p>
            {Object.entries(safety).map(([k, v]) => (
              <div key={k} className="flex justify-between text-xs py-1 border-b border-slate-50">
                <span className="text-slate-600">{k.replace(/([A-Z])/g, ' $1')}</span>
                <span className="font-bold">{String(v)}</span>
              </div>
            ))}
          </div>
          <div className={`${am.card} p-3`}>
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Complaints</p>
            {(data?.complaints ?? []).map((c) => {
              const row = c as Record<string, unknown>;
              return (
                <div key={String(row.id)} className="text-xs py-1 border-b border-slate-50">
                  <p className="font-semibold">{String(row.subject)}</p>
                  <div className="flex justify-between"><StatusBadge status={String(row.status)} /><span className="text-slate-400">{String(row.relativeTime)}</span></div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'Predictive AI' && (
        <div className="space-y-4 mt-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-2">
            <Kpi label="Fuel Forecast" value={formatInr((data?.predictions?.fuelForecast as { nextMonth?: number })?.nextMonth ?? 0)}
              sub={`${(data?.predictions?.fuelForecast as { confidence?: number })?.confidence ?? 0}% confidence`} color="text-amber-600" />
            <Kpi label="Budget Forecast" value={formatInr((data?.predictions?.budgetForecast as { annual?: number })?.annual ?? 0)}
              sub="Annual estimate" color="text-violet-600" />
            <Kpi label="Demand Growth" value={`+${(data?.predictions?.demandForecast as { growthPct?: number })?.growthPct ?? 0}%`} color="text-emerald-600" />
            <Kpi label="Maint. Due" value={(data?.predictions?.maintenanceForecast as { vehiclesDue?: number })?.vehiclesDue ?? 0} color="text-red-600" />
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div className={`${am.card} p-3`}>
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-1">
                <Zap className="w-3 h-3" /> Route Optimization Suggestions
              </p>
              {((data?.predictions?.routeOptimization as Record<string, unknown>[]) ?? []).map((r, i) => (
                <div key={i} className="text-xs py-1 border-b border-slate-50">
                  <p className="font-bold">{String(r.routeName)}</p>
                  <p className="text-slate-500">{String(r.suggestion)}</p>
                </div>
              ))}
            </div>
            <div className={`${am.card} p-3`}>
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Vehicle Replacement Planning</p>
              {((data?.predictions?.vehicleReplacement as Record<string, unknown>[]) ?? []).map((v, i) => (
                <div key={i} className="text-xs py-1 border-b border-slate-50">
                  <p className="font-bold">{String(v.vehicleNumber)}</p>
                  <p className="text-slate-500">{String(v.reason)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'Heat Map' && (
        <div className="mt-4">
          <div className={`${am.card} relative h-96 bg-slate-100 overflow-hidden`}>
            <p className="absolute top-2 left-2 text-[10px] font-bold text-slate-500 uppercase z-10">Student Density & Route Congestion Heat Map</p>
            {(data?.heatMap ?? []).map((p) => {
              const row = p as Record<string, unknown>;
              const intensity = Number(row.intensity ?? 50);
              return (
                <div key={String(row.stopName)} className="absolute transform -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
                  style={{
                    top: `${row.topPct}%`, left: `${row.leftPct}%`,
                    width: `${12 + intensity / 5}px`, height: `${12 + intensity / 5}px`,
                    backgroundColor: `rgba(239, 68, 68, ${intensity / 100})`,
                  }}
                  title={`${String(row.stopName)}: ${String(row.studentCount)} students`} />
              );
            })}
          </div>
        </div>
      )}

      {tab === 'Digital Twin' && (
        <div className="mt-4">
          <div className={`${am.card} relative h-96 bg-slate-900 overflow-hidden`}>
            <p className="absolute top-2 left-2 text-[10px] font-bold text-emerald-400 uppercase z-10 flex items-center gap-1">
              <Activity className="w-3 h-3" /> Digital Twin — Live Vehicle Movement
            </p>
            <div className="absolute inset-0 opacity-15"
              style={{ backgroundImage: 'linear-gradient(#10b981 1px, transparent 1px), linear-gradient(90deg, #10b981 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
            {(data?.digitalTwin ?? []).map((v) => {
              const row = v as Record<string, unknown>;
              return (
                <div key={String(row.tripNumber)} className="absolute z-10" style={{ top: `${row.topPct}%`, left: `${row.leftPct}%` }}>
                  <div className="w-8 h-8 rounded-full bg-emerald-500/80 border-2 border-emerald-300 flex items-center justify-center animate-pulse">
                    <Bus className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-[9px] text-emerald-300 text-center">{String(row.vehicleNumber)} {Number(row.speedKmh)}km/h</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'Reports' && (
        <div className="space-y-4 mt-4">
          {Object.entries(data?.reportCatalog ?? {}).map(([category, reports]) => (
            <div key={category}>
              <p className="text-xs font-bold text-slate-700 uppercase mb-2 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" /> {category} Reports
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {(reports as string[]).map((r) => (
                  <div key={r} className={`${am.card} p-2 flex items-center justify-between hover:bg-slate-50 cursor-pointer group`}>
                    <span className="text-xs font-medium text-slate-700">{r}</span>
                    <Download className="w-3.5 h-3.5 text-slate-400 group-hover:text-violet-600" />
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="flex gap-2 flex-wrap">
            {(data?.exportFormats ?? []).map((f) => (
              <span key={f} className="text-[10px] px-2 py-1 rounded-full bg-violet-50 text-violet-700 font-semibold">Export {f}</span>
            ))}
            {(data?.biIntegrations ?? []).map((b) => (
              <span key={b} className="text-[10px] px-2 py-1 rounded-full bg-blue-50 text-blue-700 font-semibold">{b}</span>
            ))}
          </div>
        </div>
      )}

      {tab === 'Scheduler' && (
        <div className="space-y-3 mt-4">
          <button type="button" onClick={() => setShowSchedule(true)} className={am.btnPrimary}>
            <Calendar className="w-3.5 h-3.5" /> New Schedule
          </button>
          <div className={`${am.card} overflow-x-auto`}>
            <table className="w-full text-xs">
              <thead><tr className="border-b text-left text-[10px] text-slate-400 uppercase">
                <th className="p-2">Report</th><th className="p-2">Frequency</th><th className="p-2">Channel</th>
                <th className="p-2">Recipients</th><th className="p-2">Last Run</th><th className="p-2">Next Run</th><th className="p-2">Status</th>
              </tr></thead>
              <tbody>
                {(data?.schedules ?? []).map((s) => {
                  const row = s as Record<string, unknown>;
                  return (
                    <tr key={String(row.id)} className="border-b border-slate-50">
                      <td className="p-2 font-bold">{String(row.reportName)}</td>
                      <td className="p-2">{String(row.frequency)}</td>
                      <td className="p-2"><StatusBadge status={String(row.channel)} /></td>
                      <td className="p-2 truncate max-w-[150px]">{String(row.recipients)}</td>
                      <td className="p-2">{String(row.lastRunAt)}</td>
                      <td className="p-2">{String(row.nextRunAt)}</td>
                      <td className="p-2"><StatusBadge status={String(row.status)} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'Audit' && (
        <div className={`${am.card} overflow-x-auto mt-4`}>
          <table className="w-full text-xs">
            <thead><tr className="border-b text-left text-[10px] text-slate-400 uppercase">
              <th className="p-2">Entity</th><th className="p-2">Action</th><th className="p-2">Details</th>
              <th className="p-2">By</th><th className="p-2">When</th>
            </tr></thead>
            <tbody>
              {(data?.auditLogs ?? []).map((a) => {
                const row = a as Record<string, unknown>;
                return (
                  <tr key={String(row.id)} className="border-b border-slate-50">
                    <td className="p-2"><StatusBadge status={String(row.entityType)} /></td>
                    <td className="p-2 font-semibold">{String(row.action)}</td>
                    <td className="p-2">{String(row.details)}</td>
                    <td className="p-2">{String(row.performedBy)}</td>
                    <td className="p-2">{String(row.relativeTime)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'Settings' && (
        <div className="grid md:grid-cols-2 gap-3 mt-4">
          <div className={`${am.card} p-3`}>
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Role-Based Dashboards</p>
            {roleMatrix.map((r) => (
              <div key={r.role} className="text-xs border-b border-slate-50 pb-1 mb-1">
                <p className="font-bold">{r.role}</p>
                <p className="text-slate-500">{r.permissions}</p>
              </div>
            ))}
          </div>
          <div className={`${am.card} p-3`}>
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Mobile App Dashboards</p>
            {Object.entries(mobileSync).map(([app, features]) => (
              <div key={app} className="mb-2">
                <p className="text-xs font-bold capitalize">{app.replace(/([A-Z])/g, ' $1')}</p>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {(features as string[]).slice(0, 4).map((f) => (
                    <span key={f} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{f}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <AcademicModal open={showSchedule} onClose={() => setShowSchedule(false)} title="Schedule Report">
        <div className="space-y-3">
          <input value={schedForm.reportName} onChange={(e) => setSchedForm({ ...schedForm, reportName: e.target.value })}
            placeholder="Report name" className={`${am.input} text-xs w-full`} />
          <select value={schedForm.frequency} onChange={(e) => setSchedForm({ ...schedForm, frequency: e.target.value })} className={`${am.input} text-xs w-full`}>
            <option value="DAILY">Daily</option><option value="WEEKLY">Weekly</option><option value="MONTHLY">Monthly</option>
          </select>
          <select value={schedForm.channel} onChange={(e) => setSchedForm({ ...schedForm, channel: e.target.value })} className={`${am.input} text-xs w-full`}>
            <option value="EMAIL">Email</option><option value="WHATSAPP">WhatsApp</option><option value="SMS">SMS</option>
          </select>
          <input value={schedForm.recipients} onChange={(e) => setSchedForm({ ...schedForm, recipients: e.target.value })}
            placeholder="Recipients" className={`${am.input} text-xs w-full`} />
          <button type="button" disabled={busy || !schedForm.reportName} className={am.btnPrimary}
            onClick={() => void act(async () => {
              const res = await scheduleTransportReport({ ...schedForm, academicYear });
              setShowSchedule(false);
              return res;
            }, 'Report scheduled')}>
            Schedule Report
          </button>
        </div>
      </AcademicModal>
    </AcademicPageShell>
  );
}
