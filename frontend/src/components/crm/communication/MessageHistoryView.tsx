import { useCallback, useEffect, useState } from 'react';
import {
  History, RefreshCw, Search, Download, Shield, Lock,
  Eye, X, ChevronLeft, ChevronRight, AlertTriangle, FileJson,
} from 'lucide-react';
import {
  fetchMessageHistory,
  fetchMessageAuditDetail,
  exportMessageHistory,
  type MessageHistoryManagement,
  type MessageAuditLog,
  type MessageAuditDetail,
} from '../../../lib/communicationServices';
import { AcademicLoading, FeeMessage } from '../FeeFinanceManagement/FeeFinanceUi';

const ROLE_OPTIONS = ['Super Admin', 'IT Administrator', 'Admin', 'Helpdesk', 'Reception', 'Communication Manager'];

const STATUS_BADGE: Record<string, string> = {
  SUCCESS: 'bg-green-100 text-green-800 border-green-200',
  FAILED: 'bg-red-100 text-red-700 border-red-200',
  PENDING: 'bg-amber-100 text-amber-800 border-amber-200',
};

const CHANNEL_STYLE: Record<string, string> = {
  SMS: 'text-blue-700 bg-blue-50',
  EMAIL: 'text-orange-700 bg-orange-50',
  WHATSAPP: 'text-emerald-700 bg-emerald-50',
  PUSH: 'text-purple-700 bg-purple-50',
};

function formatTs(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

export function MessageHistoryView() {
  const [data, setData] = useState<MessageHistoryManagement | null>(null);
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [userRole, setUserRole] = useState('Super Admin');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [page, setPage] = useState(1);

  const [channel, setChannel] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [direction, setDirection] = useState('ALL');
  const [contact, setContact] = useState('');
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [studentName, setStudentName] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [payloadLog, setPayloadLog] = useState<MessageAuditDetail | null>(null);
  const [payloadLoading, setPayloadLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async (seed = false, targetPage = page) => {
    setLoading(true);
    try {
      const result = await fetchMessageHistory({
        seed,
        academicYear,
        role: userRole,
        channel,
        status,
        direction,
        contact: contact.trim() || undefined,
        admissionNumber: admissionNumber.trim() || undefined,
        studentName: studentName.trim() || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        page: targetPage,
        limit: 25,
      });
      setData(result);
      setPage(targetPage);
    } finally {
      setLoading(false);
    }
  }, [academicYear, userRole, channel, status, direction, contact, admissionNumber, studentName, dateFrom, dateTo, page]);

  useEffect(() => { void load(true, 1); }, [academicYear, userRole]);

  const flash = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 7000);
  };

  const handleSearch = () => {
    if (data?.permissions.helpdeskRequiresStudent && !admissionNumber.trim() && !studentName.trim() && !contact.trim()) {
      flash('Helpdesk users must search by admission number, student name, or parent contact.', 'error');
      return;
    }
    void load(false, 1);
  };

  const handleViewPayload = async (log: MessageAuditLog) => {
    setPayloadLoading(true);
    try {
      const detail = await fetchMessageAuditDetail(log.id, userRole);
      setPayloadLog(detail);
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Failed to load payload', 'error');
    } finally {
      setPayloadLoading(false);
    }
  };

  const handleExport = async () => {
    if (!data?.permissions.canExport) {
      flash('Export permission denied for your role.', 'error');
      return;
    }
    setExporting(true);
    try {
      const result = await exportMessageHistory({
        academicYear,
        role: userRole,
        channel,
        status,
        direction,
        contact: contact.trim() || undefined,
        admissionNumber: admissionNumber.trim() || undefined,
        studentName: studentName.trim() || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      const blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      a.click();
      URL.revokeObjectURL(url);
      flash(result.message, 'success');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Export failed', 'error');
    } finally {
      setExporting(false);
    }
  };

  if (loading && !data) return <AcademicLoading label="Loading message history & audit logs…" />;

  const perms = data?.permissions;
  const pagination = data?.pagination;

  return (
    <div className="flex flex-col space-y-4 h-full relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <History size={22} className="text-slate-600" />
            Message History &amp; Audit Logs
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable audit trail — outbound &amp; inbound communications ({data?.permissions.retentionYears ?? 5}-year retention)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white"
          >
            {(data?.academicYears ?? ['2025-26']).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select
            value={userRole}
            onChange={(e) => setUserRole(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white"
          >
            {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <button
            type="button"
            onClick={() => void load()}
            className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
          >
            <RefreshCw size={12} /> Refresh
          </button>
          {perms?.canExport && (
            <button
              type="button"
              disabled={exporting}
              onClick={() => void handleExport()}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-slate-800 text-white hover:bg-slate-900 disabled:opacity-50"
            >
              <Download size={12} /> {exporting ? 'Exporting…' : 'Export CSV'}
            </button>
          )}
        </div>
      </div>

      {message && <FeeMessage message={message} type={messageType} />}

      <div className="flex items-start gap-2 p-3 rounded-lg bg-slate-50 border border-slate-200 text-[10px] text-slate-600">
        <Lock size={14} className="text-slate-500 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-slate-700">Immutable compliance record — </span>
          logs cannot be edited or deleted by any user. Retained for minimum {data?.permissions.retentionYears ?? 5} years.
        </div>
      </div>

      {perms?.helpdeskRequiresStudent && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-[10px] text-amber-800">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          Helpdesk mode: search by student admission number, student name, or parent phone/email to answer parent queries.
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: 'Total Logs', value: data?.kpis.totalLogs ?? 0 },
          { label: 'This Search', value: data?.kpis.pageTotal ?? 0 },
          { label: 'Delivered', value: data?.kpis.successCount ?? 0, color: 'text-green-600' },
          { label: 'Failed', value: data?.kpis.failedCount ?? 0, color: 'text-red-600' },
          { label: 'Queued', value: data?.kpis.queuedCount ?? 0, color: 'text-amber-600' },
          { label: 'Inbound', value: data?.kpis.inboundCount ?? 0, color: 'text-blue-600' },
          ...(perms?.canViewCosts ? [{ label: 'Total Cost', value: `₹${(data?.kpis.totalCost ?? 0).toFixed(2)}`, color: 'text-slate-800' }] : []),
        ].map((k) => (
          <div key={k.label} className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
            <p className="text-[9px] text-slate-500 font-medium">{k.label}</p>
            <p className={`text-lg font-bold ${k.color ?? 'text-slate-800'}`}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
          <Search size={14} /> Advanced Search
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          <div>
            <label className="text-[9px] font-medium text-slate-500 block mb-1">Phone / Email</label>
            <input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="9876543210 or email"
              className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5"
            />
          </div>
          <div>
            <label className="text-[9px] font-medium text-slate-500 block mb-1">Admission No.</label>
            <input
              value={admissionNumber}
              onChange={(e) => setAdmissionNumber(e.target.value)}
              placeholder="ADM-2024-001"
              className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5"
            />
          </div>
          <div>
            <label className="text-[9px] font-medium text-slate-500 block mb-1">Student Name</label>
            <input
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="Student name"
              className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5"
            />
          </div>
          <div>
            <label className="text-[9px] font-medium text-slate-500 block mb-1">Channel</label>
            <select value={channel} onChange={(e) => setChannel(e.target.value)} className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5">
              {(data?.channelOptions ?? ['ALL']).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[9px] font-medium text-slate-500 block mb-1">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5">
              {(data?.statusOptions ?? ['ALL']).map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[9px] font-medium text-slate-500 block mb-1">Direction</label>
            <select value={direction} onChange={(e) => setDirection(e.target.value)} className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5">
              {(data?.directionOptions ?? ['ALL']).map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[9px] font-medium text-slate-500 block mb-1">Date From</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5" />
          </div>
          <div>
            <label className="text-[9px] font-medium text-slate-500 block mb-1">Date To</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5" />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={handleSearch}
              className="w-full flex items-center justify-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              <Search size={12} /> Search
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-3 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">Communication Audit Grid</h3>
          <span className="text-[10px] text-slate-500">
            {pagination?.total ?? 0} record(s) · page {pagination?.page ?? 1} of {pagination?.totalPages ?? 1}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead className="bg-slate-50">
              <tr className="text-slate-500 border-b border-slate-200">
                <th className="px-3 py-2 text-left font-medium">Timestamp</th>
                <th className="px-3 py-2 text-left font-medium">Channel</th>
                <th className="px-3 py-2 text-left font-medium">Sender</th>
                <th className="px-3 py-2 text-left font-medium">Recipient</th>
                <th className="px-3 py-2 text-left font-medium">Contact</th>
                <th className="px-3 py-2 text-left font-medium min-w-[160px]">Message Snippet</th>
                <th className="px-3 py-2 text-center font-medium">Status</th>
                {perms?.canViewCosts && <th className="px-3 py-2 text-right font-medium">Cost</th>}
                <th className="px-3 py-2 text-center font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr><td colSpan={perms?.canViewCosts ? 9 : 8} className="px-3 py-8 text-center text-slate-400">Loading…</td></tr>
              )}
              {!loading && (data?.logs ?? []).length === 0 && (
                <tr><td colSpan={perms?.canViewCosts ? 9 : 8} className="px-3 py-8 text-center text-slate-400">No audit logs match your search criteria.</td></tr>
              )}
              {(data?.logs ?? []).map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{formatTs(log.timestamp)}</td>
                  <td className="px-3 py-2">
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${CHANNEL_STYLE[log.channel] ?? 'bg-slate-100'}`}>
                      {log.channel}
                    </span>
                    {log.direction === 'INBOUND' && (
                      <span className="ml-1 text-[7px] text-blue-600 font-bold">IN</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-slate-700 truncate max-w-[90px]">{log.sender}</td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-slate-800">{log.recipientName}</div>
                    {log.studentName && (
                      <div className="text-[9px] text-slate-400">{log.studentName} · {log.admissionNumber}</div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-slate-600 font-mono text-[9px]">{log.contactIdentifier}</td>
                  <td className="px-3 py-2 text-slate-600 truncate max-w-[200px]" title={log.messageSnippet}>{log.messageSnippet}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${STATUS_BADGE[log.statusBucket] ?? 'bg-slate-100'}`}>
                      {log.status}
                    </span>
                  </td>
                  {perms?.canViewCosts && (
                    <td className="px-3 py-2 text-right font-mono text-slate-700">{log.costLabel}</td>
                  )}
                  <td className="px-3 py-2 text-center">
                    {perms?.canViewPayload && (
                      <button
                        type="button"
                        disabled={payloadLoading}
                        onClick={() => void handleViewPayload(log)}
                        className="inline-flex items-center gap-1 text-[9px] px-2 py-1 rounded border border-slate-200 hover:bg-slate-50 text-blue-600"
                      >
                        <Eye size={10} /> Payload
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-3 py-2 border-t border-slate-100">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => void load(false, page - 1)}
              className="flex items-center gap-1 text-[10px] px-2 py-1 rounded border border-slate-200 disabled:opacity-40"
            >
              <ChevronLeft size={12} /> Previous
            </button>
            <span className="text-[10px] text-slate-500">Page {pagination.page} of {pagination.totalPages}</span>
            <button
              type="button"
              disabled={page >= pagination.totalPages}
              onClick={() => void load(false, page + 1)}
              className="flex items-center gap-1 text-[10px] px-2 py-1 rounded border border-slate-200 disabled:opacity-40"
            >
              Next <ChevronRight size={12} />
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
          <Shield size={14} className="text-green-600" /> Compliance Notes
        </h3>
        <ul className="space-y-1">
          {(data?.complianceNotes ?? []).map((note) => (
            <li key={note} className="text-[10px] text-slate-600 flex items-start gap-2">
              <span className="text-green-500 shrink-0">•</span>
              {note}
            </li>
          ))}
        </ul>
      </div>

      {payloadLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 sticky top-0 bg-white">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <FileJson size={16} className="text-blue-600" />
                Full Payload — {payloadLog.log.logRef}
              </h3>
              <button type="button" onClick={() => setPayloadLog(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 border border-red-100 text-[10px] text-red-700">
                <Lock size={12} />
                {payloadLog.compliance.message}
              </div>

              <div className="grid grid-cols-2 gap-3 text-[10px]">
                <div><span className="text-slate-500">Status:</span> <span className="font-bold">{payloadLog.log.status}</span></div>
                <div><span className="text-slate-500">Channel:</span> {payloadLog.log.channel}</div>
                <div><span className="text-slate-500">Contact:</span> <span className="font-mono">{payloadLog.log.contactIdentifierFull}</span></div>
                <div><span className="text-slate-500">Retained until:</span> {formatTs(payloadLog.log.retainedUntil)}</div>
                {payloadLog.log.errorDetail && (
                  <div className="col-span-2 text-red-700">
                    <span className="text-slate-500">Error:</span> {payloadLog.log.errorDetail}
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-[10px] font-bold text-slate-700 mb-1">Gateway Request Payload (JSON)</h4>
                <pre className="text-[9px] bg-slate-900 text-green-400 p-3 rounded-lg overflow-x-auto font-mono">
                  {JSON.stringify(payloadLog.log.gatewayPayload, null, 2)}
                </pre>
              </div>

              <div>
                <h4 className="text-[10px] font-bold text-slate-700 mb-1">Gateway Response / Raw Error (JSON)</h4>
                <pre className="text-[9px] bg-slate-900 text-amber-300 p-3 rounded-lg overflow-x-auto font-mono">
                  {JSON.stringify(payloadLog.log.gatewayResponse, null, 2)}
                </pre>
              </div>

              <div>
                <h4 className="text-[10px] font-bold text-slate-700 mb-1">Message Snippet</h4>
                <p className="text-[10px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-200">{payloadLog.log.messageSnippet}</p>
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setPayloadLog(null)}
                className="text-xs px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
