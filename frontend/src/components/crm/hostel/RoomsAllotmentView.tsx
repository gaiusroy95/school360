import { useCallback, useEffect, useState, type DragEvent } from 'react';
import {
  Building, Bed, DoorOpen, RefreshCw, Download, Users, Wrench,
  CheckCircle2, XCircle, ArrowRightLeft, Zap, AlertTriangle,
} from 'lucide-react';
import {
  fetchRoomsAllotment,
  allocateHostelBed,
  confirmHostelAllotmentPayment,
  deallocateHostelBed,
  approveHostelTransfer,
  autoAssignHostelBed,
  updateHostelBedStatus,
  exportRoomsAllotment,
  type RoomsAllotment,
  type RoomsAllotmentBed,
} from '../../../lib/hostelServices';
import { AcademicLoading, FeeMessage } from '../FeeFinanceManagement/FeeFinanceUi';

const BED_STYLES: Record<string, string> = {
  green: 'bg-green-100 border-green-400 text-green-800 hover:bg-green-200',
  red: 'bg-red-100 border-red-400 text-red-800 hover:bg-red-200',
  yellow: 'bg-amber-100 border-amber-400 text-amber-800 hover:bg-amber-200',
};

const STATUS_LABEL: Record<string, string> = {
  AVAILABLE: 'Available',
  OCCUPIED: 'Occupied',
  MAINTENANCE: 'Maintenance',
};

export function RoomsAllotmentView() {
  const [data, setData] = useState<RoomsAllotment | null>(null);
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [hostelId, setHostelId] = useState('');
  const [blockId, setBlockId] = useState('ALL');
  const [floorId, setFloorId] = useState('ALL');
  const [roomType, setRoomType] = useState('ALL');
  const [selectedBed, setSelectedBed] = useState<(RoomsAllotmentBed & { roomNumber: string; roomType: string }) | null>(null);
  const [dragRequestId, setDragRequestId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (seed = false) => {
    setLoading(true);
    try {
      const result = await fetchRoomsAllotment(seed, academicYear, {
        hostelId: hostelId || undefined,
        blockId: blockId !== 'ALL' ? blockId : undefined,
        floorId: floorId !== 'ALL' ? floorId : undefined,
        roomType: roomType !== 'ALL' ? roomType : undefined,
        role: 'Admin',
      });
      setData(result);
      if (!hostelId && result.selectedHostelId) setHostelId(result.selectedHostelId);
    } finally {
      setLoading(false);
    }
  }, [academicYear, hostelId, blockId, floorId, roomType]);

  useEffect(() => { void load(true); }, []);

  useEffect(() => {
    if (!data) return;
    void load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [academicYear, hostelId, blockId, floorId, roomType]);

  const flash = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 6000);
  };

  const handleDropOnBed = async (bed: RoomsAllotmentBed, roomNumber: string, e: DragEvent) => {
    e.preventDefault();
    if (!dragRequestId || bed.status !== 'AVAILABLE') return;
    const request = data?.pendingRequests.find((r) => r.id === dragRequestId);
    if (!request || !request.eligible) {
      flash('Student not eligible — clear outstanding fees first', 'error');
      return;
    }
    setSaving(true);
    try {
      const result = await allocateHostelBed({
        bedId: bed.id,
        studentId: request.studentId,
        studentName: request.studentName,
        studentGender: request.gender,
        admissionNumber: request.studentName.replace(/\s/g, '').slice(0, 8),
        className: request.className,
        academicYear,
        requestId: request.id,
        approvedBy: 'Hostel Admin',
      });
      flash(result.message + (result.notification ? ` — ${result.notification}` : ''), 'success');
      setDragRequestId(null);
      await load();
    } catch (err) {
      flash(err instanceof Error ? err.message : 'Allocation failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmPayment = async (allotmentId: string) => {
    setSaving(true);
    try {
      const result = await confirmHostelAllotmentPayment(allotmentId);
      flash(result.message, 'success');
      await load();
      setSelectedBed(null);
    } catch (err) {
      flash(err instanceof Error ? err.message : 'Failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeallocate = async () => {
    if (!selectedBed?.student) return;
    setSaving(true);
    try {
      const result = await deallocateHostelBed({ allotmentId: selectedBed.student.allotmentId, reason: 'Manual de-allocation' });
      flash(result.message, 'success');
      await load();
      setSelectedBed(null);
    } catch (err) {
      flash(err instanceof Error ? err.message : 'Failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAutoAssign = async (requestId: string) => {
    setSaving(true);
    try {
      const result = await autoAssignHostelBed(requestId);
      flash(result.message, 'success');
      await load();
    } catch (err) {
      flash(err instanceof Error ? err.message : 'Auto-assign failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleBedStatus = async (status: string) => {
    if (!selectedBed) return;
    setSaving(true);
    try {
      const result = await updateHostelBedStatus(selectedBed.id, status);
      flash(result.message, 'success');
      await load();
    } catch (err) {
      flash(err instanceof Error ? err.message : 'Failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleApproveTransfer = async (transferId: string, role: 'Warden' | 'Admin') => {
    setSaving(true);
    try {
      const result = await approveHostelTransfer(transferId, role);
      flash(result.message, 'success');
      await load();
    } catch (err) {
      flash(err instanceof Error ? err.message : 'Failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async (format: string) => {
    const result = await exportRoomsAllotment(academicYear, hostelId, format);
    flash(result.message, 'success');
  };

  if (loading && !data) return <AcademicLoading />;

  const perms = data?.permissions;

  return (
    <div className="flex flex-col h-full gap-4">
      <FeeMessage message={message} type={messageType} />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Rooms & Allotment</h2>
          <p className="text-xs text-slate-500">Block → Floor → Room → Bed hierarchy with drag-and-drop allotment</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className="text-xs border rounded-lg px-2 py-1.5">
            {(data?.academicYears ?? ['2025-26']).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={hostelId} onChange={(e) => { setHostelId(e.target.value); setBlockId('ALL'); setFloorId('ALL'); }} className="text-xs border rounded-lg px-2 py-1.5">
            {(data?.hostels ?? []).map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
          <select value={blockId} onChange={(e) => { setBlockId(e.target.value); setFloorId('ALL'); }} className="text-xs border rounded-lg px-2 py-1.5">
            <option value="ALL">All Blocks</option>
            {(data?.blocks ?? []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <select value={floorId} onChange={(e) => setFloorId(e.target.value)} className="text-xs border rounded-lg px-2 py-1.5">
            <option value="ALL">All Floors</option>
            {(data?.floors ?? []).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <select value={roomType} onChange={(e) => setRoomType(e.target.value)} className="text-xs border rounded-lg px-2 py-1.5">
            {(data?.roomTypes ?? ['ALL']).map((t) => <option key={t} value={t}>{t === 'NON_AC' ? 'Non-AC' : t === 'ALL' ? 'All Types' : t}</option>)}
          </select>
          <button type="button" onClick={() => void load()} className="p-2 border rounded-lg hover:bg-slate-50"><RefreshCw size={14} /></button>
          {perms?.canExport && (
            <button type="button" onClick={() => void handleExport('PDF')} className="px-3 py-1.5 text-xs border rounded-lg flex items-center gap-1">
              <Download size={12} /> Export
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {[
          { label: 'Total Rooms', value: data?.kpis.totalRooms ?? 0, icon: <DoorOpen size={16} />, color: 'text-purple-600' },
          { label: 'Total Beds', value: data?.kpis.totalBeds ?? 0, icon: <Bed size={16} />, color: 'text-blue-600' },
          { label: 'Available', value: data?.kpis.available ?? 0, icon: <CheckCircle2 size={16} />, color: 'text-green-600' },
          { label: 'Occupied', value: data?.kpis.occupied ?? 0, icon: <Users size={16} />, color: 'text-red-600' },
          { label: 'Occupancy', value: data?.kpis.occupancyPct ?? '0%', icon: <Building size={16} />, color: 'text-orange-600' },
        ].map((k) => (
          <div key={k.label} className="bg-white border rounded-xl p-3 shadow-sm">
            <div className={`flex items-center gap-1.5 ${k.color} mb-1`}>{k.icon}<span className="text-[9px] font-bold uppercase">{k.label}</span></div>
            <p className="text-lg font-bold text-slate-800">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col xl:flex-row gap-4 flex-1 min-h-0">
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          <div className="flex items-center gap-4 text-[9px] text-slate-600">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-200 border border-green-400" /> Available</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-200 border border-red-400" /> Occupied</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-200 border border-amber-400" /> Maintenance</span>
            <span className="text-slate-400">| Drag pending request onto green bed to allot</span>
          </div>

          <div className="bg-white border rounded-xl p-4 shadow-sm overflow-auto flex-1 max-h-[55vh]">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(data?.matrix ?? []).map((room) => (
                <div key={room.id} className="border border-slate-200 rounded-lg p-3 bg-slate-50/50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-[11px] font-bold text-slate-800">{room.roomNumber}</p>
                      <p className="text-[8px] text-slate-500">{room.blockName} · {room.floorName} · {room.roomType === 'AC' ? 'AC' : 'Non-AC'}</p>
                    </div>
                    <span className="text-[7px] font-bold px-1.5 py-0.5 rounded bg-white border">{room.roomStatus}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {room.beds.map((bed) => (
                      <button
                        key={bed.id}
                        type="button"
                        disabled={saving}
                        draggable={bed.status === 'AVAILABLE' && !!dragRequestId}
                        onDragOver={(e) => { if (bed.status === 'AVAILABLE') e.preventDefault(); }}
                        onDrop={(e) => void handleDropOnBed(bed, room.roomNumber, e)}
                        onClick={() => setSelectedBed({ ...bed, roomNumber: room.roomNumber, roomType: room.roomType })}
                        className={`text-[8px] font-semibold py-2 px-1 rounded border transition-all ${BED_STYLES[bed.color] ?? BED_STYLES.green} ${selectedBed?.id === bed.id ? 'ring-2 ring-blue-500' : ''}`}
                      >
                        <Bed size={10} className="inline mr-0.5" />
                        Bed {bed.bedNumber}
                        {bed.student && <div className="truncate text-[7px] font-normal mt-0.5">{bed.student.name.split(' ')[0]}</div>}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {(data?.matrix ?? []).length === 0 && (
              <p className="text-center text-sm text-slate-500 py-12">No rooms match filters. Try seeding or changing filters.</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border rounded-xl p-4 shadow-sm">
              <h3 className="text-[11px] font-bold text-slate-800 mb-2 flex items-center gap-1"><Zap size={12} /> Pending Allotment Requests</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {(data?.pendingRequests ?? []).map((r) => (
                  <div
                    key={r.id}
                    draggable={r.eligible}
                    onDragStart={() => setDragRequestId(r.id)}
                    onDragEnd={() => setDragRequestId(null)}
                    className={`text-[9px] border rounded-lg p-2 flex justify-between items-center ${r.eligible ? 'cursor-grab bg-blue-50 border-blue-200' : 'bg-slate-50 opacity-60'}`}
                  >
                    <div>
                      <p className="font-bold">{r.studentName}</p>
                      <p className="text-slate-500">{r.course} · {r.yearLabel} · {r.gender}</p>
                      {r.outstandingFees > 0 && <p className="text-red-600">Fees due: ₹{r.outstandingFees}</p>}
                    </div>
                    <div className="flex gap-1">
                      {r.eligible && perms?.canAllocate && (
                        <button type="button" onClick={() => void handleAutoAssign(r.id)} className="text-[8px] bg-blue-600 text-white px-2 py-1 rounded">Auto</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border rounded-xl p-4 shadow-sm">
              <h3 className="text-[11px] font-bold text-slate-800 mb-2 flex items-center gap-1"><ArrowRightLeft size={12} /> Transfer Approvals</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {(data?.transferRequests ?? []).map((t) => (
                  <div key={t.id} className="text-[9px] border rounded-lg p-2">
                    <p className="font-bold">{t.studentName}</p>
                    <p className="text-slate-500">{t.status} · by {t.requestedBy}</p>
                    <div className="flex gap-1 mt-1">
                      {t.status === 'PENDING' && (
                        <button type="button" onClick={() => void handleApproveTransfer(t.id, 'Warden')} className="text-[8px] border px-2 py-0.5 rounded">Warden OK</button>
                      )}
                      {(t.status === 'WARDEN_APPROVED' || t.status === 'PENDING') && perms?.canApprove && (
                        <button type="button" onClick={() => void handleApproveTransfer(t.id, 'Admin')} className="text-[8px] bg-green-600 text-white px-2 py-0.5 rounded">Admin Approve</button>
                      )}
                    </div>
                  </div>
                ))}
                {(data?.transferRequests ?? []).length === 0 && <p className="text-[9px] text-slate-500">No pending transfers</p>}
              </div>
            </div>
          </div>
        </div>

        <div className="w-full xl:w-80 shrink-0">
          <div className="bg-white border rounded-xl p-4 shadow-sm sticky top-0">
            <h3 className="text-[11px] font-bold text-slate-800 mb-3">Bed Details</h3>
            {!selectedBed ? (
              <p className="text-[10px] text-slate-500">Click a bed in the matrix to view student details & fee status</p>
            ) : (
              <div className="space-y-3 text-[10px]">
                <div className="p-2 bg-slate-50 rounded-lg">
                  <p className="font-bold text-slate-800">Room {selectedBed.roomNumber} · Bed {selectedBed.bedNumber}</p>
                  <p className="text-slate-500">{selectedBed.roomType === 'AC' ? 'AC' : 'Non-AC'} · {STATUS_LABEL[selectedBed.status] ?? selectedBed.status}</p>
                </div>

                {selectedBed.student ? (
                  <>
                    <div>
                      <p className="text-[9px] text-slate-500 uppercase font-bold">Student</p>
                      <p className="font-bold">{selectedBed.student.name}</p>
                      <p>{selectedBed.student.admissionNumber} · {selectedBed.student.className}</p>
                      <p>Gender: {selectedBed.student.gender}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-500 uppercase font-bold">Fee Status</p>
                      <p>Invoice: {selectedBed.student.invoiceNumber || '—'}</p>
                      <p>Amount: ₹{selectedBed.student.feeAmount.toLocaleString('en-IN')}</p>
                      <p className={selectedBed.student.paymentStatus === 'PAID' ? 'text-green-600 font-bold' : 'text-amber-600 font-bold'}>
                        {selectedBed.student.paymentStatus}
                      </p>
                    </div>
                    {selectedBed.student.paymentStatus === 'PENDING' && perms?.canApprove && (
                      <button type="button" disabled={saving} onClick={() => void handleConfirmPayment(selectedBed.student!.allotmentId)} className="w-full bg-green-600 text-white text-[10px] font-bold py-2 rounded-lg">
                        Confirm Payment → Occupied
                      </button>
                    )}
                    {perms?.canDeallocate && (
                      <button type="button" disabled={saving} onClick={() => void handleDeallocate()} className="w-full border border-red-300 text-red-700 text-[10px] font-bold py-2 rounded-lg">
                        De-allocate Bed
                      </button>
                    )}
                  </>
                ) : (
                  <p className="text-slate-500 flex items-center gap-1"><CheckCircle2 size={12} className="text-green-500" /> Vacant — drop a student request here</p>
                )}

                {perms?.canEditBed && selectedBed.status !== 'OCCUPIED' && (
                  <div className="pt-2 border-t">
                    <p className="text-[9px] font-bold text-slate-500 mb-1">Set Bed Status</p>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => void handleBedStatus('AVAILABLE')} className="flex-1 text-[8px] border rounded py-1">Available</button>
                      <button type="button" onClick={() => void handleBedStatus('MAINTENANCE')} className="flex-1 text-[8px] border rounded py-1 flex items-center justify-center gap-0.5"><Wrench size={10} /> Maint.</button>
                    </div>
                  </div>
                )}

                {data?.wardenContact && (
                  <div className="pt-2 border-t text-[9px] text-slate-600">
                    <p className="font-bold">Warden Contact (Mobile App)</p>
                    <p>{data.wardenContact.staffName} · {data.wardenContact.mobile || 'N/A'}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white border rounded-xl p-4 shadow-sm mt-4">
            <h3 className="text-[11px] font-bold text-slate-800 mb-2">Recent Allotments</h3>
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {(data?.recentAllotments ?? []).slice(0, 5).map((a, i) => (
                <div key={i} className="text-[9px] border-b pb-1">
                  <span className="font-medium">{a.student}</span>
                  <span className="text-slate-500"> · {a.room}/{a.bed}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mt-4 text-[8px] text-amber-900">
            <p className="font-bold flex items-center gap-1"><AlertTriangle size={10} /> Validation Rules</p>
            <ul className="mt-1 space-y-0.5 list-disc list-inside">
              <li>Gender-specific hostel enforcement</li>
              <li>One active bed per student</li>
              <li>Multi-level approval for transfers</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
