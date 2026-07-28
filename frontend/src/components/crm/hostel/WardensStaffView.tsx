import { useCallback, useEffect, useState } from 'react';
import {
  UserCircle, Plus, RefreshCw, Phone, Building, CheckCircle2, XCircle,
} from 'lucide-react';
import {
  fetchHostelStaffManagement,
  createHostelStaff,
  updateHostelStaff,
  type HostelStaffManagement,
} from '../../../lib/hostelServices';
import { AcademicLoading, AcademicModal, FeeMessage } from '../FeeFinanceManagement/FeeFinanceUi';

export function WardensStaffView() {
  const [data, setData] = useState<HostelStaffManagement | null>(null);
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [hostelFilter, setHostelFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ staffName: '', role: 'WARDEN', mobile: '', hostelId: '' });

  const load = useCallback(async (seed = false) => {
    setLoading(true);
    try {
      setData(await fetchHostelStaffManagement(seed, academicYear, {
        hostelId: hostelFilter !== 'ALL' ? hostelFilter : undefined,
        role: roleFilter !== 'ALL' ? roleFilter : undefined,
      }));
    } finally {
      setLoading(false);
    }
  }, [academicYear, hostelFilter, roleFilter]);

  useEffect(() => { void load(); }, [load]);

  const flash = (msg: string, type: 'success' | 'error' = 'success') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  const handleCreate = async () => {
    if (!form.staffName.trim()) { flash('Staff name is required.', 'error'); return; }
    setSaving(true);
    try {
      const result = await createHostelStaff({
        staffName: form.staffName,
        role: form.role,
        mobile: form.mobile,
        hostelId: form.hostelId || undefined,
      });
      setData(result.data);
      setShowForm(false);
      setForm({ staffName: '', role: 'WARDEN', mobile: '', hostelId: '' });
      flash(result.message);
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Failed to add staff', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (id: string, current: string) => {
    try {
      const result = await updateHostelStaff(id, { status: current === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' });
      setData(result.data);
      flash(result.message);
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Update failed', 'error');
    }
  };

  if (loading && !data) return <AcademicLoading label="Loading wardens & staff…" />;

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Wardens / Staff</h2>
          <p className="text-xs text-slate-500 mt-0.5">Manage hostel wardens, security, housekeeping and support staff</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className="text-xs border rounded px-2 py-1.5 bg-white">
            {(data?.academicYears ?? ['2025-26']).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={hostelFilter} onChange={(e) => setHostelFilter(e.target.value)} className="text-xs border rounded px-2 py-1.5 bg-white">
            <option value="ALL">All Hostels</option>
            {(data?.hostels ?? []).map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="text-xs border rounded px-2 py-1.5 bg-white">
            <option value="ALL">All Roles</option>
            {(data?.roles ?? []).map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <button type="button" onClick={() => void load(false)} className="p-1.5 border border-slate-200 rounded hover:bg-slate-50">
            <RefreshCw size={14} />
          </button>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
          >
            <Plus size={12} /> Add Staff
          </button>
        </div>
      </div>

      {message && <FeeMessage message={message} type={messageType} />}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {[
          { label: 'Total Active', value: data?.kpis.totalStaff ?? 0, icon: <UserCircle size={16} className="text-blue-600" /> },
          { label: 'Wardens', value: data?.kpis.wardens ?? 0, icon: <Building size={16} className="text-purple-600" /> },
          { label: 'On Duty', value: data?.kpis.onDuty ?? 0, icon: <CheckCircle2 size={16} className="text-green-600" /> },
          { label: 'Unassigned', value: data?.kpis.unassigned ?? 0, icon: <Phone size={16} className="text-amber-600" /> },
          { label: 'Inactive', value: data?.kpis.inactive ?? 0, icon: <XCircle size={16} className="text-red-600" /> },
        ].map((k) => (
          <div key={k.label} className="bg-white rounded-lg border p-3 flex items-center gap-2">
            {k.icon}
            <div>
              <div className="text-lg font-bold text-slate-800">{k.value}</div>
              <div className="text-[9px] text-slate-500">{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-4 py-2 font-bold text-slate-600">Name</th>
                <th className="text-left px-4 py-2 font-bold text-slate-600">Role</th>
                <th className="text-left px-4 py-2 font-bold text-slate-600">Hostel</th>
                <th className="text-left px-4 py-2 font-bold text-slate-600">Mobile</th>
                <th className="text-left px-4 py-2 font-bold text-slate-600">Status</th>
                <th className="text-right px-4 py-2 font-bold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(data?.staff ?? []).length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No staff records. Click &quot;Add Staff&quot; or seed sample data.
                    <button type="button" onClick={() => void load(true)} className="block mx-auto mt-2 text-indigo-600 text-[10px] underline">
                      Load sample staff
                    </button>
                  </td>
                </tr>
              ) : (data?.staff ?? []).map((s) => (
                <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-2 font-semibold text-slate-800">{s.staffName}</td>
                  <td className="px-4 py-2">
                    <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-bold">{s.roleLabel}</span>
                  </td>
                  <td className="px-4 py-2 text-slate-600">{s.hostelName}</td>
                  <td className="px-4 py-2 text-slate-600">{s.mobile || '—'}</td>
                  <td className="px-4 py-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${s.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => void toggleStatus(s.id, s.status)}
                      className="text-[10px] border border-slate-200 px-2 py-0.5 rounded hover:bg-slate-100"
                    >
                      {s.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AcademicModal open={showForm} onClose={() => setShowForm(false)} title="Add Hostel Staff">
        <div className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Name *</label>
            <input value={form.staffName} onChange={(e) => setForm({ ...form, staffName: e.target.value })} className="w-full border rounded px-2 py-1.5" />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Role</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full border rounded px-2 py-1.5">
              {(data?.roles ?? []).map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Mobile</label>
            <input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} className="w-full border rounded px-2 py-1.5" />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Hostel</label>
            <select value={form.hostelId} onChange={(e) => setForm({ ...form, hostelId: e.target.value })} className="w-full border rounded px-2 py-1.5">
              <option value="">Unassigned</option>
              {(data?.hostels ?? []).map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1.5 border rounded">Cancel</button>
            <button type="button" disabled={saving} onClick={() => void handleCreate()} className="px-3 py-1.5 bg-indigo-600 text-white rounded disabled:opacity-50">
              {saving ? 'Saving…' : 'Add Staff'}
            </button>
          </div>
        </div>
      </AcademicModal>
    </div>
  );
}
