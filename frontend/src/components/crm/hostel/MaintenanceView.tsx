import { useCallback, useEffect, useState } from 'react';
import {
  Wrench, RefreshCw, Download, Plus, CheckCircle2, UserCog,
  Play, Package, AlertTriangle, Lightbulb,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import {
  fetchMaintenanceManagement,
  raiseHostelMaintenanceTicket,
  assignHostelMaintenance,
  startHostelMaintenance,
  resolveHostelMaintenance,
  closeHostelMaintenance,
  exportHostelMaintenance,
  type MaintenanceManagement,
} from '../../../lib/hostelServices';
import { AcademicLoading, AcademicModal, FeeMessage } from '../FeeFinanceManagement/FeeFinanceUi';

const STATUS_DOT: Record<string, string> = {
  OPEN: 'bg-red-500',
  ASSIGNED: 'bg-amber-400',
  IN_PROGRESS: 'bg-amber-500',
  RESOLVED: 'bg-green-400',
  CLOSED: 'bg-green-600',
};

const STATUS_BADGE: Record<string, string> = {
  OPEN: 'bg-red-50 text-red-800 border-red-200',
  ASSIGNED: 'bg-amber-50 text-amber-800 border-amber-200',
  IN_PROGRESS: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  RESOLVED: 'bg-green-50 text-green-800 border-green-200',
  CLOSED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
};

export function MaintenanceView() {
  const [data, setData] = useState<MaintenanceManagement | null>(null);
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [raiseOpen, setRaiseOpen] = useState(false);
  const [actionModal, setActionModal] = useState<{
    id: string;
    mode: 'assign' | 'resolve' | 'close';
    technicianId?: string;
  } | null>(null);
  const [actionText, setActionText] = useState('');
  const [selectedParts, setSelectedParts] = useState<{ inventoryItemId: string; quantity: number }[]>([]);

  const [form, setForm] = useState({
    hostelId: '',
    issue: '',
    description: '',
    category: 'GENERAL',
    location: '',
    priority: 'MEDIUM',
    studentProfileId: '',
    raisedByRole: 'WARDEN',
  });

  const load = useCallback(async (seed = false) => {
    setLoading(true);
    try {
      const result = await fetchMaintenanceManagement(seed, academicYear, statusFilter, categoryFilter);
      setData(result);
      setForm((f) => (f.hostelId ? f : { ...f, hostelId: result.hostels[0]?.id ?? '' }));
    } finally {
      setLoading(false);
    }
  }, [academicYear, statusFilter, categoryFilter]);

  useEffect(() => { void load(true); }, [load]);

  const flash = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 6000);
  };

  const handleRaise = async () => {
    if (!form.hostelId || !form.issue || !form.location) {
      flash('Hostel, issue, and location are required', 'error');
      return;
    }
    try {
      const result = await raiseHostelMaintenanceTicket({ ...form, academicYear, raisedBy: 'Warden' });
      flash(result.message, 'success');
      setRaiseOpen(false);
      await load();
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Failed', 'error');
    }
  };

  const handleAction = async () => {
    if (!actionModal) return;
    try {
      if (actionModal.mode === 'assign' && actionModal.technicianId) {
        const tech = data?.technicians.find((t) => t.id === actionModal.technicianId);
        const r = await assignHostelMaintenance(actionModal.id, actionModal.technicianId, tech?.name);
        flash(r.message, 'success');
      } else if (actionModal.mode === 'resolve') {
        const r = await resolveHostelMaintenance(actionModal.id, actionText);
        flash(r.message, 'success');
      } else if (actionModal.mode === 'close') {
        const r = await closeHostelMaintenance(actionModal.id, selectedParts.length ? selectedParts : undefined);
        flash(r.message, 'success');
      }
      setActionModal(null);
      setActionText('');
      setSelectedParts([]);
      await load();
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Failed', 'error');
    }
  };

  const togglePart = (itemId: string, qty = 1) => {
    setSelectedParts((prev) => {
      const exists = prev.find((p) => p.inventoryItemId === itemId);
      if (exists) return prev.filter((p) => p.inventoryItemId !== itemId);
      return [...prev, { inventoryItemId: itemId, quantity: qty }];
    });
  };

  if (loading && !data) return <AcademicLoading />;

  const perms = data?.permissions;
  const kpis = data?.kpis;

  return (
    <div className="flex flex-col h-full gap-4">
      <FeeMessage message={message} type={messageType} />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Maintenance</h2>
          <p className="text-xs text-slate-500">Facility repair tickets · Technician assignment · Inventory integration</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className="text-xs border rounded-lg px-2 py-1.5">
            <option value="2025-26">2025-26</option>
          </select>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="text-xs border rounded-lg px-2 py-1.5">
            <option value="ALL">All Categories</option>
            {(data?.categories ?? []).map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-xs border rounded-lg px-2 py-1.5">
            <option value="ALL">All Status</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>
          <button type="button" onClick={() => void load()} className="p-2 border rounded-lg"><RefreshCw size={14} /></button>
          {perms?.canExport && (
            <button type="button" onClick={() => void exportHostelMaintenance(academicYear).then((r) => flash(r.message, 'success'))} className="px-3 py-1.5 text-xs border rounded-lg flex items-center gap-1">
              <Download size={12} /> Export
            </button>
          )}
          {perms?.canRaise && (
            <button type="button" onClick={() => setRaiseOpen(true)} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg flex items-center gap-1">
              <Plus size={12} /> Raise Ticket
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-[9px]">
        <div className="bg-red-50 rounded-lg p-2 border border-red-100"><p className="font-bold text-lg text-red-700">{kpis?.open ?? 0}</p><span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1" />Open</div>
        <div className="bg-amber-50 rounded-lg p-2 border border-amber-100"><p className="font-bold text-lg text-amber-700">{kpis?.inProgress ?? 0}</p><span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-1" />In Progress</div>
        <div className="bg-green-50 rounded-lg p-2 border border-green-100"><p className="font-bold text-lg text-green-700">{kpis?.resolved ?? 0}</p><span className="inline-block w-2 h-2 rounded-full bg-green-400 mr-1" />Resolved</div>
        <div className="bg-emerald-50 rounded-lg p-2 border border-emerald-100"><p className="font-bold text-lg text-emerald-700">{kpis?.closed ?? 0}</p><span className="inline-block w-2 h-2 rounded-full bg-green-600 mr-1" />Closed</div>
        <div className="bg-slate-50 rounded-lg p-2 border border-slate-100"><p className="font-bold text-lg text-slate-700">{kpis?.total ?? 0}</p>Total</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white border rounded-xl p-4 shadow-sm">
            <h3 className="text-[11px] font-bold text-slate-800 mb-3 flex items-center gap-1"><Lightbulb size={12} /> Maintenance Requests</h3>
            <div className="space-y-2">
              {(data?.widgetPreview ?? data?.tickets ?? []).slice(0, 6).map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50">
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold truncate">{t.issue}</p>
                    <p className="text-[8px] text-slate-500 truncate">{t.location}</p>
                  </div>
                  <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${STATUS_BADGE[t.status] ?? ''}`}>
                    {t.statusLabel}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border rounded-xl p-4 shadow-sm">
            <h3 className="text-[11px] font-bold text-slate-800 mb-3">Status Distribution</h3>
            <div className="flex items-center justify-center gap-4">
              <div className="w-24 h-24 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data?.statusChart ?? []} dataKey="value" cx="50%" cy="50%" innerRadius={25} outerRadius={42} stroke="none">
                      {(data?.statusChart ?? []).map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1 text-[9px]">
                {(data?.statusChart ?? []).map((c) => (
                  <div key={c.name} className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: c.color }} />{c.name}</span>
                    <span className="font-bold">{c.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white border rounded-xl p-4 shadow-sm">
            <h3 className="text-[11px] font-bold text-slate-800 mb-2 flex items-center gap-1"><Package size={12} /> Spare Parts Inventory</h3>
            {(data?.lowStockCount ?? 0) > 0 && (
              <p className="text-[9px] text-amber-600 flex items-center gap-1 mb-2"><AlertTriangle size={10} /> {data?.lowStockCount} items low stock</p>
            )}
            <ul className="space-y-1 text-[9px] max-h-32 overflow-auto">
              {(data?.inventory ?? []).map((i) => (
                <li key={i.id} className={`flex justify-between ${i.lowStock ? 'text-red-600' : 'text-slate-600'}`}>
                  <span>{i.itemName}</span>
                  <span className="font-mono">{i.stockQty} {i.unit}</span>
                </li>
              ))}
            </ul>
            <p className="text-[8px] text-slate-400 mt-2">Parts auto-deducted when closing tickets</p>
          </div>
        </div>

        <div className="lg:col-span-8 bg-white border rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-auto max-h-[55vh]">
            <table className="w-full text-[10px] text-left">
              <thead className="bg-slate-50 sticky top-0">
                <tr className="text-slate-500 border-b">
                  <th className="p-2">Ticket</th>
                  <th>Issue / Location</th>
                  <th>Technician</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(data?.tickets ?? []).map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="p-2">
                      <p className="font-mono font-bold text-[9px]">{t.ticketNumber}</p>
                      <p className="text-slate-500">{t.category}</p>
                      <p className={`text-[8px] ${t.priority === 'HIGH' ? 'text-red-600 font-bold' : ''}`}>{t.priority}</p>
                    </td>
                    <td>
                      <p className="font-bold">{t.issue}</p>
                      <p className="text-slate-500">{t.location}</p>
                      <p className="text-[8px] text-slate-400">By {t.raisedBy} · {t.requestDate}</p>
                      {t.partsUsed.length > 0 && <p className="text-[8px] text-blue-600">{t.partsUsed.join(', ')}</p>}
                    </td>
                    <td className="whitespace-nowrap">{t.assignedTechnician}</td>
                    <td>
                      <span className={`inline-flex items-center gap-1 text-[8px] font-bold px-1.5 py-0.5 rounded border ${STATUS_BADGE[t.status] ?? ''}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[t.status] ?? ''}`} />
                        {t.statusLabel}
                      </span>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {t.status === 'OPEN' && perms?.canAssign && (
                          <button type="button" onClick={() => { const tech = data?.technicians[0]; setActionModal({ id: t.id, mode: 'assign', technicianId: tech?.id }); }} className="text-[8px] bg-purple-600 text-white px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            <UserCog size={9} /> Assign
                          </button>
                        )}
                        {t.status === 'ASSIGNED' && perms?.canWork && (
                          <button type="button" onClick={() => void startHostelMaintenance(t.id).then((r) => { flash(r.message, 'success'); void load(); })} className="text-[8px] bg-amber-600 text-white px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            <Play size={9} /> Start
                          </button>
                        )}
                        {t.status === 'IN_PROGRESS' && perms?.canResolve && (
                          <button type="button" onClick={() => { setActionModal({ id: t.id, mode: 'resolve' }); setActionText(''); }} className="text-[8px] bg-green-600 text-white px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            <CheckCircle2 size={9} /> Fix
                          </button>
                        )}
                        {t.status === 'RESOLVED' && perms?.canClose && (
                          <button type="button" onClick={() => { setActionModal({ id: t.id, mode: 'close' }); setSelectedParts([]); }} className="text-[8px] border border-emerald-400 text-emerald-700 px-1.5 py-0.5 rounded">
                            Close
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AcademicModal open={raiseOpen} onClose={() => setRaiseOpen(false)} title="Raise Maintenance Ticket">
        <div className="space-y-3 text-sm">
          <select value={form.hostelId} onChange={(e) => setForm((f) => ({ ...f, hostelId: e.target.value }))} className="w-full border rounded px-2 py-1.5 text-xs">
            <option value="">Select hostel...</option>
            {(data?.hostels ?? []).map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
          <input value={form.issue} onChange={(e) => setForm((f) => ({ ...f, issue: e.target.value }))} placeholder="Issue (e.g. Fan Not Working)" className="w-full border rounded px-2 py-1.5 text-xs" />
          <input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="Location (e.g. Room A101)" className="w-full border rounded px-2 py-1.5 text-xs" />
          <div className="grid grid-cols-2 gap-2">
            <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="border rounded px-2 py-1.5 text-xs">
              {(data?.categories ?? []).map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))} className="border rounded px-2 py-1.5 text-xs">
              {(data?.priorities ?? []).map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Description" className="w-full border rounded px-2 py-1.5 text-xs" rows={2} />
          <select value={form.studentProfileId} onChange={(e) => setForm((f) => ({ ...f, studentProfileId: e.target.value, raisedByRole: e.target.value ? 'STUDENT' : 'WARDEN' }))} className="w-full border rounded px-2 py-1.5 text-xs">
            <option value="">Raised by Warden (no student)</option>
            {(data?.students ?? []).map((s) => <option key={s.profileId} value={s.profileId}>{s.studentName}</option>)}
          </select>
          <button type="button" onClick={() => void handleRaise()} className="w-full bg-blue-600 text-white font-bold py-2 rounded-lg text-xs flex items-center justify-center gap-1">
            <Wrench size={14} /> Submit Ticket
          </button>
        </div>
      </AcademicModal>

      <AcademicModal
        open={!!actionModal}
        onClose={() => setActionModal(null)}
        title={actionModal?.mode === 'assign' ? 'Assign Technician' : actionModal?.mode === 'resolve' ? 'Mark Fixed' : 'Close Ticket & Deduct Parts'}
      >
        <div className="space-y-3 text-sm">
          {actionModal?.mode === 'assign' && (
            <select
              value={actionModal.technicianId ?? ''}
              onChange={(e) => setActionModal((m) => m ? { ...m, technicianId: e.target.value } : null)}
              className="w-full border rounded px-2 py-1.5 text-xs"
            >
              <option value="">Select technician...</option>
              {(data?.technicians ?? []).map((t) => <option key={t.id} value={t.id}>{t.name} ({t.role})</option>)}
            </select>
          )}
          {actionModal?.mode === 'resolve' && (
            <textarea value={actionText} onChange={(e) => setActionText(e.target.value)} placeholder="Fix notes..." className="w-full border rounded px-2 py-1.5 text-xs" rows={3} />
          )}
          {actionModal?.mode === 'close' && (
            <div className="space-y-2">
              <p className="text-[10px] text-slate-500">Select spare parts used (optional):</p>
              {(data?.inventory ?? []).map((i) => (
                <label key={i.id} className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={selectedParts.some((p) => p.inventoryItemId === i.id)} onChange={() => togglePart(i.id)} />
                  <span>{i.itemName}</span>
                  <span className="text-slate-400 font-mono text-[10px]">({i.stockQty} {i.unit})</span>
                </label>
              ))}
            </div>
          )}
          <button type="button" onClick={() => void handleAction()} className="w-full bg-green-600 text-white font-bold py-2 rounded-lg text-xs">
            {actionModal?.mode === 'assign' ? 'Assign' : actionModal?.mode === 'resolve' ? 'Mark Resolved' : 'Close Ticket'}
          </button>
        </div>
      </AcademicModal>
    </div>
  );
}
