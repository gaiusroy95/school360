import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Search, RefreshCw, Plus, Fuel, AlertTriangle, CreditCard, MapPin,
  CheckCircle2, XCircle, Activity, TrendingUp, Shield, FileText, Radio,
} from 'lucide-react';
import {
  approveFuelRequest, assignFuelCard, createFuelRequest, createFuelStation,
  fetchTransportFuelManagement, formatInr, recordFuelFill, recordFuelMileageLog,
  resolveFuelAnomaly, type TransportFuelManagement,
} from '../../../lib/transportServices';
import {
  am, AcademicLoading, AcademicModal, AcademicPageHeader, AcademicPageShell,
  FeeTabs, StatusBadge,
} from '../FeeFinanceManagement/FeeFinanceUi';

const TABS = [
  'Dashboard', 'Fuel Stations', 'Fuel Cards', 'Fill Entries', 'Requests & Approval',
  'Mileage Tracking', 'Consumption Analysis', 'Theft Detection', 'Device Integration',
  'Reports', 'Mobile Sync', 'Audit', 'Settings',
] as const;
type TabId = (typeof TABS)[number];

type FillEntry = {
  id: string; vehicleNumber: string; fillDate: string; fillTime: string;
  litres: number; amount: number; fuelType: string; quantityUnit: string;
  distanceKm: number; fuelStation: string; cardNumber: string; paymentMode: string;
  mileageKm: number; expectedMileage: number; actualMileage: number;
  driverName: string; approvalStatus: string; anomalyFlag: boolean; anomalyReason: string;
  entrySource: string; deviceFuelReading: number | null; deviceDistanceKm: number | null;
};

type FuelRequest = {
  id: string; requestNumber: string; vehicleNumber: string; driverName: string;
  requestedLitres: number; requestedAmount: number; fuelType: string; purpose: string;
  status: string; relativeTime: string;
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

export function FuelManagementView() {
  const [data, setData] = useState<TransportFuelManagement | null>(null);
  const [tab, setTab] = useState<TabId>('Dashboard');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [message, setMessage] = useState('');
  const [showFill, setShowFill] = useState(false);
  const [showRequest, setShowRequest] = useState(false);
  const [showStation, setShowStation] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [showMileage, setShowMileage] = useState(false);
  const [fillForm, setFillForm] = useState({
    vehicleId: '', litres: '', amount: '', openingOdometer: '', closingOdometer: '',
    fuelStationId: '', fuelCardId: '', fuelType: 'Diesel', quantityUnit: 'LITRE',
    paymentMode: 'FUEL_CARD', driverName: '', deviceFuelReading: '', deviceDistanceKm: '',
  });
  const [requestForm, setRequestForm] = useState({
    vehicleId: '', driverName: '', requestedLitres: '', requestedAmount: '', fuelType: 'Diesel', purpose: '',
  });
  const [stationForm, setStationForm] = useState({
    stationCode: '', stationName: '', stationType: 'EXTERNAL', address: '', deviceIntegrationId: '',
  });
  const [cardForm, setCardForm] = useState({
    cardNumber: '', cardProvider: 'HPCL', vehicleId: '', driverId: '', creditLimit: '15000',
  });
  const [mileageForm, setMileageForm] = useState({
    vehicleId: '', openingOdometer: '', closingOdometer: '', fuelConsumed: '', driverName: '', fuelType: 'Diesel',
  });

  const load = useCallback(async (seed = false) => {
    setLoading(true);
    try { setData(await fetchTransportFuelManagement(seed)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(true); }, [load]);

  const fillEntries = useMemo(() => (data?.fillEntries ?? []) as FillEntry[], [data]);
  const requests = useMemo(() => (data?.requests ?? []) as FuelRequest[], [data]);
  const q = search.toLowerCase();

  const filteredFills = useMemo(() => fillEntries.filter((f) => {
    const matchQ = !q || f.vehicleNumber.toLowerCase().includes(q) || f.driverName.toLowerCase().includes(q);
    const matchS = statusFilter === 'ALL' || f.approvalStatus === statusFilter
      || (statusFilter === 'ANOMALY' && f.anomalyFlag);
    return matchQ && matchS;
  }), [fillEntries, q, statusFilter]);

  const act = async (fn: () => Promise<TransportFuelManagement>, msg: string) => {
    setBusy(true); setMessage('');
    try {
      setData(await fn());
      setMessage(msg);
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Action failed'); }
    finally { setBusy(false); }
  };

  const roleMatrix = (data?.settings as { roleMatrix?: { role: string; permissions: string }[] })?.roleMatrix ?? [];
  const mobileSync = (data?.settings as { mobileSyncRules?: Record<string, string[]> })?.mobileSyncRules ?? {};
  const deviceRules = (data?.settings as { deviceIntegrationRules?: Record<string, unknown> })?.deviceIntegrationRules ?? {};
  const fuelSettings = data?.settings as {
    defaultExpectedMileage?: number; anomalyThresholdPct?: number;
    cngMileageKmPerKg?: number; deviceIntegrationEnabled?: boolean; autoApproveLimit?: number;
    notificationRules?: { channels?: string[]; events?: string[] };
  } | undefined;

  if (loading && !data) return <AcademicLoading />;

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="Transport Management › Fuel Management"
        title="Fuel Management System"
        subtitle="Fuel stations, cards, fill entries, mileage tracking, consumption analysis, theft detection & device integration"
        actions={(
          <div className="flex gap-2 flex-wrap">
            <button type="button" onClick={() => void load()} disabled={busy} className={am.btnSecondary}>
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
            <button type="button" onClick={() => setShowRequest(true)} className={am.btnSecondary}>
              <Fuel className="w-3.5 h-3.5" /> Fuel Request
            </button>
            <button type="button" onClick={() => setShowFill(true)} className={am.btnPrimary}>
              <Plus className="w-3.5 h-3.5" /> Fuel Fill Entry
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

      {tab === 'Dashboard' && (
        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
            <Kpi label="Total Cost" value={formatInr(data?.kpis.totalFuelCost ?? 0)} />
            <Kpi label="Total Litres" value={`${data?.kpis.totalLitres ?? 0}L`} color="text-blue-600" />
            <Kpi label="Avg Mileage" value={`${data?.kpis.avgMileage ?? 0} km/L`} color="text-teal-600" />
            <Kpi label="Avg Cost/L" value={formatInr(data?.kpis.avgCostPerLitre ?? 0)} />
            <Kpi label="Monthly Expense" value={formatInr(data?.kpis.monthlyExpense ?? 0)} color="text-amber-600" />
            <Kpi label="Pending Requests" value={data?.kpis.pendingRequests ?? 0} color="text-violet-600" />
            <Kpi label="Open Anomalies" value={data?.kpis.openAnomalies ?? 0} color="text-red-600" />
            <Kpi label="Devices Online" value={data?.kpis.deviceConnected ?? 0} color="text-emerald-600" />
          </div>

          <div className={`${am.card} p-3`}>
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Fuel Workflow</p>
            <div className="flex flex-wrap gap-1">
              {(data?.workflow ?? []).map((w, i) => (
                <span key={w} className="flex items-center gap-1">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-semibold">{w}</span>
                  {i < (data?.workflow?.length ?? 0) - 1 && <span className="text-slate-300">→</span>}
                </span>
              ))}
            </div>
          </div>

          <div className={`${am.card} overflow-x-auto`}>
            <p className="text-[10px] font-bold text-slate-400 uppercase p-2">Vehicle Mileage — Expected vs Actual</p>
            <table className="w-full text-xs">
              <thead><tr className="border-b text-left text-[10px] text-slate-400 uppercase">
                <th className="p-2">Vehicle</th><th className="p-2">Fuel Type</th><th className="p-2">Driver</th>
                <th className="p-2">Expected</th><th className="p-2">Actual</th><th className="p-2">Variance</th><th className="p-2">Status</th>
              </tr></thead>
              <tbody>
                {(data?.vehicleMileage ?? []).map((v) => {
                  const row = v as Record<string, unknown>;
                  const variance = Number(row.variancePct ?? 0);
                  return (
                    <tr key={String(row.id)} className="border-b border-slate-50">
                      <td className="p-2 font-bold">{String(row.vehicleNumber)}</td>
                      <td className="p-2">{String(row.fuelType)}</td>
                      <td className="p-2">{String(row.driverName)}</td>
                      <td className="p-2">{String(row.expectedMileage)} km/L</td>
                      <td className="p-2 font-semibold">{String(row.actualMileage)} km/L</td>
                      <td className={`p-2 font-bold ${Math.abs(variance) > 15 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {variance > 0 ? '+' : ''}{variance}%
                      </td>
                      <td className="p-2"><StatusBadge status={String(row.status)} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'Fuel Stations' && (
        <div className="space-y-3 mt-4">
          <button type="button" onClick={() => setShowStation(true)} className={am.btnPrimary}>
            <MapPin className="w-3.5 h-3.5" /> Add Station
          </button>
          <div className={`${am.card} overflow-x-auto`}>
            <table className="w-full text-xs">
              <thead><tr className="border-b text-left text-[10px] text-slate-400 uppercase">
                <th className="p-2">Code</th><th className="p-2">Station</th><th className="p-2">Type</th>
                <th className="p-2">Contact</th><th className="p-2">Device ID</th><th className="p-2">Device</th><th className="p-2">Status</th>
              </tr></thead>
              <tbody>
                {(data?.stations ?? []).map((s) => {
                  const row = s as Record<string, unknown>;
                  return (
                    <tr key={String(row.id)} className="border-b border-slate-50">
                      <td className="p-2">{String(row.stationCode)}</td>
                      <td className="p-2 font-bold">{String(row.stationName)}</td>
                      <td className="p-2"><StatusBadge status={String(row.stationType)} /></td>
                      <td className="p-2">{String(row.contactPerson)} — {String(row.mobile)}</td>
                      <td className="p-2 font-mono text-[10px]">{String(row.deviceIntegrationId || '—')}</td>
                      <td className="p-2"><StatusBadge status={String(row.deviceStatus)} /></td>
                      <td className="p-2"><StatusBadge status={String(row.status)} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'Fuel Cards' && (
        <div className="space-y-3 mt-4">
          <button type="button" onClick={() => setShowCard(true)} className={am.btnPrimary}>
            <CreditCard className="w-3.5 h-3.5" /> Assign Card
          </button>
          <div className={`${am.card} overflow-x-auto`}>
            <table className="w-full text-xs">
              <thead><tr className="border-b text-left text-[10px] text-slate-400 uppercase">
                <th className="p-2">Card #</th><th className="p-2">Provider</th><th className="p-2">Vehicle</th>
                <th className="p-2">Driver</th><th className="p-2">Limit</th><th className="p-2">Used</th>
                <th className="p-2">Remaining</th><th className="p-2">Expiry</th><th className="p-2">Status</th>
              </tr></thead>
              <tbody>
                {(data?.cards ?? []).map((c) => {
                  const row = c as Record<string, unknown>;
                  return (
                    <tr key={String(row.id)} className="border-b border-slate-50">
                      <td className="p-2 font-bold font-mono">{String(row.cardNumber)}</td>
                      <td className="p-2">{String(row.cardProvider)}</td>
                      <td className="p-2">{String(row.vehicleNumber || '—')}</td>
                      <td className="p-2">{String(row.driverName)}</td>
                      <td className="p-2">{formatInr(Number(row.creditLimit))}</td>
                      <td className="p-2">{formatInr(Number(row.balanceUsed))}</td>
                      <td className="p-2 text-emerald-600 font-semibold">{formatInr(Number(row.balanceRemaining))}</td>
                      <td className="p-2">{String(row.expiryDate)}</td>
                      <td className="p-2"><StatusBadge status={String(row.status)} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(tab === 'Fill Entries' || tab === 'Consumption Analysis') && (
        <div className="space-y-3 mt-4">
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search vehicle, driver…" className={`${am.input} pl-8 text-xs w-full`} />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`${am.input} text-xs`}>
              <option value="ALL">All</option>
              <option value="APPROVED">Approved</option>
              <option value="PENDING">Pending</option>
              <option value="ANOMALY">Anomaly</option>
            </select>
          </div>
          {tab === 'Consumption Analysis' && (
            <div className="grid grid-cols-3 gap-2">
              <Kpi label="Total Distance" value={`${data?.kpis.totalDistance ?? 0} km`} />
              <Kpi label="CNG (kg)" value={`${data?.kpis.totalCngKg ?? 0} kg`} />
              <Kpi label="Fleet Avg" value={`${data?.kpis.avgMileage ?? 0} km/L`} color="text-teal-600" />
            </div>
          )}
          <div className={`${am.card} overflow-x-auto`}>
            <table className="w-full text-xs">
              <thead><tr className="border-b text-left text-[10px] text-slate-400 uppercase">
                <th className="p-2">Vehicle</th><th className="p-2">Date/Time</th><th className="p-2">Qty</th>
                <th className="p-2">Amount</th><th className="p-2">Station</th><th className="p-2">Distance</th>
                <th className="p-2">Mileage</th><th className="p-2">Expected</th><th className="p-2">Source</th><th className="p-2">Status</th>
              </tr></thead>
              <tbody>
                {filteredFills.map((f) => (
                  <tr key={f.id} className={`border-b border-slate-50 ${f.anomalyFlag ? 'bg-red-50/50' : ''}`}>
                    <td className="p-2 font-bold">{f.vehicleNumber}</td>
                    <td className="p-2">{f.fillDate} {f.fillTime}</td>
                    <td className="p-2">{f.litres}{f.quantityUnit === 'KG' ? 'kg' : 'L'}</td>
                    <td className="p-2">{formatInr(f.amount)}</td>
                    <td className="p-2">{f.fuelStation}</td>
                    <td className="p-2">{f.distanceKm} km</td>
                    <td className="p-2 font-semibold">{f.actualMileage || f.mileageKm} km/{f.quantityUnit === 'KG' ? 'kg' : 'L'}</td>
                    <td className="p-2">{f.expectedMileage} km/{f.quantityUnit === 'KG' ? 'kg' : 'L'}</td>
                    <td className="p-2"><StatusBadge status={f.entrySource} /></td>
                    <td className="p-2">
                      {f.anomalyFlag
                        ? <span title={f.anomalyReason} className="text-red-600 font-bold flex items-center gap-0.5"><AlertTriangle className="w-3 h-3" /> Anomaly</span>
                        : <StatusBadge status={f.approvalStatus} />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'Requests & Approval' && (
        <div className="space-y-3 mt-4">
          <button type="button" onClick={() => setShowRequest(true)} className={am.btnPrimary}>
            <Plus className="w-3.5 h-3.5" /> New Fuel Request
          </button>
          <div className={`${am.card} overflow-x-auto`}>
            <table className="w-full text-xs">
              <thead><tr className="border-b text-left text-[10px] text-slate-400 uppercase">
                <th className="p-2">Request #</th><th className="p-2">Vehicle</th><th className="p-2">Driver</th>
                <th className="p-2">Litres</th><th className="p-2">Amount</th><th className="p-2">Purpose</th>
                <th className="p-2">Status</th><th className="p-2">When</th><th className="p-2">Actions</th>
              </tr></thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id} className="border-b border-slate-50">
                    <td className="p-2 font-bold">{r.requestNumber}</td>
                    <td className="p-2">{r.vehicleNumber}</td>
                    <td className="p-2">{r.driverName}</td>
                    <td className="p-2">{r.requestedLitres}L</td>
                    <td className="p-2">{formatInr(r.requestedAmount)}</td>
                    <td className="p-2">{r.purpose}</td>
                    <td className="p-2"><StatusBadge status={r.status} /></td>
                    <td className="p-2">{r.relativeTime}</td>
                    <td className="p-2">
                      {r.status === 'PENDING' && (
                        <div className="flex gap-1">
                          <button type="button" disabled={busy} title="Approve"
                            onClick={() => void act(() => approveFuelRequest(r.id, true), 'Request approved')}
                            className="p-1 rounded hover:bg-green-50 text-green-600"><CheckCircle2 className="w-3.5 h-3.5" /></button>
                          <button type="button" disabled={busy} title="Reject"
                            onClick={() => void act(() => approveFuelRequest(r.id, false, 'Not approved'), 'Request rejected')}
                            className="p-1 rounded hover:bg-red-50 text-red-600"><XCircle className="w-3.5 h-3.5" /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'Mileage Tracking' && (
        <div className="space-y-3 mt-4">
          <button type="button" onClick={() => setShowMileage(true)} className={am.btnPrimary}>
            <TrendingUp className="w-3.5 h-3.5" /> Log Mileage
          </button>
          <div className={`${am.card} overflow-x-auto`}>
            <table className="w-full text-xs">
              <thead><tr className="border-b text-left text-[10px] text-slate-400 uppercase">
                <th className="p-2">Vehicle</th><th className="p-2">Trip</th><th className="p-2">Date</th>
                <th className="p-2">Opening</th><th className="p-2">Closing</th><th className="p-2">Distance</th>
                <th className="p-2">Fuel Used</th><th className="p-2">Expected</th><th className="p-2">Actual</th><th className="p-2">Variance</th>
              </tr></thead>
              <tbody>
                {(data?.mileageLogs ?? []).map((m) => {
                  const row = m as Record<string, unknown>;
                  const variance = Number(row.variancePct ?? 0);
                  return (
                    <tr key={String(row.id)} className="border-b border-slate-50">
                      <td className="p-2 font-bold">{String(row.vehicleNumber)}</td>
                      <td className="p-2">{String(row.tripNumber || '—')}</td>
                      <td className="p-2">{String(row.logDate)}</td>
                      <td className="p-2">{String(row.openingOdometer)}</td>
                      <td className="p-2">{String(row.closingOdometer)}</td>
                      <td className="p-2">{String(row.distanceKm)} km</td>
                      <td className="p-2">{String(row.fuelConsumed)}{String(row.quantityUnit) === 'KG' ? 'kg' : 'L'}</td>
                      <td className="p-2">{String(row.expectedMileage)}</td>
                      <td className="p-2 font-semibold">{String(row.actualMileage)}</td>
                      <td className={`p-2 font-bold ${Math.abs(variance) > 15 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {variance > 0 ? '+' : ''}{variance}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'Theft Detection' && (
        <div className="space-y-3 mt-4">
          <div className="grid grid-cols-2 gap-2">
            <Kpi label="Open Anomalies" value={data?.kpis.openAnomalies ?? 0} color="text-red-600" />
            <Kpi label="Threshold" value={`${fuelSettings?.anomalyThresholdPct ?? 20}%`} sub="Variance alert level" />
          </div>
          <div className={`${am.card} overflow-x-auto`}>
            <table className="w-full text-xs">
              <thead><tr className="border-b text-left text-[10px] text-slate-400 uppercase">
                <th className="p-2">Vehicle</th><th className="p-2">Type</th><th className="p-2">Severity</th>
                <th className="p-2">Description</th><th className="p-2">Expected</th><th className="p-2">Actual</th>
                <th className="p-2">Variance</th><th className="p-2">Status</th><th className="p-2">Action</th>
              </tr></thead>
              <tbody>
                {(data?.anomalies ?? []).map((a) => {
                  const row = a as Record<string, unknown>;
                  return (
                    <tr key={String(row.id)} className="border-b border-slate-50">
                      <td className="p-2 font-bold">{String(row.vehicleNumber)}</td>
                      <td className="p-2"><StatusBadge status={String(row.anomalyType)} /></td>
                      <td className="p-2"><StatusBadge status={String(row.severity)} /></td>
                      <td className="p-2 max-w-xs">{String(row.description)}</td>
                      <td className="p-2">{String(row.expectedValue)}</td>
                      <td className="p-2">{String(row.actualValue)}</td>
                      <td className="p-2 text-red-600 font-bold">{String(row.variancePct)}%</td>
                      <td className="p-2"><StatusBadge status={String(row.status)} /></td>
                      <td className="p-2">
                        {row.status === 'OPEN' && (
                          <button type="button" disabled={busy}
                            onClick={() => void act(() => resolveFuelAnomaly(String(row.id)), 'Anomaly resolved')}
                            className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold">Resolve</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'Device Integration' && (
        <div className="space-y-4 mt-4">
          <div className={`${am.card} p-4`}>
            <p className="text-xs font-bold text-slate-700 flex items-center gap-2 mb-3">
              <Radio className="w-4 h-4 text-teal-600" />
              Fuel Mapping Device Integration
              <StatusBadge status={fuelSettings?.deviceIntegrationEnabled ? 'ENABLED' : 'DISABLED'} />
            </p>
            <p className="text-xs text-slate-600 mb-3">
              Auto-trace fuel vs distance from connected fuel mapping devices, GPS odometers, and CAN bus sensors.
              Device readings are reconciled against manual entries to detect theft and leakage.
            </p>
            <div className="grid md:grid-cols-2 gap-3 text-xs">
              <div>
                <p className="font-bold text-slate-500 mb-1">Providers</p>
                <div className="flex flex-wrap gap-1">
                  {((deviceRules.providers as string[]) ?? []).map((p) => (
                    <span key={p} className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 font-semibold text-[10px]">{p}</span>
                  ))}
                </div>
              </div>
              <div>
                <p className="font-bold text-slate-500 mb-1">Synced Fields</p>
                <div className="flex flex-wrap gap-1">
                  {((deviceRules.fields as string[]) ?? []).map((f) => (
                    <span key={f} className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold text-[10px]">{f}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className={`${am.card} overflow-x-auto`}>
            <p className="text-[10px] font-bold text-slate-400 uppercase p-2">Connected Stations & Devices</p>
            <table className="w-full text-xs">
              <thead><tr className="border-b text-left text-[10px] text-slate-400 uppercase">
                <th className="p-2">Station</th><th className="p-2">Device ID</th><th className="p-2">Status</th><th className="p-2">Type</th>
              </tr></thead>
              <tbody>
                {(data?.stations ?? []).filter((s) => (s as Record<string, unknown>).deviceIntegrationId).map((s) => {
                  const row = s as Record<string, unknown>;
                  return (
                    <tr key={String(row.id)} className="border-b border-slate-50">
                      <td className="p-2 font-bold">{String(row.stationName)}</td>
                      <td className="p-2 font-mono">{String(row.deviceIntegrationId)}</td>
                      <td className="p-2"><StatusBadge status={String(row.deviceStatus)} /></td>
                      <td className="p-2"><StatusBadge status={String(row.stationType)} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className={`${am.card} p-3`}>
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Recent Device-Sourced Entries</p>
            {fillEntries.filter((f) => f.entrySource === 'DEVICE').slice(0, 5).map((f) => (
              <div key={f.id} className="flex justify-between text-xs border-b border-slate-50 py-1">
                <span>{f.vehicleNumber} — {f.fillDate}</span>
                <span>Device: {f.deviceFuelReading}L / Manual: {f.litres}L / Dist: {f.deviceDistanceKm}km</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'Reports' && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-4">
          {(data?.reports ?? []).map((r) => (
            <div key={r} className={`${am.card} p-3 flex items-center gap-2 hover:bg-slate-50 cursor-pointer`}>
              <FileText className="w-4 h-4 text-amber-600 shrink-0" />
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
                <Activity className="w-3.5 h-3.5 text-amber-600" />
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
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Fuel Defaults</p>
            <div className="space-y-1 text-xs">
              <p>Expected mileage: <strong>{fuelSettings?.defaultExpectedMileage ?? 5} km/L</strong></p>
              <p>CNG mileage: <strong>{fuelSettings?.cngMileageKmPerKg ?? 4} km/kg</strong></p>
              <p>Anomaly threshold: <strong>{fuelSettings?.anomalyThresholdPct ?? 20}%</strong></p>
              <p>Auto-approve limit: <strong>{formatInr(fuelSettings?.autoApproveLimit ?? 3000)}</strong></p>
            </div>
          </div>
          <div className={`${am.card} p-3`}>
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-1">
              <Shield className="w-3 h-3" /> Role-Based Access
            </p>
            {roleMatrix.map((r) => (
              <div key={r.role} className="text-xs border-b border-slate-50 pb-1 mb-1">
                <p className="font-bold">{r.role}</p>
                <p className="text-slate-500">{r.permissions}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fill Entry Modal */}
      <AcademicModal open={showFill} onClose={() => setShowFill(false)} title="Fuel Fill Entry">
        <div className="space-y-3">
          <select value={fillForm.vehicleId} onChange={(e) => setFillForm({ ...fillForm, vehicleId: e.target.value })} className={`${am.input} text-xs w-full`}>
            <option value="">Select Vehicle</option>
            {(data?.vehicles ?? []).map((v) => <option key={v.id} value={v.id}>{v.vehicleNumber}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input value={fillForm.litres} onChange={(e) => setFillForm({ ...fillForm, litres: e.target.value })} placeholder="Quantity" type="number" className={`${am.input} text-xs`} />
            <input value={fillForm.amount} onChange={(e) => setFillForm({ ...fillForm, amount: e.target.value })} placeholder="Amount (₹)" type="number" className={`${am.input} text-xs`} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input value={fillForm.openingOdometer} onChange={(e) => setFillForm({ ...fillForm, openingOdometer: e.target.value })} placeholder="Opening odometer" type="number" className={`${am.input} text-xs`} />
            <input value={fillForm.closingOdometer} onChange={(e) => setFillForm({ ...fillForm, closingOdometer: e.target.value })} placeholder="Closing odometer" type="number" className={`${am.input} text-xs`} />
          </div>
          <select value={fillForm.fuelStationId} onChange={(e) => setFillForm({ ...fillForm, fuelStationId: e.target.value })} className={`${am.input} text-xs w-full`}>
            <option value="">Select Station</option>
            {(data?.stations ?? []).map((s) => {
              const row = s as Record<string, unknown>;
              return <option key={String(row.id)} value={String(row.id)}>{String(row.stationName)}</option>;
            })}
          </select>
          <select value={fillForm.fuelCardId} onChange={(e) => setFillForm({ ...fillForm, fuelCardId: e.target.value })} className={`${am.input} text-xs w-full`}>
            <option value="">Fuel Card (optional)</option>
            {(data?.cards ?? []).map((c) => {
              const row = c as Record<string, unknown>;
              return <option key={String(row.id)} value={String(row.id)}>{String(row.cardNumber)}</option>;
            })}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input value={fillForm.deviceFuelReading} onChange={(e) => setFillForm({ ...fillForm, deviceFuelReading: e.target.value })} placeholder="Device fuel reading" type="number" className={`${am.input} text-xs`} />
            <input value={fillForm.deviceDistanceKm} onChange={(e) => setFillForm({ ...fillForm, deviceDistanceKm: e.target.value })} placeholder="Device distance (km)" type="number" className={`${am.input} text-xs`} />
          </div>
          <input value={fillForm.driverName} onChange={(e) => setFillForm({ ...fillForm, driverName: e.target.value })} placeholder="Driver name" className={`${am.input} text-xs w-full`} />
          <button type="button" disabled={busy || !fillForm.vehicleId} className={am.btnPrimary}
            onClick={() => void act(async () => {
              const res = await recordFuelFill({
                ...fillForm,
                entrySource: fillForm.deviceFuelReading ? 'DEVICE' : 'MANUAL',
              });
              setShowFill(false);
              return res;
            }, 'Fuel fill recorded')}>
            Save Fill Entry
          </button>
        </div>
      </AcademicModal>

      {/* Request Modal */}
      <AcademicModal open={showRequest} onClose={() => setShowRequest(false)} title="Fuel Request">
        <div className="space-y-3">
          <select value={requestForm.vehicleId} onChange={(e) => setRequestForm({ ...requestForm, vehicleId: e.target.value })} className={`${am.input} text-xs w-full`}>
            <option value="">Select Vehicle</option>
            {(data?.vehicles ?? []).map((v) => <option key={v.id} value={v.id}>{v.vehicleNumber}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input value={requestForm.requestedLitres} onChange={(e) => setRequestForm({ ...requestForm, requestedLitres: e.target.value })} placeholder="Litres" type="number" className={`${am.input} text-xs`} />
            <input value={requestForm.requestedAmount} onChange={(e) => setRequestForm({ ...requestForm, requestedAmount: e.target.value })} placeholder="Amount" type="number" className={`${am.input} text-xs`} />
          </div>
          <input value={requestForm.driverName} onChange={(e) => setRequestForm({ ...requestForm, driverName: e.target.value })} placeholder="Driver name" className={`${am.input} text-xs w-full`} />
          <input value={requestForm.purpose} onChange={(e) => setRequestForm({ ...requestForm, purpose: e.target.value })} placeholder="Purpose" className={`${am.input} text-xs w-full`} />
          <button type="button" disabled={busy || !requestForm.vehicleId} className={am.btnPrimary}
            onClick={() => void act(async () => {
              const res = await createFuelRequest(requestForm);
              setShowRequest(false);
              return res;
            }, 'Fuel request submitted')}>
            Submit Request
          </button>
        </div>
      </AcademicModal>

      {/* Station Modal */}
      <AcademicModal open={showStation} onClose={() => setShowStation(false)} title="Add Fuel Station">
        <div className="space-y-3">
          <input value={stationForm.stationCode} onChange={(e) => setStationForm({ ...stationForm, stationCode: e.target.value })} placeholder="Station code" className={`${am.input} text-xs w-full`} />
          <input value={stationForm.stationName} onChange={(e) => setStationForm({ ...stationForm, stationName: e.target.value })} placeholder="Station name" className={`${am.input} text-xs w-full`} />
          <select value={stationForm.stationType} onChange={(e) => setStationForm({ ...stationForm, stationType: e.target.value })} className={`${am.input} text-xs w-full`}>
            <option value="INTERNAL">Internal</option>
            <option value="EXTERNAL">External</option>
          </select>
          <input value={stationForm.deviceIntegrationId} onChange={(e) => setStationForm({ ...stationForm, deviceIntegrationId: e.target.value })} placeholder="Device integration ID (optional)" className={`${am.input} text-xs w-full`} />
          <button type="button" disabled={busy || !stationForm.stationName} className={am.btnPrimary}
            onClick={() => void act(async () => {
              const res = await createFuelStation(stationForm);
              setShowStation(false);
              return res;
            }, 'Station added')}>
            Add Station
          </button>
        </div>
      </AcademicModal>

      {/* Card Modal */}
      <AcademicModal open={showCard} onClose={() => setShowCard(false)} title="Assign Fuel Card">
        <div className="space-y-3">
          <input value={cardForm.cardNumber} onChange={(e) => setCardForm({ ...cardForm, cardNumber: e.target.value })} placeholder="Card number" className={`${am.input} text-xs w-full`} />
          <select value={cardForm.vehicleId} onChange={(e) => setCardForm({ ...cardForm, vehicleId: e.target.value })} className={`${am.input} text-xs w-full`}>
            <option value="">Assign to vehicle</option>
            {(data?.vehicles ?? []).map((v) => <option key={v.id} value={v.id}>{v.vehicleNumber}</option>)}
          </select>
          <select value={cardForm.driverId} onChange={(e) => setCardForm({ ...cardForm, driverId: e.target.value })} className={`${am.input} text-xs w-full`}>
            <option value="">Assign to driver</option>
            {(data?.drivers ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <input value={cardForm.creditLimit} onChange={(e) => setCardForm({ ...cardForm, creditLimit: e.target.value })} placeholder="Credit limit" type="number" className={`${am.input} text-xs w-full`} />
          <button type="button" disabled={busy || !cardForm.cardNumber} className={am.btnPrimary}
            onClick={() => void act(async () => {
              const res = await assignFuelCard(cardForm);
              setShowCard(false);
              return res;
            }, 'Card assigned')}>
            Assign Card
          </button>
        </div>
      </AcademicModal>

      {/* Mileage Modal */}
      <AcademicModal open={showMileage} onClose={() => setShowMileage(false)} title="Log Mileage">
        <div className="space-y-3">
          <select value={mileageForm.vehicleId} onChange={(e) => setMileageForm({ ...mileageForm, vehicleId: e.target.value })} className={`${am.input} text-xs w-full`}>
            <option value="">Select Vehicle</option>
            {(data?.vehicles ?? []).map((v) => <option key={v.id} value={v.id}>{v.vehicleNumber}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input value={mileageForm.openingOdometer} onChange={(e) => setMileageForm({ ...mileageForm, openingOdometer: e.target.value })} placeholder="Opening odometer" type="number" className={`${am.input} text-xs`} />
            <input value={mileageForm.closingOdometer} onChange={(e) => setMileageForm({ ...mileageForm, closingOdometer: e.target.value })} placeholder="Closing odometer" type="number" className={`${am.input} text-xs`} />
          </div>
          <input value={mileageForm.fuelConsumed} onChange={(e) => setMileageForm({ ...mileageForm, fuelConsumed: e.target.value })} placeholder="Fuel consumed (L/kg)" type="number" className={`${am.input} text-xs w-full`} />
          <input value={mileageForm.driverName} onChange={(e) => setMileageForm({ ...mileageForm, driverName: e.target.value })} placeholder="Driver name" className={`${am.input} text-xs w-full`} />
          <button type="button" disabled={busy || !mileageForm.vehicleId} className={am.btnPrimary}
            onClick={() => void act(async () => {
              const res = await recordFuelMileageLog(mileageForm);
              setShowMileage(false);
              return res;
            }, 'Mileage logged')}>
            Save Mileage Log
          </button>
        </div>
      </AcademicModal>
    </AcademicPageShell>
  );
}
