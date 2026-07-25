import { useCallback, useEffect, useState } from 'react';
import {
  FileText, RefreshCw, Plus, Send, Eye, CheckCircle2, Clock,
  AlertTriangle, FileCheck, PenLine, Bell, X,
} from 'lucide-react';
import {
  fetchCircularsManagement,
  fetchCircularDetail,
  createCircularDraft,
  publishCircular,
  resendCircularReminders,
  type CircularsManagement,
  type CircularDetail,
} from '../../../lib/communicationServices';
import { AcademicLoading, FeeMessage } from '../FeeFinanceManagement/FeeFinanceUi';

const ROLE_OPTIONS = ['Super Admin', 'Principal', 'Communication Manager'];
const STATUS_STYLE: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  PUBLISHED: 'bg-green-100 text-green-800',
  ARCHIVED: 'bg-amber-100 text-amber-800',
  PENDING: 'bg-amber-100 text-amber-800',
  VIEWED: 'bg-blue-100 text-blue-800',
  ACKNOWLEDGED: 'bg-purple-100 text-purple-800',
};

export function CircularsNoticesView() {
  const [data, setData] = useState<CircularsManagement | null>(null);
  const [detail, setDetail] = useState<CircularDetail | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [userRole, setUserRole] = useState('Communication Manager');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [showCompose, setShowCompose] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [pdfUrl, setPdfUrl] = useState('https://school.example.com/docs/notice.pdf');
  const [pdfFileName, setPdfFileName] = useState('notice.pdf');
  const [audienceType, setAudienceType] = useState('ALL');
  const [classFilter, setClassFilter] = useState('');
  const [requireAck, setRequireAck] = useState(false);
  const [requireESign, setRequireESign] = useState(false);

  const load = useCallback(async (seed = false) => {
    setLoading(true);
    try {
      const result = await fetchCircularsManagement(seed, academicYear, userRole);
      setData(result);
    } finally {
      setLoading(false);
    }
  }, [academicYear, userRole]);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const result = await fetchCircularDetail(id);
      setDetail(result);
      setSelectedId(id);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const flash = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 7000);
  };

  const canManage = data?.permissions.canManage ?? false;
  const canPublish = data?.permissions.canPublish ?? false;

  const handleCreateDraft = async () => {
    if (!title.trim()) { flash('Title is required.', 'error'); return; }
    setSaving(true);
    try {
      const result = await createCircularDraft({
        title, body, pdfUrl, pdfFileName, pdfSize: 256000,
        audienceType, classFilter, requireAcknowledgment: requireAck,
        requireESignature: requireESign, academicYear, userRole,
      });
      setData(result.data);
      setShowCompose(false);
      setTitle(''); setBody('');
      flash(result.message, 'success');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async (id: string) => {
    try {
      const result = await publishCircular(id, { userRole, publishedBy: userRole, sendPush: true });
      setData(result.data);
      if (selectedId === id) await loadDetail(id);
      flash(result.message, 'success');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Publish failed', 'error');
    }
  };

  const handleResendReminders = async (id: string) => {
    try {
      const result = await resendCircularReminders(id, userRole);
      setData(result.data);
      setDetail(result.detail);
      flash(result.message, 'success');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Reminder failed', 'error');
    }
  };

  if (loading && !data) return <AcademicLoading label="Loading circulars & notices…" />;

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Circulars / Notices</h2>
          <p className="text-xs text-slate-500 mt-0.5">Official documents, PDF attachments, e-signatures &amp; acknowledgment tracking</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)}
            className="text-xs border border-slate-200 rounded px-2 py-1.5 bg-white">
            {(data?.academicYears ?? ['2025-26']).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={userRole} onChange={(e) => setUserRole(e.target.value)}
            className="text-xs border border-slate-200 rounded px-2 py-1.5 bg-white">
            {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <button type="button" onClick={() => void load(false)} className="p-1.5 border border-slate-200 rounded hover:bg-slate-50">
            <RefreshCw size={14} />
          </button>
          {canManage && (
            <button type="button" onClick={() => setShowCompose(true)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-purple-600 rounded-lg hover:bg-purple-700">
              <Plus size={12} /> New Circular
            </button>
          )}
        </div>
      </div>

      {message && <FeeMessage message={message} type={messageType} />}

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
        {[
          { label: 'Total Notices', value: data?.kpis.total ?? 0, color: 'text-slate-700' },
          { label: 'Published', value: data?.kpis.published ?? 0, color: 'text-green-600' },
          { label: 'Drafts', value: data?.kpis.drafts ?? 0, color: 'text-amber-600' },
          { label: 'Avg Ack Rate', value: `${data?.kpis.avgAckRate ?? 0}%`, color: 'text-purple-600' },
          { label: 'Pending Ack', value: data?.kpis.pendingAckTotal ?? 0, color: 'text-red-600' },
          { label: 'Mandatory', value: data?.kpis.requireAckCount ?? 0, color: 'text-indigo-600' },
        ].map((k) => (
          <div key={k.label} className="bg-white rounded-lg border border-slate-200 p-2 text-center">
            <div className={`text-lg font-bold ${k.color}`}>
              {typeof k.value === 'number' ? k.value.toLocaleString('en-IN') : k.value}
            </div>
            <div className="text-[10px] text-slate-500">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 flex-1 min-h-0">
        {/* List View */}
        <div className={`${selectedId ? 'xl:col-span-2' : 'xl:col-span-5'} bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col`}>
          <div className="px-3 py-2 border-b border-slate-100 flex items-center gap-2">
            <FileText size={14} className="text-purple-600" />
            <span className="text-xs font-bold text-slate-700">Notices List</span>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 font-bold text-slate-600">Title</th>
                  <th className="text-left px-3 py-2 font-bold text-slate-600">Published</th>
                  <th className="text-left px-3 py-2 font-bold text-slate-600">Audience</th>
                  <th className="text-right px-3 py-2 font-bold text-slate-600">Ack %</th>
                  <th className="text-left px-3 py-2 font-bold text-slate-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {(data?.circulars ?? []).map((c) => (
                  <tr key={c.id}
                    onClick={() => void loadDetail(c.id)}
                    className={`border-b border-slate-50 hover:bg-purple-50/40 cursor-pointer ${selectedId === c.id ? 'bg-purple-50' : ''}`}>
                    <td className="px-3 py-2">
                      <div className="font-semibold text-slate-800 flex items-center gap-1">
                        {c.requireAcknowledgment && <AlertTriangle size={10} className="text-red-500 shrink-0" />}
                        {c.title}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <FileText size={9} /> {c.pdfFileName || 'No PDF'}
                        {c.pushSent && <Bell size={9} className="text-red-500 ml-1" />}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      {c.publishedDate ? new Date(c.publishedDate).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-bold">{c.audienceLabel}</span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      {c.status === 'PUBLISHED' ? (
                        <span className={`font-bold ${c.acknowledgmentRate >= 80 ? 'text-green-600' : c.acknowledgmentRate >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                          {c.acknowledgmentRate}%
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${STATUS_STYLE[c.status] ?? ''}`}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {(data?.circulars ?? []).length === 0 && (
                  <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-400">No circulars yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail View */}
        {selectedId && (
          <div className="xl:col-span-3 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            {detailLoading ? (
              <div className="p-8 text-center text-slate-400 text-xs">Loading detail…</div>
            ) : detail ? (
              <>
                <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileCheck size={14} className="text-purple-600 shrink-0" />
                    <span className="text-xs font-bold text-slate-700 truncate">{detail.circular.title}</span>
                  </div>
                  <button type="button" onClick={() => { setSelectedId(null); setDetail(null); }}
                    className="p-1 hover:bg-slate-100 rounded shrink-0">
                    <X size={14} />
                  </button>
                </div>

                <div className="p-3 border-b border-slate-100 space-y-2">
                  <p className="text-xs text-slate-600">{detail.detail.body}</p>
                  <div className="flex flex-wrap gap-2 text-[10px]">
                    <span className="px-2 py-0.5 rounded bg-slate-100">{detail.circular.audienceLabel}</span>
                    {detail.circular.requireAcknowledgment && (
                      <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 font-bold">Ack Required</span>
                    )}
                    {detail.circular.requireESignature && (
                      <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 font-bold flex items-center gap-0.5">
                        <PenLine size={9} /> E-Signature
                      </span>
                    )}
                    {detail.circular.pdfUrl && (
                      <a href={detail.circular.pdfUrl} target="_blank" rel="noreferrer"
                        className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 hover:underline">
                        PDF: {detail.circular.pdfFileName}
                      </a>
                    )}
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: 'Target', value: detail.summary.targetCount },
                      { label: 'Viewed', value: detail.summary.viewedCount },
                      { label: 'Acknowledged', value: detail.summary.acknowledgedCount },
                      { label: 'Ack Rate', value: `${detail.summary.acknowledgmentRate}%` },
                    ].map((k) => (
                      <div key={k.label} className="text-center bg-slate-50 rounded p-1.5">
                        <div className="text-sm font-bold text-slate-800">{k.value}</div>
                        <div className="text-[9px] text-slate-500">{k.label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {detail.circular.status === 'DRAFT' && canPublish && (
                      <button type="button" onClick={() => void handlePublish(detail.circular.id)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-green-600 rounded-lg hover:bg-green-700">
                        <Send size={12} /> Publish &amp; Push
                      </button>
                    )}
                    {detail.circular.status === 'PUBLISHED' && detail.summary.pendingCount > 0 && canPublish && (
                      <button type="button" onClick={() => void handleResendReminders(detail.circular.id)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold border border-amber-300 text-amber-800 bg-amber-50 rounded-lg hover:bg-amber-100">
                        <Bell size={12} /> Resend Reminder to Pending ({detail.summary.pendingCount})
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-0 flex-1 overflow-hidden min-h-[200px]">
                  <div className="border-r border-slate-100 overflow-y-auto">
                    <div className="px-3 py-1.5 bg-green-50 border-b border-green-100 flex items-center gap-1">
                      <CheckCircle2 size={12} className="text-green-600" />
                      <span className="text-[10px] font-bold text-green-800">Acknowledged ({detail.acknowledged.length})</span>
                    </div>
                    <div className="divide-y divide-slate-50">
                      {detail.acknowledged.map((a) => (
                        <div key={a.id} className="px-3 py-2 text-xs">
                          <div className="font-semibold text-slate-800">{a.accountName}</div>
                          <div className="text-[10px] text-slate-500">{a.accountRole}</div>
                          <div className="text-[10px] text-green-700 mt-0.5">
                            {a.acknowledgedAt ? new Date(a.acknowledgedAt).toLocaleString('en-IN') : '—'}
                          </div>
                          {a.eSignature && <div className="text-[10px] text-indigo-600 flex items-center gap-0.5"><PenLine size={9} /> {a.eSignature}</div>}
                          {a.ipAddress && <div className="text-[9px] text-slate-400">IP: {a.ipAddress}</div>}
                        </div>
                      ))}
                      {detail.acknowledged.length === 0 && (
                        <div className="px-3 py-4 text-center text-slate-400 text-[10px]">No acknowledgments yet.</div>
                      )}
                    </div>
                  </div>

                  <div className="overflow-y-auto">
                    <div className="px-3 py-1.5 bg-amber-50 border-b border-amber-100 flex items-center gap-1">
                      <Clock size={12} className="text-amber-600" />
                      <span className="text-[10px] font-bold text-amber-800">Pending ({detail.pending.length})</span>
                    </div>
                    <div className="divide-y divide-slate-50">
                      {detail.pending.map((a) => (
                        <div key={a.id} className="px-3 py-2 text-xs">
                          <div className="font-semibold text-slate-800">{a.accountName}</div>
                          <div className="text-[10px] text-slate-500">{a.accountRole}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`px-1 py-0.5 rounded text-[9px] font-bold ${STATUS_STYLE[a.status] ?? ''}`}>{a.status}</span>
                            {a.viewedAt && <span className="text-[9px] text-blue-600 flex items-center gap-0.5"><Eye size={9} /> Viewed</span>}
                            {a.reminderCount > 0 && <span className="text-[9px] text-amber-600">{a.reminderCount} reminder(s)</span>}
                          </div>
                        </div>
                      ))}
                      {detail.pending.length === 0 && (
                        <div className="px-3 py-4 text-center text-green-600 text-[10px] font-bold">All stakeholders acknowledged!</div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        )}
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">Draft New Circular</h3>
              <button type="button" onClick={() => setShowCompose(false)}><X size={16} /></button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Notice Title</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)}
                  className="w-full mt-0.5 text-xs border border-slate-200 rounded px-2 py-1.5" placeholder="e.g. Mandatory Safety Compliance Notice" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Body / Summary</label>
                <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3}
                  className="w-full mt-0.5 text-xs border border-slate-200 rounded px-2 py-1.5 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">PDF URL</label>
                  <input value={pdfUrl} onChange={(e) => setPdfUrl(e.target.value)}
                    className="w-full mt-0.5 text-xs border border-slate-200 rounded px-2 py-1.5" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">PDF Filename</label>
                  <input value={pdfFileName} onChange={(e) => setPdfFileName(e.target.value)}
                    className="w-full mt-0.5 text-xs border border-slate-200 rounded px-2 py-1.5" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Target Audience</label>
                <select value={audienceType} onChange={(e) => setAudienceType(e.target.value)}
                  className="w-full mt-0.5 text-xs border border-slate-200 rounded px-2 py-1.5 bg-white">
                  {(data?.audienceOptions ?? []).map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                </select>
              </div>
              {audienceType === 'CLASS' && (
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Class Filter</label>
                  <input value={classFilter} onChange={(e) => setClassFilter(e.target.value)}
                    className="w-full mt-0.5 text-xs border border-slate-200 rounded px-2 py-1.5" placeholder="10-A" />
                </div>
              )}
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={requireAck} onChange={(e) => setRequireAck(e.target.checked)} />
                  <span className="font-semibold text-slate-700">Require Acknowledgment (read receipt)</span>
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={requireESign} onChange={(e) => setRequireESign(e.target.checked)}
                    disabled={!requireAck} />
                  <span className="font-semibold text-slate-700">Require E-Signature (typed name)</span>
                </label>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowCompose(false)}
                  className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
                <button type="button" onClick={() => void handleCreateDraft()} disabled={saving}
                  className="flex-1 px-3 py-2 text-xs font-bold text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50">
                  {saving ? 'Saving…' : 'Save Draft'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Workflow */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-100 p-3">
        <div className="text-xs font-bold text-purple-800 mb-2">Publication Workflow</div>
        <div className="flex flex-wrap gap-2">
          {(data?.workflowSteps ?? []).map((step, i) => (
            <div key={step} className="flex items-center gap-1">
              <span className="text-[10px] bg-white border border-purple-200 rounded-full px-2 py-0.5 text-purple-700 font-medium">
                {i + 1}. {step}
              </span>
              {i < (data?.workflowSteps.length ?? 0) - 1 && <span className="text-purple-300">→</span>}
            </div>
          ))}
        </div>
        <ul className="mt-2 space-y-0.5">
          {(data?.complianceNotes ?? []).map((n) => (
            <li key={n} className="text-[10px] text-purple-700/80 flex items-start gap-1"><span>•</span> {n}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
