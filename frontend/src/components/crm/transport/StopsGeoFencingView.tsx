import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Search, RefreshCw, Plus, MapPin, Upload, Download, CheckCircle2, AlertTriangle,
  FileSpreadsheet, Globe, Link2, Shield, Route, Map as MapIcon, Crosshair,
} from 'lucide-react';
import {
  createTransportStop, fetchTransportStopsGeoFencing,
  importStopsExcel, importStopsGoogleMaps, linkTransportStopRoute,
  updateTransportGeofence, validateTransportStopGeo,
  type TransportStopsGeoFencing,
} from '../../../lib/transportServices';
import {
  downloadStopTemplate, exportStopsToExcel, GOOGLE_MAPS_PASTE_HELP, parseStopWorkbook,
} from '../../../lib/transportStopExcel';
import {
  am, AcademicLoading, AcademicModal, AcademicPageHeader, AcademicPageShell,
  FeeTabs, StatusBadge,
} from '../FeeFinanceManagement/FeeFinanceUi';

const TABS = [
  'Dashboard', 'Stop Registry', 'Geo Map', 'Geofences', 'Excel Import',
  'Google Maps', 'Route Mapping', 'Validation', 'Reports', 'Audit', 'Settings',
] as const;
type TabId = (typeof TABS)[number];

type Stop = {
  id: string; stopCode: string; stopName: string; stopType: string;
  latitude: number; longitude: number; landmark: string; address: string;
  city: string; pincode: string; routeCode: string; routeName: string; routeId: string | null;
  sequenceOrder: number | null; geoTagSource: string; geoValidated: boolean;
  geofenceRadiusMeters: number; studentCount: number; status: string;
  googleMapsUrl: string; notes: string; hasGeofence: boolean;
  topPct: number; leftPct: number; coordLabel: string;
};

type Geofence = {
  id: string; name: string; fenceType: string; geofenceShape: string;
  latitude: number; longitude: number; radiusMeters: number;
  stopCode: string; stopName: string; isActive: boolean;
  alertOnEnter: boolean; alertOnExit: boolean; description: string;
  topPct: number; leftPct: number;
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

const stopTypeColor = (t: string) => {
  if (t === 'PICKUP') return 'bg-emerald-500';
  if (t === 'DROP') return 'bg-blue-500';
  if (t === 'SCHOOL') return 'bg-violet-500';
  return 'bg-slate-500';
};

export function StopsGeoFencingView() {
  const [data, setData] = useState<TransportStopsGeoFencing | null>(null);
  const [tab, setTab] = useState<TabId>('Dashboard');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState<Stop | null>(null);
  const [showAddStop, setShowAddStop] = useState(false);
  const [googlePaste, setGooglePaste] = useState('');
  const [importPreview, setImportPreview] = useState<{ count: number; fileName: string; rows: unknown[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [stopForm, setStopForm] = useState({
    stopName: '', stopType: 'PICKUP', latitude: '', longitude: '',
    landmark: '', address: '', city: 'Jaipur', routeId: '', geofenceRadiusMeters: '150',
  });

  const load = useCallback(async (seed = false) => {
    setLoading(true);
    try { setData(await fetchTransportStopsGeoFencing(seed, academicYear)); }
    finally { setLoading(false); }
  }, [academicYear]);

  useEffect(() => { void load(true); }, [load]);

  const stops = useMemo(() => (data?.stops ?? []) as Stop[], [data]);
  const geofences = useMemo(() => (data?.geofences ?? []) as Geofence[], [data]);
  const q = search.toLowerCase();
  const filtered = useMemo(() => stops.filter((s) => {
    const matchQ = !q || s.stopCode.toLowerCase().includes(q) || s.stopName.toLowerCase().includes(q)
      || s.routeName.toLowerCase().includes(q) || s.landmark.toLowerCase().includes(q);
    const matchS = statusFilter === 'ALL' || s.status === statusFilter
      || (statusFilter === 'VALIDATED' && s.geoValidated)
      || (statusFilter === 'PENDING' && !s.geoValidated);
    return matchQ && matchS;
  }), [stops, q, statusFilter]);

  const act = async (fn: () => Promise<unknown>, msg: string) => {
    setBusy(true); setMessage('');
    try {
      setData(await fn() as TransportStopsGeoFencing);
      setMessage(msg);
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Action failed'); }
    finally { setBusy(false); }
  };

  const handleExcelFile = async (file: File) => {
    const buf = await file.arrayBuffer();
    const rows = parseStopWorkbook(buf);
    if (!rows.length) { setMessage('No valid stop rows found in Excel file'); return; }
    setImportPreview({ count: rows.length, fileName: file.name, rows });
  };

  const roleMatrix = (data?.settings as { roleMatrix?: { role: string; permissions: string }[] })?.roleMatrix ?? [];
  const importRules = (data?.settings as { importRules?: Record<string, unknown> })?.importRules ?? {};
  const mobileSync = (data?.settings as { mobileSyncRules?: Record<string, string[]> })?.mobileSyncRules ?? {};

  if (loading && !data) return <AcademicLoading />;

  const mapStops = (data?.map.stops ?? []) as Stop[];
  const mapGeofences = (data?.map.geofences ?? []) as Geofence[];

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="Transport Management › Stops & Geo Fencing"
        title="Stops & Geo Fencing"
        subtitle="Geo-tag transport stops via Excel or Google Maps — route mapping, geofence zones & validation for better route planning"
        actions={(
          <div className="flex gap-2 flex-wrap">
            <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className={`${am.input} text-xs`}>
              {(data?.academicYears ?? ['2025-26']).map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <button type="button" onClick={() => void load()} disabled={busy} className={am.btnSecondary}>
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
            <button type="button" onClick={downloadStopTemplate} className={am.btnSecondary}>
              <Download className="w-3.5 h-3.5" /> Excel Template
            </button>
            <button type="button" onClick={() => setShowAddStop(true)} className={am.btnPrimary}>
              <Plus className="w-3.5 h-3.5" /> Add Stop
            </button>
          </div>
        )}
      />

      {message && (
        <div className={`mb-3 p-2 rounded-lg text-xs font-medium ${message.includes('fail') || message.includes('No valid') ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
          {message}
        </div>
      )}

      <FeeTabs tabs={[...TABS]} active={tab} onChange={(t) => setTab(t as TabId)} />

      {/* Dashboard */}
      {tab === 'Dashboard' && (
        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-10 gap-2">
            <Kpi label="Total Stops" value={data?.kpis.totalStops ?? 0} />
            <Kpi label="Geo Validated" value={data?.kpis.geoValidated ?? 0} color="text-emerald-600" />
            <Kpi label="Pending" value={data?.kpis.pendingValidation ?? 0} color="text-amber-600" />
            <Kpi label="With Geofence" value={data?.kpis.withGeofence ?? 0} color="text-blue-600" />
            <Kpi label="Geofences" value={data?.kpis.totalGeofences ?? 0} />
            <Kpi label="Route Mapped" value={data?.kpis.routeMapped ?? 0} />
            <Kpi label="Unmapped" value={data?.kpis.unmappedRoutes ?? 0} color="text-orange-600" />
            <Kpi label="Excel Imports" value={data?.kpis.excelImports ?? 0} />
            <Kpi label="Google Imports" value={data?.kpis.googleImports ?? 0} />
            <Kpi label="Academic Year" value={academicYear} sub="session" />
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            <div className={`lg:col-span-2 ${am.card} p-0 overflow-hidden relative`} style={{ minHeight: 300 }}>
              <div className="absolute inset-0 bg-gradient-to-br from-sky-100 via-emerald-50 to-blue-100">
                <div className="absolute inset-0 opacity-30" style={{
                  backgroundImage: 'linear-gradient(#94a3b8 1px, transparent 1px), linear-gradient(90deg, #94a3b8 1px, transparent 1px)',
                  backgroundSize: '40px 40px',
                }} />
                {mapGeofences.filter((g) => g.isActive).map((g) => (
                  <div key={g.id} className="absolute border-2 border-dashed border-blue-400/60 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ top: `${g.topPct}%`, left: `${g.leftPct}%`, width: Math.min(60, 20 + g.radiusMeters / 5), height: Math.min(60, 20 + g.radiusMeters / 5) }} />
                ))}
                {mapStops.slice(0, 30).map((s) => (
                  <div key={s.id} className="absolute z-10 -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
                    style={{ top: `${s.topPct}%`, left: `${s.leftPct}%` }}
                    onClick={() => setSelected(s)}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shadow text-white ${stopTypeColor(s.stopType)}`}>
                      <MapPin className="w-3 h-3" />
                    </div>
                    <div className="hidden group-hover:block absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-white rounded shadow px-2 py-1 text-[10px] whitespace-nowrap z-20">
                      {s.stopCode} · {s.stopName}
                    </div>
                  </div>
                ))}
              </div>
              <div className="absolute top-2 left-2 bg-white/90 rounded px-2 py-1 text-[10px] font-bold text-slate-600 flex items-center gap-1">
                <MapIcon className="w-3 h-3" /> {data?.map.provider} · {mapStops.length} stops
              </div>
              <a href={data?.map.googleMapsSearchUrl} target="_blank" rel="noreferrer"
                className="absolute top-2 right-2 bg-white/90 rounded px-2 py-1 text-[10px] font-bold text-blue-600 flex items-center gap-1 hover:underline">
                <Globe className="w-3 h-3" /> Open in Google Maps
              </a>
            </div>

            <div className={`${am.card} p-4`}>
              <h3 className="text-sm font-bold text-slate-800 mb-3">Quick Import</h3>
              <div className="space-y-2">
                <button type="button" onClick={() => setTab('Excel Import')} className={`${am.btnSecondary} w-full justify-center text-xs`}>
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Import from Excel
                </button>
                <button type="button" onClick={() => setTab('Google Maps')} className={`${am.btnSecondary} w-full justify-center text-xs`}>
                  <Globe className="w-3.5 h-3.5" /> Paste Google Maps Links
                </button>
                <button type="button" onClick={() => exportStopsToExcel(stops)} className={`${am.btnSecondary} w-full justify-center text-xs`}>
                  <Download className="w-3.5 h-3.5" /> Export Stops to Excel
                </button>
              </div>
              <div className="mt-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Recent Imports</p>
                {(data?.importLogs ?? []).slice(0, 4).map((l) => (
                  <div key={String(l.id)} className="text-[10px] py-1 border-b border-slate-100 flex justify-between">
                    <span>{String(l.sourceType)} · {String(l.fileName)}</span>
                    <span className="text-emerald-600 font-bold">{String(l.successCount)}/{String(l.totalRows)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className={`${am.card} p-3`}>
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Planning Workflow</p>
            <div className="flex flex-wrap gap-1">
              {(data?.workflow ?? []).map((w, i) => (
                <span key={w} className="flex items-center gap-1">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 font-semibold">{w}</span>
                  {i < (data?.workflow.length ?? 0) - 1 && <span className="text-slate-300">→</span>}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Stop Registry */}
      {(tab === 'Stop Registry' || tab === 'Validation' || tab === 'Route Mapping') && (
        <div className="space-y-3 mt-4">
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search stop, route, landmark…" className={`${am.input} pl-8 text-xs w-full`} />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`${am.input} text-xs`}>
              <option value="ALL">All</option>
              <option value="ACTIVE">Active</option>
              <option value="PENDING_VALIDATION">Pending Validation</option>
              <option value="VALIDATED">Geo Validated</option>
              <option value="PENDING">Not Validated</option>
            </select>
          </div>

          <div className={`${am.card} overflow-hidden`}>
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b">
                <tr>
                  {['Code', 'Stop', 'Type', 'Coordinates', 'Route', 'Seq', 'Source', 'Geofence', 'Students', 'Status', 'Actions'].map((h) => (
                    <th key={h} className={am.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="border-b hover:bg-slate-50/50">
                    <td className={am.td}><span className="font-mono font-bold">{s.stopCode}</span></td>
                    <td className={am.td}>
                      <div className="font-semibold">{s.stopName}</div>
                      <div className="text-slate-400">{s.landmark}</div>
                    </td>
                    <td className={am.td}><StatusBadge status={s.stopType} /></td>
                    <td className={am.td}>
                      <span className="font-mono text-[10px]">{s.coordLabel}</span>
                      {s.googleMapsUrl && (
                        <a href={s.googleMapsUrl} target="_blank" rel="noreferrer" className="block text-blue-600 text-[10px]">Maps ↗</a>
                      )}
                    </td>
                    <td className={am.td}>{s.routeCode || '—'}</td>
                    <td className={am.td}>{s.sequenceOrder ?? '—'}</td>
                    <td className={am.td}><StatusBadge status={s.geoTagSource} /></td>
                    <td className={am.td}>{s.hasGeofence ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <AlertTriangle className="w-4 h-4 text-amber-400" />}</td>
                    <td className={am.td}>{s.studentCount}</td>
                    <td className={am.td}><StatusBadge status={s.geoValidated ? 'VALIDATED' : s.status} /></td>
                    <td className={am.td}>
                      <div className="flex gap-1 flex-wrap">
                        <button type="button" className="text-[10px] text-blue-600 font-bold" onClick={() => setSelected(s)}>View</button>
                        {!s.geoValidated && (
                          <button type="button" disabled={busy} className="text-[10px] text-emerald-600 font-bold"
                            onClick={() => void act(() => validateTransportStopGeo(s.id), 'Stop validated')}>Validate</button>
                        )}
                        {tab === 'Route Mapping' && !s.routeId && (
                          <select className="text-[10px] border rounded px-1" defaultValue=""
                            onChange={(e) => { if (e.target.value) void act(() => linkTransportStopRoute(s.id, e.target.value), 'Route linked'); }}>
                            <option value="">Link route…</option>
                            {(data?.routes ?? []).map((r) => (
                              <option key={String(r.id)} value={String(r.id)}>{String(r.routeCode)} — {String(r.routeName)}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Geo Map */}
      {tab === 'Geo Map' && (
        <div className="mt-4 space-y-4">
          <div className={`${am.card} p-0 overflow-hidden relative`} style={{ minHeight: 480 }}>
            <div className="absolute inset-0 bg-gradient-to-br from-sky-100 via-emerald-50 to-blue-100">
              <div className="absolute inset-0 opacity-30" style={{
                backgroundImage: 'linear-gradient(#94a3b8 1px, transparent 1px), linear-gradient(90deg, #94a3b8 1px, transparent 1px)',
                backgroundSize: '40px 40px',
              }} />
              {mapGeofences.filter((g) => g.isActive).map((g) => (
                <div key={g.id} title={g.name}
                  className={`absolute border-2 border-dashed rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none ${
                    g.fenceType === 'SCHOOL' ? 'border-violet-400/70' : g.fenceType === 'DEPOT' ? 'border-orange-400/70' : 'border-blue-400/60'
                  }`}
                  style={{ top: `${g.topPct}%`, left: `${g.leftPct}%`, width: 48, height: 48 }} />
              ))}
              {mapStops.map((s) => (
                <div key={s.id} className="absolute z-10 -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
                  style={{ top: `${s.topPct}%`, left: `${s.leftPct}%` }}
                  onClick={() => setSelected(s)}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shadow-lg text-white text-[8px] font-bold ${stopTypeColor(s.stopType)}`}>
                    {s.sequenceOrder ?? '•'}
                  </div>
                  <div className="hidden group-hover:block absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-white rounded shadow-lg px-2 py-1 text-[10px] whitespace-nowrap z-20">
                    <strong>{s.stopName}</strong><br />{s.coordLabel} · {s.geofenceRadiusMeters}m zone
                  </div>
                </div>
              ))}
            </div>
            <div className="absolute bottom-2 left-2 bg-white/95 rounded p-2 text-[10px] space-y-1">
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-500" /> Pickup</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-500" /> Drop</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full border-2 border-dashed border-blue-400 w-4 h-4 rounded-full" /> Geofence</div>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Center: {data?.map.center.lat}, {data?.map.center.lng} · Use Excel or Google Maps import to add stops with precise coordinates.
          </p>
        </div>
      )}

      {/* Geofences */}
      {tab === 'Geofences' && (
        <div className="mt-4 space-y-3">
          <div className={`${am.card} overflow-hidden`}>
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b">
                <tr>
                  {['Name', 'Type', 'Stop', 'Coordinates', 'Radius', 'Alerts', 'Status', 'Actions'].map((h) => (
                    <th key={h} className={am.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {geofences.map((g) => (
                  <tr key={g.id} className="border-b">
                    <td className={am.td}><span className="font-semibold">{g.name}</span><div className="text-slate-400">{g.description}</div></td>
                    <td className={am.td}><StatusBadge status={g.fenceType} /></td>
                    <td className={am.td}>{g.stopCode || '—'} {g.stopName && `· ${g.stopName}`}</td>
                    <td className={am.td}><span className="font-mono text-[10px]">{g.latitude.toFixed(5)}, {g.longitude.toFixed(5)}</span></td>
                    <td className={am.td}>{g.radiusMeters}m</td>
                    <td className={am.td}>{g.alertOnEnter ? 'Enter' : ''}{g.alertOnEnter && g.alertOnExit ? ' / ' : ''}{g.alertOnExit ? 'Exit' : ''}</td>
                    <td className={am.td}><StatusBadge status={g.isActive ? 'ACTIVE' : 'INACTIVE'} /></td>
                    <td className={am.td}>
                      <button type="button" disabled={busy} className="text-[10px] text-blue-600 font-bold"
                        onClick={() => void act(() => updateTransportGeofence(g.id, { isActive: !g.isActive }), g.isActive ? 'Geofence disabled' : 'Geofence enabled')}>
                        {g.isActive ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Excel Import */}
      {tab === 'Excel Import' && (
        <div className="mt-4 grid lg:grid-cols-2 gap-4">
          <div className={`${am.card} p-4 space-y-3`}>
            <h3 className="text-sm font-bold flex items-center gap-2"><FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Excel Stop Import</h3>
            <p className="text-xs text-slate-600">Upload an Excel file with stop names and GPS coordinates. Auto-creates geofence zones and optionally links to routes by Route Code.</p>
            <div className="flex gap-2 flex-wrap">
              <button type="button" onClick={downloadStopTemplate} className={am.btnSecondary}>
                <Download className="w-3.5 h-3.5" /> Download Template
              </button>
              <button type="button" onClick={() => fileRef.current?.click()} className={am.btnPrimary}>
                <Upload className="w-3.5 h-3.5" /> Upload Excel
              </button>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleExcelFile(f); e.target.value = ''; }} />
            </div>
            {importPreview && (
              <div className="bg-slate-50 rounded p-3 text-xs">
                <p className="font-bold">{importPreview.fileName}</p>
                <p className="text-slate-600">{importPreview.count} stops ready to import</p>
                <button type="button" disabled={busy} className={`${am.btnPrimary} mt-2`}
                  onClick={() => void act(
                    () => importStopsExcel(importPreview.rows, importPreview.fileName, academicYear),
                    `Imported ${importPreview.count} stops from Excel`,
                  ).then(() => setImportPreview(null))}>
                  Confirm Import
                </button>
              </div>
            )}
          </div>
          <div className={`${am.card} p-4`}>
            <h3 className="text-sm font-bold mb-2">Required Columns</h3>
            <ul className="text-xs text-slate-600 space-y-1">
              {(data?.excelTemplate.columns ?? []).map((c) => (
                <li key={c} className="flex items-center gap-1"><Crosshair className="w-3 h-3 text-slate-400" /> {c}</li>
              ))}
            </ul>
            <p className="text-[10px] text-slate-400 mt-3">Sample: {(data?.excelTemplate.sampleRow ?? []).slice(0, 4).join(', ')}…</p>
          </div>
        </div>
      )}

      {/* Google Maps */}
      {tab === 'Google Maps' && (
        <div className="mt-4 grid lg:grid-cols-2 gap-4">
          <div className={`${am.card} p-4 space-y-3`}>
            <h3 className="text-sm font-bold flex items-center gap-2"><Globe className="w-4 h-4 text-blue-600" /> Google Maps Geo Tagging</h3>
            <p className="text-xs text-slate-600">Paste Google Maps URLs or lat,lng coordinates — one stop per line. Name and coordinates can be separated by |</p>
            <textarea value={googlePaste} onChange={(e) => setGooglePaste(e.target.value)} rows={10}
              placeholder={`City Center | 26.9124, 75.7873\nMalviya Nagar | https://maps.google.com/?q=26.8546,75.8142`}
              className={`${am.input} text-xs w-full font-mono`} />
            <button type="button" disabled={busy || !googlePaste.trim()} className={am.btnPrimary}
              onClick={() => void act(
                () => importStopsGoogleMaps(googlePaste, 'Google Maps paste', academicYear),
                'Google Maps stops imported',
              ).then(() => setGooglePaste(''))}>
              <Globe className="w-3.5 h-3.5" /> Import from Google Maps
            </button>
          </div>
          <div className={`${am.card} p-4`}>
            <h3 className="text-sm font-bold mb-2">Supported Formats</h3>
            <pre className="text-[10px] text-slate-600 whitespace-pre-wrap font-sans">{GOOGLE_MAPS_PASTE_HELP}</pre>
            <a href="https://www.google.com/maps" target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1 mt-3 text-xs text-blue-600 font-bold hover:underline">
              <Globe className="w-3.5 h-3.5" /> Open Google Maps to find coordinates
            </a>
          </div>
        </div>
      )}

      {/* Reports */}
      {tab === 'Reports' && (
        <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {(data?.reports ?? []).map((r) => (
            <div key={r} className={`${am.card} p-3 flex items-center gap-2 hover:bg-slate-50 cursor-pointer`}>
              <FileSpreadsheet className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-xs font-semibold text-slate-700">{r}</span>
            </div>
          ))}
        </div>
      )}

      {/* Audit */}
      {tab === 'Audit' && (
        <div className={`${am.card} overflow-hidden mt-4`}>
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b">
              <tr>{['Time', 'Entity', 'Action', 'Details', 'By'].map((h) => <th key={h} className={am.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {(data?.auditLogs ?? []).map((a) => (
                <tr key={String(a.id)} className="border-b">
                  <td className={am.td}>{String(a.relativeTime)}</td>
                  <td className={am.td}>{String(a.entityType)}</td>
                  <td className={am.td}><StatusBadge status={String(a.action)} /></td>
                  <td className={am.td}>{String(a.details)}</td>
                  <td className={am.td}>{String(a.performedBy)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Settings */}
      {tab === 'Settings' && (
        <div className="mt-4 grid lg:grid-cols-2 gap-4">
          <div className={`${am.card} p-4`}>
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2"><Shield className="w-4 h-4" /> Role Access</h3>
            <table className="w-full text-xs">
              <thead><tr><th className={am.th}>Role</th><th className={am.th}>Permissions</th></tr></thead>
              <tbody>
                {roleMatrix.map((r) => (
                  <tr key={r.role} className="border-b"><td className={am.td}><strong>{r.role}</strong></td><td className={am.td}>{r.permissions}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={`${am.card} p-4`}>
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2"><Route className="w-4 h-4" /> Import Rules</h3>
            <pre className="text-[10px] text-slate-600 whitespace-pre-wrap">{JSON.stringify(importRules, null, 2)}</pre>
            <h3 className="text-sm font-bold mt-4 mb-2">Mobile Sync</h3>
            {Object.entries(mobileSync).map(([app, features]) => (
              <div key={app} className="mb-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase">{app}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(features ?? []).map((f) => (
                    <span key={f} className="text-[10px] px-2 py-0.5 bg-slate-100 rounded">{f}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Stop Modal */}
      <AcademicModal open={showAddStop} onClose={() => setShowAddStop(false)} title="Add Stop with Geo Tag">
        <div className="space-y-3">
          <input className={`${am.input} text-xs w-full`} placeholder="Stop Name" value={stopForm.stopName}
            onChange={(e) => setStopForm({ ...stopForm, stopName: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <select className={`${am.input} text-xs`} value={stopForm.stopType} onChange={(e) => setStopForm({ ...stopForm, stopType: e.target.value })}>
              {(data?.stopTypes ?? ['PICKUP']).map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select className={`${am.input} text-xs`} value={stopForm.routeId} onChange={(e) => setStopForm({ ...stopForm, routeId: e.target.value })}>
              <option value="">No route</option>
              {(data?.routes ?? []).map((r) => <option key={String(r.id)} value={String(r.id)}>{String(r.routeCode)}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input className={`${am.input} text-xs`} placeholder="Latitude" value={stopForm.latitude}
              onChange={(e) => setStopForm({ ...stopForm, latitude: e.target.value })} />
            <input className={`${am.input} text-xs`} placeholder="Longitude" value={stopForm.longitude}
              onChange={(e) => setStopForm({ ...stopForm, longitude: e.target.value })} />
          </div>
          <input className={`${am.input} text-xs w-full`} placeholder="Landmark" value={stopForm.landmark}
            onChange={(e) => setStopForm({ ...stopForm, landmark: e.target.value })} />
          <button type="button" disabled={busy || !stopForm.stopName} className={am.btnPrimary}
            onClick={() => void act(() => createTransportStop({
              ...stopForm,
              latitude: Number(stopForm.latitude),
              longitude: Number(stopForm.longitude),
              geofenceRadiusMeters: Number(stopForm.geofenceRadiusMeters),
              academicYear,
              geoTagSource: 'MANUAL',
            }), 'Stop created').then(() => setShowAddStop(false))}>
            <MapPin className="w-3.5 h-3.5" /> Create Stop & Geofence
          </button>
        </div>
      </AcademicModal>

      {/* Stop Detail Modal */}
      <AcademicModal open={!!selected} onClose={() => setSelected(null)} title={selected ? `${selected.stopCode} — ${selected.stopName}` : ''}>
        {selected && (
          <div className="space-y-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div><span className="text-slate-400">Type</span><p className="font-bold">{selected.stopType}</p></div>
              <div><span className="text-slate-400">Source</span><p className="font-bold">{selected.geoTagSource}</p></div>
              <div><span className="text-slate-400">Coordinates</span><p className="font-mono">{selected.coordLabel}</p></div>
              <div><span className="text-slate-400">Geofence</span><p className="font-bold">{selected.geofenceRadiusMeters}m radius</p></div>
              <div><span className="text-slate-400">Route</span><p>{selected.routeCode || 'Unmapped'} {selected.routeName}</p></div>
              <div><span className="text-slate-400">Students</span><p>{selected.studentCount}</p></div>
            </div>
            {selected.googleMapsUrl && (
              <a href={selected.googleMapsUrl} target="_blank" rel="noreferrer" className="text-blue-600 font-bold flex items-center gap-1">
                <Link2 className="w-3.5 h-3.5" /> Open in Google Maps
              </a>
            )}
            {!selected.geoValidated && (
              <button type="button" disabled={busy} className={am.btnPrimary}
                onClick={() => void act(() => validateTransportStopGeo(selected.id), 'Validated').then(() => setSelected(null))}>
                <CheckCircle2 className="w-3.5 h-3.5" /> Validate Geo Tag
              </button>
            )}
          </div>
        )}
      </AcademicModal>
    </AcademicPageShell>
  );
}
