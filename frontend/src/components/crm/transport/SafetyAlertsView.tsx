import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Search, RefreshCw, AlertTriangle, Shield, MapPin, Radio, Smartphone,
  CheckCircle2, ArrowUpCircle, XCircle, Siren, Camera, FileText,
} from 'lucide-react';
import {
  acknowledgeSafetyAlert, escalateSafetyAlert, fetchTransportSafetyAlerts,
  resolveSafetyAlert, reviewSafetyReport, submitMobileSafetyReport,
  triggerGpsAccidentAlert, triggerSosAlert, type TransportSafetyAlerts,
} from '../../../lib/transportServices';
import {
  am, AcademicLoading, AcademicModal, AcademicPageHeader, AcademicPageShell,
  FeeTabs, StatusBadge,
} from '../FeeFinanceManagement/FeeFinanceUi';

const TABS = [
  'Dashboard', 'Live Alerts', 'Accident Reports', 'GPS Auto Alerts', 'Mobile Reports',
  'Incident Map', 'Escalations', 'Reports', 'Mobile Sync', 'Audit', 'Settings',
] as const;
type TabId = (typeof TABS)[number];

type Alert = {
  id: string; alertNumber: string; alertType: string; severity: string; source: string;
  vehicleNumber: string; routeName: string; tripNumber: string; driverName: string;
  message: string; locationLabel: string; autoTriggered: boolean;
  gpsImpactG: number | null; speedAtEvent: number | null;
  status: string; acknowledged: boolean; escalated: boolean;
  relativeTime: string; imageUrls: string[];
  topPct?: number; leftPct?: number;
};

type Report = {
  id: string; reportNumber: string; reportType: string; source: string;
  vehicleNumber: string; reportedBy: string; reporterRole: string;
  description: string; locationLabel: string; imageUrls: string[];
  injuryReported: boolean; policeNotified: boolean; parentNotified: boolean;
  studentsInvolved: number; status: string; relativeTime: string; alertNumber: string;
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

function severityColor(s: string) {
  if (s === 'CRITICAL') return 'text-red-600';
  if (s === 'HIGH') return 'text-orange-600';
  if (s === 'MEDIUM') return 'text-amber-600';
  return 'text-slate-600';
}

export function SafetyAlertsView() {
  const [data, setData] = useState<TransportSafetyAlerts | null>(null);
  const [tab, setTab] = useState<TabId>('Dashboard');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState<Alert | Report | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [reportForm, setReportForm] = useState({
    vehicleId: '', reportedBy: '', reporterRole: 'DRIVER', reportType: 'ACCIDENT',
    description: '', locationLabel: '', injuryReported: false, imageUrls: '',
  });

  const load = useCallback(async (seed = false) => {
    setLoading(true);
    try { setData(await fetchTransportSafetyAlerts(seed)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(true); }, [load]);

  const alerts = useMemo(() => (data?.alerts ?? []) as Alert[], [data]);
  const reports = useMemo(() => (data?.reports ?? []) as Report[], [data]);
  const q = search.toLowerCase();

  const filteredAlerts = useMemo(() => alerts.filter((a) => {
    const matchQ = !q || a.vehicleNumber.toLowerCase().includes(q) || a.message.toLowerCase().includes(q)
      || a.alertNumber.toLowerCase().includes(q);
    const matchS = statusFilter === 'ALL' || a.status === statusFilter || a.severity === statusFilter;
    return matchQ && matchS;
  }), [alerts, q, statusFilter]);

  const act = async (fn: () => Promise<TransportSafetyAlerts>, msg: string) => {
    setBusy(true); setMessage('');
    try {
      setData(await fn());
      setMessage(msg);
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Action failed'); }
    finally { setBusy(false); }
  };

  const roleMatrix = (data?.settings as { roleMatrix?: { role: string; permissions: string }[] })?.roleMatrix ?? [];
  const mobileSync = (data?.settings as { mobileSyncRules?: Record<string, string[]> })?.mobileSyncRules ?? {};
  const autoRules = (data?.settings as { autoTriggerRules?: Record<string, unknown> })?.autoTriggerRules ?? {};
  const safetySettings = data?.settings as {
    autoAccidentTrigger?: boolean; gpsImpactThresholdG?: number;
    speedViolationKmh?: number; escalationMinutes?: number;
    autoNotifyParents?: boolean; notificationRules?: { channels?: string[]; events?: string[] };
  } | undefined;

  const AlertActions = ({ a }: { a: Alert }) => (
    <div className="flex gap-1">
      {!a.acknowledged && (
        <button type="button" title="Acknowledge" disabled={busy}
          onClick={() => void act(() => acknowledgeSafetyAlert(a.id), 'Alert acknowledged')}
          className="p-1 rounded hover:bg-green-50 text-green-600"><CheckCircle2 className="w-3.5 h-3.5" /></button>
      )}
      {!a.escalated && a.severity !== 'LOW' && (
        <button type="button" title="Escalate" disabled={busy}
          onClick={() => void act(() => escalateSafetyAlert(a.id), 'Alert escalated')}
          className="p-1 rounded hover:bg-orange-50 text-orange-600"><ArrowUpCircle className="w-3.5 h-3.5" /></button>
      )}
      {a.status !== 'RESOLVED' && (
        <button type="button" title="Resolve" disabled={busy}
          onClick={() => void act(() => resolveSafetyAlert(a.id), 'Alert resolved')}
          className="p-1 rounded hover:bg-blue-50 text-blue-600"><XCircle className="w-3.5 h-3.5" /></button>
      )}
    </div>
  );

  const AlertTable = ({ rows }: { rows: Alert[] }) => (
    <div className={`${am.card} overflow-x-auto`}>
      <table className="w-full text-xs">
        <thead><tr className="border-b text-left text-[10px] text-slate-400 uppercase">
          <th className="p-2">Alert #</th><th className="p-2">Type</th><th className="p-2">Severity</th>
          <th className="p-2">Source</th><th className="p-2">Vehicle</th><th className="p-2">Message</th>
          <th className="p-2">Location</th><th className="p-2">Impact/Speed</th><th className="p-2">Status</th>
          <th className="p-2">When</th><th className="p-2">Actions</th>
        </tr></thead>
        <tbody>
          {rows.map((a) => (
            <tr key={a.id}
              className={`border-b border-slate-50 cursor-pointer hover:bg-slate-50/50 ${a.severity === 'CRITICAL' && a.status === 'OPEN' ? 'bg-red-50/40' : ''}`}
              onClick={() => setSelected(a)}>
              <td className="p-2 font-bold">{a.alertNumber}</td>
              <td className="p-2"><StatusBadge status={a.alertType} /></td>
              <td className={`p-2 font-bold ${severityColor(a.severity)}`}>{a.severity}</td>
              <td className="p-2">
                <span className="flex items-center gap-0.5">
                  {a.source === 'GPS_AUTO' ? <Radio className="w-3 h-3" /> : <Smartphone className="w-3 h-3" />}
                  {a.source.replace(/_/g, ' ')}
                </span>
              </td>
              <td className="p-2">{a.vehicleNumber}</td>
              <td className="p-2 max-w-[200px] truncate">{a.message}</td>
              <td className="p-2">{a.locationLabel || '—'}</td>
              <td className="p-2">
                {a.gpsImpactG ? `${a.gpsImpactG}G` : '—'} / {a.speedAtEvent ? `${a.speedAtEvent} km/h` : '—'}
              </td>
              <td className="p-2"><StatusBadge status={a.status} /></td>
              <td className="p-2">{a.relativeTime}</td>
              <td className="p-2" onClick={(e) => e.stopPropagation()}><AlertActions a={a} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  if (loading && !data) return <AcademicLoading />;

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="Transport Management › Safety & Alerts"
        title="Safety & Alerts"
        subtitle="Auto accident alerts from GPS, mobile app reporting with images, SOS, escalation & real-time safety monitoring"
        actions={(
          <div className="flex gap-2 flex-wrap">
            <button type="button" onClick={() => void load()} disabled={busy} className={am.btnSecondary}>
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
            <button type="button" disabled={busy}
              onClick={() => void act(() => triggerGpsAccidentAlert({ impactG: 4.2, speedKmh: 35, locationLabel: 'Simulated GPS trigger' }), 'GPS accident alert triggered')}
              className={am.btnSecondary}>
              <Radio className="w-3.5 h-3.5" /> Simulate GPS Alert
            </button>
            <button type="button" disabled={busy}
              onClick={() => void act(() => triggerSosAlert({ message: 'SOS test trigger' }), 'SOS alert triggered')}
              className={am.btnSecondary}>
              <Siren className="w-3.5 h-3.5" /> SOS
            </button>
            <button type="button" onClick={() => setShowReport(true)} className={am.btnPrimary}>
              <Camera className="w-3.5 h-3.5" /> Mobile Report
            </button>
          </div>
        )}
      />

      {message && (
        <div className={`mb-3 p-2 rounded-lg text-xs font-medium ${message.includes('fail') ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
          {message}
        </div>
      )}

      {(data?.kpis.criticalAlerts ?? 0) > 0 && (
        <div className="mb-3 p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2">
          <Siren className="w-5 h-5 text-red-600 animate-pulse" />
          <div>
            <p className="text-sm font-bold text-red-700">{data?.kpis.criticalAlerts} Critical Alert(s) Active</p>
            <p className="text-xs text-red-600">{data?.kpis.unacknowledged} unacknowledged — immediate action required</p>
          </div>
        </div>
      )}

      <FeeTabs tabs={[...TABS]} active={tab} onChange={(t) => setTab(t as TabId)} />

      {tab === 'Dashboard' && (
        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-10 gap-2">
            <Kpi label="Total Alerts" value={data?.kpis.totalAlerts ?? 0} />
            <Kpi label="Open" value={data?.kpis.openAlerts ?? 0} color="text-red-600" />
            <Kpi label="Critical" value={data?.kpis.criticalAlerts ?? 0} color="text-red-700" />
            <Kpi label="Unacknowledged" value={data?.kpis.unacknowledged ?? 0} color="text-orange-600" />
            <Kpi label="GPS Auto" value={data?.kpis.gpsAutoTriggered ?? 0} color="text-violet-600" />
            <Kpi label="Mobile Reports" value={data?.kpis.mobileReports ?? 0} color="text-blue-600" />
            <Kpi label="Accidents" value={data?.kpis.accidents ?? 0} color="text-red-600" />
            <Kpi label="Escalated" value={data?.kpis.escalated ?? 0} color="text-amber-600" />
            <Kpi label="Avg Response" value={`${data?.kpis.avgResponseMins ?? 0}m`} />
            <Kpi label="Resolved Today" value={data?.kpis.resolvedToday ?? 0} color="text-emerald-600" />
          </div>

          <div className={`${am.card} p-3`}>
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Safety Workflow</p>
            <div className="flex flex-wrap gap-1">
              {(data?.workflow ?? []).map((w, i) => (
                <span key={w} className="flex items-center gap-1">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-700 font-semibold">{w}</span>
                  {i < (data?.workflow?.length ?? 0) - 1 && <span className="text-slate-300">→</span>}
                </span>
              ))}
            </div>
          </div>

          <AlertTable rows={filteredAlerts.slice(0, 8)} />
        </div>
      )}

      {(tab === 'Live Alerts' || tab === 'GPS Auto Alerts' || tab === 'Escalations') && (
        <div className="space-y-3 mt-4">
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search alerts…" className={`${am.input} pl-8 text-xs w-full`} />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`${am.input} text-xs`}>
              <option value="ALL">All</option>
              <option value="OPEN">Open</option>
              <option value="CRITICAL">Critical</option>
              <option value="ACKNOWLEDGED">Acknowledged</option>
            </select>
          </div>
          <AlertTable rows={
            tab === 'GPS Auto Alerts' ? filteredAlerts.filter((a) => a.source === 'GPS_AUTO')
              : tab === 'Escalations' ? filteredAlerts.filter((a) => a.escalated)
                : filteredAlerts
          } />
        </div>
      )}

      {(tab === 'Accident Reports' || tab === 'Mobile Reports') && (
        <div className="space-y-3 mt-4">
          <button type="button" onClick={() => setShowReport(true)} className={am.btnPrimary}>
            <Camera className="w-3.5 h-3.5" /> Submit Mobile Report
          </button>
          <div className="grid md:grid-cols-2 gap-3">
            {(tab === 'Mobile Reports' ? reports.filter((r) => r.source === 'MOBILE_APP') : reports).map((r) => (
              <div key={r.id} className={`${am.card} p-3 cursor-pointer hover:shadow-md transition-shadow`}
                onClick={() => setSelected(r)}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-bold text-sm">{r.reportNumber}</p>
                    <p className="text-[10px] text-slate-500">{r.vehicleNumber} — {r.reportedBy} ({r.reporterRole})</p>
                  </div>
                  <StatusBadge status={r.reportType} />
                </div>
                <p className="text-xs text-slate-700 mb-2">{r.description}</p>
                {r.imageUrls.length > 0 && (
                  <div className="flex gap-1 mb-2 overflow-x-auto">
                    {r.imageUrls.map((url, i) => (
                      <img key={i} src={url} alt={`Evidence ${i + 1}`}
                        className="w-20 h-16 object-cover rounded border border-slate-200 shrink-0" />
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-2 text-[10px]">
                  {r.injuryReported && <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-semibold">Injury</span>}
                  {r.policeNotified && <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-semibold">Police</span>}
                  {r.parentNotified && <span className="px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-semibold">Parents</span>}
                  <span className="text-slate-400 ml-auto">{r.relativeTime}</span>
                </div>
                {r.status === 'SUBMITTED' && (
                  <button type="button" disabled={busy} className={`${am.btnSecondary} mt-2 text-[10px] w-full`}
                    onClick={(e) => { e.stopPropagation(); void act(() => reviewSafetyReport(r.id), 'Report verified'); }}>
                    Verify Report
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'Incident Map' && (
        <div className="mt-4 space-y-3">
          <div className={`${am.card} relative h-80 bg-slate-100 overflow-hidden`}>
            <div className="absolute inset-0 opacity-30"
              style={{ backgroundImage: 'linear-gradient(#cbd5e1 1px, transparent 1px), linear-gradient(90deg, #cbd5e1 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
            <p className="absolute top-2 left-2 text-[10px] font-bold text-slate-500 uppercase z-10 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Live Incident Map
            </p>
            {(data?.map.incidents ?? []).map((inc) => {
              const row = inc as Record<string, unknown>;
              return (
                <div key={String(row.id)}
                  className="absolute z-10 transform -translate-x-1/2 -translate-y-1/2"
                  style={{ top: `${row.topPct}%`, left: `${row.leftPct}%` }}
                  title={String(row.message)}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg ${
                    row.severity === 'CRITICAL' ? 'bg-red-600 animate-pulse' : 'bg-orange-500'
                  }`}>
                    <AlertTriangle className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-[9px] font-bold text-center mt-0.5 bg-white/90 px-1 rounded">{String(row.vehicleNumber)}</p>
                </div>
              );
            })}
          </div>
          <div className="grid md:grid-cols-3 gap-2">
            {(data?.map.incidents ?? []).slice(0, 6).map((inc) => {
              const row = inc as Record<string, unknown>;
              return (
                <div key={String(row.id)} className={`${am.card} p-2 text-xs`}>
                  <p className="font-bold">{String(row.alertNumber)} — {String(row.vehicleNumber)}</p>
                  <p className="text-slate-500 truncate">{String(row.message)}</p>
                  <StatusBadge status={String(row.alertType)} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'Reports' && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-4">
          {(data?.reports_catalog ?? []).map((r) => (
            <div key={r} className={`${am.card} p-3 flex items-center gap-2 hover:bg-slate-50 cursor-pointer`}>
              <FileText className="w-4 h-4 text-red-600 shrink-0" />
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
                <Smartphone className="w-3.5 h-3.5 text-red-600" />
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
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Auto-Trigger Rules</p>
            <div className="space-y-1 text-xs">
              <p>GPS accident trigger: <strong>{safetySettings?.autoAccidentTrigger ? 'Enabled' : 'Disabled'}</strong></p>
              <p>Impact threshold: <strong>{safetySettings?.gpsImpactThresholdG ?? 3.5}G</strong></p>
              <p>Speed limit: <strong>{safetySettings?.speedViolationKmh ?? 60} km/h</strong></p>
              <p>Escalation after: <strong>{safetySettings?.escalationMinutes ?? 5} min</strong></p>
              <p>Auto-notify parents: <strong>{safetySettings?.autoNotifyParents ? 'Yes' : 'No'}</strong></p>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {Object.keys(autoRules).map((k) => (
                <span key={k} className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-700 font-semibold">{k}</span>
              ))}
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

      {/* Detail Modal */}
      <AcademicModal open={!!selected} onClose={() => setSelected(null)}
        title={'alertNumber' in (selected ?? {}) ? `Alert ${(selected as Alert)?.alertNumber}` : `Report ${(selected as Report)?.reportNumber}`}>
        {selected && 'alertType' in selected && (
          <div className="space-y-2 text-xs">
            <p><strong>Type:</strong> <StatusBadge status={selected.alertType} /> <StatusBadge status={selected.severity} /></p>
            <p><strong>Source:</strong> {selected.source} {selected.autoTriggered && '(Auto-triggered)'}</p>
            <p><strong>Vehicle:</strong> {selected.vehicleNumber} — {selected.driverName}</p>
            <p><strong>Location:</strong> {selected.locationLabel}</p>
            <p><strong>Message:</strong> {selected.message}</p>
            {selected.gpsImpactG && <p><strong>GPS Impact:</strong> {selected.gpsImpactG}G at {selected.speedAtEvent} km/h</p>}
            {selected.imageUrls?.length > 0 && (
              <div className="flex gap-1 mt-2">
                {selected.imageUrls.map((url, i) => (
                  <img key={i} src={url} alt="" className="w-24 h-20 object-cover rounded border" />
                ))}
              </div>
            )}
            <AlertActions a={selected} />
          </div>
        )}
        {selected && 'reportType' in selected && (
          <div className="space-y-2 text-xs">
            <p><strong>Type:</strong> <StatusBadge status={selected.reportType} /></p>
            <p><strong>Reporter:</strong> {selected.reportedBy} ({selected.reporterRole})</p>
            <p><strong>Description:</strong> {selected.description}</p>
            {selected.imageUrls.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                {selected.imageUrls.map((url, i) => (
                  <img key={i} src={url} alt={`Evidence ${i + 1}`} className="w-full h-28 object-cover rounded border" />
                ))}
              </div>
            )}
          </div>
        )}
      </AcademicModal>

      {/* Mobile Report Modal */}
      <AcademicModal open={showReport} onClose={() => setShowReport(false)} title="Submit Mobile Safety Report">
        <div className="space-y-3">
          <select value={reportForm.vehicleId} onChange={(e) => setReportForm({ ...reportForm, vehicleId: e.target.value })} className={`${am.input} text-xs w-full`}>
            <option value="">Select Vehicle</option>
            {(data?.vehicles ?? []).map((v) => <option key={v.id} value={v.id}>{v.vehicleNumber}</option>)}
          </select>
          <select value={reportForm.reportType} onChange={(e) => setReportForm({ ...reportForm, reportType: e.target.value })} className={`${am.input} text-xs w-full`}>
            {(data?.reportTypes ?? []).map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
          </select>
          <input value={reportForm.reportedBy} onChange={(e) => setReportForm({ ...reportForm, reportedBy: e.target.value })}
            placeholder="Reported by (name)" className={`${am.input} text-xs w-full`} />
          <textarea value={reportForm.description} onChange={(e) => setReportForm({ ...reportForm, description: e.target.value })}
            placeholder="Incident description" rows={3} className={`${am.input} text-xs w-full`} />
          <input value={reportForm.locationLabel} onChange={(e) => setReportForm({ ...reportForm, locationLabel: e.target.value })}
            placeholder="Location" className={`${am.input} text-xs w-full`} />
          <input value={reportForm.imageUrls} onChange={(e) => setReportForm({ ...reportForm, imageUrls: e.target.value })}
            placeholder="Image URLs (comma-separated)" className={`${am.input} text-xs w-full`} />
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={reportForm.injuryReported}
              onChange={(e) => setReportForm({ ...reportForm, injuryReported: e.target.checked })} />
            Injury reported
          </label>
          <button type="button" disabled={busy || !reportForm.description} className={am.btnPrimary}
            onClick={() => void act(async () => {
              const res = await submitMobileSafetyReport({
                ...reportForm,
                imageUrls: reportForm.imageUrls.split(',').map((s) => s.trim()).filter(Boolean),
                latitude: 26.9124, longitude: 75.7873,
              });
              setShowReport(false);
              return res;
            }, 'Mobile report submitted — auto alert created')}>
            Submit Report with Images
          </button>
        </div>
      </AcademicModal>
    </AcademicPageShell>
  );
}
