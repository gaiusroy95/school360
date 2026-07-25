import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Search, RefreshCw, Plus, MapPin, Bus, CheckCircle2, AlertTriangle,
  FileText, Smartphone, Shield, CreditCard, UserCheck, QrCode, Heart,
} from 'lucide-react';
import {
  allocateStudentTransport, approveStudentTransport, createStudentTransportApp,
  fetchTransportStudentTransport, recordStudentBoarding, resolveTransportRequest,
  type TransportStudentTransport,
} from '../../../lib/transportServices';
import {
  am, AcademicLoading, AcademicModal, AcademicPageHeader, AcademicPageShell,
  FeeTabs, StatusBadge,
} from '../FeeFinanceManagement/FeeFinanceUi';

const TABS = [
  'Dashboard', 'Registrations', 'Applications', 'Allocations', 'Boarding & Drop',
  'Waiting List', 'Requests', 'Transport Cards', 'Reports', 'Mobile Sync', 'Audit', 'Settings',
] as const;
type TabId = (typeof TABS)[number];

type Enrollment = {
  id: string; applicationNumber: string; studentName: string; admissionNumber: string;
  className: string; sectionName: string; category: string; status: string; workflowStage: string;
  routeName: string; routeCode: string; vehicleNumber: string; driverName: string;
  pickupStopName: string; dropStopName: string; pickupTime: string; dropTime: string;
  seatNumber: number | null; feeStatus: string; feeDueAmount: number;
  specialAssistance: boolean; medicalAlerts: string[];
  transportCardId: string; qrCode: string; rfidTag: string; geoValidated: boolean;
  todayBoarding: string; todayDrop: string; boardingMethod: string;
  pickupAddress: string; effectiveDate: string;
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

export function StudentTransportationView() {
  const [data, setData] = useState<TransportStudentTransport | null>(null);
  const [tab, setTab] = useState<TabId>('Dashboard');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState<Enrollment | null>(null);
  const [showAppModal, setShowAppModal] = useState(false);
  const [appForm, setAppForm] = useState({
    studentName: '', admissionNumber: '', className: '', sectionName: '',
    category: 'Day Scholar', pickupAddress: '', guardianName: '', guardianMobile: '',
  });

  const load = useCallback(async (seed = false) => {
    setLoading(true);
    try { setData(await fetchTransportStudentTransport(seed, academicYear)); }
    finally { setLoading(false); }
  }, [academicYear]);

  useEffect(() => { void load(true); }, [load]);

  const enrollments = useMemo(() => (data?.enrollments ?? []) as Enrollment[], [data]);
  const q = search.toLowerCase();
  const filtered = useMemo(() => enrollments.filter((e) => {
    const matchQ = !q || e.studentName.toLowerCase().includes(q) || e.admissionNumber.toLowerCase().includes(q)
      || e.routeName.toLowerCase().includes(q) || e.vehicleNumber.toLowerCase().includes(q);
    const matchS = statusFilter === 'ALL' || e.status === statusFilter;
    return matchQ && matchS;
  }), [enrollments, q, statusFilter]);

  const act = async (fn: () => Promise<TransportStudentTransport>, msg: string) => {
    setBusy(true); setMessage('');
    try {
      const res = await fn();
      setData(res);
      setMessage(msg);
      if (selected) {
        const u = (res.enrollments as Enrollment[]).find((e) => e.id === selected.id);
        if (u) setSelected(u);
      }
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Action failed'); }
    finally { setBusy(false); }
  };

  const roleMatrix = (data?.settings as { roleMatrix?: { role: string; permissions: string }[] })?.roleMatrix ?? [];
  const mobileSync = (data?.settings as { mobileSyncRules?: Record<string, string[]> })?.mobileSyncRules ?? {};

  if (loading && !data) return <AcademicLoading />;

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="Transport Management › Student Transportation"
        title="Student Transportation"
        subtitle="Registration, route & seat allocation, boarding verification, transport ID cards, fee integration & mobile app sync"
        actions={(
          <div className="flex gap-2 flex-wrap">
            <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className={`${am.input} text-xs`}>
              {(data?.academicYears ?? ['2025-26']).map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <button type="button" onClick={() => void load(true)} disabled={busy} className={am.btnSecondary}>
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
            <button type="button" onClick={() => setShowAppModal(true)} className={am.btnPrimary}>
              <Plus className="w-3.5 h-3.5" /> New Application
            </button>
          </div>
        )}
      />

      {message && (
        <div className={`mb-3 px-3 py-2 rounded-lg text-xs font-medium ${message.includes('fail') || message.includes('capacity') ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
          {message}
        </div>
      )}

      <FeeTabs tabs={[...TABS]} active={tab} onChange={(t) => setTab(t as TabId)} />

      {tab === 'Dashboard' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
            <Kpi label="Total Enrolled" value={data?.kpis.totalEnrolled ?? 0} />
            <Kpi label="Active" value={data?.kpis.activeStudents ?? 0} color="text-emerald-600" />
            <Kpi label="Pending Apps" value={data?.kpis.pendingApplications ?? 0} color="text-amber-600" />
            <Kpi label="Waiting List" value={data?.kpis.waitingList ?? 0} color="text-violet-600" />
            <Kpi label="Boarded Today" value={data?.kpis.boardedToday ?? 0} color="text-green-600" />
            <Kpi label="Seat Occupancy" value={`${data?.kpis.seatOccupancy ?? 0}%`} />
            <Kpi label="Absent Today" value={data?.kpis.absentToday ?? 0} color="text-red-500" />
            <Kpi label="Fee Due" value={data?.kpis.feeDueCount ?? 0} color="text-orange-600" />
            <Kpi label="Open Requests" value={data?.kpis.pendingRequests ?? 0} />
            <Kpi label="Special Needs" value={data?.kpis.specialAssistance ?? 0} />
            <Kpi label="Dropped Today" value={data?.kpis.droppedToday ?? 0} />
          </div>

          <div className={`${am.card} p-3`}>
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Transport Workflow</p>
            <div className="flex flex-wrap gap-1">
              {(data?.workflow ?? []).map((w, i) => (
                <span key={w} className="flex items-center gap-1">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold">{w}</span>
                  {i < (data?.workflow.length ?? 0) - 1 && <span className="text-slate-300">→</span>}
                </span>
              ))}
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <div className={`${am.card} p-4`}>
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2"><Bus className="w-4 h-4 text-blue-500" /> Vehicle Occupancy</h3>
              {(data?.vehicleOccupancy ?? []).slice(0, 6).map((v) => (
                <div key={String(v.vehicleNumber)} className="mb-2">
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="font-bold">{String(v.vehicleNumber)}</span>
                    <span>{Number(v.assigned)}/{Number(v.capacity)} ({Number(v.occupancyPct)}%)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${Number(v.occupancyPct) > 90 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${Number(v.occupancyPct)}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className={`${am.card} p-4`}>
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" /> Pending Requests</h3>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {(data?.pendingRequests ?? []).slice(0, 5).map((r) => (
                  <div key={String(r.id)} className="text-xs p-2 bg-amber-50 rounded-lg flex justify-between items-center">
                    <div>
                      <p className="font-bold">{String(r.studentName)} — {String(r.requestType).replace(/_/g, ' ')}</p>
                      <p className="text-slate-500">{String(r.reason)}</p>
                    </div>
                    <div className="flex gap-1">
                      <button type="button" disabled={busy} onClick={() => void act(() => resolveTransportRequest(String(r.id), 'APPROVED'), 'Approved')} className="text-[10px] text-emerald-600 font-bold">Approve</button>
                      <button type="button" disabled={busy} onClick={() => void act(() => resolveTransportRequest(String(r.id), 'REJECTED'), 'Rejected')} className="text-[10px] text-red-600 font-bold">Reject</button>
                    </div>
                  </div>
                ))}
                {(data?.pendingRequests ?? []).length === 0 && <p className="text-slate-400 text-xs">No pending requests</p>}
              </div>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search student, route, vehicle…" className={`${am.input} pl-8 text-xs w-full`} />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`${am.input} text-xs`}>
              <option value="ALL">All Statuses</option>
              {(data?.transportStatuses ?? []).map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className={`${am.card} overflow-hidden`}>
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b">
                <tr>
                  {['Student', 'Class', 'Category', 'Route', 'Vehicle', 'Seat', 'Pickup', 'Status', 'Fee', 'Today', 'Actions'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-bold text-slate-500 uppercase text-[10px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id} className="border-b hover:bg-slate-50/80 cursor-pointer" onClick={() => setSelected(e)}>
                    <td className="px-3 py-2">
                      <p className="font-bold">{e.studentName}</p>
                      <p className="text-[10px] text-slate-400">{e.admissionNumber}</p>
                    </td>
                    <td className="px-3 py-2">{e.className}-{e.sectionName}</td>
                    <td className="px-3 py-2"><StatusBadge status={e.category} /></td>
                    <td className="px-3 py-2">{e.routeCode || '—'}</td>
                    <td className="px-3 py-2">{e.vehicleNumber || '—'}</td>
                    <td className="px-3 py-2">{e.seatNumber ?? '—'}</td>
                    <td className="px-3 py-2">{e.pickupTime}</td>
                    <td className="px-3 py-2"><StatusBadge status={e.status} /></td>
                    <td className={`px-3 py-2 ${e.feeDueAmount > 0 ? 'text-red-600 font-bold' : 'text-emerald-600'}`}>
                      {e.feeDueAmount > 0 ? `₹${e.feeDueAmount}` : 'Paid'}
                    </td>
                    <td className="px-3 py-2">
                      <span className={e.todayBoarding === 'PRESENT' ? 'text-emerald-600' : 'text-slate-400'}>
                        {e.todayBoarding === 'PRESENT' ? '✓ Boarded' : e.todayBoarding}
                      </span>
                    </td>
                    <td className="px-3 py-2" onClick={(ev) => ev.stopPropagation()}>
                      <div className="flex gap-1">
                        {e.status === 'PENDING' && (
                          <button type="button" title="Allocate" disabled={busy}
                            onClick={() => void act(() => allocateStudentTransport(e.id, {
                              routeId: (data?.routes?.[0] as { id: string })?.id,
                              vehicleId: (data?.vehicles?.[0] as { id: string })?.id,
                            }), 'Allocated')} className="p-1 rounded hover:bg-blue-50 text-blue-600"><MapPin className="w-3.5 h-3.5" /></button>
                        )}
                        {e.status === 'PENDING' && e.routeName && (
                          <button type="button" title="Approve" disabled={busy}
                            onClick={() => void act(() => approveStudentTransport(e.id), 'Approved')} className="p-1 rounded hover:bg-emerald-50 text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5" /></button>
                        )}
                        {e.status === 'ACTIVE' && e.todayBoarding !== 'PRESENT' && (
                          <button type="button" title="Board" disabled={busy}
                            onClick={() => void act(() => recordStudentBoarding(e.id, { method: 'QR' }), 'Boarded')} className="p-1 rounded hover:bg-green-50 text-green-600"><QrCode className="w-3.5 h-3.5" /></button>
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

      {tab === 'Registrations' && (
        <div className={`${am.card} overflow-hidden`}>
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b">
              <tr>
                {['App #', 'Student', 'Class', 'Category', 'Pickup Stop', 'Drop Stop', 'Route', 'Seat', 'Card ID', 'Status'].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-bold text-slate-500 uppercase text-[10px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {enrollments.map((e) => (
                <tr key={e.id} className="border-b hover:bg-slate-50 cursor-pointer" onClick={() => setSelected(e)}>
                  <td className="px-3 py-2 font-mono">{e.applicationNumber}</td>
                  <td className="px-3 py-2 font-bold">{e.studentName}</td>
                  <td className="px-3 py-2">{e.className}-{e.sectionName}</td>
                  <td className="px-3 py-2">{e.category}</td>
                  <td className="px-3 py-2">{e.pickupStopName || '—'}</td>
                  <td className="px-3 py-2">{e.dropStopName || '—'}</td>
                  <td className="px-3 py-2">{e.routeName || '—'}</td>
                  <td className="px-3 py-2">{e.seatNumber ?? '—'}</td>
                  <td className="px-3 py-2 font-mono text-[10px]">{e.transportCardId || '—'}</td>
                  <td className="px-3 py-2"><StatusBadge status={e.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'Applications' && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {enrollments.filter((e) => e.status === 'PENDING').map((e) => (
            <div key={e.id} className={`${am.card} p-4`}>
              <span className="font-mono text-[10px] text-indigo-600 font-bold">{e.applicationNumber}</span>
              <h4 className="font-bold mt-1">{e.studentName}</h4>
              <p className="text-[10px] text-slate-500">{e.className}-{e.sectionName} · {e.category}</p>
              <p className="text-xs mt-2 flex items-center gap-1"><MapPin className="w-3 h-3" /> {e.pickupAddress}</p>
              <p className="text-[10px] text-slate-400 mt-1">Stage: {e.workflowStage.replace(/_/g, ' ')}</p>
              <div className="flex gap-2 mt-3">
                <button type="button" disabled={busy} onClick={() => void act(() => allocateStudentTransport(e.id, {
                  routeId: (data?.routes?.[0] as { id: string })?.id,
                  vehicleId: (data?.vehicles?.[0] as { id: string })?.id,
                }), 'Allocated')} className={am.btnPrimary}>Allocate Route</button>
              </div>
            </div>
          ))}
          {enrollments.filter((e) => e.status === 'PENDING').length === 0 && (
            <p className="text-slate-400 text-sm col-span-3 text-center py-8">No pending applications</p>
          )}
        </div>
      )}

      {tab === 'Allocations' && (
        <div className="space-y-4">
          <div className="grid md:grid-cols-3 gap-3">
            {(data?.routes ?? []).slice(0, 6).map((r) => (
              <div key={String(r.id)} className={`${am.card} p-3 text-xs`}>
                <p className="font-bold">{String(r.routeCode)} — {String(r.routeName)}</p>
                <p className="text-slate-500 mt-1">{enrollments.filter((e) => e.routeCode === r.routeCode && e.status === 'ACTIVE').length} students allocated</p>
              </div>
            ))}
          </div>
          <div className={`${am.card} p-4`}>
            <h3 className="text-sm font-bold mb-3">Seat Allocation</h3>
            <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
              {enrollments.filter((e) => e.status === 'ACTIVE' && e.seatNumber).map((e) => (
                <div key={e.id} className={`p-2 rounded text-center text-[10px] font-bold ${e.specialAssistance ? 'bg-violet-100 text-violet-800' : 'bg-blue-50 text-blue-800'}`}>
                  <p>Seat {e.seatNumber}</p>
                  <p className="truncate">{e.studentName.split(' ')[0]}</p>
                  <p className="text-slate-400">{e.vehicleNumber}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'Boarding & Drop' && (
        <div className={`${am.card} overflow-hidden`}>
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b">
              <tr>
                {['Student', 'Class', 'Route', 'Boarding', 'Method', 'Drop', 'Boarded At', 'Actions'].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-bold text-slate-500 uppercase text-[10px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data?.boardingToday ?? []).map((b) => {
                const enr = enrollments.find((e) => e.studentName === String(b.studentName));
                return (
                  <tr key={String(b.id)} className="border-b">
                    <td className="px-3 py-2 font-bold">{String(b.studentName)}</td>
                    <td className="px-3 py-2">{String(b.className)}</td>
                    <td className="px-3 py-2">{String(b.routeName)}</td>
                    <td className="px-3 py-2"><StatusBadge status={String(b.boardingStatus)} /></td>
                    <td className="px-3 py-2">{String(b.boardingMethod) || '—'}</td>
                    <td className="px-3 py-2">{String(b.dropStatus) || '—'}</td>
                    <td className="px-3 py-2">{b.boardedAt ? new Date(String(b.boardedAt)).toLocaleTimeString() : '—'}</td>
                    <td className="px-3 py-2">
                      {enr && b.boardingStatus === 'PRESENT' && !b.dropStatus && (
                        <button type="button" disabled={busy} onClick={() => void act(() => recordStudentBoarding(enr.id, { action: 'DROP' }), 'Dropped')}
                          className="text-[10px] text-blue-600 font-bold">Mark Drop</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'Waiting List' && (
        <div className="space-y-3">
          {((data?.waitingListStudents ?? []) as Enrollment[]).map((e) => (
            <div key={e.id} className={`${am.card} p-4 flex justify-between items-center`}>
              <div>
                <h4 className="font-bold">{e.studentName}</h4>
                <p className="text-xs text-slate-500">{e.className}-{e.sectionName} · {e.pickupStopName}</p>
              </div>
              <button type="button" disabled={busy} onClick={() => void act(() => allocateStudentTransport(e.id, {
                routeId: (data?.routes?.[1] as { id: string })?.id,
                vehicleId: (data?.vehicles?.[1] as { id: string })?.id,
              }), 'Allocated from waiting list')} className={am.btnPrimary}>Allocate</button>
            </div>
          ))}
          {(data?.waitingListStudents ?? []).length === 0 && <p className="text-slate-400 text-center py-8 text-sm">Waiting list is empty</p>}
        </div>
      )}

      {tab === 'Requests' && (
        <div className="space-y-2">
          {(data?.pendingRequests ?? []).map((r) => (
            <div key={String(r.id)} className={`${am.card} p-4 flex justify-between items-start text-xs`}>
              <div>
                <p className="font-bold">{String(r.studentName)} — {String(r.requestType).replace(/_/g, ' ')}</p>
                <p className="text-slate-600 mt-1">{String(r.reason)}</p>
                <p className="text-slate-400 mt-1">{String(r.relativeTime)}</p>
              </div>
              <div className="flex gap-2">
                <button type="button" disabled={busy} onClick={() => void act(() => resolveTransportRequest(String(r.id), 'APPROVED'), 'Approved')} className={am.btnPrimary}>Approve</button>
                <button type="button" disabled={busy} onClick={() => void act(() => resolveTransportRequest(String(r.id), 'REJECTED'), 'Rejected')} className={am.btnSecondary}>Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'Transport Cards' && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {enrollments.filter((e) => e.transportCardId).map((e) => (
            <div key={e.id} className={`${am.card} p-4 border-2 border-indigo-100`}>
              <div className="flex justify-between items-start">
                <CreditCard className="w-8 h-8 text-indigo-500" />
                <StatusBadge status="ACTIVE" />
              </div>
              <h4 className="font-bold mt-2">{e.studentName}</h4>
              <p className="text-[10px] text-slate-500">{e.className}-{e.sectionName}</p>
              <div className="mt-3 space-y-1 text-[10px] font-mono">
                <p>Card: {e.transportCardId}</p>
                <p>QR: {e.qrCode}</p>
                <p>RFID: {e.rfidTag}</p>
              </div>
              <p className="text-xs mt-2">{e.routeName} · Seat {e.seatNumber} · {e.vehicleNumber}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'Reports' && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {(data?.reports ?? []).map((r) => (
            <div key={r} className={`${am.card} p-3 hover:shadow-md cursor-pointer`}>
              <FileText className="w-4 h-4 text-indigo-500 mb-2" />
              <p className="text-xs font-bold text-slate-700">{r}</p>
              <p className="text-[10px] text-slate-400 mt-1">Export CSV / PDF</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'Mobile Sync' && (
        <div className="grid md:grid-cols-2 gap-4">
          {Object.entries(mobileSync).map(([app, features]) => (
            <div key={app} className={`${am.card} p-4`}>
              <h4 className="text-sm font-bold flex items-center gap-2 mb-3">
                <Smartphone className="w-4 h-4 text-indigo-500" /> {app.replace(/([A-Z])/g, ' $1').trim()}
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
                  <td className="px-3 py-2">{String(l.details)}</td>
                  <td className="px-3 py-2">{String(l.performedBy)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'Settings' && (
        <div className="space-y-4">
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
          <div className={`${am.card} p-4`}>
            <h3 className="text-sm font-bold mb-2">Student Categories</h3>
            <div className="flex flex-wrap gap-1">
              {(data?.studentCategories ?? []).map((c) => <StatusBadge key={c} status={c} />)}
            </div>
          </div>
        </div>
      )}

      <AcademicModal open={!!selected} onClose={() => setSelected(null)} title={selected?.studentName ?? 'Student Profile'} large>
        {selected && (
          <div className="space-y-4 text-xs max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Kpi label="Application" value={selected.applicationNumber} />
              <Kpi label="Status" value={selected.status} />
              <Kpi label="Route" value={selected.routeName || '—'} />
              <Kpi label="Seat" value={selected.seatNumber ?? '—'} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><p className="font-bold flex items-center gap-1"><MapPin className="w-3 h-3" /> Pickup</p><p>{selected.pickupStopName} · {selected.pickupTime}</p><p className="text-slate-500">{selected.pickupAddress}</p></div>
              <div><p className="font-bold flex items-center gap-1"><MapPin className="w-3 h-3" /> Drop</p><p>{selected.dropStopName} · {selected.dropTime}</p></div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div><p className="text-slate-400">Vehicle</p><p className="font-bold">{selected.vehicleNumber || '—'}</p></div>
              <div><p className="text-slate-400">Driver</p><p className="font-bold">{selected.driverName || '—'}</p></div>
              <div><p className="text-slate-400">Fee</p><p className={`font-bold ${selected.feeDueAmount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{selected.feeDueAmount > 0 ? `₹${selected.feeDueAmount} due` : 'Paid'}</p></div>
            </div>
            {selected.medicalAlerts.length > 0 && (
              <div className="bg-red-50 p-2 rounded flex items-start gap-2">
                <Heart className="w-4 h-4 text-red-500 shrink-0" />
                <div>{selected.medicalAlerts.map((m) => <p key={m}>{m}</p>)}</div>
              </div>
            )}
            {selected.transportCardId && (
              <div className="bg-indigo-50 p-3 rounded font-mono text-[10px]">
                <p>Card: {selected.transportCardId}</p>
                <p>QR: {selected.qrCode} · RFID: {selected.rfidTag}</p>
              </div>
            )}
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              {selected.status === 'PENDING' && (
                <button type="button" disabled={busy} onClick={() => void act(() => approveStudentTransport(selected.id), 'Approved')} className={am.btnPrimary}><CheckCircle2 className="w-3.5 h-3.5" /> Approve</button>
              )}
              {selected.status === 'ACTIVE' && selected.todayBoarding !== 'PRESENT' && (
                <button type="button" disabled={busy} onClick={() => void act(() => recordStudentBoarding(selected.id, { method: 'QR' }), 'Boarded')} className={am.btnPrimary}><QrCode className="w-3.5 h-3.5" /> Verify Boarding</button>
              )}
              {selected.status === 'ACTIVE' && selected.todayBoarding === 'PRESENT' && !selected.todayDrop && (
                <button type="button" disabled={busy} onClick={() => void act(() => recordStudentBoarding(selected.id, { action: 'DROP' }), 'Dropped')} className={am.btnSecondary}><UserCheck className="w-3.5 h-3.5" /> Verify Drop</button>
              )}
            </div>
          </div>
        )}
      </AcademicModal>

      <AcademicModal open={showAppModal} onClose={() => setShowAppModal(false)} title="New Transport Application">
        <div className="space-y-3 text-xs">
          <label className="block">Student Name<input value={appForm.studentName} onChange={(e) => setAppForm({ ...appForm, studentName: e.target.value })} className={`${am.input} w-full mt-1`} /></label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">Admission #<input value={appForm.admissionNumber} onChange={(e) => setAppForm({ ...appForm, admissionNumber: e.target.value })} className={`${am.input} w-full mt-1`} /></label>
            <label className="block">Category<select value={appForm.category} onChange={(e) => setAppForm({ ...appForm, category: e.target.value })} className={`${am.input} w-full mt-1`}>{(data?.studentCategories ?? []).map((c) => <option key={c}>{c}</option>)}</select></label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">Class<input value={appForm.className} onChange={(e) => setAppForm({ ...appForm, className: e.target.value })} className={`${am.input} w-full mt-1`} /></label>
            <label className="block">Section<input value={appForm.sectionName} onChange={(e) => setAppForm({ ...appForm, sectionName: e.target.value })} className={`${am.input} w-full mt-1`} /></label>
          </div>
          <label className="block">Pickup Address<input value={appForm.pickupAddress} onChange={(e) => setAppForm({ ...appForm, pickupAddress: e.target.value })} className={`${am.input} w-full mt-1`} /></label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">Guardian<input value={appForm.guardianName} onChange={(e) => setAppForm({ ...appForm, guardianName: e.target.value })} className={`${am.input} w-full mt-1`} /></label>
            <label className="block">Mobile<input value={appForm.guardianMobile} onChange={(e) => setAppForm({ ...appForm, guardianMobile: e.target.value })} className={`${am.input} w-full mt-1`} /></label>
          </div>
          <button type="button" disabled={busy || !appForm.studentName} onClick={() => void act(async () => {
            await createStudentTransportApp({ ...appForm, academicYear });
            setShowAppModal(false);
            return fetchTransportStudentTransport(false, academicYear);
          }, 'Application submitted')} className={`${am.btnPrimary} w-full`}>Submit Application</button>
        </div>
      </AcademicModal>
    </AcademicPageShell>
  );
}
