import { useCallback, useEffect, useState } from 'react';
import {
  Shirt, RefreshCw, Download, Plus, Truck, PackageCheck,
  QrCode, Smartphone, AlertCircle,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import {
  fetchLaundryManagement,
  dropHostelLaundry,
  dispatchHostelLaundry,
  receiveHostelLaundryBatch,
  collectHostelLaundry,
  exportHostelLaundry,
  type LaundryManagement,
} from '../../../lib/hostelServices';
import { AcademicLoading, AcademicModal, FeeMessage } from '../FeeFinanceManagement/FeeFinanceUi';

const STATUS_BADGE: Record<string, string> = {
  TOKEN_ISSUED: 'bg-amber-50 text-amber-800 border-amber-200',
  DISPATCHED_TO_VENDOR: 'bg-blue-50 text-blue-800 border-blue-200',
  RECEIVED_FROM_VENDOR: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  READY_FOR_PICKUP: 'bg-green-50 text-green-800 border-green-200',
  COLLECTED: 'bg-slate-50 text-slate-600 border-slate-200',
};

export function LaundryManagementView() {
  const [data, setData] = useState<LaundryManagement | null>(null);
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [dropOpen, setDropOpen] = useState(false);
  const [qrInput, setQrInput] = useState('');

  const [form, setForm] = useState({
    studentProfileId: '',
    itemCount: 5,
    weightKg: 2.5,
    dropNotes: '',
  });

  const load = useCallback(async (seed = false) => {
    setLoading(true);
    try {
      setData(await fetchLaundryManagement(seed, academicYear, statusFilter));
    } finally {
      setLoading(false);
    }
  }, [academicYear, statusFilter]);

  useEffect(() => { void load(); }, [load]);

  const flash = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 6000);
  };

  const handleDrop = async () => {
    if (!form.studentProfileId) {
      flash('Select a student', 'error');
      return;
    }
    try {
      const r = await dropHostelLaundry({ ...form, academicYear, droppedBy: 'Laundry Staff' });
      flash(r.message + (r.tokenNumber ? ` · Token: ${r.tokenNumber}` : ''), 'success');
      setDropOpen(false);
      await load();
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Failed', 'error');
    }
  };

  const handleDispatch = async () => {
    const vendor = data?.vendors[0];
    if (!vendor) {
      flash('No vendor configured', 'error');
      return;
    }
    try {
      const r = await dispatchHostelLaundry(vendor.id);
      flash(r.message, 'success');
      await load();
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Failed', 'error');
    }
  };

  const handleCollect = async () => {
    if (!qrInput.trim()) {
      flash('Enter QR token', 'error');
      return;
    }
    try {
      const r = await collectHostelLaundry(qrInput.trim());
      flash(r.message, 'success');
      setQrInput('');
      await load();
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Failed', 'error');
    }
  };

  if (loading && !data) return <AcademicLoading />;

  const kpis = data?.kpis;

  return (
    <div className="flex flex-col h-full gap-4">
      <FeeMessage message={message} type={messageType} />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Laundry Management</h2>
          <p className="text-xs text-slate-500">Drop → Token → Vendor dispatch → Return → QR collection · Monthly quota tracking</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className="text-xs border rounded-lg px-2 py-1.5">
            <option value="2025-26">2025-26</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-xs border rounded-lg px-2 py-1.5">
            <option value="ALL">All Status</option>
            <option value="TOKEN_ISSUED">Token Issued</option>
            <option value="DISPATCHED_TO_VENDOR">With Vendor</option>
            <option value="READY_FOR_PICKUP">Ready for Pickup</option>
            <option value="COLLECTED">Collected</option>
          </select>
          <button type="button" onClick={() => void load()} className="p-2 border rounded-lg"><RefreshCw size={14} /></button>
          <button type="button" onClick={() => void exportHostelLaundry(academicYear).then((r) => flash(r.message, 'success'))} className="px-3 py-1.5 text-xs border rounded-lg flex items-center gap-1">
            <Download size={12} /> Export
          </button>
          <button type="button" onClick={() => setDropOpen(true)} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg flex items-center gap-1">
            <Plus size={12} /> Log Drop
          </button>
          {(kpis?.pendingDispatch ?? 0) > 0 && (
            <button type="button" onClick={() => void handleDispatch()} className="px-3 py-1.5 text-xs bg-purple-600 text-white rounded-lg flex items-center gap-1">
              <Truck size={12} /> Dispatch ({kpis?.pendingDispatch})
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-[9px]">
        <div className="bg-amber-50 rounded-lg p-2 border border-amber-100"><p className="font-bold text-lg text-amber-700">{kpis?.tokenIssued ?? 0}</p>Token Issued</div>
        <div className="bg-blue-50 rounded-lg p-2 border border-blue-100"><p className="font-bold text-lg text-blue-700">{kpis?.withVendor ?? 0}</p>With Vendor</div>
        <div className="bg-green-50 rounded-lg p-2 border border-green-100"><p className="font-bold text-lg text-green-700">{kpis?.readyForPickup ?? 0}</p>Ready</div>
        <div className="bg-slate-50 rounded-lg p-2 border border-slate-100"><p className="font-bold text-lg text-slate-700">{kpis?.collected ?? 0}</p>Collected</div>
        <div className="bg-teal-50 rounded-lg p-2 border border-teal-100"><p className="font-bold text-lg text-teal-700">{data?.defaultQuota.monthlyItemLimit ?? 30}</p>Monthly Limit</div>
      </div>

      <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 flex items-start gap-2 text-[10px] text-teal-800">
        <Smartphone size={16} className="shrink-0" />
        <div>
          <p className="font-bold">Mobile App Sync</p>
          <p>Student app shows &quot;{data?.mobileSync.readyMessage}&quot; and remaining monthly quota ({data?.defaultQuota.monthlyItemLimit ?? 30} items / {data?.defaultQuota.monthlyWeightLimitKg ?? 15} kg).</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-4 space-y-4">
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
                  <div key={c.name} className="flex justify-between gap-3">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: c.color }} />{c.name}</span>
                    <span className="font-bold">{c.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white border rounded-xl p-4 shadow-sm">
            <h3 className="text-[11px] font-bold text-slate-800 mb-2">Vendor Batches</h3>
            <div className="space-y-2 max-h-40 overflow-auto">
              {(data?.batches ?? []).map((b) => (
                <div key={b.id} className="p-2 bg-slate-50 rounded-lg text-[9px]">
                  <p className="font-mono font-bold">{b.batchNumber}</p>
                  <p className="text-slate-500">{b.vendor} · {b.requestCount} loads · {b.totalItems} items</p>
                  <p className="text-slate-400">{b.status}{b.expectedReturnAt ? ` · Return: ${b.expectedReturnAt}` : ''}</p>
                  {b.status === 'DISPATCHED' && (
                    <button type="button" onClick={() => void receiveHostelLaundryBatch(b.id).then((r) => { flash(r.message, 'success'); void load(); })} className="mt-1 text-[8px] bg-green-600 text-white px-2 py-0.5 rounded flex items-center gap-0.5">
                      <PackageCheck size={9} /> Mark Received
                    </button>
                  )}
                </div>
              ))}
            </div>
            {(data?.vendors ?? []).map((v) => (
              <p key={v.id} className="text-[8px] text-slate-400 mt-2">{v.name} · {v.schedule} · {v.mobile}</p>
            ))}
          </div>

          <div className="bg-white border rounded-xl p-4 shadow-sm">
            <h3 className="text-[11px] font-bold text-slate-800 mb-2 flex items-center gap-1"><QrCode size={12} /> Collect (QR Scan)</h3>
            <div className="flex gap-2">
              <input value={qrInput} onChange={(e) => setQrInput(e.target.value)} placeholder="Scan laundry QR..." className="flex-1 border rounded-lg px-2 py-1.5 text-xs font-mono" />
              <button type="button" onClick={() => void handleCollect()} className="px-3 py-1.5 bg-teal-600 text-white text-xs font-bold rounded-lg">Collect</button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 bg-white border rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-auto max-h-[55vh]">
            <table className="w-full text-[10px] text-left">
              <thead className="bg-slate-50 sticky top-0">
                <tr className="text-slate-500 border-b">
                  <th className="p-2">Token / Student</th>
                  <th>Items / Weight</th>
                  <th>Status</th>
                  <th>Batch</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(data?.requests ?? []).map((r) => (
                  <tr key={r.id} className={`hover:bg-slate-50 ${r.status === 'READY_FOR_PICKUP' ? 'bg-green-50/30' : ''}`}>
                    <td className="p-2">
                      <p className="font-mono font-bold">{r.tokenNumber}</p>
                      <p>{r.studentName}</p>
                      <p className="text-slate-500">{r.hostel}</p>
                      {r.status === 'READY_FOR_PICKUP' && (
                        <button type="button" onClick={() => setQrInput(r.qrToken)} className="text-[8px] text-teal-600 mt-0.5">Use QR</button>
                      )}
                    </td>
                    <td>
                      <p>{r.itemCount} items</p>
                      <p className="text-slate-500">{r.weightKg} kg</p>
                      <p className="text-[8px] text-slate-400">{r.droppedAt}</p>
                    </td>
                    <td>
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${STATUS_BADGE[r.status] ?? ''}`}>
                        {r.statusLabel}
                      </span>
                      {r.status === 'READY_FOR_PICKUP' && (
                        <p className="text-[8px] text-green-600 flex items-center gap-0.5 mt-0.5"><Smartphone size={8} /> {data?.mobileSync.readyMessage}</p>
                      )}
                    </td>
                    <td className="font-mono text-[8px]">{r.batchNumber ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-xl p-4 shadow-sm">
        <h3 className="text-[11px] font-bold text-slate-800 mb-2">Student Quota Overview ({data?.currentMonth})</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 max-h-32 overflow-auto">
          {(data?.students ?? []).slice(0, 12).map((s) => (
            <div key={s.profileId} className={`p-2 rounded-lg border text-[9px] ${s.readyForPickup ? 'bg-green-50 border-green-200' : s.monthlyItemsRemaining <= 5 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50'}`}>
              <p className="font-bold truncate">{s.studentName}</p>
              <p className="text-slate-500">{s.monthlyItemsRemaining} items left</p>
              {s.readyForPickup && <p className="text-green-600 font-bold">Ready!</p>}
              {s.monthlyItemsRemaining <= 5 && !s.readyForPickup && <p className="text-amber-600 flex items-center gap-0.5"><AlertCircle size={8} /> Low quota</p>}
            </div>
          ))}
        </div>
      </div>

      <AcademicModal open={dropOpen} onClose={() => setDropOpen(false)} title="Log Laundry Drop">
        <div className="space-y-3 text-sm">
          <select value={form.studentProfileId} onChange={(e) => setForm((f) => ({ ...f, studentProfileId: e.target.value }))} className="w-full border rounded px-2 py-1.5 text-xs">
            <option value="">Select student...</option>
            {(data?.students ?? []).map((s) => (
              <option key={s.profileId} value={s.profileId}>
                {s.studentName} ({s.monthlyItemsRemaining} items remaining)
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-500">Item Count</label>
              <input type="number" min={1} value={form.itemCount} onChange={(e) => setForm((f) => ({ ...f, itemCount: Number(e.target.value) }))} className="w-full border rounded px-2 py-1.5 text-xs" />
            </div>
            <div>
              <label className="text-[10px] text-slate-500">Weight (kg)</label>
              <input type="number" min={0.1} step={0.1} value={form.weightKg} onChange={(e) => setForm((f) => ({ ...f, weightKg: Number(e.target.value) }))} className="w-full border rounded px-2 py-1.5 text-xs" />
            </div>
          </div>
          <input value={form.dropNotes} onChange={(e) => setForm((f) => ({ ...f, dropNotes: e.target.value }))} placeholder="Notes (optional)" className="w-full border rounded px-2 py-1.5 text-xs" />
          <p className="text-[9px] text-slate-500 flex items-center gap-1"><Shirt size={10} /> Issues digital token + QR for collection</p>
          <button type="button" onClick={() => void handleDrop()} className="w-full bg-blue-600 text-white font-bold py-2 rounded-lg text-xs">Log Drop & Issue Token</button>
        </div>
      </AcademicModal>
    </div>
  );
}
