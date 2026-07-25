import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Search, RefreshCw, Plus, User, Shield, FileText, Smartphone, Calendar,
  CheckCircle2, AlertTriangle, Star, Bus, MapPin, Clock, Award, ClipboardList,
  UserCheck, XCircle,
} from 'lucide-react';
import {
  assignStaffDuty, fetchTransportDriverAttendant, recordStaffAttendance,
  registerTransportStaff, resolveStaffLeave, verifyStaffLicense,
  type TransportDriverAttendant,
} from '../../../lib/transportServices';
import {
  am, AcademicLoading, AcademicModal, AcademicPageHeader, AcademicPageShell,
  FeeTabs, StatusBadge,
} from '../FeeFinanceManagement/FeeFinanceUi';

const TABS = [
  'Dashboard', 'Drivers', 'Attendants', 'Duty Roster', 'Attendance', 'Leave',
  'Documents', 'Training', 'Complaints', 'Performance', 'Reports', 'Mobile Sync', 'Audit', 'Settings',
] as const;
type TabId = (typeof TABS)[number];

type StaffMember = {
  id: string; employeeCode: string; name: string; role: string; mobile: string; email: string;
  employmentType: string; branch: string; bloodGroup: string;
  licenseNumber: string; licenseCategory: string; licenseExpiry: string;
  licenseExpiringSoon: boolean; licenseExpired: boolean;
  medicalFitnessExpiry: string; medicalExpiringSoon: boolean;
  policeVerificationStatus: string; backgroundVerified: boolean;
  shiftType: string; yearsExperience: number; rating: number; performanceScore: number;
  workflowStage: string; staffStatus: string; onDuty: boolean;
  accidentCount: number; violationCount: number; uniformIssued: boolean;
  routeCode: string; routeName: string; vehicleNumber: string;
  documentsCount: number; trainingsCount: number; pendingLeave: number; complianceOk: boolean;
  emergencyContact: string; emergencyMobile: string;
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

export function DriverAttendantView() {
  const [data, setData] = useState<TransportDriverAttendant | null>(null);
  const [tab, setTab] = useState<TabId>('Dashboard');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState<StaffMember | null>(null);
  const [showRegister, setShowRegister] = useState(false);
  const [regForm, setRegForm] = useState({
    name: '', role: 'Driver', mobile: '', employmentType: 'Permanent',
    licenseNumber: '', licenseCategory: 'LMV', yearsExperience: 0,
  });

  const load = useCallback(async (seed = false) => {
    setLoading(true);
    try { setData(await fetchTransportDriverAttendant(seed)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const staff = useMemo(() => (data?.staff ?? []) as StaffMember[], [data]);
  const q = search.toLowerCase();
  const filtered = useMemo(() => staff.filter((s) => {
    const matchQ = !q || s.name.toLowerCase().includes(q) || s.employeeCode.toLowerCase().includes(q)
      || s.routeName.toLowerCase().includes(q) || s.vehicleNumber.toLowerCase().includes(q);
    const matchR = roleFilter === 'ALL'
      || (roleFilter === 'Driver' && s.role.toLowerCase().includes('driver'))
      || (roleFilter === 'Attendant' && s.role.toLowerCase().includes('attendant'));
    return matchQ && matchR;
  }), [staff, q, roleFilter]);

  const act = async (fn: () => Promise<TransportDriverAttendant>, msg: string) => {
    setBusy(true); setMessage('');
    try {
      const res = await fn();
      setData(res);
      setMessage(msg);
      if (selected) {
        const u = (res.staff as StaffMember[]).find((s) => s.id === selected.id);
        if (u) setSelected(u);
      }
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Action failed'); }
    finally { setBusy(false); }
  };

  const roleMatrix = (data?.settings as { roleMatrix?: { role: string; permissions: string }[] })?.roleMatrix ?? [];
  const mobileSync = (data?.settings as { mobileSyncRules?: Record<string, string[]> })?.mobileSyncRules ?? {};

  if (loading && !data) return <AcademicLoading />;

  const StaffTable = ({ rows }: { rows: StaffMember[] }) => (
    <table className="w-full text-xs">
      <thead className="bg-slate-50 border-b">
        <tr>
          {['Code', 'Name', 'Type', 'Route', 'Vehicle', 'Shift', 'License', 'Rating', 'Status', 'Compliance', 'Actions'].map((h) => (
            <th key={h} className="px-3 py-2 text-left font-bold text-slate-500 uppercase text-[10px]">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((s) => (
          <tr key={s.id} className="border-b hover:bg-slate-50/80 cursor-pointer" onClick={() => setSelected(s)}>
            <td className="px-3 py-2 font-mono font-bold">{s.employeeCode}</td>
            <td className="px-3 py-2 font-medium">{s.name}</td>
            <td className="px-3 py-2">{s.employmentType}</td>
            <td className="px-3 py-2">{s.routeCode || '—'}</td>
            <td className="px-3 py-2">{s.vehicleNumber || '—'}</td>
            <td className="px-3 py-2">{s.shiftType}</td>
            <td className={`px-3 py-2 ${s.licenseExpired ? 'text-red-600 font-bold' : s.licenseExpiringSoon ? 'text-amber-600' : ''}`}>
              {s.licenseExpiry || '—'}{s.licenseExpired && ' ⚠'}
            </td>
            <td className="px-3 py-2 flex items-center gap-0.5"><Star className="w-3 h-3 text-amber-400" />{s.rating.toFixed(1)}</td>
            <td className="px-3 py-2"><StatusBadge status={s.staffStatus} /></td>
            <td className="px-3 py-2">{s.complianceOk ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <AlertTriangle className="w-4 h-4 text-amber-500" />}</td>
            <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
              <div className="flex gap-1">
                {!s.complianceOk && (
                  <button type="button" title="Verify" disabled={busy} onClick={() => void act(() => verifyStaffLicense(s.id), 'Verified')} className="p-1 rounded hover:bg-emerald-50 text-emerald-600"><Shield className="w-3.5 h-3.5" /></button>
                )}
                <button type="button" title="Attendance" disabled={busy} onClick={() => void act(() => recordStaffAttendance(s.id, { status: 'PRESENT' }), 'Marked present')} className="p-1 rounded hover:bg-blue-50 text-blue-600"><UserCheck className="w-3.5 h-3.5" /></button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="Transport Management › Driver & Attendant"
        title="Driver & Attendant Management"
        subtitle="Recruitment, KYC, license verification, duty allocation, attendance, leave, payroll integration & compliance"
        actions={(
          <div className="flex gap-2 flex-wrap">
            <button type="button" onClick={() => void load(true)} disabled={busy} className={am.btnSecondary}>
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
            <button type="button" onClick={() => setShowRegister(true)} className={am.btnPrimary}>
              <Plus className="w-3.5 h-3.5" /> Register Staff
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
            <Kpi label="Drivers" value={data?.kpis.totalDrivers ?? 0} />
            <Kpi label="Attendants" value={data?.kpis.totalAttendants ?? 0} />
            <Kpi label="On Duty" value={data?.kpis.onDuty ?? 0} color="text-emerald-600" />
            <Kpi label="On Leave" value={data?.kpis.onLeave ?? 0} color="text-amber-600" />
            <Kpi label="Present Today" value={data?.kpis.presentToday ?? 0} color="text-green-600" />
            <Kpi label="Compliance" value={`${data?.kpis.complianceRate ?? 0}%`} />
            <Kpi label="License Expiring" value={data?.kpis.licenseExpiring ?? 0} color="text-orange-600" />
            <Kpi label="License Expired" value={data?.kpis.licenseExpired ?? 0} color="text-red-600" />
            <Kpi label="Doc Expiring" value={data?.kpis.docExpiring ?? 0} color="text-amber-600" />
            <Kpi label="Pending Leave" value={data?.kpis.pendingLeave ?? 0} />
            <Kpi label="Open Complaints" value={data?.kpis.openComplaints ?? 0} color="text-red-500" />
            <Kpi label="Avg Rating" value={data?.kpis.avgRating ?? 0} sub="drivers" />
          </div>

          <div className={`${am.card} p-3`}>
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Staff Workflow</p>
            <div className="flex flex-wrap gap-1">
              {(data?.workflow ?? []).map((w, i) => (
                <span key={w} className="flex items-center gap-1">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 font-semibold">{w}</span>
                  {i < (data?.workflow.length ?? 0) - 1 && <span className="text-slate-300">→</span>}
                </span>
              ))}
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <div className={`${am.card} p-4`}>
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" /> Expiring Documents</h3>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {(data?.expiringDocuments ?? []).slice(0, 6).map((d) => (
                  <div key={String(d.id)} className="text-xs p-2 bg-amber-50 rounded flex justify-between">
                    <span><strong>{String(d.staffName)}</strong> — {String(d.documentType)}</span>
                    <span className="text-amber-700 font-bold">{Number(d.daysUntil)} days</span>
                  </div>
                ))}
              </div>
            </div>
            <div className={`${am.card} p-4`}>
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2"><Calendar className="w-4 h-4 text-blue-500" /> Pending Leave</h3>
              <div className="space-y-2">
                {(data?.pendingLeaves ?? []).map((l) => (
                  <div key={String(l.id)} className="text-xs p-2 bg-slate-50 rounded flex justify-between items-center">
                    <div>
                      <p className="font-bold">{String(l.staffName)} — {String(l.leaveType)}</p>
                      <p className="text-slate-500">{String(l.fromDate)} to {String(l.toDate)}</p>
                    </div>
                    <div className="flex gap-1">
                      <button type="button" disabled={busy} onClick={() => void act(() => resolveStaffLeave(String(l.id), 'APPROVED'), 'Approved')} className="text-[10px] text-emerald-600 font-bold">Approve</button>
                      <button type="button" disabled={busy} onClick={() => void act(() => resolveStaffLeave(String(l.id), 'REJECTED'), 'Rejected')} className="text-[10px] text-red-600 font-bold">Reject</button>
                    </div>
                  </div>
                ))}
                {(data?.pendingLeaves ?? []).length === 0 && <p className="text-slate-400 text-xs">No pending leave</p>}
              </div>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search staff, route, vehicle…" className={`${am.input} pl-8 text-xs w-full`} />
            </div>
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className={`${am.input} text-xs`}>
              <option value="ALL">All Roles</option>
              <option value="Driver">Drivers</option>
              <option value="Attendant">Attendants</option>
            </select>
          </div>

          <div className={`${am.card} overflow-hidden`}>
            <StaffTable rows={filtered} />
          </div>
        </div>
      )}

      {tab === 'Drivers' && <div className={`${am.card} overflow-hidden`}><StaffTable rows={(data?.drivers ?? []) as StaffMember[]} /></div>}
      {tab === 'Attendants' && <div className={`${am.card} overflow-hidden`}><StaffTable rows={(data?.attendants ?? []) as StaffMember[]} /></div>}

      {tab === 'Duty Roster' && (
        <div className={`${am.card} overflow-hidden`}>
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b">
              <tr>{['Employee', 'Role', 'Shift', 'Date', 'Status'].map((h) => <th key={h} className="px-3 py-2 text-left font-bold text-slate-500 uppercase text-[10px]">{h}</th>)}</tr>
            </thead>
            <tbody>
              {(data?.dutyRoster ?? []).map((r) => (
                <tr key={String(r.id)} className="border-b">
                  <td className="px-3 py-2 font-bold">{String(r.staffName)} <span className="text-slate-400 font-mono">{String(r.employeeCode)}</span></td>
                  <td className="px-3 py-2">{String(r.role)}</td>
                  <td className="px-3 py-2">{String(r.shiftType)}</td>
                  <td className="px-3 py-2">{String(r.rosterDate)}</td>
                  <td className="px-3 py-2"><StatusBadge status={String(r.status)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'Attendance' && (
        <div className={`${am.card} overflow-hidden`}>
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b">
              <tr>{['Staff', 'Role', 'Status', 'Method', 'Check In', 'Check Out'].map((h) => <th key={h} className="px-3 py-2 text-left font-bold text-slate-500 uppercase text-[10px]">{h}</th>)}</tr>
            </thead>
            <tbody>
              {(data?.attendanceToday ?? []).map((a) => (
                <tr key={String(a.id)} className="border-b">
                  <td className="px-3 py-2 font-bold">{String(a.staffName)}</td>
                  <td className="px-3 py-2">{String(a.role)}</td>
                  <td className="px-3 py-2"><StatusBadge status={String(a.status)} /></td>
                  <td className="px-3 py-2">{String(a.method)}</td>
                  <td className="px-3 py-2">{String(a.checkIn)}</td>
                  <td className="px-3 py-2">{String(a.checkOut) || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'Leave' && (
        <div className="space-y-2">
          {(data?.pendingLeaves ?? []).map((l) => (
            <div key={String(l.id)} className={`${am.card} p-4 flex justify-between items-start text-xs`}>
              <div>
                <p className="font-bold">{String(l.staffName)} ({String(l.employeeCode)}) — {String(l.leaveType)}</p>
                <p className="text-slate-600 mt-1">{String(l.fromDate)} to {String(l.toDate)}</p>
                <p className="text-slate-500">{String(l.reason)}</p>
              </div>
              <div className="flex gap-2">
                <button type="button" disabled={busy} onClick={() => void act(() => resolveStaffLeave(String(l.id), 'APPROVED'), 'Approved')} className={am.btnPrimary}>Approve</button>
                <button type="button" disabled={busy} onClick={() => void act(() => resolveStaffLeave(String(l.id), 'REJECTED'), 'Rejected')} className={am.btnSecondary}>Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'Documents' && (
        <div className="space-y-2">
          {(data?.expiringDocuments ?? []).map((d) => (
            <div key={String(d.id)} className={`${am.card} p-3 flex justify-between text-xs`}>
              <div>
                <p className="font-bold">{String(d.staffName)} — {String(d.documentType)}</p>
                <p className="text-slate-500">Expires: {String(d.expiryDate)}</p>
              </div>
              <span className={`font-bold ${Number(d.daysUntil) < 0 ? 'text-red-600' : 'text-amber-600'}`}>
                {Number(d.daysUntil) < 0 ? 'EXPIRED' : `${Number(d.daysUntil)} days`}
              </span>
            </div>
          ))}
        </div>
      )}

      {tab === 'Training' && (
        <div className="grid md:grid-cols-2 gap-3">
          {staff.filter((s) => s.trainingsCount > 0).slice(0, 8).map((s) => (
            <div key={s.id} className={`${am.card} p-3 text-xs`}>
              <p className="font-bold">{s.name}</p>
              <p className="text-slate-500">{s.role} · {s.trainingsCount} certifications</p>
              <p className="text-emerald-600 mt-1">Defensive Driving · First Aid · Child Safety</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'Complaints' && (
        <div className="space-y-2">
          {(data?.openComplaints ?? []).map((c) => (
            <div key={String(c.id)} className={`${am.card} p-4 border-l-4 border-l-red-400 text-xs`}>
              <p className="font-bold">{String(c.staffName)} — {String(c.complaintType)}</p>
              <p className="text-slate-600 mt-1">{String(c.description)}</p>
              <p className="text-slate-400 mt-1">{String(c.relativeTime)} · Severity: {String(c.severity)}</p>
            </div>
          ))}
          {(data?.openComplaints ?? []).length === 0 && <p className="text-slate-400 text-center py-8">No open complaints</p>}
        </div>
      )}

      {tab === 'Performance' && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {staff.filter((s) => s.role.toLowerCase().includes('driver')).sort((a, b) => b.performanceScore - a.performanceScore).slice(0, 9).map((s, i) => (
            <div key={s.id} className={`${am.card} p-4`}>
              <div className="flex justify-between">
                <span className="text-[10px] font-bold text-violet-600">#{i + 1}</span>
                <Award className="w-4 h-4 text-amber-500" />
              </div>
              <h4 className="font-bold mt-1">{s.name}</h4>
              <div className="flex gap-3 mt-2 text-xs">
                <span><Star className="w-3 h-3 inline text-amber-400" /> {s.rating.toFixed(1)}</span>
                <span>Score: {s.performanceScore}</span>
                <span>Exp: {s.yearsExperience}y</span>
              </div>
              <div className="w-full h-2 bg-slate-200 rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-violet-500" style={{ width: `${s.performanceScore}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'Reports' && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {(data?.reports ?? []).map((r) => (
            <div key={r} className={`${am.card} p-3 hover:shadow-md cursor-pointer`}>
              <FileText className="w-4 h-4 text-violet-500 mb-2" />
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
                <Smartphone className="w-4 h-4 text-violet-500" /> {app.replace(/([A-Z])/g, ' $1').trim()}
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
              <tr>{['Time', 'Entity', 'Action', 'Details', 'By'].map((h) => <th key={h} className="px-3 py-2 text-left font-bold text-slate-500 uppercase text-[10px]">{h}</th>)}</tr>
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

      <AcademicModal open={!!selected} onClose={() => setSelected(null)} title={selected?.name ?? 'Staff Profile'} large>
        {selected && (
          <div className="space-y-4 text-xs max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Kpi label="Code" value={selected.employeeCode} />
              <Kpi label="Status" value={selected.staffStatus} />
              <Kpi label="Rating" value={selected.rating.toFixed(1)} />
              <Kpi label="Performance" value={`${selected.performanceScore}%`} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><p className="font-bold">License</p><p>{selected.licenseNumber} ({selected.licenseCategory})</p><p className={selected.licenseExpired ? 'text-red-600' : ''}>Exp: {selected.licenseExpiry || 'N/A'}</p></div>
              <div><p className="font-bold">Medical Fitness</p><p>Exp: {selected.medicalFitnessExpiry || 'N/A'}</p><p>Police: {selected.policeVerificationStatus}</p></div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div><p className="text-slate-400">Route</p><p className="font-bold">{selected.routeName || '—'}</p></div>
              <div><p className="text-slate-400">Vehicle</p><p className="font-bold">{selected.vehicleNumber || '—'}</p></div>
              <div><p className="text-slate-400">Shift</p><p className="font-bold">{selected.shiftType}</p></div>
            </div>
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              <button type="button" disabled={busy} onClick={() => void act(() => assignStaffDuty(selected.id, {
                routeId: (data?.routes?.[0] as { id: string })?.id,
                vehicleId: (data?.vehicles?.[0] as { id: string })?.id,
                rosterDate: new Date().toISOString().slice(0, 10),
              }), 'Duty assigned')} className={am.btnPrimary}><MapPin className="w-3.5 h-3.5" /> Assign Duty</button>
              <button type="button" disabled={busy} onClick={() => void act(() => verifyStaffLicense(selected.id), 'Verified')} className={am.btnSecondary}><Shield className="w-3.5 h-3.5" /> Verify License</button>
              <button type="button" disabled={busy} onClick={() => void act(() => recordStaffAttendance(selected.id, { status: 'PRESENT' }), 'Present')} className={am.btnSecondary}><UserCheck className="w-3.5 h-3.5" /> Mark Present</button>
            </div>
          </div>
        )}
      </AcademicModal>

      <AcademicModal open={showRegister} onClose={() => setShowRegister(false)} title="Register Driver / Attendant">
        <div className="space-y-3 text-xs">
          <label className="block">Name<input value={regForm.name} onChange={(e) => setRegForm({ ...regForm, name: e.target.value })} className={`${am.input} w-full mt-1`} /></label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">Role<select value={regForm.role} onChange={(e) => setRegForm({ ...regForm, role: e.target.value })} className={`${am.input} w-full mt-1`}><option>Driver</option><option>Attendant</option></select></label>
            <label className="block">Type<select value={regForm.employmentType} onChange={(e) => setRegForm({ ...regForm, employmentType: e.target.value })} className={`${am.input} w-full mt-1`}>{(data?.employmentTypes ?? []).map((t) => <option key={t}>{t}</option>)}</select></label>
          </div>
          <label className="block">Mobile<input value={regForm.mobile} onChange={(e) => setRegForm({ ...regForm, mobile: e.target.value })} className={`${am.input} w-full mt-1`} /></label>
          {regForm.role === 'Driver' && (
            <div className="grid grid-cols-2 gap-2">
              <label className="block">License #<input value={regForm.licenseNumber} onChange={(e) => setRegForm({ ...regForm, licenseNumber: e.target.value })} className={`${am.input} w-full mt-1`} /></label>
              <label className="block">Category<select value={regForm.licenseCategory} onChange={(e) => setRegForm({ ...regForm, licenseCategory: e.target.value })} className={`${am.input} w-full mt-1`}><option>LMV</option><option>HMV</option></select></label>
            </div>
          )}
          <button type="button" disabled={busy || !regForm.name} onClick={() => void act(async () => {
            await registerTransportStaff(regForm);
            setShowRegister(false);
            return fetchTransportDriverAttendant(false);
          }, 'Staff registered')} className={`${am.btnPrimary} w-full`}>Register</button>
        </div>
      </AcademicModal>
    </AcademicPageShell>
  );
}
