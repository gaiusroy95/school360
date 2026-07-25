import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Search, RefreshCw, QrCode, Radio, Smartphone, UserCheck, AlertTriangle,
  CheckCircle2, Bus, Shield, Clock, MapPin, FileText, Lock, RotateCcw,
  Nfc, ScanFace, Edit3,
} from 'lucide-react';
import {
  confirmTransportVehicleEmpty, fetchTransportAttendance, lockTransportAttendanceSession,
  markTransportAttendanceAbsent, reconcileTransportAttendanceSession,
  resolveTransportAttendanceCorrection, scanTransportAttendance,
  type TransportAttendance,
} from '../../../lib/transportServices';
import {
  am, AcademicLoading, AcademicModal, AcademicPageHeader, AcademicPageShell,
  FeeTabs, StatusBadge,
} from '../FeeFinanceManagement/FeeFinanceUi';

const TABS = [
  'Dashboard', 'Live Boarding', 'Drop Verification', 'Occupancy', 'Exceptions',
  'Corrections', 'Reconciliation', 'Safety', 'Reports', 'Mobile Sync', 'Audit', 'Settings',
] as const;
type TabId = (typeof TABS)[number];

type Record = {
  id: string; enrollmentId: string; studentName: string; classSection: string;
  pickupStopName: string; dropStopName: string; seatNumber: number | null;
  safetyStatus: string; boardingStatus: string; dropStatus: string;
  boardingMethod: string; dropMethod: string; boardedTime: string; droppedTime: string;
  wrongBusAlert: boolean; wrongStopAlert: boolean; duplicatePrevented: boolean;
  guardianVerified: boolean; otpVerified: boolean; medicalAlert: string;
  exceptionType: string; exceptionReason: string; isAbsent: boolean;
  vehicleNumber: string; routeCode: string; routeName: string;
  transportCardId: string; qrCode: string; photoUrl: string;
  sessionId?: string; sessionNumber?: string; correctionStatus: string;
};

type Session = {
  id: string; sessionNumber: string; sessionType: string; status: string;
  vehicleNumber: string; routeCode: string; routeName: string;
  driverName: string; attendantName: string;
  totalStudents: number; boardedCount: number; droppedCount: number;
  pendingCount: number; absentCount: number; exceptionCount: number;
  currentOccupancy: number; occupancyPct: number;
  vehicleEmptyConfirmed: boolean; attendanceLocked: boolean;
  records?: Record[];
};

const methodIcon = (m: string) => {
  if (m === 'RFID') return <Radio className="w-3 h-3" />;
  if (m === 'QR') return <QrCode className="w-3 h-3" />;
  if (m === 'NFC') return <Nfc className="w-3 h-3" />;
  if (m === 'FACE') return <ScanFace className="w-3 h-3" />;
  if (m === 'MOBILE') return <Smartphone className="w-3 h-3" />;
  return <Edit3 className="w-3 h-3" />;
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

export function TransportAttendanceView() {
  const [data, setData] = useState<TransportAttendance | null>(null);
  const [tab, setTab] = useState<TabId>('Dashboard');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState<Record | null>(null);

  const load = useCallback(async (seed = false) => {
    setLoading(true);
    try { setData(await fetchTransportAttendance(seed, academicYear)); }
    finally { setLoading(false); }
  }, [academicYear]);

  useEffect(() => { void load(true); }, [load]);

  const sessions = useMemo(() => (data?.sessions ?? []) as Session[], [data]);
  const records = useMemo(() => (data?.records ?? []) as Record[], [data]);
  const q = search.toLowerCase();
  const filtered = useMemo(() => records.filter((r) => {
    const matchQ = !q || r.studentName.toLowerCase().includes(q) || r.classSection.toLowerCase().includes(q)
      || r.routeCode.toLowerCase().includes(q) || r.vehicleNumber.toLowerCase().includes(q);
    const matchS = statusFilter === 'ALL' || r.safetyStatus === statusFilter
      || r.boardingStatus === statusFilter || (statusFilter === 'PENDING' && r.safetyStatus === 'PENDING');
    return matchQ && matchS;
  }), [records, q, statusFilter]);

  const act = async (fn: () => Promise<unknown>, msg: string) => {
    setBusy(true); setMessage('');
    try {
      setData(await fn() as TransportAttendance);
      setMessage(msg);
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Action failed'); }
    finally { setBusy(false); }
  };

  const scan = (recordId: string, action: 'BOARD' | 'DROP', method: string) =>
    act(() => scanTransportAttendance(recordId, {
      action, method, latitude: 26.9124, longitude: 75.7873, verifiedBy: 'Driver',
    }), `${action === 'DROP' ? 'Drop' : 'Boarding'} recorded via ${method}`);

  const roleMatrix = (data?.settings as { roleMatrix?: { role: string; permissions: string }[] })?.roleMatrix ?? [];
  const mobileSync = (data?.settings as { mobileSyncRules?: Record<string, string[]> })?.mobileSyncRules ?? {};
  const attendanceModes = data?.attendanceModes ?? [];

  if (loading && !data) return <AcademicLoading />;

  const exceptionRecords = records.filter((r) => r.safetyStatus === 'EXCEPTION' || r.wrongBusAlert || r.wrongStopAlert);
  const pendingBoard = records.filter((r) => !r.isAbsent && r.boardingStatus === 'NOT_BOARDED');
  const pendingDrop = records.filter((r) => (r.boardingStatus === 'BOARDED' || r.boardingStatus === 'LATE') && r.dropStatus !== 'DROPPED');

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="Transport Management › Transport Attendance"
        title="Transport Attendance & Boarding"
        subtitle="Real-time student boarding & drop-off — RFID, QR, NFC, Face Recognition, GPS verification, parent notifications & ERP sync"
        actions={(
          <div className="flex gap-2 flex-wrap">
            <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className={`${am.input} text-xs`}>
              {(data?.academicYears ?? ['2025-26']).map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <button type="button" onClick={() => void load()} disabled={busy} className={am.btnSecondary}>
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>
        )}
      />

      {message && (
        <div className={`mb-3 p-2 rounded-lg text-xs font-medium ${message.includes('fail') || message.includes('Duplicate') ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
          {message}
        </div>
      )}

      <FeeTabs tabs={[...TABS]} active={tab} onChange={(t) => setTab(t as TabId)} />

      {/* Dashboard */}
      {tab === 'Dashboard' && (
        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-10 gap-2">
            <Kpi label="Total" value={data?.kpis.totalStudents ?? 0} />
            <Kpi label="Boarded" value={data?.kpis.boarded ?? 0} color="text-emerald-600" />
            <Kpi label="Dropped" value={data?.kpis.dropped ?? 0} color="text-blue-600" />
            <Kpi label="Pending" value={data?.kpis.pending ?? 0} color="text-amber-600" />
            <Kpi label="Absent" value={data?.kpis.absent ?? 0} />
            <Kpi label="Exceptions" value={data?.kpis.exceptions ?? 0} color="text-orange-600" />
            <Kpi label="Onboard" value={data?.kpis.currentOccupancy ?? 0} color="text-violet-600" />
            <Kpi label="Missed Pickup" value={data?.kpis.missedPickup ?? 0} color="text-red-600" />
            <Kpi label="Attendance %" value={`${data?.kpis.attendancePct ?? 0}%`} />
            <Kpi label="Active Trips" value={data?.kpis.activeSessions ?? 0} />
          </div>

          <div className={`${am.card} p-3`}>
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Boarding Workflow</p>
            <div className="flex flex-wrap gap-1">
              {(data?.workflow ?? []).map((w, i) => (
                <span key={w} className="flex items-center gap-1">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 font-semibold">{w}</span>
                  {i < (data?.workflow.length ?? 0) - 1 && <span className="text-slate-300">→</span>}
                </span>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
            {sessions.map((s) => (
              <div key={s.id} className={`${am.card} p-4 cursor-pointer hover:ring-2 hover:ring-teal-200`}
                onClick={() => setTab('Live Boarding')}>
                <div className="flex justify-between items-start">
                  <span className="font-mono text-[10px] text-teal-600 font-bold">{s.sessionNumber}</span>
                  <StatusBadge status={s.status} />
                </div>
                <h4 className="font-bold mt-1">{s.vehicleNumber}</h4>
                <p className="text-xs text-slate-500">{s.routeCode} — {s.routeName}</p>
                <div className="mt-3 grid grid-cols-3 gap-1 text-center">
                  <div><p className="text-lg font-black text-emerald-600">{s.boardedCount}</p><p className="text-[9px] text-slate-400">Boarded</p></div>
                  <div><p className="text-lg font-black text-blue-600">{s.droppedCount}</p><p className="text-[9px] text-slate-400">Dropped</p></div>
                  <div><p className="text-lg font-black text-violet-600">{s.currentOccupancy}</p><p className="text-[9px] text-slate-400">Onboard</p></div>
                </div>
                <div className="mt-2 w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-teal-500" style={{ width: `${s.totalStudents ? (s.boardedCount / s.totalStudents) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className={`${am.card} p-4`}>
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2"><Clock className="w-4 h-4" /> Recent Scan Events</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {(data?.recentEvents ?? []).slice(0, 8).map((e) => (
                <div key={String(e.id)} className="flex items-center gap-2 text-xs border-b border-slate-100 pb-1">
                  {methodIcon(String(e.method))}
                  <StatusBadge status={String(e.eventType)} />
                  <span className="flex-1 text-slate-600">{String(e.notes)}</span>
                  <span className="text-slate-400">{String(e.relativeTime)}</span>
                  {e.isWrongBus && <AlertTriangle className="w-3 h-3 text-red-500" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Live Boarding / Drop / shared table */}
      {(tab === 'Live Boarding' || tab === 'Drop Verification' || tab === 'Exceptions' || tab === 'Safety') && (
        <div className="space-y-3 mt-4">
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search student, class, route, vehicle…" className={`${am.input} pl-8 text-xs w-full`} />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`${am.input} text-xs`}>
              <option value="ALL">All Statuses</option>
              {(data?.safetyStatuses ?? []).map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
              <option value="NOT_BOARDED">Not Boarded</option>
              <option value="PENDING">Pending</option>
            </select>
          </div>

          {tab === 'Live Boarding' && pendingBoard.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs text-amber-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> {pendingBoard.length} students yet to board
            </div>
          )}

          <div className={`${am.card} overflow-hidden`}>
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b">
                <tr>
                  {['Student', 'Class', 'Route / Vehicle', 'Stop', 'Boarding', 'Drop', 'Safety', 'Alerts', 'Actions'].map((h) => (
                    <th key={h} className={am.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(tab === 'Live Boarding' ? filtered.filter((r) => !r.isAbsent && r.boardingStatus === 'NOT_BOARDED')
                  : tab === 'Drop Verification' ? filtered.filter((r) => (r.boardingStatus === 'BOARDED' || r.boardingStatus === 'LATE') && r.dropStatus !== 'DROPPED')
                    : tab === 'Exceptions' ? exceptionRecords
                      : tab === 'Safety' ? filtered.filter((r) => r.medicalAlert || r.wrongBusAlert || r.safetyStatus.includes('MISSED'))
                        : filtered
                ).map((r) => (
                  <tr key={r.id} className="border-b hover:bg-slate-50/50">
                    <td className={am.td}>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold">
                          {r.studentName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold">{r.studentName}</p>
                          <p className="text-slate-400 font-mono">{r.transportCardId || r.qrCode.slice(0, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className={am.td}>{r.classSection}</td>
                    <td className={am.td}>{r.routeCode}<br /><span className="text-slate-400">{r.vehicleNumber}</span></td>
                    <td className={am.td}>{tab === 'Drop Verification' ? r.dropStopName : r.pickupStopName}</td>
                    <td className={am.td}>
                      {r.boardedTime ? (
                        <span className="flex items-center gap-1">{methodIcon(r.boardingMethod)} {r.boardedTime}</span>
                      ) : <StatusBadge status="NOT_BOARDED" />}
                    </td>
                    <td className={am.td}>
                      {r.droppedTime ? (
                        <span className="flex items-center gap-1">{methodIcon(r.dropMethod)} {r.droppedTime}</span>
                      ) : <StatusBadge status={r.dropStatus} />}
                    </td>
                    <td className={am.td}><StatusBadge status={r.safetyStatus} /></td>
                    <td className={am.td}>
                      <div className="flex gap-1">
                        {r.wrongBusAlert && <span title="Wrong bus"><Bus className="w-3.5 h-3.5 text-red-500" /></span>}
                        {r.wrongStopAlert && <span title="Wrong stop"><MapPin className="w-3.5 h-3.5 text-orange-500" /></span>}
                        {r.medicalAlert && <span title={r.medicalAlert}><AlertTriangle className="w-3.5 h-3.5 text-amber-500" /></span>}
                        {r.guardianVerified && <UserCheck className="w-3.5 h-3.5 text-emerald-500" />}
                      </div>
                    </td>
                    <td className={am.td}>
                      <div className="flex gap-1 flex-wrap">
                        {tab !== 'Drop Verification' && r.boardingStatus === 'NOT_BOARDED' && !r.isAbsent && (
                          <>
                            <button type="button" disabled={busy} onClick={() => void scan(r.id, 'BOARD', 'QR')} className="p-1 rounded hover:bg-green-50 text-green-600" title="QR Scan"><QrCode className="w-3.5 h-3.5" /></button>
                            <button type="button" disabled={busy} onClick={() => void scan(r.id, 'BOARD', 'RFID')} className="p-1 rounded hover:bg-blue-50 text-blue-600" title="RFID"><Radio className="w-3.5 h-3.5" /></button>
                            <button type="button" disabled={busy} onClick={() => void scan(r.id, 'BOARD', 'NFC')} className="p-1 rounded hover:bg-violet-50 text-violet-600" title="NFC"><Nfc className="w-3.5 h-3.5" /></button>
                          </>
                        )}
                        {(tab === 'Drop Verification' || tab === 'Live Boarding') && r.boardingStatus !== 'NOT_BOARDED' && r.dropStatus !== 'DROPPED' && (
                          <button type="button" disabled={busy} onClick={() => void scan(r.id, 'DROP', 'QR')} className="text-[10px] text-blue-600 font-bold">Drop</button>
                        )}
                        {r.boardingStatus === 'NOT_BOARDED' && (
                          <button type="button" disabled={busy} onClick={() => void act(() => markTransportAttendanceAbsent(r.id, 'Not at stop'), 'Marked absent')}
                            className="text-[10px] text-slate-500 font-bold">Absent</button>
                        )}
                        <button type="button" onClick={() => setSelected(r)} className="text-[10px] text-teal-600 font-bold">View</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Occupancy */}
      {tab === 'Occupancy' && (
        <div className="mt-4 space-y-4">
          <div className="grid md:grid-cols-3 gap-3">
            {sessions.filter((s) => s.status === 'IN_PROGRESS').map((s) => (
              <div key={s.id} className={`${am.card} p-4`}>
                <div className="flex justify-between">
                  <h4 className="font-bold">{s.vehicleNumber}</h4>
                  <span className="text-2xl font-black text-violet-600">{s.currentOccupancy}</span>
                </div>
                <p className="text-xs text-slate-500">{s.routeName} · {s.driverName}</p>
                <div className="mt-3">
                  <div className="flex justify-between text-[10px] mb-1">
                    <span>Occupancy</span><span>{s.occupancyPct}%</span>
                  </div>
                  <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-violet-500 transition-all" style={{ width: `${s.occupancyPct}%` }} />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2">{s.boardedCount} boarded · {s.droppedCount} dropped · {s.pendingCount} pending</p>
                </div>
                {!s.vehicleEmptyConfirmed && (
                  <button type="button" disabled={busy} onClick={() => void act(() => confirmTransportVehicleEmpty(s.id), 'Vehicle empty check completed')}
                    className={`${am.btnSecondary} w-full mt-3 text-xs justify-center`}>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Confirm Vehicle Empty
                  </button>
                )}
                {s.vehicleEmptyConfirmed && (
                  <p className="text-xs text-emerald-600 font-bold mt-3 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Vehicle empty confirmed</p>
                )}
              </div>
            ))}
          </div>
          {pendingDrop.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800">
              <strong>{pendingDrop.length} students</strong> boarded but not yet dropped — verify before trip closure.
            </div>
          )}
        </div>
      )}

      {/* Corrections */}
      {tab === 'Corrections' && (
        <div className={`${am.card} overflow-hidden mt-4`}>
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b">
              <tr>{['Student', 'Type', 'Field', 'From → To', 'Reason', 'Requested By', 'Status', 'Actions'].map((h) => <th key={h} className={am.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {(data?.corrections ?? []).map((c) => (
                <tr key={String(c.id)} className="border-b">
                  <td className={am.td}>{String(c.studentName)}</td>
                  <td className={am.td}>{String(c.correctionType)}</td>
                  <td className={am.td}>{String(c.fieldName)}</td>
                  <td className={am.td}>{String(c.previousValue)} → {String(c.newValue)}</td>
                  <td className={am.td}>{String(c.reason)}</td>
                  <td className={am.td}>{String(c.requestedBy)}</td>
                  <td className={am.td}><StatusBadge status={String(c.status)} /></td>
                  <td className={am.td}>
                    {c.status === 'PENDING' && (
                      <div className="flex gap-1">
                        <button type="button" disabled={busy} onClick={() => void act(() => resolveTransportAttendanceCorrection(String(c.id), 'APPROVED'), 'Approved')}
                          className="text-[10px] text-emerald-600 font-bold">Approve</button>
                        <button type="button" disabled={busy} onClick={() => void act(() => resolveTransportAttendanceCorrection(String(c.id), 'REJECTED'), 'Rejected')}
                          className="text-[10px] text-red-600 font-bold">Reject</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Reconciliation */}
      {tab === 'Reconciliation' && (
        <div className="mt-4 space-y-3">
          {sessions.map((s) => (
            <div key={s.id} className={`${am.card} p-4`}>
              <div className="flex justify-between items-start flex-wrap gap-2">
                <div>
                  <span className="font-mono text-[10px] text-teal-600 font-bold">{s.sessionNumber}</span>
                  <h4 className="font-bold">{s.vehicleNumber} — {s.routeName}</h4>
                  <p className="text-xs text-slate-500">Boarded {s.boardedCount} / Dropped {s.droppedCount} / Absent {s.absentCount} / Exceptions {s.exceptionCount}</p>
                </div>
                <div className="flex gap-2">
                  {!s.attendanceLocked && (
                    <button type="button" disabled={busy} onClick={() => void act(() => reconcileTransportAttendanceSession(s.id), 'Reconciled')}
                      className={am.btnSecondary}><RotateCcw className="w-3.5 h-3.5" /> Reconcile</button>
                  )}
                  {!s.attendanceLocked && (
                    <button type="button" disabled={busy} onClick={() => void act(() => lockTransportAttendanceSession(s.id), 'Attendance locked')}
                      className={am.btnPrimary}><Lock className="w-3.5 h-3.5" /> Lock Attendance</button>
                  )}
                  {s.attendanceLocked && <StatusBadge status="LOCKED" />}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reports */}
      {tab === 'Reports' && (
        <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {(data?.reports ?? []).map((r) => (
            <div key={r} className={`${am.card} p-3 flex items-center gap-2 hover:bg-slate-50 cursor-pointer`}>
              <FileText className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-xs font-semibold text-slate-700">{r}</span>
            </div>
          ))}
        </div>
      )}

      {/* Mobile Sync */}
      {tab === 'Mobile Sync' && (
        <div className="mt-4 grid lg:grid-cols-2 gap-4">
          {Object.entries(mobileSync).map(([app, features]) => (
            <div key={app} className={`${am.card} p-4`}>
              <h3 className="text-sm font-bold mb-2 capitalize">{app.replace(/([A-Z])/g, ' $1')}</h3>
              <ul className="space-y-1">
                {(features ?? []).map((f) => (
                  <li key={f} className="text-xs text-slate-600 flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
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
            <h3 className="text-sm font-bold mb-3">Attendance Modes</h3>
            <div className="flex flex-wrap gap-2">
              {attendanceModes.map((m) => (
                <span key={m} className="flex items-center gap-1 px-2 py-1 bg-slate-100 rounded text-xs font-semibold">
                  {methodIcon(m)} {m}
                </span>
              ))}
            </div>
            <h3 className="text-sm font-bold mt-4 mb-2">Notification Channels</h3>
            <p className="text-xs text-slate-600">Push · SMS · WhatsApp · Email · In-App — parent boarding/drop, missed pickup, wrong bus, emergency SOS</p>
          </div>
        </div>
      )}

      {/* Student detail modal */}
      <AcademicModal open={!!selected} onClose={() => setSelected(null)} title={selected?.studentName ?? ''}>
        {selected && (
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div><span className="text-slate-400">Class</span><p className="font-bold">{selected.classSection}</p></div>
              <div><span className="text-slate-400">Seat</span><p className="font-bold">{selected.seatNumber ?? '—'}</p></div>
              <div><span className="text-slate-400">Route</span><p>{selected.routeCode} — {selected.routeName}</p></div>
              <div><span className="text-slate-400">Vehicle</span><p>{selected.vehicleNumber}</p></div>
              <div><span className="text-slate-400">Boarding</span><p>{selected.boardedTime || '—'} {selected.boardingMethod && `(${selected.boardingMethod})`}</p></div>
              <div><span className="text-slate-400">Drop</span><p>{selected.droppedTime || '—'} {selected.dropMethod && `(${selected.dropMethod})`}</p></div>
              <div><span className="text-slate-400">Safety</span><p><StatusBadge status={selected.safetyStatus} /></p></div>
              <div><span className="text-slate-400">Guardian OTP</span><p>{selected.otpVerified ? 'Verified' : selected.guardianVerified ? 'Guardian OK' : '—'}</p></div>
            </div>
            {selected.medicalAlert && (
              <div className="bg-amber-50 border border-amber-200 rounded p-2 text-amber-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> {selected.medicalAlert}
              </div>
            )}
            {(selected.wrongBusAlert || selected.wrongStopAlert) && (
              <div className="bg-red-50 border border-red-200 rounded p-2 text-red-800">
                {selected.wrongBusAlert && <p>⚠ Wrong bus boarding detected</p>}
                {selected.wrongStopAlert && <p>⚠ Wrong stop boarding detected</p>}
              </div>
            )}
            <div className="flex gap-2 flex-wrap">
              {selected.boardingStatus === 'NOT_BOARDED' && !selected.isAbsent && attendanceModes.map((m) => (
                <button key={m} type="button" disabled={busy} onClick={() => void scan(selected.id, 'BOARD', m)}
                  className={am.btnSecondary}>{methodIcon(m)} {m}</button>
              ))}
              {selected.boardingStatus !== 'NOT_BOARDED' && selected.dropStatus !== 'DROPPED' && (
                <button type="button" disabled={busy} onClick={() => void scan(selected.id, 'DROP', 'QR')} className={am.btnPrimary}>
                  <UserCheck className="w-3.5 h-3.5" /> Verify Drop
                </button>
              )}
            </div>
          </div>
        )}
      </AcademicModal>
    </AcademicPageShell>
  );
}
