import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  MessageCircle,
  Zap,
  AlertTriangle,
  Plus,
  Loader2,
  AlertCircle,
  CheckCircle,
  X,
  Clock,
  User,
  Phone,
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import {
  fetchCounselingMeta,
  fetchCounselingQueue,
  fetchCounselingLead,
  logCounselingSession,
  type CounselingLead,
  type CounselingLog,
  type CounselingMeta,
  type CounselingSessionInput,
  type ActionIntent,
} from '../../../lib/counsellingServices';

type SortMode = 'followUpDue' | 'lastContacted';

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');
}

function formatDateTime(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatRelative(iso: string): string {
  if (!iso) return 'Never';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function sentimentClass(s: string) {
  if (s.includes('Highly Positive') || s === 'Positive') return 'text-emerald-600';
  if (s === 'Concerned' || s === 'Negative') return 'text-amber-600';
  return 'text-slate-600';
}

function engagementClass(s: string) {
  if (s.includes('Very Active') || s === 'Active') return 'text-indigo-600';
  if (s === 'Unresponsive') return 'text-red-500';
  return 'text-slate-600';
}

function riskClass(s: string) {
  return s && s !== 'None' ? 'text-amber-600' : 'text-emerald-600';
}

const EMPTY_META: CounselingMeta = {
  interactionTypes: ['Phone Call', 'Campus Visit', 'Email', 'WhatsApp', 'Virtual Meeting'],
  sentiments: ['Highly Positive', 'Positive', 'Neutral', 'Concerned', 'Negative'],
  engagementLevels: ['Very Active', 'Active', 'Passive', 'Unresponsive'],
  riskFactors: [
    'Distance/Transport',
    'High Fees',
    'Academic Competition',
    'Undecided',
    'Competitor School',
    'None',
  ],
  actionIntents: [
    'Needs Follow-up',
    'Schedule Interview',
    'Send Fee Details',
    'Mark as Lost',
    'Move to Application',
  ],
};

type SessionForm = CounselingSessionInput & { nextFollowUpDate: string; nextFollowUpTime: string };

function emptySessionForm(): SessionForm {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return {
    interactionType: 'Phone Call',
    sentiment: 'Neutral',
    engagement: 'Active',
    riskFactor: 'None',
    riskDetails: '',
    remarks: '',
    actionIntent: 'Needs Follow-up',
    nextFollowUpDate: tomorrow.toISOString().slice(0, 10),
    nextFollowUpTime: '10:00',
  };
}

function needsFollowUpDate(intent: string) {
  return intent === 'Needs Follow-up' || intent === 'Schedule Interview';
}

export function CounsellingView() {
  const { user } = useAuth();
  const counselorName = user?.displayName || user?.email || 'Counselor';

  const [meta, setMeta] = useState<CounselingMeta>(EMPTY_META);
  const [leads, setLeads] = useState<CounselingLead[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<CounselingLead | null>(null);
  const [logs, setLogs] = useState<CounselingLog[]>([]);
  const [sort, setSort] = useState<SortMode>('followUpDue');
  const [myLeadsOnly, setMyLeadsOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [sessionOpen, setSessionOpen] = useState(false);
  const [form, setForm] = useState<SessionForm>(emptySessionForm);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [metaRes, queueRes] = await Promise.all([
        fetchCounselingMeta(),
        fetchCounselingQueue({
          sort,
          assignedTo: myLeadsOnly ? counselorName : undefined,
        }),
      ]);
      setMeta(metaRes);
      setLeads(queueRes.leads);
      setSelectedId((prev) => {
        if (prev && queueRes.leads.some((l) => l.id === prev)) return prev;
        return queueRes.leads[0]?.id ?? null;
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load lead queue');
    } finally {
      setLoading(false);
    }
  }, [sort, myLeadsOnly, counselorName]);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await fetchCounselingLead(id);
      setSelectedLead(res.lead);
      setLogs(res.logs);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load lead profile');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  useEffect(() => {
    if (!successMsg) return;
    const t = setTimeout(() => setSuccessMsg(null), 3500);
    return () => clearTimeout(t);
  }, [successMsg]);

  const queueSubtitle = useMemo(() => {
    if (sort === 'lastContacted') return 'Sorted by last contacted';
    return 'Sorted by follow-up due';
  }, [sort]);

  const openSession = () => {
    setForm(emptySessionForm());
    setSessionOpen(true);
  };

  const buildNextFollowUpIso = (): string | undefined => {
    if (!form.nextFollowUpDate) return undefined;
    const [h, m] = (form.nextFollowUpTime || '10:00').split(':').map(Number);
    const d = new Date(form.nextFollowUpDate);
    d.setHours(h || 10, m || 0, 0, 0);
    return d.toISOString();
  };

  const handleSubmitSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    if (!form.remarks.trim()) {
      setErrorMsg('Counselor remarks are required');
      return;
    }

    const intent = form.actionIntent;
    const nextFollowUp = buildNextFollowUpIso();
    if (needsFollowUpDate(intent) && !nextFollowUp) {
      setErrorMsg('Next follow-up date is required for this action');
      return;
    }
    if (nextFollowUp && new Date(nextFollowUp).getTime() <= Date.now()) {
      setErrorMsg('Next follow-up must be in the future');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      const payload: CounselingSessionInput = {
        interactionType: form.interactionType,
        sentiment: form.sentiment,
        engagement: form.engagement,
        riskFactor: form.riskFactor,
        riskDetails: form.riskDetails?.trim() || undefined,
        remarks: form.remarks.trim(),
        actionIntent: form.actionIntent,
        counselorName,
        ...(nextFollowUp ? { nextFollowUp } : {}),
      };
      const res = await logCounselingSession(selectedId, payload);
      setSelectedLead(res.lead);
      setLogs(res.logs);
      setLeads((prev) =>
        prev.map((l) => (l.id === res.lead.id ? res.lead : l)).filter((l) => {
          if (res.lead.status === 'Converted' || res.lead.status === 'Not Interested') {
            return l.id !== res.lead.id;
          }
          return true;
        }),
      );
      setSuccessMsg('Counseling session logged successfully');
      setSessionOpen(false);
      await loadQueue();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to log session');
    } finally {
      setSubmitting(false);
    }
  };

  const lead = selectedLead;
  const showFollowUpFields =
    needsFollowUpDate(form.actionIntent) ||
    form.actionIntent === 'Send Fee Details' ||
    form.actionIntent === 'Needs Follow-up';

  return (
    <div className="h-full bg-slate-50 flex flex-col p-6 overflow-y-auto">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Counselling</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manual lead assessment — sentiment, engagement, and risk tracking
          </p>
        </div>
        <button
          type="button"
          disabled={!selectedId}
          onClick={openSession}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm flex items-center gap-2 self-start disabled:opacity-50"
        >
          <Plus size={16} /> Log New Counseling Session
        </button>
      </div>

      {(errorMsg || successMsg) && (
        <div
          className={`mb-4 px-4 py-3 rounded-lg text-sm flex items-center gap-2 ${
            errorMsg ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'
          }`}
        >
          {errorMsg ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
          {errorMsg || successMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        {/* Lead queue */}
        <div className="lg:col-span-1 bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col min-h-[400px]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-800">Lead Queue</h3>
            <span className="text-[10px] text-slate-400">{queueSubtitle}</span>
          </div>

          <div className="flex flex-wrap gap-2 mb-3">
            <button
              type="button"
              onClick={() => setSort('followUpDue')}
              className={`px-2 py-1 rounded text-[10px] font-medium border ${
                sort === 'followUpDue' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200'
              }`}
            >
              Follow-up Due
            </button>
            <button
              type="button"
              onClick={() => setSort('lastContacted')}
              className={`px-2 py-1 rounded text-[10px] font-medium border ${
                sort === 'lastContacted' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200'
              }`}
            >
              Last Contacted
            </button>
            <label className="flex items-center gap-1 text-[10px] text-slate-600 ml-auto cursor-pointer">
              <input
                type="checkbox"
                checked={myLeadsOnly}
                onChange={(e) => setMyLeadsOnly(e.target.checked)}
                className="rounded"
              />
              My leads
            </label>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-slate-400 gap-2 text-sm">
                <Loader2 size={16} className="animate-spin" /> Loading...
              </div>
            ) : leads.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">No leads in queue.</p>
            ) : (
              leads.map((l) => {
                const active = l.id === selectedId;
                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setSelectedId(l.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      active ? 'border-indigo-300 bg-indigo-50' : 'border-slate-100 hover:border-indigo-100'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-slate-800 truncate">{l.enquirerName}</h4>
                        <p className="text-[10px] text-slate-500">{l.classInterested || 'Class N/A'}</p>
                      </div>
                      <span className="text-[9px] text-slate-400 whitespace-nowrap">
                        {l.lastContactedAt ? formatRelative(l.lastContactedAt) : 'New'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {l.lastSentiment && (
                        <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                          {l.lastSentiment}
                        </span>
                      )}
                      {l.nextFollowUp && (
                        <span className="text-[9px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                          <Clock size={8} /> Due {formatRelative(l.nextFollowUp)}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Lead profile */}
        <div className="lg:col-span-2 space-y-6">
          {!lead || detailLoading ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 flex items-center justify-center text-slate-400 gap-2">
              <Loader2 size={18} className="animate-spin" />
              {detailLoading ? 'Loading profile...' : 'Select a lead from the queue'}
            </div>
          ) : (
            <>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xl font-bold">
                        {initials(lead.enquirerName)}
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-slate-800">{lead.enquirerName}</h2>
                        <p className="text-sm text-slate-500">
                          Applying for: {lead.classInterested || '—'} • {lead.enquiryId}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                          <Phone size={12} /> {lead.mobile}
                          {lead.assignedTo && (
                            <>
                              <User size={12} /> Counselor: {lead.assignedTo}
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                      {lead.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <div className="flex items-center gap-2 mb-1 text-slate-500">
                        <MessageCircle size={14} />
                        <span className="text-xs font-semibold">Parent Sentiment</span>
                      </div>
                      <div className={`text-sm font-bold ${sentimentClass(lead.lastSentiment)}`}>
                        {lead.lastSentiment || 'Not assessed'}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">From latest counseling session</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <div className="flex items-center gap-2 mb-1 text-slate-500">
                        <Zap size={14} />
                        <span className="text-xs font-semibold">Engagement Level</span>
                      </div>
                      <div className={`text-sm font-bold ${engagementClass(lead.lastEngagement)}`}>
                        {lead.lastEngagement || 'Not assessed'}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">Counselor manual assessment</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <div className="flex items-center gap-2 mb-1 text-slate-500">
                        <AlertTriangle size={14} />
                        <span className="text-xs font-semibold">Risk Factors</span>
                      </div>
                      <div className={`text-sm font-bold ${riskClass(lead.lastRiskFactor)}`}>
                        {lead.lastRiskFactor || 'None recorded'}
                      </div>
                      {lead.lastRiskDetails && (
                        <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">{lead.lastRiskDetails}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-semibold text-slate-800 mb-4">Latest Communication Analysis</h3>
                {logs.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-6">
                    No counseling sessions yet. Click &ldquo;Log New Counseling Session&rdquo; to record the first interaction.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {logs.map((log) => (
                      <div key={log.id} className="border-l-2 border-indigo-500 pl-4 py-1 relative">
                        <div className="absolute -left-[5px] top-2 w-2 h-2 rounded-full bg-indigo-500" />
                        <div className="flex justify-between items-start mb-1 gap-2">
                          <span className="text-xs font-bold text-slate-800">
                            {log.interactionType} — {log.counselorName}
                          </span>
                          <span className="text-[10px] text-slate-400 whitespace-nowrap">
                            {formatDateTime(log.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mb-2 italic bg-slate-50 p-2 rounded border border-slate-100">
                          &ldquo;{log.remarks}&rdquo;
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-100">
                            Sentiment: {log.sentiment}
                          </span>
                          <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100">
                            Engagement: {log.engagement}
                          </span>
                          <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-100">
                            Risk: {log.riskFactor}
                          </span>
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                            Action: {log.actionIntent}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {sessionOpen && selectedId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold text-slate-800">Log Counseling Session</h2>
              <button
                type="button"
                onClick={() => setSessionOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={(e) => void handleSubmitSession(e)} className="p-4 space-y-4">
              <p className="text-xs text-slate-500">
                Recording session for <strong>{lead?.enquirerName}</strong>. Use your judgment to assess tone,
                interest, and objections.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Interaction Type *</label>
                  <select
                    required
                    value={form.interactionType}
                    onChange={(e) => setForm((f) => ({ ...f, interactionType: e.target.value }))}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white"
                  >
                    {meta.interactionTypes.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Parent/Student Sentiment *</label>
                  <select
                    required
                    value={form.sentiment}
                    onChange={(e) => setForm((f) => ({ ...f, sentiment: e.target.value }))}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white"
                  >
                    {meta.sentiments.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Engagement Level *</label>
                  <select
                    required
                    value={form.engagement}
                    onChange={(e) => setForm((f) => ({ ...f, engagement: e.target.value }))}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white"
                  >
                    {meta.engagementLevels.map((e) => (
                      <option key={e} value={e}>
                        {e}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Primary Risk Factor *</label>
                  <select
                    required
                    value={form.riskFactor}
                    onChange={(e) => setForm((f) => ({ ...f, riskFactor: e.target.value }))}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white"
                  >
                    {meta.riskFactors.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {form.riskFactor !== 'None' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Risk Details (optional)</label>
                  <input
                    value={form.riskDetails}
                    onChange={(e) => setForm((f) => ({ ...f, riskDetails: e.target.value }))}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                    placeholder="e.g. Bus route from Sector 45, fee comparison with DPS..."
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Counselor Remarks *</label>
                <textarea
                  required
                  rows={4}
                  value={form.remarks}
                  onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                  placeholder="Detailed notes from the conversation..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Action / Intent *</label>
                <select
                  required
                  value={form.actionIntent}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, actionIntent: e.target.value as ActionIntent }))
                  }
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  {meta.actionIntents.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>

              {showFollowUpFields && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Next Follow-up Date {needsFollowUpDate(form.actionIntent) ? '*' : ''}
                    </label>
                    <input
                      type="date"
                      required={needsFollowUpDate(form.actionIntent)}
                      value={form.nextFollowUpDate}
                      onChange={(e) => setForm((f) => ({ ...f, nextFollowUpDate: e.target.value }))}
                      className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Time</label>
                    <input
                      type="time"
                      value={form.nextFollowUpTime}
                      onChange={(e) => setForm((f) => ({ ...f, nextFollowUpTime: e.target.value }))}
                      className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSessionOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  Save Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
