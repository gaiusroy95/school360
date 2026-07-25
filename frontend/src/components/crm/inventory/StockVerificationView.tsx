import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ClipboardCheck, ScanBarcode, RefreshCw, Play, CheckCircle2, AlertTriangle,
  Snowflake, FileText, Package, Lock, Unlock,
} from 'lucide-react';
import {
  fetchInventoryStockVerification,
  createInventoryAuditSession,
  freezeInventoryAuditSession,
  scanInventoryAuditItem,
  recordInventoryAuditCount,
  generateInventoryVarianceReport,
  approveInventoryAuditVariances,
  createInventoryAuditAdjustments,
  completeInventoryAuditSession,
  cancelInventoryAuditSession,
  type InventoryStockVerification,
  type InvAuditSession,
} from '../../../lib/inventoryServices';
import { AcademicLoading, AcademicModal, FeeMessage, StatusBadge } from '../FeeFinanceManagement/FeeFinanceUi';

const STATUS_STYLE: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  FROZEN: 'bg-cyan-100 text-cyan-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  VARIANCE_REVIEW: 'bg-amber-100 text-amber-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-700',
};

export function StockVerificationView() {
  const [data, setData] = useState<InventoryStockVerification | null>(null);
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [scanInput, setScanInput] = useState('');
  const [scanMethod, setScanMethod] = useState<'BARCODE' | 'MOBILE' | 'MANUAL'>('BARCODE');
  const [scannedBy, setScannedBy] = useState('Store Keeper');
  const [startModal, setStartModal] = useState(false);
  const [newStoreId, setNewStoreId] = useState('');
  const [newSessionType, setNewSessionType] = useState('CYCLIC');
  const [manualItemId, setManualItemId] = useState('');
  const [manualQty, setManualQty] = useState('');
  const [viewTab, setViewTab] = useState<'counts' | 'variances'>('counts');
  const scanRef = useRef<HTMLInputElement>(null);

  const session: InvAuditSession | null = data?.focusSession ?? data?.activeSession ?? null;

  const load = useCallback(async (seed = false, sessionId?: string) => {
    setLoading(true);
    try {
      const result = await fetchInventoryStockVerification(seed, academicYear, sessionId);
      setData(result);
      if (!newStoreId && result.stores[0]) setNewStoreId(result.stores[0].id);
    } finally {
      setLoading(false);
    }
  }, [academicYear, newStoreId]);

  useEffect(() => { void load(true); }, []);

  useEffect(() => {
    if (session?.status === 'VARIANCE_REVIEW') setViewTab('variances');
  }, [session?.id, session?.status]);

  const flash = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 6000);
  };

  const applyData = (result: { data?: InventoryStockVerification; message?: string }, type: 'success' | 'error' = 'success') => {
    if (result.data) setData(result.data);
    if (result.message) flash(result.message, type);
  };

  const handleStart = async () => {
    try {
      const result = await createInventoryAuditSession({
        storeId: newStoreId,
        sessionType: newSessionType,
        academicYear,
        initiatedBy: scannedBy,
      });
      applyData(result);
      setStartModal(false);
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Failed to create session', 'error');
    }
  };

  const handleFreeze = async () => {
    if (!session) return;
    try {
      const result = await freezeInventoryAuditSession(session.id, scannedBy);
      applyData(result);
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Failed to freeze store', 'error');
    }
  };

  const handleScan = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!session || !scanInput.trim()) return;
    try {
      const result = await scanInventoryAuditItem(session.id, {
        code: scanInput.trim(),
        scannedBy,
        scanMethod,
      });
      applyData(result);
      setScanInput('');
      scanRef.current?.focus();
    } catch (err) {
      flash(err instanceof Error ? err.message : 'Scan failed', 'error');
    }
  };

  const handleManualCount = async () => {
    if (!session || !manualItemId || manualQty === '') return;
    try {
      const result = await recordInventoryAuditCount(session.id, {
        itemId: manualItemId,
        physicalQty: Number(manualQty),
        scannedBy,
        scanMethod: 'MANUAL',
      });
      applyData(result);
      setManualQty('');
    } catch (err) {
      flash(err instanceof Error ? err.message : 'Count failed', 'error');
    }
  };

  const handleVariance = async () => {
    if (!session) return;
    try {
      const result = await generateInventoryVarianceReport(session.id);
      applyData(result);
    } catch (err) {
      flash(err instanceof Error ? err.message : 'Failed to generate report', 'error');
    }
  };

  const handleApprove = async () => {
    if (!session) return;
    try {
      const result = await approveInventoryAuditVariances(session.id, { approvedBy: scannedBy });
      applyData(result);
    } catch (err) {
      flash(err instanceof Error ? err.message : 'Approval failed', 'error');
    }
  };

  const handleAdjustments = async () => {
    if (!session) return;
    try {
      const result = await createInventoryAuditAdjustments(session.id, scannedBy);
      applyData(result);
    } catch (err) {
      flash(err instanceof Error ? err.message : 'Adjustment failed', 'error');
    }
  };

  const handleComplete = async () => {
    if (!session) return;
    try {
      const result = await completeInventoryAuditSession(session.id, scannedBy);
      applyData(result);
    } catch (err) {
      flash(err instanceof Error ? err.message : 'Complete failed', 'error');
    }
  };

  const handleCancel = async () => {
    if (!session || !confirm('Cancel this audit session and unfreeze the store?')) return;
    try {
      const result = await cancelInventoryAuditSession(session.id, scannedBy);
      applyData(result);
    } catch (err) {
      flash(err instanceof Error ? err.message : 'Cancel failed', 'error');
    }
  };

  if (loading && !data) return <AcademicLoading label="Loading stock verification…" />;

  const counts = session?.counts ?? [];
  const variances = session?.variances ?? [];
  const varianceOnly = counts.filter((c) => c.variance !== 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-indigo-600" />
            Stock Verification
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cyclic / annual physical inventory — freeze store, scan items, approve variances, auto-adjust stock
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5"
          >
            {(data?.academicYears ?? ['2025-26']).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <input
            value={scannedBy}
            onChange={(e) => setScannedBy(e.target.value)}
            placeholder="Auditor name"
            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 w-32"
          />
          <button
            type="button"
            onClick={() => void load(false, session?.id)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          {!session && (
            <button
              type="button"
              onClick={() => setStartModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              <Play className="w-3.5 h-3.5" /> Start Audit
            </button>
          )}
        </div>
      </div>

      {message && <FeeMessage message={message} type={messageType} />}

      {/* Workflow strip */}
      <div className="bg-white border border-slate-200 rounded-xl p-3">
        <div className="flex flex-wrap gap-1 text-[10px]">
          {(data?.workflow ?? []).map((step, i) => (
            <span key={step} className="flex items-center gap-1">
              <span className="px-2 py-0.5 bg-slate-100 rounded font-medium text-slate-600">{i + 1}. {step}</span>
              {i < (data?.workflow.length ?? 0) - 1 && <span className="text-slate-300">→</span>}
            </span>
          ))}
        </div>
      </div>

      {/* Frozen stores alert */}
      {(data?.frozenStores?.length ?? 0) > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-cyan-50 border border-cyan-200 rounded-lg text-xs text-cyan-800">
          <Lock className="w-4 h-4 shrink-0" />
          Store operations frozen: {data!.frozenStores.map((f) => f.sessionCode).join(', ')}
        </div>
      )}

      {session ? (
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Session panel */}
          <div className="lg:col-span-1 space-y-3">
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-500">Session</p>
                  <p className="font-bold text-slate-800">{session.sessionCode}</p>
                  <p className="text-xs text-slate-500">{session.storeName} · {session.sessionTypeLabel}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLE[session.status] ?? 'bg-slate-100'}`}>
                  {session.statusLabel}
                </span>
              </div>

              {session.storeFrozen && (
                <div className="flex items-center gap-2 text-xs text-cyan-700 bg-cyan-50 rounded-lg px-2 py-1.5">
                  <Snowflake className="w-3.5 h-3.5" /> Store frozen — GRN / outward / transfer blocked
                </div>
              )}

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-500">Count progress</span>
                  <span className="font-semibold">{session.itemsCounted} / {session.totalItems} ({session.progress}%)</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${session.progress}%` }} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-slate-50 rounded-lg p-2">
                  <p className="text-lg font-bold text-slate-800">{session.varianceLines}</p>
                  <p className="text-[10px] text-slate-500">Variances</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-2">
                  <p className="text-lg font-bold text-amber-700">{session.totalVarianceValueFormatted}</p>
                  <p className="text-[10px] text-slate-500">Value impact</p>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                {session.canFreeze && (
                  <button type="button" onClick={() => void handleFreeze()}
                    className="w-full flex items-center justify-center gap-1 px-3 py-2 text-xs font-semibold bg-cyan-600 text-white rounded-lg hover:bg-cyan-700">
                    <Snowflake className="w-3.5 h-3.5" /> Freeze Store
                  </button>
                )}
                {session.canGenerateVariance && (
                  <button type="button" onClick={() => void handleVariance()}
                    className="w-full flex items-center justify-center gap-1 px-3 py-2 text-xs font-semibold bg-amber-600 text-white rounded-lg hover:bg-amber-700">
                    <FileText className="w-3.5 h-3.5" /> Generate Variance Report
                  </button>
                )}
                {session.canApproveVariances && (
                  <button type="button" onClick={() => void handleApprove()}
                    className="w-full flex items-center justify-center gap-1 px-3 py-2 text-xs font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Approve All Variances
                  </button>
                )}
                {session.canCreateAdjustments && (
                  <button type="button" onClick={() => void handleAdjustments()}
                    className="w-full flex items-center justify-center gap-1 px-3 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                    <Package className="w-3.5 h-3.5" /> Auto-create Adjustments
                  </button>
                )}
                {session.canComplete && (
                  <button type="button" onClick={() => void handleComplete()}
                    className="w-full flex items-center justify-center gap-1 px-3 py-2 text-xs font-semibold bg-green-700 text-white rounded-lg hover:bg-green-800">
                    <Unlock className="w-3.5 h-3.5" /> Complete Session
                  </button>
                )}
                {session.canCancel && (
                  <button type="button" onClick={() => void handleCancel()}
                    className="w-full px-3 py-2 text-xs font-semibold border border-red-200 text-red-600 rounded-lg hover:bg-red-50">
                    Cancel Session
                  </button>
                )}
              </div>

              {session.adjustmentId && (
                <p className="text-[10px] text-green-700 bg-green-50 rounded px-2 py-1">
                  Adjustment linked — stock ledger updated
                </p>
              )}
            </div>

            {/* Scanner */}
            {session.canCount && (
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <ScanBarcode className="w-4 h-4" /> Mobile / Barcode Scan
                </h3>
                <select
                  value={scanMethod}
                  onChange={(e) => setScanMethod(e.target.value as typeof scanMethod)}
                  className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5"
                >
                  {(data?.scanMethods ?? ['BARCODE']).map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <form onSubmit={(e) => void handleScan(e)} className="flex gap-1">
                  <input
                    ref={scanRef}
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    placeholder="Scan barcode / QR…"
                    className="flex-1 text-xs border border-slate-200 rounded-lg px-2 py-1.5 font-mono"
                    autoFocus
                  />
                  <button type="submit" className="px-3 py-1.5 text-xs font-semibold bg-slate-800 text-white rounded-lg">
                    Scan
                  </button>
                </form>
                <p className="text-[10px] text-slate-400">Each scan increments physical qty by 1</p>

                <div className="border-t border-slate-100 pt-3 space-y-2">
                  <p className="text-[10px] font-semibold text-slate-500">Manual count (set absolute qty)</p>
                  <select
                    value={manualItemId}
                    onChange={(e) => setManualItemId(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5"
                  >
                    <option value="">Select item…</option>
                    {counts.map((c) => (
                      <option key={c.id} value={c.itemId}>
                        {c.itemName} (sys: {c.systemQty})
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-1">
                    <input
                      type="number"
                      min={0}
                      value={manualQty}
                      onChange={(e) => setManualQty(e.target.value)}
                      placeholder="Physical qty"
                      className="flex-1 text-xs border border-slate-200 rounded-lg px-2 py-1.5"
                    />
                    <button type="button" onClick={() => void handleManualCount()}
                      className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-slate-50">
                      Set
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Counts / variances table */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="flex border-b border-slate-200">
              <button
                type="button"
                onClick={() => setViewTab('counts')}
                className={`px-4 py-2 text-xs font-semibold ${viewTab === 'counts' ? 'border-b-2 border-indigo-600 text-indigo-700' : 'text-slate-500'}`}
              >
                All Counts ({counts.length})
              </button>
              <button
                type="button"
                onClick={() => setViewTab('variances')}
                className={`px-4 py-2 text-xs font-semibold ${viewTab === 'variances' ? 'border-b-2 border-amber-600 text-amber-700' : 'text-slate-500'}`}
              >
                Variances ({variances.length || varianceOnly.length})
              </button>
            </div>
            <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold text-slate-600">Item</th>
                    <th className="text-right px-3 py-2 font-semibold text-slate-600">System</th>
                    <th className="text-right px-3 py-2 font-semibold text-slate-600">Physical</th>
                    <th className="text-right px-3 py-2 font-semibold text-slate-600">Variance</th>
                    <th className="text-right px-3 py-2 font-semibold text-slate-600">Value</th>
                    {viewTab === 'variances' && <th className="text-center px-3 py-2 font-semibold text-slate-600">Status</th>}
                  </tr>
                </thead>
                <tbody>
                  {(viewTab === 'variances' ? (variances.length ? variances : varianceOnly) : counts).map((row) => {
                    const variance = 'varianceLabel' in row ? row.variance : row.variance;
                    const isVariance = variance !== 0;
                    return (
                      <tr key={row.id} className={`border-t border-slate-100 ${isVariance ? 'bg-amber-50/50' : ''}`}>
                        <td className="px-3 py-2">
                          <p className="font-medium text-slate-800">{row.itemName}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{row.sku}</p>
                        </td>
                        <td className="px-3 py-2 text-right font-mono">{row.systemQty}</td>
                        <td className="px-3 py-2 text-right font-mono">{row.physicalQty}</td>
                        <td className={`px-3 py-2 text-right font-mono font-semibold ${isVariance ? (variance > 0 ? 'text-green-700' : 'text-red-700') : 'text-slate-500'}`}>
                          {variance > 0 ? `+${variance}` : variance}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-600">
                          {'varianceValueFormatted' in row ? row.varianceValueFormatted : formatVarianceValue(row.varianceValue)}
                        </td>
                        {viewTab === 'variances' && 'status' in row && (
                          <td className="px-3 py-2 text-center">
                            <StatusBadge status={row.status === 'APPROVED' ? 'COMPLETED' : row.status === 'PENDING' ? 'ACTIVE' : 'INACTIVE'} />
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  {(viewTab === 'variances' ? variances.length || varianceOnly.length : counts.length) === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center text-slate-400">
                        {viewTab === 'variances' ? 'No variances yet — generate variance report after counting' : 'No items in audit scope'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <AlertTriangle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">No active audit session</p>
          <p className="text-xs text-slate-500 mt-1 mb-4">Start a cyclic or annual audit to begin physical inventory counting</p>
          <button
            type="button"
            onClick={() => setStartModal(true)}
            className="px-4 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Start Audit Session
          </button>
        </div>
      )}

      {/* Past sessions */}
      {(data?.sessions?.length ?? 0) > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-2 border-b border-slate-200 text-xs font-bold text-slate-700">Recent Sessions</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-3 py-2">Code</th>
                  <th className="text-left px-3 py-2">Store</th>
                  <th className="text-left px-3 py-2">Type</th>
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="text-right px-3 py-2">Items</th>
                  <th className="text-right px-3 py-2">Variances</th>
                  <th className="text-right px-3 py-2">Value</th>
                  <th className="text-center px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {data!.sessions.map((s) => (
                  <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2 font-mono font-semibold">{s.sessionCode}</td>
                    <td className="px-3 py-2">{s.storeName}</td>
                    <td className="px-3 py-2">{s.sessionTypeLabel}</td>
                    <td className="px-3 py-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLE[s.status] ?? ''}`}>
                        {s.statusLabel}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">{s.itemsCounted}/{s.totalItems}</td>
                    <td className="px-3 py-2 text-right">{s.varianceLines}</td>
                    <td className="px-3 py-2 text-right">{s.totalVarianceValueFormatted}</td>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => void load(false, s.id)}
                        className="text-indigo-600 hover:underline font-semibold"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AcademicModal open={startModal} onClose={() => setStartModal(false)} title="Start Audit Session">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-600">Store</label>
            <select
              value={newStoreId}
              onChange={(e) => setNewStoreId(e.target.value)}
              className="w-full mt-1 text-sm border border-slate-200 rounded-lg px-3 py-2"
            >
              {(data?.stores ?? []).map((s) => (
                <option key={s.id} value={s.id}>{s.storeName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Audit Type</label>
            <select
              value={newSessionType}
              onChange={(e) => setNewSessionType(e.target.value)}
              className="w-full mt-1 text-sm border border-slate-200 rounded-lg px-3 py-2"
            >
              {(data?.sessionTypes ?? []).map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => void handleStart()}
            className="w-full py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Create Session
          </button>
        </div>
      </AcademicModal>
    </div>
  );
}

function formatVarianceValue(v: number) {
  return `₹ ${Math.round(Math.abs(v)).toLocaleString('en-IN')}`;
}
