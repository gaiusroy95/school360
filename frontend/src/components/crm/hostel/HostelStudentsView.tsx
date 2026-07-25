import { useCallback, useEffect, useState } from 'react';
import {
  Users, RefreshCw, Search, Phone, User, Heart, Shield,
  FileCheck, AlertTriangle, Download, Edit3, CheckCircle2, XCircle,
} from 'lucide-react';
import {
  fetchHostelStudents,
  fetchHostelStudentDetail,
  syncHostelStudentsErp,
  updateHostelStudent,
  verifyHostelStudentDoc,
  reviewHostelProfileUpdate,
  exportHostelStudents,
  type HostelStudents,
  type HostelStudentDetail,
} from '../../../lib/hostelServices';
import { AcademicLoading, AcademicModal, StatusBadge, FeeMessage } from '../FeeFinanceManagement/FeeFinanceUi';

export function HostelStudentsView() {
  const [data, setData] = useState<HostelStudents | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [search, setSearch] = useState('');
  const [branch, setBranch] = useState('ALL');
  const [batch, setBatch] = useState('ALL');
  const [hostelId, setHostelId] = useState('ALL');
  const [room, setRoom] = useState('');
  const [docStatus, setDocStatus] = useState('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<HostelStudentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    localGuardianName: '', localGuardianMobile: '', localGuardianRelation: '',
    dietaryPreference: 'VEG', medicalRestrictions: '', allergies: '', currentMedications: '',
  });
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');

  const load = useCallback(async (seed = false) => {
    setLoading(true);
    try {
      setData(await fetchHostelStudents(seed, academicYear, {
        q: search || undefined,
        branch: branch !== 'ALL' ? branch : undefined,
        batch: batch !== 'ALL' ? batch : undefined,
        hostelId: hostelId !== 'ALL' ? hostelId : undefined,
        room: room || undefined,
        docStatus: docStatus !== 'ALL' ? docStatus : undefined,
      }));
    } finally {
      setLoading(false);
    }
  }, [academicYear, search, branch, batch, hostelId, room, docStatus]);

  useEffect(() => { void load(); }, [load]);

  const flash = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await syncHostelStudentsErp(academicYear);
      setData(result);
      flash(result.message, 'success');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'ERP sync failed', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const openDetail = async (id: string) => {
    setSelectedId(id);
    setDetailLoading(true);
    setDetail(null);
    try {
      const d = await fetchHostelStudentDetail(id);
      setDetail(d);
      setEditForm({
        localGuardianName: d.localGuardian.name,
        localGuardianMobile: d.localGuardian.mobile,
        localGuardianRelation: d.localGuardian.relation,
        dietaryPreference: d.dietaryPreference,
        medicalRestrictions: d.medical.restrictions,
        allergies: d.medical.allergies,
        currentMedications: d.medical.currentMedications,
      });
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedId) return;
    try {
      const updated = await updateHostelStudent(selectedId, editForm);
      setDetail(updated);
      setEditOpen(false);
      flash('Hostel profile updated', 'success');
      void load();
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Update failed', 'error');
    }
  };

  const handleVerifyDoc = async (docId: string, status: 'VERIFIED' | 'REJECTED') => {
    try {
      const result = await verifyHostelStudentDoc(docId, status);
      flash(result.message, 'success');
      if (selectedId) await openDetail(selectedId);
      void load();
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Verification failed', 'error');
    }
  };

  const handleApproveRequest = async (requestId: string, action: 'APPROVE' | 'REJECT') => {
    try {
      const result = await reviewHostelProfileUpdate(requestId, action);
      flash(result.message, 'success');
      if (selectedId) await openDetail(selectedId);
      void load();
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Failed', 'error');
    }
  };

  const handleExport = async (reportType: string) => {
    const result = await exportHostelStudents(academicYear, 'PDF', reportType);
    flash(result.message, 'success');
  };

  if (loading && !data) return <AcademicLoading />;

  return (
    <div className="flex flex-col h-full gap-4">
      <FeeMessage message={message} type={messageType} />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Hostel Students</h2>
          <p className="text-xs text-slate-500">{data?.lastSyncNote}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className="text-xs border rounded-lg px-2 py-1.5">
            {(data?.academicYears ?? ['2025-26']).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <button type="button" onClick={() => void handleSync()} disabled={syncing} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg flex items-center gap-1">
            <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} /> ERP Sync
          </button>
          {data?.permissions.canExport && (
            <button type="button" onClick={() => void handleExport('Hostel Directory')} className="px-3 py-1.5 text-xs border rounded-lg flex items-center gap-1">
              <Download size={12} /> Export
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {[
          { label: 'Total Residents', value: data?.kpis.totalResidents ?? 0, icon: <Users size={14} /> },
          { label: 'Verified Docs', value: data?.kpis.verifiedDocs ?? 0, icon: <FileCheck size={14} /> },
          { label: 'Pending Docs', value: data?.kpis.pendingDocs ?? 0, icon: <Shield size={14} /> },
          { label: 'Severe Allergies', value: data?.kpis.severeAllergyCases ?? 0, icon: <AlertTriangle size={14} /> },
          { label: 'Update Requests', value: data?.kpis.pendingUpdateRequests ?? 0, icon: <Edit3 size={14} /> },
        ].map((k) => (
          <div key={k.label} className="bg-white border rounded-xl p-3 shadow-sm">
            <div className="flex items-center gap-1 text-slate-500 text-[9px] font-bold mb-1">{k.icon}{k.label}</div>
            <p className="text-lg font-bold text-slate-800">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, admission, guardian..." className="w-full pl-8 pr-3 py-1.5 text-xs border rounded-lg" />
        </div>
        <select value={branch} onChange={(e) => setBranch(e.target.value)} className="text-xs border rounded-lg px-2 py-1.5">
          {(data?.branches ?? ['ALL']).map((b) => <option key={b} value={b}>{b === 'ALL' ? 'All Branches' : b}</option>)}
        </select>
        <select value={batch} onChange={(e) => setBatch(e.target.value)} className="text-xs border rounded-lg px-2 py-1.5">
          {(data?.batches ?? ['ALL']).map((b) => <option key={b} value={b}>{b === 'ALL' ? 'All Batches' : b}</option>)}
        </select>
        <select value={hostelId} onChange={(e) => setHostelId(e.target.value)} className="text-xs border rounded-lg px-2 py-1.5">
          <option value="ALL">All Hostels</option>
          {(data?.hostels ?? []).map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
        <input value={room} onChange={(e) => setRoom(e.target.value)} placeholder="Room" className="text-xs border rounded-lg px-2 py-1.5 w-20" />
        <select value={docStatus} onChange={(e) => setDocStatus(e.target.value)} className="text-xs border rounded-lg px-2 py-1.5">
          {(data?.docStatuses ?? ['ALL']).map((d) => <option key={d} value={d}>{d === 'ALL' ? 'All Doc Status' : d}</option>)}
        </select>
      </div>

      <div className="flex flex-col xl:flex-row gap-4 flex-1 min-h-0">
        <div className="flex-1 bg-white border rounded-xl shadow-sm overflow-hidden flex flex-col min-w-0">
          <div className="overflow-auto flex-1">
            <table className="w-full text-[10px] text-left">
              <thead className="bg-slate-50 sticky top-0">
                <tr className="text-slate-500 border-b">
                  <th className="p-2">Student</th>
                  <th>Branch / Batch</th>
                  <th>Hostel / Room</th>
                  <th>Guardian</th>
                  <th>Blood</th>
                  <th>Docs</th>
                  <th>Points</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(data?.students ?? []).map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => void openDetail(s.id)}
                    className={`hover:bg-blue-50 cursor-pointer ${selectedId === s.id ? 'bg-blue-50' : ''}`}
                  >
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                          {s.photoUrl ? <img src={s.photoUrl} alt="" className="w-full h-full rounded-full object-cover" /> : <User size={12} className="text-slate-500" />}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 flex items-center gap-1">
                            {s.name}
                            {s.hasSevereAllergy && <AlertTriangle size={10} className="text-red-500" />}
                          </p>
                          <p className="text-slate-500">{s.admissionNumber} · {s.classLabel}</p>
                        </div>
                      </div>
                    </td>
                    <td>{s.branch}<br /><span className="text-slate-500">{s.batch}</span></td>
                    <td>{s.hostel}<br /><span className="text-slate-500">{s.room}/{s.bed} · {s.block}</span></td>
                    <td>
                      {s.guardianName || '—'}<br />
                      {s.guardianMobile && (
                        <a href={`tel:${s.guardianMobile}`} onClick={(e) => e.stopPropagation()} className="text-blue-600 flex items-center gap-0.5">
                          <Phone size={9} /> {s.guardianMobile}
                        </a>
                      )}
                    </td>
                    <td>{s.bloodGroup || '—'}</td>
                    <td><StatusBadge status={s.docStatus} /></td>
                    <td className={s.disciplinaryPoints > 0 ? 'text-red-600 font-bold' : ''}>{s.disciplinaryPoints}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(data?.students ?? []).length === 0 && (
              <p className="text-center text-sm text-slate-500 py-12">No hostel residents found. Run ERP Sync to import from allotments.</p>
            )}
          </div>
        </div>

        <div className="w-full xl:w-96 shrink-0">
          <div className="bg-white border rounded-xl p-4 shadow-sm sticky top-0 max-h-[75vh] overflow-y-auto">
            {detailLoading ? (
              <p className="text-xs text-slate-500">Loading profile...</p>
            ) : !detail ? (
              <p className="text-xs text-slate-500">Select a student to view profile card</p>
            ) : (
              <div className="space-y-4 text-[10px]">
                <div className="flex items-start gap-3">
                  <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                    <User size={24} className="text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-800 text-sm">{detail.name}</h3>
                    <p className="text-slate-500">{detail.admissionNumber} · {detail.classLabel}</p>
                    <p className="text-slate-600 mt-1">{detail.mobile} · {detail.email}</p>
                    {detail.hasSevereAllergy && (
                      <p className="text-red-600 font-bold flex items-center gap-1 mt-1"><AlertTriangle size={12} /> Severe allergy alert</p>
                    )}
                  </div>
                  {data?.permissions.canEdit && (
                    <button type="button" onClick={() => setEditOpen(true)} className="p-1.5 border rounded-lg hover:bg-slate-50"><Edit3 size={14} /></button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-slate-50 rounded-lg"><p className="text-[8px] text-slate-500">Blood Group</p><p className="font-bold flex items-center gap-1"><Heart size={10} className="text-red-500" />{detail.medical.bloodGroup || '—'}</p></div>
                  <div className="p-2 bg-slate-50 rounded-lg"><p className="text-[8px] text-slate-500">Disciplinary</p><p className="font-bold">{detail.disciplinaryPoints} pts</p></div>
                  <div className="p-2 bg-slate-50 rounded-lg col-span-2"><p className="text-[8px] text-slate-500">Room</p><p className="font-bold">{detail.hostel} · {detail.block} · {detail.room}/{detail.bed}</p></div>
                </div>

                <div>
                  <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Local Guardian</p>
                  <p className="font-medium">{detail.localGuardian.name} ({detail.localGuardian.relation})</p>
                  <a href={`tel:${detail.localGuardian.mobile}`} className="text-blue-600 flex items-center gap-1"><Phone size={10} /> {detail.localGuardian.mobile}</a>
                  <p className="text-slate-500 mt-0.5">{detail.localGuardian.address}</p>
                  <p className="text-slate-400">ID ({detail.localGuardian.idType}): {detail.localGuardian.idMasked}</p>
                </div>

                <div>
                  <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Medical</p>
                  <p><span className="text-slate-500">Diet:</span> {detail.dietaryPreference}</p>
                  {detail.medical.restrictions && <p><span className="text-slate-500">Restrictions:</span> {detail.medical.restrictions}</p>}
                  {detail.medical.allergies && <p className="text-red-700"><span className="text-slate-500">Allergies:</span> {detail.medical.allergies}</p>}
                  {detail.medical.currentMedications && <p><span className="text-slate-500">Medications:</span> {detail.medical.currentMedications}</p>}
                </div>

                {detail.roommates.length > 0 && (
                  <div>
                    <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Roommates</p>
                    {detail.roommates.map((r, i) => <p key={i}>{r.name} · Bed {r.bed}</p>)}
                  </div>
                )}

                {detail.warden && (
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <p className="text-[9px] font-bold text-blue-800">Warden (Mobile App)</p>
                    <a href={`tel:${detail.warden.mobile}`} className="text-blue-600 flex items-center gap-1"><Phone size={10} /> {detail.warden.name} — {detail.warden.mobile}</a>
                  </div>
                )}

                <div>
                  <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Compliance Documents</p>
                  <div className="space-y-1.5">
                    {detail.documents.map((d) => (
                      <div key={d.id} className="flex items-center justify-between border rounded p-1.5">
                        <div>
                          <p className="font-medium">{d.fileName}</p>
                          <p className="text-slate-500">{d.docType} · {d.verificationStatus}</p>
                        </div>
                        {data?.permissions.canVerifyDocs && d.verificationStatus === 'PENDING' && (
                          <div className="flex gap-1">
                            <button type="button" onClick={() => void handleVerifyDoc(d.id, 'VERIFIED')} className="p-1 text-green-600"><CheckCircle2 size={14} /></button>
                            <button type="button" onClick={() => void handleVerifyDoc(d.id, 'REJECTED')} className="p-1 text-red-600"><XCircle size={14} /></button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {detail.pendingUpdateRequests.length > 0 && data?.permissions.canEdit && (
                  <div>
                    <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Pending Update Requests</p>
                    {detail.pendingUpdateRequests.map((r) => (
                      <div key={r.id} className="border rounded p-2 mb-1">
                        <p>{r.requestedBy} · {r.createdAt}</p>
                        <div className="flex gap-1 mt-1">
                          <button type="button" onClick={() => void handleApproveRequest(r.id, 'APPROVE')} className="text-[8px] bg-green-600 text-white px-2 py-0.5 rounded">Approve</button>
                          <button type="button" onClick={() => void handleApproveRequest(r.id, 'REJECT')} className="text-[8px] border px-2 py-0.5 rounded">Reject</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <AcademicModal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Hostel Profile">
        <div className="space-y-3 text-sm">
          <div>
            <label className="text-xs font-medium">Local Guardian Name *</label>
            <input value={editForm.localGuardianName} onChange={(e) => setEditForm((f) => ({ ...f, localGuardianName: e.target.value }))} className="w-full border rounded px-2 py-1.5 text-xs mt-1" />
          </div>
          <div>
            <label className="text-xs font-medium">Guardian Mobile</label>
            <input value={editForm.localGuardianMobile} onChange={(e) => setEditForm((f) => ({ ...f, localGuardianMobile: e.target.value }))} className="w-full border rounded px-2 py-1.5 text-xs mt-1" />
          </div>
          <div>
            <label className="text-xs font-medium">Relation</label>
            <input value={editForm.localGuardianRelation} onChange={(e) => setEditForm((f) => ({ ...f, localGuardianRelation: e.target.value }))} className="w-full border rounded px-2 py-1.5 text-xs mt-1" />
          </div>
          <div>
            <label className="text-xs font-medium">Dietary Preference</label>
            <select value={editForm.dietaryPreference} onChange={(e) => setEditForm((f) => ({ ...f, dietaryPreference: e.target.value }))} className="w-full border rounded px-2 py-1.5 text-xs mt-1">
              {(data?.dietaryOptions ?? ['VEG']).map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium">Medical Restrictions</label>
            <textarea value={editForm.medicalRestrictions} onChange={(e) => setEditForm((f) => ({ ...f, medicalRestrictions: e.target.value }))} className="w-full border rounded px-2 py-1.5 text-xs mt-1" rows={2} />
          </div>
          <div>
            <label className="text-xs font-medium">Allergies</label>
            <textarea value={editForm.allergies} onChange={(e) => setEditForm((f) => ({ ...f, allergies: e.target.value }))} className="w-full border rounded px-2 py-1.5 text-xs mt-1" rows={2} />
          </div>
          <button type="button" onClick={() => void handleSave()} className="w-full bg-blue-600 text-white font-bold py-2 rounded-lg text-xs">Save Changes</button>
        </div>
      </AcademicModal>
    </div>
  );
}
