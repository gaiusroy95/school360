import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ScanLine, BookUp, RefreshCcw, User, BookOpen, AlertTriangle,
  CheckCircle2, Clock, IndianRupee, BarChart3, Bell,
} from 'lucide-react';
import {
  fetchBookIssueReturn,
  lookupCirculationMember,
  lookupCirculationBook,
  issueCirculationBook,
  returnCirculationBook,
  type BookIssueReturn,
  type CirculationMember,
  type CirculationBook,
  type ReturnResult,
} from '../../../lib/libraryServices';
import { AcademicLoading, AcademicModal, StatusBadge, FeeMessage } from '../FeeFinanceManagement/FeeFinanceUi';

type Mode = 'issue' | 'return';

export function BookIssueReturnView() {
  const [data, setData] = useState<BookIssueReturn | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>('issue');
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [branchId, setBranchId] = useState('');
  const [memberCode, setMemberCode] = useState('');
  const [bookBarcode, setBookBarcode] = useState('');
  const [member, setMember] = useState<CirculationMember | null>(null);
  const [book, setBook] = useState<CirculationBook | null>(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [processing, setProcessing] = useState(false);
  const [finePopup, setFinePopup] = useState<ReturnResult | null>(null);
  const memberInputRef = useRef<HTMLInputElement>(null);
  const bookInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (seed = false) => {
    setLoading(true);
    try {
      const result = await fetchBookIssueReturn(seed, academicYear, branchId || undefined);
      setData(result);
      if (!branchId && result.branches[0]) setBranchId(result.branches[0].id);
    } finally {
      setLoading(false);
    }
  }, [academicYear, branchId]);

  useEffect(() => { void load(true); }, [load]);

  const flash = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  const scanMember = async () => {
    if (!memberCode.trim()) return;
    try {
      setMember(await lookupCirculationMember(memberCode.trim()));
      setMessage('');
      bookInputRef.current?.focus();
    } catch (e) {
      setMember(null);
      flash(e instanceof Error ? e.message : 'Member not found', 'error');
    }
  };

  const scanBook = async () => {
    if (!bookBarcode.trim()) return;
    try {
      setBook(await lookupCirculationBook(bookBarcode.trim()));
      setMessage('');
    } catch (e) {
      setBook(null);
      flash(e instanceof Error ? e.message : 'Book not found', 'error');
    }
  };

  const handleIssue = async () => {
    if (!member?.canIssue) {
      flash(member?.blockReason ?? 'Member cannot issue books', 'error');
      return;
    }
    if (!book?.available) {
      flash('Book is not available for issue', 'error');
      return;
    }
    setProcessing(true);
    try {
      const result = await issueCirculationBook(member.memberCode, book.accessionNo, academicYear);
      flash(result.message, 'success');
      setMember(null);
      setBook(null);
      setMemberCode('');
      setBookBarcode('');
      memberInputRef.current?.focus();
      void load();
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Issue failed', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleReturn = async () => {
    if (!book?.activeIssue) {
      flash('No active issue found for this barcode', 'error');
      return;
    }
    setProcessing(true);
    try {
      const result = await returnCirculationBook(book.accessionNo, academicYear);
      if (result.fineRequired) {
        setFinePopup(result);
      } else {
        flash(result.message, 'success');
      }
      setBook(null);
      setBookBarcode('');
      bookInputRef.current?.focus();
      void load();
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Return failed', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleMemberKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') void scanMember();
  };

  const handleBookKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      void scanBook();
      if (mode === 'issue' && member && book) void handleIssue();
      if (mode === 'return' && book) void handleReturn();
    }
  };

  if (loading && !data) return <AcademicLoading />;

  return (
    <div className="flex flex-col space-y-4 h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Book Issue / Return</h2>
          <p className="text-xs text-slate-500 mt-0.5">Barcode-driven circulation — fast issue & return during peak hours</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            className="text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded px-3 py-1.5 shadow-sm"
          >
            {(data?.academicYears ?? ['2025-26']).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className="text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded px-3 py-1.5 shadow-sm"
          >
            {(data?.branches ?? []).map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <div className="flex bg-slate-100 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => { setMode('issue'); setBook(null); setBookBarcode(''); }}
              className={`px-3 py-1.5 text-xs font-bold rounded-md flex items-center gap-1 ${mode === 'issue' ? 'bg-white shadow text-green-700' : 'text-slate-500'}`}
            >
              <BookUp size={14} /> Issue
            </button>
            <button
              type="button"
              onClick={() => { setMode('return'); setMember(null); setMemberCode(''); }}
              className={`px-3 py-1.5 text-xs font-bold rounded-md flex items-center gap-1 ${mode === 'return' ? 'bg-white shadow text-blue-700' : 'text-slate-500'}`}
            >
              <RefreshCcw size={14} /> Return
            </button>
          </div>
        </div>
      </div>

      {message && <FeeMessage message={message} type={messageType} />}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Active Issues', value: data?.kpis.activeIssues ?? 0, icon: <BookOpen size={16} />, color: 'text-purple-600 bg-purple-50' },
          { label: 'Overdue', value: data?.kpis.overdueBooks ?? 0, icon: <AlertTriangle size={16} />, color: 'text-red-600 bg-red-50' },
          { label: 'Issued Today', value: data?.kpis.todayIssued ?? 0, icon: <BookUp size={16} />, color: 'text-green-600 bg-green-50' },
          { label: 'Returned Today', value: data?.kpis.todayReturned ?? 0, icon: <RefreshCcw size={16} />, color: 'text-blue-600 bg-blue-50' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${kpi.color}`}>{kpi.icon}</div>
            <div>
              <p className="text-[9px] text-slate-500 font-medium">{kpi.label}</p>
              <p className="text-lg font-bold text-slate-900">{kpi.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-5 space-y-4">
          {mode === 'issue' && (
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1 mb-2">
                <ScanLine size={12} /> Scan Member ID / Barcode
              </label>
              <div className="flex gap-2">
                <input
                  ref={memberInputRef}
                  value={memberCode}
                  onChange={(e) => setMemberCode(e.target.value)}
                  onKeyDown={handleMemberKeyDown}
                  placeholder="MEM-0001 or scan RFID..."
                  className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500/30 font-mono"
                  autoFocus
                />
                <button type="button" onClick={() => void scanMember()} className="px-4 py-2 bg-green-600 text-white text-xs font-bold rounded-lg">
                  Lookup
                </button>
              </div>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1 mb-2">
              <ScanLine size={12} /> Scan Book Barcode / Accession No.
            </label>
            <div className="flex gap-2">
              <input
                ref={bookInputRef}
                value={bookBarcode}
                onChange={(e) => setBookBarcode(e.target.value)}
                onKeyDown={handleBookKeyDown}
                placeholder="LIB-0001-C1 or ISBN..."
                className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500/30 font-mono"
                autoFocus={mode === 'return'}
              />
              <button type="button" onClick={() => void scanBook()} className="px-4 py-2 bg-purple-600 text-white text-xs font-bold rounded-lg">
                Lookup
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {mode === 'issue' && (
              <div className={`bg-white border rounded-xl p-4 ${member ? 'border-green-200' : 'border-slate-200'}`}>
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1 mb-3">
                  <User size={14} className="text-green-600" /> Member Details
                </h3>
                {member ? (
                  <div className="space-y-1.5 text-[10px]">
                    <p className="font-bold text-sm text-slate-900">{member.memberName}</p>
                    <p className="text-slate-500">{member.memberCode} · {member.memberType}</p>
                    {member.className && <p className="text-slate-600">Class {member.className}-{member.sectionName}</p>}
                    <p className="text-slate-500">{member.mobile}</p>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                        {member.activeIssues}/{member.maxBooks} books
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                        {member.issueDays} day limit
                      </span>
                    </div>
                    {!member.canIssue && (
                      <p className="text-red-600 font-medium mt-2 flex items-center gap-1">
                        <AlertTriangle size={12} /> {member.blockReason}
                      </p>
                    )}
                    {member.unpaidFines > 0 && (
                      <p className="text-amber-700 font-medium">Unpaid fines: ₹{member.unpaidFines}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400">Scan member ID to begin issue</p>
                )}
              </div>
            )}

            <div className={`bg-white border rounded-xl p-4 ${book ? 'border-purple-200' : 'border-slate-200'} ${mode === 'return' ? 'sm:col-span-2' : ''}`}>
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1 mb-3">
                <BookOpen size={14} className="text-purple-600" /> Book Details
              </h3>
              {book ? (
                <div className="flex gap-3">
                  <div className={`w-12 h-16 rounded-lg ${book.coverColor} shrink-0 border border-slate-200/50`} />
                  <div className="space-y-1 text-[10px] flex-1 min-w-0">
                    <p className="font-bold text-sm text-slate-900 leading-tight">{book.title}</p>
                    <p className="text-slate-600">{book.author}</p>
                    <p className="text-slate-500">{book.category} · {book.branch}</p>
                    <p className="font-mono text-slate-500">Acc: {book.accessionNo}</p>
                    {book.rackLocation && <p className="text-slate-500">Rack: {book.rackLocation}</p>}
                    <StatusBadge status={book.available ? 'AVAILABLE' : book.copyStatus} />
                    {book.activeIssue && (
                      <div className="mt-2 p-2 bg-amber-50 border border-amber-100 rounded-lg">
                        <p className="font-medium text-amber-800">Issued to: {book.activeIssue.memberName}</p>
                        <p className="text-amber-700">Due: {book.activeIssue.dueDate}</p>
                        {book.activeIssue.daysOverdue > 0 && (
                          <p className="text-red-600 font-bold">{book.activeIssue.daysOverdue} days overdue</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-[10px] text-slate-400">Scan book barcode to continue</p>
              )}
            </div>
          </div>

          <button
            type="button"
            disabled={processing || (mode === 'issue' ? !member?.canIssue || !book?.available : !book?.activeIssue)}
            onClick={() => void (mode === 'issue' ? handleIssue() : handleReturn())}
            className={`w-full py-3 rounded-xl text-sm font-bold text-white shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${
              mode === 'issue' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {processing ? 'Processing...' : mode === 'issue' ? 'Confirm Issue' : 'Confirm Return'}
          </button>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[9px] text-slate-500 space-y-1">
            <p className="font-bold text-slate-700 flex items-center gap-1"><Bell size={10} /> Notifications</p>
            <p>Push/SMS/Email sent on successful issue & return</p>
            <p>Reminders: {(data?.reminderSchedule ?? []).join(' · ')}</p>
            <p className="text-amber-700">{data?.feeIntegration}</p>
          </div>
        </div>

        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <Clock size={14} className="text-purple-600" /> Active Issues
              </h3>
              <span className="text-[10px] text-slate-500">{data?.activeIssues.length ?? 0} records</span>
            </div>
            <div className="overflow-x-auto max-h-[280px] overflow-y-auto">
              <table className="w-full text-[10px]">
                <thead className="bg-slate-50 sticky top-0">
                  <tr className="text-slate-500 text-left">
                    <th className="px-3 py-2 font-semibold">Book</th>
                    <th className="px-3 py-2 font-semibold">Member</th>
                    <th className="px-3 py-2 font-semibold">Acc. No</th>
                    <th className="px-3 py-2 font-semibold">Issue</th>
                    <th className="px-3 py-2 font-semibold">Due</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                    <th className="px-3 py-2 font-semibold text-right">Fine</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {(data?.activeIssues ?? []).map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-medium text-slate-800 max-w-[120px] truncate">{row.bookTitle}</td>
                      <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{row.memberName}</td>
                      <td className="px-3 py-2 font-mono text-slate-500">{row.accessionNo}</td>
                      <td className="px-3 py-2 text-slate-500">{row.issueDate}</td>
                      <td className="px-3 py-2 text-slate-500">{row.dueDate}</td>
                      <td className="px-3 py-2"><StatusBadge status={row.status} /></td>
                      <td className="px-3 py-2 text-right font-bold text-red-600">
                        {row.fineAmount > 0 ? `₹${row.fineAmount}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <BarChart3 size={14} className="text-blue-600" /> Today&apos;s Issue / Return Register
              </h3>
            </div>
            <div className="overflow-x-auto max-h-[200px] overflow-y-auto">
              <table className="w-full text-[10px]">
                <thead className="bg-slate-50 sticky top-0">
                  <tr className="text-slate-500 text-left">
                    <th className="px-3 py-2 font-semibold">Time</th>
                    <th className="px-3 py-2 font-semibold">Type</th>
                    <th className="px-3 py-2 font-semibold">Txn #</th>
                    <th className="px-3 py-2 font-semibold">Book</th>
                    <th className="px-3 py-2 font-semibold">Member</th>
                    <th className="px-3 py-2 font-semibold text-right">Fine</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {(data?.dailyRegister ?? []).map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 text-slate-500">{row.time}</td>
                      <td className="px-3 py-2">
                        <StatusBadge status={row.txnType} />
                      </td>
                      <td className="px-3 py-2 font-mono text-slate-500">{row.txnNumber}</td>
                      <td className="px-3 py-2 text-slate-800 max-w-[100px] truncate">{row.bookTitle}</td>
                      <td className="px-3 py-2 text-slate-600">{row.memberName}</td>
                      <td className="px-3 py-2 text-right">{row.fineAmount > 0 ? `₹${row.fineAmount}` : '—'}</td>
                    </tr>
                  ))}
                  {(data?.dailyRegister ?? []).length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-slate-400">No transactions today yet</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-[9px]">
            {(data?.reports ?? []).map((r) => (
              <div key={r} className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-600 font-medium">
                📄 {r}
              </div>
            ))}
          </div>
        </div>
      </div>

      <AcademicModal
        open={!!finePopup}
        onClose={() => setFinePopup(null)}
        title="Fine Calculation"
        large
      >
        {finePopup && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl">
              <IndianRupee size={24} className="text-red-600 shrink-0" />
              <div>
                <p className="text-2xl font-bold text-red-700">{finePopup.fineFormatted}</p>
                <p className="text-xs text-red-600">{finePopup.daysOverdue} day(s) overdue</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><span className="text-slate-500">Book:</span> <span className="font-medium">{finePopup.bookTitle}</span></div>
              <div><span className="text-slate-500">Member:</span> <span className="font-medium">{finePopup.memberName}</span></div>
              <div><span className="text-slate-500">Accession:</span> <span className="font-mono">{finePopup.accessionNo}</span></div>
              <div><span className="text-slate-500">Return Date:</span> <span className="font-medium">{finePopup.returnDate}</span></div>
            </div>
            <p className="text-xs text-slate-600 bg-slate-50 rounded-lg p-3">{finePopup.message}</p>
            {finePopup.feeIntegrationNote && (
              <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-2 flex items-start gap-1">
                <AlertTriangle size={12} className="shrink-0 mt-0.5" /> {finePopup.feeIntegrationNote}
              </p>
            )}
            <div className="flex items-center gap-2 text-[10px] text-green-700">
              <CheckCircle2 size={14} /> Notification sent via {finePopup.notification.channels.join(', ')}
            </div>
            <button
              type="button"
              onClick={() => { setFinePopup(null); flash(finePopup.message, 'success'); }}
              className="w-full py-2.5 bg-slate-800 text-white text-xs font-bold rounded-lg"
            >
              Acknowledge & Close
            </button>
          </div>
        )}
      </AcademicModal>
    </div>
  );
}
