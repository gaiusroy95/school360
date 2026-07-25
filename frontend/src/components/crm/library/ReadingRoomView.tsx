import { useCallback, useEffect, useState } from 'react';
import {
  Armchair, BookOpen, RefreshCw, ScanBarcode, Users, Clock,
  LayoutGrid, LogIn, LogOut, BookMarked, TrendingUp,
} from 'lucide-react';
import {
  fetchLibraryReadingRoom,
  bookReadingSeat,
  occupyReadingSeat,
  vacateReadingSeat,
  issueInHouseBook,
  returnInHouseBook,
  type LibraryReadingRoom,
  type FloorPlanSeat,
} from '../../../lib/libraryServices';
import { AcademicLoading, AcademicModal, StatusBadge, FeeMessage, FeeTabs } from '../FeeFinanceManagement/FeeFinanceUi';

const SEAT_COLORS: Record<string, string> = {
  AVAILABLE: 'bg-emerald-100 border-emerald-300 text-emerald-800',
  BOOKED: 'bg-amber-100 border-amber-300 text-amber-800',
  OCCUPIED: 'bg-sky-100 border-sky-400 text-sky-900',
  MAINTENANCE: 'bg-slate-200 border-slate-300 text-slate-500',
};

function SeatCell({
  seat,
  onSelect,
  selected,
}: {
  seat: FloorPlanSeat;
  onSelect: (seat: FloorPlanSeat) => void;
  selected: boolean;
}) {
  const color = SEAT_COLORS[seat.status] ?? SEAT_COLORS.AVAILABLE;
  return (
    <button
      type="button"
      onClick={() => onSelect(seat)}
      className={`relative aspect-square rounded-lg border-2 flex flex-col items-center justify-center text-[9px] font-semibold transition-all hover:scale-105 ${color} ${selected ? 'ring-2 ring-sky-500 ring-offset-1' : ''}`}
      title={`${seat.seatCode} · ${seat.seatType} · ${seat.status}`}
    >
      <Armchair size={14} className="mb-0.5 opacity-70" />
      <span>{seat.seatCode}</span>
      {seat.hasPower && <span className="absolute top-0.5 right-0.5 text-[7px]">⚡</span>}
      {seat.currentBooking && (
        <span className="text-[7px] opacity-75 truncate max-w-full px-0.5">
          {seat.currentBooking.timeRemainingFormatted}
        </span>
      )}
    </button>
  );
}

export function ReadingRoomView() {
  const [data, setData] = useState<LibraryReadingRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('Floor Plan');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [branchId, setBranchId] = useState('');
  const [selectedSeat, setSelectedSeat] = useState<FloorPlanSeat | null>(null);
  const [bookModal, setBookModal] = useState(false);
  const [issueModal, setIssueModal] = useState(false);
  const [bookForm, setBookForm] = useState({ memberCode: '', startTime: '', endTime: '' });
  const [issueForm, setIssueForm] = useState({ memberCode: '', bookCode: '' });

  const load = useCallback(async (seed = false) => {
    setLoading(true);
    try {
      const result = await fetchLibraryReadingRoom(seed, academicYear, branchId || undefined);
      setData(result);
      if (!branchId && result.branches[0]) setBranchId(result.branches[0].id);
    } finally {
      setLoading(false);
    }
  }, [academicYear, branchId]);

  useEffect(() => { void load(true); }, [academicYear]);

  const flash = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 6000);
  };

  const handleBook = async () => {
    if (!selectedSeat || !bookForm.memberCode || !bookForm.startTime || !bookForm.endTime) return;
    try {
      const result = await bookReadingSeat({
        seatId: selectedSeat.id,
        memberCode: bookForm.memberCode.trim(),
        startTime: new Date(bookForm.startTime).toISOString(),
        endTime: new Date(bookForm.endTime).toISOString(),
        academicYear,
      });
      setData(result.data);
      setBookModal(false);
      flash(result.message, 'success');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Booking failed', 'error');
    }
  };

  const handleOccupy = async (seat: FloorPlanSeat) => {
    try {
      const result = await occupyReadingSeat({ seatId: seat.id });
      setData(result.data);
      flash(result.message, 'success');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Occupy failed', 'error');
    }
  };

  const handleVacate = async (seat: FloorPlanSeat) => {
    try {
      const result = await vacateReadingSeat({ seatId: seat.id });
      setData(result.data);
      flash(result.message, 'success');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Vacate failed', 'error');
    }
  };

  const handleIssue = async () => {
    if (!issueForm.memberCode || !issueForm.bookCode) return;
    try {
      const result = await issueInHouseBook({
        memberCode: issueForm.memberCode.trim(),
        bookCode: issueForm.bookCode.trim(),
        seatId: selectedSeat?.id,
        academicYear,
      });
      setData(result.data);
      setIssueModal(false);
      setIssueForm({ memberCode: '', bookCode: '' });
      flash(result.message, 'success');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Issue failed', 'error');
    }
  };

  const handleReturn = async (txnId: string) => {
    try {
      const result = await returnInHouseBook({ txnId });
      setData(result.data);
      flash(result.message, 'success');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Return failed', 'error');
    }
  };

  if (loading && !data) return <AcademicLoading />;

  const zones = [...new Set((data?.floorPlan ?? []).map((s) => s.floorZone))];
  const maxCols = Math.max(...(data?.floorPlan.map((s) => s.colIndex) ?? [0]), 0) + 1;

  return (
    <div className="flex flex-col space-y-4 h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Reading Room</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Seat booking & carrel management · In-house reference book issue terminal
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className="text-xs border rounded px-2 py-1.5">
            {(data?.academicYears ?? ['2025-26']).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="text-xs border rounded px-2 py-1.5">
            {(data?.branches ?? []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <button type="button" onClick={() => setIssueModal(true)} className="px-3 py-1.5 text-xs bg-sky-600 text-white rounded-lg font-semibold flex items-center gap-1">
            <ScanBarcode size={12} /> In-House Issue
          </button>
          <button type="button" onClick={() => void load()} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {message && <FeeMessage message={message} type={messageType} />}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total Seats', value: data?.kpis.totalSeats ?? 0, icon: <LayoutGrid size={16} /> },
          { label: 'Available', value: data?.kpis.available ?? 0, icon: <Armchair size={16} /> },
          { label: 'Occupied', value: data?.kpis.occupied ?? 0, icon: <Users size={16} /> },
          { label: 'In-House Issues', value: data?.kpis.activeInHouseIssues ?? 0, icon: <BookOpen size={16} /> },
          { label: 'Utilization', value: `${data?.kpis.seatUtilizationRate ?? 0}%`, icon: <TrendingUp size={16} />, small: true },
        ].map((k) => (
          <div key={k.label} className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">{k.icon}</div>
            <div>
              <p className="text-[9px] text-slate-500">{k.label}</p>
              <p className={`font-bold text-slate-900 ${k.small ? 'text-sm' : 'text-lg'}`}>{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      <FeeTabs tabs={['Floor Plan', 'Occupancy', 'In-House Terminal', 'Reports']} active={tab} onChange={setTab} />

      {tab === 'Floor Plan' && (
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            {zones.map((zone) => (
              <div key={zone} className="bg-white border border-slate-200 rounded-xl p-4">
                <h3 className="text-sm font-bold text-slate-800 mb-3">{zone}</h3>
                <div
                  className="grid gap-2"
                  style={{ gridTemplateColumns: `repeat(${maxCols}, minmax(0, 1fr))` }}
                >
                  {(data?.floorPlan ?? [])
                    .filter((s) => s.floorZone === zone)
                    .sort((a, b) => a.rowIndex - b.rowIndex || a.colIndex - b.colIndex)
                    .map((seat) => (
                      <SeatCell
                        key={seat.id}
                        seat={seat}
                        selected={selectedSeat?.id === seat.id}
                        onSelect={setSelectedSeat}
                      />
                    ))}
                </div>
              </div>
            ))}
            <div className="flex flex-wrap gap-3 text-[10px]">
              {Object.entries(SEAT_COLORS).map(([status, cls]) => (
                <span key={status} className={`px-2 py-1 rounded border ${cls}`}>{status}</span>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h3 className="text-sm font-bold text-slate-800 mb-3">
              {selectedSeat ? `Seat ${selectedSeat.seatCode}` : 'Select a Seat'}
            </h3>
            {selectedSeat ? (
              <div className="space-y-3 text-xs">
                <p><span className="text-slate-500">Type:</span> {selectedSeat.seatType}</p>
                <p><span className="text-slate-500">Status:</span> <StatusBadge status={selectedSeat.status === 'AVAILABLE' ? 'ACTIVE' : selectedSeat.status === 'OCCUPIED' ? 'ACTIVE' : 'PENDING'} /></p>
                <p><span className="text-slate-500">Power:</span> {selectedSeat.hasPower ? 'Yes' : 'No'}</p>
                {selectedSeat.currentBooking && (
                  <div className="bg-slate-50 rounded-lg p-2 space-y-1">
                    <p className="font-semibold">{selectedSeat.currentBooking.memberName}</p>
                    <p className="text-slate-500">{selectedSeat.currentBooking.startFormatted} – {selectedSeat.currentBooking.endFormatted}</p>
                    <p className="flex items-center gap-1 text-sky-700">
                      <Clock size={10} /> {selectedSeat.currentBooking.timeRemainingFormatted} remaining
                    </p>
                  </div>
                )}
                <div className="flex flex-col gap-2 pt-2">
                  {selectedSeat.status === 'AVAILABLE' && (
                    <button type="button" onClick={() => setBookModal(true)} className="w-full py-2 bg-violet-600 text-white text-xs font-semibold rounded-lg">
                      Book Slot
                    </button>
                  )}
                  {selectedSeat.status === 'BOOKED' && (
                    <button type="button" onClick={() => void handleOccupy(selectedSeat)} className="w-full py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1">
                      <LogIn size={12} /> Occupy Seat
                    </button>
                  )}
                  {(selectedSeat.status === 'OCCUPIED' || selectedSeat.status === 'BOOKED') && (
                    <button type="button" onClick={() => void handleVacate(selectedSeat)} className="w-full py-2 border border-slate-200 text-xs font-semibold rounded-lg flex items-center justify-center gap-1">
                      <LogOut size={12} /> Vacate
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-slate-400 text-xs text-center py-8">Click a seat on the floor plan</p>
            )}
          </div>
        </div>
      )}

      {tab === 'Occupancy' && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 overflow-x-auto">
          <table className="w-full text-xs min-w-[640px]">
            <thead>
              <tr className="text-slate-500 border-b">
                <th className="text-left py-2">Seat</th>
                <th className="text-left">Member</th>
                <th className="text-left">Class</th>
                <th className="text-left">Slot</th>
                <th className="text-left">Remaining</th>
                <th className="text-center">Status</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {(data?.currentOccupancy ?? []).map((row) => (
                <tr key={row.id} className="border-b border-slate-50">
                  <td className="py-2 font-mono font-semibold">{row.seatCode}</td>
                  <td>
                    <p className="font-medium">{row.memberName}</p>
                    <p className="text-[10px] text-slate-400">{row.memberCode}</p>
                  </td>
                  <td>{row.className}</td>
                  <td>{row.startFormatted} – {row.endFormatted}</td>
                  <td className="text-sky-700 font-semibold">{row.timeRemainingFormatted}</td>
                  <td className="text-center"><StatusBadge status="ACTIVE" /></td>
                  <td className="text-right">
                    <button type="button" onClick={() => void vacateReadingSeat({ bookingId: row.id }).then((r) => { setData(r.data); flash(r.message, 'success'); }).catch((e) => flash(e.message, 'error'))} className="text-red-600 font-semibold">
                      Vacate
                    </button>
                  </td>
                </tr>
              ))}
              {!data?.currentOccupancy.length && (
                <tr><td colSpan={7} className="text-center text-slate-400 py-8">No occupied seats</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'In-House Terminal' && (
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-200 rounded-xl p-4">
            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <BookMarked size={16} className="text-violet-600" /> Active In-House Issues
            </h3>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {(data?.activeInHouseTxns ?? []).map((txn) => (
                <div key={txn.id} className="flex items-center justify-between p-3 bg-white/80 rounded-lg text-xs">
                  <div>
                    <p className="font-semibold text-slate-800">{txn.bookTitle}</p>
                    <p className="text-slate-500">{txn.memberName} · {txn.bookCode} · Seat {txn.seatCode}</p>
                    <p className="text-amber-700 text-[10px] mt-0.5">RFID alarm active — must return before leaving</p>
                  </div>
                  <button type="button" onClick={() => void handleReturn(txn.id)} className="px-2 py-1 bg-emerald-600 text-white text-[10px] font-semibold rounded">
                    Return
                  </button>
                </div>
              ))}
              {!data?.activeInHouseTxns.length && (
                <p className="text-slate-400 text-center py-8">No active in-house issues</p>
              )}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h3 className="text-sm font-bold text-slate-800 mb-3">Reference Books (Non-Circulating)</h3>
            <div className="space-y-1 max-h-[400px] overflow-y-auto">
              {(data?.referenceBooks ?? []).map((book) => (
                <div key={book.id} className="flex justify-between text-xs py-2 border-b border-slate-50">
                  <div>
                    <p className="font-medium">{book.title}</p>
                    <p className="text-slate-400">{book.author} · {book.bookCode}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setIssueForm({ memberCode: '', bookCode: book.bookCode }); setIssueModal(true); }}
                    className="text-violet-600 font-semibold text-[10px]"
                  >
                    Issue
                  </button>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 mt-3">
              Workflow: Scan member ID → Scan reference book → Issue for reading room → Return before leaving
            </p>
          </div>
        </div>
      )}

      {tab === 'Reports' && (
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h3 className="text-sm font-bold text-slate-800 mb-3">Seat Utilization Rate</h3>
            <div className="flex items-center gap-4">
              <div className="text-4xl font-bold text-violet-600">{data?.reports.seatUtilizationRate ?? 0}%</div>
              <p className="text-xs text-slate-500">Based on occupied seat-minutes this month vs total capacity</p>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h3 className="text-sm font-bold text-slate-800 mb-3">Most Consulted Reference Books</h3>
            <div className="space-y-1">
              {(data?.reports.mostConsultedBooks ?? []).map((book) => (
                <div key={book.bookCode} className="flex justify-between text-xs py-1 border-b border-slate-50">
                  <span>{book.title}</span>
                  <span className="font-semibold">{book.consultations} times</span>
                </div>
              ))}
              {!data?.reports.mostConsultedBooks.length && (
                <p className="text-slate-400 text-center py-6">No consultation data yet</p>
              )}
            </div>
          </div>
          <div className="lg:col-span-2 bg-violet-50 border border-violet-100 rounded-xl p-4 text-xs text-violet-900 space-y-1">
            <p className="font-semibold">Automation & Validation</p>
            <ul>{(data?.automationRules ?? []).map((r) => <li key={r}>· {r}</li>)}</ul>
            <ul className="mt-2">{(data?.validationRules ?? []).map((r) => <li key={r}>· {r}</li>)}</ul>
            <p className="mt-2 text-violet-700">{data?.mobileSync.join(' · ')}</p>
          </div>
        </div>
      )}

      <AcademicModal open={bookModal} onClose={() => setBookModal(false)} title={`Book Seat ${selectedSeat?.seatCode ?? ''}`}>
        <div className="space-y-3">
          <label className="block space-y-1">
            <span className="text-xs font-semibold">Member ID / Code *</span>
            <input value={bookForm.memberCode} onChange={(e) => setBookForm({ ...bookForm, memberCode: e.target.value })} className="w-full text-sm border rounded-lg px-3 py-2 font-mono" />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold">Start Time *</span>
            <input type="datetime-local" value={bookForm.startTime} onChange={(e) => setBookForm({ ...bookForm, startTime: e.target.value })} className="w-full text-sm border rounded-lg px-3 py-2" />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold">End Time *</span>
            <input type="datetime-local" value={bookForm.endTime} onChange={(e) => setBookForm({ ...bookForm, endTime: e.target.value })} className="w-full text-sm border rounded-lg px-3 py-2" />
          </label>
          <p className="text-[10px] text-slate-400">
            Auto-cancels if member does not check in at gate within {data?.settings.bookingGraceMins ?? 15} min of start
          </p>
          <button type="button" onClick={() => void handleBook()} className="w-full py-2 bg-violet-600 text-white text-sm font-semibold rounded-lg">
            Confirm Booking
          </button>
        </div>
      </AcademicModal>

      <AcademicModal open={issueModal} onClose={() => setIssueModal(false)} title="In-House Issue Terminal">
        <div className="space-y-3">
          <label className="block space-y-1">
            <span className="text-xs font-semibold">Member ID / Code *</span>
            <input value={issueForm.memberCode} onChange={(e) => setIssueForm({ ...issueForm, memberCode: e.target.value })} className="w-full text-sm border rounded-lg px-3 py-2 font-mono" placeholder="Scan member card..." autoFocus />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold">Reference Book Code / ISBN *</span>
            <input value={issueForm.bookCode} onChange={(e) => setIssueForm({ ...issueForm, bookCode: e.target.value })} className="w-full text-sm border rounded-lg px-3 py-2 font-mono" placeholder="Scan reference book..." />
          </label>
          <p className="text-[10px] text-amber-700 bg-amber-50 rounded p-2">
            RFID security gate alarm will activate. Book must be returned before leaving the library.
          </p>
          <button type="button" onClick={() => void handleIssue()} className="w-full py-2 bg-sky-600 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-1">
            <ScanBarcode size={14} /> Issue for Reading Room
          </button>
        </div>
      </AcademicModal>
    </div>
  );
}
