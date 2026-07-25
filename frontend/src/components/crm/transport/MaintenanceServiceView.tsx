import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Search, RefreshCw, Plus, Wrench, Fuel, AlertTriangle, Shield, FileText,
  CheckCircle2, Bus, Calendar, ClipboardCheck, Package, Building2, Activity,
} from 'lucide-react';
import {
  createFleetWorkOrder, fetchTransportFleetMaintenance, formatInr,
  recordFleetFuelEntry, recordFleetInspection, registerFleetBreakdown,
  updateFleetWorkOrderStatus, type TransportFleetMaintenance,
} from '../../../lib/transportServices';
import {
  am, AcademicLoading, AcademicModal, AcademicPageHeader, AcademicPageShell,
  FeeTabs, StatusBadge,
} from '../FeeFinanceManagement/FeeFinanceUi';

const TABS = [
  'Dashboard', 'Fleet Health', 'Work Orders', 'Schedules', 'Compliance',
  'Inspections', 'Fuel', 'Tyres & Parts', 'Vendors', 'Breakdowns',
  'Reports', 'Mobile Sync', 'Audit', 'Settings',
] as const;
type TabId = (typeof TABS)[number];

type Vehicle = {
  id: string; vehicleNumber: string; registrationNumber: string; vehicleType: string;
  make: string; model: string; healthStatus: string; availabilityStatus: string;
  operationalStatus: string; maintenanceDueDays: number | null; fuelType: string;
  routeName: string; driverName: string; healthScore: number; reliabilityIndex: string;
};

type WorkOrder = {
  id: string; workOrderNumber: string; vehicleNumber: string; vendorName: string;
  serviceType: string; workshopType: string; priority: string; status: string;
  scheduledDate: string; completedDate: string; totalCost: number;
  labourCost: number; partsCost: number; vendorCost: number;
  description: string; assignedTo: string; qcPassed: boolean;
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

function healthColor(score: number) {
  if (score >= 80) return 'text-emerald-600';
  if (score >= 50) return 'text-amber-600';
  return 'text-red-600';
}

export function MaintenanceServiceView({ defaultTab }: { defaultTab?: TabId }) {
  const [data, setData] = useState<TransportFleetMaintenance | null>(null);
  const [tab, setTab] = useState<TabId>(defaultTab ?? 'Dashboard');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [message, setMessage] = useState('');
  const [showWo, setShowWo] = useState(false);
  const [showFuel, setShowFuel] = useState(false);
  const [showInspection, setShowInspection] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [woForm, setWoForm] = useState({
    vehicleId: '', serviceType: 'PREVENTIVE', workshopType: 'INTERNAL',
    priority: 'NORMAL', description: '', labourCost: '', partsCost: '', assignedTo: '',
  });
  const [fuelForm, setFuelForm] = useState({
    vehicleId: '', litres: '', amount: '', odometerReading: '', fuelStation: '', paymentMode: 'UPI', driverName: '',
  });
  const [inspForm, setInspForm] = useState({
    vehicleId: '', inspectionType: 'DAILY', status: 'PASS', odometerReading: '', inspectorName: '', defectsFound: '',
  });
  const [breakdownForm, setBreakdownForm] = useState({ vehicleId: '', description: '' });

  const load = useCallback(async (seed = false) => {
    setLoading(true);
    try { setData(await fetchTransportFleetMaintenance(seed)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const vehicles = useMemo(() => (data?.vehicles ?? []) as Vehicle[], [data]);
  const workOrders = useMemo(() => (data?.workOrders ?? []) as WorkOrder[], [data]);
  const q = search.toLowerCase();

  const filteredVehicles = useMemo(() => vehicles.filter((v) => {
    const matchQ = !q || v.vehicleNumber.toLowerCase().includes(q) || v.routeName.toLowerCase().includes(q)
      || v.driverName.toLowerCase().includes(q);
    const matchS = statusFilter === 'ALL' || v.healthStatus === statusFilter || v.availabilityStatus === statusFilter;
    return matchQ && matchS;
  }), [vehicles, q, statusFilter]);

  const filteredWo = useMemo(() => workOrders.filter((w) => {
    const matchQ = !q || w.workOrderNumber.toLowerCase().includes(q) || w.vehicleNumber.toLowerCase().includes(q);
    const matchS = statusFilter === 'ALL' || w.status === statusFilter;
    return matchQ && matchS;
  }), [workOrders, q, statusFilter]);

  const act = async (fn: () => Promise<TransportFleetMaintenance>, msg: string) => {
    setBusy(true); setMessage('');
    try {
      setData(await fn());
      setMessage(msg);
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Action failed'); }
    finally { setBusy(false); }
  };

  const roleMatrix = (data?.settings as { roleMatrix?: { role: string; permissions: string }[] })?.roleMatrix ?? [];
  const mobileSync = (data?.settings as { mobileSyncRules?: Record<string, string[]> })?.mobileSyncRules ?? {};
  const fleetSettings = data?.settings as {
    defaultServiceKm?: number; defaultServiceDays?: number; reminderDaysBefore?: number;
    notificationRules?: { channels?: string[]; events?: string[] };
  } | undefined;

  if (loading && !data) return <AcademicLoading />;

  const WoActions = ({ w }: { w: WorkOrder }) => (
    <div className="flex gap-1">
      {w.status === 'OPEN' && (
        <button type="button" title="Start" disabled={busy}
          onClick={() => void act(() => updateFleetWorkOrderStatus(w.id, 'IN_PROGRESS'), 'Work order started')}
          className="p-1 rounded hover:bg-violet-50 text-violet-600"><Wrench className="w-3.5 h-3.5" /></button>
      )}
      {w.status === 'IN_PROGRESS' && (
        <button type="button" title="QC" disabled={busy}
          onClick={() => void act(() => updateFleetWorkOrderStatus(w.id, 'QC'), 'Sent to QC')}
          className="p-1 rounded hover:bg-amber-50 text-amber-600"><ClipboardCheck className="w-3.5 h-3.5" /></button>
      )}
      {['IN_PROGRESS', 'QC'].includes(w.status) && (
        <button type="button" title="Complete" disabled={busy}
          onClick={() => void act(() => updateFleetWorkOrderStatus(w.id, 'COMPLETED'), 'Work order completed')}
          className="p-1 rounded hover:bg-green-50 text-green-600"><CheckCircle2 className="w-3.5 h-3.5" /></button>
      )}
    </div>
  );

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="Transport Management › Maintenance & Service"
        title="Fleet Maintenance & Fuel Management"
        subtitle="Vehicle health, preventive maintenance, work orders, compliance, fuel analytics, spare parts & workshop management"
        actions={(
          <div className="flex gap-2 flex-wrap">
            <button type="button" onClick={() => void load()} disabled={busy} className={am.btnSecondary}>
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
            <button type="button" onClick={() => setShowBreakdown(true)} className={am.btnSecondary}>
              <AlertTriangle className="w-3.5 h-3.5" /> Breakdown
            </button>
            <button type="button" onClick={() => setShowFuel(true)} className={am.btnSecondary}>
              <Fuel className="w-3.5 h-3.5" /> Fuel Entry
            </button>
            <button type="button" onClick={() => setShowWo(true)} className={am.btnPrimary}>
              <Plus className="w-3.5 h-3.5" /> Work Order
            </button>
          </div>
        )}
      />

      {message && (
        <div className={`mb-3 p-2 rounded-lg text-xs font-medium ${message.includes('fail') ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
          {message}
        </div>
      )}

      <FeeTabs tabs={[...TABS]} active={tab} onChange={(t) => setTab(t as TabId)} />

      {(tab === 'Dashboard' || tab === 'Fleet Health') && (
        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-10 gap-2">
            <Kpi label="Total Fleet" value={data?.kpis.totalVehicles ?? 0} />
            <Kpi label="Healthy" value={data?.kpis.healthy ?? 0} color="text-emerald-600" />
            <Kpi label="Due Service" value={data?.kpis.dueForService ?? 0} color="text-amber-600" />
            <Kpi label="Maintenance" value={data?.kpis.underMaintenance ?? 0} color="text-violet-600" />
            <Kpi label="Breakdown" value={data?.kpis.breakdown ?? 0} color="text-red-600" />
            <Kpi label="Available" value={data?.kpis.available ?? 0} color="text-teal-600" />
            <Kpi label="Open WOs" value={data?.kpis.openWorkOrders ?? 0} />
            <Kpi label="Avg Health" value={`${data?.kpis.avgHealthScore ?? 0}%`} color={healthColor(data?.kpis.avgHealthScore ?? 0)} />
            <Kpi label="Fuel Cost" value={formatInr(data?.kpis.totalFuelCost ?? 0)} />
            <Kpi label="Maint. Cost" value={formatInr(data?.kpis.maintenanceCost ?? 0)} />
          </div>

          {tab === 'Dashboard' && (
            <>
              <div className={`${am.card} p-3`}>
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Maintenance Workflow</p>
                <div className="flex flex-wrap gap-1">
                  {(data?.workflow ?? []).map((w, i) => (
                    <span key={w} className="flex items-center gap-1">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 font-semibold">{w}</span>
                      {i < (data?.workflow?.length ?? 0) - 1 && <span className="text-slate-300">→</span>}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <div className={`${am.card} p-3`}>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Fuel Analytics</p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div><p className="text-lg font-black">{data?.kpis.totalFuelLitres ?? 0}L</p><p className="text-[10px] text-slate-500">Total Litres</p></div>
                    <div><p className="text-lg font-black">{formatInr(data?.kpis.avgFuelCostPerLitre ?? 0)}</p><p className="text-[10px] text-slate-500">Avg/Litre</p></div>
                    <div><p className="text-lg font-black text-amber-600">{data?.kpis.complianceExpiring ?? 0}</p><p className="text-[10px] text-slate-500">Docs Expiring</p></div>
                  </div>
                </div>
                <div className={`${am.card} p-3`}>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Inventory Alerts</p>
                  <p className="text-2xl font-black text-red-600">{data?.kpis.sparePartsLow ?? 0}</p>
                  <p className="text-[10px] text-slate-500">Spare parts below reorder level</p>
                </div>
              </div>
            </>
          )}

          <div className="flex gap-2 flex-wrap items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search vehicle, route, driver…" className={`${am.input} pl-8 text-xs w-full`} />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`${am.input} text-xs`}>
              <option value="ALL">All Status</option>
              {(data?.healthStatuses ?? []).map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
          </div>

          <div className={`${am.card} overflow-x-auto`}>
            <table className="w-full text-xs">
              <thead><tr className="border-b border-slate-100 text-left text-[10px] text-slate-400 uppercase">
                <th className="p-2">Vehicle</th><th className="p-2">Route / Driver</th>
                <th className="p-2">Health</th><th className="p-2">Availability</th>
                <th className="p-2">Health Score</th><th className="p-2">Reliability</th><th className="p-2">Service Due</th>
              </tr></thead>
              <tbody>
                {filteredVehicles.map((v) => (
                  <tr key={v.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="p-2">
                      <p className="font-bold">{v.vehicleNumber}</p>
                      <p className="text-[10px] text-slate-500">{v.make} {v.model}</p>
                    </td>
                    <td className="p-2">
                      <p>{v.routeName || '—'}</p>
                      <p className="text-[10px] text-slate-500">{v.driverName || '—'}</p>
                    </td>
                    <td className="p-2"><StatusBadge status={v.healthStatus} /></td>
                    <td className="p-2"><StatusBadge status={v.availabilityStatus} /></td>
                    <td className={`p-2 font-black ${healthColor(v.healthScore)}`}>{v.healthScore}%</td>
                    <td className="p-2"><StatusBadge status={v.reliabilityIndex} /></td>
                    <td className="p-2">{v.maintenanceDueDays != null ? `${v.maintenanceDueDays} days` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'Work Orders' && (
        <div className="space-y-3 mt-4">
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search WO#, vehicle…" className={`${am.input} pl-8 text-xs w-full`} />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`${am.input} text-xs`}>
              <option value="ALL">All Status</option>
              {(data?.workOrderStatuses ?? []).map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div className={`${am.card} overflow-x-auto`}>
            <table className="w-full text-xs">
              <thead><tr className="border-b text-left text-[10px] text-slate-400 uppercase">
                <th className="p-2">WO #</th><th className="p-2">Vehicle</th><th className="p-2">Type</th>
                <th className="p-2">Workshop</th><th className="p-2">Priority</th><th className="p-2">Status</th>
                <th className="p-2">Cost</th><th className="p-2">Assigned</th><th className="p-2">Actions</th>
              </tr></thead>
              <tbody>
                {filteredWo.map((w) => (
                  <tr key={w.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="p-2 font-bold">{w.workOrderNumber}</td>
                    <td className="p-2">{w.vehicleNumber}</td>
                    <td className="p-2"><StatusBadge status={w.serviceType} /></td>
                    <td className="p-2">{w.workshopType} — {w.vendorName}</td>
                    <td className="p-2"><StatusBadge status={w.priority} /></td>
                    <td className="p-2"><StatusBadge status={w.status} /></td>
                    <td className="p-2 font-semibold">{formatInr(w.totalCost)}</td>
                    <td className="p-2">{w.assignedTo || '—'}</td>
                    <td className="p-2"><WoActions w={w} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'Schedules' && (
        <div className={`${am.card} overflow-x-auto mt-4`}>
          <table className="w-full text-xs">
            <thead><tr className="border-b text-left text-[10px] text-slate-400 uppercase">
              <th className="p-2">Vehicle</th><th className="p-2">Schedule</th><th className="p-2">Service</th>
              <th className="p-2">Interval</th><th className="p-2">Last Service</th>
              <th className="p-2">Next Due</th><th className="p-2">Next KM</th><th className="p-2">Status</th>
            </tr></thead>
            <tbody>
              {(data?.schedules ?? []).map((s) => {
                const row = s as Record<string, unknown>;
                return (
                  <tr key={String(row.id)} className="border-b border-slate-50">
                    <td className="p-2 font-bold">{String(row.vehicleNumber)}</td>
                    <td className="p-2">{String(row.scheduleType)}</td>
                    <td className="p-2"><StatusBadge status={String(row.serviceType)} /></td>
                    <td className="p-2">{String(row.intervalValue)}</td>
                    <td className="p-2">{String(row.lastServiceDate)}</td>
                    <td className="p-2">{String(row.nextDueDate)}</td>
                    <td className="p-2">{String(row.nextDueKm ?? '—')}</td>
                    <td className="p-2"><StatusBadge status={String(row.status)} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'Compliance' && (
        <div className={`${am.card} overflow-x-auto mt-4`}>
          <table className="w-full text-xs">
            <thead><tr className="border-b text-left text-[10px] text-slate-400 uppercase">
              <th className="p-2">Vehicle</th><th className="p-2">Document</th><th className="p-2">Number</th>
              <th className="p-2">Issue</th><th className="p-2">Expiry</th><th className="p-2">Days Left</th><th className="p-2">Status</th>
            </tr></thead>
            <tbody>
              {(data?.compliance ?? []).map((d) => {
                const row = d as Record<string, unknown>;
                const days = row.daysUntilExpiry as number | null;
                return (
                  <tr key={String(row.id)} className="border-b border-slate-50">
                    <td className="p-2 font-bold">{String(row.vehicleNumber)}</td>
                    <td className="p-2"><StatusBadge status={String(row.docType)} /></td>
                    <td className="p-2">{String(row.documentNumber)}</td>
                    <td className="p-2">{String(row.issueDate)}</td>
                    <td className="p-2">{String(row.expiryDate)}</td>
                    <td className={`p-2 font-semibold ${days != null && days <= 30 ? 'text-red-600' : ''}`}>
                      {days != null ? `${days}d` : '—'}
                    </td>
                    <td className="p-2"><StatusBadge status={String(row.status)} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'Inspections' && (
        <div className="space-y-3 mt-4">
          <button type="button" onClick={() => setShowInspection(true)} className={am.btnPrimary}>
            <ClipboardCheck className="w-3.5 h-3.5" /> Record Inspection
          </button>
          <div className={`${am.card} overflow-x-auto`}>
            <table className="w-full text-xs">
              <thead><tr className="border-b text-left text-[10px] text-slate-400 uppercase">
                <th className="p-2">Vehicle</th><th className="p-2">Type</th><th className="p-2">Inspector</th>
                <th className="p-2">Odometer</th><th className="p-2">Status</th><th className="p-2">Defects</th><th className="p-2">When</th>
              </tr></thead>
              <tbody>
                {(data?.inspections ?? []).map((i) => {
                  const row = i as Record<string, unknown>;
                  return (
                    <tr key={String(row.id)} className="border-b border-slate-50">
                      <td className="p-2 font-bold">{String(row.vehicleNumber)}</td>
                      <td className="p-2">{String(row.inspectionType)}</td>
                      <td className="p-2">{String(row.inspectorName)}</td>
                      <td className="p-2">{String(row.odometerReading)}</td>
                      <td className="p-2"><StatusBadge status={String(row.status)} /></td>
                      <td className="p-2 text-red-600">{String(row.defectsFound || '—')}</td>
                      <td className="p-2">{String(row.relativeTime)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'Fuel' && (
        <div className="space-y-3 mt-4">
          <div className="grid grid-cols-3 gap-2">
            <Kpi label="Total Litres" value={`${data?.kpis.totalFuelLitres ?? 0}L`} />
            <Kpi label="Total Cost" value={formatInr(data?.kpis.totalFuelCost ?? 0)} />
            <Kpi label="Avg Cost/Litre" value={formatInr(data?.kpis.avgFuelCostPerLitre ?? 0)} />
          </div>
          <button type="button" onClick={() => setShowFuel(true)} className={am.btnPrimary}>
            <Fuel className="w-3.5 h-3.5" /> Record Fuel Entry
          </button>
          <div className={`${am.card} overflow-x-auto`}>
            <table className="w-full text-xs">
              <thead><tr className="border-b text-left text-[10px] text-slate-400 uppercase">
                <th className="p-2">Vehicle</th><th className="p-2">Date</th><th className="p-2">Litres</th>
                <th className="p-2">Amount</th><th className="p-2">Station</th><th className="p-2">Mileage</th>
                <th className="p-2">Driver</th><th className="p-2">Mode</th>
              </tr></thead>
              <tbody>
                {(data?.fuelEntries ?? []).map((f) => {
                  const row = f as Record<string, unknown>;
                  return (
                    <tr key={String(row.id)} className="border-b border-slate-50">
                      <td className="p-2 font-bold">{String(row.vehicleNumber)}</td>
                      <td className="p-2">{String(row.fillDate)}</td>
                      <td className="p-2">{String(row.litres)}L</td>
                      <td className="p-2">{formatInr(Number(row.amount))}</td>
                      <td className="p-2">{String(row.fuelStation)}</td>
                      <td className="p-2">{String(row.mileageKm)} km/L</td>
                      <td className="p-2">{String(row.driverName)}</td>
                      <td className="p-2">{String(row.paymentMode)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'Tyres & Parts' && (
        <div className="grid md:grid-cols-2 gap-3 mt-4">
          <div className={`${am.card} p-3`}>
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-1">
              <Bus className="w-3 h-3" /> Tyre Lifecycle
            </p>
            <div className="overflow-x-auto max-h-64">
              <table className="w-full text-xs">
                <thead><tr className="border-b text-[10px] text-slate-400 uppercase">
                  <th className="p-1 text-left">Vehicle</th><th className="p-1">Pos</th><th className="p-1">Brand</th>
                  <th className="p-1">Life %</th><th className="p-1">Status</th>
                </tr></thead>
                <tbody>
                  {(data?.tyres ?? []).slice(0, 20).map((t) => {
                    const row = t as Record<string, unknown>;
                    return (
                      <tr key={String(row.id)} className="border-b border-slate-50">
                        <td className="p-1">{String(row.vehicleNumber)}</td>
                        <td className="p-1">{String(row.position)}</td>
                        <td className="p-1">{String(row.brand)}</td>
                        <td className="p-1 font-semibold">{String(row.lifePct)}%</td>
                        <td className="p-1"><StatusBadge status={String(row.status)} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <div className={`${am.card} p-3`}>
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-1">
              <Package className="w-3 h-3" /> Spare Parts Inventory
            </p>
            <div className="overflow-x-auto max-h-64">
              <table className="w-full text-xs">
                <thead><tr className="border-b text-[10px] text-slate-400 uppercase">
                  <th className="p-1 text-left">Part</th><th className="p-1">Category</th>
                  <th className="p-1">Qty</th><th className="p-1">Reorder</th><th className="p-1">Status</th>
                </tr></thead>
                <tbody>
                  {(data?.spareParts ?? []).map((p) => {
                    const row = p as Record<string, unknown>;
                    return (
                      <tr key={String(row.id)} className="border-b border-slate-50">
                        <td className="p-1 font-semibold">{String(row.partName)}</td>
                        <td className="p-1">{String(row.category)}</td>
                        <td className="p-1">{String(row.quantity)}</td>
                        <td className="p-1">{String(row.reorderLevel)}</td>
                        <td className="p-1"><StatusBadge status={String(row.status)} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'Vendors' && (
        <div className={`${am.card} overflow-x-auto mt-4`}>
          <table className="w-full text-xs">
            <thead><tr className="border-b text-left text-[10px] text-slate-400 uppercase">
              <th className="p-2">Code</th><th className="p-2">Vendor</th><th className="p-2">Type</th>
              <th className="p-2">Contact</th><th className="p-2">AMC</th><th className="p-2">AMC Expiry</th>
              <th className="p-2">Rating</th><th className="p-2">Status</th>
            </tr></thead>
            <tbody>
              {(data?.vendors ?? []).map((v) => {
                const row = v as Record<string, unknown>;
                return (
                  <tr key={String(row.id)} className="border-b border-slate-50">
                    <td className="p-2">{String(row.vendorCode)}</td>
                    <td className="p-2 font-bold">{String(row.vendorName)}</td>
                    <td className="p-2"><StatusBadge status={String(row.vendorType)} /></td>
                    <td className="p-2">{String(row.contactPerson)} — {String(row.mobile)}</td>
                    <td className="p-2">{row.amcContract ? 'Yes' : 'No'}</td>
                    <td className="p-2">{String(row.amcExpiry || '—')}</td>
                    <td className="p-2">★ {String(row.rating)}</td>
                    <td className="p-2"><StatusBadge status={String(row.status)} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'Breakdowns' && (
        <div className="space-y-3 mt-4">
          <button type="button" onClick={() => setShowBreakdown(true)} className={am.btnPrimary}>
            <AlertTriangle className="w-3.5 h-3.5" /> Register Breakdown
          </button>
          <div className={`${am.card} overflow-x-auto`}>
            <table className="w-full text-xs">
              <thead><tr className="border-b text-left text-[10px] text-slate-400 uppercase">
                <th className="p-2">Vehicle</th><th className="p-2">Type</th><th className="p-2">Description</th>
                <th className="p-2">Resolved</th><th className="p-2">Reported</th>
              </tr></thead>
              <tbody>
                {(data?.breakdowns ?? []).map((b) => {
                  const row = b as Record<string, unknown>;
                  return (
                    <tr key={String(row.id)} className="border-b border-slate-50">
                      <td className="p-2 font-bold">{String(row.vehicleNumber)}</td>
                      <td className="p-2"><StatusBadge status={String(row.incidentType)} /></td>
                      <td className="p-2">{String(row.description)}</td>
                      <td className="p-2">{row.resolved ? 'Yes' : 'No'}</td>
                      <td className="p-2">{String(row.createdAt).slice(0, 10)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'Reports' && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-4">
          {(data?.reports ?? []).map((r) => (
            <div key={r} className={`${am.card} p-3 flex items-center gap-2 hover:bg-slate-50 cursor-pointer`}>
              <FileText className="w-4 h-4 text-teal-600 shrink-0" />
              <span className="text-xs font-semibold text-slate-700">{r}</span>
            </div>
          ))}
        </div>
      )}

      {tab === 'Mobile Sync' && (
        <div className="grid md:grid-cols-2 gap-3 mt-4">
          {Object.entries(mobileSync).map(([app, features]) => (
            <div key={app} className={`${am.card} p-3`}>
              <p className="text-xs font-bold text-slate-700 capitalize mb-2 flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-teal-600" />
                {app.replace(/([A-Z])/g, ' $1').trim()}
              </p>
              <ul className="space-y-1">
                {(features as string[]).map((f) => (
                  <li key={f} className="text-[11px] text-slate-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" /> {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
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
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Service Defaults</p>
            <div className="space-y-2 text-xs">
              <p>Default service interval: <strong>{fleetSettings?.defaultServiceKm ?? 5000} km</strong> / <strong>{fleetSettings?.defaultServiceDays ?? 90} days</strong></p>
              <p>Reminder before service: <strong>{fleetSettings?.reminderDaysBefore ?? 7} days</strong></p>
            </div>
          </div>
          <div className={`${am.card} p-3`}>
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-1">
              <Shield className="w-3 h-3" /> Role-Based Access
            </p>
            <div className="space-y-2">
              {roleMatrix.map((r) => (
                <div key={r.role} className="text-xs border-b border-slate-50 pb-1">
                  <p className="font-bold">{r.role}</p>
                  <p className="text-slate-500">{r.permissions}</p>
                </div>
              ))}
            </div>
          </div>
          <div className={`${am.card} p-3 md:col-span-2`}>
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Notification Rules</p>
            <div className="flex flex-wrap gap-2">
              {(fleetSettings?.notificationRules?.channels ?? []).map((c) => (
                <span key={c} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold">{c}</span>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {(fleetSettings?.notificationRules?.events ?? []).map((e) => (
                <span key={e} className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-semibold">{e}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Work Order Modal */}
      <AcademicModal open={showWo} onClose={() => setShowWo(false)} title="Create Work Order">
        <div className="space-y-3">
          <select value={woForm.vehicleId} onChange={(e) => setWoForm({ ...woForm, vehicleId: e.target.value })} className={`${am.input} text-xs w-full`}>
            <option value="">Select Vehicle</option>
            {vehicles.map((v) => <option key={v.id} value={v.id}>{v.vehicleNumber}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <select value={woForm.serviceType} onChange={(e) => setWoForm({ ...woForm, serviceType: e.target.value })} className={`${am.input} text-xs`}>
              {(data?.serviceTypes ?? []).map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
            <select value={woForm.workshopType} onChange={(e) => setWoForm({ ...woForm, workshopType: e.target.value })} className={`${am.input} text-xs`}>
              <option value="INTERNAL">Internal Workshop</option>
              <option value="EXTERNAL">External Workshop</option>
            </select>
          </div>
          <input value={woForm.description} onChange={(e) => setWoForm({ ...woForm, description: e.target.value })}
            placeholder="Description" className={`${am.input} text-xs w-full`} />
          <div className="grid grid-cols-2 gap-2">
            <input value={woForm.labourCost} onChange={(e) => setWoForm({ ...woForm, labourCost: e.target.value })}
              placeholder="Labour cost" type="number" className={`${am.input} text-xs`} />
            <input value={woForm.partsCost} onChange={(e) => setWoForm({ ...woForm, partsCost: e.target.value })}
              placeholder="Parts cost" type="number" className={`${am.input} text-xs`} />
          </div>
          <input value={woForm.assignedTo} onChange={(e) => setWoForm({ ...woForm, assignedTo: e.target.value })}
            placeholder="Assigned to" className={`${am.input} text-xs w-full`} />
          <button type="button" disabled={busy || !woForm.vehicleId} className={am.btnPrimary}
            onClick={() => void act(async () => {
              const res = await createFleetWorkOrder(woForm);
              setShowWo(false);
              return res;
            }, 'Work order created')}>
            Create Work Order
          </button>
        </div>
      </AcademicModal>

      {/* Fuel Modal */}
      <AcademicModal open={showFuel} onClose={() => setShowFuel(false)} title="Record Fuel Entry">
        <div className="space-y-3">
          <select value={fuelForm.vehicleId} onChange={(e) => setFuelForm({ ...fuelForm, vehicleId: e.target.value })} className={`${am.input} text-xs w-full`}>
            <option value="">Select Vehicle</option>
            {vehicles.map((v) => <option key={v.id} value={v.id}>{v.vehicleNumber}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input value={fuelForm.litres} onChange={(e) => setFuelForm({ ...fuelForm, litres: e.target.value })}
              placeholder="Litres" type="number" className={`${am.input} text-xs`} />
            <input value={fuelForm.amount} onChange={(e) => setFuelForm({ ...fuelForm, amount: e.target.value })}
              placeholder="Amount (₹)" type="number" className={`${am.input} text-xs`} />
          </div>
          <input value={fuelForm.odometerReading} onChange={(e) => setFuelForm({ ...fuelForm, odometerReading: e.target.value })}
            placeholder="Odometer reading" type="number" className={`${am.input} text-xs w-full`} />
          <input value={fuelForm.fuelStation} onChange={(e) => setFuelForm({ ...fuelForm, fuelStation: e.target.value })}
            placeholder="Fuel station" className={`${am.input} text-xs w-full`} />
          <input value={fuelForm.driverName} onChange={(e) => setFuelForm({ ...fuelForm, driverName: e.target.value })}
            placeholder="Driver name" className={`${am.input} text-xs w-full`} />
          <button type="button" disabled={busy || !fuelForm.vehicleId} className={am.btnPrimary}
            onClick={() => void act(async () => {
              const res = await recordFleetFuelEntry(fuelForm);
              setShowFuel(false);
              return res;
            }, 'Fuel entry recorded')}>
            Save Fuel Entry
          </button>
        </div>
      </AcademicModal>

      {/* Inspection Modal */}
      <AcademicModal open={showInspection} onClose={() => setShowInspection(false)} title="Record Inspection">
        <div className="space-y-3">
          <select value={inspForm.vehicleId} onChange={(e) => setInspForm({ ...inspForm, vehicleId: e.target.value })} className={`${am.input} text-xs w-full`}>
            <option value="">Select Vehicle</option>
            {vehicles.map((v) => <option key={v.id} value={v.id}>{v.vehicleNumber}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <select value={inspForm.inspectionType} onChange={(e) => setInspForm({ ...inspForm, inspectionType: e.target.value })} className={`${am.input} text-xs`}>
              {(data?.inspectionTypes ?? []).map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </select>
            <select value={inspForm.status} onChange={(e) => setInspForm({ ...inspForm, status: e.target.value })} className={`${am.input} text-xs`}>
              <option value="PASS">PASS</option>
              <option value="FAIL">FAIL</option>
            </select>
          </div>
          <input value={inspForm.odometerReading} onChange={(e) => setInspForm({ ...inspForm, odometerReading: e.target.value })}
            placeholder="Odometer" type="number" className={`${am.input} text-xs w-full`} />
          <input value={inspForm.inspectorName} onChange={(e) => setInspForm({ ...inspForm, inspectorName: e.target.value })}
            placeholder="Inspector name" className={`${am.input} text-xs w-full`} />
          <input value={inspForm.defectsFound} onChange={(e) => setInspForm({ ...inspForm, defectsFound: e.target.value })}
            placeholder="Defects found (if any)" className={`${am.input} text-xs w-full`} />
          <button type="button" disabled={busy || !inspForm.vehicleId} className={am.btnPrimary}
            onClick={() => void act(async () => {
              const res = await recordFleetInspection(inspForm);
              setShowInspection(false);
              return res;
            }, 'Inspection recorded')}>
            Save Inspection
          </button>
        </div>
      </AcademicModal>

      {/* Breakdown Modal */}
      <AcademicModal open={showBreakdown} onClose={() => setShowBreakdown(false)} title="Register Breakdown">
        <div className="space-y-3">
          <select value={breakdownForm.vehicleId} onChange={(e) => setBreakdownForm({ ...breakdownForm, vehicleId: e.target.value })} className={`${am.input} text-xs w-full`}>
            <option value="">Select Vehicle</option>
            {vehicles.map((v) => <option key={v.id} value={v.id}>{v.vehicleNumber}</option>)}
          </select>
          <textarea value={breakdownForm.description} onChange={(e) => setBreakdownForm({ ...breakdownForm, description: e.target.value })}
            placeholder="Breakdown description & location" rows={3} className={`${am.input} text-xs w-full`} />
          <button type="button" disabled={busy || !breakdownForm.vehicleId} className={am.btnPrimary}
            onClick={() => void act(async () => {
              const res = await registerFleetBreakdown(breakdownForm);
              setShowBreakdown(false);
              return res;
            }, 'Breakdown registered — emergency WO created')}>
            Register Breakdown
          </button>
        </div>
      </AcademicModal>
    </AcademicPageShell>
  );
}
