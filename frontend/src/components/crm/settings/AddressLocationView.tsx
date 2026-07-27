import { useCallback, useEffect, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import {
  deleteSystemLocation,
  fetchSystemLocations,
  saveSystemLocation,
  type SystemLocation,
} from '../../../lib/settingsCoreSystemsServices';
import { CoreSystemsPage, cs, Field } from './CoreSystemsUi';

const EMPTY = {
  branchCode: '',
  branchName: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  country: 'India',
  pincode: '',
  latitude: '',
  longitude: '',
  timezone: 'Asia/Kolkata',
  isPrimary: false,
};

export function AddressLocationView() {
  const [locations, setLocations] = useState<SystemLocation[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchSystemLocations();
      setLocations(res.locations);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed to load locations');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const resetForm = () => {
    setForm(EMPTY);
    setEditingId(null);
  };

  const handleEdit = (row: SystemLocation) => {
    setEditingId(row.id);
    setForm({
      branchCode: row.branchCode,
      branchName: row.branchName,
      addressLine1: row.addressLine1,
      addressLine2: row.addressLine2,
      city: row.city,
      state: row.state,
      country: row.country,
      pincode: row.pincode,
      latitude: row.latitude != null ? String(row.latitude) : '',
      longitude: row.longitude != null ? String(row.longitude) : '',
      timezone: row.timezone,
      isPrimary: row.isPrimary,
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await saveSystemLocation({
        ...form,
        id: editingId ?? undefined,
        latitude: form.latitude ? Number(form.latitude) : null,
        longitude: form.longitude ? Number(form.longitude) : null,
      });
      setLocations(res.locations);
      setMessage(res.message);
      setMessageType('success');
      resetForm();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Save failed');
      setMessageType('error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this location?')) return;
    try {
      const res = await deleteSystemLocation(id);
      setLocations(res.locations);
      setMessage(res.message);
      setMessageType('success');
      if (editingId === id) resetForm();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Delete failed');
      setMessageType('error');
    }
  };

  return (
    <CoreSystemsPage
      title="Address & Location"
      objective="Standardize multi-branch/campus primary geo-location and address records across all system modules."
      loading={loading}
      message={message}
      messageType={messageType}
    >
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className={`${cs.card} xl:col-span-1`}>
          <div className="flex items-center gap-2 mb-2">
            <Plus size={14} className="text-blue-600" />
            <span className="text-xs font-bold text-slate-700">{editingId ? 'Edit Location' : 'Add Location'}</span>
          </div>
          <div className="grid grid-cols-1 gap-2">
            <Field label="Branch Code" required>
              <input className={cs.input} value={form.branchCode} disabled={!!editingId} onChange={(e) => setForm((f) => ({ ...f, branchCode: e.target.value.toUpperCase() }))} />
            </Field>
            <Field label="Branch Name" required>
              <input className={cs.input} value={form.branchName} onChange={(e) => setForm((f) => ({ ...f, branchName: e.target.value }))} />
            </Field>
            <Field label="Address Line 1" required>
              <input className={cs.input} value={form.addressLine1} onChange={(e) => setForm((f) => ({ ...f, addressLine1: e.target.value }))} />
            </Field>
            <Field label="Address Line 2">
              <input className={cs.input} value={form.addressLine2} onChange={(e) => setForm((f) => ({ ...f, addressLine2: e.target.value }))} />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="City" required>
                <input className={cs.input} value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
              </Field>
              <Field label="State">
                <input className={cs.input} value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Pincode">
                <input className={cs.input} value={form.pincode} onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value }))} />
              </Field>
              <Field label="Country">
                <input className={cs.input} value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Latitude">
                <input className={cs.input} value={form.latitude} onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value }))} />
              </Field>
              <Field label="Longitude">
                <input className={cs.input} value={form.longitude} onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value }))} />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-700">
              <input type="checkbox" checked={form.isPrimary} onChange={(e) => setForm((f) => ({ ...f, isPrimary: e.target.checked }))} />
              Primary campus
            </label>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => void handleSave()} disabled={saving} className={`${cs.btnPrimary} flex items-center gap-1`}>
                <Save size={12} /> {saving ? 'Saving…' : 'Save'}
              </button>
              {editingId && (
                <button type="button" onClick={resetForm} className={cs.btnSecondary}>Cancel</button>
              )}
            </div>
          </div>
        </div>

        <div className={`${cs.card} xl:col-span-2 overflow-hidden`}>
          <div className="text-xs font-bold text-slate-700 mb-2">Campus Locations ({locations.length})</div>
          <div className="overflow-x-auto">
            <table className={cs.table}>
              <thead>
                <tr>
                  <th className={cs.th}>Code</th>
                  <th className={cs.th}>Branch</th>
                  <th className={cs.th}>City</th>
                  <th className={cs.th}>Primary</th>
                  <th className={cs.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {locations.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className={cs.td}>{row.branchCode}</td>
                    <td className={cs.td}>{row.branchName}</td>
                    <td className={cs.td}>{row.city}</td>
                    <td className={cs.td}>{row.isPrimary ? 'Yes' : '—'}</td>
                    <td className={cs.td}>
                      <div className="flex gap-2">
                        <button type="button" className="text-blue-600 text-[10px] font-semibold" onClick={() => handleEdit(row)}>Edit</button>
                        <button type="button" className="text-red-600 text-[10px] font-semibold" onClick={() => void handleDelete(row.id)}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {locations.length === 0 && (
                  <tr><td colSpan={5} className={`${cs.td} text-center text-slate-400 py-6`}>No locations configured yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </CoreSystemsPage>
  );
}
