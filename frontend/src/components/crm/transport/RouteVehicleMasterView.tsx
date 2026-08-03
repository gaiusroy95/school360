import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Copy, Archive, Search, Shield, Smartphone, FileText, CheckCircle2, Plus,
} from 'lucide-react';
import {
  archiveMasterRoute,
  assignMasterVehicleRoute,
  cloneMasterRoute,
  createMasterRoute,
  createMasterVehicle,
  fetchTransportMaster,
  toggleMasterVehicleTracking,
  type TransportMaster,
} from '../../../lib/transportServices';
import {
  am, AcademicLoading, AcademicModal, AcademicPageHeader, AcademicPageShell,
  FeeTabs, StatusBadge,
} from '../FeeFinanceManagement/FeeFinanceUi';

const TABS = [
  'Overview', 'Routes', 'Vehicles', 'GPS Devices', 'Pickup/Drop Stops',
  'Staff', 'Audit Trail', 'Settings',
] as const;
type TabId = (typeof TABS)[number];

function Kpi({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className={`${am.card} p-3`}>
      <p className="text-[10px] font-bold text-slate-400 uppercase">{label}</p>
      <p className="text-xl font-black text-slate-900 mt-1">{value}</p>
      {sub && <p className="text-[10px] text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

export function RouteVehicleMasterView() {
  const [data, setData] = useState<TransportMaster | null>(null);
  const [tab, setTab] = useState<TabId>('Overview');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [message, setMessage] = useState('');
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [routeForm, setRouteForm] = useState({ routeName: '', routeType: 'Two-way', branch: 'Main Campus', distanceKm: 12 });
  const [vehicleForm, setVehicleForm] = useState({ vehicleNumber: '', registrationNumber: '', vehicleType: 'Bus', capacity: 40 });

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await fetchTransportMaster(undefined, academicYear)); }
    finally { setLoading(false); }
  }, [academicYear]);

  useEffect(() => { void load(); }, [load]);

  const q = search.toLowerCase();
  const filteredRoutes = useMemo(() => (data?.routes ?? []).filter((r) =>
    !q || String(r.routeName).toLowerCase().includes(q) || String(r.routeCode).toLowerCase().includes(q),
  ), [data, q]);
  const filteredVehicles = useMemo(() => (data?.vehicles ?? []).filter((v) =>
    !q || String(v.vehicleNumber).toLowerCase().includes(q) || String(v.registrationNumber).toLowerCase().includes(q),
  ), [data, q]);

  const roleMatrix = (data?.settings?.roleMatrix ?? []) as { role: string; permissions: string }[];

  if (loading && !data) return <AcademicLoading />;

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="Transport Management › Route & Vehicle Master"
        title="Route & Vehicle Master"
        subtitle="Centralized transport master — routes, vehicles, GPS devices, drivers, attendants & mobile app sync"
        actions={(
          <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className={`${am.input} text-xs`}>
            {(data?.academicYears ?? ['2025-26']).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        )}
      />

      <div className={am.content}>
        <FeeTabs tabs={[...TABS]} active={tab} onChange={(t) => setTab(t as TabId)} />

        {message && (
          <div className="mb-4 px-4 py-2 bg-amber-50 text-amber-900 text-sm rounded-lg border border-amber-200">{message}</div>
        )}

        {tab === 'Overview' && data && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <Kpi label="Total Routes" value={data.kpis.totalRoutes} />
              <Kpi label="Active Vehicles" value={data.kpis.activeVehicles} />
              <Kpi label="GPS Online" value={`${data.kpis.gpsOnline}/${data.kpis.gpsTotal}`} />
              <Kpi label="Routes Running" value={data.kpis.routesRunning} />
              <Kpi label="In Maintenance" value={data.kpis.vehiclesInMaintenance} />
              <Kpi label="Route Occupancy" value={`${data.kpis.routeOccupancy}%`} />
            </div>
            <div className="grid lg:grid-cols-2 gap-4">
              <div className={`${am.card} p-4`}>
                <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><Smartphone size={16} /> Mobile App Synchronization</h3>
                {data.mobileSync.map((item) => (
                  <p key={item} className="flex items-start gap-2 text-sm text-slate-600 mb-1">
                    <CheckCircle2 size={14} className="text-green-600 shrink-0 mt-0.5" />{item}
                  </p>
                ))}
              </div>
              <div className={`${am.card} p-4`}>
                <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><FileText size={16} /> Available Reports</h3>
                <div className="flex flex-wrap gap-2">
                  {data.reports.map((r) => (
                    <span key={r} className="px-2 py-1 bg-slate-100 rounded text-xs text-slate-700">{r}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {(tab === 'Routes' || tab === 'Vehicles' || tab === 'GPS Devices' || tab === 'Pickup/Drop Stops') && (
          <div className="mb-3 flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input placeholder="Search routes, vehicles, GPS…" value={search} onChange={(e) => setSearch(e.target.value)} className={`${am.input} pl-9`} />
            </div>
            {tab === 'Routes' && (
              <button type="button" onClick={() => setShowRouteModal(true)} className={am.btnPrimary}>
                <Plus size={14} /> New Route
              </button>
            )}
            {tab === 'Vehicles' && (
              <button type="button" onClick={() => setShowVehicleModal(true)} className={am.btnPrimary}>
                <Plus size={14} /> New Vehicle
              </button>
            )}
          </div>
        )}

        {tab === 'Routes' && data && (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead>
                <tr>
                  <th className={am.th}>Code</th>
                  <th className={am.th}>Route Name</th>
                  <th className={am.th}>Type</th>
                  <th className={am.th}>Branch</th>
                  <th className={am.th}>Distance</th>
                  <th className={am.th}>Duration</th>
                  <th className={am.th}>Stops</th>
                  <th className={am.th}>Students</th>
                  <th className={am.th}>Occupancy</th>
                  <th className={am.th}>Status</th>
                  <th className={am.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRoutes.map((r) => (
                  <tr key={String(r.id)}>
                    <td className={am.td}>
                      <span className="font-mono font-bold flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: String(r.routeColor) }} />
                        {String(r.routeCode)}
                      </span>
                    </td>
                    <td className={am.td}>{String(r.routeName)}</td>
                    <td className={am.td}>{String(r.routeType)}</td>
                    <td className={am.td}>{String(r.branch)}</td>
                    <td className={am.td}>{Number(r.distanceKm)} km</td>
                    <td className={am.td}>{Number(r.durationMinutes)} min</td>
                    <td className={am.td}>{Number(r.stopCount)}</td>
                    <td className={am.td}>{Number(r.studentCount)}</td>
                    <td className={am.td}>{Number(r.occupancyPct)}%</td>
                    <td className={am.td}><StatusBadge status={String(r.status)} /></td>
                    <td className={am.td}>
                      <div className="flex gap-1">
                        <button type="button" title="Clone" onClick={async () => {
                          setBusy(true);
                          try { setData(await cloneMasterRoute(String(r.id))); setMessage('Route cloned'); }
                          finally { setBusy(false); }
                        }} className="text-xs text-blue-700 font-bold"><Copy size={12} /></button>
                        <button type="button" title="Archive" onClick={async () => {
                          setBusy(true);
                          try { setData(await archiveMasterRoute(String(r.id))); setMessage('Route archived'); }
                          finally { setBusy(false); }
                        }} className="text-xs text-red-700 font-bold"><Archive size={12} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'Vehicles' && data && (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead>
                <tr>
                  <th className={am.th}>Vehicle</th>
                  <th className={am.th}>Registration</th>
                  <th className={am.th}>Type</th>
                  <th className={am.th}>Route</th>
                  <th className={am.th}>Driver</th>
                  <th className={am.th}>Capacity</th>
                  <th className={am.th}>GPS</th>
                  <th className={am.th}>Tracking</th>
                  <th className={am.th}>Status</th>
                  <th className={am.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVehicles.map((v) => (
                  <tr key={String(v.id)}>
                    <td className={am.td}><span className="font-bold">{String(v.vehicleNumber)}</span></td>
                    <td className={am.td}><span className="font-mono text-xs">{String(v.registrationNumber)}</span></td>
                    <td className={am.td}>{String(v.vehicleType)}</td>
                    <td className={am.td}>{String(v.routeName) || '—'}</td>
                    <td className={am.td}>{String(v.driverName) || '—'}</td>
                    <td className={am.td}>{Number(v.effectiveCapacity)}/{Number(v.capacity)}</td>
                    <td className={am.td}>
                      <StatusBadge status={String(v.gpsStatus)} />
                      <span className="text-[10px] text-slate-400 ml-1">{String(v.gpsDeviceId)}</span>
                    </td>
                    <td className={am.td}>
                      <button type="button" onClick={async () => {
                        setBusy(true);
                        try {
                          setData(await toggleMasterVehicleTracking(String(v.id), !v.liveTrackingEnabled));
                        } finally { setBusy(false); }
                      }} className={`text-xs font-bold ${v.liveTrackingEnabled ? 'text-green-700' : 'text-slate-400'}`}>
                        {v.liveTrackingEnabled ? 'ON' : 'OFF'}
                      </button>
                    </td>
                    <td className={am.td}><StatusBadge status={String(v.availabilityStatus)} /></td>
                    <td className={am.td}>
                      {data.routes[0] && (
                        <button type="button" onClick={async () => {
                          setBusy(true);
                          try {
                            setData(await assignMasterVehicleRoute(String(v.id), String(data.routes[0].id)));
                            setMessage('Route assigned');
                          } finally { setBusy(false); }
                        }} className="text-xs text-amber-700 font-bold">Assign</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'GPS Devices' && data && (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead>
                <tr>
                  <th className={am.th}>Device ID</th>
                  <th className={am.th}>SIM</th>
                  <th className={am.th}>IMEI</th>
                  <th className={am.th}>Vendor</th>
                  <th className={am.th}>Vehicle</th>
                  <th className={am.th}>Connectivity</th>
                  <th className={am.th}>Battery</th>
                  <th className={am.th}>Live Track</th>
                  <th className={am.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.gpsDevices.map((g) => (
                  <tr key={String(g.id)}>
                    <td className={am.td}><span className="font-mono font-bold">{String(g.deviceId)}</span></td>
                    <td className={am.td}>{String(g.simNumber)}</td>
                    <td className={am.td}><span className="text-xs">{String(g.imei)}</span></td>
                    <td className={am.td}>{String(g.vendor)}</td>
                    <td className={am.td}>{String(g.linkedVehicle)}</td>
                    <td className={am.td}><StatusBadge status={String(g.connectivityStatus)} /></td>
                    <td className={am.td}>{Number(g.batteryLevel)}%</td>
                    <td className={am.td}>{g.liveTrackingEnabled ? 'Enabled' : 'Paused'}</td>
                    <td className={am.td}><StatusBadge status={String(g.status)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'Pickup/Drop Stops' && data && (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead>
                <tr>
                  <th className={am.th}>Route</th>
                  <th className={am.th}>Seq</th>
                  <th className={am.th}>Type</th>
                  <th className={am.th}>Stop Name</th>
                  <th className={am.th}>Landmark</th>
                  <th className={am.th}>ETA</th>
                  <th className={am.th}>Coordinates</th>
                </tr>
              </thead>
              <tbody>
                {data.stops.map((s) => (
                  <tr key={String(s.id)}>
                    <td className={am.td}>{String(s.routeCode)}</td>
                    <td className={am.td}>{Number(s.sequenceOrder)}</td>
                    <td className={am.td}><StatusBadge status={String(s.stopType)} /></td>
                    <td className={am.td}>{String(s.stopName)}</td>
                    <td className={am.td}>{String(s.landmark)}</td>
                    <td className={am.td}>{String(s.estimatedArrival) || '—'}</td>
                    <td className={am.td}><span className="text-xs font-mono">{Number(s.latitude).toFixed(4)}, {Number(s.longitude).toFixed(4)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'Staff' && data && (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead>
                <tr>
                  <th className={am.th}>Name</th>
                  <th className={am.th}>Role</th>
                  <th className={am.th}>Mobile</th>
                  <th className={am.th}>On Duty</th>
                </tr>
              </thead>
              <tbody>
                {data.staff.map((s) => (
                  <tr key={String(s.id)}>
                    <td className={am.td}>{String(s.name)}</td>
                    <td className={am.td}><StatusBadge status={String(s.role)} /></td>
                    <td className={am.td}>{String(s.mobile)}</td>
                    <td className={am.td}>{s.onDuty ? 'Yes' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'Audit Trail' && data && (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead>
                <tr>
                  <th className={am.th}>Entity</th>
                  <th className={am.th}>Label</th>
                  <th className={am.th}>Action</th>
                  <th className={am.th}>By</th>
                  <th className={am.th}>Reason</th>
                  <th className={am.th}>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {data.auditLogs.map((a) => (
                  <tr key={String(a.id)}>
                    <td className={am.td}>{String(a.entityType)}</td>
                    <td className={am.td}>{String(a.entityLabel)}</td>
                    <td className={am.td}>{String(a.action)}</td>
                    <td className={am.td}>{String(a.performedBy)}</td>
                    <td className={am.td}>{String(a.reason) || '—'}</td>
                    <td className={am.td}>{new Date(String(a.createdAt)).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'Settings' && data && (
          <div className="space-y-4">
            <div className={`${am.card} p-4`}>
              <h3 className="font-bold text-slate-800 mb-2">Route Code Settings</h3>
              <p className="text-sm text-slate-600">Prefix: <strong>{String(data.settings.routeCodePrefix)}</strong> · Auto-generate: <strong>{data.settings.autoRouteCode ? 'Yes' : 'No'}</strong></p>
            </div>
            <div className={`${am.card} p-4`}>
              <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><Shield size={16} /> Role-Based Access</h3>
              <table className="w-full text-sm">
                <thead><tr><th className={am.th}>Role</th><th className={am.th}>Permissions</th></tr></thead>
                <tbody>
                  {roleMatrix.map((r) => (
                    <tr key={r.role}><td className={am.td}><strong>{r.role}</strong></td><td className={am.td}>{r.permissions}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid md:grid-cols-3 gap-3">
              {[
                { title: 'Route Master', items: ['Create, Edit, Delete, Archive, Clone', 'Auto/Manual route codes', 'Pickup & drop points', 'Geo mapping & route colors'] },
                { title: 'Vehicle Master', items: ['Registration & compliance docs', 'GPS & mobile GPS mapping', 'Driver/attendant assignment', 'Seat config & capacity control'] },
                { title: 'Integrations', items: ['RFID/QR attendance', 'CCTV & panic button', 'Bulk import/export', 'Parent/Staff/Principal app sync'] },
              ].map((block) => (
                <div key={block.title} className={`${am.card} p-4`}>
                  <h4 className="font-bold text-slate-800 mb-2">{block.title}</h4>
                  {block.items.map((item) => (
                    <p key={item} className="text-xs text-slate-600 flex gap-1 mb-1">
                      <CheckCircle2 size={12} className="text-green-600 shrink-0 mt-0.5" />{item}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <AcademicModal open={showRouteModal} onClose={() => setShowRouteModal(false)} title="Create Route" large>
        <div className="space-y-3">
          <input placeholder="Route Name" value={routeForm.routeName} onChange={(e) => setRouteForm({ ...routeForm, routeName: e.target.value })} className={am.input} />
          <select value={routeForm.routeType} onChange={(e) => setRouteForm({ ...routeForm, routeType: e.target.value })} className={am.input}>
            {(data?.routeTypes ?? []).map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input placeholder="Branch" value={routeForm.branch} onChange={(e) => setRouteForm({ ...routeForm, branch: e.target.value })} className={am.input} />
          <input type="number" placeholder="Distance (km)" value={routeForm.distanceKm} onChange={(e) => setRouteForm({ ...routeForm, distanceKm: Number(e.target.value) })} className={am.input} />
          <button type="button" disabled={busy || !routeForm.routeName} onClick={async () => {
            setBusy(true);
            try {
              setData(await createMasterRoute({ ...routeForm, academicYear }));
              setShowRouteModal(false);
              setMessage('Route created');
            } finally { setBusy(false); }
          }} className={am.btnPrimary}>Create Route</button>
        </div>
      </AcademicModal>

      <AcademicModal open={showVehicleModal} onClose={() => setShowVehicleModal(false)} title="Add Vehicle" large>
        <div className="space-y-3">
          <input placeholder="Vehicle Number" value={vehicleForm.vehicleNumber} onChange={(e) => setVehicleForm({ ...vehicleForm, vehicleNumber: e.target.value })} className={am.input} />
          <input placeholder="Registration Number" value={vehicleForm.registrationNumber} onChange={(e) => setVehicleForm({ ...vehicleForm, registrationNumber: e.target.value })} className={am.input} />
          <select value={vehicleForm.vehicleType} onChange={(e) => setVehicleForm({ ...vehicleForm, vehicleType: e.target.value })} className={am.input}>
            {(data?.vehicleTypes ?? []).map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input type="number" placeholder="Capacity" value={vehicleForm.capacity} onChange={(e) => setVehicleForm({ ...vehicleForm, capacity: Number(e.target.value) })} className={am.input} />
          <button type="button" disabled={busy} onClick={async () => {
            setBusy(true);
            try {
              setData(await createMasterVehicle(vehicleForm));
              setShowVehicleModal(false);
              setMessage('Vehicle added');
            } finally { setBusy(false); }
          }} className={am.btnPrimary}>Add Vehicle</button>
        </div>
      </AcademicModal>
    </AcademicPageShell>
  );
}
