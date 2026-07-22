import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Fingerprint,
  Loader2,
  MapPin,
  Plus,
  Radio,
  RefreshCw,
  ScanFace,
  Smartphone,
  Users,
  X,
} from 'lucide-react';
import {
  createBiometricDevice,
  createBiometricEnrollment,
  createGeoFence,
  fetchBiometricDevices,
  fetchBiometricDevicesMeta,
  fetchBiometricEnrollments,
  fetchBiometricPunches,
  fetchGeoFences,
  recordBiometricPunch,
  seedBiometricDevicesDemo,
  type BiometricDeviceItem,
  type BiometricDeviceType,
  type BiometricEnrollmentItem,
  type BiometricPersonType,
  type BiometricPunchItem,
  type GeoFenceItem,
} from '../../../lib/attendanceServices';

type Tab = 'overview' | 'geofences' | 'devices' | 'enrollments' | 'logs' | 'simulate';

function deviceIcon(type: BiometricDeviceType) {
  if (type === 'FINGERPRINT') return <Fingerprint size={16} className="text-blue-600" />;
  if (type === 'FACE_RECOGNITION') return <ScanFace size={16} className="text-purple-600" />;
  if (type === 'RFID_READER') return <CreditCard size={16} className="text-emerald-600" />;
  return <Smartphone size={16} className="text-orange-600" />;
}

function punchStatusClass(status: BiometricPunchItem['punchStatus']) {
  if (status === 'ACCEPTED') return 'bg-green-100 text-green-700';
  if (status === 'REJECTED_OUTSIDE_FENCE') return 'bg-red-100 text-red-700';
  return 'bg-amber-100 text-amber-700';
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

export function BiometricDevicesView() {
  const [tab, setTab] = useState<Tab>('overview');
  const [meta, setMeta] = useState<Awaited<ReturnType<typeof fetchBiometricDevicesMeta>> | null>(null);
  const [geoFences, setGeoFences] = useState<GeoFenceItem[]>([]);
  const [devices, setDevices] = useState<BiometricDeviceItem[]>([]);
  const [enrollments, setEnrollments] = useState<BiometricEnrollmentItem[]>([]);
  const [punches, setPunches] = useState<BiometricPunchItem[]>([]);
  const [punchSummary, setPunchSummary] = useState({ total: 0, accepted: 0, rejectedOutsideFence: 0, rejectedNotEnrolled: 0, students: 0, teachers: 0, staff: 0 });
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [geoFenceOpen, setGeoFenceOpen] = useState(false);
  const [deviceOpen, setDeviceOpen] = useState(false);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [geoForm, setGeoForm] = useState({ name: '', description: '', latitude: '28.6139', longitude: '77.2090', radiusMeters: '200', address: '', isDefault: true });
  const [deviceForm, setDeviceForm] = useState({
    name: '', deviceType: 'FINGERPRINT' as BiometricDeviceType, location: '', serialNumber: '', geoFenceId: '', requiresGeoFence: true,
  });
  const [enrollForm, setEnrollForm] = useState({
    personType: 'STUDENT' as BiometricPersonType, personId: '', rfidCardId: '', biometricTemplateId: '', deviceId: '',
  });
  const [simulateForm, setSimulateForm] = useState({
    deviceId: '', rfidCardId: '', eventType: 'CHECK_IN' as 'CHECK_IN' | 'CHECK_OUT',
    latitude: '28.6139', longitude: '77.2090', useOutsideFence: false,
  });
  const [lastPunch, setLastPunch] = useState<BiometricPunchItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const m = await fetchBiometricDevicesMeta(academicYear);
      setMeta(m);
      setAcademicYear(m.defaultAcademicYear);
      const [gf, dev, enr, pch] = await Promise.all([
        fetchGeoFences(),
        fetchBiometricDevices(),
        fetchBiometricEnrollments(m.defaultAcademicYear),
        fetchBiometricPunches({ date }),
      ]);
      setGeoFences(gf.items);
      setDevices(dev.items);
      setEnrollments(enr.items);
      setPunches(pch.items);
      setPunchSummary(pch.summary);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load biometric devices');
    } finally {
      setLoading(false);
    }
  }, [academicYear, date]);

  useEffect(() => { void load(); }, [load]);

  const refreshPunches = async () => {
    const pch = await fetchBiometricPunches({ date });
    setPunches(pch.items);
    setPunchSummary(pch.summary);
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await seedBiometricDevicesDemo(academicYear);
      setSuccessMsg(`Demo loaded: ${res.geoFences} geo-fences, ${res.devices} devices, ${res.enrollments} enrollments`);
      await load();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Seed failed');
    } finally {
      setSeeding(false);
    }
  };

  const handleCreateGeoFence = async () => {
    if (!geoForm.name.trim()) { setErrorMsg('Geo-fence name is required'); return; }
    setSubmitting(true);
    try {
      await createGeoFence({
        name: geoForm.name,
        description: geoForm.description,
        latitude: Number(geoForm.latitude),
        longitude: Number(geoForm.longitude),
        radiusMeters: Number(geoForm.radiusMeters),
        isDefault: geoForm.isDefault,
        address: geoForm.address,
      });
      setSuccessMsg(`Geo-fence "${geoForm.name}" created`);
      setGeoFenceOpen(false);
      await load();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create geo-fence');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateDevice = async () => {
    if (!deviceForm.name.trim()) { setErrorMsg('Device name is required'); return; }
    setSubmitting(true);
    try {
      await createBiometricDevice({
        ...deviceForm,
        geoFenceId: deviceForm.geoFenceId || undefined,
      });
      setSuccessMsg(`Device "${deviceForm.name}" added`);
      setDeviceOpen(false);
      await load();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to add device');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateEnrollment = async () => {
    if (!enrollForm.personId) { setErrorMsg('Please select a person to enroll'); return; }
    setSubmitting(true);
    try {
      const input = {
        personType: enrollForm.personType,
        academicYear,
        rfidCardId: enrollForm.rfidCardId,
        biometricTemplateId: enrollForm.biometricTemplateId,
        deviceId: enrollForm.deviceId || undefined,
        ...(enrollForm.personType === 'STUDENT' ? { studentId: enrollForm.personId } : {}),
        ...(enrollForm.personType === 'TEACHER' ? { teacherProfileId: enrollForm.personId } : {}),
        ...(enrollForm.personType === 'STAFF' ? { staffProfileId: enrollForm.personId } : {}),
      };
      await createBiometricEnrollment(input);
      setSuccessMsg('Enrollment created successfully');
      setEnrollOpen(false);
      await load();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Enrollment failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSimulatePunch = async () => {
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const defaultFence = geoFences.find((g) => g.isDefault) || geoFences[0];
      const lat = simulateForm.useOutsideFence && defaultFence
        ? defaultFence.latitude + 0.01
        : Number(simulateForm.latitude);
      const lng = simulateForm.useOutsideFence && defaultFence
        ? defaultFence.longitude + 0.01
        : Number(simulateForm.longitude);

      const result = await recordBiometricPunch({
        deviceId: simulateForm.deviceId || undefined,
        rfidCardId: simulateForm.rfidCardId || undefined,
        eventType: simulateForm.eventType,
        verificationMethod: simulateForm.rfidCardId ? 'RFID' : 'BIOMETRIC',
        latitude: lat,
        longitude: lng,
      });
      setLastPunch(result);
      setSuccessMsg(`${result.punchStatusLabel} — ${result.personName}`);
      await refreshPunches();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Punch simulation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const personOptions = enrollForm.personType === 'STUDENT'
    ? meta?.students || []
    : enrollForm.personType === 'TEACHER'
      ? meta?.teachers || []
      : meta?.staff || [];

  if (loading && !meta) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-slate-500">
        <Loader2 className="animate-spin mr-2" size={20} />
        Loading biometric devices...
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'geofences', label: 'Geo-Fence Areas' },
    { id: 'devices', label: 'Devices' },
    { id: 'enrollments', label: 'Enrollments' },
    { id: 'logs', label: 'Attendance Logs' },
    { id: 'simulate', label: 'Simulate Punch' },
  ];

  return (
    <div className="space-y-4 p-1">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Biometric Devices</h1>
          <p className="text-slate-500 text-sm mt-1">
            {meta?.workflowNote}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void handleSeed()} disabled={seeding}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">
            {seeding ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            Load Demo Data
          </button>
          <button type="button" onClick={() => void load()}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          <CheckCircle2 size={16} />{successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle size={16} />{errorMsg}
        </div>
      )}

      {meta && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { label: 'Students', value: meta.summary.totalStudents, color: 'text-blue-600' },
            { label: 'Teachers', value: meta.summary.totalTeachers, color: 'text-purple-600' },
            { label: 'Staff', value: meta.summary.totalStaff, color: 'text-emerald-600' },
            { label: 'Geo-Fences', value: meta.summary.activeGeoFences, color: 'text-orange-600' },
            { label: 'Devices', value: meta.summary.activeDevices, color: 'text-slate-800' },
            { label: 'Today Accepted', value: meta.summary.todayAccepted, color: 'text-green-600' },
          ].map((k) => (
            <div key={k.label} className="bg-white rounded-xl border border-slate-200 p-3">
              <p className="text-xs text-slate-500 uppercase">{k.label}</p>
              <p className={`text-xl font-bold mt-1 ${k.color}`}>{k.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-1 border-b border-slate-200">
        {tabs.map((t) => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <MapPin size={18} className="text-orange-600" /> Geo-Fence Restricted Areas
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              Attendance is only accepted when the punch originates within the configured geo-fence radius.
              Mobile app, RFID, fingerprint, and face recognition all enforce this rule.
            </p>
            <div className="space-y-2">
              {geoFences.slice(0, 3).map((g) => (
                <div key={g.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg text-sm">
                  <div>
                    <p className="font-medium">{g.name} {g.isDefault && <span className="text-xs text-blue-600">(Default)</span>}</p>
                    <p className="text-xs text-slate-400">{g.radiusMeters}m radius · {g.latitude.toFixed(4)}, {g.longitude.toFixed(4)}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${g.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {g.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              ))}
              {!geoFences.length && <p className="text-sm text-slate-400">No geo-fences configured. Add one or load demo data.</p>}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Radio size={18} className="text-blue-600" /> Supported Methods
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: <Fingerprint size={20} />, title: 'Fingerprint', desc: 'Biometric scanner at gates' },
                { icon: <ScanFace size={20} />, title: 'Face Recognition', desc: 'Contactless face scan' },
                { icon: <CreditCard size={20} />, title: 'RFID Cards', desc: 'Student & staff ID cards' },
                { icon: <Smartphone size={20} />, title: 'Mobile Geo-Fence', desc: 'App-based GPS attendance' },
              ].map((m) => (
                <div key={m.title} className="p-3 border border-slate-100 rounded-lg">
                  <div className="text-blue-600 mb-1">{m.icon}</div>
                  <p className="text-sm font-medium">{m.title}</p>
                  <p className="text-xs text-slate-400">{m.desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-800">
              <strong>{enrollments.length}</strong> people enrolled · <strong>{punchSummary.accepted}</strong> accepted punches today ·{' '}
              <strong>{punchSummary.rejectedOutsideFence}</strong> rejected (outside fence)
            </div>
          </div>
        </div>
      )}

      {tab === 'geofences' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-semibold text-sm">Attendance Geo-Fence Areas ({geoFences.length})</h3>
            <button type="button" onClick={() => setGeoFenceOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus size={14} /> Add Geo-Fence
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {geoFences.map((g) => (
              <div key={g.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">{g.name} {g.isDefault && <span className="text-xs text-blue-600 ml-1">Default</span>}</p>
                  <p className="text-sm text-slate-500">{g.description || g.address || 'No description'}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Lat {g.latitude}, Lng {g.longitude} · Radius {g.radiusMeters}m
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full self-start ${g.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                  {g.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            ))}
            {!geoFences.length && <p className="p-8 text-center text-slate-400 text-sm">No geo-fence areas yet</p>}
          </div>
        </div>
      )}

      {tab === 'devices' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-semibold text-sm">Biometric & RFID Devices ({devices.length})</h3>
            <button type="button" onClick={() => setDeviceOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus size={14} /> Add Device
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3">Device</th>
                  <th className="text-left px-4 py-3">Type</th>
                  <th className="text-left px-4 py-3">Location</th>
                  <th className="text-left px-4 py-3">Geo-Fence</th>
                  <th className="text-left px-4 py-3">Supports</th>
                  <th className="text-left px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {devices.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {deviceIcon(d.deviceType)}
                        <div>
                          <p className="font-medium">{d.name}</p>
                          <p className="text-xs text-slate-400">{d.serialNumber}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">{d.deviceTypeLabel}</td>
                    <td className="px-4 py-3">{d.location || '—'}</td>
                    <td className="px-4 py-3">{d.geoFenceName || '—'}</td>
                    <td className="px-4 py-3 text-xs">
                      {[d.supportsStudents && 'Students', d.supportsTeachers && 'Teachers', d.supportsStaff && 'Staff'].filter(Boolean).join(', ')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${d.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        {d.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!devices.length && <p className="p-8 text-center text-slate-400 text-sm">No devices registered</p>}
          </div>
        </div>
      )}

      {tab === 'enrollments' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Users size={16} /> Enrollments ({enrollments.length})
            </h3>
            <button type="button" onClick={() => setEnrollOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus size={14} /> Enroll Person
            </button>
          </div>
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase sticky top-0">
                <tr>
                  <th className="text-left px-4 py-3">Name</th>
                  <th className="text-left px-4 py-3">Type</th>
                  <th className="text-left px-4 py-3">Class / Dept</th>
                  <th className="text-left px-4 py-3">RFID Card</th>
                  <th className="text-left px-4 py-3">Biometric ID</th>
                  <th className="text-left px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {enrollments.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium">{e.personName}</p>
                      <p className="text-xs text-slate-400">{e.personCode}</p>
                    </td>
                    <td className="px-4 py-3">{e.personTypeLabel}</td>
                    <td className="px-4 py-3">{e.classGroup}</td>
                    <td className="px-4 py-3 font-mono text-xs">{e.rfidCardId || '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs">{e.biometricTemplateId || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${e.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        {e.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!enrollments.length && <p className="p-8 text-center text-slate-400 text-sm">No enrollments yet</p>}
          </div>
        </div>
      )}

      {tab === 'logs' && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-3 items-end bg-white rounded-xl border border-slate-200 p-4">
            <div>
              <label className="text-xs text-slate-500 block mb-1">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <button type="button" onClick={() => void refreshPunches()}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">Apply</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total', value: punchSummary.total },
              { label: 'Accepted', value: punchSummary.accepted, color: 'text-green-600' },
              { label: 'Outside Fence', value: punchSummary.rejectedOutsideFence, color: 'text-red-600' },
              { label: 'Not Enrolled', value: punchSummary.rejectedNotEnrolled, color: 'text-amber-600' },
            ].map((k) => (
              <div key={k.label} className="bg-white rounded-xl border border-slate-200 p-3">
                <p className="text-xs text-slate-500">{k.label}</p>
                <p className={`text-xl font-bold ${k.color || ''}`}>{k.value}</p>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase sticky top-0">
                  <tr>
                    <th className="text-left px-4 py-3">Time</th>
                    <th className="text-left px-4 py-3">Person</th>
                    <th className="text-left px-4 py-3">Type</th>
                    <th className="text-left px-4 py-3">Event</th>
                    <th className="text-left px-4 py-3">Method</th>
                    <th className="text-left px-4 py-3">Geo-Fence</th>
                    <th className="text-left px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {punches.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-xs">{formatDateTime(p.punchedAt)}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{p.personName}</p>
                        <p className="text-xs text-slate-400">{p.classGroup}</p>
                      </td>
                      <td className="px-4 py-3">{p.personTypeLabel}</td>
                      <td className="px-4 py-3">{p.eventTypeLabel}</td>
                      <td className="px-4 py-3">{p.verificationMethod}</td>
                      <td className="px-4 py-3 text-xs">
                        {p.withinGeoFence ? (
                          <span className="text-green-600">{p.geoFenceName || 'Inside'}</span>
                        ) : (
                          <span className="text-red-600">{p.distanceMeters != null ? `${p.distanceMeters}m away` : 'Outside'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${punchStatusClass(p.punchStatus)}`}>
                          {p.punchStatusLabel}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!punches.length && <p className="p-8 text-center text-slate-400 text-sm">No attendance punches for selected date</p>}
            </div>
          </div>
        </div>
      )}

      {tab === 'simulate' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900 mb-4">Simulate Attendance Punch</h3>
            <p className="text-sm text-slate-500 mb-4">
              Test geo-fence validation. Attendance is only accepted inside the restricted area.
            </p>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-500 block mb-1">Device</label>
                <select value={simulateForm.deviceId} onChange={(e) => setSimulateForm((f) => ({ ...f, deviceId: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                  <option value="">Mobile Geo-Fence (no device)</option>
                  {devices.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">RFID Card ID</label>
                <input type="text" value={simulateForm.rfidCardId}
                  onChange={(e) => setSimulateForm((f) => ({ ...f, rfidCardId: e.target.value }))}
                  placeholder="e.g. RFID-STU-0001"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Event</label>
                <select value={simulateForm.eventType} onChange={(e) => setSimulateForm((f) => ({ ...f, eventType: e.target.value as 'CHECK_IN' | 'CHECK_OUT' }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                  <option value="CHECK_IN">Check In</option>
                  <option value="CHECK_OUT">Check Out</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Latitude</label>
                  <input type="text" value={simulateForm.latitude}
                    onChange={(e) => setSimulateForm((f) => ({ ...f, latitude: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Longitude</label>
                  <input type="text" value={simulateForm.longitude}
                    onChange={(e) => setSimulateForm((f) => ({ ...f, longitude: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={simulateForm.useOutsideFence}
                  onChange={(e) => setSimulateForm((f) => ({ ...f, useOutsideFence: e.target.checked }))}
                  className="rounded border-slate-300" />
                Simulate outside geo-fence (should reject)
              </label>
              <button type="button" onClick={() => void handleSimulatePunch()} disabled={submitting}
                className="w-full py-2.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Fingerprint size={16} />}
                Record Punch
              </button>
            </div>
          </div>
          {lastPunch && (
            <div className={`rounded-xl border p-5 ${lastPunch.punchStatus === 'ACCEPTED' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <h3 className="font-semibold mb-3">{lastPunch.punchStatusLabel}</h3>
              <div className="space-y-2 text-sm">
                <p><span className="text-slate-500">Person:</span> {lastPunch.personName} ({lastPunch.personTypeLabel})</p>
                <p><span className="text-slate-500">Event:</span> {lastPunch.eventTypeLabel}</p>
                <p><span className="text-slate-500">Method:</span> {lastPunch.verificationMethod}</p>
                <p><span className="text-slate-500">Geo-Fence:</span> {lastPunch.withinGeoFence ? `Inside ${lastPunch.geoFenceName}` : `Outside (${lastPunch.distanceMeters}m away)`}</p>
                <p className="text-xs mt-2">{lastPunch.remarks}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {geoFenceOpen && (
        <Modal title="Add Geo-Fence Area" onClose={() => setGeoFenceOpen(false)}>
          <div className="space-y-4">
            <Field label="Name" value={geoForm.name} onChange={(v) => setGeoForm((f) => ({ ...f, name: v }))} placeholder="Main Campus" />
            <Field label="Description" value={geoForm.description} onChange={(v) => setGeoForm((f) => ({ ...f, description: v }))} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Latitude" value={geoForm.latitude} onChange={(v) => setGeoForm((f) => ({ ...f, latitude: v }))} />
              <Field label="Longitude" value={geoForm.longitude} onChange={(v) => setGeoForm((f) => ({ ...f, longitude: v }))} />
            </div>
            <Field label="Radius (meters)" value={geoForm.radiusMeters} onChange={(v) => setGeoForm((f) => ({ ...f, radiusMeters: v }))} />
            <Field label="Address" value={geoForm.address} onChange={(v) => setGeoForm((f) => ({ ...f, address: v }))} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={geoForm.isDefault} onChange={(e) => setGeoForm((f) => ({ ...f, isDefault: e.target.checked }))} />
              Set as default geo-fence
            </label>
          </div>
          <ModalActions onCancel={() => setGeoFenceOpen(false)} onSubmit={() => void handleCreateGeoFence()} submitting={submitting} label="Create Geo-Fence" />
        </Modal>
      )}

      {deviceOpen && (
        <Modal title="Add Biometric Device" onClose={() => setDeviceOpen(false)}>
          <div className="space-y-4">
            <Field label="Device Name" value={deviceForm.name} onChange={(v) => setDeviceForm((f) => ({ ...f, name: v }))} />
            <div>
              <label className="text-xs text-slate-500 block mb-1">Device Type</label>
              <select value={deviceForm.deviceType} onChange={(e) => setDeviceForm((f) => ({ ...f, deviceType: e.target.value as BiometricDeviceType }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                {(meta?.deviceTypes || []).map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            <Field label="Location" value={deviceForm.location} onChange={(v) => setDeviceForm((f) => ({ ...f, location: v }))} />
            <Field label="Serial Number" value={deviceForm.serialNumber} onChange={(v) => setDeviceForm((f) => ({ ...f, serialNumber: v }))} />
            <div>
              <label className="text-xs text-slate-500 block mb-1">Geo-Fence</label>
              <select value={deviceForm.geoFenceId} onChange={(e) => setDeviceForm((f) => ({ ...f, geoFenceId: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                <option value="">Select geo-fence...</option>
                {geoFences.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={deviceForm.requiresGeoFence}
                onChange={(e) => setDeviceForm((f) => ({ ...f, requiresGeoFence: e.target.checked }))} />
              Require geo-fence validation
            </label>
          </div>
          <ModalActions onCancel={() => setDeviceOpen(false)} onSubmit={() => void handleCreateDevice()} submitting={submitting} label="Add Device" />
        </Modal>
      )}

      {enrollOpen && (
        <Modal title="Enroll for Biometric / RFID" onClose={() => setEnrollOpen(false)}>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-slate-500 block mb-1">Person Type</label>
              <select value={enrollForm.personType} onChange={(e) => setEnrollForm((f) => ({ ...f, personType: e.target.value as BiometricPersonType, personId: '' }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                <option value="STUDENT">Student</option>
                <option value="TEACHER">Teacher</option>
                <option value="STAFF">Staff</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">Person</label>
              <select value={enrollForm.personId} onChange={(e) => {
                const id = e.target.value;
                const person = personOptions.find((p) => p.id === id);
                setEnrollForm((f) => ({
                  ...f,
                  personId: id,
                  rfidCardId: (person as { rfidTag?: string })?.rfidTag || f.rfidCardId,
                }));
              }} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                <option value="">Select...</option>
                {personOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({'admissionNumber' in p ? p.admissionNumber : p.employeeCode})
                  </option>
                ))}
              </select>
            </div>
            <Field label="RFID Card ID" value={enrollForm.rfidCardId} onChange={(v) => setEnrollForm((f) => ({ ...f, rfidCardId: v }))} placeholder="RFID-STU-0001" />
            <Field label="Biometric Template ID" value={enrollForm.biometricTemplateId} onChange={(v) => setEnrollForm((f) => ({ ...f, biometricTemplateId: v }))} placeholder="BIO-001" />
            <div>
              <label className="text-xs text-slate-500 block mb-1">Linked Device (optional)</label>
              <select value={enrollForm.deviceId} onChange={(e) => setEnrollForm((f) => ({ ...f, deviceId: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                <option value="">None</option>
                {devices.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>
          <ModalActions onCancel={() => setEnrollOpen(false)} onSubmit={() => void handleCreateEnrollment()} submitting={submitting} label="Enroll" />
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 my-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">{title}</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="text-xs text-slate-500 block mb-1">{label}</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
    </div>
  );
}

function ModalActions({ onCancel, onSubmit, submitting, label }: { onCancel: () => void; onSubmit: () => void; submitting: boolean; label: string }) {
  return (
    <div className="flex justify-end gap-2 mt-6">
      <button type="button" onClick={onCancel} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
      <button type="button" onClick={onSubmit} disabled={submitting}
        className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
        {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
        {label}
      </button>
    </div>
  );
}
