import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Route, Calendar, CheckCircle2, Copy, Pause, Play, Send, Zap, Archive, XCircle,
  Search, RefreshCw, Plus, MapPin, Users, Truck, Clock, Shield, FileText, Smartphone,
  Pencil, Trash2,
} from 'lucide-react';
import {
  addPlanStop, approvePlan, archivePlan, cancelPlan, clonePlan, createRoutePlan,
  deletePlanStop, deleteRoutePlan, fetchTransportRoutePlanning, optimizePlanRoute,
  pausePlan, publishPlan, resumePlan, submitPlanApproval, updateRoutePlan,
  type TransportRoutePlanning,
} from '../../../lib/transportServices';
import {
  am, AcademicLoading, AcademicModal, AcademicPageHeader, AcademicPageShell,
  FeeTabs, StatusBadge,
} from '../FeeFinanceManagement/FeeFinanceUi';

const TABS = [
  'Dashboard', 'Planning Wizard', 'Active Plans', 'Calendar', 'Allocations',
  'Approvals', 'Reports', 'Mobile Sync', 'Settings',
] as const;
type TabId = (typeof TABS)[number];

type Plan = TransportRoutePlanning['plans'][number] & {
  id: string; planNumber: string; title: string; status: string; workflowStage: string;
  routeName: string; routeCode: string; vehicleNumber: string; driverName: string;
  transportCategory: string; priority: string; planType: string; branch: string;
  scheduledDate: string; startTime: string; endTime: string;
  occupiedSeats: number; capacity: number; occupancyPct: number; capacityValid: boolean;
  distanceKm: number; estimatedMinutes: number; fuelEstimate: number; costEstimate: number;
  optimizationNotes: string; weatherAlert: string; trafficAlternate: string; cancelReason: string;
  stops: { id: string; stopName: string; sequenceOrder: number; stopType: string; pickupTime: string; dropTime: string; studentCount: number; geoValidated: boolean }[];
  allocations: { entityType: string; entityName: string; stopName: string; seatNumber: number | null; specialNeeds: boolean }[];
  approvals: { approverRole: string; action: string; remarks: string }[];
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


function PlanStatus({ status }: { status: string }) {
  return <StatusBadge status={status} />;
}

export function RoutePlanningView() {
  const [data, setData] = useState<TransportRoutePlanning | null>(null);
  const [tab, setTab] = useState<TabId>('Dashboard');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [message, setMessage] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardForm, setWizardForm] = useState({
    title: '', routeId: '', planType: 'DAILY', transportCategory: 'Regular',
    priority: 'MEDIUM', branch: 'Main Campus', scheduledDate: new Date().toISOString().slice(0, 10),
  });
  const [editPlan, setEditPlan] = useState<Plan | null>(null);
  const [editForm, setEditForm] = useState({
    title: '', startTime: '', endTime: '', priority: 'MEDIUM', transportCategory: 'Regular',
  });
  const [stopForm, setStopForm] = useState({
    stopName: '', stopType: 'PICKUP', pickupTime: '', dropTime: '', sequenceOrder: '',
  });

  const load = useCallback(async (seed = false) => {
    setLoading(true);
    try { setData(await fetchTransportRoutePlanning(seed, academicYear)); }
    finally { setLoading(false); }
  }, [academicYear]);

  useEffect(() => { void load(); }, [load]);

  const plans = useMemo(() => (data?.plans ?? []) as Plan[], [data]);
  const q = search.toLowerCase();
  const filtered = useMemo(() => plans.filter((p) => {
    const matchQ = !q || p.title.toLowerCase().includes(q) || p.planNumber.toLowerCase().includes(q)
      || p.routeName.toLowerCase().includes(q) || p.vehicleNumber.toLowerCase().includes(q);
    const matchS = statusFilter === 'ALL' || p.status === statusFilter;
    return matchQ && matchS;
  }), [plans, q, statusFilter]);

  const act = async (fn: () => Promise<unknown>, msg: string) => {
    setBusy(true); setMessage('');
    try {
      setData(await fn() as TransportRoutePlanning);
      setMessage(msg);
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Action failed'); }
    finally { setBusy(false); }
  };

  const activePlans = useMemo(
    () => plans.filter((p) => ['ACTIVE', 'PAUSED', 'APPROVED'].includes(p.status)),
    [plans],
  );

  const openEditPlan = (p: Plan) => {
    setEditPlan(p);
    setEditForm({
      title: p.title, startTime: p.startTime, endTime: p.endTime,
      priority: p.priority, transportCategory: p.transportCategory,
    });
    setStopForm({ stopName: '', stopType: 'PICKUP', pickupTime: '', dropTime: '', sequenceOrder: '' });
  };

  const refreshAndSyncEdit = (next: TransportRoutePlanning) => {
    setData(next);
    if (editPlan) {
      const updated = (next.plans as Plan[]).find((p) => p.id === editPlan.id) ?? null;
      setEditPlan(updated);
    }
  };

  const actEdit = async (fn: () => Promise<TransportRoutePlanning>, msg: string) => {
    setBusy(true); setMessage('');
    try {
      const next = await fn();
      refreshAndSyncEdit(next);
      setMessage(msg);
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Action failed'); }
    finally { setBusy(false); }
  };

  const workflow = data?.workflow ?? [];
  const roleMatrix = (data?.settings as { roleMatrix?: { role: string; permissions: string }[] })?.roleMatrix ?? [];
  const mobileSync = (data?.settings as { mobileSyncRules?: Record<string, string[]> })?.mobileSyncRules ?? {};

  if (loading && !data) return <AcademicLoading />;

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="Transport Management › Route Planning"
        title="Route Planning"
        subtitle="Design, optimize, schedule & manage daily transport — academic session mapping, capacity validation, approval workflow & mobile sync"
        actions={(
          <div className="flex gap-2 flex-wrap">
            <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className={`${am.input} text-xs`}>
              {(data?.academicYears ?? ['2025-26']).map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <button type="button" onClick={() => void load(true)} disabled={busy} className={am.btnSecondary}>
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
            <button type="button" onClick={() => { setShowWizard(true); setWizardStep(0); }} className={am.btnPrimary}>
              <Plus className="w-3.5 h-3.5" /> New Route Plan
            </button>
          </div>
        )}
      />

      {message && (
        <div className={`mb-3 px-3 py-2 rounded-lg text-xs font-medium ${message.includes('fail') || message.includes('error') ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
          {message}
        </div>
      )}

      <FeeTabs tabs={[...TABS]} active={tab} onChange={(t) => setTab(t as TabId)} />

      {/* ── Dashboard ── */}
      {tab === 'Dashboard' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
            <Kpi label="Total Plans" value={data?.kpis.totalPlans ?? 0} />
            <Kpi label="Active" value={data?.kpis.activePlans ?? 0} color="text-emerald-600" />
            <Kpi label="Pending" value={data?.kpis.pendingPlans ?? 0} color="text-amber-600" />
            <Kpi label="Draft" value={data?.kpis.draftPlans ?? 0} />
            <Kpi label="Completed" value={data?.kpis.completedPlans ?? 0} color="text-blue-600" />
            <Kpi label="Cancelled" value={data?.kpis.cancelledPlans ?? 0} color="text-red-500" />
            <Kpi label="Awaiting Approval" value={data?.kpis.pendingApprovals ?? 0} color="text-violet-600" />
            <Kpi label="Avg Occupancy" value={`${data?.kpis.avgOccupancy ?? 0}%`} sub="seat utilization" />
          </div>

          <div className={`${am.card} p-4`}>
            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Route className="w-4 h-4 text-blue-500" /> Planning Workflow
            </h3>
            <div className="flex flex-wrap gap-1">
              {workflow.map((w, i) => (
                <div key={w.stage} className="flex items-center gap-1">
                  <span className="text-[10px] px-2 py-1 rounded-full bg-blue-50 text-blue-700 font-semibold">{w.label}</span>
                  {i < workflow.length - 1 && <span className="text-slate-300 text-xs">→</span>}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search plans, routes, vehicles…" className={`${am.input} pl-8 text-xs w-full`} />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`${am.input} text-xs`}>
              <option value="ALL">All Statuses</option>
              {(data?.planStatuses ?? []).map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className={`${am.card} overflow-hidden`}>
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b">
                <tr>
                  {['Plan #', 'Title', 'Route', 'Vehicle', 'Date', 'Category', 'Seats', 'Status', 'Stage', 'Actions'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-bold text-slate-500 uppercase text-[10px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b hover:bg-slate-50/80 cursor-pointer" onClick={() => setSelectedPlan(p)}>
                    <td className="px-3 py-2 font-mono font-bold">{p.planNumber}</td>
                    <td className="px-3 py-2 font-medium">{p.title}</td>
                    <td className="px-3 py-2">{p.routeCode} — {p.routeName}</td>
                    <td className="px-3 py-2">{p.vehicleNumber || '—'}</td>
                    <td className="px-3 py-2">{p.scheduledDate || '—'}</td>
                    <td className="px-3 py-2"><StatusBadge status={p.transportCategory} /></td>
                    <td className="px-3 py-2">
                      <span className={p.capacityValid ? 'text-emerald-600' : 'text-red-500'}>
                        {p.occupiedSeats}/{p.capacity}
                      </span>
                    </td>
                    <td className="px-3 py-2"><PlanStatus status={p.status} /></td>
                    <td className="px-3 py-2 text-[10px] text-slate-500">{p.workflowStage.replace(/_/g, ' ')}</td>
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        {p.status === 'DRAFT' && (
                          <button type="button" title="Optimize" disabled={busy} onClick={() => void act(() => optimizePlanRoute(p.id), 'Route optimized')} className="p-1 rounded hover:bg-blue-50 text-blue-600"><Zap className="w-3.5 h-3.5" /></button>
                        )}
                        {p.status === 'DRAFT' && (
                          <button type="button" title="Submit" disabled={busy} onClick={() => void act(() => submitPlanApproval(p.id), 'Submitted for approval')} className="p-1 rounded hover:bg-violet-50 text-violet-600"><Send className="w-3.5 h-3.5" /></button>
                        )}
                        {p.status === 'APPROVED' && (
                          <button type="button" title="Publish" disabled={busy} onClick={() => void act(() => publishPlan(p.id), 'Route published')} className="p-1 rounded hover:bg-emerald-50 text-emerald-600"><Play className="w-3.5 h-3.5" /></button>
                        )}
                        {p.status === 'ACTIVE' && (
                          <button type="button" title="Pause" disabled={busy} onClick={() => void act(() => pausePlan(p.id), 'Route paused')} className="p-1 rounded hover:bg-amber-50 text-amber-600"><Pause className="w-3.5 h-3.5" /></button>
                        )}
                        {p.status === 'PAUSED' && (
                          <button type="button" title="Resume" disabled={busy} onClick={() => void act(() => resumePlan(p.id), 'Route resumed')} className="p-1 rounded hover:bg-emerald-50 text-emerald-600"><Play className="w-3.5 h-3.5" /></button>
                        )}
                        <button type="button" title="Clone" disabled={busy} onClick={() => void act(() => clonePlan(p.id), 'Plan cloned')} className="p-1 rounded hover:bg-slate-100 text-slate-600"><Copy className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={10} className="px-3 py-8 text-center text-slate-400">No route plans found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Planning Wizard ── */}
      {tab === 'Planning Wizard' && (
        <div className={`${am.card} p-5 max-w-3xl`}>
          <h3 className="text-sm font-bold text-slate-800 mb-4">Step-by-Step Route Creation</h3>
          <div className="flex gap-2 mb-5 flex-wrap">
            {['Academic Session', 'Route Design', 'Vehicle & Driver', 'Student Allocation', 'Review & Submit'].map((s, i) => (
              <button key={s} type="button" onClick={() => setWizardStep(i)}
                className={`text-[10px] px-3 py-1.5 rounded-full font-bold ${wizardStep === i ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {i + 1}. {s}
              </button>
            ))}
          </div>
          {wizardStep === 0 && (
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs">Academic Year<select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className={`${am.input} w-full mt-1`}>{(data?.academicYears ?? []).map((y) => <option key={y}>{y}</option>)}</select></label>
              <label className="text-xs">Plan Type<select value={wizardForm.planType} onChange={(e) => setWizardForm({ ...wizardForm, planType: e.target.value })} className={`${am.input} w-full mt-1`}>{(data?.planTypes ?? []).map((t) => <option key={t}>{t}</option>)}</select></label>
              <label className="text-xs">Branch<input value={wizardForm.branch} onChange={(e) => setWizardForm({ ...wizardForm, branch: e.target.value })} className={`${am.input} w-full mt-1`} /></label>
              <label className="text-xs">Scheduled Date<input type="date" value={wizardForm.scheduledDate} onChange={(e) => setWizardForm({ ...wizardForm, scheduledDate: e.target.value })} className={`${am.input} w-full mt-1`} /></label>
              <label className="text-xs col-span-2">Category<select value={wizardForm.transportCategory} onChange={(e) => setWizardForm({ ...wizardForm, transportCategory: e.target.value })} className={`${am.input} w-full mt-1`}>{(data?.transportCategories ?? []).map((c) => <option key={c}>{c}</option>)}</select></label>
            </div>
          )}
          {wizardStep === 1 && (
            <div className="space-y-3">
              <label className="text-xs block">Plan Title<input value={wizardForm.title} onChange={(e) => setWizardForm({ ...wizardForm, title: e.target.value })} placeholder="Morning Route A Plan" className={`${am.input} w-full mt-1`} /></label>
              <label className="text-xs block">Master Route<select value={wizardForm.routeId} onChange={(e) => setWizardForm({ ...wizardForm, routeId: e.target.value })} className={`${am.input} w-full mt-1`}>
                <option value="">Select route…</option>
                {(data?.routes ?? []).map((r) => <option key={String(r.id)} value={String(r.id)}>{String(r.routeCode)} — {String(r.routeName)}</option>)}
              </select></label>
              <label className="text-xs block">Priority<select value={wizardForm.priority} onChange={(e) => setWizardForm({ ...wizardForm, priority: e.target.value })} className={`${am.input} w-full mt-1`}>{(data?.priorities ?? []).map((p) => <option key={p}>{p}</option>)}</select></label>
            </div>
          )}
          {wizardStep === 2 && (
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className={`${am.card} p-3`}><Truck className="w-4 h-4 text-blue-500 mb-1" /><p className="font-bold">Available Vehicles</p><p className="text-2xl font-black">{(data?.vehicles ?? []).filter((v) => v.available).length}</p></div>
              <div className={`${am.card} p-3`}><Users className="w-4 h-4 text-emerald-500 mb-1" /><p className="font-bold">Drivers On Duty</p><p className="text-2xl font-black">{(data?.drivers ?? []).filter((d) => d.onDuty).length}</p></div>
              <p className="col-span-2 text-slate-500">Vehicle & driver assignment happens after plan creation via the plan detail panel.</p>
            </div>
          )}
          {wizardStep === 3 && (
            <p className="text-xs text-slate-600">Student & staff allocation is auto-seeded from route stops. Use the Allocations tab for manual seat overrides and special-needs planning.</p>
          )}
          {wizardStep === 4 && (
            <div className="text-xs space-y-2 bg-slate-50 p-3 rounded-lg">
              <p><strong>Title:</strong> {wizardForm.title || '(auto from route)'}</p>
              <p><strong>Type:</strong> {wizardForm.planType} · <strong>Category:</strong> {wizardForm.transportCategory}</p>
              <p><strong>Branch:</strong> {wizardForm.branch} · <strong>Date:</strong> {wizardForm.scheduledDate}</p>
            </div>
          )}
          <div className="flex justify-between mt-5">
            <button type="button" disabled={wizardStep === 0} onClick={() => setWizardStep((s) => s - 1)} className={am.btnSecondary}>Back</button>
            {wizardStep < 4 ? (
              <button type="button" onClick={() => setWizardStep((s) => s + 1)} className={am.btnPrimary}>Next</button>
            ) : (
              <button type="button" disabled={busy} onClick={() => void act(async () => {
                return createRoutePlan({ ...wizardForm, academicYear });
              }, 'Route plan created')} className={am.btnPrimary}>Create Plan</button>
            )}
          </div>
        </div>
      )}

      {/* ── Active Plans ── */}
      {tab === 'Active Plans' && (
        <div className="space-y-4">
          <div className={`${am.card} p-4`}>
            <h3 className="text-sm font-bold text-slate-800 mb-1 flex items-center gap-2">
              <Route className="w-4 h-4 text-emerald-500" /> Active Route Plans
            </h3>
            <p className="text-[10px] text-slate-500 mb-3">
              Manage live, paused, and approved routes — edit plan details, add stops, or remove stops from the current route.
            </p>
            <div className={`${am.card} overflow-hidden border`}>
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    {['Plan #', 'Route', 'Vehicle', 'Schedule', 'Stops', 'Seats', 'Status', 'Actions'].map((h) => (
                      <th key={h} className="px-3 py-2 text-left font-bold text-slate-500 uppercase text-[10px]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activePlans.map((p) => (
                    <tr key={p.id} className="border-b hover:bg-slate-50/80">
                      <td className="px-3 py-2">
                        <p className="font-mono font-bold text-blue-600">{p.planNumber}</p>
                        <p className="text-[10px] text-slate-500 truncate max-w-[140px]">{p.title}</p>
                      </td>
                      <td className="px-3 py-2">
                        <p className="font-medium">{p.routeCode || '—'}</p>
                        <p className="text-[10px] text-slate-500">{p.routeName || '—'}</p>
                      </td>
                      <td className="px-3 py-2">{p.vehicleNumber || '—'}</td>
                      <td className="px-3 py-2">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{p.startTime}–{p.endTime}</span>
                        {p.scheduledDate && <p className="text-[10px] text-slate-400">{p.scheduledDate}</p>}
                      </td>
                      <td className="px-3 py-2">
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{p.stops?.length ?? 0}</span>
                      </td>
                      <td className="px-3 py-2">{p.occupiedSeats}/{p.capacity}</td>
                      <td className="px-3 py-2"><PlanStatus status={p.status} /></td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <button
                            type="button" title="Edit route & stops" disabled={busy}
                            onClick={() => openEditPlan(p)}
                            className="p-1.5 rounded hover:bg-blue-50 text-blue-600 border border-blue-100"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button" title="Delete plan" disabled={busy}
                            onClick={() => {
                              if (!window.confirm(`Remove "${p.title}" from active plans?`)) return;
                              void act(() => deleteRoutePlan(p.id), 'Active plan removed');
                            }}
                            className="p-1.5 rounded hover:bg-red-50 text-red-600 border border-red-100"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {activePlans.length === 0 && (
                    <tr><td colSpan={8} className="px-3 py-8 text-center text-slate-400">No active route plans</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {activePlans.map((p) => (
              <div key={p.id} className={`${am.card} p-4 hover:shadow-md transition`}>
                <div className="flex justify-between items-start mb-2">
                  <span className="font-mono text-[10px] font-bold text-blue-600">{p.planNumber}</span>
                  <PlanStatus status={p.status} />
                </div>
                <h4 className="font-bold text-sm text-slate-800">{p.title}</h4>
                <p className="text-[10px] text-slate-500 mt-1">{p.routeName} · {p.vehicleNumber || 'No vehicle'}</p>
                <div className="flex gap-3 mt-3 text-[10px] text-slate-600">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{p.startTime}–{p.endTime}</span>
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" />{p.occupiedSeats}/{p.capacity}</span>
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{p.stops?.length ?? 0} stops</span>
                </div>
                {(p.stops ?? []).length > 0 && (
                  <div className="mt-2 space-y-0.5">
                    {(p.stops ?? []).slice(0, 3).map((s) => (
                      <p key={s.id} className="text-[10px] text-slate-500 truncate">
                        {s.sequenceOrder}. {s.stopName}
                      </p>
                    ))}
                    {(p.stops?.length ?? 0) > 3 && (
                      <p className="text-[10px] text-slate-400">+{(p.stops?.length ?? 0) - 3} more stops</p>
                    )}
                  </div>
                )}
                {p.weatherAlert && <p className="text-[10px] text-amber-600 mt-2">⚠ {p.weatherAlert}</p>}
                <div className="flex gap-2 mt-3 pt-3 border-t">
                  <button type="button" disabled={busy} onClick={() => openEditPlan(p)} className={`${am.btnSecondary} text-[10px] flex-1`}>
                    <Pencil className="w-3 h-3" /> Edit
                  </button>
                  <button
                    type="button" disabled={busy}
                    onClick={() => {
                      if (!window.confirm(`Remove "${p.title}" from active plans?`)) return;
                      void act(() => deleteRoutePlan(p.id), 'Active plan removed');
                    }}
                    className="text-[10px] px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-3 h-3 inline" /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Calendar ── */}
      {tab === 'Calendar' && (
        <div className={`${am.card} p-4`}>
          <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2"><Calendar className="w-4 h-4" /> Transport Planning Calendar</h3>
          <div className="space-y-2">
            {(data?.calendar ?? []).map((c, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 text-xs">
                <span className="font-mono font-bold w-24">{String(c.date)}</span>
                <span className="font-medium flex-1">{String(c.title)}</span>
                <span className="text-slate-500">{String(c.startTime)}–{String(c.endTime)}</span>
                <PlanStatus status={String(c.status)} />
              </div>
            ))}
            {(data?.calendar ?? []).length === 0 && <p className="text-slate-400 text-xs text-center py-6">No scheduled plans</p>}
          </div>
        </div>
      )}

      {/* ── Allocations ── */}
      {tab === 'Allocations' && (
        <div className="space-y-3">
          {plans.slice(0, 4).map((p) => (
            <div key={p.id} className={`${am.card} p-4`}>
              <div className="flex justify-between mb-2">
                <h4 className="font-bold text-sm">{p.title}</h4>
                <span className={`text-xs font-bold ${p.capacityValid ? 'text-emerald-600' : 'text-red-500'}`}>
                  {p.occupiedSeats}/{p.capacity} seats {p.capacityValid ? '✓' : '✗ overbooked'}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {(p.allocations ?? []).slice(0, 8).map((a, i) => (
                  <div key={i} className="text-[10px] p-2 bg-slate-50 rounded">
                    <span className="font-bold">{a.entityName}</span>
                    <p className="text-slate-500">{a.entityType} · {a.stopName}{a.seatNumber ? ` · Seat ${a.seatNumber}` : ''}{a.specialNeeds ? ' · ♿' : ''}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Approvals ── */}
      {tab === 'Approvals' && (
        <div className="space-y-3">
          {(data?.pendingApprovals ?? []).length === 0 && (
            <p className="text-slate-400 text-xs text-center py-8">No plans awaiting approval</p>
          )}
          {(data?.pendingApprovals ?? []).map((p) => {
            const plan = p as Plan;
            return (
              <div key={plan.id} className={`${am.card} p-4`}>
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono text-[10px] font-bold text-violet-600">{plan.planNumber}</span>
                    <h4 className="font-bold text-sm mt-1">{plan.title}</h4>
                    <p className="text-[10px] text-slate-500">{plan.routeName} · {plan.transportCategory} · {plan.distanceKm} km</p>
                  </div>
                  <div className="flex gap-1">
                    {['Planner', 'Transport Manager', 'Principal'].map((role) => (
                      <button key={role} type="button" disabled={busy}
                        onClick={() => void act(() => approvePlan(plan.id, { approverRole: role, action: 'APPROVED', remarks: `Approved by ${role}` }), `${role} approved`)}
                        className={`${am.btnSecondary} text-[10px] px-2 py-1`}>
                        <CheckCircle2 className="w-3 h-3 inline mr-1" />{role}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 mt-3 flex-wrap">
                  {(plan.approvals ?? []).map((a, i) => (
                    <StatusBadge key={i} status={`${a.approverRole}: ${a.action}`} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Reports ── */}
      {tab === 'Reports' && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {(data?.reports ?? []).map((r) => (
            <div key={r} className={`${am.card} p-3 hover:shadow-md cursor-pointer transition`}>
              <FileText className="w-4 h-4 text-blue-500 mb-2" />
              <p className="text-xs font-bold text-slate-700">{r}</p>
              <p className="text-[10px] text-slate-400 mt-1">Export CSV / PDF</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Mobile Sync ── */}
      {tab === 'Mobile Sync' && (
        <div className="grid md:grid-cols-2 gap-4">
          {Object.entries(mobileSync).map(([app, features]) => (
            <div key={app} className={`${am.card} p-4`}>
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
                <Smartphone className="w-4 h-4 text-blue-500" /> {app.replace(/([A-Z])/g, ' $1').trim()}
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

      {/* ── Settings ── */}
      {tab === 'Settings' && (
        <div className="space-y-4">
          <div className={`${am.card} p-4`}>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3"><Shield className="w-4 h-4" /> Role-Based Access</h3>
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
            <h3 className="text-sm font-bold text-slate-800 mb-2">Transport Categories</h3>
            <div className="flex flex-wrap gap-1">
              {(data?.transportCategories ?? []).map((c) => <StatusBadge key={c} status={c} />)}
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Active Plan Modal ── */}
      <AcademicModal
        open={!!editPlan}
        onClose={() => setEditPlan(null)}
        title={editPlan ? `Edit Route — ${editPlan.planNumber}` : 'Edit Route'}
      >
        {editPlan && (
          <div className="space-y-4 text-xs max-h-[75vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              <label className="block col-span-2">
                Plan Title
                <input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} className={`${am.input} w-full mt-1`} />
              </label>
              <label className="block">
                Start Time
                <input type="time" value={editForm.startTime} onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })} className={`${am.input} w-full mt-1`} />
              </label>
              <label className="block">
                End Time
                <input type="time" value={editForm.endTime} onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })} className={`${am.input} w-full mt-1`} />
              </label>
              <label className="block">
                Priority
                <select value={editForm.priority} onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })} className={`${am.input} w-full mt-1`}>
                  {(data?.priorities ?? []).map((pr) => <option key={pr} value={pr}>{pr}</option>)}
                </select>
              </label>
              <label className="block">
                Category
                <select value={editForm.transportCategory} onChange={(e) => setEditForm({ ...editForm, transportCategory: e.target.value })} className={`${am.input} w-full mt-1`}>
                  {(data?.transportCategories ?? []).map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
            </div>

            <div className="flex gap-2">
              <button
                type="button" disabled={busy}
                onClick={() => void actEdit(() => updateRoutePlan(editPlan.id, editForm), 'Plan details saved')}
                className={am.btnPrimary}
              >
                Save Plan Details
              </button>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-bold mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Route Stops ({editPlan.stops?.length ?? 0})</span>
                {editPlan.routeName && (
                  <span className="text-[10px] font-normal text-slate-500">Linked route: {editPlan.routeCode} — {editPlan.routeName}</span>
                )}
              </h4>

              <div className="space-y-1 mb-3">
                {(editPlan.stops ?? []).map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-2 bg-slate-50 rounded gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="font-medium">{s.sequenceOrder}. {s.stopName}</span>
                      <span className="text-slate-400 ml-2">({s.stopType})</span>
                      <p className="text-[10px] text-slate-500">{s.pickupTime || s.dropTime || '—'} · {s.studentCount} students</p>
                    </div>
                    <button
                      type="button" title="Remove stop" disabled={busy}
                      onClick={() => {
                        if (!window.confirm(`Remove stop "${s.stopName}" from this route?`)) return;
                        void actEdit(() => deletePlanStop(s.id), 'Stop removed');
                      }}
                      className="p-1.5 rounded hover:bg-red-50 text-red-600 shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {(editPlan.stops ?? []).length === 0 && (
                  <p className="text-slate-400 text-center py-3">No stops on this route yet</p>
                )}
              </div>

              <div className={`${am.card} p-3 border border-dashed border-slate-200`}>
                <p className="font-bold text-[10px] uppercase text-slate-500 mb-2 flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Add Stop
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block col-span-2">
                    Stop Name
                    <input
                      value={stopForm.stopName}
                      onChange={(e) => setStopForm({ ...stopForm, stopName: e.target.value })}
                      placeholder="e.g. Green Park Junction"
                      className={`${am.input} w-full mt-1`}
                    />
                  </label>
                  <label className="block">
                    Type
                    <select value={stopForm.stopType} onChange={(e) => setStopForm({ ...stopForm, stopType: e.target.value })} className={`${am.input} w-full mt-1`}>
                      <option value="PICKUP">Pickup</option>
                      <option value="DROP">Drop</option>
                      <option value="BOTH">Both</option>
                    </select>
                  </label>
                  <label className="block">
                    Sequence
                    <input
                      type="number" min={1}
                      value={stopForm.sequenceOrder}
                      onChange={(e) => setStopForm({ ...stopForm, sequenceOrder: e.target.value })}
                      placeholder="Auto"
                      className={`${am.input} w-full mt-1`}
                    />
                  </label>
                  <label className="block">
                    Pickup Time
                    <input type="time" value={stopForm.pickupTime} onChange={(e) => setStopForm({ ...stopForm, pickupTime: e.target.value })} className={`${am.input} w-full mt-1`} />
                  </label>
                  <label className="block">
                    Drop Time
                    <input type="time" value={stopForm.dropTime} onChange={(e) => setStopForm({ ...stopForm, dropTime: e.target.value })} className={`${am.input} w-full mt-1`} />
                  </label>
                </div>
                <button
                  type="button"
                  disabled={busy || !stopForm.stopName.trim()}
                  onClick={() => void actEdit(async () => {
                    const body: Record<string, unknown> = {
                      stopName: stopForm.stopName.trim(),
                      stopType: stopForm.stopType,
                      pickupTime: stopForm.pickupTime,
                      dropTime: stopForm.dropTime,
                    };
                    if (stopForm.sequenceOrder) body.sequenceOrder = Number(stopForm.sequenceOrder);
                    const result = await addPlanStop(editPlan.id, body);
                    setStopForm({ stopName: '', stopType: 'PICKUP', pickupTime: '', dropTime: '', sequenceOrder: '' });
                    return result;
                  }, 'Stop added to route')}
                  className={`${am.btnPrimary} mt-3 w-full`}
                >
                  <Plus className="w-3.5 h-3.5" /> Add Stop to Route
                </button>
              </div>
            </div>
          </div>
        )}
      </AcademicModal>

      {/* ── Plan Detail Modal ── */}
      <AcademicModal open={!!selectedPlan} onClose={() => setSelectedPlan(null)} title={selectedPlan?.title ?? 'Plan Details'}>
        {selectedPlan && (
          <div className="space-y-4 text-xs max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-2">
              <Kpi label="Plan #" value={selectedPlan.planNumber} />
              <Kpi label="Status" value={selectedPlan.status} />
              <Kpi label="Distance" value={`${selectedPlan.distanceKm} km`} />
              <Kpi label="Est. Time" value={`${selectedPlan.estimatedMinutes} min`} />
              <Kpi label="Fuel Est." value={`${selectedPlan.fuelEstimate.toFixed(1)} L`} />
              <Kpi label="Cost Est." value={`₹${selectedPlan.costEstimate.toFixed(0)}`} />
            </div>

            {selectedPlan.optimizationNotes && (
              <div className="bg-blue-50 p-2 rounded text-blue-800"><Zap className="w-3 h-3 inline mr-1" />{selectedPlan.optimizationNotes}</div>
            )}
            {selectedPlan.trafficAlternate && (
              <div className="bg-amber-50 p-2 rounded text-amber-800">Alternate: {selectedPlan.trafficAlternate}</div>
            )}

            <div>
              <h4 className="font-bold mb-2 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Stops ({selectedPlan.stops?.length ?? 0})</h4>
              <div className="space-y-1">
                {(selectedPlan.stops ?? []).map((s) => (
                  <div key={s.id} className="flex justify-between p-2 bg-slate-50 rounded">
                    <span>{s.sequenceOrder}. {s.stopName} <span className="text-slate-400">({s.stopType})</span></span>
                    <span>{s.pickupTime || s.dropTime} · {s.studentCount} students {s.geoValidated ? '✓ geo' : ''}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t">
              {selectedPlan.status === 'DRAFT' && (
                <button type="button" disabled={busy} onClick={() => void act(() => optimizePlanRoute(selectedPlan.id), 'Optimized')} className={am.btnSecondary}><Zap className="w-3.5 h-3.5" /> Optimize</button>
              )}
              {selectedPlan.status === 'DRAFT' && (
                <button type="button" disabled={busy} onClick={() => void act(() => submitPlanApproval(selectedPlan.id), 'Submitted')} className={am.btnPrimary}><Send className="w-3.5 h-3.5" /> Submit</button>
              )}
              {selectedPlan.status === 'APPROVED' && (
                <button type="button" disabled={busy} onClick={() => void act(() => publishPlan(selectedPlan.id), 'Published')} className={am.btnPrimary}><Play className="w-3.5 h-3.5" /> Publish</button>
              )}
              {selectedPlan.status === 'ACTIVE' && (
                <button type="button" disabled={busy} onClick={() => void act(() => pausePlan(selectedPlan.id), 'Paused')} className={am.btnSecondary}><Pause className="w-3.5 h-3.5" /> Pause</button>
              )}
              {selectedPlan.status === 'PAUSED' && (
                <button type="button" disabled={busy} onClick={() => void act(() => resumePlan(selectedPlan.id), 'Resumed')} className={am.btnPrimary}><Play className="w-3.5 h-3.5" /> Resume</button>
              )}
              {!['CANCELLED', 'ARCHIVED'].includes(selectedPlan.status) && (
                <button type="button" disabled={busy} onClick={() => void act(() => cancelPlan(selectedPlan.id, 'Cancelled by planner'), 'Cancelled')} className={am.btnSecondary}><XCircle className="w-3.5 h-3.5" /> Cancel</button>
              )}
              <button type="button" disabled={busy} onClick={() => void act(() => clonePlan(selectedPlan.id), 'Cloned')} className={am.btnSecondary}><Copy className="w-3.5 h-3.5" /> Duplicate</button>
              {['COMPLETED', 'CANCELLED'].includes(selectedPlan.status) && (
                <button type="button" disabled={busy} onClick={() => void act(() => archivePlan(selectedPlan.id), 'Archived')} className={am.btnSecondary}><Archive className="w-3.5 h-3.5" /> Archive</button>
              )}
            </div>
          </div>
        )}
      </AcademicModal>

      {/* ── Wizard Modal (quick access from header) ── */}
      <AcademicModal open={showWizard} onClose={() => setShowWizard(false)} title="New Route Plan">
        <div className="space-y-3 text-xs">
          <label className="block">Title<input value={wizardForm.title} onChange={(e) => setWizardForm({ ...wizardForm, title: e.target.value })} className={`${am.input} w-full mt-1`} placeholder="Auto-generated if empty" /></label>
          <label className="block">Route<select value={wizardForm.routeId} onChange={(e) => setWizardForm({ ...wizardForm, routeId: e.target.value })} className={`${am.input} w-full mt-1`}>
            <option value="">Select…</option>
            {(data?.routes ?? []).map((r) => <option key={String(r.id)} value={String(r.id)}>{String(r.routeCode)} — {String(r.routeName)}</option>)}
          </select></label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">Type<select value={wizardForm.planType} onChange={(e) => setWizardForm({ ...wizardForm, planType: e.target.value })} className={`${am.input} w-full mt-1`}>{(data?.planTypes ?? []).map((t) => <option key={t}>{t}</option>)}</select></label>
            <label className="block">Category<select value={wizardForm.transportCategory} onChange={(e) => setWizardForm({ ...wizardForm, transportCategory: e.target.value })} className={`${am.input} w-full mt-1`}>{(data?.transportCategories ?? []).map((c) => <option key={c}>{c}</option>)}</select></label>
          </div>
          <button type="button" disabled={busy || !wizardForm.routeId} onClick={() => void act(async () => {
            await createRoutePlan({ ...wizardForm, academicYear });
            setShowWizard(false);
            return fetchTransportRoutePlanning(false, academicYear);
          }, 'Plan created')} className={`${am.btnPrimary} w-full`}>Create Plan</button>
        </div>
      </AcademicModal>
    </AcademicPageShell>
  );
}
