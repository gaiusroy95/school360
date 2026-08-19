import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Copy, Archive, Search, Shield, Smartphone, FileText, CheckCircle2, Plus,
  Pencil, Trash2, Link2, Loader2, Save,
} from 'lucide-react';
import {
  addMasterRouteStop,
  archiveMasterRoute,
  assignMasterStaff,
  assignMasterVehicleRoute,
  cloneMasterRoute,
  createMasterGpsDevice,
  createMasterRoute,
  createMasterStaff,
  createMasterVehicle,
  deleteMasterRouteStop,
  deleteMasterStaff,
  fetchTransportMaster,
  linkMasterGpsToVehicle,
  seedTransportMasterDemo,
  toggleMasterGpsTracking,
  toggleMasterVehicleTracking,
  updateMasterGpsDevice,
  updateMasterRouteStop,
  updateMasterStaff,
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
type ModalKind = 'gps' | 'gpsLink' | 'stop' | 'stopEdit' | 'staff' | 'staffEdit' | 'staffAssign' | null;

const GPS_VENDORS = ['TrackPro', 'FleetSync', 'GeoTrack', 'SafeRide', 'NavTrack'];
const STOP_TYPES = ['PICKUP', 'DROP', 'BOTH'];
const STAFF_ROLES = ['Driver', 'Attendant'];

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
  const [modal, setModal] = useState<ModalKind>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string | number | boolean>>({});
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

  const routeOptions = useMemo(
    () => (data?.routes ?? []).map((r) => ({ id: String(r.id), label: `${r.routeCode} — ${r.routeName}` })),
    [data],
  );
  const vehicleOptions = useMemo(
    () => (data?.vehicles ?? []).map((v) => ({ id: String(v.id), label: String(v.vehicleNumber) })),
    [data],
  );

  const openModal = (kind: ModalKind, defaults: Record<string, string | number | boolean> = {}, id?: string) => {
    setModal(kind);
    setEditId(id ?? null);
    setForm(defaults);
  };

  const run = async (fn: () => Promise<TransportMaster>, msg: string) => {
    setBusy(true);
    try { setData(await fn()); setMessage(msg); }
    finally { setBusy(false); }
  };

  const saveModal = async () => {
    if (!modal) return;
    setBusy(true);
    try {
      let result: TransportMaster;
      switch (modal) {
        case 'gps':
          if (editId) {
            result = await updateMasterGpsDevice(editId, form);
            setMessage('GPS device updated');
          } else {
            result = await createMasterGpsDevice(form);
            setMessage('GPS device registered');
          }
          break;
        case 'gpsLink':
          result = await linkMasterGpsToVehicle(editId!, String(form.vehicleId));
          setMessage('GPS mapped to vehicle — live tracking enabled');
          break;
        case 'stop':
          result = await addMasterRouteStop(String(form.routeId), { ...form, academicYear });
          setMessage('Pickup/drop stop added');
          break;
        case 'stopEdit':
          result = await updateMasterRouteStop(editId!, form);
          setMessage('Stop updated');
          break;
        case 'staff':
          result = await createMasterStaff(form);
          setMessage('Staff member added');
          break;
        case 'staffEdit':
          result = await updateMasterStaff(editId!, form);
          setMessage('Staff updated');
          break;
        case 'staffAssign':
          result = await assignMasterStaff(editId!, {
            vehicleId: form.vehicleId, routeId: form.routeId || undefined,
          });
          setMessage('Driver/attendant assigned to vehicle');
          break;
        default:
          return;
      }
      setData(result);
      setModal(null);
    } finally { setBusy(false); }
  };

  if (loading && !data) return <AcademicLoading />;

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="Transport Management › Route & Vehicle Master"
        title="Route & Vehicle Master"
        subtitle="Centralized transport master — routes, vehicles, GPS devices, drivers, attendants & mobile app sync"
        actions={(
          <div className="flex gap-2 items-center">
            <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className={`${am.input} text-xs`}>
              {(data?.academicYears ?? ['2025-26']).map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <button type="button" disabled={busy} onClick={() => run(seedTransportMasterDemo, 'Demo transport master data loaded')} className={am.btnSecondary}>
              Load Demo Data
            </button>
          </div>
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

        {(tab === 'Routes' || tab === 'Vehicles' || tab === 'GPS Devices' || tab === 'Pickup/Drop Stops' || tab === 'Staff') && (
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
            {tab === 'GPS Devices' && (
              <button type="button" onClick={() => openModal('gps', { deviceId: '', simNumber: '', imei: '', vendor: 'TrackPro' })} className={am.btnPrimary}>
                <Plus size={14} /> Setup GPS Device
              </button>
            )}
            {tab === 'Pickup/Drop Stops' && (
              <button type="button" disabled={routeOptions.length === 0} onClick={() => openModal('stop', {
                routeId: routeOptions[0]?.id ?? '', stopType: 'PICKUP', stopName: '', landmark: '',
                latitude: 26.9124, longitude: 75.7873, estimatedArrival: '07:30 AM', sequenceOrder: 1,
              })} className={am.btnPrimary}>
                <Plus size={14} /> Add Pickup/Drop Stop
              </button>
            )}
            {tab === 'Staff' && (
              <button type="button" onClick={() => openModal('staff', { name: '', role: 'Driver', mobile: '', licenseNumber: '', yearsExperience: 0 })} className={am.btnPrimary}>
                <Plus size={14} /> Add Staff
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
                  <th className={am.th}>Route</th>
                  <th className={am.th}>Connectivity</th>
                  <th className={am.th}>Battery</th>
                  <th className={am.th}>Live Track</th>
                  <th className={am.th}>Status</th>
                  <th className={am.th}>Actions</th>
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
                    <td className={am.td}>{String(g.linkedRoute) !== '—' ? `${g.linkedRouteCode} · ${g.linkedRoute}` : '—'}</td>
                    <td className={am.td}><StatusBadge status={String(g.connectivityStatus)} /></td>
                    <td className={am.td}>{Number(g.batteryLevel)}%</td>
                    <td className={am.td}>
                      <button type="button" disabled={busy} onClick={() => run(() => toggleMasterGpsTracking(String(g.id), !g.liveTrackingEnabled), 'GPS tracking updated')} className={`text-xs font-bold ${g.liveTrackingEnabled ? 'text-green-700' : 'text-slate-400'}`}>
                        {g.liveTrackingEnabled ? 'ON' : 'OFF'}
                      </button>
                    </td>
                    <td className={am.td}><StatusBadge status={String(g.status)} /></td>
                    <td className={am.td}>
                      <div className="flex gap-1 items-center">
                        <button type="button" disabled={busy} title="Map to vehicle" onClick={() => openModal('gpsLink', { vehicleId: vehicleOptions[0]?.id ?? '' }, String(g.id))} className="text-xs text-blue-700"><Link2 size={12} /></button>
                        <button type="button" disabled={busy} title="Edit" onClick={() => openModal('gps', { simNumber: String(g.simNumber), imei: String(g.imei), vendor: String(g.vendor), connectivityStatus: String(g.connectivityStatus) }, String(g.id))} className="text-xs text-slate-600"><Pencil size={12} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {data.gpsDevices.length === 0 && (
                  <tr><td colSpan={11} className={`${am.td} text-center text-slate-400 py-8`}>No GPS devices — click Setup GPS Device to register and map to routes via vehicles</td></tr>
                )}
              </tbody>
            </table>
            <p className="text-xs text-slate-500 mt-2 p-2">GPS devices map to vehicles; vehicles map to routes. Live tracking syncs to Live Vehicle Tracking module.</p>
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
                  <th className={am.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.stops.map((s) => (
                  <tr key={String(s.id)}>
                    <td className={am.td}>{String(s.routeCode)} · {String(s.routeName)}</td>
                    <td className={am.td}>{Number(s.sequenceOrder)}</td>
                    <td className={am.td}><StatusBadge status={String(s.stopType)} /></td>
                    <td className={am.td}>{String(s.stopName)}</td>
                    <td className={am.td}>{String(s.landmark)}</td>
                    <td className={am.td}>{String(s.estimatedArrival) || '—'}</td>
                    <td className={am.td}><span className="text-xs font-mono">{Number(s.latitude).toFixed(4)}, {Number(s.longitude).toFixed(4)}</span></td>
                    <td className={am.td}>
                      <div className="flex gap-1">
                        <button type="button" disabled={busy} onClick={() => openModal('stopEdit', {
                          stopType: String(s.stopType), stopName: String(s.stopName), landmark: String(s.landmark),
                          latitude: Number(s.latitude), longitude: Number(s.longitude),
                          estimatedArrival: String(s.estimatedArrival ?? ''), sequenceOrder: Number(s.sequenceOrder),
                        }, String(s.id))} className="text-xs text-blue-700"><Pencil size={12} /></button>
                        <button type="button" disabled={busy} onClick={() => run(() => deleteMasterRouteStop(String(s.id)), 'Stop deleted')} className="text-xs text-red-700"><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {data.stops.length === 0 && (
                  <tr><td colSpan={8} className={`${am.td} text-center text-slate-400 py-8`}>No stops — add pickup/drop points to routes</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'Staff' && data && (
          <div className={am.tableWrap}>
            <table className="w-full">
              <thead>
                <tr>
                  <th className={am.th}>Code</th>
                  <th className={am.th}>Name</th>
                  <th className={am.th}>Role</th>
                  <th className={am.th}>Mobile</th>
                  <th className={am.th}>License</th>
                  <th className={am.th}>Route</th>
                  <th className={am.th}>Vehicle</th>
                  <th className={am.th}>On Duty</th>
                  <th className={am.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.staff.map((s) => (
                  <tr key={String(s.id)}>
                    <td className={am.td}><span className="font-mono text-xs">{String(s.employeeCode)}</span></td>
                    <td className={am.td}>{String(s.name)}</td>
                    <td className={am.td}><StatusBadge status={String(s.role)} /></td>
                    <td className={am.td}>{String(s.mobile)}</td>
                    <td className={am.td}>{String(s.licenseNumber) || '—'}</td>
                    <td className={am.td}>{String(s.routeName) || '—'}</td>
                    <td className={am.td}>{String(s.vehicleNumber) || '—'}</td>
                    <td className={am.td}>{s.onDuty ? 'Yes' : 'No'}</td>
                    <td className={am.td}>
                      <div className="flex gap-1 flex-wrap items-center">
                        <button type="button" disabled={busy} onClick={() => openModal('staffEdit', {
                          name: String(s.name), role: String(s.role), mobile: String(s.mobile),
                          licenseNumber: String(s.licenseNumber ?? ''), onDuty: Boolean(s.onDuty),
                          yearsExperience: 0,
                        }, String(s.id))} className="text-xs text-blue-700"><Pencil size={12} /></button>
                        <button type="button" disabled={busy} onClick={() => openModal('staffAssign', {
                          vehicleId: String(s.assignedVehicleId || vehicleOptions[0]?.id || ''),
                          routeId: String(s.assignedRouteId || routeOptions[0]?.id || ''),
                        }, String(s.id))} className="text-xs text-amber-700 font-bold">Assign</button>
                        <button type="button" disabled={busy} onClick={() => run(() => deleteMasterStaff(String(s.id)), 'Staff removed')} className="text-xs text-red-700"><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {data.staff.length === 0 && (
                  <tr><td colSpan={9} className={`${am.td} text-center text-slate-400 py-8`}>No transport staff — add drivers and attendants</td></tr>
                )}
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

      <AcademicModal
        open={modal !== null}
        onClose={() => setModal(null)}
        title={
          modal === 'gps' ? (editId ? 'Edit GPS Device' : 'Setup GPS Device')
            : modal === 'gpsLink' ? 'Map GPS to Vehicle'
              : modal === 'stop' ? 'Add Pickup/Drop Stop'
                : modal === 'stopEdit' ? 'Edit Stop'
                  : modal === 'staff' ? 'Add Transport Staff'
                    : modal === 'staffEdit' ? 'Edit Staff'
                      : modal === 'staffAssign' ? 'Assign Driver / Attendant'
                        : ''
        }
        large
      >
        {modal === 'gps' && (
          <div className="space-y-3">
            {!editId && <input placeholder="Device ID (auto if blank)" value={String(form.deviceId ?? '')} onChange={(e) => setForm({ ...form, deviceId: e.target.value })} className={am.input} />}
            <input placeholder="SIM Number" value={String(form.simNumber ?? '')} onChange={(e) => setForm({ ...form, simNumber: e.target.value })} className={am.input} />
            <input placeholder="IMEI" value={String(form.imei ?? '')} onChange={(e) => setForm({ ...form, imei: e.target.value })} className={am.input} />
            <select value={String(form.vendor ?? 'TrackPro')} onChange={(e) => setForm({ ...form, vendor: e.target.value })} className={am.input}>
              {(data?.gpsVendors ?? GPS_VENDORS).map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
            {editId && (
              <select value={String(form.connectivityStatus ?? 'ONLINE')} onChange={(e) => setForm({ ...form, connectivityStatus: e.target.value })} className={am.input}>
                {['ONLINE', 'OFFLINE', 'LOW_BATTERY'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
          </div>
        )}

        {modal === 'gpsLink' && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">Link this GPS device to a vehicle. The vehicle&apos;s route will be tracked in Live Vehicle Tracking.</p>
            <select value={String(form.vehicleId ?? '')} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })} className={am.input}>
              {vehicleOptions.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
            </select>
          </div>
        )}

        {(modal === 'stop' || modal === 'stopEdit') && (
          <div className="space-y-3">
            {modal === 'stop' && (
              <select value={String(form.routeId ?? '')} onChange={(e) => setForm({ ...form, routeId: e.target.value })} className={am.input}>
                {routeOptions.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
            )}
            <select value={String(form.stopType ?? 'PICKUP')} onChange={(e) => setForm({ ...form, stopType: e.target.value })} className={am.input}>
              {(data?.stopTypes ?? STOP_TYPES).map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <input placeholder="Stop Name" value={String(form.stopName ?? '')} onChange={(e) => setForm({ ...form, stopName: e.target.value })} className={am.input} />
            <input placeholder="Landmark" value={String(form.landmark ?? '')} onChange={(e) => setForm({ ...form, landmark: e.target.value })} className={am.input} />
            <input placeholder="ETA (e.g. 07:30 AM)" value={String(form.estimatedArrival ?? '')} onChange={(e) => setForm({ ...form, estimatedArrival: e.target.value })} className={am.input} />
            <div className="grid grid-cols-2 gap-2">
              <input type="number" step="0.0001" placeholder="Latitude" value={Number(form.latitude ?? 0)} onChange={(e) => setForm({ ...form, latitude: Number(e.target.value) })} className={am.input} />
              <input type="number" step="0.0001" placeholder="Longitude" value={Number(form.longitude ?? 0)} onChange={(e) => setForm({ ...form, longitude: Number(e.target.value) })} className={am.input} />
            </div>
            <input type="number" placeholder="Sequence" value={Number(form.sequenceOrder ?? 1)} onChange={(e) => setForm({ ...form, sequenceOrder: Number(e.target.value) })} className={am.input} />
          </div>
        )}

        {(modal === 'staff' || modal === 'staffEdit') && (
          <div className="space-y-3">
            <input placeholder="Full Name" value={String(form.name ?? '')} onChange={(e) => setForm({ ...form, name: e.target.value })} className={am.input} />
            <select value={String(form.role ?? 'Driver')} onChange={(e) => setForm({ ...form, role: e.target.value })} className={am.input} disabled={modal === 'staffEdit'}>
              {(data?.staffRoles ?? STAFF_ROLES).map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <input placeholder="Mobile" value={String(form.mobile ?? '')} onChange={(e) => setForm({ ...form, mobile: e.target.value })} className={am.input} />
            <input placeholder="License Number (drivers)" value={String(form.licenseNumber ?? '')} onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })} className={am.input} />
            {modal === 'staffEdit' && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={Boolean(form.onDuty)} onChange={(e) => setForm({ ...form, onDuty: e.target.checked })} />
                On duty
              </label>
            )}
          </div>
        )}

        {modal === 'staffAssign' && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">Assign this staff member to a vehicle and route. Driver name/mobile or attendant name syncs to the vehicle master.</p>
            <select value={String(form.vehicleId ?? '')} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })} className={am.input}>
              {vehicleOptions.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
            </select>
            <select value={String(form.routeId ?? '')} onChange={(e) => setForm({ ...form, routeId: e.target.value })} className={am.input}>
              {routeOptions.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <button type="button" onClick={() => setModal(null)} className={am.btnSecondary}>Cancel</button>
          <button type="button" disabled={busy} onClick={() => void saveModal()} className={am.btnPrimary}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
          </button>
        </div>
      </AcademicModal>
    </AcademicPageShell>
  );
}
