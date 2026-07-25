import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ClipboardCheck, ScanBarcode, RefreshCw, Play, CheckCircle2, AlertTriangle,
  XCircle, MapPin, Package, FileText, Bell,
} from 'lucide-react';
import {
  fetchStockVerification,
  createAuditSession,
  scanAuditBook,
  reconcileAuditSession,
  resolveAuditDiscrepancy,
  closeAuditSession,
  type StockVerification,
  type AuditScan,
} from '../../../lib/libraryServices';
import { AcademicLoading, AcademicModal, StatusBadge, FeeMessage, FeeTabs } from '../FeeFinanceManagement/FeeFinanceUi';

const DISCREPANCY_TABS = ['Missing', 'Misplaced', 'Extra', 'Returned', 'Damaged', 'Matched'] as const;

function DiscrepancyActions({
  scan,
  onResolve,
}: {
  scan: AuditScan;
  onResolve: (id: string, resolution: 'MARKED_LOST' | 'MARKED_FOUND' | 'CORRECTED' | 'ACCEPTED') => void;
}) {
  if (scan.discrepancyType === 'NONE' || scan.resolution !== 'PENDING') {
    return <StatusBadge status={scan.resolution === 'PENDING' ? 'ACTIVE' : 'COMPLETED'} />;
  }

  const actions: { label: string; resolution: 'MARKED_LOST' | 'MARKED_FOUND' | 'CORRECTED' | 'ACCEPTED' }[] = [];
  if (scan.discrepancyType === 'MISSING') {
    actions.push({ label: 'Mark Lost', resolution: 'MARKED_LOST' });
    actions.push({ label: 'Found', resolution: 'MARKED_FOUND' });
  } else if (scan.discrepancyType === 'MISPLACED') {
    actions.push({ label: 'Relocate', resolution: 'MARKED_FOUND' });
    actions.push({ label: 'Accept', resolution: 'ACCEPTED' });
  } else if (scan.discrepancyType === 'EXTRA') {
    actions.push({ label: 'Accept Extra', resolution: 'ACCEPTED' });
    actions.push({ label: 'Mark Lost', resolution: 'MARKED_LOST' });
  } else if (scan.discrepancyType === 'RETURNED_UNRECORDED') {
    actions.push({ label: 'Auto Return', resolution: 'CORRECTED' });
    actions.push({ label: 'Accept', resolution: 'ACCEPTED' });
  } else if (scan.discrepancyType === 'DAMAGED') {
    actions.push({ label: 'Accept', resolution: 'ACCEPTED' });
    actions.push({ label: 'Write Off', resolution: 'MARKED_LOST' });
  }

  return (
    <div className="flex flex-wrap gap-1">
      {actions.map((a) => (
        <button
          key={a.resolution}
          type="button"
          onClick={() => onResolve(scan.id, a.resolution)}
          className="px-2 py-0.5 text-[10px] font-semibold border border-slate-200 rounded hover:bg-slate-50"
        >
          {a.label}
        </button>
      ))}
    </div>
  );
}

export function StockVerificationView() {
  const [data, setData] = useState<StockVerification | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<string>('Missing');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [scanInput, setScanInput] = useState('');
  const [scanMethod, setScanMethod] = useState<'BARCODE' | 'RFID' | 'MANUAL'>('BARCODE');
  const [markDamaged, setMarkDamaged] = useState(false);
  const [startModal, setStartModal] = useState(false);
  const [scannedBy, setScannedBy] = useState('Librarian');
  const [targetRackId, setTargetRackId] = useState('');
  const [targetShelfId, setTargetShelfId] = useState('');
  const scanRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (seed = false) => {
    setLoading(true);
    try {
      const result = await fetchStockVerification(seed);
      setData(result);
      if (!targetRackId && result.rackOptions[0]) setTargetRackId(result.rackOptions[0].id);
    } finally {
      setLoading(false);
    }
  }, [targetRackId]);

  useEffect(() => { void load(); }, []);

  const flash = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 6000);
  };

  const session = data?.focusSession ?? data?.activeSession;

  const handleStart = async () => {
    try {
      const result = await createAuditSession({
        scannedBy,
        rackId: targetRackId || undefined,
        shelfId: targetShelfId || undefined,
        academicYear: '2025-26',
      });
      setData(result);
      setStartModal(false);
      flash(`Audit ${result.focusSession?.auditCode} started`, 'success');
      scanRef.current?.focus();
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Failed to start audit', 'error');
    }
  };

  const handleScan = async () => {
    if (!session || !scanInput.trim()) return;
    try {
      const result = await scanAuditBook(session.id, scanInput.trim(), scannedBy, scanMethod, markDamaged);
      setData(result.data);
      flash(result.message, result.flagged ? 'info' : 'success');
      setScanInput('');
      scanRef.current?.focus();
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Scan failed', 'error');
    }
  };

  const handleReconcile = async () => {
    if (!session) return;
    try {
      const result = await reconcileAuditSession(session.id, scannedBy);
      setData(result);
      flash('Reconciled — missing books flagged', 'success');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Reconcile failed', 'error');
    }
  };

  const handleResolve = async (scanId: string, resolution: 'MARKED_LOST' | 'MARKED_FOUND' | 'CORRECTED' | 'ACCEPTED') => {
    try {
      const result = await resolveAuditDiscrepancy(scanId, resolution, scannedBy);
      setData(result);
      flash('Discrepancy resolved', 'success');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Resolve failed', 'error');
    }
  };

  const handleClose = async () => {
    if (!session) return;
    if (!window.confirm('Close this audit session? Write-offs will be applied for marked-lost books.')) return;
    try {
      const result = await closeAuditSession(session.id, scannedBy);
      setData(result.data);
      flash(
        `Audit closed${result.adminNotified ? ' — Admin notified of high loss' : ''}. Loss: ${result.financialLossFormatted}`,
        result.adminNotified ? 'info' : 'success',
      );
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Cannot close audit', 'error');
    }
  };

  if (loading && !data) return <AcademicLoading />;

  const matrix = data?.discrepancyMatrix;
  const tabScans: AuditScan[] = (() => {
    if (!matrix) return [];
    switch (tab) {
      case 'Missing': return matrix.missing;
      case 'Misplaced': return matrix.misplaced;
      case 'Extra': return matrix.extra;
      case 'Returned': return matrix.returnedUnrecorded;
      case 'Damaged': return matrix.damaged;
      case 'Matched': return matrix.matched;
      default: return [];
    }
  })();

  const varianceColor = (session?.variance ?? 0) === 0 ? 'text-emerald-600' : 'text-amber-600';

  return (
    <div className="flex flex-col space-y-4 h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Stock Verification</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Physical audit via barcode/RFID scan · reconcile against database · discrepancy resolution
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!session && (
            <button
              type="button"
              onClick={() => setStartModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 text-white text-xs font-semibold rounded-lg"
            >
              <Play size={14} /> Start Audit
            </button>
          )}
          <button type="button" onClick={() => void load()} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {message && <FeeMessage message={message} type={messageType} />}

      {session ? (
        <div className="bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 rounded-xl p-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <ClipboardCheck size={18} className="text-teal-600" />
                <h3 className="font-bold text-slate-800">Active Audit: {session.auditCode}</h3>
                <StatusBadge status="ACTIVE" />
              </div>
              <p className="text-xs text-slate-600 mt-1 flex items-center gap-1">
                <MapPin size={12} /> {session.targetLabel} · Started {new Date(session.startDate).toLocaleString()} · By {session.scannedBy}
              </p>
            </div>
            <div className="grid grid-cols-4 gap-3 text-center">
              <div>
                <p className="text-[10px] text-slate-500">System</p>
                <p className="text-lg font-bold text-slate-800">{session.systemCount}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500">Physical</p>
                <p className="text-lg font-bold text-slate-800">{session.physicalCount}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500">Variance</p>
                <p className={`text-lg font-bold ${varianceColor}`}>{session.variance >= 0 ? '+' : ''}{session.variance}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500">Pending</p>
                <p className="text-lg font-bold text-amber-600">{data?.pendingDiscrepancies ?? 0}</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            <button type="button" onClick={() => void handleReconcile()} className="px-3 py-1.5 text-xs border border-teal-300 text-teal-800 rounded-lg font-semibold">
              Reconcile Missing
            </button>
            <button
              type="button"
              onClick={() => void handleClose()}
              disabled={!data?.canClose}
              className="px-3 py-1.5 text-xs bg-teal-600 text-white rounded-lg font-semibold disabled:opacity-40"
            >
              <CheckCircle2 size={12} className="inline mr-1" />
              Close Audit
            </button>
            {!data?.canClose && (
              <span className="text-[10px] text-amber-700 flex items-center gap-1">
                <AlertTriangle size={12} /> Resolve all discrepancies before closing
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
          <ScanBarcode size={32} className="mx-auto text-slate-400 mb-2" />
          <p className="text-sm text-slate-600">No active audit session. Start a new audit to scan shelves.</p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Missing', value: session?.missingCount ?? 0, icon: <XCircle size={16} />, color: 'text-red-600' },
          { label: 'Misplaced', value: session?.misplacedCount ?? 0, icon: <MapPin size={16} />, color: 'text-amber-600' },
          { label: 'Extra', value: session?.extraCount ?? 0, icon: <Package size={16} />, color: 'text-purple-600' },
          { label: 'Unrecorded Return', value: session?.returnedUnrecordedCount ?? 0, icon: <RefreshCw size={16} />, color: 'text-blue-600' },
          { label: 'Damaged', value: session?.damagedCount ?? 0, icon: <AlertTriangle size={16} />, color: 'text-orange-600' },
        ].map((k) => (
          <div key={k.label} className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center ${k.color}`}>{k.icon}</div>
            <div>
              <p className="text-[9px] text-slate-500">{k.label}</p>
              <p className="font-bold text-slate-900 text-lg">{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {session && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
            <ScanBarcode size={16} className="text-teal-600" /> Scan Book (Barcode / RFID Wand)
          </h3>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              ref={scanRef}
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void handleScan(); }}
              placeholder="Scan or enter accession number..."
              className="flex-1 text-sm border border-slate-200 rounded-lg px-4 py-2.5 font-mono focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              autoFocus
            />
            <select value={scanMethod} onChange={(e) => setScanMethod(e.target.value as typeof scanMethod)} className="text-xs border rounded-lg px-3 py-2">
              <option value="BARCODE">Barcode</option>
              <option value="RFID">RFID</option>
              <option value="MANUAL">Manual</option>
            </select>
            <label className="flex items-center gap-1.5 text-xs text-slate-600 px-2">
              <input type="checkbox" checked={markDamaged} onChange={(e) => setMarkDamaged(e.target.checked)} />
              Damaged
            </label>
            <button type="button" onClick={() => void handleScan()} className="px-4 py-2 bg-teal-600 text-white text-sm font-semibold rounded-lg">
              Scan
            </button>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4 flex-1 min-h-0">
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col min-h-[360px]">
          <h3 className="text-sm font-bold text-slate-800 mb-3">Real-time Scan Log</h3>
          <div className="flex-1 overflow-y-auto space-y-1 max-h-[400px]">
            {(data?.scanLog ?? []).map((s) => (
              <div key={s.id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-slate-50 text-xs border border-slate-50">
                <span className="font-mono text-[10px] text-slate-500 w-24 shrink-0">{s.accessionNo}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 truncate">{s.bookTitle}</p>
                  <p className="text-[10px] text-slate-400">{s.scanMethod} · {new Date(s.scannedAt).toLocaleTimeString()}</p>
                </div>
                <StatusBadge status={s.discrepancyType === 'NONE' ? 'COMPLETED' : 'ACTIVE'} />
              </div>
            ))}
            {!data?.scanLog.length && <p className="text-xs text-slate-400 text-center py-8">No scans yet</p>}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col min-h-[360px]">
          <h3 className="text-sm font-bold text-slate-800 mb-3">Discrepancy Matrix</h3>
          <FeeTabs tabs={[...DISCREPANCY_TABS]} active={tab} onChange={setTab} />
          <div className="flex-1 overflow-y-auto mt-3 space-y-2 max-h-[340px]">
            {tabScans.map((s) => (
              <div key={s.id} className="p-2 border border-slate-100 rounded-lg text-xs">
                <div className="flex justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-800">{s.bookTitle}</p>
                    <p className="font-mono text-[10px] text-slate-500">{s.accessionNo}</p>
                    {s.expectedLocation && <p className="text-[10px] text-slate-500">Expected: {s.expectedLocation}</p>}
                    {s.issueStatus && <p className="text-[10px] text-blue-600">Was: {s.issueStatus}</p>}
                  </div>
                  <DiscrepancyActions scan={s} onResolve={handleResolve} />
                </div>
              </div>
            ))}
            {!tabScans.length && <p className="text-xs text-slate-400 text-center py-8">No {tab.toLowerCase()} items</p>}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
            <FileText size={14} /> Reports
          </h3>
          <ul className="text-xs text-slate-600 space-y-1">
            {(data?.reports ?? []).map((r) => <li key={r}>· {r}</li>)}
          </ul>
          <p className="text-[10px] text-slate-400 mt-2">{data?.financeIntegration}</p>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-xs text-amber-900">
          <p className="font-semibold flex items-center gap-1"><Bell size={14} /> Automation & Alerts</p>
          <ul className="mt-2 space-y-1">
            {(data?.automationRules ?? []).map((r) => <li key={r}>· {r}</li>)}
          </ul>
          <p className="mt-2 text-amber-700">Admin alert threshold: {data?.highLossThresholdFormatted}</p>
          <p className="text-amber-600 mt-1">Mobile: {data?.mobileSync.join(', ')}</p>
        </div>
      </div>

      <AcademicModal open={startModal} onClose={() => setStartModal(false)} title="Initiate Audit Session">
        <div className="space-y-3">
          <label className="block space-y-1">
            <span className="text-xs font-semibold">Scanned By *</span>
            <input value={scannedBy} onChange={(e) => setScannedBy(e.target.value)} className="w-full text-sm border rounded-lg px-3 py-2" />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold">Target Rack *</span>
            <select value={targetRackId} onChange={(e) => { setTargetRackId(e.target.value); setTargetShelfId(''); }} className="w-full text-sm border rounded-lg px-3 py-2">
              {(data?.rackOptions ?? []).map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold">Target Shelf (optional)</span>
            <select value={targetShelfId} onChange={(e) => setTargetShelfId(e.target.value)} className="w-full text-sm border rounded-lg px-3 py-2">
              <option value="">— Entire rack —</option>
              {(data?.shelfOptions ?? []).filter((s) => s.rackId === targetRackId).map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </label>
          <button type="button" onClick={() => void handleStart()} className="w-full py-2 bg-teal-600 text-white text-sm font-semibold rounded-lg">
            Start Audit Session
          </button>
        </div>
      </AcademicModal>
    </div>
  );
}
